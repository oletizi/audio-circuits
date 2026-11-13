#!/usr/bin/env bash
# Replay the dual op-amp test board (spec C6) from a fresh `make draw` to the committed sheet, in a
# work directory, checking the intent and the sheet's sha256 on the way. Exits non-zero on any
# mismatch. Test data: this page is never sent for review and carries no verdict.
#
# NO REPAIR IS APPLIED. The fixture exists to prove a multi-unit package round-trips; copperhead's
# draft already agrees with the model (tests/kicad/multi-unit.test.ts), so the committed sheet IS
# the draft, and the repair this replays is the empty one.
#
# The fixture has no boards/ directory (a perfboard.json committed in the repository would be found
# by the repo-wide declaration walk and checked as a board), so the declaration `make draw` reads is
# written into the work directory, in a directory named for the board, and `tools/cli/draw.ts` -
# the program `make draw` runs - is run from there. It writes build/draw/dual-opamp-board inside
# the repository, as `make draw` does. The same arrangement as tests/fixtures/two-block-board.
#
# usage: bash replay.sh <new-or-empty-work-dir>
set -eu
set -o pipefail
here="$(cd "$(dirname "$0")" && pwd)"
drafted="$(cd "$here/.." && pwd)"
root="$(cd "$here/../../../../.." && pwd)"
module="$root/tests/fixtures/dual-opamp-board/dual-opamp-board.ts"
board=dual-opamp-board
PAGE=b345f056f147bd2552dbd2f5acecd2177ae0d9f997e72ba36e48b0b049bdfdb4

fail() {
  echo "replay.sh: FAILED - $1" >&2
  exit 1
}

[ "$#" -eq 1 ] || fail "expected one argument, a new or empty work directory; got $#"
mkdir -p "$1"
work="$(cd "$1" && pwd)"
[ -z "$(ls -A "$work")" ] || fail "$work is not empty; replay into a new or empty directory so nothing from an earlier run is read"
[ -f "$module" ] || fail "the fixture circuit module is not at $module"

mkdir -p "$work/$board"
printf '{"kind":"pcb","circuit":"%s","export":"dualOpampBoard"}\n' "$module" > "$work/$board/perfboard.json"
(cd "$work/$board" && bun "$root/tools/cli/draw.ts") > "$work/make-draw.log" 2>&1 \
  || fail "tools/cli/draw.ts failed; see $work/make-draw.log"
grep -q '^NO INDEPENDENT NETLIST:' "$work/make-draw.log" || fail "make draw printed no NO INDEPENDENT NETLIST block"
cmp -s "$root/build/draw/$board.intent.json" "$here/intent.json" \
  || fail "the intent make draw generated differs from the committed intent.json - the model has changed since this draft"
echo "the intent make draw generated matches the committed intent.json"
cp "$root/build/draw/$board/$board.kicad_sch" "$work/$board.kicad_sch" || fail "make draw wrote no sheet"
got="$(shasum -a 256 "$work/$board.kicad_sch" | cut -d' ' -f1)" || fail "could not hash the sheet"
[ "$got" = "$PAGE" ] || fail "after make draw the sheet is $got, expected $PAGE"
echo "after make draw: $got"
cmp -s "$work/$board.kicad_sch" "$drafted/$board.kicad_sch" || fail "the replayed sheet differs from the committed one"
echo "the replayed sheet is byte-identical to the committed sheet"
