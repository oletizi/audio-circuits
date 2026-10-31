"""Group wires into connected clusters and report colour disagreement.

Two wires are in one cluster when they share an endpoint, or when one's endpoint
lies on the other's interior. Within a cluster every wire should carry the same
stroke colour, because copperhead colours by net.

**IT PRINTED ITS OWN SHORTFALL AND CARRIED ON, WHICH IS THE FAILURE MODE RATHER
THAN A GUARD AGAINST IT.** Its pattern ran from the `(pts` INTO the stroke and
required `(stroke (width W) (type default)` with the members in that order and
on that line - one character away from the shape that silently dropped 23 of
`pultec-hi-cut`'s 77 wires, every grey ground wire among them. It then printed
`wires parsed: 54 (file has 77)` and went on to cluster the 54. **Two numbers
side by side is not a refusal**; a reader who did not compare them got a colour
verdict over two thirds of the page. It reads through
`docs/research/lib/kicad_sheet.py` now, which refuses when its parse does not
account for every `(wire` token in the source.

usage: colour_check.py <sheet.kicad_sch>
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

sheet = kicad_sheet.read(sys.argv[1])
wires = sheet.wires()

print(f"wires parsed: {len(wires)}, and every '(wire' token in the file is "
      f"accounted for - a shortfall is a refusal, not a printed number")

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
        if (wj.contains(wi.x1, wi.y1) or wj.contains(wi.x2, wi.y2)
                or wi.contains(wj.x1, wj.y1) or wi.contains(wj.x2, wj.y2)):
            union(i, j)

clusters = {}
for i in range(len(wires)):
    clusters.setdefault(find(i), []).append(i)

bad = 0
for root, members in clusters.items():
    cols = {wires[i].colour for i in members}
    widths = {wires[i].width for i in members}
    tag = "OK " if len(cols) == 1 and len(widths) == 1 else "MIXED"
    if tag == "MIXED":
        bad += 1
    print(f"{tag} cluster of {len(members):2d} wires: "
          f"colours={sorted(str(c) for c in cols)} "
          f"widths={sorted(str(w) for w in widths)}")
    if tag == "MIXED":
        for i in members:
            w = wires[i]
            print(f"      ({w.x1}, {w.y1}) -> ({w.x2}, {w.y2})   "
                  f"width {w.width}  colour {w.colour}")
print(f"\nclusters with mixed stroke: {bad}")
