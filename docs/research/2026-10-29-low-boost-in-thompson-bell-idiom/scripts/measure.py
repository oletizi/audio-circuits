"""Measurements that speak to the defect the owner named on v3: empty space, and
wires that have to be scanned a long way.

  - sheet area, and the bounding box the drawn content actually occupies
  - total wire length
  - the longest run of wire with no junction, pin or label anywhere along it,
    which is the "long thin wire" a reader has to follow
  - median centre-to-centre distance from each symbol to its nearest neighbour,
    which is proximity: how close parts that sit together actually sit
"""
import re
import sys

MM = 1 / 0.0254
PAPER = {"A4": (11693, 8268), "A3": (16535, 11693)}


def main(path):
    t = open(path).read()
    paper = re.search(r'\(paper "([^"]+)"\)', t).group(1)
    W, H = PAPER[paper]

    segs = []
    for m in re.finditer(r"\(wire \(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)", t):
        x1, y1, x2, y2 = (round(float(v) * MM) for v in m.groups())
        segs.append((x1, y1, x2, y2))
    jn = {(round(float(a) * MM), round(float(b) * MM))
          for a, b in re.findall(r"\(junction \(at ([-\d.]+) ([-\d.]+)\)", t)}
    syms = [(round(float(a) * MM), round(float(b) * MM))
            for a, b in re.findall(r'\(symbol \(lib_id "[^"]+"\) \(at ([-\d.]+) ([-\d.]+)', t)]

    xs = [v for s in segs for v in (s[0], s[2])]
    ys = [v for s in segs for v in (s[1], s[3])]
    bw, bh = max(xs) - min(xs), max(ys) - min(ys)
    total = sum(abs(s[2] - s[0]) + abs(s[3] - s[1]) for s in segs)

    # longest stretch of a horizontal wire with no junction interrupting it
    worst = (0, None)
    for x1, y1, x2, y2 in segs:
        if y1 != y2:
            continue
        a, b = sorted((x1, x2))
        cuts = sorted(x for (x, y) in jn if y == y1 and a < x < b)
        edges = [a] + cuts + [b]
        for i in range(len(edges) - 1):
            run = edges[i + 1] - edges[i]
            if run > worst[0]:
                worst = (run, (edges[i], edges[i + 1], y1))

    near = []
    for i, p in enumerate(syms):
        d = min(abs(p[0] - q[0]) + abs(p[1] - q[1]) for j, q in enumerate(syms) if j != i)
        near.append(d)
    near.sort()

    print("%s  paper %s  %d x %d mil" % (path.split("/")[-1], paper, W, H))
    print("  content bounding box   %d x %d mil  (%.0f%% of the sheet area)"
          % (bw, bh, 100.0 * bw * bh / (W * H)))
    print("  total wire length      %d mil" % total)
    print("  longest untapped run   %d mil (%.0f%% of sheet width)  %s"
          % (worst[0], 100.0 * worst[0] / W, worst[1]))
    print("  symbols                %d" % len(syms))
    print("  nearest-neighbour gap  median %d mil, max %d mil" % (near[len(near) // 2], near[-1]))


if __name__ == "__main__":
    for p in sys.argv[1:]:
        main(p)
        print()
