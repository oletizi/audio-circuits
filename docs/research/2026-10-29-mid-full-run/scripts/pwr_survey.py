"""Survey every power symbol on the sheet and the wire attached to its pin.

Reporting only.
"""
import re
import sys

src = open(sys.argv[1]).read()

wires = []
for m in re.finditer(
    r"\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)", src
):
    wires.append(tuple(float(g) for g in m.groups()))

print(f"total wires on sheet: {len(wires)}")
print()

for m in re.finditer(
    r'\(symbol\n\t\t\(lib_id "(copperhead_power:[^"]+)"\)\n\t\t\(at ([-\d.]+) ([-\d.]+) ([-\d.]+)\)(.*?)\n\t\)\n',
    src,
    re.S,
):
    lib, ax, ay, rot, body = (
        m.group(1),
        float(m.group(2)),
        float(m.group(3)),
        m.group(4),
        m.group(5),
    )
    ref = re.search(r'\(property "Reference" "([^"]*)"', body)
    val = re.search(r'\(property "Value" "([^"]*)" \(at ([-\d.]+) ([-\d.]+)', body)
    attached = [w for w in wires if (w[0], w[1]) == (ax, ay) or (w[2], w[3]) == (ax, ay)]
    print(f"{ref.group(1) if ref else '?':10s} {lib:26s} at ({ax}, {ay}) rot {rot}")
    if val:
        print(f"    Value text '{val.group(1)}' at ({val.group(2)}, {val.group(3)})")
    for w in attached:
        print(f"    wire ({w[0]}, {w[1]}) -> ({w[2]}, {w[3]})")
    if not attached:
        print("    NO WIRE touches this anchor")
