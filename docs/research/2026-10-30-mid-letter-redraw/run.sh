#!/bin/sh
# Rebuild the US Letter pultec-mid page from committed inputs.
#
# The INPUT is the committed, APPROVED A3 page, read-only:
#   drafted/pultec/pultec-mid/pultec-mid.generated-do-not-edit.kicad_sch
#   sha256 1f8de32150f322f8f040b2cef1d857df7b16e884bff409a0debd5ec3a7344ff8
# Nothing under drafted/ is written. The approved page stays exactly as it is.
#
# There is NO DRAFTING STEP. copperhead is not invoked, is not needed and could
# not help: it has no coordinate or orientation control and picks its own paper,
# and the arrangement this page needs is a specific fold onto a specific frame.
# TOOLING.md step 1: the draft step is skipped when the starting point is an
# existing page.
#
# Idempotent: it always starts from the committed approved sheet, so re-running
# re-derives the same final sheet rather than applying the transform twice.
#
#   SCRATCHPAD=<dir>   where the akcli venv lives / will be made
#   sh docs/research/2026-10-30-mid-letter-redraw/run.sh
set -e

W=$(cd "$(dirname "$0")" && pwd)
R=$(cd "$W/../../.." && pwd)
M="$R/docs/research/2026-10-29-mid-full-run/scripts"
: "${SCRATCHPAD:?set SCRATCHPAD to the session scratchpad}"
VENV="$SCRATCHPAD/venv-akcli"
AKCLI="$VENV/bin/akcli"
KC=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
WORK="$SCRATCHPAD/mid-letter-run"
SRC="$R/drafted/pultec/pultec-mid/pultec-mid.generated-do-not-edit.kicad_sch"

if [ ! -x "$AKCLI" ]; then
    python3 -m venv "$VENV"
    "$VENV/bin/pip" -q install 'akcli-kicad==0.22.0' numpy pillow
fi
"$AKCLI" doctor || true
"$AKCLI" --version
PY="$VENV/bin/python"

echo "--- the input, verified before anything reads it"
echo "1f8de32150f322f8f040b2cef1d857df7b16e884bff409a0debd5ec3a7344ff8  $SRC" \
    | shasum -a 256 -c -

rm -rf "$WORK"
mkdir -p "$WORK/before" "$WORK/after"

# THE BEFORE AND THE AFTER ARE RENDERED FROM THE SAME FILE NAME in two sibling
# directories carrying identical project files, because the render depends on
# the `.kicad_pro` beside the sheet and KiCad's title block prints the sheet's
# file name.
#
# WHAT THAT REMEDY CANNOT DO HERE: the two sheets are different PAPER SIZES, so
# the renders are 420x297 mm and 279.4x215.9 mm and no pixel diff between them
# means anything. This run reports NO pixel diff and no difference bands, and
# says so rather than producing a number that cannot be read.
for d in before after; do
    cp "$R/build/schgen-boards/pultec-mid/pultec-mid.kicad_pro" "$WORK/$d/"
    cp "$R/build/schgen-boards/pultec-mid/sym-lib-table" "$WORK/$d/"
    python3 "$M/project_flags.py" "$WORK/$d/pultec-mid.kicad_pro"
done
cp "$SRC" "$WORK/before/pultec-mid.kicad_sch"

B="$WORK/before/pultec-mid.kicad_sch"
A="$WORK/after/pultec-mid.kicad_sch"

echo "--- 1. the rigid translation of the whole page, and the paper"
python3 "$W/scripts/translate.py" "$B" "$A" -40.64 -34.29 USLetter

echo "--- 2. the arrangement's own proofs, before a single op is emitted"
python3 "$W/scripts/arrangement.py"

echo "--- 3. the ops. --apply IS NOT OPTIONAL: without it akcli exits 0 having"
echo "       written nothing, and every comparison afterwards then reports no"
echo "       change because there was none. The sha either side is what proves it."
python3 "$W/scripts/make_repairs.py" "$A" "$W/repairs.json"
echo "sha before apply: $(shasum -a 256 "$A" | cut -d' ' -f1)"
"$AKCLI" plan --ops "$W/repairs.json" "$A" | tail -6
"$AKCLI" draw --apply --ops "$W/repairs.json" "$A" | tail -4
echo "sha after apply:  $(shasum -a 256 "$A" | cut -d' ' -f1)"

echo "--- 4. the literal pass: strokes, colours, label justify, 76 fields,"
echo "       the group rectangle and its heading"
python3 "$W/scripts/restyle.py" "$A"

cp "$A" "$W/pultec-mid-letter.kicad_sch"

echo "--- 5. render both sides"
for d in before after; do
    "$KC" sch export pdf -o "$WORK/$d/page.pdf" \
        "$WORK/$d/pultec-mid.kicad_sch" >/dev/null 2>&1
    magick -density 200 "$WORK/$d/page.pdf" -background white -alpha remove \
        "$WORK/$d/page.png"
done
"$KC" sch export svg -o "$WORK/after" "$A" >/dev/null 2>&1
cp "$WORK/after/page.pdf" "$W/pultec-mid-letter.pdf"
cp "$WORK/after/page.png" "$W/pultec-mid-letter.png"
cp "$WORK/after/pultec-mid.svg" "$W/pultec-mid-letter.svg"
cp "$WORK/before/page.png" "$W/approved-a3.png"

mkdir -p "$W/crops"
echo "--- 6. crops, one box per side per region"
python3 "$W/scripts/crop.py" "$B" before "$W/crops/before"
python3 "$W/scripts/crop.py" "$A" after "$W/crops/after"

echo "--- 7. the frame, measured on this kicad-cli rather than looked up"
"$PY" "$W/scripts/framegeom.py" USLetter --work "$WORK/frame-letter" \
    > "$W/frame-letter.txt"
"$PY" "$W/scripts/framegeom.py" A3 --work "$WORK/frame-a3" \
    > "$W/frame-a3.txt"
tail -12 "$W/frame-letter.txt"

echo "--- 8. the headline: content extent against the frame"
python3 "$W/scripts/extent.py" "$B" --control \
    --frame 11.980 11.980 407.966 252.942 > "$W/extent-before.txt"
python3 "$W/scripts/extent.py" "$A" --control \
    --frame 11.980 11.980 267.377 171.831 > "$W/extent-after.txt"
cat "$W/extent-after.txt"

echo "--- 9. the five groups this run did not re-lay are a RIGID TRANSLATION"
python3 "$W/scripts/bandcheck.py" "$B" "$A" -40.64 -34.29 68.0 \
    | tee "$W/bandcheck.txt"

echo "--- 9b. the verification set"
python3 "$M/verify.py" "$B" "BEFORE - the approved A3 page" > "$W/verify-before.txt"
python3 "$M/verify.py" "$A" "AFTER - the Letter page"       > "$W/verify-after.txt"
python3 "$M/symbols.py" "$B" > "$W/symbols-before.txt"
python3 "$M/symbols.py" "$A" > "$W/symbols-after.txt"
python3 "$M/boxgeom.py"  "$B" > "$W/boxes-before.txt"
python3 "$M/boxgeom.py"  "$A" > "$W/boxes-after.txt"
python3 "$M/netcmp.py"   "$B" "$A" > "$W/netcmp.txt"
python3 "$M/junction_audit.py" "$B" > "$W/junctions-before.txt"
python3 "$M/junction_audit.py" "$A" > "$W/junctions-after.txt"
python3 "$M/label_survey.py" "$A" > "$W/labels-after.txt"
python3 "$M/colour_check.py" "$A" > "$W/colours-after.txt" || true
python3 "$M/pwr_survey.py"   "$A" > "$W/power-after.txt"   || true
"$AKCLI" check --layout "$B" > "$W/akcli-check-before.txt" 2>&1 || true
"$AKCLI" check --layout "$A" > "$W/akcli-check-after.txt"  2>&1 || true

# The exact invocation, because an unreproducible zero is indistinguishable from
# a check that was never run. Errors and warnings are counted SEPARATELY, off
# the report's own `; error` / `; warning` markers - `grep -c Violation` reads 0
# on both sides of this report and would have been a check that cannot fail.
echo "--- 10. ERC, with the exact invocation recorded, plus the control"
for d in before after; do
    "$KC" sch erc --exit-code-violations -o "$WORK/$d/erc.rpt" \
        "$WORK/$d/pultec-mid.kicad_sch" >/dev/null 2>&1 || true
    cp "$WORK/$d/erc.rpt" "$W/erc-$d.rpt"
done
# THE CONTROL: the same recipe against the committed, ACCEPTED low-cut page.
# Without it a difference between the two sides here cannot be told from a
# difference between boards.
cp "$R/docs/research/2026-10-29-low-cut-collapse-pass/low-cut-collapsed.kicad_sch" \
   "$WORK/before/erc-control.kicad_sch"
"$KC" sch erc --exit-code-violations -o "$W/erc-control-low-cut-accepted.rpt" \
    "$WORK/before/erc-control.kicad_sch" >/dev/null 2>&1 || true
for f in "$W/erc-before.rpt" "$W/erc-after.rpt" \
         "$W/erc-control-low-cut-accepted.rpt"; do
    printf '%-60s errors=%s warnings=%s\n' "$(basename "$f")" \
        "$(grep -c '; error' "$f" || true)" "$(grep -c '; warning' "$f" || true)"
done

echo "--- 11. the measurements that only the render has"
# The capacitor value ink, on BOTH sides: the pitch is derived from the widest
# one and `EVALUATING-DRAWINGS.md` P3 forbids taking the approved page's as given.
python3 "$W/scripts/makeboxes.py" "$B" "$WORK/boxes-ink-before.json" \
    "hi_boost_out tag:23.5,159.0,42.6,166.2,ink" \
    "CONTROL empty band:115.0,180.0,370.0,186.0,empty"
"$PY" "$W/scripts/inkmeasure.py" "$B" "$WORK/boxes-ink-before.json" \
    > "$W/ink-before.txt"
# The after side gets the fuller list: the value ink again, plus the tags
# against the group rectangle, the pin numbers beside the return labels, and
# the three unoccupied regions.
python3 "$W/scripts/maketightboxes.py" "$A" "$WORK/boxes-tight.json"
"$PY" "$W/scripts/inkmeasure.py" "$A" "$WORK/boxes-tight.json" \
    > "$W/ink-after.txt"
python3 "$W/scripts/makelabelboxes.py" "$WORK/boxes-labels.json"
"$PY" "$W/scripts/labelclear.py" "$A" "$WORK/boxes-labels.json" \
    > "$W/labelclear-after.txt"
tail -20 "$W/labelclear-after.txt"

echo "--- 12. the approved page is untouched"
echo "1f8de32150f322f8f040b2cef1d857df7b16e884bff409a0debd5ec3a7344ff8  $SRC" \
    | shasum -a 256 -c -

echo "--- sha256"
shasum -a 256 "$W/pultec-mid-letter.kicad_sch"
