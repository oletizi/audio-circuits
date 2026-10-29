"""Group wires into connected clusters and report colour disagreement.

Two wires are in one cluster when they share an endpoint, or when one's endpoint
lies on the other's interior. Within a cluster every wire should carry the same
stroke colour, because copperhead colours by net.
"""
import re
import sys

src = open(sys.argv[1]).read()

wires = []
for m in re.finditer(
    r"\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)\s*"
    r"\(stroke \(width ([\d.]+)\) \(type default\)(?: \(color ([\d ]+)\))?\)",
    src,
):
    ax, ay, bx, by = (round(float(g), 3) for g in m.groups()[:4])
    wires.append({"a": (ax, ay), "b": (bx, by), "w": m.group(5), "c": m.group(6)})

print(f"wires parsed: {len(wires)} (file has {src.count('(wire')})")


def on_segment(p, w):
    (ax, ay), (bx, by) = w["a"], w["b"]
    if ax == bx:
        return p[0] == ax and min(ay, by) <= p[1] <= max(ay, by)
    if ay == by:
        return p[1] == ay and min(ax, bx) <= p[0] <= max(ax, bx)
    return False


parent = list(range(len(wires)))


def find(i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]
        i = parent[i]
    return i


def union(i, j):
    parent[find(i)] = find(j)


for i, wi in enumerate(wires):
    for j in range(i + 1, len(wires)):
        wj = wires[j]
        if (
            on_segment(wi["a"], wj)
            or on_segment(wi["b"], wj)
            or on_segment(wj["a"], wi)
            or on_segment(wj["b"], wi)
        ):
            union(i, j)

clusters = {}
for i in range(len(wires)):
    clusters.setdefault(find(i), []).append(i)

bad = 0
for root, members in clusters.items():
    cols = {wires[i]["c"] for i in members}
    widths = {wires[i]["w"] for i in members}
    tag = "OK " if len(cols) == 1 and len(widths) == 1 else "MIXED"
    if tag == "MIXED":
        bad += 1
    print(f"{tag} cluster of {len(members):2d} wires: colours={sorted(str(c) for c in cols)} widths={sorted(widths)}")
    if tag == "MIXED":
        for i in members:
            w = wires[i]
            print(f"      {w['a']} -> {w['b']}   width {w['w']}  colour {w['c']}")
print(f"\nclusters with mixed stroke: {bad}")
