#!/bin/sh
# Controls for verify.sh's ERC verdict (issue 32). Each control must come out as stated, or this
# script exits non-zero naming it.
#
#  1. positive: the committed power page verifies (exit 0).
#  2. negative, end to end: the power page with its two placed PWR_FLAGs removed (the reviewer's
#     reproduction) fails verify.sh, and erc_sheets.py names power_pin_not_driven on /power/.
#  3-6. negative, erc_sheets.py alone on synthetic reports: the target sheet absent; an error on the
#     target; a root error other than label_dangling; an unexpected extra sheet. And one positive:
#     label_dangling on the root only, which must pass.
#  8. negative, ruling CR-MODULE-PWR-FLAGS: the power page with one more PWR_FLAG, on 3V3_D (whose
#     single flag lives on the root, pwr-flag-homes.ts), fails verify.sh, and flag-check.ts names
#     3V3_D and the root.
#  9. positive, the same ruling: a block page with a power input on GND and NO flag of its own passes
#     its ERC under the one-block root, because the root's GND stub carries the flag. The page is the
#     committed swd draft (J3's GND and VTref are power inputs) with only the committed
#     hierarchical-labels.ts op-list applied, which is what turns a draft's labels into the block's
#     boundary; no part, wire or other label moves. Shown first: the same sheet alone reports
#     power_pin_not_driven, so the pass under the root is the stub flags' doing.
# 10. positive, ruling CR-MODULE-CROSS-PAGE-DRIVERS: the committed qspi page verifies, /qspi/ at
#     0 errors and 0 warnings, with the stand-in driver on FLASH_CLK's stub.
# 11. negative, the same ruling: with the table overridden to omit FLASH_CLK's entry (the
#     H7_CROSS_PAGE_DRIVERS_TABLE test override; the committed table is untouched), the same run
#     fails with pin_not_driven on U4's CLK.
# 12. negative, the same ruling: an entry naming a U1 pin that is not on FLASH_CLK is refused by
#     the model check in cross-page-drivers.ts, which names the pin and the net.
# 13. ruling CR-MODULE-PORT-LABEL-CHECK: port-label-control.sh's controls (all eight committed pages
#     verify; a copy of interface with two one-pin labels swapped and a copy of qspi with one label
#     deleted each fail, naming the port; Wiring.op_list refuses a label on another net's wire).
#
# usage: sh erc-control.sh
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
page="$(cd "$here/../.." && pwd)/power.kicad_sch"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

bad() {
  echo "erc-control.sh: CONTROL FAILED - $1" >&2
  exit 1
}

echo "== 1. committed power page verifies"
sh "$here/verify.sh" power "$page" >"$work/pos.log" 2>&1 || { cat "$work/pos.log" >&2; bad "the committed power page did not verify"; }
echo "   pass"

echo "== 2. power page without its PWR_FLAGs fails"
python3 "$here/strip_pwr_flags.py" "$page" "$work/power.kicad_sch" 2
if sh "$here/verify.sh" power "$work/power.kicad_sch" >"$work/neg.log" 2>&1; then
  cat "$work/neg.log" >&2; bad "verify.sh passed a power page with its PWR_FLAGs removed"
fi
grep -q 'FAIL - the block.s own sheet /power/ has 2 ERC error(s): power_pin_not_driven' "$work/neg.log" \
  || { cat "$work/neg.log" >&2; bad "verify.sh failed, but not on /power/'s power_pin_not_driven"; }
echo "   fails as expected"

synth() {
  printf '%s' "$2" >"$work/$1.json"
}
expect() {
  want="$1"; name="$2"
  if python3 "$here/erc_sheets.py" "$work/$name.json" power >"$work/$name.log" 2>&1; then got=0; else got=1; fi
  [ "$got" = "$want" ] || { cat "$work/$name.log" >&2; bad "$name: erc_sheets.py exit $got, expected $want"; }
  echo "   $name: exit $got as expected"
}

echo "== 3-7. erc_sheets.py on synthetic reports"
synth absent '{"sheets":[{"path":"/","violations":[]}]}'
expect 1 absent
synth target-error '{"sheets":[{"path":"/","violations":[]},{"path":"/power/","violations":[{"severity":"error","type":"pin_not_connected"}]}]}'
expect 1 target-error
synth root-other '{"sheets":[{"path":"/","violations":[{"severity":"error","type":"pin_not_connected"}]},{"path":"/power/","violations":[]}]}'
expect 1 root-other
synth extra-sheet '{"sheets":[{"path":"/","violations":[]},{"path":"/power/","violations":[]},{"path":"/vdda/","violations":[]}]}'
expect 1 extra-sheet
synth root-dangling '{"sheets":[{"path":"/","violations":[{"severity":"error","type":"label_dangling"},{"severity":"warning","type":"lib_symbol_mismatch"}]},{"path":"/power/","violations":[{"severity":"warning","type":"lib_symbol_mismatch"}]}]}'
expect 0 root-dangling

root="$(cd "$here/../../../../.." && pwd)"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
akcli="$root/draughting/venv-akcli/bin/akcli"

echo "== 8. power page with a PWR_FLAG on 3V3_D fails, naming 3V3_D"
mkdir "$work/extra"
cp "$page" "$work/extra/power.kicad_sch"
python3 "$here/flag_at_label.py" "$work/extra/power.kicad_sch" 3V3_D >"$work/extra/ops.json"
"$akcli" draw "$work/extra/power.kicad_sch" --ops "$work/extra/ops.json" --apply 2>&1 | grep -q 'status: APPLIED' \
  || bad "akcli did not place the extra PWR_FLAG on 3V3_D"
if sh "$here/verify.sh" power "$work/extra/power.kicad_sch" >"$work/extra.log" 2>&1; then
  cat "$work/extra.log" >&2; bad "verify.sh passed a power page carrying a PWR_FLAG on 3V3_D"
fi
grep -q 'flag-check.ts: FAIL - power carries a PWR_FLAG on shared net 3V3_D, whose single flag lives on root' "$work/extra.log" \
  || { cat "$work/extra.log" >&2; bad "verify.sh failed, but not with flag-check.ts naming 3V3_D and the root"; }
echo "   fails as expected: $(grep 'flag-check.ts: FAIL' "$work/extra.log")"

# The swd draft's sha256 as RECORD.md ("The drafts every repair starts from") and replay.sh record it.
SWD_DRAFT=a772b4a70a576bf77c940ac686b81a5d6259b442e5eefda3c840f3cc6d637837
echo "== 9. swd draft, hierarchical labels only, no GND flag of its own, passes ERC under its one-block root"
draft="$root/build/draw/h7-module/swd/swd.kicad_sch"
[ -s "$draft" ] || bad "no swd draft at $draft; run make -C boards/h7-module draw first"
[ "$(shasum -a 256 "$draft" | cut -d' ' -f1)" = "$SWD_DRAFT" ] || bad "$draft is not the recorded swd draft ($SWD_DRAFT); run make -C boards/h7-module draw"
mkdir "$work/swd"
cp "$draft" "$work/swd/swd.kicad_sch"
(cd "$root" && bun tools/draught/hierarchical-labels.ts ops circuits/h7-platform/module-board.ts swd "$work/swd/swd.kicad_sch") >"$work/swd/hl.json" \
  || bad "hierarchical-labels.ts ops swd failed"
"$akcli" draw "$work/swd/swd.kicad_sch" --ops "$work/swd/hl.json" --apply 2>&1 | grep -q 'status: APPLIED' \
  || bad "akcli did not apply swd's hierarchical-label op-list"
[ "$(python3 "$here/flag_probe.py" "$work/swd/swd.kicad_sch" "$work/swd/probe.kicad_sch")" = 0 ] || bad "the swd sheet carries a PWR_FLAG of its own"
"$kc" sch erc --format json --severity-all -o "$work/swd/alone.json" "$work/swd/swd.kicad_sch" >/dev/null 2>&1 || bad "kicad-cli sch erc failed on the swd sheet alone"
python3 "$here/erc_counts.py" "$work/swd/alone.json" >"$work/swd/alone.log"
grep -q 'error power_pin_not_driven: 2' "$work/swd/alone.log" \
  || { cat "$work/swd/alone.log" >&2; bad "the swd sheet alone does not report power_pin_not_driven on GND and 3V3_D, so it does not test the stub flags"; }
echo "   alone: $(grep power_pin_not_driven "$work/swd/alone.log")"
sh "$here/erc-one-block-root.sh" swd "$work/swd/swd.kicad_sch" >"$work/swd/root.log" 2>&1 \
  || { cat "$work/swd/root.log" >&2; bad "the swd sheet failed its ERC under the one-block root"; }
grep -q '^sheet /swd/: errors 0, warnings 0' "$work/swd/root.log" || { cat "$work/swd/root.log" >&2; bad "/swd/ is not at 0 errors, 0 warnings"; }
echo "   under the one-block root: $(grep '^sheet /swd/' "$work/swd/root.log"); $(grep 'stub PWR_FLAGs' "$work/swd/root.log")"

qspi="$(cd "$here/../.." && pwd)/qspi.kicad_sch"
echo "== 10. committed qspi page verifies: U4's CLK is driven by the FLASH_CLK stand-in"
sh "$here/verify.sh" qspi "$qspi" >"$work/qspi.log" 2>&1 || { cat "$work/qspi.log" >&2; bad "the committed qspi page did not verify"; }
grep -q '^sheet /qspi/: errors 0, warnings 0' "$work/qspi.log" || { cat "$work/qspi.log" >&2; bad "/qspi/ is not at 0 errors, 0 warnings"; }
grep -q 'stand-in drivers on FLASH_CLK (for mcu U1 PF10)' "$work/qspi.log" || { cat "$work/qspi.log" >&2; bad "the one-block root did not place FLASH_CLK's stand-in"; }
echo "   pass: $(grep '^sheet /qspi/' "$work/qspi.log")"

echo "== 11. the same page, with FLASH_CLK's entry removed from the table (test override), fails on U4's CLK"
printf '%s\n' '[]' >"$work/no-drivers.json"
if H7_CROSS_PAGE_DRIVERS_TABLE="$work/no-drivers.json" sh "$here/verify.sh" qspi "$qspi" >"$work/qspi-neg.log" 2>&1; then
  cat "$work/qspi-neg.log" >&2; bad "verify.sh passed the qspi page with no FLASH_CLK stand-in"
fi
grep -q 'TEST OVERRIDE' "$work/qspi-neg.log" || { cat "$work/qspi-neg.log" >&2; bad "the override was not announced, so the run may have used the committed table"; }
grep -q 'at pin_not_driven: Symbol U4 Pin 6 \[CLK, Input, Line\]' "$work/qspi-neg.log" \
  || { cat "$work/qspi-neg.log" >&2; bad "verify.sh failed, but not with pin_not_driven on U4's CLK"; }
echo "   fails as expected: $(grep 'at pin_not_driven' "$work/qspi-neg.log")"

echo "== 12. a table entry naming a pin not on its net is refused by the model check"
printf '%s\n' '[{"net":"FLASH_CLK","block":"mcu","designator":"U1","pin":"29","pinName":"PF10","source":"erc-control.sh control 12, deliberately wrong"}]' >"$work/bad-pin.json"
mkdir "$work/badpin"
if (cd "$root" && H7_CROSS_PAGE_DRIVERS_TABLE="$work/bad-pin.json" bun "$here/one-block-root.ts" qspi "$work/badpin") >"$work/bad-pin.log" 2>&1; then
  cat "$work/bad-pin.log" >&2; bad "one-block-root.ts accepted an entry whose pin is not on its net"
fi
grep -q 'U1 pin 29 is on .*, not on FLASH_CLK' "$work/bad-pin.log" \
  || { cat "$work/bad-pin.log" >&2; bad "one-block-root.ts refused, but not naming U1 pin 29 as off FLASH_CLK"; }
echo "   refused as expected: $(grep 'U1 pin 29 is on' "$work/bad-pin.log" | head -1)"

echo "== 13. port labels on their ports' nets (port-label-control.sh)"
sh "$here/port-label-control.sh" || bad "port-label-control.sh: a port-label control did not come out as stated (above)"

echo "erc-control.sh: every control came out as stated"
