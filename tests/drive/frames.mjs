/* A FRAME THAT THROWS NEVER STOPS THE GAME, AND IS NEVER SILENT (10-17, the owner: "The character doesn't respawn upon falling"; the
 * supervisor's four conditions). The page played through a fall into a wall for 6 s: its game clock read every half second (the sim's time
 * moves only while the page's frames come), the faults the page said (window.__wl.faults: each frame that threw), every console error and
 * page error the drive heard, and where the rider is at the end. GREEN only when the frames kept coming, no fault was said and no error read.
 *   a throw planted in the sim's step, the page's guard in place → the frames keep coming, the fault is said and counted, the rider is back
 *     at the start: RED ("✖ THE GAME SAID A FAULT")
 *   the same throw, the guard removed → the frames stop: RED ("✖ THE FRAMES STOPPED")
 * Plants (tests/plants.mjs): sim_step_throws, frame_guard_removed — each in Chromium and in WebKit. */
export default async function (page, t) {
  for (let i = 0; i < 200; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const play = await t.eval(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await t.tap(play[0], play[1]); await t.sleep(800);
  await t.eval(() => window.__wl.debug.place([44, 0, 20], 0, 8));   // into a wall at 8 m/s: a fall, and its respawn
  const clock = [];
  for (let k = 0; k <= 12; k++) { clock.push(await t.eval(() => window.__wl.debug.sim.t)); await t.sleep(500); }
  const moved = clock[clock.length - 1] - clock[0], stalls = clock.slice(1).filter((c, i) => c - clock[i] < 1e-6).length;
  const end = await t.eval(() => { const s = window.__wl.debug.sim, n = window.__wl.debug.world.data.nodes[0]; return { faults: window.__wl.faults || [], state: s.state, falls: s.stats.bails, back: s.stats.respawns, simFaults: s.stats.faults || 0, atStart: Math.hypot(s.p[0] - n[0], s.p[2] - n[2]) < 1.5 }; });
  const frames = moved > 4 && stalls === 0;
  t.log((frames ? '✔ ' : '✖ THE FRAMES STOPPED — ') + 'the game clock moved ' + moved.toFixed(2) + ' s in 6 s of the page, ' + stalls + ' half seconds without a frame');
  t.log((end.faults.length ? '✖ THE GAME SAID A FAULT — ' : '✔ ') + 'faults said: ' + end.faults.length + (end.faults.length ? ' (the last: ' + end.faults[end.faults.length - 1].what + ' at ' + end.faults[end.faults.length - 1].t.toFixed(2) + ' s; the sim counted ' + end.simFaults + '; the rider ' + (end.atStart ? 'back at the start' : 'NOT at the start') + ')' : ''));
  t.log('the fall: ' + end.falls + ' fallen, ' + end.back + ' back up, the state at the end ' + end.state);
  t.log('errors', JSON.stringify(t.errors.slice(0, 4)));
  return frames && end.faults.length === 0 && t.errors.length === 0 && end.falls >= 1 && end.back >= 1;
}
