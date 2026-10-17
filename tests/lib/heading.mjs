/* THE BOARD'S HEADING NEVER STEPS ON THE GROUND (the supervisor, 10-16) — one reading for every wall that rides the sim (tests/lib/ride.mjs,
 * tests/camera_moving.mjs): through a sim step that began and ended rolling or in a manual, with no revert, the heading's turn about the
 * board's up against what the STEERING gives at its speed (the carve's own most: min(curv·v, lateral/v); the kickturn's below walking pace)
 * and what the FORCES along the surface turn its travel by (their part across its travel, over its speed) — and what the CATCH turned (body.js
 * stepGround `caught`: the spin assist's turn onto the line after a landing inside its window, at a rider's pace; its own gate is the landing
 * yaw's, which reads its frames: tests/lib/airyaw.mjs). An air spin is the air's.
 *   before(sk) → the step's start; after(b, sk, dt) → { ex (rad/s past what is given), yaw, allowed } or null (not a ground step) */
import { PHYSICS } from '../../build/js/config.js';

export const before = (sk) => ({ state: sk.state, fwd: sk.fwd.slice(), v: sk.v.slice(), speed: Math.hypot(...sk.v), revert: !!sk.revert });
const flat = (v, n) => { const d = v[0] * n[0] + v[1] * n[1] + v[2] * n[2]; return [v[0] - n[0] * d, v[1] - n[1] * d, v[2] - n[2] * d]; };
const ground = (s) => s === 'roll' || s === 'manual';
export function after(b, sk, dt) {
  if (!ground(b.state) || !ground(sk.state) || b.revert || sk.revert) return null;
  const u = sk.up, a = flat(b.fwd, u), c = flat(sk.fwd, u), la = Math.hypot(...a), lc = Math.hypot(...c); if (la < 1e-6 || lc < 1e-6) return null;
  const x = [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]], yaw = Math.abs(Math.atan2(x[0] * u[0] + x[1] * u[1] + x[2] * u[2], a[0] * c[0] + a[1] * c[1] + a[2] * c[2])) / dt;
  const C = PHYSICS.carve, sp = b.speed, steer = sp < C.kickturnBelow ? C.kickturnRate * Math.PI / 180 : Math.min(C.curv * sp, C.lateral / Math.max(sp, 1e-3));
  const g = flat([0, -PHYSICS.gGround, 0], u), d = sp > 1e-3 ? b.v.map((q) => q / sp) : c.map((q) => q / lc);
  const across = Math.abs((g[1] * d[2] - g[2] * d[1]) * u[0] + (g[2] * d[0] - g[0] * d[2]) * u[1] + (g[0] * d[1] - g[1] * d[0]) * u[2]), forces = across / Math.max(sp, 0.5);
  const caught = (sk.caught || 0) / dt;
  return { ex: yaw - steer - forces - caught, yaw, allowed: steer + forces + caught };
}
