"""List every wire segment on a sheet, optionally restricted to a rectangle,
with its stroke colour and uuid.

usage: wires.py <sheet.kicad_sch> [x1 y1 x2 y2]
"""
import re
import sys

src = open(sys.argv[1]).read()
box = [float(v) for v in sys.argv[2:6]] if len(sys.argv) > 5 else None

pat = re.compile(
    r'\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)'
    r'(.*?)\(uuid "([0-9a-f-]+)"\)', re.S)

rows = []
for m in pat.finditer(src):
    x1, y1, x2, y2 = (float(g) for g in m.groups()[:4])
    mid, uuid = m.group(5), m.group(6)
    col = re.search(r'\(color ([\d ]+?)\)', mid)
    if box:
        if not (min(box[0], box[2]) <= min(x1, x2) and max(x1, x2) <= max(box[0], box[2])
                and min(box[1], box[3]) <= min(y1, y2) and max(y1, y2) <= max(box[1], box[3])):
            continue
    kind = "H" if y1 == y2 else ("V" if x1 == x2 else "DIAG")
    length = abs(x2 - x1) + abs(y2 - y1)
    rows.append((kind, x1, y1, x2, y2, length,
                 (col.group(1) if col else "-"), uuid))

rows.sort(key=lambda r: (r[2], r[1]))
print(f"{len(rows)} wire(s)" + (f" fully inside {box}" if box else ""))
for kind, x1, y1, x2, y2, ln, col, uuid in rows:
    print(f"  {kind:4} ({x1:7.2f},{y1:7.2f}) -> ({x2:7.2f},{y2:7.2f})  "
          f"{ln:6.2f} mm  colour {col:14} {uuid}")
