#!/bin/sh
# KILN YARD'S WALLS IN ONE LINE EACH (until the Node suite loops over the parks): the plan's checks, the backdrop, the props (drawn = met,
# solid), the surfaces sweep on every preset (GATED; a run's `reported` option said), every lip's vStar, the big drops (REPORTED until the legs
# take big landings), every named gap reached by a run a player can make (tests/parks/gaps_reached.mjs: its reported rows said, never gated;
# a row's note said), and the Plaza unchanged by the move (its snapshot). Heavy: run it inside ~/.mosa/heavy.sh (bash ~/.mosa/heavy.sh run <who> -- sh tests/parks/run_kilnyard.sh).
cd "$(dirname "$0")/../.." || exit 2
fail=0
gate() { out=$("$@" 2>&1); rc=$?; echo "$out" | tail -1; [ $rc -ne 0 ] && { fail=1; echo "$out" | grep '✖' | head -4; }; }
note() { out=$("$@" 2>&1); echo "ℹ REPORTED: $(echo "$out" | tail -1)"; }
# every script the page loads parses, as the page parses it (tests/parse.mjs, run_all's first wall: 10-17, a credits line in port.js broke the boot)
gate node tests/parse.mjs
gate node tools/map_plan.mjs build/js/parks/kilnyard.js plan/kiln_yard
gate node tests/backdrop.mjs build/js/parks/kilnyard.js
gate node tests/props.mjs build/js/parks/kilnyard.js
gate node tests/props_solid.mjs build/js/parks/kilnyard.js
WL_PARK=kilnyard gate node tests/surfaces.mjs   # every run on the three presets; a run's `reported` option is said, never gated
WL_PARK=kilnyard gate node tests/vstar.mjs      # every lip's roll-in speed measured; none stored above it
note node tests/parks/kilnyard_drops.mjs
gate node tests/parks/gaps_reached.mjs kilnyard
gate node tools/park_snapshot.mjs check plan/snapshots/plaza_3705b81.json   # the Plaza as merged (3705b81): Kiln Yard's changes leave it as it is
[ $fail -eq 0 ] && echo "KILN YARD: GREEN (gated rows)" || echo "KILN YARD: RED"
exit $fail
