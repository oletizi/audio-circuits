"""Content extent of a sheet, in mm, and whether it fits inside a paper frame.

THE HEADLINE MEASUREMENT OF THIS RUN. It exists because the question "does this
page fit US Letter" has two different answers depending on what you count, and
the task that raised it quoted one of them.

TWO EXTENTS ARE REPORTED AND THEY ARE NOT THE SAME NUMBER
=========================================================
  BODY      every coordinate written in the sheet body - wire points, junction
            dots, label and text anchors, no_connect markers, symbol origins,
            field anchors, group rectangles. It EXCLUDES the geometry inside
            `lib_symbols`, so a symbol contributes its origin and not its body.
            This is the figure the task statement carries (367.6 x 133.9 mm for
            the approved page), and it is an UNDER-estimate of the ink.

  PLACED    the same, plus every placed symbol's library graphics and library
            pin ends rotated into sheet space. A capacitor's plates and a
            switch's 12 pin stubs enter here and not above.

Neither counts rendered TEXT WIDTH: a field anchor is a point. `textwidth.py`
in the mid run measures ink, and 0.75*size*len(text) is NOT a substitute for it
(`2200pF` draws 6.858 mm against `.047uF` at 6.223 mm for the same six
characters). So PLACED is still an under-estimate east of any field anchor, and
the fit claim is checked against the RENDER as well as against this.

THE FRAME IS MEASURED, NOT ASSUMED
==================================
`--frame <paper>` prints the usable rectangle for a paper size as this KiCad
draws it, from the numbers measured off a rendered frame by `framegeom.py`, and
says whether each extent fits. Nothing here hard-codes a margin it has not been
given on the command line.
"""
import argparse
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402


def body_points(sheet):
    """Every coordinate in the sheet body. (x, y, what) triples."""
    pts = []
    for w in sheet.wires():
        pts.append((w.x1, w.y1, "wire"))
        pts.append((w.x2, w.y2, "wire"))
    for x, y, _u in sheet.junctions():
        pts.append((x, y, "junction"))
    for kind, text, x, y, _ang, _shape, _node in sheet.labels():
        pts.append((x, y, "%s %s" % (kind, text)))
    for x, y, _a in sheet.no_connects():
        pts.append((x, y, "no_connect"))
    for s in sheet.symbols():
        pts.append((s.x, s.y, "symbol %s origin" % s.ref))
        for f in s.fields:
            if f.hidden:
                continue
            pts.append((f.x, f.y, "%s field %s" % (s.ref, f.name)))
    for x1, y1, x2, y2 in sheet.rectangles():
        pts.append((x1, y1, "rect"))
        pts.append((x2, y2, "rect"))
    for text, x, y, _a in sheet.texts():
        pts.append((x, y, "text %s" % text))
    return pts


def placed_points(sheet):
    """body_points plus library graphics and pin ends rotated into sheet space."""
    pts = list(body_points(sheet))
    # `lib_graphics()` already carries each pin's anchor AND the far end of its
    # stub, so pins are not added again here - a second implementation of the
    # same rotation is exactly the drift this shared reader exists to stop.
    graphics = sheet.lib_graphics()
    for s in sheet.symbols():
        for gx, gy in graphics.get(s.lib_id, []):
            dx, dy = kicad_sheet.rotate(gx, -gy, s.rot)
            pts.append((round(s.x + dx, 3), round(s.y + dy, 3),
                        "%s graphic" % s.ref))
    return pts


def extent(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def name_at(pts, idx, pick):
    vals = [p[idx] for p in pts]
    target = pick(vals)
    return ", ".join(sorted({p[2] for p in pts if abs(p[idx] - target) < 0.002}))


def report(label, pts, frame):
    x1, y1, x2, y2 = extent(pts)
    w, h = x2 - x1, y2 - y1
    print("%-8s  x %8.3f .. %8.3f  = %8.3f mm wide" % (label, x1, x2, w))
    print("%-8s  y %8.3f .. %8.3f  = %8.3f mm tall" % ("", y1, y2, h))
    print("%-8s  westmost : %s" % ("", name_at(pts, 0, min)))
    print("%-8s  eastmost : %s" % ("", name_at(pts, 0, max)))
    print("%-8s  northmost: %s" % ("", name_at(pts, 1, min)))
    print("%-8s  southmost: %s" % ("", name_at(pts, 1, max)))
    print("%-8s  %d points" % ("", len(pts)))
    if frame:
        fx1, fy1, fx2, fy2 = frame
        fits = x1 >= fx1 and y1 >= fy1 and x2 <= fx2 and y2 <= fy2
        print("%-8s  frame %.3f,%.3f .. %.3f,%.3f (%.3f x %.3f mm usable)"
              % ("", fx1, fy1, fx2, fy2, fx2 - fx1, fy2 - fy1))
        print("%-8s  slack  W %+8.3f  E %+8.3f  N %+8.3f  S %+8.3f mm"
              % ("", x1 - fx1, fx2 - x2, y1 - fy1, fy2 - y2))
        print("%-8s  FITS INSIDE FRAME: %s" % ("", "YES" if fits else "NO"))
    print()
    return (x1, y1, x2, y2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("--frame", nargs=4, type=float, metavar=("X1", "Y1", "X2", "Y2"),
                    help="usable rectangle in mm, from framegeom.py")
    ap.add_argument("--control", action="store_true",
                    help="also report the extent with one point displaced, "
                         "so the instrument is shown to move")
    a = ap.parse_args()

    sheet = kicad_sheet.read(a.sheet)
    print("sheet   %s" % a.sheet)
    print("paper   %s" % " ".join(sheet.root.kid("paper").atoms))
    print()
    body = body_points(sheet)
    placed = placed_points(sheet)
    report("BODY", body, a.frame)
    report("PLACED", placed, a.frame)

    if a.control:
        # POSITIVE CONTROL: the extent must move when a point moves. Without
        # this the two numbers above are indistinguishable from a constant.
        moved = list(body)
        x1, _y1, x2, _y2 = extent(body)
        moved.append((x2 + 25.0, 100.0, "CONTROL point 25 mm east"))
        mx1, _, mx2, _ = extent(moved)
        print("CONTROL  body width %.3f -> %.3f with one point 25 mm east: %s"
              % (x2 - x1, mx2 - mx1,
                 "MOVED" if abs((mx2 - mx1) - (x2 - x1) - 25.0) < 0.002
                 else "DID NOT MOVE AS EXPECTED"))


if __name__ == "__main__":
    main()
