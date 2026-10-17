/* SHE STAYS IN SIGHT (the supervisor's C1): the camera's own rule (js/view/sightline.js) from the spawn, every respawn node and a grid of
 * places over the whole park in eight headings, upright and turned — her head and her feet in clear view, the lamp posts, the trees, the
 * fence and every wall counted. A place where no swing clears and the camera has to pull in is listed; the spawn and the nodes may not. */
import { World } from '../build/js/sim/world.js';
import { Skater } from '../build/js/sim/body.js';
import { occluders, solveView, firstHit, inWorld } from '../build/js/view/sightline.js';
import { CAMERA, PARK } from '../build/js/config.js';
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const world = new World(), occ = occluders(undefined, undefined, world), C = CAMERA.filmer, sk = new Skater(world, { preset: 'cruise' }), DEG = Math.PI / 180;
const views = [['upright', C.back * 1.18, C.up * 1.35], ['turned', C.back, C.up]];
const solve = (P, hd, back, up) => solveView(world, occ, P, hd * DEG, back, up, 0, { baseY: P[1], lookUp: C.lookUp });
/* the spawn and every node, at the heading a respawn there takes */
const spots = [['spawn', world.data.spawn.at, world.data.spawn.heading], ...world.data.nodes.map((n, i) => ['node ' + i, [n[0], n[1], n[2]], sk.openHeading([n[0], n[1], n[2]], n[3])])];
for (const [name, back, up] of views) {
  const bad = []; for (const [label, P, hd] of spots) { const v = solve(P, hd, back, up); if (!v.clear || v.pulled || !inWorld(v.pos)) bad.push(label + ' (' + (v.pulled ? 'pulled in' : !inWorld(v.pos) ? 'outside the fence' : 'blocked') + ')'); }
  ok(bad.length === 0, name + ': the spawn and all ' + world.data.nodes.length + ' respawn nodes see her clear' + (bad.length ? ' — not: ' + bad.join(', ') : ''));
}
/* the whole park, every 3 m that can be stood on, eight headings */
for (const [name, back, up] of views) {
  let n = 0, straight = 0, swung = 0, pulled = 0, drop = 0, outside = 0; const worst = [];
  for (let x = 1; x < 62; x += 3) for (let z = 1; z < 44; z += 3) {
    const at = world.standable(x, 3, z) || world.standable(x, 1.4, z) || world.standable(x, 0.6, z) || world.standable(x, 0, z); if (!at) continue;
    for (let h = 0; h < 360; h += 45) { n++; const v = solve(at, h, back, up); if (!inWorld(v.pos)) outside++; if (v.pulled) { pulled++; if (worst.length < 6) worst.push(at.map((q) => q.toFixed(1)).join(',') + '@' + h); } else if (v.swing === 0) straight++; else swung++; if (v.overDrop) drop++; }
  }
  ok(pulled / n <= 0.02 && outside === 0, name + ': ' + n + ' places and headings — ' + straight + ' clear as wanted, ' + swung + ' clear after a swing, ' + pulled + ' pulled in (' + (100 * pulled / n).toFixed(1) + '%), ' + drop + ' over a drop, ' + outside + ' with the lens outside the fence' + (worst.length ? ' · e.g. ' + worst.join(' ') : ''));
}
/* the rule is not blind: a line across the Five Rail at its middle, at the rail's own height, stops AT the rail (its tube is drawn, not in the
   collision mesh: the sight rule must know it). 10-16: this read "< 4 m" on a 4 m line, so anything on the line passed it */
{ const r = world.rails.find((x) => x.id === 'fiveRail'), m = [(r.pts[2][0] + r.pts[3][0]) / 2, r.pts[2][1], (r.pts[2][2] + r.pts[3][2]) / 2];
  const d = [r.pts[3][0] - r.pts[2][0], 0, r.pts[3][2] - r.pts[2][2]], L = Math.hypot(d[0], d[2]), n = [-d[2] / L, 0, d[0] / L];
  const a = [m[0] - n[0] * 1.5, m[1], m[2] - n[2] * 1.5], b = [m[0] + n[0] * 1.5, m[1], m[2] + n[2] * 1.5], t = firstHit(world, occ, a, b);
  ok(Math.abs(t - (1.5 - 0.14)) < 0.06, 'a line across the Five Rail at its middle stops at the rail: ' + (Number.isFinite(t) ? 'hit at ' + t.toFixed(2) + ' m (the rail\'s face is at ' + (1.5 - 0.14).toFixed(2) + ')' : 'NOT HIT: the rule has no rail there')); }
/* the lamps stand outside the fence, where no lens goes (the lens is held inside it): none can come between the lens and her. A lamp moved into
   the park must be known to the sight rule — the census counts every drawn thing inside the fence. 10-16: this read "a lamp post between the
   lens and her is seen" by a 4 m line that hit the FENCE at 2.90 m, with the lamps or without them */
{ const Fz = { x0: -0.3, z0: -0.3, x1: PARK.size[0] + 0.3, z1: PARK.size[1] + 0.3 }, inside = PARK.lamps.filter(([x, z]) => x > Fz.x0 - 0.16 && x < Fz.x1 + 0.16 && z > Fz.z0 - 0.16 && z < Fz.z1 + 0.16);
  ok(inside.length === 0, 'every lamp stands outside the fence (' + PARK.lamps.length + ' lamps)' + (inside.length ? ' — INSIDE IT: ' + inside.map((l) => l.slice(0, 2).join(',')).join(' ') : '')); }
/* THE PULL-IN NEVER GOES PAST THE PLACE IT WANTED (10-16: with a line to a point of her blocked from every swing while the look line was clear,
   the pull-in's factor had no ceiling — one frame threw the lens 51 m away and 18 m up). The state, twice: a point of her just inside a ledge's
   face, and the frame recorded then (her board at 23.00, 1.23, 44.04, her hips at 23.11, 2.09, 44.00, the camera's yaw −33°: her hips inside the
   Deck Quarter's end). Each must take the pull-in branch, and land finite, inside the fence and no farther from her than the place it wanted. */
{ const C2 = CAMERA.filmer, back = C2.back * 1.18, up = C2.up * 1.35, ledge = world.data.elements.find((e) => e.id === 'mainLedge');
  const cases = [['a point of her inside the Main Ledge', [34, 0, 22.4], [[34, 0.2, 23.05], [34, 1.55, 22.4]], 180],
                 ['the recorded frame (her hips inside the Deck Quarter)', [23.0, 1.23, 44.04], [[23.11, 2.09, 44.0], [23.05, 2.6, 43.6]], -33]];
  for (const [name, P, pts, hd] of cases) {
    const yaw = hd * DEG, v = solveView(world, occ, P, yaw, back, up, 0, { baseY: P[1], lookUp: C2.lookUp, pts }), look = [P[0], P[1] + C2.lookUp, P[2]];
    const want = [P[0] - Math.sin(yaw) * back, P[1] + up, P[2] - Math.cos(yaw) * back], dw = Math.hypot(want[0] - look[0], want[1] - look[1], want[2] - look[2]);
    const fin = v.pos.every(Number.isFinite), dv = fin ? Math.hypot(v.pos[0] - look[0], v.pos[1] - look[1], v.pos[2] - look[2]) : Infinity;
    ok(v.pulled && fin && inWorld(v.pos) && dv <= dw + 1e-6, 'the pull-in, ' + name + ': ' + (v.pulled ? 'pulled' : 'NOT pulled (the state was not reached)') + ', ' + (fin ? dv.toFixed(2) + ' m from her look (the wanted place is ' + dw.toFixed(2) + ')' : 'NOT FINITE') + (fin && !inWorld(v.pos) ? ', OUTSIDE THE FENCE' : ''));
  }
  void ledge; }
console.log(fail ? 'CAMERA VIEW: RED' : 'CAMERA VIEW: GREEN'); process.exit(fail ? 1 : 0);
