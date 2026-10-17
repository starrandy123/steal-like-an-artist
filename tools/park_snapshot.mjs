/* PARK 1 STAYS PARK 1: everything the generators build from a park's rows, written out whole (what is drawn, what the board rides, what it
 * grinds, the lips, the props, the problems) and compared value for value with a snapshot taken before a change to sim/park.js.
 *   node tools/park_snapshot.mjs write <file> [park module]     take the snapshot (default: config.js PARK)
 *   node tools/park_snapshot.mjs check <file> [park module]     exit 1 and name the first difference, else say SAME
 * Values are compared with ===, so a -0 that was 0 is the same value; NaN is never the same. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [mode, file, modPath] = process.argv.slice(2);
const { buildPark } = await import(pathToFileURL(path.resolve('build/js/sim/park.js')).href);
const park = modPath ? (await import(pathToFileURL(path.resolve(modPath)).href)).PARK : (await import(pathToFileURL(path.resolve('build/js/config.js')).href)).PARK;
const b = buildPark(park);
const plain = (v) => (ArrayBuffer.isView(v) ? Array.from(v) : Array.isArray(v) ? v.map(plain) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, plain(v[k])])) : v);
const geo = Object.fromEntries(Object.keys(b.geo).sort().map((m) => [m, { pos: b.geo[m].pos, nrm: b.geo[m].nrm, uv: b.geo[m].uv, idx: b.geo[m].idx }]));
const snap = plain({ geo, col: b.col, rails: b.rails, lips: b.lips, props: b.props, problems: b.problems });

function diff(a, c, at) {
  if (typeof a !== typeof c) return `${at}: ${typeof a} became ${typeof c}`;
  if (Array.isArray(a)) {
    if (!Array.isArray(c)) return `${at}: an array became ${typeof c}`;
    if (a.length !== c.length) return `${at}: length ${a.length} became ${c.length}`;
    for (let i = 0; i < a.length; i++) { const d = diff(a[i], c[i], `${at}[${i}]`); if (d) return d; }
    return null;
  }
  if (a && typeof a === 'object') {
    const ka = Object.keys(a), kc = Object.keys(c);
    for (const k of ka) if (!(k in c)) return `${at}.${k}: gone`;
    for (const k of kc) if (!(k in a)) return `${at}.${k}: new (${JSON.stringify(c[k]).slice(0, 80)})`;
    for (const k of ka) { const d = diff(a[k], c[k], `${at}.${k}`); if (d) return d; }
    return null;
  }
  return a === c ? null : `${at}: ${a} became ${c}`;
}
const count = (s) => `${Object.keys(s.geo).length} materials · ${Object.values(s.geo).reduce((n, g) => n + g.idx.length / 3, 0)} drawn · ${s.col.surf.length} collision triangles · ${s.rails.length} rails · ${s.lips.length} lips`;
if (mode === 'write') { fs.writeFileSync(file, JSON.stringify(snap)); console.log('snapshot written:', count(snap)); }
else {
  const before = JSON.parse(fs.readFileSync(file, 'utf8')), d = diff(before, snap, 'park');
  if (d) { console.log('DIFFERENT:', d); process.exitCode = 1; } else console.log('SAME:', count(snap));
}
