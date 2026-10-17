/* the park the sim rides is the park the plan drew: a ray straight down at known points lands at the height the data says */
import { buildPark } from '../build/js/sim/park.js';
import { BVH } from '../build/js/sim/bvh.js';
import { PARK as PARK_DATA } from '../build/js/config.js';
const PARK_ELEMENTS = PARK_DATA.elements.length;
const t0 = performance.now(), park = buildPark(), bvh = new BVH(park.col), ms = performance.now() - t0;
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const down = (x, z) => { const h = bvh.raycast([x, 10, z], [0, -1, 0], 30); return h ? +h.point[1].toFixed(3) : null; };
const tris = Object.values(park.geo).reduce((s, g) => s + g.idx.length / 3, 0);
console.log('built in ' + ms.toFixed(0) + ' ms · ' + bvh.count + ' collision triangles · ' + tris + ' drawn · ' + park.rails.length + ' grindable lines · ' + park.lips.length + ' lips' + (park.problems.length ? ' · PROBLEMS ' + park.problems.join('; ') : ''));
const cases = [['the plaza', 30, 10, 0], ['the terrace', 40, 40, 0.8], ['the West Deck', 21.5, 38, 2.63], ['the East Deck', 60.5, 16, 1.83], ['the Lawn Deck', 0.7, 24, 1.22],
  ['the Basin floor', 9, 10, -1.83], ['the Main Ledge top', 34, 23.3, 0.36], ['the Sun Ledge top', 37, 35.7, 1.22], ['the Pad', 23, 23.4, 0.2], ['the Block top', 44, 8.5, 0.6],
  ['the Red Curb', 40, 2.8, 0.15], ['the Planter rim', 44.08, 25.2, 0.45], ['the Bench seat', 34, 16.8, 0.45], ['the Terrace Block', 56.5, 38.6, 1.25],
  ['the Five, 2nd tread', 53, 31.5, 0.48], ['the Shelf, flat top', 49.2, 32.5, 1.25], ['the Sun Bank half way', 43.5, 31.142, 0.4], ['the Slant Ledge', 46, 16.7, 0.4],
  ['the lawn outside', -10, -10, 0]];
for (const [name, x, z, y] of cases) { const got = down(x, z); ok(got != null && Math.abs(got - y) < 0.02, name + ' at (' + x + ', ' + z + '): ' + got + ' (wants ' + y + ')'); }
/* the Deck Quarter: the transition at half its run follows the circle (base 0.8, h 1.83, r 2.74) */
const r = 2.74, h = 1.83, lip = Math.acos((r - h) / r), run = r * Math.sin(lip), s = run / 2, yWant = 0.8 + r - Math.sqrt(r * r - (run - s) ** 2);
const got = down(23 + s, 38); ok(got != null && Math.abs(got - yWant) < 0.03, 'the Deck Quarter half way up its run: ' + got + ' (the circle says ' + yWant.toFixed(3) + ')');
/* a smooth normal: on the quarter the normal's tilt follows the curve */
const hq = bvh.raycast([23 + s, 10, 38], [0, -1, 0], 30), tilt = Math.acos(hq.normal[1]) * 180 / Math.PI, want = Math.asin((run - s) / r) * 180 / Math.PI;
ok(Math.abs(tilt - want) < 2.0, 'the normal there tilts ' + tilt.toFixed(1) + '° (the circle: ' + want.toFixed(1) + '°)');
const named = new Set(park.rails.map((x) => x.group));
for (const g of ['fiveRail', 'shelf', 'mainLedge', 'basin', 'boxRail', 'redCurb', 'sunLedge', 'terraceBar', 'slantLedge', 'lowBar', 'deckQuarter', 'eastQuarter', 'spine']) ok(named.has(g), 'grindable: ' + g);
/* THE PARK MEETS ITS FENCE WITH NO SLOT (found 10-16: the terrace and the decks stopped 0.3 m short of the fence, and so did the Deck
   Quarter's end — a board ridden into the fence dropped into the gap, and a body flying off the quarter's end sank into its wall). Along the
   inside of every run of the fence, every 0.25 m: the ground 0.12 m in from the fence may not lie more than 0.15 m below the ground 0.9 m in. */
{ const { fenceSegments } = await import('../build/js/sim/park.js'); const { PARK } = await import('../build/js/config.js'); const bad = [];
  for (const [[x0, z0], [x1, z1], , n] of fenceSegments(PARK)) {
    const L = Math.hypot(x1 - x0, z1 - z0);
    for (let s2 = 0.3; s2 < L - 0.3; s2 += 0.25) {
      const px = x0 + (x1 - x0) * s2 / L, pz = z0 + (z1 - z0) * s2 / L, at = (k) => { const g = bvh.raycast([px + n[0] * k, 6, pz + n[2] * k], [0, -1, 0], 12); return g ? g.point[1] : -99; };
      const edge = at(0.12), inner = at(0.9); if (edge < inner - 0.15) bad.push([+px.toFixed(2), +pz.toFixed(2), +edge.toFixed(2), +inner.toFixed(2)]);
    }
  }
  ok(bad.length === 0, 'the park meets its fence with no slot: ' + (bad.length ? bad.length + ' places where the ground by the fence drops, e.g. ' + JSON.stringify(bad.slice(0, 3)) + ' (x, z, ground at the fence, ground inside)' : 'none, along every run')); }
/* THE DRAWN COPING ON ITS LINE (10-16, the supervisor: "the drawn tube's top, the grind line and the high-centre's edge the same line within
   2 mm, with the solid lip under it"): every coping's DRAWN pipe — the view's own builder, view/parkview.js copingTube — has its top on the
   coping's line at every point of it (≤ 2 mm; it was 2.2 cm over it, and showed through the trucks on every grind), and the solid's lip stands
   under it, the coping's `corner` below its line, where a ray down meets the lip. The sim's high-centre reads that lip — the solid its wheels
   ride (a deck laid 1 cm over the line rests 3 cm over the lip — body.js edgeThrough): the 2 cm between is REPORTED, the coping not yet solid
   to the board (the grind release's) */
{ const { copingTube } = await import('../build/js/view/parkview.js'), { World } = await import('../build/js/sim/world.js'), { Skater } = await import('../build/js/sim/body.js');
  const { PHYSICS: PH, BOARD: BD } = await import('../build/js/config.js'), w = new World(), sk = new Skater(w, { preset: 'cruise', seed: 1 }), bad = [], said = [];
  let worst = 0, worstAt = '', worstHC = 0, worstHCAt = '', nPts = 0, nHC = 0;
  for (const r of w.rails) { if (r.kind !== 'coping') continue;
    const pos = copingTube(r, null).geometry.getAttribute('position'), seg = 13, rings = pos.count / seg;
    for (let i = 0; i < rings; i++) { let top = -Infinity; for (let k = 0; k < seg; k++) top = Math.max(top, pos.getY(i * seg + k));
      const p = r.pts[i % r.pts.length], d = Math.abs(top - p[1]); nPts++; if (d > worst) { worst = d; worstAt = r.id + ' point ' + i; } }
    /* the high-centre on it: a deck laid level across the coping at its middle, its underside 1 cm over the line */
    const j = Math.floor((r.pts.length - 1) / 2), a = r.pts[j], b = r.pts[j + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], ax = [b[0] - a[0], 0, b[2] - a[2]], al = Math.hypot(ax[0], ax[2]);
    const fwd = [-ax[2] / al, 0, ax[0] / al], hd = PH.deckTop - BD.thickness, p = [m[0], m[1] - hd + 0.01, m[2]];
    const hc = sk.edgeThrough(p, [0, 1, 0], fwd, null); nHC++;
    if (!hc || hc.rail.id !== r.id) bad.push(r.id + ': the high-centre found ' + (hc ? hc.rail.id : 'no edge') + ' under a deck laid on it');
    else { const d = Math.abs(hc.depth + 0.01 - (r.corner || 0)); if (d > worstHC) { worstHC = d; worstHCAt = r.id; } }
    const lipHit = w.bvh.raycast([m[0], m[1] + 0.5, m[2]], [0, -1, 0], 2), lipY = lipHit ? lipHit.point[1] : null, wantLip = m[1] + (r.corner || 0);
    if (lipY == null || Math.abs(lipY - wantLip) > 0.002 || !(r.corner < 0)) bad.push(r.id + ': the solid under its line at ' + (lipY == null ? 'nothing' : lipY.toFixed(3)) + ', its corner says ' + wantLip.toFixed(3));
    said.push(r.id); }
  ok(worst <= 0.002 && worstHC <= 0.002 && bad.length === 0, 'THE DRAWN COPING ON ITS LINE: every coping\'s drawn pipe has its top on the coping\'s line — at most ' + (worst * 1000).toFixed(1) + ' mm off over ' + nPts + ' points of ' + said.length + ' copings (≤ 2; ' + (worstAt || '-') + '), the solid lip under it, and the high-centre reads that lip, the solid the wheels ride (' + (worstHC * 1000).toFixed(1) + ' mm off it, ≤ 2; ' + (worstHCAt || '-') + ')' + (bad.length ? '  ✖ — ' + bad.join(' · ') : ''));
  console.log('ℹ THE COPING NOT YET SOLID TO THE BOARD — reported (the grind release, the supervisor\'s call): its drawn top stands ' + (-Math.min(...w.rails.filter((r) => r.kind === 'coping').map((r) => r.corner || 0)) * 100).toFixed(1) + ' cm over the lip the board rides'); }
/* THE PARK'S OWN CHECKS HOLD (10-16): the builder names a row that leaves the park or lies on another; it is still built (a mod may mean it),
   and this wall reads the shipped park clean — before, the problems were printed in the header line above and the wall stayed green */
ok(park.problems.length === 0, "the park's own checks: every element inside the park, no two on one spot" + (park.problems.length ? ' — ' + park.problems.join('; ') : ' (' + PARK_ELEMENTS + ' elements)'));
console.log(fail ? 'PARK: RED' : 'PARK: GREEN'); process.exit(fail ? 1 : 0);
