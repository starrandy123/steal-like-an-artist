/* THE SKATER AND THE BOARD — one kinematic body on a fixed step (DESIGN.md §4). States: roll · air · grind · manual · lip · bail.
 * Plain JS; reads the world (the park's tree and its grindable lines) and the controls, writes what happened this step into `events`
 * (for the score, the sound and the view). Deterministic: the same inputs from the same start give the same run. */
import { PHYSICS as PH, TRICKS, ASSISTS, BOARD } from '../config.js';
import * as V from './vec.js';
import { plane as contactPlane, support } from '../formulas/contact.js';
import { deckOver, restOn } from '../formulas/edge.js';
import { plan, gave } from '../formulas/stroke.js';
import { second, carry, ease, planned } from '../formulas/follow.js';
import { moved } from '../formulas/jump.js';

const Y = [0, 1, 0], DOWN = [0, -1, 0], DEG = Math.PI / 180;
const S = Array.from({ length: 16 }, () => [0, 0, 0]);   // scratch vectors
/* the deck's underside above the board's contact plane; an edge within the deck's footprint above that underside and below its top is in the
   deck itself; one higher than that is in the board only where the deck under it is inside the solid the edge tops (edgeThrough) — up to
   EDGE_REACH (past it, other ground) */
const HD = PH.deckTop - BOARD.thickness, EDGE_REACH = 0.6, DECK_IN = 0.03;   // DECK_IN: the trucks' half-width inside each axle (the baseplate's)
const HT = 0.02;
export const CATCH_TOL = 0.01;   // a rail's catch: the step begins with the trucks this close to its top, or over it (tryGrind; tests/catch_from_above.mjs)
const WALL_BETA = 0.25;   // a wall contact found already there at a step's start: the share of its depth corrected a step (walls)
/* THE IN-AIR TURN (headToLanding, stepAir: the planned turn — formulas/follow.js planned), one law for the heading and the up. Its quickest: a
   turn begins only with 0.05 s to make it (least jerk peaks at 1.875 θ/T: at 0.05 s, 37.5 θ — the lip airs' gate reads 40 θ, a set in one step
   120 θ); a landing first seen nearer than that is met as the board is, by its contact. Its PACE: a rider's own turn of the board in the air,
   200 rad/s² (the most the smooth assist on V14 turned the heading, 198, measured), never asked more of — the share of the turn it makes by
   the landing, or, when its own rate cannot be brought to rest by a landing that came in sooner, the time that takes. (Unpaced, the up chased
   a grazing drop-in's first touch — a guess that jumped 184 → 64 → 13 ms as the bent path met the wall — at up to 2,477°/s and 3,392 rad/s²,
   a foot at 5,749°/s; paced on the middle's guess, eight slow Raw lip airs met the Basin's coping with the deck and hung up: the landing the
   judge reads is the one now planned for, predictLanding) */
const TURN_A = 200, TURN_T = 0.05;
const WHEEL_R = BOARD.wheel / 2;   // a wheel's radius (a drop-in's tail is past its coping a radius beyond its line: tailPast)   // the trucks' lowest above the contact plane: the hanger round its axle, the wheel's radius less the hanger's own (board.js)
const DECK_UP = Math.cos(35 * DEG);   // a board on a coping's deck stands within this of upright (a roll-in starts there)

export class Skater {
  constructor(world, opts = {}) {
    this.world = world;
    this.assist = Object.assign({}, ASSISTS[opts.preset || ASSISTS.preset]);
    this.p = [0, 0, 0]; this.v = [0, 0, 0]; this.up = [0, 1, 0]; this.fwd = [0, 0, 1];
    this.events = []; this.t = 0; this.seed = opts.seed || 1;
    /* THE SIM'S OWN CONTACT SIGNAL IN THE AIR (10-17, the supervisor: the frames where a contact turned the board are "named by the SIM'S OWN
       CONTACT SIGNAL ... never by the size of the turn"): a count every contact that turns the board in the air adds to — the deck tipped on
       an edge, a wheel's pivot, a stop's turn back to its moment, the push-out's turn — never reset: a reader of several steps sees it move
       (tests/lib/airyaw.mjs) */
    this.airTouch = 0;
    this.surface = 'slab'; this.stats = { pops: 0, landed: 0, sketchy: 0, bails: 0, grinds: 0, manuals: 0, airs: 0, lips: 0, reverts: 0, respawns: 0, maxSpeed: 0, maxAir: 0, distance: 0, flips: 0 };
    this.respawnAt(world.data.spawn.at, world.data.spawn.heading, world.data.spawn.speed || 0);
  }
  rnd() { let t = (this.seed = (this.seed + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

  /* A FAULT — the sim's own (a state no longer finite) or the page's (a frame that threw: main.js frame): said as an event, counted, and the
     rider stood up at the park's first node. Never silent: the page also says it in its console and keeps it on window.__wl.faults */
  fault(what) { this.events.push({ type: 'fault', what }); this.stats.faults = (this.stats.faults || 0) + 1; const n = this.world.data.nodes[0]; this.respawnAt([n[0], n[1], n[2]], n[3]); }
  /* ---------------- placing the skater ---------------- */
  respawnAt(at, headingDeg, speed = 0) {
    this.catchTurn = null; this.settle = null;
    const h = this.world.groundAt(at[0], at[1] + 0.3, at[2], 4);
    V.set(this.p, at[0], h ? h.point[1] : at[1], at[2]);
    V.copy(this.up, h ? h.normal : Y);
    const a = headingDeg * DEG; V.set(this.fwd, Math.sin(a), 0, Math.cos(a)); V.norm(this.fwd, V.reject(this.fwd, this.fwd, this.up));
    V.scale(this.v, this.fwd, speed);
    this.state = 'roll'; this.fakie = false; this.switch = false; this.lean = 0; this.crouch = 0; this.pushT = 0; this.pushing = 0; this.pushHold = false; this.stroke = null; this.footWait = null; this.hand = false; this.quickLeft = 0; this.nextPushAt = 0;
    this.air = null; this.grind = null; this.manual = null; this.lip = null; this.bail = null; this.landT = 9; this.wobble = 0; this.revert = null; this.crossing = null; this.dropping = null; this.ahead = null;
    this.needle = 0; this.needleV = 0; this.spinRate = 0; this.lastGround = this.p.slice(); this.prevUp = this.up.slice();
    if (h) this.surface = h.surf;
  }
  /* where a bail stands up: the spot itself if it will do, else the nearest of the park's nodes */
  respawnSpot() {
    const here = this.world.standable(this.p[0], Math.max(this.p[1], 0), this.p[2]);
    if (here) { const hd = Math.atan2(this.fwd[0], this.fwd[2]) / DEG; return [here, this.openHeading(here, hd)]; }
    let best = null, bd = Infinity;
    for (const [x, y, z, hd] of this.world.data.nodes) { const d = (x - this.p[0]) ** 2 + (z - this.p[2]) ** 2 + 4 * (y - this.p[1]) ** 2; if (d < bd) { bd = d; best = [[x, y, z], hd]; } }
    return best && [best[0], this.openHeading(best[0], best[1])];
  }
  /* back on the board facing open ground: the heading kept if 6 m ahead are clear, else the one with the longest clear run */
  openHeading(at, hd) {
    const run = (h) => { const a = h * DEG, hit = this.world.bvh.raycast([at[0], at[1] + 0.45, at[2]], [Math.sin(a), 0, Math.cos(a)], 12); return hit ? hit.t : 12; };
    let best = hd, bl = run(hd); if (bl >= 6) return hd;
    for (let k = 1; k <= 6; k++) for (const s of [1, -1]) { const h = hd + s * k * 30, l = run(h); if (l > bl + 0.25) { bl = l; best = h; } }
    return best;
  }

  /* ---------------- one step ---------------- */
  step(dt, input) {
    this.t += dt; this.events.length = 0; this.dropMove = 0; this.dropWhere = null; this.drops = null; this.wallAir = null;
    /* THE FOOT FIRST: a pop or a manual stands on both feet on the board. The trick hand going down (the right thumb landing on the flick pad,
       Space held for a pop) sends a stroke's foot home at once and starts no new stroke while it is down; a pop or a manual met while the foot
       is still on its way is held, with every event after it in order, and met the moment the foot is home (popped with the foot out on the
       ground, it hung off the board for the whole air: the supervisor's M4; called at the hand's touch, most flicks find the foot home) */
    this.hand = !!(input.hold || input.load > 0);
    if (this.hand && this.stroke) this.homeFoot(true);
    this.applyInputs(input);
    /* off the ground (a pop, a manual, a grind) the stroke is over but its foot is not yet home: it steps home on its own curve, quick, in
       whatever he is doing (stepped only on the ground, it had lived on through an ollie, the back foot hanging off the board for the whole
       air and its unspent force paid at the landing — the supervisor, M4); in a bail the body falls and the stroke is dropped */
    if (this.stroke && this.state !== 'roll' && this.state !== 'manual') {   // (a manual steps it on the ground's own way: stepGround)
      if (this.state === 'bail') this.stroke = null;
      else { const st = this.stroke; if (st.phase !== 'back') this.homeFoot(true); else { st.t += dt; if (st.t >= st.backT - 1e-6) this.stroke = null; } }
    }
    switch (this.state) {
      case 'roll': case 'manual': this.stepGround(dt, input); break;
      case 'air': this.stepAir(dt, input); break;
      case 'grind': this.stepGrind(dt, input); break;
      case 'lip': this.stepLip(dt, input); break;
      case 'bail': this.stepBail(dt, input); break;
    }
    if (!(Number.isFinite(this.p[0]) && Number.isFinite(this.p[1]) && Number.isFinite(this.v[0]))) this.fault('non-finite state');
    const sp = V.len(this.v); if (sp > this.stats.maxSpeed) this.stats.maxSpeed = sp;
  }

  /* what the right thumb's gestures mean depends on the state the board is in */
  applyInputs(input) {
    let ev = input.events || [], waited = 0;   // (the first `waited` of them were held already and are never held twice: released at the cap
                                               // with the foot still out, a manual was held again — 50 ms, then 50 more)
    /* the wait is never longer than `waitMax` (the supervisor's call, 10-16: Cruise pops an unloaded swipe 17 ms after the thumb lands, and
       108 ms more on an ollie out of a push is a late ollie at every ledge): past it the trick goes and the foot finishes its step home
       inside it, on the same curve */
    if (this.footWait) {
      const W = this.footWait; W.steps++;
      if (this.stroke && this.state === 'roll' && W.steps <= Math.round(PH.push.waitMax / PH.step)) { if (ev.length) W.ev.push(...ev); ev = []; }
      else { waited = W.ev.length; ev = W.ev.concat(ev); this.events.push({ type: 'footHome', waited: (W.steps - 1) * PH.step, capped: !!this.stroke }); this.footWait = null; }
    }
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      if (i >= waited && this.stroke && this.state === 'roll' && ((e.type === 'pop' && !(this.skipPopOf != null && e.gesture === this.skipPopOf)) || (e.type === 'tap' && this.assist.tapOllie) || (e.type === 'manual' && e.on))) {
        this.footWait = { t0: this.t, steps: 0, ev: ev.slice(i) }; this.homeFoot(true); break;
      }
      if (e.type === 'swipe' && this.state === 'roll' && this.landT < PH.revert.window && this.slopeDeg() >= PH.revert.slope && this.lastAirWasRamp) { this.startRevert(e.side); this.skipPopOf = e.gesture; continue; }
      if (e.type === 'pop') {
        if (this.skipPopOf != null && e.gesture === this.skipPopOf) continue;
        if (this.state === 'roll' || this.state === 'manual') this.pop(e);
        else if (this.state === 'grind') this.popOffRail(e);
        else if (this.state === 'lip') this.dropIn(true);
      } else if (e.type === 'tap' && this.assist.tapOllie && (this.state === 'roll' || this.state === 'manual')) { this.pop({ load: 0.3, spd: 3, acc: 3 }); if (this.air) this.air.awaiting = false; } else if (e.type === 'trick' && this.state === 'air' && this.air && this.air.awaiting && this.t - this.air.t0 < 0.35) this.setTrick(e);
      else if (e.type === 'manual') { if (e.on && this.state === 'roll' && V.len(this.v) > 1.0 && this.landT > 0.05) this.startManual(e.nose); else if (!e.on && this.state === 'manual') this.endManual(true); this.manualHeld = e.on ? (e.nose ? 'nose' : 'tail') : null; }
      else if (e.type === 'grab') { if (this.state === 'air' && this.air) { if (e.on) this.startGrab(e.dir); else this.endGrab(); } }
      else if (e.type === 'lipHold') this.lipHeld = e.on ? e.dir : null;
      else if (e.type === 'special' && this.golden && this.state === 'air' && this.air && this.air.trick && !this.air.special) this.special();
    }
    this.hold = input.hold || null; this.golden = !!input.golden;
  }

  slopeDeg() { return Math.acos(V.clamp(this.up[1], -1, 1)) / DEG; }

  /* the stroke's foot home onto the tail from wherever it is: quick when the trick hand calls it (a pop or a manual waits on it), at its own pace
     when the push is let go or the brake taken; from early in the reach, in the time it took to leave */
  homeFoot(quick, at) {
    const st = this.stroke, P = PH.push; if (!st) return;
    st.more = false;
    if (st.phase === 'back' && (st.quick || !quick)) return;
    const T = quick ? P.backQuick : P.back;
    st.backT = st.phase === 'reach' ? Math.max(PH.step, Math.min(T, st.t)) : T;
    st.phase = 'back'; st.t = 0; st.t0 = at != null ? at : this.t - PH.step; st.quick = quick; st.seg++; st.lift = st.dist;
  }

  /* ---------------- ROLL and MANUAL ---------------- */
  stepGround(dt, input) {
    const A = this.assist, up = this.up;
    const speed = V.len(this.v);
    const dir = speed > 0.05 ? V.scale(S[0], this.v, 1 / speed) : V.scale(S[0], this.fwd, this.fakie ? -1 : 1), dir0 = dir.slice();   // (dir0: the step's own start, kept: S[0] is scratch)
    /* steering: a lean that follows the thumb; curvature by speed; a kickturn below walking pace */
    const target = V.clamp(input.steer || 0, -1, 1);
    this.lean += (target - this.lean) * ease(dt, PH.carve.respond);
    {
      const kmax = Math.min(PH.carve.curv, PH.carve.lateral / (speed * speed)), yaw0 = speed < PH.carve.kickturnBelow ? -target * PH.carve.kickturnRate * DEG * dt : -this.lean * kmax * speed * dt;
      const kT = Math.abs(yaw0) > 1e-7 ? this.turnClear(this.fwd, V.rotate(S[10], this.fwd, up, yaw0)) : 1, yaw = Math.abs(yaw0) > 1e-7 ? yaw0 * kT : 0;   // (no turn carries a wheel into a face: turnClear)
      if (kT < 1) this.noteDropped(Math.abs(yaw0) * (1 - kT), 'a turn cut at a face (the steering)', 'rad');   // the rest of the turn: said (the census, row 2)
      V.rotate(this.fwd, this.fwd, up, yaw); V.rotate(this.v, this.v, up, yaw);
      this._steered = Math.abs(yaw);   // the steering's own turn this step (its budget's share: the line of travel, below)
    }
    /* the forces along the surface */
    const acc = V.set(S[1], 0, 0, 0);
    V.addScaled(acc, acc, V.reject(S[2], DOWN, up), PH.gGround);
    const rr = (PH.roll[this.surface] != null ? PH.roll[this.surface] : 0.012) * PH.gGround * Math.max(0, up[1]);
    if (speed > 0.05) { V.addScaled(acc, acc, dir, -(rr + PH.drag * speed * speed)); }
    const throttle = input.throttle || 0;
    this.braking = throttle < -0.3 && speed > 0.2;
    if (this.braking) { const b = speed > PH.brake.slideAbove && Math.abs(this.lean) > 0.25 ? PH.brake.slide : PH.brake.foot; V.addScaled(acc, acc, dir, -Math.min(b, speed / dt)); if (b === PH.brake.slide) this.events.push({ type: 'powerslide' }); }
    /* PUSHING IS A STROKE OF THE BACK FOOT (10-16, the owner: "very stiff on the thrust"): off the tail, a reach forward to plant on the ground
       beside the front truck; a drive back along it for as long as the leg holds the foot there — the board rolls `sweep` metres from the
       planted foot, so the faster it goes the shorter the contact; the push's force a half sine over the WHOLE contact, its peak no more than a
       person's (`aMax`: a fixed window at the start had paid the whole gain in 25 ms at 4–6 g, the supervisor's M1); a low swing forward to
       plant again while the thumb holds up — or, let go (or the brake taken, or the trick hand down), home onto the tail. Every phase it enters
       is a new segment (`seg`): the pose starts each from where the foot is (view/skater.js) */
    /* THE CADENCE (the supervisor's M6, 10-16: held, the strokes came 158–188 a minute — a sewing machine): a skater pushes, sets the foot
       back on the board and rides before the next push — 30 to 75 strokes a minute at 2.2–3.9 m/s (Crockett & Jensen, ISBS 2007; CLEANROOM.md).
       A standing start (begun under `standBelow`) runs its first `quickSwings` + 1 strokes straight on, the foot swinging from one push to the
       next, as a real one does; after them every drive ends with the foot home, and the next plant comes no sooner than `cycle` after the
       last — longer above 4 m/s */
    const P = PH.push, cycleOf = (v) => P.cycle + Math.max(0, v - 4) * P.cycleSlope;
    const wantPush = this.state === 'roll' && (throttle > 0.3 || input.pushTap) && this.landT > 0.15 && speed < P.top && !this.hand && !this.footWait && this.t - dt + 1e-9 >= (this.nextPushAt || 0);   // (a stroke begins at its step's start: not before the floor)
    let st = this.stroke;
    /* `t0`: the sim's time each segment began — the start of the step it began in (its `t` counts from the step after; the pose reads the
       exact elapsed time: by `t` it lagged a step, and at 7.5 m/s set the lifting foot 6 cm past the leg's reach) */
    if (throttle <= 0.3 && !input.pushTap && !st) this.nextPushAt = 0;   // let go while riding: the push is over
    if (!st && wantPush && speed < P.standBelow) this.quickLeft = P.quickSwings;   // a standing start
    if (!st && wantPush) st = this.stroke = { phase: 'reach', t: 0, t0: this.t - dt, dist: 0, more: true, gain: 0, given: 0, drive: 0, n: 0, quick: false, seg: 1, backT: P.back, lift: 0 };
    if (st) {
      st.t += dt;
      if (throttle <= 0.3 && !input.pushTap) st.more = false;
      if (this.braking && st.phase !== 'back') this.homeFoot(false);
      /* the drive lasts while the board rolls `sweep` from the planted foot — counting the speed the push itself adds (the half sine's mean is
         half its gain): timed by the speed at the plant alone, the board rolled 0.6 m under a push from slow and the leg went straight */
      const plant = () => { st.phase = 'drive'; st.t = 0; st.t0 = this.t - dt; st.dist = 0; st.n++; st.seg++; this.lastPlantAt = this.t - dt;
        const want = P.dv * Math.pow(Math.max(0, 1 - speed / P.top), P.curve), S1 = plan({ want, speed, aMax: P.aMax, sweep: P.sweep, driveMax: P.driveMax });   // formulas/stroke.js
        st.drive = S1.T; st.gain = S1.gain; st.given = 0; st.u = 0; this.events.push({ type: 'push' }); };
      /* (a phase's clock is a sum of 1/120 s steps: 30 of them come to just under 0.25, so each end is read with a hair to spare — without
         it a swing ran a step past its length, and the pose, timed true, had landed and stood still a step) */
      const ET = 1e-6;
      if (st.phase === 'reach' && st.t >= P.reach - ET) plant();
      if (st.phase === 'drive') {
        /* the force a half sine over the drive, by time or by the board's roll from the planted foot, whichever is further on: it is nothing
           at the lift, as a push is at its toe-off (cut by the roll alone, its last step still pushed at a third of its peak) */
        const u = Math.max(st.t / st.drive, st.dist / P.sweep), last = st.t + dt >= st.drive || st.dist + speed * dt >= P.sweep;
        /* the speed this step gives: the half sine's own share between where the contact was and where it is now (formulas/stroke.js — the
           last step of a drive gives what is left of it; stepped as rate × dt, a short contact gave 98 % of its gain) */
        if (u > 0 && st.given < st.gain) {
          const u1 = last ? 1 : Math.min(1, u), pd = speed > 0.3 ? dir : V.scale(S[3], this.fwd, this.fakie ? -1 : 1), a = Math.min(st.gain - st.given, gave(st.u || 0, u1, st.gain));
          V.addScaled(this.v, this.v, pd, a); st.given += a; st.u = u1;
        }
        /* over AT the step that would roll the board past the sweep: the foot lifts as it begins, its last push given (counted through it,
           the foot was a step's roll further back: 6 cm at 7.5 m/s, and past the leg's reach) */
        if (last) {
          if (st.more && speed < P.top && this.quickLeft > 0) { this.quickLeft--; st.phase = 'swing'; st.t = 0; st.t0 = this.t - dt; st.seg++; st.lift = st.dist; }
          else { if (st.more) this.nextPushAt = this.lastPlantAt + cycleOf(speed) - P.reach; this.homeFoot(false); }   // (the next stroke's reach begins its own length before: plant to plant is the cycle)   // home to ride: the glide (the next push's time set before the step home lets go of `more`)
        }
      } else if (st.phase === 'swing' && st.t >= P.swing - ET) plant();
      else if (st.phase === 'back' && st.t >= st.backT - ET) st = this.stroke = null;
      if (st && st.phase === 'swing' && !st.more) this.homeFoot(false);
    }
    this.pushing = st ? 0.6 : Math.max(0, this.pushing - dt);
    /* pumping a transition: going down a curved wall gains speed, by the pump assist */
    if (this.surface === 'ramp' && up[1] < 0.985 && up[1] > 0.25 && speed > 0.5 && V.dot(this.v, Y) < 0 && speed < PH.pump.top) {
      const a = (PH.pump.gain * (A.pump / 85)) / 0.5; V.addScaled(acc, acc, dir, a);
    }
    if (this.state === 'manual') this.stepManualNeedle(dt);
    V.addScaled(this.v, this.v, acc, dt);
    if (speed < 0.05 && !wantPush) V.scale(this.v, this.v, 0.9);
    const sp2 = V.len(this.v); if (sp2 > PH.maxSpeed) V.scale(this.v, this.v, PH.maxSpeed / sp2);
    /* the lip: arriving at a coping slowly with the thumb held */
    if (this.state === 'roll' && this.lipHeld != null && this.tryLip()) return;
    /* move, then find the surface again under the four wheels */
    V.copy(this.prevUp, this.up);
    const before = this.p.slice();
    if (this.stroke && this.stroke.phase === 'drive') this.stroke.dist += V.len(this.v) * dt;   // how far the board rolls from the planted foot: by the speed it moves at (the speed before the push's force, a step behind, crept the foot)
    const r = this.rollOn(dt);
    if (this.state === 'bail') return;
    this.stats.distance += V.dist(before, this.p);
    /* leaving the surface, it leaves where the step began and the step is FLOWN — the wheels swept as in any air step (a roll step moved
       first and asked after: at a lip the front pair went 1 cm into the deck before the board was let go, and flew from inside it) */
    if (r === 'off' || r === 'lip' || r === 'dropin') { this.toAir(r === 'off' ? 'rolloff' : r); if (this.state === 'air') this.stepAir(dt, input); return; }
    this.walls(dt, before);
    this.ahead = this.leanAhead();
    this.landT += dt; this.wobble = Math.max(0, this.wobble - dt);
    /* forward or fakie: the board rolls along its own long axis; a board turned more than 90° from its travel rolls fakie */
    const sp = V.len(this.v), C = PH.carve;
    if (sp > 0.3) {
      const d = V.dot(this.fwd, this.v); this.fakie = d < 0;
      /* the board is held to the line of travel (its wheels roll; they do not slide) — its heading turned toward its travel no faster than the
         steering can turn it at its speed (what the carve has not used this step) and the forces along the surface turn the travel by
         (THE HEADING NEVER STEPS ON THE GROUND, the supervisor 10-16: chasing its travel at 30/s however far off it was, a board stopped by a
         wall, or landed 60° off its travel on Raw, snapped through 600–1,450°/s); a travel further off than that turn takes is a SKID: the
         wheels' grip — the carve's own lateral limit — takes it across the board, its speed with it. Where the turn does not bind (riding,
         carving, a bank's pull downhill: the Plaza's sweep never reached it) the heading follows as it always did */
      const want = V.scale(S[4], V.norm(S[5], this.v), this.fakie ? -1 : 1), u2 = this.up, cx = V.cross(S[11], this.fwd, want), need = Math.atan2(V.dot(cx, u2), V.dot(this.fwd, want));
      /* (the budget of the step as it began — its speed and its travel then: the steering's at that speed; a wall met this step leaves a slow
         board and no budget of its own — 10-16, a scrape on the East deck took a 1.5 m/s board under walking pace and its heading had the
         kickturn's 220°/s to chase the wall's direction with) */
      const steer = speed < C.kickturnBelow ? C.kickturnRate * DEG : Math.min(C.curv * speed, C.lateral / speed), g2 = V.reject(S[12], DOWN, u2);
      const forces = Math.abs(V.dot(V.cross(S[14], g2, dir0), u2)) * PH.gGround / Math.max(speed, 0.5), most = Math.max(0, (steer + forces) * dt - (this._steered || 0)), step0 = need * Math.min(1, dt * 30);
      this.caught = 0;   // (what the catch turned this step: said, for the ground's own heading reading — tests/lib/heading.mjs)
      if (this.catchTurn) {
        /* THE CATCH (land: the spin assist's turn onto the line, handed to the ground): onto its travel at a rider's pace (TURN_A), planned from
           the rate and acceleration it touched down with, so it steps neither at the touchdown nor here; while it runs it is the chase, and
           the travel is not skidded. A turn cut at a face hands back to the chase (said) */
        const c = this.catchTurn, h = { u: -need, ud: c.w, udd: c.a };
        planned(h, 0, Math.max(TURN_T, Math.sqrt(5.77 * Math.abs(need) / TURN_A)), dt, TURN_A);
        const turn = h.u + need, nf = V.norm(S[10], V.rotate(S[10], this.fwd, u2, turn));
        const kT = this.turnClear(this.fwd, nf); V.norm(this.fwd, V.lerp(this.fwd, this.fwd, nf, kT)); c.w = h.ud; c.a = h.udd; this.caught = Math.abs(turn) * kT;
        if (kT < 1) { this.noteDropped(Math.abs(turn) * (1 - kT), 'a turn cut at a face (the catch)', 'rad'); this.catchTurn = null; }
        else if (Math.abs(need - turn) < 2e-3 && Math.abs(c.w) < 0.05) this.catchTurn = null;
      } else {
        const turn = V.clamp(step0, -most, most), nf = V.norm(S[10], V.rotate(S[10], this.fwd, u2, turn));
        const kC = this.turnClear(this.fwd, nf); V.norm(this.fwd, V.lerp(this.fwd, this.fwd, nf, kC));   // (no turn carries a wheel into a face: turnClear)
        if (kC < 1) this.noteDropped(Math.abs(turn) * (1 - kC), 'a turn cut at a face (the heading\'s chase)', 'rad');   // said (the census, row 5)
        if (Math.abs(step0) > most + 1e-12) this.skid(dt);
      }
    } else { this.catchTurn = null; if (sp > 1e-6) this.skid(dt); }   // slower, the heading chases no travel: whatever crosses the board is the grip's (and a catch ends)
    if (this.revert) { this.revert.t += dt; if (this.revert.t >= PH.revert.time) this.revert = null; }
    this.crouch += ((this.loadDepth || 0) - this.crouch) * ease(dt, 0.06);
  }
  /* ROLLING INTO A FACE (10-16): a wheel rolls up onto what stands no more than `stepUp` above its contact (a seam, a crack — its own radius
     takes it over); what is higher, it HITS. Each wheel's path this step is swept `stepUp` above its contact, and the board stops where a wheel
     meets a face it cannot roll up (one standing more than 60° from its deck), its motion into the face taken away — faster than the low body
     bails at a wall, a bail. (attach() takes ground from 32 cm above a wheel: rolling into the Pad's 20 cm face, the leading wheels went INTO
     the face and the board was set up on the Pad's top — at 1.5 m/s it rolled up the Pad, and over the 15 cm Red Curb, with no ollie) */
  rollOn(dt) {
    V.addScaled(this._free || (this._free = [0, 0, 0]), this.p, this.v, dt);   // the step's free end, before any contact (read by the tests: a contact's own move)
    /* COLLIDE AND SLIDE (10-17; Fauerby 2003, the character controller's slide move, its bumps): a wheel stopped at a face it cannot ride up
       stops the board on its path, the face takes its share of the velocity, and the REST OF THE STEP is rolled again along the face — up to
       three times a step (a corner meets two). Stopped and left there, a board that met a ledge's face at a slant lost the rest of each step
       it pressed into the face: by the walls' census, 827 steps of scraping along the park's faces lost more than 2 mm of their own move, the
       most 20 mm, and a board stood stuck on a fence while its velocity ran along it */
    /* (the step's own moves, each part's from where the last was stopped on its line, are kept for the tests — `_own`, with the walls' slide:
       a board slid along a face ended ON its own path, never off it). The board is SEATED once, after its parts (10-17: seated after each,
       a board landed against the Spine's ridge was set 1.6 cm off its path in a step by three seats, where one had set it 0.7) */
    const own = this._own || (this._own = []); own.length = 0;
    const blocked = this._blocked || (this._blocked = [false, false, false, false]); blocked.fill(false);
    const p0 = this.p.slice(); let left = dt, q = this.p.slice(), met = false, last = null;
    for (let bump = 0; bump < 3 && left > 1e-7; bump++) {
      const v0 = this.v.slice(), res = this.rollPart(left); last = res;
      if (res === 'bail') { blocked.fill(false); return 'ok'; }
      const f = this._stop, q1 = [q[0] + v0[0] * left * f, q[1] + v0[1] * left * f, q[2] + v0[2] * left * f]; own.push([q, q1]); q = q1;
      if (res === 'free') break;
      met = true; left = this._left;
    }
    if (last === 'met' && left > 1e-7) this.noteDropped(V.len(this.v) * left, 'the roll');   // the three bumps spent with time left: said, never a silent discard
    const r = this.attach(); blocked.fill(false);
    /* (rolled off where nothing was met, the board leaves where the step began: the caller flies the step) */
    if (!met && (r === 'off' || r === 'lip' || r === 'dropin')) V.copy(this.p, p0);
    return r;
  }
  /* one part of a rolling step (rollOn): the board rolled `dt` on — 'free' the whole of it, 'met' stopped at the first face a wheel met (the
     time left: this._left; the wheels that met it: this._blocked, kept for the seat), 'bail' into a face too fast */
  rollPart(dt) {
    const W = this.wheelsOn(this.p, this.up, this.fwd, this._wr || (this._wr = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]])), u = this.up, h = PH.stepUp, sp = V.len(this.v);
    let best = null; const blocked = this._blocked;
    if (sp > 1e-6) for (let i = 0; i < 4; i++) {
      /* (only a wheel that LEADS the motion meets a face it cannot ride up; a trailing wheel the board's own motion presses into a surface slides
         along it as the board turns — attach seats it there: 10-16, sliding back down a bowl's wall with its front pair past the coping, a board
         called that deck a wall every step and stood stuck on it, its front pair sinking into it) */
      /* (...and a trailing wheel still meets a WALL — a face steep in the world, whatever the board's own tilt: 10-16, stopped against the Pad's
         side 13° off square and skidding along it, the wheel nearest the Pad trailed the skid, went in under the sweep and the board climbed
         the Pad's top) */
      const leads = (W[i][0] - this.p[0]) * this.v[0] + (W[i][1] - this.p[1]) * this.v[1] + (W[i][2] - this.p[2]) * this.v[2] > 0;
      const a = [W[i][0] + u[0] * h, W[i][1] + u[1] * h, W[i][2] + u[2] * h], b = [a[0] + this.v[0] * dt, a[1] + this.v[1] * dt, a[2] + this.v[2] * dt];
      const hit = this.sweepPoint(a, b, [-this.v[0] / sp, -this.v[1] / sp, -this.v[2] / sp]);
      /* (stopped at the face's own plane, a millimetre short of it: sweepPoint's s runs from its 5 mm back-off, and a stop there left the wheel
         up to 5 mm in the face — 10-16: a front wheel 3 mm into the Pad's side, whose top its probe then found 20 cm up, and the board was set
         28° onto the Pad for a step, its back wheel 1.1 cm in the slab) */
      if (hit && V.dot(hit.face, u) < 0.5 && (leads || Math.abs(hit.face[1]) < 0.5)) { blocked[i] = true; const n0 = hit.face, ahead = n0[0] * (a[0] - hit.point[0]) + n0[1] * (a[1] - hit.point[1]) + n0[2] * (a[2] - hit.point[2]), into = -(n0[0] * (b[0] - a[0]) + n0[1] * (b[1] - a[1]) + n0[2] * (b[2] - a[2]));
        hit.stop = into > 1e-9 ? V.clamp((ahead - 0.001) / into, 0, 1) : 0; if (!best || hit.stop < best.stop) best = hit; }
    }
    /* (a ridge or an edge that comes up between the trucks is the deck's: attach() rests the board on it — the high-centre) */
    /* (a wheel that met a face takes no ground beyond it: attach's probe begins 32 cm above each wheel, and from a wheel standing at the Pad's
       face it found the Pad's top 17 cm up and set the board 28° onto it — the climb again) */
    this._stop = best ? best.stop : 1;
    if (!best) { V.addScaled(this.p, this.p, this.v, dt); return 'free'; }
    V.addScaled(this.p, this.p, this.v, dt * best.stop);
    const n = best.face, vn = V.dot(this.v, n);
    if (vn < 0) { if (-vn > PH.body.bailSpeed) { this.toBail('wall', -vn); return 'bail'; } V.addScaled(this.v, this.v, n, -vn); this.events.push({ type: 'scrape', speed: -vn }); }   // §4.4: more than 3 m/s along the face's normal is a bail; under it the board stops at the face
    this._left = dt * (1 - best.stop); return 'met';
  }
  /* A SKID: the travel across the board taken by the wheels' grip — the carve's own lateral limit (C.lateral) — this step */
  skid(dt) {
    const along = V.dot(this.v, this.fwd), across = V.addScaled(S[15], this.v, this.fwd, -along), al = V.len(across);
    if (al > 1e-9) V.addScaled(this.v, this.v, across, -Math.min(1, PH.carve.lateral * dt / al));
  }
  /* A TURN CANNOT CARRY A WHEEL INTO A FACE (10-16): the share of a turn of the heading from `a` to `b` (about the board's up, on the ground)
     a board can make before a wheel, swept `stepUp` above its contact as rollOn sweeps it, meets a face it cannot roll up — a millimetre short
     of it (stopped square against the Pad's side, a board was swung 17° in a step toward the velocity the wall had left it, and its front wheel
     went into the Pad: its probe took the Pad's top 20 cm up and pitched the board 28° onto it) */
  turnClear(a, b) {
    const up = this.up, h = PH.stepUp, W0 = this.wheelsOn(this.p, up, a, this._tc0 || (this._tc0 = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]])), W1 = this.wheelsOn(this.p, up, b, this._tc1 || (this._tc1 = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]));
    let k = 1;
    for (let i = 0; i < 4; i++) {
      const p0 = [W0[i][0] + up[0] * h, W0[i][1] + up[1] * h, W0[i][2] + up[2] * h], p1 = [W1[i][0] + up[0] * h, W1[i][1] + up[1] * h, W1[i][2] + up[2] * h], d = V.sub([0, 0, 0], p1, p0), L = V.len(d);
      if (L < 1e-6) continue;
      const hit = this.sweepPoint(p0, p1, V.scale(d, d, -1 / L)); if (!hit || V.dot(hit.face, up) >= 0.5) continue;
      const n0 = hit.face, ahead = n0[0] * (p0[0] - hit.point[0]) + n0[1] * (p0[1] - hit.point[1]) + n0[2] * (p0[2] - hit.point[2]), into = -(n0[0] * (p1[0] - p0[0]) + n0[1] * (p1[1] - p0[1]) + n0[2] * (p1[2] - p0[2]));
      if (into > 1e-9) k = Math.min(k, V.clamp((ahead - 0.001) / into, 0, 1));
    }
    return k;
  }
  /* the four wheels: cast along the board's down from above each wheel; the board takes the plane of what they touch */
  attach() {
    const up0 = this.up.slice();
    /* the settle's start is this step's attitude, set by the step's first seat whatever way it goes (10-17: set only inside the settle's own
       block, a landing whose first seat went the edge's hold left it unset, and the seat's second reading threw on it — in the page the frame
       stopped, the body down and nothing coming back: the owner's "doesn't respawn upon falling"; tests/never_throws.mjs) */
    if (this.settle && !this._reseat) this.settle.from = up0.slice();
    const up = this.up, fwd = this.fwd, side = V.norm(S[6], V.cross(S[6], fwd, up)), hw = PH.wheelbase / 2, ht = PH.track / 2;
    const ray = V.scale(S[7], up, -1), reach = PH.probeUp + PH.probeDown;
    /* ground ABOVE a wheel (more than `stepUp`) is under it only when the wheel is INSIDE the solid it tops — a transition's own curve rising
       above a board's plane, the wheel sunk under it — never the top of a step the wheel stands outside of, at its face; a wheel that met a face
       this step takes nothing above `stepUp` (the probe begins 32 cm above each wheel: from a wheel at the Pad's face it took the Pad's top, 20
       cm up, and set the board onto it — and bounds by height or by slope refused a slow board the curve it rolled on, its front pair 3 cm in) */
    const faceStep = (i, q) => { if (this._blocked && this._blocked[i]) return true;
      const wl = this._wheelLine[i], hgt = V.dot(V.sub([0, 0, 0], q, wl), up), h = this.world.bvh.raycast(wl, up, hgt + 0.01, true);
      return !(h && h.surf !== 'fence' && V.dot(h.face, up) > 0); };
    let n = 0, front = 0, sx = 0, sy = 0, sz = 0, nx = 0, ny = 0, nz = 0, surf = null;
    const at = this._wheelAt || (this._wheelAt = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]), got = [false, false, false, false], nrm = this._wheelN || (this._wheelN = [[0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]]);
    for (let i = 0; i < 4; i++) {
      const fs = i < 2 ? 1 : -1, ss = i % 2 ? 1 : -1;
      const o = [this.p[0] + fwd[0] * hw * fs + side[0] * ht * ss + up[0] * PH.probeUp, this.p[1] + fwd[1] * hw * fs + side[1] * ht * ss + up[1] * PH.probeUp, this.p[2] + fwd[2] * hw * fs + side[2] * ht * ss + up[2] * PH.probeUp];
      const wl = (this._wheelLine || (this._wheelLine = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]))[i]; wl[0] = o[0] - up[0] * PH.probeUp; wl[1] = o[1] - up[1] * PH.probeUp; wl[2] = o[2] - up[2] * PH.probeUp;
      const h = this.world.bvh.raycast(o, ray, reach);
      /* a wheel touches only ground within 5 cm of its line: lower, it is over a drop (10-16: found 20 cm down past the Pad's end, the front
         wheels "touched" the ground under it — the old mean of the normals stepped the board's middle down 10 cm at once) */
      /* (ground within 70° of the deck: at a bowl's rim the front pair, past the coping, stands on the deck 67° from it — at 60° that deck was no
         ground and they sank 1.3 cm into it for 33 steps; a face steeper than 60° in the board's way is rollOn's wall before it is anyone's ground) */
      if (h && V.dot(h.normal, up) > 0.34 && h.t <= PH.probeUp + PH.touch && !(h.t < PH.probeUp - PH.stepUp && faceStep(i, h.point))) { n++; if (fs > 0 === !this.movingBack()) front++; sx += h.point[0]; sy += h.point[1]; sz += h.point[2]; nx += h.normal[0]; ny += h.normal[1]; nz += h.normal[2]; surf = h.surf; V.copy(at[i], h.point); V.copy(nrm[i], h.normal); got[i] = true; }
    }
    /* THE PLANE THROUGH THE WHEELS' CONTACTS, not the mean of the normals under them (10-16, the supervisor's T2: at the Sun Bank's seam the
       mean swung halfway the step the front pair crossed — 12.5° in a step, 750°/s — and halfway again when the back pair did; the plane
       through the points turns as they cross, over the wheelbase's travel: the references' 4-raycast board). Four: the diagonals' normal;
       three: their plane; fewer, or in a line: the mean of the normals */
    /* ...and on twisted ground (four contacts in no one plane) the plane it STANDS on: three of them, the fourth wheel off its ground
       (formulas/contact.js support — the diagonals' plane had left two wheels in the ground: 4.2 cm in the slab across the Deck Quarter's crease) */
    let sup = support(at, got, up), plane = sup && V.dot(sup.n, up) > 0.5 ? sup.n : null;
    const moving = V.len(this.v) > 0.2, speed = V.len(this.v);
    /* THE ROLL-IN (10-16, the supervisor's calls (A) and per lip): the leading pair past a coping into its ramp. Below the LIP'S OWN `vStar` —
       the speed under which a board rolled over that lip holds every gate of its own and its rider's, measured lip by lip (tests/vstar.mjs,
       DESIGN §4.5; the park's data, sim/park.js) — the board ROLLS over it: the leading pair turned down onto the wall, the vert assist's
       hold (lowerOnto), the trucks crossing one after the other at the board's own speed, its deck on the coping between them (the
       high-centre, below). At it and over, it DROPS IN: on as it is until its middle is past, then a short air off the coping onto the wall
       (stepAir). Over the park's 65–76° lips a rigid board's pitch steps twice at every speed (onto the wall, onto the coping), so their
       `vStar` is 0 and every run drops in, as a skater drops in on a steep lip. With no vert assist (Raw) it rolls off and flies as it would
       off any edge, and lands as it flew */
    const lead = this.movingBack() ? 2 : 0; this.dropping = null;
    if (this.crossing && !this.copingCrossed()) { this.events.push({ type: 'rolledIn', p: this.p.slice(), up: this.up.slice(), fwd: this.fwd.slice() }); this.crossing = null; }
    let rolled = !!this.crossing;
    /* (the contacts counted again from what is kept — the points' and normals' sums too: their mean seats a board on fewer than three) */
    const recount = () => { n = 0; sx = sy = sz = nx = ny = nz = 0;
      for (let i = 0; i < 4; i++) if (got[i]) { n++; sx += at[i][0]; sy += at[i][1]; sz += at[i][2]; nx += nrm[i][0]; ny += nrm[i][1]; nz += nrm[i][2]; }
      front = (got[lead] ? 1 : 0) + (got[lead + 1] ? 1 : 0); sup = support(at, got, this.up); plane = sup && V.dot(sup.n, this.up) > 0.5 ? sup.n : null; };
    /* A WHEEL PAST A CONVEX EDGE IS OVER THE DROP (10-16): while the board's middle sits on the face it rides, a wheel whose ground stands more
       than a centimetre under that face's plane at the middle is past a convex edge — it touches nothing yet, and the board rolls on its other
       wheels and its middle until its middle passes the edge, as a roll-off does (up a ramp's last metre, a wheel past the lip found the deck
       beyond it 66° off the ramp: the plane through it bent the board over the lip faster than gravity holds it, it was flown and landed back
       the same step on the ramp its middle never left — lip and land every step, 1.4 cm a step off its path; the same over the Spine's ridge) */
    if (n >= 3 && moving) {
      const mh = this.world.bvh.raycast([this.p[0] + up[0] * PH.probeUp, this.p[1] + up[1] * PH.probeUp, this.p[2] + up[2] * PH.probeUp], ray, PH.probeUp + PH.touch);
      if (mh && mh.surf !== 'fence' && V.dot(mh.normal, up) > Math.cos(5 * DEG)) { const mp = mh.point.slice(), mn = mh.normal.slice(); let dropped = false;
        for (let i = 0; i < 4; i++) if (got[i] && (at[i][0] - mp[0]) * mn[0] + (at[i][1] - mp[1]) * mn[1] + (at[i][2] - mp[2]) * mn[2] < -0.01) { got[i] = false; dropped = true; }
        if (dropped) recount(); }
    }
    /* (from its deck: the board level on the deck behind the coping — a board come down from an air onto the wall below the lip is on its ramp
       already: 10-16, landed fakie on the Lawn Quarter's wall below its lip, a board was taken for one dropping in and flown off the wall) */
    if (moving && this.state === 'roll' && this.assist.vert > 0 && (this.crossing || up[1] >= DECK_UP)) {
      const cr = this.crossing ? null : this.copingCrossed();
      if (this.crossing) { if (!got[lead] && !got[lead + 1] && this.lowerOnto(at, got, lead)) recount(); }
      else if (cr && cr.x > 0 && cr.lip != null) {
        if (speed < (cr.rail.vStar || 0)) {
          /* rolling over it: its leading pair on the wall — where its probes found the wall, or turned down onto it */
          if (got[lead] || got[lead + 1] || this.lowerOnto(at, got, lead)) {
            rolled = true; recount(); surf = surf || 'ramp';
            this.crossing = { rail: cr.rail, t0: this.t }; this.events.push({ type: 'rollIn', speed, lip: cr.lip / DEG, E: cr.E.slice(), ax: cr.ax.slice(), rail: cr.rail.id });
          }
        } else {
          /* dropping in: what its leading pair finds of the wall is not its ground — it goes on as it is until its middle is past */
          this.dropping = cr; got[lead] = false; got[lead + 1] = false; recount();
        }
      }
    }
    /* THE HIGH-CENTRE (formulas/edge.js): an edge of the park through the deck on the plane the wheels make holds the board on the edge and the
       pair on the side its weight is on */
    /* (a board on one pair whose middle sits on the face it rides is carried by its middle: only an edge IN its underside holds it — the reach
       below it is for a pair alone, its middle over nothing; 10-16, rolled fakie up the Spine with its upper pair past the ridge, it was
       lowered 1.8 cm onto the ridge under its own plane, flown by that bend and landed back the same step) */
    const midFace = !plane && n > 0 && n < 3 ? this.world.bvh.raycast([this.p[0] + up[0] * PH.probeUp, this.p[1] + up[1] * PH.probeUp, this.p[2] + up[2] * PH.probeUp], ray, PH.probeUp + PH.touch) : null;
    const hold = this.edgeHold(at, got, plane ? sup : null, midFace && midFace.surf !== 'fence' && V.dot(midFace.normal, up) > Math.cos(5 * DEG) ? 0 : null);
    let midOn = null;
    if (!hold && n < 3 && moving && front < 2) {
      /* the ground fell away ahead — rolling off an edge, or out of the top of a ramp: while its middle is still over the ground it rolls on,
         on the wheels that touch and its middle; past it, it flies off with its own velocity (DESIGN §physics: a roll-off into the air at a
         ledge's end — 10-16: gone the step its front wheels passed the Pad's end, it was landed back on the Pad its middle still stood over, and
         flickered roll / air every step: a pop met in an air step was refused). Out of a ramp the same (10-16: let go the step its front pair
         passed a bowl's rim, its middle and back pair still on the transition, a slow board flew straight into the curve it was leaving and
         was landed on it again — a takeoff and a landing every step) */
      const mid = n > 0 ? this.world.bvh.raycast([this.p[0] + up[0] * PH.probeUp, this.p[1] + up[1] * PH.probeUp, this.p[2] + up[2] * PH.probeUp], ray, PH.probeUp + PH.touch) : null;
      if (!mid || V.dot(mid.normal, up) <= 0.5) return this.dropping ? 'dropin' : up[1] < 0.6 && V.dot(this.v, Y) > 0 ? 'lip' : 'off';
      midOn = mid.point.slice();   // (raycast answers in one shared object)
    }
    this.contacts = n;   // how many wheels stood on the ground this step (read by the tests: a wheel coming into its window must not step the board)
    if (n === 0) return this.dropping ? 'dropin' : 'off';
    /* on two wheels and its middle: the plane through the three (a mean of two normals is a curve's at two points: under a bowl's rim it held
       the middle 2 cm into the transition) */
    let newUp = hold ? V.copy(S[8], hold.n) : plane ? V.copy(S[8], plane) : V.norm(S[8], V.set(S[8], nx, ny, nz));
    /* ON TWO WHEELS (10-17, the supervisor's ruling 2: "the board's support is found from ONE face while the board spans two"): the plane through
       the two and its middle's own ground, whenever the middle has one — at rest or rolling; with none under its middle, the plane of the two
       contacts' line nearest the board's own attitude (it pivots on them). Never the mean of their two faces' normals: across a lip, a wheel
       on the deck and one on the ramp tilted the board halfway to the ramp and sank its deck wheel 2–4 cm in (the support sweep: 364 seats) */
    if (!hold && !plane && n === 2) {
      const k = [0, 1, 2, 3].filter((i) => got[i]), mg = midOn || (() => { const m = this.world.bvh.raycast([this.p[0] + up[0] * PH.probeUp, this.p[1] + up[1] * PH.probeUp, this.p[2] + up[2] * PH.probeUp], ray, PH.probeUp + PH.touch); return m && m.surf !== 'fence' && V.dot(m.normal, up) > 0.5 ? m.point.slice() : null; })();
      let c = null;
      if (mg) { const a = V.sub([0, 0, 0], at[k[0]], mg), b = V.sub([0, 0, 0], at[k[1]], mg); c = V.cross([0, 0, 0], a, b); const l = V.len(c); c = l > 1e-6 ? V.scale(c, c, (V.dot(c, up) < 0 ? -1 : 1) / l) : null; if (c && V.dot(c, up) <= 0.8) c = null; }
      if (!c) { const dl = V.sub([0, 0, 0], at[k[1]], at[k[0]]), dn = V.len(dl); if (dn > 1e-6) { V.scale(dl, dl, 1 / dn); c = V.norm([0, 0, 0], V.addScaled([0, 0, 0], up, dl, -V.dot(up, dl))); } }
      if (c) newUp = V.copy(S[8], c);
    }
    /* a convex bend faster than gravity can hold the board to it: it leaves the surface (rolling over a coping, the vert assist holds it) —
       never at a landing's own seat: there the contacts SET the board's attitude, they are no bend it follows (10-16: landed across the Sun
       Bank's foot, its wheels on the bank and the slab, it was seated as it flew, 2° off its four contacts' plane — the correction was called
       a convex bend at 5.6 m/s, refused, and the board held a centimetre under its own contacts for a step) */
    const bend = V.sub(S[9], newUp, up);
    if (moving && !rolled && !this._seating && !this.settle && V.dot(bend, this.v) > 0) {
      const ang = Math.acos(V.clamp(V.dot(newUp, up), -1, 1)), ds = Math.max(1e-4, V.len(this.v) * PH.step), kappa = ang / ds;
      if (V.dot(this.v, this.v) * kappa > PH.gGround * Math.max(0.05, newUp[1]) + 0.5 && ang > 0.02) return this.dropping ? 'dropin' : up[1] < 0.6 && V.dot(this.v, Y) > 0 ? 'lip' : 'off';
    }
    /* the board sits on the plane its touching wheels make — its own place along that plane kept: the middle of the wheels that touch is the
       board's middle only when all four do (three at a lip's edge would drag it back half a wheelbase every step and hold it under the lip) */
    /* THE SEAT NEVER SETS (10-17, the supervisor's ruling 1 (A)): a landing meets its first face, then settles onto the face its contacts rest
       on at the rate they turn it — the wheel's speed into the face over its arm (half the wheelbase), with gravity's own tip about the
       touching axle (3g over twice the wheelbase, from the touch) — never in one step: the rest is carried into the next steps (this.settle:
       its rate, what is left), the board standing on its lowest wheel meanwhile. Set in one step, a bevel's first touch then the wall turned
       the board 22° in the landing's step (the Lawn Quarter), and the deck read 279°/s past its contacts (the Sun Bank) */
    /* (and a seat that goes the edge's HOLD settles the same way, turning about the hold's point — the board's plane kept through the edge it
       rests on, so the holding pair comes down onto its ground over the settle's steps; the supervisor, 10-17: "(A) IS NOT DONE UNTIL THE
       HOLD PATH SETTLES" — Raw's seat on the Basin's west wall turned 10.7° in a step, 4.2° settled) */
    const st = this.settle; let settling = false;
    if (st) {
      const need = Math.acos(V.clamp(V.dot(st.from, newUp), -1, 1)), most = (st.w + 1.5 * PH.gGround / PH.wheelbase * (this.t - st.t0)) * PH.step;
      if (need > most + 1e-6) { const ax = V.cross([0, 0, 0], st.from, newUp), al = V.len(ax);
        if (al > 1e-9) { V.norm(newUp, V.rotate([0, 0, 0], st.from, V.scale(ax, ax, 1 / al), most)); settling = true; st.left = need - most; } }
      if (!settling) this.settle = null;
    }
    const o = hold ? hold.o : plane ? sup.o : [sx / n, sy / n, sz / n], ox = this.p[0] - o[0], oy = this.p[1] - o[1], oz = this.p[2] - o[2];
    let off = ox * newUp[0] + oy * newUp[1] + oz * newUp[2];
    if (settling && !hold) { off = Infinity; for (let i = 0; i < 4; i++) if (got[i]) off = Math.min(off, (this.p[0] - at[i][0]) * newUp[0] + (this.p[1] - at[i][1]) * newUp[1] + (this.p[2] - at[i][2]) * newUp[2]); }
    V.set(this.p, this.p[0] - newUp[0] * off, this.p[1] - newUp[1] * off, this.p[2] - newUp[2] * off);
    V.copy(this.up, newUp);
    const sp = V.len(this.v); V.reject(this.v, this.v, this.up); const l = V.len(this.v); if (l > 1e-6) V.scale(this.v, this.v, sp / l);
    V.norm(this.fwd, V.reject(this.fwd, this.fwd, this.up));
    if (surf) this.surface = surf;
    /* THE SEAT READ WHERE THE WHEELS ARE (10-17, the supervisor's ruling 2): the contacts were read where the wheels stood before this seat
       turned the board about its middle; turned more than a half degree, each wheel stands off the point its ground was read at (on the
       Terrace's steps, 24° moved the front pair 4.5 cm and seated it 2 cm inside the next step) — the seat is read again where they are, to
       its own fixed point (at most twice more) */
    if (!this._reseat && Math.acos(V.clamp(V.dot(this.up, up0), -1, 1)) > 0.5 * DEG) { this._reseat = (this._reseat || 0) + 1; let r = 'ok';
      for (let k = 0; k < 2 && r === 'ok'; k++) { const u1 = this.up.slice(); r = this.attach(); if (Math.acos(V.clamp(V.dot(this.up, u1), -1, 1)) <= 0.5 * DEG) break; }
      this._reseat = 0; return r; }
    return 'ok';
  }
  /* THE COPING THE BOARD IS ROLLING OVER INTO ITS RAMP: a coping with a deck behind it (sim/park.js — a quarter's, the Basin's rim; not the
     Spine's ridge, two walls and no deck: over it a board flies, and its deck meets the ridge as an edge — the high-centre) whose line crosses
     the board's own between its axles, its ramp on the side the board rolls toward. → { E (the crossing, on the coping's line), ax (along the
     coping), x (its place from the leading axle, 0, to the trailing, 1), lip (the wall's own angle there, rad), rail } */
  copingCrossed(p = this.p, fwd = this.fwd) {
    const t = this.movingBack() ? -1 : 1, hw = PH.wheelbase / 2, F = V.addScaled([0, 0, 0], p, fwd, hw * t), B = V.addScaled([0, 0, 0], p, fwd, -hw * t);
    let best = null;
    for (const [ri, i] of this.world.railsNear(p)) {
      const r = this.world.rails[ri]; if (r.kind !== 'coping' || r.spine) continue;
      const c = closestOnSegments(F, B, r.pts[i], r.pts[i + 1]); if (c.d > 0.15) continue;
      const inward = r.inwardOf ? r.inwardOf[i] : r.inward;   // toward the coping's deck
      if ((fwd[0] * inward[0] + fwd[2] * inward[2]) * t >= 0) continue;   // out of the ramp onto its deck: not over it into the ramp
      if (!best || c.d < best.d) best = { E: c.q, ax: V.norm([0, 0, 0], V.sub([0, 0, 0], r.pts[i + 1], r.pts[i])), x: c.s, d: c.d, rail: r };
    }
    if (best) best.lip = this.lipOf(best.rail);
    return best;
  }
  /* the wall's own angle at a coping's lip (sim/park.js: its transition's profile), from the park's data — and the attitude a board has on it
     with its trailing axle on the coping, the wheelbase's chord down its curve (`end`: what the rider leans for, rolling over) */
  lipOf(rail, end = false) {
    const m = this._lips || (this._lips = new Map());
    if (!m.has(rail.id)) { const L = this.world.lips.find((q) => q.id === rail.id || String(q.id).startsWith(rail.id + ':'));
      m.set(rail.id, L ? { lip: L.lipDeg * DEG, end: L.lipDeg * DEG - (L.r ? Math.asin(Math.min(1, PH.wheelbase / (2 * L.r))) : 0) } : null); }
    const q = m.get(rail.id); return q ? (end ? q.end : q.lip) : null;
  }
  /* THE ROLLED CROSSING: the leading pair past the coping turned down about the trailing pair's line until it stands on the wall below it (the
     vert assist's hold — a board left to gravity flies off a 75° wall and falls: off the Basin's rim at 3 m/s, 1.8 m to its floor at 5.9 m/s).
     Its contacts set where it now stands, the board turned there; false if the trailing pair is not on the ground or nothing is under the lead */
  lowerOnto(at, got, lead) {
    const tr = 2 - lead; if (!got[tr] || !got[tr + 1]) return false;
    const A = at[tr].slice(), ax = V.norm([0, 0, 0], V.sub([0, 0, 0], at[tr + 1], A)), up = this.up.slice(), fwd = this.fwd.slice(), p = this.p.slice(), W = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const cast = (w, u) => { const h = this.world.bvh.raycast([w[0] + u[0] * PH.probeUp, w[1] + u[1] * PH.probeUp, w[2] + u[2] * PH.probeUp], [-u[0], -u[1], -u[2]], PH.probeUp + 2 * PH.probeDown);
      return h && h.surf !== 'fence' && V.dot(h.normal, u) > 0 ? { point: h.point.slice(), normal: h.normal.slice(), surf: h.surf } : null; };
    for (let it = 0; it < 6; it++) {
      this.wheelsOn(p, up, fwd, W); let th = null;
      for (let k = 0; k < 2; k++) {
        const w = W[lead + k], h = cast(w, up); if (!h) continue;
        /* the turn about the line (A, ax) that puts this wheel on the face's plane there: r(θ) = r cos θ + (ax × r) sin θ + ax (ax·r)(1 − cos θ) */
        const r = V.sub([0, 0, 0], w, A), n = h.normal, axr = V.cross([0, 0, 0], ax, r), kk = V.dot(ax, r), na = V.dot(n, ax);
        const a0 = V.dot(n, r) - na * kk, b0 = V.dot(n, axr), H = V.dot(n, V.sub([0, 0, 0], h.point, A)) - na * kk, M = Math.hypot(a0, b0);
        if (M < 1e-9 || Math.abs(H) > M) continue;
        const ph = Math.atan2(b0, a0), c = Math.acos(V.clamp(H / M, -1, 1)), down = V.dot(axr, up) < 0 ? 1 : -1;   // θ·down > 0: the leading end goes down
        /* the leading end down — a hair back allowed once it is there (the wall's curve: a turn onto its plane at one point overshoots a curve by
           a hair, and the next turn takes that back) */
        const cand = [V.wrapRad(ph + c), V.wrapRad(ph - c)].filter((q) => q * down > (it ? -0.05 : -1e-9) && Math.abs(q) < Math.PI / 2).sort((x, y) => Math.abs(x) - Math.abs(y))[0];
        if (cand != null && (th === null || Math.abs(cand) < Math.abs(th))) th = cand;   // the first of the two to touch
      }
      if (th === null) return false;
      V.norm(up, V.rotate(up, up, ax, th)); V.rotate(fwd, fwd, ax, th); V.norm(fwd, V.reject(fwd, fwd, up));
      const rp = V.sub([0, 0, 0], p, A); V.rotate(rp, rp, ax, th); V.add(p, A, rp);
      if (Math.abs(th) < 1e-6) break;
    }
    this.wheelsOn(p, up, fwd, W);
    const hs = [cast(W[lead], up), cast(W[lead + 1], up)]; if (!hs[0] && !hs[1]) return false;
    for (let k = 0; k < 2; k++) if (hs[k]) { V.copy(at[lead + k], hs[k].point); if (this._wheelN) V.copy(this._wheelN[lead + k], hs[k].normal); got[lead + k] = true; }
    V.copy(this.p, p); V.copy(this.up, up); V.copy(this.fwd, fwd);
    return true;
  }
  /* THE HIGH-CENTRE (formulas/edge.js): an edge of the park up through the deck on the plane its wheels make — or, with one pair alone on the
     ground, within `touch` of the deck as it stands — holds the board on the edge and the pair on the side its weight is on (its middle; or,
     leaning into a drop, ahead of it): it rests there, tipped toward its weight, and leaves the edge when its weight is past it (10-16, the
     supervisor: "The board then rests on the edge at the contact, tips toward the side its middle is on, and leaves it when the middle is
     past"). → { n, o, edge } or null */
  edgeHold(at, got, sup, lo = null) {
    const n0 = sup ? sup.n : this.up, pm = sup ? V.addScaled([0, 0, 0], this.p, n0, -V.dot(V.sub([0, 0, 0], this.p, sup.o), n0)) : this.p, f = V.norm([0, 0, 0], V.reject([0, 0, 0], this.fwd, n0));
    const hc = this.edgeThrough(pm, n0, f, lo != null ? lo : sup ? 0 : -PH.touch, true);
    if (!hc) return null;
    const a = hc.s > this.weightAt() ? 2 : 0;   // the edge ahead of the weight: the back pair holds it; behind it, the front
    if (!got[a] || !got[a + 1]) return null;
    const rs = restOn(at[a], at[a + 1], hc.point, hc.h, n0);
    return rs && V.dot(rs.n, this.up) > 0.5 ? Object.assign(rs, { edge: hc }) : null;
  }
  /* where the board's weight is along it from its middle (+: toward its nose): the middle — and leaning into a drop, the rider's lean ahead of
     it (the hips 0.92 m up the body, turned toward the drop by the lean: view/skater.js) */
  weightAt() {
    const a = this.ahead; if (!a || !(a.ang > 0)) return 0;
    return (this.movingBack() ? -1 : 1) * Math.min(PH.wheelbase, 0.92 * Math.sin(Math.min(a.ang, Math.PI / 2)));
  }
  /* THE RIDER LEANS INTO A DROP BEFORE ITS EDGE (10-16, the supervisor's call (A): "the rider leans BEFORE the edge with a look-ahead trigger"):
     a coping within `dropIn.ahead` seconds of the leading axle, its ramp beyond — the turn the board will make over it (the wall's angle at the
     lip) taken in over the last wheelbase of that reach and held while the board goes over: what the body's attitude reaches for (view/skater.js:
     the trunk on its own capped spring) — never more than `dropIn.lean` ahead of the board, inside the body's own tilt (LEGS.tilt: past it the
     body is held to the board, and its turn steps) — and what puts the rider's weight ahead of the board's middle (weightAt). → { ax, ang }
     (about the board's side, + its nose down; ang the turn still to come, to that most), or null */
  leanAhead() {
    const sp = V.len(this.v); if (this.state !== 'roll' || sp < 0.5) return null;
    const t = this.movingBack() ? -1 : 1, dir = V.scale([0, 0, 0], this.fwd, t), hw = PH.wheelbase / 2, reach = sp * PH.dropIn.ahead;
    const B = V.addScaled([0, 0, 0], this.p, dir, -hw), G = V.addScaled([0, 0, 0], this.p, dir, hw + reach), len = PH.wheelbase + reach;
    let best = null; const seen = new Set();
    for (const q of [this.p, G]) for (const [ri, i] of this.world.railsNear(q)) {
      const key = ri + ':' + i; if (seen.has(key)) continue; seen.add(key);
      const r = this.world.rails[ri]; if (r.kind !== 'coping' || r.spine) continue;
      const c = closestOnSegments(B, G, r.pts[i], r.pts[i + 1]); if (c.d > 0.15) continue;
      const inward = r.inwardOf ? r.inwardOf[i] : r.inward;
      if ((dir[0] * inward[0] + dir[2] * inward[2]) >= 0) continue;
      const ahead = c.s * len - PH.wheelbase;   // from the leading axle to the edge (− : between the axles)
      if (!best || ahead < best.ahead) best = { ahead, rail: r };
    }
    if (!best) return null;
    const lip = this.lipOf(best.rail, true); if (lip == null) return null;   // the attitude it will have on the wall as its trailing pair leaves the coping
    const ax = V.norm([0, 0, 0], V.cross([0, 0, 0], this.up, dir)), pitch = Math.atan2(V.dot(V.cross([0, 0, 0], Y, this.up), ax), V.dot(Y, this.up));
    const k = V.smooth(V.clamp((reach - best.ahead) / PH.wheelbase, 0, 1));
    return { ax, ang: Math.min(PH.dropIn.lean, k * lip - Math.max(0, pitch)) };
  }
  movingBack() { return V.dot(this.v, this.fwd) < 0; }
  /* walls: a low sphere (the board and feet) and a high one (the body) against anything that stands up from the surface ridden — A STOP ON ITS
     PATH, as in the air (wallsAir): the first moment of the step a sphere meets a wall along the step's own path (halved 12 times from where
     the step began) is where the board stops, a millimetre short; a sphere already against a wall as the step began is pushed back out as
     before (10-16: pushed out sideways by its depth, a board landed at the Deck Quarter's end moved 1.2 cm off its own path in a step, along
     no velocity it had) */
  walls(dt, before = null) {
    for (const s of [PH.body.low, PH.body.high]) {
      const pen = (p) => { const c = V.addScaled(S[10], p, this.up, s.h + s.r * 0.2); let n = null, worst = 0;
        this.world.bvh.sphere(c, s.r, (tri, q, d) => {
          const f = this.world.bvh.faceNormal(tri, S[11]);
          if (V.dot(f, this.up) > 0.55 || this.world.bvh.surf[tri] === 'ramp' && V.dot(f, this.up) > 0.2) return;   // the surface itself, or a ramp ahead (ridden, not hit)
          const pe = s.r - d; if (pe > worst) { worst = pe; n = f.slice(); }
        });
        return { worst, n }; };
      const end = pen(this.p); let hitN = end.n, worst = end.worst, rest = null;
      if (hitN) {
        const start = before ? pen(before) : null;
        if (start && start.worst <= 0) {
          const q = [0, 0, 0]; let lo = 0, hi = 1;
          for (let it = 0; it < 12; it++) { const m = (lo + hi) / 2; V.lerp(q, before, this.p, m); const r = pen(q); if (r.worst > 0) { hi = m; hitN = r.n; } else lo = m; }
          const L = V.len(V.sub(q, this.p, before)), k = L > 1e-9 ? Math.max(0, lo - 0.001 / L) : 0;
          rest = this.p.slice(); V.lerp(this.p, before, this.p, k); V.sub(rest, rest, this.p); worst = 0;
        }
        hitN[1] = 0; const l = Math.hypot(hitN[0], hitN[2]); if (l < 1e-6) { if (rest) this.noteDropped(V.len(rest), 'the walls (a level face)'); continue; } hitN[0] /= l; hitN[2] /= l;   // (said: the census, row 13)
        /* COLLIDE AND SLIDE (10-17; Fauerby 2003, the character controller's slide move): stopped on its path at the face, the board goes the
           rest of the step ALONG it — the step's remainder on the line the face and the ground share — to where that meets something, a
           millimetre short. Stopped and left there, a board running into the East Deck's fence at a slant lost most of a step of its run along
           the fence and made it up the next: the drawn deck took 1.1 cm and gave it back (F1, on Raw) */
        if (rest) {
          const t = V.cross([0, 0, 0], hitN, this.up), tl = V.len(t);
          if (tl > 1e-6) {
            const along = V.dot(rest, t) / (tl * tl), go = V.scale([0, 0, 0], t, along), gl = V.len(go);
            if (gl > 1e-5) {
              const from = this.p.slice(), to = V.add([0, 0, 0], from, go);
              if (pen(to).worst <= 0) V.copy(this.p, to);
              else { let lo = 0, hi = 1; const q = [0, 0, 0]; for (let it = 0; it < 12; it++) { const m = (lo + hi) / 2; V.lerp(q, from, to, m); if (pen(q).worst > 0) hi = m; else lo = m; }
                const k2 = Math.max(0, lo - 0.001 / gl); V.lerp(this.p, from, to, k2); this.noteDropped(gl * (1 - k2), 'the walls'); }
              if (this._own) this._own.push([from, this.p.slice()]);
            }
          }
        }
        /* (a contact already there as the step began — a landing set the body by a wall, the air's sphere standing straight up and the ground's
           along the board — is corrected a share a step, never all at once: Baumgarte's position correction, Box2D's β (Erin Catto). Pushed
           out whole, a board landed on the Deck Quarter's 57° wall by the fence moved 1.2 cm off its path in a step) */
        if (worst > 0) V.addScaled(this.p, this.p, hitN, WALL_BETA * worst);
        const vn = V.dot(this.v, hitN);
        if (vn < 0) {
          if (-vn > (s === PH.body.low ? PH.body.lowBailSpeed : PH.body.bailSpeed)) { this.toBail('wall', -vn); return; }
          V.addScaled(this.v, this.v, hitN, -vn * 1.05);
          this.events.push({ type: 'scrape', speed: -vn });
        }
      }
    }
  }

  /* ---------------- the pop ---------------- */
  pop(e) {
    const A = this.assist, apex = A.streamlined ? PH.popApex[1] : PH.popApex[0] + (PH.popApex[1] - PH.popApex[0]) * ((e.spd || 3) - 1) / 4;
    const vy = Math.sqrt(2 * PH.gAir * apex * (1 + PH.popLoadBonus * (e.load || 0)));
    const d = V.norm(S[0], V.lerp(S[0], Y, this.up, PH.popTilt));
    const fromManual = this.state === 'manual';
    if (fromManual) this.endManual(true);            // manual → pop is the standard link: the manual counts
    /* the board's speed into the pop keeps its along-surface part; the pop adds along d */
    V.addScaled(this.v, this.v, d, vy);   // no lift: the pop's speed carries the board clear in its first step (10-16: lifted 2 cm in one, it jumped at every ollie)
    this.stats.pops++;
    this.events.push({ type: 'pop', nollie: !!e.nollie, surf: this.surface });
    this.toAir('pop', e);
  }
  toAir(why, popEvent) {
    const drop = why === 'dropin' ? this.dropping : null; this.crossing = null; this.dropping = null; this.ahead = null; this.catchTurn = null;   // (a pop over a coping: the air takes it from there)
    if (this.state === 'manual') this.endManual(true);   // rolled off an edge in a manual: it ends there, and counts
    const fromRamp = this.surface === 'ramp' && this.up[1] < 0.75;
    this.state = 'air';
    this.lastAirWasRamp = fromRamp || why === 'lip';
    const lipN = [this.up[0], 0, this.up[2]]; const ln = Math.hypot(lipN[0], lipN[2]);
    this.air = {
      t0: this.t, why, from: this.p.slice(), fromY: this.p[1], fromSurf: this.surface, maxY: this.p[1], vert: why === 'lip' && ln > 0.5, lipN: ln > 1e-6 ? [lipN[0] / ln, 0, lipN[2] / ln] : [0, 0, 0],
      lipTop: why === 'lip' ? this.p[1] : null, lipId: why === 'lip' ? this.nearestLip() : null,
      nollie: popEvent ? !!popEvent.nollie : false, popped: !!popEvent, awaiting: !!popEvent, trick: popEvent ? { name: popEvent.nollie ? 'Nollie' : 'Ollie', flip: 0, shove: 0, dur: 0.3, prog: 1, acc: popEvent.acc || 3, spd: popEvent.spd || 3, base: popEvent.nollie ? 60 : 50 } : null,
      yaw0: Math.atan2(this.fwd[0], this.fwd[2]), spun: 0, grab: null, grabs: [], fakie0: this.fakie, switch0: this.switch, rail: null, upTarget: this.up.slice(),
    };
    /* THE DROP-IN (10-16, the supervisor's call (A)): off a coping too fast to roll over it — its path to be turned down toward the wall (about
       the line across its travel), and its up toward the wall's own at the lip until a landing is in sight (stepAir) */
    if (drop) { const vh = V.norm([0, 0, 0], [this.v[0], 0, this.v[2]]), ax = V.norm([0, 0, 0], V.cross([0, 0, 0], Y, vh));
      this.air.drop = { ax, lip: drop.lip, rail: drop.rail.id, E: drop.E.slice(), clear: false }; V.norm(this.air.upTarget, V.rotate([0, 0, 0], Y, ax, drop.lip)); }
    this.spinRate = 0;
    this.air.quiet = why === 'rolloff';           // a roll-off is said only once it has lasted (a bump over an edge is not an air); a drop-in at once
    if (why !== 'pop' && !this.air.quiet) this.events.push(drop ? { type: 'takeoff', why, speed: V.len(this.v), rail: drop.rail.id } : { type: 'takeoff', why });
    if (!this.air.quiet) this.stats.airs++;
  }
  nearestLip() {
    let best = null, bd = 3.0;
    for (const L of this.world.lips) {
      if (L.kind === 'quarter') { const d = segDist2(this.p, L.a, L.b); if (d < bd) { bd = d; best = L.id; } }
      else for (let i = 0; i + 1 < L.rim.length; i++) { const d = segDist2(this.p, L.rim[i], L.rim[i + 1]); if (d < bd) { bd = d; best = L.id; } }
    }
    return best;
  }
  /* the special: the air's flick becomes its family's special (kick side, heel side, a shove), at once and in full */
  special() {
    const tr = this.air.trick, SP = TRICKS.specials, fam = tr.flip < 0 ? SP.kick : tr.flip > 0 ? SP.heel : SP.shove;
    this.air.trick = { name: fam.name, base: fam.base, flip: fam.flip, shove: fam.shove, dur: 0.42, prog: 0, acc: tr.acc, spd: tr.spd, start: this.t, special: true };
    this.air.special = true; this.stats.flips++;
    this.events.push({ type: 'flick', name: fam.name, special: true });
  }
  setTrick(e) {
    const def = TRICKS.flips.find((f) => f.name === e.name) || TRICKS.flips[0];
    let name = def.name, base = def.base, flip = def.flip, shove = def.shove;
    if (!this.assist.streamlined && e.spd >= 5 && (e.len || 0) >= TRICKS.doubleLen && TRICKS.doubles[name]) { const dd = TRICKS.doubles[name]; name = dd.name; base = dd.base; if (flip) flip *= 2; else shove *= 2; }
    if (this.air.nollie && name !== 'Ollie') name = 'Nollie ' + name; else if (this.air.nollie) name = 'Nollie';
    const ft = TRICKS.flipTime, g = (e.spd || 3), turnT = g <= 3 ? ft[0] + (ft[1] - ft[0]) * (g - 1) / 2 : ft[1] + (ft[2] - ft[1]) * (g - 3) / 2;
    const turns = Math.max(Math.abs(flip), Math.abs(shove) * 1.3, 0);
    this.air.trick = { name, base, flip, shove, dur: turns ? turnT * Math.max(1, turns) : 0.25, prog: turns ? 0 : 1, acc: e.acc || 3, spd: g, start: this.t };
    this.air.awaiting = false;
    if (turns) this.stats.flips++;
    this.events.push({ type: 'flick', name, acc: e.acc, spd: e.spd });
  }
  startGrab(dir) {
    const g = TRICKS.grabs.reduce((b, x) => (Math.abs(V.wrapDeg(x.dir - dir)) < Math.abs(V.wrapDeg(b.dir - dir)) ? x : b));
    this.air.grab = { name: g.name, base: g.base, t0: this.t };
    this.events.push({ type: 'grab', name: g.name });
  }
  endGrab() { if (this.air && this.air.grab) { const gr = this.air.grab; gr.held = this.t - gr.t0; this.air.grabs.push(gr); this.air.grab = null; } }

  /* ---------------- AIR ---------------- */
  stepAir(dt, input) {
    this.wheelsOut();   // a wheel that begins the step inside a solid is brought out first (a sweep from inside meets no face)
    const A = this.assist, air = this.air, f0 = { p: this.p.slice(), up: this.up.slice(), fwd: this.fwd.slice() };   // the board at the step's start: where each wheel's sweep begins
    this.v[1] -= PH.gAir * dt;
    V.addScaled(this.v, this.v, this.v, -PH.drag * 0.5 * V.len(this.v) * dt);
    /* the vert assist: in the first moments of an air out of a ramp, the speed toward the deck is taken away so it comes back down in */
    if (air.vert && this.t - air.t0 < PH.vert.window) {
      const out = -V.dot(this.v, air.lipN);
      if (out > 0) V.addScaled(this.v, this.v, air.lipN, out * (A.vert / 100) * Math.min(1, dt / PH.vert.window) * 6);
    }
    /* ... and what it drifted out while that went, it drifts back: it comes down `inset` inside the lip, on the wall it went up (10-16: out of
       the Basin's west wall at 9 m/s it drifted 6 cm out in the first 0.2 s, came down on the deck behind the coping and took a 5.6 m/s
       landing on flat — 215 m/s² at the hips) — the speed in that lands it there, eased toward at the assist's own rate */
    if (air.vert && A.vert > 0) {
      const h = this.p[1] - air.lipTop, g = PH.gAir, back = (this.v[1] + Math.sqrt(Math.max(0, this.v[1] * this.v[1] + 2 * g * Math.max(0, h)))) / g;
      const outBy = -((this.p[0] - air.from[0]) * air.lipN[0] + (this.p[2] - air.from[2]) * air.lipN[2]);   // how far out over the deck from where it left
      if (back > 0.05) { const need = (outBy + PH.vert.inset) / back, now = V.dot(this.v, air.lipN), aIn = PH.vert.drift * A.vert / 100;
        V.addScaled(this.v, this.v, air.lipN, V.clamp(need - now, 0, aIn * dt)); }   // only ever inward
    }
    /* THE DROP-IN'S PATH (10-16, the supervisor's call (A)): turned down toward the wall at `dropIn.turn` rad/s at vert 100 (its speed kept), until
       it runs as steep as the wall's lip — so it comes down on the wall, rolling, and not on the floor 1.8 m below (V11's upright float: from the
       Basin's rim at 5 m/s, gravity alone lands it on the floor at 6 m/s) */
    /* ...once its tail is past the coping: until then the coping holds its tail up — it rides over it on its back wheels (edgeThrough) — and a
       path turned down would drag the tail through it (10-16: turned from the take-off, at 3 m/s the back truck went 2.3 cm into the coping's
       line, and on the Deck Quarter the back wheels into the deck behind it) */
    if (air.drop && !air.drop.clear) air.drop.clear = this.tailPast(this.p, this.fwd, this.v, air.drop);
    if (air.drop && air.drop.clear && A.vert > 0) this.turnDown(this.v, air.drop, PH.dropIn.turn * A.vert / 100, dt);
    /* spinning with the left thumb */
    const want = -(input.steer || 0) * PH.spin.rate * DEG;
    const ds = PH.spin.accel * DEG * dt; this.spinRate += V.clamp(want - this.spinRate, -ds, ds);
    if (Math.abs(this.spinRate) > 1e-4) { V.rotate(this.fwd, this.fwd, Y, this.spinRate * dt); air.spun += this.spinRate * dt; }
    /* the board levels toward the sky — or, out of a ramp, keeps the ramp's attitude so it lands back on it; the last 0.2 s lean toward the
       surface it will land on (the landing assist) */
    /* steered to a rail (steerToRail, last step), the surface it will land on is the rail: its up is the target (10-16: the path over a
       ledge's edge met the ledge's side, and the board banked 38° toward a wall it would never land on) */
    const railUp = air.railUp; air.railUp = null;
    const land = railUp ? { normal: railUp, t: air.railT } : this.predictLanding(0.3);
    /* (a landing first seen nearer than the quickest turn begins none: TURN_T) */
    const upLand = land && (air.upPlan || land.t >= TURN_T) ? land : null; air.upPlan = !!upLand;
    const target = upLand ? upLand.normal : air.vert || air.drop ? air.upTarget : Y;
    /* ...and it TURNS there, with its own angular velocity: a critically damped turn, timed by the landing's own time when there is one so
       it arrives as the wheels do (10-16: an exponential at 0.06 s toward the landing set off at ~600°/s from rest in a frame — the body
       riding it swung at up to 120 m/s²); toward the sky and the ramp, at the old exponentials' pace */
    /* ...a turn TIMED BY THE LANDING is PLANNED (10-17, the supervisor: one least-jerk law for the heading and the up — formulas/follow.js
       planned): from where it is to rest on the landing's normal as the wheels arrive, its acceleration carried through every re-plan and
       every new target. With no landing in view it eases toward the sky or the ramp on the old critically damped pace (ω 2.7 or 3.8) — no
       deadline, nothing to plan — and its acceleration is kept (−ω²u − 2ωu′), so the plan that follows begins where it is. (Planned there too,
       on a fixed horizon, ten Raw airs off the Basin and the Spine came down worse: sketchy → bail, clean → sketchy — measured, 10-17.) The
       board's offset from the target as a turn u (the board = the target turned by u), its rate and acceleration the board's own turn's */
    const ax = V.cross(S[12], this.up, target), sn = V.len(ax), ang = Math.atan2(sn, V.dot(this.up, target)), uw = air.upW || (air.upW = [0, 0, 0]), ua = air.upA || (air.upA = [0, 0, 0]);
    const e = sn > 1e-9 ? ang / sn : 0, s = { u: { x: -ax[0] * e, y: -ax[1] * e, z: -ax[2] * e }, ud: { x: uw[0], y: uw[1], z: uw[2] }, udd: { x: ua[0], y: ua[1], z: ua[2] }, v: { x: 0, y: 0, z: 0 } };
    if (upLand) planned(s, { x: 0, y: 0, z: 0 }, Math.max(1e-4, upLand.t), dt, TURN_A);
    else { const om = air.vert || air.drop ? 2.7 : 3.8; carry(second({ f: om / (2 * Math.PI), z: 1 }), s, s.v, dt); for (const k of ['x', 'y', 'z']) s.udd[k] = -om * om * s.u[k] - 2 * om * s.ud[k]; }
    uw[0] = s.ud.x; uw[1] = s.ud.y; uw[2] = s.ud.z; ua[0] = s.udd.x; ua[1] = s.udd.y; ua[2] = s.udd.z;
    const ul = Math.hypot(s.u.x, s.u.y, s.u.z);
    if (ul > 1e-9) V.norm(this.up, V.rotate(this.up, target, V.scale(S[13], [s.u.x, s.u.y, s.u.z], 1 / ul), ul)); else V.copy(this.up, target);
    V.norm(this.fwd, V.reject(this.fwd, this.fwd, this.up));
    /* dropping in, the rider leans on toward the attitude it lands in (the trunk's target: view/skater.js) */
    /* (about the drop's own axis, signed — taken about up × target, its axis turned over as the board's up passed the landing's, and the lean's
       rate with it) */
    if (air.drop) { const ax2 = air.drop.ax, s2 = V.dot(V.cross([0, 0, 0], this.up, target), ax2), c2 = V.dot(this.up, target); this.ahead = { ax: ax2.slice(), ang: V.clamp(Math.atan2(s2, c2), -PH.dropIn.lean, PH.dropIn.lean) }; }
    /* THE HEADING TURNS WITH THE PATH (10-16): the vert assist bends a slanted air's path back into the ramp, and the board kept pointing where
       the old path went — up the wall at θ: back on the wall 2θ off its line, on the deck past a curved rim or off a quarter's end 90° − θ
       off — and bailed: 22 of the slanted airs on Cruise, once the coping they left stopped catching them unasked (the coping's aim had been
       the only thing turning these boards). Toward the landing the board turns about its up toward the line it will ride, forward or fakie
       (the nearer), on the way down, by the up's own critically damped turn timed by the landing — the vert assist's share of the turn the
       board would need without it (Raw: none). The rider's own spin is his: while he turns the board, this waits. The spin assist's own
       straightening (what the landing would set within its window, judge) turns on the same spring on the way down, on every air — set in
       the landing's step (10-16, F1 on Classic: 25° there, the hips' turn 1,444°/s, the thigh 1,544) it was a step the body could not follow */
    /* ...and the drop-in's path, bent down the wall by the same assist (turnDown, at its vert), turns the heading by the same share (10-17: with
       none, a small drop-in whose path the assist bent 67° off its heading came down beyond the spin window, and bailed — r24's plain arc had
       read its line 29° off and turned it most of the way by chance: the landing's own velocity said the truth) */
    const bent = (air.vert || air.drop) && A.vert > 0;
    this.headToLanding((bent || A.spin > 0) && land && !railUp && this.v[1] < 0 && Math.abs(input.steer || 0) < 0.05 && Math.abs(this.spinRate) < 0.5 ? land : null, bent ? A.vert / 100 : 0, dt, A.spin);
    /* the trick in the air */
    const tr = air.trick;
    if (tr && tr.prog < 1) {
      tr.prog = Math.min(1, tr.prog + dt / tr.dur);
      if (A.catch > 0 && tr.prog < 1 && land) {
        const need = A.catch >= 100 ? 0.4 : A.catch >= 50 ? 0.7 : 0.9;
        if (tr.prog >= need) tr.prog = Math.min(1, tr.prog + dt / 0.12);
      }
      if (tr.prog >= 1) this.events.push({ type: 'catch' });
    }
    if (air.quiet && this.t - air.t0 > 0.1) { air.quiet = false; this.stats.airs++; this.events.push({ type: 'takeoff', why: air.why }); }
    const before = this.p.slice();
    moved(this.p, this.v, PH.gAir, dt);   // by the step's mean velocity (formulas/jump.js): the apex the design names
    V.copy(this._free || (this._free = [0, 0, 0]), this.p);   // the step's free end, before any contact (read by the tests: a contact's own move)
    if (this.p[1] > air.maxY) air.maxY = this.p[1];
    /* the rails */
    if (this.tryGrind(before, dt)) return;
    /* the wheels meet what they meet: the touchdown, a wall */
    if (this.wheelsInAir(f0, before)) return;
    /* ...and none ends the step inside a solid: the sweep backs off along the board's up, which a face beside the board is not under (10-16:
       flying over the Spine's ridge, a back wheel skimming its far face began its sweep inside it and went 1.9 cm in unseen) */
    this.wheelsOut();
    /* walls in the air (the body only) */
    this.wallsAir(before);
    if (this.p[1] < -20) { this.toBail('fell', 10); }
  }
  headToLanding(land, share, dt, spinWin = 0) {
    const air = this.air; let aim = 0;
    if (land && !air.headPlan && land.t < TURN_T) land = null;   // a landing first seen nearer than the quickest turn begins none (TURN_T)
    air.headPlan = !!land;
    if (land) {
      /* the landing's own travel: the velocity the landing guess's own flight arrives with (predictLanding — a drop-in's path turned down in it),
         never a second, plain arc (10-17: re-derived ballistic, a drop-in's line swung as its path bent, and the stiff spring chased it at
         up to 403 rad/s²; a rail's lock has no flight: its arc) */
      const vl = land.v || [this.v[0], this.v[1] - PH.gAir * land.t, this.v[2]], tp = V.reject([0, 0, 0], V.reject([0, 0, 0], vl, land.normal), this.up), L = V.len(tp);
      if (L > 1e-3) {
        V.scale(tp, tp, 1 / L);
        let phi = Math.atan2(V.dot(this.up, V.cross([0, 0, 0], this.fwd, tp)), V.clamp(V.dot(this.fwd, tp), -1, 1));
        if (Math.abs(phi) > Math.PI / 2) phi -= Math.sign(phi) * Math.PI;   // fakie, the nearer
        /* the turn it would need had the assist not turned it (what is left, and what the assist has turned), and the assist's share of that */
        const sum = air.headSum || 0; aim = share * (phi + sum) - sum;
        /* ...and what the spin assist would straighten at the touchdown (what is left within its window) is turned HERE, in the air, on the same
           spring timed by the landing — never set at the touchdown (10-16: on Classic a vert air's 40 % left, 25°, was set in the landing's step,
           the body lagging it 22° — the hips' own turn 1,444°/s) */
        /* ...its pull on the line whole across the window and fading to nothing over half a window past its edge: an aim that never steps
           (10-17, the coping reading: all or nothing at the edge, a roll-off air off the Basin's rim turned 19° toward its line, crossed the edge
           0.05 s from the touchdown and was aimed back at once — its heading reversed at 378 rad/s², the spring at its stiffest). The window's
           own reach is kept whole (faded inside it, a landing 35–45° off its line would have come down sketchy, not clean); a lip air's share
           keeps its aim on the line and never met the edge; a spin past the band is still its rider's alone */
        const off = Math.abs((1 - share) * (phi + sum)), k = spinWin > 0 ? V.clamp((1.5 * spinWin * DEG - off) / (0.5 * spinWin * DEG), 0, 1) : 0;
        if (k > 0) aim = aim + k * (phi - aim);
      }
    }
    /* THE TURN, PLANNED (10-17, the supervisor: "a minimum-jerk turn planned over the time to the landing, the heading and the up alike (one
       law)" — formulas/follow.js planned): from where it is (its offset from the aim, its rate, its acceleration) to rest on the aim at the
       landing; planned anew each step with its acceleration carried, so no re-plan, no new view of a landing and no new line ever steps it.
       A critically damped spring timed by the landing (ω = 6/t, to 40) front-loaded its turn: a 21° share 0.17 s out started at 305 rad/s²,
       where this plan needs 74 */
    /* ...AT A RIDER'S PACE (TURN_A): the share of the turn it makes by the landing, never a later deadline — a turn the landing cuts lands
       turning (10-17: a Classic transfer's landing came into view 0.04 s out, onto the Basin's coping; its 24° planned into that turned at 904
       rad/s², and given the time a rider needs, 0.11 s, the touchdown met it at 299°/s, 5° turned). With no landing in view — or one first
       seen nearer than TURN_T — it comes to rest where it is on the old pace (ω 10), its acceleration kept for the plan that follows */
    const h = { u: -aim, ud: air.headW || 0, udd: air.headA || 0, v: 0 };
    if (land) planned(h, 0, Math.max(1e-4, land.t), dt, TURN_A);
    else { carry(second({ f: 10 / (2 * Math.PI), z: 1 }), h, 0, dt); h.udd = -100 * h.u - 20 * h.ud; }
    const turn = h.u + aim; air.headW = h.ud; air.headA = h.udd;
    if (Math.abs(turn) > 1e-7) { V.norm(this.fwd, V.rotate(this.fwd, this.fwd, this.up, turn)); air.headSum = (air.headSum || 0) + turn; }
  }
  /* a drop-in's tail past the coping it dropped in over: its trailing wheels a wheel's radius beyond the coping's line, along its travel */
  tailPast(p, fwd, v, drop) {
    const vh = [v[0], 0, v[2]], l = Math.hypot(vh[0], vh[2]); if (l < 1e-6) return true;
    const t = V.dot(fwd, v) < 0 ? -1 : 1, hw = PH.wheelbase / 2, tail = [p[0] - fwd[0] * hw * t - drop.E[0], 0, p[2] - fwd[2] * hw * t - drop.E[2]];
    return (tail[0] * vh[0] + tail[2] * vh[2]) / l > WHEEL_R;
  }
  /* a drop-in's path turned down about its axis by w·dt, its speed kept, until it runs as steep as the wall's lip */
  turnDown(v, drop, w, dt) {
    const sp = V.len(v); if (sp < 1e-6) return;
    const below = Math.asin(V.clamp(-v[1] / sp, -1, 1)), turn = Math.min(w * dt, drop.lip - below);
    if (turn > 0) V.rotate(v, v, drop.ax, turn);
  }
  /* where the board will touch down within `within` seconds, if anywhere (stepping the flight in 4 slices — a drop-in's with its own turn).
     ONE READER OF THE LANDING (10-17, the supervisor: "the landing the plan aims at and the landing the judge reads must be the same"): the
     flight met as the air step's wheels meet the park — each wheel's contact point swept along it on the board's own attitude, and its middle;
     the first standable touch gives the landing its time and its face. (The middle's path alone, over the Basin's rim, met the wall below it
     0.05 s after the front wheels met the rim's top: the up, planned to the middle's clock, was 28° short when the judge read the wheel, and a
     Cruise drop-in came down sketchy where r24 had landed it clean.) A wheel's touch is the landing as the judge will read it (wheelsInAir):
     a face under its arm — a lever of 0.7 or more, or 0.3 on a face that carries it (a wall across the arm is a stop, never a landing) — and
     under the middle (middleOver, at the middle there and then); and the middle's own touch within a sixth of a step of it is the landing
     instead, flat. (Taken whole, any standable face a wheel's ray met — the Spine's far face, the rim's top — the guess aimed the up 119° off
     the face judged.) A wheel already at a face where its sweep begins is the step's own touch, not a landing to plan for */
  predictLanding(within) {
    const v = V.copy([0, 0, 0], this.v), p = V.copy([0, 0, 0], this.p);
    const h = within / 4, drop = this.air && this.air.drop && this.assist.vert > 0 ? this.air.drop : null;
    const W0 = this._plW0 || (this._plW0 = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]), W1 = this._plW1 || (this._plW1 = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]);
    let clear = drop ? drop.clear : true;
    for (let i = 0; i < 4; i++) {
      if (drop && !clear) clear = this.tailPast(p, this.fwd, v, drop);
      if (drop && clear) this.turnDown(v, drop, PH.dropIn.turn * this.assist.vert / 100, h);
      const np = [p[0] + v[0] * h, p[1] + v[1] * h - 0.5 * PH.gAir * h * h, p[2] + v[2] * h];
      const d = V.sub([0, 0, 0], np, p), L = V.len(d);
      if (L > 1e-6) {
        let mid = null, wheel = null;
        this.wheelsOn(p, this.up, this.fwd, W0); this.wheelsOn(np, this.up, this.fwd, W1);   // (on the board's attitude as it is)
        for (let k = -1; k < 4; k++) {
          const a = k < 0 ? p : W0[k], e = k < 0 ? d : V.sub([0, 0, 0], W1[k], W0[k]), el = V.len(e); if (el < 1e-6) continue;
          const dir = V.scale([0, 0, 0], e, 1 / el), hit = this.world.bvh.raycast(a, dir, el + 0.05);
          if (!hit || V.dot(hit.normal, e) >= 0 || hit.normal[1] <= 0.2 || (k >= 0 && i === 0 && hit.t < 0.002)) continue;
          const at = { f: Math.min(1, hit.t / el), normal: hit.normal.slice(), point: hit.point.slice(), surf: hit.surf };
          if (k < 0) { mid = at; continue; }
          if (wheel && at.f >= wheel.f) continue;
          /* under its arm, as the judge reads it (the lever: |r × n| / |r|) */
          const r = V.sub([0, 0, 0], W0[k], p), rl = V.len(r), lever = rl > 1e-6 ? V.len(V.cross([0, 0, 0], r, at.normal)) / rl : 1;
          if (lever < 0.3 || (lever < 0.7 && at.normal[1] < 0.5)) continue;
          /* under the middle there and then (middleOver's own reading, at the middle's place at the touch) */
          const pm = V.addScaled([0, 0, 0], p, d, at.f), n = at.normal, hm = V.dot(V.sub([0, 0, 0], pm, at.point), n);
          const u = this.world.bvh.raycast([pm[0] + n[0] * 0.01, pm[1] + n[1] * 0.01, pm[2] + n[2] * 0.01], [-n[0], -n[1], -n[2]], Math.max(0, hm) + 0.04);
          if (!(u && u.surf !== 'fence' && V.dot(u.normal, n) >= Math.cos(20 * DEG) && Math.abs(V.dot(V.sub([0, 0, 0], u.point, at.point), n)) <= 0.03)) continue;
          wheel = at;
        }
        /* (the middle within a sixth of a step of the wheel lands it, flat) */
        const best = mid && (!wheel || (mid.f - wheel.f) * L <= 0.15 * V.len(v) * PH.step) ? mid : wheel;
        if (best) return { v: [v[0], v[1] - PH.gAir * h * best.f, v[2]], normal: best.normal, point: best.point, surf: best.surf, t: (i + best.f) * h };
      }
      V.copy(p, np); v[1] -= PH.gAir * h;
    }
    return null;
  }
  /* ---------------- THE WHEELS IN THE AIR (10-16, the supervisor: per-wheel continuous contact) ----------------
     Each wheel's contact point is swept over the step, from where the board had it at the step's start to where the step put it, and the board
     meets the first face one of them meets — what the middle meets too. What the touch does depends on how the face stands to the wheel's arm
     from the middle (r) — its LEVER, |r × n| / |r|:
       · a face UNDER the wheel's arm (a lever of 0.7 or more: a floor, a deck, the ramp the board comes down onto) — the board turns about its
         middle so the wheel rests on the face; the middle's own path is never moved. The first such touch on a face the board can stand on
         (its up within the landing's sketchy tilt) that is the surface under the middle is the LANDING, judged there (judge); the board is
         seated when it stands (three wheels on it, or two across the middle) or its middle meets the surface — flat on it by then;
       · a face ACROSS it (a lever under 0.7: a wall, a block's side, a face the board meets edge on) — no turn keeps the wheel out: the board
         stops where the wheel met it, its motion into the face taken away (faster than the body bails at a wall: a bail).
     Never a lift. (It read the wheels' midpoint, never each wheel: a lower wheel went into what the middle had not yet met — 6.9 cm in a wall
     on Raw — and a lift raised the board by a truck's depth in a solid: 24.6 cm in a step at the Sun Bank Drop, the pop-up the owner saw) */
  wheelsOn(p, up, fwd, out) {
    const sx = fwd[1] * up[2] - fwd[2] * up[1], sy = fwd[2] * up[0] - fwd[0] * up[2], sz = fwd[0] * up[1] - fwd[1] * up[0], sl = Math.hypot(sx, sy, sz) || 1, hw = PH.wheelbase / 2, ht = PH.track / 2;
    for (let i = 0; i < 4; i++) { const f = (i < 2 ? 1 : -1) * hw, g = (i % 2 ? 1 : -1) * ht / sl;   // [front-left, front-right, back-left, back-right], as attach() counts them
      out[i][0] = p[0] + fwd[0] * f + sx * g; out[i][1] = p[1] + fwd[1] * f + sy * g; out[i][2] = p[2] + fwd[2] * f + sz * g; }
    return out;
  }
  /* THE BOARD'S UNDERSIDE, three RECTANGLES (formulas/edge.js): the DECK between the trucks — HD above the board's contact plane, from a truck's
     width inside one axle to the same inside the other, as wide as the deck — and each TRUCK about its axle, HT above it, between its wheels
     (10-16, the supervisor: "a sharp edge will always fit between" points sampled on it — three, at the middle and halfway to each truck, had
     let the Spine's ridge 10.7 cm into a board on Classic; a deck read alone let the ridge under a back truck, between the deck and its wheels,
     6 cm into one; a deck read to its axles met the Planter's top edge as its wheels met the Planter's wall, and was set up on it) */
  undersides(p, up, fwd) {
    const U = this._ud || (this._ud = [0, 1, 2].map(() => ({ c: [0, 0, 0], u: [0, 0, 0], w: [0, 0, 0], n: [0, 0, 0], hu: 0, hw: 0, h: 0, s0: 0, thick: 0 })));
    const w = V.norm(S[15], V.cross(S[15], fwd, up)), hw = PH.wheelbase / 2;
    for (let k = 0; k < 3; k++) {
      const R = U[k], s0 = k === 0 ? 0 : k === 1 ? hw : -hw, h = k === 0 ? HD : HT;
      for (let j = 0; j < 3; j++) R.c[j] = p[j] + up[j] * h + fwd[j] * s0;
      V.copy(R.u, fwd); V.copy(R.n, up); V.copy(R.w, w); R.h = h; R.s0 = s0;
      R.hu = k === 0 ? hw - DECK_IN : DECK_IN; R.hw = k === 0 ? BOARD.width / 2 : PH.track / 2 - BOARD.wheelWidth / 2;
      R.thick = k === 0 ? BOARD.thickness : HD - HT + BOARD.thickness;   // what stands over its underside: the deck; a truck and the deck on it
    }
    return U;
  }
  /* THE PARK'S EDGE deepest through the board's underside: a coping, the Spine's ridge, a ledge's edge — the park's own lines (sim/park.js),
     never a probe's guess — standing more than `lo` above an underside (0: in it; null: above the board's contact plane), no more than
     EDGE_REACH (10-16: a reach of the deck's thickness and a step's fall hid the Spine's ridge 16 cm up through a board seated across it,
     and it sank on) — rolling, no more than what stands over that underside and a step's change: an edge higher, rolling, is a face the
     board runs into, its wheels' and its body's (rolled diagonally into the Planter's corner, its top edge 37 cm over the deck set the board
     up on it and launched it) — and one above what stands over the underside only where the underside under it is inside a solid (a ray up
     from it leaves a solid before it meets one: the Bench is a 6 cm seat on legs, and its top edge 40 cm over a board under it is not in the
     board). Over the coping a board rolls over or drops in over, its trucks are the assist's to carry clear (a skater unweights them over
     it: read there, a front truck on the Basin's lip flipped a board 49° in a frame); its wheels ride the lip's solid, its tail over it on
     them in a drop-in's air. → { depth (over that underside), h (that underside over the contact plane), point, s (along the board from
     its middle), t, rail } */
  edgeThrough(p, up, fwd, lo = 0, rolling = false) {
    const U = this.undersides(p, up, fwd), over = this.crossing ? this.crossing.rail.id : this.dropping ? this.dropping.rail.id : null, flown = !over && this.air && this.air.drop ? this.air.drop.rail : null; let best = null;
    for (const [ri, i] of this.world.railsNear(p)) {
      const r = this.world.rails[ri]; if (r.kind !== 'coping' && r.kind !== 'ledge') continue;
      /* the SOLID'S corner — a coping's lip, `corner` under its line — the solid the wheels ride: a board meets one solid with all of it. Read at
         the coping's line (its drawn top, 2 cm over the lip) while its wheels rode the lip under it, a board straddling a lip — its front pair
         on the deck, its back pair on the ramp — was held by its truck on the line, tipped 8° in a step and wedged a wheel 7.9 cm into the
         Lawn Quarter (10-16; the census: 6 cases ≥ 2.6 cm off their path there, 0 here). The coping solid to its wheels too is the grind
         release's (the supervisor's call) */
      const dy = r.corner || 0, a = dy ? [r.pts[i][0], r.pts[i][1] + dy, r.pts[i][2]] : r.pts[i], b = dy ? [r.pts[i + 1][0], r.pts[i + 1][1] + dy, r.pts[i + 1][2]] : r.pts[i + 1];
      for (const R of U) {
        if (R !== U[0] && (r.id === over || r.id === flown)) continue;
        const q = deckOver(R, a, b); if (!q) continue;
        if (q.depth <= (lo === null ? -R.h : lo) || q.depth > (rolling ? R.thick + 0.10 : EDGE_REACH) || (best && q.depth <= best.depth)) continue;
        if (q.depth > R.thick) { const o = [R.c[0] + R.u[0] * q.s + R.w[0] * q.t, R.c[1] + R.u[1] * q.s + R.w[1] * q.t, R.c[2] + R.u[2] * q.s + R.w[2] * q.t], hb = this.world.bvh.raycast(o, R.n, q.depth + PH.touch, true);
          if (!(hb && hb.surf !== 'fence' && V.dot(hb.face, R.n) > 0)) continue; }   // (raycast(…, true): back faces too; a back face first is the way out of a solid — past the edge's own height: the solid's faces meet AT its corner)
        q.rail = r; q.h = R.h; q.s += R.s0; best = q;
      }
    }
    return best;
  }
  /* the first face a point's path meets this step: from `a` (backed off 5 mm along `back`, so a point resting on a face is not taken for one
     going into it) to `b`; met from its front, never the fence (a net) */
  sweepPoint(a, b, back) {
    const o = [a[0] + back[0] * 0.005, a[1] + back[1] * 0.005, a[2] + back[2] * 0.005], d = [b[0] - o[0], b[1] - o[1], b[2] - o[2]], L = Math.hypot(d[0], d[1], d[2]);
    if (L < 1e-7) return null;
    const dir = [d[0] / L, d[1] / L, d[2] / L], h = this.world.bvh.raycast(o, dir, L + 0.001);
    if (!h || h.surf === 'fence' || V.dot(h.face, dir) >= 0) return null;
    return { s: Math.min(1, h.t / L), point: h.point.slice(), normal: h.normal.slice(), face: h.face.slice(), surf: h.surf };
  }
  wheelsInAir(f0, before) {
    const air = this.air, W0 = this.wheelsOn(f0.p, f0.up, f0.fwd, this._w0 || (this._w0 = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]));
    const W1 = this._w1 || (this._w1 = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]), on = [null, null, null, null];
    /* the step's FREE end — where its own motion and turn took the board before any contact: a board stopped by a wall or held by its two ends
       takes the frame of that moment on this path, never one with the turns made for other wheels this step (10-16: coming down on a ramp's
       curve at 6 m/s, the first wheel's turn took up the whole step's fall — 14° — and the board was held by its other end and seated with that
       turn kept: 8° off the ramp, the front pair 6.5 cm in it) */
    const fe = { p: this.p.slice(), up: this.up.slice(), fwd: this.fwd.slice() }, WF = this.wheelsOn(fe.p, fe.up, fe.fwd, [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]);
    /* the board's pose at s of the way from the step's start to `to` (its free end, or where its turns so far have it) */
    const P = { p: [0, 0, 0], up: [0, 0, 0], fwd: [0, 0, 0] };
    const along = (s, to) => { V.lerp(P.p, before, to.p, s); V.norm(P.up, V.lerp(P.up, f0.up, to.up, s)); V.norm(P.fwd, V.reject(P.fwd, V.lerp(P.fwd, f0.fwd, to.fwd, s), P.up)); return P; };
    /* THE DECK AGAINST THE PARK'S EDGES (formulas/edge.js): the first moment on that way that an edge is up through the deck's underside (the
       way halved 12 times), at once if one already was at the step's start */
    const deckMeets = (to) => {
      const e1 = this.edgeThrough(to.p, to.up, to.fwd); if (!e1) return null;
      const e0 = this.edgeThrough(before, f0.up, f0.fwd); if (e0) return { s: 0, e: e0 };
      let lo = 0, hi = 1, e = e1;
      for (let it = 0; it < 12; it++) { const m = (lo + hi) / 2; along(m, to); const q = this.edgeThrough(P.p, P.up, P.fwd); if (q) { hi = m; e = q; } else lo = m; }
      return { s: hi, e };
    };
    const atFree = (i, s0, deck = false) => { let s = s0; this.airTouch++;   // (a contact set the board back to its moment, its turn too: said)
      if (deck) { const m = deckMeets(fe); if (m) s = m.s; } else { const h = this.sweepPoint(W0[i], WF[i], f0.up); if (h) s = h.s; }
      V.lerp(this.p, before, fe.p, s); V.norm(this.up, V.lerp(this.up, f0.up, fe.up, s)); V.norm(this.fwd, V.reject(this.fwd, V.lerp(this.fwd, f0.fwd, fe.fwd, s), this.up)); };
    let onEdge = null;   // the edge the deck rests on this step (its point)
    for (let k = 0; k < 10; k++) {
      /* the middle's own path: it meets the surface — the landing, judged where the board first touched it */
      const mid = this.sweepPoint(before, this.p, f0.up);
      this.wheelsOn(this.p, this.up, this.fwd, W1);
      let w = null;
      for (let i = 0; i < 4; i++) { const h = this.sweepPoint(W0[i], W1[i], f0.up); if (h && (!w || h.s < w.s)) w = Object.assign(h, { i }); }
      /* THE HIGH-CENTRE: the board's underside meets an edge of the park before any wheel or its middle does (a seat on the middle's ground that
         would put an edge in the board seats it on the edge: seatOnEdge). The middle met ON an edge's own corner has met no ground — the
         board's weight over a corner is over the drop beside it (10-16: a drop-in's middle met the lip's corner in its first step and was
         seated back on the deck) */
      const dm = deckMeets(this), midCorner = mid && this.onEdgeCorner(mid.point);
      if (dm && (!w || dm.s < w.s) && (!mid || midCorner || dm.s < mid.s + 0.15)) {
        /* the deck rests on the edge: the board turned about its middle so the edge stands at the deck's underside — the side away from it comes
           down, toward the side its middle is on (A cos θ + B sin θ = H about the axis across the edge's offset in the deck), where the edge is
           off the middle enough for that turn (the arm's lever, a wheel's rule); else it is held there, its motion into the edge taken away
           (faster than 3 m/s along the deck's normal: a bail, §4.4) */
        const E = dm.e.point, R = V.sub([0, 0, 0], E, this.p), Rh = V.reject([0, 0, 0], R, this.up), rh = V.len(Rh), Rl = V.len(R);
        const A0 = V.dot(R, this.up), H = dm.e.h - 0.0005, M = Math.hypot(A0, rh), ph = Math.atan2(-rh, A0), cA = Math.acos(V.clamp(H / M, -1, 1));
        let th = ph + cA, th2 = ph - cA; th = Math.atan2(Math.sin(th), Math.cos(th)); th2 = Math.atan2(Math.sin(th2), Math.cos(th2)); if (Math.abs(th2) < Math.abs(th)) th = th2;
        onEdge = { point: E.slice(), h: dm.e.h };
        if (rh > 1e-6 && (rh / Rl >= 0.7 || Math.abs(th) <= 8 * DEG)) { const ax = V.norm([0, 0, 0], V.cross([0, 0, 0], Rh, this.up));
          V.norm(this.up, V.rotate(this.up, this.up, ax, th)); V.norm(this.fwd, V.reject(this.fwd, V.rotate(this.fwd, this.fwd, ax, th), this.up)); this.airTouch++; continue; }   // (a contact turned the board: said)
        atFree(-1, dm.s, true);
        const nd = this.up, vn = V.dot(this.v, nd);
        if (vn < 0) { if (-vn > PH.body.bailSpeed) { this.toBail('hangup', -vn); return true; } V.addScaled(this.v, this.v, nd, -vn); this.events.push({ type: 'scrape', speed: -vn }); }   // §4.4
        /* HELD ON THE EDGE, THEN HUNG UP (10-17, the class: a stop never discards the step's rest unsaid): the deck met on a rail's corner it
           cannot tip off stops there, its move into the edge taken away, the step's rest said (noteDropped); a board that BEGINS its step held
           there cannot move on — no wheel under it, the rail through its deck if it slides — and hangs up: the rider goes over (bail 'hangup').
           Held instead, a pop at the Spine's end rested its deck on that coping's end, every later step stopped at its own start with its
           2.9 m/s along the deck unspent, and it hung in the air for the rest of its ride (r21 snapped it 40 cm up onto the coping: R4.3);
           landed there, the roll found no ground and put it back each step */
        if (dm.s <= 0) { this.toBail('hangup', Math.max(0, -vn)); return true; }
        this.noteDropped(V.len(V.sub([0, 0, 0], fe.p, this.p)), 'held on an edge');
        continue;
      }
      const r = w ? V.sub([0, 0, 0], W1[w.i], this.p) : null, rl = r ? V.len(r) : 1, n = w ? w.normal : null, rxn = r ? V.cross([0, 0, 0], r, n) : null, B = r ? V.len(rxn) : 0;
      /* the middle meets the surface no later than a wheel does (within a sixth of the step: falling level, all four wheels and the middle cross
         the slab in the same step, and a wheel won by a rounding — the board was turned 7° about a middle already through the plane, seated
         tilted, and bounced): the board lands there, flat on it. A wheel clearly first — the ends of a board coming down on a transition's
         curve, which hold its middle up — is met first */
      if (mid && !midCorner && (!w || mid.s <= w.s + 0.15)) { this.noteDropped((1 - mid.s) * V.len(V.sub([0, 0, 0], this.p, before)), 'a landing\'s roll'); V.lerp(this.p, before, this.p, mid.s); mid.point = this.p.slice(); const sw = this.seatWith(mid);
        this.land(mid, this.judgedFor(mid) || this.judge(mid), this.seatOnEdge(this.p, sw || mid.normal, this.fwd) || sw, 'the middle\'s own touch'); return true; }
      if (!w) break;
      /* the turn about the middle that rests this wheel on the face: its height along n, A cos θ + B sin θ, made the face's */
      const A0 = V.dot(r, n), H = V.dot(V.sub([0, 0, 0], w.point, this.p), n) + 0.0005, ph = Math.atan2(B, A0), cA = Math.acos(V.clamp(H / rl, -1, 1));
      let th = ph - cA, th2 = ph + cA; th = Math.atan2(Math.sin(th), Math.cos(th)); th2 = Math.atan2(Math.sin(th2), Math.cos(th2)); if (Math.abs(th2) < Math.abs(th)) th = th2;
      /* WALL OR PIVOT. A face that can carry the board from below (a floor, a deck, a ramp's foot: its normal 60° or less from straight up)
         only pushes the wheel up, and the board turns off it however hard it came down — the slap of a one-wheel landing is a turn of v / arm
         (18° a step at 5 m/s on a 14 cm arm; 10-16: the Basin's 40° airs came down by its curved corners with the front wheel on the plaza past
         the rim, needed 13.5° and were called a wall: eight bails at 5.4 m/s). A face that cannot (a wall, a block's side, a steep face) blocks
         the wheel unless the turn off it is a small one — 8° or less, what the board's own turn makes in a step (10-16: a lever of 0.66 had
         bailed a straight vert air whose upper pair was 1 mm past the coping: 3° takes the wheel back over the ramp). Either way an arm in line
         with the face (a lever under 0.3) cannot turn off it */
      const carries = n[1] >= 0.5, lever = B / rl;
      if (lever < 0.3 || (lever < 0.7 && !carries && !(Math.abs(th) <= 8 * DEG))) {
        /* across the wheel's arm: the board stops where — and as — the wheel met the face: its middle back along its path, and its turn this
           step back to that moment too (a turn of its own that carried the wheel in is not kept: 10-16, kept, it left the front pair 0.7 cm in
           a deck and they were lost from there) */
        atFree(w.i, w.s); this.noteDropped(V.len(V.sub([0, 0, 0], fe.p, this.p)), 'a wheel against a face in the air');   // the rest: said (the census, row 19)
        const vn = V.dot(this.v, n);
        if (vn < 0) { if (-vn > PH.body.bailSpeed) { this.toBail('wall', -vn); return true; } V.addScaled(this.v, this.v, n, -vn); this.events.push({ type: 'scrape', speed: -vn }); }   // §4.4: a face met at more than 3 m/s along its normal
        continue;
      }
      /* under it: the landing's first touch is judged before the board is turned onto the face */
      if (!air.judged && Math.acos(V.clamp(V.dot(this.up, n), -1, 1)) / DEG <= PH.land.sketchy[0] && this.middleOver(w)) {
        air.judged = Object.assign(this.judge(w), { point: w.point, normal: n.slice() });
        if (air.judged.quality === 'bail') { this.land(Object.assign({}, w, { point: this.p.slice() }), air.judged, null, 'a bail'); return true; }
      }
      /* the board turned about its middle (θ, above) so the wheel rests on the face */
      const ax = V.scale([0, 0, 0], rxn, 1 / B);
      /* ...unless a wheel ACROSS the middle already rests on its face (its diagonal, or two others: the board's ends on a transition's curve, the
         middle above it) — then the board is held: its middle stops where this wheel met the face, and it is seated as it stands (10-16: turned
         about its middle for each in turn, it rocked 4.3° a time between them and was set down on one wheel's face, the other pair 4.7 cm in
         the ramp). Two on one axle or one side hold nothing up: the board tips about them (over a deck's edge on its back pair: called held,
         it flickered roll and air every step as it went over) */
      const pressed = !!on[3 - w.i] || on.filter((o, j) => o && j !== w.i).length >= 2;
      /* resting on an edge (the deck on it, above), a wheel on its face holds the board with its axle's mate on that face: seated on the pair
         and the edge (formulas/edge.js restOn) */
      if (onEdge) {
        const mate = w.i ^ 1, dn = V.dot(n, this.up), tm = Math.abs(dn) > 1e-6 ? V.dot(n, V.sub([0, 0, 0], w.point, W1[mate])) / dn : 0, mp = V.addScaled([0, 0, 0], W1[mate], this.up, tm);
        const rs = restOn(w.point, mp, onEdge.point, onEdge.h, this.up);
        if (rs && V.dot(rs.n, this.up) > 0.5) { const at = { point: this.p.slice(), normal: rs.n, surf: w.surf, face: rs.n }; this.land(at, this.judgedFor(at) || this.judge(w), rs.n, 'the edge rest'); return true; }
      }
      if (pressed) {
        atFree(w.i, w.s); this.noteDropped(V.len(V.sub([0, 0, 0], fe.p, this.p)), 'a landing\'s roll');   // (said: the census, row 22)
        const at = { point: this.p.slice(), normal: this.up.slice(), surf: w.surf, face: this.up.slice() }, se = this.seatOnEdge(this.p, this.up, this.fwd);
        this.land(at, this.judgedFor(at) || this.judge(at), se, 'pressed'); return true;
      }
      V.norm(this.up, V.rotate(this.up, this.up, ax, th)); V.norm(this.fwd, V.reject(this.fwd, V.rotate(this.fwd, this.fwd, ax, th), this.up)); this.airTouch++;   // (a contact turned the board: said)
      on[w.i] = { point: w.point, normal: n.slice(), surf: w.surf };
    }
    /* standing: three wheels on what they met — or a diagonal pair, the board already within 5° of their faces (a diagonal on a face holds the
       middle there, but the board can still lie tilted about it, one wheel up and one coming down: seated on one wheel's face it was snapped
       28° and its front pair set 6 cm into the Spine's face) — the board is seated where it is, on the plane they make */
    const n = on.filter(Boolean).length, diag = (on[0] && on[3]) || (on[1] && on[2]);
    const flat = diag && on.filter(Boolean).every((o) => V.dot(o.normal, this.up) >= Math.cos(5 * DEG));
    if (n >= 3 || flat) {
      const pl = contactPlane(on.map((o, i) => (o ? o.point : W1[i])), on.map(Boolean), this.up, [0, 0, 0]) || on.find(Boolean).normal.slice();
      const at = { point: this.p.slice(), normal: pl, surf: on.find(Boolean).surf, face: pl };
      this.land(at, this.judgedFor(at) || this.judge(at), this.seatOnEdge(this.p, pl, this.fwd), 'standing'); return true;
    }
    return false;
  }
  /* a wheel that BEGINS an air step inside a solid (a takeoff from a seat that left one in): a sweep from inside meets no face, so it is
       brought out first — the board turned about its middle when a small turn does it (5° or less), else moved out along the face (a
       correction: the touchdown wall reads it) (10-16: from a lip seat the front pair began 0.5 cm in the deck, and the board levelling in the
       air carried them 31 cm down through it unseen) */
  wheelsOut() {
    const W0 = this.wheelsOn(this.p, this.up, this.fwd, this._wo || (this._wo = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]));
    /* the deepest first, then read again (one turn per wheel in turn fought itself: four turns about four axes left it 2 cm in, not 0.7) */
    let spent = null;
    for (let k = 0; k < 6; k++) {
      let deep = null; const found = [null, null, null, null];
      for (let i = 0; i < 4; i++) {
        /* its way out: the nearest face it is behind, along the axes and the board's up (a wheel by a deck's edge is under its top, not
           beside its side: by the board's up alone it was moved 6 cm out through the side) */
        let h = null, hd = null;
        /* (each ray from a millimetre behind the wheel: a wheel ON a face meets that face first, from in front, and is not inside — 10-16: from
           a wheel resting on the Spine's west face, its ray into the Spine missed the face it stood on and met the east face's back 2–5 cm on;
           it was called inside and the board pushed 1.9 cm out of the Spine at a take-off — the class of tests/lib/inside.mjs) */
        for (const d of [this.up, Y, DOWN, [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) { const q0 = this.world.bvh.raycast([W0[i][0] - d[0] * 0.001, W0[i][1] - d[1] * 0.001, W0[i][2] - d[2] * 0.001], d, 0.051, true);   // (raycast answers in one shared object: what is kept is copied)
          const q = q0 ? { t: Math.max(0, q0.t - 0.001), face: q0.face, surf: q0.surf } : null;
          if (q && q.surf !== 'fence' && V.dot(q.face, d) > 0 && (!h || q.t * V.dot(q.face, d) < h.t * V.dot(h.face, hd))) { h = { t: q.t, face: q.face.slice(), surf: q.surf }; hd = d; } }
        if (h) { const depth = h.t * V.dot(hd, h.face); if (depth > 1e-4) { found[i] = { depth, n: h.face }; if (!deep || depth > deep.depth) deep = { i, depth: depth + 0.0005, n: h.face }; } }
      }
      if (!deep) return;
      /* (its axle's other wheel in the same face too: turned out about the axle's middle, both at once — about the middle for each in turn the
         back pair took six turns a step and stayed in) */
      const mate = found[deep.i ^ 1], pair = mate && V.dot(mate.n, deep.n) > 0.95 && mate.depth > 0.5 * deep.depth;
      const arm = pair ? [(W0[deep.i][0] + W0[deep.i ^ 1][0]) / 2, (W0[deep.i][1] + W0[deep.i ^ 1][1]) / 2, (W0[deep.i][2] + W0[deep.i ^ 1][2]) / 2] : W0[deep.i];
      const n = deep.n, r = V.sub([0, 0, 0], arm, this.p), rxn = V.cross([0, 0, 0], r, n), B = V.len(rxn), th = B > 1e-6 ? deep.depth / B : Infinity;
      if (th <= 5 * DEG) { const ax = V.scale([0, 0, 0], rxn, 1 / B);
        V.norm(this.up, V.rotate(this.up, this.up, ax, th)); V.norm(this.fwd, V.reject(this.fwd, V.rotate(this.fwd, this.fwd, ax, th), this.up)); this.airTouch++; }   // (a contact turned the board: said)
      else V.addScaled(this.p, this.p, n, deep.depth);
      this.wheelsOn(this.p, this.up, this.fwd, W0); spent = deep;
    }
    if (spent) this.noteDropped(spent.depth, 'the push-out\'s six passes spent');   // a wheel the sixth pass still moved: said (the census)
  }
  /* THE SEAT OF A BOARD WHOSE MIDDLE MET THE SURFACE: the plane through that point and the wheels with ground under them (two or more) —
     the board rests on them and on its middle; the middle's own normal is a curve's at one point (10-16: at a bowl's rim, the back pair on the
     transition and the front pair over the deck, a board set to the normal at the very top had its back wheels 2 cm into the curve below) */
  seatWith(mid) {
    const W = this.wheelsOn(this.p, this.up, this.fwd, this._ws || (this._ws = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]])), pts = [];
    for (let i = 0; i < 4; i++) { const h = this.world.bvh.raycast([W[i][0] + this.up[0] * 0.03, W[i][1] + this.up[1] * 0.03, W[i][2] + this.up[2] * 0.03], [-this.up[0], -this.up[1], -this.up[2]], 0.07);
      if (h && h.surf !== 'fence' && V.dot(h.face, this.up) > 0.2) pts.push(h.point.slice()); }
    if (pts.length < 2) return null;
    if (pts.length >= 3) { const got = [true, true, true, pts.length > 3], c = pts.concat(pts.length === 3 ? [pts[0]] : []), sup = support(c.slice(0, 4), got, this.up); return sup ? sup.n : null; }
    const a = V.sub([0, 0, 0], pts[0], mid.point), b = V.sub([0, 0, 0], pts[1], mid.point), n = V.cross([0, 0, 0], a, b), l = V.len(n);
    if (l < 1e-6) return null;
    V.scale(n, n, (V.dot(n, this.up) < 0 ? -1 : 1) / l); return V.dot(n, this.up) > 0.8 ? n : null;
  }
  /* a point on the solid's own corner under an edge (within `PH.touch` of it: a coping's lip, `corner` under its line — sim/park.js) */
  onEdgeCorner(q) {
    for (const [ri, i] of this.world.railsNear(q)) {
      const r = this.world.rails[ri]; if (r.kind !== 'coping' && r.kind !== 'ledge') continue;
      const dy = r.corner || 0, a = [r.pts[i][0], r.pts[i][1] + dy, r.pts[i][2]], b = [r.pts[i + 1][0], r.pts[i + 1][1] + dy, r.pts[i + 1][2]];
      if (closestOnSegments(q, q, a, b).d <= PH.touch) return true;
    }
    return false;
  }
  /* THE SEAT ON THE EDGE (the high-centre at a landing): where the plane a landing would seat the board on puts an edge of the park through its
     deck, it is seated on the edge and on the pair on the side its weight is on — that pair's contacts what is under them along the seat's up
     (10-16: seated on its wheels on both faces of the Spine's ridge, the peak stood 16 cm up through its deck). → the plane's normal, or null */
  seatOnEdge(p, n, fwd) {
    const f = V.norm([0, 0, 0], V.reject([0, 0, 0], fwd, n)), hc = this.edgeThrough(p, n, f); if (!hc) return null;
    const a = hc.s > this.weightAt() ? 2 : 0, W = this.wheelsOn(p, n, f, [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]), pts = [];
    for (const i of [a, a + 1]) { const h = this.world.bvh.raycast([W[i][0] + n[0] * 0.25, W[i][1] + n[1] * 0.25, W[i][2] + n[2] * 0.25], [-n[0], -n[1], -n[2]], 0.6);
      if (!h || h.surf === 'fence' || V.dot(h.normal, n) <= 0.2) return null; pts.push(h.point.slice()); }
    const rs = restOn(pts[0], pts[1], hc.point, hc.h, n);
    return rs && V.dot(rs.n, n) > 0.5 ? rs.n : null;
  }
  /* the judgement made where the board first touched this surface (a face within 20° of it, the middle over it), if one was */
  judgedFor(hit) { const j = this.air && this.air.judged; return j && V.dot(j.normal, hit.normal) >= Math.cos(20 * DEG) ? j : null; }
  /* is the middle over the surface a wheel met (along its normal, within the middle's height above it and 3 cm, a face within 20° of it)? */
  middleOver(w) {
    const n = w.normal, hm = V.dot(V.sub([0, 0, 0], this.p, w.point), n);
    const h = this.world.bvh.raycast([this.p[0] + n[0] * 0.01, this.p[1] + n[1] * 0.01, this.p[2] + n[2] * 0.01], [-n[0], -n[1], -n[2]], Math.max(0, hm) + 0.04);
    return !!(h && h.surf !== 'fence' && V.dot(h.normal, n) >= Math.cos(20 * DEG) && Math.abs(V.dot(V.sub([0, 0, 0], h.point, w.point), n)) <= 0.03);
  }
  /* WALLS IN THE AIR (the body only — its high sphere, PH.body.high): A STOP ON ITS PATH (the supervisor's item 2): the first moment of the step
     the body meets a wall along the step's own path (halved 12 times from where the step began) is where the board stops, a millimetre short,
     and its motion into the wall is taken away (faster than the body bails at a wall: a bail). Pushed out sideways by its depth at the step's
     end, the board had moved 2.1 cm off its own path in a step, falling past the Deck Quarter's deck. A body already against a wall as the step
     began is pushed back out of it as before */
  wallsAir(before) {
    const s = PH.body.high, P = S[10];
    /* the deepest wall the body's sphere is in: its face (a floor or a top is no wall) and the CONTACT's own normal — from the nearest point
       to the sphere's middle. At a face's edge the two part: on the fence's top edge the face is upright and the contact leans 20° up, and
       only the contact's lets the body come off the edge */
    const pen = (p) => { V.set(P, p[0], p[1] + s.h, p[2]); let worst = 0, n = null, c = null;
      this.world.bvh.sphere(P, s.r, (tri, q, d) => { const f = this.world.bvh.faceNormal(tri, S[11]); if (Math.abs(f[1]) > 0.5) return; const pe = s.r - d;
        if (pe > worst) { worst = pe; n = f.slice(); c = d > 1e-9 ? [(P[0] - q[0]) / d, (P[1] - q[1]) / d, (P[2] - q[2]) / d] : f.slice(); } });
      return { worst, n, c }; };
    const end = pen(this.p); if (!end.n) return;
    let hitN = end.n;
    const start = before ? pen(before) : null;
    if (start && start.worst <= 0) {
      const q = [0, 0, 0]; let lo = 0, hi = 1, c = end.c;
      for (let it = 0; it < 12; it++) { const m = (lo + hi) / 2; V.lerp(q, before, this.p, m); const r = pen(q); if (r.worst > 0) { hi = m; hitN = r.n; c = r.c; } else lo = m; }
      const L = V.len(V.sub(q, this.p, before)), k = L > 1e-9 ? Math.max(0, lo - 0.001 / L) : 0;
      const free = this.p.slice(), rest = this.p.slice(); V.lerp(this.p, before, this.p, k); V.sub(rest, rest, this.p);
      const said = { from: before.slice(), free, c: c.slice(), again: false };   // what the air's wall did this step, for the tests (sk.wallAir)
      const own = this._own || (this._own = []); own.push([before.slice(), this.p.slice()]);   // the step's own path through its contact, part by part (the tests: a slid board ends ON it)
      /* COLLIDE AND SLIDE IN THE AIR (10-17; the ground's own, walls() above — Fauerby 2003): stopped on its path at a wall, the body goes the
         rest of the step ALONG it — the rest less its part into the contact — to where that meets something, a millimetre short, up to three
         times; what three leave is said (noteDropped). Stopped and left there, a Raw air into the west fence's top hung in the air for the rest of
         its ride: every later step stopped at its own start, its speed unspent (the Lawn Quarter ±40° @9 — the coping reading, 10-17) */
      let left = rest;
      for (let bump = 0; bump < 3 && left; bump++) {
        const into = V.dot(left, c), go = into < 0 ? V.addScaled([0, 0, 0], left, c, -into) : left.slice(), gl = V.len(go);
        if (gl < 1e-6) { left = null; break; }
        const from = this.p.slice(), to = V.add([0, 0, 0], from, go);
        if (pen(to).worst <= 0) { V.copy(this.p, to); left = null; own.push([from, to.slice()]); break; }
        let lo2 = 0, hi2 = 1; const q2 = [0, 0, 0];
        for (let it = 0; it < 12; it++) { const m = (lo2 + hi2) / 2; V.lerp(q2, from, to, m); const r = pen(q2); if (r.worst > 0) { hi2 = m; c = r.c; } else lo2 = m; }
        const k2 = Math.max(0, lo2 - 0.001 / gl); V.lerp(this.p, from, to, k2); left = V.scale([0, 0, 0], go, 1 - k2); said.again = true;
        own.push([from, this.p.slice()]);
      }
      if (left) this.noteDropped(V.len(left), 'the air');
      this.wallAir = said;
      if (V.len(V.sub([0, 0, 0], this.p, before)) > 0) this.wheelsOut();   // a body slid down a wall takes its board along: none ends inside a solid
    } else { hitN[1] = 0; const l = Math.hypot(hitN[0], hitN[2]); if (l > 1e-6) V.addScaled(this.p, this.p, [hitN[0] / l, 0, hitN[2] / l], end.worst); }
    hitN[1] = 0; const l = Math.hypot(hitN[0], hitN[2]); if (l < 1e-6) return; hitN[0] /= l; hitN[2] /= l;
    const vn = V.dot(this.v, hitN); if (vn < -PH.body.bailSpeed) { this.toBail('wall', -vn); return; } if (vn < 0) V.addScaled(this.v, this.v, hitN, -vn);
  }
  /* the landing's judgement: how far the board is from the surface (tilt), from the line of travel (yaw) and from catching its flip — read
     where it FIRST touches (a wheel, or its middle), never once it has been turned onto the surface; `straight` is the heading the spin
     assist sets a landing within its window of a half turn to (applied by land, not here) */
  judge(hit) {
    const A = this.assist, air = this.air, n = hit.normal, tr = air.trick;
    const vAlong = V.reject([0, 0, 0], this.v, n), sp = V.len(vAlong);
    const travel = sp > 0.3 ? V.scale([0, 0, 0], vAlong, 1 / sp) : V.norm([0, 0, 0], V.reject([0, 0, 0], this.fwd, n));
    const fw = V.norm([0, 0, 0], V.reject([0, 0, 0], this.fwd, n));
    let yaw = Math.acos(V.clamp(Math.abs(V.dot(fw, travel)), 0, 1)) / DEG, straight = null; const touched = yaw;   // (the yaw it touched down with: said beside the judged)
    if (A.spin > 0 && yaw <= A.spin) { straight = V.scale([0, 0, 0], travel, V.dot(fw, travel) >= 0 ? 1 : -1); yaw = 0; }
    const tilt = Math.acos(V.clamp(V.dot(this.up, n), -1, 1)) / DEG, flipLeft = tr ? 1 - tr.prog : 0;
    const [ct, cy, cf] = PH.land.clean, [st, sy, sf] = PH.land.sketchy;
    const drop = air.maxY - hit.point[1], impact = Math.max(0, -V.dot(this.v, n));
    let quality = tilt <= ct && yaw <= cy && flipLeft <= cf ? 'clean' : tilt <= st && yaw <= sy && flipLeft <= sf ? 'sketchy' : 'bail';
    if (quality === 'clean' && drop > PH.land.hardDrop && n[1] > 0.95) quality = 'sketchy';
    return { quality, tilt, yaw, touched, flipLeft, impact, straight, surf: hit.surf, t: this.t };
  }
  /* the landing: judged where it first touched (`j`, from judge) or here; seated on `seat` (seatWith) when one is given, else on the face */
  /* (`how`: which landing seats it — the middle's own touch, the edge rest, pressed, standing, a bail; what the seat turned the board's up by is
     said on this.seatSaid for every one, a quiet landing's too — 10-17, the supervisor: "read the seat's own turn ... every seat path") */
  land(hit, j = this.judge(hit), seat = null, how = 'the middle\'s own touch') {
    const air = this.air, n = seat || hit.normal, upIn = this.up.slice(), said = (ev) => { const turn = Math.acos(V.clamp(V.dot(upIn, this.up), -1, 1)) / DEG; this.seatSaid = { how: air.quiet && how !== 'a bail' ? how + ', quiet' : how, turn, impact: j.impact, t: this.t }; if (ev) ev.seatTurn = turn; };
    this.endGrab();
    const tr = air.trick;
    const vAlong = V.reject(S[0], this.v, n);
    /* THE SPIN ASSIST'S CATCH IS TURNED ON THE GROUND, NEVER SET AT THE TOUCHDOWN (10-17, the supervisor's (b): the spin window is the presets'
       design — Cruise 45°, Classic 30°, Raw none — and the 10-16 fault was the SNAP, never the verdict). A landing inside the window keeps its
       verdict (judge); what the turn in the air left of it is turned on the roll's first steps at a rider's pace, from the rate and acceleration
       it touched down with (stepGround: the catch). What this touchdown set the heading by is said on the land event (`set`), and the yaw the
       board touched down with beside the judged one (`touched`); the touchdown's seat turns the board, a contact (airTouch) */
    const fw0 = this.fwd.slice(); this.airTouch++;
    this.catchTurn = j.straight ? { w: air.headW || 0, a: air.headA || 0, t0: this.t, from: j.touched } : null;
    const set = Math.acos(V.clamp(V.dot(fw0, this.fwd), -1, 1)) / DEG;
    const { quality, tilt, flipLeft, impact } = j, yawErr = j.yaw;
    const airTime = this.t - air.t0; this.lastAirGrabs = air.grabs.length;
    if (air.quiet && quality !== 'bail') { V.copy(this.p, hit.point); this.settle = { w: Math.abs(impact) / (PH.wheelbase / 2), t0: this.t, from: null, left: 0 }; V.copy(this.v, vAlong); V.norm(this.fwd, V.reject(this.fwd, this.fwd, n)); this.surface = hit.surf; this.state = 'roll'; this.air = null; this.attach(); said(null); return; }
    const landEv = { type: 'land', how, quality, tilt, yaw: yawErr, touched: j.touched, set, flipLeft, impact, surf: hit.surf, air: airTime, height: air.maxY - air.fromY, spun: air.spun, trick: tr ? tr.name : null, acc: tr ? tr.acc : null, spd: tr ? tr.spd : null, grabs: air.grabs.slice() }; this.events.push(landEv);
    if (quality === 'bail') { V.copy(this.p, hit.point); this.toBail('landing', impact); said(landEv); return; }
    /* on the ground again: keep the speed along the surface; a sketchy landing loses some and wobbles */
    V.copy(this.p, hit.point); this.settle = { w: Math.abs(impact) / (PH.wheelbase / 2), t0: this.t, from: null, left: 0 };   // (the up as it met the face: the seat settles it)
    V.copy(this.v, vAlong);
    if (quality === 'sketchy') { V.scale(this.v, this.v, PH.land.sketchyKeep); this.wobble = PH.land.wobble; this.stats.sketchy++; } else this.stats.landed++;
    V.norm(this.fwd, V.reject(this.fwd, this.fwd, n));
    /* half turns landed change the stance */
    const halves = Math.round(Math.abs(air.spun) / Math.PI);
    if (halves % 2 === 1) this.switch = !this.switch;
    this.surface = hit.surf; this.state = 'roll'; this.landT = 0; this.air = null; this.ahead = null; this.lastLand = { quality, t: this.t };
    const h = this.hold, light = h && Math.abs(h.y) >= 0.17 && Math.abs(h.y) <= 0.78 && Math.abs(h.x) <= 0.45 && V.len(this.v) > PH.manual.minSpeed;
    if (this.manualHeld) this.startManual(this.manualHeld === 'nose');
    else if (light) { this.startManual(h.y < 0); if (this.manual) this.manual.byHold = true; }
    this._seating = true; this.attach(); this._seating = false;   // (the landing's seat: its contacts set its attitude)
    said(landEv);
  }

  /* ---------------- GRINDS ---------------- */
  /* THE COPING AN AIR LEFT (10-16, the owner: "angled airs in the bowl can still catch the edge as an unwanted grind"): it catches the trucks on
     the way back down only if the rider ASKS — a direction held on the pad at the lock, the grind's own choice (DESIGN §4.6) — or the trucks
     come down ON it — over its top (the board's middle within `grind.onTop` of its line: a vert air comes down 8 cm inside its lip, past it) and
     along it (within 20°, a 50-50's own line: a board crossing it at an angle has one truck over it at a time — 10-16: a slanted air over the
     Basin's curved corner came down on the rim and was caught), its deck level enough to sit on it (its up within 35° of vertical: a board
     upright in a vert air lines up with the coping by chance — two of the East Wall's 40° airs did). Every
     other rail keeps the assist's radius — a transfer onto another coping too. (It had: 50 of 85 slanted lip airs ended grinding the coping
     they left, caught anywhere within 0.45–0.63 m of it) */
  leftCoping(r) { const air = this.air; return !!(air && air.lipId && r.kind === 'coping' && r.group === String(air.lipId).split(':')[0]); }
  /* the left coping's own capture test: asked, or the trucks over its top and along it */
  onLeftCoping(horiz, tan) { if (this.asksToGrind()) return true; const fl = Math.hypot(this.fwd[0], this.fwd[2]), tl = Math.hypot(tan[0], tan[2]) || 1;
    return horiz <= PH.grind.onTop && this.up[1] >= Math.cos(35 * DEG) && fl > 1e-6 && Math.abs(this.fwd[0] * tan[0] + this.fwd[2] * tan[2]) / (fl * tl) >= Math.cos(20 * DEG); }
  /* the rider's ask: a direction held on the pad as far as the grind's own choice reads one (startGrind: 0.35 of the pad's reach), or a grab
     held to the lock (the pad's direction held in the air IS the grab; G on the keys, which hold no direction) */
  asksToGrind() { const h = this.hold; return !!((h && Math.max(Math.abs(h.x), Math.abs(h.y)) > 0.35) || (this.air && this.air.grab)); }
  tryGrind(before, dt) {
    const A = this.assist, air = this.air;
    if (this.t - air.t0 < 0.06) return false;
    const cap = 0.20 + 0.50 * (A.grind / 100), win = PH.grind.window;
    let best = null;
    for (const [ri, si] of this.world.railsNear(this.p)) {
      const r = this.world.rails[ri], a = r.pts[si], b = r.pts[si + 1];
      const ab = V.sub(S[0], b, a), L2 = V.dot(ab, ab); if (L2 < 1e-8) continue;
      const t = V.clamp(V.dot(V.sub(S[1], this.p, a), ab) / L2, 0, 1);
      /* a point clamped to a joint is the neighbouring segment's to judge (10-16: its neighbour turned it down — rising from under it — and this
         one's end, 36 cm along the rail, was caught instead: the board eased 40 cm along the rail at 10 m/s); only the rail's own ends keep it */
      if (!r.loop && ((t <= 0 && si > 0) || (t >= 1 && si < r.pts.length - 2))) continue;
      const q = V.addScaled(S[2], a, ab, t);
      const dx = this.p[0] - q[0], dz = this.p[2] - q[2], dy = this.p[1] - q[1];
      const horiz = Math.hypot(dx, dz);
      if (horiz > cap || dy < win[0] || dy > win[1]) continue;
      if (this.leftCoping(r) && !this.onLeftCoping(horiz, ab)) continue;
      if (this.v[1] > PH.grind.fallSpeed) continue;
      const tl = Math.sqrt(L2), tan = V.scale(S[3], ab, 1 / tl), along = V.dot(this.v, tan);
      /* a rail is met from ABOVE: the step began with the trucks at or over its top, within a centimetre (F5, the supervisor 10-16: a board
         can't grind what it is under — a pop peaking with its wheels 1–8 cm under Kiln Yard's barrier top was caught there and lifted onto it,
         the hips 349 m/s²; under the top it meets the face) */
      if (before[1] < q[1] + 0.005 - CATCH_TOL) continue;
      if (Math.abs(along) < PH.grind.minSpeed) continue;
      /* past an end of the rail (t clamped), only a board moving INTO the rail is caught; the rail just left is let go for a moment */
      const atEnd = (t <= 0 && si === 0) || (t >= 1 && si === r.pts.length - 2);
      if (atEnd && !r.loop && (t <= 0 ? along < 0 : along > 0)) continue;
      if (air.fromRail === r.id && this.t - air.t0 < 0.3) continue;
      const score = horiz + Math.max(0, dy) * 0.5;
      if (!best || score < best.score) best = { ri, si, t, q: q.slice(), tan: tan.slice(), along, score, rail: r, segLen: tl };
    }
    if (!best) { this.aimForRail(cap); return false; }
    /* THE ASSIST STEERS; THE RAIL CATCHES THE TRUCKS AT ITS TOP (10-16: caught anywhere in the window — 38 cm above a ledge, 62 cm to its
       side under Cruise — and put on it the same step, the board jumped 54 cm in a frame: the supervisor's G1). Falling within the capture
       radius, the board's sideways velocity is drawn toward the line it will ride, so it comes over the rail as it comes down to it (the
       references: auto-snap within a capture radius, airborne and descending); the lock is at the rail's top, the rest eased (placeOnRail) */
    /* THE CATCH IS WHERE THE FALL MEETS THE TOP — the board's fall stopped there, as a landing stops it (10-16:
       caught anywhere within 3 cm over the Main Ledge's top and its fall stopped there, the lock then eased it down the rest from rest — on
       Classic the deck took 1.3 cm and gave it back) */
    const top = best.q[1] + 0.005, above = this.p[1] - top;
    if (above > 0) { if (this.v[1] <= 0) this.steerToRail(best, above, dt); return false; }
    /* (the FALL stops at the top; the board's way along and across the rail runs the whole step — set back to the crossing along its path, it
       lost the rest of the step's travel along the rail and took it back the next: 3 cm) */
    this.p[1] = top;
    this.startGrind(best);
    return true;
  }
  /* THE CATCH SET UP ON THE WAY DOWN (10-16): a rail the fall will meet inside the capture radius within 0.45 s is the board's attitude target
     from then on — it turns to ride the rail over the last of the air. Set only in the window's last 0.1 s (above), the board turned 60° onto
     the East Wall's coping at 915°/s and the hips took 190 m/s² at the catch. The steering onto the rail stays the window's */
  aimForRail(cap) {
    const air = this.air, g = PH.gAir; let best = null;
    for (const [ri, si] of this.world.railsNear(this.p)) {
      const r = this.world.rails[ri], a = r.pts[si], b = r.pts[si + 1], ab = V.sub([0, 0, 0], b, a), L2 = V.dot(ab, ab); if (L2 < 1e-8) continue;
      const q = V.addScaled([0, 0, 0], a, ab, V.clamp(V.dot(V.sub([0, 0, 0], this.p, a), ab) / L2, 0, 1)), dy = this.p[1] - q[1];
      if (dy <= 0.05) continue;
      const T = (this.v[1] + Math.sqrt(Math.max(0, this.v[1] * this.v[1] + 2 * g * dy))) / g; if (!(T > 0.05 && T < 0.45)) continue;
      const P = [this.p[0] + this.v[0] * T, q[1], this.p[2] + this.v[2] * T], q2 = V.addScaled([0, 0, 0], a, ab, V.clamp(V.dot(V.sub([0, 0, 0], P, a), ab) / L2, 0, 1));
      if (Math.hypot(P[0] - q2[0], P[2] - q2[2]) > cap) continue;
      if (this.leftCoping(r) && !this.onLeftCoping(Math.hypot(P[0] - q2[0], P[2] - q2[2]), ab)) continue;
      const tan = V.scale([0, 0, 0], ab, 1 / Math.sqrt(L2)); if (Math.abs(V.dot(this.v, tan)) < PH.grind.minSpeed) continue;
      if (air.fromRail === r.id && this.t - air.t0 < 0.3) continue;
      if (!best || T < best.T) best = { T, tan };
    }
    if (best) { air.railUp = V.norm([0, 0, 0], V.reject([0, 0, 0], Y, best.tan)); air.railT = best.T; }
  }
  steerToRail(b, above, dt) {
    const r = b.rail, inward = r.inwardOf ? r.inwardOf[b.si] : r.inward || [0, 0, 0];
    const tx = b.q[0] + inward[0] * 0.06 - this.p[0], tz = b.q[2] + inward[2] * 0.06 - this.p[2];   // to where the board will ride (placeOnRail)
    const th = Math.hypot(b.tan[0], b.tan[2]) || 1, ux = b.tan[0] / th, uz = b.tan[2] / th;
    const al = tx * ux + tz * uz, ox = tx - ux * al, oz = tz - uz * al;                              // the offset across the rail, level
    const g = PH.gAir, vy = this.v[1], T = Math.max(0.05, (vy + Math.sqrt(vy * vy + 2 * g * above)) / g);   // the time left to fall to its top
    const va = this.v[0] * ux + this.v[2] * uz, vx = this.v[0] - ux * va, vz = this.v[2] - uz * va;
    /* THE WAY ONTO THE RAIL, PLANNED (10-17, the supervisor's (e): "the drawn deck ≤ 1 cm at the catch, and the lock's hips inside their
       bounds"): the offset across the rail planned to its line by the time it meets the rail's top, from its own rate and acceleration across,
       at the catch's pace (formulas/follow.js planned) — the share it can make; the rest on the rail, the same plan carried through the catch
       (placeOnRail). Chasing a speed across of offset / time-left (eased at steerTau), a Cruise transfer onto the Basin's coping was pushed
       across at up to 144 m/s² in its last 0.06 s and braked at 164 the step it locked: the drawn deck took 1.6 cm and gave it back */
    const sa = this.air.steerA || (this.air.steerA = [0, 0]), h = { u: { x: -ox, y: 0, z: -oz }, ud: { x: vx, y: 0, z: vz }, udd: { x: sa[0], y: 0, z: sa[1] } };
    planned(h, { x: 0, y: 0, z: 0 }, T, dt, PH.grind.catchA);
    this.v[0] += h.ud.x - vx; this.v[2] += h.ud.z - vz; sa[0] = h.udd.x; sa[1] = h.udd.z;
    this.air.railUp = V.norm([0, 0, 0], V.reject([0, 0, 0], Y, b.tan)); this.air.railT = T;   // the attitude it will ride with, and when: the next step's landing target
  }
  startGrind(b) {
    this.catchTurn = null;
    const r = b.rail, dir = b.along >= 0 ? 1 : -1, tan = V.scale([0, 0, 0], b.tan, dir);
    /* which grind: the angle between the board and the rail, the side, and a direction held at the lock */
    const fwdH = V.norm(S[4], [this.fwd[0], 0, this.fwd[2]]), tanH = V.norm(S[5], [tan[0], 0, tan[2]]);
    const alpha = Math.acos(V.clamp(Math.abs(V.dot(fwdH, tanH)), 0, 1)) / DEG;
    const h = this.hold;
    let name = '50-50';
    if (r.kind === 'coping' || r.kind === 'rail' || r.kind === 'ledge') {
      if (alpha < 20) name = h && h.y > 0.35 ? (h.x * dir > 0.35 ? 'Smith' : h.x * dir < -0.35 ? 'Feeble' : '5-0') : h && h.y < -0.35 ? (h.x * dir > 0.35 ? 'Crooked' : 'Nosegrind') : '50-50';
      else if (alpha < 55) name = V.dot(fwdH, tanH) * dir * (this.fakie ? -1 : 1) >= 0 ? 'Crooked' : 'Feeble';
      else name = r.kind === 'rail' ? 'Boardslide' : (h && h.y > 0.35 ? 'Tailslide' : h && h.y < -0.35 ? 'Noseslide' : 'Boardslide');
      if (name === 'Boardslide' && this.air && this.air.spun > 0.25) name = 'Lipslide';
    }
    const slide = /slide/.test(name);
    const air = this.air;
    this.endGrab();
    const segs = r.cum, s = segs[b.si] + b.t * b.segLen;
    const fr = PH.friction[r.surface] != null ? PH.friction[r.surface] : PH.friction.rail;
    this.grind = { rail: r, s, dir, speed: Math.abs(b.along) * (1 - PH.grind.loss), name, slide, mu: fr * (slide ? PH.friction.slide : 1), t0: this.t, startS: s, covered: 0, from: air, fakie: this.fakie,
      catch: { p: this.p.slice(), v: this.v.slice(), up: this.up.slice(), fwd: this.fwd.slice(), off: null, steerA: air && air.steerA ? air.steerA.slice() : null } };
    /* a slide lies across the rail with its nose the side it came in on (a fixed side turned the board half round at the catch from the other) */
    if (slide) { const up0 = V.norm(S[6], V.reject(S[6], Y, tan)), x = V.cross(S[7], up0, tan); this.grind.slideSign = V.dot(x, this.fwd) < 0 ? -1 : 1; }
    this.state = 'grind'; this.air = null; this.needle = 0; this.needleV = 0;
    this.stats.grinds++;
    this.events.push({ type: 'grindStart', name, rail: r.id, group: r.group, surface: r.surface, slide, preTrick: air && air.trick && air.trick.prog >= 0.92 && air.trick.name !== 'Ollie' ? air.trick : null, grabs: air ? air.grabs.slice() : [], spun: air ? air.spun : 0 });
    this.placeOnRail();
  }
  railPoint(r, s, out, tanOut) {
    const cum = r.cum, n = r.pts.length;
    if (r.loop) { s = ((s % r.length) + r.length) % r.length; }
    s = V.clamp(s, 0, r.length);
    let i = 0; while (i < n - 2 && cum[i + 1] < s) i++;
    const a = r.pts[i], b = r.pts[i + 1], L = cum[i + 1] - cum[i] || 1, t = (s - cum[i]) / L;
    out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t;
    if (tanOut) { tanOut[0] = (b[0] - a[0]) / L; tanOut[1] = (b[1] - a[1]) / L; tanOut[2] = (b[2] - a[2]) / L; }
    return i;
  }
  /* a truck's point on the rail, the rail carried on straight past its ends (clamped there, a truck past the end stopped, the chord
     shrank and the board's middle slowed before it left — 10-16) */
  truckPoint(r, s, out) {
    if (r.loop || (s >= 0 && s <= r.length)) return this.railPoint(r, s, out);
    const n = r.pts.length, a = s < 0 ? r.pts[0] : r.pts[n - 1], b = s < 0 ? r.pts[1] : r.pts[n - 2], L = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) || 1, k = (s < 0 ? -s : s - r.length) / L;
    out[0] = a[0] + (a[0] - b[0]) * k; out[1] = a[1] + (a[1] - b[1]) * k; out[2] = a[2] + (a[2] - b[2]) * k;
  }
  placeOnRail() {
    const g = this.grind, r = g.rail, q = S[0], tan = S[1];
    const i = this.railPoint(r, g.s, q, tan);
    if (!r.loop && (g.s < 0 || g.s > r.length)) this.truckPoint(r, g.s, q);   // past an end, on its line: the step it leaves on keeps its whole move
    const t = V.scale(S[2], tan, g.dir);
    /* the board's way is the chord between its two trucks on the rail: a bend is crossed over the wheelbase's travel (10-16: turned to the
       rail at its middle, the board snapped round the Five Rail's bends in a step; the trucks' directions averaged, in two half-steps) */
    this.truckPoint(r, g.s + PH.wheelbase / 2, S[14]); this.truckPoint(r, g.s - PH.wheelbase / 2, S[15]);
    const way = V.scale(S[12], V.norm(S[12], V.sub(S[12], S[14], S[15])), g.dir);   // the chord from its back truck to its front: it turns as the front truck rounds a bend
    const inward = r.inwardOf ? r.inwardOf[i] : r.inward || [0, 0, 0];
    /* its middle rides the chord between its trucks' points on the rail, lifted where the rail humps above that chord (over a bend down, the
       board rides the bend's top); it moves the chord's way — round a bend its path is rounded over the wheelbase, never turned in a step
       (10-16: placed at the rail's point and moved along it, the board turned 26.6° in a step at the Five Rail's bend, its hips 777 m/s²) */
    const mx = (S[14][0] + S[15][0]) / 2, my = (S[14][1] + S[15][1]) / 2, mz = (S[14][2] + S[15][2]) / 2;
    const up = V.norm(S[3], V.reject(S[3], Y, way));
    const hump = Math.max(0, (q[0] - mx) * up[0] + (q[1] - my) * up[1] + (q[2] - mz) * up[2]);
    /* on a ledge the board rides over its top a little; on a round rail it sits on top */
    V.set(this.p, mx + up[0] * hump + inward[0] * 0.06, my + up[1] * hump + 0.005, mz + up[2] * hump + inward[2] * 0.06);
    V.copy(this.up, up);
    if (g.slide) V.scale(this.fwd, V.norm(this.fwd, V.cross(this.fwd, up, way)), g.slideSign || 1); else V.scale(this.fwd, way, g.fakie ? -1 : 1);
    V.scale(this.v, way, g.speed); void t;
    /* THE CATCH: from where the trucks met the rail onto it over catchT — the offset eased out (its rate in the velocity: the board moves
       there), the board's attitude turned from its own to the rail's. Across the rail, level, the board comes on at the rate it came in with
       (a cubic from its offset AND its own sideways speed to rest on the line — 10-16, the supervisor's 5a: eased from rest, the board drifting
       onto the Main Ledge from the Pad at 3.4 m/s stopped dead at the catch and was then eased the last 8 cm on: its path took 1.04 cm and
       gave it back); up and along, the catch stops it, as a landing does (the legs' impulse class) */
    const c = g.catch;
    if (c) {
      const T = PH.grind.catchT, u = Math.min(1, (this.t - g.t0) / T), w = 1 - u * u * (3 - 2 * u), dw = -6 * u * (1 - u) / T;
      if (!c.off) {
        c.off = [c.p[0] - this.p[0], c.p[1] - this.p[1], c.p[2] - this.p[2]];
        const nh = V.norm([0, 0, 0], V.cross([0, 0, 0], way, Y)); c.nh = nh;
        /* across, the plan the steer began, carried: its offset, its rate against the rail's own and its acceleration (THE WAY ONTO THE RAIL,
           PLANNED: steerToRail) — the cubic over catchT from the offset and the rate it came in with braked the Basin's transfer at 164 m/s² */
        const sa = c.steerA || [0, 0];
        c.across = { u: V.dot(c.off, nh), ud: V.dot(c.v, nh) - V.dot(this.v, nh), udd: sa[0] * nh[0] + sa[1] * nh[2] };
        V.addScaled(c.off, c.off, nh, -c.across.u);                                  // the rest of the offset: up and along
      }
      const ac = c.across, a0 = ac.u; planned(ac, 0, Math.max(PH.step, T - (this.t - g.t0)), PH.step, PH.grind.catchA);
      if (w <= 0 && Math.abs(ac.u) < 1e-4 && Math.abs(ac.ud) < 1e-3) { g.catch = null; return; }
      const a = ac.u, va = ac.ud; void a0;
      V.addScaled(this.p, this.p, c.off, Math.max(0, w)); V.addScaled(this.p, this.p, c.nh, a);
      if (w > 0) V.addScaled(this.v, this.v, c.off, dw); V.addScaled(this.v, this.v, c.nh, va);
      V.norm(this.up, V.lerp(S[4], this.up, c.up, w));
      V.norm(this.fwd, V.reject(S[5], V.lerp(S[5], this.fwd, c.fwd, w), this.up));
    }
  }
  stepGrind(dt, input) {
    const g = this.grind, r = g.rail, tan = S[1], q = S[0];
    /* a slide held still on the pad while golden turns the board over: a Darkslide */
    if (g.slide && this.golden && g.name !== 'Darkslide' && this.hold && Math.hypot(this.hold.x, this.hold.y) < 0.2) { g.heldFor = (g.heldFor || 0) + dt; if (g.heldFor * 1000 >= TRICKS.specials.slide.holdMs) { g.name = 'Darkslide'; this.events.push({ type: 'grindStart', name: 'Darkslide', rail: r.id, group: r.group, surface: r.surface, slide: true, special: true }); } }
    else if (g.slide) g.heldFor = 0;
    this.railPoint(r, g.s, q, tan);
    const slope = tan[1] * g.dir;                     // rising (+) or falling (−) along the way the board goes
    g.speed += (-g.mu * PH.gGround * Math.sqrt(Math.max(0, 1 - slope * slope)) - PH.gGround * slope) * dt;
    this.stepNeedle(dt, 'x');
    if (this.state !== 'grind') return;
    if (g.speed < 0.35) { this.leaveRail(false, 'stall'); return; }
    const ds = g.speed * dt * g.dir; g.s += ds; g.covered += Math.abs(ds);
    if (!r.loop && (g.s <= 0 || g.s >= r.length)) { this.placeOnRail(); g.s = V.clamp(g.s, 0, r.length); this.leaveRail(true, 'end'); return; }   // placed where the step carried it (clamped to the end first, it lost the step's move: a hiccup as it left)
    this.placeOnRail();
  }
  leaveRail(rollOff, why) {
    const g = this.grind;
    this.events.push({ type: 'grindEnd', name: g.name, rail: g.rail.id, group: g.rail.group, covered: g.covered, full: why === 'end' && g.covered >= g.rail.length - 0.5, time: this.t - g.t0, why });
    this.state = 'air';
    const t = V.norm(S[0], this.v);
    if (rollOff) V.addScaled(this.v, this.v, Y, 0.4);
    const inward = g.rail.inward || [0, 0, 0];   // no lift (3 cm in a step): the speed carries it off
    this.toAir('rail');
    this.air.fromRail = g.rail.id;
    if (!rollOff) { V.addScaled(this.v, this.v, inward, 0.6); this.v[1] = Math.max(this.v[1], 0.2); }
    this.grind = null;
    void t;
  }
  popOffRail(e) {
    const g = this.grind, A = this.assist;
    this.events.push({ type: 'grindEnd', name: g.name, rail: g.rail.id, group: g.rail.group, covered: g.covered, full: false, time: this.t - g.t0, why: 'pop' });
    const apex = (A.streamlined ? PH.popApex[1] : PH.popApex[0] + (PH.popApex[1] - PH.popApex[0]) * ((e.spd || 3) - 1) / 4) * PH.grind.popOff;
    V.addScaled(this.v, this.v, Y, Math.sqrt(2 * PH.gAir * apex));   // no lift (4 cm in a step): the speed carries it off the rail
    this.grind = null; this.state = 'roll';
    this.stats.pops++; this.events.push({ type: 'pop', nollie: !!e.nollie, surf: 'rail' });
    this.toAir('pop', e);
  }
  /* the balance needle: drifts more the longer it lasts and the more it is repeated; a thumb held to the side brings it back */
  stepNeedle(dt, axis) {
    const B = PH.balance, A = this.assist, on = this.state === 'grind' ? this.t - this.grind.t0 : this.manual ? this.t - this.manual.t0 : this.lip ? this.t - this.lip.t0 : 0;
    const k = B.k0 + B.kAssist * (axis === 'x' ? A.grind : A.balance) / 100;
    const sigma = B.sigma0 + B.sigmaT * on + B.sigmaRepeat * (this.repeats || 0);
    const noise = (this.rnd() * 2 - 1) * sigma * 6;
    const h = this.hold, input = h ? (axis === 'x' ? h.x : -h.y) : 0;
    this.needleV += (noise - k * this.needle * 4 - this.needleV * 2.5 + input * B.gain * 4) * dt;
    this.needle += this.needleV * dt;
    if (Math.abs(this.needle) >= 1) {
      const side = Math.sign(this.needle);
      if (this.state === 'grind') { this.leaveRail(false, 'balance'); this.toBail('balance', 2); }
      else if (this.state === 'manual') { this.endManual(false); this.toBail('balance', 1.5); }
      else if (this.state === 'lip') { this.toBail('balance', 1.5); }
      void side;
    }
  }
  stepManualNeedle(dt) { this.stepNeedle(dt, 'y'); if (this.state === 'manual' && (V.len(this.v) < PH.manual.minSpeed || (this.manual && this.manual.byHold && !this.hold))) this.endManual(true); }
  startManual(nose) { if (this.state !== 'roll') return; this.state = 'manual'; this.manual = { nose, t0: this.t, from: this.p.slice(), dist: 0 }; this.needle = 0; this.needleV = 0; this.stats.manuals++; this.events.push({ type: 'manualStart', name: nose ? 'Nose Manual' : 'Manual' }); }
  endManual(clean) { if (!this.manual) return; const m = this.manual; this.events.push({ type: 'manualEnd', name: m.nose ? 'Nose Manual' : 'Manual', time: this.t - m.t0, from: m.from, to: this.p.slice(), clean }); this.manual = null; if (this.state === 'manual') this.state = 'roll'; }

  /* ---------------- LIP TRICKS ---------------- */
  tryLip() {
    if (!(this.surface === 'ramp' && this.up[1] < 0.5 && V.dot(this.v, Y) > 0)) return false;
    if (this.v[1] > PH.lip.maxUp) return false;
    let best = null, bd = 0.09;
    for (const r of this.world.rails) {
      if (r.kind !== 'coping') continue;
      for (let i = 0; i + 1 < r.pts.length; i++) { const d = segDist2(this.p, r.pts[i], r.pts[i + 1]); if (d < bd) { bd = d; best = { r, i }; } }
    }
    if (!best) return false;
    const dir = this.lipHeld, name = dir == null ? 'Axle Stall' : Math.abs(dir) <= 30 ? 'Axle Stall' : dir > 30 && dir < 150 ? 'Nose Stall' : dir < -30 && dir > -150 ? 'Rock to Fakie' : 'Blunt Stall';
    this.lip = { name, t0: this.t, rail: best.r, at: this.p.slice(), n: [this.up[0], 0, this.up[2]] };
    const a = best.r.pts[best.i], b = best.r.pts[best.i + 1], ab = V.sub(S[0], b, a), t = V.clamp(V.dot(V.sub(S[1], this.p, a), ab) / V.dot(ab, ab), 0, 1);
    V.addScaled(this.p, a, ab, t); this.p[1] += 0.01;
    V.set(this.v, 0, 0, 0); this.state = 'lip'; this.needle = 0; this.needleV = 0; this.stats.lips++;
    this.events.push({ type: 'lipStart', name });
    return true;
  }
  stepLip(dt) {
    this.stepNeedle(dt, 'y');
    if (this.state !== 'lip') return;
    if (this.lipHeld == null || this.t - this.lip.t0 > 4) this.dropIn(false);
  }
  dropIn(fast) {
    const L = this.lip, n = L.n, nl = Math.hypot(n[0], n[2]) || 1, out = [n[0] / nl, 0, n[2] / nl];
    this.events.push({ type: 'lipEnd', name: L.name, time: this.t - L.t0 });
    /* back down the wall it came up, tail first */
    V.set(this.p, L.at[0] + out[0] * 0.05, L.at[1] - 0.05, L.at[2] + out[2] * 0.05);
    V.set(this.v, 0, -(fast ? 2.4 : PH.lip.dropSpeed), 0);
    this.state = 'roll'; this.lip = null; this.fakie = !this.fakie; this.landT = 0;
    this.attach();
  }
  startRevert(side) {
    this.revert = { side, t: 0 };
    V.scale(this.fwd, this.fwd, -1); V.scale(this.v, this.v, PH.revert.keep);
    this.stats.reverts++;
    this.events.push({ type: 'revert', name: (side > 0 ? 'FS' : 'BS') + ' Revert' });
  }

  /* WHAT A CAPPED SLIDE LEFT (10-17, the supervisor: "when the 3 bumps are spent and movement remains, count it ... so the limit is never a
     silent discard"): the most move a step's slides could not make — the roll's three bumps, the walls' one slide, the air's three — and
     where; every sweep reads it (tests/lib/ride.mjs W.dropped) and says it as a REPORTED line */
  noteDropped(m, where, unit = 'm') { if (!(m > 0)) return; const D = this.drops || (this.drops = {}); if (!D[where] || m > D[where].v) D[where] = { v: m, unit };
    if (unit === 'm' && m > (this.dropMove || 0)) { this.dropMove = m; this.dropWhere = where; } }
  /* ---------------- BAIL ---------------- */
  toBail(why, impact) {
    if (this.state === 'bail') return;
    this.crossing = null; this.dropping = null; this.ahead = null; this.catchTurn = null;
    if (this.state === 'grind' && this.grind) this.events.push({ type: 'grindEnd', name: this.grind.name, rail: this.grind.rail.id, group: this.grind.rail.group, covered: this.grind.covered, full: false, why: 'bail' });
    if (this.state === 'manual') this.manual = null;
    this.bail = { t0: this.t, why, at: this.p.slice(), v: this.v.slice(), impact };
    this.state = 'bail'; this.air = null; this.grind = null; this.lip = null; this.stats.bails++;
    this.events.push({ type: 'bail', why, impact, at: this.p.slice(), v: this.v.slice() });
  }
  stepBail(dt, input) {
    const b = this.bail, el = this.t - b.t0;
    /* the body slides to a stop where it fell (the view tumbles it) */
    V.scale(b.v, b.v, Math.max(0, 1 - dt * 3));
    const tapped = (input.events || []).some((e) => e.type === 'tap');
    if (el >= PH.bail.back || (tapped && el >= PH.bail.skipAfter)) {
      const spot = this.respawnSpot();
      if (spot) this.respawnAt(spot[0], spot[1], 0);
      this.stats.respawns++;
      this.events.push({ type: 'respawn', at: this.p.slice() });
    }
  }

  /* what the view and the HUD read */
  read() {
    return { state: this.state, p: this.p.slice(), v: this.v.slice(), speed: V.len(this.v), up: this.up.slice(), fwd: this.fwd.slice(), fakie: this.fakie, switch: this.switch, lean: this.lean, crouch: this.crouch,
      trick: this.air && this.air.trick ? { name: this.air.trick.name, prog: this.air.trick.prog, flip: this.air.trick.flip, shove: this.air.trick.shove } : null,
      grab: this.air && this.air.grab ? this.air.grab.name : null, grind: this.grind ? this.grind.name : null, manual: this.manual ? (this.manual.nose ? 'nose' : 'tail') : null,
      lip: this.lip ? this.lip.name : null, needle: this.needle, wobble: this.wobble, surface: this.surface, pushing: this.pushing, braking: this.braking, revert: this.revert,
      stroke: this.stroke ? { phase: this.stroke.phase, t: this.stroke.t, dist: this.stroke.dist, drive: this.stroke.drive, lift: this.stroke.lift || 0, n: this.stroke.n, quick: this.stroke.quick, seg: this.stroke.seg, backT: this.stroke.backT, segT: this.t - this.stroke.t0 } : null, footWait: !!this.footWait,
      glide: this.t < (this.nextPushAt || 0), ahead: this.ahead ? V.scale([0, 0, 0], this.ahead.ax, this.ahead.ang) : null };   // leaning into a drop: the turn the body reaches for, beyond the board's (an axis × angle in the world)   // between two strokes of a push held (the step home, then riding): the next one coming
  }
}

/* the closest points of two segments p1–q1 and p2–q2 (Ericson, Real-Time Collision Detection §5.1.9): s along the first, t along the second, the
   second's point q, their distance d */
function closestOnSegments(p1, q1, p2, q2) {
  const d1 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]], d2 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]], r = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  const a = V.dot(d1, d1), e = V.dot(d2, d2), f = V.dot(d2, r), c = V.dot(d1, r), b = V.dot(d1, d2), den = a * e - b * b;
  let s = den > 1e-12 ? V.clamp((b * f - c * e) / den, 0, 1) : 0, t = e > 1e-12 ? (b * s + f) / e : 0;
  if (t < 0) { t = 0; s = a > 1e-12 ? V.clamp(-c / a, 0, 1) : 0; } else if (t > 1) { t = 1; s = a > 1e-12 ? V.clamp((b - c) / a, 0, 1) : 0; }
  const c1 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s], q = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
  return { s, t, q, d: Math.hypot(c1[0] - q[0], c1[1] - q[1], c1[2] - q[2]) };
}
function segDist2(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2], L2 = abx * abx + aby * aby + abz * abz;
  const t = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby + (p[2] - a[2]) * abz) / L2)) : 0;
  const x = a[0] + abx * t - p[0], y = a[1] + aby * t - p[1], z = a[2] + abz * t - p[2];
  return x * x + y * y + z * z;
}
