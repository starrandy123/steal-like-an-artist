/* THE MOTION, read in Node off the real sim and the real pose (the owner, 10-16: "we need the body movements to be actually natural like the
 * skaters. Its very stiff on the thrust"). The sim steps at 120 Hz as the page's does; the figure is posed every other step, as the page poses
 * it every frame (60 a second); the board stands on the sim's frame and the rig on the board, as on the page. Read, frame by frame:
 *   1. THE PUSH IS IN PHASE: every step that gains speed on the flat is a drive's, and the back foot is on the ground through every drive
 *      (read by step: a frame holds two). The supervisor's corrected bar, 10-16: no
 *      lead after the plant — a fixed delay had squeezed the push into 25 ms at 4–6 g; the force over the whole contact is the sweep's to read).
 *   2. THE PUSH'S SHAPE: the back foot plants beside or ahead of the front foot on the toe side and drives back; it swings back up no higher
 *      than 12 cm (no back-kick); through the drive the front knee bends, the trunk leans forward over the front foot, the hips and the
 *      shoulders face the way the board goes (coaching descriptions of the push: CLEANROOM.md).
 *   3. NO FOOT SLIDES: a foot on the deck stays where it is on the deck; the back foot on the ground stays where it is on the ground.
 *   4. THE CARVE LEANS AS FAR AS IT PULLS: the line from the feet to the chest, against the board's up across the turn, within LEAN_TOL of
 *      atan(v·ω / g) — the sim's own speed and turn.
 *   5. THE ARMS BALANCE: never a T in the air or on a grind (both upper arms out past 60°, within 20° of each other, for longer than a moment).
 *   6. NO POPS: every joint's turn between two frames, as an angular speed, under JOINT_MAX — through a push, rolling, a carve, an ollie
 *      (its crouch, its pop, its air, its landing), a flip, a grab, a grind in and out.
 * Each prints its numbers; the verdict is the last line. */
import * as THREE from '../build/vendor/three/build/three.module.min.js';
import { rig as simRig, flick, pull } from './lib/rig.mjs';
import { rigSkater } from '../build/js/view/skater.js';
import { boardOnFrame, poseInput } from '../build/js/view/figure.js';
import { PHYSICS } from '../build/js/config.js';
import { clock, advance, alpha } from '../build/js/formulas/step.js';
import { legsReader, pinRms, HIPS, REACH, FEET } from './lib/legs.mjs';
import { chain, CENSUS } from './lib/chain.mjs';
const V = THREE.Vector3, D = 180 / Math.PI;
/* JOINT_MAX: a person's joints peak about 1,000–1,500°/s in a jump's push-off and its landing (knee and hip); a pop is 30–90° in one frame.
   THE HIPS RIDE THE LEGS (tests/lib/legs.mjs, the supervisor's classes, 10-16): their world acceleration ≤ 60 m/s² on the ground, ≤ 150 in
   the 0.2 s after a pop, a landing or a catch (the air reported), within the legs' reach of the board and the feet pinned — read as their
   speed against the board they had been ≤ 3 m/s: the legs give now, on purpose */
const LEAN_TOL = 6, JOINT_MAX = 1500, T_ARMS_S = 0.15, LIFT_MAX = 0.12, PLANT_LEAD = 0.1, SLIDE_MAX = 0.05;
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };

/* a skater on the park, posed as the page poses it; `frame()` steps two sim steps and poses once, and reads what the walls need */
function figure(o) {
  const R = simRig(o), F = rigSkater(), board = new THREE.Group(); board.add(F.rig);
  const bones = F.bones, B = F.B, prevQ = {}, out = { R, F, board, t: 0, jointWorst: { v: 0, at: '' }, C: clock(PHYSICS.step, PHYSICS.maxSteps), prev: null };
  const ball = (sd) => { const b = bones['foot' + sd], off = new V().fromArray(B['foot' + sd].tail).sub(new V().fromArray(B['foot' + sd].head)).multiplyScalar(0.7); return b.localToWorld(off); };
  const at = (n, end = 'head') => (end === 'head' ? new V().setFromMatrixPosition(bones[n].matrixWorld) : bones[n].localToWorld(new V().fromArray(B[n].tail).sub(new V().fromArray(B[n].head))));
  const len = (n) => new V().fromArray(B[n].tail).distanceTo(new V().fromArray(B[n].head)), legLen = { L: len('thighL') + len('shinL'), R: len('thighR') + len('shinR') };
  const stretch = (sd) => at('thigh' + sd).distanceTo(at('foot' + sd)) / legLen[sd];
  out.ball = ball; out.at = at; out.stretch = stretch; out.legs = legsReader({ board, F, ball, stretch }, 2 * PHYSICS.step);
  out.chain = chain(out, 2 * PHYSICS.step, 600); out.f = 0;   // where a RED here starts (tests/lib/chain.mjs)
  out.frame = (label) => {
    /* two sim steps one at a time: each step's gain of speed and the stroke's phase it was taken in (a frame's gain read against its END
       pose blamed the lift for the drive's last step) */
    const nEv = R.log.length;
    out.steps = []; advance(out.C, 2 * PHYSICS.step, () => { const sk = R.sk, ph = sk.stroke ? sk.stroke.phase : null, v0 = Math.hypot(sk.v[0], sk.v[2]); out.prev = sk.read(); R.step(1); out.steps.push({ phase: ph, gain: Math.hypot(sk.v[0], sk.v[2]) - v0 }); });   // the page's clock, the read before the newest step kept (the blend: figure.js drawn)
    out.t += 2 * PHYSICS.step;
    const s = poseInput(R.sk, 0, out.prev, alpha(out.C)); boardOnFrame(board, s); F.pose(2 * PHYSICS.step, s); board.updateMatrixWorld(true);
    /* the body on its legs (the supervisor's classes) */
    const evs = R.log.slice(nEv); if (R.sk.state === 'bail' || evs.some((e) => e.type === 'bail')) { out.legs.reset(); out.chain.reset(); } else { out.legs.frame(R.sk.state, evs, label, { stroking: !!R.sk.stroke }); out.chain.frame(out.f, R.sk, evs); } out.f++;
    /* every joint's own turn since the last frame (its rotation against its parent's: what a pop is) */
    for (const n of F.names) { const q = bones[n].quaternion; if (prevQ[n]) { const a = 2 * Math.acos(Math.min(1, Math.abs(prevQ[n].dot(q)))) * D / (2 * PHYSICS.step); if (a > out.jointWorst.v) out.jointWorst = { v: a, at: n + ' in ' + label + ' at ' + out.t.toFixed(2) + ' s (' + R.sk.state + ')', f: out.f }; } prevQ[n] = q.clone(); }
    return s;
  };
  return out;
}
const flatGround = (R) => R.sk.surface !== 'ramp' && R.sk.up[1] > 0.995;
/* the hips on the legs, as the sweep reads them: is it within the classes, and its numbers */
const legsOk = (G) => { const L = G.legs.W; return L.ground.v <= HIPS.ground && L.impulse.v <= HIPS.impulse && L.gap.sink <= REACH.sink + 1e-6 && L.gap.rise <= REACH.rise + 1e-6 && L.gap.sway <= REACH.sway + 1e-6 && L.straight.v <= REACH.straight && pinRms(L) <= FEET.rms && L.pin.worstImpulse <= FEET.impulse; };
const legsSay = (G) => { const L = G.legs.W; return 'the hips ' + L.ground.v.toFixed(0) + ' m/s² on the ground (≤ ' + HIPS.ground + '), ' + L.impulse.v.toFixed(0) + ' through an impulse (≤ ' + HIPS.impulse + '; ' + (L.impulse.at || L.ground.at) + '), within reach (sink ' + (L.gap.sink * 100).toFixed(1) + ', rise ' + (L.gap.rise * 100).toFixed(1) + ', sway ' + (L.gap.sway * 100).toFixed(1) + ' cm; legs ' + L.straight.v.toFixed(3) + ' of straight), the feet ' + (pinRms(L) * 100).toFixed(2) + ' cm RMS off their pins'; };
/* an upper arm's reach out to the side: the angle from the trunk's down toward the chest's side, the forward-and-back part left out */
const sideOut = (G) => (sd) => {
  const e = G.F.bones.chest.matrixWorld.elements, side = new V(e[0], e[1], e[2]).normalize(), down = G.at('spine').sub(G.at('neck')).normalize();
  const arm = G.at('fore' + sd).sub(G.at('arm' + sd)).normalize();
  return Math.atan2(Math.abs(arm.dot(side)), arm.dot(down)) * D;
};

/* 1–3. PUSHING from rest on the flat (the plaza: flat all the way, measured), the thumb held up for 2.4 s, then let go */
{
  const G = figure({ at: [30, 0, 14], heading: 90, speed: 0 }), R = G.R; R.throttle = 1;
  let contact = null, gains = 0, gainsOff = 0, driveOff = 0, leadMin = Infinity, plants = [], lift = 0, kneeMin = 180, trunkMin = 90, hipsWorst = 0, chestWorst = 0, slideB = 0, slideF = 0, drive = 0;
  let prevSpeed = 0, prevBallB = null, prevBallFLocal = null, inSwing = false, prevDrive = false;
  for (let f = 0; f < 3.4 * 60; f++) {
    if (G.t > 2.4) R.throttle = 0;
    const s = G.frame('push'), speed = Math.hypot(R.sk.v[0], R.sk.v[2]), ground = R.sk.p[1];
    const bB = G.ball('R'), bF = G.ball('L'), soleB = bB.y - 0.045 - ground, onGround = soleB < 0.012;
    if (onGround && !contact) { contact = G.t; const L = G.board.worldToLocal(bB.clone()); plants.push(L); }
    if (!onGround) contact = null;
    /* a gain on the flat (rolling only loses speed there): the foot down, and down long enough */
    if (flatGround(R)) for (const k of G.steps) if (k.gain > 0.001) { gains++; if (k.phase !== 'drive') gainsOff++; }
    if (s.stroke && s.stroke.phase === 'drive' && s.stroke.segT > 0.02 && !onGround) driveOff++;
    prevSpeed = speed;
    const S = s.stroke;
    if (S && (S.phase === 'swing' || S.phase === 'back')) lift = Math.max(lift, soleB);
    if (S && S.phase === 'drive' && S.t > 0.05) {
      drive++;
      /* the front knee: the angle between the thigh and the shin (0 straight) */
      const hip = G.at('thighL'), knee = G.at('shinL'), ankle = G.at('footL'), th = knee.clone().sub(hip).normalize(), sh = ankle.clone().sub(knee).normalize();
      kneeMin = Math.min(kneeMin, Math.acos(Math.max(-1, Math.min(1, th.dot(sh)))) * D);
      /* the trunk: from the hips to the base of the neck, its lean forward along the way the board goes */
      /* the way the board goes: its own forward (from rest the speed is nothing for the stroke's first 100 ms — a zero vector read as 90°) */
      const go = new V(R.sk.fwd[0], 0, R.sk.fwd[2]).normalize().multiplyScalar(R.sk.fakie ? -1 : 1), trunk = G.at('neck').sub(G.at('hips'));
      trunkMin = Math.min(trunkMin, Math.atan2(trunk.dot(go), trunk.y) * D);
      /* the hips' and the chest's facing (their +z) against the way the board goes, on the ground */
      const face = (n) => { const e = G.F.bones[n].matrixWorld.elements, z = new V(e[8], 0, e[10]).normalize(); return Math.acos(Math.max(-1, Math.min(1, z.dot(go)))) * D; };
      hipsWorst = Math.max(hipsWorst, face('hips')); chestWorst = Math.max(chestWorst, face('chest'));
      /* the planted foot on the ground: how fast it moves there */
      if (onGround && prevBallB && prevDrive) slideB = Math.max(slideB, Math.hypot(bB.x - prevBallB.x, bB.z - prevBallB.z) / (2 * PHYSICS.step));   // planted in both frames (the touchdown frame is no slide)
    }
    /* the front foot on the deck: how fast it moves on the deck */
    const LF = G.board.worldToLocal(bF.clone());
    if (prevBallFLocal) slideF = Math.max(slideF, LF.distanceTo(prevBallFLocal) / (2 * PHYSICS.step));
    prevBallB = onGround ? bB.clone() : null; prevBallFLocal = LF; prevDrive = !!(S && S.phase === 'drive' && S.t > 0.02); void inSwing;
  }
  const v = Math.hypot(R.sk.v[0], R.sk.v[2]);
  ok(gains > 40 && gainsOff === 0 && driveOff === 0, 'THE PUSH IS IN PHASE: ' + gains + ' steps of gain on the flat, ' + gainsOff + ' of them outside a drive (none); ' + driveOff + ' drive frames with the back foot off the ground (none); ' + v.toFixed(1) + ' m/s after 2.4 s held');
  const pz = Math.min(...plants.map((p) => p.z)), px = Math.max(...plants.map((p) => p.x));
  ok(plants.length >= 3 && pz >= 0.03 && px <= -0.11, 'THE PUSH PLANTS: ' + plants.length + ' plants, each beside the board on the toe side (x ≤ ' + px.toFixed(3) + ' m, ≤ -0.11) and by the front foot (z ≥ ' + pz.toFixed(3) + ' m, ≥ 0.03)');
  ok(lift <= LIFT_MAX && lift > 0.02, 'THE FOOT COMES BACK LOW: at most ' + (lift * 100).toFixed(1) + ' cm off the ground on its way forward or home (≤ ' + LIFT_MAX * 100 + '; no back-kick)');
  ok(drive > 10 && kneeMin >= 30 && trunkMin >= 8, 'THE DRIVE: the front knee bent at least ' + kneeMin.toFixed(0) + '° (≥ 30), the trunk leaning forward at least ' + trunkMin.toFixed(0) + '° (≥ 8) over ' + drive + ' frames');
  ok(hipsWorst <= 35 && chestWorst <= 30, 'THE DRIVE FACES THE WAY IT GOES: the hips at most ' + hipsWorst.toFixed(0) + '° off it (≤ 35), the shoulders ' + chestWorst.toFixed(0) + '° (≤ 30)');
  ok(slideB <= SLIDE_MAX && slideF <= SLIDE_MAX, 'NO FOOT SLIDES: the planted back foot moves at most ' + (slideB * 100).toFixed(1) + ' cm/s on the ground, the front foot ' + (slideF * 100).toFixed(1) + ' cm/s on the deck (≤ ' + SLIDE_MAX * 100 + ')');
  ok(G.jointWorst.v <= JOINT_MAX && legsOk(G), 'NO POPS pushing: the fastest joint turns ' + G.jointWorst.v.toFixed(0) + '°/s (≤ ' + JOINT_MAX + '; ' + G.jointWorst.at + '), ' + legsSay(G));
}

/* 4. THE CARVE: a full carve at speed, held */
{
  const G = figure({ at: [20, 0, 14], heading: 0, speed: 5.5 }), R = G.R; R.steer = 1;
  let worst = 0, n = 0, rows = [], prevYaw = null;
  for (let f = 0; f < 1.6 * 60; f++) {
    G.frame('carve'); const yaw = Math.atan2(R.sk.fwd[0], R.sk.fwd[2]);
    if (prevYaw != null && G.t > 0.6 && R.sk.state === 'roll' && flatGround(R)) {
      let d = yaw - prevYaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const v = Math.hypot(R.sk.v[0], R.sk.v[2]), w = d / (2 * PHYSICS.step), want = Math.atan2(Math.abs(v * w), 9.81) * D;
      /* the body's lean: from between the balls of the feet to the base of the neck, across the board (its up and its side) */
      const up = new V(...R.sk.up), side = new V(...R.sk.fwd).cross(up).normalize(), mid = G.ball('L').add(G.ball('R')).multiplyScalar(0.5), b = G.at('neck').sub(mid);
      const got = Math.abs(Math.atan2(b.dot(side), b.dot(up)) * D);
      worst = Math.max(worst, Math.abs(got - want)); n++; if (n % 20 === 1) rows.push(want.toFixed(0) + '°→' + got.toFixed(0) + '°');
    }
    prevYaw = yaw;
  }
  ok(n > 20 && worst <= LEAN_TOL, 'THE CARVE LEANS AS IT PULLS: the body\'s lean within ' + worst.toFixed(1) + '° of atan(v·ω/g) over ' + n + ' frames (≤ ' + LEAN_TOL + '; the physics → the body: ' + rows.join(', ') + ')');
  ok(G.jointWorst.v <= JOINT_MAX && legsOk(G), 'NO POPS carving: ' + G.jointWorst.v.toFixed(0) + '°/s (≤ ' + JOINT_MAX + '; ' + G.jointWorst.at + '), ' + legsSay(G));
}

/* 5–6. AN OLLIE, A KICKFLIP, A GRAB: the arms in the air, and every joint through the crouch, the pop, the air, the landing */
for (const [name, grab] of [['Ollie', false], ['Kickflip', false], ['Ollie', true]]) {
  const G = figure({ at: [30, 0, 14], heading: 90, speed: 4.5 }), R = G.R;
  for (let f = 0; f < 20; f++) G.frame(name);
  R.thumb(flick(name, { load: 40 }));
  let air = 0, tFrames = 0, tRun = 0, landed = false, grabbed = false;
  for (let f = 0; f < 2.0 * 60; f++) {
    G.frame(name + (grab ? ' with a grab' : ''));
    if (grab && R.sk.state === 'air' && !grabbed && R.sk.air && R.ms - R.sk.air.t0 * 1000 > 60) { R.thumb(pull(40, 350, 90)); grabbed = true; }
    if (R.sk.state === 'air') {
      air++;
      /* each upper arm out to the SIDE: its angle from the trunk's down within the chest's side-to-side plane (an arm swung forward or back
         for balance is no T: measured in any direction it read as one) — out level is 90° */
      const abd = sideOut(G);
      const L = abd('L'), Rr = abd('R'), isT = L > 60 && Rr > 60 && Math.abs(L - Rr) < 20;
      tRun = isT ? tRun + 1 : 0; tFrames = Math.max(tFrames, tRun);
    } else if (air > 0) landed = true;
  }
  ok(air > 15 && tFrames / 60 <= T_ARMS_S, 'THE ARMS BALANCE in a' + (grab ? 'n ollie with a grab' : (name === 'Ollie' ? 'n ollie' : ' ' + name.toLowerCase())) + ': never a T for longer than ' + (tFrames / 60).toFixed(2) + ' s (≤ ' + T_ARMS_S + '; ' + air + ' frames in the air' + (landed ? ', landed' : ', NOT landed') + ')');
  ok(G.jointWorst.v <= JOINT_MAX && legsOk(G), 'NO POPS through ' + (grab ? 'an ollie with a grab' : name.toLowerCase()) + ': ' + G.jointWorst.v.toFixed(0) + '°/s (≤ ' + JOINT_MAX + '; ' + G.jointWorst.at + '), ' + legsSay(G));
  if (G.jointWorst.v > JOINT_MAX) console.log('  ↳ ' + G.chain.say(G.jointWorst.f));
}

/* 6. A GRIND IN AND OUT: the Main Ledge (states.mjs' own approach) */
{
  const G = figure({ at: [21, 0, 22.7], heading: 90, speed: 5.6 }), R = G.R;
  for (let f = 0; f < 3 * 60 && R.sk.p[0] < 25.4; f++) G.frame('to the ledge');   // the pop ~0.8 m on, before the Pad's end at x 26.5 (from 25.9 it came past it: rolling off is flight, and a pop in the air is refused)
  R.thumb(flick('Ollie', { load: 40 }));
  let ground = false, out = false, tRun = 0, tMax = 0;
  for (let f = 0; f < 3 * 60; f++) { G.frame('a grind'); if (R.sk.state === 'grind') ground = true; if (ground && R.sk.state !== 'grind') out = true;
    /* the arms on the ledge: never a T (both out level and alike) */
    if (R.sk.state === 'grind') { const abd = sideOut(G);
      const L = abd('L'), Rr = abd('R'); tRun = L > 60 && Rr > 60 && Math.abs(L - Rr) < 20 ? tRun + 1 : 0; tMax = Math.max(tMax, tRun); } }
  ok(ground && tMax / 60 <= T_ARMS_S, 'THE ARMS BALANCE on a grind: never a T for longer than ' + (tMax / 60).toFixed(2) + ' s (≤ ' + T_ARMS_S + ')');
  ok(ground && G.jointWorst.v <= JOINT_MAX && legsOk(G), 'NO POPS through a grind in and out: ' + G.jointWorst.v.toFixed(0) + '°/s (≤ ' + JOINT_MAX + '; ' + G.jointWorst.at + (ground ? '' : '; NO GRIND') + (out ? '' : '; never out') + '), ' + legsSay(G));
}
/* THE CHAIN'S OWN CALIBRATION over these drives: none of its readings may break on this build (tests/lib/chain.mjs) */
{ const K = Object.keys(CENSUS).sort((a, b) => CENSUS[b].v - CENSUS[a].v), broke = K.filter((k) => CENSUS[k].v > 1);
  if (process.env.CHAIN_CENSUS) for (const k of K) console.log('  · chain ' + k + ': ' + (CENSUS[k].val >= 100 ? CENSUS[k].val.toFixed(0) : CENSUS[k].val.toFixed(2)) + ' ' + CENSUS[k].unit + ' (' + (100 * CENSUS[k].v).toFixed(0) + '% of ' + CENSUS[k].bound + '; frame ' + CENSUS[k].f + ', ' + CENSUS[k].state + ')');
  console.log((broke.length ? 'ℹ' : '✔') + ' the chain over these drives — reported (its calibration is the two sweeps\', where THE CHAIN IS QUIET is a gate): ' + K.length + ' readings, ' + (broke.length ? broke.length + ' over their bounds — ' + broke.slice(0, 4).map((k) => k + ' ' + (100 * CENSUS[k].v).toFixed(0) + '% (frame ' + CENSUS[k].f + ', ' + CENSUS[k].state + ')').join(' · ') : 'the closest ' + K.slice(0, 3).map((k) => k + ' at ' + (100 * CENSUS[k].v).toFixed(0) + '%').join(' · '))); }
console.log('MOTION: ' + (fail ? 'RED · ' + fail : 'GREEN'));
process.exit(fail ? 1 : 0);
