#!/usr/bin/env node
/* R5.1 AT THE TOP OF ITS OWN WINDOW (a page of its own: the build served as files, no host frame — the kit's drive always frames it, so this one
 * does not use it). On Chromium (the windowless full browser, the kit's --gpu launch) and on WebKit, a phone's touch screen:
 *   OFFERED: the full-screen control drawn, on the title, where the page has the Fullscreen API;
 *   ITS PRESS (a real tap on it): the page full screen (document.fullscreenElement), the browser asked with its bars hidden and then for the
 *   landscape lock, what it got said (window.__wl.fullscreen.said), and the control gone while full screen; LEFT (document.exitFullscreen) the
 *   control is offered again;
 *   NO API (the page's Element.requestFullscreen taken away before it loads, as on an iPhone's Safari): the control not drawn, and why.
 * Usage: node tests/drive/fullscreen_top.mjs <build dir> [chromium,webkit]   (run it inside ~/.mosa/heavy.sh) */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url), pw = require('playwright');
const dir = path.resolve(process.argv[2] || 'build'), engines = (process.argv[3] || 'chromium,webkit').split(',');
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', glb: 'model/gltf-binary', bin: 'application/octet-stream', svg: 'image/svg+xml', woff2: 'font/woff2', ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav', md: 'text/plain' };
const server = http.createServer((q, r) => { const u = new URL(q.url, 'http://x'), f = path.join(dir, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
  if (!f.startsWith(dir) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { r.statusCode = u.pathname === '/favicon.ico' ? 204 : 404; r.end(''); return; }
  r.setHeader('content-type', TYPES[path.extname(f).slice(1).toLowerCase()] || 'application/octet-stream'); r.setHeader('Cache-Control', 'no-store'); fs.createReadStream(f).pipe(r); });
await new Promise((res) => server.listen(0, '127.0.0.1', res));
const origin = 'http://127.0.0.1:' + server.address().port;
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
/* painted, and the loading screen gone (a page of its own takes its loading screen away itself, 0.4 s after its first frame: a press before that
   lands on the loading screen, as a player's would) */
const painted = async (page) => { for (let i = 0; i < 160; i++) { await page.waitForTimeout(250); try { if (await page.evaluate(() => !!(window.__wl && window.__wl.painted) && !document.getElementById('loading'))) return true; } catch (e) { /* not yet */ } } return false; };
const read = (page) => page.evaluate(() => { const b = document.getElementById('wl-fullbtn'), r = b && b.getBoundingClientRect();
  const h = document.getElementById('wl-how-full');
  return { fs: window.__wl.fullscreen || null, shown: !!(b && !b.hidden && getComputedStyle(b).display !== 'none' && r.width > 0), card: !!(h && !h.hidden), full: !!document.fullscreenElement, api: typeof document.documentElement.requestFullscreen === 'function' }; });
for (const engine of engines) {
  const browser = await pw[engine].launch(Object.assign({ headless: true }, engine === 'chromium' ? { channel: 'chromium' } : {}));
  try {
    const mk = async (noApi) => { const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, hasTouch: true }, engine === 'chromium' ? { isMobile: true } : {}));
      if (noApi) await ctx.addInitScript(() => { try { delete Element.prototype.requestFullscreen; } catch (e) { /* */ } Element.prototype.requestFullscreen = undefined; });
      const page = await ctx.newPage(); await page.goto(origin + '/', { waitUntil: 'load' }); return { ctx, page, up: await painted(page) }; };
    { const { ctx, page, up } = await mk(false), t0 = await read(page);
      if (!t0.api) ok(!t0.shown && t0.fs && t0.fs.why === 'no Fullscreen API', engine + ', at the top: this browser has no Fullscreen API for a page — the control not drawn (' + JSON.stringify(t0) + ')');
      else {
        const b = await page.locator('#wl-fullbtn').boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        let t1 = null; for (let i = 0; i < 20; i++) { await page.waitForTimeout(150); t1 = await read(page); if (t1.full && t1.fs && t1.fs.said) break; }
        await page.evaluate(() => document.exitFullscreen && document.exitFullscreen().catch(() => {})); let t2 = null; for (let i = 0; i < 20; i++) { await page.waitForTimeout(150); t2 = await read(page); if (!t2.full) break; }
        ok(up && t0.shown && t0.card && t0.fs.offered && t1.full && /^full screen/.test(t1.fs.said) && !t1.shown && !t2.full && t2.shown,
          engine + ', at the top: OFFERED on the title (' + t0.shown + '); PRESSED — full screen ' + t1.full + ', said "' + (t1.fs && t1.fs.said) + '", the control ' + (t1.shown ? 'still drawn ✖' : 'gone') + '; LEFT — offered again ' + t2.shown);
      }
      await ctx.close(); }
    { const { ctx, page } = await mk(true), t3 = await read(page);
      ok(!t3.shown && !t3.card && t3.fs && t3.fs.why === 'no Fullscreen API', engine + ', NO API (taken away before the page loads, as on an iPhone\'s Safari): the control not drawn — ' + JSON.stringify(t3.fs));
      await ctx.close(); }
  } catch (e) { ok(false, engine + ': threw ' + ((e && e.stack) || e)); }
  finally { await browser.close(); }
}
server.close();
console.log(fail ? 'FULLSCREEN TOP: RED' : 'FULLSCREEN TOP: GREEN'); process.exit(fail ? 1 : 0);
