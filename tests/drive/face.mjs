/* THE FACE, read off the running page (the owner, 10-16: "we need a better face design please. The guy is flat" · "The face is lob sided
 * too lol"):
 * 1. THE EYE LINE IS LEVEL: the head's ear-to-ear line against the rig's level over every pose the pose makes (crouch, carve, push, fakie,
 *    air, a grind, a manual: 144 of them, each settled), and against the world's level at rest and on the title. At most 2°.
 * 2. THE EYES LOOK AT ONE THING: each eyeball's own forward axis against the line from its centre to what it looks at (4 m down the head's
 *    look at rest; the lens on the title, or the eye at the edge of its turn when the lens is further round). Within 0.5°.
 * 3. THE PAIRS ARE MIRRORS: everything set on the head bone (the eyes, their lids, the brows) against its twin across the head's midline,
 *    by the box it fills. Within 0.1 mm.
 * 4. SHOTS: straight on in the head's own frame (its up, its forward), the two three-quarters and the two profiles at 0.6 m, in the game's
 *    light; the title's frame; the follow camera's crop round the head, in play.
 * 5. THE FACE MOVES WITH THE HEAD: the face's skin, posed, in the head's own frame against where it was bound. Within 0.5 mm. */
import path from 'node:path';
const FLAT = [30, 0, 14], LEVEL = 2, AIM = 0.5, TWIN = 0.0001;
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  let bad = 0; const say = (ok, line) => { if (!ok) bad++; t.log((ok ? '✔ ' : '✖ ') + line); };
  await t.eval((at) => { const D = window.__wl.debug; D.place(at, 0, 0); D.mode('shot'); D.freeze = true; }, FLAT); await t.sleep(900);

  /* 1. level, over the pose's whole range */
  const sweep = await t.eval(() => {
    const D = window.__wl.debug, J = D.juno, T = D.THREE, hb = J.bones.head, rows = [];
    const roll = () => { J.rig.updateMatrixWorld(true); const m = new T.Matrix4().copy(J.rig.matrixWorld).invert().multiply(hb.matrixWorld), e = m.elements; const x = new T.Vector3(e[0], e[1], e[2]).normalize(); return Math.asin(Math.max(-1, Math.min(1, x.y))) * 180 / Math.PI; };
    for (const state of ['roll', 'air', 'grind', 'manual']) for (const crouch of [0, 0.5, 1]) for (const lean of [-1, 0, 1]) for (const pushing of [0, 1]) for (const fakie of [false, true]) {
      const s = { state, crouch, lean, pushing, fakie, airT: 0.3, braking: false, trick: null, grab: false };
      for (let k = 0; k < 8; k++) J.pose(0.4, s);
      rows.push({ r: roll(), s: state + ' crouch ' + crouch + ' lean ' + lean + (pushing ? ' pushing' : '') + (fakie ? ' fakie' : '') });
    }
    rows.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)); return { n: rows.length, worst: rows[0], second: rows[1] };
  });
  await t.sleep(400);
  const world = () => t.eval(() => { const D = window.__wl.debug, T = D.THREE, hb = D.juno.bones.head; hb.updateWorldMatrix(true, false); const e = hb.matrixWorld.elements, x = new T.Vector3(e[0], e[1], e[2]).normalize(); return Math.asin(Math.max(-1, Math.min(1, x.y))) * 180 / Math.PI; });
  const atRest = await world();
  say(Math.abs(sweep.worst.r) <= LEVEL, 'THE EYE LINE: over ' + sweep.n + ' poses the head\'s tilt off the rig\'s level is at most ' + Math.abs(sweep.worst.r).toFixed(2) + '° (' + sweep.worst.s + '; ≤ ' + LEVEL + ')');
  say(Math.abs(atRest) <= LEVEL, 'THE EYE LINE at rest: ' + atRest.toFixed(2) + '° off the world\'s level (≤ ' + LEVEL + ')');

  /* the eyes: the head bone's meshes that are whole spheres */
  const eyesAim = (lens) => t.eval((lens) => {
    const D = window.__wl.debug, T = D.THREE, J = D.juno, hb = J.bones.head; hb.updateWorldMatrix(true, true);
    const eyes = hb.children.filter((o) => o.isMesh && o.geometry.type === 'SphereGeometry' && Math.abs(o.geometry.parameters.thetaLength - Math.PI) < 1e-6 && Math.abs(o.geometry.parameters.phiLength - 2 * Math.PI) < 1e-6);
    const he = hb.matrixWorld.elements, fwd = new T.Vector3(he[8], he[9], he[10]).normalize();
    const mid = eyes.reduce((a, e) => a.add(new T.Vector3().setFromMatrixPosition(e.matrixWorld)), new T.Vector3()).multiplyScalar(1 / Math.max(1, eyes.length));
    const target = lens ? D.stage.camera.position.clone() : mid.clone().addScaledVector(fwd, 4);
    const inv = new T.Matrix4().copy(hb.matrixWorld).invert();
    return eyes.map((e) => {
      const c = new T.Vector3().setFromMatrixPosition(e.matrixWorld), ee = e.matrixWorld.elements, ax = new T.Vector3(ee[8], ee[9], ee[10]).normalize(), want = target.clone().sub(c).normalize();
      /* the turn the eye would need, in the head's frame: past the edge of its turn, the eye should stand at that edge */
      const tl = target.clone().applyMatrix4(inv), cl = e.position, d = tl.clone().sub(cl), yaw = Math.atan2(d.x, d.z), pitch = -Math.atan2(d.y, Math.hypot(d.x, d.z));
      return { x: +cl.x.toFixed(4), off: Math.acos(Math.max(-1, Math.min(1, ax.dot(want)))) * 180 / Math.PI, yaw: yaw * 180 / Math.PI, pitch: pitch * 180 / Math.PI, rot: [e.rotation.x * 180 / Math.PI, e.rotation.y * 180 / Math.PI] };
    });
  }, lens);
  /* 2. at rest: 4 m down the look */
  const rest = await eyesAim(false);
  say(rest.length === 2 && rest.every((e) => e.off <= AIM), 'THE EYES at rest look at one point 4 m down the head\'s look: each eye\'s axis off its line by ' + rest.map((e) => e.off.toFixed(2) + '°').join(' and ') + ' (≤ ' + AIM + ')');

  /* 3. the pairs: each mesh on the head bone against its twin across the midline, by the box it fills in the head's frame */
  const twins = await t.eval(() => {
    const D = window.__wl.debug, T = D.THREE, hb = D.juno.bones.head, rows = [];
    const boxes = hb.children.filter((o) => o.isMesh).map((o) => { o.updateMatrix(); const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox.clone().applyMatrix4(new T.Matrix4().compose(o.position, new T.Quaternion(), o.scale)); return { o, c: b.getCenter(new T.Vector3()), s: b.getSize(new T.Vector3()) }; });
    let worst = 0, what = '';
    for (const a of boxes) {
      if (Math.abs(a.c.x) < 1e-5) continue;
      let best = Infinity; for (const b of boxes) { if (b === a) continue; const d = Math.hypot(a.c.x + b.c.x, a.c.y - b.c.y, a.c.z - b.c.z) + Math.hypot(a.s.x - b.s.x, a.s.y - b.s.y, a.s.z - b.s.z); best = Math.min(best, d); }
      if (best > worst) { worst = best; what = (a.o.geometry.type || 'mesh') + ' at x ' + (a.c.x * 1000).toFixed(1) + ' mm'; }
      rows.push(best);
    }
    return { n: rows.length, worst, what };
  });
  say(twins.n >= 4 && twins.worst <= TWIN, 'THE PAIRS: ' + twins.n + ' meshes on the head, each against its twin across the midline: at worst ' + (twins.worst * 1000).toFixed(3) + ' mm apart (' + twins.what + '; ≤ ' + TWIN * 1000 + ')');

  /* 5. THE FACE MOVES WITH THE HEAD: every vertex of the face (the skin's bare part above the jaw line, in front of the ears) skinned as
     posed, in the head's own frame, against where it was bound — the eyes, the lids and the brows ride the head bone exactly, so a face that
     lags behind it (skin weighted to the neck) slides under them. Read at rest and at the pose that turns the head furthest from the neck */
  const slide = async () => t.eval(() => {
    const D = window.__wl.debug, T = D.THREE, J = D.juno, hb = J.bones.head, sm = J.meshes[0], g = sm.geometry, P = g.attributes.position, K = g.attributes.cloth;
    J.rig.updateMatrixWorld(true); sm.skeleton.update();
    const inv = new T.Matrix4().copy(hb.matrixWorld).invert(), bindHead = new T.Vector3().setFromMatrixPosition(new T.Matrix4().copy(sm.skeleton.boneInverses[sm.skeleton.bones.indexOf(hb)]).invert());
    let worst = 0, at = null, n = 0; const v = new T.Vector3(), b = new T.Vector3();
    const N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      if (K && K.getX(i) > 0.5 && Math.abs(K.getX(i) - 9) > 0.5) continue; b.fromBufferAttribute(P, i);   // bare skin, or the face's own kind (9)
      /* the face: from the chin's front to the brows, in front of the ears — not the jaw's underside, which the neck bends (its normal down) */
      const yd = b.y + 0.016; if (yd < 1.545 || yd > 1.685 || b.z < 0.04 || Math.abs(b.x) > 0.075 || N.getY(i) < -0.5) continue;
      sm.getVertexPosition(i, v); v.applyMatrix4(sm.matrixWorld).applyMatrix4(inv);
      const d = v.distanceTo(b.clone().sub(bindHead)); n++; if (d > worst) { worst = d; at = [b.x, yd, b.z].map((q) => +(q * 1000).toFixed(0)); }
    }
    return { worst, at, n };
  });
  const slideRest = await slide();
  /* and at the pose that turns the head furthest from its neck: pushing, crouched, carving */
  await t.eval(() => { const J = window.__wl.debug.juno; for (let k = 0; k < 8; k++) J.pose(0.4, { state: 'roll', crouch: 1, lean: 1, pushing: 1, fakie: false, airT: 0, braking: false, trick: null, grab: false }); });
  const slideFar = await slide();
  /* back to rest before the pictures: a frozen clock would hold the pose this left (the figure settles only as time passes) */
  await t.eval((at) => { const D = window.__wl.debug; D.freeze = false; D.place(at, 0, 0); }, FLAT); await t.sleep(1200); await t.eval(() => { window.__wl.debug.freeze = true; }); await t.sleep(300);
  say(slideFar.n > 200 && slideFar.worst <= 0.0005, 'THE FACE MOVES WITH THE HEAD pushing, crouched and carving: at most ' + (slideFar.worst * 1000).toFixed(2) + ' mm (at ' + (slideFar.at ? 'x ' + slideFar.at[0] + ', y ' + slideFar.at[1] + ', z ' + slideFar.at[2] : '—') + ' mm; ≤ 0.5)');
  say(slideRest.n > 200 && slideRest.worst <= 0.0005, 'THE FACE MOVES WITH THE HEAD at rest: ' + slideRest.n + ' vertices of the face, in the head\'s frame, at most ' + (slideRest.worst * 1000).toFixed(2) + ' mm from where they were bound (at ' + (slideRest.at ? 'x ' + slideRest.at[0] + ', y ' + slideRest.at[1] + ', z ' + slideRest.at[2] : '—') + ' mm; ≤ 0.5)');

  /* 4. shots in the head's own frame at 0.6 m: straight on, the three-quarters, the profiles */
  const lens = async (az, dist, name) => {
    await t.eval(([az, dist]) => { const D = window.__wl.debug, T = D.THREE, hb = D.juno.bones.head; hb.updateWorldMatrix(true, false);
      const e = hb.matrixWorld.elements, x = new T.Vector3(e[0], e[1], e[2]).normalize(), y = new T.Vector3(e[4], e[5], e[6]).normalize(), z = new T.Vector3(e[8], e[9], e[10]).normalize();
      const c = new T.Vector3(0, 0.09, Math.abs(az) > 60 ? 0.035 : 0.07).applyMatrix4(hb.matrixWorld), a = az * Math.PI / 180, dir = z.clone().multiplyScalar(Math.cos(a)).addScaledVector(x, Math.sin(a));   // a profile is aimed at the head's middle: the ear in it
      D.stage.camera.up.copy(y); D.shot = { pos: c.clone().addScaledVector(dir, dist).toArray(), look: c.toArray(), fov: 30, freeze: true }; }, [az, dist]);
    await t.sleep(600); await t.shot('face_' + name + '_' + tag);
  };
  for (const [az, name] of [[0, 'front'], [45, 'three_quarter_left'], [-45, 'three_quarter_right'], [90, 'profile_left'], [-90, 'profile_right']]) await lens(az, 0.6, name);
  /* 6. THE FACE IS NOT FLAT, read on the picture straight on at 0.6 m in the game's light: its relief (the spread of brightness over the face
     between the brows and the chin: 95th percentile over 5th, a face of one even brown is near 1) and its zones (the lips against the cheek,
     CIE76 ΔE: lips of the skin's own colour are near 0). Floors set between V9 (the owner's "flat") and the new face, both read here */
  await lens(0, 0.6, 'front_read');
  const read = await t.eval(() => new Promise((res) => requestAnimationFrame(() => {
    const D = window.__wl.debug, T = D.THREE, hb = D.juno.bones.head, cam = D.stage.camera, gl = D.stage.renderer.domElement, W = gl.width, H = gl.height;
    hb.updateWorldMatrix(true, false);
    const px = (x, y, z) => { const p = new T.Vector3(x, y - 0.016 - 1.54, z - 0.015).applyMatrix4(hb.matrixWorld).project(cam); return [Math.round((p.x * 0.5 + 0.5) * W), Math.round((0.5 - p.y * 0.5) * H)]; };
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(gl, 0, 0);
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lab = (r, g, b) => { const R = lin(r), G = lin(g), B = lin(b), X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.9505, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.089, f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; };
    const box = (a, b) => { const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]), w = Math.max(1, Math.abs(b[0] - a[0])), h = Math.max(1, Math.abs(b[1] - a[1])); return x.getImageData(x0, y0, w, h).data; };
    /* the face: from the brows to the chin, between the outer corners of the eyes */
    const d = box(px(-0.045, 1.678, 0.09), px(0.045, 1.548, 0.09)), L = [];
    for (let i = 0; i < d.length; i += 4) L.push(lab(d[i], d[i + 1], d[i + 2])[0]);
    L.sort((u, v) => u - v); const q = (f) => L[Math.floor(f * (L.length - 1))];
    const mean = (dd) => { const m = [0, 0, 0]; let n = 0; for (let i = 0; i < dd.length; i += 4) { const l = lab(dd[i], dd[i + 1], dd[i + 2]); m[0] += l[0]; m[1] += l[1]; m[2] += l[2]; n++; } return m.map((v) => v / n); };
    const lips = mean(box(px(-0.012, 1.5775, 0.1), px(0.012, 1.5735, 0.1))), cheek = mean(box(px(0.035, 1.615, 0.09), px(0.05, 1.6, 0.09)));
    res({ relief: q(0.95) / Math.max(1, q(0.05)), p5: q(0.05), p95: q(0.95), dE: Math.hypot(lips[0] - cheek[0], lips[1] - cheek[1], lips[2] - cheek[2]), lips, cheek, n: L.length });
  })));
  /* read and logged, no floor: neither separates the owner's "flat" (V9: relief 4.72, the lips' ΔE 12.1 — its dark sockets spread its
     brightness, its painted lips were lighter) from the new face (5.75, 7.8). The forms' field measures (tests/face.mjs) are the wall */
  t.log('· the face straight on (a reading, no floor): brightness spreads ' + read.relief.toFixed(2) + '× (L* 95th ' + read.p95.toFixed(1) + ' over 5th ' + read.p5.toFixed(1) + ', ' + read.n + ' px); the lips ΔE ' + read.dE.toFixed(1) + ' against the cheek (lips L*a*b* ' + read.lips.map((v) => v.toFixed(0)).join('/') + ', cheek ' + read.cheek.map((v) => v.toFixed(0)).join('/') + ')');
  await t.eval(() => { const D = window.__wl.debug; D.stage.camera.up.set(0, 1, 0); D.shot = null; D.freeze = false; });

  /* the title: its frame, the eye line, the eyes on the lens */
  await t.eval(() => { window.__wl.debug.mode('title'); }); await t.sleep(1500);
  const titleRoll = await world(), onLens = await eyesAim(true);
  await t.shot('face_title_' + tag);
  say(Math.abs(titleRoll) <= LEVEL, 'THE EYE LINE on the title: ' + titleRoll.toFixed(2) + '° off the world\'s level (≤ ' + LEVEL + ')');
  const EYE_YAW = 0.45 * 180 / Math.PI, EYE_PITCH = 0.35 * 180 / Math.PI;
  const lensOk = onLens.length === 2 && onLens.every((e) => (Math.abs(e.yaw) <= EYE_YAW && Math.abs(e.pitch) <= EYE_PITCH ? e.off <= AIM : Math.abs(Math.abs(e.rot[1]) - Math.min(Math.abs(e.yaw), EYE_YAW)) <= AIM && Math.abs(Math.abs(e.rot[0]) - Math.min(Math.abs(e.pitch), EYE_PITCH)) <= AIM));
  say(lensOk, 'THE EYES on the title look at the lens: ' + onLens.map((e) => 'off by ' + e.off.toFixed(2) + '° (it needs ' + e.yaw.toFixed(1) + '° across, ' + e.pitch.toFixed(1) + '° down; turned ' + e.rot[1].toFixed(1) + '°, ' + e.rot[0].toFixed(1) + '°)').join(' · '));

  /* in play: the follow camera's crop round the head */
  await t.eval((at) => { const D = window.__wl.debug; D.mode('play'); D.place(at, 0, 0); }, FLAT); await t.sleep(1800);
  const box = await t.eval(() => { const D = window.__wl.debug, T = D.THREE, hb = D.juno.bones.head; hb.updateWorldMatrix(true, false); const p = new T.Vector3(0, 0.09, 0.05).applyMatrix4(hb.matrixWorld).project(D.stage.camera); return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (0.5 - p.y * 0.5) * innerHeight }; });
  const fr = await (await t.game().frameElement()).boundingBox(), half = 70;
  await page.screenshot({ path: path.join(t.outDir, 'face_play_' + tag + '.png'), clip: { x: fr.x + Math.max(0, box.x - half), y: fr.y + Math.max(0, box.y - half), width: half * 2, height: half * 2 } });
  t.log('FACE: ' + (bad ? 'RED · ' + bad + ' readings off' : 'GREEN') + ' · shots: front, both three-quarters, both profiles at 0.6 m, the title, the follow camera');
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return t.errors.length === 0 && bad === 0;
}
