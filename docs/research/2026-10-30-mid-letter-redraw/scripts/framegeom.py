"""Where THIS KiCad draws the frame and the title block, measured off a render.

WHY IT IS MEASURED AND NOT LOOKED UP. The task that commissioned this run gave
"roughly 265 x 185 mm" for US Letter landscape and said to verify it rather than
trust it. A margin table read off documentation is a transcription with a
version number on it: KiCad's frame geometry is a property of the installed
`kicad-cli` and of the page layout descriptor it uses, and this repository has
already shipped two artifacts named from memory that did not exist.

HOW IT WORKS. It writes a sheet carrying nothing but a `(paper ...)` line,
renders it to PNG through the same kicad-cli and ImageMagick the rest of the
loop uses, and finds the frame by looking for rows and columns that are almost
entirely dark - a frame line spans the page, and nothing else on an empty sheet
does. The usable rectangle is then:

    west / north / east  - the INNER frame line
    south                - the TOP of the title block, which is the long dark
                           row below the middle of the page

POSITIVE CONTROL, and it is not optional: the same detector is run against an
all-white image of the same size, which must find NO lines. A line-finder with
its threshold set wrong finds lines everywhere or nowhere, and both look like a
clean answer.

AND IT REFUSES ON A RENDER WITH NO INK IN IT, because of this:

  `magick ... -colorspace Gray out.png` writes a **16-bit** grey PNG, which
  Pillow 13.0.0 opens in mode `I;16`, and `Image.open(p).convert("L")` on that
  returns **every pixel 255**. No exception, no warning: a page with 233,374
  dark pixels reads as blank. The first run of this script reported "0
  horizontal and 0 vertical frame lines" from a render that was fine, and the
  refusal below said the threshold was wrong - which it was not.

  So this file renders WITHOUT `-colorspace Gray`, the way every committed
  measuring script in `docs/research/2026-10-29-*/scripts/` already does, and
  it refuses when a render it is about to measure holds no dark pixels at all.
  An empty page is a real possible answer to "what did KiCad draw", and it must
  never be reachable by accident.
"""
import argparse
import pathlib
import subprocess
import sys

import numpy as np
from PIL import Image

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"

EMPTY = """(kicad_sch
\t(version 20231120)
\t(generator "framegeom")
\t(uuid "00000000-0000-0000-0000-000000000001")
\t(paper "%s")
\t(lib_symbols)
\t(sheet_instances
\t\t(path "/"
\t\t\t(page "1")
\t\t)
\t)
)
"""

PRO = """{
  "meta": { "filename": "frame.kicad_pro", "version": 3 }
}
"""


def dark_lines(arr, axis, frac):
    """Indices along `axis` where at least `frac` of the pixels are dark."""
    dark = arr < 128
    span = dark.mean(axis=1 - axis if axis == 0 else 0)
    # axis 0 -> one value per ROW; axis 1 -> one value per COLUMN
    span = dark.mean(axis=1) if axis == 0 else dark.mean(axis=0)
    return [i for i, v in enumerate(span) if v >= frac]


def group(idxs):
    """Consecutive runs collapsed to their midpoint."""
    out, run = [], []
    for i in idxs:
        if run and i - run[-1] > 1:
            out.append(sum(run) / len(run))
            run = []
        run.append(i)
    if run:
        out.append(sum(run) / len(run))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paper", help='e.g. USLetter, A3 - the (paper ...) value')
    ap.add_argument("--portrait", action="store_true")
    ap.add_argument("--dpi", type=int, default=600)
    ap.add_argument("--frac", type=float, default=0.6,
                    help="fraction of a row/column that must be dark")
    ap.add_argument("--work", required=True)
    a = ap.parse_args()

    work = pathlib.Path(a.work)
    work.mkdir(parents=True, exist_ok=True)
    paper = a.paper + (" portrait" if a.portrait else "")
    (work / "frame.kicad_sch").write_text(EMPTY % paper)
    (work / "frame.kicad_pro").write_text(PRO)
    subprocess.run([KC, "sch", "export", "pdf", "-o", str(work / "frame.pdf"),
                    str(work / "frame.kicad_sch")], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(["magick", "-density", str(a.dpi), str(work / "frame.pdf"),
                    "-background", "white", "-alpha", "remove",
                    str(work / "frame.png")], check=True)

    im = Image.open(work / "frame.png")
    arr = np.asarray(im.convert("L")).astype(float)
    h, w = arr.shape
    mm = 25.4 / a.dpi
    print("paper %-18s render %d x %d px at %d dpi = %.3f x %.3f mm"
          % (paper, w, h, a.dpi, w * mm, h * mm))
    ink = int((arr < 128).sum())
    print("render mode %s, %d dark pixels" % (im.mode, ink))
    if ink == 0:
        raise SystemExit(
            "REFUSING: the render holds no dark pixels. Either kicad-cli drew "
            "nothing, or the image was loaded through a conversion that lost "
            "it - Pillow's convert('L') on a 16-bit I;16 grey PNG returns all "
            "255. Mode read was %r." % im.mode)

    rows = group(dark_lines(arr, 0, a.frac))
    cols = group(dark_lines(arr, 1, a.frac))
    print("horizontal lines (mm from top):  %s"
          % ", ".join("%.3f" % (r * mm) for r in rows))
    print("vertical lines (mm from left):   %s"
          % ", ".join("%.3f" % (c * mm) for c in cols))

    if len(cols) < 4 or len(rows) < 4:
        raise SystemExit("REFUSING: expected 4 full-span vertical and 4 "
                         "horizontal frame lines (an outer and an inner on "
                         "each side); found %d and %d. The detector threshold "
                         "or the render is wrong." % (len(cols), len(rows)))

    # The INNER frame line is the second from each edge.
    ix1, ix2 = cols[1] * mm, cols[-2] * mm
    iy1, iy2 = rows[1] * mm, rows[-2] * mm
    print()
    print("INNER FRAME   x %.3f .. %.3f   y %.3f .. %.3f   (%.3f x %.3f mm)"
          % (ix1, ix2, iy1, iy2, ix2 - ix1, iy2 - iy1))

    # THE TITLE BLOCK IS NOT FULL-SPAN, so the line detector above cannot see
    # it: it sits in the bottom-RIGHT corner only. Find it as the ink strictly
    # inside the inner frame, in the bottom third of the page.
    px1, px2 = int(cols[1]) + 3, int(cols[-2]) - 2
    py1, py2 = int(rows[1]) + 3, int(rows[-2]) - 2
    inner = arr[py1:py2, px1:px2]
    dark = inner < 128
    bottom_third = dark[int(dark.shape[0] * 2 / 3):, :]
    if not bottom_third.any():
        raise SystemExit("REFUSING: no ink inside the inner frame's bottom "
                         "third, so the title block could not be located.")
    ys, xs = np.nonzero(dark)
    tb_x1 = (px1 + xs.min()) * mm
    tb_x2 = (px1 + xs.max()) * mm
    tb_y1 = (py1 + ys.min()) * mm
    tb_y2 = (py1 + ys.max()) * mm
    print("TITLE BLOCK   x %.3f .. %.3f   y %.3f .. %.3f   (%.3f x %.3f mm)"
          % (tb_x1, tb_x2, tb_y1, tb_y2, tb_x2 - tb_x1, tb_y2 - tb_y1))
    print()
    print("TWO USABLE RECTANGLES, because the title block takes a CORNER and "
          "not a band:")
    print("  FULL WIDTH, above the title block   x %.3f .. %.3f  y %.3f .. %.3f"
          "   (%.3f x %.3f mm)"
          % (ix1, ix2, iy1, tb_y1, ix2 - ix1, tb_y1 - iy1))
    print("  FULL HEIGHT, west of the title block  x %.3f .. %.3f  y %.3f .. %.3f"
          "   (%.3f x %.3f mm)"
          % (ix1, tb_x1, iy1, iy2, tb_x1 - ix1, iy2 - iy1))
    print()
    print("  the conservative rectangle - inside the frame AND clear of the")
    print("  title block on BOTH axes, which is what extent.py is given:")
    print("  --frame %.3f %.3f %.3f %.3f   (%.3f x %.3f mm)"
          % (ix1, iy1, ix2, tb_y1, ix2 - ix1, tb_y1 - iy1))

    # POSITIVE CONTROL
    white = np.full_like(arr, 255.0)
    cr = group(dark_lines(white, 0, a.frac))
    cc = group(dark_lines(white, 1, a.frac))
    print()
    print("CONTROL  the same detector on an all-white image of the same size "
          "finds %d rows and %d columns: %s"
          % (len(cr), len(cc), "DETECTOR DISCRIMINATES"
             if not cr and not cc else "DETECTOR IS BROKEN"))
    if cr or cc:
        raise SystemExit("REFUSING: the line detector fires on white.")


if __name__ == "__main__":
    main()
