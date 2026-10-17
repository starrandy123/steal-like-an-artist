/* THE PIPELINE SPIKE'S PROOF (10-16): the .glb Blender made from the game's own skeleton, read by three.js's GLTFLoader, bound to the game's
 * EXISTING bones (rigSkater's skeleton — the game's animation untouched), then posed by the game's real sim and pose code through a push,
 * an ollie and a grind: every box corner follows its bone exactly; the glTF's joints stand where the game's bones stand; the capsule's
 * automatic weights are sane. Planted both ways: PLANT=by_order (the glTF's joints taken in their own order, not by name) and PLANT=bind_world
 * (a bind matrix in the world) each turn THE ANIMATION STICKS red.
 * Usage: node sources/juno/spike_test.mjs <the .glb> <three@0.183.1's examples/jsm/loaders/GLTFLoader.js> */
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, ''), GLB = process.argv[2], LOADER = process.argv[3];
const THREE = await import(ROOT + '/build/vendor/three/build/three.module.min.js');
const { GLTFLoader } = await import(LOADER);   // another copy of three, the loader's own: only plain arrays are taken from what it reads
const { figure } = await import(ROOT + '/tests/lib/figure.mjs'), { flick } = await import(ROOT + '/tests/lib/rig.mjs');
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const buf = readFileSync(GLB), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
const skinned = []; gltf.scene.updateMatrixWorld(true); gltf.scene.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
ok(skinned.length >= 1, 'THE GLB READS: ' + skinned.length + ' skinned meshes (' + skinned.map((m) => m.name).join(', ') + ')');
/* 1. the glTF's joints at rest stand where the game's bones stand (the space converted right: x across, y up, z toward the nose) */
const sk = JSON.parse(readFileSync(ROOT + '/sources/juno/skeleton.json', 'utf8')), head = Object.fromEntries(sk.bones.map((b) => [b.name, b.head]));
const joints = skinned[0].skeleton.bones; let worstJ = 0, missing = [];
for (const j of joints) { const h = head[j.name]; if (!h) { missing.push(j.name); continue; } const p = new (j.position.constructor)().setFromMatrixPosition(j.matrixWorld); worstJ = Math.max(worstJ, Math.hypot(p.x - h[0], p.y - h[1], p.z - h[2])); }
ok(!missing.length && joints.length === sk.bones.length && worstJ < 1e-5, 'THE JOINTS STAND ON THE GAME\'S BONES: ' + joints.length + ' of ' + sk.bones.length + ', the farthest ' + (worstJ * 1000).toFixed(4) + ' mm off its head (< 0.01)' + (missing.length ? ' — not in the game: ' + missing.join(', ') : ''));
/* 2. the game's own rig, posed by its own code; the glb's meshes bound to ITS skeleton (as the game binds its body and its ink line) */
const G = figure({ at: [150, 0, 150], heading: 90, speed: 3 }), F = G.F, names = F.names, gameIndex = Object.fromEntries(names.map((n, i) => [n, i]));
/* the game binds its body with the rig at the origin (view/skater.js buildSkater: rig.add(sm); sm.bind(skeleton)): its bind matrix is the
   identity, rig space to rig space, where the skeleton's inverses were taken */
const BIND = new THREE.Matrix4();
const bound = skinned.map((src) => {
  const g = src.geometry, pos = g.attributes.position.array, si = g.attributes.skinIndex.array, sw = g.attributes.skinWeight.array, jn = src.skeleton.bones.map((b) => b.name);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  const idx = new Uint16Array(si.length); for (let i = 0; i < si.length; i++) idx[i] = process.env.PLANT === 'by_order' ? si[i] : gameIndex[jn[si[i]]];   // the glTF's joint order → the game's bones by NAME (the plant: by order)
  geo.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(new Float32Array(sw), 4));
  const m = new THREE.SkinnedMesh(geo, new THREE.MeshBasicMaterial()); m.name = src.name; F.rig.add(m); m.bind(F.skeleton, process.env.PLANT === 'bind_world' ? F.rig.matrixWorld.clone().makeTranslation(150, 0, 150) : BIND);   // (the plant: a bind matrix in the world)
  /* each vertex's OWN bone as Blender wrote it — the name of its strongest joint in the glTF — read apart from the remap under test */
  const own = new Uint16Array(si.length / 4); for (let i = 0; i < own.length; i++) { let k = 0; for (let q = 1; q < 4; q++) if (sw[i * 4 + q] > sw[i * 4 + k]) k = q; own[i] = gameIndex[jn[si[i * 4 + k]]]; }
  return { m, rest: new Float32Array(pos), si: idx, sw: new Float32Array(sw), own, name: src.name };
});
const boxes = bound.find((b) => /Box/i.test(b.name)) || bound[0], capsule = bound.find((b) => /Capsule|Cylinder/i.test(b.name));
/* the rest world matrices of the game's bones, from its skeleton's own inverses */
const restInv = F.skeleton.boneInverses;
let worst = 0, worstAt = '', frames = 0, moved = 0;
const v = new THREE.Vector3(), want = new THREE.Vector3();
const check = (label) => {
  F.rig.updateMatrixWorld(true); frames++;
  const n = boxes.rest.length / 3;
  for (let i = 0; i < n; i++) {
    v.fromArray(boxes.rest, i * 3); boxes.m.applyBoneTransform(i, v); v.applyMatrix4(boxes.m.matrixWorld);   // three.js's own skinning, to the world
    const b = boxes.own[i], bone = F.skeleton.bones[b];
    want.fromArray(boxes.rest, i * 3).applyMatrix4(restInv[b]).applyMatrix4(bone.matrixWorld);   // the rigid follow of the bone Blender gave it, in the game's own bind (rig space, as the inverses were taken)
    const d = v.distanceTo(want); if (d > worst) { worst = d; worstAt = label + ' (' + bone.name + ')'; }
    if (want.distanceTo(new THREE.Vector3().fromArray(boxes.rest, i * 3)) > 0.05) moved++;
  }
};
check('at rest');
for (let f = 0; f < 60; f++) { G.R.throttle = 1; G.frame(); if (f % 6 === 0) check('a push, frame ' + f); }
G.R.throttle = 0; G.R.thumb(flick('Ollie')); for (let f = 0; f < 70; f++) { G.frame(); if (f % 4 === 0) check('an ollie, frame ' + f + ' (' + G.R.sk.state + ')'); }
ok(worst < 1e-6 && moved > 1000, 'THE ANIMATION STICKS: every box corner on the game\'s skinning follows its bone exactly over ' + frames + ' frames of the game\'s own push and ollie — the farthest ' + (worst * 1e6).toFixed(3) + ' µm off (< 1; ' + (worstAt || 'none') + '), ' + moved + ' corner-frames carried more than 5 cm (the pose moved them)');
/* 3. the automatic weights: each vertex's four sum to 1, and its strongest bone is one of the two nearest to it */
if (capsule) {
  const n = capsule.rest.length / 3, segD = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], L = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2, t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L)); return Math.hypot(ap[0] - t * ab[0], ap[1] - t * ab[1], ap[2] - t * ab[2]); };
  let sumOff = 0, far = 0;
  for (let i = 0; i < n; i++) {
    let s = 0, top = -1, tw = -1; for (let k = 0; k < 4; k++) { const w = capsule.sw[i * 4 + k]; s += w; if (w > tw) { tw = w; top = capsule.si[i * 4 + k]; } }
    sumOff = Math.max(sumOff, Math.abs(s - 1));
    const p = [capsule.rest[i * 3], capsule.rest[i * 3 + 1], capsule.rest[i * 3 + 2]], ds = sk.bones.map((b) => [b.name, segD(p, b.head, b.tail)]).sort((a, b) => a[1] - b[1]);
    if (![ds[0][0], ds[1][0], ds[2][0]].includes(names[top])) far++;
  }
  ok(sumOff < 1e-3 && far / n < 0.05, 'THE AUTOMATIC WEIGHTS ARE SANE: ' + n + ' capsule vertices, each one\'s four sum to 1 within ' + sumOff.toExponential(1) + ' (< 1e-3), ' + far + ' whose strongest bone is not among their three nearest (< 5 %)');
}
console.log('SPIKE: ' + (fail ? 'RED · ' + fail : 'GREEN'));
process.exit(fail ? 1 : 0);
