"""Count wire-segment crossings on a .kicad_sch.

A crossing is a horizontal segment and a vertical segment that intersect at a
point strictly interior to both. Segments that merely touch end-to-end, and
collinear overlaps, are not counted.
"""

import re
import sys

t = open(sys.argv[1], encoding="utf-8").read()
seg = re.findall(
    r"\(wire\s*\(pts\s*\(xy (-?[\d.]+) (-?[\d.]+)\)\s*\(xy (-?[\d.]+) (-?[\d.]+)\)",
    t)
if not seg:
    seg = re.findall(
        r"\(wire\s+\(pts\s+\(xy (-?[\d.]+) (-?[\d.]+)\)\s+\(xy (-?[\d.]+) (-?[\d.]+)\)",
        t)

wires = [(float(a), float(b), float(c), float(d)) for a, b, c, d in seg]
hor = [w for w in wires if abs(w[1] - w[3]) < 1e-6]
ver = [w for w in wires if abs(w[0] - w[2]) < 1e-6 and abs(w[1] - w[3]) >= 1e-6]
diag = [w for w in wires if abs(w[0] - w[2]) >= 1e-6 and abs(w[1] - w[3]) >= 1e-6]

cross = []
for h in hor:
    hx1, hx2 = sorted((h[0], h[2]))
    hy = h[1]
    for v in ver:
        vx = v[0]
        vy1, vy2 = sorted((v[1], v[3]))
        if hx1 < vx < hx2 and vy1 < hy < vy2:
            cross.append((vx, hy))

print(f"wire segments: {len(wires)}  horizontal: {len(hor)}  vertical: {len(ver)}  diagonal: {len(diag)}")
print(f"interior crossings: {len(cross)}")
for c in sorted(set(cross)):
    print(f"   at kicad ({c[0]}, {c[1]})  = sheet x {c[0]} mm, y {round(210 - c[1], 2)} mm")
