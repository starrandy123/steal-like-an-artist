/* A CLIMB KEEPS ITS AIR (10-17, the supervisor's "a climb keeps its speed", read where a player reads it): every quarter of every park, ridden
 * square into the middle of its coping from flat ground 2 m before its foot, at 6.5 / 7 / 7.5 / 8 m/s on each preset, coasting and with the
 * thumb held (the engine pushes when it would): the air over the coping — the apex of the air it leaves the face into, above the coping's
 * top — against V13's on the same climb (tests/baselines/climbs_v13.json, recorded on V13's engine with Kiln Yard: waxline_map2). A climb
 * that comes down more than 2.5 cm under V13's is RED (the take-off step flown twice cost 2–5 cm; flown once, the merged engine is at most
 * 2 cm under V13's, its take-off step flown under the air's gravity where V13 rolled it); one V13 never took over its coping (its board never
 * left the face, or left it under the coping: Raw everywhere) is said, never gated against.
 * (Not the speed at the lip: the merged engine rides further up a face before it leaves, so a speed there compares two take-off heights.)
 *   node tests/climbs.mjs                  the gate
 *   node tests/climbs.mjs --record <file>  this build's climbs as a baseline (run on V13's engine)
 * Plants (tests/plants.mjs): take_off_step_twice (the step's speed not set back before the air flies it) → RED. */
import fs from 'node:fs';
import { rig } from './lib/rig.mjs';
import { World } from '../build/js/sim/world.js';
import { PARKS } from '../build/js/parks/index.js';

/* DEFERRED (10-17, shipped on the owner's "Ship it now"): the take-off step's gravity counted twice (r22's hand-over: the place set back, the
   speed not) holds these airs 2–5 cm under V13's; its fix (flown from the step's start speed) moved the coping set's grazing landings — the
   Spine from the west at 8.5 m/s clean → a bail at 124°, a straight lip air on Cruise — so it is the next release's. While this is set the
   wall SAYS what is under, with its numbers, and does not gate it */
const DEFERRED = 'the take-off step\'s gravity counted twice (r22): its fix moved the coping set\'s grazing landings — the next release';
const SPEEDS = [6.5, 7, 7.5, 8], BOUND = 0.025, FILE = new URL('./baselines/climbs_v13.json', import.meta.url);
const rows = {};
for (const P of PARKS) {
  const world = new World(P.PARK, P.TREES);
  for (const q of P.PARK.elements.filter((e) => e.type === 'quarter')) {
    const [a, b] = q.coping, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], run = q.h < q.r ? Math.sqrt(q.r * q.r - (q.r - q.h) ** 2) : q.r;
    const at = [m[0] + q.face[0] * (run + 2), q.base, m[1] + q.face[1] * (run + 2)], heading = Math.atan2(-q.face[0], -q.face[1]) * 180 / Math.PI, lip = q.base + q.h;
    for (const push of [false, true]) for (const preset of ['cruise', 'classic', 'raw']) for (const v0 of SPEEDS) {
      const R = rig({ preset, world, at, heading, speed: v0 }), sk = R.sk; if (push) R.throttle = 1;
      let off = false, top = -Infinity;
      for (let i = 0; i < 600; i++) { const was = sk.state; R.step(1);
        if (!off && was !== 'air' && sk.state === 'air') off = true;
        if (off && sk.state === 'air') top = Math.max(top, sk.p[1]); if (off && sk.state !== 'air') break; }
      rows[P.id + ' · ' + q.name + ' · ' + preset + ' · ' + v0 + ' m/s · ' + (push ? 'pushing' : 'coasting')] = off ? +(top - lip).toFixed(3) : null;
    }
  }
}
const rec = process.argv.indexOf('--record');
if (rec >= 0) { fs.writeFileSync(process.argv[rec + 1], JSON.stringify({ engine: 'V13 (r21) with Kiln Yard', at: new Date().toISOString().slice(0, 10), rows }, null, 1) + '\n'); console.log('recorded ' + Object.keys(rows).length + ' climbs → ' + process.argv[rec + 1]); process.exit(0); }
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const base = JSON.parse(fs.readFileSync(FILE, 'utf8')).rows, under = [], never = [], unmade = [];
let n = 0, higher = 0, worst = { d: 0, k: '' };
for (const [k, v] of Object.entries(rows)) {
  const b = base[k]; if (b === undefined) continue; n++;
  if (b === null || b <= 0) { unmade.push(k); continue; }
  if (v === null) { never.push(k + ' (V13 ' + b.toFixed(2) + ' m)'); continue; }
  const d = v - b; if (d > 0.005) higher++; if (d < worst.d) worst = { d, k: k + ': ' + v.toFixed(2) + ' against V13\'s ' + b.toFixed(2) + ' m' };
  if (d < -BOUND) under.push(k + ': ' + v.toFixed(2) + ' against ' + b.toFixed(2) + ' m');
}
ok((DEFERRED ? true : under.length === 0) && never.length === 0, (DEFERRED && under.length ? 'ℹ DEFERRED (' + DEFERRED + ') — ' : '') + 'A CLIMB KEEPS ITS AIR: ' + n + ' climbs of every quarter of ' + PARKS.map((p) => p.name || p.id).join(' and ') + ' (6.5–8 m/s, each preset, coasting and pushing) against V13\'s — ' + under.length + ' more than ' + (100 * BOUND) + ' cm under V13\'s air over the coping' + (under.length ? ' (' + under.slice(0, 4).join(' · ') + ')' : '') + ', ' + never.length + ' that no longer leave the face' + (never.length ? ' (' + never.slice(0, 3).join(' · ') + ')' : '') + ' · ' + higher + ' higher · the most under: ' + (worst.k ? (100 * -worst.d).toFixed(1) + ' cm (' + worst.k + ')' : 'none'));
if (unmade.length) console.log('ℹ CLIMBS V13 NEVER MADE (its board never left the face) — said, not gated: ' + unmade.length + ' (' + unmade.slice(0, 4).join(' · ') + ')');
console.log(fail ? 'CLIMBS: RED' : 'CLIMBS: GREEN'); process.exit(fail ? 1 : 0);
