/* EVERY PARK FROM ABOVE, LAID THE WAY ITS PLAN IS DRAWN (DESIGN §6.0): for each park in the registry, the lens high over its middle looking
 * straight down with north up, the canvas flipped horizontally for the picture (east right, as the plan) and the words on it. */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  const parks = await t.eval(() => window.__wl.parks());
  for (const p of parks) {
    if ((await t.eval(() => window.__wl.park())) !== p.id) await t.eval((id) => window.__wl.switchPark(id), p.id);
    for (let k = 0; k < 40 && (await t.eval(() => window.__wl.park())) !== p.id; k++) await t.sleep(250);
    await t.eval(() => window.__wl.debug.mode('shot'));
    await t.eval(() => { const P = window.__wl.debug.world.data, cx = P.size[0] / 2, cz = P.size[1] / 2, h = Math.max(P.size[0], P.size[1]) * 0.95;
      window.__wl.debug.shot = { pos: [cx, h, cz - 0.01], look: [cx, 0, cz], fov: 70 }; });
    await t.sleep(900);
    await t.eval((name) => { const c = document.getElementById('wl-canvas'); c.style.transform = 'scaleX(-1)'; const l = document.createElement('div'); l.id = 'wl-flip-note';
      l.textContent = name + ' · flipped to the plan · north up, east right'; Object.assign(l.style, { position: 'fixed', left: '12px', bottom: '10px', zIndex: 99, font: '600 14px system-ui, sans-serif', color: '#fff', background: 'rgba(0,0,0,.55)', padding: '4px 8px', borderRadius: '6px' }); document.body.appendChild(l); }, p.name);
    await t.sleep(250); await t.shot('plan_' + p.id + '_' + tag);
    await t.eval(() => { document.getElementById('wl-canvas').style.transform = ''; const l = document.getElementById('wl-flip-note'); if (l) l.remove(); window.__wl.debug.shot = null; window.__wl.debug.mode('title'); });
    await t.sleep(400);
  }
  t.log('parks shot from above: ' + parks.map((p) => p.id).join(', ') + ' · errors ' + JSON.stringify(t.errors.slice(0, 4)));
  return t.errors.length === 0;
}
