#!/bin/sh
# The verification set for one h7-carrier sheet: sha256, parenthesis depth, the kicad-cli netlist
# export against the carrier's model (compareSheetToModel's six lists), ERC, the
# draughting/measure suite (selftest first), paper fit, and the counts table.
#
# EVERY STEP FAILS LOUDLY. The export and the ERC report are written into a fresh temporary
# directory, never read from a previous run; kicad-cli's exit status is checked and each output
# must exist and be non-empty before it is read. A step that cannot run stops the script non-zero,
# naming the step, so a skipped check can never print a result that looks like a pass.
#
# usage: sh verify.sh <sheet.kicad_sch>
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

[ "$#" -eq 1 ] || fail "expected one argument, the sheet to verify; got $#"
[ -s "$1" ] || fail "$1 does not exist or is empty - nothing to verify"
sch="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
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
(cd "$root" && bun "$here/netcompare.ts" "$out/export.net") \
  || fail "the netlist export disagrees with the model on a component, a net or a pin (listed above)"

echo "== ERC"
"$kc" sch erc --format json --severity-all -o "$out/erc.json" "$sch" >/dev/null 2>"$out/kc.err" \
  || { quiet "$out/kc.err"; fail "kicad-cli sch erc exited non-zero on $sch"; }
quiet "$out/kc.err"
[ -s "$out/erc.json" ] || fail "kicad-cli wrote no ERC report for $sch"
python3 "$here/erc_counts.py" "$out/erc.json" || fail "erc_counts.py could not read the ERC report"

echo "== selftest"; python3 "$m/selftest.py" | tail -1
echo "== crossings"; python3 "$m/crossings.py" "$sch" | tail -3
echo "== junction audit"; python3 "$m/junction_audit.py" "$sch" | tail -7
echo "== label survey"; python3 "$m/label_survey.py" "$sch" | head -1
echo "== paper fit"; python3 "$m/paper_fit.py" "$sch" | tail -3
echo "== counts"; python3 "$here/counts.py" "$sch"
echo "verify.sh: every step ran"
