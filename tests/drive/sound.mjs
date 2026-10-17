/* ONE WAV A SURFACE, rendered offline by the game's own synthesizer (js/audio/audio.js render): the roll and its joints, a pop, a landing,
 * and the grind that surface gives (steel rings, stone hisses) — for the ear, without the game. Written to runs/sound/<surface>.wav. */
import fs from 'node:fs'; import path from 'node:path';
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const out = path.join(path.dirname(t.outDir), 'sound'); fs.mkdirSync(out, { recursive: true });
  for (const surf of ['slab', 'pavers', 'deck', 'ramp', 'granite', 'curb', 'rail']) {
    const b64 = await t.eval(async (surf) => { const src = document.querySelector('script[type=module]').src, mod = await import(new URL('audio/audio.js', src).href); const wav = await mod.render(surf, 4); let s = ''; for (let i = 0; i < wav.length; i += 0x8000) s += String.fromCharCode.apply(null, wav.subarray(i, i + 0x8000)); return btoa(s); }, surf);
    const f = path.join(out, surf + '.wav'); fs.writeFileSync(f, Buffer.from(b64, 'base64')); t.log('wrote ' + f + ' (' + fs.statSync(f).size + ' bytes)');
  }
  /* THE SAME BUILD RENDERS THE SAME SOUND: a surface rendered twice gives the same samples (round 10: the measure drifted 2 dB between two runs
     of one build, each voice's noise started at a random place). Not the same BYTES: measured, the browser's own engine rounds a few samples
     a step apart at onsets (5 of 176,400 on the pavers, a step of the 16-bit sample — the order it sums many inputs in), so the wall is: no
     sample more than one step apart, and at most 0.05 % of them that one step; a voice started at random moves thousands of samples by
     thousands of steps */
  const twice = await t.eval(async () => { const src = document.querySelector('script[type=module]').src, mod = await import(new URL('audio/audio.js', src).href);
    const a = await mod.render('pavers', 4), b = await mod.render('pavers', 4), A = new Int16Array(a.buffer, 44, (a.length - 44) >> 1), B = new Int16Array(b.buffer, 44, (b.length - 44) >> 1);
    let diff = 0, worst = 0; for (let i = 0; i < A.length; i++) { const d = Math.abs(A[i] - B[i]); if (d) { diff++; worst = Math.max(worst, d); } } return { n: A.length, diff, worst }; });
  const same = twice.worst <= 1 && twice.diff <= twice.n * 0.0005;
  t.log((same ? '✔' : '✖') + ' the pavers rendered twice: ' + twice.n + ' samples, ' + twice.diff + ' apart, the most by ' + twice.worst + ' step' + (twice.worst === 1 ? '' : 's') + ' of 32,768 (≤ 1 step, on ≤ 0.05 % of them)');
  /* the game's own sound settings beside the WAVs: the measure (tests/sound_measure.py) reads the joints' spacing and their band from them */
  const cfg = await import(new URL('../../build/js/config.js', import.meta.url).href); fs.writeFileSync(path.join(out, 'sound_config.json'), JSON.stringify(cfg.SOUND, null, 1));
  return t.errors.length === 0 && same;
}
