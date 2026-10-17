/* SMOOTH ON EVERY SURFACE (10-16, the owner: "now we need to work on smoothness when going down surfaces and grinding"): the real sim at 120 Hz
 * and the real pose every 1/60 s, on the real park — up the quarters to fakie and back, the Spine, into the Basin, down and up the Sun Bank,
 * and ollies onto the Main Ledge both ways and the Five Rail. Every frame, read:
 *   - THE DECK DOESN'T JUMP: a jump is a move the path takes and gives back — the drawn deck's frame-to-frame second difference one way,
 *     then straight back (a teleport; jitter): the smaller of the two, ≤ 1 cm. A change of speed — a landing, a catch, a pop — bends the
 *     path once and keeps the bend, and reads nothing (read against the sim's own velocity, each step's change hid in the step it began);
 *   - THE DECK FOLLOWS THE GROUND AT THE GROUND'S RATE: grounded, its turn against the turn of the plane through its four wheels' contacts with
 *     the park (four raycasts down at the wheels — the 4-raycast board of the references, CLEANROOM.md): a seam is crossed over the time the
 *     wheelbase takes to cross it, never in a frame;
 *   - THE BODY ON ITS LEGS (tests/lib/legs.mjs, the supervisor's classes): the hips' world acceleration on the ground ≤ 60 m/s², in the 0.2 s
 *     after a pop, a landing or a catch ≤ 150, in the air REPORTED; the legs' reach and straightness; the feet pinned (ringing: legs_step.mjs);
 *   - THE DECK'S JUMP is gated where the frames it spans are on the ground, REPORTED in the air (the airs' class, after the ragdoll);
 * A bail's frames are the fall's (its own bar, the ragdoll's). 
 *   - NO JOINT TURNS FASTER THAN 1,500°/s, the head included (the head looks along the line and turns to a new one over a time).
 * Each run's worst, and which frame. Usage: node tests/surfaces.mjs [run name filter] */
import { PHYSICS } from './lib/figure.mjs';
import { flick } from './lib/rig.mjs';
import { World } from '../build/js/sim/world.js';
import { pinRms, HIPS, REACH, FEET, BIG } from './lib/legs.mjs';
import { CENSUS, CHAINED } from './lib/chain.mjs';
import { ride as rideOn, own, FT, BOUND, ROLL, sayDropped } from './lib/ride.mjs';
import { GAP } from './lib/gap.mjs';
import { parkById } from '../build/js/parks/index.js';

let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
/* the park: the Plaza unless WL_PARK names another (its runs are its own: tests/parks/<id>.mjs surfaceRuns) */
const DEF = parkById(process.env.WL_PARK || 'waxline'), park = new World(DEF.PARK, DEF.TREES), only = process.argv[2] ? new RegExp(process.argv[2], 'i') : null, PRESETS = (process.env.WL_PRESETS || 'cruise,classic,raw').split(',');
const ride = (name, o, drive, frames) => (only && !only.test(name) ? null : rideOn(park, name, o, drive, frames));   // (the reader: tests/lib/ride.mjs)

/* the runs: [name, start, the drive each frame, frames] */
const coast = () => {};
const ollieWhen = (pred) => (G) => { if (!G.popped && pred(G.R.sk)) { G.popped = true; G.R.thumb(flick('Ollie')); } };
const RUNS = [];
for (const v of [4, 6, 8]) RUNS.push(['East Wall, up to fakie and back at ' + v + ' m/s', { at: [50, 0, 16], heading: 90, speed: v }, coast, 240]);
for (const v of [3, 4.5]) RUNS.push(['Lawn Quarter, up to fakie and back at ' + v + ' m/s', { at: [6.2, 0, 24], heading: 270, speed: v }, coast, 150]);
for (const v of [4, 6, 8]) RUNS.push(['Deck Quarter, up to fakie and back at ' + v + ' m/s', { at: [33, 0.8, 38], heading: 270, speed: v }, coast, 240]);
for (const v of [4, 5.5]) RUNS.push(['The Spine, up its east face at ' + v + ' m/s', { at: [14, 0, 24], heading: 270, speed: v, ...(v === 5.5 ? { deferred: { raw: 'TRICKS (the supervisor, 10-17): the hips 0.2 s after the pop, 155 m/s² — the pop sets the board\'s speed in one step; its class reading is the tricks release\'s' } } : {}) }, coast, 180]);
for (const v of [3, 5, 7]) RUNS.push(['The Basin, its floor into its wall at ' + v + ' m/s', { at: [9, -1.83, 10], heading: 90, speed: v }, coast, 180]);
/* INTO A RAMP OVER ITS COPING (the supervisor's calls (A) and per lip, 10-16): from the deck behind every lip with one, a metre back from its
   coping, across the speeds — rolled over it below the lip's own measured vStar, dropped in at it and over (every lip of this park: vStar 0,
   tests/vstar.mjs) — on the two assists that hold a run into a ramp (Raw rolls off and flies: A LEDGE'S END below, and camera_moving's rides) */
const INTO = [['The Basin', 'over its rim', [17, 0, 10], 270, [1, 2, 3, 5, 7]], ['The Deck Quarter', 'from its deck', [22, 2.63, 38], 90, [1, 2, 3, 5, 7]],
  ['East Wall', 'from its deck', [60, 1.83, 16], 270, [2, 5]], ['Lawn Quarter', 'from its deck', [0.5, 1.22, 24], 90, [2, 5]]];
/* (each run to its coping and 1.2 s past it — down the wall and out of it, never on across the plaza: unsteered, the East Wall's 5 m/s runs went on
   into the Slant Ledge 13 m away and bailed on its face) */
for (const pre of PRESETS) for (const [lip, way, at, heading, speeds] of INTO) for (const v of speeds) RUNS.push([lip + ', into it ' + way + ' at ' + v + ' m/s (' + pre + ')', { at, heading, speed: v, preset: pre }, coast, Math.round(60 * (1 / v + 1.2))]);
/* the supervisor, 10-16: a board rolled slowly into a block's side at an angle (the camera wall's Deck Quarter slanted 248 @7.5, unsteered, met
   the Pad so): stopped there square, it had been swung 17° in a step toward the velocity the wall left it, into the Pad */
RUNS.push(['The Pad\'s side, rolled into at 1.5 m/s 13° off square (unsteered)', { at: [24.7, 0, 25.6], heading: 167, speed: 1.5 }, coast, 120]);
/* ...and stopped against it, kickturned into it (a turn that would carry a wheel into the face it stands at: body.js turnClear) */
RUNS.push(['The Pad\'s side, rolled into at 1.5 m/s 13° off square, then kickturned into it', { at: [24.7, 0, 25.6], heading: 167, speed: 1.5 }, (G, f) => { G.R.steer = f >= 44 ? 1 : 0; }, 120]);
RUNS.push(['The Pad, rolled off its end going east at 4 m/s (a ledge\'s end)', { at: [22, 0.2, 24.1], heading: 90, speed: 4 }, coast, 150]);
for (const v of [2, 3, 5]) RUNS.push(['Sun Bank, down it at ' + v + ' m/s', { at: [43.5, 0.8, 34], heading: 180, speed: v, ...(v === 5 ? { deferred: Object.fromEntries(['cruise', 'classic', 'raw'].map((pre) => [pre, 'the next release (the supervisor, 10-17): a landing settling at its contact\'s rate, read as the deck not following the ground — the settle\'s own share is subtracted then'])) } : {}) }, coast, 120]);
for (const v of [4, 6]) RUNS.push(['Sun Bank, up it at ' + v + ' m/s', { at: [43.5, 0, 26], heading: 0, speed: v }, coast, 120]);
/* THE CATCH ONTO A RAIL AT ONE PACE — the next release's, each run with its own number on this build (the chain's every-run listing, 10-17:
   five runs behind the one the census named; at grind.catchA 30 every Main Ledge run is quiet, and the 60° boardslide and darkslide unreachable) */
const CATCH = (cm) => 'the next release (the supervisor, 10-17): the catch onto a rail at one pace (grind.catchA 50: here it moves the board ' + cm + ' cm; at 30 this run is quiet and the 60° boardslide is unreachable) — its across plan paced by the meeting\'s own angle';
const LEDGE = { 4: { deferred: { cruise: CATCH(1.03), classic: CATCH(1.14) } }, 5.5: { deferred: { classic: CATCH(1.14) } } };
for (const v of [4, 5.5]) RUNS.push(['Main Ledge, an ollie onto it going east at ' + v + ' m/s', { at: [27, 0, 22.7], heading: 90, speed: v, ...LEDGE[v] }, ollieWhen((sk) => sk.p[0] >= 28.3), 150]);
/* the supervisor's 5a (10-16): the Main Ledge from the Pad, as the states drive and motion.mjs ride it — a reading no wall owned (the chain saw
   the deck take 1.04 cm and give it back in this 50-50, in motion.mjs alone) */
RUNS.push(['Main Ledge from the Pad, an ollie onto it at 5.6 m/s (the states drive\'s way)', { at: [21, 0, 22.7], heading: 90, speed: 5.6, deferred: { cruise: CATCH(1.04) } }, ollieWhen((sk) => sk.p[0] >= 25.4), 180]);   // past the Pad (x 20.5–26.5): from on it, the run began with a drop
for (const v of [4, 5.5]) RUNS.push(['Main Ledge, an ollie onto it going west at ' + v + ' m/s', { at: [44, 0, 22.7], heading: 270, speed: v, ...LEDGE[v] }, ollieWhen((sk) => sk.p[0] <= 39.5), 150]);
for (const v of [3, 4.5]) RUNS.push(['An ollie on the plaza at ' + v + ' m/s (a clean step for the legs)', { at: [30, 0, 14], heading: 90, speed: v }, ollieWhen((sk) => sk.p[0] >= 31), 150]);
RUNS.push(['Five Rail, an ollie onto it down the stairs at 4.6 m/s', { at: [53, 0.8, 37.5], heading: 180, speed: 4.6 }, ollieWhen((sk) => sk.p[2] <= 34.3), 150]);
for (const [h, way] of [[65, 'north'], [115, 'south']]) RUNS.push(['East Wall coping, up the wall slanting ' + way + ' at 8.5 m/s', { at: [51, 0, 16], heading: h, speed: 8.5 }, coast, 180]);
/* REPORTED UNTIL THE GRIND RELEASE (the supervisor, 10-16): ridden on every preset and read by every gate, said, never gated — F2, a catch onto
   a down-sloping line from above it (the Box Rail off the Block's top: the deck took 1.24 cm and gave it back); F3, a flat bar's catch sinking
   2–3 cm under its lock (the Low Bar, as Kiln Yard's Pipe). The runs are orgo-u-48's probes' (waxline_map2/runs/probe_boxrail, probe_lowbar) */
for (const v of [3.5, 4, 4.5]) RUNS.push(['Box Rail, an ollie onto it off the Block\'s top at ' + v + ' m/s', { at: [43.5, 0.6, 8.75], heading: 90, speed: v, reported: 'F2, a catch onto a down-sloping line' }, ollieWhen((sk) => sk.p[0] >= 44.6), 150]);
for (const v of [4.5, 5.5]) RUNS.push(['Low Bar, an ollie onto it going east at ' + v + ' m/s', { at: [24.5, 0, 11.7], heading: 90, speed: v, reported: 'F3, a flat bar\'s catch sinking under its lock' }, ollieWhen((sk) => sk.p[0] >= 26.3), 150]);

/* EVERY RUN ON EVERY PRESET (F1, the supervisor's rule, 10-16: ridden on Cruise alone, the Plaza's runs went RED on five gates on the other
   two): a run that names no preset is ridden on each, its name saying which (WL_PRESETS=cruise,… to ride fewer). Each gate says what it holds
   on each: Raw has no vert assist, so its runs into a ramp roll off and fly, and its lip airs come down where physics puts them */
if (DEF.id !== 'waxline') RUNS.splice(0, RUNS.length, ...(await import('./parks/' + DEF.id + '.mjs')).surfaceRuns({ coast, ollieWhen }));
/* WL_RUNS=<file>: these cases on this park (a diagnosis: the same reading on the same runs, park against park) */
if (process.env.WL_RUNS) RUNS.splice(0, RUNS.length, ...(await import(new URL(process.env.WL_RUNS, 'file://' + process.cwd() + '/').href)).surfaceRuns({ coast, ollieWhen }));
const ALL = []; for (const [name, o, drive, frames] of RUNS) { if (o.preset) ALL.push([name, o, drive, frames]); else for (const pre of PRESETS) ALL.push([name + ' (' + pre + ')', Object.assign({}, o, { preset: pre }, o.deferred && o.deferred[pre] ? { reported: o.deferred[pre] } : {}), drive, frames]); }   /* (a run's `deferred[preset]`: named for that preset alone, the others gated) */
const out = [], reported = [];
for (const [name, o, drive, frames] of ALL) { const W = ride(name, o, drive, frames); if (W) { W.preset = o.preset; W.reported = o.reported || null; (W.reported ? reported : out).push(W); } }
/* THE REPORTED RUNS (F2, F3: the grind release's): every gate a run answers alone, said for each — never in the gates, never a failure */
const sayReported = (W) => { const L = W.legs, off = own(W).filter((x) => !x.ok);
  console.log('ℹ REPORTED until the grind release (' + W.reported + '): ' + W.name + ' [' + [...W.events].filter((e) => /grind|land|pop|bail/.test(e)).join(' ') + '] — ' + (off.length ? off.map((x) => x.gate + ' ' + (x.v >= 100 ? x.v.toFixed(0) : x.v.toFixed(3)) + ' (bound ' + x.bound + (x.at ? '; ' + x.at : '') + ')').join(' · ') : 'every gate it answers alone held') + ' · the deck ' + (W.jump * 100).toFixed(2) + ' cm · on the rail ' + (W.lock.under * 100).toFixed(2) + ' cm under its lock at most' + (W.lock.under > 0 ? ' (' + W.lock.at + ')' : '') + ', ' + (W.lock.over * 100).toFixed(2) + ' cm over · the hips through the catch ' + L.impulse.v.toFixed(0) + ' m/s²'); };
if (!out.length) { for (const W of reported) sayReported(W); console.log('SURFACES: GREEN · 0 runs gated' + (reported.length ? ' · ' + reported.length + ' REPORTED' : '') + (only ? ' (filtered: ' + process.argv[2] + ')' : '')); process.exit(only ? 0 : 1); }
for (const W of out) { const L = W.legs; console.log('  · ' + W.name + ' [' + [...W.states].join(' ') + '; ' + [...W.events].filter((e) => /grind|land|pop|bail/.test(e)).join(' ') + ']: jump ' + (W.jump * 100).toFixed(1) + ' cm (ℹ air ' + (W.jumpAir * 100).toFixed(1) + ') · hips ground ' + L.ground.v.toFixed(0) + ', impulse ' + L.impulse.v.toFixed(0) + ', ℹ air ' + L.air.v.toFixed(0) + ' m/s² · gap sink ' + (L.gap.sink * 100).toFixed(1) + ' rise ' + (L.gap.rise * 100).toFixed(1) + ' sway ' + (L.gap.sway * 100).toFixed(1) + ' cm · straight ' + L.straight.v.toFixed(3) + ' · pins ' + (pinRms(L) * 100).toFixed(2) + ' cm RMS, ' + (L.pin.worstImpulse * 100).toFixed(1) + ' through impulses · deck over its contacts ' + W.deckOver.toFixed(0) + '°/s · joints ' + W.joint.toFixed(0) + '°/s (' + W.jointAt + ')'); }
const worst = (f) => out.reduce((a, W) => (f(W) > f(a) ? W : a), out[0]), top = (f) => { const W = worst(f); return [f(W), W]; };
/* WHERE IT STARTS: under a RED gate, the chain of its worst run at its worst frame (tests/lib/chain.mjs) — the frame read off the gate's own
   record (a frame's number, or its time) */
const frameOf = (at) => { if (!at) return null; const m = String(at).match(/ at (\d+) \(/) || String(at).match(/^(\d+) \(/); if (m) return +m[1]; const t = String(at).match(/ at (\d+\.\d+) s/); return t ? Math.round(+t[1] / FT) - 1 : null; };
/* a filtered run (node tests/surfaces.mjs <name>) holds only its own runs: a gate over a KIND of run it filtered out is NOT READ, said, and no
   failure (10-16: the modding guide's one-ledge run read RED on four gates that need the Basin's and the Pad's runs). Unfiltered, an empty
   set stays a failure — the runs are there and none of them showed it */
let unreadN = 0; const unread = (set, name) => { if (!only || set.length) return false; unreadN++; console.log('— ' + name + ': not read — no run of its kind in this filter (' + process.argv[2] + ')'); return true; };
/* a RED gate hands the chain its frame (a number, or words frameOf reads) and the chain says where it starts; words that name no frame are the
   GATE's fault, said as its own red line, never a blame (10-17, the supervisor: the rail-end gate handed "1.283 s (4.60 m/s)", unread, and the
   line said the frame was never recorded — that is the chain's own word only when it holds no frame near a time, tests/lib/chain.mjs sayAt) */
const okB = (c, m, W, at) => { ok(c, m); if (!c && W && W.chain) { const N = typeof at === 'number' ? at : frameOf(at);
  if (N == null) ok(false, 'A RED GATE NAMES ITS FRAME: the gate above handed the chain ' + JSON.stringify(at == null ? null : String(at)) + ', which names no frame — where it starts is unread'); else console.log('  ↳ ' + W.chain.say(N)); } };
const [jg, wj] = top((W) => W.jump), [ja, wja] = top((W) => W.jumpAir), [dv, wd] = top((W) => W.deckOver), [jo, wo] = top((W) => W.joint);
const [hg, whg] = top((W) => W.legs.ground.v), [hi, whi] = top((W) => W.legs.impulse.v), [ha, wha] = top((W) => W.legs.air.v);
const [gs, wgs] = top((W) => W.legs.gap.sink), [gr, wgr] = top((W) => W.legs.gap.rise), [gw, wgw] = top((W) => W.legs.gap.sway), [ls, wls] = top((W) => W.legs.straight.v);
const [pr, wpr] = top((W) => pinRms(W.legs)), [pi, wpi] = top((W) => W.legs.pin.worstImpulse);
okB(jg <= BOUND.jump, 'the deck never jumps on the ground: a move the path takes and gives back, at most ' + (jg * 100).toFixed(1) + ' cm (≤ ' + BOUND.jump * 100 + '; ' + wj.name + ', frame ' + wj.jumpAt + ')', wj, wj.jumpAt);
console.log('ℹ the deck in the air — reported (the airs\' class, after the ragdoll): at most ' + (ja * 100).toFixed(1) + ' cm taken and given back (' + wja.name + ', frame ' + wja.jumpAirAt + ')');
okB(dv <= BOUND.deckOver, 'the deck follows the ground at the ground\'s rate: at most ' + dv.toFixed(0) + '°/s over its four wheels\' contacts (≤ ' + BOUND.deckOver + '; ' + wd.name + ', frame ' + wd.deckAt + ')', wd, wd.deckAt);
okB(hg <= HIPS.ground, 'the hips ride the legs on the ground: at most ' + hg.toFixed(0) + ' m/s² (≤ ' + HIPS.ground + '; ' + whg.name + ', ' + whg.legs.ground.at + ')', whg, whg.legs.ground.at);
okB(hi <= HIPS.impulse, 'the hips through an impulse (0.2 s after a pop, a landing, a catch): at most ' + hi.toFixed(0) + ' m/s² (≤ ' + HIPS.impulse + '; ' + whi.name + ', ' + whi.legs.impulse.at + ')', whi, whi.legs.impulse.at);
console.log('ℹ the hips in the air — reported (the airs\' class, after the ragdoll): at most ' + ha.toFixed(0) + ' m/s² (' + wha.name + ', ' + wha.legs.air.at + ')');
console.log(sayDropped([...out, ...reported], 'the Plaza\'s runs'));
ok(gs <= REACH.sink + 1e-6 && gr <= REACH.rise + 1e-6 && gw <= REACH.sway + 1e-6, 'the hips within the legs\' reach: sink ' + (gs * 100).toFixed(1) + ' (≤ ' + REACH.sink * 100 + '; ' + wgs.name + '), rise ' + (gr * 100).toFixed(1) + ' (≤ ' + REACH.rise * 100 + '; ' + wgr.name + '), sway ' + (gw * 100).toFixed(1) + ' cm (≤ ' + REACH.sway * 100 + '; ' + wgw.name + ')');
okB(ls <= REACH.straight, 'the legs never straight: at most ' + ls.toFixed(3) + ' of their length (≤ ' + REACH.straight + '; ' + wls.name + ', ' + wls.legs.straight.at + ')', wls, wls.legs.straight.at);
{ const [la, wla] = top((W) => W.legs.straightAir.v); console.log('ℹ the legs within half a second of an air — reported (the airs\' class): at most ' + la.toFixed(3) + ' of their length (' + wla.name + ', ' + wla.legs.straightAir.at + ')'); }
ok(pr <= FEET.rms && pi <= FEET.impulse, 'the feet pinned: ' + (pr * 100).toFixed(2) + ' cm RMS rolling, in manuals and on grinds (≤ ' + FEET.rms * 100 + '; ' + wpr.name + '), ' + (pi * 100).toFixed(1) + ' cm through an impulse (≤ ' + FEET.impulse * 100 + '; ' + wpi.name + ', ' + wpi.legs.pin.at + ')');
/* INTO A RAMP OVER ITS COPING (the supervisor's calls (A) and per lip, 10-16): below its lip's own vStar a board ROLLS over the coping — its
   wheels on the deck and the wall, its deck on the coping between them — and rides down the wall; at it and over it DROPS IN, a short air off
   the coping landed clean on the wall. Over a lip the roll cannot hold (measured lip by lip, tests/vstar.mjs: every lip of this park) every run
   drops in, as a skater drops in on a steep lip. A ledge's end rolls off and flies */
const intoAll = out.filter((W) => /, into it /.test(W.name)), into = intoAll.filter((W) => W.preset !== 'raw'), intoRaw = intoAll.filter((W) => W.preset === 'raw'), ledges = out.filter((W) => /a ledge's end/.test(W.name));
/* on Raw (no vert assist): every run into a ramp rolls off its coping and flies, and lands as it flew — a bail where physics says so is
   honest, and on its row */
if (intoRaw.length) { const bad = intoRaw.filter((W) => !W.roll.rolloff || W.roll.rolled || W.roll.dropped);
  ok(bad.length === 0, 'ON RAW, A RUN INTO A RAMP ROLLS OFF AND FLIES (no vert assist: it lands as it flew): ' + (intoRaw.length - bad.length) + ' of ' + intoRaw.length + ' rolled off the coping and flew' + (bad.length ? '  ✖ — ' + bad.map((W) => W.name + (W.roll.dropped ? ': dropped in' : W.roll.rolled ? ': rolled over' : ': never flew')).join(' · ') : ''));
  for (const W of intoRaw) { const L = W.lands[0]; console.log('  ↳ ' + W.name.replace(/^The /, '').replace(/, into it (over its rim|from its deck)/, '') + ': ' + (L ? 'landed ' + L.q + ' on ' + L.surf + ' at ' + L.impact.toFixed(1) + ' m/s of impact' : 'no landing') + (W.roll.bail ? ', bailed (' + W.roll.bail + ': honest — the fall physics gives it)' : '')); } }
if (!unread(into, 'OVER A LIP THE ROLL CANNOT HOLD, A DROP-IN')) {
  const bad = [], said = [], lips = new Map(); let nR = 0, nD = 0;
  for (const W of into) { const R = W.roll, short = W.name.replace(/^The /, '').replace(/, into it (over its rim|from its deck)/, ''), id = R.rolled ? R.rolled.rail : R.dropped ? R.dropped.rail : null, rail = id ? park.railById.get(id) : null, vS = rail ? rail.vStar || 0 : 0;
    if (rail) lips.set(id, vS);
    if (R.rolled) { nR++; said.push(short + ' rolled at ' + R.rolled.speed.toFixed(2) + ' (its lip\'s vStar ' + vS + ')');
      if (R.rolled.speed >= vS || R.rolled.t1 == null || R.rolled.flown || R.bail) bad.push(short + ': rolled at ' + R.rolled.speed.toFixed(2) + ' m/s over a lip whose vStar is ' + vS + (R.rolled.t1 == null ? ', never on the wall' : '') + (R.rolled.flown ? ', flown' : '') + (R.bail ? ', bailed (' + R.bail + ')' : '')); }
    else if (R.dropped) { nD++; const L = R.dropped.land; said.push(short + ' dropped in at ' + R.dropped.speed.toFixed(2) + (L ? ', landed ' + L.q + ' on the wall at ' + L.impact.toFixed(1) + ' m/s into it' : ''));
      if (R.dropped.speed < vS || !L || L.q !== 'clean' || L.surf !== 'ramp' || L.upY >= 0.95 || R.bail) bad.push(short + ': dropped in at ' + R.dropped.speed.toFixed(2) + ' m/s, ' + (L ? 'landed ' + L.q + ' on ' + L.surf + (L.upY >= 0.95 ? ' (the floor)' : '') : 'never landed') + (R.bail ? ', bailed (' + R.bail + ')' : '')); }
    else bad.push(short + ': neither rolled nor dropped in' + (R.rolloff ? ' (rolled off)' : '')); }
  ok(into.length > 0 && bad.length === 0, 'OVER A LIP THE ROLL CANNOT HOLD, A DROP-IN: from the deck, ' + nD + ' runs left the coping as a short air and landed clean on the wall' + (nR ? ', ' + nR + ' rolled over a lip that holds it and rode down the wall' : '') + ', at every speed in the sweep, on Cruise and Classic (the lips\' own vStar, measured: ' + [...lips].map(([k, v]) => k + ' ' + v).join(', ') + ' m/s — tests/vstar.mjs)' + (bad.length ? '  ✖ — ' + bad.join(' · ') : ''));
  for (const x of said) console.log('  ↳ ' + x);
  /* (an empty class is said by the line above — "0 runs" RED — never thrown: its readings below are only taken where there are runs to read;
     10-17, orgo-u-48: on a park with no run into a ramp, (a)'s reading took into[0] of nothing and the wall threw) */
  if (into.length) {
  /* (a) */
  const wd = into.reduce((a, W) => (W.roll.deck.v < a.roll.deck.v ? W : a), into[0]), wo = into.reduce((a, W) => (W.roll.own.v > a.roll.own.v ? W : a), into[0]), wa = into.reduce((a, W) => (W.roll.air.v > a.roll.air.v ? W : a), into[0]);
  ok(wd.roll.deck.v >= ROLL.deck && wo.roll.own.v <= ROLL.own && wa.roll.air.v <= ROLL.air, 'THE DECK KEEPS ITS SPEED OVER THE COPING: on the deck going over it the drawn deck never under ' + (ROLL.deck * 100) + ' % of the board\'s own speed (the least ' + (wd.roll.deck.v * 100).toFixed(0) + ' %, ' + wd.name + (wd.roll.deck.at ? ', frame ' + wd.roll.deck.at : '') + '; the old pivot held it at 25 %), the board\'s own speed changing a frame by at most ' + (wo.roll.own.v * 100).toFixed(1) + ' cm/s past what gravity along its plane, its rolling friction and the pump give (≤ ' + ROLL.own * 100 + '; ' + (wo.roll.own.at || '-') + '); in the drop-in\'s air every step ends within ' + (wa.roll.air.v * 100).toFixed(2) + ' cm of its own free path (≤ ' + ROLL.air * 100 + '; ' + wa.name + (wa.roll.air.at ? ', ' + wa.roll.air.at : '') + ')');
  /* the board against the coping */
  const ws = into.reduce((a, W) => (W.roll.sink.v > a.roll.sink.v ? W : a), into[0]), wg = into.reduce((a, W) => (W.roll.underTop.v > a.roll.underTop.v ? W : a), into[0]);
  ok(ws.roll.sink.v <= ROLL.sink, 'THE BOARD NEVER IN THE COPING\'S LIP (the solid its wheels ride): going over it on the deck and in the drop-in\'s air, the deck, the trucks and, in the air, the round wheels at most ' + (ws.roll.sink.v * 1000).toFixed(1) + ' mm into it (≤ ' + ROLL.sink * 1000 + '; ' + ws.name + (ws.roll.sink.at ? ', ' + ws.roll.sink.what + ', frame ' + ws.roll.sink.at : '') + ')');
  console.log('ℹ THE COPING NOT YET SOLID TO THE BOARD — reported (the grind release, the supervisor\'s call: its drawn top on the grind line stands 2 cm over the lip the board rides): going over it, the board at most ' + (wg.roll.underTop.v * 100).toFixed(1) + ' cm under the drawn top (' + wg.name + (wg.roll.underTop.at ? ', frame ' + wg.roll.underTop.at : '') + ')');
  /* (b) */
  const wt = into.reduce((a, W) => (W.roll.trunk.v > a.roll.trunk.v ? W : a), into[0]);
  okB(wt.roll.trunk.v <= ROLL.trunk, 'THE TURN OVER THE COPING HAS NO STEP, read on the RIDER: the body\'s turn accelerating at most ' + wt.roll.trunk.v.toFixed(0) + ' rad/s² from the lean before the edge to 0.4 s past the landing (≤ ' + ROLL.trunk + '; ' + wt.name + ', frame ' + wt.roll.trunk.at + ')', wt, frameOf(wt.roll.trunk.at));
  }
}
/* THE BOARD COMES TO REST AGAINST A WALL IT ROLLED INTO (10-16): square into a block's side, slowly, it stops against it — under 5 cm/s 0.3 s
   after it met it, its heading held within 2° (its wheels do not slide along the wall nor swing it round), never climbing it (its tilt under
   2°: stopped 5 mm into the Pad's side, its probe had taken the Pad's top 20 cm up and pitched it 28° onto it) */
{ const into = out.filter((W) => /rolled into at .* off square/.test(W.name));
  if (!unread(into, 'THE BOARD COMES TO REST AGAINST A WALL IT ROLLED INTO')) { const bad = into.filter((W) => W.rest.t0 == null || W.rest.speed == null || W.rest.speed > 0.05 || W.rest.dh > 2 * Math.PI / 180 || W.rest.tilt > 2 * Math.PI / 180);
    ok(into.length > 0 && bad.length === 0, 'THE BOARD COMES TO REST AGAINST A WALL IT ROLLED INTO: ' + into.map((W) => W.name.replace(/ \(unsteered\)/, '') + ' — ' + (W.rest.t0 == null ? 'it never met the wall' : (W.rest.speed == null ? 'still moving at the run\'s end' : (W.rest.speed * 100).toFixed(1) + ' cm/s') + ' 0.3 s after it met it (≤ 5), its heading turned ' + (W.rest.dh * 180 / Math.PI).toFixed(1) + '° (≤ 2), tilted ' + (W.rest.tilt * 180 / Math.PI).toFixed(1) + '° (≤ 2)')).join(' · ')); } }
if (!unread(ledges, "A LEDGE'S END ROLLS OFF AND FLIES")) ok(ledges.length > 0 && ledges.every((W) => W.roll.rolloff && !W.roll.rolled && !W.roll.dropped), 'A LEDGE\'S END ROLLS OFF AND FLIES: off the Pad\'s end ' + ledges.map((W) => (W.roll.rolloff ? 'rolled off' : 'did not fly') + (W.roll.rolled || W.roll.dropped ? ', taken for a roll-in' : '')).join(', '));
{ const lipRuns = out.filter((W) => W.preset !== 'raw'), L = lipRuns.reduce((a, W) => a + W.lips.n, 0), outs = lipRuns.filter((W) => W.lips.out.length).map((W) => W.name + ': ' + W.lips.out.join(', '));
  const wo = lipRuns.find((W) => W.lips.out.length);
  if (!unread(lipRuns.filter((W) => W.lips.n), 'A LIP AIR COMES BACK DOWN INTO ITS RAMP')) okB(L > 0 && outs.length === 0, 'A LIP AIR COMES BACK DOWN INTO ITS RAMP, on Cruise and Classic (the vert assist\'s drift back): ' + L + ' airs out of a lip, each down on its ramp or onto a rail (' + (outs.length ? 'came down outside: ' + outs.join(' · ') : 'none on the deck behind the lip') + ')', wo, wo ? wo.lips.firstOut : null);
  const raw = out.filter((W) => W.preset === 'raw' && W.lips.n), rawOut = raw.filter((W) => W.lips.out.length);
  if (raw.length) console.log('ℹ RAW\'S LIP AIRS — reported (no vert assist: they come down where physics puts them): ' + raw.reduce((a, W) => a + W.lips.n, 0) + ' airs, ' + (rawOut.length ? rawOut.map((W) => W.name + ': ' + W.lips.out.join(', ')).join(' · ') : 'all down on their ramps')); }
/* THE BOARD'S HEADING NEVER STEPS ON THE GROUND (the supervisor, 10-16): rolling or in a manual, no revert, the heading's turn in a step against
   what the steering gives at that speed (the carve's most; the kickturn's below walking pace) and the forces along the surface turn its travel
   by — the most it went past them (tests/lib/ride.mjs) */
{ const wy = out.reduce((a, W) => (W.yaw.ex > a.yaw.ex ? W : a), out[0]), top5 = [...out].sort((a, b) => b.yaw.ex - a.yaw.ex).slice(0, 5);
  if (process.env.YAW_CENSUS) for (const W of top5) console.log('  · yaw ' + W.name + ': ' + (W.yaw.ex * 180 / Math.PI).toFixed(0) + '°/s past (the turn ' + (W.yaw.rate * 180 / Math.PI).toFixed(0) + '°/s, given ' + (W.yaw.allowed * 180 / Math.PI).toFixed(0) + ') at ' + W.yaw.at + ' · its most ' + (W.yaw.max * 180 / Math.PI).toFixed(0) + '°/s');
  okB(wy.yaw.ex <= BOUND.yaw, 'THE BOARD\'S HEADING NEVER STEPS ON THE GROUND: rolling, its heading turned at most ' + (Math.max(0, wy.yaw.ex) * 180 / Math.PI).toFixed(0) + '°/s past what the steering gives at its speed and the forces turn its travel by (≤ ' + (BOUND.yaw * 180 / Math.PI).toFixed(0) + '; ' + wy.name + ', ' + wy.yaw.at + ')', wy, null); }
okB(jo <= BOUND.joint, 'no joint turns faster than ' + BOUND.joint + '°/s: at most ' + jo.toFixed(0) + '°/s (' + wo.name + ', ' + wo.jointAt + ')', wo, wo.jointAt);
/* A RAIL'S END KEEPS THE STEP'S MOVE (10-17, the class the plant grind_end_clamped stands for — read at the step itself, whatever the phase of
   the end within it: a deck-jump reading of the same defect is as large as the step's overshoot past the end, 0 to v·dt) */
{ const ends = out.filter((W) => W.railEnd.n), w = ends.reduce((a, W) => (W.railEnd.v > a.railEnd.v ? W : a), ends[0] || out[0]);
  if (!unread(ends, "A RAIL'S END KEEPS THE STEP'S MOVE")) okB(ends.length > 0 && w.railEnd.v <= BOUND.railEnd, 'A RAIL\'S END KEEPS THE STEP\'S MOVE: ' + ends.reduce((a, W) => a + W.railEnd.n, 0) + ' grinds over ' + ends.length + ' runs left their rail at its end, each step moving the board its own speed\'s worth — at most ' + (1000 * Math.max(0, w.railEnd.v)).toFixed(2) + ' mm short (≤ ' + (1000 * BOUND.railEnd).toFixed(0) + '; ' + w.name + ', ' + w.railEnd.at + ')', w, w.railEnd.f); }
/* THE BODY IS CARRIED AT THE LEGS' LIMIT (10-17, the class: tests/lib/gap.mjs) — held there, the gap from the board never turns its direction
   (an orbit round the board: the camera wall's Deck Quarter slant); the frames held and the trunk's most lean past its rest, reported */
{ const wg = out.reduce((a, W) => (W.gap.swing > a.gap.swing ? W : a), out[0]), wh = out.reduce((a, W) => (W.gap.hold > a.gap.hold ? W : a), out[0]), wl = out.reduce((a, W) => (W.gap.lean > a.gap.lean ? W : a), out[0]);
  const held = out.filter((W) => W.gap.capFrames), n = held.reduce((a, W) => a + W.gap.capFrames, 0), long = out.filter((W) => W.gap.hold > GAP.hold);
  okB(wg.gap.swing <= GAP.swing, 'THE BODY IS CARRIED AT THE LEGS\' LIMIT: held at it, the gap from the board turned its direction at most ' + wg.gap.swing.toFixed(1) + '° (≤ ' + GAP.swing + (wg.gap.swing > 0 ? '; ' + wg.name + ', ' + wg.gap.swingAt : '') + ')', wg, wg.gap.swingAt);
  console.log('ℹ THE BODY AT THE LEGS\' LIMIT — reported: ' + n + ' frames held there over ' + held.length + ' of ' + out.length + ' runs, the longest hold ' + wh.gap.hold + ' frames (stated bound ' + GAP.hold + (wh.gap.hold ? '; ' + wh.name + ', ' + wh.gap.holdAt : '') + ')' + (long.length ? ' — LONGER: ' + long.map((W) => W.name + ' ' + W.gap.hold).join(', ') : '') + ' · the trunk at most ' + wl.gap.lean.toFixed(0) + '° past its own lean at rest (' + wl.name + ', ' + wl.gap.leanAt + ')'); }
{ const w4 = out.reduce((a, W) => (W.fourth.v > a.fourth.v ? W : a), out[0]), n4 = out.reduce((a, W) => a + W.fourth.n, 0);
  console.log('ℹ THE FOURTH WHEEL — reported (the supervisor\'s D: a fade over the wheel\'s window only if it reads over the deck\'s 120°/s): ' + n4 + ' steps where a wheel came onto the ground or left it (three to four or back): the board\'s turn rate changed in such a step by at most ' + w4.fourth.v.toFixed(0) + '°/s (' + (w4.fourth.at ? w4.name + ', frame ' + w4.fourth.at : 'none') + ')'); }
/* THE CHAIN'S OWN CALIBRATION: on this build, every reading's largest value over every run — none may break (over its bound), or a blame
   names a stage that only moved as it always does */
/* AT ITS BOUND, REPORTED beside LAND-BIG (the supervisor, 10-17: "at exactly 100 % of its bound it will flip on a hair"): the hips held at
   the legs' reach in the air (1.00 × it, the Basin over its rim at 3 m/s on Classic at the freeze of r25) — said every run below with its
   most and where, owed to the body's release with LAND-BIG; the hips within the legs' reach in cm (sink, rise, sway) still gate it */
const AT_ITS_BOUND = { 'legs · the hips out of the legs\' reach': 'THE HIPS AT THE LEGS\' REACH' };
{ const K = Object.keys(CENSUS).filter((k) => !AT_ITS_BOUND[k]).sort((a, b) => CENSUS[b].v - CENSUS[a].v), broke = K.filter((k) => CENSUS[k].v > 1);
  if (process.env.CHAIN_CENSUS) for (const k of K) console.log('  · chain ' + k + ': ' + (CENSUS[k].val >= 100 ? CENSUS[k].val.toFixed(0) : CENSUS[k].val.toFixed(2)) + ' ' + CENSUS[k].unit + ' (' + (100 * CENSUS[k].v).toFixed(0) + '% of ' + CENSUS[k].bound + '; ' + CENSUS[k].run + ', frame ' + CENSUS[k].f + ', ' + CENSUS[k].state + ')');
  ok(broke.length === 0, 'THE CHAIN IS QUIET ON THIS BUILD: ' + K.length + ' readings over every run, ' + (broke.length ? broke.length + ' over their bounds — ' + broke.slice(0, 4).map((k) => k + ' ' + (100 * CENSUS[k].v).toFixed(0) + '% (' + CENSUS[k].run + ', frame ' + CENSUS[k].f + ')').join(' · ') : 'the closest ' + K.slice(0, 3).map((k) => k + ' at ' + (100 * CENSUS[k].v).toFixed(0) + '%').join(' · ')));
  for (const k of broke) { const all = CHAINED.filter((o) => o[k] && o[k].v > 1).sort((a, b) => b[k].v - a[k].v);
    console.log('  ↳ every run over its bound, ' + k + ': ' + all.length + ' — ' + all.map((o) => o[k].run + ' ' + (100 * o[k].v).toFixed(0) + '% (' + (o[k].val >= 100 ? o[k].val.toFixed(0) : o[k].val.toFixed(2)) + ' ' + o[k].unit + ', frame ' + o[k].f + ', ' + o[k].state + ')').join(' · ')); }
}
for (const [k, name] of Object.entries(AT_ITS_BOUND)) if (CENSUS[k]) console.log('ℹ ' + name + ' — reported beside LAND-BIG, owed to the next release (the supervisor, 10-17: at its bound it flips on a hair): at most ' + CENSUS[k].val.toFixed(4) + ' × the reach (' + (100 * CENSUS[k].v).toFixed(2) + '% of its bound; ' + CENSUS[k].run + ', frame ' + CENSUS[k].f + ', ' + CENSUS[k].state + ')');
{ const big = out.filter((W) => W.legs.big.n > 0);
  if (big.length) console.log('ℹ BIG LANDINGS IN THE SWEEP — reported, owed to the next release (a landing over ' + BIG.impact.toFixed(1) + ' m/s of impact: tests/lib/legs.mjs BIG): ' + big.length + ' runs, the hips up to ' + Math.max(...big.map((W) => W.legs.big.v)).toFixed(0) + ' m/s² (' + big.slice(0, 4).map((W) => W.name + ' ' + W.legs.big.v.toFixed(0)).join(' · ') + (big.length > 4 ? ' …' : '') + ')'); }
/* BIG LANDINGS — REPORTED, owed to the next release (the supervisor, 10-16, found by orgo-u-48 with this reader's own legs): the Plaza's two ollies
   off its drops, ridden after every gate above (their frames in no gate, the chain's census included): the hips' landing class (≤ 150 m/s² in
   the 0.2 s after a landing) fails above about 6 m/s of impact — the legs take 9–11 cm of their 15 while the 4 Hz spring sets the deceleration */
{ const BIG = [['Terrace Drop, ollied off it at 4 m/s (a big landing)', { at: [30, 0.8, 36], heading: 180, speed: 4 }, ollieWhen((sk) => sk.p[2] <= 32 + 0.15 + 4 * 0.19), 150],
    ['Long Five, ollied over the Five at 4.5 m/s (a big landing)', { at: [51, 0.8, 37], heading: 180, speed: 4.5 }, ollieWhen((sk) => sk.p[2] <= 32 + 0.15 + 4.5 * 0.19), 150]];
  const said = []; for (const [name, o, drive, frames] of BIG) { const W = ride(name, o, drive, frames); if (!W) continue; const L = W.lands[W.lands.length - 1];
    said.push(name.replace(/ \(a big landing\)/, '') + ': ' + (L ? 'landed ' + L.q + ' on ' + L.surf + ' at ' + L.impact.toFixed(2) + ' m/s of impact' : 'no landing') + ', the hips ' + W.legs.impulse.v.toFixed(0) + ' m/s² (the class ' + HIPS.impulse + ')'); }
  if (said.length) console.log('ℹ BIG LANDINGS — reported, owed to the next release (a deeper, softer squat that scales with the impact): ' + said.join(' · ')); }
for (const W of reported) sayReported(W);
/* SPECIFIED, NEVER BUILT (the supervisor, 10-17: "the class 'specified but never wired' — every ruled gate prints its own line"): the lock's hips
   ACROSS share was ruled a gate at (e) and never built; read once on the final copy (tests/lib/figure.mjs, the Cruise transfer onto the
   Basin's coping, 60 Hz), it is said here with those numbers until its gate is */
if (DEF.id === 'waxline') console.log('ℹ THE LOCK\'S HIPS ACROSS SHARE — not gated (specified 10-17, never built): across 33 m/s², vertical 158 at 1.65 s on the Cruise transfer onto the Basin\'s coping (a 6.8 m/s fall → LAND-BIG); the gate and its plant (the old steer + the fixed-cubic catch → RED): the next release');
console.log('SURFACES: ' + (fail ? 'RED · ' + fail + ' off' : 'GREEN') + ' · ' + out.length + ' runs' + (reported.length ? ' · ' + reported.length + ' REPORTED' : '') + (unreadN ? ' · ' + unreadN + ' not read (filtered)' : ''));
process.exit(fail ? 1 : 0);
