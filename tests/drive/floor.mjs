/* THE FLOOR AT GAMEPLAY DISTANCE (the supervisor's W1: stains, cracks, oil, wax and wheel lanes must read 2–6 m from the lens). A camera at the
 * follow camera's height (1 m), level-ish, at five places on the park (the plaza's slab twice, the terrace's pavers, a deck, the ledge run),
 * with Juno sent away. After the game draws the frame the picture is read back; a ray through each sampled pixel finds what it shows, and
 * only the floor 2–6 m away is kept. Two numbers a place: DETAIL — the local contrast (the spread of brightness in a 9 px window over its
 * mean, the average over the floor's windows) — and MARKS — the share of floor samples more than 10 % darker than the floor's median (stains,
 * oil, cracks, lanes) — and the colour of each concrete in view (W2: its mean's hue and saturation: a pink or mauve grey reads at 280–350°;
 * one grey means the concretes differ in brightness, not in hue). Written to the log for each look (Real and Painted); the shots beside it. */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  await t.eval(() => { const D = window.__wl.debug; D.place([3, 0, 42], 0, 0); D.freeze = true; D.mode('shot'); });
  const spots = [['plaza_east', [10, 1.0, 26], [16, 0, 26]], ['plaza_north', [30, 1.0, 6], [30, 0, 12]], ['ledge_run', [28, 1.0, 21], [34, 0, 22.6]], ['terrace_pavers', [33, 1.8, 39], [39, 0.8, 39]], ['west_deck', [20.4, 3.63, 38], [22.8, 2.63, 41]],
    /* eleven more, spread over the plaza, the terrace and the decks: where the marks fall is chance, and five patches of 16 m2 were too few
       to judge them by */
    ['plaza_sw', [14, 1.0, 6], [20, 0, 6]], ['plaza_se', [40, 1.0, 6], [46, 0, 6]], ['plaza_e', [52, 1.0, 14], [52, 0, 20]], ['plaza_mid', [20, 1.0, 14], [26, 0, 14]],
    ['plaza_south', [36, 1.0, 10], [36, 0, 4]], ['plaza_nw', [24, 1.0, 28], [30, 0, 28]], ['plaza_ne', [47, 1.0, 29], [41, 0, 29]], ['terrace_e', [46, 1.8, 41], [52, 0.8, 41]],
    ['terrace_w', [27, 1.8, 36.5], [27, 0.8, 42.5]], ['east_deck', [60.5, 2.83, 8], [60.5, 1.83, 14]], ['plaza_curb', [30, 1.0, 9], [24, 0, 4]]];
  /* W2's views: concrete the low sun strikes square, the East Wall's transition and the terrace's riser, at a skater's distance (their hue
     beside the floor's: one grey, or two) */
  const tints = [['east_wall_sunlit', [51.5, 1.2, 15], [59, 1.0, 15.6]], ['riser_sunlit', [35, 1.2, 26.5], [36, 0.5, 32]]];
  const rows = [], tintRows = [];
  for (const look of ['Real', 'Painted']) {
    await t.eval((l) => window.__wl.debug.look(l.toLowerCase()), look); await t.sleep(300);
    for (const [name, pos, at] of spots) {
      await t.eval(([pos, at]) => { window.__wl.debug.shot = { pos, look: at, fov: 70 }; }, [pos, at]); await t.sleep(450);
      /* the same view drawn with the park's marks off: the floor samples they change by 4 % or more are the marks that show */
      const readLum = () => t.eval(() => new Promise((res) => requestAnimationFrame(() => { const D = window.__wl.debug, gl = D.stage.renderer.domElement, W = gl.width, H = gl.height, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(gl, 0, 0); const px = x.getImageData(0, 0, W, H).data, L = new Array(W * H); for (let k = 0; k < W * H; k++) L[k] = 0.2126 * px[k * 4] + 0.7152 * px[k * 4 + 1] + 0.0722 * px[k * 4 + 2]; window.__wlFloorRef = { W, H, L }; res(true); })));
      await t.eval(() => window.__wl.debug.marks(0)); await t.sleep(250); await readLum(); await t.eval(() => window.__wl.debug.marks(1)); await t.sleep(250);
      const m = await t.eval(() => new Promise((res) => requestAnimationFrame(() => {
        const D = window.__wl.debug, T = D.THREE, cam = D.stage.camera, gl = D.stage.renderer.domElement, W = gl.width, H = gl.height;
        const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(gl, 0, 0); const px = x.getImageData(0, 0, W, H).data;
        const lum = (i, j) => { const k = (j * W + i) * 4; return 0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]; };
        /* the picture's brightness, summed (an integral image): the mean of any window in four reads — the neighbourhood a mark stands out from */
        const II = new Float64Array((W + 1) * (H + 1));
        for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += lum(x, y); II[(y + 1) * (W + 1) + x + 1] = II[y * (W + 1) + x + 1] + row; } }
        const box = (i, j, r) => { const x0 = Math.max(0, i - r), x1 = Math.min(W, i + r + 1), y0 = Math.max(0, j - r), y1 = Math.min(H, j + r + 1); return (II[y1 * (W + 1) + x1] - II[y0 * (W + 1) + x1] - II[y1 * (W + 1) + x0] + II[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0)); };
        const floors = new Set(['slab', 'pavers', 'deck', 'curb', 'granite', 'ramp']), samples = [], tint = {};
        const v = new T.Vector3(), o = cam.position.toArray(), step = Math.max(6, Math.round(H / 120));
        for (let j = 6; j < H - 6; j += step) for (let i = 6; i < W - 6; i += step) {
          v.set((i + 0.5) / W * 2 - 1, 1 - (j + 0.5) / H * 2, 0.5).unproject(cam).sub(cam.position).normalize();
          const hit = D.world.bvh.raycast(o, [v.x, v.y, v.z], 16); if (!hit) continue;
          if (hit.t < 15 && ['slab', 'deck', 'ramp', 'wall'].includes(hit.surf)) { const k = (j * W + i) * 4, T = tint[hit.surf] || (tint[hit.surf] = { r: 0, g: 0, b: 0, n: 0 }); T.r += px[k]; T.g += px[k + 1]; T.b += px[k + 2]; T.n++; }
          if (hit.t < 2 || hit.t > 6 || !floors.has(hit.surf) || hit.normal[1] < 0.9) continue;
          let s = 0, s2 = 0, n = 0; for (let b = -4; b <= 4; b++) for (let a = -4; a <= 4; a++) { const l = lum(i + a, j + b); s += l; s2 += l * l; n++; }
          const mean = s / n, sd = Math.sqrt(Math.max(0, s2 / n - mean * mean)), k = (j * W + i) * 4, near = box(i, j, 1), wide = box(i, j, 15), ref = window.__wlFloorRef && window.__wlFloorRef.W === W ? window.__wlFloorRef.L[j * W + i] : null;
          samples.push({ l: lum(i, j), c: mean > 1 ? sd / mean : 0, r: px[k], g: px[k + 1], b: px[k + 2], hf: wide > 1 ? Math.abs(near - wide) / wide : 0, lf: wide, shown: ref != null && ref > 1 ? Math.abs(lum(i, j) - ref) / ref : null });
        }
        if (!samples.length) return res({ n: 0 });
        const ls = samples.map((q) => q.l).sort((a, b) => a - b), med = ls[ls.length >> 1];
        const avg = (f) => samples.reduce((a, q) => a + q[f], 0) / samples.length, R = avg('r'), G = avg('g'), B = avg('b');
        const hue = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 1e-6) return [0, 0]; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return [Math.round(h), +(d / mx).toFixed(3)]; };
        const tints = Object.fromEntries(Object.entries(tint).filter(([, T]) => T.n >= 30).map(([s, T]) => { const r = T.r / T.n, g = T.g / T.n, b = T.b / T.n; return [s, { rgb: [r, g, b].map(Math.round), hue: hue(r, g, b) }]; }));
        const lfs = samples.map((q) => q.lf).sort((a, b) => a - b), lmed = lfs[lfs.length >> 1] || 1;
        res({ n: samples.length, detail: samples.reduce((a, q) => a + q.c, 0) / samples.length, marks: samples.filter((q) => q.l < med * 0.9).length / samples.length, median: med, rgb: [R, G, B].map(Math.round), hs: hue(R, G, B), tints,
          hf: samples.filter((q) => q.hf > 0.06).length / samples.length, stains: (lfs[Math.floor(lfs.length * 0.9)] - lfs[Math.floor(lfs.length * 0.1)]) / lmed,
          shown: samples.filter((q) => q.shown != null && q.shown >= 0.04).length / samples.length });
      })));
      await t.shot('floor_' + look.toLowerCase() + '_' + name + '_' + tag);
      rows.push({ look, name, ...m });
      t.log('floor ' + look + ' ' + name + ': ' + (m.n ? m.n + ' floor samples 2–6 m · MARKS SHOWN ' + (100 * m.shown).toFixed(1) + '% · STANDING OUT ' + (100 * m.hf).toFixed(1) + '% · STAINS ' + (100 * m.stains).toFixed(1) + '% · DETAIL ' + (100 * m.detail).toFixed(1) + '% · MARKS ' + (100 * m.marks).toFixed(1) + '% · median ' + m.median.toFixed(0) + ' · rgb ' + m.rgb.join(',') + ' hue ' + m.hs[0] + '° sat ' + m.hs[1] : 'no floor in the frame')
        + (m.tints ? ' · concretes in view: ' + Object.entries(m.tints).map(([s, T]) => s + ' ' + T.rgb.join(',') + ' (' + T.hue[0] + '°, sat ' + T.hue[1] + ')').join('; ') : ''));
    }
  }
  /* the sunlit concretes' hues (Real), beside the floor's */
  await t.eval(() => window.__wl.debug.look('real')); await t.sleep(300);
  for (const [name, pos, at] of tints) {
    await t.eval(([pos, at]) => { window.__wl.debug.shot = { pos, look: at, fov: 70 }; }, [pos, at]); await t.sleep(450);
    const tt = await t.eval(() => new Promise((res) => requestAnimationFrame(() => {
      const D = window.__wl.debug, T = D.THREE, cam = D.stage.camera, gl = D.stage.renderer.domElement, W = gl.width, H = gl.height, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(gl, 0, 0); const px = x.getImageData(0, 0, W, H).data;
      const acc = {}, v = new T.Vector3(), o = cam.position.toArray();
      for (let j = 4; j < H; j += 8) for (let i = 4; i < W; i += 8) {
        v.set((i + 0.5) / W * 2 - 1, 1 - (j + 0.5) / H * 2, 0.5).unproject(cam).sub(cam.position).normalize();
        const h = D.world.bvh.raycast(o, [v.x, v.y, v.z], 12); if (!h || !['slab', 'deck', 'ramp', 'wall'].includes(h.surf)) continue;
        const k = (j * W + i) * 4, A = acc[h.surf] || (acc[h.surf] = [0, 0, 0, 0]); A[0] += px[k]; A[1] += px[k + 1]; A[2] += px[k + 2]; A[3]++;
      }
      const hue = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 1e-6) return [0, 0]; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return [Math.round(h), +(d / mx).toFixed(3)]; };
      res(Object.fromEntries(Object.entries(acc).filter(([, A]) => A[3] >= 40).map(([s2, A]) => [s2, { rgb: [A[0] / A[3], A[1] / A[3], A[2] / A[3]].map(Math.round), hs: hue(A[0] / A[3], A[1] / A[3], A[2] / A[3]), n: A[3] }])));
    })));
    await t.shot('tint_' + name + '_' + tag); tintRows.push([name, tt]);
    t.log('tint ' + name + ': ' + Object.entries(tt).map(([s2, T2]) => s2 + ' ' + T2.rgb.join(',') + ' (' + T2.hs[0] + ' deg, sat ' + T2.hs[1] + ', ' + T2.n + ' samples)').join('; '));
  }
  const real = rows.filter((r) => r.look === 'Real' && r.n);
  const avg = (f) => real.reduce((a, r) => a + r[f], 0) / Math.max(1, real.length);
  t.log('FLOOR Real: MARKS SHOWN ' + (100 * avg('shown')).toFixed(1) + '% (least ' + (100 * Math.min(...real.map((r) => r.shown))).toFixed(1) + '%) · STANDING OUT ' + (100 * avg('hf')).toFixed(1) + '% · STAINS ' + (100 * avg('stains')).toFixed(1) + '% · DETAIL ' + (100 * avg('detail')).toFixed(1) + '% · MARKS ' + (100 * avg('marks')).toFixed(1) + '% (mean of ' + real.length + ' places)');
  /* W1's gate: the park's marks show on the floor 2–6 m from the lens — 8 % of it on the mean of the sixteen views, and no more than a quarter
     of the views under 1.5 % (where the marks fall is chance: one bare patch is luck, a quarter bare is a floor without marks) */
  const shown = real.map((r) => r.shown), meanShown = shown.reduce((a, v) => a + v, 0) / Math.max(1, shown.length), bare = shown.filter((v) => v < 0.015).length;
  const w1 = shown.length === spots.length && bare <= Math.floor(spots.length / 4) && meanShown >= 0.08;
  t.log((w1 ? '✔' : '✖') + ' W1: the marks show at 2–6 m — mean ' + (100 * meanShown).toFixed(1) + '% of ' + shown.length + ' views (≥ 8), ' + bare + ' views under 1.5 % (≤ ' + Math.floor(spots.length / 4) + ')');
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return t.errors.length === 0 && real.length === spots.length && w1;
}
