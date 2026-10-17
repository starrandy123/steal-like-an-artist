/* the title, as a player first sees it */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(); await t.sleep(1500); await t.shot('title_' + (vp.width < vp.height ? 'up' : 'turn'));
  t.log('errors', JSON.stringify(t.errors.slice(0, 4))); return t.errors.length === 0;
}
