"""The three things akcli 0.22.0 cannot do, applied as literal text edits.

1. `add_wire` has no stroke parameter, so every wire it writes comes out
   `(width 0)` with no colour, against copperhead's `0.254` and its per-net
   colour. Colour is how a reader follows one net across a sheet, so a mixed
   cluster is a real defect and `scripts/colour_check.py` is the check for it.
2. `add_net_label` writes no `thickness` and no colour, where every label
   copperhead wrote has `(thickness 0.2)` and the tap nets carry purple.
3. There is NO operation for a symbol field's position. `move_component`
   carries the offsets copperhead chose for the arrangement the move just
   destroyed, and for a capacitor turned from 270 to 0 it also carries the
   field ANGLE, which renders the text vertical. Every field below is restated
   as a literal.

Every number here is a literal and every substitution must match exactly once,
so a half-applied edit fails loudly rather than silently.

usage: restyle_fields.py <sheet.kicad_sch>
"""
import re
import sys

PURPLE = "130 50 170 1"
GREY = "70 70 70 1"
BLUE = "30 90 200 1"

# (x1, y1, x2, y2, colour-or-None) -- every wire this pass added.
WIRE_STYLE = [
    (25.40, 99.06, 25.40, 137.16, None),
    (25.40, 137.16, 58.42, 137.16, None),
    (87.63, 106.68, 200.66, 106.68, None),
    (93.98, 114.30, 93.98, 121.92, PURPLE),
    (124.46, 114.30, 124.46, 119.38, PURPLE),
    (109.22, 119.38, 139.70, 119.38, PURPLE),
    (109.22, 124.46, 109.22, 119.38, PURPLE),
    (124.46, 124.46, 124.46, 119.38, PURPLE),
    (139.70, 127.00, 139.70, 119.38, PURPLE),
    (162.56, 114.30, 162.56, 121.92, PURPLE),
    (154.94, 121.92, 170.18, 121.92, PURPLE),
    (154.94, 129.54, 154.94, 121.92, PURPLE),
    (170.18, 129.54, 170.18, 121.92, PURPLE),
    (200.66, 114.30, 200.66, 124.46, PURPLE),
    (185.42, 124.46, 215.90, 124.46, PURPLE),
    (185.42, 132.08, 185.42, 124.46, PURPLE),
    (200.66, 132.08, 200.66, 124.46, PURPLE),
    (215.90, 134.62, 215.90, 124.46, PURPLE),
    (73.66, 129.54, 93.98, 129.54, None),
    (73.66, 132.08, 124.46, 132.08, None),
    (73.66, 134.62, 139.70, 134.62, None),
    (73.66, 137.16, 170.18, 137.16, None),
    (73.66, 139.70, 200.66, 139.70, None),
    (73.66, 142.24, 215.90, 142.24, None),
    (33.02, 66.04, 33.02, 76.20, GREY),
    (33.02, 71.12, 27.94, 71.12, GREY),
    (78.74, 44.45, 130.81, 44.45, BLUE),
    (130.81, 50.80, 130.81, 44.45, BLUE),
    (88.90, 57.15, 88.90, 66.04, None),
    (88.90, 66.04, 148.59, 66.04, None),
    (148.59, 66.04, 148.59, 63.50, None),
]

# (label text, colour-or-None) -- every label this pass added.
LABEL_STYLE = [
    ("sel1", None), ("sel2", None), ("sel3", None),
    ("sel4", None), ("sel5", None), ("sel6", None),
    ("tap_600mh", PURPLE), ("tap_300mh", PURPLE),
    ("tap_200mh", PURPLE), ("tap_100mh", PURPLE),
]

# (ref, value, ref_x, ref_y, val_x, val_y) -- angle 0 for every one of them.
#
# Capacitors and inductors both take their text 6.35 mm to the right of the
# symbol, centred, one line above and one below the body's midline. That is
# one offset for thirteen parts instead of copperhead's thirteen, and it is
# chosen so the widest value ("4700pF", about 7.6 mm) clears the body on its
# left by 1.4 mm and the next capacitor's plate 15.24 mm to its right by
# 3.5 mm. At the 12.7 mm pitch tried first that second gap measured 0.9 mm,
# which put each value nearer its neighbour's body than its own.
FIELDS = [
    ("C1", "4700pF", 100.33, 124.46, 100.33, 127.00),
    ("C2", "4700pF", 115.57, 127.00, 115.57, 129.54),
    ("C5", "470pF", 130.81, 127.00, 130.81, 129.54),
    ("C3", "3300pF", 146.05, 129.54, 146.05, 132.08),
    ("C4", "1000pF", 161.29, 132.08, 161.29, 134.62),
    ("C8", "1000pF", 176.53, 132.08, 176.53, 134.62),
    ("C6", "1000pF", 191.77, 134.62, 191.77, 137.16),
    ("C9", "1500pF", 207.01, 134.62, 207.01, 137.16),
    ("C7", "1000pF", 222.25, 137.16, 222.25, 139.70),
    ("L4", "600mH", 100.33, 109.22, 100.33, 111.76),
    ("L3", "300mH", 130.81, 109.22, 130.81, 111.76),
    ("L2", "200mH", 168.91, 109.22, 168.91, 111.76),
    ("L1", "100mH", 207.01, 109.22, 207.01, 111.76),
]

# The two group rectangles this pass changes, and why.
RECTS = [
    ("(start 16.51 88.9) (end 280.67 153.67)",
     "(start 16.51 88.9) (end 231.14 153.67)",
     "Hi boost: 49 mm of empty rectangle east of the bank, removed"),
    ("(start 74.93 31.75) (end 166.37 67.31)",
     "(start 74.93 31.75) (end 166.37 69.85)",
     "Hi cut: the collapsed lo_boost_in rail runs at y=66.04"),
]


def num(v):
    """KiCad writes 139.7 rather than 139.70; match what is in the file."""
    s = f"{v:.4f}".rstrip("0").rstrip(".")
    return s


def main():
    path = sys.argv[1]
    src = open(path).read()
    n = 0

    for x1, y1, x2, y2, col in WIRE_STYLE:
        old = (f"(wire (pts (xy {num(x1)} {num(y1)}) (xy {num(x2)} {num(y2)}))"
               f" (stroke (width 0) (type default))")
        c = f" (color {col})" if col else ""
        new = (f"(wire (pts (xy {num(x1)} {num(y1)}) (xy {num(x2)} {num(y2)}))"
               f" (stroke (width 0.254) (type default){c})")
        if src.count(old) != 1:
            sys.exit(f"wire ({x1},{y1})-({x2},{y2}): {src.count(old)} matches")
        src = src.replace(old, new, 1)
        n += 1

    for name, col in LABEL_STYLE:
        old = (f'(label "{name}" (at ')
        m = re.search(re.escape(old) + r'([-\d. ]+)\)'
                      r' \(effects \(font \(size 1\.27 1\.27\)\)'
                      r' \(justify left bottom\)\)', src)
        if not m:
            sys.exit(f"label {name}: akcli form not found")
        colpart = f" (color {col})" if col else ""
        new = (f'(label "{name}" (at {m.group(1)})'
               f' (effects (font (size 1.27 1.27) (thickness 0.2){colpart})'
               f' (justify left bottom))')
        src = src[:m.start()] + new + src[m.end():]
        n += 1

    for ref, val, rx, ry, vx, vy in FIELDS:
        anchor = f'(property "Reference" "{ref}" (at '
        if src.count(anchor) != 1:
            sys.exit(f"{ref}: Reference anchor matched {src.count(anchor)} times")
        start = src.index(anchor)
        # The Reference, then the first Value after it: both inside this one
        # symbol block, so no other part's identical value can be hit.
        for prop, text, px, py in (("Reference", ref, rx, ry),
                                   ("Value", val, vx, vy)):
            head = f'(property "{prop}" "{text}" (at '
            i = src.index(head, start)
            j = src.index(")", i + len(head))
            src = src[:i + len(head)] + f"{num(px)} {num(py)} 0" + src[j:]
            n += 1

    for old, new, why in RECTS:
        if src.count(old) != 1:
            sys.exit(f"rectangle {why}: {src.count(old)} matches")
        src = src.replace(old, new, 1)
        print(f"  rectangle: {why}")
        n += 1

    open(path, "w").write(src)
    print(f"{n} literal edits applied to {path}")


main()
