/* THE HUD AND THE CARDS, as DOM: the combo as it builds (its tricks, its multiplier, its running total), what it banks or loses, the gaps,
 * the score and the best, the special meter, the balance needle; the title card (its door says Play), the pause card, how to play.
 * Nothing in the look band takes a finger (pointer-events: none) and nothing sits over the line ahead. */
const $ = (s, r = document) => r.querySelector(s);
const fmt = (n) => Math.round(n).toLocaleString('en-US');
export class Hud {
  constructor(root, opts) {
    this.root = root; this.opts = opts;
    root.insertAdjacentHTML('beforeend', `
      <div id="wl-hud" aria-live="polite">
        <div class="wl-score"><b id="wl-total">0</b><span>score</span><em id="wl-best">best combo —</em><i class="wl-special"><u id="wl-special"></u></i></div>
        <div class="wl-combo" id="wl-combo"><div class="wl-names" id="wl-names"></div><div class="wl-mult"><b id="wl-sum">0</b><span>×</span><b id="wl-mult">0</b></div><div class="wl-tag" id="wl-tag"></div></div>
        <div class="wl-pop" id="wl-pop"></div>
        <div class="wl-needle" id="wl-needle"><i></i><b id="wl-needle-dot"></b></div>
        <div class="wl-clock" id="wl-clock" hidden><b id="wl-clock-t">2:00</b><span id="wl-clock-wax">wax 0/5</span></div>
        <div class="wl-goal" id="wl-goal"><span>Goal</span><b id="wl-goal-name"></b></div>
        <div class="wl-hint" id="wl-hint-left"><b>Left thumb</b><span>slide to carve · push up to push</span></div>
        <div class="wl-hint" id="wl-hint-right"><b>Right thumb</b><span>pull down, flick up to ollie</span></div>
      </div>
      <button class="wl-btn wl-pause" id="wl-pausebtn" aria-label="Pause"><span></span><span></span></button>
      <div class="wl-card" id="wl-title">
        <div class="wl-mark"><span>WAX</span><span>LINE</span></div>
        <p class="wl-tag">a park at golden hour · two thumbs · every trick by hand</p>
        <button class="wl-go" id="wl-play">Play</button>
        <button class="wl-chip wl-runbtn" id="wl-run">Two-minute run</button>
        <button class="wl-chip wl-parkbtn" id="wl-park">Park: The Plaza</button>
        <div class="wl-row"><button class="wl-chip" id="wl-how">How to skate</button><button class="wl-chip" id="wl-assist">Assists: Cruise</button><button class="wl-chip" id="wl-look">Look: Real</button><button class="wl-chip" id="wl-sound">Sound on</button></div>
        <div class="wl-cut" id="wl-cut"></div>
      </div>
      <div class="wl-card wl-small" id="wl-pause" hidden>
        <h2>Paused</h2>
        <button class="wl-go" id="wl-resume">Resume</button>
        <div class="wl-row"><button class="wl-chip" id="wl-restart">Back to the deck</button><button class="wl-chip" id="wl-run2">Start a run</button><button class="wl-chip" id="wl-cam">Camera: Filmer</button><button class="wl-chip" id="wl-park2">Park: The Plaza</button></div>
        <p class="wl-progress" id="wl-progress"></p>
        <div class="wl-row"><button class="wl-chip" id="wl-assist2">Assists: Cruise</button><button class="wl-chip" id="wl-look2">Look: Real</button><button class="wl-chip" id="wl-sound2">Sound on</button><button class="wl-chip" id="wl-how2">How to skate</button></div>
        <div class="wl-cut" id="wl-cut2"></div>
      </div>
      <div class="wl-card wl-small wl-results" id="wl-results" hidden>
        <h2>Time</h2>
        <div class="wl-total"><b id="wl-res-score">0</b><span id="wl-res-best">best run —</span></div>
        <ul class="wl-goals" id="wl-res-goals"></ul>
        <div class="wl-row"><button class="wl-go" id="wl-again">Run again</button><button class="wl-chip" id="wl-free">Free skate</button></div>
      </div>
      <div class="wl-card wl-small wl-howto" id="wl-howcard" hidden>
        <h2>How to skate</h2>
        <div class="wl-cols">
          <div><h3>Left thumb</h3><p>Hold anywhere on the left half. <b>Slide sideways</b> to carve, <b>push up</b> to push, <b>pull down</b> to brake. A quick tap is one push. In the air, sideways spins. Roll over a ramp's coping from its deck to <b>drop in</b>.</p></div>
          <div><h3>Right thumb</h3><p><b>Pull down, flick up</b>: ollie. Flick <b>up-left</b>: kickflip, <b>up-right</b>: heelflip, <b>sideways</b>: shove-it. Curl the flick for varials; loop it for a 360 flip. A quick tap is a little ollie. Hold a light pull to <b>manual</b>. Ollie onto a rail or ledge to <b>grind</b>. In the air, hold a direction to <b>grab</b>. Out of a ramp, keep the grab held as you come back down onto its coping to <b>grind</b> it; let go to land. When the meter under your score turns <b>gold</b>: hold the end of a flick still for a <b>special</b>, or hold a slide still for a <b>Darkslide</b>.</p></div>
          <div><h3>Look</h3><p>Drag the open space at the top of the screen. With a mouse, drag with the right button.<span id="wl-how-full" hidden> <b>Full screen</b>: the corner button, top right (a phone turns to landscape).</span></p></div>
          <div><h3>Keys</h3><p>W/S push and brake · A/D carve and spin · <b>Space</b> ollie (hold a letter as you let go: J kickflip, L heelflip, K shove-it, I front shove, U/O varials, H hardflip, Y 360 flip) · G grab (held onto a ramp's coping: grind it) · M manual · R revert · C camera · Esc pause</p></div>
        </div>
        <p class="wl-whatin" id="wl-whatin"></p>
        <button class="wl-go" id="wl-howok">Got it</button>
      </div>
      <button class="wl-btn wl-full" id="wl-fullbtn" aria-label="Full screen" hidden><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M2 7V2h5M13 2h5v5M18 13v5h-5M7 18H2v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`);
    this.el = { clock: $('#wl-clock'), clockT: $('#wl-clock-t'), clockWax: $('#wl-clock-wax'), goal: $('#wl-goal'), goalName: $('#wl-goal-name'), results: $('#wl-results'), total: $('#wl-total'), best: $('#wl-best'), special: $('#wl-special'), combo: $('#wl-combo'), names: $('#wl-names'), sum: $('#wl-sum'), mult: $('#wl-mult'), tag: $('#wl-tag'), pop: $('#wl-pop'), needle: $('#wl-needle'), dot: $('#wl-needle-dot'), title: $('#wl-title'), pause: $('#wl-pause'), how: $('#wl-howcard'), pausebtn: $('#wl-pausebtn') };
    const on = (id, f) => { const b = $(id); if (b) b.addEventListener('click', (e) => { e.preventDefault(); f(b); }); };
    on('#wl-play', () => opts.onPlay()); on('#wl-resume', () => opts.onResume()); on('#wl-pausebtn', () => opts.onPause());
    on('#wl-fullbtn', () => opts.onFullscreen && opts.onFullscreen());
    on('#wl-run', () => opts.onRun()); on('#wl-run2', () => opts.onRun()); on('#wl-again', () => opts.onRun()); on('#wl-free', () => opts.onPlay());
    on('#wl-restart', () => opts.onRestart()); on('#wl-cam', (b) => { b.textContent = 'Camera: ' + opts.onCamera(); });
    for (const id of ['#wl-assist', '#wl-assist2']) on(id, () => { const n = opts.onAssist(); $('#wl-assist').textContent = $('#wl-assist2').textContent = 'Assists: ' + n; });
    for (const id of ['#wl-look', '#wl-look2']) on(id, () => { const n = opts.onLook(); $('#wl-look').textContent = $('#wl-look2').textContent = 'Look: ' + n; });
    for (const id of ['#wl-sound', '#wl-sound2']) on(id, () => { const s = opts.onSound(); $('#wl-sound').textContent = $('#wl-sound2').textContent = s ? 'Sound on' : 'Sound off'; });
    for (const id of ['#wl-how', '#wl-how2']) on(id, () => { this.el.how.hidden = false; });
    for (const id of ['#wl-park', '#wl-park2']) on(id, () => { if (opts.onPark) Promise.resolve(opts.onPark()).then((n) => this.setPark(n)); });
    on('#wl-howok', () => { this.el.how.hidden = true; });
    this.popT = 0; this.tagT = 0; this.shown = '';
  }
  setPark(name) { $('#wl-park').textContent = $('#wl-park2').textContent = 'Park: ' + name; }
  setCut(short, full) { $('#wl-cut').textContent = short; $('#wl-cut2').textContent = full; const w = $('#wl-whatin'); if (w) w.textContent = full; }
  /* the full-screen control, offered or not (view/fullscreen.js says why) */
  fullscreen(offered) { for (const id of ['wl-fullbtn', 'wl-how-full']) { const e = document.getElementById(id); if (e) e.hidden = !offered; } }   // the card names the control only where it is drawn
  mode(m) { document.body.classList.toggle('wl-shot', m === 'shot'); this.el.results.hidden = m !== 'results'; this.el.title.hidden = m !== 'title'; this.el.pause.hidden = m !== 'pause'; document.body.classList.toggle('wl-playing', m === 'play'); if (m !== 'title' && m !== 'pause') this.el.how.hidden = true; }
  setLabels(assist, sound, cam, look) { if (look) $('#wl-look').textContent = $('#wl-look2').textContent = 'Look: ' + look; $('#wl-assist').textContent = $('#wl-assist2').textContent = 'Assists: ' + assist; $('#wl-sound').textContent = $('#wl-sound2').textContent = sound ? 'Sound on' : 'Sound off'; if (cam) $('#wl-cam').textContent = 'Camera: ' + cam; }
  update(dt, score, sk) {
    this.el.total.textContent = fmt(score.total);
    this.el.best.textContent = score.best ? 'best combo ' + fmt(score.best) : 'best combo —';
    this.el.special.style.transform = 'scaleX(' + score.special.toFixed(3) + ')'; this.el.special.parentNode.classList.toggle('gold', score.golden);
    /* the combo as it builds, in the top band (the camera keeps her below it: camera.js SAFE); what it banks or loses appears in the same
       place as the box goes, and gives way to the next combo */
    const live = score.live(sk);
    if (live && (live.names.length || live.gaps.length)) {
      const text = live.names.slice(-5).join(' + ') || live.gaps.slice(-2).join(' + ');
      if (text !== this.shown) { this.el.names.textContent = (live.names.length > 5 ? '… + ' : '') + text; this.shown = text; }
      this.el.sum.textContent = fmt(live.sum); this.el.mult.textContent = String(live.mult); this.el.combo.classList.add('on'); this.el.pop.classList.remove('on');
    } else if (this.el.combo.classList.contains('on') && !this.holdCombo) { this.el.combo.classList.remove('on'); this.shown = ''; }
    /* what happened: banked, lost, a sketchy landing and a gap (these two said inside the box, under the count) */
    while (score.feed.length) {
      const f = score.feed.shift();
      if (f.kind === 'bank') this.flash('+' + fmt(f.value), 'bank');
      else if (f.kind === 'lost') { if (f.value > 0) this.flash('Lost ' + fmt(f.value), 'lost'); else this.flash('Bail', 'lost'); }
      else if (f.kind === 'gap') this.gap(f.name, f.value, f.fresh);
      else if (f.kind === 'sketchy') this.tag('Sketchy', 'sketchy');
    }
    this.popT -= dt; if (this.popT <= 0) this.el.pop.classList.remove('on');
    this.tagT -= dt; if (this.tagT <= 0) this.el.tag.classList.remove('on');
    /* the balance needle, while it matters */
    const on = sk.state === 'grind' || sk.state === 'manual' || sk.state === 'lip';
    this.el.needle.classList.toggle('on', on); this.el.needle.classList.toggle('v', sk.state === 'manual' || sk.state === 'lip');
    if (on) this.el.dot.style.transform = (sk.state === 'grind' ? 'translateX(' : 'translateY(') + (sk.needle * 46).toFixed(1) + 'px)';
  }
  /* the run: its clock and wax count; a goal said once as it falls; the card at its end */
  runClock(run) { const on = !!(run && run.on); this.el.clock.hidden = !on; if (!on) return; const s = Math.ceil(run.left), txt = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    if (this.el.clockT.textContent !== txt) this.el.clockT.textContent = txt; this.el.clock.classList.toggle('late', run.left <= 10); this.el.clockWax.textContent = 'wax ' + run.got + '/' + run.bars.length; }
  goal(name) { this.el.goalName.textContent = name; const g = this.el.goal; g.classList.remove('on'); void g.offsetWidth; g.classList.add('on'); }
  results(r, goals, done) {
    $('#wl-res-score').textContent = fmt(r.total); $('#wl-res-best').textContent = r.isBest ? 'a new best run' : r.best ? 'best run ' + fmt(r.best) : 'best run —';
    $('#wl-res-goals').innerHTML = goals.map((g) => '<li class="' + (done.has(g.id) ? 'done' : '') + (r.goals.includes(g.id) ? ' fresh' : '') + '"><b>' + g.name + '</b><span>' + g.say + '</span></li>').join('');
  }
  /* the first-run hints over each thumb's zone: they go once the thing they teach has been done */
  hints(left, right, rects) {
    for (const [id, on, r] of [['#wl-hint-left', left, rects && rects.carve], ['#wl-hint-right', right, rects && rects.flick]]) {
      const el = $(id); el.classList.toggle('on', !!on); if (on && r) { el.style.left = ((r.x0 + r.x1) / 2) + 'px'; el.style.top = (r.y0 + (r.y1 - r.y0) * 0.42) + 'px'; }
    }
  }
  progress(text) { $('#wl-progress').textContent = text; }
  flash(text, kind) { const p = this.el.pop; p.textContent = text; p.className = 'wl-pop on ' + kind; void p.offsetWidth; this.popT = kind === 'bank' ? 1.4 : 1.1; }
  gap(name, value, fresh) { this.tag(name + ' +' + fmt(value) + (fresh ? ' · new gap' : ''), 'gap'); }
  tag(text, kind) { const t = this.el.tag; t.textContent = text; t.className = 'wl-tag on ' + kind; this.tagT = kind === 'gap' ? 1.8 : 1.2; }
}
