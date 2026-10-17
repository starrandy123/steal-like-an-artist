/* JUNO'S MESH, WALLED (10-16, V14's walls begun): each level of detail read as the game will read it (three's GLTFLoader), every piece's
 * shape against its DESIGN — welded by position first (glTF splits a vertex at a seam of its normals or its UVs) — and the budgets:
 *   every piece one connected piece, no edge on three or more triangles; its Euler characteristic χ = 2 − 2g − b as designed (g the handles
 *   its openings make in a thick sheet: the tee's neck, hem and sleeves; b the open loops where the skin is cut away under the clothes);
 *   ≤ 30,000 triangles for the player's own skater, ≤ 12,000 for a friend's.
 * Plants, in memory, to watch the wall see them: `--plant open` takes one triangle out of the cargos (an open edge loop), `--plant pinch` puts a
 * second triangle on one of the beanie's edges (the glTF writer's own split made eight such, 10-16).
 * Usage: node sources/juno/juno_walls.mjs <three@0.183.1's examples/jsm/loaders/GLTFLoader.js> [work dir] [--plant open|pinch] */
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, ''), LOADER = process.argv[2], WORK = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : ROOT + '/sources/juno/work';
const PLANT = process.argv.includes('--plant') ? process.argv[process.argv.indexOf('--plant') + 1] : null;
const { GLTFLoader } = await import(LOADER), { topology } = await import(ROOT + '/tests/lib/topology.mjs');
let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
/* the design of each piece: [pieces, χ per piece (or null: open, its loops said), what its openings are] */
const DESIGN = {
  JunoSkin: { skin: [0, 0, 1, 1, 1], why: 'the skin, cut away under the clothes: the two shins between the cargos and the shoes (open at both ends, χ 0), the head and neck and the two hands (open at the collar and the cuffs, χ 1)' },
  tee: { chi: -4, why: 'a thick sheet open at the neck, the hem and both sleeves: three handles' }, jacket: { chi: -2, why: 'a thick sheet open down the front from the collar to the hem, and at both cuffs: two handles' },
  pants: { chi: 2 }, collar: { chi: 2 }, shoeL: { chi: 2 }, shoeR: { chi: 2 }, soleL: { chi: 2 }, soleR: { chi: 2 }, beanie: { chi: 2 }, beanieCuff: { chi: 2 }, hair: { chi: 2 }, JunoEyeL: { chi: 2 }, JunoEyeR: { chi: 2 },
};
for (const [lod, budget] of [[0, 30000], [1, 12000]]) {
  const buf = readFileSync(WORK + '/juno_lod' + lod + '.glb'), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
  const byPiece = new Map(); gltf.scene.traverse((o) => { if (o.isMesh) { const n = o.name.replace(/_\d+$/, ''); (byPiece.get(n) || byPiece.set(n, []).get(n)).push(o.geometry); } });
  let total = 0; const bad = [];
  for (const [name, geos] of byPiece) {
    /* weld: the same position (to a micron) is one vertex */
    const key = new Map(), idx = [];
    for (const g of geos) { const p = g.attributes.position.array, ix = g.index ? g.index.array : [...Array(p.length / 3).keys()];
      for (const i of ix) { const k = Math.round(p[i * 3] * 1e6) + ',' + Math.round(p[i * 3 + 1] * 1e6) + ',' + Math.round(p[i * 3 + 2] * 1e6); if (!key.has(k)) key.set(k, key.size); idx.push(key.get(k)); } }
    if (PLANT === 'open' && name === 'pants') idx.splice(0, 3);
    if (PLANT === 'pinch' && name === 'beanie') idx.push(idx[0], idx[1], idx[idx.length - 1] === idx[2] ? idx[3] : idx[idx.length - 1]);
    const tp = topology({ idx }), d = DESIGN[name] || {}; total += tp.tris;
    const want = d.skin ? tp.pinched === 0 && tp.chi.length === d.skin.length && [...tp.chi].sort((x, y) => x - y).every((x, k) => x === d.skin[k])
      : tp.chi.length === 1 && tp.open === 0 && tp.pinched === 0 && tp.chi[0] === d.chi;
    if (!want) bad.push(name);
    console.log('  · LOD ' + lod + ' ' + name.padEnd(11) + String(tp.tris).padStart(6) + ' triangles · ' + tp.chi.length + (tp.chi.length === 1 ? ' piece' : ' pieces') + ' · χ ' + tp.chi.join('/') + ' · ' + tp.open + ' open · ' + tp.pinched + ' on 3+' + (d.why ? ' — ' + d.why : '') + (want ? '' : '  ✖'));
  }
  ok(!bad.length, 'LOD ' + lod + ': EVERY PIECE AS DESIGNED — ' + (byPiece.size - bad.length) + ' of ' + byPiece.size + ' with no pinched edge, each garment one closed piece of its own χ, the skin its five cut pieces' + (bad.length ? ' — not: ' + bad.join(', ') : ''));
  ok(total <= budget, 'LOD ' + lod + ': ' + total + ' triangles (≤ ' + budget + ')');
}
console.log('JUNO WALLS: ' + (fail ? 'RED · ' + fail : 'GREEN') + (PLANT ? ' · PLANTED: ' + PLANT : ''));
