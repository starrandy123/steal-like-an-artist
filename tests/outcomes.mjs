/* THE LANDINGS KEEP THEIR OUTCOMES (10-17, the supervisor on the in-air turn law: "THE OUTCOMES, measured before the freeze, every air × every
 * preset on the old law and the new: clean / sketchy / bail per case. No clean landing may turn sketchy or bail; any change goes on its row
 * with its case"). The coping set (tests/lib/copingset.mjs) ridden 6 s with nothing held on each assist — every landing in order (its
 * quality), every grind, every bail that is not a landing's — against the outcomes recorded for a release (tests/baselines/outcomes.json,
 * which names it). The first place a ride differs is classified: a landing that comes down WORSE (clean → sketchy or a bail, sketchy → a
 * bail, a landing → a bail of another kind) is RED unless that very row is on the named list below, with its case; one that comes down better,
 * or a ride that changes otherwise (one more air, a grind for a landing), is said. What follows a ride's first difference is a different
 * ride: listed, never classified. A release's outcomes, once accepted, are recorded from its tree:
 *   node tests/outcomes.mjs --record <release>
 * Plants (tests/plants.mjs): drop_in_unshared, up_paced → RED. */
import fs from 'node:fs';
import { rig } from './lib/rig.mjs';
import { CASES } from './lib/copingset.mjs';

const FILE = new URL('./baselines/outcomes.json', import.meta.url);
/* THE NAMED ROWS: a landing that comes down worse than the baseline and is known, each with its case (the supervisor rules on each) */
const NAMED = [];

const ride = (preset, c) => {
  const R = rig({ preset, at: c.at, heading: c.heading, speed: c.speed }), sk = R.sk, seq = [];
  for (let i = 0; i < 6 * 120; i++) {
    R.step(1);
    for (const e of sk.events) { if (e.type === 'land') seq.push(e.quality); else if (e.type === 'bail' && e.why !== 'landing') seq.push('bail:' + e.why); else if (e.type === 'grindStart') seq.push('grind'); }
    if (sk.events.some((e) => e.type === 'respawn')) break;
  }
  return seq;
};
const now = {};
for (const preset of ['cruise', 'classic', 'raw']) for (const c of CASES) now[preset + ' · ' + c.name] = ride(preset, c);

const rec = process.argv.indexOf('--record');
if (rec >= 0) {
  const release = process.argv[rec + 1]; if (!release) { console.log('✖ --record needs the release it records (e.g. r25)'); process.exit(1); }
  fs.writeFileSync(FILE, JSON.stringify({ release, at: new Date().toISOString().slice(0, 10), rides: now }, null, 1) + '\n');
  console.log('recorded ' + Object.keys(now).length + ' rides as ' + release + ' → tests/baselines/outcomes.json'); process.exit(0);
}
const base = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const rank = { clean: 0, sketchy: 1, bail: 2 }, rows = { worse: [], named: [], better: [], change: [] };
for (const [k, b] of Object.entries(base.rides)) {
  const a = now[k]; if (!a) { rows.change.push({ k, say: 'not ridden now' }); continue; }
  if (JSON.stringify(a) === JSON.stringify(b)) continue;
  let i = 0; while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  const was = i < b.length ? b[i] : '(nothing)', is = i < a.length ? a[i] : '(nothing)';
  const say = k + ', landing ' + (i + 1) + ': ' + b.join(' ') + '  →  ' + a.join(' ');
  let kind = 'change';
  if (was in rank && is in rank) kind = rank[is] > rank[was] ? 'worse' : 'better';
  else if (was in rank && is.startsWith('bail:')) kind = 'worse';
  else if (was.startsWith('bail:') && is in rank) kind = 'better';
  const [preset, name] = k.split(' · '), nm = NAMED.find((n) => n.preset === preset && n.name === name && n.landing === i + 1 && n.was === was && n.now === is);
  if (kind === 'worse' && nm) rows.named.push({ k, say, why: nm.why }); else rows[kind].push({ k, say });
}
const unread = NAMED.filter((n) => !rows.named.some((r) => r.k === n.preset + ' · ' + n.name));
ok(rows.worse.length === 0 && unread.length === 0, 'THE LANDINGS KEEP THEIR OUTCOMES: every landing of the coping set on each assist (' + Object.keys(base.rides).length + ' rides, nothing held) against ' + base.release + '\'s — ' + rows.worse.length + ' come down worse unnamed' + (rows.worse.length ? ': ' + rows.worse.slice(0, 6).map((r) => r.say).join(' · ') : '') + ' · ' + rows.named.length + ' named' + (unread.length ? ' · ' + unread.length + ' named row' + (unread.length === 1 ? '' : 's') + ' no longer read (remove it, or the ride changed again): ' + unread.map((n) => n.preset + ' ' + n.name).join(', ') : '') + ' · ' + rows.better.length + ' better · ' + rows.change.length + ' changed otherwise');
for (const r of rows.named) console.log('  ⚠ NAMED — ' + r.say + ' — ' + r.why);
for (const r of rows.better) console.log('  ℹ better — ' + r.say);
for (const r of rows.change) console.log('  ℹ changed — ' + r.say);
console.log(fail ? 'OUTCOMES: RED' : 'OUTCOMES: GREEN'); process.exit(fail ? 1 : 0);
