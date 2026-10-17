/* THE PARK THROUGH THE FIGURE, on the GPU (10-16, the supervisor: the jacket's tunnel sits at the back of the collar, where the follow camera
 * looks most — "shoot that spot close from behind and from above-behind … and check nothing of the park shows through it"). Juno as the game
 * draws him, posed and skinned, in his riding pose and in the push's deepest (crouched, leaning, pushing); the camera 0.3 m (the follow
 * camera re-frames nearer than that) and 0.5 m from the back of his collar, level, 30° and 55° above, straight behind and 35° to each side.
 * Each view twice: the picture as the game draws it (for the eye), and HIM ALONE — his rig on a layer of its own that the camera alone
 * looks at, everything else off, the background a flat green — where a green pixel the frame's edge cannot reach over green is the park
 * seen THROUGH him. The same from his side at the nose (V10's tunnel: there the reading must be red on V10's build, 0 on a closed head).
 * Usage (the kit): node drive.mjs <build> <this> --viewport 390x844 --dpr 3 --out <dir> --gpu */
const FLAT = [30, 0, 14];
const RIDE = null, PUSH = { state: 'roll', crouch: 1, lean: 1, pushing: 1, fakie: false, airT: 0, braking: false, trick: null, grab: false };
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }   // the game's first painted frame, as the face drive waits for it
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  let bad = 0; const say = (c, m) => { t.log((c ? '✔ ' : '✖ ') + m); if (!c) bad++; };
  await t.eval((at) => { const D = window.__wl.debug; D.place(at, 0, 0); D.mode('shot'); }, FLAT); await t.sleep(900);
  /* a pose, settled: the clock runs while the figure eases into it, then holds */
  const pose = async (p) => {
    await t.eval((p) => { const D = window.__wl.debug; D.freeze = false; D.shot = Object.assign({ freeze: false }, p ? { pose: p } : {}); }, p); await t.sleep(1500);
    await t.eval(() => { const D = window.__wl.debug; D.freeze = true; D.shot.freeze = true; }); await t.sleep(300);
  };
  /* a view: the camera `dist` from a point on him, `el` degrees up, `yaw` degrees round from the direction `from` (his chest's back, or his
     head's side), both in his own frame as posed */
  const view = (where, dist, el, yaw) => t.eval(([where, dist, el, yaw]) => {
    const D = window.__wl.debug, T = D.THREE, B = D.juno.bones; B.chest.updateWorldMatrix(true, false); B.head.updateWorldMatrix(true, false);
    const ax = (bone, k) => { const e = bone.matrixWorld.elements; return new T.Vector3(e[k * 4], e[k * 4 + 1], e[k * 4 + 2]).normalize(); };
    const up = new T.Vector3(0, 1, 0);
    let c, from;
    if (where === 'collar') { const fwd = ax(B.chest, 2); fwd.y = 0; fwd.normalize(); c = B.neck.getWorldPosition(new T.Vector3()).addScaledVector(fwd, -0.04).addScaledVector(up, 0.02); from = fwd.clone().negate(); }
    else { c = new T.Vector3(0, 0.07, 0.07).applyMatrix4(B.head.matrixWorld); from = ax(B.head, 0); from.y = 0; from.normalize(); }   // the nose, from his left (his +x)
    const a = yaw * Math.PI / 180, e = el * Math.PI / 180, side = new T.Vector3().crossVectors(up, from).normalize();
    const dir = from.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a)).multiplyScalar(Math.cos(e)).addScaledVector(up, Math.sin(e));
    D.stage.camera.up.set(0, 1, 0); Object.assign(D.shot, { pos: c.clone().addScaledVector(dir, dist).toArray(), look: c.toArray(), fov: 50 });
  }, [where, dist, el, yaw]);
  /* him alone over green, drawn now and read back now: enclosed green pixels (4-connected over green, unreachable from the frame's edge) */
  const through = () => t.eval(() => {
    const D = window.__wl.debug, T = D.THREE, st = D.stage, rig = D.juno.rig, cam = st.camera, L0 = cam.layers.mask, bg = st.scene.background, fog = st.scene.fog;
    rig.traverse((o) => o.layers.enable(7)); st.scene.background = new T.Color(0x00ff00); st.scene.fog = null; cam.layers.set(7);
    st.renderer.render(st.scene, cam);
    const gl = st.renderer.domElement, W = gl.width, H = gl.height, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(gl, 0, 0);
    const px = x.getImageData(0, 0, W, H).data;
    cam.layers.mask = L0; rig.traverse((o) => o.layers.disable(7)); st.scene.background = bg; st.scene.fog = fog;
    const green = new Uint8Array(W * H); let his = 0;
    for (let i = 0; i < W * H; i++) { const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2]; green[i] = g > 200 && r < 90 && b < 90 ? 1 : 0; if (!green[i]) his++; }
    const seen = new Uint8Array(W * H), st2 = [];
    const push = (i) => { if (green[i] && !seen[i]) { seen[i] = 1; st2.push(i); } };
    for (let i = 0; i < W; i++) { push(i); push((H - 1) * W + i); } for (let j = 0; j < H; j++) { push(j * W); push(j * W + W - 1); }
    /* the background is joined through edges AND corners (his pixels through edges): a wedge of sky between his jaw and his collar narrows
       to a point, and its last pixels touch the rest only corner to corner — joined through edges only, they read as a hole (10-16, V11b:
       2 px "through him", the sky beside him); a hole he rings round stays shut either way */
    while (st2.length) { const i = st2.pop(), xx = i % W, yy = (i - xx) / W; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = xx + dx, ny = yy + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) push(ny * W + nx); } }
    let n = 0, sx = 0, sy = 0; for (let i = 0; i < W * H; i++) if (green[i] && !seen[i]) { n++; sx += i % W; sy += Math.floor(i / W); }
    /* where the park shows through him, the evidence: him alone over green, 120 px round the spot, the pixels seen through marked red */
    let crop = null;
    if (n) { const cx = Math.round(sx / n), cy = Math.round(sy / n), R = 60, cc = document.createElement('canvas'); cc.width = 2 * R; cc.height = 2 * R; const g2 = cc.getContext('2d'), im = g2.createImageData(2 * R, 2 * R);
      for (let y = 0; y < 2 * R; y++) for (let x = 0; x < 2 * R; x++) { const X = cx - R + x, Y = cy - R + y, o = (y * 2 * R + x) * 4; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const i = Y * W + X, hole = green[i] && !seen[i];
        im.data[o] = hole ? 255 : px[i * 4]; im.data[o + 1] = hole ? 0 : px[i * 4 + 1]; im.data[o + 2] = hole ? 0 : px[i * 4 + 2]; im.data[o + 3] = 255; }
      g2.putImageData(im, 0, 0); crop = cc.toDataURL('image/png'); }
    return { n, his, W, H, at: n ? [Math.round(sx / n), Math.round(sy / n)] : null, crop };
  });
  const rows = [];
  const shoot = async (poseName, where, dist, el, yaw) => {
    await view(where, dist, el, yaw); await t.sleep(450);
    const name = 'seethrough_' + where + '_' + poseName + '_d' + dist + '_el' + el + '_yaw' + yaw + '_' + tag;
    await t.shot(name);
    const r = await through(); if (r.crop) { (await import('node:fs')).writeFileSync(t.outDir + '/' + name + '_through.png', Buffer.from(r.crop.split(',')[1], 'base64')); delete r.crop; }
    rows.push({ name, poseName, where, dist, el, yaw, ...r });
    t.log('  · ' + name + ': him ' + r.his + ' px of ' + r.W + '×' + r.H + ' · the park through him: ' + r.n + ' px' + (r.at ? ' at ' + r.at.join(',') : ''));
  };
  for (const [poseName, p] of [['ride', RIDE], ['push', PUSH]]) {
    await pose(p);
    for (const dist of [0.3, 0.5]) for (const el of [0, 30, 55]) for (const yaw of [-35, 0, 35]) await shoot(poseName, 'collar', dist, el, yaw);
    for (const dist of [0.3, 0.5]) await shoot(poseName, 'nose', dist, 0, 0);
  }
  const worst = (w) => rows.filter((r) => r.where === w).reduce((a, r) => (r.n > a.n ? r : a), { n: 0 });
  const wc = worst('collar'), wn = worst('nose');
  say(rows.every((r) => r.his > 2000), 'every view has him in it: at least ' + Math.min(...rows.map((r) => r.his)) + ' px of him (> 2000)');
  say(wc.n === 0, 'THE COLLAR FROM BEHIND AND ABOVE: ' + rows.filter((r) => r.where === 'collar').length + ' views, riding and pushing, 0.3 and 0.5 m · the park through him at most ' + wc.n + ' px' + (wc.n ? ' (' + wc.name + ' at ' + wc.at.join(',') + ')' : '') + ' (none)');
  say(wn.n === 0, 'THE NOSE FROM HIS SIDE: the park through him at most ' + wn.n + ' px' + (wn.n ? ' (' + wn.name + ' at ' + wn.at.join(',') + ')' : '') + ' (none)');
  await t.eval(() => { const D = window.__wl.debug; D.shot = null; D.freeze = false; });
  t.log('SEE-THROUGH: ' + (bad ? 'RED · ' + bad + ' off' : 'GREEN') + ' · collar ' + wc.n + ' px, nose ' + wn.n + ' px at worst');
}
