/* KILN YARD'S BIG DROPS, THROUGH THE LEGS FIRST (the supervisor, 10-16: "If the legs can't take your biggest drop, it shows there, not in the
 * round"). The real sim at 120 Hz and the real pose each 1/60 s, on Kiln Yard as the generators build it: rolled off and ollied off the
 * yard's 1.75 m south face, over the Ten, over the Ten Bank, off the dock and down the Dock Seven, on every preset. Read with the legs'
 * own reader (tests/lib/legs.mjs): the hips' world acceleration in the 0.2 s after the landing (≤ 150 m/s²) and the legs' sink (≤ 15 cm).
 * A bail is said with its reason; a landing is said with its quality and the height it fell.
 *   node tests/parks/kilnyard_drops.mjs [run filter] */
import { figure, PHYSICS } from '../lib/figure.mjs';
import { flick } from '../lib/rig.mjs';
import { World } from '../../build/js/sim/world.js';
import { legsReader, HIPS, REACH } from '../lib/legs.mjs';
import K from '../../build/js/parks/kilnyard.js';

const park = new World(Object.assign({ outside: 'slab' }, K.PARK)), FT = 2 * PHYSICS.step, only = process.argv[2] ? new RegExp(process.argv[2], 'i') : null;
const YARD = 4.15, DOCK = 5.35;
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };

/* [name, start, pop when (or null: rolled off), frames] — every run heads south (180°) off a face */
const RUNS = [];
const before = (edge, v) => (sk) => sk.p[2] <= edge + 0.15 + v * 0.19;   // the flick's 0.19 s from the thumb's touch to the pop, and 15 cm to spare
for (const v of [3, 4.5, 6]) RUNS.push([`Yard Drop, rolled off the south face at ${v} m/s`, { at: [70, YARD, 33], heading: 180, speed: v }, null, 150]);
for (const v of [3, 4.5, 6]) RUNS.push([`Yard Drop, ollied off the south face at ${v} m/s`, { at: [70, YARD, 34.5], heading: 180, speed: v }, before(30, v), 150]);
for (const v of [4, 5.5]) RUNS.push([`Clear the Ten, ollied at the top at ${v} m/s`, { at: [42, YARD, 35], heading: 180, speed: v }, before(30, v), 150]);
for (const v of [5, 6.5]) RUNS.push([`Bank Drop, ollied off the yard over the Ten Bank at ${v} m/s`, { at: [35.7, YARD, 35.5], heading: 180, speed: v }, before(30, v), 150]);
for (const v of [3, 5]) RUNS.push([`Dock Drop, rolled off the dock edge at ${v} m/s`, { at: [60, DOCK, 68], heading: 180, speed: v }, null, 150]);
for (const v of [3, 5]) RUNS.push([`Dock Drop, ollied off the dock edge at ${v} m/s`, { at: [60, DOCK, 69.5], heading: 180, speed: v }, before(64.5, v), 150]);
for (const v of [4, 5.5]) RUNS.push([`Dock Seven, ollied at the top at ${v} m/s`, { at: [85.5, DOCK, 69.5], heading: 180, speed: v }, before(64.5, v), 150]);

const presets = ['cruise', 'classic', 'raw'];
for (const [name, o, popWhen, frames] of RUNS) for (const preset of presets) {
  const label = name + ' · ' + preset;
  if (only && !only.test(label)) continue;
  const G = figure(Object.assign({ world: park, preset }, o)), R = G.R, sk = R.sk;
  const LR = legsReader({ board: G.board, F: G.F, ball: G.ball, stretch: G.stretch }, FT);
  const landings = [], bails = [], offs = [];
  let popped = false;
  for (let f = 0; f < frames; f++) {
    if (popWhen && !popped && popWhen(sk)) { popped = true; R.thumb(flick('Ollie')); }
    const n0 = R.log.length; G.frame(); const evs = R.log.slice(n0);
    for (const e of evs) { if (e.type === 'land') landings.push(Object.assign({ at: sk.p[1] }, e)); if (e.type === 'bail') bails.push(e); if (e.type === 'takeoff') offs.push(Object.assign({ y: sk.p[1] }, e)); }
    if (sk.state === 'bail' || evs.some((e) => e.type === 'bail')) break;
    LR.frame(sk.state, evs, label);
  }
  const W = LR.W, L = landings[landings.length - 1];
  const off = offs[offs.length - 1], fall = L && off ? off.y + (L.height || 0) - L.at : null;
  const said = L ? `${L.quality} on ${L.surf} after ${off ? off.why || 'a take-off' : 'no take-off'}: the air ${(L.height || 0).toFixed(2)} m over its take-off, ${fall != null ? fall.toFixed(2) : '?'} m from its top to the landing, impact ${L.impact.toFixed(2)} m/s` : 'no landing';
  if (bails.length) { ok(false, `${label}: BAILED (${bails.map((b) => b.why || b.reason || 'bail').join(', ')}) · ${said}`); continue; }
  ok(W.impulse.v <= HIPS.impulse && W.gap.sink <= REACH.sink + 1e-9 && !!L,
    `${label}: ${said} · hips ${W.impulse.v.toFixed(0)} m/s² in the landing's 0.2 s (≤ ${HIPS.impulse}), ground ${W.ground.v.toFixed(0)} · sink ${(W.gap.sink * 100).toFixed(1)} cm (≤ ${REACH.sink * 100})` + (W.impulse.v > HIPS.impulse ? ' — at ' + W.impulse.at : ''));
}
console.log(fail ? `KILN YARD DROPS: RED (${fail})` : 'KILN YARD DROPS: GREEN'); process.exit(fail ? 1 : 0);
