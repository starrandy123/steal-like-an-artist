/* A SKATER ON THE REAL PARK, DRIVEN BY A SYNTHETIC THUMB: the real reader (js/input/reader.js) gets samples at their own times, the real sim
 * (js/sim/body.js) steps at 120 Hz with what the reader said, and the real score (js/sim/score.js) reads the sim's events — the chain the
 * page runs, without the page. Thumbs are built by the helpers below; directions: 0 = up the screen, -90 = left, +90 = right. */
import { World } from '../../build/js/sim/world.js';
import { Skater } from '../../build/js/sim/body.js';
import { Score, Gaps } from '../../build/js/sim/score.js';
import { Reader, strokeOf } from '../../build/js/input/reader.js';
import { PHYSICS, ASSISTS, TRICKS } from '../../build/js/config.js';

const CTX = { roll: 'ground', manual: 'manual', air: 'air', grind: 'grind', lip: 'lip', bail: 'bail' };
let shared = null;
/* every step of every rig: what the HUD's combo box would say (score.live) — read by the sweeps (tricks_reachable: never "0 × 0") */
export const liveCensus = { steps: 0, shown: 0, empty: [] };
export function rig({ preset = 'cruise', at, heading = 90, speed = 0, seed = 1, world: own = null, gapList = undefined } = {}) {
  const world = own || shared || (shared = new World());
  const sk = new Skater(world, { preset, seed }); sk.assist = Object.assign({ name: preset }, ASSISTS[preset]);
  const score = new Score(), gaps = new Gaps(world, gapList), reader = new Reader({ streamlined: sk.assist.streamlined });   // a park's own gaps (the Plaza's by default)
  reader.context = () => CTX[sk.state] || 'ground';
  if (at) sk.respawnAt(at, heading, speed);
  const dt = PHYSICS.step, queue = [], log = [], feed = [];
  const R = { world, sk, score, gaps, reader, log, feed, ms: 0, steer: 0, throttle: 0 };
  R.step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      R.ms += dt * 1000;
      while (queue.length && queue[0].t <= R.ms) { const q = queue.shift(); if (q.kind === 'down') reader.down(q.t, q.x, q.y); else if (q.kind === 'move') reader.move(q.t, q.x, q.y); else reader.up(q.t, q.x, q.y); }
      reader.tick(R.ms);
      const events = reader.drain();
      sk.step(dt, { steer: R.steer, throttle: R.throttle, events: R.keys ? events.concat(R.keys.splice(0)) : events, hold: reader.hold, load: R.load || 0, pushTap: false, golden: score.golden });
      score.onEvents(sk.events, sk); gaps.onEvents(sk.events, sk, score); score.step(dt, sk);
      { const L = score.live(sk); liveCensus.steps++; if (L && L.names.length) { liveCensus.shown++; if (L.mult < 1 || L.sum < 1) liveCensus.empty.push(L.names.join(' + ') + ' ' + L.sum + ' × ' + L.mult); } }
      for (const e of sk.events) log.push(Object.assign({ ms: Math.round(R.ms) }, e));
      while (score.feed.length) feed.push(Object.assign({ ms: Math.round(R.ms) }, score.feed.shift()));
    }
  };
  R.secs = (s) => R.step(Math.round(s / dt));
  /* a thumb: [ [dtMs, x, y], ... ] relative to where it lands; 'down' at the first, 'up' after the last */
  R.thumb = (pts, startMs = R.ms + 1) => {
    let t = startMs; const x0 = 300, y0 = 600;
    queue.push({ kind: 'down', t, x: x0 + pts[0][1], y: y0 + pts[0][2] });
    for (let i = 1; i < pts.length; i++) { t += pts[i][0]; queue.push({ kind: 'move', t, x: x0 + pts[i][1], y: y0 + pts[i][2] }); }
    queue.push({ kind: 'up', t: t + 1, x: x0 + pts[pts.length - 1][1], y: y0 + pts[pts.length - 1][2] });
    queue.sort((a, b) => a.t - b.t);
    return t;
  };
  R.until = (pred, maxS = 6) => { for (let i = 0; i < maxS / dt; i++) { R.step(1); if (pred()) return true; } return false; };
  R.tricks = () => feed.filter((f) => f.kind === 'trick').map((f) => f.name);
  R.banked = () => feed.filter((f) => f.kind === 'bank');
  R.says = (type) => log.filter((e) => e.type === type);
  return R;
}

/* ---- thumbs (8.3 ms samples, a smooth minimum-jerk stroke) ---- */
const SAMPLE = 1000 / 120;
const mj = (u) => 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;
/* a flick: a load (down 40 px, or up for a nollie), a breath, then the trick's own stroke from config */
export function flick(name, o = {}) {
  const f = TRICKS.flips.find((x) => x.name === name); if (!f) throw new Error('no flip ' + name);
  const load = o.load == null ? 40 : o.load, loadMs = o.loadMs || 90, hold = o.hold == null ? 25 : o.hold, loop = f.stroke.kind === 'loop';
  const len = o.len || (loop ? 120 : 90), ms = o.ms || (loop ? 150 : 70), sgn = o.nollie ? -1 : 1, pts = [[0, 0, 0]];
  for (let t = SAMPLE; t <= loadMs; t += SAMPLE) pts.push([SAMPLE, 0, sgn * load * mj(t / loadMs)]);
  for (let t = SAMPLE; t <= hold; t += SAMPLE) pts.push([SAMPLE, 0, sgn * load]);
  const shape = strokeOf(f.stroke, len, 40); let prev = 0;
  for (let t = SAMPLE; t <= ms + 0.01; t += SAMPLE) {
    const u = Math.min(1, t / ms), k = Math.round(mj(u) * 40), p = shape[k];
    pts.push([SAMPLE, p.x, sgn * load + sgn * p.y]); prev = k;
  }
  void prev; return pts;
}
/* a still pull (a manual on the ground, a lip hold at the coping): down `depth` px over 60 ms, then held for `ms` */
export function pull(depth, ms, dir = 180) {
  const a = dir * Math.PI / 180, pts = [[0, 0, 0]];
  for (let t = SAMPLE; t <= 60; t += SAMPLE) { const u = mj(t / 60); pts.push([SAMPLE, Math.sin(a) * depth * u, -Math.cos(a) * depth * u]); }
  for (let t = SAMPLE; t <= ms; t += SAMPLE) pts.push([SAMPLE, Math.sin(a) * depth, -Math.cos(a) * depth]);
  return pts;
}
/* a fast sideways swipe with no load (a revert) */
export function swipe(side) { const pts = [[0, 0, 0]]; for (let t = SAMPLE; t <= 60; t += SAMPLE) pts.push([SAMPLE, side * 80 * mj(t / 60), 0]); return pts; }
export const tap = () => [[0, 0, 0], [SAMPLE, 1, 0], [SAMPLE, 1, 1]];
