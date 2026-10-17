/* WAXLINE — the one file a modder edits. Everything here is plain data: the park, the physics, the controls, the assists, the tricks
 * (and the stroke you draw for each), the scoring, the camera, the light and the colours. Change a number, save, reload.
 * Units: metres, seconds, degrees unless said. x runs east, z runs north, y is up. Where a number comes from is in CLEANROOM.md. */

/* ── THE PARKS: each park's rows, gaps, run and trees are their own module (js/parks/); the Plaza's are read here too, unchanged, by everything
 * that has always read them from this file. A second park is js/parks/kilnyard.js; js/parks/index.js lists them all. ── */
export { PARK, GAPS, RUN, TREES } from './parks/plaza.js';

/* ── PHYSICS ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/* THE BODY ON ITS LEGS (10-16; the references: the pose is a target for physics — Skate's joints blend from physics to the animation's target):
   the hips follow where the pose puts them on a spring of `hz`, damped by `zeta` (1: critical — no overshoot), the gap the legs' to take, within
   their reach in the board's frame: `sink` down, `rise` up, `sway` along and across (m) */
export const LEGS = { hz: 4, zeta: 1, sink: 0.15, rise: 0.03, sway: 0.08, tilt: 0.6, tiltHz: 1.2, tiltAcc: 43 };   // tilt: the most the body's attitude lags the board's (rad); tiltAcc: the most its turn accelerates (rad/s²: 43 is 40 m/s² at the hips); tiltHz: its spring (the trunk comes round slower than the hips follow)

export const PHYSICS = {
  step: 1 / 120,             // the simulation's fixed step
  maxSteps: 4,               // at most this many steps a frame (a longer hitch is dropped, never fast-forwarded)
  gGround: 9.81,             // gravity along slopes and transitions
  gAir: 12.5,                // gravity in flight (apex 0.85 m in 0.369 s)
  popApex: [0.30, 0.85],     // ollie height (board bottom over takeoff) at flick speed grade 1 and grade 5
  popLoadBonus: 0.08,        // a full load (pull) adds this share
  popTilt: 0.35,             // pop direction = lerp(world up, surface normal, popTilt)
  /* a stroke of the back foot (sim/body.js): its reach off the tail to the plant; its drive along the ground for as long as the board takes to
     roll `sweep` metres from the planted foot (as far behind as a leg holds the ball of the foot on the ground: longer, the leg could not reach
     and the planted foot dragged), at most `driveMax`; the force over the whole drive, its gain `dv`·(1 − v/top)^curve, its peak at most
     `aMax` (1.3 g: the OWNER'S GAME CHOICE, 10-16 — "Stronger pushes, 2.1 s"; a strong push is about 0.9 g, a sprint's start ~1 g); the `swing` forward to plant again; `back` to the tail (`backQuick` when the
     right thumb pulls for a pop or a manual); a pop or a manual met with the foot out waits for it at most `waitMax`, then goes as the foot
     finishes its step home inside it */
  push: { dv: 1.75, top: 7.5, curve: 0.6, aMax: 13.0, reach: 0.18, sweep: 0.44, driveMax: 0.34, swing: 0.25, back: 0.24, backQuick: 0.12, waitMax: 0.05,
    standBelow: 1.0, quickSwings: 2, cycle: 0.8, cycleSlope: 0.2 },   /* the cadence: a standing start (under standBelow m/s) runs its first quickSwings + 1 strokes straight on; then a plant a `cycle` s at most (75 a minute), slower above 4 m/s */
  pump: { gain: 0.32, top: 8.5 },             // per transition pass at pump assist 85 (scales with the assist)
  maxSpeed: 12,
  roll: { slab: 0.010, pavers: 0.016, deck: 0.012, curb: 0.010, granite: 0.010, grass: 0.25, ramp: 0.010, asphalt: 0.020 },
  drag: 0.0036,
  carve: { curv: 1.0, lateral: 8.0, respond: 0.12, kickturnBelow: 1.0, kickturnRate: 220 },
  brake: { foot: 2.5, slide: 5.0, slideAbove: 3.5 },
  spin: { rate: 600, accel: 2400 },
  wheelbase: 0.362, track: 0.20, deckTop: 0.09, probeUp: 0.32, probeDown: 0.40, touch: 0.05, stepUp: 0.02,   // a wheel's probe: from probeUp above, down to probeDown; ground within `touch` of its line is under it; a face higher than `stepUp` above its contact stops it (body.js rollOn)
  body: { low: { h: 0.16, r: 0.14 }, high: { h: 0.75, r: 0.26 }, bailSpeed: 3.0, lowBailSpeed: 2.4 },
  /* the catch (10-16): within the capture radius and falling, the board's sideways velocity is drawn toward the rail's line (steerTau, s);
     the trucks lock at the rail's top (contact, m above it), and what is left of the offset and the attitude eases out over catchT (s) */
  grind: { loss: 0.06, minSpeed: 0.8, window: [-0.12, 0.38], fallSpeed: 1.2, popOff: 0.75, contact: 0.03, steerTau: 0.04, catchT: 0.09, catchA: 50,
    onTop: 0.05 },   // the coping an air LEFT catches only on the rider's ask or with the trucks over its top: the board's middle within this of its line (m; a vert air comes down 8 cm inside its lip)
  friction: { rail: 0.025, waxedAngle: 0.030, angle: 0.050, waxedGranite: 0.040, curb: 0.070, coping: 0.040, slide: 1.6 },
  land: { clean: [22, 28, 0.08], sketchy: [40, 45, 0.18], sketchyKeep: 0.8, wobble: 0.6, hardDrop: 2.4 },
  manual: { pitch: 11, minSpeed: 0.6 },
  lip: { maxUp: 2.6, dropSpeed: 1.6 },
  revert: { window: 0.18, slope: 15, keep: 0.95, time: 0.30 },
  vert: { window: 0.20, lipAngle: 30, inset: 0.08, drift: 4 },   // inset: a vert air comes down this far inside its lip · drift: the most it is moved back in, m/s² at vert 100
  /* THE ROLL-IN OVER A COPING (body.js copingCrossed — 10-16, the supervisor's calls (A) and per lip): below the LIP'S OWN `vStar` (its
     element's in the park, else 0 — measured lip by lip: tests/vstar.mjs, DESIGN §4.5) the board ROLLS over it on its wheels, its deck on the
     coping between them (the high-centre), the vert assist holding it to the wall; at it and over it DROPS IN — a short air off the coping, its
     path turned down toward the wall by `turn` rad/s at vert 100 and its up toward the wall's at the landing. `ahead`: how far ahead of the edge
     (s) the rider leans into it; `lean`: the most the body leans ahead of the board (rad: inside LEGS.tilt) */
  dropIn: { turn: 25, ahead: 0.35, lean: 0.5 },
  bail: { ragdoll: 0.9, back: 1.3, skipAfter: 0.35 },
  balance: { k0: 0.5, kAssist: 3.0, sigma0: 0.5, sigmaT: 0.06, sigmaRepeat: 0.15, gain: 2.2 },
};

/* ── CONTROLS ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export const INPUT = {
  zones: { bandTurned: 0.30, bandUpright: 0.46, bandMin: 96, inset: 8 },
  look: { perPx: 0.0055, yaw: 150, pitch: [-20, 45], back: 0.8, backFast: 0.4, slop: 6 },
  thumb: { dead: 6, full: 70, curve: 1.3, push: 24, brake: 24, tapMs: 180, tapPx: 12, reanchor: 90 },
  mapping: 'screen',         // 'screen' (the same stroke is the same trick in every stance) or 'foot'
  reader: { load: 18, popMin: 16, popFrac: 0.5, popSpeed: 0.45, cone: 115, freeze: 6, shapeMs: 200, margin: 0.02, points: 24,
    manual: [12, 34], manualStill: 0.15, manualMs: 90, grab: 26, grabMs: 90, swipe: 30, swipeSpeed: 0.6,
    accuracy: [0.04, 0.07, 0.10, 0.14], speed: [0.8, 1.3, 1.9, 2.7] },
};

/* ── ASSISTS: Cruise is the default (any up or sideways flick is a clean basic trick at full height) ─────────────────────────────────── */
export const ASSISTS = {
  preset: 'cruise',
  cruise: { streamlined: true, tapOllie: true, catch: 100, grind: 85, balance: 85, pump: 85, vert: 85, spin: 45, sensitivity: 50 },
  classic: { streamlined: false, catch: 50, grind: 50, balance: 50, pump: 85, vert: 60, spin: 30, sensitivity: 50 },
  raw: { streamlined: false, catch: 0, grind: 0, balance: 0, pump: 0, vert: 0, spin: 0, sensitivity: 50 },
};

/* ── TRICKS: `stroke` is the shape you draw after the load (0° = up the screen, -90° = left, +90° = right) ───────────────────────────── */
export const TRICKS = {
  flips: [
    { name: 'Ollie', base: 50, stroke: { kind: 'line', dir: 0 }, flip: 0, shove: 0 },
    { name: 'Kickflip', base: 100, stroke: { kind: 'line', dir: -45 }, flip: -1, shove: 0 },
    { name: 'Heelflip', base: 100, stroke: { kind: 'line', dir: 45 }, flip: 1, shove: 0 },
    { name: 'BS Pop Shove-it', base: 100, stroke: { kind: 'line', dir: -90 }, flip: 0, shove: -0.5 },
    { name: 'FS Pop Shove-it', base: 100, stroke: { kind: 'line', dir: 90 }, flip: 0, shove: 0.5 },
    { name: 'Varial Kickflip', base: 300, stroke: { kind: 'curve', from: -100, to: -10 }, flip: -1, shove: -0.5 },
    { name: 'Varial Heelflip', base: 300, stroke: { kind: 'curve', from: 100, to: 10 }, flip: 1, shove: 0.5 },
    { name: 'Inward Heelflip', base: 350, stroke: { kind: 'curve', from: -90, to: 45 }, flip: 1, shove: -0.5 },
    { name: 'Hardflip', base: 400, stroke: { kind: 'curve', from: 90, to: -45 }, flip: -1, shove: 0.5 },
    { name: '360 Flip', base: 500, stroke: { kind: 'loop', from: -90, turn: 330 }, flip: -1, shove: -1 },
    { name: 'Laser Flip', base: 550, stroke: { kind: 'loop', from: 90, turn: -330 }, flip: 1, shove: 1 },
  ],
  doubles: { Kickflip: { name: 'Double Kickflip', base: 450 }, Heelflip: { name: 'Double Heelflip', base: 450 }, 'BS Pop Shove-it': { name: '360 Shove-it', base: 250 } },
  /* the specials: only while the special meter is golden. A flick held still at its end makes its family's special; a slide held still on
     the pad becomes a Darkslide. */
  specials: { kick: { name: 'Nightmare Flip', base: 2000, flip: -2, shove: -0.5 }, heel: { name: 'Hospital Flip', base: 1800, flip: 1.5, shove: 1 },
    shove: { name: 'Underflip', base: 1500, flip: -1, shove: 0.5 }, slide: { name: 'Darkslide', base: 2500, perSecond: 150, holdMs: 250 }, heldMs: 150 },
  doubleLen: 130,                    // px: a double is a stroke at speed grade 5 this long or longer
  flipTime: [0.40, 0.32, 0.26],       // seconds a flip turn takes at speed grade 1, 3 and 5
  grabs: [ // the direction you hold, 0° = up the screen
    { name: 'Nose Grab', dir: 0, base: 120 }, { name: 'Mute', dir: 45, base: 150 }, { name: 'Indy', dir: 90, base: 150 }, { name: 'Crail', dir: 135, base: 200 },
    { name: 'Tail Grab', dir: 180, base: 120 }, { name: 'Stalefish', dir: -135, base: 200 }, { name: 'Melon', dir: -90, base: 150 }, { name: 'Method', dir: -45, base: 250 },
  ],
  grabPerHalfSecond: 100, grabMax: 2.0,
  grinds: {
    '50-50': [100, 80], '5-0': [150, 100], 'Nosegrind': [150, 100], 'Crooked': [200, 120], 'Smith': [200, 120], 'Feeble': [200, 120],
    'Boardslide': [150, 100], 'Lipslide': [200, 120], 'Noseslide': [150, 100], 'Tailslide': [150, 100], 'Bluntslide': [300, 150],
  },
  manuals: { 'Manual': [50, 60], 'Nose Manual': [60, 70] },
  reverts: { 'FS Revert': 100, 'BS Revert': 100 },
};



/* ── SCORING: the multiplier is the number of tricks plus the number of gaps ─────────────────────────────────────────────────────────── */
export const SCORING = {
  repeats: [1.0, 0.75, 0.5, 0.25, 0.1],
  switchBonus: 1.2, nollieBonus: 1.1,
  spinPerHalf: 0.5,
  grade: { base: 0.8, perStep: 0.05 },
  bankAfter: 0.25,
  special: { perPoint: 1 / 4000, perGap: 0.05 },
};

/* ── CAMERA ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
export const CAMERA = {
  filmer: { back: 2.7, up: 0.62, lookUp: 0.55, fov: 68, uprightFov: 74, lag: 0.12, yawLag: 0.22 },
  high: { back: 3.8, up: 2.2, lookUp: 0.6, fov: 64, uprightFov: 70, lag: 0.14, yawLag: 0.25 },
  bail: { back: 3.6, up: 2.3, lookUp: 0.1, fov: 60, uprightFov: 68, lag: 0.3, yawLag: 0.6 },     // a fall is watched from back and above
  radius: 0.25, nearest: 0.8,
};

/* ── LIGHT AND COLOUR: golden hour, fixed ────────────────────────────────────────────────────────────────────────────────────────── */
export const LOOK = {
  sun: { elevation: 13, azimuth: 235, color: '#ffe6c6', intensity: 5.0 },
  /* the sky: deep blue overhead → pale blue → a horizon that burns orange toward the sun and is a soft peach away from it; the haze is the
     colour every far thing fades into, and the band just above the ground in every direction */
  sky: { zenith: '#3a68b0', mid: '#93b4dc', horizon: '#ffbe72', away: '#e4d4bf', ground: '#7a7978', haze: '#e3c9a9', fog: [50, 330] },
  fill: { color: '#c0c4c8', intensity: 0.4, env: 0.3 },
  exposure: 0.95,
  /* the painted look: light in three bands, an ink line round every form */
  painted: { bands: [0.5, 0.74, 1.0], sun: 2.6, fill: 1.15, sky: '#b9acd9', ground: '#9a7556', exposure: 1.0, ink: '#24170f', inkStrength: 0.9, inkPx: 0.7 },
  look: 'real',
  palette: {
    slab: '#b9b2a7', stain: '#8f877c', crack: '#5b544c', skid: '#2c2a29', granite: '#8e9599', feldspar: '#c9c3bb', grain: '#2f3336',
    coping: '#e2a62a', steel: '#6f7378', steelBright: '#b8bcc0', curb: '#b4473a', grass: '#6f8a43', grassDry: '#a6a35b', leaves: '#5e7d3a',
    leavesLit: '#b7c35a', bark: '#8b8577', pavers: '#a39d94', deck: '#aaa398', asphalt: '#4a4744',
  },
};

/* ── THE CAST (the prototype skates Juno) ────────────────────────────────────────────────────────────────────────────────────────── */
export const SKATERS = [
  { id: 'juno', name: 'Juno', stance: 'regular', height: 1.76, skin: '#8a5a3c', jacket: '#a5502e', tee: '#efe6d2', pants: '#76824c',
    beanie: '#d7a12c', hair: '#1d1612', shoe: '#ece4d4', sole: '#b98b4e', lace: '#d8d0c0', eye: '#2a1c14',
    /* the cloth's own colours (view/cloth.js): the shoes' suede panels, the sock, the sole's stripe, and the top-stitching on each garment */
    suede: '#7b5536', sock: '#e6e2da', foxing: '#2e2620', stitch: { jacket: '#dcb27a', pants: '#cfae6c', shoe: '#f3ede0' } },
];

/* the board: a 31.75 × 8.0 in deck on 14.25 in of wheelbase, 53 mm wheels */
export const BOARD = { length: 0.806, width: 0.203, wheelbase: 0.362, kick: 18, concave: 0.012, thickness: 0.011, wheel: 0.053, wheelWidth: 0.032,
  truckHeight: 0.053, grip: '#26272a', ply: ['#e8d4b0', '#c9a477', '#1d1d1f', '#e8d4b0', '#d06a3a', '#e8d4b0', '#c9a477'], wheelColor: '#efe9dc',
  graphic: { base: '#e7a32a', ink: '#1b1a17', word: 'WAXLINE' } };

/* ── SOUND: every sound is synthesized (js/audio/audio.js) ───────────────────────────────────────────────────────────────────────── */
export const SOUND = {
  master: 0.8,
  /* each surface's roll in three layers: body [Hz, Q, gain] (the roar), grit [Hz, Q, gain] (coarse surfaces hiss), boom [Hz, Q, gain] (a hollow deck rings) */
  /* the grit sits above 5 kHz on every surface, out of the band the joints are heard in (2.1–2.7 kHz) */
  roll: {
    slab: { body: [430, 0.7, 0.32], grit: [6000, 1.6, 0.03], boom: null },
    pavers: { body: [760, 1.1, 0.26], grit: [6000, 2.0, 0.12], boom: null },
    deck: { body: [480, 0.8, 0.24], grit: [5600, 1.4, 0.04], boom: [150, 5, 0.62] },
    ramp: { body: [380, 1.6, 0.36], grit: [6200, 1.4, 0.012], boom: null },   // the polished transition: a narrower, smoother whir than the slab's roar
    granite: { body: [1150, 1.5, 0.22], grit: [6400, 1.4, 0.09], boom: null },
    curb: { body: [560, 0.9, 0.28], grit: [7200, 2.0, 0.09], boom: null },
    grass: { body: [260, 0.6, 0.07], grit: [5000, 0.9, 0.02], boom: null },
    asphalt: { body: [620, 0.6, 0.28], grit: [5000, 0.9, 0.2], boom: null },
  },
  /* the seams: a joint every so many metres, each wheel's crack in a band the roll leaves clear, and its drop into the gap */
  joints: { slab: 3.0, pavers: 0.6, deck: 3.0, curb: 1.0 },
  clack: { band: 2400, q: 2.2, peak: 1.3, decay: 0.014, thud: 0.28 },
  pop: { freq: 420, decay: 0.09 },
  grind: { metal: [1100, 2700, 4900], stone: [1400] },
};
