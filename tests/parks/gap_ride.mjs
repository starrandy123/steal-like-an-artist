/* ONE RUN AT A GAP, AS A PLAYER RIDES IT (the reachability standard, orgo-u-53 10-17): the board starts ROLLING (≤ 3 m/s) where a player can
 * be, the left thumb is HELD FORWARD as a player holds it, until the line's own pop — the engine pushes whenever it would (body.js wantPush: rolling, 0.15 s after a landing, under 7.5 m/s; on any surface) — and the speed it has comes only from the push, the pump and the park. The thumb
 * does what the row says, through the real reader (tests/lib/rig.mjs): an ollie when the board passes a mark, a grab in every air out of a lip,
 * a manual pulled in the air so it lands in one, an ollie out of a grind. A gap is REACHED when it is found AND its combo BANKS — a combo
 * with no trick is dropped unpaid (score.js bank(), F10) and a bail before the bank loses it.
 * A row: { gap, at, heading, speed, pop: { axis: 0 | 2, le | ge }, grab, pull, out, secs, reported } (no pop: the line takes off on its own). */
import { rig, flick, pull } from '../lib/rig.mjs';

export const ROLLING = 3;   // m/s: the fastest a run may start and still prove a gap reachable (faster, it is a physics probe)

/* the row ridden; `mark` replaces the pop's mark (the design aid sweeps it) */
export function ride(world, gaps, row, mark) {
  const R = rig({ preset: 'cruise', at: row.at, heading: row.heading, speed: row.speed, world, gapList: gaps });
  const pop = row.pop || null, at = mark != null ? mark : pop ? (pop.le != null ? pop.le : pop.ge) : null, le = pop && pop.le != null;
  let popped = false, pulled = false, out = false, grindAt = null, popEnd = 0, grabbed = null, popSpeed = null, stood = null;
  for (let i = 0; i < Math.round((row.secs || 4) * 120); i++) {
    /* the thumb, not the ride, is the rule: held until the line's pop, and the engine decides what a held thumb does (10-17: a ride that let
       go at the first moment off the ground stopped pushing at the merged engine's drop-in and crest hops, where a player's thumb stays on;
       one that pushed only on flat ground pushed less than the game lets a player) */
    R.throttle = row.push !== false && !popped ? 1 : 0;
    if (pop && !popped && R.sk.state === 'roll' && (le ? R.sk.p[pop.axis] <= at : R.sk.p[pop.axis] >= at)) {
      popped = true; popEnd = R.thumb(flick('Ollie')); popSpeed = Math.hypot(R.sk.v[0], R.sk.v[2]);
    }
    if (row.pull && popped && !pulled && R.sk.state === 'air' && R.ms > popEnd + 15) { pulled = true; R.thumb(pull(22, 2500)); }
    if (row.out != null && grindAt != null && !out && R.sk.t - grindAt >= row.out && R.sk.state === 'grind') { out = true; R.thumb(flick('Ollie')); }
    /* every air out of a lip is grabbed, 60 ms in (the Indy's pull: tests/motion.mjs) */
    if (row.grab && R.sk.state === 'air' && R.sk.air && R.sk.air.vert && grabbed !== R.sk.air && R.ms - R.sk.air.t0 * 1000 > 60) { grabbed = R.sk.air; R.thumb(pull(40, 320, 90)); }
    const n0 = R.log.length; R.step(1);
    if (i === 11) stood = R.sk.state === 'roll' ? null : R.sk.state;   // the start stands on the park: rolling after its first tenth of a second
    for (const e of R.log.slice(n0)) if (e.type === 'grindStart' && grindAt == null) grindAt = R.sk.t;
  }
  return { R, reached: banked(R, row.gap), found: R.score.gapsFound.has(row.gap), popSpeed, stood };
}

/* the gap's line in the score's feed is followed by a bank before any loss */
export function banked(R, name) {
  const i = R.feed.findIndex((f) => f.kind === 'gap' && f.name === name); if (i < 0) return false;
  const next = R.feed.slice(i + 1).find((f) => f.kind === 'bank' || f.kind === 'lost'); return !!next && next.kind === 'bank';
}

/* what the run did, in a line */
export const story = (R) => R.log.filter((e) => /^(pop|land|grindStart|grindEnd|bail|takeoff|manualStart|manualEnd)$/.test(e.type)).map((e) => e.type
  + (e.why ? ':' + e.why : '') + (e.quality ? ':' + e.quality : '') + (e.covered != null ? ':' + e.covered.toFixed(1) + 'm' + (e.full ? ' full' : '') : '')
  + (e.type === 'manualEnd' ? ':' + e.time.toFixed(2) + 's' : '')).join(' ');
