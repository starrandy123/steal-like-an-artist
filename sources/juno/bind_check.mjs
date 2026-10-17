/* A SKINNED MODEL FROM BLENDER, ON THE GAME'S BONES (10-16): reads a .glb with three.js's GLTFLoader, binds each skinned mesh to the game's
 * own skeleton (rigSkater's — names remapped, the game's identity bind) and checks:
 *   the joints stand on the game's bone heads (the space and the fit);
 *   the weights: at most four a vertex, each vertex's sum 1;
 *   posed by the game's own push and ollie, how far each vertex strays from the rigid follow of its strongest bone (a weight that reaches
 *   a bone far from the vertex drags it: the inner thigh on the other leg, the waist on a hand) — the worst, the 99th percentile, and the
 *   vertices over 5 cm, by their strongest bone.
 * Usage: node sources/juno/bind_check.mjs <the .glb> <three@0.183.1's examples/jsm/loaders/GLTFLoader.js> */
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, ''), GLB = process.argv[2], LOADER = process.argv[3];
const THREE = await import(ROOT + '/build/vendor/three/build/three.module.min.js');
const { GLTFLoader } = await import(LOADER);
const { figure } = await import(ROOT + '/tests/lib/figure.mjs'), { flick } = await import(ROOT + '/tests/lib/rig.mjs');
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const buf = readFileSync(GLB), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const skinned = []; gltf.scene.updateMatrixWorld(true); gltf.scene.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
const sk = JSON.parse(readFileSync(ROOT + '/sources/juno/skeleton.json', 'utf8')), head = Object.fromEntries(sk.bones.map((b) => [b.name, b.head]));
let worstJ = 0; for (const j of skinned[0].skeleton.bones) { const h = head[j.name], p = new (j.position.constructor)().setFromMatrixPosition(j.matrixWorld); worstJ = Math.max(worstJ, Math.hypot(p.x - h[0], p.y - h[1], p.z - h[2])); }
ok(worstJ < 1e-5, 'THE JOINTS STAND ON THE GAME\'S BONES: ' + skinned[0].skeleton.bones.length + ' joints, the farthest ' + (worstJ * 1000).toFixed(4) + ' mm off its head');
const G = figure({ at: [150, 0, 150], heading: 90, speed: 3 }), F = G.F, names = F.names, gameIndex = Object.fromEntries(names.map((n, i) => [n, i]));
const BIND = new THREE.Matrix4(), meshes = [];
for (const src of skinned) {
  const g = src.geometry, pos = g.attributes.position.array, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array, jn = src.skeleton.bones.map((b) => b.name);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  const idx = new Uint16Array(si.length); for (let i = 0; i < si.length; i++) idx[i] = gameIndex[jn[si[i]]];
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(sw), 4));
  const m = new THREE.SkinnedMesh(geo, new THREE.MeshBasicMaterial()); m.name = src.name; F.rig.add(m); m.bind(F.skeleton, BIND);
  const n = pos.length / 3, own = new Uint16Array(n); let sumOff = 0;
  for (let i = 0; i < n; i++) { let s = 0, k = 0; for (let q = 0; q < 4; q++) { s += sw[i * 4 + q]; if (sw[i * 4 + q] > sw[i * 4 + k]) k = q; } own[i] = idx[i * 4 + k]; sumOff = Math.max(sumOff, Math.abs(s - 1)); }
  meshes.push({ m, rest: new Float32Array(pos), own, n, sumOff, dev: new Float32Array(n) });
}
for (const M of meshes) ok(M.sumOff < 1e-3, 'THE WEIGHTS of ' + M.m.name + ': ' + M.n + ' vertices, four a vertex at most (glTF\'s own), each summing to 1 within ' + M.sumOff.toExponential(1));
const restInv = F.skeleton.boneInverses, v = new THREE.Vector3(), w = new THREE.Vector3();
const read = () => { F.rig.updateMatrixWorld(true); for (const M of meshes) for (let i = 0; i < M.n; i++) { v.fromArray(M.rest, i * 3); M.m.applyBoneTransform(i, v); v.applyMatrix4(M.m.matrixWorld); const b = M.own[i]; w.fromArray(M.rest, i * 3).applyMatrix4(restInv[b]).applyMatrix4(F.skeleton.bones[b].matrixWorld); M.dev[i] = Math.max(M.dev[i], v.distanceTo(w)); } };
read(); let frames = 1;
for (let f = 0; f < 90; f++) { G.R.throttle = 1; G.frame(); if (f % 5 === 0) { read(); frames++; } }
G.R.throttle = 0; G.R.thumb(flick('Ollie')); for (let f = 0; f < 80; f++) { G.frame(); if (f % 4 === 0) { read(); frames++; } }
for (const M of meshes) {
  const d = Array.from(M.dev).sort((a, b) => a - b), p99 = d[Math.floor(d.length * 0.99)], worst = d[d.length - 1], over = {};
  for (let i = 0; i < M.n; i++) if (M.dev[i] > 0.05) { const nm = names[M.own[i]]; over[nm] = (over[nm] || 0) + 1; }
  console.log('ℹ ' + M.m.name + ' over ' + frames + ' frames of the game\'s push and ollie: a vertex strays from its strongest bone\'s rigid follow at most ' + (worst * 100).toFixed(1) + ' cm, the 99th percentile ' + (p99 * 100).toFixed(1) + ' cm; over 5 cm: ' + (Object.entries(over).map(([k, n]) => n + ' on ' + k).join(', ') || 'none'));
}
console.log('BIND: ' + (fail ? 'RED · ' + fail : 'GREEN'));
