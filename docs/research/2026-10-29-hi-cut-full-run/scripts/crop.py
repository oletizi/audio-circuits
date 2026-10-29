"""Render a sheet and cut the crops this run needs out of it, in sheet mm.

Every rectangle is a literal written by hand after reading the geometry dump.
Nothing is computed from the component list. The SAME boxes are cut from both
sides of the before/after pair, because a crop pair is only a comparison if it
frames the same region of the page.

Adapted from docs/research/2026-10-29-hi-boost-hairpin-fix/scripts/crop.py.

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
    # The whole re-authored group, which is the largest changed region.
    "hi-cut-whole": (46, 85, 278, 137),
    # The capacitor bank in three overlapping close crops. Repair class 5 -
    # a moved part's fields - is invisible to every automated check, so every
    # part whose Reference and Value were rewritten is in one of these.
    "bank-left": (96, 93, 172, 128),
    "bank-mid": (158, 93, 232, 128),
    "bank-right": (206, 93, 278, 128),
    # The pot, the 430R and the selector: the west end of the chain.
    "west-chain": (46, 93, 118, 134),
    # The rail's east end and the one `lo_boost_in` label the group keeps.
    "rail-east": (222, 90, 278, 104),
    # J1, where the PWR_FLAG diamond was drawn inside the `out` label.
    "junction-j1": (56, 36, 96, 62),
    # J2, five stacked ground symbols becoming one on a trunk.
    "junction-j2": (54, 58, 96, 86),
    # The Lo boost stand-in group, whose duplicate `lo_boost_in` pair was
    # collapsed into a wire.
    "lo-boost": (152, 28, 206, 72),
    # The whole stand-in band, so each group is seen beside its neighbours.
    "top-band": (46, 28, 226, 90),
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
