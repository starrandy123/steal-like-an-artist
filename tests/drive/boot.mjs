/* the first boot: the loading screen, the title, Play, a few seconds of rolling and an ollie, and what the page says about itself */
export default async function (page, t) {
  const g = () => t.game();
  const t0 = Date.now();
  let painted = false;
  for (let i = 0; i < 120 && !painted; i++) { await t.sleep(250); try { painted = await t.eval(() => !!(window.__wl && window.__wl.painted)); } catch (e) { /* frame not ready */ } }
  t.log('painted', painted, 'after', Date.now() - t0, 'ms');
  const boot = await t.eval(() => ({ boot: window.__MOSA_BOOT ? JSON.stringify(window.__MOSA_BOOT) : null, state: window.__mosaBoot && window.__mosaBoot.state ? JSON.stringify(window.__mosaBoot.state()) : null, loading: !!document.querySelector('[data-mosa-loading]'), controls: JSON.stringify(window.__MOSA_CONTROLS || null).slice(0, 400) }));
  t.log('boot', JSON.stringify(boot));
  if (!painted) { t.log('errors', JSON.stringify(t.errors.slice(0, 8))); return false; }
  await t.sleep(1200);
  await t.shot('boot_title');
  const L = await t.eval(() => window.__wl.ledger && window.__wl.ledger());
  t.log('ledger', JSON.stringify(L));
  const vp = page.viewportSize();
  const play = await t.eval(() => { const b = document.getElementById('wl-play'); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await t.tap(play[0], play[1]);
  await t.sleep(600);
  t.log('mode', await t.eval(() => window.__wl.mode()));
  /* push: the left thumb held and pushed up */
  await t.hold(vp.width * 0.22, vp.height * 0.8, vp.width * 0.22, vp.height * 0.8 - 50, 1);
  await t.sleep(1800);
  await t.release();
  await t.shot('boot_roll');
  t.log('after push', JSON.stringify(await t.eval(() => { const r = window.__wl.read(); return { state: r.state, p: r.p.map((x) => +x.toFixed(2)), speed: +r.speed.toFixed(2), surface: r.surface }; })));
  /* a tap on the pad: a little ollie */
  await t.tap(vp.width * 0.78, vp.height * 0.78);
  await t.sleep(250);
  await t.shot('boot_air');
  await t.sleep(1500);
  const r = await t.eval(() => window.__wl.read());
  t.log('after tap', JSON.stringify({ state: r.state, p: r.p.map((x) => +x.toFixed(2)), speed: +r.speed.toFixed(2), stats: r.stats, score: r.score }));
  t.log('perf', JSON.stringify(await t.eval(() => window.__wl.perf())));
  t.log('errors', JSON.stringify(t.errors.slice(0, 8)));
  return painted && t.errors.length === 0;
}
