/* A STOP AT A FACE KEEPS ITS STEP — COLLIDE AND SLIDE (10-17; Fauerby 2003, the character controller's slide move: body.js walls and rollOn).
 * Every face the camera wall's bails meet — the decks' walls and ends, the riser, the planter, the bench, the ledges' faces, the fence, the
 * blocks — rolled into square and glancing (±35°) at 2 and 3 m/s, under the bail, on each assist a player can choose. Every step that scrapes
 * along a face (a scrape, the board still moving at half its speed or more: a square stop or a bounce is the wall's, not a slide) moves the
 * board its own velocity's worth along the face — less at most the millimetre a stop stands short of it. Stopped on its path and left there,
 * a board lost the rest of each step it pressed into a face: 827 such steps lost more than 2 mm, the most 20 mm, and a board stood pinned on
 * the East Deck's fence while its velocity ran along it (the drawn deck took 1.1 cm and gave it back: F1 on Raw).
 * IN THE AIR TOO (10-17): every air that meets a wall with the body — a pop timed to reach each face above, square and glancing, at 3 and 4
 * m/s, and the Raw Lawn Quarter ±40° @9 that hung in the air on the west fence's top — moves, on each step its body meets a wall, the step's
 * own free move less its part into the CONTACT (the sim says the contact: sk.wallAir), short by at most the stop's millimetre; a step whose
 * slide met a second face is said apart. Stopped and left there, a body grazing the fence's top edge stopped at the start of every step and
 * the air never ended. And EVERY ONE OF THOSE AIRS ENDS (it lands, grinds or bails) inside its ride — and AN AIR IS NEVER HELD: no board stands
 * still in the air for more than three frames (tests/lib/held.mjs: the census's row 19 planted as a freeze held boards 21 steps, and every
 * air still ended).
 * Every ride is POSED (tests/lib/figure.mjs on this wall's own bare skater, driven by its own inputs) and the body on it is reported
 * (tests/lib/bodyread.mjs: the joints and the chain's stages, each ride read to its first bail).
 * Plants (tests/plants.mjs): walls_stop_without_slide, rolling_stop_without_slide, air_stop_without_slide → RED. */
import { World } from '../build/js/sim/world.js';
import { Skater } from '../build/js/sim/body.js';
import { PHYSICS, ASSISTS } from '../build/js/config.js';
import { yawGate } from './lib/airyaw.mjs';
import { held as heldRead, HELD } from './lib/held.mjs';
import { drops } from './lib/drops.mjs';
import { airsRead, airsBase, airsRecord } from './lib/airsread.mjs';
import { figure } from './lib/figure.mjs';
import { bodyRead } from './lib/bodyread.mjs';

const LOST = 0.001;   // m: the most a scraping step's move along its own velocity may fall short of that velocity's worth (the stop's millimetre)
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const world = new World(), floor = (x, y, z) => { const g = world.groundAt(x, y + 0.5, z, 2); return g ? g.point.slice() : null; };
/* a ride, posed: each(st) steps the sim once (its own inputs) and reads it, true to end the ride; the figure draws it two steps a frame, the page's
   clock, and the body on it is read (BODY) */
const BODY = bodyRead();
function posedRide(name, sk, each, most) {
  let st = 0, stop = false;
  const R = { sk, log: [], load: 0, step() { if (stop) return; if (st >= most) { stop = true; return; } const end = each(st++); for (const e of sk.events) R.log.push(e); if (end) stop = true; } };
  const G = figure({ rig: R }), B = BODY.ride(name, G);
  for (let f = 0; !stop; f++) { const n0 = R.log.length, m = G.frame(), evs = R.log.slice(n0); B.frame(f, sk, evs, m); }
  B.end();
}
const FACES = [['the West Deck wall', [21.5, 0, 26.5], 0], ['the East Deck end', [60.5, 0, 31.4], 180], ['the Terrace riser', [30, 0, 26], 0], ['the Lawn Deck end', [0.9, 0, 14], 0],
  ['the Spine end', [8.6, 0, 17.4], 0], ['the planter, south', [45.2, 0, 19.5], 0], ['the planter, north', [45.2, 0, 31], 180], ['the planter, west', [38.5, 0, 25.2], 90], ['the planter, east', [52, 0, 25.2], 270],
  ['the bench', [34.2, 0, 10.5], 0], ['the Main Ledge face', [34, 0, 19.5], 0], ['the fence, east', [56.5, 0, 30.5], 90], ['the fence, south', [20, 0, 5.5], 180], ['the fence, west', [6, 0, 18], 270],
  ['the fence, north', [40, 0.8, 38.5], 0], ['the Sun Ledge face', [37, 0.8, 33.2], 0], ['the Terrace Block', [56.5, 0.8, 34], 0], ['the East Deck by the fence', [60.2, 1.83, 23], 30]];
for (const pre of ['cruise', 'classic', 'raw']) {
  let steps = 0, n = 0, worst = { lost: 0, at: '' }; const where = {};
  for (const [name, at, h0] of FACES) for (const dh of [-35, 0, 35]) for (const sp of [2, 3]) {
    const g = floor(...at); if (!g) { ok(false, name + ': no floor to start from'); continue; }
    const sk = new Skater(world, { preset: pre, seed: 1 }); sk.assist = Object.assign({ name: pre }, ASSISTS[pre]); sk.respawnAt(g, h0 + dh, sp); n++;
    posedRide(pre + ' ' + name + ' at ' + (h0 + dh) + '°, ' + sp + ' m/s (rolled into)', sk, () => {
      const p0 = sk.p.slice(), v0 = Math.hypot(...sk.v), was = sk.state;
      sk.step(PHYSICS.step, { steer: 0, throttle: 0, events: [], hold: null, pushTap: false, golden: false });
      if (sk.state === 'bail' || sk.events.some((e) => e.type === 'bail' || e.type === 'respawn')) return true;
      if (was !== 'roll' || sk.state !== 'roll' || !sk.events.some((e) => e.type === 'scrape')) return false;
      const v = sk.v, vl = Math.hypot(...v); if (vl < 0.2 || vl < 0.5 * v0) return false;
      steps++;
      const along = ((sk.p[0] - p0[0]) * v[0] + (sk.p[1] - p0[1]) * v[1] + (sk.p[2] - p0[2]) * v[2]) / vl, lost = vl * PHYSICS.step - along;
      if (lost > LOST) where[name] = (where[name] || 0) + 1;
      if (lost > worst.lost) worst = { lost, at: name + ' at ' + (h0 + dh) + '°, ' + sp + ' m/s, ' + sk.t.toFixed(2) + ' s' };
      return false;
    }, 600);
  }
  const over = Object.values(where).reduce((a, b) => a + b, 0);
  ok(steps > 50 && over === 0, 'A STOP AT A FACE KEEPS ITS STEP, on ' + pre[0].toUpperCase() + pre.slice(1) + ': ' + n + ' rides into ' + FACES.length + ' faces, ' + steps + ' steps scraping along one — ' + over + ' fell short of their own velocity\'s worth by more than ' + LOST * 1000 + ' mm (the most ' + (worst.lost * 1000).toFixed(2) + ' mm' + (worst.at ? ', ' + worst.at : '') + ')' + (over ? ' — ' + Object.entries(where).map(([k, c]) => k + ' ' + c).join(', ') : ''));
}
/* IN THE AIR: a pop timed to meet each face (the ground ride's first scrape, a quarter second before), and the Raw Lawn Quarter airs */
const popAt = (pre, at, h, sp) => { const g = floor(...at); if (!g) return null; const sk = new Skater(world, { preset: pre, seed: 1 }); sk.assist = Object.assign({ name: pre }, ASSISTS[pre]); sk.respawnAt(g, h, sp);
  for (let st = 0; st < 600; st++) { sk.step(PHYSICS.step, { steer: 0, throttle: 0, events: [], hold: null, pushTap: false, golden: false }); if (sk.state === 'bail' || sk.events.some((e) => e.type === 'scrape' || e.type === 'bail')) return st; }
  return null; };
const DROPPED = drops();   // what a capped slide left over the airs here, by kind (body.js noteDropped → tests/lib/drops.mjs): reported
const AR = {};
const lawn = [['the Lawn Quarter +40° @9 (raw)', 'raw', [6, 0, 24], 310, 9], ['the Lawn Quarter -40° @9 (raw)', 'raw', [6, 0, 24], 230, 9]];
for (const pre of ['cruise', 'classic', 'raw']) {
  let airs = 0, steps = 0, again = 0, unended = []; const lostOver = []; let worst = { lost: 0, at: '' }; const YG = yawGate(1 / 60, world), held = { v: 0, at: '' }, RD = airsRead(Skater, PHYSICS); AR[pre] = RD;
  const rides = [];
  for (const [name, at, h0] of FACES) for (const dh of [-35, 0, 35]) for (const sp of [3, 4]) { const st = popAt(pre, at, h0 + dh, sp); if (st != null) rides.push([name + ' at ' + (h0 + dh) + '°, ' + sp + ' m/s', at, h0 + dh, sp, Math.max(0, st - 30)]); }
  for (const [name, p2, at, h, sp] of lawn) if (p2 === pre) rides.push([name, at, h, sp, null]);
  for (const [name, at, h, sp, popStep] of rides) {
    const g = floor(...at); const sk = new Skater(world, { preset: pre, seed: 1 }); sk.assist = Object.assign({ name: pre }, ASSISTS[pre]); sk.respawnAt(g, h, sp);
    let met = false, airFrom = null, ended = true; const H = heldRead(); YG.ride(); RD.ride();
    posedRide(pre + ' ' + name + ' (popped at it)', sk, (st) => {
      const ev = popStep != null && st === popStep ? [{ type: 'pop', gesture: -2, nollie: false, load: 0.8, spd: 4 }] : [], p0 = sk.p.slice();
      sk.step(PHYSICS.step, { steer: 0, throttle: 0, events: ev, hold: null, pushTap: false, golden: false });
      H.step(sk, p0, () => name + ', ' + sk.t.toFixed(2) + ' s'); if (H.v > held.v) Object.assign(held, { v: H.v, at: H.at });
      { const where = () => name + ', ' + sk.t.toFixed(2) + ' s (' + (sk.air ? 'the air' : sk.state + (sk.catchTurn ? ', the catch' : '')) + ')'; YG.step(sk, where); RD.step(sk, where); if (st % 2 === 1) { YG.frame(sk, where); RD.frame(sk, where); } }
      DROPPED.step(sk, () => pre + ' ' + name + ' at ' + sk.t.toFixed(2) + ' s (' + sk.state + ')');
      if (sk.state === 'air') { if (airFrom == null) airFrom = st; } else if (airFrom != null) { airFrom = null; }
      const W = sk.wallAir; if (W && sk.state === 'air') { met = true; steps++;
        if (W.again) { again++; return false; }
        const d = [W.free[0] - W.from[0], W.free[1] - W.from[1], W.free[2] - W.from[2]], dc = d[0] * W.c[0] + d[1] * W.c[1] + d[2] * W.c[2];
        const slid = dc < 0 ? [d[0] - W.c[0] * dc, d[1] - W.c[1] * dc, d[2] - W.c[2] * dc] : d, sl = Math.hypot(...slid); if (sl < 1e-6) return false;
        const along = ((sk.p[0] - W.from[0]) * slid[0] + (sk.p[1] - W.from[1]) * slid[1] + (sk.p[2] - W.from[2]) * slid[2]) / sl, lost = sl - along;
        if (lost > LOST) lostOver.push(name); if (lost > worst.lost) worst = { lost, at: name + ', ' + sk.t.toFixed(2) + ' s' }; }
      return sk.state === 'bail' || sk.events.some((e) => e.type === 'respawn');
    }, 720);
    if (met) airs++;
    if (airFrom != null) { ended = false; unended.push(name + ' (in the air from ' + (airFrom * PHYSICS.step).toFixed(2) + ' s)'); }
  }
  ok(airs > 3 && lostOver.length === 0, 'A STOP AT A FACE KEEPS ITS STEP, IN THE AIR, on ' + pre[0].toUpperCase() + pre.slice(1) + ': ' + airs + ' airs whose body met a wall, ' + steps + ' steps against one — ' + lostOver.length + ' fell short of their own free move less its part into the contact by more than ' + (LOST * 1000).toFixed(0) + ' mm (the most ' + (worst.lost * 1000).toFixed(2) + ' mm' + (worst.at ? ', ' + worst.at : '') + ')' + (again ? ' · ' + again + ' steps slid on into a second face (said)' : ''));
  { const [line, contact, catches] = YG.say('on ' + pre[0].toUpperCase() + pre.slice(1)); ok(YG.ok(), line); console.log(contact); console.log(catches); for (const l of RD.lines('on ' + pre[0].toUpperCase() + pre.slice(1), airsBase('slide')[pre])) console.log(l); { const g = RD.gate('on ' + pre[0].toUpperCase() + pre.slice(1)); ok(g.ok, g.line); } }
  ok(held.v <= HELD, 'AN AIR IS NEVER HELD, on ' + pre[0].toUpperCase() + pre.slice(1) + ': no board of these airs stands still in the air (its middle under 1 mm a step) for more than ' + HELD + ' steps — the most ' + held.v + (held.at ? ' (' + held.at + ')' : ''));
  ok(unended.length === 0, 'EVERY AIR ENDS, on ' + pre[0].toUpperCase() + pre.slice(1) + ': ' + rides.length + ' airs at faces and fences, each landed, ground or bailed inside its ride' + (unended.length ? '  ✖ — still in the air: ' + unended.slice(0, 4).join(', ') : ''));
}
console.log(DROPPED.say('the airs here'));
airsRecord('slide', Object.fromEntries(Object.entries(AR).map(([k, v]) => [k, v.summary()])));
BODY.say('every ride here, rolled into the faces and popped at them');
console.log(fail ? 'SLIDE: RED' : 'SLIDE: GREEN'); process.exit(fail ? 1 : 0);
