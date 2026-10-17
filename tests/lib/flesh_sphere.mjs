/* THE FLESH IN A SPHERE (V14, 10-16; the supervisor's measure where no band closes round a joint): the volume of the UNION of closed
 * surfaces inside a sphere carried by a bone's frame. Rigid parts turning about the sphere's centre map the sphere onto itself, so their
 * volume inside it is kept; a collapse or a bulge moves it, and so does a limb pushed into the chest — an overlap is counted ONCE.
 *   · the sphere is sampled on a grid of spacing h in its own frame, in vertical columns (the frame's y);
 *   · each column is one ray through the whole body, every surface it crosses kept (the game's BVH, its first hit taken again and again);
 *   · a point is inside the union when its WINDING NUMBER is at least one: each surface entered on the way up adds one, each left takes one
 *     away (a first-hit test misjudges a point inside the chest when the arm crosses above it; parity would call a point inside both NOT in).
 * columnsOf(R, h)                     the sample columns of a sphere of radius R
 * fleshIn(bvh, c, ax, cols, h, radii) its volume inside the sphere at centre c with axes ax {x, y, z} (unit, [x, y, z] each), and inside each
 *                                     of `radii` (a sphere sampled at the largest radius answers the smaller ones from the same points) */
export function columnsOf(R, h) {
  const cols = [];
  for (let x = -R + h / 2; x < R; x += h) for (let z = -R + h / 2; z < R; z += h) {
    const r2 = R * R - x * x - z * z; if (r2 <= 0) continue;
    const H = Math.sqrt(r2), ys = []; for (let y = -R + h / 2; y < R; y += h) if (Math.abs(y) <= H) ys.push(y);
    if (ys.length) cols.push({ x, z, ys });
  }
  return cols;
}

/* every surface a ray crosses, in order: { t, s } with s +1 entering (the ray against the face's outward normal), −1 leaving */
export function hitsAlong(bvh, o, d, len) {
  const out = [], p = [o[0], o[1], o[2]]; let t0 = 0;
  for (let guard = 0; guard < 256 && t0 < len; guard++) {
    const h = bvh.raycast(p, d, len - t0, true); if (!h) break;
    t0 += h.t; out.push({ t: t0, s: d[0] * h.face[0] + d[1] * h.face[1] + d[2] * h.face[2] < 0 ? 1 : -1 });
    t0 += 1e-6; p[0] = o[0] + d[0] * t0; p[1] = o[1] + d[1] * t0; p[2] = o[2] + d[2] * t0;
  }
  return out;
}

const REACH = 2.5;   // each column's ray starts this far below the sphere's centre along the frame's y (outside any body) and runs twice it
export function fleshIn(bvh, c, ax, cols, h, radii = null) {
  const radii2 = radii ? radii.map((r) => r * r) : null, n = radii ? radii.map(() => 0) : null; let all = 0;
  for (const col of cols) {
    const o = [0, 1, 2].map((k) => c[k] + ax.x[k] * col.x + ax.z[k] * col.z - ax.y[k] * REACH), hits = hitsAlong(bvh, o, ax.y, 2 * REACH);
    const q2 = col.x * col.x + col.z * col.z;
    for (const y of col.ys) {
      const t = REACH + y; let w = 0; for (const hh of hits) { if (hh.t >= t) break; w += hh.s; }
      if (w >= 1) { all++; if (radii2) { const r2 = q2 + y * y; for (let k = 0; k < radii2.length; k++) if (r2 <= radii2[k]) n[k]++; } }
    }
  }
  const cell = h * h * h;
  return { vol: all * cell, byR: n ? n.map((m) => m * cell) : null };
}

/* a closed capsule (outward triangles): a cylinder of radius r from a to b (each [x, y, z]) with a hemisphere on each end */
export function capsule(r, a, b, segs = 32, rings = 24, capRings = 10) {
  const ax = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...ax), u = ax.map((v) => v / L);
  const t1 = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], d1 = t1.map((v, k) => v - u[k] * (t1[0] * u[0] + t1[1] * u[1] + t1[2] * u[2])), l1 = Math.hypot(...d1), e1 = d1.map((v) => v / l1);
  const e2 = [u[1] * e1[2] - u[2] * e1[1], u[2] * e1[0] - u[0] * e1[2], u[0] * e1[1] - u[1] * e1[0]];
  const P = [], T = [], ring = (center, rad) => { const s = P.length; for (let k = 0; k < segs; k++) { const ang = (2 * Math.PI * k) / segs; P.push([0, 1, 2].map((q) => center[q] + rad * (Math.cos(ang) * e1[q] + Math.sin(ang) * e2[q]))); } return s; };
  const lat = []; // from the a-pole through the cylinder to the b-pole
  for (let i = 1; i <= capRings; i++) { const th = (Math.PI / 2) * (i / capRings), back = r * Math.cos(th); lat.push(ring(a.map((v, q) => v - u[q] * back), r * Math.sin(th))); }
  for (let i = 1; i < rings; i++) lat.push(ring(a.map((v, q) => v + ax[q] * (i / rings)), r));
  for (let i = capRings; i >= 1; i--) { const th = (Math.PI / 2) * (i / capRings), fwd = r * Math.cos(th); lat.push(ring(b.map((v, q) => v + u[q] * fwd), r * Math.sin(th))); }
  const pa = P.length; P.push(a.map((v, q) => v - u[q] * r)); const pb = P.length; P.push(b.map((v, q) => v + u[q] * r));
  for (let k = 0; k < segs; k++) T.push([pa, lat[0] + ((k + 1) % segs), lat[0] + k]);
  for (let i = 0; i + 1 < lat.length; i++) for (let k = 0; k < segs; k++) { const a0 = lat[i] + k, a1 = lat[i] + ((k + 1) % segs), b0 = lat[i + 1] + k, b1 = lat[i + 1] + ((k + 1) % segs); T.push([a0, a1, b1], [a0, b1, b0]); }
  const last = lat[lat.length - 1]; for (let k = 0; k < segs; k++) T.push([pb, last + k, last + ((k + 1) % segs)]);
  return { P, T };
}

/* a closed box from lo to hi (outward triangles) */
export function box(lo, hi) {
  const P = []; for (let i = 0; i < 8; i++) P.push([i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]]);
  const T = [[0, 2, 3], [0, 3, 1], [4, 5, 7], [4, 7, 6], [0, 1, 5], [0, 5, 4], [2, 6, 7], [2, 7, 3], [0, 4, 6], [0, 6, 2], [1, 3, 7], [1, 7, 5]];
  return { P, T };
}
