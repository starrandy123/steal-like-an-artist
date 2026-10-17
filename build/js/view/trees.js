/* TREES AND GRASS, DRAWN IN CODE: a leaf cluster and a tuft of blades painted on canvases at boot (alpha, no image files); a tree is a
 * tapered trunk that leans and branches, and a crown of leaf cards gathered in lobes at the branch tips — each card's normal points out of
 * the crown so the crown is lit like a mass and not like paper, darker inside, warmer where the low sun reaches. Everything sways with one
 * clock (`wind.value`). Three tree shapes, instanced over the 22 places round the park; tufts in the grass outside the fence. */
import * as THREE from '../../vendor/three/build/three.module.min.js';

const rngOf = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/* a cluster of leaves, four variants in a 2×2 atlas */
function leafTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), r = rngOf(17);
  for (let q = 0; q < 4; q++) {
    const ox = (q % 2) * S / 2, oy = Math.floor(q / 2) * S / 2, cx = ox + S / 4, cy = oy + S / 4;
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * S * 0.2, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.9, L = 16 + r() * 14, W = L * (0.36 + r() * 0.12), rot = r() * Math.PI * 2;
      const g = 70 + r() * 70, tone = 0.75 + r() * 0.35;
      x.save(); x.translate(px, py); x.rotate(rot);
      x.fillStyle = 'rgb(' + Math.round((52 + r() * 40) * tone) + ',' + Math.round((g + 30) * tone) + ',' + Math.round((28 + r() * 22) * tone) + ')';
      x.beginPath(); x.moveTo(-L / 2, 0); x.quadraticCurveTo(0, -W, L / 2, 0); x.quadraticCurveTo(0, W, -L / 2, 0); x.fill();
      x.strokeStyle = 'rgba(30,45,15,0.55)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-L / 2, 0); x.lineTo(L / 2, 0); x.stroke();
      x.fillStyle = 'rgba(220,235,160,0.18)'; x.beginPath(); x.moveTo(-L / 2, 0); x.quadraticCurveTo(0, -W, L / 2, 0); x.quadraticCurveTo(0, -W * 0.3, -L / 2, 0); x.fill();
      x.restore();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/* a tuft: blades fanning from one root, light at the tips */
function tuftTexture() {
  const W = 256, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), r = rngOf(5);
  for (let i = 0; i < 46; i++) {
    const bx = W / 2 + (r() - 0.5) * 70, lean = (r() - 0.5) * 120, h = 120 + r() * 120, w = 3 + r() * 4, gr = 90 + r() * 70;
    const grad = x.createLinearGradient(0, H, 0, H - h); grad.addColorStop(0, 'rgb(98,' + Math.round(gr * 0.95) + ',54)'); grad.addColorStop(1, 'rgb(' + Math.round(165 + r() * 50) + ',' + Math.round(gr + 60) + ',' + Math.round(70 + r() * 30) + ')');
    x.fillStyle = grad; x.beginPath(); x.moveTo(bx - w, H); x.quadraticCurveTo(bx + lean * 0.4, H - h * 0.6, bx + lean, H - h); x.quadraticCurveTo(bx + lean * 0.4 + w * 0.6, H - h * 0.6, bx + w, H); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/* the wind, for every material that sways: a world-space sway that grows with height above the base */
function windy(mat, wind, amp) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uWind = wind;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind; attribute float sway;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec4 wp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wp = instanceMatrix * wp;
          #endif
          float ph = dot(wp.xz, vec2(0.21, 0.17)), s = sway * ${amp.toFixed(3)};
          transformed.x += (sin(uWind * 1.3 + ph) * 0.7 + sin(uWind * 2.9 + ph * 2.3) * 0.3) * s;
          transformed.z += (cos(uWind * 1.1 + ph * 1.4) * 0.6 + sin(uWind * 3.3 + ph) * 0.25) * s; }`);
  };
  mat.customProgramCacheKey = () => 'windy:' + amp;
  return mat;
}
/* a tube along a curve whose radius falls from r0 to r1 */
function limb(curve, r0, r1, seg = 6, rad = 7) {
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { const ring = Math.floor(i / (rad + 1)), t = ring / seg; curve.getPointAt(Math.min(1, t), c); v.fromBufferAttribute(p, i).sub(c).multiplyScalar(r0 + (r1 - r0) * t).add(c); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
function merge(geos) {
  let n = 0, m = 0; for (const g of geos) { n += g.attributes.position.count; m += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), sway = new Float32Array(n), col = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = []; let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3); nrm.set(g.attributes.normal.array, o * 3);
    if (g.attributes.sway) sway.set(g.attributes.sway.array, o); if (g.attributes.color) col.set(g.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + g.attributes.position.count) * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    if (g.index) for (const k of g.index.array) idx.push(k + o); else for (let k = 0; k < g.attributes.position.count; k++) idx.push(k + o);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); out.setAttribute('sway', new THREE.BufferAttribute(sway, 1)); out.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); out.setIndex(idx);
  out.computeBoundingSphere(); return out;
}
/* one tree shape: { wood, leaves } geometries, 1 unit = 1 m, base at the origin */
function treeShape(seed, height, crownR) {
  const r = rngOf(seed), V = THREE.Vector3;
  const lean = new V((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5), top = new V(lean.x, height * 0.62, lean.z);
  const trunk = new THREE.QuadraticBezierCurve3(new V(0, -0.1, 0), new V(lean.x * 0.2 + (r() - 0.5) * 0.25, height * 0.3, lean.z * 0.2), top);
  const wood = [limb(trunk, 0.2, 0.1, 8, 8)];
  const sw = (g, k) => { const a = new Float32Array(g.attributes.position.count); for (let i = 0; i < a.length; i++) a[i] = Math.max(0, g.attributes.position.getY(i) - height * 0.35) * k; g.setAttribute('sway', new THREE.BufferAttribute(a, 1)); return g; };
  const lobes = [];
  const nb = 5 + Math.floor(r() * 2);
  for (let i = 0; i < nb; i++) {
    const a = i / nb * Math.PI * 2 + r() * 0.6, from = trunk.getPointAt(0.62 + r() * 0.3), out = crownR * (0.55 + r() * 0.35);
    const tip = new V(top.x + Math.cos(a) * out, height * (0.68 + r() * 0.18), top.z + Math.sin(a) * out);
    const mid = from.clone().lerp(tip, 0.5).add(new V(0, 0.25 + r() * 0.3, 0));
    wood.push(limb(new THREE.QuadraticBezierCurve3(from, mid, tip), 0.075, 0.03, 5, 6));
    lobes.push({ c: tip, r: crownR * (0.48 + r() * 0.2) });
  }
  lobes.push({ c: new V(top.x, height * 0.9, top.z), r: crownR * 0.62 }, { c: new V(top.x + (r() - 0.5) * 0.6, height * 0.78, top.z + (r() - 0.5) * 0.6), r: crownR * 0.55 });
  /* the crown's centre and size, for the cards' normals and their shade */
  const C = new V(); lobes.forEach((l) => C.add(l.c)); C.multiplyScalar(1 / lobes.length);
  const cards = [], q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const l of lobes) {
    const n = 26 + Math.floor(r() * 10);
    for (let i = 0; i < n; i++) {
      const u = r(), vv = r(), th = u * Math.PI * 2, ph = Math.acos(2 * vv - 1), rr = l.r * Math.cbrt(0.25 + 0.75 * r());
      const p = new V(Math.sin(ph) * Math.cos(th), Math.cos(ph) * 0.8, Math.sin(ph) * Math.sin(th)).multiplyScalar(rr).add(l.c);
      const size = 0.75 + r() * 0.45, g = new THREE.PlaneGeometry(size, size);
      const atlas = Math.floor(r() * 4), uvA = g.attributes.uv; for (let k = 0; k < uvA.count; k++) uvA.setXY(k, (atlas % 2) * 0.5 + uvA.getX(k) * 0.5, Math.floor(atlas / 2) * 0.5 + uvA.getY(k) * 0.5);
      g.applyQuaternion(q.setFromEuler(e.set(r() * Math.PI, r() * Math.PI, r() * Math.PI))); g.translate(p.x, p.y, p.z);
      /* the card's normals point out of the crown; its shade darkens toward the inside, its top lighter */
      const pa = g.attributes.position, na = g.attributes.normal, col = new Float32Array(pa.count * 3), swa = new Float32Array(pa.count), w = new V();
      for (let k = 0; k < pa.count; k++) {
        w.fromBufferAttribute(pa, k); const out = w.clone().sub(C); const d = out.length(); out.normalize(); na.setXYZ(k, out.x, out.y, out.z);
        const inner = Math.min(1, d / (crownR * 1.15)), lift = Math.min(1, Math.max(0, (w.y - (C.y - crownR)) / (crownR * 2)));
        const k1 = 0.45 + 0.55 * inner, k2 = 0.85 + 0.25 * lift; col.set([k1 * k2, k1 * k2, k1 * k2 * 0.95], k * 3); swa[k] = 0.04 + 0.06 * Math.max(0, w.y - height * 0.4) / height;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('sway', new THREE.BufferAttribute(swa, 1));
      cards.push(g);
    }
  }
  return { wood: merge(wood.map((g) => sw(g, 0.012))), leaves: merge(cards), top: top.clone() };
}

/* the shapes, built once and shared by what is drawn and by the camera's sight rule (greenery, below) */
let SHAPES = null;
const shapes = () => SHAPES || (SHAPES = keep({ trees: [treeShape(11, 6.2, 1.9), treeShape(23, 7.4, 2.2), treeShape(37, 5.4, 1.7)], bush: treeShape(5, 1.0, 0.5).leaves }));
/* made once and kept for every park (parkview.js dispose lets go of everything else) */
const keep = (S) => { for (const t of S.trees) { t.wood.userData.shared = true; t.leaves.userData.shared = true; } S.bush.userData.shared = true; return S; };
/* where the trees stand round the park: the list in config (TREES), each a size and a turn of its own */
export const treePlaces = (trees) => trees.map(([x, z], i) => ({ x, z, scale: 0.9 + ((x * 3.1 + z * 5.7) % 1.2) * 0.25, rot: i * 2.39 }));
/* how a planter's shrub is placed: on the soil, sunk a little, turned, sized by its k */
const shrubAt = (m, [x, y, z, k], i, q, s, p, Y) => m.compose(p.set(x, y - 0.55 * k, z), q.setFromAxisAngle(Y, i * 1.7), s.setScalar(k * 1.1));
/* THE GREENERY THE CAMERA MUST SEE ROUND (view/sightline.js occluders): each tree's trunk (a capsule up its middle) and crown (the sphere
   round its leaf cards) and each planter shrub (the sphere round its leaves) — from the very shapes and the very placing the view draws */
export function greenery(trees, shrubs = []) {
  const S = shapes(), out = [], m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), c = new THREE.Vector3();
  const sphere = (geo) => { if (!geo.boundingSphere) geo.computeBoundingSphere(); return geo.boundingSphere; };
  treePlaces(trees).forEach((t, i) => {
    const sh = S.trees[i % S.trees.length]; m.compose(p.set(t.x, 0, t.z), q.setFromAxisAngle(Y, t.rot), s.setScalar(t.scale));
    const bw = sphere(sh.wood), bl = sphere(sh.leaves);
    if (!sh.wood.boundingBox) sh.wood.computeBoundingBox();
    const top = c.set(sh.top.x, sh.top.y, sh.top.z).applyMatrix4(m).toArray();
    out.push({ kind: 'cap', a: [t.x, 0, t.z], b: top, r: 0.2 * t.scale, what: 'trunk' });
    c.copy(bl.center).applyMatrix4(m); out.push({ kind: 'sph', x: c.x, y: c.y, z: c.z, r: bl.radius * t.scale, what: 'crown' });
    void bw;
  });
  shrubs.forEach((sb, i) => { shrubAt(m, sb, i, q, s, p, Y); const b = sphere(S.bush); c.copy(b.center).applyMatrix4(m); out.push({ kind: 'sph', x: c.x, y: c.y, z: c.z, r: b.radius * sb[3] * 1.1, what: 'shrub' }); });
  return out;
}
export function buildTrees(root, places, opts = {}) {
  const wind = { value: 0 }, leafTex = leafTexture(), tuftTex = tuftTexture();
  const leafMat = windy(new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 0.78, metalness: 0 }), wind, 1.0);
  const barkMat = windy(new THREE.MeshStandardMaterial({ color: 0x5f554a, roughness: 0.95, metalness: 0 }), wind, 1.0);
  const leafDepth = windy(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafTex, alphaTest: 0.45 }), wind, 1.0);
  const forms = shapes().trees;
  let tris = 0;
  const buckets = forms.map(() => []);
  places.forEach((t, i) => buckets[i % forms.length].push(t));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  forms.forEach((sh, k) => {
    const list = buckets[k]; if (!list.length) return;
    const wood = new THREE.InstancedMesh(sh.wood, barkMat, list.length), leaves = new THREE.InstancedMesh(sh.leaves, leafMat, list.length);
    list.forEach((t, i) => { m.compose(p.set(t.x, 0, t.z), q.setFromAxisAngle(Y, t.rot || i * 2.39), s.setScalar(t.scale || 1)); wood.setMatrixAt(i, m); leaves.setMatrixAt(i, m); });
    wood.castShadow = leaves.castShadow = true; wood.receiveShadow = leaves.receiveShadow = true; leaves.customDepthMaterial = leafDepth;
    wood.name = 'trees:wood'; leaves.name = 'trees:leaves'; root.add(wood, leaves);
    tris += (sh.wood.index.count + sh.leaves.index.count) / 3 * list.length;
  });
  /* tufts in the grass outside the fence: two crossed cards each, swaying at the tips */
  const tuftMat = windy(new THREE.MeshStandardMaterial({ map: tuftTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, metalness: 0, vertexColors: true }), wind, 1.0);
  const tuft = (() => { const a = new THREE.PlaneGeometry(0.55, 0.42); a.translate(0, 0.21, 0); const b = a.clone(); b.rotateY(Math.PI / 2); const g = merge([a, b]);
    const pa = g.attributes.position, sw = g.attributes.sway, col = g.attributes.color, na = g.attributes.normal; for (let k = 0; k < pa.count; k++) { const y = pa.getY(k); sw.setX(k, y > 0.2 ? 0.06 : 0); const c = 0.8 + y * 0.6; col.setXYZ(k, c, c, c); na.setXYZ(k, 0, 1, 0); } return g; })();
  const R = rngOf(99), spots = [];
  for (let i = 0; i < (opts.tufts ?? 1400); i++) {
    const side = Math.floor(R() * 4), out = 0.6 + Math.pow(R(), 1.6) * 11, along = R();
    /* every tuft wholly outside the fence (a card is up to 0.39 m across its middle): the grass never pokes into the park */
    let x, z; if (side === 0) { x = -0.3 - out; z = -6 + along * 58; } else if (side === 1) { x = 62.3 + out; z = -6 + along * 58; } else if (side === 2) { z = 44.3 + out; x = -10 + along * 82; } else { z = -0.7 - out * 0.25; x = -10 + along * 82; }
    if (side === 3 && z < -2.6) continue;                                          // the street and the pavement to the south
    if (Math.abs(z - 46.6) < 0.7 || Math.abs(x + 2.4) < 0.7 || Math.abs(x - 64.6) < 0.7) continue;   // the worn paths
    spots.push([x, z, 0.6 + R() * 0.8, R() * Math.PI]);
  }
  const tufts = new THREE.InstancedMesh(tuft, tuftMat, spots.length);
  spots.forEach(([x, z, k, a], i) => { m.compose(p.set(x, 0, z), q.setFromAxisAngle(Y, a), s.set(k, k * (0.8 + (i % 5) * 0.08), k)); tufts.setMatrixAt(i, m); });
  tufts.receiveShadow = true; tufts.name = 'grass:tufts'; root.add(tufts); tris += spots.length * 4;
  /* the planter's shrubs: small crowns of the same leaves */
  const bushShape = shapes().bush;
  if (opts.shrubs && opts.shrubs.length) {
    const bush = new THREE.InstancedMesh(bushShape, leafMat, opts.shrubs.length);
    opts.shrubs.forEach((sb, i) => { shrubAt(m, sb, i, q, s, p, Y); bush.setMatrixAt(i, m); });
    bush.castShadow = true; bush.receiveShadow = true; bush.customDepthMaterial = leafDepth; bush.name = 'shrubs'; root.add(bush); tris += bushShape.index.count / 3 * opts.shrubs.length;
  }
  return { wind, tris, textures: [leafTex, tuftTex] };
}
