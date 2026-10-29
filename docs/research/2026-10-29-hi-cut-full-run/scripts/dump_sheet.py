"""Every wire, junction, label and no-connect on a sheet, with its uuid.

Read-only. The uuids are what akcli deletes by, so this is the input to the
op-list rather than a check.

**IT PARSES BY BLOCK, NOT BY ONE LONG REGEX, and that is a correction.** The
first version of this script matched `(wire (pts ...) (stroke (width W) ...))`
with a single pattern and SILENTLY DROPPED every wire carrying a `(color ...)`
inside its stroke - 23 of the 77 wires on this board, including all six of J2's
ground stubs, which are exactly the wires a ground repair has to find. It
printed 54 wires and said nothing about the 23. The block form below counts
`(wire` tokens first and asserts that it parsed every one.

usage: dump_sheet.py <sheet.kicad_sch> [x1 y1 x2 y2]
"""
import re
import sys


def wire_blocks(src):
    tokens = src.count("\n\t(wire")
    blocks = re.findall(r'\n\t\(wire\n(?:.*?)\n\t\)', src, re.S)
    if len(blocks) != tokens:
        raise SystemExit(f"parsed {len(blocks)} wire blocks but the file holds "
                         f"{tokens} '(wire' tokens - the parse is incomplete")
    out = []
    for b in blocks:
        pts = re.search(
            r'\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)', b)
        uid = re.search(r'\(uuid "([0-9a-f-]+)"\)', b)
        width = re.search(r'\(stroke \(width ([\d.]+)\)', b)
        colour = re.search(r'\(color ([\d ]+)\)', b)
        out.append((tuple(round(float(g), 3) for g in pts.groups()),
                    width.group(1) if width else "?",
                    colour.group(1) if colour else None,
                    uid.group(1)))
    return out


def main():
    src = open(sys.argv[1]).read()
    box = [float(v) for v in sys.argv[2:6]] if len(sys.argv) > 5 else None

    def inside(*pts):
        if box is None:
            return True
        x1, y1, x2, y2 = box
        return all(x1 <= x <= x2 and y1 <= y <= y2 for x, y in pts)

    wires = wire_blocks(src)
    print(f"=== wires ({len(wires)} parsed, all accounted for)")
    for (a, b, c, d), width, colour, uid in wires:
        if not inside((a, b), (c, d)):
            continue
        print(f"  ({a}, {b}) -> ({c}, {d})  len {abs(a - c) + abs(b - d):7.2f}  "
              f"width {width}  colour {colour or '-':14}  {uid}")

    print("=== junctions")
    for m in re.finditer(
            r'\(junction \(at ([-\d.]+) ([-\d.]+)\)\s*\(diameter [^)]*\)\s*'
            r'\(color [^)]*\)\s*\(uuid "([0-9a-f-]+)"\)', src):
        a, b = float(m.group(1)), float(m.group(2))
        if not inside((a, b)):
            continue
        print(f"  ({a}, {b})  {m.group(3)}")

    print("=== labels")
    for m in re.finditer(
            r'\((global_label|label|hierarchical_label) "([^"]+)"'
            r'(?: \(shape (\w+)\))? \(at ([-\d.]+) ([-\d.]+) (\d+)\)'
            r'(.*?)\(uuid "([0-9a-f-]+)"\)', src, re.S):
        a, b = float(m.group(4)), float(m.group(5))
        if not inside((a, b)):
            continue
        colour = re.search(r'\(color ([\d ]+)\)', m.group(7))
        thick = re.search(r'\(thickness ([\d.]+)\)', m.group(7))
        print(f"  {m.group(1):12} {m.group(2):16} at ({a}, {b}) rot {m.group(6)} "
              f"shape {m.group(3)}  colour {colour.group(1) if colour else '-':14} "
              f"thickness {thick.group(1) if thick else '-':5} {m.group(8)}")

    print("=== no_connect")
    for m in re.finditer(
            r'\(no_connect \(at ([-\d.]+) ([-\d.]+)\)\s*\(uuid "([0-9a-f-]+)"\)', src):
        a, b = float(m.group(1)), float(m.group(2))
        if not inside((a, b)):
            continue
        print(f"  ({a}, {b})  {m.group(3)}")


main()
