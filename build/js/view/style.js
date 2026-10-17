/* THE TWO LOOKS. "real": lit by the sun and the sky's reflection (MeshStandardMaterial everywhere). "painted": the same scene drawn as a
 * graphic picture — light in a few hard bands, an ink line round every form (the skater's from her own skin, the world's from the depth of
 * the picture), the colours flatter and bolder. One switch swaps every material in place, so a picture of each is the same scene and camera. */
import * as THREE from '../../vendor/three/build/three.module.min.js';
import { LOOK } from '../config.js';

const ramps = {};
function ramp(bands) {
  const key = bands.join(','); if (ramps[key]) return ramps[key];
  const data = new Uint8Array(bands.length * 4); bands.forEach((b, i) => { const v = Math.round(b * 255); data.set([v, v, v, 255], i * 4); });
  const t = new THREE.DataTexture(data, bands.length, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return (ramps[key] = t);
}
/* a material's painted twin: the same colours, maps and hooks, its light in bands; normal maps are left off (a band that flickers with every
   bump of the concrete is noise, not light) */
function twin(m) {
  if (m.userData.painted) return m.userData.painted;
  if (!(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) return m;
  const t = new THREE.MeshToonMaterial({ color: m.color.clone(), map: m.map, aoMap: m.aoMap, aoMapIntensity: m.aoMapIntensity, vertexColors: m.vertexColors, emissive: m.emissive.clone(), emissiveMap: m.emissiveMap,
    emissiveIntensity: m.emissiveIntensity, alphaTest: m.alphaTest, side: m.side, transparent: m.transparent, opacity: m.opacity, gradientMap: ramp(m.userData.bands || LOOK.painted.bands) });
  t.onBeforeCompile = m.onBeforeCompile; t.customProgramCacheKey = () => 'painted:' + (m.customProgramCacheKey ? m.customProgramCacheKey() : '') + ':' + String(m.onBeforeCompile);
  t.userData = Object.assign({}, m.userData, { real: m });
  m.userData.painted = t; return t;
}
/* swap every mesh under `root` to the look named; the stage's light and ink follow */
export function applyStyle(root, stage, name) {
  root.traverse((o) => {
    if (!o.isMesh || o.userData.keepLook) return;
    if (o.name === 'juno:ink') { o.visible = name === 'painted'; return; }
    const real = o.userData.realMaterial || o.material; o.userData.realMaterial = real;
    o.material = name === 'painted' ? (Array.isArray(real) ? real.map(twin) : twin(real)) : real;
  });
  stage.setLook(name);
}
