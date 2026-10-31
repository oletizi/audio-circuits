"""Junction dots and wire-to-wire tees, audited against pins as well as wires.

WHY THIS EXISTS, and it is a correction to the inherited check.
`scripts/orphan_junctions.py` (from the low-cut run, DELETED 2026-10-30) counted
only the WIRES passing through a junction and called anything with fewer than
two an orphan. That is right for the defect it was written for - akcli's
`delete_object` leaves the dot behind when it removes a wire - and WRONG for a
dot where a single wire passes through a symbol PIN, which is a legitimate tee
and the commonest shape in a rail-and-riser arrangement. Run against the
hi-boost page it reported 6 orphans, every one of them a rail or a selector run
crossing a pin. A check that cannot fail usefully is worse than no check, so
this one counts pins too.

It also reports the converse, which no committed script covered: a wire-to-wire
tee with NO dot on it. That is a connection a reader cannot see.

**THE PARSE WAS WRONG TWICE AND IS NOW SHARED.** This script shipped with a pin
pattern that demanded a newline before `(at ...)`, so it resolved 0 of
`pultec-mid`'s 5 copperhead power pins and reported a FALSE ORPHAN at the shared
ground symbol. The mid run fixed that in THIS copy on 2026-10-29 and left the
hi-boost and hi-cut copies broken, where `TOOLING.md` went on naming one of them
as the script to trust. On 2026-10-30 all three copies were converged on
`docs/research/lib/kicad_sheet.py`, which parses by balanced parentheses and
refuses when its parse does not account for every token in the source. The
orphan figures the hi-boost, hi-cut and low-cut runs published were computed
with the broken version.

Pin positions come from the sheet's own `lib_symbols` block, mapped into sheet
space by the instance's placement and rotation; the mapping is stated and
verified in `kicad_sheet.rotate`.

usage: junction_audit.py <sheet.kicad_sch>
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

TOL = kicad_sheet.TOL


def collinear_overlap(wires):
    """Pairs of collinear wires on the same line where one lies inside the other.

    copperhead writes these, and they are why a tee-without-a-dot report cannot
    be read as a connectivity finding on its own: the short wire's endpoint
    coincides with the long wire's interior, the net is connected by a shared
    endpoint, and no dot is needed. Found on hi-cut and again on mid.
    """
    out = []
    for i, a in enumerate(wires):
        for b in wires[i + 1:]:
            if a.vertical and b.vertical and abs(a.x1 - b.x1) < TOL:
                lo_a, hi_a = sorted((a.y1, a.y2))
                lo_b, hi_b = sorted((b.y1, b.y2))
            elif a.horizontal and b.horizontal and abs(a.y1 - b.y1) < TOL:
                lo_a, hi_a = sorted((a.x1, a.x2))
                lo_b, hi_b = sorted((b.x1, b.x2))
            else:
                continue
            if (lo_a - TOL <= lo_b and hi_b <= hi_a + TOL) or \
               (lo_b - TOL <= lo_a and hi_a <= hi_b + TOL):
                out.append((a, b))
    return out


def main():
    sheet = kicad_sheet.read(sys.argv[1])
    wires = sheet.wires()
    pins = sheet.pin_points()
    juncs = sheet.junctions()

    print(f"wires {len(wires)}   symbol pins {len(pins)}   junctions {len(juncs)}")
    print("  (every '(wire' and '(pin' token in the source is accounted for, or "
          "this script would have refused)")

    orphans = 0
    at_pin = 0
    for x, y, uuid in juncs:
        hits = kicad_sheet.wire_hits(x, y, wires)
        p = 1 if (x, y) in pins else 0
        if hits.through + p < 2:
            orphans += 1
            print(f"  ORPHAN   ({x:7.2f},{y:7.2f})  wires {hits.through} pins {p}  {uuid}")
        elif p and hits.through < 2:
            at_pin += 1
    print(f"  junctions at a pin on a single wire (legitimate tees): {at_pin}")
    print(f"ORPHAN JUNCTIONS: {orphans}")

    # Wire-to-wire tees, and whether each carries a dot.
    horiz = [w for w in wires if w.horizontal]
    vert = [w for w in wires if w.vertical]
    tees = set()
    for h in horiz:
        hy = h.y1
        hx0, hx1 = sorted((h.x1, h.x2))
        for v in vert:
            vx = v.x1
            vy0, vy1 = sorted((v.y1, v.y2))
            if not (hx0 - TOL <= vx <= hx1 + TOL and vy0 - TOL <= hy <= vy1 + TOL):
                continue
            h_end = abs(vx - hx0) < TOL or abs(vx - hx1) < TOL
            v_end = abs(hy - vy0) < TOL or abs(hy - vy1) < TOL
            if h_end and v_end:
                continue
            if h_end or v_end:
                tees.add((round(vx, 3), round(hy, 3)))
    dots = {(x, y) for x, y, _ in juncs}
    missing = sorted(t for t in tees if t not in dots)
    print(f"WIRE-TO-WIRE TEES: {len(tees)}   without a dot: {len(missing)} {missing}")

    overlaps = collinear_overlap(wires)
    print(f"COLLINEAR OVERLAPPING PAIRS: {len(overlaps)}"
          "   (a tee-without-a-dot at one of these is the known artefact, "
          "not a connectivity defect)")
    for a, b in overlaps:
        print(f"  {a.pts} contains or is contained by {b.pts}")

    # Pins lying on the interior of a wire, and whether each carries a dot.
    pin_tees = sorted({(px, py) for (px, py) in pins
                       if any(w.interior(px, py) for w in wires)})
    missing_p = sorted(t for t in pin_tees if t not in dots)
    print(f"PINS ON A WIRE INTERIOR: {len(pin_tees)}   without a dot: "
          f"{len(missing_p)} {missing_p}")


main()
