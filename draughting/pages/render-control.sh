#!/bin/sh
# Controls for render.sh's SVG-matches-PDF check (the h7-module's Task 7e fix round 2, review I4),
# run on a board's committed project. Run on a scratch COPY of it; nothing committed is touched.
# Moved here from drafted/h7-platform/h7-module/repair/tools/ by the H7 pedal plan's Task 4: the
# board is the first argument, and the sub-sheet the second (the module's own controls name
# reset_boot).
#
#  1. positive: render.sh on the root with `root` writes a PDF, SVG and PNG, and the SVG's title
#     block "Sheet:" text equals the PDF's ("/").
#  2. the old behaviour: render.sh with the page number of <block> (a sub-sheet page, read from
#     the root's sheet symbol) makes kicad-cli write a PDF of /<block>/ and an SVG of /; the
#     check must refuse, name both sheets, and leave no output behind. Before the check, that run
#     exited 0 and wrote the mismatched triple.
#  3. the check itself can fail: kicad-cli's own SVG of that page is measured here, so that control 2
#     is shown to rest on a real mismatch and not on a bare refusal.
#
# usage: sh render-control.sh <board-dir> <block>
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli

bad() {
  echo "render-control.sh: CONTROL FAILED - $1" >&2
  exit 1
}

[ "$#" -eq 2 ] || bad "expected two arguments, the board directory and a block whose page is a sub-sheet of the root; got $#"
[ -d "$1" ] || bad "$1 is not a directory - the first argument is the board's drafted directory"
proj="$(cd "$1" && pwd)"
board="$(basename "$proj")"
block="$2"
[ -s "$proj/$board.kicad_sch" ] || bad "$proj/$board.kicad_sch does not exist; the board directory holds its root"
[ -s "$proj/$block.kicad_sch" ] || bad "$proj/$block.kicad_sch does not exist; name a block of the board"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

mkdir "$work/p"
cp "$proj"/*.kicad_sch "$proj/$board.kicad_pro" "$proj/sym-lib-table" "$work/p/"

echo "== 1. the root renders, and its SVG is the PDF's sheet"
sh "$here/render.sh" "$work/p/$board.kicad_sch" "$work/o1" root >"$work/o1.log" 2>&1 || { cat "$work/o1.log" >&2; bad "render.sh root failed"; }
for e in pdf svg png; do [ -s "$work/o1/$board.$e" ] || bad "root render wrote no $e"; done
echo "   pass"

echo "== 2. a sub-sheet page is refused, naming both sheets, with no output left"
page="$(grep "Sheetfile\" \"$block.kicad_sch\"" "$work/p/$board.kicad_sch" | grep -o '(page "[0-9]*")' | grep -o '[0-9][0-9]*' | head -1)"
[ -n "$page" ] || bad "could not read $block's page number from the root's sheet_instances"
if sh "$here/render.sh" "$work/p/$board.kicad_sch" "$work/o2" "$page" >"$work/o2.log" 2>&1; then
  cat "$work/o2.log" >&2
  bad "render.sh page $page exited 0: the PDF/PNG/SVG of two different pages was written"
fi
grep -q "the PDF is 'Sheet: /$block/' but the SVG is 'Sheet: /'" "$work/o2.log" || { cat "$work/o2.log" >&2; bad "the refusal did not name both sheets"; }
[ -z "$(ls "$work/o2" 2>/dev/null)" ] || bad "a refused render left output behind: $(ls "$work/o2")"
echo "   refused page $page: $(grep -o "the PDF is.*SVG is '[^']*'" "$work/o2.log")"

echo "== 3. kicad-cli's own SVG for that page is the root (the mismatch is real)"
mkdir "$work/svg"
"$kc" sch export svg --pages "$page" -o "$work/svg" "$work/p/$board.kicad_sch" >/dev/null 2>&1 || bad "kicad-cli svg export failed"
got="$(grep -o 'Sheet:[^<]*' "$work/svg"/*.svg | head -1)"
case "$got" in *"Sheet: /") : ;; *) bad "kicad-cli's SVG of page $page is no longer the root ('$got'); render.sh's check and header need revisiting" ;; esac
echo "   kicad-cli --pages $page SVG: $got"

echo "render-control.sh: every control came out as stated"
