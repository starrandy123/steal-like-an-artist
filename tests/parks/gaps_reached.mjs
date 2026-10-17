/* EVERY NAMED GAP OF A PARK IS REACHED, ON CRUISE, BY A RUN A PLAYER CAN MAKE (orgo-u-53, 10-16 and 10-17: a gap no run reaches proves nothing
 * about its reach; a run with an injected speed is a physics probe and never proves it). The park's rows are data: GAP_RUNS in
 * tests/parks/<id>.mjs, ridden by tests/parks/gap_ride.mjs with the park's own gap list. It holds:
 *   · every named gap has a row, and no row names a gap the park does not have;
 *   · each row starts rolling (≤ 3 m/s) and stands on the park;
 *   · each row REACHES its gap: found, and its combo banked;
 *   · ℹ how forgiving it is: the pop's mark moved 15 and 30 cm either way, how many of the four still reach it;
 *   · a row marked `reported` (an engine finding, or a threshold under recompute) is ridden and said, never gated — and a reported row that
 *     now reaches its gap says so, so its mark is taken off.
 * Usage: node tests/parks/gaps_reached.mjs <park id> [--plant row|probe|miss]   (each plant must turn the wall RED: the first gap loses its row ·
 * its row starts at 6 m/s, a physics probe · its pop's mark moves 3 m early, so the run misses) */
import { World } from '../../build/js/sim/world.js';
import { parkById } from '../../build/js/parks/index.js';
import { ride, story, ROLLING } from './gap_ride.mjs';

const id = process.argv[2] || 'kilnyard', pi = process.argv.indexOf('--plant'), plant = pi > 0 ? process.argv[pi + 1] || 'row' : null, def = parkById(id);
if (def.id !== id) { console.log(`✖ no park "${id}"`); process.exit(1); }
const world = new World(def.PARK, def.TREES);
let ROWS = [];
try { ROWS = (await import('./' + id + '.mjs')).GAP_RUNS || []; } catch (e) { if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e; }
if (plant === 'row') ROWS = ROWS.slice(1);
if (plant === 'probe') ROWS = [{ ...ROWS[0], speed: 6 }, ...ROWS.slice(1)];
if (plant === 'miss') { const p = ROWS[0].pop, d = p.le != null ? { le: p.le + 3 } : { ge: p.ge - 3 }; ROWS = [{ ...ROWS[0], pop: { axis: p.axis, ...d } }, ...ROWS.slice(1)]; }
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const names = def.GAPS.map((g) => g.name), rowFor = new Map(ROWS.map((r) => [r.gap, r]));
const none = names.filter((n) => !rowFor.has(n)), stray = ROWS.filter((r) => !names.includes(r.gap)).map((r) => r.gap);
ok(!none.length && !stray.length, `${def.name}: every named gap has a row (${names.length} gaps)${none.length ? ' — NO ROW for ' + none.join(', ') : ''}${stray.length ? ' — rows for gaps the park does not have: ' + stray.join(', ') : ''}`);
const said = [], notes = [];   // a gated row's `note`: said under the verdicts, every run (what the row's reach rests on)
for (const r of ROWS.filter((x) => names.includes(x.gap))) {
  const o = ride(world, def.GAPS, r), probe = r.speed > ROLLING;
  const how = `from ${r.at.join(', ')} heading ${r.heading} rolling ${r.speed} m/s${o.popSpeed ? ', popped at ' + o.popSpeed.toFixed(1) + ' m/s' : ''}`;
  /* how forgiving: the mark moved 15 and 30 cm earlier and later */
  let near = '';
  if (r.pop && o.reached) { const m0 = r.pop.le != null ? r.pop.le : r.pop.ge, k = [-0.3, -0.15, 0.15, 0.3].filter((d) => ride(world, def.GAPS, r, m0 + d).reached).length; near = ` · ℹ the mark ±15 and ±30 cm: ${k} of 4 reach it`; }
  const line = `${r.gap} ${how}: ${o.reached ? 'REACHED' : o.found ? 'found, its combo LOST' : 'NOT reached'} — ${story(o.R) || 'nothing happened'}${near}`;
  if (r.reported) { said.push(`ℹ REPORTED (${r.reported}): ${line}${o.reached ? ' · reached today: if what is reported was why it could not be, take the mark off' : ''}`); continue; }
  ok(!probe && !o.stood && o.reached, (probe ? `a physics probe (starts at ${r.speed} m/s, over ${ROLLING}), not a run a player makes — ` : o.stood ? `the start does not stand on the park (${o.stood}) — ` : '') + line);
  if (r.note) notes.push(`ℹ NOTE on ${r.gap} (${r.note})`);
}
for (const s of said) console.log(s);
for (const s of notes) console.log(s);
console.log(fail ? `GAPS REACHED (${def.name}): RED (${fail})` : `GAPS REACHED (${def.name}): GREEN · ${ROWS.length - said.length} reached, ${said.length} reported`);
process.exit(fail ? 1 : 0);
