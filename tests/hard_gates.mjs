/* NO HARD GATE DRAWS A LINE (the supervisor's class sweep, 10-16: a step(), an if or a ternary in the cloth's height that switches a term on
 * or off where the term is not yet nothing draws a hard line a pixel wide — the hem fold's step(0.997), the back folds' step(p.z, -0.02), the
 * outseams cut at 0.93, the cargo pocket switched by its normal; each proven by softening it alone). Every gate in cl_height is read off
 * cloth.js and must be one of these, each with why it draws no line; a gate not here is RED until it is faded or classified. */
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../build/js/view/cloth.js', import.meta.url), 'utf8');
const i = src.indexOf('float cl_height('); let k = src.indexOf('{', i), depth = 0;
for (; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}' && --depth === 0) break; }
/* comments are not code: blanked (their line breaks kept) before a gate is looked for — a note that NAMES a step() is no gate */
const body = src.slice(i, k + 1).replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, (c) => ' '.repeat(c.length)), line0 = src.slice(0, i).split('\n').length;
/* [a piece of the gate's line, its class, why it draws no line] */
const KNOWN = [
  ['if (kind < 0.5) return', 'dispatch', 'the kind is a whole number a piece carries: no surface has two'],
  ['if (kind < 1.5) {', 'dispatch', 'the jacket'], ['} else if (kind < 2.5) {', 'dispatch', 'the sleeves'], ['} else if (kind < 3.5) {', 'dispatch', 'the tee'],
  ['} else if (kind < 4.5) {', 'dispatch', 'the cargos'], ['} else if (kind < 5.5) {', 'dispatch', 'the shoes'], ['} else if (kind < 6.5) {', 'dispatch', 'the soles'],
  ['} else if (kind > 8.5) {', 'dispatch', 'the face'], ['} else if (kind > 7.5) {', 'dispatch', 'the laces'],
  ['if (cm > 0.01) rough =', 'zero-at-edge', 'the collar\'s roughness is mix(0.86, 0.97, cm): 0.861 at the gate, the cloth\'s own 0.86 beside it'],
  ['if (p.y > 1.39) {', 'zero-at-edge', 'the collar\'s ribs are times its mask cl_in(1.402 - y): nothing 12 mm below it at any pixel'],
  ['if (p.y < 1.42) {', 'zero-at-edge', 'every term inside is faded to nothing by 1.42 (the folds\' envelopes, the seams\' weights)'],
  ['if (ax > 0.08 && p.y < 1.32)', 'faded', 'the side seam: weighted cl_ss(0.08, 0.11, ax) * cl_ss(1.32, 1.30, y)'],
  ['if (p.y > 1.365 && ax > 0.04 && n.y > 0.3)', 'faded', 'the shoulder seam: weighted to nothing at each of its gates'],
  ['if (p.z < -0.02) h += cl_seamW(p.y - 1.335', 'faded', 'the yoke seam: weighted cl_ss(-0.02, -0.035, z)'],
  ['if (p.z > 0.02) h += cl_seamW(ax - edge', 'faded', 'the placket: weighted cl_ss(0.02, 0.035, z) and cl_ss(1.42, 1.41, y)'],
  ['if (p.y < 1.0) h += cl_seamW(p.y - 0.982', 'faded', 'the hem\'s lower row: weighted cl_ss(1.0, 0.99, y)'],
  ['if (p.z > 0.03 && p.x > 0.03) {', 'zero-at-edge', 'the chest pocket and its stitching lie inside x 0.04–0.13: nothing at x 0.03'],
  ['if (box < 0.012) h += cl_seamW(box + 0.003', 'faded', 'the pocket\'s stitching: weighted cl_ss(0.012, 0.006, box)'],
  ['if (box < 0.002) h += cl_seamW(q.y - 0.044', 'faded', 'the pocket\'s top hem: weighted cl_ss(0.002, -0.002, box)'],
  ['vec3 c = p.x > 0.0 ? cl_limb(p, ARM_L0', 'join', 'left arm or right: they never meet'],
  ['(t < 0.0 ? t + 6.2832 : t) * r, s), 0.0014)', 'join', 'the sleeve\'s weave joins itself at the underarm seam, where the cloth does'],
  ['float ur = (t < 0.0 ? t + 6.2832 : t) * r;', 'join', 'round the sleeve from the underarm seam, where the cloth joins'],
  ['float sd = p.x > 0.0 ? 1.0 : -1.0;', 'join', 'left leg or right: they join at the rise, a seam'],
  ['vec3 c = sd > 0.0 ? cl_limb(p, LEG_L0', 'join', 'left leg or right: they join at the rise, a seam'],
  ['if (p.y < 1.0) h += cl_seamW(t * r, s, 0.005', 'faded', 'the outseam to the waist: weighted cl_ss(1.0, 0.98, y)'],
  ['if (p.y < 0.83) h += cl_seamW((3.14159 - abs(t)) * r', 'faded', 'the inseam to the crotch: weighted cl_ss(0.83, 0.79, y)'],
  ['if (p.y > 0.77 && abs(p.x) < 0.03) h += cl_seamW(p.x', 'faded', 'the rise: weighted to nothing at both of its gates'],
  ['if (abs(pq.y) < 0.085 && abs(pq.x) < 0.08 && abs(pq.z) < 0.06) {', 'zero-at-edge', 'the cargo pocket with its stitching lies inside 0.07 × 0.057 × 0.04: nothing at the region\'s walls'],
  ['if (box < 0.012) { float wb = cl_ss(0.012, 0.004, box);', 'faded', 'the pocket\'s seams and flap: weighted wb'],
  ['vec2 S = p.x > 0.0 ? SHOE_L : SHOE_R; float X = p.x - S.x, Z = p.z - S.y, Y = p.y, ex = abs(X);', 'join', 'left shoe or right: they never meet'],
  ['if (dCap < 0.006) {', 'zero-at-edge', 'the toe cap\'s step is cl_in(dCap) and its seams 7.8 mm off: nothing at 6 mm'],
  ['if (gate > 0.0) {', 'faded', 'the eyestays are times the soft gate itself'],
  ['if (dHeel > -0.004)', 'zero-at-edge', 'the heel counter\'s seam 6 mm off at the gate: e^-11'],
  ['if (ex < 0.012 && Y > 0.066 && Y < 0.102 && Z < -0.105) {', 'zero-at-edge', 'the drop on the heel tab lies inside its region'],
  ['if (suede > 0.0)', 'faded', 'the suede\'s nap is times the suede mask itself'],
  ['vec2 S = p.x > 0.0 ? SHOE_L : SHOE_R; float X = p.x - S.x, Z = p.z - S.y, Y = p.y;', 'join', 'left sole or right'],
  ['vec2 S = p.x > 0.0 ? SHOE_L : SHOE_R; float ex = abs(p.x - S.x)', 'join', 'left laces or right'],
  ['if (brow > 0.0) {', 'faded', 'the strokes are layered times the brow\'s own soft mask'],
];
/* EACH GATE, not each line: every step(, if ( and ternary's ? is matched to the entry whose text holds it (a line holding a known piece had
   passed whole, shielding any other gate on it: the supervisor's plant, a step() on the side seam's line, read GREEN — round 16) */
const gates = [], unknown = [];
body.split('\n').forEach((l, n) => {
  const spans = []; for (const [s] of KNOWN) { let i = l.indexOf(s); while (i >= 0) { spans.push([i, i + s.length]); i = l.indexOf(s, i + 1); } }
  for (const re of [/\bstep\(/g, /\bif \(/g, /\?/g]) for (const m of l.matchAll(re)) {
    gates.push(n);
    if (!spans.some(([a, b]) => m.index >= a && m.index < b)) unknown.push((line0 + n) + ': ' + l.slice(Math.max(0, m.index - 40), m.index + 60).trim());
  }
});
const unused = KNOWN.filter(([s]) => !body.includes(s));
console.log((unknown.length ? '✖ ' : '✔ ') + gates.length + ' gates in the cloth\'s height, ' + (gates.length - unknown.length) + ' classified' + (unknown.length ? '; NOT: ' + unknown.join(' · ') : ''));
console.log((unused.length ? '✖ ' : '✔ ') + 'every classified gate is still there' + (unused.length ? ' — not found: ' + unused.map(([s]) => JSON.stringify(s.slice(0, 50))).join(', ') : ''));
console.log('HARD GATES: ' + (unknown.length || unused.length ? 'RED' : 'GREEN'));
process.exit(unknown.length || unused.length ? 1 : 0);
