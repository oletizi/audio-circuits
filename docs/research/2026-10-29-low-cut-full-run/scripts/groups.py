"""Print copperhead's group rectangles and assign every label, power symbol and
part anchor to the rectangle that contains it.

usage: groups.py <sheet.kicad_sch>
"""
import re
import sys

src = open(sys.argv[1]).read()

# group rectangles: copperhead draws each group as a (rectangle ...) plus a
# (text ...) heading. Pair each rectangle with the nearest heading above it.
rects = []
for m in re.finditer(
        r'\(rectangle\s*\(start ([-\d.]+) ([-\d.]+)\)\s*\(end ([-\d.]+) ([-\d.]+)\)',
        src):
    x1, y1, x2, y2 = (float(g) for g in m.groups())
    rects.append((min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)))

texts = []
for m in re.finditer(r'\(text\s+"([^"]*)"\s*\(exclude_from_sim[^)]*\)\s*'
                     r'\(at ([-\d.]+) ([-\d.]+)', src):
    texts.append((m.group(1), float(m.group(2)), float(m.group(3))))
if not texts:
    for m in re.finditer(r'\(text\s+"([^"]*)"[^(]*\(at ([-\d.]+) ([-\d.]+)', src):
        texts.append((m.group(1), float(m.group(2)), float(m.group(3))))


def name_for(r):
    x1, y1, x2, y2 = r
    best, bd = None, 1e9
    for t, tx, ty in texts:
        if x1 - 2 <= tx <= x2 + 2 and y1 - 12 <= ty <= y2:
            d = abs(ty - y1) + abs(tx - x1)
            if d < bd:
                best, bd = t, d
    return best or "?"


print("=== group rectangles ===")
named = []
for r in sorted(rects, key=lambda r: (r[1], r[0])):
    n = name_for(r)
    named.append((n, r))
    print(f"  {n:16} x {r[0]:7.2f} .. {r[2]:7.2f}   y {r[1]:7.2f} .. {r[3]:7.2f}"
          f"   ({r[2]-r[0]:.1f} x {r[3]-r[1]:.1f} mm)")


def where(x, y):
    hits = [n for n, r in named if r[0] <= x <= r[2] and r[1] <= y <= r[3]]
    return hits[0] if hits else "(outside any group)"


print()
print("=== labels, by group ===")
for tag in ("global_label", "label"):
    for m in re.finditer(
            r'\(' + tag + r'\s+"([^"]+)"[^(]*\(shape (\w+)\)\s*\(at '
            r'([-\d.]+) ([-\d.]+) ([-\d.]+)\)', src):
        nm, shape, x, y, rot = m.group(1), m.group(2), float(m.group(3)), \
            float(m.group(4)), m.group(5)
        print(f"  {tag:12} {nm:14} at ({x:7.2f}, {y:7.2f}) rot {rot:>3} "
              f"shape {shape:8} -> {where(x, y)}")
    if tag == "global_label":
        for m in re.finditer(r'\(label\s+"([^"]+)"\s*\(at '
                             r'([-\d.]+) ([-\d.]+) ([-\d.]+)\)', src):
            nm, x, y, rot = m.group(1), float(m.group(2)), float(m.group(3)), \
                m.group(4)
            print(f"  {'label':12} {nm:14} at ({x:7.2f}, {y:7.2f}) rot {rot:>3} "
                  f"{'':14} -> {where(x, y)}")
        break

print()
print("=== symbols, by group ===")
for m in re.finditer(r'\(lib_id "([^"]+)"\)\s*\(at ([-\d.]+) ([-\d.]+) ([-\d.]+)\)'
                     r'(.*?)\(property "Reference" "([^"]*)"', src, re.S):
    lib, x, y, rot, mid, ref = m.group(1), float(m.group(2)), float(m.group(3)), \
        m.group(4), m.group(5), m.group(6)
    mir = re.search(r'\(mirror (\w+)\)', mid)
    print(f"  {ref:8} {lib:34} at ({x:7.2f}, {y:7.2f}) rot {rot:>3}"
          f" mirror {mir.group(1) if mir else '-':4} -> {where(x, y)}")
