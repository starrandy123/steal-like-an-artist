/* THE SIM NEVER THROWS (10-17, the owner: "The character doesn't respawn upon falling"): a throw inside a sim step is a throw inside the page's
 * frame (main.js tick), and the frame never asks for the next one — the game stands still where it was, the body down, nothing coming back.
 * Round 25's seat threw so (the settle's starting attitude left unset when the landing's first seat went the edge's hold path, read by the
 * seat's own second reading): no wall had seen it, because no wall had ridden that ride. So this one rides MANY: from every node of every
 * park, on each preset, with a random thumb (steering, pushing, pops at random strengths), over several seeds — and on any throw names the
 * park, the preset, the node, the seed, the moment and the first frames of the sim it came from. Nothing is caught or held for it: a ride
 * that throws is RED.
 *   node tests/never_throws.mjs [seeds = 4]
 * Plants (tests/plants.mjs): seat_from_unset → RED. */
import { rig } from './lib/rig.mjs';
import { World } from '../build/js/sim/world.js';
import { PARKS } from '../build/js/parks/index.js';

const SEEDS = +(process.argv[2] || 4), SECONDS = 20;
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const thrown = []; let rides = 0, steps = 0, bails = 0, respawns = 0;
for (const P of PARKS) {
  const world = new World(P.PARK, P.TREES);
  for (let seed = 1; seed <= SEEDS; seed++) {
    let r = seed * 7919; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    for (const preset of ['cruise', 'classic', 'raw']) for (const [x, y, z, hd] of world.data.nodes) {
      const R = rig({ preset, world, at: [x, y, z], heading: hd + (rnd() - 0.5) * 90, speed: 3 + rnd() * 6, seed }), sk = R.sk; rides++;
      let steerT = 0, nextPop = 0.5 + rnd();
      try {
        for (let i = 0; i < SECONDS * 120; i++) {
          const t = i / 120;
          if (t > steerT) { R.steer = (rnd() - 0.5) * 1.8; R.throttle = rnd() < 0.7 ? 1 : 0; steerT = t + 0.3 + rnd(); }
          if (t > nextPop) { R.keys = (R.keys || []).concat([{ type: 'pop', load: 0.3 + rnd() * 0.7, spd: 2 + rnd() * 2, acc: 2 + rnd() * 2 }]); nextPop = t + 0.5 + rnd() * 1.5; }
          R.step(1); steps++;
          for (const e of sk.events) { if (e.type === 'bail') bails++; if (e.type === 'respawn') respawns++; }
        }
      } catch (e) {
        const frames = String(e.stack || '').split('\n').filter((l) => /build\/js\//.test(l)).slice(0, 4).map((l) => l.trim().replace(/^at /, '').replace(/\(?file:\/\/.*\/build\/js\//, '').replace(/\)$/, ''));
        thrown.push(P.id + ' · ' + preset + ' · from [' + [x, y, z].map((q) => +q.toFixed(1)) + '] · seed ' + seed + ' at ' + sk.t.toFixed(2) + ' s (' + sk.state + '): ' + e.message + ' — ' + frames.join(' ← '));
      }
    }
  }
}
ok(thrown.length === 0, 'THE SIM NEVER THROWS: ' + rides + ' rides of ' + SECONDS + ' s on ' + PARKS.map((p) => p.name || p.id).join(' and ') + ' (every node, each preset, ' + SEEDS + ' seeds of a random thumb: ' + steps + ' steps, ' + bails + ' falls, ' + respawns + ' back up) — ' + thrown.length + ' threw' + (thrown.length ? ':' : ''));
for (const t of thrown.slice(0, 8)) console.log('    ' + t);
console.log(fail ? 'NEVER THROWS: RED' : 'NEVER THROWS: GREEN'); process.exit(fail ? 1 : 0);
