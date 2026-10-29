"""List every label on the sheet, grouped by net name, with pairwise distances."""
import collections
import math
import re
import sys

src = open(sys.argv[1]).read()
by_net = collections.defaultdict(list)

for m in re.finditer(
    r'\(global_label "([^"]+)"\s*\(shape (\w+)\)\s*\(at ([-\d.]+) ([-\d.]+) ([-\d.]+)\)', src
):
    by_net[m.group(1)].append(("global", float(m.group(3)), float(m.group(4)), m.group(5)))

for m in re.finditer(r'\n\t\(label "([^"]+)"\s*\(at ([-\d.]+) ([-\d.]+) ([-\d.]+)\)', src):
    by_net[m.group(1)].append(("local", float(m.group(2)), float(m.group(3)), m.group(4)))

for net in sorted(by_net):
    inst = by_net[net]
    print(f"{net}  ({len(inst)} label{'s' if len(inst) > 1 else ''})")
    for kind, x, y, rot in inst:
        print(f"    {kind:7s} at ({x}, {y}) rot {rot}")
    if len(inst) > 1:
        for i in range(len(inst)):
            for j in range(i + 1, len(inst)):
                a, b = inst[i], inst[j]
                d = math.hypot(a[1] - b[1], a[2] - b[2])
                man = abs(a[1] - b[1]) + abs(a[2] - b[2])
                print(
                    f"    gap ({a[1]},{a[2]})-({b[1]},{b[2]}): "
                    f"straight {d:.2f} mm, orthogonal run {man:.2f} mm"
                )
    print()
