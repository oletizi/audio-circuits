"""Where, on the page, do two renders differ? In sheet millimetres.

The check no netlist comparison can make: a repair is supposed to have changed
ONE group, and this says whether anything else on the page moved. The netlist
cannot see a moved symbol, a restyled field or a re-routed wire, and the
verification table's counts are page-wide totals that a compensating pair of
changes could leave untouched.

It reports the bands of rows and columns that differ rather than one bounding
box, because a bounding box over two distant changes spans everything between
them and hides the second. That is not hypothetical: the first before/after
pair for this repair reported a box 148 mm tall, and the second band in it
turned out to be the title block printing the sheet's FILE NAME.

POSITIVE CONTROL: the same comparison of the BEFORE image against itself must
report zero differing pixels. A comparator that cannot find a difference it was
handed - or one that finds differences everywhere - makes the real result
meaningless either way, so both directions are checked.

Needs numpy and pillow: `pip install numpy pillow` into the akcli venv.

usage: pixeldiff.py <before.png> <after.png>
"""
import sys

import numpy as np
from PIL import Image

DPI = 200
PPMM = DPI / 25.4
THRESHOLD = 25          # 8-bit grey levels; anti-aliasing sits well below this


def load(p):
    return np.asarray(Image.open(p).convert("L")).astype(int)


def bands(idx, gap=5):
    """Contiguous runs of indices, split where they are more than `gap` apart."""
    if len(idx) == 0:
        return []
    out, start, prev = [], idx[0], idx[0]
    for v in idx[1:]:
        if v > prev + gap:
            out.append((start, prev))
            start = v
        prev = v
    out.append((start, prev))
    return out


def main():
    a, b = load(sys.argv[1]), load(sys.argv[2])
    if a.shape != b.shape:
        raise SystemExit(f"different image sizes: {a.shape} vs {b.shape}")

    self_diff = int((np.abs(a - a) > THRESHOLD).sum())
    if self_diff != 0:
        raise SystemExit(f"positive control failed: an image differs from "
                         f"itself in {self_diff} pixels")
    inverted = int((np.abs(a - (255 - a)) > THRESHOLD).sum())
    if inverted == 0:
        raise SystemExit("positive control failed: an image does not differ "
                         "from its own inverse, so the comparator is dead")
    print(f"positive control: image vs itself {self_diff} differing pixels; "
          f"image vs its inverse {inverted}")

    d = np.abs(a - b) > THRESHOLD
    print(f"image {a.shape[1]}x{a.shape[0]} px at {DPI} dpi")
    print(f"differing pixels: {int(d.sum())}")
    rows = np.where(d.any(axis=1))[0]
    cols = np.where(d.any(axis=0))[0]
    print("row bands (sheet mm):",
          [(round(float(s) / PPMM, 2), round(float(e) / PPMM, 2))
           for s, e in bands(rows)])
    print("column bands (sheet mm):",
          [(round(float(s) / PPMM, 2), round(float(e) / PPMM, 2))
           for s, e in bands(cols)])


main()
