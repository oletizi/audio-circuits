"""Count wire crossings on a .kicad_sch.

A crossing is a horizontal segment and a vertical segment that intersect at a
point that is an interior point of at least one of them and is not a shared
endpoint of both. T-meetings (endpoint of one landing on the interior of the
other) are reported separately from true X crossings.
"""
import re
import sys


def wires(path):
    src = open(path).read()
    out = []
    for m in re.finditer(
        r"\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)", src
    ):
        out.append(tuple(round(float(g), 3) for g in m.groups()))
    return out


def classify(path):
    segs = wires(path)
    horiz = [s for s in segs if s[1] == s[3]]
    vert = [s for s in segs if s[0] == s[2]]
    crossings = []
    tees = []
    for h in horiz:
        hy = h[1]
        hx0, hx1 = sorted((h[0], h[2]))
        for v in vert:
            vx = v[0]
            vy0, vy1 = sorted((v[1], v[3]))
            if not (hx0 <= vx <= hx1 and vy0 <= hy <= vy1):
                continue
            h_end = vx in (hx0, hx1)
            v_end = hy in (vy0, vy1)
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
    print(f"  wires {len(segs)}  (horizontal {len(horiz)}, vertical {len(vert)})")
    print(f"  TRUE CROSSINGS (X): {len(crossings)}  {sorted(set(crossings))}")
    print(f"  T-meetings:         {len(tees)}  {sorted(set(tees))}")
    print()
