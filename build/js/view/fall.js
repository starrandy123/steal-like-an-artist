/* THE FALL (the view's bail): she goes down the way there is room for a body — her line if it is open, else back off what she hit, else to
 * a side — slides to a stop short of anything standing, drops to the ground if she fell from the air, and lies where the camera can see her.
 * Pure (arrays): view/figure.js turns the rig with it, and tests/camera_moving.mjs reads her bones from that rig. */
import { PHYSICS } from '../config.js';
import { ease } from '../formulas/follow.js';

const LEN = 1.75, TIP = 1.45, TIME = 0.5;
const ray = (world, from, d, len) => { const h = world.bvh.raycast(from, d, len); return h ? h.t : Infinity; };
const groundY = (world, p) => { const g = world.groundAt(p[0], p[1] + 0.6, p[2], 8); return g ? g.point[1] : p[1]; };
/* the way to fall: the first direction (her line, back, the sides, the diagonals) with a body's length of room at her knees and her hips,
   measured from the ground under her */
export function chooseFall(world, pos, vel) {
  const sp = Math.hypot(vel[0], vel[2]), f = sp > 0.2 ? [vel[0] / sp, 0, vel[2] / sp] : [1, 0, 0], base = groundY(world, pos);
  const turn = (a) => [f[0] * Math.cos(a) - f[2] * Math.sin(a), 0, f[0] * Math.sin(a) + f[2] * Math.cos(a)];
  const tries = [0, Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI * 0.75, -Math.PI * 0.75, Math.PI / 4, -Math.PI / 4].map(turn);
  let best = tries[0], bestRoom = -1;
  for (const d of tries) {
    const room = Math.min(ray(world, [pos[0], base + 0.85, pos[2]], d, LEN + 0.4), ray(world, [pos[0], base + 0.35, pos[2]], d, LEN + 0.4));
    if (room > LEN + 0.3) { best = d; bestRoom = room; break; }
    if (room > bestRoom) { bestRoom = room; best = d; }
  }
  const forward = best === tries[0], k = Math.min(sp, 5) * (forward ? 0.6 : 0.25);
  return { dir: best, slide: [best[0] * k, 0, best[2] * k], t: 0, pos: pos.slice(), vy: Math.min(0, vel[1] || 0) };
}
/* one step: the slide slows and stops at anything in the way (her feet's height and, once she is down, her head's reach), she falls to the
   ground under her, and tips toward `dir`. Returns how far over she is (radians) and how far through the fall (0…1). */
export function stepFall(world, f, dt) {
  f.t += dt;
  const k = 1 - ease(dt, 0.4);   // the slide dies away at 2.5/s (formulas/follow.js) f.slide[0] *= k; f.slide[2] *= k;
  const sp = Math.hypot(f.slide[0], f.slide[2]), down = Math.min(1, f.t / TIME);
  if (sp > 0.02) {
    const d = [f.slide[0] / sp, 0, f.slide[2] / sp], reach = sp * dt + 0.35 + Math.max(0, d[0] * f.dir[0] + d[2] * f.dir[2]) * LEN * down;
    const room = Math.min(ray(world, [f.pos[0], f.pos[1] + 0.3, f.pos[2]], d, reach), ray(world, [f.pos[0], f.pos[1] + 0.8, f.pos[2]], d, reach));
    if (room < reach) { f.slide[0] = 0; f.slide[2] = 0; } else { f.pos[0] += f.slide[0] * dt; f.pos[2] += f.slide[2] * dt; }
  }
  f.vy -= PHYSICS.gAir * dt; f.pos[1] += f.vy * dt;
  const gy = groundY(world, [f.pos[0], Math.max(f.pos[1], f.pos[1] - f.vy * dt), f.pos[2]]);
  if (f.pos[1] <= gy) { f.pos[1] = gy; f.vy = 0; }
  return { angle: down * TIP, k: down };
}
