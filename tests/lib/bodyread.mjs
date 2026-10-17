/* THE BODY ON EVERY RIDE — REPORTED (10-17, the supervisor: "every sweep that rides airs (coping_capture, slide) reports the body's own gates
 * on every ride as ℹ REPORTED lines, the worst case named: joints ≤ 1,500°/s and the chain's stages"). The sweep rides each case POSED
 * (tests/lib/figure.mjs: the real pose every frame, on the park) and hands each frame here. Each ride's chain is its own (census: false — a
 * reported reading never gates the build's chain: tests/lib/chain.mjs) and is read to the ride's first bail: a fall and its respawn are
 * their own releases' (FALLS, and the respawn's pose — the next release's first item). The lines say the fastest joint over every ride and
 * where, and how many rides turned one past 1,500°/s; each stage's worst reading, as its share of its bound, and where, and how many rides
 * broke it (a share over 100 %).
 *   const B = bodyRead(); per ride: const r = B.ride(name, G); after each G.frame(): r.frame(f, sk, evs, m); at its end r.end(); B.say(label) */
import { chain, STAGES } from './chain.mjs';

export const JOINT_MAX = 1500;
export function bodyRead(FT = 1 / 60) {
  const W = { rides: 0, frames: 0, cut: 0, joint: { v: 0, at: '' }, jointRides: 0, stage: {}, broke: {} };
  return {
    W,
    ride(name, G) {
      W.rides++;
      const C = chain(G, FT, 8, { census: false }), T = []; let j = { v: 0, at: '' }, done = false, frames = 0;
      return {
        frame(f, sk, evs, m) {
          if (done) return;
          if (sk.state === 'bail' || evs.some((e) => e.type === 'bail' || e.type === 'respawn')) { done = true; W.cut++; return; }
          C.frame(f, sk, evs); T[f] = sk.t; frames++;
          if (m && m.joint > j.v) j = { v: m.joint, at: (m.jointAt || 'a joint') + ', ' + name + ' at ' + sk.t.toFixed(2) + ' s (' + sk.state + ')' };
        },
        end() {
          W.frames += frames;
          if (j.v > W.joint.v) W.joint = j;
          if (j.v > JOINT_MAX) W.jointRides++;
          const hit = new Set();
          for (const [k, e] of Object.entries(C.census)) {
            const stage = k.split(' · ')[0], S = W.stage[stage];
            if (!S || e.v > S.v) W.stage[stage] = { v: e.v, what: k.slice(stage.length + 3), val: e.val, unit: e.unit, at: name + ' at ' + (T[e.f] != null ? T[e.f].toFixed(2) + ' s' : 'frame ' + e.f) + ' (' + e.state + ')' };
            if (e.v > 1) hit.add(stage);
          }
          for (const s of hit) W.broke[s] = (W.broke[s] || 0) + 1;
        },
      };
    },
    /* two lines: the joints, and the chain's stages */
    say(label) {
      const n = (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(2));
      console.log('ℹ THE BODY ON EVERY RIDE — reported (' + label + '): ' + W.rides + ' rides posed, ' + W.frames + ' frames, each read to its first bail (' + W.cut + ' cut there: a fall and its respawn are FALLS\' and the respawn\'s pose\'s) — the fastest joint ' + W.joint.v.toFixed(0) + '°/s (' + (W.joint.at || '-') + '), ' + W.jointRides + ' ride' + (W.jointRides === 1 ? '' : 's') + ' past ' + JOINT_MAX + '°/s');
      console.log('ℹ THE CHAIN ON EVERY RIDE — reported (' + label + '): each stage\'s worst, its share of its bound — ' + STAGES.filter((s) => W.stage[s]).map((s) => { const S = W.stage[s]; return s + ' ' + (100 * S.v).toFixed(0) + ' % (' + S.what + ', ' + n(S.val) + ' ' + S.unit + ', ' + S.at + ')' + (W.broke[s] ? ' — broke on ' + W.broke[s] + ' ride' + (W.broke[s] === 1 ? '' : 's') : ''); }).join(' · '));
    },
  };
}
