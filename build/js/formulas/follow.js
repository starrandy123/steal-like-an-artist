/* FOLLOWERS — every smoothing in Waxline is one of these two, computed here and nowhere else (the owner, 10-16: "make sure all parts are
 * correctly implemented so we don't get bugs and wonder where it starts"). Their truth is tests/formulas.mjs.
 *
 * SECOND-ORDER DYNAMICS — the procedural-animation form:   k2·y'' + k1·y' + y = x + k3·x'
 *     k1 = z / (π f)   k2 = 1 / (2π f)²   k3 = r · z / (2π f)
 *   f    how fast (Hz)
 *   z    damping: 1 is critically damped (no overshoot); below 1 it overshoots a step by exp(−π z / √(1 − z²))
 *   r    response: 0 starts from rest; 1 answers the target's motion at once; with z = 1, r = 2 makes k3 = k1 — a steady ramp is followed
 *        with no lag at all (the body riding steadily on its legs), and a CHANGE of the target's rate lands on the follower at once
 *   cap  the most |y''| may be (for a vector, its length) — a person's own limit on how hard a turn or a stride can start
 *   Exact for a target moving at a steady rate through each step (the homogeneous part in closed form), so a path is the same at 30, 60,
 *   120 or 144 Hz; with a cap it sub-steps at 1/480 s, each sub-step exact where the cap is not reached and held at the cap where it is —
 *   exact wherever the cap does not bind, stable at any frequency.
 *   chase(P, s, x, dt): y follows a target x (a number, or {x, y, z}); the target's rate over the step is (x − its last value) / dt.
 *   carry(P, s, v, dt): the RELATIVE form, for a follower whose target is no position (an attitude): s.u is how far the follower is from
 *        where it would be on a steady target (u = y − x − (k3 − k1)·v), s.ud its rate, v the target's rate this step. The hips' gap and the
 *        trunk's lag are this u.
 *
 * FIRST-ORDER — y' = (x − y) / τ, exact: y += (x − y)·(1 − e^(−dt/τ)). ease(dt, τ) is that share.
 *
 * A TURN PLANNED TO A DEADLINE (10-17, the supervisor: the board's in-air straightening, its heading and its up, "a minimum-jerk turn planned
 * over the time to the landing ... A RE-PLAN NEVER STEPS"): planned(s, xT, T, dt) — from where it is (s.u its offset, s.ud its rate, s.udd
 * its acceleration: a number or {x, y, z}, each component its own) to rest on xT at T, the quintic of least jerk (Flash & Hogan 1985), and
 * one step dt along it. Planned anew each step from the state it reached — its acceleration carried — it is the same plan while nothing
 * changes (the least-jerk path is its own continuation) and never steps when the target or the deadline moves: its acceleration is the one
 * it had. With no deadline the same law runs on a fixed horizon T, a stable filter (its slowest root about T/3.6). From rest a turn Δ peaks
 * at 1.875 Δ/T in rate and 5.77 Δ/T² in acceleration (a critically damped spring timed to the same deadline starts at ω²Δ, front-loaded).
 * ...AT A PACE (planned(s, xT, T, dt, A)): never asking an acceleration over A of it, the plan makes the share λ of its turn D = xT − u it can
 * by the deadline, and the rest is not turned. Least jerk's acceleration is affine in its displacement — a(t) = a_free(t) + λ·k(t)·D, with
 * a_free the plan to rest where it is and k = (60/T²)·q(1−q)(1−2q), q = t/T — so at each of 15 instants |a| ≤ A (a vector's length) holds λ to
 * an interval: their meet's nearest to 1 is taken, or, when none keeps it inside A (its own rate cannot be brought to rest by then any
 * gentler), the λ that asks least. s.reach is the share planned. A share, never a later deadline: the plan still ends at rest at T. */

export function second({ f, z = 1, r = 0, cap = Infinity }) {
  const w = 2 * Math.PI * f;
  return { f, z, r, cap, w, k1: z / (Math.PI * f), k2: 1 / (w * w), k3: (r * z) / w };
}

const KEYS = ['x', 'y', 'z'];
const isVec = (a) => a !== null && typeof a === 'object';
const zero = (like) => (isVec(like) ? { x: 0, y: 0, z: 0 } : 0);

/* a fresh follower's state, sitting on `x` (a number or {x, y, z}) */
export function follower(x = 0) {
  return { u: zero(x), ud: zero(x), v: zero(x), x: isVec(x) ? { x: x.x, y: x.y, z: x.z } : x, y: isVec(x) ? { x: x.x, y: x.y, z: x.z } : x };
}

/* the homogeneous part, exactly: u'' = −w²u − 2zw u' over dt (one component) */
function exact(P, u0, v0, dt) {
  const w = P.w, z = P.z;
  if (Math.abs(z - 1) < 1e-4) { const c = v0 + w * u0, e = Math.exp(-w * dt); return [(u0 + c * dt) * e, (v0 - w * c * dt) * e]; }
  if (z < 1) {
    const a = z * w, b = w * Math.sqrt(1 - z * z), e = Math.exp(-a * dt), cs = Math.cos(b * dt), sn = Math.sin(b * dt);
    return [e * (u0 * cs + ((v0 + a * u0) / b) * sn), e * (v0 * cs - ((a * v0 + w * w * u0) / b) * sn)];
  }
  const q = w * Math.sqrt(z * z - 1), r1 = -z * w + q, r2 = -z * w - q, A = (v0 - r2 * u0) / (r1 - r2), B = u0 - A, e1 = Math.exp(r1 * dt), e2 = Math.exp(r2 * dt);
  return [A * e1 + B * e2, r1 * A * e1 + r2 * B * e2];
}

/* RELATIVE: advance s.u, s.ud with the target's rate v this step (a number, or {x, y, z}); returns s.u */
export function carry(P, s, v, dt) {
  if (!(dt > 0)) return s.u;
  const vec = isVec(s.u), ks = vec ? KEYS : [null], c = P.k3 - P.k1;
  /* the target's change of rate lands on the follower at the step's start: its offset by (k3 − k1)·Δv, its rate by Δv */
  if (vec) for (const k of ks) { const dv = v[k] - s.v[k]; s.u[k] -= c * dv; s.ud[k] -= dv; s.v[k] = v[k]; }
  else { const dv = v - s.v; s.u -= c * dv; s.ud -= dv; s.v = v; }
  if (!(P.cap < Infinity)) {
    if (vec) for (const k of ks) { const r = exact(P, s.u[k], s.ud[k], dt); s.u[k] = r[0]; s.ud[k] = r[1]; }
    else { const r = exact(P, s.u, s.ud, dt); s.u = r[0]; s.ud = r[1]; }
    return s.u;
  }
  /* capped (10-16, the supervisor's B): sub-steps of at most 1/480 s, each EXACT while the cap is not reached — the acceleration at the
     sub-step's start and at its end within the cap — and where it is, the acceleration held at the cap through the sub-step (a constant
     acceleration, itself stepped exactly). Exact wherever the cap does not bind, and stable at any frequency: an Euler sub-step of 1/480 s grew
     without end from about 76 Hz, and was 4 % off the exact path at 10 Hz */
  const n = Math.max(1, Math.ceil(dt * 480 - 1e-9)), h = dt / n, w2 = P.w * P.w, d2 = 2 * P.z * P.w;
  for (let i = 0; i < n; i++) {
    if (vec) {
      const a = { x: -w2 * s.u.x - d2 * s.ud.x, y: -w2 * s.u.y - d2 * s.ud.y, z: -w2 * s.u.z - d2 * s.ud.z }, l = Math.hypot(a.x, a.y, a.z);
      let ex = null;
      if (l <= P.cap) {
        ex = ks.map((q) => exact(P, s.u[q], s.ud[q], h));
        if (Math.hypot(...ex.map(([u1, v1]) => -w2 * u1 - d2 * v1)) > P.cap) ex = null;
      }
      if (ex) ks.forEach((q, j) => { s.u[q] = ex[j][0]; s.ud[q] = ex[j][1]; });
      else { const k = P.cap / l; for (const q of ks) { const aq = a[q] * k; s.u[q] += s.ud[q] * h + 0.5 * aq * h * h; s.ud[q] += aq * h; } }
    } else {
      const a = -w2 * s.u - d2 * s.ud; let ex = null;
      if (Math.abs(a) <= P.cap) { ex = exact(P, s.u, s.ud, h); if (Math.abs(-w2 * ex[0] - d2 * ex[1]) > P.cap) ex = null; }
      if (ex) { s.u = ex[0]; s.ud = ex[1]; }
      else { const ac = Math.sign(a) * P.cap; s.u += s.ud * h + 0.5 * ac * h * h; s.ud += ac * h; }
    }
  }
  return s.u;
}

/* ABSOLUTE: y follows the target x; returns s.y (a number, or the state's own {x, y, z}) */
export function chase(P, s, x, dt) {
  if (!(dt > 0)) return s.y;
  const vec = isVec(x), c = P.k3 - P.k1;
  const v = vec ? { x: (x.x - s.x.x) / dt, y: (x.y - s.x.y) / dt, z: (x.z - s.x.z) / dt } : (x - s.x) / dt;
  carry(P, s, v, dt);
  if (vec) for (const k of KEYS) { s.x[k] = x[k]; s.y[k] = x[k] + c * v[k] + s.u[k]; }
  else { s.x = x; s.y = x + c * v + s.u; }
  return s.y;
}

/* the follower's own rate, of the absolute form (y' = x' + u') — for a reading, or to hand on */
export const rateOf = (s, k = null) => (k === null ? s.v + s.ud : s.v[k] + s.ud[k]);

/* FIRST-ORDER */
export const ease = (dt, tau) => (tau <= 0 ? 1 : 1 - Math.exp(-dt / tau));
export const first = (tau, y, x, dt) => y + (x - y) * ease(dt, tau);
/* ...in place on {x, y, z} (a THREE.Vector3 too) */
export function firstV(tau, y, x, dt) { const e = ease(dt, tau); y.x += (x.x - y.x) * e; y.y += (x.y - y.y) * e; y.z += (x.z - y.z) * e; return y; }

/* THE PLANNED TURN (above): one component — the least-jerk quintic from (x0, v0, a0) to (xT, 0, 0) at T, at t = min(dt, T) */
function quintic(x0, v0, a0, xT, T, dt) {
  const d = xT - x0, T2 = T * T, T3 = T2 * T, T4 = T3 * T, T5 = T4 * T, t = Math.min(dt, T), t2 = t * t, t3 = t2 * t, t4 = t3 * t;
  const c2 = a0 / 2, c3 = (20 * d - 12 * v0 * T - 3 * a0 * T2) / (2 * T3), c4 = (-30 * d + 16 * v0 * T + 3 * a0 * T2) / (2 * T4), c5 = (12 * d - 6 * v0 * T - a0 * T2) / (2 * T5);
  return [x0 + v0 * t + c2 * t2 + c3 * t3 + c4 * t4 + c5 * t4 * t, v0 + 2 * c2 * t + 3 * c3 * t2 + 4 * c4 * t3 + 5 * c5 * t4, 2 * c2 + 6 * c3 * t + 12 * c4 * t2 + 20 * c5 * t3];
}
/* plannedAt(x0, v0, a0, xT, T, t): where the plan is at t — [x, v, a], one component (a look ahead along it: body.js predictLanding) */
export const plannedAt = (x0, v0, a0, xT, T, t) => quintic(x0, v0, a0, xT, T, t);
/* ...its acceleration at t on the plan to rest where it is (no displacement): one component */
function restAcc(v0, a0, T, t) {
  const T2 = T * T, c3 = (-12 * v0 * T - 3 * a0 * T2) / (2 * T2 * T), c4 = (16 * v0 * T + 3 * a0 * T2) / (2 * T2 * T2), c5 = (-6 * v0 * T - a0 * T2) / (2 * T2 * T2 * T);
  return a0 + 6 * c3 * t + 12 * c4 * t * t + 20 * c5 * t * t * t;
}
/* ...the share λ of the turn D the plan makes at its acceleration at most A (above: AT A PACE) */
function shareAt(s, D, T, A) {
  const ks = isVec(s.u) ? KEYS : [null], at = (o, k) => (k === null ? o : o[k]), DD = D.reduce((a, d) => a + d * d, 0);
  if (!(A < Infinity) || DD < 1e-18) return { lam: 1, fits: true };
  let lo = -Infinity, hi = Infinity; const rows = [];
  for (let i = 1; i < 16; i++) {
    const t = (T * i) / 16, q = t / T, k = (60 / (T * T)) * q * (1 - q) * (1 - 2 * q), af = ks.map((kk) => restAcc(at(s.ud, kk), at(s.udd, kk), T, t));
    /* |a_free + λ k D|² ≤ A²: k²|D|² λ² + 2k (a_free · D) λ + |a_free|² − A² ≤ 0 */
    const a2 = k * k * DD, b = 2 * k * af.reduce((a, x, j) => a + x * D[j], 0), c = af.reduce((a, x) => a + x * x, 0) - A * A;
    rows.push({ a2, b, c });
    if (a2 < 1e-18) { if (c > 0) { lo = Infinity; hi = -Infinity; } continue; }
    const disc = b * b - 4 * a2 * c; if (disc < 0) { lo = Infinity; hi = -Infinity; continue; }
    const r = Math.sqrt(disc); lo = Math.max(lo, (-b - r) / (2 * a2)); hi = Math.min(hi, (-b + r) / (2 * a2));
  }
  if (lo <= hi) return { lam: Math.min(hi, Math.max(lo, 1)), fits: true };
  /* none inside A: the λ whose most |a|² over the instants is least (each a parabola in λ: the least of their most lies between their bottoms) */
  const most = (l) => rows.reduce((m, r) => Math.max(m, r.a2 * l * l + r.b * l + r.c), -Infinity), bot = rows.filter((r) => r.a2 > 1e-18).map((r) => -r.b / (2 * r.a2));
  let L = Math.min(...bot), H = Math.max(...bot);
  for (let i = 0; i < 48; i++) { const m1 = L + (H - L) / 3, m2 = H - (H - L) / 3; if (most(m1) <= most(m2)) H = m2; else L = m1; }
  return { lam: (L + H) / 2, fits: false };
}
/* planned(s, xT, T, dt, A = Infinity): s = { u, ud, udd } (numbers or {x, y, z}); the state one step dt along the least-jerk plan to rest on
   xT at T — the share of the turn it makes at its acceleration at most A (s.reach) */
export function planned(s, xT, T, dt, A = Infinity) {
  const vec = isVec(s.u), ks = vec ? KEYS : [null], at = (o, k) => (k === null ? o : o[k]), D = ks.map((k) => at(xT, vec && isVec(xT) ? k : null) - at(s.u, k));
  /* ...and when no share keeps it inside A by the deadline (its own rate cannot be brought to rest by then: a deadline that came in sooner),
     the time it takes at A: the plan ends later, never faster than its pace (its rest planned past the deadline; s.late the time added) */
  let r = shareAt(s, D, T, A), Tp = T;
  for (let k = 0; k < 16 && !r.fits; k++) { Tp *= 1.25; r = shareAt(s, D, Tp, A); }
  if (!r.fits) Tp = T;   // (no time inside sixteen lengthenings: the one that asks least, at the deadline)
  const lam = r.fits ? r.lam : shareAt(s, D, T, A).lam; s.reach = lam; s.late = Tp - T; T = Tp;
  ks.forEach((k, j) => { const [x, v, a] = quintic(at(s.u, k), at(s.ud, k), at(s.udd, k), at(s.u, k) + lam * D[j], T, dt);
    if (k === null) { s.u = x; s.ud = v; s.udd = a; } else { s.u[k] = x; s.ud[k] = v; s.udd[k] = a; } });
  return s;
}
