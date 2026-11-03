"""Counts for the verification table: symbols, placed pins, wires, total wire
length, wire corners (exactly two wire ends meeting at a right angle, no pin,
no other wire through), junctions, distinct wire strokes.

usage: python3 counts.py <sheet.kicad_sch>
"""
import collections
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

sheet = kicad_sheet.read(sys.argv[1])
symbols = sheet.symbols()
parts = [s for s in symbols if not s.ref.startswith("#")]
power = [s for s in symbols if s.ref.startswith("#PWR")]
flags = [s for s in symbols if s.ref.startswith("#FLG")]
pins = sheet.pin_points_by_ref()
part_pins = [p for p in pins if not p[2].startswith("#")]
wires = sheet.wires()
pin_points = sheet.pin_points()

ends = collections.defaultdict(list)
for w in wires:
    ends[(w.x1, w.y1)].append(w)
    ends[(w.x2, w.y2)].append(w)
corners = 0
for (x, y), ws in ends.items():
    if len(ws) != 2 or (x, y) in pin_points:
        continue
    if any(w.interior(x, y) for w in wires):
        continue
    if ws[0].horizontal != ws[1].horizontal:
        corners += 1

strokes = collections.Counter((w.width, w.colour) for w in wires)

# Wire groups joined end-to-wire (a wire end on another wire, end or interior),
# which on this page - no labels, junctions at every tee - is one group per net
# drawn as wire. Strokes per group should be one.
parent = list(range(len(wires)))


def find(i):
    while parent[i] != i:
        parent[i] = parent[parent[i]]
        i = parent[i]
    return i


for i, a in enumerate(wires):
    for j, b in enumerate(wires):
        if i < j and any(b.contains(x, y) for x, y in ((a.x1, a.y1), (a.x2, a.y2))) or \
                i < j and any(a.contains(x, y) for x, y in ((b.x1, b.y1), (b.x2, b.y2))):
            parent[find(i)] = find(j)
groups = collections.defaultdict(set)
for i, w in enumerate(wires):
    groups[find(i)].add((w.width, w.colour))
print(f"wire groups {len(groups)}; groups with more than one stroke {sum(1 for g in groups.values() if len(g) > 1)}")
print(f"symbols {len(symbols)} ({len(parts)} parts, {len(power)} power, {len(flags)} flags)")
print(f"placed pins {len(pins)} ({len(part_pins)} on parts)")
print(f"wires {len(wires)}; total length {sum(w.length for w in wires):.2f} mm")
print(f"wire corners {corners}")
print(f"junctions {len(sheet.junctions())}")
print(f"distinct wire strokes {len(strokes)}: {sorted(strokes.items(), key=str)}")
