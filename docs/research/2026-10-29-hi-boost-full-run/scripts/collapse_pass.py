"""Collapse the two duplicate on-page label pairs in Hi cut into wires.

Every coordinate below is a literal, chosen by hand after reading the geometry
dump and the rendered page. Nothing here loops over components computing
positions.

What it does, in one pass:

  hcut_t2  - SI4.1 / SI5.2 / SI6.1.  The pair at (133.35, 54.61) and
             (185.42, 63.5) becomes one horizontal rail at y = 57.15 from SI4's
             top pin to the SI5/SI6 column.  ONE hcut_t2 label survives, at
             (133.35, 54.61) where it already was: the net is internal to Hi cut
             and nothing else names it, so deleting both would rename the net
             and the netlist comparison would fail.

  lo_boost_in - SI3.1 / SI6.2 (+ J1.3, SI7.2, SI8.2 off-group).  The pair at
             (146.05, 69.85) and (203.2, 76.2) becomes one horizontal rail at
             y = 69.85 from SI3's right pin to SI6's bottom pin.  One label
             survives on a stub at (196.85, 73.66) because the net leaves the
             group.

  SI5 moved.  SI5 sat at (185.42, 69.85) directly in the lo_boost_in corridor,
             which is what made the straight run impossible.  SI5 and SI6 are
             the two halves of RV_HI_CUT and are in SERIES through hcut_t2, so
             they are redrawn as a series column at x = 203.2 with the hcut_t2
             rail tapping between them.  SI6 moves up 3.81 mm so its lo_boost_in
             pin lands on SI3's row.

Stroke colours are the sheet's own, by net: hcut_t2 = 30 90 200, hi_boost_out =
130 50 170, lo_boost_in = none (the sheet leaves it default).

usage: collapse_pass.py <sheet.kicad_sch>
"""
import sys

BLUE = "(color 30 90 200 1)"
PURPLE = "(color 130 50 170 1)"

# --- wires removed: (endpoints, stroke tail, uuid).  The whole five-line block
#     is rebuilt from these literals and matched exactly, so a half-deleted
#     block cannot happen.
DELETE_WIRES = [
    ("185.42 66.04", "185.42 63.5", " (color 30 90 200 1)",
     "05438896-c172-5480-9811-5c095b61053e"),
    ("185.42 63.5", "203.2 63.5", " (color 30 90 200 1)",
     "00943ef2-4297-5926-80c2-5ddccdff4e6e"),
    ("203.2 66.04", "203.2 63.5", " (color 30 90 200 1)",
     "e644d03b-047f-5cba-b21d-88026cbe2789"),
    ("185.42 73.66", "185.42 76.2", " (color 130 50 170 1)",
     "fa459919-d353-5fbc-b814-101f2d10a708"),
    ("143.51 69.85", "146.05 69.85", "",
     "a1f1b798-232b-592d-8dab-ccfcaf7c0ab1"),
    ("203.2 73.66", "203.2 76.2", "",
     "4d8ebee5-cdbc-5022-a1b1-dd4a3cca7b1d"),
]

# --- wires added: (x1, y1, x2, y2, colour-s-expr-or-empty, uuid, what it is)
ADD_WIRES = [
    ("133.35", "57.15", "203.2", "57.15", BLUE,
     "c0115e00-0000-4000-8000-000000000001", "hcut_t2 rail, 69.85 mm"),
    ("203.2", "57.15", "203.2", "62.23", BLUE,
     "c0115e00-0000-4000-8000-000000000002", "hcut_t2 column tap to SI6.1"),
    ("143.51", "69.85", "203.2", "69.85", "",
     "c0115e00-0000-4000-8000-000000000003", "lo_boost_in rail, 59.69 mm"),
    ("196.85", "69.85", "196.85", "73.66", "",
     "c0115e00-0000-4000-8000-000000000004", "lo_boost_in off-group stub"),
    ("203.2", "49.53", "203.2", "46.99", PURPLE,
     "c0115e00-0000-4000-8000-000000000005", "hi_boost_out stub off SI5.1"),
]

# --- junction dots added where three wires now meet
ADD_JUNCTIONS = [
    ("133.35", "57.15", "c0115e00-0000-4000-8000-00000000000a"),
    ("203.2", "57.15", "c0115e00-0000-4000-8000-00000000000b"),
    ("196.85", "69.85", "c0115e00-0000-4000-8000-00000000000c"),
]

# --- exact-text substitutions: (old, new, what)
EDITS = [
    # SI5: (185.42, 69.85) rot 180  ->  (203.2, 53.34) rot 0
    ('(at 185.42 69.85 180)', '(at 203.2 53.34 0)', "SI5 placement"),
    ('(property "Reference" "SI5" (at 189.23 68.58 0)',
     '(property "Reference" "SI5" (at 207.01 52.07 0)', "SI5 Reference"),
    ('(property "Value" "0R" (at 189.23 71.12 0)',
     '(property "Value" "0R" (at 207.01 54.61 0)', "SI5 Value"),
    ('(property "Footprint" "" (at 185.42 69.85 0)',
     '(property "Footprint" "" (at 203.2 53.34 0)', "SI5 Footprint"),
    ('(property "Datasheet" "~" (at 185.42 69.85 0)',
     '(property "Datasheet" "~" (at 203.2 53.34 0)', "SI5 Datasheet"),

    # SI6: (203.2, 69.85) rot 0  ->  (203.2, 66.04) rot 0
    ('(at 203.2 69.85 0)\n\t\t(unit 1)', '(at 203.2 66.04 0)\n\t\t(unit 1)',
     "SI6 placement"),
    ('(property "Reference" "SI6" (at 207.518 68.58 0)',
     '(property "Reference" "SI6" (at 207.518 64.77 0)', "SI6 Reference"),
    ('(property "Value" "4.7K" (at 207.518 71.12 0)',
     '(property "Value" "4.7K" (at 207.518 67.31 0)', "SI6 Value"),
    ('(property "Footprint" "" (at 203.2 69.85 0)',
     '(property "Footprint" "" (at 203.2 66.04 0)', "SI6 Footprint"),
    ('(property "Datasheet" "~" (at 203.2 69.85 0)',
     '(property "Datasheet" "~" (at 203.2 66.04 0)', "SI6 Datasheet"),

    # hi_boost_out: (185.42, 76.2) -> (203.2, 46.99), above SI5
    ('(global_label "hi_boost_out" (shape passive) (at 185.42 76.2 0)',
     '(global_label "hi_boost_out" (shape passive) (at 203.2 46.99 0)',
     "hi_boost_out label"),
    ('(property "Intersheetrefs" "${INTERSHEET_REFS}" (at 185.42 76.2 0)',
     '(property "Intersheetrefs" "${INTERSHEET_REFS}" (at 203.2 46.99 0)',
     "hi_boost_out intersheetrefs"),

    # lo_boost_in: (203.2, 76.2) -> (196.85, 73.66), on a stub off the rail
    ('(global_label "lo_boost_in" (shape passive) (at 203.2 76.2 0)',
     '(global_label "lo_boost_in" (shape passive) (at 196.85 73.66 0)',
     "lo_boost_in label"),
    ('(property "Intersheetrefs" "${INTERSHEET_REFS}" (at 203.2 76.2 0)',
     '(property "Intersheetrefs" "${INTERSHEET_REFS}" (at 196.85 73.66 0)',
     "lo_boost_in intersheetrefs"),
]

# --- whole label blocks removed (the duplicates)
DELETE_LABELS = [
    ('\t(global_label "hcut_t2" (shape passive) (at 185.42 63.5 180)'
     ' (fields_autoplaced yes)\n'
     '\t\t(effects (font (size 1.27 1.27) (thickness 0.2)'
     ' (color 30 90 200 1)) (justify right))\n'
     '\t\t(uuid "3ee83841-fed0-5ab6-b0c3-f9a826f762f2")\n'
     '\t\t(property "Intersheetrefs" "${INTERSHEET_REFS}" (at 185.42 63.5 0)\n'
     '\t\t\t(effects (font (size 1.27 1.27)) hide)\n'
     '\t\t)\n'
     '\t)\n', "duplicate hcut_t2 at (185.42, 63.5)"),
    ('\t(global_label "lo_boost_in" (shape passive) (at 146.05 69.85 0)'
     ' (fields_autoplaced yes)\n'
     '\t\t(effects (font (size 1.27 1.27) (thickness 0.2)) (justify left))\n'
     '\t\t(uuid "48f34d72-c226-599c-b645-24c9267b9ee4")\n'
     '\t\t(property "Intersheetrefs" "${INTERSHEET_REFS}" (at 146.05 69.85 0)\n'
     '\t\t\t(effects (font (size 1.27 1.27)) hide)\n'
     '\t\t)\n'
     '\t)\n', "duplicate lo_boost_in at (146.05, 69.85)"),
]


def main():
    path = sys.argv[1]
    src = open(path).read()

    for a, b, col, uuid in DELETE_WIRES:
        block = (f"\t(wire\n"
                 f"\t\t(pts (xy {a}) (xy {b}))\n"
                 f"\t\t(stroke (width 0.254) (type default){col})\n"
                 f'\t\t(uuid "{uuid}")\n'
                 f"\t)\n")
        if src.count(block) != 1:
            sys.exit(f"wire block {a} -> {b}: expected 1 match, "
                     f"found {src.count(block)}")
        src = src.replace(block, "", 1)
        print(f"  deleted wire {a} -> {b}")

    for old, what in DELETE_LABELS:
        if old not in src:
            sys.exit(f"label block not found: {what}")
        src = src.replace(old, "", 1)
        print(f"  deleted label {what}")

    for old, new, what in EDITS:
        if src.count(old) != 1:
            sys.exit(f"edit {what!r}: expected exactly 1 match, "
                     f"found {src.count(old)}")
        src = src.replace(old, new, 1)
        print(f"  edited {what}")

    added = []
    for x1, y1, x2, y2, col, uuid, what in ADD_WIRES:
        c = f" {col}" if col else ""
        added.append(
            f"\t(wire (pts (xy {x1} {y1}) (xy {x2} {y2}))"
            f" (stroke (width 0.254) (type default){c})"
            f' (uuid "{uuid}"))\n')
        print(f"  added wire {what}")
    for x, y, uuid in ADD_JUNCTIONS:
        added.append(
            f"\t(junction (at {x} {y}) (diameter 0) (color 0 0 0 0)"
            f' (uuid "{uuid}"))\n')
        print(f"  added junction ({x}, {y})")

    tail = "\n)\n"
    if not src.endswith(tail):
        sys.exit("sheet does not end with the expected closing paren")
    src = src[: -len(tail)] + "\n" + "".join(added) + ")\n"

    open(path, "w").write(src)
    print("written:", path)


main()
