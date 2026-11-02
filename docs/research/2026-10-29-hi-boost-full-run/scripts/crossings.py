"""Count wire crossings on a .kicad_sch.

A crossing is a horizontal segment and a vertical segment that intersect at a
point that is an interior point of at least one of them and is not a shared
endpoint of both. T-meetings (endpoint of one landing on the interior of the
other) are reported separately from true X crossings.

**THE PARSE IS SHARED, AND THAT MATTERS HERE MORE THAN ANYWHERE.** A crossing
count is what the draft choice turns on - the hi-boost run traded 2 crossings
against 8 and said so was the largest undocumented decision in the run - so a
parser that silently returns a short list makes that trade on the wrong number.
The low-boost run's copy of this script used a pattern with a LITERAL SPACE
after `(wire`, which matches only the one-line form: on `pultec-mid` it finds
64 of 82 wires. It happened to be complete on that run's own sheets, which is
luck and not a property of the check. `docs/research/lib/kicad_sheet.py` parses
by balanced parentheses and refuses when its parse does not account for every
`(wire` token in the source.

usage: crossings.py <sheet.kicad_sch> [<sheet.kicad_sch> ...]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

TOL = kicad_sheet.TOL


def classify(path):
    sheet = kicad_sheet.read(path)
    segs = sheet.wires()
    horiz = [s for s in segs if s.horizontal]
    vert = [s for s in segs if s.vertical]
    crossings = []
    tees = []
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
                continue  # corner: shared endpoint
            if h_end or v_end:
                tees.append((vx, hy))
            else:
                crossings.append((vx, hy))
    return segs, horiz, vert, crossings, tees


for p in sys.argv[1:]:
    segs, horiz, vert, crossings, tees = classify(p)
    print(p)
    print(f"  wires {len(segs)}  (horizontal {len(horiz)}, vertical {len(vert)})"
          f"  - every '(wire' token accounted for, or this would have refused")
    print(f"  TRUE CROSSINGS (X): {len(crossings)}  {sorted(set(crossings))}")
    print(f"  T-meetings:         {len(tees)}  {sorted(set(tees))}")
    print()
