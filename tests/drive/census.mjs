/* THE CENSUS OF WHAT IS DRAWN (the supervisor's round-3 finding: one bounding sphere a mesh, the big ones and the tall ones skipped — the 6 m
 * lamp posts were never even counted). Every mesh the page draws — every instance of every instanced mesh — except her, her board, the wax
 * bars and the sky's dome (the far wall of the world, 600 m out), is sampled over its own triangles, every one of them, at 0.5 m or finer,
 * nothing skipped for being big or tall. Each point inside the camera's world (the park's fence, at every height a lens or a line to her can
 * reach: sightline.js CENSUS_BOX) must be known to the camera's sight rule (sightline.js covered: on the park's surfaces, or inside one of
 * the dressing's shapes). Points outside the fence are counted too, and said, but cannot come between the lens and her: the lens never
 * leaves the fence (tests/camera_moving.mjs and camera_view.mjs assert it on every frame and place). RED if any point inside is unknown. */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const r = await t.eval(() => {
    const D = window.__wl.debug, T = D.THREE, box = D.censusBox, skip = new Set();
    D.juno.rig.traverse((o) => skip.add(o)); D.board.traverse((o) => skip.add(o)); D.waxBars.forEach((w) => w.traverse((o) => skip.add(o))); skip.add(D.sky);
    const rows = {}, a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), M = new T.Matrix4(), I = new T.Matrix4(), q = [0, 0, 0];
    const row = (name) => rows[name] || (rows[name] = { meshes: 0, tris: 0, inside: 0, outside: 0, unknown: 0, e: null, top: -Infinity, longest: 0 });
    D.stage.scene.updateMatrixWorld(true);
    D.stage.scene.traverse((o) => {
      if (!o.isMesh || skip.has(o) || !o.visible || !o.geometry || !o.geometry.attributes.position) return;
      const name = o.name || (o.parent && o.parent.name) || o.geometry.type, R = row(name), g = o.geometry, pos = g.attributes.position, idx = g.index;
      const n = o.isInstancedMesh ? o.count : 1, triCount = idx ? idx.count / 3 : pos.count / 3; R.meshes += n;
      for (let k = 0; k < n; k++) {
        if (o.isInstancedMesh) { o.getMatrixAt(k, I); M.multiplyMatrices(o.matrixWorld, I); } else M.copy(o.matrixWorld);
        for (let f = 0; f < triCount; f++) {
          const i0 = idx ? idx.getX(f * 3) : f * 3, i1 = idx ? idx.getX(f * 3 + 1) : f * 3 + 1, i2 = idx ? idx.getX(f * 3 + 2) : f * 3 + 2;
          a.fromBufferAttribute(pos, i0).applyMatrix4(M); b.fromBufferAttribute(pos, i1).applyMatrix4(M); c.fromBufferAttribute(pos, i2).applyMatrix4(M); R.tris++;
          const L = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)); R.longest = Math.max(R.longest, L); R.top = Math.max(R.top, a.y, b.y, c.y);
          const s = Math.max(1, Math.ceil(L / 0.5));
          for (let u = 0; u <= s; u++) for (let v = 0; v <= s - u; v++) {
            const w0 = u / s, w1 = v / s, w2 = 1 - w0 - w1;
            q[0] = a.x * w0 + b.x * w1 + c.x * w2; q[1] = a.y * w0 + b.y * w1 + c.y * w2; q[2] = a.z * w0 + b.z * w1 + c.z * w2;
            if (q[0] < box.x0 || q[0] > box.x1 || q[2] < box.z0 || q[2] > box.z1 || q[1] < box.y0 || q[1] > box.y1) { R.outside++; continue; }
            R.inside++; if (!D.covered(q)) { R.unknown++; if (!R.e) R.e = q.map((x) => +x.toFixed(2)); }
          }
        }
      }
    });
    return rows;
  });
  const names = Object.keys(r).sort(), unknown = names.filter((n) => r[n].unknown);
  for (const n of names) { const x = r[n]; t.log('census ' + n + ': ' + x.meshes + ' drawn, ' + x.tris + ' triangles (longest edge ' + x.longest.toFixed(1) + ' m, top ' + x.top.toFixed(2) + ' m) · ' + x.inside + ' points inside the fence, ' + x.outside + ' outside · ' + (x.unknown ? 'NOT KNOWN to the sight rule: ' + x.unknown + ', e.g. ' + JSON.stringify(x.e) : 'all known')); }
  t.log('CENSUS: ' + names.length + ' kinds of drawn thing, ' + names.reduce((s, n) => s + r[n].inside, 0) + ' points inside the fence, ' + names.reduce((s, n) => s + r[n].outside, 0) + ' outside · ' + (unknown.length ? 'NOT KNOWN: ' + unknown.join(', ') : 'every point inside the fence is known to the sight rule'));
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return t.errors.length === 0 && unknown.length === 0;
}
