/* THE SCORE CAN BE READ WHEREVER SHE IS (the supervisor's note: the tree's leaves behind the score block at the spawn, upright).
 * The block's three lines (the number, its label, the best combo) are read against the ground each one stands on, at the spawn and at places
 * round the park facing every way, the game playing. Three pictures of the block, the same clip:
 *   GROUND   its text made transparent: the game's picture with whatever the block lays under its text (its shadow, a backdrop);
 *   CALM     the same without the text's shadow: what the scene and a backdrop give;
 *   GLYPHS   each line painted a colour of its own over no game at all: where each line's letters are.
 * Each line's RING is the ground within 2 px (css) of its letters, the letters left out (the counters of a 0 or an e are in it). Read on it:
 *   the line's colour, at the line's own opacity, over each ring pixel: the worst 5 % of those contrasts (WCAG's ratio) — at least 3 : 1 for
 *   the number (26 px bold: large text) and 4.5 : 1 for the 12 px lines;
 *   how busy the CALM ground is under the block: the spread of its brightness (leaves against sky behind small letters read as noise).
 * Upright and turned are the viewport's. Each place's three crops are written beside the log, with a fourth as the player sees it. */
import fs from 'node:fs';
import path from 'node:path';
const PLACES = [[30, 0, 14, 0], [30, 0, 14, 90], [30, 0, 14, 180], [30, 0, 14, 270], [18, 0, 8, 90], [42, 0, 22, 270], [57, 0, 31, 180], [3, 0, 42, 135], [39.5, 0, 8.5, 315]];
const BARS = { b: 3, span: 4.5, em: 4.5 }, SPREAD = 0.12, RING = 2;
const METER = '.wl-special, .wl-special * { visibility: hidden !important; } ';
const CSS = {
  ground: METER + '.wl-score, .wl-score * { color: transparent !important; }',
  calm: METER + '.wl-score, .wl-score * { color: transparent !important; text-shadow: none !important; }',
  glyphs: METER + '#wl-canvas { visibility: hidden !important; } .wl-score, .wl-score * { text-shadow: none !important; } .wl-score b { color: #ff00ff !important; } .wl-score span { color: #00ffff !important; } .wl-score em { color: #ffff00 !important; }',
};
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  const frame = await (await t.game().frameElement()).boundingBox();
  const style = (css) => t.eval((css) => { let s = document.getElementById('wl-probe'); if (!s) { s = document.createElement('style'); s.id = 'wl-probe'; document.head.appendChild(s); } s.textContent = css; }, css);
  const read = async (name) => {
    const r = await t.eval(() => { const q = (s) => document.querySelector(s), b = q('.wl-score').getBoundingClientRect(), op = (s) => +getComputedStyle(q(s)).opacity, col = (s) => getComputedStyle(q(s)).color;
      return { x: b.x, y: b.y, w: b.width, h: b.height, dpr: window.devicePixelRatio, lines: { b: [op('.wl-score b'), col('.wl-score b')], span: [op('.wl-score span'), col('.wl-score span')], em: [op('.wl-score em'), col('.wl-score em')] } }; });
    const clip = { x: frame.x + Math.max(0, r.x - 8), y: frame.y + Math.max(0, r.y - 8), width: r.w + 16, height: r.h + 16 };
    const pics = {};
    for (const k of ['ground', 'calm', 'glyphs']) { await style(CSS[k]); await t.sleep(150); const png = await page.screenshot({ clip }); pics[k] = png.toString('base64'); fs.writeFileSync(path.join(t.outDir, 'hud_' + name + '_' + tag + '_' + k + '.png'), png); }
    await style(''); await t.sleep(150); fs.writeFileSync(path.join(t.outDir, 'hud_' + name + '_' + tag + '_seen.png'), await page.screenshot({ clip }));   // as the player sees it
    return t.eval(async ([pics, r, RING]) => {
      const px = async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return { w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data }; };
      const G = await px(pics.ground), C = await px(pics.calm), M = await px(pics.glyphs), w = G.w, h = G.h, n = w * h;
      const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const lum = (R, Gc, B) => 0.2126 * lin(R) + 0.7152 * lin(Gc) + 0.0722 * lin(B);
      /* which line each pixel of the GLYPHS picture belongs to, by its hue (an edge pixel is its colour mixed with the dark page) */
      const owner = new Uint8Array(n);   // 0 none · 1 the number · 2 its label · 3 the best combo
      for (let p = 0; p < n; p++) { const R = M.d[p * 4], Gc = M.d[p * 4 + 1], B = M.d[p * 4 + 2];
        if (R - Gc > 60 && B - Gc > 60) owner[p] = 1; else if (Gc - R > 60 && B - R > 60) owner[p] = 2; else if (R - B > 60 && Gc - B > 60) owner[p] = 3; }
      const rad = Math.round(RING * r.dpr), out = {}, U = new Uint8Array(n);   // U: every line's letters and rings
      const names = { 1: 'b', 2: 'span', 3: 'em' };
      for (const k of [1, 2, 3]) {
        /* the line's letters dilated by the ring's radius (a square, separable), minus every line's letters */
        const a = new Uint8Array(n), b2 = new Uint8Array(n);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let on = 0; for (let i = Math.max(0, x - rad); i <= Math.min(w - 1, x + rad) && !on; i++) if (owner[y * w + i] === k) on = 1; a[y * w + x] = on; }
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let on = 0; for (let j = Math.max(0, y - rad); j <= Math.min(h - 1, y + rad) && !on; j++) if (a[j * w + x]) on = 1; b2[y * w + x] = on && !owner[y * w + x] ? 1 : 0; }
        for (let p = 0; p < n; p++) if (b2[p] || owner[p] === k) U[p] = 1;
        const [op, col] = r.lines[names[k]], tc = col.match(/[\d.]+/g).map(Number), cs = [];
        let letters = 0; for (let p = 0; p < n; p++) if (owner[p] === k) letters++;
        for (let p = 0; p < n; p++) if (b2[p]) {
          const gr = G.d[p * 4], gg = G.d[p * 4 + 1], gb = G.d[p * 4 + 2], lg = lum(gr, gg, gb);
          const lt = lum(op * tc[0] + (1 - op) * gr, op * tc[1] + (1 - op) * gg, op * tc[2] + (1 - op) * gb);
          cs.push((Math.max(lt, lg) + 0.05) / (Math.min(lt, lg) + 0.05));
        }
        cs.sort((u, v) => u - v);
        out[names[k]] = { ring: cs.length, letters, worst5: cs.length ? cs[Math.floor(cs.length * 0.05)] : 0, median: cs.length ? cs[cs.length >> 1] : 0, opacity: op };
      }
      /* the calm ground's spread under the block's letters and rings */
      const L = []; for (let p = 0; p < n; p++) if (U[p]) L.push(lum(C.d[p * 4], C.d[p * 4 + 1], C.d[p * 4 + 2]));
      const mean = L.reduce((s, v) => s + v, 0) / Math.max(1, L.length), sd = Math.sqrt(L.reduce((s, v) => s + (v - mean) * (v - mean), 0) / Math.max(1, L.length));
      out.calm = { mean, sd, n: L.length }; out.box = [Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h)];
      return out;
    }, [pics, r, RING]);
  };
  await t.eval(() => { window.__wl.debug.mode('play'); }); await t.sleep(1200);
  const rows = [['spawn', await read('spawn')]];
  for (const [x, y, z, hd] of PLACES) {
    await t.eval(([x, y, z, hd]) => { window.__wl.debug.place([x, y, z], hd, 0); }, [x, y, z, hd]); await t.sleep(1200);
    rows.push([x + ',' + z + ' facing ' + hd + '°', await read('at_' + x + '_' + z + '_' + hd)]);
  }
  /* THE WORST SKY: the camera turned so the sun's own disc stands behind the middle of the block (found by turning the lens until the sun
     projects there: yaw and pitch, no roll; the lens is the one the game is playing with) */
  const aim = await t.eval(() => {
    const D = window.__wl.debug, cam = D.stage.camera, b = document.querySelector('.wl-score').getBoundingClientRect();
    const tx = ((b.x + b.width / 2) / innerWidth) * 2 - 1, ty = 1 - ((b.y + b.height / 2) / innerHeight) * 2, pos = [31, 1.5, 22], fov = cam.fov;
    const sun = D.stage.sunDir.clone().normalize(), half = (fov * Math.PI) / 360, kx = Math.atan(cam.aspect * Math.tan(half)), ky = half;
    let yaw = Math.atan2(sun.x, sun.z), pitch = Math.asin(sun.y), nd = null;
    for (let i = 0; i < 40; i++) {
      const look = [pos[0] + Math.sin(yaw) * Math.cos(pitch) * 10, pos[1] + Math.sin(pitch) * 10, pos[2] + Math.cos(yaw) * Math.cos(pitch) * 10];
      cam.position.set(...pos); cam.lookAt(...look); cam.updateMatrixWorld(true);
      nd = sun.clone().multiplyScalar(600).add(cam.position).project(cam);
      yaw += (tx - nd.x) * kx * 0.8; pitch += (nd.y - ty) * ky * 0.8;
    }
    const look = [pos[0] + Math.sin(yaw) * Math.cos(pitch) * 10, pos[1] + Math.sin(pitch) * 10, pos[2] + Math.cos(yaw) * Math.cos(pitch) * 10];
    D.shot = { pos, look, fov }; return { at: [+nd.x.toFixed(3), +nd.y.toFixed(3)], want: [+tx.toFixed(3), +ty.toFixed(3)], pitch: +(pitch * 180 / Math.PI).toFixed(1) };
  });
  await t.sleep(900);
  rows.push(['the sun behind it (the disc at ' + aim.at + ', the block\'s middle at ' + aim.want + ', the lens ' + aim.pitch + '° up)', await read('sun')]);
  await t.eval(() => { window.__wl.debug.shot = null; });
  const sunOk = Math.abs(aim.at[0] - aim.want[0]) < 0.02 && Math.abs(aim.at[1] - aim.want[1]) < 0.02;
  let bad = sunOk ? 0 : 1;
  if (!sunOk) t.log('✖ the lens did not put the sun behind the block: ' + JSON.stringify(aim));
  t.log('the block at ' + JSON.stringify(rows[0][1].box) + ' (css px: left, top, width, height)');
  for (const [name, g] of rows) {
    const lines = ['b', 'span', 'em'].map((k) => { const o = g[k], ok = o.letters > 20 && o.worst5 >= BARS[k]; if (!ok) bad++; return (ok ? '✔' : '✖') + ' ' + ({ b: 'the number', span: 'its label', em: 'the best combo' })[k] + ' ' + o.worst5.toFixed(2) + ' : 1 (≥ ' + BARS[k] + '; median ' + o.median.toFixed(1) + ', ' + o.letters + ' letter px)'; });
    const calmOk = g.calm.sd <= SPREAD; if (!calmOk) bad++;
    t.log('the score, ' + name + ': ' + lines.join(' · ') + ' · ' + (calmOk ? '✔' : '✖') + ' the ground under it spreads ' + g.calm.sd.toFixed(3) + ' (≤ ' + SPREAD + '; mean ' + g.calm.mean.toFixed(3) + ')');
  }
  t.log('HUD: ' + (bad ? 'RED · ' + bad + ' readings under their bars' : 'GREEN') + ' · ' + rows.length + ' places, three lines each');
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return t.errors.length === 0 && bad === 0;
}
