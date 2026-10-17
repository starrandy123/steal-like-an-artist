/* THE COMBO GRAMMAR (DESIGN.md §5.2): every trick and every named gap adds one to the multiplier; a repeated trick is worth less each
 * time; switch, spins and the flick's grades scale a trick's own value; a combo banks once the board has rolled on four wheels for a
 * moment, and a bail loses it and empties the special meter. Pure: it reads the skater's events and state, writes its own. */
import { SCORING, TRICKS, GAPS } from '../config.js';

export function trickValue(base, opts) {
  const spin = 1 + SCORING.spinPerHalf * (opts.halves || 0);
  const stance = opts.switch ? SCORING.switchBonus : 1;
  const nollie = opts.nollie ? SCORING.nollieBonus : 1;
  const R = SCORING.repeats, rep = R[Math.min(opts.repeat || 0, R.length - 1)];
  const grade = opts.acc && opts.spd ? SCORING.grade.base + SCORING.grade.perStep * (opts.acc - 1) + SCORING.grade.perStep * (opts.spd - 1) : 1;
  return base * spin * stance * nollie * rep * grade;
}
/* the reference formula a test checks the grammar against: (Σ trick values + Σ gap values) × (tricks + gaps) */
export function comboTotal(values, gapValues) { const sum = values.reduce((a, b) => a + b, 0) + gapValues.reduce((a, b) => a + b, 0); return Math.round(sum * (values.length + gapValues.length)); }

export class Score {
  constructor() { this.combo = null; this.total = 0; this.best = 0; this.bestCombo = null; this.special = 0; this.golden = false; this.feed = []; this.gapsFound = new Set(); this.last = null; this.counts = { tricks: 0, combos: 0, gaps: 0, bails: 0 }; }
  say(item) { this.feed.push(item); if (this.tap) this.tap(item, this); }
  open() { if (!this.combo) this.combo = { tricks: [], gaps: [], seen: new Map(), t0: 0 }; return this.combo; }
  name(base, sk, halves, opts = {}) {
    const dirWord = halves ? (opts.fs ? 'FS ' : 'BS ') + halves * 180 + ' ' : '';
    return (sk.switch && !opts.noSwitch ? 'Switch ' : '') + dirWord + base;
  }
  addTrick(name, base, opts = {}) {
    const c = this.open();
    const repeat = c.seen.get(name) || 0; c.seen.set(name, repeat + 1);
    const value = trickValue(base, Object.assign({}, opts, { repeat })) + (opts.extra || 0);
    c.tricks.push({ name, value: Math.round(value), timed: !!opts.timed });
    this.counts.tricks++;
    this.say({ kind: 'trick', name, value: Math.round(value) });
    return c.tricks[c.tricks.length - 1];
  }
  addGap(g) {
    const c = this.open(); c.gaps.push({ name: g.name, value: g.value });
    const fresh = !this.gapsFound.has(g.name); this.gapsFound.add(g.name); this.counts.gaps++;
    this.special = Math.min(1, this.special + SCORING.special.perGap);
    this.say({ kind: 'gap', name: g.name, value: g.value, fresh });
  }
  get multiplier() { return this.combo ? this.combo.tricks.length + this.combo.gaps.length : 0; }
  get sum() { return this.combo ? this.combo.tricks.reduce((a, t) => a + t.value, 0) + this.combo.gaps.reduce((a, g) => a + g.value, 0) : 0; }
  get running() { return Math.round(this.sum * this.multiplier); }
  bank() {
    if (!this.combo || !this.combo.tricks.length) { this.combo = null; return 0; }
    const v = this.running;
    this.total += v; if (v > this.best) { this.best = v; this.bestCombo = this.combo.tricks.map((t) => t.name).join(' + '); }
    this.special = Math.min(1, this.special + v * SCORING.special.perPoint); if (this.special >= 1) this.golden = true;
    this.last = { value: v, tricks: this.combo.tricks.map((t) => t.name), gaps: this.combo.gaps.map((g) => g.name), mult: this.multiplier };
    this.say({ kind: 'bank', value: v, mult: this.multiplier });
    this.counts.combos++;
    this.combo = null; return v;
  }
  lose() { if (this.combo) this.say({ kind: 'lost', value: this.running }); this.combo = null; this.timed = null; this.special = 0; this.golden = false; this.counts.bails++; }

  /* the skater's events, turned into tricks */
  onEvents(events, sk) {
    for (const e of events) {
      if (e.type === 'land' && e.quality !== 'bail') {
        const halves = Math.round(Math.abs(e.spun || 0) / Math.PI);
        /* in the order they happened: the flick at the pop, then the grabs */
        if (e.trick && !(this.pendingAir && this.pendingAir.counted)) {
          const def = flipDef(e.trick);
          const name = this.name(e.trick, sk, halves, { fs: (e.spun || 0) < 0 });
          this.addTrick(name, def.base, { halves, switch: sk.switch, nollie: /^Nollie/.test(e.trick), acc: e.acc, spd: e.spd });
        } else if (!e.trick && halves >= 1) this.addTrick(this.name('Air', sk, halves, { fs: (e.spun || 0) < 0 }).replace(/ Air$/, ''), 60, { halves: halves - 1, switch: sk.switch });
        for (const gr of e.grabs || []) this.addTrick(gr.name, grabBase(gr.name), { halves: 0, switch: sk.switch, extra: grabExtra(gr.held || 0) });
        if (e.quality === 'sketchy') this.say({ kind: 'sketchy' });
      } else if (e.type === 'flick') { this.lastFlick = e; }
      else if (e.type === 'grindStart') {
        if (e.preTrick) { const def = flipDef(e.preTrick.name); this.addTrick(this.name(e.preTrick.name, sk, 0), def.base, { switch: sk.switch, acc: e.preTrick.acc, spd: e.preTrick.spd }); }
        if (e.special && this.timed && this.timed.kind === 'grind') this.timed.name = e.name; else this.timed = { kind: 'grind', name: e.name, t0: sk.t };
      } else if (e.type === 'grindEnd') { if (this.timed && this.timed.kind === 'grind' && e.why !== 'bail') { const [b, per] = this.timed.name === 'Darkslide' ? [TRICKS.specials.slide.base, TRICKS.specials.slide.perSecond] : (TRICKS.grinds[this.timed.name] || [100, 80]); this.addTrick(this.name(this.timed.name, sk, 0), b, { switch: sk.switch, extra: per * (e.time || 0), timed: true }); } this.timed = null; }
      else if (e.type === 'manualStart') this.timed = { kind: 'manual', name: e.name, t0: sk.t };
      else if (e.type === 'manualEnd') { if (e.clean && e.time > 0.25) { const [b, per] = TRICKS.manuals[e.name] || [50, 60]; this.addTrick(this.name(e.name, sk, 0), b, { switch: sk.switch, extra: per * e.time, timed: true }); } this.timed = null; }
      else if (e.type === 'lipStart') this.timed = { kind: 'lip', name: e.name, t0: sk.t };
      else if (e.type === 'lipEnd') { this.addTrick(e.name, 150, { extra: 80 * (e.time || 0), timed: true }); this.timed = null; }
      else if (e.type === 'revert') this.addTrick(e.name, TRICKS.reverts[e.name] || 100, {});
      else if (e.type === 'bail') this.lose();
      else if (e.type === 'respawn') this.timed = null;
    }
  }
  /* banking: four wheels down, no manual, no grind, for a moment */
  step(dt, sk) {
    if (!this.combo) return;
    if (sk.state === 'roll' && sk.landT >= SCORING.bankAfter && !sk.revert) this.bank();
  }
  /* the running combo as it would be said on the screen */
  /* what is in the air counts as it will when it lands — its base value and one more on the multiplier (the flick, each grab let go, the
     grab held, at what it has earned so far) — so a combo is never shown as nothing times nothing */
  live(sk) {
    const air = sk && sk.air, flicked = air && air.trick && air.trick.name !== 'Ollie' && air.trick.name !== 'Nollie' ? air.trick.name : null, grab = air && air.grab ? air.grab : null, let_go = air ? air.grabs || [] : [];
    const c = this.combo; if (!c && !this.timed && !flicked && !grab && !let_go.length) return null;
    const names = c ? c.tricks.map((t) => t.name) : [];
    let pending = 0, more = 0;
    if (flicked) { names.push(flicked); pending += flipDef(flicked).base || 0; more++; }
    for (const g of let_go) { names.push(g.name); pending += grabBase(g.name) + grabExtra(g.held || 0); more++; }
    if (grab) { names.push(grab.name + '…'); pending += grabBase(grab.name) + grabExtra((sk.t || 0) - grab.t0); more++; }
    let held = 0;
    if (this.timed) {
      names.push(this.timed.name + '…');
      const secs = Math.max(0, (sk.t || 0) - this.timed.t0), k = this.timed.kind;
      const [b, per] = k === 'grind' ? (this.timed.name === 'Darkslide' ? [TRICKS.specials.slide.base, TRICKS.specials.slide.perSecond] : (TRICKS.grinds[this.timed.name] || [100, 80])) : k === 'manual' ? (TRICKS.manuals[this.timed.name] || [50, 60]) : [150, 80];
      held = Math.round(b + per * secs);
    }
    const sum = Math.round(this.sum + held + pending), mult = this.multiplier + (this.timed ? 1 : 0) + more;
    return { names, mult, sum, total: Math.round(sum * mult), gaps: c ? c.gaps.map((g) => g.name) : [] };
  }
}
/* a grab: its own value, and what holding it earns (TRICKS.grabPerHalfSecond, up to TRICKS.grabMax seconds) */
const grabBase = (name) => { const g = TRICKS.grabs.find((x) => x.name === name); return g ? g.base : 150; };
const grabExtra = (secs) => Math.min(TRICKS.grabMax, Math.max(0, secs)) / 0.5 * TRICKS.grabPerHalfSecond;
function flipDef(name) {
  const bare = name.replace(/^Nollie /, '');
  for (const k of ['kick', 'heel', 'shove']) if (TRICKS.specials[k].name === bare) return TRICKS.specials[k];
  return TRICKS.flips.find((f) => f.name === bare) || Object.values(TRICKS.doubles).find((d) => d.name === bare) || { base: name === 'Nollie' ? 60 : 50 };
}

/* ---------------- THE NAMED GAPS: each one a test of what the board just did ---------------- */
export class Gaps {
  constructor(world, gaps = GAPS) { this.world = world; this.gaps = gaps; this.air = null; this.lastGrind = null; this.found = []; }
  inside(r, p) { return p[0] >= r[0] && p[0] <= r[2] && p[2] >= r[1] && p[2] <= r[3]; }
  footprint(id) {
    const e = this.world.data.elements.find((x) => x.id === id); if (!e) return null; if (e.top && e.type === 'box') return e.top; if (e.rect) return e.rect;
    /* a row along a line (a slanted ledge, a barrier): the box round its strip on the ground */
    if (e.line) { const [[ax, az], [bx, bz]] = e.line, w = (e.bottom || e.width || 0) / 2, l = Math.hypot(bx - ax, bz - az), nx = Math.abs((az - bz) / l) * w, nz = Math.abs((bx - ax) / l) * w;
      return [Math.min(ax, bx) - nx, Math.min(az, bz) - nz, Math.max(ax, bx) + nx, Math.max(az, bz) + nz]; }
    return null;
  }
  onEvents(events, sk, score) {
    for (const e of events) {
      if (e.type === 'pop' || e.type === 'takeoff') this.air = { from: sk.air ? sk.air.from.slice() : sk.p.slice(), lipId: sk.air ? sk.air.lipId : null, fromRail: sk.air ? sk.air.fromRail : null, track: [] };
      if (e.type === 'grindEnd') this.lastGrind = { group: e.group, covered: e.covered, full: e.full, t: sk.t };
      if (e.type === 'grindEnd') for (const g of this.gaps) if (g.kind === 'grind' && e.group === g.rail && e.why !== 'bail' && (g.full ? e.full : e.covered >= g.length)) score.addGap(g);
      if (e.type === 'manualEnd' && e.clean) for (const g of this.gaps) if (g.kind === 'manual' && this.within(g.region, e.from, e.to) >= g.length) score.addGap(g);
      if (e.type === 'land' && e.quality !== 'bail' && this.air) {
        const from = this.air.from, to = sk.p;
        for (const g of this.gaps) {
          if (g.kind === 'air' && this.inside(g.from, from) && this.inside(g.to, to) && Math.abs(to[1] - g.toY) < 0.15) score.addGap(g);
          else if (g.kind === 'vert' && this.air.lipId === g.quarter && e.height >= 0 && this.maxOver != null && this.maxOver >= g.height) score.addGap(g);
          else if (g.kind === 'transfer' && this.lastGrind && this.lastGrind.group === g.fromRail && sk.t - this.lastGrind.t < 1.5 && this.inside(g.to, to)) score.addGap(g);
          else if (g.kind === 'transfer2' && (this.air.lipId === g.a || this.air.lipId === g.b) && this.across(g, from, to)) score.addGap(g);
          else if (g.kind === 'clear') { const r = this.footprint(g.over); if (r && this.crossed(r, from, to)) score.addGap(g); }
        }
        this.air = null; this.maxOver = null;
      }
      if (e.type === 'bail' || e.type === 'grindStart') { this.air = null; this.maxOver = null; }
    }
    if (sk.state === 'air' && sk.air && sk.air.lipTop != null) { const over = sk.air.maxY - sk.air.lipTop; this.maxOver = this.maxOver == null ? over : Math.max(this.maxOver, over); }
  }
  /* a transfer over a spine: from one face to the other — the signed distance from the spine's coping line changes sign, and the take-off was
     on its transition (within `reach` of the coping: the gap's own, or the transition's run and 0.3 m) */
  across(g, from, to) {
    const e = this.world.data.elements.find((x) => x.id === g.a.split(':')[0]); if (!e || !e.coping) return false;
    const [[ax, az], [bx, bz]] = e.coping, L = Math.hypot(bx - ax, bz - az), nx = (bz - az) / L, nz = -(bx - ax) / L;
    const d = (p) => (p[0] - ax) * nx + (p[2] - az) * nz, reach = g.reach != null ? g.reach : Math.sqrt(e.r * e.r - (e.r - e.h) ** 2) + 0.3;
    return Math.sign(d(from)) !== Math.sign(d(to)) && Math.abs(d(from)) < reach;
  }
  /* how much of the line from a to b lies inside the rectangle (x0, z0, x1, z1): a manual counts the stretch it spent on the thing */
  within(r, a, b) {
    let t0 = 0, t1 = 1; const dx = b[0] - a[0], dz = b[2] - a[2];
    for (const [p, q] of [[-dx, a[0] - r[0]], [dx, r[2] - a[0]], [-dz, a[2] - r[1]], [dz, r[3] - a[2]]]) {
      if (p === 0) { if (q < 0) return 0; continue; }
      const t = q / p; if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    }
    return t1 > t0 ? (t1 - t0) * Math.hypot(dx, dz) : 0;
  }
  /* from one side of a footprint to the other, over it (the board touched nothing between) */
  crossed(r, a, b) {
    const ins = (p) => this.inside(r, p);
    if (ins(a) || ins(b)) return false;
    const cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2, w = r[2] - r[0], h = r[3] - r[1];
    const longX = w >= h;
    return longX ? (a[0] - cx) * (b[0] - cx) < 0 && Math.abs(a[2] - cz) < h && Math.abs(b[2] - cz) < h + 1 : (a[2] - cz) * (b[2] - cz) < 0 && Math.abs(a[0] - cx) < w && Math.abs(b[0] - cx) < w + 1;
  }
}
