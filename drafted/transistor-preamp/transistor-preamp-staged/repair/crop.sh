#!/bin/sh
# Crop stage 1 - sheet mm x 40..135, y 42..142 - out of <dir>/staged-board.pdf
# at 300 dpi, for each directory given. The same box serves both sides: the
# repair re-places nothing outside stage 1, so one box holds the region's whole
# state on each side. Run render.sh on each directory first.
#
# usage: sh crop.sh <dir> [<dir> ...]
set -eu
for d in "$@"; do
  dir="$(cd "$d" && pwd)"
  magick -density 300 "$dir/staged-board.pdf" -background white -alpha remove \
    -crop 1122x1181+472+496 +repage "$dir/stage-one-crop.png" 2>/dev/null
  echo "$dir/stage-one-crop.png"
done
