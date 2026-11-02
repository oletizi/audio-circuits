"""Prove a centred sheet is a RIGID TRANSLATION of the sheet it came from.

The netlist proof (`./netcmp.ts`) says the two sheets are the same circuit. It
does NOT say they are the same DRAWING: a sheet with one capacitor dragged
30 mm and its wires stretched to follow is electrically identical and is not a
translation. This is the geometric half.

WHAT IT CHECKS, each against a positive control that must move:

  counts      wires, symbols, pin points, labels, junctions, rectangles, texts
  wire length the total, to 0.001 mm - a stretched wire changes it
  translation every wire end, symbol origin, junction, label, rectangle corner
              and SYMBOL FIELD position, sorted and differenced, must be offset
              by the same dx and by zero dy
  field angle every field's angle unchanged - a rotated label is not translated

IT PARSES WITH `../../lib/kicad_sheet.py` AND NOTHING ELSE. That module's own
`selftest.py` records six hand-rolled parsers silently dropping one of the two
textual forms a sheet holds wires, symbols and pins in; `selftest.py` is run
before this script in `../run.sh`, and its ten controls all have to move.

THE CONTROLS ARE NOT OPTIONAL AND THEY ARE PER-CHECK. A single control at the
top proves the file loaded, not that each comparison can fail. So each check is
re-run against a deliberately perturbed copy of the AFTER sheet and must report
a failure there:

  counts      one wire deleted            -> counts must differ
  wire length one wire shortened by 5 mm   -> total must differ
  translation one symbol moved 1.27 mm     -> the per-point offset must scatter
  field angle one field rotated 90 degrees -> angles must differ

A check whose control passes is reported as BROKEN and refuses, because a
comparison that cannot fail is not evidence.
"""
import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

TOL = 5e-5


def counts(sh):
    return {
        "wires": len(sh.wires()),
        "symbols": len(sh.symbols()),
        "pin points": len(sh.pin_points()),
        "labels": len(sh.labels()),
        "junctions": len(sh.junctions()),
        "rectangles": len(sh.rectangles()),
        "texts": len(sh.texts()),
    }


def wire_length(sh):
    # `Wire.length` and `Wire.pts` are PROPERTIES, not methods, and `pts`
    # returns a FLAT (x1, y1, x2, y2) rather than two pairs.
    return sum(w.length for w in sh.wires())


def points(sh):
    """Every absolute (x, y) the drawing places, tagged by what placed it."""
    out = []
    for w in sh.wires():
        x1, y1, x2, y2 = w.pts
        out.append(("wire", x1, y1))
        out.append(("wire", x2, y2))
    for s in sh.symbols():
        out.append(("symbol", s.x, s.y))
        for f in s.fields:
            out.append(("field:" + f.name, f.x, f.y))
    for j in sh.junctions():
        out.append(("junction", j[0], j[1]))
    # `labels()` yields (kind, text, x, y, angle, shape, node) - the coordinates
    # are at 2 and 3, NOT 1 and 2. Indexing 1 picks up the label's TEXT, which
    # compares equal between a sheet and its translation and would have made
    # this the one check in the file that could not fail.
    for lb in sh.labels():
        out.append(("label:" + lb[0], lb[2], lb[3]))
    for r in sh.rectangles():
        out.append(("rect", r[0], r[1]))
        out.append(("rect", r[2], r[3]))
    for t in sh.texts():
        out.append(("text", t[1], t[2]))
    return out


def field_angles(sh):
    return sorted(
        (s.ref or "", f.name, round(f.angle, 4)) for s in sh.symbols() for f in s.fields
    )


def translation(before, after):
    """(ok, dx, worst_dx_dev, worst_dy, n) over the sorted point lists."""
    pb = sorted(points(before))
    pa = sorted(points(after))
    if len(pb) != len(pa):
        return False, None, None, None, (len(pb), len(pa))
    tags_b = [p[0] for p in pb]
    tags_a = [p[0] for p in pa]
    if tags_b != tags_a:
        return False, None, None, None, (len(pb), len(pa))
    dxs = [a[1] - b[1] for b, a in zip(pb, pa)]
    dys = [a[2] - b[2] for b, a in zip(pb, pa)]
    dx = dxs[0] if dxs else 0.0
    worst_dx = max(abs(d - dx) for d in dxs) if dxs else 0.0
    worst_dy = max(abs(d) for d in dys) if dys else 0.0
    return worst_dx <= TOL and worst_dy <= TOL, dx, worst_dx, worst_dy, len(pb)


# ---------------------------------------------------------------- perturbations


def perturb_delete_wire(src):
    i = src.index("\n\t(wire")
    j = src.index("\n\t)", i)
    return src[:i] + src[j + 3:]


def perturb_shorten_wire(src):
    """Move the first wire's second endpoint 5 mm west."""
    i = src.index("\n\t(wire")
    m = list(re.finditer(r"\(xy (-?[\d.]+) (-?[\d.]+)\)", src[i:i + 400]))
    if len(m) < 2:
        raise SystemExit("REFUSING: could not find two (xy ..) in the first wire for the control.")
    t = m[1]
    new = "(xy %s %s)" % (round(float(t.group(1)) - 5.0, 4), t.group(2))
    return src[:i + t.start()] + new + src[i + t.end():]


def perturb_move_symbol(src):
    k = src.index("(lib_symbols")
    m = re.search(r"\(at (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\)", src[src.index("\n\t(symbol", k):])
    if m is None:
        raise SystemExit("REFUSING: no body symbol `(at x y a)` to move for the control.")
    off = src.index("\n\t(symbol", k)
    new = "(at %s %s %s)" % (round(float(m.group(1)) + 1.27, 4), round(float(m.group(2)) + 1.27, 4), m.group(3))
    return src[:off + m.start()] + new + src[off + m.end():]


def perturb_rotate_field(src):
    """Rotate the first body property's text by 90 degrees."""
    k = src.index("(lib_symbols")
    off = src.index("\n\t(symbol", k)
    m = re.search(r'\(property "[^"]*" "[^"]*"\s*\n?\s*\(at (-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\)', src[off:])
    if m is None:
        raise SystemExit("REFUSING: no body `(property ...)` with an `(at ...)` to rotate for the control.")
    whole = m.group(0)
    rotated = whole.replace(
        "(at %s %s %s)" % (m.group(1), m.group(2), m.group(3)),
        "(at %s %s %s)" % (m.group(1), m.group(2), (float(m.group(3)) + 90) % 360),
    )
    return src[:off + m.start()] + rotated + src[off + m.end():]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("before")
    ap.add_argument("after")
    ap.add_argument("--label", default="")
    a = ap.parse_args()

    src_b = pathlib.Path(a.before).read_text()
    src_a = pathlib.Path(a.after).read_text()
    before = kicad_sheet.Sheet(src_b, a.before)
    after = kicad_sheet.Sheet(src_a, a.after)

    print("=" * 78)
    print("%s\n  before %s\n  after  %s" % (a.label or "", a.before, a.after))
    print()

    broken = []
    failed = []

    # ---- counts
    cb, ca = counts(before), counts(after)
    same_counts = cb == ca
    print("  COUNTS")
    for k in cb:
        print("    %-12s %5d vs %5d   %s" % (k, cb[k], ca[k], "same" if cb[k] == ca[k] else "DIFFER"))
    ctl = kicad_sheet.Sheet(perturb_delete_wire(src_a), "control")
    ctl_moved = counts(ctl) != ca
    print("    CONTROL  one wire deleted from the after-sheet: counts %s"
          % ("differ - CHECK DISCRIMINATES" if ctl_moved else "AGREE - CHECK IS BROKEN"))
    if not ctl_moved:
        broken.append("counts")
    if not same_counts:
        failed.append("counts")

    # ---- wire length
    lb, la = wire_length(before), wire_length(after)
    same_len = abs(lb - la) <= 1e-3
    print("  WIRE LENGTH")
    print("    total        %10.3f vs %10.3f mm   %s" % (lb, la, "same" if same_len else "DIFFER"))
    lc = wire_length(kicad_sheet.Sheet(perturb_shorten_wire(src_a), "control"))
    len_moved = abs(lc - la) > 1e-3
    print("    CONTROL  one wire shortened 5 mm: total %10.3f, %s"
          % (lc, "differs - CHECK DISCRIMINATES" if len_moved else "AGREES - CHECK IS BROKEN"))
    if not len_moved:
        broken.append("wire length")
    if not same_len:
        failed.append("wire length")

    # ---- rigid translation
    ok, dx, wdx, wdy, n = translation(before, after)
    print("  RIGID TRANSLATION")
    if dx is None:
        print("    point lists are not comparable: %s points vs %s - NOT A TRANSLATION" % n)
        failed.append("translation")
    else:
        print("    %d placed points (wire ends, symbol origins, every symbol FIELD, junctions, "
              "labels, rectangle corners, texts)" % n)
        print("    offset       dx %+.4f mm   dy %+.4f mm" % (dx, 0.0))
        print("    worst deviation from that single offset: dx %.2e mm, dy %.2e mm   %s"
              % (wdx, wdy, "RIGID" if ok else "NOT RIGID"))
        if not ok:
            failed.append("translation")
    ok_c, dx_c, wdx_c, _, _ = translation(before, kicad_sheet.Sheet(perturb_move_symbol(src_a), "control"))
    print("    CONTROL  one symbol moved 1.27 mm diagonally in the after-sheet: %s"
          % ("the single-offset test fails - CHECK DISCRIMINATES" if not ok_c
             else "the test still passes - CHECK IS BROKEN"))
    if ok_c:
        broken.append("translation")

    # ---- field angles
    ab, aa = field_angles(before), field_angles(after)
    same_ang = ab == aa
    print("  FIELD ANGLES")
    print("    %d fields, angles %s" % (len(ab), "IDENTICAL" if same_ang else "DIFFER"))
    if not same_ang:
        for x, y in zip(ab, aa):
            if x != y:
                print("      %s vs %s" % (x, y))
    ac = field_angles(kicad_sheet.Sheet(perturb_rotate_field(src_a), "control"))
    ang_moved = ac != aa
    print("    CONTROL  one field rotated 90 degrees: angles %s"
          % ("differ - CHECK DISCRIMINATES" if ang_moved else "AGREE - CHECK IS BROKEN"))
    if not ang_moved:
        broken.append("field angles")
    if not same_ang:
        failed.append("field angles")

    print()
    if broken:
        raise SystemExit(
            "REFUSING: the control passed for %s, so %s cannot report the failure it is here to "
            "rule out and its verdict above is not evidence."
            % (", ".join(broken), "those checks" if len(broken) > 1 else "that check"))
    if failed:
        raise SystemExit("NOT A RIGID TRANSLATION: %s differ." % ", ".join(failed))
    print("  VERDICT  a rigid translation of %+.4f mm in x and 0 in y; every check had a control "
          "that reported a difference." % dx)


if __name__ == "__main__":
    main()
