/* THE NEW JUNO'S EYES IN THEIR LIDS (10-16; the supervisor's "eyes converging, lids open" and his condition 2), on the Blender Juno as the
 * game loads him. Each eyeball (its centre and radius read off its own vertices) against the skin of the head: a point of its front half, at
 * an azimuth across the eye (+ toward the ear) and an elevation, is OPEN when a ray out from it along the ball's own normal leaves the head
 * without meeting the skin from inside, and COVERED when it meets a back face (it is leaving the skin: the point lies inside the head, under
 * a lid — the base's socket is no cavity; the skin passes in front of the ball's covered part). (The first version called a point open when
 * no skin lay within 3 cm, and the ball's top and bottom, 3.4 and 4.0 cm under the brow and the cheek, read open: an opening of 160°.)
 * Read:
 *   · THE LIDS OPEN at rest: the open run of elevation straight ahead (one gap between the lids) at least 25°, as the old face's wall held;
 *   · THE TWO EYES OPEN ALIKE: their open shares within 5 % of the front half, their middle runs within 3°;
 *   · THE PUPIL READABLE AT EVERY LOOK THE GAME GIVES (skater.js aimEyes: each eye turned within 0.45 rad across and 0.35 up and down; the
 *     iris 28° round the look, the pupil 10°): at least 80 % of the pupil open at each, the upper lid FOLLOWING the look — the file's morph
 *     targets lidUp/lidDown L/R set as the game sets them, by the eye's pitch over the look's whole turn (one to one: Becker & Fuchs,
 *     J Neurophysiol 1988;60(4):1227-52 — "During steady fixation, the eye and lid assumed essentially equal average positions");
 *   · AT REST THE UPPER LID ON THE IRIS'S TOP, as a real one is: looking straight ahead the pupil all open, the iris's top third mostly under
 *     the lid;
 *   (an "almond" rule — more open toward the nose than the ear — was the OLD code sculpt's own lid design, not a fact about eyes: on this
 *    realistic sculpt, as on an eye, the opening reaches farther round the ball toward the ear. DESIGN §7.4.)
 *   · the openings' axes, said: where each socket shows its ball (the game turns the eyes themselves to one point each pose).
 * `--plant nofollow` sets the lids' morphs to nothing: the pupil gate must go RED.
 * Usage: node sources/juno/face_check.mjs <three@0.183.1's examples/jsm/loaders/GLTFLoader.js> [the .glb, default work/juno_lod0.glb] [--plant nofollow] */
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, ''), LOADER = process.argv[2];
const GLB = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : ROOT + '/sources/juno/work/juno_lod0.glb';
const PLANT = process.argv.includes('--plant') ? process.argv[process.argv.indexOf('--plant') + 1] : null;
const { GLTFLoader } = await import(LOADER), { BVH } = await import(ROOT + '/build/js/sim/bvh.js');
const D = Math.PI / 180, EYE_YAW = 0.45 / D, EYE_PITCH = 0.35 / D;   // the game's own turn of an eye in its socket (skater.js), in degrees
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const buf = readFileSync(GLB), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const skins = [], eyes = {}; gltf.scene.updateMatrixWorld(true);
/* a piece's name: its node's (a mesh of several materials is a group of meshes named for the mesh, under the node's name) */
const pieceOf = (o) => (o.parent && o.parent.type === 'Group' && o.parent.parent ? o.parent.name : o.name).replace(/_\d+$/, '').replace(/\./g, '');
gltf.scene.traverse((o) => { if (!o.isMesh) return; const n = pieceOf(o), g = o.geometry, p = g.attributes.position.array, ix = g.index ? g.index.array : [...Array(p.length / 3).keys()];
  if (n === 'JunoSkin') skins.push({ p, ix, rel: g.morphTargetsRelative, morph: Object.fromEntries(Object.entries(o.morphTargetDictionary || {}).map(([k, i]) => [k, g.morphAttributes.position[i].array])) });
  if (/^JunoEye/.test(n)) (eyes[n] = eyes[n] || []).push(p); });
const MORPHS = ['lidUpL', 'lidUpR', 'lidDownL', 'lidDownR'], has = MORPHS.filter((k) => skins.some((m) => m.morph[k]));
/* the skin as it stands at an eye pitch (degrees, + up): each lid's morph at the pitch over the look's whole turn, as the game sets it */
const lidWeights = (pitch) => (PLANT === 'nofollow' ? {} : { lidUpL: Math.max(0, pitch) / EYE_PITCH, lidUpR: Math.max(0, pitch) / EYE_PITCH, lidDownL: Math.max(0, -pitch) / EYE_PITCH, lidDownR: Math.max(0, -pitch) / EYE_PITCH });
const skinAt = (w) => { const tris = [];
  for (const m of skins) { const P = Float32Array.from(m.p); for (const [k, wk] of Object.entries(w)) { const d = m.morph[k]; if (!d || !wk) continue; for (let i = 0; i < P.length; i++) P[i] += (m.rel ? d[i] : d[i] - m.p[i]) * wk; }
    for (let t = 0; t < m.ix.length; t += 3) tris.push([m.ix[t], m.ix[t + 1], m.ix[t + 2]].map((i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]])); }
  const pos = new Float32Array(tris.length * 9), nrm = new Float32Array(tris.length * 9);
  tris.forEach((t, k) => { const e1 = t[1].map((v, i) => v - t[0][i]), e2 = t[2].map((v, i) => v - t[0][i]), f = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], l = Math.hypot(...f) || 1;
    t.forEach((v, j) => { pos.set(v, k * 9 + j * 3); nrm.set(f.map((x) => x / l), k * 9 + j * 3); }); });
  return new BVH({ pos, nrm, surf: new Array(tris.length).fill('skin') }); };
const PITCHES = [-EYE_PITCH, 0, EYE_PITCH], bvhAt = new Map(PITCHES.map((p) => [p, skinAt(lidWeights(p))])), rest = bvhAt.get(0);
const out = {};
for (const [name, arrs] of Object.entries(eyes)) {
  const P = []; for (const a of arrs) for (let i = 0; i < a.length; i += 3) P.push([a[i], a[i + 1], a[i + 2]]);
  const c = [0, 1, 2].map((k) => P.reduce((s, p) => s + p[k], 0) / P.length), r = P.reduce((s, p) => s + Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]), 0) / P.length;
  const ear = Math.sign(c[0]);   // the rig's x across: the left eye (x > 0) has its ear at +x
  const dir = (az, el) => [ear * Math.sin(az * D) * Math.cos(el * D), Math.sin(el * D), Math.cos(az * D) * Math.cos(el * D)];   // +z: the way he faces
  const open = (bvh, az, el) => { const d = dir(az, el), q = [c[0] + d[0] * (r + 0.0005), c[1] + d[1] * (r + 0.0005), c[2] + d[2] * (r + 0.0005)], h = bvh.raycast(q, d, 0.3, true);
    return !h || d[0] * h.face[0] + d[1] * h.face[1] + d[2] * h.face[2] < 0; };
  let n = 0, m = 0; const axis = [0, 0, 0];
  for (let az = -80; az <= 80; az += 2) for (let el = -80; el <= 80; el += 2) { if (Math.cos(az * D) * Math.cos(el * D) <= 0) continue; m++; if (open(rest, az, el)) { n++; const d = dir(az, el); for (let k = 0; k < 3; k++) axis[k] += d[k]; } }
  /* the open run of elevation through the look's middle at this azimuth (one run: an opening is one gap between the lids) */
  const span = (az) => { let lo = 0, hi = 0; if (!open(rest, az, 0)) return [0, 0, 0]; while (lo > -89 && open(rest, az, lo - 0.5)) lo -= 0.5; while (hi < 89 && open(rest, az, hi + 0.5)) hi += 0.5; return [lo, hi, hi - lo]; };
  /* a disc of angular radius `rad` round a look (yaw + toward the nose, pitch + up): its open share, points spread evenly over it; `top`:
     only the points of its outer ring in its top third */
  const disc = (bvh, yawN, pitch, rad, top = false) => { let o = 0, k = 0; const ax = dir(-yawN, pitch);
    const t1 = [ax[2], 0, -ax[0]].map((x) => x / Math.hypot(ax[0], ax[2])), t2 = [ax[1] * t1[2] - ax[2] * t1[1], ax[2] * t1[0] - ax[0] * t1[2], ax[0] * t1[1] - ax[1] * t1[0]];
    for (let ri = top ? 6 : 1; ri <= 6; ri++) for (let a = 0; a < 360; a += 360 / (ri * 8)) { const th = (rad * ri / 6) * D, d = [0, 1, 2].map((q) => ax[q] * Math.cos(th) + (t1[q] * Math.cos(a * D) + t2[q] * Math.sin(a * D)) * Math.sin(th));
      if (top && t1[1] * Math.cos(a * D) + t2[1] * Math.sin(a * D) < 0.5) continue;   // the rim, its top third (its way round the look 60° or less from up)
      const el = Math.asin(d[1]) / D, az = Math.atan2(d[0] * ear, d[2]) / D; k++; if (open(bvh, az, el)) o++; }
    return k ? o / k : 1; };
  const looks = []; for (const yaw of [-EYE_YAW, 0, EYE_YAW]) for (const pitch of PITCHES) looks.push({ yaw, pitch, pupil: disc(bvhAt.get(pitch), yaw, pitch, 10), iris: disc(bvhAt.get(pitch), yaw, pitch, 28) });
  const L = Math.hypot(...axis) || 1;
  out[name] = { c, r, share: n / m, mid: span(0), nose: span(-20), earS: span(20), axis: axis.map((x) => x / L), looks, restTop: disc(rest, 0, 0, 28, true), restPupil: disc(rest, 0, 0, 10), restIris: disc(rest, 0, 0, 28) };
}
const l = out.JunoEyeL, rr = out.JunoEyeR, both = [l, rr];
if (!l || !rr) { console.log('✖ the eyes: ' + Object.keys(out).join(', ') + ' (both JunoEyeL and JunoEyeR wanted)'); process.exit(2); }
for (const [name, e] of Object.entries(out)) console.log('  · ' + name + ': centre (' + e.c.map((x) => (x * 1000).toFixed(1)).join(', ') + ') mm, radius ' + (e.r * 1000).toFixed(1) + ' mm · open ' + (100 * e.share).toFixed(0) + ' % of its front half · straight ahead the lids open ' + e.mid[2].toFixed(1) + '° (from ' + e.mid[0] + '° to ' + e.mid[1] + '°), 20° toward the nose ' + e.nose[2].toFixed(1) + '°, toward the ear ' + e.earS[2].toFixed(1) + '°');
ok(both.every((e) => e.mid[2] >= 25), 'THE LIDS OPEN: straight ahead ' + both.map((e) => e.mid[2].toFixed(1) + '°').join(' and ') + ' (≥ 25)');
ok(Math.abs(l.share - rr.share) <= 0.05 && Math.abs(l.mid[2] - rr.mid[2]) <= 3, 'THE TWO EYES OPEN ALIKE: ' + (100 * l.share).toFixed(1) + ' % and ' + (100 * rr.share).toFixed(1) + ' % of their front halves (within 5), ' + l.mid[2].toFixed(1) + '° and ' + rr.mid[2].toFixed(1) + '° straight ahead (within 3)');
for (const e of both) for (const k of e.looks) console.log('    ' + (e === l ? 'L' : 'R') + ' look ' + k.yaw.toFixed(1).padStart(5) + '° toward the nose, ' + k.pitch.toFixed(1).padStart(5) + '° up: the pupil ' + (100 * k.pupil).toFixed(0) + ' % open, the iris ' + (100 * k.iris).toFixed(0) + ' %');
{ const all = both.flatMap((e) => e.looks.map((k) => ({ ...k, e: e === l ? 'L' : 'R' }))), wp = all.reduce((a, k) => (k.pupil < a.pupil ? k : a)), wi = all.reduce((a, k) => (k.iris < a.iris ? k : a));
  ok(has.length === MORPHS.length && wp.pupil >= 0.8, 'THE PUPIL READABLE AT EVERY LOOK THE GAME GIVES, the upper lid following the look (' + (has.length === MORPHS.length ? 'the file\'s ' + has.join(', ') : has.length ? 'only ' + has.join(', ') + ' in the file' : 'NO LID FOLLOW in the file') + (PLANT === 'nofollow' ? ', PLANTED: set to nothing' : ', set by the pitch, one to one') + '): the pupil at least ' + (100 * wp.pupil).toFixed(0) + ' % open (≥ 80; ' + wp.e + ', ' + wp.yaw.toFixed(1) + '° toward the nose, ' + wp.pitch.toFixed(1) + '° up) · the iris at least ' + (100 * wi.iris).toFixed(0) + ' % (' + wi.e + ', ' + wi.yaw.toFixed(1) + '°, ' + wi.pitch.toFixed(1) + '°)'); }
ok(both.every((e) => e.restPupil === 1 && e.restTop < 0.5 && e.restIris < 1), 'AT REST THE UPPER LID ON THE IRIS\'S TOP: looking straight ahead the pupil ' + both.map((e) => (100 * e.restPupil).toFixed(0) + ' %').join(' and ') + ' open, the iris ' + both.map((e) => (100 * e.restIris).toFixed(0) + ' %').join(' and ') + ', the top third of its rim ' + both.map((e) => (100 * e.restTop).toFixed(0) + ' %').join(' and ') + ' open (under half: the lid on it)');
{ const outL = Math.atan2(l.axis[0] * Math.sign(l.c[0]), l.axis[2]) / D, outR = Math.atan2(rr.axis[0] * Math.sign(rr.c[0]), rr.axis[2]) / D;
  console.log('ℹ the openings\' axes (where each socket shows its ball; the game turns the eyes themselves to one point): ' + outL.toFixed(1) + '° and ' + outR.toFixed(1) + '° toward the ear, ' + (Math.atan2(l.axis[1], l.axis[2]) / D).toFixed(1) + '° and ' + (Math.atan2(rr.axis[1], rr.axis[2]) / D).toFixed(1) + '° up'); }
console.log('FACE (Blender Juno): ' + (fail ? 'RED · ' + fail : 'GREEN') + (PLANT ? ' · PLANTED: ' + PLANT : ''));
process.exit(fail ? 1 : 0);
