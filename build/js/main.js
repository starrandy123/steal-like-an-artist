/* WAXLINE — boots the park, the light, the board and Juno behind the game's own loading screen (each step real work, named), then runs the
 * simulation at a fixed 120 Hz and draws it. window.__wl is what the port kit, the bot and the tests read. */
import * as THREE from '../vendor/three/build/three.module.min.js';
import { World } from './sim/world.js';
import { Skater } from './sim/body.js';
import { Score, Gaps } from './sim/score.js';
import { PHYSICS, ASSISTS, BOARD } from './config.js';
import { Stage, deviceTier } from './view/stage.js';
import { buildParkView } from './view/parkview.js';
import { buildBoard } from './view/board.js';
import { buildSkater, bodyPoints } from './view/skater.js';
import { poseInput, stepFigure, followed, Fall } from './view/figure.js';
import { Follow, framed } from './view/camera.js';
import { firstHit, covered, CENSUS_BOX } from './view/sightline.js';
import { Hud } from './view/hud.js';
import { fullscreenOffer, goFullscreen } from './view/fullscreen.js';
import { Controls, insets } from './input/touch.js';
import { Audio } from './audio/audio.js';
import { applyStyle } from './view/style.js';
import { Run } from './game/run.js';
import { parkById, PARKS } from './parks/index.js';
import { LOOK } from './config.js';
import { clock, advance, alpha } from './formulas/step.js';

export const BUILD = { at: '2026-10-17, 12:06', what: 'prototype · the landing release: each air turned onto its landing at a rider\'s pace, read where the board will meet the ground · straightened on the ground after a spin, never snapped · set down on its wheels\' own ground and settled at its contact\'s rate, never set · rails met at a planned pace · a frame that throws never stops the game · two parks, the Plaza and Kiln Yard (Park on the title) · a body on its legs (the knees take every pop, landing, catch and seam) · drops in off every deck’s coping (each lip’s roll measured, every Plaza lip a drop-in) · a stop at a wall slides on along it · rails met from above, caught where the fall meets the top · smooth over bank seams, rail kinks and coping catches · push, carve, ollie (nollie on Classic), eleven flicked flips graded for accuracy and speed, doubles on Classic, eight grabs, grinds and slides on ledges, rails and coping, manuals and landing into them, quarter-pipe and bowl airs, lip stalls, reverts, four specials on a golden meter, bails that fall where there is room and respawn, 24 named gaps, a two-minute run with 12 goals and 5 wax bars · a camera that keeps him whole and in sight rolling, in the air and in a fall · Juno sculpted in code, in skate shoes (a cupsole, suede panels, laced cords) and cloth with its weave, seams and folds · a board on real trucks, its wheels on the ground · golden hour in two looks (Real and Painted) · synthesized sound: a roll of its own on every surface, its joints clear of it · on a phone: full screen and turned, the HUD clear of a notch' };

const B = window.__mosaBoot;
const work = (name) => { try { return B && typeof B.registerWork === 'function' ? B.registerWork(name) : () => {}; } catch (e) { return () => {}; } };
const phase = (p, words) => { try { if (B && typeof B.progress === 'function') B.progress(p, words); } catch (e) { /* a page of its own */ } const w = document.querySelector('#loading [data-mosa-phase]'); if (w && !B) w.textContent = words; const l = document.getElementById('loading'); if (l && !B) l.style.setProperty('--mosa-progress', String(p)); };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const ledger = { rows: new Map(), set(n, b, w) { this.rows.set(n, { b, w }); }, total() { let s = 0; for (const r of this.rows.values()) s += r.b; return s; }, list() { return [...this.rows].map(([n, r]) => [n, +(r.b / 1048576).toFixed(2)]).sort((a, b) => b[1] - a[1]); } };
const SAVE_KEY = 'waxline:save';

async function boot() {
  const w0 = work('Pouring the park'); phase(0.08, 'Pouring the park');
  /* THE PARK: the one the player last skated (the save says which), its rows, gaps, run and goals (js/parks/) */
  let def = parkById(readSave().park);
  let world = new World(def.PARK, def.TREES); w0(); if (world.problems.length) console.warn('[waxline] the park says:', world.problems);
  await nextFrame();
  const tier = deviceTier();
  const stage = new Stage(document.getElementById('app'), tier);
  const w1 = work('Painting the concrete'); phase(0.2, 'Painting the concrete');
  let pv = buildParkView(stage, world, ledger, () => {}); await pv.ready; w1();
  await nextFrame();
  const w2 = work('Building Juno'); phase(0.55, 'Building Juno');
  const board = buildBoard(); stage.scene.add(board);
  const juno = buildSkater(stage, ledger); board.add(juno.rig); w2();
  const setLook = (name) => { applyStyle(stage.scene, stage, name); window.__wl.lookName = name; };
  setLook(LOOK.look);
  await nextFrame();
  /* settings and the save */
  const save = readSave();
  let sim = new Skater(world, { preset: save.assist || ASSISTS.preset });
  /* what the player has done in a park is that park's (save v2: `parks[id]`): its gaps, its goals, its best combo and its best run */
  const progressOf = (id) => (save.parks && save.parks[id]) || {};
  let score = new Score(), gaps = new Gaps(world, def.GAPS);
  const restore = () => { const P = progressOf(def.id); for (const g of P.gaps || []) score.gapsFound.add(g); score.best = P.best || 0; score.bestCombo = P.bestCombo || null; };
  restore();
  let cam = new Follow(stage, world); if (save.cam) cam.mode = save.cam;
  let run = new Run({ done: progressOf(def.id).goals || [], best: progressOf(def.id).bestRun || 0, run: def.RUN, goals: def.GOALS });
  score.tap = (f) => run.heardScore(f, score, sim);
  /* the five wax bars: a slab of amber wax that turns slowly and glows a little, out only during a run */
  const waxGeo = new THREE.BoxGeometry(0.34, 0.12, 0.2), waxMat = new THREE.MeshStandardMaterial({ color: 0xf1b24a, emissive: 0xffa53a, emissiveIntensity: 0.55, roughness: 0.35 });
  const waxOf = (R) => R.wax.map((p) => { const m = new THREE.Mesh(waxGeo, waxMat); m.position.set(p[0], p[1], p[2]); m.castShadow = true; m.visible = false; m.userData.keepLook = false; stage.scene.add(m); return m; });
  let waxBars = waxOf(def.RUN);
  const audio = new Audio(); audio.on = save.sound !== false;
  const ui = document.getElementById('ui');
  const controls = new Controls(ui, { streamlined: sim.assist.streamlined, sensitivity: sim.assist.sensitivity, onLook: (dx, dy) => cam.drag(dx, dy), onKey: (code) => { if (code === 'KeyC' && mode === 'play') cam.mode = cam.mode === 'filmer' ? 'high' : 'filmer'; if (code === 'Escape') { if (mode === 'play') setMode('pause'); else if (mode === 'pause') setMode('play'); } } });
  controls.reader.context = () => ({ roll: 'ground', manual: 'manual', air: 'air', grind: 'grind', lip: 'lip', bail: 'bail' })[sim.state] || 'ground';
  const presets = ['cruise', 'classic', 'raw'], presetName = { cruise: 'Cruise', classic: 'Classic', raw: 'Raw' };
  let mode = 'title';
  const hud = new Hud(ui, {
    onPlay: () => { audio.start(); setMode('play'); }, onResume: () => { audio.start(); setMode('play'); }, onPause: () => setMode('pause'),
    onFullscreen: async () => { const said = await goFullscreen(window); window.__wl.fullscreen.said = said; offerFullscreen(); },
    onRestart: () => { const s = world.data.spawn; sim.respawnAt(s.at, s.heading, 0); prevRead = null; score.lose(); cam.ready = false; setMode('play'); },
    onRun: () => { audio.start(); const s = world.data.spawn; fall.end(); sim.respawnAt(s.at, s.heading, 0); prevRead = null; score.combo = null; score.timed = null; score.total = 0; score.special = 0; score.golden = false; cam.ready = false;
      run.start(score); waxBars.forEach((m) => { m.visible = true; }); setMode('play'); },
    onCamera: () => { cam.mode = cam.mode === 'filmer' ? 'high' : 'filmer'; writeSave(); return cam.mode === 'filmer' ? 'Filmer' : 'High'; },
    onAssist: () => { const next = presets[(presets.indexOf(sim.assist.name || save.assist || 'cruise') + 1) % presets.length]; setAssist(next); writeSave(); return presetName[next]; },
    onSound: () => { audio.setOn(!audio.on); writeSave(); return audio.on; },
    onLook: () => { setLook(window.__wl.lookName === 'painted' ? 'real' : 'painted'); writeSave(); return window.__wl.lookName === 'painted' ? 'Painted' : 'Real'; },
    onPark: () => switchPark(PARKS[(PARKS.indexOf(def) + 1) % PARKS.length].id),
  });
  function setAssist(name) { sim.assist = Object.assign({ name }, ASSISTS[name]); controls.reader.streamlined = sim.assist.streamlined; save.assist = name; }
  setAssist(save.assist || ASSISTS.preset);
  if (save.look === 'painted' || save.look === 'real') setLook(save.look);
  hud.setLabels(presetName[sim.assist.name], audio.on, cam.mode === 'filmer' ? 'Filmer' : 'High', window.__wl.lookName === 'painted' ? 'Painted' : 'Real'); hud.setPark(def.name);
  hud.setCut('Prototype · built ' + BUILD.at, 'In this build (' + BUILD.at + '): ' + BUILD.what.replace(/^prototype · /, ''));
  function setMode(m) { mode = m; hud.mode(m); controls.enabled = m === 'play'; window.__wl.playing = m === 'play';
    if (m === 'pause') hud.progress(def.name + ' · gaps found: ' + score.gapsFound.size + ' of ' + def.GAPS.length + ' · goals done: ' + run.done.size + ' of ' + def.GOALS.length + (run.best ? ' · best run ' + run.best.toLocaleString('en-US') : ''));
    if (m === 'title' || (m === 'play' && !run.on)) waxBars.forEach((w) => { w.visible = false; }); }
  /* THE SAVE (v2): the settings, the park last skated, and each park's own progress under `parks`; a v1 save (one park) is the Plaza's. The
     Plaza's progress is also kept where v1 kept it, so an older build reads it still */
  function readSave() {
    let s = {}; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; } catch (e) { s = {}; }
    if (!s.parks) s.parks = { [PARKS[0].id]: { best: s.best, bestCombo: s.bestCombo, gaps: s.gaps, goals: s.goals, bestRun: s.bestRun } };
    return s;
  }
  function writeSave() {
    try {
      save.parks = save.parks || {}; save.parks[def.id] = { best: score.best, bestCombo: score.bestCombo, gaps: [...score.gapsFound], goals: [...run.done], bestRun: run.best };
      const p1 = save.parks[PARKS[0].id] || {};
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, park: def.id, parks: save.parks, assist: sim.assist.name, sound: audio.on, cam: cam.mode, look: window.__wl.lookName, taught: !!save.taught,
        best: p1.best || 0, bestCombo: p1.bestCombo || null, gaps: p1.gaps || [], goals: p1.goals || [], bestRun: p1.bestRun || 0 }));
    } catch (e) { /* a private window */ }
  }
  /* A SWITCH OF PARK, IN PLACE (the page is never loaded again once it was shown): only from the title or the pause card. The old park's view
     lets go of all it made (parkview.js dispose), and the world, the sim, the score, the gaps, the run, the wax bars, the camera and the fall
     are made again for the new one; the player keeps their settings, and each park its own progress */
  let switching = null;
  async function switchPark(id) {
    const next = parkById(id); if ((mode !== 'title' && mode !== 'pause') || next === def || switching) return def.name;
    switching = next.id;
    try {
    writeSave();
    if (fall.on) fall.end();
    /* the new park is poured and its buildings loaded before the old one goes: no frame shows a park half made */
    const w2 = new World(next.PARK, next.TREES); if (w2.problems.length) console.warn('[waxline] the park says:', w2.problems);
    const old = pv;   // its ledger rows go with it (view/parkview.js dispose)
    const pv2 = buildParkView(stage, w2, ledger, () => {}); pv2.root.visible = false; await pv2.ready;
    old.dispose(); for (const m of waxBars) stage.scene.remove(m); pv2.root.visible = true;
    def = next; save.park = def.id; world = w2; pv = pv2;
    const preset = sim.assist.name; sim = new Skater(world, { preset }); setAssist(preset);
    score = new Score(); gaps = new Gaps(world, def.GAPS); restore();
    const camMode = cam.mode; cam = new Follow(stage, world); cam.mode = camMode;
    run = new Run({ done: progressOf(def.id).goals || [], best: progressOf(def.id).bestRun || 0, run: def.RUN, goals: def.GOALS }); score.tap = (f) => run.heardScore(f, score, sim);
    waxBars = waxOf(def.RUN); fall = new Fall(world, stage.scene, juno, board); prevRead = null; cam.ready = false;
    expose(); writeSave(); setMode(mode);
    } finally { switching = null; }
    return def.name;
  }

  const Yv = new THREE.Vector3(), pivot = new THREE.Vector3(), q = new THREE.Quaternion();
  const C = clock(PHYSICS.step, PHYSICS.maxSteps);   // the fixed step (formulas/step.js): whole steps, at most maxSteps a frame, the rest dropped and counted
  let prevRead = null;   // the sim's read before its last step: a frame is drawn between it and the newest step, at alpha(C) (figure.js drawn)
  /* her fall, and the points of her the camera keeps in the picture (view/figure.js, view/skater.js: the same code the camera's test drives) */
  let fall = new Fall(world, stage.scene, juno, board); const BODY = [];
  /* shaders built behind the loading screen, never on first use in play */
  const w3 = work('Warming up'); phase(0.85, 'Warming up');
  { const s0 = poseState(); stepFigure(1 / 60, s0, juno, board, fall); placeFlipper(s0); } cam.update(1 / 60, sim.read(), { snap: true, body: bodyPoints(juno, BODY) });
  try { await stage.renderer.compileAsync(stage.scene, stage.camera); } catch (e) { stage.renderer.compile(stage.scene, stage.camera); }
  w3();

  /* ---------------- the board's flip, the frame ---------------- */
  /* the deck turning through a flip, tipped up in a manual or a nose/tail grind, upside down in a Darkslide (the board itself is on the
     sim's frame: figure.js) */
  function placeFlipper(s) {   // s: the drawn state (figure.js drawn)
    const fl = board.userData.flipper, tr = s.trick;
    fl.quaternion.identity(); fl.position.set(0, 0, 0);
    if (s.state === 'grind' && s.grind === 'Darkslide') { fl.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI); fl.position.set(0, -BOARD.thickness - BOARD.truckHeight - BOARD.wheel, 0); }
    else if (tr && tr.prog < 1) {
      const pr = tr.prog, ease = pr * pr * (3 - 2 * pr);
      q.setFromAxisAngle(Yv.set(0, 1, 0), tr.shove * Math.PI * 2 * pr).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), tr.flip * Math.PI * 2 * ease));
      pivot.set(0, -0.04, 0); fl.quaternion.copy(q); fl.position.copy(pivot).sub(pivot.clone().applyQuaternion(q));
    } else if (s.state === 'manual' || (s.state === 'grind' && /5-0|Nosegrind/.test(s.grind || ''))) {
      const nose = s.state === 'manual' ? s.manual === 'nose' : /Nosegrind/.test(s.grind), th = (PHYSICS.manual.pitch + s.needle * 4) * Math.PI / 180;
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), nose ? th : -th); pivot.set(0, -BOARD.thickness - BOARD.truckHeight, (nose ? 1 : -1) * BOARD.wheelbase / 2);
      fl.quaternion.copy(q); fl.position.copy(pivot).sub(pivot.clone().applyQuaternion(q));
    }
  }
  function poseState() {
    const r = controls.reader.p, load = r && r.sign > 0 && !r.popped ? Math.min(1, r.deep / 55) : 0;
    return poseInput(sim, Math.max(load, controls.keys.has('Space') ? 0.8 : 0), prevRead, alpha(C));
  }

  /* ---------------- the loop ---------------- */
  const perf = { frames: new Float32Array(1200), n: 0, steps: 0, dropped: 0 };
  let last = performance.now(), titleT = 0, pushedOnce = false;
  function frame(now) {
    /* a test's held clock (`debug.hold`): the game moves only when the test steps it (`debug.stepFrame(ms, n)`: n game frames of ms each,
       drawn by the time the call returns) — a clip's frames are the game's own, none run between them (the supervisor, 10-16: stepped by the
       page's own frames between its captures, a clip at 1× ran about twice its label) */
    if (window.__wl.debug && window.__wl.debug.hold) { last = now; requestAnimationFrame(frame); return; }
    /* THE NEXT FRAME IS ASKED FOR FIRST (10-17, the owner's "doesn't respawn upon falling"; the supervisor's four conditions): a frame that
       throws never stops the game — asked after the tick, a throw in it (round 25's seat) left the game standing still, the body down, nothing
       coming back. The throw is never silent: said in the console with its stack, kept on window.__wl.faults, the sim's own fault event; the
       rider stood up at the start. The walls read every one as RED (tests/drive/frames.mjs; the kit's drive counts console errors) */
    requestAnimationFrame(frame);
    try { tick(now); } catch (e) { faulted(e); }
  }
  function faulted(e) {
    const what = String((e && e.message) || e);
    console.error('[waxline] a frame threw; the rider is stood up at the start: ' + ((e && e.stack) || what));
    (window.__wl.faults || (window.__wl.faults = [])).push({ what, t: sim.t });
    try { fall.end(); sim.fault('a frame threw: ' + what); prevRead = null; cam.ready = false; } catch (e2) { console.error('[waxline] standing the rider up threw too: ' + ((e2 && e2.stack) || e2)); }
  }
  function tick(now) {
    /* a test's clock (`debug.clockMs`): every frame moves the game by just that much, however long the frame took — a clip at 1× and a quarter, the same moments before and after a change */
    const DC = window.__wl.debug && window.__wl.debug.clockMs, ms = DC || Math.min(250, now - last); last = now; const dt = Math.min(0.1, ms / 1000);
    perf.frames[perf.n++ % perf.frames.length] = ms; stage.govern(ms);
    if (mode === 'play' && !(window.__wl.debug && window.__wl.debug.freeze)) {
      const d0 = C.dropped;
      advance(C, dt, (step, i) => {
        const input = controls.sample(i === 0); input.golden = score.golden;
        prevRead = sim.read();   // the drawn state is between this and the step after it (figure.js drawn)
        sim.step(step, input);
        if (sim.events.some((e) => e.type === 'respawn')) prevRead = sim.read();   // a respawn is a cut: nothing is drawn between the two places
        if (sim.events.length) {
          for (const e of sim.events) { if (e.type === 'bail') fall.start(e); if (e.type === 'respawn') { fall.end(); cam.ready = false; } if (e.type === 'land') window.__wl.lastLand = { quality: e.quality, t: sim.t }; }
          score.onEvents(sim.events, sim); gaps.onEvents(sim.events, sim, score); audio.onEvents(sim.events); if (sim.events.some((e) => e.type === 'push')) pushedOnce = true;
          if (sim.events.some((e) => e.type === 'land' || e.type === 'bail')) writeSave();
        }
        score.step(step, sim); run.step(step, sim, score, sim.events); perf.steps++;
      });
      perf.dropped += C.dropped - d0;
    } else titleT += dt;
    for (const h of run.drain()) {
      if (h.startsWith('goal:')) { const g = def.GOALS.find((x) => x.id === h.slice(5)); if (g) { hud.goal(g.name); audio.onEvents([{ type: 'grindStart', surface: 'rail' }]); } writeSave(); }
      else if (h.startsWith('wax:')) { const i = +h.slice(4); waxBars[i].visible = false; hud.flash('Wax ' + run.got + ' / ' + run.bars.length, 'bank'); audio.onEvents([{ type: 'grab' }]); }
    }
    if (run.on && run.left <= 0 && (sim.state === 'bail' || (sim.state === 'roll' && !score.combo))) {
      const r = run.finish(score); waxBars.forEach((w) => { w.visible = false; }); hud.results(r, def.GOALS, run.done); setMode('results'); writeSave();
    }
    if (run.on) for (const w of waxBars) if (w.visible) { w.rotation.y += dt * 1.4; w.position.y = def.RUN.wax[waxBars.indexOf(w)][1] + Math.sin(performance.now() / 500 + w.position.x) * 0.06; }
    hud.runClock(run);
    if (mode === 'play') hud.hints(!save.taught && sim.stats.distance < 25 && !pushedOnce, !save.taught && sim.stats.pops < 1, controls.owners && controls.owners.rects); else hud.hints(false, false, null);
    if (!save.taught && sim.stats.pops >= 1 && pushedOnce) { save.taught = true; writeSave(); }
    const s = poseState(); const SH = window.__wl.debug && window.__wl.debug.shot; if (SH && SH.pose) Object.assign(s, SH.pose);
    juno.gaze = mode === 'title' && !SH ? stage.camera.position : null;   // on the title she looks at the lens (its place a frame ago)
    stepFigure(SH && SH.freeze ? 0 : dt, s, juno, board, fall); if (!fall.on) placeFlipper(s);   // a picture may hold her still (a test that compares frames)
    board.userData.spin(dt, sim.state === 'roll' || sim.state === 'manual' ? Math.hypot(...sim.v) : 0);
    let target;
    if (SH) {
      /* a picture: the camera at `az` degrees round the skater from the line of travel, `dist` away, `h` up, looking at `at` metres up */
      if (SH.pos && SH.look) { stage.camera.position.set(...SH.pos); stage.camera.lookAt(...SH.look); if (stage.camera.fov !== (SH.fov || 35)) { stage.camera.fov = SH.fov || 35; stage.camera.updateProjectionMatrix(); } target = new THREE.Vector3(...SH.look); }
      else {
      const f = sim.fwd, a = (SH.az || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), hp = SH.aim && juno.bones[SH.aim] ? juno.bones[SH.aim].getWorldPosition(new THREE.Vector3()) : null;
      const bx = hp ? hp.x : board.position.x, by = hp ? hp.y - (SH.h == null ? 0 : 0) : board.position.y, bz = hp ? hp.z : board.position.z;
      const dx = f[0] * ca - f[2] * sa, dz = f[0] * sa + f[2] * ca;
      stage.camera.position.set(bx + dx * (SH.dist || 2), by + (SH.h == null ? 1 : SH.h), bz + dz * (SH.dist || 2)); stage.camera.lookAt(bx, by + (SH.at == null ? 0.9 : SH.at), bz);
      if (stage.camera.fov !== (SH.fov || 35)) { stage.camera.fov = SH.fov || 35; stage.camera.updateProjectionMatrix(); }
      target = new THREE.Vector3(bx, by, bz); }
      cam.ready = false;
    } else target = cam.update(dt, mode === 'title' ? Object.assign({}, s, { v: [Math.sin(titleT * 0.15) * 0.0001, 0, 0] }) : followed(s, fall), { bail: fall.on, body: mode === 'title' ? null : bodyPoints(juno, BODY) });
    if (mode === 'title' && !SH) {
      /* the title's camera: a slow drift round Juno from her front; upright she stands in the lower half, turned in the right half */
      const up = stage.camera.aspect < 1, a = (62 + Math.sin(titleT * 0.12) * 14) * Math.PI / 180, f = sim.fwd, dx = f[0] * Math.cos(a) - f[2] * Math.sin(a), dz = f[0] * Math.sin(a) + f[2] * Math.cos(a);
      const b = board.position, d = up ? 3.7 : 3.1, side = up ? 0 : 0.9;
      stage.camera.position.set(b.x + dx * d, b.y + (up ? 1.55 : 1.15), b.z + dz * d);
      stage.camera.lookAt(b.x - dz * side, b.y + (up ? 1.75 : 0.95), b.z + dx * side);
      const fov = up ? 58 : 46; if (stage.camera.fov !== fov) { stage.camera.fov = fov; stage.camera.updateProjectionMatrix(); }
      cam.ready = false;
    }
    stage.follow(target); pv.wind.value += dt;
    hud.update(dt, score, sim);
    audio.update({ v: sim.v, state: sim.state, surface: sim.surface, distance: sim.stats.distance });
    stage.render();
    if (!window.__wl.painted && ++paintedFrames > 2) sayReady();
  }
  let paintedFrames = 0;
  function sayReady() {
    window.__wl.painted = true;
    try { if (window.__MOSA_BOOT) window.__MOSA_BOOT.ok = true; } catch (e) { /* a page of its own */ }
    if (!B) { const l = document.getElementById('loading'); if (l) { l.style.transition = 'opacity .35s ease'; l.style.opacity = '0'; setTimeout(() => l.remove(), 380); } }
    phase(1, 'Ready');
  }
  window.addEventListener('resize', () => { stage.resize(); controls.layout(); });
  window.addEventListener('orientationchange', () => setTimeout(() => { stage.resize(); controls.layout(); }, 200));
  /* the full-screen control: offered where it can do something (view/fullscreen.js); offered again when the page leaves full screen */
  function offerFullscreen() { const why = fullscreenOffer(window); hud.fullscreen(!why); window.__wl.fullscreen = { offered: !why, why: why || '', said: (window.__wl.fullscreen && window.__wl.fullscreen.said) || '' }; }
  document.addEventListener('fullscreenchange', () => { offerFullscreen(); stage.resize(); controls.layout(); });
  offerFullscreen();
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') setMode('pause'); });
  stage.renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); setMode('pause'); });

  /* what the kit, the bot and the tests read */
  Object.assign(window.__wl, {
    look: (dx, dy) => cam.drag(dx, dy), safe: () => insets(), scoreNow: () => score.total + (score.combo ? score.running : 0), mode: () => mode, run: () => ({ on: run.on, left: run.left, got: run.got, done: [...run.done], best: run.best }),
    loadSave: () => { const s2 = readSave(), P2 = s2.parks[def.id] || {}; score.best = Math.max(score.best, P2.best || 0); for (const g of P2.gaps || []) score.gapsFound.add(g); },
    park: () => def.id, parks: () => PARKS.map((p) => ({ id: p.id, name: p.name })), switchPark: (id) => switchPark(id),
    read: () => Object.assign(sim.read(), { stats: Object.assign({}, sim.stats), score: { total: score.total, best: score.best, combo: score.live(sim), counts: Object.assign({}, score.counts), gaps: [...score.gapsFound], special: score.special } }),
    perf: () => { const n = Math.min(perf.n, perf.frames.length), a = Array.from(perf.frames.subarray(0, n)).sort((x, y) => x - y); return { frames: n, p50: a[n >> 1], p95: a[Math.floor(n * 0.95)], long: a.filter((x) => x > 33.4).length / Math.max(1, n), steps: perf.steps, dropped: perf.dropped, dpr: stage.dpr, step: stage.step, tier: tier.name, samples: controls.samplesPerSecond() }; },
    ledger: () => ({ totalMb: +(ledger.total() / 1048576).toFixed(1), rows: ledger.list(), triangles: { park: pv.tris, skater: juno.tris, board: board.userData.triangles }, drawCalls: stage.renderer.info.render.calls, gpuTris: stage.renderer.info.render.triangles }),
    debug: {
      hold: false, stepFrame: (ms, n = 1) => { for (let i = 0; i < n; i++) tick(last + ms); },
      /* frames as a display hands them (the supervisor's A): each entry a frame's stamp after the first (ms), the game run one frame per
         stamp — the drawn board's place each frame and the frame's own time, for THE DRAWN MOTION IS EVEN */
      stampFrames: (stamps) => { const t0 = last, out = []; let prevT = 0; for (const T of stamps) { tick(t0 + T); out.push({ ms: T - prevT, p: board.position.toArray(), v: sim.v.slice() }); prevT = T; } return out; },
      place: (at, heading, speed) => { fall.end(); sim.respawnAt(at, heading, speed || 0); prevRead = null; score.timed = null; cam.ready = false; },
      assist: (name) => setAssist(name), mode: (m) => setMode(m), look: (name) => setLook(name), runner: run, waxBars, sim, score, world, stage, cam, juno, board, controls, THREE, fall, body: () => bodyPoints(juno, BODY), framed: () => framed(stage.camera, bodyPoints(juno, BODY), world, cam.occ), sight: (a, b) => firstHit(world, cam.occ, a, b), covered: (p) => covered(world, cam.occ, p), censusBox: CENSUS_BOX, sky: stage.sky,
      marks: (k) => { stage.scene.traverse((o) => { const m = o.material; if (m && m.userData && m.userData.uMarks) m.userData.uMarks.value = k; }); },
      cloth: (k) => { juno.cloth.value = k; }, clothParts: (relief, colours) => { juno.clothParts.value.set(relief, colours); },
    },
  });
  /* what the debug object hands a test is the park now in place (a switch makes them again) */
  function expose() { Object.assign(window.__wl.debug, { runner: run, waxBars, sim, score, world, cam, fall }); }
  setMode('title');
  requestAnimationFrame((t) => { last = t; frame(t); });
}
window.__wl = { painted: false, playing: false };
boot().catch((e) => { console.error('[waxline] boot failed', e); try { if (window.__mosaBoot) window.__mosaBoot({ ok: false, error: String(e && e.message || e) }); } catch (x) { /* a page of its own */ } const w = document.querySelector('#loading [data-mosa-phase]'); if (w) w.textContent = 'Could not start: ' + (e && e.message || e); });
