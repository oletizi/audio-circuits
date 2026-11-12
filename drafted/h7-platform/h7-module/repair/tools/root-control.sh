#!/bin/sh
# Controls for the h7-module ROOT's checks (verify-root.sh; Task 7e). Each must come out as stated,
# or this script exits non-zero naming it. Every negative control edits a scratch COPY of the
# committed project (root_tamper.py refuses a path under drafted/); nothing committed is touched.
#
#  1. positive: on the committed project, verify-root.sh's export comparison, PWR_FLAG check and
#     cross-page driver check pass, and kicad-cli's export warns of no annotation error.
#  2. negative, CR-MODULE-PWR-FLAGS, a duplicate: a second PWR_FLAG on 3V3_D, on the decoupling page
#     (at C1 pin 1), fails hierarchy-flags.ts, naming 3V3_D and its two flags. (Not a second one on
#     the root: akcli's place_pwr_flag on a net of that sheet already flagged MOVES the flag rather
#     than adding one - measured, its net diff reads "+#PWR01.1 -#FLG01.1".)
#  3. negative, the same ruling, a missing flag: the root's three flags removed fails, naming 3V3_D,
#     VREF_A and VSSA.
#  4. the parked Task 7a minor: a PWR_FLAG on the power page's PRIVATE net FB (U2 pin 8) passes the
#     block check flag-check.ts, which treats a flag off a port's net as private, and FAILS the
#     whole-hierarchy check, which declares every flag's home. This is the backstop.
#  5. negative, duplicate `#` references: the root's #FLG01 renamed #PWR01 (the power page's) makes
#     hierarchy_flag_probe.py exit 3 naming #PWR01, and kicad-cli's export warn of annotation errors.
#  6. negative, CR-MODULE-VCAP-ERC: the .kicad_pro with no exclusion fails root_erc.py on the
#     pin_to_pin between U1 pins 81 and 125.
#  7. negative, the same ruling: the .kicad_pro with its exclusion twice fails on the count.
#  8. root_erc.py on synthetic reports: an excluded violation no allowance admits fails; the exact
#     allowance excluded, and nothing else, passes.
#  9. negative, CR-MODULE-CROSS-PAGE-DRIVERS: the root stub of reset_boot's NRST pin cut fails
#     root-drivers.ts on NRST, and the export comparison.
# 10. CR-MODULE-ROOT-FITS-LETTER: on the committed root, root_sheets_fit.py finds all 12 sheet symbols
#     on the paper and paper_fit.py reports "fits: yes"; with the interface sheet's box moved 100 mm
#     south in a scratch copy, root_sheets_fit.py fails naming interface, and verify-root.sh fails
#     naming sheets-fit. (paper_fit.py alone does not see it: it does not measure a sheet box.)
#
# usage: sh root-control.sh
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
proj="$(cd "$here/../.." && pwd)"
root="$(cd "$here/../../../../.." && pwd)"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
akcli="$root/draughting/venv-akcli/bin/akcli"
board=h7-module
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

bad() {
  echo "root-control.sh: CONTROL FAILED - $1" >&2
  exit 1
}
copy() {
  mkdir -p "$work/$1"
  cp "$proj"/*.kicad_sch "$proj/$board.kicad_pro" "$work/$1/"
}
apply() {
  "$akcli" draw "$1" --ops "$2" --apply 2>&1 | grep -q 'status: APPLIED' || bad "akcli did not apply $2 to $1"
}
# The whole-hierarchy flag check on a project directory; its output in <dir>.flags.log, its status echoed.
flags() {
  s=0
  python3 "$here/hierarchy_flag_probe.py" "$1" "$board" "$1.probe" >"$1.flags.log" 2>&1 || s=$?
  [ "$s" -eq 0 ] || [ "$s" -eq 3 ] || { cat "$1.flags.log" >&2; bad "the probe could not be written for $1"; }
  "$kc" sch export netlist --format kicadsexpr -o "$1.probe.net" "$1.probe/$board.kicad_sch" >/dev/null 2>&1 || bad "kicad-cli could not export the probe of $1"
  (cd "$root" && bun "$here/hierarchy-flags.ts" "$1.probe.net" "$1.probe/probe-map.json") >>"$1.flags.log" 2>&1 || s=1
  echo "$s"
}

echo "== 1. the committed project: export, PWR_FLAGs and drivers pass"
sh "$here/verify-root.sh" >"$work/pos.log" 2>&1 || true
grep -q '^hierarchy-flags.ts: 5 PWR_FLAG(s), exactly one on each of 5 flagged net(s)' "$work/pos.log" || { cat "$work/pos.log" >&2; bad "the PWR_FLAG check did not pass on the committed project"; }
grep -q '^root-drivers.ts: every one of 25 cross-page driver entries' "$work/pos.log" || { cat "$work/pos.log" >&2; bad "the driver check did not pass on the committed project"; }
grep -q '^netMembership: 0$' "$work/pos.log" || bad "the export comparison did not report netMembership 0"
grep -q '^componentIdentity: 0$' "$work/pos.log" || bad "verify-root.sh did not reach the export comparison"
if grep -q 'annotation errors' "$work/pos.log"; then bad "kicad-cli warned of annotation errors on the committed project"; fi
if grep -q 'these checks failed' "$work/pos.log"; then bad "verify-root.sh failed on the committed project: $(grep 'these checks failed' "$work/pos.log")"; fi
grep -q '^verify-root.sh: every check passed' "$work/pos.log" || bad "verify-root.sh did not pass on the committed project"
echo "   pass"

echo "== 2. a second PWR_FLAG on 3V3_D, on the decoupling page, fails, naming 3V3_D"
copy dup
python3 "$here/root_tamper.py" flag-at-pin "$here/../decoupling/pins.json" C1 1 decoupling.kicad_sch >"$work/dup.json"
apply "$work/dup/decoupling.kicad_sch" "$work/dup.json"
[ "$(flags "$work/dup")" != 0 ] || bad "the hierarchy check passed two flags on 3V3_D"
grep -q 'FAIL - 3V3_D carries 2 PWR_FLAGs, on root, decoupling' "$work/dup.flags.log" || { cat "$work/dup.flags.log" >&2; bad "it failed, but not naming 3V3_D's two flags"; }
echo "   fails as expected: $(grep 'FAIL - 3V3_D' "$work/dup.flags.log")"

echo "== 3. the root's flags removed fails, naming 3V3_D, VREF_A and VSSA"
copy missing
python3 "$here/strip_pwr_flags.py" "$proj/$board.kicad_sch" "$work/missing/$board.kicad_sch" 3
[ "$(flags "$work/missing")" != 0 ] || bad "the hierarchy check passed a root with no flags"
for net in 3V3_D VREF_A VSSA; do
  grep -q "FAIL - $net carries no PWR_FLAG anywhere in the hierarchy; its declared home is root" "$work/missing.flags.log" \
    || { cat "$work/missing.flags.log" >&2; bad "it failed, but not naming $net as missing"; }
done
echo "   fails as expected: $(grep -c 'carries no PWR_FLAG' "$work/missing.flags.log") nets named"

echo "== 4. a flag on power's private FB passes flag-check.ts and fails the hierarchy check"
copy private
python3 "$here/root_tamper.py" flag-at-pin "$here/../power/pins.json" U2 8 power.kicad_sch >"$work/private.json"
apply "$work/private/power.kicad_sch" "$work/private.json"
n="$(python3 "$here/flag_probe.py" "$work/private/power.kicad_sch" "$work/private-probe.kicad_sch")"
"$kc" sch export netlist --format kicadsexpr -o "$work/private-probe.net" "$work/private-probe.kicad_sch" >/dev/null 2>&1 || bad "kicad-cli could not export the power probe"
(cd "$root" && bun "$here/flag-check.ts" power "$work/private-probe.net" "$n") >"$work/private-block.log" 2>&1 \
  || { cat "$work/private-block.log" >&2; bad "flag-check.ts refused the flag on FB, so this does not show the case it misses"; }
grep -q 'private to power - allowed' "$work/private-block.log" || bad "flag-check.ts did not pass the FB flag as private"
[ "$(flags "$work/private")" != 0 ] || bad "the hierarchy check passed a flag on power's FB"
grep -q 'FAIL - power_FB carries a PWR_FLAG (on power) and has no declared flag home' "$work/private.flags.log" \
  || { cat "$work/private.flags.log" >&2; bad "it failed, but not naming power_FB"; }
echo "   flag-check.ts: $(grep -c 'private to power - allowed' "$work/private-block.log") private flag(s) allowed; hierarchy: $(grep 'FAIL - power_FB' "$work/private.flags.log")"

echo "== 5. a root flag referenced #PWR01, as the power page's is, fails the reference check"
copy refs
python3 "$here/root_tamper.py" rename-ref "$work/refs/$board.kicad_sch" '#FLG01' '#PWR01' >/dev/null
[ "$(flags "$work/refs")" = 3 ] || { cat "$work/refs.flags.log" >&2; bad "the probe did not exit 3 on a repeated reference"; }
grep -q 'FAIL - reference #PWR01 is used 2 times across the hierarchy, on root, power' "$work/refs.flags.log" || { cat "$work/refs.flags.log" >&2; bad "it failed, but not naming #PWR01"; }
"$kc" sch export netlist --format kicadsexpr -o "$work/refs.net" "$work/refs/$board.kicad_sch" >"$work/refs.err" 2>&1 || bad "kicad-cli could not export the refs copy"
grep -q 'annotation errors' "$work/refs.err" || bad "kicad-cli did not warn of annotation errors on the repeated reference"
echo "   fails as expected, and kicad-cli warns: $(grep -o 'schematic has annotation errors' "$work/refs.err")"

(cd "$root" && bun "$here/erc-allowances.ts" "$work/allowances.json") >/dev/null || bad "erc-allowances.ts refused the committed table"
erc() {
  "$kc" sch erc --format json --severity-all -o "$1.erc.json" "$1/$board.kicad_sch" >/dev/null 2>&1 || bad "kicad-cli sch erc failed on $1"
  if python3 "$here/root_erc.py" "$1.erc.json" "$work/allowances.json" "$1/$board.kicad_pro" >"$1.erc.log" 2>&1; then echo 0; else echo 1; fi
}
pro() {
  python3 -c 'import json,sys; p=json.load(open(sys.argv[1])); e=p["erc"]["erc_exclusions"]; p["erc"]["erc_exclusions"]=e*int(sys.argv[2]); open(sys.argv[1],"w").write(json.dumps(p,indent=2)+"\n")' "$1" "$2"
}

echo "== 6. no exclusion in the .kicad_pro fails on the VCAP pin_to_pin"
copy noexcl
pro "$work/noexcl/$board.kicad_pro" 0
[ "$(erc "$work/noexcl")" = 1 ] || bad "root_erc.py passed a project with no exclusion"
grep -q 'FAIL - /mcu/ has an ERC error, pin_to_pin: Symbol U1 Pin 81 \[VCAP, Power output, Line\]; Symbol U1 Pin 125' "$work/noexcl.erc.log" \
  || { cat "$work/noexcl.erc.log" >&2; bad "it failed, but not on U1 81-125"; }
echo "   fails as expected"

echo "== 7. the exclusion twice fails on the count"
copy twice
pro "$work/twice/$board.kicad_pro" 2
[ "$(erc "$work/twice")" = 1 ] || bad "root_erc.py passed a project with two exclusions"
grep -q 'the .kicad_pro carries 2 ERC exclusion(s) and erc-allowances.ts declares 1' "$work/twice.erc.log" || { cat "$work/twice.erc.log" >&2; bad "it failed, but not on the count"; }
echo "   fails as expected"

echo "== 8. root_erc.py on synthetic reports"
printf '%s\n' '{"erc":{"erc_exclusions":[["x","y"]]}}' >"$work/one.pro"
p81='{"description":"Symbol U1 Pin 81 [VCAP, Power output, Line]"}'
p125='{"description":"Symbol U1 Pin 125 [VCAP, Power output, Line]"}'
p126='{"description":"Symbol U1 Pin 126 [VDD, Power input, Line]"}'
printf '%s' "{\"sheets\":[{\"path\":\"/\",\"violations\":[]},{\"path\":\"/mcu/\",\"violations\":[{\"severity\":\"warning\",\"excluded\":true,\"type\":\"pin_to_pin\",\"items\":[$p81,$p126]}]}]}" >"$work/stray.json"
if python3 "$here/root_erc.py" "$work/stray.json" "$work/allowances.json" "$work/one.pro" >"$work/stray.log" 2>&1; then bad "an exclusion no allowance admits passed"; fi
grep -q 'matches no declared allowance' "$work/stray.log" || { cat "$work/stray.log" >&2; bad "it failed, but not naming the stray exclusion"; }
printf '%s' "{\"sheets\":[{\"path\":\"/\",\"violations\":[]},{\"path\":\"/mcu/\",\"violations\":[{\"severity\":\"warning\",\"excluded\":true,\"type\":\"pin_to_pin\",\"items\":[$p81,$p125]}]}]}" >"$work/exact.json"
python3 "$here/root_erc.py" "$work/exact.json" "$work/allowances.json" "$work/one.pro" >"$work/exact.log" 2>&1 || { cat "$work/exact.log" >&2; bad "the exact allowance, excluded, did not pass"; }
echo "   stray exclusion fails; the exact one passes"

echo "== 9. the root stub of reset_boot's NRST cut fails the driver check on NRST"
copy cut
python3 "$here/root_tamper.py" cut-stub "$work/cut/$board.kicad_sch" "$here/../root/01-assemble.json" reset_boot NRST >/dev/null
"$kc" sch export netlist --format kicadsexpr -o "$work/cut.net" "$work/cut/$board.kicad_sch" >/dev/null 2>&1 || bad "kicad-cli could not export the cut copy"
if (cd "$root" && bun "$here/root-drivers.ts" "$work/cut.net") >"$work/cut.log" 2>&1; then bad "root-drivers.ts passed with NRST's driver cut off"; fi
grep -q 'FAIL - NRST: the driving pin U5.2' "$work/cut.log" || { cat "$work/cut.log" >&2; bad "it failed, but not on NRST"; }
if (cd "$root" && bun "$here/root-netcompare.ts" "$work/cut.net") >"$work/cut-cmp.log" 2>&1; then bad "the export comparison passed the cut copy"; fi
echo "   fails as expected: $(grep 'FAIL - NRST' "$work/cut.log" | cut -c1-120)"

echo "== 10. the root's sheet symbols on the paper; one moved off it fails"
python3 "$root/draughting/measure/root_sheets_fit.py" "$proj/$board.kicad_sch" >"$work/fit.log" 2>&1 || { cat "$work/fit.log" >&2; bad "root_sheets_fit.py failed on the committed root"; }
grep -q '^sheets on the paper: 12 of 12$' "$work/fit.log" || bad "root_sheets_fit.py did not find 12 of 12 sheets on the paper"
python3 "$root/draughting/measure/paper_fit.py" "$proj/$board.kicad_sch" | grep -qx 'fits: yes' || bad "paper_fit.py did not report fits: yes on the committed root"
copy moved
cp "$proj/sym-lib-table" "$work/moved/"
python3 "$here/root_tamper.py" move-sheet "$work/moved/$board.kicad_sch" interface 100 >/dev/null
if python3 "$root/draughting/measure/root_sheets_fit.py" "$work/moved/$board.kicad_sch" >"$work/moved.fit.log" 2>&1; then bad "root_sheets_fit.py passed a sheet moved off the paper"; fi
grep -q 'interface: .*FAIL - off the inner frame' "$work/moved.fit.log" || { cat "$work/moved.fit.log" >&2; bad "it failed, but not naming interface"; }
sh "$here/verify-root.sh" "$work/moved" >"$work/moved.verify.log" 2>&1 && bad "verify-root.sh passed a sheet moved off the paper"
grep -q 'these checks failed:.*sheets-fit' "$work/moved.verify.log" || { tail -5 "$work/moved.verify.log" >&2; bad "verify-root.sh failed, but not naming sheets-fit"; }
echo "   12 of 12 on the paper; moved: $(grep 'interface:' "$work/moved.fit.log" | cut -c1-90)"

echo "root-control.sh: every control came out as stated"
