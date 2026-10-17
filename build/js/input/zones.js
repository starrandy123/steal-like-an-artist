/* WHO OWNS A FINGER (DESIGN.md §2.2, §2.7): the screen is a look band on top and, below it, the carve zone (left) and the flick pad (right),
 * clear of the notch and the home bar. A finger belongs to the zone it LANDED in for as long as it is down — a flick that runs up into the
 * band is still a flick; a look that crosses down into the pad never pops. touch.js routes every pointer through these Owners; the Node
 * test (tests/zones.mjs) drives the same Owners. `plant: true` is the fault the test must catch: ownership by where the finger IS. */
export function zoneRects(vw, vh, ins, Z) {
  const turned = vw > vh, band = Math.max(Z.bandMin, vh * (turned ? Z.bandTurned : Z.bandUpright));
  const top = band, bottom = vh - ins.b, left = ins.l, right = vw - ins.r, mid = (left + right) / 2;
  return { band, look: { x0: 0, y0: 0, x1: vw, y1: band }, carve: { x0: left, y0: top, x1: mid, y1: bottom }, flick: { x0: mid, y0: top, x1: right, y1: bottom } };
}
const inR = (r, x, y) => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1;
export function zoneAt(rects, x, y) { return inR(rects.carve, x, y) ? 'carve' : inR(rects.flick, x, y) ? 'flick' : y < rects.band ? 'look' : 'none'; }
export class Owners {
  constructor(rects, opts = {}) { this.rects = rects; this.plant = !!opts.plant; this.map = new Map(); }
  land(id, x, y) { const z = zoneAt(this.rects, x, y); this.map.set(id, z); return z; }
  at(id, x, y) { if (this.plant) return zoneAt(this.rects, x, y); return this.map.get(id) || 'none'; }
  lift(id) { const z = this.map.get(id) || 'none'; this.map.delete(id); return z; }
}
