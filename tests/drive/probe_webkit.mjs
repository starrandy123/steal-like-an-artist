/* why do synthetic pointers steer nothing on WebKit? one carve finger and one look finger, read back step by step */
export default async function (page, t) {
  for (let i = 0; i < 160; i++) { await t.sleep(250); try { if (await t.eval(() => !!(window.__wl && window.__wl.painted))) break; } catch (e) { /* not yet */ } }
  await t.eval(() => window.__wl.debug.mode('play'));
  const r = await t.eval(async () => {
    const out = {}; const c = document.getElementById('wl-carve').getBoundingClientRect(); const x = c.left + 60, y = c.bottom - 100;
    out.dev = JSON.stringify(window.__MOSA_DEVICE || null); out.coarse = matchMedia('(pointer: coarse)').matches; out.touchPts = navigator.maxTouchPoints;
    const el = document.elementFromPoint(x, y); out.el = el && (el.id || el.tagName);
    const ev = (type, px, py) => new PointerEvent(type, { pointerId: 13, pointerType: 'touch', isPrimary: true, clientX: px, clientY: py, bubbles: true, cancelable: true, composed: true });
    const C = window.__wl.debug.controls; out.enabled = C.enabled; out.seq = [];
    for (const ty of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave', 'pointerout']) { el.addEventListener(ty, (e) => out.seq.push(ty + ':' + e.pointerId + ':' + (C.left ? 'L' : '-')), true); window.addEventListener(ty, (e) => out.seq.push('win-' + ty + ':' + e.pointerId), true); }
    const mapAfterDown = () => JSON.stringify([...C.owners.map.entries()]);
    el.dispatchEvent(ev('pointerdown', x, y)); out.afterDown = JSON.stringify(C.left); out.map = mapAfterDown();
    el.dispatchEvent(ev('pointermove', x + 50, y)); out.afterMove = JSON.stringify(C.left); out.owner = C.owners.at(13, x + 50, y);
    out.sample = JSON.stringify(C.sample(false));
    const e2 = ev('pointermove', x + 50, y); out.evPid = e2.pointerId; out.evType = e2.pointerType; out.evCX = e2.clientX;
    el.dispatchEvent(ev('pointerup', x + 50, y));
    /* a look in the band */
    const y0 = window.__wl.debug.cam.lookYaw, lx = innerWidth / 2, ly = 60, lel = document.elementFromPoint(lx, ly); out.lookEl = lel && (lel.id || lel.tagName);
    const lev = (type, px, py) => new PointerEvent(type, { pointerId: 14, pointerType: 'touch', isPrimary: true, clientX: px, clientY: py, bubbles: true, cancelable: true, composed: true });
    lel.dispatchEvent(lev('pointerdown', lx, ly)); for (let k = 1; k <= 6; k++) lel.dispatchEvent(lev('pointermove', lx + 15 * k, ly + 5 * k));
    out.lookYaw = window.__wl.debug.cam.lookYaw - y0; lel.dispatchEvent(lev('pointerup', lx + 90, ly + 30));
    return out;
  });
  t.log(JSON.stringify(r, null, 1));
  return true;
}
