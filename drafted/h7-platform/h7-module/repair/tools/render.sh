#!/bin/sh
# Render one h7-module sheet (copied from the h7-carrier's repair/render.sh) to PDF, SVG and a 150 dpi PNG in <out-dir>. Both sides of a
# before/after comparison are rendered from a copy under the same file name in sibling
# directories with the same .kicad_pro (TOOLING.md step 3), since the title block prints the file
# name and the render depends on the project file.
#
# A ROOT sheet exports as one PDF page per sheet of its hierarchy (the h7-module root: 13), so
# rendering it needs a page: the optional third argument is a KiCad page number, passed to
# kicad-cli's --pages for the PDF and the SVG alike, or `root`, which is read from the sheet's own
# (sheet_instances (path "/" (page "N"))). With no page argument the PDF must have exactly one page;
# a multi-page PDF is refused, naming the argument, rather than rendered as several PNGs.
#
# Fails loudly: previous outputs are deleted first, every tool's exit status is checked, each
# output must exist and be non-empty, the PDF must hold exactly one page, and stderr stays visible
# (only the known Fontconfig configuration warnings are filtered, from kicad-cli and ImageMagick alike).
#
# usage: sh render.sh <sheet.kicad_sch> <out-dir> [<page number> | root]
set -eu
set -o pipefail
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli

fail() {
  echo "render.sh: FAILED - $1" >&2
  exit 1
}

[ "$#" -eq 2 ] || [ "$#" -eq 3 ] || fail "expected the sheet, an output directory and optionally a page (a number, or root); got $# arguments"
[ -s "$1" ] || fail "$1 does not exist or is empty - nothing to render"
mkdir -p "$2"
out="$(cd "$2" && pwd)"
stem="$(basename "$1" .kicad_sch)"
rm -f "$out/$stem.pdf" "$out/$stem.svg" "$out/$stem.png"

page=""
if [ "$#" -eq 3 ]; then
  page="$3"
  if [ "$page" = root ]; then
    # The root's own page number, from its sheet_instances block: the line after (path "/".
    page="$(awk '/\(path "\/"$/ { want = 1; next } want && /\(page "/ { gsub(/.*\(page "|"\).*/, ""); print; exit }' "$1")"
    [ -n "$page" ] || fail "$1 has no (sheet_instances (path \"/\" (page ...))) to read the root's page number from; is it a root sheet?"
  fi
  case "$page" in
    ''|*[!0-9]*) fail "the page must be a KiCad page number or root; got '$3'" ;;
  esac
fi

# A tool's stderr, minus the Fontconfig configuration warnings this machine prints on every run
# (kicad-cli's and magick's alike; Task 7a review M6: only magick's were filtered).
quiet() {
  grep -v '^Fontconfig warning' "$err" >&2 || true
}

err="$(mktemp)"
trap 'rm -f "$err"' EXIT

if [ -n "$page" ]; then
  "$kc" sch export pdf --pages "$page" -o "$out/$stem.pdf" "$1" >/dev/null 2>"$err" \
    || { quiet; fail "kicad-cli sch export pdf --pages $page exited non-zero"; }
else
  "$kc" sch export pdf -o "$out/$stem.pdf" "$1" >/dev/null 2>"$err" \
    || { quiet; fail "kicad-cli sch export pdf exited non-zero"; }
fi
quiet
[ -s "$out/$stem.pdf" ] || fail "kicad-cli wrote no PDF"
pages="$(magick identify -format '%n\n' "$out/$stem.pdf" 2>"$err" | head -1)" || { quiet; fail "magick identify could not count the PDF's pages"; }
quiet
if [ "$pages" != 1 ]; then
  if [ -n "$page" ]; then
    fail "the PDF of page $page has $pages pages, expected 1"
  fi
  fail "the PDF has $pages pages (a root sheet exports its whole hierarchy); name the page to render as the third argument, a page number or root"
fi

svgdir="$(mktemp -d)"
trap 'rm -f "$err"; rm -rf "$svgdir"' EXIT
if [ -n "$page" ]; then
  "$kc" sch export svg --pages "$page" -o "$svgdir" "$1" >/dev/null 2>"$err" \
    || { quiet; fail "kicad-cli sch export svg --pages $page exited non-zero"; }
else
  "$kc" sch export svg -o "$svgdir" "$1" >/dev/null 2>"$err" \
    || { quiet; fail "kicad-cli sch export svg exited non-zero"; }
fi
quiet
count="$(ls "$svgdir" | wc -l | tr -d ' ')"
[ "$count" = 1 ] || fail "kicad-cli wrote $count SVG files, expected 1: $(ls "$svgdir" | tr '\n' ' ')"
mv "$svgdir"/*.svg "$out/$stem.svg"
[ -s "$out/$stem.svg" ] || fail "kicad-cli wrote no SVG"

status=0
magick -density 150 "$out/$stem.pdf" -background white -alpha remove "$out/$stem.png" 2>"$err" || status=$?
quiet
[ "$status" -eq 0 ] || fail "magick exited $status converting the PDF to PNG"
[ -s "$out/$stem.png" ] || fail "magick wrote no PNG"
echo "$out/$stem.png"
