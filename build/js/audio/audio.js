/* EVERY SOUND IS SYNTHESIZED (no audio files): the roll on each surface and the clack at its joints, the pop off the tail, the landing,
 * the grind (steel rings, stone hisses), the push, the flip, the bail, and the city behind it all. It starts at the first touch (the rule
 * phones keep). `render(surface)` makes the same layers in an OfflineAudioContext, for listening without the game. */
import { SOUND } from '../config.js';

/* rnd: where a voice's noise starts and the bail's scatter — Math.random in the game; a fixed sequence offline, so a build renders the same
   bytes every time (a measure a coin decides is a wall that flickers near its line: the supervisor, round 10) */
export function makeVoices(ctx, out, rnd = Math.random) {
  const noise = (() => { const n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let last = 0, s = 7; for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; const w = s / 4294967296 * 2 - 1; last = (last + 0.035 * w) / 1.035; d[i] = last * 3.2; } return b; })();
  const white = (() => { const n = ctx.sampleRate, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let s = 3; for (let i = 0; i < n; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = s / 4294967296 * 2 - 1; } return b; })();
  const src = (buf, loop) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = !!loop; return s; };
  const env = (g, t, a, peak, decay) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay); };
  const V = {
    /* a short burst of grit through a filter: clicks, scuffs, slaps */
    burst(t, f, q, peak, decay, type = 'bandpass', buf = white) { const s = src(buf), fl = ctx.createBiquadFilter(), g = ctx.createGain(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl).connect(g).connect(out); env(g, t, 0.002, peak, decay); s.start(t, rnd() * 0.5); s.stop(t + decay + 0.05); },
    /* a struck body: a sine that drops in pitch (a thump) or rings (the deck's tock) */
    tone(t, f0, f1, peak, decay, type = 'sine') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + decay); o.connect(g).connect(out); env(g, t, 0.002, peak, decay); o.start(t); o.stop(t + decay + 0.05); },
    pop(t, surf) { V.burst(t, 2600, 0.8, 0.5, 0.025); V.tone(t, SOUND.pop.freq, SOUND.pop.freq * 0.82, 0.55, SOUND.pop.decay, 'triangle'); V.tone(t, 140, 60, 0.4, 0.08); if (surf === 'deck' || surf === 'ramp') V.tone(t + 0.004, 220, 120, 0.15, 0.12); },
    land(t, impact, surf, quality) { const k = Math.min(1, 0.25 + impact / 6); V.tone(t, 110, 48, 0.9 * k, 0.16); V.burst(t, surf === 'pavers' ? 650 : 420, 1.2, 0.6 * k, 0.07); V.burst(t + 0.006, 3200, 2, 0.25 * k, 0.05); if (quality === 'sketchy') V.burst(t + 0.03, 900, 0.7, 0.25, 0.22, 'bandpass', noise); },
    push(t) { V.burst(t, 1500, 0.9, 0.22, 0.14, 'bandpass', noise); V.burst(t + 0.05, 700, 0.6, 0.12, 0.1, 'bandpass', noise); },
    flick(t) { const s = src(noise), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 1.4; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.2); s.connect(f).connect(g).connect(out); env(g, t, 0.03, 0.12, 0.2); s.start(t); s.stop(t + 0.3); },
    clack(t, k = 1) { const C = SOUND.clack; V.burst(t, C.band, C.q, C.peak * k, C.decay); V.tone(t, 160, 70, C.thud * k, 0.035); },
    bail(t) { for (let i = 0; i < 4; i++) { V.tone(t + i * 0.13, 90 - i * 8, 40, 0.7 - i * 0.12, 0.16); V.burst(t + i * 0.13, 600, 1, 0.35, 0.09); } for (let i = 0; i < 5; i++) V.burst(t + 0.08 + i * 0.07 + rnd() * 0.04, 1800 + rnd() * 900, 4, 0.18, 0.05); },
    grab(t) { V.burst(t, 1200, 0.6, 0.08, 0.12, 'bandpass', noise); },
  };
  return { V, noise, white, src };
}

/* THE ROLL AT A SPEED, one rule for the game and for the WAV it is measured by: each layer's band rises with speed (the boom stays: it is the
   deck's own), and the whole grows with speed (and drops in a manual); a joint's clack grows with speed too */
/* the mix's last stage, one for the game and for its WAV: everything through one compressor, then the master level */
export function mixOut(ctx, master) { const m = ctx.createGain(); m.gain.value = master; const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(m); return { comp, master: m }; }
export function rollAt(R, sp, manual = false) {
  const k = Math.min(1, sp / 7) * (manual ? 0.6 : 1), f = 0.6 + Math.min(1.4, sp / 6);
  return [['body', R.body], ['grit', R.grit], ['boom', R.boom]].map(([name, def]) => (def ? { name, freq: def[0] * (name === 'boom' ? 1 : f), q: def[1], gain: k * def[2] } : { name, freq: 1000, q: 1, gain: 0 }));
}
export const clackAt = (sp) => Math.min(1, sp / 6);
export class Audio {
  constructor() { this.ctx = null; this.on = true; this.started = false; this.distAtJoint = 0; this.lastJoint = 0; }
  start() {
    if (this.started) { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    this.started = true; const ctx = this.ctx;
    const mix = mixOut(ctx, this.on ? SOUND.master : 0), comp = mix.comp; this.master = mix.master; this.master.connect(ctx.destination);
    this.bus = comp;
    const { V, noise, white, src } = makeVoices(ctx, comp); this.V = V;
    /* the roll: three layers (body, grit, a hollow boom) that follow the surface and the speed */
    const layer = (buf, type) => { const s = src(buf, true), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = type; g.gain.value = 0; s.connect(f).connect(g).connect(comp); s.start(); return { f, g }; };
    this.body = layer(noise, 'bandpass'); this.grit = layer(white, 'bandpass'); this.boom = layer(noise, 'bandpass');
    /* the grind: noise through three resonances (steel) or one broad one (stone) */
    this.grind = src(noise, true); this.grindG = ctx.createGain(); this.grindG.gain.value = 0; this.grindBank = [];
    for (const f of SOUND.grind.metal) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 9; this.grind.connect(b).connect(this.grindG); this.grindBank.push(b); }
    this.stone = ctx.createBiquadFilter(); this.stone.type = 'bandpass'; this.stone.frequency.value = 1400; this.stone.Q.value = 1.4; this.stoneG = ctx.createGain(); this.stoneG.gain.value = 0; this.grind.connect(this.stone).connect(this.stoneG).connect(comp);
    this.chatter = ctx.createOscillator(); this.chatter.frequency.value = 30; this.chatterG = ctx.createGain(); this.chatterG.gain.value = 0; this.chatter.connect(this.chatterG).connect(this.grindG.gain); this.chatter.start();
    this.grindG.connect(comp); this.grind.start();
    /* the city behind it all */
    const city = src(noise, true), cf = ctx.createBiquadFilter(), cg = ctx.createGain(); cf.type = 'lowpass'; cf.frequency.value = 260; cg.gain.value = 0.05; city.connect(cf).connect(cg).connect(comp); city.start();
  }
  setOn(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? SOUND.master : 0, this.ctx.currentTime, 0.05); }
  /* every frame: the roll and the grind follow the board */
  update(sk) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, sp = Math.hypot(sk.v[0], sk.v[1], sk.v[2]), grounded = sk.state === 'roll' || sk.state === 'manual';
    const R = SOUND.roll[sk.surface] || SOUND.roll.slab, layers = rollAt(R, grounded ? sp : 0, sk.state === 'manual');
    for (const [L, at] of [[this.body, layers[0]], [this.grit, layers[1]], [this.boom, layers[2]]]) {
      L.f.frequency.setTargetAtTime(at.freq, t, 0.05); L.f.Q.setTargetAtTime(at.q, t, 0.05); L.g.gain.setTargetAtTime(grounded ? at.gain : 0, t, 0.03);
    }
    const grinding = sk.state === 'grind', metal = grinding && /angle|rail|coping/i.test(this.grindSurface || '');
    this.grindG.gain.setTargetAtTime(metal ? 0.6 * Math.min(1, sp / 4) : 0, t, 0.03);
    this.stoneG.gain.setTargetAtTime(grinding && !metal ? 0.4 * Math.min(1, sp / 4) : 0, t, 0.03);
    this.chatterG.gain.setTargetAtTime(grinding && this.slide ? 0.25 : 0, t, 0.05);
    for (const b of this.grindBank) b.detune.setTargetAtTime(Math.min(600, sp * 60), t, 0.05);
    /* the slab's joints every 3 m and the pavers' every 0.6 m, front wheels then back */
    const J = SOUND.joints[sk.surface];
    if (grounded && J && sp > 0.6) { const d = sk.distance; if (Math.floor(d / J) !== Math.floor(this.lastJoint / J)) { this.V.clack(t, clackAt(sp)); this.V.clack(t + 0.362 / Math.max(0.5, sp), clackAt(sp) * 0.8); } this.lastJoint = d; }
  }
  onEvents(events) {
    if (!this.ctx) return; const t = this.ctx.currentTime + 0.005, V = this.V;
    for (const e of events) {
      if (e.type === 'pop') V.pop(t, e.surf); else if (e.type === 'land') V.land(t, e.impact || 1, e.surf, e.quality); else if (e.type === 'push') V.push(t);
      else if (e.type === 'flick') V.flick(t); else if (e.type === 'bail') V.bail(t); else if (e.type === 'grab') V.grab(t);
      else if (e.type === 'grindStart') { this.grindSurface = e.surface; this.slide = e.slide; V.burst(t, 2400, 2, 0.4, 0.06); } else if (e.type === 'grindEnd') this.grindSurface = null;
      else if (e.type === 'revert') V.burst(t, 1800, 1, 0.25, 0.25, 'bandpass', this.V && undefined);
    }
  }
}

/* one surface's layers, rendered offline to a WAV (16-bit mono) for the ear */
export async function render(surface, seconds = 4) {
  const rate = 44100, ctx = new OfflineAudioContext(1, rate * seconds, rate), mix = mixOut(ctx, SOUND.master), out = mix.comp; mix.master.connect(ctx.destination);   // the same last stage as the game
  /* the roll as the game plays it at 5 m/s (rollAt, clackAt: the same rule), the joints at 5 m/s too */
  let seed = 20261016; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const { V, noise, white, src } = makeVoices(ctx, out, rnd), R = SOUND.roll[surface] || SOUND.roll.slab, sp = 5;
  rollAt(R, sp).forEach((at, i) => { if (!at.gain) return; const s = src([noise, white, noise][i], true), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = at.freq; f.Q.value = at.q; g.gain.value = at.gain; s.connect(f).connect(g).connect(out); s.start(0); s.stop(2.2); });
  const J = SOUND.joints[surface]; if (J) for (let x = J; x < 10.5; x += J) { V.clack(x / sp, clackAt(sp)); V.clack(x / sp + 0.362 / sp, clackAt(sp) * 0.8); }
  V.pop(2.3, surface); V.land(2.95, 3, surface, 'clean');
  const gs = src(noise, true), gg = ctx.createGain(); gg.gain.value = 0.5; for (const fr of (surface === 'granite' || surface === 'curb' ? SOUND.grind.stone : SOUND.grind.metal)) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fr; b.Q.value = surface === 'granite' ? 1.4 : 9; gs.connect(b).connect(gg); } gg.connect(out); gs.start(3.1); gs.stop(3.9);
  const buf = await ctx.startRendering(), d = buf.getChannelData(0), n = d.length, wav = new DataView(new ArrayBuffer(44 + n * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) wav.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); wav.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 1, true); wav.setUint32(24, rate, true); wav.setUint32(28, rate * 2, true); wav.setUint16(32, 2, true); wav.setUint16(34, 16, true); w(36, 'data'); wav.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) wav.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
  return new Uint8Array(wav.buffer);
}
