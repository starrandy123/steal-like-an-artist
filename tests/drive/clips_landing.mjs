/* THE LANDING RELEASE'S CLIPS (R1.9, R7.3; the supervisor, 10-17: "the drop-ins at 1/3/5/7, the honest crashes' rows, the coping grinds, the
 * stamp-list clip"), each made the same way on any build so a build before and after can be set side by side (tests/clips.sh). EVERY CLIP
 * SHOWS A CASE ITS WALL READS, from the wall's own start — never one written from memory (10-17: the first coping pair was a corner air that
 * lands in the bowl held or not, and the first drop-ins started 5 m back, so the 1 m/s one never reached its rim):
 *   dropin_basin_<v>   the surfaces wall's 'The Basin, into it over its rim' at 1, 3, 5 and 7 m/s (Cruise), a metre back from its coping
 *                      (tests/surfaces.mjs INTO) — the drop-in the roll can't hold (item 1: "the drop-in starts with a quick snap, and the
 *                      board hangs on the edge for a moment");
 *   dropin_dq_5        the wall's 'The Deck Quarter, into it from its deck' at 5 m/s;
 *   k2_sunbank_drop_8  the Sun Bank Drop popped at 8 m/s on Classic — a falling board into the block's face: an honest crash, never a lift
 *                      (item 2: "the board can pop up as much as 25 cm in a single frame on some landings");
 *   k3_eastwall_z24_9  East Wall z 24 at 9 m/s on Cruise, a grab held in the air, nobody steering after — late, the board rolls fakie into
 *                      the Pad's face (K3: once lifted onto it, now met);
 *   k3_spine_e_z24_85  the Spine from the east z 24 at 8.5 on Classic, the same;
 *   coping_e40_65_*    the coping wall's 'Basin, east wall +40° @6.5' on Cruise (tests/coping_capture.mjs): _free with nothing held — it comes
 *                      back down into the bowl, never onto the coping it left (item 3, the coping: "angled airs in the bowl can still catch
 *                      the edge as an unwanted grind"); _held with G held from the top of the air to the lock (the wall's own ask), then
 *                      let go as a player lets go once on the coping — the coping ground (held on, a landing with the grab still down is a
 *                      bail: measured 10-17, the 6.5 m/s Boardslide stalled after 0.67 s, fell back in and bailed with G still held);
 *   coping_e25_85_*    its 'Basin, east wall +25° @8.5', the same pair above riders' measured top speed: _free carries over the coping and
 *                      lands on the deck (measured 10-17: at 8.5 m/s the Basin's ±25° slanted airs land on the deck and its ±40° at the
 *                      wall's top; at 6.5 every slanted air comes back into its ramp); _held grinds the coping it left;
 *   coping_e40_85_free the Basin's +40° @8.5 on Cruise, nothing held: it lands at the wall's top at the lip's height and rolls on down into the
 *                      bowl (the supervisor, 10-17: "One clip of a ±40° @8.5 lip landing");
 *   raw_teeter_e40_65  the Basin's +40° @6.5 on RAW, nothing held: it clears the lip by 6 cm, lands its middle on the coping and tips back in —
 *                      the bowl edge the owner named, his to see;
 *   transfer_lawn_m40_9 the Lawn Quarter -40° @9 on Cruise, nothing held: it flies onto the BASIN's coping, a coping it did not leave, and
 *                      catches it as a 50-50 (the coping it leaves never catches);
 *   raw_fence_lawn_p40_9 the Lawn Quarter +40° @9 on Raw: into the west fence's top — it hung in the air there on r24; it slides down the fence;
 *   spine_end_pop_3    a pop at the Spine's end at 3 m/s on Cruise: its deck comes down on that coping's end — it hung in the air there on
 *                      r24; it hangs up, the rider goes over.
 * From the game's own follow camera at 1× (upright and turned) and, for the drop-ins and K2, from the side at a quarter (upright). The clock
 * is held (debug.hold, debug.stepFrame); each clip says, off its frames as drawn: the deck's speed change over two frames, the largest move the
 * deck takes and gives back, and the body's turn stepping (the chest's turn rate's largest change in a frame) — each with the frame's state
 * and the events beside it; and every event of the ride with its frame. EVERY STEP'S EVENTS ARE READ: a frame runs several sim steps and the
 * sim clears its events at each step's start, so the clip collects them at each step (a hook on the sim's step) — read once a frame, they
 * lost a bail and a grind between two frames (10-17: K3 on East Wall said "bail" turned and nothing upright, the same ride).
 * THE CLIP RIDES WHAT IT ASKED: the game pops on the Space key's RELEASE (input/touch.js), and the clips once "released" Space at every
 * clip's end — every clip after the first began with an ollie nobody asked for (10-17, read off the first frames). A key is released only
 * when the clip holds it, every pop the game makes must be one the clip asked for, and a clip begins rolling where it was placed: otherwise
 * the drive is RED. A respawn is a cut (main.js draws nothing between the two places): the frames about it are no motion to read — marked
 * by the sim's OWN respawn event, never by a size. A JUMP IS A CUT OR IT IS NOT THERE: outside a cut the drawn deck never takes and gives
 * back more than the board itself moves over those frames (its fastest speed there × their time) plus the board stage's own resolution,
 * 1 cm (tests/lib/chain.mjs: the drawn board on the sim's frame) — a teleport the sim did not say is RED (10-17, the supervisor: a skip by
 * size would hide a real 5 m jump; walled on a build with a silent 5 m teleport, one way and left there, and with the cut forgotten).
 * THE SLOW CLIP IS THE SAME RIDE (the supervisor, 10-17): a frame at 1× runs four sim steps and one at a quarter runs one, so a clip that
 * asked whenever it read a frame asked a quarter clip's pop on another step — K2 crashed into the wall at 1× and hung up at a quarter, two
 * rides. Every ask is made on the 1× frame's grid of sim steps (GRID), so both ride the same steps, and the two event lists must be equal
 * step for step, or the drive is RED. THE CLIP IS DRAWN AT ONE PHASE, EVERY TIME: the page draws the sim BETWEEN its last two steps, at the
 * clock's leftover over a step (formulas/step.js alpha), and the real time before the hold left that leftover anywhere — the same sim drew
 * K2's 61° board pitch at its 1× frame 41 in one page load and not in the next (10-17, measured: the sim identical to the millimetre). One
 * 100 ms frame runs its six steps and drops the rest (advance: the leftover set to 0), then a frame of half a step: every clip is placed at
 * alpha 0.5, the middle of a step. Never at 0: there the leftover sits ON a step's boundary and the float's last bit decides whether a step
 * runs now or a tick later — measured, the first 1× frame then ran 3 steps, every ask fell off the grid and K2 never popped. Two page loads
 * draw the same frames: CLIPS_DUMP=<file> writes each frame's drawn deck and chest, and tests/drive/clip_twice.mjs compares two loads.
 * The stamp-list clip is clips_v13.mjs's own (CLIPS=stamps). CLIPS=<name,name> for a subset. */
import fs from 'node:fs'; import path from 'node:path';
const RUNS = [
  ...[1, 3, 5, 7].map((v) => ({ name: 'dropin_basin_' + v, at: [17, 0, 10], hd: 270, v, preset: 'cruise', secs: Math.max(1.6, 1 / v + 1.5), side: true })),
  { name: 'dropin_dq_5', at: [22, 2.63, 38], hd: 90, v: 5, preset: 'cruise', secs: 1.8, side: true },
  { name: 'k2_sunbank_drop_8', at: [45.5, 0.8, 37], hd: 180, v: 8, preset: 'classic', secs: 2.2, side: true, pop: (p) => p[2] <= 32.5 },
  { name: 'k3_eastwall_z24_9', at: [50.5, 0, 24], hd: 90, v: 9, preset: 'cruise', secs: 8, grab: 0.12 },
  { name: 'k3_spine_e_z24_85', at: [14.5, 0, 24], hd: 270, v: 8.5, preset: 'classic', secs: 8, grab: 0.12 },
  { name: 'coping_e40_65_free', at: [9, -1.83, 10], hd: 130, v: 6.5, preset: 'cruise', secs: 3.5 },
  { name: 'coping_e40_65_held', at: [9, -1.83, 10], hd: 130, v: 6.5, preset: 'cruise', secs: 3.5, grabTop: true },
  { name: 'coping_e25_85_free', at: [9, -1.83, 10], hd: 115, v: 8.5, preset: 'cruise', secs: 3.5 },
  { name: 'coping_e25_85_held', at: [9, -1.83, 10], hd: 115, v: 8.5, preset: 'cruise', secs: 3.5, grabTop: true },
  { name: 'coping_e40_85_free', at: [9, -1.83, 10], hd: 130, v: 8.5, preset: 'cruise', secs: 3.5 },
  { name: 'raw_teeter_e40_65', at: [9, -1.83, 10], hd: 130, v: 6.5, preset: 'raw', secs: 3.5 },
  { name: 'transfer_lawn_m40_9', at: [6, 0, 24], hd: 230, v: 9, preset: 'cruise', secs: 4 },
  { name: 'raw_fence_lawn_p40_9', at: [6, 0, 24], hd: 310, v: 9, preset: 'raw', secs: 3.5 },
  { name: 'spine_end_pop_3', at: [8.6, 0, 17.4], hd: 0, v: 3, preset: 'cruise', secs: 3, pop: (p) => p[2] >= 18.9 },
];
/* the 1× frame in sim steps: two 60 Hz ticks of two 120 Hz steps (main.js tick → advance; PHYSICS.step) — every ask lands on this grid */
const GRID = 4;
const ONLY = process.env.CLIPS ? process.env.CLIPS.split(',') : null;
const rodeOther = [], jumped = [], sameRide = [], rides = new Map();
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const tag = page.viewportSize().width < page.viewportSize().height ? 'up' : 'turn';
  const play = await t.eval(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const fr0 = await (await t.game().frameElement()).boundingBox();
  await t.tap(fr0.x + play[0], fr0.y + play[1]); await t.sleep(700);
  /* every sim step's events with the step they came on, kept until the frame reads them (the page calls sim.step on the sim itself: main.js) */
  await t.eval(() => { const sim = window.__wl.debug.sim; if (sim.__clipEv) return; sim.__clipEv = []; sim.__clipSteps = 0; const step = sim.step.bind(sim);
    sim.step = (...a) => { const r = step(...a); sim.__clipSteps++; for (const e of sim.events) sim.__clipEv.push([sim.__clipSteps, e.type + (e.why ? ':' + e.why : '') + (e.name ? ':' + e.name : '') + (e.quality ? ':' + e.quality : '')]); return r; }; });
  const key = (code, down) => t.eval(([code, down]) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code })), [code, down]);
  const dir = (name) => { const d = path.join(t.outDir, name); fs.mkdirSync(d, { recursive: true }); return d; };
  const frame = (ms, per) => t.eval(([ms, per]) => {
    const D = window.__wl.debug; D.stepFrame(ms, per);
    const gl = D.stage.renderer.domElement, c = document.createElement('canvas'), w = 540, h = Math.round(540 * gl.height / gl.width); c.width = w; c.height = h; c.getContext('2d').drawImage(gl, 0, 0, w, h);
    const T = D.THREE, b = D.board.getWorldPosition(new T.Vector3()), q = D.juno.bones.chest.getWorldQuaternion(new T.Quaternion()), ev = D.sim.__clipEv.splice(0);
    return { jpg: c.toDataURL('image/jpeg', 0.86).split(',')[1], b: b.toArray(), q: [q.x, q.y, q.z, q.w], state: D.sim.state, p: D.sim.p.slice(), vy: D.sim.v[1], spd: Math.hypot(D.sim.v[0], D.sim.v[1], D.sim.v[2]), airT: D.sim.air ? D.sim.t - D.sim.air.t0 : null, steps: D.sim.__clipSteps, events: ev.map((x) => x[1]), evSteps: ev };
  }, [ms, per]);
  for (const R of RUNS) {
    if (ONLY && !ONLY.includes(R.name)) continue;
    for (const [cam, speed] of [['follow', 1], ['side', 0.25]]) {
      if (cam === 'side' && (!R.side || tag === 'turn')) continue;
      const name = R.name + '_' + cam + '_' + (speed === 1 ? '1x' : 'quarter') + '_' + tag, out = dir(name), n = Math.round(R.secs * 30 / speed);
      await t.eval(([R, cam]) => { const D = window.__wl.debug; D.assist(R.preset); D.hold = true; D.clockMs = 0; D.freeze = false;
        D.stepFrame(100); D.stepFrame(1000 / 240);   // the clock's leftover dropped, then half a step: every clip drawn at alpha 0.5 (formulas/step.js)
        D.place(R.at, R.hd, R.v); D.sim.__clipEv.length = 0; D.sim.__clipSteps = 0;
        D.shot = cam === 'side' ? { az: 90, dist: 3.4, h: 0.9, at: 0.6, fov: 46 } : null; }, [{ at: R.at, hd: R.hd, v: R.v, preset: R.preset }, cam]);
      const ms = speed === 1 ? 1000 / 60 : 1000 / 120, per = speed === 1 ? 2 : 1, dtF = (ms * per) / 1000, F = [], seen = new Map(), said = [];
      let popped = false, grabbed = false, gDown = false; const asked = [];
      for (let f = 0; f < n; f++) {
        const last = F[F.length - 1];
        if (last && last.steps % GRID === 0) {   // an ask only on the 1× frame's grid: the 1× and the quarter ride the same steps
          if (R.pop && !popped && last.state === 'roll' && R.pop(last.p)) { await key('Space', true); await key('Space', false); popped = true; asked.push(f); }
          if (R.grab != null && !grabbed && last.state === 'air' && last.airT != null && last.airT > R.grab) { await key('KeyG', true); grabbed = gDown = true; }
          if (R.grabTop && !grabbed && last.state === 'air' && last.vy <= 0) { await key('KeyG', true); grabbed = gDown = true; }   // the coping wall's ask: from the top
          if (gDown && !R.hold && last.state !== 'air') { await key('KeyG', false); gDown = false; }
        }
        const r = await frame(ms, per); fs.writeFileSync(path.join(out, String(f).padStart(4, '0') + '.jpg'), Buffer.from(r.jpg, 'base64')); F.push(r);
        for (const e of r.events) if (/^pop|takeoff|land|bail|grab|grindStart|grindEnd|scrape|respawn/.test(e)) { if (seen.get(e) !== f - 1 && seen.get(e) !== f) said.push(e + '@' + f); seen.set(e, f); }   // a run of the same event said once
      }
      if (gDown) { await key('KeyG', false); gDown = false; }   // only a key the clip holds (a Space release is a pop)
      if (process.env.CLIPS_DUMP) fs.appendFileSync(process.env.CLIPS_DUMP, JSON.stringify({ name, frames: F.map((r) => ({ b: r.b, q: r.q, steps: r.steps, state: r.state })) }) + '\n');
      /* what the clip asked, against what the game did */
      const pops = F.flatMap((r, i) => (r.events.some((e) => /^pop/.test(e)) ? [i] : [])), unasked = pops.filter((i) => !asked.some((a) => i >= a && i <= a + 2)), start = F.slice(0, 3).map((r) => r.state);
      if (unasked.length || start.some((s) => s !== 'roll')) { rodeOther.push(name + (unasked.length ? ': a pop the clip did not ask for at frame ' + unasked.join(', ') : '') + (start.some((s) => s !== 'roll') ? ': began ' + start.join(' → ') + ', not rolling where it was placed' : '')); }
      /* the same ride at 1× and at a quarter: every event with its step, over the steps both rode */
      const evAll = F.flatMap((r) => r.evSteps), span = F.length ? F[F.length - 1].steps : 0;
      if (R.side) { if (cam === 'follow') rides.set(R.name, { ev: evAll, span }); else { const a = rides.get(R.name);
        if (!a) sameRide.push(name + ': its 1× ride was not made in this drive');
        else { const upTo = Math.min(a.span, span), x = a.ev.filter((e) => e[0] <= upTo), y = evAll.filter((e) => e[0] <= upTo); let k = 0; while (k < x.length && k < y.length && x[k][0] === y[k][0] && x[k][1] === y[k][1]) k++;
          if (k < x.length || k < y.length) sameRide.push(name + ': the 1× said ' + (x[k] ? x[k][1] + '@step ' + x[k][0] : 'nothing more') + ', the quarter ' + (y[k] ? y[k][1] + '@step ' + y[k][0] : 'nothing more') + ' (' + k + ' events alike before it, over ' + upTo + ' steps)'); else sameRide.push('✓' + R.name + ' (' + x.length + ' events over ' + upTo + ' steps)'); } } }
      const cut = new Set(F.flatMap((r, i) => (r.events.some((e) => /^respawn/.test(e)) ? [i - 1, i, i + 1, i + 2, i + 3] : [])));
      const sp = F.map((r, i) => (i ? Math.hypot(r.b[0] - F[i - 1].b[0], r.b[1] - F[i - 1].b[1], r.b[2] - F[i - 1].b[2]) / dtF : null));
      let fall = { v: 0 }, jump = { v: 0 }, turnStep = { v: 0 }, teleport = null;
      for (let i = 3; i < F.length; i++) {
        if (cut.has(i) || cut.has(i - 1) || cut.has(i - 2)) continue;   // a respawn's cut is no motion
        const a = sp[i - 2], b = sp[i]; if (a != null && b != null && F[i].state !== 'bail') { const ch = Math.abs(b - a) / Math.max(a, b, 1e-6); if (b < a && ch > fall.v) fall = { v: ch, a, b, i }; }
        const P = [F[i - 3].b, F[i - 2].b, F[i - 1].b, F[i].b], d1 = [0, 1, 2].map((k) => P[2][k] - 2 * P[1][k] + P[0][k]), d2 = [0, 1, 2].map((k) => P[3][k] - 2 * P[2][k] + P[1][k]);
        if (d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2] < 0 && F[i].state !== 'bail') { const j = Math.min(Math.hypot(...d1), Math.hypot(...d2)); if (j > jump.v) jump = { v: j, i: i - 1 };
          const cap = Math.max(F[i - 3].spd, F[i - 2].spd, F[i - 1].spd, F[i].spd) * dtF + 0.01; if (j > cap && (!teleport || j > teleport.v)) teleport = { v: j, cap, i: i - 1 }; }
      }
      const rate = (q0, q1) => { let d = q1[3] * q0[3] + q1[0] * q0[0] + q1[1] * q0[1] + q1[2] * q0[2]; d = Math.min(1, Math.abs(d)); return 2 * Math.acos(d) / dtF; };
      const W = F.map((r, i) => (i ? rate(F[i - 1].q, r.q) : 0));
      for (let i = 2; i < W.length; i++) { if (F[i].state === 'bail' || F[i - 1].state === 'bail' || cut.has(i) || cut.has(i - 1)) continue; const al = Math.abs(W[i] - W[i - 1]) / dtF; if (al > turnStep.v) turnStep = { v: al, i }; }
      /* a frame's own context: its state (and the one before, when it changed) and the events of the frames about it */
      const near = (i) => { if (!i) return '-'; const st = F[i - 1] && F[i - 1].state !== F[i].state ? F[i - 1].state + '→' + F[i].state : F[i].state, ev = [i - 1, i, i + 1].flatMap((k) => (F[k] ? F[k].events.filter((e) => /takeoff|land|bail|grab|grind|respawn/.test(e)) : [])); return i + ', ' + st + (ev.length ? ', ' + ev.join(' ') : ''); };
      if (teleport) jumped.push(name + ': ' + (100 * teleport.v).toFixed(1) + ' cm taken and given back at frame ' + near(teleport.i) + ' (the board moves ' + (100 * teleport.cap - 1).toFixed(1) + ' cm there, + 1)');
      t.log('clip ' + name + ': ' + n + ' frames · ' + (said.join(' ') || 'no event') + ' · the deck\'s speed over two frames falls at most ' + (100 * fall.v).toFixed(0) + ' % (frame ' + near(fall.i) + ') · the deck takes and gives back at most ' + (100 * jump.v).toFixed(1) + ' cm (frame ' + near(jump.i) + ') · the chest\'s turn steps at most ' + turnStep.v.toFixed(0) + ' rad/s² (frame ' + near(turnStep.i) + ')');
    }
  }
  await t.eval(() => { const D = window.__wl.debug; D.hold = false; D.clockMs = 0; D.shot = null; D.assist('cruise'); });
  t.log((rodeOther.length ? '✖ ' : '✔ ') + 'THE CLIPS RODE WHAT THEY ASKED: ' + (rodeOther.length ? rodeOther.join(' · ') : 'every pop one a clip asked for, every clip rolling where it was placed'));
  t.log((jumped.length ? '✖ ' : '✔ ') + 'A JUMP IS A CUT OR IT IS NOT THERE: ' + (jumped.length ? jumped.join(' · ') : 'outside a respawn\'s cut, every clip\'s drawn deck took and gave back no more than the board moved, + 1 cm'));
  const differ = sameRide.filter((x) => !x.startsWith('✓')), alike = sameRide.filter((x) => x.startsWith('✓')).map((x) => x.slice(1));
  t.log((differ.length ? '✖ ' : '✔ ') + 'THE SLOW CLIP IS THE SAME RIDE: ' + (differ.length ? differ.join(' · ') : (alike.length ? 'every quarter clip\'s events equal its 1×\'s step for step — ' + alike.join(', ') : 'no slow clip in this drive')));
  return t.errors.length === 0 && rodeOther.length === 0 && jumped.length === 0 && differ.length === 0;
}
