"""Count places where one wire segment crosses another without a junction.

Keeps the axis-aligned segments and reports every horizontal/vertical pair whose
intersection is strictly interior to both. An interior intersection with a
junction dot on it is a connection, not a crossing, so junctions are subtracted.
Coordinates are rounded to whole mils, which is this run's convention.

**THIS WAS THE WORST WIRE PARSER IN THE REPOSITORY AND IT GOT AWAY WITH IT.**
Its pattern had a LITERAL SPACE after `(wire`, so it matched only the one-line
form. Measured on the five pages approved since, it finds **7 of 78** wires on
`pultec-low-boost`'s accepted page, **25 of 46** on `pultec-hi-cut` and **64 of
82** on `pultec-mid`, and it reports the short number as the answer. It was
complete on THIS run's own three sheets, which are one-line throughout - luck,
not a property of the check, and the reason nothing caught it for a day while
the file was copied forward.

It now reads through `docs/research/lib/kicad_sheet.py`, which parses by
balanced parentheses and refuses when its parse does not account for every
`(wire` token in the source.

usage: crossings.py <sheet.kicad_sch>
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

MM = 1 / 0.0254


def main(path):
    sheet = kicad_sheet.read(path)
    segs = [tuple(round(v * MM) for v in w.pts) for w in sheet.wires()]
    jn = {(round(x * MM), round(y * MM)) for x, y, _ in sheet.junctions()}
    horiz = [(min(x1, x2), max(x1, x2), y1) for x1, y1, x2, y2 in segs if y1 == y2]
    vert = [(min(y1, y2), max(y1, y2), x1) for x1, y1, x2, y2 in segs if x1 == x2]
    print("segments: %d  (horizontal %d, vertical %d)  junctions: %d"
          % (len(segs), len(horiz), len(vert), len(jn)))
    print("  every '(wire' token in the file is accounted for, or this would "
          "have refused")
    hits = []
    for xa, xb, y in horiz:
        for ya, yb, x in vert:
            if xa < x < xb and ya < y < yb:
                if (x, y) not in jn:
                    hits.append((x, y))
    print("interior crossings without a junction: %d" % len(hits))
    for h in sorted(set(hits)):
        print("   at", h)


if __name__ == "__main__":
    main(sys.argv[1])
