/* Small vector maths on plain [x, y, z] arrays. `out` is written and returned so a hot loop can reuse its scratch vectors. */
export const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
export const set = (o, x, y, z) => { o[0] = x; o[1] = y; o[2] = z; return o; };
export const copy = (o, a) => { o[0] = a[0]; o[1] = a[1]; o[2] = a[2]; return o; };
export const add = (o, a, b) => { o[0] = a[0] + b[0]; o[1] = a[1] + b[1]; o[2] = a[2] + b[2]; return o; };
export const sub = (o, a, b) => { o[0] = a[0] - b[0]; o[1] = a[1] - b[1]; o[2] = a[2] - b[2]; return o; };
export const scale = (o, a, s) => { o[0] = a[0] * s; o[1] = a[1] * s; o[2] = a[2] * s; return o; };
export const addScaled = (o, a, b, s) => { o[0] = a[0] + b[0] * s; o[1] = a[1] + b[1] * s; o[2] = a[2] + b[2] * s; return o; };
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (o, a, b) => { const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; };
export const len = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const norm = (o, a) => { const l = len(a) || 1; o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; return o; };
export const lerp = (o, a, b, t) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
/* the part of a perpendicular to unit n */
export const reject = (o, a, n) => { const d = dot(a, n); o[0] = a[0] - n[0] * d; o[1] = a[1] - n[1] * d; o[2] = a[2] - n[2] * d; return o; };
/* rotate a about unit axis k by angle t (Rodrigues) */
export const rotate = (o, a, k, t) => {
  const c = Math.cos(t), s = Math.sin(t), d = dot(k, a) * (1 - c);
  const x = a[0] * c + (k[1] * a[2] - k[2] * a[1]) * s + k[0] * d;
  const y = a[1] * c + (k[2] * a[0] - k[0] * a[2]) * s + k[1] * d;
  const z = a[2] * c + (k[0] * a[1] - k[1] * a[0]) * s + k[2] * d;
  o[0] = x; o[1] = y; o[2] = z; return o;
};
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const smooth = (t) => t * t * (3 - 2 * t);
export const wrapDeg = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
export const wrapRad = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
/* exponential approach: the share of the way to go after dt with time constant tau */
