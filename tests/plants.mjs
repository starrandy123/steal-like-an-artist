/* EVERY PLANT, ON THE INSTRUMENT AS IT SHIPS (the supervisor's rule, round 9: a plant's verdict from an older instrument is stale — the builder
 * once reported a hash "sound, 15 of 15" from logs run before the wall's spectrum existed, and the wall as shipped turns the same hash RED).
 * Each plant is a defect the game once had, or one a wall exists to keep out: its edit, the instrument that must catch it, and the line that
 * proves the catch is THIS defect (a planted copy that fails for another reason proves nothing). Every round rebuilds each planted copy fresh
 * from the tree as it stands (build/ and tests/), runs the instrument as it stands, and requires: the edit still applies (else the plant is
 * STALE — the code moved and the plant must be rewritten, never dropped), the instrument says RED, and the catch line is there.
 *   node tests/plants.mjs list
 *   node tests/plants.mjs check                     (every edit still applies? in memory, a second)
 *   node tests/plants.mjs run <out dir> [name…]      (in a round: runs/<round>/plants; the browser ones hold the GPU — run under heavy.sh) */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const W = join(dirname(fileURLToPath(import.meta.url)), '..'), KIT = join(process.env.HOME, 'Documents/ports_src/_kit');
/* the tree the plants are made from: this one, or a frozen copy (PLANTS_SRC) when the work goes on beside the run */
const SRC = process.env.PLANTS_SRC || W;
const R = (p) => 'build/js/' + p;
/* an edit: { file, old, new } (old exactly once; all: true for every occurrence, at least one), or { file, from, to, new } (the text from the
   marker `from` up to the marker `to` replaced) */
export const PLANTS = [
  /* the sim and the camera: Node walls */
  { name: 'support_one_face', why: 'the seat as it was before ruling 2: solved once where the wheels stood before it turned the board (no second reading where they are), and two contacts seated on the mean of their two faces\' normals', edits: [{ file: R('sim/body.js'), from: '    if (!hold && !plane && n === 2) {', to: '    /* a convex bend faster than gravity', new: '' }, { file: R('sim/body.js'), from: '    if (!this._reseat && Math.acos(V.clamp(V.dot(this.up, up0), -1, 1)) > 0.5 * DEG) {', to: '    return \'ok\';\n  }\n  /* THE COPING THE BOARD IS ROLLING OVER', new: '' }],
    test: 'support.mjs', catches: /✖ THE BOARD IS SUPPORTED ACROSS EVERY EDGE OF THE PARK/ },
  { name: 'lip_old_centroid_snap', why: 'the board snapped to its wheels\' centroid: a slanted line into a quarter stayed under the lip', edits: [{ file: R('sim/body.js'),
      old: '    const o = hold ? hold.o : plane ? sup.o : [sx / n, sy / n, sz / n], ox = this.p[0] - o[0], oy = this.p[1] - o[1], oz = this.p[2] - o[2];\n    let off = ox * newUp[0] + oy * newUp[1] + oz * newUp[2];',
      new: '    V.set(this.p, sx / n, sy / n, sz / n); let off = 0;' }], test: 'support.mjs', catches: /✖ THE BOARD IS SUPPORTED ACROSS EVERY EDGE OF THE PARK/ },   /* (10-17: since r22 the lip is read before the seat, so handling's lip run no longer reaches the snap; the support sweep reads its class: a truck under a lip from a seat read off the wrong face) */
  { name: 'lip_no_lift', why: 'a wheel that began an air step inside a solid was not brought out (wheelsOut, the class of the trailing truck through the lip: from a lip seat the front pair began 0.5 cm in the deck, and the board levelling in the air carried them 31 cm down through it unseen)', edits: [{ file: R('sim/body.js'), old: '  wheelsOut() {\n', new: '  wheelsOut() { return;\n' }],
    test: 'camera_moving.mjs', catches: /THE BOARD NEVER INSIDE THE PARK[^\n]*✖/ },
  { name: 'fall_sinks', why: 'a fallen body was not lifted out of the ground (her foot under the slab in every fall)', edits: [{ file: R('view/figure.js'), old: '    if (lift > 0) { rig.position.y += lift; rig.updateMatrixWorld(true); }', new: '    void lift;' }],
    test: 'camera_moving.mjs', catches: /INSIDE the park's surfaces \(a body clipping\)\s+✖/ },
  { name: 'held_grab_counts_nothing', why: 'the combo box said a held grab as "0 × 0"', edits: [{ file: R('sim/score.js'), old: "    if (grab) { names.push(grab.name + '…'); pending += grabBase(grab.name) + grabExtra((sk.t || 0) - grab.t0); more++; }", new: "    if (grab) { names.push(grab.name + '…'); }" }],
    test: 'tricks_reachable.mjs', catches: /✖ the combo box over/ },
  { name: 'lens_outside_fence', why: 'the camera stood outside the fence to keep her in view (two guards hold it in: the lens\'s own clamps and the fence in the sight rule\'s mesh — both out)', edits: [
      { file: R('sim/park.js'), old: "[x0, gy + F.h, z0]], n, null, null, true);", new: "[x0, gy + F.h, z0]], n, null, null, false);" },
      { file: R('view/sightline.js'), old: '  const clear = (c) => inWorld(c) && sight(c) && over(c) < 1.4;', new: '  const clear = (c) => sight(c) && over(c) < 1.4;' },
      { file: R('view/sightline.js'), old: '  for (const sw of order) { const c = at(sw); if (inWorld(c) && sight(c)) return', new: '  for (const sw of order) { const c = at(sw); if (sight(c)) return' },
      { file: R('view/sightline.js'), old: '  const t = Math.min(firstHit(world, occ, look, c), worldReach(look, u) + 0.3),', new: '  const t = Math.min(firstHit(world, occ, look, c), Infinity),' },
      { file: R('view/camera.js'), old: ', worldReach(mid, [W.x, W.y, W.z]) + 0.3)', new: ', Infinity)' }],
    test: 'camera_moving.mjs', catches: /[1-9]\d* with the lens outside the fence/ },
  { name: 'pull_no_ceiling', why: 'the pull-in had no ceiling: one frame threw the lens 51 m away and 18 m up', edits: [{ file: R('view/sightline.js'), old: 'k = Math.min(1, Math.max(0.25, (t - 0.3) / L));', new: 'k = Math.max(0.25, (t - 0.3) / L);' }],
    test: 'camera_view.mjs', catches: /✖ the pull-in/ },
  { name: 'slot_levels_short', why: 'the raised levels stopped at the park\'s edge, leaving a slot before the fence', edits: [{ file: R('sim/park.js'), old: '    let rects = [g.y > 0 ? toFence(g.rect) : g.rect];', new: '    let rects = [g.rect];' }],
    test: 'park.mjs', catches: /✖.*slot/ },
  { name: 'coping_left_by_radius', why: 'the owner\'s third: the coping an air LEFT caught anywhere within the assist\'s radius (0.45–0.63 m), so slanted bowl airs ended grinding it unasked', edits: [{ file: R('sim/body.js'),
      old: "      if (this.leftCoping(r) && !this.onLeftCoping(horiz, ab)) continue;", new: '' }, { file: R('sim/body.js'),
      old: "      if (this.leftCoping(r) && !this.onLeftCoping(Math.hypot(P[0] - q2[0], P[2] - q2[2]), ab)) continue;", new: '' }],
    test: 'coping_capture.mjs', catches: /✖ THE COPING AN AIR LEFT TAKES ONLY WHAT IS ASKED/ },
  { name: 'coping_rule_on_every_coping', why: 'the left coping\'s rule held on every coping: a transfer, and an ollie onto a coping from its deck, lose the assist\'s radius (and the Coping Run with them)', edits: [{ file: R('sim/body.js'),
      old: "  leftCoping(r) { const air = this.air; return !!(air && air.lipId && r.kind === 'coping' && r.group === String(air.lipId).split(':')[0]); }", new: "  leftCoping(r) { return r.kind === 'coping'; }" }],
    test: 'coping_capture.mjs', catches: /✖ A COPING THE AIR DID NOT LEAVE KEEPS THE ASSIST'S RADIUS/ },
  { name: 'coping_ask_not_heard', why: 'the rider\'s ask never heard: the coping an air left could not be grinded from the air at all', edits: [{ file: R('sim/body.js'),
      old: "  asksToGrind() { const h = this.hold; return !!((h && Math.max(Math.abs(h.x), Math.abs(h.y)) > 0.35) || (this.air && this.air.grab)); }", new: "  asksToGrind() { return false; }" }],
    test: 'coping_capture.mjs', catches: /✖ A GRIND ON IT WHEN ASKED/ },
  { name: 'coping_ask_pad_only', why: 'only the pad\'s held direction heard: a keyboard (G held) could never ask for the coping an air left', edits: [{ file: R('sim/body.js'),
      old: "  asksToGrind() { const h = this.hold; return !!((h && Math.max(Math.abs(h.x), Math.abs(h.y)) > 0.35) || (this.air && this.air.grab)); }", new: "  asksToGrind() { const h = this.hold; return !!(h && Math.max(Math.abs(h.x), Math.abs(h.y)) > 0.35); }" }],
    test: 'coping_capture.mjs', catches: /✖ A GRIND ON IT WHEN ASKED[^\n]*0\/58 with G/ },
  { name: 'heading_turn_off', why: 'the landing yaw assist off: the vert assist bends a slanted air\'s path and the board keeps pointing up the wall (22 / 20 landing bails on Cruise / Classic)', edits: [{ file: R('sim/body.js'),
      old: "    this.headToLanding((bent || A.spin > 0) && land && !railUp && this.v[1] < 0 && Math.abs(input.steer || 0) < 0.05 && Math.abs(this.spinRate) < 0.5 ? land : null, bent ? A.vert / 100 : 0, dt, A.spin);", new: '' }],
    test: 'coping_capture.mjs', catches: /✖ A SLANTED AIR LANDS ON ITS LINE/ },
  { name: 'heading_snaps', why: 'the landing yaw assist turned in one step to its aim, not on its critically damped spring: a step in the heading\'s turn', edits: [{ file: R('sim/body.js'),
      old: "    const turn = h.u + aim; air.headW = h.ud;", new: "    const turn = aim; air.headW = aim / dt;" }],
    test: 'surfaces.mjs', args: ['East Wall coping'], catches: /✖ THE CHAIN IS QUIET[^\n]*heading turning in the air/ },
  { name: 'coping_left_by_radius_in_rides', why: 'the same, read on the camera wall\'s whole rides (every case, ten seconds, a grab held on the fast airs)', edits: [{ file: R('sim/body.js'),
      old: "      if (this.leftCoping(r) && !this.onLeftCoping(horiz, ab)) continue;", new: '' }, { file: R('sim/body.js'),
      old: "      if (this.leftCoping(r) && !this.onLeftCoping(Math.hypot(P[0] - q2[0], P[2] - q2[2]), ab)) continue;", new: '' }],
    test: 'camera_moving.mjs', catches: /THE COPING AN AIR LEFT TAKES ONLY WHAT IS ASKED[^\n]*✖/ },
  { name: 'vendored_three_edited', why: 'a vendored three.js file changed by a byte (the glTF loader\'s magic): no longer npm\'s, and nothing would have said so', edits: [{ file: 'build/vendor/three/examples/jsm/loaders/GLTFLoader.js',
      old: "const BINARY_EXTENSION_HEADER_MAGIC = 'glTF';", new: "const BINARY_EXTENSION_HEADER_MAGIC = 'glTf';" }],
    test: 'vendor_three.mjs', catches: /✖ examples\/jsm\/loaders\/GLTFLoader\.js: npm's three@0\.183\.1[^\n]*DIFFERS from npm/ },
  { name: 'park_two_on_one_spot', why: 'a ledge set in the Basin (the modding guide\'s first worked example, 10-16): built, and nothing said so — the builder\'s comment promised "no two on one spot" and only held the park\'s edge', edits: [{ file: R('parks/plaza.js'),
      old: "    { id: 'redCurb', type: 'ledge', name: 'Red Curb', rect: [24, 2.6, 54, 3.0], h: 0.15, top: 'curb' },",
      new: "    { id: 'redCurb', type: 'ledge', name: 'Red Curb', rect: [24, 2.6, 54, 3.0], h: 0.15, top: 'curb' },\n    { id: 'plazaLedge', type: 'ledge', name: 'Plaza Ledge', rect: [14, 12.0, 20, 12.5], h: 0.38, top: 'granite', wax: true }," }],
    test: 'park.mjs', catches: /✖ the park's own checks[^\n]*The Basin and Plaza Ledge on one spot/ },
  { name: 'park_row_leaves', why: 'a row past the fence: the builder named it in the console, and the park\'s wall printed it in its header and stayed green', edits: [{ file: R('parks/plaza.js'),
      old: "    { id: 'redCurb', type: 'ledge', name: 'Red Curb', rect: [24, 2.6, 54, 3.0], h: 0.15, top: 'curb' },",
      new: "    { id: 'redCurb', type: 'ledge', name: 'Red Curb', rect: [24, 2.6, 54, 3.0], h: 0.15, top: 'curb' },\n    { id: 'outLedge', type: 'ledge', name: 'Out Ledge', rect: [60, 40, 64, 40.5], h: 0.3, top: 'slab' }," }],
    test: 'park.mjs', catches: /✖ the park's own checks[^\n]*Out Ledge leaves the park/ },
  { name: 'slot_quarter_short', why: 'the Deck Quarter stopped 0.3 m short of the fence', edits: [{ file: R('sim/park.js'), old: 'const [a, b] = e.coping.map(([x, z]) => [x <= 0 ? F.x0 : x >= park.size[0] ? F.x1 : x, z <= 0 ? F.z0 : z >= park.size[1] ? F.z1 : z]); quarter(e, e.face, e.base, a, b);', new: 'const [a, b] = e.coping; quarter(e, e.face, e.base, a, b);' }],
    test: 'park.mjs', catches: /✖.*slot/ },
  { name: 'parse_backtick', why: 'a backtick in a GLSL comment closed its template string; node --check passed it and the page never booted', edits: [{ file: R('view/surfaces.js'), old: 'lanes and wax: lane) */', new: 'lanes and wax, `lane`) */' }],
    test: 'parse.mjs', catches: /✖ view\/surfaces\.js/ },
  { name: 'parse_classic_script', why: "a credits line in port.js (a classic script the page loads beside its modules) put a straight apostrophe in a single-quoted string; the page's boot broke and parse.mjs, walking build/js only, never read it", edits: [{ file: 'build/port.js', old: 'but for Kiln Yard\u2019s buildings and props', new: "but for Kiln Yard's buildings and props" }],
    test: 'parse.mjs', catches: /✖ port\.js \(a classic script the page loads\)/ },
  { name: 'hash_sin_spelled', why: 'a shader hash on sin() (the grep tripwire)', edits: [{ file: R('view/surfaces.js'), old: '   float worn = max(path, gate) * (0.55 + 0.45 * wlHash(floor(wp * 3.0)));', new: '   float worn = max(path, gate) * (0.55 + 0.45 * fract(sin(dot(floor(wp * 3.0), vec2(12.9898, 78.233))) * 43758.5453));' }],
    test: 'hash.mjs', catches: /✖ shader hashes on sin\(\)/ },
  /* what is drawn: the browser */
  { name: 'lamp_inside_unknown', why: 'a lamp inside the park the sight rule does not know (the lamps stand outside the fence today: one is moved in, its occluder taken out)', edits: [
      { file: R('parks/plaza.js'), old: 'lamps: [[-1.2, 18.5, 0],', new: 'lamps: [[6, 18.5, 0],' },
      { file: R('view/sightline.js'), old: "  for (const [x, z] of park.lamps) out.push({ kind: 'cyl', x, z, r: 0.16, y0: 0, y1: 6.3 });", new: '' }],
    drive: ['census.mjs', '390x844'], catches: /NOT KNOWN: .*lamp/ },
  { name: 'census_trees', why: 'the trees unknown to the sight rule', edits: [{ file: R('view/sightline.js'), old: '  for (const o of greenery(trees, world ? world.props.shrubs : [])) out.push(o);', new: '  for (const o of greenery([], world ? world.props.shrubs : [])) out.push(o);' }],
    drive: ['census.mjs', '390x844'], catches: /NOT KNOWN: .*trees/ },
  { name: 'census_shrubs', why: 'the shrubs unknown to the sight rule', edits: [{ file: R('view/sightline.js'), old: '  for (const o of greenery(trees, world ? world.props.shrubs : [])) out.push(o);', new: '  for (const o of greenery(trees, [])) out.push(o);' }],
    drive: ['census.mjs', '390x844'], catches: /NOT KNOWN: .*shrubs/ },
  { name: 'census_rails', why: 'the rails unknown to the sight rule', edits: [{ file: R('view/sightline.js'), old: "  if (world) for (const r of world.rails) if (r.kind === 'rail') {", new: "  if (world) for (const r of world.rails) if (r.kind === 'rail' && false) {" }],
    drive: ['census.mjs', '390x844'], catches: /NOT KNOWN: .*rail/ },
  { name: 'sun_by_angle', why: 'the sun\'s disc measured by angle, drawn as an ellipse off the axis', edits: [{ file: R('view/stage.js'), old: 'u.sunPx.value.set((p.x * 0.5 + 0.5) * sz.x, (p.y * 0.5 + 0.5) * sz.y, front ? 1 : 0, r); }', new: 'u.sunPx.value.set((p.x * 0.5 + 0.5) * sz.x, (p.y * 0.5 + 0.5) * sz.y, 0, r); }' }],
    drive: ['sun.mjs', '844x390'], catches: /off the axis: .*width\/height (?:1\.[1-9]|0\.[0-8])/ },
  { name: 'marks_off', why: 'the park\'s marks switched off (a floor of plastic)', edits: [{ file: R('view/parkview.js'), old: 'marks: true', new: 'marks: false', all: true }],
    drive: ['floor.mjs', '390x844'], catches: /✖ W1/ },
  { name: 'marks_faint', why: 'the marks at a tenth of their strength', edits: [{ file: R('view/surfaces.js'), old: 'vec2 mk = wlMarks(vWorldPos, wlPolish) * up * near * uMarks;', new: 'vec2 mk = wlMarks(vWorldPos, wlPolish) * up * near * uMarks * 0.1;' }],
    drive: ['floor.mjs', '390x844'], catches: /✖ W1/ },
  ...[['hash_disguised_sine', 'the supervisor\'s sine hash, spelled past the grep', 'float s = sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453; return fract(s);', /✖ spectrum/],
      ['hash_first_sine', 'the builder\'s first hash (a sine)', 'return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);', /✖ spectrum/],
      ['hash_sawtooth', 'a sawtooth: a fraction of a line across the plane', 'return fract(dot(p, vec2(0.6180339, 0.3819660)));', /✖ .*ties/],
      ['hash_four_levels', 'a sound hash cut to four levels', 'vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return floor(fract((p3.x + p3.y) * p3.z) * 4.0) / 4.0;', /✖ .*buckets within (?:[3-9]|\d\d)/]]
    .map(([name, why, body, catches]) => ({ name, why, edits: [{ file: R('view/surfaces.js'), old: "export const WLHASH = 'float wlHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }';", new: "export const WLHASH = 'float wlHash(vec2 p) { " + body + " }';" }],
      drive: ['hashes.mjs', '390x844'], catches })),
  { name: 'sound_old_mix', why: 'the mix before S1: one roll for every surface, joints under it', edits: [
      { file: R('config.js'), from: '  /* the grit sits above 5 kHz on every surface', to: '  /* the seams:', new: '  roll: {\n    slab: { body: [430, 0.7, 0.32], grit: [4800, 1.0, 0.035], boom: null },\n    pavers: { body: [760, 1.1, 0.26], grit: [3600, 0.8, 0.16], boom: null },\n    deck: { body: [480, 0.8, 0.26], grit: [4400, 1.0, 0.04], boom: [150, 5, 0.22] },\n    ramp: { body: [360, 0.8, 0.30], grit: [5200, 1.0, 0.025], boom: null },\n    granite: { body: [1150, 1.5, 0.22], grit: [5600, 1.0, 0.09], boom: null },\n    curb: { body: [470, 0.7, 0.30], grit: [4600, 1.0, 0.05], boom: null },\n    grass: { body: [260, 0.6, 0.07], grit: [2000, 0.6, 0.02], boom: null },\n    asphalt: { body: [620, 0.6, 0.28], grit: [2900, 0.6, 0.2], boom: null },\n  },\n' },
      { file: R('config.js'), old: '  clack: { band: 2400, q: 2.2, peak: 1.3, decay: 0.014, thud: 0.28 },', new: '  clack: { band: 2400, q: 2.2, peak: 0.55, decay: 0.014, thud: 0.28 },' }],
    sound: true, catches: /✖/ },
  /* her shoes: Node walls on the form the mesh is made of (tests/sculpt.mjs) */
  { name: 'jacket_hem_through', why: 'the jacket\'s hem no wider than the cargos\' waist: their meeting was the ragged hem (round 11)', edits: [{ file: R('view/sculpt.js'), old: '      j -= 0.012 * sstep(1.06, 0.985, y);', new: '' }], test: 'sculpt.mjs', catches: /✖ the jacket's hem stands/ },
  { name: 'laces_floating', why: 'the laces laid 1.5 mm over their rest (the supervisor\'s float, round 11)', edits: [{ file: R('view/sculpt.js'), old: 'k = (LACE_R + 0.0003 + lift) / l;', new: 'k = (LACE_R + 0.0018 + lift) / l;' }], test: 'sculpt.mjs', catches: /✖ the laces: .*lifted off \(/ },
  { name: 'laces_buried', why: 'the laces laid 1.5 mm into their rest (the placement and the push out of the creases, both)', edits: [{ file: R('view/sculpt.js'), old: 'k = (LACE_R + 0.0003 + lift) / l;', new: 'k = (LACE_R - 0.0012 + lift) / l;' }, { file: R('view/sculpt.js'), old: 'want = LACE_R + 0.0003 + lift;', new: 'want = LACE_R - 0.0012 + lift;' }], test: 'sculpt.mjs', catches: /✖ the laces: .* sunk \(/ },
  { name: 'shoe_no_tongue', why: 'a shoe with no tongue', edits: [{ file: R('view/sculpt.js'), old: '    u = smin(u, ellip(X, yr, zr, [0, 0, 0], [0.021, 0.03, 0.006]), 0.006);', new: '' }], test: 'sculpt.mjs', catches: /✖ the collar stands .*the tongue stands/ },
  { name: 'shoe_pill_sole', why: 'the old sole: a rounded pill with no wall, no lip and no bumper', edits: [{ file: R('view/sculpt.js'), from: '  const sole = (x, y, z) => {', to: '  return { cx, cz, upper, sole, wid };', new: '  const sole = (x, y, z) => rbox(x, y, z, [cx, 0.017, cz], [0.0475, 0.017, 0.143], 0.014);\n' }], test: 'sculpt.mjs', catches: /✖ the sole: / },
  { name: 'sound_unseeded', why: 'the offline render drew its noise from Math.random: the same build, different bytes, the measure drifting 2 dB', edits: [{ file: R('audio/audio.js'), old: 'makeVoices(ctx, out, rnd), R = SOUND.roll[surface]', new: 'makeVoices(ctx, out), R = SOUND.roll[surface]' }],
    drive: ['sound.mjs', '390x844'], catches: /✖ the pavers rendered twice/ },
  /* the cloth: the browser */
  { name: 'cloth_never_fades', why: 'the weave, the stitches and the folds drawn at every distance (a pattern finer than its pixels crawls as the lens moves)', edits: [
      { file: R('view/cloth.js'), old: 'float cl_fade(float period) { return 1.0 - cl_ss(0.25 * period, 0.5 * period, cl_px); }', new: 'float cl_fade(float period) { return 1.0; }' },
      { file: R('view/cloth.js'), old: 'float cl_wfade(float period) { return 1.0 - cl_ss(0.125 * period, 0.25 * period, cl_px); }', new: 'float cl_wfade(float period) { return 1.0; }' },
      { file: R('view/cloth.js'), old: 'float w = sin(6.2832 * phase) * amp * env * (1.0 - cl_ss(period / 16.0, period / 10.0, cl_px));', new: 'float w = sin(6.2832 * phase) * amp * env;' }],
    drive: ['cloth.mjs', '390x844'], catches: /✖ (far|crown|shoe_top) \(/ },
  { name: 'cloth_smooth', why: 'the clothes smooth plastic again: the cloth\'s detail never drawn', edits: [{ file: R('view/skater.js'), old: ".replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\\n' + clothMain);", new: ";" }],
    drive: ['cloth.mjs', '390x844'], catches: /✖ close, / },
  { name: 'cloth_breaks_toon', why: 'the cloth set a roughness the painted look\'s toon shader does not have: her shader failed to compile there', edits: [{ file: R('view/cloth.js'), old: '      #ifdef STANDARD\n      /* the cloth', new: '      /* the cloth' }, { file: R('view/cloth.js'), old: '      #endif\n      diffuseColor.rgb = mix(diffuseColor.rgb * mix', new: '      diffuseColor.rgb = mix(diffuseColor.rgb * mix' }],
    drive: ['cloth.mjs', '390x844'], catches: /✖ the painted look draws her/ },
  { name: 'ribs_fade_at_a_reference', why: 'ribs round an axis faded by their spacing at one radius: toward the axis they crowd into a star of moiré (the sock\'s top, the beanie\'s crown)', /* the one radius past every rib (the beanie's brim is 0.09 m): every rib kept whole by it, so toward the axis they crowd unfaded. At 0.05 (its
       radius when ribs were whole at two pixels a rib) it planted the opposite, round 15: since the ribs fade at fourteen pixels to seven, 0.05
       faded every rib of the crown and planted no star at all */
    edits: [{ file: R('view/cloth.js'), old: '  float perPx = cl_px * N / (6.2831853 * max(r, 1e-5));', new: '  float perPx = cl_px * N / (6.2831853 * 0.15);' }],
    drive: ['cloth.mjs', '390x844'], catches: /✖ (crown|shoe_top) \(/ },
  { name: 'fade_octave_late', why: 'the supervisor\'s: every detail kept until a period spans two pixels (cl_fade 0.25/0.5 → 0.5/1.0; and the weaves\' own fade with it, since they have one)', edits: [{ file: R('view/cloth.js'), old: 'float cl_fade(float period) { return 1.0 - cl_ss(0.25 * period, 0.5 * period, cl_px); }', new: 'float cl_fade(float period) { return 1.0 - cl_ss(0.5 * period, 1.0 * period, cl_px); }' },
      { file: R('view/cloth.js'), old: 'float cl_wfade(float period) { return 1.0 - cl_ss(0.125 * period, 0.25 * period, cl_px); }', new: 'float cl_wfade(float period) { return 1.0 - cl_ss(0.5 * period, 1.0 * period, cl_px); }' },
      /* and the ribs' own window with them (since round 14 the ribs fade by their own spacing, not by cl_fade: left out, the plant no longer
         reached the crown it was caught on — round 15, ×5 the crawl but 1.2 levels) */
      { file: R('view/cloth.js'), old: '(1.0 - cl_ss(0.07, 0.14, perPx));', new: '(1.0 - cl_ss(0.25, 0.5, perPx));' }],
    drive: ['cloth.mjs', '390x844'], catches: /✖ (far|crown|shoe_top) \(/ },
  { name: 'fold_window_fine', why: 'the supervisor\'s: folds kept until their wave spans three pixels (the window /16,/10 → /5,/3)', edits: [{ file: R('view/cloth.js'), old: '(1.0 - cl_ss(period / 16.0, period / 10.0, cl_px))', new: '(1.0 - cl_ss(period / 5.0, period / 3.0, cl_px))' }],
    drive: ['cloth.mjs', '390x844'], catches: /✖ (far|crown|shoe_top) \(/ },
  { name: 'self_shadow_speckle', why: 'her own shadow read at her skin with the stage\'s small bias: a fine grid of self-shadow on her lit side', edits: [{ file: R('view/skater.js'), old: 'liftU = { value: 1.5 * (SH.camera.right - SH.camera.left) / SH.mapSize.x }, depthU = { value: 0.08 / (SH.camera.far - SH.camera.near) };', new: 'liftU = { value: 0 }, depthU = { value: 0 };' }],
    drive: ['kit.mjs', '844x390'], catches: /✖ HER OWN SHADOW/ },
  /* THE FACE (the owner, 10-16: "the guy is flat", "the face is lob sided"): the Node wall reads the forms and the mirror, the page's the rest */
  { name: 'face_socket_rim_hard', why: 'the supervisor\'s V11 list: the socket carved with a 4 mm blend, as V10 — a hard oval rim round each eye, the mask', edits: [{ file: R('view/sculpt.js'), old: 'h = smax(h, -socket(x, y, z), 0.012);', new: 'h = smax(h, -socket(x, y, z), 0.004);' }],
    test: 'face.mjs', catches: /✖ the socket blends into the brow and the cheek/ },
  { name: 'face_ear_no_helix', why: 'the supervisor\'s V11 list: an ear with no rolled rim — a plate with a dish, the knob of V10', edits: [{ file: R('view/sculpt.js'), old: '    e = smin(e, chain(u, v, w, HELIX, 0.0028, 0.0034), 0.0035);', new: '' }],
    test: 'face.mjs', catches: /✖ the ear is an ear/ },
  { name: 'face_ear_shallow_bowl', why: 'the concha as shallow as V10\'s dish', edits: [{ file: R('view/sculpt.js'), old: 'e = smax(e, -ellip(u, v, w, [0.002, -0.004, 0.0032], [0.0075, 0.010, 0.0042]), 0.0015);', new: 'e = smax(e, -ellip(u, v, w, [0.002, -0.004, 0.0062], [0.0075, 0.010, 0.0042]), 0.0015);' }],
    test: 'face.mjs', catches: /✖ the ear is an ear/ },
  { name: 'face_ear_no_lobe', why: 'an ear with no lobe: its bottom the thin plate', edits: [{ file: R('view/sculpt.js'), old: '    e = smin(e, ellip(u, v, w, [-0.004, -0.0245, 0.001], [0.0085, 0.0085, 0.0042]), 0.004);', new: '' }],
    test: 'face.mjs', catches: /✖ the ear is an ear/ },
  { name: 'face_glabella_v', why: 'the paired features read by |x| itself: the brow ridges meet in a V between the brows (24°/mm)', edits: [{ file: R('view/sculpt.js'), old: 'const pair = (fn) => (x, y, z) => fn(Math.sqrt(x * x + 1.6e-5), y, z);', new: 'const pair = (fn) => (x, y, z) => fn(Math.abs(x), y, z);' }],
    test: 'face.mjs', catches: /✖ the midline is smooth/ },
  { name: 'nets_one_vertex_a_cell', why: 'surface nets as built to V11: one vertex for a cell whatever crosses it (the jacket, the hair and the shoes pinched on every build since V9)', edits: [{ file: R('view/sculpt.js'), old: '    corners(i, j, k); if (stale[q]) sheets(i, j, k); else for (let e = 0; e < 12; e++) par[e] = kept[q * 12 + e];', new: '    corners(i, j, k); if (stale[q]) sheets(i, j, k); else for (let e = 0; e < 12; e++) par[e] = kept[q * 12 + e]; for (let e = 1; e < 12; e++) join(0, e);' }],
    test: 'sculpt.mjs', catches: /✖ every drawn piece whole at LOD 0: [\s\S]*?not: [^\n]*jacket[^\n]*hair[^\n]*shoeL/ },
  { name: 'nets_saddles_unsettled', why: 'a sheet each, but every saddle read by its centre: a sheet that touches a face twice pinches (the jacket\'s collar, the shoes)', edits: [{ file: R('view/sculpt.js'), old: '      if (turned.has(key)) turned.delete(key); else turned.add(key);', new: '' }],
    test: 'sculpt.mjs', catches: /✖ the mesher keeps each sheet its own: a ring 9 mm thick[^\n]*?, [1-9]\d* edges on three/ },
  { name: 'shoe_sock_hard_union', why: 'the sock on a hard union with the collar that hugs it: a crevice narrowing to nothing, specks of air at the grid the shoe is drawn on', edits: [{ file: R('view/sculpt.js'), old: 'SOCK.r - 0.002), 0.006);', new: 'SOCK.r - 0.002), 0.0000001);' }],
    test: 'sculpt.mjs', catches: /✖ every drawn piece whole at LOD 0: [\s\S]*?not: [^\n]*shoe[LR] \(2 pieces/ },
  { name: 'pieces_bridge_tunnel', why: 'the nose\'s bridge on the nose\'s one tight join, read by the wall that reads every piece', edits: [{ file: R('view/sculpt.js'), old: '      h = smin(h, bridge, 0.014);', new: '' }],
    test: 'sculpt.mjs', catches: /✖ no hole through any drawn piece at LOD 0: [^\n]*holed: [^\n]*head \(1 piece, V − E \+ F 0/ },
  { name: 'shoe_collar_closed_ring', why: 'the shoe\'s collar a closed ring, its front arc 5 mm before the tongue: a slot under the shoe\'s grid, bridged into a tunnel', edits: [{ file: R('view/sculpt.js'), old: 'an = near < 0.75 ? Math.PI / 2 + (off < 0 ? -0.75 : 0.75) : an0, yc = yc0 - 0.011 * sstep(1.35, 0.75, near);', new: 'an = an0, yc = yc0;' }],
    test: 'sculpt.mjs', catches: /✖ no hole through any drawn piece at LOD 0: [^\n]*holed: [^\n]*shoeL \(1 piece, V − E \+ F 0/ },
  { name: 'head_two_necks', why: 'the neck cone blended inside head() as well as round the dropped head: the throat swelled 7.8 mm (the bag under the chin)', edits: [{ file: R('view/sculpt.js'), old: '    return h;   // the neck is the piece\'s own (headDropped)', new: '    return smin(h, cone(x, y, z, [0, 1.40, -0.006], [0, 1.57, 0.008], 0.06, 0.056), 0.03);   // the neck is the piece\'s own (headDropped)' }],
    test: 'sculpt.mjs', catches: /✖ no shape built twice: [^\n]*cone\(\[0,1\.40,-0\.006\],\[0,1\.57,0\.008\],0\.06,0\.056\) ×2/ },
  { name: 'jacket_collar_sized_for_two_necks', why: 'the collar\'s inside at 61 mm, as sized round the swollen neck: a 2–6 mm slit round the one neck', edits: [{ file: R('view/sculpt.js'), old: '[0, 1.62, 0.008], 0.056), 0.004);   // its inside hugs the neck', new: '[0, 1.62, 0.008], 0.061), 0.004);   // its inside hugs the neck' }],
    test: 'sculpt.mjs', catches: /✖ the collar meets the neck: at most [2-9]\.\d mm/ },
  { name: 'look_flips_in_a_frame', starts: 'pose', why: 'the supervisor\'s T1: the head\'s look set straight to its line, so at the top of a quarter it whips 120° in a frame (4,650°/s)', edits: [{ file: R('view/skater.js'), old: '    const look = chase(LOOK_P, st.lookS, aim, dt), chestYaw', new: '    const look = aim, chestYaw' }],
    test: 'surfaces.mjs', catches: /✖ no joint turns faster than 1500°\/s: at most (?:[2-9]\d{3}|\d{5,})°\/s [^\n]*head at [^\n]*fakie/ },
  { name: 'grind_caught_in_the_window', starts: 'sim', why: 'the supervisor\'s G1: a rail caught anywhere in the window (38 cm above, 62 cm aside) and put on it at once: a 54 cm jump', edits: [
      { file: R('sim/body.js'), old: '    if (above > 0) { if (this.v[1] <= 0) this.steerToRail(best, above, dt); return false; }\n', new: '' },
      { file: R('config.js'), old: 'contact: 0.03, steerTau: 0.04, catchT: 0.09,', new: 'contact: 0.03, steerTau: 0.04, catchT: 0.000001,' }],
    test: 'surfaces.mjs', args: ['Main Ledge|Five Rail'], catches: /✖ the deck never jumps on the ground: a move the path takes and gives back, at most (?:[2-9]\d|\d{3,})\.\d cm/ },
  { name: 'grind_end_clamped', outside: 'under the chain\'s stages: one step\'s move lost at the rail\'s end (4.76 mm) is under their 1 cm — measured 10-17, "no stage broke in the 12 frames before it"; its own gate reads it', why: 'the rail\'s end clamped before the board was placed: it lost the step\'s move and jumped as it left', edits: [{ file: R('sim/body.js'), old: '{ this.placeOnRail(); g.s = V.clamp(g.s, 0, r.length); this.leaveRail(true, \'end\'); return; }', new: '{ g.s = V.clamp(g.s, 0, r.length); this.placeOnRail(); this.leaveRail(true, \'end\'); return; }' }],
    test: 'surfaces.mjs', args: ['Five Rail'], catches: /✖ A RAIL'S END KEEPS THE STEP'S MOVE/ },   // (read at the step itself: the deck's jump was 0 to v·dt by where the end fell in the step — 0.5 cm, uncaught, in round 22)
  { name: 'legs_underdamped', outside: "read at its own stage alone: legs_step.mjs drives the legs' spring by itself", why: 'the supervisor\'s plant: the legs\' springs at ζ 0.2 — the body wobbles after every step of the board', edits: [{ file: R('config.js'), old: 'export const LEGS = { hz: 4, zeta: 1,', new: 'export const LEGS = { hz: 4, zeta: 0.2,' }],
    test: 'legs_step.mjs', catches: /✖ THE LEGS SETTLE after the board's speed steps[^\n]*\((?:[1-9]\d|\d{3,}) %/ },
  { name: 'face_bridge_tight_join', why: 'the nose\'s bridge on its one tight join to the face (V10): the skin turns 58°/mm at the edge of the tunnel under it', edits: [{ file: R('view/sculpt.js'), old: '      h = smin(h, bridge, 0.014);', new: '' }],
    test: 'face.mjs', catches: /✖ no hard crease where the forms meet/ },
  { name: 'face_bridge_tunnel', why: 'the nose\'s bridge on the nose\'s one tight join (V10, V11): a handle with a tunnel under it from cheek to cheek, the park seen through the face in profile', edits: [{ file: R('view/sculpt.js'), old: '      h = smin(h, bridge, 0.014);', new: '' }],
    test: 'face.mjs', catches: /✖ the drawn head \(LOD 0\) is one piece with no hole through it: 1 piece, 1 hole[\s\S]*✖ the drawn head \(LOD 1\) is one piece with no hole through it: 1 piece, 1 hole/ },
  { name: 'face_midline_not_held', why: 'the supervisor\'s, round 15: the midline left to the simplifier in mirrored() — the head cracked open down its back, its halves 6–9 mm apart, while the mirror read 0.0 mm', edits: [{ file: R('view/sculpt.js'), old: 'held: Uint8Array.from(held), care', new: 'held: null, care' }],
    test: 'face.mjs', catches: /✖ the drawn head \(LOD \d, \d+ triangles\) is closed/ },
  { name: 'face_mirror_off', why: 'the head meshed as before: its grid 0.74 of a cell off the midline, simplified whole (3.4 mm between the sockets)', edits: [{ file: R('view/sculpt.js'), old: 'stepFar: 0.0045, mirror: true, bones', new: 'stepFar: 0.0045, bones' }],
    test: 'face.mjs', catches: /✖ the drawn head \(LOD 0/ },
  /* (the supervisor's 3 mm socket shift is drawn and looks as natural: the lids absorb it — runs/face shots; the lopsided risk it stood for is
     closed by the mirrored head. A socket off its eye shows only when the skin closes over the eye: past 7.3 mm at the eye's depth, by the
     socket's own size — planted at 9; a socket too wide only deepens the hollow round the lids, which are domes into the head) */
  { name: 'face_socket_covers', why: 'the socket 9 mm toward the ear: the skin by the nose closes over the eye', edits: [{ file: R('view/sculpt.js'), old: 'ellip(x, y, z, [E[0], E[1], E[2] + 0.011], F.socket)', new: 'ellip(x, y, z, [E[0] + 0.009, E[1], E[2] + 0.011], F.socket)' }],
    test: 'face.mjs', catches: /✖ each eye sits in its socket/ },
  { name: 'face_nose_flat', why: 'the nose\'s tip and bridge pulled back a centimetre', edits: [{ file: R('view/sculpt.js'), old: 'bridgeEnd: [0, 1.624, 0.1115], bridgeR: 0.0078, tip: [0, 1.6125, 0.1125]', new: 'bridgeEnd: [0, 1.624, 0.1015], bridgeR: 0.0078, tip: [0, 1.6125, 0.1025]' }],
    test: 'face.mjs', catches: /✖ the nose stands/ },
  { name: 'face_lips_flat', why: 'the lips sunk 6 mm: inside the muzzle, as V9\'s were inside its jaw', edits: [{ file: R('view/sculpt.js'), old: 'upper: [0, 1.5848, 0.0935], upperR: [0.025, 0.0058, 0.0085], lower: [0, 1.5753, 0.0905]', new: 'upper: [0, 1.5848, 0.0875], upperR: [0.025, 0.0058, 0.0085], lower: [0, 1.5753, 0.0845]' }],
    test: 'face.mjs', catches: /✖ the lips stand proud/ },
  { name: 'face_ridge_flat', why: 'the brow ridge a third as thick', edits: [{ file: R('view/sculpt.js'), old: 'b: [0.05, 1.6805, 0.079], r: 0.0072 }', new: 'b: [0.05, 1.6805, 0.079], r: 0.0025 }' }],
    test: 'face.mjs', catches: /✖ the brow ridge/ },
  { name: 'face_ears_flush', why: 'the ears turned flat to the head and set into it', edits: [{ file: R('view/sculpt.js'), old: 'ear: { c: [0.0825, 1.6335, -0.009], turn: 22,', new: 'ear: { c: [0.077, 1.6335, -0.009], turn: 0,' }],
    test: 'face.mjs', catches: /✖ the ears stand off/ },
  { name: 'face_head_tilted', why: 'the head\'s rotation without its level: the crouch\'s bend through a turned neck as a tilt (12.2° at rest)', edits: [{ file: R('view/skater.js'), old: "setLocal('head', level(modelQ.neck", new: "setLocal('head', (modelQ.neck" }],
    drive: ['face.mjs', '390x844'], catches: /✖ THE EYE LINE/ },
  { name: 'face_eyes_v9', why: 'the eyes as V9 had them: each turned 3.4° out, looking straight from its own centre', edits: [{ file: R('view/skater.js'), old: 'e.rotation.set(clampA(-Math.atan2(dy, Math.hypot(dx, dz)), EYE_PITCH), clampA(Math.atan2(dx, dz), EYE_YAW), 0); }', new: 'e.rotation.set(0, Math.sign(e.position.x) * 0.06, 0); void dx, dy, dz; }' }],
    drive: ['face.mjs', '390x844'], catches: /✖ THE EYES at rest/ },
  { name: 'face_on_the_neck', why: 'the face weighted by distance again: the mouth 37% the neck\'s, the chin sliding under the eyes', edits: [{ file: R('view/sculpt.js'), old: "bones: /^(neck|head|chest)$/, rigid, care,", new: "bones: /^(neck|head|chest)$/, care," }],
    drive: ['face.mjs', '390x844'], catches: /✖ THE FACE MOVES WITH THE HEAD/ },
  { name: 'face_eye_3mm', why: 'one eye (and its lids) 3 mm out of its pair', edits: [{ file: R('view/skater.js'), old: 'const c = local([FE.c[0] * sx, FE.c[1], FE.c[2]]);', new: 'const c = local([FE.c[0] * sx + (sx > 0 ? 0.003 : 0), FE.c[1], FE.c[2]]);' }],
    drive: ['face.mjs', '390x844'], catches: /✖ THE PAIRS/ },
  /* THE MOTION (the owner, 10-16: "the body movements to be actually natural like the skaters. Its very stiff on the thrust"): tests/motion.mjs */
  /* THE MOTION OVER EVERY CASE (tests/motion_sweep.mjs, 10-16): one plant a fix, each on the sweep's own line */
  { name: 'motion_kick_at_plant', outside: "the board's speed (the push's peak) is the sweep's own reading, not a move taken and given back", why: 'the supervisor\'s M1: the push\'s whole gain paid in its first 30 ms (4–6 g), not over the contact', edits: [{ file: R('sim/body.js'), old: 'a = Math.min(st.gain - st.given, gave(st.u || 0, u1, st.gain));', new: 'a = Math.min(st.gain - st.given, gave(Math.min(1, (st.t - dt) / 0.03), Math.min(1, st.t / 0.03), st.gain));' }],
    test: 'motion_sweep.mjs', catches: /✖ THE PUSH'S PEAK/ },
  { name: 'motion_drive_by_its_start', outside: "the stroking foot (its plant, lift and swing) is the sweep's own to read", why: 'the supervisor\'s M2: the drive timed by the speed at the plant alone and ended by that time — the push speeds the board, it rolls past what the leg holds', edits: [{ file: R('formulas/stroke.js'), old: 'T = Math.min(driveMax, sweep / Math.max(speed + g / 2, 0.01));', new: 'T = Math.min(driveMax, sweep / Math.max(speed, 0.01));' }, { file: R('sim/body.js'), old: 'last = st.t + dt >= st.drive || st.dist + speed * dt >= P.sweep;', new: 'last = st.t + dt >= st.drive;' }],
    test: 'motion_sweep.mjs', catches: /✖ THE PLANTED FOOT HOLDS/ },
  { name: 'motion_planted_on_the_board', outside: "the stroking foot is the sweep's own to read", why: 'the supervisor\'s M3: the planted foot held in board space, so it turns with the board and slides in a carve', edits: [{ file: R('view/skater.js'), old: "      if (frame) {\n        frame.updateWorldMatrix(true, false);", new: "      if (false) {\n        frame.updateWorldMatrix(true, false);" }],
    test: 'motion_sweep.mjs', catches: /✖ THE PLANTED FOOT HOLDS/ },
  { name: 'motion_pop_with_the_foot_out', outside: 'where the feet are (on the deck) is a placement, not a break', why: 'the supervisor\'s M4: a pop met mid-stroke popped at once, the foot still on the ground — it hung off the board through the air', edits: [{ file: R('sim/body.js'), old: 'if (this.hand && this.stroke) this.homeFoot(true);', new: 'if (false) this.homeFoot(true);' }, { file: R('sim/body.js'), old: "      if (i >= waited && this.stroke && this.state === 'roll' && ((e.type === 'pop'", new: "      if (false && ((e.type === 'pop'" }],
    test: 'motion_sweep.mjs', catches: /✖ BOTH FEET ON THE DECK, MET MID-STROKE/ },
  { name: 'motion_toe_drops_at_once', starts: 'ik', why: 'the supervisor\'s M5: the heel set down at once as the foot goes home (43° in a frame)', edits: [{ file: R('view/skater.js'), old: 'toeOff: F.toeOff * (1 - ease(ct / Math.min(0.12, T))), out: 1 - ease(u), planted: false };', new: 'toeOff: 0, out: 1 - ease(u), planted: false };' }],
    test: 'motion_sweep.mjs', catches: /✖ NO POPS/ },
  { name: 'motion_turn_at_once', starts: 'pose', why: 'the supervisor\'s W1: the hips turned into the push by an exponential (1,089°/s from rest)', edits: [{ file: R('view/skater.js'), old: 'st.turnP = Math.max(0, Math.min(1, (st.turnP || 0) + (stroking ? dt / 0.2 : -dt / 0.3))); st.turn = ease(st.turnP);', new: 'st.turn = k(stroking ? 1 : 0, st.turn, stroking ? 0.05 : 0.16);' }],
    test: 'motion_sweep.mjs', catches: /✖ A SETTLED START/ },
  { name: 'motion_lands_at_rest', outside: "the stroking foot is the sweep's own to read", why: 'the foot set down at rest on the board: at the board\'s own speed over the ground, a skid at every plant', edits: [{ file: R('view/skater.js'), old: 'glide(F.ball.z, F.vel.z, plantBall.z, gz, T, ct, ease(u))', new: 'glide(F.ball.z, F.vel.z, plantBall.z, 0, T, ct, ease(u))' }, { file: R('view/skater.js'), old: 'ball: step(F, plantBall, T, ct, gz,', new: 'ball: step(F, plantBall, T, ct, 0,' }],
    test: 'motion_sweep.mjs', catches: /✖ THE FOOT MEETS THE GROUND/ },
  { name: 'motion_curves_on_the_phase_count', starts: 'ik', why: 'the foot\'s curves read off the sim\'s phase count (a step behind its true time): the foot held still on the board a frame at every landing and lift', edits: [{ file: R('view/skater.js'), old: 'const lag = Math.max(0, dt - S.segT);', new: 'const lag = Math.max(0, dt - S.t);' }, { file: R('view/skater.js'), old: '    const ct = S.segT;', new: '    const ct = S.t;' }],
    test: 'motion_sweep.mjs', catches: /✖ (THE FOOT MEETS THE GROUND|NO POPS|THE PLANTED FOOT HOLDS|WITHIN THE LEGS' REACH)/ },
  { name: 'motion_phase_end_exact', outside: "the stroking foot is the sweep's own to read", why: 'a phase\'s end read exactly off its sum of steps (30 of 1/120 s fall short of 0.25): a swing ran a step long and the foot, landed, rode the board', edits: [{ file: R('sim/body.js'), old: 'const ET = 1e-6;', new: 'const ET = 0;' }],
    test: 'motion_sweep.mjs', catches: /✖ THE FOOT MEETS THE GROUND/ },
  { name: 'motion_heel_by_its_share', outside: "the stroking foot is the sweep's own to read: the chain's ik leaves it out, and sees this only at the foot's joint (bones)", why: 'the heel\'s rise timed by a share of the drive with no floor of its own: at speed the ankle snaps 43° in a frame', edits: [{ file: R('view/skater.js'), old: 'rise = Math.min(T, Math.max(0.07, 0.55 * T))', new: 'rise = 0.25 * T' }],   /* (by 0.55 of the drive it no longer snaps at the 1.3 g push's drives: the floor of 70 ms is kept as the heel's own time, and the class is planted at its quarter) */
    test: 'motion_sweep.mjs', catches: /✖ NO POPS/ },
  { name: 'motion_wait_uncapped', outside: 'a latency (a pop held for the foot) is a time, not a break', why: 'the supervisor\'s, 10-16: a trick met mid-stroke held until the foot is home, however long (108 ms on a Cruise swipe: a late ollie at every ledge)', edits: [{ file: R('sim/body.js'), old: 'W.steps <= Math.round(PH.push.waitMax / PH.step)', new: 'W.steps <= 1e9' }],
    test: 'motion_sweep.mjs', catches: /✖ THE ADDED LATENCY/ },
  { name: 'motion_foot_left_out', outside: 'where the feet are (on the deck) is a placement, not a break', why: 'the supervisor\'s, 10-16: past the cap the trick goes and the foot is left where it was — its step home stopped as he leaves the ground', edits: [{ file: R('view/skater.js'), old: '    const ct = S.segT;', new: "    const ct = s.state === 'air' || s.state === 'grind' || s.state === 'manual' ? (st.ctOff = st.ctOff != null ? st.ctOff : S.segT) : (st.ctOff = null, S.segT);" }],
    test: 'motion_sweep.mjs', catches: /✖ BOTH FEET ON THE DECK, MET MID-STROKE/ },
  { name: 'motion_cadence_unfloored', outside: 'a cadence is a rhythm, not a break', why: 'the supervisor\'s M6: every stroke as soon as the foot is home — no cycle\'s floor between plants', edits: [{ file: R('sim/body.js'), old: 'if (st.more) this.nextPushAt = this.lastPlantAt + cycleOf(speed) - P.reach;', new: 'if (st.more) this.nextPushAt = 0;' }],
    test: 'motion_sweep.mjs', catches: /✖ THE CADENCE/ },
  { name: 'motion_sewing_machine', outside: 'a cadence is a rhythm, not a break', why: 'the supervisor\'s M6 as it was: the foot swinging straight from push to push at every speed, never home to ride (158–188 a minute)', edits: [{ file: R('sim/body.js'), old: 'if (st.more && speed < P.top && this.quickLeft > 0) { this.quickLeft--;', new: 'if (st.more && speed < P.top) { this.quickLeft--;' }],
    test: 'motion_sweep.mjs', catches: /✖ THE CADENCE/ },
  { name: 'motion_block_push', outside: 'a pose (the body turned as a block) is a shape, not a break', why: 'the push as it was: upright, the whole rig turned as a block, the hips and the trunk not turned or leaning', edits: [
      { file: R('view/skater.js'), old: 'multiply(qAxis(0, 1, 0, st.turn * 1.1)).multiply(qAxis(1, 0, 0, fwdLean));', new: 'multiply(qAxis(0, 1, 0, 0)).multiply(qAxis(1, 0, 0, st.crouch * 0.15)); rig.rotation.y = -Math.PI / 2 + st.turn * 0.75;' }],
    test: 'motion.mjs', catches: /✖ THE DRIVE/ },
  { name: 'motion_carve_stiff', outside: 'a lean that answers late is a shape, not a break', why: 'the carve\'s lean as it was: a tenth of a radian and a half however hard the turn pulls', edits: [{ file: R('view/skater.js'), old: 'st.leanA = k(Math.atan2(aLat, 9.81), st.leanA, 0.12);', new: 'st.leanA = k((s.state === \'roll\' ? s.lean || 0 : 0) * 0.18, st.leanA, 0.12);' }],
    test: 'motion.mjs', catches: /✖ THE CARVE LEANS/ },
  { name: 'motion_t_arms', outside: 'a pose (the arms in a T) is a shape, not a break', why: 'the arms in the air and on a grind straight out to the sides, both alike: a T', edits: [
      { file: R('view/skater.js'), old: "+ st.arms * (sd === 'L' ? 0.14 : 0.1) + st.air * (sd === 'L' ? 0.07 : 0.05) + Math.abs(st.leanA) * 0.2 + 0.03 * bal;", new: "+ st.arms * 0.42 + st.air * 0.42 + Math.abs(st.leanA) * 0.2 + 0.03 * bal;" },
      { file: R('view/skater.js'), old: "const down = -0.5 + st.arms * (sd === 'L' ? 0.2 : 0.1) + st.air * (sd === 'L' ? 0.2 : 0.1) - 0.05 * st.absorb + 0.035 * bal;", new: "const down = -0.5 + st.arms * 0.5 + st.air * 0.5 - 0.05 * st.absorb + 0.035 * bal;" },
      { file: R('view/skater.js'), old: "const ahead = 0.05 + st.air * (sd === 'L' ? 0.2 : -0.17) + st.arms * (sd === 'L' ? 0.2 : -0.16)", new: "const ahead = 0.05 + st.air * 0 + st.arms * 0" }],
    test: 'motion.mjs', catches: /✖ THE ARMS BALANCE/ },
  /* THE FORMULAS (10-16, the owner: "make sure all parts are correctly implemented"): a classic bug in each, read by its own truth */
  { name: 'planned_from_rest', why: 'the planned turn re-planned from where it is and its rate, its acceleration dropped: each re-plan a new quintic from rest in acceleration — not its own continuation, and a new target steps it', edits: [{ file: R('formulas/follow.js'),
      old: 'ks.forEach((k, j) => { const [x, v, a] = quintic(at(s.u, k), at(s.ud, k), at(s.udd, k), at(s.u, k) + lam * D[j], T, dt);', new: 'ks.forEach((k, j) => { const [x, v, a] = quintic(at(s.u, k), at(s.ud, k), 0, at(s.u, k) + lam * D[j], T, dt);' }],
    test: 'formulas.mjs', catches: /✖ THE PLANNED TURN IS ITS QUINTIC/ },
  { name: 'planned_pace_ignored', why: 'the planned turn\'s pace never consulted: the whole turn asked by its deadline whatever it takes — 0.42 rad in 0.06 s at 673 rad/s²', edits: [{ file: R('formulas/follow.js'),
      old: '  let r = shareAt(s, D, T, A), Tp = T;', new: '  let r = { lam: 1, fits: true }, Tp = T;' }],
    test: 'formulas.mjs', catches: /✖ AT A PACE/ },
  { name: 'planned_pace_exceeded', why: 'the planned turn, its own rate past what it can bring to rest by its deadline inside its pace, asks whatever that takes (the old least-peak share): a deadline that came in sooner turned the up at 3,392 rad/s²', edits: [{ file: R('formulas/follow.js'),
      old: '  for (let k = 0; k < 16 && !r.fits; k++) { Tp *= 1.25; r = shareAt(s, D, Tp, A); }', new: '  for (let k = 0; k < 0 && !r.fits; k++) { Tp *= 1.25; r = shareAt(s, D, Tp, A); }' }],
    test: 'formulas.mjs', catches: /✖ NEVER FASTER THAN ITS PACE/ },
  { name: 'follow_dt_missing', why: 'the follower\'s step without its dt: every frame rate a different spring', edits: [{ file: R('formulas/follow.js'),
      old: 'const c = v0 + w * u0, e = Math.exp(-w * dt); return [(u0 + c * dt) * e, (v0 - w * c * dt) * e];', new: 'const c = v0 + w * u0, e = Math.exp(-w); return [(u0 + c) * e, (v0 - w * c) * e];' }],
    test: 'formulas.mjs', catches: /✖ THE FOLLOWER'S STEP RESPONSE/ },
  { name: 'follow_explicit_euler', why: 'the follower stepped by explicit Euler: stiff at a long step, it blows up', edits: [{ file: R('formulas/follow.js'),
      old: 'const c = v0 + w * u0, e = Math.exp(-w * dt); return [(u0 + c * dt) * e, (v0 - w * c * dt) * e];', new: 'return [u0 + v0 * dt, v0 + (-w * w * u0 - 2 * w * v0) * dt];' }],
    test: 'formulas.mjs', catches: /✖ STABLE AT A LONG STEP/ },
  { name: 'follow_rate_dependent', why: 'a first-order follower by a share that is not 1 − e^(−dt/τ) (the camera\'s look had one): a different path at every frame rate', edits: [{ file: R('formulas/follow.js'),
      old: 'export const ease = (dt, tau) => (tau <= 0 ? 1 : 1 - Math.exp(-dt / tau));', new: 'export const ease = (dt, tau) => (tau <= 0 ? 1 : Math.min(1, dt / tau));' }],
    test: 'formulas.mjs', catches: /✖ THE SAME PATH AT 30, 60, 120 AND 144 HZ/ },
  { name: 'follow_cap_ignored', why: 'the follower\'s cap not held: a change of the target\'s rate comes on it at once (every sub-step taken exact, the cap never consulted)', edits: [{ file: R('formulas/follow.js'),
      old: '      if (Math.abs(a) <= P.cap) { ex = exact(P, s.u, s.ud, h); if (Math.abs(-w2 * ex[0] - d2 * ex[1]) > P.cap) ex = null; }', new: '      ex = exact(P, s.u, s.ud, h);' }],
    test: 'formulas.mjs', catches: /✖ THE CAP HELD/ },
  { name: 'contact_normal_flipped', why: 'the contacts\' normal not turned toward the board\'s up: the wheels in another order and the board stands on its head', edits: [{ file: R('formulas/contact.js'),
      old: 'const s = (out[0] * up[0] + out[1] * up[1] + out[2] * up[2] < 0 ? -1 : 1) / l;', new: 'const s = 1 / l;' }],
    test: 'formulas.mjs', catches: /✖ THE SIGN/ },
  { name: 'contact_sides_not_diagonals', why: 'the plane from the board\'s two sides, not its diagonals: two lines that do not cross give no plane', edits: [{ file: R('formulas/contact.js'),
      old: 'if (k.length === 4) { a = sub(c[0], c[3]); b = sub(c[1], c[2]); }', new: 'if (k.length === 4) { a = sub(c[0], c[1]); b = sub(c[2], c[3]); }' }],
    test: 'formulas.mjs', catches: /✖ THE PLANE THROUGH FOUR CONTACTS/ },
  { name: 'page_blend_off', starts: null, outside: 'a drive on the page: the chain reads the Node figure', why: 'the supervisor\'s A on the page: the figure drawn at the newest whole step (figure.js poseInput without the blend) — frames from a display\'s stamps then move 0 to 2× their time', edits: [{ file: R('view/figure.js'), old: '  const s = prev ? drawn(prev, sim.read(), a) : sim.read(), lag = prev ? (1 - a) * PHYSICS.step : 0;', new: '  const s = sim.read(), lag = 0;' }],
    drive: ['even.mjs', '390x844'], catches: /EVEN up: THE DRAWN MOTION IS EVEN[^\n]*✖/ },
  { name: 'follow_capped_euler', starts: null, outside: 'a formula: its own truth reads it, not the chain', why: 'the supervisor\'s B: the capped follower stepped by a fixed 1/480 s semi-implicit Euler sub-step — 4 % off the exact path at 10 Hz, and from about 76 Hz it grows without end', edits: [{ file: R('formulas/follow.js'), from: '      const a = -w2 * s.u - d2 * s.ud; let ex = null;', to: '    }\n  }\n  return s.u;', new: '      let a = -w2 * s.u - d2 * s.ud; if (Math.abs(a) > P.cap) a = Math.sign(a) * P.cap; s.ud += a * h; s.u += s.ud * h;\n' }],
    test: 'formulas.mjs', catches: /✖ THE CAP UNREACHED IS THE EXACT PATH/ },
  { name: 'blend_none', starts: null, outside: 'a formula: its own truth reads it, not the chain', why: 'the supervisor\'s A: the frame drawn at the newest whole step (alpha held at 1): at 90 Hz the steps run 1,1,2 and the drawn move is 0.75× or 1.5× its time; at 120 Hz after a hitch a third of the frames do not move', edits: [{ file: R('formulas/step.js'), old: 'export const alpha = (C) => Math.min(1, Math.max(0, C.acc / C.step));', new: 'export const alpha = (C) => 1;' }],
    test: 'formulas.mjs', catches: /✖ THE DRAWN MOVE IS THE FRAME'S OWN TIME/ },
  { name: 'deck_mean_of_normals', starts: 'sim', why: 'the board stood on the mean of the normals under its wheels, not the plane through their contacts (the supervisor\'s T2: at the Sun Bank\'s seam it swung halfway the step the front pair crossed — 750°/s)', edits: [{ file: R('sim/body.js'), old: '    let newUp = hold ? V.copy(S[8], hold.n) : plane ? V.copy(S[8], plane) : V.norm(S[8], V.set(S[8], nx, ny, nz));', new: '    let newUp = V.norm(S[8], V.set(S[8], nx, ny, nz));' }],
    test: 'surfaces.mjs', catches: /✖ the deck follows the ground at the ground's rate/ },
  { name: 'contact_three_of_four', starts: null, outside: 'a formula: its own truth reads it, not the chain', why: 'the supervisor\'s D: four contacts stood on the plane of three of them (front-left, front-right, back-left) — on a flat or a seam all four are coplanar and it passes; on a twisted board it is not the diagonals\' plane', edits: [{ file: R('formulas/contact.js'), old: '  if (k.length === 4) { a = sub(c[0], c[3]); b = sub(c[1], c[2]); }', new: '  if (k.length === 4) { a = sub(c[1], c[0]); b = sub(c[2], c[0]); }' }],
    test: 'formulas.mjs', catches: /✖ A TWISTED BOARD/ },
  { name: 'step_unbounded', why: 'the fixed step with no ceiling: a long frame runs every step it owes, the next frame is longer, and it spirals', edits: [{ file: R('formulas/step.js'),
      old: 'while (C.acc >= C.step && n < C.maxSteps)', new: 'while (C.acc >= C.step)' }],
    test: 'formulas.mjs', catches: /✖ A LONG FRAME NEVER SPIRALS/ },
  { name: 'jump_end_velocity', why: 'a fall stepped by the velocity at the step\'s end: every apex v·dt/2 low (1.9 cm off an 85 cm ollie)', edits: [{ file: R('formulas/jump.js'),
      old: 'p[1] += v[1] * dt + 0.5 * g * dt * dt;', new: 'p[1] += v[1] * dt;' }],
    test: 'formulas.mjs', catches: /✖ A JUMP STEPPED AT 1\/120 s/ },
  { name: 'stroke_riemann', why: 'a push stepped as rate × dt: a short contact gives 98 % of its gain', edits: [{ file: R('formulas/stroke.js'),
      old: 'return b > a ? (gain * (Math.cos(Math.PI * a) - Math.cos(Math.PI * b))) / 2 : 0;', new: 'return b > a ? ((gain * Math.PI) / 2) * Math.sin(Math.PI * b) * (b - a) : 0;' }],
    test: 'formulas.mjs', catches: /✖ THE STROKE GIVES ITS GAIN/ },
  { name: 'stroke_kick_at_plant', why: 'the push\'s force at its strongest as the foot lands: a kick, not a stroke', edits: [{ file: R('formulas/stroke.js'),
      old: 'return b > a ? (gain * (Math.cos(Math.PI * a) - Math.cos(Math.PI * b))) / 2 : 0;', new: 'return b > a ? gain * (Math.sin((Math.PI * b) / 2) - Math.sin((Math.PI * a) / 2)) : 0;' }],
    test: 'formulas.mjs', catches: /✖ NOTHING AT THE PLANT OR THE LIFT/ },
  /* THE BODY ON ITS LEGS AND THE ROLL-IN (10-16): each back as it was, read by the walls that hold them */
  { name: 'landing_pose_dip', starts: 'pose', why: 'the pose\'s own landing dip again, 13 cm in 35 ms on top of the legs\' spring: the hips\' target thrown down at 354 m/s² (176 at the coping catch)', edits: [{ file: R('view/skater.js'),
      old: 'st.was = s.state; st.absorb = 0;', new: "if (st.was === 'air' && s.state !== 'air') st.hit = 1; st.was = s.state; st.hit = k(0, st.hit || 0, 0.12); st.absorb = k(st.hit, st.absorb, 0.035);" }],
    test: 'surfaces.mjs', catches: /✖ the hips through an impulse/ },
  { name: 'legs_rigid', starts: 'legs', why: 'the supervisor\'s plant: the legs\' spring off — the hips bolted to the pose, every pop, landing and catch on them at once', edits: [{ file: R('view/skater.js'),
      old: 'hips.copy(rig.worldToLocal(T.clone().add(st.legs.u)));', new: 'hips.copy(rig.worldToLocal(T.clone()));' }],
    test: 'surfaces.mjs', catches: /✖ the hips through an impulse/ },
  { name: 'trunk_rigid', starts: 'trunk', why: 'the body\'s attitude bolted to the board\'s: every seam and kink swings the hips 0.92 m above with the board', edits: [{ file: R('view/skater.js'),
      old: '          at.y.copy(sp.u).add(lam); at.yv.copy(sp.ud).add(lamW); at.lam = lam; at.lamW = lamW;', new: '          at.y.set(0, 0, 0); at.yv.set(0, 0, 0); at.lam = lam; at.lamW = lamW;' }],
    test: 'surfaces.mjs', catches: /✖ the hips ride the legs on the ground/ },
  { name: 'trunk_uncapped', starts: 'trunk', why: 'the trunk\'s turn uncapped: a step in the board\'s turn rate came on the body at once, 2ω·Δω (the Sun Bank seam: 78 m/s²)', edits: [{ file: R('view/skater.js'),
      old: 'TRUNK_P = second({ f: LEGS.tiltHz, z: LEGS.zeta, r: 2, cap: LEGS.tiltAcc });', new: 'TRUNK_P = second({ f: LEGS.tiltHz, z: LEGS.zeta, r: 2 });' }],
    test: 'surfaces.mjs', catches: /✖ the hips ride the legs on the ground/ },
  { name: 'crouch_first_order', starts: 'pose', why: 'the crouch on a first-order lag again: a pop\'s load let go threw the hips\' target up at 2.9 m/s in a frame (152 m/s²)', edits: [{ file: R('view/skater.js'),
      old: 'st.crouchS = st.crouchS || follower(want); st.crouch = chase(CROUCH_P, st.crouchS, want, dt);', new: 'st.crouch = k(want, st.crouch, 0.07);' }],
    test: 'motion_sweep.mjs', catches: /✖ THE POSE'S OWN TARGETS ARE SMOOTH/ },
  { name: 'rollin_assist_off', outside: 'a run into a ramp not taken as one: no frame breaks — the drop-in gate says it', why: 'the supervisor\'s plant: no roll-in and no drop-in — over the Basin\'s rim and off the Deck Quarter\'s deck the board rolls off and flies on every assist, as Raw does', edits: [{ file: R('sim/body.js'),
      old: '    if (moving && this.state === \'roll\' && this.assist.vert > 0 && (this.crossing || up[1] >= DECK_UP)) {', new: '    if (false && moving && this.state === \'roll\' && this.assist.vert > 0 && (this.crossing || up[1] >= DECK_UP)) {' }],
    test: 'surfaces.mjs', catches: /✖ OVER A LIP THE ROLL CANNOT HOLD, A DROP-IN/ },
  { name: 'rollin_at_a_ledge_end', outside: 'a take-off said as the wrong kind: the ledge gate says it', why: 'the supervisor\'s plant: a ledge\'s end taken for a run into a ramp — every roll-off flown as a drop-in, the Pad\'s end included', edits: [{ file: R('sim/body.js'),
      old: "if (r === 'off' || r === 'lip' || r === 'dropin') { this.toAir(r === 'off' ? 'rolloff' : r);", new: "if (r === 'off' || r === 'lip' || r === 'dropin') { this.toAir(r === 'off' ? 'dropin' : r);" }],
    test: 'surfaces.mjs', catches: /✖ A LEDGE'S END ROLLS OFF AND FLIES/ },
  { name: 'rollin_full_rate', outside: 'a speed held back: the deck-speed gate reads it, and the chain\'s first break is the body taking it', why: 'the supervisor\'s plant, the old pivot: the board held to a fifth of its speed over the coping (its middle 6.81 → 1.71 → 6.91 m/s) — read in the drop-in\'s approach, its motion scaled 0.21 while it goes over', edits: [{ file: R('sim/body.js'),
      old: "    if (!best) { V.addScaled(this.p, this.p, this.v, dt); return 'free'; }", new: "    if (!best) { V.addScaled(this.p, this.p, this.v, dt * (this.dropping ? 0.21 : 1)); return 'free'; }" }],
    test: 'surfaces.mjs', catches: /✖ THE DECK KEEPS ITS SPEED OVER THE COPING/ },
  { name: 'rollin_hit_kept', outside: 'a landing judged: the drop-in gate says it', why: 'the supervisor\'s plant: the drop-in with no up-turn — its up held toward the sky (V11\'s upright float), never turned to the wall it lands on', edits: [{ file: R('sim/body.js'),
      old: '    const target = upLand ? upLand.normal : air.vert || air.drop ? air.upTarget : Y;', new: '    const target = upLand && !air.drop ? upLand.normal : air.vert ? air.upTarget : Y;' }],
    test: 'surfaces.mjs', catches: /✖ OVER A LIP THE ROLL CANNOT HOLD, A DROP-IN/ },
  { name: 'rollin_wall_read_flat', outside: 'the board against the coping: its own gate says it', why: 'the drop-in\'s path turned toward the wall from its take-off — the tail dragged through the coping (2.3 cm at 3 m/s) and into the deck behind it', edits: [{ file: R('sim/body.js'),
      old: '    if (air.drop && !air.drop.clear) air.drop.clear = this.tailPast(this.p, this.fwd, this.v, air.drop);', new: '    if (air.drop && !air.drop.clear) air.drop.clear = true;' }],
    test: 'surfaces.mjs', catches: /✖ THE TURN OVER THE COPING HAS NO STEP/ },
  /* this release's (10-16): a drop-in per lip, the board against its coping, contacts that stop short of a face, the heading never steps */
  { name: 'face_stop_overshoot', why: 'a rolling wheel stopped where sweepPoint\'s backed-off fraction put it, up to 5 mm into the face it met: its probe took the Pad\'s top 20 cm up and pitched the board 28° onto it', edits: [{ file: R('sim/body.js'), old: '        hit.stop = into > 1e-9 ? V.clamp((ahead - 0.001) / into, 0, 1) : 0; if (!best || hit.stop < best.stop) best = hit; }', new: '        hit.stop = hit.s; if (!best || hit.stop < best.stop) best = hit; }' }],
    test: 'camera_moving.mjs', catches: /THE BOARD NEVER INSIDE THE PARK[^\n]*✖/ },
  { name: 'turn_into_face', outside: 'a board against a wall: its own gate reads it', why: 'a turn of the heading carried a wheel into the face it stood at: stopped square against the Pad\'s side and kickturned, its front wheel went into the Pad, its probe took the Pad\'s top 20 cm up and the board climbed it', edits: [{ file: R('sim/body.js'), old: '  turnClear(a, b) {\n', new: '  turnClear(a, b) { return 1;\n' }],
    test: 'surfaces.mjs', catches: /✖ THE BOARD COMES TO REST AGAINST A WALL IT ROLLED INTO/ },
  { name: 'heading_chases_travel', outside: 'a heading: the gate reads the yaw, the chain does not', why: 'the heading chased its travel at 30/s however far off it was: stopped by a wall, or landed 60° off its travel on Raw, the board snapped through 600–1,450°/s', edits: [{ file: R('sim/body.js'), old: '      const forces = Math.abs(V.dot(V.cross(S[14], g2, dir0), u2)) * PH.gGround / Math.max(speed, 0.5), most = Math.max(0, (steer + forces) * dt - (this._steered || 0)), step0 = need * Math.min(1, dt * 30);', new: '      const forces = Math.abs(V.dot(V.cross(S[14], g2, dir0), u2)) * PH.gGround / Math.max(speed, 0.5), most = Infinity, step0 = need * Math.min(1, dt * 30);' }],
    test: 'camera_moving.mjs', catches: /THE BOARD'S HEADING NEVER STEPS ON THE GROUND[^\n]*✖/ },
  { name: 'heading_budget_after_wall', outside: 'a heading: the gate reads the yaw, the chain does not', why: 'the heading\'s budget read after a wall met in the step: a scrape left a 1.5 m/s board under walking pace and the kickturn\'s 220°/s to chase the wall\'s direction with', edits: [{ file: R('sim/body.js'), old: '      const steer = speed < C.kickturnBelow ? C.kickturnRate * DEG : Math.min(C.curv * speed, C.lateral / speed), g2 = V.reject(S[12], DOWN, u2);', new: '      const steer = sp < C.kickturnBelow ? C.kickturnRate * DEG : Math.min(C.curv * sp, C.lateral / sp), g2 = V.reject(S[12], DOWN, u2);' }],
    test: 'camera_moving.mjs', catches: /THE BOARD'S HEADING NEVER STEPS ON THE GROUND[^\n]*✖/ },
  { name: 'trailing_wheel_blind', outside: 'a board against a wall: its own gate reads it', why: 'a trailing wheel met no wall: skidding along the Pad\'s side square to it, the wheel nearest the Pad trailed the skid, went in under the sweep and the board climbed the Pad\'s top', edits: [{ file: R('sim/body.js'), old: '      if (hit && V.dot(hit.face, u) < 0.5 && (leads || Math.abs(hit.face[1]) < 0.5)) { blocked[i] = true; const n0 = hit.face, ahead = n0[0] * (a[0] - hit.point[0]) + n0[1] * (a[1] - hit.point[1]) + n0[2] * (a[2] - hit.point[2]), into = -(n0[0] * (b[0] - a[0]) + n0[1] * (b[1] - a[1]) + n0[2] * (b[2] - a[2]));', new: '      if (hit && V.dot(hit.face, u) < 0.5 && leads) { blocked[i] = true; const n0 = hit.face, ahead = n0[0] * (a[0] - hit.point[0]) + n0[1] * (a[1] - hit.point[1]) + n0[2] * (a[2] - hit.point[2]), into = -(n0[0] * (b[0] - a[0]) + n0[1] * (b[1] - a[1]) + n0[2] * (b[2] - a[2]));' }],
    test: 'surfaces.mjs', catches: /✖ the deck never jumps on the ground/ },
  { name: 'skid_slow_off', outside: 'a board against a wall: its own gate reads it', why: 'a slow board\'s travel across it not taken by its grip: stopped square against the Pad\'s side, it slid along it sideways at 0.25 m/s for seconds', edits: [{ file: R('sim/body.js'), old: '    } else { this.catchTurn = null; if (sp > 1e-6) this.skid(dt); }', new: '    } else { this.catchTurn = null; }' }],
    test: 'surfaces.mjs', catches: /✖ THE BOARD COMES TO REST AGAINST A WALL IT ROLLED INTO/ },
  { name: 'vstar_stored_above', outside: 'a stored number against its measure', why: 'a lip\'s stored vStar above its measure: the Deck Quarter would roll a board over its coping at 5 m/s, where the measure saw the rolled crossing fail at 0.6', edits: [{ file: R('sim/park.js'), old: '      addRail({ id: e.id, name: e.name, kind: \'coping\', surface: \'coping\', corner: -COPING_TOP, vStar: e.vStar || 0,', new: '      addRail({ id: e.id, name: e.name, kind: \'coping\', surface: \'coping\', corner: -COPING_TOP, vStar: e.vStar || (e.id === \'deckQuarter\' ? 5 : 0),' }],
    test: 'vstar.mjs', catches: /✖ deckQuarter/ },
  { name: 'hips_whole_lean', outside: 'the leg\'s straightness: its own gate reads it', why: 'the lean turned the hips with the whole body about the board\'s middle: a 29° lean carried them 45 cm ahead and the back leg straight', edits: [{ file: R('view/skater.js'), old: '      const yp = st.att.y.clone().addScaledVector(st.att.ys || new V3(), -2 / 3),', new: '      const yp = st.att.y.clone(),' }],
    test: 'surfaces.mjs', catches: /✖ the legs never straight/ },
  { name: 'drawn_coping_over_line', outside: 'the drawn park against its own line', why: 'the coping drawn 2.2 cm over the line the trucks grind: the pipe showed through the trucks on every grind', edits: [{ file: R('view/parkview.js'), old: 'export function copingTube(r, mat) { return tube(r.pts, COPING_R, r.loop, mat, 12); }', new: 'export function copingTube(r, mat) { return tube(r.pts.map((p) => [p[0], p[1] + 0.022, p[2]]), COPING_R, r.loop, mat, 12); }' }],
    test: 'park.mjs', catches: /✖ THE DRAWN COPING ON ITS LINE: every coping's drawn pipe has its top on the coping's line — at most (?!0\.)\d/ },
  { name: 'high_centre_on_drawn_top', outside: 'the board\'s edge against the lip its wheels ride', why: 'the high-centre read at the coping\'s drawn top while its wheels rode the lip under it: a board straddling a lip was held by its truck, tipped 8° in a step and wedged a wheel 7.9 cm into the Lawn Quarter', edits: [{ file: R('sim/body.js'), old: '      const dy = r.corner || 0, a = dy ? [r.pts[i][0], r.pts[i][1] + dy, r.pts[i][2]] : r.pts[i], b = dy ? [r.pts[i + 1][0], r.pts[i + 1][1] + dy, r.pts[i + 1][2]] : r.pts[i + 1];', new: '      const dy = 0, a = dy ? [r.pts[i][0], r.pts[i][1] + dy, r.pts[i][2]] : r.pts[i], b = dy ? [r.pts[i + 1][0], r.pts[i + 1][1] + dy, r.pts[i + 1][2]] : r.pts[i + 1];' }],
    test: 'park.mjs', catches: /✖ THE DRAWN COPING ON ITS LINE[^\n]*the solid the wheels ride \((?!0\.)\d/ },
  { name: 'walls_air_pushed', why: 'the air\'s wall contact a push out by its depth at the step\'s end, not a stop on its path: falling past the Deck Quarter\'s deck the board moved 2.1 cm off its own path in a step', edits: [{ file: R('sim/body.js'), old: '    if (start && start.worst <= 0) {\n      const q = [0, 0, 0];', new: '    if (false) {\n      const q = [0, 0, 0];' }],
    test: 'camera_moving.mjs', catches: /A TOUCHDOWN'S OWN MOVE[^\n]*✖/ },
  { name: 'walls_ground_pushed', why: 'the ground\'s wall contact a push out by its whole depth, not a stop on its path nor a share a step: landed by the fence on the Deck Quarter\'s 57° wall the board moved 1.2 cm off its path in a step', edits: [{ file: R('sim/body.js'), old: '        if (start && start.worst <= 0) {\n          const q = [0, 0, 0];', new: '        if (false) {\n          const q = [0, 0, 0];' }, { file: R('sim/body.js'), old: '        if (worst > 0) V.addScaled(this.p, this.p, hitN, WALL_BETA * worst);', new: '        if (worst > 0) V.addScaled(this.p, this.p, hitN, worst + 0.002);' }],
    test: 'camera_moving.mjs', catches: /A TOUCHDOWN'S OWN MOVE[^\n]*✖/ },
  { name: 'wheels_out_lie', why: 'wheelsOut\'s rays from the wheel itself: a wheel resting on the Spine\'s west face missed it and met the east face\'s back 2–5 cm on, was called inside, and the board was pushed 1.9 cm out of the Spine at a take-off', edits: [{ file: R('sim/body.js'), old: 'const q0 = this.world.bvh.raycast([W0[i][0] - d[0] * 0.001, W0[i][1] - d[1] * 0.001, W0[i][2] - d[2] * 0.001], d, 0.051, true);', new: 'const q0 = this.world.bvh.raycast(W0[i], d, 0.05, true);' }, { file: R('sim/body.js'), old: 'const q = q0 ? { t: Math.max(0, q0.t - 0.001), face: q0.face, surf: q0.surf } : null;', new: 'const q = q0 ? { t: q0.t, face: q0.face, surf: q0.surf } : null;' }],
    test: 'camera_moving.mjs', catches: /THE BOARD NEVER INSIDE THE PARK[^\n]*✖/ },
  { name: 'convex_edge_wheel_touches', why: 'a wheel past a convex edge taken for ground: up a ramp\'s last metre, a wheel past the lip found the deck 66° off the ramp, the board was flown and landed back the same step on the ramp its middle never left', edits: [{ file: R('sim/body.js'), old: '    if (n >= 3 && moving) {\n      const mh = ', new: '    if (false) {\n      const mh = ' }],
    test: 'camera_moving.mjs', catches: /A TOUCHDOWN'S OWN MOVE[^\n]*✖/ },
  { name: 'landing_seat_bent', outside: 'the chain\'s own census reads it (sim · its position taken and given back)', why: 'a landing\'s own attach called its contacts\' plane a convex bend: landed across the Sun Bank\'s foot, the board held a centimetre under its own four contacts for a step', edits: [{ file: R('sim/body.js'), old: '    if (moving && !rolled && !this._seating && !this.settle && V.dot(bend, this.v) > 0) {', new: '    if (moving && !rolled && V.dot(bend, this.v) > 0) {' }],
    test: 'surfaces.mjs', catches: /✖ THE CHAIN IS QUIET ON THIS BUILD/ },
  { name: 'yaw_set_at_once', outside: 'the yaw\'s own turn: its gate reads it', why: 'the landing yaw assist setting the heading to its landing\'s line at once, not turning it', edits: [{ file: R('sim/body.js'), old: '    const turn = h.u + aim; air.headW = h.ud; air.headA = h.udd;', new: '    const turn = aim; air.headW = aim / dt; air.headA = 0;' }],
    test: 'coping_capture.mjs', catches: /✖ THE LANDING YAW TURNS, NEVER SET/ },
  { name: 'vert_air_drifts_out', outside: 'an air coming down in the wrong place: no frame breaks — A LIP AIR COMES BACK DOWN says it', why: 'a vert air left where it drifted: out of the Basin\'s west wall it came down on the deck behind the coping (215 m/s²)', edits: [{ file: R('sim/body.js'),
      old: '    if (air.vert && A.vert > 0) {', new: '    if (false) {' }],
    test: 'surfaces.mjs', catches: /✖ A LIP AIR COMES BACK DOWN INTO ITS RAMP/ },
  { name: 'motion_straight_limb_snaps', starts: 'bones', why: 'a straight limb\'s bend plane from the bound pose again: a grab\'s arm snapping its twist', edits: [{ file: R('view/skater.js'), old: 'let bn = new V3().crossVectors(pl, dir); if (bn.lengthSq() < 1e-8) bn = bendBind.clone(); bn.normalize();', new: 'let bn = new V3().crossVectors(dU, dL); if (bn.lengthSq() < 1e-8) bn = bendBind.clone(); bn.normalize();' },
      { file: R('view/skater.js'), old: 'if (prevOff && dt > 0) {', new: 'if (false) {' }],
    test: 'motion.mjs', catches: /✖ NO POPS through an ollie with a grab/ },
  /* THE STITCHES ARE A WEAVE'S KIND OF DETAIL: their dashes kept whole until a period spans four pixels (cl_fade) crawled at 1.3 m */
  { name: 'stitch_dashes_to_four_px', why: 'the stitches as V10 drew them: dashes kept whole to four pixels a dash, their edges and the thread a hard sub-pixel line (48 tiles of the middle view against 3)', edits: [{ file: R('view/cloth.js'), old: "  float x = d - d0, a = fract(u / 0.0034) * 0.0034, e = max(0.0004, cl_px);\n  float dash = cl_ss(0.0, e, a) * (1.0 - cl_ss(0.0025 - 0.5 * e, 0.0025 + 0.5 * e, a));\n  float across = cl_line(x, 0.0004), line = cl_line(x, 0.0005);\n  float row = mix(0.45 * line, across * dash, cl_wfade(0.0034)) * cl_fade(0.0016);", new: "  float x = d - d0, a = fract(u / 0.0034) * 0.0034;\n  float dash = cl_ss(0.0, 0.0004, a) * (1.0 - cl_ss(0.0023, 0.0027, a));\n  float across = 1.0 - cl_ss(0.0003, 0.0005, abs(x)), line = 1.0 - cl_ss(0.0003, 0.0007 + cl_px * 0.5, abs(x));\n  float row = mix(0.45 * line, across * dash, cl_fade(0.0034)) * cl_fade(0.0016);" }],
    drive: ['cloth.mjs', '390x844'], reported: true, catches: /ℹ mid — reported[^\n]*?; ([1-9]\d+) tiles where/ },   // the mid view is reported until green (3 tiles shipped): caught when it climbs to 10 or more
  { name: 'relief_by_colour_rule', why: 'the seams\' groove and ridge faded by colour\'s rule (a quarter, a half of their width): their slope, read a pixel over, crawled at 1.3 m', edits: [{ file: R('view/cloth.js'), old: '* cl_rfade(0.0011);', new: '* cl_fade(0.0024);' }, { file: R('view/cloth.js'), old: '* cl_rfade(0.003);', new: '* cl_fade(0.0045);' }],
    drive: ['cloth.mjs', '390x844'], reported: true, catches: /ℹ mid — reported[^\n]*?; ([1-9]\d+) tiles where/ },   // the mid view is reported until green (3 tiles shipped): caught when it climbs to 10 or more
  { name: 'rise_one_pixel', why: 'a raised region\'s height softened over one pixel, as a colour is: its slope, read through the derivatives that step every second pixel, shaded a crawling line (the chest pocket at 1.3 m)',
    edits: [{ file: R('view/cloth.js'), old: 'float cl_rise(float d) { float w = max(0.0003, 4.0 * cl_px);', new: 'float cl_rise(float d) { float w = max(0.0003, cl_px);' }],
    drive: ['cloth.mjs', '390x844'], reported: true, catches: /ℹ mid — reported[^\n]*?; ([1-9]\d+) tiles where/ },   // the mid view is reported until green (3 tiles shipped): caught when it climbs to 10 or more
  /* NO HARD GATE DRAWS A LINE (the supervisor's class sweep, 10-16): tests/hard_gates.mjs */
  { name: 'brow_strands_switched', why: 'the supervisor\'s V11 brows: each strand switched on or off by a hash (the scribble of V10), not moved by it', edits: [{ file: R('view/cloth.js'), old: '* (0.45 + 0.55 * wlHash(vec2(i, floor(dot(at, dir) / len + h1) + 17.0 + fl)));', new: '* step(0.4, wlHash(vec2(i, floor(dot(at, dir) / len + h1) + 17.0 + fl)));' }],
    test: 'hard_gates.mjs', catches: /✖ \d+ gates in the cloth's height/ },
  { name: 'gate_shielded_step', why: 'the supervisor\'s, round 16: a step() on a line that holds a classified gate (the side seam\'s) — a wall that classified lines passed it whole', edits: [{ file: R('view/cloth.js'), old: 'cl_seamW(p.z + 0.012, p.y, 0.0045, th, cl_ss(0.08, 0.11, ax) * cl_ss(1.32, 1.30, p.y))', new: 'cl_seamW(p.z + 0.012, p.y, 0.0045, th, step(0.095, ax) * cl_ss(1.32, 1.30, p.y))' }],
    test: 'hard_gates.mjs', catches: /✖ \d+ gates in the cloth's height/ },
  { name: 'gate_hem_step', why: 'the hem fold\'s envelope cut by step(0.997): a hard dark line under the hem stitching', edits: [{ file: R('view/cloth.js'), old: 'cl_ss(1.075, 1.0, p.y) * cl_ss(0.990, 0.997, p.y), 0.019, ao);', new: 'cl_ss(1.075, 1.0, p.y) * step(0.997, p.y), 0.019, ao);' }],
    test: 'hard_gates.mjs', catches: /✖ \d+ gates in the cloth's height/ },
  { name: 'gate_outseam_cut', why: 'the outseam cut dead at 0.93, mid-hip', edits: [{ file: R('view/cloth.js'), old: 'if (p.y < 1.0) h += cl_seamW(t * r, s, 0.005, th, cl_ss(1.0, 0.98, p.y));', new: 'if (p.y < 0.93) h += cl_seam(t * r, s, 0.005, th);' }],
    test: 'hard_gates.mjs', catches: /✖ \d+ gates in the cloth's height/ },
  { name: 'gate_pocket_switched', why: 'the cargo pocket read from the side or the front by a switch on its normal: its outline broke on a line', edits: [{ file: R('view/cloth.js'), old: 'float wS = cl_ss(-0.2, 0.2, abs(n.x) - abs(n.z)),', new: 'float wS = abs(n.x) > abs(n.z) ? 1.0 : 0.0,' }],
    test: 'hard_gates.mjs', catches: /✖ \d+ gates in the cloth's height/ },
  { name: 'hud_no_backdrop', why: 'the score\'s backdrop taken away: its letters on the open sky (measured 1.3–2.5 : 1 for the number, under 2 : 1 for the lines)', edits: [{ file: 'build/css/waxline.css', old: 'border-radius: 12px; background: rgba(21, 19, 15, 0.7); box-shadow: 0 0 18px 6px rgba(21, 19, 15, 0.3);', new: '' }],
    drive: ['hud.mjs', '390x844'], catches: /✖ (the number|its label|the best combo) / },
  { name: 'hud_backdrop_light', why: 'the backdrop as first tried (0.6): the sun\'s disc behind it takes the small lines to 3.9 : 1', edits: [{ file: 'build/css/waxline.css', old: 'background: rgba(21, 19, 15, 0.7);', new: 'background: rgba(21, 19, 15, 0.6);' }],
    drive: ['hud.mjs', '844x390'], catches: /the sun behind it.*✖ (its label|the best combo) / },
  { name: 'wheels_float', why: 'the axle set a wheel\'s radius high: every wheel 26 mm over the ground', edits: [{ file: R('view/board.js'), old: 'axleY = -T - th, wx', new: 'axleY = -T - th + B.wheel / 2, wx' }],
    drive: ['kit.mjs', '390x844'], catches: /✖ WHEELS/ },
  /* F1 and F5 (10-17): the catch at the top, the straightening on the way down, the big landings' edge, collide-and-slide, the body carried at the legs' limit */
  { name: 'limit_body_slides_round', outside: 'the body\'s gap: its own reader (tests/lib/gap.mjs) reads it', why: 'the trunk\'s gap held at the legs\' limit with only its outward rate taken: the body slid round the board at the limit (the Deck Quarter\'s slant on Cruise: 171° in 0.2 s, her head against the ramp)', edits: [{ file: R('view/skater.js'), old: '        const l = at.y.length(); if (l > LEGS.tilt) { at.y.multiplyScalar(LEGS.tilt / l); const e = at.y.clone().divideScalar(LEGS.tilt), r = at.yv.dot(e); at.yv.copy(e).multiplyScalar(Math.min(0, r)); }', new: '        const l = at.y.length(); if (l > LEGS.tilt) { at.y.multiplyScalar(LEGS.tilt / l); const r = at.yv.dot(at.y) / LEGS.tilt; if (r > 0) at.yv.addScaledVector(at.y, -r / LEGS.tilt); }' }],
    test: 'camera_moving.mjs', catches: /THE BODY IS CARRIED AT THE LEGS' LIMIT, every air[^\n]*✖/ },
  { name: 'walls_stop_without_slide', outside: 'a move lost: the slide wall counts it', why: 'the walls\' stop on the path left the rest of the step behind: a board pressing into a fence while moving along it lost its move every step and stood pinned (F1 on Raw: the deck 1.1 cm)', edits: [{ file: R('sim/body.js'), old: '        if (rest) {', new: '        if (rest && false) {' }],
    test: 'slide.mjs', catches: /✖ A STOP AT A FACE KEEPS ITS STEP/ },
  { name: 'rolling_stop_without_slide', outside: 'a move lost: the slide wall counts it', why: 'a wheel stopped at a face it cannot ride up left the rest of the step behind: the ledges\' faces and the planter (up to 11 mm a step)', edits: [{ file: R('sim/body.js'), old: '    for (let bump = 0; bump < 3 && left > 1e-7; bump++) {', new: '    for (let bump = 0; bump < 1 && left > 1e-7; bump++) {' }],
    test: 'slide.mjs', catches: /✖ A STOP AT A FACE KEEPS ITS STEP/ },
  /* THE AIR'S STOP AND THE EDGE'S HOLD (10-17, the coping reading: a Raw air hung in the air on the west fence's top; a pop at the Spine's end
     hung on that coping's end — the class of a stop that discards the step's rest) */
  { name: 'air_stop_without_slide', outside: 'a move lost: the slide wall counts it', why: 'the air\'s wall stopped the body on its path and left the rest of the step behind: grazing the fence\'s top edge, every later step stopped at its own start and the air never ended (the Raw Lawn Quarter ±40° @9)', edits: [{ file: R('sim/body.js'), old: '      for (let bump = 0; bump < 3 && left; bump++) {', new: '      for (let bump = 0; bump < 0 && left; bump++) {' }],
    test: 'slide.mjs', catches: /✖ A STOP AT A FACE KEEPS ITS STEP, IN THE AIR/ },
  { name: 'air_stop_hangs_a_lip_air', outside: 'an air that never ends: the coping wall says it', why: 'the same stop, read where the coping reading found it: a Raw lip air off the Lawn Quarter at ±40° @9 into the west fence never landed, ground or bailed', edits: [{ file: R('sim/body.js'), old: '      for (let bump = 0; bump < 3 && left; bump++) {', new: '      for (let bump = 0; bump < 0 && left; bump++) {' }],
    test: 'coping_capture.mjs', catches: /✖ AN AIR ENDS/ },
  { name: 'edge_hold_never_hangs_up', outside: 'an air that never ends: the slide wall says it', why: 'a deck held on a rail\'s corner at its own step\'s start was held again, never hung up: a pop at the Spine\'s end rested on that coping\'s end and hung in the air, its move along the deck unspent', edits: [{ file: R('sim/body.js'), old: '        if (dm.s <= 0) { this.toBail(\'hangup\', Math.max(0, -vn)); return true; }', new: '        if (false) { this.toBail(\'hangup\', Math.max(0, -vn)); return true; }' }],
    test: 'slide.mjs', catches: /✖ EVERY AIR ENDS/ },
  /* THE TURN, PLANNED (10-17): the in-air straightening's least-jerk law, the sim's own contact signal, and the census's row 19 */
  { name: 'turn_law_spring_back', outside: 'the assist\'s step: the every-air yaw gate reads it', why: 'the heading\'s landing turn back on the spring timed by the landing (ω = 6/t, to 40): front-loaded, a Classic Basin -25° @6.5 lip air\'s 21° share 0.17 s out started at 305 rad/s²', edits: [{ file: R('sim/body.js'), old: '    if (land) planned(h, 0, Math.max(1e-4, land.t), dt, TURN_A);', new: '    if (land) { const om = V.clamp(6 / Math.max(0.05, land.t), 10, 40); carry(second({ f: om / (2 * Math.PI), z: 1 }), h, 0, dt); h.udd = -om * om * h.u - 2 * om * h.ud; }' }],
    test: 'coping_capture.mjs', catches: /✖ THE LANDING YAW NEVER STEPS, ON EVERY AIR/ },
  { name: 'contact_pivot_doubled_unsaid', outside: 'a contact\'s turn hidden as the assist\'s: the every-air yaw gate reads it', why: 'a wheel\'s pivot in the air turned twice as far and not said (body.js airTouch): the gate, reading the frames by the sim\'s own signal, takes it for the assist\'s turn', edits: [{ file: R('sim/body.js'), old: '      V.norm(this.up, V.rotate(this.up, this.up, ax, th)); V.norm(this.fwd, V.reject(this.fwd, V.rotate(this.fwd, this.fwd, ax, th), this.up)); this.airTouch++;   // (a contact turned the board: said)', new: '      V.norm(this.up, V.rotate(this.up, this.up, ax, 2 * th)); V.norm(this.fwd, V.reject(this.fwd, V.rotate(this.fwd, this.fwd, ax, 2 * th), this.up));' }],
    test: 'coping_capture.mjs', catches: /✖ THE LANDING YAW NEVER STEPS, ON EVERY AIR/ },
  { name: 'contact_pivot_doubled_said', holds: true, why: 'the twin: the same doubled pivot, said — a contact\'s turn, however large, is the contacts\' class: the gate\'s line stays green', edits: [{ file: R('sim/body.js'), old: '      V.norm(this.up, V.rotate(this.up, this.up, ax, th)); V.norm(this.fwd, V.reject(this.fwd, V.rotate(this.fwd, this.fwd, ax, th), this.up)); this.airTouch++;   // (a contact turned the board: said)', new: '      V.norm(this.up, V.rotate(this.up, this.up, ax, 2 * th)); V.norm(this.fwd, V.reject(this.fwd, V.rotate(this.fwd, this.fwd, ax, 2 * th), this.up)); this.airTouch++;' }],
    test: 'coping_capture.mjs', catches: /THE LANDING YAW NEVER STEPS, ON EVERY AIR/ },
  { name: 'contact_said_unmade', outside: 'a contact said where none was made: the every-air yaw gate\'s check reads it', why: 'the sim\'s contact signal said on the assist\'s own frames (every air step), where no contact acted: the gate would exclude every frame, and the check finds no face near the board', edits: [{ file: R('sim/body.js'), old: '    this.wheelsOut();   // a wheel that begins the step inside a solid is brought out first (a sweep from inside meets no face)', new: '    this.wheelsOut(); this.airTouch++;   // a wheel that begins the step inside a solid is brought out first (a sweep from inside meets no face)' }],
    test: 'coping_capture.mjs', catches: /✖ THE LANDING YAW NEVER STEPS, ON EVERY AIR[^\n]*steps said one, [1-9]\d* with none made/ },
  /* THE STOP SITES (tests/stops.mjs: the census as the source's own table) */
  { name: 'sim_step_throws', why: 'a throw in the sim\'s step (the kind round 25\'s seat threw), the page\'s guard in place: the frames keep coming, and the fault must be said', edits: [{ file: R('sim/body.js'), old: '  step(dt, input) {\n    this.t += dt;', new: '  step(dt, input) {\n    if (this.t > 2 && !this._thrown) { this._thrown = true; throw new TypeError("Cannot read properties of null (reading \'0\')"); }\n    this.t += dt;' }],
    drive: ['frames.mjs', '390x844'], catches: /✖ THE GAME SAID A FAULT/ },
  { name: 'frame_guard_removed', why: 'the same throw with the next frame asked only after the tick (the page as it shipped): the game stands still, the body down', edits: [{ file: R('sim/body.js'), old: '  step(dt, input) {\n    this.t += dt;', new: '  step(dt, input) {\n    if (this.t > 2 && !this._thrown) { this._thrown = true; throw new TypeError("Cannot read properties of null (reading \'0\')"); }\n    this.t += dt;' }, { file: R('main.js'), old: '    requestAnimationFrame(frame);\n    try { tick(now); } catch (e) { faulted(e); }\n', new: '    tick(now); requestAnimationFrame(frame);\n' }],
    drive: ['frames.mjs', '390x844'], catches: /✖ THE FRAMES STOPPED/ },
  { name: 'sim_step_throws_webkit', why: 'a throw in the sim\'s step (the kind round 25\'s seat threw), the page\'s guard in place: the frames keep coming, and the fault must be said', edits: [{ file: R('sim/body.js'), old: '  step(dt, input) {\n    this.t += dt;', new: '  step(dt, input) {\n    if (this.t > 2 && !this._thrown) { this._thrown = true; throw new TypeError("Cannot read properties of null (reading \'0\')"); }\n    this.t += dt;' }],
    drive: ['frames.mjs', '390x844', 'webkit'], catches: /✖ THE GAME SAID A FAULT/ },
  { name: 'frame_guard_removed_webkit', why: 'the same throw with the next frame asked only after the tick (the page as it shipped): the game stands still, the body down', edits: [{ file: R('sim/body.js'), old: '  step(dt, input) {\n    this.t += dt;', new: '  step(dt, input) {\n    if (this.t > 2 && !this._thrown) { this._thrown = true; throw new TypeError("Cannot read properties of null (reading \'0\')"); }\n    this.t += dt;' }, { file: R('main.js'), old: '    requestAnimationFrame(frame);\n    try { tick(now); } catch (e) { faulted(e); }\n', new: '    tick(now); requestAnimationFrame(frame);\n' }],
    drive: ['frames.mjs', '390x844', 'webkit'], catches: /✖ THE FRAMES STOPPED/ },
  { name: 'card_overflows_above', why: 'the cards centred with nothing to keep them on the screen, the pause card\'s notes uncapped (round 25 as frozen): on a turned phone in WebKit the pause card\'s Resume sat 7 px above the screen, "Paused" above it', edits: [{ file: 'build/css/waxline.css', old: 'place-content: center; place-content: safe center; overflow-y: auto; overscroll-behavior: contain; justify-items: center;', new: 'place-content: center; justify-items: center;' }, { file: 'build/css/waxline.css', old: '.wl-card.wl-small .wl-cut { max-height: 22vh; overflow-y: auto; }\n', new: '' }],
    test: 'drive/landscape.mjs', catches: /✖ webkit, turned[^\n]*#wl-resume off the screen/ },
  { name: 'one_step_seat', why: 'the landing\'s seat set in one step again (the settle\'s clamp off): a bevel\'s first touch then the wall turned the board 22° in a step', edits: [{ file: R('sim/body.js'), old: '      if (need > most + 1e-6) { const ax = V.cross', new: '      if (false && need > most + 1e-6) { const ax = V.cross' }],
    test: 'coping_capture.mjs', catches: /✖ \(A\) THE SEAT NEVER SETS[^\n]*every seat's turn in its step at most its contact's bound: [1-9]\d* over/ },
  { name: 'settle_frozen', why: 'a settle that never turns the board (its pace nothing): the board held tilted on the ground, its settle never ending — a hang', edits: [{ file: R('sim/body.js'), old: 'most = (st.w + 1.5 * PH.gGround / PH.wheelbase * (this.t - st.t0)) * PH.step;', new: 'most = 0;' }],
    test: 'coping_capture.mjs', catches: /✖ \(A\) THE SEAT NEVER SETS[^\n]*every settle ended: [1-9]\d* hung/ },
  { name: 'seat_from_unset', why: 'round 25\'s settle as it shipped to his snapshot: the edge\'s hold skipping the settle\'s block, and the settle\'s start set only inside it (a seat that goes the hold leaves it unset, and the re-seat reads null): the throw that froze the page', edits: [{ file: R('sim/body.js'), old: '    if (this.settle && !this._reseat) this.settle.from = up0.slice();\n', new: '' }, { file: R('sim/body.js'), old: '    if (st) {\n      const need', new: '    if (st && !hold) {\n      if (!this._reseat) st.from = up0.slice();\n      const need' }],
    test: 'never_throws.mjs', catches: /✖ THE SIM NEVER THROWS[^\n]*[1-9]\d* threw/ },
  { name: 'pose_unclassified', outside: 'the census of the sites that set the board\'s attitude reads the source', why: 'the board\'s up set on the ground from the one face under its middle, on no row of the census and handed to no seat: the support\'s one-face reading put back', edits: [{ file: R('sim/body.js'), old: '    this.walls(dt, before);\n    this.ahead = this.leanAhead();', new: '    this.walls(dt, before);\n    { const g0 = this.world.groundAt(this.p[0], this.p[1] + 0.3, this.p[2], 1); if (g0) V.copy(this.up, g0.normal); }\n    this.ahead = this.leanAhead();' }],
    test: 'poses.mjs', catches: /✖ THE SITES THAT SET THE BOARD'S ATTITUDE ARE CLASSIFIED[^\n]*1 unclassified/ },
  { name: 'stop_unclassified', outside: 'the census of the stop sites reads the source', why: 'a new stop in the air, on no row of the census: the step set back halfway along its path and the rest dropped, unsaid', edits: [{ file: R('sim/body.js'), old: '    moved(this.p, this.v, PH.gAir, dt);   // by the step\'s mean velocity', new: '    moved(this.p, this.v, PH.gAir, dt); if (this.p[1] > 30) V.lerp(this.p, before, this.p, 0.5);   // by the step\'s mean velocity' }],
    test: 'stops.mjs', catches: /✖ THE STOP SITES ARE CLASSIFIED[^\n]*1 unclassified/ },
  { name: 'stop_unsaid', outside: 'the census of the stop sites reads the source', why: 'the ground walls\' level face (the census, row 13) back to its silent stop: the rest of the step dropped with nothing said', edits: [{ file: R('sim/body.js'), old: 'if (l < 1e-6) { if (rest) this.noteDropped(V.len(rest), \'the walls (a level face)\'); continue; }', new: 'if (l < 1e-6) { continue; }' }],
    test: 'stops.mjs', catches: /✖ THE STOP SITES ARE CLASSIFIED[^\n]*1 that no longer say so/ },
  { name: 'drop_in_unshared', outside: 'a landing\'s outcome: the outcomes wall reads it', why: 'the drop-in\'s path bent down the wall by the vert assist (turnDown), its heading given no share of that turn: a 2.4 m/s drop-in over the Basin\'s west rim (Cruise, the Lawn Quarter -25° @9, its second air) comes down 67° off its travel and bails', edits: [{ file: R('sim/body.js'), old: '    const bent = (air.vert || air.drop) && A.vert > 0;', new: '    const bent = air.vert && A.vert > 0;' }],
    test: 'outcomes.mjs', catches: /✖ THE LANDINGS KEEP THEIR OUTCOMES/ },
  { name: 'up_unpaced', reported: true, why: 'the up planned with no pace (the heading\'s own): a grazing drop-in\'s first touch, a guess that jumps, chased at up to 3,392 rad/s²', edits: [{ file: R('sim/body.js'), old: '    if (upLand) planned(s, { x: 0, y: 0, z: 0 }, Math.max(1e-4, upLand.t), dt, TURN_A);', new: '    if (upLand) planned(s, { x: 0, y: 0, z: 0 }, Math.max(1e-4, upLand.t), dt);' }],
    test: 'coping_capture.mjs', catches: /THE UP'S TURN IN THE AIR[^\n]*its acceleration the most ([3-9]\d\d|\d{4,}) rad/ },
  { name: 'wheel_stop_keeps_pressing', outside: 'a board held in the air: the slide wall says it', why: 'the census\'s row 19, the air\'s end-on wheel stop, planted as a freeze: set back to its step\'s start and its velocity into the face kept, every step presses into the face and stands where it began — boards held 21 steps, one air 2.4 s; every air still ends (its fall lands it), so AN AIR ENDS cannot see it', edits: [{ file: R('sim/body.js'),
      old: '        atFree(w.i, w.s); this.noteDropped(V.len(V.sub([0, 0, 0], fe.p, this.p)), \'a wheel against a face in the air\');   // the rest: said (the census, row 19)\n        const vn = V.dot(this.v, n);\n        if (vn < 0) { if (-vn > PH.body.bailSpeed) { this.toBail(\'wall\', -vn); return true; } V.addScaled(this.v, this.v, n, -vn); this.events.push({ type: \'scrape\', speed: -vn }); }   // §4.4: a face met at more than 3 m/s along its normal',
      new: '        atFree(w.i, 0); this.noteDropped(V.len(V.sub([0, 0, 0], fe.p, this.p)), \'a wheel against a face in the air\');   // PLANT: back to the step\'s start\n        const vn = V.dot(this.v, n);\n        if (vn < 0) { this.events.push({ type: \'scrape\', speed: -vn }); }   // PLANT: the velocity into the face kept' }],
    test: 'slide.mjs', catches: /✖ AN AIR IS NEVER HELD/ },
  { name: 'seat_after_each_part', outside: 'a seat off the path: the touchdown\'s own-move gate reads it', why: 'the board seated after each part of a rolling step, not once after them: against the Spine\'s ridge three seats set it 1.6 cm off its path in a step', edits: [{ file: R('sim/body.js'), old: '      met = true; left = this._left;', new: '      met = true; left = this._left; this.attach();' }],
    test: 'camera_moving.mjs', catches: /the board on Classic: A TOUCHDOWN'S OWN MOVE[^\n]*✖/ },
  { name: 'grind_caught_from_below', outside: 'a catch from below: the catch-from-above wall reads it', why: 'F5: a rail caught from under its top — the old band, a step begun up to 5 cm under it taken onto it (off Kiln Yard\'s barrier the hips took 349 m/s²)', edits: [{ file: R('sim/body.js'), old: '      if (before[1] < q[1] + 0.005 - CATCH_TOL) continue;', new: '      if (before[1] < q[1] - 0.05) continue;' }],
    test: 'catch_from_above.mjs', catches: /✖ A RAIL IS MET FROM ABOVE — UNDER/ },
  { name: 'grind_catch_over_the_top', starts: 'board', why: 'the catch taken anywhere within 3 cm over the rail\'s top, its fall stopped there and the lock easing it down the rest: on Classic the Main Ledge\'s deck took 3.1 cm and gave it back', edits: [{ file: R('sim/body.js'), old: '    if (above > 0) { if (this.v[1] <= 0) this.steerToRail(best, above, dt); return false; }', new: '    if (above > PH.grind.contact) { if (this.v[1] <= 0) this.steerToRail(best, above, dt); return false; }' }, { file: R('sim/body.js'), old: '    this.p[1] = top;\n', new: '' }],
    test: 'surfaces.mjs', args: ['Main Ledge'], catches: /✖ the deck never jumps on the ground: a move the path takes and gives back, at most [1-9]\.\d cm[^\n]*Main Ledge/ },
  { name: 'straightening_set_at_touchdown', outside: 'the touchdown\'s own step: the every-air yaw gate reads its set off the land event', why: 'the spin assist\'s straightening SET at the touchdown again (the 10-16 fault), not turned on the ground: on Classic 24.6° in the landing\'s step', edits: [{ file: R('sim/body.js'), old: '    this.catchTurn = j.straight ? { w: air.headW || 0, a: air.headA || 0, t0: this.t, from: j.touched } : null;', new: '    if (j.straight) V.copy(this.fwd, j.straight); this.catchTurn = null;' }],
    test: 'coping_capture.mjs', catches: /✖ THE LANDING YAW NEVER STEPS, ON EVERY AIR[^\n]*sets at most 4\.46° — the most ([5-9]|\d\d)/ },
  { name: 'catch_set_at_once', outside: 'the catch on the ground: the every-air yaw gate\'s frames run through it', why: 'the catch turned whole in its first step on the ground, not at a rider\'s pace: the snap moved a step later', edits: [{ file: R('sim/body.js'), old: '        const turn = h.u + need, nf = V.norm(S[10], V.rotate(S[10], this.fwd, u2, turn));', new: '        const turn = need, nf = V.norm(S[10], V.rotate(S[10], this.fwd, u2, turn));' }],
    test: 'coping_capture.mjs', catches: /✖ THE LANDING YAW NEVER STEPS, ON EVERY AIR[^\n]*the most \d+ \([^)]*\(roll, the catch\)/ },
  { name: 'big_landing_edge_set', outside: 'a class\'s edge: the impulse gate reads it', why: 'the big landings\' edge set at 6.0 m/s, not derived from the squat the legs have (√(2·0.10·150) = 5.5): a roll-off landing at 5.6 m/s judged in the ordinary class, its hips 155', edits: [{ file: 'tests/lib/legs.mjs', old: 'export const BIG = { impact: Math.sqrt(2 * SQUAT_NOW * 150) };', new: 'export const BIG = { impact: 6.0 };' }],
    test: 'surfaces.mjs', args: ['Lawn Quarter'], catches: /✖ the hips through an impulse/ },
  /* MOBILE (R5, 10-17): the full-screen control, the turn, the phone's weight */
  { name: 'fullscreen_offered_in_a_frame', outside: 'the page\'s mobile wiring: its own wall reads it', why: 'R5.1: the full-screen control offered inside a frame (the platform\'s note page is immersive by itself)', edits: [{ file: R('view/fullscreen.js'), old: '  try { framed = win.self !== win.top; } catch (e) { framed = true; }', new: '  framed = false;' }],
    test: 'fullscreen.mjs', catches: /✖ THE CONTROL IS OFFERED ONLY WHERE IT CAN DO SOMETHING/ },
  { name: 'fullscreen_bars_shown', outside: 'the page\'s mobile wiring: its own wall reads it', why: 'R5.1: the whole screen asked with the browser\'s bars left showing', edits: [{ file: R('view/fullscreen.js'), old: 'requestFullscreen({ navigationUI: \'hide\' }); said.push', new: 'requestFullscreen(); said.push' }],
    test: 'fullscreen.mjs', catches: /✖ ITS PRESS/ },
  { name: 'fullscreen_lock_first', outside: 'the page\'s mobile wiring: its own wall reads it', why: 'R5.1: the landscape lock asked before the page is full screen (a phone refuses it then)', edits: [{ file: R('view/fullscreen.js'), old: '  const doc = win.document, said = [];\n  try { await doc.documentElement.requestFullscreen', new: '  const doc = win.document, said = [];\n  try { await win.screen.orientation.lock(\'landscape\'); } catch (e) { /* */ }\n  try { await doc.documentElement.requestFullscreen' }],
    test: 'fullscreen.mjs', catches: /✖ ITS PRESS/ },
  { name: 'turn_pauses', outside: 'the page\'s mobile wiring: its own wall reads it', why: 'R5.2: a turn of the phone taken as a hide: the run paused, its card shown', edits: [{ file: R('main.js'), old: '  window.addEventListener(\'resize\', () => { stage.resize(); controls.layout(); });', new: '  window.addEventListener(\'resize\', () => { stage.resize(); controls.layout(); if (mode === \'play\') setMode(\'pause\'); });' }],
    drive: ['turn.mjs', '390x844'], catches: /✖ TURNING THE PHONE KEEPS THE RUN/ },
  { name: 'phone_surface_too_large', outside: 'the page\'s mobile wiring: its own wall reads it', why: 'R5.4: a drawing surface past 4096×4096 (E-PHONE-SURFACE-TOO-LARGE: the LittleJS ports\' 5760×3240 frames ended in the owner\'s phone) — the leaves\' sheet painted at 4352', edits: [{ file: R('view/trees.js'), old: '  const S = 512, c = document.createElement(\'canvas\');', new: '  const S = 4352, c = document.createElement(\'canvas\');' }],
    drive: ['phone_budget.mjs', '390x844'], init: 'weigh_tally.js', catches: /✖ THE PHONE BUDGET HOLDS TURNED AND TURNED BACK[^\n]*the largest surface 4352×4352/ },
  { name: 'phone_turn_leaks', outside: 'the page\'s mobile wiring: its own wall reads it', why: 'R5.4: a frame made at every resize and never let go (W-GROWS-WHEN-TURNED: the held weight rises at every change)', edits: [{ file: R('view/stage.js'), old: '    this.dpr = dpr;\n  }', new: '    this.dpr = dpr;\n    { const c = document.createElement(\'canvas\'); c.width = 2048; c.height = 2048; c.getContext(\'2d\'); (this._held = this._held || []).push(c); }\n  }' }],
    drive: ['phone_budget.mjs', '390x844'], init: 'weigh_tally.js', catches: /✖ THE PHONE BUDGET HOLDS TURNED AND TURNED BACK/ },
  /* THE HANDS (R6.1, 10-17) */
  { name: 'hands_in_the_cargos', outside: 'the arms\' pose: the hands wall reads it', why: 'R6.1: the hands brought to the shoulders\' line (4 cm out): the baggy cargos took them 3.7–5.2 cm in', edits: [{ file: R('view/skater.js'), old: '      const out = 0.12 + st.arms * (sd === \'L\' ? 0.14 : 0.1) + st.air * (sd === \'L\' ? 0.07 : 0.05) + Math.abs(st.leanA) * 0.2 + 0.03 * bal;', new: '      const out = 0.04 + st.arms * (sd === \'L\' ? 0.14 : 0.1) + st.air * (sd === \'L\' ? 0.07 : 0.05) + Math.abs(st.leanA) * 0.2 + 0.03 * bal;' }],
    test: 'hands.mjs', catches: /✖ THE HANDS HANG AT THE THIGHS' SIDES/ },
  { name: 'hands_held_out', outside: 'the arms\' pose: the hands wall reads it', why: 'R6.1: the hands held out where nothing calls for balance (20 cm off the shoulders\' line: an A)', edits: [{ file: R('view/skater.js'), old: '      const out = 0.12 + st.arms * (sd === \'L\' ? 0.14 : 0.1) + st.air * (sd === \'L\' ? 0.07 : 0.05) + Math.abs(st.leanA) * 0.2 + 0.03 * bal;', new: '      const out = 0.2 + st.arms * (sd === \'L\' ? 0.14 : 0.1) + st.air * (sd === \'L\' ? 0.07 : 0.05) + Math.abs(st.leanA) * 0.2 + 0.03 * bal;' }],
    test: 'hands.mjs', catches: /✖ THE HANDS HANG AT THE THIGHS' SIDES/ },
  { name: 'balance_arms_gone', outside: 'the arms\' pose: the hands wall reads it', why: 'R6.1: the balance arms taken away on a grind and in a manual (the arms hung at the sides)', edits: [{ file: R('view/skater.js'), old: "    st.arms = k(s.state === 'grind' || s.state === 'manual' || s.state === 'lip' ? 1 : s.state === 'air' ? 0.6 : 0, st.arms, 0.15);", new: '    st.arms = 0;' }],
    test: 'hands.mjs', catches: /✖ THE BALANCE ARMS STAY WHERE A TRICK ASKS/ },
  /* THE INSTRUMENT: a red gate names its frame (10-17) */
  { name: 'red_gate_names_no_frame', outside: 'the instrument itself: a red gate that names no frame is its own red line', why: 'the supervisor, 10-17: a red gate handed the chain words that name no frame ("1.283 s (4.60 m/s)") and the blame said the frame was never recorded — the rail-end gate\'s phrase handed again, with a rail\'s end clamped to make it red', edits: [{ file: 'tests/surfaces.mjs', old: 'w, w.railEnd.f); }', new: 'w, w.railEnd.at); }' }, { file: R('sim/body.js'), old: '{ this.placeOnRail(); g.s = V.clamp(g.s, 0, r.length); this.leaveRail(true, \'end\'); return; }', new: '{ g.s = V.clamp(g.s, 0, r.length); this.placeOnRail(); this.leaveRail(true, \'end\'); return; }' }],
    test: 'surfaces.mjs', args: ['Five Rail'], catches: /✖ A RED GATE NAMES ITS FRAME/ },
];

/* a planted tree: build/ and tests/ as they stand, the plant's edits applied; null and the reason when an edit no longer applies */
function make(p, dir) {
  mkdirSync(dir, { recursive: true }); cpSync(join(SRC, 'build'), join(dir, 'build'), { recursive: true }); cpSync(join(SRC, 'tests'), join(dir, 'tests'), { recursive: true });
  for (const e of p.edits) {
    const f = join(dir, e.file); let s = readFileSync(f, 'utf8');
    if (e.from != null) { const a = s.indexOf(e.from), b = a < 0 ? -1 : s.indexOf(e.to, a); if (a < 0 || b < 0 || s.indexOf(e.from, a + 1) >= 0) return 'STALE: ' + e.file + ' no longer holds ' + JSON.stringify(e.from.slice(0, 60)) + ' … ' + JSON.stringify(e.to.slice(0, 40)) + ' once'; s = s.slice(0, a) + e.new + s.slice(b); }
    else { const n = s.split(e.old).length - 1; if (e.all ? n < 1 : n !== 1) return 'STALE: ' + e.file + ' holds ' + JSON.stringify(e.old.slice(0, 70)) + ' ' + n + ' times'; s = s.split(e.old).join(e.new); }
    writeFileSync(f, s);
  }
  return null;
}
const sh = (cmd, args, cwd, log) => { const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 64 << 20 }); writeFileSync(log, (r.stdout || '') + (r.stderr || '') + (r.error ? '\n[spawn] ' + r.error.message : '')); return readFileSync(log, 'utf8'); };
function run(p, out) {
  const dir = join(out, p.name), tree = join(dir, 'tree'); if (existsSync(dir)) return { ok: false, line: 'this round already planted ' + p.name };
  const stale = make(p, tree); if (stale) return { ok: false, line: stale };
  let log, red;
  if (p.test) { log = sh('node', [join(tree, 'tests', p.test), ...(p.args || [])], W, join(dir, p.test.replace('.mjs', '').replace(/\//g, '_') + '.log')); red = /^[A-Z][A-Z ]+: RED\b/m.test(log); }   // args: a run filter, so a plant reads the runs its line is about
  else if (p.drive) { const [s, v, eng] = p.drive; log = sh('node', ['drive.mjs', join(tree, 'build'), join(tree, 'tests/drive', s), ...(eng === 'webkit' ? ['--engine', 'webkit'] : ['--gpu']), '--viewport', v, '--dpr', '3', '--out', join(dir, 'out'), ...(p.init ? ['--init', join(KIT, p.init)] : [])], KIT, join(dir, s.replace('.mjs', '') + '_' + v + (eng ? '_' + eng : '') + '.log'));   /* (a drive's third word: the engine — WebKit, a phone's own; Chromium on the GPU otherwise) */ red = /^DRIVE: RED/m.test(log); }   // init: a kit script every frame runs first (weigh_tally.js: the phone's weight)
  else if (p.sound) { sh('node', ['drive.mjs', join(tree, 'build'), join(tree, 'tests/drive/sound.mjs'), '--gpu', '--viewport', '390x844', '--out', join(dir, 'sound_drive')], KIT, join(dir, 'sound_drive.log')); log = sh('python3', [join(tree, 'tests/sound_measure.py'), join(dir, 'sound')], W, join(dir, 'measure.log')); red = /SOUND: RED/.test(log); }
  /* A WALL THAT NEVER RAN IS NEVER GREEN (10-17: run with a relative out dir, every drive plant's build path resolved inside the kit's own
     folder, its zip found no folder and the drive died before a page — and the runner read 35 dead drives as "GREEN — NOT CAUGHT"): a drive
     that printed no verdict, a wall that printed none, a sound run that measured nothing, is said as never run */
  const ran = p.test ? /^[A-Z][A-Za-z ']+: (GREEN|RED)\b/m.test(log) : p.drive ? /^DRIVE: (GREEN|RED)/m.test(log) : /SOUND: (GREEN|RED)/.test(log);
  if (!ran) return { ok: false, line: 'NEVER RAN — no verdict in its log: ' + ((log.match(/^.*(Error|threw|REFUSED|ENOENT)[^\n]*/m) || [log.trim().split('\n').pop() || '(an empty log)'])[0]).slice(0, 150) };
  const caught = p.catches.test(log), line = (log.match(new RegExp('^.*' + p.catches.source + '.*$', 'm')) || [''])[0].replace(/^\s*·\s*/, '').slice(0, 170);
  /* a plant on a REPORTED reading (`reported: true`: a reading that is not a gate yet, its drive green whatever it reads) is caught when that
     reading moves by its own line — and says so, never "RED" */
  if (p.reported) return { ok: caught, line: (caught ? 'CAUGHT ON A REPORTED READING (the drive green: not a gate yet)' : 'NOT CAUGHT (a reported reading, its line unmoved)') + (line ? ' · ' + line : '') };
  /* a TWIN (`holds: true`): the same edit made right — its line must stay green (✔ on it, never ✖): it proves the gate reads what the plant
     broke and not the edit's mere size (10-17: the doubled pivot said, beside the doubled pivot unsaid) */
  if (p.holds) { const green = new RegExp('✔ ' + p.catches.source).test(log), broke = new RegExp('✖ ' + p.catches.source).test(log), gl = (log.match(new RegExp('^.*' + (broke ? '✖ ' : '✔ ') + p.catches.source + '.*$', 'm')) || [''])[0].slice(0, 170);
    return { ok: green && !broke, line: (green && !broke ? 'HOLDS (the twin, green on its line)' : 'BROKE — the twin went red on its line') + (gl ? ' · ' + gl : '') }; }
  /* WHERE IT STARTS (tests/lib/chain.mjs): a plant that names its stage (`starts`) is blamed there — the chain's line under its catch, or
     the wall's first; a plant outside the chain's reach says why (`outside`) and what the chain said */
  let blame = '', blamedOk = true;
  if (red && caught && (p.starts || p.outside)) {
    const L = log.split('\n'), i = L.findIndex((l) => p.catches.test(l)), under = i >= 0 && /↳ where it starts: /.test(L[i + 1] || '') ? L[i + 1] : L.find((l) => /↳ where it starts: /.test(l)) || '';
    const st = (under.match(/where it starts: ([a-z]+) —/) || [])[1] || null;
    if (p.starts) { blamedOk = st === p.starts; blame = blamedOk ? ' · where it starts: ' + st + ' ✔' : ' · ✖ BLAMED ON ' + (st || 'nothing') + ', its edit is in ' + p.starts + ' (' + under.trim().slice(0, 120) + ')'; }
    else blame = ' · outside the chain (' + p.outside + ')' + (st ? '; it said ' + st : '');
  }
  return { ok: red && caught && blamedOk, line: (red ? 'RED' : 'GREEN — NOT CAUGHT') + (red && !caught ? ' but not by its own line (' + p.catches + ')' : '') + blame + (line ? ' · ' + line : '') };
}

/* does every plant's edit still apply to the tree as it stands? (read in memory: no copies, no instruments — a second's look) */
function stale(p) {
  const texts = {};
  for (const e of p.edits) {
    const s = texts[e.file] ?? (texts[e.file] = readFileSync(join(SRC, e.file), 'utf8'));
    if (e.from != null) { const a = s.indexOf(e.from), b = a < 0 ? -1 : s.indexOf(e.to, a); if (a < 0 || b < 0 || s.indexOf(e.from, a + 1) >= 0) return 'STALE: ' + e.file + ' no longer holds its span once'; texts[e.file] = s.slice(0, a) + e.new + s.slice(b); }
    else { const n = s.split(e.old).length - 1; if (e.all ? n < 1 : n !== 1) return 'STALE: ' + e.file + ' holds ' + JSON.stringify(e.old.slice(0, 70)) + ' ' + n + ' times'; texts[e.file] = s.split(e.old).join(e.new); }
  }
  return null;
}
const [cmd, outArg, ...only] = process.argv.slice(2), out = outArg && resolve(outArg);   // (an out dir is made absolute: its plants' trees are handed to the kit's drive, which runs in its own folder)
if (cmd === 'check') { let bad = 0; for (const p of PLANTS) { const r = stale(p); if (r) { bad++; console.log('✖ ' + p.name + ': ' + r); } } console.log((bad ? 'PLANTS CHECK: RED · ' + bad + ' stale' : 'PLANTS CHECK: GREEN') + ' · ' + PLANTS.length + ' plants'); process.exit(bad ? 1 : 0); }
if (cmd === 'list') { for (const p of PLANTS) console.log(p.name.padEnd(24) + ' ' + (p.test || (p.drive && p.drive.join(' ')) || 'sound') + ' — ' + p.why); process.exit(0); }
if (cmd !== 'run' || !out) { console.log('usage: node tests/plants.mjs list | check | run <out dir> [name…]'); process.exit(2); }
mkdirSync(out, { recursive: true }); const LOG = join(out, 'PLANTS.log'); let caught = 0, n = 0;
for (const p of PLANTS.filter((q) => !only.length || only.includes(q.name))) {
  const t0 = Date.now(), r = run(p, out); n++; if (r.ok) caught++;
  const line = (r.ok ? '✔ ' : '✖ ') + p.name + ' (' + (p.test || (p.drive && p.drive[0]) || 'sound') + ', ' + Math.round((Date.now() - t0) / 1000) + ' s): ' + r.line;
  console.log(line); appendFileSync(LOG, line + '\n');
}
const verdict = 'PLANTS: ' + (caught === n ? 'GREEN' : 'RED') + ' · ' + caught + ' of ' + n + ' caught on the instruments as they ship';
console.log(verdict); appendFileSync(LOG, verdict + '\n'); process.exit(caught === n ? 0 : 1);
