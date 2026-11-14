#!/bin/sh
# Generate ONE placement candidate from the pre-placement board, by the route
# make/pcb.mk documents: the geometry (outline, then the four locked mounting
# holes), the resolved intent stamped with that board's sha256, then place_seed
# against it, then the documented grading path.
#
#   seed-candidate.sh <repo> <dest-dir> <seed> [extra place_seed args...]
#
# Nothing here writes circuits/pt2399-core/pt2399-core.kicad_pcb.
set -eu
REPO="$1"
DEST="$2"
SEED="$3"
shift 3

mkdir -p "$DEST"
BOARD="$DEST/pt2399-core.kicad_pcb"
git -C "$REPO" show b926f69:circuits/pt2399-core/pt2399-core.kicad_pcb > "$BOARD"
cp "$REPO/circuits/pt2399-core/pt2399-core.kicad_pro" "$DEST/pt2399-core.kicad_pro"
cp "$REPO/circuits/pt2399-core/pt2399-core.kicad_dru" "$DEST/pt2399-core.kicad_dru"
cp "$REPO/circuits/pt2399-core/pt2399-core.kicad_sch" "$DEST/pt2399-core.kicad_sch"
cp "$REPO/circuits/pt2399-core/fp-lib-table" "$DEST/fp-lib-table"
rm -rf "$DEST/pt2399-core.pretty"
cp -R "$REPO/circuits/pt2399-core/pt2399-core.pretty" "$DEST/pt2399-core.pretty"

bun "$REPO/tools/pcb/board-outline.ts" "$BOARD" --write-declared \
    "$REPO/circuits/pt2399-core/floorplan-intent.json" 10 10 "7a110000-0000-4000-8000-00000000ed9e"
bun "$REPO/tools/pcb/place-mounting-holes.ts" "$BOARD" "$REPO/circuits/pt2399-core/placement-rules.json" --write
bun "$REPO/tools/pcb/resolved-intent.ts" "$BOARD" "$REPO/circuits/pt2399-core/floorplan-intent.json" \
    "$DEST/resolved-intent.json" "$REPO/circuits/pt2399-core/placement-rules.json"

cd "$REPO/.tools/krt"
env -u PYTHONHOME -u PYTHONPATH .venv/bin/python py_placer/place_seed.py \
    "$BOARD" "$DEST/seeded.kicad_pcb" --intent "$DEST/resolved-intent.json" \
    --force --seed "$SEED" "$@" || echo "place_seed EXIT=$?"
