#!/bin/sh
# THE TREE'S HASH (the supervisor's recipe, 10-16, so builder and judge run the same bytes): every file under build/, host/ and tests/, and
# CLEANROOM.md and DESIGN.md, their paths relative to the tree's root (build/js/main.js …), sorted TOGETHER in the C locale; each file's
# sha-256; that list's own sha-256; its first 16 hex. Usage: sh tests/tree_hash.sh [tree root, default: this tree]
R="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$R" || exit 2
{ find build host tests -type f; printf 'CLEANROOM.md\nDESIGN.md\n'; } | LC_ALL=C sort | while IFS= read -r f; do shasum -a 256 "$f"; done | shasum -a 256 | cut -c1-16
