/* THE FLICK READER (DESIGN.md §3): one stroke of one finger on the flick pad, sample by sample, becomes a pop, a trick with two grades,
 * a manual, a grab, a revert swipe or a balance offset. No DOM: the page feeds it samples; Node tests feed it synthetic thumbs.
 * Screen space: x right, y down, CSS px; a direction in degrees is 0 = up the screen, -90 = left, +90 = right. */
import { INPUT, TRICKS } from '../config.js';

const R = INPUT.reader;
export const dirOf = (dx, dy) => Math.atan2(dx, -dy) * 180 / Math.PI;
const wrap = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };

/* ---------------- the templates: each trick's stroke, resampled and scaled to length 1 ---------------- */
export function resample(pts, n) {
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const step = L / (n - 1), out = [{ x: pts[0].x, y: pts[0].y }]; let acc = 0, prev = { x: pts[0].x, y: pts[0].y };
  for (let i = 1; i < pts.length && out.length < n; i++) {
    const cur = pts[i]; let d = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    while (acc + d >= step && out.length < n && d > 0) { const f = (step - acc) / d, q = { x: prev.x + f * (cur.x - prev.x), y: prev.y + f * (cur.y - prev.y) }; out.push(q); prev = q; d = Math.hypot(cur.x - prev.x, cur.y - prev.y); acc = 0; }
    acc += d; prev = cur;
  }
  while (out.length < n) out.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
  const o = out[0]; return { pts: out.map((q) => ({ x: (q.x - o.x) / (L || 1), y: (q.y - o.y) / (L || 1) })), L };
}
export function strokeOf(st, len = 1, n = 60) {
  const from = st.kind === 'line' ? st.dir : st.from, to = st.kind === 'line' ? st.dir : st.kind === 'curve' ? st.to : st.from + st.turn;
  const pts = [{ x: 0, y: 0 }]; let x = 0, y = 0;
  for (let k = 1; k <= n; k++) { const a = (from + (to - from) * (k - 0.5) / n) * Math.PI / 180; x += Math.sin(a) * len / n; y -= Math.cos(a) * len / n; pts.push({ x, y }); }
  return pts;
}
const TEMPLATES = TRICKS.flips.map((f) => ({ name: f.name, straight: f.stroke.kind === 'line', pts: resample(strokeOf(f.stroke), R.points).pts }));
const distance = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y); return d / a.length; };
/* the nearest template; a curved or looped trick wins only by a margin over the best straight one (a harder trick must be drawn clearly) */
export function classify(stroke, margin = R.margin) {
  let best = null, bestStraight = null;
  for (const t of TEMPLATES) { const d = distance(stroke, t.pts); if (!best || d < best.d) best = { name: t.name, d, straight: t.straight }; if (t.straight && (!bestStraight || d < bestStraight.d)) bestStraight = { name: t.name, d, straight: true }; }
  return !best.straight && bestStraight && bestStraight.d - best.d < margin ? bestStraight : best;
}
const gradeOf = (x, cuts, invert) => { let g = 1; for (let i = 0; i < cuts.length; i++) if (invert ? x <= cuts[cuts.length - 1 - i] : x >= cuts[i]) g = i + 2; return Math.min(5, g); };

/* ---------------- the reader ---------------- */
export class Reader {
  constructor(opts = {}) {
    this.streamlined = opts.streamlined !== false;
    this.scale = 1.5 - 0.9 * ((opts.sensitivity == null ? 50 : opts.sensitivity) / 100);   // 50 → ×1.05 ≈ 1; 100 → ×0.6; 0 → ×1.5
    this.scale = Math.abs(this.scale - 1.05) < 0.06 ? 1 : this.scale;
    this.out = []; this.p = null; this.gesture = 0; this.hold = null; this.context = () => 'ground';
    this.record = null;          // when the player switches on "record my flicks": every stroke, time and x/y only
  }
  drain() { const o = this.out; this.out = []; return o; }
  down(t, x, y) {
    this.gesture++;
    this.p = { id: this.gesture, o: { t, x, y }, E: { t, x, y }, deep: 0, sign: 0, left: false, popped: null, samples: [{ t, x, y }], last: { t, x, y }, stillSince: t, manual: false, grab: false, lip: false, maxV: 0, swiped: false, done: false };
    if (this.record) this.record.push({ g: this.p.id, s: [[0, 0, 0]] , t0: t });
    this.hold = { x: 0, y: 0 };
  }
  move(t, x, y) {
    const p = this.p; if (!p) return;
    const prev = p.last, dtm = Math.max(0.5, t - prev.t), v = Math.hypot(x - prev.x, y - prev.y) / dtm;
    p.samples.push({ t, x, y }); if (p.samples.length > 400) p.samples.shift();
    p.last = { t, x, y }; if (v > p.maxV) p.maxV = v;
    if (this.record) { const r = this.record[this.record.length - 1]; if (r && r.g === p.id) r.s.push([+(t - r.t0).toFixed(1), +(x - p.o.x).toFixed(1), +(y - p.o.y).toFixed(1)]); }
    const S = this.scale, dx = x - p.o.x, dy = y - p.o.y;
    this.hold = { x: dx / 70, y: dy / 70 };
    if (v > R.manualStill) p.stillSince = t;
    if (!p.popped) {
      /* the load: down (a tail) or up (a nose); its point follows the thumb deeper and freezes once the thumb leaves it */
      if (!p.sign && Math.abs(dy) >= R.load * S && Math.abs(dy) > Math.abs(dx)) p.sign = dy > 0 ? 1 : -1;
      if (p.sign) {
        const depth = dy * p.sign;
        const ax = x - p.E.x, ay = y - p.E.y, rel = Math.abs(wrap(dirOf(ax, ay * p.sign)));   // 0 = straight back the way of the release
        if (!p.left && Math.hypot(ax, ay) >= R.freeze && rel <= R.cone) p.left = true;
        if (!p.left && depth > p.deep) { p.deep = depth; p.E = { t, x, y }; }
      }
      /* the pop: leaving the load (or, under Cruise, the thumb's own landing point) fast, in any direction short of back down */
      const E = p.sign ? p.E : p.o, ex = x - E.x, ey = y - E.y, away = Math.hypot(ex, ey), sgn = p.sign || 1, rel = Math.abs(wrap(dirOf(ex, ey * sgn)));
      const need = Math.max(R.popMin * S, R.popFrac * p.deep);
      const loaded = p.sign && p.deep >= R.load * S;
      const popCtx = this.context();
      if (popCtx !== 'air' && (loaded || this.streamlined) && away >= need && rel <= R.cone && v >= R.popSpeed) {
        const ctx = popCtx;
        /* a fast sideways stroke with no load, just after a landing on a ramp, may be a revert: the skater decides */
        if (!loaded && Math.abs(Math.abs(dirOf(ex, ey)) - 90) <= 35) this.out.push({ type: 'swipe', side: ex > 0 ? 1 : -1, gesture: p.id });
        p.popped = { t, E, ctx, nollie: p.sign < 0 };
        this.out.push({ type: 'pop', gesture: p.id, t, nollie: p.sign < 0, load: loaded ? Math.min(1, p.deep / (70 * S)) : 0, spd: gradeOf(p.maxV / S, R.speed) });
        if (p.manual) { this.out.push({ type: 'manual', on: false }); p.manual = false; }
      }
      if (!p.popped) this.holds(t);
    }
    if (p.popped && !p.done && t - p.popped.t >= R.shapeMs) this.finish(t);
  }
  /* holds: a light pull held still is a manual on the ground; a drag held in the air is a grab; any hold reaching a coping is a lip.
     Judged by TIME as well as by movement: a thumb held perfectly still sends no moves, so the page ticks the reader every frame. */
  holds(t) {
    const p = this.p; if (!p || p.popped) return;
    const S = this.scale, dx = p.last.x - p.o.x, dy = p.last.y - p.o.y, ctx = this.context(), held = t - p.stillSince;
    if (ctx === 'ground' && !p.manual && p.sign && held >= R.manualMs && p.deep >= R.manual[0] * S && p.deep <= R.manual[1] * S * 1.6) { p.manual = true; this.out.push({ type: 'manual', on: true, nose: p.sign < 0 }); }
    if (ctx === 'air' && !p.grab && Math.hypot(dx, dy) >= R.grab * S && held >= R.grabMs) { p.grab = true; this.out.push({ type: 'grab', on: true, dir: dirOf(dx, dy) }); }
    if (!p.lip && (ctx === 'ground' || ctx === 'manual') && held >= 40) { p.lip = true; this.out.push({ type: 'lipHold', on: true, dir: Math.hypot(dx, dy) > 12 ? dirOf(dx, dy) : 0 }); }
  }
  tick(t) { if (this.p && !this.p.popped && !this.p.done) this.holds(t); }
  up(t, x, y) {
    const p = this.p; if (!p) return;
    if (x != null) this.move(t, x, y);
    if (!p.popped && this.streamlined === false && p.sign && p.deep >= R.load) { /* released during the up-stroke before the pop line: a pop on release if it was fast */
      const E = p.E, ex = p.last.x - E.x, ey = p.last.y - E.y; if (p.maxV >= R.popSpeed && Math.hypot(ex, ey) >= R.popMin * this.scale * 0.6) { p.popped = { t, E, nollie: p.sign < 0 }; this.out.push({ type: 'pop', gesture: p.id, t, nollie: p.sign < 0, load: Math.min(1, p.deep / 70), spd: gradeOf(p.maxV / this.scale, R.speed) }); }
    }
    if (p.popped && !p.done) this.finish(t);
    if (p.popped && t - p.stillSince >= TRICKS.specials.heldMs) this.out.push({ type: 'special', gesture: p.id });
    if (p.manual) this.out.push({ type: 'manual', on: false });
    if (p.grab) this.out.push({ type: 'grab', on: false });
    if (p.lip) this.out.push({ type: 'lipHold', on: false });
    if (!p.popped && !p.manual && !p.grab && t - p.o.t < 220 && Math.hypot(p.last.x - p.o.x, p.last.y - p.o.y) < 12) this.out.push({ type: 'tap' });
    this.p = null; this.hold = null;
  }
  /* the stroke from where the thumb left the load to its end, read against the templates */
  finish(t) {
    const p = this.p; p.done = true;
    const E = p.popped.E; let i0 = p.samples.findIndex((s) => s.t >= E.t); if (i0 < 0) i0 = 0;
    for (let i = i0; i < p.samples.length - 1; i++) { if (Math.hypot(p.samples[i].x - E.x, p.samples[i].y - E.y) < 3) i0 = i; else break; }
    let pts = p.samples.slice(i0).filter((s) => s.t <= p.popped.t + R.shapeMs);
    if (p.popped.nollie) pts = pts.map((s) => ({ t: s.t, x: s.x, y: 2 * E.y - s.y }));   // a nollie's stroke is read the right way up
    if (pts.length < 3) { this.out.push({ type: 'trick', gesture: p.id, name: 'Ollie', acc: 3, spd: gradeOf(p.maxV / this.scale, R.speed), d: 0 }); return; }
    const rs = resample(pts, R.points), c = classify(rs.pts);
    this.out.push({ type: 'trick', gesture: p.id, name: c.name, acc: gradeOf(c.d, R.accuracy, true), spd: gradeOf(p.maxV / this.scale, R.speed), d: +c.d.toFixed(4), len: Math.round(rs.L) });
  }
}
