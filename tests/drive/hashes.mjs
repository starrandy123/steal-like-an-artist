/* THE HASH, MEASURED WHERE IT IS USED (the supervisor's round-7 finding: tests/hash.mjs greps the spelling `fract(sin(`, and a sine hash
 * written another way passes it). The page's own hash (view/surfaces.js WLHASH, shared by the park's marks, the grass and the sky) is compiled
 * on this page's GPU and drawn into a small target over the very ranges the game feeds it:
 *   the park's world cells — every grid the marks and the grass use (0.25 m to 4 m cells over the park and past it), at their offsets;
 *   the sky's building cells — (cell, band and grid) for the heights, the windows' density, floor height and columns, and the window cells.
 * Each target is read back and judged: its values spread evenly (16 buckets, none further than 2.5 points from 6.25 %), no block of 8 × 8
 * neighbouring cells is near constant (a spread under 0.08 — a sound hash's blocks spread about 0.29), and no cell's value is tied to its
 * neighbours' or to the other draws one mark makes (a stain's place, size and outline are hashed at offsets of one cell's id: their
 * correlation |r| within max(0.04, 3/√N)). RED on any. And the marks themselves are drawn from above and must darken their share of ground.
 * 10-16, the record: both sine hashes are PERIODIC on this laptop's GPU at these ranges — the spectra read the supervisor's disguised one at
 * 65–194 times the mean and the builder's first one at 320–696 (the bar is 25, white noise about 11); an earlier "sound, 15 of 15" was read
 * before the spectra existed, and is void. Every plant is re-run on this wall as it ships (tests/plants.mjs, a step of every round). */
const MARKS_FLOOR = 0.04;   // calibrated below
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const r = await t.eval(async () => {
    const D = window.__wl.debug, T = D.THREE, renderer = D.stage.renderer, src = document.querySelector('script[type=module]').src;
    const { WLHASH } = await import(new URL('view/surfaces.js', src).href);
    /* each range: a grid of cells (W × H), cell (i, j) → p = a + i·dx + j·dy (the second axis may step a small set: the sky's bands) */
    /* [name, W, H, a, dx, dy, the two other draws one mark makes from the same cell (offsets from this one's), or none] */
    const ranges = [
      ['park: gum cells (0.25 m)', 360, 260, [-24, -24], [1, 0], [0, 1], [1.7, 9.2]], ['park: gum, its size and darkness', 360, 260, [-24 + 4.4, -24 + 4.4], [1, 0], [0, 1], [-2.2, -4.4]],
      ['park: skid cells (1.6 m)', 120, 90, [-10 + 31, -10 + 31], [1, 0], [0, 1], [-26, -25]], ['park: crack cells (3 m)', 64, 48, [-6 + 51, -6 + 51], [1, 0], [0, 1], [-50, -49]],
      ['park: stain cells (3 m)', 64, 48, [-6 + 91, -6 + 91], [1, 0], [0, 1], [-78, -77]], ['park: oil cells (4 m)', 48, 36, [-5 + 71, -5 + 71], [1, 0], [0, 1], [-68, -67]],
      ['grass: patch cells (1.6 m)', 120, 90, [-30, -30], [1, 0], [0, 1], null], ['grass: worn cells (0.33 m)', 360, 260, [-60, -60], [1, 0], [0, 1], null],
      ['sky: heights (cell, band·4.1 + grid)', 420, 8, [0, 0], [1, 0], [0, 4.1], [17, 41]], ['sky: setbacks (cell + 17, band + 7)', 420, 4, [17, 7], [1, 0], [0, 1], null],
      ['sky: gaps (cell + 41, band·2.3 + grid·3)', 420, 8, [41, 0], [1, 0], [0, 2.3], null], ['sky: window density (bcell, 3)', 512, 4, [0, 3], [1, 0], [0, 2], null],
      ['sky: window cells (wc + bcell·(1.7, 1))', 400, 160, [0, 0], [1.7, 1], [0, 1], null], ['sky: window clusters', 260, 160, [0, 0], [1, 0.37], [0, 1], null],
    ];
    const out = [];
    const scene = new T.Scene(), cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), geo = new T.PlaneGeometry(2, 2);
    for (const [name, W, H, a, dx, dy, comp] of ranges) {
      const o = comp || [0.5, 0.25];
      const m = new T.ShaderMaterial({ uniforms: { a: { value: new T.Vector2(...a) }, dx: { value: new T.Vector2(...dx) }, dy: { value: new T.Vector2(...dy) }, size: { value: new T.Vector2(W, H) }, o1: { value: o[0] }, o2: { value: o[1] } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        /* the cell's own value, its neighbour's along the first axis, and the two other draws of the same cell (the shift a mark adds to the id) */
        fragmentShader: 'precision highp float; uniform vec2 a, dx, dy, size; uniform float o1, o2; varying vec2 vUv;\n' + WLHASH + '\nvoid main(){ vec2 c = floor(vUv * size); vec2 p = a + c.x * dx + c.y * dy; gl_FragColor = vec4(wlHash(p), wlHash(p + dx), wlHash(p + o1), wlHash(p + o2)); }' });
      const mesh = new T.Mesh(geo, m); scene.add(mesh);
      const rt = new T.WebGLRenderTarget(W, H, { type: T.UnsignedByteType, depthBuffer: false });
      const keep = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(keep);
      const px = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
      scene.remove(mesh); m.dispose(); rt.dispose();
      const N = W * H, v = new Float32Array(N), nb = new Float32Array(N), c1 = new Float32Array(N), c2 = new Float32Array(N);
      for (let k = 0; k < N; k++) { v[k] = px[k * 4] / 255; nb[k] = px[k * 4 + 1] / 255; c1[k] = px[k * 4 + 2] / 255; c2[k] = px[k * 4 + 3] / 255; }
      const corr = (A, B2) => { let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0; for (let k = 0; k < N; k++) { sa += A[k]; sb += B2[k]; saa += A[k] * A[k]; sbb += B2[k] * B2[k]; sab += A[k] * B2[k]; } const ma = sa / N, mb = sb / N, va = saa / N - ma * ma, vb = sbb / N - mb * mb; return va > 1e-9 && vb > 1e-9 ? (sab / N - ma * mb) / Math.sqrt(va * vb) : 1; };
      /* the neighbour along the second axis too: the next row's value of the same column */
      const up = new Float32Array(N - W), me = new Float32Array(N - W); for (let k = 0; k < N - W; k++) { me[k] = v[k]; up[k] = v[k + W]; }
      const corrUp = (() => { const n = N - W; let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0; for (let k = 0; k < n; k++) { sa += me[k]; sb += up[k]; saa += me[k] * me[k]; sbb += up[k] * up[k]; sab += me[k] * up[k]; } const ma = sa / n, mb = sb / n, va = saa / n - ma * ma, vb = sbb / n - mb * mb; return va > 1e-9 && vb > 1e-9 ? (sab / n - ma * mb) / Math.sqrt(va * vb) : 1; })();
      const ties = { next: corr(v, nb), row: corrUp, draw1: comp ? corr(v, c1) : 0, draw2: comp ? corr(v, c2) : 0, draws: comp ? corr(c1, c2) : 0 };
      const hist = new Array(16).fill(0); for (const x of v) hist[Math.min(15, Math.floor(x * 16))]++;
      const shares = hist.map((n) => n / v.length), worstBucket = Math.max(...shares.map((s) => Math.abs(s - 1 / 16)));
      /* blocks of 8 × 8 neighbouring cells (or 8 × the rows when a range has fewer) */
      const bh = Math.min(8, H); let flat = 0, blocks = 0, sdSum = 0;
      for (let y0 = 0; y0 + bh <= H; y0 += bh) for (let x0 = 0; x0 + 8 <= W; x0 += 8) {
        let s = 0, s2 = 0, n = 0; for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + 8; x++) { const q = v[y * W + x]; s += q; s2 += q * q; n++; }
        const sd = Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)); sdSum += sd; blocks++; if (sd < 0.08) flat++;
      }
      out.push({ name, cells: W * H, worstBucket, flat, blocks, meanSd: sdSum / Math.max(1, blocks), ties, tieMax: Math.max(...Object.values(ties).map(Math.abs)), tieBar: Math.max(0.04, 3 / Math.sqrt(W * H)) });
    }
    /* NO PERIOD: the hash over 256 × 256 neighbouring cells (the park's gum grid, and the sky's window cells), its power spectrum flat — a hash
       that comes round again (a multiplier whose product with a whole number of cells is nearly whole) shows a peak far above white noise,
       whose highest bin of 65,535 sits near 11 times the mean */
    const fft = (re, im) => { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
      for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k + len / 2] = re[i + k] - ar; im[i + k + len / 2] = im[i + k] - ai; re[i + k] += ar; im[i + k] += ai; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } } };
    for (const [name, a2, dx2, dy2] of [['spectrum: the park\'s gum grid', [-24, -24], [1, 0], [0, 1]], ['spectrum: the park\'s stain grid', [-6 + 91, -6 + 91], [1, 0], [0, 1]], ['spectrum: the sky\'s window cells', [0, 0], [1.7, 1], [0, 1]]]) {
      const S = 256, m = new T.ShaderMaterial({ uniforms: { a: { value: new T.Vector2(...a2) }, dx: { value: new T.Vector2(...dx2) }, dy: { value: new T.Vector2(...dy2) } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'precision highp float; uniform vec2 a, dx, dy; varying vec2 vUv;\n' + WLHASH + '\nvoid main(){ vec2 c = floor(vUv * 256.0); float h = wlHash(a + c.x * dx + c.y * dy); gl_FragColor = vec4(h, fract(h * 256.0), 0.0, 1.0); }' });
      const mesh = new T.Mesh(geo, m); scene.add(mesh); const rt = new T.WebGLRenderTarget(S, S, { type: T.UnsignedByteType, depthBuffer: false });
      const keep = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(keep);
      const px = new Uint8Array(S * S * 4); renderer.readRenderTargetPixels(rt, 0, 0, S, S, px); scene.remove(mesh); m.dispose(); rt.dispose();
      const re = new Float64Array(S * S), im = new Float64Array(S * S); let mean = 0; for (let k = 0; k < S * S; k++) { re[k] = (px[k * 4] + px[k * 4 + 1] / 256) / 256; mean += re[k]; } mean /= S * S; for (let k = 0; k < S * S; k++) re[k] -= mean;
      const row = (y, R, I) => { const r2 = new Float64Array(S), i2 = new Float64Array(S); for (let x = 0; x < S; x++) { r2[x] = R[y * S + x]; i2[x] = I[y * S + x]; } fft(r2, i2); for (let x = 0; x < S; x++) { R[y * S + x] = r2[x]; I[y * S + x] = i2[x]; } };
      for (let y = 0; y < S; y++) row(y, re, im);
      for (let x = 0; x < S; x++) { const r2 = new Float64Array(S), i2 = new Float64Array(S); for (let y = 0; y < S; y++) { r2[y] = re[y * S + x]; i2[y] = im[y * S + x]; } fft(r2, i2); for (let y = 0; y < S; y++) { re[y * S + x] = r2[y]; im[y * S + x] = i2[y]; } }
      let sum = 0, peak = 0, at = 0; for (let k = 1; k < S * S; k++) { const pw = re[k] * re[k] + im[k] * im[k]; sum += pw; if (pw > peak) { peak = pw; at = k; } }
      out.push({ name, spectrum: peak / (sum / (S * S - 1)), at: [at % S, Math.floor(at / S)] });
    }
    /* THE MARKS THEMSELVES, drawn from above over a stretch of the park (40 × 30 m at 2.5 cm a cell): the share of the ground they darken by
       4 % or more — what the hash is for, measured where it is used (a hash can spread well cell by cell and still starve the marks, whose
       calls on neighbouring offsets it ties together) */
    { const { MARKS } = await import(new URL('view/surfaces.js', src).href), W = 1600, H = 1200;
      const m = new T.ShaderMaterial({ uniforms: { size: { value: new T.Vector2(W, H) } }, extensions: { derivatives: true },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'precision highp float; uniform vec2 size; varying vec2 vUv;\n' + WLHASH + MARKS + '\nvoid main(){ vec3 P = vec3(8.0 + vUv.x * 40.0, 0.0, 6.0 + vUv.y * 30.0); vec2 mk = wlMarks(P, 0.0); gl_FragColor = vec4(mk.x, 0.0, 0.0, 1.0); }' });
      const mesh = new T.Mesh(geo, m); scene.add(mesh);
      const rt = new T.WebGLRenderTarget(W, H, { type: T.UnsignedByteType, depthBuffer: false });
      const keep = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(keep);
      const px = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, px); scene.remove(mesh); m.dispose(); rt.dispose();
      let marked = 0; for (let k = 0; k < W * H; k++) if (px[k * 4] >= 10) marked++;
      out.push({ name: 'park: the marks drawn from above (40 × 30 m)', cells: W * H, marks: marked / (W * H) }); }
    return out;
  });
  let bad = 0;
  for (const x of r) {
    if (x.spectrum != null) { const oks = x.spectrum <= 25; if (!oks) bad++; t.log((oks ? '✔ ' : '✖ ') + x.name + ': its highest frequency ' + x.spectrum.toFixed(1) + ' times the mean (≤ 25; white noise ~11) at ' + JSON.stringify(x.at)); continue; }
    if (x.marks != null) { const okm = x.marks >= MARKS_FLOOR; if (!okm) bad++; t.log((okm ? '✔ ' : '✖ ') + x.name + ': ' + (100 * x.marks).toFixed(2) + '% of the ground darkened 4 % or more (≥ ' + (100 * MARKS_FLOOR).toFixed(1) + ' %)'); continue; }
    const ok = x.worstBucket <= 0.025 && x.flat === 0 && x.tieMax <= x.tieBar; if (!ok) bad++;
    t.log((ok ? '✔ ' : '✖ ') + x.name + ': ' + x.cells + ' cells · buckets within ' + (100 * x.worstBucket).toFixed(2) + ' points of 6.25 % · ' + x.flat + ' of ' + x.blocks + ' blocks near constant (mean spread ' + x.meanSd.toFixed(3) + ') · ties |r| ≤ ' + x.tieMax.toFixed(3) + ' (bar ' + x.tieBar.toFixed(3) + ': ' + Object.entries(x.ties).map(([k, r2]) => k + ' ' + r2.toFixed(3)).join(', ') + ')');
  }
  t.log((bad ? 'HASHES: RED' : 'HASHES: GREEN') + ' · ' + (r.length - bad) + ' of ' + r.length + ' ranges sound');
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return t.errors.length === 0 && bad === 0;
}
