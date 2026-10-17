/* THE PLAZA — Waxline's first park (DESIGN.md §6): a terraced civic plaza-park at the edge of a city, golden hour. Moved here unchanged from
 * config.js (10-16, the park registry): its rows, its named gaps, its run, its trees and its goals. js/sim/park.js builds it; js/parks/index.js
 * lists it as 'waxline'. */

/* ── THE PARK ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 * The generators in js/sim/park.js turn every row into what is drawn, what the board rides and what it grinds. A row that leaves the park
 * or overlaps another is refused and named in the console. Heights are of the TOP surface; `base` is what an element stands on. */
export const PARK = {
  size: [62, 44],
  ground: [
    { id: 'plaza', name: 'The Plaza', rect: [0, 0, 62, 32], y: 0, surface: 'slab' },
    { id: 'terrace', name: 'The Terrace', rect: [23, 32, 62, 44], y: 0.80, surface: 'pavers' },
    { id: 'westDeck', name: 'West Deck', rect: [20, 32, 23, 44], y: 2.63, surface: 'deck' },
    { id: 'eastDeck', name: 'East Deck', rect: [59, 4, 62, 28], y: 1.83, surface: 'deck' },
    { id: 'lawnDeck', name: 'Lawn Deck', rect: [0, 19, 1.5, 29], y: 1.22, surface: 'deck' },
    { id: 'nwLawn', name: 'North-west lawn', rect: [0, 32, 20, 44], y: 0, surface: 'grass' },
  ],
  /* the faces of the raised levels: [x0, z0, x1, z1, y0, y1, outward normal] ('fx0' 'fx1' 'fz1': the fence's own lines). The terrace's south face
     stops where the Sun Bank, the Shelf and the Five come down */
  walls: [
    [23, 32, 40, 32, 0, 0.8, [0, 0, -1]], [47, 32, 48.6, 32, 0, 0.8, [0, 0, -1]], [49.8, 32, 50, 32, 0, 0.8, [0, 0, -1]], [56, 32, 'fx1', 32, 0, 0.8, [0, 0, -1]],
    ['fx1', 32, 'fx1', 'fz1', 0, 0.8, [1, 0, 0]], [23, 'fz1', 'fx1', 'fz1', 0, 0.8, [0, 0, 1]],
    [20, 32, 23, 32, 0, 2.63, [0, 0, -1]], [20, 32, 20, 'fz1', 0, 2.63, [-1, 0, 0]], [20, 'fz1', 23, 'fz1', 0, 2.63, [0, 0, 1]],
    [59, 28, 'fx1', 28, 0, 1.83, [0, 0, 1]], [59, 4, 'fx1', 4, 0, 1.83, [0, 0, -1]], ['fx1', 4, 'fx1', 28, 0, 1.83, [1, 0, 0]],
    ['fx0', 29, 1.5, 29, 0, 1.22, [0, 0, 1]], ['fx0', 19, 1.5, 19, 0, 1.22, [0, 0, -1]], ['fx0', 19, 'fx0', 29, 0, 1.22, [-1, 0, 0]],
  ],
  elements: [
    /* transitions: `coping` is the lip line, `face` the direction the riding side lies in from the lip */
    { id: 'deckQuarter', type: 'quarter', name: 'Deck Quarter', coping: [[23, 32], [23, 44]], face: [1, 0], base: 0.80, h: 1.83, r: 2.74 },
    { id: 'eastQuarter', type: 'quarter', name: 'East Wall', coping: [[59, 4], [59, 28]], face: [-1, 0], base: 0, h: 1.83, r: 2.74 },
    { id: 'lawnQuarter', type: 'quarter', name: 'Lawn Quarter', coping: [[1.5, 19], [1.5, 29]], face: [1, 0], base: 0, h: 1.22, r: 2.13 },
    { id: 'spine', type: 'spine', name: 'The Spine', coping: [[8.6, 20], [8.6, 28]], base: 0, h: 1.22, r: 2.13 },
    { id: 'basin', type: 'bowl', name: 'The Basin', rect: [2, 3, 16, 17], corner: 3.5, depth: 1.83, r: 2.44 },
    /* the street */
    { id: 'mainLedge', type: 'ledge', name: 'Main Ledge', rect: [28, 23.0, 40, 23.6], h: 0.36, top: 'granite', wax: true },
    { id: 'pad', type: 'ledge', name: 'The Pad', rect: [20.5, 22.4, 26.5, 24.4], h: 0.20, top: 'slab' },
    { id: 'planter', type: 'planter', name: 'Planter', rect: [44, 24.4, 46.4, 26.0], h: 0.45 },
    { id: 'bench', type: 'bench', name: 'Bench', rect: [33, 16.6, 35, 17.05], h: 0.45 },
    { id: 'redCurb', type: 'ledge', name: 'Red Curb', rect: [24, 2.6, 54, 3.0], h: 0.15, top: 'curb' },
    { id: 'lowBar', type: 'rail', name: 'Low Bar', pts: [[26, 0.33, 12], [34, 0.33, 12]], posts: true },
    { id: 'block', type: 'box', name: 'The Block', base: [40.71, 5.71, 47.29, 11.29], top: [42, 7, 46, 10], h: 0.60 },
    { id: 'boxRail', type: 'rail', name: 'Box Rail', pts: [[46.0, 0.95, 8.5], [47.29, 0.35, 8.5], [48.4, 0.35, 8.5]], posts: true },
    { id: 'slantLedge', type: 'ledge', name: 'Slant Ledge', line: [[41, 14.2], [51, 19.2]], width: 0.5, h: 0.40, top: 'granite', wax: true },
    /* the terrace */
    { id: 'sunLedge', type: 'ledge', name: 'Sun Ledge', rect: [30, 35.4, 44, 36.0], base: 0.80, h: 0.42, top: 'granite', wax: true },
    { id: 'terraceBar', type: 'rail', name: 'Terrace Bar', pts: [[30, 1.13, 42], [38, 1.13, 42]], posts: true },
    { id: 'terraceBlock', type: 'ledge', name: 'Terrace Block', rect: [55, 38, 58, 39.2], base: 0.80, h: 0.45, top: 'granite' },
    { id: 'five', type: 'stairs', name: 'The Five', rect: [50, 30.72, 56, 32.0], top: 0.80, risers: 5, rise: 0.16, tread: 0.32 },
    { id: 'fiveRail', type: 'rail', name: 'Five Rail', pts: [[53, 1.66, 32.8], [53, 1.66, 32.0], [53, 0.86, 30.4], [53, 0.86, 29.8]], posts: true },
    { id: 'shelf', type: 'stairLedge', name: 'The Shelf', rect: [48.6, 30.4, 49.8, 33.0], profile: [[33.0, 1.25], [32.0, 1.25], [30.4, 0.45]] },
    { id: 'sunBank', type: 'bank', name: 'Sun Bank', rect: [40, 30.284, 47, 32.0], from: 0, to: 0.80 },
  ],
  /* where a run starts, and where a bail puts you back when the spot you fell on will not do */
  spawn: { at: [21.5, 2.63, 38], heading: 90, speed: 0 },
  /* the street to the south, beyond the lawn (view/parkview.js): its middle x, the asphalt's z, the pavement's z */
  street: { x: 31, z: -12.5, pavement: -5.2 },
  /* the grime's ground (view/surfaces.js): the feet of the raised levels, and the square it is painted over */
  grime: { levels: [[23, 32, 62, 44.2], [20, 32, 23, 44], [59, 4, 62, 28], [0, 19, 1.5, 29]], origin: [-2, -2], extent: [66, 48] },
  lamps: [[-1.2, 18.5, 0], [19, -1.3, 1.57], [41, -1.3, 1.57], [63.4, 31, 3.14], [63.4, 2, 3.14], [30, 45.4, -1.57]],
  nodes: [[26.8, 0.8, 38, 90], [36, 0.8, 39.5, 90], [48, 0.8, 38, 180], [53, 0, 27.5, 180], [42, 0, 24.6, 270], [24, 0, 26.5, 270],
    [14, 0, 24, 270], [18.5, 0, 19.5, 225], [21, 0, 8, 90], [36, 0, 6, 90], [52, 0, 12, 0], [52, 0, 22, 0], [30, 0, 15, 270]],
};

/* the named gaps: what counts, and what each is worth (DESIGN.md §6.4) */
export const GAPS = [
  { name: 'Deck Drop', value: 800, kind: 'air', from: [20, 32, 23.2, 44], to: [26.4, 32, 62, 44], toY: 0.8 },
  { name: 'Long Five', value: 500, kind: 'air', from: [50, 32, 56, 34], to: [49.5, 20, 56.5, 30.3], toY: 0 },
  { name: 'Rail Ride', value: 750, kind: 'grind', rail: 'fiveRail', full: true },
  { name: 'Shelf Down', value: 600, kind: 'grind', rail: 'shelf', full: true },
  { name: 'Sun Bank Drop', value: 400, kind: 'air', from: [40, 32, 47, 34.5], to: [39, 20, 48, 29.8], toY: 0 },
  { name: 'Terrace Drop', value: 250, kind: 'air', from: [23, 32, 40, 34.5], to: [23, 10, 40, 29.5], toY: 0 },
  { name: 'Planter Hop', value: 350, kind: 'clear', over: 'planter' },
  { name: 'Ledge to Pad', value: 400, kind: 'transfer', fromRail: 'mainLedge', to: [20.5, 22.4, 26.5, 24.4] },
  { name: 'Pad Manual', value: 300, kind: 'manual', region: [20.5, 22.4, 26.5, 24.4], length: 5.0 },
  { name: 'Spine Transfer', value: 500, kind: 'transfer2', a: 'spine:w', b: 'spine:e', reach: 2.2 },
  { name: 'Lawn Wall Air', value: 300, kind: 'vert', quarter: 'lawnQuarter', height: 0.6 },
  { name: 'Basin Air', value: 450, kind: 'vert', quarter: 'basin', height: 0.75 },
  { name: 'Coping Run', value: 400, kind: 'grind', rail: 'basin', length: 4.0 },
  { name: 'Block Hop', value: 450, kind: 'clear', over: 'block' },
  { name: 'Box Rail', value: 400, kind: 'grind', rail: 'boxRail', full: true },
  { name: 'Bench Gap', value: 250, kind: 'clear', over: 'bench' },
  { name: 'Curb Run', value: 200, kind: 'grind', rail: 'redCurb', length: 8.0 },
  { name: 'East Wall Air', value: 350, kind: 'vert', quarter: 'eastQuarter', height: 0.6 },
  { name: 'Sun Ledge Run', value: 300, kind: 'grind', rail: 'sunLedge', length: 12.5 },
  { name: 'Terrace Bar', value: 300, kind: 'grind', rail: 'terraceBar', full: true },
  { name: 'Deck Wall Air', value: 350, kind: 'vert', quarter: 'deckQuarter', height: 0.6 },
  { name: 'Slant Run', value: 350, kind: 'grind', rail: 'slantLedge', length: 10.0 },
  { name: 'Block Manual', value: 250, kind: 'manual', region: [55, 38, 58, 39.2], length: 2.6 },
];

/* the trees round the park (x, z): the view grows them, the camera sees round them */
export const TREES = [[-5, 6], [-6, 16], [-4, 27], [-6, 38], [4, 40], [9, 36.5], [14, 41], [17.5, 35.5], [6, 47], [18, 48], [30, 48], [42, 47.5], [54, 48.5], [66, 41], [67, 30], [66, 19], [67.5, 8], [8, -6], [22, -7.5], [36, -6.5], [50, -7], [62, -6]];

/* ── THE RUN: two minutes; five wax bars hidden where a good line finds them (x, y, z of the bar) ───────────────────────────────── */
export const RUN = {
  seconds: 120,
  waxRadius: 0.95,
  wax: [[21.6, 3.05, 42.6], [9.0, -1.35, 10.0], [37.0, 1.75, 35.7], [8.6, 2.25, 24.0], [44.0, 1.05, 8.5]],
};

/* THE RUN'S TWELVE GOALS (DESIGN.md §5.3), as data — js/game/run.js reads the kinds: `score` (banked in the run) · `wax` (every bar) · `gap` (that
   gap, with `trick` in its combo's names, or with a `grab` in its air) · `gaps` (all of these in one combo) · `combo` (a banked multiplier) ·
   `manual` (seconds, clean) · `gapCount` (different gaps in one run) */
export const GOALS = [
  { id: 'warm', name: 'Warm', say: 'Score 15,000 in a run', score: 15000 },
  { id: 'hot', name: 'Hot', say: 'Score 40,000 in a run', score: 40000 },
  { id: 'golden', name: 'Golden', say: 'Score 100,000 in a run', score: 100000 },
  { id: 'wax', name: 'Five wax bars', say: 'Find the five hidden wax bars in one run', wax: true },
  { id: 'kickfive', name: 'Kickflip the Long Five', say: 'Clear the Long Five with a kickflip', gap: 'Long Five', trick: 'Kickflip' },
  { id: 'railride', name: 'The Rail Ride', say: 'Grind the Five Rail top to bottom', gap: 'Rail Ride' },
  { id: 'ledgepad', name: 'Ledge, Pad, Manual', say: 'Ledge to Pad, then a Pad Manual, in one combo', gaps: ['Ledge to Pad', 'Pad Manual'] },
  { id: 'spine', name: 'Spine transfer, grabbed', say: 'Transfer the Spine with a grab', gap: 'Spine Transfer', grab: true },
  { id: 'x10', name: '×10', say: 'Land a combo of ten or more', combo: 10 },
  { id: 'manual6', name: 'Six seconds on two wheels', say: 'Hold a manual for six seconds', manual: 6 },
  { id: 'basin', name: 'Basin Air', say: 'Air out of the Basin', gap: 'Basin Air' },
  { id: 'gaps8', name: 'Eight gaps', say: 'Find eight different gaps in one run', gapCount: 8 },
];

export default { id: 'waxline', name: 'The Plaza', PARK, GAPS, RUN, GOALS, TREES };
