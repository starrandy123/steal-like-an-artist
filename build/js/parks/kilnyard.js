/* KILN YARD — Waxline's second park: the yard of a closed brickworks at golden hour, with a dry spillway along its south side. Every row is
 * plain data, read by the same generators as the Plaza (js/sim/park.js); the plan, its checks and every gap's speed are tools/map_plan.mjs.
 * Units: metres. x runs east (0..96), z runs north (0..72), y is up. Heights are of the TOP surface; `base` is what an element stands on.
 * The datum is the spillway's floor (y 0): every level stands at or above it, so the fence never stands over a drop.
 * The layout is our own: no park or level, real or in any game, is recreated. Real dimensions and where each came from: plan/KILN_YARD.md. */

import { PROP_MESHES } from './kilnyard_props.js';

const RIM = 2.40, APRON = 2.40, YARD = 4.15, DOCK = 5.35, DIY = YARD + 1.5, EAST = YARD + 1.8;

export const PARK = {
  size: [96, 72],
  outside: 'asphalt',   // the ground beyond the fence: the district's roads, not the Plaza's lawn
  tufts: 0,          // and no grass tufts round the fence
  /* the buildings round the yard (sources/props: Poly Haven's CC0 kits through the Blender MCP), drawn only, all outside the fence (tests/backdrop.mjs) */
  backdrop: { file: 'assets/kilnyard_backdrop.glb', budget: { triangles: 50000, textureMb: 8, textureSide: 512, fileMb: 5 } },
  /* THE PROPS (Poly Haven CC0, through the Blender MCP: sources/props): ridden into, so each one's collision is its drawn mesh (sim/props.js;
     the meshes are tools/props_col.mjs's, from the GLB) — barrels and crates on the dock, a covered car, barrels and crates in the yard and on the
     apron, two tyres laid flat; each { kind, at: [x, y, z], rot } */
  propsFile: 'assets/kilnyard_props.glb', propMeshes: PROP_MESHES,
  props: [
    { kind: 'barrel', at: [58, DOCK, 71.2], rot: 0 }, { kind: 'barrel', at: [58.8, DOCK, 71.5], rot: 30 }, { kind: 'barrel', at: [59.4, DOCK, 70.8], rot: 60 },
    { kind: 'crate', at: [66, DOCK, 71.5], rot: 0 }, { kind: 'crate', at: [66.9, DOCK, 71.5], rot: 0 }, { kind: 'tyre', at: [74, DOCK, 71.6], rot: 0 },
    { kind: 'car', at: [21, YARD, 70.4], rot: 90 }, { kind: 'crate', at: [1.0, YARD, 44], rot: 90 }, { kind: 'barrel', at: [93.6, YARD, 30.9], rot: 15 },
    { kind: 'crate', at: [52, APRON, 26.25], rot: 90 }, { kind: 'barrel', at: [85, APRON, 18.3], rot: 40 }, { kind: 'tyre', at: [40, RIM, 0.9], rot: 20 },   // on the rim by the fence: on the spillway's floor it lay across the lines (the sweep, 10-16)
  ],
  /* THE PAINT ON THE GROUND (view/parkview.js paintStrokes; drawn only: it rolls and sounds as the surface under it — CLEANROOM): the dock's
     safety line 25 cm in from its edge, the bays the trailers back into across the truck apron (3.6 m: a trailer's 2.6 m and the gap a dock
     leveller needs), and the hatch that keeps the foot of the Dock Seven clear */
  paint: [
    { color: 'yellow', line: [[40.6, 64.75], [83.6, 64.75]], width: 0.1 }, { color: 'yellow', line: [[90.4, 64.75], [95.8, 64.75]], width: 0.1 },
    ...[43.6, 47.2, 50.8, 54.4, 58, 61.6, 65.2, 68.8, 72.4, 76, 79.6].map((x) => ({ color: 'white', line: [[x, 64.25], [x, 58.6]], width: 0.1 })),
    { color: 'yellow', hatch: [84.3, 58.3, 89.7, 62.1], angle: 45, spacing: 0.7, width: 0.1 },
  ],
  /* the ground the buildings stand on where it is lower than the park (outside the fence): [x0, z0, x1, z1, y0, y1] */
  dressing: { boxes: [[-2.0, 72.3, 40.2, 74.2, 0, 4.15], [40.2, 72.3, 106, 74.2, 0, 5.35], [96.3, 27.0, 99.2, 72.3, 0, 4.15], [-2.4, 27.0, -0.3, 72.3, 0, 4.15],
    [96.3, -0.3, 99.2, 27.0, 0, 6.2], [-2.4, -0.3, -0.3, 27.0, 0, 6.2]] },
  ground: [
    { id: 'rim', name: 'South Rim', rect: [0, 0, 96, 3.0], y: RIM, surface: 'slab' },
    { id: 'channel', name: 'The Spillway', rect: [0, 3.0, 96, 16.7], y: 0, surface: 'slab' },
    { id: 'apron', name: 'The Apron', rect: [0, 16.7, 96, 30], y: APRON, surface: 'pavers' },
    { id: 'yard', name: 'The Yard', rect: [0, 30, 40, 72], y: YARD, surface: 'slab' },
    { id: 'yardEast', name: 'The Yard', rect: [40, 30, 96, 58], y: YARD, surface: 'slab' },
    /* the truck apron before the dock: asphalt, where the trailers back up (it rolls at 0.020 and sounds as asphalt: CLEANROOM, SOUND.roll) — no
       named line crosses it but the Dock Drop's roll-out (tests/parks/gaps_reached.mjs rides them all) */
    { id: 'truckApron', name: 'The Truck Apron', rect: [40, 58, 84, 64.5], y: YARD, surface: 'asphalt' },
    { id: 'stairsFoot', name: 'The Yard', rect: [84, 58, 96, 64.5], y: YARD, surface: 'slab' },
    { id: 'dock', name: 'The Dock', rect: [40, 64.5, 96, 72], y: DOCK, surface: 'deck' },
    { id: 'diyDeck', name: 'DIY Deck', rect: [0, 58, 1.2, 70], y: DIY, surface: 'deck' },
    { id: 'eastDeck', name: 'East Deck', rect: [94.8, 32, 96, 58], y: EAST, surface: 'deck' },
  ],
  /* the faces of the raised levels, where a level drops to the one below: [x0, z0, x1, z1, y0, y1, outward normal]. 'fx0'/'fx1'/'fz1' are the
     fence's own lines (sim/park.js fenceOf): a face that meets the fence runs on to it */
  walls: [
    ['fx0', 30, 32, 30, APRON, YARD, [0, 0, -1]], [39.4, 30, 40, 30, APRON, YARD, [0, 0, -1]], [48, 30, 48.6, 30, APRON, YARD, [0, 0, -1]],
    [49.8, 30, 'fx1', 30, APRON, YARD, [0, 0, -1]],
    [40, 64.5, 84, 64.5, YARD, DOCK, [0, 0, -1]], [90, 64.5, 'fx1', 64.5, YARD, DOCK, [0, 0, -1]], [40, 70.5, 40, 'fz1', YARD, DOCK, [-1, 0, 0]],
    ['fx0', 58, 1.2, 58, YARD, DIY, [0, 0, -1]], ['fx0', 70, 1.2, 70, YARD, DIY, [0, 0, 1]],
    [94.8, 32, 'fx1', 32, YARD, EAST, [0, 0, -1]], [94.8, 58, 'fx1', 58, YARD, EAST, [0, 0, 1]],
  ],
  elements: [
    /* THE SPILLWAY: two concrete walls alike (2.4 m on a 4.2 m radius: a drop-in's speed is the other wall's to take — with a 1.6 m south wall
       a rider dropped in from the north flew out over it into the fence, 10-16) and a flat floor 6.1 m across; bare concrete lips (no pipe) */
    { id: 'southWall', type: 'quarter', name: 'South Wall', coping: [[0, 3.0], [96, 3.0]], face: [0, 1], base: 0, h: RIM, r: 4.2, edge: 'concrete' },
    { id: 'northWall', type: 'quarter', name: 'North Wall', coping: [[0, 16.7], [96, 16.7]], face: [0, -1], base: 0, h: APRON, r: 4.2, edge: 'concrete' },
    { id: 'drain', type: 'ledge', name: 'Drain Block', rect: [30, 8.6, 42, 9.2], h: 0.40, top: 'slab' },
    /* 0.33 m, the Plaza's flat-bar height: at 0.30 the catch came a frame later in the fall and the deck jumped 1.4 cm (10-16) */
    { id: 'pipe', type: 'rail', name: 'The Pipe', pts: [[56, 0.33, 11.0], [66, 0.33, 11.0]], posts: true },
    /* THE APRON: the paved strip between the spillway and the yard */
    { id: 'apronLedge', type: 'ledge', name: 'Apron Ledge', rect: [6, 22.0, 24, 22.6], base: APRON, h: 0.42, top: 'granite', wax: true },
    { id: 'pad', type: 'ledge', name: 'Kiln Pad', rect: [60, 21.2, 66, 23.2], base: APRON, h: 0.20, top: 'slab' },
    { id: 'benchA', type: 'bench', name: 'Bench', rect: [72, 18.4, 74, 18.85], base: APRON, h: 0.45 },
    { id: 'benchB', type: 'bench', name: 'Bench', rect: [78, 18.4, 80, 18.85], base: APRON, h: 0.45 },
    { id: 'planterA', type: 'planter', name: 'Planter', rect: [27, 24.4, 29.4, 26.0], base: APRON, h: 0.45 },
    /* THE STEPS, from the yard down to the apron: a bank, ten stairs with a rail down their middle, a hubba */
    { id: 'tenBank', type: 'bank', name: 'Ten Bank', rect: [32, 26.0, 39.4, 30.0], from: APRON, to: YARD },
    { id: 'ten', type: 'stairs', name: 'The Ten', rect: [40, 26.85, 48, 30.0], top: YARD, risers: 10, rise: 0.175, tread: 0.35 },
    { id: 'tenRail', type: 'rail', name: 'Ten Rail', pts: [[44, YARD + 0.86, 30.8], [44, YARD + 0.86, 30.0], [44, APRON + 0.86, 26.5], [44, APRON + 0.86, 25.9]], posts: true },
    { id: 'hubba', type: 'stairLedge', name: 'The Hubba', rect: [48.6, 25.3, 49.8, 32.5], base: APRON, profile: [[32.5, YARD + 0.45], [30.0, YARD + 0.45], [26.5, APRON + 0.45], [25.3, APRON + 0.45]] },   // a 2.5 m top (Cruise's full pop overshot a 1 m one and caught the slope) and a 1.2 m flat end (off the slope's end the landing jumped 1.2 cm; off a flat, 0.5): 10-16
    { id: 'longEdge', type: 'edge', name: 'Long Edge', line: [[56, 30], [92, 30]], y: YARD, inward: [0, 0, 1] },
    /* THE YARD */
    /* low-profile barriers, 26 in (0.66 m: TxDOT LPCB-26, TTI's MASH TL-3 evaluation); a full pop's wheels clear it by 7 cm or more — the
       New Jersey's 32 in did not (10-16) */
    { id: 'barrierRun', type: 'barrier', name: 'Barrier Run', line: [[56, 44.5], [67.4, 44.5]], base: YARD, h: 0.66, bottom: 0.61, top: 0.15 },
    { id: 'pyramid', type: 'box', name: 'The Kiln', base: [62, 50, 71, 58], top: [65, 53, 68, 55], h: 0.9, y: YARD },   // a box's `base` is its foot; `y` the level it stands on
    { id: 'kilnRail', type: 'rail', name: 'Kiln Rail', pts: [[68.0, YARD + 0.9 + 0.35, 54.0], [71.0, YARD + 0.35, 54.0], [72.4, YARD + 0.35, 54.0]], posts: true },
    { id: 'flatBar', type: 'rail', name: 'Flat Bar', pts: [[20, YARD + 0.33, 40], [28, YARD + 0.33, 40]], posts: true },
    { id: 'redLedge', type: 'ledge', name: 'Red Ledge', rect: [20, 48, 32, 48.6], base: YARD, h: 0.38, top: 'curb' },
    { id: 'bumpA', type: 'bank', name: 'Bump', rect: [8, 36, 14, 38.2], from: YARD, to: YARD + 0.6, back: true },
    { id: 'bumpB', type: 'bank', name: 'Bump', rect: [8, 39.7, 14, 41.9], from: YARD + 0.6, to: YARD, back: true },   // a 1.5 m trench: what a pushed run-up from the yard's edge clears (3.2 and 2.0 were not, 10-17)
    { id: 'graniteBlock', type: 'ledge', name: 'Granite Block', rect: [30, 56, 34, 57.2], base: YARD, h: 0.48, top: 'granite', wax: true },
    { id: 'kilnWall', type: 'quarter', name: 'Kiln Wall', coping: [[94.8, 32], [94.8, 58]], face: [-1, 0], base: YARD, h: 1.8, r: 2.7 },
    /* THE DOCK: a warehouse's loading dock along the north fence, its edge in steel angle, a ramp up at its west end */
    { id: 'dockEdge', type: 'edge', name: 'Dock Edge', line: [[40.4, 64.5], [83.6, 64.5]], y: DOCK, inward: [0, 0, 1] },
    { id: 'dockEdgeEast', type: 'edge', name: 'Dock Edge', line: [[90.4, 64.5], [96, 64.5]], y: DOCK, inward: [0, 0, 1] },
    { id: 'dockStairs', type: 'stairs', name: 'Dock Seven', rect: [84, 62.43, 90, 64.5], top: DOCK, risers: 7, rise: 1.2 / 7, tread: 0.345 },
    { id: 'dockRail', type: 'rail', name: 'Dock Rail', pts: [[87, DOCK + 0.86, 65.3], [87, DOCK + 0.86, 64.5], [87, YARD + 0.86, 62.085], [87, YARD + 0.86, 61.5]], posts: true },
    { id: 'dockRamp', type: 'bank', name: 'Dock Ramp', rect: [32, 64.5, 40, 70.5], from: YARD, to: DOCK, axis: 'x' },   // 15 %: the steepest a dock's own ramp is built
    /* THE DIY: what skaters poured in the yard's north-west corner — a quarter against a deck, and a spine */
    { id: 'diyQuarter', type: 'quarter', name: 'DIY Quarter', coping: [[1.2, 58], [1.2, 70]], face: [1, 0], base: YARD, h: 1.5, r: 2.4 },
    { id: 'diySpine', type: 'spine', name: 'DIY Spine', coping: [[12, 58], [12, 66]], base: YARD, h: 1.2, r: 2.1 },
  ],
  /* where a run starts (the dock, looking south over the yard to the steps and the spillway), and where a bail puts you back */
  spawn: { at: [52, DOCK, 69], heading: 180, speed: 0 },
  lamps: [],
  nodes: [[52, DOCK, 69, 180], [80, DOCK, 68, 270], [30, YARD, 60, 180], [8, YARD, 52, 90], [20, YARD, 36, 90], [50, YARD, 40, 180],
    [76, YARD, 48, 270], [88, YARD, 36, 270], [12, APRON, 18, 90], [40, APRON, 20, 90], [70, APRON, 26, 270], [88, APRON, 20, 270],
    [20, 0, 9.85, 90], [76, 0, 9.85, 270], [48, RIM, 1.5, 90]],
};

/* the named gaps (DESIGN.md §6.4's kinds) */
export const GAPS = [
  { name: 'Clear the Ten', value: 700, kind: 'air', from: [40, 30, 48, 31.5], to: [40, 17.5, 48, 26.5], toY: APRON },
  { name: 'Ten Rail', value: 750, kind: 'grind', rail: 'tenRail', full: true },
  { name: 'The Hubba', value: 650, kind: 'grind', rail: 'hubba', full: true },
  { name: 'Bank Drop', value: 400, kind: 'air', from: [32, 30, 39.4, 32.5], to: [31, 17.5, 40.4, 25.6], toY: APRON },
  { name: 'Yard Drop', value: 450, kind: 'air', from: [52, 30, 94, 32.5], to: [52, 17.5, 94, 27.5], toY: APRON },
  { name: 'Long Edge', value: 500, kind: 'grind', rail: 'longEdge', length: 12.0 },
  { name: 'Barrier Run', value: 600, kind: 'grind', rail: 'barrierRun', full: true },
  /* over the barriers crosswise: from beside them on one side to the other (score.js `clear` judges a long row along its length: an 11.4 m run
     can't be cleared that way, 10-16) */
  { name: 'Barrier Hop', value: 450, kind: 'air', from: [56, 42.0, 67.4, 44.1], to: [56, 44.9, 67.4, 48.0], toY: YARD },
  { name: 'Kiln Hop', value: 450, kind: 'clear', over: 'pyramid' },
  { name: 'Kiln Rail', value: 400, kind: 'grind', rail: 'kilnRail', full: true },
  { name: 'Flat Bar', value: 300, kind: 'grind', rail: 'flatBar', full: true },
  { name: 'Red Ledge', value: 300, kind: 'grind', rail: 'redLedge', full: true },
  { name: 'Dock Edge', value: 450, kind: 'grind', rail: 'dockEdge', length: 10.0 },
  { name: 'Dock Drop', value: 350, kind: 'air', from: [40, 64.5, 83.6, 67], to: [40, 50, 83.6, 62.5], toY: YARD },
  { name: 'Dock Seven', value: 450, kind: 'air', from: [84, 64.5, 90, 66], to: [84, 52, 90, 62.0], toY: YARD },
  { name: 'Dock Rail', value: 500, kind: 'grind', rail: 'dockRail', full: true },
  { name: 'Bump to Bump', value: 400, kind: 'air', from: [8, 36, 14, 38.2], to: [8, 39.7, 14, 41.9], toY: YARD + 0.3 },
  { name: 'Granite Block', value: 300, kind: 'grind', rail: 'graniteBlock', full: true },
  { name: 'Kiln Wall Air', value: 400, kind: 'vert', quarter: 'kilnWall', height: 0.6 },
  { name: 'Spillway Air', value: 450, kind: 'vert', quarter: 'northWall', height: 0.6 },
  { name: 'South Wall Air', value: 400, kind: 'vert', quarter: 'southWall', height: 0.6 },
  { name: 'Spillway Lip', value: 400, kind: 'grind', rail: 'northWall', length: 6.0 },
  { name: 'Drain Run', value: 300, kind: 'grind', rail: 'drain', full: true },
  { name: 'The Pipe', value: 350, kind: 'grind', rail: 'pipe', full: true },
  { name: 'DIY Air', value: 350, kind: 'vert', quarter: 'diyQuarter', height: 0.5 },
  { name: 'DIY Transfer', value: 500, kind: 'transfer2', a: 'diySpine:w', b: 'diySpine:e' },
  { name: 'Apron Ledge', value: 300, kind: 'grind', rail: 'apronLedge', length: 12.0 },
  { name: 'Pad Manual', value: 300, kind: 'manual', region: [60, 21.2, 66, 23.2], length: 5.0 },
  { name: 'Bench Gap', value: 250, kind: 'clear', over: 'benchA' },
];

/* the run: two minutes, five wax bars where a good line finds them (x, y, z of the bar) */
export const RUN = {
  seconds: 120,
  waxRadius: 0.95,
  wax: [[42, YARD + 0.4, 28.4], [80, 0.75, 9.85], [66.5, YARD + 1.45, 54], [12, YARD + 1.9, 62], [92, DOCK + 0.55, 66.5]],
};

/* the run's twelve goals, as data (js/game/run.js reads the kinds) */
export const GOALS = [
  { id: 'warm', name: 'Warm', say: 'Score 15,000 in a run', score: 15000 },
  { id: 'hot', name: 'Hot', say: 'Score 40,000 in a run', score: 40000 },
  { id: 'golden', name: 'Golden', say: 'Score 100,000 in a run', score: 100000 },
  { id: 'wax', name: 'Five wax bars', say: 'Find the five hidden wax bars in one run', wax: true },
  { id: 'kickten', name: 'Kickflip the Ten', say: 'Clear the Ten with a kickflip', gap: 'Clear the Ten', trick: 'Kickflip' },
  { id: 'tenrail', name: 'The Ten Rail', say: 'Grind the Ten Rail top to bottom', gap: 'Ten Rail' },
  { id: 'hubba', name: 'The Hubba', say: 'Grind the Hubba top to bottom', gap: 'The Hubba' },
  { id: 'dock', name: 'Dock Edge to the yard', say: 'Grind the Dock Edge, then drop to the yard, in one combo', gaps: ['Dock Edge', 'Dock Drop'] },
  { id: 'x10', name: '×10', say: 'Land a combo of ten or more', combo: 10 },
  { id: 'manual6', name: 'Six seconds on two wheels', say: 'Hold a manual for six seconds', manual: 6 },
  { id: 'spill', name: 'Spillway Air', say: 'Air out of the spillway', gap: 'Spillway Air' },
  { id: 'gaps8', name: 'Eight gaps', say: 'Find eight different gaps in one run', gapCount: 8 },
];

/* trees: a row on the far side of the spillway, and a few in the corners beyond the fence */
export const TREES = [[-5, 4], [-6, 22], [-5, 40], [101, 6], [102, 24], [101, 42], [8, -6], [26, -7], [44, -6.5], [62, -7], [80, -6], [94, -6.5]];

export default { id: 'kilnyard', name: 'Kiln Yard', PARK, GAPS, RUN, GOALS, TREES };
