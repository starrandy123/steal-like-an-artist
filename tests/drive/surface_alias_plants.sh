#!/bin/sh
# SURFACE ALIASING's plants (tests/drive/surface_alias.mjs): each puts one defect back into a COPY of the build and runs the drive on the copy
# (the source is never touched — 10-17: a plant made in place and stopped mid-run stayed in the source); each must turn the drive RED, its own
# gate said. Heavy: run it inside ~/.mosa/heavy.sh.
#   nobl   — the asphalt written without its band limits (bl) on its fine bands: the stones, their tone, the grit
#   zfight — the paint with no polygon offset: its quads at the ground's own height fight it for the depth (the frame pairs must see it)
#   ramp   — the paint's edge as a one-pixel ramp (d / fwidth): a far line under a pixel wide lit too bright, hopping between pixels
# and one said, not required to turn it RED (10-17, measured): grit — the asphalt's grit alone without bl. At the phone's 512 bake it is a
# ±3 % band finer than the bake holds: it folds into the texture as a still, faint pattern the mipmaps filter; the asphalt stays under the slab.
cd "$(dirname "$0")/../.." || exit 2
fails=0; before=$(find build -type f -not -path '*/vendor/*' -exec shasum {} + | sort | shasum)
trap 'rm -rf runs/.plant_build_*' EXIT INT TERM
# plant <name> <must: red|said> <file> <python list of [old, new] pairs>
plant() { name=$1; must=$2; file=$3; pairs=$4; dir="runs/.plant_build_$name"
  rm -rf "$dir"; cp -R build "$dir" || exit 2
  if ! python3 -c "import sys, ast; p = sys.argv[1]; s = open(p).read()
for a, b in ast.literal_eval(sys.argv[2]):
    assert s.count(a) == 1, a[:60]; s = s.replace(a, b)
open(p, 'w').write(s)" "$dir/${file#build/}" "$pairs"; then rm -rf "$dir"; echo "✖ PLANT $name: does not apply to $file"; fails=1; return; fi
  WL_PLANT=$name node ~/Documents/ports_src/_kit/drive.mjs "$dir" tests/drive/surface_alias.mjs --gpu --dpr 3 --out "runs/alias_plant_$name" > "runs/alias_plant_$name.log" 2>&1
  rm -rf "$dir"
  red=$(grep -c "✖" "runs/alias_plant_$name.log")
  if grep -q "SURFACE ALIASING: RED" "runs/alias_plant_$name.log"; then echo "✔ PLANT $name: RED ($red lines) — $(grep '✖' "runs/alias_plant_$name.log" | sed 's/^ *· //' | grep -o '^[^:]*' | sort | uniq -c | sort -rn | head -3 | tr -s ' ' | tr '\n' ';')"
  elif [ "$must" = said ]; then echo "ℹ PLANT $name: GREEN, said (see the script's head) — $(grep 'asphalt ·' "runs/alias_plant_$name.log" | grep -v NULL | grep -o 'the worst tiles [^—]*' | head -2 | tr '\n' ';')"
  else echo "✖ PLANT $name: still GREEN — the gate does not see it"; fails=1; fi
}
plant nobl red build/js/view/surfaces.js "[('float stone = mix(0.32, ss(0.40, 0.16, wor(uv * 180.0, vec2(180.0)).x), bl(180.0)), tone = mix(0.5, vn(uv * 180.0 + 0.5, vec2(180.0)), bl(180.0));', 'float stone = ss(0.40, 0.16, wor(uv * 180.0, vec2(180.0)).x), tone = vn(uv * 180.0 + 0.5, vec2(180.0));'), ('float grit = (fbm(uv * 300.0, vec2(300.0), 2) - 0.5) * bl(300.0);', 'float grit = (fbm(uv * 300.0, vec2(300.0), 2) - 0.5);')]"
plant zfight red build/js/view/surfaces.js "[('transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });', 'transparent: true, depthWrite: false });')]"
plant ramp red build/js/view/surfaces.js "[(\" eAL *= 0.25;\", \" eAL = clamp((vLine.z - abs(vLine.x)) / (2.0 * fA) + 0.5, 0.0, 1.0) * clamp((vLine.w - abs(vLine.y)) / (2.0 * fL) + 0.5, 0.0, 1.0);\")]"
plant grit said build/js/view/surfaces.js "[('float grit = (fbm(uv * 300.0, vec2(300.0), 2) - 0.5) * bl(300.0);', 'float grit = (fbm(uv * 300.0, vec2(300.0), 2) - 0.5);')]"
[ "$(find build -type f -not -path '*/vendor/*' -exec shasum {} + | sort | shasum)" = "$before" ] && echo "the source is as it was" || { echo "✖ THE SOURCE CHANGED during the plants"; fails=1; }
[ $fails -eq 0 ] && echo "SURFACE ALIASING PLANTS: GREEN (each required plant turned the drive RED)" || echo "SURFACE ALIASING PLANTS: RED"
exit $fails
