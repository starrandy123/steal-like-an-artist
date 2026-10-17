/* R5.2 TURNING THE PHONE KEEPS THE RUN (the owner: full screen landscape). A two-minute run begun upright; the phone turned to landscape and
 * back, twice, the page sampled every 100 ms through it: never out of play, the pause card never shown, the run's clock running on (it never
 * stops nor starts again) and the board moving. Then the page REALLY hidden (its visibility hidden, its own event) pauses it — the one reason
 * the card comes — and the run waits there. Run on WebKit and on Chromium, from upright (--viewport 390x844).
 * Plant (tests/plants.mjs turn_pauses): a turn taken as a hide → RED. */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp0 = page.viewportSize(), up = vp0.width < vp0.height ? vp0 : { width: vp0.height, height: vp0.width }, turned = { width: up.height, height: up.width };
  const frame = await (await t.game().frameElement()).boundingBox();
  const at = (id) => t.eval((id) => { const r = document.getElementById(id).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, id);
  const runBtn = await at('wl-run'); await t.tap(frame.x + runBtn[0], frame.y + runBtn[1]); await t.sleep(500);
  const read = () => t.eval(() => { const R = window.__wl.run ? window.__wl.run() : {}, card = document.getElementById('wl-pause');
    return { mode: window.__wl.mode(), card: card ? !card.hidden : null, on: !!R.on, left: R.left, w: innerWidth, h: innerHeight }; });
  const s0 = await read();
  const rows = [], bad = [];
  for (const [label, size] of [['turned', turned], ['upright', up], ['turned', turned], ['upright', up]]) {
    await page.setViewportSize(size);
    for (let i = 0; i < 12; i++) { await t.sleep(100); const r = await read(); r.label = label; rows.push(r); if (r.mode !== 'play' || r.card || !r.on) bad.push(label + ' ' + JSON.stringify(r)); }
  }
  const lefts = rows.map((r) => r.left), ran = lefts[lefts.length - 1] < s0.left - 3 && lefts.every((x, i) => i === 0 || x <= lefts[i - 1] + 1e-6);
  const sized = rows.some((r) => r.w > r.h) && rows.some((r) => r.w < r.h);
  /* the page REALLY hidden: its visibility, and its own event */
  await t.eval(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await t.sleep(300); const hid = await read(); await t.sleep(600); const hid2 = await read();
  const paused = hid.mode === 'pause' && hid.card === true && Math.abs(hid2.left - hid.left) < 0.05;
  const good = s0.mode === 'play' && s0.on && bad.length === 0 && ran && sized && paused;
  console.log((good ? '✔ ' : '✖ ') + 'TURNING THE PHONE KEEPS THE RUN (' + page.context().browser().browserType().name() + '): ' + rows.length + ' samples over two turns and back — ' + (bad.length ? bad.length + ' out of play or carded: ' + bad.slice(0, 3).join(' · ') : 'in play every one, no card') + ' · the run\'s clock ' + s0.left.toFixed(1) + ' → ' + lefts[lefts.length - 1].toFixed(1) + ' s' + (ran ? ', running on' : ' ✖ stopped or started again') + (sized ? '' : ' ✖ the page never turned (' + rows.map((r) => r.w + '×' + r.h).slice(0, 3).join(', ') + ')') + ' · then REALLY hidden: ' + (paused ? 'paused, the card shown, the clock held' : '✖ ' + JSON.stringify(hid) + ' → ' + JSON.stringify(hid2)));
  return good;
}
