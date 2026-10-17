/* the park for the eye: wide at golden hour from two sides, and each surface close — the granite ledge and its steel edge, a rail, the
 * coping, the bowl, the stairs and their rail, the planter, the bench and the trees */
export default async function (page, t) {
  for (let i = 0; i < 120; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  await t.eval(() => { window.__wl.debug.mode('shot'); });
  const views = [
    ['park_wide_sunward', { pos: [70, 13, 52], look: [24, 0, 16], fov: 50 }], ['park_wide_lit', { pos: [-9, 12, -9], look: [32, 0, 24], fov: 50 }],
    ['ledge', { pos: [32.6, 0.75, 21.9], look: [34.6, 0.3, 23.3], fov: 42 }], ['rail', { pos: [28.6, 0.8, 10.6], look: [31, 0.3, 12], fov: 42 }],
    ['coping', { pos: [56.6, 2.45, 13.2], look: [59, 1.75, 15.5], fov: 42 }], ['bowl', { pos: [9, 3.4, 0.4], look: [9, -0.6, 10], fov: 52 }],
    ['stairs', { pos: [47.5, 1.5, 24.5], look: [53, 0.6, 31], fov: 46 }], ['dressing', { pos: [39.5, 1.7, 20.2], look: [45, 0.7, 25.5], fov: 48 }],
    ['trees', { pos: [1.5, 1.7, 33], look: [-5, 3.2, 37], fov: 55 }], ['grass_edge', { pos: [0.6, 1.0, 12], look: [-6, 0.0, 16], fov: 55 }], ['ramp_bowl', { pos: [17, 2.2, 10], look: [9, 0.0, 10], fov: 55 }],
  ];
  for (const [name, v] of views) { await t.eval((v) => { window.__wl.debug.shot = v; }, v); await t.sleep(500); await t.shot('world_' + name + '_' + tag); }
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return t.errors.length === 0;
}
