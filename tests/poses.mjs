/* THE SITES THAT SET THE BOARD'S ATTITUDE (10-17, the supervisor's ruling 2: "every site that sets the board's pose from a face reads the ground
 * under each truck, with a class wall on the source"). Every line of build/js/sim/body.js that sets the board's up — `V.copy(this.up, `,
 * `V.norm(this.up, `, `this.up = ` — is on a row of this census (it holds one of the row's anchors): a new one is RED until it is classified;
 * every row's anchors are found as many times as it says; and a row that sets the attitude FROM ONE FACE hands it to the seat — `attach()`
 * on its own path, before that path returns or its function ends: the seat on the plane of every wheel's own ground, read where the wheels
 * are (the support sweep, tests/support.mjs, reads it at every edge of the park). The classes:
 *   the seat — the plane of the wheels' own ground (attach) ·
 *   from one face, then the seat — none since the seat never sets (10-17, ruling 1 (A)): a landing keeps the up it met the face with and
 *   the seat settles it (attach, this.settle); a row of this class must reach attach() on its own path ·
 *   a contact's own turn — a pivot about the middle that rests one wheel or the deck on its face (the touchdown's, the push-out's) ·
 *   the plan — in the air, toward the landing guess (formulas/follow.js planned) · the set-back — between two poses the step had ·
 *   the roll-in — the leading pair lowered onto the wall about the back axle (its own probes) · a placement — a respawn (its next roll step's
 *   seat reads each wheel) · the rail's — on a rail's line, no face.
 *   node tests/poses.mjs [--table]
 * Plants (tests/plants.mjs): pose_unclassified (the up set from a face on the ground, no seat) → RED. */
import fs from 'node:fs';

const LINES = fs.readFileSync(new URL('../build/js/sim/body.js', import.meta.url), 'utf8').split('\n');
const PATTERN = /V\.copy\(this\.up, |V\.norm\(this\.up, |this\.up = /;
const CENSUS = [
  { site: 'the constructor: the board made upright', class: 'a placement', anchors: ['this.p = [0, 0, 0]; this.v = [0, 0, 0]; this.up = [0, 1, 0]; this.fwd = [0, 0, 1];'] },
  { site: 'respawnAt: on the ground\'s normal under the spot (its next roll step\'s seat reads each wheel)', class: 'a placement', anchors: ['V.copy(this.up, h ? h.normal : Y);'] },
  { site: 'attach: the seat on the plane of the wheels\' own ground, read where they are (to its own fixed point)', class: 'the seat', anchors: ['V.copy(this.up, newUp);'] },
  { site: 'lowerOnto: the roll-in, the leading pair turned down onto the wall about the back axle', class: 'the roll-in', anchors: ['V.copy(this.p, p); V.copy(this.up, up); V.copy(this.fwd, fwd);'] },
  { site: 'stepAir: the up planned toward the landing guess (the planned turn, at a rider\'s pace)', class: 'the plan', anchors: ['if (ul > 1e-9) V.norm(this.up, V.rotate(this.up, target, V.scale(S[13], [s.u.x, s.u.y, s.u.z], 1 / ul), ul)); else V.copy(this.up, target);'] },
  { site: 'atFree: set back to a contact\'s moment, between the step\'s two poses', class: 'the set-back', anchors: ['V.lerp(this.p, before, fe.p, s); V.norm(this.up, V.lerp(this.up, f0.up, fe.up, s));'] },
  { site: 'wheelsInAir / wheelsOut: a pivot about the middle resting a wheel or the deck on its face (said: airTouch)', class: 'a contact\'s own turn', anchors: [['V.norm(this.up, V.rotate(this.up, this.up, ax, th)); V.norm(this.fwd, V.reject(this.fwd, V.rotate(this.fwd, this.fwd, ax, th), this.up)); this.airTouch++;', 3]] },
  { site: 'placeOnRail: on the rail\'s line, its up off the chord between its trucks', class: 'the rail\'s', anchors: ['    V.copy(this.up, up);\n'] },
  { site: 'the catch on a rail: the attitude eased from its own to the rail\'s', class: 'the rail\'s', anchors: ['V.norm(this.up, V.lerp(S[4], this.up, c.up, w));'] },
];
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const TEXT = LINES.join('\n'), covered = new Set(), stale = [], unseated = [];
for (const R of CENSUS) {
  const lines = [];
  for (const A of R.anchors) {
    const [text, want] = Array.isArray(A) ? A : [A, 1], hits = [];
    if (text.includes('\n')) { let k = -1; while ((k = TEXT.indexOf(text, k + 1)) >= 0) hits.push(TEXT.slice(0, k).split('\n').length - 1); }
    else LINES.forEach((l, i) => { if (l.includes(text)) hits.push(i); });
    if (hits.length !== want) stale.push(R.site.split(':')[0] + ': "' + text.trim().slice(0, 50) + '" ' + hits.length + ' times (its row says ' + want + ')');
    for (const i of hits) { lines.push(i); covered.add(i); }
  }
  /* (its own path: from the anchor to the first line that returns, or to its function's end) */
  const path = (i) => { const out = []; for (let k = i; k < LINES.length; k++) { const l = k === i ? LINES[k].slice(Math.max(0, LINES[k].indexOf('V.copy(this.up'))) : LINES[k]; out.push(l); if (/\breturn\b/.test(l) || /^  }\s*$/.test(LINES[k])) break; } return out.join(' '); };
  if (R.class === 'from one face, then the seat' && lines.length && !lines.every((i) => /this\.attach\(\)/.test(path(i)))) unseated.push(R.site.split(':')[0]);
}
const sites = []; LINES.forEach((l, i) => { if (!/^\s*(\/\*|\*|\/\/)/.test(l) && PATTERN.test(l)) sites.push(i); });
const loose = sites.filter((i) => !covered.has(i)), by = {}; for (const R of CENSUS) by[R.class] = (by[R.class] || 0) + 1;
ok(loose.length === 0 && stale.length === 0 && unseated.length === 0, 'THE SITES THAT SET THE BOARD\'S ATTITUDE ARE CLASSIFIED: ' + sites.length + ' lines of the sim set its up, each on its census row — ' + loose.length + ' unclassified' + (loose.length ? ' (' + loose.slice(0, 4).map((i) => 'line ' + (i + 1) + ': ' + LINES[i].trim().slice(0, 70)).join(' · ') + ')' : '') + ' · ' + CENSUS.length + ' rows, ' + stale.length + ' stale' + (stale.length ? ' (' + stale.slice(0, 3).join(' · ') + ')' : '') + ' · every row that sets it from one face hands it to the seat' + (unseated.length ? ' — ✖ not: ' + unseated.join(', ') : ''));
console.log('ℹ THE CENSUS BY CLASS — ' + Object.entries(by).map(([k, v]) => v + ' ' + k).join(' · '));
if (process.argv.includes('--table')) for (const R of CENSUS) console.log('  · ' + R.class.padEnd(30) + ' · ' + R.site);
console.log(fail ? 'POSES: RED' : 'POSES: GREEN'); process.exit(fail ? 1 : 0);
