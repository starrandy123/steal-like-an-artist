/* SCULPTED IN CODE: a skater as smooth distance fields — limbs as tapered capsules, a head with a jaw, a nose, brows, lips and ears,
 * clothes as shells over the body, folds where cloth gathers — meshed by surface nets, region by region at the resolution each needs.
 * Pure maths (no three.js): returns positions, normals, a region per vertex and the bone each vertex follows. */

/* ---------------- distance functions ---------------- */
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);
function capsule(px, py, pz, a, b, r) { const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2], pax = px - a[0], pay = py - a[1], paz = pz - a[2]; const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz))); return len3(pax - bax * h, pay - bay * h, paz - baz * h) - r; }
/* a capsule whose radius runs from ra at a to rb at b (with an optional squash across one axis) */
function cone(px, py, pz, a, b, ra, rb, sq) {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2], pax = px - a[0], pay = py - a[1], paz = pz - a[2], L2 = bax * bax + bay * bay + baz * baz;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / L2));
  let dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h; if (sq) { dx *= sq[0]; dy *= sq[1]; dz *= sq[2]; }
  return len3(dx, dy, dz) - (ra + (rb - ra) * h);
}
function ellip(px, py, pz, c, r) { const x = (px - c[0]) / r[0], y = (py - c[1]) / r[1], z = (pz - c[2]) / r[2]; const k0 = len3(x, y, z), k1 = len3(x / r[0], y / r[1], z / r[2]); return k1 > 0 ? k0 * (k0 - 1) / k1 : -Math.min(r[0], r[1], r[2]); }
function rbox(px, py, pz, c, h, r) { const qx = Math.abs(px - c[0]) - h[0] + r, qy = Math.abs(py - c[1]) - h[1] + r, qz = Math.abs(pz - c[2]) - h[2] + r; return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r; }
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
const mix = (a, b, t) => a + (b - a) * t;

/* ---------------- the skeleton in its bind pose (model space: facing +z, left +x, y up; soles on y = 0) ---------------- */
export function bindSkeleton(h = 1.76) {
  const s = h / 1.76, P = (x, y, z) => [x * s, y * s, z * s];
  const B = {
    hips: { parent: null, head: P(0, 0.90, 0), tail: P(0, 1.06, 0) },
    spine: { parent: 'hips', head: P(0, 1.06, 0), tail: P(0, 1.24, -0.005) },
    chest: { parent: 'spine', head: P(0, 1.24, -0.005), tail: P(0, 1.42, -0.01) },
    neck: { parent: 'chest', head: P(0, 1.44, 0.0), tail: P(0, 1.54, 0.015) },
    head: { parent: 'neck', head: P(0, 1.54, 0.015), tail: P(0, 1.76, 0.02) },
  };
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    B['clav' + sd] = { parent: 'chest', head: P(0.03 * sx, 1.405, 0.0), tail: P(0.175 * sx, 1.42, -0.015) };
    B['arm' + sd] = { parent: 'clav' + sd, head: P(0.175 * sx, 1.42, -0.015), tail: P(0.255 * sx, 1.145, -0.03) };
    B['fore' + sd] = { parent: 'arm' + sd, head: P(0.255 * sx, 1.145, -0.03), tail: P(0.305 * sx, 0.905, 0.025) };
    B['hand' + sd] = { parent: 'fore' + sd, head: P(0.305 * sx, 0.905, 0.025), tail: P(0.322 * sx, 0.735, 0.04) };
    B['thigh' + sd] = { parent: 'hips', head: P(0.095 * sx, 0.875, -0.005), tail: P(0.205 * sx, 0.485, 0.07) };
    B['shin' + sd] = { parent: 'thigh' + sd, head: P(0.205 * sx, 0.485, 0.07), tail: P(0.235 * sx, 0.095, -0.015) };
    B['foot' + sd] = { parent: 'shin' + sd, head: P(0.235 * sx, 0.095, -0.015), tail: P(0.24 * sx, 0.03, 0.15) };
  }
  return B;
}

/* ---------------- Juno: every PIECE its own surface (a jacket, two sleeves, a tee, cargos, a head, a beanie, hair, hands, shoes and their
 * soles), so a seam between two pieces is a real edge and never a colour stepping across a grid. Each piece says the bones that may move it,
 * the box and the step it is meshed at, and how it is painted: a base colour and, where it needs one, a second colour faded in by a smooth
 * weight (the lips, a cuff, a pocket, the laces). ---------------- */
const sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a, b, v) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const HEAD_DROP = 0.016;
/* the beanie's edge (its height by z: from `edge[0]`, rising `edge[2]` a metre forward of `edge[1]`) and its rolled cuff's height above it: the
   sculpt's (junoPieces) and the skin's shader's (cloth.js), one source */
export const BEANIE = { edge: [1.655, 0.02, 0.6], cuff: 0.035 };
/* THE FACE'S PLACES (sculpt space: metres, x to his left, y up, z forward; a pair given on +x and mirrored), one source for the head's form
   (junoPieces), the eyes and their lids (skater.js), the skin's colours and fine relief (cloth.js) and the face's walls (tests/face.mjs) */
export const FACE = {
  skull: { c: [0, 1.655, 0.0], r: [0.082, 0.1, 0.097] },
  eye: { c: [0.032, 1.6575, 0.0765], r: 0.012 },
  /* the opening between the lids, round the eye's centre: azimuth across (+ out toward the ear), elevation up, degrees; the corners, the
     upper lid's highest point toward the nose, the lower's lowest toward the ear; the opening faces 8° out */
  lid: { inner: [-70, -1.5], outer: [74, 2.5], up: 14, upAt: -0.2, lo: 18, loAt: 0.15, out: 8 },
  socket: [0.0178, 0.0118, 0.0108],
  brow: { a: [0.011, 1.6765, 0.0935], b: [0.05, 1.6805, 0.079], r: 0.0072 },
  /* the brows' hair, painted on the skin over the ridge: its inner end, its peak, its tail (x, y), its thickness at each */
  hair: { x: [0.0115, 0.034, 0.0555], y: [1.6745, 1.6798, 1.6772], t: [0.0082, 0.0062, 0.0028] },
  cheekbone: { a: [0.044, 1.637, 0.076], b: [0.068, 1.642, 0.03], r: 0.0098 },
  cheek: { c: [0.042, 1.612, 0.066], r: [0.022, 0.024, 0.02] },
  jaw: { angle: [0.062, 1.566, -0.002], chin: [0.026, 1.542, 0.08], r: 0.0125 },
  chin: { c: [0, 1.551, 0.081], r: [0.023, 0.0185, 0.019], corner: [0.0105, 1.548, 0.088] },
  nose: { root: [0, 1.663, 0.0895], rootR: 0.0058, bridgeEnd: [0, 1.624, 0.1115], bridgeR: 0.0078, tip: [0, 1.6125, 0.1125], tipR: [0.0108, 0.0098, 0.0098],
    columella: [0, 1.6025, 0.1045], ala: [0.0118, 1.6055, 0.0998], alaR: [0.0078, 0.0075, 0.0088], nostril: [0.0068, 1.6008, 0.1062], nostrilR: [0.0036, 0.0021, 0.0056] },
  mouth: { y: 1.5805, halfW: 0.0262, upper: [0, 1.5848, 0.0935], upperR: [0.025, 0.0058, 0.0085], lower: [0, 1.5753, 0.0905], lowerR: [0.021, 0.0065, 0.0095], fold: 1.5635 },
  ear: { c: [0.0825, 1.6335, -0.009], turn: 22, r: [0.0195, 0.0315, 0.0062], lobe: [0.003, -0.0255, 0.0], bowl: [0.0035, -0.0035, 0.0064], tragus: [0.0815, 1.6285, 0.0105] },
};
export function junoPieces(B) {
  const g = (n) => B[n].head, t = (n) => B[n].tail;
  const along = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  /* the body under the clothes: a chest, a belly, a pelvis and the shoulders */
  const torso = (x, y, z) => {
    const chest = ellip(x, y, z, [0, 1.285, -0.012], [0.152, 0.152, 0.1]), belly = ellip(x, y, z, [0, 1.1, 0.0], [0.138, 0.15, 0.094]);
    const pelvis = ellip(x, y, z, [0, 0.94, -0.006], [0.158, 0.11, 0.104]);
    const shL = ellip(x, y, z, [0.148, 1.386, -0.016], [0.062, 0.048, 0.058]), shR = ellip(x, y, z, [-0.148, 1.386, -0.016], [0.062, 0.048, 0.058]);
    return smin(smin(smin(smin(chest, belly, 0.08), pelvis, 0.06), shL, 0.06), shR, 0.06);
  };
  const P = [];
  /* THE TEE: only where it can be seen — down the jacket's open front, and below its hem */
  P.push({ name: 'tee', paint: 'tee', box: [-0.14, 0.94, -0.03, 0.14, 1.5, 0.15], step: 0.012, bones: /^(hips|spine|chest)$/,
    f: (x, y, z) => { let d = torso(x, y, z) - 0.004; d = smax(d, 0.975 - y, 0.008); return smax(d, Math.max(0.012 - z, Math.abs(x) - 0.1), 0.01); } });
  /* THE JACKET: a work jacket over the torso, cropped at the waist, open down the front, a collar standing round the neck */
  P.push({ name: 'jacket', paint: 'jacket', alt: 'cuff', box: [-0.28, 0.93, -0.17, 0.28, 1.6, 0.17], step: 0.0125, bones: /^(hips|spine|chest|clavL|clavR|neck)$/,
    w: (x, y, z) => sstep(1.402, 1.418, y) + sstep(0.995, 0.975, y),
    f: (x, y, z) => {
      let j = smin(torso(x, y, z) - 0.02, ellip(x, y, z, [0, 1.11, -0.008], [0.16, 0.17, 0.112]), 0.05);
      if (y < 1.07) j += Math.sin(y * 95 + x * 6) * 0.0018 * sat((1.07 - y) / 0.08);           // the cloth gathers above the hem
      j += Math.sin(x * 70 + 0.6) * 0.0012 * sat((1.36 - y) / 0.2) * (z < 0 ? 1 : 0);           // and hangs in soft verticals at the back
      j -= 0.012 * sstep(1.06, 0.985, y);   // the hem band stands off the cargos' waist (measured: at the hem the cargos were 3.5 mm wider than the jacket, and their meeting was the ragged edge)
      j = smax(j, 0.97 - y, 0.018);   // the hem rounded as cloth turned under is (a sharp cut stair-stepped at this grid)
      const collar = smax(capsule(x, y, z, [0, 1.43, -0.014], [0, 1.505, -0.006], 0.076), -capsule(x, y, z, [0, 1.39, -0.006], [0, 1.62, 0.008], 0.056), 0.004);   // its inside hugs the neck (sized round the neck's old swell, 61 mm left a 2–6 mm slit when it went)
      j = Math.min(j, smax(collar, 1.4 - y, 0.004));
      /* open down the front, the opening widening into a V at the collar */
      const front = Math.abs(x) - 0.028 - Math.max(0, (y - 1.32) * 0.34), cut = Math.max(front, 0.03 - z);
      return smax(j, -cut, 0.009);   // the front edges rounded too
    } });
  /* THE SLEEVES: their own surfaces, so an arm is an arm and not a wing of the jacket; folds gather at the elbow, a darker cuff at the wrist */
  for (const sd of ['L', 'R']) {
    const a0 = g('arm' + sd), a1 = t('arm' + sd), f0 = g('fore' + sd), f1 = t('fore' + sd), top = along(a0, a1, 0.1), end = along(f0, f1, 0.8);
    const cufA = along(f0, f1, 0.66);
    const lo = [Math.min(a0[0], f1[0]) - 0.08, Math.min(end[1], f1[1]) - 0.07, Math.min(a0[2], f1[2]) - 0.08], hi = [Math.max(a0[0], f1[0]) + 0.08, a0[1] + 0.08, Math.max(a0[2], f1[2]) + 0.08];
    P.push({ name: 'sleeve' + sd, paint: 'jacket', alt: 'cuff', box: [lo[0], lo[1], lo[2], hi[0], hi[1], hi[2]], step: 0.0095, bones: new RegExp('^(clav|arm|fore)' + sd + '$'),
      w: (x, y, z) => { const ax = end[0] - cufA[0], ay = end[1] - cufA[1], az = end[2] - cufA[2], L2 = ax * ax + ay * ay + az * az; const h = ((x - cufA[0]) * ax + (y - cufA[1]) * ay + (z - cufA[2]) * az) / L2; return sstep(0.55, 0.75, h); },
      f: (x, y, z) => {
        let d = smin(cone(x, y, z, top, a1, 0.055, 0.049), cone(x, y, z, f0, end, 0.049, 0.044), 0.026);
        const cuff = cone(x, y, z, along(f0, f1, 0.7), end, 0.0475, 0.0475); d = Math.min(d, cuff);
        const e = len3(x - f0[0], y - f0[1], z - f0[2]); if (e < 0.075) d += Math.sin(e * 155) * 0.0022 * (1 - e / 0.075);
        return d;
      } });
  }
  /* THE CARGOS: baggy legs from the waist to stacked hems over the shoes; a pocket on each thigh, a shade darker */
  const legs = (x, y, z) => {
    const waist = ellip(x, y, z, [0, 0.95, -0.006], [0.178, 0.12, 0.122]);
    const legL = cone(x, y, z, g('thighL'), t('thighL'), 0.094, 0.074), legR = cone(x, y, z, g('thighR'), t('thighR'), 0.094, 0.074);
    const calfL = cone(x, y, z, g('shinL'), [t('shinL')[0], t('shinL')[1] + 0.035, t('shinL')[2]], 0.072, 0.078), calfR = cone(x, y, z, g('shinR'), [t('shinR')[0], t('shinR')[1] + 0.035, t('shinR')[2]], 0.072, 0.078);
    let p = smin(smin(waist, legL, 0.07), legR, 0.07); p = Math.min(p, smin(legL, calfL, 0.05), smin(legR, calfR, 0.05));
    return { p, legL, legR };
  };
  const pocket = (x, y, z) => Math.min(rbox(x, y, z, [0.205, 0.68, 0.075], [0.045, 0.058, 0.028], 0.012), rbox(x, y, z, [-0.205, 0.68, 0.075], [0.045, 0.058, 0.028], 0.012));
  P.push({ name: 'pants', paint: 'pants', alt: 'pocket', box: [-0.37, 0.1, -0.19, 0.37, 1.12, 0.23], step: 0.0145, bones: /^(hips|thighL|thighR|shinL|shinR)$/,
    w: (x, y, z) => { const { p } = legs(x, y, z); return sstep(0.003, -0.002, pocket(x, y, z) - p); },
    f: (x, y, z) => {
      let { p, legL, legR } = legs(x, y, z);
      for (const [k, sd] of [[g('shinL'), 1], [g('shinR'), -1]]) { const d = len3(x - k[0], y - k[1], z - k[2]); if (d < 0.09) p += Math.sin(y * 170 + sd) * 0.0028 * (1 - d / 0.09); }
      if (y < 0.24) p += Math.sin(y * 190 + x * 40) * 0.0028 * (1 - y / 0.24);
      p = smax(p, 0.125 - y, 0.01);
      const pk = pocket(x, y, z); p = Math.min(p, smax(pk, -Math.min(legL, legR) - 0.012, 0.004));
      return p;
    } });
  /* THE HEAD: a man's (the owner, 10-16: "A man"; "we need a better face design … the guy is flat"). A skull; a brow ridge over deep-set
   * sockets; cheekbones running back to the ears; a nose with a bridge, a tip, wings and nostrils; a muzzle under it carrying real lips; a
   * square chin; a jaw with its angles and a line from them to the chin; ears with a rim, a bowl and a lobe. Every place from FACE (one
   * source with the eyes and lids, the skin's colours and the walls); the eyes, their lids and the brows' hair are finer than any grid: the
   * skater sets the eyes and lids on the head bone, the skin's shader paints the brows, the lip line and the nostrils (cloth.js) */
  const F = FACE, E = F.eye.c;
  /* a pair: the +x one, read on both sides (the field is its own mirror) — by a SMOOTH |x| (4 mm round the midline): read by |x| itself, a
     feature still sloping at the midline met its mirror in a V — the brow ridges cut a groove between the brows, 24°/mm (V11) */
  const pair = (fn) => (x, y, z) => fn(Math.sqrt(x * x + 1.6e-5), y, z);
  /* the brow ridge: full over the eye, thinning to the temple past it (V11, the supervisor's list: its capsule's round end stood out as a shelf
     at its outer end, 3/4 left) */
  const browM = F.brow.a.map((v, i) => v + (F.brow.b[i] - v) * 0.6);
  const brow = pair((x, y, z) => smin(smin(capsule(x, y, z, F.brow.a, browM, F.brow.r), cone(x, y, z, browM, F.brow.b, F.brow.r, 0.0040), 0.004), ellip(x, y, z, [0, F.brow.a[1] - 0.003, F.brow.a[2] - 0.003], [0.013, 0.008, 0.008]), 0.01));
  const cheekbone = pair((x, y, z) => capsule(x, y, z, F.cheekbone.a, F.cheekbone.b, F.cheekbone.r));
  const cheek = pair((x, y, z) => ellip(x, y, z, F.cheek.c, F.cheek.r));
  const jawEdge = pair((x, y, z) => smin(capsule(x, y, z, F.jaw.angle, F.jaw.chin, F.jaw.r), ellip(x, y, z, F.jaw.angle, [0.012, 0.016, 0.018]), 0.01));
  const chinCorner = pair((x, y, z) => ellip(x, y, z, F.chin.corner, [0.012, 0.012, 0.0105]));
  const socket = pair((x, y, z) => ellip(x, y, z, [E[0], E[1], E[2] + 0.011], F.socket));
  const ala = pair((x, y, z) => ellip(x, y, z, F.nose.ala, F.nose.alaR));
  /* an ear (V11, the supervisor's list: "the ear is a knob — give it a rim, a bowl and a lobe"): in the ear's own frame (u forward along the
     head, v up, w out of it) a thin plate of cartilage; the HELIX, a rim rolled along its top and back from the root over the tragus to the
     lobe; the ANTIHELIX, a lower ridge inside it; the CONCHA, a deep bowl before them; a soft LOBE; the tragus. Arcs as chains of capsules */
  const et = F.ear.turn * Math.PI / 180, ec = Math.cos(et), es = Math.sin(et);
  /* an arc: a Catmull-Rom curve through its points, four capsules a span (a chain through the points alone was a bent pipe, kinked at each) */
  const spline = (pts) => { const P = [pts[0], ...pts, pts[pts.length - 1]], out = [];
    for (let k = 1; k + 2 < P.length; k++) for (let i = 0; i < 4; i++) { const t = i / 4, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * P[k][c] + (-P[k - 1][c] + P[k + 1][c]) * t + (2 * P[k - 1][c] - 5 * P[k][c] + 4 * P[k + 1][c] - P[k + 2][c]) * t2 + (-P[k - 1][c] + 3 * P[k][c] - 3 * P[k + 1][c] + P[k + 2][c]) * t3))); }
    out.push(pts[pts.length - 1]); return out; };
  const chain = (u, v, w, pts, r, w0) => { let d = 1; for (let k = 0; k + 1 < pts.length; k++) d = Math.min(d, capsule(u, v, w, [pts[k][0], pts[k][1], w0], [pts[k + 1][0], pts[k + 1][1], w0], r)); return d; };
  const HELIX = spline([[0.0085, 0.022], [0.002, 0.0295], [-0.0075, 0.0285], [-0.0145, 0.0185], [-0.0165, 0.004], [-0.015, -0.01], [-0.011, -0.019]]);
  const ANTIHELIX = spline([[0.001, 0.016], [-0.0055, 0.0125], [-0.0095, 0.004], [-0.0095, -0.006], [-0.006, -0.012]]);
  const ear = pair((x, y, z) => {
    const dx = x - F.ear.c[0], dz = z - F.ear.c[2], u = -dx * es + dz * ec, v = y - F.ear.c[1], w = dx * ec + dz * es;
    let e = ellip(u, v, w, [-0.003, 0, 0.0005], [0.0175, 0.031, 0.0025]);                         // the plate
    e = smin(e, chain(u, v, w, HELIX, 0.0028, 0.0034), 0.0035);                                   // the helix, rolled out of the plate's edge
    e = smin(e, chain(u, v, w, ANTIHELIX, 0.0021, 0.0026), 0.0028);                               // the antihelix, a softer ridge
    e = smin(e, ellip(u, v, w, [-0.004, -0.0245, 0.001], [0.0085, 0.0085, 0.0042]), 0.004);       // the lobe
    e = smax(e, -ellip(u, v, w, [0.002, -0.004, 0.0032], [0.0075, 0.010, 0.0042]), 0.0015);       // the concha
    return smin(e, ellip(x, y, z, F.ear.tragus, [0.0035, 0.0048, 0.004]), 0.003);
  });
  const head = (x, y, z) => {
    let h = ellip(x, y, z, F.skull.c, F.skull.r);                                                   // the skull
    if (z > -0.02) {
      h = smin(h, ellip(x, y, z, [0, 1.584, 0.02], [0.068, 0.052, 0.066]), 0.045);                // the jaw's body
      h = smin(h, jawEdge(x, y, z), 0.02);                                                        // its angles and its line to the chin
      h = smin(h, smin(ellip(x, y, z, F.chin.c, F.chin.r), chinCorner(x, y, z), 0.008), 0.014);   // a square chin
      h = smin(h, ellip(x, y, z, [0, 1.598, 0.06], [0.036, 0.034, 0.035]), 0.02);                 // the muzzle the lips sit on
      h = smin(h, cheek(x, y, z), 0.022); h = smin(h, cheekbone(x, y, z), 0.016);                 // the cheeks, the cheekbones
      h = smin(h, brow(x, y, z), 0.014);                                                          // the brow ridge, blended into the forehead
      h = smax(h, -socket(x, y, z), 0.012);                                                       // the sockets, blended into the brow and the cheek over a centimetre and more (at 4 mm their rim was a hard oval, a mask: V11)
      /* the nose: a bridge from between the eyes, a tip, the wings, the nostrils under */
      /* the bridge rises out of the face between the eyes on a join of its own, wide. On the nose's one tight join it stood off the face like
         a handle — held at the root and the tip, a tunnel under it from cheek to cheek, and in profile the park showed through the face (V10,
         V11: the head's topology wall, one hole). The tip, the columella and the wings keep the tight one, so the skin still dips in above the lip */
      const bridge = cone(x, y, z, F.nose.root, F.nose.bridgeEnd, F.nose.rootR, F.nose.bridgeR);
      h = smin(h, bridge, 0.014);
      let n = smin(bridge, ellip(x, y, z, F.nose.tip, F.nose.tipR), 0.009);
      n = smin(n, ellip(x, y, z, F.nose.columella, [0.0048, 0.0048, 0.0085]), 0.005);
      n = smin(n, ala(x, y, z), 0.009);
      h = smin(h, n, 0.006);   // a tight join: the skin under the nose dips in before the upper lip (10-16: blended wider, it stood 4.6 mm in front of the lip)
      /* the lips on the muzzle (the line between them, the nostrils' openings: finer than the grid, a carve there is a jagged one — the skin's
         shader draws them) */
      const lips = Math.min(ellip(x, y, z, F.mouth.upper, F.mouth.upperR), ellip(x, y, z, F.mouth.lower, F.mouth.lowerR));
      h = smin(h, lips, 0.008);
    }
    if (Math.abs(x) > 0.055) h = smin(h, ear(x, y, z), 0.008);
    return h;   // the neck is the piece's own (headDropped): a second, near-identical cone blended here as well swelled the throat by k/4, 7.8 mm (10-16: the bag under the chin)
  };
  const D = HEAD_DROP, headDropped = (x, y, z) => { const n = cone(x, y, z, [0, 1.40, -0.006], [0, 1.57 - D, 0.008], 0.06, 0.056); return smin(smax(head(x, y + D, z), 1.43 - y, 0.01), n, 0.03); };
  /* the face moves with the head alone: above the jaw line every vertex is the head bone's (10-16: weighted by distance, the mouth was 37% the
     neck's, and posed the nose's tip and the chin slid 3 cm under the eyes — the head turns 36° further than the neck); under it, the neck blends */
  const jawLine = (z) => 1.53 + (0.08 - z) * 0.3125, rigid = (x, y, z) => sstep(jawLine(z) - 0.025, jawLine(z) - 0.003, y + D);   // under the chin 1.53, the jaw's angle 1.555
  /* the head's triangles go to the face: its error weighed four times there (10-16: the lips came out of the simplifier as long thin triangles
     whose normals zigzagged, and the sun caught their shelves in white), a third under the beanie, where no one sees the skin */
  const care = (x, y, z) => { const yd = y + D; return yd > 1.705 ? 0.3 : z > 0.03 && yd > 1.53 && Math.abs(x) < 0.07 ? 4 : 1; };
  P.push({ name: 'head', paint: 'skin', box: [-0.11, 1.33, -0.12, 0.11, 1.775, 0.135], step: 0.003, stepFar: 0.0045, mirror: true, bones: /^(neck|head|chest)$/, rigid, care, occlude: true,
    f: headDropped });
  /* THE BEANIE: a ribbed dome with a rolled cuff, its edge riding up over the forehead so the brows show */
  const edgeY = (z) => BEANIE.edge[0] + Math.max(0, z - BEANIE.edge[1]) * BEANIE.edge[2];
  P.push({ name: 'beanie', paint: 'beanie', box: [-0.13, 1.58, -0.14, 0.13, 1.82, 0.14], step: 0.0082, bones: /^head$/,
    f: (x, y0, z) => { const y = y0 + HEAD_DROP;
      const e = edgeY(z);
      let b = ellip(x, y, z, [0, 1.70, -0.008], [0.097, 0.104, 0.106]); b = smax(b, e - y, 0.008);
      b += Math.sin(Math.atan2(x, z) * 48) * 0.0013 * (y < e + 0.04 ? 1 : 0.45);
      const ring = smax(ellip(x, y, z, [0, 1.70, -0.008], [0.104, 0.11, 0.113]), Math.abs(y - (e + 0.018)) - 0.017, 0.004);
      return Math.min(b, ring);
    } });
  /* THE HAIR: dark curls under the beanie at the back and the sides — one mass, its surface knotted into curls */
  P.push({ name: 'hair', paint: 'hair', box: [-0.12, 1.53, -0.13, 0.12, 1.78, 0.08], step: 0.0074, bones: /^(head|neck)$/,
    f: (x, y0, z) => { const y = y0 + HEAD_DROP;
      let d = ellip(x, y, z, [0, 1.662, -0.014], [0.09, 0.098, 0.101]);
      d -= (Math.sin(x * 190 + 1.3) * Math.sin(y * 175) * Math.sin(z * 185 + 0.7)) * 0.0055;
      d = smax(d, z - 0.032 + (1.66 - y) * 0.12, 0.012);         // nothing in front of the ears
      d = smax(d, 1.588 - y + Math.max(0, z + 0.04) * 0.4, 0.012); // a nape, not a beard
      return d;
    } });
  /* THE HANDS: a palm, four fingers in a gentle curl, a thumb; the wrist inside the cuff */
  for (const [sd, sx] of [['L', 1], ['R', -1]]) {
    const w = g('hand' + sd);
    P.push({ name: 'hand' + sd, paint: 'skin', box: [w[0] - 0.07, w[1] - 0.19, w[2] - 0.07, w[0] + 0.07, w[1] + 0.1, w[2] + 0.09], step: 0.0058, bones: new RegExp('^(hand|fore)' + sd + '$'),
      f: (x, y, z) => {
        const palm = rbox(x - sx * 0.002, y, z, [w[0] + sx * 0.004, w[1] - 0.045, w[2] + 0.006], [0.012, 0.042, 0.04], 0.012);
        let hand = smin(palm, cone(x, y, z, [w[0], w[1] + 0.05, w[2]], [w[0], w[1] - 0.01, w[2] + 0.004], 0.026, 0.024), 0.02);
        for (let f = 0; f < 4; f++) { const fz = w[2] - 0.022 + f * 0.0145, base = [w[0] + sx * 0.002, w[1] - 0.085, fz], mid = [w[0] + sx * 0.008, w[1] - 0.122 + f * 0.003 * (f === 3 ? -1 : 1), fz + 0.004], end = [w[0] + sx * 0.02, w[1] - 0.145 + (f === 0 || f === 3 ? 0.012 : 0), fz + 0.006]; hand = smin(hand, Math.min(cone(x, y, z, base, mid, 0.0085, 0.0075), cone(x, y, z, mid, end, 0.0075, 0.0068)), 0.008); }
        const thumb = Math.min(cone(x, y, z, [w[0] + sx * 0.006, w[1] - 0.04, w[2] + 0.036], [w[0] + sx * 0.022, w[1] - 0.075, w[2] + 0.048], 0.011, 0.0095), cone(x, y, z, [w[0] + sx * 0.022, w[1] - 0.075, w[2] + 0.048], [w[0] + sx * 0.03, w[1] - 0.098, w[2] + 0.046], 0.0095, 0.008));
        return smin(hand, thumb, 0.012);
      } });
  }
  /* THE SHOES: the canvas upper on its last, the collar, the tongue and the sock (shoeOf: one form for the mesh and the laces), on a gum
     cupsole of its own — its wall 2.85 cm, a lip 3.5 mm proud of the upper all round, a toe bumper rising over the toes. The panels, the
     stitching, the eyelets and the foxing stripe are the cloth's (cloth.js); the laces are cords of their own (junoLaces) */
  for (const sd of ['L', 'R']) {
    const S = shoeOf(B, sd), { cx, cz } = S;
    P.push({ name: 'shoe' + sd, paint: 'shoe', box: [cx - 0.065, 0.004, cz - 0.17, cx + 0.065, 0.25, cz + 0.165], step: 0.0058, bones: new RegExp('^(foot|shin)' + sd + '$'), f: S.upper });
    P.push({ name: 'sole' + sd, paint: 'sole', box: [cx - 0.066, -0.012, cz - 0.165, cx + 0.066, 0.058, cz + 0.17], step: 0.0042, bones: new RegExp('^foot' + sd + '$'), f: S.sole });
  }
  return P;
}

/* THE SHOE'S FORM, one source for its mesh and its laces (shoe-local: X = x − cx across, Z = z − cz along, y up from the ground): the last,
   narrower at the heel than across the ball, its top sloping from the throat down to a round toe box; a padded collar round the ankle
   opening, higher at the heel; a padded tongue leaning back up the shin from the throat; the sock coming out of the collar. And the sole. */
export function shoeOf(B, sd) {
  const a = B['foot' + sd].head, cx = a[0], cz = a[2] + 0.07;
  const wid = (Z) => 0.036 + 0.0095 * sstep(-0.1, 0.02, Z) - 0.0045 * sstep(0.07, 0.14, Z);
  const last = (X, y, Z) => {
    let u = rbox(X * (0.043 / wid(Z)), y, Z, [0, 0.05, -0.004], [0.043, 0.034, 0.127], 0.026);
    u = smax(u, y - (0.053 + 0.047 * (1 - sstep(-0.075, 0.125, Z))), 0.02);
    return smin(u, ellip(X, y, Z, [0, 0.04, 0.092], [0.043, 0.022, 0.052]), 0.022);
  };
  const ca = Math.cos(-0.12), sa = Math.sin(-0.12);
  const upper = (x, y, z) => {
    const X = x - cx, Z = z - cz;
    let u = last(X, y, Z);
    /* the collar: a padded roll 1.8 cm thick round the opening, hugging the sock at the back and the sides and reaching forward to the
       throat (an egg: 3.6 cm behind its centre, 6 cm before it), higher at the heel; the distance to its ring taken at the point's angle */
    const oz = Z - COLLAR.z, rz = oz < 0 ? COLLAR.back : COLLAR.front, an0 = Math.atan2(oz / rz, X / COLLAR.side), yc0 = 0.093 + 0.012 * sstep(0.0, -0.035, oz);
    /* a C, as a shoe's collar is: from the heel round both sides to the throat, its ends running down INTO the upper at the eyestays either
       side of the tongue (10-16: a closed ring stood 5 mm before the tongue, a slot under the shoe's grid that the grid bridged into a tunnel) */
    const off = an0 - Math.PI / 2, near = Math.abs(off), an = near < 0.75 ? Math.PI / 2 + (off < 0 ? -0.75 : 0.75) : an0, yc = yc0 - 0.011 * sstep(1.35, 0.75, near);
    u = smin(u, Math.hypot(Math.hypot(X - COLLAR.side * Math.cos(an), oz - rz * Math.sin(an)), y - yc) - COLLAR.r, 0.007);
    /* the tongue: a padded slab 1.2 cm thick lying on the front of the sock, from the throat up the shin (leaning forward with it) */
    const ty = y - TONGUE.y, tz = Z - TONGUE.z, yr = ty * ca - tz * sa, zr = ty * sa + tz * ca;
    u = smin(u, ellip(X, yr, zr, [0, 0, 0], [0.021, 0.03, 0.006]), 0.006);
    /* the sock, its ankle in the collar and up into the cargos' cuff, met by the collar softly (on a hard union the collar hugging it left a
       crevice narrowing to nothing, sampled by the grid at random: specks of air and tunnels — 10-16) */
    return smin(u, cone(X, y, Z, [0, 0.07, SOCK.z], [0, 0.18, SOCK.z + 0.013], SOCK.r, SOCK.r - 0.002), 0.006);
  };
  const sole = (x, y, z) => {
    const X = x - cx, Z = z - cz, k = 0.0485 / (wid(Z) + 0.0035);
    const qx = Math.abs(X) * k - (0.0485 - 0.03), qz = Math.abs(Z - 0.004) - (0.142 - 0.03);
    const plan = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - 0.03;
    return smax(plan, Math.max(-y, y - (0.0285 + 0.012 * sstep(0.1, 0.146, Z))), 0.0028);
  };
  return { cx, cz, upper, sole, wid };
}
/* WHAT IS DRAWN BESIDE THE SCULPT, one table for the page (skater.js) and the budget's test (sculpt.mjs): the lace cords' segments (round a
   cord and along it) and the eyes' (sclera, lids, brow), by level of detail — 0 the local skater, 1 a friend (no laces: at a friend's distance a
   cord is under a pixel). The local skater draws at most 30,000 triangles all told, a friend 12,000 (the design's ledger). */
export const DRAWN = {
  budget: [26400, 11200],
  laceRadial: 4, laceTubular: (cord) => (cord.closed ? 10 : Math.max(4, cord.pts.length - 1)),
  /* an eye: its ball (across, down), its upper and lower lid (across, rows from the margin; and the margin's own row); the brows are hair
     painted on the skin (cloth.js), no mesh */
  eye: [{ sclera: [16, 10], lid: [20, 8], lo: [20, 6] }, { sclera: [8, 6], lid: [10, 4], lo: [10, 3] }],
};
export function drawnExtra(B, lod) {
  const E = DRAWN.eye[lod], eyes = 2 * (E.sclera[0] * E.sclera[1] * 2 + E.lid[0] * E.lid[1] * 2 + E.lo[0] * E.lo[1] * 2);
  const laces = lod === 0 ? junoLaces(B).reduce((a, c) => a + DRAWN.laceTubular(c) * DRAWN.laceRadial * 2, 0) : 0;
  return { eyes, laces };
}
/* THE LIDS' OPENING: at an azimuth across the eye (degrees, + out toward the ear), the elevations of the upper and the lower lid's margins —
   an almond between the corners (FACE.lid: the upper highest toward the nose, the lower lowest toward the ear), and past the corners the two
   at the line between them, closed */
export function lidEdge(az) {
  const L = FACE.lid, [ai, ei] = L.inner, [ao, eo] = L.outer, base = ei + (eo - ei) * Math.min(1, Math.max(0, (az - ai) / (ao - ai)));
  const u = (az - (ai + ao) / 2) / ((ao - ai) / 2); if (u <= -1 || u >= 1) return [base, base];
  const hump = (u, p) => (u < p ? Math.sin(Math.PI / 2 * (u + 1) / (p + 1)) : Math.sin(Math.PI / 2 * (1 - u) / (1 - p)));
  return [base + L.up * Math.pow(hump(u, L.upAt), 0.85), base - L.lo * Math.pow(hump(u, L.loAt), 0.9)];
}
/* THE LIDS: shells round the eyeball from their margins into the socket (the upper up, the lower down), in the eye opening's own frame (its
   origin the eye's centre, +x out toward the ear, +z where the opening faces): each margin a lid thick (its front edge the lash line), the
   upper's plate out to a crease, then the fold up under the brow; past the corners the two meet, so no white shows past them. Returns
   positions, normals, a darkness per vertex (1 the lash line) and triangles; `rows` from the margin up (or down) */
export function lidMesh(upper, across, rows) {
  const r = FACE.eye.r, D2R = Math.PI / 180, pos = [], nrm = [], dark = [], idx = [];
  const at = (az, el, rho) => { const a = az * D2R, e = el * D2R, d = [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)]; return [d.map((v) => v * rho), d]; };
  /* the margin's two rings (its back against the ball, its front the lash line), then the lid out to the socket */
  const prof = upper
    ? [[0, 0.0002, 1], [0, 0.0012, 0.85], [2.5, 0.0013, 0.25], [8, 0.0014, 0], [10.5, 0.001, 0.12], [16, 0.0026, 0], [30, 0.0042, 0], [48, 0.0058, 0], [66, 0.0068, 0]]
    : [[0, 0.0002, 0.85], [0, 0.001, 0.55], [3, 0.0012, 0.08], [10, 0.0024, 0], [24, 0.0042, 0], [44, 0.0058, 0], [62, 0.0068, 0]];
  const use = [0, 1].concat(Array.from({ length: rows - 1 }, (_, k) => 2 + Math.round(k * (prof.length - 3) / Math.max(1, rows - 2))));
  for (let i = 0; i <= across; i++) {
    const az = -100 + 200 * i / across, [up, lo] = lidEdge(az), m = upper ? up : lo;
    for (const k of use) { const [dEl, dr, dk] = prof[k], [p, d] = at(az, upper ? m + dEl : m - dEl, r + dr); pos.push(...p); nrm.push(...(k === 0 ? d.map((v, j) => (upper ? [0, -1, 0][j] : [0, 1, 0][j]) * 0.6 + v * 0.4) : d)); dark.push(dk); }
  }
  const R = use.length;
  for (let i = 0; i < across; i++) for (let k = 0; k < R - 1; k++) { const a = i * R + k, b = (i + 1) * R + k; if (upper) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1); }
  return { pos, nrm, dark, idx };
}
/* THE LACES: round cords (radius LACE_R) criss-crossing from five pairs of eyelets (cloth.js EYELETS draws the eyelets at the same places),
   a bar across the toe end, a bow at the throat — each cord laid ON the upper (its points the upper's surface plus the cord's radius; the
   strand that crosses over lifted by its thickness). Returns, per foot, cords of bind-space points ({ sd, closed, pts }). */
export const LACE_R = 0.0019, EYELET = { x: 0.0175, z0: -0.04, dz: 0.0275, n: 5 }, COLLAR = { z: -0.1, side: 0.036, back: 0.036, front: 0.06, r: 0.009 }, SOCK = { z: -0.1, r: 0.031 }, TONGUE = { y: 0.112, z: -0.0575 };
export function junoLaces(B) {
  const out = [];
  for (const sd of ['L', 'R']) {
    const S = shoeOf(B, sd), { cx, cz } = S;
    /* the upper's top at (X, Z), found by marching down onto it */
    const top = (X, Z) => { let y = 0.16; for (let i = 0; i < 200 && y > 0; i++) { const d = S.upper(cx + X, y, cz + Z); if (d < 1e-5) break; y -= Math.max(d * 0.8, 1e-5); } return Math.max(0, y); };
    /* a cord's point: on the upper's top at (X, Z), out along the surface's normal by the cord's radius (and a lift where it crosses over) */
    const on = (X, Z, lift = 0) => { const x = cx + X, y = top(X, Z), z = cz + Z, e = 0.0004, f = S.upper, want = LACE_R + 0.0003 + lift;
      let nx = f(x + e, y, z) - f(x - e, y, z), ny = f(x, y + e, z) - f(x, y - e, z), nz = f(x, y, z + e) - f(x, y, z - e); const l = Math.hypot(nx, ny, nz) || 1, k = (LACE_R + 0.0003 + lift) / l;
      const p = [x + nx * k, y + ny * k, z + nz * k];
      /* and out until it is its rest height off the WHOLE upper: in a crease (the tongue against the throat) a step along one point's normal
         comes nearer another part of the shoe (round 11: three points 3.5 mm in) */
      for (let it = 0; it < 6; it++) { const d = f(p[0], p[1], p[2]); if (d >= want - 1e-4) break; const gx = f(p[0] + e, p[1], p[2]) - f(p[0] - e, p[1], p[2]), gy = f(p[0], p[1] + e, p[2]) - f(p[0], p[1] - e, p[2]), gz = f(p[0], p[1], p[2] + e) - f(p[0], p[1], p[2] - e), gl = Math.hypot(gx, gy, gz) || 1; p[0] += gx / gl * (want - d); p[1] += gy / gl * (want - d); p[2] += gz / gl * (want - d); }
      return p; };
    const rest = []; const cord = (a, b, n, liftMid = 0) => { const pts = []; rest.length = 0; for (let i = 0; i <= n; i++) { const t = i / n, l = liftMid * Math.sin(Math.PI * t); pts.push(on(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, l)); rest.push(LACE_R + 0.0003 + l); } return pts; };
    const E = (i, s) => [s * EYELET.x, EYELET.z0 + i * EYELET.dz], n = EYELET.n;
    const push = (c) => { c.rest = rest.slice(); out.push(c); };
    push({ sd, closed: false, pts: cord(E(n - 1, -1), E(n - 1, 1), 6) });
    for (let i = n - 1; i >= 1; i--) { push({ sd, closed: false, pts: cord(E(i, 1), E(i - 1, -1), 7, LACE_R * 2.2) }); push({ sd, closed: false, pts: cord(E(i, -1), E(i - 1, 1), 7) }); }
    /* the bow at the top pair: two loops lying out over the eyestays, two ends down the tongue's sides */
    const k = [0, EYELET.z0 - 0.004];
    for (const s of [1, -1]) {
      const loop = [[0, k[1]], [s * 0.014, k[1] + 0.008], [s * 0.029, k[1] + 0.001], [s * 0.026, k[1] - 0.011], [s * 0.011, k[1] - 0.009]];
      out.push({ sd, closed: true, pts: loop.map(([X, Z]) => on(X, Z, 0.0015)), rest: loop.map(() => LACE_R + 0.0003 + 0.0015) });
      const tail = [[0, k[1]], [s * 0.007, k[1] + 0.014], [s * 0.012, k[1] + 0.028], [s * 0.015, k[1] + 0.04]];
      out.push({ sd, closed: false, pts: tail.map(([X, Z], i) => on(X, Z, i === 0 ? 0.0015 : 0)), rest: tail.map((_, i) => LACE_R + 0.0003 + (i === 0 ? 0.0015 : 0)) });
    }
    const knot = [[-0.004, k[1]], [0, k[1] + 0.004], [0.004, k[1]], [0, k[1] - 0.004]];
    out.push({ sd, closed: true, pts: knot.map(([X, Z]) => on(X, Z, 0.0024)), rest: knot.map(() => LACE_R + 0.0003 + 0.0024) });
  }
  return out;
}

/* ---------------- surface nets, NARROW BAND: the field is first read on a grid four steps coarse; a fine point far from the surface (by
 * what the coarse reading proves, the field changing no faster than distance) takes the coarse value — only its sign matters there — and
 * only the band round the surface is read finely. The same surface for a fraction of the reads. ---------------- */
export function nets(f, box, step) {
  const [x0, y0, z0, x1, y1, z1] = box, C = 4;
  const nx = Math.ceil((x1 - x0) / step) + 1, ny = Math.ceil((y1 - y0) / step) + 1, nz = Math.ceil((z1 - z0) / step) + 1;
  const cx = Math.ceil((nx - 1) / C) + 1, cy = Math.ceil((ny - 1) / C) + 1, cz = Math.ceil((nz - 1) / C) + 1;
  const Fc = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) Fc[i + cx * (j + cy * k)] = f(x0 + i * C * step, y0 + j * C * step, z0 + k * C * step);
  const F = new Float32Array(nx * ny * nz), id = (i, j, k) => i + nx * (j + ny * k);
  let reads = 0;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const ci = Math.min(cx - 1, Math.round(i / C)), cj = Math.min(cy - 1, Math.round(j / C)), ck = Math.min(cz - 1, Math.round(k / C));
    const c = Fc[ci + cx * (cj + cy * ck)];
    const off = Math.hypot(i - ci * C, j - cj * C, k - ck * C) * step;
    if (Math.abs(c) > off * 1.6 + step * 1.5) F[id(i, j, k)] = c; else { F[id(i, j, k)] = f(x0 + i * step, y0 + j * step, z0 + k * step); reads++; }
  }
  /* ONE VERTEX FOR EACH SHEET THAT CROSSES A CELL (10-16). A cell that two sheets of the surface cross — a fold nearer than a cell, a shell
     thinner than one — had ONE vertex, and the quads of both sheets met in it: an edge on four triangles, the two sheets welded into a bridge
     (the jacket's collar, the hair, the shoes' laces: not manifold on any build since V9). The cell's crossing edges are grouped into its sheets
     across its six faces — a face crossed twice joins its two; a saddle, crossed four times, is settled by the sign at its centre, which both
     cells that share the face read alike — and each sheet gets a vertex of its own; a quad takes from each of its four cells the vertex of the
     sheet that crosses ITS edge */
  const cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k), base = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1), ev = [];
  const pos = [], nrm = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const FACES = [[0, 2, 6, 4], [1, 3, 7, 5], [0, 1, 5, 4], [2, 3, 7, 6], [0, 1, 3, 2], [4, 5, 7, 6]], edgeOf = new Int8Array(64).fill(-1);
  E.forEach(([a, b], e) => { edgeOf[a * 8 + b] = e; edgeOf[b * 8 + a] = e; });
  const corner = (c) => [c & 1, (c >> 1) & 1, (c >> 2) & 1];
  const v = new Float32Array(8), par = new Int8Array(12), acc = new Float64Array(12 * 4);
  const find = (e) => { while (par[e] !== e) e = par[e] = par[par[e]]; return e; }, join = (a, b) => { par[find(a)] = find(b); };
  /* a saddle face is read by the sign at its centre — unless, read so, BOTH its cells have one sheet touch it twice (its two segments one
     sheet on each side: the two sheets' vertices joined by four quads, an edge on four triangles); then the face is read the other way, for
     both cells. One side alone touching it twice is a ring of quads round its vertex, whole. `turned` holds those faces (by axis and corner),
     settled before any vertex is made; a face read both ways and pinched both ways is left (the wall that reads every piece says so) */
  const faceKey = (ax, i, j, k) => ((ax * (nz + 1) + k) * (ny + 1) + j) * (nx + 1) + i, turned = new Set();
  const FACE_AX = [0, 0, 1, 1, 2, 2], FACE_UP = [0, 1, 0, 1, 0, 1];
  const corners = (i, j, k) => { let mask = 0; for (let c = 0; c < 8; c++) { const val = F[id(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]; v[c] = val; if (val < 0) mask |= 1 << c; } return mask; };
  /* the cell's sheets (in `par`) from the corners in `v`; returns the faces one sheet touches twice, a bit each */
  const twoA = new Int8Array(6), twoB = new Int8Array(6), twoF = new Int8Array(6);
  const sheets = (i, j, k) => {
    for (let e = 0; e < 12; e++) par[e] = e;
    let nTwo = 0;
    for (let fc = 0; fc < 6; fc++) {
      const FC = FACES[fc], c0 = FC[0], c1 = FC[1], c2 = FC[2], c3 = FC[3], s0 = v[c0] < 0, s1 = v[c1] < 0, s2 = v[c2] < 0, s3 = v[c3] < 0;
      const e01 = edgeOf[c0 * 8 + c1], e12 = edgeOf[c1 * 8 + c2], e23 = edgeOf[c2 * 8 + c3], e30 = edgeOf[c3 * 8 + c0];
      const n = (s0 !== s1) + (s1 !== s2) + (s2 !== s3) + (s3 !== s0);
      if (n === 2) { let a = -1; if (s0 !== s1) a = e01; if (s1 !== s2) { if (a < 0) a = e12; else join(a, e12); } if (s2 !== s3) { if (a < 0) a = e23; else join(a, e23); } if (s3 !== s0) join(a, e30); }
      else if (n === 4) {   // c0 and c2 meet across the centre (c1 and c3 cut off, each by a segment of its own), or c1 and c3 do
        const ax = FACE_AX[fc], up = FACE_UP[fc], key = faceKey(ax, i + (ax === 0 ? up : 0), j + (ax === 1 ? up : 0), k + (ax === 2 ? up : 0));
        const across = ((v[c0] + v[c1] + v[c2] + v[c3] < 0) === s0) !== turned.has(key);
        if (across) { join(e01, e12); join(e23, e30); twoA[nTwo] = e01; twoB[nTwo] = e23; } else { join(e30, e01); join(e12, e23); twoA[nTwo] = e30; twoB[nTwo] = e12; }
        twoF[nTwo++] = fc;
      }
    }
    let twice = 0; for (let q = 0; q < nTwo; q++) if (find(twoA[q]) === find(twoB[q])) twice |= 1 << twoF[q];
    return twice;
  };
  /* every cell the surface crosses, its sheets read once and kept; a face turned sends its two cells round again */
  const surface = [], at0 = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const m = corners(i, j, k); if (m !== 0 && m !== 255) { at0[cid(i, j, k)] = surface.length / 3; surface.push(i, j, k); } }
  const nS = surface.length / 3, kept = new Int8Array(nS * 12), stale = new Uint8Array(nS), twiceOf = new Uint8Array(nS), tried = new Set();
  const across = (q, fc) => { const ax = FACE_AX[fc], up = FACE_UP[fc], i = surface[q * 3] + (ax === 0 ? (up ? 1 : -1) : 0), j = surface[q * 3 + 1] + (ax === 1 ? (up ? 1 : -1) : 0), k = surface[q * 3 + 2] + (ax === 2 ? (up ? 1 : -1) : 0);
    return i >= 0 && j >= 0 && k >= 0 && i < nx - 1 && j < ny - 1 && k < nz - 1 ? at0[cid(i, j, k)] : -1; };
  const keyOf = (q, fc) => { const ax = FACE_AX[fc], up = FACE_UP[fc]; return faceKey(ax, surface[q * 3] + (ax === 0 ? up : 0), surface[q * 3 + 1] + (ax === 1 ? up : 0), surface[q * 3 + 2] + (ax === 2 ? up : 0)); };
  let todo = []; for (let q = 0; q < nS; q++) todo.push(q);
  for (let round = 0; round < 8 && todo.length; round++) {
    for (const q of todo) { corners(surface[q * 3], surface[q * 3 + 1], surface[q * 3 + 2]); twiceOf[q] = sheets(surface[q * 3], surface[q * 3 + 1], surface[q * 3 + 2]); kept.set(par, q * 12); stale[q] = 0; }
    const next = new Set();
    for (const q of todo) for (let fc = 0; fc < 6; fc++) {
      if (!(twiceOf[q] >> fc & 1)) continue; const o = across(q, fc); if (o < 0 || !(twiceOf[o] >> (fc ^ 1) & 1)) continue;   // the cell across reads the same face as fc ^ 1
      const key = keyOf(q, fc); if (tried.has(key)) continue; tried.add(key);
      if (turned.has(key)) turned.delete(key); else turned.add(key);
      next.add(q); next.add(o); stale[q] = 1; stale[o] = 1;
    }
    todo = [...next];
  }
  if (typeof process !== 'undefined' && process.env && process.env.NETS_ROUNDS) console.log('nets: ' + nS + ' cells, ' + turned.size + ' faces turned, ' + todo.length + ' left to read again');
  for (let q = 0; q < nS; q++) {
    const i = surface[q * 3], j = surface[q * 3 + 1], k = surface[q * 3 + 2];
    corners(i, j, k); if (stale[q]) sheets(i, j, k); else for (let e = 0; e < 12; e++) par[e] = kept[q * 12 + e];   // a cell whose face turned after it was read is read again: both cells of a face read it alike
    acc.fill(0);
    for (let e = 0; e < 12; e++) { const [a, b] = E[e]; if ((v[a] < 0) === (v[b] < 0)) continue; const tt = v[a] / (v[a] - v[b]), ca = corner(a), cb = corner(b), r = find(e) * 4; acc[r] += ca[0] + (cb[0] - ca[0]) * tt; acc[r + 1] += ca[1] + (cb[1] - ca[1]) * tt; acc[r + 2] += ca[2] + (cb[2] - ca[2]) * tt; acc[r + 3]++; }
    const b0 = ev.length; base[cid(i, j, k)] = b0; for (let e = 0; e < 12; e++) ev.push(-1);
    for (let e = 0; e < 12; e++) {
      const r = find(e) * 4, n = acc[r + 3]; if (!n) continue; const [a, b] = E[e]; if ((v[a] < 0) === (v[b] < 0)) continue;
      if (acc[r + 3] > 0) {   // the sheet's vertex, made the first time one of its edges is met
        const px = x0 + (i + acc[r] / n) * step, py = y0 + (j + acc[r + 1] / n) * step, pz = z0 + (k + acc[r + 2] / n) * step;
        const h = step * 0.5, gx = f(px + h, py, pz) - f(px - h, py, pz), gy = f(px, py + h, pz) - f(px, py - h, pz), gz = f(px, py, pz + h) - f(px, py, pz - h), gl = len3(gx, gy, gz) || 1;
        acc[r + 3] = -(pos.length / 3) - 1; pos.push(px, py, pz); nrm.push(gx / gl, gy / gl, gz / gl);
      }
      ev[b0 + e] = -acc[r + 3] - 1;
    }
  }
  const at = (ci, cj, ck, e) => { const b = base[cid(ci, cj, ck)]; return b < 0 ? -1 : ev[b + e]; };
  const idx = [];
  const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, b, c, a, c, d); else idx.push(a, c, b, a, d, c); };
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const f0 = F[id(i, j, k)] < 0;
    if (j > 0 && k > 0) { const f1 = F[id(i + 1, j, k)] < 0; if (f0 !== f1) quad(at(i, j - 1, k - 1, 3), at(i, j, k - 1, 2), at(i, j, k, 0), at(i, j - 1, k, 1), f0); }
    if (i > 0 && k > 0) { const f1 = F[id(i, j + 1, k)] < 0; if (f0 !== f1) quad(at(i - 1, j, k - 1, 7), at(i - 1, j, k, 5), at(i, j, k, 4), at(i, j, k - 1, 6), f0); }
    if (i > 0 && j > 0) { const f1 = F[id(i, j, k + 1)] < 0; if (f0 !== f1) quad(at(i - 1, j - 1, k, 11), at(i, j - 1, k, 10), at(i, j, k, 8), at(i - 1, j, k, 9), f0); }
  }
  return { pos, nrm, idx, reads, cells: nx * ny * nz };
}

/* HOW SHUT IN A POINT OF THE SKIN IS, read off its own field (10-16, the supervisor: her shadow lift erases the brow's and the nose's shadows
   on her face; the field knows where the face folds in): steps out along the normal, 2 to 18 mm, each against how far the field says the
   nearest skin is — the sockets, under the nose and the brow, the nostrils, the lips' corners, behind the ears. 1 open, toward 0 shut in */
export function occlusion(f, x, y, z, nx, ny, nz) {
  let occ = 0, w = 1;
  for (let i = 0; i < 5; i++) { const h = 0.002 + 0.004 * i, d = f(x + nx * h, y + ny * h, z + nz * h); occ += Math.max(0, h - d) * w; w *= 0.7; }
  return Math.max(0, Math.min(1, 1 - occ * 38));
}
/* a piece's own weights: its bones by distance, and where the piece is `rigid` (0..1 by place) taken over by the head bone */
export function pieceWeights(pos, B, names, pc) {
  const w = weights(pos, B, names, (nm) => pc.bones.test(nm));
  if (!pc.rigid) return w;
  const hb = names.indexOf('head');
  for (let v = 0; v < pos.length / 3; v++) {
    const k = pc.rigid(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); if (k <= 0) continue;
    let slot = -1; for (let j = 0; j < 4; j++) if (w.si[v * 4 + j] === hb && w.sw[v * 4 + j] > 0) slot = j;
    if (slot < 0) { slot = 3; for (let j = 0; j < 4; j++) if (w.sw[v * 4 + j] < w.sw[v * 4 + slot]) slot = j; w.sw[v * 4 + slot] = 0; w.si[v * 4 + slot] = hb; }
    let sum = 0; for (let j = 0; j < 4; j++) { w.sw[v * 4 + j] = w.sw[v * 4 + j] * (1 - k) + (j === slot ? k : 0); sum += w.sw[v * 4 + j]; }
    for (let j = 0; j < 4; j++) w.sw[v * 4 + j] /= sum || 1;
  }
  return w;
}
/* ---------------- skin weights: each vertex to its nearest bones (of the bones allowed for that part), by distance ---------------- */
export function weights(pos, B, names, allowed) {
  const n = pos.length / 3, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  const segs = names.map((nm) => [B[nm].head, B[nm].tail]);
  for (let v = 0; v < n; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], cand = [];
    for (let b = 0; b < names.length; b++) {
      if (allowed && !allowed(names[b], x, y, z)) continue;
      const d = Math.max(0.004, capsule(x, y, z, segs[b][0], segs[b][1], 0));
      cand.push([b, 1 / Math.pow(d, 4)]);
    }
    cand.sort((p, q) => q[1] - p[1]); const top = cand.slice(0, 4); const s = top.reduce((a, c) => a + c[1], 0) || 1;
    for (let k = 0; k < 4; k++) { si[v * 4 + k] = top[k] ? top[k][0] : 0; sw[v * 4 + k] = top[k] ? top[k][1] / s : 0; }
  }
  return { si, sw };
}

/* ---------------- THE SIMPLIFIER: quadric error (Garland & Heckbert 1997), each edge collapsed INTO one of its two vertices (a half-edge
 * collapse), so every vertex that stays is one the sculpt made — its exact place on the surface, its normal, later its colour and its
 * weights. A collapse that would fold a triangle over, or pinch the surface (the link condition), is refused. Fine sculpt in, budget out.
 * Returns { pos, nrm, idx } of the kept vertices. ---------------- */
export function decimate(m, targetTris) {
  const P = m.pos, nv = P.length / 3, I = m.idx, nf = I.length / 3, held = m.held || null;   // held: vertices no collapse may remove (a mirrored half's midline)
  if (nf <= targetTris) return m;
  const F = Int32Array.from(I), alive = new Uint8Array(nf).fill(1), vAlive = new Uint8Array(nv).fill(1);
  const Q = new Float64Array(nv * 10), faceN = new Float64Array(nf * 3);
  const vf = Array.from({ length: nv }, () => []);
  const nrmOf = (a, b, c, out, o) => {
    const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2];
    const ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az, vx = P[c * 3] - ax, vy = P[c * 3 + 1] - ay, vz = P[c * 3 + 2] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (out) { out[o] = l ? nx / l : 0; out[o + 1] = l ? ny / l : 0; out[o + 2] = l ? nz / l : 0; }
    return l;
  };
  for (let f = 0; f < nf; f++) {
    const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2], area = nrmOf(a, b, c, faceN, f * 3) * 0.5;
    const nx = faceN[f * 3], ny = faceN[f * 3 + 1], nz = faceN[f * 3 + 2], d = -(nx * P[a * 3] + ny * P[a * 3 + 1] + nz * P[a * 3 + 2]);
    const q = [nx * nx, nx * ny, nx * nz, nx * d, ny * ny, ny * nz, ny * d, nz * nz, nz * d, d * d];
    /* a piece may weigh its error by place (`care`: the face more, what a beanie hides less): the triangles go where they are seen */
    const wq = m.care ? m.care((P[a * 3] + P[b * 3] + P[c * 3]) / 3, (P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]) / 3, (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3) : 1;
    for (const v of [a, b, c]) { for (let k = 0; k < 10; k++) Q[v * 10 + k] += q[k] * area * wq; vf[v].push(f); }
  }
  const errAt = (q, o, x, y, z) => q[o] * x * x + 2 * q[o + 1] * x * y + 2 * q[o + 2] * x * z + 2 * q[o + 3] * x + q[o + 4] * y * y + 2 * q[o + 5] * y * z + 2 * q[o + 6] * y + q[o + 7] * z * z + 2 * q[o + 8] * z + q[o + 9];
  /* the cost of u collapsing into v: (Qu + Qv) at v's place */
  const cost = (u, v) => { const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2]; return errAt(Q, u * 10, x, y, z) + errAt(Q, v * 10, x, y, z); };
  /* a binary heap of [cost, u, v, stamp-of-u, stamp-of-v] */
  const stamp = new Int32Array(nv), H = [];
  const push = (c, u, v) => { H.push([c, u, v, stamp[u], stamp[v]]); let i = H.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } };
  const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let s = i; if (l < H.length && H[l][0] < H[s][0]) s = l; if (r < H.length && H[r][0] < H[s][0]) s = r; if (s === i) break; [H[s], H[i]] = [H[i], H[s]]; i = s; } } return top; };
  const ring = (v) => { const s = new Set(); for (const f of vf[v]) if (alive[f]) for (let k = 0; k < 3; k++) { const w = F[f * 3 + k]; if (w !== v) s.add(w); } return s; };
  const offer = (a, b) => { if (held && held[a] && held[b]) return; if (held && held[a]) return push(cost(b, a), b, a); if (held && held[b]) return push(cost(a, b), a, b);
    const c1 = cost(a, b), c2 = cost(b, a); if (c1 <= c2) push(c1, a, b); else push(c2, b, a); };
  for (let f = 0; f < nf; f++) { const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2]; if (a < b) offer(a, b); if (b < c) offer(b, c); if (c < a) offer(c, a); }
  let tris = nf; const tmp = new Float64Array(3);
  while (tris > targetTris && H.length) {
    const [, u, v, su, sv] = pop();
    if (!vAlive[u] || !vAlive[v] || stamp[u] !== su || stamp[v] !== sv) continue;
    /* the link condition: u and v share exactly the vertices of the (one or two) faces on their edge */
    const ru = ring(u); if (!ru.has(v)) continue;
    const rv = ring(v); let shared = 0; for (const w of ru) if (rv.has(w)) shared++;
    let edgeFaces = 0; for (const f of vf[u]) if (alive[f] && (F[f * 3] === v || F[f * 3 + 1] === v || F[f * 3 + 2] === v)) edgeFaces++;
    if (shared !== edgeFaces || edgeFaces !== 2) continue;
    /* no triangle may fold over: u's faces that live on, with u moved onto v */
    let bad = false;
    for (const f of vf[u]) {
      if (!alive[f]) continue; const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2]; if (a === v || b === v || c === v) continue;
      const l = nrmOf(a === u ? v : a, b === u ? v : b, c === u ? v : c, tmp, 0);
      if (l < 1e-12 || tmp[0] * faceN[f * 3] + tmp[1] * faceN[f * 3 + 1] + tmp[2] * faceN[f * 3 + 2] < 0.25) { bad = true; break; }
    }
    if (bad) continue;
    /* collapse */
    for (const f of vf[u]) {
      if (!alive[f]) continue;
      const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
      if (a === v || b === v || c === v) { alive[f] = 0; tris--; continue; }
      for (let k = 0; k < 3; k++) if (F[f * 3 + k] === u) F[f * 3 + k] = v;
      nrmOf(F[f * 3], F[f * 3 + 1], F[f * 3 + 2], faceN, f * 3); vf[v].push(f);
    }
    for (let k = 0; k < 10; k++) Q[v * 10 + k] += Q[u * 10 + k];
    /* only v's edges change cost (its quadric grew; its place did not): its old entries are void by its stamp, its edges offered anew */
    vAlive[u] = 0; stamp[v]++;
    for (const w of ring(v)) offer(v, w);
  }
  /* the kept vertices, renumbered */
  const map = new Int32Array(nv).fill(-1), pos = [], nrm = [], idx = []; let n = 0;
  for (let f = 0; f < nf; f++) if (alive[f]) for (let k = 0; k < 3; k++) { const v = F[f * 3 + k]; if (map[v] < 0) { map[v] = n++; pos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); nrm.push(m.nrm[v * 3], m.nrm[v * 3 + 1], m.nrm[v * 3 + 2]); } idx.push(map[v]); }
  return { pos, nrm, idx, reads: m.reads, cells: m.cells };
}

/* JUNO AT A BUDGET: every piece meshed fine, then simplified so the whole is `budget` triangles; the face and the hands keep a larger share
 * than the cloth. The one source for the game (skater.js) and the test (tests/sculpt.mjs). */
const KEEP = { handL: 1.3, handR: 1.3, shoeL: 0.78, shoeR: 0.78, soleL: 0.3, soleR: 0.3, beanie: 0.9, hair: 1.7, tee: 0.8 };   // the shoes meshed finer (10-16): their weight set so the face and hands keep their share
/* the head takes a share of the budget of its own, by level of detail (10-16: meshed at 3 mm for the face, its fine count is no measure of
   its due; a friend's face is seen from further off, and its shoes needed their triangles back) */
export const SHARE = { head: [0.28, 0.2] };
export function junoAtBudget(B, budget, clock = () => 0, lod = 0) {
  const pieces = junoPieces(B), timing = {}, share = (pc) => (SHARE[pc.name] ? SHARE[pc.name][lod] : 0), stepOf = (pc) => (lod && pc.stepFar) || pc.step;
  /* a mirrored piece is meshed as the half it keeps: its grid from the middle of the cell on her midline out (sculpt.js mirrored) */
  const fine = pieces.map((pc) => { const t0 = clock(); const st = stepOf(pc), bx = pc.mirror ? midCell(pc.box, st) : pc.box; const m = nets(pc.f, pc.mirror ? [-0.5 * st, bx[1], bx[2], bx[3], bx[4], bx[5]] : bx, st); timing[pc.name] = clock() - t0; return m; });
  const shared = pieces.reduce((a, pc) => a + share(pc), 0);
  const want = fine.map((m, i) => (share(pieces[i]) ? 0 : m.idx.length / 3 * (KEEP[pieces[i].name] || 1))), wsum = want.reduce((a, b) => a + b, 0);
  const out = pieces.map((pc, i) => {
    const t0 = clock(), target = share(pc) ? Math.round(share(pc) * budget) : Math.max(120, Math.round(want[i] / wsum * budget * (1 - shared)));
    const m = pc.mirror ? mirrored(fine[i], target, stepOf(pc), pc.care) : decimate(fine[i], target);
    /* simplified this hard, a bumpy piece (the curls) keeps normals its few triangles cannot follow: they are taken from the mesh itself */
    if (!pc.mirror && target / (fine[i].idx.length / 3) < 0.15) meshNormals(m);
    timing[pc.name] += clock() - t0; return { pc, m };
  });
  return { out, timing, fineTris: fine.reduce((a, m, i) => a + m.idx.length / 3 * (pieces[i].mirror ? 2 : 1), 0) };
}
/* A FACE IS ITS OWN MIRROR (10-16, the owner: "the face is lob sided"): the head's grid had her midline 0.74 of a cell past a plane, and her
   sockets, 2.7 cells wide, came out different by up to 3.4 mm. A `mirror` piece is meshed on a grid with x = 0 in the middle of a cell (the
   field is its own mirror, so the cells on her midline put their vertices on it), only its half x ≥ 0 (from the middle of that cell out),
   simplified with the midline held, and mirrored: the two sides the same by construction, whatever the simplifier chose */
export function midCell(box, step) { const h = (Math.ceil(Math.max(-box[0], box[3]) / step - 0.5) + 0.5) * step; return [-h, box[1], box[2], h, box[4], box[5]]; }
export function mirrored(m, target, step, care = null) {
  const eps = step * 1e-3, nv = m.pos.length / 3, keep = new Int32Array(nv).fill(-1), pos = [], nrm = [], held = [];
  for (let v = 0; v < nv; v++) {
    if (m.pos[v * 3] < -eps) continue;
    const mid = Math.abs(m.pos[v * 3]) <= eps; keep[v] = pos.length / 3; held.push(mid ? 1 : 0);
    pos.push(mid ? 0 : m.pos[v * 3], m.pos[v * 3 + 1], m.pos[v * 3 + 2]); nrm.push(mid ? 0 : m.nrm[v * 3], m.nrm[v * 3 + 1], m.nrm[v * 3 + 2]);
  }
  const idx = []; for (let t = 0; t < m.idx.length; t += 3) { const a = keep[m.idx[t]], b = keep[m.idx[t + 1]], c = keep[m.idx[t + 2]]; if (a >= 0 && b >= 0 && c >= 0) idx.push(a, b, c); }
  const h = decimate({ pos, nrm, idx, held: Uint8Array.from(held), care, reads: m.reads, cells: m.cells }, Math.round(target / 2));
  const n = h.pos.length / 3, twin = new Int32Array(n), P = h.pos.slice(), N = h.nrm.slice();
  for (let v = 0; v < n; v++) { if (h.pos[v * 3] === 0) { twin[v] = v; continue; } twin[v] = P.length / 3; P.push(-h.pos[v * 3], h.pos[v * 3 + 1], h.pos[v * 3 + 2]); N.push(-h.nrm[v * 3], h.nrm[v * 3 + 1], h.nrm[v * 3 + 2]); }
  const I = h.idx.slice(); for (let t = 0; t < h.idx.length; t += 3) I.push(twin[h.idx[t]], twin[h.idx[t + 2]], twin[h.idx[t + 1]]);
  return { pos: P, nrm: N, idx: I, reads: m.reads, cells: m.cells };
}
function meshNormals(m) {
  const n = new Float64Array(m.pos.length), P = m.pos;
  for (let t = 0; t < m.idx.length; t += 3) {
    const a = m.idx[t] * 3, b = m.idx[t + 1] * 3, c = m.idx[t + 2] * 3, ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    for (const o of [a, b, c]) { n[o] += x; n[o + 1] += y; n[o + 2] += z; }
  }
  for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; m.nrm[i] = n[i] / l; m.nrm[i + 1] = n[i + 1] / l; m.nrm[i + 2] = n[i + 2] / l; }
}
