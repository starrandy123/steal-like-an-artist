/* THE SAME THUMBS, THE SAME RUN, BIT FOR BIT (DESIGN.md §4.1): three scripted 10-minute sessions on the whole park — pushing, carving,
 * every kind of flick, grabs, manuals, grinds where they come, bails and respawns — each run twice; a hash of the whole state every second
 * must match, and a different script must give a different run (the hash is not blind). */
import { rig, flick, pull, swipe, tap } from './lib/rig.mjs';
import { TRICKS } from '../build/js/config.js';

function session(seed, minutes) {
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const starts = [[18, 0, 8, 90], [21, 0, 22.7, 90], [42, 0, 22, 90], [26.2, 0, 8.6, 30], [16.5, 0, 23.4, 90], [30, 0, 17.6, 60]];
  const R = rig({ at: starts[0].slice(0, 3), heading: starts[0][3], speed: 4, seed });
  const hashes = []; const steps = 120;
  let next = 0.4;
  for (let sec = 0; sec < minutes * 60; sec++) {
    for (let i = 0; i < steps; i++) {
      const t = R.ms / 1000;
      if (t >= next) {
        const roll = rnd();
        if (roll < 0.35) R.thumb(flick(TRICKS.flips[Math.floor(rnd() * TRICKS.flips.length)].name, { load: 26 + rnd() * 30, ms: 50 + rnd() * 60 }));
        else if (roll < 0.5) R.thumb(pull(14 + rnd() * 20, 300 + rnd() * 900, rnd() < 0.8 ? 180 : 0));
        else if (roll < 0.6) R.thumb(pull(30 + rnd() * 20, 200 + rnd() * 300, Math.floor(rnd() * 8) * 45 - 180));
        else if (roll < 0.66) R.thumb(swipe(rnd() < 0.5 ? -1 : 1));
        else if (roll < 0.72) R.thumb(tap());
        else if (roll < 0.8) { const st = starts[Math.floor(rnd() * starts.length)]; R.sk.respawnAt(st.slice(0, 3), st[3], 3 + rnd() * 4); }
        R.steer = rnd() < 0.5 ? 0 : (rnd() * 2 - 1); R.throttle = rnd() < 0.3 ? 1 : rnd() < 0.1 ? -1 : 0;
        next = t + 0.35 + rnd() * 1.6;
      }
      R.step(1);
    }
    const k = R.sk; hashes.push([k.state, ...k.p, ...k.v, ...k.fwd, ...k.up, k.needle, R.score.total, R.score.best, k.stats.pops, k.stats.bails].map((x) => typeof x === 'number' ? x.toPrecision(15) : x).join('|'));
  }
  return { hashes, stats: R.sk.stats, total: R.score.total, tricks: R.tricks().length };
}
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
for (const seed of [11, 22, 33]) {
  const t0 = performance.now(), a = session(seed, 10), b = session(seed, 10), ms = performance.now() - t0;
  const first = a.hashes.findIndex((h, i) => h !== b.hashes[i]);
  ok(first < 0, 'script ' + seed + ': 10 minutes twice, ' + a.hashes.length + ' seconds hashed, ' + (first < 0 ? 'identical' : 'they part at second ' + first) + ' · ' + a.stats.pops + ' pops, ' + a.stats.grinds + ' grinds, ' + a.stats.manuals + ' manuals, ' + a.stats.bails + ' bails, ' + a.tricks + ' tricks scored, score ' + a.total + ' (' + (ms / 1000).toFixed(1) + ' s)');
}
const x = session(11, 1), y = session(12, 1);
ok(x.hashes.some((h, i) => h !== y.hashes[i]), 'a different script gives a different run (the hash sees the state)');
console.log(fail ? 'DETERMINISM: RED' : 'DETERMINISM: GREEN'); process.exit(fail ? 1 : 0);
