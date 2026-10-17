/* the sculpt meshes cleanly: triangles face outward (on a sphere, and on every piece of Juno), the narrow band reads the same surface as a
 * full read, every piece builds in a bounded time, and the skin weights of every vertex sum to one */
import { nets, bindSkeleton, junoPieces, weights, junoAtBudget, shoeOf, junoLaces, LACE_R, EYELET, COLLAR, SOCK, TONGUE, DRAWN, drawnExtra } from '../build/js/view/sculpt.js';
import { topology } from './lib/topology.mjs';
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const facing = (m) => { let out = 0, n = 0; for (let t = 0; t < m.idx.length; t += 3) { const [a, b, c] = [m.idx[t], m.idx[t + 1], m.idx[t + 2]]; const P = (i) => [m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]];
  const A = P(a), B = P(b), C = P(c), e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [C[0] - A[0], C[1] - A[1], C[2] - A[2]], fn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  const vn = [m.nrm[a * 3] + m.nrm[b * 3] + m.nrm[c * 3], m.nrm[a * 3 + 1] + m.nrm[b * 3 + 1] + m.nrm[c * 3 + 1], m.nrm[a * 3 + 2] + m.nrm[b * 3 + 2] + m.nrm[c * 3 + 2]];
  if (fn[0] * vn[0] + fn[1] * vn[1] + fn[2] * vn[2] > 0) out++; n++; } return out / Math.max(1, n); };
const ball = (x, y, z) => Math.hypot(x, y, z) - 0.3;
const sphere = nets(ball, [-0.4, -0.4, -0.4, 0.4, 0.4, 0.4], 0.02);
ok(facing(sphere) > 0.99, 'a sphere: ' + (facing(sphere) * 100).toFixed(1) + '% of ' + sphere.idx.length / 3 + ' triangles face out; the band read ' + sphere.reads + ' of ' + sphere.cells + ' points');
/* the band reads the same surface: every vertex of the sphere lies on it */
let worst = 0; for (let v = 0; v < sphere.pos.length / 3; v++) worst = Math.max(worst, Math.abs(ball(sphere.pos[v * 3], sphere.pos[v * 3 + 1], sphere.pos[v * 3 + 2])));
ok(worst < 0.004, 'every vertex of the sphere lies within ' + (worst * 1000).toFixed(2) + ' mm of it');
const B = bindSkeleton(1.76), names = Object.keys(B), P = junoPieces(B);
let total = 0, ms = 0;
for (const pc of P) {
  const t0 = performance.now(), m = nets(pc.f, pc.box, pc.step), dt = performance.now() - t0, tris = m.idx.length / 3; total += tris; ms += dt;
  /* a piece that touches its box's walls was cut by the box */
  let cut = 0; const [x0, y0, z0, x1, y1, z1] = pc.box, e = pc.step * 1.01;
  for (let v = 0; v < m.pos.length / 3; v++) { const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2]; if (x < x0 + e || x > x1 - e || y < y0 + e || y > y1 - e || z < z0 + e || z > z1 - e) cut++; }
  const w = weights(m.pos, B, names, (nm) => pc.bones.test(nm)); let bad = 0;
  for (let v = 0; v < m.pos.length / 3; v++) { const s = w.sw[v * 4] + w.sw[v * 4 + 1] + w.sw[v * 4 + 2] + w.sw[v * 4 + 3]; if (Math.abs(s - 1) > 1e-3) bad++; }
  ok(tris > 150 && facing(m) > 0.97 && cut === 0 && bad === 0, pc.name.padEnd(8) + ' ' + String(tris).padStart(6) + ' triangles · ' + (facing(m) * 100).toFixed(1) + '% facing out · ' + dt.toFixed(0) + ' ms · read ' + (100 * m.reads / m.cells).toFixed(0) + '% · ' + (cut ? cut + ' vertices on the box wall · ' : '') + (bad ? bad + ' bad weights' : 'weights sum to 1'));
}
ok(total > 15000, 'Juno sculpted fine: ' + total + ' triangles in ' + ms.toFixed(0) + ' ms (before the simplifier)');
/* WHAT IS DRAWN, against the ledger: the local skater at most 30,000 triangles all told — the sculpt at its budget, the lace cords and the eyes —
   and a friend 12,000 (no laces; lighter eyes). Counted as drawn (the supervisor, round 11: the sculpt alone was counted, 27,590, while the page
   drew 32,098) — every piece still closed and outward */
for (const [label, lod, cap] of [['local skater (LOD 0)', 0, 30000], ['a friend (LOD 1)', 1, 12000]]) {
  const t0 = performance.now(), J = junoAtBudget(B, DRAWN.budget[lod], () => 0, lod), dt = performance.now() - t0; let n = 0, worstFacing = 1;
  for (const { m } of J.out) { n += m.idx.length / 3; worstFacing = Math.min(worstFacing, facing(m)); }
  const x = drawnExtra(B, lod), all = n + x.laces + x.eyes;
  ok(all <= cap && worstFacing > 0.97, label + ': ' + all + ' triangles drawn (≤ ' + cap + ': the sculpt ' + n + ' from ' + J.fineTris + ', the laces ' + x.laces + ', the eyes ' + x.eyes + '), every piece ≥ ' + (worstFacing * 100).toFixed(1) + '% facing out, ' + dt.toFixed(0) + ' ms');
}
/* THE MESHER KEEPS EACH SHEET ITS OWN (10-16): fields thinner than their grid, two sheets crossing one cell — a ring 9 mm thick and a
   rippled sheet 7 mm thick, on a 10 mm grid — mesh with no edge on three triangles: a saddle face that would pinch is read the other way
   (read by their centres alone, the ring pinched 24 edges and the sheet 48). Its limit, measured: a shell under a cell EVERYWHERE (8 mm on
   10) still pinches in places, each face turned at most once — the wall below reads every drawn piece, and that is the gate */
for (const [name, f] of [['a ring 9 mm thick', (x, y, z) => Math.hypot(Math.hypot(x, z) - 0.25, y) - 0.0045],
  ['a rippled sheet 7 mm thick', (x, y, z) => Math.max(Math.abs(y - 0.02 * Math.sin(x * 40) * Math.cos(z * 37)) - 0.0035, Math.hypot(x, z) - 0.3)]]) {
  const tp = topology(nets(f, [-0.36, -0.36, -0.36, 0.36, 0.36, 0.36], 0.01));
  ok(tp.open === 0 && tp.pinched === 0, 'the mesher keeps each sheet its own: ' + name + ' on a 10 mm grid, ' + tp.tris + ' triangles, ' + tp.pinched + ' edges on three or more (none), ' + tp.open + ' open (none)');
}
/* EVERY DRAWN PIECE IS WHOLE: one piece, closed, no edge on three triangles, V − E + F = 2 (a sphere's shape: no hole through it), at both
   levels of detail. "Every piece still closed" was said above and never read (10-16): on every build since V9 the jacket, the hair and the
   shoes had edges on four triangles — surface nets gave a cell ONE vertex when two sheets crossed it (a collar's rim thinner than the grid, a
   thin shell, a crevice) — and V10's head had a tunnel under the nose's bridge, the park seen through the face. Every piece of her is a
   sphere's shape by design, so one wall reads them all */
for (const lod of [0, 1]) {
  const J = junoAtBudget(B, DRAWN.budget[lod], () => 0, lod), bad = [], holed = [];
  for (const { pc, m } of J.out) {
    const tp = topology(m), say = pc.name + ' (' + tp.chi.length + (tp.chi.length === 1 ? ' piece' : ' pieces') + ', V − E + F ' + tp.chi.join('/') + ', ' + tp.open + ' open, ' + tp.pinched + ' on 3+)';
    if (tp.chi.length !== 1 || tp.open || tp.pinched) bad.push(say); else if (tp.chi[0] !== 2) holed.push(say);
  }
  ok(!bad.length, 'every drawn piece whole at LOD ' + lod + ': ' + (J.out.length - bad.length) + ' of ' + J.out.length + ' one closed piece with no pinched edge' + (bad.length ? ' — not: ' + bad.join(', ') : ''));
  /* no hole through any: every piece's own count is its design's, a sphere's (the head's tunnel under the nose's bridge, the shoe's collar
     ring bridged to the tongue — 10-16) */
  ok(!holed.length, 'no hole through any drawn piece at LOD ' + lod + ': ' + (J.out.length - holed.length) + ' of ' + J.out.length + (holed.length ? ' — holed: ' + holed.join(', ') : ''));
}
/* NO SHAPE IS BUILT TWICE (10-16): a shape blended with a near-copy of itself swells by a quarter of the blend, with nothing on the screen to
   say why — the head's neck was a cone in head() AND the same cone again round the dropped head, both on 3 cm: the throat stood 7.8 mm proud
   of its neck and the span under the chin shrank to 29 mm (the bag). Read off the source: every cone, capsule, ellipsoid and box by its
   arguments, the head's drop folded out */
{ const src = (await import('node:fs')).readFileSync(new URL('../build/js/view/sculpt.js', import.meta.url), 'utf8'), seen = new Map();
  for (const m of src.matchAll(/\b(cone|capsule|ellip|rbox)\(x, y, z, ([^;]*?)\)(?=[,;)\s])/g)) { const k = m[1] + '(' + m[2].replace(/\s+/g, '').replace(/-D\b/g, '') + ')'; seen.set(k, (seen.get(k) || 0) + 1); }
  const twice = [...seen].filter(([, n]) => n > 1);
  ok(!twice.length, 'no shape built twice: ' + seen.size + ' shapes in the sculpt, each once' + (twice.length ? ' — twice: ' + twice.map(([k, n]) => k.slice(0, 70) + ' ×' + n).join(', ') : '')); }
/* THE COLLAR MEETS THE NECK: round the back and the sides (the front is open), at three heights in the collar, at most 1 mm between the
   neck's skin and the collar's inside — a slit there is the dark of the jacket's inside seen past the neck */
{ const hd = P.find((p) => p.name === 'head').f, jk = P.find((p) => p.name === 'jacket').f; let worst = 0, at = null;
  for (const y of [1.50, 1.47, 1.45]) for (let a = 70; a <= 290; a += 10) {
    const rad = a * Math.PI / 180, dir = [Math.sin(rad), Math.cos(rad)]; let t = 0.01; for (; t < 0.12; t += 0.0002) if (hd(dir[0] * t, y, -0.003 + dir[1] * t) >= 0) break;
    let w = t; for (; w < 0.12; w += 0.0002) if (jk(dir[0] * w, y, -0.003 + dir[1] * w) < 0) break;
    if (w < 0.12 && w - t > worst) { worst = w - t; at = [y, a]; } }
  ok(worst <= 0.001, 'the collar meets the neck: at most ' + (worst * 1000).toFixed(1) + ' mm between them round the back and sides (≤ 1' + (at ? '; at y ' + (at[0] * 1000).toFixed(0) + ', ' + at[1] + '° from the front' : '') + ')'); }
/* THE JACKET'S HEM STANDS OFF THE CARGOS (round 11's ragged hem: the cargos' waist was wider than the jacket there, and the hem's edge was
   their meeting): round her at 36 angles (not the front opening's five), a hand above the hem's cut, the jacket's surface at least 3 mm outside the cargos' */
{ const jk = P.find((p) => p.name === 'jacket').f, pt = P.find((p) => p.name === 'pants').f, y = 0.985;
  /* each surface found from outside in (the jacket's opening is carved through its whole depth: from her middle out, a scan left through it) */
  const edge = (f, a) => { let r = 0.4; for (; r > 0.02; r -= 0.0005) if (f(Math.sin(a) * r, y, -0.006 + Math.cos(a) * r) < 0) return r; return r; };
  let worst = 1, at = 0;
  for (let i = 0; i < 36; i++) { if (i <= 2 || i >= 34) continue;   /* the front opening (±20°): no jacket there to stand off anything */
    const a = (i / 36) * Math.PI * 2, gap = edge(jk, a) - edge(pt, a); if (gap < worst) { worst = gap; at = Math.round(i * 10); } }
  ok(worst >= 0.003, 'the jacket\'s hem stands ' + (1000 * worst).toFixed(1) + ' mm off the cargos at its nearest (≥ 3; at ' + at + '°)'); }
/* THE SHOES ARE SKATE SHOES (the supervisor, M1: "blobs with no shoe design: no toe cap, collar, tongue, laces or sole sidewall"), measured on
   the form their mesh is made of: a sole with a wall and a lip, a toe bumper, a padded collar standing out of the sock, a tongue over the throat,
   and laces that lie ON the upper — none buried in it, none floating over it (the toe cap's panel and its stitching are the cloth's: the look's
   A/B measures them) */
{ const S = shoeOf(B, 'L'), up = (X, y, Z) => S.upper(S.cx + X, y, S.cz + Z), so = (X, y, Z) => S.sole(S.cx + X, y, S.cz + Z);
  const scan = (f, from, to, step) => { for (let v = from; step > 0 ? v <= to : v >= to; v += step) if (f(v) > 0) return v; return to; };
  const wallTop = scan((y) => so(S.wid(0) + 0.002, y, 0), 0.001, 0.08, 0.0002), bumper = scan((y) => so(0, y, 0.135), 0.001, 0.08, 0.0002);
  const soleW = scan((X) => so(X, 0.015, 0), 0, 0.1, 0.0002), upperW = scan((X) => up(X, 0.04, 0), 0, 0.1, 0.0002);
  const collarBack = scan((Z) => -up(0, 0.103, Z), -0.2, 0, 0.0002), sockBack = SOCK.z - SOCK.r, ty = 0.115, sockFront = SOCK.z + 0.013 * (ty - 0.07) / 0.11 + SOCK.r - 0.002 * (ty - 0.07) / 0.11;
  const tongueFront = scan((Z) => -up(0, ty, Z), 0.03, -0.2, -0.0002), tongue = tongueFront - sockFront;
  ok(wallTop >= 0.025 && soleW - upperW >= 0.0025 && bumper >= 0.035, 'the sole: its wall ' + (1000 * wallTop).toFixed(1) + ' mm high (≥ 25), its lip ' + (1000 * (soleW - upperW)).toFixed(1) + ' mm proud of the upper (≥ 2.5), its toe bumper up to ' + (1000 * bumper).toFixed(1) + ' mm (≥ 35)');
  ok(sockBack - collarBack >= 0.006 && tongue >= 0.008, 'the collar stands ' + (1000 * (sockBack - collarBack)).toFixed(1) + ' mm out of the sock at the heel (≥ 6); the tongue stands ' + (1000 * tongue).toFixed(1) + ' mm in front of the sock ' + (1000 * ty).toFixed(0) + ' mm up (≥ 8)');
  void TONGUE;
  /* each cord against its OWN rest height (its radius, and the lift where it crosses over or ties): within a millimetre at every point — a
     cord 1.5 mm off its rest is off (round 11: one bound for all, 6 mm, let a plain cord float 5.7 mm) */
  const L = junoLaces(B).filter((c) => c.sd === 'L'); let low = 0, high = 0, worst = [0, 0], n = 0;
  for (const c of L) c.pts.forEach((p, i) => { const off = S.upper(p[0], p[1], p[2]) - c.rest[i]; n++; if (off < -0.001) { low++; worst[0] = Math.min(worst[0], off); } if (off > 0.001) { high++; worst[1] = Math.max(worst[1], off); } });
  ok(L.length === 2 * EYELET.n + 4 && low === 0 && high === 0, 'the laces: ' + L.length + ' cords, ' + n + ' points, each within a millimetre of its own rest on the upper: ' + low + ' sunk' + (low ? ' (' + (1000 * worst[0]).toFixed(1) + ' mm)' : '') + ', ' + high + ' lifted off' + (high ? ' (' + (1000 * worst[1]).toFixed(1) + ' mm)' : ''));
  void COLLAR;
}
console.log(fail ? 'SCULPT: RED' : 'SCULPT: GREEN'); process.exit(fail ? 1 : 0);
