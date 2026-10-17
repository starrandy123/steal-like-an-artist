/* EVERY STATE, LOOKED AT (DESIGN.md M1 evidence): roll, an air, a ledge grind, a rail slide, a manual, a quarter-pipe air, a clean landing,
 * a sketchy landing, a bail, the respawn, the look band in use — each reached by a real touch (CDP) from a start of its own, the sim held
 * still at the moment (the follow camera keeps drawing) and photographed. */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  const play = await t.eval(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await t.tap(play[0], play[1]); await t.sleep(600);
  const Z = await t.eval(() => { const c = document.getElementById('wl-carve').getBoundingClientRect(), f = document.getElementById('wl-flick').getBoundingClientRect(); return { band: c.top, carve: [c.left, c.top, c.right, c.bottom], flick: [f.left, f.top, f.right, f.bottom] }; });
  const cdp = await page.context().newCDPSession(page), fingers = new Map(), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pts = () => [...fingers.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id, radiusX: 6, radiusY: 6, force: 1 }));
  const down = async (id, x, y) => { fingers.set(id, { x, y }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts() }); };
  const move = async (id, x, y) => { fingers.set(id, { x, y }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts() }); };
  const up = async (id) => { fingers.delete(id); await cdp.send('Input.dispatchTouchEvent', fingers.size ? { type: 'touchMove', touchPoints: pts() } : { type: 'touchEnd', touchPoints: [] }); };
  const mj = (u) => 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;
  const fx = Z.flick[0] + (Z.flick[2] - Z.flick[0]) * 0.5, fy = Z.flick[1] + (Z.flick[3] - Z.flick[1]) * 0.55;
  const flick = async (lean = 0) => { await down(1, fx, fy); for (let i = 1; i <= 8; i++) { await move(1, fx, fy + 34 * mj(i / 8)); await wait(10); } for (let i = 1; i <= 8; i++) { const u = mj(i / 8); await move(1, fx + lean * 110 * u, fy + 34 - 110 * u); await wait(8); } await up(1); };
  const st = () => t.eval(() => { const r = window.__wl.read(); return { state: r.state, p: r.p, t: window.__wl.debug.sim.t, land: window.__wl.lastLand || null, vert: !!(window.__wl.debug.sim.air && window.__wl.debug.sim.air.vert) }; });
  const until = async (pred, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (pred(s)) return s; await wait(15); } return null; };
  const place = (at, h, v, preset) => t.eval(([at, h, v, preset]) => { const D = window.__wl.debug; D.freeze = false; if (preset) D.assist(preset); D.place(at, h, v); window.__wl.lastLand = null; }, [at, h, v, preset || 'cruise']);
  const freeze = (on) => t.eval((on) => { window.__wl.debug.freeze = on; }, on);
  /* the page's own reading of how she is framed (view/camera.js framed: the worst point of her past the safe frame, the points with
     something in front of them), at every photograph and through the whole of the quarter-pipe air and the fall */
  const framings = [];
  const snap = async (name) => { await t.sleep(160); const f = await t.eval(() => window.__wl.debug.framed()); framings.push([name, f]); t.log('framed ' + name + ': ' + (f.past > 0.005 ? 'OUT by ' + f.past.toFixed(3) : 'inside') + (f.hidden.length ? ', blocked: ' + f.hidden.join(', ') : ', clear')); await t.shot('state_' + name + '_' + tag); };
  const watch = async (name, still) => { let n = 0, worst = -9, hid = 0; const t0 = Date.now(); while (Date.now() - t0 < 6000) { const s = await st(); if (!still(s)) break; const f = await t.eval(() => window.__wl.debug.framed()); n++; worst = Math.max(worst, f.past); if (f.hidden.length) hid++; await wait(25); } t.log('watched ' + name + ': ' + n + ' frames read, worst ' + (worst > 0.005 ? 'OUT by ' + worst.toFixed(3) : 'inside (' + worst.toFixed(3) + ')') + ', blocked on ' + hid); return { n, worst, hid }; };
  const watched = [];
  const done = [];
  /* roll */
  await place([18, 0, 8], 90, 5); await t.sleep(1100); await freeze(true); await snap('roll'); await freeze(false); done.push('roll');
  /* an air (an ollie on flat), and its clean landing */
  await place([18, 0, 8], 90, 5); await t.sleep(400); await flick(-0.4);
  if (await until((s) => s.state === 'air')) { await t.sleep(170); await freeze(true); await snap('air_kickflip'); await freeze(false); done.push('air'); }
  if (await until((s) => s.land && s.state === 'roll')) { await freeze(true); await snap('land_clean'); await freeze(false); done.push('land:' + (await st()).land.quality); }
  /* a ledge grind: the Main Ledge */
  await place([21, 0, 22.7], 90, 5.6); await until((s) => s.p[0] >= 24.8); await flick();   // measured on the sim (10-16): a flick begun from x 24.4 to 25.7 — the page's latency included — pops before the Pad's end and lands on the ledge; from 25.4 (round 20's upright run) 100 ms of latency rolled it off the end instead (a pop in the air is refused). The latency is THIS DRIVE'S: until() reads the page's state over CDP and then waits 15 ms, and the flick is 17 touch messages dispatched over CDP with 8–10 ms waits between them — the game reads its input on every step (8.3 ms). 24.8 leaves the drive 160 ms
  if (await until((s) => s.state === 'grind')) { await t.sleep(350); await freeze(true); await snap('ledge_grind'); await freeze(false); done.push('ledge grind'); }
  /* a rail slide: the Low Bar met at 60° */
  await place([26.2, 0, 8.6], 30, 4.6); await until((s) => s.p[2] >= 9.4); await flick();
  if (await until((s) => s.state === 'grind')) { await t.sleep(350); await freeze(true); await snap('rail_slide'); await freeze(false); done.push('rail slide'); }
  /* a manual: a light pull held */
  await place([18, 0, 8], 90, 4.6); await t.sleep(300); await down(1, fx, fy); for (let i = 1; i <= 6; i++) { await move(1, fx, fy + 22 * mj(i / 6)); await wait(10); }
  if (await until((s) => s.state === 'manual', 1500)) { await t.sleep(400); await freeze(true); await snap('manual'); await freeze(false); done.push('manual'); } await up(1);
  /* a quarter-pipe air: the East Wall at 8.2 m/s, with a held grab */
  await place([42, 0, 22], 90, 8.2);
  if (await until((s) => s.state === 'air' && s.vert)) { await down(1, fx, fy); for (let i = 1; i <= 6; i++) { await move(1, fx + 40 * mj(i / 6), fy); await wait(10); } await t.sleep(260); await freeze(true); await snap('qp_air_grab'); await freeze(false); watched.push(await watch('the quarter-pipe air', (s) => s.state === 'air')); await up(1); done.push('qp air'); }
  await t.sleep(1500);
  /* a sketchy landing: Raw assists, the board turned 25° in the air by the carve thumb */
  await place([18, 0, 8], 90, 5, 'raw'); await t.sleep(300); await flick();
  /* the turn in the air by the D key for 0.12 s: about 35°, inside the sketchy band (28–45°) */
  if (await until((s) => s.state === 'air')) { await t.sleep(60); await page.keyboard.down('KeyD'); await wait(120); await page.keyboard.up('KeyD'); }
  const sk = await until((s) => s.land && s.state !== 'air');
  if (sk) { await freeze(true); await snap('land_' + sk.land.quality); await freeze(false); done.push('land:' + sk.land.quality); }
  await t.eval(() => window.__wl.debug.assist('cruise'));
  /* a bail into the fence, and the respawn */
  await place([57, 0, 31], 90, 6.5);
  if (await until((s) => s.state === 'bail')) { await t.sleep(320); await freeze(true); await snap('bail'); await freeze(false); watched.push(await watch('the fall into the fence', (s) => s.state === 'bail')); done.push('bail'); }
  /* and a fall into the corner of the planter, met on the diagonal */
  await place([40, 0, 20.4], 45, 6.5);
  if (await until((s) => s.state === 'bail')) { await t.sleep(320); await freeze(true); await snap('bail_corner'); await freeze(false); watched.push(await watch('the fall into the planter\'s corner', (s) => s.state === 'bail')); done.push('bail corner'); }
  if (await until((s) => s.state === 'roll', 4000)) { await t.sleep(250); await snap('respawn'); done.push('respawn'); }
  /* the look band in use: a drag across the open screen */
  await place([18, 0, 8], 90, 4); await t.sleep(300);
  const lx = vp.width * 0.4, ly = Math.max(60, Z.band * 0.5); await down(2, lx, ly); for (let i = 1; i <= 10; i++) { await move(2, lx + 14 * i, ly + 3 * i); await wait(14); }
  await snap('look_band'); await up(2); done.push('look band');
  t.log('states photographed: ' + done.join(' · '));
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  const badFrame = framings.filter(([n, f]) => n !== 'look_band' && (f.past > 0.005 || f.hidden.length)), badWatch = watched.filter((w) => w.n < 5 || w.worst > 0.005 || w.hid);
  t.log('framing: ' + (framings.length - badFrame.length) + ' of ' + framings.length + ' photographs with her inside and clear' + (badFrame.length ? ' — not: ' + badFrame.map(([n]) => n).join(', ') : '') + ' · ' + (watched.length - badWatch.length) + ' of ' + watched.length + ' moving states held her inside and clear on every frame read');
  return done.length >= 12 && done.includes('land:sketchy') && t.errors.length === 0 && !badFrame.length && !badWatch.length && watched.length === 3;
}
