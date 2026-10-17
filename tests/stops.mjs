/* THE STOP SITES (10-17, the supervisor: "a census of every site in the sim that stops at a contact (a bisection, a clamp, a '1 mm short') and
 * what it does with the step's rest ... Each classified 'slides' or 'stops, and says so'", and of it, "a class wall on the source (a new
 * unclassified site RED)"). The census was read on r24 by an agent from the whole of body.js (32 sites); here it is the source's own table.
 *   · every line of build/js/sim/body.js that stops, clamps, sets back or places a move or a turn — the PATTERNS below: a set-back on the path,
 *     a placement, a millimetre short, a bump loop, a turn cut at a face, an iteration cap or a bisection, a stop that bails, a progress
 *     clamped — is on a row of the census (it holds one of the row's anchors): a new one is RED until it is classified;
 *   · every row's anchors are found, as many times as the row says (a stale anchor is RED: the row no longer reads the code it names);
 *   · a row that STOPS AND SAYS SO says so where it stops (its saying within its lines: a said leftover, body.js noteDropped, or an event).
 * The classes: slides (the rest of the step goes on along the face, the rail or the surface) · stops, and says so · carries (a limit that
 * hands its rest to the next step, never drops it) · places (a placement, not a stop: a seat, a respawn) · precision (a bisection's halvings).
 *   node tests/stops.mjs [--table]
 * Plants (tests/plants.mjs): stop_unclassified (a new set-back on the path), stop_unsaid (the level face's saying gone) → RED. */
import fs from 'node:fs';

const SRC = new URL('../build/js/sim/body.js', import.meta.url), FILE = fs.readFileSync(SRC, 'utf8'), LINES = FILE.split('\n');
const PATTERNS = [
  [/\batFree\(/, 'the air\'s set-back'], [/V\.lerp\(this\.p, /, 'a set-back on the path'], [/V\.(set|copy)\(this\.p, /, 'a placement'],
  [/this\.p\[1\] = /, 'a height set'], [/- 0\.001\)? \//, 'a millimetre short'], [/\bbump < /, 'a bump loop'], [/this\.turnClear\(/, 'a turn cut at a face'],
  [/for \(let (k|it) = 0; (k|it) < ([5-9]|\d{2,})\b/, 'an iteration cap or a bisection'], [/this\.toBail\(/, 'a stop that bails'], [/V\.clamp\(g\.s/, 'a progress clamped'],
];
/* THE CENSUS: { row, site, class, anchors: [text | [text, count]], said?: [text] } — rows 1–32 are r24's census (their numbers kept), the
   rest r25's own */
const CENSUS = [
  { row: 1, site: 'step: a state that is not a finite number — and the page\'s frame that threw (main.js) — stood up at the first node (fault)', class: 'stops, and says so', anchors: ["fault(what) { this.events.push({ type: 'fault', what });"], said: ["'fault'"] },
  { row: 2, site: 'stepGround: the steering\'s turn cut 1 mm short of a face (turnClear)', class: 'stops, and says so', anchors: ['this.turnClear(this.fwd, V.rotate(S[10], this.fwd, up, yaw0))'], said: ["'a turn cut at a face (the steering)'"] },
  { row: 3, site: 'stepGround → tryLip: a coping met slowly with the lip held (the stall\'s snap)', class: 'stops, and says so', anchors: ['this.lipHeld != null && this.tryLip()) return;'] },
  { row: 4, site: 'stepGround: the heading chasing its travel, held to its budget (skid)', class: 'carries', anchors: ['const turn = V.clamp(step0, -most, most)'] },
  { row: 5, site: 'stepGround: the heading\'s chase cut 1 mm short of a face (turnClear)', class: 'stops, and says so', anchors: ['const kC = this.turnClear(this.fwd, nf);'], said: ["'a turn cut at a face (the heading\\'s chase)'"] },
  { row: 6, site: 'rollOn: three bumps along the faces (rollPart: 1 mm short, then the rest along the face)', class: 'slides', anchors: ['for (let bump = 0; bump < 3 && left > 1e-7; bump++) {', 'hit.stop = into > 1e-9 ? V.clamp((ahead - 0.001) / into, 0, 1) : 0;'], said: ["'the roll'"] },
  { row: 7, site: 'rollPart: a face met faster than the bail', class: 'stops, and says so', anchors: ["if (-vn > PH.body.bailSpeed) { this.toBail('wall', -vn); return 'bail'; }"] },
  { row: 8, site: 'rollOn: a step that found no ground (off an edge, a lip, a drop-in) flown from its start', class: 'slides', anchors: ["if (!met && (r === 'off' || r === 'lip' || r === 'dropin')) V.copy(this.p, p0);"] },
  { row: 9, site: 'attach: the seat on its contacts\' plane, moved along its normal only', class: 'places', anchors: ['V.set(this.p, this.p[0] - newUp[0] * off'] },
  { row: 10, site: 'attach: the drop-in (the front wheels\' ground ignored)', class: 'slides', anchors: ['this.dropping = cr; got[lead] = false;'] },
  { row: 11, site: 'lowerOnto: the roll-in, the front wheels turned down onto the wall (six passes, then the seat)', class: 'carries', anchors: ['for (let it = 0; it < 6; it++) {', 'V.copy(this.p, p); V.copy(this.up, up); V.copy(this.fwd, fwd);'] },
  { row: 12, site: 'walls: a body sphere at a wall, 12 halvings, 1 mm short, then one slide along it (its own stop said)', class: 'slides', said: ["'the walls'"],
    anchors: ['const r = pen(q); if (r.worst > 0) { hi = m; hitN = r.n; } else lo = m; }', ['const L = V.len(V.sub(q, this.p, before)), k = L > 1e-9 ? Math.max(0, lo - 0.001 / L) : 0;', 2], 'rest = this.p.slice(); V.lerp(this.p, before, this.p, k); V.sub(rest, rest, this.p); worst = 0;',
      'if (pen(to).worst <= 0) V.copy(this.p, to);', 'V.lerp(q, from, to, m); if (pen(q).worst > 0) hi = m; else lo = m; }', 'const k2 = Math.max(0, lo - 0.001 / gl); V.lerp(this.p, from, to, k2);'] },
  { row: 13, site: 'walls: a level face met (no slide along it)', class: 'stops, and says so', anchors: ['hitN[1] = 0; const l = Math.hypot(hitN[0], hitN[2]); if (l < 1e-6) {'], said: ["'the walls (a level face)'"] },
  { row: 14, site: 'walls: a contact there at the step\'s start pushed out 25 % a step; a wall met faster than the bail', class: 'slides', anchors: ['if (worst > 0) V.addScaled(this.p, this.p, hitN, WALL_BETA * worst);', "if (-vn > (s === PH.body.low ? PH.body.lowBailSpeed : PH.body.bailSpeed)) { this.toBail('wall', -vn); return; }"] },
  { row: 15, site: 'stepAir: below 20 m under the park', class: 'stops, and says so', anchors: ["if (this.p[1] < -20) { this.toBail('fell', 10); }"] },
  { row: 16, site: 'wheelsInAir: the touchdown\'s ten passes (what is left goes to wheelsOut and the next step)', class: 'carries', anchors: ['for (let k = 0; k < 10; k++) {'] },
  { row: 17, site: 'wheelsInAir: an edge up through the deck (deckMeets: 12 halvings) — a pivot, or held on it (said), or hung up at its own step\'s start (a bail)', class: 'stops, and says so', said: ["'held on an edge'", "'hangup'"],
    anchors: ['along(m, to); const q = this.edgeThrough(P.p, P.up, P.fwd);', 'atFree(-1, dm.s, true);', "this.toBail('hangup', -vn); return true; }", "if (dm.s <= 0) { this.toBail('hangup', Math.max(0, -vn)); return true; }"] },
  { row: 18, site: 'wheelsInAir → land: the middle meets the surface (the landing; the rest of its step not rolled)', class: 'stops, and says so', said: ["'a landing\\'s roll'"],
    anchors: ['V.lerp(this.p, before, this.p, mid.s);', 'if (air.quiet && quality !== \'bail\') { V.copy(this.p, hit.point);', ['V.copy(this.p, hit.point); this.settle = { w: Math.abs(impact) / (PH.wheelbase / 2), t0: this.t, from: null, left: 0 };', 2]] },
  { row: 19, site: 'wheelsInAir: a wheel against a face end-on (set back to its moment; the velocity into the face taken; faster than the bail, a bail)', class: 'stops, and says so', said: ["'a wheel against a face in the air'"],
    anchors: ["atFree(w.i, w.s); this.noteDropped(V.len(V.sub([0, 0, 0], fe.p, this.p)), 'a wheel against a face in the air');", "{ this.toBail('wall', -vn); return true; } V.addScaled(this.v, this.v, n, -vn);"] },
  { row: 20, site: 'land: the first touch judged a bail', class: 'stops, and says so', anchors: ["if (quality === 'bail') { V.copy(this.p, hit.point); this.toBail('landing', impact); said(landEv); return; }"] },
  { row: 21, site: 'wheelsInAir: the deck resting on an edge with a wheel on its face — lands where it is', class: 'slides', anchors: ['const at = { point: this.p.slice(), normal: rs.n, surf: w.surf, face: rs.n }; this.land(at'] },
  { row: 22, site: 'wheelsInAir: a wheel hits with a wheel across the middle already resting (set back, landed there)', class: 'stops, and says so', said: ["'a landing\\'s roll'"], anchors: ["atFree(w.i, w.s); this.noteDropped(V.len(V.sub([0, 0, 0], fe.p, this.p)), 'a landing\\'s roll');"] },
  { row: 23, site: 'wheelsInAir: the board turned about its middle so a wheel rests on its face (the middle\'s path never moved)', class: 'slides', anchors: ['V.norm(this.up, V.rotate(this.up, this.up, ax, th)); V.norm(this.fwd, V.reject(this.fwd, V.rotate(this.fwd, this.fwd, ax, th), this.up)); this.airTouch++;   // (a contact turned the board: said)'] },
  { row: 24, site: 'wheelsOut: a wheel inside a solid pushed out (six passes; the sixth still moving said)', class: 'slides', anchors: ['for (let k = 0; k < 6; k++) {', 'if (spent) this.noteDropped(spent.depth, '], said: ["'the push-out\\'s six passes spent'"] },
  { row: 25, site: 'wallsAir: the body\'s high sphere at a face, 12 halvings, 1 mm short, then collide and slide along the contact (three bumps; what is left said)', class: 'slides', said: ["'the air'"],
    anchors: ['const r = pen(q); if (r.worst > 0) { hi = m; hitN = r.n; c = r.c; } else lo = m; }', 'const free = this.p.slice(), rest = this.p.slice(); V.lerp(this.p, before, this.p, k); V.sub(rest, rest, this.p);', 'for (let bump = 0; bump < 3 && left; bump++) {',
      'if (pen(to).worst <= 0) { V.copy(this.p, to); left = null; own.push([from, to.slice()]); break; }', 'const r = pen(q2); if (r.worst > 0) { hi2 = m; c = r.c; } else lo2 = m; }', 'const k2 = Math.max(0, lo2 - 0.001 / gl); V.lerp(this.p, from, to, k2);',
      "if (vn < -PH.body.bailSpeed) { this.toBail('wall', -vn); return; }"] },
  { row: 26, site: 'tryGrind / placeOnRail: the fall undone at a rail\'s top, the travel kept and eased onto its line', class: 'slides', anchors: ['this.p[1] = top;', 'V.set(this.p, mx + up[0] * hump + inward[0] * 0.06'] },
  { row: 27, site: 'stepGrind / the manual / the lip stall: balance lost', class: 'stops, and says so', anchors: ["this.leaveRail(false, 'balance'); this.toBail('balance', 2);", "this.endManual(false); this.toBail('balance', 1.5);", "else if (this.state === 'lip') { this.toBail('balance', 1.5); }"] },
  { row: 28, site: 'stepGrind: a stall on the rail', class: 'stops, and says so', anchors: ["if (g.speed < 0.35) { this.leaveRail(false, 'stall'); return; }"], said: ["'stall'"] },
  { row: 29, site: 'stepGrind: the rail\'s end (placed where the step carried it, then the progress clamped)', class: 'slides', anchors: ["g.s = V.clamp(g.s, 0, r.length); this.leaveRail(true, 'end');"] },
  { row: 30, site: 'popOffRail: the grind ended by a pop (the same step flown)', class: 'slides', anchors: ['V.addScaled(this.v, this.v, Y, Math.sqrt(2 * PH.gAir * apex));'] },
  { row: 31, site: 'stepLip → dropIn: the lip stall\'s end (placed out and down, seated)', class: 'places', anchors: ['V.set(this.p, L.at[0] + out[0] * 0.05, L.at[1] - 0.05, L.at[2] + out[2] * 0.05);'] },
  { row: 32, site: 'stepBail: the board during a bail, where it fell (the slide seen is the view\'s), until its respawn', class: 'stops, and says so', anchors: ['V.scale(b.v, b.v, Math.max(0, 1 - dt * 3));', "this.events.push({ type: 'respawn', at: this.p.slice() });"], said: ["'respawn'"] },
  { row: 33, site: 'atFree: the air\'s set-back to a contact\'s moment (rows 17, 19, 22), its turn too — said as a contact (airTouch)', class: 'precision', anchors: ['const atFree = (i, s0, deck = false) => { let s = s0; this.airTouch++;', 'V.lerp(this.p, before, fe.p, s);'] },
  { row: 34, site: 'respawnAt: the respawn\'s placement', class: 'places', anchors: ['V.set(this.p, at[0], h ? h.point[1] : at[1], at[2]);'] },
  { row: 35, site: 'turnClear: the share of a turn that keeps every wheel 1 mm short of a face — what it cuts is said by its callers (rows 2, 5 and 36)', class: 'precision', anchors: ['if (into > 1e-9) k = Math.min(k, V.clamp((ahead - 0.001) / into, 0, 1));'] },
  { row: 36, site: 'stepGround: the catch (the spin assist\'s turn onto the line on the ground) cut 1 mm short of a face — said, and handed back to the chase', class: 'stops, and says so', anchors: ['const kT = this.turnClear(this.fwd, nf); V.norm(this.fwd, V.lerp(this.fwd, this.fwd, nf, kT));'], said: ["'a turn cut at a face (the catch)'"] },
];
const CLASSES = new Set(['slides', 'stops, and says so', 'carries', 'places', 'precision']);

let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const covered = new Map(), stale = [], unsaid = [], badClass = [];
for (const R of CENSUS) {
  if (!CLASSES.has(R.class)) badClass.push(R.row);
  const lines = [];
  for (const A of R.anchors) {
    const [text, want] = Array.isArray(A) ? A : [A, 1], at = LINES.map((l, i) => (l.includes(text) ? i : -1)).filter((i) => i >= 0);
    if (at.length !== want) stale.push('row ' + R.row + ' "' + text.slice(0, 60) + '" ' + at.length + ' time' + (at.length === 1 ? '' : 's') + ' (its row says ' + want + ')');
    for (const i of at) { lines.push(i); (covered.get(i) || covered.set(i, []).get(i)).push(R.row); }
  }
  /* (its saying: on its lines, or within two lines past them) */
  if (R.said && lines.length) { const lo = Math.min(...lines), hi = Math.max(...lines), near = LINES.slice(lo, hi + 3).join('\n');
    for (const s of R.said) if (!near.includes(s)) unsaid.push('row ' + R.row + ' (' + R.site.split(':')[0] + ') no longer says ' + s); }
  if (R.class === 'stops, and says so' && !R.said && !lines.some((i) => /events\.push|toBail\(|leaveRail\(|tryLip|noteDropped|'fault'/.test(LINES.slice(i, i + 2).join(' ')))) unsaid.push('row ' + R.row + ' says nothing at its lines');
}
const sites = []; LINES.forEach((l, i) => { if (/^\s*(\/\*|\*|\/\/)/.test(l)) return; for (const [re, what] of PATTERNS) if (re.test(l)) { sites.push({ i, what }); break; } });
const unclassified = sites.filter((x) => !covered.has(x.i));
const by = {}; for (const R of CENSUS) by[R.class] = (by[R.class] || 0) + 1;
ok(unclassified.length === 0 && stale.length === 0 && unsaid.length === 0 && badClass.length === 0, 'THE STOP SITES ARE CLASSIFIED: ' + sites.length + ' lines of the sim stop, clamp, set back or place a move or a turn, each on its census row — ' + unclassified.length + ' unclassified' + (unclassified.length ? ' (' + unclassified.slice(0, 4).map((x) => 'line ' + (x.i + 1) + ', ' + x.what + ': ' + LINES[x.i].trim().slice(0, 70)).join(' · ') + ')' : '') + ' · ' + CENSUS.length + ' rows, ' + stale.length + ' stale anchors' + (stale.length ? ' (' + stale.slice(0, 3).join(' · ') + ')' : '') + ' · ' + unsaid.length + ' that no longer say so' + (unsaid.length ? ' (' + unsaid.slice(0, 3).join(' · ') + ')' : '') + (badClass.length ? ' · rows of no class: ' + badClass.join(', ') : ''));
console.log('ℹ THE CENSUS BY CLASS — ' + Object.entries(by).map(([k, v]) => v + ' ' + k).join(' · '));
if (process.argv.includes('--table')) for (const R of CENSUS) console.log('  ' + String(R.row).padStart(2) + ' · ' + R.class.padEnd(18) + ' · ' + R.site);
console.log(fail ? 'STOPS: RED' : 'STOPS: GREEN'); process.exit(fail ? 1 : 0);
