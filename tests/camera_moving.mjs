/* SHE STAYS IN THE PICTURE WHEN SHE MOVES (the supervisor's C1b). The page's own camera (view/camera.js Follow), her own skeleton and pose
 * (view/skater.js rigSkater), the board, the pose and the fall in the page's own order (view/figure.js stepFigure), on the real sim
 * (sim/body.js) at 120 Hz with the camera at 60: airs off every transition — the three quarter pipes, the Spine both ways, the Basin's four
 * walls and four corners, the bank, the drops and flat ground — at two speeds and on straight and slanted lines (a held grab on the fast
 * ones), and bails into every kind of wall and corner, upright (390×844) and turned (844×390). On every frame of the air or the fall: every
 * point of her (bodyPoints) inside the safe frame (camera.js SAFE), and the lines from the lens to her head, chest, hips and feet clear
 * (sightline.js firstHit). A case that never reaches its air or its fall fails: it would prove nothing.
 * Plants (each must go RED): --plant noframe (the framing pass taken out), --plant oldcamera (the camera handed no body — a standing
 * skater's points, as before), --plant oldfall (she tips along her line, into what she hit). --plants runs the three and the clean build. */
import * as THREE from '../build/vendor/three/build/three.module.min.js';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { World } from '../build/js/sim/world.js';
import { Skater } from '../build/js/sim/body.js';
import { Follow, framed } from '../build/js/view/camera.js';
import { inWorld } from '../build/js/view/sightline.js';
import { rigSkater, bodyPoints } from '../build/js/view/skater.js';
import { boardInside } from './lib/inside.mjs';
import * as H from './lib/heading.mjs';
import { BOUND } from './lib/ride.mjs';
import { yawGate } from './lib/airyaw.mjs';
import { drops } from './lib/drops.mjs';
import { airsRead, airsBase, airsRecord } from './lib/airsread.mjs';
import { gapReader, GAP } from './lib/gap.mjs';
import { poseInput, stepFigure, followed, Fall } from '../build/js/view/figure.js';
import { PHYSICS, ASSISTS, CAMERA } from '../build/js/config.js';

const argv = process.argv.slice(2), me = fileURLToPath(import.meta.url);
if (argv.includes('--plants')) {
  /* the wall both ways: each plant RED, the clean build GREEN */
  let bad = 0;
  for (const p of ['noframe', 'oldcamera', 'oldfall', 'jumpy', 'far', null]) {
    let code = 0, out = '';
    try { out = execFileSync(process.execPath, [me, ...(p ? ['--plant', p] : []), '--quiet'], { encoding: 'utf8' }); } catch (e) { code = e.status; out = e.stdout || ''; }
    const want = p ? 1 : 0, line = (out.trim().split('\n').filter((l) => /^(upright|turned)/.test(l)).join(' · ')) || out.trim().split('\n').pop();
    console.log((code === want ? '✔ ' : '✖ ') + (p ? 'plant ' + p + ' → ' + (code ? 'RED' : 'GREEN') + ' (must be RED)' : 'clean build → ' + (code ? 'RED' : 'GREEN')) + ' · ' + line);
    if (code !== want) bad++;
  }
  console.log(bad ? 'CAMERA MOVING, BOTH WAYS: RED' : 'CAMERA MOVING, BOTH WAYS: GREEN'); process.exit(bad ? 1 : 0);
}
const plant = argv.includes('--plant') ? argv[argv.indexOf('--plant') + 1] : null, quiet = argv.includes('--quiet');
if (plant === 'noframe') Follow.prototype.frameBody = function () {};
/* the guards' own plants: a camera with no easing (it jumps to every new place), a camera six times farther back (she becomes a speck) */
if (plant === 'jumpy') for (const m of ['filmer', 'high', 'bail']) CAMERA[m].lag = 1e-4;
if (plant === 'far') for (const m of ['filmer', 'high', 'bail']) CAMERA[m].back *= 6;
if (plant === 'oldfall') Fall.prototype.choose = function (pos, vel) { const sp = Math.hypot(vel[0], vel[2]), d = sp > 0.2 ? [vel[0] / sp, 0, vel[2] / sp] : [1, 0, 0]; return { dir: d, slide: [vel[0] * 0.6, 0, vel[2] * 0.6], t: 0, pos: pos.slice(), vy: 0 }; };

const world = new World();
const floor = (x, y, z) => { const g = world.groundAt(x, y + 0.5, z, 2); if (!g) throw new Error('no floor at ' + [x, y, z]); return g.point.slice(); };
/* THE TOUCHDOWN'S TWO GATES (10-16, the supervisor's (a) and (b) — body.js: each wheel's contact point swept over a step, the board landing on
   the first that touches and turned about its middle onto the others, no lift):
   (b) THE BOARD NEVER INSIDE THE PARK: a wheel's lowest point at most 1 cm into a solid (tests/lib/inside.mjs), read at every step (a 120 Hz
       screen draws every one) of every case's WHOLE ride — ten seconds, nobody steering — on all three assists a player can choose;
   (a) A TOUCHDOWN'S OWN MOVE: on every step that begins in the air, and the three rolling steps after a landing, the board ends within 1 cm of
       its own free path that step — the segment from where it began along its velocity (gravity in the air): stopped ON that path where a
       wheel met something is no correction; a lift, a pull-down onto a surface, a seat off the path is.
   (Before: touchdown read the wheels' midpoint and a lift raised the board by a truck's depth in a solid — 14.5 cm in a step on Cruise, 24.6
   on Classic and Raw; Raw's first airs were held at 2 cm, and the rest of each ride was a census: 10/20/22 cases over, the deepest 6.9 cm) */
const BOARD_IN = 0.01, OWN_MOVE = 0.01;
/* NAMED FOR THE NEXT RELEASE (the supervisor, 10-17; shipped on the owner's "Ship it now"): the bound stays 1 cm; over it and no more than 2 cm,
   each class is SAID by its own transition with its numbers and the release that owns it; over 2 cm, or any other class, is RED.
   (b) a wheel over 1 cm into a solid for no more than three frames (six steps): the settle stands on its lowest contact and reads no wheel
       that arrives during it — the next release: every wheel a contact as it arrives;
   (a) a landing's own move (air → roll): the settle seats off the free path — the next release, the same;
       a grind catch's own move (air → grind): the catch onto a rail at one pace — the next release paces its across plan by the meeting's angle */
const NAMED_UP_TO = 0.02, NAMED_STEPS = 6;
const NAMED = { inside: 'the settle stands on its lowest contact and reads no wheel that arrives during it — the next release: every wheel a contact as it arrives',
  'air → roll': 'a landing\'s settle seats off the free path — the next release: every wheel a contact as it arrives',
  'air → grind': 'the catch onto a rail at one pace — the next release paces its across plan by the meeting\'s own angle' };
/* ---------------- the airs ---------------- */
const AIRS = [];
const air = (name, at, heading, speeds, more = {}) => { for (const sp of speeds) AIRS.push(Object.assign({ kind: 'air', name: name + ' @' + sp, at, heading, speed: sp, grab: sp >= 8.5 }, more)); };
for (const z of [34.5, 38, 41.5]) air('Deck Quarter, z ' + z, [31, 0.8, z], 270, [7, 9]);
for (const [z, h] of [[37, 248], [40, 292]]) air('Deck Quarter, slanted ' + h, [31, 0.8, z], h, [7.5, 9]);
for (const z of [8, 16, 24]) air('East Wall, z ' + z, [50.5, 0, z], 90, [7, 9]);
for (const [z, h] of [[12, 78], [20, 102]]) air('East Wall, slanted ' + h, [50.5, 0, z], h, [7.5, 9]);
for (const z of [21, 24, 27]) air('Lawn Quarter, z ' + z, [6, 0, z], 270, [6.5, 8.5]);
for (const z of [21.5, 24, 26.5]) { air('Spine from the east, z ' + z, [14.5, 0, z], 270, [6.5, 8.5]); air('Spine from the west, z ' + z, [4.2, 0, z], 90, [6.5, 8.5]); }
for (const [nm, h] of [['north wall', 0], ['east wall', 90], ['south wall', 180], ['west wall', 270], ['NE corner', 45], ['SE corner', 135], ['SW corner', 225], ['NW corner', 315]]) air('Basin ' + nm, [9, -1.83, 10], h, [6.5, 8.5]);
for (const x of [41.5, 43.5, 45.5]) air('Sun Bank, popped at the top, x ' + x, [x, 0, 25], 0, [6.5], { pop: (sk) => sk.p[2] >= 31.3 });
air('Sun Bank Drop', [45.5, 0.8, 37], 180, [6.5, 8], { pop: (sk) => sk.p[2] <= 32.5 });
air('Deck Drop', [20.6, 2.63, 38], 90, [6, 7.5], { pop: (sk) => sk.p[0] >= 22.6 });
air('Long Five', [51.5, 0.8, 37], 180, [6.5, 8], { pop: (sk) => sk.p[2] <= 32.4 });
air('Terrace Drop', [27, 0.8, 37], 180, [6, 7.5], { pop: (sk) => sk.p[2] <= 32.4 });
air('Flat ollie', [18, 0, 8], 90, [5, 8], { pop: (sk) => sk.p[0] >= 19.5 });
/* ---------------- the bails ---------------- */
const BAILS = [];
const bail = (name, at, heading, speeds = [6.5], more = {}) => { for (const sp of speeds) BAILS.push(Object.assign({ kind: 'bail', name: name + ' @' + sp, at, heading, speed: sp }, more)); };
bail('West Deck wall (2.6 m)', [21.5, 0, 26.5], 0, [4.5, 7]);
bail('East Deck end (1.8 m)', [60.5, 0, 31.4], 180);
bail('Terrace riser', [30, 0, 26], 0, [4.5, 7]); bail('Terrace riser, glancing', [27, 0, 27], 35);
bail('Lawn Deck end', [0.9, 0, 14], 0);
bail('Spine end', [8.6, 0, 17.4], 0);
bail('Planter, south face', [45.2, 0, 19.5], 0); bail('Planter, north face', [45.2, 0, 31], 180); bail('Planter, west face', [38.5, 0, 25.2], 90); bail('Planter, east face', [52, 0, 25.2], 270);
bail('Planter, SW corner', [40, 0, 20.4], 45); bail('Planter, NE corner', [50.4, 0, 30], 225); bail('Planter, SE corner', [50.4, 0, 20.4], 315); bail('Planter, NW corner', [40, 0, 30], 135);
bail('Bench', [34.2, 0, 10.5], 0); bail('Main Ledge face', [34, 0, 19.5], 0);
bail('The Five, from below', [51.5, 0, 26], 0);
bail('Fence, east', [56.5, 0, 30.5], 90); bail('Fence, south', [20, 0, 5.5], 180); bail('Fence, west', [6, 0, 18], 270); bail('Fence, north', [40, 0.8, 38.5], 0);
bail('Corner: Deck Quarter end and the riser', [21, 0, 27], 30); bail('Corner: West Deck, outside', [16, 0, 28], 45);
bail('Corner: the riser and the east fence', [57, 0, 27], 45); bail('Corner: East Deck, outside', [56.3, 0, 31.4], 135);
bail('Sun Ledge face', [37, 0.8, 33.2], 0); bail('Terrace Block', [56.5, 0.8, 34], 0);
bail('On the Deck Quarter\'s slope, into the fence', [24.6, 0.8, 39], 0);
bail('A spun landing off the Long Five', [51.5, 0.8, 37], 180, [7], { pop: (sk) => sk.p[2] <= 32.4, steer: (sk) => (sk.state === 'air' ? 1 : 0) });

/* ---------------- one case, framed as the page frames it ---------------- */
function runCase(c, aspect) {
  const pre = c.preset || 'cruise', sk = new Skater(world, { preset: pre, seed: 1 }); sk.assist = Object.assign({ name: pre }, ASSISTS[pre]);
  sk.respawnAt(floor(...c.at), c.heading, c.speed);
  const scene = new THREE.Scene(), juno = rigSkater(), board = new THREE.Group(); board.add(juno.rig); scene.add(board);
  const camera = new THREE.PerspectiveCamera(68, aspect, 0.08, 900), cam = new Follow({ camera }, world), fall = new Fall(world, scene, juno, board), BODY = [];
  const r = { name: c.name, kind: c.kind, frames: 0, out: 0, hidden: 0, reached: false, worstOut: 0, worstAt: null, hiddenAt: null, outside: 0, inside: 0, insideAt: null, jumps: 0, jumpAt: null, specks: 0, speckAt: null, all: 0, gap: gapReader() };
  const prev = new THREE.Vector3(); let had = false;
  const per = Math.round(1 / 60 / PHYSICS.step);
  let popped = false, grabbed = false, prevRead = null;
  for (let fr = 0; fr < 600; fr++) {
    for (let i = 0; i < per; i++) {
      const events = [];
      if (c.pop && !popped && sk.state === 'roll' && c.pop(sk)) { events.push({ type: 'pop', load: 1, spd: 4, acc: 4 }); popped = true; }
      if (c.grab && !grabbed && sk.state === 'air' && sk.air && !sk.air.quiet && sk.t - sk.air.t0 > 0.12) { events.push({ type: 'grab', on: true, dir: 90 }); grabbed = true; }
      prevRead = sk.read();
      sk.step(PHYSICS.step, { steer: c.steer ? c.steer(sk) : 0, throttle: 0, events, hold: null, pushTap: false, golden: false });
      for (const e of sk.events) { if (e.type === 'bail') fall.start(e); if (e.type === 'respawn') { fall.end(); cam.ready = false; prevRead = sk.read(); } }
    }
    const s = poseInput(sk, 0, prevRead, 0);   // drawn between the frame's last two steps, as the page draws it (figure.js drawn): two whole steps a sixtieth, alpha 0
    stepFigure(1 / 60, s, juno, board, fall);
    const body = bodyPoints(juno, BODY);
    if (fall.on) r.gap.reset(); else r.gap.frame(juno.state.att, body[3], body[1], sk.up, 'frame ' + fr + ' (' + sk.state + ')');   // the body at the legs' limit (tests/lib/gap.mjs)
    cam.update(1 / 60, followed(s, fall), { bail: fall.on, body: plant === 'oldcamera' ? null : body });
    if (!inWorld(camera.position.toArray())) r.outside++;   // the lens left the fenced park (any frame of the case, judged or not)
    /* THE GUARDS, on every frame of the case: the lens moves no more than 0.6 m a frame — unless it cut to a clear place no farther from her
       than the place it wants, or a new shot began (a respawn); and she is never a speck (her size on the screen, the larger of her height
       and her width in screen heights, at least a tenth) */
    { r.all++; const step = had ? camera.position.distanceTo(prev) : 0; had = true;
      if (step > 0.6 && !cam.fresh) {
        const mid = body.reduce((a, q) => a.add(q), new THREE.Vector3()).multiplyScalar(1 / body.length), F0 = framed(camera, body, world, cam.occ);
        const okCut = cam.cut && !F0.hidden.length && camera.position.distanceTo(mid) <= cam.wantDist + 0.5;
        if (!okCut) { r.jumps++; if (!r.jumpAt) r.jumpAt = fr + ' (' + step.toFixed(2) + ' m' + (cam.cut ? ', a cut' : '') + ')'; }
      }
      prev.copy(camera.position);
      camera.updateMatrixWorld(true); let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
      for (const q of body) { const v2 = q.clone().project(camera); y0 = Math.min(y0, v2.y); y1 = Math.max(y1, v2.y); x0 = Math.min(x0, v2.x); x1 = Math.max(x1, v2.x); }
      const size = Math.max((y1 - y0) / 2, (x1 - x0) / 2 * camera.aspect);
      if (size < 0.1) { r.specks++; if (!r.speckAt) r.speckAt = fr + ' (' + (100 * size).toFixed(1) + '% of the screen)'; } }
    const judged = c.kind === 'air' ? sk.state === 'air' && sk.air && !sk.air.quiet : fall.on;
    if (judged) {
      r.reached = true; r.frames++;
      const F = framed(camera, body, world, cam.occ);
      if (F.past > 0.005) { r.out++; if (F.past > r.worstOut) { r.worstOut = F.past; r.worstAt = fr; } }
      if (F.hidden.length) { r.hidden++; if (!r.hiddenAt) r.hiddenAt = fr + ' (' + F.hidden.join(', ') + ')'; }
      if (F.inside.length) { r.inside++; if (!r.insideAt) r.insideAt = fr + ' (' + F.inside.join(', ') + ')'; }
    }
    if (r.reached && !judged) break;
  }
  return r;
}

let fail = 0;
const say = (l) => { if (!quiet) console.log(l); };
const GAPS = [];   // every air's reading of the body at the legs' limit, every assist (tests/lib/gap.mjs)
for (const [view, aspect] of [['upright', 390 / 844], ['turned', 844 / 390]]) {
  const rows = [...AIRS, ...BAILS].map((c) => runCase(c, aspect));
  for (const r of rows) if (r.kind === 'air') GAPS.push([r.name + ' (cruise, ' + view + ')', r.gap]);
  for (const kind of ['air', 'bail']) {
    const R = rows.filter((r) => r.kind === kind), frames = R.reduce((a, r) => a + r.frames, 0), out = R.reduce((a, r) => a + r.out, 0), hidden = R.reduce((a, r) => a + r.hidden, 0), missed = R.filter((r) => !r.reached), outside = R.reduce((a, r) => a + r.outside, 0);
    const bad = out || hidden || missed.length || outside; if (bad) fail++;
    const inside = R.reduce((a, r) => a + r.inside, 0), ins = R.filter((r) => r.inside), all = R.reduce((a, r) => a + r.all, 0), jumps = R.reduce((a, r) => a + r.jumps, 0), specks = R.reduce((a, r) => a + r.specks, 0);
    const badG = jumps || specks; if (badG) fail++;
    console.log(view + ' ' + (kind === 'air' ? 'airs' : 'falls') + ', every frame of every case (' + all + '): ' + jumps + ' with the lens jumping over 0.6 m without a cut to a clear place, ' + specks + ' with her under a tenth of the screen' + (badG ? '  ✖' : '  ✔'));
    for (const r of R.filter((r) => r.jumps || r.specks).slice(0, quiet ? 0 : 8)) say('    ' + r.name + ': ' + (r.jumps ? r.jumps + ' jumps, first at ' + r.jumpAt : '') + (r.specks ? (r.jumps ? ' · ' : '') + r.specks + ' frames a speck, first at ' + r.speckAt : ''));
    console.log(view + ' ' + (kind === 'air' ? 'airs' : 'falls') + ': ' + R.length + ' cases, ' + frames + ' frames — ' + out + ' with her outside the safe frame, ' + hidden + ' with a line to her blocked, ' + outside + ' with the lens outside the fence' + (missed.length ? ', ' + missed.length + ' never reached' : '') + (bad ? '  ✖' : '  ✔'));
    /* her body inside the park (not the camera's, but the picture's all the same: a shoe through a lip, a foot under the ground) fails too */
    if (inside) fail++;
    console.log(view + ' ' + (kind === 'air' ? 'airs' : 'falls') + ': ' + inside + ' frames with a point of her INSIDE the park\'s surfaces (a body clipping)' + (inside ? '  ✖ — ' + ins.map((r) => r.name + ' ' + r.inside + ' frames, first ' + r.insideAt).join('; ') : '  ✔'));
    for (const r of R.filter((r) => r.out || r.hidden || !r.reached || r.outside).slice(0, quiet ? 0 : 14)) say('    ' + r.name + ': ' + (!r.reached ? 'never reached' : (r.out ? r.out + '/' + r.frames + ' out (worst ' + r.worstOut.toFixed(2) + ' past the edge, frame ' + r.worstAt + ')' : '') + (r.hidden ? (r.out ? ' · ' : '') + r.hidden + '/' + r.frames + ' blocked (first at frame ' + r.hiddenAt + ')' : '') + (r.outside ? ' · the lens outside the fence on ' + r.outside + ' frames' : '')));
  }
}
/* the camera on the other two assists a player can choose (Classic, Raw: the board comes down as it flew) — REPORTED, the landing pass's TODO
   (the supervisor's call, 10-16): every air framed again on each, both ways */
for (const pre of ['classic', 'raw']) for (const [view, aspect] of [['upright', 390 / 844], ['turned', 844 / 390]]) {
  const R = AIRS.map((c) => runCase(Object.assign({}, c, { preset: pre, name: c.name + ' (' + pre + ')' }), aspect)), frames = R.reduce((a, r) => a + r.frames, 0);
  for (const r of R) GAPS.push([r.name + ', ' + view, r.gap]);
  const out = R.reduce((a, r) => a + r.out, 0), hidden = R.reduce((a, r) => a + r.hidden, 0), inside = R.reduce((a, r) => a + r.inside, 0), missed = R.filter((r) => !r.reached).length, worst = R.filter((r) => r.hidden || r.out || r.inside).slice(0, 3);
  console.log('ℹ the camera on ' + pre[0].toUpperCase() + pre.slice(1) + ', ' + view + ' — reported, the landing pass\'s TODO: ' + R.length + ' airs, ' + frames + ' frames — ' + out + ' with her outside the safe frame, ' + hidden + ' with a line to her blocked, ' + inside + ' with a point of her inside the park' + (missed ? ', ' + missed + ' never reached' : '') + (worst.length ? ' (' + worst.map((r) => r.name + (r.hidden ? ' blocked ' + r.hidden : '') + (r.out ? ' out ' + r.out : '') + (r.inside ? ' inside ' + r.inside : '')).join('; ') + ')' : ''));
}
/* THE BODY IS CARRIED AT THE LEGS' LIMIT, on every air of every assist (tests/lib/gap.mjs: held at the limit, the gap from the board never turns
   its direction — off this slant on Cruise it turned 171° and the lines to her head and chest were blocked) */
{ const W = GAPS.reduce((a, g) => (g[1].swing > a[1].swing ? g : a), GAPS[0]), n = GAPS.reduce((a, g) => a + g[1].capFrames, 0), H = GAPS.reduce((a, g) => (g[1].hold > a[1].hold ? g : a), GAPS[0]);
  const bad = W[1].swing > GAP.swing; if (bad) fail++;
  console.log('THE BODY IS CARRIED AT THE LEGS\' LIMIT, every air on every assist (' + GAPS.length + ' framed): held at it, the gap from the board turned its direction at most ' + W[1].swing.toFixed(1) + '° (≤ ' + GAP.swing + (W[1].swing > 0 ? '; ' + W[0] + ', ' + W[1].swingAt : '') + ') · ℹ ' + n + ' frames held, the longest ' + H[1].hold + (H[1].hold ? ' (' + H[0] + ')' : '') + (bad ? '  ✖' : '  ✔')); }
const AR = {};
for (const pre of ['cruise', 'classic', 'raw']) {
  const P = pre[0].toUpperCase() + pre.slice(1), ride = { depth: 0 }, over = [], move = { off: 0 }, moved = [], named = { inside: [], 'air → roll': [], 'air → grind': [] }, head = { ex: -Infinity }, swung = []; let lipAirs = 0; const ends = { free: [], asked: 0, transfer: 0 };
  const dropped = drops();   // what a capped slide left, by kind (body.js noteDropped → tests/lib/drops.mjs): reported
  const YG = yawGate(1 / 60, world), RD = AR[pre] = airsRead(Skater, PHYSICS);   // THE LANDING YAW NEVER STEPS on every air (the assist's frames, the touchdown's set, the catch), a contact's turn (reported)
  for (const c of [...AIRS, ...BAILS]) {
    const sk = new Skater(world, { preset: pre, seed: 1 }); sk.assist = Object.assign({ name: pre }, ASSISTS[pre]); sk.respawnAt(floor(...c.at), c.heading, c.speed);
    let popped = false, grabbed = false, lipOpen = false, leftGroup = null, after = 0; const all = { depth: 0 }, own = { off: 0 }, yaw = { ex: -Infinity }; YG.ride(); RD.ride();
    for (let st = 0; st < 1200; st++) {
      const events = [];
      if (c.pop && !popped && sk.state === 'roll' && c.pop(sk)) { events.push({ type: 'pop', load: 1, spd: 4, acc: 4 }); popped = true; }
      if (c.grab && !grabbed && sk.state === 'air' && sk.air && !sk.air.quiet && sk.t - sk.air.t0 > 0.12) { events.push({ type: 'grab', on: true, dir: 90 }); grabbed = true; }
      const wasAir = sk.state === 'air', p0 = sk.p.slice(), v0 = sk.v.slice(), heldIn = !!(sk.air && sk.air.grab), hb = H.before(sk);   // a grab held into this step: the rider's ask at a lock (this wall holds no pad)
      sk._free = null; sk._own = null;
      sk.step(PHYSICS.step, { steer: c.steer ? c.steer(sk) : 0, throttle: 0, events, hold: null, pushTap: false, golden: false });
      { const where = () => c.name + ' at ' + (st * PHYSICS.step).toFixed(2) + ' s (' + (sk.air ? 'the air ' + sk.air.why : sk.state + (sk.catchTurn ? ', the catch' : '')) + ')'; YG.step(sk, where); RD.step(sk, where); if (st % 2 === 1) { YG.frame(sk, where); RD.frame(sk, where); } }
      dropped.step(sk, () => c.name + ' at ' + (st * PHYSICS.step).toFixed(2) + ' s (' + sk.state + ')');
      /* THE BOARD'S HEADING NEVER STEPS ON THE GROUND (tests/lib/heading.mjs) */
      { const h = H.after(hb, sk, PHYSICS.step); if (h && h.ex > yaw.ex) Object.assign(yaw, { ex: h.ex, rate: h.yaw, at: (st * PHYSICS.step).toFixed(2) + ' s (' + hb.state + ', ' + hb.speed.toFixed(1) + ' m/s' + (sk.events.length ? ', ' + sk.events.map((e) => e.type).join(' ') : '') + ')' }); }
      /* (a): how far the board ended from its own free path this step — an air step's the sim's own free end, after its own motion and its
         assists' turns of its path and before any contact (body.js stepAir `_free`: read off gravity alone, a drop-in's turn toward its wall
         and a vert air's drift back over its ramp read as a contact's move) */
      if (sk.events.some((e) => e.type === 'land')) after = 3;
      /* (a rolling step's too: its own free end, before any contact — body.js rollOn `_free` — so a stop at a face, a millimetre short on the
         board's own line, is the wall's (c), not the touchdown's move: read against the velocity the wall left, a scrape right after a landing
         at the Deck Quarter's end read 1.2 cm) */
      /* (and its moves through a contact: a stop at a face and the rest of the step slid along it — body.js rollOn/walls `_own`, each part from
         where the last was stopped on its line — so a board slid along a face ends ON its own path) */
      if ((wasAir && sk._free) || (!wasAir && after > 0)) { if (!wasAir) after--;
        const dt = PHYSICS.step, q1 = sk._free ? sk._free.slice() : [p0[0] + sk.v[0] * dt, p0[1] + sk.v[1] * dt, p0[2] + sk.v[2] * dt];
        const segs = (!wasAir || sk.wallAir) && sk._own && sk._own.length ? sk._own : [[p0, q1]];   // (an air step a wall bent: its own parts too — the air's slide, body.js wallsAir)
        const dist = ([a, b2]) => { const ab = b2.map((x, k) => x - a[k]), L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2, t = L2 > 1e-12 ? Math.max(0, Math.min(1, ((sk.p[0] - a[0]) * ab[0] + (sk.p[1] - a[1]) * ab[1] + (sk.p[2] - a[2]) * ab[2]) / L2)) : 0;
          return Math.hypot(sk.p[0] - a[0] - ab[0] * t, sk.p[1] - a[1] - ab[1] * t, sk.p[2] - a[2] - ab[2] * t); };
        const off = Math.min(...segs.map(dist));
        if (off > own.off) Object.assign(own, { off, at: (st * PHYSICS.step).toFixed(2) + ' s (' + (wasAir ? 'air' : 'rolling') + ' → ' + sk.state + ')' }); }
      for (const e of sk.events) { if (e.type === 'takeoff' && e.why === 'lip') { lipAirs++; lipOpen = true; leftGroup = sk.air && sk.air.lipId != null ? String(sk.air.lipId).split(':')[0] : null; }
        else if (lipOpen && e.type === 'grindStart') { lipOpen = false; if (e.surface === 'coping') { if (e.group !== leftGroup) ends.transfer++; else if (heldIn) ends.asked++; else ends.free.push(c.name + ' (' + e.name + ')'); } }
        else if (lipOpen && (e.type === 'land' || e.type === 'bail')) lipOpen = false; }
      if (sk.state === 'bail' || sk.events.some((e) => e.type === 'bail' || e.type === 'respawn')) break;   // a fall's board flies by itself
      const bi = boardInside(world, sk); if (!bi.depth) continue;
      if (bi.depth > BOARD_IN) all.steps = (all.steps || 0) + 1;
      if (bi.depth > all.depth) Object.assign(all, { depth: bi.depth, at: (st * PHYSICS.step).toFixed(2) + ' s (' + sk.state + ', the ' + bi.wheel + ' wheel in the ' + bi.surf + ')' });
    }
    if (all.depth > ride.depth) Object.assign(ride, all, { name: c.name }); if (all.depth > BOARD_IN) { const item = c.name + ' ' + (all.depth * 100).toFixed(1) + ' cm at ' + all.at + ' [over 1 cm for ' + (all.steps || 0) + ' steps = ' + ((all.steps || 0) / 2).toFixed(1) + ' frames at 60 Hz]'; if ((all.steps || 0) <= NAMED_STEPS && all.depth <= NAMED_UP_TO) named.inside.push(item); else over.push(item); }
    if (own.off > move.off) Object.assign(move, own, { name: c.name }); if (own.off > OWN_MOVE) { const item = c.name + ' ' + (own.off * 100).toFixed(1) + ' cm at ' + own.at, cls = /air → roll\)/.test(own.at) ? 'air → roll' : /air → grind\)/.test(own.at) ? 'air → grind' : null; if (cls && own.off <= NAMED_UP_TO) named[cls].push(item); else moved.push(item); }
    if (yaw.ex > head.ex) Object.assign(head, yaw, { name: c.name }); if (yaw.ex > BOUND.yaw) swung.push(c.name + ' ' + (yaw.ex * 180 / Math.PI).toFixed(0) + '°/s past at ' + yaw.at);
  }
  if (over.length) fail++; if (moved.length) fail++; if (swung.length) fail++;
  for (const [k, list] of Object.entries(named)) if (list.length) console.log('ℹ DEFERRED (the board on ' + P + ', ' + (k === 'inside' ? 'a wheel inside the park' : 'a touchdown\'s own move, ' + k) + '): ' + NAMED[k] + ' — ' + list.length + ' cases over 1 cm and no more than 2 cm: ' + list.slice(0, 4).join('; '));
  console.log('the board on ' + P + ': THE BOARD\'S HEADING NEVER STEPS ON THE GROUND through every case\'s whole ride — ' + swung.length + ' cases with its heading turned in a step past what the steering gives at its speed and the forces turn its travel by, by more than ' + (BOUND.yaw * 180 / Math.PI).toFixed(0) + '°/s: the most ' + (Math.max(0, head.ex) * 180 / Math.PI).toFixed(0) + '°/s (' + (head.name || '-') + (head.at ? ' at ' + head.at : '') + ')' + (swung.length ? '  ✖ — ' + swung.join('; ') : '  ✔'));
  console.log('the board on ' + P + ': THE BOARD NEVER INSIDE THE PARK through every case\'s whole ride (10 s, nobody steering) — ' + over.length + ' of ' + (AIRS.length + BAILS.length) + ' cases with a wheel over ' + BOARD_IN * 100 + ' cm into a solid, the deepest ' + (ride.depth * 100).toFixed(1) + ' cm' + (ride.at ? ' (' + ride.name + ' at ' + ride.at + ')' : '') + (over.length ? '  ✖ — ' + over.slice(0, 6).join('; ') : '  ✔'));
  { const [line, contact, catches] = YG.say(), good = YG.ok(); if (!good) fail++; console.log('the board on ' + P + ': ' + line + (good ? '  ✔' : '  ✖')); console.log(contact.replace('— reported', '— reported (the board on ' + P + ')')); console.log(catches.replace('— reported', '— reported (the board on ' + P + ')')); for (const l of RD.lines('the board on ' + P, airsBase('camera')[pre])) console.log(l); { const g = RD.gate('the board on ' + P); if (!g.ok) fail++; console.log((g.ok ? '✔ ' : '✖ ') + g.line); } }
  console.log(dropped.say('the board on ' + P + ', ' + (AIRS.length + BAILS.length) + ' rides'));
  console.log('the board on ' + P + ': A TOUCHDOWN\'S OWN MOVE — every air step and the three rolling steps after a landing end within ' + OWN_MOVE * 100 + ' cm of the board\'s own free path: ' + moved.length + ' cases over, the most ' + (move.off * 100).toFixed(1) + ' cm' + (move.at ? ' (' + move.name + ' at ' + move.at + ')' : '') + (moved.length ? '  ✖ — ' + moved.slice(0, 6).join('; ') : '  ✔'));
  /* the coping an air left catches it only if the rider asks or the trucks come down ON it (body.js leftCoping; its own wall:
     coping_capture.mjs) — here on this wall's own airs: with nothing held, none; a grab held into the lock is an ask, and a transfer onto
     another coping keeps the assist's radius */
  if (ends.free.length) fail++;
  console.log('THE COPING AN AIR LEFT TAKES ONLY WHAT IS ASKED, on ' + P + ' (every case\'s whole ride): of ' + lipAirs + ' lip airs, ' + ends.free.length + ' with nothing held end grinding the coping they left (none)' + (ends.free.length ? '  ✖ — ' + ends.free.slice(0, 6).join('; ') : '  ✔') + ' · said: ' + ends.asked + ' lock onto it with a grab held, ' + ends.transfer + ' onto another coping (a transfer)');
}
airsRecord('camera', Object.fromEntries(Object.entries(AR).map(([k, v]) => [k, v.summary()])));
console.log((plant ? 'plant ' + plant + ' · ' : '') + (fail ? 'CAMERA MOVING: RED' : 'CAMERA MOVING: GREEN')); process.exit(fail ? 1 : 0);
