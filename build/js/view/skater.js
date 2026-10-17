/* JUNO ON THE BOARD: the sculpt meshed and skinned to a skeleton bound in her stance; eyes; and every frame a pose — feet pinned to the
 * deck by two-bone IK, hips that sink with the crouch, a lean into the carve, a head that looks down the line, arms that balance, a push
 * off the toe side, feet that leave the board through a flip and come back for the catch, and a tumble when it goes wrong. */
import * as THREE from '../../vendor/three/build/three.module.min.js';
import { bindSkeleton, junoAtBudget, weights, pieceWeights, occlusion, HEAD_DROP, junoLaces, LACE_R, DRAWN, FACE, lidMesh } from './sculpt.js';
import { SKATERS, BOARD, PHYSICS, LEGS } from '../config.js';
import { clothOf, clothVertex, clothFragment, clothMain } from './cloth.js';
import { second, follower, carry, chase, first } from '../formulas/follow.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion;
/* the body's two followers (formulas/follow.js, the one form): the hips on the legs — no lag riding steadily, a change of the board's motion
   landing on the gap — and the body's attitude after the board's, its turn's acceleration capped */
const LEGS_P = second({ f: LEGS.hz, z: LEGS.zeta, r: 2 }), TRUNK_P = second({ f: LEGS.tiltHz, z: LEGS.zeta, r: 2, cap: LEGS.tiltAcc });
/* the crouch (critically damped at 3 Hz, from rest: a pop's load let go on a first-order lag threw the hips' target up at 2.9 m/s in a frame)
   and the head's look down the line (from rest: set straight to its line at the top of a quarter it whipped 120° in a frame) */
const CROUCH_P = second({ f: 3, z: 1, r: 0 }), LOOK_P = second({ f: 7.5 / (2 * Math.PI), z: 1, r: 0 });
/* HER SKELETON AND HER POSE, with nothing on them: the page dresses it (buildSkater) and the camera's test of the moving states
 * (tests/camera_moving.mjs) reads the same bones the page draws */
export function rigSkater(who = SKATERS[0]) {
  const B = bindSkeleton(who.height), names = Object.keys(B);
  const rig = new THREE.Group(); rig.name = 'skater';
  const bones = {};
  for (const n of names) { bones[n] = new THREE.Bone(); bones[n].name = n; }
  for (const n of names) { const d = B[n], ph = d.parent ? B[d.parent].head : [0, 0, 0]; bones[n].position.set(d.head[0] - ph[0], d.head[1] - ph[1], d.head[2] - ph[2]); if (d.parent) bones[d.parent].add(bones[n]); }
  rig.add(bones.hips); rig.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(names.map((n) => bones[n]));
  /* ---------------- the pose ---------------- */
  const bind = {}; for (const n of names) bind[n] = { head: new V3(...B[n].head), tail: new V3(...B[n].tail) };
  const len = (n) => bind[n].head.distanceTo(bind[n].tail);
  const legBend = {}, armBend = {};
  for (const s of ['L', 'R']) {
    const dt = bind['thigh' + s].tail.clone().sub(bind['thigh' + s].head).normalize(), ds = bind['shin' + s].tail.clone().sub(bind['shin' + s].head).normalize();
    legBend[s] = new V3().crossVectors(dt, ds).normalize();
    const da = bind['arm' + s].tail.clone().sub(bind['arm' + s].head).normalize(), df = bind['fore' + s].tail.clone().sub(bind['fore' + s].head).normalize();
    armBend[s] = new V3().crossVectors(da, df); if (armBend[s].lengthSq() < 1e-6) armBend[s].set(0, 0, s === 'L' ? 1 : -1); armBend[s].normalize();
  }
  const frame = (d, b) => { const x = d.clone().normalize(), y = b.clone().normalize(), z = new V3().crossVectors(x, y).normalize(); y.crossVectors(z, x).normalize(); return new THREE.Matrix4().makeBasis(x, y, z); };
  const rotBetween = (dBind, bBind, dNew, bNew) => new Q().setFromRotationMatrix(frame(dNew, bNew).multiply(frame(dBind, bBind).transpose()));
  const modelQ = {};       // each bone's rotation in rig space this frame
  const setLocal = (n, qModel) => { const par = B[n].parent; const pq = par ? modelQ[par] : new Q(); bones[n].quaternion.copy(pq.clone().invert().multiply(qModel)); modelQ[n] = qModel.clone(); };
  const jointPos = (n) => { /* a bone's head in rig space, from its parent's pose */ const par = B[n].parent; if (!par) return bones[n].position.clone(); return jointPos(par).add(bind[n].head.clone().sub(bind[par].head).applyQuaternion(modelQ[par])); };
  /* two-bone IK: the upper and lower bone take the root to the target, bending toward `pole` */
  function ik(upper, lower, target, pole, bendBind, softReach = false) {
    const A = jointPos(upper), l1 = len(upper), l2 = len(lower);
    const toT = target.clone().sub(A); let d = toT.length(); const dir = toT.clone().normalize();
    /* a soft reach: the last 4 % of a limb's length is come to gently (near straight, the elbow's angle swings fastest for the least change of
       reach — a limb snapped straight at 1,741°/s in a grab, 10-16) */
    const L = l1 + l2, soft = softReach ? 0.04 * L : 1e-4; if (softReach && d > L - soft) d = L - soft * Math.exp(-(d - (L - soft)) / soft); else d = Math.min(d, L - 1e-4);   // (the legs place a foot exactly: soft, the planted foot rose off the ground)
    d = Math.max(d, Math.abs(l1 - l2) + 1e-4);
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const pl = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const K = A.clone().addScaledVector(dir, a).addScaledVector(pl, h), T = A.clone().addScaledVector(dir, d);
    const dU = K.clone().sub(A).normalize(), dL = T.clone().sub(K).normalize();
    /* the bend's plane is the pole's: the same normal whether the limb is bent or straight (straight, the cross of its two halves is nothing —
       its fallback to the bound pose's plane snapped a straight arm's twist: 2,505°/s in a grab, 10-16) */
    let bn = new V3().crossVectors(pl, dir); if (bn.lengthSq() < 1e-8) bn = bendBind.clone(); bn.normalize();
    const dUb = bind[upper].tail.clone().sub(bind[upper].head).normalize(), dLb = bind[lower].tail.clone().sub(bind[lower].head).normalize();
    setLocal(upper, rotBetween(dUb, bendBind, dU, bn)); setLocal(lower, rotBetween(dLb, bendBind, dL, bn));
    return T;
  }
  const qAxis = (x, y, z, a) => new Q().setFromAxisAngle(new V3(x, y, z).normalize(), a);
  /* a rotation with the same look (its +z) and no roll against the rig's up: the eye line level */
  const UP = new V3(0, 1, 0), ORIGIN = new V3(), lv = new THREE.Matrix4();
  const level = (q) => new Q().setFromRotationMatrix(lv.lookAt(new V3(0, 0, 1).applyQuaternion(q), ORIGIN, UP));
  const st = { push: 0, turn: 0, air: 0, flip: 0, crouch: 0, lean: 0, leanA: 0, arms: 0, grab: 0, absorb: 0, t: 0, bail: null, look: 1, was: 'roll', footB: null, from: null, swing: 0 };
  /* rig space: facing the toe side, left foot to the nose; the board's deck top is y = 0. The rig keeps its quarter turn: a push turns the hips
     and the shoulders, never the whole of her as a block (10-16, the owner: "very stiff on the thrust") */
  rig.rotation.y = -Math.PI / 2;
  const toRig = (b) => new V3(b.z, b.y, -b.x);     // board space (x across, heel side +x; z along, nose +z) into the rig's
  /* THE BACK FOOT'S STROKE, in board space (the sim's stroke: sim/body.js): on the tail; reaching off it to plant on the ground beside the front
     truck; planted while the board rolls away from it (no slide: it moves back exactly as far as the board rolls); lifted and swung forward low
     to plant again; or back onto the tail. Each path starts where the last one ended */
  const GROUND = -BOARD.truckHeight - BOARD.wheel / 2 - 0.004, TAIL = new V3(0.04, 0.006, -0.205), PLANT = new V3(-0.165, GROUND, 0.095);
  const bez = (a, c, b, u) => a.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(c, 2 * u * (1 - u)).addScaledVector(b, u * u);
  const ease = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  /* the stroke's foot as its BALL and its toe's way, in board space, on curves whose speed carries across every change of phase (each a Hermite
     from where the foot is, at the speed it moves, to where it goes, at the speed it must arrive there): it comes down at the ground's speed
     under the board — backward along the board as fast as the board rolls — and lifts at it, so it neither skids as it lands nor is dragged as
     it lifts (ended at rest on the board, it landed at 7.9 m/s over the ground: the sweep, 10-16); over the deck's edge it is up before it is
     across. Planted, the ball and the toe are pinned in the WORLD where the foot came down (held in board space they yawed with the board: the
     planted foot slid in a turn, the supervisor's M3), read back into the board each frame. `toeOff` is the heel's rise about the ball,
     carried from the drive into the step home (dropped there at once, the ankle snapped 43° in a frame: M5) */
  const BALL = (sole, toe) => sole.clone().addScaledVector(toe, 0.0705).add(new V3(0, 0.0495, 0));
  const TOE_TAIL = new V3(-1, 0, -0.1).normalize(), TOE_PUSH = new V3(-0.3, 0, 1).normalize();
  /* along one axis, from `a` at speed `va` to `b` at speed `vb` in `T`, `e` its eased share by now: the start's speed carried off and the
     arrival's taken up over TAU — a foot leaves the ground at the ground's speed and sheds it in a few hundredths of a second, as a leg whips
     it (a Hermite spread it over the whole step: at 6.5 m/s the foot drifted 23 cm back and the knee snapped, 2,323°/s) */
  const TAU = 0.025, LIFT_ON = 0.03, COME_IN = 0.06, lerp = (a, b, u) => a + (b - a) * u;
  /* no further than a leg gives: lifted at the end of a drive (the leg already long behind) the foot drifts on at most LIFT_ON, and coming in
     to plant it reaches at most COME_IN ahead of where it lands — the time to shed or take up a speed is cut to fit; past its end the foot
     goes on at its arrival speed */
  const glide = (a, va, b, vb, T, t, e) => {
    if (t >= T) return b + vb * (t - T);
    const ta = Math.min(TAU, LIFT_ON / Math.max(1e-3, Math.abs(va))), tb = Math.min(TAU, COME_IN / Math.max(1e-3, Math.abs(vb)));
    return a + (b - a) * e + va * ta * (1 - Math.exp(-t / ta)) * (1 - e) + vb * tb * (Math.exp(-(T - t) / tb) - 1) * e;
  };
  function strokeFoot(k, s, frame, dt) {
    const S = s.stroke, P = PHYSICS.push, tail = { ball: BALL(TAIL, TOE_TAIL), toe: TOE_TAIL };
    const here = st.footB || { ball: tail.ball.clone(), toe: TOE_TAIL.clone(), toeOff: 0, vel: new V3() };
    /* the ground under the board as the board sees it: backward along it, as fast as it rolls (board space: +z the nose) */
    const gz = -(s.v && s.fwd ? s.v[0] * s.fwd[0] + s.v[2] * s.fwd[2] : 0);
    /* a step between the ground beside the board and the deck: along the board on a Hermite (from the foot's speed to `m1z`), across it once
       the foot is up (the deck's edge between), up and over on its own arc */
    const step = (F, to, T, t, vz, lift, outFirst) => { const u = Math.min(1, t / T); return new V3(
      glide(F.ball.x, F.vel.x, to.x, 0, T, t, outFirst ? ease(u / 0.7) : ease((u - 0.3) / 0.7)),
      /* up first (off the ground it rises from its first frame, the knee bending as the toe leaves), then down onto where it goes */
      outFirst ? F.ball.y * (1 - ease(u)) ** 2 + 2 * ease(u) * (1 - ease(u)) * lift + to.y * ease(u) ** 2
        : u < 0.45 ? F.ball.y + (lift - F.ball.y) * Math.sin(Math.PI / 2 * u / 0.45) : lift + (to.y - lift) * ease((u - 0.45) / 0.55),
      glide(F.ball.z, F.vel.z, to.z, vz, T, t, ease(u))); };
    if (!S) {
      /* the stroke gone with no step home (off the ground with the foot out): home over a tenth of a second, from its own speed */
      st.plantW = null; st.seg0 = 0;
      if (here.ball.distanceToSquared(tail.ball) < 1e-8) { st.home = null; return { ball: tail.ball.clone(), toe: TOE_TAIL.clone(), toeOff: 0, out: 0, planted: false }; }
      if (!st.home) st.home = { t: 0, F: { ball: here.ball.clone(), toe: here.toe.clone(), toeOff: here.toeOff, vel: here.vel.clone() } };
      st.home.t += dt; const H = st.home, u = Math.min(1, H.t / 0.1), b = step(H.F, tail.ball, 0.1, H.t, 0, Math.max(H.F.ball.y, tail.ball.y) + 0.03, false);
      return { ball: b, toe: H.F.toe.clone().lerp(TOE_TAIL, ease(u)).normalize(), toeOff: H.F.toeOff * (1 - ease(u)), out: 1 - u, planted: false };
    }
    st.home = null;
    /* each segment from where the foot is AS IT BEGINS, at its speed, on the sim's own clock: the sim's segment begins somewhere inside the
       frame, so the foot is carried at its own speed from the frame before to that instant (taken as it was, it held still on the board for
       a frame and rode with it — 3.7 m/s over the ground at every landing and lift) */
    if (S.seg !== st.seg0) { const lag = Math.max(0, dt - S.segT); st.from = { ball: here.ball.clone().addScaledVector(here.vel, lag), toe: here.toe.clone(), toeOff: here.toeOff, vel: here.vel.clone() }; st.seg0 = S.seg; st.plantW = null; }
    const ct = S.segT;
    const F = st.from || here, plantBall = BALL(PLANT, TOE_PUSH);
    if (S.phase === 'reach') {
      const T = P.reach, u = Math.min(1, ct / T);
      return { ball: step(F, plantBall, T, ct, gz, Math.max(F.ball.y, tail.ball.y) + 0.03, true), toe: F.toe.clone().lerp(TOE_PUSH, ease(u)).normalize(), toeOff: F.toeOff * (1 - ease(u)), out: ease(u), planted: false };
    }
    if (S.phase === 'drive') {
      /* pinned where it came down: in the world, read back into the board as it stands THIS frame (moved for it, its matrix not yet made:
         a matrix a frame old slid the foot by the frame's change of speed, 15 cm/s through a push) */
      /* the heel rises about the ball through the drive's end — over its last 55 %, never quicker than 70 ms (at 7 m/s a drive lasts 65 ms:
         timed by its share, the ankle turned 43° in two frames) */
      const T = Math.max(0.01, S.drive), rise = Math.min(T, Math.max(0.07, 0.55 * T)), off = ease((ct - (T - rise)) / rise);
      if (frame) {
        frame.updateWorldMatrix(true, false);
        /* pinned where it came down: the plant as the board stood when the sim planted it, the board's own roll since (S.dist) behind it —
           not the plant's place as the board stands now, a frame's roll on (3.7 m/s at the landing) */
        if (!st.plantW) st.plantW = { ball: frame.localToWorld(plantBall.clone().add(new V3(0, 0, -S.dist))), toe: TOE_PUSH.clone().transformDirection(frame.matrixWorld) };
        const inv = new THREE.Matrix4().copy(frame.matrixWorld).invert();
        return { ball: st.plantW.ball.clone().applyMatrix4(inv), toe: st.plantW.toe.clone().transformDirection(inv), toeOff: off, out: 1, planted: true };
      }
      return { ball: plantBall.clone().add(new V3(0, 0, -S.dist)), toe: TOE_PUSH.clone(), toeOff: off, out: 1, planted: true };
    }
    if (S.phase === 'swing') {
      /* forward beside the board, low: lifted at the ground's speed, set down at it */
      const T = Math.max(0.05, P.swing), u = Math.min(1, ct / T);
      const b = new V3(glide(F.ball.x, F.vel.x, plantBall.x, 0, T, ct, ease(u)), lerp(F.ball.y, plantBall.y, u) + 0.07 * Math.sin(Math.PI * u), glide(F.ball.z, F.vel.z, plantBall.z, gz, T, ct, ease(u)));
      return { ball: b, toe: F.toe.clone().lerp(TOE_PUSH, ease(u)).normalize(), toeOff: F.toeOff * (1 - ease(ct / (0.4 * T))), out: 1, planted: false };
    }
    /* home onto the tail: from its own speed, up off the ground, over the deck's edge, down onto the tail at rest on it (quick when the trick
       hand calls it) */
    const T = Math.max(1e-3, S.backT), u = Math.min(1, ct / T);
    return { ball: step(F, tail.ball, T, Math.min(ct, T), 0, Math.max(F.ball.y, tail.ball.y) + 0.01, false), toe: F.toe.clone().lerp(TOE_TAIL, ease(u)).normalize(), toeOff: F.toeOff * (1 - ease(ct / Math.min(0.12, T))), out: 1 - ease(u), planted: false };
  }
  function pose(dt, s, boardSpeed) {
    st.t += dt;
    const k = (want, cur, tau) => first(Math.max(1e-4, tau), cur, want, dt);
    const speed = s.speed != null ? s.speed : Math.hypot(...(s.v || [0, 0, 0]));
    /* a stroke turns the hips and the shoulders toward the nose (pushing, a skater faces the way the board goes: the front foot pivots to point
       at the nose and the hips square to it — coaching descriptions, CLEANROOM.md), and back as the foot comes home */
    /* the turn into a stroke and out of it on an S-curve: over 0.2 s into it (through the reach: facing the way it goes by the plant), over 0.3 s
       back (an exponential at 0.05 s had the hips at 1,089°/s from rest — the supervisor's W1: natural, not just under the bound) */
    const stroking = (s.stroke && !(s.stroke.phase === 'back' && s.stroke.t > s.stroke.backT * 0.45)) || s.glide;   // between two strokes of a push held (home and riding) he stays turned to the nose
    st.turnP = Math.max(0, Math.min(1, (st.turnP || 0) + (stroking ? dt / 0.2 : -dt / 0.3))); st.turn = ease(st.turnP);
    st.push = st.turn;
    st.air = k(s.state === 'air' ? 1 : 0, st.air, 0.08);
    /* a landing is taken in the knees — by the legs' spring (below): the impact's speed lands on the gap and the knees give with it. The pose's
       own dip on top of it (13 cm in 35 ms) is gone (10-16): it threw the hips' target down at 354 m/s² as the board landed, and the hips
       took 165 off the Five Rail and 176 at the East Wall's coping catch; without it they take 137 and under */
    st.was = s.state; st.absorb = 0;
    const drivePhase = s.stroke && s.stroke.phase === 'drive' ? s.stroke.t / Math.max(0.01, s.stroke.drive) : 0;
    /* the crouch on a critically damped spring at 3 Hz (10-16): on a first-order lag its speed jumped the moment its target did — a pop's load
       let go threw the hips' target up at 2.9 m/s in a frame, and the hips took 152 m/s² off a standing ollie; on the spring it starts from rest */
    { const want = Math.max(s.crouch || 0, s.state === 'roll' ? 0.3 : 0, s.state === 'air' ? 0.35 + 0.25 * Math.sin(Math.min(1, (s.airT || 0) / 0.6) * Math.PI) : 0, s.braking ? 0.2 : 0, s.state === 'grind' || s.state === 'manual' ? 0.25 : 0); st.crouchS = st.crouchS || follower(want); st.crouch = chase(CROUCH_P, st.crouchS, want, dt); }
    /* THE CARVE'S LEAN IS ITS PHYSICS: the body leans into the turn as far as the turn pulls, atan(v·ω / g) — the sim's own curvature (sim/body.js:
       lean × min(v², lateral)) — about the board's long axis, toward the toes in a frontside turn */
    const PC = PHYSICS.carve, aLat = s.state === 'roll' && speed >= PC.kickturnBelow ? (s.lean || 0) * Math.min(speed * speed, PC.lateral) : 0;
    st.leanA = k(Math.atan2(aLat, 9.81), st.leanA, 0.12);
    st.lean = k(s.state === 'roll' ? (s.lean || 0) : 0, st.lean, 0.1);
    st.arms = k(s.state === 'grind' || s.state === 'manual' || s.state === 'lip' ? 1 : s.state === 'air' ? 0.6 : 0, st.arms, 0.15);
    const flipLift = s.trick && s.trick.prog < 1 ? Math.sin(s.trick.prog * Math.PI) : 0; st.flip = k(flipLift, st.flip, 0.03);
    st.grab = k(s.grab ? 1 : 0, st.grab, 0.1);
    /* the stroke's own depth: the front knee bends as the back foot reaches down to the ground, deepest through the drive */
    /* deepest at the end of the drive: the front knee gives as the back leg goes long behind (and the leg's reach is the hip's height) */
    st.sink = k(s.stroke ? (s.stroke.phase === 'drive' ? 0.04 + 0.05 * Math.min(1, drivePhase) : s.stroke.phase === 'back' ? 0 : 0.04) : 0, st.sink || 0, 0.06);
    const pushSink = st.turn * 0.04 + st.sink;
    const breath = Math.sin(st.t * 2 * Math.PI * 0.23), sway = Math.sin(st.t * 2 * Math.PI * 0.11);
    /* hips: over the middle of the board, over the front foot through a stroke; sinking with the crouch, the stroke and a landing; moved into
       the carve's lean (the lean pivots the body about the feet) */
    /* a grab folds her over the board: the knees up, the trunk down to the hand going to the deck */
    const hipH = 0.905 - 0.25 * st.crouch - 0.04 * st.air - pushSink - 0.13 * st.absorb - 0.27 * st.grab;
    const balance = st.arms * Math.sin(st.t * 5.1 + 0.6) * 0.012;   // on a grind or a manual the hips keep finding the balance
    const hips = new V3(-0.02 + st.turn * 0.1 + 0.006 * sway * (1 - st.turn), hipH * Math.cos(st.leanA), -0.025 + hipH * Math.sin(st.leanA) * 0.85 + st.turn * 0.025 + balance);
    /* THE BODY RIDES ITS LEGS (10-16, the owner: "smoothness"): where the pose puts the hips is a TARGET (the references: Skate's joints blend
       from physics to the animation's target). The hips follow it on a damped spring (LEGS), carried in the gap between them — the target's
       change of velocity lands on the gap (the body's inertia: the board pops up under it, and the knees bend), the damper acts on their
       relative motion (riding steadily, no lag) — and the gap is the legs' to take, within their reach in the board's frame. The legs' IK
       below solves from the hips where they are to the feet where the pose pins them (rigid, the hips took every jolt of the board: 235 m/s²
       at a pop, 255 at a rail's bend, 760 at a coping caught out of a vert air) */
    st.poseHips = hips.clone();   // where the pose puts the hips, before any follower (the chain trace reads it: tests/lib/chain.mjs)
    let Rr = null;   // the body's attitude against the board's, in the rig's frame (null: the same)
    if (s.fallen) { st.legs = null; st.att = null; }   // off the board, the fall owns the body: the springs stand down, and start fresh after
    else if (rig.parent && dt > 0) {
      rig.updateWorldMatrix(true, false);
      /* ITS ATTITUDE RIDES THE LEGS TOO: it follows the board's on the same spring — a board that pitches over a seam, rolls onto a coping,
         turns out of a vert air turns under the feet, and the ankles and knees take the turn (bolted to it, the hips 0.85 m above swung with
         every turn of the board: over the Sun Bank's seam its pitch rate stepped 0 → 300°/s → 0, and the hips took each step) */
      const qB = rig.parent.getWorldQuaternion(new THREE.Quaternion()), O = rig.parent.getWorldPosition(new V3()), at = st.att;
      if (!at || !st.legs) st.att = { q: qB.clone(), w: new V3(), y: new V3(), yv: new V3(), lam: null, lamW: null, ys: new V3(), ysv: new V3() };
      else {
        const dq = qB.clone().multiply(at.q.clone().invert()); if (dq.w < 0) { dq.x = -dq.x; dq.y = -dq.y; dq.z = -dq.z; dq.w = -dq.w; }
        const ang = 2 * Math.acos(Math.min(1, dq.w)), sn = Math.sqrt(Math.max(1e-12, 1 - dq.w * dq.w)), wB = new V3(dq.x / sn, dq.y / sn, dq.z / sn).multiplyScalar(ang > 1e-9 ? ang / dt : 0);
        if (ang > 1.2) { at.y.set(0, 0, 0); at.yv.set(0, 0, 0); at.lam = null; at.lamW = null; at.ys.set(0, 0, 0); at.ysv.set(0, 0, 0); }   // a cut (a respawn, a fall's end): no chase
        else {
          /* the body follows the board on the spring (riding steadily, no lag), the ACCELERATION of its turn capped at `tiltAcc` (10-16, the
             standard rate-limited spring): a step in the board's turn rate came on the body at once, 2ω·Δω — 109 rad/s² for the 410°/s of the
             Sun Bank's seam, and the hips 0.92 m above took 92 m/s² from it. Capped, the body turns no harder than a person's own balance
             would, and lags the board a little more through a sharp change. LEANING INTO A DROP (body.js leanAhead: the wall's attitude, reached
             for before the edge) its target is the board's attitude turned by that lean — the body on its own capped spring all the way, never set
             (10-16, the supervisor: round a coping a lead set on the body had stepped its turn at the start and the end) */
          const lam = s.ahead ? new V3(...s.ahead) : new V3(), lam0 = at.lam || lam, lamW = lam.clone().sub(lam0).divideScalar(dt), lamW0 = at.lamW || new V3();
          /* the target's change of rate, as the body's own turn sees it: the gap y is a turn ON the board's attitude (the body = R(y)·board),
             so a step Δ in the board's rate keeps the body's rate whole only if the gap's rate takes −(Δ + ½ y × Δ) (the exponential map's
             Jacobian to first order; 10-16: taken as −Δ alone, a drop-in leaning 26° landed with the body's turn stepping to 73 rad/s²) */
          const wT = wB.clone().add(lamW), wT0 = at.w.clone().add(lamW0), dW = wT.clone().sub(wT0), corr = new V3().crossVectors(at.y, wB.clone().sub(at.w)).multiplyScalar(0.5);   // (the board's own step: the lean is in the gap's own space)
          const sp = { u: at.y.clone().sub(lam0), ud: at.yv.clone().sub(lamW0), v: wT.clone().sub(dW).sub(corr) };
          carry(TRUNK_P, sp, wT, dt);
          /* THE LEAN AS THE BODY TAKES IT ALONE: the same capped spring on the lean, the board held still — the share of the attitude that is
             the lean (the hips take a third of it: below) */
          const sh = { u: at.ys.clone().sub(lam0), ud: at.ysv.clone().sub(lamW0), v: lamW0.clone() };
          carry(TRUNK_P, sh, lamW, dt);
          at.ys.copy(sh.u).add(lam); at.ysv.copy(sh.ud).add(lamW);
          at.y.copy(sp.u).add(lam); at.yv.copy(sp.ud).add(lamW); at.lam = lam; at.lamW = lamW;
        }
        /* AT THE LEGS' LIMIT THE BOARD CARRIES THE BODY (10-17): the gap held to LEGS.tilt keeps only its rate back in — never its rate round the
           limit (with only its outward rate taken, the body slid round the board at the limit: off the Deck Quarter's slant on Cruise, the board
           swung 58° to the floor and 15° onto its line in 0.15 s, the gap held there turned 171° in 0.2 s, and her trunk ended 42° back from the
           board with her head against the ramp — the camera found no place that saw her). tests/lib/gap.mjs reads it */
        const l = at.y.length(); if (l > LEGS.tilt) { at.y.multiplyScalar(LEGS.tilt / l); const e = at.y.clone().divideScalar(LEGS.tilt), r = at.yv.dot(e); at.yv.copy(e).multiplyScalar(Math.min(0, r)); }
        at.q = qB.clone(); at.w = wB;
      }
      const yl = st.att.y.length(), Rw = yl > 1e-9 ? new THREE.Quaternion().setFromAxisAngle(st.att.y.clone().divideScalar(yl), yl) : new THREE.Quaternion();
      const C = rig.getWorldQuaternion(new THREE.Quaternion()); Rr = C.clone().invert().multiply(Rw).multiply(C);
      /* THE LEAN IS A HIP HINGE (10-16, the supervisor: "The trunk takes the turn, the hips move a third of it, and the back leg stays under
         0.98 of straight"): the trunk turns by the whole attitude (Rr, below); the hips are carried by it less two thirds of the lean (turned
         rigidly about the board's middle, a 29° lean had carried them 45 cm ahead and the back leg straight) */
      const yp = st.att.y.clone().addScaledVector(st.att.ys || new V3(), -2 / 3), ypl = yp.length(), Rp = ypl > 1e-9 ? new THREE.Quaternion().setFromAxisAngle(yp.clone().divideScalar(ypl), ypl) : new THREE.Quaternion();
      const T = rig.localToWorld(hips.clone()).sub(O).applyQuaternion(Rp).add(O), sp = st.legs;
      if (!sp || T.distanceTo(sp.T) > 0.6) st.legs = { T, v: new V3(...(s.v || [0, 0, 0])), u: new V3(), ud: new V3() };   // a start, or a cut (a respawn): no chase — already moving with the board (from rest, a run begun at 8.5 m/s read as the board leaping to it: 316 m/s²)
      else {
        const Tv = T.clone().sub(sp.T).divideScalar(dt);
        carry(LEGS_P, sp, Tv, dt);   // sp.u is the gap: the hips from where the pose puts them
        /* the legs' reach, in the board's frame */
        const B = rig.parent.matrixWorld, bx = new V3().setFromMatrixColumn(B, 0).normalize(), by = new V3().setFromMatrixColumn(B, 1).normalize(), bz = new V3().setFromMatrixColumn(B, 2).normalize();
        for (const [ax, lo, hi] of [[bx, -LEGS.sway, LEGS.sway], [by, -LEGS.sink, LEGS.rise], [bz, -LEGS.sway, LEGS.sway]]) {
          const g = sp.u.dot(ax), gc = Math.min(hi, Math.max(lo, g));
          if (gc !== g) { sp.u.addScaledVector(ax, gc - g); const gv = sp.ud.dot(ax); if ((g > hi && gv > 0) || (g < lo && gv < 0)) sp.ud.addScaledVector(ax, -gv); }
        }
        sp.T = T;
      }
      hips.copy(rig.worldToLocal(T.clone().add(st.legs.u)));
    }
    bones.hips.position.copy(hips);
    /* the hips' turn toward the nose, the trunk's lean forward over the front foot (12° through a stroke, more down in it), the carve's lean */
    const fwdLean = st.crouch * 0.15 + st.turn * (0.2 + 0.08 * Math.sin(Math.PI * Math.min(1, drivePhase))) + 0.1 * st.absorb + 0.55 * st.grab;
    const qh = (Rr ? Rr.clone() : new THREE.Quaternion()).multiply(qAxis(1, 0, 0, st.leanA * 0.85)).multiply(qAxis(0, 1, 0, st.turn * 1.1)).multiply(qAxis(1, 0, 0, fwdLean));   // the trunk turns with the body's attitude, not the board's
    modelQ.hips = qh; bones.hips.quaternion.copy(qh);
    /* the shoulders turn a little past the hips with the stroke, and counter the back leg: the arm on its side swings forward as it drives back */
    const swingW = s.stroke ? (s.stroke.phase === 'drive' ? Math.sin(Math.PI * Math.min(1, drivePhase)) : s.stroke.phase === 'swing' ? -Math.sin(Math.PI * Math.min(1, s.stroke.t / Math.max(0.05, PHYSICS.push.swing))) : 0) : 0;
    st.swing = k(swingW * st.turn, st.swing, 0.06);
    setLocal('spine', qh.clone().multiply(qAxis(1, 0, 0, st.crouch * 0.28 + st.air * 0.1 + 0.012 * breath)).multiply(qAxis(0, 1, 0, st.turn * 0.12 - st.swing * 0.08)));
    setLocal('chest', modelQ.spine.clone().multiply(qAxis(1, 0, 0, st.crouch * 0.12 + 0.01 * breath)).multiply(qAxis(0, 1, 0, st.turn * 0.1 - st.swing * 0.1 - st.leanA * 0.25)));
    /* the head looks down the line: toward the nose (or the tail, rolling fakie) — and keeps its eye line LEVEL, as a person's head does
       (measured 10-16: turned 60° down the line over a chest bent for the crouch, that bend came through as a 12.2° tilt of the head, and
       the owner read the face as lopsided): its look in the rig's frame, its roll against the rig's up taken out */
    /* the look TURNS to a new line, it never jumps to it (10-16, the owner: "smoothness"; the supervisor's T1: rolling fakie at the top of a
       quarter flipped this target 120° in one frame and the head whipped round at 4,650°/s): a critically damped turn toward the line, its
       step exact for any frame — 120° in about a third of a second, starting and ending soft, at most ~330°/s */
    const aim = (s.fakie ? -1 : 1) * 1.05;
    st.lookS = st.lookS || follower(aim);
    const look = chase(LOOK_P, st.lookS, aim, dt), chestYaw = st.turn * 1.32 - st.swing * 0.18;
    st.lookNow = look;   // what the head was turned to (read by the tests' chain: tests/lib/chain.mjs)
    setLocal('neck', level(modelQ.chest.clone().multiply(qAxis(0, 1, 0, (look - chestYaw) * 0.4)).multiply(qAxis(1, 0, 0, 0.12))));
    setLocal('head', level(modelQ.neck.clone().multiply(qAxis(0, 1, 0, (look - chestYaw) * 0.6)).multiply(qAxis(1, 0, 0, 0.18 + st.crouch * 0.1 - fwdLean * 0.5))));
    /* feet: the front pinned on its bolts (pivoting to point at the nose through a stroke); the back on the tail, or making its stroke; both lift
       through a flip */
    const lift = st.flip * 0.2, SF = strokeFoot(k, s, rig.parent, dt);
    st.footB = { ball: SF.ball.clone(), toe: SF.toe.clone(), toeOff: SF.toeOff, vel: st.footB && dt > 0 ? SF.ball.clone().sub(st.footB.ball).divideScalar(dt) : new V3() };   // its speed on the board: the next segment starts at it
    const toeF = new V3(-1, 0, 0.42).lerp(new V3(-0.22, 0, 1), st.turn).normalize(), toeB = SF.toe;
    /* each foot placed by the BALL of the foot (where a foot bears on what it stands on): the front one pivots about its ball on the bolts to
       point at the nose (pivoted about its middle, the ball slid 55 cm/s across the deck); the back one's ball is where its stroke puts the sole,
       and at the toe-off its heel rises about the ball, which stays on the ground. The bound foot: its ball 0.7 of the way to the toe, 12.4 cm
       from the ankle, 21.5° below it */
    const ballF = new V3(-0.03, 0.0495 + lift, 0.192), ballB = SF.ball.clone().add(new V3(0, lift * 0.9 * (1 - SF.out), 0));
    for (const [sd, ball0, toeB0, off] of [['L', ballF, toeF, 0], ['R', ballB, toeB, SF.toeOff]]) {
      const ball = toRig(ball0), toe = toRig(toeB0), a = 0.375 + 0.75 * off;
      const ankle = ball.clone().addScaledVector(toe, -0.1241 * Math.cos(a)).add(new V3(0, 0.1241 * Math.sin(a), 0));
      const pole = toe.clone().add(new V3(sd === 'L' ? 0.25 : -0.18, 0, 0)).normalize();
      ik('thigh' + sd, 'shin' + sd, ankle, pole, legBend[sd]);
      const fb = bind['foot' + sd].tail.clone().sub(bind['foot' + sd].head).normalize(), ub = new V3(0, 1, 0);
      const fd = toe.clone().multiplyScalar(Math.cos(a)).add(new V3(0, -Math.sin(a), 0));
      setLocal('foot' + sd, rotBetween(fb, ub, fd, new V3(0, 1, 0)));
    }
    /* ARMS BALANCE, they do not pose: relaxed at the sides rolling, swinging against the back leg through a stroke, out a little against a
       carve's lean; in the air out and up for balance but bent at the elbow and uneven (the front arm ahead, the back arm behind: never a T);
       out for a grind or a manual; a hand down to the board in a grab; down and forward to take a landing */
    const gDown = new V3(0, -1, 0).applyQuaternion(Rr || new THREE.Quaternion());   // the body's own down: the rig's, turned by the trunk's lag (gravity's swept round the trunk out of a vert air and flipped the elbows)
    for (const sd of ['L', 'R']) {
      const sx = sd === 'L' ? 1 : -1;
      setLocal('clav' + sd, modelQ.chest.clone().multiply(qAxis(0, 0, 1, sx * (0.05 + st.arms * 0.1 + st.air * 0.04))));
      const sh = jointPos('arm' + sd);
      /* the chest's own frame: its side (to her left), up, and front */
      const cx = new V3(1, 0, 0).applyQuaternion(modelQ.chest), cy = new V3(0, 1, 0).applyQuaternion(modelQ.chest), cz = new V3(0, 0, 1).applyQuaternion(modelQ.chest);
      /* in the air the arms rise for balance, held low and bent, the front one forward and the back one behind (spread out to the sides at
         shoulder height they read as wings, the clips of 10-16) */
      /* on a grind or a manual the arms balance him: out but low and uneven, the front one forward, the back one behind and lower, and
         working — a slow sway (straight out level and alike they were a T the length of the ledge, the clips of 10-16) */
      const bal = st.arms * Math.sin(st.t * 5.1 + (sd === 'L' ? 0 : 1.7));
      /* (relaxed, the hands hang at the thighs' sides: the cargos are baggy, so 12 cm off the shoulders' line is a hand at its pocket — 1.3–2.2
         cm off the cloth on the left, 4.4–4.9 on the right, within a hand's thickness: tests/hands.mjs reads them against the drawn cloth.
         R6.1, 10-17: brought in, the right hand cost the pop its forearm — 3 cm in, 1,533°/s out of a stroke's reach; the pop's arms are the
         body release's) */
      const out = 0.12 + st.arms * (sd === 'L' ? 0.14 : 0.1) + st.air * (sd === 'L' ? 0.07 : 0.05) + Math.abs(st.leanA) * 0.2 + 0.03 * bal;
      const down = -0.5 + st.arms * (sd === 'L' ? 0.2 : 0.1) + st.air * (sd === 'L' ? 0.2 : 0.1) - 0.05 * st.absorb + 0.035 * bal;
      /* front and back: his left arm leads toward the nose in the air and on a grind; through a stroke each swings against its leg */
      const ahead = 0.05 + st.air * (sd === 'L' ? 0.2 : -0.17) + st.arms * (sd === 'L' ? 0.2 : -0.16) + st.swing * (sd === 'R' ? 0.2 : -0.16) + 0.06 * st.absorb + Math.sin(st.t * 3.1 + sx) * 0.012;
      /* down is the body's own (an arm hangs by its weight, not along a trunk bent forward — nor along a board turning under the body: by the
         rig's own down, the hands swung with every turn of the board while the trunk rode its legs, the forearms at 3,000°/s); out and ahead
         are the chest's */
      let hand = sh.clone().addScaledVector(cx, sx * out).addScaledVector(gDown, -down).addScaledVector(cz, ahead);
      if (st.grab > 0.01 && sd === 'R') hand = hand.lerp(toRig(new V3(-0.11, 0.02, -0.02)), st.grab);
      /* a hand moves no faster than a hand can (3.5 m/s, a quick reach): a target that jumps — a grab's point a metre off — is reached, not
         snapped to (10-16: the arm went from bent to straight in two frames, 2,870°/s). Against its own shoulder, in the chest's frame: held
         in the rig's, the hands lagged a trunk turning against the board as it rode its legs, and the elbows whipped (3,400°/s) */
      const qc = modelQ.chest.clone().invert(), offC = hand.clone().sub(sh).applyQuaternion(qc), prevOff = st['hand' + sd];
      if (prevOff && dt > 0) { const d = offC.clone().sub(prevOff), m = 3.5 * dt; if (d.length() > m) { offC.copy(prevOff).addScaledVector(d.normalize(), m); hand = sh.clone().add(offC.clone().applyQuaternion(modelQ.chest)); } }
      st['hand' + sd] = offC.clone();
      /* the elbow bends behind the chest, out a little and down: in the chest's frame (turned with a stroke, a pole fixed in the rig put it out
         to the side) */
      /* (a hand going down to the board for a grab bends its elbow out to the side, as a reach down does) */
      const g = sd === 'R' ? st.grab : 0;
      ik('arm' + sd, 'fore' + sd, hand, cx.clone().multiplyScalar(sx * (0.3 + 0.9 * g)).addScaledVector(cy, -0.15 + 0.2 * g).addScaledVector(cz, -1 + 0.8 * g).normalize(), armBend[sd], true);
      setLocal('hand' + sd, modelQ['fore' + sd].clone());
    }
    void boardSpeed;
  }
  return { rig, bones, skeleton, pose, state: st, B, names };
}
/* the points of her the camera keeps in the picture and in sight (view/camera.js SAFE and SEEN): the top of her head, her head, chest and
   hips, her hands and her feet, in the world, off the bones as posed */
const KEEP = [['head', 'tail'], ['head', 'head'], ['chest', 'head'], ['hips', 'head'], ['handL', 'tail'], ['handR', 'tail'], ['footL', 'tail'], ['footR', 'tail']];
export function bodyPoints(R, out = []) {
  const tip = R.tips || (R.tips = {});
  for (let i = 0; i < KEEP.length; i++) {
    const [n, end] = KEEP[i], b = R.bones[n]; b.updateWorldMatrix(true, false);
    const v = (out[i] && out[i].isVector3) ? out[i] : (out[i] = new V3());
    if (end === 'head') v.setFromMatrixPosition(b.matrixWorld);
    else v.copy(tip[n] || (tip[n] = new V3(R.B[n].tail[0] - R.B[n].head[0], R.B[n].tail[1] - R.B[n].head[1], R.B[n].tail[2] - R.B[n].head[2]))).applyMatrix4(b.matrixWorld);
  }
  out.length = KEEP.length; return out;
}
export function buildSkater(stage, ledger, who = SKATERS[0], opts = {}) {
  const lod = opts.lod || 0, budget = opts.budget || DRAWN.budget[lod];
  const R = rigSkater(who), { rig, bones, skeleton, B, names } = R;
  /* the skin is bound in the rig's own frame, as it always was: before the quarter turn the pose gives the rig */
  const turned = rig.rotation.y; rig.rotation.y = 0; rig.updateMatrixWorld(true);
  /* every piece meshed on its own and painted its own colour (a second colour faded in where a piece has one), then all of them merged into
     ONE skinned mesh: one draw for the whole skater, and every seam a real edge */
  const C = (h) => new THREE.Color(h);
  const paint = { skin: [C(who.skin), 0.64], jacket: [C(who.jacket), 0.86], cuff: [C(who.jacket).multiplyScalar(0.78), 0.86], tee: [C(who.tee), 0.92], pants: [C(who.pants), 0.92],
    pocket: [C(who.pants).multiplyScalar(0.84), 0.92], shoe: [C(who.shoe), 0.8], lace: [C(who.lace), 0.9], sole: [C(who.sole), 0.66], beanie: [C(who.beanie), 0.97], hair: [C(who.hair), 0.58],
    lip: [C(who.skin).multiplyScalar(0.74).lerp(C('#8e3f33'), 0.4), 0.38] };
  const all = { pos: [], nrm: [], col: [], rough: [], cloth: [], occ: [], si: [], sw: [], idx: [] };
  let tris = 0;
  /* every piece meshed fine, then simplified to the budget (sculpt.js junoAtBudget: the face and the hands keep the larger share) */
  const built = junoAtBudget(B, budget, () => performance.now(), lod), timing = built.timing;
  for (const { pc, m } of built.out) {
    const t0 = performance.now(), w = pieceWeights(m.pos, B, names, pc), n = m.pos.length / 3, base = all.pos.length / 3;
    const [c0, r0] = paint[pc.paint], [c1, r1] = pc.alt ? paint[pc.alt] : paint[pc.paint], kind = clothOf(pc.name);
    for (let v = 0; v < n; v++) {
      const x = m.pos[v * 3], y = m.pos[v * 3 + 1], z = m.pos[v * 3 + 2], k = pc.w ? Math.max(0, Math.min(1, pc.w(x, y, z))) : 0, j = kind ? 1 : 1 + (hash(x * 91, y * 57, z * 73) - 0.5) * 0.02;   // the cloth has a texture of its own (cloth.js); a jitter on the mesh's regular vertices read as a dotted grid from afar
      all.col.push((c0.r + (c1.r - c0.r) * k) * j, (c0.g + (c1.g - c0.g) * k) * j, (c0.b + (c1.b - c0.b) * k) * j); all.rough.push(r0 + (r1 - r0) * k); all.cloth.push(kind);
      all.occ.push(pc.occlude ? occlusion(pc.f, x, y, z, m.nrm[v * 3], m.nrm[v * 3 + 1], m.nrm[v * 3 + 2]) : 1);
    }
    for (const q of m.pos) all.pos.push(q); for (const q of m.nrm) all.nrm.push(q); for (const q of w.si) all.si.push(q); for (const q of w.sw) all.sw.push(q); for (const q of m.idx) all.idx.push(q + base);
    tris += m.idx.length / 3; timing[pc.name] = Math.round(timing[pc.name] + performance.now() - t0);
  }
  /* the laces: each cord a tube laid on the upper, skinned by the same rule as the shoe under it (its foot and shin) so it bends with it */
  for (const L of lod === 0 ? junoLaces(B) : []) {   /* laces at the local skater's detail only (DRAWN) */
    const curve = new THREE.CatmullRomCurve3(L.pts.map((p) => new V3(...p)), L.closed), tg = new THREE.TubeGeometry(curve, DRAWN.laceTubular(L), LACE_R, DRAWN.laceRadial, L.closed);
    const p = tg.attributes.position.array, nm = tg.attributes.normal.array, base = all.pos.length / 3, w = weights(p, B, names, (nm2) => new RegExp('^(foot|shin)' + L.sd + '$').test(nm2)), [c, r] = paint.lace;
    for (let v = 0; v < p.length / 3; v++) { all.pos.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]); all.nrm.push(nm[v * 3], nm[v * 3 + 1], nm[v * 3 + 2]); all.col.push(c.r, c.g, c.b); all.rough.push(r); all.cloth.push(8); all.occ.push(1); }
    for (const q of w.si) all.si.push(q); for (const q of w.sw) all.sw.push(q); for (const q of tg.index.array) all.idx.push(q + base);
    tris += tg.index.count / 3; tg.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(all.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(all.nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(all.col, 3)); g.setAttribute('rough', new THREE.Float32BufferAttribute(all.rough, 1)); g.setAttribute('cloth', new THREE.Float32BufferAttribute(all.cloth, 1)); g.setAttribute('occ', new THREE.Float32BufferAttribute(all.occ, 1));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(all.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(all.sw, 4)); g.setIndex(all.idx);
  /* a little more of the sky's light on her than on the concrete: the figure reads in the shade of a low sun */
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, envMapIntensity: 1.9 }), clothU = { value: 1 }, pxU = { value: 0.001 }, partsU = { value: new THREE.Vector2(1, 1) };
  /* HER OWN SHADOW, read off her skin: the sun's map is a few centimetres a texel, and on a body that curves under a low sun the stage's small
     bias speckled her lit side in a fine grid (10-16, measured on one moment of a roll drawn five ways: gone with her shadow off; gone with the
     depth bias raised; NOT gone with the normal offset raised, until ten times as far). So her lookup moves out a texel and a half along her
     normal AND 8 cm toward the sun (`depthU` below). The park keeps the stage's bias: raised for all, the same 8 cm would part every contact shadow from what
     casts it (under a sun this low, a gap on the ground). */
  const SH = stage.sun.shadow, liftU = { value: 1.5 * (SH.camera.right - SH.camera.left) / SH.mapSize.x }, depthU = { value: 0.08 / (SH.camera.far - SH.camera.near) };
  const occU = { value: 1 }, headLiftU = { value: 1 };   // the face's occlusion (sculpt.js occlusion) and her shadow lift on the head: 1 as shipped (a test's switches)
  const LINE = 'shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );';
  const COORD = 'vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;';
  if (!THREE.ShaderChunk.shadowmap_vertex.includes(LINE) || !THREE.ShaderChunk.shadowmap_vertex.includes(COORD)) console.error('[waxline] the shadow chunk changed: her shadow lift is not applied');
  const shadowVertex = (lift) => THREE.ShaderChunk.shadowmap_vertex.replace(LINE, 'shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * ( directionalLightShadows[ i ].shadowNormalBias + uShadowLift * ' + lift + ' ), 0 );')
    .replace(COORD, COORD + ' vDirectionalShadowCoord[ i ].z -= uShadowDepth * ' + lift + ' * vDirectionalShadowCoord[ i ].w;');
  /* HER LIGHT, on everything that is her (the skin, the eyes, the lids): her own shadow lift, and the rim and the fill below. The eyes and the
     lids had neither (10-16): beside a skin lit by both they read as dark holes */
  const herLight = (sh, spec = '1.0', occ = '1.0', lift = '1.0') => {
    sh.uniforms.uShadowLift = liftU; sh.uniforms.uShadowDepth = depthU; sh.uniforms.uOcc = occU; sh.uniforms.uHeadLift = headLiftU;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uShadowLift; uniform float uShadowDepth; uniform float uHeadLift;').replace('#include <shadowmap_vertex>', shadowVertex(lift));
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uOcc;');
    /* the low sun grazes her edge: a warm rim, strongest on the side the sun is on, that keeps the figure whole against a dark tree */
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      #if NUM_DIR_LIGHTS > 0
      { float rimF = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0); float sunSide = saturate(dot(normal, directionalLights[0].direction) * 0.6 + 0.4);
        reflectedLight.directDiffuse += directionalLights[0].color * rimF * sunSide * 0.16 * diffuseColor.rgb; }
      #endif
      /* the occlusion: all of the sky's light and the fill, and half the sun's (the sun's map is centimetres a texel: it can draw no shadow of a
         brow on a socket, of a nose on a cheek — measured 10-16, her lift cut on the head changed the face by 0.02 of 255) */
      { float ao = ${occ}; reflectedLight.directDiffuse *= mix(1.0, ao, 0.55);
        vec3 kd = normalize(vec3(-0.45, 0.55, 0.7)); reflectedLight.directDiffuse += vec3(1.0, 0.93, 0.84) * (max(dot(normal, kd), 0.0) * 0.55 + 0.12) * diffuseColor.rgb * ao;
        reflectedLight.indirectDiffuse *= ao; reflectedLight.indirectSpecular *= ${spec} * ao; reflectedLight.directSpecular *= ${spec}; }`);
  };
  /* skin reflects less than the material's default (its F0 is lower than 0.04), and the sky's light on her is raised for her shade: raised in
     her specular too, every crease's far wall caught it at a grazing look as a white streak (10-16: the nose's wing, the mouth's corner, the
     brow's inner end) — the sun's own highlight as much as the sky's: edge-on, it turned the far brow's dark hair pale */
  const SKIN_SPEC = '0.45';
  mat.onBeforeCompile = (sh) => {
    herLight(sh, '(vCloth < 0.5 || vCloth > 8.5 ? ' + SKIN_SPEC + ' * cl_shine : 1.0)', 'mix(1.0, vOcc, uOcc)', '(cloth > 8.5 ? uHeadLift : 1.0)');
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float occ; varying float vOcc;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOcc = occ;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vOcc;');
    sh.uniforms.uCloth = clothU; sh.uniforms.uPxAngle = pxU; sh.uniforms.uClothParts = partsU;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float rough; varying float vRough;\n' + clothVertex.decl).replace('#include <begin_vertex>', '#include <begin_vertex>\nvRough = rough; ' + clothVertex.body);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vRough;\n' + clothFragment(B, (h) => new THREE.Color(h), who)).replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + clothMain);
  };
  const sm = new THREE.SkinnedMesh(g, mat); sm.name = 'juno'; sm.castShadow = true; sm.receiveShadow = true; sm.frustumCulled = false;
  /* the angle one pixel spans, for the cloth's fade (cloth.js): read off the camera and the drawing buffer each time she is drawn */
  const dbs = new THREE.Vector2();
  sm.onBeforeRender = (renderer, scene, camera) => { if (pxU.pin) pxU.value = pxU.pin; else if (camera.isPerspectiveCamera) pxU.value = 2 * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, renderer.getDrawingBufferSize(dbs).y); };   // pin: a test draws a frame finer with the native pixel's fade
  rig.add(sm); sm.bind(skeleton); const meshes = [sm];
  /* the ink line of the painted style: the same skin, pushed out along its normals by a share of its distance (so the line is the same
     width near and far) and drawn from behind */
  const hullMat = new THREE.MeshBasicMaterial({ color: 0x24170f, side: THREE.BackSide });
  hullMat.onBeforeCompile = (sh) => { sh.uniforms.uInk = { value: 0.0026 }; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uInk;').replace('#include <project_vertex>', '#include <project_vertex>\n{ vec3 vn = normalize(normalMatrix * objectNormal); mvPosition.xyz += vn * uInk * max(1.0, -mvPosition.z); gl_Position = projectionMatrix * mvPosition; }'); };
  const hull = new THREE.SkinnedMesh(g, hullMat); hull.name = 'juno:ink'; hull.frustumCulled = false; hull.visible = false; hull.castShadow = false;
  rig.add(hull); hull.bind(skeleton, sm.bindMatrix);
  const nv = all.pos.length / 3; ledger.set('geo:skater', nv * (12 + 12 + 12 + 4 + 8 + 16) + all.idx.length * 4);
  /* the eyes, set back in their sockets, each between its two lids (sculpt.js lidMesh: an almond opening, a lid thick at its margin, the
     lash line, a crease) — on the head bone, finer than any grid; the brows are hair the skin's shader paints (cloth.js) */
  const FE = FACE.eye, local = (p) => new V3(p[0] - B.head.head[0], p[1] - HEAD_DROP - B.head.head[1], p[2] - B.head.head[2]);
  const eyeMat = new THREE.MeshStandardMaterial({ map: eyeTexture(who.eye), roughness: 0.08, metalness: 0, envMapIntensity: 1.6 });
  const lidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, envMapIntensity: 1.9 });
  eyeMat.onBeforeCompile = (sh) => herLight(sh, '1.0', '1.0', 'uHeadLift'); lidMat.onBeforeCompile = (sh) => herLight(sh, SKIN_SPEC, '1.0', 'uHeadLift');
  const lash = new THREE.Color('#160d08'), lidSkin = paint.skin[0].clone().multiplyScalar(0.93);
  const lidGeo = (upper, across, rows) => {
    const L = lidMesh(upper, across, rows), g = new THREE.BufferGeometry(), col = [];
    for (const d of L.dark) { const c = lidSkin.clone().lerp(lash, d); col.push(c.r, c.g, c.b); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(L.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(L.nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(L.idx);
    return g;
  };
  const EY = DRAWN.eye[lod], upG = lidGeo(true, EY.lid[0], EY.lid[1]), loG = lidGeo(false, EY.lo[0], EY.lo[1]);
  const eyes = [], lids = [];
  for (const sx of [1, -1]) {
    const c = local([FE.c[0] * sx, FE.c[1], FE.c[2]]);
    const e = new THREE.Mesh(new THREE.SphereGeometry(FE.r, EY.sclera[0], EY.sclera[1]), eyeMat); e.position.copy(c); e.rotation.order = 'YXZ'; bones.head.add(e); eyes.push(e);
    /* each lid in the opening's frame: mirrored for the right eye, turned FACE.lid.out outward, and following the eye's look up and down */
    for (const [g, follow] of [[upG, 0.55], [loG, 0.3]]) {
      const l = new THREE.Mesh(g, lidMat); l.position.copy(c); l.scale.x = sx; l.rotation.order = 'YXZ'; l.rotation.y = sx * FACE.lid.out * Math.PI / 180;
      l.userData.follow = follow; l.userData.eye = e; bones.head.add(l); lids.push(l);
    }
    e.castShadow = false; e.receiveShadow = true;
    tris += EY.sclera[0] * EY.sclera[1] * 2 + EY.lid[0] * EY.lid[1] * 2 + EY.lo[0] * EY.lo[1] * 2;
  }
  for (const l of lids) { l.castShadow = false; l.receiveShadow = true; }
  /* THE EYES LOOK AT ONE THING (10-16: each was turned 3.4° out and looked straight ahead from its own centre, so seen from in front the
     irises sat toward the outer corners): every pose turns both toward one point — what she looks at (`gaze`, a point in the world: the
     lens on the title) or else 4 m down her own look — each within the turn an eye has in its socket */
  const mid = local([0, FE.c[1], FE.c[2]]), tl = new V3(), inv = new THREE.Matrix4(), EYE_YAW = 0.45, EYE_PITCH = 0.35;
  const clampA = (v, m) => Math.max(-m, Math.min(m, v)), posed = R.pose;
  R.gaze = null;
  R.aimEyes = () => {
    const hb = bones.head; hb.updateWorldMatrix(true, false);
    if (R.gaze) tl.copy(R.gaze).applyMatrix4(inv.copy(hb.matrixWorld).invert()); else tl.set(mid.x, mid.y, mid.z + 4);
    for (const e of eyes) { const dx = tl.x - e.position.x, dy = tl.y - e.position.y, dz = tl.z - e.position.z;
      e.rotation.set(clampA(-Math.atan2(dy, Math.hypot(dx, dz)), EYE_PITCH), clampA(Math.atan2(dx, dz), EYE_YAW), 0); }
    for (const l of lids) l.rotation.x = l.userData.eye.rotation.x * l.userData.follow;   // the lids follow the look up and down
  };
  R.pose = (dt, s, sp) => { posed(dt, s, sp); R.aimEyes(); };
  R.eyes = eyes;
  rig.rotation.y = turned; rig.updateMatrixWorld(true); R.aimEyes();
  return Object.assign(R, { tris, meshes, hull, timing, cloth: clothU, shadowLift: liftU, shadowDepth: depthU, px: pxU, clothParts: partsU, occ: occU, headLift: headLiftU });
}
function hash(x, y, z) { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); }
/* an eye, facing +z: a warm white greying toward its back; an iris 28° across its radius with a dark rim at its edge and fibres out from the
   pupil; the pupil. No painted catch-light: the light's own highlight on the wet ball is the catch-light, and it stays with the light */
function eyeTexture(irisHex) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'), W = c.width, H = c.height, R = W / 360;   // px a degree, across and down alike
  /* the sphere's +z is at u = 0.25 (three's SphereGeometry starts at -x): the iris is drawn there */
  const cx = W / 4, cy = H / 2;
  const sg = x.createRadialGradient(cx, cy, 0, cx, cy, 95 * R); sg.addColorStop(0, '#efe6da'); sg.addColorStop(0.5, '#e4d8c8'); sg.addColorStop(1, '#a89884');
  x.fillStyle = sg; x.fillRect(0, 0, W, H);
  const ir = 28 * R, pr = 10 * R, base = new THREE.Color(irisHex), hex = (k) => '#' + base.clone().multiplyScalar(k).getHexString();
  const g = x.createRadialGradient(cx, cy, pr, cx, cy, ir); g.addColorStop(0, hex(0.62)); g.addColorStop(0.4, hex(1.05)); g.addColorStop(0.82, hex(0.78)); g.addColorStop(1, '#0c0705');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, ir, 0, Math.PI * 2); x.fill();
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let k = 0; k < 120; k++) { const a = rnd() * Math.PI * 2, r0 = pr * (1.05 + rnd() * 0.2), r1 = ir * (0.7 + rnd() * 0.25);
    x.strokeStyle = rnd() < 0.5 ? hex(1.35) : hex(0.55); x.globalAlpha = 0.18 + rnd() * 0.18; x.lineWidth = 0.6 + rnd() * 0.8;
    x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a + 0.05) * r1, cy + Math.sin(a + 0.05) * r1); x.stroke(); }
  x.globalAlpha = 1; x.fillStyle = '#050403'; x.beginPath(); x.arc(cx, cy, pr, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
