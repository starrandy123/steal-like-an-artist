/* A RAIL IS MET FROM ABOVE (F5, the supervisor 10-16: "a capture from BELOW a rail's top never snaps the board up"; body.js tryGrind). Ollies
 * onto the Main Ledge on Classic — the surfaces wall's own line: rolling east along its long face at 4 m/s, 0.3 m off it, popped 0.3 m past its
 * start — at the flick's lowest grades (its apex from the board's bottom: config.js popApex, 0.30 m at grade 1 to 0.85 m at grade 5; the ledge
 * stands 0.36 m), each read for the highest its trucks came (the board's own point, sim/body.js p) and whether it was caught onto the ledge:
 *   UNDER: a pop whose trucks never came within the catch's own tolerance of the ledge's top (body.js CATCH_TOL) is never caught onto it
 *          (the old capture took a board up to 5 cm under the top and set it on: off Kiln Yard's barrier the hips took 349 m/s²);
 *   OVER:  a pop whose trucks came 2 cm or more over the top is caught onto it (the catch is not taken away: it is where the fall meets the
 *          top, body.js tryGrind).
 * Plant (tests/plants.mjs grind_caught_from_below): the old band — a step begun 5 cm under the top caught → UNDER RED. */
import { World } from '../build/js/sim/world.js';
import { Skater, CATCH_TOL } from '../build/js/sim/body.js';
import { PHYSICS, ASSISTS, PARK } from '../build/js/config.js';

let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const world = new World(), ledge = PARK.elements.find((e) => e.id === 'mainLedge');
const TOP = Math.max(...world.rails.filter((r) => String(r.id).startsWith('mainLedge')).flatMap((r) => r.pts.map((q) => q[1])));
const START = [ledge.rect[0] - 1, 0, ledge.rect[1] - 0.3], POP = ledge.rect[0] + 0.3, V0 = 4;
const rows = [];
for (const spd of [1, 1.1, 1.2, 1.3, 1.4, 1.6, 1.8, 2.0, 2.4]) {
  const sk = new Skater(world, { preset: 'classic', seed: 1 }); sk.assist = Object.assign({ name: 'classic' }, ASSISTS.classic);
  const g = world.groundAt(START[0], 0.5, START[2], 2); sk.respawnAt(g.point.slice(), 90, V0);
  let popped = false, peak = -Infinity, caught = null, landed = false;
  for (let st = 0; st < 240; st++) {
    const events = [];
    if (!popped && sk.state === 'roll' && sk.p[0] >= POP) { events.push({ type: 'pop', load: 0, spd, acc: 4 }); popped = true; }
    sk.step(PHYSICS.step, { steer: 0, throttle: 0, events, hold: null, pushTap: false, golden: false });
    if (popped && sk.state === 'air') peak = Math.max(peak, sk.p[1]);
    for (const e of sk.events) { if (e.type === 'grindStart' && String(e.rail).startsWith('mainLedge')) caught = caught || { t: sk.t, name: e.name }; if (e.type === 'land' && popped) landed = true; }
    if (caught || landed || sk.state === 'bail') break;
  }
  rows.push({ spd, peak, over: peak - TOP, caught, landed, bail: sk.state === 'bail' });
}
const under = rows.filter((r) => r.over < -CATCH_TOL), over = rows.filter((r) => r.over >= 0.02), say = (r) => 'grade ' + r.spd + ' (its trucks ' + (r.over >= 0 ? (100 * r.over).toFixed(1) + ' cm over' : (-100 * r.over).toFixed(1) + ' cm under') + ' the top): ' + (r.caught ? 'caught (' + r.caught.name + ')' : r.landed ? 'landed beside it' : r.bail ? 'bailed' : 'not caught');
ok(under.length >= 3 && under.every((r) => !r.caught), 'A RAIL IS MET FROM ABOVE — UNDER: ' + under.length + ' pops whose trucks never came within ' + (100 * CATCH_TOL).toFixed(0) + ' cm of the Main Ledge\'s top (' + (100 * TOP).toFixed(1) + ' cm), none caught onto it — ' + under.map(say).join(' · '));
ok(over.length >= 3 && over.every((r) => r.caught), 'A RAIL IS MET FROM ABOVE — OVER: ' + over.length + ' pops whose trucks came 2 cm or more over its top, each caught onto it — ' + over.map(say).join(' · '));
console.log(fail ? 'CATCH FROM ABOVE: RED' : 'CATCH FROM ABOVE: GREEN'); process.exit(fail ? 1 : 0);
