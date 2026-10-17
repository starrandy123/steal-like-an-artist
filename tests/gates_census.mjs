/* THE GATES' CENSUS (the supervisor, 10-16: "Check your own walls for any trigger that can no longer fire: a gate whose case never happens
 * passes for nothing" — his own lost_pop probe had gone silent on two builds, its trigger gone with M6). A gate proven only by passing has
 * never been seen to fail. This reads a round's own records, exactly:
 *   · the CLEAN runs: every Node wall's whole output (runs/<n>/node/<wall>.log, kept by run_all.sh under NODE_OUT) and every drive's log
 *     (runs/<n>/<drive>/<drive>_<view>.log);
 *   · each PLANTED run: the same instrument's whole output, kept in runs/<n>/plants/<plant>/ under the same file name;
 *   · a gate is a ✔ or ✖ line (its mark at either end), named by its text with the numbers masked (so a reading does not change its name);
 *   · PROVEN: some plant's own run shows the gate ✖ where the clean run shows it ✔ — that plant turned THIS gate RED;
 *   · UNPROVEN: a clean gate no plant has turned RED — each named, owed a plant (or the finding that its case cannot happen);
 *   · a plant whose run turned NO clean gate RED is said too (its catch was a line, not a gate).
 * Usage: node tests/gates_census.mjs <round dir>      (exit 1 when a plant turned no gate RED) */
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const R = process.argv[2];
/* ITS OWN PROOF, both ways, on a round of its own making: gate A turned RED by plant p1 (proven), gate B never (unproven), plant p2 whose run
   is the clean run (it turned nothing: RED) — run first, unless this IS that run */
if (!process.env.CENSUS_SELF && R !== '--self') {
  const T = mkdtempSync(join(tmpdir(), 'census-')); mkdirSync(join(T, 'node')); mkdirSync(join(T, 'plants', 'p1'), { recursive: true }); mkdirSync(join(T, 'plants', 'p2')); mkdirSync(join(T, 'plants', 'p3'));
  writeFileSync(join(T, 'node', 'x.mjs.log'), '✔ gate A: 1 run\n✔ gate B: 2 runs\nX: GREEN\n');
  writeFileSync(join(T, 'plants', 'p1', 'x.log'), '✖ gate A: 9 runs\n✔ gate B: 2 runs\nX: RED\n'); writeFileSync(join(T, 'plants', 'p2', 'x.log'), '✔ gate A: 1 run\n✔ gate B: 2 runs\nX: GREEN\n');
  writeFileSync(join(T, 'plants', 'p3', 'x.log'), '✖ gate A: 9 runs\n✖ A RED GATE NAMES ITS FRAME: the gate above handed the chain "1.2 s", which names no frame\n✔ gate B: 2 runs\nX: RED\n');
  writeFileSync(join(T, 'plants', 'PLANTS.log'), '✔ p1 (x.mjs, 0 s): RED · ✖ gate A: 9 runs\n✔ p2 (x.mjs, 0 s): RED · X: GREEN\n✔ p3 (x.mjs, 0 s): RED · ✖ gate A: 9 runs\n');
  const r = spawnSync(process.execPath, [new URL(import.meta.url).pathname, T], { env: { ...process.env, CENSUS_SELF: '1' }, encoding: 'utf8' }); rmSync(T, { recursive: true, force: true });
  const out = r.stdout || '', good = /1 turned RED by a plant/.test(out) && /UNPROVEN x · gate B/.test(out) && /TURNED NO GATE RED: p2/.test(out) && /RED GATE NAMED NO FRAME: p3/.test(out) && !/NAMED NO FRAME: p1/.test(out) && r.status === 1;
  console.log((good ? '✔ ' : '✖ ') + 'THE CENSUS ON A ROUND OF ITS OWN MAKING: a gate a plant turned RED read as proven, a gate none turned as unproven, a plant that turned nothing as RED, and a plant whose red gate named no frame as RED');
  if (!good) { console.log(out); process.exit(1); }
}
if (!R || !existsSync(join(R, 'node'))) { console.log('usage: node tests/gates_census.mjs <round dir holding node/ (run_all.sh with NODE_OUT), its drives\' folders and plants/>'); process.exit(2); }
const norm = (line) => line.replace(/[✔✖]/g, '').replace(/^[\s·↳-]+/, '').replace(/[-+]?\d[\d,.]*/g, '#').replace(/\s+/g, ' ').trim();
/* a gate's mark: at the line's start, or after two spaces anywhere in it (the camera's walls say "<gate>  ✖ — <its cases>") */
const isGate = (l) => /^\s*[·]?\s*[✔✖]\s/.test(l) || /\s\s[✔✖](\s|$)/.test(l);
const nameOf = (line) => norm(line).split(/: | — /)[0].slice(0, 100);
/* a run's gates: its ✔ and ✖ lines, and a drive's own verdict ("DRIVE: GREEN" / "DRIVE: RED": the drives say their checks there) */
const gatesOf = (file) => { const m = new Map(); for (const l of readFileSync(file, 'utf8').split('\n')) {
  if (/^DRIVE: (GREEN|RED)/.test(l)) { m.set('DRIVE (the drive\'s own verdict)', /^DRIVE: GREEN/.test(l)); continue; }
  /* (a second gate with the same short name gets its longer one — the camera wall says three gates a preset, each "the board on Classic: …":
     named by the words before the first colon alone, only the first was ever read, and three plants caught on the others read as idle) */
  if (isGate(l)) { let n = nameOf(l); if (m.has(n)) n = norm(l).split(/ — /)[0].slice(0, 140); if (!m.has(n)) m.set(n, l.includes('✖') ? false : true); } } return m; };
/* the clean runs, by file name */
const clean = new Map();
/* (a Node wall's clean output is kept as <wall>.mjs.log by run_all.sh — <wall>.mjs_--plants.log for one run with a flag — and a plant keeps
   it as <wall>.log: one name for both) */
for (const f of readdirSync(join(R, 'node')).filter((x) => x.endsWith('.log'))) { const key = f.replace(/\.mjs(_--\w+)?\.log$/, '.log');
  if (key !== f && readdirSync(join(R, 'node')).includes(key)) continue;   // a wall's flagless clean run (what its plants ran) wins over its flagged one
  clean.set(key, gatesOf(join(R, 'node', f))); }
/* the drives: each folder's logs, by their own names, and by the drive's SCRIPT's name too (a plant keeps <script>_<view>.log; the round's
   folder can be named otherwise — sound_drive runs sound.mjs), read off the round's own round.sh */
const tree = join(R, '..', '..'), scriptOf = {};
if (existsSync(join(tree, 'tests', 'round.sh'))) for (const m of readFileSync(join(tree, 'tests', 'round.sh'), 'utf8').matchAll(/^drive (\S+) (\S+)\.mjs /gm)) scriptOf[m[1]] = m[2];
for (const d of readdirSync(R)) { const p = join(R, d); if (d === 'node' || d === 'plants' || !statSync(p).isDirectory()) continue;
  for (const f of readdirSync(p).filter((x) => x.endsWith('.log'))) { const g = gatesOf(join(p, f)); if (!clean.has(f)) clean.set(f, g);
    if (scriptOf[d] && f.startsWith(d + '_')) { const alias = scriptOf[d] + f.slice(d.length); if (!clean.has(alias)) clean.set(alias, g); } } }
/* the planted runs */
const proven = new Map(), idle = [], reported = [], P = join(R, 'plants');
/* a plant the runner says was caught on a REPORTED reading (not a gate yet) proves that reading, not a gate: said apart */
const caughtHow = {}; if (existsSync(join(P, 'PLANTS.log'))) for (const l of readFileSync(join(P, 'PLANTS.log'), 'utf8').split('\n')) { const m = l.match(/^✔ (\S+) \([^)]*\): (.*)$/); if (m) caughtHow[m[1]] = m[2]; }
/* EVERY RED GATE NAMES ITS FRAME (10-17, the supervisor's class): in any plant's run, a red gate that handed the chain words naming no frame says
   so on its own line (tests/surfaces.mjs, tests/motion_sweep.mjs okB) — an instrument fault wherever it shows, unless that line IS the plant's catch */
const namedNone = [];
for (const plant of existsSync(P) ? readdirSync(P).filter((d) => statSync(join(P, d)).isDirectory()) : []) {
  if (!/A RED GATE NAMES ITS FRAME/.test(caughtHow[plant] || '') && readdirSync(join(P, plant)).filter((x) => x.endsWith('.log')).some((f) => /✖ A RED GATE NAMES ITS FRAME/.test(readFileSync(join(P, plant, f), 'utf8')))) namedNone.push(plant);
  let turned = 0;
  for (const f of readdirSync(join(P, plant)).filter((x) => x.endsWith('.log'))) {
    const c = clean.get(f); if (!c) continue;
    for (const [name, okNow] of gatesOf(join(P, plant, f))) {
      if (okNow) continue;
      /* the same gate in the clean run: by its masked name, or (a failing gate can say more than its numbers — "39 classified; NOT …") the
         clean gate sharing the longest opening with it, twenty characters at least */
      let hit = c.get(name) === true ? name : null;
      if (!hit) { let bestN = 0; for (const [cn, cok] of c) { if (!cok) continue; let i = 0; while (i < cn.length && i < name.length && cn[i] === name[i]) i++; if (i > bestN) { bestN = i; hit = cn; } } if (bestN < 20) hit = null; }
      if (hit) { const k = f + ' · ' + hit; (proven.get(k) || proven.set(k, []).get(k)).push(plant); turned++; }
    }
  }
  if (!turned) (/^CAUGHT ON A REPORTED READING/.test(caughtHow[plant] || '') ? reported : idle).push(plant);
}
let n = 0; const unproven = [];
for (const [f, m] of clean) for (const [name, ok] of m) { if (!ok) continue; n++; if (!proven.has(f + ' · ' + name)) unproven.push(f.replace(/\.log$/, '') + ' · ' + name); }
console.log('GATES: ' + n + ' clean gates in ' + clean.size + ' runs (Node walls and drives) · ' + (n - unproven.length) + ' turned RED by a plant of this round · ' + unproven.length + ' never seen to fail');
for (const u of unproven) console.log('  · UNPROVEN ' + u);
for (const p of reported) console.log('  ℹ A PLANT THAT PROVES A REPORTED READING, NOT A GATE: ' + p);
for (const p of idle) console.log('  ✖ A PLANT THAT TURNED NO GATE RED: ' + p + ' (its catch was a line, not a gate; or its run left no log)');
for (const p of namedNone) console.log('  ✖ A PLANT\'S RED GATE NAMED NO FRAME: ' + p + ' (a gate handed the chain words that name no frame: where it starts went unread)');
const bad = idle.length + namedNone.length;
console.log('GATES CENSUS: ' + (bad ? 'RED · ' + [idle.length ? idle.length + ' plants turned no gate RED' : '', namedNone.length ? namedNone.length + ' with a red gate that named no frame' : ''].filter(Boolean).join(' · ') : 'GREEN') + ' · ' + unproven.length + ' unproven, each owed a plant (or the finding that its case cannot happen)');
process.exit(bad ? 1 : 0);
