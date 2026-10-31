"""The three things akcli 0.22.0 cannot do for this repair, as literal edits.

A POST-pass: it runs after the ops. (`move_labels.py` is the PRE-pass, and it
runs before them for a reason stated in its own docstring.)

1. `add_wire` has no stroke parameter, so all four wires it wrote came out
   `(width 0)` with no colour, against copperhead's `0.254` and its per-net
   colour. Colour is how a reader follows one net across a sheet. Three of the
   four are signal wires and take copperhead's uncoloured default, which KiCad
   draws green; the fourth is on `GND` and takes the grey `70 70 70 1` that the
   deleted ground stub carried and that SI8's ground stub in the Mid group
   still carries.

   `add_junction` needed no restyling: it wrote `(diameter 0) (color 0 0 0 0)`,
   which is byte-for-byte what the sixteen junctions already on the sheet carry.
   Checked rather than assumed.

2. There is NO operation for a symbol field's position, and `move_component`
   carries the offsets copperhead chose for the arrangement the move just
   destroyed. Three parts moved and two of them needed their fields restated:

   - `SI6` turned from 0 (vertical) to 270 (horizontal) and kept the offsets of
     a vertical resistor - dx +3.81, dy -1.27 / +1.27 - which put `SI6` and
     `56K` on top of its own right-hand pin and across the wire running out to
     the `out` label. They are restated above and below the body, dy -3.556 and
     +3.556, which is `R1`'s arrangement: R1 is the one other horizontal
     `Device:R` on this page, and the field ANGLE that goes with it there is
     90, not 0.
   - `#PWR07`'s visible `GND` text came through at dy -3.556, i.e. **above the
     ground symbol, on SI7's lower lead and inside the new ground wire's
     column**. It is restated at dy +3.556 - below the triangle - which is
     `#PWR08`'s offset, the one ground on the accepted page that already points
     down into open space.

   `SI7` moved and turned 0 -> 180 and came through with dx +3.81, dy -1.27 /
   +1.27 and angle 0 intact, which is the offset every vertical resistor on the
   page uses. Those two are ASSERTED here rather than edited, so a future akcli
   that carries them differently fails loudly instead of quietly drawing text
   somewhere else.

3. `#PWR07`'s hidden Reference sat 19.05 mm west of its own symbol and the move
   carried that offset too, which now lands it just inside the group's left
   edge. It draws nothing because the field is hidden, so this is housekeeping
   and not a visible change; it is restated at the symbol's own origin, which
   is `#PWR08`'s arrangement.

THE GROUP RECTANGLE IS NOT TOUCHED, and that is a measured outcome rather than
a constraint: the signal line at y 43.18 was chosen so that the ground triangle
lands 5.08 mm above the existing bottom edge at 63.5 and the `GND` text 3.43 mm
above it - which are the `Mid` group's two margins to 0.01 mm. `Mid` is the same
shape already on this sheet: a stand-in resistor with a ground below it drawing
downward.

Every substitution must match exactly once, so a half-applied edit fails loudly
rather than silently.

usage: restyle.py <sheet.kicad_sch>
"""
import sys

GREY = "70 70 70 1"

# (old, new, why) -- every one must match exactly once.
EDITS = [
    ("(wire (pts (xy 189.23 43.18) (xy 196.85 43.18)) "
     "(stroke (width 0) (type default))",
     "(wire (pts (xy 189.23 43.18) (xy 196.85 43.18)) "
     "(stroke (width 0.254) (type default))",
     "input run stroke: 0 -> 0.254, uncoloured like the rest of lo_boost_in"),

    ("(wire (pts (xy 191.77 43.18) (xy 191.77 45.72)) "
     "(stroke (width 0) (type default))",
     "(wire (pts (xy 191.77 43.18) (xy 191.77 45.72)) "
     "(stroke (width 0.254) (type default))",
     "shunt leg stroke: 0 -> 0.254, uncoloured like the rest of lo_boost_in"),

    ("(wire (pts (xy 191.77 53.34) (xy 191.77 55.88)) "
     "(stroke (width 0) (type default))",
     "(wire (pts (xy 191.77 53.34) (xy 191.77 55.88)) "
     f"(stroke (width 0.254) (type default) (color {GREY}))",
     "ground stub stroke: 0 -> 0.254 grey, the GND net colour on this sheet"),

    ("(wire (pts (xy 204.47 43.18) (xy 207.01 43.18)) "
     "(stroke (width 0) (type default))",
     "(wire (pts (xy 204.47 43.18) (xy 207.01 43.18)) "
     "(stroke (width 0.254) (type default))",
     "output run stroke: 0 -> 0.254, uncoloured like the rest of out"),

    ('(property "Reference" "SI6" (at 204.47 41.91 0)',
     '(property "Reference" "SI6" (at 200.66 39.624 90)',
     "SI6 Reference: off a vertical resistor's offset and onto R1's - centred "
     "above the horizontal body, angle 90"),

    ('(property "Value" "56K" (at 204.47 44.45 0)',
     '(property "Value" "56K" (at 200.66 46.736 90)',
     "SI6 Value: centred below the horizontal body, angle 90, R1's offset"),

    ('(property "Value" "GND" (at 191.77 52.324 0)',
     '(property "Value" "GND" (at 191.77 59.436 0)',
     "#PWR07 GND text: dy -3.556 (on SI7's lead) -> dy +3.556 (below the "
     "triangle), which is #PWR08's offset"),

    ('(property "Reference" "#PWR07" (at 172.72 55.88 0)',
     '(property "Reference" "#PWR07" (at 191.77 55.88 0)',
     "#PWR07 hidden Reference: 19.05 mm west of its symbol -> its own origin, "
     "which is #PWR08's arrangement. Hidden either way; draws nothing."),
]

# (substring, count) -- asserted, not edited. A change here is a change in how
# akcli carries a moved part's fields or styles a new object, and it must not
# pass unnoticed.
ASSERTS = [
    # SI7's fields came through correct; the page's offset for every vertical
    # resistor is dx +3.81, dy -1.27 / +1.27, angle 0.
    ('(property "Reference" "SI7" (at 195.58 48.26 0)', 1),
    ('(property "Value" "0R" (at 195.58 50.8 0)', 1),
    # The three placements the ops were supposed to produce.
    ("(at 200.66 43.18 270)", 1),    # SI6, horizontal, pin 2 left / pin 1 right
    ("(at 191.77 49.53 180)", 1),    # SI7, vertical, pin 1 at the bottom
    ("(at 191.77 55.88 0)", 3),      # #PWR07 symbol, Footprint, Datasheet
    # The junction akcli wrote carries the same style as the sixteen already
    # on the sheet, so it needs no edit. Asserted so that stops being an
    # assumption.
    ("(junction (at 191.77 43.18) (diameter 0) (color 0 0 0 0)", 1),
    # The group rectangle is unchanged.
    ("(rectangle (start 171.45 31.75) (end 215.9 63.5)", 1),
]


def main():
    path = sys.argv[1]
    src = open(path).read()

    for text, want in ASSERTS:
        got = src.count(text)
        if got != want:
            sys.exit(f"ASSERT FAILED: {text!r} appears {got} times, expected {want}")
        print(f"  assert ok ({want}x)  {text}")

    for old, new, why in EDITS:
        got = src.count(old)
        if got != 1:
            sys.exit(f"EDIT FAILED: {old!r} appears {got} times, expected 1")
        src = src.replace(old, new, 1)
        print(f"  edit      {why}")

    open(path, "w").write(src)
    print(f"{len(EDITS)} literal edits applied to {path}")


main()
