/* the run, in the page: started from the title's own button, its clock, a wax bar found, the clock run out, the results card */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  const b = await t.eval(() => { const r = document.getElementById('wl-run').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await t.tap(b[0], b[1]); await t.sleep(900);
  const r0 = await t.eval(() => window.__wl.run());
  await t.shot('run_clock_' + tag);
  /* into the Block's wax bar */
  await t.eval(() => window.__wl.debug.place([39.5, 0, 8.5], 90, 4.6)); await t.sleep(2600);
  const r1 = await t.eval(() => window.__wl.run());
  await t.shot('run_wax_' + tag);
  await t.eval(() => { window.__wl.debug.runner.left = 1.2; }); await t.sleep(2500);
  const mode = await t.eval(() => window.__wl.mode()); await t.sleep(400);
  await t.shot('run_results_' + tag);
  t.log('run: on ' + r0.on + ' left ' + r0.left.toFixed(1) + ' · after the Block: wax ' + r1.got + ' · at the end the page is in ' + mode);
  t.log('errors', JSON.stringify(t.errors.slice(0, 4)));
  return r0.on && r1.got >= 1 && mode === 'results' && t.errors.length === 0;
}
