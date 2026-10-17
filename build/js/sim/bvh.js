/* A bounding-volume tree over the park's collision triangles: a ray's first hit (with the normal interpolated across the triangle, so a
 * faceted transition rides like a curve), and every triangle near a sphere (walls, the camera). Built once, deterministic, no library. */
export class BVH {
  constructor(col, leaf = 4) {
    const P = col.pos, N = col.nrm, n = P.length / 9;
    this.P = P; this.N = N; this.surf = col.surf; this.count = n;
    const cx = new Float64Array(n), cy = new Float64Array(n), cz = new Float64Array(n), order = new Uint32Array(n);
    for (let i = 0; i < n; i++) { const o = i * 9; cx[i] = (P[o] + P[o + 3] + P[o + 6]) / 3; cy[i] = (P[o + 1] + P[o + 4] + P[o + 7]) / 3; cz[i] = (P[o + 2] + P[o + 5] + P[o + 8]) / 3; order[i] = i; }
    const nodes = []; // [minx, miny, minz, maxx, maxy, maxz, left|start, right|count, isLeaf]
    const bounds = (s, e) => { let a = Infinity, b = Infinity, c = Infinity, d = -Infinity, f = -Infinity, g = -Infinity;
      for (let k = s; k < e; k++) { const o = order[k] * 9; for (let v = 0; v < 9; v += 3) { const x = P[o + v], y = P[o + v + 1], z = P[o + v + 2]; if (x < a) a = x; if (y < b) b = y; if (z < c) c = z; if (x > d) d = x; if (y > f) f = y; if (z > g) g = z; } }
      return [a, b, c, d, f, g]; };
    const build = (s, e) => {
      const bb = bounds(s, e), id = nodes.length; nodes.push(null);
      if (e - s <= leaf) { nodes[id] = [...bb, s, e - s, 1]; return id; }
      let a = Infinity, b = Infinity, c = Infinity, d = -Infinity, f = -Infinity, g = -Infinity;
      for (let k = s; k < e; k++) { const i = order[k]; if (cx[i] < a) a = cx[i]; if (cy[i] < b) b = cy[i]; if (cz[i] < c) c = cz[i]; if (cx[i] > d) d = cx[i]; if (cy[i] > f) f = cy[i]; if (cz[i] > g) g = cz[i]; }
      const ex = d - a, ey = f - b, ez = g - c, axis = ex >= ey && ex >= ez ? cx : ey >= ez ? cy : cz;
      const sorted = Array.from(order.subarray(s, e)).sort((p, q) => axis[p] - axis[q] || p - q);
      for (let k = 0; k < sorted.length; k++) order[s + k] = sorted[k];
      const m = (s + e) >> 1, L = build(s, m), R = build(m, e);
      nodes[id] = [...bb, L, R, 0]; return id;
    };
    build(0, n);
    const F = new Float64Array(nodes.length * 6), I = new Int32Array(nodes.length * 3);
    nodes.forEach((nd, i) => { for (let k = 0; k < 6; k++) F[i * 6 + k] = nd[k]; I[i * 3] = nd[6]; I[i * 3 + 1] = nd[7]; I[i * 3 + 2] = nd[8]; });
    this.F = F; this.I = I; this.order = order; this.stack = new Int32Array(128);
    this.hit = { t: 0, point: [0, 0, 0], normal: [0, 1, 0], face: [0, 1, 0], surf: '', tri: -1 };
  }
  /* the first triangle a ray meets within maxT (dir need not be unit; t is in its units). Returns this.hit or null. */
  raycast(o, d, maxT, backfaces = false) {
    const F = this.F, I = this.I, P = this.P, st = this.stack; let sp = 0, best = maxT, bestTri = -1, bu = 0, bv = 0;
    const ix = 1 / d[0], iy = 1 / d[1], iz = 1 / d[2];
    st[sp++] = 0;
    while (sp) {
      const nIdx = st[--sp], f = nIdx * 6;
      let t0 = ((ix >= 0 ? F[f] : F[f + 3]) - o[0]) * ix, t1 = ((ix >= 0 ? F[f + 3] : F[f]) - o[0]) * ix;
      const ty0 = ((iy >= 0 ? F[f + 1] : F[f + 4]) - o[1]) * iy, ty1 = ((iy >= 0 ? F[f + 4] : F[f + 1]) - o[1]) * iy;
      if (ty0 > t0) t0 = ty0; if (ty1 < t1) t1 = ty1;
      const tz0 = ((iz >= 0 ? F[f + 2] : F[f + 5]) - o[2]) * iz, tz1 = ((iz >= 0 ? F[f + 5] : F[f + 2]) - o[2]) * iz;
      if (tz0 > t0) t0 = tz0; if (tz1 < t1) t1 = tz1;
      if (t0 > t1 || t1 < 0 || t0 > best) continue;
      const k = nIdx * 3;
      if (I[k + 2]) {
        for (let q = I[k]; q < I[k] + I[k + 1]; q++) {
          const tri = this.order[q], b = tri * 9;
          const e1x = P[b + 3] - P[b], e1y = P[b + 4] - P[b + 1], e1z = P[b + 5] - P[b + 2], e2x = P[b + 6] - P[b], e2y = P[b + 7] - P[b + 1], e2z = P[b + 8] - P[b + 2];
          const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x, det = e1x * px + e1y * py + e1z * pz;
          if (backfaces ? Math.abs(det) < 1e-12 : det < 1e-12) continue;
          const inv = 1 / det, tx = o[0] - P[b], ty = o[1] - P[b + 1], tz = o[2] - P[b + 2], u = (tx * px + ty * py + tz * pz) * inv;
          if (u < -1e-7 || u > 1 + 1e-7) continue;
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
          if (v < -1e-7 || u + v > 1 + 1e-7) continue;
          const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (t > 1e-6 && t < best) { best = t; bestTri = tri; bu = u; bv = v; }
        }
      } else { st[sp++] = I[k]; st[sp++] = I[k + 1]; }
    }
    if (bestTri < 0) return null;
    const h = this.hit, b = bestTri * 9, N = this.N, w = 1 - bu - bv;
    h.t = best; h.tri = bestTri; h.surf = this.surf[bestTri];
    h.point[0] = o[0] + d[0] * best; h.point[1] = o[1] + d[1] * best; h.point[2] = o[2] + d[2] * best;
    let nx = N[b] * w + N[b + 3] * bu + N[b + 6] * bv, ny = N[b + 1] * w + N[b + 4] * bu + N[b + 7] * bv, nz = N[b + 2] * w + N[b + 5] * bu + N[b + 8] * bv;
    const l = Math.hypot(nx, ny, nz) || 1; h.normal[0] = nx / l; h.normal[1] = ny / l; h.normal[2] = nz / l;
    const e1x = P[b + 3] - P[b], e1y = P[b + 4] - P[b + 1], e1z = P[b + 5] - P[b + 2], e2x = P[b + 6] - P[b], e2y = P[b + 7] - P[b + 1], e2z = P[b + 8] - P[b + 2];
    let fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x; const fl = Math.hypot(fx, fy, fz) || 1; h.face[0] = fx / fl; h.face[1] = fy / fl; h.face[2] = fz / fl;
    return h;
  }
  /* every triangle within `r` of point c: cb(tri, closestPoint, distance, faceNormal) */
  sphere(c, r, cb) {
    const F = this.F, I = this.I, st = this.stack; let sp = 0; st[sp++] = 0;
    const q = [0, 0, 0];
    while (sp) {
      const nIdx = st[--sp], f = nIdx * 6;
      if (c[0] + r < F[f] || c[0] - r > F[f + 3] || c[1] + r < F[f + 1] || c[1] - r > F[f + 4] || c[2] + r < F[f + 2] || c[2] - r > F[f + 5]) continue;
      const k = nIdx * 3;
      if (I[k + 2]) {
        for (let s = I[k]; s < I[k] + I[k + 1]; s++) {
          const tri = this.order[s];
          closestOnTri(this.P, tri * 9, c, q);
          const dx = c[0] - q[0], dy = c[1] - q[1], dz = c[2] - q[2], d2 = dx * dx + dy * dy + dz * dz;
          if (d2 <= r * r) cb(tri, q, Math.sqrt(d2));
        }
      } else { st[sp++] = I[k]; st[sp++] = I[k + 1]; }
    }
  }
  faceNormal(tri, out) {
    const P = this.P, b = tri * 9;
    const e1x = P[b + 3] - P[b], e1y = P[b + 4] - P[b + 1], e1z = P[b + 5] - P[b + 2], e2x = P[b + 6] - P[b], e2y = P[b + 7] - P[b + 1], e2z = P[b + 8] - P[b + 2];
    const fx = e1y * e2z - e1z * e2y, fy = e1z * e2x - e1x * e2z, fz = e1x * e2y - e1y * e2x, l = Math.hypot(fx, fy, fz) || 1;
    out[0] = fx / l; out[1] = fy / l; out[2] = fz / l; return out;
  }
}

/* the closest point of triangle P[b..b+8] to p (Ericson, Real-Time Collision Detection §5.1.5) */
function closestOnTri(P, b, p, out) {
  const ax = P[b], ay = P[b + 1], az = P[b + 2], bx = P[b + 3], by = P[b + 4], bz = P[b + 5], cx = P[b + 6], cy = P[b + 7], cz = P[b + 8];
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az, apx = p[0] - ax, apy = p[1] - ay, apz = p[2] - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) { out[0] = ax; out[1] = ay; out[2] = az; return out; }
  const bpx = p[0] - bx, bpy = p[1] - by, bpz = p[2] - bz, d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) { out[0] = bx; out[1] = by; out[2] = bz; return out; }
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); out[0] = ax + abx * v; out[1] = ay + aby * v; out[2] = az + abz * v; return out; }
  const cpx = p[0] - cx, cpy = p[1] - cy, cpz = p[2] - cz, d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) { out[0] = cx; out[1] = cy; out[2] = cz; return out; }
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); out[0] = ax + acx * w; out[1] = ay + acy * w; out[2] = az + acz * w; return out; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); out[0] = bx + (cx - bx) * w; out[1] = by + (cy - by) * w; out[2] = bz + (cz - bz) * w; return out; }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  out[0] = ax + abx * v + acx * w; out[1] = ay + aby * v + acy * w; out[2] = az + abz * v + acz * w; return out;
}
