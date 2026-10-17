/* THE FLESH IN A SPHERE, ON KNOWN ANSWERS (10-16; the supervisor's proofs before its reading on Juno counts) — tests/lib/flesh_sphere.mjs on
 * closed shapes whose volume inside the sphere is known:
 *   1. a capsule limb turned rigidly about the sphere's centre: the same volume at every angle, and the analytic one;
 *   2. a ball on a stick turned down into a fixed slab: the union's volume is the ball's plus the slab's less their overlap, a spherical cap
 *      of the ball, analytic at every angle (an overlap counted ONCE);
 *   3. a skinned capsule bent 90° at its middle: by blended matrices it reads a loss; with the corrective the pipeline makes (the difference
 *      to dual quaternions, carried back through each vertex's blended matrix) it reads the volume back.
 * The grid's own error is stated: the same shapes at half the spacing.
 * Usage: node sources/juno/flesh_sphere_check.mjs */
const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const { BVH } = await import(ROOT + '/build/js/sim/bvh.js'), FS = await import(ROOT + '/tests/lib/flesh_sphere.mjs');
const THREE = await import(ROOT + '/build/vendor/three/build/three.module.min.js');
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const bvhOf = (meshes) => { const tris = []; for (const { P, T } of meshes) for (const [a, b, c] of T) tris.push([P[a], P[b], P[c]]);
  const pos = new Float32Array(tris.length * 9), nrm = new Float32Array(tris.length * 9);
  tris.forEach((t, k) => { const e1 = t[1].map((v, i) => v - t[0][i]), e2 = t[2].map((v, i) => v - t[0][i]), f = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], l = Math.hypot(...f) || 1;
    t.forEach((v, j) => { pos.set(v, k * 9 + j * 3); nrm.set(f.map((x) => x / l), k * 9 + j * 3); }); });
  return new BVH({ pos, nrm, surf: new Array(tris.length).fill('x') }); };
const signedVol = ({ P, T }) => T.reduce((s, [a, b, c]) => s + (P[a][0] * (P[b][1] * P[c][2] - P[b][2] * P[c][1]) - P[a][1] * (P[b][0] * P[c][2] - P[b][2] * P[c][0]) + P[a][2] * (P[b][0] * P[c][1] - P[b][1] * P[c][0])) / 6, 0);
const turnZ = (deg) => { const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t); return (p) => [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]]; };
const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, O = [0, 0, 0];
const read = (meshes, R, h) => FS.fleshIn(bvhOf(meshes), O, AX, FS.columnsOf(R, h), h).vol;
const pct = (x) => (100 * x).toFixed(2) + ' %';

/* the shapes are closed and face outward */
{ const c = FS.capsule(0.03, [0, 0, 0], [0.25, 0, 0]), b = FS.box([-0.2, -0.2, -0.2], [0.2, -0.035, 0.2]);
  ok(signedVol(c) > 0 && signedVol(b) > 0, 'THE TEST SHAPES ARE CLOSED AND FACE OUT: a capsule ' + (signedVol(c) * 1e6).toFixed(1) + ' cm³ (a closed one of radius 3 cm and length 25 cm holds ' + ((Math.PI * 0.03 ** 2 * 0.25 + (4 / 3) * Math.PI * 0.03 ** 3) * 1e6).toFixed(1) + '), a box ' + (signedVol(b) * 1e6).toFixed(0) + ' cm³'); }

/* 1. a capsule turned rigidly about the sphere's centre */
/* the grid: 2 mm, its error stated against 4 mm (a 3 cm tube is seven and a half 4 mm cells across: a lattice counting a circle that small
   misses by a few per cent, the same way at every turn — and every column's crossings sum to none: no ray slips between two triangles) */
const R = 0.10, H = 0.002, H4 = 0.004;
{ const r = 0.03, ana = (2 / 3) * Math.PI * r ** 3 + (2 * Math.PI / 3) * (R ** 3 - (R * R - r * r) ** 1.5);   // its hemisphere at the centre, and the cylinder out to the sphere
  const at = [0, 25, 50, 75, 100, 130, 160].map((deg) => { const c = FS.capsule(r, [0, 0, 0], [0.25, 0, 0]); c.P = c.P.map(turnZ(deg)); return { deg, v: read([c], R, H) }; });
  const coarse = (() => { const c = FS.capsule(r, [0, 0, 0], [0.25, 0, 0]); return read([c], R, H4); })();
  const lo = Math.min(...at.map((x) => x.v)), hi = Math.max(...at.map((x) => x.v)), err = Math.abs(at[0].v - ana) / ana, errCoarse = Math.abs(coarse - ana) / ana;
  console.log('  · a capsule (3 cm round, its end at the centre) inside a sphere of 10 cm, turned 0–160°: ' + at.map((x) => x.deg + '° ' + (x.v * 1e6).toFixed(1)).join(' · ') + ' cm³; analytic ' + (ana * 1e6).toFixed(1) + ' cm³');
  ok((hi - lo) / ana <= 0.01 && err <= 0.01, 'TURNED RIGIDLY ABOUT THE CENTRE, 100 % AT EVERY ANGLE: ' + pct((hi - lo) / ana) + ' across the angles (≤ 1: the measure\'s own error on a 3 cm tube, its facets and the grid together), ' + pct(err) + ' off the analytic (≤ 1) at a 2 mm grid — at 4 mm ' + pct(errCoarse) + ' off'); }

/* 2. a ball on a stick turned down into a fixed slab: the overlap is a spherical cap of the ball */
/* (the slab is TILTED 7°: a flat face square to the grid is rounded onto the grid's layers at the cells' edges — level, at −3.5 cm, it read
   2.6 % short at 2 mm and at 4 mm, and 1.5 % off its layers: up to half a cell times its area. Tilted, it crosses the layers and the
   rounding averages, as on a body's curved skin; the answers still follow from the plane's distance along its normal) */
{ const a = 0.03, d = 0.06, s = -0.035, tilt = 7, n = [-Math.sin((tilt * Math.PI) / 180), Math.cos((tilt * Math.PI) / 180), 0], ballAt = (deg) => [d * Math.cos((deg * Math.PI) / 180), d * Math.sin((deg * Math.PI) / 180), 0];
  const ball = (c) => { const m = FS.capsule(a, [c[0] - 1e-4, c[1], c[2]], [c[0] + 1e-4, c[1], c[2]], 48, 2, 24); return m; };   // a capsule of no length: a ball
  const capOf = (c) => { const h = Math.max(0, Math.min(2 * a, s - (n[0] * c[0] + n[1] * c[1] + n[2] * c[2] - a))); return (Math.PI * h * h * (3 * a - h)) / 3; };
  const slabIn = (() => { const Hs = R + s; return (Math.PI * Hs * Hs * (3 * R - Hs)) / 3; })(), V = (4 / 3) * Math.PI * a ** 3;
  const slab = () => { const b = FS.box([-0.3, -0.3, -0.3], [0.3, s, 0.3]); b.P = b.P.map(turnZ(tilt)); return b; };
  const rows = [0, -30, -60, -90].map((deg) => { const c = ballAt(deg), want = V + slabIn - capOf(c), got = read([ball(c), slab()], R, H); return { deg, got, want, cap: capOf(c) }; });
  for (const x of rows) console.log('  · the ball turned ' + x.deg + '°: its overlap with the slab ' + (x.cap * 1e6).toFixed(2) + ' cm³ · the union reads ' + (x.got * 1e6).toFixed(1) + ' cm³, analytic ' + (x.want * 1e6).toFixed(1));
  const worst = Math.max(...rows.map((x) => Math.abs(x.got - x.want) / x.want)), drop = rows[0].got - rows[3].got, dropWant = rows[3].cap - rows[0].cap;
  ok(worst <= 0.005 && Math.abs(drop - dropWant) / dropWant <= 0.03, 'INTO A FIXED SLAB, THE OVERLAP COUNTED ONCE: every angle within ' + pct(worst) + ' of the analytic union (≤ 0.5), and the volume lost from 0° to −90° ' + (drop * 1e6).toFixed(2) + ' cm³ against the cap\'s ' + (dropWant * 1e6).toFixed(2) + ' (within 3 %), at a 2 mm grid'); }

/* 3. a skinned capsule bent 90°: blended matrices lose volume; the corrective (dual quaternions less blended matrices, carried back) restores it */
{ const r = 0.03, cap = FS.capsule(r, [0, -0.25, 0], [0, 0.25, 0], 40, 60, 12), w = cap.P.map((p) => { const t = Math.min(1, Math.max(0, (0.05 - p[1]) / 0.1)); return t * t * (3 - 2 * t); });   // the lower bone's share, 0 above +5 cm, 1 below −5 cm
  const bend = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), I = new THREE.Quaternion();
  const lbs = (p, wb) => { const v = new THREE.Vector3(...p), b = v.clone().applyQuaternion(bend); return v.multiplyScalar(1 - wb).add(b.multiplyScalar(wb)).toArray(); };
  const dqs = (p, wb) => { const q = new THREE.Quaternion(I.x * (1 - wb) + bend.x * wb, I.y * (1 - wb) + bend.y * wb, I.z * (1 - wb) + bend.z * wb, I.w * (1 - wb) + bend.w * wb).normalize(); return new THREE.Vector3(...p).applyQuaternion(q).toArray(); };   // both bones turn about the joint at the origin: no move
  const M = (wb) => { const A = new THREE.Matrix3().identity(), B = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(bend)); const e = A.elements.map((x, i) => x * (1 - wb) + B.elements[i] * wb); return new THREE.Matrix3().fromArray(e); };
  const restV = read([cap], 0.08, 0.003);
  const bentL = { P: cap.P.map((p, i) => lbs(p, w[i])), T: cap.T }, bentD = { P: cap.P.map((p, i) => dqs(p, w[i])), T: cap.T };
  const corr = cap.P.map((p, i) => { const d = new THREE.Vector3(...bentD.P[i]).sub(new THREE.Vector3(...bentL.P[i])); return d.applyMatrix3(M(w[i]).clone().invert()).toArray(); });
  const bentC = { P: cap.P.map((p, i) => lbs([p[0] + corr[i][0], p[1] + corr[i][1], p[2] + corr[i][2]], w[i])), T: cap.T };
  const vL = read([bentL], 0.08, 0.003) / restV, vC = read([bentC], 0.08, 0.003) / restV;
  ok(vL < 0.95 && vC >= 0.97 && vC <= 1.03, 'A BEND OF 90° BY BLENDED MATRICES READS A LOSS, AND THE CORRECTIVE BRINGS IT BACK: the capsule keeps ' + pct(vL) + ' of its flesh inside the joint\'s sphere bent with no corrective (< 95), ' + pct(vC) + ' with it (97–103)'); }

console.log('FLESH SPHERE (known answers): ' + (fail ? 'RED · ' + fail : 'GREEN'));
process.exit(fail ? 1 : 0);
