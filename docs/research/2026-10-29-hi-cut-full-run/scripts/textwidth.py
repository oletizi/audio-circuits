"""Measure the RENDERED width of a value field, in sheet millimetres.

The capacitor pitch is the one proportion this run had to choose for itself, and
`EVALUATING-DRAWINGS.md` P3 forbids copying it from the reference page: the
hi-boost run's own finding is that low-cut's 12.7 mm pitch was measurably wrong
for a different part set. So the pitch is derived from a MEASUREMENT of how wide
this board's widest value actually draws, not from a glyph-width formula.

Method: render the sheet at a stated density, crop a box around one field's
anchor that is known to contain nothing else, and report the ink extent. The
crop box is a literal and the script prints it, so a box that caught a
neighbour is visible rather than silent.

POSITIVE CONTROL: the same measurement over a box known to be EMPTY must report
no ink. Without it, a crop that landed off the page and a field that draws
nothing are the same reading.

usage: textwidth.py <sheet.kicad_sch> <cx_mm> <cy_mm> <halfw_mm> <halfh_mm>
                    <empty_cx_mm> <empty_cy_mm>
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
DENSITY = 600
PPMM = DENSITY / 25.4
INK = 128          # 8-bit grey; the stroke font draws near-black


def render(sch, out):
    pdf = out / "page.pdf"
    subprocess.run([KC, "sch", "export", "pdf", "-o", str(pdf), sch],
                   check=True, capture_output=True)
    png = out / "page.png"
    subprocess.run(["magick", "-density", str(DENSITY), str(pdf),
                    "-background", "white", "-alpha", "remove", str(png)],
                   check=True, capture_output=True)
    return np.asarray(Image.open(png).convert("L")).astype(int)


def extent(img, cx, cy, hw, hh, tag):
    x0, x1 = int((cx - hw) * PPMM), int((cx + hw) * PPMM)
    y0, y1 = int((cy - hh) * PPMM), int((cy + hh) * PPMM)
    sub = img[y0:y1, x0:x1]
    dark = sub < INK
    print(f"  {tag}: crop ({cx - hw:.2f},{cy - hh:.2f})-({cx + hw:.2f},{cy + hh:.2f}) mm "
          f"= {sub.shape[1]}x{sub.shape[0]} px, dark pixels {int(dark.sum())}")
    if not dark.any():
        return None
    cols = np.where(dark.any(axis=0))[0]
    rows = np.where(dark.any(axis=1))[0]
    w = (cols[-1] - cols[0] + 1) / PPMM
    h = (rows[-1] - rows[0] + 1) / PPMM
    left = (cx - hw) + cols[0] / PPMM
    right = (cx - hw) + (cols[-1] + 1) / PPMM
    print(f"      ink x {left:.3f} .. {right:.3f} mm   width {w:.3f} mm   "
          f"height {h:.3f} mm")
    return left, right, w, h


def main():
    sch = sys.argv[1]
    cx, cy, hw, hh, ex, ey = (float(v) for v in sys.argv[2:8])
    with tempfile.TemporaryDirectory() as td:
        img = render(sch, Path(td))
    print(f"rendered at {DENSITY} dpi, {img.shape[1]}x{img.shape[0]} px")
    control = extent(img, ex, ey, hw, hh, "POSITIVE CONTROL (box expected empty)")
    if control is not None:
        raise SystemExit("the control box is not empty, so a measurement from "
                         "the real box cannot be attributed to the field alone")
    got = extent(img, cx, cy, hw, hh, "FIELD")
    if got is None:
        raise SystemExit("no ink in the field box - the crop missed it")


main()
