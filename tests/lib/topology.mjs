/* A MESH'S SHAPE AS A SURFACE: its pieces (joined by edges), each piece's V − E + F, its edges on one triangle (open) and on three or more
 * (pinched). A closed manifold piece with V − E + F = 2 is a sphere's shape: no hole through it. One reader for every wall that asks
 * (face.mjs: the head; sculpt.mjs: every drawn piece). */
export function topology(m) {
  const at = new Map(); for (const v of m.idx) if (!at.has(v)) at.set(v, at.size);
  const par = Array.from({ length: at.size }, (_, i) => i), find = (i) => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; }, E = new Map();
  for (let t = 0; t < m.idx.length; t += 3) {
    const a = at.get(m.idx[t]), b = at.get(m.idx[t + 1]), c = at.get(m.idx[t + 2]);
    for (const [u, v] of [[a, b], [b, c], [c, a]]) { const k = u < v ? u * 1e7 + v : v * 1e7 + u; E.set(k, (E.get(k) || 0) + 1); par[find(u)] = find(v); }
  }
  let open = 0, pinched = 0; for (const n of E.values()) { if (n === 1) open++; else if (n > 2) pinched++; }
  const pieces = new Map(), P = (r) => pieces.get(r) || pieces.set(r, { v: 0, e: 0, f: 0 }).get(r);
  for (let i = 0; i < at.size; i++) P(find(i)).v++;
  for (const k of E.keys()) P(find(Math.floor(k / 1e7))).e++;
  for (let t = 0; t < m.idx.length; t += 3) P(find(at.get(m.idx[t]))).f++;
  const chi = [...pieces.values()].map((c) => c.v - c.e + c.f);
  /* holes: (2 − χ) / 2 summed — a genus only on a closed manifold piece; otherwise the count is said, not read as holes */
  return { tris: m.idx.length / 3, open, pinched, chi, holes: chi.reduce((s, x) => s + (2 - x) / 2, 0), whole: chi.length === 1 && chi[0] === 2 && open === 0 && pinched === 0 };
}
