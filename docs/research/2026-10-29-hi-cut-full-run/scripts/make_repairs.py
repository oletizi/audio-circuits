"""Build the akcli op-list for the pultec-hi-cut repair pass.

EVERY COORDINATE BELOW IS A LITERAL. Nothing here searches for a placement or
optimises one: the tables ARE the arrangement, worked out by hand against the
rendered draft and against the pin geometry read out of the sheet's own
`lib_symbols` block (`scripts/pingeom.py`, because `akcli pins` mixes units and
its absolute positions are wrong - `TOOLING.md`).

The one thing it reads from the sheet is the set of wire/junction/label uuids to
delete, because akcli deletes by uuid and copperhead assigns them.

**The whole Hi cut group is cleared and redrawn.** Unlike the hi-boost run,
which kept copperhead's Q chain, every one of this group's thirteen parts moves,
so nothing in it is worth keeping.

usage: make_repairs.py <sheet.kicad_sch> <out.json>
"""
import json
import re
import sys

MIL = 1.0 / 0.0254


def mil(v):
    """mm -> mil, as an integer. Every coordinate here is a multiple of 1.27 mm
    (= 50 mil exactly), so a non-integral result is a typo and must fail."""
    x = v * MIL
    if abs(x - round(x)) > 1e-6:
        raise SystemExit(f"{v} mm is not a whole number of mils ({x})")
    return int(round(x))


# ---------------------------------------------------------------------------
# 1. What goes. The Hi cut rectangle AS DRAFTED, which is the selection box for
#    the removal; the repaired rectangle is a different, smaller one and is
#    written by scripts/restyle.py.
# ---------------------------------------------------------------------------

HI_CUT_BOX = (50.8, 88.9, 246.38, 153.67)

# Lo boost: the duplicate `lo_boost_in` pair is collapsed into a wire, which
# means SI5's own stub and the ground stub below it both move.
DELETE_WIRES_EXTRA = {
    "82b59735-3d50-52a6-94a6-c7b9aa9c18bc",   # SI5.2 -> lo_boost_in dup stub
    "707f2deb-1a5d-5851-b81e-68c606c51bc6",   # SI5.1 -> #PWR07, before SI5 moves
}

DELETE_LABELS_EXTRA = [
    # The second of the two `lo_boost_in` labels inside the Lo boost group.
    # The survivor is the one at (162.56, 54.61), which keeps its position.
    ("6e982cbb-0ef5-541d-ad66-9c16e2f37fd4", "lo_boost_in dup at (180.34,41.91) in Lo boost"),
]

# Four of J2's five stacked ground symbols. #PWR06 at (67.31, 76.20) stays as
# the single terminator: copperhead's GND draws its triangle 2.54 mm in the
# sheet's +y direction from its pin, so a terminator at the TOP of a downward
# trunk would draw its body over the trunk.
DELETE_COMPONENTS = ["#PWR02", "#PWR03", "#PWR04", "#PWR05"]

# ---------------------------------------------------------------------------
# 2. Placement. (designator, x_mm, y_mm, rotation)
#
# The Hi cut group, re-authored. Its shape comes from the circuit: a 1-of-6
# rotary selects one or two capacitors whose heads ALL land on one node
# (`lo_boost_in`, 14 pins), so that node is drawn once as a rail along the top
# of the group and the capacitors hang under it in contact order.
#
# Contact -> capacitors, from the model's own selector table
#   (3kHz..16kHz = t1..t6):   1: C1,C7   2: C2,C8   3: C3   4: C4,C9
#                             5: C5,C10  6: C6
# x is STRICTLY ASCENDING IN CONTACT NUMBER, which is what makes the bank
# crossing-free - see the proof in the findings document.
#
# The 15.24 mm pitch is MEASURED for this part set, not copied: this board's
# widest value draws 6.22 mm wide (scripts/textwidth.py), which at a 6.35 mm
# field offset leaves 1.11 mm to its own plate and 3.59 mm to the next one.
# ---------------------------------------------------------------------------

PITCH = 15.24
RAIL_Y = 96.52
CONTACT_Y = {1: 109.22, 2: 111.76, 3: 114.30, 4: 116.84, 5: 119.38, 6: 121.92}
BANK = [                      # (ref, contact), in x order
    ("C1", 1), ("C7", 1),
    ("C2", 2), ("C8", 2),
    ("C3", 3),
    ("C4", 4), ("C9", 4),
    ("C5", 5), ("C10", 5),
    ("C6", 6),
]
BANK_X0 = 114.30

CAP_X = {ref: round(BANK_X0 + i * PITCH, 2) for i, (ref, _) in enumerate(BANK)}
CAP_CONTACT = dict(BANK)
# A Device:C at rotation 0 has pin 1 at y-3.81 (the head, up to the rail) and
# pin 2 at y+3.81 (the tail, on its own contact's run).
CAP_Y = {ref: round(CONTACT_Y[c] - 3.81, 2) for ref, c in BANK}

PLACE = [
    # The level pot, rotation 180 so that pin 3 (cw, `lo_boost_in`) points UP
    # and lands exactly on the rail's west end, pin 1 (ccw, `hi_boost_out`)
    # points DOWN and carries the input label, and pin 2 (the wiper) points
    # west into the column that feeds R1 and the selector.
    ("RV1", 60.96, 102.87, 180),
    # The 430R between the wiper and the selector pole, horizontal.
    #
    # R1's and SW1's x were each pushed 3.81 and 7.62 mm east of the first
    # placement after LOOKING at the render: at the first positions the
    # `cut_wiper` label's text ended 0.8 mm short of R1's lead and the
    # `sel_common` label's text ran over the selector's own pin-7 NUMBER. Both
    # are text proximities that no check here reported.
    ("R1", 72.39, 116.84, 90),
    # The selector: pin 4 is on its centre line, so this y puts contact 4 at
    # 116.84 and the six contacts at CONTACT_Y.
    ("SW1", 97.79, 116.84, 0),
] + [(ref, CAP_X[ref], CAP_Y[ref], 0) for ref, _ in BANK]

# The absent-section stand-in that moves, and the two power symbols.
PLACE_EXTRA = [
    # SI5 drops 7.62 mm so its `lo_boost_in` pin sits at the same height as
    # SI4's, which is what lets the duplicate label pair become one straight
    # wire. Its ground then hangs below it rather than above, which is the
    # arrangement the hi-boost page was approved with.
    ("SI5", 180.34, 55.88, 180),
]

MOVE_POWER = [
    # #FLG01 was synthesised on #PWR01's exact coordinates - the third board in
    # a row - so its diamond is drawn inside the `out` global label's box. Moved
    # onto a stub off the new J2 ground trunk, not deleted (the owner's
    # low-boost instruction).
    ("#FLG01", 62.23, 71.12),
    # Follows SI5 down.
    ("#PWR07", 180.34, 62.23),
]

# ---------------------------------------------------------------------------
# 3. Wires. (x1, y1, x2, y2, what)
# ---------------------------------------------------------------------------

ADD_WIRES = [
    # --- Hi cut -----------------------------------------------------------
    # The `lo_boost_in` rail: fourteen pins on one net, drawn ONCE instead of
    # as the three labels copperhead put inside this group. It is the longest
    # wire on the page and the reason is stated in the findings.
    (60.96, RAIL_Y, 254.0, RAIL_Y, "lo_boost_in rail, 193.04 mm"),
    (60.96, 99.06, 60.96, RAIL_Y, "RV1.3 (cw) up to the rail's west end"),
    (57.15, 102.87, 57.15, 116.84, "cut_wiper column off RV1.2, 13.97 mm"),
    (57.15, 116.84, 68.58, 116.84, "cut_wiper to R1.1, 11.43 mm"),
    (76.20, 116.84, 90.17, 116.84, "sel_common: R1.2 to SW1.7, 13.97 mm"),
]

# Six selector runs, one per contact, each a SINGLE straight horizontal with no
# corner, from the switch pin to the last capacitor tail on that contact.
SW_CONTACT_X = 105.41
for _c in range(1, 7):
    _last = max(CAP_X[r] for r, cc in BANK if cc == _c)
    ADD_WIRES.append((SW_CONTACT_X, CONTACT_Y[_c], _last, CONTACT_Y[_c],
                      f"sel{_c} run, {_last - SW_CONTACT_X:.2f} mm"))

# Ten risers, each from one capacitor's head straight up to the rail.
for _ref, _c in BANK:
    _head = round(CAP_Y[_ref] - 3.81, 2)
    ADD_WIRES.append((CAP_X[_ref], _head, CAP_X[_ref], RAIL_Y,
                      f"{_ref}.1 riser to the rail, {_head - RAIL_Y:.2f} mm"))

ADD_WIRES += [
    # --- Junction ---------------------------------------------------------
    (67.31, 66.04, 67.31, 76.20, "J2 ground trunk, 10.16 mm"),
    (67.31, 71.12, 62.23, 71.12, "#FLG01 stub off the trunk, 5.08 mm"),
    # --- Lo boost ---------------------------------------------------------
    (162.56, 52.07, 180.34, 52.07, "lo_boost_in SI4.2 to SI5.2, 17.78 mm "
                                   "(the collapsed duplicate pair)"),
    (180.34, 59.69, 180.34, 62.23, "SI5.1 down to #PWR07, 2.54 mm"),
]

# Which of the added wires take copperhead's grey ground colour. Colour is how
# a reader follows one net across a sheet; `add_wire` writes none, so
# scripts/restyle.py puts it back and scripts/colour_check.py checks it.
GREY_WIRES = {
    (67.31, 66.04, 67.31, 76.20),
    (67.31, 71.12, 62.23, 71.12),
    (180.34, 59.69, 180.34, 62.23),
}

ADD_JUNCTIONS = (
    # Every capacitor riser tees into the interior of the rail.
    [(CAP_X[r], RAIL_Y, f"rail through {r}.1") for r, _ in BANK]
    # A selector run passes through the tail pin of the FIRST capacitor of a
    # parallel pair on its way to the second.
    + [(CAP_X["C1"], CONTACT_Y[1], "sel1 run through C1.2"),
       (CAP_X["C2"], CONTACT_Y[2], "sel2 run through C2.2"),
       (CAP_X["C4"], CONTACT_Y[4], "sel4 run through C4.2"),
       (CAP_X["C5"], CONTACT_Y[5], "sel5 run through C5.2"),
       # J2's five pin stubs now meet one trunk.
       (67.31, 68.58, "J2 trunk / pin 3 stub"),
       (67.31, 71.12, "J2 trunk / pin 4 stub / #FLG01 stub"),
       (67.31, 73.66, "J2 trunk / pin 5 stub"),
       (67.31, 76.20, "J2 trunk foot / pin stub / #PWR06"),
       # Lo boost: SI4.2's pin, its label stub and the new link.
       (162.56, 52.07, "lo_boost_in at SI4.2")]
)

# Labels. ONE per net per group - `EVALUATING-DRAWINGS.md`: collapse duplicate
# on-page labels into a wire, always, without reasoning about it.
#
# Each sel label is anchored past the right-hand end of the run ABOVE it, so no
# label's text sits in the 2.54 mm gap between two runs.
ADD_LABELS = [
    ("hi_boost_out", 60.96, 106.68, "global",
     "the input, at RV1.1 (ccw). Crosses groups, so it stays global."),
    ("lo_boost_in", 254.0, RAIL_Y, "global",
     "the one label this net keeps inside Hi cut, at the rail's east end"),
    ("cut_wiper", 57.15, 116.84, "local", "RV1.2 to R1.1"),
    ("sel_common", 76.20, 116.84, "local", "R1.2 to the selector pole"),
    ("sel1", 106.68, CONTACT_Y[1], "local", "contact 1 (3kHz)"),
    ("sel2", 130.81, CONTACT_Y[2], "local", "contact 2 (4kHz)"),
    ("sel3", 161.29, CONTACT_Y[3], "local", "contact 3 (5kHz)"),
    ("sel4", 176.53, CONTACT_Y[4], "local", "contact 4 (8kHz)"),
    ("sel5", 207.01, CONTACT_Y[5], "local", "contact 5 (10kHz)"),
    ("sel6", 237.49, CONTACT_Y[6], "local", "contact 6 (16kHz)"),
]

ADD_NO_CONNECT = [("SW1.MP", "selector mounting lug, on no net in the model")]


def main():
    src = open(sys.argv[1]).read()

    # Wires are parsed BY BLOCK: a single regex that reaches past the stroke
    # silently drops every wire carrying a (color ...), which is 23 of the 77
    # here and includes all six of J2's ground stubs.
    tokens = src.count("\n\t(wire")
    blocks = re.findall(r'\n\t\(wire\n(?:.*?)\n\t\)', src, re.S)
    if len(blocks) != tokens:
        raise SystemExit(f"parsed {len(blocks)} wire blocks of {tokens} tokens")
    x1b, y1b, x2b, y2b = HI_CUT_BOX
    delete_wires = []
    for b in blocks:
        pts = re.search(
            r'\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)', b)
        uid = re.search(r'\(uuid "([0-9a-f-]+)"\)', b).group(1)
        ax, ay, bx, by = (float(g) for g in pts.groups())
        inside = (x1b <= min(ax, bx) and max(ax, bx) <= x2b
                  and y1b <= min(ay, by) and max(ay, by) <= y2b)
        if inside or uid in DELETE_WIRES_EXTRA:
            delete_wires.append((uid, f"wire ({ax},{ay})-({bx},{by})"))

    junc_pat = re.compile(
        r'\(junction \(at ([-\d.]+) ([-\d.]+)\)\s*\(diameter [^)]*\)\s*'
        r'\(color [^)]*\)\s*\(uuid "([0-9a-f-]+)"\)', re.S)
    delete_junctions = []
    for m in junc_pat.finditer(src):
        ax, ay, uid = float(m.group(1)), float(m.group(2)), m.group(3)
        if x1b <= ax <= x2b and y1b <= ay <= y2b:
            delete_junctions.append((uid, f"junction ({ax},{ay})"))

    delete_labels = []
    for m in re.finditer(
            r'\((?:global_label|label) "([^"]+)"(?: \(shape \w+\))? '
            r'\(at ([-\d.]+) ([-\d.]+) \d+\)(?:.*?)\(uuid "([0-9a-f-]+)"\)',
            src, re.S):
        ax, ay = float(m.group(2)), float(m.group(3))
        if x1b <= ax <= x2b and y1b <= ay <= y2b:
            delete_labels.append((m.group(4),
                                  f"label {m.group(1)} at ({ax},{ay}) in Hi cut"))
    delete_labels += DELETE_LABELS_EXTRA

    delete_other = []
    for m in re.finditer(
            r'\(no_connect \(at ([-\d.]+) ([-\d.]+)\)\s*\(uuid "([0-9a-f-]+)"\)', src):
        ax, ay = float(m.group(1)), float(m.group(2))
        if x1b <= ax <= x2b and y1b <= ay <= y2b:
            delete_other.append((m.group(3), f"no_connect at ({ax},{ay})"))

    # akcli 0.22.0 rejects ANY key it does not know, op by op, so an op cannot
    # carry the reason it exists. The reasons go to a sidecar keyed by index.
    ops, notes = [], []

    def add(op, what):
        ops.append(op)
        notes.append(f"[{len(ops) - 1:3}] {op['op']:26} {what}")

    for uid, what in delete_wires + delete_junctions + delete_labels + delete_other:
        add({"op": "delete_object", "uuid": uid}, what)
    for ref in DELETE_COMPONENTS:
        add({"op": "delete_component", "designator": ref},
            "one of J2's five stacked ground symbols")

    for ref, x, y, rot in PLACE + PLACE_EXTRA:
        add({"op": "set_component_transform", "designator": ref,
             "rotation": rot, "mirror": "none"}, f"{ref} rotation {rot}")
        add({"op": "move_component", "designator": ref,
             "x_mil": mil(x), "y_mil": mil(y),
             "carry_labels": False, "carry_wires": False},
            f"{ref} to ({x}, {y}) mm")
    for ref, x, y in MOVE_POWER:
        add({"op": "move_component", "designator": ref,
             "x_mil": mil(x), "y_mil": mil(y),
             "carry_labels": False, "carry_wires": False},
            f"{ref} to ({x}, {y}) mm")

    for ax, ay, bx, by, what in ADD_WIRES:
        add({"op": "add_wire",
             "vertices": [[mil(ax), mil(ay)], [mil(bx), mil(by)]]}, what)
    for ax, ay, what in ADD_JUNCTIONS:
        add({"op": "add_junction", "at": [mil(ax), mil(ay)]}, what)
    for name, ax, ay, scope, why in ADD_LABELS:
        add({"op": "add_net_label", "name": name,
             "at": [mil(ax), mil(ay)], "scope": scope, "rotation": 0},
            f"{scope} label {name}: {why}")
    for pin, what in ADD_NO_CONNECT:
        add({"op": "add_no_connect", "pin": pin}, what)

    out = {"protocol_version": 2, "target_format": "kicad",
           "target_file": "pultec-hi-cut.kicad_sch", "ops": ops}
    json.dump(out, open(sys.argv[2], "w"), indent=2)
    with open(sys.argv[2].replace(".json", ".notes.txt"), "w") as fh:
        fh.write("\n".join(notes) + "\n")
    print(f"{len(ops)} ops  (delete {len(delete_wires)} wires, "
          f"{len(delete_junctions)} junctions, {len(delete_labels)} labels, "
          f"{len(delete_other)} no-connects, {len(DELETE_COMPONENTS)} GND symbols; "
          f"place {len(PLACE) + len(PLACE_EXTRA)}, move {len(MOVE_POWER)} power; "
          f"add {len(ADD_WIRES)} wires, {len(ADD_JUNCTIONS)} junctions, "
          f"{len(ADD_LABELS)} labels)")
    print("written:", sys.argv[2])


main()
