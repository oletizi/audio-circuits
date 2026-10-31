"""Render a sheet and cut named crops out of it, in sheet millimetres.

Every rectangle below is a literal written by hand after reading the geometry
dump. Nothing is computed from the component list.

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
    "junction-j1":   (28, 42, 70, 74),
    "junction-j2":   (34, 72, 70, 98),
    "hi-boost":      (66, 42, 108, 80),
    "mid":           (106, 42, 128, 76),
    "hi-cut":        (126, 42, 224, 82),
    "lo-boost":      (222, 42, 268, 78),
    "lo-cut":        (28, 98, 212, 145),
    "lo-cut-left":   (28, 98, 110, 145),
    "lo-cut-right":  (104, 98, 212, 145),
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
