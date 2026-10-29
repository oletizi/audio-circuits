"""The four things akcli 0.22.0 cannot do, applied as literal text edits.

1. `add_wire` has no stroke parameter, so every wire it writes comes out
   `(width 0)` with no colour, against copperhead's `0.254` and its per-net
   colour. Colour is how a reader follows one net across a sheet, so a mixed
   cluster is a real defect and `scripts/colour_check.py` is the check for it.
2. `add_net_label` writes no `thickness`, where every label copperhead wrote
   has `(thickness 0.2)`.
   **AND, NEW ON THIS BOARD: a global label it adds comes out `(shape input)`,
   not `(shape passive)`.** copperhead writes every one of its nine global
   labels as `passive`, which KiCad draws as a plain rectangular tag; `input`
   draws an arrow-pointed one. Two new global labels in `input` shape beside
   nine `passive` ones is a visible inconsistency that no check here reports and
   that nothing in `TOOLING.md` mentions. akcli also omits
   `(fields_autoplaced yes)` and the hidden `Intersheetrefs` property that every
   copperhead global label carries, so each is rewritten whole, in copperhead's
   own form.
3. There is NO operation for a symbol field's position. `move_component`
   carries the offsets copperhead chose for the arrangement the move just
   destroyed, and for a capacitor turned from 270 to 0 it also carries the
   field ANGLE. Measured on this board: all ten capacitors came out of the move
   with `angle 90` on both fields, which at rotation 0 renders VERTICAL - the
   rule is that a field renders horizontally when
   `(symbol rotation + field angle) mod 180 == 0`.
   RV1's carried offset put its Reference and Value at x = 56.642, which is
   0.5 mm from the `cut_wiper` column at x = 57.15.
4. There is no operation for a group RECTANGLE, so the two that have to change
   size are literal edits.

Every number here is a literal and every substitution must match exactly once,
so a half-applied edit fails loudly rather than silently.

usage: restyle.py <sheet.kicad_sch>
"""
import re
import sys

GREY = "70 70 70 1"
BLUE = "30 90 200 1"

# --- 1. wire strokes --------------------------------------------------------
# (x1, y1, x2, y2, colour-or-None) -- every wire this pass added, in the order
# scripts/make_repairs.py adds them.
WIRE_STYLE = [
    (60.96, 96.52, 254.0, 96.52, None),          # the lo_boost_in rail
    (60.96, 99.06, 60.96, 96.52, None),          # RV1.3 up to the rail
    (57.15, 102.87, 57.15, 116.84, None),        # cut_wiper column
    (57.15, 116.84, 68.58, 116.84, None),        # cut_wiper to R1.1
    (76.20, 116.84, 90.17, 116.84, None),        # sel_common
    (105.41, 109.22, 129.54, 109.22, None),      # sel1 run
    (105.41, 111.76, 160.02, 111.76, None),      # sel2 run
    (105.41, 114.30, 175.26, 114.30, None),      # sel3 run
    (105.41, 116.84, 205.74, 116.84, None),      # sel4 run
    (105.41, 119.38, 236.22, 119.38, None),      # sel5 run
    (105.41, 121.92, 251.46, 121.92, None),      # sel6 run
    (114.30, 101.60, 114.30, 96.52, None),       # C1 riser
    (129.54, 101.60, 129.54, 96.52, None),       # C7 riser
    (144.78, 104.14, 144.78, 96.52, None),       # C2 riser
    (160.02, 104.14, 160.02, 96.52, None),       # C8 riser
    (175.26, 106.68, 175.26, 96.52, None),       # C3 riser
    (190.50, 109.22, 190.50, 96.52, None),       # C4 riser
    (205.74, 109.22, 205.74, 96.52, None),       # C9 riser
    (220.98, 111.76, 220.98, 96.52, None),       # C5 riser
    (236.22, 111.76, 236.22, 96.52, None),       # C10 riser
    (251.46, 114.30, 251.46, 96.52, None),       # C6 riser
    (67.31, 66.04, 67.31, 76.20, GREY),          # J2 ground trunk
    (67.31, 71.12, 62.23, 71.12, GREY),          # #FLG01 stub
    (162.56, 52.07, 180.34, 52.07, None),        # Lo boost lo_boost_in link
    (180.34, 59.69, 180.34, 62.23, GREY),        # SI5 down to #PWR07
]

# --- 2. labels --------------------------------------------------------------
LOCAL_LABELS = ["cut_wiper", "sel_common",
                "sel1", "sel2", "sel3", "sel4", "sel5", "sel6"]

# (name, x, y, rotation, justify, colour-or-None) -- rewritten whole into
# copperhead's own global-label form.
GLOBAL_LABELS = [
    ("hi_boost_out", 60.96, 106.68, 0, "left", BLUE),
    ("lo_boost_in", 254.0, 96.52, 0, "left", None),
]

# --- 3. symbol fields -------------------------------------------------------
# (ref, value, ref_x, ref_y, val_x, val_y, angle)
#
# The ten capacitors take their text 6.35 mm to the RIGHT of the symbol,
# centred, one line above and one below the body's midline - one offset for ten
# parts instead of copperhead's ten. The 6.35 mm is paired with the 15.24 mm
# pitch and both are MEASURED for this part set (scripts/textwidth.py): the
# widest value on this board draws 6.223 mm wide, which leaves 1.11 mm to its
# own plate and 3.59 mm to the next capacitor's.
FIELDS = [
    ("C1", ".047uF", 120.65, 104.14, 120.65, 106.68, 0),
    ("C7", ".033uF", 135.89, 104.14, 135.89, 106.68, 0),
    ("C2", ".047uF", 151.13, 106.68, 151.13, 109.22, 0),
    ("C8", ".01uF", 166.37, 106.68, 166.37, 109.22, 0),
    ("C3", ".047uF", 181.61, 109.22, 181.61, 111.76, 0),
    ("C4", ".022uF", 196.85, 111.76, 196.85, 114.30, 0),
    ("C9", ".01uF", 212.09, 111.76, 212.09, 114.30, 0),
    ("C5", ".022uF", 227.33, 114.30, 227.33, 116.84, 0),
    ("C10", "2200pF", 242.57, 114.30, 242.57, 116.84, 0),
    ("C6", ".015uF", 257.81, 116.84, 257.81, 119.38, 0),
    # The pot, whose carried offset of -4.318 mm put both fields 0.5 mm from
    # the cut_wiper column. Moved to the clear side.
    ("RV1", "4.7K", 66.04, 100.33, 66.04, 102.87, 0),
    # R1 stays at rotation 90, where angle 90 renders horizontal.
    ("R1", "430R", 72.39, 113.03, 72.39, 120.65, 90),
    # SW1 and SI5 did not change rotation, so their carried offsets are still
    # the offsets copperhead chose; restated as literals anyway so the whole
    # arrangement is in one file.
    ("SW1", "6-way selector", 97.79, 124.46, 97.79, 127.00, 0),
    ("SI5", "0R", 184.15, 54.61, 184.15, 57.15, 0),
    # #PWR07 followed SI5 down; its carried GND text landed below the group
    # rectangle, so it goes to the left of the symbol as #PWR01 and #PWR06 have.
    ("#PWR07", "GND", 184.15, 62.23, 175.26, 62.23, 0),
]

# --- 4. group rectangles ----------------------------------------------------
RECTS = [
    ("(start 50.8 88.9) (end 246.38 153.67)",
     "(start 50.8 88.9) (end 271.78 132.08)",
     "Hi cut: the bank is wider and 20 mm shallower than copperhead's wrap, so "
     "the rectangle follows the content east and up"),
    ("(start 158.75 31.75) (end 198.12 62.23)",
     "(start 158.75 31.75) (end 198.12 67.31)",
     "Lo boost: SI5 dropped 7.62 mm to meet SI4's lo_boost_in pin, so its "
     "ground symbol needs 5.08 mm more box"),
]


def num(v):
    """KiCad writes 139.7 rather than 139.70, and 254 rather than 254.0."""
    return f"{v:.4f}".rstrip("0").rstrip(".")


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

    for name in LOCAL_LABELS:
        head = f'(label "{name}" (at '
        m = re.search(re.escape(head) + r'([-\d. ]+)\)'
                      r' \(effects \(font \(size 1\.27 1\.27\)\)'
                      r' \(justify left bottom\)\)', src)
        if not m:
            sys.exit(f"label {name}: akcli form not found")
        new = (f'(label "{name}" (at {m.group(1)})'
               f' (effects (font (size 1.27 1.27) (thickness 0.2))'
               f' (justify left bottom))')
        src = src[:m.start()] + new + src[m.end():]
        n += 1

    for name, x, y, rot, just, col in GLOBAL_LABELS:
        old_re = (re.escape(f'(global_label "{name}" (shape input) '
                            f'(at {num(x)} {num(y)} {rot}) ')
                  + r'\(effects \(font \(size 1\.27 1\.27\)\) '
                    r'\(justify \w+\)\) \(uuid "([0-9a-f-]+)"\)\)')
        m = re.search(old_re, src)
        if not m:
            sys.exit(f"global label {name} at ({x},{y}): akcli form not found")
        c = f" (color {col})" if col else ""
        new = (f'(global_label "{name}" (shape passive) '
               f'(at {num(x)} {num(y)} {rot}) (fields_autoplaced yes)\n'
               f'\t\t(effects (font (size 1.27 1.27) (thickness 0.2){c})'
               f' (justify {just}))\n'
               f'\t\t(uuid "{m.group(1)}")\n'
               f'\t\t(property "Intersheetrefs" "${{INTERSHEET_REFS}}" '
               f'(at {num(x)} {num(y)} {rot})\n'
               f'\t\t\t(effects (font (size 1.27 1.27)) hide)\n'
               f'\t\t)\n'
               f'\t)')
        src = src[:m.start()] + new + src[m.end():]
        n += 1

    for ref, val, rx, ry, vx, vy, ang in FIELDS:
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
            src = src[:i + len(head)] + f"{num(px)} {num(py)} {ang}" + src[j:]
            n += 1

    for old, new, why in RECTS:
        if src.count(old) != 1:
            sys.exit(f"rectangle: {src.count(old)} matches for {why}")
        src = src.replace(old, new, 1)
        print(f"  rectangle: {why}")
        n += 1

    open(path, "w").write(src)
    print(f"{n} literal edits applied to {path}")


main()
