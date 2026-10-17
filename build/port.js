/* Waxline on NotesMosaic — what the port kit (mosa-port.js, public domain) is asked for, in one place:
 *   · LOADING  the screen in index.html is the game's own; it comes down on the game's own word (its first painted frames)
 *   · LOOK     on a phone, dragging the open screen above the thumbs turns the view (never a second stick)
 *   · CONTROLS the carve zone and the flick pad are declared, so the phone passes find them
 *   · SAVES    the best combo, the gaps found and the settings follow the player; a save that arrives is taken in where the game stands
 *   · ROOM     friends in the same room see each other's live score
 *   · CREDITS  behind the (i) on the title: an original, MIT */
(function () {
  'use strict';
  var W = window;
  var g = function () { return W.__wl || null; };
  var playing = function () { var s = g(); return !!(s && s.playing); };
  var front = function () { var s = g(); return !!(s && s.mode && s.mode() === 'title'); };
  var safe = function () { var s = g(); return s && s.safe ? s.safe() : { t: 0, r: 0, b: 0, l: 0 }; };
  MosaPort.init({
    id: 'waxline',
    /* on NotesMosaic the platform takes the screen down at the game's word; on a page of its own the game takes it down itself once it has
       painted (main.js) — the kit is pointed at nothing there, or it would take it down at the page's load, over a park still being poured */
    loading: W.__mosaBoot ? { el: '#loading', ready: function () { var s = g(); return !!(s && s.painted); } } : { el: '#wl-no-platform' },
    touch: { look: { id: 'look', label: 'Look', when: playing, slop: 6, onLook: function (dx, dy) { var s = g(); if (s && s.look) s.look(dx, dy); }, onTap: function () { /* a tap on the open screen is not a trick */ } } },
    controls: [
      { id: 'carve', label: 'Carve and push (left thumb)', kind: 'move', keys: ['KeyA', 'KeyD', 'KeyW', 'KeyS'], touch: '#wl-carve' },
      { id: 'flick', label: 'Flick tricks (right thumb)', kind: 'button', keys: ['Space'], touch: '#wl-flick' }
    ],
    saves: ['waxline:save'],
    onSaves: function () { var s = g(); if (s && s.loadSave) s.loadSave(); },
    score: function () { var s = g(); return s && s.scoreNow ? s.scoreNow() : 0; },
    /* friends' scores: on the title under the mark's corner; in play under the pause button, clear of both thumbs and of the notch */
    roomAt: function (vw, vh) { var i = safe(); return front() ? [Math.max(14, i.l + 6), vh - Math.max(64, i.b + 58), Math.min(260, Math.round(vw * 0.6))] : [-(Math.max(12, i.r + 4) + 200), Math.max(62, i.t + 56), 200]; },
    creditsAt: function (vw) { var i = safe(); return [vw - Math.max(56, i.r + 48), Math.max(12, i.t + 8)]; },
    creditsVisible: front,
    credits: { kind: 'original', title: 'Waxline', author: 'Mosaic (NotesMosaic house studio)', license: 'MIT',
      assets: 'Everything is made in code when the game starts: both parks and every surface in them, the light, the board, Juno (sculpted from distance fields and skinned to her own skeleton) and every sound. Nothing in it is an image, model or audio file, but for Kiln Yard’s buildings and props: CC0 models from Poly Haven (James Ray Cock, Juniix, Serhii Khromov, MP). It draws with three.js (MIT).' }
  });
})();
