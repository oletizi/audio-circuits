#!/bin/sh
# ERC on one h7-module block sheet under a root holding only it (one-block-root.ts): each
# hierarchical label meets a sheet pin, as under the module's real root, so the sheet-alone run's
# pin_not_connected errors on the hierarchical labels ("non-existent parent sheet") do not arise.
# The root's stubs carry a PWR_FLAG on each net whose single flag lives off this page
# (pwr-flag-homes.ts, ruling CR-MODULE-PWR-FLAGS), and a stand-in driver on each signal net whose
# driver is on another page (cross-page-drivers.ts, ruling CR-MODULE-CROSS-PAGE-DRIVERS). Reported per sheet: the block's own is
# /<block>/; the root / holds the stubs, whose labels dangle with one block. erc_sheets.py is the
# verdict, given the declared ERC allowances (erc-allowances.ts, ruling CR-MODULE-VCAP-ERC), which
# are held to the model first. Called by verify.sh, and by erc-control.sh's positive control on a block draft.
#
# Fails loudly: a fresh temporary directory, kicad-cli's and akcli's status checked, the report
# required to exist and be non-empty.
#
# usage: sh erc-one-block-root.sh <block> <sheet.kicad_sch>
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../../../.." && pwd)"
kc=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli

fail() {
  echo "erc-one-block-root.sh: FAILED - $1" >&2
  exit 1
}

[ "$#" -eq 2 ] || fail "expected two arguments, the block and the sheet; got $#"
block="$1"
[ -s "$2" ] || fail "$2 does not exist or is empty - nothing to check"
[ -x "$kc" ] || fail "kicad-cli not found at $kc"

ctx="$(mktemp -d)"
trap 'rm -rf "$ctx"' EXIT
cp "$2" "$ctx/$block.kicad_sch"
(cd "$root" && bun "$here/one-block-root.ts" "$block" "$ctx") || fail "one-block-root.ts could not write the root"
log="$("$root/draughting/venv-akcli/bin/akcli" draw "$ctx/one-block-root.kicad_sch" --ops "$ctx/one-block-root.json" --apply 2>&1)" \
  || { echo "$log" >&2; fail "akcli could not apply the one-block root's op-list"; }
echo "$log" | grep -q 'status: APPLIED' || { echo "$log" >&2; fail "akcli did not report APPLIED for the one-block root"; }
"$kc" sch erc --format json --severity-all -o "$ctx/erc.json" "$ctx/one-block-root.kicad_sch" >/dev/null 2>"$ctx/kc.err" \
  || { grep -v '^Fontconfig warning' "$ctx/kc.err" >&2; fail "kicad-cli sch erc exited non-zero on the one-block root"; }
grep -v '^Fontconfig warning' "$ctx/kc.err" >&2 || true
[ -s "$ctx/erc.json" ] || fail "kicad-cli wrote no ERC report for the one-block root"
(cd "$root" && bun "$here/erc-allowances.ts" "$ctx/allowances.json") \
  || fail "erc-allowances.ts refused the declared ERC allowances (named above; ruling CR-MODULE-VCAP-ERC)"
[ -s "$ctx/allowances.json" ] || fail "erc-allowances.ts wrote no allowances file"
python3 "$here/erc_sheets.py" "$ctx/erc.json" "$block" "$ctx/allowances.json" \
  || fail "ERC under the one-block root: the block's sheet has an error, is missing, or the root has an error other than its stubs' (listed above)"
