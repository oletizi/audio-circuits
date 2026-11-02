#!/bin/sh
# Replay the fixed-stage-one repair from the sheet as committed in 288bd0a
# (sha256 402e0f38...) to the repaired sheet, in a work directory, and check
# every sha256 on the way. Exits non-zero on any mismatch.
#
# Fails loudly: the work directory must be new or empty (no sheet or akcli
# backup left by an earlier run can stand in for this one), every command's
# exit status is checked through pipes (pipefail), and each `akcli draw` must
# report that it APPLIED - its dry-run also exits 0 having written nothing
# (TOOLING.md step 4).
#
# usage: sh replay.sh <new-or-empty-work-dir>
set -eu
set -o pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../../.." && pwd)"
akcli="$root/draughting/venv-akcli/bin/akcli"
FROM=402e0f383660892a8f794063c3629fa10e7001b20c305e405f4542dee0635493
TO=31a5e0c47ebf3a2ee1d94e6d3c0d62d534137e86690863abfbe9411fba04422e

fail() {
  echo "replay.sh: FAILED - $1" >&2
  exit 1
}

[ "$#" -eq 1 ] || fail "expected one argument, a new or empty work directory; got $#"
mkdir -p "$1"
work="$(cd "$1" && pwd)"
[ -z "$(ls -A "$work")" ] || fail "$work is not empty; replay into a new or empty directory so nothing from an earlier run is read"
[ -x "$akcli" ] || fail "akcli not found at $akcli"
sch="$work/staged-board.kicad_sch"
git -C "$root" show 288bd0a:circuits/transistor-preamp/staged-board.kicad_sch > "$sch" \
  || fail "git show 288bd0a:circuits/transistor-preamp/staged-board.kicad_sch failed"
git -C "$root" show 288bd0a:circuits/transistor-preamp/staged-board.kicad_pro > "$work/staged-board.kicad_pro" \
  || fail "git show 288bd0a:circuits/transistor-preamp/staged-board.kicad_pro failed"

check() {
  got="$(shasum -a 256 "$sch" | cut -d' ' -f1)" || fail "could not hash $sch"
  [ "$got" = "$2" ] || fail "after $1 the sheet is $got, expected $2"
  echo "after $1: $got"
}

apply() {
  "$akcli" plan "$sch" --ops "$here/$1" | tail -5 || fail "akcli plan $1 failed"
  log="$("$akcli" draw "$sch" --ops "$here/$1" --apply)" || fail "akcli draw $1 --apply failed"
  echo "$log" | tail -1
  echo "$log" | grep -q 'status: APPLIED' || fail "akcli draw $1 did not report APPLIED - nothing was written"
}

check "the starting sheet" "$FROM"
apply 01-fixed-stage-one.json
apply 02-feedback-row.json
python3 "$here/03-text-edits.py" "$sch" || fail "03-text-edits.py failed"
check "01, 02 and 03" "$TO"
