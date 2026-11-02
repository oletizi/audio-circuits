#!/bin/sh
# Rebuild boards/transistor-preamp-staged/transistor-preamp-staged.perfboard.vrt
# from the circuit's own netlist export and layout.txt, into <work-dir>, and
# check it is the committed board byte for byte. REPLAY.md says what each step
# is and why; this file is the steps.
#
# Usage, from anywhere inside the repository:
#   sh boards/transistor-preamp-staged/layout/replay.sh <work-dir>
#
# <work-dir> must be new or empty: nothing an earlier run left there can be
# read as this run's result. Every step that cannot run stops the script
# non-zero, naming the step.

set -u

fail() {
  echo "replay.sh: $1" >&2
  exit 1
}

[ "$#" -eq 1 ] || fail "usage: replay.sh <work-dir>"
WORK="$1"

REPO="$(git rev-parse --show-toplevel)" || fail "not inside the repository"
HERE="$REPO/boards/transistor-preamp-staged/layout"
BOARD="$REPO/boards/transistor-preamp-staged/transistor-preamp-staged.perfboard.vrt"
VR="$REPO/.tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute"

# The sha256 the replay must reach. It is the committed board's, and REPLAY.md
# records the same figure.
END_SHA=4e579f9872a0d844972f843562051f7afffadc7f21ed853d2c8bfe5ad6d2ebb9

if [ -e "$WORK" ]; then
  [ -d "$WORK" ] || fail "$WORK exists and is not a directory"
  [ -z "$(ls -A "$WORK")" ] || fail "$WORK is not empty - give a new or empty directory"
else
  mkdir -p "$WORK" || fail "could not create $WORK"
fi

# THE BINARY. The fork is pinned in veroroute.pin and `make veroroute` builds
# it; a binary built from any other commit is not the one this replay was
# recorded with.
[ -x "$VR" ] || fail "no VeroRoute binary at $VR - run make veroroute"
PIN_COMMIT="$(awk '$1 == "commit" { print $2 }' "$REPO/veroroute.pin")"
BUILT_COMMIT="$(cat "$REPO/.tools/veroroute-perfboard/.built-commit" 2>/dev/null)"
[ -n "$PIN_COMMIT" ] || fail "veroroute.pin names no commit"
[ "$PIN_COMMIT" = "$BUILT_COMMIT" ] ||
  fail "the binary was built from '$BUILT_COMMIT', veroroute.pin pins '$PIN_COMMIT' - run make veroroute"

echo "1. export the netlist (tools/perfboard/check.ts exportNetlistFor)"
bun "$HERE/export-net.ts" > "$WORK/staged.net" || fail "step 1: the netlist export failed"
[ -s "$WORK/staged.net" ] || fail "step 1: the netlist export is empty"

echo "2. import it onto a fresh horizontal-strip board"
"$VR" --import "$WORK/staged.net" -o "$WORK/imported.vrt" --strips horizontal ||
  fail "step 2: veroroute --import failed"

echo "3. materialize layout.txt onto it"
"$VR" --materialize "$WORK/imported.vrt" --layout "$HERE/layout.txt" -o "$WORK/staged.vrt" ||
  fail "step 3: veroroute --materialize failed"

echo "4. check the result against the netlist"
"$VR" --check "$WORK/staged.vrt" --netlist "$WORK/staged.net" > "$WORK/check.txt" ||
  fail "step 4: veroroute --check did not pass - see $WORK/check.txt"

echo "5. compare with the expected sha256 and with the committed board"
GOT="$(shasum -a 256 "$WORK/staged.vrt" | awk '{ print $1 }')"
[ "$GOT" = "$END_SHA" ] || fail "step 5: the replay reached $GOT, not $END_SHA"
COMMITTED="$(shasum -a 256 "$BOARD" | awk '{ print $1 }')"
[ "$COMMITTED" = "$END_SHA" ] ||
  fail "step 5: the replay reached $END_SHA, but the board under boards/ is $COMMITTED"

echo "replayed: $WORK/staged.vrt is $GOT, the committed board"
