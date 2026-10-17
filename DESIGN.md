# Waxline — DESIGN (M0 passed 2026-10-15; M1 under way)

**Waxline** — slug `waxline`, the owner's pick of 2026-10-15 (§14); folder `~/Documents/ports_src/_work/waxline/`. House account `sports`. Builder: terminal session
orgo-u-62; supervisor: orgo-u-53. Nothing here is built yet: every number below is a TARGET with the instrument that will measure it. The
`Measured` column of §1 stays empty until a milestone fills it with evidence.

**The game in one paragraph.** A phone-first 3D skateboarding game at golden hour: one compact, line-dense concrete park built to real
dimensions (§6), skated with two thumbs — the left carves and pushes, the right FLICKS tricks (pull down, flick up; the flick's shape picks the
trick and is graded for accuracy and speed, §2–§3) — with grinds snapped by approach angle, manuals, reverts, lips, airs and THPS-grammar
combos over 24 named gaps (§5), original skaters sculpted in code (§7), synthesized surface-true sound (§8), and friends skating the same park
live through the room, with S.K.A.T.E. as turns (§9). Simulation in plain deterministic JS at a fixed 120 Hz; three.js is only the view.

**M0 evidence on disk:** `plan/park_plan.png` (the plan, looked at) · `plan/park_plan.svg` · `plan/park_plan.txt` (ASCII, 1 char = 1 m) ·
`plan/gaps.txt` (every gap against the physics) · `plan/flick_spike.txt` (the flick reader through synthetic thumbs) · `spikes/*.mjs`
(both throwaway, `node spikes/<name>.mjs` reproduces them) · `CLEANROOM.md` (every feel number and its source).

---

## 1. The parity table — the contract

| # | Dimension | Reference (documented) | Our target | Instrument | Measured |
|---|---|---|---|---|---|
| 1 | Frame rate & sim | Skate 2: 60 fps on 60 Hz physics, stick at 120 Hz; THPS 1+2: "full 60fps" on PS4 | 60 fps: frame p50 ≤ 16.7 ms, p95 ≤ 20 ms, frames > 33 ms ≤ 2 % over a 3-minute bot run on the phone tier; sim a fixed 1/120 s step, render interpolated between the last two sim states, ≤ 4 sim steps a frame | in-game perf ring `window.__wl.perf` logged by `perf_wl.mjs` under `drive.mjs --gpu` (real GPU, no window) at 390×844 and 844×390; the certification's fps median (platform floor 20, phone warning < 30); the owner's phone | — |
| 2 | Touch sampling | Skate read its stick at 120 Hz ("60 hertz did not give us enough information") | every sample the browser delivers is read and time-stamped (`getCoalescedEvents()` where present: Chrome; iOS Safari ≥ 18.2); the reader reads equally well at 60, 120 and 240 Hz (±2 points) | `tests/reader.mjs` (Node) at 60/120/240 Hz; samples-per-second counter on the bot | spike: 90.0 / 91.5 / 90.5 % right at a 10° thumb wobble (`plan/flick_spike.txt`) |
| 3 | Handling | THPS 1+2 kept Neversoft's handling code (arcade carve); Skate graded each flick 1–5 accuracy × 1–5 speed | push from rest to 4.5 m/s in ≤ 2.2 s; carve radius ≈ 3.1 m at 5 m/s, 1.0 m at walking pace; graded flick (accuracy = distance to the trick's template, speed = peak px/ms); the Cruise preset (Streamlined-style) on by default | `tests/handling.mjs` (speed curves, turn radii in the sim); `tests/reader.mjs` (≥ 95 % right at 6°, ≥ 90 % at 10°, ≥ 99 % of strokes pop); bot runs | spike reader: 96.4–97.5 % at 6°, ≥ 99.8 % pops |
| 4 | Trick set | THPS1: 8 grabs, 8 grinds, 8 flips a skater; later: reverts, lips, manuals, wall plants, doubles | 13 flips (+ nollie and switch variants), 8 grabs, 11 grinds/slides, manual + nose manual, 2 reverts, 5 lips, 4 specials (§5.1) | `TRICKS` in `js/config.js`; `tests/tricks_reachable.mjs`: each trick, from a canonical start, by its own input, lands under its own name | — |
| 5 | Scoring | +1 multiplier per trick and per gap; repeats 100/75/50/25/10; switch +20 %; special meter fills on landed tricks and empties on a bail | the same grammar, original presentation; 24 named gaps; flick grade ×0.8–1.2; spin ×(1 + 0.5 per 180°) (§5.2) | `tests/combo.mjs`: golden cases + 10,000 seeded random combos against an independent reference formula | — |
| 6 | Assists | skate.: Flick-It sensitivity 50, Grind Assist 50, Vert Pump Assist 85; THPS 1+2 perfect-balance mods | presets Cruise (default) / Classic / Raw; catch, grind, balance, pump, spin and vert assists each a number in `ASSISTS` (§2.6) | `tests/assist_sweep.mjs`: the sim with a noisy-thumb model at 0/50/85/100 → landing %, grind-lock %, mean manual seconds; the same sweep on the bot | — |
| 7 | Animation | Skate: mocap as a physics target, each joint blended 0–100 % ragdoll→animation | procedural board; two-bone IK feet: foot-to-deck error ≤ 1.5 cm RMS rolling/manual/grind, ≤ 4 cm through catches; keyed poses as numbers in config; a Verlet ragdoll for bails, blended in over 0.1 s | the IK error logged every frame by the bot; slow-motion shots (time ×0.25) of every trick family, zoomed | — |
| 8 | Camera | Skate's low filmer view, a higher THPS-like option (Skate 3) | Filmer (default) and High; never inside geometry (a 0.25 m sphere: 0 penetrations over a 3-minute bot run); look = drag in the open band (§2.2) | a camera probe counting penetrations; shots at all 24 gaps | — |
| 9 | Park | THPS 1+2: 19 levels; True Skate: licensed real parks | ONE hero park, 62 × 44 m, 21 skateable elements on five levels, all at real dimensions, 6 lines, 24 named gaps — every gap clearable at push or line speed | `plan/park_plan.svg`, `plan/gaps.txt`; `tests/park_lines.mjs` (the sim skates each line by scripted input and fires its gaps); the weight | spike: 24 of 24 gaps clearable (`plan/gaps.txt`) |
| 10 | Audio | THPS 1+2 surface-specific wheel sounds; Skate 2 nominated for sound design (AIAS) | 6 surfaces × 4 layers (roll, pop, land, grind/slide), synthesized; slab joints clack under the wheels; mute + volume | the layer inventory in `SOUND`; one OfflineAudioContext render per surface written to WAV — for the supervisor's and the owner's ears | — |
| 11 | Multiplayer | THPS 3+4: 8 online; Skater XL: lobbies of 10 | drop-in park, soft cap 10 (the nearest 9 drawn); one frame a skater at 10 Hz, interpolated 120 ms behind; S.K.A.T.E. as turns | the certification's two-player pass; a local two-frame harness with 0–300 ms injected latency and jitter: remote position error p95 ≤ 0.15 m at 150 ms | — |
| 12 | Memory | consoles 256–512 MB | ≤ 192 MB hard (the platform fails a phone pass above it); target ≤ 140 MB at peak on the phone tier (budgeted ≈ 101 MB, §10) | `_kit/weigh.mjs` upright, turned and turned back; the in-game ledger | — |
| 13 | Resolution | THPS 1+2: 4K on PS4 Pro | phone: drawing buffer ≤ 1.3 Mpx (pixel ratio ≤ 1.75); desktop ≤ 2.0 | the ledger logs the drawing-buffer size; the certification's phone passes run at pixel ratio 3 | — |
| 14 | Boot | — | ready ≤ 3 s on this laptop, ≤ 6 s on a phone; progress is real work | `weigh.mjs` `boot_ms`; the certification's boot reading | — |
| 15 | Characters | Skate 2's characters "50 to 100 percent better-looking" than Skate 1's (qualitative) | 4 originals, 9–14k triangles each, a 24-bone rig, faces and hair that read at phone distance, fabric shading (§7.4) | zoomed shots at 390×844 ×3; triangle counts logged | — |
| 16 | Input latency | not documented | within 1–2 frames of a native skate game on the same phone | a 240 fps camera (the owner's to film); meanwhile, internally, "touch sample → first frame showing the pop" | unmeasured |

Rows 2, 13, 14 and 15 are added to the brief's table (§15 item 9): the report's own skate table has resolution; the rest are where "match the
quality in all types" would otherwise go unmeasured.

---

## 2. Controls

### 2.1 The screen, upright and turned

```
 TURNED (844 x 390)                                  UPRIGHT (390 x 844)
 +--------------------------------------------+      +----------------------+
 | (II)      LOOK BAND - the open screen  (i) |      | (II)            (i)  |
 |        combo / score / special (no input)  |      |   LOOK BAND          |
 +----------------------+---------------------+      |   (the open screen,  |
 |                      |                     |      |    46 % of height)   |
 |   CARVE ZONE         |   FLICK PAD         |      |   combo / score      |
 |   left thumb         |   right thumb       |      +----------+-----------+
 |   (floating origin)  |   (no drawn keys)   |      |  CARVE   |  FLICK    |
 |                      |                     |      |  ZONE    |  PAD      |
 +----------------------+---------------------+      +----------+-----------+
```

- **Three areas, decided by where a finger LANDS, never by how it moves.** The look band is the top 30 % of the height when turned (min 96 px)
  and 46 % when upright; below it the screen splits at the middle into the carve zone and the flick pad. Every number is `INPUT.zones` in
  config. The zones are transparent DOM elements marked `data-mosa-ui` (the kit's look never takes them); the band is the open screen and is
  the kit's `touch.look` (law 3, unchanged). HUD text sits in the band with `pointer-events: none`, so a drag over a score still looks.
- **A gesture belongs to the area it started in for its whole life** (pointer capture by `pointerId`). A flick that starts on the pad and
  ends high in the band is a flick; a look that starts in the band and crosses the pad is a look. So looking cannot eat a flick by
  construction — and §2.7 says how that is proven, both directions.
- Multi-touch: the left thumb carving, the right thumb flicking and a third finger looking are three pointers, each routed by its own id.
- Safe areas: zones start `env(safe-area-inset-*)` + 8 px in; the flick pad's rest point (where the hint shows the thumb) sits at 60 % of
  the zone's height so the pull-down never reaches the home indicator (§12 risk 6). Buttons ≥ 44 px; no text under 12 px.
- The platform's "is the player in" reader presses a door whose words begin `play`, `start`, `drop in`, … and `weigh.mjs` only knows
  `play`, `start`, … — so the title's main button says **Play** (both read it). No full-screen lifted layer carries words during play
  (§15 item 13).

### 2.2 Looking

- Dragging in the band orbits the camera around the skater: yaw ±150°, pitch −20°…+45°, 0.0055 rad a CSS px (`INPUT.look`); released, it
  eases back to the follow view over 0.8 s (sooner — 0.4 s — while rolling faster than 3 m/s). A tap in the band does nothing (`onTap` is a
  no-op: a tap is never a trick). `slop` 6 px before a drag counts.
- Desktop: a right-button (or any-button in the band) mouse drag looks; Q/E nudge yaw. Gamepad: the d-pad looks.
- **Alternatives considered and rejected:** a two-finger drag (needs a third finger while both thumbs work); telling a flick from a look by
  speed (a slow flick and a fast look overlap: it would eat flicks, and the notes say that arbitration is untested); look only when stopped
  (no looking while rolling a line).

### 2.3 The left thumb — carve and push

A floating origin where the thumb lands (re-anchored if it drifts beyond 90 px). A faint 56 px ring shows under the thumb only while it is
down — feedback, not a stick to aim at.

| Thumb does | On the ground | In the air |
|---|---|---|
| sideways offset (6 px dead zone, full at 70 px, curve ^1.3) | carve (lean); below 1 m/s a kickturn on the spot | spin (≤ 600°/s) |
| up (≥ 24 px) and hold | push, a stroke every 0.8 s at most (slower above 4 m/s) | — |
| down (≥ 24 px) and hold | brake (foot drag); powerslide above 3.5 m/s | — |
| quick tap (< 180 ms, < 12 px) | one push | — |
| no thumb | roll on, straight | no spin |

Pushing forward and stopping on the left stick is what skate.'s Streamlined preset does (EA's accessibility page); the brief's "push = a tap
or hold" clashes with a hold that carves (§15 item 2) — the vertical axis settles it.

### 2.4 The right thumb — the flick pad

Every gesture is one stroke of one finger, read by the reader of §3. Directions are SCREEN directions (up = up the screen); the side words
use the regular-stance convention (kickflip = up-left) and the `screen` mapping is the default — the same thumb gesture always makes the same
trick whatever the stance; `INPUT.mapping: 'foot'` (the flick follows the foot as the camera sees it) is the purist's option.

| Gesture on the pad | Reads as |
|---|---|
| pull DOWN (≥ 18 px), flick UP | Ollie (height from the flick's speed grade and the load's depth) |
| pull UP, flick DOWN | Nollie (the same family off the nose) |
| pull down, flick up-left / up-right | Kickflip / Heelflip |
| pull down, flick left / right | Backside / Frontside Pop Shove-it |
| pull down, flick left curling up (an "L", ~90°) / right curling up | Varial Kickflip / Varial Heelflip |
| pull down, flick left sweeping over to up-right (~135°) / right sweeping to up-left | Inward Heelflip / Hardflip |
| pull down, flick left and loop over the top (~330°) / right, looped the other way | 360 Flip / Laser Flip |
| a kickflip or heelflip at speed grade 5 (Classic) | Double Kickflip / Double Heelflip |
| a light pull (12–34 px) held ≥ 90 ms, slowly, while rolling ≥ 1 m/s | Manual (a light push up and hold: Nose Manual) |
| from a manual, flick up | pop out of it (any flip) |
| in the air: a slow drag ≥ 26 px held ≥ 90 ms toward one of 8 directions | the grab of that direction (§5.1); held longer = more points |
| in the air, near a rail or ledge | nothing to do: the grind snaps by approach angle (§4.6); a direction held at the lock picks a variant |
| grinding / manualling: the thumb's horizontal (grind) or vertical (manual) offset | corrects the balance needle |
| reaching a coping slowly, the thumb held | a lip trick (its direction picks which); lifting drops back in |
| touchdown on a transition or bank, a quick sideways swipe within ±0.18 s | FS / BS Revert (the combo goes on) |

Under **Cruise** (the default preset — skate.'s Streamlined in spirit: "any upward or sideways flick … performs a basic flip trick at
maximum height"): the pull-down is optional (a bare flick up or sideways pops at full height), every pop is at full height whatever its speed
grade, flips are always caught, and the curved and looped strokes still make their bigger tricks when drawn clearly.

### 2.5 Desktop and gamepad

- **Keys:** W/↑ push (hold), S/↓ brake, A/D or ←/→ carve (and spin in the air). Space: hold = load, release = pop; the trick is the key held
  at release on the I-J-K-L ring: I up (ollie), U up-left (kickflip), O up-right (heelflip), J left (BS shove), L right (FS shove); two ring
  keys in quick succession draw the curves (J→U varial kickflip, L→O varial heelflip, J→O inward heel, L→U hardflip, J→I→L 360 flip,
  L→I→J laser). In the air, holding a ring key grabs; M manual, N nose manual; Shift at touchdown reverts; mouse drag looks. **The mouse
  on the right half is the flick pad itself** — the same reader.
- **Gamepad (standard mapping):** left stick carve/push/brake; the right stick IS the flick pad (its position each sim step becomes the
  stroke, scaled 1.0 = 70 px); LB/RB spin; B brake; Y camera mode; d-pad looks; Start pauses.

### 2.6 Assists — presets, every number in `ASSISTS`

| Assist | What it does | Cruise (default) | Classic | Raw |
|---|---|---|---|---|
| streamlined | any up/sideways flick pops a basic trick at full height | on | off | off |
| catch | finishes a flip that is ≥ x % done before touchdown | 100 (≥ 40 %) | 50 (≥ 70 %) | 0 |
| grind | lock radius 0.20 + 0.50·a m; the needle's restoring force | 85 | 50 | 0 |
| balance (manual, lip) | the needle's restoring force | 85 | 50 | 0 |
| pump | gain per transition pass (0.32 m/s at 85) | 85 | 85 | 0 |
| vert | keeps a transition air over its ramp (removes this share of deck-ward speed) | 85 | 60 | 0 |
| spin | landing yaw snaps to the nearest 180° within ± this | 45° | 30° | 0 |
| flick sensitivity | scales the reader's distances (50 = ×1.0, 100 = ×0.6, 0 = ×1.5) | 50 | 50 | 50 |

Classic carries skate.'s documented defaults (sensitivity 50, grind 50, vert pump 85).

### 2.7 Proving looking never eats a flick (both directions)

1. `tests/zones.mjs` (Node): 10,000 synthetic gestures — flicks started on the pad whose strokes run up into the band (all must reach the
   reader), looks started in the band that cross down into the pad (none may pop), and three-pointer chords; the plant: give the band
   ownership to "where the finger IS" instead of "where it landed" and watch the test fail, then put it back.
2. The bot, by touch, on Chromium (CDP touch points, two and three fingers at once) and WebKit (touch-type PointerEvents on
   `elementFromPoint`, the house brief's method): 50 high flicks, 50 band looks, 30 carve+flick chords — the game's own counters (pops,
   camera yaw) must match the script exactly.
3. A real thumb: the owner's phone (said as unproven until then).

---

## 3. The flick reader (the gesture grader)

### 3.1 Pipeline

1. **Samples.** `pointermove` with `getCoalescedEvents()` (feature-detected; iOS 18.2's coalesced events lack `pointerId`/`target` — take
   the parent event's), each `{t: event.timeStamp, x, y}`; buffered per pointer; consumed by the sim step whose time they fall in, so a pop
   lands at its sample's moment, not at the next frame.
2. **The load.** The thumb lands at O; moving away from O by ≥ 18 px (× sensitivity) DOWN is a tail load (UP: a nose load). The load point E
   follows the thumb while it goes deeper, and FREEZES the moment the thumb leaves it upward or sideways (6 px, within ±115° of the release
   direction). The skater crouches with the load's depth, live.
3. **The pop.** The thumb leaves E fast: distance ≥ max(16 px, 0.5 × load depth), direction within ±115° of the release direction, sample
   speed ≥ 0.45 px/ms → POP, at that sample's time. A stroke released before that but already fast pops on release. Measured on synthetic
   thumbs: 99.8–100 % of strokes pop, a median 37–50 ms after the stroke begins (60 → 240 Hz).
4. **The shape.** The stroke = from the last sample within 3 px of E (a resting thumb's jitter is not part of the flick) to its end, at most
   200 ms after the pop. Every flip begins with the same rising pop, so deciding the flip up to ~200 ms after it costs no visible latency.
5. **The trick.** The stroke is resampled to 24 points by length and scaled to length 1; the nearest trick TEMPLATE wins (the $1-recognizer
   method — Wobbrock, Wilson & Li 2007 — without its rotation step, because here the direction IS the trick). A curved or looped trick wins
   only by a margin of 0.02 over the best straight one: **a harder trick must be drawn clearly.** Templates are data in config
   (`TRICKS[*].stroke`, a few control points) — a modder adds a flip by drawing its stroke.
6. **The grades.** Accuracy 1–5 from the template distance (5 ≤ 0.04, 4 ≤ 0.07, 3 ≤ 0.10, 2 ≤ 0.14, else 1); speed 1–5 from the peak
   stroke speed (5 ≥ 2.0 px/ms, 4 ≥ 1.4, 3 ≥ 0.95, 2 ≥ 0.6, else 1), × sensitivity. Speed sets pop height (unless Cruise) and flip rate;
   accuracy sets the score factor and catch quality. Both show on the trick's label (two small pips).

### 3.2 What the spike found (`spikes/flick_spike.mjs` → `plan/flick_spike.txt`)

Synthetic thumbs (11 tricks × 400 each; load 26–60 px; strokes 48–100 px in 45–120 ms, loops 90–150 px in 110–200 ms; angular wobble σ;
0.8 px positional jitter), at 60/120/240 Hz. The first reader I sketched read **25–38 %** right and missed 28 % of pops; five defects were
found and fixed, each a line in §3.1: (1) a pop rule that wanted UPWARD travel never popped a shove-it; (2) turning summed sample by sample
drowned in jitter, worse at 240 Hz; (3) a hardflip (135° curl) and a laser flip (180°) were nearly one shape — the 360 family became a loop;
(4) a load point that followed the thumb sideways never let it leave; (5) a load point that froze on the way down at 60 Hz (samples 6 px+
apart) cut the load into the stroke. Final reading (`templates+0.02`):

| | σ 6° | σ 10° | σ 15° | pops | pop after stroke start (median / p90) |
|---|---|---|---|---|---|
| 60 Hz | 96.4 % | 90.0 % | 80.1 % | 99.1–100 % | 50 / 66 ms |
| 120 Hz | 97.5 % | 91.5 % | 82.1 % | 99.3–100 % | 41 / 58 ms |
| 240 Hz | 96.7 % | 90.5 % | 82.2 % | 99.5–100 % | 37 / 54 ms |

The weakest pairs are kickflip ↔ varial kickflip and shove-it ↔ varial (81–89 %); the loops and the 135° hooks read 95–100 %. **Synthetic
thumbs are not real ones**: real thumbs arc around their joint, which pushes straight flicks toward the hooks. So M1 adds (a) recorded real
strokes from the bot and, when the owner sits it, his phone, and (b) a 20-second "flick check" in Settings that measures a player's own arc
and bends the straight templates to it.

---

## 4. Physics

### 4.1 Units, step, determinism

Metres, seconds, radians; x east, z north, y up. The sim is plain JS with its own vector maths (no three.js — `tests/*.mjs` run it in Node),
a fixed step of 1/120 s with an accumulator (≤ 4 steps a frame; a longer hitch is dropped, said in the perf ring), state DRAWN between
the last two steps at alpha = what is left of the frame over a step (`js/formulas/step.js` alpha; `js/view/figure.js` drawn — Fiedler's "Fix
Your Timestep!"): positions mixed, attitudes turned the short way, the stroke taken from the step whose phase holds the drawn instant,
everything discrete from the newest step. Specified here since M0 and never wired until 10-16 (the supervisor's A: at 90 Hz the steps ran
1,1,2 and the drawn move was 0.75× or 1.5× its frame's time; at 120 Hz after a hitch a third of the frames did not move) — walled by THE DRAWN
MOVE IS THE FRAME'S OWN TIME (`tests/formulas.mjs`, browser stamp lists) and THE DRAWN MOTION IS EVEN (`tests/drive/even.mjs`, the page,
both ways). The eye sees the newest step at most one step (8.3 ms) later. Randomness (the balance needle's drift, bail tumbles) comes from a seeded generator; the same
inputs reproduce the same run bit for bit in one engine (`tests/determinism.mjs`: three 10-minute scripted runs, a state hash every second).
Across engines (V8 vs JavaScriptCore) `Math.sin`'s last bit can differ — it does not matter: each device is authoritative over its own skater
(§9).

### 4.2 The numbers (all in `PHYSICS`; sources in `CLEANROOM.md`)

| Quantity | Value | Where it comes from |
|---|---|---|
| gravity while rolling (slopes, transitions) | 9.81 m/s² | physics |
| gravity in the air | 12.5 m/s² (1.27 g) | own tuning, Pittman's "Building a Better Jump" method: apex 0.85 m reached in 0.369 s |
| ollie apex (board bottom over takeoff), speed grade 1 → 5 | 0.30 → 0.85 m (pop 2.74 → 4.61 m/s); full load +8 % | own; ceiling: the 45 in (1.143 m) Guinness high-ollie record |
| pop direction | normalize(lerp(world up, surface normal, 0.35)) | own |
| push | Δv = 1.75·(1 − v/7.5)^0.6 m/s a stroke, a plant every 0.8 s at most held (slower above 4 m/s; a standing start's first three straight on) — rest to 4.5 m/s in 2.07 s | own; cruise ≈ 4.5 m/s (10 mph) sits in the 5–12 mph reported cruising range |
| top speed: pushing / pumping / absolute | 7.5 / 8.5 / 12 m/s | own |
| pump gain | 0.32 m/s per transition pass at pump assist 85 (linear in the assist) | own; skate.'s Vert Pump Assist default 85 (EA) |
| rolling resistance (× g) | slab 0.010 · pavers 0.016 · asphalt 0.020 · grass 0.25 | the slab's is Pham's measured Crr (a rider towed at 4 m/s, 76a wheels); the rest own |
| air drag | 0.0036·v² m/s² (½·ρ·CdA/m, CdA 0.45 m², 75 kg) | own |
| carve | curvature ≤ min(1.0, 7.0/v²) m⁻¹ (lateral grip 7 m/s²); lean responds in 0.12 s | own |
| brake / powerslide | 2.5 m/s² / 5.0 m/s² above 3.5 m/s | own |
| kickturn | below 1.0 m/s, 220°/s on the spot | own |
| spin | ≤ 600°/s, 2,400°/s² | own |
| grind lock | −6 % speed at the lock; friction (× g): rail 0.025 · waxed angle 0.030 · bare angle 0.050 · waxed granite 0.040 · painted curb 0.070 · coping 0.040; slides ×1.6 | own |
| landing | clean: tilt ≤ 22°, yaw ≤ 28° (forward or fakie), flip ≤ 8 % left · sketchy: ≤ 40° / 45° / 18 % → speed ×0.8, 0.6 s wobble · else bail | own |
| bail | 0.9 s of ragdoll; skating again ≤ 1.3 s after the bail; a tap skips after 0.35 s | own; the brief's "fast respawn" |
| board | deck 8.0 × 31.75 in (0.203 × 0.806 m), wheelbase 14.25 in (0.362 m), wheels 53 mm, deck top 0.09 m off the ground | retail size guides (evo, Sendy): widths 7.5–8.5 in, lengths 28–33 in, wheelbase 13–15 in (avg 14.25), wheels 50–60 mm; truck height 53 mm is my estimate |

### 4.3 The controller: riding the surface

- The skater and board are ONE kinematic body: board position (deck centre), orientation, velocity; the body and the flips are animation on
  top (§7.5), never physics.
- **Four wheel probes** (± half the wheelbase, ± half the truck width) cast along the board's −up from 0.25 m above the deck against the
  park's collision mesh; the hits give the ground point and an interpolated (smooth) normal. The board takes the plane of its four contacts;
  velocity is re-projected onto that plane every step, so concave transitions bend the path without losing speed (minus friction).
- **Collision mesh:** the park's own generated triangles (the same generators that make what is drawn, at collision detail), with smooth
  per-vertex normals so a 5°-faceted transition rides like a curve; a small BVH of my own (deterministic, ~250 lines; no physics engine — the
  brief allows one only if needed: it is not, §15 item 10). Rails are separate polylines with metadata (surface, kind, side normals).
- **Leaving the ground:** a pop; or the surface falling away faster than gravity can bend the path (v²·κ > g·(n·up) over a convex edge — a
  ledge's end, the terrace's lip) → a roll-off into the air; or the probes finding no surface past a coping while moving up → a transition
  air.
- **Vert assist:** in a transition air (lip normal within 30° of horizontal), the deck-ward part of the velocity is removed by the vert
  assist share over the first 0.2 s, so the skater comes back down into the ramp; steering outward hard (left thumb) disables it — the way to
  air out onto a deck. What it drifted out in those 0.2 s it drifts back (10-16): the air comes down 8 cm inside its lip, drawn in at up to
  4 m/s² × vert / 100 (out of the Basin at 9 m/s it had landed on the deck behind the coping).
- **The contacts (10-16, T2):** the board takes the plane THROUGH its four contacts (the diagonals' cross), not the mean of their normals —
  over a seam the board turns as each pair crosses, over the wheelbase's travel; a wheel touches only ground within 5 cm of its line, and
  past an edge the board rolls on its touching wheels while its middle is over the ground, then flies.
- **Over a coping (the landing release, 10-16/17):** a lip ROLLS a board over its coping only below its own measured roll-in speed, v\*,
  and every lip's is measured, never set (`tests/vstar.mjs`: rolled over at every speed of the sweep on Cruise and Classic, each run judged by
  the surfaces wall's own gates; a stored v\* above the measured one is RED). The Plaza's four: the Basin (75.5° at its lip, r 2.44 m), the
  Deck Quarter and the East Wall (70.6°, r 2.74), the Lawn Quarter (64.7°, r 2.13) — **v\* = 0 on each**: rolled over at the sweep's slowest
  (0.60–0.63 m/s at the coping) the deck turns 292–316°/s over its contacts (≤ 120), the board goes 2–3 cm into its coping (≤ 0.2) and the
  chain breaks. The 2D model before the build said the same (the rider on the view's own followers): over the Basin's 75° lip a ROLLED board
  gives the hips 110–198 m/s² at 3–7 m/s with the lean at its best timing, 835–2,159 without it (the ground holds 60). So **every run from
  the deck drops in**: the rider leans ahead before the edge (the trunk's own capped spring, ≤ 0.5 rad), the board leaves the coping as a short
  air, its up turns toward the wall's normal critically damped and timed by the landing, and its PATH turns toward the wall only once its tail
  is a wheel's radius past the coping (turned from the take-off, the path dragged the back truck 2.3 cm through the coping's line) — then it
  lands clean on the wall: 28 / 28 runs, 1–7 m/s. Raw has no assist: the air lands as it flew. A lip that held the rolled crossing's gates
  would roll (none on the Plaza; Kiln Yard's 62–70° lips are measured by the same tool).
- **The high-centre:** the deck between its trucks and each truck about its axle are rectangles, the park's edges segments
  (`formulas/edge.js`); a board high-centred on a ridge rests at the right height and tips the right way, and an edge lying flat across the
  deck holds it along its middle (it pitches, never banks). A coping is met at its SOLID lip (`rail.corner = −COPING_TOP`); its drawn tube's
  top is the grind line (`parkview.js copingTube`, within 2 mm: `tests/park.mjs`). REPORTED: the tube is drawn 2 cm over the solid lip and is
  not yet solid to the board — the grind release makes it solid (its plant: a tube drawn and not solid → RED).
- **The contacts (the studied techniques, CLEANROOM.md):** a face is met as a STOP ON THE PATH a millimetre short of it (continuous
  collision: Catto's time of impact), never a push-out after the fact; a contact present as the step began is corrected a quarter a step
  (Baumgarte's β = 0.25, Box2D's); and **COLLIDE AND SLIDE** (Fauerby 2003, the character controller's slide move): stopped at a face, the
  board goes the rest of the step along it — up to three bumps a step, seated once after them (stopped and left there, 827 scraping steps
  lost more than 2 mm of their own move, the most 20 mm, and a board stood pinned on the East Deck's fence: `tests/slide.mjs`). A turn never
  carries a wheel into a face (`turnClear`); a trailing wheel still meets a wall that is steep in the world; a wheel past a convex edge is over
  the drop.
- **The heading never steps on the ground:** rolling, the board's heading turns toward its travel no faster than the steering gives at its
  speed plus what the forces along the surface turn the travel by — the friction circle — and a travel further off is a SKID, the wheels'
  grip taking it across the board at the carve's lateral limit (8 m/s²). Gated in the surfaces sweep and the camera wall (≤ 2 rad/s past the
  budget); a revert and a spin in the air are their own.
- **Pumping:** on a transition (curvature > 0.2 m⁻¹) the pump assist adds its gain over each pass; with pump at 0, the full grammar: crouch
  (pull down on the pad, slowly) through the bottom, extend going up — the gain scales with timing.

### 4.4 The state machine

```
                 pop / roll-off / lip-launch
      +--------+ ---------------------------> +-------+
      |  ROLL  |                               |  AIR  | --- touchdown: clean/sketchy --> ROLL (or MANUAL, REVERT)
      | (push, | <---- release / end ------    |       | --- touchdown: bad ------------> BAIL
      | carve, |       +--------+              |       | --- in a rail's capture -------> GRIND
      | brake, | --->  | MANUAL | -- pop -->   |       | --- slow at a coping, held ----> LIP
      | pump)  |  hold +--------+              +-------+
      +--------+         | needle fails              ^  ^
        |  ^             v                           |  | pop out / rail ends
 wall   |  |          +------+   0.9 s   +---------+ |  |
 at     |  +--------- | BAIL | --------> | RESPAWN | | +--------+
 speed  +-----------> +------+           +---------+ +-| GRIND  |  needle fails --> BAIL
                         ^                             +--------+
                         +--------- needle fails ---- +-----+  lift / flick down --> ROLL (fakie)
                                                       | LIP |
                                                       +-----+
```

| State | Enters | Inside | Leaves |
|---|---|---|---|
| ROLL | spawn, landing, lip drop-in, grind end onto ground | push, carve, brake, kickturn, pump; crouch shows the load | pop → AIR; roll-off → AIR; light hold → MANUAL; wall hit > 3 m/s along its normal → BAIL |
| AIR | pop, roll-off, transition launch | ballistic (12.5 m/s²); flips, spins, grabs; vert assist; landing yaw assist (§4.5) | touchdown → landing check; rail capture → GRIND; coping at ≤ 2.6 m/s vertical with the pad held → LIP |
| GRIND | capture (§4.6) | position on the rail's polyline; speed along it with friction and the rail's slope; balance needle (horizontal) | pop (flip-out tricks) → AIR; the rail's end → AIR (rolling off); needle ≥ 1 → BAIL toward its side |
| MANUAL | light hold while rolling ≥ 1 m/s, or held at touchdown (±0.15 s) | two wheels, 11° pitch; rolling friction only; needle (vertical) | release → ROLL; pop → AIR; needle ≥ 1 → BAIL (forward or back); speed < 0.6 m/s → ROLL |
| LIP | coping reached slowly with the pad held | pinned at the coping, the lip's pose; needle; points per second | lift → ROLL down the transition (fakie); flick down → a faster drop-in; needle ≥ 1 → BAIL into the ramp |
| BAIL | bad landing, needle failure, wall hit | the posed body tips over its feet the way the fall has room to go (`view/figure.js` `chooseFall`), arms out and knees up, sliding with the impact, and the board is thrown with its own spin (a ragdoll is the falls release's: §7.5); combo lost, special meter emptied | after 0.9 s (or a tap after 0.35 s) → RESPAWN |
| RESPAWN | — | at the bail point if it is flat, clear 0.6 m around and outside the bowls, else the nearest spawn node of the line it was on, facing along it, at rest | → ROLL (≤ 1.3 s after the bail began) |

Sub-states inside ROLL: PUSH, CROUCH, POWERSLIDE, LANDING (the 0.15 s after touchdown in which a manual or a revert is caught), REVERT
(0.3 s, 180° on the transition or bank, speed ×0.95).

### 4.5 Landing

At touchdown: tilt = the angle between the board's up and the surface normal; yaw = the angle between the board's long axis and the velocity
along the surface (forward or fakie, whichever is smaller); flip = the share of the flip rotation still to go. The catch assist completes a
flip that is far enough along before the touchdown (smoothly, over its last 0.12 s). THE LANDING YAW ASSIST turns the board's heading toward
the line it will land on, forward or fakie, the nearer:
- what the spin assist would straighten at the touchdown — within its window of a half turn (Cruise 45°, Classic 30°, Raw none) — is turned
  ON THE WAY DOWN, on the same critically damped turn timed by the landing (10-17, F1: set in the landing's step, 25° on Classic, the thigh
  turned 1,544°/s; turned in the air, 223);
- out of a ramp — a transition air, whose PATH the vert assist bends back into the ramp — it turns the board WITH its path over the flight:
  from the top of the air down, about the board's up, by the vert assist's share (Cruise 85 %, Classic 60 %, Raw none) of the turn the
  landing asks for, on the up's own critically damped turn timed by the landing (body.js `headToLanding`). The rider's own spin is his:
  while he turns the board, it waits. (10-16: without it a slanted air kept pointing up the wall — back on the wall 2θ off its line, on the
  deck past a curved rim 90° − θ off — and once the coping it left stopped catching it unasked, 22 more of the slanted set bailed on Cruise
  and 20 on Classic. Its walls: tests/coping_capture.mjs — the slanted set lands on its line, no faster than the up turns; the chain reads its
  turn, frame to frame, for a step.) Landing on a slope or transition keeps the along-surface speed (why landing in the transition feels smooth);
landing flat from height keeps horizontal speed and absorbs the vertical (a drop > 2.4 m on flat is sketchy at best).

### 4.6 Grinds: snapping and choosing

- **Aimed before the catch:** a rail the fall will meet within 0.45 s, inside the capture radius, has the board's attitude turned toward its
  grind on the way down — the catch never turns the board in a step.
- **Candidates:** rails within 1.5 m of the trucks' midpoint (from the BVH's rail grid). **Capture:** horizontal distance to the rail ≤ the
  grind assist's radius (0.20 m at 0, 0.45 m at 50, 0.70 m at 100); **met from above** — the step begins with the trucks over the rail's top or
  within 1 cm of it (`CATCH_TOL`; F5: caught from 5 cm under, a pop peaking under Kiln Yard's barrier was lifted on, the hips 349 m/s²;
  `tests/catch_from_above.mjs`); **caught where the fall meets the top** — the fall stopped there, the move along the rail kept whole (caught
  anywhere 3 cm over the top and eased down, the Main Ledge's deck took 1.3 cm and gave it back on Classic); falling
  (or |v_y| < 1.2 m/s at the apex); speed along the rail ≥ 0.8 m/s. **Lock:** the board snaps onto the rail at the grind's offset (a 5-0's
  back truck, a noseslide's nose, …), its yaw to the grind's yaw, velocity to the rail's tangent (−6 %); direction = the tangent's sign along
  the velocity.
- **The coping an air left** (10-16; the owner: "angled airs in the bowl can still catch the edge as an unwanted grind"): it catches the
  trucks on the way back down only if the rider ASKS — a direction held on the pad as far as the grind's own choice reads one (0.35 of its
  reach), or a grab held into the lock (on the pad, a direction held in the air IS the grab; on the keys, G) — or the trucks come down ON it:
  the board's middle within `grind.onTop` (5 cm) of its line, along it within 20° (a 50-50's line), its deck within 35° of level. The aim
  above follows the same rule. Every other rail keeps the assist's radius, a transfer onto another coping included. (It had caught 36 of 58
  slanted lip airs on Cruise and Classic within 0.45–0.63 m of it, unasked.) Its wall: tests/coping_capture.mjs.
- **Which grind** — by the approach angle α between the board's long axis and the rail, the side the rail is on (frontside = chest toward it,
  backside = back to it), and an optional direction held on the pad at the lock:

| α at the lock | nothing held | held down (tail) | held up (nose) | held down + toward / away | held up + toward / away |
|---|---|---|---|---|---|
| < 20° (along it) | 50-50 | 5-0 | Nosegrind | Smith / Feeble | Crooked / Nosegrind |
| 20–55° | Crooked (nose first) / Feeble (tail first) | Feeble | Crooked | Smith / Feeble | Crooked / Crooked |
| > 55° (across it) | Boardslide (front truck over) / Lipslide (back truck over) | Tailslide (onto a ledge) | Noseslide (onto a ledge) | Bluntslide | Boardslide / Lipslide |

  Ledges, curbs and coping take every grind; round rails take all but the noseslide/tailslide/bluntslide (they need a face).

### 4.7 Manuals, lips, reverts, balance

- **Balance needle** θ ∈ [−1, 1]: θ'' = σ(t)·n(t) + c·(thumb offset) − k·θ, with k = 0.5 + 3·assist, σ = 0.5 + 0.06·(seconds on) + 0.15·(repeats
  in this combo), n a seeded noise; fail at |θ| ≥ 1. Grinds use the horizontal axis, manuals and lips the vertical (THPS's meters by axis).
- **Lips** (5): Axle Stall (held up), Nose Stall (held up-toe), Blunt Stall (held down), Rock to Fakie (held up-heel; the drop-in is
  automatic), Disaster (held down-heel). Points by the second.
- **Reverts** (FS / BS, by the swipe's side): link a transition landing to the next trick on the ground.

---

## 5. Tricks and scoring

### 5.1 The trick list (`TRICKS` in config; real trick names are free, §6 of the brief)

| Family | Tricks | Base value | Notes |
|---|---|---|---|
| Pops | Ollie · Nollie | 50 · 60 | nollie variants of every flip ×1.1 |
| Flips (13) | Kickflip · Heelflip · BS Pop Shove-it · FS Pop Shove-it · Varial Kickflip · Varial Heelflip · Hardflip · Inward Heelflip · 360 Flip · Laser Flip · Double Kickflip · Double Heelflip · 360 Shove-it (a shove at speed grade 5) | 100 · 100 · 100 · 100 · 300 · 300 · 400 · 350 · 500 · 550 · 450 · 450 · 250 | flip rotation 0.32 s a turn at grade 3 (0.26 at 5) |
| Grabs (8) | Nose Grab (up) · Tail Grab (down) · Indy (toe) · Melon (heel) · Mute (up-toe) · Method (up-heel) · Crail (down-toe) · Stalefish (down-heel) | 120 · 120 · 150 · 150 · 150 · 250 · 200 · 200 | + 100 every 0.5 s held, up to 2 s |
| Grinds & slides (11) | 50-50 · 5-0 · Nosegrind · Crooked · Smith · Feeble · Boardslide · Lipslide · Noseslide · Tailslide · Bluntslide | 100 · 150 · 150 · 200 · 200 · 200 · 150 · 200 · 150 · 150 · 300 | + 80–150 a second |
| Manuals (2) | Manual · Nose Manual | 50 · 60 | + 60 / 70 a second |
| Lips (5) | Axle Stall · Nose Stall · Blunt Stall · Rock to Fakie · Disaster | 150 · 200 · 250 · 200 · 250 | + 80–100 a second |
| Reverts (2) | FS Revert · BS Revert | 100 · 100 | links a combo |
| Spins | FS/BS 180, 360, 540 … on any trick | — | ×(1 + 0.5 per 180°) of the trick's own value |
| Specials (4) | Underflip · Nightmare Flip · Hospital Flip · Darkslide | 1,500 – 2,500 | only while the special meter is full: a stroke held still at its end for 150 ms makes its family's special |

### 5.2 The combo grammar (`SCORING`)

- trick value = base × spin factor × stance factor (switch ×1.2, nollie ×1.1, fakie ×1.0) × repeat factor × grade factor (0.8 + 0.05·(accuracy
  − 1) + 0.05·(speed − 1), so 0.8 … 1.2); timed tricks add their per-second part.
- repeat factor, by how many times this exact trick name (stance and spin included) is already in the combo: 1.00 · 0.75 · 0.50 · 0.25 ·
  0.10, and 0.10 after.
- each named gap adds its value (never degraded) and +1 to the multiplier.
- **multiplier = the number of tricks + the number of gaps; combo = (Σ trick values + Σ gap values) × multiplier.**
- the combo BANKS after 0.25 s rolling on all four wheels with no manual or revert caught; a sketchy landing banks it (wobble, speed loss);
  a bail scores 0 for the combo and empties the special meter.
- special meter: + banked value / 4,000, + 0.05 a gap; full = Golden (a gold trail; specials allowed) until a bail.
- **Worked example:** Kickflip at grades 4/4 (100 × 1.1 = 110) → 50-50 for 1.5 s (100 + 1.5 × 80 = 220) → Manual for 2 s (50 + 120 = 170) →
  the "Ledge to Pad" gap (400) → Kickflip again (repeat 0.75: 100 × 0.75 × 1.0 = 75): 4 tricks + 1 gap → ×5 → (110 + 220 + 170 + 400 + 75) × 5
  = **4,875**. `tests/combo.mjs` carries this case and 40 more.

### 5.3 Modes, goals, unlocks (M3)

- **Free skate** (the default): endless, combos and bests; the park's gap checklist (24) fills over visits — a persistent goal.
- **Run**: two minutes (THPS's two-minute career runs — a free mechanic), 12 goals: score 15k / 40k / 100k ("Warm", "Hot", "Golden"); find
  the 5 hidden wax bars; kickflip the Long Five; the Rail Ride; ledge-to-pad-to-manual; spine transfer
  with a grab; a ×10 combo; a 6-second manual; Basin Air; 8 different gaps in one run.
- **Unlocks by goals, no currency**: skaters 3 and 4 at 4 and 8 goals; 3 colourways a skater at the score tiers; 6 deck graphics at 4, 8, 12,
  16, 20 and 24 gaps found.
- Saves (one key through the kit, `onSaves` — never a reload): bests, goals, gaps found, unlocks, settings.

---

## 6. The park

### 6.0 Axes, plans and top-down shots (one convention for every park)

+x is NAMED east and +z NAMED north; the world is right-handed with y up, so seen from above with north up, +x lies on the LEFT. Plans
(`plan/*.svg`, the ASCII plans) are drawn east-right; every top-down shot of a park is FLIPPED horizontally to match its plan and says so on
the image ("flipped to the plan"). Nothing a player sees depends on the names; only a picture laid over its plan does (the supervisor, 10-16).

### 6.1 The plan

`plan/park_plan.png` (rendered from `plan/park_plan.svg`, looked at) is the readable version. ASCII, one character = one metre, north up:

```
   0         1         2         3         4         5         6 
43 """"""""""""""""""""###QQQ::::::::::::::::::::::::::::::::::::
42 """"""""""""""""""""###QQQ::::---------21:::::::::::::::::::::
41 """"""""""""""""""""###QQQ::::::::::::::::::::::::::::::::::::
40 """"""""""""""""""""###QQQ::::::::::::::::::::::::::::::24::::
39 """"""""""""""""""""###QQQ::::::::::::::::::::::::::::::::::::
38 """"""""""""""""""""#@#QQQ:::::::::::::::::::::::::::::===::::
37 """"""""""""""""""""###QQQ::::::::::::::::::::::::::::::::::::
36 """"""""""""""""""""###1QQ::::::::::::::::::::::::::::::::::::
35 """"""""""""""""""""###QQQ::::==============::::::::::::::::::
34 """"""""""""""""""""###QQQ:::::::::::20:::::::::::::::::::::::
33 """"""""""""""""""""###QQQ22::::::::::::::::::::::::::::::::::
32 """"""""""""""""""""###QQQ::::::::::::::::::::::HH:::-::::::::
31 .................................6......///////.4HSSS-2S......
30 ........................................///5///.HHSSS-SS......
29 .....................................................3........
28 #QQQ..........................................................
27 #QQQ..AAAAA.............................................QQQ###
26 #QQQ..AAAAA..................................7..........QQQ###
25 #QQQ..AAAAA.................................PPP.........QQQ###
24 #QQQ..AAAAA.........ppppppp8................PPP.........QQQ###
23 #QQQ..AAAAA.........ppppppp.============................QQQ###
22 #QQQ..AAAAA.........ppppppp.............................QQQ###
21 #QQQ..AAAAA............9................................QQQ###
20 #QQQ..AAAAA.............................................QQQ###
19 #QQQ....10........................................=.....QQQ###
18 ..11..............................17............===.....QQQ###
17 ..............................................===.......QQQ###
16 ..oooooooooooooo.................bb.........===.........QQQ#19
15 ..oooooooooooooo..........................===..23.......QQQ###
14 ..oo          oo.........................==.............QQQ###
13 ..oo          oo........................................QQQ###
12 ..oo          oo..........---------.....................QQQ###
11 ..oo          oo........................////////........QQQ###
10 .13o          oo........................////15//........QQQ###
 9 ..oo          oo........................//XXXX/16.......QQQ###
 8 ..oo          oo........................//XXXX---.......QQQ###
 7 ..oo          oo........................//XXXX//........QQQ###
 6 ..oo          oo........................////////........QQQ###
 5 ..oo          oo........................////////........QQQ###
 4 ..oooooooooooooo........................................QQQ###
 3 ..o14ooooooooooo..............................................
 2 ..........12............cccccccccccccccccccccccccccccc........
 1 .......................................18.....................
 0 ..............................................................
. plaza 0.00   : terrace +0.80   # raised deck (West Deck +2.63, East Deck +1.83, Lawn Deck +1.22)   " lawn   @ spawn
Q quarter pipe   A spine   o the Basin's wall (its floor is the blank square, -1.83)   S stairs   H stair ledge   / bank
X the Block's top +0.60   = ledge   p manual pad   P planter   b bench   c curb   - rail or bar   1..24 named gaps
```

**Concept:** a terraced civic plaza-park at the edge of a city, golden hour. The street plaza steps down from an upper terrace (stairs, a
handrail, a stair ledge, a bank); the transition corner (a bowl, a spine and a quarter) is sunk into the west end; a long quarter pipe walls
the east side. It is a flow LOOP: down the terrace → down the stairs or bank → west through the ledges → the transitions → back east along
the curb → up the Sun Bank. It is my own composition, built from real dimensions; no known park or level is recreated (§6 of the brief).

### 6.2 Every element at real dimensions

| Element | Where (x, z in m) | Dimensions | Source of the dimensions |
|---|---|---|---|
| The Plaza | 0–62 × 0–32 | broom-finished slab, control joints every 3 m | own |
| The Terrace | 23–62 × 32–44 | +0.80 m, granite pavers 0.6 m; its south wall a 0.80 m drop | = 5 stair risers |
| West Deck (start) | 20–23 × 32–44 | +2.63 m (1.83 above the terrace) | own |
| Deck Quarter | coping x 23, z 32–44, facing east | 1.83 m (6 ft), radius 2.74 m (9 ft), run 2.58 m, lip 70.6°, 60 mm steel coping (drawn 68 mm today, not yet solid: the grind release) | park specs: 7–10.5 ft transitions for 5–12 ft walls (Ocean City MD); coping 2⅜ in OD pipe (builders' forums) |
| East Wall | coping x 59, z 4–28, facing west; East Deck +1.83 to x 62 | as the Deck Quarter, 24 m long | as above |
| Lawn Quarter | coping x 1.5, z 19–29, facing east; Lawn Deck +1.22 | 1.22 m (4 ft), radius 2.13 m (7 ft), run 1.93 m, lip 64.7° | mini-ramp builds: 2–3 ft walls on 6–7 ft radii |
| The Spine | coping x 8.6, z 20–28 | two 1.22 m / 2.13 m faces back to back; 3.2 m of flat to the Lawn Quarter | as above |
| The Basin | coping 2–16 × 3–17, plan corners r 3.5 m | depth 1.83 m (6 ft), radius 2.44 m (8 ft), run 2.36 m, lip 75.5°; pool coping on the south wall | pool specs: 8 ft radius, 5–8.5 ft deep (Ocean City MD) |
| Main Ledge | 28–40 × 23.0–23.6 | 12 × 0.6 m, 0.36 m high, waxed granite, steel angle both top edges | park ledges 13½–14¼ in high, ≥ 20 in deep (D. Caddo, "Dimensions") |
| Sun Ledge | 30–44 × 35.4–36.0 (terrace) | 14 × 0.6 m, 0.42 m | as above (a sitting-height variant) |
| Slant Ledge | (41, 14.2) → (51, 19.2) | 11.2 × 0.5 m, 0.40 m, set 27° across the plaza | as above |
| Terrace Block | 55–58 × 38–39.2 (terrace) | 3.0 × 1.2 m, 0.45 m | own |
| The Pad | 20.5–26.5 × 22.4–24.4 | 6 × 2 m, 0.20 m, square steel-edged | project manual pads 125–350 mm |
| The Five | 50–56, from z 32 down to 30.72 | 5 risers × 0.16 m, 4 treads × 0.32 m, 6 m wide | IBC: risers 4–7 in, treads ≥ 11 in |
| Five Rail | x 53, z 32.8 → 29.8 | 48 mm OD; 0.86 m above the nosing line; flat–26.6°–flat (kinked) | IBC handrail ≥ 34 in; 1½ in schedule 40 pipe = 48.3 mm OD |
| The Shelf (stair ledge) | 48.6–49.8 × 30.4–33.0 | 1.2 m wide; top 0.45 m above the terrace, then down the stairs' slope | own |
| Sun Bank | 40–47 × 30.28–32.0 | 25°, 0.80 m rise over 1.72 m | own (park banks: 0.9 m and "mellow" 5 ft walls) |
| Planter | 44–46.4 × 24.4–26.0 | 2.4 × 1.6 m, 0.45 m rim | own |
| Bench | 33–35 × 16.6–17.05 | 2.0 × 0.45 m, seat 0.45 m, steel edge strips | ordinary seat height |
| Low Bar | z 12, x 26–34 | 8 m, 48 mm OD, 0.33 m | project flat rails +400 mm |
| Terrace Bar | z 42, x 30–38 (terrace) | 8 m, 0.33 m above the terrace | as above |
| The Block | base 40.71–47.29 × 5.71–11.29 | top 4 × 3 m at 0.60 m, 25° banks all round, angle on the top edges | own |
| Box Rail | z 8.5, x 46.0 → 48.4 | down the east bank then flat, 0.35 m above the bank | own |
| Red Curb | 24–54 × 2.6–3.0 | 30 m, 0.15 m, red paint | street curbs 5–7 in |
| Run-ups | — | ≥ 10 m before every street element | real parks want 60–75 ft (Caddo); this game's push is quicker (§4.2), so 10 m reaches 5 m/s |

`spikes/park_plan.mjs` checks the plan: every element inside the park, no two on one spot (green on the last run).

### 6.3 Lines

| Line | Route (the plan draws each) |
|---|---|
| L1 Golden Line | drop in from the West Deck → 50-50 the Terrace Bar → kickflip the Five (or the Rail) → Planter Hop → grind the Main Ledge west → manual the Pad → transfer the Spine → air the Lawn Quarter |
| L2 Basin Lap | drop into the Basin from its north-east rim → deep-wall air → carve the south-west corner → grind the west coping → loop |
| L3 South Loop | curb slappies east → Block Hop (or the Box Rail) → East Wall airs → up the Sun Bank → west along the Terrace → Deck Quarter air |
| L4 Shelf Line | smith down the Shelf → Planter Hop across → Bench Gap → 50-50 the Low Bar |
| L5 East Wall | frontside and backside airs, lips and reverts along 24 m of wall |
| L6 Corridor | back and forth between the Lawn Quarter and the Spine: transfers, lips, reverts |

### 6.4 The 24 named gaps, against the physics (`plan/gaps.txt`)

Speed needed along the path (m/s) at flick speed grade 1 / 3 / 5 (5 = Cruise); push reaches 7.5, a line or pumping 8.5; the drop-in gives 5.99
before friction.

| # | Gap | Value | Test | Needs |
|---|---|---|---|---|
| 1 | Deck Drop | 800 | off the West Deck's coping to the Terrace, nothing touched | 3.74 / 3.25 / 2.93 |
| 2 | Long Five | 500 | take off on the Terrace, land past the last step | 2.63 / 2.18 / 1.90 (no pop: 4.70) |
| 3 | Rail Ride | 750 | the Five Rail, top section to bottom section | grind |
| 4 | Shelf Down | 600 | the Shelf, terrace to end | grind |
| 5 | Sun Bank Drop | 400 | off the Terrace edge past the foot of the Sun Bank | 3.32 / 2.74 / 2.40 |
| 6 | Terrace Drop | 250 | off the terrace wall, 2.5 m out or more | 3.91 / 3.24 / 2.83 |
| 7 | Planter Hop | 350 | over the Planter lengthwise (2.4 m) | never / 8.49 / 4.74 — a skill gap: full pop only |
| 8 | Ledge to Pad | 400 | grind the Main Ledge, land on the Pad | 3.67 / 2.79 / 2.34 |
| 9 | Pad Manual | 300 | manual the Pad end to end | sim |
| 10 | Spine Transfer | 500 | up one face, land on the other | 5.34 at the foot |
| 11 | Lawn Wall Air | 300 | ≥ 0.6 m over the Lawn Quarter's coping | 6.50 at the foot |
| 12 | Basin Air | 450 | ≥ 0.75 m over the Basin's coping | 7.48 at the foot (pump) |
| 13 | Coping Run | 400 | ≥ 4 m of the Basin's coping | grind |
| 14 | Corner Carve | 350 | through a Basin corner above 1.2 m of wall | sim |
| 15 | Block Hop | 450 | from the up-bank over the 4 m top | 5.80 / 5.25 / 4.92 |
| 16 | Box Rail | 400 | end to end | grind |
| 17 | Bench Gap | 250 | over the Bench crosswise | never / 1.59 / 0.89 |
| 18 | Curb Run | 200 | ≥ 8 m of the Red Curb | grind |
| 19 | East Wall Air | 350 | ≥ 0.6 m over the East Wall's coping | 7.26 at the foot |
| 20 | Sun Ledge Run | 300 | end to end (14 m) | grind |
| 21 | Terrace Bar | 300 | end to end (8 m) | grind |
| 22 | Deck Wall Air | 350 | ≥ 0.6 m over the Deck Quarter's coping, from the Terrace | 7.26 at the foot |
| 23 | Slant Run | 350 | the Slant Ledge end to end | grind |
| 24 | Block Manual | 250 | across the Terrace Block | sim |

Two wall airs first needed 7.55 m/s at 0.75 m (just over push); they were set to 0.6 m. Transition airs above are UNPOPPED; a pop at the lip
makes them easier.

### 6.5 The park is data — the mod story

`PARK` in `js/config.js` is the list above as plain data (`{ type: 'ledge', name, rect, h, top, edges }`, `{ type: 'quarter', coping, face,
h, r }`, `{ type: 'stairs', … }`, `{ type: 'rail', pts }`, `GAPS: [{ name, value, test }]`); generators turn each row into what is drawn, the
collision mesh, the rails and the gap triggers. Add a ledge = add a line. A row that leaves the park or lies on another (each footprint as its
polygon on the ground, overlapping by more than a centimetre) is NAMED in the console and fails `tests/park.mjs` — and still built, never
refused: a mod may mean it (10-16: until then only the park's edge was checked, and the wall only printed it; the guide's first ledge, set in
the Basin, said nothing — the plants `park_two_on_one_spot` and `park_row_leaves`). The mod story itself: MODDING.md.

---

## 7. Art direction — no slop

### 7.1 Light

Golden hour, fixed: sun 12° above the horizon from the south-west (azimuth 235°), warm (#ffc58a), long raking shadows across the plaza so
concrete and granite show their texture; sky from zenith #4f74b3 to horizon #f3b77c; fill from the sky (cool, #5a6f94 in the shadows) and a
warm bounce from the ground; distance haze #e9c39a from 60 m. Tone mapping AgX (three.js), exposure set on the concrete at mid-grey ≈ 0.18.
**Static light is BAKED at boot**: the sun's shadow and the sky's occlusion for every park surface go into one lightmap (phone 1024², desktop
2048²) — one shadow render of the static park and one pass per surface chunk into its lightmap UVs; the temporary shadow map is freed.
Per frame only the skaters and boards cast (one 1024² map on a 7 m frustum around the skater; 2048² on desktop), plus a soft contact
shadow under a skater in the air (height reads at a glance — gameplay, not decoration).

### 7.2 Palette

| | Hex | Use |
|---|---|---|
| slab concrete | #b9b2a7 · stains #8f877c · cracks #5b544c · skid marks #2c2a29 | the plaza |
| granite | #8e9599 · feldspar #c9c3bb · dark grain #2f3336 | ledges, pavers |
| coping paint | #e2a62a worn to steel #6f7378, ground to #b8bcc0 | coping, the Shelf's edge |
| curb | #b4473a | the Red Curb |
| grass / trees | #6f8a43 · dry #a6a35b · leaves #5e7d3a, back-lit #b7c35a · bark #8b8577 | the lawn, the edges |
| UI | ink #15130f · paper #f4efe6 · amber #e8a33d · concrete #9d958a | HUD, menus, the loading screen |

### 7.3 Materials — painted on the graphics card at boot

Every surface is a small GLSL function `surface(uv) → albedo, height, roughness, ao` baked into maps by one draw each (Ochrefall's MIT baker
taught the idea; mine is written fresh): broom-finished slab (directional grooves, trowel swirls, stains, crack networks, control-joint cuts),
granite (speckle grains, polished waxed strip along the top edges, chipped corners), steel angle (galvanised; polished where ground; rust where
not), painted coping (paint chipped to steel, ground bright on top), pool coping blocks and a band of pool tile, granite pavers, asphalt (the
street beyond), grass, bark, leaves. Normals come from the same function's height (so the bumps match the colour). Phone maps 512², desktop
1024² for the four hero surfaces. Decals — skid streaks, wax smears, scuffs on the coping — placed by rule where skaters really wear a park:
along every grindable edge and in every landing zone, from a 1024² decal atlas.

**If a surface cannot reach the bar in code** — I expect concrete and granite can, grass at close range may not — I will propose a SPECIFIC
CC0 texture (Poly Haven / ambientCG) at the M2 review with its licence line and download date. No Kenney, KayKit or Quaternius meshes,
nothing without a licence I have read.

### 7.4 The skaters

- **Built by sculpting in code:** each skater is a signed-distance sculpt — smooth unions of capsules and ellipsoids for the body, offset
  shells for clothing with folds carved where cloth gathers (elbows, knees, hips, the hood), separate SDF heads at finer resolution (brow,
  nose, cheekbones, lips, ears), hair as clumped volumes — meshed by surface nets at 1.5 cm (head 0.7 cm), decimated to 9–14k triangles,
  skinned to a 24-bone rig by distance-to-bone weights. Shading: triplanar fabric weaves (denim twill, jersey knit, fleece), skin with a
  subsurface-ish wrap term, anisotropic hair highlights, baked AO in the creases. Meshing runs behind the loading screen (a worker started
  from a blob, as Tinlight's texture workers are).
- **Proportions:** 7.3–7.6 heads tall, real hands at phone distance (thumb + finger groups), visible ankles and shoes with gum soles.
- **The cast (4, original — no real person, no brand on a deck, shirt or shoe):**
  - **Juno** — 19, regular, tall and lean; cropped rust work jacket over a cream tee, loose olive cargos, mustard knit beanie, curly dark hair.
  - **Marlo** — 24, goofy, stocky; faded charcoal hoodie, black jeans rolled once, short beard, close-cropped hair.
  - **Tavi** — 17, regular, small and quick; oversized navy-and-white striped long-sleeve, wide light denim, bucket hat, chin-length black hair.
  - **Rook** — 31, goofy, tall and broad; an original red-and-black check overshirt over a white tee, tan work pants, cap worn backwards,
    ginger hair and freckles.
  Three colourways each. Not a soldier, not a faceted low-poly runner, not a box-built figure: they must not look like Tinlight's soldiers,
  Ochrefall's soldier or Stormspan's runners (law 5) — smooth sculpted forms and fabric are the difference, and the M2 review zooms them.
- **V14 IS ABANDONED (10-16) at the owner's word: he judged the Blender model worse than the original — "Revert to the original model. The
  hands are placed outward too but gameplay is better."** Juno is the original code sculpt again. The CC0-base work below stays in the tree as history
  only — nothing derived from the base ships — and its GENERAL gains are kept (`js/view/correctives.js`, the deformation walls, the sphere
  measure, the vendored GLTFLoader) with nothing in the game loading them while no mesh uses them. What follows of V14 is the record.
- **The new Juno (V14, 10-16 — abandoned, above):** the CC0 base fitted to the game's own skeleton and dressed by script (`sources/juno/`; plan/V14_JUNO.md;
  MODDING.md §5). His face is held by readings of the file as the game loads it (`face_check.mjs`): the lids open at least 25° straight ahead
  (64.0° and 64.5°), the two eyes alike, the pupil readable at every look the game gives once the upper lid follows the look. **The old
  sculpt's "almond" rule is not his** (the supervisor accepted it dropped, 10-16): "more open toward the nose than toward the ear" was the
  code sculpt's own lid design, never a fact about eyes. On a real eye the opening reaches farther round the ball toward the ear than toward
  the nose — more white shows on the ear's side — and the base's sculpt reads so: 20° toward the nose the lids open 51°, toward the ear 69.5°.
- **The board:** a popsicle deck with real concave (12 mm) and kicks (18°), seven plies visible on the edge, grip tape with sparkle and worn
  patches under the feet, trucks (baseplate, hanger, kingpin, bushings, axle), 53 mm wheels with a urethane look; six original bottom graphics
  drawn in code (Waxline's own marks), none a real brand's.

### 7.5 Animation

- The board is procedural: its flips and shove-its are rotations timed to the trick, its tilt is the controller's.
- Two-bone IK pins each foot to its spot on the deck (front foot over the front bolts, back foot on the tail), knees toward the nose and out;
  the hips sit between the feet at the crouch's height; the spine leans into carves; the arms balance (procedural swing) and reach for
  grabs (IK to the grab point).
- Keyed poses for everything the IK cannot invent — push, pop, catch, every grab, every grind and slide stance, every lip, manual, landing
  absorb, revert, get-up — as numbers in config (`POSES`, like Dusk Duel's "every pose is one line"), blended with spring-damped weights.
- Bails (as built): the posed body tips over its feet the way the fall has room to go (`chooseFall`), arms out and knees up, sliding with the
  impact; the board is thrown with its own spin; after 0.9 s, the respawn. The planned ragdoll (the study's: the body handing it the
  velocities of its last two frames, the muscles at partial strength, the human fall's timeline) is the falls release's.
- **The body on its legs (10-16):** the hips ride a spring (critically damped, 4 Hz) to where the pose puts them, in the world — a pop, a
  landing or a catch lands its change of speed on the gap and the knees give with it (the pose's own landing dip is retired); the gap stays
  within the legs' reach in the board's frame (sink 15, rise 3, sway 8 cm) and the feet stay pinned. The body's attitude follows the
  board's on its own spring (1.2 Hz, no lag in a steady turn), the acceleration of its turn capped at 43 rad/s²; the crouch rides a 3 Hz
  spring. Bounds (`tests/lib/legs.mjs`): the hips' world acceleration ≤ 60 m/s² on the ground, ≤ 150 in the 0.2 s after a pop, a landing
  or a catch; the air reported, for its own class (the body leading the board there). Every follower is ONE module (`js/formulas/follow.js`,
  stepped exactly — the same path at any frame rate): the legs f 4 Hz, ζ 1, r 2 · the body's attitude f 1.2, ζ 1, r 2, cap 43 rad/s² · the
  crouch f 3, ζ 1, r 0 · the head's look f 1.19, ζ 1, r 0 · the camera first-order (`ease`). Round a coping the body takes the rider's arc
  (the hips ride it); the rider enters it at full rate, so the body's turn steps there (302 rad/s² at 7 m/s) — reported, open.
- **The lean is a hip hinge (10-16):** leaning before a drop, the trunk takes the whole turn and the hips a third of it (a shadow of the
  trunk's own capped spring on the lean alone); carried rigidly about the board's middle, a 29° lean had carried the hips 45 cm ahead and the
  back leg straight — now 0.972 of straight at worst (≤ 0.98).
- **At the legs' limit the board carries the body (10-17):** the body's gap from the board held at its limit (`LEGS.tilt`, 0.6 rad) keeps
  only its rate back in. With only its outward rate taken, the body slid round the board at the limit: off the Deck Quarter's slant on Cruise
  the board swung 58° to the floor and 15° onto its line in 0.15 s, the gap held there turned 171° in 0.2 s, and her trunk ended 42° back
  from the board, her head against the ramp — the camera found no place that saw her. Read on every air of every assist and every run of the
  sweep (`tests/lib/gap.mjs`): held at the limit, the gap's direction turns ≤ 1° (0.0°); the frames held there are said (Raw's landing seats,
  one frame each).
- **The hands hang at the thighs' sides (10-17, R6.1):** measured against the drawn cargos (each hand taken back through its thigh's skinning
  onto the pants' own surface), not the shoulders' line — the cargos are baggy, and hands brought to that line went 3.7–5.2 cm into them.
  Standing and rolling the hands already hang there: the left 1.3–2.2 cm off the cloth, the right 4.4–4.9 (within a hand's thickness); the
  balance arms come out on a grind and in a manual (the leading arm 38–43 cm). The right hand brought 3 cm nearer was tried and refused: it
  turned the forearm 1,523–1,533°/s in a pop out of a stroke's reach (≤ 1,500; 1,454 as it is) — the pop's and the push's arms are the body
  release's (`tests/hands.mjs`).
- **The new Juno's skin (V14, 10-16 — abandoned): blended matrices, and correctives where they lose flesh.** His weights are the base body's own, taken
  by Blender's automatic weights in a spread pose (arms out 80°, legs 20° — in the game's rest the arms hang by the torso and its heat bled
  0.31 of an arm onto the torso's sides), each garment vertex given the weights of the body vertex it was grown from, and no limb's weight
  left where the limb is not beside its vertex. A joint bent deep loses flesh under blended matrices (the knees kept 66 % in a 5-0), so the
  pipeline keys a corrective morph per knee and elbow at a few bends past rest — the difference between blended matrices and DUAL
  QUATERNIONS, carried back through each vertex's blended matrix — and the page sets them by the joint's bend (`js/view/correctives.js`,
  the keys read off the morph names; the walls set them by the same rule): the knees then keep 90.7 % at worst, the elbows 97.9–105.3 %.
  **No dual-quaternion skinning on the page:** measured on the same body (`sources/juno/deform_check.mjs --skin dqs`), it held the knees
  worse (86.7 %) and SWELLED the right shoulder in the 5-0 to 138 % of its flesh (blended matrices 118 %) — the bulge dual quaternions are
  known for; a cut over 110 % is as wrong as one under 90. **A delta mush is no corrective target:** it is a smoothing, and smoothing a folded
  knee shrank it (its morphs pushed 116 of 142 vertices near the knee inward; the knees fell to 51–56 %) — deleted.
- **Where a bug starts (10-16):** the tests record the pipeline frame by frame — sim → board → pose → trunk → target → legs → ik → bones →
  mesh — each stage read for its own breaks (`tests/lib/chain.mjs`); under every RED gate the wall prints the first stage that broke. Each
  sweep holds the chain quiet on the build, and each motion plant names the stage its edit is in (17 of 33 blamed there; 16 outside its
  reach, each saying why); its own readings carry the walls' classes (on the ground, through an impulse) and are calibrations, said so.
- **What the landing release REPORTS, for the releases after it (10-17):** the coping not yet solid to the board (its tube 2 cm over the
  lip: the grind release); F2 and F3, ridden as REPORTED runs on every preset (`surfaces.mjs` `reported`): after the catch at the top, the
  Low Bar rides 0.00 cm off its lock (it was 2.5 cm over), the Box Rail 0.00 over with one 0.96 cm dip under on Classic at 3.5 m/s; the BIG
  landings — over √(2 · 0.10 m · 150 m/s²) = 5.5 m/s of impact, what the legs' 10 cm squat can stop inside the impulse class (the body
  release's deeper, softer squat); Raw's lip airs, down where physics puts them; the camera on Classic and Raw.

### 7.6 Camera

- **Filmer** (default): 2.6 m behind and 0.55 m above the board, looking slightly up past the skater; spring-damped (0.12 s); vertical bounce
  smoothed in the air; leans a little to the side on grinds (a filmer's over-the-shoulder). Field of view 70° turned, wider vertical upright,
  where it also rises and pulls back so the skater sits in the lower third with the line ahead visible.
- **High:** 3.6 m back, 2.2 m up, 65°.
- A 0.25 m sphere cast from the skater's chest to the camera pulls it in before any wall (never closer than 0.8 m), and it never goes below
  the surface under it.

### 7.7 HUD, menus, loading screen

- HUD: the combo's trick names stacked with "× n" and the running total near the top centre; a thin special meter; a balance needle beside
  the skater while it matters; gap names pop on their own line. Type: the device's own heavy condensed sans for numbers and names (no font
  files). Everything ≥ 12 px, `pointer-events: none` over the band.
- Title: the real park in its light, the camera dollying slowly along the terrace; Play · Skater · Goals · Settings · sound · (i).
- **The loading screen of its own** (law 1): cream concrete, the WAXLINE wordmark, a deck seen from the side rolling along a ledge line — its
  position IS the progress (`--mosa-progress`), wheels spinning in CSS, a wax smear drawn behind it; phases named from real work (§10.3);
  reduced motion holds it still. No other game's layout.
- **Mobile, full screen and turned (R5, 10-17; the owner: "I need to be able to do mobile well too. Full screen landscape."):** one control
  (`js/view/fullscreen.js`, beside the pause button, on the title, in play and paused) asks for the whole screen with the browser's bars
  hidden — `requestFullscreen({ navigationUI: 'hide' })` — and only then for the landscape lock (`screen.orientation.lock`; a phone grants it
  only to a full-screen page); every refusal is said in `__wl.fullscreen.said`, none thrown. It is drawn only where it can do something: never
  in a frame (the platform's note page is immersive by itself), never without the Fullscreen API for a page (an iPhone's Safari), never
  while already full screen. Turning the phone keeps the run (only a really hidden page pauses); every HUD text and button sits inside the
  safe area at 844×390 and at 932×430 with a notch's insets (a backdrop may run on into the inset). Walls: `tests/fullscreen.mjs`, and in the
  round `tests/drive/fullscreen*.mjs`, `turn.mjs`, `landscape.mjs`, `phone_budget.mjs`.

---

## 8. Audio — synthesized, no files

- WebAudio graph built at the first touch-end (iOS's rule); a fixed pool of 24 voices; a master, an SFX and a music bus; mute and volume
  (kept in the save).
- **The surface table (`SOUND.surfaces`) — 6 surfaces × 4 layers:**

| Surface | Roll (noise → filters, ∝ speed) | Pop (tail strike) | Land | Grind / slide |
|---|---|---|---|---|
| slab concrete | brown noise, band 600 Hz Q 0.8, hiss 4 kHz; clacks at the 3 m joints (front then back wheels, wheelbase/speed apart) | 3 ms click + deck "tock" 420 Hz, fast decay | thump 90 Hz + deck slap 380 Hz + truck rattle 3 kHz, ∝ impact | (on its edges: see angle iron) |
| granite pavers | brighter band 900 Hz; clack every 0.6 m paver joint | tock + a harder click | as slab, brighter | waxed granite: smooth hiss band 1.4 kHz, little chatter |
| asphalt | rough grain: noise through a 300 Hz band with 25 Hz amplitude jitter | softer tock | duller thump | — |
| steel (rails, angle iron, coping) | — | — | metallic ring on landing over steel | inharmonic modes 1.1 / 2.7 / 4.9 kHz under noise, pitch ∝ speed; slide: broadband scrape + 30 Hz chatter |
| concrete transition | smooth roll, rising band with the wall's height (the "whoosh" of a bowl) | tock | landing in the transition: long soft roll-in | pool coping: gritty scrape, lower |
| painted curb | — | — | — | paint: grittier, with a squeak at the end |

- Also: push (shoe scuff), flick (grip-tape scuff + air whoosh), grab (cloth rustle), revert (wheel squeal), bail (body thuds + board clatter,
  each a modal impact), ambience (distant city bed, sparse birds, wind in the trees), the special meter filling (a rising warm chord).
- Music (optional, its own toggle): an original sequenced loop (kick, snare, hats, a bass and FM keys) — only if it passes the owner's ear;
  otherwise the park sounds alone.
- Evidence: one OfflineAudioContext render per surface as WAV (`runs/sound/*.wav`) for ears; the layer inventory as a table in the log.

---

## 9. Multiplayer — friends in the same park

- `join_mode: "shared"` — my own code sends play to the room (`MosaPort.send`).
- **Frames:** each device simulates its own skater and sends ONE combined frame 10 times a second, kind `wl.me` (the bridge allows one frame
  per type and kind every 50 ms; the kit's own `mp.status` rides its own kind at 2 Hz):
  `{ kind: 'wl.me', key: 'wl.me', t, p: [x,y,z] (cm), q: (packed quaternion), v: [vx,vy,vz], st: state, tk: trick, tp: trick phase, gb: grab,
  ln: lean, cr: crouch, bl: needle, sk: skater + colourway, cm: [multiplier, combo total], ev: [events since the last frame: landed {name,
  score}, bail, gap {name}] }` — about 200 bytes, 2 KB/s a friend.
- **Drawing friends:** a 120 ms interpolation buffer (Hermite on position with velocity, slerp on rotation); up to 250 ms of extrapolation
  (ballistic in the air); the same procedural animation driven by the frame's state, so a friend's kickflip looks like a kickflip; names over
  heads (DOM, ≥ 12 px); landed tricks and gaps float over them. No skater-skater collisions (skaters rarely collide; the notes' finding).
- **Soft cap:** the room may hold more; the nearest 9 friends are drawn, the rest listed.
- **S.K.A.T.E.** (the real-world game, like HORSE): someone opens a game from the room card; whoever accepts within 10 s plays, in join order.
  The setter has 30 s to land any trick clean; each follower then gets one attempt at the same trick name (stance and spin count); a miss
  takes a letter; the setter loses the set on a miss; S-K-A-T-E is out; the last one in wins. Each device judges its own attempt and says so
  (`wl.game` events); the earliest-joined player keeps the turn order and hands it on if they leave. Late joiners get the game state from
  the kit's `snapshot`.
- **Scores:** the kit's score room (`score: combo total` while skating) — friends' live scores and the room's best; scores claimed by
  friends are checked for plausibility (points per second, airtime) before they are shown.
- **Proof (M4):** the certification's two-player pass (each sees the other, both send); a local two-frame harness (two frames of the build,
  each with a stubbed `MosaAppBridge.createAppBridge`, the parent relaying with injected latency 0–300 ms and jitter) measuring a friend's
  drawn position against the truth; the live share-link pass is not driven by the house brief's rule and will be said as not driven.

---

## 10. Performance and weight

### 10.1 What a phone is asked to hold (phone tier; `TIERS`, read from `window.__MOSA_DEVICE`, so the certification's phone passes get it)

| Item | Size | MB |
|---|---|---|
| drawing buffer: 390×844 at pixel ratio 1.75 → 683×1477 (1.01 Mpx), colour + depth/stencil, no MSAA | | 8.1 |
| lightmap (baked sun + sky occlusion), 1024² RGBA8 + mips | | 5.6 |
| park materials: 8 × (albedo + normal + roughness/AO) at 512² RGBA8 + mips | 24 maps | 33.6 |
| decal atlas (skids, wax, scuffs, cracks) 1024² + mips | | 5.6 |
| skaters: up to 4 cast sheets × 3 maps at 512² + mips (friends share the cast's sheets, tinted) | 12 maps | 16.8 |
| boards: deck graphics atlas 1024×256 + grip 256² | | 1.4 |
| environment reflection from the code-built sky (PMREM, small) | | ≈ 3 |
| dynamic shadow map (skaters only) 1024², depth | | 8 |
| park geometry ≈ 150k vertices (position, normal, uv, lightmap uv) + indices | | 8 |
| skater geometry: up to 10 × 12k vertices with skinning | | 8 |
| particles, foliage instances, sky, contact shadow | | ≈ 3 |
| **Total budgeted** | | **≈ 101** |

Target ≤ 140 at peak, hard limit 192. Nothing is re-created when the phone turns: resizing changes the drawing buffer only (the lesson of
Sketchbook's 110 → 219 MB). No transmission materials (Tinlight's 50 MB lesson). Indexed geometry only (its 87 MB lesson). Each texture's
page-side copy is released once the GPU has it. An in-game **ledger** adds up every allocation by name so "what the phone tier asks" is a
number the game itself reports, and `weigh.mjs` (upright, turned, turned back) checks it from outside. Measured (10-17,
`tests/drive/phone_budget.mjs`, the kit's tally at 390×844 and 3x, turned and back twice): **at most 70.6 MB held**, the largest surface
682×1477, flat through the turns (70.5 → 70.6); its plants — a frame made at every resize and never let go, a 4352 px sheet — go RED.

Desktop tier: 1024² hero maps, 2048² lightmap and shadow map, MSAA 4×, pixel ratio ≤ 2 — about 180 MB (desktop is not held to the phone
ceiling, but is kept sane).

### 10.2 The frame (phone, 16.7 ms)

Sim (2 steps, 4 probes, rails, needle) ≈ 0.3 ms · input + animation + IK ≈ 0.5 ms · nine friends ≈ 0.9 ms · draw submission ≈ 2–3 ms ·
≤ 120 draw calls (the static park merged by material ≈ 12; instanced foliage; skaters 3 each) · ≤ 400k triangles in view · GPU ≈ 8–10 ms on
an iPhone 13-class (to be measured). A **governor** (Tinlight's and Ochrefall's idea, my code): reads frame times in 900 ms windows after the
first 3 s; slower than 50 fps twice running → one step down a fixed ladder (pixel ratio 1.75 → 1.5 → 1.25 → 1.0; the skater shadow every
other frame; foliage to half; contact shadows off); never climbs back; a 30 Hz screen asks for no more than 30.

### 10.3 Boot (real work, each a named phase)

"Pouring the park" (park generation, collision BVH) · "Painting the concrete" (one registered work per material bake) · "Lighting the park"
(the lightmap bake) · "Waxing the ledges" (decals) · "Building the skater" (the SDF sculpt, in a worker) · "Warming up" (`renderer.compileAsync`
of every material behind the loading screen — no first-use hitch in play) · then ready on the first painted frame of the title.
Target ≤ 3 s here, ≤ 6 s on a phone.

---

## 11. Files

As they are (measured 10-16; an older list here named modules planned at M0 that were never written — MODDING.md §1 carries the tree too):

```
waxline/  (~/Documents/ports_src/_work/waxline/)
  DESIGN.md · CLEANROOM.md · MODDING.md · port.json · plan/ · spikes/ · runs/ · host/
  build/
    index.html · port.js · mosa-port.js (the kit, unedited) · CREDITS.md · LICENSE (MIT) · licenses/three-LICENSE.txt · css/waxline.css
    js/config.js      THE mod file: PARK, GAPS, LEGS, PHYSICS, INPUT, ASSISTS, TRICKS, TREES, RUN, SCORING, CAMERA, LOOK, SKATERS, BOARD, SOUND
    js/main.js        boot, the fixed-step loop (js/formulas/step.js), the game's modes
    js/formulas/      step · follow · contact · jump · stroke — the standard formulas, one module each, every caller on them
    js/sim/           park (data → collision, grind lines, lips, the park's own checks) · world · bvh · body (the state machine) · score · vec
    js/input/         touch · zones (who owns a touch) · reader (§3)
    js/view/          parkview · surfaces · trees · stage · skater (rig, IK, pose) · figure (the drawn state) · sculpt · cloth · board ·
                      camera · sightline · fall · hud · style
    js/audio/         audio (every sound synthesized)
    js/game/          run (the run and its GOALS)
  sources/juno/       the Blender Juno's pipeline (V14): skeleton_out.mjs · blender.sh · fit_base.py · dress.py · export_juno.py · the walls
  tests/              the Node walls (*.mjs) · drive/ (the browser drives) · lib/ · plants.mjs · run_all.sh · round.sh · clips.sh
```

The sim imports nothing from `view/`; the view reads the sim's state. That split is what lets the Node tests, the bot and the multiplayer
all drive the same code.

---

## 12. Risks (most dangerous first)

| # | Risk | What it would cost | Mitigation |
|---|---|---|---|
| 1 | Code-sculpted skaters read as slop (faces, hands, cloth) — where a supervisor zooms first | fails M2 | M2 starts with the skater, not the park; zoomed shots at 3× before anything else; a fallback I would PROPOSE (not take) at that review: a CC0 base body from an open human generator, with heads, hair and clothes still my own |
| 2 | Real thumbs arc: straight flicks drift toward the hooks; the reader tuned on synthetic thumbs | wrong tricks, a frustrated player | Cruise by default (a misread hook still lands a basic trick); the 0.02 margin; the per-player flick check; recorded real strokes in the test corpus; the owner's phone before M3 closes |
| 3 | Memory: code-made textures are uncompressed RGBA8 (the report's 145–155 MB estimate assumed KTX2) | over 192 → refused on phones | baked lighting instead of many maps; shader-side macro variation; 512² on phones; the ledger and `weigh.mjs` at every milestone, turned and back |
| 4 | Frame rate on a mid Android (an A56-class phone manages 8 fps in a native GPU benchmark) | stutter, below the 20 fps floor | the governor; ≤ 120 draws; baked static light; only skaters cast per frame |
| 5 | Riding curved transitions on a triangle mesh: bumps at facets, a wheel snagging on a coping seam | the feel | smooth interpolated normals; fine tessellation (5°); four probes averaged; the coping is a rail, not mesh; a Node "ride the quarter 1,000 times" test watching vertical jerk |
| 6 | iOS swallows strokes near the bottom edge (the home gesture) | lost pops in portrait | the pad's rest point at 60 % of its height; loads need only 18 px; measure on the owner's phone |
| 7 | WebKit: coalesced events missing before iOS 18.2; float render targets for bakes | lower sample rate; bakes failing | the reader is proven at 60 Hz; bakes in RGBA8/RGBA16F only (renderable in WebGL2 with the half-float extension, checked at boot with an RGBA8 fallback) |
| 8 | The certification's readers misreading the HUD as a gate | E-NOT-IN on a phone | "Play" on the title; no full-screen lifted layer with words during play; checked in M3 with the probe's own reader |
| 9 | Bowl corners (toroidal transitions) are the hardest geometry | M2 slips | built and ridden in M1's greybox as one corner before the whole Basin |
| 10 | The heavy lock is shared | wall time | batch drives into ≤ 6-minute turns; Node tests for everything a browser need not see |
| 11 | Clean-room: Ochrefall's code is StarKnightt's Cinder Ops (MIT) — the same author as the unlicensed skate-park I must not read | contamination claims | I read Ochrefall's MIT baker and tier code for ideas only, write my own, and log it; I never open skate-park or `_ref/` (CLEANROOM.md) |
| 12 | Scope: 4 skaters, 21 elements, 50+ tricks, MP | late milestones | 2 skaters at M2 (the other 2 in M3), greybox of everything in M1 |

---

## 13. Time plan

Hours of my work; the heavy lock and each review add wall time. Every milestone ends with a stop and a report of evidence.

| Milestone | Work | Hours | Evidence at the stop |
|---|---|---|---|
| M1 the feel slice | config + sim (controller, states, landing, grinds on rails and ledges, manual, quarter-pipe air, bail + respawn), the reader (≥ 4 graded flips), zones + look band, filmer camera, greybox of the whole park from `PARK`, HUD combo scorer; **then a skater look spike, ≤ 3 h** (Juno sculpted in code, no rig, on the board in the golden-hour light) | 17–21 | `tests/` green (determinism, reader, zones with the planted fault both ways, combo, handling, tricks reachable for the M1 set); the bot by touch on Chromium and WebKit (WebKit labelled synthetic touch) at 390×844 and 844×390, the game's own counters moving; shots, looked at, of roll, air, a rail grind, a ledge grind, manual, quarter-pipe air, a clean landing, a sketchy landing, a bail, respawn, the look band in use; a `--gpu` frame log; the skater spike's zoomed shots at 390×844 ×3 (full body, face, hands, shoes + board, cloth at elbows and knees) |
| M2 the look | material bakes, lightmap, decals, set dressing (trees, fences, city edge), sky + tone map; skaters 1–2 (sculpt or the approved base — decided at the M1 review — rig, IK, poses) and the board; tiers + governor + ledger; the four hero surfaces raised to 1024² if the zoom shows them soft | 16–22 | zoomed shots at phone size (upright and turned) of skater, board and every element; `weigh.mjs` turned and back; a `--gpu` frame log; triangle counts |
| M3 the game | the full trick set and scoring, all 24 gaps, Run + goals + unlocks, skaters 3–4, loading screen, title/pause/results, saves, synthesized audio, juice, every size 320×568 … 820×1180 both ways | 14–18 | `tests/combo.mjs`, `park_lines.mjs`, `assist_sweep.mjs`; shots at every size; the loading sheet; WAV renders; the bot's long run |
| M4 together | frames + interpolation + names, S.K.A.T.E., the two-frame harness; then on your go `ship.mjs upload` → `certify` (Chromium + WebKit) → `launch` (never `publish`) | 8–10 | the harness numbers; the certification's verdict and its two-player pass |
| M5 open source | README, CREDITS, LICENSE (MIT), the `config.js` mod guide, CLEANROOM.md complete | 3–4 | the files |

If the reviews come back promptly: M1 ≈ 10-17, M2 ≈ 10-20, M3 ≈ 10-22, M4 ≈ 10-23, M5 ≈ 10-24.

**The M1 conditions the supervisor set (2026-10-15):** the skater is the top risk and is decided at M1, not M2 — a time-boxed (≤ 3 h) look spike
of Juno ends M1, and the supervisor decides code sculpt versus a CC0 base from its shots (a base, if proposed: the exact asset, its licence line
with the date read, how head, hair and clothes stay ours, evidence no catalogue game uses it). Heavy-lock turns stay under ~6 minutes.

---

## 14. The name — **Waxline** (the owner's pick, 2026-10-15); the three candidates as searched

| Name | Says | What the search found |
|---|---|---|
| **Waxline** | the wax on a ledge, and a line through a park | Web: no game, app, product or brand of that name (only general skate-wax pages) · Steam store search: **0 results** · Google Play: no app of that name (nearest: "Wasaline", "Lawline", "Pawline") · Trademarkia (US marks): **0 results** · App Store (via the web index): none · itch.io (via the index): none; the nearest name is a game called "Waxlight Dungeon" (a different word) · skate brands: none (the nearby wax products are "Ledge Butter" by Sk8Mafia and Consolidated's "Ledge Butta") |
| **Kerbflip** | a kickflip off a kerb (the British spelling) | Web: none (only kickflip pages and kerb-lifting equipment) · Steam: **0 results** · Google Play: "No results for kerbflip" · Trademarkia: **0 results** · App Store, itch.io (via the index): none · skate brands: none. Caution: the "kerb" spelling may read oddly to US players; it puns on "kickflip", a generic trick word |
| **Ledgelight** | golden light along the ledges — this game's look | Web: none · Steam: **0 results** · Google Play: none (nearest: "LedLight", "Ledga", "Edge Lighting" apps) · Trademarkia: **0 results** · App Store, itch.io (via the index): none · skate brands: none. Caution: "-light" echoes Tinlight in the same catalogue |

Not searched (said plainly): the EU (EUIPO / TMview), the UK and WIPO's brand database (their search pages are scripts the fetcher cannot
read), domain names, and the App Store directly (only through the web index). Passing these searches is not clearance (the report: "Passing
`check_game` is not clearance"); a proper clearance search before listing is the owner's call. My preference, for what it is worth: **Waxline**.

---

## 15. Where the brief is unclear, in conflict, or wrong for this game — and what I propose

1. **Looking vs the flick pad.** Law 3 (look = drag the open screen) and §4 (the whole right half is the flick pad, the left half the carve)
   leave no open screen. → The band above the thumbs is the open screen (the kit's `touch.look`); ownership by where a finger lands (§2.1–2.2,
   proof §2.7).
2. **"push = a tap or hold" on the left half** clashes with a hold that steers (you hold to carve). → A floating origin: sideways carves, up
   pushes, down brakes, a quick tap is one push (§2.3).
3. **Frame rate "headed"** (§3 row 1, M2) — but `drive.mjs`'s own header says `--headed` puts a window on the owner's screen while he works
   and to use `--gpu` (real GPU, no window); the house brief says the same about `--headed --dpr 3` reading devicePixelRatio 1. → Frame-time
   logs under `--gpu`; `--headed` only on your word. WebKit has no GPU mode in the harness: WebKit frame rates are not claimed.
4. **Which kit.** The house brief says copy `_kit/mosa-port.js` (1.2.0+s2) and work around its edges; `_kit/mosa-port.next.js` is 1.2.1+s2,
   which fixes three of those four edges (12 px chip text, a 44 px (i), the credits card worded for an original via `credits.kind:
   'original'`) and declares a game's own `controls` when the kit paints none. → Ship 1.2.1 unedited, if you agree.
5. **three.js version.** "r183 as Ochrefall vends it is fine"; Tinlight, Stormspan and Downtown Dash carry r185. → 0.183.1: the whole package
   with its add-ons (cascaded shadows, post-processing) is already on disk (`_work/ochrefall/node_modules/three`), so no network is needed.
6. **"Every touch sample used" / 120 Hz.** A page gets what the browser delivers: coalesced samples in Chrome and iOS Safari ≥ 18.2, display
   rate otherwise. → The row reads "every sample the browser delivers", with the reader proven equal at 60/120/240 Hz (§3.2).
7. **Assists named after skate.'s.** "Streamlined-style mode": I name the presets Cruise / Classic / Raw (our words); skate.'s documented
   defaults are Classic's numbers.
8. **The report's memory estimate (145–155 MiB)** assumed KTX2-compressed textures; a game whose art is made in code at boot has uncompressed
   maps. → The budget leans on baked lighting and 512² maps (§10.1); target ≤ 140 MB.
9. **Rows the brief's table lacks.** The report's skate table has resolution; boot time, character fidelity and touch sampling are where "all
   types" would otherwise go unmeasured. → Added (§1 rows 2, 13, 14, 15).
10. **A physics engine.** Allowed "only if you need it". → None: my own BVH for queries keeps the sim deterministic (the fall tips the posed body; a ragdoll, when it comes, is the falls release's)
    and ≈ 1.5–2 MB lighter than Rapier's or Jolt's compat builds.
11. **"Mocap as a physics target"** (row 7's reference) cannot be matched without mocap. → Keyed poses as numbers + IK + procedural + ragdoll
    blend, measured by foot error and slow-motion shots.
12. **The bot in WebKit.** `drive.mjs` makes real touches only in Chromium; WebKit gets synthetic touch-type PointerEvents (the house
    brief's method), and two fingers at once are synthetic there too — every WebKit result will say so.
13. **Not in either brief: the certification's "is the player in" reader** presses a door whose words begin `play | start | drop in | go |
    tap …`, `weigh.mjs` presses only `play | start …` (no "drop in"), and a full-screen lifted layer whose words invite a press reads as a gate.
    → The title's button says "Play"; no full-screen layer carries words during play. (A small inconsistency between the kit's `weigh.mjs`
    and the platform's reader — reported, not touched.)
14. **"Session"** is banned as a name; I also keep it out of the UI (the mode is a "Run").
15. **CLEANROOM.md** is listed under M5 but §6 says keep it as you go. → Started now with every M0 number.
16. **The kit's look takes the first touch on any open screen and stops it reaching the game**: a full-screen touch layer of mine would have
    to be `data-mosa-ui` and then there is no open screen left — another reason for the band (§2.1). Not a kit defect, a fact the design obeys.


### 15.1 Answered at the M0 review (supervisor orgo-u-53, 2026-10-15 — M0 PASSED)

| Item | Answer |
|---|---|
| 1 the look band, ownership by where a finger landed | approved — prove it both directions exactly as §2.7 says; the HUD in the band never hides the line ahead |
| 4 the kit | ship `_kit/mosa-port.next.js` 1.2.1+s2, unedited (it runs in 29 shipped builds) |
| 5 three.js | 0.183.1 from `_work/ochrefall/node_modules/three`; its licence text in `build/licenses/` |
| 3 frame logs | `--gpu`; never `--headed` without the owner's word (it puts a window on his screen) |
| a CC0 base body | may be PROPOSED, never taken — decided at the M1 review from the skater spike |
| 2, 6, 7, 10, 11, 12, 14, 15, 16 | approved as written |
| 8 memory | ≈ 39 MB of headroom under the 140 target: if the M2 zoom shows the hero surfaces (slab, granite ledges, coping, pavers) soft at 512² on the phone tier, raise those four to 1024² — the ledger and `weigh.mjs` prove the cost |
| 13 the door-word mismatch | reported to the owner by the supervisor; neither tool is touched |
| the name | **Waxline** — the owner's pick; slug `waxline`, title "Waxline" |
| the park spike's legend | said "1..22 named gaps": fixed to 24 |

---

## 16. Clean-room notes (the full log is CLEANROOM.md)

Read for this design: the brief, the house brief, the loading brief, the report, the skate notes, the kit (all of it), the six reference
games' credits, wiring, config heads and shots, Ochrefall's texture baker and tier code (MIT, Cinder Ops — ideas only), Tinlight's port wiring
(the FIRE thumb that keeps looking), Stormspan's flick test; the platform's certification readers (read-only, to know what a phone pass
checks). Not opened: anything under `ports_src/_ref/`, StarKnightt's skate-park, any unlicensed project, any commercial game's code or data.
Every feel number is either a published fact with its link or my own tuning, said so.
