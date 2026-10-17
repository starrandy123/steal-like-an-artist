/* ROUND 21'S OWN CLIPS (the supervisor, 10-16), each made the same way on any build so a build before and after can be set side by side:
 *   rollin  the Basin's rim rolled into at 7 m/s, from the game's follow camera and from the side, at 1× and at a quarter, the clock held
 *           (`debug.hold`, `debug.stepFrame`) — and three readings off the frames themselves: the deck's speed (its largest change over two
 *           frames), the largest move the deck takes and gives back, and the body's turn stepping (the chest's turn: its rate's largest change
 *           in a frame, as an acceleration);
 *   stamps  the plaza at 4 m/s, a steady roll then a push (W held), its frames timed as a 60 Hz display stamps them after a hitch (the clock
 *           left on a step's edge), each stamp coarsened to 0.1 ms — one picture a display frame, so the film at 60 frames a second plays at
 *           1× and the pacing is SEEN, not only measured.
 * JPEG frames under the out folder, one folder a clip; tests/clips.sh makes the films (a 60 fps film: CLIP_FPS=60). CLIPS=<rollin,stamps>. */
import fs from 'node:fs'; import path from 'node:path';
const SEQS = (process.env.CLIPS || 'rollin,stamps').split(',');
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const tag = page.viewportSize().width < page.viewportSize().height ? 'up' : 'turn';
  const play = await t.eval(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await t.tap(play[0], play[1]); await t.sleep(700);
  const key = (code, down) => t.eval(([code, down]) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code })), [code, down]);
  const dir = (name) => { const d = path.join(t.outDir, name); fs.mkdirSync(d, { recursive: true }); return d; };
  /* one frame: the game moved by `ms` in `per` page frames, the picture taken in the same call, and what the readings need */
  const frame = (ms, per) => t.eval(([ms, per]) => {
    const D = window.__wl.debug; D.stepFrame(ms, per);
    const gl = D.stage.renderer.domElement, c = document.createElement('canvas'), w = 540, h = Math.round(540 * gl.height / gl.width); c.width = w; c.height = h; c.getContext('2d').drawImage(gl, 0, 0, w, h);
    const T = D.THREE, b = D.board.getWorldPosition(new T.Vector3()), q = D.juno.bones.chest.getWorldQuaternion(new T.Quaternion());
    return { jpg: c.toDataURL('image/jpeg', 0.86).split(',')[1], b: b.toArray(), q: [q.x, q.y, q.z, q.w], over: !!D.sim.over, state: D.sim.state };
  }, [ms, per]);
  for (const seq of SEQS) {
    if (seq === 'rollin') for (const cam of ['follow', 'side']) for (const speed of [1, 0.25]) {
      if (cam === 'follow' && speed !== 1) continue;
      if (tag === 'turn' && cam !== 'follow') continue;
      const name = 'rollin_' + cam + '_' + (speed === 1 ? '1x' : 'quarter') + '_' + tag, out = dir(name), secs = 1.6, n = Math.round(secs * 30 / speed);
      await t.eval(([cam]) => { const D = window.__wl.debug; D.hold = true; D.clockMs = 0; D.freeze = false; D.place([21, 0, 10], 270, 7); D.shot = cam === 'side' ? { az: 90, dist: 3.2, h: 0.9, at: 0.6, fov: 46 } : null; }, [cam]);
      const ms = speed === 1 ? 1000 / 60 : 1000 / 120, per = speed === 1 ? 2 : 1, dtF = (ms * per) / 1000, F = [];
      for (let f = 0; f < n; f++) { const r = await frame(ms, per); fs.writeFileSync(path.join(out, String(f).padStart(4, '0') + '.jpg'), Buffer.from(r.jpg, 'base64')); F.push(r); }
      /* the readings, off the frames as drawn */
      const sp = F.map((r, i) => (i ? Math.hypot(r.b[0] - F[i - 1].b[0], r.b[1] - F[i - 1].b[1], r.b[2] - F[i - 1].b[2]) / dtF : null));
      let fall = { v: 0 }, rise = { v: 0 }, jump = { v: 0 }, turnStep = { v: 0 };
      for (let i = 3; i < F.length; i++) {
        const a = sp[i - 2], b = sp[i]; if (a != null && b != null) { const ch = Math.abs(b - a) / Math.max(a, b, 1e-6); if (b < a && ch > fall.v) fall = { v: ch, a, b, i }; if (b > a && ch > rise.v) rise = { v: ch, a, b, i }; }
        const P = [F[i - 3].b, F[i - 2].b, F[i - 1].b, F[i].b], d1 = [0, 1, 2].map((k) => P[2][k] - 2 * P[1][k] + P[0][k]), d2 = [0, 1, 2].map((k) => P[3][k] - 2 * P[2][k] + P[1][k]);
        if (d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2] < 0) { const j = Math.min(Math.hypot(...d1), Math.hypot(...d2)); if (j > jump.v) jump = { v: j, i: i - 1 }; }
      }
      const rate = (q0, q1) => { let d = q1[3] * q0[3] + q1[0] * q0[0] + q1[1] * q0[1] + q1[2] * q0[2]; d = Math.min(1, Math.abs(d)); return 2 * Math.acos(d) / dtF; };   // its turn's rate (rad/s), magnitude
      const W = F.map((r, i) => (i ? rate(F[i - 1].q, r.q) : 0));
      for (let i = 2; i < W.length; i++) { const al = Math.abs(W[i] - W[i - 1]) / dtF; if (al > turnStep.v) turnStep = { v: al, i, from: W[i - 1], to: W[i] }; }
      t.log('clip ' + name + ': ' + n + ' frames · the deck\'s speed over two frames falls at most ' + (100 * fall.v).toFixed(0) + ' % (' + (fall.a || 0).toFixed(2) + ' → ' + (fall.b || 0).toFixed(2) + ' m/s, frame ' + fall.i + ') and rises at most ' + (100 * rise.v).toFixed(0) + ' % (' + (rise.a || 0).toFixed(2) + ' → ' + (rise.b || 0).toFixed(2) + ' m/s, frame ' + rise.i + ') · the deck takes and gives back at most ' + (jump.v * 100).toFixed(1) + ' cm (frame ' + jump.i + ') · the body\'s turn steps at most ' + turnStep.v.toFixed(0) + ' rad/s² (' + (turnStep.from || 0).toFixed(1) + ' → ' + (turnStep.to || 0).toFixed(1) + ' rad/s, frame ' + turnStep.i + ')');
    }
    if (seq === 'stamps' && tag === 'up') {
      const name = 'stamps_follow_60hz_after_a_hitch_' + tag, out = dir(name), q = 0.1, stamp = (k) => Math.round((250 + k * 1000 / 60) / q) * q, n = 180;
      await t.eval(() => { const D = window.__wl.debug; D.hold = true; D.clockMs = 0; D.freeze = false; D.place([30, 0, 14], 90, 4); D.shot = null; });
      await frame(250, 1);   // the hitch: the clock drops what it owes and sits on a step's edge
      const moves = [];
      for (let f = 0; f < n; f++) {
        if (f === 50) await key('KeyW', true); if (f === 110) await key('KeyW', false);
        const ms = stamp(f + 1) - stamp(f), r = await frame(ms, 1); fs.writeFileSync(path.join(out, String(f).padStart(4, '0') + '.jpg'), Buffer.from(r.jpg, 'base64')); moves.push([ms, r.b]);
      }
      await key('KeyW', false);
      let worst = 0; for (let i = 2; i < moves.length; i++) { const d = Math.hypot(moves[i][1][0] - moves[i - 1][1][0], moves[i][1][2] - moves[i - 1][1][2]) / (moves[i][0] / 1000), d0 = Math.hypot(moves[i - 1][1][0] - moves[i - 2][1][0], moves[i - 1][1][2] - moves[i - 2][1][2]) / (moves[i - 1][0] / 1000); worst = Math.max(worst, Math.abs(d - d0) / Math.max(d, d0, 1e-6)); }
      t.log('clip ' + name + ': ' + n + ' frames on a 60 Hz stamp list after a hitch (0.1 ms stamps), a roll then a push — the drawn speed changes between two frames by at most ' + (100 * worst).toFixed(1) + ' % (a push\'s own surge included)');
    }
  }
  await t.eval(() => { const D = window.__wl.debug; D.hold = false; D.clockMs = 0; D.shot = null; });
  return t.errors.length === 0;
}
