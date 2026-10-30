"""Measure RENDERED ink inside named boxes of a sheet, in sheet millimetres.

One render, many boxes - the committed `textwidth.py` takes one box per
invocation and re-renders each time, which is 19 renders for the 17 capacitor
values and two label tags this run has to size.

WHY IT MEASURES RATHER THAN COMPUTES. `0.75 * size * len(text)` gives 5.715 mm
for any six characters at size 1.27, where the stroke font draws `2200pF` at
6.858 mm and `.047uF` at 6.223 mm. Character count is not a proxy for text
width, so a pitch derived from one is a pitch derived from the wrong quantity.
`EVALUATING-DRAWINGS.md` P3 also forbids taking the reference page's 15.24 mm
as given: it has to be re-derived for whatever text this page carries.

BOXES ARE LITERALS AND EVERY ONE IS PRINTED with its dark-pixel count, so a box
that caught a neighbour's plate shows up as an implausible width rather than
silently widening the answer.

TWO CONTROLS, both required to pass:
  - an EMPTY box must report no ink. Without it, a crop that fell off the page
    and a field that draws nothing read the same.
  - a box known to contain ink must report some. Without it, a threshold set
    wrong reports "no ink" everywhere.

It renders WITHOUT `-colorspace Gray`: that writes a 16-bit PNG which Pillow
opens as `I;16`, and `.convert("L")` on `I;16` returns all 255 - a fully inked
page reading as blank, with no error. See `framegeom.py`.

usage: inkmeasure.py <sheet.kicad_sch> <boxes.json>

  boxes.json: {"dpi": 600, "boxes": [{"tag": ..., "x1":, "y1":, "x2":, "y2":,
               "expect": "ink"|"empty"}, ...]}
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
INK = 128


def render(sch, out, dpi):
    pdf = out / "page.pdf"
    subprocess.run([KC, "sch", "export", "pdf", "-o", str(pdf), sch],
                   check=True, capture_output=True)
    png = out / "page.png"
    subprocess.run(["magick", "-density", str(dpi), str(pdf),
                    "-background", "white", "-alpha", "remove", str(png)],
                   check=True, capture_output=True)
    im = Image.open(png)
    arr = np.asarray(im.convert("L")).astype(int)
    if (arr < INK).sum() == 0:
        raise SystemExit("REFUSING: the render holds no ink at all (image mode "
                         "%r). A 16-bit I;16 PNG converted to 'L' reads as all "
                         "255." % im.mode)
    return arr


def box_ink(img, b, ppmm):
    x0, x1 = int(round(b["x1"] * ppmm)), int(round(b["x2"] * ppmm))
    y0, y1 = int(round(b["y1"] * ppmm)), int(round(b["y2"] * ppmm))
    if x0 < 0 or y0 < 0 or x1 > img.shape[1] or y1 > img.shape[0]:
        raise SystemExit("REFUSING: box %s falls outside the render" % b["tag"])
    sub = img[y0:y1, x0:x1]
    dark = sub < INK
    n = int(dark.sum())
    if n == 0:
        return None, n
    cols = np.where(dark.any(axis=0))[0]
    rows = np.where(dark.any(axis=1))[0]
    return (b["x1"] + cols[0] / ppmm,
            b["x1"] + (cols[-1] + 1) / ppmm,
            b["y1"] + rows[0] / ppmm,
            b["y1"] + (rows[-1] + 1) / ppmm), n


def main():
    sch, spec_path = sys.argv[1], sys.argv[2]
    spec = json.load(open(spec_path))
    dpi = spec.get("dpi", 600)
    ppmm = dpi / 25.4
    with tempfile.TemporaryDirectory() as td:
        img = render(sch, Path(td), dpi)
    print("sheet %s" % sch)
    print("rendered %d x %d px at %d dpi" % (img.shape[1], img.shape[0], dpi))
    print()
    print("%-22s %9s %9s %8s %8s %7s  %s"
          % ("tag", "ink x1", "ink x2", "width", "height", "px", "verdict"))
    failures = []
    widths = {}
    for b in spec["boxes"]:
        got, n = box_ink(img, b, ppmm)
        want = b.get("expect", "ink")
        if got is None:
            ok = (want == "empty")
            print("%-22s %9s %9s %8s %8s %7d  %s"
                  % (b["tag"], "-", "-", "-", "-", n,
                     "EMPTY as expected" if ok else "NO INK - box missed it"))
        else:
            x1, x2, y1, y2 = got
            ok = (want == "ink")
            widths[b["tag"]] = x2 - x1
            print("%-22s %9.3f %9.3f %8.3f %8.3f %7d  %s"
                  % (b["tag"], x1, x2, x2 - x1, y2 - y1, n,
                     "" if ok else "INK IN A BOX EXPECTED EMPTY"))
        if not ok:
            failures.append(b["tag"])
    print()
    if widths:
        w = max(widths.items(), key=lambda kv: kv[1])
        print("WIDEST: %s at %.3f mm" % (w[0], w[1]))
        n = min(widths.items(), key=lambda kv: kv[1])
        print("NARROWEST: %s at %.3f mm" % (n[0], n[1]))
    if failures:
        raise SystemExit("REFUSING: %d box(es) did not match expectation: %s"
                         % (len(failures), ", ".join(failures)))
    print("every box matched its expectation (controls included)")


main()
