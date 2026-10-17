/* THE STAGE: the renderer for this device, the golden-hour sky, the sun and its shadow, the haze, and the reflection the steel catches.
 * A phone gets its own tier (read from window.__MOSA_DEVICE where NotesMosaic says what it is, else the browser): fewer pixels, smaller
 * maps, a smaller shadow. A governor steps the picture down if frames come slowly; it never climbs back. */
import * as THREE from '../../vendor/three/build/three.module.min.js';
import { WLHASH } from './surfaces.js';
import { LOOK } from '../config.js';

export function deviceTier() {
  let touch = false;
  try { const d = window.__MOSA_DEVICE; if (d && (d.mobile || d.touch)) touch = true; else if (!(d && d.mobile === false && d.touch === false)) touch = (matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0; } catch (e) { touch = false; }
  return touch ? { name: 'phone', dpr: 1.75, maxPx: 1.3e6, tex: 512, grime: 512, shadow: 1024, shadowSpan: 26, aa: false } : { name: 'desk', dpr: 2, maxPx: 3.2e6, tex: 1024, grime: 1024, shadow: 2048, shadowSpan: 34, aa: true };
}

export class Stage {
  constructor(canvasHost, tier) {
    this.tier = tier;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: tier.aa, powerPreference: 'high-performance', alpha: false, stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = LOOK.exposure;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;   // what three draws (it said PCFSoft was deprecated, on every boot)
    canvasHost.appendChild(r.domElement); r.domElement.id = 'wl-canvas'; r.info.autoReset = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.08, 900);
    const sky = this.sky = skyDome(); this.scene.add(sky);
    const fogC = new THREE.Color(LOOK.sky.haze); this.scene.fog = new THREE.Fog(fogC, LOOK.sky.fog[0], LOOK.sky.fog[1]);
    /* the sun: low in the south-west */
    const el = LOOK.sun.elevation * Math.PI / 180, az = LOOK.sun.azimuth * Math.PI / 180;
    this.sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
    const sun = this.sun = new THREE.DirectionalLight(LOOK.sun.color, LOOK.sun.intensity);
    sun.castShadow = true; sun.shadow.mapSize.set(tier.shadow, tier.shadow);
    const s = tier.shadowSpan / 2; Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 140 });
    sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.025; sun.shadow.radius = 2.5;
    this.scene.add(sun, sun.target);
    const hemi = this.hemi = new THREE.HemisphereLight(LOOK.fill.color, LOOK.sky.ground, LOOK.fill.intensity); this.scene.add(hemi);
    sky.material.uniforms.sunDir.value.copy(this.sunDir);
    /* the reflection the steel and the polished granite catch: the sky itself, made once */
    const pm = new THREE.PMREMGenerator(r), envScene = new THREE.Scene(), d2 = skyDome(); d2.material.uniforms.sunDir.value.copy(this.sunDir); d2.material.uniforms.sunSize.value = 0.02;
    /* what the park's surfaces reflect below the horizon is the ground (a neutral grey), not the haze the eye sees there: a peach haze in the
       reflection made every wall tan */
    d2.material.uniforms.below.value.set(LOOK.sky.ground); envScene.add(d2);
    const env = pm.fromScene(envScene, 0, 0.1, 1000, { size: tier.name === 'phone' ? 64 : 128 }); this.scene.environment = env.texture; this.scene.environmentIntensity = LOOK.fill.env; this.envTarget = env; pm.dispose();
    this.frames = []; this.step = 0; this.ladder = [1.75, 1.5, 1.25, 1.0]; this.started = performance.now();
    this.resize();
  }
  resize() {
    const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight), t = this.tier;
    let dpr = Math.min(window.devicePixelRatio || 1, this.ladder ? Math.min(t.dpr, this.ladder[this.step] || t.dpr) : t.dpr);
    if (w * h * dpr * dpr > t.maxPx) dpr = Math.sqrt(t.maxPx / (w * h));
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.dpr = dpr;
  }
  /* the shadow follows the skater: the sun's box is centred where the action is */
  follow(target) {
    const sun = this.sun, d = this.sunDir;
    sun.target.position.copy(target); sun.position.copy(target).addScaledVector(d, 60);
    /* snapped to whole shadow texels so the shadow does not shimmer as the camera moves */
    const span = this.tier.shadowSpan, texel = span / this.tier.shadow;
    sun.shadow.camera.updateMatrixWorld();
    const m = new THREE.Matrix4().lookAt(sun.position, sun.target.position, new THREE.Vector3(0, 1, 0)), inv = m.clone().invert();
    const p = sun.target.position.clone().applyMatrix4(inv); p.x = Math.round(p.x / texel) * texel; p.y = Math.round(p.y / texel) * texel; p.applyMatrix4(m);
    sun.target.position.copy(p); sun.position.copy(p).addScaledVector(d, 60);
  }
  /* the governor: after the first three seconds, two slow windows in a row (median frame over 20 ms) step the pixel ratio down */
  govern(ms) {
    const now = performance.now(); if (now - this.started < 3000) return;
    this.frames.push(ms); if (this.frames.length < 54) return;
    const s = this.frames.slice().sort((a, b) => a - b), med = s[s.length >> 1]; this.frames.length = 0;
    if (med > 20) { this.slow = (this.slow || 0) + 1; if (this.slow >= 2 && this.step < this.ladder.length - 1) { this.step++; this.slow = 0; this.resize(); } } else this.slow = 0;
  }
  /* each look's light: the real one is the sun against the sky's reflection; the painted one's bands want a softer sun and a fuller fill */
  setLook(name) {
    const P = LOOK.painted, painted = name === 'painted';
    this.look = name;
    this.sun.intensity = painted ? P.sun : LOOK.sun.intensity; this.hemi.intensity = painted ? P.fill : LOOK.fill.intensity;
    this.hemi.color.set(painted ? P.sky : LOOK.fill.color); this.hemi.groundColor.set(painted ? P.ground : LOOK.sky.ground);
    this.renderer.toneMappingExposure = painted ? P.exposure : LOOK.exposure;
    this.inkOn = painted;
  }
  /* the ink: the picture is drawn into a target with its depth; a second pass lays a line wherever the depth folds (a crease) or jumps (a
     silhouette) — read on 1/depth, which is flat across any flat surface, so a floor seen at a glancing angle never draws false lines */
  ink() {
    const r = this.renderer, size = r.getDrawingBufferSize(new THREE.Vector2());
    if (this.inkRT && this.inkRT.width === size.x && this.inkRT.height === size.y) return this.inkRT;
    if (this.inkRT) { this.inkRT.depthTexture.dispose(); this.inkRT.dispose(); }
    const dt = new THREE.DepthTexture(size.x, size.y); dt.type = THREE.FloatType;
    this.inkRT = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: this.tier.aa ? 4 : 0, depthTexture: dt, depthBuffer: true });
    if (!this.inkPass) {
      const m = new THREE.ShaderMaterial({
        uniforms: { tColor: { value: null }, tDepth: { value: null }, texel: { value: new THREE.Vector2() }, near: { value: 0.1 }, far: { value: 900 }, inkCol: { value: new THREE.Color(LOOK.painted.ink) }, strength: { value: LOOK.painted.inkStrength } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `uniform sampler2D tColor, tDepth; uniform vec2 texel; uniform float near, far, strength; uniform vec3 inkCol; varying vec2 vUv;
          float lin(float d) { float z = d * 2.0 - 1.0; return (2.0 * near * far) / (far + near - z * (far - near)); }
          float w(vec2 uv) { return 1.0 / lin(texture2D(tDepth, uv).x); }
          void main() {
            vec4 c = texture2D(tColor, vUv); float z = lin(texture2D(tDepth, vUv).x), w0 = 1.0 / z;
            float wl = w(vUv - vec2(texel.x, 0.0)), wr = w(vUv + vec2(texel.x, 0.0)), wd = w(vUv - vec2(0.0, texel.y)), wu = w(vUv + vec2(0.0, texel.y));
            float crease = abs(wl + wr + wd + wu - 4.0 * w0) / w0, jump = max(max(abs(wl - w0), abs(wr - w0)), max(abs(wd - w0), abs(wu - w0))) / w0;
            float e = max(smoothstep(0.012, 0.03, crease), smoothstep(0.05, 0.11, jump));
            e *= 1.0 - smoothstep(55.0, 140.0, z);
            c.rgb = mix(c.rgb, inkCol, e * strength);
            gl_FragColor = vec4(c.rgb, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
        depthTest: false, depthWrite: false,
      });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
      const q = new THREE.Mesh(g, m); q.frustumCulled = false; this.inkScene = new THREE.Scene(); this.inkScene.add(q); this.inkPass = m; this.inkCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    return this.inkRT;
  }
  render() {
    this.renderer.info.reset();
    /* where the sun's disc is on the screen, and how big: the sky's point on its dome, projected, and the disc's angle at the lens's centre */
    { const c = this.camera, u = this.sky.material.uniforms, sz = this._sz || (this._sz = new THREE.Vector2()), p = this._sp || (this._sp = new THREE.Vector3());
      this.renderer.getDrawingBufferSize(sz); c.updateMatrixWorld();
      p.copy(this.sunDir).multiplyScalar(600).add(this.sky.position); const front = p.clone().applyMatrix4(c.matrixWorldInverse).z < 0; p.project(c);
      const r = Math.sqrt(1 - Math.pow(1 - u.sunSize.value, 2)) / (1 - u.sunSize.value) * (sz.y / 2) / Math.tan(c.fov * Math.PI / 360);
      u.sunPx.value.set((p.x * 0.5 + 0.5) * sz.x, (p.y * 0.5 + 0.5) * sz.y, front ? 1 : 0, r); }
    if (!this.inkOn) { this.renderer.render(this.scene, this.camera); return; }
    const rt = this.ink(), u = this.inkPass.uniforms, r = this.renderer;
    r.setRenderTarget(rt); r.render(this.scene, this.camera); r.setRenderTarget(null);
    const px = Math.max(1, Math.round(this.dpr * LOOK.painted.inkPx));
    u.tColor.value = rt.texture; u.tDepth.value = rt.depthTexture; u.texel.value.set(px / rt.width, px / rt.height); u.near.value = this.camera.near; u.far.value = this.camera.far;
    r.render(this.inkScene, this.inkCam);
  }
}

/* the sky: zenith to a warm horizon, a glow around the low sun and its disc, a warm haze below the horizon */
function skyDome() {
  const g = new THREE.SphereGeometry(600, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { zenith: { value: new THREE.Color(LOOK.sky.zenith) }, mid: { value: new THREE.Color(LOOK.sky.mid) }, horizon: { value: new THREE.Color(LOOK.sky.horizon) }, away: { value: new THREE.Color(LOOK.sky.away) }, haze: { value: new THREE.Color(LOOK.sky.haze) }, below: { value: new THREE.Color(LOOK.sky.haze) }, sunCol: { value: new THREE.Color(LOOK.sun.color) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunSize: { value: 0.0007 }, sunPx: { value: new THREE.Vector4(0, 0, 0, 0) } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 zenith, mid, horizon, away, haze, below, sunCol, sunDir; uniform float sunSize; uniform vec4 sunPx; varying vec3 vDir;
      ${WLHASH}
      void main() { vec3 d = normalize(vDir); float h = d.y;
        /* toward the sun the horizon burns; away from it, it is a soft peach - and never the grey a straight orange-to-blue mix makes */
        vec2 hd = normalize(d.xz + vec2(1e-5)), hs = normalize(sunDir.xz + vec2(1e-5)); float toward = dot(hd, hs) * 0.5 + 0.5;
        vec3 low = mix(away, horizon, pow(toward, 1.6));
        float hh = clamp(h, 0.0, 1.0);
        vec3 c = mix(low, mid, smoothstep(0.0, 0.22, hh));
        c = mix(c, zenith, smoothstep(0.18, 0.85, hh));
        c = mix(c, below, smoothstep(0.035, -0.02, h));
        /* the city: four bands of rooftops, the farthest nearly the haze; widths that differ (two grids laid over each other), setbacks,
           tanks and masts, a TV tower and a spire; windows that differ building to building, some rooms already lit */
        float az = atan(d.x, d.z) / 6.2831853 + 0.5;
        for (int L = 3; L >= 0; L--) {
          float fl = float(L), depth = 0.16 + fl * 0.21;
          float best = -1.0, bfx = 0.0, bcell = 0.0, bw = 1.0;
          for (int g = 0; g < 2; g++) {
            float N = (60.0 + fl * 34.0) * (g == 0 ? 1.0 : 0.62), off = fl * 17.3 + float(g) * 5.1, cell = floor(az * N + off), fx = fract(az * N + off);
            float r1 = wlHash(vec2(cell, fl * 4.1 + float(g))), r2 = wlHash(vec2(cell + 17.0, fl + 7.0)), r3 = wlHash(vec2(cell + 41.0, fl * 2.3 + float(g) * 3.0));
            if (r3 > 0.8) continue;
            float lo = 0.04 + r2 * 0.14, hi = 0.96 - r1 * 0.14; if (fx < lo || fx > hi) continue;
            float top = (0.012 + r1 * r1 * 0.045 + step(0.9, r2) * 0.03) * (1.0 - fl * 0.17);
            float sx = (fx - lo) / (hi - lo);
            top += step(0.55, r3) * step(0.28, sx) * step(sx, 0.72) * (0.006 + r2 * 0.01);
            top += step(0.62, r2) * step(0.3, sx) * step(sx, 0.45) * 0.006 + step(0.82, r1) * step(abs(sx - 0.7), 0.02) * 0.016;
            if (top > best) { best = top; bfx = sx; bcell = cell + float(g) * 100.0; bw = hi - lo; }
          }
          /* two landmarks: a TV tower in the far band and a spire in the middle one, where the sun is not */
          if (L == 3) { float ta = abs(az - 0.13), pod = 1.0 - pow((h - 0.1) / 0.015, 2.0);
            best = max(best, step(ta, 0.0007 + 0.0011 * smoothstep(0.1, 0.0, h)) * 0.14);
            if (pod > 0.0 && ta < 0.0032 * sqrt(pod)) best = max(best, h + 0.002); }
          if (L == 2) { float sa = abs(az - 0.71); best = max(best, (0.072 - sa * 9.0) * step(sa, 0.008)); }
          if (best > 0.0 && h < best && h > -0.05) {
            vec3 sil = mix(vec3(0.21, 0.22, 0.27), vec3(0.40, 0.35, 0.37), toward * 0.35);
            vec3 bc = mix(sil, haze, depth); bc = mix(bc, low, depth * 0.5);
            float fh = 0.0032 + wlHash(vec2(bcell, 5.0)) * 0.0024, cols = 5.0 + floor(wlHash(vec2(bcell, 7.0)) * 8.0);
            vec2 wc = vec2(floor(bfx * cols), floor(h / fh)), wf = vec2(fract(bfx * cols), fract(h / fh));
            float dens = 0.05 + wlHash(vec2(bcell, 3.0)) * 0.3, cluster = step(0.45, wlHash(floor(wc / vec2(3.0, 4.0)) + vec2(bcell, bcell * 0.37)));
            float lit = step(1.0 - dens * (0.4 + cluster), wlHash(wc + vec2(bcell * 1.7, bcell))) * step(0.004, h) * step(h, best - 0.004) * step(0.2, wf.x) * step(wf.x, 0.8) * step(0.25, wf.y) * step(wf.y, 0.75);
            c = mix(bc, vec3(1.0, 0.76, 0.48), lit * (1.0 - depth) * 0.8);
          }
        }
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * (pow(s, 10.0) * 0.22 + pow(s, 90.0) * 0.55);
        /* the disc: round on the screen wherever it is in the frame (a wide lens stretches a disc measured by angle into an oval near the
           edges); the reflection's sky, with no screen, measures it by angle */
        float disc = sunPx.z > 0.5 ? smoothstep(sunPx.w, sunPx.w * 0.6, length(gl_FragCoord.xy - sunPx.xy)) : smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.6, s);
        c += sunCol * disc * 6.0;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = -1; return mesh;
}
