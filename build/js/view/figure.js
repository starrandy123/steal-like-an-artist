/* WHERE HER BODY IS: the board on the sim's frame, her pose, and her fall — one source for the page (main.js) and the camera's test of the
 * moving states (tests/camera_moving.mjs), so the test reads the bones the page draws, frame by frame, in the page's order. */
import * as THREE from '../../vendor/three/build/three.module.min.js';
import { PHYSICS } from '../config.js';
import { chooseFall, stepFall } from './fall.js';
import { bodyPoints } from './skater.js';
import { mix, mix3, slerpFrame } from '../formulas/step.js';

const M = new THREE.Matrix4(), X = new THREE.Vector3(), Yv = new THREE.Vector3(), Z = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
/* the board on the sim's frame: the deck's top above the wheels' line, its axes the sim's up and heading */
export function boardOnFrame(board, s) {
  Yv.set(...s.up); Z.set(...s.fwd); X.crossVectors(Yv, Z).normalize(); Z.crossVectors(X, Yv).normalize();
  board.position.set(s.p[0] + s.up[0] * PHYSICS.deckTop, s.p[1] + s.up[1] * PHYSICS.deckTop, s.p[2] + s.up[2] * PHYSICS.deckTop);
  board.quaternion.setFromRotationMatrix(M.makeBasis(X, Yv, Z));
}
/* THE DRAWN STATE (10-16, the supervisor's A): what the page draws is the sim BETWEEN its last two steps, at the frame's alpha (formulas/step.js
   — Fiedler's blend): her place, her speed, her board's up and heading, her lean, crouch, the balance needle, a flip's progress and the lean
   into a drop are mixed (attitudes turned the short way); the stroke's clocks and the air's are the newest step's less the part of a step
   not yet drawn; every discrete thing (the state, the trick, the phase, the events) is the newest step's. `prev` is the sim's read before its
   last step; with none (a still picture), the newest step as it is */
export function drawn(prev, cur, a, step = PHYSICS.step) {
  const s = Object.assign({}, cur), k = (1 - a) * step;
  s.p = mix3(prev.p, cur.p, a); s.v = mix3(prev.v, cur.v, a); s.speed = Math.hypot(s.v[0], s.v[1], s.v[2]);
  const fr = slerpFrame(prev.up, prev.fwd, cur.up, cur.fwd, a); s.up = fr.up; s.fwd = fr.fwd;
  s.lean = mix(prev.lean, cur.lean, a); s.crouch = mix(prev.crouch, cur.crouch, a); s.needle = mix(prev.needle || 0, cur.needle || 0, a); s.wobble = mix(prev.wobble || 0, cur.wobble || 0, a);
  if (cur.trick && prev.trick && prev.trick.name === cur.trick.name) s.trick = Object.assign({}, cur.trick, { prog: mix(prev.trick.prog, cur.trick.prog, a) });
  /* the stroke is the step's whose part of it holds the drawn instant: begun (its phase) less than the undrawn part of a step ago, the drawn
     instant is still in the phase before — the previous read's, run on by the drawn part (a phase's clock and the foot's curve on it are one
     thing: the newest phase on the last one's clock put the foot a step ahead of its own curve at every plant and lift, 4.6 m/s over the
     ground) */
  const sv = Math.hypot(cur.v[0], cur.v[2]);
  if (cur.stroke && (cur.stroke.segT >= k || !prev.stroke)) s.stroke = Object.assign({}, cur.stroke, { t: Math.max(0, cur.stroke.t - k), segT: Math.max(0, cur.stroke.segT - k), dist: Math.max(0, cur.stroke.dist - k * sv) });
  else if (prev.stroke && (!cur.stroke || cur.stroke.segT < k)) { const d = a * step; s.stroke = Object.assign({}, prev.stroke, { t: prev.stroke.t + d, segT: prev.stroke.segT + d, dist: prev.stroke.dist + d * sv }); }
  if (cur.ahead || prev.ahead) s.ahead = mix3(prev.ahead || [0, 0, 0], cur.ahead || [0, 0, 0], a);
  s.drawnLag = k;   // how far behind the newest step the drawn instant is (s)
  return s;
}
/* what her pose reads from the sim, drawn at alpha `a` between `prev` and the newest step; the page adds the thumb's load and the space bar
   to the crouch */
export function poseInput(sim, crouch = 0, prev = null, a = 1) {
  const s = prev ? drawn(prev, sim.read(), a) : sim.read(), lag = prev ? (1 - a) * PHYSICS.step : 0;
  s.crouch = Math.max(s.crouch, crouch); s.airT = sim.air ? Math.max(0, sim.t - lag - sim.air.t0) : 0; s.braking = sim.braking; s.pushing = sim.pushing; return s;
}
/* one frame of her: the board on the frame (unless she is falling), her pose, then the fall (after the pose: the fall owns where the rig
   lies and which way — the pose's own quarter turn would undo it) */
export function stepFigure(dt, s, juno, board, fall) {
  if (!fall.on) boardOnFrame(board, s);
  juno.pose(dt, fall.on ? fall.poseOf(s) : s);
  if (fall.on) fall.step(dt);
}
/* what the camera follows: the sim's frame, or in a fall the middle of her where she lies */
export function followed(s, fall) { return fall.on ? Object.assign({}, s, { p: fall.centre(), v: [0, 0, 0] }) : s; }

/* THE FALL: her rig is taken off the board into the world where it stood, stood up on her heading if she fell off a slope, and tipped over
   the way fall.js found room for; the board flies on by itself and bounces off what it meets */
export class Fall {
  constructor(world, scene, juno, board) { this.world = world; this.scene = scene; this.juno = juno; this.board = board; this.f = null; this.x = null; }
  get on() { return !!this.f; }
  /* the way she goes down (a test may hand another one in, to plant the old fall) */
  choose(pos, vel) { return chooseFall(this.world, pos, vel); }
  start(e) {
    if (this.f) return;
    const rig = this.juno.rig, lq = rig.quaternion.clone(); rig.updateMatrixWorld(true);
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3(); rig.matrixWorld.decompose(wp, wq, ws);
    this.scene.add(rig); rig.position.copy(wp); rig.quaternion.copy(wq);
    const fw = new THREE.Vector3(0, 0, 1).applyQuaternion(this.board.quaternion).setY(0);
    if (fw.lengthSq() < 1e-4) fw.set(e.v[0], 0, e.v[2]); if (fw.lengthSq() < 1e-4) fw.set(0, 0, 1); fw.normalize();
    const upright = new THREE.Quaternion().setFromRotationMatrix(M.makeBasis(new THREE.Vector3().crossVectors(UP, fw).normalize(), UP, fw)).multiply(lq);
    this.f = this.choose([wp.x, wp.y, wp.z], e.v);
    const b = this.board;
    this.x = { from: wq.clone(), upright, axis: new THREE.Vector3().crossVectors(UP, new THREE.Vector3(...this.f.dir)).normalize(),
      board: { p: b.position.clone(), v: new THREE.Vector3(...e.v).multiplyScalar(0.8).add(new THREE.Vector3(0, 2.2, 0)), spin: new THREE.Vector3(7, 3, 5), q: b.quaternion.clone() } };
  }
  /* falling: arms out to break it, knees up */
  poseOf(s) { return Object.assign({}, s, { state: 'grind', crouch: 0.7, fallen: true }); }   // fallen: the fall owns where the body is (the legs' springs stand down)
  step(dt) {
    const f = this.f, x = this.x, st = stepFall(this.world, f, dt), rig = this.juno.rig;
    rig.position.set(f.pos[0], f.pos[1] + 0.02 + (1 - st.k) * 0.12, f.pos[2]);
    const stood = x.from.clone().slerp(x.upright, Math.min(1, f.t / 0.25));
    rig.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(x.axis, st.angle).multiply(stood));
    /* she lies ON the ground: the rig turns about her soles, which would sink a shoe or a hand into it — lifted by the deepest of her points
       below the ground under it (the shoe and the hand reach ~5 cm past their bones) */
    rig.updateMatrixWorld(true); let lift = 0;
    for (const q of bodyPoints(this.juno, this.pts || (this.pts = []))) { const g = this.world.groundAt(q.x, q.y + 0.6, q.z, 2); if (g) lift = Math.max(lift, g.point[1] + 0.05 - q.y); }
    if (lift > 0) { rig.position.y += lift; rig.updateMatrixWorld(true); }
    /* the board: thrown on, bouncing off the ground and anything standing */
    const b = x.board; b.v.y -= PHYSICS.gAir * dt;
    const hs = Math.hypot(b.v.x, b.v.z);
    if (hs > 0.05) { const hit = this.world.bvh.raycast([b.p.x, b.p.y, b.p.z], [b.v.x / hs, 0, b.v.z / hs], hs * dt + 0.25); if (hit) { b.v.x *= -0.3; b.v.z *= -0.3; } }
    b.p.addScaledVector(b.v, dt);
    const bg = this.world.groundAt(b.p.x, b.p.y + 0.3, b.p.z, 3); if (bg && b.p.y < bg.point[1] + 0.06) { b.p.y = bg.point[1] + 0.06; b.v.y = Math.abs(b.v.y) * 0.35; b.v.x *= 0.7; b.v.z *= 0.7; b.spin.multiplyScalar(0.6); }
    b.q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(b.spin.x * dt, b.spin.y * dt, b.spin.z * dt))); this.board.position.copy(b.p); this.board.quaternion.copy(b.q);
  }
  /* the middle of her where she lies (her hips, never below the ground she is on) */
  centre() { const h = this.juno.bones.hips.getWorldPosition(new THREE.Vector3()); return [h.x, Math.max(this.f.pos[1], h.y - 0.6), h.z]; }
  end() { if (!this.f) return; const rig = this.juno.rig; this.board.add(rig); rig.position.set(0, 0, 0); rig.quaternion.identity(); rig.rotation.set(0, -Math.PI / 2, 0); this.f = null; this.x = null; }
}
