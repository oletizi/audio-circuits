"""Normalise the seven capacitors' Reference and Value field positions.

WHY THIS EXISTS. copperhead does not use one field offset per part kind: its
placement search nudges each symbol's fields to clear the wires of the layout
IT produced. On this sheet C1 and C2 carry Reference at y-5.842 and Value at
y-3.302 (both above the body), C3 carries -9.652 / -7.112, C7 carries +3.302 /
+5.842 (both BELOW) and C4 carries -4.572 / +4.572 (straddling). Re-placing the
capacitors carries those bespoke offsets along, and every one of them was
tuned to an arrangement that no longer exists - C4's Value landed on the
c6_sel run, C3's and C7's text landed on each other.

akcli 0.22.0 has no operation for a symbol field's position, so this is a
direct text edit, as the low-boost pass did for label shape and wire stroke.

Every target below is a literal pair of coordinates. Nothing is computed from a
component list.

usage: capfields.py <sheet.kicad_sch>
"""
import sys

# (old "x y angle", new "x y angle") for each field, in the order they appear
EDITS = [
    # C1 - already at the convention, left alone
    # C2 - already at the convention, left alone
    # C3: -9.652/-7.112 -> -5.842/-3.302, and +1.27 in x to clear C7's strap
    ('(property "Reference" "C3" (at 121.92 117.348 90)',
     '(property "Reference" "C3" (at 123.19 121.158 90)'),
    ('(property "Value" "4700pF" (at 121.92 119.888 90)',
     '(property "Value" "4700pF" (at 123.19 123.698 90)'),
    # C4: Value was BELOW the body and landed on the c6_sel run
    ('(property "Reference" "C4" (at 134.62 124.968 90)',
     '(property "Reference" "C4" (at 134.62 123.698 90)'),
    ('(property "Value" "3300pF" (at 134.62 134.112 90)',
     '(property "Value" "3300pF" (at 134.62 126.238 90)'),
    # C5
    ('(property "Reference" "C5" (at 147.32 126.238 90)',
     '(property "Reference" "C5" (at 147.32 126.238 90)'),
    # C7: both fields were BELOW the body, over C3
    ('(property "Reference" "C7" (at 121.92 122.682 90)',
     '(property "Reference" "C7" (at 123.19 113.538 90)'),
    ('(property "Value" "1000pF" (at 121.92 125.222 90)',
     '(property "Value" "1000pF" (at 123.19 116.078 90)'),
]


def main():
    path = sys.argv[1]
    src = open(path).read()
    n = 0
    for old, new in EDITS:
        if old not in src:
            sys.exit(f"not found:\n  {old}")
        if old != new:
            src = src.replace(old, new)
            n += 1
    open(path, "w").write(src)
    print(f"moved {n} capacitor field(s) in {path}")


main()
