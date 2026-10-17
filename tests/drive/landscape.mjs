#!/usr/bin/env node
/* R5.3 LANDSCAPE, AND NOTCHED (the owner: full screen landscape). The page at the top of its own window, a phone's touch screen:
 *   844×390 (a phone turned), and 932×430 with a notched phone's safe-area insets — 59 px each side, 21 px at the bottom, set on the page as a
 *   phone sets them (Chromium's Emulation.setSafeAreaInsetsOverride: env(safe-area-inset-*) reads them; WebKit cannot be handed insets, so it
 *   reads the 844×390 view alone).
 * On the title, in a two-minute run, paused, in How to skate and on the run's results (10-17: every card; round 25's pause card sat 7 px
 *   above a turned phone in WebKit), the HUD read: every element drawn (the score, the clock, the goal, the buttons, the hints, the
 * cards' buttons) has its CONTENT inside the safe area — the viewport less its insets: a block's text (its content box), a button's whole
 * face (a finger's target) — while a backdrop may run on into the inset (the score's dark box does, by its margin: a background reaches the
 * edge, the words stay clear of the notch) but never off the screen; and no two of the HUD's own contents over each other. Each view's
 * picture is kept (runs/landscape/, or the out folder). Usage: node tests/drive/landscape.mjs <build dir> [chromium,webkit] [out]   (inside ~/.mosa/heavy.sh) */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url), pw = require('playwright');
const dir = path.resolve(process.argv[2] || decodeURIComponent(new URL('../../build', import.meta.url).pathname)),   /* its own tree's build: a plant's tree reads its own */ engines = (process.argv[3] || 'chromium,webkit').split(','), out = path.resolve(process.argv[4] || path.join(path.dirname(dir), 'runs', 'landscape'));
fs.mkdirSync(out, { recursive: true });
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', glb: 'model/gltf-binary', bin: 'application/octet-stream', svg: 'image/svg+xml', woff2: 'font/woff2', ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', md: 'text/plain' };
const server = http.createServer((q, r) => { const u = new URL(q.url, 'http://x'), f = path.join(dir, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
  if (!f.startsWith(dir) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { r.statusCode = u.pathname === '/favicon.ico' ? 204 : 404; r.end(''); return; }
  r.setHeader('content-type', TYPES[path.extname(f).slice(1).toLowerCase()] || 'application/octet-stream'); r.setHeader('Cache-Control', 'no-store'); fs.createReadStream(f).pipe(r); });
await new Promise((res) => server.listen(0, '127.0.0.1', res));
const origin = 'http://127.0.0.1:' + server.address().port;
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const VIEWS = [['turned', { width: 844, height: 390 }, null], ['notched', { width: 932, height: 430 }, { top: 0, left: 59, bottom: 21, right: 59 }]];
/* what the page draws of its HUD, by mode: the elements that are on the screen (shown, a size, not transparent) */
const SEL = { all: ['.wl-score', '#wl-clock', '#wl-goal', '#wl-pausebtn', '#wl-fullbtn', '#wl-hint-left', '#wl-hint-right'], title: ['#wl-play', '#wl-run', '#wl-how', '#wl-assist', '#wl-look', '#wl-sound'], pause: ['#wl-resume', '#wl-restart'], howto: ['#wl-howok'], results: ['#wl-again', '#wl-free'] };
const readHud = (page, mode, inset) => page.evaluate(([sels, inset, card]) => {
  const W = innerWidth, H = innerHeight, S = { l: inset ? inset.left : 0, r: W - (inset ? inset.right : 0), t: inset ? inset.top : 0, b: H - (inset ? inset.bottom : 0) }, els = [];
  const measure = (e) => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(), px = (k) => parseFloat(cs[k]) || 0, btn = e.tagName === 'BUTTON';
    const c = btn ? { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom } : { x0: r.left + px('paddingLeft') + px('borderLeftWidth'), y0: r.top + px('paddingTop') + px('borderTopWidth'), x1: r.right - px('paddingRight') - px('borderRightWidth'), y1: r.bottom - px('paddingBottom') - px('borderBottomWidth') };
    return { x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, b: { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom } }; };
  const off = (m) => m.x0 < S.l - 0.5 || m.x1 > S.r + 0.5 || m.y0 < S.t - 0.5 || m.y1 > S.b + 0.5 || m.b.x0 < -0.5 || m.b.x1 > W + 0.5 || m.b.y0 < -0.5 || m.b.y1 > H + 0.5;
  for (const s of sels) { const e = document.querySelector(s); if (!e) continue; const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    let hid = false; for (let p = e; p; p = p.parentElement) { const c = getComputedStyle(p); if (p.hidden || c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) { hid = true; break; } }
    if (hid || r.width < 1 || r.height < 1) continue;
    const px = (k) => parseFloat(cs[k]) || 0, btn = e.tagName === 'BUTTON';   // a button's whole face; a block's content box (its padding and border off)
    const c = btn ? { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom } : { x0: r.left + px('paddingLeft') + px('borderLeftWidth'), y0: r.top + px('paddingTop') + px('borderTopWidth'), x1: r.right - px('paddingRight') - px('borderRightWidth'), y1: r.bottom - px('paddingBottom') - px('borderBottomWidth') };
    els.push({ s, e, x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, b: { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom } }); }
  /* a card that scrolls: a control past the screen is read where scrolling its card brings it (its card's scroll put back after); one above
     the screen stays there, as a finger finds it — nothing scrolls a page above its top (round 25's pause card). Overlaps are read in one state */
  let scrolled = 0;
  if (card) for (const m of els) if (off(m)) { const box = m.e.closest('.wl-card'), top = box ? box.scrollTop : 0; m.e.scrollIntoView({ block: 'center', inline: 'center' });   /* where a finger can scroll it: as far in as the card lets it, its padding (the inset) kept — 'nearest' set it flush under the home bar */
    const n = measure(m.e); if (!off(n)) { m.reach = n; scrolled++; } if (box) box.scrollTop = top; }
  const at = (m) => m.reach || m;
  const outside = els.map(at).filter((e) => e.x0 < S.l - 0.5 || e.x1 > S.r + 0.5 || e.y0 < S.t - 0.5 || e.y1 > S.b + 0.5).map((e, i) => (e.s || '') + ' [' + [e.x0, e.y0, e.x1, e.y1].map((v) => v.toFixed(0)).join(',') + ']')
    .concat(els.filter((m) => { const e = at(m); return e.b.x0 < -0.5 || e.b.x1 > W + 0.5 || e.b.y0 < -0.5 || e.b.y1 > H + 0.5; }).map((m) => { const e = at(m); return m.s + ' off the screen [' + [e.b.x0, e.b.y0, e.b.x1, e.b.y1].map((v) => v.toFixed(0)).join(',') + ']'; }));
  const over = []; for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i], b = els[j], w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); if (w > 1 && h > 1) over.push(a.s + ' × ' + b.s); }
  return { W, H, safe: S, n: els.length, drawn: els.map((e) => e.s), outside, over, scrolled };
}, [mode === 'title' ? [...SEL.all, ...SEL.title] : SEL[mode] ? [...SEL.all, ...SEL[mode]] : SEL.all, inset, mode !== 'title' && mode !== 'play']);
for (const engine of engines) {
  const browser = await pw[engine].launch(Object.assign({ headless: true }, engine === 'chromium' ? { channel: 'chromium' } : {}));
  try {
    for (const [name, vp, inset] of VIEWS) {
      if (inset && engine !== 'chromium') { console.log('— ' + engine + ', ' + name + ': no way to hand this browser a notch\'s insets (read on Chromium)'); continue; }
      const ctx = await browser.newContext(Object.assign({ viewport: vp, hasTouch: true }, engine === 'chromium' ? { isMobile: true, deviceScaleFactor: 3 } : {})), page = await ctx.newPage();
      if (inset) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: inset }); }
      await page.goto(origin + '/', { waitUntil: 'load' });
      for (let i = 0; i < 160; i++) { await page.waitForTimeout(250); if (await page.evaluate(() => !!(window.__wl && window.__wl.painted) && !document.getElementById('loading'))) break; }
      const env = await page.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:env(safe-area-inset-left,0px);top:env(safe-area-inset-top,0px);right:env(safe-area-inset-right,0px);bottom:env(safe-area-inset-bottom,0px)'; document.body.appendChild(d); const r = d.getBoundingClientRect(); d.remove(); return { l: r.left, t: r.top, r: innerWidth - r.right, b: innerHeight - r.bottom }; });
      const tag = engine + '_' + name, reads = [];
      reads.push(['title', await readHud(page, 'title', inset)]); await page.screenshot({ path: path.join(out, tag + '_title.png') });
      const tap = async (sel) => { await page.locator(sel).scrollIntoViewIfNeeded(); const b = await page.locator(sel).boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
      const shows = async (sel, ms) => { for (let t = 0; t < ms; t += 250) { if (await page.locator(sel).isVisible()) return true; await page.waitForTimeout(250); } return false; };
      await tap('#wl-run'); await page.waitForTimeout(1200);
      reads.push(['play', await readHud(page, 'play', inset)]); await page.screenshot({ path: path.join(out, tag + '_play.png') });
      await tap('#wl-pausebtn'); await page.waitForTimeout(500);
      reads.push(['pause', await readHud(page, 'pause', inset)]); await page.screenshot({ path: path.join(out, tag + '_pause.png') });
      /* How to skate, from the pause card; then the run's results (its clock run out: the run ends at the next quiet frame) */
      if (await page.locator('#wl-how2').isVisible()) { await tap('#wl-how2');
        if (await shows('#wl-howcard', 3000)) { await page.waitForTimeout(300); reads.push(['how to skate', await readHud(page, 'howto', inset)]); await page.screenshot({ path: path.join(out, tag + '_howto.png') }); await tap('#wl-howok'); await page.waitForTimeout(400); }
        else reads.push(['how to skate', { n: 0, outside: ['#wl-howcard never showed'], over: [] }]); }
      else reads.push(['how to skate', { n: 0, outside: ['#wl-how2 not on the pause card'], over: [] }]);
      if (await page.locator('#wl-resume').isVisible()) { await tap('#wl-resume'); await page.waitForTimeout(400); }
      await page.evaluate(() => { const D = window.__wl.debug; if (D && D.runner) D.runner.left = 0; });
      if (await shows('#wl-results', 10000)) { await page.waitForTimeout(300); reads.push(['results', await readHud(page, 'results', inset)]); await page.screenshot({ path: path.join(out, tag + '_results.png') }); }
      else reads.push(['results', { n: 0, outside: ['#wl-results never showed (the run\'s clock at 0 for 10 s)'], over: [] }]);
      const bad = reads.filter(([, r]) => r.outside.length || r.over.length);
      ok(bad.length === 0 && (!inset || (Math.abs(env.l - inset.left) < 1 && Math.abs(env.b - inset.bottom) < 1)), engine + ', ' + name + ' ' + vp.width + '×' + vp.height + (inset ? ' (insets read by the page: left ' + env.l + ', right ' + env.r + ', bottom ' + env.b + ')' : '') + ': ' +
        reads.map(([m, r]) => m + ' ' + r.n + ' drawn' + (r.scrolled ? ' (' + r.scrolled + ' reached by scrolling its card)' : '') + (r.outside.length ? ', OUTSIDE THE SAFE AREA ' + r.outside.join(' ') : '') + (r.over.length ? ', OVER EACH OTHER ' + r.over.join(' · ') : '')).join(' · ') + ' — pictures in runs/landscape/' + tag + '_*.png');
      await ctx.close();
    }
  } catch (e) { ok(false, engine + ': threw ' + ((e && e.stack) || e)); }
  finally { await browser.close(); }
}
server.close();
console.log(fail ? 'LANDSCAPE: RED' : 'LANDSCAPE: GREEN'); process.exit(fail ? 1 : 0);
