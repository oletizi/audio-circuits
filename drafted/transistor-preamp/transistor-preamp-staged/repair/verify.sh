#!/bin/sh
# The verification set for <dir>/staged-board.kicad_sch: sha256, parenthesis
# depth, the kicad-cli netlist export against the staged board's model
# (partition, values, footprints), ERC, the draughting/measure suite (selftest
# first), and the counts table. Writes export.net and erc.json into <dir>.
#
# usage: sh verify.sh <dir>
set -u
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../../.." && pwd)"
dir="$(cd "$1" && pwd)"
sch="$dir/staged-board.kicad_sch"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
m="$root/draughting/measure"

echo "== sha256"; shasum -a 256 "$sch"
echo "== parenthesis depth"; python3 "$here/depth.py" "$sch"
echo "== netlist vs model"
"$kc" sch export netlist --format kicadsexpr -o "$dir/export.net" "$sch" >/dev/null 2>&1
(cd "$root" && bun "$here/netcompare.ts" "$dir/export.net")
echo "== ERC"
"$kc" sch erc --format json --severity-all -o "$dir/erc.json" "$sch" >/dev/null 2>&1
python3 "$here/erc_counts.py" "$dir/erc.json"
echo "== selftest"; python3 "$m/selftest.py" 2>&1 | tail -1
echo "== crossings"; python3 "$m/crossings.py" "$sch" 2>&1 | tail -6
echo "== junction audit"; python3 "$m/junction_audit.py" "$sch" 2>&1 | tail -8
echo "== label survey"; python3 "$m/label_survey.py" "$sch" 2>&1 | tail -4
echo "== paper fit"; python3 "$m/paper_fit.py" "$sch" 2>&1 | tail -3
echo "== counts"; python3 "$here/counts.py" "$sch"
