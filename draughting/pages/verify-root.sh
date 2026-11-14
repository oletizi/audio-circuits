#!/bin/sh
# The verification set for a board's ROOT: the assembled project, every sheet together, as it is
# committed (the root, its .kicad_pro and sym-lib-table, and the block sheets). First written for the
# h7-module's Task 7e; moved here from drafted/h7-platform/h7-module/repair/tools/ by the H7 pedal
# plan's Task 4, with the board named by its first argument.
#
#  0. the board's declared tables (tables.ts): a missing one refuses, naming the file.
#  1. sha256 of every sheet, and the root's parenthesis depth.
#  2. kicad-cli's export of the root against the WHOLE model (root-netcompare.ts).
#  3. exactly one PWR_FLAG per flagged net across the hierarchy, at its declared home, and no `#`
#     reference twice (hierarchy_flag_probe.py, hierarchy-flags.ts; the board's pwr-flag-homes.ts).
#  4. every cross-page driver entry on its net with its real driver (root-drivers.ts; the board's
#     cross-page-drivers.ts).
#  5. ERC on the root, every sheet, with the .kicad_pro's exclusions, judged by root_erc.py against
#     the declared allowances (the board's erc-allowances.ts).
#     Then the .kicad_pro must equal what kicad-pro.ts writes from this project (h7 pedal Task 11b).
#  6. the paper: paper_fit.py must report "fits: yes", and root_sheets_fit.py must find every sheet
#     symbol inside US Letter's inner frame and clear of the title block (every C3 root is drawn on US Letter, `TOOLING.md` design change C3,
#     "Multi-page drawing"; first ruled for the h7-module as CR-MODULE-ROOT-FITS-LETTER; paper_fit.py
#     does not measure a sheet box).
#  7. the rest of the draughting/measure suite on the root sheet, and counts, the sheets' page
#     numbers (root_pages.py) and the committed render's drawn text (svg_stroked_text.py). Reported,
#     never judged.
#
# THE BOARD is its drafted directory, drafted/<family>/<board>/: its root is <board>.kicad_sch there,
# its tables are read from <board-dir>/repair/tools/, and its model through
# boards/<board>/perfboard.json (board.ts). The optional second argument is a project directory to
# verify in its place - a control's scratch copy - judged against the same board's model and tables.
#
# EVERY STEP FAILS LOUDLY, as verify.sh's do: outputs go to a fresh temporary directory, kicad-cli's
# exit status is checked, each output must exist and be non-empty. Steps 2 to 5 each record a
# failure and the script goes on (so does step 6), so one run names every failing check; it exits
# non-zero at the end when any did, naming them.
#
# usage: sh verify-root.sh <board-dir> [project-dir]      (project-dir defaults to <board-dir>)
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
m="$root/draughting/measure"

fail() {
  echo "verify-root.sh: FAILED - $1" >&2
  exit 1
}
quiet() {
  grep -v '^Fontconfig warning' "$1" >&2 || true
}

[ "$#" -eq 1 ] || [ "$#" -eq 2 ] || fail "expected the board directory and optionally a project directory to verify in its place; got $# arguments"
[ -d "$1" ] || fail "$1 is not a directory - the first argument is the board's drafted directory"
boarddir="$(cd "$1" && pwd)"
board="$(basename "$boarddir")"
dir="$(cd "${2:-$boarddir}" && pwd)"
sch="$dir/$board.kicad_sch"

[ -s "$sch" ] || fail "$sch does not exist or is empty - nothing to verify"
[ -s "$dir/$board.kicad_pro" ] || fail "$dir/$board.kicad_pro does not exist - the root's ERC exclusions live there"
[ -x "$kc" ] || fail "kicad-cli not found at $kc"
out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT
failed=""

echo "== the board's tables"
(cd "$root" && bun "$here/tables.ts" "$boarddir") || fail "the board's declared tables could not be read (named above)"

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
(cd "$root" && bun "$here/root-netcompare.ts" "$boarddir" "$out/export.net") || failed="$failed export"

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
  (cd "$root" && bun "$here/hierarchy-flags.ts" "$boarddir" "$out/probe.net" "$out/probe/probe-map.json") || failed="$failed pwr-flags"
else
  failed="$failed pwr-flags"
fi

echo "== cross-page drivers"
(cd "$root" && bun "$here/root-drivers.ts" "$boarddir" "$out/export.net") || failed="$failed drivers"

echo "== ERC, the root and every sheet"
"$kc" sch erc --format json --severity-all -o "$out/erc.json" "$sch" >/dev/null 2>"$out/kc.err" \
  || { quiet "$out/kc.err"; fail "kicad-cli sch erc exited non-zero on $sch"; }
quiet "$out/kc.err"
[ -s "$out/erc.json" ] || fail "kicad-cli wrote no ERC report for $sch"
(cd "$root" && bun "$here/erc-allowances.ts" "$boarddir" "$out/allowances.json") \
  || fail "erc-allowances.ts refused the board's declared ERC allowances (named above)"
python3 "$here/root_erc.py" "$out/erc.json" "$out/allowances.json" "$dir/$board.kicad_pro" || failed="$failed erc"
# The .kicad_pro must be what kicad-pro.ts writes from THIS project, so an exclusion cannot outlive
# the item it was keyed for: kicad-pro.ts refuses, naming it, a root label allowance whose label is
# off its stub (h7 pedal Task 11b review I1), and any stale or hand-edited key differs here.
echo "== the .kicad_pro, regenerated from this project"
if (cd "$root" && bun "$here/kicad-pro.ts" "$boarddir" "$dir") >"$out/regen.kicad_pro" 2>"$out/regen.err"; then
  cmp -s "$out/regen.kicad_pro" "$dir/$board.kicad_pro" && echo "   identical to $board.kicad_pro" \
    || { echo "   differs from $board.kicad_pro"; failed="$failed kicad-pro"; }
else
  cat "$out/regen.err" >&2
  failed="$failed kicad-pro"
fi

echo "== selftest"; python3 "$m/selftest.py" | tail -1
echo "== crossings"; python3 "$m/crossings.py" "$sch" | tail -3
echo "== junction audit"; python3 "$m/junction_audit.py" "$sch" | grep -E '^(wires|ORPHAN|WIRE-TO-WIRE|COLLINEAR|PINS ON)'
echo "== label survey"; python3 "$m/label_survey.py" "$sch" | head -1
echo "== paper fit"
python3 "$m/paper_fit.py" "$sch" >"$out/fit.log" || fail "paper_fit.py could not measure $sch"
cat "$out/fit.log"
grep -qx 'fits: yes' "$out/fit.log" || failed="$failed paper-fit"
echo "== sheet symbols on the paper"
python3 "$root/draughting/measure/root_sheets_fit.py" "$sch" || failed="$failed sheets-fit"
echo "== counts"; python3 "$here/counts.py" "$sch"
echo "== sheet page numbers (reported, never judged)"; python3 -I "$here/root_pages.py" "$sch" | tr '\n' ';'; echo
if [ -s "$dir/$board.svg" ]; then
  echo "== drawn text of the committed render (reported, never judged)"; python3 -I "$here/svg_stroked_text.py" "$dir/$board.svg" "$sch"
fi
[ -z "$failed" ] || fail "these checks failed:$failed (each named above)"
echo "verify-root.sh: every check passed"
