"""Where two renders differ, as row bands AND the column bands inside each one.

`pixeldiff.py` reports row bands and column bands separately, which is already
better than a bounding box - but on a page where one changed group spans the
full width, the column band is the whole page and says nothing about the small
row bands. This reports the columns that differ WITHIN each row band, so a 2 mm
band 200 mm away from the repair is localised rather than absorbed.

POSITIVE CONTROL: the same comparison of the BEFORE image against itself must
report zero differing pixels, and against its own inverse must report a large
number. A comparator that cannot find a difference it was handed makes the real
result meaningless.

usage: pixelbands.py <before.png> <after.png>
"""
import sys

import numpy as np
from PIL import Image

DPI = 200
PPMM = DPI / 25.4
THRESHOLD = 25


def load(p):
    return np.asarray(Image.open(p).convert("L")).astype(int)


def bands(idx, gap=5):
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


def mm(v):
    return round(float(v) / PPMM, 2)


def main():
    a, b = load(sys.argv[1]), load(sys.argv[2])
    if a.shape != b.shape:
        raise SystemExit(f"different image sizes: {a.shape} vs {b.shape}")
    if int((np.abs(a - a) > THRESHOLD).sum()) != 0:
        raise SystemExit("positive control failed: an image differs from itself")
    inverted = int((np.abs(a - (255 - a)) > THRESHOLD).sum())
    if inverted == 0:
        raise SystemExit("positive control failed: an image does not differ "
                         "from its own inverse")
    print(f"positive control: self 0 differing pixels, inverse {inverted}")

    d = np.abs(a - b) > THRESHOLD
    print(f"image {a.shape[1]}x{a.shape[0]} px at {DPI} dpi, "
          f"differing pixels {int(d.sum())}")
    rows = np.where(d.any(axis=1))[0]
    for r0, r1 in bands(rows):
        sub = d[r0:r1 + 1]
        cols = np.where(sub.any(axis=0))[0]
        print(f"  rows {mm(r0):7.2f} .. {mm(r1):7.2f} mm   "
              f"{int(sub.sum()):7d} px   columns "
              f"{[(mm(c0), mm(c1)) for c0, c1 in bands(cols, gap=40)]}")


main()
