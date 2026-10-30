"""Absolute pin positions of every placed symbol, read from the sheet itself.

`TOOLING.md` trap: `akcli pins` MIXES UNITS - given `--at` in mm it returns
`y_mil` as the mm figure plus a +/-150 **mil** offset, so its spacing is right
and its absolute positions are wrong. The sheet's own `lib_symbols` block is
the authority, and this script reads it.

It also prints each lib symbol's pin table in SYMBOL coordinates, which is what
a placement is worked out from.

usage: pingeom.py <sheet.kicad_sch> [designator ...]
"""
import re
import sys


def lib_pins(src):
    """lib_id -> [(number, sx, sy)] in symbol coordinates."""
    out = {}
    for m in re.finditer(r'^\t\t\(symbol "([^"]+)"\n', src, re.M):
        lib_id = m.group(1)
        if ":" not in lib_id:
            continue
        start = m.end()
        nxt = re.search(r'^\t\t\(symbol "[^"]+"\n', src[start:], re.M)
        end = start + (nxt.start() if nxt else len(src) - start)
        body = src[start:end]
        pins = []
        for p in re.finditer(
                r'\(pin \w+ \w+\n\s*\(at ([-\d.]+) ([-\d.]+) (\d+)\)\s*'
                r'\(length ([-\d.]+)\).*?\(number "([^"]+)"', body, re.S):
            sx, sy, ang, ln = (float(g) for g in p.groups()[:4])
            pins.append((p.group(5), sx, sy, int(ang), ln))
        out[lib_id] = pins
    return out


def rotate(dx, dy, rot):
    return {0: (dx, dy), 90: (dy, -dx), 180: (-dx, -dy), 270: (-dy, dx)}[rot]


def main():
    src = open(sys.argv[1]).read()
    want = set(sys.argv[2:])
    table = lib_pins(src)
    print("=== lib_symbols pin tables, SYMBOL coordinates (x, y, angle, length)")
    for lib_id, pins in sorted(table.items()):
        print(f"  {lib_id}")
        for n, sx, sy, ang, ln in pins:
            print(f"      pin {n:>3}  at ({sx}, {sy}) angle {ang} length {ln}")
    print()
    print("=== placed symbols, SHEET coordinates")
    for m in re.finditer(
            r'^\t\(symbol\n\t\t\(lib_id "([^"]+)"\)\n\t\t\(at ([-\d.]+) ([-\d.]+) (\d+)\)'
            r'(?:.*?)^\t\)$', src, re.M | re.S):
        block = m.group(0)
        lib_id = m.group(1)
        x, y, rot = float(m.group(2)), float(m.group(3)), int(m.group(4))
        ref = re.search(r'\(property "Reference" "([^"]*)"', block)
        ref = ref.group(1) if ref else "?"
        if want and ref not in want:
            continue
        print(f"  {ref:8} {lib_id:32} at ({x}, {y}) rot {rot}")
        for n, sx, sy, ang, ln in table.get(lib_id, []):
            dx, dy = rotate(sx, -sy, rot)
            print(f"      pin {n:>3} -> ({round(x + dx, 3)}, {round(y + dy, 3)})")
        for f in re.finditer(
                r'\(property "(Reference|Value)" "([^"]*)" \(at ([-\d.]+) ([-\d.]+) (\d+)\)'
                r'\s*\n\s*\(effects \(font \(size ([\d.]+) [\d.]+\)\)( hide)?\)', block):
            ang = int(f.group(5))
            horiz = (rot + ang) % 180 == 0
            print(f"      {f.group(1):9} {f.group(2)!r:12} at "
                  f"({f.group(3)}, {f.group(4)}) angle {ang}"
                  f"  renders {'HORIZONTAL' if horiz else 'VERTICAL'}"
                  f"{'  [hidden]' if f.group(7) else ''}")


main()
