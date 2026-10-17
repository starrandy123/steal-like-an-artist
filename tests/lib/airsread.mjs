/* TWO READINGS EVERY AIR SWEEP REPORTS (10-17, the supervisor), each beside r24's (tests/baselines/airs_r24.json, recorded by running the sweep
 * on the frozen r24 build with AIRS_RECORD=<file>):
 *   · ONE READER OF THE LANDING — "the landing the plan aims at and the landing the judge reads must be the same": on every landing, the face
 *     the up was planned to on the step the judge read the first touch (body.js predictLanding: the landing guess) against the face judged
 *     (judge(hit)), the time the guess still gave the plan then, the judged tilt. Read by wrapping the two, never by the sim's own say, so it
 *     reads any build;
 *   · THE UP'S TURN IN THE AIR — its rate and its acceleration frame to frame at 60 Hz on the frames no contact turned the board (the sim's
 *     own signal, body.js airTouch; a build without it reads every frame), the most of each and where;
 *   · THE SEAT'S OWN TURN (the supervisor: "the up's change in the landing's step ... every seat path"): what the landing's seat turned the
 *     board's up by (body.js land, wrapped: its up before against its up after), by the path that seated it (the middle's own touch, the edge
 *     rest, pressed, standing, quiet, a bail; r24's land names none), the counts over 2°, 5° and 10°, and over what the step's own contact
 *     can turn it — the wheel's speed into the face over its arm (half the wheelbase), × the step — the most and where.
 *   · (A) THE SEAT NEVER SETS, AND THE SETTLE ENDS — a GATE (the supervisor, 10-17: "the settle is what froze his game this morning"): every
 *     seat's turn in its step at most its contact's bound — the landing's step (the wheel's speed into the face over its arm, × the step, at
 *     least the chain's 2°) and every step of the settle after it (the same, with gravity's own tip from the touch: body.js attach) — and
 *     every settle ENDS: a remaining turn that does not shrink for 6 steps is a hang. The longest settle said (ms, its turn, where). A.gate()
 *   const A = airsRead(Skater, PHYSICS); per ride A.ride(); after each sim step A.step(sk, where); after each frame A.frame(sk, where);
 *   A.lines(label, base) → ['ℹ ...', 'ℹ ...'] · A.summary() (what AIRS_RECORD keeps) */
import fs from 'node:fs';

const D = 180 / Math.PI;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * D;
export function airsRead(Skater, PHYSICS, FT = 1 / 60) {
  if (!Skater.prototype._airsRead) {
    const P = Skater.prototype.predictLanding, J = Skater.prototype.judge, Ld = Skater.prototype.land;
    Skater.prototype.land = function (hit, j, seat, how) { const u0 = this.up.slice(), quiet = !!(this.air && this.air.quiet), r = Ld.apply(this, arguments), h = how || 'the plain face';
      this._arSeat = { how: quiet && h !== 'a bail' ? h + ', quiet' : h, turn: ang(u0, this.up), impact: j && j.impact != null ? j.impact : 0 }; return r; };
    Skater.prototype.predictLanding = function (w) { const r = P.call(this, w); if (this.state === 'air') this._arGuess = r ? { n: r.normal.slice(), t: r.t } : null; return r; };
    Skater.prototype.judge = function (hit) { const j = J.call(this, hit); this._arJudged = { g: this._arGuess || null, n: hit.normal.slice(), tilt: j.tilt, q: j.quality }; return j; };
    Skater.prototype._airsRead = true;
  }
  const F = { n: 0, over2: 0, apart: { v: 0, at: '' }, late: 0, left: { v: 0, at: '' }, tilt: { v: 0, at: '' }, unseen: 0 };
  const U = { rate: { v: 0, at: '' }, acc: { v: 0, at: '' } }, ST = { n: 0, o2: 0, o5: 0, o10: 0, sets: 0, most: { v: 0, at: '' }, set: { v: 0, allow: 0, at: '' }, by: {} };
  const ARM = PHYSICS.wheelbase / 2, TOL = 0.05, HANG = 6;
  const SE = { sets: [], hangs: [], longest: { ms: 0, deg: 0, at: '' }, cur: null, prevUp: null, settles: 0 };
  let uPrev = null, wPrev = null, c1 = null, c2 = null;
  const A = {
    ride() { uPrev = wPrev = null; c1 = c2 = null; SE.cur = null; SE.prevUp = null; },
    step(sk, where) {
      if (sk._arSeat) { const z = sk._arSeat; sk._arSeat = null; ST.n++; const b = ST.by[z.how] || (ST.by[z.how] = { n: 0, v: 0 }); b.n++; if (z.turn > b.v) b.v = z.turn;
        if (z.turn > 2) ST.o2++; if (z.turn > 5) ST.o5++; if (z.turn > 10) ST.o10++;
        const allow = Math.max(2, (z.impact / ARM) * PHYSICS.step * D), at = where() + ', ' + z.how;
        if (z.turn > ST.most.v) ST.most = { v: z.turn, at }; if (z.turn > allow) { ST.sets++; if (z.turn - allow > ST.set.v - ST.set.allow) ST.set = { v: z.turn, allow, at }; }
        if (z.turn > allow + TOL) SE.sets.push(at + ': the landing\'s step ' + z.turn.toFixed(1) + '° over its ' + allow.toFixed(1) + '°'); }
      /* the settle after it, step by step (body.js this.settle: its rate and its start; what is left of its turn) */
      { const u = sk.up.slice();
        if (sk.settle && sk.state === 'roll') { const z = sk.settle; let c = SE.cur;
          if (!c || c.t0 !== z.t0) { c = SE.cur = { t0: z.t0, w: z.w, steps: 0, prev: Infinity, still: 0, first: null, at: where(), hung: false }; SE.settles++; }
          c.steps++;
          if (SE.prevUp && c.steps > 1) { const turn = ang(SE.prevUp, u), bound = Math.max(2, (c.w + 1.5 * PHYSICS.gGround / PHYSICS.wheelbase * (sk.t - c.t0)) * PHYSICS.step * D);
            if (turn > bound + TOL) SE.sets.push(where() + ': a settle\'s step ' + turn.toFixed(1) + '° over its ' + bound.toFixed(1) + '°'); }
          const left = (z.left || 0) * D; if (c.first == null) c.first = left;
          /* ("does not shrink for 6 steps": no step smaller than the one before it, six in a row — read against the step before, never the least so
             far: on a face that turns under the board, what is left moves with it and shrinks again; 10-17, against the least it read a 75 ms settle
             at the Spine's top as hung) */
          if (left < c.prev - 1e-4) c.still = 0; else if (++c.still >= HANG && !c.hung) { c.hung = true; SE.hangs.push(where() + ': ' + left.toFixed(1) + '° left, not shrinking for ' + c.still + ' steps'); }
          c.prev = left;
        } else if (SE.cur) { const c = SE.cur, ms = c.steps * PHYSICS.step * 1000; if (ms > SE.longest.ms) SE.longest = { ms, deg: c.first || 0, at: c.at }; SE.cur = null; }
        SE.prevUp = u; }
      for (const e of sk.events) if (e.type === 'land' && sk._arJudged) {
        const j = sk._arJudged; sk._arJudged = null; F.n++; const at = where() + ' (' + j.q + ')';
        if (!j.g) F.unseen++;
        else { const a = ang(j.g.n, j.n); if (a > 2) F.over2++; if (a > F.apart.v) F.apart = { v: a, at }; if (j.g.t > PHYSICS.step) F.late++; if (j.g.t > F.left.v) F.left = { v: j.g.t, at }; }
        if (j.tilt > F.tilt.v) F.tilt = { v: j.tilt, at };
      }
    },
    frame(sk, where) {
      if (sk.state !== 'air') { uPrev = wPrev = null; c1 = c2 = null; return; }
      const u = sk.up.slice(), c = sk.airTouch || 0;
      if (uPrev) {
        const x = [uPrev[1] * u[2] - uPrev[2] * u[1], uPrev[2] * u[0] - uPrev[0] * u[2], uPrev[0] * u[1] - uPrev[1] * u[0]], w = x.map((q) => q / FT), touched = c1 != null && c !== c1;
        if (!touched) { const wl = Math.hypot(...w); if (wl > U.rate.v) U.rate = { v: wl, at: where() }; }
        if (wPrev && !(touched || (c2 != null && c1 !== c2))) { const a = Math.hypot(w[0] - wPrev[0], w[1] - wPrev[1], w[2] - wPrev[2]) / FT; if (a > U.acc.v) U.acc = { v: a, at: where() }; }
        wPrev = w;
      }
      uPrev = u; c2 = c1; c1 = c;
    },
    gate(label) {
      const ok = SE.sets.length === 0 && SE.hangs.length === 0;
      return { ok, line: '(A) THE SEAT NEVER SETS, AND THE SETTLE ENDS (' + label + '): ' + ST.n + ' landings seated, ' + SE.settles + ' settles — every seat\'s turn in its step at most its contact\'s bound: ' + SE.sets.length + ' over' + (SE.sets.length ? ' (' + SE.sets.slice(0, 3).join(' · ') + ')' : '') + ' · every settle ended: ' + SE.hangs.length + ' hung' + (SE.hangs.length ? ' (' + SE.hangs.slice(0, 3).join(' · ') + ')' : '') + ' · ℹ the longest settle ' + SE.longest.ms.toFixed(0) + ' ms, ' + SE.longest.deg.toFixed(1) + '° to turn' + (SE.longest.at ? ' (' + SE.longest.at + ')' : '') };
    },
    summary() { return { fact: { n: F.n, over2: F.over2, apart: +F.apart.v.toFixed(1), late: F.late, left: Math.round(1000 * F.left.v), tilt: +F.tilt.v.toFixed(1) }, up: { rate: Math.round(U.rate.v * D), acc: Math.round(U.acc.v) }, seat: { n: ST.n, o2: ST.o2, o5: ST.o5, o10: ST.o10, sets: ST.sets, most: +ST.most.v.toFixed(1) } }; },
    lines(label, base) {
      const b = base && base.fact ? base : null;
      return ['ℹ ONE READER OF THE LANDING — reported (' + label + '): ' + F.n + ' landings — the face the plan aimed at and the face judged over 2° apart on ' + F.over2 + ', the most ' + F.apart.v.toFixed(1) + '°' + (F.apart.at ? ' (' + F.apart.at + ')' : '') + ' · the plan\'s time left at the first touch over a step on ' + F.late + ', the most ' + (1000 * F.left.v).toFixed(0) + ' ms' + (F.left.at ? ' (' + F.left.at + ')' : '') + ' · the judged tilt the most ' + F.tilt.v.toFixed(1) + '°' + (F.tilt.at ? ' (' + F.tilt.at + ')' : '') + (F.unseen ? ' · ' + F.unseen + ' with no landing in view' : '') + (b ? ' — r24: ' + b.fact.n + ' landings, ' + b.fact.over2 + ' over 2° (the most ' + b.fact.apart + '°), ' + b.fact.late + ' over a step (the most ' + b.fact.left + ' ms), the tilt the most ' + b.fact.tilt + '°' : ''),
        'ℹ THE SEAT\'S OWN TURN — reported (' + label + '): ' + ST.n + ' landings seated — the seat turned the board\'s up over 2° on ' + ST.o2 + ', over 5° on ' + ST.o5 + ', over 10° on ' + ST.o10 + ', the most ' + ST.most.v.toFixed(1) + '°' + (ST.most.at ? ' (' + ST.most.at + ')' : '') + ' · over what its own contact turns in the step (its speed into the face over its arm) on ' + ST.sets + (ST.set.at ? ', the most ' + ST.set.v.toFixed(1) + '° over its ' + ST.set.allow.toFixed(1) + '° (' + ST.set.at + ')' : '') + ' · by path: ' + Object.entries(ST.by).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => k + ' ' + v.n + ' (the most ' + v.v.toFixed(1) + '°)').join(', ') + (b && b.seat ? ' — r24: ' + b.seat.n + ' seated, over 2° on ' + b.seat.o2 + ', 5° on ' + b.seat.o5 + ', 10° on ' + b.seat.o10 + ', the most ' + b.seat.most + '°, over its contact on ' + b.seat.sets : ''),
        'ℹ THE UP\'S TURN IN THE AIR — reported (' + label + '): its rate the most ' + (U.rate.v * D).toFixed(0) + '°/s' + (U.rate.at ? ' (' + U.rate.at + ')' : '') + ' · its acceleration the most ' + U.acc.v.toFixed(0) + ' rad/s²' + (U.acc.at ? ' (' + U.acc.at + ')' : '') + ' — on the frames no contact turned the board' + (b ? ' — r24: ' + b.up.rate + '°/s, ' + b.up.acc + ' rad/s²' : '')];
    },
  };
  return A;
}
/* the r24 readings beside, by sweep and assist; AIRS_RECORD=<file> keeps this run's instead (run on the frozen r24 build) */
export function airsBase(sweep) {
  try { return JSON.parse(fs.readFileSync(new URL('../baselines/airs_r24.json', import.meta.url), 'utf8'))[sweep] || {}; } catch (e) { return {}; }
}
export function airsRecord(sweep, rows) {
  const f = process.env.AIRS_RECORD; if (!f) return;
  let all = {}; try { all = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { all = {}; }
  all[sweep] = rows; fs.writeFileSync(f, JSON.stringify(all, null, 1) + '\n');
}
