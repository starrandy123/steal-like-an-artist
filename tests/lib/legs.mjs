/* THE BODY ON ITS LEGS, READ (10-16; the supervisor's walls for it): one reader for every test that drives the figure frame by frame.
 *   - THE HIPS' WORLD ACCELERATION, in three classes: ON THE GROUND (≤ 60 m/s²); in the 0.2 s after an IMPULSE the legs take — a pop, a landing,
 *     a grind's catch, a roll-in's drop onto its wall (the wall meeting the board is a landing for the legs: the supervisor's call (A), 10-16)
 *     (≤ 150); IN THE AIR otherwise (reported: the airs' class — the board leads and the body follows there, its fix after the
 *     ragdoll). Rigid on the board, the hips took 235 at a pop, 255 at a rail's bend, 223–308 over a bank's seam.
 *   - THE LEGS' REACH: the hips' gap from where the pose puts them, in the board's frame — sink ≤ 15 cm, rise ≤ 3, sway ≤ 8 — and the legs never
 *     past 0.98 of straight.
 *   - THE FEET PINNED: rolling, in a manual, on a grind (no flip, no stroke), the front foot's ball against its pin on the bolts and the back
 *     foot's against the deck: ≤ 1.5 cm RMS; through a catch or a landing, ≤ 4 cm.
 * Ringing is read on the springs themselves (tests/legs_step.mjs): on the park, the gap after a landing mixes their settling with the pose's own
 * dip, and read as 72 % overshoot of springs that have none. */
import * as THREE from '../../build/vendor/three/build/three.module.min.js';
import { LEGS } from '../../build/js/config.js';

export const HIPS = { ground: 60, impulse: 150 }, REACH = { sink: LEGS.sink, rise: LEGS.rise, sway: LEGS.sway, straight: 0.98 }, FEET = { rms: 0.015, impulse: 0.04 }, RING = { overshoot: 0.10, signs: 1 };   // RING: tests/legs_step.mjs
/* the impulses the legs take — ONE list, the chain's too (tests/lib/chain.mjs) */
export const IMPULSE = /^(pop|land|grindStart|rollIn)$/;
/* A BIG LANDING: one faster into its surface than the legs as they are can stop inside the landing's class — their squat about 10 cm (9–11
   measured, orgo-u-48, 10-16) at the class's 150 m/s² stops √(2·0.10·150) ≈ 5.5 m/s. Its 0.2 s is the big landings' class, REPORTED until the
   next release's deeper, softer squat (the supervisor's item; a roll-off off the Lawn Quarter's lip on Raw landed at 5.6 m/s, the hips 155).
   ONE definition, the chain's too */
const SQUAT_NOW = 0.10;
export const BIG = { impact: Math.sqrt(2 * SQUAT_NOW * 150) };
export const bigLanding = (events) => events.some((e) => e.type === 'land' && +e.impact >= BIG.impact);
const PIN_F = new THREE.Vector3(-0.03, 0.0495, 0.192), DECK_Y = 0.0495;

/* a reader for one run: frame(G-like) each frame. `fig` gives: board (the board group), F (the rig: bones, B, state), ball(sd) (a foot's ball,
   world), stretch(sd) (0..1 of straight) */
export function legsReader(fig, dtFrame) {
  const hp = [], W = { ground: { v: 0, at: '' }, impulse: { v: 0, at: '' }, air: { v: 0, at: '' }, big: { v: 0, at: '', n: 0 },
    gap: { sink: 0, rise: 0, sway: 0, at: '' }, straight: { v: 0, at: '' }, straightAir: { v: 0, at: '' }, pin: { sq: 0, n: 0, worstImpulse: 0, at: '' } };
  let lastImpulse = -9, t = 0, lastAir = -9, lastBig = -9;
  const bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3();
  const reader = {
    W,
    reset() { hp.length = 0; },
    frame(state, events, label, opts = {}) {
      t += dtFrame;
      if (events.some((e) => IMPULSE.test(e.type))) lastImpulse = t;
      if (bigLanding(events)) { lastBig = t; W.big.n++; }
      const inImpulse = t - lastImpulse <= 0.2 + 1e-9, inBig = t - lastBig <= 0.2 + 1e-9;
      /* the hips' world acceleration */
      hp.push(new THREE.Vector3().setFromMatrixPosition(fig.F.bones.hips.matrixWorld)); if (hp.length > 3) hp.shift();
      if (hp.length === 3) {
        const a = hp[2].clone().sub(hp[1].clone().multiplyScalar(2)).add(hp[0]).length() / (dtFrame * dtFrame), cls = inBig && state !== 'air' ? 'big' : inImpulse ? 'impulse' : state === 'air' ? 'air' : 'ground';
        if (a > W[cls].v) Object.assign(W[cls], { v: a, at: label + ' at ' + t.toFixed(2) + ' s (' + state + ')' });   // (kept whole: the big class counts its landings)
      }
      /* the gap, in the board's frame */
      const st = fig.F.state, L = st.legs, B = fig.board.matrixWorld; bx.setFromMatrixColumn(B, 0).normalize(); by.setFromMatrixColumn(B, 1).normalize(); bz.setFromMatrixColumn(B, 2).normalize();
      if (L) {
        const up = L.u.dot(by), sway = Math.max(Math.abs(L.u.dot(bx)), Math.abs(L.u.dot(bz)));
        if (-up > W.gap.sink) { W.gap.sink = -up; W.gap.at = label + ' at ' + t.toFixed(2) + ' s'; } if (up > W.gap.rise) W.gap.rise = up; if (sway > W.gap.sway) W.gap.sway = sway;
      }
      /* the legs' straightness — within half a second of an air, the airs' class (the supervisor, 10-16: the board's own turn in the air, up to
         900°/s toward a catch, leaves the body to make up after it: reported there, fixed with that class) */
      if (state === 'air') lastAir = t;
      const into = t - lastAir <= 0.5 ? 'straightAir' : 'straight';
      for (const sd of ['L', 'R']) { const k = fig.stretch(sd); if (k > W[into].v) W[into] = { v: k, at: sd + ' in ' + label + ' at ' + t.toFixed(2) + ' s (' + state + ')' }; }
      /* the feet on their pins: rolling, in a manual, on a grind; no flip, no stroke */
      if ((state === 'roll' || state === 'manual' || state === 'grind') && !(st.flip > 0.01) && !opts.stroking) {
        const f = fig.board.worldToLocal(fig.ball('L')), b = fig.board.worldToLocal(fig.ball('R'));
        const eF = f.distanceTo(PIN_F), eB = Math.abs(b.y - DECK_Y), e = Math.max(eF, eB);
        if (inImpulse) { if (e > W.pin.worstImpulse) { W.pin.worstImpulse = e; W.pin.at = label + ' at ' + t.toFixed(2) + ' s'; } }
        else { W.pin.sq += eF * eF + eB * eB; W.pin.n += 2; }
      }
    },
  };
  return reader;
}
export const pinRms = (W) => Math.sqrt(W.pin.sq / Math.max(1, W.pin.n));
