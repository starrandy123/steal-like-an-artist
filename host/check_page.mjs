/* THE PLAY PAGE AS claude.ai SERVES IT, as near as this laptop can: the generated page wrapped in the host's skeleton and reset (no bridge),
 * its files beside it, served plain; opened on the real GPU at a phone's size both ways — the title, then the first frame after Play.
 * Usage: node host/check_page.mjs <page dir> <out dir>      (writes check.log and shots into <out dir>) */
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
const require = createRequire(import.meta.url), pw = require('playwright');
const dir = path.resolve(process.argv[2]), out = path.resolve(process.argv[3]); fs.mkdirSync(out, { recursive: true });
const log = (...a) => { const l = a.join(' '); console.log(l); fs.appendFileSync(path.join(out, 'check.log'), l + '\n'); };
fs.writeFileSync(path.join(out, 'check.log'), '');
const skeleton = (page) => '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,-apple-system,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + page + '</body></html>';
const TYPES = { html: 'text/html', js: 'text/javascript', css: 'text/css', md: 'text/markdown', txt: 'text/plain', json: 'application/json' };
const missing = [];
const server = http.createServer((q, r) => { const u = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (u === '/favicon.ico') { r.statusCode = 204; r.end(); return; } if (u === '/' || u === '/index.html') { r.setHeader('content-type', 'text/html'); r.end(skeleton(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'))); return; }
  const f = path.join(dir, u); if (!f.startsWith(dir) || !fs.existsSync(f)) { missing.push(u); r.statusCode = 404; r.end(); return; } r.setHeader('content-type', TYPES[path.extname(f).slice(1)] || 'application/octet-stream'); fs.createReadStream(f).pipe(r); });
await new Promise((res) => server.listen(0, '127.0.0.1', res)); const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await pw.chromium.launch({ headless: true, channel: 'chromium' }); let ok = true;
for (const [w, h] of [[390, 844], [844, 390]]) {
  const tag = w < h ? 'up' : 'turn', ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, hasTouch: true, isMobile: true }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message))); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const t0 = Date.now(); await page.goto(origin + '/');
  let painted = false; for (let i = 0; i < 120 && !painted; i++) { await page.waitForTimeout(200); painted = await page.evaluate(() => !!(window.__wl && window.__wl.painted)); }
  const ms = Date.now() - t0; await page.waitForTimeout(1600); await page.screenshot({ path: path.join(out, 'title_' + tag + '.png') });
  /* does the title stack fit the screen, and is anything of the host over Juno? */
  const fit = await page.evaluate(() => { const r = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; }; return { mark: r('wl-title') && document.querySelector('.wl-mark').getBoundingClientRect().top, play: r('wl-play'), record: r('wl-record'), host: r('wl-host'), vh: innerHeight }; });
  const p = await page.evaluate(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.touchscreen.tap(p[0], p[1]); await page.waitForTimeout(250); await page.screenshot({ path: path.join(out, 'play_first_' + tag + '.png') });
  await page.waitForTimeout(1500); await page.screenshot({ path: path.join(out, 'play_' + tag + '.png') });
  const mode = await page.evaluate(() => window.__wl.mode());
  const good = painted && mode === 'play' && errors.length === 0 && fit.mark >= 0;
  log(tag + ': painted ' + painted + ' in ' + ms + ' ms · mark top ' + Math.round(fit.mark) + ' px · Play ' + JSON.stringify(fit.play) + ' · record chip ' + JSON.stringify(fit.record) + ' · after Play the page is in ' + mode + ' · errors ' + JSON.stringify(errors.slice(0, 4)));
  if (!good) ok = false; await ctx.close();
}
if (missing.length) { ok = false; log('missing files asked for: ' + missing.join(', ')); }
await browser.close(); server.close(); log(ok ? 'PAGE CHECK: GREEN' : 'PAGE CHECK: RED'); process.exit(ok ? 0 : 1);
