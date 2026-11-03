#!/bin/sh
# The verification set for <dir>/staged-board.kicad_sch: sha256, parenthesis
# depth, the kicad-cli netlist export against the staged board's model
# (partition, values, footprints), ERC, the draughting/measure suite (selftest
# first), and the counts table.
#
# EVERY STEP FAILS LOUDLY. The export and the ERC report are written into a
# fresh temporary directory, never read from a previous run; kicad-cli's exit
# status is checked and each output must exist and be non-empty before it is
# read. A step that cannot run stops the script non-zero, naming the step, so a
# skipped check can never print a result that looks like a pass.
#
# usage: sh verify.sh <dir>
set -eu
set -o pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../../.." && pwd)"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
m="$root/draughting/measure"

fail() {
  echo "verify.sh: FAILED - $1" >&2
  exit 1
}

[ "$#" -eq 1 ] || fail "expected one argument, the directory holding staged-board.kicad_sch; got $#"
[ -d "$1" ] || fail "$1 is not a directory"
dir="$(cd "$1" && pwd)"
sch="$dir/staged-board.kicad_sch"
[ -s "$sch" ] || fail "$sch does not exist or is empty - nothing to verify"
[ -x "$kc" ] || fail "kicad-cli not found at $kc"

out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

echo "== sha256"; shasum -a 256 "$sch"
echo "== parenthesis depth"
python3 "$here/depth.py" "$sch" || fail "parenthesis depth is not 0 (or depth.py could not run)"

echo "== netlist vs model"
"$kc" sch export netlist --format kicadsexpr -o "$out/export.net" "$sch" >/dev/null \
  || fail "kicad-cli sch export netlist exited non-zero on $sch"
[ -s "$out/export.net" ] || fail "kicad-cli wrote no netlist export for $sch"
(cd "$root" && bun "$here/netcompare.ts" "$out/export.net") \
  || fail "the netlist export disagrees with the model (differences listed above), or netcompare.ts could not run"

echo "== ERC"
"$kc" sch erc --format json --severity-all -o "$out/erc.json" "$sch" >/dev/null \
  || fail "kicad-cli sch erc exited non-zero on $sch"
[ -s "$out/erc.json" ] || fail "kicad-cli wrote no ERC report for $sch"
python3 "$here/erc_counts.py" "$out/erc.json" || fail "erc_counts.py could not read the ERC report"

echo "== selftest"; python3 "$m/selftest.py" | tail -1
echo "== crossings"; python3 "$m/crossings.py" "$sch" | tail -6
echo "== junction audit"; python3 "$m/junction_audit.py" "$sch" | tail -8
echo "== label survey"; python3 "$m/label_survey.py" "$sch" | tail -4
echo "== paper fit"; python3 "$m/paper_fit.py" "$sch" | tail -3
echo "== counts"; python3 "$here/counts.py" "$sch"
echo "verify.sh: every step ran"
