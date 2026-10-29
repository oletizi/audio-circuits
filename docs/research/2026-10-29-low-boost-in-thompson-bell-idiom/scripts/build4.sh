#!/bin/zsh
set -e
W=/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/itb-layout
AK=$W/venv/bin/akcli
KC=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
SCH=$W/low-boost-itb-v4.kicad_sch
rm -f "$SCH"
"$AK" new "$SCH" --paper A4 --title "pultec-low-boost" --force
"$AK" draw "$SCH" --apply --ops "$W/ops-v4.json" 2>&1 | tail -8
python3 "$W/fields-v4.py" "$SCH"
echo "=== layout+erc+nets lint"
"$AK" check "$SCH" --layout --erc --nets --fail-on never 2>&1 | tail -40
echo "=== kicad-cli erc"
"$KC" sch erc --output "$W/erc-v4.rpt" --exit-code-violations "$SCH" 2>&1 | grep -v Fontconfig | tail -3 || true
echo "=== netlist"
"$KC" sch export netlist --format kicadxml --output "$W/netlist-v4.xml" "$SCH" 2>&1 | grep -v Fontconfig | tail -2
python3 "$W/compare.py" "$W/netlist-v4.xml"
echo "=== crossings"
python3 "$W/crossings.py" "$SCH"
echo "=== pdf/png"
"$KC" sch export pdf --output "$W/low-boost-itb-v4.pdf" "$SCH" 2>&1 | grep -v Fontconfig | tail -1
/usr/bin/sips -s format png --resampleWidth 3000 "$W/low-boost-itb-v4.pdf" --out "$W/low-boost-itb-v4.png" >/dev/null 2>&1
/usr/bin/sips -s format png --resampleWidth 8000 "$W/low-boost-itb-v4.pdf" --out "$W/hi-v4.png" >/dev/null 2>&1
echo done
