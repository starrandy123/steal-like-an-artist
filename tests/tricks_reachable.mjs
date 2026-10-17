/* EVERY TRICK IS REACHABLE (DESIGN.md §1 row 4): each one from a start of its own, by its own thumb through the real reader, into the real
 * sim, lands — and the score names it. A trick that cannot be done by its input is a defect, whatever its row in the table says.
 * Run: node tests/tricks_reachable.mjs   (exit 1 on any miss; the misses are listed with what the sim said instead) */
import { rig, flick, pull, swipe, tap, liveCensus } from './lib/rig.mjs';
import { TRICKS } from '../build/js/config.js';

const FLAT = [18, 0, 8];                     // the plaza's west runway: 22 m of slab heading east, nothing in the way
const results = [];
const check = (name, fn) => { try { const r = fn(); results.push({ name, ok: !!r.ok, detail: r.detail || '' }); } catch (e) { results.push({ name, ok: false, detail: 'threw ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ') }); } };
const said = (R) => 'tricks [' + R.tricks().join(', ') + '] · events ' + R.log.filter((e) => !/push|scrape/.test(e.type)).map((e) => e.type + (e.name ? ':' + e.name : '') + (e.quality ? ':' + e.quality : '') + (e.why ? ':' + e.why : '')).slice(0, 14).join(' ');

/* ---- flips, on flat ground, under Cruise and under Classic (graded: Classic pops by speed) ---- */
for (const preset of ['cruise', 'classic']) for (const f of TRICKS.flips) check(f.name + ' (' + preset + ')', () => {
  const R = rig({ preset, at: FLAT, heading: 90, speed: 5 }); R.secs(0.3); R.thumb(flick(f.name)); R.secs(2.2);
  return { ok: R.tricks().includes(f.name) && R.banked().length > 0, detail: said(R) };
});
/* a nollie flip, and a double (a fast flick under Classic) */
/* (a nollie is loaded UP: under Cruise any quick stroke up is already the beginner's pop, so nollies are Classic's and Raw's) */
check('Nollie Kickflip (classic)', () => { const R = rig({ preset: 'classic', at: FLAT, speed: 5 }); R.secs(0.3); R.thumb(flick('Kickflip', { nollie: true })); R.secs(2.2); return { ok: R.tricks().includes('Nollie Kickflip'), detail: said(R) }; });
check('Double Kickflip (classic, a fast flick)', () => { const R = rig({ preset: 'classic', at: FLAT, speed: 5 }); R.secs(0.3); R.thumb(flick('Kickflip', { len: 150, ms: 45 })); R.secs(2.2); return { ok: R.tricks().includes('Double Kickflip'), detail: said(R) }; });
check('a tap is a little ollie (cruise)', () => { const R = rig({ at: FLAT, speed: 5 }); R.secs(0.3); R.thumb(tap()); R.secs(2.0); return { ok: R.tricks().includes('Ollie'), detail: said(R) }; });

/* ---- grabs: an ollie, then a second touch held toward the grab's direction ---- */
for (const g of TRICKS.grabs) check(g.name, () => {
  const R = rig({ at: FLAT, speed: 5 }); R.secs(0.3); const end = R.thumb(flick('Ollie')); R.until(() => R.sk.state === 'air', 1); R.step(Math.max(1, Math.round((end - R.ms + 20) / (1000 / 120))));
  R.thumb(pull(40, 280, g.dir)); R.secs(2.0);
  return { ok: R.tricks().includes(g.name), detail: said(R) };
});

/* ---- manuals: a light pull held still while rolling ---- */
check('Manual', () => { const R = rig({ at: FLAT, speed: 4.5 }); R.secs(0.3); R.thumb(pull(22, 1400)); R.secs(2.4); return { ok: R.tricks().includes('Manual'), detail: said(R) }; });
/* a thumb pulled and then held PERFECTLY still (no more samples): the reader judges the hold by time */
check('Manual from a perfectly still thumb', () => { const R = rig({ at: FLAT, speed: 4.5 }); R.secs(0.3); R.thumb([[0, 0, 0], [8, 0, 8], [8, 0, 16], [8, 0, 22], [1400, 0, 22]]); R.secs(2.4); return { ok: R.tricks().includes('Manual'), detail: said(R) }; });
check('Nose Manual', () => { const R = rig({ at: FLAT, speed: 4.5 }); R.secs(0.3); R.thumb(pull(22, 1400, 0)); R.secs(2.4); return { ok: R.tricks().includes('Nose Manual'), detail: said(R) }; });

/* ---- grinds and slides ---- */
/* along the Main Ledge (its south edge runs x 28 → 40 at z 23, 0.36 up) */
const ledgeRun = (hold, angle = 0) => {
  const R = angle ? rig({ at: [24, 0, 19.5], heading: 90 - angle, speed: 5.6 }) : rig({ at: [21, 0, 22.7], heading: 90, speed: 5.6 }); R.until(() => angle ? R.sk.p[2] >= 21.95 : R.sk.p[0] >= 25.4, 3);   // the pop lands ~0.8 m on, before the Pad's end at x 26.5 (from 25.9 it came past it: rolling off is flight, and a pop in the air is refused)
  const end = R.thumb(flick('Ollie')); if (hold != null) { R.until(() => R.sk.state === 'air', 1); R.step(Math.max(1, Math.round((end - R.ms + 15) / (1000 / 120)))); R.thumb(pull(34, 1200, hold)); }
  R.secs(3.5); return R;
};
check('50-50 (the Main Ledge)', () => { const R = ledgeRun(null); return { ok: R.tricks().includes('50-50'), detail: said(R) }; });
check('5-0 (held down at the lock)', () => { const R = ledgeRun(180); return { ok: R.tricks().includes('5-0'), detail: said(R) }; });
check('Nosegrind (held up at the lock)', () => { const R = ledgeRun(0); return { ok: R.tricks().includes('Nosegrind'), detail: said(R) }; });
check('Crooked or Feeble (met at 35°)', () => { const R = ledgeRun(null, 35); return { ok: R.tricks().some((t) => /Crooked|Feeble/.test(t)), detail: said(R) }; });
/* the Low Bar (a round rail at z 12, x 26 → 34, 0.33 up): met at 60° is a boardslide */
check('Boardslide (the Low Bar, met at 60°)', () => {
  const R = rig({ at: [26.2, 0, 8.6], heading: 30, speed: 4.6 }); R.until(() => R.sk.p[2] >= 9.75, 3); R.thumb(flick('Ollie')); R.secs(6);
  return { ok: R.tricks().some((t) => /Boardslide|Lipslide/.test(t)), detail: said(R) };
});
/* a flip into a grind scores both */
check('Kickflip to 50-50', () => {
  const R = rig({ at: [21, 0, 22.7], heading: 90, speed: 5.6 }); R.until(() => R.sk.p[0] >= 25.7, 3); R.thumb(flick('Kickflip')); R.secs(3.5);
  return { ok: R.tricks().includes('Kickflip') && R.tricks().includes('50-50'), detail: said(R) };
});

/* ---- the East Wall (a quarter at x 59, coping 1.83 up): an air with a grab, a lip stall, a revert ---- */
check('quarter-pipe air with an Indy', () => {
  const R = rig({ at: [42, 0, 22], heading: 90, speed: 8.2 }); R.until(() => R.sk.state === 'air' && R.sk.air && R.sk.air.vert, 4);
  R.thumb(pull(40, 320, 90)); R.secs(3);
  return { ok: R.tricks().includes('Indy') && R.says('land').some((e) => e.quality !== 'bail'), detail: said(R) + ' vert=' + R.says('takeoff').map((e) => e.why).join(',') };
});
check('Axle Stall (the coping met slowly, the pad held)', () => {
  const R = rig({ at: [48, 0, 22], heading: 90, speed: 6.45 }); R.until(() => R.sk.p[0] >= 56.6, 3); R.thumb(pull(6, 1100, 180)); R.secs(3.5);
  return { ok: R.tricks().some((t) => /Stall|Fakie|Disaster/.test(t)), detail: said(R) + ' maxY ' + Math.max(...R.log.map(() => 0), 0) };
});
check('FS or BS Revert (a swipe as the board lands in the quarter)', () => {
  const R = rig({ at: [42, 0, 22], heading: 90, speed: 8.2 }); R.until(() => R.sk.state === 'air' && R.sk.air && R.sk.air.vert, 4);
  R.until(() => R.sk.state === 'roll', 3); R.thumb(swipe(1), R.ms + 1); R.secs(2.5);
  return { ok: R.tricks().some((t) => /Revert/.test(t)), detail: said(R) };
});

/* ---- the specials (the meter golden): a flick held still at its end, and a slide held still ---- */
const golden = (R) => { R.score.special = 1; R.score.golden = true; };
const held = (name) => { const p = flick(name); const last = p[p.length - 1]; for (let i = 0; i < 24; i++) p.push([8, last[1], last[2]]); return p; };
for (const [name, want] of [['Kickflip', 'Nightmare Flip'], ['Heelflip', 'Hospital Flip'], ['BS Pop Shove-it', 'Underflip']]) check(want + ' (a ' + name + ' flick held at its end, golden)', () => {
  const R = rig({ at: FLAT, speed: 5 }); golden(R); R.secs(0.3); R.thumb(held(name)); R.secs(2.4); return { ok: R.tricks().includes(want), detail: said(R) };
});
check('Darkslide (a boardslide held still, golden)', () => {
  const R = rig({ at: [26.2, 0, 8.6], heading: 30, speed: 4.6 }); golden(R); R.until(() => R.sk.p[2] >= 9.75, 3); const end = R.thumb(flick('Ollie'));
  R.until(() => R.sk.state === 'grind', 2); R.thumb([[0, 0, 0], [8, 1, 1], [900, 1, 1]], Math.max(R.ms + 1, end + 2)); R.secs(5);
  return { ok: R.tricks().includes('Darkslide'), detail: said(R) };
});
check('no special without the golden meter', () => { const R = rig({ at: FLAT, speed: 5 }); R.secs(0.3); R.thumb(held('Kickflip')); R.secs(2.4); return { ok: R.tricks().includes('Kickflip') && !R.tricks().includes('Nightmare Flip'), detail: said(R) }; });

/* ---- a bail, and the respawn after it ---- */
check('bail into the fence, then respawn', () => {
  const R = rig({ at: [57, 0, 31], heading: 90, speed: 6.5 }); R.secs(3.5);
  return { ok: R.says('bail').length > 0 && R.says('respawn').length > 0 && R.sk.state === 'roll', detail: said(R) };
});

/* ---- a named gap ---- */
check('gap: Pad Manual', () => {
  /* ollie onto the pad and land in a manual (the pad held lightly as the wheels touch), 5 m of it inside the pad */
  const R = rig({ at: [15.5, 0, 23.4], heading: 90, speed: 4.4 }); R.until(() => R.sk.p[0] >= 17.6, 2); const end = R.thumb(flick('Ollie'));
  R.until(() => R.sk.state === 'air', 1); R.step(Math.max(1, Math.round((end - R.ms + 15) / (1000 / 120)))); R.thumb(pull(22, 2000)); R.secs(3);
  return { ok: R.feed.some((f) => f.kind === 'gap' && f.name === 'Pad Manual'), detail: said(R) + ' gaps ' + R.feed.filter((f) => f.kind === 'gap').map((f) => f.name).join(',') + ' end ' + end };
});

let fail = 0;
for (const r of results) { console.log((r.ok ? '✔ ' : '✖ ') + r.name + (r.ok ? '' : '\n      ' + r.detail)); if (!r.ok) fail++; }
/* the combo box as it builds, on every step of every trick above: a trick in the air or on a rail is said with its value and its count — never
   a name over "0 × 0" (the supervisor's H1) */
{ const E = liveCensus.empty, kinds = [...new Set(E.map((x) => x.replace(/ [0-9]+ × [0-9]+$/, '')))];
  const okLive = E.length === 0; if (!okLive) fail++;
  console.log((okLive ? '✔ ' : '✖ ') + 'the combo box over ' + liveCensus.steps + ' steps: shown on ' + liveCensus.shown + ', nothing × nothing on ' + E.length + (E.length ? ' — e.g. ' + kinds.slice(0, 4).join(' | ') + ' (' + E[0] + ')' : '')); }
console.log((fail ? 'TRICKS: RED' : 'TRICKS: GREEN') + ' · ' + (results.length - fail + (liveCensus.empty.length ? 1 : 0)) + ' of ' + results.length + ' reached');
process.exit(fail ? 1 : 0);
