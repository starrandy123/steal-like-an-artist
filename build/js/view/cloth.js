/* THE CLOTH, finer than any triangle: on each piece of Juno's clothes the skin's shader raises the weave, sinks the seams with their
 * top-stitching, folds the cloth where it gathers (the knees and behind them, the hems stacked on the shoes, the elbow's crook, under the
 * arms) with a little shade in each crease, and gives her shoes their panels — a suede toe cap, eyestays and heel counter on the canvas, the
 * eyelets, a heel tab with Waxline's drop — the sole its ribbed wall and foxing stripe, and the sock its rib. Everything is placed in the skin's
 * BIND space (where the point of cloth was before the bones moved it), so it travels with the cloth; and every detail fades out as it grows
 * finer than the pixel that would draw it (the pixel's size in that space, from the screen's own derivatives), so nothing shimmers far off.
 * One source: the page's skin (skater.js) and the test that reads it (tests/drive/cloth.mjs). The shoe's own numbers come from its form. */
import { EYELET, COLLAR, SOCK, FACE, HEAD_DROP, BEANIE } from './sculpt.js';
import { WLHASH } from './surfaces.js';

export const CLOTH = { none: 0, jacket: 1, sleeve: 2, tee: 3, pants: 4, shoe: 5, sole: 6, beanie: 7, lace: 8, face: 9 };
export const clothOf = (name) => (name === 'jacket' ? 1 : name.startsWith('sleeve') ? 2 : name === 'tee' ? 3 : name === 'pants' ? 4 : name.startsWith('shoe') ? 5 : name.startsWith('sole') ? 6 : name === 'beanie' ? 7 : name === 'head' ? 9 : 0);

const f = (x) => (Number.isInteger(x) ? x.toFixed(1) : String(+x.toFixed(5)));
const v3 = (p) => 'vec3(' + p.map(f).join(', ') + ')';

export const clothVertex = { decl: 'attribute float cloth; varying vec3 vBind; varying vec3 vBindN; varying float vCloth;', body: 'vBind = position; vBindN = normal; vCloth = cloth;' };

/* the fragment's part: B the bind skeleton, lin(hex) → a linear colour {r, g, b}, who the skater (its cloth colours) */
export function clothFragment(B, lin, who) {
  const legL = [B.thighL.head, B.shinL.head, B.footL.head], legR = [B.thighR.head, B.shinR.head, B.footR.head];
  const armL = [B.armL.head, B.foreL.head, B.handL.head], armR = [B.armR.head, B.foreR.head, B.handR.head];
  const len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const armLen = len(armL[0], armL[1]), foreLen = len(armL[1], armL[2]), kneeS = len(legL[0], legL[1]), legLen = kneeS + len(legL[1], legL[2]);
  const C = (h) => { const c = lin(h); return 'vec3(' + [c.r, c.g, c.b].map(f).join(', ') + ')'; };
  const shoe = (sd) => [B['foot' + sd].head[0], B['foot' + sd].head[2] + 0.07];
  /* the brows' line: the parabola through their inner end, their peak and their tail (y = a x² + b x + c, x from the midline) */
  const [bx0, bx1, bx2] = FACE.hair.x, [by0, by1, by2] = FACE.hair.y, qa = ((by2 - by0) / (bx2 - bx0) - (by1 - by0) / (bx1 - bx0)) / (bx2 - bx1), qb = (by1 - by0) / (bx1 - bx0) - qa * (bx0 + bx1);
  const browQ = [qa, qb, by0 - qa * bx0 * bx0 - qb * bx0];
  return /* glsl */ `
varying vec3 vBind; varying vec3 vBindN; varying float vCloth;
uniform float uCloth, uPxAngle; uniform vec2 uClothParts;   /* a test's switch: x the relief, y the colours (1, 1 in the game) */
float cl_px;
float cl_ss(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float cl_sq(float x) { return x * x; }
float cl_shine = 1.0;   /* how much of the sky's sheen the skin keeps here (the brows' hair keeps little: edge-on it took the sky's grey) */
/* a line of the face w wide, as much as a pixel lets it be: widened to the pixel and fainter as it widens (its darkness kept), so it never
   shimmers far off — the pixel here at its true size, not grown by the skin turning away (cl_px grows as 1/facing for fine patterns) */
float cl_pxr;   /* the pixel's true size on her (set in clothMain beside cl_px: the painted look's toon shader declares its view position later) */
float cl_line(float d, float w) { float p = max(w, cl_pxr); return exp(-cl_sq(d / p)) * (w / p); }
${WLHASH}
/* a detail of this period, as much of it as the pixel can hold: all while the pixel is a quarter of the period, none from a half */
float cl_fade(float period) { return 1.0 - cl_ss(0.25 * period, 0.5 * period, cl_px); }
/* a weave's own fade: whole while a period spans eight pixels, gone at four (four and under beat with the pixels into moiré; measured against
   the frame's own 2×2 supersample) */
float cl_wfade(float period) { return 1.0 - cl_ss(0.125 * period, 0.25 * period, cl_px); }
/* inside a region (d < 0), its edge softened over the pixel */
float cl_in(float d) { float w = max(0.0003, cl_px); return 1.0 - cl_ss(-w, w, d); }   /* a full pixel each side: a pixel's own average of the edge */
/* a colour laid over what the cloth has so far, by a soft weight: the result is still one colour and one weight (final = mix(base, mixTo, mixK)),
   so panels, eyelets and the sock stack without a hard switch between them (a switch is an edge no fade can soften: round 11's crawl) */
void cl_layer(inout vec3 mixTo, inout float mixK, vec3 c, float w) { float k = 1.0 - (1.0 - mixK) * (1.0 - w); mixTo = (mixTo * mixK * (1.0 - w) + c * w) / max(k, 1e-4); mixK = k; }
/* the relief of a step (a patch's edge, a panel's edge, a flap): a line a pixel wide from afar, so it goes as the pixel nears its width */
float cl_step() { return cl_fade(0.004); }   /* gone by a 2 mm pixel: half a step of relief is a line of light a pixel wide */
/* a RELIEF's fade: its slope is the cloth's height a pixel over (clothMain), so a bump is shaded true only while its slopes span many pixels —
   the folds' own rule (a wave whole at 16 pixels, gone at 10), a bump of half-width w being half a wave of 4w. Faded by colour's rule (a
   quarter, a half its width), the seams' groove crawled along the pocket, the placket and the fly at 1.3 m (the middle view, 10-16) */
float cl_rfade(float w) { return 1.0 - cl_ss(0.25 * w, 0.4 * w, cl_px); }
/* a raised region's HEIGHT (a patch, a cap, a panel): its edge over four pixels each side — the step as the pixel would see it, its rise
   spread so its slope spans the pixels the shading reads it across (the cloth's height a pixel over). Softened over one pixel as a colour's edge
   is (cl_in), the chest pocket's rim shaded a line a pixel wide that crawled at 1.3 m; over two, 45 tiles of the middle view still did */
float cl_rise(float d) { float w = max(0.0003, 4.0 * cl_px); return 1.0 - cl_ss(-w, w, d); }
/* RIBS ROUND AN AXIS (a sock's rib, a beanie's, the collar's wales, the sole's wall): a whole number N of them, so they meet themselves where the
   angle wraps; faded by their spacing HERE — 2πr/N at the point's own distance r from the axis, against the pixel's size — and not by their
   spacing at some other radius (toward the axis their spacing goes to nothing: a star of moiré at the sock's top and the beanie's crown, the
   supervisor, round 11) */
float cl_ribs(float ang, float N, float r) {
  float perPx = cl_px * N / (6.2831853 * max(r, 1e-5));
  return (0.5 + 0.5 * cos(N * ang)) * (1.0 - cl_ss(0.07, 0.14, perPx));   /* whole at fourteen pixels a rib, gone at seven (at ten and five the beanie's
                                                                       crown crawled, round 14: the level head brought its apex into the crown view) */
}
/* a limb's own coordinates: s along it from its top joint, theta round it (0 at ref, +pi/2 at the front), r from its axis */
vec3 cl_limb(vec3 p, vec3 a, vec3 b, vec3 c, vec3 ref) {
  vec3 ab = b - a, bc = c - b;
  float t1 = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0), t2 = clamp(dot(p - b, bc) / dot(bc, bc), 0.0, 1.0);
  vec3 q1 = a + ab * t1, q2 = b + bc * t2;
  float k = cl_ss(-0.0006, 0.0006, dot(p - q1, p - q1) - dot(p - q2, p - q2));
  vec3 q = mix(q1, q2, k), ax = normalize(mix(ab, bc, k));
  float s = mix(t1 * length(ab), length(ab) + t2 * length(bc), k);
  vec3 r = p - q, e1 = normalize(ref - ax * dot(ref, ax)), e2 = normalize(cross(ax, e1));
  e2 *= (dot(e2, vec3(0.0, 0.0, 1.0)) < 0.0 ? -1.0 : 1.0);
  return vec3(s, atan(dot(r, e2), dot(r, e1)), length(r));
}
/* the weaves, 0..1: a plain weave (canvas, duck), a twill (the cargos), a jersey knit (the tee); P the thread's pitch */
float cl_plain(vec2 p, float P) { vec2 q = p / P, c = floor(q), g = fract(q) - 0.5; float up = mod(c.x + c.y, 2.0);
  return mix((1.0 - 4.0 * g.y * g.y) * (0.55 + 0.45 * cos(6.2832 * g.x)), (1.0 - 4.0 * g.x * g.x) * (0.55 + 0.45 * cos(6.2832 * g.y)), up); }
float cl_twill(vec2 p, float P) { return (0.5 + 0.5 * cos(6.2832 * (p.x + p.y) / P)) * (0.75 + 0.25 * cos(6.2832 * (p.x - p.y) / (P * 0.5))); }
float cl_jersey(vec2 p, float P) { vec2 q = p / P; float col = fract(q.x) - 0.5, row = fract(q.y + abs(col) * 0.8); return (1.0 - 4.0 * col * col) * (0.6 + 0.4 * sin(3.1416 * row)); }
/* a weave laid on the surface from three sides, blended by the bind normal */
float cl_weave(int kind, vec3 p, vec3 n, float P) {
  vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);
  if (kind == 0) return cl_plain(p.zy, P) * w.x + cl_plain(p.xz, P) * w.y + cl_plain(p.xy, P) * w.z;
  if (kind == 1) return cl_twill(p.zy, P) * w.x + cl_twill(p.xz, P) * w.y + cl_twill(p.xy, P) * w.z;
  return cl_jersey(p.zy, P) * w.x + cl_jersey(p.xz, P) * w.y + cl_jersey(p.xy, P) * w.z;
}
/* a seam: the cloth turned into it (a groove), the allowance pressed to one side under the cloth (a soft ridge that reads from afar), and a
   row of top-stitching d0 from it; d across the seam, u along it. Returns the height; the thread's share goes to th. */
float cl_seam(float d, float u, float d0, inout float th) {
  float groove = -0.00045 * exp(-d * d / 1.21e-6) * cl_rfade(0.0011);   /* each by its own width, as a relief: cl_rfade */
  float ridge = 0.00035 * exp(-(d - 0.0042) * (d - 0.0042) / 9.0e-6) * cl_rfade(0.003);
  /* the stitches: dashes 3.4 mm apart, each edge at least a pixel wide; the thread a line of its own width, widened to the pixel with its
     light kept (cl_line). The dashes are a WEAVE's kind of detail (a period of hard edges): whole while a period spans eight pixels, merged
     into the line by four (kept whole to four, their edges crawled at 1.3 m — the middle view, 10-16) */
  float x = d - d0, a = fract(u / 0.0034) * 0.0034, e = max(0.0004, cl_px);
  float dash = cl_ss(0.0, e, a) * (1.0 - cl_ss(0.0025 - 0.5 * e, 0.0025 + 0.5 * e, a));
  float across = cl_line(x, 0.0004), line = cl_line(x, 0.0005);
  float row = mix(0.45 * line, across * dash, cl_wfade(0.0034)) * cl_fade(0.0016);
  th = max(th, row);
  return groove + ridge + 0.00022 * row * cl_fade(0.0012);   /* the thread's own relief by its own width: a 0.4 mm thread, gone by a 0.6 mm pixel (at
                                                                0.35 mm the shoulder's stitching crawled in the crown view, round 14) */
}
/* a seam by a weight (0..1) that its gate fades it with: the height AND the thread's share (a seam cut by a hard gate where it is not yet
   nothing draws a hard line — the supervisor's class sweep, 10-16) */
float cl_seamW(float d, float u, float d0, inout float th, float w) { float t2 = 0.0; float hh = cl_seam(d, u, d0, t2); th = max(th, t2 * w); return hh * w; }
/* a fold: a wave of cloth of this height; its crease is kept (ao) for the shade baked into it. A fold's slope is read through the screen's
   derivatives, which step every second pixel: it is drawn whole only while its wave spans 16 pixels or more, and gone below 10 */
float cl_fold(float phase, float amp, float env, float period, inout float ao) { float w = sin(6.2832 * phase) * amp * env * (1.0 - cl_ss(period / 16.0, period / 10.0, cl_px)); ao = min(ao, w); return w; }

const vec3 LEG_L0 = ${v3(legL[0])}, LEG_L1 = ${v3(legL[1])}, LEG_L2 = ${v3(legL[2])}, LEG_R0 = ${v3(legR[0])}, LEG_R1 = ${v3(legR[1])}, LEG_R2 = ${v3(legR[2])};
const vec3 ARM_L0 = ${v3(armL[0])}, ARM_L1 = ${v3(armL[1])}, ARM_L2 = ${v3(armL[2])}, ARM_R0 = ${v3(armR[0])}, ARM_R1 = ${v3(armR[1])}, ARM_R2 = ${v3(armR[2])};
const float KNEE_S = ${f(kneeS)}, LEG_LEN = ${f(legLen)}, ARM_LEN = ${f(armLen)}, CUFF_S = ${f(armLen + 0.737 * foreLen)}, SLEEVE_END = ${f(armLen + 0.8 * foreLen)};
const vec2 SHOE_L = vec2(${f(shoe('L')[0])}, ${f(shoe('L')[1])}), SHOE_R = vec2(${f(shoe('R')[0])}, ${f(shoe('R')[1])});
const vec3 STITCH_JACKET = ${C(who.stitch.jacket)}, STITCH_PANTS = ${C(who.stitch.pants)}, STITCH_SHOE = ${C(who.stitch.shoe)};
const vec3 SUEDE = ${C(who.suede)}, SOCK = ${C(who.sock)}, FOXING = ${C(who.foxing)}, CANVAS = ${C(who.shoe)};
/* the face's places (sculpt.js FACE), its hair and its lips' colours */
const float HEAD_DROP = ${f(HEAD_DROP)}, MOUTH_Y = ${f(FACE.mouth.y)}, MOUTH_W = ${f(FACE.mouth.halfW)}, MOUTH_FOLD = ${f(FACE.mouth.fold)};
const vec3 BROW_Q = vec3(${f(browQ[0])}, ${f(browQ[1])}, ${f(browQ[2])}), BROW_X = ${v3(FACE.hair.x)}, BROW_T = ${v3(FACE.hair.t)};
const vec3 ALA = ${v3(FACE.nose.ala)}, NOSTRIL = ${v3(FACE.nose.nostril)}, NOSTRIL_R = ${v3(FACE.nose.nostrilR)}, NOSE_TIP = ${v3(FACE.nose.tip)};
const vec3 HAIR = ${C(who.hair)}, LIP = ${C(who.lip || '#6e3a2e')};

/* the cloth here: its height (metres, out of the surface); th the thread's share; tint a multiplier; mixTo/mixK a colour of its own (the
   suede, the sock, the stripe, an eyelet); rough the roughness (< 0: keep) */
float cl_height(vec3 p, vec3 n, float kind, out float th, out vec3 tint, out vec3 mixTo, out float mixK, out float rough) {
  th = 0.0; tint = vec3(1.0); mixTo = vec3(0.0); mixK = 0.0; rough = -1.0;
  float h = 0.0, ao = 0.0;
  if (kind < 0.5) return 0.0;
  if (kind < 1.5) {                              /* THE JACKET: duck canvas; side, shoulder, yoke, placket, hem and collar seams; a chest pocket */
    h += 0.00005 * cl_weave(0, p, n, 0.0014) * cl_wfade(0.0014);
    float ax = abs(p.x);
    float cm = cl_in(1.402 - p.y);               /* the collar: corduroy, its wales up the collar, its shade laid on softly */
    tint *= mix(1.0, 0.9, cm); if (cm > 0.01) rough = mix(0.86, 0.97, cm);
    if (p.y > 1.39) {
      h += 0.00025 * cl_ribs(atan(p.x, p.z + 0.01), 168.0, length(vec2(p.x, p.z + 0.01))) * cm;
      h += cl_seam(p.y - 1.404, p.x, -0.0035, th);
    }
    if (p.y < 1.42) {
      h += cl_fold((ax * 0.9 + (1.32 - p.y) * 0.45) / 0.045, 0.0016, cl_ss(0.06, 0.11, ax) * cl_ss(1.0, 1.08, p.y) * (1.0 - cl_ss(1.26, 1.33, p.y)), 0.045, ao);
      h += cl_fold(p.y / 0.019 + sin(p.x * 47.0) * 0.32 + 0.4 * sin(p.x * 19.0 + p.y * 31.0), 0.001 * (0.55 + 0.45 * sin(p.x * 29.0 + 1.3)), cl_ss(1.075, 1.0, p.y) * cl_ss(0.990, 0.997, p.y), 0.019, ao);
      h += cl_fold(p.x / 0.075 + 0.3 * sin(p.y * 11.0 + p.x * 9.0), 0.0013, cl_ss(-0.005, -0.03, p.z) * cl_ss(1.33, 1.24, p.y) * cl_ss(1.0, 1.07, p.y), 0.075, ao);
      if (ax > 0.08 && p.y < 1.32) h += cl_seamW(p.z + 0.012, p.y, 0.0045, th, cl_ss(0.08, 0.11, ax) * cl_ss(1.32, 1.30, p.y));
      if (p.y > 1.365 && ax > 0.04 && n.y > 0.3) h += cl_seamW(p.z + 0.014, p.x, 0.004, th, cl_ss(1.365, 1.375, p.y) * cl_ss(0.04, 0.05, ax) * cl_ss(0.3, 0.4, n.y) * cl_ss(1.42, 1.41, p.y));
      if (p.z < -0.02) h += cl_seamW(p.y - 1.335, p.x, -0.004, th, cl_ss(-0.02, -0.035, p.z));
      float edge = 0.028 + max(0.0, (p.y - 1.32) * 0.34);
      if (p.z > 0.02) h += cl_seamW(ax - edge - 0.0065, p.y, 0.0, th, 0.6 * cl_ss(0.02, 0.035, p.z) * cl_ss(1.42, 1.41, p.y));
      h += cl_seam(p.y - 0.9975, p.x, 0.004, th);
      if (p.y < 1.0) h += cl_seamW(p.y - 0.982, p.x, 0.0, th, 0.6 * cl_ss(1.0, 0.99, p.y));
      if (p.z > 0.03 && p.x > 0.03) {            /* the chest pocket on her left: a raised patch, stitched round, its top hemmed */
        vec2 q = vec2(p.x - 0.085, p.y - 1.275), dq = abs(q) - vec2(0.04, 0.06) + 0.006;
        float box = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0) - 0.006;
        h += 0.0008 * cl_rise(box) * cl_step();
        if (box < 0.012) h += cl_seamW(box + 0.003, q.x + q.y, 0.0, th, cl_ss(0.012, 0.006, box));
        if (box < 0.002) h += cl_seamW(q.y - 0.044, q.x, 0.0, th, 0.8 * cl_ss(0.002, -0.002, box));
      }
    }
  } else if (kind < 2.5) {                       /* THE SLEEVES: the underarm seam, the armhole's stitching, the cuff; the elbow's folds */
    vec3 c = p.x > 0.0 ? cl_limb(p, ARM_L0, ARM_L1, ARM_L2, vec3(-1.0, 0.0, 0.0)) : cl_limb(p, ARM_R0, ARM_R1, ARM_R2, vec3(1.0, 0.0, 0.0));
    float s = c.x, t = c.y, r = c.z, de = s - ARM_LEN, front = max(0.0, cos(t - 1.5708)), back = max(0.0, cos(t + 1.5708));
    /* the weave in the sleeve's own coordinates — round it and along it — so it runs on unbroken; its one join is the underarm seam */
    h += 0.00005 * cl_plain(vec2((t < 0.0 ? t + 6.2832 : t) * r, s), 0.0014) * cl_wfade(0.0014);
    h += cl_seam(t * r, s, 0.004, th);
    float ur = (t < 0.0 ? t + 6.2832 : t) * r;   /* round the sleeve, its join at the underarm seam */
    h += cl_seam(s - 0.04, ur, 0.0, th) * 0.7;
    h += cl_seam(s - CUFF_S, ur, 0.004, th);
    h += cl_seam(s - (SLEEVE_END - 0.005), ur, 0.0, th) * 0.6;
    h += cl_fold((de + 0.012 * cos(t - 1.5708)) / 0.022, 0.0024, exp(-de * de / 0.0025) * cl_ss(0.1, 0.7, front), 0.022, ao);
    h += cl_fold(de / 0.03 + 0.15 * sin(t * 2.0), 0.0012, exp(-de * de / 0.002) * cl_ss(0.1, 0.7, back), 0.03, ao);
    h += cl_fold(s / 0.05 + t * 0.31831, 0.0011, cl_ss(ARM_LEN + 0.03, ARM_LEN + 0.07, s) * cl_ss(CUFF_S, CUFF_S - 0.03, s), 0.05, ao);
    h += cl_fold(s / 0.03 + t * 0.47746, 0.0013, cl_ss(0.03, 0.06, s) * cl_ss(0.12, 0.07, s) * cl_ss(0.2, 0.9, cos(t)), 0.03, ao);
  } else if (kind < 3.5) {                       /* THE TEE: jersey, and its hem's twin needle */
    h += 0.00004 * cl_weave(2, p, n, 0.0012) * cl_wfade(0.0012);
    h += cl_seam(p.y - 0.994, p.x, 0.0, th) * 0.5 + cl_seam(p.y - 0.988, p.x, 0.0, th) * 0.5;
  } else if (kind < 4.5) {                       /* THE CARGOS: twill; out- and inseams, the rise; the pocket and its flap; the knees, behind them, the stacked hems */
    float sd = p.x > 0.0 ? 1.0 : -1.0;
    vec3 c = sd > 0.0 ? cl_limb(p, LEG_L0, LEG_L1, LEG_L2, vec3(1.0, 0.0, 0.0)) : cl_limb(p, LEG_R0, LEG_R1, LEG_R2, vec3(-1.0, 0.0, 0.0));
    float s = c.x, t = c.y, r = c.z, dk = s - KNEE_S, front = max(0.0, cos(t - 1.5708)), back = max(0.0, cos(t + 1.5708));
    /* the twill in the leg's own coordinates — round it and along it — unbroken down the leg (laid on from three sides it broke into patches
       where the leg's normal turned: the knee, 10-16); its one join is the inseam */
    h += 0.00005 * cl_twill(vec2(t * r, s), 0.0018) * cl_wfade(0.0018);
    /* the outseam runs up to the waist under the jacket (cut at 0.93 it stopped dead mid-hip); the inseam to the crotch, where the rise takes
       over; each faded out over a centimetre, never cut */
    if (p.y < 1.0) h += cl_seamW(t * r, s, 0.005, th, cl_ss(1.0, 0.98, p.y));
    if (p.y < 0.83) h += cl_seamW((3.14159 - abs(t)) * r, s, 0.004, th, cl_ss(0.83, 0.79, p.y));
    h += cl_seam(s - (LEG_LEN - 0.012), t * r, 0.0, th) * 0.5;
    if (p.y > 0.77 && abs(p.x) < 0.03) h += cl_seamW(p.x, p.y, 0.004, th, cl_ss(0.77, 0.79, p.y) * cl_ss(0.03, 0.02, abs(p.x)));
    vec3 pq = p - vec3(0.205 * sd, 0.68, 0.075);
    if (abs(pq.y) < 0.085 && abs(pq.x) < 0.08 && abs(pq.z) < 0.06) {
      /* the pocket read from the side and from the front, blended by the normal (switched by it, its outline broke on a vertical line) */
      vec2 qs = vec2(pq.z, pq.y), qf = vec2(pq.x, pq.y), dqs = abs(qs) - vec2(0.028, 0.058) + 0.012, dqf = abs(qf) - vec2(0.045, 0.058) + 0.012;
      float wS = cl_ss(-0.2, 0.2, abs(n.x) - abs(n.z)), box = mix(length(max(dqf, 0.0)) + min(max(dqf.x, dqf.y), 0.0), length(max(dqs, 0.0)) + min(max(dqs.x, dqs.y), 0.0), wS) - 0.012;
      vec2 q = mix(qf, qs, wS);
      if (box < 0.012) { float wb = cl_ss(0.012, 0.004, box); h += cl_seamW(box + 0.004, q.x + q.y, 0.0, th, wb); h += cl_seamW(q.y - 0.02, q.x, -0.004, th, wb) - 0.0009 * cl_ss(0.0215, 0.0185, q.y) * cl_ss(0.012, 0.018, q.y) * cl_step() * wb; }
    }
    float wob = sin(t * 2.0 + s * 23.0 + sd), wob2 = sin(t - s * 37.0 + 2.0 * sd);   /* whole turns of the angle: none jumps at the inseam */
    h += cl_fold((dk + 0.015 * cos(t - 1.5708)) / 0.028 + 0.2 * wob, 0.0015 * (0.6 + 0.4 * wob2), exp(-dk * dk / 0.0025) * cl_ss(0.1, 0.8, front), 0.028, ao);
    h += cl_fold((dk - 0.01) / 0.022 + 0.28 * sin(t * 3.0) + 0.15 * wob2, 0.0019, exp(-(dk - 0.01) * (dk - 0.01) / 0.0016) * cl_ss(0.1, 0.8, back), 0.022, ao);
    /* the hem stacked on the shoe: its rings of uneven depth and pitch, twisting round the leg, only in its last eleven centimetres */
    h += cl_fold(s / 0.022 + 0.55 * sin(s * 41.0 + t * 2.0 + sd) + 0.3 * sin(2.0 * t + 2.0 * sd), 0.0017 * (0.5 + 0.5 * wob), cl_ss(LEG_LEN - 0.11, LEG_LEN - 0.05, s), 0.022, ao);
    h += cl_fold((s * 0.9 - abs(t) * r * 0.5) / 0.03, 0.0008,   /* |t|: the fold fans out from the crotch alike on both sides (t * r jumped at the inseam, where it is strongest) */ cl_ss(0.17, 0.05, s) * cl_ss(1.4, 2.4, abs(t)), 0.03, ao);
    /* a broad drape the length of the leg, the shape the cloth keeps from afar */
    h += cl_fold(t * 0.47746 + s * 1.3 + sd * 0.3 + 0.2 * sin(s * 9.0), 0.0016, cl_ss(0.06, 0.2, s) * cl_ss(LEG_LEN, LEG_LEN - 0.08, s), 0.11, ao);
  } else if (kind < 5.5) {                       /* THE SHOES: canvas; a suede toe cap, eyestays and heel counter; the eyelets; a heel tab; the sock */
    vec2 S = p.x > 0.0 ? SHOE_L : SHOE_R; float X = p.x - S.x, Z = p.z - S.y, Y = p.y, ex = abs(X);
    float sockR = length(vec2(X, Z - ${f(SOCK.z)}));
    /* the sock where it comes out of the collar, by a soft mask (a hard one was an edge no fade could reach) */
    float sockM = cl_in(0.096 + 0.012 * cl_ss(0.0, -0.035, Z - ${f(COLLAR.z)}) + 0.009 - Y) * cl_in(sockR - ${f(SOCK.r + 0.004)});
    h += 0.00004 * cl_weave(0, p, n, 0.0012) * cl_wfade(0.0012) * (1.0 - sockM);
    float suede = 0.0;
    float dCap = (0.062 - 18.0 * X * X - 0.25 * max(0.0, Y - 0.04)) - Z;           /* the toe cap: in front of a line curving back down the sides */
    suede = max(suede, cl_in(dCap));
    if (dCap < 0.006) { h += 0.0005 * cl_rise(dCap) * cl_step(); h += cl_seam(-dCap - 0.0018, X + Y, 0.0, th) * 0.8 + cl_seam(-dCap - 0.0042, X + Y, 0.0, th) * 0.8; }
    /* the eyestays, their stitching and the eyelets; the tongue between — inside a soft gate */
    float gate = cl_in(0.058 - Y) * cl_in(-0.058 - Z) * cl_in(Z - 0.072), ring = 0.0, hole = 0.0;
    if (gate > 0.0) {
      float es = cl_in(0.0105 - ex) * cl_in(ex - 0.03) * gate; suede = max(suede, es); h += 0.0004 * cl_rise(0.0105 - ex) * cl_rise(ex - 0.03) * gate * cl_step();
      h += (cl_seam(ex - 0.0275, Z, 0.0, th) * 0.7 + cl_seam(ex - 0.0128, Z, 0.0, th) * 0.7) * gate;
      tint *= mix(1.0, 0.9, cl_in(ex - 0.0105) * gate);
      float e = 1.0;
      for (int i = 0; i < ${EYELET.n}; i++) e = min(e, length(vec2(ex - ${f(EYELET.x)}, Z - (${f(EYELET.z0)} + float(i) * ${f(EYELET.dz)}))));
      ring = cl_in(e - 0.0026) * cl_fade(0.0045) * gate; hole = cl_in(e - 0.0015) * cl_fade(0.0045) * gate;   /* a ring 2 mm across: gone before a pixel can only twinkle it */
      h += (0.0004 * ring - 0.0008 * hole) * cl_step();
    }
    float dHeel = (-0.085 - Z) - 0.35 * (Y - 0.03);                                 /* the heel counter */
    suede = max(suede, cl_in(-dHeel));
    if (dHeel > -0.004) h += 0.0004 * cl_rise(-dHeel) * cl_step() + cl_seam(dHeel - 0.002, Y + X, 0.0, th) * 0.8;
    if (ex < 0.012 && Y > 0.066 && Y < 0.102 && Z < -0.105) {                       /* the heel tab, and Waxline's drop on it in cream */
      vec2 q = vec2(X, Y - 0.082); float drop = min(length(q) - 0.0032, max(abs(q.x) - (0.0072 - q.y) * 0.492, -q.y + 0.0013));
      h += 0.0003 * cl_rise(drop) * cl_step(); th = max(th, cl_in(drop) * 0.9 * cl_fade(0.005));   /* a 6 mm mark: gone before it is two pixels */
    }
    if (suede > 0.0) h += 0.00003 * cl_weave(0, p * 1.7, n, 0.0012) * cl_wfade(0.0012 / 1.7) * suede;
    /* the colours, layered: the suede panels, then the eyelets' rings and holes, then the sock over all */
    cl_layer(mixTo, mixK, SUEDE, suede); rough = mix(0.8, 0.97, suede);
    cl_layer(mixTo, mixK, vec3(0.42, 0.43, 0.45), ring); cl_layer(mixTo, mixK, vec3(0.04), hole); rough = mix(rough, 0.35, ring);
    h += 0.00015 * cl_ribs(atan(X, Z - ${f(SOCK.z)}), 97.0, sockR) * sockM * cl_ss(0.6, 0.3, abs(n.y));   /* round the sock's side, not over its cap */
    cl_layer(mixTo, mixK, SOCK, sockM); rough = mix(rough, 0.95, sockM); th *= 1.0 - sockM;
  } else if (kind < 6.5) {                       /* THE SOLES: a ribbed wall, a foxing stripe, the edge the upper meets */
    vec2 S = p.x > 0.0 ? SHOE_L : SHOE_R; float X = p.x - S.x, Z = p.z - S.y, Y = p.y;
    h += 0.00012 * cl_ribs(atan(X, Z * 0.32), 143.0, 0.05) * cl_ss(0.003, 0.005, Y) * cl_ss(0.0175, 0.0155, Y);   /* the wall's ribs are 2.2 mm apart all round it */
    h += 0.00018 * (0.5 + 0.5 * cos(6.2832 * Y / 0.0018)) * cl_fade(0.0018) * cl_ss(0.1, 0.11, Z);
    float stripe = cl_in(0.0194 - Y) * cl_in(Y - 0.0236);
    h += 0.0002 * stripe * cl_step(); mixTo = FOXING;
    mixK = mix(0.38 * exp(-(Y - 0.0215) * (Y - 0.0215) / 3.6e-5), stripe, cl_fade(0.0042));   /* 4 mm of stripe a soft band once it spans under four pixels */
    h -= 0.0004 * exp(-(Y - 0.0285) * (Y - 0.0285) / 4.9e-7) * cl_fade(0.003);
  } else if (kind > 8.5) {                       /* THE FACE, a man's: the brows' hair, the lips and the line between them, the philtrum, the
                                                    nostrils, the creases round the nose's wings and down to the mouth, the fold under the lower
                                                    lip; and the skin's colours by zone — the lips, a beard's shadow, warmth on the cheeks, the nose
                                                    and the ears, the shade under the eyes, a sheen on the forehead and the nose. In sculpt space
                                                    (FACE), each pair read on |x| */
    vec3 q = p + vec3(0.0, HEAD_DROP, 0.0); float ax = abs(q.x), y = q.y;
    /* every term of the face is its own region, faded at its edges: no gate round the whole (it cut the beard on the neck at z 0.02) */
    {
      float front = cl_ss(0.0, 0.03, q.z);
      float rough0 = 0.64;
      float fw = max(0.0003, cl_pxr);   /* a colour's edge a true pixel wide, the lips' (capped at 1.5 mm it went hard far off: round 14) */
      /* THE BROWS' HAIR (V11, the supervisor's list: "rectangles of scribble with square ends ... make them hair"): its shape a smooth taper —
         full and rounded at the head, thinning to a point at the tail; no outline: the hair thins toward every edge over a millimetre or more
         (never less than a pixel and a half); and the hair itself strands laid along its growth (up at the head, out along the arch, a little
         down at the tail), each strand a smooth taper of its own length, place and strength — a hash moves a strand, it never switches one off
         (a step() on a hash, a cell on or off, was the scribble) */
      float bu = (ax - BROW_X.x) / (BROW_X.z - BROW_X.x), byc = (BROW_Q.x * ax + BROW_Q.y) * ax + BROW_Q.z;
      float bpk = (BROW_X.y - BROW_X.x) / (BROW_X.z - BROW_X.x);
      float bt = mix(mix(BROW_T.x, BROW_T.y, cl_ss(0.0, bpk, bu)), BROW_T.z * 0.55, cl_ss(bpk, 1.0, bu));   /* its thickness: smooth all along, its tail to a point */
      float hb = 0.5 * bt, e = abs(y - byc), soft = max(0.45 * hb, 1.5 * cl_pxr);
      float cover = (1.0 - cl_ss(hb - soft, hb + 0.25 * soft, e))
                  * cl_ss(BROW_X.x - 0.0006, BROW_X.x + 0.0032, ax + 0.0012 * cl_sq(e / max(hb, 1e-4)))   /* the head: rounded, soft */
                  * (1.0 - cl_ss(BROW_X.z - 0.007, BROW_X.z + 0.0005, ax));                              /* the tail: thinning away */
      float brow = cover * cl_ss(0.065, 0.075, q.z);
      if (brow > 0.0) {
        float ang = radians(mix(78.0, 18.0, cl_ss(0.0, 0.32, bu)) - 22.0 * cl_ss(0.72, 1.0, bu));
        vec2 dir = vec2(cos(ang), sin(ang)), at = vec2(ax, y), nrm2 = vec2(-dir.y, dir.x);
        /* two layers of strands, the second set between the first's: across, a strand's line; along, its own length and place */
        float hair = 0.0;
        for (int L = 0; L < 2; L++) {
          float fl = float(L), across = dot(at, nrm2) / 0.00034 + 0.5 * fl, i = floor(across), fa = fract(across);
          float h1 = wlHash(vec2(i, 3.1 + fl)), h2 = wlHash(vec2(i, 7.7 + fl));
          float len = 0.0034 + 0.0022 * h2, f = fract(dot(at, dir) / len + h1);
          float strand = (1.0 - cl_ss(0.16, 0.46, abs(fa - 0.5))) * pow(sin(3.14159 * f), 0.7) * (0.45 + 0.55 * wlHash(vec2(i, floor(dot(at, dir) / len + h1) + 17.0 + fl)));
          hair = max(hair, strand * (1.0 - 0.25 * fl));
        }
        hair *= cl_ss(0.0, 0.7, cover);   /* the strands thin toward the edges, as the hair does */
        float strokes = mix(0.8, 0.22 + 0.78 * hair, cl_fade(0.0007));
        cl_shine = 1.0 - 0.85 * brow;
        cl_layer(mixTo, mixK, HAIR, brow * strokes); h += 0.00012 * brow * hair * cl_rfade(0.0002); rough0 = mix(rough0, 0.97, brow);   /* hair barely shines: at 0.78 the far brow, seen edge-on, took the sky's grey */
      }
      /* THE LIPS: the upper's border with its cupid's bow, the lower's, the line between them; their colour; a sheen */
      float up = 0.0062 * pow(max(0.0, 1.0 - (ax / MOUTH_W) * (ax / MOUTH_W)), 0.6) + 0.0006 * exp(-cl_sq((ax - 0.005) / 0.0022)) - 0.0005 * exp(-cl_sq(ax / 0.0018));
      float lo = 0.0085 * pow(max(0.0, 1.0 - (ax / (MOUTH_W - 0.0015)) * (ax / (MOUTH_W - 0.0015))), 0.55);
      float line = MOUTH_Y - 0.0006 * (ax / MOUTH_W) * (ax / MOUTH_W);
      float lips = (1.0 - cl_ss(-fw, fw, y - (MOUTH_Y + up))) * (1.0 - cl_ss(-fw, fw, (MOUTH_Y - lo) - y)) * (1.0 - cl_ss(-fw, fw, ax - MOUTH_W)) * cl_ss(0.08, 0.088, q.z);
      cl_layer(mixTo, mixK, LIP, lips * 0.78); rough0 = mix(rough0, 0.5, lips);
      h += 0.00016 * cl_line(y - MOUTH_Y - up, 0.0006) * cl_fade(0.0012) * (1.0 - cl_ss(MOUTH_W - 0.003, MOUTH_W, ax)) * cl_ss(0.08, 0.088, q.z);   /* the border's roll */
      float lineK = cl_line(y - line, 0.00055) * (1.0 - cl_ss(MOUTH_W - 0.004, MOUTH_W + 0.001, ax)) * cl_ss(0.08, 0.088, q.z);
      h -= 0.00035 * lineK * cl_fade(0.0011); tint *= 1.0 - 0.6 * lineK;   /* the line by its shade more than its depth: a deep groove's edge caught the sun in a white streak */
      /* THE PHILTRUM: two ridges from the bow up to the nose, the groove between */
      float band = cl_ss(MOUTH_Y + up, MOUTH_Y + up + 0.002, y) * (1.0 - cl_ss(1.599, 1.6015, y)) * cl_ss(0.085, 0.093, q.z);
      h += (0.00035 * exp(-cl_sq((ax - 0.0048) / 0.0012)) - 0.0002 * exp(-cl_sq(ax / 0.0018))) * band * cl_fade(0.0024);
      /* THE NOSTRILS: a teardrop each, its long way turned in toward the tip (25°), narrow at the front and round at the back, set inside the
         wing's rim, and only where the underside faces well down — from the side the rim hides it (V11, the supervisor: an ellipse the size
         of the underside read in profile as a large dark hole) */
      vec2 nq = vec2(ax - (NOSTRIL.x - 0.0006), q.z - NOSTRIL.z), nr = vec2(nq.x * 0.906 + nq.y * 0.423, -nq.x * 0.423 + nq.y * 0.906);
      float nwx = NOSTRIL_R.x * 0.72 * mix(1.0, 0.55, cl_ss(-0.004, 0.005, nr.y)), dn = length(vec2(nr.x / nwx, nr.y / (NOSTRIL_R.z * 0.9)));
      float nostril = cl_in((dn - 0.85) * nwx) * cl_ss(-0.55, -0.82, n.y) * cl_ss(NOSTRIL.y + 0.004, NOSTRIL.y + 0.001, y);
      cl_layer(mixTo, mixK, vec3(0.05, 0.028, 0.02), nostril * 0.8);
      /* THE WINGS' CREASE, round each wing on its CHEEK side only, soft (V11: drawn over the wing's top as a sharp line, it ran across the
         nose's base like a cut — the supervisor's list) */
      float dc = abs(length(vec2((ax - ALA.x) / 0.0088, (y - ALA.y) / 0.0084)) - 1.0) * 0.0086;
      float crease = cl_line(dc, 0.0012) * cl_ss(ALA.x - 0.001, ALA.x + 0.003, ax) * cl_ss(ALA.y - 0.007, ALA.y - 0.003, y) * cl_ss(0.08, 0.088, q.z);
      h -= 0.0002 * crease * cl_rfade(0.0012); tint *= 1.0 - 0.2 * crease;
      /* THE FOLD FROM THE WING TO THE MOUTH'S CORNER (a man's: a soft one) */
      vec2 f0 = vec2(0.0205, 1.603), f1 = vec2(0.0315, MOUTH_Y - 0.003), fd = f1 - f0; float ft = clamp(dot(vec2(ax, y) - f0, fd) / dot(fd, fd), 0.0, 1.0);
      /* a broad valley under the cheek, not a line (V11: 1.7 mm wide and half a millimetre deep, it read "cut like a knife") */
      float fold = cl_line(length(vec2(ax, y) - (f0 + fd * ft)), 0.0045) * sin(3.1416 * ft) * cl_ss(0.065, 0.075, q.z);
      h -= 0.0004 * fold * cl_rfade(0.0045); tint *= 1.0 - 0.07 * fold;
      /* THE FOLD UNDER THE LOWER LIP */
      float sul = exp(-cl_sq((y - MOUTH_FOLD) / 0.0024)) * exp(-cl_sq(ax / 0.016)) * cl_ss(0.08, 0.088, q.z);
      h -= 0.0004 * sul * cl_rfade(0.0024); tint *= 1.0 - 0.08 * sul;
      /* THE BEARD'S SHADOW: below a line from the sideburn down the cheek to the mouth's corner, over the chin and the jaw, and the moustache
         between the nose and the lip — darker and a little cool; not on the lips */
      float bl = mix(1.646, 1.6, cl_ss(0.074, 0.042, ax)) - 0.012 * cl_ss(0.042, 0.03, ax);
      float beard = (1.0 - cl_ss(bl - 0.006, bl + 0.002, y)) * cl_ss(-0.035, 0.0, q.z);
      float tache = cl_ss(MOUTH_Y + up + 0.0006, MOUTH_Y + up + 0.0024, y) * (1.0 - cl_ss(1.5985, 1.6012, y)) * (1.0 - cl_ss(0.024, 0.03, ax));
      beard = max(beard, tache) * (1.0 - lips) * (1.0 - nostril);
      tint *= mix(vec3(1.0), vec3(0.83, 0.82, 0.86), beard * 0.7);
      /* WARMTH: the cheeks, the nose's tip, the ears; the shade under the eyes */
      float malar = exp(-(cl_sq((ax - 0.045) / 0.017) + cl_sq((y - 1.628) / 0.013)));
      float tipW = exp(-cl_sq(length(q - NOSE_TIP) / 0.011)), earW = cl_ss(0.068, 0.078, ax);
      tint *= mix(vec3(1.0), vec3(1.06, 0.97, 0.94), max(malar * 0.6, max(tipW * 0.7, earW * 0.6)));
      tint *= 1.0 - 0.1 * exp(-(cl_sq((ax - 0.033) / 0.012) + cl_sq((y - 1.6435) / 0.0055)));
      /* a sheen on the forehead and down the nose */
      float tz = max(cl_ss(1.672, 1.69, y) * (1.0 - cl_ss(0.03, 0.05, ax)), exp(-cl_sq(ax / 0.009)) * cl_ss(1.6, 1.62, y) * (1.0 - cl_ss(1.66, 1.672, y)) * cl_ss(0.085, 0.095, q.z));
      rough = mix(mix(rough0, 0.52, tz * (1.0 - brow) * front), 0.5, lips);
    }
  } else if (kind > 7.5) {                       /* THE LACES: a cord 4 mm across is a pixel and a half from afar — its cream twinkled as specks on the
                                                    suede, and a middle tone still stood out against both; from afar a cord takes the colour of what it lies
                                                    on (the eyestay's suede, or the canvas of the tongue and the throat), as real laces go into the shoe */
    vec2 S = p.x > 0.0 ? SHOE_L : SHOE_R; float ex = abs(p.x - S.x), Z = p.z - S.y;
    float under = cl_in(0.0105 - ex) * cl_in(ex - 0.03) * cl_in(-0.058 - Z) * cl_in(Z - 0.072);
    mixTo = mix(CANVAS, SUEDE, under); mixK = 1.0 - cl_fade(0.0045); return 0.0;
  } else {                                       /* THE BEANIE: ribs round the head, the knit's own stitches */
    /* the rolled cuff's ribs half as deep (its roll turns them across a low sun: each lit in a long streak that flickered from above, round 14) */
    float ys = p.y + ${f(HEAD_DROP)}, cuff = 1.0 - cl_ss(${f(BEANIE.cuff)}, ${f(BEANIE.cuff + 0.01)}, ys - (${f(BEANIE.edge[0])} + max(0.0, p.z - ${f(BEANIE.edge[1])}) * ${f(BEANIE.edge[2])}));
    h += 0.00035 * cl_ribs(atan(p.x, p.z + 0.008), 143.0, length(vec2(p.x, p.z + 0.008))) * (1.0 - 0.5 * cuff);
    h += 0.00005 * (0.5 - 0.5 * cos(6.2832 * p.y / 0.0016)) * cl_wfade(0.0016);   /* the knit's rows, a smooth wave (a kinked one fed the pixels its harmonics) */
  }
  tint *= 1.0 - 0.28 * cl_ss(0.0, -0.0026, ao);
  return h * uCloth;
}
/* the surface's normal tilted by the height's slope across the screen (no tangents needed) */
vec3 cl_perturb(vec3 pos, vec3 nrm, vec2 dH, float faceDir) {
  vec3 sx = dFdx(pos), sy = dFdy(pos), r1 = cross(sy, nrm), r2 = cross(nrm, sx);
  float det = dot(sx, r1) * faceDir;
  return normalize(abs(det) * nrm - sign(det) * (dH.x * r1 + dH.y * r2));
}
vec3 cl_thread(float kind) { return kind < 2.5 ? STITCH_JACKET : kind < 4.5 ? STITCH_PANTS : STITCH_SHOE; }
`;
}
/* the fragment's main: after the normal is made, before the light reads the colour and the roughness. The painted look draws the skin with a
   toon material through the same hook (style.js twin): there the cloth keeps its colours (the panels, the stripe, the thread) and leaves its
   relief out — a band of toon light that steps with every fold and stitch is noise, as the style's own rule for normal maps says — and a
   toon shader has no roughness */
export const clothMain = `
  { /* the pixel's size on her, read smoothly: her distance by the angle a pixel spans, widened where her surface turns away (the screen's own
       derivatives of a position are constant across each triangle: a fade read from them changed at every edge — patches on the knee, 10-16) */
    cl_pxr = length(vViewPosition) * uPxAngle;
    cl_px = max(length(vViewPosition) * uPxAngle / max(0.1, abs(dot(normal, normalize(vViewPosition)))), 0.7 * max(length(dFdx(vBind)), length(dFdy(vBind))));   /* and never under the triangle's own footprint: a coarse mesh's smooth normal turns slower than its cloth where it goes edge-on */
    float k = floor(vCloth + 0.5), th, mixK, rgh; vec3 tint, mixTo;
    vec3 nb = normalize(vBindN);
    float H = cl_height(vBind, nb, k, th, tint, mixTo, mixK, rgh);
    if (k > 0.5) {
      #ifdef STANDARD
      /* the cloth's slope across the screen from the cloth itself a pixel over (the screen's own derivative of H steps every second pixel:
         blocky light on every steep rib, measured against the frame's supersample — the beanie's crown, the sock's top) */
      float th2, mk2, rg2; vec3 ti2, mt2;
      float Hx = cl_height(vBind + dFdx(vBind), nb, k, th2, ti2, mt2, mk2, rg2), Hy = cl_height(vBind + dFdy(vBind), nb, k, th2, ti2, mt2, mk2, rg2);
      /* and the relief going as the cloth turns edge-on (gone by 81°, whole within 66° of facing): there only the outline shows, and a slope
         read across so long a pixel crawled (the pant hem from above, the placket over her shoulder, the beanie's rim against the ground) */
      vec3 vdir = normalize(vViewPosition), ntri = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));   /* the triangle's own facing too: a coarse mesh's smooth normal faces you where the triangle is edge-on */
      float facing = min(abs(dot(normal, vdir)), abs(dot(ntri, vdir))), face = cl_ss(0.15, 0.4, facing);
      /* the beanie's ribs go sooner as its cuff rolls away from the eye (from 72°): a low sun on the turning cuff lit each rib in a long streak
         that flickered under the lens from above (round 14, the crown view) */
      if (k > 6.5 && k < 7.5) face *= cl_ss(0.3, 0.55, facing);
      normal = cl_perturb(-vViewPosition, normal, vec2(Hx - H, Hy - H) * uClothParts.x * face, faceDirection);
      if (rgh >= 0.0) roughnessFactor = mix(roughnessFactor, rgh, uCloth);
      #endif
      diffuseColor.rgb = mix(diffuseColor.rgb * mix(vec3(1.0), tint, uCloth * uClothParts.y), mixTo, mixK * uCloth * uClothParts.y);
      diffuseColor.rgb = mix(diffuseColor.rgb, cl_thread(k), th * uCloth * uClothParts.y);
    } }`;
