#!/bin/sh
# Controls for the h7-pedal ROOT's checks (draughting/pages/verify-root.sh, run with this board's
# drafted directory; h7 pedal pages plan, Task 11b). Written after the module's root-control.sh, the
# controls here naming the pedal's own nets, pins and rulings. Each must come out as stated, or this
# script exits non-zero naming it. Every negative control edits a scratch COPY of the committed
# project (root_tamper.py refuses a path under drafted/); nothing committed is touched.
#
#  1. positive: on the committed project verify-root.sh passes: 6 PWR_FLAGs, one per flagged net,
#     each at home; 9 of 9 cross-page drivers, VINL by R107.2 and VINR by R112.2 with every model pin
#     of each net; root ERC with exactly the two declared exclusions; no annotation warning.
#  2. CR-PEDAL-LM66100-ST-ERC-ROOT-KEY: the .kicad_pro without the ST exclusion fails root_erc.py on
#     the pin_to_pin between U12 pin 5 and #FLG03, and on the count.
#  3. the same ruling: the ST exclusion with the flag's uuid replaced by the nil uuid (a key built
#     without reading the root's flag) is not honoured: the error stays.
#  4. CR-PEDAL-ROOT-MIDI-PIN4-ERC: the .kicad_pro without the MIDI_PIN4 exclusion fails on
#     label_dangling, Label 'MIDI_PIN4'.
#  5. the same ruling: the MIDI_PIN4 exclusion with x one unit off is not honoured.
#  6. CR-PEDAL-CODEC-VIN-AWAITING-ERC-AMENDED: the root stub of adc_drv's VINL cut fails root-drivers.ts
#     on VINL (R107.2's net lacks U9.25), and the root's ERC reports U9 pin 25 pin_not_driven.
#  7. CR-MODULE-PWR-FLAGS: the root's six flags removed fails, naming each of the six nets.
#  8. CR-PEDAL-ROOT-MIDI-PIN4-ERC (Task 11b review I1): MIDI_PIN4's root label moved 5.08 mm west,
#     off its stub's end: kicad-pro.ts refuses to key it, naming the two points, and verify-root.sh
#     with the exclusion keyed at the moved point (as the review regenerated it) fails on kicad-pro.
#
# usage: sh root-control.sh
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
proj="$(cd "$here/../.." && pwd)"
root="$(cd "$here/../../../../.." && pwd)"
pages="$root/draughting/pages"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
board=h7-pedal
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
flags() {
  s=0
  python3 "$pages/hierarchy_flag_probe.py" "$1" "$board" "$1.probe" >"$1.flags.log" 2>&1 || s=$?
  [ "$s" -eq 0 ] || [ "$s" -eq 3 ] || { cat "$1.flags.log" >&2; bad "the probe could not be written for $1"; }
  "$kc" sch export netlist --format kicadsexpr -o "$1.probe.net" "$1.probe/$board.kicad_sch" >/dev/null 2>&1 || bad "kicad-cli could not export the probe of $1"
  (cd "$root" && bun "$pages/hierarchy-flags.ts" "$proj" "$1.probe.net" "$1.probe/probe-map.json") >>"$1.flags.log" 2>&1 || s=1
  echo "$s"
}
(cd "$root" && bun "$pages/erc-allowances.ts" "$proj" "$work/allowances.json") >/dev/null || bad "erc-allowances.ts refused the committed table"
erc() {
  "$kc" sch erc --format json --severity-all -o "$1.erc.json" "$1/$board.kicad_sch" >/dev/null 2>&1 || bad "kicad-cli sch erc failed on $1"
  if python3 "$pages/root_erc.py" "$1.erc.json" "$work/allowances.json" "$1/$board.kicad_pro" >"$1.erc.log" 2>&1; then echo 0; else echo 1; fi
}
# Keep only the exclusions whose comment starts with $2 (a ruling), in the .kicad_pro $1.
keep() {
  python3 -c 'import json,sys; p=json.load(open(sys.argv[1])); p["erc"]["erc_exclusions"]=[e for e in p["erc"]["erc_exclusions"] if e[1].startswith(sys.argv[2])]; open(sys.argv[1],"w").write(json.dumps(p,indent=2)+"\n")' "$1" "$2"
}
# Replace field $3 (0-based, |-separated) of the exclusion whose comment starts with $2 by $4.
field() {
  python3 -c 'import json,sys; p=json.load(open(sys.argv[1])); hits=[e for e in p["erc"]["erc_exclusions"] if e[1].startswith(sys.argv[2])]; assert len(hits)==1, hits; k=hits[0][0].split("|"); k[int(sys.argv[3])]=sys.argv[4]; hits[0][0]="|".join(k); open(sys.argv[1],"w").write(json.dumps(p,indent=2)+"\n")' "$1" "$2" "$3" "$4"
}
nil=00000000-0000-0000-0000-000000000000

echo "== 1. the committed project passes verify-root.sh"
sh "$pages/verify-root.sh" "$proj" >"$work/pos.log" 2>&1 || true
grep -q '^hierarchy-flags.ts: 6 PWR_FLAG(s), exactly one on each of 6 flagged net(s), each at its declared home' "$work/pos.log" || { cat "$work/pos.log" >&2; bad "the PWR_FLAG check did not pass on the committed project"; }
grep -q '^VINL: driven by R107.2 (adc_drv, ) on exported net /VINL, with all 3 of its model pins' "$work/pos.log" || bad "VINL was not cleared by R107.2"
grep -q '^VINR: driven by R112.2 (adc_drv, ) on exported net /VINR, with all 3 of its model pins' "$work/pos.log" || bad "VINR was not cleared by R112.2"
grep -q '^root-drivers.ts: every one of 9 cross-page driver entries' "$work/pos.log" || bad "the driver check did not pass on the committed project"
grep -q '^excluded: pin_to_pin on /expr_ref/ under CR-PEDAL-LM66100-ST-ERC' "$work/pos.log" || bad "the ST violation was not excluded"
grep -q "^excluded: label_dangling on / under CR-PEDAL-ROOT-MIDI-PIN4-ERC: Label 'MIDI_PIN4'" "$work/pos.log" || bad "the MIDI_PIN4 violation was not excluded"
if grep -q 'pin_not_driven' "$work/pos.log"; then bad "the committed root reports a pin_not_driven"; fi
if grep -q 'annotation errors' "$work/pos.log"; then bad "kicad-cli warned of annotation errors on the committed project"; fi
grep -q '^verify-root.sh: every check passed' "$work/pos.log" || { tail -5 "$work/pos.log" >&2; bad "verify-root.sh did not pass on the committed project"; }
echo "   pass"

echo "== 2. no ST exclusion fails on U12 pin 5 and #FLG03"
copy nost
keep "$work/nost/$board.kicad_pro" CR-PEDAL-ROOT-MIDI-PIN4-ERC
[ "$(erc "$work/nost")" = 1 ] || bad "root_erc.py passed a project without the ST exclusion"
grep -q 'FAIL - /expr_ref/ has an ERC error, pin_to_pin: Symbol U12 Pin 5 \[ST, Open collector, Line\]; Symbol #FLG03 Pin 1 \[Power output, Line\]' "$work/nost.erc.log" \
  || { cat "$work/nost.erc.log" >&2; bad "it failed, but not on U12 pin 5 and #FLG03"; }
grep -q 'the .kicad_pro carries 1 ERC exclusion(s) and erc-allowances.ts declares 2' "$work/nost.erc.log" || bad "it failed, but not on the count"
echo "   fails as expected"

echo "== 3. the ST exclusion keyed with the nil uuid for the flag is not honoured"
copy nilflag
field "$work/nilflag/$board.kicad_pro" CR-PEDAL-LM66100-ST-ERC 4 "$nil"
[ "$(erc "$work/nilflag")" = 1 ] || bad "root_erc.py passed an ST exclusion with no flag uuid"
grep -q 'FAIL - /expr_ref/ has an ERC error, pin_to_pin: Symbol U12 Pin 5' "$work/nilflag.erc.log" || { cat "$work/nilflag.erc.log" >&2; bad "it failed, but not on U12 pin 5"; }
echo "   fails as expected"

echo "== 4. no MIDI_PIN4 exclusion fails on its stub label"
copy nomidi
keep "$work/nomidi/$board.kicad_pro" CR-PEDAL-LM66100-ST-ERC
[ "$(erc "$work/nomidi")" = 1 ] || bad "root_erc.py passed a project without the MIDI_PIN4 exclusion"
grep -q "FAIL - / has an ERC error, label_dangling: Label 'MIDI_PIN4'" "$work/nomidi.erc.log" || { cat "$work/nomidi.erc.log" >&2; bad "it failed, but not on MIDI_PIN4's label"; }
echo "   fails as expected"

echo "== 5. the MIDI_PIN4 exclusion with x one unit off is not honoured"
copy xoff
x="$(python3 -c 'import json,sys; p=json.load(open(sys.argv[1])); print([e for e in p["erc"]["erc_exclusions"] if e[1].startswith("CR-PEDAL-ROOT-MIDI-PIN4-ERC")][0][0].split("|")[1])' "$work/xoff/$board.kicad_pro")"
field "$work/xoff/$board.kicad_pro" CR-PEDAL-ROOT-MIDI-PIN4-ERC 1 "$((x + 1))"
[ "$(erc "$work/xoff")" = 1 ] || bad "root_erc.py passed a MIDI_PIN4 exclusion one unit off"
grep -q "FAIL - / has an ERC error, label_dangling: Label 'MIDI_PIN4'" "$work/xoff.erc.log" || { cat "$work/xoff.erc.log" >&2; bad "it failed, but not on MIDI_PIN4's label"; }
echo "   fails as expected"

echo "== 6. adc_drv's VINL stub cut fails the driver check, and ERC reports U9 pin 25 undriven"
copy cut
python3 "$pages/root_tamper.py" cut-stub "$work/cut/$board.kicad_sch" "$here/../root/01-assemble.json" adc_drv VINL >/dev/null
"$kc" sch export netlist --format kicadsexpr -o "$work/cut.net" "$work/cut/$board.kicad_sch" >/dev/null 2>&1 || bad "kicad-cli could not export the cut copy"
if (cd "$root" && bun "$pages/root-drivers.ts" "$proj" "$work/cut.net") >"$work/cut.log" 2>&1; then bad "root-drivers.ts passed with VINL's driver cut off"; fi
grep -q 'FAIL - VINL: the driving pin R107.2.*lacks U9.25' "$work/cut.log" || { cat "$work/cut.log" >&2; bad "it failed, but not on VINL and U9.25"; }
[ "$(erc "$work/cut")" = 1 ] || bad "root_erc.py passed the cut copy"
grep -q 'pin_not_driven: Symbol U9 Pin 25' "$work/cut.erc.log" || { cat "$work/cut.erc.log" >&2; bad "ERC did not report U9 pin 25 undriven"; }
echo "   fails as expected: $(grep 'FAIL - VINL' "$work/cut.log" | cut -c1-120)"

echo "== 7. the root's six flags removed fails, naming each net"
copy missing
python3 "$pages/strip_pwr_flags.py" "$proj/$board.kicad_sch" "$work/missing/$board.kicad_sch" 6
[ "$(flags "$work/missing")" != 0 ] || bad "the hierarchy check passed a root with no flags"
for net in 3V3_D 5V_A_CODEC GND VIN_A VIN_MOD VREF_A; do
  grep -q "FAIL - $net carries no PWR_FLAG anywhere in the hierarchy; its declared home is root" "$work/missing.flags.log" \
    || { cat "$work/missing.flags.log" >&2; bad "it failed, but not naming $net as missing"; }
done
echo "   fails as expected: $(grep -c 'carries no PWR_FLAG' "$work/missing.flags.log") nets named"

echo "== 8. MIDI_PIN4's root label moved 5.08 mm off its stub: kicad-pro.ts refuses it, and verify-root fails"
copy detach
cp "$proj/sym-lib-table" "$work/detach/"
python3 -c 'import sys; p=sys.argv[1]; a=sys.argv[2]; b=sys.argv[3]; t=open(p).read(); assert t.count(a)==1, t.count(a); open(p,"w").write(t.replace(a,b))' \
  "$work/detach/$board.kicad_sch" '(label "MIDI_PIN4" (at 203.2 68.58 180)' '(label "MIDI_PIN4" (at 198.12 68.58 180)'
if (cd "$root" && bun "$pages/kicad-pro.ts" "$proj" "$work/detach") >"$work/detach.pro" 2>"$work/detach.pro.err"; then bad "kicad-pro.ts keyed a MIDI_PIN4 label off its stub"; fi
grep -q 'the root label "MIDI_PIN4" is at (198.12, 68.58) mm, not at its stub.s end, (203.2, 68.58) mm' "$work/detach.pro.err" \
  || { cat "$work/detach.pro.err" >&2; bad "kicad-pro.ts failed, but not naming the label, the point found and the point expected"; }
# The review's run: the exclusion keyed at the moved label's point, as kicad-pro.ts wrote it before
# the fix (x 2032000 -> 1981200). verify-root.sh passed it then; it must fail now.
field "$work/detach/$board.kicad_pro" CR-PEDAL-ROOT-MIDI-PIN4-ERC 1 1981200
sh "$pages/verify-root.sh" "$proj" "$work/detach" >"$work/detach.verify.log" 2>&1 && bad "verify-root.sh passed a MIDI_PIN4 label off its stub"
grep -q 'these checks failed:.*kicad-pro' "$work/detach.verify.log" || { tail -5 "$work/detach.verify.log" >&2; bad "verify-root.sh failed, but not naming kicad-pro"; }
echo "   fails as expected: $(grep -o 'these checks failed:.*' "$work/detach.verify.log")"

echo "root-control.sh: every control came out as stated"
