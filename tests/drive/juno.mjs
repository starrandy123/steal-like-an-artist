/* Juno close, for the eye: full body from four sides, the face, the hands, the shoes on the board — rolling, crouched, in the air */
export default async function (page, t) {
  for (let i = 0; i < 120; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  await t.eval(() => { window.__wl.debug.mode('shot'); });
  const views = [
    ['full_front', { az: 90, dist: 2.7, h: 0.95, at: 0.9, fov: 38 }], ['full_34', { az: 45, dist: 2.7, h: 1.0, at: 0.9, fov: 38 }],
    ['full_side_nose', { az: 0, dist: 2.7, h: 1.0, at: 0.9, fov: 38 }], ['full_back', { az: -90, dist: 2.7, h: 1.0, at: 0.9, fov: 38 }],
    ['face', { az: 40, dist: 0.85, h: 1.62, at: 1.58, fov: 30 }], ['hands', { az: 100, dist: 1.4, h: 1.0, at: 0.82, fov: 34 }],
    ['shoes', { az: 115, dist: 1.05, h: 0.5, at: 0.12, fov: 34 }],
  ];
  for (const [name, v] of views) { await t.eval((v) => { window.__wl.debug.shot = v; }, v); await t.sleep(450); await t.shot('juno_' + name + '_' + tag); }
  /* the crouch before a pop, and a held air */
  await t.eval(() => { window.__wl.debug.shot = { az: 90, dist: 2.7, h: 0.95, at: 0.8, fov: 38, pose: { crouch: 0.95 } }; }); await t.sleep(500); await t.shot('juno_crouch_' + tag);
  await t.eval(() => { window.__wl.debug.shot = { az: 60, dist: 2.7, h: 0.95, at: 0.8, fov: 38, pose: { state: 'air', airT: 0.3 } }; }); await t.sleep(500); await t.shot('juno_air_' + tag);
  const L = await t.eval(() => window.__wl.ledger());
  t.log('triangles', JSON.stringify(L.triangles), 'drawCalls', L.drawCalls, 'gpuTris', L.gpuTris, 'MB', L.totalMb);
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return t.errors.length === 0;
}
