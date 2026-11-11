#!/bin/sh
# Render one h7-carrier sheet to PDF, SVG and a 150 dpi PNG in <out-dir>. Both sides of a
# before/after comparison are rendered from a copy under the same file name in sibling
# directories with the same .kicad_pro (TOOLING.md step 3), since the title block prints the file
# name and the render depends on the project file.
#
# Fails loudly: previous outputs are deleted first, every tool's exit status is checked, each
# output must exist and be non-empty, and stderr stays visible (only ImageMagick's known
# Fontconfig configuration warnings are filtered).
#
# usage: sh render.sh <sheet.kicad_sch> <out-dir>
set -eu
set -o pipefail
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli

fail() {
  echo "render.sh: FAILED - $1" >&2
  exit 1
}

[ "$#" -eq 2 ] || fail "expected two arguments, the sheet and an output directory; got $#"
[ -s "$1" ] || fail "$1 does not exist or is empty - nothing to render"
mkdir -p "$2"
out="$(cd "$2" && pwd)"
stem="$(basename "$1" .kicad_sch)"
rm -f "$out/$stem.pdf" "$out/$stem.svg" "$out/$stem.png"

"$kc" sch export pdf -o "$out/$stem.pdf" "$1" >/dev/null || fail "kicad-cli sch export pdf exited non-zero"
[ -s "$out/$stem.pdf" ] || fail "kicad-cli wrote no PDF"
"$kc" sch export svg -o "$out" "$1" >/dev/null || fail "kicad-cli sch export svg exited non-zero"
[ -s "$out/$stem.svg" ] || fail "kicad-cli wrote no SVG"

err="$(mktemp)"
trap 'rm -f "$err"' EXIT
status=0
magick -density 150 "$out/$stem.pdf" -background white -alpha remove "$out/$stem.png" 2>"$err" || status=$?
grep -v '^Fontconfig warning' "$err" >&2 || true
[ "$status" -eq 0 ] || fail "magick exited $status converting the PDF to PNG"
[ -s "$out/$stem.png" ] || fail "magick wrote no PNG"
echo "$out/$stem.png"
