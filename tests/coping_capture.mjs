/* THE COPING AN AIR LEFT (10-16, the owner: "angled airs in the bowl can still catch the edge as an unwanted grind"). Lip airs on all three
 * assists, read through the real sim and the real reader:
 *   · THE SLANTED SET: from the Basin's floor at each of its four walls, 25° and 40° either side of square; off the Deck Quarter, the East
 *     Wall and the Lawn Quarter at the same slants; over the Spine from each side — at two speeds each;
 *   · each with NOTHING held, again with a DIRECTION held on the pad from the top of the air (the grind's own choice, DESIGN §4.6), and
 *     again with G held on the keys (a grab: the keys hold no direction, and the pad's held direction in the air is the grab too);
 *   · THE STRAIGHT SET: the same walls square on.
 * Gates, on every assist: with nothing held, none of the slanted set ends grinding the coping it left; with a direction held, some lock onto
 * it (the ask works); none of the straight set grinds the coping it left; a coping the air did NOT leave keeps the assist's radius — the
 * supervisor's "transfers still catch" (below: this park has no two copings within an air's reach, so it is read on an ollie from the plaza
 * onto the Basin's rim and on a transfer constructed between two copings) — and the Coping Run (4 m on the Basin's rim) is still ridden.
 * Run: node tests/coping_capture.mjs */
import { pull } from './lib/rig.mjs';
import { yawGate } from './lib/airyaw.mjs';
import { figure } from './lib/figure.mjs';
import { bodyRead } from './lib/bodyread.mjs';
import { World } from '../build/js/sim/world.js';
import { CASES } from './lib/copingset.mjs';
import { drops } from './lib/drops.mjs';
import { airsRead, airsBase, airsRecord } from './lib/airsread.mjs';
import { Skater } from '../build/js/sim/body.js';
import { PHYSICS as PH } from '../build/js/config.js';
import { held as heldRead, HELD } from './lib/held.mjs';
/* every ride is POSED (tests/lib/figure.mjs, on the park): the body's own gates on it are reported (tests/lib/bodyread.mjs) — the rides with a
   direction or G held, every case ridden whole, and the made cases below (the tallies with nothing held are the whole rides' first parts) */
const WORLD = new World(), BODY = bodyRead(), posed = (o) => figure(Object.assign({ world: WORLD }, o));
/* ...a sweep's own step, run after each of the sim's steps inside the figure's frame (two to a frame, the page's clock) */
const onStep = (R, fn) => { const step = R.step; R.step = (n) => { if (fn.stop) return; step.call(R, n); fn(); }; return R; };
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
/* one ride: up to its first lip air and how that air ends — on the coping it left, on another rail, or landed */
const DROPPED = drops();   // what a capped slide left over every ride here, by kind (body.js noteDropped → tests/lib/drops.mjs): reported
function ride(c, preset, held) {   // held: false · 'pad' · 'keys'
  const G = posed({ preset, at: c.at, heading: c.heading, speed: c.speed }), R = G.R, BR = held ? BODY.ride(preset + ' ' + c.name + ' (' + (held === 'pad' ? 'a direction' : 'G') + ' held)', G) : null;
  let lip = null, end = null, asked = false, head = 0, upw = 0, hPrev = null, turn = 0;
  const each = () => { const sk = R.sk;
    DROPPED.step(sk, () => preset + ' ' + c.name + (held ? ' (' + held + ')' : '') + ' at ' + sk.t.toFixed(2) + ' s (' + sk.state + ')');
    if (!lip && sk.state === 'air' && sk.air && sk.air.why === 'lip') lip = { id: sk.air.lipId, t0: sk.t, y: sk.p[1] };
    if (lip && held && !asked && sk.state === 'air' && sk.v[1] <= 0) { if (held === 'keys') R.keys = [{ type: 'grab', on: true, dir: 90 }]; else R.thumb(pull(34, 1500, 0)); asked = true; }   // asked from the top of the air
    /* the landing yaw assist's own turn (body.js headToLanding) and the up's: their rates */
    if (lip && sk.state === 'air' && sk.air) { head = Math.max(head, Math.abs(sk.air.headW || 0)); if (sk.air.upW) upw = Math.max(upw, Math.hypot(...sk.air.upW));
      /* (the heading's own turn over the air, every step's taken whole — out and back as the landing's line moved: the θ it turned) */
      const hz = Math.atan2(sk.fwd[0], sk.fwd[2]); if (hPrev != null && Math.abs(sk.air.headW || 0) > 1e-6) turn += Math.abs(Math.atan2(Math.sin(hz - hPrev), Math.cos(hz - hPrev))); hPrev = hz; }
    if (lip && sk.state === 'grind') end = sk.grind.rail.kind === 'coping' && sk.grind.rail.group === String(lip.id).split(':')[0] ? 'its coping' : 'another rail';
    /* WHERE it landed (the supervisor, 10-17: "so it never again reads 'landed' alone"): back in its ramp below the lip, on the lip (its ramp at
       the lip's height), up on the deck beyond it, or down on the flat (a quarter's side, or the ground below it) */
    else if (lip && (sk.state === 'roll' || sk.state === 'manual')) end = 'landed ' + (sk.surface === 'ramp' ? (sk.p[1] >= lip.y - 0.05 ? 'on the lip' : 'in its ramp') : (sk.p[1] >= lip.y - 0.1 ? 'on the deck' : 'down on the flat'));
    else if (sk.state === 'bail') { const b = R.log.filter((e) => e.type === 'bail').pop(); end = lip ? (b && b.why === 'landing' ? 'bailed landing' : 'bailed into a face') : 'bailed before an air'; }
    if (end) each.stop = true;
  };
  onStep(R, each);
  for (let f = 0; f < 6 * 60 && !end; f++) { const n0 = R.log.length, m = G.frame(), evs = R.log.slice(n0); if (BR) BR.frame(f, R.sk, evs, m); }
  if (BR) BR.end();
  return { lip: !!lip, end: end || (lip ? 'still in the air' : 'no lip air'), head, upw, turn };
}
/* each gate is ONE line over the three assists (a gate a plant cannot reach on one assist is still read there: Raw's grind radius, 0.20 m,
   never meets these airs, the old one or the new) */
const G = { free: [], ask: [], straight: [], line: [], rate: [], end: [] };
/* r21's landing bails on this set with nothing held (10-16, read on the frozen r21 tree: tests/coping_capture.mjs's set): Cruise 7, Classic 5,
   Raw 0 — the coping the air left had been catching 36 of them, and with it gone, 22 / 20 more bailed, the board's heading 59–85° off its
   line: the vert assist bent the PATH back into the ramp and left the BOARD pointing up the wall */
const R21_LANDING_BAILS = { cruise: 7, classic: 5, raw: 0 };
for (const preset of ['cruise', 'classic', 'raw']) {
  const tally = (set, held) => { const rows = CASES.filter((c) => c.set === set).map((c) => ({ c, r: ride(c, preset, held) })), airs = rows.filter((x) => x.r.lip);
    return { rows, airs, own: airs.filter((x) => x.r.end === 'its coping'), other: airs.filter((x) => x.r.end === 'another rail'), landed: airs.filter((x) => /^landed/.test(x.r.end)) }; };
  const free = tally('slanted', false), ask = tally('slanted', 'pad'), keys = tally('slanted', 'keys'), straight = tally('straight', false);
  /* AN AIR ENDS (10-17): every lip air of every tally lands, grinds or bails inside its ride — a Raw air off the Lawn Quarter into the west
     fence's top had hung in the air for the rest of its ride (the air's wall stopped every step at its own start), and this wall had read it as
     its end "still in the air" and gated nothing on it */
  const unended = [free, ask, keys, straight].flatMap((t) => t.airs.filter((x) => x.r.end === 'still in the air').map((x) => x.c.name));
  G.end.push({ preset, ok: unended.length === 0, say: preset + ' ' + [free, ask, keys, straight].reduce((a, t) => a + t.airs.length, 0) + ' airs' + (unended.length ? ' — ' + unended.length + ' still in the air: ' + [...new Set(unended)].slice(0, 4).join(', ') : '') });
  const ends = (t) => { const m = {}; for (const x of t.airs) m[x.r.end] = (m[x.r.end] || 0) + 1; return Object.entries(m).map(([k, v]) => v + ' ' + k).join(', '); };
  console.log('  · ' + preset + ': the slanted set, ' + free.airs.length + ' lip airs of ' + free.rows.length + ' rides — nothing held: ' + ends(free) + ' · a direction held: ' + ends(ask) + ' · G held: ' + ends(keys) + ' · the straight set, ' + straight.airs.length + ' lip airs: ' + ends(straight));
  G.free.push({ preset, ok: free.airs.length >= 20 && free.own.length === 0, say: preset + ' ' + free.own.length + '/' + free.airs.length + (free.own.length ? ' (' + free.own.slice(0, 3).map((x) => x.c.name).join(', ') + ')' : '') });
  /* the ask works where the assist steers; on Raw (no grind assist) an air must bring the trucks within 20 cm by itself — said, not held */
  G.ask.push({ preset, ok: preset === 'raw' || (ask.own.length > 0 && keys.own.length > 0), say: preset + ' ' + ask.own.length + '/' + ask.airs.length + ' with a direction on the pad, ' + keys.own.length + '/' + keys.airs.length + ' with G' + (preset === 'raw' ? ' (said: no grind assist — the air itself must bring the trucks within 20 cm)' : '') });
  const whereOf = (t) => { const m = {}; for (const x of t.landed) { const w = x.r.end.replace(/^landed /, ''); m[w] = (m[w] || 0) + 1; } return Object.entries(m).map(([k, v]) => v + ' ' + k).join(', '); };
  G.straight.push({ preset, ok: straight.airs.length >= 8 && straight.own.length === 0 && straight.landed.length === straight.airs.length, say: preset + ' ' + straight.landed.length + '/' + straight.airs.length + ' land (' + whereOf(straight) + '), ' + straight.own.length + ' on the coping' });
  /* THE LANDING YAW ASSIST (body.js headToLanding: the vert assist's share of the turn to the landing's line): the slanted airs land on their
     line — where it turns (Cruise, Classic) no more landing bails than r21 had; on Raw it does not turn: its bails are said, each named */
  const bailsLanding = free.airs.filter((x) => x.r.end === 'bailed landing');
  G.line.push({ preset, ok: preset === 'raw' || bailsLanding.length <= R21_LANDING_BAILS[preset], say: preset + ' ' + bailsLanding.length + ' landing bails (r21 ' + R21_LANDING_BAILS[preset] + ')' + (preset === 'raw' && bailsLanding.length ? ' — said, the assist does not turn on Raw: ' + bailsLanding.map((x) => x.c.name).join(', ') : '') });
  /* ...and TURNS, NEVER SET: each air's heading peaks at most at 40 times the angle it turned (its whole turn over the air, rad/s per rad) —
     a set in one step reads 120·θ; a least-jerk turn of the quickest time the assist plans (body.js TURN_T, 0.05 s) peaks at 37.5·θ; the old
     critically damped spring's own fastest, ω 40, could reach 40·θ (renamed 10-17 with the turn law: the gate's reading is the same). (10-16:
     read as the heading's peak over the set against the up's peak over the set, two maxima of different airs, it held by chance — per air the
     heading turned 7–10× faster than its own up, 525°/s against 73 on East Wall +40° @9: the yaw has its own angle to turn) */
  const OMEGA = 40, worst = free.airs.filter((x) => x.r.turn > 2 * Math.PI / 180).reduce((a, x) => { const q = x.r.head / (OMEGA * x.r.turn); return !a || q > a.q ? { q, x } : a; }, null);
  if (process.env.RATE_CENSUS) for (const x of [...free.airs].sort((a, b) => b.r.head - a.r.head).slice(0, 6)) console.log('    · rate ' + preset + ' ' + x.c.name + ': the heading ' + (x.r.head * 180 / Math.PI).toFixed(0) + '°/s over a turn of ' + (x.r.turn * 180 / Math.PI).toFixed(0) + '° (40 × its turn: ' + (OMEGA * x.r.turn * 180 / Math.PI).toFixed(0) + '°/s), its up ' + (x.r.upw * 180 / Math.PI).toFixed(0) + '°/s, ' + x.r.end);
  G.rate.push({ preset, ok: preset === 'raw' || (!!worst && worst.q <= 1), say: preset + (worst ? ' the most ' + (worst.q * 100).toFixed(0) + ' % of it (' + worst.x.c.name + ': ' + (worst.x.r.head * 180 / Math.PI).toFixed(0) + '°/s over ' + (worst.x.r.turn * 180 / Math.PI).toFixed(0) + '°)' : ' no turn read') });
}
const line = (rows) => rows.map((r) => r.say).join(' · ');
ok(G.end.every((r) => r.ok), 'AN AIR ENDS: every lip air of the set — nothing held, a direction, G, the straight set — lands, grinds or bails inside its ride — ' + line(G.end));
ok(G.free.every((r) => r.ok), 'THE COPING AN AIR LEFT TAKES ONLY WHAT IS ASKED: with nothing held, the slanted lip airs that end grinding the coping they left (none) — ' + line(G.free));
ok(G.ask.every((r) => r.ok), 'A GRIND ON IT WHEN ASKED: asked from the top of the air, the slanted lip airs that lock onto the coping they left — ' + line(G.ask));
/* (where it lands is said, not held: on Raw a straight air carries over a lip that leans back — the Basin's 75.5°, the quarters' 70.6° and
   64.7° — onto the lip or the deck, as it flew; on Cruise and Classic the vert assist brings it back into its ramp) */
ok(G.straight.every((r) => r.ok), 'A STRAIGHT AIR COMES DOWN, NEVER ON THE COPING IT LEFT: every straight lip air lands, none on that coping, and where — ' + line(G.straight));
ok(G.line.every((r) => r.ok), 'A SLANTED AIR LANDS ON ITS LINE (the landing yaw assist): with nothing held, no more landing bails than r21\'s where the assist turns — ' + line(G.line));
ok(G.rate.every((r) => r.ok), 'THE LANDING YAW TURNS, NEVER SET: on each slanted air the heading\'s peak rate against 40 × the angle it turned (a set in one step reads 120 ×; the quickest turn the assist plans, 37.5 ×) — ' + line(G.rate));
/* THE LANDING YAW NEVER STEPS, ON EVERY AIR (10-17, the supervisor: "move THE LANDING YAW TURNS ON ITS SPRING from lip airs only to EVERY AIR
   ... the same instrument gap as AN AIR ENDS was"): every case of the set ridden whole, nothing held, on each assist — its lip air and every air
   after it (a roll-off off a rim, a transfer, a hop) — read by the chain's own reading (tests/lib/airyaw.mjs): its heading's acceleration at
   most HEAD_STEP. A roll-off off the Basin's rim reversed at 378 rad/s² (the spin window's edge, all or nothing), and an onset 0.3 s from the
   touchdown set a 40° aim whole (320); neither had been read here */
{ const holds = [], gates = [];
  const AR = {}, base = airsBase('coping');
  for (const preset of ['cruise', 'classic', 'raw']) { let airs = 0; const hp = { v: 0, at: '' }, YG = yawGate(1 / 60, WORLD), RD = AR[preset] = airsRead(Skater, PH);
    for (const c of CASES) { const G = posed({ preset, at: c.at, heading: c.heading, speed: c.speed }), R = G.R, BR = BODY.ride(preset + ' ' + c.name + ' (whole)', G); let was = false; YG.ride(); RD.ride();
      const where = () => c.name + ' at ' + R.sk.t.toFixed(2) + ' s (' + (R.sk.air ? 'the air ' + R.sk.air.why : R.sk.state + (R.sk.catchTurn ? ', the catch' : '')) + ')';
      const H = heldRead(); let p0 = R.sk.p.slice(); const each = () => { H.step(R.sk, p0, () => c.name + ' at ' + R.sk.t.toFixed(2) + ' s'); p0 = R.sk.p.slice(); YG.step(R.sk, where); RD.step(R.sk, where); }; onStep(R, each);
      for (let f = 0; f < 6 * 60; f++) { const n0 = R.log.length, m = G.frame(), evs = R.log.slice(n0), sk = R.sk; BR.frame(f, sk, evs, m); if (sk.state === 'air' && !was) airs++; was = sk.state === 'air'; YG.frame(sk, where); RD.frame(sk, where); }
      BR.end(); if (H.v > hp.v) Object.assign(hp, { v: H.v, at: H.at }); }
    holds.push({ ok: hp.v <= HELD, say: preset + ' the most ' + hp.v + (hp.at ? ' (' + hp.at + ')' : '') });
    gates.push([preset, airs, YG]); }
  for (const [preset, airs, YG] of gates) { const [line, contact, catches] = YG.say(preset + ', ' + airs + ' airs: every case ridden whole, nothing held'); ok(YG.ok(), line); console.log(contact); console.log(catches); for (const l of AR[preset].lines(preset + ', every case ridden whole', base[preset])) console.log(l); { const g = AR[preset].gate(preset + ', every case ridden whole'); ok(g.ok, g.line); } }
  airsRecord('coping', Object.fromEntries(Object.entries(AR).map(([k, v]) => [k, v.summary()])));
  ok(holds.every((r) => r.ok), 'AN AIR IS NEVER HELD: every case ridden whole, nothing held — no board stands still in the air (its middle under 1 mm a step) for more than ' + HELD + ' steps (tests/lib/held.mjs) — ' + holds.map((r) => r.say).join(' · ')); }
/* A COPING THE AIR DID NOT LEAVE KEEPS THE ASSIST'S RADIUS. Read on two made cases (the park makes one of its own: measured 10-17, the Lawn
   Quarter -40° @9 on Cruise and Classic, nothing held, flies onto the Basin's coping and catches it as a 50-50 — the ends above say it,
   'another rail'; the Lawn Quarter and the Spine face each other 7.1 m apart across the flat):
   · an ollie along the plaza 30 cm outside the Basin's north rim, parallel to it (an air that left no coping): caught at the assist's radius
     with its middle more than `grind.onTop` from the rim at the lock — the left coping's rule would not have caught it — and it rides on
     past the Coping Run's 4 m;
   · a TRANSFER, constructed (the one this park cannot make): an air that left the Lawn Quarter, set down 30 cm beside the Spine's coping and
     above it, falling and moving along it at 4 m/s */
const { PHYSICS } = await import('../build/js/config.js');
const toRail = (r, p) => { let best = 9; for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1], ab = [b[0] - a[0], b[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[2] - a[2]) * ab[1]) / L2)); best = Math.min(best, Math.hypot(p[0] - a[0] - ab[0] * t, p[2] - a[2] - ab[1] * t)); } return best; };
const K = { radius: [], run: [] };
for (const preset of ['cruise', 'classic']) {
  const GO = posed({ preset, at: [4.8, 0, 17.3], heading: 90, speed: 4.5 }), R = GO.R, sk = R.sk, BO = BODY.ride(preset + ' the ollie outside the Basin\'s rim', GO); let popped = false, lock = null, run = 0;
  const each = () => { if (sk.state === 'grind' && lock == null) lock = { rail: sk.grind.rail, d: toRail(sk.grind.rail, sk.grind.catch.p) };
    if (sk.state === 'grind') run = Math.max(run, sk.grind.covered); for (const e of R.log) if (e.type === 'grindEnd' && e.group === 'basin') run = Math.max(run, e.covered);
    if (lock && sk.state !== 'grind') each.stop = true;
    if (!popped && sk.state === 'roll' && sk.p[0] >= 6.5) { R.keys = [{ type: 'pop', load: 1, spd: 4, acc: 4 }, { type: 'trick', name: 'Ollie', acc: 4, spd: 4 }]; popped = true; } };
  onStep(R, each);
  for (let f = 0; f < 6 * 60 && !each.stop; f++) { const n0 = R.log.length, m = GO.frame(), evs = R.log.slice(n0); BO.frame(f, sk, evs, m); }
  BO.end();
  const GT = posed({ preset, at: [3, 0, 24], heading: 0, speed: 0 }), T = GT.R, tk = T.sk, BT = BODY.ride(preset + ' the transfer set down beside the Spine\'s coping', GT);
  tk.p = [8.6 + 0.30, 1.22 + 0.22, 22]; tk.v = [0, -0.4, 4]; tk.up = [0, 1, 0]; tk.fwd = [0, 0, 1]; tk.toAir('lip'); tk.air.lipId = 'lawnQuarter'; tk.air.vert = false;
  let caught = null; const eachT = () => { if (tk.state === 'grind') caught = { rail: tk.grind.rail.id, d: toRail(tk.grind.rail, tk.grind.catch.p) }; if (tk.state !== 'air') eachT.stop = true; };
  onStep(T, eachT);
  for (let f = 0; f < 0.6 * 60 && !eachT.stop; f++) { const n0 = T.log.length, m = GT.frame(), evs = T.log.slice(n0); BT.frame(f, tk, evs, m); }
  BT.end();
  K.radius.push({ ok: !!(lock && lock.rail.id === 'basin' && lock.d > PHYSICS.grind.onTop && caught && caught.rail === 'spine' && caught.d > PHYSICS.grind.onTop), say: preset + ': the ollie ' + (lock ? 'caught on ' + lock.rail.id + ', its middle ' + (lock.d * 100).toFixed(1) + ' cm from the rim at the lock' : 'NOT caught') + ', the transfer ' + (caught ? 'caught on ' + caught.rail + ', ' + (caught.d * 100).toFixed(1) + ' cm from it' : 'NOT caught (' + tk.state + ')') });
  K.run.push({ ok: run >= 4, say: preset + ' ' + run.toFixed(1) + ' m' });
}
ok(K.radius.every((r) => r.ok), 'A COPING THE AIR DID NOT LEAVE KEEPS THE ASSIST\'S RADIUS: an ollie 30 cm outside the Basin\'s rim, and a transfer from the Lawn Quarter set down 30 cm beside the Spine\'s coping, each caught beyond grind.onTop (' + PHYSICS.grind.onTop * 100 + ' cm) — ' + line(K.radius));
ok(K.run.every((r) => r.ok), 'THE COPING RUN IS STILL RIDDEN: that ollie grinds the Basin\'s coping for the goal\'s 4 m — ' + line(K.run));
BODY.say('every ride here');
console.log(DROPPED.say('every lip air here'));
console.log(fail ? 'COPING CAPTURE: RED' : 'COPING CAPTURE: GREEN'); process.exit(fail ? 1 : 0);
