/* THE DEFORMATION ITSELF (10-16, the supervisor: "the motion walls must read the deformation itself — volume kept at the elbows, knees and
 * shoulders, and no vertex pulled across the body"). The Blender Juno on the game's own bones, bound as bind_check binds him, and posed by
 * the game's own motion through the real sim and the real pose (tests/lib/figure.mjs): a push from rest, an ollie and its landing, every
 * grab, a 50-50 and a 5-0 on the flat's ledge, a manual, a carve each way. Read on the CLOSED body under the clothes (a test export with
 * --with-body 1: the weights every piece took its own from) and on every shipped piece.
 *
 * THE BOUND IS THE PHYSICS', NOT THE MESH'S (the supervisor, 10-16): tissue is incompressible, so any change of a limb's flesh is the
 * skinning's own artifact — a viewer sees a limb thin or swell. Held at 10 %:
 *   1. CROSS-SECTIONS — each limb (upper arm, forearm, thigh, shin) cut square to its bone at several places along it; the area of the cut
 *      round the bone (the loop of the cut that holds the bone's line) against the same at rest, at every frame read.
 *   2. THE JOINTS' FLESH — round each elbow, knee and shoulder, the band of the body within the joint's reach (its triangles whose vertices'
 *      strongest bones are the joint's own), CLOSED across each of its ends (a fan from the end's middle): its volume against rest.
 *   3. TWIST, read on its own — how far each hand rolls about its forearm and each upper arm about its own line (what blended matrices
 *      collapse: the candy wrapper), and the forearm's cuts nearest the wrist through it.
 * And NO VERTEX PULLED ACROSS THE BODY —
 *   4. a LIMB's weight where the limb is not beside the vertex: any weight of 5 % or more on an arm, forearm, hand, thigh, shin or foot of the
 *      OTHER side (an inner thigh weighted to the other leg is carried with it) or more than two bones from the vertex's strongest along the
 *      skeleton (the torso's side weighted to the upper arm) — a rule of the skeleton, not a distance; the trunk, neck, head and clavicles are
 *      joined through the trunk and the neck, and not held by it; the farthest a weight lies from its vertex is said beside it;
 *   5. pushed INTO the body — every garment vertex, and every vertex of the body itself lifted 2 mm off its own surface, against the posed
 *      body (the nearest of six rays met from behind: inside): what is inside posed that was not at rest. CALIBRATED: its bound is this
 *      body's own first reading, and said so.
 * `--plant far` gives the left thigh's inner vertices a third of their weight on the right thigh: the wall must go RED by its own line.
 * `--plant corrective-off` sets the joints' corrective morphs to nothing: the joints' flesh must go RED by its own line.
 * The instrument's own fixes, each proven both ways (the supervisor, 10-16): `--plant roll-swing` measures a roll by two carried references
 * again (a swing leaked into it: the right upper arm read −78° in the 5-0) — the roll's own check on known turns must go RED.
 * Usage: node sources/juno/deform_check.mjs <a .glb exported with --with-body 1> <three@0.183.1's examples/jsm/loaders/GLTFLoader.js> [--plant far] */
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, ''), GLB = process.argv[2], LOADER = process.argv[3];
const PLANT = process.argv.includes('--plant') ? process.argv[process.argv.indexOf('--plant') + 1] : null;
/* `--skin dqs`: posed by DUAL QUATERNIONS (Kavan et al. 2008) instead of blended matrices, the correctives set to nothing — to read what
   that skinning does to the same body before the page is asked to use it */
const SKIN = process.argv.includes('--skin') ? process.argv[process.argv.indexOf('--skin') + 1] : 'lbs';
const THREE = await import(ROOT + '/build/vendor/three/build/three.module.min.js');
const { GLTFLoader } = await import(LOADER);
const { figure } = await import(ROOT + '/tests/lib/figure.mjs'), { flick, pull } = await import(ROOT + '/tests/lib/rig.mjs');
const { BVH } = await import(ROOT + '/build/js/sim/bvh.js'), { TRICKS } = await import(ROOT + '/build/js/config.js');
const CORR = await import(ROOT + '/build/js/view/correctives.js');   // the ONE rule the page sets the joints' correctives by
const FSM = await import(ROOT + '/tests/lib/flesh_sphere.mjs');      // the flesh in a sphere (its known answers: sources/juno/flesh_sphere_check.mjs)
const V3 = THREE.Vector3, BOUND = 0.10;

/* ---- the file: every piece WELDED by position (glTF splits a vertex at a seam of its material or its normals), named by its node ---- */
const buf = readFileSync(GLB), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const sk = JSON.parse(readFileSync(ROOT + '/sources/juno/skeleton.json', 'utf8')), BONE = Object.fromEntries(sk.bones.map((b) => [b.name, b]));
const pieceOf = (o) => { let n = o; while (n.parent && n.parent.type === 'Group' && !n.parent.isBone && n.parent.parent) n = n.parent; return (n === o ? o.name : n.name).replace(/_\d+$/, '').replace(/\./g, ''); };
const pieces = new Map(); gltf.scene.updateMatrixWorld(true);
gltf.scene.traverse((src) => { if (!src.isSkinnedMesh) return;
  const name = pieceOf(src), g = src.geometry, pos = g.attributes.position.array, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array;
  const jn = src.skeleton.bones.map((b) => b.name), ix = g.index ? g.index.array : [...Array(pos.length / 3).keys()];
  const P = pieces.get(name) || pieces.set(name, { name, key: new Map(), rest: [], bones: [], weights: [], tri: [], morph: {} }).get(name);
  const dict = src.morphTargetDictionary || {}, rel = g.morphTargetsRelative, mattr = g.morphAttributes.position || [];
  for (const m of Object.keys(dict)) if (!P.morph[m]) P.morph[m] = [];
  const at = (i) => { const k = Math.round(pos[i * 3] * 1e6) + ',' + Math.round(pos[i * 3 + 1] * 1e6) + ',' + Math.round(pos[i * 3 + 2] * 1e6);
    if (!P.key.has(k)) { const j = P.rest.length; P.key.set(k, j); P.rest.push(new V3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
      const b = [], w = []; for (let q = 0; q < 4; q++) if (sw[i * 4 + q] > 0) { b.push(jn[si[i * 4 + q]]); w.push(sw[i * 4 + q]); } P.bones.push(b); P.weights.push(w);
      for (const [m, mi] of Object.entries(dict)) { const a = mattr[mi].array; P.morph[m][j] = rel ? new V3(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]) : new V3(a[i * 3] - pos[i * 3], a[i * 3 + 1] - pos[i * 3 + 1], a[i * 3 + 2] - pos[i * 3 + 2]); } }
    return P.key.get(k); };
  for (let t = 0; t < ix.length; t += 3) P.tri.push([at(ix[t]), at(ix[t + 1]), at(ix[t + 2])]); });
const body = pieces.get('JunoBody');
if (!body) { console.log('✖ no JunoBody among ' + [...pieces.keys()].join(', ') + ' in ' + GLB + ' — export it with --with-body 1'); process.exit(2); }
const garments = [...pieces.values()].filter((P) => !/^Juno(Body|Skin|Eye)/.test(P.name));
const strongest = (P, i) => P.bones[i][P.weights[i].indexOf(Math.max(...P.weights[i]))];

/* the plant: the left thigh's inner vertices (toward the midline) given a third of their weight on the right thigh */
let planted = 0;
if (PLANT === 'far') for (const P of pieces.values()) P.rest.forEach((p, i) => {
  const k = P.bones[i].indexOf('thighL'); if (k < 0 || P.weights[i][k] < 0.5 || p.x > 0.06 || p.x <= 0.02 || p.y > 0.85 || p.y < 0.55) return;
  planted++; (P.planted || (P.planted = new Set())).add(i); const give = P.weights[i][k] / 3; P.weights[i][k] -= give; const r = P.bones[i].indexOf('thighR'); if (r >= 0) P.weights[i][r] += give; else { P.bones[i].push('thighR'); P.weights[i].push(give); } });

/* ---- posing: a skinned vertex is Σ w · (the bone's world matrix · its inverse bind) · its rest place ---- */
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const Mof = new Map(), tmp = new V3();
const setPose = (G) => { G.board.updateMatrixWorld(true); G.F.names.forEach((n, j) => { if (G.F.skeleton.bones[j].name !== n) throw new Error('the skeleton\'s order is not the names\' order at ' + j);
  Mof.set(n, new THREE.Matrix4().multiplyMatrices(G.F.bones[n].matrixWorld, G.F.skeleton.boneInverses[j])); });
  /* the plant `arm-across`: each arm carried 30° further across the chest, about its shoulder, round the chest's own forward line */
  if (PLANT === 'arm-across') for (const sd of ['L', 'R']) {
    const j = new V3(...BONE['arm' + sd].head).applyMatrix4(Mof.get('arm' + sd)), fwd = new V3(0, 0, 1).applyMatrix4(new THREE.Matrix4().extractRotation(Mof.get('chest'))).normalize();
    const T = new THREE.Matrix4().makeTranslation(j.x, j.y, j.z).multiply(new THREE.Matrix4().makeRotationAxis(fwd, (sd === 'L' ? -30 : 30) * Math.PI / 180)).multiply(new THREE.Matrix4().makeTranslation(-j.x, -j.y, -j.z));
    for (const n of ['arm' + sd, 'fore' + sd, 'hand' + sd]) Mof.set(n, T.clone().multiply(Mof.get(n))); } };
/* the joints' correctives as the page sets them (build/js/view/correctives.js): each joint's bend off the posed bones, its keys off the piece's
   own morph names; the morphs added to the rest before skinning (as three adds them) */
const lineNow = (n) => new V3(...BONE[n].tail).applyMatrix4(Mof.get(n)).sub(new V3(...BONE[n].head).applyMatrix4(Mof.get(n))).normalize(), lineRest = (n) => new V3(...BONE[n].tail).sub(new V3(...BONE[n].head)).normalize();
const restBend = Object.fromEntries(Object.entries(CORR.JOINTS).map(([j, [a, b]]) => [j, CORR.angleOf(lineRest(a), lineRest(b))]));
let corrSeen = 0;
const corrWeights = (P) => { if (PLANT === 'corrective-off') return {}; const out = {}, names = Object.keys(P.morph);
  for (const [j, [a, b]] of Object.entries(CORR.JOINTS)) { const keys = CORR.keysOf(names, j); if (!keys.length) continue; Object.assign(out, CORR.keyWeights(keys, CORR.angleOf(lineNow(a), lineNow(b)) - restBend[j])); }
  return out; };
/* each bone's dual quaternion this frame: its turn q and its move t as d = ½·t·q (plain numbers: [qx, qy, qz, qw, dx, dy, dz, dw]) */
const DQ = new Map();
const setDQ = () => { for (const [n, M] of Mof) { const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(M)), t = new V3().setFromMatrixPosition(M);
  const d = new THREE.Quaternion(t.x, t.y, t.z, 0).multiply(q); DQ.set(n, [q.x, q.y, q.z, q.w, d.x / 2, d.y / 2, d.z / 2, d.w / 2]); } };
const dqsPoint = (r, bones, weights) => {
  let k = 0; for (let j = 1; j < weights.length; j++) if (weights[j] > weights[k]) k = j; const q0 = DQ.get(bones[k]);
  const b = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let j = 0; j < bones.length; j++) { const a = DQ.get(bones[j]), s = (a[0] * q0[0] + a[1] * q0[1] + a[2] * q0[2] + a[3] * q0[3]) < 0 ? -weights[j] : weights[j]; for (let c = 0; c < 8; c++) b[c] += s * a[c]; }
  const nr = Math.hypot(b[0], b[1], b[2], b[3]); for (let c = 0; c < 8; c++) b[c] /= nr;
  const [x, y, z, w, dx, dy, dz, dw] = b;
  /* the turn: p + 2·q×(q×p + w·p) */
  const cx = y * r.z - z * r.y + w * r.x, cy = z * r.x - x * r.z + w * r.y, cz = x * r.y - y * r.x + w * r.z;
  const px = r.x + 2 * (y * cz - z * cy), py = r.y + 2 * (z * cx - x * cz), pz = r.z + 2 * (x * cy - y * cx);
  /* the move: 2·(w·d − dw·q + q×d) */
  return new V3(px + 2 * (w * dx - dw * x + (y * dz - z * dy)), py + 2 * (w * dy - dw * y + (z * dx - x * dz)), pz + 2 * (w * dz - dw * z + (x * dy - y * dx))); };
const posed = (P) => { if (SKIN === 'dqs') { if (DQ.size === 0 || DQ.stamp !== frames) { setDQ(); DQ.stamp = frames; } return P.rest.map((r, i) => dqsPoint(r, P.bones[i], P.weights[i])); }
  const w = Object.entries(corrWeights(P)).filter(([, x]) => x > 0); if (w.length) corrSeen++;
  return P.rest.map((r, i) => { const base = w.length ? r.clone() : r; for (const [m, x] of w) { const d = P.morph[m][i]; if (d) base.addScaledVector(d, x); }
    const v = new V3(); for (let q = 0; q < P.bones[i].length; q++) v.addScaledVector(tmp.copy(base).applyMatrix4(Mof.get(P.bones[i][q])), P.weights[i][q]); return v; }); };
const restOf = (n, end) => new V3(...BONE[n][end]);
const boneNow = (n, end, rest) => (rest ? restOf(n, end) : restOf(n, end).applyMatrix4(Mof.get(n)));

/* ---- 1. cross-sections ---- */
/* (the upper arm's cuts begin half way down it: at 40 %, square to the arm, a cut crosses the armpit's web and the arm's loop runs into the
   torso's — no loop round the bone alone; the flesh under the shoulder is read as a band below) */
const CUTS = { arm: [0.5, 0.6, 0.7, 0.85], fore: [0.15, 0.3, 0.5, 0.7, 0.85, 0.93], thigh: [0.4, 0.55, 0.7, 0.85], shin: [0.15, 0.3, 0.5, 0.7, 0.85] };
/* a cut's triangles: every one with a vertex within 16 cm of the bone at rest — chosen by where they lie, so no loop is broken by a triangle
   whose strongest bone is another's */
const restSegDist = (p, n) => { const h = new V3(...BONE[n].head), t = new V3(...BONE[n].tail), ab2 = t.clone().sub(h), u = Math.max(0, Math.min(1, p.clone().sub(h).dot(ab2) / ab2.lengthSq())); return p.distanceTo(h.addScaledVector(ab2, u)); };
const sections = [];
for (const sd of ['L', 'R']) for (const [limb, at] of Object.entries(CUTS)) { const n = limb + sd, nearIt = body.rest.map((p) => restSegDist(p, n) <= 0.16);
  const tris = body.tri.filter((t) => t.some((i) => nearIt[i]));
  for (const s of at) sections.push({ n, s, tris, name: { arm: 'upper arm', fore: 'forearm', thigh: 'thigh', shin: 'shin' }[limb] + ' ' + sd + ' at ' + Math.round(s * 100) + ' %', twist: limb === 'fore' && s >= 0.85,
    /* the FOLD cut, 6 cm under the knee: in a deep bend it crosses where the calf and the hamstring meet, flesh squeezed along and sideways out
       of its plane — no incompressibility reading in that pose (the supervisor, 10-16); REPORTED, never dropped, so a loss there cannot hide;
       the knee's flesh is held by its closed band and its sphere */
    fold: limb === 'shin' && s < 0.2, lo: Infinity, hi: -Infinity, loAt: '', hiAt: '' }); }
/* the cut of the mesh by the plane through P square to `a`: the loops of the cut, and the area of the one round P (null: none holds it) */
function cutArea(pts, tris, P, a) {
  const d = new Map(), side = (i) => { if (!d.has(i)) d.set(i, tmp.copy(pts[i]).sub(P).dot(a)); return d.get(i); }, cross = new Map(), link = new Map();
  const edgeKey = (i, j) => (i < j ? i + ':' + j : j + ':' + i), pointOn = (i, j) => { const k = edgeKey(i, j); if (!cross.has(k)) { const di = side(i), dj = side(j), u = di / (di - dj); cross.set(k, pts[i].clone().lerp(pts[j], u)); } return k; };
  const join = (x, y) => { (link.get(x) || link.set(x, []).get(x)).push(y); (link.get(y) || link.set(y, []).get(y)).push(x); };
  for (const [i, j, k] of tris) { const si = side(i) >= 0, sj = side(j) >= 0, sk2 = side(k) >= 0; if (si === sj && sj === sk2) continue;
    const ends = []; for (const [p, q] of [[i, j], [j, k], [k, i]]) if ((side(p) >= 0) !== (side(q) >= 0)) ends.push(pointOn(p, q)); if (ends.length === 2) join(ends[0], ends[1]); }
  const u = new V3(), v = new V3(); u.set(1, 0, 0); if (Math.abs(u.dot(a)) > 0.9) u.set(0, 1, 0); u.sub(a.clone().multiplyScalar(u.dot(a))).normalize(); v.crossVectors(a, u);
  const seen = new Set(); let best = null;
  for (const start of link.keys()) { if (seen.has(start)) continue; const loop = []; let prev = null, cur = start, okLoop = false;
    while (cur && !seen.has(cur)) { seen.add(cur); loop.push(cur); const nb = (link.get(cur) || []).filter((x) => x !== prev); if (nb.length === 0) break; prev = cur; cur = nb[0]; if (cur === start) { okLoop = true; break; } }
    if (!okLoop || loop.length < 3) continue;
    const xy = loop.map((k) => { const q = cross.get(k).clone().sub(P); return [q.dot(u), q.dot(v)]; });
    let A = 0, inside = false; for (let m = 0, w = xy.length - 1; m < xy.length; w = m++) { A += xy[w][0] * xy[m][1] - xy[m][0] * xy[w][1];
      if ((xy[m][1] > 0) !== (xy[w][1] > 0) && 0 < ((xy[w][0] - xy[m][0]) * (0 - xy[m][1])) / (xy[w][1] - xy[m][1]) + xy[m][0]) inside = !inside; }
    A = Math.abs(A) / 2; if (inside && (!best || A < best)) best = A; }
  return best;
}
const cutOf = (sec, pts, rest) => { const h = boneNow(sec.n, 'head', rest), t = boneNow(sec.n, 'tail', rest), a = t.clone().sub(h).normalize(); return cutArea(pts, sec.tris, h.clone().lerp(t, sec.s), a); };
for (const sec of sections) sec.rest = cutOf(sec, body.rest, true);

/* ---- 2. the joints' flesh, closed ---- */
const JOINTS = [['elbow L', ['armL', 'foreL'], 'foreL', 0.07], ['elbow R', ['armR', 'foreR'], 'foreR', 0.07], ['knee L', ['thighL', 'shinL'], 'shinL', 0.09],
  ['knee R', ['thighR', 'shinR'], 'shinR', 0.09], ['shoulder L', ['chest', 'clavL', 'armL'], 'armL', 0.10], ['shoulder R', ['chest', 'clavR', 'armR'], 'armR', 0.10]];
/* a band: its triangles (all three vertices in it), its open ends traced as loops (each boundary edge as its own triangle runs it) */
const makeBand = (name, inBand) => {
  const tris = body.tri.filter((t) => t.every((i) => inBand[i])), count = new Map();
  for (const [i, j, k] of tris) for (const [p, q] of [[i, j], [j, k], [k, i]]) { const key = p + ':' + q, rev = q + ':' + p; if (count.has(rev)) count.delete(rev); else count.set(key, [p, q]); }
  const next = new Map([...count.values()].map(([p, q]) => [p, q])), loops = [], used = new Set();
  for (const s0 of next.keys()) { if (used.has(s0)) continue; const loop = []; let c = s0; while (c != null && !used.has(c)) { used.add(c); loop.push(c); c = next.get(c); } if (loop.length >= 3) loops.push(loop); }
  return { name, tris, loops, cap: loops.length < 2, lo: Infinity, hi: -Infinity, loAt: '', hiAt: '' }; };
const bands = JOINTS.map(([name, set, at, R]) => { const o = restOf(at, 'head'); return makeBand(name, body.rest.map((p, i) => p.distanceTo(o) <= R && set.includes(strongest(body, i)))); });
/* the flesh under each shoulder: the upper arm's own vertices from a tenth to nearly half way down it — the band a twist of the arm in its
   socket wrings (the right arm rolls 63° in the 5-0) */
const axial = (p, n) => { const h = restOf(n, 'head'), t = restOf(n, 'tail'), d = t.clone().sub(h); return p.clone().sub(h).dot(d) / d.lengthSq(); };
for (const sd of ['L', 'R']) bands.push(makeBand('under the shoulder ' + sd, body.rest.map((p, i) => strongest(body, i) === 'arm' + sd && axial(p, 'arm' + sd) >= 0.10 && axial(p, 'arm' + sd) <= 0.45)));
const closedVol = (b, pts) => { let s = 0; const det = (A, B, C) => A.dot(tmp.crossVectors(B, C));
  for (const [i, j, k] of b.tris) s += det(pts[i], pts[j], pts[k]);
  for (const loop of b.loops) { const c = loop.reduce((m, i) => m.add(pts[i]), new V3()).multiplyScalar(1 / loop.length);
    for (let m = 0; m < loop.length; m++) { const p = loop[m], q = loop[(m + 1) % loop.length]; s += det(pts[q], pts[p], c); } }   // the end's fan, its edge the other way round
  return s / 6; };
for (const b of bands) b.rest = closedVol(b, body.rest);

/* ---- 3. twist: a reference square to the bone, carried by the bone itself and by the one it hangs from, compared about the bone's line ---- */
const TWISTS = [['the hand L about its forearm', 'handL', 'foreL', 'foreL'], ['the hand R about its forearm', 'handR', 'foreR', 'foreR'], ['the upper arm L about its line', 'armL', 'clavL', 'armL'], ['the upper arm R about its line', 'armR', 'clavR', 'armR']];
const twists = TWISTS.map(([name, child, parent, axisBone]) => ({ name, child, parent, axisBone, worst: 0, at: '' }));
/* the child's turn relative to the bone it hangs from, split into a swing and a twist about the axis at rest (Mof maps rest to posed, so
   the relative turn in rest space is q_parent⁻¹ · q_child); the twist's angle is 2·atan2(q.xyz · axis, q.w). (10-16: the first version
   compared two carried references square to the posed axis — a swing leaked into it, and the right upper arm read −78° in the 5-0) */
const rollNew = (T, M) => { const a0 = restOf(T.axisBone, 'tail').sub(restOf(T.axisBone, 'head')).normalize(), q = (n) => new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(M.get(n)));
  const rel = q(T.parent).invert().multiply(q(T.child)), d = rel.x * a0.x + rel.y * a0.y + rel.z * a0.z; let ang = 2 * Math.atan2(d, rel.w) * 180 / Math.PI;
  if (ang > 180) ang -= 360; if (ang < -180) ang += 360; return ang; };
const rollOld = (T, M) => { const a0 = restOf(T.axisBone, 'tail').sub(restOf(T.axisBone, 'head')).normalize(), r0 = new V3(0, 0, 1).sub(a0.clone().multiplyScalar(a0.z)).normalize();   // the plant: the old measure
  const rot = (n, v) => v.clone().applyMatrix4(new THREE.Matrix4().extractRotation(M.get(n))), a = rot(T.axisBone, a0).normalize();
  const flat = (v) => v.sub(a.clone().multiplyScalar(v.dot(a))).normalize(), rc = flat(rot(T.child, r0)), rp = flat(rot(T.parent, r0));
  return Math.atan2(a.dot(new V3().crossVectors(rp, rc)), rp.dot(rc)) * 180 / Math.PI; };
const rollOf = (T, M = Mof) => (PLANT === 'roll-swing' ? rollOld : rollNew)(T, M);
/* THE ROLL MEASURE ON KNOWN TURNS (its own both-ways proof): the right upper arm turned by a pure twist about its own line, a pure swing,
   and the two together, its clavicle still — it must read the twist, and nothing of the swing */
{ const T = { child: 'armR', parent: 'clavR', axisBone: 'armR' }, a0 = restOf('armR', 'tail').sub(restOf('armR', 'head')).normalize(), r0 = new V3(0, 0, 1).sub(a0.clone().multiplyScalar(a0.z)).normalize();
  const side = r0.clone().add(new V3().crossVectors(a0, r0)).normalize();   // a swing about an axis between the reference and its square: the old measure read −26° of twist in it
  const turn = (q) => new Map([['clavR', new THREE.Matrix4()], ['armR', new THREE.Matrix4().makeRotationFromQuaternion(q)]]);
  const tw = new THREE.Quaternion().setFromAxisAngle(a0, 60 * Math.PI / 180), sw = new THREE.Quaternion().setFromAxisAngle(side, 70 * Math.PI / 180);
  const r1 = rollOf(T, turn(tw)), r2 = rollOf(T, turn(sw)), r3 = rollOf(T, turn(sw.clone().multiply(tw)));
  ok(Math.abs(r1 - 60) < 0.5 && Math.abs(r2) < 0.5 && Math.abs(r3 - 60) < 0.5, 'THE ROLL MEASURE ON KNOWN TURNS: a twist of 60° reads ' + r1.toFixed(1) + '°, a swing of 70° reads ' + r2.toFixed(1) + '°, the two together ' + r3.toFixed(1) + '° (the twist, and nothing of the swing)' + (PLANT === 'roll-swing' ? ' · PLANTED: the old measure' : '')); }

/* ---- the joints' bends: how far each knee and elbow bends past its rest (the angle between the two bones' lines), the range a corrective
   must cover ---- */
const BENDS = [['knee L', 'thighL', 'shinL'], ['knee R', 'thighR', 'shinR'], ['elbow L', 'armL', 'foreL'], ['elbow R', 'armR', 'foreR']].map(([name, a, b]) => ({ name, a, b, worst: 0, at: '' }));
const lineOf = (n, rest) => boneNow(n, 'tail', rest).sub(boneNow(n, 'head', rest)).normalize(), bendOf = (J, rest) => Math.acos(Math.max(-1, Math.min(1, lineOf(J.a, rest).dot(lineOf(J.b, rest))))) * 180 / Math.PI;
for (const J of BENDS) J.rest = bendOf(J, true);

/* ---- 4. weights on a bone the vertex is not beside (the skeleton's rule) ---- */
const hops = (x, y) => { const up = (n) => { const out = [n]; while (BONE[n].parent) out.push(n = BONE[n].parent); return out; }, A = up(x), B = up(y), c = A.find((n) => B.includes(n)); return A.indexOf(c) + B.indexOf(c); };
/* the LIMBS: a limb swings far from the trunk, and a weight of one where it is not beside the vertex carries the vertex with it. The trunk,
   the neck, the head and the clavicles are held together by the trunk and the neck — the clavicles' inner ends meet 6 cm apart at the
   sternum, and the trapezius runs from the skull to the clavicle — so weights among them are not held by these rules (10-16: the first rule
   held them, and called the sternum's and the neck's own weights far) */
const sideOf = (n) => (/^(arm|fore|hand|thigh|shin|foot)[LR]$/.test(n) ? n.slice(-1) : ''), limb = (n) => !!sideOf(n);
const segDist = (p, n) => { const h = restOf(n, 'head'), t = restOf(n, 'tail'), ab2 = t.clone().sub(h), u = Math.max(0, Math.min(1, p.clone().sub(h).dot(ab2) / ab2.lengthSq())); return p.distanceTo(h.addScaledVector(ab2, u)); };
const far = []; let farthest = { d: 0, at: '' };
for (const P of pieces.values()) P.rest.forEach((p, i) => { const own = strongest(P, i);
  P.bones[i].forEach((n, q) => { if (P.weights[i][q] < 0.05) return; const d = segDist(p, n); if (d > farthest.d) farthest = { d, at: P.name + ' on ' + n + ' (' + P.weights[i][q].toFixed(2) + ')' };
    /* the other side: a limb bone of the side the vertex does NOT lie on (more than 2 cm from the midline, rig +x the left) — judged by where it
       lies, so a vertex whose strongest bone is a middle one (the hips) is held too (10-16: the far plant hid 42 of its 55 vertices that way) */
    const at = p.x > 0.02 ? 'L' : p.x < -0.02 ? 'R' : '', across = !!(at && sideOf(n) && sideOf(n) !== at), hop = hops(own, n);
    if (across || (limb(n) && hop > 2)) far.push({ piece: P.name, i, own, n, w: P.weights[i][q], why: across ? 'the other side of the body' : hop + ' bones off' }); }); });
const plantCaught = PLANT === 'far' ? [...pieces.values()].reduce((a, P) => a + (P.planted ? [...P.planted].filter((i) => far.some((f) => f.piece === P.name && f.i === i)).length : 0), 0) : 0;

/* ---- 5. inside the posed body ---- */
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const bodyBVH = (pts) => { const n = body.tri.length, pos = new Float32Array(n * 9), nrm = new Float32Array(n * 9);
  body.tri.forEach(([a, b, c], k) => { const f = new V3().subVectors(pts[b], pts[a]).cross(new V3().subVectors(pts[c], pts[a])).normalize();
    [a, b, c].forEach((v, j) => { pos.set([pts[v].x, pts[v].y, pts[v].z], k * 9 + j * 3); nrm.set([f.x, f.y, f.z], k * 9 + j * 3); }); });
  return new BVH({ pos, nrm, surf: new Array(n).fill('body') }); };
const depthIn = (bvh, p) => { let best = Infinity, back = false; for (const d of DIRS) { const h = bvh.raycast([p.x, p.y, p.z], d, 0.5, true); if (h && h.t < best) { best = h.t; back = d[0] * h.face[0] + d[1] * h.face[1] + d[2] * h.face[2] > 0; } } return back ? best : 0; };
const normalsOf = (pts) => { const N = pts.map(() => new V3()); for (const [a, b, c] of body.tri) { const f = new V3().subVectors(pts[b], pts[a]).cross(new V3().subVectors(pts[c], pts[a])); N[a].add(f); N[b].add(f); N[c].add(f); } return N.map((v) => v.normalize()); };
const insideSet = (pts, bvh, lifted) => { const N = lifted ? normalsOf(pts) : null, out = new Map(); pts.forEach((p, i) => { const d = depthIn(bvh, lifted ? p.clone().addScaledVector(N[i], 0.002) : p); if (d > 0) out.set(i, d); }); return out; };
const restBVH = bodyBVH(body.rest), restIn = new Map(garments.map((P) => [P.name, insideSet(P.rest, restBVH, false)])), restSelf = insideSet(body.rest, restBVH, true);
const inside = { garment: { n: 0, d: 0, at: '', piece: '' }, self: { n: 0, d: 0, at: '' } };
/* THE FLESH UNDER THE SHOULDER, by its thickness (a band there cannot close round the arm: the armpit's side is the chest's, and a cut there
   crosses the armpit's web): at three heights just under the joint, rays from the arm's axis across its OUTER half (away from the torso: the
   deltoid's side), turning with the arm; the mean of their squared lengths stands for the cut's area, held at the same bound */
const SHOULDER = [];
for (const sd of ['L', 'R']) for (const sAt of [0.12, 0.22, 0.32]) {
  const n = 'arm' + sd, h = restOf(n, 'head'), t = restOf(n, 'tail'), a0 = t.clone().sub(h).normalize(), out0 = new V3(sd === 'L' ? 1 : -1, 0, 0);
  out0.sub(a0.clone().multiplyScalar(out0.dot(a0))).normalize(); const side0 = new V3().crossVectors(a0, out0);
  const dirs = []; for (let k = -5; k <= 5; k++) { const ang = k * 16 * Math.PI / 180; dirs.push(out0.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side0, Math.sin(ang))); }
  SHOULDER.push({ name: 'under the shoulder ' + sd + ' at ' + Math.round(sAt * 100) + ' %', n, sAt, dirs, lo: Infinity, hi: -Infinity, loAt: '', hiAt: '', olo: Infinity, ohi: -Infinity, oloAt: '', ohiAt: '' }); }
const exitOf = (bvh, o, d) => { const h = bvh.raycast([o.x, o.y, o.z], [d.x, d.y, d.z], 0.2, true); return h ? h.t : null; };
const thick = (S, bvh, rest) => { const h = boneNow(S.n, 'head', rest), t = boneNow(S.n, 'tail', rest), o = h.clone().lerp(t, S.sAt), R = rest ? null : new THREE.Matrix4().extractRotation(Mof.get(S.n));
  let s2 = 0, k = 0; for (const d0 of S.dirs) { const d = rest ? d0 : d0.clone().applyMatrix4(R).normalize(), r = exitOf(bvh, o, d); if (r == null) return null; s2 += r * r; k++; } return s2 / k; };
for (const S of SHOULDER) S.rest = thick(S, restBVH, true);
/* ---- 6. THE FLESH IN A SPHERE (the supervisor's measure where no band closes; its known answers: flesh_sphere_check.mjs): round each
   shoulder, 11 cm (enclosing the deltoid's mass — from the acromion to about a third down the humerus — and the joint), carried by the
   CLAVICLE; round each knee, 9 cm (the condyles and the kneecap), carried by the THIGH. The union of the body's flesh inside it, against
   rest; read at 0.9, 1.0 and 1.1 of the radius from the same points (the reading must not hang on flesh crossing its edge); beside it the
   RIGID-SKIN CONTROL (every vertex wholly its strongest bone's): what the motion itself reads there — gaps add nothing, overlaps subtract —
   so the blended reading less the rigid one is the skinning's own ---- */
const SPH_H = 0.004;
const SPHERES = [['shoulder L', 'clavL', 'armL', 0.11], ['shoulder R', 'clavR', 'armR', 0.11], ['knee L', 'thighL', 'shinL', 0.09], ['knee R', 'thighR', 'shinR', 0.09]]
  .map(([name, frameBone, at, R]) => ({ name, frameBone, at, R, cols: FSM.columnsOf(1.1 * R, SPH_H), radii: [0.9 * R, R, 1.1 * R], lo: [1e9, 1e9, 1e9], hi: [0, 0, 0], loAt: '', hiAt: '', rlo: 1e9, rhi: 0, rloAt: '', rhiAt: '', rloK: [1e9, 1e9, 1e9], dlo: 1e9, dhi: -1e9, dloAt: '', dhiAt: '', dK: [[1e9, -1e9], [1e9, -1e9], [1e9, -1e9]],
    shoulder: /^shoulder/.test(name) }));
const RIG_AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const sphereAt = (S, rest) => { const c0 = new V3(...BONE[S.at].head); if (rest) return { c: c0.toArray(), ax: RIG_AX };
  const M = Mof.get(S.frameBone), R3 = new THREE.Matrix4().extractRotation(M), a = (v) => new V3(...v).applyMatrix4(R3).normalize().toArray();
  return { c: c0.clone().applyMatrix4(M).toArray(), ax: { x: a([1, 0, 0]), y: a([0, 1, 0]), z: a([0, 0, 1]) } }; };
for (const S of SPHERES) { const { c, ax } = sphereAt(S, true); S.rest = FSM.fleshIn(restBVH, c, ax, S.cols, SPH_H, S.radii).byR; }
/* the rigid-skin control's posing: each vertex wholly its strongest bone's */
const posedRigid = (P) => P.rest.map((r, i) => r.clone().applyMatrix4(Mof.get(strongest(P, i))));
/* the sphere's own proofs on Juno: the rest reproduces itself; the whole body moved and turned rigidly reads 100 % */
{ const rest1 = SPHERES.map((S) => { const { c, ax } = sphereAt(S, true); return FSM.fleshIn(bodyBVH(body.rest), c, ax, S.cols, SPH_H, S.radii).byR[1] / S.rest[1]; });
  const T = new THREE.Matrix4().makeRotationAxis(new V3(0.3, 1, 0.2).normalize(), 37 * Math.PI / 180).setPosition(0.7, -0.2, 1.3), R3 = new THREE.Matrix4().extractRotation(T);
  const moved = bodyBVH(body.rest.map((r) => r.clone().applyMatrix4(T))), a = (v) => new V3(...v).applyMatrix4(R3).normalize().toArray();
  const whole = SPHERES.map((S) => FSM.fleshIn(moved, new V3(...BONE[S.at].head).applyMatrix4(T).toArray(), { x: a([1, 0, 0]), y: a([0, 1, 0]), z: a([0, 0, 1]) }, S.cols, SPH_H, S.radii).byR[1] / S.rest[1]);
  ok(rest1.every((x) => x === 1) && whole.every((x) => Math.abs(x - 1) <= 0.005), 'THE SPHERE\'S OWN PROOFS ON JUNO: the rest reads itself (' + rest1.map((x) => (100 * x).toFixed(2) + ' %').join(', ') + '), and the whole body moved 1.4 m and turned 37° reads ' + whole.map((x) => (100 * x).toFixed(2) + ' %').join(', ') + ' (100 ± 0.5) — a ' + SPH_H * 1000 + ' mm grid, ' + SPHERES.map((S) => S.cols.length).join('/') + ' columns'); }

/* ---- the motion ---- */
let frames = 0, insideFrames = 0, sphereFrames = 0, dqChecked = false;
const read = (G, label) => {
  setPose(G); frames++; const pb = posed(body);
  if (SKIN === 'dqs' && !dqChecked) { dqChecked = true;   /* on a vertex wholly one bone's, a dual quaternion IS that bone's move: DQS must equal the matrix */
    let worst = 0, n = 0; body.rest.forEach((r, i) => { if (n >= 400 || body.weights[i].length !== 1) return; n++; worst = Math.max(worst, pb[i].distanceTo(r.clone().applyMatrix4(Mof.get(body.bones[i][0])))); });
    ok(n > 0 && worst < 1e-6, 'THE DUAL QUATERNIONS ON ONE BONE: ' + n + ' vertices wholly one bone\'s, each where that bone\'s own matrix puts it to ' + (worst * 1e6).toFixed(3) + ' µm (≤ 1)'); }
  for (const sec of sections) { const A = cutOf(sec, pb, false); if (A == null || !sec.rest) continue; const r = A / sec.rest; if (r < sec.lo) { sec.lo = r; sec.loAt = label; } if (r > sec.hi) { sec.hi = r; sec.hiAt = label; } }
  for (const b of bands) { const r = closedVol(b, pb) / b.rest; if (r < b.lo) { b.lo = r; b.loAt = label; } if (r > b.hi) { b.hi = r; b.hiAt = label; } }
  for (const T of twists) { const r = rollOf(T); if (Math.abs(r) > Math.abs(T.worst)) { T.worst = r; T.at = label; } }
  for (const J of BENDS) { const b = bendOf(J, false) - J.rest; if (b > J.worst) { J.worst = b; J.at = label; } }
  if (frames % 3 !== 0) return;
  insideFrames++; const bvh = bodyBVH(pb);
  if (insideFrames % 2 === 0) { sphereFrames++; const rbvh = bodyBVH(posedRigid(body));
    /* the thickness's own rigid control: the skin's share is the blended thickness over the rigid one, the same frame */
    for (const S of SHOULDER) { if (!S.rest) continue; const b = thick(S, bvh, false), r = thick(S, rbvh, false); if (b == null || r == null) continue; const o = b / r;
      if (o < S.olo) { S.olo = o; S.oloAt = label; } if (o > S.ohi) { S.ohi = o; S.ohiAt = label; } }
    for (const S of SPHERES) { const { c, ax } = sphereAt(S, false), v = FSM.fleshIn(bvh, c, ax, S.cols, SPH_H, S.radii).byR, rK = FSM.fleshIn(rbvh, c, ax, S.cols, SPH_H, S.radii).byR, rv = rK[1] / S.rest[1];
      for (let k = 0; k < 3; k++) { const rr = rK[k] / S.rest[k], dk = v[k] / S.rest[k] - rr; S.rloK[k] = Math.min(S.rloK[k], rr); S.dK[k][0] = Math.min(S.dK[k][0], dk); S.dK[k][1] = Math.max(S.dK[k][1], dk); }
      for (let k = 0; k < 3; k++) { const r = v[k] / S.rest[k]; if (r < S.lo[k]) { S.lo[k] = r; if (k === 1) S.loAt = label; } if (r > S.hi[k]) { S.hi[k] = r; if (k === 1) S.hiAt = label; } }
      if (rv < S.rlo) { S.rlo = rv; S.rloAt = label; } if (rv > S.rhi) { S.rhi = rv; S.rhiAt = label; }
      const dd = v[1] / S.rest[1] - rv; if (dd < S.dlo) { S.dlo = dd; S.dloAt = label; } if (dd > S.dhi) { S.dhi = dd; S.dhiAt = label; } } }   // the skinning's own: blended less rigid, the same frame
  for (const S of SHOULDER) { if (!S.rest) continue; const v = thick(S, bvh, false); if (v == null) continue; const r = v / S.rest; if (r < S.lo) { S.lo = r; S.loAt = label; } if (r > S.hi) { S.hi = r; S.hiAt = label; } }
  for (const P of garments) { const pin = insideSet(posed(P), bvh, false), was = restIn.get(P.name); let n = 0, d = 0;
    for (const [i, x] of pin) if (!was.has(i) && x > 0.003) { n++; d = Math.max(d, x); }
    if (n > inside.garment.n) inside.garment.n = n; if (d > inside.garment.d) Object.assign(inside.garment, { d, at: label, piece: P.name }); }
  { const sin = insideSet(pb, bvh, true); let n = 0, d = 0; for (const [i, x] of sin) if (!restSelf.has(i) && x > 0.003) { n++; d = Math.max(d, x); }
    if (n > inside.self.n) inside.self.n = n; if (d > inside.self.d) Object.assign(inside.self, { d, at: label }); }
};
const until = (G, c, maxF, label, every = 2) => { for (let f = 0; f < maxF && !c(); f++) { G.frame(); if (f % every === 0) read(G, label); } };
const secs = (G, s, label, every = 2) => until(G, () => false, Math.round(s * 60), label, every);
const ollieInto = (G, label, then) => { const end = G.R.thumb(flick('Ollie')); until(G, () => G.R.sk.state === 'air', 90, label); until(G, () => G.R.ms >= end + 20, 30, label); if (then) then(); };
const FLAT = [100, 0, 140];
const scenarios = [
  ['a push from rest', () => { const G = figure({ at: FLAT, heading: 90, speed: 0 }); G.R.throttle = 1; secs(G, 2.6, 'push from rest'); G.R.throttle = 0; secs(G, 0.6, 'push from rest, rolling'); }],
  ['an ollie and its landing', () => { const G = figure({ at: FLAT, heading: 90, speed: 5 }); secs(G, 0.3, 'rolling'); ollieInto(G, 'ollie'); secs(G, 1.6, 'ollie, the landing'); }],
  ...TRICKS.grabs.map((g) => ['a ' + g.name, () => { const G = figure({ at: FLAT, heading: 90, speed: 5 }); secs(G, 0.3, 'rolling'); ollieInto(G, g.name, () => G.R.thumb(pull(40, 280, g.dir))); secs(G, 1.6, g.name); }]),
  ['a 50-50 on the ledge', () => { const G = figure({ at: [146, 0, 149.4], heading: 90, speed: 5.6 }); until(G, () => G.R.sk.p[0] >= 150.3, 200, 'to the ledge'); ollieInto(G, '50-50'); secs(G, 2.2, '50-50'); }],
  ['a 5-0 on the ledge', () => { const G = figure({ at: [146, 0, 149.4], heading: 90, speed: 5.6 }); until(G, () => G.R.sk.p[0] >= 150.3, 200, 'to the ledge'); ollieInto(G, '5-0', () => G.R.thumb(pull(34, 1200, 180))); secs(G, 2.2, '5-0'); }],
  ['a manual', () => { const G = figure({ at: FLAT, heading: 90, speed: 4.5 }); secs(G, 0.3, 'rolling'); G.R.thumb(pull(22, 1400)); secs(G, 2.0, 'manual'); }],
  ...[-1, 1].map((s) => ['a carve ' + (s < 0 ? 'left' : 'right'), () => { const G = figure({ at: FLAT, heading: 90, speed: 5 }); G.R.steer = s; secs(G, 2.0, 'carve ' + (s < 0 ? 'left' : 'right')); }]),
];
const t0 = performance.now();
for (const [, run] of scenarios) run();
const ms = performance.now() - t0, pct = (r) => (100 * r).toFixed(1) + ' %';

/* ---- the readings ---- */
console.log('DEFORM' + (SKIN === 'dqs' ? ' (by DUAL QUATERNIONS, no correctives)' : '') + ': ' + GLB.split('/').pop() + ' · ' + pieces.size + ' pieces (the body ' + body.rest.length + ' vertices, ' + body.tri.length + ' triangles) · ' + scenarios.length + ' motions of the game\'s own, ' + frames + ' frames read (' + insideFrames + ' for the inside), ' + (ms / 1000).toFixed(0) + ' s' + (PLANT ? ' · PLANTED: ' + PLANT + ' (' + planted + ' vertices)' : ''));
const unread = sections.filter((s) => !s.rest || s.lo === Infinity);
for (const s of sections) console.log('  · ' + s.name.padEnd(20) + (s.rest ? ' ' + (s.rest * 1e4).toFixed(1) + ' cm² at rest: ' + (s.lo === Infinity ? 'never cut round its bone' : 'kept ' + pct(s.lo) + ' at least (' + s.loAt + '), ' + pct(s.hi) + ' at most (' + s.hiAt + ')') : ' no cut round its bone at rest') + (s.twist ? '  [twist]' : ''));
const gated = sections.filter((s) => !s.fold), held = gated.filter((s) => s.rest && s.lo !== Infinity), wLo = held.reduce((a, s) => (s.lo < a.lo ? s : a)), wHi = held.reduce((a, s) => (s.hi > a.hi ? s : a));
for (const s of sections.filter((x) => x.fold)) console.log('ℹ THE FOLD CUT — reported (a deep bend squeezes the flesh there along and out of its plane): ' + s.name + ' kept ' + (s.lo === Infinity ? '—' : pct(s.lo) + ' at least (' + s.loAt + '), ' + pct(s.hi) + ' at most (' + s.hiAt + ')'));
ok(held.length === gated.length && wLo.lo >= 1 - BOUND && wHi.hi <= 1 + BOUND, 'THE LIMBS KEEP THEIR FLESH: every one of ' + gated.length + ' cuts of the upper arms, forearms, thighs and shins within ' + BOUND * 100 + ' % of its area at rest at every frame (tissue is incompressible: a change is the skinning\'s) — the least ' + pct(wLo.lo) + ' (' + wLo.name + ', ' + wLo.loAt + '), the most ' + pct(wHi.hi) + ' (' + wHi.name + ', ' + wHi.hiAt + ')' + (unread.filter((s) => !s.fold).length ? ' — ' + unread.filter((s) => !s.fold).length + ' cuts not read: ' + unread.filter((s) => !s.fold).map((s) => s.name).join(', ') : '') + ' (the fold cut under each knee reported above)');
for (const b of bands) console.log((b.cap ? '  ℹ ' : '  · ') + b.name.padEnd(11) + ' ' + String(b.tris.length).padStart(5) + ' triangles, closed across ' + b.loops.length + (b.loops.length === 1 ? ' end' : ' ends') + ', ' + (b.rest * 1e6).toFixed(0) + ' cm³ at rest: kept ' + pct(b.lo) + ' at least (' + b.loAt + '), ' + pct(b.hi) + ' at most (' + b.hiAt + ')' + (b.cap ? ' — a CAP, not a tube: its volume is its bulge over its own fan, not flesh (the shoulder\'s flesh is read in the upper arm\'s cuts)' : ''));
const tubes = bands.filter((b) => !b.cap), bLo = tubes.reduce((a, b) => (b.lo < a.lo ? b : a)), bHi = tubes.reduce((a, b) => (b.hi > a.hi ? b : a));
ok(bLo.lo >= 1 - BOUND && bHi.hi <= 1 + BOUND, 'THE JOINTS KEEP THEIR FLESH: round each ' + tubes.map((b) => b.name).join(', ') + ' (a band closed across both its ends), its volume within ' + BOUND * 100 + ' % of rest at every frame — the least ' + pct(bLo.lo) + ' (' + bLo.name + ', ' + bLo.loAt + '), the most ' + pct(bHi.hi) + ' (' + bHi.name + ', ' + bHi.hiAt + ')');
{ const names = [...new Set([...pieces.values()].flatMap((P) => Object.keys(P.morph)))].filter((m) => Object.keys(CORR.JOINTS).some((j) => m.startsWith(j + '_')));
  console.log('ℹ THE CORRECTIVES: ' + (names.length ? names.join(', ') + ' in the file, set by the joints\' bends (build/js/view/correctives.js) on ' + corrSeen + ' posings of a piece' : 'none in the file') + (PLANT === 'corrective-off' ? ' · PLANTED: set to nothing' : '')); }
console.log('ℹ THE BENDS the game puts on them (past rest): ' + BENDS.map((J) => J.name + ' ' + J.worst.toFixed(0) + '° (' + J.at + '; ' + J.rest.toFixed(0) + '° at rest)').join(' · '));
for (const S of SHOULDER) console.log('  · ' + S.name.padEnd(26) + (S.rest ? ' the outer half\'s mean radius² ' + (S.rest * 1e4).toFixed(1) + ' cm² at rest: kept ' + (S.lo === Infinity ? '— (no posed reading)' : pct(S.lo) + ' at least (' + S.loAt + '), ' + pct(S.hi) + ' at most (' + S.hiAt + ')') : ' a ray found no surface at rest'));
{ const read = SHOULDER.filter((S) => S.rest && S.olo !== Infinity), w1 = read.reduce((a, S) => (S.olo < a.olo ? S : a), read[0]), w2 = read.reduce((a, S) => (S.ohi > a.ohi ? S : a), read[0]);
  for (const S of read) console.log('  · ' + S.name.padEnd(26) + ' the skinning\'s own (blended over rigid, frame by frame): ' + pct(S.olo) + ' (' + S.oloAt + ') to ' + pct(S.ohi) + ' (' + S.ohiAt + ')');
  console.log('ℹ THE THICKNESS UNDER THE SHOULDERS itself — said (on a raised or turned arm the deltoid bunches, and flesh not the arm\'s crosses the rays near the joint): ' + SHOULDER.filter((S) => S.lo !== Infinity).map((S) => S.name.replace('under the shoulder ', '') + ' ' + pct(S.lo) + '–' + pct(S.hi)).join(' · '));
  ok(read.length === SHOULDER.length && w1.olo >= 1 - BOUND && w2.ohi <= 1 + BOUND, 'THE FLESH UNDER THE SHOULDERS, THE SKINNING\'S OWN: its thickness on the outer half, at ' + SHOULDER.length + ' heights, within ' + BOUND * 100 + ' % of the rigid-skin control\'s at every frame read — the least ' + (w1 ? pct(w1.olo) + ' (' + w1.name + ', ' + w1.oloAt + ')' : '—') + ', the most ' + (w2 ? pct(w2.ohi) + ' (' + w2.name + ', ' + w2.ohiAt + ')' : '—') + (read.length < SHOULDER.length ? ' — ' + (SHOULDER.length - read.length) + ' not read' : '')); }
for (const S of SPHERES) console.log('  · ' + S.name.padEnd(11) + ' sphere of ' + (S.R * 100).toFixed(0) + ' cm on the ' + S.frameBone + ', ' + (S.rest[1] * 1e6).toFixed(0) + ' cm³ of flesh at rest: kept ' + pct(S.lo[1]) + ' at least (' + S.loAt + '), ' + pct(S.hi[1]) + ' at most (' + S.hiAt + ') · at 0.9 and 1.1 of the radius ' + pct(S.lo[0]) + '–' + pct(S.hi[0]) + ' and ' + pct(S.lo[2]) + '–' + pct(S.hi[2]) + ' · the rigid-skin control ' + pct(S.rlo) + ' (' + S.rloAt + ') to ' + pct(S.rhi) + ' (' + S.rhiAt + ') · THE SKINNING\'S OWN (blended less rigid, frame by frame) ' + (S.dlo * 100).toFixed(1) + ' (' + S.dloAt + ') to ' + (S.dhi > 0 ? '+' : '') + (S.dhi * 100).toFixed(1) + ' points (' + S.dhiAt + ')');
/* THE JUDGEMENT, by what each reading can hold (10-16; the rigid-skin control and sphere_diag.mjs showed it): round a KNEE the sphere holds only
   the leg's own flesh, and its union is held at the tissue bound; round a SHOULDER other flesh comes within it — in the 5-0 the head tilts to
   the left shoulder, and the rigid control there GAINS 1,277 cm³ (the head 698, the arm 411, the clavicle 156) — so its union says the pose,
   not the skin: held there are (1) NO PART PUSHED INTO ANOTHER — the rigid control never losing more than the bound (a part driven into another
   counts its overlap once: the arm 30° across the chest reads 75 %) — and (2) THE SKINNING'S OWN — the blended skin within the bound of the
   rigid control, frame by frame; the union itself is said */
{ const knees = SPHERES.filter((S) => !S.shoulder), shoulders = SPHERES.filter((S) => S.shoulder);
  const kw = knees.reduce((a, S) => (S.lo[1] < a.lo[1] ? S : a)), kh = knees.reduce((a, S) => (S.hi[1] > a.hi[1] ? S : a));
  ok(sphereFrames > 0 && kw.lo[1] >= 1 - BOUND && kh.hi[1] <= 1 + BOUND, 'THE KNEES\' FLESH IN A SPHERE: round each knee (carried by its thigh) the union\'s volume within ' + BOUND * 100 + ' % of rest at every one of ' + sphereFrames + ' frames read — the least ' + pct(kw.lo[1]) + ' (' + kw.name + ', ' + kw.loAt + '), the most ' + pct(kh.hi[1]) + ' (' + kh.name + ', ' + kh.hiAt + ')' + (PLANT ? ' · PLANTED: ' + PLANT : ''));
  for (const S of shoulders) console.log('ℹ ' + S.name.toUpperCase() + '\'S UNION — said, not held (other flesh comes within it: in the 5-0 the head): ' + pct(S.lo[1]) + ' (' + S.loAt + ') to ' + pct(S.hi[1]) + ' (' + S.hiAt + ')');
  const sr = shoulders.reduce((a, S) => (S.rlo < a.rlo ? S : a));
  ok(sphereFrames > 0 && sr.rlo >= 1 - BOUND, 'THE SHOULDERS: NO PART PUSHED INTO ANOTHER — round each shoulder the rigid-skin control never below ' + (100 - BOUND * 100) + ' % of rest (an overlap is counted once) — the least ' + pct(sr.rlo) + ' (' + sr.name + ', ' + sr.rloAt + ')' + (PLANT ? ' · PLANTED: ' + PLANT : ''));
  const dw = shoulders.reduce((a, S) => (S.dlo < a.dlo ? S : a)), dh = shoulders.reduce((a, S) => (S.dhi > a.dhi ? S : a));
  ok(sphereFrames > 0 && dw.dlo >= -BOUND && dh.dhi <= BOUND, 'THE SHOULDERS: THE SKINNING\'S OWN — the blended skin within ' + BOUND * 100 + ' points of the rigid control\'s volume at every frame read — from ' + (dw.dlo * 100).toFixed(1) + ' (' + dw.name + ', ' + dw.dloAt + ') to ' + (dh.dhi > 0 ? '+' : '') + (dh.dhi * 100).toFixed(1) + ' (' + dh.name + ', ' + dh.dhiAt + ')' + (PLANT ? ' · PLANTED: ' + PLANT : ''));
  /* the radius must not decide a held number: each held reading within a point of itself at 0.9 and at 1.1 of the radius */
  const drift = [...knees.map((S) => [S.name + ' (its union)', Math.max(Math.abs(S.lo[0] - S.lo[1]), Math.abs(S.lo[2] - S.lo[1]), Math.abs(S.hi[0] - S.hi[1]), Math.abs(S.hi[2] - S.hi[1]))]),
    ...shoulders.map((S) => [S.name + ' (the rigid control\'s least)', Math.max(Math.abs(S.rloK[0] - S.rloK[1]), Math.abs(S.rloK[2] - S.rloK[1]))]),
    ...shoulders.map((S) => [S.name + ' (the skinning\'s own)', Math.max(Math.abs(S.dK[0][0] - S.dK[1][0]), Math.abs(S.dK[2][0] - S.dK[1][0]), Math.abs(S.dK[0][1] - S.dK[1][1]), Math.abs(S.dK[2][1] - S.dK[1][1]))])];
  const bad = drift.filter(([, d]) => d > 0.01);
  ok(!bad.length, 'THE SPHERES\' RADII DO NOT DECIDE A HELD NUMBER: each held reading within a point of itself at 0.9 and at 1.1 of its radius — the most it moved ' + (Math.max(...drift.map(([, d]) => d)) * 100).toFixed(2) + ' points' + (bad.length ? ' — not: ' + bad.map(([n, d]) => n + ' ' + (d * 100).toFixed(1)).join(', ') : '')); }
for (const T of twists) console.log('ℹ TWIST — ' + T.name + ': at most ' + T.worst.toFixed(0) + '° from where it hangs (' + (T.at || '—') + ')');
{ const tw = sections.filter((s) => s.twist && s.rest && s.lo !== Infinity), w = tw.reduce((a, s) => (s.lo < a.lo ? s : a), tw[0]);
  console.log('ℹ TWIST — the forearms\' cuts nearest the wrist (held in the limbs\' gate above): kept ' + (w ? pct(w.lo) + ' at least (' + w.name + ', ' + w.loAt + ')' : '—')); }
const farBy = {}; for (const f of far) { const k = f.piece + ': ' + f.own + ' with ' + f.n + ' (' + f.why + ')'; farBy[k] = farBy[k] || { n: 0, w: 0 }; farBy[k].n++; farBy[k].w = Math.max(farBy[k].w, f.w); }
ok(far.length === 0, 'NO LIMB\'S WEIGHT WHERE THE LIMB IS NOT BESIDE: every weight of 5 % or more on an arm, a forearm, a hand, a thigh, a shin or a foot within two bones of its vertex\'s strongest along the skeleton, and none on the other side\'s limb' + (far.length ? ' — ' + far.length + ' not: ' + Object.entries(farBy).sort((a, b) => b[1].n - a[1].n).slice(0, 6).map(([k, v]) => k + ' ×' + v.n + ' (to ' + v.w.toFixed(2) + ')').join(' · ') : '') + ' · the farthest weight lies ' + (farthest.d * 100).toFixed(1) + ' cm from its bone (' + farthest.at + ')');
if (PLANT === 'far') ok(plantCaught === planted, 'PLANTED far: ' + plantCaught + ' of the ' + planted + ' planted vertices caught by the far rule by their own weights (the left thigh\'s inner side, a third on the right thigh)');
console.log('ℹ GARMENTS PUSHED INTO THE BODY — CALIBRATED on this body\'s first reading, not yet a floor: at most ' + inside.garment.n + ' garment vertices inside the posed body more than 3 mm (none of them inside at rest), the deepest ' + (inside.garment.d * 1000).toFixed(0) + ' mm (' + (inside.garment.piece || '—') + ', ' + (inside.garment.at || '—') + ') · at rest ' + [...restIn.values()].reduce((a, m) => a + m.size, 0) + ' inside');
console.log('ℹ THE BODY PUSHED INTO ITSELF — CALIBRATED likewise: at most ' + inside.self.n + ' of its vertices (lifted 2 mm off their surface) inside it more than 3 mm that were not at rest, the deepest ' + (inside.self.d * 1000).toFixed(0) + ' mm (' + (inside.self.at || '—') + ') · at rest ' + restSelf.size + ' inside');
console.log('DEFORM' + (SKIN === 'dqs' ? ' (by dual quaternions)' : '') + ': ' + (fail ? 'RED · ' + fail : 'GREEN') + (PLANT ? ' · PLANTED: ' + PLANT : ''));
process.exit(fail ? 1 : 0);
