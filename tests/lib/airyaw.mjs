/* THE LANDING YAW NEVER STEPS (one reading, one bound: the chain's sim stage, tests/lib/chain.mjs, and every sweep that rides airs —
 * coping_capture, camera_moving, slide): the board's heading turning about its own up, frame to frame at FT, in the air — read on the board
 * itself (the landing yaw assist's turn and the rider's spin; a turn the contact makes is about the board's own plane) — and its angular
 * acceleration. A step there is a break: HEAD_STEP, a CALIBRATION on V14 (CHAIN_CENSUS=1 over surfaces, motion and the sweep: 198 rad/s² at
 * most, the landing yaw assist on the East Wall coping slanted south at 8.5 m/s; 1.4 × that). A new air begins its own reading.
 * 10-17 (the supervisor: "the yaw gate reading only lip airs is the same instrument gap as AN AIR ENDS was, so close it as a class"): a
 * roll-off air off the Basin's rim reversed its heading at 378 rad/s² (the spin window's edge, all or nothing) and no sweep that rode it read it.
 * A CONTACT'S TURN IS NO ASSIST'S (10-17, the supervisor: "the gate reads the assist's turn on the frames where no contact turned the board.
 * Those frames are named by the SIM'S OWN CONTACT SIGNAL ... never by the size of the turn"): a frame whose acceleration spans a step in
 * which a contact turned the board in the air (body.js airTouch: the deck tipped on an edge, a wheel's pivot, a stop's turn back, the
 * push-out's turn) is a contact frame — said apart, REPORTED, as a landing's impulse is: the Spine's ridge clipped by a wheel pivoted the
 * board 5° a step and read 374 rad/s².
 * THROUGH THE CATCH (10-17, the supervisor's (b): "the ground turn is the assist at the rider's pace ... continuing C2 from the air's last rate
 * and acceleration ... The gate's frames run through it"): a landing inside the spin window hands what the air's turn left to the roll's first
 * steps (body.js stepGround: the catch, sk.catchTurn) — the reading runs on through it, the landing's own step a contact (its seat: airTouch),
 * what the touchdown SET read off the land event by the sweeps (its `set`).
 *   const Y = airYaw(FT); after each frame: const r = Y.frame(sk) → { acc (rad/s²), contact, ground } this frame, or null (on the ground and
 *   no catch running, or an air's first two frames) */
import * as THREE from '../../build/vendor/three/build/three.module.min.js';
import { boardTouch } from './inside.mjs';
const V = THREE.Vector3;
export const HEAD_STEP = 280;
export function airYaw(FT) {
  let fPrev = null, wPrev = null, t0 = null, c1 = null, c2 = null;
  const Y = {
    reset() { fPrev = wPrev = null; t0 = null; c1 = c2 = null; },
    frame(sk) {
      const inAir = sk.state === 'air' && sk.air, inCatch = sk.state === 'roll' && sk.catchTurn;
      if (!inAir && !inCatch) { Y.reset(); return null; }
      if (inAir && t0 !== sk.air.t0) { Y.reset(); t0 = sk.air.t0; }
      const up = new V(...sk.up), fwd = new V(...sk.fwd), c = sk.airTouch || 0; let out = null;
      if (fPrev) { const a = fPrev.clone().projectOnPlane(up).normalize(), b = fwd.clone().projectOnPlane(up).normalize(), w = Math.atan2(new V().crossVectors(a, b).dot(up), a.dot(b)) / FT;
        if (wPrev != null) out = { acc: Math.abs(w - wPrev) / FT, contact: c2 != null && c !== c2, ground: !inAir }; wPrev = w; }
      fPrev = fwd; c2 = c1; c1 = c; return out;
    },
  };
  return Y;
}
/* over a sweep's airs: the worst and where (a sweep keeps one per assist) */
export function yawWorst() { return { v: 0, at: '', n: 0, over: [] }; }

/* THE GATE'S OWN READER, for every sweep that rides airs (coping_capture, slide, camera_moving): THE LANDING YAW NEVER STEPS — on the assist's
 * frames (no contact said) in the air and through the catch on the ground, at most HEAD_STEP; and through the touchdown's OWN step: what it
 * SET the heading by, read off the land event (body.js land: `set`) at the air's bound — a set of θ in one step reads θ/FT² by second
 * difference, so at most HEAD_STEP·FT², 4.46° (10-17, the supervisor: "'never steps' covers the landing's own step"). The frames a contact
 * turned the board are counted and REPORTED apart (a partition that excluded every frame would be the cheapest lie: its line says how many).
 * The catch's turns REPORTED: the largest — the yaw the board touched down with, the time it took, where. AND THE SIGNAL IS CHECKED (the
 * supervisor: "every frame that says airTouch has a contact made that step, read independently of the signal"): a step that says a contact
 * must have the board's wheels, trucks or deck within contact distance of a face at its start, its middle or its end (tests/lib/inside.mjs
 * boardTouch: a push-out that opens an air step is made at its start, a stop's set-back at its end, a pivot met on the way between) — a
 * contact said where none was made would hide a snap behind the partition, and fails the gate.
 *   const G = yawGate(FT, world); per ride G.ride(); after each sim step G.step(sk, where); after each frame G.frame(sk, where); G.ok() · G.say() */
export const SET_DEG = (HEAD_STEP / 3600) * 180 / Math.PI;   // at 60 Hz: 4.46°
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
export function yawGate(FT = 1 / 60, world = null) {
  const W = { assist: { v: 0, at: '' }, contact: { v: 0, at: '' }, frames: 0, excluded: 0, set: { v: 0, at: '' }, sets: 0, landings: 0, catch: { v: 0, dur: 0, at: '' }, catches: 0, sizes: [0, 0, 0], said: 0, unfounded: 0, worst: { v: 0, at: '' } };
  let Y = airYaw(FT), open = null, cPrev = null, pose = null;
  const G = {
    W,
    ride() { Y = airYaw(FT); open = null; cPrev = null; pose = null; },
    step(sk, where) {
      const c = sk.airTouch || 0;
      if (world && cPrev != null && c !== cPrev) { W.said++; const mid = pose && { p: pose.p.map((x, k) => (x + sk.p[k]) / 2), up: norm(pose.up.map((x, k) => x + sk.up[k])), fwd: norm(pose.fwd.map((x, k) => x + sk.fwd[k])) };
        const b = [sk, pose, mid].filter(Boolean).map((q) => boardTouch(world, q)).reduce((x, y) => (y.near < x.near ? y : x));
        if (b.near > 0) { W.unfounded++; if (b.near > W.worst.v || !W.worst.at) W.worst = { v: b.near, at: where() + (Number.isFinite(b.near) ? ', its nearest ' + b.what : ', no face within reach of it') }; } }
      cPrev = c; pose = { p: sk.p.slice(), up: sk.up.slice(), fwd: sk.fwd.slice() };
      for (const e of sk.events) if (e.type === 'land') { W.landings++; const s = e.set || 0; if (s > SET_DEG) W.sets++; if (s > W.set.v) W.set = { v: s, at: where() }; }
      if (sk.catchTurn && !open) open = { t0: sk.catchTurn.t0, deg: sk.catchTurn.from || 0, at: where() };
      else if (!sk.catchTurn && open) { W.catches++; W.sizes[open.deg <= 5 ? 0 : open.deg <= 15 ? 1 : 2]++; if (open.deg > W.catch.v) W.catch = { v: open.deg, dur: sk.t - open.t0, at: open.at }; open = null; }
    },
    frame(sk, where) {
      const r = Y.frame(sk); if (!r) return; W.frames++;
      if (r.contact) { W.excluded++; if (r.acc > W.contact.v) W.contact = { v: r.acc, at: where() }; } else if (r.acc > W.assist.v) W.assist = { v: r.acc, at: where() };
    },
    ok() { return W.assist.v <= HEAD_STEP && W.set.v <= SET_DEG && W.unfounded === 0; },
    say(label) {
      return ['THE LANDING YAW NEVER STEPS, ON EVERY AIR' + (label ? ' (' + label + ')' : '') + ': the assist\'s turn of the heading, in the air and through the catch on the ground, at most ' + HEAD_STEP + ' rad/s² on every frame no contact turned the board — the most ' + W.assist.v.toFixed(0) + (W.assist.at ? ' (' + W.assist.at + ')' : '') + ' · the touchdown\'s own step sets at most ' + SET_DEG.toFixed(2) + '° — the most ' + W.set.v.toFixed(2) + '°' + (W.set.at && W.set.v > 0 ? ' (' + W.set.at + ')' : '') + ' over ' + W.landings + ' landings' + (W.sets ? ', ' + W.sets + ' over' : '') + ' · ' + W.frames + ' frames read, ' + W.excluded + ' of them a contact\'s (the sim\'s own signal' + (world ? ': ' + W.said + ' steps said one, ' + W.unfounded + ' with none made' + (W.unfounded ? ' — the most ' + (Number.isFinite(W.worst.v) ? (100 * W.worst.v).toFixed(1) + ' cm' : 'out of reach') + ' past contact (' + W.worst.at + ')' : '') : ', unchecked') + ')',
        'ℹ A CONTACT\'S TURN IN THE AIR — reported' + (label ? ' (' + label + ')' : '') + ': ' + W.excluded + ' frames, the most ' + W.contact.v.toFixed(0) + ' rad/s²' + (W.contact.at ? ' (' + W.contact.at + ')' : ''),
        'ℹ THE CATCH ON THE GROUND — reported' + (label ? ' (' + label + ')' : '') + ': ' + W.catches + ' catches turned (the spin window\'s, at a rider\'s pace) — ' + W.sizes[0] + ' of 5° or less, ' + W.sizes[1] + ' of 5–15°, ' + W.sizes[2] + ' over 15° — the largest ' + W.catch.v.toFixed(1) + '° over ' + (1000 * W.catch.dur).toFixed(0) + ' ms' + (W.catch.at ? ' (' + W.catch.at + ')' : '')];
    },
  };
  return G;
}
