/* THE FIXED STEP (Waxline formulas; truth in tests/formulas.mjs): a clock that turns each frame's time into whole simulation steps, so the
 * same inputs give the same game at any frame rate. At most `maxSteps` a frame: a long frame (a tab switched back, a stall) runs that many
 * and drops the rest — counted in `dropped`, never run late, never a spiral of ever-longer frames.
 *   const C = clock(1 / 120, 6); advance(C, dt, (step, i) => sim.step(step)) → the steps it ran; C.dropped, and C.acc / C.step to blend */
export const clock = (step, maxSteps) => ({ step, maxSteps, acc: 0, dropped: 0 });
export function advance(C, dt, run) {
  C.acc += dt; let n = 0;
  while (C.acc >= C.step && n < C.maxSteps) { run(C.step, n); C.acc -= C.step; n++; }
  if (C.acc >= C.step) { C.dropped += Math.floor(C.acc / C.step); C.acc = 0; }
  return n;
}

/* THE BLEND (Glenn Fiedler, "Fix Your Timestep!", its last section): a frame is drawn BETWEEN the last two steps, at alpha — what is left
 * of the frame's time, over a step. Then the drawn instant moves by exactly each frame's own time, whatever whole steps ran under it: at 90 Hz
 * the steps run 1,1,2 and at 144 Hz one frame in six runs none, and drawn at the newest step those frames moved 0.75×, 1.5× or not at all.
 * It lags the newest step by at most one step (1/120 s). Positions mix; attitudes turn the short way between them (slerp).
 *   alpha(C) · mix(a, b, t) · mix3(a, b, t, out) · slerpFrame(upA, fwdA, upB, fwdB, t) → { up, fwd } (each frame an up and a heading) */
export const alpha = (C) => Math.min(1, Math.max(0, C.acc / C.step));
export const mix = (a, b, t) => a + (b - a) * t;
export function mix3(a, b, t, out = [0, 0, 0]) { out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t; return out; }
/* a frame's rotation as a quaternion [x, y, z, w]: its columns side (up × fwd), up, and fwd squared to up */
function quatOf(up, fwd) {
  const y = norm(up), xs = norm(cross(y, fwd)), z = cross(xs, y);
  const m00 = xs[0], m11 = y[1], m22 = z[2], tr = m00 + m11 + m22; let q;
  if (tr > 0) { const s = 0.5 / Math.sqrt(tr + 1); q = [(y[2] - z[1]) * s, (z[0] - xs[2]) * s, (xs[1] - y[0]) * s, 0.25 / s]; }
  else if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); q = [0.25 * s, (y[0] + xs[1]) / s, (z[0] + xs[2]) / s, (y[2] - z[1]) / s]; }
  else if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); q = [(y[0] + xs[1]) / s, 0.25 * s, (z[1] + y[2]) / s, (z[0] - xs[2]) / s]; }
  else { const s = 2 * Math.sqrt(1 + m22 - m00 - m11); q = [(z[0] + xs[2]) / s, (z[1] + y[2]) / s, 0.25 * s, (xs[1] - y[0]) / s]; }
  return q;
}
const rot = (q, v) => { const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; };
export function slerpFrame(upA, fwdA, upB, fwdB, t) {
  const a = quatOf(upA, fwdA); let b = quatOf(upB, fwdB), d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  if (d < 0) { b = b.map((c) => -c); d = -d; }                      // the short way round
  let k0, k1;
  if (d > 0.9995) { k0 = 1 - t; k1 = t; }                            // all but the same: a straight mix, normalised
  else { const th = Math.acos(d), s = Math.sin(th); k0 = Math.sin((1 - t) * th) / s; k1 = Math.sin(t * th) / s; }
  const q = [0, 1, 2, 3].map((i) => k0 * a[i] + k1 * b[i]), l = Math.hypot(...q); for (let i = 0; i < 4; i++) q[i] /= l;
  return { up: rot(q, [0, 1, 0]), fwd: rot(q, [0, 0, 1]) };
}
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
