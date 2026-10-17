/* WHAT THE PARK LOOKS LIKE: the geometry the generators made, in the surfaces painted at boot; the coping and the rails as real tubes on
 * posts; the planters' shrubs; the fence; trees at the edges; lamp posts; the street to the south and the city beyond, in the haze. */
import * as THREE from '../../vendor/three/build/three.module.min.js';
import { SURF, DETAIL, makeBaker, bakeGrime, parkMaterial, paintMaterial } from './surfaces.js';
import { buildTrees, treePlaces } from './trees.js';
import { fenceSegments } from '../sim/park.js';
import { GLTFLoader } from '../../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../vendor/three/examples/jsm/utils/BufferGeometryUtils.js';
import { propMatrix } from '../sim/props.js';

export function buildParkView(stage, world, ledger, progress) {
  const scene = stage.scene, tier = stage.tier, renderer = stage.renderer;
  const bake = makeBaker(renderer), size = tier.tex, small = Math.max(256, size / 2);
  /* the surfaces are the same in every park: painted once a stage, and a second park's view reads the same textures (kept on the stage) */
  const B = stage.baked || (stage.baked = {});
  const order = [['slab', Math.max(size, 1024)], ['pavers', Math.max(size, 1024)], ['ramp', size], ['wall', small], ['granite', size], ['metal', small], ['coping', 256], ['grass', size], ['wood', 256], ['fence', 256]];
  for (const [name, s] of order) { if (!B[name]) B[name] = bake(SURF[name], s, name === 'fence'); ledger.set('tex:' + name, B[name].bytes, s + '² ×3'); if (progress) progress(name); }
  /* THE WEIGHT LEDGER'S ROWS THIS VIEW PUTS THERE (its grime, its geometry, the surfaces it painted for itself, its backdrop and props) are its
     own: its dispose takes each out while it is still this view's row — the next park's view, built first, may hold the same name. The
     stage's painted surfaces stay the stage's rows. (10-17: a switch had dropped every 'geo:' row, Juno's too, and kept Kiln Yard's asphalt) */
  const rows = new Map(); let gone = false;
  const own = (n, b, w) => { if (gone) return; ledger.set(n, b, w); rows.set(n, ledger.rows.get(n)); };
  const grime = bakeGrime(renderer, world, tier.grime); own('tex:grime', grime.bytes, tier.grime + '²');
  const detail = B.detail || (B.detail = bake(DETAIL, 256)); ledger.set('tex:detail', detail.bytes, '256² ×3');
  /* a surface only some parks have is the view's own: painted when its park is built, let go with it (the Plaza never carries Kiln Yard's
     asphalt) */
  const ownSurf = {};
  if (world.geo.asphalt) { ownSurf.asphalt = bake(SURF.asphalt, size); own('tex:asphalt', ownSurf.asphalt.bytes, size + '² ×3'); if (progress) progress('asphalt'); }
  bake.dispose();   // its full-screen triangle: the bakes are done
  const M = {
    slab: parkMaterial(B.slab, SURF.slab.tile, grime, { detail, marks: true }), pavers: parkMaterial(B.pavers, SURF.pavers.tile, grime, { detail, detailAmt: 0.7, marks: true }), deck: parkMaterial(B.slab, 3, grime, { detail, marks: true }),
    ramp: parkMaterial(B.ramp, SURF.ramp.tile, grime, { env: 0.8, detail, detailAmt: 0.8, marks: true }), wall: parkMaterial(B.wall, SURF.wall.tile, grime, { detail, detailAmt: 0.6 }), granite: parkMaterial(B.granite, SURF.granite.tile, grime, { env: 0.9 }),
    steel: parkMaterial(B.metal, SURF.metal.tile, null, { env: 1.2 }), curb: parkMaterial(B.slab, 1.2, grime, { color: 0xd06050 }), wood: parkMaterial(B.wood, 1.0, null),
    grass: parkMaterial(B.grass, SURF.grass.tile, null, { normal: 0.6, field: true }), soil: parkMaterial(B.grass, 1.0, null, { color: 0x7a5c40 }),
    fence: parkMaterial(B.fence, SURF.fence.tile, null, { alphaTest: 0.5, side: THREE.DoubleSide, env: 1.0 }),
  };
  if (ownSurf.asphalt) M.asphalt = parkMaterial(ownSurf.asphalt, SURF.asphalt.tile, grime, { marks: true, normal: 0.9 });
  const root = new THREE.Group(); root.name = 'park'; scene.add(root);
  let tris = 0;
  for (const [mat, g] of Object.entries(world.geo)) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nrm, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
    geo.setIndex(g.idx); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, M[mat] || M.slab); mesh.receiveShadow = true; mesh.castShadow = mat !== 'grass' && mat !== 'fence' && mat !== 'slab' && mat !== 'pavers' && mat !== 'asphalt';   // ground does not cast (10-17: the asphalt apron, casting, shaded itself 7× dark)
    if (mat === 'fence') { mesh.castShadow = true; mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: B.fence.map, alphaTest: 0.5 }); }
    mesh.name = 'park:' + mat; root.add(mesh); tris += g.idx.length / 3;
    own('geo:' + mat, g.pos.length * 4 * 2 + g.uv.length * 4 + g.idx.length * 4);
  }
  /* THE PARK'S PAINT (its `paint` rows: a line, or a hatch made of lines): flat quads at the ground's height, one mesh a colour (one draw).
     Each quad is 0.6 m wider and longer than its stroke on every side: a pixel's share of the stroke is spread over the pixel's footprint on
     the ground, and a pixel whose centre the quad does not reach is never drawn — at 20–30 m and grazing that footprint is 0.3–1 m, and a
     15 cm margin cut the far bays' light (10-17, tests/drive/surface_alias.mjs; view/surfaces.js paintMaterial) */
  const PAINT = { yellow: 0xd9ad2b, white: 0xe6e3da }, strokes = {};
  for (const row of world.data.paint || []) for (const st of paintStrokes(row)) (strokes[row.color] = strokes[row.color] || []).push(st);
  for (const [color, list] of Object.entries(strokes)) {
    const pos = [], line = [], nrm = [], idx = [];
    for (const { a, b, w } of list) {
      const y = [a, b].map(([x, z]) => { const h = world.groundAt(x, 10, z, 12); return h ? h.point[1] : 0; });
      if (Math.abs(y[0] - y[1]) > 0.01) throw new Error(`a paint stroke from ${a} to ${b} crosses a level (${y[0]} → ${y[1]})`);
      const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), tx = dx / L, tz = dz / L, hw = w / 2, hl = L / 2, mw = hw + 0.6, ml = hl + 0.6, cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, k = pos.length / 3;
      for (const [s, t] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { pos.push(cx - tz * s * mw + tx * t * ml, y[0], cz + tx * s * mw + tz * t * ml); line.push(s * mw, t * ml, hw, hl); nrm.push(0, 1, 0); }
      /* faced up: the triangle's normal points to +y (the corners' order depends on the stroke's direction) */
      const c = (i) => [pos[(k + i) * 3], pos[(k + i) * 3 + 2]], [p0, p1, p2] = [c(0), c(1), c(2)], up = (p1[1] - p0[1]) * (p2[0] - p0[0]) - (p1[0] - p0[0]) * (p2[1] - p0[1]) > 0;
      idx.push(...(up ? [k, k + 1, k + 2, k, k + 2, k + 3] : [k, k + 2, k + 1, k, k + 3, k + 2]));
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    geo.setAttribute('line', new THREE.Float32BufferAttribute(line, 4)); geo.setIndex(idx); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, paintMaterial(PAINT[color] ?? color, grime)); mesh.name = 'paint:' + color; mesh.receiveShadow = true; root.add(mesh);
    tris += idx.length / 3; own('geo:paint:' + color, pos.length * 4 * 2 + line.length * 4 + idx.length * 4);
  }
  /* the coping and the rails: tubes with a seam you can see (uv.y 0.5 is the top, where the trucks wear the paint off) */
  const copingMat = parkMaterial(B.coping, 1.0, null, { env: 1.5 }), railMat = M.steel;
  for (const r of world.rails) {
    if (r.kind === 'coping' && !r.bare) root.add(Object.assign(copingTube(r, copingMat), { name: 'coping' }));   // (a bare concrete edge has no tube)
    else if (r.kind === 'rail') { root.add(Object.assign(tube(r.pts, 0.024, false, railMat, 10), { name: 'rail' })); for (const pt of [r.pts[0], r.pts[r.pts.length - 1]]) root.add(post(world, pt, railMat)); }
  }
  /* the fence: posts every 2.5 m and a top rail */
  const fpost = new THREE.CylinderGeometry(0.03, 0.03, 2.05, 8); fpost.translate(0, 1.025, 0);
  const fp = [];
  /* each run of the fence stands on its own ground (sim/park.js fenceSegments: the decks are higher than the plaza) */
  for (const [[x0, z0], [x1, z1], gy] of fenceSegments(world.data)) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 2.5));
    for (let i = 0; i <= n; i++) fp.push([x0 + (x1 - x0) * i / n, gy, z0 + (z1 - z0) * i / n]);
    root.add(Object.assign(tube([[x0, gy + 2.03, z0], [x1, gy + 2.03, z1]], 0.022, false, railMat, 8), { name: 'fence:top rail' }));
  }
  const posts = new THREE.InstancedMesh(fpost, railMat, fp.length); posts.name = 'fence:posts'; const mtx = new THREE.Matrix4();
  fp.forEach(([x, y, z], i) => posts.setMatrixAt(i, mtx.makeTranslation(x, y, z))); posts.castShadow = true; root.add(posts);
  /* trees round the park: branching trunks and leaf-card crowns that sway; tufts in the grass; the planter's shrubs */
  const places = treePlaces(world.trees);
  const greens = buildTrees(root, places, { shrubs: world.props.shrubs, tufts: world.data.tufts });
  tris += greens.tris;
  /* lamp posts at the edges of the plaza */
  const lampG = new THREE.CylinderGeometry(0.05, 0.07, 6, 8); lampG.translate(0, 3, 0); const headG = new THREE.BoxGeometry(0.7, 0.12, 0.25); headG.translate(0.3, 6, 0);
  const lampM = new THREE.MeshStandardMaterial({ color: 0x3b3d40, roughness: 0.6, metalness: 0.6 });
  for (const [x, z, a] of world.data.lamps) { const g = new THREE.Group(); g.add(Object.assign(new THREE.Mesh(lampG, lampM), { name: 'lamp:pole' }), Object.assign(new THREE.Mesh(headG, lampM), { name: 'lamp:head' })); g.position.set(x, 0, z); g.rotation.y = a; g.children.forEach((c) => { c.castShadow = true; }); root.add(g); }
  /* the street to the south: asphalt, a curb, a pavement (where the park has one: the Plaza's `street`) */
  const S = world.data.street;
  if (S) {
  const street = new THREE.Mesh(new THREE.PlaneGeometry(240, 9), new THREE.MeshStandardMaterial({ color: 0x55524f, roughness: 0.95 })); street.name = 'street';
  street.rotation.x = -Math.PI / 2; street.position.set(S.x, 0.005, S.z); street.receiveShadow = true; root.add(street);
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(240, 4), parkMaterial(B.pavers, 2.4, null)); pave.name = 'pavement'; pave.rotation.x = -Math.PI / 2; pave.position.set(S.x, 0.01, S.pavement); pave.receiveShadow = true; root.add(pave);
  }
  own('geo:dressing', 600000);
  /* the ground the buildings round a park stand on, where it is lower than the park (its `dressing.boxes`: [x0, z0, x1, z1, y0, y1], all
     outside the fence): concrete, drawn only, one mesh */
  const DB = world.data.dressing && world.data.dressing.boxes;
  if (DB && DB.length) {
    const g = mergeGeometries(DB.map(([x0, z0, x1, z1, y0, y1]) => { const b = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); b.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      const uv = b.attributes.uv, p = b.attributes.position, n = b.attributes.normal; for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)) > 0.5; uv.setXY(i, ax ? p.getZ(i) : p.getX(i), p.getY(i)); } return b; }));
    const plinth = new THREE.Mesh(g, M.wall); plinth.name = 'dressing:plinths'; plinth.receiveShadow = true; root.add(plinth); tris += g.index.count / 3;
  }
  /* THE BUILDINGS ROUND A PARK (its `backdrop`: a GLB of its own — sources/props, Poly Haven's CC0 kits through the Blender MCP — drawn only, all
     outside the fence: tests/backdrop.mjs). Loaded before the park is shown (`ready`); what it holds goes in the ledger */
  const view = { root, materials: M, tris, baked: B, grime, wind: greens.wind, ready: Promise.resolve() };
  if (world.data.backdrop) {
    view.ready = new GLTFLoader().loadAsync(world.data.backdrop.file).then((gl) => {
      const s = gl.scene, seen = new Set(); let bytes = 0;
      s.name = 'backdrop';
      s.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = false; o.receiveShadow = true; o.name = 'backdrop:' + o.name;
        const ge = o.geometry; for (const a of Object.values(ge.attributes)) bytes += a.array.byteLength; if (ge.index) { bytes += ge.index.array.byteLength; view.tris += ge.index.count / 3; }
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          m.userData.own = true;
          /* glass is opaque glass (it takes the sky in its reflection); a broken pane is cut by its alpha, never blended (no sorting against
             the park), and shows the dark inside behind it */
          if (/glass/i.test(m.name)) { m.transparent = false; m.alphaTest = 0; m.opacity = 1; m.alphaMap = null; m.roughness = 0.12; m.metalness = 0; m.envMapIntensity = 1.1; }
          else if (m.transparent || m.alphaMap) { m.transparent = false; m.alphaTest = 0.5; m.depthWrite = true; }
          for (const k of ['map', 'alphaMap']) { const t = m[k]; if (t && !seen.has(t)) { seen.add(t); t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); bytes += t.image.width * t.image.height * 4 * 4 / 3; } }
        }
      });
      root.add(s); own('geo:backdrop', bytes, world.data.backdrop.file);
    }).catch((e) => { console.warn('[waxline] the buildings round the park did not load:', e && e.message); });   // the park is skated without them
  }
  /* A PARK'S PROPS (its `props` rows, drawn from its `propsFile`): one instanced mesh a kind, each placed by the same transform the collision
     takes (sim/props.js) — what is drawn is what the board meets */
  if (world.data.props && world.data.props.length) {
    const kinds = [...new Set(world.data.props.map((r) => r.kind))];
    view.ready = Promise.all([view.ready, new GLTFLoader().loadAsync(world.data.propsFile).then((gl) => {
      let bytes = 0; const seen = new Set();
      for (const kind of kinds) {
        let src = null; gl.scene.traverse((o) => { if (o.isMesh && o.name.replace(/\.\d+$/, '') === 'prop_' + kind) src = o; });
        if (!src) { console.warn('[waxline] no mesh for the prop', kind); continue; }
        const rows = world.data.props.filter((r) => r.kind === kind), im = new THREE.InstancedMesh(src.geometry, src.material, rows.length), m4 = new THREE.Matrix4();
        rows.forEach((r, i) => im.setMatrixAt(i, m4.fromArray(propMatrix(r))));
        im.castShadow = true; im.receiveShadow = true; im.name = 'prop:' + kind; root.add(im); view.tris += src.geometry.index.count / 3 * rows.length;
        for (const a of Object.values(src.geometry.attributes)) bytes += a.array.byteLength; bytes += src.geometry.index.array.byteLength;
        for (const m of Array.isArray(src.material) ? src.material : [src.material]) { m.userData.own = true; if (m.map && !seen.has(m.map)) { seen.add(m.map); bytes += m.map.image.width * m.map.image.height * 4 * 4 / 3; } }
      }
      own('geo:props', bytes, world.data.propsFile);
    }).catch((e) => { console.warn('[waxline] the props did not load:', e && e.message); })]);
  }
  /* A PARK'S VIEW LETS GO OF ALL IT MADE (a switch of park: the supervisor's weigh after 1 → 2 → 1 → 2): every geometry it made (the trees'
     shared shapes stay: trees.js keeps them for every park), every material, its grime and its leaves' textures; the painted surfaces stay
     on the stage for the next park */
  const dispose = () => {
    const mats = new Set();
    root.traverse((o) => { if (o.geometry && !(o.geometry.userData && o.geometry.userData.shared)) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => mats.add(x)); if (o.customDepthMaterial) mats.add(o.customDepthMaterial); if (o.isInstancedMesh) o.dispose(); });
    /* a backdrop's materials own their textures (the park's materials read the stage's painted surfaces, which stay) */
    mats.forEach((m) => { if (m.userData && m.userData.own) for (const k of ['map', 'alphaMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) if (m[k]) m[k].dispose(); m.dispose(); }); grime.target.dispose(); greens.textures.forEach((t) => t.dispose());
    for (const o of Object.values(ownSurf)) o.targets.forEach((t) => t.dispose());   // the surfaces this park painted for itself
    gone = true; for (const [n, r] of rows) if (ledger.rows.get(n) === r) ledger.rows.delete(n);   // its rows in the weight ledger
    scene.remove(root);
  };
  view.dispose = dispose;
  return view;
}

/* a paint row's strokes, each { a: [x, z], b: [x, z], w }: a line is one; a hatch is its border and its stripes at `angle`° every `spacing` m,
   each stripe cut to the rectangle (its cut ends under the border) */
export function paintStrokes(row) {
  const w = row.width || 0.1;
  if (row.line) return [{ a: row.line[0], b: row.line[1], w }];
  if (!row.hatch) return [];
  const [x0, z0, x1, z1] = row.hatch, out = [[[x0, z0], [x1, z0]], [[x1, z0], [x1, z1]], [[x1, z1], [x0, z1]], [[x0, z1], [x0, z0]]].map(([a, b]) => ({ a, b, w }));
  const an = (row.angle == null ? 45 : row.angle) * Math.PI / 180, d = [Math.cos(an), Math.sin(an)], n = [-d[1], d[0]], sp = row.spacing || 0.6;
  const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], off = corners.map(([x, z]) => x * n[0] + z * n[1]), lo = Math.min(...off), hi = Math.max(...off);
  for (let o = lo + sp / 2; o < hi; o += sp) {
    /* the line {p · n = o} cut to the rectangle: its two crossings of the rectangle's edges */
    const pts = [];
    for (let i = 0; i < 4; i++) { const p = corners[i], q = corners[(i + 1) % 4], fp = off[i] - o, fq = off[(i + 1) % 4] - o; if ((fp <= 0) !== (fq <= 0)) { const t = fp / (fp - fq); pts.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } }
    if (pts.length === 2 && Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) > w) out.push({ a: pts[0], b: pts[1], w });
  }
  return out;
}

/* THE COPING AS DRAWN: a pipe whose TOP is the coping's line — the line the trucks grind and the deck rests on (THE ONE EDGE, sim/park.js
   COPING_TOP), its solid lip under it, the pipe standing out over the transition (10-16, the supervisor: drawn 2.2 cm over that line, the pipe
   showed through the trucks and the deck on every coping grind and every drop-in). Walled: tests/park.mjs */
export const COPING_R = 0.034;
export function copingTube(r, mat) { return tube(r.pts, COPING_R, r.loop, mat, 12); }
/* a tube along a polyline, its TOP on the line (the trucks ride the top), uv.x in metres along it and uv.y around it (0.5 = top) */
function tube(pts, r, loop, mat, seg) {
  /* a loop closes on its first point once (the Basin's rim already ends on it: closed again, its last ring had no direction and lay flat), its
     ends turned along the loop's own neighbours */
  const P = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])); if (loop && P[0].distanceTo(P[P.length - 1]) > 1e-6) P.push(P[0].clone());
  const pos = [], nrm = [], uv = [], idx = [], N = P.length; let along = 0;
  for (let i = 0; i < N; i++) {
    const prev = loop ? P[i === 0 ? N - 2 : i - 1] : P[Math.max(0, i - 1)], next = loop ? P[i === N - 1 ? 1 : i + 1] : P[Math.min(N - 1, i + 1)], t = next.clone().sub(prev).normalize();
    if (i > 0) along += P[i].distanceTo(P[i - 1]);
    let side = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
    const up = new THREE.Vector3().crossVectors(side, t).normalize();
    for (let k = 0; k <= seg; k++) { const a = k / seg * Math.PI * 2, n = up.clone().multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a)); pos.push(P[i].x + n.x * r, P[i].y + n.y * r - r, P[i].z + n.z * r); nrm.push(n.x, n.y, n.z); uv.push(along, ((k / seg) + 0.5) % 1); }
  }
  for (let i = 0; i + 1 < P.length; i++) for (let k = 0; k < seg; k++) { const a = i * (seg + 1) + k, b = a + seg + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; m.name = 'tube'; return m;
}
function post(world, pt, mat) {
  const h = world.groundAt(pt[0], pt[1] - 0.05, pt[2], 3), base = h ? h.point[1] : 0, len = Math.max(0.05, pt[1] - 0.024 - base);
  const g = new THREE.CylinderGeometry(0.022, 0.022, len, 8); g.translate(pt[0], base + len / 2, pt[2]);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.name = 'rail:post'; return m;
}
