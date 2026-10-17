/* THE BOARD, built in code: a deck with its concave and its kicks and seven plies on the edge, grip tape on top, Waxline's own graphic
 * underneath; two trucks (baseplate, kingpin, bushings, hanger, axle) and four 53 mm wheels. Origin: the middle of the deck's top, nose +z. */
import * as THREE from '../../vendor/three/build/three.module.min.js';
import { BOARD } from '../config.js';

export function buildBoard() {
  const B = BOARD, L = B.length, W = B.width, T = B.thickness, wb = B.wheelbase, kick = B.kick * Math.PI / 180;
  const root = new THREE.Group(); root.name = 'board';
  const flipper = new THREE.Group(); root.add(flipper);         // the group the tricks turn
  /* the deck surface: u along (−L/2..L/2), v across (−1..1); half-width rounds at the ends; concave across; kicks past the trucks */
  const NU = 56, NV = 14, R = W / 2, kickStart = wb / 2 + 0.035;
  const halfW = (u) => { const a = Math.abs(u), s = L / 2 - R * 1.05; return a <= s ? R : Math.sqrt(Math.max(0, (R * 1.05) ** 2 - (a - s) ** 2)) * (R / (R * 1.05)); };
  const lift = (u) => { const a = Math.abs(u) - kickStart; if (a <= 0) return 0; const t = Math.min(1, a / 0.04); return a * Math.tan(kick) * (t * t * (3 - 2 * t)); };
  const conc = (v) => B.concave * v * v;
  const top = (u, v) => new THREE.Vector3(v * halfW(u), lift(u) + conc(v), u);
  const deckPos = [], deckUv = [], gripIdx = [], botIdx = [], edgePos = [], edgeCol = [], edgeIdx = [];
  const plies = B.ply.map((c) => new THREE.Color(c));
  /* top (grip) and bottom (graphic) sheets */
  const grid = (sign) => {
    const start = deckPos.length / 3;
    for (let i = 0; i <= NU; i++) { const u = -L / 2 + L * i / NU; for (let j = 0; j <= NV; j++) { const v = -1 + 2 * j / NV, p = top(u, v); if (sign < 0) p.y -= T; deckPos.push(p.x, p.y, p.z); deckUv.push(sign > 0 ? (v + 1) / 2 : (1 - v) / 2, i / NU); } }
    const idx = sign > 0 ? gripIdx : botIdx;
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = start + i * (NV + 1) + j, b = a + NV + 1; if (sign > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1); }
  };
  grid(1); grid(-1);
  /* the edge: a ring around the outline, seven bands of ply from top to bottom */
  const ring = [];
  for (let i = 0; i <= NU; i++) ring.push([-L / 2 + L * i / NU, 1]);
  for (let i = NU; i >= 0; i--) ring.push([-L / 2 + L * i / NU, -1]);
  const bands = plies.length;
  for (let k = 0; k < ring.length; k++) {
    const [u, v] = ring[k], p = top(u, v);
    for (let b = 0; b <= bands; b++) { edgePos.push(p.x, p.y - T * b / bands, p.z); const c = plies[Math.min(bands - 1, b)]; edgeCol.push(c.r, c.g, c.b); }
  }
  for (let k = 0; k + 1 < ring.length; k++) for (let b = 0; b < bands; b++) { const a = k * (bands + 1) + b, c = (k + 1) * (bands + 1) + b; edgeIdx.push(a, c, a + 1, c, c + 1, a + 1); }
  const deckGeo = new THREE.BufferGeometry(); deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(deckPos, 3)); deckGeo.setAttribute('uv', new THREE.Float32BufferAttribute(deckUv, 2));
  deckGeo.setIndex([...gripIdx, ...botIdx]); deckGeo.addGroup(0, gripIdx.length, 0); deckGeo.addGroup(gripIdx.length, botIdx.length, 1); deckGeo.computeVertexNormals();
  const edgeGeo = new THREE.BufferGeometry(); edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3)); edgeGeo.setAttribute('color', new THREE.Float32BufferAttribute(edgeCol, 3)); edgeGeo.setIndex(edgeIdx); edgeGeo.computeVertexNormals();
  const gripMat = new THREE.MeshStandardMaterial({ map: gripTexture(), roughness: 0.95, metalness: 0, color: 0xffffff });
  const graphicMat = new THREE.MeshStandardMaterial({ map: graphicTexture(), roughness: 0.42, metalness: 0, color: 0xffffff });
  const deck = new THREE.Mesh(deckGeo, [gripMat, graphicMat]); deck.castShadow = true; deck.receiveShadow = true;
  const edge = new THREE.Mesh(edgeGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })); edge.castShadow = true;
  flipper.add(deck, edge);
  /* THE TRUCKS, as a player sees them from behind: a cast baseplate bolted through the grip (four bolt heads on top), the kingpin raked
     in toward the middle with its two bushings, washer and nut, the hanger's body — wide and tall in the middle, tapering to the axle — its
     pivot arm up into the cup, and the axle through the wheels to a nut on each side. Origin: the deck's top; the axle at the truck's
     height under the deck, so the wheels stand on the ground the board stands over (PHYSICS.deckTop = the wheel, the truck and the deck).
     Nothing of a truck moves against the deck but the wheels: every other part is gathered by its material into ONE mesh for both trucks
     (four draws), and each wheel is its urethane and its core (two). */
  const alu = new THREE.MeshStandardMaterial({ color: 0xd8d9db, roughness: 0.55, metalness: 0.75 }),   // cast and satin: light grey from every side, never a mirror of the sky
    steel = new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.28, metalness: 1 });
  const zinc = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.42, metalness: 0.85 });
  const bush = new THREE.MeshStandardMaterial({ color: 0xf08a2a, roughness: 0.55, metalness: 0 }), ure = new THREE.MeshPhysicalMaterial({ color: B.wheelColor, roughness: 0.55, clearcoat: 0.2, clearcoatRoughness: 0.6, sheen: 0.3 });
  const th = B.truckHeight, axleY = -T - th, wx = 0.215 / 2 - B.wheelWidth / 2;
  const wheelG = wheelGeometry(B.wheel / 2, B.wheelWidth), coreG = coreGeometry(B.wheelWidth);
  const bins = new Map(), M = new THREE.Matrix4(), Y = new THREE.Vector3(0, 1, 0);
  const put = (geo, mat, matrix) => { const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(matrix); if (!bins.has(mat)) bins.set(mat, []); bins.get(mat).push(g); };
  const along = (o, d, t) => o.clone().addScaledVector(d, t);
  /* a cylinder from a to b (its axis along the segment), radius r0 at a and r1 at b, into its material's bin */
  const rod = (a, b, r0, r1, seg, mat) => { const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r1, r0, d.length(), seg); put(g, mat, M.compose(a.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize()), new THREE.Vector3(1, 1, 1))); g.dispose(); };
  const at = (x, y, z) => M.makeTranslation(x, y, z);
  const hangerG = hangerGeometry(wx - B.wheelWidth / 2 - 0.0025), plateG = plateGeometry();
  for (const s of [1, -1]) {
    const zc = s * wb / 2, o = (x, y, z) => new THREE.Vector3(x, y, zc + z);
    const truck = new THREE.Group(); truck.position.set(0, 0, zc); truck.userData.wheels = [];
    /* the baseplate under the deck, and its four bolts' heads on the grip */
    put(plateG, alu, at(0, -T, zc));
    for (const bx of [-1, 1]) for (const bz of [-1, 1]) put(BOLT_G, zinc, at(bx * 0.0207, 0.0006 + B.concave * (0.0207 / (W / 2)) ** 2, zc + bz * 0.027));
    /* the kingpin: from the plate's boss down and in toward the board's middle, through its bushings, the hanger's seat between them */
    const kDir = new THREE.Vector3(0, -1, -s * 0.35).normalize(), k0 = o(0, -T - 0.004, -s * 0.013);
    rod(k0, along(k0, kDir, 0.016), 0.0105, 0.0095, 12, alu);                          // the boss cast into the plate
    rod(k0, along(k0, kDir, 0.05), 0.0042, 0.0042, 8, steel);                           // the kingpin
    rod(along(k0, kDir, 0.015), along(k0, kDir, 0.0255), 0.0118, 0.0125, 14, bush);    // the top bushing
    rod(along(k0, kDir, 0.0335), along(k0, kDir, 0.0425), 0.0122, 0.0112, 14, bush);   // the bottom bushing
    rod(along(k0, kDir, 0.0425), along(k0, kDir, 0.0442), 0.0128, 0.0128, 14, steel);  // its washer
    rod(along(k0, kDir, 0.0442), along(k0, kDir, 0.0505), 0.0068, 0.0068, 6, zinc);    // the nut
    rod(along(k0, kDir, 0.0255), along(k0, kDir, 0.0335), 0.0145, 0.0145, 14, alu);    // the hanger's seat
    /* the hanger round the axle, its pivot arm up into the plate's cup */
    put(hangerG, alu, at(0, axleY, zc));
    rod(o(0, axleY + 0.02, s * 0.004), o(0, -T - 0.009, s * 0.024), 0.0072, 0.0058, 10, alu);
    rod(o(0, -T - 0.003, s * 0.026), o(0, -T - 0.013, s * 0.025), 0.0092, 0.0092, 12, alu);   // the pivot cup's housing
    /* the axle through both wheels, a nut outside each */
    rod(o(-wx - B.wheelWidth / 2 - 0.006, axleY, 0), o(wx + B.wheelWidth / 2 + 0.006, axleY, 0), 0.004, 0.004, 8, steel);
    for (const x of [-1, 1]) {
      rod(o(x * (wx + B.wheelWidth / 2), axleY, 0), o(x * (wx + B.wheelWidth / 2 + 0.0065), axleY, 0), 0.0058, 0.0058, 6, zinc);
      const w = new THREE.Mesh(wheelG, ure); w.position.set(x * wx, axleY, 0); w.castShadow = true;
      const core = new THREE.Mesh(coreG, steel); core.scale.x = x; w.add(core);
      truck.add(w); truck.userData.wheels.push(w);
    }
    flipper.add(truck); root.userData[s > 0 ? 'front' : 'back'] = truck;
  }
  let truckTris = 4 * (wheelG.index.count + coreG.index.count) / 3;
  for (const [mat, list] of bins) {
    const n = list.reduce((a, g) => a + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3); let k = 0;
    for (const g of list) { pos.set(g.attributes.position.array, k * 3); nrm.set(g.attributes.normal.array, k * 3); k += g.attributes.position.count; g.dispose(); }
    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    const m = new THREE.Mesh(mg, mat); m.name = 'trucks'; m.castShadow = mat !== zinc; flipper.add(m); truckTris += n / 3;
  }
  /* the board's own lift: deck top sits 0.09 m over the ground */
  flipper.position.y = 0;
  root.userData.flipper = flipper;
  root.userData.spin = (dt, speed) => { for (const t of [root.userData.front, root.userData.back]) for (const w of t.userData.wheels) w.rotation.x += speed * dt / (B.wheel / 2); };
  root.userData.triangles = deckGeo.index.count / 3 + edgeGeo.index.count / 3 + truckTris;
  return root;
}
/* a wheel: a rounded urethane profile turned on a lathe, axis along x */
function wheelGeometry(r, w) {
  const pts = [], n = 10, rim = 0.009;
  pts.push(new THREE.Vector2(0.011, -w / 2));
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / n; pts.push(new THREE.Vector2(r - rim + Math.cos(a) * rim, -w / 2 + rim + Math.sin(a) * rim)); }
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 * i / n; pts.push(new THREE.Vector2(r - rim + Math.cos(a) * rim, w / 2 - rim + Math.sin(a) * rim)); }
  pts.push(new THREE.Vector2(0.011, w / 2));
  const g = new THREE.LatheGeometry(pts, 18); g.rotateZ(Math.PI / 2); return g;
}
/* a wheel's core: the dark hub through it and the bearing's steel shield on its outer face (+x; the wheel on the left mirrors it) */
function coreGeometry(w) {
  const pts = [new THREE.Vector2(0.0001, -w / 2 - 0.001), new THREE.Vector2(0.011, -w / 2 - 0.001), new THREE.Vector2(0.011, w / 2 + 0.001), new THREE.Vector2(0.0106, w / 2 + 0.0012), new THREE.Vector2(0.0106, w / 2 + 0.0022), new THREE.Vector2(0.0045, w / 2 + 0.0024), new THREE.Vector2(0.0001, w / 2 + 0.0024)];
  const g = new THREE.LatheGeometry(pts, 16); g.rotateZ(-Math.PI / 2); return g;
}
/* the hanger, seen from behind: round over the axle at its ends, rising to a body in the middle that is as tall as the bushings sit; cast,
   its edges eased (the extrusion's bevel). hw: its half-width, short of the wheels' inner faces. The axle line is y = 0. */
function hangerGeometry(hw) {
  const re = 0.0062, bv = 0.0025, h = hw - bv, sh = new THREE.Shape();
  sh.moveTo(-h + re, -re);
  sh.bezierCurveTo(-0.03, -re - 0.0016, 0.03, -re - 0.0016, h - re, -re);
  sh.absarc(h - re, 0, re, -Math.PI / 2, Math.PI / 2, false);
  sh.bezierCurveTo(0.045, re + 0.0008, 0.03, 0.011, 0.014, 0.0225);
  sh.quadraticCurveTo(0, 0.0285, -0.014, 0.0225);
  sh.bezierCurveTo(-0.03, 0.011, -0.045, re + 0.0008, -h + re, re);
  sh.absarc(-h + re, 0, re, Math.PI / 2, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.003, bevelSize: bv, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -0.01); return g;
}
/* the baseplate: a rounded plate under the deck, 4.2 mm thick and eased; it hangs from y = 0 down */
function plateGeometry() {
  const a = 0.029, b = 0.034, r = 0.009, sh = new THREE.Shape();
  sh.moveTo(-a + r, -b); sh.lineTo(a - r, -b); sh.quadraticCurveTo(a, -b, a, -b + r); sh.lineTo(a, b - r); sh.quadraticCurveTo(a, b, a - r, b);
  sh.lineTo(-a + r, b); sh.quadraticCurveTo(-a, b, -a, b - r); sh.lineTo(-a, -b + r); sh.quadraticCurveTo(-a, -b, -a + r, -b);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.0042, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 1, curveSegments: 4 });
  g.rotateX(Math.PI / 2); return g;
}
/* a bolt's head on the grip: a low dome */
const BOLT_G = new THREE.CylinderGeometry(0.0036, 0.0042, 0.0013, 14);
/* grip tape: near-black, with the grit catching the light and two worn patches where the feet stand */
function gripTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#1f2023'; x.fillRect(0, 0, 64, 512);
  const img = x.getImageData(0, 0, 64, 512), d = img.data; let s = 9;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < d.length; i += 4) { const y = (i / 4 / 64) | 0, wear = Math.max(0, 1 - Math.abs(y - 150) / 70) + Math.max(0, 1 - Math.abs(y - 370) / 60); const g = 26 + rnd() * 22 + wear * 18 + (rnd() < 0.03 ? 60 : 0); d[i] = g; d[i + 1] = g + 1; d[i + 2] = g + 4; }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/* the bottom: Waxline's own mark — a drop of wax over a ledge line, the word along the deck */
function graphicTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512; const x = c.getContext('2d'), G = BOARD.graphic;
  x.fillStyle = G.base; x.fillRect(0, 0, 128, 512);
  const grad = x.createLinearGradient(0, 0, 128, 0); grad.addColorStop(0, 'rgba(0,0,0,0.12)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.06)'); grad.addColorStop(1, 'rgba(0,0,0,0.12)'); x.fillStyle = grad; x.fillRect(0, 0, 128, 512);
  x.fillStyle = G.ink; x.fillRect(0, 330, 128, 10);
  x.beginPath(); x.moveTo(64, 236); x.bezierCurveTo(92, 286, 98, 306, 86, 322); x.bezierCurveTo(76, 334, 52, 334, 42, 322); x.bezierCurveTo(30, 306, 36, 286, 64, 236); x.fill();
  x.save(); x.translate(64, 160); x.rotate(-Math.PI / 2); x.font = '900 40px "Arial Black", "Helvetica Neue", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(G.word, 0, 0); x.restore();
  let sd = 91; const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(30,25,20,' + (rnd() * 0.25) + ')'; x.fillRect(rnd() * 128, rnd() * 512, 1 + rnd() * 3, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
