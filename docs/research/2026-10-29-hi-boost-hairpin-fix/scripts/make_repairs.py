"""The Lo boost stand-in group, redrawn, written in mm and emitted as akcli ops.

WHAT THE REVIEWER POINTED AT, and it was two things in two messages. First a
crop of the group with *"There's a goofy hairpin:"* - `#PWR07` sits above `SI7`
and `copperhead_power:GND` draws its triangle 2.54 mm down the sheet, back over
the whole wire that reaches it, apex landing on SI7's top pin. Then, on the same
group:

    "signal usually flows left to right and top to bottom (like english text).
     This had the input below the output, which is goofy. Also, output is
     usually pointing right, horizontally. You have output pointing up which is
     exactly backwards of convention."

So the fold is not the fault; it is a consequence. `lo_boost_in` - the INPUT -
entered at the BOTTOM of the group and `out` left at the TOP pointing UP, with
both parts hanging upward off a rail along the bottom edge, which leaves a
ground nowhere to go but back down over its own wire. Straightening the ground
alone would have left the flow inverted.

`EVALUATING-DRAWINGS.md` "Style, and why it is not a rule" carries his words and
his hedge. The convention is followed here. It is not a rule, nothing gates on
it, and no check in this directory scores a page against it.

THE TOPOLOGY, read from the exported netlist and not from anyone's description:
`lo_boost_in` is the common node; `SI6` (56K) is a series element from it to
`out`; `SI7` (0R) shunts it to `GND`. Pin-wise, SI6.2 and SI7.2 are on
`lo_boost_in`, SI6.1 on `out`, SI7.1 on `GND`.

THE ARRANGEMENT, left to right then down:

    [lo_boost_in>----+----[ SI6 56K ]----<out]
                     |
                   [SI7 0R]
                     |
                    GND

Every coordinate is a multiple of 1.27 mm (= 50 mil exactly), so a non-integral
mil result is a typo and fails loudly rather than rounding.

usage: make_repairs.py <sheet.kicad_sch> <out-ops.json>
"""
import json
import re
import sys

# --- the arrangement, in mm -------------------------------------------------
#
# The group rectangle is (171.45, 31.75) -> (215.9, 63.5) and DOES NOT CHANGE.
# Y was chosen so that it does not have to: see the margins asserted in
# restyle.py, which reproduce the Mid group's.
Y = 43.18                       # the signal line
X_IN = 189.23                   # lo_boost_in anchor; its tag runs 12.203 left
X_NODE = 191.77                 # where SI7's column drops off the signal line
X_SI6 = 200.66                  # SI6 centre; pins at 196.85 (in) and 204.47 (out)
X_OUT = 207.01                  # out anchor; its tag runs 4.523 right

SI6_AT = (X_SI6, Y)
SI6_ROT = 270                   # pin 2 (lo_boost_in) LEFT, pin 1 (out) RIGHT
SI7_AT = (X_NODE, 49.53)        # pins at 45.72 and 53.34
SI7_ROT = 180                   # pin 1 (GND) at the BOTTOM, pin 2 (node) on top
PWR07_AT = (X_NODE, 55.88)      # graphic 55.88 -> 58.42, downward, away from SI7

SI6_PIN_IN, SI6_PIN_OUT = 196.85, 204.47
SI7_PIN_TOP, SI7_PIN_BOT = 45.72, 53.34

NEW_WIRES = [
    ((X_IN, Y), (SI6_PIN_IN, Y),
     "lo_boost_in: the input runs RIGHT from its label into SI6's left pin"),
    ((X_NODE, Y), (X_NODE, SI7_PIN_TOP),
     "lo_boost_in: the shunt leg drops off the signal line"),
    ((X_NODE, SI7_PIN_BOT), (X_NODE, PWR07_AT[1]),
     "GND: SI7's bottom pin to the ground pin, which then draws downward"),
    ((SI6_PIN_OUT, Y), (X_OUT, Y),
     "out: SI6's right pin to the out label, which points RIGHT"),
]

NEW_JUNCTIONS = [
    ((X_NODE, Y), "the shunt tee - a wire-to-wire tee a reader cannot see "
                  "without a dot"),
]

# Every wire the old arrangement had. All six go: the group is redrawn, not
# patched.
DEAD_WIRES = [
    ((207.01, 49.53), (207.01, 46.99), "the folded ground wire - THE HAIRPIN"),
    ((207.01, 57.15), (207.01, 59.69), "SI7's stub up from the bottom rail"),
    ((189.23, 52.07), (189.23, 54.61), "SI6's stub down toward the rail"),
    ((189.23, 54.61), (189.23, 59.69), "SI6's column down to the rail"),
    ((189.23, 59.69), (207.01, 59.69), "the bottom rail - the INPUT, below the "
                                       "output"),
    ((189.23, 44.45), (189.23, 41.91), "SI6's stub up to the out label - the "
                                       "OUTPUT, pointing up"),
]


def mil(v):
    x = v * 1000.0 / 25.4
    if abs(x - round(x)) > 1e-6:
        raise SystemExit(f"{v} mm is not a whole number of mils ({x})")
    return int(round(x))


def num(v):
    """KiCad writes 139.7 rather than 139.70; match what is in the file."""
    return f"{v:.4f}".rstrip("0").rstrip(".")


def wire_uuid(src, a, b):
    pat = (rf'\(wire\s*\(pts \(xy {re.escape(num(a[0]))} {re.escape(num(a[1]))}\) '
           rf'\(xy {re.escape(num(b[0]))} {re.escape(num(b[1]))}\)\)\s*'
           rf'\(stroke[^\n]*\)\s*\(uuid "([0-9a-f-]+)"\)')
    hits = re.findall(pat, src)
    if len(hits) != 1:
        raise SystemExit(f"wire {a} -> {b}: {len(hits)} matches in the sheet, "
                         f"expected exactly 1 - this repair does not apply to "
                         f"this sheet")
    return hits[0]


def main():
    sheet, out = sys.argv[1], sys.argv[2]
    src = open(sheet).read()

    ops, notes = [], []

    def add(op, why):
        ops.append(op)
        notes.append(f"op {len(ops) - 1:2d}  {op['op']:24s}  {why}")

    for a, b, why in DEAD_WIRES:
        add({"op": "delete_object", "uuid": wire_uuid(src, a, b)},
            f"delete wire {a} -> {b}: {why}")

    add({"op": "move_component", "designator": "SI6",
         "x_mil": mil(SI6_AT[0]), "y_mil": mil(SI6_AT[1]),
         "carry_labels": False, "carry_wires": False},
        f"SI6 to {SI6_AT} - on the signal line, between the input node and the "
        f"out label")
    add({"op": "set_component_transform", "designator": "SI6",
         "rotation": SI6_ROT, "mirror": "none"},
        f"SI6 rotation {SI6_ROT}: HORIZONTAL, with pin 2 (lo_boost_in) on the "
        f"LEFT at {SI6_PIN_IN} and pin 1 (out) on the RIGHT at {SI6_PIN_OUT}. "
        f"270 and not 90, because 90 would put pin 1 on the left and send the "
        f"series element's output backwards. R1 on this page is the one other "
        f"horizontal Device:R and it is also 270.")

    add({"op": "move_component", "designator": "SI7",
         "x_mil": mil(SI7_AT[0]), "y_mil": mil(SI7_AT[1]),
         "carry_labels": False, "carry_wires": False},
        f"SI7 to {SI7_AT} - hanging BELOW the signal line, so its ground is at "
        f"the bottom of the part")
    add({"op": "set_component_transform", "designator": "SI7",
         "rotation": SI7_ROT, "mirror": "none"},
        f"SI7 rotation {SI7_ROT}: puts pin 1 at the BOTTOM so pin 1 stays on "
        f"GND and pin 2 stays on lo_boost_in. Device:R is a symmetric "
        f"rectangle with hidden pin numbers and empty pin names, so 180 and 0 "
        f"draw the same thing - SI3 on this page is already 180 - and 0 would "
        f"swap the two pins between the two nets, changing netlist pin sets "
        f"that this repair has to leave alone.")

    add({"op": "move_component", "designator": "#PWR07",
         "x_mil": mil(PWR07_AT[0]), "y_mil": mil(PWR07_AT[1]),
         "carry_labels": False, "carry_wires": False},
        f"#PWR07 to {PWR07_AT} - BELOW SI7, so copperhead_power:GND's "
        f"downward graphic draws away from the part instead of back over its "
        f"own wire. The fold disappears because the part moved, not because "
        f"the wire was re-routed.")
    add({"op": "set_component_transform", "designator": "#PWR07",
         "rotation": 0, "mirror": "none"},
        "#PWR07 rotation 0 restated: the graphic must draw in +y (down the "
        "sheet). It is already 0; stated so the op list says what the "
        "arrangement depends on.")

    for a, b, why in NEW_WIRES:
        add({"op": "add_wire",
             "vertices": [[mil(a[0]), mil(a[1])], [mil(b[0]), mil(b[1])]]},
            f"wire {a} -> {b}: {why}")

    for a, why in NEW_JUNCTIONS:
        add({"op": "add_junction", "at": [mil(a[0]), mil(a[1])]},
            f"junction {a}: {why}")

    doc = {"protocol_version": 2, "target_format": "kicad",
           "target_file": "pultec-hi-boost.kicad_sch", "ops": ops}
    json.dump(doc, open(out, "w"), indent=2)
    with open(out.replace(".json", ".notes.txt"), "w") as fh:
        fh.write("Why each op, keyed by index. An akcli op cannot carry a "
                 "reason - any\nunrecognised key is rejected op-by-op with "
                 "OP_UNSUPPORTED - so the reasons\nlive here.\n\n")
        fh.write("\n".join(notes) + "\n")
    print(f"{len(ops)} ops written to {out}")
    for n in notes:
        print("  " + n)


main()
