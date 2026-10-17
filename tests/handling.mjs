/* HANDLING (DESIGN.md §1 row 3, §4.2): pushing from rest reaches 4.5 m/s in ≤ 2.2 s; a full carve turns on a ≈ 3.1 m radius at 5 m/s and
 * ≈ 1.0 m at walking pace (±20 %); the board coasts and brakes like a board (a foot brake stops 5 m/s inside 6 m); rolling into the East
 * Wall at 8 m/s carries the board over its coping (the transitions keep speed); a held line stays straight. All on the real park. */
import { rig } from './lib/rig.mjs';
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const speed = (R) => Math.hypot(R.sk.v[0], R.sk.v[2]);
{ const R = rig({ at: [18, 0, 8], heading: 90, speed: 0 }); R.throttle = 1; let t = null; for (let i = 0; i < 600; i++) { R.step(1); if (t == null && speed(R) >= 4.5) { t = R.ms / 1000; break; } }
  ok(t != null && t <= 2.2, 'push from rest to 4.5 m/s: ' + (t == null ? 'never' : t.toFixed(2) + ' s') + ' (≤ 2.2)'); }
const radius = (v0) => {
  const R = rig({ at: [20, 0, 14], heading: 0, speed: v0 }); R.steer = 1; R.secs(0.45);
  const a = Math.atan2(R.sk.fwd[0], R.sk.fwd[2]), v = speed(R); R.secs(0.35); let b = Math.atan2(R.sk.fwd[0], R.sk.fwd[2]), d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  return { r: (speed(R) + v) / 2 / Math.abs(d / 0.35), state: R.sk.state };
};
{ const f = radius(5.0); ok(f.state === 'roll' && f.r > 3.1 * 0.8 && f.r < 3.1 * 1.2, 'a full carve at 5 m/s: radius ' + f.r.toFixed(2) + ' m (≈ 3.1)'); }
{ const f = radius(1.4); ok(f.state === 'roll' && f.r > 1.0 * 0.8 && f.r < 1.0 * 1.2, 'a full carve at walking pace (1.4 m/s): radius ' + f.r.toFixed(2) + ' m (≈ 1.0)'); }
{ const R = rig({ at: [18, 0, 8], heading: 90, speed: 5 }); const x0 = R.sk.p[0]; R.throttle = -1; R.until(() => speed(R) < 0.2, 8);
  const d = R.sk.p[0] - x0; ok(d < 6, 'a foot brake from 5 m/s stops in ' + d.toFixed(2) + ' m (< 6)'); }
{ const R = rig({ at: [18, 0, 8], heading: 90, speed: 5 }); R.secs(2); const v = speed(R), z = R.sk.p[2];
  ok(v > 4.0 && v < 5 && Math.abs(z - 8) < 0.05, 'coasting 2 s from 5 m/s: ' + v.toFixed(2) + ' m/s left, the line held (z ' + z.toFixed(3) + ')'); }
{ const R = rig({ at: [42, 0, 22], heading: 90, speed: 8 }); let top = 0; for (let i = 0; i < 500; i++) { R.step(1); top = Math.max(top, R.sk.p[1]); }
  ok(top > 1.83 + 0.3 && R.says('bail').length === 0, 'into the East Wall at 8 m/s: up to ' + top.toFixed(2) + ' m (the coping is 1.83), landed back in, no bail'); }
/* a line up a quarter pipe that is not square to it still leaves the lip: 12° off square at 9 m/s, both ways along the East Wall (three wheels
   on the transition and one past the coping once held the board under the lip and ate the climb) */
for (const h of [78, 102]) { const R = rig({ at: [50.5, 0, h < 90 ? 12 : 20], heading: h, speed: 9 }); let top = 0, airs = 0; for (let i = 0; i < 300; i++) { R.step(1); top = Math.max(top, R.sk.p[1]); } airs = R.says('takeoff').length;
  ok(top > 1.83 + 0.3 && airs >= 1, 'a slanted line into the East Wall (' + h + '°, 9 m/s) leaves the lip: up to ' + top.toFixed(2) + ' m, ' + airs + ' takeoff'); }
console.log(fail ? 'HANDLING: RED' : 'HANDLING: GREEN'); process.exit(fail ? 1 : 0);
