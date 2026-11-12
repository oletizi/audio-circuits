#!/bin/sh
# Controls for verify.sh's ERC verdict on the carrier page (issue 32, same class as the module's).
#  1. positive: the committed carrier page verifies (exit 0).
#  2. negative: erc_counts.py on a synthetic report carrying one error exits non-zero.
#  3. positive: erc_counts.py on a report carrying only warnings exits 0.
# usage: sh erc-control.sh
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
page="$(cd "$here/.." && pwd)/h7-carrier.generated-do-not-edit.kicad_sch"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

bad() {
  echo "erc-control.sh: CONTROL FAILED - $1" >&2
  exit 1
}

echo "== 1. committed carrier page verifies"
sh "$here/verify.sh" "$page" >"$work/pos.log" 2>&1 || { cat "$work/pos.log" >&2; bad "the committed carrier page did not verify"; }
echo "   pass"

echo "== 2. a report with an ERC error fails"
printf '%s' '{"sheets":[{"path":"/","violations":[{"severity":"error","type":"pin_not_connected"}]}]}' >"$work/e.json"
if python3 "$here/erc_counts.py" "$work/e.json" >/dev/null 2>&1; then bad "erc_counts.py passed a report with an error"; fi
echo "   fails as expected"

echo "== 3. a report with only warnings passes"
printf '%s' '{"sheets":[{"path":"/","violations":[{"severity":"warning","type":"lib_symbol_issues"}]}]}' >"$work/w.json"
python3 "$here/erc_counts.py" "$work/w.json" >/dev/null 2>&1 || bad "erc_counts.py failed a report with only warnings"
echo "   pass"

echo "erc-control.sh: every control came out as stated"
