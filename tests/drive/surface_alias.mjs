/* SURFACE ALIASING (orgo-u-53, 10-17: no gate read the park's own surfaces for aliasing — the cloth drive's measure, here for the ground).
 * A surface aliases where its detail is finer than a pixel holds: it crawls as the lens moves. Each view is drawn twice in one task, through
 * the game's own pipeline (stage.render(): the light, the fog, the ink pass): at the page's own pixel, and at exactly three times it (3×3
 * samples a pixel) averaged back down — what the frame would be if its pixels held no alias. Their difference E, per pixel, in luminance
 * levels (0–255), is the aliasing; read on the surface's own pixels (a mask render, eroded 3 px from its border and kept off the geometry's
 * own edges) at three lens positions a third of a pixel apart, by 12×12 tile (a tile needs 60 of its pixels). (cloth.mjs, 2× there.)
 *   · REPORTED: every surface of park 1 — the slab, the terrace's pavers, a ramp, the granite, the steel, the curb's paint — and Kiln Yard's
 *     slab: the mean E and the worst tiles, the worst cropped beside the log (the reference is read by eye before it becomes a bound).
 *   · GATED, the new surfaces: Kiln Yard's ASPHALT against the slab ON THE SAME PIXELS (the asphalt drawn with the slab's own material), and
 *     its PAINT against the ground without it: a tile fails when the new at least doubles the reference's aliasing AND adds 1.5 levels to it.
 *   · THE NULL: the reference against itself, at three other lens positions, must hold under the same rule (else the instrument is noise).
 *   · PAINT, FRAME BY FRAME: a still lens at grazing distances, moved a third of a pixel — z-fighting flips the paint's own pixels to the
 *     ground and back (a pixel changing 60 levels or more); the paint's interior may flip no more than the same pixels without it, +0.5 %.
 * Every view twice: the game's sun (13°) and a high one (55°). Run at the phone tier (the kit's touch page: no MSAA, its pixel ratio),
 * upright and turned; the plants (tests/drive/surface_alias_plants.sh) must turn their gates RED. */
import fs from 'node:fs';
import path from 'node:path';

const PLANT = process.env.WL_PLANT || '', BOUND = 8;   // levels a tile (orgo-u-53, 10-17)
/* [park, surface: the mesh names whose pixels are read, view name, camera, target, fov, reference: 'slab' (the asphalt drawn as the slab) |
   'bare' (the paint hidden) | null (reported, absolute), frame pairs?] */
const CASES = [
  ['waxline', 'slab', ['park:slab'], 'plaza_east', [10, 1.0, 26], [16, 0, 26], 62, null],
  ['waxline', 'slab', ['park:slab'], 'plaza_mid', [20, 1.0, 14], [26, 0, 14], 62, null],
  ['waxline', 'slab', ['park:slab'], 'plaza_far', [14, 1.2, 6], [25, 0, 6], 62, null],
  ['waxline', 'pavers', ['park:pavers'], 'terrace', [33, 1.8, 39], [39, 0.8, 39], 62, null],
  ['waxline', 'pavers', ['park:pavers'], 'terrace_far', [46, 1.8, 41], [57, 0.8, 41], 62, null],
  ['waxline', 'ramp', ['park:ramp'], 'east_wall', [51.5, 1.2, 15], [59, 1.0, 15.6], 62, null],
  ['waxline', 'granite', ['park:granite'], 'ledge_run', [28, 1.0, 21], [34, 0.3, 22.6], 62, null],
  ['waxline', 'curb', ['park:curb'], 'curb', [30, 1.0, 9], [24, 0, 4], 62, null],
  ['waxline', 'steel', ['park:steel', 'rail', 'coping'], 'rails', [40, 1.1, 30], [44, 0.6, 33], 62, null],
  ['kilnyard', 'slab', ['park:slab'], 'yard', [30, 5.45, 44], [36, 4.15, 44], 62, null],
  ['kilnyard', 'asphalt', ['park:asphalt'], 'apron_close', [52, 5.45, 59.2], [54, 4.15, 61.5], 62, 'slab'],
  ['kilnyard', 'asphalt', ['park:asphalt'], 'apron_mid', [46, 5.45, 61.2], [53, 4.15, 61.5], 62, 'slab'],
  ['kilnyard', 'asphalt', ['park:asphalt'], 'apron_far', [42, 5.45, 61.2], [54, 4.15, 61.4], 62, 'slab'],
  ['kilnyard', 'paint', ['paint:white', 'paint:yellow'], 'bays_close', [52, 5.45, 59.2], [54, 4.15, 61.5], 62, 'bare', true],
  ['kilnyard', 'paint', ['paint:white', 'paint:yellow'], 'bays_mid', [46, 5.45, 61.2], [53, 4.15, 61.5], 62, 'bare', true],
  ['kilnyard', 'paint', ['paint:white', 'paint:yellow'], 'bays_far', [42, 5.45, 61.2], [54, 4.15, 61.4], 62, 'bare', true],
  ['kilnyard', 'paint', ['paint:white', 'paint:yellow'], 'dock_line', [70, 6.6, 68.5], [58, 5.35, 64.8], 62, 'bare', true],
  ['kilnyard', 'paint', ['paint:white', 'paint:yellow'], 'hatch', [83, 5.6, 55.5], [87, 4.15, 60.5], 62, 'bare', true],
  ['kilnyard', 'paint', ['paint:white', 'paint:yellow'], 'bays_distant', [42, 5.45, 61.2], [70, 4.15, 61.5], 62, 'bare', false],   // 12–28 m: the bays under a pixel wide
];

export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  if (PLANT) t.log('PLANT: ' + PLANT);
  /* the page's helpers, once: the frame's luminance, a surface's pixels, the geometry's own edges, E against the 3× supersample */
  await t.eval(() => {
    const D = window.__wl.debug, T = D.THREE, st = D.stage, R = st.renderer, gl = R.domElement;
    const lum = (x0, y0, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(gl, x0, y0, w, h, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data, L = new Float32Array(w * h); for (let k = 0; k < w * h; k++) L[k] = 0.2126 * d[k * 4] + 0.7152 * d[k * 4 + 1] + 0.0722 * d[k * 4 + 2]; return L; };
    const swapAll = (pick) => { const saved = []; st.scene.traverse((o) => { if (o.material && (o.isMesh || o.isInstancedMesh || o.isPoints || o.isLine)) { saved.push([o, o.material]); o.material = pick(o); } }); return () => saved.forEach(([o, m]) => { o.material = m; }); };
    window.__wlSA = {
      size: () => ({ W: gl.width, H: gl.height, pr: R.getPixelRatio() }),
      /* the named meshes' pixels: every mesh unlit, the named ones white and the rest black — each keeping ITS OWN polygon offset, so what
         wins a pixel here wins it when drawn (10-17: given the paint's offset, the asphalt took the bays' pixels and their edges read as its
         aliasing) — then eroded 3 px, and kept 2 px off the geometry's own edges (a jump in the drawn normals) */
      mask: (names, grow) => {
        const W = gl.width, H = gl.height, made = new Map(), unlit = (o, white) => { const src = Array.isArray(o.material) ? o.material[0] : o.material, k = (white ? 'w' : 'k') + (src.polygonOffset ? src.polygonOffsetFactor + ',' + src.polygonOffsetUnits : '');
          if (!made.has(k)) made.set(k, new T.MeshBasicMaterial({ color: white ? 0xffffff : 0x000000, side: T.DoubleSide, polygonOffset: !!src.polygonOffset, polygonOffsetFactor: src.polygonOffsetFactor || 0, polygonOffsetUnits: src.polygonOffsetUnits || 0 })); return made.get(k); };
        const fog = st.scene.fog, bg = st.scene.background; st.scene.fog = null; st.scene.background = new T.Color(0);
        let restore = swapAll((o) => unlit(o, names.some((n) => o.name === n || o.name.startsWith(n + ':')))); R.render(st.scene, st.camera); const m = lum(0, 0, W, H); restore();
        const nm = new T.MeshNormalMaterial(); restore = swapAll(() => nm); R.render(st.scene, st.camera); const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(gl, 0, 0); const nd = x.getImageData(0, 0, W, H).data; restore();
        st.scene.fog = fog; st.scene.background = bg; made.forEach((x) => x.dispose()); nm.dispose();
        const on = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) on[k] = m[k] > 127 ? 1 : 0;
        const edge = new Uint8Array(W * H); for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) { const k = y * W + xx; let mx = 0; for (const j of [k - 1, k + 1, k - W, k + W]) mx = Math.max(mx, Math.abs(nd[k * 4] - nd[j * 4]) + Math.abs(nd[k * 4 + 1] - nd[j * 4 + 1]) + Math.abs(nd[k * 4 + 2] - nd[j * 4 + 2])); if (mx > 60) edge[k] = 1; }
        /* a surface is eroded from its border with other things; PAINT is grown round its quads instead (it lies on the ground it is compared
           against, and a far line under a pixel wide covers no pixel's centre: eroded, it would leave nothing to read) */
        const keep = new Uint8Array(W * H);
        if (grow) { for (let y = 3; y < H - 3; y++) for (let xx = 3; xx < W - 3; xx++) { let any = 0; for (let j = -3; j <= 3 && !any; j++) for (let i = -3; i <= 3; i++) if (on[(y + j) * W + xx + i]) { any = 1; break; } keep[y * W + xx] = any; } }
        else for (let y = 3; y < H - 3; y++) for (let xx = 3; xx < W - 3; xx++) { let all = 1; for (let j = -3; j <= 3 && all; j++) for (let i = -3; i <= 3; i++) if (!on[(y + j) * W + xx + i]) { all = 0; break; }
          if (all) for (let j = -2; j <= 2 && all; j++) for (let i = -2; i <= 2; i++) if (edge[(y + j) * W + xx + i]) { all = 0; break; } keep[y * W + xx] = all; }
        window.__wlSA.M = keep; window.__wlSA.MQ = on; let n = 0; for (let k = 0; k < W * H; k++) n += keep[k]; return n;
      },
      /* the frame at the page's pixel and at 3×, read whole; E per pixel against the 3×3 mean (the page's own size put back after) */
      /* the frame at the page's pixel and at 3×; E per pixel = the page's pixel against the 3×3 mean of the 3× frame, AVERAGED WHERE THE PAGE
         COMPOSES its pixels (a supersample is the page's own ideal only if it is averaged as the page would blend):
           · the Real look (the default: the stage has no last pass): every material tone-maps and encodes its own fragment, and what is
             transparent blends on the encoded frame — so the canvas's display values are averaged;
           · the Painted look: the scene is drawn into the stage's linear target and tone-mapped by its last pass (the ink) — so that target is
             read and averaged in the scene's light, both then put through the page's ACES filmic and sRGB; the ink's outlines are not in it.
         (10-17: averaged in decoded linear light on the Real look, the paint read ×20 more failing tiles: there it blends on the encoded
         frame.) Read as luminance levels; the page's own size is put back after */
      E: () => {
        const W = gl.width, H = gl.height, pr = R.getPixelRatio(), css = R.getSize(new T.Vector2());
        if (!st.inkOn) {
          st.render(); const nat = lum(0, 0, W, H);
          R.setDrawingBufferSize(W, H, 3); st.render(); const big = lum(0, 0, W * 3, H * 3);
          R.setPixelRatio(pr); R.setSize(css.x, css.y, false); st.render();
          const E = new Float32Array(W * H), w3 = W * 3;
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; const b = 3 * y * w3 + 3 * x; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) s += big[b + j * w3 + i]; E[y * W + x] = Math.abs(nat[y * W + x] - s / 9); }
          return { E, nat };
        }
        const lin = () => { const rt = st.inkRT, w = rt.width, h = rt.height, buf = new Float32Array(w * h * 4); R.readRenderTargetPixels(rt, 0, 0, w, h, buf); return { w, h, buf }; };
        st.render(); const nat = lin();
        R.setDrawingBufferSize(W, H, 3); st.render(); const big = lin();
        R.setPixelRatio(pr); R.setSize(css.x, css.y, false); st.render();
        if (nat.w !== W || big.w !== 3 * W) throw new Error(`the stage's target is ${nat.w}×${nat.h} and ${big.w}×${big.h}, not the page's ${W}×${H} and 3×`);
        const ex = R.toneMappingExposure / 0.6, rrt = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
        const enc = (v) => { v = Math.min(1, Math.max(0, v)); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); };
        const tone = (r, g, b) => { r *= ex; g *= ex; b *= ex;
          const a = rrt(0.59719 * r + 0.35458 * g + 0.04823 * b), c = rrt(0.07600 * r + 0.90834 * g + 0.01566 * b), d = rrt(0.02840 * r + 0.13383 * g + 0.83777 * b);
          return 0.2126 * enc(1.60475 * a - 0.53108 * c - 0.07367 * d) + 0.7152 * enc(-0.10208 * a + 1.10813 * c - 0.00605 * d) + 0.0722 * enc(-0.00327 * a - 0.07276 * c + 1.07602 * d); };
        /* the target's rows run bottom-up (GL); the mask's and the tiles' run top-down (the canvas) */
        const E = new Float32Array(W * H), L = new Float32Array(W * H), w3 = 3 * W, H3 = 3 * H, nb = nat.buf, bb = big.buf;
        for (let y = 0; y < H; y++) { const gy = H - 1 - y; for (let x = 0; x < W; x++) {
          const k = (gy * W + x) * 4, n = tone(nb[k], nb[k + 1], nb[k + 2]); let r = 0, g = 0, b = 0;
          for (let j = 0; j < 3; j++) { const row = H3 - 1 - (3 * y + j); for (let i = 0; i < 3; i++) { const q = (row * w3 + 3 * x + i) * 4; r += bb[q]; g += bb[q + 1]; b += bb[q + 2]; } }
          L[y * W + x] = n; E[y * W + x] = Math.abs(n - tone(r / 9, g / 9, b / 9)); } }
        return { E, nat: L };
      },
    };
  });
  const S = await t.eval(() => window.__wlSA.size()), look = await t.eval(() => window.__wl.lookName || 'real');
  t.log(`the page draws ${S.W}×${S.H} at pixel ratio ${S.pr.toFixed(2)} (${tag}; the kit's touch page: the game's phone tier), the ${look} look`);
  let fail = 0;
  const said = (ok, gated, line) => { t.log((gated ? (ok ? '✔ ' : '✖ ') : 'ℹ ') + line); if (gated && !ok) fail++; };
  for (const park of ['waxline', 'kilnyard']) {
    await t.eval((p) => { window.__wl.debug.mode('title'); return window.__wl.switchPark(p); }, park); await t.sleep(2500);   // a switch is taken only from the title
    t.log('park: ' + await t.eval(() => window.__wl.park()));
    for (const sunEl of [13, 55]) {
      await t.eval((e) => { const st = window.__wl.debug.stage, az = Math.atan2(st.sunDir.x, st.sunDir.z), el = e * Math.PI / 180; st.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize(); st.sky.material.uniforms.sunDir.value.copy(st.sunDir); }, sunEl);
      for (const [cp, surf, names, view, pos, look, fov, ref, pairs] of CASES.filter((c) => c[0] === park)) {
        /* the skater placed where the view looks (the shadow map follows her, as the follow camera keeps her near), then hidden */
        await t.eval(([look]) => { const D = window.__wl.debug; D.mode('play'); D.place([look[0], look[1] + 0.3, look[2]], 0, 0); }, [look]); await t.sleep(400);
        await t.eval(([pos, look, fov]) => { const D = window.__wl.debug; D.mode('shot'); D.freeze = true; D.juno.rig.visible = false; D.board.visible = false; D.shot = { pos, look, fov, freeze: true }; }, [pos, look, fov]); await t.sleep(500);
        const n = await t.eval(([names, grow]) => new Promise((res) => requestAnimationFrame(() => res(window.__wlSA.mask(names, grow)))), [names, surf === 'paint']);
        const name = `${surf} · ${cp === 'waxline' ? 'the Plaza' : 'Kiln Yard'} ${view} · sun ${sunEl}°`;
        if (n < 600) { said(true, false, `${name}: n/a — ${n} of its pixels in view away from its edges (a tile needs 60, a reading ≥ 600)`); continue; }
        /* the lens moved a third of a pixel at the target's distance, sideways */
        const lens = async (sh) => t.eval(([pos, look, fov, sh]) => new Promise((res) => {
          const D = window.__wl.debug, T = D.THREE, H = D.stage.renderer.domElement.height, P = new T.Vector3(...pos), L = new T.Vector3(...look), fwd = L.clone().sub(P), dist = fwd.length(); fwd.normalize();
          const side = new T.Vector3().crossVectors(fwd, new T.Vector3(0, 1, 0)).normalize(), px = 2 * Math.tan(fov * Math.PI / 360) * dist / H, o = side.multiplyScalar(px * sh);
          D.shot = { pos: P.clone().add(o).toArray(), look: L.clone().add(o).toArray(), fov, freeze: true };
          requestAnimationFrame(() => requestAnimationFrame(() => res(true))); }), [pos, look, fov, sh]);
        /* one reading: the mean E per pixel over three lens positions, the surface as it is or as its reference draws it. A surface is read
           ALONE: the paint, which has its own gate, is hidden while the asphalt is read (10-17: a far bay line, under a pixel wide, covers no
           pixel's centre, so no mask can take it out — its crawl was charged to the asphalt) */
        const alone = surf !== 'paint';
        const reading = async (as, shs) => {
          const acc = []; for (const sh of shs) { await lens(sh); acc.push(await t.eval(([as, alone]) => {
            const D = window.__wl.debug, st = D.stage, undo = [];
            if (alone) st.scene.traverse((o) => { if (o.name.startsWith('paint:') && o.visible) { undo.push([o, null]); o.visible = false; } });
            if (as === 'slab' || as === 'slabBare') { const slab = st.scene.getObjectByName('park:slab').material; st.scene.traverse((o) => { if (o.name === 'park:asphalt') { undo.push([o, o.material]); o.material = slab; } }); }
            if (as === 'bare' || as === 'slabBare') st.scene.traverse((o) => { if (o.name.startsWith('paint:') && o.visible) { undo.push([o, null]); o.visible = false; } });
            const { E } = window.__wlSA.E(); for (const [o, m] of undo) { if (m) o.material = m; else o.visible = true; }
            window.__wlSA.acc = (window.__wlSA.acc || []).concat([E]); return window.__wlSA.acc.length - 1; }, [as, alone])); }
          return acc;
        };
        await t.eval(() => { window.__wlSA.acc = []; });
        const A = await reading('as', [0, 0.33, 0.67]);
        const B = ref ? await reading(ref, [0, 0.33, 0.67]) : null;
        const N = ref ? await reading(ref, [0.17, 0.5, 0.83]) : null;
        /* the slab drawn on the paint's pixels (the paint hidden, the ground as slab), said beside the gate (10-17: its worst tile against the
           paint's worst was tried as the gate and flipped on noise — both are what else stands in view, the dock's edges, the same in both) */
        const C = surf === 'paint' ? await reading('slabBare', [0, 0.33, 0.67]) : null;
        /* by tile: the mean E of each set over the kept pixels; the rule; the worst; a crop of the worst tiles, outlined */
        const r = await t.eval(([A, B, N, C, gated, ref, BOUND]) => {
          const S2 = window.__wlSA, D = window.__wl.debug, gl = D.stage.renderer.domElement, W = gl.width, H = gl.height, M = S2.M;
          const mean = (ix) => { const o = new Float32Array(W * H); for (const i of ix) { const E = S2.acc[i]; for (let q = 0; q < W * H; q++) o[q] += E[q] / ix.length; } return o; };
          const a = mean(A), b = B ? mean(B) : null, nn = N ? mean(N) : null, cc = C ? mean(C) : null, tiles = [];
          for (let ty = 0; ty + 12 <= H; ty += 12) for (let tx = 0; tx + 12 <= W; tx += 12) { let sa = 0, sb = 0, sn = 0, sc = 0, c = 0; for (let y = ty; y < ty + 12; y++) for (let x = tx; x < tx + 12; x++) { const q = y * W + x; if (M[q]) { sa += a[q]; if (b) sb += b[q]; if (nn) sn += nn[q]; if (cc) sc += cc[q]; c++; } }
            if (c >= 60) tiles.push({ x: tx, y: ty, a: sa / c, b: b ? sb / c : null, n: nn ? sn / c : null, s: cc ? sc / c : null }); }
          const bad = (u, v) => u >= 2 * Math.max(v, 0.15) && u - v >= 1.5;
          let sum = 0, cnt = 0; for (let q = 0; q < W * H; q++) if (M[q]) { sum += a[q]; cnt++; }
          const worst = tiles.slice().sort((p, q) => q.a - p.a).slice(0, 4);
          /* THE GATE (orgo-u-53, ruled 10-17 on the measurements): a tile fails OVER 8 LEVELS — the slab's worst, 7.4 by the curb, reads fine
             by eye; its joints crawl, so a bound relative to the slab alone would bless a joint's stair-steps — OR, for a surface read against
             the slab, at ×2 AND +1.5 OVER THE SLAB DRAWN ON THE SAME PIXELS: the ceiling alone let a whole surface crawl (the asphalt without
             its band limits: its mean E tripled, 289–456 tiles relative, its worst tile still ~3.4). The asphalt is read on its own pixels; the
             paint's region is grown round its quads and holds the ground's own edges too (the dock's top, 9–15 bare), so it keeps the ceiling
             alone, a tile over 8 its only where it adds 1.5 or more to the ground without it — its relative reading is said */
          const over = gated ? tiles.filter((u) => (u.a > BOUND && (ref !== 'bare' || u.a - u.b >= 1.5)) || (ref === 'slab' && bad(u.a, u.b))) : [], rel = gated ? tiles.filter((u) => bad(u.a, u.b)) : [];
          const fails = over, nullFails = gated ? tiles.filter((u) => bad(u.b, u.n) || bad(u.n, u.b)) : [];
          /* the crop: the frame as drawn, the worst (or failing) tiles outlined, 3× enlarged around the first */
          D.stage.render(); const c = document.createElement('canvas'), show = (fails.length ? fails : worst).slice(0, 4), f0 = show[0] || { x: 0, y: 0 };
          const cx = Math.max(0, Math.min(W - 96, f0.x - 42)), cy = Math.max(0, Math.min(H - 64, f0.y - 26)); c.width = 96 * 3; c.height = 64 * 3; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(gl, cx, cy, 96, 64, 0, 0, 288, 192);
          x.strokeStyle = 'rgba(255,0,255,0.95)'; x.lineWidth = 2; for (const u of show) x.strokeRect((u.x - cx) * 3, (u.y - cy) * 3, 36, 36);
          const aMax = Math.max(0, ...tiles.map((u) => u.a)), sMax = cc ? Math.max(0, ...tiles.map((u) => u.s)) : null;
          return { rel: rel.length, relWorst: rel.slice(0, 3).map((u) => ({ at: [u.x, u.y], E: +u.a.toFixed(2), ref: +u.b.toFixed(2) })), aMax, sMax, tiles: tiles.length, mean: sum / Math.max(1, cnt), worst: worst.map((u) => ({ at: [u.x, u.y], E: +u.a.toFixed(2), ref: u.b != null ? +u.b.toFixed(2) : null })), fails: fails.length, nullFails: nullFails.length, worstFail: fails.slice(0, 3).map((u) => ({ at: [u.x, u.y], E: +u.a.toFixed(2), ref: +u.b.toFixed(2) })), png: c.toDataURL('image/png') };
        }, [A, B, N, C, !!ref, ref, BOUND]);
        const file = `alias_${cp}_${surf}_${view}_sun${sunEl}_${tag}.png`; fs.writeFileSync(path.join(t.outDir, file), Buffer.from(r.png.split(',')[1], 'base64'));
        const head = `${name}: ${n} pixels, ${r.tiles} tiles, E ${r.mean.toFixed(2)} levels a pixel; the worst tiles ${r.worst.map((w) => w.E + (w.ref != null ? ' (as ' + ref + ' ' + w.ref + ')' : '')).join(', ')} — ${file}`;
        if (!ref) said(true, false, head + ` · the bound ${BOUND}: ${r.worst.length && r.worst[0].E > BOUND ? 'OVER (' + r.worst.filter((w) => w.E > BOUND).length + ' of the four worst)' : 'within'}`);
        else {
          said(r.nullFails === 0, true, `${name}, THE NULL (${ref === 'slab' ? 'the slab' : 'the bare ground'} against itself, three lens positions against three others): ${r.nullFails} of ${r.tiles} tiles fail`);
          /* a tile against the same tile drawn as the reference: what the new surface ADDS (anything else in the tile is in both and cancels).
             The paint is read against the ground without it — stricter than the slab: the slab's own lines (its joints) alias more */
          said(r.fails === 0, true, `${head} · THE BOUND (${ref === 'slab' ? `over ${BOUND} a tile, or ×2 and +1.5 over the slab on the same pixels` : `over ${BOUND} a tile where the paint adds 1.5 or more`}): ${r.fails} of ${r.tiles} tiles fail${r.fails ? ' — ' + JSON.stringify(r.worstFail) : ''}`);
          if (ref === 'bare') said(true, false, `${name}, against the ground without it (the relative rule, said): ${r.rel} of ${r.tiles} tiles at ×2 and +1.5${r.rel ? ' — ' + JSON.stringify(r.relWorst) : ''}`);
          if (surf === 'paint') said(true, false, `${name}, the slab drawn on the same pixels (said): its worst tile ${r.sMax.toFixed(2)} against the paint's ${r.aMax.toFixed(2)} — the worst tiles are what else stands in view, the same in both`);
        }
        /* the paint frame by frame, IN COLOUR (a pixel's change is its largest channel's: yellow on grey concrete differs by ~25 levels of
           luminance and ~110 of blue, 10-17): its interior — where it is drawn, the frame with it 30 or more from the frame without it, eroded
           1 px (a 10 cm line is 3–6 px at 5–12 m) — between two lens positions a third of a pixel apart, against the same pixels without it */
        if (pairs) {
          await t.eval(() => { window.__wlSA.fr = []; });
          const ids = {};
          for (const vis of [true, false]) for (const sh of [0, 0.33]) { await lens(sh); ids[(vis ? 'p' : 'g') + sh] = await t.eval((vis) => {
            const st = window.__wl.debug.stage, gl = st.renderer.domElement, W = gl.width, H = gl.height;
            st.scene.traverse((o) => { if (o.name.startsWith('paint:')) o.visible = vis; }); st.render();
            const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(gl, 0, 0); const d = x.getImageData(0, 0, W, H).data;
            st.scene.traverse((o) => { if (o.name.startsWith('paint:')) o.visible = true; });
            window.__wlSA.fr.push(d); return window.__wlSA.fr.length - 1; }, vis); }
          const z = await t.eval(([p0, p1, g0, g1]) => {
            const S2 = window.__wlSA, gl = window.__wl.debug.stage.renderer.domElement, W = gl.width, H = gl.height, F = S2.fr, MQ = S2.MQ;
            const dif = (A, B, q) => Math.max(Math.abs(A[q * 4] - B[q * 4]), Math.abs(A[q * 4 + 1] - B[q * 4 + 1]), Math.abs(A[q * 4 + 2] - B[q * 4 + 2]));
            const drawn = new Uint8Array(W * H); for (let q = 0; q < W * H; q++) drawn[q] = MQ[q] && dif(F[p0], F[g0], q) >= 30 ? 1 : 0;
            const inner = new Uint8Array(W * H); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { let all = 1; for (let j = -1; j <= 1 && all; j++) for (let i = -1; i <= 1; i++) if (!drawn[(y + j) * W + x + i]) { all = 0; break; } inner[y * W + x] = all; }
            let n = 0, fp = 0, fg = 0; for (let q = 0; q < W * H; q++) if (inner[q]) { n++; if (dif(F[p0], F[p1], q) >= 60) fp++; if (dif(F[g0], F[g1], q) >= 60) fg++; }
            return { n, fp, fg };
          }, [ids.p0, ids['p0.33'], ids.g0, ids['g0.33']]);
          const okZ = z.n >= 100 && z.fp / z.n <= z.fg / z.n + 0.005;
          said(okZ, true, `${name}, FRAME BY FRAME (the paint's interior, ${z.n} pixels, the lens moved a third of a pixel): ${z.fp} change 60 or more in a channel (${(100 * z.fp / Math.max(1, z.n)).toFixed(2)} %), the same pixels without the paint ${z.fg} (${(100 * z.fg / Math.max(1, z.n)).toFixed(2)} %)${z.n < 100 ? ' — too few of its pixels in view to read' : ''}`);
        }
      }
    }
    await t.eval(() => { const D = window.__wl.debug, st = D.stage; D.juno.rig.visible = true; D.board.visible = true; D.shot = null; D.mode('play'); });
  }
  t.log('errors', JSON.stringify(t.errors.slice(0, 4)));
  t.log(fail ? `SURFACE ALIASING: RED (${fail})` : 'SURFACE ALIASING: GREEN');
  return fail === 0 && t.errors.length === 0;
}
