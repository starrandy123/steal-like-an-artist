/* an SVG plan to a PNG, at 1:1, in a headless Chromium (no window): node tools/plan_png.mjs <in.svg> <out.png> */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [inp, out] = process.argv.slice(2);
const svg = fs.readFileSync(inp, 'utf8'), w = +svg.match(/width="(\d+)"/)[1], h = +svg.match(/height="(\d+)"/)[1];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
await page.screenshot({ path: path.resolve(out), clip: { x: 0, y: 0, width: w, height: h } });
await browser.close();
console.log('wrote', out, w + '×' + h);
