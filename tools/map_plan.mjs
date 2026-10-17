/* A PARK'S PLAN, FROM THE PARK'S OWN DATA: a top-down drawing (SVG, rendered to PNG by tools/plan_png.mjs), the ASCII plan one character a
 * metre, the park's checks (every footprint inside the park, no two on one spot) and every named gap against the physics the game runs
 * (config.js PHYSICS: the air's gravity, the pop's apex by flick grade, the push's and the pump's top speeds).
 *   node tools/map_plan.mjs <park module> <out stem>      e.g. node tools/map_plan.mjs build/js/parks/kilnyard.js plan/kiln_yard */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PHYSICS } from '../build/js/config.js';
import { paintStrokes } from '../build/js/view/parkview.js';

const [modPath, stem] = process.argv.slice(2);
const mod = await import(pathToFileURL(path.resolve(modPath)).href);
const { PARK, GAPS, RUN } = mod;
const [W, D] = PARK.size;
const gA = PHYSICS.gAir, [pop1, pop5] = PHYSICS.popApex, pop3 = (pop1 + pop5) / 2;
const vPop = (h) => Math.sqrt(2 * gA * h), GR = { 1: vPop(pop1), 3: vPop(pop3), 5: vPop(pop5) };

/* ---------------- footprints (as sim/park.js builds them) ---------------- */
const run = (h, r) => Math.sqrt(r * r - (r - h) * (r - h));
const rectPoly = ([x0, z0, x1, z1]) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
function strip([[ax, az], [bx, bz]], w) { const l = Math.hypot(bx - ax, bz - az), nx = (az - bz) / l * w / 2, nz = (bx - ax) / l * w / 2; return [[ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], [ax - nx, az - nz]]; }
function footprint(e) {
  if (e.type === 'box') return rectPoly(e.base);
  if (e.rect) return rectPoly(e.rect);
  if (e.type === 'barrier') return strip(e.line, e.bottom);
  if (e.type === 'edge') return null;
  if (e.line) return strip(e.line, e.width);
  if (e.coping) {
    const R = run(e.h, e.r), [a, b] = e.coping, l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const f = e.face || [(a[1] - b[1]) / l, (b[0] - a[0]) / l], back = e.face ? 0 : R;
    return [[a[0] - f[0] * back, a[1] - f[1] * back], [b[0] - f[0] * back, b[1] - f[1] * back], [b[0] + f[0] * R, b[1] + f[1] * R], [a[0] + f[0] * R, a[1] + f[1] * R]];
  }
  return null;
}
const overlap = (P, Q) => { let d = Infinity; for (const S of [P, Q]) for (let i = 0; i < S.length; i++) { const a = S[i], b = S[(i + 1) % S.length], nx = a[1] - b[1], nz = b[0] - a[0], l = Math.hypot(nx, nz), pr = (T) => T.map((q) => (q[0] * nx + q[1] * nz) / l), p = pr(P), q = pr(Q); d = Math.min(d, Math.min(Math.max(...p), Math.max(...q)) - Math.max(Math.min(...p), Math.min(...q))); } return d; };
const problems = [], prints = [];
for (const e of PARK.elements) {
  const f = footprint(e), pts = f || (e.pts || []).map((q) => [q[0], q[2]]).concat(e.line || []);
  if (pts.some(([x, z]) => x < -1e-6 || z < -1e-6 || x > W + 1e-6 || z > D + 1e-6)) problems.push(e.name + ' leaves the park');
  if (f) prints.push([e, f]);
}
/* the props' footprints too: each one's box on the ground, turned and placed as it is drawn (sim/props.js) */
{ const { propPoint } = await import('../build/js/sim/props.js');
  for (const r of PARK.props || []) { const M = PARK.propMeshes[r.kind], [x0, z0, x1, z1] = M.box, f = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => { const q = propPoint(r, x, 0, z); return [q[0], q[2]]; });
    if (f.some(([x, z]) => x < -1e-6 || z < -1e-6 || x > W + 1e-6 || z > D + 1e-6)) problems.push('the ' + r.kind + ' at ' + r.at.join(', ') + ' leaves the park');
    prints.push([{ name: 'the ' + r.kind + ' at (' + r.at[0] + ', ' + r.at[2] + ')', type: 'prop' }, f]); } }
for (let i = 0; i < prints.length; i++) for (let j = i + 1; j < prints.length; j++) { const d = overlap(prints[i][1], prints[j][1]); if (d > 0.01) problems.push(`${prints[i][0].name} and ${prints[j][0].name} on one spot (${Math.round(d * 100)} cm)`); }

/* ---------------- the gaps against the physics ---------------- */
const dropGap = (drop, dist, vy) => dist / ((vy + Math.sqrt(vy * vy + 2 * gA * drop)) / gA);
const clearGap = (clear, span, vy) => { const d = vy * vy - 2 * gA * clear; return d <= 0 ? Infinity : span / (2 * Math.sqrt(d) / gA); };
function bankHop(span, bankDeg, vy) {   /* the slowest speed up a bank that carries `span` metres before falling back to the height it left */
  const ok = (v) => { const a = bankDeg * Math.PI / 180, n = [-Math.sin(a), Math.cos(a)]; let d = [n[0] * PHYSICS.popTilt, 1 + (n[1] - 1) * PHYSICS.popTilt]; const m = Math.hypot(d[0], d[1]); d = [d[0] / m, d[1] / m];
    const vx = v * Math.cos(a) + d[0] * vy, vz = v * Math.sin(a) + d[1] * vy; return vx > 0 && vx * (2 * vz / gA) >= span; };
  let lo = 0.3, hi = 20; if (!ok(hi)) return Infinity; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (ok(mid)) hi = mid; else lo = mid; } return hi;
}
const levelAt = (x, z) => { let y = null; for (const g of PARK.ground) { const r = g.rect; if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) y = y === null ? g.y : Math.max(y, g.y); } return y ?? 0; };
const byId = Object.fromEntries(PARK.elements.map((e) => [e.id, e]));
const fmt = (v) => (v === Infinity ? 'never' : v.toFixed(2));
const rows = GAPS.map((g, i) => {
  let need = '';
  if (g.kind === 'air') {
    const fy = levelAt((g.from[0] + g.from[2]) / 2, (g.from[1] + g.from[3]) / 2), drop = fy - g.toY;
    const fc = [(g.from[0] + g.from[2]) / 2, (g.from[1] + g.from[3]) / 2];
    /* the nearest point of the landing box from the take-off box's far edge, along the shorter axis between them */
    const dz = g.to[3] < g.from[1] ? g.from[1] - g.to[3] : g.to[1] > g.from[3] ? g.to[1] - g.from[3] : 0, dx = g.to[2] < g.from[0] ? g.from[0] - g.to[2] : g.to[0] > g.from[2] ? g.to[0] - g.from[2] : 0;
    const dist = Math.max(dz, dx);
    /* a take-off box that IS a bank: launched off its top edge, along its slope (the pop tilted toward its normal by popTilt) */
    const bank = PARK.elements.find((e) => e.type === 'bank' && e.rect.every((v, k) => v === g.from[k]));
    if (bank) {
      const hi = Math.max(bank.from, bank.to), lo = Math.min(bank.from, bank.to), len = bank.axis === 'x' ? bank.rect[2] - bank.rect[0] : bank.rect[3] - bank.rect[1];
      const deg = Math.atan2(hi - lo, len) * 180 / Math.PI, dropB = hi - g.toY;
      const flyV = (v, vy) => { const a = deg * Math.PI / 180, n = [-Math.sin(a), Math.cos(a)]; let d = [n[0] * PHYSICS.popTilt, 1 + (n[1] - 1) * PHYSICS.popTilt]; const m = Math.hypot(d[0], d[1]); d = [d[0] / m, d[1] / m];
        const vx = v * Math.cos(a) + d[0] * vy, vz = v * Math.sin(a) + d[1] * vy; return vx * (vz + Math.sqrt(vz * vz + 2 * gA * dropB)) / gA; };
      const needV = (vy) => { let lo2 = 0.3, hi2 = 20; if (flyV(hi2, vy) < dist) return Infinity; for (let k = 0; k < 40; k++) { const mid = (lo2 + hi2) / 2; if (flyV(mid, vy) >= dist) hi2 = mid; else lo2 = mid; } return hi2; };
      need = `off a ${deg.toFixed(1)}° bank's top (y ${hi.toFixed(2)}), ${dist.toFixed(2)} m out, landing ${dropB.toFixed(2)} m lower: ${[0, 1, 3, 5].map((k) => fmt(needV(k ? GR[k] : 0))).join(' / ')} m/s (no pop / g1 / g3 / g5)`;
    } else need = `drop ${drop.toFixed(2)} m, ${dist.toFixed(2)} m out: ${[0, 1, 3, 5].map((k) => fmt(dropGap(drop, dist, k ? GR[k] : 0))).join(' / ')} m/s (no pop / g1 / g3 / g5)`;
    void fc;
  } else if (g.kind === 'clear') {
    const e = byId[g.over];
    if (e.type === 'box') {   /* from the top of its up-bank, over its top (crosswise), as the Plaza's Block Hop is judged */
      const span = Math.min(e.top[2] - e.top[0], e.top[3] - e.top[1]), deg = Math.atan2(e.h, e.top[0] - e.base[0]) * 180 / Math.PI;
      need = `from its ${deg.toFixed(1)}° up-bank over its ${span.toFixed(2)} m top: ${[0, 1, 3, 5].map((k) => fmt(bankHop(span, deg, k ? GR[k] : 0))).join(' / ')} m/s (no pop / g1 / g3 / g5)`;
    } else {
      const f = footprint(e), xs = f.map((p) => p[0]), zs = f.map((p) => p[1]);
      const span = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)), h = e.h;
      need = `over ${h.toFixed(2)} m for ${span.toFixed(2)} m (crosswise): ${[1, 3, 5].map((k) => fmt(clearGap(h, span, GR[k]))).join(' / ')} m/s (g1 / g3 / g5)`;
    }
  } else if (g.kind === 'vert') {
    const e = byId[g.quarter]; need = `≥ ${g.height} m over a ${e.h} m wall: ${Math.sqrt(2 * PHYSICS.gGround * e.h + 2 * gA * g.height).toFixed(2)} m/s at its foot (no pop, no pump)`;
  } else need = g.kind === 'manual' ? 'sim (balance)' : g.kind === 'transfer2' ? 'sim (transition to transition)' : 'grind';
  return { n: i + 1, ...g, need };
});

/* ---------------- the drawing ---------------- */
const S = 12, M = 40, LEG = 470, WPX = W * S + 2 * M + LEG, HPX = D * S + 2 * M + 30;
const X = (x) => M + x * S, Z = (z) => M + (D - z) * S;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const shade = (y) => { const t = Math.max(0, Math.min(1, y / 6)); const c = Math.round(150 + t * 90); return `rgb(${c},${c - 8},${c - 22})`; };
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WPX}" height="${HPX}" viewBox="0 0 ${WPX} ${HPX}" font-family="Helvetica, Arial, sans-serif">\n<rect width="100%" height="100%" fill="#f4efe6"/>\n`;
svg += `<text x="${M}" y="26" font-size="18" font-weight="700" fill="#211b15">${esc(mod.default?.name || 'Park')} — plan, ${W} × ${D} m, north up (1 m grid, 5 m lines)</text>\n`;
/* the ground by its level, but asphalt by its surface (it rolls slower: CLEANROOM): dark whatever its height */
for (const g of PARK.ground) { const [x0, z0, x1, z1] = g.rect; svg += `<rect x="${X(x0)}" y="${Z(z1)}" width="${(x1 - x0) * S}" height="${(z1 - z0) * S}" fill="${g.surface === 'asphalt' ? '#5b5854' : shade(g.y)}" stroke="#8a8173" stroke-width="0.8"/>\n`; }
/* the paint, stroke by stroke as the view draws it (view/parkview.js paintStrokes) */
for (const row of PARK.paint || []) for (const st of paintStrokes(row)) svg += `<line x1="${X(st.a[0])}" y1="${Z(st.a[1])}" x2="${X(st.b[0])}" y2="${Z(st.b[1])}" stroke="${row.color === 'yellow' ? '#e0b22e' : '#f4f2ea'}" stroke-width="${Math.max(1.2, st.w * S)}"/>\n`;
for (let x = 0; x <= W; x++) svg += `<line x1="${X(x)}" y1="${Z(0)}" x2="${X(x)}" y2="${Z(D)}" stroke="#000" stroke-opacity="${x % 5 ? 0.04 : 0.12}"/>\n`;
for (let z = 0; z <= D; z++) svg += `<line x1="${X(0)}" y1="${Z(z)}" x2="${X(W)}" y2="${Z(z)}" stroke="#000" stroke-opacity="${z % 5 ? 0.04 : 0.12}"/>\n`;
for (const g of PARK.ground) { const [x0, z0, x1, z1] = g.rect; svg += `<text x="${X((x0 + x1) / 2)}" y="${Z((z0 + z1) / 2) + 4}" font-size="11" fill="#3b342c" fill-opacity="0.55" text-anchor="middle">${esc(g.name)} · y ${g.y.toFixed(2)}</text>\n`; }
const fill = { quarter: '#d9a441', spine: '#d9a441', bowl: '#d9a441', ledge: '#8e9599', bank: '#c28a5a', stairs: '#9aa0a3', stairLedge: '#7f878b', box: '#c28a5a', planter: '#7c9a52', bench: '#a57a4f', barrier: '#b9b2a7' };
for (const [e, f] of prints) svg += `<polygon points="${f.map(([x, z]) => `${X(x)},${Z(z)}`).join(' ')}" fill="${fill[e.type] || '#999'}" fill-opacity="0.85" stroke="#2b241d" stroke-width="1"/>\n`;
for (const e of PARK.elements) {
  if (e.type === 'stairs') { const n = e.risers; for (let i = 0; i < n; i++) { const z = e.rect[3] - e.tread * i; svg += `<line x1="${X(e.rect[0])}" y1="${Z(z)}" x2="${X(e.rect[2])}" y2="${Z(z)}" stroke="#2b241d" stroke-width="0.7"/>\n`; } }
  if (e.coping) svg += `<line x1="${X(e.coping[0][0])}" y1="${Z(e.coping[0][1])}" x2="${X(e.coping[1][0])}" y2="${Z(e.coping[1][1])}" stroke="${e.edge === 'concrete' ? '#6b6257' : '#e2a62a'}" stroke-width="3"/>\n`;
  if (e.type === 'rail') svg += `<polyline points="${e.pts.map((p) => `${X(p[0])},${Z(p[2])}`).join(' ')}" fill="none" stroke="#3b3d40" stroke-width="2.5"/>\n`;
  if (e.type === 'edge') svg += `<line x1="${X(e.line[0][0])}" y1="${Z(e.line[0][1])}" x2="${X(e.line[1][0])}" y2="${Z(e.line[1][1])}" stroke="#3b3d40" stroke-width="3"/>\n`;
  if (e.type === 'barrier') svg += `<line x1="${X(e.line[0][0])}" y1="${Z(e.line[0][1])}" x2="${X(e.line[1][0])}" y2="${Z(e.line[1][1])}" stroke="#3b3d40" stroke-width="2"/>\n`;
  const f = footprint(e), c = f ? [f.reduce((s, p) => s + p[0], 0) / f.length, f.reduce((s, p) => s + p[1], 0) / f.length] : e.pts ? [e.pts[0][0], e.pts[0][2]] : e.line[0];
  svg += `<text x="${X(c[0])}" y="${Z(c[1]) - 6}" font-size="10" font-weight="700" fill="#211b15" text-anchor="middle">${esc(e.name)}</text>\n`;
}
for (const w of PARK.walls || []) { const v = (t) => (t === 'fx0' ? -0.3 : t === 'fx1' ? W + 0.3 : t === 'fz0' ? -0.3 : t === 'fz1' ? D + 0.3 : t); svg += `<line x1="${X(v(w[0]))}" y1="${Z(v(w[1]))}" x2="${X(v(w[2]))}" y2="${Z(v(w[3]))}" stroke="#4b2e1e" stroke-width="2" stroke-dasharray="5 3"/>\n`; }
svg += `<rect x="${X(-0.3)}" y="${Z(D + 0.3)}" width="${(W + 0.6) * S}" height="${(D + 0.6) * S}" fill="none" stroke="#5c5c5c" stroke-width="2"/>\n`;
const sp = PARK.spawn; svg += `<circle cx="${X(sp.at[0])}" cy="${Z(sp.at[2])}" r="7" fill="#c0392b"/><text x="${X(sp.at[0]) + 10}" y="${Z(sp.at[2]) + 4}" font-size="11" font-weight="700" fill="#c0392b">start</text>\n`;
for (const n of PARK.nodes) svg += `<circle cx="${X(n[0])}" cy="${Z(n[2])}" r="3" fill="#2e6f9e"/>\n`;
for (const [x, , z] of RUN.wax) svg += `<rect x="${X(x) - 5}" y="${Z(z) - 3}" width="10" height="6" fill="#f1b24a" stroke="#7a4c0c"/>\n`;
rows.forEach((g) => { if (g.kind === 'air') { const [x0, z0, x1, z1] = g.to; svg += `<rect x="${X(x0)}" y="${Z(z1)}" width="${(x1 - x0) * S}" height="${(z1 - z0) * S}" fill="none" stroke="#2e6f9e" stroke-dasharray="3 3"/><text x="${X(x0) + 3}" y="${Z(z1) + 12}" font-size="10" fill="#2e6f9e">${g.n}</text>\n`; } });
let ly = M; const lx = M + W * S + 24;
const leg = (t, size = 12, weight = 400, col = '#211b15') => { svg += `<text x="${lx}" y="${ly}" font-size="${size}" font-weight="${weight}" fill="${col}">${esc(t)}</text>\n`; ly += size + 5; };
leg('Named gaps: the speed an ideal flight needs, m/s (a model — whether a player reaches it is tests/parks/gaps_reached.mjs)', 13, 700);
for (const g of rows) { leg(`${g.n}. ${g.name} (${g.value}) — ${g.kind}`, 11, 700); leg(`    ${g.need}`, 10, 400, '#5a5148'); }
ly += 6; leg(`Checks: ${problems.length ? problems.length + ' problem(s)' : 'every footprint inside, none on another'}`, 12, 700, problems.length ? '#c0392b' : '#2d7a3a');
for (const p of problems) leg('  ' + p, 10, 400, '#c0392b');
leg('● start   ● respawn nodes   ▬ wax bar   ⋯ gap landing box   – – level faces', 10, 400, '#5a5148');
svg += '</svg>\n';

/* ---------------- ASCII ---------------- */
const grid = Array.from({ length: D }, () => Array(W).fill(' '));
const put = (x, z, c) => { const i = Math.floor(z), j = Math.floor(x); if (i >= 0 && i < D && j >= 0 && j < W) grid[i][j] = c; };
const inPoly = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const groundCh = (y) => (y <= 0 ? '_' : y < 2 ? '.' : y < 3 ? ':' : y < 5 ? '"' : '#');
for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) grid[z][x] = groundCh(levelAt(x + 0.5, z + 0.5));
for (const g of PARK.ground) if (g.surface === 'asphalt') for (let z = Math.ceil(g.rect[1]); z < g.rect[3]; z++) for (let x = Math.ceil(g.rect[0]); x < g.rect[2]; x++) put(x + 0.5, z + 0.5, '%');
const ch = { quarter: 'Q', spine: 'A', ledge: '=', bank: '/', stairs: 'S', stairLedge: 'H', box: 'X', planter: 'P', bench: 'b', barrier: 'J' };
for (const [e, f] of prints) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) if (inPoly(f, x + 0.5, z + 0.5)) grid[z][x] = ch[e.type] || '?';
for (const e of PARK.elements) if (e.type === 'rail') for (let i = 0; i + 1 < e.pts.length; i++) { const a = e.pts[i], b = e.pts[i + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) * 2); for (let k = 0; k <= n; k++) put(a[0] + (b[0] - a[0]) * k / n, a[2] + (b[2] - a[2]) * k / n, '-'); }
for (const e of PARK.elements) if (e.type === 'edge') { const [a, b] = e.line, n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2); for (let k = 0; k <= n; k++) put(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n - 0.01, '~'); }
put(sp.at[0], sp.at[2], '@');
let txt = `${mod.default?.name || 'Park'} — ASCII plan, one character = one metre, north up\n`;
for (let z = D - 1; z >= 0; z--) txt += String(z).padStart(2) + ' ' + grid[z].join('') + '\n';
txt += `_ spillway floor 0   . rim 2.40   : apron 2.40   " yard 4.15   % asphalt   # dock 5.35 / DIY deck 5.65   @ start\nQ transition  A spine  = ledge  / bank  S stairs  H hubba  X the Kiln (box)  P planter  b bench  J barrier  - rail  ~ edge\n\n`;
txt += 'NAMED GAPS — the speed an ideal flight needs (a model; whether a player reaches it is tests/parks/gaps_reached.mjs)\n' + rows.map((g) => `${String(g.n).padStart(2)}. ${g.name} (${g.value}, ${g.kind}): ${g.need}`).join('\n') + '\n\nCHECKS: ' + (problems.length ? problems.join('; ') : 'every footprint inside the park, none on another') + '\n';
fs.mkdirSync(path.dirname(stem), { recursive: true });
fs.writeFileSync(stem + '.svg', svg); fs.writeFileSync(stem + '.txt', txt);
console.log(txt);
process.exitCode = problems.length ? 1 : 0;
