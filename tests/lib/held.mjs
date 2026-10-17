/* AN AIR IS NEVER HELD (10-17): a board in the air whose middle moves under 1 mm in a step is standing still — a stop at a face stands for a
 * step or three; held longer it hangs where the eye sees it (HELD: 6 steps, 50 ms, three frames). The census's row 19 (a wheel stopped end-on
 * at a face), planted as a freeze — set back to its step's start, its velocity into the face kept — held boards still for 21 steps and one air
 * for 2.4 s, and every air still ENDED (its fall grows until its middle's own path lands it): AN AIR ENDS cannot see a hold that lets go. r24
 * held the Spine end 647 steps and the fence's top 552; the tree, 3 (tests/slide.mjs) and none (tests/coping_capture.mjs).
 *   const H = held(); after each sim step: H.step(sk, p0, where) — p0 the middle before the step, where() names it · H.v the most, H.at where */
export const HELD = 6;
export function held() {
  let run = 0;
  const H = {
    v: 0, at: '',
    step(sk, p0, where) {
      if (sk.state !== 'air') { run = 0; return; }
      run = Math.hypot(sk.p[0] - p0[0], sk.p[1] - p0[1], sk.p[2] - p0[2]) < 0.001 ? run + 1 : 0;
      if (run > H.v) { H.v = run; H.at = where(); }
    },
    reset() { run = 0; },
  };
  return H;
}
