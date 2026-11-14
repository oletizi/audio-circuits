#!/bin/sh
# Stage one candidate board into its own run directory, with every sibling KiCad
# needs: the project (the DRC floor), the custom rules, the schematic (DRC finds
# it by directory + basename) and the project-local footprint library.
set -eu
REPO="$1"
BOARD="$2"
DEST="$3"
mkdir -p "$DEST"
env -u PYTHONHOME -u PYTHONPATH "$REPO/.tools/krt/.venv/bin/python" \
    "$REPO/.tools/krt/py_router/copy_board.py" "$BOARD" "$DEST/pt2399-core.kicad_pcb"
cp "$REPO/circuits/pt2399-core/pt2399-core.kicad_pro" "$DEST/pt2399-core.kicad_pro"
cp "$REPO/circuits/pt2399-core/pt2399-core.kicad_dru" "$DEST/pt2399-core.kicad_dru"
cp "$REPO/circuits/pt2399-core/pt2399-core.kicad_sch" "$DEST/pt2399-core.kicad_sch"
cp "$REPO/circuits/pt2399-core/fp-lib-table" "$DEST/fp-lib-table"
rm -rf "$DEST/pt2399-core.pretty"
cp -R "$REPO/circuits/pt2399-core/pt2399-core.pretty" "$DEST/pt2399-core.pretty"
rm -f "$DEST/pt2399-core.kicad_prl"
ls -la "$DEST"
