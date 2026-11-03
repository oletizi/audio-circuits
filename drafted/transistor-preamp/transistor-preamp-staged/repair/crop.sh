#!/bin/sh
# Crop stage 1 - sheet mm x 40..135, y 42..142 - out of <dir>/staged-board.pdf
# at 300 dpi, for each directory given. The same box serves both sides: the
# repair re-places nothing outside stage 1, so one box holds the region's whole
# state on each side. Run render.sh on each directory first.
#
# Fails loudly: the previous crop is deleted first, the PDF must exist, magick's
# exit status is checked, the crop must exist and be non-empty, and stderr stays
# visible (only ImageMagick's known Fontconfig warnings are filtered).
#
# usage: sh crop.sh <dir> [<dir> ...]
set -eu
set -o pipefail

fail() {
  echo "crop.sh: FAILED - $1" >&2
  exit 1
}

[ "$#" -ge 1 ] || fail "expected at least one directory holding staged-board.pdf"
err="$(mktemp)"
trap 'rm -f "$err"' EXIT
for d in "$@"; do
  [ -d "$d" ] || fail "$d is not a directory"
  dir="$(cd "$d" && pwd)"
  [ -s "$dir/staged-board.pdf" ] || fail "$dir/staged-board.pdf does not exist or is empty - run render.sh first"
  rm -f "$dir/stage-one-crop.png"
  status=0
  magick -density 300 "$dir/staged-board.pdf" -background white -alpha remove \
    -crop 1122x1181+472+496 +repage "$dir/stage-one-crop.png" 2>"$err" || status=$?
  grep -v '^Fontconfig warning' "$err" >&2 || true
  [ "$status" -eq 0 ] || fail "magick exited $status cropping $dir/staged-board.pdf"
  [ -s "$dir/stage-one-crop.png" ] || fail "magick wrote no crop for $dir"
  echo "$dir/stage-one-crop.png"
done
