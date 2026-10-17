/* THROWAWAY SPIKE (M0) — can the flick grammar (DESIGN.md §2.3) be read through a thumb's noise, at the sample rates phones give?
 * Synthetic thumbs: a load (pull down), a short hold, then a stroke — straight (ollie, kickflip, heelflip, the two shove-its), a
 * quarter curve (the four varial-family flips) or a half circle (360 flip, laser flip) — with angular noise σ, length and speed
 * spread, positional jitter, sampled at 60 / 120 / 240 Hz. The reader below is the planned recognizer in miniature.
 * Screen space: x right, y DOWN; directions in degrees, 0 = up the screen, -90 = toward the skater's heel side (left, the
 * stance-independent "screen" mapping), +90 = toward the toe side. Run: node spikes/flick_spike.mjs */
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const U = (a, b) => a + (b - a) * rnd();
const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;
const wrap = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return a; };
const dirOf = (dx, dy) => deg(Math.atan2(dx, -dy));               // 0 = up, +90 = right
const ease = (u) => u * u * (3 - 2 * u);

const CLASSES = {
  'Ollie': { kind: 'straight', dir: 0 }, 'Kickflip': { kind: 'straight', dir: -45 }, 'Heelflip': { kind: 'straight', dir: 45 },
  'BS Pop Shove-it': { kind: 'straight', dir: -90 }, 'FS Pop Shove-it': { kind: 'straight', dir: 90 },
  'Varial Kickflip': { kind: 'quarter', from: -100, to: -10 }, 'Hardflip': { kind: 'quarter', from: 90, to: -45 },
  'Inward Heelflip': { kind: 'quarter', from: -90, to: 45 }, 'Varial Heelflip': { kind: 'quarter', from: 100, to: 10 },
  '360 Flip': { kind: 'loop', from: -90, turn: 330 }, 'Laser Flip': { kind: 'loop', from: 90, turn: -330 },
};

/* a thumb: returns samples [{t, x, y}] (ms, CSS px) and the moment its stroke began */
function thumb(cls, hz, sigma) {
  const C = CLASSES[cls], out = [], dt = 1000 / hz;
  const loop = C.kind === 'loop', depth = U(26, 60), tLoad = U(60, 140), hold = U(0, 60), len = loop ? U(90, 150) : U(48, 100), tStroke = loop ? U(110, 200) : U(45, 120), wob = gauss() * 3;
  let t = 0; const push = (x, y) => { out.push({ t: t + gauss() * 0.4, x: x + gauss() * 0.8, y: y + gauss() * 0.8 }); };
  for (; t <= tLoad; t += dt) { const u = ease(t / tLoad); push(wob * u, depth * u); }
  const t1 = t; for (; t <= t1 + hold; t += dt) push(wob, depth);
  const t2 = t, ex = wob, ey = depth;
  let from, to;
  if (C.kind === 'straight') { from = C.dir + gauss() * sigma; to = from + gauss() * 10; }
  else if (C.kind === 'quarter') { from = C.from + gauss() * sigma; to = C.to + gauss() * sigma; }
  else { from = C.from + gauss() * sigma; to = from + C.turn + gauss() * sigma * 1.5; }
  /* the direction turns from `from` to `to` along the stroke; minimum-jerk speed */
  let x = ex, y = ey, sPrev = 0;
  for (; t <= t2 + tStroke + dt; t += dt) {
    const u = Math.min(1, (t - t2) / tStroke), s = len * (10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5);
    const steps = 4; for (let k = 1; k <= steps; k++) { const sk = sPrev + (s - sPrev) * k / steps, a = rad(from + (to - from) * (sk / len)); x += Math.sin(a) * (s - sPrev) / steps; y -= Math.cos(a) * (s - sPrev) / steps; }
    sPrev = s; push(x, y);
  }
  return { samples: out, strokeAt: t2 };
}

/* the reader (planned recognizer in miniature) */
const R = { load: 18, popMin: 16, popFrac: 0.5, popSpeed: 0.45, shapeMs: 200, straight: 35, half: 150 };
function read(samples) {
  const o = samples[0]; let deep = o.y, E = o, popped = null, left = false;
  for (let i = 1; i < samples.length; i++) {
    const p = samples[i];
    if (!popped) {
      /* the load point is the deepest point WHILE THE THUMB IS STILL THERE: once it has left (6 px), it is frozen — a sideways stroke
         keeps the same depth, and a load point that follows it never lets the thumb get away from it */
      /* the thumb LEAVES the load point by moving up or sideways (within ±115° of up) — moving deeper is still the load */
      { const ax = p.x - E.x, ay = p.y - E.y; if (!left && deep - o.y >= R.load && Math.hypot(ax, ay) >= 6 && Math.abs(dirOf(ax, ay)) <= 115) left = true; }
      if (p.y > deep && !left) { deep = p.y; E = p; }
      const loadDepth = deep - o.y; if (loadDepth < R.load) continue;
      /* the pop: the thumb leaves the load FAST in any direction that is not back down (within ±115° of up) — a shove-it's stroke is sideways */
      const dx = p.x - E.x, dy = p.y - E.y, away = Math.hypot(dx, dy), prev = samples[i - 1], v = Math.hypot(p.x - prev.x, p.y - prev.y) / Math.max(1, p.t - prev.t);
      if (away >= Math.max(R.popMin, R.popFrac * loadDepth) && Math.abs(dirOf(dx, dy)) <= 115 && v >= R.popSpeed) popped = { at: p.t, i };
    }
  }
  if (!popped) return { trick: null };
  /* the stroke: from the load's deepest point to the end (or the shape window after the pop) */
  let iE = samples.indexOf(E); const end = samples.findIndex((p) => p.t > popped.at + R.shapeMs), last = end < 0 ? samples.length - 1 : end;
  /* the stroke begins at the last sample still within 3 px of the load point: the resting thumb's jitter is not part of the flick */
  for (let i = iE; i < last; i++) { if (Math.hypot(samples[i].x - E.x, samples[i].y - E.y) < 3) iE = i; else break; }
  const pts = samples.slice(iE, last + 1); if (pts.length < 3) return { trick: null };
  let L = 0; const cum = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); cum.push(L); }
  const at = (f) => { const target = L * f; let i = cum.findIndex((c) => c >= target); if (i < 0) i = pts.length - 1; return pts[i]; };
  const a0 = at(0), a1 = at(0.35), b0 = at(0.65), b1 = at(1);
  const d0 = dirOf(a1.x - a0.x, a1.y - a0.y), d1 = dirOf(b1.x - b0.x, b1.y - b0.y);
  /* the turn, summed segment by segment (a half circle's ends point opposite ways: their difference alone cannot say which way it went) */
  /* …over THREE LONG CHORDS of the stroke (first third, middle, last third): summed sample by sample, jitter piles up and a straight
     flick reads as a curve — worse the faster the screen samples. The middle chord says which way a half circle went. */
  const m0 = at(0.35), m1 = at(0.65), dm = dirOf(m1.x - m0.x, m1.y - m0.y);
  const turn = wrap(dm - d0) + wrap(d1 - dm);
  const net = dirOf(b1.x - a0.x, b1.y - a0.y);
  if (READER === 'templates') { const nb = nearest(resample(pts, NPTS).pts); return { trick: nb.trick, popAt: popped.at, d: nb.d }; }
  let trick;
  if (Math.abs(turn) < R.straight) trick = Math.abs(net) <= 22.5 ? 'Ollie' : net < -67.5 ? 'BS Pop Shove-it' : net > 67.5 ? 'FS Pop Shove-it' : net < 0 ? 'Kickflip' : 'Heelflip';
  else if (Math.abs(turn) >= R.half) trick = d0 < 0 ? '360 Flip' : 'Laser Flip';  /* (the chord reader cannot see a loop: its chords wrap) */
  else { const heelStart = d0 < 0, heelEnd = d1 < 0; trick = Math.abs(d1) < 15 ? (heelStart ? 'BS Pop Shove-it' : 'FS Pop Shove-it') : heelStart ? (heelEnd ? 'Varial Kickflip' : 'Inward Heelflip') : (heelEnd ? 'Hardflip' : 'Varial Heelflip'); }
  return { trick, popAt: popped.at };
}


/* TEMPLATES (the $1-recognizer idea — Wobbrock, Wilson & Li 2007 — without its rotation step: here the direction IS the trick).
 * Each trick's canonical stroke, resampled to 24 points from its start and scaled to length 1; a stroke is read as the nearest. */
const NPTS = 24;
function resample(pts, n) {
  let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const step = L / (n - 1), out = [{ x: pts[0].x, y: pts[0].y }]; let acc = 0, prev = { x: pts[0].x, y: pts[0].y };
  for (let i = 1; i < pts.length && out.length < n; i++) {
    let cur = pts[i], d = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    while (acc + d >= step && out.length < n) { const f = (step - acc) / d, q = { x: prev.x + f * (cur.x - prev.x), y: prev.y + f * (cur.y - prev.y) }; out.push(q); prev = q; d = Math.hypot(cur.x - prev.x, cur.y - prev.y); acc = 0; }
    acc += d; prev = cur;
  }
  while (out.length < n) out.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
  const o = out[0]; return { pts: out.map((q) => ({ x: (q.x - o.x) / (L || 1), y: (q.y - o.y) / (L || 1) })), L };
}
function canonical(cls) {
  const C = CLASSES[cls], pts = [{ x: 0, y: 0 }]; let x = 0, y = 0;
  const from = C.kind === 'straight' ? C.dir : C.from, to = C.kind === 'straight' ? C.dir : C.kind === 'quarter' ? C.to : C.from + C.turn;
  for (let k = 1; k <= 60; k++) { const a = rad(from + (to - from) * (k - 0.5) / 60); x += Math.sin(a) / 60; y -= Math.cos(a) / 60; pts.push({ x, y }); }
  return resample(pts, NPTS).pts;
}
const TPL = Object.fromEntries(Object.keys(CLASSES).map((c) => [c, canonical(c)]));
const dist = (a, b) => { let d = 0; for (let i = 0; i < NPTS; i++) d += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y); return d / NPTS; };
/* a harder trick must be DRAWN CLEARLY: a curved or looped reading wins only by MARGIN over the best straight one (skill, not luck) */
let MARGIN = 0.02;
const rank = (c) => (CLASSES[c].kind === 'straight' ? 0 : 1);
function nearest(stroke) {
  let best = null, bestStraight = null;
  for (const [c, t] of Object.entries(TPL)) { const d = dist(stroke, t); if (!best || d < best.d) best = { trick: c, d }; if (rank(c) === 0 && (!bestStraight || d < bestStraight.d)) bestStraight = { trick: c, d }; }
  return rank(best.trick) > 0 && bestStraight && bestStraight.d - best.d < MARGIN ? bestStraight : best;
}

/* the Streamlined reading: any up or sideways stroke is the basic trick of its direction at full height */
const BASIC = { 'Varial Kickflip': 'Kickflip', 'Hardflip': 'Kickflip', 'Inward Heelflip': 'Heelflip', 'Varial Heelflip': 'Heelflip', '360 Flip': 'Kickflip', 'Laser Flip': 'Heelflip' };

let READER = 'chords';
const N = 400;
if (process.argv[2] === 'debug') {
  READER = 'templates';
  for (const cls of ['BS Pop Shove-it', 'Kickflip', 'Hardflip', '360 Flip']) for (const hz of [60, 240]) {
    const tally = {}; let nopop = []; for (let n = 0; n < 300; n++) { const th = thumb(cls, hz, 10), r = read(th.samples); const k = r.trick || 'NO POP'; tally[k] = (tally[k] || 0) + 1; if (!r.trick && nopop.length < 2) { const s0 = th.samples; nopop.push(s0.length + ' samples, deepest y ' + Math.max(...s0.map((q) => q.y)).toFixed(1)); } }
    console.log(cls.padEnd(16), hz + ' Hz', JSON.stringify(tally), nopop.join(' | '));
  }
  process.exit(0);
}
for (const reader of ['templates+0.02']) { READER = 'templates'; MARGIN = reader === 'templates' ? 0 : Number(reader.split('+')[1]);
console.log('\nFLICK GRAMMAR SPIKE — reader: ' + reader + ' — ' + N + ' synthetic thumbs a class, a cell = share read as the trick meant (classic reading)\n');
for (const hz of [60, 120, 240]) for (const sigma of [6, 10, 15]) {
  let ok = 0, all = 0, popped = 0; const lat = [], per = [];
  for (const cls of Object.keys(CLASSES)) {
    let k = 0;
    for (let n = 0; n < N; n++) { const th = thumb(cls, hz, sigma), r = read(th.samples); all++; if (r.trick) { popped++; lat.push(r.popAt - th.strokeAt); } if (r.trick === cls) { ok++; k++; } }
    per.push(cls.replace('Pop Shove-it', 'Shove').padEnd(15) + ' ' + (100 * k / N).toFixed(0).padStart(3) + '%');
  }
  lat.sort((a, b) => a - b);
  console.log(hz + ' Hz · thumb angle σ ' + String(sigma).padStart(2) + '°: read right ' + (100 * ok / all).toFixed(1) + '% · popped ' + (100 * popped / all).toFixed(1) + '% · pop after the stroke began: median ' + lat[Math.floor(lat.length / 2)].toFixed(0) + ' ms, p90 ' + lat[Math.floor(lat.length * 0.9)].toFixed(0) + ' ms');
  if (sigma === 10) console.log('   ' + per.join(' · '));
}
}
/* the Streamlined reading on the same thumbs: is every stroke a trick, and the one its first direction says? */
let s = 0, sAll = 0;
for (const cls of Object.keys(CLASSES)) for (let n = 0; n < N; n++) { const th = thumb(cls, 120, 15), r = read(th.samples); sAll++; const want = BASIC[cls] || cls, got = r.trick ? (BASIC[r.trick] || r.trick) : null; if (got === want) s++; }
console.log('\nStreamlined reading (every flip family folded to its basic trick), 120 Hz, σ 15°: ' + (100 * s / sAll).toFixed(1) + '% read as the basic trick meant');
