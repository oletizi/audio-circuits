"""Does a sheet's BODY content fit inside US Letter landscape's inner frame?

Written for Task 5 fix round 1 of
`.superpowers/sdd/2026-10-30-institutionalise-draughting/task-5-brief.md`:
`tools/draught/draw-render.ts` rewrites a fresh copperhead draft's `(paper ...)`
token to `"USLetter"` (every approved Pultec page uses it; copperhead's own
draft engine does not know that name - see that module's comment for the
measurement that found this) and needs to know, for the report rather than by
assumption, whether the content it just rewrote the paper under still fits.

THE FRAME IS CITED, NOT RE-RENDERED, and that is a deliberate difference from
`framegeom.py`, which renders a blank page to find the frame every time it is
asked. US Letter landscape's inner frame on KiCad 10.0.5 was already measured
that way, twice (vector SVG read and a 600 dpi raster), agreeing to within half
a stroke width - `docs/research/2026-10-30-letter-repaper.md` §3 and
`drafted/pultec/pultec-hi-cut/RECORD.md`. Re-rendering a blank page on every
`make draw` call to re-derive a number that has not moved since would cost a
KiCad invocation for nothing; if this KiCad's frame geometry is ever in
question, re-measure with `framegeom.py USLetter` and update the two constants
below, citing the new run.

usage: paper_fit.py <sheet.kicad_sch>
prints the content extent, the frame, and "fits: yes" or "fits: no"; exits 0
once it has measured something, 1 only if the sheet could not be read at all.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import kicad_sheet  # noqa: E402

# US Letter landscape, inner frame, KiCad 10.0.5 (docs/research/2026-10-30-letter-repaper.md §3).
FRAME_X = (11.980, 267.377)
FRAME_Y = (11.980, 203.877)


def body_extent(sheet):
    """(min, max) per axis over every BODY coordinate - wire ends, symbol
    origins, label anchors, sheet-level rectangle corners. Excludes
    `lib_symbols` (a symbol's own graphics), the same scope `extent.py`'s
    "BODY" figure uses - an under-estimate of the ink, enough to answer
    "does the drawn geometry's own coordinates sit inside the frame"."""
    xs = []
    ys = []
    for w in sheet.wires():
        xs += [w.x1, w.x2]
        ys += [w.y1, w.y2]
    for s in sheet.symbols():
        xs.append(s.x)
        ys.append(s.y)
    for _kind, _text, x, y, _angle, _shape, _node in sheet.labels():
        xs.append(x)
        ys.append(y)
    for x1, y1, x2, y2 in sheet.rectangles():
        xs += [x1, x2]
        ys += [y1, y2]
    if not xs or not ys:
        raise SystemExit(f"{sheet.path}: no body coordinates found at all - refusing to report an empty extent as a fit")
    return (min(xs), max(xs)), (min(ys), max(ys))


def main():
    sheet = kicad_sheet.read(sys.argv[1])
    (x0, x1), (y0, y1) = body_extent(sheet)
    fits_x = FRAME_X[0] <= x0 and x1 <= FRAME_X[1]
    fits_y = FRAME_Y[0] <= y0 and y1 <= FRAME_Y[1]
    print(f"content extent x: {x0:.3f} .. {x1:.3f}")
    print(f"content extent y: {y0:.3f} .. {y1:.3f}")
    print(f"USLetter inner frame x: {FRAME_X[0]:.3f} .. {FRAME_X[1]:.3f}")
    print(f"USLetter inner frame y: {FRAME_Y[0]:.3f} .. {FRAME_Y[1]:.3f}")
    if not fits_x:
        print(f"  overshoot east: {x1 - FRAME_X[1]:.3f} mm")
    if not fits_y:
        print(f"  overshoot south: {y1 - FRAME_Y[1]:.3f} mm")
    print(f"fits: {'yes' if fits_x and fits_y else 'no'}")


main()
