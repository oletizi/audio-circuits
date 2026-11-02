#!/bin/sh
# Replay the fixed-stage-one repair from the sheet as committed in 288bd0a
# (sha256 402e0f38...) to the repaired sheet, in a work directory, and check
# every sha256 on the way. Exits non-zero on any mismatch.
#
# usage: sh replay.sh <empty-work-dir>
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../../.." && pwd)"
akcli="$root/draughting/venv-akcli/bin/akcli"
FROM=402e0f383660892a8f794063c3629fa10e7001b20c305e405f4542dee0635493
TO=31a5e0c47ebf3a2ee1d94e6d3c0d62d534137e86690863abfbe9411fba04422e

mkdir -p "$1"
work="$(cd "$1" && pwd)"
sch="$work/staged-board.kicad_sch"
git -C "$root" show 288bd0a:circuits/transistor-preamp/staged-board.kicad_sch > "$sch"
git -C "$root" show 288bd0a:circuits/transistor-preamp/staged-board.kicad_pro > "$work/staged-board.kicad_pro"

check() {
  got="$(shasum -a 256 "$sch" | cut -d' ' -f1)"
  if [ "$got" != "$2" ]; then
    echo "replay: after $1 the sheet is $got, expected $2" >&2
    exit 1
  fi
  echo "after $1: $got"
}

check "the starting sheet" "$FROM"
"$akcli" plan "$sch" --ops "$here/01-fixed-stage-one.json" | tail -5
"$akcli" draw "$sch" --ops "$here/01-fixed-stage-one.json" --apply | tail -1
"$akcli" plan "$sch" --ops "$here/02-feedback-row.json" | tail -3
"$akcli" draw "$sch" --ops "$here/02-feedback-row.json" --apply | tail -1
python3 "$here/03-text-edits.py" "$sch"
check "01, 02 and 03" "$TO"
