"""Junction dots and wire-to-wire tees, audited against pins as well as wires.

WHY THIS EXISTS, and it is a correction to the inherited check.
`scripts/orphan_junctions.py` (from the low-cut run) counts only the WIRES
passing through a junction and calls anything with fewer than two an orphan.
That is right for the defect it was written for - akcli's `delete_object`
leaves the dot behind when it removes a wire - and WRONG for a dot where a
single wire passes through a symbol PIN, which is a legitimate tee and the
commonest shape in a rail-and-riser arrangement. Run against the hi-boost page
it reported 6 orphans, every one of them a rail or a selector run crossing a
pin. A check that cannot fail usefully is worse than no check, so this one
counts pins too.

It also reports the converse, which no committed script covered: a wire-to-wire
tee with NO dot on it. That is a connection a reader cannot see.

Pin positions come from the sheet's own `lib_symbols` block - the connection
point is the pin's `(at sx sy angle)` in symbol space, y up - mapped into sheet
space by the symbol's placement and rotation:

    rot   0:  (dx, dy)            dx =  sx,  dy = -sy
    rot  90:  (dy, -dx)
    rot 180:  (-dx, -dy)
    rot 270:  (-dy, dx)

verified against `akcli pins <lib_id> --rotation R` for Device:C, Device:L,
Device:R, Device:R_Potentiometer and Switch:SW_Rotary_1x6_MP.

usage: junction_audit.py <sheet.kicad_sch>
"""
import re
import sys

TOL = 0.001


def lib_pins(src):
    """lib_id -> [(sx, sy)] connection points in symbol space."""
    out = {}
    for m in re.finditer(r'^\t\t\(symbol "([^"]+)"\n', src, re.M):
        lib_id = m.group(1)
        if ":" not in lib_id:
            continue
        # The lib_symbols entry runs to the next top-level "\n\t\t(symbol" at
        # the same depth, or to the end of the lib_symbols block.
        start = m.end()
        nxt = re.search(r'^\t\t\(symbol "[^"]+"\n', src[start:], re.M)
        end = start + (nxt.start() if nxt else len(src) - start)
        pts = [(float(a), float(b)) for a, b in re.findall(
            r'\(pin \w+ \w+\n\s*\(at ([-\d.]+) ([-\d.]+) \d+\)', src[start:end])]
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


def instance_pins(src, table):
    pts = []
    for m in re.finditer(
            r'^\t\(symbol\n\t\t\(lib_id "([^"]+)"\)\n\t\t\(at ([-\d.]+) ([-\d.]+) (\d+)\)',
            src, re.M):
        lib_id, x, y, rot = m.group(1), float(m.group(2)), float(m.group(3)), int(m.group(4))
        for sx, sy in table.get(lib_id, []):
            dx, dy = rotate(sx, -sy, rot)
            pts.append((round(x + dx, 3), round(y + dy, 3)))
    return pts


def main():
    src = open(sys.argv[1]).read()
    wires = [tuple(round(float(g), 3) for g in m.groups()) for m in re.finditer(
        r'\(wire\s*\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)', src)]
    pins = set(instance_pins(src, lib_pins(src)))
    juncs = [(float(m.group(1)), float(m.group(2)), m.group(3))
             for m in re.finditer(
                 r'\(junction \(at ([-\d.]+) ([-\d.]+)\).*?\(uuid "([0-9a-f-]+)"\)',
                 src, re.S)]

    def through(x, y):
        n = 0
        for x1, y1, x2, y2 in wires:
            if abs(x1 - x2) < TOL and abs(x1 - x) < TOL and min(y1, y2) - TOL <= y <= max(y1, y2) + TOL:
                n += 1
            elif abs(y1 - y2) < TOL and abs(y1 - y) < TOL and min(x1, x2) - TOL <= x <= max(x1, x2) + TOL:
                n += 1
        return n

    print(f"wires {len(wires)}   symbol pins {len(pins)}   junctions {len(juncs)}")
    orphans = 0
    at_pin = 0
    for x, y, uuid in juncs:
        w = through(x, y)
        p = 1 if (round(x, 3), round(y, 3)) in pins else 0
        if w + p < 2:
            orphans += 1
            print(f"  ORPHAN   ({x:7.2f},{y:7.2f})  wires {w} pins {p}  {uuid}")
        elif p and w < 2:
            at_pin += 1
    print(f"  junctions at a pin on a single wire (legitimate tees): {at_pin}")
    print(f"ORPHAN JUNCTIONS: {orphans}")

    # Wire-to-wire tees, and whether each carries a dot.
    horiz = [s for s in wires if abs(s[1] - s[3]) < TOL]
    vert = [s for s in wires if abs(s[0] - s[2]) < TOL]
    tees = set()
    for h in horiz:
        hy = h[1]
        hx0, hx1 = sorted((h[0], h[2]))
        for v in vert:
            vx = v[0]
            vy0, vy1 = sorted((v[1], v[3]))
            if not (hx0 - TOL <= vx <= hx1 + TOL and vy0 - TOL <= hy <= vy1 + TOL):
                continue
            h_end = abs(vx - hx0) < TOL or abs(vx - hx1) < TOL
            v_end = abs(hy - vy0) < TOL or abs(hy - vy1) < TOL
            if h_end and v_end:
                continue
            if h_end or v_end:
                tees.add((round(vx, 3), round(hy, 3)))
    dots = {(round(x, 3), round(y, 3)) for x, y, _ in juncs}
    missing = sorted(t for t in tees if t not in dots)
    print(f"WIRE-TO-WIRE TEES: {len(tees)}   without a dot: {len(missing)} {missing}")

    # Pins lying on the interior of a wire, and whether each carries a dot.
    pin_tees = set()
    for (px, py) in pins:
        for x1, y1, x2, y2 in wires:
            if abs(x1 - x2) < TOL and abs(x1 - px) < TOL and min(y1, y2) + TOL < py < max(y1, y2) - TOL:
                pin_tees.add((px, py))
            elif abs(y1 - y2) < TOL and abs(y1 - py) < TOL and min(x1, x2) + TOL < px < max(x1, x2) - TOL:
                pin_tees.add((px, py))
    missing_p = sorted(t for t in pin_tees if t not in dots)
    print(f"PINS ON A WIRE INTERIOR: {len(pin_tees)}   without a dot: "
          f"{len(missing_p)} {missing_p}")


main()
