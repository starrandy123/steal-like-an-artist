#!/bin/sh
# FILMS AND CONTACT SHEETS from tests/drive/clips.mjs: every clip folder of BEFORE and AFTER into an mp4 (30 frames a second: a 1× clip plays
# at 1×, a quarter clip at a quarter), each pair side by side (before | after), and a contact sheet of every side clip at 10 frames a game
# second (every third frame of a 1× clip, every twelfth of a quarter).
#   sh tests/clips.sh <before frames dir> <after frames dir> <out dir>
set -u
B="$1"; A="$2"; O="$3"; mkdir -p "$O/films" "$O/side_by_side" "$O/sheets"
for d in "$A"/*/; do
  n=$(basename "$d"); [ -f "$d/0000.jpg" ] || continue
  for w in before after; do src="$B/$n"; [ $w = after ] && src="$A/$n"; [ -f "$src/0000.jpg" ] || continue
    fps=30; case "$n" in stamps*) fps=60;; esac   # a stamp-list clip is one picture a 60 Hz display frame: played at 60 it is 1×
    ffmpeg -loglevel error -y -framerate $fps -i "$src/%04d.jpg" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -crf 20 "$O/films/${n}_$w.mp4"; done   # (x264 wants even sides)
  if [ -f "$O/films/${n}_before.mp4" ]; then
    ffmpeg -loglevel error -y -i "$O/films/${n}_before.mp4" -i "$O/films/${n}_after.mp4" -filter_complex "[0:v]pad=iw+8:ih:0:0:color=white[l];[l][1:v]hstack=inputs=2" -c:v libx264 -pix_fmt yuv420p -crf 20 "$O/side_by_side/${n}_before_after.mp4"; fi
  case "$n" in *side*) step=3; case "$n" in *quarter*) step=12;; esac
    for w in before after; do src="$B/$n"; [ $w = after ] && src="$A/$n"; [ -f "$src/0000.jpg" ] || continue
      # two steps — every step-th frame out, then tiled (one select+tile pass kept 3 of 30: the supervisor's sheet.sh, round 15)
      T="$O/sheets/.t_${n}_$w"; mkdir -p "$T"; i=0; f=0
      while [ -f "$(printf '%s/%04d.jpg' "$src" $f)" ]; do ffmpeg -loglevel error -y -i "$(printf '%s/%04d.jpg' "$src" $f)" -vf "scale=216:-1" "$T/$(printf %04d $i).png"; i=$((i+1)); f=$((f+step)); done
      rows=$(( (i + 7) / 8 )); ffmpeg -loglevel error -y -framerate 1 -i "$T/%04d.png" -vf "tile=8x${rows}:padding=2:color=white" -frames:v 1 "$O/sheets/${n}_$w.png"
      rm -f "$T"/*.png; rmdir "$T"; done;; esac
done
echo "CLIPS: $(ls "$O/films" | wc -l | tr -d ' ') films, $(ls "$O/side_by_side" | wc -l | tr -d ' ') side by side, $(ls "$O/sheets" | wc -l | tr -d ' ') contact sheets in $O"
