/* SYNTHETIC THUMBS (the M0 spike's generator, spikes/flick_spike.mjs): a load (pull down 26–60 px), a short hold, then the trick's stroke —
 * straight, a quarter curve or a loop — with angular wobble σ, length and speed spread, 0.8 px jitter and 0.4 ms timing noise, sampled at
 * 60 / 120 / 240 Hz. Seeded: the same seed gives the same thumbs. */
export function thumbs(seed = 12345) {
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const U = (a, b) => a + (b - a) * rnd(), rad = (d) => d * Math.PI / 180, ease = (u) => u * u * (3 - 2 * u);
  const CLASSES = {
    'Ollie': { kind: 'straight', dir: 0 }, 'Kickflip': { kind: 'straight', dir: -45 }, 'Heelflip': { kind: 'straight', dir: 45 },
    'BS Pop Shove-it': { kind: 'straight', dir: -90 }, 'FS Pop Shove-it': { kind: 'straight', dir: 90 },
    'Varial Kickflip': { kind: 'quarter', from: -100, to: -10 }, 'Hardflip': { kind: 'quarter', from: 90, to: -45 },
    'Inward Heelflip': { kind: 'quarter', from: -90, to: 45 }, 'Varial Heelflip': { kind: 'quarter', from: 100, to: 10 },
    '360 Flip': { kind: 'loop', from: -90, turn: 330 }, 'Laser Flip': { kind: 'loop', from: 90, turn: -330 },
  };
  function thumb(cls, hz, sigma) {
    const C = CLASSES[cls], out = [], dt = 1000 / hz;
    const loop = C.kind === 'loop', depth = U(26, 60), tLoad = U(60, 140), hold = U(0, 60), len = loop ? U(90, 150) : U(48, 100), tStroke = loop ? U(110, 200) : U(45, 120), wob = gauss() * 3;
    let t = 0; const push = (x, y) => { out.push({ t: t + gauss() * 0.4, x: x + gauss() * 0.8, y: y + gauss() * 0.8 }); };
    for (; t <= tLoad; t += dt) { const u = ease(t / tLoad); push(wob * u, depth * u); }
    const t1 = t; for (; t <= t1 + hold; t += dt) push(wob, depth);
    const t2 = t, ex = wob, ey = depth; let from, to;
    if (C.kind === 'straight') { from = C.dir + gauss() * sigma; to = from + gauss() * 10; }
    else if (C.kind === 'quarter') { from = C.from + gauss() * sigma; to = C.to + gauss() * sigma; }
    else { from = C.from + gauss() * sigma; to = from + C.turn + gauss() * sigma * 1.5; }
    let x = ex, y = ey, sPrev = 0;
    for (; t <= t2 + tStroke + dt; t += dt) {
      const u = Math.min(1, (t - t2) / tStroke), s2 = len * (10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5);
      for (let k = 1; k <= 4; k++) { const sk = sPrev + (s2 - sPrev) * k / 4, a = rad(from + (to - from) * (sk / len)); x += Math.sin(a) * (s2 - sPrev) / 4; y -= Math.cos(a) * (s2 - sPrev) / 4; }
      sPrev = s2; push(x, y);
    }
    out.sort((a, b) => a.t - b.t);
    return { samples: out, strokeAt: t2 };
  }
  return { CLASSES, thumb };
}
