#!/bin/sh
# Render <dir>/staged-board.kicad_sch to PDF, SVG and a 150 dpi PNG beside it.
# Both sides of a comparison are rendered under the same file name in sibling
# directories with the same .kicad_pro (TOOLING.md step 3), since the title
# block prints the file name.
#
# usage: sh render.sh <dir>
set -eu
dir="$(cd "$1" && pwd)"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
"$kc" sch export pdf -o "$dir/staged-board.pdf" "$dir/staged-board.kicad_sch" >/dev/null
"$kc" sch export svg -o "$dir" "$dir/staged-board.kicad_sch" >/dev/null
magick -density 150 "$dir/staged-board.pdf" -background white -alpha remove "$dir/staged-board.png" 2>/dev/null
echo "$dir/staged-board.png"
