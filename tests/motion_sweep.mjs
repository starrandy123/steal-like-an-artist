/* THE MOTION OVER EVERY CASE (the supervisor, 10-16: "each reading drives one scenario … a scenario sweep, every reading over every case"):
 * the real sim and the real pose as the page runs them (tests/lib/figure.mjs) on the flat (one ledge for the grinds), over
 *   PUSH     pushing from 0, 3, 5 and 6.5 m/s at steer 0, ±0.6 and ±1, then let go (from rest after 0.3 s standing still);
 *   RELEASE  the thumb let go in each phase of a stroke: the reach; early, mid and late in the drive; the swing — at 0, 3 and 5 m/s, straight
 *            and turning;
 *   ACTION   an ollie (a touch flick and the keyboard's Space), a manual (a held pull and M), the brake, each begun in each phase; and a
 *            grind, the pop onto the ledge met in each phase.
 * Read on every frame of every case (each reading names its worst case):
 *   1. THE GAIN IS THE PLANTED FOOT'S: every sim step that gains speed on the flat is a step of a drive — and (2) the posed foot is down and
 *      still through every drive: the force only while the foot is planted (read by step: a frame holds two, and its gain read against the
 *      frame's END pose blamed the lift for the drive's last step).
 *   2. THE PLANTED FOOT HOLDS: through every drive (after the frame it lands) the foot down and still, and the leg short of straight (< 0.99).
 *   3. THE PUSH'S PEAK: the speed gained at most 13.5 m/s² — the owner's game choice of 1.3 g (10-16: "Stronger pushes, 2.1 s"; a strong
 *      push is about 0.9 g): its bound still well under a kick's (a 25 ms kick read 37–80 m/s²).
 *   4. THE FORCE IS SPREAD OVER THE CONTACT: every drive of 4 frames or more gains on at least 70 % of them.
 *   5. NO POPS: every joint under 1,500°/s; and THE HIPS RIDE THE LEGS (tests/lib/legs.mjs, the supervisor's classes, 10-16): their world
 *      acceleration on the ground ≤ 60 m/s², in the 0.2 s after a pop, a landing or a catch ≤ 150, in the air reported; within the legs' reach
 *      of the board (sink ≤ 15 cm, rise ≤ 3, sway ≤ 8) and the legs never past 0.98 of straight; the feet pinned (≤ 1.5 cm RMS, ≤ 4 through an
 *      impulse). (Read as their speed against the board it had been ≤ 3 m/s: the legs now give, on purpose.)
 *   6. BOTH FEET ON THE DECK in an air, a grind and a manual (each ball over the deck — within 12 cm of its middle across, within its length
 *      along — and its sole not below the deck's top): a trick met with the foot home has both on from its first frame; a trick met mid-
 *      stroke (the wait capped, the foot finishing its step home inside it: the supervisor's call, 10-16) has both on by 75 ms into it and
 *      never off again in it.
 *   7. A SETTLED START: from standing still, the hips turn at most 600°/s into the first stroke.
 *   8. THE FOOT COMES BACK LOW: off the ground and not on the deck, the sole at most 12 cm up.
 *   9. THE ADDED LATENCY: the time a pop or a manual is held for the foot (the sim's own 'footHome'), over every case — the touch flicks
 *      and pulls, Space and M, the reader's fastest legal flicks under Cruise and Classic — at most 50 ms (the supervisor, 10-16: Cruise pops
 *      an unloaded swipe 17 ms after the thumb lands, and a wait for the whole step home was a late ollie at every ledge).
 *  11. THE CADENCE (the supervisor's M6, 10-16: held, the strokes came 158–188 a minute; real skaters push 30–75 a minute at 2.2–3.9 m/s —
 *      Crockett & Jensen, ISBS 2007): with the push held, past a standing start's first strokes, no two plants at 2 m/s or more closer than
 *      0.8 s (75 a minute), and between them the back foot rides on the deck a while (at least 0.15 s): a glide, not a sewing machine.
 *  10. THE FOOT MEETS THE GROUND AT ITS SPEED: the planted foot's speed over the ground in the frame it lands, at most 2 m/s (it came down at
 *      rest on the board — at the board's own speed over the ground, 7.9 m/s at 6.5 m/s, a skid at every plant; matched, 1.7 at worst, in
 *      the hardest turn at 6.5 m/s).
 * Reported, not walled: the stroke's foot's peak speed over the board in each phase, and the waits by what met the foot out. The verdict
 * is the last line. */
import { figure, LEDGE, BOARD, PHYSICS } from './lib/figure.mjs';
import { flick, pull } from './lib/rig.mjs';
import { legsReader, pinRms, HIPS, REACH, FEET } from './lib/legs.mjs';
import { chain, CENSUS } from './lib/chain.mjs';
/* WHERE IT STARTS (tests/lib/chain.mjs): every case's chain, by its name; under a RED gate, the chain of its worst case at its worst time */
const CHAINS = new Map();
const okB = (c, m, label) => { ok(c, m); if (c || !label) return; let nm = ''; for (const k of CHAINS.keys()) if (label.includes(k) && k.length > nm.length) nm = k; const T = (String(label).match(/ at (\d+\.\d+) s/) || [])[1];
  if (nm && T) console.log('  ↳ ' + CHAINS.get(nm).sayAt(+T)); else ok(false, 'A RED GATE NAMES ITS FRAME: the gate above handed the chain ' + JSON.stringify(String(label)) + ', which names ' + (nm ? 'no time' : 'no run of the sweep') + ' — where it starts is unread'); };
const POSE_MAX = 100, FRAME = 2 * PHYSICS.step, SOLE = 0.045, DOWN = 0.012, STILL = 0.05, A_MAX = 13.5, JOINT_MAX = 1500, START_MAX = 600, LIFT_MAX = 0.12;
const LEGS_W = { ground: { v: 0, at: '' }, impulse: { v: 0, at: '' }, air: { v: 0, at: '' }, sink: 0, rise: 0, sway: 0, gapAt: '', straight: { v: 0, at: '' }, pinSq: 0, pinN: 0, pinImpulse: { v: 0, at: '' } };
const W = { gainOff: [], held: { sole: 0, slide: 0, stretch: 0, at: '' }, acc: { v: 0, at: '' }, spread: { v: 1, at: '' }, joint: { v: 0, at: '' },
  deck: { n: 0, frames: 0, at: '', worst: '' }, pose: { v: 0, at: '' }, deckOut: { n: 0, frames: 0, eps: 0, worst: '' }, cadence: { gaps: 0, fast: 0, at: '', ride: 1e9, rideAt: '' }, start: { v: 0, at: '' }, lift: { v: 0, at: '' }, waits: [], footPeak: {}, land: { v: 0, at: '' } };
let cases = 0, fails = 0;
const flat = (sk) => sk.state === 'roll' && sk.surface !== 'ramp' && sk.up[1] > 0.995;
/* one case: the setup, a script run before each frame (it sets the thumbs, the keys, the throttle), the seconds; every reading on every frame */
function run(name, o, script, secs) {
  cases++;
  const G = figure(o), R = G.R, sk = R.sk, LR = legsReader(G, FRAME), CH = chain(G, FRAME, Math.ceil(secs / FRAME) + 8), ph = []; CH.name = name; CHAINS.set(name, CH); let prev = null, drive = null, startTurn = null, ep = null, plants = [], ride = 0;
  const quick = o.speed < 1 ? 3 : 0;   // a standing start's first strokes may run straight on
  for (let f = 0; G.t < secs; f++) {
    script(G, f);
    const nEv = R.log.length, m = G.frame(), evs = R.log.slice(nEv);
    if (sk.state === 'bail' || evs.some((e) => e.type === 'bail')) { LR.reset(); CH.reset(); ph.length = 0; } else { LR.frame(sk.state, evs, name, { stroking: !!sk.stroke }); CH.frame(f, sk, evs); }
    /* the pose's own hips, before any follower (the chain's pose stage): a crouch or a dip thrown in a frame — on the ground (in the air, the
       airs' class) */
    if (G.F.state.poseHips) { ph.push(G.F.state.poseHips.clone()); if (ph.length > 3) ph.shift(); if (ph.length === 3 && sk.state !== 'air') { const a = ph[2].clone().sub(ph[1].clone().multiplyScalar(2)).add(ph[0]).length() / (FRAME * FRAME); if (a > W.pose.v) W.pose = { v: a, at: name + ' at ' + G.t.toFixed(2) + ' s (' + sk.state + ')' }; } }
    /* the stroke and the speed the figure is DRAWN with (figure.js drawn): a frame's foot is read against its own phase */
    const DS = G.drawnState, st = DS.stroke, speed = Math.hypot(DS.v[0], DS.v[2]), bB = G.ball('R'), bF = G.ball('L'), soleB = bB.y - SOLE, lB = G.local(bB), lF = G.local(bF);
    const label = name + ' at ' + G.t.toFixed(2) + ' s (' + sk.state + (st ? ' ' + st.phase + ' ' + (st.t * 1000).toFixed(0) + ' ms' : '') + ')';
    const groundV = prev && prev.down && soleB < DOWN ? Math.hypot(bB.x - prev.bB.x, bB.z - prev.bB.z) / FRAME : null;
    /* 1, 3: the gain */
    if (prev && flat(sk) && prev.flat) {
      const gain = speed - prev.speed, acc = gain / FRAME;
      if (acc > W.acc.v) W.acc = { v: acc, at: label };
      for (const k of m.steps) if (k.flat && k.gain > 0.00075 && k.phase !== 'drive') W.gainOff.push(label + ': ' + (k.gain * 1000).toFixed(2) + ' mm/s gained in a step of ' + (k.phase || 'no stroke'));
      if (drive) { drive.n++; if (gain > 0.0015) drive.gain++; }
    }
    /* 2: the planted foot, after the frame it lands */
    if (st && st.phase === 'drive') {
      if (!drive || drive.seg !== st.seg) { if (drive && drive.n >= 4 && drive.gain / drive.n < W.spread.v) W.spread = { v: drive.gain / drive.n, at: drive.at }; drive = { seg: st.seg, n: 0, gain: 0, first: true, at: label };
        if (prev) { const v = Math.hypot(bB.x - prev.bB.x, bB.z - prev.bB.z) / FRAME; if (v > W.land.v) W.land = { v, at: label }; } }
      else {
        const stretch = G.stretch('R'), slide = groundV == null ? 0 : groundV;
        if (soleB > W.held.sole || slide > W.held.slide || stretch > W.held.stretch) W.held = { sole: Math.max(W.held.sole, soleB), slide: Math.max(W.held.slide, slide), stretch: Math.max(W.held.stretch, stretch), at: label };
      }
    } else if (drive) { if (drive.n >= 4 && drive.gain / drive.n < W.spread.v) W.spread = { v: drive.gain / drive.n, at: drive.at }; drive = null; }
    /* 5: pops */
    if (m.joint > W.joint.v) W.joint = { v: m.joint, at: m.jointAt + ' in ' + label };
    { const B = W.byBone || (W.byBone = {}); if (m.jointAt && (!B[m.jointAt] || m.joint > B[m.jointAt].v)) B[m.jointAt] = { v: m.joint, at: label }; }   // each joint's own fastest (the arms' margin, below)
    /* 6: both feet on the deck in the air, on a grind, in a manual */
    if (sk.state === 'air' || sk.state === 'grind' || sk.state === 'manual') {
      /* an episode: from the sim's own start of it (the air's, the manual's), begun with the foot home or with it still stepping home */
      if (!ep) { const t0 = sk.state === 'air' && sk.air ? sk.air.t0 : sk.state === 'manual' && sk.manual ? sk.manual.t0 : sk.t; ep = { t0, out: !!sk.stroke, on: false }; if (ep.out) W.deckOut.eps++; }
      const off = [['back', lB], ['front', lF]].map(([w, l]) => (Math.abs(l.x) > 0.12 || Math.abs(l.z) > BOARD.length / 2 || l.y - SOLE < -0.005) ? w + ' ' + [l.x, l.y - SOLE, l.z].map((v) => (v * 100).toFixed(1)).join('/') + ' cm' : null).filter(Boolean);
      const into = sk.t - ep.t0;
      if (!ep.out) { W.deck.frames++; if (off.length) { W.deck.n++; if (!W.deck.worst) W.deck.worst = off.join(', ') + ' — ' + label; } }
      else { W.deckOut.frames++; if (off.length && (ep.on || into > 0.075)) { W.deckOut.n++; if (!W.deckOut.worst) W.deckOut.worst = off.join(', ') + ' at ' + (into * 1000).toFixed(0) + ' ms in' + (ep.on ? ', after both were on' : '') + ' — ' + label; } if (!off.length) ep.on = true; }
    } else if (sk.state === 'roll' || sk.state === 'bail') ep = null;
    /* 7: the settled start (the first stroke from standing still) */
    if (o.speed === 0 && st && st.n <= 1 && st.phase !== 'back') { if (!startTurn) startTurn = true; if (m.joint > 0 && m.jointAt === 'hips' && m.joint > W.start.v) W.start = { v: m.joint, at: label }; }
    /* 8: the foot's way forward and home: off the ground and not on the deck */
    if (st && (st.phase === 'swing' || st.phase === 'back' || st.phase === 'reach') && Math.abs(lB.x) > 0.12 && soleB > W.lift.v) W.lift = { v: soleB, at: label };
    /* the foot's speed over the board, by phase (reported) */
    if (prev && st && prev.phase === (st.phase + (st.quick ? '·quick' : ''))) { const k = st.phase + (st.quick ? '·quick' : ''), v = lB.distanceTo(prev.lB) / FRAME; if (!W.footPeak[k] || v > W.footPeak[k].v) W.footPeak[k] = { v, at: label }; }
    /* the cadence: each plant's time and speed; the time the back foot rides on the deck since the last */
    const onDeck = Math.abs(lB.x) <= 0.12 && Math.abs(lB.z) <= BOARD.length / 2 && lB.y - SOLE > -0.005;
    if (onDeck && sk.state === 'roll') ride += FRAME;
    for (const e of R.log.splice(0)) {
      if (e.type === 'footHome') W.waits.push({ ms: e.waited * 1000, at: label, kind: o.kind || '' });
      if (e.type === 'push' && o.held) {
        const v = Math.hypot(sk.v[0], sk.v[2]), p = plants[plants.length - 1], te = e.ms / 1000;   // (the sim's own time of it: a frame's quantum off by the frame it was read in)
        if (p && plants.length >= quick && p.v >= 2) { W.cadence.gaps++; const gap = te - p.t, spm = 60 / gap; if (spm > W.cadence.fast) W.cadence = Object.assign(W.cadence, { fast: spm, at: (gap * 1000).toFixed(0) + ' ms after a plant at ' + p.v.toFixed(1) + ' m/s — ' + label }); if (ride < W.cadence.ride) Object.assign(W.cadence, { ride, rideAt: label }); }
        plants.push({ t: te, v }); ride = 0;
      }
    }
    prev = { speed, flat: flat(sk), bB: bB.clone(), lB: lB.clone(), down: soleB < DOWN, phase: st ? st.phase + (st.quick ? '·quick' : '') : null };
  }
  /* the body on its legs, this case's worst into the sweep's */
  const L = LR.W, LW = LEGS_W;
  for (const k of ['ground', 'impulse', 'air']) if (L[k].v > LW[k].v) LW[k] = { v: L[k].v, at: L[k].at };
  if (L.gap.sink > LW.sink) { LW.sink = L.gap.sink; LW.gapAt = L.gap.at; } LW.rise = Math.max(LW.rise, L.gap.rise); LW.sway = Math.max(LW.sway, L.gap.sway);
  if (L.straight.v > LW.straight.v) LW.straight = { v: L.straight.v, at: L.straight.at };
  LW.pinSq += L.pin.sq; LW.pinN += L.pin.n; if (L.pin.worstImpulse > LW.pinImpulse.v) LW.pinImpulse = { v: L.pin.worstImpulse, at: L.pin.at };
  return G;
}
/* drive the case's figure until its stroke is in `phase` at fraction `u` of it (the second stroke, or the first's reach) */
const inPhase = (sk, phase, u) => { const st = sk.stroke; if (!st || st.phase !== phase) return false; if (phase === 'reach') return st.t >= u * PHYSICS.push.reach; if (phase === 'drive') return st.n >= 2 && st.t >= u * st.drive; if (phase === 'swing') return st.n >= 1 && st.t >= u * PHYSICS.push.swing; return true; };
const PHASES = [['reach', 'reach', 0.5], ['drive-early', 'drive', 0.2], ['drive-mid', 'drive', 0.5], ['drive-late', 'drive', 0.85], ['swing', 'swing', 0.5]];
const SPEEDS = [0, 3, 5, 6.5], STEERS = [0, 0.6, -0.6, 1, -1];

/* PUSH: from each speed at each steer; from rest, 0.3 s standing still first */
for (const v of SPEEDS) for (const steer of STEERS) {
  run('push from ' + v + ' m/s steer ' + steer, { at: [60, 0, 150], heading: 90, speed: v, held: true }, (G) => { const R = G.R; R.steer = steer; R.throttle = (v === 0 && G.t < 0.3) || G.t > (v === 0 ? 2.7 : 2.2) ? 0 : 1; }, v === 0 ? 3.4 : 3.0);
}
/* RELEASE in each phase */
for (const v of [0, 3, 5]) for (const steer of [0, 0.6]) for (const [pn, ph, u] of PHASES) {
  let let_go = false;
  run('let go in the ' + pn + ' from ' + v + ' m/s steer ' + steer, { at: [60, 0, 150], heading: 90, speed: v }, (G) => { const R = G.R; R.steer = steer; if (!let_go && inPhase(R.sk, ph, u)) let_go = true; R.throttle = let_go ? 0 : 1; }, 3.0);
}
/* ACTIONS begun in each phase: an ollie by a touch flick and by Space, a manual by a held pull and by M, the brake */
const ACTIONS = {
  'ollie (flick)': (G) => G.R.thumb(flick('Ollie')),
  'ollie (Space)': (G) => { G.R.load = 0.8; G.spaceAt = G.t; },
  'manual (pull)': (G) => G.R.thumb(pull(22, 900)),
  'manual (M)': (G) => { (G.R.keys || (G.R.keys = [])).push({ type: 'manual', on: true, nose: false }); G.mAt = G.t; },
  brake: (G) => { G.braking = true; },
};
for (const v of [0, 3, 5]) for (const [pn, ph, u] of PHASES) for (const [an, act] of Object.entries(ACTIONS)) {
  let begun = false;
  run(an + ' begun in the ' + pn + ' from ' + v + ' m/s', { at: [60, 0, 150], heading: 90, speed: v, kind: an.split(' ')[0] }, (G) => {
    const R = G.R;
    if (!begun && inPhase(R.sk, ph, u)) { begun = true; act(G); }
    R.throttle = G.braking ? -1 : begun ? 0 : 1;
    if (G.spaceAt != null && G.t - G.spaceAt >= 0.1) { G.spaceAt = null; R.load = 0; (R.keys || (R.keys = [])).push({ type: 'pop', gesture: -2, nollie: false, load: 0.8, spd: 4 }, { type: 'trick', name: 'Ollie', acc: 4, spd: 4 }); }
    if (G.mAt != null && G.t - G.mAt >= 0.8) { G.mAt = null; R.keys.push({ type: 'manual', on: false }); }
  }, 2.6);
}
/* A GRIND: pushing along the ledge's line 0.3 m off it, popped 2.1 m before its start — from eight starting points a stroke apart, so the pop
   meets every phase */
for (let k = 0; k < 8; k++) run('grind, the pop met ' + k + '/8 through a stroke', { at: [LEDGE.x0 - 7 - k * 0.24, 0, LEDGE.z - 0.6], heading: 90, speed: 5.0, kind: 'grind' }, (G) => {
  const R = G.R; R.throttle = G.popped ? 0 : 1;
  if (!G.popped && R.sk.p[0] >= LEDGE.x0 - 2.1) { G.popped = true; R.thumb(flick('Ollie')); }
}, 3.2);
/* THE FASTEST LEGAL FLICK, begun in each phase (config reader: popMin 16 px at 0.45 px/ms; a load at 18 px): under Cruise 17 px straight
   up — or across — from the thumb's landing, in two samples (17 ms; 18 px up would first be a nose's load); under Classic a load of 19 px,
   then 16.5 px back from it (33 ms) */
const fastCruiseUp = [[0, 0, 0], [8.33, 0, -8.5], [8.33, 0, -17]], fastCruiseAcross = [[0, 0, 0], [8.33, 8.5, 0], [8.33, 17, 0]];
const fastClassic = [[0, 0, 0], [8.33, 0, 9.5], [8.33, 0, 19], [8.33, 0, 11], [8.33, 0, 2.5]];
for (const v of [0, 3, 5]) for (const [pn, ph, u] of PHASES) for (const [pre, pts] of [['cruise', fastCruiseUp], ['cruise', fastCruiseAcross], ['classic', fastClassic]]) {
  let begun = false;
  run('the fastest legal flick (' + pre + ') begun in the ' + pn + ' from ' + v + ' m/s', { at: [60, 0, 150], heading: 90, speed: v, preset: pre, kind: 'fastest' }, (G) => {
    const R = G.R; if (!begun && inPhase(R.sk, ph, u)) { begun = true; R.thumb(pts); } R.throttle = begun ? 0 : 1; }, 2.2);
}

/* THE READINGS */
const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fails++; };
console.log(cases + ' cases on the flat, read on every frame');
ok(W.gainOff.length === 0, 'THE GAIN IS THE PLANTED FOOT\'S: ' + W.gainOff.length + ' steps of gain outside a drive' + (W.gainOff.length ? ' — first: ' + W.gainOff.slice(0, 3).join(' · ') : ''));
okB(W.held.sole < DOWN && W.held.slide < STILL && W.held.stretch < 0.99, 'THE PLANTED FOOT HOLDS through every drive: its sole at most ' + (W.held.sole * 1000).toFixed(1) + ' mm up (< 12), it moves at most ' + (W.held.slide * 100).toFixed(1) + ' cm/s (< 5), the leg at most ' + W.held.stretch.toFixed(3) + ' of straight (< 0.99) — worst: ' + W.held.at, W.held.at);
okB(W.acc.v <= A_MAX, 'THE PUSH\'S PEAK: at most ' + W.acc.v.toFixed(2) + ' m/s² (≤ ' + A_MAX + ') — ' + W.acc.at, W.acc.at);
okB(W.spread.v >= 0.7, 'THE FORCE IS SPREAD OVER THE CONTACT: every drive gains on at least ' + (W.spread.v * 100).toFixed(0) + '% of its frames (≥ 70) — ' + W.spread.at, W.spread.at);
okB(W.pose.v <= POSE_MAX, 'THE POSE\'S OWN TARGETS ARE SMOOTH: the hips where the pose puts them, before any follower, accelerate at most ' + W.pose.v.toFixed(0) + ' m/s² (≤ ' + POSE_MAX + '; ' + W.pose.at + ')', W.pose.at);
okB(W.joint.v <= JOINT_MAX, 'NO POPS: the fastest joint ' + W.joint.v.toFixed(0) + '°/s (≤ ' + JOINT_MAX + '; ' + W.joint.at + ')', W.joint.at);
/* THE ARMS' MARGIN — reported (the supervisor, 10-17): the pop's air swing turns the right forearm at 97 % of the joints' bound (1,454°/s out of a
   stroke's reach), and a hand brought 3 cm nearer the body tipped it over (1,533): the body release's arm work (close and bent, the push and
   the pop) reads this line first, so the margin never creeps unseen */
{ const B = W.byBone || {}, arms = Object.keys(B).filter((k) => /^(fore|arm|hand|clav)/.test(k)).sort((a, b) => B[b].v - B[a].v);
  console.log('ℹ THE ARMS\' MARGIN — reported, for the body release\'s arm work: ' + (arms.length ? arms.slice(0, 4).map((k) => k + ' ' + B[k].v.toFixed(0) + '°/s (' + (100 * B[k].v / JOINT_MAX).toFixed(0) + ' % of ' + JOINT_MAX + '; ' + B[k].at + ')').join(' · ') : 'no arm joint was a frame\'s fastest')); }
{ const LW = LEGS_W, rms = Math.sqrt(LW.pinSq / Math.max(1, LW.pinN));
  okB(LW.ground.v <= HIPS.ground && LW.impulse.v <= HIPS.impulse, 'THE HIPS RIDE THE LEGS: their world acceleration at most ' + LW.ground.v.toFixed(0) + ' m/s² on the ground (≤ ' + HIPS.ground + '; ' + LW.ground.at + '), ' + LW.impulse.v.toFixed(0) + ' through a pop, a landing or a catch (≤ ' + HIPS.impulse + '; ' + LW.impulse.at + ')', (LW.ground.v > HIPS.ground ? LW.ground.at : LW.impulse.at));
  console.log('ℹ the hips in the air — reported (the airs\' class): at most ' + LW.air.v.toFixed(0) + ' m/s² (' + LW.air.at + ')');
  okB(LW.sink <= REACH.sink + 1e-6 && LW.rise <= REACH.rise + 1e-6 && LW.sway <= REACH.sway + 1e-6 && LW.straight.v <= REACH.straight && rms <= FEET.rms && LW.pinImpulse.v <= FEET.impulse, 'WITHIN THE LEGS\' REACH, THE FEET PINNED: the hips sink ' + (LW.sink * 100).toFixed(1) + ' (≤ ' + REACH.sink * 100 + '), rise ' + (LW.rise * 100).toFixed(1) + ' (≤ ' + REACH.rise * 100 + '), sway ' + (LW.sway * 100).toFixed(1) + ' cm (≤ ' + REACH.sway * 100 + '); the legs at most ' + LW.straight.v.toFixed(3) + ' of straight (≤ ' + REACH.straight + '; ' + LW.straight.at + '); the feet ' + (rms * 100).toFixed(2) + ' cm RMS off their pins (≤ ' + FEET.rms * 100 + '), ' + (LW.pinImpulse.v * 100).toFixed(1) + ' through an impulse (≤ ' + FEET.impulse * 100 + ')', (LW.straight.v >= REACH.straight ? LW.straight.at : LW.gapAt)); }
okB(W.deck.n === 0 && W.deck.frames > 100, 'BOTH FEET ON THE DECK, THE FOOT HOME: ' + W.deck.n + ' of ' + W.deck.frames + ' frames of an air, a grind or a manual met with the foot home with a foot off the deck' + (W.deck.worst ? ' — first: ' + W.deck.worst : ''), W.deck.at);
ok(W.deckOut.n === 0 && W.deckOut.eps > 10, 'BOTH FEET ON THE DECK, MET MID-STROKE: ' + W.deckOut.eps + ' tricks and manuals met with the foot out, ' + W.deckOut.frames + ' frames; ' + W.deckOut.n + ' with a foot off the deck past 75 ms in or after both were on' + (W.deckOut.worst ? ' — first: ' + W.deckOut.worst : ''));
okB(W.start.v <= START_MAX, 'A SETTLED START: the hips turn at most ' + W.start.v.toFixed(0) + '°/s into the first stroke from standing still (≤ ' + START_MAX + ') — ' + W.start.at, W.start.at);
okB(W.lift.v <= LIFT_MAX, 'THE FOOT COMES BACK LOW: off the ground and off the deck at most ' + (W.lift.v * 100).toFixed(1) + ' cm up (≤ 12) — ' + W.lift.at, W.lift.at);
const ws = (k) => W.waits.filter((w) => !k || w.kind === k).map((w) => w.ms).sort((a, b) => a - b), med = (a) => (a.length ? a[Math.floor(a.length / 2)] : 0), top = (a) => (a.length ? a[a.length - 1] : 0);
const bots = W.waits.filter((w) => w.kind !== 'fastest').map((w) => w.ms).sort((a, b) => a - b), all = ws(), fast = ws('fastest');
const byKind = {}; for (const w of W.waits) { const k = /\(Space\)|\(M\)/.test(w.at) ? w.at.match(/\((Space|M)\)/)[0] : w.kind === 'fastest' ? (/cruise/.test(w.at) ? 'fastest cruise' : 'fastest classic') : 'touch ' + w.kind; (byKind[k] = byKind[k] || []).push(w.ms); }
console.log('ℹ the waits by what met the foot out: ' + Object.entries(byKind).map(([k, a]) => { a.sort((x, y) => x - y); return k + ' ' + a.length + ' (median ' + med(a).toFixed(0) + ', worst ' + top(a).toFixed(0) + ' ms)'; }).join(' · '));
ok(top(all) <= 50 + 1e-6, 'THE ADDED LATENCY: ' + all.length + ' pops and manuals held for the foot, at most ' + top(all).toFixed(1) + ' ms (≤ 50), median ' + med(all).toFixed(1) + ' ms; the eye sees it up to one step later (' + (PHYSICS.step * 1000).toFixed(1) + ' ms: the frame is drawn between the last two steps, figure.js drawn)' + (top(all) > 50 ? ' — worst: ' + W.waits.sort((a, b) => b.ms - a.ms)[0].at : ''));
console.log('ℹ the stroke\'s foot over the board, its peak by phase: ' + Object.entries(W.footPeak).map(([k, p]) => k + ' ' + p.v.toFixed(2) + ' m/s').join(' · '));
okB(W.cadence.gaps > 20 && W.cadence.fast <= 75.5 && W.cadence.ride >= 0.15, 'THE CADENCE: ' + W.cadence.gaps + ' strokes held at 2 m/s or more, past a standing start\'s first three: at most ' + W.cadence.fast.toFixed(0) + ' a minute (≤ 75; ' + W.cadence.at + '); the back foot riding at least ' + (W.cadence.ride * 1000).toFixed(0) + ' ms between them (≥ 150' + (W.cadence.rideAt ? '; ' + W.cadence.rideAt : '') + ')', W.cadence.at);
okB(W.land.v <= 2, 'THE FOOT MEETS THE GROUND AT ITS SPEED: the planted foot lands at most ' + W.land.v.toFixed(2) + ' m/s over the ground (≤ 2) — ' + W.land.at, W.land.at);
/* THE CHAIN'S OWN CALIBRATION over every case of the sweep: none of its readings may break on this build (tests/lib/chain.mjs) */
{ const K = Object.keys(CENSUS).sort((a, b) => CENSUS[b].v - CENSUS[a].v), broke = K.filter((k) => CENSUS[k].v > 1);
  if (process.env.CHAIN_CENSUS) for (const k of K) console.log('  · chain ' + k + ': ' + (CENSUS[k].val >= 100 ? CENSUS[k].val.toFixed(0) : CENSUS[k].val.toFixed(2)) + ' ' + CENSUS[k].unit + ' (' + (100 * CENSUS[k].v).toFixed(0) + '% of ' + CENSUS[k].bound + '; ' + CENSUS[k].run + ', frame ' + CENSUS[k].f + ', ' + CENSUS[k].state + ')');
  ok(broke.length === 0, 'THE CHAIN IS QUIET ON THIS BUILD: ' + K.length + ' readings over every case, ' + (broke.length ? broke.length + ' over their bounds — ' + broke.slice(0, 4).map((k) => k + ' ' + (100 * CENSUS[k].v).toFixed(0) + '% (' + CENSUS[k].run + ', frame ' + CENSUS[k].f + ')').join(' · ') : 'the closest ' + K.slice(0, 3).map((k) => k + ' at ' + (100 * CENSUS[k].v).toFixed(0) + '%').join(' · '))); }
console.log('MOTION SWEEP: ' + (fails ? 'RED · ' + fails : 'GREEN'));
process.exit(fails ? 1 : 0);
