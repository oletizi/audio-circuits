"""Render a sheet and cut named crops out of it, in sheet millimetres.

Every rectangle below is a literal written by hand after reading the geometry
dump and the full render. Nothing is computed from the component list.

Adapted from docs/research/2026-10-29-low-cut-full-run/crop.py; the rectangles
are this board's.

usage: crop.py <sheet.kicad_sch> <out-prefix> [crop-name ...]
"""
import os
import subprocess
import sys

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
DENSITY = 300
PPMM = DENSITY / 25.4

# name -> (x1, y1, x2, y2) in sheet millimetres
CROPS = {
    "junction-j1": (16, 38, 56, 62),
    "junction-j2": (16, 60, 56, 84),
    "hi-cut": (74, 34, 170, 72),
    "hi-boost": (16, 88, 236, 156),
    "q-chain": (18, 92, 98, 122),
    "selector": (52, 118, 112, 152),
    "bank-left": (84, 100, 156, 148),
    "bank-right": (150, 100, 232, 148),
    "coil-row": (84, 100, 232, 124),
}


def main():
    sch, prefix = sys.argv[1], sys.argv[2]
    names = sys.argv[3:] or list(CROPS)
    out = os.path.dirname(prefix) or "."
    os.makedirs(out, exist_ok=True)
    pdf = prefix + ".pdf"
    subprocess.run([KC, "sch", "export", "pdf", "-o", pdf, sch],
                   check=True, capture_output=True)
    full = prefix + ".png"
    subprocess.run(["magick", "-density", str(DENSITY), pdf,
                    "-background", "white", "-alpha", "remove", full],
                   check=True, capture_output=True)
    print("full:", full)
    for n in names:
        x1, y1, x2, y2 = CROPS[n]
        px, py = int(x1 * PPMM), int(y1 * PPMM)
        w, h = int((x2 - x1) * PPMM), int((y2 - y1) * PPMM)
        dst = f"{prefix}-{n}.png"
        subprocess.run(["magick", full, "-crop", f"{w}x{h}+{px}+{py}",
                        "+repage", dst], check=True, capture_output=True)
        print("crop:", dst, f"({x1},{y1})-({x2},{y2}) mm")


main()
