"""Measurements that speak to the defect the owner named on v3: empty space, and
wires that have to be scanned a long way.

  - sheet area, and the bounding box the drawn content actually occupies
  - total wire length
  - the longest run of wire with no junction, pin or label anywhere along it,
    which is the "long thin wire" a reader has to follow
  - median centre-to-centre distance from each symbol to its nearest neighbour,
    which is proximity: how close parts that sit together actually sit
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

MM = 1 / 0.0254
PAPER = {"A4": (11693, 8268), "A3": (16535, 11693)}


def main(path):
    """Read through the shared sheet reader.

    **BOTH OF THIS SCRIPT'S PARSERS UNDERSTOOD ONE TEXTUAL FORM AND NOT THE
    OTHER, AND THEY DISAGREED ABOUT WHICH.** The wire pattern had a literal
    space after `(wire`, which matches only the one-line form: 7 of 78 wires on
    the accepted `pultec-low-boost` page. The symbol pattern required
    `(symbol (lib_id ...)` on ONE line, so on a block-form sheet it finds NO
    symbols at all, and the nearest-neighbour median - the proximity number this
    script exists for - would be computed over an empty list. Both were complete
    on this run's own three sheets, which are one-line throughout. That is luck.
    `docs/research/lib/kicad_sheet.py` parses by balanced parentheses and refuses
    when its parse does not account for every token in the source.
    """
    sheet = kicad_sheet.read(path)
    t = sheet.src
    paper = re.search(r'\(paper "([^"]+)"\)', t).group(1)
    W, H = PAPER[paper]

    segs = [tuple(round(v * MM) for v in w.pts) for w in sheet.wires()]
    jn = {(round(x * MM), round(y * MM)) for x, y, _ in sheet.junctions()}
    syms = [(round(s.x * MM), round(s.y * MM)) for s in sheet.symbols()]
    if not syms:
        raise SystemExit(
            f"{path}: no symbol instances found, so proximity cannot be "
            f"measured - this is a refusal rather than a median over nothing")

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
