"""Render a sheet and cut the crops this repair needs out of it, in sheet mm.

Every rectangle is a literal written by hand after reading the geometry dump.
Nothing is computed from the component list.

Adapted from docs/research/2026-10-29-hi-boost-full-run/crop.py.

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
    # The group the reviewer cropped, with the band below it, so a reader can
    # see what the group box encloses as well as what is in it.
    "lo-boost": (166, 28, 222, 88),
    # Tight on SI7 and its ground, Reference and Value visible. Wide enough to
    # carry SI6 and the rail, because repair class 5 is only visible with the
    # neighbours in frame.
    "si7-ground": (182, 38, 218, 84),
    # The Mid group, which is the measured precedent for the ground arrangement
    # and for the group box's bottom margin.
    "mid-precedent": (52, 28, 76, 68),
    # The whole top band of the page, so the Lo boost group is seen beside the
    # three groups it sits next to rather than on its own.
    "top-band": (14, 28, 248, 90),
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
