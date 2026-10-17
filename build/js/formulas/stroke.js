/* THE STROKE'S FORCE (Waxline formulas; truth in tests/formulas.mjs): a push's force is a half sine over the WHOLE contact — nothing at the
 * plant, nothing at the lift (a toe-off ends at nothing), its integral the stroke's gain, its peak gain·π/(2T) held to the most a person
 * gives (aMax). The contact lasts while the board rolls `sweep` from the planted foot, counting the push's own gain (half of it, on average).
 *   plan({ want, speed, aMax, sweep, driveMax }) → { T, gain }: the contact's length and the gain it can give
 *   rate(u, gain, T): the acceleration at the share u of the contact (0 outside it) · peak(gain, T)
 *   gave(u0, u1, gain): the speed it gives between the shares u0 and u1 — the half sine's own integral, gain·(cos πu0 − cos πu1)/2, so the
 *   steps of a contact give its gain EXACTLY whatever their length (stepped as rate × dt, a short contact of 7 steps gave 98.3 % of it) */
export function plan({ want, speed, aMax, sweep, driveMax }) {
  let T = Math.min(driveMax, sweep / Math.max(speed, 0.01)), g = want;
  for (let i = 0; i < 3; i++) { g = Math.min(want, (aMax * 2 * T) / Math.PI); T = Math.min(driveMax, sweep / Math.max(speed + g / 2, 0.01)); }
  return { T, gain: Math.min(want, (aMax * 2 * T) / Math.PI) };
}
export const rate = (u, gain, T) => (u > 0 && u <= 1 ? ((gain * Math.PI) / (2 * T)) * Math.sin(Math.PI * u) : 0);
export const peak = (gain, T) => (gain * Math.PI) / (2 * T);
export function gave(u0, u1, gain) { const a = Math.min(1, Math.max(0, u0)), b = Math.min(1, Math.max(0, u1)); return b > a ? (gain * (Math.cos(Math.PI * a) - Math.cos(Math.PI * b))) / 2 : 0; }
