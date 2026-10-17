/* THE CAMERA KEEPS HER IN SIGHT: one rule for the game's camera (camera.js) and its test (tests/camera_view.mjs). Everything that can
 * stand between the lens and the skater counts — the park itself (its collision mesh, the fence included: the camera stays inside it), the
 * lamp posts and the trees round the edge (cylinders and spheres from config, the same rows the view draws from). From the place the
 * camera wants, a line to her head and a line to her feet must both be clear; if not, the camera swings round her (the smallest swing that
 * clears both, keeping the swing it already has while that stays clear), and only if no swing clears it does it pull in along the line. */
import { PARK, TREES } from '../config.js';
import { greenery } from './trees.js';
import { fenceOf } from '../sim/park.js';

/* THE CAMERA'S WORLD is the park inside its fence: the lens never stands outside it, not even above the fence's 2 m (from there a lamp post
   or a tree outside could come between the lens and her). 0.2 m in from the fence. */
let F = fenceOf(PARK); const IN = 0.2;
export const inWorld = (c) => c[0] > F.x0 + IN && c[0] < F.x1 - IN && c[2] > F.z0 + IN && c[2] < F.z1 - IN;
/* how far from `a` along the unit `d` the lens can go before it would leave its world (Infinity if it never would) */
export function worldReach(a, d) {
  let t = Infinity;
  if (d[0] > 1e-9) t = Math.min(t, (F.x1 - IN - a[0]) / d[0]); else if (d[0] < -1e-9) t = Math.min(t, (F.x0 + IN - a[0]) / d[0]);
  if (d[2] > 1e-9) t = Math.min(t, (F.z1 - IN - a[2]) / d[2]); else if (d[2] < -1e-9) t = Math.min(t, (F.z0 + IN - a[2]) / d[2]);
  return Math.max(0, t);
}

const DEG = Math.PI / 180;
/* the dressing that hides a skater: the rails and their posts, the lamp posts, the trees' trunks and crowns, the planters' shrubs */
export function occluders(park, trees, world = null) {
  park = park || (world ? world.data : PARK); trees = trees || (world && world.trees) || TREES;
  const out = [];
  /* the round rails (their tubes are drawn, not in the collision mesh): a capsule round each run */
  if (world) for (const r of world.rails) if (r.kind === 'rail') {
    for (let i = 0; i + 1 < r.pts.length; i++) out.push({ kind: 'cap', a: r.pts[i], b: r.pts[i + 1], r: 0.14 });
    /* and the posts it stands on, at both ends (parkview draws them by the same rule): the ground up to the rail */
    for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) { const g = world.groundAt(p[0], p[1] - 0.05, p[2], 3); out.push({ kind: 'cap', a: [p[0], g ? g.point[1] : 0, p[2]], b: p, r: 0.12 }); }
  }
  for (const [x, z] of park.lamps) out.push({ kind: 'cyl', x, z, r: 0.16, y0: 0, y1: 6.3 });
  /* the trees' trunks and crowns and the planters' shrubs, from the shapes and the placing the view draws (trees.js) */
  for (const o of greenery(trees, world ? world.props.shrubs : [])) out.push(o);
  return out;
}
/* the first thing along a → b (its distance from a), or Infinity */
export function firstHit(world, occ, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz); if (L < 1e-6) return Infinity;
  const ux = dx / L, uy = dy / L, uz = dz / L;
  let best = Infinity;
  /* back faces count: a point of her inside something solid is hidden from every lens (a ray from inside leaves through a back face) */
  const h = world.bvh.raycast(a, [ux, uy, uz], L, true); if (h && h.t < best) best = h.t;
  for (const o of occ) {
    if (o.kind === 'cap') {
      /* the ray against a capsule: the nearest points of the two segments (t along the ray), closer than the radius */
      const ex = o.b[0] - o.a[0], ey = o.b[1] - o.a[1], ez = o.b[2] - o.a[2], wx = a[0] - o.a[0], wy = a[1] - o.a[1], wz = a[2] - o.a[2];
      const A = 1, Bv = ux * ex + uy * ey + uz * ez, Cv = ex * ex + ey * ey + ez * ez, D = ux * wx + uy * wy + uz * wz, E = ex * wx + ey * wy + ez * wz, den = A * Cv - Bv * Bv;
      let s = den > 1e-9 ? (Bv * E - Cv * D) / den : 0, q = den > 1e-9 ? (A * E - Bv * D) / den : (Cv > 0 ? E / Cv : 0);
      s = Math.max(0, Math.min(L, s)); q = Math.max(0, Math.min(1, (Bv * s + E) / (Cv || 1)));
      const px = a[0] + ux * s - (o.a[0] + ex * q), py = a[1] + uy * s - (o.a[1] + ey * q), pz = a[2] + uz * s - (o.a[2] + ez * q);
      if (px * px + py * py + pz * pz < o.r * o.r && s < best) best = Math.max(0, s - o.r);
      continue;
    }
    if (o.kind === 'cyl') {
      /* the ray against a vertical cylinder, then the height of the hit */
      const ox = a[0] - o.x, oz = a[2] - o.z, A = ux * ux + uz * uz; if (A < 1e-9) continue;
      const B = 2 * (ox * ux + oz * uz), C = ox * ox + oz * oz - o.r * o.r, disc = B * B - 4 * A * C; if (disc < 0) continue;
      const t = (-B - Math.sqrt(disc)) / (2 * A); if (t < 0 || t > L || t >= best) continue;
      const y = a[1] + uy * t; if (y >= o.y0 && y <= o.y1) best = t;
    } else {
      const ox = a[0] - o.x, oy = a[1] - o.y, oz = a[2] - o.z, B = ox * ux + oy * uy + oz * uz, C = ox * ox + oy * oy + oz * oz - o.r * o.r, disc = B * B - C; if (disc < 0) continue;
      const t = -B - Math.sqrt(disc); if (t >= 0 && t <= L && t < best) best = t;
    }
  }
  return best;
}
/* where the camera goes: the wanted place at `yaw` (radians, the way the camera looks), `back` from P and `up` above `baseY`, swung by the
   least that keeps her in sight — `opts.pts`, the points of her it is handed (her bones: view/skater.js bodyPoints), else a standing
   skater's head and feet over P; `keep` is the swing it has now (kept while it still works). Returns { pos, swing, clear, pulled } */
const SWINGS = [0, 25, -25, 50, -50, 75, -75, 105, -105, 140, -140, 180];
/* how far along the line from her to the wanted place a pulled-in camera may stand, the farthest first (never nearer than the old floor) */
const PULL = [0.8, 0.6, 0.45, 0.3];
export function solveView(world, occ, P, yaw, back, up, keep = 0, opts = {}) {
  const pts = opts.pts || [[P[0], P[1] + 1.55, P[2]], [P[0], P[1] + 0.25, P[2]]], look = [P[0], P[1] + (opts.lookUp == null ? 0.55 : opts.lookUp), P[2]];
  const baseY = opts.baseY == null ? P[1] : opts.baseY, at = (sw) => { const a = yaw + sw * DEG; return [P[0] - Math.sin(a) * back, baseY + up, P[2] - Math.cos(a) * back]; };
  /* a camera hanging over a drop well below the ground it follows (in the air, the ground she left — not her) */
  const over = (c) => { const g = world.groundAt(c[0], baseY + 2.5, c[2], 8); return g ? baseY - g.point[1] : 99; };
  const sight = (c) => pts.every((q) => firstHit(world, occ, q, c) === Infinity) && firstHit(world, occ, look, c) === Infinity;
  const clear = (c) => inWorld(c) && sight(c) && over(c) < 1.4;
  const order = [keep, ...SWINGS.filter((s) => s !== keep).sort((x, y) => Math.abs(x) - Math.abs(y))];
  /* prefer no swing when it is clear; else keep the swing we have; else the smallest that clears */
  if (keep !== 0 && clear(at(0))) return { pos: at(0), swing: 0, clear: true, pulled: false };
  for (const sw of order) { const c = at(sw); if (clear(c)) return { pos: c, swing: sw, clear: true, pulled: false }; }
  for (const sw of order) { const c = at(sw); if (inWorld(c) && sight(c)) return { pos: c, swing: sw, clear: true, pulled: false, overDrop: true }; }
  /* nothing clears at its distance: the camera comes in toward her along a line to the farthest place on it that sees all of her — the
     farthest first, then the least swing (10-17: pulled in along the unswung line to just short of what the middle of her alone meets, the
     place it chose was blocked from her chest, hips and feet over the Deck Quarter for two frames — and the eased camera, which cuts only to
     a place that sees her, stayed behind the lip) */
  for (const k of PULL) for (const sw of order) { const c = at(sw), q = [look[0] + (c[0] - look[0]) * k, look[1] + (c[1] - look[1]) * k, look[2] + (c[2] - look[2]) * k]; if (inWorld(q) && sight(q)) return { pos: q, swing: sw, clear: true, pulled: true }; }
  /* nothing sees her from anywhere it may stand (a point of her inside a surface): pull in along the wanted line to just short of the first
     thing on it */
  const c = at(0), L = Math.hypot(c[0] - look[0], c[1] - look[1], c[2] - look[2]), u = [(c[0] - look[0]) / L, (c[1] - look[1]) / L, (c[2] - look[2]) / L];
  const t = Math.min(firstHit(world, occ, look, c), worldReach(look, u) + 0.3), k = Math.min(1, Math.max(0.25, (t - 0.3) / L));   // never past the place it wanted
  return { pos: [look[0] + (c[0] - look[0]) * k, look[1] + (c[1] - look[1]) * k, look[2] + (c[2] - look[2]) * k], swing: 0, clear: false, pulled: true };
}

/* is a point of something drawn known to this rule: on (or within `slack` of) the park's own surfaces, or inside one of the dressing's
   shapes — what the census of drawn things asks of every point it samples (tests/drive/census.mjs, through __wl.debug.covered) */
export function covered(world, occ, p, slack = 0.06) {
  let near = false; world.bvh.sphere(p, slack, () => { near = true; }); if (near) return true;
  for (const o of occ) {
    if (o.kind === 'cyl') { if (p[1] >= o.y0 - slack && p[1] <= o.y1 + slack && Math.hypot(p[0] - o.x, p[2] - o.z) <= o.r + slack) return true; }
    else if (o.kind === 'sph') { if (Math.hypot(p[0] - o.x, p[1] - o.y, p[2] - o.z) <= o.r + slack) return true; }
    else {
      const ex = o.b[0] - o.a[0], ey = o.b[1] - o.a[1], ez = o.b[2] - o.a[2], L2 = ex * ex + ey * ey + ez * ez;
      const q = L2 > 0 ? Math.max(0, Math.min(1, ((p[0] - o.a[0]) * ex + (p[1] - o.a[1]) * ey + (p[2] - o.a[2]) * ez) / L2)) : 0;
      if (Math.hypot(p[0] - o.a[0] - ex * q, p[1] - o.a[1] - ey * q, p[2] - o.a[2] - ez * q) <= o.r + slack) return true;
    }
  }
  return false;
}
/* the census's ground: the camera's world (the fence's footprint), at every height a lens or a line to her can reach */
export const CENSUS_BOX = { x0: F.x0, x1: F.x1, z0: F.z0, z1: F.z1, y0: -2.5, y1: 7.5 };
/* the fence of the park the camera is in (a camera made for a world sets it: camera.js), and the census's ground with it; the census reaches
   from below the lowest floor a park has to above its highest level */
export function fenceFor(park) {
  F = fenceOf(park); const ys = park.ground.map((g) => g.y), lo = Math.min(-2.5, Math.min(...ys) - 2.5), hi = Math.max(7.5, Math.max(...ys) + 7.5);
  Object.assign(CENSUS_BOX, { x0: F.x0, x1: F.x1, z0: F.z0, z1: F.z1, y0: lo, y1: hi });
}
