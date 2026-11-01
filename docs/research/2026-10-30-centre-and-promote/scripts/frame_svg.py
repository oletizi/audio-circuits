"""The inner frame of a rendered empty sheet, read off the SVG's own vectors.

WHY A SECOND MEASUREMENT OF A FIGURE ALREADY MEASURED. The task that
commissioned this run said two earlier runs reported two different figures for
this frame, and told this one to re-derive it rather than take either.
`../../2026-10-30-mid-letter-redraw/scripts/framegeom.py` already derives it by
rasterising a PDF at 600 dpi and finding the full-span dark rows and columns;
that answer is a PIXEL MIDPOINT, quantised to 0.042 mm, and a rounding
disagreement between two such runs is indistinguishable from a real one. The
SVG carries the frame as vector coordinates in millimetres, so this script
reads the number KiCad computed instead of a number recovered from a picture of
it.

HOW. `kicad-cli sch export svg` writes the drawing sheet as `<path>` elements in
a viewBox measured in mm. On a sheet carrying nothing but a `(paper ...)` line
and an empty `(lib_symbols)`, EVERY vector on the page belongs to the drawing
sheet, so the frame is recoverable from the coordinates alone: the two outermost
distinct x values are the outer frame's two strokes and the next two in are the
inner frame's.

POSITIVE CONTROL, and it is not optional. The same reader is run against the
same SVG with its path data removed, which must find NO coordinates and refuse.
A coordinate scraper whose regex does not match the file silently reports an
empty page, and an empty page is a confident-looking wrong answer - the failure
`framegeom.py`'s own docstring records from the 16-bit-grey incident.

AND IT REFUSES rather than guessing when it cannot see four distinct vertical
strokes, because "the frame is at 12.0" guessed from three is the kind of
transcription this whole script exists to avoid.
"""
import argparse
import pathlib
import re
import subprocess
import sys

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"

EMPTY = """(kicad_sch
\t(version 20231120)
\t(generator "frame_svg")
\t(uuid "00000000-0000-0000-0000-000000000002")
\t(paper "%s")
\t(lib_symbols)
\t(sheet_instances
\t\t(path "/"
\t\t\t(page "1")
\t\t)
\t)
)
"""

PRO = '{\n  "meta": { "filename": "frame.kicad_pro", "version": 3 }\n}\n'

VIEWBOX = re.compile(r'viewBox="([-\d. ]+)"')

# THIS KiCad WRITES `d="M159.4000 171.9000\nL267.4000 171.9000\n..."` - the pair
# is SPACE-separated and the attribute SPANS NEWLINES. Both facts broke the
# first version of this reader, which looked for `x,y` on one line and found
# nothing; the refusal below is what caught it rather than an empty frame being
# reported as a measurement. `DOTALL` is required for the same reason.
PATHDATA = re.compile(r'(?:\bd|\bpoints)="(.*?)"', re.DOTALL)
NUMPAIR = re.compile(r"(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)")


def coords(svg_text):
    """Every (x, y) in every path/polyline `d` or `points` attribute."""
    xs, ys = [], []
    for attr in PATHDATA.finditer(svg_text):
        # Drop the single-letter SVG commands (M, L, C, Z ...) so the numbers
        # that remain are coordinates and nothing else.
        data = re.sub(r"[A-Za-z]", " ", attr.group(1))
        for m in NUMPAIR.finditer(data):
            xs.append(float(m.group(1)))
            ys.append(float(m.group(2)))
    return xs, ys


def rectangles(svg_text, tol=0.001):
    """Every path that is a CLOSED AXIS-ALIGNED rectangle, as (x0, y0, x1, y1).

    THE FRAME IS NOT RECOVERABLE BY SORTING COORDINATES, which is what this
    function replaced. A drawing sheet puts a ruler along every margin - this
    page carries 1769 coordinates, and the second-smallest x among them is a
    tick at 10.5667, not the inner frame at 12.0. Sorting gave `10.5667 ..
    268.8333` and would have been believed. The frame is a RECTANGLE, so this
    reads rectangles.
    """
    out = []
    for attr in PATHDATA.finditer(svg_text):
        data = re.sub(r"[A-Za-z]", " ", attr.group(1))
        pts = [(float(m.group(1)), float(m.group(2))) for m in NUMPAIR.finditer(data)]
        if len(pts) != 5 or abs(pts[0][0] - pts[4][0]) > tol or abs(pts[0][1] - pts[4][1]) > tol:
            continue
        xs = {round(p[0], 4) for p in pts}
        ys = {round(p[1], 4) for p in pts}
        if len(xs) != 2 or len(ys) != 2:
            continue
        out.append((min(xs), min(ys), max(xs), max(ys)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paper", help='the (paper ...) value, e.g. USLetter')
    ap.add_argument("--work", required=True)
    a = ap.parse_args()

    work = pathlib.Path(a.work)
    work.mkdir(parents=True, exist_ok=True)
    (work / "frame.kicad_sch").write_text(EMPTY % a.paper)
    (work / "frame.kicad_pro").write_text(PRO)
    subprocess.run(
        [KC, "sch", "export", "svg", "--black-and-white", "-o", str(work), str(work / "frame.kicad_sch")],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    svg = (work / "frame.svg").read_text()

    vb = VIEWBOX.search(svg)
    if vb is None:
        raise SystemExit("REFUSING: no viewBox in the SVG, so its units are unknown.")
    print("paper %-12s viewBox %s mm" % (a.paper, vb.group(1)))

    xs, ys = coords(svg)
    if not xs:
        raise SystemExit(
            "REFUSING: no path coordinates found. Either kicad-cli drew nothing or the "
            "attribute regex does not match this KiCad's SVG - and an empty page looks "
            "exactly like a confident answer.")
    print("%d coordinates in the drawing-sheet vectors" % len(xs))

    rects = sorted(rectangles(svg), key=lambda r: (r[2] - r[0]) * (r[3] - r[1]), reverse=True)
    if len(rects) < 3:
        raise SystemExit(
            "REFUSING: expected at least 3 closed rectangles on an empty sheet - the outer "
            "frame, the inner frame and the title block - and found %d. Either this KiCad "
            "draws the frame some other way or the rectangle reader is wrong; guessing a "
            "frame position from fewer is the transcription this script exists to avoid."
            % len(rects))

    print()
    print("closed axis-aligned rectangles on the page, largest first:")
    for x0, y0, x1, y1 in rects:
        print("  x %9.4f .. %9.4f   y %9.4f .. %9.4f   (%8.4f x %8.4f mm)"
              % (x0, x1, y0, y1, x1 - x0, y1 - y0))

    outer, inner = rects[0], rects[1]
    if not (outer[0] < inner[0] and outer[1] < inner[1] and inner[2] < outer[2] and inner[3] < outer[3]):
        raise SystemExit(
            "REFUSING: the second-largest rectangle is not strictly inside the largest, so "
            "these two are not an outer and an inner frame line.")
    # The title block is the largest rectangle that shares the inner frame's SE corner.
    tb = [r for r in rects[2:] if abs(r[2] - inner[2]) < 0.01 and abs(r[3] - inner[3]) < 0.01]
    print()
    print("OUTER FRAME  x %.4f .. %.4f   y %.4f .. %.4f" % (outer[0], outer[2], outer[1], outer[3]))
    print("INNER FRAME  x %.4f .. %.4f   y %.4f .. %.4f   (%.4f x %.4f mm)"
          % (inner[0], inner[2], inner[1], inner[3], inner[2] - inner[0], inner[3] - inner[1]))
    if tb:
        print("TITLE BLOCK  a CORNER from x %.4f, y %.4f" % (tb[0][0], tb[0][1]))
    else:
        print("TITLE BLOCK  no rectangle shares the inner frame's SE corner - not located")
    print()
    print("--frame-x %.4f %.4f" % (inner[0], inner[2]))

    stripped = PATHDATA.sub('d=""', svg)
    cxs, _ = coords(stripped)
    print()
    print("CONTROL  the same reader on the same SVG with its path data emptied finds %d "
          "coordinates: %s" % (len(cxs), "READER DISCRIMINATES" if not cxs else "READER IS BROKEN"))
    if cxs:
        raise SystemExit("REFUSING: the coordinate reader finds coordinates in emptied paths.")


if __name__ == "__main__":
    main()
