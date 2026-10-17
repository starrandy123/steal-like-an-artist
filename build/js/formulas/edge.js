/* A BOARD OVER AN EDGE — the high-centre (Waxline formulas; truth in tests/formulas.mjs). A coping and a ridge are LINES the park authors (a
 * rail's polyline: sim/park.js), never a probe's guess; and a sharp edge fits between any sample points of a deck — so the deck is a
 * RECTANGLE and the edge a SEGMENT, and their closest points are exact (10-16, the supervisor: "don't add more deck sample points, because a
 * sharp edge will always fit between them").
 *   deckOver(rect, a, b): the deck's underside — rect { c: its middle, u: unit along, w: unit across, n: unit out of its bottom toward the
 *     board's up, hu, hw: half its length and width } — against the edge a–b: where the edge comes up THROUGH it. The segment clipped to the
 *     rectangle's footprint in its own plane (|s| ≤ hu, |t| ≤ hw); a segment's height is linear along it, so its highest point within is at a
 *     clipped end. → { depth (its height above the underside: > 0, inside the deck), point (on the edge), s, t (where, in the deck) }, or
 *     null when the edge passes outside the footprint (lying flat across it, within a millimetre: its point the middle of that line).
 *   restOn(a, b, e, h, up): the board at rest on a pair of its wheels and an edge — the plane through the pair's two contacts a, b whose deck,
 *     h above it, touches the edge's point e: its normal n ⊥ (b − a) with n·(e − a) = h, of the two such the one nearer `up` (the board does
 *     not flip over its axle). → { n, o: a point of it }, or null when e stands within h of the pair's line (no plane through the pair clears
 *     the edge). */
export function deckOver(rect, a, b) {
  const { c, u, w, n, hu, hw } = rect;
  const loc = (p) => { const d0 = p[0] - c[0], d1 = p[1] - c[1], d2 = p[2] - c[2]; return [d0 * u[0] + d1 * u[1] + d2 * u[2], d0 * w[0] + d1 * w[1] + d2 * w[2], d0 * n[0] + d1 * n[1] + d2 * n[2]]; };
  const A = loc(a), B = loc(b), dx = B[0] - A[0], dy = B[1] - A[1];
  /* clipped to the footprint (Liang–Barsky in the rectangle's own plane) */
  let t0 = 0, t1 = 1;
  const clip = (p, q) => { if (Math.abs(p) < 1e-12) return q >= 0; const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
  if (!clip(-dx, A[0] + hu) || !clip(dx, hu - A[0]) || !clip(-dy, A[1] + hw) || !clip(dy, hw - A[1])) return null;
  /* (an edge lying flat across the rectangle — its two ends within a millimetre of one height — holds it along that line: its point is the
     line's middle, so a board held on it is turned about its own width, never banked toward one end: 10-16, a coping straight across a
     drop-in's tail was read at one end, then the other, and the board rocked side to side over it) */
  const z0 = A[2] + (B[2] - A[2]) * t0, z1 = A[2] + (B[2] - A[2]) * t1, tt = Math.abs(z0 - z1) < 1e-3 ? (t0 + t1) / 2 : z0 >= z1 ? t0 : t1;
  return { depth: Math.max(z0, z1), point: [a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt, a[2] + (b[2] - a[2]) * tt], s: A[0] + dx * tt, t: A[1] + dy * tt };
}

export function restOn(a, b, e, h, up) {
  const s = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], sl = Math.hypot(s[0], s[1], s[2]); if (sl < 1e-9) return null;
  s[0] /= sl; s[1] /= sl; s[2] /= sl;
  const r = [e[0] - a[0], e[1] - a[1], e[2] - a[2]], k = r[0] * s[0] + r[1] * s[1] + r[2] * s[2], q = [r[0] - s[0] * k, r[1] - s[1] * k, r[2] - s[2] * k], L = Math.hypot(q[0], q[1], q[2]);
  if (L < h + 1e-9) return null;
  const uq = [q[0] / L, q[1] / L, q[2] / L], m = [s[1] * uq[2] - s[2] * uq[1], s[2] * uq[0] - s[0] * uq[2], s[0] * uq[1] - s[1] * uq[0]];
  const ca = h / L, sa = Math.sqrt(1 - ca * ca);
  const n1 = [uq[0] * ca + m[0] * sa, uq[1] * ca + m[1] * sa, uq[2] * ca + m[2] * sa], n2 = [uq[0] * ca - m[0] * sa, uq[1] * ca - m[1] * sa, uq[2] * ca - m[2] * sa];
  const d1 = n1[0] * up[0] + n1[1] * up[1] + n1[2] * up[2], d2 = n2[0] * up[0] + n2[1] * up[1] + n2[2] * up[2];
  return { n: d1 >= d2 ? n1 : n2, o: a.slice() };
}
