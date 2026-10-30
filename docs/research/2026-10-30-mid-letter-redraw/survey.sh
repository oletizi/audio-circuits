#!/bin/sh
# Does each committed drafted page fit inside the US Letter frame?
#
# RUN THE TOOL; DO NOT QUOTE THIS FILE. It prints no answer of its own - every
# figure comes from scripts/extent.py against the frame scripts/framegeom.py
# measured, so a page that changes changes the answer.
#
# The frame is the rectangle inside the inner border AND clear of the title
# block, which is a CORNER and not a band: 255.397 x 159.851 mm. Pass
# --frame 11.980 11.980 267.377 203.877 instead to ignore the title block.
#
#   sh docs/research/2026-10-30-mid-letter-redraw/survey.sh
set -e
W=$(cd "$(dirname "$0")" && pwd)
R=$(cd "$W/../../.." && pwd)

printf '%-18s %-9s %10s %10s %10s %10s  %s\n' \
    board paper width height "east slack" "south slack" fits
for d in "$R"/drafted/pultec/*/; do
    f=$(ls "$d"*.kicad_sch 2>/dev/null | head -1) || continue
    [ -n "$f" ] || continue
    python3 "$W/scripts/extent.py" "$f" \
        --frame 11.980 11.980 267.377 171.831 \
    | awk -v b="$(basename "$d")" '
        /^paper/         { p = $2 }
        /mm wide$/       { if (w == "") w = $7 }
        /mm tall$/       { if (h == "") h = $6 }
        /^ *slack/       { if (e == "") { e = $5; s = $9 } }
        /FITS/           { if (!done) {
                        printf "%-18s %-9s %10s %10s %10s %10s  %s\n",
                               b, p, w, h, e, s, $NF; done = 1 } }'
done
