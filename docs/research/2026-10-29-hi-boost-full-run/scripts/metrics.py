"""One table of the page's measurable costs, so a before/after can be compared.

Reports: wire count and total length, the longest wire, true crossings,
wire-to-wire tees, junction dots, symbol and pin counts, label counts, and
**duplicate on-page labels per group** - the last being the one with a hard
threshold, because `EVALUATING-DRAWINGS.md` says to collapse a duplicate pair
without reasoning about it, so the number has to be zero.

A label's group is the group rectangle that contains its anchor. A label
outside every rectangle is reported as `-`, which would itself be a finding.

usage: metrics.py <sheet.kicad_sch> [<sheet.kicad_sch> ...]
"""
import collections
import re
import sys

TOL = 0.001


def parse(path):
    src = open(path).read()
    wires = [tuple(round(float(g), 3) for g in m.groups()) for m in re.finditer(
        r'\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)', src)]
    rects = [(float(a), float(b), float(c), float(d)) for a, b, c, d in re.findall(
        r'\(rectangle \(start ([-\d.]+) ([-\d.]+)\) \(end ([-\d.]+) ([-\d.]+)\)', src)]
    texts = {m.group(1): (float(m.group(2)), float(m.group(3))) for m in re.finditer(
        r'\(text "([^"]+)" \(at ([-\d.]+) ([-\d.]+) \d+\)', src)}
    labels = [(m.group(2), float(m.group(3)), float(m.group(4)), m.group(1) == "global_label")
              for m in re.finditer(
                  r'\((global_label|label) "([^"]+)"(?: \(shape \w+\))? \(at ([-\d.]+) ([-\d.]+)',
                  src)]
    syms = re.findall(r'\(lib_id "([^"]+)"\)\n\t\t\(at ', src)
    pins = len(re.findall(r'^\t\t\(pin "[^"]*" \(uuid', src, re.M))
    juncs = re.findall(r'\(junction \(at ([-\d.]+) ([-\d.]+)\)', src)
    return src, wires, rects, texts, labels, syms, pins, juncs


def group_of(x, y, rects, names):
    for (x1, y1, x2, y2) in rects:
        if x1 - 0.01 <= x <= x2 + 0.01 and y1 - 0.01 <= y <= y2 + 0.01:
            # The group's title text sits just inside the rectangle's
            # top-left corner. BOTH coordinates are needed: on this page the
            # Junction and Hi boost rectangles share x1 = 16.51, and matching
            # on x alone named one of them after the other.
            for t, (tx, ty) in names.items():
                if abs(tx - (x1 + 2.0)) < 0.1 and abs(ty - (y1 + 2.0)) < 0.1:
                    return t
            return f"({x1},{y1})"
    return "-"


def report(path):
    src, wires, rects, texts, labels, syms, pins, juncs = parse(path)
    # Only the six group rectangles are page-level; symbol-body rectangles in
    # lib_symbols are small and sit near the origin.
    groups = [r for r in rects if r[0] > 5 and (r[2] - r[0]) > 10]
    total = sum(abs(a - c) + abs(b - d) for a, b, c, d in wires)
    longest = max(((abs(a - c) + abs(b - d), (a, b, c, d)) for a, b, c, d in wires),
                  default=(0, None))

    horiz = [s for s in wires if abs(s[1] - s[3]) < TOL]
    vert = [s for s in wires if abs(s[0] - s[2]) < TOL]
    cross, tees = set(), set()
    for h in horiz:
        hy = h[1]
        hx0, hx1 = sorted((h[0], h[2]))
        for v in vert:
            vx = v[0]
            vy0, vy1 = sorted((v[1], v[3]))
            if not (hx0 - TOL <= vx <= hx1 + TOL and vy0 - TOL <= hy <= vy1 + TOL):
                continue
            he = abs(vx - hx0) < TOL or abs(vx - hx1) < TOL
            ve = abs(hy - vy0) < TOL or abs(hy - vy1) < TOL
            if he and ve:
                continue
            (tees if (he or ve) else cross).add((round(vx, 3), round(hy, 3)))

    by_net = collections.defaultdict(list)
    for name, x, y, is_global in labels:
        by_net[name].append((group_of(x, y, groups, texts), x, y, is_global))

    dup = []
    for name, rows in sorted(by_net.items()):
        seen = collections.Counter(r[0] for r in rows)
        for g, n in seen.items():
            if n > 1:
                dup.append((name, g, n))

    print(f"=== {path}")
    print(f"  wires                        {len(wires)}")
    print(f"  total wire length            {total:.2f} mm")
    print(f"  longest wire                 {longest[0]:.2f} mm  {longest[1]}")
    print(f"  true crossings               {len(cross)}  {sorted(cross)}")
    print(f"  wire-to-wire tees            {len(tees)}")
    print(f"  junction dots                {len(juncs)}")
    print(f"  symbols placed               {len(syms)}")
    print(f"  symbol pin instances         {pins}")
    print(f"  global labels                {sum(1 for l in labels if l[3])}")
    print(f"  local labels                 {sum(1 for l in labels if not l[3])}")
    print(f"  nets carrying >1 label       "
          f"{sum(1 for v in by_net.values() if len(v) > 1)}")
    print(f"  DUPLICATE LABELS IN ONE GROUP {len(dup)}  {dup}")
    print(f"  group rectangles             {len(groups)}")
    print()


for p in sys.argv[1:]:
    report(p)
