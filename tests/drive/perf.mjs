/* A MINUTE OF PLAY ON THE REAL GPU (Chromium --gpu, windowless): pushing, carving, flicking, grinding the Main Ledge, an air on the East
 * Wall — the frame times read every 10 s from the game's own ring (p50 / p95 / frames over 33 ms / simulation steps dropped / the pixel
 * ratio and the governor's step). */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  const play = await t.eval(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await t.tap(play[0], play[1]); await t.sleep(500);
  const Z = await t.eval(() => { const c = document.getElementById('wl-carve').getBoundingClientRect(), f = document.getElementById('wl-flick').getBoundingClientRect(); return { carve: [c.left, c.top, c.right, c.bottom], flick: [f.left, f.top, f.right, f.bottom] }; });
  const cdp = await page.context().newCDPSession(page), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fl = async (x, y) => { const tp = (px, py) => [{ x: px, y: py, id: 1, radiusX: 6, radiusY: 6, force: 1 }]; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(x, y) }); for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(x, y + 6 * i) }); await wait(10); } for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(x - 8 * i, y + 36 - 22 * i) }); await wait(8); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  await t.eval(() => window.__wl.perf());                       // empty the ring's sample counter
  const runs = [[[18, 0, 8], 90, 5], [[21, 0, 22.7], 90, 5.6], [[42, 0, 22], 90, 8.2], [[30, 0, 17.6], 60, 4], [[48, 0, 38.5], 270, 5], [[20, 0, 14], 0, 5]];
  const lines = [];
  for (let s = 0; s < 6; s++) {
    const [at, h, v] = runs[s]; await t.eval(([at, h, v]) => window.__wl.debug.place(at, h, v), [at, h, v]);
    const t0 = Date.now();
    while (Date.now() - t0 < 10000) { await fl(Z.flick[0] + (Z.flick[2] - Z.flick[0]) * 0.5, Z.flick[1] + 80); await t.sleep(900 + (s * 137) % 400); if (Date.now() - t0 > 4000 && s % 2) await t.eval(() => window.__wl.debug.place([30, 0, 17.6], 60, 5)); }
    const p = await t.eval(() => window.__wl.perf()); lines.push(p);
    t.log('10 s #' + (s + 1) + ' ' + JSON.stringify(p));
  }
  const L = await t.eval(() => window.__wl.ledger());
  t.log('ledger ' + JSON.stringify({ MB: L.totalMb, drawCalls: L.drawCalls, gpuTris: L.gpuTris, triangles: L.triangles }));
  const worst = lines.reduce((m, p) => Math.max(m, p.p95), 0), longs = lines.reduce((m, p) => Math.max(m, p.long), 0);
  t.log('FRAMES ' + tag + ': p50 ' + lines.map((p) => p.p50.toFixed(1)).join('/') + ' ms · worst p95 ' + worst.toFixed(1) + ' ms · worst share over 33 ms ' + (longs * 100).toFixed(2) + '%');
  return worst < 33.4 && t.errors.length === 0;
}
