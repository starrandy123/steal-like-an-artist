/* LOOKING NEVER EATS A FLICK, AND A LOOK NEVER POPS (DESIGN.md §2.7), on the page's own ownership rule (js/input/zones.js) and its own
 * reader: 10,000 gestures at 390×844 and 844×390 — flicks that land on the pad and run up into the look band (every sample must reach the
 * reader, and it must pop), looks that land in the band and cross down into the pad (the reader must hear nothing), and three-finger chords
 * (a carve held, a flick, a look, all at once). Then THE PLANT — ownership by where the finger IS — must be caught, and taken out again. */
import { zoneRects, Owners } from '../build/js/input/zones.js';
import { Reader } from '../build/js/input/reader.js';
import { INPUT } from '../build/js/config.js';
import { thumbs } from './lib/thumbs.mjs';

function run(plant, seed) {
  let s = seed >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const T = thumbs(seed + 1), cls = Object.keys(T.CLASSES);
  const out = { flicks: 0, flickSamples: 0, delivered: 0, popped: 0, looks: 0, lookToReader: 0, lookPops: 0, lookMoved: 0, chords: 0, chordsRight: 0 };
  for (const [vw, vh] of [[390, 844], [844, 390]]) {
    const rects = zoneRects(vw, vh, { t: 0, r: 0, b: 34, l: 0 }, INPUT.zones);
    for (let g = 0; g < 5000; g++) {
      const kind = g % 5 < 2 ? 'flick' : g % 5 < 4 ? 'look' : 'chord';
      const owners = new Owners(rects, { plant }), reader = new Reader({ streamlined: false });
      const fingers = [];
      /* a flick on the pad, landing within 70 px of the band so its stroke runs up into it */
      const flickFinger = () => { const { samples } = T.thumb(cls[Math.floor(rnd() * 3)], 120, 6), x0 = rects.flick.x0 + 30 + rnd() * (rects.flick.x1 - rects.flick.x0 - 60), y0 = rects.band + 8 + rnd() * 60;
        return { id: 1, kind: 'flick', pts: samples.map((p) => ({ t: p.t, x: x0 + p.x, y: y0 + p.y - samples[0].y })) }; };
      /* a look in the band, dragged down across the pad */
      const lookFinger = () => { const x0 = 20 + rnd() * (vw - 40), y0 = 10 + rnd() * (rects.band - 30), dx = (rnd() - 0.5) * 200, dy = 140 + rnd() * 220, n = 30, pts = [];
        for (let i = 0; i <= n; i++) pts.push({ t: i * 8.3, x: x0 + dx * i / n, y: y0 + dy * i / n }); return { id: 2, kind: 'look', pts }; };
      /* a carve held on the left */
      const carveFinger = () => { const x0 = rects.carve.x0 + 40 + rnd() * 80, y0 = rects.carve.y1 - 120 - rnd() * 60, pts = []; for (let i = 0; i <= 40; i++) pts.push({ t: i * 8.3, x: x0 + Math.sin(i / 6) * 30, y: y0 }); return { id: 3, kind: 'carve', pts }; };
      if (kind === 'flick') fingers.push(flickFinger()); else if (kind === 'look') fingers.push(lookFinger()); else fingers.push(flickFinger(), lookFinger(), carveFinger());
      /* every sample of every finger, in time order, through the page's rule: the reader hears a finger only if it LANDED on the pad and
         the owner of this sample is the pad */
      const ev = []; for (const f of fingers) f.pts.forEach((p, i) => ev.push({ f, p, first: i === 0, last: i === f.pts.length - 1 })); ev.sort((a, b) => a.p.t - b.p.t);
      const landed = new Map(), got = new Map(), moved = new Map();
      for (const { f, p, first, last } of ev) {
        if (first) { const z = owners.land(f.id, p.x, p.y); landed.set(f.id, z); if (z === 'flick') reader.down(p.t, p.x, p.y); got.set(f.id, 0); moved.set(f.id, 0); continue; }
        const own = owners.at(f.id, p.x, p.y);
        if (landed.get(f.id) === 'flick' && own === 'flick') { if (last) reader.up(p.t, p.x, p.y); else reader.move(p.t, p.x, p.y); got.set(f.id, got.get(f.id) + 1); }
        else if (own === 'look') moved.set(f.id, moved.get(f.id) + 1);
        if (last) owners.lift(f.id);
      }
      if (landed.get(1) === 'flick' && reader.p) reader.up(fingers[0].pts[fingers[0].pts.length - 1].t + 1);
      const events = reader.drain(), pops = events.filter((e) => e.type === 'pop').length;
      const fl = fingers.find((f) => f.kind === 'flick'), lk = fingers.find((f) => f.kind === 'look'), cv = fingers.find((f) => f.kind === 'carve');
      if (fl) { out.flicks++; out.flickSamples += fl.pts.length - 1; out.delivered += got.get(1); if (pops > 0) out.popped++; }
      if (lk && kind === 'look') { out.looks++; if (got.get(2) > 0) out.lookToReader++; if (pops > 0) out.lookPops++; if (moved.get(2) > 0) out.lookMoved++; }
      if (kind === 'chord') { out.chords++; if (got.get(1) === fl.pts.length - 1 && pops === 1 && got.get(2) === 0 && moved.get(2) > 0 && landed.get(3) === 'carve' && got.get(3) === 0) out.chordsRight++; }
    }
  }
  return out;
}
const verdict = (o) => o.delivered === o.flickSamples && o.popped / o.flicks >= 0.99 && o.lookToReader === 0 && o.lookPops === 0 && o.lookMoved === o.looks && o.chordsRight === o.chords;
const say = (o) => o.flicks + ' flicks: ' + o.delivered + ' of ' + o.flickSamples + ' samples reached the reader, ' + (100 * o.popped / o.flicks).toFixed(2) + '% popped · ' + o.looks + ' looks: ' + o.lookToReader + ' reached the reader, ' + o.lookPops + ' popped, ' + o.lookMoved + ' turned the view · ' + o.chords + ' three-finger chords: ' + o.chordsRight + ' routed right';
let fail = 0;
const a = run(false, 7); console.log((verdict(a) ? '✔ ' : '✖ ') + 'the rule (a finger is the zone it landed in): ' + say(a)); if (!verdict(a)) fail++;
const b = run(true, 7); console.log((!verdict(b) ? '✔ ' : '✖ ') + 'the PLANT (a finger is the zone it is in) is caught: ' + say(b)); if (verdict(b)) fail++;
const c = run(false, 7); console.log((verdict(c) && JSON.stringify(c) === JSON.stringify(a) ? '✔ ' : '✖ ') + 'the plant taken out: the same reading as the first run'); if (!(verdict(c) && JSON.stringify(c) === JSON.stringify(a))) fail++;
console.log(fail ? 'ZONES: RED' : 'ZONES: GREEN'); process.exit(fail ? 1 : 0);
