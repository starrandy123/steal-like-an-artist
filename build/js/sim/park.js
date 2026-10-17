/* THE PARK, BUILT FROM ITS DATA (config.js PARK). One pass over the rows makes three things the rest of the game reads:
 *   geo[material]  what is drawn: positions, normals, uvs (in metres of texture), indices — grouped by material
 *   col            what the board rides: triangles with a normal at every corner (smooth across a transition) and a surface tag
 *   rails          what the trucks grind: polylines, with what they are made of and, for a ledge's edge, which side its top is on
 *   lips           every coping, for the vert assist and the "air over the coping" gaps
 * Plain JS, no three.js: Node tests build the same park the page draws. */
import { PARK } from '../config.js';
import { propPoint } from './props.js';

const TAU = Math.PI * 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

class Geo {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.idx = []; }
  vert(p, n, u, v) { this.pos.push(p[0], p[1], p[2]); this.nrm.push(n[0], n[1], n[2]); this.uv.push(u, v); return this.pos.length / 3 - 1; }
}

/* the fence round the park: 0.3 m outside its edge, 2 m high — the board's wall and the camera's world (view/sightline.js keeps the lens
   inside it: the camera may not stand outside the fence, even above it) */
/* A COPING'S LINE stands this far over its ramp's lip — the coping's top: where the trucks grind it and where the drawn pipe's top is
   (view/parkview.js; walled: tests/park.mjs, 10-16, the supervisor: drawn 2.2 cm over it, the pipe showed through the trucks on every grind).
   The solid's own corner is the lip, each coping's `corner` under its line: what the wheels ride, and so what the rest of the board meets
   (body.js edgeThrough, the high-centre; onEdgeCorner) — the 2 cm between the lip and the drawn top is the coping not yet solid to the board,
   REPORTED (tests/surfaces.mjs) until the grind release makes it so (the supervisor's call). A lip's `vStar` (its element's, else 0) is the
   speed under which a board ROLLS over it — measured lip by lip, tests/vstar.mjs — and at it and over drops in */
export const COPING_TOP = 0.02;
export const fenceOf = (park) => ({ x0: -0.3, z0: -0.3, x1: park.size[0] + 0.3, z1: park.size[1] + 0.3, h: 2.0 });
/* the fence in runs: each side split where a raised level meets it, each run standing on the ground it is on (the decks are higher than
   2 m — a fence from the plaza's ground would leave their edges open): [[x0, z0], [x1, z1], ground y, the side's inward normal] */
export function fenceSegments(park) {
  const F = fenceOf(park), W = park.size[0], D = park.size[1], out = [];
  const sides = [[[F.x0, F.z0], [F.x1, F.z0], [0, 0, 1], 'x', (r) => r[1] <= 0], [[F.x1, F.z0], [F.x1, F.z1], [-1, 0, 0], 'z', (r) => r[2] >= W],
    [[F.x1, F.z1], [F.x0, F.z1], [0, 0, -1], 'x', (r) => r[3] >= D], [[F.x0, F.z1], [F.x0, F.z0], [1, 0, 0], 'z', (r) => r[0] <= 0]];
  for (const [a, b, n, ax, touches] of sides) {
    const k = ax === 'x' ? 0 : 1, lo = Math.min(a[k], b[k]), hi = Math.max(a[k], b[k]), spans = [];
    for (const g of park.ground) if (g.y > 0 && touches(g.rect)) { const r0 = ax === 'x' ? g.rect[0] : g.rect[1], r1 = ax === 'x' ? g.rect[2] : g.rect[3]; spans.push([r0 <= 0 ? lo : r0, r1 >= (ax === 'x' ? W : D) ? hi : r1, g.y]); }
    const cuts = [...new Set([lo, hi, ...spans.flatMap((s) => [s[0], s[1]])])].filter((v) => v >= lo && v <= hi).sort((p, q) => p - q);
    const runs = [];
    for (let i = 0; i + 1 < cuts.length; i++) { const m = (cuts[i] + cuts[i + 1]) / 2; let y = 0; for (const s of spans) if (m > s[0] && m < s[1]) y = Math.max(y, s[2]); runs.push([cuts[i], cuts[i + 1], y]); }
    const fwd = b[k] > a[k]; if (!fwd) runs.reverse();
    for (const [p0, p1, y] of runs) { const [s0, s1] = fwd ? [p0, p1] : [p1, p0]; const P = (v) => (ax === 'x' ? [v, a[1]] : [a[0], v]); out.push([P(s0), P(s1), y, n]); }
  }
  return out;
}
export function buildPark(park = PARK) {
  const geo = {}, col = { pos: [], nrm: [], surf: [] }, rails = [], lips = [], props = { shrubs: [], posts: [], benches: [], planters: [] };
  const problems = [];
  const G = (m) => (geo[m] || (geo[m] = new Geo()));
  /* one triangle into the collision soup */
  const colTri = (a, b, c, na, nb, nc, surf) => { col.pos.push(...a, ...b, ...c); col.nrm.push(...na, ...nb, ...nc); col.surf.push(surf); };
  /* planar texture coordinates in metres (the material sets the tile size) */
  const uvOf = (p, n) => (Math.abs(n[1]) > 0.7 ? [p[0], p[2]] : Math.abs(n[0]) > Math.abs(n[2]) ? [p[2], p[1]] : [p[0], p[1]]);
  /* a triangle, wound so that its face looks along `faceN`; per-corner normals (smooth) or the flat one */
  function tri(mat, surf, a, b, c, faceN, ns, uvs, collide = true) {
    const fn = nrm(crs(sub(b, a), sub(c, a)));
    if (dt(fn, faceN) < 0) { [b, c] = [c, b]; if (ns) ns = [ns[0], ns[2], ns[1]]; if (uvs) uvs = [uvs[0], uvs[2], uvs[1]]; }
    const N = ns || [faceN, faceN, faceN], g = G(mat);
    const U = uvs || [uvOf(a, faceN), uvOf(b, faceN), uvOf(c, faceN)];
    const i0 = g.vert(a, N[0], U[0][0], U[0][1]), i1 = g.vert(b, N[1], U[1][0], U[1][1]), i2 = g.vert(c, N[2], U[2][0], U[2][1]);
    g.idx.push(i0, i1, i2);
    if (collide) colTri(a, b, c, N[0], N[1], N[2], surf);
  }
  const quad = (mat, surf, p, faceN, ns, uvs, collide = true) => {
    tri(mat, surf, p[0], p[1], p[2], faceN, ns && [ns[0], ns[1], ns[2]], uvs && [uvs[0], uvs[1], uvs[2]], collide);
    tri(mat, surf, p[0], p[2], p[3], faceN, ns && [ns[0], ns[2], ns[3]], uvs && [uvs[0], uvs[2], uvs[3]], collide);
  };
  const fan = (mat, surf, centre, ring, faceN, collide = true) => { for (let i = 0; i + 1 < ring.length; i++) tri(mat, surf, centre, ring[i], ring[i + 1], faceN, null, null, collide); };
  /* an axis-aligned box: top, and the four sides down to `bottom` */
  function box(mat, sideMat, surf, x0, z0, x1, z1, bottom, top, opts = {}) {
    quad(mat, surf, [[x0, top, z0], [x1, top, z0], [x1, top, z1], [x0, top, z1]], [0, 1, 0]);
    const sides = [[[x0, z0], [x1, z0], [0, 0, -1]], [[x1, z1], [x0, z1], [0, 0, 1]], [[x0, z1], [x0, z0], [-1, 0, 0]], [[x1, z0], [x1, z1], [1, 0, 0]]];
    for (const [a, b, n] of sides) quad(sideMat, opts.sideSurf || surf, [[a[0], bottom, a[1]], [b[0], bottom, b[1]], [b[0], top, b[1]], [a[0], top, a[1]]], n);
  }
  const addRail = (r) => { const pts = r.pts, cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2])); r.cum = cum; r.length = cum[cum.length - 1]; r.group = r.group || r.id.split(':')[0]; rails.push(r); return r; };
  /* a handrail's bends are bent pipe, not corners (10-16: through a sharp corner each truck turned in an instant, and the board's middle
     changed speed in two half-steps at the Five Rail's bends): each corner rounded to radius r, as a curve the drawn tube and the trucks follow */
  const bent = (pts, r) => {
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const P = pts[i], A = pts[i - 1], C = pts[i + 1], la = Math.hypot(P[0] - A[0], P[1] - A[1], P[2] - A[2]), lc = Math.hypot(C[0] - P[0], C[1] - P[1], C[2] - P[2]);
      const d1 = [(P[0] - A[0]) / la, (P[1] - A[1]) / la, (P[2] - A[2]) / la], d2 = [(C[0] - P[0]) / lc, (C[1] - P[1]) / lc, (C[2] - P[2]) / lc];
      const th = Math.acos(Math.max(-1, Math.min(1, d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2])));
      if (th < 0.02) { out.push(P); continue; }
      const t = Math.min(r * Math.tan(th / 2), 0.45 * la, 0.45 * lc), a = [P[0] - d1[0] * t, P[1] - d1[1] * t, P[2] - d1[2] * t], c = [P[0] + d2[0] * t, P[1] + d2[1] * t, P[2] + d2[2] * t];
      for (let k = 0; k <= 6; k++) { const u = k / 6, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u; out.push([a[0] * w0 + P[0] * w1 + c[0] * w2, a[1] * w0 + P[1] * w1 + c[1] * w2, a[2] * w0 + P[2] * w1 + c[2] * w2]); }
    }
    out.push(pts[pts.length - 1]); return out;
  };
  /* a steel angle along a ledge's top edge: drawn, and grindable */
  function angleEdge(id, name, a, b, y, inward, wax, base = 'angle') {
    const d = [b[0] - a[0], 0, b[2] - a[2]], L = Math.hypot(d[0], d[2]), t = [d[0] / L, 0, d[2] / L], out = [-inward[0], 0, -inward[2]], w = 0.045, e = 0.003;
    const p = (q, s, h) => [q[0] + inward[0] * s + out[0] * e, y + h, q[2] + inward[2] * s + out[2] * e];
    const m = base === 'curb' ? 'curb' : 'steel';
    quad(m, wax ? 'waxedAngle' : 'angle', [p(a, 0, e), p(b, 0, e), p(b, w, e), p(a, w, e)], [0, 1, 0], null, [[0, 0], [L, 0], [L, w], [0, w]], false);
    quad(m, wax ? 'waxedAngle' : 'angle', [p(a, 0, e), p(b, 0, e), p(b, 0, -w), p(a, 0, -w)], out, null, [[0, 0], [L, 0], [L, w], [0, w]], false);
    addRail({ id, name, kind: 'ledge', surface: wax ? 'waxedAngle' : base, pts: [[a[0], y, a[2]], [b[0], y, b[2]]], inward, tangent: t });
  }

  /* ---------------- the ground levels (the plaza has the Basin cut out of it) ---------------- */
  const holes = park.elements.filter((e) => e.type === 'bowl').map((e) => e.rect);
  const minus = (r, h) => {
    if (h[0] >= r[2] || h[2] <= r[0] || h[1] >= r[3] || h[3] <= r[1]) return [r];
    const out = [];
    if (h[1] > r[1]) out.push([r[0], r[1], r[2], h[1]]);
    if (h[3] < r[3]) out.push([r[0], h[3], r[2], r[3]]);
    const z0 = Math.max(r[1], h[1]), z1 = Math.min(r[3], h[3]);
    if (h[0] > r[0]) out.push([r[0], z0, h[0], z1]);
    if (h[2] < r[2]) out.push([h[2], z0, r[2], z1]);
    return out;
  };
  /* a raised level that meets the park's edge runs on to the fence: no slot between its edge and the fence for a board to drop into */
  const F = fenceOf(park), toFence = (r) => [r[0] <= 0 ? F.x0 : r[0], r[1] <= 0 ? F.z0 : r[1], r[2] >= park.size[0] ? F.x1 : r[2], r[3] >= park.size[1] ? F.z1 : r[3]];
  for (const g of park.ground) {
    let rects = [g.y > 0 ? toFence(g.rect) : g.rect];
    if (g.y === 0) for (const h of holes) rects = rects.flatMap((r) => minus(r, h));
    const mat = g.surface === 'grass' ? 'grass' : g.surface;
    for (const r of rects) quad(mat, g.surface, [[r[0], g.y, r[1]], [r[2], g.y, r[1]], [r[2], g.y, r[3]], [r[0], g.y, r[3]]], [0, 1, 0]);
  }
  /* the walls of the raised levels (the terrace's south wall stops where the bank, the stair ledge and the stairs come down) */
  const wall = (x0, z0, x1, z1, y0, y1, n, mat = 'wall') => quad(mat, 'wall', [[x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0]], n);
  /* each row: [x0, z0, x1, z1, y0, y1, its outward normal]; 'fx0' 'fx1' 'fz0' 'fz1' are the fence's own lines (a face that meets the fence runs on
     to it) */
  const onFence = (v) => (v === 'fx0' ? F.x0 : v === 'fx1' ? F.x1 : v === 'fz0' ? F.z0 : v === 'fz1' ? F.z1 : v);
  for (const w of park.walls || []) wall(onFence(w[0]), onFence(w[1]), onFence(w[2]), onFence(w[3]), w[4], w[5], w[6]);

  /* ---------------- transitions ---------------- */
  /* the profile of a transition of height h on radius r, from its foot (k = 0) to its lip: s = distance from the lip toward the riding
     side, y over the base, n = the normal in (s, y) */
  function profile(h, r, stepDeg = 4) {
    const lip = Math.acos((r - h) / r), run = r * Math.sin(lip), n = Math.max(6, Math.ceil(lip * 180 / Math.PI / stepDeg)), out = [];
    for (let k = 0; k <= n; k++) { const f = lip * k / n; out.push({ s: run - r * Math.sin(f), y: r - r * Math.cos(f), ns: Math.sin(f), ny: Math.cos(f), arc: r * f }); }
    return { lip, run, pts: out };
  }
  function quarter(e, face, base, copingA, copingB, sideCaps = true) {
    const P = profile(e.h, e.r), f = [face[0], 0, face[1]], up = [0, 1, 0];
    const L = Math.hypot(copingB[0] - copingA[0], copingB[1] - copingA[1]);
    for (let k = 0; k + 1 < P.pts.length; k++) {
      const q0 = P.pts[k], q1 = P.pts[k + 1];
      const at = (c, q) => [c[0] + f[0] * q.s, base + q.y, c[1] + f[2] * q.s];
      const n0 = nrm([f[0] * q0.ns, q0.ny, f[2] * q0.ns]), n1 = nrm([f[0] * q1.ns, q1.ny, f[2] * q1.ns]);
      const mid = nrm([n0[0] + n1[0], n0[1] + n1[1], n0[2] + n1[2]]);
      quad('ramp', 'ramp', [at(copingA, q0), at(copingB, q0), at(copingB, q1), at(copingA, q1)], mid, [n0, n0, n1, n1], [[0, q0.arc], [L, q0.arc], [L, q1.arc], [0, q1.arc]]);
    }
    if (sideCaps) for (const [c, sgn] of [[copingA, -1], [copingB, 1]]) {
      const dir = nrm([copingB[0] - copingA[0], 0, copingB[1] - copingA[1]]), n = [dir[0] * sgn, 0, dir[2] * sgn];
      const ring = P.pts.map((q) => [c[0] + f[0] * q.s, base + q.y, c[1] + f[2] * q.s]);
      fan('wall', 'wall', [c[0], base, c[1]], ring, n);
    }
    lips.push({ id: e.id, kind: 'quarter', a: [copingA[0], base + e.h, copingA[1]], b: [copingB[0], base + e.h, copingB[1]], face: f, top: base + e.h, lipDeg: P.lip * 180 / Math.PI, r: e.r });
    return P;
  }
  for (const e of park.elements) {
    if (e.type === 'quarter') {
      /* a quarter that meets the park's edge runs on to the fence too (no slot beside its end) */
      const [a, b] = e.coping.map(([x, z]) => [x <= 0 ? F.x0 : x >= park.size[0] ? F.x1 : x, z <= 0 ? F.z0 : z >= park.size[1] ? F.z1 : z]); quarter(e, e.face, e.base, a, b);
      /* (a quarter whose edge is bare concrete — Kiln Yard's: no coping tube, ground as a curb) */
      addRail({ id: e.id, name: e.name, kind: 'coping', surface: 'coping', corner: -COPING_TOP, vStar: e.vStar || 0, pts: [[a[0], e.base + e.h + COPING_TOP, a[1]], [b[0], e.base + e.h + COPING_TOP, b[1]]], inward: [-e.face[0], 0, -e.face[1]], face: [e.face[0], 0, e.face[1]], ...(e.edge === 'concrete' ? { surface: 'curb', bare: true } : {}) });
    } else if (e.type === 'spine') {
      const [a, b] = e.coping;
      quarter({ ...e, id: e.id + ':w' }, [-1, 0], e.base, a, b); quarter({ ...e, id: e.id + ':e' }, [1, 0], e.base, a, b);
      addRail({ id: e.id, name: e.name, kind: 'coping', surface: 'coping', corner: -COPING_TOP, pts: [[a[0], e.base + e.h + COPING_TOP, a[1]], [b[0], e.base + e.h + COPING_TOP, b[1]]], inward: [0, 0, 0], spine: true });
    } else if (e.type === 'bowl') bowl(e);
  }
  /* THE BASIN: the transition's profile swept around a rounded rectangle; a fan for the floor; the corners filled at plaza level */
  function bowl(e) {
    const [x0, z0, x1, z1] = e.rect, R = e.corner, P = profile(e.depth, e.r), base = -e.depth, rim = [];
    const corners = [[x1 - R, z1 - R, 0], [x0 + R, z1 - R, 90], [x0 + R, z0 + R, 180], [x1 - R, z0 + R, 270]];
    for (const [cx, cz, a0] of corners) {
      const steps = 15;
      for (let i = 0; i <= steps; i++) { const a = (a0 + 90 * i / steps) * Math.PI / 180; rim.push({ x: cx + R * Math.cos(a), z: cz + R * Math.sin(a), mx: -Math.cos(a), mz: -Math.sin(a) }); }
    }
    /* straight runs between the corner arcs are spanned by one quad strip each (the arcs' last and next first samples); close the loop */
    rim.push(rim[0]);
    let arcLen = 0; const along = [0];
    for (let i = 1; i < rim.length; i++) { arcLen += Math.hypot(rim[i].x - rim[i - 1].x, rim[i].z - rim[i - 1].z); along.push(arcLen); }
    for (let i = 0; i + 1 < rim.length; i++) {
      const A = rim[i], B = rim[i + 1];
      for (let k = 0; k + 1 < P.pts.length; k++) {
        const q0 = P.pts[k], q1 = P.pts[k + 1];
        const at = (Q, q) => [Q.x + Q.mx * q.s, base + q.y, Q.z + Q.mz * q.s];
        const nn = (Q, q) => nrm([Q.mx * q.ns, q.ny, Q.mz * q.ns]);
        const nA0 = nn(A, q0), nB0 = nn(B, q0), nB1 = nn(B, q1), nA1 = nn(A, q1);
        const mid = nrm([nA0[0] + nB1[0], nA0[1] + nB1[1], nA0[2] + nB1[2]]);
        quad('ramp', 'ramp', [at(A, q0), at(B, q0), at(B, q1), at(A, q1)], mid, [nA0, nB0, nB1, nA1], [[along[i], q0.arc], [along[i + 1], q0.arc], [along[i + 1], q1.arc], [along[i], q1.arc]]);
      }
    }
    /* the floor */
    const floor = rim.map((Q) => [Q.x + Q.mx * P.run, base, Q.z + Q.mz * P.run]);
    fan('ramp', 'ramp', [(x0 + x1) / 2, base, (z0 + z1) / 2], floor, [0, 1, 0]);
    /* plaza level in the four corners outside the rounded rim */
    const sq = [[x1, z1], [x0, z1], [x0, z0], [x1, z0]];
    for (let c = 0; c < 4; c++) { const ring = rim.slice(c * 16, c * 16 + 16).map((Q) => [Q.x, 0, Q.z]); fan('slab', 'slab', [sq[c][0], 0, sq[c][1]], ring, [0, 1, 0]); }
    addRail({ id: e.id, name: e.name, kind: 'coping', surface: 'coping', loop: true, corner: -COPING_TOP, vStar: e.vStar || 0, pts: rim.map((Q) => [Q.x, COPING_TOP, Q.z]), inwardOf: rim.map((Q) => [-Q.mx, 0, -Q.mz]) });
    lips.push({ id: e.id, kind: 'bowl', rim: rim.map((Q) => [Q.x, 0, Q.z]), top: 0, lipDeg: P.lip * 180 / Math.PI, r: e.r });
  }

  /* ---------------- the street and the terrace ---------------- */
  for (const e of park.elements) {
    const base = e.base || 0;
    if (e.type === 'ledge' && e.rect) {
      const [x0, z0, x1, z1] = e.rect, top = base + e.h, topMat = e.top === 'granite' ? 'granite' : e.top === 'curb' ? 'curb' : 'slab';
      box(topMat, e.top === 'granite' ? 'granite' : e.top === 'curb' ? 'curb' : 'wall', e.top === 'granite' ? (e.wax ? 'waxedGranite' : 'granite') : e.top === 'curb' ? 'curb' : 'slab', x0, z0, x1, z1, base, top, { sideSurf: 'wall' });
      const long = x1 - x0 >= z1 - z0;
      if (long) { angleEdge(e.id + ':s', e.name, [x0, 0, z0], [x1, 0, z0], top, [0, 0, 1], e.wax, e.top === 'curb' ? 'curb' : 'angle'); angleEdge(e.id + ':n', e.name, [x1, 0, z1], [x0, 0, z1], top, [0, 0, -1], e.wax, e.top === 'curb' ? 'curb' : 'angle'); }
      else { angleEdge(e.id + ':w', e.name, [x0, 0, z1], [x0, 0, z0], top, [1, 0, 0], e.wax); angleEdge(e.id + ':e', e.name, [x1, 0, z0], [x1, 0, z1], top, [-1, 0, 0], e.wax); }
    } else if (e.type === 'ledge' && e.line) {
      const [a, b] = e.line, d = nrm([b[0] - a[0], 0, b[1] - a[1]]), side = [-d[2], 0, d[0]], w = e.width / 2, top = base + e.h;
      const P0 = [a[0] + side[0] * w, a[1] + side[2] * w], P1 = [b[0] + side[0] * w, b[1] + side[2] * w], P2 = [b[0] - side[0] * w, b[1] - side[2] * w], P3 = [a[0] - side[0] * w, a[1] - side[2] * w];
      const ring = [P0, P1, P2, P3];
      quad('granite', e.wax ? 'waxedGranite' : 'granite', ring.map((p) => [p[0], top, p[1]]), [0, 1, 0]);
      for (let i = 0; i < 4; i++) { const p = ring[i], q = ring[(i + 1) % 4], n = nrm([q[1] - p[1], 0, -(q[0] - p[0])]); const c = [(p[0] + q[0]) / 2 - (a[0] + b[0]) / 2, 0, (p[1] + q[1]) / 2 - (a[1] + b[1]) / 2]; const nn = dt(n, c) < 0 ? [-n[0], 0, -n[2]] : n; quad('granite', 'wall', [[p[0], base, p[1]], [q[0], base, q[1]], [q[0], top, q[1]], [p[0], top, p[1]]], nn); }
      angleEdge(e.id + ':a', e.name, [P0[0], 0, P0[1]], [P1[0], 0, P1[1]], top, [-side[0], 0, -side[2]], e.wax);
      angleEdge(e.id + ':b', e.name, [P2[0], 0, P2[1]], [P3[0], 0, P3[1]], top, [side[0], 0, side[2]], e.wax);
    } else if (e.type === 'planter') {
      const [x0, z0, x1, z1] = e.rect, top = base + e.h, t = 0.16;
      box('slab', 'wall', 'slab', x0, z0, x1, z1, base, top, { sideSurf: 'wall' });
      quad('soil', 'grass', [[x0 + t, top + 0.002, z0 + t], [x1 - t, top + 0.002, z0 + t], [x1 - t, top + 0.002, z1 - t], [x0 + t, top + 0.002, z1 - t]], [0, 1, 0], null, null, false);
      angleEdge(e.id + ':s', e.name, [x0, 0, z0], [x1, 0, z0], top, [0, 0, 1], false); angleEdge(e.id + ':n', e.name, [x1, 0, z1], [x0, 0, z1], top, [0, 0, -1], false);
      angleEdge(e.id + ':w', e.name, [x0, 0, z1], [x0, 0, z0], top, [1, 0, 0], false); angleEdge(e.id + ':e', e.name, [x1, 0, z0], [x1, 0, z1], top, [-1, 0, 0], false);
      props.planters.push({ rect: e.rect, h: top });
      for (let i = 0; i < 7; i++) props.shrubs.push([x0 + t + (x1 - x0 - 2 * t) * ((i * 0.618) % 1), top, z0 + t + (z1 - z0 - 2 * t) * ((i * 0.381 + 0.2) % 1), 0.26 + 0.1 * ((i * 0.77) % 1)]);
    } else if (e.type === 'bench') {
      const [x0, z0, x1, z1] = e.rect, top = base + e.h;
      box('wood', 'steel', 'wood', x0, z0, x1, z1, top - 0.06, top);
      for (const x of [x0 + 0.18, x1 - 0.30]) box('steel', 'steel', 'wall', x, z0 + 0.04, x + 0.12, z1 - 0.04, base, top - 0.06);
      angleEdge(e.id + ':s', e.name, [x0, 0, z0], [x1, 0, z0], top, [0, 0, 1], false); angleEdge(e.id + ':n', e.name, [x1, 0, z1], [x0, 0, z1], top, [0, 0, -1], false);
      props.benches.push({ rect: e.rect, h: top });
    } else if (e.type === 'box') {
      const [bx0, bz0, bx1, bz1] = e.base, [tx0, tz0, tx1, tz1] = e.top, y0 = e.y || 0, h = y0 + e.h;   // a box's `base` is its foot; `y` the level it stands on
      quad('slab', 'slab', [[tx0, h, tz0], [tx1, h, tz0], [tx1, h, tz1], [tx0, h, tz1]], [0, 1, 0]);
      const banks = [
        [[bx0, y0, bz0], [bx1, y0, bz0], [tx1, h, tz0], [tx0, h, tz0]], [[bx1, y0, bz1], [bx0, y0, bz1], [tx0, h, tz1], [tx1, h, tz1]],
        [[bx0, y0, bz1], [bx0, y0, bz0], [tx0, h, tz0], [tx0, h, tz1]], [[bx1, y0, bz0], [bx1, y0, bz1], [tx1, h, tz1], [tx1, h, tz0]],
      ];
      for (const q of banks) { const n = nrm(crs(sub(q[1], q[0]), sub(q[3], q[0]))); quad('ramp', 'ramp', q, n[1] < 0 ? [-n[0], -n[1], -n[2]] : n); }
      angleEdge(e.id + ':s', e.name, [tx0, 0, tz0], [tx1, 0, tz0], h, [0, 0, 1], false); angleEdge(e.id + ':n', e.name, [tx1, 0, tz1], [tx0, 0, tz1], h, [0, 0, -1], false);
      angleEdge(e.id + ':w', e.name, [tx0, 0, tz1], [tx0, 0, tz0], h, [1, 0, 0], false); angleEdge(e.id + ':e', e.name, [tx1, 0, tz0], [tx1, 0, tz1], h, [-1, 0, 0], false);
    } else if (e.type === 'stairs') {
      const [x0, , x1] = e.rect, zTop = e.rect[3];
      for (let i = 0; i < e.risers; i++) {
        const z = zTop - e.tread * i, yA = e.top - e.rise * i, yB = e.top - e.rise * (i + 1);
        quad('granite', 'wall', [[x0, yB, z], [x1, yB, z], [x1, yA, z], [x0, yA, z]], [0, 0, -1]);
        if (i < e.risers - 1) quad('granite', 'granite', [[x0, yB, z], [x1, yB, z], [x1, yB, z - e.tread], [x0, yB, z - e.tread]], [0, 1, 0]);
        for (const [x, n] of [[x0, [-1, 0, 0]], [x1, [1, 0, 0]]]) quad('wall', 'wall', [[x, base, z], [x, base, z - e.tread], [x, yB, z - e.tread], [x, yB, z]], n);
      }
    } else if (e.type === 'stairLedge') {
      const [x0, , x1] = e.rect, pr = e.profile;
      for (let i = 0; i + 1 < pr.length; i++) {
        const [za, ya] = pr[i], [zb, yb] = pr[i + 1], n = nrm([0, za - zb, yb - ya]);
        quad('granite', 'granite', [[x0, ya, za], [x1, ya, za], [x1, yb, zb], [x0, yb, zb]], n[1] < 0 ? [-n[0], -n[1], -n[2]] : n);
        for (const [x, nn] of [[x0, [-1, 0, 0]], [x1, [1, 0, 0]]]) quad('granite', 'wall', [[x, base, za], [x, base, zb], [x, yb, zb], [x, ya, za]], nn);
      }
      const [ze, ye] = pr[pr.length - 1]; quad('granite', 'wall', [[x0, base, ze], [x1, base, ze], [x1, ye, ze], [x0, ye, ze]], [0, 0, -1]);
      for (const [x, inward, tag] of [[x0, [1, 0, 0], 'w'], [x1, [-1, 0, 0], 'e']]) addRail({ id: e.id + ':' + tag, name: e.name, kind: 'ledge', surface: 'angle', pts: pr.map(([z, y]) => [x, y, z]), inward });
    } else if (e.type === 'bank' && !e.axis && !e.back && e.from <= e.to) {
      const [x0, z0, x1, z1] = e.rect, n = nrm([0, z1 - z0, -(e.to - e.from)]);
      quad('ramp', 'ramp', [[x0, e.from, z0], [x1, e.from, z0], [x1, e.to, z1], [x0, e.to, z1]], n);
      for (const [x, nn] of [[x0, [-1, 0, 0]], [x1, [1, 0, 0]]]) tri('wall', 'wall', [x, e.from, z0], [x, e.to, z1], [x, e.from, z1], nn);
    } else if (e.type === 'bank') {
      /* in the bank's own frame: u along its slope (x for axis 'x', else z), w across it; `from` at u0, `to` at u1; its sides closed down to its
         lower end (or `base`), and with `back` the face at its high end too */
      const [x0, z0, x1, z1] = e.rect, X = e.axis === 'x', lo = e.base ?? Math.min(e.from, e.to);
      const [u0, u1, w0, w1] = X ? [x0, x1, z0, z1] : [z0, z1, x0, x1], P = (u, y, w) => (X ? [u, y, w] : [w, y, u]);
      const n = nrm(X ? [-(e.to - e.from), u1 - u0, 0] : [0, u1 - u0, -(e.to - e.from)]);
      quad('ramp', 'ramp', [P(u0, e.from, w0), P(u0, e.from, w1), P(u1, e.to, w1), P(u1, e.to, w0)], n);
      for (const [w, sg] of [[w0, -1], [w1, 1]]) {
        const nn = X ? [0, 0, sg] : [sg, 0, 0];
        if (e.from > lo + 1e-9 && e.to > lo + 1e-9) quad('wall', 'wall', [P(u0, lo, w), P(u1, lo, w), P(u1, e.to, w), P(u0, e.from, w)], nn);
        else tri('wall', 'wall', P(u0, lo, w), P(u1, lo, w), e.to > e.from ? P(u1, e.to, w) : P(u0, e.from, w), nn);
      }
      if (e.back) { const [uh, yh, s] = e.to >= e.from ? [u1, e.to, 1] : [u0, e.from, -1]; quad('wall', 'wall', [P(uh, lo, w0), P(uh, lo, w1), P(uh, yh, w1), P(uh, yh, w0)], X ? [s, 0, 0] : [0, 0, s]); }
    } else if (e.type === 'edge') {
      const [a, b] = e.line; angleEdge(e.id, e.name, [a[0], 0, a[1]], [b[0], 0, b[1]], e.y, e.inward, e.wax);
    } else if (e.type === 'barrier') barrier(e);
    else if (e.type === 'rail') {
      addRail({ id: e.id, name: e.name, kind: 'rail', surface: 'rail', pts: bent(e.pts.map((p) => [p[0], p[1], p[2]]), 0.3), inward: [0, 0, 0] });
      if (e.posts) for (const i of [0, e.pts.length - 1]) props.posts.push({ at: e.pts[i] });
    }
  }
  /* A NEW JERSEY BARRIER (FHWA's profile: 32 in tall, a 24 in base, a 6 in top; a 3 in upright reveal, then 55° to 13 in, then 84° to the
     top), scaled to the row's `h`, `bottom` and `top` widths and extruded along its line; its two top corners are grind lines (kind 'ledge':
     the solid is under them). Drawn by these same triangles, so what is drawn is what the board rides. */
  function barrier(e) {
    const [a, b] = e.line, base = e.base || 0, d = nrm([b[0] - a[0], 0, b[1] - a[1]]), side = [-d[2], 0, d[0]], k = e.h / 0.813;
    const hb = e.bottom / 2, ht = e.top / 2, hm = ht + (hb - ht) * (0.051 / 0.229);   // the half-widths: base, top, and at the 55°/84° break
    const prof = [[hb, 0], [hb, 0.076 * k], [hm, 0.330 * k], [ht, e.h], [-ht, e.h], [-hm, 0.330 * k], [-hb, 0.076 * k], [-hb, 0]];
    const at = (q, [s, y]) => [q[0] + side[0] * s, base + y, q[1] + side[2] * s];
    for (let i = 0; i + 1 < prof.length; i++) {
      const p0 = prof[i], p1 = prof[i + 1], out = nrm([side[0] * (p1[1] - p0[1]) - 0, (p0[0] - p1[0]), side[2] * (p1[1] - p0[1])]);
      quad('wall', 'wall', [at(a, p0), at(b, p0), at(b, p1), at(a, p1)], dt(out, [0, 1, 0]) < -0.99 ? [0, -1, 0] : out);
    }
    for (const [q, n] of [[a, [-d[0], 0, -d[2]]], [b, [d[0], 0, d[2]]]]) fan('wall', 'wall', [q[0], base + e.h * 0.4, q[1]], [...prof, prof[0]].map((p) => at(q, p)), n);
    for (const [s, tag] of [[ht, 'l'], [-ht, 'r']]) addRail({ id: e.id + ':' + tag, name: e.name, kind: 'ledge', surface: 'curb', pts: [at(a, [s, e.h]), at(b, [s, e.h])], inward: [-side[0] * Math.sign(s), 0, -side[2] * Math.sign(s)], tangent: d });
  }
  /* THE PROPS (a park's `props` rows and its `propMeshes`): each prop's own drawn triangles are what the board meets, placed by the one
     transform the view draws them with (sim/props.js); a top is ridden as slab, a side is a wall */
  for (const row of park.props || []) {
    const PM = park.propMeshes && park.propMeshes[row.kind]; if (!PM) { problems.push('a prop of a kind with no mesh: ' + row.kind); continue; }
    const P = PM.pos, I = PM.idx;
    for (let t = 0; t + 2 < I.length; t += 3) {
      const a = propPoint(row, P[I[t] * 3], P[I[t] * 3 + 1], P[I[t] * 3 + 2]), b = propPoint(row, P[I[t + 1] * 3], P[I[t + 1] * 3 + 1], P[I[t + 1] * 3 + 2]), c = propPoint(row, P[I[t + 2] * 3], P[I[t + 2] * 3 + 1], P[I[t + 2] * 3 + 2]);
      const n = nrm(crs(sub(b, a), sub(c, a)));
      colTri(a, b, c, n, n, n, n[1] >= 0.8 ? 'slab' : 'wall');
    }
  }
  /* the slab under the East Wall's deck and the fence around the park: walls the board cannot leave through */
  for (const [[x0, z0], [x1, z1], gy, n] of fenceSegments(park)) quad('fence', 'fence', [[x0, gy, z0], [x1, gy, z1], [x1, gy + F.h, z1], [x0, gy + F.h, z0]], n, null, null, true);
  /* the ground outside the fence (it only has to be there) */
  const [W, D] = park.size, out = park.outside || 'grass';
  for (const r of [[-60, -60, W + 60, -0.3], [-60, D + 0.3, W + 60, D + 60], [-60, -0.3, -0.3, D + 0.3], [W + 0.3, -0.3, W + 60, D + 0.3]]) quad(out, out, [[r[0], 0, r[1]], [r[2], 0, r[1]], [r[2], 0, r[3]], [r[0], 0, r[3]]], [0, 1, 0]);
  for (const r of [[-0.3, -0.3, W + 0.3, 0], [-0.3, D, W + 0.3, D + 0.3], [-0.3, 0, 0, D], [W, 0, W + 0.3, D]]) quad('slab', 'slab', [[r[0], 0, r[1]], [r[2], 0, r[1]], [r[2], 0, r[3]], [r[0], 0, r[3]]], [0, 1, 0]);

  /* THE PARK'S OWN CHECKS (10-16: this comment had said "no two on one spot" since the spike, and only the first check was here — a ledge set
     in the Basin was built and nothing said so). Each element's footprint on the ground, as a convex polygon: a rect, a box's base, a slanted
     ledge's strip, a transition from its coping to the foot of its run (a spine both ways, square to its coping). Every footprint inside the
     park, and no two overlapping by more than a centimetre (separating axes). A rail is a line in the air that rides over what it was built
     over (the Five Rail over the Five): only its points are held inside. Each is NAMED — the console, and tests/park.mjs fails on any — never
     refused: a row a modder sets over another on purpose is still built */
  const corners = ([x0, z0, x1, z1]) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const footprint = (e) => {
    if (e.rect) return corners(e.rect); if (e.type === 'box') return corners(e.base);
    if (e.line) { const [[ax, az], [bx, bz]] = e.line, l = Math.hypot(bx - ax, bz - az), nx = ((az - bz) / l) * (e.width / 2), nz = ((bx - ax) / l) * (e.width / 2);
      return [[ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], [ax - nx, az - nz]]; }
    if (e.coping) { const run = Math.sqrt(e.r * e.r - (e.r - e.h) ** 2), [a, b] = e.coping, l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const f = e.face || [(a[1] - b[1]) / l, (b[0] - a[0]) / l], back = e.face ? 0 : run;
      return [[a[0] - f[0] * back, a[1] - f[1] * back], [b[0] - f[0] * back, b[1] - f[1] * back], [b[0] + f[0] * run, b[1] + f[1] * run], [a[0] + f[0] * run, a[1] + f[1] * run]]; }
    return null; };
  const overlap = (P, Q) => { let d = Infinity;
    for (const S of [P, Q]) for (let i = 0; i < S.length; i++) {
      const a = S[i], b = S[(i + 1) % S.length], nx = a[1] - b[1], nz = b[0] - a[0], l = Math.hypot(nx, nz), pr = (T) => T.map((q) => (q[0] * nx + q[1] * nz) / l), p = pr(P), q = pr(Q);
      d = Math.min(d, Math.min(Math.max(...p), Math.max(...q)) - Math.max(Math.min(...p), Math.min(...q))); }
    return d; };
  const outside = ([x, z]) => x < -1e-6 || z < -1e-6 || x > park.size[0] + 1e-6 || z > park.size[1] + 1e-6;
  const prints = [];
  for (const e of park.elements) {
    const f = footprint(e);
    if ((f || (e.pts || []).map((q) => [q[0], q[2]])).some(outside)) problems.push(e.name + ' leaves the park');
    if (f) prints.push([e, f]);
  }
  for (let i = 0; i < prints.length; i++) for (let j = i + 1; j < prints.length; j++) {
    const d = overlap(prints[i][1], prints[j][1]);
    if (d > 0.01) problems.push(prints[i][0].name + ' and ' + prints[j][0].name + ' on one spot (overlapping by ' + Math.round(d * 100) + ' cm)');
  }
  /* a prop leaves the park only if its footprint does: its mesh's box on the ground, turned and placed as it is drawn */
  for (const row of park.props || []) {
    const PM = park.propMeshes && park.propMeshes[row.kind]; if (!PM) continue;
    const [x0, z0, x1, z1] = PM.box, q = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => propPoint(row, x, 0, z));
    if (q.some((p) => p[0] < 0 || p[2] < 0 || p[0] > park.size[0] || p[2] > park.size[1])) problems.push('the ' + row.kind + ' at ' + row.at.join(', ') + ' leaves the park');
  }

  return { geo, col: { pos: new Float32Array(col.pos), nrm: new Float32Array(col.nrm), surf: col.surf }, rails, lips, props, problems };
}

/* the surface names the collision soup carries, in the order the sim indexes them */
export const SURFACES = ['slab', 'pavers', 'deck', 'grass', 'ramp', 'wall', 'granite', 'waxedGranite', 'curb', 'wood', 'fence', 'waxedAngle', 'angle'];
