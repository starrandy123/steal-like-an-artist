/* A SKATER POSED AS THE PAGE POSES HIM, in Node: the real sim stepped at 120 Hz by the real reader (tests/lib/rig.mjs), the real pose every
 * other step (60 a second), the board on the sim's frame and the rig on the board (view/figure.js boardOnFrame and poseInput) — and what the
 * motion walls read off him each frame. Used by tests/motion_sweep.mjs. */
import * as THREE from '../../build/vendor/three/build/three.module.min.js';
import { rig as simRig } from './rig.mjs';
import { rigSkater } from '../../build/js/view/skater.js';
import { boardOnFrame, poseInput } from '../../build/js/view/figure.js';
import { PHYSICS, BOARD, PARK } from '../../build/js/config.js';
import { clock, advance, alpha } from '../../build/js/formulas/step.js';
import { World } from '../../build/js/sim/world.js';
const V = THREE.Vector3, D = 180 / Math.PI;

/* THE FLAT: a slab 300 m square and one ledge on it (the Main Ledge's height and top), so a sweep reads the motion and not the park's layout */
export const LEDGE = { x0: 150, x1: 170, z: 150, h: 0.36 };
let flat = null;
export const flatWorld = () => flat || (flat = new World(Object.assign({}, PARK, { size: [300, 300], ground: [{ id: 'flat', name: 'The Flat', rect: [0, 0, 300, 300], y: 0, surface: 'slab' }],
  elements: [{ id: 'ledge', type: 'ledge', name: 'The Ledge', rect: [LEDGE.x0, LEDGE.z - 0.3, LEDGE.x1, LEDGE.z + 0.3], h: LEDGE.h, top: 'granite', wax: true }] })));

/* (o.rig: a sweep's own rig to pose — anything with sk, step(n), log and load: tests/slide.mjs drives a bare skater by its own inputs) */
export function figure(o) {
  const R = o.rig || simRig(Object.assign({ world: flatWorld() }, o)), F = rigSkater(), board = new THREE.Group(); board.add(F.rig);
  const bones = F.bones, B = F.B, len = (n) => new V().fromArray(B[n].tail).distanceTo(new V().fromArray(B[n].head));
  const G = { R, F, board, t: 0, legLen: { L: len('thighL') + len('shinL'), R: len('thighR') + len('shinR') } };
  /* the ball of a foot (0.7 of the way to its toe), in the world */
  G.ball = (sd) => { const b = bones['foot' + sd], off = new V().fromArray(B['foot' + sd].tail).sub(new V().fromArray(B['foot' + sd].head)).multiplyScalar(0.7); return b.localToWorld(off); };
  G.at = (n) => new V().setFromMatrixPosition(bones[n].matrixWorld);
  /* a leg's stretch: hip to ankle over the thigh and shin end to end (1 = straight) */
  G.stretch = (sd) => G.at('thigh' + sd).distanceTo(G.at('foot' + sd)) / G.legLen[sd];
  const prevQ = {}; let prevHips = null;
  /* one frame: two sim steps, one pose; what turned and moved since the last */
  const C = clock(PHYSICS.step, PHYSICS.maxSteps); let prev = null;
  G.frame = (dtFrame = 2 * PHYSICS.step) => {
    /* the frame's sim steps one at a time, through the page's own clock (formulas/step.js): each step's gain of speed, and the stroke's phase
       it was taken in; the read before the newest step kept, as the page keeps it, so the figure is drawn where the page draws it (figure.js
       drawn, at the clock's alpha: at a sixtieth exactly, the step before the newest) */
    const steps = []; advance(C, dtFrame, () => { const sk = R.sk, ph = sk.stroke ? sk.stroke.phase : null, v0 = Math.hypot(sk.v[0], sk.v[2]), flat = sk.state === 'roll' && sk.surface !== 'ramp' && sk.up[1] > 0.995; prev = sk.read(); const up0 = sk.up.slice(), n0 = sk.contacts; R.step(1); if (R.log.length && R.log[R.log.length - 1].type === 'respawn') prev = sk.read(); steps.push({ phase: ph, gain: Math.hypot(sk.v[0], sk.v[2]) - v0, flat, up0, up: sk.up.slice(), n0, n: sk.contacts, state: sk.state }); });
    G.t += dtFrame;
    const s = poseInput(R.sk, R.load || 0, prev, alpha(C)); boardOnFrame(board, s); G.drawnState = s; F.pose(dtFrame, s); board.updateMatrixWorld(true);
    let joint = 0, jointAt = '';
    for (const n of F.names) { const q = bones[n].quaternion; if (prevQ[n]) { const a = 2 * Math.acos(Math.min(1, Math.abs(prevQ[n].dot(q)))) * D / dtFrame; if (a > joint) { joint = a; jointAt = n; } } prevQ[n] = q.clone(); }
    const hp = bones.hips.position.clone(), hips = prevHips ? hp.distanceTo(prevHips) / dtFrame : 0; prevHips = hp;
    return { s, joint, jointAt, hips, steps };
  };
  G.local = (w) => board.worldToLocal(w.clone());   // a world point in the board's own frame (x across, y up from the deck's top, z along)
  return G;
}
export { BOARD, PHYSICS, V, D };
