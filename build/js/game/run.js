/* THE RUN (DESIGN.md §5.3): two minutes on the clock and twelve goals that stay done once done. Each goal is judged from what the sim and
 * the score SAID happened (events, the score's feed) — never from a flag the HUD sets. Free skate keeps the park's gap checklist; a run adds
 * the clock, the goals and the five hidden wax bars. Pure logic (no DOM): main.js draws it, tests/run_goals.mjs drives it. */
import { RUN } from '../config.js';
import { GOALS } from '../parks/plaza.js';

/* the goals are the park's own (js/parks/<park>.js GOALS, as data); the Plaza's are the default */
export { GOALS } from '../parks/plaza.js';

export class Run {
  constructor(opts = {}) {
    const run = opts.run || RUN; this.radius = run.waxRadius; this.goals = opts.goals || GOALS;
    this.length = opts.length || run.seconds; this.on = false; this.left = 0; this.done = new Set(opts.done || []); this.fresh = [];
    this.best = opts.best || 0; this.bars = run.wax.map((b, i) => ({ i, at: b, got: false }));
  }
  start(score) { this.on = true; this.left = this.length; this.base = score.total; this.gaps = new Set(); this.fresh = []; this.ended = false; this.bars.forEach((b) => { b.got = false; }); this.got = 0; this.points = 0; }
  /* one sim step: the clock, the wax bars, and every goal the step's events complete */
  step(dt, sk, score, events) {
    if (!this.on) return;
    this.left = Math.max(0, this.left - dt);
    const p = sk.p;
    for (const b of this.bars) if (!b.got && Math.hypot(p[0] - b.at[0], p[1] + 0.45 - b.at[1], p[2] - b.at[2]) < this.radius) { b.got = true; this.got++; this.say('wax:' + b.i); if (this.got === this.bars.length) for (const g of this.goals) if (g.wax) this.hit(g.id); }
    for (const e of events) {
      if (e.type === 'manualEnd' && e.clean) for (const g of this.goals) if (g.manual && e.time >= g.manual) this.hit(g.id);
    }
    this.points = score.total - this.base + (score.combo ? score.running : 0);
    const banked = score.total - this.base;
    for (const g of this.goals) if (g.score && banked >= g.score) this.hit(g.id);
    if (this.left <= 0 && !this.ended) { this.ended = true; this.overtime = sk.state === 'air' || sk.state === 'grind' || sk.state === 'manual' || sk.state === 'lip'; }
  }
  /* every item the score says, as it says it (score.tap): gaps with the combo that holds them, and banked combos */
  heardScore(f, score, sk) {
    if (!this.on) return;
    if (f.kind === 'gap') {
      this.gaps.add(f.name);
      const c = score.combo, names = c ? c.tricks.map((t) => t.name) : [], gaps = c ? c.gaps.map((g) => g.name) : [];
      /* in the order they have always been judged: the count of gaps, a gap of its own, then gaps in one combo */
      for (const g of this.goals) if (g.gapCount && this.gaps.size >= g.gapCount) this.hit(g.id);
      for (const g of this.goals) if (g.gap === f.name && (!g.trick || names.some((n) => n.includes(g.trick))) && (!g.grab || (sk && sk.lastAirGrabs > 0))) this.hit(g.id);
      for (const g of this.goals) if (g.gaps && g.gaps.every((n) => gaps.includes(n))) this.hit(g.id);
    } else if (f.kind === 'bank') for (const g of this.goals) if (g.combo && f.mult >= g.combo) this.hit(g.id);
  }
  /* time's up: a combo in the air or on a rail is let land; then the run is over */
  finish(score) {
    this.on = false; const total = score.total - this.base;
    const isBest = total > this.best; if (isBest) this.best = total;
    return { total, isBest, best: this.best, goals: this.fresh.slice(), done: this.done.size, gaps: [...this.gaps], wax: this.got };
  }
  hit(id) { if (this.done.has(id)) return; this.done.add(id); this.fresh.push(id); this.say('goal:' + id); }
  say(what) { (this.heard || (this.heard = [])).push(what); }
  drain() { const h = this.heard || []; this.heard = []; return h; }
}
