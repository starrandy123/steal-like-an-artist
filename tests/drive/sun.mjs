/* THE SUN IS ROUND WHEREVER IT IS IN THE FRAME (the supervisor's round-2 note: an oval, wider than tall, near the edge of the turned view).
 * The camera is set so the sun stands on the axis, then twice further across the picture, the second near its edge (turned 30° and 45°); after the game draws each frame the picture
 * is read back, the disc found (the brightest pixels round where the page says the sun is) and its width and height measured. A disc whose
 * width over height is outside 0.85 … 1.18 fails. Upright and turned (the turned view is the wide one). */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  await t.eval(() => { window.__wl.debug.mode('shot'); });
  const rows = [];
  /* on the axis, and two places out across the picture, the farther near its edge (upright the picture is narrow: 8° and 14°) */
  for (const off of tag === 'turn' ? [0, 30, 45] : [0, 8, 14]) {
    /* the look: the sun's own bearing turned `off` degrees, level, from the middle of the plaza, and as far off as the picture allows */
    const v = await t.eval((off) => {
      const D = window.__wl.debug, d = D.stage.sunDir, az = Math.atan2(d.x, d.z) - off * Math.PI / 180, pos = [31, 1.5, 22];
      const shot = { pos, look: [pos[0] + Math.sin(az) * 10, pos[1] + d.y / Math.hypot(d.x, d.z) * 10 * 0, pos[2] + Math.cos(az) * 10], fov: 68 };
      D.shot = shot; return shot;
    }, off);
    await t.sleep(400);
    /* read the picture right after the game has drawn it (a frame callback queued behind the game's own) */
    const m = await t.eval(() => new Promise((res) => requestAnimationFrame(() => {
      /* where the sun is, found here (never from the page's own uniform: what is measured is not asked of the thing measured) */
      const D = window.__wl.debug, T = D.THREE, cam = D.stage.camera, gl = D.stage.renderer.domElement, W = gl.width, H = gl.height;
      const sp = D.stage.sunDir.clone().multiplyScalar(600).add(D.stage.sky.position), front = sp.clone().applyMatrix4(cam.matrixWorldInverse).z < 0; sp.project(cam);
      const rAng = Math.tan(Math.acos(1 - D.stage.sky.material.uniforms.sunSize.value)) * (H / 2) / Math.tan(cam.fov * Math.PI / 360), u = { w: rAng };
      const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(gl, 0, 0);
      const cx = Math.round((sp.x * 0.5 + 0.5) * W), cy = Math.round((0.5 - sp.y * 0.5) * H), R = Math.max(12, Math.round(rAng * 4));
      if (!front || cx < 0 || cx >= W || cy < 0 || cy >= H) return res({ inFrame: false, cx, cy, W, H });
      void T;
      const x0 = Math.max(0, cx - R), y0 = Math.max(0, cy - R), w = Math.min(W, cx + R) - x0, h = Math.min(H, cy + R) - y0, px = x.getImageData(x0, y0, w, h).data;
      let lmax = 0; for (let i = 0; i < px.length; i += 4) lmax = Math.max(lmax, px[i] + px[i + 1] + px[i + 2]);
      let a = Infinity, b = -Infinity, cc = Infinity, dd = -Infinity, n = 0;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const i = (yy * w + xx) * 4, l = px[i] + px[i + 1] + px[i + 2]; if (l >= lmax - 6) { n++; a = Math.min(a, xx); b = Math.max(b, xx); cc = Math.min(cc, yy); dd = Math.max(dd, yy); } }
      res({ inFrame: true, cx, cy, W, H, r: u.w, n, wide: b - a + 1, tall: dd - cc + 1, lmax });
    })));
    await t.shot('sun_' + off + '_' + tag);
    const ratio = m.inFrame && m.tall ? m.wide / m.tall : null;
    rows.push({ off, ...m, ratio });
    t.log('sun ' + off + '° off the axis: ' + (m.inFrame ? 'at ' + m.cx + ',' + m.cy + ' of ' + m.W + '×' + m.H + ', disc ' + m.wide + '×' + m.tall + ' px (width/height ' + ratio.toFixed(2) + ', drawn radius ' + m.r.toFixed(1) + ' px, ' + m.n + ' brightest px)' : 'not in the frame (' + m.cx + ',' + m.cy + ')'));
    void v;
  }
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return t.errors.length === 0 && rows.every((r) => r.inFrame && r.ratio > 0.85 && r.ratio < 1.18);
}
