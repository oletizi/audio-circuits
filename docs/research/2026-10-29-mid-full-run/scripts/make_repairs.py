"""Build the akcli op-list for the pultec-mid repair pass.

EVERY COORDINATE BELOW IS A LITERAL. Nothing here searches for a placement or
optimises one: the tables ARE the arrangement, worked out by hand against the
rendered draft and against the pin geometry read out of the installed KiCad
libraries (`akcli pins` mixes units and its absolute positions are wrong -
`TOOLING.md`), with `mil()` refusing any coordinate that is not a whole number
of 50-mil grid steps.

Adapted from docs/research/2026-10-29-hi-cut-full-run/scripts/make_repairs.py.

THREE GROUPS ARE CLEARED AND REDRAWN - `Mid` (the own section, 28 parts), and
the `Hi boost` and `Hi cut` stand-ins, because the label-collapse rule reaches
them: the baseline carries `hi_tap` twice inside Hi boost and `hcut_t2` three
times plus `lo_boost_in` twice inside Hi cut, and collapsing a duplicate pair
into a wire is an arrangement change in a four-part group. `EVALUATING-DRAWINGS.md`
admits no test for when a duplicate may stay, so they are collapsed.

The structure of the own section comes from the circuit, and it is the same
structure the ACCEPTED `pultec-hi-boost` page has - an eleven-throw rotary
selecting one or two capacitors whose heads land on one of FIVE winding taps:

  hi_boost_out -[RV1 rheostat]- pole -[SW1]- throw k - cap(s) - tap bus -
  [L tap]- coil_return -[SW2 boost/off/cut]- 4K7 to `in` | 1K to GND | open

so the capacitors run in contact order, each at the y of its own contact
(a staircase), the five tap buses sit at ONE y above them - they do not overlap
in x, because the tap groups are contiguous in contact order - the five winding
sections sit above those, and `coil_return` is one rail along the top.

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
# 1. What goes: the three group rectangles AS DRAFTED, used as selection boxes.
#    The repaired Mid rectangle is a different, much wider one and is written
#    by scripts/restyle.py.
# ---------------------------------------------------------------------------

MID_BOX = (55.88, 106.68, 363.22, 224.79)
HI_BOOST_BOX = (95.25, 49.53, 135.89, 76.20)
HI_CUT_BOX = (140.97, 49.53, 227.33, 77.47)
DELETE_BOXES = [("Mid", MID_BOX), ("Hi boost", HI_BOOST_BOX), ("Hi cut", HI_CUT_BOX)]

# Four of J2's five stacked ground symbols. #PWR06 at (72.39, 93.98) stays as
# the single terminator: copperhead's GND draws its triangle 2.54 mm in the
# sheet's +y direction from its pin, so a terminator at the TOP of a downward
# trunk would draw its body over the trunk. FIFTH board, same geometry.
#
# #PWR08 goes too: the mode switch's two return legs end 15.24 mm apart, so one
# symbol on a link between them serves both - the owner's instruction from the
# low-boost page, *"we dont need five discrete ground symbols here. one will
# suffice if all the wires connect."* The price is 15.24 mm of wire and one
# junction instead of two 2.54 mm stubs.
DELETE_COMPONENTS = ["#PWR02", "#PWR03", "#PWR04", "#PWR05", "#PWR08"]

# ---------------------------------------------------------------------------
# 2. The own section's geometry.
# ---------------------------------------------------------------------------

PITCH = 15.24          # MEASURED for this part set - see scripts/textwidth.py
BANK_X0 = 120.65
RAIL_Y = 118.11        # coil_return
COIL_Y = 124.46        # the five winding sections, rotation 180
TAP_Y = 134.62         # the five tap buses, all at one y
SW1_X, SW1_Y = 85.09, 162.56
THROW_X = SW1_X + 15.24        # 100.33
POLE = (SW1_X - 15.24, SW1_Y)  # (69.85, 162.56)

# Switch:SW_Rotary_1x12, read off the installed library: pins 1-12 at symbol
# x = +15.24 stepping 2.54 mm from y = +15.24 down to y = -15.24 WITH NO PIN AT
# y = 0, pin 13 the pole at (-15.24, 0). So contacts 1-6 and 7-11 are 2.54 mm
# apart within each half and 5.08 mm across the gap, and pin 12 - the unused
# twelfth detent - is 2.54 mm below contact 11.
CONTACT_Y = {k: round(SW1_Y - 15.24 + (k - 1) * 2.54, 2) for k in range(1, 7)}
CONTACT_Y.update({k: round(SW1_Y + 2.54 + (k - 7) * 2.54, 2) for k in range(7, 12)})
NC_PIN_Y = round(SW1_Y + 15.24, 2)      # 177.80, pin 12

# (ref, contact, tap) in x order. The contact-to-capacitance mapping is
# MID_POSITIONS in circuits/pultec/electrical/mid.ts, transcribed from
# P3bandDoc.pdf p3; the tap each contact uses is that entry's `henries`.
BANK = [
    ("C1", 1, "tap_2h"), ("C2", 2, "tap_2h"), ("C3", 3, "tap_2h"),
    ("C4", 4, "tap_2h"), ("C5", 4, "tap_2h"),
    ("C6", 5, "tap_1h"), ("C7", 5, "tap_1h"), ("C8", 6, "tap_1h"),
    ("C9", 7, "tap_0r45h"), ("C10", 7, "tap_0r45h"),
    ("C11", 8, "tap_0r45h"), ("C12", 8, "tap_0r45h"),
    ("C13", 9, "tap_0r22h"), ("C14", 9, "tap_0r22h"), ("C15", 10, "tap_0r22h"),
    ("C16", 11, "tap_0r1h"), ("C17", 11, "tap_0r1h"),
]
CAP_X = {r: round(BANK_X0 + i * PITCH, 2) for i, (r, _, _) in enumerate(BANK)}
CAP_CONTACT = {r: c for r, c, _ in BANK}
CAP_TAP = {r: t for r, _, t in BANK}
# Device:C at rotation 0 has pin 1 at y-3.81 (the head, up to its tap bus) and
# pin 2 at y+3.81 (the tail, ON its own contact's run).
CAP_Y = {r: round(CONTACT_Y[c] - 3.81, 2) for r, c, _ in BANK}
CAP_HEAD = {r: round(CAP_Y[r] - 3.81, 2) for r in CAP_X}

TAP_ORDER = ["tap_2h", "tap_1h", "tap_0r45h", "tap_0r22h", "tap_0r1h"]
TAP_CAPS = {t: [r for r, _, tt in BANK if tt == t] for t in TAP_ORDER}
TAP_WEST = {t: min(CAP_X[r] for r in TAP_CAPS[t]) for t in TAP_ORDER}
TAP_EAST = {t: max(CAP_X[r] for r in TAP_CAPS[t]) for t in TAP_ORDER}

# One winding section per tap, placed half a pitch east of its cluster's middle
# capacitor so its drop lands BETWEEN two risers rather than on one. Literals
# rather than a formula, because a computed midpoint is not always on the grid.
COIL_X = {"tap_2h": 158.75, "tap_1h": 219.71, "tap_0r45h": 265.43,
          "tap_0r22h": 326.39, "tap_0r1h": 356.87}
COIL_REF = {"tap_2h": "L1", "tap_1h": "L2", "tap_0r45h": "L3",
            "tap_0r22h": "L4", "tap_0r1h": "L5"}
for _t in TAP_ORDER:
    if not TAP_WEST[_t] < COIL_X[_t] < TAP_EAST[_t]:
        raise SystemExit(f"{_t}: the winding's drop at {COIL_X[_t]} is not inside "
                         f"its bus {TAP_WEST[_t]}..{TAP_EAST[_t]}")

# The east end of each selector run: the LAST capacitor on that contact. x is
# strictly ascending in contact number, so every run ends west of every
# capacitor belonging to a higher contact - which is what makes the bank
# crossing-free. The proof is in the findings document.
RUN_END = {k: max(CAP_X[r] for r, c, _ in BANK if c == k) for k in range(1, 12)}

# The return block, east of the rail.
SW2 = (364.49, RAIL_Y)              # rotation 0: pole west on the rail's east end
SW2_BOOST = (369.57, 115.57)        # pin 1 (A)
SW2_CUT = (369.57, 120.65)          # pin 3 (C)
R1_AT = (388.62, 115.57)            # rotation 270: pin 2 west, pin 1 (`in`) east
R2_AT = (377.19, 127.00)            # rotation 0: pin 1 top, pin 2 bottom to GND
R3_AT = (392.43, 127.00)            # rotation 0: pin 1 (`in`) top, pin 2 to GND
GND_LINK_Y = 130.81                 # R2.2 and R3.2 meet here, on one symbol
GND_SYM = (384.81, GND_LINK_Y)
IN_NODE = (392.43, 115.57)
RV1_AT = (50.80, SW1_Y)             # rotation 90: pin 1 west, pin 3 east, wiper up

PLACE = [
    (COIL_REF[t], COIL_X[t], COIL_Y, 180) for t in TAP_ORDER
] + [
    (r, CAP_X[r], CAP_Y[r], 0) for r, _, _ in BANK
] + [
    ("SW1", SW1_X, SW1_Y, 0),
    ("RV1", RV1_AT[0], RV1_AT[1], 90),
    ("SW2", SW2[0], SW2[1], 0),
    ("R1", R1_AT[0], R1_AT[1], 270),
    ("R2", R2_AT[0], R2_AT[1], 0),
    ("R3", R3_AT[0], R3_AT[1], 0),
    # --- Hi boost stand-in: SI2 turned horizontal so SI1's `hi_tap` pin and
    #     SI2's meet on one straight wire, and `hi_boost_out` leaves at the
    #     right pointing right.
    ("SI2", 109.22, 69.85, 90),
    # --- Hi cut stand-in: the pot's two legs across the top, the 430R and the
    #     .047uF across the bottom, joined at both ends. See the findings.
    ("SI5", 166.37, 62.23, 90),
    ("SI6", 196.85, 62.23, 90),
    ("SI4", 180.34, 71.12, 90),
    ("SI3", 196.85, 71.12, 270),
]

MOVE_POWER = [
    # #FLG01 was synthesised on #PWR01's EXACT coordinates (72.39, 72.39) - the
    # fourth board in a row - so its diamond is drawn inside #PWR01's own
    # symbol. Moved onto a stub off the new J2 ground trunk, not deleted (the
    # owner's low-boost instruction).
    ("#FLG01", 67.31, 88.90),
    # The one ground symbol the two return legs share, on the link between them.
    ("#PWR07", GND_SYM[0], GND_SYM[1]),
]

# ---------------------------------------------------------------------------
# 3. Wires. (x1, y1, x2, y2, net, what)  -- `net` drives the stroke colour in
#    scripts/restyle.py, because a net drawn in two colours reads as two nets.
# ---------------------------------------------------------------------------

ADD_WIRES = [
    # --- the coil_return rail, one net drawn once -------------------------
    (COIL_X["tap_2h"], RAIL_Y, SW2[0] - 5.08, RAIL_Y, "coil_return",
     f"coil_return rail, {SW2[0] - 5.08 - COIL_X['tap_2h']:.2f} mm, "
     f"six pins drawn once"),
]
# Five winding sections: pin 2 (coil_return) up to the rail, pin 1 down to the bus.
for _t in TAP_ORDER:
    _x = COIL_X[_t]
    ADD_WIRES.append((_x, COIL_Y - 3.81, _x, RAIL_Y, "coil_return",
                      f"{COIL_REF[_t]}.2 riser to the rail"))
    ADD_WIRES.append((_x, COIL_Y + 3.81, _x, TAP_Y, _t,
                      f"{COIL_REF[_t]}.1 drop to the {_t} bus"))
    ADD_WIRES.append((TAP_WEST[_t], TAP_Y, TAP_EAST[_t], TAP_Y, _t,
                      f"{_t} bus, {TAP_EAST[_t] - TAP_WEST[_t]:.2f} mm"))
# Seventeen risers, each from one capacitor's head straight up to its tap bus.
for _r, _c, _t in BANK:
    ADD_WIRES.append((CAP_X[_r], CAP_HEAD[_r], CAP_X[_r], TAP_Y, _t,
                      f"{_r}.1 riser to {_t}, {CAP_HEAD[_r] - TAP_Y:.2f} mm"))
# Eleven selector runs, one per contact, each a SINGLE straight horizontal with
# no corner, from the throw pin to the last capacitor tail on that contact.
for _k in range(1, 12):
    ADD_WIRES.append((THROW_X, CONTACT_Y[_k], RUN_END[_k], CONTACT_Y[_k],
                      f"sel{_k}", f"sel{_k} run, {RUN_END[_k] - THROW_X:.2f} mm"))

ADD_WIRES += [
    # --- the west chain: the level rheostat into the selector pole ---------
    (41.91, SW1_Y, RV1_AT[0] - 3.81, SW1_Y, "hi_boost_out",
     "the input label to RV1.1 (ccw), 5.08 mm"),
    (RV1_AT[0] + 3.81, SW1_Y, POLE[0], SW1_Y, "sel_common",
     "RV1.3 (cw) east to the selector pole, 15.24 mm"),
    (RV1_AT[0], SW1_Y - 3.81, RV1_AT[0], SW1_Y - 6.35, "sel_common",
     "RV1.2 (wiper) up 2.54 mm"),
    (RV1_AT[0], SW1_Y - 6.35, RV1_AT[0] + 6.35, SW1_Y - 6.35, "sel_common",
     "the rheostat tie, east 6.35 mm over the body"),
    (RV1_AT[0] + 6.35, SW1_Y - 6.35, RV1_AT[0] + 6.35, SW1_Y, "sel_common",
     "the rheostat tie, down onto the pole wire"),
    # --- the return block --------------------------------------------------
    (SW2_BOOST[0], SW2_BOOST[1], R1_AT[0] - 3.81, R1_AT[1], "boost_return",
     "SW2.1 (boost) east to R1.2, 15.24 mm"),
    (SW2_CUT[0], SW2_CUT[1], R2_AT[0], SW2_CUT[1], "cut_return",
     "SW2.3 (cut) east 7.62 mm"),
    (R2_AT[0], SW2_CUT[1], R2_AT[0], R2_AT[1] - 3.81, "cut_return",
     "down 2.54 mm to R2.1"),
    (IN_NODE[0], IN_NODE[1], R3_AT[0], R3_AT[1] - 3.81, "in",
     "the `in` node down to R3.1, 7.62 mm"),
    (R2_AT[0], GND_LINK_Y, R3_AT[0], GND_LINK_Y, "GND",
     "R2.2 to R3.2: one ground symbol for the two return legs, 15.24 mm"),
    # --- Junction: J2's five stacked grounds become one on a trunk ---------
    (72.39, 83.82, 72.39, 93.98, "GND", "J2 ground trunk, 10.16 mm"),
    (72.39, 88.90, 67.31, 88.90, "GND", "#FLG01 stub off the trunk, 5.08 mm"),
    # --- Hi boost stand-in --------------------------------------------------
    (99.06, 69.85, 105.41, 69.85, "hi_tap",
     "SI1.2 to SI2.1: the collapsed duplicate `hi_tap` pair, 6.35 mm"),
    (113.03, 69.85, 116.84, 69.85, "hi_boost_out", "SI2.2 to the label, 3.81 mm"),
    (99.06, 59.69, 99.06, 62.23, "in", "the `in` label down to SI1.1, 2.54 mm"),
    # --- Hi cut stand-in ----------------------------------------------------
    (158.75, 62.23, 162.56, 62.23, "hi_boost_out",
     "the input label to SI5.1, 3.81 mm"),
    (170.18, 62.23, 193.04, 62.23, "hcut_t2",
     "SI5.2 to SI6.1 across the top: the collapsed `hcut_t2` triple, 22.86 mm"),
    (176.53, 62.23, 176.53, 71.12, "hcut_t2",
     "down to SI4.1, 8.89 mm - the third `hcut_t2` pin"),
    (184.15, 71.12, 193.04, 71.12, "hcut_t1", "SI4.2 to SI3.2, 8.89 mm"),
    (200.66, 62.23, 200.66, 71.12, "lo_boost_in",
     "SI6.2 down to SI3.1: the collapsed duplicate `lo_boost_in` pair, 8.89 mm"),
]

ADD_JUNCTIONS = []
# The rail, where a winding's riser tees into its interior.
for _t in TAP_ORDER:
    if COIL_X["tap_2h"] < COIL_X[_t] < SW2[0] - 5.08:
        ADD_JUNCTIONS.append((COIL_X[_t], RAIL_Y, f"rail through {COIL_REF[_t]}.2"))
# Each tap bus, where a riser or a winding's drop tees into its interior.
for _t in TAP_ORDER:
    pts = sorted({CAP_X[r] for r in TAP_CAPS[_t]} | {COIL_X[_t]})
    for _x in pts:
        if TAP_WEST[_t] < _x < TAP_EAST[_t]:
            who = COIL_REF[_t] if _x == COIL_X[_t] else \
                next(r for r in TAP_CAPS[_t] if CAP_X[r] == _x)
            ADD_JUNCTIONS.append((_x, TAP_Y, f"{_t} bus through {who}"))
# A selector run passes through the tail pin of the FIRST capacitor of a
# parallel pair on its way to the second.
for _k in range(1, 12):
    for _r in [r for r, c, _ in BANK if c == _k]:
        if CAP_X[_r] < RUN_END[_k]:
            ADD_JUNCTIONS.append((CAP_X[_r], CONTACT_Y[_k],
                                  f"sel{_k} run through {_r}.2"))
ADD_JUNCTIONS += [
    (GND_SYM[0], GND_SYM[1], "the shared ground symbol on the return legs' link"),
    (RV1_AT[0] + 6.35, SW1_Y, "the rheostat tie onto the pole wire"),
    (72.39, 86.36, "J2 trunk / pin 2 stub"),
    (72.39, 88.90, "J2 trunk / pin 3 stub / #FLG01 stub"),
    (72.39, 91.44, "J2 trunk / pin 4 stub"),
    (72.39, 93.98, "J2 trunk foot / pin 5 stub / #PWR06"),
    (176.53, 62.23, "Hi cut: the hcut_t2 drop off the top wire"),
]

# ---------------------------------------------------------------------------
# 4. Labels. ONE PER NET PER GROUP - `EVALUATING-DRAWINGS.md`: collapse
#    duplicate on-page labels into a wire, always, without reasoning about it.
#
#    SCOPE FOLLOWS WHETHER THE NET LEAVES ITS GROUP, which is a decision
#    `TOOLING.md` records as uncovered: *"Nothing covers what to do when a
#    collapse leaves a net with a single label whose natural scope is local."*
#    A net wholly inside one group carries a LOCAL label; only the five
#    junction nets - `in`, `out`, `hi_boost_out`, `lo_boost_in`, `GND` - cross
#    a group boundary and stay global.
#
#    THE FIRST PASS KEPT COPPERHEAD'S SCOPES AND THE RENDER REFUTED IT. A
#    global label is drawn as a TAG - a box around the text - and KiCad draws
#    the wire straight through it: `sel_common`'s tag covered the rheostat's
#    wiper pin NUMBER and its tie, `hi_tap`'s covered SI1's pin stub, and
#    `hcut_t2`'s sat on the wire it names with the wire through the middle of
#    it. A local label is plain text above the wire and none of the three
#    recurs. The price is seven nets exported with a leading `/`, reported in
#    the verification table; the hi-cut run paid the same price for one net.
#    It also makes the five `tap_*` labels consistent, where copperhead had
#    written four global and `tap_0r22h` local.
# ---------------------------------------------------------------------------

GLOBAL = "global"
LOCAL = "local"

ADD_LABELS = [
    # --- Mid --------------------------------------------------------------
    ("hi_boost_out", 41.91, SW1_Y, GLOBAL, 180,
     "the section's input, west of RV1.1, pointing into the wire"),
    ("sel_common", RV1_AT[0], SW1_Y - 6.35, LOCAL, 0,
     "the rheostat's output node, on the tie's horizontal"),
    ("coil_return", COIL_X["tap_2h"], RAIL_Y, LOCAL, 0, "the rail's west end"),
    ("in", IN_NODE[0], IN_NODE[1], GLOBAL, 0,
     "the boost leg's return to the input node, pointing right"),
    ("boost_return", SW2_BOOST[0], SW2_BOOST[1], LOCAL, 0, "SW2.1 to R1"),
    ("cut_return", SW2_CUT[0], SW2_CUT[1], LOCAL, 0, "SW2.3 to R2"),
    # --- Hi boost -----------------------------------------------------------
    ("in", 99.06, 59.69, GLOBAL, 0, "SI1.1"),
    ("hi_tap", 99.06, 69.85, LOCAL, 0,
     "the one label this net keeps, on the collapsed wire"),
    ("hi_boost_out", 116.84, 69.85, GLOBAL, 0, "SI2.2, pointing right"),
    # --- Hi cut -------------------------------------------------------------
    ("hi_boost_out", 158.75, 62.23, GLOBAL, 180, "SI5.1, pointing into the wire"),
    ("hcut_t2", 180.34, 62.23, LOCAL, 0,
     "the one label this net keeps, east of the drop"),
    ("hcut_t1", 184.15, 71.12, LOCAL, 0, "SI4.2 to SI3.2"),
    ("lo_boost_in", 200.66, 71.12, GLOBAL, 0, "SI3.1, pointing right"),
]
# The five tap buses, each named on its own winding's drop 2.54 mm below the
# inductor pin - the one place in this group with nothing else in it. Anchoring
# them on a bus end or a capacitor riser was measured into a collision both ways.
for _t in TAP_ORDER:
    ADD_LABELS.append((_t, COIL_X[_t], TAP_Y - 2.54, LOCAL, 0,
                       f"the {_t} bus, on {COIL_REF[_t]}'s drop"))
# Eleven contact labels, each anchored 2.54 mm east of where the run ABOVE it
# ends, so no label's text sits over the run above or in the 2.54 mm gap it
# would otherwise share with it.
for _k in range(1, 12):
    _ax = 102.87 if _k == 1 else round(RUN_END[_k - 1] + 2.54, 2)
    if _ax > RUN_END[_k]:
        raise SystemExit(f"sel{_k} label anchor {_ax} is past its own run's end")
    ADD_LABELS.append((f"sel{_k}", _ax, CONTACT_Y[_k], LOCAL, 0,
                       f"contact {_k}"))

ADD_NO_CONNECT = [("SW1.12", "the unused twelfth detent of a 1x12 rotary wired "
                             "for eleven positions; ComponentOverride.ncPins "
                             "declares it")]


def main():
    src = open(sys.argv[1]).read()

    # Wires are parsed BY BLOCK: a single regex reaching past the stroke
    # silently drops every wire carrying a (color ...) - 59 of the 149 here.
    tokens = src.count("\n\t(wire")
    blocks = re.findall(r'\n\t\(wire\n(?:.*?)\n\t\)', src, re.S)
    if len(blocks) != tokens:
        raise SystemExit(f"parsed {len(blocks)} wire blocks of {tokens} tokens")

    def box_of(ax, ay, bx, by):
        for name, (x1, y1, x2, y2) in DELETE_BOXES:
            if x1 <= min(ax, bx) and max(ax, bx) <= x2 \
                    and y1 <= min(ay, by) and max(ay, by) <= y2:
                return name
        return None

    delete_wires = []
    for b in blocks:
        pts = re.search(
            r'\(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\)', b)
        uid = re.search(r'\(uuid "([0-9a-f-]+)"\)', b).group(1)
        ax, ay, bx, by = (float(g) for g in pts.groups())
        g = box_of(ax, ay, bx, by)
        if g:
            delete_wires.append((uid, f"{g}: wire ({ax},{ay})-({bx},{by})"))

    delete_junctions = []
    for m in re.finditer(
            r'\(junction \(at ([-\d.]+) ([-\d.]+)\)\s*\(diameter [^)]*\)\s*'
            r'\(color [^)]*\)\s*\(uuid "([0-9a-f-]+)"\)', src, re.S):
        ax, ay, uid = float(m.group(1)), float(m.group(2)), m.group(3)
        g = box_of(ax, ay, ax, ay)
        if g:
            delete_junctions.append((uid, f"{g}: junction ({ax},{ay})"))

    delete_labels = []
    for m in re.finditer(
            r'\((?:global_label|label) "([^"]+)"(?: \(shape \w+\))? '
            r'\(at ([-\d.]+) ([-\d.]+) \d+\)(?:.*?)\(uuid "([0-9a-f-]+)"\)',
            src, re.S):
        ax, ay = float(m.group(2)), float(m.group(3))
        g = box_of(ax, ay, ax, ay)
        if g:
            delete_labels.append((m.group(4),
                                  f"{g}: label {m.group(1)} at ({ax},{ay})"))

    delete_other = []
    for m in re.finditer(
            r'\(no_connect \(at ([-\d.]+) ([-\d.]+)\)\s*\(uuid "([0-9a-f-]+)"\)', src):
        ax, ay = float(m.group(1)), float(m.group(2))
        g = box_of(ax, ay, ax, ay)
        if g:
            delete_other.append((m.group(3), f"{g}: no_connect at ({ax},{ay})"))

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

    for ref, x, y, rot in PLACE:
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

    for ax, ay, bx, by, net, what in ADD_WIRES:
        add({"op": "add_wire",
             "vertices": [[mil(ax), mil(ay)], [mil(bx), mil(by)]]},
            f"[{net}] {what}")
    for ax, ay, what in ADD_JUNCTIONS:
        add({"op": "add_junction", "at": [mil(ax), mil(ay)]}, what)
    for name, ax, ay, scope, rot, why in ADD_LABELS:
        add({"op": "add_net_label", "name": name,
             "at": [mil(ax), mil(ay)], "scope": scope, "rotation": rot},
            f"{scope} label {name}: {why}")
    for pin, what in ADD_NO_CONNECT:
        add({"op": "add_no_connect", "pin": pin}, what)

    out = {"protocol_version": 2, "target_format": "kicad",
           "target_file": "pultec-mid.kicad_sch", "ops": ops}
    json.dump(out, open(sys.argv[2], "w"), indent=2)
    with open(sys.argv[2].replace(".json", ".notes.txt"), "w") as fh:
        fh.write("\n".join(notes) + "\n")
    print(f"{len(ops)} ops  (delete {len(delete_wires)} wires, "
          f"{len(delete_junctions)} junctions, {len(delete_labels)} labels, "
          f"{len(delete_other)} no-connects, {len(DELETE_COMPONENTS)} GND symbols; "
          f"place {len(PLACE)}, move {len(MOVE_POWER)} power; "
          f"add {len(ADD_WIRES)} wires, {len(ADD_JUNCTIONS)} junctions, "
          f"{len(ADD_LABELS)} labels, {len(ADD_NO_CONNECT)} no-connect)")
    print("written:", sys.argv[2])


# scripts/restyle.py imports this module for the arrangement tables, so main()
# runs only when the op-list is actually being built.
if __name__ == "__main__":
    main()
