/* THE BOT, BY TOUCH (DESIGN.md §2.7 #2): the real page, the real zones, the real reader. Chromium: CDP touch points, two and three fingers
 * at once. WebKit: touch-type PointerEvents dispatched on the element under the finger (SYNTHETIC touch — said so in every line it prints),
 * shaped as a finger is: buttons 1 while down (the platform bridge's stuck-pointer net releases a pointer whose move says buttons 0).
 *   50 high flicks  — land on the pad, run up into the look band: every one must pop (the game's own pop counter, exactly +50)
 *   50 band looks   — land in the band, drag down across the pad: the view turns, the pop counter does not move
 *   30 chords       — a carve held, a flick and a look at once: +30 pops, the skater leans, the view turns
 * Between flicks the skater is set back on the open runway (the bot tests the thumbs, not the bot's driving). */
export default async function (page, t) {
  const engine = page.context().browser().browserType().name(), synthetic = engine !== 'chromium';
  const vp = page.viewportSize(), tag = (vp.width < vp.height ? 'up' : 'turn') + '_' + engine;
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const play = await t.eval(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await t.tap(play[0], play[1]); await t.sleep(700);
  if ((await t.eval(() => window.__wl.mode())) !== 'play') { t.log('Play did not start the game'); return false; }
  const Z = await t.eval(() => { const c = document.getElementById('wl-carve').getBoundingClientRect(), f = document.getElementById('wl-flick').getBoundingClientRect(); return { band: c.top, carve: [c.left, c.top, c.right, c.bottom], flick: [f.left, f.top, f.right, f.bottom] }; });
  t.log((synthetic ? 'SYNTHETIC touch (PointerEvents) on ' : 'CDP touch on ') + engine + ' ' + vp.width + 'x' + vp.height + ' · band to y ' + Z.band.toFixed(0));
  /* ---- fingers ---- */
  const cdp = synthetic ? null : await page.context().newCDPSession(page);
  const fingers = new Map(), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pts = () => [...fingers.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id, radiusX: 6, radiusY: 6, force: 1 }));
  async function down(id, x, y) {
    if (!synthetic) { fingers.set(id, { x, y }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts() }); return; }
    fingers.set(id, { x, y }); await t.eval(([id, x, y]) => { const el = document.elementFromPoint(x, y); window.__botEl = window.__botEl || {}; window.__botEl[id] = el; el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 10 + id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, button: 0, buttons: 1, pressure: 0.5, width: 12, height: 12, bubbles: true, cancelable: true, composed: true })); }, [id, x, y]);
  }
  async function move(id, x, y) {
    fingers.set(id, { x, y });
    if (!synthetic) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts() }); return; }
    await t.eval(([id, x, y]) => { const el = window.__botEl[id]; el.dispatchEvent(new PointerEvent('pointermove', { pointerId: 10 + id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, button: -1, buttons: 1, pressure: 0.5, width: 12, height: 12, bubbles: true, cancelable: true, composed: true })); }, [id, x, y]);
  }
  async function up(id) {
    const p = fingers.get(id); fingers.delete(id);
    if (!synthetic) { await cdp.send('Input.dispatchTouchEvent', fingers.size ? { type: 'touchMove', touchPoints: pts() } : { type: 'touchEnd', touchPoints: [] }); return; }
    await t.eval(([id, x, y]) => { const el = window.__botEl[id]; el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 10 + id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, button: 0, buttons: 0, pressure: 0, width: 12, height: 12, bubbles: true, cancelable: true, composed: true })); }, [id, p.x, p.y]);
  }
  const mj = (u) => 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;
  /* a flick: load down 34 px, then up (slightly left: a kickflip-ish line) 120 px — it crosses into the band */
  async function flick(id, x0, y0, lean = -0.35) {
    await down(id, x0, y0);
    for (let i = 1; i <= 8; i++) { await move(id, x0, y0 + 34 * mj(i / 8)); await wait(10); }
    for (let i = 1; i <= 8; i++) { const u = mj(i / 8); await move(id, x0 + lean * 120 * u, y0 + 34 - 120 * u); await wait(8); }
    await up(id);
  }
  const counts = () => t.eval(() => { const r = window.__wl.read(); return { pops: r.stats.pops, state: r.state, yaw: window.__wl.debug.cam.lookYaw, lean: window.__wl.debug.sim.lean, bails: r.stats.bails }; });
  const reset = () => t.eval(() => { window.__wl.debug.place([14, 0, 8.2], 90, 3.5); });
  const shots = { first: false };
  /* ---- 50 high flicks ---- */
  let ok = true;
  await reset(); await t.sleep(300);
  const p0 = (await counts()).pops; let landed = 0;
  for (let i = 0; i < 50; i++) {
    if (i % 6 === 0) { await reset(); await t.sleep(250); }
    const fx = Z.flick[0] + 40 + (i * 37) % Math.max(20, (Z.flick[2] - Z.flick[0] - 100)), fy = Z.band + 30 + (i * 13) % 50;
    /* each flick is sent with her on four wheels (a flick in the air is a trick, not a pop: 10-16 one slow frame let a flick land in the
       last of the previous air, and the count read 49 — the instrument's race, not the game's): up to 1.5 s for the landing */
    for (let w = 0; w < 30; w++) { const c0 = await counts(); if (c0.state === 'roll') break; await wait(50); }
    await flick(1, fx, fy);
    if (i === 3 && !shots.first) { await t.sleep(140); await t.shot('bot_air_' + tag); shots.first = true; }
    await t.sleep(950);
    const c = await counts(); if (c.state === 'roll' || c.state === 'manual') landed++;
  }
  const p1 = (await counts()).pops;
  t.log('high flicks: 50 sent, the game counted ' + (p1 - p0) + ' pops (' + (synthetic ? 'synthetic' : 'CDP') + ')');
  if (p1 - p0 !== 50) ok = false;
  /* ---- 50 band looks ---- */
  await reset(); await t.sleep(300);
  const q0 = await counts(); let turned = 0;
  for (let i = 0; i < 50; i++) {
    /* anywhere on the open band but the pause button's corner (a button is never look surface) */
    const lx = 40 + (i * 53) % (vp.width - 150), ly = 70 + (i * 17) % Math.max(10, Z.band - 110), dx = (i % 2 ? 1 : -1) * (60 + (i * 7) % 80);
    const y0 = (await counts()).yaw; await down(2, lx, ly); let seen = 0;
    for (let k = 1; k <= 10; k++) { await move(2, lx + dx * k / 10, ly + (Z.band - ly + 120) * k / 10); await wait(12); if (k === 6) { const c = await counts(); seen = Math.abs(c.yaw - y0); } }
    if (i === 10) await t.shot('bot_look_' + tag);
    await up(2); if (seen > 0.01) turned++;
    await t.sleep(120);
  }
  const q1 = await counts();
  t.log('band looks: 50 sent, the view turned on ' + turned + ', the game counted ' + (q1.pops - q0.pops) + ' pops (must be 0)');
  if (q1.pops !== q0.pops || turned < 50) ok = false;
  /* ---- 30 chords: carve (finger 3) held, flick (finger 1), look (finger 2), all at once ---- */
  await reset(); await t.sleep(300);
  const c0 = await counts(); let leaned = 0, looked = 0;
  for (let i = 0; i < 30; i++) {
    await reset(); await t.sleep(250);                // every chord starts rolling straight: the carve finger turns her each time
    const cx = Z.carve[0] + 60, cy = Z.carve[3] - 110, fx = Z.flick[0] + 60 + (i * 29) % 80, fy = Z.band + 40, lx = vp.width * 0.5, ly = Math.max(20, Z.band * 0.4);
    await down(3, cx, cy); for (let k = 1; k <= 4; k++) { await move(3, cx + 14 * k, cy); await wait(10); }
    await down(2, lx, ly);
    await down(1, fx, fy);
    for (let k = 1; k <= 8; k++) { await move(1, fx, fy + 34 * mj(k / 8)); await move(2, lx - 6 * k, ly + 4 * k); await wait(8); }
    for (let k = 1; k <= 8; k++) { const u = mj(k / 8); await move(1, fx - 40 * u, fy + 34 - 120 * u); await move(2, lx - 48 - 6 * k, ly + 32); await wait(8); }
    const mid = await counts(); if (Math.abs(mid.lean) > 0.2) leaned++; if (Math.abs(mid.yaw) > 0.01) looked++;
    if (i === 2) await t.shot('bot_chord_' + tag);
    await up(1); await up(2); await up(3);
    await t.sleep(900);
  }
  const c1 = await counts();
  t.log('chords: 30 sent, the game counted ' + (c1.pops - c0.pops) + ' pops, leaned on ' + leaned + ', looked on ' + looked);
  if (c1.pops - c0.pops !== 30 || leaned < 30 || looked < 30) ok = false;
  t.log('perf', JSON.stringify(await t.eval(() => window.__wl.perf())));
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return ok && t.errors.length === 0;
}
