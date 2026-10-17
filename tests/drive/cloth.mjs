import fs from 'node:fs'; import path from 'node:path';
/* THE CLOTH, MEASURED (the supervisor's ask: real skate shoes, fabric with seams, folds and a weave in the normal map — and a shader that
 * never shimmers). Two halves, each the same frame drawn with the cloth on and off (debug.cloth):
 *   CLOSE, IT SHOWS: five zoomed views framed on what they are of — the knee, behind the knee, the elbow, the jacket's back, the shoe — each
 *     near enough that a pixel is 0.3 mm on it (the weave's pitch is about a millimetre: a picture whose pixel is coarser cannot hold it; the
 *     page draws at its own pixel ratio, so the distance is found from the canvas), and in the middle of each the share of pixels the cloth
 *     changes and the fine detail it adds (each pixel's distance from its 5×5 neighbourhood, on against off).
 *   FAR, IT HOLDS STILL: the game's own distance (the lens 3.4 m behind her and 1.5 m up), moved a quarter of a pixel a frame over nine frames:
 *     how much HER pixels change frame to frame with the cloth on, against off — her pixels found by drawing the frame without her, inside the
 *     box her bones project to, three pixels in from her outline (her edge moves with the lens either way; the ground behind is not hers). The
 *     change is read on each frame's FINE part (a pixel less the mean of its 3×3): smooth shading sliding under the lens changes it little, a
 *     pattern crawling in its pixels a great deal (read whole, the no-fade plant rose only 1.29× over a bar of 1.25: a coin's margin). A pattern finer than its pixels crawls as the lens moves; the
 *     cloth fades what a pixel cannot hold, so it may add next to nothing to that.
 * Upright and turned are the viewport's. */
const FLAT = [30, 0, 14];
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  await t.eval(() => { window.__wl.debug.mode('shot'); });
  await t.eval((at) => { window.__wl.debug.place(at, 0, 0); }, FLAT); await t.sleep(700);
  /* a frame's brightness inside a box (fractions of the frame), read right after the game draws it */
  const read = (box) => t.eval((box) => new Promise((res) => requestAnimationFrame(() => {
    const gl = window.__wl.debug.stage.renderer.domElement, W = gl.width, H = gl.height, x0 = Math.floor(box[0] * W), y0 = Math.floor(box[1] * H), w = Math.floor((box[2] - box[0]) * W), h = Math.floor((box[3] - box[1]) * H);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(gl, 0, 0); const px = x.getImageData(x0, y0, w, h).data, L = new Array(w * h);
    for (let k = 0; k < w * h; k++) L[k] = 0.2126 * px[k * 4] + 0.7152 * px[k * 4 + 1] + 0.0722 * px[k * 4 + 2];
    res({ w, h, L });
  })), box);
  const cloth = async (k) => { await t.eval((k) => window.__wl.debug.cloth(k), k); await t.sleep(160); };
  /* the fine detail of a picture: each pixel's distance from the mean of its 5×5 neighbourhood, averaged */
  const fine = ({ w, h, L }) => { let s = 0, n = 0; for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) { let m = 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) m += L[(y + j) * w + x + i]; s += Math.abs(L[y * w + x] - m / 25); n++; } return s / Math.max(1, n); };
  /* CLOSE */
  const views = [['knee', { aim: 'shinL', az: 80, h: 0.06, at: 0.0, fov: 30 }], ['behind_the_knee', { aim: 'shinR', az: -95, h: 0.06, at: 0.0, fov: 30 }],
    ['elbow', { aim: 'foreL', az: 60, h: 0.04, at: 0.0, fov: 30 }], ['jacket_back', { aim: 'chest', az: -90, h: 0.0, at: -0.06, fov: 30 }],
    ['shoe', { aim: 'footL', az: 0, h: 0.05, at: -0.03, fov: 30 }]];
  /* CLOTH_ONLY=<view,view>: those views alone, to find which detail a reading answers to (never a verdict: the drive reads RED) */
  const ONLY = (process.env.CLOTH_ONLY || '').split(',').filter(Boolean), wants = (n) => !ONLY.length || ONLY.includes(n);
  const box = [0.35, 0.35, 0.65, 0.65], close = [], H = await t.eval(() => window.__wl.debug.stage.renderer.domElement.height);
  for (const [name, v0] of views) {
    if (!wants(name)) continue;
    const v = Object.assign({}, v0, { dist: 0.0003 * H / (2 * Math.tan(v0.fov * Math.PI / 360)), freeze: true });   /* held still: on and off differ by the cloth alone */
    await t.eval((v) => { window.__wl.debug.shot = v; }, v); await t.sleep(450);
    await cloth(1); const on = await read(box); await t.shot('cloth_' + name + '_on_' + tag);
    await cloth(0); const off = await read(box); await t.shot('cloth_' + name + '_off_' + tag); await cloth(1);
    let changed = 0; for (let k = 0; k < on.L.length; k++) if (Math.abs(on.L[k] - off.L[k]) >= 3) changed++;
    const r = { name, changed: changed / on.L.length, fineOn: fine(on), fineOff: fine(off) }; r.gain = r.fineOn / Math.max(0.05, r.fineOff); close.push(r);
    const ok = r.changed >= 0.15 && r.gain >= 1.3;
    t.log((ok ? '✔' : '✖') + ' close, ' + name + ' (' + v.dist.toFixed(2) + ' m away, a pixel 0.3 mm): the cloth changes ' + (100 * r.changed).toFixed(1) + '% of the middle (≥ 15) and its fine detail ' + r.fineOff.toFixed(2) + ' → ' + r.fineOn.toFixed(2) + ' (×' + r.gain.toFixed(2) + ', ≥ 1.3)');
  }
  /* FAR: the lens behind her at the game's distance, stepped sideways a quarter of a pixel a frame. Read per pixel (each frame's fine part,
     its change frame to frame, averaged), then gated BY TILE: 12×12 of her inner pixels (a tile needs 60), cloth on against off in the same
     tile (the off reading floored at 0.15). A crawl that is local (a seam's dashes, a band of a fold, a shoe's eyelets) is under 1% of her
     pixels and moves no whole mean (the supervisor, round 11: ×1.17 whole over 33 tiles past ×2 and one at ×19.8). The instrument proves
     itself on a null — off against off — whose worst tile must stay under ×2 too. */
  /* ONE READING, ANY VIEW — ALIASING AGAINST THE FRAME'S OWN SUPERSAMPLE. A detail the pixel cannot hold crawls; a soft edge the cloth draws on
     purpose (a suede panel against canvas) only moves. To tell them apart each frame is drawn twice in one task: at the page's own pixel, and
     at exactly twice it (2×2 samples a pixel) with the cloth's fade pinned to the page's pixel, then averaged back down — what the page's
     frame would be if its pixels held no alias. Their difference E, per pixel, is the aliasing (a soft edge matches its own supersample; a
     hard edge or a pattern finer than its pixels does not). Read over her inner pixels at three lens positions a third of a pixel apart, with
     the cloth on and off, by 12×12 tile (a tile needs 60 of her pixels): a tile fails when the cloth at least doubles its aliasing AND adds 1.5
     levels to it. The null — the cloth off at one lens position against another — must hold under ×2 by the same rule. (Round 11 read the
     frames' change with the cloth on against off: every suede panel's edge failed it, a designed edge that only moved; measured on the
     heel counter's tile, 0.13→2.88 through every fade.) */
  const crawl = async (name, viewFn, crop, reported = false) => {
    if (!wants(name)) return { ok: true, worst: 0, bad: 0 };
    const base = await t.eval(viewFn);
    await t.eval(([pos, look, fov]) => { window.__wl.debug.shot = { pos, look, fov, freeze: true }; }, [base.pos, base.look, base.fov]); await t.sleep(220);
    await t.eval((crop) => new Promise((res) => requestAnimationFrame(() => {   /* her inner pixels at the page's pixel: with her against without her, three in */
      const D = window.__wl.debug, gl = D.stage.renderer.domElement, W = gl.width, H = gl.height, x0 = Math.floor(crop[0] * W), y0 = Math.floor(crop[1] * H), w = Math.floor((crop[2] - crop[0]) * W), h = Math.floor((crop[3] - crop[1]) * H);
      const lum = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.drawImage(gl, x0, y0, w, h, 0, 0, w, h); const d = x.getImageData(0, 0, w, h).data, L = new Float32Array(w * h); for (let k = 0; k < w * h; k++) L[k] = 0.2126 * d[k * 4] + 0.7152 * d[k * 4 + 1] + 0.0722 * d[k * 4 + 2]; return L; };
      /* her pixels with the sun out, so her shadow (on the grip, on the ground) is not taken for her */
      const sunOn = D.stage.sun.visible; D.stage.sun.visible = false;
      D.stage.render(); const a = lum(); D.juno.rig.visible = false; D.stage.render(); const b = lum(); D.juno.rig.visible = true; D.stage.sun.visible = sunOn;
      const her = new Uint8Array(w * h); for (let k = 0; k < w * h; k++) her[k] = Math.abs(a[k] - b[k]) > 2 ? 1 : 0;
      /* the geometry's own edges inside her — where one surface meets or hides another (the sock out of the collar, a hem over a shoe): its
         normals drawn plain, and a pixel next to a jump in them is the rasteriser's edge, which the cloth only colours. Left to it: the
         cloth is judged on her surfaces (round 11's last tiles were such edges, given contrast by the designed colours) */
      const NM = new D.THREE.MeshNormalMaterial(); D.stage.scene.overrideMaterial = NM; D.stage.render(); D.stage.scene.overrideMaterial = null; NM.dispose();
      const c2 = document.createElement('canvas'); c2.width = w; c2.height = h; const x2 = c2.getContext('2d'); x2.drawImage(gl, x0, y0, w, h, 0, 0, w, h); const nd = x2.getImageData(0, 0, w, h).data;
      const geo = new Uint8Array(w * h);
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const k = y * w + x; let m = 0; for (const j of [k - 1, k + 1, k - w, k + w]) m = Math.max(m, Math.abs(nd[k * 4] - nd[j * 4]) + Math.abs(nd[k * 4 + 1] - nd[j * 4 + 1]) + Math.abs(nd[k * 4 + 2] - nd[j * 4 + 2])); if (m > 60) geo[k] = 1; }
      const inner = new Uint8Array(w * h); let edgeOut = 0;
      for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) { let all = 1; for (let j = -3; j <= 3 && all; j++) for (let i = -3; i <= 3; i++) if (!her[(y + j) * w + x + i]) { all = 0; break; }
        if (all) for (let j = -2; j <= 2 && all; j++) for (let i = -2; i <= 2; i++) if (geo[(y + j) * w + x + i]) { all = 0; edgeOut++; break; }
        inner[y * w + x] = all; }
      window.__wlEdgeOut = edgeOut;
      window.__wlProbe = { inner, w, h, x0, y0, E: {} }; res(true); })), crop);
    const one = async (k, sh, keyAs) => {
      await t.eval((k) => window.__wl.debug.cloth(k), k);
      const o = base.px * sh, pos = base.pos.map((v, j) => v + base.side[j] * o), look = base.look.map((v, j) => v + base.side[j] * o);
      await t.eval(([pos, look, fov]) => { window.__wl.debug.shot = { pos, look, fov, freeze: true }; }, [pos, look, base.fov]); await t.sleep(160);
      return t.eval((key) => new Promise((res) => requestAnimationFrame(() => {
        const D = window.__wl.debug, R = D.stage.renderer, gl = R.domElement, T = D.THREE, P = window.__wlProbe, pr = R.getPixelRatio(), css = R.getSize(new T.Vector2()), W = gl.width, H = gl.height;
        const grab = (sx, sy, sw, sh2) => { const c = document.createElement('canvas'); c.width = sw; c.height = sh2; const x = c.getContext('2d'); x.drawImage(gl, sx, sy, sw, sh2, 0, 0, sw, sh2); const d = x.getImageData(0, 0, sw, sh2).data, L = new Float32Array(sw * sh2); for (let q = 0; q < sw * sh2; q++) L[q] = 0.2126 * d[q * 4] + 0.7152 * d[q * 4 + 1] + 0.0722 * d[q * 4 + 2]; return L; };
        D.juno.px.pin = 2 * Math.tan(D.stage.camera.fov * Math.PI / 360) / H;
        D.stage.render(); const nat = grab(P.x0, P.y0, P.w, P.h);
        R.setDrawingBufferSize(W, H, 2); D.stage.render(); const big = grab(P.x0 * 2, P.y0 * 2, P.w * 2, P.h * 2);
        R.setPixelRatio(pr); R.setSize(css.x, css.y, false); D.juno.px.pin = 0; D.stage.render();
        if (key === '0:0') P.offL = nat;
        const E = new Float32Array(P.w * P.h), w2 = P.w * 2;
        for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) { const k = y * P.w + x; if (!P.inner[k]) continue; const b = 2 * y * w2 + 2 * x, ref = (big[b] + big[b + 1] + big[b + w2] + big[b + w2 + 1]) / 4; E[k] = Math.abs(nat[k] - ref); }
        P.E[key] = E; res(true); })), keyAs || (k + ':' + sh));
    };
    for (const k of [0, 1]) for (const sh of [0, 0.33, 0.67]) await one(k, sh);
    for (const sh of [0.17, 0.5, 0.83]) await one(0, sh);   /* the null's own three lens positions, between the others */
    await t.eval((k) => window.__wl.debug.cloth(k), 1);
    await t.eval(([pos, look, fov]) => { window.__wl.debug.shot = { pos, look, fov, freeze: true }; }, [base.pos, base.look, base.fov]); await t.sleep(200); await t.shot('cloth_' + name + '_' + tag);
    const r = await t.eval(() => {
      const P = window.__wlProbe, n = P.w * P.h, mean3 = (k, shs = ['0', '0.33', '0.67']) => { const o = new Float32Array(n); for (const sh of shs) { const E = P.E[k + ':' + sh]; for (let q = 0; q < n; q++) o[q] += E[q] / 3; } return o; };
      const on = mean3(1), off = mean3(0), offB = mean3(0, ['0.17', '0.5', '0.83']);   /* the null: the cloth off at three lens positions against three others */
      const tiles = (A, B) => { const out = []; for (let ty = 0; ty + 12 <= P.h; ty += 12) for (let tx = 0; tx + 12 <= P.w; tx += 12) { let a = 0, b = 0, c = 0; for (let y = ty; y < ty + 12; y++) for (let x = tx; x < tx + 12; x++) { const q = y * P.w + x; if (P.inner[q]) { a += A[q]; b += B[q]; c++; } } if (c >= 60) { a /= c; b /= c; out.push({ x: tx, y: ty, on: a, off: b, r: a / Math.max(0.75, b), bad: a > 2 * Math.max(0.75, b) && a - b > 1.5 }); } } return out.sort((u, v) => v.r - u.r); };
      let sOn = 0, sOff = 0, m = 0; for (let q = 0; q < n; q++) if (P.inner[q]) { sOn += on[q]; sOff += off[q]; m++; }
      /* the null leaves out what the frame without the cloth already shows as an edge (a piece's colour against the next, a crease the normals
         missed): there the scene's own aliasing moves with the lens, and it is not the cloth's */
      const offL = P.offL, strong = new Uint8Array(n); for (let y = 1; y < P.h - 1; y++) for (let x = 1; x < P.w - 1; x++) { const q = y * P.w + x; if (Math.abs(offL[q + 1] - offL[q - 1]) + Math.abs(offL[q + P.w] - offL[q - P.w]) > 24) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) strong[q + j * P.w + i] = 1; }
      const keep = P.inner; P.inner = keep.map((v, q) => (v && !strong[q] ? 1 : 0)); const T0 = tiles(offB, off); P.inner = keep;
      const T1 = tiles(on, off);
      /* the picture of it: the page's frame in the crop, every failing tile outlined (magenta) — the evidence and the place to look */
      const D = window.__wl.debug, gl = D.stage.renderer.domElement; D.stage.render();
      const c = document.createElement('canvas'); c.width = P.w; c.height = P.h; const x = c.getContext('2d'); x.drawImage(gl, P.x0, P.y0, P.w, P.h, 0, 0, P.w, P.h);
      x.strokeStyle = 'rgba(255,0,255,0.95)'; x.lineWidth = 1; for (const u of T1.filter((v) => v.bad)) x.strokeRect(u.x + 0.5, u.y + 0.5, 11, 11);
      window.__wlProbe.bad = T1.filter((u) => u.bad).slice(0, 4);
      return { n: m, tiles: T1.length, bad: T1.filter((u) => u.bad).length, worst: T1.slice(0, 3), nullBad: T0.filter((u) => u.bad).length, nullWorst: T0[0] ? T0[0].r : 0, eOn: sOn / Math.max(1, m), eOff: sOff / Math.max(1, m), png: c.toDataURL('image/png') };
    });
    /* where a tile fails, which part of the cloth carries it: the same frame with the relief alone, then the colours alone */
    if (r.bad) {
      for (const [key, parts] of [['relief', [1, 0]], ['colours', [0, 1]]]) { await t.eval((pp) => window.__wl.debug.clothParts(pp[0], pp[1]), parts); await one(1, 0, key); }
      await t.eval(() => window.__wl.debug.clothParts(1, 1));
      const parts = await t.eval(() => { const P = window.__wlProbe, mean = (E, u) => { let a = 0, c = 0; for (let y = u.y; y < u.y + 12; y++) for (let x = u.x; x < u.x + 12; x++) { const q = y * P.w + x; if (P.inner[q]) { a += E[q]; c++; } } return a / Math.max(1, c); };
        return P.bad.map((u) => '(' + u.x + ',' + u.y + ') off ' + u.off.toFixed(2) + ', relief alone ' + mean(P.E.relief, u).toFixed(2) + ', colours alone ' + mean(P.E.colours, u).toFixed(2) + ', both ' + u.on.toFixed(2)); });
      t.log('  ' + name + ', its failing tiles by part: ' + parts.join(' · '));
    }
    fs.writeFileSync(path.join(t.outDir, 'cloth_' + name + '_tiles_' + tag + '.png'), Buffer.from(r.png.split(',')[1], 'base64'));
    const ok = r.n >= 1500 && r.tiles >= 20 && r.bad === 0 && r.nullBad === 0, edgeOut = await t.eval(() => window.__wlEdgeOut);
    t.log((r.nullBad === 0 ? '✔' : '✖') + ' ' + name + ', the null (the cloth off, three lens positions against three others): ' + r.nullBad + ' tiles fail, the worst ×' + r.nullWorst.toFixed(2));
    t.log((reported ? 'ℹ' : ok ? '✔' : '✖') + ' ' + name + (reported ? ' — reported, not a gate until it is green' : '') + ' (a pixel ' + (1000 * base.px).toFixed(2) + ' mm, ' + r.n + ' of her pixels away from the geometry\'s own edges (' + edgeOut + ' next to them left out), ' + r.tiles + ' tiles): aliasing against her own 2×2 supersample ' + r.eOff.toFixed(2) + ' → ' + r.eOn.toFixed(2) + ' levels with the cloth; ' + r.bad + ' tiles where the cloth at least doubles it and adds 1.5 · worst: ' + r.worst.map((u) => '(' + u.x + ',' + u.y + ') ' + u.off.toFixed(2) + '→' + u.on.toFixed(2)).join(' '));
    return { ok, worst: r.worst[0] ? r.worst[0].r : 0, bad: r.bad, reported };
  };
  /* FAR: the lens behind her at the game's distance */
  const farR = await crawl('far', () => { const D = window.__wl.debug, b = D.board.position, f = D.sim.fwd, fov = 55, H = D.stage.renderer.domElement.height;
    const pos = [b.x - f[0] * 3.4, b.y + 1.5, b.z - f[2] * 3.4], look = [b.x, b.y + 0.9, b.z], d = Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]);
    return { pos, look, fov, side: [f[2], 0, -f[0]], px: 2 * d * Math.tan(fov * Math.PI / 360) / H }; }, [0.3, 0.1, 0.7, 0.9]);
  /* THE POLES, where a pattern laid round an axis meets it: the beanie's crown from above a metre off (the pull-in brings the lens that near),
     and the shoe-top view where the sock's cap showed a star of moiré (the supervisor, round 11) */
  const crownR = await crawl('crown', () => { const D = window.__wl.debug, T = D.THREE, h = D.juno.bones.head.getWorldPosition(new T.Vector3()), f = D.sim.fwd, fov = 30, H = D.stage.renderer.domElement.height;
    const look = [h.x, h.y + 0.12, h.z], pos = [h.x - f[0] * 0.25, h.y + 1.05, h.z - f[2] * 0.25], d = Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]);
    return { pos, look, fov, side: [f[2], 0, -f[0]], px: 2 * d * Math.tan(fov * Math.PI / 360) / H }; }, [0.25, 0.25, 0.75, 0.75]);
  /* THE MIDDLE DISTANCE (the supervisor, 10-16: the title's and the pull-in's 1–1.5 m, where a hard gate's line shows): her front three-quarters
     at 1.3 m, the lens at her chest. REPORTED, NOT A GATE, until it reads green (the supervisor, 10-16: its first 108 tiles are V9's too — a new
     instrument, not a regression); its plants (stitch_dashes_to_four_px, rise_one_pixel) are caught only once it is a gate again */
  const midR = await crawl('mid', () => { const D = window.__wl.debug, T = D.THREE, c = D.juno.bones.chest.getWorldPosition(new T.Vector3()), f = D.sim.fwd, fov = 40, H = D.stage.renderer.domElement.height;
    const a = 55 * Math.PI / 180, dx = f[0] * Math.cos(a) - f[2] * Math.sin(a), dz = f[0] * Math.sin(a) + f[2] * Math.cos(a);
    const look = [c.x, c.y - 0.15, c.z], pos = [c.x + dx * 1.3, c.y + 0.1, c.z + dz * 1.3], d = Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]);
    return { pos, look, fov, side: [dz, 0, -dx], px: 2 * d * Math.tan(fov * Math.PI / 360) / H }; }, [0.15, 0.1, 0.85, 0.9], true);
  const sockR = await crawl('shoe_top', () => { const D = window.__wl.debug, T = D.THREE, a = D.juno.bones.footL.getWorldPosition(new T.Vector3()), f = D.sim.fwd, fov = 32, H = D.stage.renderer.domElement.height;
    const dx = f[0] * Math.cos(Math.PI / 2) - f[2] * Math.sin(Math.PI / 2), dz = f[0] * Math.sin(Math.PI / 2) + f[2] * Math.cos(Math.PI / 2);
    const pos = [a.x + dx * 0.25, a.y + 0.55, a.z + dz * 0.25], look = [a.x, a.y - 0.05, a.z], d = Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]);
    return { pos, look, fov, side: [f[0], 0, f[2]], px: 2 * d * Math.tan(fov * Math.PI / 360) / H }; }, [0.2, 0.2, 0.8, 0.8]);
  const farOk = farR.ok && crownR.ok && sockR.ok, ratio = Math.max(farR.worst, crownR.worst, sockR.worst), badTiles = farR.bad + crownR.bad + sockR.bad;
  /* THE PAINTED LOOK draws her through the same shader hook as a toon material: she must compile and draw there too (round 10: the cloth's
     roughness line broke the toon shader, and only the floor drive, which turns the look, saw it) */
  const errsBefore = t.errors.length;
  await t.eval(() => { window.__wl.debug.look('painted'); window.__wl.debug.shot = { aim: 'chest', az: 70, dist: 2.4, h: 0.0, at: -0.4, fov: 38 }; }); await t.sleep(700);
  await t.shot('cloth_painted_' + tag);
  await t.eval(() => { window.__wl.debug.look('real'); }); await t.sleep(300);
  const paintedOk = t.errors.length === errsBefore;
  t.log((paintedOk ? '✔' : '✖') + ' the painted look draws her' + (paintedOk ? ' (no shader error)' : ': ' + t.errors.slice(errsBefore, errsBefore + 1).join(' ').slice(0, 160)));
  await t.eval(() => { window.__wl.debug.shot = null; window.__wl.debug.cloth(1); window.__wl.debug.mode('play'); });
  const closeOk = close.every((r) => r.changed >= 0.15 && r.gain >= 1.3);
  t.log('CLOTH: ' + (closeOk && farOk && paintedOk ? 'GREEN' : 'RED') + ' · ' + close.filter((r) => r.changed >= 0.15 && r.gain >= 1.3).length + ' of ' + close.length + ' close views show it · far, crown and shoe top: ' + badTiles + ' tiles alias (worst ×' + ratio.toFixed(2) + ') · ℹ mid (1.3 m, reported): ' + midR.bad + ' tiles (worst ×' + midR.worst.toFixed(2) + ')');
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  if (ONLY.length) { t.log('CLOTH: SUBSET (' + ONLY.join(', ') + ') — a probe, never a verdict'); return false; }
  return t.errors.length === 0 && closeOk && farOk && paintedOk;
}
