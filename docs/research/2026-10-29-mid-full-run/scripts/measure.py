"""Measurements taken from the RENDERED page, not from the sheet.

Three kinds, each with a positive control:

  * `ink <cx> <cy> <hw> <hh>` - the ink extent inside a box, with a control box
    that must be empty. This is `textwidth.py`'s measurement generalised: what
    is drawn, where, how wide.
  * `empty <x1> <y1> <x2> <y2>` - whether a region carries any ink at all, with
    the whole-page count as the control that the detector fires.
  * `marker <cx> <cy> <r>` - the no-connect marker: its own ink extent in BLUE,
    the nearest RED ink (KiCad draws pin lines and pin numbers red), and the
    closest approach between the two, scanned row by row. The control is that
    the blue detector finds the marker at all.

Colour thresholds are literals and are printed, because a measurement that
depends on a cutoff is only checkable if the cutoff is stated.

usage: measure.py <sheet.kicad_sch> <op> <args...>  [<op> <args...> ...]
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
INK = 128            # 8-bit grey: the stroke font and every wire draw near-black


def render(sch, out):
    pdf = out / "page.pdf"
    subprocess.run([KC, "sch", "export", "pdf", "-o", str(pdf), sch],
                   check=True, capture_output=True)
    png = out / "page.png"
    subprocess.run(["magick", "-density", str(DENSITY), str(pdf),
                    "-background", "white", "-alpha", "remove", str(png)],
                   check=True, capture_output=True)
    im = Image.open(png).convert("RGB")
    return np.asarray(im).astype(int)


def px(v):
    return int(round(v * PPMM))


def op_ink(rgb, args):
    cx, cy, hw, hh, ex, ey = (float(v) for v in args[:6])
    grey = rgb.sum(axis=2) // 3
    for tag, (bx, by) in (("CONTROL (expected empty)", (ex, ey)),
                          ("FIELD", (cx, cy))):
        sub = grey[px(by - hh):px(by + hh), px(bx - hw):px(bx + hw)]
        dark = sub < INK
        if not dark.any():
            print(f"  {tag}: box ({bx - hw:.2f},{by - hh:.2f})-"
                  f"({bx + hw:.2f},{by + hh:.2f}) mm  NO INK")
            continue
        cols = np.where(dark.any(axis=0))[0]
        rows = np.where(dark.any(axis=1))[0]
        print(f"  {tag}: box ({bx - hw:.2f},{by - hh:.2f})-"
              f"({bx + hw:.2f},{by + hh:.2f}) mm  dark {int(dark.sum())} px  "
              f"ink x {(bx - hw) + cols[0] / PPMM:.3f}..{(bx - hw) + (cols[-1] + 1) / PPMM:.3f} "
              f"width {(cols[-1] - cols[0] + 1) / PPMM:.3f} mm  "
              f"height {(rows[-1] - rows[0] + 1) / PPMM:.3f} mm")
    return 6


def op_empty(rgb, args):
    x1, y1, x2, y2 = (float(v) for v in args[:4])
    grey = rgb.sum(axis=2) // 3
    sub = grey[px(y1):px(y2), px(x1):px(x2)]
    dark = int((sub < INK).sum())
    whole = int((grey < INK).sum())
    print(f"  region ({x1},{y1})-({x2},{y2}) mm = {x2 - x1:.1f} x {y2 - y1:.1f} mm: "
          f"{dark} dark px   [positive control: whole page {whole} dark px]")
    return 4


def op_marker(rgb, args):
    cx, cy, r = (float(v) for v in args[:3])
    y0, y1, x0, x1 = px(cy - r), px(cy + r), px(cx - r), px(cx + r)
    sub = rgb[y0:y1, x0:x1]
    R, G, B = sub[:, :, 0], sub[:, :, 1], sub[:, :, 2]
    blue = (B > 90) & (B - R > 40) & (B - G > 40)
    red = (R > 90) & (R - B > 40) & (R - G > 40)
    print(f"  box ({cx - r},{cy - r})-({cx + r},{cy + r}) mm, thresholds "
          f"blue: B>90 and B-R>40 and B-G>40; red: R>90 and R-B>40 and R-G>40")
    if not blue.any():
        print("  NO BLUE INK - the marker detector did not fire, so nothing "
              "below can be attributed to it")
        return 3
    bc, br = np.where(blue.any(axis=0))[0], np.where(blue.any(axis=1))[0]
    print(f"  marker ink: {int(blue.sum())} px, "
          f"{(bc[-1] - bc[0] + 1) / PPMM:.3f} x {(br[-1] - br[0] + 1) / PPMM:.3f} mm, "
          f"x {(cx - r) + bc[0] / PPMM:.3f}..{(cx - r) + (bc[-1] + 1) / PPMM:.3f}, "
          f"y {(cy - r) + br[0] / PPMM:.3f}..{(cy - r) + (br[-1] + 1) / PPMM:.3f}")
    print(f"  red ink in the same box: {int(red.sum())} px")
    # Closest approach, row by row: for every row carrying both, the gap
    # between the right-most blue and the nearest red to its right or left.
    best = None
    overlap = 0
    for row in range(sub.shape[0]):
        b = np.where(blue[row])[0]
        rr = np.where(red[row])[0]
        if b.size == 0 or rr.size == 0:
            continue
        if np.intersect1d(b, rr).size:
            overlap += 1
        d = int(np.min(np.abs(rr[:, None] - b[None, :])))
        if best is None or d < best[0]:
            best = (d, row)
    if best is None:
        print("  no row carries both colours")
    else:
        print(f"  closest blue-to-red approach: {best[0]} px = "
              f"{best[0] / PPMM:.3f} mm, at y "
              f"{(cy - r) + best[1] / PPMM:.3f} mm  "
              f"(rows where the two colours share a pixel column: {overlap})")
    return 3


OPS = {"ink": op_ink, "empty": op_empty, "marker": op_marker}


def main():
    sch = sys.argv[1]
    with tempfile.TemporaryDirectory() as td:
        rgb = render(sch, Path(td))
    print(f"rendered at {DENSITY} dpi, {rgb.shape[1]}x{rgb.shape[0]} px, "
          f"ink threshold grey < {INK}")
    i = 2
    while i < len(sys.argv):
        op = sys.argv[i]
        args = sys.argv[i + 1:]
        print(f"=== {op} {' '.join(args[:6])}")
        i += 1 + OPS[op](rgb, args)


main()
