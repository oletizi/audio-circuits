#!/bin/sh
# Render <dir>/staged-board.kicad_sch to PDF, SVG and a 150 dpi PNG beside it.
# Both sides of a comparison are rendered under the same file name in sibling
# directories with the same .kicad_pro (TOOLING.md step 3), since the title
# block prints the file name.
#
# Fails loudly: previous outputs are deleted first, every tool's exit status is
# checked, each output must exist and be non-empty, and stderr stays visible
# (only ImageMagick's known Fontconfig configuration warnings are filtered).
#
# usage: sh render.sh <dir>
set -eu
set -o pipefail
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli

fail() {
  echo "render.sh: FAILED - $1" >&2
  exit 1
}

[ "$#" -eq 1 ] || fail "expected one argument, the directory holding staged-board.kicad_sch; got $#"
[ -d "$1" ] || fail "$1 is not a directory"
dir="$(cd "$1" && pwd)"
sch="$dir/staged-board.kicad_sch"
[ -s "$sch" ] || fail "$sch does not exist or is empty - nothing to render"
rm -f "$dir/staged-board.pdf" "$dir/staged-board.svg" "$dir/staged-board.png"

"$kc" sch export pdf -o "$dir/staged-board.pdf" "$sch" >/dev/null || fail "kicad-cli sch export pdf exited non-zero"
[ -s "$dir/staged-board.pdf" ] || fail "kicad-cli wrote no PDF"
"$kc" sch export svg -o "$dir" "$sch" >/dev/null || fail "kicad-cli sch export svg exited non-zero"
[ -s "$dir/staged-board.svg" ] || fail "kicad-cli wrote no SVG"

err="$(mktemp)"
trap 'rm -f "$err"' EXIT
status=0
magick -density 150 "$dir/staged-board.pdf" -background white -alpha remove "$dir/staged-board.png" 2>"$err" || status=$?
grep -v '^Fontconfig warning' "$err" >&2 || true
[ "$status" -eq 0 ] || fail "magick exited $status converting the PDF to PNG"
[ -s "$dir/staged-board.png" ] || fail "magick wrote no PNG"
echo "$dir/staged-board.png"
