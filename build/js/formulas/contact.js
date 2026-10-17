/* THE PLANE THROUGH A BOARD'S CONTACTS — the 4-raycast board (Waxline formulas; truth in tests/formulas.mjs). A board, a car or a sled sits on
 * the plane THROUGH its wheels' contact points, not on the mean of the normals under them: over a seam it turns as each pair crosses, over
 * the wheelbase's travel, never in a frame (the mean swung halfway at the first pair: 12.5° in a step at a bank's seam).
 *   plane(c, got, up, out): c the four contacts [front-left, front-right, back-left, back-right] (arrays of 3), got which of them touch,
 *   up the board's up. Four: the diagonals' cross (fl − br) × (fr − bl); three: the plane of those three; fewer, or in a line: null. The
 *   normal is unit and turned toward `up`. */
export function plane(c, got, up, out = [0, 0, 0]) {
  const k = [0, 1, 2, 3].filter((i) => got[i]);
  let a, b;
  if (k.length === 4) { a = sub(c[0], c[3]); b = sub(c[1], c[2]); }
  else if (k.length === 3) { a = sub(c[k[1]], c[k[0]]); b = sub(c[k[2]], c[k[0]]); }
  else return null;
  out[0] = a[1] * b[2] - a[2] * b[1]; out[1] = a[2] * b[0] - a[0] * b[2]; out[2] = a[0] * b[1] - a[1] * b[0];
  const l = Math.hypot(out[0], out[1], out[2]); if (l < 1e-6) return null;
  const s = (out[0] * up[0] + out[1] * up[1] + out[2] * up[2] < 0 ? -1 : 1) / l;
  out[0] *= s; out[1] *= s; out[2] *= s; return out;
}
/* THE PLANE A BOARD STANDS ON (10-16): four contacts that are not in one plane (a crease crossed at an angle, a bowl's corner) — a rigid
 * board stands on THREE of them, the fourth wheel off its ground (its contact on or below the plane), never the plane through the diagonals,
 * which leaves two wheels in the ground (the supervisor's D: the Deck Quarter's slanted crease held a wheel 4.2 cm in the slab for ten
 * steps). Of the triples that hold it, the one nearest the board's own up — so it stays on the triple it stands on until the lifted wheel
 * touches, the moment all four are in one plane again: no jump as it rocks to the other.
 *   support(c, got, up): { n, o, lifted } — the plane's unit normal (toward up), a point on it, the index of the wheel off its ground (-1:
 *   all four in one plane, or three touching); fewer than three, or in a line: null */
export function support(c, got, up) {
  const k = [0, 1, 2, 3].filter((i) => got[i]);
  if (k.length < 3) return null;
  const tri = (a, b, d) => { const n = cross(sub(c[b], c[a]), sub(c[d], c[a])), l = Math.hypot(n[0], n[1], n[2]); if (l < 1e-9) return null;
    const s = (n[0] * up[0] + n[1] * up[1] + n[2] * up[2] < 0 ? -1 : 1) / l; return [n[0] * s, n[1] * s, n[2] * s]; };
  if (k.length === 3) { const n = tri(k[0], k[1], k[2]); return n ? { n, o: c[k[0]].slice(), lifted: -1 } : null; }
  const flat = plane(c, got, up);
  if (flat) { const o = [(c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4, (c[0][1] + c[1][1] + c[2][1] + c[3][1]) / 4, (c[0][2] + c[1][2] + c[2][2] + c[3][2]) / 4];
    if ([0, 1, 2, 3].every((i) => Math.abs(dot(sub(c[i], o), flat)) < 1e-4)) return { n: flat, o, lifted: -1 }; }   // in one plane (within 0.1 mm)
  let best = null;
  for (let skip = 0; skip < 4; skip++) {
    const t = [0, 1, 2, 3].filter((i) => i !== skip), n = tri(t[0], t[1], t[2]); if (!n) continue;
    if (dot(sub(c[skip], c[t[0]]), n) > 1e-6) continue;   // the fourth's ground above the plane: that wheel would be in it
    const u = dot(n, up); if (!best || u > best.u) best = { n, o: c[t[0]].slice(), lifted: skip, u };
  }
  return best ? { n: best.n, o: best.o, lifted: best.lifted } : null;
}
const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
