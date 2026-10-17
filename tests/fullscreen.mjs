/* THE FULL-SCREEN CONTROL (R5.1: build/js/view/fullscreen.js), on windows made to be each case:
 *   OFFERED only at the top of its own window with a Fullscreen API for a page, and not already full screen — never in a frame (or a frame it
 *   may not look out of), never with no API (an iPhone's Safari) or the API disabled, never already full screen (the element, or an app
 *   launched full screen);
 *   ITS PRESS asks for the whole screen with the browser's bars hidden ({ navigationUI: 'hide' }) and only THEN for the landscape lock (a phone
 *   grants the lock only to a full-screen page), and says every refusal — a refused screen, a refused turn, no lock at all — never throws.
 * The real APIs, at the top and under the platform's own frame: tests/drive/fullscreen.mjs. */
import { fullscreenOffer, goFullscreen } from '../build/js/view/fullscreen.js';

let fail = 0; const ok = (c, m) => { console.log((c ? '✔ ' : '✖ ') + m); if (!c) fail++; };
const win = (o = {}) => {
  const calls = [];
  const el = o.noApi ? {} : { requestFullscreen: (opts) => { calls.push(['requestFullscreen', opts]); return o.refuse ? Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })) : new Promise((r) => setTimeout(() => { calls.push(['granted']); r(); }, 5)); } };
  const w = { document: { documentElement: el, fullscreenElement: o.already ? el : null, fullscreenEnabled: o.disabled ? false : true },
    matchMedia: (q) => ({ matches: !!(o.displayFull && q === '(display-mode: fullscreen)') }),
    screen: o.noLock ? {} : { orientation: { lock: (k) => { calls.push(['lock', k]); return o.lockRefused ? Promise.reject(Object.assign(new Error('no'), { name: 'NotSupportedError' })) : Promise.resolve(); } } } };
  w.self = w; w.top = o.framed ? {} : w;
  if (o.sealed) Object.defineProperty(w, 'top', { get() { throw new Error('SecurityError'); } });
  return { w, calls };
};
const cases = [['at the top of its own window, the API there', {}, null], ['in a frame', { framed: true }, 'in a frame'], ['in a frame it may not look out of', { sealed: true }, 'in a frame'],
  ['no Fullscreen API for a page', { noApi: true }, 'no Fullscreen API'], ['the API disabled', { disabled: true }, 'no Fullscreen API'],
  ['already full screen', { already: true }, 'already full screen'], ['launched full screen', { displayFull: true }, 'already full screen']];
const got = cases.map(([name, o, want]) => { const r = fullscreenOffer(win(o).w); return { name, want, r, ok: r === want }; });
ok(got.every((g) => g.ok), 'THE CONTROL IS OFFERED ONLY WHERE IT CAN DO SOMETHING: ' + got.map((g) => g.name + ' → ' + (g.r === null ? 'offered' : 'not (' + g.r + ')') + (g.ok ? '' : ' ✖ wanted ' + (g.want === null ? 'offered' : g.want))).join(' · '));
{ const A = win(), said = await goFullscreen(A.w), order = A.calls.map((c) => c[0]).join(' → ');
  ok(said === 'full screen, landscape' && order === 'requestFullscreen → granted → lock' && A.calls[0][1] && A.calls[0][1].navigationUI === 'hide' && A.calls[2][1] === 'landscape',
    'ITS PRESS: the whole screen with the bars hidden ({ navigationUI: ' + JSON.stringify(A.calls[0][1] && A.calls[0][1].navigationUI) + ' }), then the landscape lock once it was granted (' + order + ') — said "' + said + '"'); }
{ const B = win({ refuse: true }), C = win({ lockRefused: true }), E = win({ noLock: true }), sB = await goFullscreen(B.w), sC = await goFullscreen(C.w), sE = await goFullscreen(E.w);
  ok(/^refused: NotAllowedError$/.test(sB) && !B.calls.some((c) => c[0] === 'lock') && sC === 'full screen, the turn not locked (NotSupportedError)' && sE === 'full screen, no orientation lock here',
    'EVERY REFUSAL SAID, NONE THROWN: the screen refused → "' + sB + '" (no lock asked: ' + !B.calls.some((c) => c[0] === 'lock') + ') · the turn refused → "' + sC + '" · no lock → "' + sE + '"'); }
console.log(fail ? 'FULLSCREEN: RED' : 'FULLSCREEN: GREEN'); process.exit(fail ? 1 : 0);
