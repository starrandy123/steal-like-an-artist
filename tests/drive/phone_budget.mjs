/* R5.4 THE PHONE BUDGET HOLDS TURNED AND TURNED BACK (the platform's phone pass, as it weighs a game: _kit/weigh_tally.js through the kit's drive,
 * --init, a phone's size at 3x — run it: drive.mjs build tests/drive/phone_budget.mjs --viewport 390x844 --dpr 3 --gpu --init _kit/weigh_tally.js).
 * Read at the title, in play, and after each of four changes — turned, back, turned again, back again — what the page asks the phone to hold:
 *   AT MOST 192 MB held at any time (the graphics card's peak and the drawing surfaces' peak: the certification's ceiling, E-PHONE-TOO-HEAVY);
 *   NO SURFACE over 4096×4096 (E-PHONE-SURFACE-TOO-LARGE);
 *   NO RISE AT EVERY CHANGE (W-GROWS-WHEN-TURNED: a resize that makes its frame again and only lets the old one go later, or never, rises each time).
 * Plants (tests/plants.mjs): phone_surface_too_large (a 4352 px sheet), phone_turn_leaks (a frame made at every resize and never let go) → RED.
 * ("The pixel ratio taken twice", Sketchbook's defect, is no plant here: the stage caps the ratio at 1.75, so twice stays under the ceiling.) */
const CEIL = 192, SURFACE = 4096;
export default async function (page, t) {
  const until = async (fn, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { let v = null; try { v = await t.eval(fn); } catch (e) { v = null; } if (v) return v; await t.sleep(200); } return null; };
  const read = () => t.eval(() => (window.__MOSA_WEIGHT && window.__MOSA_WEIGHT.read ? window.__MOSA_WEIGHT.read() : null));
  if (!(await until(() => window.__wl && window.__wl.painted))) { console.log('✖ THE PHONE BUDGET: the page never painted'); return false; }
  await t.sleep(1500);
  const rows = [['title', await read()]];
  const frame = await (await t.game().frameElement()).boundingBox();
  const play = await t.eval(() => { const r = document.getElementById('wl-play').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await t.tap(frame.x + play[0], frame.y + play[1]); await t.sleep(4000);
  rows.push(['play', await read()]);
  const v0 = page.viewportSize(), turned = { width: v0.height, height: v0.width };
  for (const [label, size] of [['turned', turned], ['back', v0], ['turned again', turned], ['back again', v0]]) { await page.setViewportSize(size); await t.sleep(3500); rows.push([label, await read()]); }
  if (rows.some(([, r]) => !r)) { console.log('✖ THE PHONE BUDGET: no weight read (the drive needs --init _kit/weigh_tally.js)'); return false; }
  const held = (r) => r.peak_mb + r.surfaces_peak_mb, most = Math.max(...rows.map(([, r]) => held(r)));
  const sides = rows.map(([, r]) => { const m = String(r.largest_surface || '').match(/(\d+)x(\d+)/); return m ? [+m[1], +m[2]] : [0, 0]; }), big = sides.reduce((a, s) => (s[0] * s[1] > a[0] * a[1] ? s : a), [0, 0]);
  const now = rows.slice(2).map(([, r]) => r.asked_mb + r.surfaces_mb), base = rows[1][1].asked_mb + rows[1][1].surfaces_mb;
  const rises = now.every((x, i) => x > (i ? now[i - 1] : base) + 0.5);
  const good = most <= CEIL && big[0] <= SURFACE && big[1] <= SURFACE && !rises;
  console.log((good ? '✔ ' : '✖ ') + 'THE PHONE BUDGET HOLDS TURNED AND TURNED BACK (' + page.context().browser().browserType().name() + ', ' + v0.width + '×' + v0.height + ' at ' + rows[0][1].dpr + 'x): held at most ' + most.toFixed(1) + ' MB (≤ ' + CEIL + ') · the largest surface ' + big.join('×') + ' (≤ ' + SURFACE + ') · held now through the changes ' + base.toFixed(1) + ' → ' + now.map((x) => x.toFixed(1)).join(' → ') + ' MB' + (rises ? ' ✖ a rise at every change' : '') + ' — ' + rows.map(([l, r]) => l + ' ' + held(r).toFixed(1) + ' at most, ' + (r.asked_mb + r.surfaces_mb).toFixed(1) + ' now (' + r.view.join('×') + ')').join(' · '));
  return good;
}
