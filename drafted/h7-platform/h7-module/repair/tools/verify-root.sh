#!/bin/sh
# The verification set for the h7-module ROOT: the assembled project, every sheet together, as it
# is committed (the root, its .kicad_pro and sym-lib-table, and the twelve block sheets). Task 7e.
#
#  1. sha256 of every sheet, and the root's parenthesis depth.
#  2. kicad-cli's export of the root against the WHOLE model (root-netcompare.ts).
#  3. exactly one PWR_FLAG per flagged net across the hierarchy, at its declared home, and no `#`
#     reference twice (hierarchy_flag_probe.py, hierarchy-flags.ts; ruling CR-MODULE-PWR-FLAGS).
#  4. every cross-page driver entry on its net with its real driver (root-drivers.ts; ruling
#     CR-MODULE-CROSS-PAGE-DRIVERS).
#  5. ERC on the root, every sheet, with the .kicad_pro's exclusions, judged by root_erc.py against
#     the declared allowances (erc-allowances.ts; ruling CR-MODULE-VCAP-ERC).
#  6. the draughting/measure suite on the root sheet, paper fit and counts. Reported, never judged.
#
# EVERY STEP FAILS LOUDLY, as verify.sh's do: outputs go to a fresh temporary directory, kicad-cli's
# exit status is checked, each output must exist and be non-empty. Steps 2 to 5 each record a
# failure and the script goes on, so one run names every failing check; it exits non-zero at the end
# when any did, naming them.
#
# usage: sh verify-root.sh [project-dir]      (default: the committed drafted/h7-platform/h7-module)
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../../../.." && pwd)"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
m="$root/draughting/measure"
board=h7-module
dir="$(cd "${1:-$here/../..}" && pwd)"
sch="$dir/$board.kicad_sch"

fail() {
  echo "verify-root.sh: FAILED - $1" >&2
  exit 1
}
quiet() {
  grep -v '^Fontconfig warning' "$1" >&2 || true
}

[ -s "$sch" ] || fail "$sch does not exist or is empty - nothing to verify"
[ -s "$dir/$board.kicad_pro" ] || fail "$dir/$board.kicad_pro does not exist - the root's ERC exclusion lives there"
[ -x "$kc" ] || fail "kicad-cli not found at $kc"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT
failed=""

echo "== sha256"
for f in "$dir"/*.kicad_sch; do shasum -a 256 "$f"; done
echo "== parenthesis depth (root)"
python3 "$here/depth.py" "$sch" || fail "parenthesis depth is not 0 (or depth.py could not run)"

echo "== root export vs the whole model"
# kicad-cli prints its annotation warning on STDOUT (measured), so stdout is kept and read too.
"$kc" sch export netlist --format kicadsexpr -o "$out/export.net" "$sch" >"$out/kc.out" 2>"$out/kc.err" \
  || { quiet "$out/kc.err"; fail "kicad-cli sch export netlist exited non-zero on $sch"; }
quiet "$out/kc.err"
[ -s "$out/export.net" ] || fail "kicad-cli wrote no netlist export for $sch"
if grep -q 'annotation errors' "$out/kc.out" "$out/kc.err"; then
  grep -h 'annotation errors' "$out/kc.out" "$out/kc.err"
  failed="$failed export-annotation"
fi
(cd "$root" && bun "$here/root-netcompare.ts" "$out/export.net") || failed="$failed export"

echo "== PWR_FLAGs across the hierarchy"
probe=0
python3 "$here/hierarchy_flag_probe.py" "$dir" "$board" "$out/probe" >"$out/nflags" 2>"$out/probe.err" || probe=$?
cat "$out/probe.err"
[ "$probe" -eq 3 ] && failed="$failed duplicate-references"
if [ "$probe" -eq 0 ] || [ "$probe" -eq 3 ]; then
  "$kc" sch export netlist --format kicadsexpr -o "$out/probe.net" "$out/probe/$board.kicad_sch" >/dev/null 2>"$out/kc.err" \
    || { quiet "$out/kc.err"; fail "kicad-cli sch export netlist exited non-zero on the PWR_FLAG probe copy"; }
  [ -s "$out/probe.net" ] || fail "kicad-cli wrote no netlist export for the PWR_FLAG probe copy"
  echo "   $(cat "$out/nflags") PWR_FLAG(s) in the hierarchy"
  (cd "$root" && bun "$here/hierarchy-flags.ts" "$out/probe.net" "$out/probe/probe-map.json") || failed="$failed pwr-flags"
else
  failed="$failed pwr-flags"
fi

echo "== cross-page drivers"
(cd "$root" && bun "$here/root-drivers.ts" "$out/export.net") || failed="$failed drivers"

echo "== ERC, the root and every sheet"
"$kc" sch erc --format json --severity-all -o "$out/erc.json" "$sch" >/dev/null 2>"$out/kc.err" \
  || { quiet "$out/kc.err"; fail "kicad-cli sch erc exited non-zero on $sch"; }
quiet "$out/kc.err"
[ -s "$out/erc.json" ] || fail "kicad-cli wrote no ERC report for $sch"
(cd "$root" && bun "$here/erc-allowances.ts" "$out/allowances.json") \
  || fail "erc-allowances.ts refused the declared ERC allowances (named above; ruling CR-MODULE-VCAP-ERC)"
python3 "$here/root_erc.py" "$out/erc.json" "$out/allowances.json" "$dir/$board.kicad_pro" || failed="$failed erc"

echo "== selftest"; python3 "$m/selftest.py" | tail -1
echo "== crossings"; python3 "$m/crossings.py" "$sch" | tail -3
echo "== junction audit"; python3 "$m/junction_audit.py" "$sch" | grep -E '^(wires|ORPHAN|WIRE-TO-WIRE|COLLINEAR|PINS ON)'
echo "== label survey"; python3 "$m/label_survey.py" "$sch" | head -1
echo "== paper fit"; python3 "$m/paper_fit.py" "$sch" | tail -3
echo "== counts"; python3 "$here/counts.py" "$sch"
[ -z "$failed" ] || fail "these checks failed:$failed (each named above)"
echo "verify-root.sh: every check passed"
