/* WHAT ENTERS THE LEFT SHOULDER'S SPHERE IN THE 5-0 (10-16, a diagnosis for the supervisor's question: the rigid-skin control read 141.7 %
 * there — the motion itself, not the skinning). The body posed RIGIDLY (each vertex wholly its strongest bone's) through the game's 5-0 on the
 * flat's ledge; at the frame where the sphere (11 cm round the left shoulder joint, carried by the left clavicle) holds the most, every
 * sample point inside the posed body that was not inside at rest is traced to the nearest posed vertex: whose flesh it is, by that vertex's
 * strongest bone. Usage: node sources/juno/sphere_diag.mjs <a --with-body 1 glb> <GLTFLoader.js> [the sphere: shoulder L|shoulder R] */
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, ''), GLB = process.argv[2], LOADER = process.argv[3], WHICH = process.argv[4] || 'shoulder L';
const THREE = await import(ROOT + '/build/vendor/three/build/three.module.min.js'), { GLTFLoader } = await import(LOADER);
const { figure } = await import(ROOT + '/tests/lib/figure.mjs'), { flick, pull } = await import(ROOT + '/tests/lib/rig.mjs');
const { BVH } = await import(ROOT + '/build/js/sim/bvh.js'), FSM = await import(ROOT + '/tests/lib/flesh_sphere.mjs');
const V3 = THREE.Vector3, buf = readFileSync(GLB), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const sk = JSON.parse(readFileSync(ROOT + '/sources/juno/skeleton.json', 'utf8')), BONE = Object.fromEntries(sk.bones.map((b) => [b.name, b]));
const body = { key: new Map(), rest: [], own: [], tri: [] };
gltf.scene.traverse((o) => { if (!o.isSkinnedMesh) return; const nm = (o.parent && o.parent.type === 'Group' && o.parent.parent ? o.parent.name : o.name).replace(/_\d+$/, ''); if (nm !== 'JunoBody') return;
  const g = o.geometry, pos = g.attributes.position.array, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array, jn = o.skeleton.bones.map((b) => b.name), ix = g.index.array;
  const at = (i) => { const k = Math.round(pos[i * 3] * 1e6) + ',' + Math.round(pos[i * 3 + 1] * 1e6) + ',' + Math.round(pos[i * 3 + 2] * 1e6);
    if (!body.key.has(k)) { body.key.set(k, body.rest.length); body.rest.push(new V3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])); let q = 0; for (let j = 1; j < 4; j++) if (sw[i * 4 + j] > sw[i * 4 + q]) q = j; body.own.push(jn[si[i * 4 + q]]); }
    return body.key.get(k); };
  for (let t = 0; t < ix.length; t += 3) body.tri.push([at(ix[t]), at(ix[t + 1]), at(ix[t + 2])]); });
const bvhOf = (pts) => { const n = body.tri.length, pos = new Float32Array(n * 9), nrm = new Float32Array(n * 9); body.tri.forEach(([a, b, c], k) => [a, b, c].forEach((v, j) => pos.set([pts[v].x, pts[v].y, pts[v].z], k * 9 + j * 3))); return new BVH({ pos, nrm, surf: new Array(n).fill('b') }); };
const [frameBone, at] = WHICH === 'shoulder R' ? ['clavR', 'armR'] : ['clavL', 'armL'], R = 0.11, H = 0.004, cols = FSM.columnsOf(R, H), RIG = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
/* the inside points of one posing, in the sphere's own (rest) coordinates */
const insidePoints = (bvh, c, ax) => { const out = new Set(); for (const col of cols) { const o = [0, 1, 2].map((k) => c[k] + ax.x[k] * col.x + ax.z[k] * col.z - ax.y[k] * 2.5), hits = FSM.hitsAlong(bvh, o, ax.y, 5);
  for (const y of col.ys) { let w = 0; for (const h of hits) { if (h.t >= 2.5 + y) break; w += h.s; } if (w >= 1) out.add(col.x.toFixed(4) + ',' + y.toFixed(4) + ',' + col.z.toFixed(4)); } } return out; };
const c0 = new V3(...BONE[at].head), restIn = insidePoints(bvhOf(body.rest), c0.toArray(), RIG);
const G = figure({ at: [146, 0, 149.4], heading: 90, speed: 5.6 }), Mof = new Map();
let best = { n: 0 };
const read = (label) => { G.board.updateMatrixWorld(true); G.F.names.forEach((n, j) => Mof.set(n, new THREE.Matrix4().multiplyMatrices(G.F.bones[n].matrixWorld, G.F.skeleton.boneInverses[j])));
  const pr = body.rest.map((r, i) => r.clone().applyMatrix4(Mof.get(body.own[i]))), M = Mof.get(frameBone), R3 = new THREE.Matrix4().extractRotation(M), a = (v) => new V3(...v).applyMatrix4(R3).normalize().toArray();
  const ax = { x: a([1, 0, 0]), y: a([0, 1, 0]), z: a([0, 0, 1]) }, c = c0.clone().applyMatrix4(M).toArray(), ins = insidePoints(bvhOf(pr), c, ax);
  if (ins.size > best.n) best = { n: ins.size, ins, pr, ax, c, label, t: G.R.ms }; };
const end = (() => { for (let f = 0; f < 200 && G.R.sk.p[0] < 150.3; f++) G.frame(); return G.R.thumb(flick('Ollie')); })();
for (let f = 0; f < 90 && G.R.sk.state !== 'air'; f++) G.frame();
for (let f = 0; f < 30 && G.R.ms < end + 20; f++) G.frame();
G.R.thumb(pull(34, 1200, 180));
for (let f = 0; f < 132; f++) { G.frame(); if (f % 6 === 0) read('5-0'); }
/* the points gained, each traced to the nearest posed vertex's strongest bone */
const gained = [...best.ins].filter((k) => !restIn.has(k)), lost = [...restIn].filter((k) => !best.ins.has(k)), tally = {}, tallyLost = {};
const toWorld = (k) => { const [x, y, z] = k.split(',').map(Number); return new V3(...[0, 1, 2].map((q) => best.c[q] + best.ax.x[q] * x + best.ax.y[q] * y + best.ax.z[q] * z)); };
for (const k of gained) { const p = toWorld(k); let bi = 0, bd = Infinity; best.pr.forEach((v, i) => { const d = v.distanceToSquared(p); if (d < bd) { bd = d; bi = i; } }); tally[body.own[bi]] = (tally[body.own[bi]] || 0) + 1; }
for (const k of lost) { const [x, y, z] = k.split(',').map(Number), p = c0.clone().add(new V3(x, y, z)); let bi = 0, bd = Infinity; body.rest.forEach((v, i) => { const d = v.distanceToSquared(p); if (d < bd) { bd = d; bi = i; } }); tallyLost[body.own[bi]] = (tallyLost[body.own[bi]] || 0) + 1; }
const cm3 = (n) => (n * H ** 3 * 1e6).toFixed(0) + ' cm³';
console.log('THE ' + WHICH.toUpperCase() + '\'S SPHERE (11 cm, carried by ' + frameBone + '), RIGID SKIN, the 5-0: at rest ' + cm3(restIn.size) + ' of flesh; at its fullest (' + (best.t / 1000).toFixed(2) + ' s) ' + cm3(best.n) + ' (' + (100 * best.n / restIn.size).toFixed(1) + ' %)');
console.log('  gained ' + cm3(gained.length) + ', by whose flesh: ' + Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([n, v]) => n + ' ' + cm3(v)).join(' · '));
console.log('  lost ' + cm3(lost.length) + ', whose flesh it was at rest: ' + Object.entries(tallyLost).sort((a, b) => b[1] - a[1]).map(([n, v]) => n + ' ' + cm3(v)).join(' · '));
