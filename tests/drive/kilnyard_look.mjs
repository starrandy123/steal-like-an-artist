/* KILN YARD, LOOKED AT (the supervisor's read: a top-down plan shot, views at the player's height, the game's own camera at the spots) and the
 * SWITCH between the parks: from the title's chip as a player presses it, and the GPU's memory after each switch (Plaza → Kiln Yard → Plaza →
 * Kiln Yard: the old park's buffers let go, nothing growing). Run through the kit's drive (the platform's own page, --gpu, no window). */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  const mem = () => t.eval(() => { const i = window.__wl.debug.stage.renderer.info.memory, L = window.__wl.ledger(); return { park: window.__wl.park(), geometries: i.geometries, textures: i.textures, ledgerMb: L.totalMb, parkTris: L.triangles.park }; });
  const press = async (id) => { const b = await t.eval((q) => { const e = document.getElementById(q); if (!e || e.offsetParent === null) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, id); if (!b) return false; await t.tap(b[0], b[1]); await t.sleep(900); return true; };
  const reads = [await mem()];
  await t.shot('title_plaza_' + tag);
  /* the chip, as a player presses it: the Plaza → Kiln Yard → the Plaza → Kiln Yard */
  const label = () => t.eval(() => document.getElementById('wl-park').textContent);
  const labels = [await label()];
  for (let k = 0; k < 3; k++) { const pressed = await press('wl-park'); await t.sleep(1200); labels.push((pressed ? '' : 'NOT PRESSED ') + await label()); reads.push(await mem()); }
  await t.shot('title_kilnyard_' + tag);
  t.log('switches: ' + labels.join(' → '));
  t.log('memory after each: ' + reads.map((r) => `${r.park}: ${r.geometries} geometries, ${r.textures} textures, ledger ${r.ledgerMb} MB, park ${r.parkTris} tris`).join(' | '));
  /* the plan from above, and the park at a player's height (the game's own renderer, its light; the pictures' camera) */
  const view = async (name, pos, look, fov = 50) => { await t.eval((s) => { window.__wl.debug.shot = s; }, { pos, look, fov }); await t.sleep(700); await t.shot(name + '_' + tag); };
  /* A TOP-DOWN SHOT IS FLIPPED TO ITS PLAN (DESIGN §6.0: seen from above with north up, +x lies on the left): the canvas mirrored for the
     picture only, with the words on it, then put back */
  const plan = async (name, pos, look, fov) => {
    await t.eval((s) => { window.__wl.debug.shot = s; }, { pos, look, fov }); await t.sleep(700);
    await t.eval(() => { const c = document.getElementById('wl-canvas'); c.style.transform = 'scaleX(-1)'; const l = document.createElement('div'); l.id = 'wl-flip-note';
      l.textContent = 'flipped to the plan · north up, east right'; Object.assign(l.style, { position: 'fixed', left: '12px', bottom: '10px', zIndex: 99, font: '600 14px system-ui, sans-serif', color: '#fff', background: 'rgba(0,0,0,.55)', padding: '4px 8px', borderRadius: '6px' }); document.body.appendChild(l); });
    await t.sleep(250); await t.shot(name + '_' + tag);
    await t.eval(() => { document.getElementById('wl-canvas').style.transform = ''; const l = document.getElementById('wl-flip-note'); if (l) l.remove(); });
  };
  await press('wl-play'); await t.sleep(600);
  await t.eval(() => window.__wl.debug.mode('shot'));
  await plan('kiln_top_plan', [48, 118, 35.99], [48, 0, 36], 46);
  await view('kiln_from_dock', [52, 7.2, 70], [52, 3.5, 40], 62);
  await view('kiln_steps', [44, 3.6, 20], [44, 4.2, 32], 62);
  await view('kiln_spillway_east', [8, 1.0, 8], [60, 0.8, 8], 60);
  await view('kiln_spillway_lip', [70, 4.0, 17.5], [70, 0.5, 6], 60);
  await view('kiln_kiln', [56, 5.8, 48], [66.5, 4.5, 54], 60);
  await view('kiln_diy', [18, 6.0, 52], [6, 4.8, 63], 60);
  await view('kiln_barrier', [50, 4.9, 43], [62, 4.6, 44.5], 58);
  await view('kiln_dock_edge', [70, 4.9, 58], [70, 5.2, 64.5], 60);
  await view('kiln_wide_ne', [20, 9, 20], [70, 6, 60], 62);
  await view('kiln_wide_from_spill', [50, 3.2, 10], [50, 7, 70], 64);
  await view('kiln_props_dock', [61, 6.6, 66.5], [62, 5.8, 71], 60);
  await view('kiln_props_car', [28, 5.6, 63], [24, 4.6, 68], 60);
  await view('kiln_props_utility', [4, 5.2, 41], [0.8, 4.6, 44], 60);
  /* the ground (10-17): the asphalt truck apron and its bays, the dock's safety line, the hatch at the Dock Seven's foot; one view grazing
     along the bays at a skater's eye, and the yard where its two slab rows meet (x 40: no dark seam) */
  await view('ground_apron', [62, 6.2, 51], [62, 4.2, 62], 60);
  await view('ground_bays_grazing', [44, 5.0, 60.5], [72, 4.15, 61.5], 60);
  await view('ground_hatch', [83, 5.6, 55.5], [87, 4.15, 60.5], 60);
  await view('ground_dock_line', [70, 6.6, 68.5], [58, 5.35, 64.8], 60);
  await view('ground_seam_x40', [40, 6.0, 40], [40, 4.15, 47], 60);
  await view('ground_outside_road', [48, 7.5, 70], [48, 0, 80], 60);
  await t.eval(() => { window.__wl.debug.shot = null; window.__wl.debug.mode('play'); });
  /* the game's own camera: rolling at the spots */
  const roll = async (name, at, heading, speed, ms = 1300) => { await t.eval((a) => window.__wl.debug.place(a.at, a.heading, a.speed), { at, heading, speed }); await t.sleep(ms); await t.shot(name + '_' + tag); return t.eval(() => { const r = window.__wl.read(); return { p: r.p.map((v) => +v.toFixed(2)), state: r.state }; }); };
  const rolls = [];
  rolls.push(['spawn on the dock', await roll('cam_dock', [52, 5.35, 69], 180, 0, 1500)]);
  rolls.push(['to the Ten', await roll('cam_ten', [44.5, 4.15, 40], 180, 4, 1400)]);
  rolls.push(['along the spillway', await roll('cam_spillway', [20, 0, 6.0], 90, 6, 1500)]);
  rolls.push(['at the Kiln', await roll('cam_kiln', [55, 4.15, 54], 90, 4.5, 1200)]);
  rolls.push(['into the DIY', await roll('cam_diy', [24, 4.15, 62], 270, 5, 1500)]);
  for (const [n, r] of rolls) t.log(`${n}: ${r.state} at ${r.p.join(', ')}`);
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  const ok = labels.join('|') === 'Park: The Plaza|Park: Kiln Yard|Park: The Plaza|Park: Kiln Yard' && reads.length === 4 && t.errors.length === 0;
  return ok;
}
