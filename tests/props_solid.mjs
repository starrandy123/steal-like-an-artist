/* A PROP IS SOLID FROM OUTSIDE (what the board and the camera meet): its own triangles in a tree of their own, then 8 rays round it at 3
 * heights (a quarter, a half and three quarters of its height), each aimed level at its middle from 2 m out — each must meet a FRONT face
 * (the tree's raycast sees front faces only, as the sim's does) before it reaches the prop's axis. A prop with a hole or a face turned
 * inward lets a ray through. Usage: node tests/props_solid.mjs <park module> */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BVH } from '../build/js/sim/bvh.js';
const def = (await import(pathToFileURL(path.resolve(process.argv[2])).href)).default, M = def.PARK.propMeshes;
let fail = 0;
for (const [kind, m] of Object.entries(M)) {
  const n = m.idx.length / 3, pos = new Float32Array(n * 9), nrm = new Float32Array(n * 9), surf = [];
  for (let t = 0; t < n; t++) {
    const v = [0, 1, 2].map((k) => [m.pos[m.idx[t * 3 + k] * 3], m.pos[m.idx[t * 3 + k] * 3 + 1], m.pos[m.idx[t * 3 + k] * 3 + 2]]);
    const e1 = v[1].map((x, i) => x - v[0][i]), e2 = v[2].map((x, i) => x - v[0][i]), c = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], l = Math.hypot(...c) || 1;
    for (let k = 0; k < 3; k++) { pos.set(v[k], t * 9 + k * 3); nrm.set(c.map((x) => x / l), t * 9 + k * 3); } surf.push('wall');
  }
  const bvh = new BVH({ pos, nrm, surf }), [bx0, bz0, bx1, bz1] = m.box, cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, H = m.size[1];
  let hit = 0, tot = 0; const misses = [];
  for (const fy of [0.25, 0.5, 0.75]) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, o = [cx + Math.cos(a) * 2.5, H * fy, cz + Math.sin(a) * 2.5], d = [-Math.cos(a), 0, -Math.sin(a)];
    const h = bvh.raycast(o, d, 2.5); tot++; if (h) hit++; else misses.push(`${(a * 180 / Math.PI).toFixed(0)}° at ${(H * fy).toFixed(2)} m`);
  }
  const ok = hit === tot; if (!ok) fail++;
  console.log(`${ok ? '✔' : '✖'} ${kind}: ${hit} of ${tot} rays from outside meet a face before its middle${misses.length ? ' — through: ' + misses.slice(0, 6).join(', ') : ''}`);
}
console.log(fail ? `PROPS SOLID: RED (${fail})` : 'PROPS SOLID: GREEN'); process.exit(fail ? 1 : 0);
