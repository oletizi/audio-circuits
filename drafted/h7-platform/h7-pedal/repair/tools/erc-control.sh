#!/bin/sh
# Controls for the h7-pedal's power_out cross-page driver (ruling CR-PEDAL-CROSS-PAGE-POWER-DRIVERS,
# as amended at the h7 pedal pages plan's Task 7c): the measurement the ruling rests on, and its
# refusal, made re-runnable (Task 7b review, minors 2 and 3). Each control must come out as stated,
# or this script exits non-zero naming it. The shape is the h7-module's erc-control.sh; the tools it
# holds to account are in draughting/pages/, each run with this board's drafted directory, and the
# controls stay here because every one names the pedal's own pages, nets and pins.
#
#  1. positive: the committed pf page verifies, /pf/ at 0 errors and 0 warnings under its one-block
#     root, with 5V_A's stand-in a PWR_FLAG for ldo_vmid U4 OUT (a power_out pin).
#  2. negative: the same page with the driver table overridden (PAGES_CROSS_PAGE_DRIVERS_TABLE, the
#     announced test override; the committed table is untouched) to an entry for 5V_A whose driving
#     pin is PASSIVE - ldo_vmid TP5 pin 1 (TP_5V_A, CR-PEDAL-TEST-PADS, on 5V_A in the model) - so the one-block root's
#     stand-in on 5V_A is a Connector:TestPoint, not a PWR_FLAG. verify.sh fails with
#     power_pin_not_driven on U1's VDD (pin 6): a passive pin does not drive a power input. This is
#     the ruling's TestPoint row; standInKind reads the stand-in from the driving pin's type, so a
#     passive driving pin is how a TestPoint is put on that net without a second override.
#  3. negative: the same page with the driver table overridden to none: the same failure (the
#     ruling's no-stand-in row).
#  4. negative, the refusal: a scratch copy of this board's drafted directory (named h7-pedal, so it
#     reaches h7Pedal() through boards/h7-pedal/perfboard.json) whose pwr-flag-homes.ts also homes
#     5V_A ON THE pf PAGE - the reading page, the case a block-scoped check let through - is refused by
#     tables.ts (the first step of verify.sh and verify-root.sh), naming 5V_A and U4's power_out OUT;
#     verify.sh on the committed pf page with that directory fails at its tables step; and
#     one-block-root.ts for block pf is refused too.
#  5. negative, the refusal: the same with 5V_A homed on the root, refused by tables.ts.
#  6. positive: the committed tables pass the same check (tables.ts exit 0 on this board).
#  7. positive (Task 9b): the committed expr_ref page verifies, its one ERC error, U12's ST (open
#     collector) against the root's stub PWR_FLAG on GND, excused by CR-PEDAL-LM66100-ST-ERC.
#  8. negative: the same page with no allowance (PAGES_ERC_ALLOWANCES_TABLE, an empty table) fails on
#     that pin_to_pin.
#  9. negative: an allowance naming U12 pin 4 (N/C, on GND, typed free) is refused by the model check.
# 10. negative: an allowance whose PWR_FLAG partner is not the flag's pin 1 is refused.
# 11. positive (Task 9c): the committed codec page verifies, its two ERC errors, pin_not_driven on U9's
#     VINL and VINR (inputs whose driver is in a block the model does not hold yet), excused by
#     CR-PEDAL-CODEC-VIN-AWAITING-ERC, a one-item allowance each.
# 12. negative: the same page with no allowance fails on exactly those two.
# 13. negative: a one-item allowance for VINL naming U9 pin 15 (RST, on CODEC_RST_N) is refused by the
#     model check.
# 14. negative: a one-item allowance of a two-item type (pin_to_pin) is refused.
#
# usage: sh erc-control.sh
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
board="$(cd "$here/../.." && pwd)"
root="$(cd "$here/../../../../.." && pwd)"
pages="$root/draughting/pages"
pf="$board/pf.kicad_sch"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

bad() {
  echo "erc-control.sh: CONTROL FAILED - $1" >&2
  exit 1
}

echo "== 1. committed pf page verifies, 5V_A stood in for by a PWR_FLAG"
sh "$pages/verify.sh" "$board" pf "$pf" >"$work/pos.log" 2>&1 || { cat "$work/pos.log" >&2; bad "the committed pf page did not verify"; }
grep -q '^sheet /pf/: errors 0, warnings 0' "$work/pos.log" || { cat "$work/pos.log" >&2; bad "/pf/ is not at 0 errors, 0 warnings"; }
grep -q 'stand-in drivers on 5V_A (for ldo_vmid U4 OUT, a PWR_FLAG)' "$work/pos.log" \
  || { cat "$work/pos.log" >&2; bad "the one-block root did not stand in for 5V_A with a PWR_FLAG"; }
echo "   pass: $(grep '^sheet /pf/' "$work/pos.log"); $(grep -o 'stand-in drivers on .*' "$work/pos.log")"

# The pf page's U1 VDD, as kicad-cli 10.0.5 names it in an ERC item.
VDD='at power_pin_not_driven: Symbol U1 Pin 6 \[VDD, Power input, Line\]'

echo "== 2. 5V_A stood in for by a TestPoint (a passive driving pin, test override): power_pin_not_driven on U1 VDD"
printf '%s\n' '[{"net":"5V_A","block":"ldo_vmid","designator":"TP5","pin":"1","pinName":"1","source":"erc-control.sh control 2: TP_5V_A pin 1 is on 5V_A in the model and passive, so its stand-in is a TestPoint"}]' >"$work/passive.json"
if PAGES_CROSS_PAGE_DRIVERS_TABLE="$work/passive.json" sh "$pages/verify.sh" "$board" pf "$pf" >"$work/tp.log" 2>&1; then
  cat "$work/tp.log" >&2; bad "verify.sh passed the pf page with a TestPoint standing in on 5V_A"
fi
grep -q 'TEST OVERRIDE' "$work/tp.log" || { cat "$work/tp.log" >&2; bad "the override was not announced, so the run may have used the committed table"; }
grep -q 'stand-in drivers on 5V_A (for ldo_vmid TP5 1)' "$work/tp.log" \
  || { cat "$work/tp.log" >&2; bad "the one-block root did not place a TestPoint (no PWR_FLAG) on 5V_A"; }
grep -q "$VDD" "$work/tp.log" || { cat "$work/tp.log" >&2; bad "verify.sh failed, but not with power_pin_not_driven on U1's VDD"; }
echo "   fails as expected: $(grep -o 'at power_pin_not_driven: .*' "$work/tp.log" | head -1)"

echo "== 3. no stand-in on 5V_A (test override, an empty table): the same failure"
printf '%s\n' '[]' >"$work/none.json"
if PAGES_CROSS_PAGE_DRIVERS_TABLE="$work/none.json" sh "$pages/verify.sh" "$board" pf "$pf" >"$work/none.log" 2>&1; then
  cat "$work/none.log" >&2; bad "verify.sh passed the pf page with no stand-in on 5V_A"
fi
grep -q 'TEST OVERRIDE' "$work/none.log" || { cat "$work/none.log" >&2; bad "the override was not announced"; }
grep -q "$VDD" "$work/none.log" || { cat "$work/none.log" >&2; bad "verify.sh failed, but not with power_pin_not_driven on U1's VDD"; }
echo "   fails as expected: $(grep -o 'at power_pin_not_driven: .*' "$work/none.log" | head -1)"

# A scratch copy of this board's drafted directory whose pwr-flag-homes.ts also homes 5V_A on $1.
homed() {
  dir="$work/home-$1/h7-pedal"
  mkdir -p "$work/home-$1"
  cp -R "$board" "$dir"
  python3 - "$dir/repair/tools/pwr-flag-homes.ts" "$1" <<'PY'
import pathlib, sys
path, home = pathlib.Path(sys.argv[1]), sys.argv[2]
value = "ROOT_SHEET" if home == "root" else '"' + home + '"'
old = "SHARED_FLAG_HOME: Readonly<Record<string, string>> = {"
text = path.read_text()
if text.count(old) != 1:
    raise SystemExit("erc-control.sh: pwr-flag-homes.ts no longer holds the line this control rewrites: " + old)
path.write_text(text.replace(old, old + ' "5V_A": ' + value + ","))
PY
  grep -q '"5V_A": ' "$dir/repair/tools/pwr-flag-homes.ts" || bad "the scratch pwr-flag-homes.ts does not home 5V_A on $1"
  echo "$dir"
}
REFUSAL='5V_A: pwr-flag-homes.ts declares a shared flag home on'
DRIVER='cross-page-drivers.ts declares its driver ldo_vmid U4 OUT (pin 1), a power_out pin'

echo "== 4. 5V_A homed on the pf page (the reading page) is refused, board-wide"
dir="$(homed pf)"
if (cd "$root" && bun "$pages/tables.ts" "$dir") >"$work/home-pf.log" 2>&1; then
  cat "$work/home-pf.log" >&2; bad "tables.ts accepted 5V_A with a flag home on pf and a power_out driver"
fi
grep -q "$REFUSAL pf, and $DRIVER" "$work/home-pf.log" || { cat "$work/home-pf.log" >&2; bad "tables.ts refused, but not naming 5V_A's home on pf and U4's power_out OUT"; }
echo "   tables.ts refused as expected: $(grep -o "$REFUSAL pf" "$work/home-pf.log")"
if sh "$pages/verify.sh" "$dir" pf "$pf" >"$work/home-pf-verify.log" 2>&1; then
  cat "$work/home-pf-verify.log" >&2; bad "verify.sh passed with 5V_A homed on pf"
fi
grep -q "the board's declared tables could not be read" "$work/home-pf-verify.log" \
  || { cat "$work/home-pf-verify.log" >&2; bad "verify.sh failed, but not at its tables step"; }
echo "   verify.sh failed at its tables step, as expected"
mkdir "$work/obr"
if (cd "$root" && bun "$pages/one-block-root.ts" "$dir" pf "$work/obr") >"$work/home-pf-obr.log" 2>&1; then
  cat "$work/home-pf-obr.log" >&2; bad "one-block-root.ts for pf accepted 5V_A homed on pf"
fi
grep -q "$REFUSAL pf, and $DRIVER" "$work/home-pf-obr.log" || { cat "$work/home-pf-obr.log" >&2; bad "one-block-root.ts refused, but not naming 5V_A"; }
echo "   one-block-root.ts for pf refused as expected"

echo "== 5. 5V_A homed on the root is refused"
dir="$(homed root)"
if (cd "$root" && bun "$pages/tables.ts" "$dir") >"$work/home-root.log" 2>&1; then
  cat "$work/home-root.log" >&2; bad "tables.ts accepted 5V_A with a flag home on the root and a power_out driver"
fi
grep -q "$REFUSAL root, and $DRIVER" "$work/home-root.log" || { cat "$work/home-root.log" >&2; bad "tables.ts refused, but not naming 5V_A's home on the root"; }
echo "   tables.ts refused as expected: $(grep -o "$REFUSAL root" "$work/home-root.log")"

echo "== 6. the committed tables pass the same check"
(cd "$root" && bun "$pages/tables.ts" "$board") >"$work/tables.log" 2>&1 || { cat "$work/tables.log" >&2; bad "tables.ts refused this board's committed tables"; }
echo "   $(cat "$work/tables.log")"

# Controls 7 to 10 (h7 pedal pages plan, Task 9b): the PWR_FLAG partner of an ERC allowance and the
# pedal's one allowance, ruling CR-PEDAL-LM66100-ST-ERC (U12's ST, open_collector, on GND, which
# carries the flag).
er="$board/expr_ref.kicad_sch"
ST='Symbol U12 Pin 5 \[ST, Open collector, Line\]; Symbol #PWR[0-9]* Pin 1 \[Power output, Line\]'

echo "== 7. the committed expr_ref page verifies, its one ERC error excused by CR-PEDAL-LM66100-ST-ERC"
sh "$pages/verify.sh" "$board" expr_ref "$er" >"$work/er.log" 2>&1 || { cat "$work/er.log" >&2; bad "the committed expr_ref page did not verify"; }
grep -q '^sheet /expr_ref/: errors 1 (1 excused by a declared allowance), warnings 0' "$work/er.log" \
  || { cat "$work/er.log" >&2; bad "/expr_ref/ is not at 1 error, excused, and 0 warnings"; }
grep -q "^excused: error pin_to_pin on /expr_ref/ under CR-PEDAL-LM66100-ST-ERC: $ST" "$work/er.log" \
  || { cat "$work/er.log" >&2; bad "the excused error is not U12 ST against a PWR_FLAG"; }
echo "   pass: $(grep '^excused: ' "$work/er.log")"

echo "== 8. no allowance (test override, an empty table): the expr_ref page fails on U12 ST against the flag"
printf '%s\n' '[]' >"$work/no-allow.json"
if PAGES_ERC_ALLOWANCES_TABLE="$work/no-allow.json" sh "$pages/verify.sh" "$board" expr_ref "$er" >"$work/er-none.log" 2>&1; then
  cat "$work/er-none.log" >&2; bad "verify.sh passed the expr_ref page with no allowance"
fi
grep -q 'TEST OVERRIDE' "$work/er-none.log" || { cat "$work/er-none.log" >&2; bad "the override was not announced"; }
grep -q "at pin_to_pin: $ST" "$work/er-none.log" || { cat "$work/er-none.log" >&2; bad "verify.sh failed, but not on U12 ST against a PWR_FLAG"; }
echo "   fails as expected: $(grep -o 'at pin_to_pin: .*' "$work/er-none.log" | head -1)"

# An allowance like the committed one, with one field changed; the model check must refuse it.
allow() {
  printf '[{"ruling":"erc-control.sh","sheet":"/expr_ref/","type":"pin_to_pin","pins":[{"designator":"U12","pin":"%s"},{"designator":"PWR_FLAG","pin":"%s"}],"net":"GND","symbolPinType":"open_collector","source":"erc-control.sh, a control"}]\n' "$1" "$2"
}
echo "== 9. an allowance naming U12 pin 4 (N/C, on GND, typed free) is refused by the model check"
allow 4 1 >"$work/pin4.json"
if PAGES_ERC_ALLOWANCES_TABLE="$work/pin4.json" sh "$pages/verify.sh" "$board" expr_ref "$er" >"$work/er-pin4.log" 2>&1; then
  cat "$work/er-pin4.log" >&2; bad "verify.sh accepted an allowance naming U12 pin 4"
fi
grep -q 'pin 4 is typed free in its library, not open_collector' "$work/er-pin4.log" \
  || { cat "$work/er-pin4.log" >&2; bad "the allowance was not refused for pin 4's type"; }
echo "   refused as expected: $(grep -o 'h7-platform:LM66100DCK pin 4 is typed free[^;]*' "$work/er-pin4.log" | head -1)"

echo "== 10. a PWR_FLAG partner other than the flag's pin 1 is refused"
allow 5 2 >"$work/flag2.json"
if PAGES_ERC_ALLOWANCES_TABLE="$work/flag2.json" sh "$pages/verify.sh" "$board" expr_ref "$er" >"$work/er-flag2.log" 2>&1; then
  cat "$work/er-flag2.log" >&2; bad "verify.sh accepted a PWR_FLAG partner on pin 2"
fi
grep -q "a PWR_FLAG partner is the flag's pin 1, not pin 2" "$work/er-flag2.log" \
  || { cat "$work/er-flag2.log" >&2; bad "the allowance was not refused for the partner's pin"; }
echo "   refused as expected"

# Controls 11 to 14 (h7 pedal pages plan, Task 9c): the one-item allowance (pin_not_driven) and the
# codec page's two, ruling CR-PEDAL-CODEC-VIN-AWAITING-ERC (U9's VINL and VINR, inputs whose driver is
# in the adc_drv block, which the model does not hold yet).
cd_="$board/codec.kicad_sch"
VINL='Symbol U9 Pin 25 \[V_{IN}L, Input, Line\]'
VINR='Symbol U9 Pin 26 \[V_{IN}R, Input, Line\]'

echo "== 11. the committed codec page verifies, its two ERC errors excused by CR-PEDAL-CODEC-VIN-AWAITING-ERC"
sh "$pages/verify.sh" "$board" codec "$cd_" >"$work/cd.log" 2>&1 || { cat "$work/cd.log" >&2; bad "the committed codec page did not verify"; }
grep -q '^sheet /codec/: errors 2 (2 excused by a declared allowance), warnings 0' "$work/cd.log" \
  || { cat "$work/cd.log" >&2; bad "/codec/ is not at 2 errors, both excused, and 0 warnings"; }
grep -q "^excused: error pin_not_driven on /codec/ under CR-PEDAL-CODEC-VIN-AWAITING-ERC: $VINL" "$work/cd.log" \
  || { cat "$work/cd.log" >&2; bad "U9's VINL is not among the excused errors"; }
grep -q "^excused: error pin_not_driven on /codec/ under CR-PEDAL-CODEC-VIN-AWAITING-ERC: $VINR" "$work/cd.log" \
  || { cat "$work/cd.log" >&2; bad "U9's VINR is not among the excused errors"; }
echo "   pass: $(grep -c '^excused: ' "$work/cd.log") excused, U9 pins 25 and 26"

echo "== 12. no allowance (test override, an empty table): the codec page fails on U9's VINL and VINR"
if PAGES_ERC_ALLOWANCES_TABLE="$work/no-allow.json" sh "$pages/verify.sh" "$board" codec "$cd_" >"$work/cd-none.log" 2>&1; then
  cat "$work/cd-none.log" >&2; bad "verify.sh passed the codec page with no allowance"
fi
grep -q 'TEST OVERRIDE' "$work/cd-none.log" || { cat "$work/cd-none.log" >&2; bad "the override was not announced"; }
grep -q "at pin_not_driven: $VINL" "$work/cd-none.log" && grep -q "at pin_not_driven: $VINR" "$work/cd-none.log" \
  || { cat "$work/cd-none.log" >&2; bad "verify.sh failed, but not on U9's VINL and VINR"; }
grep -q '^sheet /codec/: errors 2, warnings 0' "$work/cd-none.log" || { cat "$work/cd-none.log" >&2; bad "/codec/ carries errors other than the two"; }
echo "   fails as expected: /codec/ errors 2, pin_not_driven on U9 pins 25 and 26"

# A one-item allowance on the codec page; the model check or the parse must refuse each.
one() {
  printf '[{"ruling":"erc-control.sh","sheet":"/codec/","type":"%s","pins":[{"designator":"U9","pin":"%s"}],"net":"VINL","symbolPinType":"input","source":"erc-control.sh, a control"}]\n' "$1" "$2"
}
echo "== 13. a one-item allowance naming U9 pin 15 (RST, an input on CODEC_RST_N) for VINL is refused by the model check"
one pin_not_driven 15 >"$work/rst.json"
if PAGES_ERC_ALLOWANCES_TABLE="$work/rst.json" sh "$pages/verify.sh" "$board" codec "$cd_" >"$work/cd-rst.log" 2>&1; then
  cat "$work/cd-rst.log" >&2; bad "verify.sh accepted a VINL allowance naming U9 pin 15"
fi
grep -q 'U9 pin 15 is on net CODEC_RST_N in the model, not on VINL' "$work/cd-rst.log" \
  || { cat "$work/cd-rst.log" >&2; bad "the allowance was not refused for pin 15's net"; }
echo "   refused as expected"

echo "== 14. a one-item allowance of a two-item type (pin_to_pin) is refused"
one pin_to_pin 25 >"$work/one-p2p.json"
if PAGES_ERC_ALLOWANCES_TABLE="$work/one-p2p.json" sh "$pages/verify.sh" "$board" codec "$cd_" >"$work/cd-p2p.log" 2>&1; then
  cat "$work/cd-p2p.log" >&2; bad "verify.sh accepted a one-item pin_to_pin allowance"
fi
grep -q '"pins" must be an array of exactly two (designator, pin) objects' "$work/cd-p2p.log" \
  || { cat "$work/cd-p2p.log" >&2; bad "the allowance was not refused for its item count"; }
echo "   refused as expected"

echo "erc-control.sh: every control came out as stated"
