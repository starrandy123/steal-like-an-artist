/* THE FACE, in Node (the owner, 10-16: "we need a better face design please. The guy is flat" · "The face is lob sided too lol"):
 * 1. THE DRAWN HEAD IS ITS OWN MIRROR: every vertex of the head as the game draws it (both levels of detail), mirrored across the midline, its
 *    distance to the head's surface (point to triangle). Worst within 0.1 mm (it was 3.4 mm: the grid off the midline).
 * 2. THE FORMS, measured on the head's field (FACE, sculpt space; each a scan along a line until the skin): a man's face has them — the nose
 *    stands out from the cheeks, a bridge between the eyes, lips proud of the skin above and below them, a chin, a brow ridge over the eyes, a
 *    jaw with its angles, cheekbones, ears that stand off the head; and each eye set back in a socket centred on it.
 * The page's walls (tests/drive/face.mjs) read the rest: the eye line, the eyes' look, the pairs on the head bone, the face on the head. */
import { DRAWN, FACE, lidEdge } from '../build/js/view/sculpt.js';
import { topology } from './lib/topology.mjs';
/* --field <sculpt.js>: read ANOTHER tree's head (its field and its drawn mesh) against this face's places and bars — V9's, to show it red */
const fi = process.argv.indexOf('--field'), S = await import(fi > 0 ? new URL('file://' + process.argv[fi + 1]).href : '../build/js/view/sculpt.js');
const { bindSkeleton, junoPieces, junoAtBudget, HEAD_DROP } = S;
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const B = bindSkeleton(1.76), head = junoPieces(B).find((p) => p.name === 'head'), F = (x, y, z) => head.f(x, y - HEAD_DROP, z);   // the field in sculpt space
const mm = (v) => (v * 1000).toFixed(1);
/* 1. the mirror of the drawn head */
function ptTri(p, a, b, c) {
  const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], at = (q) => { const d = sub(p, q); return dot(d, d); };
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a), d1 = dot(ab, ap), d2 = dot(ac, ap); if (d1 <= 0 && d2 <= 0) return at(a);
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp); if (d3 >= 0 && d4 <= d3) return at(b);
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return at([a[0] + ab[0] * v, a[1] + ab[1] * v, a[2] + ab[2] * v]); }
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp); if (d6 >= 0 && d5 <= d6) return at(c);
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return at([a[0] + ac[0] * w, a[1] + ac[1] * w, a[2] + ac[2] * w]); }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return at([b[0] + (c[0] - b[0]) * w, b[1] + (c[1] - b[1]) * w, b[2] + (c[2] - b[2]) * w]); }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den; return at([a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w]);
}
function mirrorError(m) {
  const V = (i) => [m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]], cell = 0.01, grid = new Map(), nt = m.idx.length / 3;
  for (let t = 0; t < nt; t++) { const a = V(m.idx[t * 3]), b = V(m.idx[t * 3 + 1]), c = V(m.idx[t * 3 + 2]); const lo = [0, 1, 2].map((k) => Math.floor(Math.min(a[k], b[k], c[k]) / cell)), hi = [0, 1, 2].map((k) => Math.floor(Math.max(a[k], b[k], c[k]) / cell));
    for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) { const key = i + ',' + j + ',' + k; (grid.get(key) || grid.set(key, []).get(key)).push(t); } }
  let worst = 0, at = null;
  for (let v = 0; v < m.pos.length / 3; v++) {
    const p = V(v); p[0] = -p[0]; let best = Infinity; const c0 = p.map((x) => Math.floor(x / cell));
    for (let r = 0; r <= 2 && best === Infinity; r++) for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) for (const t of grid.get((c0[0] + i) + ',' + (c0[1] + j) + ',' + (c0[2] + k)) || []) best = Math.min(best, ptTri(p, V(m.idx[t * 3]), V(m.idx[t * 3 + 1]), V(m.idx[t * 3 + 2])));
    if (Math.sqrt(best) > worst) { worst = Math.sqrt(best); at = V(v); }
  }
  return { worst, at, n: m.pos.length / 3 };
}
/* CLOSED: the drawn head a surface with no edge on one triangle only (none on three). The mirror reads symmetry, not closure: the midline left
   to the simplifier cracked the head open down its back, 516 open edges at LOD 0 and 272 at LOD 1 with the halves 6–9 mm apart, and the mirror
   still read 0.0 mm — a crack shared by both halves is its own mirror (the supervisor's plant, round 15) */
const edgesOf = (m) => { const E = new Map(); for (let t = 0; t < m.idx.length; t += 3) for (const [a, b] of [[m.idx[t], m.idx[t + 1]], [m.idx[t + 1], m.idx[t + 2]], [m.idx[t + 2], m.idx[t]]]) { const k = a < b ? a * 1e7 + b : b * 1e7 + a; E.set(k, (E.get(k) || 0) + 1); }
  let open = 0, over = 0; for (const n of E.values()) { if (n === 1) open++; else if (n > 2) over++; } return { open, over, tris: m.idx.length / 3 }; };
/* NO HOLE THROUGH IT: the drawn head one piece with a sphere's topology — V − E + F = 2 for each piece (genus 0). Closed is not whole: V10's
   nose's bridge stood off the face on the nose's tight join, a tunnel under it from the bridge's side to the cheek, and in profile the park
   showed through the face (round 17's shots, read as a nostril) — closed, its own mirror, and a torus. Every tunnel anywhere on the head
   counts, and every loose piece */
for (const lod of [0, 1]) {
  const J = junoAtBudget(B, (S.DRAWN || DRAWN).budget[lod], () => 0, lod), m = J.out.find((o) => o.pc.name === 'head').m, e = mirrorError(m), c = edgesOf(m);
  ok(c.open === 0 && c.over === 0, 'the drawn head (LOD ' + lod + ', ' + c.tris + ' triangles) is closed: ' + c.open + ' open edges (none), ' + c.over + ' edges on three or more triangles (none)');
  const tp = topology(m);
  ok(tp.chi.length === 1 && tp.holes === 0, 'the drawn head (LOD ' + lod + ') is one piece with no hole through it: ' + tp.chi.length + (tp.chi.length === 1 ? ' piece, ' : ' pieces, ') + tp.holes + (tp.holes === 1 ? ' hole' : ' holes') + ' (one, none; V − E + F = ' + tp.chi.join(', ') + ')');
  ok(e.worst <= 0.0001, 'the drawn head (LOD ' + lod + ', ' + e.n + ' vertices) is its own mirror: at worst ' + mm(e.worst) + ' mm off (≤ 0.1' + (e.worst > 0.0001 ? '; at x ' + mm(e.at[0]) + ', y ' + mm(e.at[1] + HEAD_DROP) + ', z ' + mm(e.at[2]) : '') + ')');
}
/* 2. the forms: where the skin is along a line (the first point inside the field, scanning from outside) */
const skin = (from, dir, len = 0.08) => { for (let t = 0; t <= len; t += 0.0002) { const p = from.map((v, k) => v + dir[k] * t); if (F(p[0], p[1], p[2]) < 0) return p; } return null; };
const front = (x, y) => { const p = skin([x, y, 0.2], [0, 0, -1], 0.2); return p ? p[2] : -1; };   // the skin's z, scanning back from in front
const side = (y, z) => { const p = skin([0.2, y, z], [-1, 0, 0], 0.2); return p ? p[0] : -1; };   // the skin's x, scanning in from the side
const E = FACE.eye.c, r = FACE.eye.r, N = FACE.nose, M = FACE.mouth, RIM_TURN = 25, CREASE_MAX = 30;   // °/mm. RIM_TURN: a centimetre's blend of the skin's turn into the socket (~60°) is ~6°/mm on the mean; V10's 4 mm read 57.5, V9's 123. CREASE_MAX: V10's head read 58 (the bridge stood off the face on a tight join: the crease is the edge of the hole behind it — the topology wall above), V9's 35; the face's own curves turn under ~28
const noseOut = front(0, N.tip[1]) - front(0.03, N.tip[1]);
ok(noseOut >= 0.02, 'the nose stands ' + mm(noseOut) + ' mm out of the cheeks at its tip (≥ 20)');
const bridge = front(0, 1.655) - front(0.017, 1.655);
ok(bridge >= 0.005, 'a bridge between the eyes: ' + mm(bridge) + ' mm over the inner corners of the sockets (≥ 5)');
/* the lips against the deepest skin beside them: under the nose (between the upper lip and the nose's underside) and the fold under the lower */
const deepest = (y0, y1) => { let best = 1, at = y0; for (let y = y0; y <= y1; y += 0.0004) { const z = front(0, y); if (z < best) { best = z; at = y; } } return [best, at]; };
const [sub, subY] = deepest(M.upper[1] + 0.004, N.columella[1] - 0.002), [fold, foldY] = deepest(FACE.chin.c[1] + 0.006, M.lower[1] - 0.004);
const upLip = front(0, M.upper[1]) - sub, loLip = front(0, M.lower[1]) - fold, chin = front(0, FACE.chin.c[1]) - fold;
ok(upLip >= 0.0015 && loLip >= 0.003 && chin >= 0.002 && N.columella[1] - subY >= 0.004, 'the lips stand proud: the upper ' + mm(upLip) + ' mm over the dip under the nose (≥ 1.5; the dip at ' + mm(N.columella[1] - subY) + ' mm under the columella, ≥ 4), the lower ' + mm(loLip) + ' mm over the fold under it (≥ 3); the chin ' + mm(chin) + ' mm over that fold (≥ 2)');
const ridge = front(E[0], 1.679) - (E[2] + r);
ok(ridge >= 0.005, 'the brow ridge stands ' + mm(ridge) + ' mm in front of the eyeball under it (≥ 5: deep-set eyes)');
const jaw = side(1.565, 0.0), cheekbone = side(1.64, 0.035);
ok(jaw >= 0.06 && cheekbone >= 0.07, 'a man\'s jaw and cheekbones: the jaw ' + mm(2 * jaw) + ' mm across its angles (≥ 120), the cheekbones ' + mm(2 * cheekbone) + ' mm (≥ 140)');
/* the ear: how far its rim stands off the skull, at its back edge (against the skull's own surface there, FACE.skull) */
const ey = FACE.ear.c[1], ez = FACE.ear.c[2] - 0.016, earBack = side(ey, ez), K = FACE.skull, skullAt = K.r[0] * Math.sqrt(Math.max(0, 1 - ((ey - K.c[1]) / K.r[1]) ** 2 - ((ez - K.c[2]) / K.r[2]) ** 2));
ok(earBack - skullAt >= 0.007, 'the ears stand off the head: the rim ' + mm(earBack - skullAt) + ' mm out from the skull at its back edge (≥ 7)');
/* each eye sits in its socket: no skin over the part of the eyeball the lids leave open (the ball's surface half a millimetre out, across the
   opening, turned as the opening is) — a socket off its eye closes over one side of it */
const D2R = Math.PI / 180, out = FACE.lid.out * D2R; let covered = 0, n = 0;
for (let az = -60; az <= 66; az += 3) { const [up, lo] = lidEdge(az); for (let el = lo + 2; el <= up - 2; el += 2) {
  const a = az * D2R + out, e = el * D2R, p = [E[0] + (r + 0.0005) * Math.cos(e) * Math.sin(a), E[1] + (r + 0.0005) * Math.sin(e), E[2] + (r + 0.0005) * Math.cos(e) * Math.cos(a)];
  n++; if (F(p[0], p[1], p[2]) < 0) covered++; } }
/* and the other side: the skin closes over the lids' outer edges (their last ring, round the whole socket) — a socket off its eye opens a gap
   there, the lid's edge and the dark behind it in view */
const prof = [6.6, 6.8].map((v) => v / 1000); let open = 0, m2 = 0;
for (let az = -100; az <= 100; az += 4) { const [up, lo] = lidEdge(az); for (const [el, rho] of [[Math.min(85, up + 66), r + prof[1]], [Math.max(-85, lo - 62), r + prof[0]]]) {
  const a = az * D2R + out, e = el * D2R, p = [E[0] + rho * Math.cos(e) * Math.sin(a), E[1] + rho * Math.sin(e), E[2] + rho * Math.cos(e) * Math.cos(a)];
  m2++; if (F(p[0], p[1], p[2]) > 0) open++; } }
ok(n > 100 && covered === 0 && open === 0, 'each eye sits in its socket: of ' + n + ' points over the open part of the eyeball, ' + covered + ' under the skin (none); of ' + m2 + ' points on the lids\' outer edges, ' + open + ' out in the open (none)');
/* the lids' opening: an almond, taller toward the nose */
const [u0, l0] = lidEdge(0), [ui, li] = lidEdge(-30), [uo, lo2] = lidEdge(40);
ok(u0 - l0 >= 25 && ui - li > uo - lo2, 'the lids open ' + (u0 - l0).toFixed(0) + '° at the middle (≥ 25), more toward the nose (' + (ui - li).toFixed(0) + '°) than toward the ear (' + (uo - lo2).toFixed(0) + '°)');
/* THE SOCKET BLENDS INTO THE BROW AND THE CHEEK (the supervisor's V11 list, 10-16: "a hard oval rim round each eye, the mask, in front and 3/4 —
   blend the socket into the brow and cheek over about a centimetre"): along eight rays from the eye out through the brow, the corners and the
   cheek, the skin as seen from in front every half millimetre, and how fast its facing turns crossing the rim — the sharpest turn, in degrees
   a millimetre, from 6 mm out to 26 and never as far in as the nose's flank */
const nrmAt = (p) => { const e = 2e-4, g = [F(p[0] + e, p[1], p[2]) - F(p[0] - e, p[1], p[2]), F(p[0], p[1] + e, p[2]) - F(p[0], p[1] - e, p[2]), F(p[0], p[1], p[2] + e) - F(p[0], p[1], p[2] - e)], l = Math.hypot(...g) || 1; return g.map((v) => v / l); };
let rimTurn = 0, rimAt = '';
for (let k = 0; k < 8; k++) {
  const th = k * Math.PI / 4; let prev = null;
  for (let rr = 0.006; rr <= 0.026; rr += 0.0005) {
    const x = E[0] + rr * Math.cos(th), y = E[1] + rr * Math.sin(th); if (x < 0.018) break;   // (not as far in as the nose: its flank is its own form)
    const p = skin([x, y, 0.2], [0, 0, -1], 0.2); if (!p) { prev = null; continue; }
    const n = nrmAt(p);
    if (prev) { const turn = Math.acos(Math.max(-1, Math.min(1, n[0] * prev[0] + n[1] * prev[1] + n[2] * prev[2]))) * 180 / Math.PI / 0.5; if (turn > rimTurn) { rimTurn = turn; rimAt = ['out', 'up and out', 'up', 'up and in', 'in', 'down and in', 'down', 'down and out'][k] + ', ' + (rr * 1000).toFixed(1) + ' mm from the eye'; } }
    prev = n;
  }
}
ok(rimTurn <= RIM_TURN, 'the socket blends into the brow and the cheek: the skin turns at most ' + rimTurn.toFixed(1) + '°/mm crossing the rim (≤ ' + RIM_TURN + '; ' + rimAt + ')');
/* THE MIDLINE IS SMOOTH: across it, between the brows and down the nose's root (y 1620–1720), the skin's profile bends at x = 0 as it bends
   beside it — no V where a pair meets its mirror (read by |x| itself, the brow ridges cut a groove between the brows: its slope turned 0.55 mm
   a mm² at the midline against −0.05 beside, 24°/mm — V11) */
{
  /* the skin to a micrometre: the march's 0.2 mm step, refined by halving (at the march's own step the bends read its quantum: 0.4 at the
     nose's tip, which is smooth) */
  const zf = (x, y) => { const p = skin([x, y, 0.2], [0, 0, -1], 0.2); if (!p) return null; let hi = p[2] + 0.0002, lo = p[2]; for (let k = 0; k < 18; k++) { const m = (hi + lo) / 2; if (F(x, y, m) < 0) lo = m; else hi = m; } return lo; };
  let kink = 0, kinkAt = '';
  for (let y = 1.62; y <= 1.72; y += 0.002) {
    const z = [-0.002, -0.001, 0, 0.001, 0.002].map((x) => zf(x, y)); if (z.some((v) => v == null)) continue;
    const t0 = (z[3] - z[2]) - (z[2] - z[1]), t1 = ((z[4] - z[3]) - (z[3] - z[2]) + (z[1] - z[0]) - (z[2] - z[1])) / 2, k = Math.abs(t0 - t1) * 1000;
    if (k > kink) { kink = k; kinkAt = (y * 1000).toFixed(0); }
  }
  ok(kink <= 0.3, 'the midline is smooth: across it the skin bends at most ' + kink.toFixed(2) + ' mm a mm² more than beside it (≤ 0.3 — a V reads 0.5 and more, the face\'s own curves under 0.2; at y ' + kinkAt + ' mm)');
}
/* NO HARD CREASE WHERE THE FORMS MEET (the supervisor's V11 list: a line across the nose's base, the fold cut like a knife, a shelf at the brow
   ridge's outer end — "blend the union"): the skin seen from in front and from three-quarters, every half millimetre, found to a micrometre,
   and how fast its facing turns between neighbours — the sharpest, in degrees a millimetre, away from what is meant to be sharp: the lips and
   the mouth's corners, the eyes' openings, the nose's underside, the ears */
{
  /* sphere-traced (the field is a distance near enough: steps of 0.8 of it), then halved to a micrometre — marched in 0.2 mm steps it took 143 s */
  const hitAt = (o, d) => { let t = 0, f = 1; for (let k = 0; k < 300 && t < 0.4; k++) { f = F(o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t); if (f < 0) break; t += Math.max(f * 0.8, 0.0002); } if (f >= 0) return null; let lo = Math.max(0, t - 0.0004), hi = t; for (let k = 0; k < 16; k++) { const m = (lo + hi) / 2; if (F(o[0] + d[0] * m, o[1] + d[1] * m, o[2] + d[2] * m) < 0) hi = m; else lo = m; } return [o[0] + d[0] * hi, o[1] + d[1] * hi, o[2] + d[2] * hi]; };
  const mouthY = (M.upper[1] + M.lower[1]) / 2, sharp = (p) => (Math.abs(p[0]) < 0.034 && Math.abs(p[1] - mouthY) < 0.011) || Math.hypot(Math.abs(p[0]) - E[0], p[1] - E[1]) < 0.012 || (Math.abs(p[0]) < 0.02 && p[1] < N.tip[1] - 0.002 && p[1] > N.columella[1] - 0.008) || Math.abs(p[0]) > 0.068;
  let worst = 0, worstAt = '';
  for (const [view, az] of [['front', 0], ['three-quarter', 45]]) {
    const a3 = az * Math.PI / 180, dir = [-Math.sin(a3), 0, -Math.cos(a3)], side = [Math.cos(a3), 0, -Math.sin(a3)], hs = 0.0005, grid = [];
    for (let j = 0; j <= 300; j++) { const row = []; for (let i = 0; i <= 260; i++) { const uu = -0.065 + i * hs, vv = 1.56 + j * hs, o = [side[0] * uu - dir[0] * 0.3, vv, side[2] * uu - dir[2] * 0.3 + 0.05]; const p = hitAt(o, dir); row.push(p ? { p, n: nrmAt(p) } : null); } grid.push(row); }
    for (let j = 0; j < 300; j++) for (let i = 0; i < 260; i++) {
      const c = grid[j][i]; if (!c || sharp(c.p)) continue;
      for (const q of [grid[j][i + 1], grid[j + 1][i]]) { if (!q || sharp(q.p)) continue; const dist = Math.hypot(q.p[0] - c.p[0], q.p[1] - c.p[1], q.p[2] - c.p[2]); if (dist > 0.003) continue;
        const t = Math.acos(Math.max(-1, Math.min(1, c.n[0] * q.n[0] + c.n[1] * q.n[1] + c.n[2] * q.n[2]))) * 180 / Math.PI / (dist * 1000);
        if (t > worst) { worst = t; worstAt = view + ', at x ' + (c.p[0] * 1000).toFixed(0) + ', y ' + (c.p[1] * 1000).toFixed(0) + ', z ' + (c.p[2] * 1000).toFixed(0) + ' mm'; } }
    }
  }
  ok(worst <= CREASE_MAX, 'no hard crease where the forms meet: the skin turns at most ' + worst.toFixed(1) + '°/mm away from the lips, the eyes, the nose\'s underside and the ears (≤ ' + CREASE_MAX + '; ' + worstAt + ')');
}
/* THE EAR IS AN EAR (the supervisor's V11 list: "the ear is a knob — give it a rim, a bowl and a lobe"): in the ear's own frame (sculpt.js: u
   forward, v up, w out of the head), the skin's height out of the ear's plane, found by marching in along −w: up and back from the ear's
   middle the HELIX stands proud of the groove inside it; the CONCHA sinks below the ridges round it; the LOBE hangs below the bowl */
{
const EA = FACE.ear, et2 = EA.turn * Math.PI / 180, ec2 = Math.cos(et2), es2 = Math.sin(et2);
const earW = (u, v) => { for (let w = 0.03; w > -0.012; w -= 0.0002) { const x = EA.c[0] + u * -es2 + w * ec2, z = EA.c[2] + u * ec2 + w * es2; if (F(x, EA.c[1] + v, z) < 0) return w; } return null; };
let helixPeak = -1, groove = 1, helixAt = '';
const prof = []; for (let rr = 0.0; rr <= 0.034; rr += 0.0005) { const a2 = 125 * Math.PI / 180, w = earW(rr * Math.cos(a2), rr * Math.sin(a2)); prof.push([rr, w]); }
/* the helix: the highest point in the outer third; the groove: the lowest between the middle and it */
for (const [rr, w] of prof) if (w != null && rr > 0.022 && w > helixPeak) { helixPeak = w; helixAt = (rr * 1000).toFixed(1); }
for (const [rr, w] of prof) if (w != null && rr > 0.012 && rr < +helixAt / 1000 - 0.002 && w < groove) groove = w;
const rimStands = (helixPeak - groove) * 1000;
let ridge = -1; for (let v = -0.012; v <= 0.004; v += 0.001) for (let u = -0.012; u <= 0.008; u += 0.001) { const d = Math.hypot((u - 0.002) / 0.0075, (v + 0.004) / 0.010); if (d > 1.15 && d < 1.6) { const w = earW(u, v); if (w != null && w > ridge) ridge = w; } }
const bowl = earW(0.002, -0.004), bowlDepth = bowl == null ? 0 : (ridge - bowl) * 1000;
let lobeLow = 0; for (let v = -0.02; v >= -0.045; v -= 0.0005) { const w = earW(-0.004, v); if (w != null && w > -0.002) lobeLow = v; else break; }
const lobeBelow = (-0.004 - 0.010 - lobeLow) * 1000;   // how far the ear reaches below the bowl's lower edge (v −14 mm)
const lobeW = earW(-0.004, -0.0245), lobeOut = lobeW == null ? 0 : lobeW * 1000;   // the lobe's flesh at its middle: a plate there is ~2 mm
ok(rimStands >= 1.5 && bowlDepth >= 3.5 && lobeBelow >= 12 && lobeOut >= 4, 'the ear is an ear: the helix stands ' + rimStands.toFixed(1) + ' mm proud of the groove inside it (≥ 1.5; at ' + helixAt + ' mm up and back), the bowl sinks ' + bowlDepth.toFixed(1) + ' mm below the ridges round it (≥ 3.5; V10 2.8), the lobe hangs ' + lobeBelow.toFixed(1) + ' mm below the bowl (≥ 12) and stands ' + lobeOut.toFixed(1) + ' mm out (≥ 4)');
}
console.log('FACE: ' + (fail ? 'RED · ' + fail : 'GREEN') + ' (Node: the mirror and the forms)');
process.exit(fail ? 1 : 0);
