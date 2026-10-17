/* R6.1'S EYES (the supervisor, 10-17: "I'll read the round's before/after title and roll shots AND the push frames by eye"): the title as a
 * player first sees it; a push, four frames across its strokes (the left thumb held up on its zone, the board starting from rest); and a roll
 * at 4 m/s — the same places every round, so a round reads beside the one before it. The hands' own numbers are tests/hands.mjs's. */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  const vp = page.viewportSize(), tag = vp.width < vp.height ? 'up' : 'turn', frame = await (await t.game().frameElement()).boundingBox();
  await t.sleep(1500); await t.shot('hands_title_' + tag);
  const at = (id) => t.eval((id) => { const r = document.getElementById(id).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.top]; }, id);
  const play = await at('wl-play'); await t.tap(frame.x + play[0], frame.y + play[1]); await t.sleep(600);
  await t.eval(() => window.__wl.debug.place([30, 0, 14], 90, 0)); await t.sleep(900);
  /* the push: a thumb held on the left zone and slid up (DESIGN §2.3: "push up to push"), held while the frames are taken */
  const carve = await at('wl-carve'), x = frame.x + carve[0], y = frame.y + carve[1];
  await t.hold(x, y, x, y - 70, 1);
  let n = 0;
  for (const ms of [450, 350, 350, 350]) { await t.sleep(ms); await t.shot('hands_push_' + tag + '_' + (++n)); }
  await t.release();
  await t.eval(() => window.__wl.debug.place([30, 0, 14], 90, 4)); await t.sleep(1400); await t.shot('hands_roll_' + tag);
  t.log('hands shots: title, 4 push frames, a roll (' + tag + ')');
  return true;
}
