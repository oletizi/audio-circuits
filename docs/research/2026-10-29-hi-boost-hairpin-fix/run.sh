#!/bin/sh
# Redraw the Lo boost stand-in group of the accepted pultec-hi-boost page.
#
# Idempotent: it always starts from the committed accepted sheet
# (docs/research/2026-10-29-hi-boost-full-run/hi-boost-hybrid.kicad_sch), so
# re-running it re-derives the same final sheet rather than applying the repair
# twice. It needs akcli, kicad-cli and ImageMagick; it does NOT need copperhead,
# because it starts from a drafted sheet rather than from an intent.
#
#   SCRATCHPAD=<dir>   where the akcli venv lives / will be made
#   sh docs/research/2026-10-29-hi-boost-hairpin-fix/run.sh
set -e

W=$(cd "$(dirname "$0")" && pwd)
R=$(cd "$W/../../.." && pwd)
: "${SCRATCHPAD:?set SCRATCHPAD to the session scratchpad}"
AKCLI="$SCRATCHPAD/venv-akcli/bin/akcli"
KC=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
WORK="$SCRATCHPAD/hairpin-run"
SRC="$R/docs/research/2026-10-29-hi-boost-full-run/hi-boost-hybrid.kicad_sch"

if [ ! -x "$AKCLI" ]; then
    python3 -m venv "$SCRATCHPAD/venv-akcli"
    "$SCRATCHPAD/venv-akcli/bin/pip" -q install 'akcli-kicad==0.22.0'
fi
"$AKCLI" doctor || true

# THE BEFORE AND THE AFTER ARE RENDERED FROM THE SAME FILE NAME, in two
# directories carrying the same project file. Two reasons, and the second is
# not in any earlier record:
#
#  1. the render depends on the `.kicad_pro` beside the sheet - a generated
#     project with `intersheets_ref_show: true` draws `[1]` beside every global
#     label, and an earlier run's first before/after pair differed by that
#     rather than by the sheet;
#  2. KICAD'S TITLE BLOCK PRINTS THE SHEET'S FILE NAME. Rendering the two sides
#     as `before.kicad_sch` and `pultec-hi-boost.kicad_sch` in one directory
#     put `File: before.kicad_sch` against `File: pultec-hi-boost.kicad_sch` in
#     the corner, and a pixel diff of the two pages then showed a second band
#     of change 120 mm away from anything this repair touched. Same name, same
#     project, different directory.
rm -rf "$WORK"
mkdir -p "$WORK/before" "$WORK/after"
for d in before after; do
    cp "$R/build/schgen-boards/pultec-hi-boost/pultec-hi-boost.kicad_pro" "$WORK/$d/"
    cp "$R/build/schgen-boards/pultec-hi-boost/sym-lib-table" "$WORK/$d/"
    python3 - "$WORK/$d/pultec-hi-boost.kicad_pro" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
d.setdefault("schematic", {}).setdefault("drawing", {})["intersheets_ref_show"] = False
json.dump(d, open(p, "w"), indent=2)
PY
    cp "$SRC" "$WORK/$d/pultec-hi-boost.kicad_sch"
done
echo "intersheets_ref_show = False in both project files"

A="$WORK/after/pultec-hi-boost.kicad_sch"
B="$WORK/before/pultec-hi-boost.kicad_sch"

# PRE-pass: the two global labels, which akcli has no op for. It runs BEFORE
# the ops so that akcli's own connectivity check sees the finished state.
python3 "$W/scripts/move_labels.py" "$A"

# The ops. --apply IS NOT OPTIONAL: without it akcli exits 0 having written
# nothing, and every before/after comparison afterwards then reports no change
# because there was none. The sha printed either side is what proves it wrote.
python3 "$W/scripts/make_repairs.py" "$B" "$W/repairs.json"
echo "sha before apply: $(shasum -a 256 "$A" | cut -d' ' -f1)"
"$AKCLI" plan --ops "$W/repairs.json" "$A" | tail -6
"$AKCLI" draw --apply --ops "$W/repairs.json" "$A" | tail -3
echo "sha after apply:  $(shasum -a 256 "$A" | cut -d' ' -f1)"

# POST-pass: strokes and symbol fields, which akcli has no op for.
python3 "$W/scripts/restyle.py" "$A"

cp "$A" "$W/hi-boost-hairpin-fixed.kicad_sch"

for d in before after; do
    "$KC" sch export pdf -o "$WORK/$d/page.pdf" \
        "$WORK/$d/pultec-hi-boost.kicad_sch" >/dev/null 2>&1
    magick -density 200 "$WORK/$d/page.pdf" -background white -alpha remove \
        "$WORK/$d/page.png"
done
"$KC" sch export svg -o "$WORK/after" "$A" >/dev/null 2>&1

cp "$WORK/after/page.pdf" "$W/hi-boost-hairpin-fixed.pdf"
cp "$WORK/after/page.png" "$W/hi-boost-hairpin-fixed.png"
cp "$WORK/after/pultec-hi-boost.svg" "$W/hi-boost-hairpin-fixed.svg"

mkdir -p "$W/crops"
python3 "$W/scripts/crop.py" "$B" "$W/crops/before"
python3 "$W/scripts/crop.py" "$A" "$W/crops/after"
rm -f "$W/crops/before.pdf" "$W/crops/after.pdf" \
      "$W/crops/before.png" "$W/crops/after.png"

python3 "$W/scripts/verify.py" "$B" "BEFORE - the accepted page, as committed" \
    > "$W/verify-before.txt"
python3 "$W/scripts/verify.py" "$A" "AFTER - the Lo boost group redrawn" \
    > "$W/verify-after.txt"
python3 "$W/scripts/boxgeom.py" "$B" > "$W/boxes-before.txt"
python3 "$W/scripts/boxgeom.py" "$A" > "$W/boxes-after.txt"
python3 "$W/scripts/netcmp.py" "$B" "$A" > "$W/netcmp.txt"
"$SCRATCHPAD/venv-akcli/bin/python" "$W/scripts/pixeldiff.py" \
    "$WORK/before/page.png" "$WORK/after/page.png" > "$W/pixeldiff.txt"

echo "--- sha256"
shasum -a 256 "$W/hi-boost-hairpin-fixed.kicad_sch"
tail -3 "$W/netcmp.txt"
cat "$W/pixeldiff.txt"
