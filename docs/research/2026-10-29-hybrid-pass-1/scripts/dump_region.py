"""Dump every sheet element whose coordinates fall inside a rectangle.

Read-only reporting aid. It does not compute any placement.
"""
import re
import sys

path = sys.argv[1]
x0, y0, x1, y1 = (float(v) for v in sys.argv[2:6])
src = open(path).read()


def inside(x, y):
    return x0 <= x <= x1 and y0 <= y <= y1


print("--- wires ---")
for m in re.finditer(
    r"\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)", src
):
    ax, ay, bx, by = (float(g) for g in m.groups())
    if inside(ax, ay) or inside(bx, by):
        print(f"  ({ax}, {ay}) -> ({bx}, {by})")

print("--- junctions ---")
for m in re.finditer(r"\(junction \(at ([-\d.]+) ([-\d.]+)\)", src):
    ax, ay = (float(g) for g in m.groups())
    if inside(ax, ay):
        print(f"  ({ax}, {ay})")

print("--- symbols ---")
for m in re.finditer(
    r'\(symbol\n\t\t\(lib_id "([^"]+)"\)\n\t\t\(at ([-\d.]+) ([-\d.]+) ([-\d.]+)\)(.*?)\n\t\)\n',
    src,
    re.S,
):
    lib, ax, ay, rot, body = m.group(1), float(m.group(2)), float(m.group(3)), m.group(4), m.group(5)
    if not inside(ax, ay):
        continue
    ref = re.search(r'\(property "Reference" "([^"]*)" \(at ([-\d.]+) ([-\d.]+) ([-\d.]+)\)', body)
    val = re.search(r'\(property "Value" "([^"]*)" \(at ([-\d.]+) ([-\d.]+) ([-\d.]+)\)', body)
    mir = re.search(r"\(mirror (\w+)\)", body)
    print(f"  {ref.group(1) if ref else '?'}  {lib}  at ({ax}, {ay}) rot {rot} mirror {mir.group(1) if mir else '-'}")
    if ref:
        print(f"      Reference text at ({ref.group(2)}, {ref.group(3)}) angle {ref.group(4)}")
    if val:
        print(f"      Value '{val.group(1)}' text at ({val.group(2)}, {val.group(3)}) angle {val.group(4)}")

print("--- global labels ---")
for m in re.finditer(
    r'\(global_label "([^"]+)"\s*\(shape (\w+)\)\s*\(at ([-\d.]+) ([-\d.]+) ([-\d.]+)\)', src
):
    name, shape, ax, ay, rot = m.group(1), m.group(2), float(m.group(3)), float(m.group(4)), m.group(5)
    if inside(ax, ay):
        print(f"  '{name}' {shape} at ({ax}, {ay}) rot {rot}")

print("--- local labels ---")
for m in re.finditer(r'\n\t\(label "([^"]+)"\s*\(at ([-\d.]+) ([-\d.]+) ([-\d.]+)\)', src):
    name, ax, ay, rot = m.group(1), float(m.group(2)), float(m.group(3)), m.group(4)
    if inside(ax, ay):
        print(f"  '{name}' at ({ax}, {ay}) rot {rot}")
