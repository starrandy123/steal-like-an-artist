/* THE FORMULAS' OWN TRUTH (10-16, the owner: "make sure all parts are correctly implemented so we don't get bugs and wonder where it
 * starts"): each standard formula in build/js/formulas/ against its closed form or its defining property, on its own, before any game wall
 * reads what it drives. Every line names its bound; each formula has a plant of a classic bug in it (tests/plants.mjs) that turns its line
 * RED. Seconds, no browser.
 *   follow.js   the second-order follower's step response (z = 1) and overshoot (z < 1) against their closed forms; stable at a long step;
 *               the same path at 30, 60, 120 and 144 Hz; the cap held on every step; r = 2 follows a ramp with no lag; first-order exact;
 *               the planned turn (least jerk to a deadline): the closed form re-planned every step, its peaks, at rest at its deadline, a new
 *               target never stepping its acceleration, and its pace (the share it makes, never more than A)
 *   contact.js  the plane through four contacts over a seam of known angle; three contacts; degenerate cases; the sign up
 *   edge.js     the deck's underside against an edge: exact against a walk, turned with the scene; a board high-centred on a ridge
 *   step.js     a replay of the real sim is byte-identical; frames of any length sum to the same steps; a long frame never spirals
 *   jump.js     the stepped apex and its time match h and t
 *   stroke.js   the force integrates to the gain, is nothing at the plant and the lift, and its peak is held to the cap */
import { second, follower, carry, chase, first, ease, planned } from '../build/js/formulas/follow.js';
import { plane, support } from '../build/js/formulas/contact.js';
import { deckOver, restOn } from '../build/js/formulas/edge.js';
import { clock, advance, alpha, mix, slerpFrame } from '../build/js/formulas/step.js';
import { fromApex, speedFor, timeFor, moved } from '../build/js/formulas/jump.js';
import { plan, rate, peak, gave } from '../build/js/formulas/stroke.js';
import { rig } from './lib/rig.mjs';
import { flatWorld } from './lib/figure.mjs';
import { PHYSICS, BOARD } from '../build/js/config.js';

let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const fx = (v, n = 2) => (Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(1) : v.toFixed(n));

/* ---- the follower ---- */
{
  /* 1. the step response, critically damped: from 1 below a still target, at rest — 1 − (1 + ωt)·e^(−ωt) */
  const P = second({ f: 2, z: 1 }), s = follower(1), dt = 1 / 120; s.u = -1; let worst = 0;
  for (let i = 1; i <= 240; i++) { carry(P, s, 0, dt); const t = i * dt, want = -(1 + P.w * t) * Math.exp(-P.w * t); worst = Math.max(worst, Math.abs(s.u - want)); }
  ok(worst < 1e-9, 'THE FOLLOWER\'S STEP RESPONSE, critically damped, against 1 − (1 + ωt)e^(−ωt) at 120 Hz: off by at most ' + fx(worst, 12) + ' (< 1e-9)');
  /* 2. underdamped: its closed form, and the peak overshoot exp(−πz/√(1 − z²)) */
  const z = 0.3, Q = second({ f: 2, z }), q = follower(1), a = z * Q.w, b = Q.w * Math.sqrt(1 - z * z); q.u = -1; let wq = 0, peakO = 0;
  for (let i = 1; i <= 4000; i++) { const h = 1 / 2000; carry(Q, q, 0, h); const t = i * h, want = -Math.exp(-a * t) * (Math.cos(b * t) + (a / b) * Math.sin(b * t)); wq = Math.max(wq, Math.abs(q.u - want)); peakO = Math.max(peakO, q.u); }
  const over = Math.exp(-Math.PI * z / Math.sqrt(1 - z * z));
  ok(wq < 1e-9 && Math.abs(peakO - over) < 1e-4, 'UNDERDAMPED (z 0.3): its closed form to ' + fx(wq, 12) + ' (< 1e-9), its overshoot ' + peakO.toFixed(4) + ' against exp(−πz/√(1−z²)) = ' + over.toFixed(4) + ' (within 1e-4)');
  /* 3. stable at a long step: f 20 Hz stepped at 0.1 s (ωdt = 12.6) — settled, never above where it began */
  const L = second({ f: 20, z: 1 }), l = follower(1); l.u = -1; let maxL = 0;
  for (let i = 0; i < 10; i++) { carry(L, l, 0, 0.1); maxL = Math.max(maxL, Math.abs(l.u), Math.abs(l.ud) / L.w); }
  ok(maxL <= 1 + 1e-9 && Math.abs(l.u) < 1e-3, 'STABLE AT A LONG STEP: f 20 Hz stepped at 0.1 s (ωdt ' + (L.w * 0.1).toFixed(1) + '): never past ' + maxL.toFixed(3) + ' of where it began (≤ 1), ' + fx(Math.abs(l.u), 4) + ' left after 1 s (< 1e-3)');
  /* 4. the same path at 30, 60, 120 and 144 Hz: a target that ramps, holds and turns back (its corners on sixths of a second), read on the
     sixths; and a first-order follower of a target that steps on the sixths */
  const target = (t) => (t < 0.5 ? 2 * t : t < 1 ? 1 : t < 1.5 ? 1 - 3 * (t - 1) : -0.5);
  const run2 = (hz, Pp) => { const s2 = follower(0), out = []; for (let i = 1; i <= hz * 2; i++) { chase(Pp, s2, target(i / hz), 1 / hz); if (i % (hz / 6) === 0) out.push(s2.y); } return out; };
  const run1 = (hz) => { let y = 0; const out = []; for (let i = 1; i <= hz * 2; i++) { y = first(0.15, y, target(Math.ceil((i / hz) * 6 - 1e-9) / 6 - 1 / 6), 1 / hz); if (i % (hz / 6) === 0) out.push(y); } return out; };
  let dr = 0, d1 = 0;
  for (const Pp of [second({ f: 3, z: 1 }), second({ f: 2, z: 0.4, r: 1 }), second({ f: 5, z: 1, r: 2 })]) { const ref = run2(120, Pp); for (const hz of [30, 60, 144]) run2(hz, Pp).forEach((v, i) => { dr = Math.max(dr, Math.abs(v - ref[i])); }); }
  { const ref = run1(120); for (const hz of [30, 60, 144]) run1(hz).forEach((v, i) => { d1 = Math.max(d1, Math.abs(v - ref[i])); }); }
  ok(dr < 1e-9 && d1 < 1e-9, 'THE SAME PATH AT 30, 60, 120 AND 144 HZ: the second-order followers (critically damped, underdamped, r 1 and r 2) apart by at most ' + fx(dr, 12) + ', the first-order ' + fx(d1, 12) + ' (each < 1e-9)');
  /* 5. the cap: a turn's rate stepping 7 rad/s, then back — the follower's acceleration held to 43 rad/s² on every step, and it settles */
  const C = second({ f: 1.2, z: 1, r: 2, cap: 43 }), c = follower(0); let worstA = 0;
  /* (its acceleration is the change of its own rate, v + ud: a change of the TARGET's rate moves v and ud the opposite ways, the follower's
     rate not at all — what is read is the step's change of ud after that) */
  for (let i = 0; i < 180; i++) { const v = i >= 10 && i < 14 ? 7 : 0, ud0 = c.ud - (v - c.v), dt2 = 1 / 60; carry(C, c, v, dt2); worstA = Math.max(worstA, Math.abs(c.ud - ud0) / dt2); }
  ok(worstA <= 43 + 1e-6 && Math.abs(c.u) < 1e-3, 'THE CAP HELD: a turn\'s rate stepping 7 rad/s and back, the follower\'s acceleration at most ' + worstA.toFixed(2) + ' rad/s² on any step (≤ 43), and it settles (' + fx(Math.abs(c.u), 4) + ' left after 3 s)');
  /* 5b. the supervisor's B: a capped follower whose cap never binds IS the exact one — at 30, 60, 120 and 144 Hz, for f up to 200 Hz,
     critically damped and underdamped, from 1 off and moving — and a capped one that binds hard never grows */
  { let worstE = 0, grew = 0, at = '';
    for (const f of [0.5, 2, 10, 40, 76, 120, 200]) for (const z of [1, 0.4]) for (const hz of [30, 60, 120, 144]) {
      const U = second({ f, z, r: 2 }), Kc = second({ f, z, r: 2, cap: 1e12 }), a = follower(0), b = follower(0); a.u = 1; a.ud = -3; b.u = 1; b.ud = -3;
      for (let i = 0; i < hz * 2; i++) { const v = i % 37 === 0 ? 2 : 0; carry(U, a, v, 1 / hz); carry(Kc, b, v, 1 / hz); const e = Math.abs(a.u - b.u) + Math.abs(a.ud - b.ud) / U.w; if (e > worstE) { worstE = e; at = 'f ' + f + ' Hz, z ' + z + ', at ' + hz + ' Hz'; } }
    }
    for (const f of [76, 120, 200]) for (const hz of [30, 60, 144]) {   // the cap binding all the way: 1 off, a cap of a hundredth of the pull it would take
      const Kc = second({ f, z: 1, r: 2, cap: 1e-2 * (2 * Math.PI * f) ** 2 }), c = follower(0); c.u = 1;
      for (let i = 0; i < hz * 4; i++) { carry(Kc, c, 0, 1 / hz); if (Math.abs(c.u) > 1 + 1e-9 || !Number.isFinite(c.u)) { grew++; break; } }
    }
    ok(worstE < 1e-9 && grew === 0, 'THE CAP UNREACHED IS THE EXACT PATH: a capped follower whose cap never binds against the uncapped one, f 0.5–200 Hz, z 1 and 0.4, stepped at 30–144 Hz — at most ' + fx(worstE, 12) + ' apart (< 1e-9; ' + at + '); bound hard at 76–200 Hz, ' + (grew ? grew + ' grew' : 'none grew past where it began'));
  }
  /* 6. r = 2 (z 1) follows a steady ramp with no lag; r = 0 lags it by k1·rate */
  const R2 = second({ f: 2, z: 1, r: 2 }), R0 = second({ f: 2, z: 1, r: 0 }), a2 = follower(0), a0 = follower(0);
  for (let i = 1; i <= 600; i++) { chase(R2, a2, 3 * i / 120, 1 / 120); chase(R0, a0, 3 * i / 120, 1 / 120); }
  ok(Math.abs(a2.y - 15) < 1e-9 && Math.abs(15 - a0.y - R0.k1 * 3) < 1e-6, 'A STEADY RAMP: r 2 follows it with no lag (' + fx(Math.abs(a2.y - 15), 12) + ' off), r 0 behind by k1·rate (' + (15 - a0.y).toFixed(4) + ' m against ' + (R0.k1 * 3).toFixed(4) + ')');
  ok(Math.abs(ease(1 / 60, 0.1) - (1 - Math.exp(-1 / 6))) < 1e-15, 'FIRST-ORDER: its share of the way in dt is 1 − e^(−dt/τ)');
  /* 7. THE PLANNED TURN (planned: least jerk to a deadline, re-planned every step from where it is, its acceleration carried — Flash & Hogan
     1985). (a) re-planned every step to the same target and deadline it IS the one quintic, x = Δ(10s³ − 15s⁴ + 6s⁵), and ends at rest, its
     acceleration nothing, at 30–144 Hz; (b) from rest its peaks are 1.875 Δ/T in rate and 5.77 Δ/T² in acceleration; (c) a target moved
     mid-plan: the acceleration never steps — its largest change in a step halves as the step halves (it is continuous), where a spring's
     is ω² × the move at every rate; (d) at a pace A: never more than A, the share it plans A·T²/(5.77 Δ) from rest, still at rest at T; a
     vector's share keeps its direction */
  { const D = 0.37, T0 = 0.17; let worstX = 0, endWorst = 0, pkA = 0, pkV = 0;
    for (const hz of [30, 60, 120, 144]) { const s = { u: -D, ud: 0, udd: 0 }, dt = 1 / hz; let t = 0;
      while (T0 - t > 1e-12) { planned(s, 0, T0 - t, dt); t = Math.min(T0, t + dt); const q = t / T0, want = -D + D * (10 * q ** 3 - 15 * q ** 4 + 6 * q ** 5); worstX = Math.max(worstX, Math.abs(s.u - want));
        if (hz === 144) { pkA = Math.max(pkA, Math.abs(s.udd)); pkV = Math.max(pkV, Math.abs(s.ud)); } }
      endWorst = Math.max(endWorst, Math.abs(s.u), Math.abs(s.ud), Math.abs(s.udd)); }
    ok(worstX < 1e-9 && endWorst < 1e-9, 'THE PLANNED TURN IS ITS QUINTIC: re-planned every step to its deadline at 30, 60, 120 and 144 Hz it follows Δ(10s³ − 15s⁴ + 6s⁵) to ' + fx(worstX, 12) + ' (< 1e-9) and ends at rest, its acceleration nothing (' + fx(endWorst, 12) + ')');
    ok(Math.abs(pkV / (1.875 * D / T0) - 1) < 0.01 && Math.abs(pkA / (5.77 * D / (T0 * T0)) - 1) < 0.02, 'ITS PEAKS FROM REST: the rate ' + pkV.toFixed(3) + ' rad/s against 1.875 Δ/T = ' + (1.875 * D / T0).toFixed(3) + ' (within 1 %), the acceleration ' + pkA.toFixed(1) + ' against 5.77 Δ/T² = ' + (5.77 * D / (T0 * T0)).toFixed(1) + ' (within 2 %, read at 144 Hz)');
    const jumpStep = (hz, spring) => { const dt = 1 / hz, s = spring ? follower(0) : { u: -D, ud: 0, udd: 0 }, P = second({ f: 40 / (2 * Math.PI), z: 1 }); if (spring) s.u = -D; let t = 0, prev = spring ? null : 0, most = 0;
      for (let i = 0; i < Math.round(0.3 * hz); i++) { const target = t >= 0.1 - 1e-12 ? 0.2 : 0;
        if (spring) { const u0 = s.u; s.u = s.u - target; carry(P, s, 0, dt); s.u = s.u + target; const a = -P.w * P.w * (s.u - target) - 2 * P.w * s.ud; if (prev != null) most = Math.max(most, Math.abs(a - prev)); prev = a; void u0; }
        else { const a0 = s.udd; planned(s, target, Math.max(dt, 0.3 - t), dt); most = Math.max(most, Math.abs(s.udd - a0)); }
        t += dt; }
      return most; };
    const j60 = jumpStep(60, false), j120 = jumpStep(120, false), j240 = jumpStep(240, false), s60 = jumpStep(60, true), s240 = jumpStep(240, true);
    ok(j60 / j120 > 1.6 && j120 / j240 > 1.6 && s60 / s240 < 1.2, 'A NEW TARGET NEVER STEPS IT: a target moved 0.2 rad mid-plan — the planned turn\'s largest change of acceleration in a step ' + j60.toFixed(1) + ' → ' + j120.toFixed(1) + ' → ' + j240.toFixed(1) + ' rad/s² at 60 → 120 → 240 Hz (about halving with the step, each more than 1.6×: continuous), a critically damped spring\'s (ω 40) ' + s60.toFixed(0) + ' → ' + s240.toFixed(0) + ' (ω² × the move, at every rate)');
    { const A = 200, Dp = 0.42, Tp = 0.06, s = { u: -Dp, ud: 0, udd: 0 }, dt = 1 / 120; let t = 0, first = null, most = 0;
      while (Tp - t > 1e-12) { planned(s, 0, Tp - t, dt, A); if (first == null) first = s.reach; most = Math.max(most, Math.abs(s.udd)); t = Math.min(Tp, t + dt); }
      const v = { u: { x: -0.3, y: 0.2, z: 0 }, ud: { x: 0, y: 0, z: 0 }, udd: { x: 0, y: 0, z: 0 } }; planned(v, { x: 0, y: 0, z: 0 }, 0.06, 1 / 120, A);
      const dir = Math.abs(v.udd.x / v.udd.y - (0.3 / -0.2));
      /* ...and a rate it cannot bring to rest by its deadline inside A (6 rad/s, 0.03 s left) takes the time that needs: never more than A */
      const fast = { u: -0.1, ud: 6, udd: 0 }; let fm = 0, ft = 0, late = 0; while (ft < 1 && (Math.abs(fast.ud) > 1e-6 || ft === 0)) { planned(fast, 0, Math.max(dt, 0.03 - ft), dt, A); fm = Math.max(fm, Math.abs(fast.udd)); late = Math.max(late, fast.late || 0); ft += dt; }
      ok(fm <= A * 1.001 && late > 0, 'NEVER FASTER THAN ITS PACE: a rate of 6 rad/s it cannot bring to rest in the 0.03 s left inside ' + A + ' rad/s² — its acceleration at most ' + fm.toFixed(1) + ' (≤ ' + A + '), the time lengthened by up to ' + (1000 * late).toFixed(0) + ' ms, at rest after ' + (1000 * ft).toFixed(0) + ' ms');
      ok(most <= A * 1.001 && Math.abs(first / (A * Tp * Tp / (5.77 * Dp)) - 1) < 0.02 && Math.abs(s.ud) < 1e-9 && dir < 1e-9, 'AT A PACE: 0.42 rad in 0.06 s asks 673 rad/s²; at a pace of ' + A + ' it plans the share ' + first.toFixed(3) + ' (A·T²/5.77Δ = ' + (A * Tp * Tp / (5.77 * Dp)).toFixed(3) + ', within 2 %), its acceleration at most ' + most.toFixed(1) + ' (≤ ' + A + '), at rest at its deadline (' + fx(Math.abs(s.ud), 12) + ' rad/s); a vector\'s share keeps its direction (' + fx(dir, 12) + ' off)'); }
  }
}

/* ---- the plane through the contacts ---- */
{
  const hw = PHYSICS.wheelbase / 2, ht = PHYSICS.track / 2, up = [0, 1, 0];
  /* a seam: the back pair on the flat, the front pair on a 25° slope that began 5 cm behind them — the plane through them all */
  const drop = 0.05 * Math.tan(25 * Math.PI / 180), c = [[-ht, -drop, hw], [ht, -drop, hw], [-ht, 0, -hw], [ht, 0, -hw]];
  const n = plane(c, [true, true, true, true], up), want = [0, 2 * hw / Math.hypot(2 * hw, drop), drop / Math.hypot(2 * hw, drop)];
  const e4 = n ? Math.hypot(n[0] - want[0], n[1] - want[1], n[2] - want[2]) : 1;
  ok(e4 < 1e-12, 'THE PLANE THROUGH FOUR CONTACTS over a seam (the front pair 2.3 cm down a 25° bank): its normal off the plane\'s own by ' + fx(e4, 14) + ' (< 1e-12)');
  const n3 = plane(c, [true, false, true, true], up), e3 = n3 ? Math.hypot(n3[0] - want[0], n3[1] - want[1], n3[2] - want[2]) : 1;
  ok(e3 < 1e-12, 'THREE CONTACTS: their own plane, off by ' + fx(e3, 14) + ' (< 1e-12)');
  const two = plane(c, [true, true, false, false], up), line = plane([[0, 0, 0], [0, 0, 1], [0, 0, 2], [0, 0, 3]], [true, true, true, false], up);
  ok(two === null && line === null, 'DEGENERATE: two contacts, and three in a line, give no plane (' + two + ', ' + line + ')');
  let downs = 0; for (const ord of [[0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0]]) { const m = plane(ord.map((i) => c[i]), [true, true, true, true], up); if (!m || m[1] <= 0) downs++; }
  ok(downs === 0, 'THE SIGN: the normal turned toward the board\'s up whatever order the wheels come in (' + downs + ' of 4 orders pointed down)');
  /* the supervisor's D: a TWISTED board (one wheel 2 cm up — no plane holds all four): the normal is the diagonals' cross, the same under the
     board's own symmetries (front for back, left for right), and none of the four three-wheel planes */
  const tw = [[-ht, 0.02, hw], [ht, 0, hw], [-ht, 0, -hw], [ht, 0, -hw]], all4 = [true, true, true, true];
  const want4 = (() => { const a = tw[0].map((x, i) => x - tw[3][i]), b = tw[1].map((x, i) => x - tw[2][i]), n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], l = Math.hypot(...n); return n.map((x) => x / l * (n[1] < 0 ? -1 : 1)); })();
  const syms = [[0, 1, 2, 3], [2, 3, 0, 1], [1, 0, 3, 2], [3, 2, 1, 0]].map((o) => plane(o.map((i) => tw[i]), all4, up));
  const offSym = Math.max(...syms.map((m) => (m ? Math.hypot(m[0] - want4[0], m[1] - want4[1], m[2] - want4[2]) : 1)));
  const threes = [0, 1, 2, 3].map((skip) => plane(tw, all4.map((g, i) => i !== skip), up)), nearest3 = Math.min(...threes.map((m) => Math.hypot(m[0] - want4[0], m[1] - want4[1], m[2] - want4[2])));
  ok(offSym < 1e-12 && nearest3 > 1e-3, 'A TWISTED BOARD (one wheel 2 cm up): its normal the diagonals\' cross under every symmetry of the board (' + fx(offSym, 14) + ' off), and no three-wheel plane (the nearest ' + nearest3.toFixed(4) + ' away, > 1e-3)');
  /* THE PLANE IT STANDS ON (support): the same twisted ground — the board on three of its contacts, every contact on or below that plane (no
     wheel in its ground; the diagonals' plane leaves two in by 5 mm each), the lifted wheel one of the two the twist can lift, and on flat
     ground the plane through all four */
  const sp = support(tw, all4, up), below = sp ? Math.max(...tw.map((q) => (q[0] - sp.o[0]) * sp.n[0] + (q[1] - sp.o[1]) * sp.n[1] + (q[2] - sp.o[2]) * sp.n[2])) : 1;
  const diagIn = Math.max(...tw.map((q) => { const o = tw.reduce((a, x) => a.map((v, i) => v + x[i] / 4), [0, 0, 0]); return (q[0] - o[0]) * want4[0] + (q[1] - o[1]) * want4[1] + (q[2] - o[2]) * want4[2]; }));
  const flat4 = support(c.map((q) => [q[0], 0, q[2]]), all4, up);
  ok(sp && below <= 1e-9 && (sp.lifted === 1 || sp.lifted === 2) && diagIn > 0.004 && flat4 && flat4.lifted === -1 && Math.abs(flat4.n[1] - 1) < 1e-12, 'A TWISTED BOARD STANDS ON THREE WHEELS: its plane leaves every contact on or below it (the highest ' + fx(below, 12) + ' m above, ≤ 1e-9; the diagonals\' plane holds one ' + (diagIn * 1000).toFixed(1) + ' mm in its ground), wheel ' + (sp ? sp.lifted : '-') + ' off its ground; on flat ground all four (lifted ' + (flat4 ? flat4.lifted : '-') + ')');
  /* ...and as the twist grows through zero and back, the plane turns by no more than the ground does (no jump as it rocks to the other triple):
     every step of the twist's 0.5 mm, the normal turns at most the angle that 0.5 mm makes over the track */
  let worstTurn = 0, prevN = null, rocked = new Set();
  for (let mm = -20; mm <= 20; mm += 0.5) { const g = [[-ht, mm / 1000, hw], [ht, 0, hw], [-ht, 0, -hw], [ht, 0, -hw]], q = support(g, all4, prevN || up); if (!q) continue; rocked.add(q.lifted);
    if (prevN) worstTurn = Math.max(worstTurn, Math.acos(Math.min(1, q.n[0] * prevN[0] + q.n[1] * prevN[1] + q.n[2] * prevN[2]))); prevN = q.n; }
  const stepAng = Math.atan(0.0005 / (2 * ht));
  ok(worstTurn <= stepAng * 1.01 && rocked.size >= 2, 'IT ROCKS WITHOUT A JUMP: the twist taken from −2 to +2 cm in 0.5 mm steps, the plane turns at most ' + (worstTurn * 180 / Math.PI).toFixed(4) + '° a step (≤ ' + (stepAng * 180 / Math.PI).toFixed(4) + '°, what 0.5 mm makes over the track), standing on ' + rocked.size + ' different triples on the way');
}

/* ---- the high-centre (edge.js) ---- */
{
  const HD = PHYSICS.deckTop - BOARD.thickness, L = PHYSICS.wheelbase, ht = PHYSICS.track / 2, HW = BOARD.width / 2;
  const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], unit = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
  /* 1. THE DECK AGAINST AN EDGE IS EXACT: the deck's underside (a rectangle) against segments across it, along it, slanted, outside it and
     a thousand at random, each against a walk of the segment in 4,000 steps — and the same answers with the whole scene turned */
  const deck = { c: [0, HD, 0], u: [0, 0, 1], w: [1, 0, 0], n: [0, 1, 0], hu: L / 2, hw: HW };
  const walk = (rc, a, b) => { let best = null; for (let i = 0; i <= 4000; i++) { const p = add3(a, sub3(b, a), i / 4000), d = sub3(p, rc.c), s = dot3(d, rc.u), t = dot3(d, rc.w);
    if (Math.abs(s) <= rc.hu && Math.abs(t) <= rc.hw) { const z = dot3(d, rc.n); if (!best || z > best) best = z; } } return best; };
  const across = deckOver(deck, [-1, HD + 0.011, 0.05], [1, HD + 0.011, 0.05]), along = deckOver(deck, [0.05, HD - 0.02, -1], [0.05, HD + 0.02, 1]), out = deckOver(deck, [-1, HD + 0.05, 0.3], [1, HD + 0.05, 0.3]);
  let worstWalk = 0, missed = 0, rnd = 12345; const R = () => ((rnd = (rnd * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
  /* a turn of the whole scene (about an axis at random): the deck's answer must not move */
  const ax = unit([0.3, 0.8, -0.5]), ang = 0.9, rot = (p) => { const c = Math.cos(ang), s = Math.sin(ang), k = dot3(ax, p), x = cross3(ax, p); return [p[0] * c + x[0] * s + ax[0] * k * (1 - c), p[1] * c + x[1] * s + ax[1] * k * (1 - c), p[2] * c + x[2] * s + ax[2] * k * (1 - c)]; };
  const deckR = { c: rot(deck.c), u: rot(deck.u), w: rot(deck.w), n: rot(deck.n), hu: deck.hu, hw: deck.hw }; let worstTurned = 0;
  for (let i = 0; i < 1000; i++) {
    const a = [R() * 0.5, HD + R() * 0.05, R() * 0.4], b = [R() * 0.5, HD + R() * 0.05, R() * 0.4], ex = deckOver(deck, a, b), br = walk(deck, a, b);
    if ((ex === null) !== (br === null)) { if (br !== null) missed++; continue; }   // (a walk can miss a footprint the segment only grazes; the exact one cannot)
    if (ex) { worstWalk = Math.max(worstWalk, Math.abs(ex.depth - br) - 0.0004); const exR = deckOver(deckR, rot(a), rot(b)); worstTurned = Math.max(worstTurned, exR ? Math.abs(exR.depth - ex.depth) : 1); }
  }
  ok(across && Math.abs(across.depth - 0.011) < 1e-12 && Math.abs(across.s - 0.05) < 1e-12 && along && Math.abs(along.depth - 0.02 * L / 2) < 1e-12 && out === null && worstWalk <= 1e-9 && missed === 0 && worstTurned < 1e-12,
    'THE DECK AGAINST AN EDGE IS EXACT (the deck\'s underside a rectangle, the edge a segment, their closest points): across it ' + (across ? (across.depth * 100).toFixed(2) : '-') + ' cm in (1.10), along it ' + (along ? (along.depth * 1000).toFixed(2) : '-') + ' mm (' + (0.02 * L / 2 * 1000).toFixed(2) + '), outside it ' + out + '; of 1,000 at random none off a 4,000-step walk by more than its own step (' + fx(worstWalk, 12) + ' over), ' + missed + ' the exact one missed, and turned with the scene the same to ' + fx(worstTurned, 14));
  /* 2. A BOARD HIGH-CENTRED ON A RIDGE RESTS AT THE RIGHT HEIGHT AND TIPS THE RIGHT WAY, WITH NO WHEEL OR DECK INSIDE (the supervisor's truth,
     10-16): the Spine's own ridge — two faces at its lip angle meeting along a line — and a board across it, heading over it, its middle 3 cm
     short of the ridge: it rests on its back pair (on the near face) and the ridge (restOn) — its deck's underside through the ridge's point,
     its front pair over the far face, lifted; no wheel and no corner of the deck in either face; the deck against the ridge touching, not in.
     Its middle 3 cm past the ridge: on its front pair the same way, its back pair lifted */
  const lip = Math.acos((2.13 - 1.22) / 2.13), k = Math.tan(lip), Y0 = 1.22, face = (z) => Y0 - k * Math.abs(z);
  const E = [0, Y0, 0], ridgeA = [-1, Y0, 0], ridgeB = [1, Y0, 0];
  const rest = (zMid) => {
    const back = zMid < 0;   // the side its middle is on: that pair holds it
    let zp = zMid + (back ? -L / 2 : L / 2), pose = null;
    for (let it = 0; it < 60; it++) {
      const P1 = [-ht, face(zp), zp], P2 = [ht, face(zp), zp], rs = restOn(P1, P2, E, HD, [0, 1, 0]); if (!rs) return null;
      const fwd = unit(cross3([1, 0, 0], rs.n)), mid = add3([0, face(zp), zp], fwd, back ? L / 2 : -L / 2);
      pose = { n: rs.n, fwd, mid, P1, P2 }; zp += zMid - mid[2];   // move the pair until the middle stands where it was asked
    }
    return pose;
  };
  const check = (zMid) => {
    const P = rest(zMid); if (!P) return null;
    const { n, fwd, mid } = P, other = zMid < 0 ? 1 : -1, held = zMid < 0 ? -1 : 1;
    const wheel = (f, s) => add3(add3(mid, fwd, f * L / 2), [1, 0, 0], s * ht), lifted = Math.min(wheel(other, -1)[1] - face(wheel(other, -1)[2]), wheel(other, 1)[1] - face(wheel(other, 1)[2]));
    const onFace = Math.max(Math.abs(wheel(held, -1)[1] - face(wheel(held, -1)[2])), Math.abs(wheel(held, 1)[1] - face(wheel(held, 1)[2])));
    const rc = { c: add3(mid, n, HD), u: fwd, w: [1, 0, 0], n, hu: L / 2, hw: HW };
    const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => add3(add3(rc.c, fwd, a * rc.hu), [1, 0, 0], b * rc.hw)), deckIn = Math.min(...corners.map((q) => q[1] - face(q[2])));
    const touch = deckOver(rc, ridgeA, ridgeB), height = dot3(n, sub3(E, P.P1));
    return { height, lifted, onFace, deckIn, touch: touch ? touch.depth : null, tilt: Math.acos(n[1]) * 180 / Math.PI * Math.sign(n[2] || 1) };
  };
  const nearSide = check(-0.03), farSide = check(0.03);
  const good = (q) => q && Math.abs(q.height - HD) < 1e-12 && q.lifted > 0.01 && q.onFace < 1e-12 && q.deckIn >= -1e-12 && q.touch !== null && Math.abs(q.touch) < 1e-12;
  ok(good(nearSide) && good(farSide) && nearSide.tilt * farSide.tilt < 0,
    'A BOARD HIGH-CENTRED ON A RIDGE RESTS AT THE RIGHT HEIGHT AND TIPS THE RIGHT WAY, WITH NO WHEEL OR DECK INSIDE: on the Spine\'s ridge (its faces at ' + (lip * 180 / Math.PI).toFixed(1) + '°), its middle 3 cm short of it — on its back pair, its deck ' + (nearSide ? fx(nearSide.height - HD, 14) : '-') + ' m off the ridge (0), the front pair lifted ' + (nearSide ? (nearSide.lifted * 100).toFixed(1) : '-') + ' cm, the back pair on its face to ' + (nearSide ? fx(nearSide.onFace, 14) : '-') + ', the deck clear of both faces by ' + (nearSide ? (nearSide.deckIn * 100).toFixed(2) : '-') + ' cm and touching the ridge (' + (nearSide && nearSide.touch !== null ? fx(nearSide.touch, 14) : '-') + ' in), tipped ' + (nearSide ? nearSide.tilt.toFixed(1) : '-') + '°; 3 cm past it — on its front pair, the back lifted ' + (farSide ? (farSide.lifted * 100).toFixed(1) : '-') + ' cm, tipped ' + (farSide ? farSide.tilt.toFixed(1) : '-') + '° the other way');
}

/* ---- the fixed step ---- */
{
  /* the real sim, driven through the clock by two different runs of frame lengths that come to the same time: the same steps, the same bytes */
  /* (the inputs read by the step, from the step's own count — as the page samples its controls on every step — so two runs of different
     frame lengths are handed the same input on the same step) */
  const ride = (frames) => { const R = rig({ world: flatWorld(), at: [150, 0, 150], heading: 90, speed: 3 }), C = clock(PHYSICS.step, PHYSICS.maxSteps), out = []; let k = 0;
    for (const ms of frames) { advance(C, ms / 1000, () => { k++; R.throttle = k > 48 && k < 288 ? 1 : 0; R.steer = k > 144 ? 0.6 : 0; R.step(1); }); out.push(JSON.stringify(R.sk.read())); }
    return { out, final: JSON.stringify(R.sk.read()) }; };
  const even = Array(240).fill(1000 / 120), a = ride(even), b = ride(even);
  ok(a.out.every((x, i) => x === b.out[i]), 'A REPLAY IS BYTE-IDENTICAL: the real sim through the clock, twice, ' + a.out.length + ' frames the same to the byte');
  /* frames of 8.33 ms and frames of 25 ms (three steps each) over the same 2 s: the same game at the end */
  const thirds = Array(80).fill(3000 / 120), c3 = ride(thirds);
  ok(c3.final === a.final, 'ANY FRAME LENGTH, THE SAME STEPS: 240 frames of 1/120 s and 80 of 3/120 s end on the same bytes');
  const C = clock(1 / 120, 6); let calls = 0; const n = advance(C, 0.25, () => calls++), n2 = advance(C, 1 / 120, () => calls++);
  ok(n === 6 && C.dropped === 24 && n2 === 1, 'A LONG FRAME NEVER SPIRALS: a 250 ms frame ran ' + n + ' steps (≤ 6) and dropped ' + C.dropped + ', counted; the next ran ' + n2);
}

/* ---- the blend (the supervisor's A, 10-16): a frame drawn between the last two steps at alpha moves by exactly its own time ----
   A board rolling at a steady 4 m/s, stepped at 1/120 s by the clock, its frames timed as a browser stamps them: a display's real rate, each
   stamp coarsened to 0.1 ms; locked to the clock after a hitch (the clock then drops what it owes and sits on a step's edge: 1,3,2 steps a
   frame at 60 Hz, none at all one frame in three at 120). Every frame's drawn move against 4 m/s × that frame's time; drawn at the newest step
   instead, the same frames moved 0 to 2× */
{
  const STEP = PHYSICS.step, v = 4, q = 0.1;
  const run = (hz, hitch, blend) => {
    const C = clock(STEP, PHYSICS.maxSteps); let x = 0, px = 0, drawnPrev = null, worst = 0, frames = 0, still = 0;
    if (hitch) advance(C, 0.25, () => { px = x; x += v * STEP; });
    const stamp = (i) => Math.round((i * 1000 / hz) / q) * q;
    for (let i = 1; i <= Math.round(hz * 4); i++) {
      const ms = stamp(i) - stamp(i - 1); advance(C, ms / 1000, () => { px = x; x += v * STEP; });
      const drawn = blend ? mix(px, x, alpha(C)) : x;
      if (drawnPrev !== null && i > 2) { const r = (drawn - drawnPrev) / (v * ms / 1000); worst = Math.max(worst, Math.abs(r - 1)); frames++; if (Math.abs(drawn - drawnPrev) < 1e-12) still++; }
      drawnPrev = drawn;
    }
    return { worst, frames, still };
  };
  const cases = [['60 Hz locked after a hitch', 60, true], ['59.94 Hz', 59.94, false], ['90 Hz', 90, false], ['120 Hz after a hitch', 120, true], ['144 Hz', 144, false]];
  const rows = cases.map(([n, hz, h]) => ({ n, b: run(hz, h, true), o: run(hz, h, false) }));
  const worst = Math.max(...rows.map((r) => r.b.worst));
  ok(worst <= 0.02, 'THE DRAWN MOVE IS THE FRAME\'S OWN TIME (drawn between the last two steps at alpha): every frame within ' + (worst * 100).toFixed(3) + ' % of 4 m/s × its time (≤ 2) — ' + rows.map((r) => r.n + ' ' + (r.b.worst * 100).toFixed(2) + ' % (at the newest step: ' + (r.o.worst * 100).toFixed(0) + ' %, ' + r.o.still + ' frames still)').join(' · '));
  /* the frame slerp: its ends, its middle at half the angle, and the short way round whatever sign a quaternion came in */
  const ang = 70 * Math.PI / 180, A = [[0, 1, 0], [0, 0, 1]], Bf = [[0, Math.cos(ang), Math.sin(ang)], [0, -Math.sin(ang), Math.cos(ang)]];
  const at = (t) => slerpFrame(A[0], A[1], Bf[0], Bf[1], t), dAng = (u, w) => Math.acos(Math.min(1, u[0] * w[0] + u[1] * w[1] + u[2] * w[2]));
  const e0 = dAng(at(0).up, A[0]) + dAng(at(0).fwd, A[1]), e1 = dAng(at(1).up, Bf[0]) + dAng(at(1).fwd, Bf[1]), half = Math.abs(dAng(at(0.5).up, A[0]) - ang / 2);
  ok(e0 < 1e-7 && e1 < 1e-7 && half < 1e-9, 'THE ATTITUDE TURNS BETWEEN THEM: its ends on the two steps (' + fx(e0 + e1, 9) + ' rad off), the middle at half the turn (' + fx(half, 12) + ' rad off)');
}

/* ---- jumps ---- */
{
  const h = 0.85, tUp = 0.37, J = fromApex(h, tUp), dt = PHYSICS.step, p = [0, 0, 0], v = [0, J.v, 0]; let top = 0, at = 0;
  for (let i = 1; i <= 120; i++) { v[1] -= J.g * dt; moved(p, v, J.g, dt); if (p[1] > top) { top = p[1]; at = i * dt; } }
  ok(Math.abs(top - h) < 2e-4 && Math.abs(at - tUp) <= dt / 2 + 1e-9, 'A JUMP STEPPED AT 1/120 s reaches its apex: ' + (top * 100).toFixed(2) + ' cm at ' + at.toFixed(4) + ' s against ' + (h * 100).toFixed(1) + ' cm at ' + tUp + ' s (within 0.2 mm, half a step)');
  ok(Math.abs(speedFor(h, J.g) - J.v) < 1e-12 && Math.abs(timeFor(h, J.g) - tUp) < 1e-12, 'g = 2h/t², v = 2h/t: the speed and the time back from g and h agree');
}

/* ---- the stroke ---- */
{
  let worstSum = 0, worstPeak = 0, at0 = 0;
  for (const speed of [0, 1, 2.5, 4, 5.5, 7]) {
    const P = PHYSICS.push, want = P.dv * Math.pow(Math.max(0, 1 - speed / P.top), P.curve);
    if (!(want > 0)) continue;
    const S = plan({ want, speed, aMax: P.aMax, sweep: P.sweep, driveMax: P.driveMax }), dt = PHYSICS.step; let given = 0;
    let u0 = 0; for (let t = dt; u0 < 1; t += dt) { const u1 = Math.min(1, t / S.T); given += gave(u0, u1, S.gain); u0 = u1; }
    worstSum = Math.max(worstSum, Math.abs(given - S.gain) / S.gain); worstPeak = Math.max(worstPeak, peak(S.gain, S.T) / P.aMax);
    /* the speed given over the contact's first and last 1 % (the half sine: 0.025 % of the gain at each end), and the force just inside each */
    at0 = Math.max(at0, gave(0, 0.01, S.gain) / S.gain, gave(0.99, 1, S.gain) / S.gain, rate(1e-3, S.gain, S.T) / peak(S.gain, S.T) / 1e2, rate(0.999, S.gain, S.T) / peak(S.gain, S.T) / 1e2, Math.abs(rate(1.01, S.gain, S.T)));
  }
  ok(worstSum < 1e-9, 'THE STROKE GIVES ITS GAIN: stepped at 1/120 s, the force over each step its own share of the half sine, the gain given exactly (' + fx(worstSum, 12) + ' off; < 1e-9) at every speed');
  ok(at0 < 1e-3, 'NOTHING AT THE PLANT OR THE LIFT: over the contact\'s first and last 1 % it gives at most ' + (at0 * 100).toFixed(3) + ' % of the gain (< 0.1), nothing outside it');
  ok(worstPeak <= 1 + 1e-9, 'ITS PEAK HELD: at most ' + (worstPeak * 100).toFixed(1) + ' % of the most a person gives (≤ 100)');
}
console.log('FORMULAS: ' + (fail ? 'RED · ' + fail : 'GREEN'));
process.exit(fail ? 1 : 0);
