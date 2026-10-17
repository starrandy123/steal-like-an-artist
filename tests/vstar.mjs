/* THE ROLL-IN SPEED OF EVERY LIP, MEASURED (10-16, the supervisor: "decide it PER LIP by measurement" — "so a mellower lip, Kiln Yard's 62°
 * and 65° included, is judged by the same measurement"). For every coping with a deck behind it (sim/park.js — not the Spine's ridge, two
 * walls and no deck), from that deck a metre back from the middle of the coping's longest run, square to it, the board is made to ROLL over
 * it (the lip's vStar set past the sweep, on this measurement's own park) at every speed of the sweep, on Cruise and Classic; each run is read
 * by the surfaces wall's own reader and judged by its own gates (tests/lib/ride.mjs: the deck's jump and its turn against its contacts, the
 * hips, the legs, the feet, the joints, the deck's speed and the board against the coping, the rider's turn, the chain).
 *   A lip's MEASURED vStar: the fastest arrival at its coping under which every rolled run held every gate (the slowest of the sweep failing
 *   one: 0 — every run over it drops in). Its STORED vStar (its park element's, else 0: sim/park.js) may not be above the measured one — a lip
 *   never rolls a board at a speed the measurement saw fail.
 * Usage: node tests/vstar.mjs [lip id filter] */
import { World } from '../build/js/sim/world.js';
import { parkById } from '../build/js/parks/index.js';
import { ride, own } from './lib/ride.mjs';

/* the park: the Plaza unless WL_PARK names another (as tests/surfaces.mjs reads it) */
const DEF = parkById(process.env.WL_PARK || 'waxline'), park = new World(DEF.PARK, DEF.TREES), only = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
const SPEEDS = [0.75, 1, 1.5, 2, 2.5, 3], PRESETS = ['cruise', 'classic'];
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const lipOf = (r) => park.lips.find((q) => q.id === r.id || String(q.id).startsWith(r.id + ':'));
const lips = park.rails.filter((r) => r.kind === 'coping' && !r.spine && (!only || only.test(r.id)));
const rows = [];
for (const r of lips) {
  /* where it starts: the middle of the coping's longest run, a metre back on its deck, square to it */
  let at = null; for (let i = 0; i + 1 < r.pts.length; i++) { const L = Math.hypot(r.pts[i + 1][0] - r.pts[i][0], r.pts[i + 1][2] - r.pts[i][2]); if (!at || L > at.L) at = { i, L }; }
  const a = r.pts[at.i], b = r.pts[at.i + 1], inw = r.inwardOf ? r.inwardOf[at.i] : r.inward, m = [(a[0] + b[0]) / 2 + inw[0], 0, (a[2] + b[2]) / 2 + inw[2]];
  const g = park.groundAt(m[0], a[1] + 0.5, m[2], 2), L = lipOf(r);
  if (!g || Math.abs(g.point[1] - (a[1] + (r.corner || 0))) > 0.05) { ok(false, r.id + ': no deck a metre behind its coping to start from (the ground there: ' + (g ? g.point[1].toFixed(2) : 'none') + ')'); continue; }
  const heading = ((Math.atan2(-inw[0], -inw[2]) * 180 / Math.PI) + 360) % 360, stored = r.vStar || 0;
  r.vStar = Infinity;   // (this measurement's own park: every run rolls)
  const runs = [];
  for (const pre of PRESETS) for (const v of SPEEDS) {
    const W = ride(park, r.id + ' rolled at ' + v + ' m/s (' + pre + ')', { at: g.point.slice(), heading, speed: v, preset: pre }, () => {}, Math.round(60 * (1 / v + 1.5)));
    const R = W.roll, failed = own(W).filter((x) => !x.ok), rolled = R.rolled && R.rolled.t1 != null && !R.rolled.flown && !R.bail;
    runs.push({ pre, v, at: R.rolled ? R.rolled.speed : null, held: rolled && failed.length === 0, why: !R.rolled ? 'never rolled over it' : !rolled ? (R.bail ? 'bailed (' + R.bail + ')' : R.rolled.flown ? 'flown' : 'never on the wall') : failed.map((x) => x.gate + ' ' + (x.v >= 100 ? x.v.toFixed(0) : x.v.toFixed(3)) + ' (bound ' + x.bound + ')').join(', ') });
  }
  r.vStar = stored;
  /* the measured vStar: up to the first failure of the sweep on either assist */
  let measured = 0, firstFail = null;
  for (const v of SPEEDS) { const at2 = runs.filter((q) => q.v === v); if (at2.every((q) => q.held)) measured = Math.max(measured, ...at2.map((q) => q.at)); else { firstFail = at2.find((q) => !q.held); break; } }
  rows.push({ id: r.id, lip: L ? L.lipDeg : null, rad: L ? L.r : null, measured, stored, firstFail });
  ok(stored <= measured + 1e-9, r.id + ' (' + (L ? L.lipDeg.toFixed(1) + '° at its lip, r ' + L.r + ' m' : 'no lip') + '): rolled over its coping, every gate held up to ' + (measured ? measured.toFixed(2) + ' m/s at the coping' : 'no speed of the sweep') + (firstFail ? ' — first off at ' + (firstFail.at != null ? firstFail.at.toFixed(2) : firstFail.v) + ' m/s (' + firstFail.pre + '): ' + firstFail.why : '') + ' → measured vStar ' + measured.toFixed(2) + ', stored ' + stored + (stored <= measured + 1e-9 ? '' : '  ✖ it would roll a board at a speed the measurement saw fail'));
}
console.log('VSTAR: ' + (fail ? 'RED · ' + fail + ' off' : 'GREEN') + ' · ' + rows.length + ' lips · ' + rows.length * SPEEDS.length * PRESETS.length + ' rolled runs');
process.exit(fail ? 1 : 0);
