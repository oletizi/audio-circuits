#!/bin/zsh
set -e
W=/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/itb-layout
AK=$W/venv/bin/akcli
KC=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
V=$1
SCH=$W/low-boost-itb-$V.kicad_sch
rm -f "$SCH"
"$AK" new "$SCH" --paper A3 --title "pultec-low-boost" --force
"$AK" draw "$SCH" --apply --ops "$W/ops-$V.json" 2>&1 | tail -8
if [ -f "$W/place_fields.py" ] && [ "$V" != "v1" ]; then
  python3 "$W/place_fields.py" "$SCH"
fi
echo "=== layout+erc lint"
"$AK" check "$SCH" --layout --erc --nets --fail-on never 2>&1 | tail -60
echo "=== kicad-cli erc"
"$KC" sch erc --output "$W/erc-$V.rpt" --exit-code-violations "$SCH" 2>&1 | grep -v Fontconfig | tail -5 || true
echo "=== netlist"
"$KC" sch export netlist --format kicadxml --output "$W/netlist-$V.xml" "$SCH" 2>&1 | grep -v Fontconfig | tail -3
python3 "$W/compare.py" "$W/netlist-$V.xml"
echo "=== pdf"
"$KC" sch export pdf --output "$W/low-boost-itb-$V.pdf" "$SCH" 2>&1 | grep -v Fontconfig | tail -2
/usr/bin/sips -s format png --resampleWidth 3000 "$W/low-boost-itb-$V.pdf" --out "$W/low-boost-itb-$V.png" >/dev/null 2>&1
/usr/bin/sips -s format png --resampleWidth 8000 "$W/low-boost-itb-$V.pdf" --out "$W/hi-$V.png" >/dev/null 2>&1
echo done
