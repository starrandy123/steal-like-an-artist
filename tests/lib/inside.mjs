/* THE BOARD INSIDE THE PARK (10-16; the class of the trailing truck through a lip): a wheel's lowest point — on the board's own down, where
 * it meets what it rolls on — read against the park's solids: the nearest surface along six rays from it, met from BEHIND (the ray leaves
 * through the face: the point is inside what that face bounds), and how far. A wheel on the ground reads 0; a wheel through a lip, a ledge
 * or the ground reads its depth. The fence is a net (an open surface with no inside), not read.
 *   boardInside(world, frame) → { depth (m), wheel, surf } for the deepest of the four wheels (depth 0 when none is inside); `frame` is the
 *   drawn board (a THREE object placed by figure.js boardOnFrame) or the sim itself ({ p, up, fwd }: the frame the board is drawn on, read
 *   at every step — a 120 Hz screen draws every one) */
import * as THREE from '../../build/vendor/three/build/three.module.min.js';
import { BOARD, PHYSICS } from '../../build/js/config.js';

/* the drawn board's own measures (view/board.js): the axle under the deck's top, the wheels' track and radius */
const AXLE_Y = -BOARD.thickness - BOARD.truckHeight, WX = 0.215 / 2 - BOARD.wheelWidth / 2, R = BOARD.wheel / 2;
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const BACK = 0.001;
const P = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3();

export function boardInside(world, frame) {
  const sim = !frame.isObject3D; let worst = { depth: 0, wheel: '', surf: '' };
  if (sim) { Y.fromArray(frame.up); Z.fromArray(frame.fwd); X.crossVectors(Y, Z).normalize(); Z.crossVectors(X, Y).normalize(); } else frame.updateMatrixWorld(true);
  for (const zs of [1, -1]) for (const xs of [1, -1]) {
    const lx = xs * WX, ly = AXLE_Y - R, lz = zs * BOARD.wheelbase / 2;
    if (sim) P.fromArray(frame.p).addScaledVector(Y, PHYSICS.deckTop + ly).addScaledVector(X, lx).addScaledVector(Z, lz); else frame.localToWorld(P.set(lx, ly, lz));
    const o = [P.x, P.y, P.z];
    let best = Infinity, back = false, surf = ''; const face = [0, 0, 0];
    /* (each ray from a millimetre behind the point: a point ON a face is met by the rays that leave through it — 10-16: a wheel ending a step
       exactly on the Spine's west face met it with no ray, and its nearest was the east face's back 23 cm off: read 23 cm inside) */
    for (const d of DIRS) { const h = world.bvh.raycast([o[0] - d[0] * BACK, o[1] - d[1] * BACK, o[2] - d[2] * BACK], d, 0.6 + BACK, true); if (h && h.t - BACK < best) { best = Math.max(0, h.t - BACK); back = d[0] * h.face[0] + d[1] * h.face[1] + d[2] * h.face[2] > 0; surf = h.surf; face[0] = h.face[0]; face[1] = h.face[1]; face[2] = h.face[2]; } }
    if (back && surf !== 'fence' && best > worst.depth) worst = { depth: best, wheel: (zs > 0 ? 'front' : 'back') + (xs > 0 ? ' left' : ' right'), surf, face: face.slice() };
  }
  return worst;
}

/* A CONTACT MADE, READ INDEPENDENTLY OF THE SIM'S OWN SIGNAL (10-17, the supervisor: "every frame that says airTouch has a contact made that
 * step, read independently of the signal (a wheel, truck or deck within contact distance of a face ...)"): the board's parts on a pose the
 * sim gives ({ p, up, fwd }, p on its contact plane), as the sim measures them — each wheel's middle (its contact point a radius up: within
 * the radius and a centimetre of a face, its rim on it), each truck's bottom across its width and the deck's underside between the trucks on
 * a 2.5 cm grid (HT and HD above the contact plane, body.js; within 2 cm, the grid's own reach) — and the nearest of the park's faces to each
 * (the BVH's own closest point on every triangle near it, exact: six rays from a wheel at a block's corner met nothing 1.2 cm off). The fence
 * is a net, not read.
 *   boardTouch(world, pose) → { near (m past its own contact distance: ≤ 0 is a contact), what } */
const HT_ = 0.02, HD_ = PHYSICS.deckTop - BOARD.thickness, TRACK = PHYSICS.track, HW = PHYSICS.wheelbase / 2, DECK_IN_ = 0.03;
export function boardTouch(world, pose) {
  Y.fromArray(pose.up); Z.fromArray(pose.fwd); X.crossVectors(Y, Z).normalize(); Z.crossVectors(X, Y).normalize();
  const pts = [];
  for (const zs of [1, -1]) for (const xs of [1, -1]) pts.push([xs * TRACK / 2, R, zs * HW, R + 0.01, (zs > 0 ? 'the front' : 'the back') + (xs > 0 ? ' left' : ' right') + ' wheel']);
  for (const zs of [1, -1]) for (const x of [-TRACK / 2, -TRACK / 4, 0, TRACK / 4, TRACK / 2]) pts.push([x, HT_, zs * HW, 0.02, (zs > 0 ? 'the front' : 'the back') + ' truck']);
  for (let z = -(HW - DECK_IN_); z <= HW - DECK_IN_ + 1e-9; z += 0.025) for (const x of [-BOARD.width / 2, -BOARD.width / 4, 0, BOARD.width / 4, BOARD.width / 2]) pts.push([x, HD_, z, 0.02, 'the deck']);
  let best = { near: Infinity, what: '' };
  for (const [lx, ly, lz, reach, what] of pts) {
    P.fromArray(pose.p).addScaledVector(Y, ly).addScaledVector(X, lx).addScaledVector(Z, lz);
    world.bvh.sphere([P.x, P.y, P.z], reach + 0.05, (tri, q, d) => { if (world.bvh.surf[tri] !== 'fence' && d - reach < best.near) best = { near: d - reach, what }; });
  }
  return best;
}

/* THE TRUCKS INSIDE THE PARK (10-17, the supervisor: "read each truck's and wheel's depth with (b)'s own reader"): each truck's bottom (HT above
 * the contact plane, body.js — the hanger between its wheels) at its middle and toward each wheel, read as a wheel's lowest point is (above).
 *   truckInside(world, sim) → { depth, truck, surf } for the deepest */
export function truckInside(world, sk) {
  Y.fromArray(sk.up); Z.fromArray(sk.fwd); X.crossVectors(Y, Z).normalize(); Z.crossVectors(X, Y).normalize();
  let worst = { depth: 0, truck: '', surf: '' };
  for (const zs of [1, -1]) for (const x of [-0.4 * TRACK, 0, 0.4 * TRACK]) {
    P.fromArray(sk.p).addScaledVector(Y, HT_).addScaledVector(X, x).addScaledVector(Z, zs * HW);
    const o = [P.x, P.y, P.z]; let best = Infinity, back = false, surf = '';
    for (const d of DIRS) { const h = world.bvh.raycast([o[0] - d[0] * BACK, o[1] - d[1] * BACK, o[2] - d[2] * BACK], d, 0.6 + BACK, true); if (h && h.t - BACK < best) { best = Math.max(0, h.t - BACK); back = d[0] * h.face[0] + d[1] * h.face[1] + d[2] * h.face[2] > 0; surf = h.surf; } }
    if (back && surf !== 'fence' && best > worst.depth) worst = { depth: best, truck: zs > 0 ? 'the front' : 'the back', surf };
  }
  return worst;
}
/* THE SIM'S OWN WHEEL LINES INSIDE A SOLID: the four points the sim's seat probes from (body.js attach: the board's middle ± half the wheelbase
   along it ± half the track across it, on its contact plane) — 0.85 cm further out than a drawn wheel's middle (WX). A placement whose wheel
   line is inside a solid is a start no ride makes (a rolling wheel stops a millimetre short of a face: rollOn); the support sweep lifts its
   straddles clear of these too (10-17: placed with a line 0.7 cm into the Ten's second riser while the drawn wheel read clear, the seat took
   the step above as that wheel's ground and tipped the board 47°) → { depth, wheel } */
export function simWheelsInside(world, sk) {
  const up = sk.up, f = sk.fwd, s = [f[1] * up[2] - f[2] * up[1], f[2] * up[0] - f[0] * up[2], f[0] * up[1] - f[1] * up[0]], sl = Math.hypot(...s) || 1, hw = PHYSICS.wheelbase / 2, ht = PHYSICS.track / 2;
  let worst = { depth: 0, wheel: '' };
  for (const fs of [1, -1]) for (const ss of [1, -1]) {
    const o = [0, 1, 2].map((i) => sk.p[i] + f[i] * hw * fs + (s[i] / sl) * ht * ss);
    let best = Infinity, back = false;
    for (const d of DIRS) { const h = world.bvh.raycast([o[0] - d[0] * BACK, o[1] - d[1] * BACK, o[2] - d[2] * BACK], d, 0.6 + BACK, true); if (h && h.t - BACK < best) { best = Math.max(0, h.t - BACK); back = d[0] * h.face[0] + d[1] * h.face[1] + d[2] * h.face[2] > 0 && h.surf !== 'fence'; } }
    if (back && best > worst.depth) worst = { depth: best, wheel: (fs > 0 ? 'front' : 'back') + (ss > 0 ? ' right' : ' left') };
  }
  return worst;
}
