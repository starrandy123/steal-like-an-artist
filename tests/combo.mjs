/* THE COMBO GRAMMAR (DESIGN.md §5.2): the worked example must come to 4,875 through the score's own event handling; 40 more combos drawn at
 * random must bank exactly what the reference formula says ((Σ trick values + Σ gaps) × (tricks + gaps), each trick's value from its base,
 * spin, stance, repeat and grades); a bail scores nothing and empties the special meter; the special meter fills and goes golden. */
import { Score, trickValue, comboTotal } from '../build/js/sim/score.js';
import { TRICKS, SCORING } from '../build/js/config.js';
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const sk = (o = {}) => Object.assign({ switch: false, t: 0, state: 'roll', landT: 9, revert: null }, o);

/* the worked example, as the sim would say it */
{
  const S = new Score(), k = sk();
  S.onEvents([{ type: 'grindStart', name: '50-50', preTrick: { name: 'Kickflip', acc: 4, spd: 4 } }], k); k.t = 1.5;
  S.onEvents([{ type: 'grindEnd', name: '50-50', time: 1.5, why: 'end' }], k);
  S.onEvents([{ type: 'land', quality: 'clean', trick: null, spun: 0, grabs: [] }, { type: 'manualStart', name: 'Manual' }], sk({ state: 'manual', landT: 0 }));
  S.onEvents([{ type: 'manualEnd', name: 'Manual', time: 2.0, clean: true }], k);
  S.addGap({ name: 'Ledge to Pad', value: 400 });
  S.onEvents([{ type: 'land', quality: 'clean', trick: 'Kickflip', acc: 3, spd: 3, spun: 0, grabs: [] }], sk({ landT: 0 }));
  const names = S.combo.tricks.map((t) => t.name + ' ' + t.value).join(' + ');
  S.step(1 / 120, sk({ landT: 0.3 }));
  ok(S.total === 4875, 'the worked example: ' + names + ' + Ledge to Pad 400, ×5 = ' + S.total + ' (the design says 4,875)');
}
/* 40 random combos against the reference */
let s = 4242; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pool = [...TRICKS.flips.map((f) => [f.name, f.base]), ...TRICKS.grabs.map((g) => [g.name, g.base]), ...Object.entries(TRICKS.grinds).map(([n, v]) => [n, v[0]])];
let agree = 0;
for (let c = 0; c < 40; c++) {
  const S = new Score(), seen = new Map(), values = [], gaps = [];
  const n = 1 + Math.floor(rnd() * 9);
  for (let i = 0; i < n; i++) {
    const [name, base] = pool[Math.floor(rnd() * pool.length)], halves = rnd() < 0.3 ? Math.floor(rnd() * 3) : 0, sw = rnd() < 0.2, acc = 1 + Math.floor(rnd() * 5), spd = 1 + Math.floor(rnd() * 5);
    const label = (sw ? 'Switch ' : '') + (halves ? 'FS ' + halves * 180 + ' ' : '') + name, rep = seen.get(label) || 0; seen.set(label, rep + 1);
    S.addTrick(label, base, { halves, switch: sw, acc, spd });
    values.push(Math.round(trickValue(base, { halves, switch: sw, acc, spd, repeat: rep })));
    if (rnd() < 0.2) { const v = 100 + Math.floor(rnd() * 8) * 50; S.addGap({ name: 'gap' + i, value: v }); gaps.push(v); }
  }
  const got = S.bank(), want = comboTotal(values, gaps);
  if (got === want) agree++; else console.log('   combo ' + c + ': banked ' + got + ', the formula says ' + want);
}
ok(agree === 40, '40 random combos bank exactly what the formula says: ' + agree + ' of 40');
/* a bail */
{ const S = new Score(); S.addTrick('Kickflip', 100, {}); S.addTrick('Kickflip', 100, { repeat: 1 }); S.special = 0.6; const before = S.total; S.onEvents([{ type: 'bail' }], sk());
  ok(S.total === before && S.combo === null && S.special === 0 && S.feed.some((f) => f.kind === 'lost'), 'a bail: the combo scores nothing, the special meter empties, the loss is said'); }
/* the special meter */
{ const S = new Score(); for (let i = 0; i < 12; i++) { S.addTrick('Hardflip ' + i, 400, { acc: 5, spd: 5 }); } S.bank();
  ok(S.special >= 1 && S.golden, 'a big combo fills the special meter and turns it golden (' + S.special.toFixed(2) + ', per point ' + SCORING.special.perPoint + ')'); }
console.log(fail ? 'COMBO: RED' : 'COMBO: GREEN'); process.exit(fail ? 1 : 0);
