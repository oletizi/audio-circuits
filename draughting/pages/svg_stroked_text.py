"""Measure the DRAWN text of a kicad-cli SVG page: each <g class="stroked-text"><desc>T</desc> ...
</g> group's path coordinates give its ink box. Reports ink outside the inner frame (other than the
frame's own border marks), ink partly on the title block, overlapping pairs of text ink boxes, and
text ink crossing a sheet box's edge (sheet boxes read from the .kicad_sch).

usage: python3 -I svg_stroked_text.py <page.svg> <root.kicad_sch>
"""
import re
import sys

FRAME = (11.980, 11.980, 267.377, 203.877)
TB = (159.300, 171.831, 267.250, 203.750)
svg = open(sys.argv[1], encoding="utf-8").read()
sch = open(sys.argv[2], encoding="utf-8").read()
num = re.compile(r"[-\d.]+")
boxes = []
for m in re.finditer(r'<g class="stroked-text"><desc>(.*?)</desc>(.*?)</g>', svg, re.S):
    name, body = m.group(1), m.group(2)
    xs, ys = [], []
    for d in re.findall(r'd="([^"]*)"', body):
        vals = [float(v) for v in num.findall(d)]
        xs += vals[0::2]
        ys += vals[1::2]
    if xs:
        boxes.append((name, min(xs), min(ys), max(xs), max(ys)))
sheets = []
for m in re.finditer(r'\(sheet\s+\(at ([-\d.]+) ([-\d.]+)\)\s+\(size ([-\d.]+) ([-\d.]+)\)', sch):
    x, y, w, h = map(float, m.groups())
    sheets.append((x, y, x + w, y + h))


def inside(b, r):
    return r[0] <= b[1] and b[3] <= r[2] and r[1] <= b[2] and b[4] <= r[3]


def hit(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


outside = [b for b in boxes if not inside(b, FRAME)]
in_tb = [b for b in boxes if inside(b, TB)]
part_tb = [b for b in boxes if hit(b[1:], TB) and not inside(b, TB)]
body = [b for b in boxes if inside(b, FRAME) and not inside(b, TB)]
pairs = [(body[i][0], body[j][0]) for i in range(len(body)) for j in range(i + 1, len(body)) if hit(body[i][1:], body[j][1:])]
cross = [b[0] for b in body for s in sheets if hit(b[1:], s) and not inside(b, s)]
print(f"stroked text groups {len(boxes)}; sheet boxes {len(sheets)}")
print(f"ink outside the inner frame: {len(outside)} {sorted(set(b[0] for b in outside))}")
print(f"ink wholly in the title block: {len(in_tb)}; partly on it: {len(part_tb)} {[b[0] for b in part_tb]}")
print(f"overlapping pairs of body text ink boxes: {len(pairs)} {pairs[:12]}")
print(f"body text ink crossing a sheet box edge: {len(cross)} {cross[:12]}")
