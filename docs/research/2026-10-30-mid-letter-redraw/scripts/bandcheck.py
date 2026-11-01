"""Prove the five groups this run did not re-lay are a RIGID TRANSLATION.

`EVALUATING-DRAWINGS.md` §8: a region changed in response to a verdict is the
least-examined part of a drawing. The inverse needs proving too - a region this
run SAYS it did not change had must not have changed. The Junction group and
the four stand-ins were looked at and accepted on the A3 page; the claim here is
that the only thing that happened to them is that the page's origin moved.

It compares, between the two sheets, every object whose anchor lies in the band:
wires (both endpoints), junctions, labels (text, kind, angle), no-connects,
symbols (lib_id, rotation, reference, value) and their visible FIELDS, and the
group rectangles and heading texts. Each after-coordinate must equal its
before-coordinate plus exactly (dx, dy). Any object present on one side and not
the other is a failure, in both directions.

FIELDS ARE INCLUDED ON PURPOSE. `move_component` carrying a part's field offsets
and angles is repair class 5 and is invisible to every netlist check; if an op
had reached into the band, a field is where it would show first.

usage: bandcheck.py <before.kicad_sch> <after.kicad_sch> <dx> <dy> <band_y_max>
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

TOL = 0.0005


def fingerprint(sheet, y_max, dx=0.0, dy=0.0):
    """Every object anchored above y_max, as comparable tuples."""
    out = []

    def p(x, y):
        return (round(x + dx, 3), round(y + dy, 3))

    for w in sheet.wires():
        if max(w.y1, w.y2) > y_max:
            continue
        a, b = sorted([p(w.x1, w.y1), p(w.x2, w.y2)])
        out.append(("wire", a, b, w.width, w.colour))
    for jx, jy, _u in sheet.junctions():
        if jy > y_max:
            continue
        out.append(("junction", p(jx, jy)))
    for kind, text, lx, ly, ang, shape, _n in sheet.labels():
        if ly > y_max:
            continue
        out.append(("label", kind, text, p(lx, ly), ang, shape))
    for nx, ny, _u in sheet.no_connects():
        if ny > y_max:
            continue
        out.append(("no_connect", p(nx, ny)))
    for s in sheet.symbols():
        if s.y > y_max:
            continue
        fields = tuple(sorted((f.name, f.text, p(f.x, f.y), f.angle, f.size,
                               f.hidden) for f in s.fields))
        out.append(("symbol", s.lib_id, s.ref, s.value, p(s.x, s.y), s.rot,
                    fields))
    for x1, y1, x2, y2 in sheet.rectangles():
        if max(y1, y2) > y_max:
            continue
        out.append(("rect", p(x1, y1), p(x2, y2)))
    for text, tx, ty, ang in sheet.texts():
        if ty > y_max:
            continue
        out.append(("text", text, p(tx, ty), ang))
    return sorted(out, key=repr)


def main():
    before, after = sys.argv[1], sys.argv[2]
    dx, dy, y_max = float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
    b = kicad_sheet.read(before)
    a = kicad_sheet.read(after)
    # The band's y_max is measured on the AFTER page; on the BEFORE page it is
    # that figure minus dy, because the whole page moved by dy.
    fb = fingerprint(b, y_max - dy, dx, dy)
    fa = fingerprint(a, y_max)
    print("band: everything anchored above y = %.2f on the after sheet "
          "(%.2f on the before sheet)" % (y_max, y_max - dy))
    print("  before: %d objects, shifted by (%+.2f, %+.2f)" % (len(fb), dx, dy))
    print("  after:  %d objects" % len(fa))
    only_b = [o for o in fb if o not in fa]
    only_a = [o for o in fa if o not in fb]
    for o in only_b[:12]:
        print("  ONLY ON THE BEFORE SHEET (shifted): %r" % (o,))
    for o in only_a[:12]:
        print("  ONLY ON THE AFTER SHEET:            %r" % (o,))
    if only_b or only_a:
        raise SystemExit("REFUSING: the band is NOT a rigid translation - "
                         "%d objects differ" % (len(only_b) + len(only_a)))
    print("  RIGID TRANSLATION: every object matches, including every visible "
          "symbol field's position and angle")

    # POSITIVE CONTROL: the comparison must fail when something in the band
    # really does move. Without it a match is indistinguishable from a
    # fingerprint that ignores everything.
    moved = fingerprint(a, y_max)
    for i, o in enumerate(moved):
        if o[0] == "symbol":
            moved[i] = o[:4] + ((o[4][0] + 1.27, o[4][1]),) + o[5:]
            who = o[2]
            break
    diff = [o for o in moved if o not in fb]
    print("  CONTROL: moving %s 1.27 mm east in the after fingerprint makes "
          "%d object(s) stop matching: %s"
          % (who, len(diff), "COMPARISON DISCRIMINATES" if diff
             else "COMPARISON IS BLIND"))
    if not diff:
        raise SystemExit("REFUSING: the control did not fire")


main()
