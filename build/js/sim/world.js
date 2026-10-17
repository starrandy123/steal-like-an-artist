/* THE WORLD THE SKATER IS IN: the park built from its data, the tree that answers "what is under this wheel", a grid of the grindable
 * lines by the square metre, the copings, and where a bailed skater may stand up again. Shared by the sim, the view and the tests. */
import { buildPark } from './park.js';
import { BVH } from './bvh.js';
import { PARK, TREES } from '../config.js';

export class World {
  constructor(park = PARK, trees = TREES) {
    this.data = park; this.trees = trees;
    const built = buildPark(park);
    this.geo = built.geo; this.rails = built.rails; this.lips = built.lips; this.props = built.props; this.problems = built.problems;
    this.bvh = new BVH(built.col);
    /* rails by 2 m cell: every segment is listed in each cell its bounding box touches (padded) */
    this.cell = 2; this.grid = new Map();
    this.rails.forEach((r, ri) => {
      const n = r.loop ? r.pts.length - 1 : r.pts.length - 1;
      for (let i = 0; i < n; i++) {
        const a = r.pts[i], b = r.pts[i + 1], pad = 1.0;
        const x0 = Math.floor((Math.min(a[0], b[0]) - pad) / this.cell), x1 = Math.floor((Math.max(a[0], b[0]) + pad) / this.cell);
        const z0 = Math.floor((Math.min(a[2], b[2]) - pad) / this.cell), z1 = Math.floor((Math.max(a[2], b[2]) + pad) / this.cell);
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x + ',' + z; if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push([ri, i]); }
      }
    });
    this.railById = new Map(this.rails.map((r) => [r.id, r]));
  }
  /* the segments near a point: [railIndex, segmentIndex] pairs */
  railsNear(p) { return this.grid.get(Math.floor(p[0] / this.cell) + ',' + Math.floor(p[2] / this.cell)) || EMPTY; }
  /* the ground right under a point (a ray straight down from 0.5 m above it) */
  groundAt(x, y, z, reach = 3) { return this.bvh.raycast([x, y + 0.5, z], [0, -1, 0], reach + 0.5); }
  /* can a skater stand up here: flat-ish ground, clear of walls for 0.6 m, not down in a bowl */
  standable(x, y, z) {
    const h = this.groundAt(x, y + 0.6, z, 2.5);
    if (!h || h.normal[1] < 0.96 || h.point[1] < -0.05 || h.surf === 'fence') return null;
    let blocked = false;
    this.bvh.sphere([h.point[0], h.point[1] + 0.7, h.point[2]], 0.6, (tri) => { if (!blocked) { const f = this.bvh.faceNormal(tri, SCR); if (Math.abs(f[1]) < 0.7) blocked = true; } });
    return blocked ? null : h.point.slice();
  }
}
const EMPTY = [], SCR = [0, 0, 0];
