#!/bin/sh
# The verification set for one h7-module BLOCK sheet: sha256, parenthesis depth, the kicad-cli
# netlist export against that block's part of the module model (block-netcompare.ts,
# compareSheetToModel's six lists), ERC, the draughting/measure suite (selftest first), paper fit,
# and the counts table. Copied from the h7-carrier's repair/verify.sh; what changed is the block
# argument and the comparison, which covers only the block's components.
#
# EVERY STEP FAILS LOUDLY. The export and the ERC report are written into a fresh temporary
# directory, never read from a previous run; kicad-cli's exit status is checked and each output
# must exist and be non-empty before it is read. A step that cannot run stops the script non-zero,
# naming the step, so a skipped check can never print a result that looks like a pass.
#
# usage: sh verify.sh <block> <sheet.kicad_sch>
set -eu
set -o pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../../../.." && pwd)"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
m="$root/draughting/measure"

fail() {
  echo "verify.sh: FAILED - $1" >&2
  exit 1
}

[ "$#" -eq 2 ] || fail "expected two arguments, the block and the sheet to verify; got $#"
block="$1"
[ -s "$2" ] || fail "$2 does not exist or is empty - nothing to verify"
sch="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
[ -x "$kc" ] || fail "kicad-cli not found at $kc"

# kicad-cli's stderr, minus the Fontconfig configuration warnings this machine prints on every run.
quiet() {
  grep -v '^Fontconfig warning' "$1" >&2 || true
}

out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

echo "== sha256"; shasum -a 256 "$sch"
echo "== parenthesis depth"
python3 "$here/depth.py" "$sch" || fail "parenthesis depth is not 0 (or depth.py could not run)"

echo "== netlist vs model"
"$kc" sch export netlist --format kicadsexpr -o "$out/export.net" "$sch" >/dev/null 2>"$out/kc.err" \
  || { quiet "$out/kc.err"; fail "kicad-cli sch export netlist exited non-zero on $sch"; }
quiet "$out/kc.err"
[ -s "$out/export.net" ] || fail "kicad-cli wrote no netlist export for $sch"
(cd "$root" && bun "$here/block-netcompare.ts" "$block" "$out/export.net") \
  || fail "the netlist export disagrees with the model on a component, a net, a pin or a value (listed above)"

echo "== ERC"
"$kc" sch erc --format json --severity-all -o "$out/erc.json" "$sch" >/dev/null 2>"$out/kc.err" \
  || { quiet "$out/kc.err"; fail "kicad-cli sch erc exited non-zero on $sch"; }
quiet "$out/kc.err"
[ -s "$out/erc.json" ] || fail "kicad-cli wrote no ERC report for $sch"
python3 "$here/erc_counts.py" "$out/erc.json" || fail "erc_counts.py could not read the ERC report"

# The same sheet under a root holding only it (one-block-root.ts): each hierarchical label meets a
# sheet pin, as under the module's real root, so the sheet-alone run's pin_not_connected errors on
# the hierarchical labels ("non-existent parent sheet") do not arise. Reported per
# sheet: the block's own is /<block>/; the root / holds the stubs, whose labels dangle with one block.
echo "== ERC under a one-block root"
ctx="$out/ctx"
mkdir "$ctx"
cp "$sch" "$ctx/$block.kicad_sch"
(cd "$root" && bun "$here/one-block-root.ts" "$block" "$ctx") || fail "one-block-root.ts could not write the root"
log="$("$root/draughting/venv-akcli/bin/akcli" draw "$ctx/one-block-root.kicad_sch" --ops "$ctx/one-block-root.json" --apply 2>&1)" \
  || { echo "$log" >&2; fail "akcli could not apply the one-block root's op-list"; }
echo "$log" | grep -q 'status: APPLIED' || { echo "$log" >&2; fail "akcli did not report APPLIED for the one-block root"; }
"$kc" sch erc --format json --severity-all -o "$ctx/erc.json" "$ctx/one-block-root.kicad_sch" >/dev/null 2>"$out/kc.err" \
  || { quiet "$out/kc.err"; fail "kicad-cli sch erc exited non-zero on the one-block root"; }
quiet "$out/kc.err"
[ -s "$ctx/erc.json" ] || fail "kicad-cli wrote no ERC report for the one-block root"
python3 "$here/erc_sheets.py" "$ctx/erc.json" || fail "erc_sheets.py could not read the one-block root's ERC report"

echo "== selftest"; python3 "$m/selftest.py" | tail -1
echo "== crossings"; python3 "$m/crossings.py" "$sch" | tail -3
# The summary lines only: the carrier's `tail -7` cut them off on a sheet that lists collinear pairs.
echo "== junction audit"; python3 "$m/junction_audit.py" "$sch" | grep -E '^(wires|ORPHAN|WIRE-TO-WIRE|COLLINEAR|PINS ON)'
echo "== label survey"; python3 "$m/label_survey.py" "$sch" | head -1
echo "== paper fit"; python3 "$m/paper_fit.py" "$sch" | tail -3
echo "== counts"; python3 "$here/counts.py" "$sch"
echo "verify.sh: every step ran"
