/* THROWAWAY SPIKE (M0) — the hero park as data, drawn top-down (ASCII + SVG), and every named gap checked against the planned
 * physics numbers. Not game code: the game's park will be js/config.js PARK, read by generators. Run: node spikes/park_plan.mjs
 * Units: metres. x runs east (0..62), z runs north (0..44), y is up. Heights are of the TOP surface. */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(new URL('.', import.meta.url).pathname, '../plan');
fs.mkdirSync(OUT, { recursive: true });

/* ---------------------------------------------------------------- the physics this design is held to (DESIGN.md §4) */
const P = {
  gGround: 9.81,          // rolling on slopes and transitions (real g)
  gAir: 12.5,             // ballistic flight (1.27 g: own tuning, Pittman "Building a Better Jump" method — height + time to apex)
  popMin: 0.30,           // ollie apex, board bottom above takeoff, flick speed grade 1 (m)
  popMax: 0.85,           // the same at grade 5, and always under the Streamlined assist (m)
  pushTop: 7.5,           // top speed by pushing on flat (m/s)
  pumpCap: 8.5,           // top speed by pumping transitions (m/s)
  popTilt: 0.35,          // pop direction = normalize(lerp(worldUp, surfaceNormal, popTilt))
};
const vPop = (h) => Math.sqrt(2 * P.gAir * h);
const GRADES = { 'no pop': 0, 'pop g1': vPop(P.popMin), 'pop g3': vPop((P.popMin + P.popMax) / 2), 'pop g5': vPop(P.popMax) };

/* ---------------------------------------------------------------- the park */
const W = 62, D = 44;
const PARK = {
  ground: [
    { id: 'plaza', name: 'The Plaza', rect: [0, 0, 62, 32], y: 0, surface: 'broom-finished slab, 3 m control joints' },
    { id: 'terrace', name: 'The Terrace', rect: [23, 32, 62, 44], y: 0.80, surface: 'granite pavers 0.6 m' },
    { id: 'westDeck', name: 'West Deck (start)', rect: [20, 32, 23, 44], y: 2.63, surface: 'concrete deck' },
    { id: 'eastDeck', name: 'East Deck', rect: [59, 4, 62, 28], y: 1.83, surface: 'concrete deck' },
    { id: 'lawnDeck', name: 'Lawn Deck', rect: [0, 19, 1.5, 29], y: 1.22, surface: 'concrete deck' },
    { id: 'nwLawn', name: 'North-west lawn', rect: [0, 32, 20, 44], y: 0, surface: 'grass', soft: true },
  ],
  elements: [
    /* transitions: `coping` is the lip line, `face` the direction the riding side lies in from the lip */
    { id: 'deckQuarter', type: 'quarter', name: 'Deck Quarter', coping: [[23, 32], [23, 44]], face: [1, 0], base: 0.80, h: 1.83, r: 2.74, coping_kind: 'steel pipe 60 mm, painted' },
    { id: 'eastQuarter', type: 'quarter', name: 'East Wall', coping: [[59, 4], [59, 28]], face: [-1, 0], base: 0, h: 1.83, r: 2.74, coping_kind: 'steel pipe 60 mm, painted' },
    { id: 'lawnQuarter', type: 'quarter', name: 'Lawn Quarter', coping: [[1.5, 19], [1.5, 29]], face: [1, 0], base: 0, h: 1.22, r: 2.13, coping_kind: 'steel pipe 60 mm' },
    { id: 'spine', type: 'spine', name: 'The Spine', coping: [[8.6, 20], [8.6, 28]], base: 0, h: 1.22, r: 2.13, coping_kind: 'steel pipe 60 mm' },
    { id: 'basin', type: 'bowl', name: 'The Basin', rect: [2, 3, 16, 17], corner: 3.5, depth: 1.83, r: 2.44, coping_kind: 'pool coping (south), steel pipe elsewhere' },
    /* street */
    { id: 'mainLedge', type: 'ledge', name: 'Main Ledge', rect: [28, 23.0, 40, 23.6], h: 0.36, top: 'granite, waxed', edges: 'steel angle on both top edges' },
    { id: 'pad', type: 'ledge', name: 'The Pad', rect: [20.5, 22.4, 26.5, 24.4], h: 0.20, top: 'concrete', edges: 'steel angle on the long edges' },
    { id: 'planter', type: 'ledge', name: 'Planter', rect: [44, 24.4, 46.4, 26.0], h: 0.45, top: 'concrete rim, soil and shrubs', edges: 'rim grindable' },
    { id: 'bench', type: 'ledge', name: 'Bench', rect: [33, 16.6, 35, 17.05], h: 0.45, top: 'timber slats', edges: 'steel edge strips' },
    { id: 'redCurb', type: 'ledge', name: 'Red Curb', rect: [24, 2.6, 54, 3.0], h: 0.15, top: 'concrete, red paint', edges: 'painted edge' },
    { id: 'lowBar', type: 'rail', name: 'Low Bar', pts: [[26, 12, 0.33], [34, 12, 0.33]], od: 0.048 },
    { id: 'block', type: 'box', name: 'The Block', base: [40.71, 5.71, 47.29, 11.29], top: [42, 7, 46, 10], h: 0.60, edges: 'steel angle on the top edges' },
    { id: 'boxRail', type: 'rail', name: 'Box Rail', pts: [[46.0, 8.5, 0.95], [47.29, 8.5, 0.35], [48.4, 8.5, 0.35]], od: 0.048 },
    /* terrace */
    { id: 'sunLedge', type: 'ledge', name: 'Sun Ledge', rect: [30, 35.4, 44, 36.0], base: 0.80, h: 0.42, top: 'granite, waxed', edges: 'steel angle on both top edges' },
    { id: 'terraceBar', type: 'rail', name: 'Terrace Bar', pts: [[30, 42, 1.13], [38, 42, 1.13]], od: 0.048 },
    { id: 'five', type: 'stairs', name: 'The Five', rect: [50, 30.72, 56, 32.0], down: [0, -1], top: 0.80, risers: 5, rise: 0.16, tread: 0.32 },
    { id: 'fiveRail', type: 'rail', name: 'Five Rail', pts: [[53, 32.8, 1.66], [53, 32.0, 1.66], [53, 30.4, 0.86], [53, 29.8, 0.86]], od: 0.048 },
    { id: 'shelf', type: 'stairLedge', name: 'The Shelf', rect: [48.6, 30.4, 49.8, 33.0], profile: [[33.0, 1.25], [32.0, 1.25], [30.4, 0.45]] },
    { id: 'slantLedge', type: 'ledge', name: 'Slant Ledge', line: [[41, 14.2], [51, 19.2]], width: 0.5, h: 0.40, top: 'granite, waxed', edges: 'steel angle on both top edges' },
    { id: 'terraceBlock', type: 'ledge', name: 'Terrace Block', rect: [55, 38, 58, 39.2], base: 0.80, h: 0.45, top: 'granite', edges: 'steel angle on all top edges' },
    { id: 'sunBank', type: 'bank', name: 'Sun Bank', rect: [40, 30.284, 47, 32.0], rise: [0, 1], from: 0, to: 0.80 },
  ],
  spawn: { at: [21.5, 2.63, 38], facing: [1, 0], note: 'on the West Deck, rolling east into the Deck Quarter' },
};

/* lines: the routes a run is designed around (waypoints in x,z; what is done at each) */
const LINES = [
  { id: 'L1', name: 'Golden Line', colour: '#e8a33d', pts: [[21.5, 38], [25.6, 38.5], [29.5, 41.4], [38, 42], [44, 40.5], [50.5, 36], [53, 33], [53, 28.6], [49, 25.6], [44, 25.2], [40.2, 24.0], [28, 23.9], [20.5, 23.4], [12, 24.2], [8.6, 24.2], [3.4, 24.2]],
    says: 'drop in → 50-50 the Terrace Bar → kickflip the Five (or the Rail) → Planter Hop → grind the Main Ledge west → manual the Pad → transfer the Spine → air the Lawn Quarter' },
  { id: 'L2', name: 'Basin Lap', colour: '#3d9be8', pts: [[18.5, 19.5], [15.2, 15.6], [10.5, 4.8], [4.4, 6.5], [3.6, 12.8], [9, 15.4], [14.6, 10.5], [10.5, 4.8]],
    says: 'drop into the Basin from the north-east rim → deep-wall air → carve the south-west corner → grind the west coping → loop' },
  { id: 'L3', name: 'South Loop', colour: '#59c26b', pts: [[19.5, 6], [24, 3.6], [38, 3.6], [41, 8.5], [47.6, 8.5], [55.8, 9.5], [57, 18], [54, 26], [43.5, 29.2], [43.5, 33.2], [35, 38.6], [26.5, 38.6]],
    says: 'curb slappies east → Block Hop (or the Box Rail) → East Wall airs → up the Sun Bank → west along the Terrace → Deck Quarter air' },
  { id: 'L4', name: 'Shelf Line', colour: '#c45ad6', pts: [[47.5, 38.5], [49.2, 33.4], [49.2, 30.4], [47.2, 27.6], [45.2, 25.2], [40, 20.5], [34, 16.85], [32, 12.6], [26, 12.4]],
    says: 'smith the Shelf down → Planter Hop across → Bench Gap → 50-50 the Low Bar' },
  { id: 'L5', name: 'East Wall', colour: '#e85d5d', pts: [[52, 6], [56, 8], [56.6, 14], [56, 20], [56.6, 26]],
    says: 'frontside and backside airs, lip tricks and reverts along 24 m of wall' },
  { id: 'L6', name: 'Corridor', colour: '#8a8f99', pts: [[3.6, 21.5], [6.6, 21.5], [10.4, 21.5], [6.6, 26.5], [3.6, 26.5]],
    says: 'back and forth between the Lawn Quarter and the Spine: transfers, lips, reverts' },
];

/* the named gaps, each with what the game measures and, for an air, the geometry this spike checks */
const GAPS = [
  { n: 1, name: 'Deck Drop', at: [23.6, 36.2], kind: 'air', value: 800, test: 'leave the West Deck at its coping, touch nothing until the Terrace beyond the Deck Quarter', drop: 1.83, dist: 3.0 },
  { n: 2, name: 'Long Five', at: [54.6, 31.2], kind: 'air', value: 500, test: 'take off on the Terrace, land on the Plaza past the last step', drop: 0.80, dist: 1.68 },
  { n: 3, name: 'Rail Ride', at: [53.6, 29.7], kind: 'grind', value: 750, test: 'grind the Five Rail from its top section to its bottom section' },
  { n: 4, name: 'Shelf Down', at: [48.0, 31.4], kind: 'grind', value: 600, test: 'grind the Shelf from the Terrace to its end' },
  { n: 5, name: 'Sun Bank Drop', at: [43.5, 30.9], kind: 'air', value: 400, test: 'leave the Terrace edge, land on the Plaza past the foot of the Sun Bank', drop: 0.80, dist: 2.12 },
  { n: 6, name: 'Terrace Drop', at: [33.5, 31.2], kind: 'air', value: 250, test: 'off the Terrace wall, land 2.5 m or more out', drop: 0.80, dist: 2.5 },
  { n: 7, name: 'Planter Hop', at: [45.2, 26.6], kind: 'clear', value: 350, test: 'over the Planter lengthwise (2.4 m), touching nothing', clear: 0.45, span: 2.4 },
  { n: 8, name: 'Ledge to Pad', at: [27.2, 24.8], kind: 'transfer', value: 400, test: 'grind the Main Ledge, land on the Pad (1.5 m on, 0.16 m down)', drop: 0.16, dist: 1.8 },
  { n: 9, name: 'Pad Manual', at: [23.5, 21.9], kind: 'manual', value: 300, test: 'manual the Pad end to end (6 m)' },
  { n: 10, name: 'Spine Transfer', at: [8.6, 19.2], kind: 'transition', value: 500, test: 'up one face of the Spine, land on the other', h: 1.22, r: 2.13, air: 0.15 },
  { n: 11, name: 'Lawn Wall Air', at: [2.4, 18.4], kind: 'transition', value: 300, test: 'air 0.6 m or more above the Lawn Quarter coping', h: 1.22, r: 2.13, air: 0.60 },
  { n: 12, name: 'Basin Air', at: [10.5, 2.4], kind: 'transition', value: 450, test: 'air 0.75 m or more above the Basin coping', h: 1.83, r: 2.44, air: 0.75 },
  { n: 13, name: 'Coping Run', at: [1.4, 10.5], kind: 'grind', value: 400, test: 'grind 4 m or more of the Basin coping' },
  { n: 14, name: 'Corner Carve', at: [3.4, 3.4], kind: 'carve', value: 350, test: 'carve through a Basin corner above 1.2 m of the wall' },
  { n: 15, name: 'Block Hop', at: [44, 10.9], kind: 'bankclear', value: 450, test: 'from the up-bank over the 4 m top, landing on the down-bank or beyond', clear: 0.60, span: 4.0, bank: 25 },
  { n: 16, name: 'Box Rail', at: [47.6, 9.2], kind: 'grind', value: 400, test: 'grind the Box Rail end to end' },
  { n: 17, name: 'Bench Gap', at: [34, 18.0], kind: 'clear', value: 250, test: 'over the Bench crosswise', clear: 0.45, span: 0.45 },
  { n: 18, name: 'Curb Run', at: [39, 1.8], kind: 'grind', value: 200, test: 'grind 8 m or more of the Red Curb' },
  { n: 19, name: 'East Wall Air', at: [60.4, 16], kind: 'transition', value: 350, test: 'air 0.6 m or more above the East Wall coping', h: 1.83, r: 2.74, air: 0.60 },
  { n: 20, name: 'Sun Ledge Run', at: [37, 34.6], kind: 'grind', value: 300, test: 'grind the Sun Ledge end to end (14 m)' },
  { n: 21, name: 'Terrace Bar', at: [39.4, 42.0], kind: 'grind', value: 300, test: 'grind the Terrace Bar end to end (8 m)' },
  { n: 22, name: 'Deck Wall Air', at: [26.6, 33.0], kind: 'transition', value: 350, test: 'air 0.6 m or more above the Deck Quarter coping (from the Terrace side)', h: 1.83, r: 2.74, air: 0.60 },
  { n: 23, name: 'Slant Run', at: [47.6, 15.2], kind: 'grind', value: 350, test: 'grind the Slant Ledge end to end (11.2 m, set 27 degrees across the plaza)' },
  { n: 24, name: 'Block Manual', at: [56.5, 40.0], kind: 'manual', value: 250, test: 'manual across the Terrace Block (3 m), on and off' },
];

/* ---------------------------------------------------------------- geometry helpers */
const extent = (h, r) => Math.sqrt(r * r - (r - h) * (r - h));            // horizontal run of a transition of height h, radius r
const lipDeg = (h, r) => Math.acos((r - h) / r) * 180 / Math.PI;           // the wall's angle from horizontal at the lip
function corners(e) {             // a ledge set along a line: its four corners
  const [a, b] = e.line, dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = -dz / L * e.width / 2, nz = dx / L * e.width / 2;
  return [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]];
}
function footprint(e) {
  if (e.rect) return e.rect;
  if (e.line) { const c = corners(e), xs = c.map((p) => p[0]), zs = c.map((p) => p[1]); return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; }
  if (e.type === 'quarter') { const x = extent(e.h, e.r), [a, b] = e.coping; const xs = [a[0], b[0], a[0] + e.face[0] * x, b[0] + e.face[0] * x], zs = [a[1], b[1], a[1] + e.face[1] * x, b[1] + e.face[1] * x]; return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; }
  if (e.type === 'spine') { const x = extent(e.h, e.r), [a, b] = e.coping; return [a[0] - x, Math.min(a[1], b[1]), a[0] + x, Math.max(a[1], b[1])]; }
  if (e.type === 'box') return e.base;
  if (e.type === 'rail') { const xs = e.pts.map((p) => p[0]), zs = e.pts.map((p) => p[1]); return [Math.min(...xs) - 0.1, Math.min(...zs) - 0.1, Math.max(...xs) + 0.1, Math.max(...zs) + 0.1]; }
  return null;
}
const overlap = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/* ---------------------------------------------------------------- checks: inside the park, no two elements on one spot */
const problems = [];
for (const e of PARK.elements) {
  const f = footprint(e);
  if (f[0] < 0 || f[1] < 0 || f[2] > W || f[3] > D) problems.push(e.name + ' leaves the park ' + JSON.stringify(f));
}
for (let i = 0; i < PARK.elements.length; i++) for (let j = i + 1; j < PARK.elements.length; j++) {
  const a = PARK.elements[i], b = PARK.elements[j];
  if (a.type === 'rail' || b.type === 'rail') continue;                       // rails stand on what they are fixed to
  if (overlap(footprint(a), footprint(b))) problems.push(a.name + ' overlaps ' + b.name);
}

/* ---------------------------------------------------------------- the gaps against the physics */
function dropGap(drop, dist, vy) {            // speed needed along the path to land `dist` out and `drop` below
  const t = (vy + Math.sqrt(vy * vy + 2 * P.gAir * drop)) / P.gAir;
  return dist / t;
}
function clearGap(clear, span, vy) {          // speed needed to stay above `clear` for `span` metres (a perfectly timed pop)
  const d = vy * vy - 2 * P.gAir * clear; if (d <= 0) return Infinity;
  return span / (2 * Math.sqrt(d) / P.gAir);
}
function bankHop(clear, span, bankDeg, vy) {  // from the top of an up-bank: carry `span` metres before falling back to `clear`
  let lo = 0.5, hi = 20;
  const ok = (v) => {
    const a = bankDeg * Math.PI / 180, n = [-Math.sin(a), Math.cos(a)], up = [0, 1];
    let d = [up[0] + (n[0] - up[0]) * P.popTilt, up[1] + (n[1] - up[1]) * P.popTilt]; const m = Math.hypot(d[0], d[1]); d = [d[0] / m, d[1] / m];
    const vx = v * Math.cos(a) + d[0] * vy, vz = v * Math.sin(a) + d[1] * vy;
    if (vx <= 0) return false;
    const t = 2 * vz / P.gAir;                // back to the height it left (the top of the box)
    return vx * t >= span;
  };
  if (!ok(hi)) return Infinity;
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (ok(mid)) hi = mid; else lo = mid; }
  return hi;
}
function transitionGap(h, r, air) {           // speed at the foot of a transition to air `air` above its lip (no pop, no pump)
  const lip = lipDeg(h, r) * Math.PI / 180;
  const vTop = Math.sqrt(2 * P.gAir * air) / Math.sin(lip);
  return { vTop, vBottom: Math.sqrt(vTop * vTop + 2 * P.gGround * h), lip: lipDeg(h, r) };
}
const gapRows = [];
for (const g of GAPS) {
  const row = { n: g.n, name: g.name, kind: g.kind, value: g.value, test: g.test };
  if (g.kind === 'air' || g.kind === 'transfer') row.need = Object.fromEntries(Object.entries(GRADES).map(([k, vy]) => [k, dropGap(g.drop, g.dist, vy)]));
  else if (g.kind === 'clear') row.need = Object.fromEntries(Object.entries(GRADES).map(([k, vy]) => [k, clearGap(g.clear, g.span, vy)]));
  else if (g.kind === 'bankclear') row.need = Object.fromEntries(Object.entries(GRADES).map(([k, vy]) => [k, bankHop(g.clear, g.span, g.bank, vy)]));
  else if (g.kind === 'transition') { const t = transitionGap(g.h, g.r, g.air); row.transition = t; }
  gapRows.push(row);
}
const reach = (v) => (v === Infinity ? 'never' : v <= P.pushTop ? 'push' : v <= P.pumpCap ? 'pump/line' : 'TOO FAST');
let gapText = 'NAMED GAPS against the planned physics (gAir ' + P.gAir + ', gGround ' + P.gGround + ', pop apex ' + P.popMin + '..' + P.popMax + ' m → vy ' + GRADES['pop g1'].toFixed(2) + '..' + GRADES['pop g5'].toFixed(2) + ' m/s, push top ' + P.pushTop + ', pump cap ' + P.pumpCap + ')\n';
gapText += 'speed needed along the path, m/s, by pop (g1 = flick speed grade 1, g5 = grade 5 or the Streamlined assist)\n\n';
for (const r of gapRows) {
  let line = String(r.n).padStart(2) + ' ' + r.name.padEnd(15) + ' ' + String(r.value).padStart(4) + '  ';
  if (r.need) line += Object.entries(r.need).map(([k, v]) => k + ' ' + (v === Infinity ? '  ∞ ' : v.toFixed(2)) + ' (' + reach(v) + ')').join(' · ');
  else if (r.transition) line += 'lip ' + r.transition.lip.toFixed(1) + '° · needs ' + r.transition.vTop.toFixed(2) + ' m/s at the lip = ' + r.transition.vBottom.toFixed(2) + ' m/s at the foot (' + reach(r.transition.vBottom) + ')';
  else line += '(' + r.kind + ': measured by the sim, not by a jump)';
  gapText += line + '\n';
}
const dropIn = Math.sqrt(2 * P.gGround * 1.83);
gapText += '\nspeed off the start (Deck Quarter, 1.83 m, no friction): ' + dropIn.toFixed(2) + ' m/s · lip angles: Deck/East quarter ' + lipDeg(1.83, 2.74).toFixed(1) + '°, Basin ' + lipDeg(1.83, 2.44).toFixed(1) + '°, Spine/Lawn ' + lipDeg(1.22, 2.13).toFixed(1) + '°\n';
gapText += 'transition runs: 1.83/2.74 → ' + extent(1.83, 2.74).toFixed(3) + ' m · 1.83/2.44 → ' + extent(1.83, 2.44).toFixed(3) + ' m · 1.22/2.13 → ' + extent(1.22, 2.13).toFixed(3) + ' m\n';
gapText += problems.length ? '\nPROBLEMS:\n' + problems.join('\n') + '\n' : '\nlayout: every element inside the park, no two on one spot\n';
fs.writeFileSync(path.join(OUT, 'gaps.txt'), gapText);
console.log(gapText);

/* ---------------------------------------------------------------- ASCII, one character a metre */
const grid = Array.from({ length: D }, () => Array(W).fill(' '));
const at = (x, z, c) => { const i = Math.floor(z), j = Math.floor(x); if (i >= 0 && i < D && j >= 0 && j < W) grid[i][j] = c; };
for (const g of PARK.ground) for (let z = g.rect[1]; z < g.rect[3]; z++) for (let x = g.rect[0]; x < g.rect[2]; x++) at(x + 0.5, z + 0.5, g.soft ? '"' : g.y >= 1.5 ? '#' : g.y >= 1 ? '#' : g.y > 0 ? ':' : '.');
const fillRect = (r, c) => { for (let z = Math.floor(r[1]); z < Math.ceil(r[3]); z++) for (let x = Math.floor(r[0]); x < Math.ceil(r[2]); x++) { const cx = x + 0.5, cz = z + 0.5; if (cx >= r[0] - 0.25 && cx <= r[2] + 0.25 && cz >= r[1] - 0.25 && cz <= r[3] + 0.25) at(cx, cz, c); } };
for (const e of PARK.elements) {
  const f = footprint(e);
  if (e.type === 'quarter' || e.type === 'spine') fillRect(f, e.type === 'spine' ? 'A' : 'Q');
  else if (e.type === 'bowl') { fillRect(e.rect, 'o'); const x = extent(e.h || e.depth, e.r); fillRect([e.rect[0] + x, e.rect[1] + x, e.rect[2] - x, e.rect[3] - x], ' '); }
  else if (e.type === 'stairs') fillRect(f, 'S');
  else if (e.type === 'bank') fillRect(f, '/');
  else if (e.type === 'box') { fillRect(e.base, '/'); fillRect(e.top, 'X'); }
  else if (e.type === 'stairLedge') fillRect(f, 'H');
  else if (e.type === 'ledge' && e.line) { const [a, b] = e.line; for (let z = Math.floor(f[1]); z < Math.ceil(f[3]); z++) for (let x = Math.floor(f[0]); x < Math.ceil(f[2]); x++) { const px = x + 0.5 - a[0], pz = z + 0.5 - a[1], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, (px * dx + pz * dz) / (dx * dx + dz * dz))); if (Math.hypot(px - t * dx, pz - t * dz) <= Math.max(0.5, e.width / 2)) at(x + 0.5, z + 0.5, '='); } }
  else if (e.type === 'ledge') fillRect(f, e.id === 'pad' ? 'p' : e.id === 'planter' ? 'P' : e.id === 'bench' ? 'b' : e.id === 'redCurb' ? 'c' : '=');
}
for (const e of PARK.elements) if (e.type === 'rail') for (let k = 0; k + 1 < e.pts.length; k++) { const a = e.pts[k], b = e.pts[k + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2); for (let s = 0; s <= n; s++) at(a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n, '-'); }
for (const g of GAPS) { const s = String(g.n); if (s.length === 1) at(g.at[0], g.at[1], s); else { at(g.at[0], g.at[1], s[0]); at(g.at[0] + 1, g.at[1], s[1]); } }
at(PARK.spawn.at[0], PARK.spawn.at[2], '@');
let ascii = 'WAXLINE — THE PARK, top-down, ONE CHARACTER = ONE METRE (north up; x 0..62 east, z 0..44 north)\n';
ascii += '   ' + Array.from({ length: W }, (_, j) => (j % 10 === 0 ? String(j / 10) : ' ')).join('') + '\n';
for (let i = D - 1; i >= 0; i--) ascii += String(i).padStart(2) + ' ' + grid[i].join('') + '\n';
ascii += '\n. plaza 0.00 m   : terrace +0.80   # raised deck (West Deck +2.63, East Deck +1.83, Lawn Deck +1.22)   " lawn\n';
ascii += 'Q quarter pipe (transition)   A spine   o bowl wall (the Basin; its floor is the blank square, -1.83)   S stairs   H stair ledge\n';
ascii += '/ bank (Sun Bank; the Block\'s banks)   X the Block\'s top +0.60   = ledge   p manual pad   P planter   b bench   c curb   - rail / bar\n';
ascii += '@ spawn   1..24 named gaps (gaps.txt)\n';
fs.writeFileSync(path.join(OUT, 'park_plan.txt'), ascii);
console.log(ascii);

/* ---------------------------------------------------------------- SVG */
const S = 15, M = 46, PW = W * S, PH = D * S, SIDE = 1160;
const X = (x) => M + x * S, Y = (z) => M + (D - z) * S;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIDE}" height="${SIDE}" viewBox="0 0 ${SIDE} ${SIDE}" font-family="Helvetica, Arial, sans-serif">\n`;
svg += `<defs><marker id="arr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
<pattern id="grass" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#6d8a4d"/><path d="M1 5l1-3M4 6l1-4" stroke="#5c7740" stroke-width="1"/></pattern>
<pattern id="stairs" width="${S * 0.32}" height="${S * 0.32}" patternUnits="userSpaceOnUse"><rect width="${S * 0.32}" height="${S * 0.32}" fill="#c9c1b4"/><path d="M0 0H${S * 0.32}" stroke="#7d746a" stroke-width="1.4"/></pattern>
<linearGradient id="qE" x1="0" x2="1"><stop offset="0" stop-color="#8c8377"/><stop offset="1" stop-color="#d9d0c2"/></linearGradient>
<linearGradient id="qW" x1="1" x2="0"><stop offset="0" stop-color="#8c8377"/><stop offset="1" stop-color="#d9d0c2"/></linearGradient>
<radialGradient id="bowl"><stop offset="0" stop-color="#b9b1a5"/><stop offset="0.65" stop-color="#a39a8d"/><stop offset="1" stop-color="#6f675d"/></radialGradient></defs>\n`;
svg += `<rect width="100%" height="100%" fill="#f4efe6"/>\n`;
svg += `<text x="${M}" y="26" font-size="17" font-weight="700" fill="#2a241d">Waxline — the park, top-down (1 square = 1 m; north up)</text>\n`;
/* grid */
for (let x = 0; x <= W; x++) svg += `<line x1="${X(x)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(D)}" stroke="${x % 10 === 0 ? '#c8bfb1' : '#e6dfd3'}" stroke-width="${x % 10 === 0 ? 1 : 0.5}"/>`;
for (let z = 0; z <= D; z++) svg += `<line x1="${X(0)}" y1="${Y(z)}" x2="${X(W)}" y2="${Y(z)}" stroke="${z % 10 === 0 ? '#c8bfb1' : '#e6dfd3'}" stroke-width="${z % 10 === 0 ? 1 : 0.5}"/>`;
svg += '\n';
for (let x = 0; x <= W; x += 10) svg += `<text x="${X(x)}" y="${Y(0) + 15}" font-size="11" text-anchor="middle" fill="#6b6257">${x} m</text>`;
for (let z = 0; z <= D; z += 10) svg += `<text x="${X(0) - 6}" y="${Y(z) + 4}" font-size="11" text-anchor="end" fill="#6b6257">${z}</text>`;
svg += '\n';
const rectEl = (r, fill, extra = '') => `<rect x="${X(r[0])}" y="${Y(r[3])}" width="${(r[2] - r[0]) * S}" height="${(r[3] - r[1]) * S}" fill="${fill}" ${extra}/>`;
/* ground */
const groundFill = { plaza: '#d8d1c5', terrace: '#cdbfa8', westDeck: '#a9a093', eastDeck: '#a9a093', lawnDeck: '#a9a093', nwLawn: 'url(#grass)' };
for (const g of PARK.ground) svg += rectEl(g.rect, groundFill[g.id] || '#ccc', 'stroke="#8e8577" stroke-width="0.8"') + '\n';
/* terrace wall (the 0.80 m drop along z = 32) */
svg += `<line x1="${X(23)}" y1="${Y(32)}" x2="${X(62)}" y2="${Y(32)}" stroke="#5e554a" stroke-width="3"/>\n`;
/* elements */
for (const e of PARK.elements) {
  const f = footprint(e);
  if (e.type === 'quarter') {
    svg += rectEl(f, e.face[0] > 0 ? 'url(#qW)' : 'url(#qE)', 'stroke="#5e554a" stroke-width="0.8"');
    const [a, b] = e.coping; svg += `<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}" stroke="#d9a21b" stroke-width="3.2"/>`;
  } else if (e.type === 'spine') {
    const x = extent(e.h, e.r); svg += rectEl([e.coping[0][0] - x, f[1], e.coping[0][0], f[3]], 'url(#qE)', 'stroke="#5e554a" stroke-width="0.8"') + rectEl([e.coping[0][0], f[1], e.coping[0][0] + x, f[3]], 'url(#qW)', 'stroke="#5e554a" stroke-width="0.8"');
    svg += `<line x1="${X(e.coping[0][0])}" y1="${Y(e.coping[0][1])}" x2="${X(e.coping[1][0])}" y2="${Y(e.coping[1][1])}" stroke="#d9a21b" stroke-width="3.2"/>`;
  } else if (e.type === 'bowl') {
    const r = e.rect, c = e.corner * S, x = extent(e.depth, e.r);
    svg += `<rect x="${X(r[0])}" y="${Y(r[3])}" width="${(r[2] - r[0]) * S}" height="${(r[3] - r[1]) * S}" rx="${c}" fill="url(#bowl)" stroke="#d9a21b" stroke-width="3.2"/>`;
    svg += `<rect x="${X(r[0] + x)}" y="${Y(r[3] - x)}" width="${(r[2] - r[0] - 2 * x) * S}" height="${(r[3] - r[1] - 2 * x) * S}" rx="${Math.max(0, e.corner - x) * S}" fill="#bdb5a8" stroke="#8e8577" stroke-width="0.8" stroke-dasharray="3 2"/>`;
    svg += `<line x1="${X(r[0] + 2.2)}" y1="${Y(r[1])}" x2="${X(r[2] - 2.2)}" y2="${Y(r[1])}" stroke="#ece6da" stroke-width="5"/>`;   // pool coping (south)
  } else if (e.type === 'stairs') svg += rectEl(f, 'url(#stairs)', 'stroke="#5e554a" stroke-width="0.8"');
  else if (e.type === 'bank') { svg += rectEl(f, '#bfb3a0', 'stroke="#5e554a" stroke-width="0.8"'); svg += `<line x1="${X((f[0] + f[2]) / 2)}" y1="${Y(f[1]) - 3}" x2="${X((f[0] + f[2]) / 2)}" y2="${Y(f[3]) + 3}" stroke="#5e554a" stroke-width="1.2" marker-end="url(#arr)"/>`; }
  else if (e.type === 'box') { svg += rectEl(e.base, '#bfb3a0', 'stroke="#5e554a" stroke-width="0.8"') + rectEl(e.top, '#a59a89', 'stroke="#3a332b" stroke-width="1.6"'); }
  else if (e.type === 'stairLedge') svg += rectEl(f, '#7f8a92', 'stroke="#3a332b" stroke-width="1"');
  else if (e.type === 'ledge' && e.line) svg += `<polygon points="${corners(e).map((p) => X(p[0]) + ',' + Y(p[1])).join(' ')}" fill="#8a949b" stroke="#3a332b" stroke-width="1"/>`;
  else if (e.type === 'ledge') svg += rectEl(f, e.id === 'pad' ? '#b7aea1' : e.id === 'planter' ? '#6f8c4f' : e.id === 'bench' ? '#9a6b42' : e.id === 'redCurb' ? '#c0503f' : '#8a949b', 'stroke="#3a332b" stroke-width="1"');
  svg += '\n';
}
for (const e of PARK.elements) if (e.type === 'rail') svg += `<polyline points="${e.pts.map((p) => X(p[0]) + ',' + Y(p[1])).join(' ')}" fill="none" stroke="#2f3a44" stroke-width="2.6" stroke-linecap="round"/>\n`;
/* labels */
const label = (x, z, text, size = 11, anchor = 'middle', colour = '#211b15') => `<text x="${X(x)}" y="${Y(z)}" font-size="${size}" text-anchor="${anchor}" fill="${colour}" font-weight="600" paint-order="stroke" stroke="#f4efe6" stroke-width="3" stroke-linejoin="round">${esc(text)}</text>`;
svg += label(33, 13.6, 'Low Bar 8 m · 0.33') + label(34, 18.6, 'Bench 0.45') + label(34, 21.8, 'Main Ledge 12 m · 0.36 · waxed granite') + label(23.5, 25.4, 'The Pad 6×2 m · 0.20')
  + label(45.2, 27.1, 'Planter 0.45') + label(44, 12.2, 'The Block 0.60 · 25° banks') + label(39, 4.1, 'Red Curb 30 m · 0.15') 
  + label(53, 34.0, 'The Five (5 × 0.16 / 0.32)') + label(52.2, 28.5, 'Five Rail · 0.86 over nosings', 10, 'end') + label(47.2, 33.4, 'Shelf', 10) + label(43.5, 29.4, 'Sun Bank 25°', 11)
  + label(37, 36.9, 'Sun Ledge 14 m · 0.42') + label(34, 43.2, 'Terrace Bar 8 m · 0.33') + label(45, 39.4, 'THE TERRACE +0.80', 13, 'middle', '#5e554a')
  + label(21.5, 43.0, 'WEST DECK', 10) + label(21.5, 42.0, '+2.63 (start)', 10) + label(26.0, 37.1, 'Deck Quarter', 10, 'start') + label(26.0, 36.3, '1.83 · r 2.74', 10, 'start')
  + label(9, 10.3, 'THE BASIN', 13) + label(9, 9.2, 'depth 1.83 · r 2.44 · 14×14', 10) + label(8.6, 29.0, 'Spine 1.22 · r 2.13', 10) + label(2.0, 30.0, 'Lawn Quarter 1.22', 10, 'start')
  + label(10, 38.5, 'lawn, trees', 12, 'middle', '#2f4320') + label(26.4, 30.6, 'Terrace wall 0.80 ▼', 10, 'start') + label(45, 13.2, 'THE PLAZA ±0.00', 13, 'middle', '#5e554a') + label(49.2, 20.6, 'Slant Ledge 11.2 m · 0.40', 10) + label(56.5, 37.2, 'Terrace Block 0.45', 10);
svg += `<text x="${X(62) + 16}" y="${Y(16)}" font-size="12" font-weight="700" fill="#211b15" text-anchor="middle" transform="rotate(90 ${X(62) + 16} ${Y(16)})">East Wall 1.83 m · r 2.74 · East Deck +1.83</text>`;
svg += '\n';
/* lines */
for (const l of LINES) svg += `<polyline points="${l.pts.map((p) => X(p[0]) + ',' + Y(p[1])).join(' ')}" fill="none" stroke="${l.colour}" stroke-width="2.4" stroke-dasharray="7 4" stroke-linejoin="round" marker-end="url(#arr)" opacity="0.95"/>\n`;
/* gaps */
for (const g of GAPS) svg += `<circle cx="${X(g.at[0])}" cy="${Y(g.at[1])}" r="8" fill="#1d1d1f" stroke="#fff" stroke-width="1.2"/><text x="${X(g.at[0])}" y="${Y(g.at[1]) + 3.6}" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">${g.n}</text>\n`;
/* spawn */
svg += `<circle cx="${X(PARK.spawn.at[0])}" cy="${Y(PARK.spawn.at[2])}" r="6" fill="#e8a33d" stroke="#1d1d1f" stroke-width="1.5"/>\n`;
/* scale bar */
svg += `<line x1="${X(0)}" y1="${Y(0) + 30}" x2="${X(10)}" y2="${Y(0) + 30}" stroke="#211b15" stroke-width="2"/><text x="${X(5)}" y="${Y(0) + 26}" font-size="11" text-anchor="middle" fill="#211b15">10 m</text>\n`;
/* legend */
let ly = Y(0) + 62; let lx = M;
const leg = (t, size = 12, weight = 400, colour = '#211b15') => { svg += `<text x="${lx}" y="${ly}" font-size="${size}" font-weight="${weight}" fill="${colour}">${esc(t)}</text>\n`; ly += size + 5; };
leg('LINES', 13, 700);
for (const l of LINES) { svg += `<line x1="${lx}" y1="${ly - 4}" x2="${lx + 22}" y2="${ly - 4}" stroke="${l.colour}" stroke-width="3" stroke-dasharray="7 4"/>`; svg += `<text x="${lx + 28}" y="${ly}" font-size="12" font-weight="700" fill="#211b15">${l.id} ${esc(l.name)}</text>\n`; ly += 15;
  const words = l.says.split(' '); let row = ''; for (const w of words) { if ((row + ' ' + w).length > 78) { svg += `<text x="${lx + 28}" y="${ly}" font-size="10.5" fill="#4b4339">${esc(row)}</text>\n`; ly += 13; row = w; } else row = row ? row + ' ' + w : w; } if (row) { svg += `<text x="${lx + 28}" y="${ly}" font-size="10.5" fill="#4b4339">${esc(row)}</text>\n`; ly += 17; } }
ly = Y(0) + 62; lx = M + 520; leg('NAMED GAPS (value)', 13, 700);
GAPS.forEach((g, i) => { const cx = lx + (i >= 12 ? 290 : 0), cy = ly + (i % 12) * 14; svg += `<text x="${cx}" y="${cy}" font-size="11" fill="#211b15"><tspan font-weight="700">${g.n}</tspan> ${esc(g.name)} <tspan fill="#6b6257">(${g.value})</tspan></text>\n`; });
svg += '</svg>\n';
fs.writeFileSync(path.join(OUT, 'park_plan.svg'), svg);
console.log('wrote', path.join(OUT, 'park_plan.svg'), (svg.length / 1024).toFixed(1) + ' KB');
