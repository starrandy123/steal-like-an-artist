#!/bin/sh
# every Node test of Waxline, one line each, and a final verdict (no browser: these run in seconds); with NODE_OUT=<dir> each test's whole output is kept there (tests/gates_census.mjs reads it) — the formulas' own truth (formulas.mjs) among them, so a round reads it on the clean build, not only through its plants (the supervisor's C, 10-16)
cd "$(dirname "$0")/.." || exit 2
fail=0
for t in parse.mjs formulas.mjs vendor_three.mjs hash.mjs hard_gates.mjs park.mjs sculpt.mjs face.mjs motion.mjs motion_sweep.mjs legs_step.mjs surfaces.mjs vstar.mjs slide.mjs catch_from_above.mjs fullscreen.mjs hands.mjs reader.mjs zones.mjs tricks_reachable.mjs coping_capture.mjs outcomes.mjs stops.mjs poses.mjs support.mjs support_kilnyard.mjs never_throws.mjs climbs.mjs combo.mjs handling.mjs determinism.mjs run_goals.mjs camera_view.mjs "camera_moving.mjs --plants" "plants.mjs check"; do
  out=$(node tests/$t 2>&1); rc=$?
  [ -n "${NODE_OUT:-}" ] && { mkdir -p "$NODE_OUT"; printf '%s\n' "$out" > "$NODE_OUT/$(echo "$t" | tr ' ' '_').log"; }   # the whole output, for the gates' census
  echo "$out" | tail -1
  [ $rc -ne 0 ] && { fail=1; echo "$out" | grep '✖' | head -5; }
done
# for the gates' census: the camera's wall as its plants run it (flagless: every gate's own line; with --plants it says the both-ways summary)
[ -n "${NODE_OUT:-}" ] && node tests/camera_moving.mjs > "$NODE_OUT/camera_moving.log" 2>&1
[ $fail -eq 0 ] && echo "ALL NODE TESTS: GREEN" || echo "ALL NODE TESTS: RED"
exit $fail
