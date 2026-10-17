/* A PARK'S BACKDROP STAYS OUTSIDE ITS FENCE, AND WITHIN A PHONE'S MEANS (the supervisor, 10-16: "nothing of it overhangs the park"; drawn
 * only, it is in no collision mesh, so the camera's sight rule and the inside census could not see it if it reached in). Read from the GLB
 * itself, as the game loads it: every vertex of every mesh, in game coordinates (glTF's Y-up is the game's), against the park's fence
 * (sim/park.js fenceOf) — none inside it, nor above the park within the camera's reach; its triangles and its textures counted.
 *   node tests/backdrop.mjs <park module> [--plant inside]   (the plant moves one vertex 1 m into the park: the wall must go RED) */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fenceOf } from '../build/js/sim/park.js';

const [modPath] = process.argv.slice(2), plant = process.argv.includes('--plant');
const def = (await import(pathToFileURL(path.resolve(modPath)).href)).default, P = def.PARK;
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const file = path.resolve('build', P.backdrop.file);
const buf = fs.readFileSync(file), jsonLen = buf.readUInt32LE(12), J = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8')), bin = buf.slice(20 + jsonLen + 8);
const F = fenceOf(P), BUDGET = P.backdrop.budget;
const accessor = (i) => { const a = J.accessors[i], v = J.bufferViews[a.bufferView], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const C = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType];
  return { arr: new C(bin.buffer, bin.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0), a.count * n), n, count: a.count }; };
/* the node transforms (translation, rotation, scale) from each mesh's node to the root */
const mat = (nd) => { const t = nd.translation || [0, 0, 0], r = nd.rotation || [0, 0, 0, 1], s = nd.scale || [1, 1, 1], [x, y, z, w] = r;
  return [[(1 - 2 * (y * y + z * z)) * s[0], (2 * (x * y - z * w)) * s[1], (2 * (x * z + y * w)) * s[2], t[0]], [(2 * (x * y + z * w)) * s[0], (1 - 2 * (x * x + z * z)) * s[1], (2 * (y * z - x * w)) * s[2], t[1]], [(2 * (x * z - y * w)) * s[0], (2 * (y * z + x * w)) * s[1], (1 - 2 * (x * x + y * y)) * s[2], t[2]]]; };
let tris = 0, inside = 0, worst = null, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
const meshes = [];
for (const nd of J.nodes) {
  if (nd.mesh == null) continue; const M = mat(nd), me = J.meshes[nd.mesh]; let t = 0;
  for (const pr of me.primitives) {
    const pos = accessor(pr.attributes.POSITION), idx = pr.indices != null ? accessor(pr.indices) : null; t += (idx ? idx.count : pos.count) / 3;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.arr[i * 3], y = pos.arr[i * 3 + 1], z = pos.arr[i * 3 + 2];
      const X = M[0][0] * x + M[0][1] * y + M[0][2] * z + M[0][3], Y = M[1][0] * x + M[1][1] * y + M[1][2] * z + M[1][3], Z = M[2][0] * x + M[2][1] * y + M[2][2] * z + M[2][3];
      let gx = X, gz = Z; if (plant && i === 0 && nd === J.nodes.find((q) => q.mesh != null)) { gx = 48; gz = 36; }   // the plant: a vertex in the middle of the park
      lo = [Math.min(lo[0], gx), Math.min(lo[1], Y), Math.min(lo[2], gz)]; hi = [Math.max(hi[0], gx), Math.max(hi[1], Y), Math.max(hi[2], gz)];
      if (gx > F.x0 && gx < F.x1 && gz > F.z0 && gz < F.z1) { inside++; if (!worst) worst = [me.name, +gx.toFixed(2), +Y.toFixed(2), +gz.toFixed(2)]; }
    }
  }
  tris += t; meshes.push(`${me.name || nd.name} ${t}`);
}
const tex = (J.images || []).map((im) => { const v = J.bufferViews[im.bufferView], b = bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  /* the image's size from its own header (WebP VP8/VP8L/VP8X, PNG, JPEG) */
  let w = 0, h = 0; const s = b.toString('ascii', 0, 4);
  if (s === 'RIFF') { const f = b.toString('ascii', 12, 16); if (f === 'VP8 ') { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; } else if (f === 'VP8L') { const bits = b.readUInt32LE(21); w = (bits & 0x3fff) + 1; h = ((bits >> 14) & 0x3fff) + 1; } else if (f === 'VP8X') { w = 1 + b.readUIntLE(24, 3); h = 1 + b.readUIntLE(27, 3); } }
  else if (b[0] === 0x89) { w = b.readUInt32BE(16); h = b.readUInt32BE(20); }
  return { name: im.name, w, h, bytes: v.byteLength }; });
const gpu = tex.reduce((s, t) => s + t.w * t.h * 4 * 4 / 3, 0);
console.log(`${def.name}'s backdrop: ${path.basename(file)} ${(buf.length / 1048576).toFixed(2)} MB · ${meshes.join(' · ')} · its extent x ${lo[0].toFixed(1)}..${hi[0].toFixed(1)} y ${lo[1].toFixed(1)}..${hi[1].toFixed(1)} z ${lo[2].toFixed(1)}..${hi[2].toFixed(1)}`);
ok(inside === 0, `nothing inside the fence (x ${F.x0}..${F.x1}, z ${F.z0}..${F.z1}): ${inside ? inside + ' vertices, the first ' + JSON.stringify(worst) : 'none'}`);
ok(tris <= BUDGET.triangles, `its triangles ${tris} ≤ ${BUDGET.triangles}`);
ok(gpu / 1048576 <= BUDGET.textureMb && tex.every((t) => t.w > 0 && t.w <= BUDGET.textureSide && t.h <= BUDGET.textureSide), `its textures, on the graphics card with their smaller copies: ${(gpu / 1048576).toFixed(1)} MB ≤ ${BUDGET.textureMb} (${tex.length}: ${tex.map((t) => t.w + '²').join(' ')}), none over ${BUDGET.textureSide}²`);
ok(buf.length / 1048576 <= BUDGET.fileMb, `the file ${(buf.length / 1048576).toFixed(2)} MB ≤ ${BUDGET.fileMb}`);
console.log(fail ? 'BACKDROP: RED' : 'BACKDROP: GREEN'); process.exit(fail ? 1 : 0);
