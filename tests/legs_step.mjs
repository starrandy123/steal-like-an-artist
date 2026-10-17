/* THE LEGS SETTLE (10-16, the supervisor's wall for the body on its legs: "after a step in the board's motion the offset settles with
 * overshoot ≤ 10 % of its excursion and at most one change of sign — a wobbly body is the opposite of smooth"). The real pose (skater.js) on a
 * board moved by hand, nothing else changing: the pose's input held (rolling, no stroke, no landing — the pose's own dip at a landing is
 * another motion, and on the park it read as overshoot of a spring that has none), so what moves is the springs alone.
 *   1. A STEP IN THE BOARD'S SPEED: falling at 3 m/s, then stopped at once (a landing's step). The hips' gap along the board's up.
 *   2. STEPS IN THE BOARD'S TURN: from rest into a steady pitch, held a second, then stopped. The trunk's lag behind the board's attitude.
 * Each: its excursion, what comes back past zero (overshoot ≤ 10 %), its changes of sign (≤ 1, a 2 mm / 0.2° dead band). */
import * as THREE from '../build/vendor/three/build/three.module.min.js';
import { rigSkater } from '../build/js/view/skater.js';
import { boardOnFrame, poseInput } from '../build/js/view/figure.js';
import { rig as simRig } from './lib/rig.mjs';
import { flatWorld } from './lib/figure.mjs';
import { RING } from './lib/legs.mjs';

let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const DT = 1 / 60;
/* a held pose input: a real sim's read, rolling on the flat */
const template = () => { const R = simRig({ world: flatWorld(), at: [150, 0, 100], heading: 90, speed: 4 }); R.step(10); const s = poseInput(R.sk); s.stroke = null; s.glide = false; return s; };
const settle = (vals, dead) => {
  let ext = 0; for (const x of vals) if (Math.abs(x) > Math.abs(ext)) ext = x;
  const s0 = Math.sign(ext); let over = 0, signs = 0, last = 0;
  for (const x of vals) { if (Math.sign(x) === -s0) over = Math.max(over, Math.abs(x)); const sg = Math.abs(x) < dead ? 0 : Math.sign(x); if (sg && last && sg !== last) signs++; if (sg) last = sg; }
  return { ext, over, r: over / Math.max(1e-9, Math.abs(ext)), signs };
};

/* 1. the speed's step */
{
  const F = rigSkater(), board = new THREE.Group(); board.add(F.rig);
  const s = template(), p = s.p.slice(), vals = [];
  for (let f = 0; f < 120; f++) {
    const t = f * DT, falling = t < 0.5, v = [4, falling ? -3 : 0, 0];
    for (let k = 0; k < 3; k++) p[k] += v[k] * DT;
    Object.assign(s, { p: p.slice(), v, speed: Math.hypot(...v), up: [0, 1, 0] });
    boardOnFrame(board, s); F.pose(DT, s); board.updateMatrixWorld(true);
    if (!falling && F.state.legs) vals.push(F.state.legs.u.y);
  }
  const R = settle(vals, 0.002);
  ok(Math.abs(R.ext) > 0.01 && R.r <= RING.overshoot && R.signs <= RING.signs, 'THE LEGS SETTLE after the board\'s speed steps (falling at 3 m/s, stopped at once): the hips go ' + (R.ext * 100).toFixed(1) + ' cm along its up and come back ' + (R.over * 100).toFixed(1) + ' cm past it (' + (R.r * 100).toFixed(0) + ' %, ≤ ' + RING.overshoot * 100 + '), ' + R.signs + ' change' + (R.signs === 1 ? '' : 's') + ' of sign (≤ ' + RING.signs + ')');
}
/* 2. the turn's steps: from rest into a steady pitch (1.2 rad/s), held a second (the lag dies away: none in a steady turn), then stopped —
   each step read in its own window, on a spring at rest when it lands (stopped while still lagging, a test read two steps as one overshoot) */
{
  const F = rigSkater(), board = new THREE.Group(); board.add(F.rig);
  const s = template(), p = s.p.slice(), win = [[], []]; let pitch = 0;
  for (let f = 0; f < 150; f++) {
    const t = f * DT, turning = t >= 0.2 && t < 1.2; if (turning) pitch += 1.2 * DT;
    for (let k = 0; k < 3; k++) p[k] += [4, 0, 0][k] * DT;
    const up = [Math.sin(pitch), Math.cos(pitch), 0], fwd = [Math.cos(pitch), -Math.sin(pitch), 0];
    Object.assign(s, { p: p.slice(), v: [4, 0, 0], speed: 4, up, fwd });
    boardOnFrame(board, s); F.pose(DT, s); board.updateMatrixWorld(true);
    if (F.state.att) { if (t >= 0.2 && t < 1.2) win[0].push(F.state.att.y.z); else if (t >= 1.2) win[1].push(F.state.att.y.z); }   // the lag about the pitch axis (z), rad
  }
  for (const [i, what] of [[0, 'into a turn (from rest to 1.2 rad/s)'], [1, 'out of it (stopped)']]) {
    const R = settle(win[i], 0.2 * Math.PI / 180);
    ok(Math.abs(R.ext) > 0.02 && R.r <= RING.overshoot && R.signs <= RING.signs, 'THE TRUNK SETTLES ' + what + ': it lags ' + (R.ext * 180 / Math.PI).toFixed(1) + '° and comes back ' + (R.over * 180 / Math.PI).toFixed(1) + '° past it (' + (R.r * 100).toFixed(0) + ' %, ≤ ' + RING.overshoot * 100 + '), ' + R.signs + ' change' + (R.signs === 1 ? '' : 's') + ' of sign (≤ ' + RING.signs + ')');
  }
}
console.log('LEGS STEP: ' + (fail ? 'RED · ' + fail : 'GREEN'));
process.exit(fail ? 1 : 0);
