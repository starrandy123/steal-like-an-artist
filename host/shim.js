/* THE PLAY PAGE'S HOST (claude.ai): this file is not part of the game and never ships to NotesMosaic. It says where the page is running —
 * another host, with no NotesMosaic bridge, so nothing here proves NotesMosaic's boot, rooms or phone pass (a line in How to skate and on
 * the pause card) — and it offers "Record my flicks" in a corner of the title: off unless the player turns it on; when on, every stroke on
 * the trick pad is kept as its times and x/y offsets and nothing else, in this page's own store, so the builder can read real thumbs into
 * the reader's test (tests/reader.mjs). */
(function () {
  'use strict';
  var W = window, D = document, db = null, on = false, seq = 0, sent = 0, session = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  var HOST = 'This is a private play page on claude.ai: another host, with no NotesMosaic bridge. It shows the game and proves nothing about NotesMosaic’s boot, rooms or phone check.';
  function ui() {
    var card = D.getElementById('wl-title'); if (!card) return false; if (D.getElementById('wl-record')) return true;
    ['wl-howcard', 'wl-pause'].forEach(function (id) { var c = D.getElementById(id); if (!c) return; var p = D.createElement('p'); p.className = 'wl-hostline'; p.textContent = HOST; c.insertBefore(p, c.lastElementChild); });
    var box = D.createElement('div'); box.id = 'wl-host'; box.className = 'wl-host';
    box.innerHTML = '<button class="wl-chip" id="wl-record" type="button" disabled>Record my flicks: off</button><span id="wl-record-note"></span>';
    card.appendChild(box);
    D.getElementById('wl-record').addEventListener('click', function (e) { e.preventDefault(); toggle(); });
    return true;
  }
  function label() {
    var b = D.getElementById('wl-record'); if (b) { b.textContent = 'Record my flicks: ' + (on ? 'on' : 'off'); b.disabled = !db; }
    var n = D.getElementById('wl-record-note'); if (n) n.textContent = db && on ? sent + ' strokes kept: only times and positions on the trick pad' : '';
  }
  function reader() { var w = W.__wl; return w && w.debug && w.debug.controls ? w.debug.controls.reader : null; }
  function toggle() { if (!db) return; on = !on; var r = reader(); if (r) r.record = on ? [] : null; label(); }
  /* every few seconds, the strokes finished since the last write go into one document */
  function flush() {
    var r = reader(); if (!on || !r || !r.record || !db) return;
    var done = r.record.filter(function (s) { return r.p == null || s.g !== r.p.id; });
    if (!done.length) return;
    r.record = r.record.filter(function (s) { return done.indexOf(s) < 0; });
    var doc = { session: session, at: new Date().toISOString(), screen: [W.innerWidth, W.innerHeight], strokes: done.map(function (s) { return s.s; }) };
    seq++; sent += done.length;
    db.collection('flicks').doc(session + '-' + seq).set(doc).catch(function () { sent -= done.length; });
    label();
  }
  var tries = 0; (function wait() { if (!ui() && tries++ < 400) { setTimeout(wait, 100); return; } label(); })();
  try {
    if (W.claude && typeof W.claude.use === 'function') W.claude.use('db').then(function (d) { db = d || null; label(); }).catch(function () { db = null; label(); });
  } catch (e) { db = null; }
  setInterval(flush, 4000);
})();
