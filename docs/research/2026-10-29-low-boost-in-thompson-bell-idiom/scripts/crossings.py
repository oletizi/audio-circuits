"""Count places where one wire segment crosses another without a junction.

Reads the wire segments straight out of the .kicad_sch, keeps the axis-aligned
ones, and reports every horizontal/vertical pair whose intersection is strictly
interior to both.  An interior intersection with a junction dot on it is a
connection, not a crossing, so junctions are subtracted.
"""
import re
import sys

MM = 1 / 0.0254


def segments(text):
    out = []
    for m in re.finditer(r"\(wire \(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)", text):
        x1, y1, x2, y2 = (round(float(v) * MM) for v in m.groups())
        out.append((x1, y1, x2, y2))
    return out


def junctions(text):
    return {
        (round(float(a) * MM), round(float(b) * MM))
        for a, b in re.findall(r"\(junction \(at ([-\d.]+) ([-\d.]+)\)", text)
    }


def main(path):
    text = open(path).read()
    segs = segments(text)
    jn = junctions(text)
    horiz = [(min(x1, x2), max(x1, x2), y1) for x1, y1, x2, y2 in segs if y1 == y2]
    vert = [(min(y1, y2), max(y1, y2), x1) for x1, y1, x2, y2 in segs if x1 == x2]
    print("segments: %d  (horizontal %d, vertical %d)  junctions: %d"
          % (len(segs), len(horiz), len(vert), len(jn)))
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
