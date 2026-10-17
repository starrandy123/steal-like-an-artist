/* THE KIT CLOSE, for the eye and for the walls: her shoes, the board's trucks and the cloth at the knee and the elbow, zoomed, and the
 * same things from the game's own camera; and what can be measured of them on the page:
 *   - the wheels stand on the ground: on a flat at rest, each wheel's lowest point within 3 mm of the ground under it;
 *   - the shot list is the one the supervisor asked for (shoes on the board, trucks from behind, cloth at the elbows and knees), framed on
 *     the bone or the truck it is of, upright and turned (the orientation is the viewport's). */
const FLAT = [30, 0, 14];        // the plaza: open flat ground, nothing within 4 m
const SPECKLE_BAR = 0.3;         // measured 10-16 at the worst of six moments: 0.08–0.12 with her lift, 0.58–0.84 without it
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  await t.eval(() => { window.__wl.debug.mode('play'); });
  await t.eval((at) => { window.__wl.debug.place(at, 0, 0); }, FLAT); await t.sleep(900);
  /* THE WHEELS ON THE GROUND: the sim's own point is the ground under the board; each wheel's lowest drawn point against it */
  const wheels = await t.eval(() => {
    const D = window.__wl.debug, T = D.THREE, s = D.sim.read(), out = [];
    for (const k of ['front', 'back']) for (const w of D.board.userData[k].userData.wheels) { w.updateWorldMatrix(true, true); const b = new T.Box3().setFromObject(w); out.push(+(1000 * (b.min.y - s.p[1])).toFixed(1)); }
    return { gapsMm: out, ground: s.p[1], state: s.state };
  });
  const wheelsOk = wheels.gapsMm.length === 4 && wheels.gapsMm.every((g) => Math.abs(g) <= 3);
  t.log((wheelsOk ? '✔' : '✖') + ' WHEELS: their lowest points against the ground, mm: ' + wheels.gapsMm.join(' / ') + ' (each within 3) · state ' + wheels.state);
  /* HER OWN SHADOW DOES NOT SPECKLE HER: under the game's camera, what her own shadow does to her picture — D, the picture with her shadow less
     the picture without it, drawn in one task (the same pose, the same lens) — read on her inner pixels (three in from her outline). A real
     shadow (an arm across her side) darkens a smooth region of D; a speckle darkens pixels apart, which is D's fine part (D less its 3×3
     mean). 10-16: a fine grid on her lit thigh, gone with her shadow off; she now reads her shadow a texel and a half off her skin */
  /* where the speckle falls depends on where she stands against the sun's map (its grid follows her as she rolls): six moments of one roll,
     each frozen and drawn three ways in one task; the worst of them is the reading */
  const own = { speckle: 0, dark: 0, n: 1e9, lift: 0, at: 0 };
  for (const ms of [800, 1100, 1400, 1700, 2000, 2300]) {
    await t.eval((at) => { window.__wl.debug.mode('play'); window.__wl.debug.place(at, 0, 3.2); }, FLAT); await t.sleep(ms);
    await t.eval(() => { window.__wl.debug.mode('shot'); const D = window.__wl.debug, c = D.stage.camera; D.shot = { pos: c.position.toArray(), look: D.board.position.clone().add(new D.THREE.Vector3(0, 0.85, 0)).toArray(), fov: c.fov }; }); await t.sleep(250);
    const r = await t.eval(() => new Promise((res) => requestAnimationFrame(() => {
    const D = window.__wl.debug, sm = D.juno.meshes[0], gl = D.stage.renderer.domElement, W = gl.width, H = gl.height, x0 = Math.floor(0.1 * W), y0 = Math.floor(0.02 * H), w = Math.floor(0.8 * W), h = Math.floor(0.96 * H);
    const grab = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(gl, 0, 0); const px = x.getImageData(x0, y0, w, h).data, L = new Float32Array(w * h); for (let k = 0; k < w * h; k++) L[k] = 0.2126 * px[k * 4] + 0.7152 * px[k * 4 + 1] + 0.0722 * px[k * 4 + 2]; return L; };
    const set = (on) => { sm.receiveShadow = on; sm.material.needsUpdate = true; };
    set(true); D.stage.render(); const on = grab(); set(false); D.stage.render(); const off = grab();
    D.juno.rig.visible = false; D.stage.render(); const none = grab(); D.juno.rig.visible = true; set(true);
    const her = new Uint8Array(w * h); for (let k = 0; k < w * h; k++) her[k] = Math.abs(on[k] - none[k]) > 2 ? 1 : 0;
    /* D = with less without; its fine part (D less its 3×3 mean) over her inner pixels, three in from her outline */
    let sp = 0, dark = 0, n = 0;
    for (let y = 4; y < h - 4; y++) for (let x = 4; x < w - 4; x++) {
      let all = 1; for (let j = -3; j <= 3 && all; j++) for (let i = -3; i <= 3; i++) if (!her[(y + j) * w + x + i]) { all = 0; break; } if (!all) continue;
      let m = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const k = (y + j) * w + x + i; m += on[k] - off[k]; }
      const d = on[y * w + x] - off[y * w + x]; sp += Math.abs(d - m / 9); dark += Math.max(0, -d); n++;
    }
    res({ speckle: sp / Math.max(1, n), dark: dark / Math.max(1, n), n, lift: D.juno.shadowLift.value });
    })));
    if (r.speckle >= own.speckle) Object.assign(own, r, { at: ms });
    own.n = Math.min(own.n, r.n);
  }
  const speckOk = own.n >= 800 && own.speckle <= SPECKLE_BAR;
  t.log((speckOk ? '✔' : '✖') + ' HER OWN SHADOW: its speckle on her at worst ' + own.speckle.toFixed(3) + ' (' + own.at + ' ms into the roll; ≤ ' + SPECKLE_BAR + '; the darkening it brings then ' + own.dark.toFixed(2) + ' a pixel; at least ' + own.n + ' of her pixels; read ' + (1000 * own.lift).toFixed(1) + ' mm off her skin)');
  await t.eval(() => { window.__wl.debug.shot = null; window.__wl.debug.mode('play'); });
  /* the game's own camera behind her, rolling: the trucks as a player sees them */
  await t.eval((at) => { window.__wl.debug.place(at, 0, 3.2); }, FLAT); await t.sleep(1600);
  await t.shot('kit_gameplay_rolling_' + tag);
  /* the pictures, framed on what they are of (aim: a bone; or the board's truck by its world place) */
  await t.eval(() => { window.__wl.debug.mode('shot'); });
  await t.eval((at) => { window.__wl.debug.place(at, 0, 0); }, FLAT); await t.sleep(600);
  const views = [
    ['shoe_front_34', { aim: 'footL', az: 70, dist: 0.62, h: 0.12, at: -0.02, fov: 30 }],
    ['shoe_back_34', { aim: 'footR', az: 120, dist: 0.62, h: 0.14, at: -0.02, fov: 30 }],
    ['shoe_side', { aim: 'footL', az: 0, dist: 0.6, h: 0.1, at: -0.03, fov: 30 }],
    ['shoe_heels', { aim: 'footR', az: -100, dist: 0.62, h: 0.18, at: -0.03, fov: 30 }],
    ['shoe_top', { vamp: 'L', fov: 34 }],   /* over the vamp itself, from her foot bone (round 11: framed on the ankle, it showed her pant leg and the sock's cap) */
    ['truck_behind', { truck: 'back', az: 180, dist: 0.75, h: 0.16, at: -0.02, fov: 30 }],
    ['truck_behind_low', { truck: 'back', az: 165, dist: 0.6, h: 0.04, at: 0.0, fov: 32 }],
    ['truck_side', { truck: 'front', az: 90, dist: 0.6, h: 0.02, at: 0.0, fov: 32 }],
    ['cloth_knee_front', { aim: 'shinL', az: 90, dist: 1.0, h: 0.05, at: 0.0, fov: 30 }],
    ['cloth_knee_back', { aim: 'shinR', az: -90, dist: 1.0, h: 0.05, at: 0.0, fov: 30 }],
    ['cloth_elbow', { aim: 'foreL', az: 60, dist: 0.95, h: 0.04, at: 0.0, fov: 30 }],
    ['cloth_jacket_back', { aim: 'chest', az: -90, dist: 1.3, h: 0.0, at: -0.08, fov: 30 }],
    ['cloth_jacket_front', { aim: 'chest', az: 90, dist: 1.3, h: 0.0, at: -0.08, fov: 30 }],
    ['cloth_pocket', { aim: 'thighL', az: 120, dist: 0.95, h: -0.15, at: -0.2, fov: 30 }],
  ];
  for (const [name, v] of views) {
    const ok = await t.eval((v) => {
      const D = window.__wl.debug, T = D.THREE;
      if (v.vamp) {
        /* the vamp's middle, between the foot bone's head and its tail as she stands now; the lens 30 cm above it and a little toward the toe */
        const b = D.juno.bones['foot' + v.vamp]; b.updateWorldMatrix(true, false);
        const head = b.getWorldPosition(new T.Vector3()), tail = new T.Vector3(0.005, -0.065, 0.165).applyMatrix4(b.matrixWorld), dir = tail.clone().sub(head).normalize(), mid = head.clone().lerp(tail, 0.55);
        D.shot = { pos: mid.clone().add(new T.Vector3(0, 0.3, 0)).addScaledVector(dir, 0.06).toArray(), look: mid.toArray(), fov: v.fov };
      } else if (v.truck) {
        /* a truck has no bone: the camera is put by its world place, round it by az from the line of travel */
        const tr = D.board.userData[v.truck]; tr.updateWorldMatrix(true, false); const c = tr.getWorldPosition(new T.Vector3()), f = D.sim.fwd, a = v.az * Math.PI / 180;
        const dx = f[0] * Math.cos(a) - f[2] * Math.sin(a), dz = f[0] * Math.sin(a) + f[2] * Math.cos(a);
        D.shot = { pos: [c.x + dx * v.dist, c.y + v.h, c.z + dz * v.dist], look: [c.x, c.y + v.at, c.z], fov: v.fov };
      } else D.shot = v;
      return true;
    }, v);
    await t.sleep(500); if (ok) await t.shot('kit_' + name + '_' + tag);
  }
  /* the crouch and a held air, where the cloth gathers: the knee and the elbow from the front */
  await t.eval(() => { window.__wl.debug.shot = { aim: 'shinL', az: 80, dist: 0.7, h: 0.08, at: 0.0, fov: 30, pose: { crouch: 0.95 } }; }); await t.sleep(600); await t.shot('kit_cloth_knee_crouch_' + tag);
  await t.eval(() => { window.__wl.debug.shot = { az: 60, dist: 2.2, h: 0.9, at: 0.75, fov: 38, pose: { state: 'air', airT: 0.3 } }; }); await t.sleep(600); await t.shot('kit_air_' + tag);
  await t.eval(() => { window.__wl.debug.shot = null; window.__wl.debug.mode('play'); });
  const L = await t.eval(() => window.__wl.ledger());
  t.log('triangles', JSON.stringify(L.triangles), 'drawCalls', L.drawCalls, 'gpuTris', L.gpuTris, 'MB', L.totalMb);
  t.log('KIT: ' + (wheelsOk && speckOk ? 'GREEN' : 'RED'));
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return t.errors.length === 0 && wheelsOk && speckOk;
}
