/* R5.1 UNDER THE PLATFORM'S OWN FRAME (the kit's drive hosts the game as the platform does: a sandboxed frame of its host page). The app's note
 * page is immersive by itself, so in a frame the full-screen control is NOT drawn — view/fullscreen.js says why ('in a frame') and the button
 * is neither shown nor in the way, on the title and in play. (At the top of its own window it is drawn and works: tests/drive/fullscreen_top.mjs.) */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const read = () => t.eval(() => { const b = document.getElementById('wl-fullbtn'), r = b ? b.getBoundingClientRect() : null;
    const h = document.getElementById('wl-how-full');
    return { fs: window.__wl.fullscreen || null, there: !!b, hidden: b ? b.hidden : null, display: b ? getComputedStyle(b).display : null, w: r ? r.width : 0, card: h ? !h.hidden : null, mode: window.__wl.mode ? window.__wl.mode() : '' }; });
  const title = await read();
  const play = await t.eval(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const frame = await (await t.game().frameElement()).boundingBox();
  await t.tap(frame.x + play[0], frame.y + play[1]); await t.sleep(700);
  const inPlay = await read();
  const none = (r) => r.there && r.fs && r.fs.offered === false && r.fs.why === 'in a frame' && r.hidden === true && r.display === 'none' && r.w === 0 && r.card === false;   // (and How to skate never names it)
  const good = none(title) && none(inPlay) && inPlay.mode === 'play';
  console.log((good ? '✔ ' : '✖ ') + 'UNDER THE PLATFORM\'S FRAME THE FULL-SCREEN CONTROL IS NOT DRAWN (' + page.context().browser().browserType().name() + ', ' + page.viewportSize().width + '×' + page.viewportSize().height + '): on the title ' + JSON.stringify(title) + ' · in play ' + JSON.stringify(inPlay));
  return good;
}
