/* CLIPS OF HOW HE MOVES (the supervisor, 10-16: motion is judged moving): three sequences played by real touches (CDP), timed by GAME frames
 * on the test's clock (`debug.clockMs`: every frame moves the game by just that much), so a build before a change and after it see the same
 * moments — a push from rest; a carve at speed; an ollie, a kickflip and an ollie with a grab; a grind on the Main Ledge. Each from the game's own
 * follow camera and from a camera at his side (4 m for the push: at 2.6 the back foot at full stretch was out of the picture), at 1× and at a
 * quarter. THE CLOCK IS HELD (`debug.hold`): the game moves only when the clip steps it, exactly its share a frame — at 1× two of the page's
 * own 60 Hz frames, at a quarter one sim step — and the frame is read in the same call (the supervisor, 10-16: stepped by the page's frames
 * between captures, a 1× clip ran about twice its label). The frames are written as JPEG under the out folder, one folder a clip;
 * tests/clips.sh makes the films and the contact sheets.
 *   CLIPS=<seq,seq> CAMS=<cam,cam> SPEEDS=<1,0.25>: a subset (all by default). */
import fs from 'node:fs'; import path from 'node:path';
const SEQS = (process.env.CLIPS || 'push,carve,tricks,grind').split(','), CAMS = (process.env.CAMS || 'follow,side').split(','), SPEEDS = (process.env.SPEEDS || '1,0.25').split(',').map(Number);
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const tag = page.viewportSize().width < page.viewportSize().height ? 'up' : 'turn';
  const play = await t.eval(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await t.tap(play[0], play[1]); await t.sleep(700);
  /* THE INPUTS ARE KEYS sent inside the game's frame, on game frames: the same moments every run (touches land between the game's steps at
     real times — two runs of one push reached 5.89 and 5.31 m/s, and one carve went into the bowl). W pushes, A and D carve, Space pops, J
     held makes the pop a kickflip, G grabs */
  const key = (code, down) => t.eval(([code, down]) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code })), [code, down]);
  const press = async (code) => { await key(code, true); await key(code, false); };
  /* each sequence: where it starts (checked in the sim for a clean run: from [30, 0, 14] heading 90 the push ran into a box at 2.5 s), and
     what the keys do at which game frame (30 a game second) */
  const SEQ = {
    push: { at: [36, 0, 14], hd: 270, v: 0, secs: 3.0, acts: { 0: () => key('KeyW', true), 78: () => key('KeyW', false) } },
    /* (a carve after the push ran into the bowls off the plaza: the carve starts on its own at speed, checked in the sim both ways) */
    carve: { at: [36, 0, 14], hd: 270, v: 5, secs: 2.2, acts: { 6: () => key('KeyD', true), 60: () => key('KeyD', false) } },
    tricks: { at: [44, 0, 14], hd: 270, v: 4.5, secs: 4.0, acts: { 9: () => press('Space'), 48: async () => { await key('KeyJ', true); await press('Space'); await key('KeyJ', false); }, 90: () => press('Space'), 96: () => key('KeyG', true), 112: () => key('KeyG', false) } },
    grind: { at: [21, 0, 22.7], hd: 90, v: 5.6, secs: 3.2, acts: { until: () => press('Space') } },
  };
  const shot = (cam, seq) => t.eval(([cam, seq]) => { const D = window.__wl.debug; D.shot = cam === 'side' ? (seq === 'push' ? { az: 90, dist: 4.0, h: 1.0, at: 0.8, fov: 42 } : { az: 90, dist: 2.6, h: 0.95, at: 0.85, fov: 42 }) : null; }, [cam, seq]);
  const dir = (name) => { const d = path.join(t.outDir, name); fs.mkdirSync(d, { recursive: true }); return d; };
  for (const seq of SEQS) for (const cam of CAMS) for (const speed of SPEEDS) {
    if (cam === 'follow' && speed !== 1) continue;           // the quarter speed from the side, where the limbs read
    if (tag === 'turn' && (cam !== 'follow' || speed !== 1)) continue;   // turned: the game's own camera at 1×
    const S = SEQ[seq], name = seq + '_' + cam + '_' + (speed === 1 ? '1x' : 'quarter') + '_' + tag, out = dir(name), n = Math.round(S.secs * 30 / speed);
    await t.eval(([at, hd, v]) => { const D = window.__wl.debug; D.hold = true; D.clockMs = 0; D.place(at, hd, v); }, [S.at, S.hd, S.v]); await shot(cam, seq);
    const ms = speed === 1 ? 1000 / 60 : 1000 / 120, per = speed === 1 ? 2 : 1;   // 1×: two page frames a clip frame (1/30 s); a quarter: one sim step (1/120 s)
    let fired = false;
    for (let f = 0; f < n; f++) {
      const gf = Math.floor(f * speed);                         // the game frame at 30 a second
      if (S.acts[gf] && f === Math.ceil(gf / speed)) await S.acts[gf]();
      if (S.acts.until && !fired && (await t.eval(() => window.__wl.debug.sim.p[0])) >= 25.9) { fired = true; await S.acts.until(); }
      const jpg = await t.eval(([ms, per]) => { const D = window.__wl.debug; D.stepFrame(ms, per); const gl = D.stage.renderer.domElement, c = document.createElement('canvas'), w = 540, h = Math.round(540 * gl.height / gl.width); c.width = w; c.height = h; c.getContext('2d').drawImage(gl, 0, 0, w, h); return c.toDataURL('image/jpeg', 0.86).split(',')[1]; }, [ms, per]);
      fs.writeFileSync(path.join(out, String(f).padStart(4, '0') + '.jpg'), Buffer.from(jpg, 'base64'));
    }
    for (const c of ['KeyW', 'KeyA', 'KeyD', 'KeyJ', 'KeyG']) await key(c, false);
    const where = await t.eval(() => { const D = window.__wl.debug; D.hold = false; D.clockMs = 0; return { p: D.sim.p.map((v) => +v.toFixed(2)), t: +D.sim.t.toFixed(3), v: +Math.hypot(D.sim.v[0], D.sim.v[2]).toFixed(2) }; });
    t.log('clip ' + name + ': ' + n + ' frames · the sim at ' + where.t + ' s of its own, at ' + where.p.join(',') + ', ' + where.v + ' m/s');
  }
  await t.eval(() => { window.__wl.debug.shot = null; });
  return t.errors.length === 0;
}
