/* THE SAME READING ON THE PLAZA'S OWN DROPS: is the hips' landing class a limit of a park, or of the legs? (a probe for the supervisor's
 * question, 10-16; the Plaza is built from config.js PARK, untouched) */
import { figure, PHYSICS } from '../lib/figure.mjs';
import { flick } from '../lib/rig.mjs';
import { World } from '../../build/js/sim/world.js';
import { legsReader, HIPS } from '../lib/legs.mjs';
const park = new World(), FT = 2 * PHYSICS.step;
const before = (edge, v) => (sk) => sk.p[2] <= edge + 0.15 + v * 0.19;
const RUNS = [
  ['Terrace Drop, rolled off the terrace wall (0.8 m) at 4 m/s', { at: [30, 0.8, 35], heading: 180, speed: 4 }, null],
  ['Terrace Drop, ollied off it at 4 m/s', { at: [30, 0.8, 36], heading: 180, speed: 4 }, before(32, 4)],
  ['Long Five, ollied over the Five at 4.5 m/s', { at: [51, 0.8, 37], heading: 180, speed: 4.5 }, before(32, 4.5)],
  ['An ollie on the plaza at 4.5 m/s (flat)', { at: [30, 0, 14], heading: 90, speed: 4.5 }, (sk) => sk.p[0] >= 31],
];
for (const [name, o, popWhen] of RUNS) {
  const G = figure(Object.assign({ world: park, preset: 'cruise' }, o)), R = G.R, sk = R.sk, LR = legsReader({ board: G.board, F: G.F, ball: G.ball, stretch: G.stretch }, FT);
  let popped = false, L = null;
  for (let f = 0; f < 150; f++) { if (popWhen && !popped && popWhen(sk)) { popped = true; R.thumb(flick('Ollie')); } const n0 = R.log.length; G.frame(); const evs = R.log.slice(n0); for (const e of evs) if (e.type === 'land') L = e; if (sk.state === 'bail') break; LR.frame(sk.state, evs, name); }
  console.log(`${LR.W.impulse.v <= HIPS.impulse ? '✔' : '✖'} ${name}: ${L ? L.quality + ' on ' + L.surf + ', air ' + (L.height || 0).toFixed(2) + ' m, impact ' + L.impact.toFixed(2) + ' m/s' : 'no landing'} · hips ${LR.W.impulse.v.toFixed(0)} m/s² (≤ ${HIPS.impulse}) · sink ${(LR.W.gap.sink * 100).toFixed(1)} cm`);
}
