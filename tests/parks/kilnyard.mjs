/* KILN YARD'S OWN CASE LISTS (the shape orgo-u-53 set, 10-16: each park brings its lists; the walls loop over the parks). Coordinates are the
 * park's (build/js/parks/kilnyard.js): x east 0..96, z north 0..72, the spillway's floor at y 0, the apron 2.40, the yard 4.15, the dock 5.35.
 * Headings: 0 north (+z), 90 east (+x), 180 south, 270 west. A run's name carries the words the walls read it by (", into it over its rim / from its deck", "a ledge's
 * end"). The big drops are not here: they are REPORTED (tests/parks/kilnyard_drops.mjs) until the legs take big landings (orgo-u-53, 10-16). */
const RIM = 2.40, APRON = 2.40, YARD = 4.15, DOCK = 5.35, DIY = 5.65, EAST = 5.95;

/* tests/surfaces.mjs: [name, start, the drive each frame, frames]; every run on every preset (the supervisor's bar: Cruise, Classic, Raw) */
export function surfaceRuns({ coast, ollieWhen }) {
  const R = [];
  /* transitions: up to fakie and back */
  for (const v of [4, 6, 8]) R.push(['North Wall (the spillway), up to fakie and back at ' + v + ' m/s', { at: [20, 0, 8.0], heading: 0, speed: v }, coast, 240]);
  for (const v of [4, 6, 8]) R.push(['South Wall (the spillway), up to fakie and back at ' + v + ' m/s', { at: [70, 0, 11.5], heading: 180, speed: v }, coast, 240]);
  for (const v of [4, 6, 8]) R.push(['Kiln Wall, up to fakie and back at ' + v + ' m/s', { at: [84, YARD, 45], heading: 90, speed: v }, coast, 240]);
  for (const v of [3, 4.5]) R.push(['DIY Quarter, up to fakie and back at ' + v + ' m/s', { at: [9, YARD, 63], heading: 270, speed: v }, coast, 160]);
  for (const v of [4, 5.5]) R.push(['DIY Spine, up its east face at ' + v + ' m/s', { at: [17, YARD, 61], heading: 270, speed: v }, coast, 180]);
  /* rolled in over a coping (a bare concrete lip on the spillway) */
  for (const v of [3, 5]) R.push(['The spillway, into it over its rim (the North Wall, from the apron) at ' + v + ' m/s', { at: [24, APRON, 18.5], heading: 180, speed: v }, coast, 200]);
  for (const v of [3, 5]) R.push(['The spillway, into it over its rim (the South Wall, from the rim) at ' + v + ' m/s', { at: [60, RIM, 1.2], heading: 0, speed: v }, coast, 200]);
  for (const v of [3, 5]) R.push(['The Kiln Wall, into it from its deck (the East Deck) at ' + v + ' m/s', { at: [95.5, EAST, 45], heading: 270, speed: v }, coast, 180]);
  for (const v of [3]) R.push(['The DIY Quarter, into it from its deck at ' + v + ' m/s', { at: [0.5, DIY, 64], heading: 90, speed: v,
    deferred: { raw: 'the drop-in landing settling at its contact\'s rate (the Sun Bank\'s class): the settle\'s share subtraction is the next release\'s' } }, coast, 160]);
  /* a block's side met slowly at an angle, unsteered: the board comes to rest against it (the merged sweep's class, as the Plaza's Pad's side):
     the Kiln Pad's south face, 0.2 m, from the apron below it */
  R.push(["The Kiln Pad's side, rolled into at 1.5 m/s 13° off square (unsteered)", { at: [63, APRON, 19.6], heading: 13, speed: 1.5 }, coast, 120]);
  /* a ledge's end: rolled off the Kiln Pad going east */
  R.push(['The Kiln Pad, rolled off its end going east at 4 m/s (a ledge\'s end)', { at: [62, APRON + 0.2, 22.2], heading: 90, speed: 4 }, coast, 150]);
  /* banks and bumps, down and up */
  /* down the Ten Bank and across the apron, read until 2 m short of the spillway's lip (a roll-in past it is the North Wall's run) */
  for (const v of [2, 3, 5]) R.push(['Ten Bank, down it at ' + v + ' m/s', { at: [35.7, YARD, 31.5], heading: 180, speed: v }, coast, v >= 5 ? 105 : 140]);
  for (const v of [4, 6]) R.push(['Ten Bank, up it at ' + v + ' m/s', { at: [35.7, APRON, 21.5], heading: 0, speed: v }, coast, 140]);
  /* (the 2 m/s ride is a named deferral until the crest's fillet lands and it reads the deck's jump ≤ 1 cm: then the mark comes off) */
  for (const v of [2, 3, 5]) R.push(['Dock Ramp, down it at ' + v + ' m/s', Object.assign({ at: [41.5, DOCK, 67.5], heading: 270, speed: v }, v === 2 ? { reported: 'the dock crest\'s hop: a fillet ≥ 1.64 m at the crest (a stated map change, orgo-u-48); the engine\'s gentle-crest class is the next release\'s' } : {}), coast, 160]);
  for (const v of [4, 6]) R.push(['Dock Ramp, up it at ' + v + ' m/s', { at: [26, YARD, 67.5], heading: 90, speed: v }, coast, 160]);
  for (const v of [4, 6]) R.push(['The Bumps, over both at ' + v + ' m/s', { at: [11, YARD, 32], heading: 0, speed: v }, coast, 160]);
  for (const v of [4, 5.5]) R.push(['The Kiln, up its west bank and over at ' + v + ' m/s', { at: [57, YARD, 54], heading: 90, speed: v }, coast, 180]);
  /* ollies onto ledges, rails and edges, along them (popped 0.3 m past their start, as the Plaza's runs are) */
  for (const v of [4, 5.5]) R.push(['Apron Ledge, an ollie onto it going east at ' + v + ' m/s', { at: [4.5, APRON, 21.7], heading: 90, speed: v }, ollieWhen((sk) => sk.p[0] >= 6.3), 150]);
  for (const v of [4, 5.5]) R.push(['Red Ledge, an ollie onto it going east at ' + v + ' m/s', { at: [18.5, YARD, 47.7], heading: 90, speed: v }, ollieWhen((sk) => sk.p[0] >= 20.3), 150]);
  R.push(['Granite Block, an ollie onto it going east at 4 m/s', { at: [28.5, YARD, 55.7], heading: 90, speed: 4 }, ollieWhen((sk) => sk.p[0] >= 30.3), 120]);
  R.push(['Drain Block, an ollie onto it going east at 4.5 m/s', { at: [28.5, 0, 8.3], heading: 90, speed: 4.5 }, ollieWhen((sk) => sk.p[0] >= 30.3), 150]);
  for (const v of [4.5, 5.5]) R.push(['Flat Bar, an ollie onto it going east at ' + v + ' m/s', { at: [18.5, YARD, 39.7], heading: 90, speed: v, reported: 'F3, the Plaza\'s Low Bar reads it too' }, ollieWhen((sk) => sk.p[0] >= 20.3), 150]);
  R.push(['The Pipe, an ollie onto it going east at 4.5 m/s', { at: [54.5, 0, 10.7], heading: 90, speed: 4.5, reported: 'F3' }, ollieWhen((sk) => sk.p[0] >= 56.3), 150]);
  for (const v of [5, 6]) R.push(['Barrier Run, an ollie onto it going east at ' + v + ' m/s', { at: [54.5, YARD, 43.9], heading: 90, speed: v }, ollieWhen((sk) => sk.p[0] >= 56.3), 150]);
  for (const v of [4.5, 6]) R.push(['Long Edge, an ollie onto it going east at ' + v + ' m/s', { at: [54.5, YARD, 30.6], heading: 90, speed: v }, ollieWhen((sk) => sk.p[0] >= 56.3), 180]);
  for (const v of [4.5]) R.push(['Dock Edge, an ollie onto it going east from the dock at ' + v + ' m/s', { at: [44, DOCK, 65.0], heading: 90, speed: v }, ollieWhen((sk) => sk.p[0] >= 45.5), 180]);
  R.push(['Ten Rail, an ollie onto it down the stairs at 4.6 m/s', { at: [44.25, YARD, 35.5], heading: 180, speed: 4.6,
    deferred: {
      classic: 'BODY: the hips and the foot after a landing on the steps\' nose line (r21 on the same ride: the hips 144 m/s², the fastest joint 1195°/s; here 189 and footL 2355°/s, the chain\'s first break the bones)',
      raw: 'BODY: the foot and the hips after a landing on the steps\' nose line (r21 lands flat on a tread)' } }, ollieWhen((sk) => sk.p[2] <= 32.3), 150]);
  R.push(['The Hubba, an ollie onto its top and down the stairs at 3.5 m/s', { at: [48.3, YARD, 38], heading: 180, speed: 3.5 }, ollieWhen((sk) => sk.p[2] <= 34.2), 230]);
  R.push(['The Hubba, an ollie onto its top and down the stairs at 4.6 m/s', { at: [48.3, YARD, 38], heading: 180, speed: 4.6, reported: 'F6, a stair ledge\'s line is not rounded as a rail\'s is — rounded at 0.6 m the hips read 54, unrounded 62' }, ollieWhen((sk) => sk.p[2] <= 34.2), 230]);
  R.push(['The Hubba, caught late down its slope at 4.6 m/s', { at: [48.3, YARD, 37], heading: 180, speed: 4.6, reported: 'F2, a catch onto a down-sloping line' }, ollieWhen((sk) => sk.p[2] <= 31.4), 170]);
  R.push(['Kiln Rail, an ollie onto it off the Kiln\'s top at 4 m/s', { at: [65.5, YARD + 0.9, 54.25], heading: 90, speed: 4, reported: 'F2, the Plaza\'s Box Rail reads it too' }, ollieWhen((sk) => sk.p[0] >= 66.6), 150]);
  R.push(['Dock Rail, an ollie onto it down the Dock Seven at 4.6 m/s', { at: [87.25, DOCK, 70], heading: 180, speed: 4.6,
    deferred: {
      classic: 'BODY: the foot answering the board\'s turn in the air (r21 on the same ride: the fastest joint 1195°/s, the hips 161 m/s²; here footL 2534°/s and 177, the chain\'s first break the bones)',
      raw: 'BODY: the foot answering the board\'s turn in the air (r21 on the same ride: the fastest joint 1195°/s, the hips 161 m/s²; here footL 2532°/s and 176, the chain\'s first break the bones)' } }, ollieWhen((sk) => sk.p[2] <= 66.8), 150]);
  /* every run on every preset; a run's `deferred` names what ONE preset's ride is reported for (a named deferral, the supervisor's, 10-17):
     ridden and said on that preset, never gated there, gated on the others */
  const out = [];
  for (const preset of ['cruise', 'classic', 'raw']) for (const [name, o, drive, frames] of R) {
    const { deferred, ...run } = o;
    out.push([name + ' · ' + preset, Object.assign({ preset }, run, deferred && deferred[preset] ? { reported: deferred[preset] } : {}), drive, frames]);
  }
  return out;
}

/* EVERY NAMED GAP IS REACHED BY A RUN A PLAYER CAN MAKE (orgo-u-53, 10-16 after F7; the standard 10-17): each row starts ROLLING (3 m/s) where a
 * player can be and pushes; its speed is only the push's and the park's (the push from rest, measured: 10 m → 4.8 m/s, 30 → 6.2, 60 → 7.0, never
 * 7.5). Ridden by tests/parks/gap_ride.mjs, judged by tests/parks/gaps_reached.mjs: REACHED = found and its combo banked. Each pop's mark is the
 * middle of its measured window (runs/gap_window.mjs: the marks that reach it, in metres and in the milliseconds a player is given):
 *   pop: { axis: 0 (x) | 2 (z), le | ge: v }   an ollie as the board's coordinate passes v (none: the line takes off on its own)
 *   grab: every air out of a lip grabbed · pull: a manual pulled in the air, so it lands in one · secs: how long the run lasts
 *   reported: ridden and said, never gated (an engine finding, or a threshold under recompute) */
/* the note a big air carries (orgo-u-53, 10-17): what it is with the thumb pushing on flat ground alone, as a skater's push will be */
const upTheWall = (flat) => 'the push up a transition, REPORTED for the BODY release\'s natural push: its reach rests on a held thumb pushing up its wall (a real rider cannot); pushing on flat ground alone it is ' + flat + ' — when the push becomes a skater\'s, this line needs another way';
export const GAP_RUNS = [
  /* off the Ten and its neighbours, heading south from the yard */
  { gap: 'Clear the Ten', at: [42, YARD, 45], heading: 180, speed: 3, pop: { axis: 2, le: 31.5 }, secs: 5 },          // 483 ms at the pop
  { gap: 'Ten Rail', at: [44.25, YARD, 40], heading: 180, speed: 3, pop: { axis: 2, le: 33.23 }, secs: 6 },          // 700 ms
  { gap: 'The Hubba', at: [48.3, YARD, 40], heading: 180, speed: 3, pop: { axis: 2, le: 35.9 }, secs: 7 },           // 217 ms
  { gap: 'Bank Drop', at: [35.7, YARD, 59.5], heading: 180, speed: 3, pop: { axis: 2, le: 31.63 }, secs: 9 },        // 500 ms, 28 m of push
  { gap: 'Yard Drop', at: [74, YARD, 38], heading: 180, speed: 3, pop: { axis: 2, le: 31.75 }, secs: 5 },            // 750 ms
  /* the Long Edge: 36 m over the Yard Drop's face — only a board that reaches its end lands (a stall falls off the drop, F9), so it is met
     at speed: 52 m of push on a diagonal from the yard's west side */
  { gap: 'Long Edge', at: [10, YARD, 50], heading: 112, speed: 3, pop: { axis: 2, le: 32.2 }, secs: 20 },            // 243 ms at 6.8 m/s
  /* the yard's middle */
  { gap: 'Barrier Run', at: [22, YARD, 43.9], heading: 90, speed: 3, pop: { axis: 0, ge: 51.58 }, secs: 12 },        // 367 ms
  { gap: 'Barrier Hop', at: [61, YARD, 30.6], heading: 0, speed: 3, pop: { axis: 2, ge: 42.02 }, secs: 5 },          // 500 ms
  /* over the kiln BESIDE its rail (down the middle, the rail takes the board: the catch reaches 0.625 m) */
  { gap: 'Kiln Hop', at: [2, YARD, 53.3], heading: 90, speed: 3, pop: { axis: 0, ge: 63.33 }, secs: 14 },            // 600 ms
  { gap: 'Kiln Rail', at: [2, YARD, 54.25], heading: 90, speed: 3, pop: { axis: 0, ge: 62.22 }, secs: 14 },          // 467 ms
  { gap: 'Flat Bar', at: [14.5, YARD, 39.7], heading: 90, speed: 3, pop: { axis: 0, ge: 16.77 }, secs: 6 },          // 400 ms
  { gap: 'Red Ledge', at: [1.5, YARD, 47.7], heading: 90, speed: 3, pop: { axis: 0, ge: 15.55 }, secs: 9 },          // 283 ms
  { gap: 'Granite Block', at: [20, YARD, 55.7], heading: 90, speed: 3, pop: { axis: 0, ge: 26.43 }, secs: 5 },       // 400 ms
  { gap: 'Bump to Bump', at: [11, YARD, 30.6], heading: 0, speed: 3, pop: { axis: 2, ge: 37.38 }, secs: 4 },          // 222 ms at 3.6 m/s
  /* the dock: the Dock Edge ridden west to its end and off onto the dock's ramp */
  { gap: 'Dock Edge', at: [85, DOCK, 65.0], heading: 270, speed: 3, pop: { axis: 0, le: 63 }, secs: 14 },            // 1673 ms
  { gap: 'Dock Drop', at: [60, DOCK, 71.5], heading: 180, speed: 3, pop: { axis: 2, le: 66.33 }, secs: 5 },          // 515 ms
  { gap: 'Dock Seven', at: [85.5, DOCK, 71.5], heading: 180, speed: 3, pop: { axis: 2, le: 65.88 }, secs: 5 },       // 323 ms, beside the rail
  { gap: 'Dock Rail', at: [87.25, DOCK, 71.5], heading: 180, speed: 3, pop: { axis: 2, le: 67.55 }, secs: 6 },       // 339 ms
  /* the airs: their speed is the park's — the spillway dropped into from its rims, the DIY quarter from the dock down its ramp. A spillway air
     is made on the SECOND pass, by a stated engine change: r22's drop-in over a vStar-0 lip; no push down a wall; the owner chose it 10-17
     ("Go with the rec and finish up", orgo-u-53's (a)). V13 rolled over the sharp rim and a held thumb pushed on down the wall, which a skater
     cannot do, and made the first pass at 0.89 m; dropped in, the first pass is 0.57 / 0.55 against 0.6 and the second 0.72 / 0.71 (ca6dbcc). A row moves
     only by a stated change to the map or the engine, never to a later pass to turn a wall green. Each big air carries `note`: it reaches only
     by a held thumb pushing up its transition (body.js wantPush has no slope condition) — REPORTED for the BODY release's natural push */
  { gap: 'Spillway Air', at: [70, APRON, 18.2], heading: 180, speed: 3, grab: true, secs: 12, note: upTheWall('0.34 m over its lip on the merged engine (ca6dbcc), 0.48 on r21 (the first pass)') },   // in from the north apron: the South Wall's air, then the North Wall's (r22's drop-in over a vStar-0 lip; no push down a wall; the owner chose it 10-17)
  { gap: 'South Wall Air', at: [20, RIM, 1.6], heading: 0, speed: 3, grab: true, secs: 12, note: upTheWall('0.34 m on the merged engine (ca6dbcc), 0.47 on r21 (the first pass)') },              // in from the south rim: the North Wall's air, then the South Wall's (r22's drop-in over a vStar-0 lip; no push down a wall; the owner chose it 10-17)
  { gap: 'DIY Air', at: [48, DOCK, 67.0], heading: 270, speed: 3, grab: true, secs: 11 },
  /* gated (orgo-u-53, 10-17: a row that is reached is a gate): a single quarter met from flat, 0.75 m over its lip from a 90 m push on the
     merged engine (ca6dbcc; 0.72 on r21); from 60 m 0.66 and from 45 m 0.47 (before the take-off fix, both engines alike) */
  { gap: 'Kiln Wall Air', at: [2, YARD, 46], heading: 90, speed: 3, grab: true, secs: 18, note: upTheWall('0.51 m from 90 m on the merged engine (ca6dbcc), 0.49 on r21') },
  /* the spillway's floor and the apron */
  { gap: 'Drain Run', at: [20, 0, 8.3], heading: 90, speed: 3, pop: { axis: 0, ge: 26.27 }, secs: 9 },              // 259 ms
  { gap: 'The Pipe', at: [46, 0, 10.7], heading: 90, speed: 3, pop: { axis: 0, ge: 52.22 }, secs: 9 },              // 259 ms
  { gap: 'Apron Ledge', at: [0.5, APRON, 21.7], heading: 90, speed: 3, pop: { axis: 0, ge: 5.17 }, secs: 9 },        // 1228 ms
  { gap: 'Pad Manual', at: [48, APRON, 22.2], heading: 90, speed: 3, pop: { axis: 0, ge: 56.3 }, pull: true, secs: 6 },   // 125 ms at 5.2 m/s, coming down ON the pad (10-17: r21's 402 ms counted pops that came down short of it, whose manual then climbed the pad's 20 cm face pitched 29° onto it — a board meets a face it rolls into since 10-16; the ollie flies the same on both engines)
  { gap: 'Bench Gap', at: [50, APRON, 18.62], heading: 90, speed: 3, pop: { axis: 0, ge: 70.23 }, secs: 6 },          // 242 ms
  { gap: 'Spillway Lip', at: [12, APRON, 17.0], heading: 90, speed: 3, pop: { axis: 0, ge: 16 }, secs: 14,
    reported: 'F9: an ollie out of a grind is caught again by the same rail, and the 96 m coping stalls before its end and drops the board 2.4 m into the channel — found and lost on every mark' },
  { gap: 'DIY Transfer', at: [18.5, YARD, 55.5], heading: 315, speed: 3, pop: { axis: 0, le: 12.45 }, secs: 5,
    reported: 'F8: transfer2 counts only a lip take-off, and a lip air off a spine never lands across on any preset; a pop at the lip that crosses has no lip' },
];
