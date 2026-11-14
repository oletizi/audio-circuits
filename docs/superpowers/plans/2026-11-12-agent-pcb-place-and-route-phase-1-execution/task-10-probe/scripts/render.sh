#!/bin/sh
# Render one routed board for the reviewer. Four views, because a two-layer
# board with a ground pour cannot be read from one: both coppers together, the
# front alone, the back alone (which is where the pour is), and a 3D raytrace of
# each side.
#
#   render.sh <repo> <board.kicad_pcb> <dest-dir>
#
# No judgement is attached to anything this produces. It exists so the reviewer
# can look.
set -eu
REPO="$1"
BOARD="$2"
DEST="$3"
CLI=/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
mkdir -p "$DEST"

"$CLI" pcb export svg --mode-single --page-size-mode 2 --exclude-drawing-sheet \
    --layers F.Cu,B.Cu,F.SilkS,Edge.Cuts --output "$DEST/both-coppers.svg" "$BOARD"
"$CLI" pcb export svg --mode-single --page-size-mode 2 --exclude-drawing-sheet \
    --layers F.Cu,F.SilkS,Edge.Cuts --output "$DEST/front-copper.svg" "$BOARD"
"$CLI" pcb export svg --mode-single --page-size-mode 2 --exclude-drawing-sheet --mirror \
    --layers B.Cu,Edge.Cuts --output "$DEST/back-copper-pour.svg" "$BOARD"
"$CLI" pcb render --side top --width 1600 --height 1100 --quality high \
    --output "$DEST/3d-top.png" "$BOARD"
"$CLI" pcb render --side bottom --width 1600 --height 1100 --quality high \
    --output "$DEST/3d-bottom.png" "$BOARD"
ls -la "$DEST"
