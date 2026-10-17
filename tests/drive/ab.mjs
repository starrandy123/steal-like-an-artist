/* THE TWO LOOKS, A/B: the same scene and camera drawn "real" and "painted" — Juno whole (front, three-quarter, back), her face (aimed at
 * her head bone), her hands and shoes on the board; the park wide; the granite ledge close. Juno stands mid-plaza so the park is behind her. */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  await t.eval(() => { const D = window.__wl.debug; D.place([30.5, 0, 17.6], 60, 0); D.mode('shot'); });
  await t.sleep(400);
  const views = [
    ['juno_front', { az: 90, dist: 2.6, h: 0.95, at: 0.85, fov: 38 }], ['juno_34', { az: 40, dist: 2.6, h: 1.0, at: 0.85, fov: 38 }], ['juno_back', { az: -110, dist: 2.6, h: 1.05, at: 0.85, fov: 38 }],
    ['juno_face', { aim: 'head', az: 30, dist: 0.62, h: 0.03, at: 0.0, fov: 30 }], ['juno_hands', { aim: 'handL', az: 85, dist: 0.75, h: 0.05, at: -0.02, fov: 34 }],
    ['juno_shoes', { az: 125, dist: 1.0, h: 0.45, at: 0.1, fov: 34 }],
    ['park_wide', { pos: [-9, 12, -9], look: [32, 0, 24], fov: 50 }], ['ledge', { pos: [32.6, 0.75, 21.9], look: [34.6, 0.3, 23.3], fov: 42 }],
  ];
  for (const [name, v] of views) for (const look of ['real', 'painted']) {
    await t.eval(([v, look]) => { window.__wl.debug.look(look); window.__wl.debug.shot = v; }, [v, look]); await t.sleep(600); await t.shot('ab_' + name + '_' + look + '_' + tag);
  }
  const L = await t.eval(() => window.__wl.ledger());
  t.log('triangles', JSON.stringify(L.triangles), 'drawCalls', L.drawCalls, 'gpuTris', L.gpuTris, 'MB', L.totalMb, 'sculpt ms', JSON.stringify(await t.eval(() => window.__wl.debug.juno.timing)));
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return t.errors.length === 0;
}
