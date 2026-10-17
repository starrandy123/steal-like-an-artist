/* JUMPS FROM HEIGHT AND TIME (Waxline formulas; truth in tests/formulas.mjs) — the game-design method: choose the apex h and the time to it
 * t; gravity and the take-off speed follow, g = 2h/t², v = 2h/t. A fall under constant gravity is stepped exactly — the position by the
 * step's MEAN velocity — so the apex the design names is the apex the game reaches (a step by the velocity at its end lost v·dt/2: 1.9 cm
 * off an 85 cm ollie at 1/120 s, and the landing it predicted was not the one it made).
 *   fromApex(h, t) → { g, v } · speedFor(h, g) → v · timeFor(h, g) → t
 *   moved(p, v, g, dt): p by v (ALREADY lessened by g·dt this step) and the half-step of gravity it missed: p += v·dt + ½·g·dt² */
export const fromApex = (h, t) => ({ g: (2 * h) / (t * t), v: (2 * h) / t });
export const speedFor = (h, g) => Math.sqrt(2 * g * h);
export const timeFor = (h, g) => Math.sqrt((2 * h) / g);
export function moved(p, v, g, dt) { p[0] += v[0] * dt; p[1] += v[1] * dt + 0.5 * g * dt * dt; p[2] += v[2] * dt; return p; }
