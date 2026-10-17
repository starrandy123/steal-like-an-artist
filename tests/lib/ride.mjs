/* ONE RIDE ON THE REAL RIG, READ FRAME BY FRAME (the surfaces wall's reader — tests/surfaces.mjs — and the per-lip roll-in measure's,
 * tests/vstar.mjs: one reader, so a lip is judged by the very gates the wall holds). ride(park, name, start, drive, frames) → W, every reading
 * of the run with its worst frame; own(W) → the run's own verdicts against the bounds (the gates a run answers alone). */
import { drops } from './drops.mjs';
import * as THREE from '../../build/vendor/three/build/three.module.min.js';
import { figure, PHYSICS, V, D } from './figure.mjs';
import { BOARD } from '../../build/js/config.js';
import { deckOver } from '../../build/js/formulas/edge.js';
import { legsReader, pinRms, HIPS, REACH, FEET } from './legs.mjs';
import { chain } from './chain.mjs';
import * as H from './heading.mjs';
import { gapReader, GAP } from './gap.mjs';

export const FT = 2 * PHYSICS.step;
export const BOUND = { jump: 0.01, deckOver: 120, joint: 1500, yaw: 2.0, railEnd: 0.001 };   // m taken and given back · °/s over the contacts' own turn · °/s · rad/s of heading past the steering's and the forces'
export const ROLL = { deck: 0.9, own: 0.05, sink: 0.002, trunk: 50, air: 0.01 };   // over a coping: the deck against the board's speed · m/s a frame past the forces · m into the board · rad/s² · m off its free path
const wb = PHYSICS.wheelbase, track = PHYSICS.track;

/* the plane through the four wheels' contacts with the park, under the board as it stands: its normal (null if a wheel finds nothing) */
/* the plane through the drawn board's four wheels' contacts, AT THE SAME DRAWN INSTANT, each found as the board stands on it: down the board's
   own up from above each wheel (the sim's own probe: probeUp above, to probeDown below). Read straight down instead, at a seam the plane
   was a different plane — the hits beside a crease are other points — and the deck read a step behind it */
export function contactPlane(park, board) {
  const pts = [], down = new V(0, -1, 0).transformDirection(board.matrixWorld).normalize();
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const w = board.localToWorld(new V(sx * track / 2, -PHYSICS.deckTop + PHYSICS.probeUp, sz * wb / 2)), h = park.bvh.raycast([w.x, w.y, w.z], [down.x, down.y, down.z], PHYSICS.probeUp + PHYSICS.probeDown);
    if (!h || h.normal[1] < 0.2 || h.t > PHYSICS.probeUp + PHYSICS.touch) return null; pts.push(new V(...h.point));
  }
  const d1 = pts[0].clone().sub(pts[3]), d2 = pts[1].clone().sub(pts[2]), n = d1.cross(d2).normalize(); if (n.y < 0) n.negate();
  return n;
}


export function ride(park, name, o, drive, frames) {
  const G = figure(Object.assign({ world: park, preset: 'cruise' }, o)), R = G.R, sk = R.sk;
  /* (the sim's own steps, as they are taken: a drop-in's air step against its free path — item 2's touchdown reading: the step's own free end,
     the sim's, after its own motion and the assist's turn of its path and before any contact — body.js stepAir `_free` — and where the step
     left it: the contact's own move off that path, the step's from its start to its free end the segment it is read against) */
  let curF = 0;   // the frame being drawn (the loop below): what a gate hands the chain
  { const step = sk.step.bind(sk); sk.step = (dt, input) => { const air = sk.state === 'air' && sk.air && sk.air.drop, p0 = sk.p.slice(), hb = H.before(sk), nE = sk.events.length, v0 = Math.hypot(...sk.v), wasGrind = sk.state === 'grind'; sk._free = null; step(dt, input);
    /* A RAIL'S END KEEPS THE STEP'S MOVE: the step a grind ends at its rail's end, the board moves its own speed's worth (placed past the end
       on the rail's line, then let go) — clamped to the end first, it lost the rest of the step and made it up in the air: a jump as it left */
    /* (the sim clears its events at each step's start: the step's own, whole) */
    if (wasGrind && sk.events.some((e) => e.type === 'grindEnd' && e.why === 'end')) { const lost = v0 * dt - Math.hypot(sk.p[0] - p0[0], sk.p[1] - p0[1], sk.p[2] - p0[2]);
      if (lost > W.railEnd.v) Object.assign(W.railEnd, { v: lost, f: curF, at: 'frame ' + curF + ' (' + sk.t.toFixed(3) + ' s, ' + v0.toFixed(2) + ' m/s)' }); W.railEnd.n++; }
    /* WHAT A CAPPED SLIDE LEFT (body.js noteDropped — the roll's three bumps, the walls' one slide, the air's three, a deck held on an edge): the
       most move a step's slides could not make, and where — REPORTED by every sweep, so a cap is never a silent discard (the supervisor, 10-17) */
    W.drops.step(sk, () => (W.name || '') + ', frame ' + curF + ' (' + sk.t.toFixed(3) + ' s, ' + sk.state + ')');   // by its kind (tests/lib/drops.mjs)
    /* THE BOARD'S HEADING NEVER STEPS ON THE GROUND (tests/lib/heading.mjs) — the excess and where */
    { const h = H.after(hb, sk, dt); if (h) { const evs = sk.events.map((e) => e.type).join(' ');
      if (h.ex > W.yaw.ex) Object.assign(W.yaw, { ex: h.ex, rate: h.yaw, allowed: h.allowed, at: sk.t.toFixed(3) + ' s (' + hb.state + ', ' + hb.speed.toFixed(2) + ' m/s' + (evs ? ', ' + evs : '') + ')' });
      if (h.yaw > W.yaw.max) W.yaw.max = h.yaw; } }
    if (air && sk._free) { const q1 = sk._free, ab = q1.map((x, k) => x - p0[k]), L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      const u = L2 > 1e-12 ? Math.max(0, Math.min(1, ((sk.p[0] - p0[0]) * ab[0] + (sk.p[1] - p0[1]) * ab[1] + (sk.p[2] - p0[2]) * ab[2]) / L2)) : 0, off = Math.hypot(sk.p[0] - p0[0] - ab[0] * u, sk.p[1] - p0[1] - ab[1] * u, sk.p[2] - p0[2] - ab[2] * u);
      if (off > W.roll.air.v) W.roll.air = { v: off, at: sk.t.toFixed(3) + ' s (' + sk.state + ')' }; } }; }
  const W = { name, lands: [], yaw: { ex: -Infinity, rate: 0, allowed: 0, max: 0, at: '' }, rest: { t0: null, h0: 0, dh: 0, tilt: 0, speed: null }, jump: 0, jumpAt: '', jumpAir: 0, jumpAirAt: '', deckOver: 0, deckAt: '', joint: 0, jointAt: '', head: 0, states: new Set(), events: new Set(),
    roll: { rolled: null, dropped: null, rolloff: false, bail: null, deck: { v: Infinity, at: '' }, own: { v: 0, at: '' }, sink: { v: 0, at: '', what: '' }, underTop: { v: 0, at: '' }, trunk: { v: 0, at: '' }, air: { v: 0, at: '' }, open: false, until: -1, body: [] }, lips: { n: 0, out: [], open: false }, fourth: { v: 0, at: '', n: 0 } };
  const LR = legsReader({ board: G.board, F: G.F, ball: G.ball, stretch: G.stretch }, FT); W.legs = LR.W;
  const CH = chain(G, FT, frames + 4, { census: !o.reported }); CH.name = name; W.chain = CH;   // where a RED here starts (tests/lib/chain.mjs); a REPORTED run's readings stay its own
  const GR = gapReader(); W.gap = GR;   // the body at the legs' limit (tests/lib/gap.mjs)
  W.lock = { under: 0, over: 0, at: '' }; W.railEnd = { v: 0, at: '', n: 0 }; W.drops = drops();   // on a grind, the board against its lock: the rail's line where it is, plus the 5 mm it rides over it (F3's reading)
  let prev = null, prevN = null;
  const path = [];   // the drawn deck, frame by frame: [position, the frame's label, on the ground]
  for (let f = 0; f < frames; f++) {
    curF = f; drive(G, f);
    const nEv = R.log.length, fr = G.frame(), t = (f + 1) * FT, evs = R.log.slice(nEv);
    /* THE FOURTH WHEEL (the supervisor's D): each sim step where the wheels on the ground go from three to four or back — the board's turn in
       that step against its turn the step before (a wheel come into its 5 cm window swings the plane from three points to four at once) */
    for (const k of fr.steps) {
      const rate = Math.acos(Math.min(1, k.up0[0] * k.up[0] + k.up0[1] * k.up[1] + k.up0[2] * k.up[2])) * D / PHYSICS.step;
      if (k.n0 != null && k.n != null && ((k.n0 === 3 && k.n === 4) || (k.n0 === 4 && k.n === 3)) && W._rate != null && (k.state === 'roll' || k.state === 'manual')) {
        const jump = Math.abs(rate - W._rate); if (jump > W.fourth.v) Object.assign(W.fourth, { v: jump, at: f + ' (' + t.toFixed(2) + ' s, ' + k.n0 + ' → ' + k.n + ' wheels, the turn ' + W._rate.toFixed(0) + ' → ' + rate.toFixed(0) + '°/s)' });
        W.fourth.n++;
      }
      W._rate = rate;
    }
    for (const e of evs) { W.events.add(e.type); if (e.type === 'land') W.lands.push({ q: e.quality, surf: e.surf, impact: +e.impact, t }); }
    /* AGAINST A WALL IT ROLLED INTO: from its first scrape rolling, 0.3 s — its heading's turn from then, its tilt, its speed at the end */
    { const Rt = W.rest, hz = Math.atan2(sk.fwd[0], sk.fwd[2]);
      if (Rt.t0 == null && (sk.state === 'roll' || sk.state === 'manual') && evs.some((e) => e.type === 'scrape')) { Rt.t0 = t; Rt.h0 = hz; }
      else if (Rt.t0 != null && Rt.speed == null) { Rt.dh = Math.max(Rt.dh, Math.abs(Math.atan2(Math.sin(hz - Rt.h0), Math.cos(hz - Rt.h0)))); Rt.tilt = Math.max(Rt.tilt, Math.acos(Math.min(1, sk.up[1])));
        if (t - Rt.t0 >= 0.3) Rt.speed = Math.hypot(...sk.v); } }
    /* THE ROLL-IN (the supervisor's call (A), 10-16): which way it went over the coping — ROLLED ('rollIn' … 'rolledIn', nothing in the air from
       the one to a quarter second past the other) or DROPPED IN (a 'dropin' takeoff and its landing: where, and how) — and its speed at the
       coping; the window the rider's turn is read over: from the first frame the rider leans into the drop to 0.4 s past the crossing or the
       landing */
    const RI = W.roll;
    for (const e of evs) {
      if (e.type === 'rollIn' && !RI.rolled) RI.rolled = { speed: e.speed, rail: e.rail, t0: t, t1: null, flown: false };
      if (e.type === 'rolledIn' && RI.rolled && RI.rolled.t1 == null) { RI.rolled.t1 = t; RI.until = t + 0.4; }
      if (e.type === 'takeoff' && e.why === 'dropin' && !RI.dropped) RI.dropped = { speed: e.speed, rail: e.rail, t0: t, land: null };
      if (e.type === 'land' && RI.dropped && !RI.dropped.land) { RI.dropped.land = { q: e.quality, surf: e.surf, upY: sk.up[1], impact: e.impact, t }; RI.until = t + 0.4; }
      if (e.type === 'takeoff' && e.why === 'rolloff') RI.rolloff = true;
      if (e.type === 'bail' && (RI.rolled || RI.dropped || RI.open) && !RI.bail) RI.bail = e.why + ' ' + (+e.impact).toFixed(1) + ' m/s';
    }
    if (RI.rolled && (RI.rolled.t1 == null || t - RI.rolled.t1 <= 0.25) && evs.some((e) => /^(takeoff|land|bail|pop)$/.test(e.type))) RI.rolled.flown = true;
    if (sk.ahead && sk.ahead.ang > 1e-3) RI.open = true;
    const inWindow = RI.open && (RI.until < 0 || t <= RI.until);
    /* a lip air: where it comes down — a ramp, or a rail it catches; the deck behind the lip is an air drifted out */
    if (evs.some((e) => e.type === 'takeoff' && e.why === 'lip')) { W.lips.n++; W.lips.open = true; }
    if (W.lips.open) { const l = evs.find((e) => e.type === 'land'); if (l) { W.lips.open = false; if (l.surf !== 'ramp') { W.lips.out.push(l.surf + ' at frame ' + f); if (W.lips.firstOut == null) W.lips.firstOut = f; } } else if (evs.some((e) => e.type === 'grindStart' || e.type === 'bail')) W.lips.open = false; }
    W.states.add(sk.state);
    /* (a) THE DECK KEEPS ITS SPEED over a coping, rolled over it or dropping in over it on the deck: the drawn deck's speed against the board's
       own (the sim's: its wheels' — the pivot had held the deck's middle at a fifth of it on the coping, 6.81 → 1.71 → 6.91 m/s), and the
       board's own speed changing frame to frame by no more than gravity along its plane, its rolling friction and the pump give (the rest of
       the deck's speed is the pitch's: its deck 9 cm over its wheels, swung by the board's turn). Its air: on its free path (above) */
    { const dp = new V().setFromMatrixPosition(G.board.matrixWorld), sp = W._dp ? dp.distanceTo(W._dp) / FT : null, own = Math.hypot(...sk.v); W._dp = dp;
      const crossing = (RI.rolled && (RI.rolled.t1 == null || t - RI.rolled.t1 <= 2 * FT)) || !!sk.dropping;
      if (crossing && sp != null && W._own != null && W._crossing) {
        const ratio = sp / Math.max(0.3, Math.min(own, W._own)); if (ratio < RI.deck.v) RI.deck = { v: ratio, at: f + ' (' + sp.toFixed(2) + ' against ' + own.toFixed(2) + ' m/s)' };
        const slope = Math.sqrt(Math.max(0, 1 - sk.up[1] * sk.up[1])), room = (PHYSICS.gGround * slope + 0.02 * PHYSICS.gGround + PHYSICS.pump.gain / 0.5) * FT, dv = Math.abs(own - W._own) - room;   // g·sin θ, rolling friction, the pump
        if (dv > RI.own.v) RI.own = { v: dv, at: f + ' (' + W._own.toFixed(2) + ' → ' + own.toFixed(2) + ' m/s)' }; }
      W._own = own; W._crossing = crossing; }
    /* THE BOARD NEVER IN THE COPING'S LIP (the solid the wheels ride, its `corner` under the coping's line — sim/park.js): over the coping it
       rolls or drops in over, the deck and the trucks (body.js undersides) against the lip — ≤ 2 mm in. Against the coping's DRAWN top, 2 cm
       over the lip, the deck, the trucks and the wheels (round, at their bottoms): REPORTED (the coping not yet solid to the board) */
    { const id = RI.rolled && RI.rolled.t1 == null ? RI.rolled.rail : sk.dropping ? sk.dropping.rail.id : sk.state === 'air' && sk.air && sk.air.drop ? sk.air.drop.rail : null, rail = id ? park.railById.get(id) : null;
      if (rail) { const U = sk.undersides(sk.p, sk.up, sk.fwd), WR = BOARD.wheel / 2, dy = rail.corner || 0, names = ['the deck', 'the front truck', 'the back truck'];
        const lineAt = (i, top) => { const A = rail.pts[i], B = rail.pts[i + 1]; return top ? [A, B] : [[A[0], A[1] + dy, A[2]], [B[0], B[1] + dy, B[2]]]; };
        U.forEach((R, k) => { for (let i = 0; i + 1 < rail.pts.length; i++) for (const top of [false, true]) { const [A, B] = lineAt(i, top), q = deckOver(R, A, B); if (!q) continue;
          if (top) { if (q.depth > RI.underTop.v) RI.underTop = { v: q.depth, at: f + ' (' + t.toFixed(2) + ' s, ' + sk.state + ', ' + names[k] + ')' }; }
          else if (q.depth > RI.sink.v) RI.sink = { v: q.depth, at: f + ' (' + t.toFixed(2) + ' s, ' + sk.state + ')', what: names[k] }; } });
        /* the wheels against the drawn top: each pair a strip along the board as long as a wheel, at its bottom, its own curve read */
        const w = new V(...sk.fwd).cross(new V(...sk.up)).normalize().toArray();
        for (const s0 of [wb / 2, -wb / 2]) { const R = { c: sk.p.map((x, j) => x + sk.fwd[j] * s0), u: sk.fwd, w, n: sk.up, hu: 0.95 * WR, hw: track / 2 + BOARD.wheelWidth / 2 };
          for (let i = 0; i + 1 < rail.pts.length; i++) { const [A, B] = lineAt(i, true), q = deckOver(R, A, B); if (!q) continue; const d = q.depth - (WR - Math.sqrt(Math.max(0, WR * WR - q.s * q.s)));
            if (d > RI.underTop.v) RI.underTop = { v: d, at: f + ' (' + t.toFixed(2) + ' s, ' + sk.state + ', the ' + (s0 > 0 ? 'front' : 'back') + ' wheels)' }; } } } }
    /* (b) NO STEP ON THE RIDER: the body's attitude in the world (the board's turned by the trunk's lag: view/skater.js), its angular
       acceleration over three frames, from the lean's start to 0.4 s past the crossing or the landing — rolled and dropped alike */
    { const st = G.F.state;
      if (inWindow && st.att) { const yl = st.att.y.length(), Rw = yl > 1e-9 ? new THREE.Quaternion().setFromAxisAngle(st.att.y.clone().divideScalar(yl), yl) : new THREE.Quaternion(), qB = G.board.getWorldQuaternion(new THREE.Quaternion());
        RI.body.push(Rw.multiply(qB)); if (RI.body.length > 3) RI.body.shift();
        if (RI.body.length === 3) { const wv = (a, b) => { const d = b.clone().multiply(a.clone().invert()); if (d.w < 0) { d.x = -d.x; d.y = -d.y; d.z = -d.z; d.w = -d.w; } const ang = 2 * Math.acos(Math.min(1, d.w)), sn = Math.sqrt(Math.max(1e-12, 1 - d.w * d.w)); return new V(d.x / sn, d.y / sn, d.z / sn).multiplyScalar(ang / FT); };
          const acc = wv(RI.body[1], RI.body[2]).sub(wv(RI.body[0], RI.body[1])).length() / FT; if (acc > RI.trunk.v) RI.trunk = { v: acc, at: f + ' (' + t.toFixed(2) + ' s, ' + sk.state + ')' }; } }
      else RI.body.length = 0; }
    /* a fall's frames are the fall's (its own bar, the ragdoll's) — and so is the respawn that ends it: the pose cut back to the spawn is no
       turn of a joint (F4, 10-16: read, the first frame after a respawn showed a thigh at 2,116°/s and the chain the same) */
    if (sk.state === 'bail' || evs.some((e) => e.type === 'bail' || e.type === 'respawn') || W._fell) { W._fell = sk.state === 'bail'; prev = null; LR.reset(); CH.reset(); GR.reset(); path.length = 0; continue; }
    const extra = [];   // the sweep's own readings of the sim's board, for the chain
    LR.frame(sk.state, evs, name, { stroking: !!sk.stroke });
    const pos = new V().setFromMatrixPosition(G.board.matrixWorld), q = new V(); G.board.matrixWorld.decompose(new V(), (W._q = W._q || new (G.board.quaternion.constructor)()), q);
    const up = new V(0, 1, 0).applyQuaternion(W._q);
    const at = f + ' (' + (t).toFixed(2) + ' s, ' + sk.state + (sk.fakie ? ', fakie' : '') + ', ' + Math.hypot(...sk.v).toFixed(1) + ' m/s)';
    if (prev) {
      path.push([pos.clone(), at, sk.state === 'roll' || sk.state === 'manual' || sk.state === 'grind', sk.state === 'grind']);
      if (path.length >= 4) { const four = path.slice(-4), [p0, p1, p2, p3] = four.map((q) => q[0]), a2 = p2.clone().sub(p1.clone().multiplyScalar(2)).add(p0), b2 = p3.clone().sub(p2.clone().multiplyScalar(2)).add(p1);
        if (a2.dot(b2) < 0) { const jump = Math.min(a2.length(), b2.length()), ground = four.every((q) => q[2]) || four.some((q) => q[3]);   // on the ground throughout, or onto a rail (a catch's teleport is the rail's: the supervisor's G1); a take-off or a landing with the air, the airs' class (a landing's own snap is the jump-and-landing class's, next)
          if (ground && jump > W.jump) { W.jump = jump; W.jumpAt = path[path.length - 2][1]; } else if (!ground && jump > W.jumpAir) { W.jumpAir = jump; W.jumpAirAt = path[path.length - 2][1]; } } }   // the frame the move was: the third of the four
      const grounded = sk.state === 'roll' || sk.state === 'manual';
      if (grounded && prev.grounded) {
        /* (rolled over a coping too: its wheels on the deck and the wall, its deck on the coping between them — a wheel lifted off its ground
           there leaves the four-ray plane unread, null) */
        const n = contactPlane(park, G.board), deckRate = Math.acos(Math.min(1, up.dot(prev.up))) * D / FT;
        if (n && prevN) { const planeRate = Math.acos(Math.min(1, n.dot(prevN))) * D / FT, over = deckRate - planeRate;
          if (over > W.deckOver) { W.deckOver = over; W.deckAt = at + ', the deck ' + deckRate.toFixed(0) + '°/s, the contacts ' + planeRate.toFixed(0) + '°/s'; }
          extra.push({ stage: 'sim', what: 'the deck turning faster than its contacts', v: over / BOUND.deckOver, val: over, bound: BOUND.deckOver, unit: '°/s' }); }
        prevN = n;
      } else prevN = grounded ? contactPlane(park, G.board) : null;
      W._grounded = grounded;
    }
    if (f > 2 && fr.joint > W.joint) { W.joint = fr.joint; W.jointAt = fr.jointAt + ' at ' + at; }
    GR.frame(G.F.state.att, G.at('hips'), G.at('head'), sk.up, at);
    if (sk.state === 'grind' && sk.grind) { const q = [0, 0, 0], tn = [0, 0, 0]; sk.railPoint(sk.grind.rail, sk.grind.s, q, tn); const d = q[1] + 0.005 - sk.p[1];
      if (d > W.lock.under) { W.lock.under = d; W.lock.at = at; } if (-d > W.lock.over) W.lock.over = -d; }
    CH.frame(f, sk, evs, extra);
    prev = { pos, up, prevUp: prev ? prev.up : null, grounded: sk.state === 'roll' || sk.state === 'manual' };
  }
  return W;
}

/* THE RUN'S OWN VERDICTS: each gate a run answers alone, against its bound — { gate, ok, v, bound, at } (the chain: its own census) */
export function own(W) {
  const L = W.legs, R = W.roll, out = [];
  const g = (gate, ok, v, bound, at) => out.push({ gate, ok, v, bound, at: at || '' });
  g('the deck never jumps on the ground', W.jump <= BOUND.jump, W.jump, BOUND.jump, W.jumpAt);
  g('the deck follows the ground at its rate', W.deckOver <= BOUND.deckOver, W.deckOver, BOUND.deckOver, W.deckAt);
  g('the hips on the ground', L.ground.v <= HIPS.ground, L.ground.v, HIPS.ground, L.ground.at);
  g('the hips through an impulse', L.impulse.v <= HIPS.impulse, L.impulse.v, HIPS.impulse, L.impulse.at);
  g('the hips within the reach', L.gap.sink <= REACH.sink + 1e-6 && L.gap.rise <= REACH.rise + 1e-6 && L.gap.sway <= REACH.sway + 1e-6, Math.max(L.gap.sink / REACH.sink, L.gap.rise / REACH.rise, L.gap.sway / REACH.sway), 1, '');
  g('the legs never straight', L.straight.v <= REACH.straight, L.straight.v, REACH.straight, L.straight.at);
  g('the feet pinned', pinRms(L) <= FEET.rms && L.pin.worstImpulse <= FEET.impulse, Math.max(pinRms(L) / FEET.rms, L.pin.worstImpulse / FEET.impulse), 1, L.pin.at);
  g('no joint faster than ' + BOUND.joint + '°/s', W.joint <= BOUND.joint, W.joint, BOUND.joint, W.jointAt);
  g('the deck keeps its speed over the coping', R.deck.v >= ROLL.deck && R.own.v <= ROLL.own && R.air.v <= ROLL.air, Math.min(R.deck.v / ROLL.deck, ROLL.own / Math.max(1e-9, R.own.v), ROLL.air / Math.max(1e-9, R.air.v)), 1, R.deck.at);
  g('the board never in the coping', R.sink.v <= ROLL.sink, R.sink.v, ROLL.sink, R.sink.at);
  g('the rider\'s turn has no step', R.trunk.v <= ROLL.trunk, R.trunk.v, ROLL.trunk, R.trunk.at);
  g('the heading never steps on the ground', W.yaw.ex <= BOUND.yaw, W.yaw.ex, BOUND.yaw, W.yaw.at);
  g('the body carried at the legs\' limit', W.gap.swing <= GAP.swing, W.gap.swing, GAP.swing, W.gap.swingAt);
  g('a rail\'s end keeps the step\'s move', W.railEnd.v <= BOUND.railEnd, W.railEnd.v, BOUND.railEnd, W.railEnd.at);
  const K = Object.keys(W.chain.census), broke = K.filter((k) => W.chain.census[k].v > 1);
  g('the chain quiet', broke.length === 0, broke.length, 0, broke.slice(0, 2).map((k) => k + ' ' + (100 * W.chain.census[k].v).toFixed(0) + '% (frame ' + W.chain.census[k].f + ')').join(' · '));
  return out;
}

/* WHAT A CAPPED SLIDE LEFT, said over a sweep's rides (each ride's W.drops, by kind: tests/lib/drops.mjs) — a REPORTED line, never a gate (the
   supervisor, 10-17: "so the limit is never a silent discard") */
export function sayDropped(rides, label = '') {
  const all = drops(); for (const W of rides) if (W && W.drops) all.add(W.drops);
  return all.say((label ? label + ', ' : '') + rides.length + ' rides');
}
