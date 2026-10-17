/* THE TWO THUMBS (DESIGN.md §2): the screen below the look band splits into a carve zone (left) and the flick pad (right). A finger belongs
 * to the zone it landed in for its whole touch (pointer capture), so a flick that runs up into the band is still a flick. The band itself
 * is the open screen: on a phone the port kit's look takes it (port.js); with a mouse, a drag there (or any right-button drag) looks.
 * Keys too: W/S push and brake, A/D carve, Space pops, and a letter picks the flip. */
import { INPUT } from '../config.js';
import { Reader } from './reader.js';
import { zoneRects, Owners } from './zones.js';

const TRICK_KEYS = { KeyJ: 'Kickflip', KeyL: 'Heelflip', KeyK: 'BS Pop Shove-it', KeyI: 'FS Pop Shove-it', KeyU: 'Varial Kickflip', KeyO: 'Varial Heelflip', KeyH: 'Hardflip', Semicolon: 'Inward Heelflip', KeyY: '360 Flip', KeyP: 'Laser Flip' };

export class Controls {
  constructor(host, opts = {}) {
    this.reader = new Reader(opts);
    this.keys = new Set(); this.events = []; this.pushTap = false; this.left = null; this.flickId = null; this.onLook = opts.onLook || (() => {}); this.onKey = opts.onKey || (() => {});
    this.enabled = false; this.sampleCount = 0; this.sampleSince = performance.now();
    const mk = (id, cls) => { const d = document.createElement('div'); d.id = id; d.className = cls; d.setAttribute('data-mosa-ui', ''); host.appendChild(d); return d; };
    this.carve = mk('wl-carve', 'wl-zone'); this.flick = mk('wl-flick', 'wl-zone');
    this.ring = document.createElement('div'); this.ring.className = 'wl-ring'; this.ring.innerHTML = '<i></i>'; this.carve.appendChild(this.ring);
    this.dot = document.createElement('div'); this.dot.className = 'wl-dot'; this.flick.appendChild(this.dot);
    const opt = { passive: false };
    /* the carve zone: a floating origin where the thumb lands */
    this.carve.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.left) return; e.preventDefault(); try { this.carve.setPointerCapture(e.pointerId); } catch (x) { /* a synthetic pointer */ }
      this.owners.land(e.pointerId, e.clientX, e.clientY);
      this.left = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), moved: 0 };
      this.ring.style.display = 'block'; this.placeRing();
    }, opt);
    this.carve.addEventListener('pointermove', (e) => {
      const L = this.left; if (!L || e.pointerId !== L.id || this.owners.at(e.pointerId, e.clientX, e.clientY) !== 'carve') return; e.preventDefault();
      L.moved += Math.hypot(e.clientX - L.x, e.clientY - L.y); L.x = e.clientX; L.y = e.clientY;
      const dx = L.x - L.ox, dy = L.y - L.oy, d = Math.hypot(dx, dy), R = INPUT.thumb.reanchor;
      if (d > R) { L.ox = L.x - dx / d * R; L.oy = L.y - dy / d * R; }
      this.placeRing();
    }, opt);
    const leftUp = (e) => {
      const L = this.left; if (!L || e.pointerId !== L.id) return; this.owners.lift(e.pointerId);
      if (performance.now() - L.t0 < INPUT.thumb.tapMs && L.moved < INPUT.thumb.tapPx) this.pushTap = true;
      this.left = null; this.ring.style.display = 'none';
    };
    this.carve.addEventListener('pointerup', leftUp); this.carve.addEventListener('pointercancel', leftUp);
    /* the flick pad: every sample the browser delivers, in order, with its own time */
    this.flick.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.flickId != null) return; e.preventDefault(); try { this.flick.setPointerCapture(e.pointerId); } catch (x) { /* a synthetic pointer */ }
      this.owners.land(e.pointerId, e.clientX, e.clientY);
      this.flickId = e.pointerId; this.reader.down(e.timeStamp || performance.now(), e.clientX, e.clientY);
      this.dot.style.display = 'block'; this.dot.style.transform = 'translate(' + (e.clientX - this.flickRect.left - 22) + 'px,' + (e.clientY - this.flickRect.top - 22) + 'px)';
    }, opt);
    this.flick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.flickId || this.owners.at(e.pointerId, e.clientX, e.clientY) !== 'flick') return; e.preventDefault();
      const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
      if (list && list.length) for (const c of list) { this.reader.move(c.timeStamp || e.timeStamp, c.clientX, c.clientY); this.sampleCount++; }
      else { this.reader.move(e.timeStamp || performance.now(), e.clientX, e.clientY); this.sampleCount++; }
      this.dot.style.transform = 'translate(' + (e.clientX - this.flickRect.left - 22) + 'px,' + (e.clientY - this.flickRect.top - 22) + 'px)';
    }, opt);
    const flickUp = (e) => { if (e.pointerId !== this.flickId) return; this.owners.lift(e.pointerId); this.reader.up(e.timeStamp || performance.now(), e.clientX, e.clientY); this.flickId = null; this.dot.style.display = 'none'; };
    this.flick.addEventListener('pointerup', flickUp); this.flick.addEventListener('pointercancel', flickUp);
    /* the mouse looks: a right-button drag anywhere, or any drag on the open screen above the thumbs */
    let mouse = null;
    window.addEventListener('pointerdown', (e) => { if (!this.enabled || e.pointerType !== 'mouse' || (e.button !== 2 && e.target.closest && e.target.closest('[data-mosa-ui],button,[data-mosa-port]'))) return; mouse = { x: e.clientX, y: e.clientY }; });
    window.addEventListener('pointermove', (e) => { if (!mouse || e.pointerType !== 'mouse') return; this.onLook(e.clientX - mouse.x, e.clientY - mouse.y); mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('pointerup', () => { mouse = null; });
    window.addEventListener('contextmenu', (e) => { if (this.enabled) e.preventDefault(); });
    /* keys */
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return; this.keys.add(e.code); this.onKey(e.code);
      if (!this.enabled) return;
      if (e.code === 'Space') { e.preventDefault(); this.spaceAt = performance.now(); }
      if (TRICK_KEYS[e.code]) { if (this.poppedAt && performance.now() - this.poppedAt < 260) this.events.push({ type: 'trick', name: TRICK_KEYS[e.code], acc: 4, spd: 4 }); }
      if (e.code === 'KeyG') this.events.push({ type: 'grab', on: true, dir: this.keyDir() });
      if (e.code === 'KeyM' || e.code === 'KeyN') this.events.push({ type: 'manual', on: true, nose: e.code === 'KeyN' });
      if (e.code === 'KeyF') this.events.push({ type: 'lipHold', on: true, dir: 0 });
      if (e.code === 'KeyR') this.events.push({ type: 'swipe', side: this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? -1 : 1, gesture: -1 });
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code); if (!this.enabled) return;
      if (e.code === 'Space') { this.events.push({ type: 'pop', gesture: -2, nollie: this.keys.has('ShiftLeft'), load: 0.8, spd: 4 }); this.poppedAt = performance.now();
        const held = Object.keys(TRICK_KEYS).find((k) => this.keys.has(k)); this.events.push({ type: 'trick', name: held ? TRICK_KEYS[held] : 'Ollie', acc: 4, spd: 4 }); }
      if (e.code === 'KeyG') this.events.push({ type: 'grab', on: false });
      if (e.code === 'KeyM' || e.code === 'KeyN') this.events.push({ type: 'manual', on: false });
      if (e.code === 'KeyF') this.events.push({ type: 'lipHold', on: false });
    });
    window.addEventListener('blur', () => { this.keys.clear(); });
    this.layout();
    window.addEventListener('resize', () => this.layout());
  }
  keyDir() { const k = this.keys, x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0), y = (k.has('KeyW') || k.has('ArrowUp') ? -1 : 0) + (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); return x || y ? Math.atan2(x, -y) * 180 / Math.PI : 90; }
  placeRing() { const L = this.left, r = this.carveRect; if (!L || !r) return; this.ring.style.transform = 'translate(' + (L.ox - r.left - 34) + 'px,' + (L.oy - r.top - 34) + 'px)'; const nx = Math.max(-1, Math.min(1, (L.x - L.ox) / 70)), ny = Math.max(-1, Math.min(1, (L.y - L.oy) / 70)); this.ring.firstChild.style.transform = 'translate(' + nx * 22 + 'px,' + ny * 22 + 'px)'; }
  /* the band on top is the open screen; below it, left half carve, right half flick — clear of the notch and the home bar */
  layout() {
    const vw = innerWidth, vh = innerHeight, rects = zoneRects(vw, vh, insets(), INPUT.zones), band = rects.band;
    if (!this.owners) this.owners = new Owners(rects, { plant: !!(window.__wl && window.__wl.plantZones) }); else this.owners.rects = rects;
    const top = rects.carve.y0, bottom = rects.carve.y1, left = rects.carve.x0, right = rects.flick.x1, mid = rects.carve.x1;
    Object.assign(this.carve.style, { left: left + 'px', top: top + 'px', width: (mid - left) + 'px', height: (bottom - top) + 'px' });
    Object.assign(this.flick.style, { left: mid + 'px', top: top + 'px', width: (right - mid) + 'px', height: (bottom - top) + 'px' });
    this.carveRect = { left, top }; this.flickRect = { left: mid, top };
    this.band = band;
  }
  /* what the controls say this step (events only once a frame: the first step takes them) */
  sample(first) {
    const k = this.keys, T = INPUT.thumb;
    let steer = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let throttle = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const L = this.left;
    if (L) {
      const dx = L.x - L.ox, dy = L.y - L.oy, a = Math.max(0, Math.abs(dx) - T.dead) / (T.full - T.dead);
      steer = Math.sign(dx) * Math.min(1, Math.pow(a, T.curve));
      throttle = dy < -T.push ? 1 : dy > T.brake ? -1 : 0;
    }
    const out = { steer, throttle, pushTap: false, events: [], hold: this.reader.hold };
    if (first) { this.reader.tick(performance.now()); out.pushTap = this.pushTap; this.pushTap = false; out.events = this.reader.drain().concat(this.events); this.events = []; }
    if (this.keys.has('Space') && this.spaceAt) out.load = Math.min(1, (performance.now() - this.spaceAt) / 250);
    return out;
  }
  samplesPerSecond() { const now = performance.now(), s = this.sampleCount / Math.max(0.001, (now - this.sampleSince) / 1000); this.sampleCount = 0; this.sampleSince = now; return s; }
}
/* the safe area, read from CSS (a phone's notch and home bar) */
let probe = null;
export function insets() {
  if (!probe) { probe = document.createElement('div'); probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'; document.body.appendChild(probe); }
  const cs = getComputedStyle(probe); return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
}
