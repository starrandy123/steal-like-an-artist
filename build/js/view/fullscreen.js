/* FULL SCREEN, TURNED (R5.1; the owner: "I need to be able to do mobile well too. Full screen landscape."). One control asks the browser for the
 * whole screen with its own bars hidden — requestFullscreen({ navigationUI: 'hide' }) — and then for the landscape turn,
 * screen.orientation.lock('landscape') (a phone's browser grants the lock only to a page already full screen). It is offered only where it
 * can do something: never inside a frame (a host's page: the platform's note page is immersive by itself), never where the browser has no
 * Fullscreen API for a page (an iPhone's Safari has it for a video alone), never while the page is already full screen (an app launched full
 * screen, or after the control: it comes back when the page leaves full screen). A refusal is said, never thrown. Its truth: tests/fullscreen.mjs
 * (the offer, both ways) and tests/drive/fullscreen.mjs (the real APIs, top level and in the platform's frame). */

/* why the control is NOT offered on this window (null: it is) */
export function fullscreenOffer(win) {
  let framed = true;
  try { framed = win.self !== win.top; } catch (e) { framed = true; }   // (a frame the page may not look out of is a frame)
  if (framed) return 'in a frame';
  const doc = win.document, el = doc && doc.documentElement;
  if (!el || typeof el.requestFullscreen !== 'function' || doc.fullscreenEnabled === false) return 'no Fullscreen API';
  if (doc.fullscreenElement) return 'already full screen';
  try { if (win.matchMedia && win.matchMedia('(display-mode: fullscreen)').matches) return 'already full screen'; } catch (e) { /* no media queries: offered */ }
  return null;
}

/* the control's press: the whole screen, then the turn — what it got, in words */
export async function goFullscreen(win) {
  const doc = win.document, said = [];
  try { await doc.documentElement.requestFullscreen({ navigationUI: 'hide' }); said.push('full screen'); }
  catch (e) { return 'refused: ' + ((e && e.name) || String(e)); }
  const o = win.screen && win.screen.orientation;
  if (o && typeof o.lock === 'function') { try { await o.lock('landscape'); said.push('landscape'); } catch (e) { said.push('the turn not locked (' + ((e && e.name) || String(e)) + ')'); } }
  else said.push('no orientation lock here');
  return said.join(', ');
}
