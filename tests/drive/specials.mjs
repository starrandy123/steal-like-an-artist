/* the specials, seen: a Nightmare Flip in the air and a Darkslide on the Low Bar, by touch, the meter golden */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  const play = await t.eval(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await t.tap(play[0], play[1]); await t.sleep(500);
  const Z = await t.eval(() => { const f = document.getElementById('wl-flick').getBoundingClientRect(); return [f.left, f.top, f.right, f.bottom]; });
  const cdp = await page.context().newCDPSession(page), wait = (ms) => new Promise((r) => setTimeout(r, ms)), mj = (u) => 10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5;
  const tp = (x, y) => [{ x, y, id: 1, radiusX: 6, radiusY: 6, force: 1 }];
  const fx = (Z[0] + Z[2]) / 2, fy = Z[1] + (Z[3] - Z[1]) * 0.55;
  const golden = () => t.eval(() => { const S = window.__wl.debug.score; S.special = 1; S.golden = true; });
  const st = () => t.eval(() => ({ state: window.__wl.read().state, p: window.__wl.read().p, trick: window.__wl.debug.sim.air && window.__wl.debug.sim.air.trick ? window.__wl.debug.sim.air.trick.name : null, grind: window.__wl.debug.sim.grind ? window.__wl.debug.sim.grind.name : null }));
  const until = async (f, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(); if (f(s)) return s; await wait(15); } return null; };
  /* a kickflip flick held still at its end */
  await t.eval(() => window.__wl.debug.place([18, 0, 8], 90, 5)); await golden(); await t.sleep(300);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(fx, fy) });
  for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(fx, fy + 34 * mj(i / 8)) }); await wait(10); }
  for (let i = 1; i <= 8; i++) { const u = mj(i / 8); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(fx - 64 * u, fy + 34 - 64 * u) }); await wait(8); }
  await wait(230); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const n = await until((s) => s.trick === 'Nightmare Flip', 800); if (n) { await t.sleep(60); await t.eval(() => { window.__wl.debug.freeze = true; }); await t.shot('special_nightmare_' + tag); await t.eval(() => { window.__wl.debug.freeze = false; }); }
  await t.sleep(1500);
  /* a boardslide on the Low Bar, the pad held still */
  await t.eval(() => window.__wl.debug.place([26.2, 0, 8.6], 30, 4.6)); await golden();
  await until((s) => s.p[2] >= 9.4, 3000);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(fx, fy) });
  for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(fx, fy + 34 * mj(i / 8)) }); await wait(10); }
  for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(fx, fy + 34 - 100 * mj(i / 8)) }); await wait(8); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await until((s) => s.state === 'grind', 2000);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(fx, fy) });
  const d = await until((s) => s.grind === 'Darkslide', 1500); if (d) { await t.sleep(200); await t.eval(() => { window.__wl.debug.freeze = true; }); await t.shot('special_darkslide_' + tag); await t.eval(() => { window.__wl.debug.freeze = false; }); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  t.log('nightmare ' + !!n + ' · darkslide ' + !!d); t.log('errors', JSON.stringify(t.errors.slice(0, 4)));
  return !!n && !!d && t.errors.length === 0;
}
