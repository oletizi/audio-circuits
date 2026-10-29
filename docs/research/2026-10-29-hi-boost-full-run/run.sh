#!/bin/sh
# Rebuild the pultec-hi-boost page from the committed copperhead draft.
#
# Idempotent: it always starts from the committed baseline sheet, so re-running
# it re-derives the same final sheet rather than applying the repairs twice.
#
#   SCRATCHPAD=<dir holding trial-lcapy-copperhead/ and hybrid-pass-1/venv-akcli>
#   sh docs/research/2026-10-29-hi-boost-full-run/run.sh
set -e

W=$(cd "$(dirname "$0")" && pwd)
R=$(cd "$W/../../.." && pwd)
: "${SCRATCHPAD:?set SCRATCHPAD to the session scratchpad}"
AKCLI="$SCRATCHPAD/hybrid-pass-1/venv-akcli/bin/akcli"
KC=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
WORK="$SCRATCHPAD/hi-boost-run/work"

mkdir -p "$WORK"
cp "$R/build/schgen-boards/pultec-hi-boost/pultec-hi-boost.kicad_pro" "$WORK/"
cp "$R/build/schgen-boards/pultec-hi-boost/sym-lib-table" "$WORK/"
# A one-sheet page has no other sheet to point at, so the [1] intersheet
# reference KiCad draws beside every global label is a device that earns
# nothing. The generated project turns it on; copperhead's own board directory
# has no project at all, which is why the draft rendered without it. Both
# renders in this run are therefore made with it OFF, so the before/after pair
# differs by the sheet and not by the project beside it.
python3 - "$WORK/pultec-hi-boost.kicad_pro" <<'PY'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
d.setdefault("schematic", {}).setdefault("drawing", {})["intersheets_ref_show"] = False
json.dump(d, open(p, "w"), indent=2)
print("intersheets_ref_show = False")
PY

cp "$W/baseline-copperhead-v2-blocks-own-last.kicad_sch" "$WORK/pultec-hi-boost.kicad_sch"

python3 "$W/scripts/make_repairs.py" \
    "$W/baseline-copperhead-v2-blocks-own-last.kicad_sch" "$W/repairs-pass1.json"
"$AKCLI" draw --apply --ops "$W/repairs-pass1.json" \
    "$WORK/pultec-hi-boost.kicad_sch" | tail -4
python3 "$W/scripts/restyle_fields.py" "$WORK/pultec-hi-boost.kicad_sch"

cp "$WORK/pultec-hi-boost.kicad_sch" "$W/hi-boost-hybrid.kicad_sch"

# Both renders from the same directory, same project, same KiCad.
cp "$W/baseline-copperhead-v2-blocks-own-last.kicad_sch" "$WORK/before.kicad_sch"
for n in before pultec-hi-boost; do
    "$KC" sch export pdf -o "$WORK/$n.pdf" "$WORK/$n.kicad_sch" >/dev/null 2>&1
    magick -density 200 "$WORK/$n.pdf" -background white -alpha remove "$WORK/$n.png"
done
"$KC" sch export svg -o "$WORK" "$WORK/pultec-hi-boost.kicad_sch" >/dev/null 2>&1

cp "$WORK/before.pdf" "$W/baseline-copperhead-v2-blocks-own-last.pdf"
cp "$WORK/before.png" "$W/baseline-copperhead-v2-blocks-own-last.png"
cp "$WORK/pultec-hi-boost.pdf" "$W/hi-boost-hybrid.pdf"
cp "$WORK/pultec-hi-boost.png" "$W/hi-boost-hybrid.png"
cp "$WORK/pultec-hi-boost.svg" "$W/hi-boost-hybrid.svg"

echo "--- sha256"
shasum -a 256 "$W/hi-boost-hybrid.kicad_sch"
