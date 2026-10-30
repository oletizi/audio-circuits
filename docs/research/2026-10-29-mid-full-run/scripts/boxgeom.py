"""Per-group-rectangle content bounding box and the four edge margins.

Read-only. It computes no placement; it reports what is already on the sheet so
a margin can be matched rather than invented.

Symbol extents come from the sheet's own `lib_symbols` block: every graphic
primitive (polyline, rectangle, circle, arc) plus every pin's anchor and its
far end, mapped into sheet space by the instance's placement and rotation with
the same mapping `junction_audit.py` uses and states:

    rot   0:  (dx, dy)            dx =  sx,  dy = -sy
    rot  90:  (dy, -dx)
    rot 180:  (-dx, -dy)
    rot 270:  (-dy, dx)

Visible text fields are included as a separate column, with the glyph box
approximated as width = 0.75 * size * len(text) and height = size, centred on
the field anchor. The approximation is stated because it is one: a text margin
from it is indicative, a graphics margin from it is exact.

**A FIELD'S STORED ANGLE IS NOT THE ANGLE IT RENDERS AT.** KiCad composes it
with the parent symbol's rotation, so a field at angle 90 on a symbol at
rotation 270 draws HORIZONTALLY. The first version of this script read the
stored angle alone and reported `SI6`'s reference as a vertical 2.86 mm-tall
box when it renders as a horizontal 1.27 mm-tall one - a 1.43 mm error in a
margin, in the direction that makes a page look tighter than it is. The
composition rule is read off this sheet and confirmed in the render: `R1` is
rot 270 with field angle 90 and `SI3` is rot 180 with field angle 0, and both
draw horizontal text. Orientation is horizontal when
`(symbol_rotation + field_angle) mod 180 == 0`.

usage: boxgeom.py <sheet.kicad_sch>
"""
import math
import re
import sys


def lib_geometry(src):
    """lib_id -> list of (sx, sy) extreme points of its drawn graphics+pins."""
    out = {}
    for m in re.finditer(r'^\t\t\(symbol "([^"]+)"\n', src, re.M):
        lib_id = m.group(1)
        if ":" not in lib_id:
            continue
        start = m.end()
        nxt = re.search(r'^\t\t\(symbol "[^"]+"\n', src[start:], re.M)
        end = start + (nxt.start() if nxt else len(src) - start)
        body = src[start:end]
        pts = []
        for xy in re.finditer(r'\(xy ([-\d.]+) ([-\d.]+)\)', body):
            pts.append((float(xy.group(1)), float(xy.group(2))))
        for r in re.finditer(
                r'\(rectangle \(start ([-\d.]+) ([-\d.]+)\) \(end ([-\d.]+) ([-\d.]+)\)',
                body):
            a, b, c, d = (float(g) for g in r.groups())
            pts += [(a, b), (c, d)]
        for c in re.finditer(r'\(circle \(center ([-\d.]+) ([-\d.]+)\) \(radius ([-\d.]+)\)',
                             body):
            cx, cy, rad = (float(g) for g in c.groups())
            pts += [(cx - rad, cy - rad), (cx + rad, cy + rad)]
        for p in re.finditer(
                r'\(pin \w+ \w+\n\s*\(at ([-\d.]+) ([-\d.]+) (\d+)\)\s*\(length ([-\d.]+)\)',
                body):
            px, py, ang, ln = (float(g) for g in p.groups())
            pts.append((px, py))
            pts.append((px + ln * math.cos(math.radians(ang)),
                        py + ln * math.sin(math.radians(ang))))
        for p in re.finditer(r'\(pin \w+ \w+\n\s*\(at ([-\d.]+) ([-\d.]+) \d+\) \(length ([-\d.]+)\)',
                             body):
            px, py, ln = (float(g) for g in p.groups())
            pts.append((px, py))
        out[lib_id] = pts
    return out


def rotate(dx, dy, rot):
    if rot == 0:
        return dx, dy
    if rot == 90:
        return dy, -dx
    if rot == 180:
        return -dx, -dy
    if rot == 270:
        return -dy, dx
    raise SystemExit(f"unhandled rotation {rot}")


def instance_points(src, table):
    """[(x, y, ref, what)] every drawn graphic point of every placed symbol."""
    pts = []
    for m in re.finditer(
            r'^\t\(symbol\n\t\t\(lib_id "([^"]+)"\)\n\t\t\(at ([-\d.]+) ([-\d.]+) (\d+)\)'
            r'(?:.*?)^\t\)$', src, re.M | re.S):
        block = m.group(0)
        lib_id = m.group(1)
        x, y, rot = float(m.group(2)), float(m.group(3)), int(m.group(4))
        ref = re.search(r'\(property "Reference" "([^"]*)"', block)
        ref = ref.group(1) if ref else "?"
        if lib_id not in table:
            raise SystemExit(f"{ref}: no lib_symbols entry for {lib_id}")
        for sx, sy in table[lib_id]:
            dx, dy = rotate(sx, -sy, rot)
            pts.append((round(x + dx, 3), round(y + dy, 3), ref, "graphic"))
    return pts


def text_points(src):
    """[(x, y, ref, what)] approximate glyph-box corners of visible fields.

    Each symbol instance is walked whole so that a field's angle can be
    composed with its parent's rotation - see the module docstring.
    """
    pts = []
    for m in re.finditer(
            r'^\t\(symbol\n\t\t\(lib_id "[^"]+"\)\n\t\t\(at [-\d.]+ [-\d.]+ (\d+)\)'
            r'(?:.*?)^\t\)$', src, re.M | re.S):
        rot = int(m.group(1))
        for f in re.finditer(
                r'\(property "(Reference|Value)" "([^"]*)" '
                r'\(at ([-\d.]+) ([-\d.]+) (\d+)\)\s*\n'
                r'\s*\(effects \(font \(size ([\d.]+) [\d.]+\)\)( hide)?\)',
                m.group(0)):
            if f.group(7):
                continue
            text = f.group(2)
            x, y = float(f.group(3)), float(f.group(4))
            ang, size = int(f.group(5)), float(f.group(6))
            w = 0.75 * size * len(text)
            h = size
            if (rot + ang) % 180 == 90:
                w, h = h, w
            pts += [(x - w / 2, y - h / 2, text, "text"),
                    (x + w / 2, y + h / 2, text, "text")]
    return pts


def main():
    src = open(sys.argv[1]).read()
    rects = [(float(a), float(b), float(c), float(d)) for a, b, c, d in re.findall(
        r'\(rectangle \(start ([-\d.]+) ([-\d.]+)\) \(end ([-\d.]+) ([-\d.]+)\)', src)]
    groups = [r for r in rects if r[0] > 5 and (r[2] - r[0]) > 10]
    names = {m.group(1): (float(m.group(2)), float(m.group(3))) for m in re.finditer(
        r'\(text "([^"]+)" \(at ([-\d.]+) ([-\d.]+) \d+\)', src)}

    content = []
    for m in re.finditer(
            r'\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)', src):
        a, b, c, d = (float(g) for g in m.groups())
        content += [(a, b, "wire", "wire"), (c, d, "wire", "wire")]
    table = lib_geometry(src)
    graphics = instance_points(src, table)
    content += graphics
    texts = text_points(src)

    for (x1, y1, x2, y2) in sorted(groups, key=lambda r: (r[1], r[0])):
        label = "?"
        for t, (tx, ty) in names.items():
            if abs(tx - (x1 + 2.0)) < 0.1 and abs(ty - (y1 + 2.0)) < 0.1:
                label = t
        def inside(pts):
            return [p for p in pts
                    if x1 - 0.01 <= p[0] <= x2 + 0.01 and y1 - 0.01 <= p[1] <= y2 + 0.01]
        g = inside(content)
        t = inside(texts)
        print(f"=== {label}   rect ({x1}, {y1}) -> ({x2}, {y2})"
              f"   {x2 - x1:.2f} x {y2 - y1:.2f} mm")
        for what, pts in (("graphics", g), ("graphics+text", g + t)):
            if not pts:
                print(f"  {what:14s} nothing inside")
                continue
            gx0 = min(p[0] for p in pts); gx1 = max(p[0] for p in pts)
            gy0 = min(p[1] for p in pts); gy1 = max(p[1] for p in pts)
            lo = min(pts, key=lambda p: p[0]); hi = max(pts, key=lambda p: p[0])
            top = min(pts, key=lambda p: p[1]); bot = max(pts, key=lambda p: p[1])
            print(f"  {what:14s} margins  left {gx0 - x1:6.2f}  right {x2 - gx1:6.2f}"
                  f"  top {gy0 - y1:6.2f}  bottom {y2 - gy1:6.2f}")
            print(f"  {'':14s}          bottom-most {bot[2]!r} at ({bot[0]}, {bot[1]})"
                  f"   top-most {top[2]!r} at ({top[0]}, {top[1]})")
        print()


main()
