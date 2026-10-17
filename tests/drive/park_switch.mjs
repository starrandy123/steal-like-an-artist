/* THE SWITCH HOLDS NO MORE AFTER EACH ROUND (the supervisor, 10-16: "the weigh after switching park 1 → 2 → 1 → 2 holds no more after each switch").
 * From the title, the chip pressed eight times as a player presses it; after each, the GPU's own count of geometries and textures and the
 * game's ledger. The park's counts after its second, third and fourth visit must equal its first (one geometry of slack for a lazily made
 * buffer, never more), in both parks. */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  /* a park's meshes are sent to the graphics card the first time they are in view: before each reading, the whole park from above (and the
     buildings round it) for a few frames, then back to the title */
  const mem = async () => {
    await t.eval(() => { const P = window.__wl.debug.world.data, cx = P.size[0] / 2, cz = P.size[1] / 2; window.__wl.debug.shot = { pos: [cx, 70, cz - 0.01], look: [cx, 0, cz], fov: 110 }; });
    await t.sleep(700);
    const r = await t.eval(() => { const i = window.__wl.debug.stage.renderer.info.memory, L = window.__wl.ledger(); return { park: window.__wl.park(), g: i.geometries, x: i.textures, mb: L.totalMb }; });
    await t.eval(() => { window.__wl.debug.shot = null; }); await t.sleep(300); return r;
  };
  const label = () => t.eval(() => document.getElementById('wl-park').textContent);
  const press = async () => { const before = await label(), b = await t.eval(() => { const r = document.getElementById('wl-park').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await t.tap(b[0], b[1]); for (let k = 0; k < 40; k++) { await t.sleep(250); if ((await label()) !== before) break; } await t.sleep(900); };
  const reads = [await mem()];
  for (let k = 0; k < 8; k++) { await press(); reads.push(await mem()); }
  t.log(reads.map((r) => `${r.park} ${r.g}g ${r.x}t ${r.mb}MB`).join(' → '));
  let ok = true;
  for (const park of ['waxline', 'kilnyard']) {
    const R = reads.filter((r) => r.park === park), first = R[0];
    /* the ledger both ways: a park weighs what it weighed on its first visit, neither more (a row the last park left) nor less (a row a switch
       took that was not the park's: 10-17, Juno's own) */
    for (const r of R.slice(1)) if (r.g > first.g + 1 || r.x > first.x || Math.abs(r.mb - first.mb) > 0.05) ok = false;
    t.log(`${park}: ${R.map((r) => r.g + 'g/' + r.x + 't/' + r.mb + 'MB').join(', ')}`);
  }
  t.log('errors', JSON.stringify(t.errors.slice(0, 4)));
  return ok && t.errors.length === 0;
}
