/* THE CLIP IS DRAWN AT ONE PHASE, EVERY TIME (10-17): two page loads of the same clips (each drive's CLIPS_DUMP) must draw the same frames —
 * the drawn deck within 1 mm and the chest within 0.5° at every frame of every clip both made. Read: node tests/drive/clip_twice.mjs <a> <b>
 * (tests/drive/clips_landing.mjs places every clip at the clock's alpha 0.5; a page drawn at another phase draws the sim between other steps). */
import fs from 'node:fs';
const read = (f) => new Map(fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((c) => [c.name, c.frames]));
const A = read(process.argv[2]), B = read(process.argv[3]), bad = [], said = [];
for (const [name, fa] of A) {
  const fb = B.get(name); if (!fb) continue;
  let db = { v: 0 }, dq = { v: 0 };
  for (let i = 0; i < Math.min(fa.length, fb.length); i++) {
    const d = Math.hypot(fa[i].b[0] - fb[i].b[0], fa[i].b[1] - fb[i].b[1], fa[i].b[2] - fb[i].b[2]); if (d > db.v) db = { v: d, i };
    const x = fa[i].q, y = fb[i].q, ang = 2 * Math.acos(Math.min(1, Math.abs(x[0] * y[0] + x[1] * y[1] + x[2] * y[2] + x[3] * y[3]))) * 180 / Math.PI; if (ang > dq.v) dq = { v: ang, i };
  }
  const line = name + ': the deck ' + (1000 * db.v).toFixed(2) + ' mm apart at most (frame ' + (db.i ?? '-') + '), the chest ' + dq.v.toFixed(2) + '° (frame ' + (dq.i ?? '-') + ')';
  (db.v > 0.001 || dq.v > 0.5 ? bad : said).push(line);
}
const n = bad.length + said.length;
console.log((bad.length || !n ? '✖ ' : '✔ ') + 'THE CLIP IS DRAWN AT ONE PHASE, EVERY TIME: ' + (n ? (bad.length ? bad.join(' · ') : said.join(' · ')) : 'no clip in both loads'));
process.exit(bad.length || !n ? 1 : 0);
