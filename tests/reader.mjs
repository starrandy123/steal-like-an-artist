/* THE FLICK READER ON SYNTHETIC THUMBS (DESIGN.md §3.2): the build's own Reader, 11 tricks × 300 thumbs at each sample rate and wobble.
 * The bar (DESIGN §1 row 3): ≥ 95 % read right at σ 6°, ≥ 90 % at σ 10°, ≥ 99 % of strokes pop — at 60, 120 and 240 Hz. σ 15° is said, not held. */
import { Reader } from '../build/js/input/reader.js';
import { thumbs } from './lib/thumbs.mjs';
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const N = 300, rows = [];
for (const hz of [60, 120, 240]) for (const sigma of [6, 10, 15]) {
  const { CLASSES, thumb } = thumbs(1000 + hz * 7 + sigma);
  let right = 0, popped = 0, total = 0; const lat = [], miss = {};
  for (const cls of Object.keys(CLASSES)) for (let i = 0; i < N; i++) {
    const { samples, strokeAt } = thumb(cls, hz, sigma), r = new Reader({ streamlined: false });
    r.down(samples[0].t, samples[0].x, samples[0].y); for (let k = 1; k < samples.length; k++) r.move(samples[k].t, samples[k].x, samples[k].y);
    const last = samples[samples.length - 1]; r.up(last.t + 1, last.x, last.y);
    const ev = r.drain(), pop = ev.find((e) => e.type === 'pop'), tr = ev.find((e) => e.type === 'trick'); total++;
    if (pop) { popped++; lat.push(pop.t - strokeAt); }
    if (tr && tr.name === cls) right++; else { const k = cls + ' → ' + (tr ? tr.name : 'nothing'); miss[k] = (miss[k] || 0) + 1; }
  }
  lat.sort((a, b) => a - b);
  rows.push({ hz, sigma, acc: right / total, pops: popped / total, med: lat[lat.length >> 1], p90: lat[Math.floor(lat.length * 0.9)], miss });
}
for (const r of rows) {
  const top = Object.entries(r.miss).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + ' ×' + v).join(', ');
  const line = r.hz + ' Hz σ ' + r.sigma + '°: ' + (r.acc * 100).toFixed(1) + '% read right, ' + (r.pops * 100).toFixed(1) + '% popped, the pop ' + r.med.toFixed(0) + ' / ' + r.p90.toFixed(0) + ' ms after the stroke began (median / p90)' + (top ? ' · most missed: ' + top : '');
  if (r.sigma === 15) console.log('  ' + line); else ok(r.acc >= (r.sigma === 6 ? 0.95 : 0.90) && r.pops >= 0.99, line);
}
console.log(fail ? 'READER: RED' : 'READER: GREEN'); process.exit(fail ? 1 : 0);
