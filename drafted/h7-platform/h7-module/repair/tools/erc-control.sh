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

echo "erc-control.sh: every control came out as stated"
