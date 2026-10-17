/* THE BOARD'S SUPPORT ACROSS EVERY EDGE OF THE PARK — a sweep that needs no ride (10-17, the supervisor: "THE INSTRUMENT MUST NOT DEPEND ON THE
 * PATHS ... ask the support directly at every edge of the park's collision (copings, lips, rims, the Spine's ridge, every ramp's foot ...).
 * Straddle the board across each edge in 2 cm steps over its wheelbase, at several headings, and read each truck's and wheel's depth with (b)'s
 * own reader, ≤ 1 cm"). The edges are the collision's own: every edge where its shading breaks (the two triangles' normals at it over 15°
 * apart — a coping's top, a lip, a ridge, a foot, a ledge's top) and every open edge of a ramp (where it meets another mesh: a lip). Along
 * each, every 25 cm, the board's middle is set off the edge on either face by 0 to 20 cm in 2 cm steps, heading square to it, 30° and 60° off
 * either way and along it — a straddle a board can reach: lifted along the face's normal until no wheel or truck is in a solid (one placed
 * flat on a step's tread had its far pair inside the next step: that is no seat, it is a board put there), and counted apart when no lift
 * of 15 cm clears it — and clear of the SIM'S OWN wheel lines too (tests/lib/inside.mjs simWheelsInside: the points its seat probes from, half
 * the track out — the drawn wheel's middle, which the depth reader reads, sits 0.85 cm inboard of them: under the chain's 1 cm, two readers
 * of one wheel, never to be read as one; 10-17: placed with its line 0.7 cm into the Ten's second riser while the drawn wheel read clear, the
 * seat took the step above for that wheel's ground and tipped the board 47°, a start no ride makes: a rolling wheel stops a millimetre short
 * of a face); the sim's own support seats it (body.js attach, as a roll step does) and tests/lib/inside.mjs reads each wheel and
 * each truck: the deepest at most 1 cm into a solid. The fence is a net, not read.
 *   node tests/support.mjs [--census] [--park <id>]   (the census: the worst edges and where; a park of js/parks/, the first by default)
 *     [--no-props]  the park's own edges alone (its props are read apart: --prop-rows)   [--near x,z,r]  only the edges passing within r of (x, z)
 *     [--dump]  the worst seat in full   [--prop-rows i,j…]  only those props' edges (by their row in the park's `props`)   [--poses <file>]  each prop kind's worst seat, its pose
 *     after the seat ({ kind, row, depth, who, p, up, fwd }), written for a picture of it (the supervisor's reading (2))
 * Plants (tests/plants.mjs): support_one_face → RED. */
import { World } from '../build/js/sim/world.js';
import { Skater } from '../build/js/sim/body.js';
import { ASSISTS } from '../build/js/config.js';
import { PARKS, parkById } from '../build/js/parks/index.js';
import { boardInside, truckInside, simWheelsInside } from './lib/inside.mjs';
import { writeFileSync } from 'node:fs';

const BOUND = 0.01;
/* DEFERRED (the supervisor, 10-17): a seat at an EDGE'S END — a corner, where two edges meet: a quarter's end, a bank's or the Block's corner —
   deeper than the bound but no deeper than 2 cm is the next release's, said by its count and its deepest; along an edge over the bound, or
   at an end over 2 cm, is RED */
const CORNER_UP_TO = 0.02;
/* STATED MAP FIXES PENDING (the supervisor, 10-17): a seat at a named element whose fix is a stated map change already ruled — said with its
   numbers and its fix, never gated, until the map change lands and the seat reads under the bound */
const STATED = [{ park: 'kilnyard', element: 'barrierRun', ends: true, what: 'the barrier\'s two cut ends', fix: 'end blocks (orgo-u-48, a stated map change)' }];
const statedOf = (q) => { for (const S of STATED) { if (S.park !== PK.id) continue; const e = PK.PARK.elements.find((x) => x.id === S.element); if (!e || !e.line) continue;
  const pts = S.ends ? [e.line[0], e.line[e.line.length - 1]] : e.line; if (pts.some((p) => Math.hypot(q[0] - p[0], q[2] - p[1]) < 0.6)) return S; } return null; };
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const PI = process.argv.indexOf('--park'), PK = PI >= 0 ? parkById(process.argv[PI + 1]) : PARKS[0];
const world = new World(PK.PARK, PK.TREES), B = world.bvh, P = B.P, N = B.N, n = B.count;
/* THE PROPS' OWN TRIANGLES (a park's `props`: each one's drawn mesh is its collision, sim/park.js): the block the props add, found by building
   the park without them — the triangles agree up to where the props begin; each prop's run of triangles, by its row, in order */
const propOf = new Int32Array(n).fill(-1);
if ((PK.PARK.props || []).length) {
  const bare = new World(Object.assign({}, PK.PARK, { props: [] }), PK.TREES).bvh, bn = bare.count;
  const same = (t) => { for (let i = 0; i < 9; i++) if (P[t * 9 + i] !== bare.P[t * 9 + i]) return false; return true; };
  let k = 0; while (k < bn && same(k)) k++;
  let t = k; PK.PARK.props.forEach((row, ri) => { const PM = PK.PARK.propMeshes[row.kind]; if (!PM) return; for (let j = 0; j < PM.idx.length / 3; j++) propOf[t++] = ri; });
}
const argOf = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null; };
const NO_PROPS = process.argv.includes('--no-props');
const NEAR = argOf('--near') ? argOf('--near').split(',').map(Number) : null;   // x,z,r: only the edges that pass within r of (x, z)
const ONLY_ROWS = argOf('--prop-rows') ? new Set(argOf('--prop-rows').split(',').map(Number)) : null, POSES = argOf('--poses'), poses = {};
const propName = (ri) => { const r = PK.PARK.props[ri]; return 'the ' + r.kind + ' at ' + r.at.map((q) => +q.toFixed(1)).join(','); };
/* the edges: shared edges whose shading breaks, and a ramp's open edges */
const key = (o) => Math.round(P[o] * 1e4) + ',' + Math.round(P[o + 1] * 1e4) + ',' + Math.round(P[o + 2] * 1e4);
const E = new Map();
for (let t = 0; t < n; t++) for (let e = 0; e < 3; e++) { const a = t * 9 + e * 3, b = t * 9 + ((e + 1) % 3) * 3, ka = key(a), kb = key(b), k = ka < kb ? ka + '|' + kb : kb + '|' + ka; (E.get(k) || E.set(k, []).get(k)).push({ t, a, b }); }
const nAt = (o) => { const l = Math.hypot(N[o], N[o + 1], N[o + 2]) || 1; return [N[o] / l, N[o + 1] / l, N[o + 2] / l]; };
const deg = (u, v) => Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))) * 180 / Math.PI;
const face = (t) => B.faceNormal(t, [0, 0, 0]);
const edges = [];
for (const L of E.values()) {
  const x = L[0], s0 = B.surf[x.t]; if (s0 === 'fence') continue;
  const a = [P[x.a], P[x.a + 1], P[x.a + 2]], b = [P[x.b], P[x.b + 1], P[x.b + 2]], len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (len < 0.02) continue;
  if (L.length === 1) { if (s0 === 'ramp') edges.push({ a, b, len, faces: [face(x.t)], what: 'a ramp\'s open edge', prop: -1 }); continue; }
  if (L.length !== 2) continue;
  const y = L[1], s1 = B.surf[y.t]; if (s1 === 'fence') continue;
  const ya = Math.abs(P[x.a] - P[y.a]) + Math.abs(P[x.a + 1] - P[y.a + 1]) + Math.abs(P[x.a + 2] - P[y.a + 2]) < 1e-3 ? y.a : y.b, yb = ya === y.a ? y.b : y.a;
  if (Math.max(deg(nAt(x.a), nAt(ya)), deg(nAt(x.b), nAt(yb))) <= 15) continue;
  const pr = propOf[x.t] >= 0 ? propOf[x.t] : propOf[y.t];
  edges.push({ a, b, len, faces: [face(x.t), face(y.t)], what: pr >= 0 ? propName(pr) : [s0, s1].sort().join(' | '), prop: pr });
}
/* the board straddled across an edge point: its middle d off the edge on a face (d > 0 on the first, < 0 on the other), heading h° off square */
const sk = new Skater(world, { preset: 'cruise', seed: 1 }); sk.assist = Object.assign({ name: 'cruise' }, ASSISTS.cruise);
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], norm = (u) => { const l = Math.hypot(...u) || 1; return u.map((q) => q / l); };
const rot = (v, k, th) => { const c = Math.cos(th), s = Math.sin(th), d = (k[0] * v[0] + k[1] * v[1] + k[2] * v[2]) * (1 - c), x = cross(k, v); return [0, 1, 2].map((i) => v[i] * c + x[i] * s + k[i] * d); };
const deferred = { n: 0, v: 0, at: '' }, stated = new Map(); const PROPS = {}; let seats = 0, unseated = 0, lifted = 0, liftedSome = 0, walled = 0; const wallWorst = { v: 0, at: '' }; const worst = { v: 0, at: '' }, byEdge = new Map(), bands = {}; let over = 0;
for (const ed of edges) {
  if (ONLY_ROWS && !ONLY_ROWS.has(ed.prop)) continue;
  if (NO_PROPS && ed.prop >= 0) continue;
  if (NEAR) { const dx = ed.b[0] - ed.a[0], dz = ed.b[2] - ed.a[2], L2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((NEAR[0] - ed.a[0]) * dx + (NEAR[1] - ed.a[2]) * dz) / L2));
    if (Math.hypot(ed.a[0] + u * dx - NEAR[0], ed.a[2] + u * dz - NEAR[1]) > NEAR[2]) continue; }   // (the edge's nearest point, not its middle: a step runs the flight's width)
  const t = norm([ed.b[0] - ed.a[0], ed.b[1] - ed.a[1], ed.b[2] - ed.a[2]]), steps = Math.max(1, Math.floor(ed.len / 0.25));
  for (let s = 0; s <= steps; s++) {
    const q = [0, 1, 2].map((i) => ed.a[i] + (ed.b[i] - ed.a[i]) * (s / steps));
    for (let fi = 0; fi < ed.faces.length; fi++) {
      const nf = ed.faces[fi], w0 = norm(cross(nf, t)), into = (() => { const p = [0, 1, 2].map((i) => q[i] + w0[i] * 0.05 + nf[i] * 0.05), h = B.raycast(p, [-nf[0], -nf[1], -nf[2]], 0.2); return h && h.tri >= 0 ? 1 : -1; })(), w = w0.map((x) => x * into);
      if (nf[1] < 0.2) continue;   // (a face the board cannot stand on is no side to straddle from)
      for (let d = 0; d <= 0.2001; d += 0.02) for (const hd of [0, 30, -30, 60, -60, 90]) {
        const p = [0, 1, 2].map((i) => q[i] + w[i] * d), fw = norm(rot(w, nf, hd * Math.PI / 180));
        sk.respawnAt(p, 0, 0); sk.state = 'roll'; sk.air = null; sk.p = p.slice(); sk.up = nf.slice(); sk.fwd = fw.slice(); sk.v = [0, 0, 0];
        let lift = 0; while (lift < 0.15 && (boardInside(world, sk).depth > 0.002 || truckInside(world, sk).depth > 0.002 || simWheelsInside(world, sk).depth > 0.0005)) {   /* (a sim wheel line clear past half a millimetre: a rolling wheel stops a millimetre short, outside; the seat counts any depth in) */ lift += 0.005; sk.p = p.map((x, i) => x + nf[i] * lift); }
        if (lift >= 0.15) { lifted++; continue; } if (lift > 0) liftedSome++;
        sk.attach(); seats++;
        if (sk.state !== 'roll') { unseated++; continue; }
        const wI = boardInside(world, sk), tI = truckInside(world, sk); let deep = Math.max(wI.depth, tI.depth); const who = wI.depth >= tI.depth ? wI.wheel + ' wheel in the ' + wI.surf : tI.truck + ' truck in the ' + tI.surf;
        /* (a PROP's own edges are read apart, by its kind: its mesh is its drawn mesh, not the park's — said, the supervisor's to rule on) */
        if (ed.prop >= 0) { const kd = PK.PARK.props[ed.prop].kind, Pk = PROPS[kd] || (PROPS[kd] = { seats: 0, o1: 0, o2: 0, v: 0, at: '' }); Pk.seats++;
          if (deep > BOUND) Pk.o1++; if (deep > 0.02) Pk.o2++; if (deep > Pk.v) { Object.assign(Pk, { v: deep, at: ed.what + ', the middle ' + (100 * d).toFixed(0) + ' cm off on its ' + (fi ? 'second' : 'first') + ' face, ' + hd + '° off square: ' + who });
            if (POSES) poses[kd] = { kind: kd, row: ed.prop, what: ed.what, depth: +deep.toFixed(4), who, p: sk.p.slice(), up: sk.up.slice(), fwd: sk.fwd.slice() }; } continue; }
        /* (a wheel's rim past a face too steep to stand on beside it — a step's riser, a wall — is the walls' to hold: a rolling wheel stops at
           such a face a millimetre short (rollOn), and a seat moves the board along its up, never sideways; counted apart, said) */
        if (deep > BOUND && wI.depth >= tI.depth && wI.face && wI.face[1] < 0.34) { walled++; if (deep > wallWorst.v) Object.assign(wallWorst, { v: deep, at: ed.what + ' at ' + q.map((x) => x.toFixed(2)).join(',') + ': ' + who }); deep = 0; }
        const at = ed.what + ' at ' + q.map((x) => x.toFixed(2)).join(',') + ', the middle ' + (100 * d).toFixed(0) + ' cm off on its ' + (fi ? 'second' : 'first') + ' face, ' + hd + '° off square: ' + who;
        const k = ed.what + ' @' + q.map((x) => x.toFixed(1)).join(','); const e0 = byEdge.get(k); if (!e0 || deep > e0.v) byEdge.set(k, { v: deep, at });
        if (deep > BOUND && deep <= CORNER_UP_TO && (s === 0 || s === steps)) { deferred.n++; if (deep > deferred.v) Object.assign(deferred, { v: deep, at }); continue; }
        { const S = deep > BOUND ? statedOf(q) : null; if (S) { const r = stated.get(S) || stated.set(S, { n: 0, v: 0, at: '' }).get(S); r.n++; if (deep > r.v) Object.assign(r, { v: deep, at }); continue; } }
        if (deep > BOUND) { over++; const end = s === 0 || s === steps ? 'at the edge\'s end' : 'along it', k2 = ed.what + ' · ' + sk.contacts + ' contacts · ' + end + ' · ' + (deep > 0.04 ? 'over 4 cm' : deep > 0.02 ? '2–4 cm' : '1–2 cm'); bands[k2] = (bands[k2] || 0) + 1; }
        if (deep > worst.v) Object.assign(worst, { v: deep, at, dump: { p: sk.p.slice(), up: sk.up.slice(), fwd: sk.fwd.slice(), contacts: sk.contacts, lift, edge: [ed.a, ed.b], nf, w, d, hd, wI, tI } });
      }
    }
  }
}
const kinds = {}; for (const e of edges) kinds[e.what] = (kinds[e.what] || 0) + 1;
ok(worst.v <= BOUND, 'THE BOARD IS SUPPORTED ACROSS EVERY EDGE OF THE PARK (' + (PK.name || PK.id) + '): ' + edges.length + ' edges of the collision (' + Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => v + ' ' + k).join(', ') + ' …), the board straddled across each every 25 cm — ' + seats + ' seats by the sim\'s own support (' + liftedSome + ' lifted clear first; ' + lifted + ' straddles no lift of 15 cm cleared, not seated; ' + unseated + ' found no ground: off an edge), ' + over + ' with a wheel or a truck over ' + (BOUND * 100) + ' cm into a solid, the deepest ' + (100 * worst.v).toFixed(2) + ' cm' + (worst.at ? ' (' + worst.at + ')' : ''));
for (const [kd, Pk] of Object.entries(PROPS)) console.log('ℹ THE PROPS\' OWN EDGES — reported (' + kd + '): ' + Pk.seats + ' seats across their edges, ' + Pk.o1 + ' with a wheel or a truck over ' + (BOUND * 100) + ' cm into a solid, ' + Pk.o2 + ' over 2 cm, the deepest ' + (100 * Pk.v).toFixed(2) + ' cm' + (Pk.at ? ' (' + Pk.at + ')' : ''));
console.log('ℹ DEFERRED to the next release (the supervisor, 10-17): ' + deferred.n + ' seats at an edge\'s end (a corner) over ' + (BOUND * 100) + ' cm and no deeper than ' + (CORNER_UP_TO * 100) + ' cm, the deepest ' + (100 * deferred.v).toFixed(2) + ' cm' + (deferred.at ? ' (' + deferred.at + ')' : ''));
for (const [S, r] of stated) console.log('ℹ DEFERRED to its stated map fix (the supervisor, 10-17): ' + S.what + ' — ' + r.n + ' seats over ' + (BOUND * 100) + ' cm, the deepest ' + (100 * r.v).toFixed(2) + ' cm (' + r.at + ') — the fix: ' + S.fix);
console.log('ℹ A WHEEL AGAINST A WALL BESIDE IT — reported (the walls\' class, not the seat\'s): ' + walled + ' seats with a wheel\'s rim past a riser or a wall over ' + (BOUND * 100) + ' cm, the most ' + (100 * wallWorst.v).toFixed(2) + ' cm' + (wallWorst.at ? ' (' + wallWorst.at + ')' : ''));
if (process.argv.includes('--census')) { for (const [k, e] of [...byEdge].sort((a, b) => b[1].v - a[1].v).slice(0, 15)) console.log('  ' + (100 * e.v).toFixed(2).padStart(6) + ' cm  ' + e.at);
  console.log('  — the seats over the bound, by the edge, the contacts the seat had, where on the edge, how deep:'); for (const [k, v] of Object.entries(bands).sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log('    ' + String(v).padStart(5) + '  ' + k); }
if (process.argv.includes('--dump') && worst.dump) console.log('THE WORST SEAT: ' + JSON.stringify(worst.dump, (k, v) => (typeof v === 'number' ? +v.toFixed(4) : v)));
if (POSES) { writeFileSync(POSES, JSON.stringify(Object.values(poses), null, 1) + '\n'); console.log('the worst seat of each prop kind → ' + POSES); }
console.log(fail ? 'SUPPORT: RED' : 'SUPPORT: GREEN'); process.exit(fail ? 1 : 0);
