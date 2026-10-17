/* THE CAMERA: a filmer low behind the line (or a higher view), following where the board is going, not where it points; in an air out of
 * a ramp it holds its heading instead of whipping round; a drag looks around and the view eases back. SHE STAYS IN THE PICTURE, whatever
 * she is doing — rolling, in the air, falling: the camera is handed the points of her the page draws (skater.js bodyPoints, her bones),
 * stands back from the middle of them where the lines to her head, chest, hips and feet are clear (sightline.js), cuts to that place when
 * the eased camera has something in front of her, and once the picture is framed turns it — stepping back first if she is bigger than it —
 * until every point of her is inside the safe frame. */
import * as THREE from '../../vendor/three/build/three.module.min.js';
import { CAMERA, INPUT } from '../config.js';
import { occluders, solveView, firstHit, worldReach, fenceFor } from './sightline.js';
import { ease, first } from '../formulas/follow.js';

/* the frame she is kept in, in the picture's own measure (−1 … 1 across and up): a margin at the sides and the foot, and under the HUD's
   top band (the combo, what it banks, the gaps: view/hud.js) — deeper turned, where that band is a larger share of the height */
export const SAFE = { x: 0.86, bottom: -0.86, top: (aspect) => (aspect < 1 ? 0.7 : 0.56) };
/* which of her points (bodyPoints' order: the top of her head, head, chest, hips, two hands, two feet) must be in clear sight */
export const SEEN = [1, 2, 3, 6, 7];
const NAMES = ['the top of her head', 'head', 'chest', 'hips', 'left hand', 'right hand', 'left foot', 'right foot'];
const DEG = Math.PI / 180, V = new THREE.Vector3(), W = new THREE.Vector3();
/* how she is framed in a drawn picture: how far the worst point of her is past the safe frame (≤ 0: inside), which of the points that must
   be seen have something between them and the lens (`hidden`: the camera's to answer), and which are themselves inside a surface — the lens
   meets that surface within 12 cm of the point (`inside`: a body clipping into the park, not the camera's) — one reading for the
   moving-state test and the page's own probe (__wl.debug.framed) */
export function framed(camera, body, world, occ) {
  camera.updateMatrixWorld(true);
  const inv = camera.matrixWorldInverse, top = SAFE.top(camera.aspect); let past = -Infinity;
  for (const q of body) {
    V.copy(q).applyMatrix4(inv); if (-V.z < 0.08) { past = Math.max(past, 9); continue; }
    V.copy(q).project(camera); past = Math.max(past, Math.abs(V.x) - SAFE.x, V.y - top, SAFE.bottom - V.y);
  }
  const eye = camera.position.toArray(), hidden = [], inside = [];
  for (const i of SEEN) {
    const q = [body[i].x, body[i].y, body[i].z]; if (firstHit(world, occ, q, eye) === Infinity) continue;
    const L = Math.hypot(q[0] - eye[0], q[1] - eye[1], q[2] - eye[2]); (firstHit(world, occ, eye, q) >= L - 0.12 ? inside : hidden).push(NAMES[i]);
  }
  return { past, hidden, inside };
}

export class Follow {
  constructor(stage, world) {
    this.stage = stage; this.world = world; this.mode = 'filmer';
    fenceFor(world.data); this.occ = occluders(undefined, undefined, world); this.swing = 0; this.view = null;
    this.yaw = 0; this.pos = new THREE.Vector3(); this.look = new THREE.Vector3(); this.lookYaw = 0; this.lookPitch = 0; this.lookAt0 = 0; this.ready = false; this.h = 0;
  }
  drag(dx, dy) { const L = INPUT.look, k = L.perPx; this.lookYaw = THREE.MathUtils.clamp(this.lookYaw - dx * k, -L.yaw * Math.PI / 180, L.yaw * Math.PI / 180); this.lookPitch = THREE.MathUtils.clamp(this.lookPitch + dy * k, L.pitch[0] * Math.PI / 180, L.pitch[1] * Math.PI / 180); this.lookAt0 = performance.now(); }
  update(dt, s, opts = {}) {
    const C = CAMERA[opts.bail ? 'bail' : this.mode], cam = this.stage.camera, body = opts.body || null; this.cut = false; this.fresh = false; this.wantDist = 0;
    const p = new THREE.Vector3(...s.p);
    /* the heading to follow: the line of travel when it is clear (fast enough, not straight up a wall), else what it was */
    const vh = Math.hypot(s.v[0], s.v[2]);
    if (vh > 1.2 && s.state !== 'bail' && !(s.state === 'air' && Math.abs(s.v[1]) > vh * 1.4)) {
      const want = Math.atan2(s.v[0], s.v[2]); let d = want - this.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      this.yaw += d * ease(dt, C.yawLag);
    } else if (!this.ready) this.yaw = Math.atan2(s.fwd[0], s.fwd[2]);
    /* looking: a drag turns the view; let go and it comes back (sooner at speed) */
    const L = INPUT.look, since = (performance.now() - this.lookAt0) / 1000;
    if (since > 0.15) { const back = vh > 3 ? L.backFast : L.back; const f = ease(dt, back); this.lookYaw -= this.lookYaw * f; this.lookPitch -= this.lookPitch * f; }
    const yaw = this.yaw + this.lookYaw;
    /* the height to frame: smoothed so the camera does not bounce with every pop */
    const ground = s.state === 'air' ? Math.min(p.y, this.h + 0.0) : p.y;
    this.h = first(s.state === 'air' ? 0.45 : 0.12, this.h, ground, dt);
    if (!this.ready) this.h = p.y;
    const upright = cam.aspect < 1;
    const back = C.back * (upright ? 1.18 : 1), up = C.up * (upright ? 1.35 : 1) + this.lookPitch * 1.6;
    /* the middle of her, which the camera stands back from: her bones' when it has them (in an air out of a ramp her body lies out over the
       flat, toward the lens), else the board's */
    let mx = p.x, mz = p.z;
    if (body) { mx = 0; mz = 0; for (const q of body) { mx += q.x; mz += q.z; } mx /= body.length; mz /= body.length; }
    const target = new THREE.Vector3(mx, Math.max(p.y, this.h) + C.lookUp, mz);
    const seen = body ? SEEN.map((i) => [body[i].x, body[i].y, body[i].z]) : null;
    /* where the camera may stand: she stays in sight (sightline.js — the park, the fence, the rails, the lamp posts and the trees all count) */
    const v = solveView(this.world, this.occ, [mx, p.y, mz], yaw, back * Math.cos(this.lookPitch), up, this.swing, { baseY: this.h, lookUp: C.lookUp, pts: seen });
    const turned = Math.abs(v.swing - this.swing) >= 75; this.swing = v.swing; this.view = v;
    const want = new THREE.Vector3(v.pos[0], v.pos[1], v.pos[2]);
    const g = this.world.groundAt(want.x, want.y + 0.5, want.z, 3); if (g && want.y < g.point[1] + 0.25) want.y = g.point[1] + 0.25;
    if (!this.ready || opts.snap) { this.pos.copy(want); this.look.copy(target); this.ready = true; this.fresh = true; }
    this.wantDist = Math.hypot(back, up);
    const f = ease(dt, C.lag);
    /* a little of the way ahead is in the picture — as much as she is going somewhere and the camera is behind her */
    const lead = 1.2 * Math.max(0, Math.cos(this.swing * DEG)) * Math.min(1, vh / 4);
    this.pos.lerp(want, f); this.look.lerp(target.clone().addScaledVector(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), lead), ease(dt, C.lag / 1.4));   // (it was the position's share × 1.4: a different path at every frame rate — tests/formulas.mjs)
    /* something between the eased camera and her that the place it wants is clear of: a cut to that place (a place pulled in toward her
       that sees her too: sightline.js) */
    if (seen && v.clear && seen.some((q) => firstHit(this.world, this.occ, q, [this.pos.x, this.pos.y, this.pos.z]) !== Infinity)) { this.pos.copy(want); this.cut = true; }
    /* a change of side (the view swung 75° or more round her): a cut to the new place, which is clear, rather than a whip round her */
    else if (turned && v.clear && !this.fresh) { this.pos.copy(want); this.look.copy(target).addScaledVector(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), lead); this.cut = true; }
    cam.position.copy(this.pos); cam.lookAt(this.look);
    const fov = upright ? C.uprightFov : C.fov; if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    /* while the player is looking around (a drag), the picture is theirs: the frame is held again as the look eases back */
    if (body && Math.abs(this.lookYaw) < 0.04 && Math.abs(this.lookPitch) < 0.04) this.frameBody(body, Math.hypot(back, up));
    return target;
  }
  /* every point of her inside SAFE before the picture is drawn. In the camera's own measure (the tangent of the angle off its axis, so a
     turn is exact), the box her points make is compared with the safe frame: too big, and the camera steps back along the line from her
     middle (never through anything: firstHit), and as a last resort the lens widens; outside, and the view turns by the least that brings
     it in. What it changes, it keeps (the eased camera goes on from the corrected picture). */
  frameBody(body, dist = 4) {
    const cam = this.stage.camera, base = cam.fov; let faced = false;
    for (let it = 0; it < 6; it++) {
      cam.updateMatrixWorld(true);
      const ty = Math.tan(cam.fov * DEG / 2), tx = ty * cam.aspect, inv = cam.matrixWorldInverse, top = SAFE.top(cam.aspect);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, near = Infinity, mx = 0, my = 0, mz = 0;
      for (const q of body) {
        V.copy(q).applyMatrix4(inv); const d = -V.z; near = Math.min(near, d); mx += q.x; my += q.y; mz += q.z;
        const dd = Math.max(d, 0.05), ax = V.x / dd, ay = V.y / dd;
        if (ax < x0) x0 = ax; if (ax > x1) x1 = ax; if (ay < y0) y0 = ay; if (ay > y1) y1 = ay;
      }
      const sx = SAFE.x * tx, st = top * ty, sb = SAFE.bottom * ty;
      if (near > 0.3 && x0 >= -sx && x1 <= sx && y0 >= sb && y1 <= st) return;
      /* something of her at or behind the lens: first the view faces the middle of her (stepping back from a view that faces away gains nothing) */
      if (near <= 0.3 && !faced) { this.look.set(mx / body.length, my / body.length, mz / body.length); cam.lookAt(this.look); faced = true; continue; }
      const need = Math.max((x1 - x0) / (2 * sx), (y1 - y0) / (st - sb));
      if (need > 0.97 || near <= 0.3) {
        /* bigger than the frame (or behind the lens): back along the line from her middle, as far as the park allows */
        const mid = [mx / body.length, my / body.length, mz / body.length], D = cam.position.distanceTo(V.set(...mid));
        const wantD = D * Math.max(need, 1) * 1.08 + (near <= 0.3 ? 0.6 : 0.05);
        W.copy(cam.position).sub(V).normalize();
        /* as far as the park and the fence allow, and never more than 2.4 times the camera's own distance (the frame is never chased off) */
        const hit = Math.min(firstHit(this.world, this.occ, mid, [mid[0] + W.x * wantD, mid[1] + W.y * wantD, mid[2] + W.z * wantD]), worldReach(mid, [W.x, W.y, W.z]) + 0.3), D2 = Math.min(wantD, hit - 0.3, dist * 2.4);
        if (D2 > D + 0.02) { cam.position.copy(V).addScaledVector(W, D2); this.pos.copy(cam.position); cam.lookAt(this.look); continue; }
        /* nowhere further to stand: the lens widens, as far as 14° */
        if (cam.fov < base + 14) { cam.fov = Math.min(base + 14, 2 * Math.atan(ty * Math.max(need, 1) * 1.05) / DEG); cam.updateProjectionMatrix(); continue; }
      }
      /* outside: the view turns toward her by the least that brings the box in */
      const dx = x0 < -sx ? x0 + sx : x1 > sx ? x1 - sx : 0, dy = y0 < sb ? y0 - sb : y1 > st ? y1 - st : 0;
      if (!dx && !dy) return;
      W.set(dx, dy, -1).normalize().transformDirection(cam.matrixWorld);
      const Ld = Math.max(1, cam.position.distanceTo(this.look));
      this.look.copy(cam.position).addScaledVector(W, Ld); cam.lookAt(this.look);
    }
  }
}
