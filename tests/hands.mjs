/* THE HANDS (R6.1, the supervisor 10-16: "the wrists' lateral offset from the hips' sides, in the rest, roll, push and manual poses, against a
 * relaxed hang (hands at the thighs' sides). If they're held outward when nothing calls for balance, bring them in. Keep the balance arms where
 * a trick or a grind asks for them"). Measured on the original model against the DRAWN cargos: a posed point of each hand taken back through its
 * thigh's skinning (the thigh's posed frame → its bind frame) and read on the pants' own surface (sculpt.js junoPieces 'pants'), the hand's
 * surface 2.4 cm round its middle line (the palm's half thickness), from the wrist to the fingertips:
 *   AT THE THIGHS' SIDES where nothing calls for balance — standing, rolling: each hand off the cloth by no more than a hand's thickness
 *   (5 cm), and never in it (the cargos are baggy: brought to the shoulders' line, the hands went 3.7–5.2 cm into them, 10-17; as the pose
 *   is, L 1.3–2.2 and R 4.4–4.9 — the right brought nearer turned the pop's forearm past 1,500°/s: tests/motion_sweep.mjs);
 *   THE BALANCE ARMS on a grind and in a manual: the leading arm out 15 cm or more;
 *   the push: said (the push's own arms are the body release's: held out, the elbows bent, no walking swing).
 * Plants (tests/plants.mjs): hands_in_the_cargos, hands_held_out, balance_arms_gone → RED. */
import { figure, V } from './lib/figure.mjs';
import { World } from '../build/js/sim/world.js';
import { pull, flick } from './lib/rig.mjs';
import { junoPieces, bindSkeleton } from '../build/js/view/sculpt.js';

const SIDE = 0.05, INTO = -0.005, BALANCE = 0.15, HALF = 0.024;
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const world = new World(), pants = junoPieces(bindSkeleton()).find((p) => p.name === 'pants');
const cases = [['standing', { at: [30, 0, 14], heading: 90, speed: 0 }, () => {}, 90, () => true], ['rolling', { at: [30, 0, 14], heading: 90, speed: 4 }, () => {}, 90, () => true],
  ['pushing', { at: [30, 0, 14], heading: 90, speed: 0 }, (G) => { G.R.throttle = 1; }, 120, (G) => !!G.R.sk.stroke],
  ['in a manual', { at: [26.1, 0.8, 40.9], heading: 90, speed: 5.6 }, (G, f) => { if (f === 18) G.R.thumb(pull(22, 7000)); }, 150, (G) => G.R.sk.state === 'manual'],
  ['on a grind', { at: [27, 0, 22.7], heading: 90, speed: 5.5 }, (G) => { if (!G.popped && G.R.sk.p[0] >= 28.3) { G.popped = true; G.R.thumb(flick('Ollie')); } }, 110, (G) => G.R.sk.state === 'grind']];
const got = {};
for (const [name, o, drive, frames, want] of cases) {
  const G = figure(Object.assign({ world }, o)), F = G.F;
  F.rig.updateMatrixWorld(true); const rigInv = F.rig.matrixWorld.clone().invert(), bind = { thighL: rigInv.clone().multiply(F.bones.thighL.matrixWorld), thighR: rigInv.clone().multiply(F.bones.thighR.matrixWorld) };
  const R = { L: Infinity, R: Infinity, Lmax: -Infinity, Rmax: -Infinity, n: 0 };
  for (let f = 0; f < frames; f++) { drive(G, f); G.frame(); if (f < 30 || !want(G)) continue; R.n++;
    for (const sd of ['L', 'R']) { const hb = F.bones['hand' + sd], w = new V().setFromMatrixPosition(hb.matrixWorld), e = hb.localToWorld(new V().fromArray(F.B['hand' + sd].tail).sub(new V().fromArray(F.B['hand' + sd].head)));
      let least = Infinity; for (let k = 0; k <= 6; k++) { const b = w.clone().lerp(e, k / 6).applyMatrix4(F.bones['thigh' + sd].matrixWorld.clone().invert()).applyMatrix4(bind['thigh' + sd]); least = Math.min(least, pants.f(b.x, b.y, b.z) - HALF); }
      R[sd] = Math.min(R[sd], least); R[sd + 'max'] = Math.max(R[sd + 'max'], least); } }
  got[name] = R;
}
const cm = (v) => (100 * v).toFixed(1);
const rest = ['standing', 'rolling'].map((k) => [k, got[k]]), restOk = rest.every(([, r]) => r.n > 20 && r.L >= INTO && r.R >= INTO && r.Lmax <= SIDE && r.Rmax <= SIDE);
ok(restOk, 'THE HANDS HANG AT THE THIGHS\' SIDES where nothing calls for balance: ' + rest.map(([k, r]) => k + ' — L ' + cm(r.L) + '…' + cm(r.Lmax) + ' cm, R ' + cm(r.R) + '…' + cm(r.Rmax) + ' cm off the cargos').join(' · ') + ' (each in 0…' + cm(SIDE) + ': a hand\'s thickness, never in them)');
const bal = ['in a manual', 'on a grind'].map((k) => [k, got[k]]), balOk = bal.every(([, r]) => r.n > 10 && Math.max(r.Lmax, r.Rmax) >= BALANCE);
ok(balOk, 'THE BALANCE ARMS STAY WHERE A TRICK ASKS: ' + bal.map(([k, r]) => k + ' — the leading arm out ' + cm(Math.max(r.Lmax, r.Rmax)) + ' cm (L ' + cm(r.Lmax) + ', R ' + cm(r.Rmax) + ')').join(' · ') + ' (≥ ' + cm(BALANCE) + ')');
{ const r = got.pushing; console.log('ℹ pushing — said (the push\'s arms are the body release\'s): L ' + cm(r.L) + '…' + cm(r.Lmax) + ' cm, R ' + cm(r.R) + '…' + cm(r.Rmax) + ' cm off the cargos over ' + r.n + ' frames'); }
console.log(fail ? 'HANDS: RED' : 'HANDS: GREEN'); process.exit(fail ? 1 : 0);
