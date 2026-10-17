#!/bin/sh
# ONE ROUND OF EVIDENCE, frozen in runs/<round>/ — the supervisor reads one folder a round, and nothing in it is overwritten by the next.
# In order: every Node test (tests/run_all.sh: the camera's plants both ways, the park's slots, the live combo); then in the browser, one at a
# time: the CENSUS of what is drawn (every round, by itself), every state upright and turned (with the page's own reading of how she is framed),
# the sun's disc, the floor at gameplay distance, the face (its eye line, its look, its pairs, the face on the head), the score read against what is behind it, frame times both ways, the bot by touch (WebKit synthetic, Chromium CDP) at both sizes, the
# weight through the turns; EVERY PLANT on the instruments as they ship (tests/plants.mjs: each rebuilt fresh from this tree, each must be
# caught by its own line — a plant's verdict from an older instrument is stale); and the play page's check when its folder is given.
# One line a step in ROUND.log; each step's log beside it.
# Run it holding the GPU:  bash ~/.mosa/heavy.sh run orgo-u-62-waxline-round -- sh tests/round.sh <round> [play page dir]
set -u
cd "$(dirname "$0")/.." || exit 2
W="$(pwd)"; R="$W/runs/$1"; PAGE="${2:-}"; KIT="$HOME/Documents/ports_src/_kit"; B="$W/build"
if [ -e "$R/ROUND.log" ]; then echo "runs/$1 already holds a round: give this one its own name"; exit 2; fi
mkdir -p "$R"; fail=0
say() { echo "$*" | tee -a "$R/ROUND.log"; }
say "== round $1 · $(date '+%Y-%m-%d %H:%M %Z') · BUILD $(grep -ao "at: '[^']*'" "$B/js/main.js" | head -1)"
NODE_OUT="$R/node" sh tests/run_all.sh > "$R/node.log" 2>&1 || fail=1
say "node tests: $(tail -1 "$R/node.log")"
# drive <folder> <script> <view WxH> [extra flags…]
drive() {
  d="$1"; s="$2"; v="$3"; shift 3; mkdir -p "$R/$d"; log="$R/$d/${d}_$v.log"
  (cd "$KIT" && node drive.mjs "$B" "$W/tests/drive/$s" --viewport "$v" --dpr 3 --out "$R/$d" "$@") > "$log" 2>&1
  verdict=$(grep -aE "^DRIVE" "$log" | tail -1); say "$d $v: ${verdict:-NO VERDICT}$(grep -aE 'CENSUS|EVEN |W1:|framing:|FRAMES|band looks|sun 45|sun 14|HASHES|WHEELS|CLOTH|FACE:|HUD:|the pavers rendered twice' "$log" | sed 's/^ *· */ · /' | tr '\n' ' ')"
  case "$verdict" in *GREEN*) ;; *) fail=1 ;; esac
}
drive census census.mjs 390x844 --gpu
drive states states.mjs 390x844 --gpu
drive states states.mjs 844x390 --gpu
drive sun sun.mjs 844x390 --gpu
drive sun sun.mjs 390x844 --gpu
drive floor floor.mjs 390x844 --gpu
drive hashes hashes.mjs 390x844 --gpu
drive kit kit.mjs 390x844 --gpu
drive kit kit.mjs 844x390 --gpu
drive cloth cloth.mjs 390x844 --gpu
drive cloth cloth.mjs 844x390 --gpu
drive face face.mjs 390x844 --gpu
drive face face.mjs 844x390 --gpu
drive hud hud.mjs 390x844 --gpu
drive hud hud.mjs 844x390 --gpu
# a frame that throws never stops the game, and is never silent (10-17: the page's guard), in Chromium and in WebKit
drive frames frames.mjs 390x844 --gpu
drive frames_webkit frames.mjs 390x844 --engine webkit
drive even even.mjs 390x844 --gpu
drive even even.mjs 844x390 --gpu
drive perf perf.mjs 390x844 --gpu
drive perf perf.mjs 844x390 --gpu
drive bot_webkit_synthetic bot.mjs 390x844 --engine webkit
drive bot_webkit_synthetic bot.mjs 844x390 --engine webkit
drive bot_chromium_cdp bot.mjs 390x844 --gpu
drive bot_chromium_cdp bot.mjs 844x390 --gpu
# THE HANDS (R6.1), for the eye: the title, four push frames, a roll, upright and turned (their numbers: tests/hands.mjs in the Node walls)
drive hands hands_shots.mjs 390x844 --gpu
drive hands hands_shots.mjs 844x390 --gpu
# MOBILE (R5): the full-screen control under the platform's frame (not drawn), the turn keeping the run, the phone's weight turned and back
drive fullscreen_chromium fullscreen.mjs 390x844 --gpu
drive fullscreen_webkit fullscreen.mjs 390x844 --engine webkit
drive turn_chromium turn.mjs 390x844 --gpu
drive turn_webkit turn.mjs 390x844 --engine webkit
drive phone_budget phone_budget.mjs 390x844 --gpu --init "$KIT/weigh_tally.js"
# ...and at the top of its own window (the kit always frames the page: these two serve the build themselves): the control pressed, and
# landscape and notched with the HUD read against the safe area
node "$W/tests/drive/fullscreen_top.mjs" "$B" > "$R/fullscreen_top.log" 2>&1; say "fullscreen at the top: $(tail -1 "$R/fullscreen_top.log")"; grep -aq "FULLSCREEN TOP: GREEN" "$R/fullscreen_top.log" || fail=1
node "$W/tests/drive/landscape.mjs" "$B" chromium,webkit "$R/landscape" > "$R/landscape.log" 2>&1; say "landscape: $(tail -1 "$R/landscape.log")"; grep -aq "LANDSCAPE: GREEN" "$R/landscape.log" || fail=1
drive sound_drive sound.mjs 390x844 --gpu
python3 "$W/tests/sound_measure.py" "$R/sound" > "$R/sound/measure.log" 2>&1; say "sound: $(tail -1 "$R/sound/measure.log") · $(grep -aE 'seams' "$R/sound/measure.log" | sed 's/.*seams /seams /; s/ over.*//' | tr '\n' ' ')"
grep -aq "SOUND: GREEN" "$R/sound/measure.log" || fail=1
mkdir -p "$R/weigh"; (cd "$KIT" && node drive.mjs "$B" weigh.mjs --init weigh_tally.js --gpu --viewport 390x844 --dpr 3 --out "$R/weigh") > "$R/weigh/weigh.log" 2>&1
say "weigh: $(grep -aE '^DRIVE' "$R/weigh/weigh.log" | tail -1) · peak $(grep -ao '"peak_mb":[0-9.]*' "$R/weigh/weigh.log" | sort -t: -k2 -n | tail -1)"
grep -aq "DRIVE: GREEN" "$R/weigh/weigh.log" || fail=1
node "$W/tests/plants.mjs" run "$R/plants" > "$R/plants.log" 2>&1 || fail=1
say "plants: $(tail -1 "$R/plants.log")$(grep -a '^✖' "$R/plants.log" | head -4 | cut -c1-160 | sed 's/^/ · /' | tr '\n' ' ')"
# the gates' census (the supervisor, 10-16: a gate whose case never happens passes for nothing): every clean gate of this round against every
# plant's own run — proven, unproven (each owed a plant), and a plant that turned no gate RED (RED)
node "$W/tests/gates_census.mjs" "$R" > "$R/GATES_CENSUS.log" 2>&1 || fail=1
say "gates census: $(grep -a '^GATES:' "$R/GATES_CENSUS.log" | cut -c1-160) · $(tail -1 "$R/GATES_CENSUS.log" | cut -c1-80)"
if [ -n "$PAGE" ]; then node "$W/host/check_page.mjs" "$PAGE" "$R/page" > /dev/null 2>&1; say "page check: $(tail -1 "$R/page/check.log")"; grep -aq "PAGE CHECK: GREEN" "$R/page/check.log" || fail=1; fi
[ $fail -eq 0 ] && say "ROUND $1: GREEN" || say "ROUND $1: RED"
exit $fail
