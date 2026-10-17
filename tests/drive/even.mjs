/* THE DRAWN MOTION IS EVEN (10-16, the supervisor's A): the page's own frame loop handed frames as displays hand them — a LIST of stamps, not
 * a constant — while the board rolls on the plaza: 60 Hz locked to the clock after a hitch (the fixed step then sits on a step's edge), 59.94,
 * 90, 120 after a hitch and 144, each stamp coarsened to 0.1 ms as browsers coarsen it. Each frame the drawn board's move against its speed ×
 * that frame's own time: within 2 % on every frame (drawn at the newest whole step instead, the same frames moved 0 to 2×). The board is
 * read where the page draws it (debug.stampFrames: one frame of the game per stamp, its drawn place). Both orientations. */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn';
  const play = await t.eval(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await t.tap(play[0], play[1]); await t.sleep(600);
  await t.eval(() => { window.__wl.debug.hold = true; });
  const q = 0.1, list = (hz, n, hitch) => { const out = []; let t0 = 0; if (hitch) { out.push(250); t0 = 250; } for (let k = 1; k <= n; k++) out.push(Math.round((t0 + k * 1000 / hz) / q) * q); return out; };
  const CASES = [['60 Hz locked after a hitch', list(60, 120, true)], ['59.94 Hz', list(59.94, 120, false)], ['90 Hz', list(90, 180, false)], ['120 Hz after a hitch', list(120, 240, true)], ['144 Hz', list(144, 288, false)]];
  let worstAll = 0; const lines = [];
  for (const [name, stamps] of CASES) {
    await t.eval(() => { const D = window.__wl.debug; D.freeze = false; D.place([30, 0, 14], 90, 4); });
    await t.eval(() => window.__wl.debug.stampFrames([16.6, 33.3]));   // two frames to settle the drawn pair after the placement
    const fr = await t.eval((s) => window.__wl.debug.stampFrames(s), stamps);
    let worst = 0, at = -1, still = 0;
    for (let i = 2; i < fr.length; i++) {
      if (fr[i].ms > 100 || fr[i - 1].ms > 100) continue;   // the hitch itself: the clock drops what it owes
      const d = Math.hypot(fr[i].p[0] - fr[i - 1].p[0], fr[i].p[2] - fr[i - 1].p[2]), want = Math.hypot(fr[i].v[0], fr[i].v[2]) * fr[i].ms / 1000, r = Math.abs(d / want - 1);
      if (d < 1e-9) still++; if (r > worst) { worst = r; at = i; }
    }
    worstAll = Math.max(worstAll, worst);
    lines.push(name + ': ' + (fr.length - 2) + ' frames, the worst ' + (worst * 100).toFixed(2) + ' % off its speed × its time' + (still ? ', ' + still + ' frames still' : '') + (worst > 0.02 ? ' (frame ' + at + ', ' + fr[at].ms.toFixed(1) + ' ms)' : ''));
  }
  for (const l of lines) t.log('  · ' + l);
  const ok = worstAll <= 0.02 && t.errors.length === 0;
  t.log('EVEN ' + tag + ': THE DRAWN MOTION IS EVEN — every frame of every list within ' + (worstAll * 100).toFixed(2) + ' % of the board\'s speed × the frame\'s own time (≤ 2)' + (ok ? '  ✔' : '  ✖'));
  t.log('errors', JSON.stringify(t.errors.slice(0, 6)));
  return ok;
}
