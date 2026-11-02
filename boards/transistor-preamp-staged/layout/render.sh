#!/bin/sh
# Regenerate the two layout renders committed beside the board:
#   transistor-preamp-staged.perfboard.png         designators
#   transistor-preamp-staged.perfboard.values.png  values
#
# They are rasterized from the build packet's own layout drawings, which
# `make guide` writes from the committed .vrt - so the PNGs show exactly what
# the bench guide shows, and nothing is drawn twice.
#
# Usage, from anywhere inside the repository:
#   sh boards/transistor-preamp-staged/layout/render.sh
#
# Needs: make guide's own toolchain (it refuses by name when one is missing)
# and rsvg-convert (Homebrew librsvg).

set -u

fail() {
  echo "render.sh: $1" >&2
  exit 1
}

REPO="$(git rev-parse --show-toplevel)" || fail "not inside the repository"
BOARD_DIR="$REPO/boards/transistor-preamp-staged"
command -v rsvg-convert > /dev/null || fail "rsvg-convert is not installed (brew install librsvg)"

make -C "$BOARD_DIR" guide || fail "make guide failed"

rsvg-convert -z 1.5 -b white "$BOARD_DIR/guide/layout-designators.svg" \
  -o "$BOARD_DIR/transistor-preamp-staged.perfboard.png" ||
  fail "could not rasterize layout-designators.svg"
rsvg-convert -z 1.5 -b white "$BOARD_DIR/guide/layout-values.svg" \
  -o "$BOARD_DIR/transistor-preamp-staged.perfboard.values.png" ||
  fail "could not rasterize layout-values.svg"

echo "wrote $BOARD_DIR/transistor-preamp-staged.perfboard.png"
echo "wrote $BOARD_DIR/transistor-preamp-staged.perfboard.values.png"
