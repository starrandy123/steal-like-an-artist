/* THE RUN'S GOALS ARE REACHABLE AND HONEST (DESIGN.md §5.3): each judged only from what the sim and the score said — a wax bar ridden
 * into, a ten-trick combo banked, a six-second manual, the Rail Ride down the Five, the score tiers — and the clock runs out. */
import { rig, flick, pull } from './lib/rig.mjs';
import { Run } from '../build/js/game/run.js';
import { RUN } from '../build/js/config.js';
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const withRun = (o) => { const R = rig(o), run = new Run(); R.score.tap = (f) => run.heardScore(f, R.score, R.sk); run.start(R.score); const step0 = R.step; R.step = (n = 1) => { for (let i = 0; i < n; i++) { step0(1); run.step(1 / 120, R.sk, R.score, R.sk.events); } }; R.secs = (s) => R.step(Math.round(s * 120)); return { R, run }; };
/* a wax bar: ride through the one on the Block */
{ const b = RUN.wax[4], { R, run } = withRun({ at: [b[0] - 4.5, 0, b[2]], heading: 90, speed: 4.6 }); R.secs(2.5); ok(run.got >= 1, 'a wax bar ridden into is found (' + run.got + ' of 5)'); }
/* ×10: ten tricks in one combo, banked */
{ const { R, run } = withRun({ at: [18, 0, 8], speed: 4 }); for (let i = 0; i < 10; i++) R.score.addTrick('Trick ' + i, 100, {}); R.score.bank(); ok(run.done.has('x10'), 'a combo of ten, banked, is the ×10 goal'); }
/* six seconds of manual on the terrace's long run (slow enough to hold it six seconds before the fence: the run no longer ends in a slot
   the board rolled off, which once ended a manual early and cleanly) */
{ const { R, run } = withRun({ at: [26.1, 0.8, 40.9], heading: 90, speed: 5.6 }); R.secs(0.3); R.thumb(pull(22, 7000)); R.secs(7.6);
  const m = R.log.filter((e) => e.type === 'manualEnd').map((e) => e.time.toFixed(2)); ok(run.done.has('manual6'), 'a six-second manual (manuals: ' + m.join(', ') + ' s)'); }
/* the Rail Ride: down the Five Rail, top to bottom */
/* (popped 5 cm sooner than before 10-16: the catch is now where the fall meets the rail's top, no longer 3 cm over it — popped as before, the
   trucks met the rail 4 cm further down it, and a ride that left 0.52 m of the rail behind is not top to bottom (0.5 m slack)) */
{ const { R, run } = withRun({ at: [53.25, 0.8, 37.5], heading: 180, speed: 4.6 }); R.until(() => R.sk.p[2] <= 34.35, 3); R.thumb(flick('Ollie')); R.secs(4);
  ok(run.done.has('railride'), 'the Rail Ride (' + R.log.filter((e) => /grind|land|bail/.test(e.type)).map((e) => e.type + (e.name ? ':' + e.name : '') + (e.why ? ':' + e.why : '') + (e.covered != null ? ':' + e.covered.toFixed(2) : '')).join(' ') + ')'); }
/* the score tiers, and the clock */
{ const { R, run } = withRun({ at: [18, 0, 8], speed: 4 }); for (let i = 0; i < 6; i++) R.score.addTrick('Big ' + i, 600, {}); R.score.bank(); R.step(1);
  ok(run.done.has('warm'), 'a 15,000 run is Warm (' + R.score.total + ')'); run.left = 0.004; R.step(2); ok(run.left === 0 && run.ended, 'the clock runs out'); }
console.log(fail ? 'RUN GOALS: RED' : 'RUN GOALS: GREEN'); process.exit(fail ? 1 : 0);
