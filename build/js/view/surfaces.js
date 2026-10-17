/* EVERY SURFACE IS PAINTED ON THE GRAPHICS CARD WHEN THE GAME LOADS. A surface is one GLSL function —
 *     void surf(vec2 uv, out vec3 albedo, out float height, out float rough, out float metal, out float ao)
 * — baked into three tiling maps (colour; a normal derived from the SAME height, so the bumps belong to the colour; occlusion/roughness/
 * metal packed as R/G/B) by one draw each. (The idea of painting maps on the GPU is the one Ochrefall's MIT baker uses; this is new code.)
 * The park also gets one large "grime" map over its whole footprint: stains and the darkening at the foot of everything that stands up. */
import * as THREE from '../../vendor/three/build/three.module.min.js';
import { LOOK } from '../config.js';

const NOISE = /* glsl */ `
precision highp float;
uniform float texel;
float bl(float freq) { return clamp((0.42 / max(texel, 1e-6) - freq) / (0.18 / max(texel, 1e-6)), 0.0, 1.0); }
float h21(vec2 p) { p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
vec2 h22(vec2 p) { float n = h21(p); return vec2(n, h21(p + n + 17.17)); }
float vn(vec2 p, vec2 per) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  float a = h21(mod(i, per)), b = h21(mod(i + vec2(1, 0), per)), c = h21(mod(i + vec2(0, 1), per)), d = h21(mod(i + vec2(1, 1), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }
float fbm(vec2 p, vec2 per, int oct) { float s = 0.0, a = 0.5, t = 0.0; for (int i = 0; i < 7; i++) { if (i >= oct) break; s += a * vn(p, per); t += a; p *= 2.0; per *= 2.0; a *= 0.5; } return s / t; }
vec2 wor(vec2 p, vec2 per) { vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y), o = h22(mod(i + g, per)); float d = length(g + o - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return vec2(d1, d2); }
float ss(float a, float b, float x) { return smoothstep(a, b, x); }
vec3 srgb(vec3 c) { return pow(c, vec3(2.2)); }
`;

/* the surfaces (uv runs 0..1 over one tile; `tile` is that tile in metres, set on the material) */
export const SURF = {
  /* the plaza: broom-finished slab, a 3 m tile whose edge is the control joint; trowel swirls, stains, pits, hairline cracks, skid marks */
  slab: { tile: 3, glsl: `
    float macro = fbm(uv * 2.0, vec2(2.0), 4), mid = fbm(uv * 6.0 + 2.0, vec2(6.0), 4), trowel = fbm(uv * vec2(3.0, 9.0) + 5.0, vec2(3.0, 9.0), 3);
    float micro = fbm(uv * 64.0, vec2(64.0), 2) * bl(64.0);
    vec2 w = wor(uv * 3.0 + fbm(uv * 3.0, vec2(3.0), 3) * 0.35, vec2(3.0)); float crack = ss(0.03, 0.0, w.y - w.x) * ss(0.45, 0.62, fbm(uv + 3.1, vec2(1.0), 3));
    float stain = ss(0.6, 0.85, fbm(uv * 2.0 + 7.7, vec2(2.0), 4)), oil = ss(0.8, 0.92, fbm(uv * 4.0 + 13.0, vec2(4.0), 3)) * ss(0.45, 0.7, macro);
    float jx = min(uv.x, 1.0 - uv.x) * 3.0, jy = min(uv.y, 1.0 - uv.y) * 3.0, joint = ss(0.010, 0.004, min(jx, jy)), edge = ss(0.03, 0.012, min(jx, jy));
    albedo = mix(srgb(vec3(0.63, 0.635, 0.63)), srgb(vec3(0.70, 0.705, 0.70)), ss(0.35, 0.75, macro) * 0.7);
    albedo = mix(albedo, srgb(vec3(0.55, 0.555, 0.55)), ss(0.4, 0.8, mid) * 0.4); albedo *= 0.97 + 0.06 * trowel + 0.03 * (micro - 0.5);
    /* stains, oil and cracks that would repeat on every slab are faint here: the park's own marks are laid in the world (MARKS, the grime) */
    albedo = mix(albedo, srgb(vec3(0.5, 0.5, 0.49)), stain * 0.12); albedo = mix(albedo, srgb(vec3(0.36, 0.34, 0.32)), joint); albedo *= 1.0 - edge * 0.06;
    height = trowel * 0.12 + micro * 0.05 - joint * 1.2 - edge * 0.2; rough = 0.86 - stain * 0.03; metal = 0.0; ao = 1.0 - joint * 0.6;` },
  /* the terrace: granite pavers 0.6 m, laid in a running bond (a 2.4 m tile of 4 × 4) */
  pavers: { tile: 2.4, glsl: `
    vec2 g = uv * 4.0; float row = floor(g.y); g.x += mod(row, 2.0) * 0.5; vec2 id = floor(g), f = fract(g);
    float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * 0.6, joint = ss(0.008, 0.003, edge), bevel = ss(0.02, 0.006, edge);
    float tone = h21(mod(id, vec2(4.0)) + 3.3), speck = fbm(uv * 220.0, vec2(220.0), 2), grain = fbm(uv * 60.0, vec2(60.0), 3);
    vec2 w = wor(uv * 160.0, vec2(160.0)); float felds = ss(0.18, 0.08, w.x) * ss(0.4, 0.7, speck);
    vec3 a = mix(srgb(vec3(0.62, 0.60, 0.57)), srgb(vec3(0.70, 0.67, 0.62)), tone);
    albedo = mix(a, srgb(vec3(0.42, 0.41, 0.40)), ss(0.55, 0.9, speck) * 0.6 * bl(220.0)); albedo = mix(albedo, srgb(vec3(0.86, 0.83, 0.78)), felds * 0.6 * bl(160.0));
    albedo = mix(albedo, srgb(vec3(0.30, 0.29, 0.27)), joint); albedo *= 1.0 - ss(0.6, 0.85, fbm(uv * 3.0 + 4.0, vec2(3.0), 3)) * 0.12;
    height = grain * 0.2 * bl(60.0) + speck * 0.1 * bl(220.0) - bevel * 0.5 - joint * 1.0; rough = 0.78 - felds * 0.1 * bl(160.0) + joint * 0.15; metal = 0.0; ao = 1.0 - joint * 0.6;` },
  /* the transitions: hard-trowelled concrete, darker and smoother, with the tracks of wheels and the black of skids */
  ramp: { tile: 3, glsl: `
    float macro = fbm(uv * 1.5, vec2(1.5), 4), sw = fbm(uv * vec2(5.0, 3.0) + 3.0, vec2(5.0, 3.0), 4), micro = fbm(uv * 48.0, vec2(48.0), 2) * bl(48.0);
    float track = ss(0.55, 0.76, fbm(vec2(uv.x * 7.0, uv.y * 0.5), vec2(7.0, 0.5), 3));
    float skid = ss(0.83, 0.95, fbm(vec2(uv.x * 10.0, uv.y * 2.0) + 5.0, vec2(10.0, 2.0), 3)) * ss(0.45, 0.6, fbm(uv * 2.0 + 9.0, vec2(2.0), 2));
    albedo = mix(srgb(vec3(0.58, 0.585, 0.58)), srgb(vec3(0.66, 0.665, 0.66)), macro) * (0.96 + 0.08 * sw + 0.03 * (micro - 0.5));
    albedo = mix(albedo, srgb(vec3(0.43, 0.425, 0.415)), track * 0.45); albedo = mix(albedo, srgb(vec3(0.10, 0.10, 0.10)), skid * 0.55);
    height = sw * 0.08 + micro * 0.04; rough = 0.66 - track * 0.24 - skid * 0.1; metal = 0.0; ao = 1.0;` },
  /* a yard's asphalt (Kiln Yard's truck apron, the roads round it): grey stones in a binder the sun has greyed, cracks sealed with black
     bitumen, darker where the binder is newer. A 4 m tile — asphalt has no joints, and the park's own marks and grime break its repeat; every
     band finer than a texel holds is faded by bl(), so a phone's 512 bake loses the grit and keeps the stones */
  asphalt: { tile: 4, glsl: `
    float macro = fbm(uv * 2.0, vec2(2.0), 4), mid = fbm(uv * 7.0 + 3.0, vec2(7.0), 4);
    /* a band finer than the texel holds fades to its MEAN, never to nothing: the phone's 512 bake and the desktop's 1024 read the same grey */
    float stone = mix(0.32, ss(0.40, 0.16, wor(uv * 180.0, vec2(180.0)).x), bl(180.0)), tone = mix(0.5, vn(uv * 180.0 + 0.5, vec2(180.0)), bl(180.0));
    float grit = (fbm(uv * 300.0, vec2(300.0), 2) - 0.5) * bl(300.0);
    vec2 cw = wor(uv * 1.5 + fbm(uv * 4.0, vec2(4.0), 3) * 0.5, vec2(1.5));
    float seal = ss(0.05, 0.02, cw.y - cw.x) * ss(0.48, 0.66, fbm(uv + 6.0, vec2(1.0), 3)), fresh = ss(0.66, 0.84, fbm(uv * 1.5 + 11.0, vec2(1.5), 3));
    /* aged: the binder greyed by the sun (fresh asphalt is ~0.05 of the light, a yard's old one 0.10–0.18; the slab here is 0.35) */
    vec3 binder = mix(srgb(vec3(0.33, 0.33, 0.335)), srgb(vec3(0.43, 0.425, 0.42)), ss(0.25, 0.8, macro));
    binder = mix(binder, srgb(vec3(0.22, 0.22, 0.225)), fresh * 0.6);
    /* the stones weathered toward the binder's grey: at 5–8 m a 2 cm stone is a pixel or two, and their old contrast crawled there at twice
       the slab's aliasing (tests/drive/surface_alias.mjs, 10-17) */
    vec3 agg = mix(srgb(vec3(0.44, 0.435, 0.42)), srgb(vec3(0.54, 0.53, 0.50)), tone);
    albedo = mix(binder, agg, stone * (0.45 - fresh * 0.25)) * (0.95 + 0.1 * mid) * (1.0 + 0.06 * grit);
    albedo = mix(albedo, srgb(vec3(0.07, 0.07, 0.075)), seal * 0.9);
    height = stone * 0.22 + grit * 0.1 - seal * 0.15; rough = 0.93 - stone * 0.05 - seal * 0.35 - fresh * 0.1; metal = 0.0; ao = 1.0 - (1.0 - stone) * 0.05;` },

  /* walls and the sides of things: cast concrete with rain streaks from the top and a few formwork lines */
  wall: { tile: 3, glsl: `
    float macro = fbm(uv * 2.0, vec2(2.0), 4), mid = fbm(uv * 7.0 + 4.0, vec2(7.0), 3), micro = fbm(uv * 56.0, vec2(56.0), 2) * bl(56.0);
    float streak = ss(0.6, 0.85, fbm(vec2(uv.x * 18.0, uv.y * 1.2), vec2(18.0, 1.2), 4)) * (0.3 + 0.7 * fract(uv.y));
    vec2 pf = vec2(fract(uv.x * 1.25), fract(uv.y * 2.5)); float seam = max(ss(0.012, 0.004, min(pf.x, 1.0 - pf.x)), ss(0.012, 0.004, min(pf.y, 1.0 - pf.y)));
    vec2 tc = vec2(fract(uv.x * 2.5 + 0.25), fract(uv.y * 5.0 + 0.5)) - 0.5; float tie = ss(0.022, 0.014, length(tc * vec2(1.0, 0.5)));
    albedo = mix(srgb(vec3(0.60, 0.605, 0.60)), srgb(vec3(0.68, 0.685, 0.68)), macro) * (0.97 + 0.05 * mid + 0.03 * (micro - 0.5));
    albedo = mix(albedo, srgb(vec3(0.47, 0.46, 0.44)), streak * 0.3); albedo = mix(albedo, srgb(vec3(0.45, 0.44, 0.42)), seam * 0.6); albedo = mix(albedo, srgb(vec3(0.30, 0.29, 0.28)), tie * 0.7);
    height = mid * 0.1 + micro * 0.04 - seam * 0.4 - tie * 0.5; rough = 0.88; metal = 0.0; ao = 1.0 - seam * 0.3 - tie * 0.4;` },
  /* granite: grey with white feldspar and black mica, polished smoother on top */
  granite: { tile: 1.5, glsl: `
    float g2 = fbm(uv * 30.0, vec2(30.0), 3), g1 = fbm(uv * 120.0, vec2(120.0), 3) * bl(120.0); vec2 w = wor(uv * 150.0, vec2(150.0)), w2 = wor(uv * 90.0 + 7.0, vec2(90.0));
    float felds = ss(0.22, 0.1, w.x) * ss(0.5, 0.7, g1) * bl(150.0), mica = ss(0.14, 0.05, w2.x) * ss(0.5, 0.72, g2) * bl(90.0);
    vec3 a = mix(srgb(vec3(0.50, 0.53, 0.55)), srgb(vec3(0.58, 0.60, 0.61)), g2);
    albedo = mix(a, srgb(vec3(0.80, 0.79, 0.76)), felds * 0.45); albedo = mix(albedo, srgb(vec3(0.20, 0.21, 0.22)), mica * 0.55);
    height = g1 * 0.06 + felds * 0.03; rough = 0.38 + g2 * 0.1; metal = 0.0; ao = 1.0;` },
  /* steel: galvanised angle and tube, ground bright where trucks pass, rust where they do not */
  metal: { tile: 1.0, glsl: `
    float scr = fbm(vec2(uv.x * 4.0, uv.y * 120.0), vec2(4.0, 120.0), 3), spang = fbm(uv * 30.0, vec2(30.0), 4), rust = ss(0.74, 0.88, fbm(uv * 6.0 + 9.0, vec2(6.0), 4)) * 0.75;
    float ground = ss(0.45, 0.75, fbm(vec2(uv.x * 2.0, uv.y * 3.0), vec2(2.0, 3.0), 3));
    albedo = mix(srgb(vec3(0.58, 0.60, 0.62)), srgb(vec3(0.70, 0.71, 0.72)), spang); albedo = mix(albedo, srgb(vec3(0.86, 0.87, 0.88)), ground * 0.6); albedo = mix(albedo, srgb(vec3(0.36, 0.26, 0.19)), rust * (1.0 - ground));
    height = scr * 0.15 - rust * 0.1; rough = mix(0.45, 0.22, ground) + scr * 0.1 + rust * 0.4; metal = mix(1.0, 0.0, rust); ao = 1.0;` },
  /* coping: mustard paint on steel pipe, chipped along the top where everyone grinds it */
  coping: { tile: 1.0, glsl: `
    float chips = fbm(uv * vec2(18.0, 6.0), vec2(18.0, 6.0), 4), top = ss(0.25, 0.0, abs(uv.y - 0.5)) ;
    float bare = ss(0.52, 0.6, chips + top * 0.35), scr = fbm(vec2(uv.x * 3.0, uv.y * 90.0), vec2(3.0, 90.0), 3);
    vec3 paint = mix(srgb(vec3(0.86, 0.60, 0.16)), srgb(vec3(0.74, 0.48, 0.10)), fbm(uv * 8.0, vec2(8.0), 3));
    bare = max(bare, ss(0.42, 0.18, abs(uv.y - 0.5)));
    albedo = mix(paint, mix(srgb(vec3(0.66, 0.67, 0.68)), srgb(vec3(0.90, 0.91, 0.91)), top), bare);
    height = (1.0 - bare) * 0.2 + scr * 0.05; rough = mix(0.5, 0.25, bare) + scr * 0.1; metal = bare; ao = 1.0;` },
  /* grass at the edges: blades in tufts, dry tips, clover-dark patches */
  grass: { tile: 2.0, glsl: `
    float b = fbm(uv * vec2(90.0, 30.0), vec2(90.0, 30.0), 3) * bl(90.0), t = fbm(uv * 8.0, vec2(8.0), 4), clump = ss(0.4, 0.8, fbm(uv * 3.0 + 1.0, vec2(3.0), 4));
    vec3 g = mix(srgb(vec3(0.32, 0.42, 0.19)), srgb(vec3(0.44, 0.53, 0.24)), b * 0.6 + t * 0.4); g = mix(g, srgb(vec3(0.27, 0.36, 0.17)), clump * 0.4);
    albedo = g; height = b * 0.5 + t * 0.3; rough = 0.94; metal = 0.0; ao = 0.8 + 0.2 * b;` },
  /* the bench's slats */
  wood: { tile: 1.0, glsl: `
    float r = fbm(vec2(uv.x * 3.0, uv.y * 60.0), vec2(3.0, 60.0), 4), slat = ss(0.02, 0.0, abs(fract(uv.y * 5.0) - 0.5) - 0.47);
    albedo = mix(srgb(vec3(0.50, 0.33, 0.20)), srgb(vec3(0.66, 0.47, 0.30)), r); albedo = mix(albedo, srgb(vec3(0.18, 0.12, 0.08)), slat);
    height = r * 0.2 - slat; rough = 0.7; metal = 0.0; ao = 1.0 - slat * 0.5;` },
  /* the chain-link fence: wire diamonds (alpha) */
  fence: { tile: 0.6, glsl: `
    vec2 p = uv * 10.0; vec2 a = vec2(p.x + p.y, p.x - p.y) * 0.7071; vec2 f = abs(fract(a) - 0.5);
    float wire = ss(0.06, 0.02, min(f.x, f.y));
    albedo = mix(srgb(vec3(0.55, 0.57, 0.58)), srgb(vec3(0.72, 0.73, 0.74)), fbm(uv * 30.0, vec2(30.0), 2)); height = wire; rough = 0.4; metal = 1.0; ao = wire;` },
};

/* THE DETAIL OF THE POUR: one small tile (0.4 m on a side) laid over every concrete by its metres, so the floor a metre or five from the
   lens has grain: aggregate showing through, the broom's streaks, pits, the black scuffs of wheels and tails. Centred on 1.0 (a multiplier). */
export const DETAIL = { tile: 0.4, glsl: `
    vec2 w = wor(uv * 22.0, vec2(22.0)), w2 = wor(uv * 9.0 + 3.7, vec2(9.0));
    float agg = ss(0.16, 0.05, w.x) * ss(0.35, 0.7, fbm(uv * 30.0, vec2(30.0), 2));
    float big = ss(0.12, 0.03, w2.x) * ss(0.5, 0.8, fbm(uv * 6.0 + 1.3, vec2(6.0), 2));
    float broom = sin(uv.y * 6.2832 * 40.0 + fbm(uv * vec2(4.0, 30.0), vec2(4.0, 30.0), 3) * 7.0) * 0.5 + 0.5;
    float pit = ss(0.07, 0.02, wor(uv * 34.0 + 9.1, vec2(34.0)).x) * ss(0.55, 0.8, fbm(uv * 12.0 + 5.0, vec2(12.0), 2));
    float scuff = ss(0.86, 0.97, fbm(vec2(uv.x * 3.0, uv.y * 0.6) + 2.0, vec2(3.0, 0.6), 3)) * ss(0.4, 0.7, fbm(uv * 2.0 + 7.0, vec2(2.0), 2));
    float m = 1.0 + (fbm(uv * 14.0, vec2(14.0), 3) - 0.5) * 0.22 + agg * 0.3 - big * 0.2 + (broom - 0.5) * 0.09 - pit * 0.5 - scuff * 0.3;
    albedo = vec3(clamp(m * 0.5, 0.0, 1.0)); height = agg * 0.3 + big * 0.2 + broom * 0.12 - pit * 0.6; rough = 1.0 - scuff * 0.35; metal = 0.0; ao = 1.0 - pit * 0.5;` };

/* one bake: a full-screen triangle into a render target; the normal pass samples the same function around each texel */
export function makeBaker(renderer) {
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const quad = new THREE.Mesh(geo); scene.add(quad);
  const vs = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  /* the full-screen triangle is let go when the bakes are done (bake.dispose()): a park built after the first bakes its own surfaces again
     (10-17: every Kiln Yard paints its asphalt, and each left one geometry on the card) */
  const bake = function (surf, size, alphaFromAo = false) {
    const fs = (mode) => NOISE + 'varying vec2 vUv;\nvoid surf(vec2 uv, out vec3 albedo, out float height, out float rough, out float metal, out float ao) {' + surf.glsl + '}\n'
      + 'void main(){ vec3 al; float h, r, m, ao; surf(vUv, al, h, r, m, ao);\n'
      + (mode === 0 ? (alphaFromAo ? 'gl_FragColor = vec4(al, ao);' : 'gl_FragColor = vec4(al, 1.0);')
        : mode === 1 ? 'vec3 a2; float hx, hy, r2, m2, o2; surf(fract(vUv + vec2(texel, 0.0)), a2, hx, r2, m2, o2); surf(fract(vUv + vec2(0.0, texel)), a2, hy, r2, m2, o2);\n'
          + ' float k = 1.6 / (texel * 512.0); vec3 n = normalize(vec3((h - hx) * k, (h - hy) * k, 1.0)); gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);'
          : 'gl_FragColor = vec4(clamp(ao, 0.0, 1.0), clamp(r, 0.04, 1.0), clamp(m, 0.0, 1.0), 1.0);') + ' }';
    const out = [];
    for (let mode = 0; mode < 3; mode++) {
      const rt = new THREE.WebGLRenderTarget(size, size, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, depthBuffer: false });
      rt.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      quad.material = new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs(mode), uniforms: { texel: { value: 1 / size } } });
      renderer.setRenderTarget(rt); renderer.render(scene, cam); quad.material.dispose();
      out.push(rt);
    }
    renderer.setRenderTarget(null);
    return { map: out[0].texture, normalMap: out[1].texture, orm: out[2].texture, targets: out, bytes: size * size * 4 * 3 * 4 / 3 };
  };
  bake.dispose = () => geo.dispose();
  return bake;
}

/* THE GRIME OVER THE WHOLE PARK: big stains, wear where lines run, and the dark at the foot of every ledge, wall and ramp (a soft
 * occlusion from the rectangles each element stands on). One draw; sampled by world position by every park material. */
export function bakeGrime(renderer, world, size) {
  const rects = []; const add = (r, h) => rects.push(new THREE.Vector4(r[0], r[1], r[2], r[3]));
  for (const e of world.data.elements) { if (e.rect) add(e.rect); else if (e.type === 'box') add(e.base); }
  /* the raised levels: a park's own `grime.levels` (the Plaza's, as tuned), or its ground rows above its lowest WITH their heights — the
     dark then falls only on lower ground beside a higher level: at the foot of its wall, never on its top edge, and never along the seam
     where two rows of one level meet (10-17: Kiln Yard's yard read a dark line down x 40, where its two rows meet) */
  const P = world.data, low = Math.min(...P.ground.map((q) => q.y)), raised = P.ground.filter((g) => g.y > low);
  const G = P.grime || { levels: raised.map((g) => g.rect), heights: raised.map((g) => g.y), origin: [-2, -2], extent: [P.size[0] + 4, P.size[1] + 4] };
  const heights = rects.map(() => 1e4);   // what stands up (an element's footprint) darkens round it on every side
  G.levels.forEach((r, i) => { rects.push(new THREE.Vector4(r[0], r[1], r[2], r[3])); heights.push(G.heights ? G.heights[i] : 1e4); });
  const N = rects.length;
  /* every grindable edge (ledges, curbs, rails, the straight copings): its wax, and the lanes skaters ride to it */
  const segs = [];
  for (const r of world.rails) { if (r.loop || r.kind === 'coping' && !r.inward) continue; for (let i = 0; i + 1 < r.pts.length && segs.length < 40; i++) segs.push(new THREE.Vector4(r.pts[i][0], r.pts[i][2], r.pts[i + 1][0], r.pts[i + 1][2])); }
  while (segs.length < 40) segs.push(new THREE.Vector4(-999, -999, -999, -999));
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { rects: { value: rects }, heights: { value: heights }, low: { value: low }, segs: { value: segs }, origin: { value: new THREE.Vector2(G.origin[0], G.origin[1]) }, extent: { value: new THREE.Vector2(G.extent[0], G.extent[1]) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: NOISE + `uniform vec4 rects[${N}]; uniform float heights[${N}], low; uniform vec4 segs[40]; uniform vec2 origin, extent; varying vec2 vUv;
      float sdBox(vec2 p, vec4 r) { vec2 c = (r.xy + r.zw) * 0.5, h = (r.zw - r.xy) * 0.5; vec2 d = abs(p - c) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
      /* distance to a segment, and to the same segment run on 6 m past both ends (the lanes start before the ledge and end after it) */
      vec2 sdSeg(vec2 p, vec4 s) { vec2 a = s.xy, b = s.zw, ab = b - a; float L = max(length(ab), 1e-4); vec2 t = ab / L; float u = dot(p - a, t);
        float d0 = length(p - (a + t * clamp(u, 0.0, L))), d1 = length(p - (a + t * clamp(u, -6.0, L + 6.0))); return vec2(d0, d1); }
      void main() { vec2 w = origin + vUv * extent; float occ = 0.0, wax = 0.0, lane = 0.0;
        float hw = low; for (int i = 0; i < ${N}; i++) if (heights[i] < 1e3 && sdBox(w, rects[i]) < 0.0) hw = max(hw, heights[i]);   // the ground's own level here
        for (int i = 0; i < ${N}; i++) { float d = sdBox(w, rects[i]); occ = max(occ, smoothstep(0.55, 0.0, d) * step(0.0, d) * step(hw + 0.05, heights[i])); }
        for (int i = 0; i < 40; i++) { if (segs[i].x < -900.0) continue; vec2 d = sdSeg(w, segs[i]); wax = max(wax, smoothstep(0.16, 0.02, d.x)); lane = max(lane, smoothstep(1.6, 0.7, d.y) * smoothstep(0.25, 0.55, d.y)); }
        float n1 = fbm(w * 0.8, vec2(1e4), 3), n2 = fbm(w * vec2(0.15, 0.15) + 5.0, vec2(1e4), 3);
        wax *= 0.55 + 0.45 * n1; lane *= 0.6 + 0.4 * smoothstep(0.2, 0.6, n2);
        float sf = fbm(w * 0.09, vec2(1e4), 5), stain = smoothstep(0.56, 0.64, sf), tide = smoothstep(0.55, 0.57, sf) - smoothstep(0.57, 0.6, sf), wash = fbm(w * 0.03 + 3.0, vec2(1e4), 4);
        vec3 c = vec3(1.0) * (0.92 + 0.12 * wash) * (1.0 - occ * 0.42) * (1.0 - stain * 0.24 - tide * 0.18) * (1.0 - wax * 0.32) * (1.0 - lane * 0.3);
        c *= mix(vec3(1.0), vec3(1.02, 0.99, 0.95), stain);
        gl_FragColor = vec4(c, clamp(wax * 0.9 + lane * 0.45, 0.0, 1.0)); }`,
  });
  scene.add(new THREE.Mesh(geo, mat));
  const rt = new THREE.WebGLRenderTarget(size, size, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null); mat.dispose(); geo.dispose();   // the full-screen triangle too: a park's switch makes it again
  return { texture: rt.texture, target: rt, origin: new THREE.Vector2(G.origin[0], G.origin[1]), extent: new THREE.Vector2(G.extent[0], G.extent[1]), bytes: size * size * 4 * 4 / 3 };
}

/* the grass by place: drier and lusher patches tens of metres across, and the worn paths people walk round the fence and in from the street */
const FIELD = `
 { vec2 wp = vWorldPos.xz; float n = 0.0, a = 0.5; vec2 q = wp * 0.045;
   for (int i = 0; i < 4; i++) { n += a * (sin(q.x * 1.7 + sin(q.y * 1.3)) * 0.5 + 0.5) * (sin(q.y * 1.9 + sin(q.x * 0.9)) * 0.5 + 0.5); q *= 2.07; a *= 0.5; }
   diffuseColor.rgb *= mix(vec3(0.86, 0.92, 0.82), vec3(1.16, 1.07, 0.72), smoothstep(0.18, 0.42, n));
   diffuseColor.rgb *= 0.93 + 0.12 * smoothstep(-0.25, 0.25, sin(wp.x * 2.0 + sin(wp.y * 0.05) * 1.5));
   /* patches a metre or two across: darker clover, drier yellow, the lawn between (the field is never one flat green) */
   { vec2 g = wp / 1.6, ip = floor(g), fp = fract(g); fp = fp * fp * (3.0 - 2.0 * fp);
     float pv = mix(mix(wlHash(ip), wlHash(ip + vec2(1.0, 0.0)), fp.x), mix(wlHash(ip + vec2(0.0, 1.0)), wlHash(ip + vec2(1.0, 1.0)), fp.x), fp.y);
     diffuseColor.rgb *= mix(vec3(0.84, 0.93, 0.86), vec3(1.1, 1.05, 0.8), smoothstep(0.3, 0.7, pv)); }
   float dz = min(abs(wp.y - 46.6), abs(wp.y + 2.4)), dx = min(abs(wp.x + 2.4), abs(wp.x - 64.6)), path = smoothstep(0.9, 0.35, min(dz, dx));
   float gate = smoothstep(1.0, 0.4, abs(wp.x - 30.0)) * step(wp.y, -0.3) * step(-8.0, wp.y);
   float worn = max(path, gate) * (0.55 + 0.45 * wlHash(floor(wp * 3.0)));
   diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.24, 0.17), worn * 0.75); }
`;
/* a material that reads a baked surface in metres of tile, and the grime by world position */
/* THE MARKS A PARK COLLECTS, in the world and not in a tile (a tile repeats every slab): gum flattened into the concrete, the black pairs a
   powerslide leaves, a crack across some slabs with its spalled edge, an oil or soda blot — each drawn at its own size in metres, its edges
   as sharp as a pixel allows (fwidth), only on what faces up, and gone beyond the distance where they would only shimmer. W1: they must
   read 2–6 m from the lens (tests/drive/floor.mjs). */
/* a hash with no sin() in it (sin of a large number loses its precision on a GPU and goes near constant over whole parts of the park, so the
   marks and the grass's worn paths came out bare in places): every park material and the sky use this one */
export const WLHASH = 'float wlHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }';
export const MARKS = `
float wlN(float x) { float i = floor(x), f = fract(x); return mix(wlHash(vec2(i, 7.0)), wlHash(vec2(i + 1.0, 7.0)), f * f * (3.0 - 2.0 * f)); }
float wlLine(float d, float w, float a) { return 1.0 - smoothstep(w - a, w + a, d); }
vec2 wlMarks(vec3 P, float lane) {
  vec2 p = P.xz; float px = max(1e-4, (fwidth(p.x) + fwidth(p.y)) * 0.5), dark = 0.0, gloss = 0.0;
  /* gum: flattened, 0.8–2 cm across its middle, its edge uneven, grey more than black; one 0.25 m cell in five */
  { vec2 id = floor(p / 0.25), f = fract(p / 0.25); if (wlHash(id) > 0.8) { vec2 c = vec2(wlHash(id + 1.7), wlHash(id + 9.2)) * 0.6 + 0.2, q = (f - c) * 0.25; float an = atan(q.y, q.x);
      float r = (0.004 + 0.006 * wlHash(id + 4.4)) * (0.8 + 0.4 * wlN(an * 1.9 + id.x * 3.0)), d = length(q);
      dark = max(dark, wlLine(d, r, px) * (0.16 + 0.2 * wlHash(id + 2.2))); } }
  /* skids: two black streaks a truck's width apart, 0.3–0.9 m long, one 1.6 m cell in three — and most cells where skaters ride (the grime's
     lanes and wax: lane) */
  { vec2 id = floor(p / 1.6); if (wlHash(id + 31.0) > 0.67 - 0.45 * lane) { vec2 c = (id + 0.3 + 0.4 * vec2(wlHash(id + 5.0), wlHash(id + 6.0))) * 1.6; float th = wlHash(id + 7.0) * 6.2832, L = 0.15 + 0.3 * wlHash(id + 8.0);
      vec2 u = vec2(cos(th), sin(th)), q = p - c; float s = dot(q, u), t = dot(q, vec2(-u.y, u.x)) + (wlN(s * 3.0 + id.x) - 0.5) * 0.03;
      float along = 1.0 - smoothstep(L * 0.5, L, abs(s)), streak = max(wlLine(abs(t - 0.1), 0.011, px), wlLine(abs(t + 0.1), 0.011, px)) * (0.75 + 0.25 * wlN(s * 25.0));
      dark = max(dark, streak * along * 0.5); gloss = max(gloss, streak * along * 0.4); } }
  /* a crack across one slab in two, side to side, wandering, with a spalled edge */
  { vec2 id = floor(p / 3.0), f = fract(p / 3.0); float h = wlHash(id + 51.0); if (h > 0.5) {
      vec2 a0 = vec2(0.15 + 0.7 * wlHash(id + 1.0), 0.0), b0 = vec2(0.15 + 0.7 * wlHash(id + 2.0), 1.0); if (h > 0.75) { a0 = a0.yx; b0 = b0.yx; }
      vec2 ab = b0 - a0; float tt = clamp(dot(f - a0, ab) / dot(ab, ab), 0.0, 1.0); vec2 nrm = normalize(vec2(-ab.y, ab.x));
      float off = (wlN(tt * 7.0 + h * 40.0) - 0.5) * 0.09 + (wlN(tt * 33.0 + h * 9.0) - 0.5) * 0.018, d = abs(dot(f - a0 - ab * tt, nrm) - off) * 3.0;
      float w = 0.002 + 0.0035 * wlN(tt * 19.0 + h);
      dark = max(dark, wlLine(d, w, px) * 0.6 + (1.0 - smoothstep(0.0, 0.035, d)) * 0.12); } }
  /* a dried water or dirt stain 0.8–2 m across, one 3 m cell in two: a little darker inside, darker still at its tide line */
  { vec2 id = floor(p / 3.0); if (wlHash(id + 91.0) > 0.5) { vec2 c = (id + 0.3 + 0.4 * vec2(wlHash(id + 13.0), wlHash(id + 14.0))) * 3.0, q = p - c; float ang = atan(q.y, q.x);
      float r = (0.4 + 0.6 * wlHash(id + 15.0)) * (0.75 + 0.3 * wlN(ang * 2.2 + id.x) + 0.15 * wlN(ang * 6.0 + id.y)), d = length(q), inside = 1.0 - smoothstep(r - 0.06, r + px, d);
      dark = max(dark, inside * (0.07 + 0.06 * wlHash(id + 16.0)) + wlLine(abs(d - r + 0.03), 0.02, px) * 0.08); } }
  /* an oil or soda blot: a dark, slightly glossy pool 0.2–0.6 m across, one 4 m cell in five */
  { vec2 id = floor(p / 4.0); if (wlHash(id + 71.0) > 0.8) { vec2 c = (id + 0.25 + 0.5 * vec2(wlHash(id + 3.0), wlHash(id + 4.0))) * 4.0, q = p - c; float ang = atan(q.y, q.x);
      float r = (0.1 + 0.2 * wlHash(id + 5.0)) * (0.8 + 0.35 * wlN(ang * 1.6 + id.x) + 0.15 * wlN(ang * 5.0 + id.y)), d = length(q);
      float blot = 1.0 - smoothstep(r * 0.7, r + px, d); dark = max(dark, blot * 0.42); gloss = max(gloss, blot * 0.55); } }
  return vec2(dark, gloss);
}`;
export function parkMaterial(baked, tile, grime, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ map: baked.map, normalMap: baked.normalMap, aoMap: baked.orm, roughnessMap: baked.orm, metalnessMap: baked.orm, roughness: 1, metalness: 1, color: opts.color || 0xffffff, normalScale: new THREE.Vector2(opts.normal || 0.8, opts.normal || 0.8), aoMapIntensity: opts.ao == null ? 1 : opts.ao, envMapIntensity: opts.env == null ? 0.6 : opts.env, alphaTest: opts.alphaTest || 0, side: opts.side || THREE.FrontSide, transparent: false });
  if (opts.alphaTest) { m.alphaMap = null; m.map = baked.map; }
  m.userData.tile = tile; m.userData.uMarks = { value: 1 };   // the marks' strength (1; the floor drive draws a view with them at 0 to see what they show)
  m.customProgramCacheKey = () => 'park:' + (grime ? 'grime' : 'clean') + ':' + (opts.alphaTest ? 'cut' : 'solid') + ':' + (opts.field ? 'field' : '') + ':' + (opts.detail ? 'detail' : '') + ':' + (opts.marks ? 'marks' : '');
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTile = { value: 1 / tile }; sh.uniforms.detailMap = { value: opts.detail ? opts.detail.map : null }; sh.uniforms.uDetail = { value: opts.detailAmt == null ? 1 : opts.detailAmt };
    sh.uniforms.uMarks = m.userData.uMarks;
    sh.uniforms.grimeMap = { value: grime ? grime.texture : null }; sh.uniforms.grimeOrigin = { value: grime ? grime.origin : new THREE.Vector2() }; sh.uniforms.grimeExtent = { value: grime ? grime.extent : new THREE.Vector2(1, 1) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTile; varying vec3 vWorldPos; varying vec2 vDetUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = uv * uTile;\n#endif\n#ifdef USE_NORMALMAP\n vNormalMapUv = uv * uTile;\n#endif\n#ifdef USE_AOMAP\n vAoMapUv = uv * uTile;\n#endif\n#ifdef USE_ROUGHNESSMAP\n vRoughnessMapUv = uv * uTile;\n#endif\n#ifdef USE_METALNESSMAP\n vMetalnessMapUv = uv * uTile;\n#endif')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vDetUv = uv / 0.4;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos; varying vec2 vDetUv; uniform sampler2D grimeMap, detailMap; uniform vec2 grimeOrigin, grimeExtent; uniform float uDetail, uMarks;\n' + WLHASH + (opts.marks ? MARKS : ''))
      .replace('#include <map_fragment>', '#include <map_fragment>\n float wlPolish = 0.0;\n' + (opts.detail ? ' { float dd = length(vWorldPos - cameraPosition), fade = 1.0 - smoothstep(6.0, 16.0, dd); diffuseColor.rgb *= mix(1.0, texture2D(detailMap, vDetUv).r * 2.0, uDetail * fade); }\n' : '') + (grime ? ' { vec2 gu = (vWorldPos.xz - grimeOrigin) / grimeExtent; if (gu.x > 0.0 && gu.x < 1.0 && gu.y > 0.0 && gu.y < 1.0) { vec4 gm = texture2D(grimeMap, gu); diffuseColor.rgb *= gm.rgb; wlPolish = gm.a; } }' : '')
        + (opts.marks ? '\n { vec3 fn = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos))); float up = smoothstep(0.82, 0.95, abs(fn.y)), near = 1.0 - smoothstep(7.0, 20.0, length(vWorldPos - cameraPosition)); vec2 mk = wlMarks(vWorldPos, wlPolish) * up * near * uMarks; diffuseColor.rgb *= 1.0 - mk.x; wlPolish = max(wlPolish, mk.y); }' : '')
        + (opts.field ? FIELD : '')
        + (opts.alphaTest ? '\n diffuseColor.a = texture2D(map, vMapUv).a;' : ''))
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor *= 1.0 - 0.5 * wlPolish;');
  };
  return m;
}
/* PAINT ON THE GROUND (a park's `paint` rows, view/parkview.js): flat quads at the ground's own height, drawn over it by a polygon offset —
   never lifted, or the wheels would sink into it — one material a colour, so one draw. Its edges are as sharp as a pixel allows and no
   sharper: the quad is wider and longer than the line, and each edge is a ramp one pixel wide over the distance's own fwidth, so it neither
   steps nor crawls where there is no MSAA (a phone). It dirties with the park's grime, takes the park's marks over it, and wears thin in
   patches where the surface shows through. Drawn only: it rolls and sounds as the surface under it (CLEANROOM).
   The quad's `line` attribute: [across, along] from the line's middle (m), and its half-width and half-length. */
export function paintMaterial(color, grime) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.userData.uMarks = { value: 1 };
  m.customProgramCacheKey = () => 'paint:' + (grime ? 'grime' : 'clean');
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uMarks = m.userData.uMarks;
    sh.uniforms.grimeMap = { value: grime ? grime.texture : null }; sh.uniforms.grimeOrigin = { value: grime ? grime.origin : new THREE.Vector2() }; sh.uniforms.grimeExtent = { value: grime ? grime.extent : new THREE.Vector2(1, 1) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 line; varying vec4 vLine; varying vec3 vWorldPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vLine = line;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vLine; varying vec3 vWorldPos; uniform sampler2D grimeMap; uniform vec2 grimeOrigin, grimeExtent; uniform float uMarks;\n' + WLHASH + MARKS)
      .replace('#include <map_fragment>', '#include <map_fragment>\n float wlPolish = 0.0;\n'
        + (grime ? ' { vec2 gu = (vWorldPos.xz - grimeOrigin) / grimeExtent; if (gu.x > 0.0 && gu.x < 1.0 && gu.y > 0.0 && gu.y < 1.0) { vec4 gm = texture2D(grimeMap, gu); diffuseColor.rgb *= gm.rgb; wlPolish = gm.a; } }\n' : '')
        + ' { vec2 mk = wlMarks(vWorldPos, wlPolish) * uMarks * (1.0 - smoothstep(7.0, 20.0, length(vWorldPos - cameraPosition))); diffuseColor.rgb *= 1.0 - mk.x; wlPolish = max(wlPolish, mk.y); }\n'
        /* how much of this pixel the stroke covers: a box filter's share, across and along, at four quarter-pixels (each offset by the
           screen's own derivatives, each a box over half the pixel's range) — a line wider than the pixel gets the edge's one-pixel ramp; one
           narrower (far, grazing) lights the pixel by its own width and hands that share smoothly to the next as it moves, never more; the four
           follow a line at a slant and one bent by the perspective inside the pixel (10-17: one ramp of d/fwidth lit a far 10 cm line at 0.75
           of a pixel and hopped it; one box a pixel strayed ~2 levels from the 3× supersample on edge-on bays: tests/drive/surface_alias.mjs) */
        + ' vec2 gX = dFdx(vLine.xy) * 0.25, gY = dFdy(vLine.xy) * 0.25; float fA = max(fwidth(vLine.x), 1e-4) * 0.5, fL = max(fwidth(vLine.y), 1e-4) * 0.5, eAL = 0.0;\n'
        + ' for (int k = 0; k < 4; k++) { vec2 q = vLine.xy + (k == 0 || k == 2 ? -1.0 : 1.0) * gX + (k < 2 ? -1.0 : 1.0) * gY;\n'
        + '   eAL += (clamp(q.x + vLine.z, -0.5 * fA, 0.5 * fA) - clamp(q.x - vLine.z, -0.5 * fA, 0.5 * fA)) / fA * (clamp(q.y + vLine.w, -0.5 * fL, 0.5 * fL) - clamp(q.y - vLine.w, -0.5 * fL, 0.5 * fL)) / fL; }\n'
        + ' eAL *= 0.25;\n'

        + ' {'
        + '   vec2 p = vWorldPos.xz * 2.2, i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);\n'
        + '   float n = mix(mix(wlHash(i), wlHash(i + vec2(1.0, 0.0)), f.x), mix(wlHash(i + vec2(0.0, 1.0)), wlHash(i + vec2(1.0, 1.0)), f.x), f.y);\n'
        + '   diffuseColor.a *= eAL * (0.94 - smoothstep(0.62, 0.86, n + wlPolish * 0.35) * 0.7); }')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor *= 1.0 - 0.5 * wlPolish;');
  };
  return m;
}

export const PALETTE = LOOK.palette;
