#!/bin/sh
# Rebuild the pultec-hi-cut page from committed inputs.
#
# Idempotent: it always starts from the committed baseline draft
# (baseline-copperhead-v4-blocks-mid-late.kicad_sch), so re-running it
# re-derives the same final sheet rather than applying the repairs twice.
#
# It needs akcli, kicad-cli and ImageMagick. It does NOT need copperhead - the
# drafting step is scripts/../draft.py and its output is committed beside this
# file. Run draft.py only to re-derive the baseline from base.intent.json.
#
#   SCRATCHPAD=<dir>   where the akcli venv lives / will be made
#   sh docs/research/2026-10-29-hi-cut-full-run/run.sh
set -e

W=$(cd "$(dirname "$0")" && pwd)
R=$(cd "$W/../../.." && pwd)
: "${SCRATCHPAD:?set SCRATCHPAD to the session scratchpad}"
VENV="$SCRATCHPAD/venv-akcli"
AKCLI="$VENV/bin/akcli"
KC=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
WORK="$SCRATCHPAD/hi-cut-repair"
SRC="$W/baseline-copperhead-v4-blocks-mid-late.kicad_sch"

if [ ! -x "$AKCLI" ]; then
    python3 -m venv "$VENV"
    "$VENV/bin/pip" -q install 'akcli-kicad==0.22.0' numpy pillow
fi
"$AKCLI" doctor || true
"$AKCLI" --version

# THE BEFORE AND THE AFTER ARE RENDERED FROM THE SAME FILE NAME, in two sibling
# directories carrying identical project files. Two reasons:
#
#  1. the render depends on the `.kicad_pro` beside the sheet - a generated
#     project with `intersheets_ref_show: true` draws `[1]` beside every global
#     label, and an earlier run's first before/after pair differed by that
#     rather than by the sheet;
#  2. KICAD'S TITLE BLOCK PRINTS THE SHEET'S FILE NAME, so two names in one
#     directory puts a spurious difference band in the page corner.
rm -rf "$WORK"
mkdir -p "$WORK/before" "$WORK/after"
for d in before after; do
    cp "$R/build/schgen-boards/pultec-hi-cut/pultec-hi-cut.kicad_pro" "$WORK/$d/"
    cp "$R/build/schgen-boards/pultec-hi-cut/sym-lib-table" "$WORK/$d/"
    python3 "$W/scripts/project_flags.py" "$WORK/$d/pultec-hi-cut.kicad_pro"
    cp "$SRC" "$WORK/$d/pultec-hi-cut.kicad_sch"
done

A="$WORK/after/pultec-hi-cut.kicad_sch"
B="$WORK/before/pultec-hi-cut.kicad_sch"

# The ops. --apply IS NOT OPTIONAL: without it akcli exits 0 having written
# nothing, and every before/after comparison afterwards then reports no change
# because there was none. The sha printed either side is what proves it wrote.
python3 "$W/scripts/make_repairs.py" "$B" "$W/repairs.json"
echo "sha before apply: $(shasum -a 256 "$A" | cut -d' ' -f1)"
"$AKCLI" plan --ops "$W/repairs.json" "$A" | tail -8
"$AKCLI" draw --apply --ops "$W/repairs.json" "$A" | tail -4
echo "sha after apply:  $(shasum -a 256 "$A" | cut -d' ' -f1)"

# The literal text pass: strokes, label styling, symbol fields and the two
# group rectangles, none of which akcli 0.22.0 has an operation for.
python3 "$W/scripts/restyle.py" "$A"

cp "$A" "$W/hi-cut-hybrid.kicad_sch"

for d in before after; do
    "$KC" sch export pdf -o "$WORK/$d/page.pdf" \
        "$WORK/$d/pultec-hi-cut.kicad_sch" >/dev/null 2>&1
    magick -density 200 "$WORK/$d/page.pdf" -background white -alpha remove \
        "$WORK/$d/page.png"
done
"$KC" sch export svg -o "$WORK/after" "$A" >/dev/null 2>&1

cp "$WORK/before/page.pdf" "$W/baseline-copperhead-v4-blocks-mid-late.pdf"
cp "$WORK/before/page.png" "$W/baseline-copperhead-v4-blocks-mid-late.png"
cp "$WORK/after/page.pdf" "$W/hi-cut-hybrid.pdf"
cp "$WORK/after/page.png" "$W/hi-cut-hybrid.png"
cp "$WORK/after/pultec-hi-cut.svg" "$W/hi-cut-hybrid.svg"

mkdir -p "$W/crops"
python3 "$W/scripts/crop.py" "$B" "$W/crops/before"
python3 "$W/scripts/crop.py" "$A" "$W/crops/after"
rm -f "$W/crops/before.pdf" "$W/crops/after.pdf"

python3 "$W/scripts/verify.py" "$B" "BEFORE - copperhead draft v4-blocks-mid-late" \
    > "$W/verify-before.txt"
python3 "$W/scripts/verify.py" "$A" "AFTER - the repaired page" \
    > "$W/verify-after.txt"
python3 "$W/scripts/boxgeom.py" "$B" > "$W/boxes-before.txt"
python3 "$W/scripts/boxgeom.py" "$A" > "$W/boxes-after.txt"
python3 "$W/scripts/netcmp.py" "$B" "$A" > "$W/netcmp.txt"
python3 "$W/scripts/junction_audit.py" "$B" > "$W/junctions-before.txt"
python3 "$W/scripts/junction_audit.py" "$A" > "$W/junctions-after.txt"
python3 "$W/scripts/colour_check.py" "$A" > "$W/colours-after.txt" || true
python3 "$W/scripts/pwr_survey.py" "$A" > "$W/power-after.txt" || true
"$AKCLI" check --layout "$A" > "$W/akcli-check-after.txt" 2>&1 || true
"$AKCLI" check --layout "$B" > "$W/akcli-check-before.txt" 2>&1 || true
"$VENV/bin/python" "$W/scripts/pixeldiff.py" \
    "$WORK/before/page.png" "$WORK/after/page.png" > "$W/pixeldiff.txt"

echo "--- sha256"
shasum -a 256 "$W/hi-cut-hybrid.kicad_sch"
tail -4 "$W/netcmp.txt"
cat "$W/pixeldiff.txt"
