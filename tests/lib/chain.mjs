/* THE CHAIN — WHERE A BUG STARTS (10-16, the owner: "make sure all parts are correctly implemented so we don't get bugs and wonder where it
 * starts"). Every frame, the pipeline stage by stage, each stage read for its OWN breaks — by the same readings the walls use for that
 * quantity — and the last few seconds kept. When a wall goes RED at frame N, blame(N) names the first stage, in the pipeline's order, that
 * broke in the frames leading to N: where the bug starts; every stage after it only followed.
 *
 *   sim     the simulation's own board: its position and its attitude, each a move taken and given back (> 1 cm, > 2°); in the air, the landing
 *           heading turning about its up accelerating (> 280 rad/s²: a step in the landing yaw assist's turn — the supervisor, 10-16)
 *   board   the drawn board on the sim's frame: its deck taken and given back (> 1 cm)
 *   pose    the pose's own targets before any follower: the hips where the pose puts them, in the rig's frame (> 100 m/s² on the ground: a
 *           crouch or a dip thrown in a frame; in the air, the airs' class); the head's look down the line (> 150 rad/s²: set straight)
 *   trunk   the body's attitude after the board's: its angular acceleration (> 50 rad/s² on the ground: the follower's cap is 43; the air is
 *           the airs' class)
 *   target  the hips' target in the world: taken and given back (> 1.5 cm; through an impulse > 4: a catch or a landing stops the board's fall)
 *   legs    the hips on their spring: their world acceleration by the classes (on the ground > 60 m/s², in the 0.2 s after a pop, a landing or
 *           a catch > 150; the air reported), out of the legs' reach
 *   ik      the feet on the deck (the ankles; the back foot's own stroke is the sweep's to read) taken and given back (> 4 cm, the
 *           feet-pinned wall's impulse bound), a leg past 0.98 of straight
 *   bones   any joint turning faster than 1,500°/s
 *   mesh    the drawn figure's far points (the nose, the hands, the toes) taken and given back (> 8 cm)
 * THE TARGET'S, THE ANKLES' AND THE FAR POINTS' BOUNDS ARE THE CHAIN'S OWN — no wall reads them — a CALIBRATION on V13, never a bar: about
 * 1.4 × the largest each reads over both sweeps (CHAIN_CENSUS=1: the hips' target 1.1 cm at a standing start's ollie; an ankle 2.9 as the
 * foot finishes its step home under a pop met mid-stroke; the nose 5.7 at a standing start's ollie, a hand 5.4 as the board turns onto the
 * East Wall's coping). Each wall's THE CHAIN IS QUIET holds them: a build whose ordinary motion passes one is read before it is moved.
 * A move taken and given back is read on the ground and on rails only — a window with a frame in the air is the airs' class (a landing's own
 * snap, like the deck-jump wall's), and so is the trunk in the air and through a pop's, a landing's or a catch's impulse. THE ROLL-IN IS READ
 * WHOLE, with no exclusion (10-16, the supervisor's call (A)): rolled over a coping, the board is on the ground and every reading reads it — the
 * hips in the impulse class from the drop onto the wall (tests/lib/legs.mjs IMPULSE); dropping in, the trunk is read through the air and its
 * landing (the trunk on its own capped spring, leaning into the drop: view/skater.js).
 * A wall can add its own readings, each under its stage (the deck following its contacts: sim; noted at its frame once known — C.note(f, x)).
 * ITS RESOLUTION IS ITS BOUNDS: a stage breaks only past its own reading's bound (the finest are the sim's: a move taken and given back by
 * 1 cm, a turn by 2°), so a defect under them is no stage's — it is caught by its own gate, and its plant is OUTSIDE the chain, saying so
 * (10-17: a rail's end losing 4.76 mm of one step — grind_end_clamped, caught by A RAIL'S END KEEPS THE STEP'S MOVE at 1 mm — broke no stage
 * in the 12 frames before it). "No stage broke" is the chain's honest answer there, never a fault of the recording.
 *   const C = chain(G, FT); after each G.frame(): C.frame(f, sk, evs, extra) · C.blame(N) → { stage, what, frame, after } · C.say(N) */
import * as THREE from '../../build/vendor/three/build/three.module.min.js';
import { HIPS, REACH, IMPULSE, bigLanding } from './legs.mjs';
import { airYaw, HEAD_STEP } from './airyaw.mjs';

export const STAGES = ['sim', 'board', 'pose', 'trunk', 'target', 'legs', 'ik', 'bones', 'mesh'];
/* every reading's largest value over a whole drive, by stage and what it reads — the chain's own calibration: on a clean build no reading may
   break (each bound sits above what the shipped figure does), or a blame would name a stage that only moved as it always does */
export const CENSUS = {};
/* every gated run's own census (never the run itself: its ring keeps 360 frames), so a broken reading names EVERY run over its bound — the
   census keeps the largest alone, and a run marked by it hid the next behind it (10-17: the Sun Bank on Cruise and Classic behind Raw's) */
export const CHAINED = [];
const V = THREE.Vector3, Q = THREE.Quaternion, D = 180 / Math.PI;
/* the landing yaw assist's turn, frame to frame: a CALIBRATION on V14 (CHAIN_CENSUS=1 over surfaces, motion and the sweep: 276 rad/s² at most,
   the East Wall coping slanted south at 8.5 m/s; 1.4 × that) — a heading SNAPPED in a frame reads ten times it */
/* the board's heading turning in the air, frame to frame, and its bound: tests/lib/airyaw.mjs, the one reading every sweep that rides airs reads */

/* a move taken and given back over the last four samples: the smaller of two consecutive opposite second differences (the deck-jump wall's
   reading) */
function dipole(h) { if (h.length < 4) return 0; const [p0, p1, p2, p3] = h.slice(-4), a = p2.clone().sub(p1.clone().multiplyScalar(2)).add(p0), b = p3.clone().sub(p2.clone().multiplyScalar(2)).add(p1); return a.dot(b) < 0 ? Math.min(a.length(), b.length()) : 0; }
const acc = (h, dt) => (h.length < 3 ? 0 : h[h.length - 1].clone().sub(h[h.length - 2].clone().multiplyScalar(2)).add(h[h.length - 3]).length() / (dt * dt));
/* an attitude taken and given back: the turn from one frame to the next, one way and then straight back */
function turnDipole(h) {
  if (h.length < 3) return 0; const [q0, q1, q2] = h.slice(-3), r = (a, b) => { const d = b.clone().multiply(a.clone().invert()); if (d.w < 0) { d.x = -d.x; d.y = -d.y; d.z = -d.z; d.w = -d.w; } const s = Math.sqrt(Math.max(1e-12, 1 - d.w * d.w)), ang = 2 * Math.acos(Math.min(1, d.w)); return new V(d.x / s, d.y / s, d.z / s).multiplyScalar(ang); };
  const w1 = r(q0, q1), w2 = r(q1, q2); return w1.dot(w2) < 0 ? Math.min(w1.length(), w2.length()) : 0;
}
function angAcc(h, dt) {
  if (h.length < 3) return 0; const [q0, q1, q2] = h.slice(-3), r = (a, b) => { const d = b.clone().multiply(a.clone().invert()); if (d.w < 0) { d.x = -d.x; d.y = -d.y; d.z = -d.z; d.w = -d.w; } const s = Math.sqrt(Math.max(1e-12, 1 - d.w * d.w)), ang = 2 * Math.acos(Math.min(1, d.w)); return new V(d.x / s, d.y / s, d.z / s).multiplyScalar(ang / dt); };
  return r(q1, q2).sub(r(q0, q1)).length() / dt;
}

/* opts.census: false for a run that is only REPORTED (surfaces.mjs `reported`): its readings stay its own (C.census), never the build's
   CENSUS — a reported run gating the build's chain by the back door (10-17: the Low Bar's own rail end did) */
export function chain(G, FT, keep = 360, opts = {}) {
  const F = G.F, bones = F.bones, B = F.B, ring = [], H = {}, push = (k, v, n = 4) => { (H[k] = H[k] || []).push(v); if (H[k].length > n) H[k].shift(); return H[k]; };
  /* each recorded frame: on the ground, and on a rail — a move's window on the ground throughout, or onto a rail (a catch's teleport is the
     rail's), is read, as the deck-jump wall reads it; a window with an air in it is the airs' class */
  const onGround = [], onRail = [];
  const ground = () => onGround.length >= 4 && (onGround.slice(-4).every(Boolean) || onRail.slice(-4).some(Boolean));
  const len = (n) => new V().fromArray(B[n].tail).distanceTo(new V().fromArray(B[n].head)), legLen = { L: len('thighL') + len('shinL'), R: len('thighR') + len('shinR') };
  const at = (n) => new V().setFromMatrixPosition(bones[n].matrixWorld);
  const tip = (n, k = 1) => bones[n].localToWorld(new V().fromArray(B[n].tail).sub(new V().fromArray(B[n].head)).multiplyScalar(k));
  let lastImpulse = -9, lastSnap = -9, t = 0, prevQ = {}, dropping = false, droppedAt = -9, lastBig = -9; const pending = {}, impH = [], YAW = airYaw(FT);
  const own = {};   // this run's own census (a run judged on its own: tests/lib/ride.mjs verdicts)
  if (opts.census !== false) CHAINED.push(own);
  const C = {
    ring, census: own,
    reset() { for (const k of Object.keys(H)) delete H[k]; prevQ = {}; onGround.length = 0; onRail.length = 0; impH.length = 0; YAW.reset(); },
    /* a wall's own reading, known only later (the roll-in's step against the turn's peak), set on the frame it belongs to */
    note(f, x) { const r = ring.find((q) => q.f === f); const k = x.stage + ' · ' + x.what; for (const T of (opts.census === false ? [own] : [CENSUS, own])) if (!T[k] || x.v > T[k].v) T[k] = { v: x.v, val: x.val, bound: x.bound, unit: x.unit, f, state: r ? r.state : '', run: C.name || '' }; if (x.v > 1) { if (r) r.R.push(x); else (pending[f] = pending[f] || []).push(x); } },   // a frame not yet recorded takes it when it is
    /* one frame's readings: each { stage, what, v (how far over its bound: > 1 is a break), at } */
    frame(f, sk, evs, extra = []) {
      t += FT; if (evs.some((e) => IMPULSE.test(e.type))) lastImpulse = t; if (bigLanding(evs)) lastBig = t;
      /* a drop-in's air and its landing are the trunk's to read (above); any other pop, landing or catch is its snap */
      const dropAir = sk.state === 'air' && !!(sk.air && sk.air.drop); if (dropAir) dropping = true;
      if (evs.some((e) => e.type === 'land') && dropping) droppedAt = t; if (sk.state !== 'air') dropping = false;
      if (evs.some((e) => /^(pop|land|grindStart)$/.test(e.type) && !(e.type === 'land' && droppedAt === t))) lastSnap = t;
      const R = [], add = (stage, what, v, bound, unit) => R.push({ stage, what, v: v / bound, val: v, bound, unit });
      const air = sk.state === 'air', impulse = t - lastImpulse <= 0.2 + 1e-9, st = F.state; onGround.push(!air); onRail.push(sk.state === 'grind'); if (onGround.length > 4) { onGround.shift(); onRail.shift(); } const flat = ground();
      /* a move taken and given back is set on the frame the move was — the third of its four samples: a point put out of its path at one
         frame is seen first with the frame after it, the second of the four being the frame BEFORE the move (10-16: so set, a board stood
         on the mean of its wheels' normals was blamed on the drawn deck a frame before the sim's own turn stepped) — once it is seen */
      const later = [], addAt = (back, stage, what, v, bound, unit) => later.push([back, { stage, what, v: v / bound, val: v, bound, unit }]);
      impH.push(impulse); if (impH.length > 4) impH.shift(); const impulseAt = (back) => impH.length > back && impH[impH.length - 1 - back];
      /* sim */
      const p = new V(...sk.p), up = new V(...sk.up), fwd = new V(...sk.fwd), qS = new Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V().crossVectors(up, fwd).normalize(), up, new V().crossVectors(new V().crossVectors(up, fwd).normalize(), up)));
      { const a1 = dipole(push('simP', p)) * 100, a2 = turnDipole(push('simQ', qS, 3)) * D; if (flat) { addAt(1, 'sim', 'its position taken and given back', a1, 1, 'cm'); addAt(1, 'sim', 'its attitude taken and given back', a2, 2, '°'); } }
      /* the board's heading turning in the air — its yaw about its own up, frame to frame, read on the board itself (the landing yaw assist's
         turn and the rider's spin; a turn the contact makes is about the board's own plane): its angular acceleration — a step there is a break
         (the supervisor, 10-16). Read on the board, not on the assist's spring: a snap is over within a frame's first step, and at the frame's
         end the spring's rate was back to nothing. A new air begins its own reading */
      { const r = YAW.frame(sk); if (r && !r.contact) add('sim', 'its heading turning in the air', r.acc, HEAD_STEP, 'rad/s²'); }   // (tests/lib/airyaw.mjs: the assist's frames; a contact's turn is the airs' class)
      /* board */
      { const a = dipole(push('deck', new V().setFromMatrixPosition(G.board.matrixWorld))) * 100; if (flat) addAt(1, 'board', 'the drawn deck taken and given back', a, 1, 'cm'); }
      /* pose: the hips where the pose puts them, in the rig's frame */
      { const a = st.poseHips ? acc(push('pose', st.poseHips.clone(), 3), FT) : 0; if (st.poseHips && !air) add('pose', 'the pose\'s own hips (before any follower)', a, 100, 'm/s²'); }   // in the air, the airs' class
      if (st.lookNow != null) add('pose', 'the head\'s look turning', acc(push('look', new V(st.lookNow, 0, 0), 3), FT), 150, 'rad/s²');
      /* trunk: the body's attitude in the world (the board's, turned by the lag) */
      if (st.att) { const yl = st.att.y.length(), Rw = yl > 1e-9 ? new Q().setFromAxisAngle(st.att.y.clone().divideScalar(yl), yl) : new Q(), qB = G.board.getWorldQuaternion(new Q()), body = Rw.clone().multiply(qB);
        const a2 = angAcc(push('body', body, 3), FT); if ((!air || dropAir) && t - lastSnap > 0.2 + 1e-9) add('trunk', 'the body\'s turn accelerating', a2, 50, 'rad/s²'); }
      /* target and legs */
      if (st.legs) {
        { const a = dipole(push('T', st.legs.T.clone())) * 100; if (flat) addAt(1, 'target', 'the hips\' target taken and given back' + (impulseAt(1) ? ' through an impulse' : ''), a, impulseAt(1) ? 4 : 1.5, 'cm'); }
        const hp = at('hips'), a = acc(push('hips', hp, 3), FT), big = t - lastBig <= 0.2 + 1e-9;   // (a big landing's: the big landings' class, reported — tests/lib/legs.mjs BIG)
        if (!air) add('legs', big ? 'the hips through a big landing (reported)' : impulse ? 'the hips through an impulse' : 'the hips on the ground', a, big ? Infinity : impulse ? HIPS.impulse : HIPS.ground, 'm/s²');
        const by = new V().setFromMatrixColumn(G.board.matrixWorld, 1).normalize(), u = st.legs.u, upg = u.dot(by);
        add('legs', 'the hips out of the legs\' reach', Math.max(-upg / REACH.sink, upg / REACH.rise), 1.0001, '× the reach');
      }
      /* ik */
      const stroking = !!sk.stroke;   // the back foot's own stroke (its plant, lift, swing): the sweep's foot gates read it, not the chain
      for (const sd of ['L', 'R']) {
        const ank = at('foot' + sd), a = dipole(push('ank' + sd, ank)) * 100; if (flat && !(sd === 'R' && stroking)) addAt(1, 'ik', 'the ' + (sd === 'L' ? 'front' : 'back') + ' ankle taken and given back', a, 4, 'cm');
        if (!air) add('ik', 'the ' + (sd === 'L' ? 'front' : 'back') + ' leg near straight', at('thigh' + sd).distanceTo(ank) / legLen[sd], REACH.straight, '× its length');
      }
      /* bones */
      let jw = 0, jn = ''; for (const n of F.names) { const q = bones[n].quaternion; if (prevQ[n]) { const a = 2 * Math.acos(Math.min(1, Math.abs(prevQ[n].dot(q)))) * D / FT; if (a > jw) { jw = a; jn = n; } } prevQ[n] = q.clone(); }
      add('bones', 'the fastest joint (' + jn + ')', jw, 1500, '°/s');
      /* mesh: the figure's far points */
      for (const [k, n, s] of [['the nose', 'head', 0.95], ['the front hand', 'handL', 1], ['the back hand', 'handR', 1], ['the front toe', 'footL', 1], ['the back toe', 'footR', 1]]) { const a = dipole(push('m' + k, tip(n, s))) * 100; if (flat && !(n === 'footR' && stroking)) addAt(1, 'mesh', k + ' taken and given back', a, 8, 'cm'); }   // pushed in the air too: a window across an air is no window
      for (const e of extra) R.push(e);
      for (const x of R) { const k = x.stage + ' · ' + x.what.replace(/ \(([a-zA-Z]+)\)$/, ''); for (const T of (opts.census === false ? [own] : [CENSUS, own])) if (!T[k] || x.v > T[k].v) T[k] = { v: x.v, val: x.val, bound: x.bound, unit: x.unit, f, state: sk.state, run: C.name || '' }; }
      ring.push({ f, t, state: sk.state, R: R.filter((x) => x.v > 1).concat(pending[f] || []) }); delete pending[f]; if (ring.length > keep) ring.shift();   // only what broke is kept
      for (const [back, x] of later) C.note(f - back, x);
    },
    /* where it starts: in the frames up to N (back `back` frames), the earliest frame with any break, and at it the first stage in the
       pipeline's order that broke; with what broke after it */
    blame(N, back = 12) {
      const win = ring.filter((r) => r.f <= N && r.f >= N - back);
      for (const r of win) {
        const br = r.R.slice(); if (!br.length) continue;
        br.sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || b.v - a.v);
        const first = br[0], after = [...new Set(win.filter((q) => q.f >= r.f).flatMap((q) => q.R.map((x) => x.stage)))].filter((s) => s !== first.stage).sort((a, b) => STAGES.indexOf(a) - STAGES.indexOf(b));
        return { stage: first.stage, what: first.what, val: first.val, bound: first.bound, unit: first.unit, frame: r.f, after };
      }
      return null;
    },
    /* the same, for a wall that names its worst by its time (" at 1.23 s"): the frame recorded nearest it */
    sayAt(T, back) { let best = null; for (const r of ring) if (!best || Math.abs(r.t - T) < Math.abs(best.t - T)) best = r; return best && Math.abs(best.t - T) <= FT ? C.say(best.f, back) : 'where it starts: no frame recorded within a frame of ' + (+T).toFixed(3) + ' s (the nearest ' + (best ? best.t.toFixed(3) + ' s' : 'none') + ')'; },
    say(N, back) { const b = C.blame(N, back); return b ? 'where it starts: ' + b.stage + ' — ' + b.what + ', ' + (b.val >= 100 ? b.val.toFixed(0) : b.val.toFixed(2)) + ' ' + b.unit + ' (over ' + b.bound + ') at frame ' + b.frame + (b.after.length ? '; after it only ' + b.after.join(', ') : '; nothing after it') : 'where it starts: no stage broke in the ' + (back || 12) + ' frames before it'; },
  };
  return C;
}
