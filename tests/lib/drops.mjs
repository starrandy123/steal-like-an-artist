/* WHAT A CAPPED SLIDE LEFT, BY ITS KIND (10-17, the supervisor: every capped slide said, so a cap is never a silent discard). Each step's said
 * leftovers (body.js noteDropped → sk.drops: { kind: { v, unit } } — a move in metres, a turn in radians: the roll's three bumps, the walls'
 * one slide, the air's three, a deck held on an edge, a landing's roll, the push-out's passes spent, a wheel against a face in the air, a turn
 * cut at a face), counted by kind over a sweep: how many steps, the most in one step and where. REPORTED, never a gate.
 *   const D = drops(); after each sim step: D.step(sk, where) — where() names the ride and the time · D.add(other) · D.say(label) → one ℹ line */
export function drops() {
  const K = {};
  const D = {
    K,
    step(sk, where) {
      if (!sk.drops) return;
      for (const [k, d] of Object.entries(sk.drops)) { const e = K[k] || (K[k] = { n: 0, v: 0, unit: d.unit, at: '' }); e.n++; if (d.v > e.v) { e.v = d.v; e.at = where(); } }
    },
    add(o) { for (const [k, d] of Object.entries(o.K)) { const e = K[k] || (K[k] = { n: 0, v: 0, unit: d.unit, at: '' }); e.n += d.n; if (d.v > e.v) { e.v = d.v; e.at = d.at; } } return D; },
    say(label) {
      const ks = Object.keys(K).sort((a, b) => K[b].n - K[a].n), size = (e) => (e.unit === 'rad' ? (e.v * 180 / Math.PI).toFixed(1) + '°' : (1000 * e.v).toFixed(1) + ' mm');
      return 'ℹ WHAT A CAPPED SLIDE LEFT — reported' + (label ? ' (' + label + ')' : '') + ', by kind: ' + (ks.length ? ks.map((k) => k + ' ' + K[k].n + ' steps, the most ' + size(K[k]) + ' (' + K[k].at + ')').join(' · ') : 'no step left a move or a turn unmade at a slide\'s cap');
    },
  };
  return D;
}
