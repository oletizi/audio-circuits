"""Report junction dots that no longer sit where two or more wires meet.

A junction left behind by a deleted wire is electrically inert - the netlist
does not change - so neither a net comparison nor an ERC run sees it. It still
renders as a dot, and a dot on a wire says "a connection here".

usage: orphan_junctions.py <sheet.kicad_sch>
"""
import re
import sys

src = open(sys.argv[1]).read()
wires = [tuple(float(g) for g in m.groups()) for m in re.finditer(
    r'\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)', src)]
orphans = 0
total = 0
for m in re.finditer(r'\(junction \(at ([-\d.]+) ([-\d.]+)\)(.*?)\(uuid "([0-9a-f-]+)"\)',
                     src, re.S):
    x, y, uuid = float(m.group(1)), float(m.group(2)), m.group(4)
    total += 1
    n = 0
    for x1, y1, x2, y2 in wires:
        if x1 == x2 == x and min(y1, y2) <= y <= max(y1, y2):
            n += 1
        elif y1 == y2 == y and min(x1, x2) <= x <= max(x1, x2):
            n += 1
    if n < 2:
        orphans += 1
        print(f"  ORPHAN ({x:7.2f},{y:7.2f})  wires through it: {n}  {uuid}")
print(f"{total} junction(s), {orphans} orphan(s)")
