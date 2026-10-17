/* a design aid (not a wall): HOW WIDE IS A GAP'S WINDOW. One line ridden as tests/parks/gap_ride.mjs rides a GAP_RUNS row (the same code the
 * wall runs), with the pop's mark swept along it in small steps; the marks that REACH the gap (found, its combo banked) printed as windows: in
 * metres along the line, and in the milliseconds a player is given at the speed the board has at the pop.
 *   node runs/gap_window.mjs <park> '<json: [{ gap, at, heading, speed, axis, from, to, step?, push?, grab?, pull?, out?, secs?, pop? }, ...]>'
 *   axis 0|2 is the coordinate the mark reads; from → to the marks (le when from > to, ge when from < to); pop: false rides with no pop */
import { World } from '../build/js/sim/world.js';
import { parkById } from '../build/js/parks/index.js';
import { ride, story } from '../tests/parks/gap_ride.mjs';
const [id, json] = process.argv.slice(2), D = parkById(id), world = new World(D.PARK, D.TREES);
for (const L of JSON.parse(json || '[]')) {
  const le = L.from > L.to, row = { ...L, push: L.push ? true : false, pop: L.pop === false ? null : { axis: L.axis, [le ? 'le' : 'ge']: L.from } };
  const step = L.step || 0.05, n = row.pop ? Math.round(Math.abs(L.to - L.from) / step) : 0, dir = Math.sign(L.to - L.from), hits = [];
  let last = null, lost = 0;
  for (let k = 0; k <= n; k++) {
    const v = +(L.from + dir * k * step).toFixed(3), o = ride(world, D.GAPS, row, row.pop ? v : null); hits.push([v, o.reached]);
    if (o.found && !o.reached) { lost++; last = story(o.R) + ' (found, its combo LOST)'; } else if (!o.reached && !last) last = story(o.R);
  }
  const wins = []; let cur = null;
  for (const [v, f] of hits) { if (f) { if (!cur) cur = [v, v]; cur[1] = v; } else if (cur) { wins.push(cur); cur = null; } }
  if (cur) wins.push(cur);
  const mid = wins.length ? wins.reduce((m, w) => (Math.abs(w[1] - w[0]) > Math.abs(m[1] - m[0]) ? w : m)) : null;
  const centre = mid ? +((mid[0] + mid[1]) / 2).toFixed(2) : null, cr = centre != null ? ride(world, D.GAPS, row, row.pop ? centre : null) : null;
  const vPop = (cr && cr.popSpeed) || L.speed, at = cr ? story(cr.R) : last;
  const say = !row.pop ? 'one ride' : wins.map(([a, b]) => `${a}…${b} (${(Math.abs(b - a) + step).toFixed(2)} m, ${Math.round((Math.abs(b - a) + step) / vPop * 1000)} ms at ${vPop.toFixed(1)} m/s)`).join(' · ');
  console.log(`${L.gap} · from ${L.at.join(',')} heading ${L.heading} at ${L.speed} m/s${row.push ? ' · pushing' : ''}${L.grab ? ' · grab' : ''}${L.pull ? ' · pull' : ''}${L.out != null ? ' · out ' + L.out + ' s' : ''}${!row.pop ? ' · no pop' : ''}${lost ? ' · found and LOST on ' + lost + ' of ' + (n + 1) : ''}: ${wins.length ? 'REACHED ' + say + (row.pop ? ' — the widest window\'s middle ' + centre : '') + ': ' + at : 'NOT REACHED' + (row.pop ? ' (' + L.from + ' → ' + L.to + ')' : '') + ' — ' + (last || '')}`);
}
