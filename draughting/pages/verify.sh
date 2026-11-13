#!/bin/sh
# The verification set for one BLOCK sheet of a board: the board's declared tables (tables.ts),
# sha256, parenthesis depth, the kicad-cli netlist export against that block's part of the board's
# model (block-netcompare.ts, compareSheetToModel's six lists, then each port's label on its port's
# pins, port-labels.ts), the PWR_FLAG homes (flag-check.ts), ERC alone and under a one-block root
# (erc-one-block-root.sh, with the declared allowances of the board's erc-allowances.ts, whose excused
# violations the closing lines name), the draughting/measure suite (selftest first), paper fit, and
# the counts table. First written for the h7-module (copied from the h7-carrier's repair/verify.sh);
# moved here from drafted/h7-platform/h7-module/repair/tools/ by the H7 pedal plan's Task 4, with
# the board named by its first argument.
#
# THE BOARD is its drafted directory, drafted/<family>/<board>/. Its tables are read from
# <board-dir>/repair/tools/ (pwr-flag-homes.ts, cross-page-drivers.ts, erc-allowances.ts) and its
# model through boards/<board>/perfboard.json (board.ts). A missing table refuses, naming the file.
# The sheet may be anywhere: a committed page, or a control's scratch copy.
#
# EVERY STEP FAILS LOUDLY. The export and the ERC report are written into a fresh temporary
# directory, never read from a previous run; kicad-cli's exit status is checked and each output
# must exist and be non-empty before it is read. A step that cannot run stops the script non-zero,
# naming the step, so a skipped check can never print a result that looks like a pass.
#
# usage: sh verify.sh <board-dir> <block> <sheet.kicad_sch>
set -eu
set -o pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
m="$root/draughting/measure"

fail() {
  echo "verify.sh: FAILED - $1" >&2
  exit 1
}

[ "$#" -eq 3 ] || fail "expected three arguments, the board directory, the block and the sheet to verify; got $#"
[ -d "$1" ] || fail "$1 is not a directory - the first argument is the board's drafted directory"
board="$(cd "$1" && pwd)"
block="$2"
[ -s "$3" ] || fail "$3 does not exist or is empty - nothing to verify"
sch="$(cd "$(dirname "$3")" && pwd)/$(basename "$3")"
[ -x "$kc" ] || fail "kicad-cli not found at $kc"

# kicad-cli's stderr, minus the Fontconfig configuration warnings this machine prints on every run.
quiet() {
  grep -v '^Fontconfig warning' "$1" >&2 || true
}

out="$(mktemp -d)"
trap 'rm -rf "$out"' EXIT

echo "== the board's tables"
(cd "$root" && bun "$here/tables.ts" "$board") || fail "the board's declared tables could not be read (named above)"

echo "== sha256"; shasum -a 256 "$sch"
echo "== parenthesis depth"
python3 "$here/depth.py" "$sch" || fail "parenthesis depth is not 0 (or depth.py could not run)"

echo "== netlist vs model"
"$kc" sch export netlist --format kicadsexpr -o "$out/export.net" "$sch" >/dev/null 2>"$out/kc.err" \
  || { quiet "$out/kc.err"; fail "kicad-cli sch export netlist exited non-zero on $sch"; }
quiet "$out/kc.err"
[ -s "$out/export.net" ] || fail "kicad-cli wrote no netlist export for $sch"
(cd "$root" && bun "$here/block-netcompare.ts" "$board" "$block" "$out/export.net") \
  || fail "the netlist export disagrees with the model on a component, a net, a pin, a value or a port's label (listed above)"

# The board's pwr-flag-homes.ts: each board net carries at most one PWR_FLAG across the hierarchy, at
# the home the table declares. kicad-cli's export omits `#` references, so the nets come from the
# export of a probe copy whose flags are renamed FLGPROBE<n> (flag_probe.py). Before ERC, so that a
# stray flag fails here, by name, rather than as a pin_to_pin under the root below.
echo "== PWR_FLAGs on shared nets"
nflags="$(python3 "$here/flag_probe.py" "$sch" "$out/probe.kicad_sch")" || fail "flag_probe.py could not write the probe copy"
"$kc" sch export netlist --format kicadsexpr -o "$out/probe.net" "$out/probe.kicad_sch" >/dev/null 2>"$out/kc.err" \
  || { quiet "$out/kc.err"; fail "kicad-cli sch export netlist exited non-zero on the PWR_FLAG probe copy"; }
quiet "$out/kc.err"
[ -s "$out/probe.net" ] || fail "kicad-cli wrote no netlist export for the PWR_FLAG probe copy"
(cd "$root" && bun "$here/flag-check.ts" "$board" "$block" "$out/probe.net" "$nflags") \
  || fail "a PWR_FLAG sits on a shared net whose single flag lives elsewhere (named above; pwr-flag-homes.ts)"

echo "== ERC"
"$kc" sch erc --format json --severity-all -o "$out/erc.json" "$sch" >/dev/null 2>"$out/kc.err" \
  || { quiet "$out/kc.err"; fail "kicad-cli sch erc exited non-zero on $sch"; }
quiet "$out/kc.err"
[ -s "$out/erc.json" ] || fail "kicad-cli wrote no ERC report for $sch"
python3 "$here/erc_counts.py" "$out/erc.json" || fail "erc_counts.py could not read the ERC report"

echo "== ERC under a one-block root"
sh "$here/erc-one-block-root.sh" "$board" "$block" "$sch" >"$out/root.log" 2>&1 \
  || { cat "$out/root.log" >&2; fail "ERC under the one-block root failed (erc-one-block-root.sh, above)"; }
cat "$out/root.log"

echo "== selftest"; python3 "$m/selftest.py" | tail -1
echo "== crossings"; python3 "$m/crossings.py" "$sch" | tail -3
# The summary lines only: the carrier's `tail -7` cut them off on a sheet that lists collinear pairs.
echo "== junction audit"; python3 "$m/junction_audit.py" "$sch" | grep -E '^(wires|ORPHAN|WIRE-TO-WIRE|COLLINEAR|PINS ON)'
echo "== label survey"; python3 "$m/label_survey.py" "$sch" | head -1
echo "== paper fit"; python3 "$m/paper_fit.py" "$sch" | tail -3
echo "== counts"; python3 "$here/counts.py" "$sch"
echo "verify.sh: every step ran"
# Every ERC violation excused by a declared allowance (the board's erc-allowances.ts), and every
# allowance that matched nothing, repeated here so a pass that rests on one is never silent.
if grep -q "^excused: " "$out/root.log"; then
  echo "verify.sh: ERC errors excused by a declared allowance (erc-allowances.ts):"
  grep "^excused: " "$out/root.log" | while IFS= read -r line; do echo "   $line"; done
else
  echo "verify.sh: no ERC error excused by a declared allowance"
fi
{ grep "^stale allowance: " "$out/root.log" || true; } | while IFS= read -r line; do echo "verify.sh: $line"; done
