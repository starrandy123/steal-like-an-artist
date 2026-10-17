/* THE BODY CARRIED AT THE LEGS' LIMIT (10-17, the class): the trunk's attitude follower (view/skater.js st.att — the body = R(y)·board, its gap
 * y held to LEGS.tilt) read frame by frame. At the limit the board carries the body, so the gap's direction may not swing while it is held
 * there: held with only its outward rate taken, the body slid round the legs' limit — off the Deck Quarter's slant on Cruise the gap turned
 * 171° at the limit in 0.2 s, her trunk 42° back from the board and her head against the ramp (the camera found no place that saw her).
 * Reported beside it: the frames held at the limit and the longest hold (a body the board drags), and the most the trunk leans past its own
 * lean at rest (the line from the hips to the head against the board's up). One reader: the surfaces wall's (tests/lib/ride.mjs) and the
 * camera wall's airs (tests/camera_moving.mjs). */
import { LEGS } from '../../build/js/config.js';

/* swing: the most the gap's direction may turn while held at the limit (°; a numerical allowance — carried, it reads 0.0 over every air of
   every assist); hold: the longest hold at the limit that is only REPORTED (frames at 60 a second; a longer one is named) */
export const GAP = { swing: 1, hold: 6 };
const D = 180 / Math.PI;

export function gapReader() {
  const R = { capFrames: 0, hold: 0, holdAt: '', swing: 0, swingAt: '', lean: 0, leanAt: '' };
  let capDir = null, run = 0, rest = null;
  /* att: the follower's state (st.att); hips, head: their world positions ({x, y, z}); up: the board's up ([x, y, z]); at: the frame's label */
  R.frame = (att, hips, head, up, at) => {
    if (!att) { capDir = null; run = 0; return; }
    const L = att.y.length();
    if (L >= LEGS.tilt - 1e-6) {
      R.capFrames++; run++; if (run > R.hold) { R.hold = run; R.holdAt = at; }
      const d = att.y.clone().divideScalar(L);
      if (!capDir) capDir = d;
      else { const a = Math.acos(Math.max(-1, Math.min(1, d.dot(capDir)))) * D; if (a > R.swing) { R.swing = a; R.swingAt = at; } }
    } else { capDir = null; run = 0; }
    if (hips && head && up) {
      const tx = head.x - hips.x, ty = head.y - hips.y, tz = head.z - hips.z, tl = Math.hypot(tx, ty, tz);
      if (tl > 1e-6) {
        const ang = Math.acos(Math.max(-1, Math.min(1, (tx * up[0] + ty * up[1] + tz * up[2]) / tl))) * D;
        if (rest == null) rest = ang; else if (ang - rest > R.lean) { R.lean = ang - rest; R.leanAt = at; }
      }
    }
  };
  /* a fall's frames are the fall's: the hold and the swing start again after it */
  R.reset = () => { capDir = null; run = 0; };
  return R;
}
