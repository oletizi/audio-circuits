"""The Mid group's arrangement on US Letter, as literals, with its own proofs.

EVERY COORDINATE HERE IS A LITERAL. Nothing searches for a placement or
optimises one; the tables ARE the arrangement. `mil()` refuses any coordinate
that is not a whole number of 50-mil steps, and the assertions at the bottom
refuse an arrangement that does not have the properties this file claims for it.

WHAT CHANGED FROM THE APPROVED PAGE, AND WHY IT HAD TO
======================================================
The approved A3 page draws the seventeen capacitors as ONE row in contact order
at a 15.24 mm pitch. That row is 243.84 mm wide on its own, and the measured
usable width inside the Letter frame is 255.397 mm, so the row plus the selector
west of it plus the return block east of it cannot fit. **That is arithmetic,
not taste**, and the findings document works it through: even at the tightest
pitch the text geometry admits (12.70 mm, which puts BOTH text gaps at the
0.912 mm the approved page already ships on one side), the row is 203.2 mm and
the page still does not close.

So the row is FOLDED at the tap boundary between contact 6 and contact 7:

  TIER A - contacts 1..6, caps C1..C8, taps 2H and 1H. Caps hang NORTH of their
           runs, risers north to the tier-A buses, two windings above those,
           `coil_return` rail A along the top. x ASCENDS with contact number.
           This is the approved page's structure, unchanged.

  TIER B - contacts 7..11, caps C9..C17, taps 0R45H, 0R22H and 0R1H. The MIRROR
           of tier A: caps hang SOUTH of their runs, risers south to the tier-B
           buses, three windings below those, rail B along the bottom.
           x DESCENDS with contact number.

THE DESCENT IN TIER B IS FORCED, AND IT IS THE ONE THING ABOUT THIS PAGE THAT A
READER HAS TO LEARN. The proof is in `assert_no_crossing()` below and it is
short: a run that ends east of a column that hangs INTO its row crosses that
column. Tier A hangs north of its runs and its runs go east, so x must ascend.
Tier B hangs south of its runs and its runs still go east - the switch's eleven
throws all point one way - so x must descend. Reversing either one puts
capacitors across selector runs. The capacitor order therefore snakes: contacts
1-6 left to right along the top, contacts 11-7 left to right along the bottom,
which is contacts 7-11 read right to left.

`SW_Rotary_1x12`'s pins are what forces the rest. Read off the installed
library: throws 1-12 at symbol x = +15.24 stepping 2.54 mm from y = +15.24 down
to y = -15.24 WITH NO PIN AT y = 0, and pin 13 the pole at (-15.24, 0). The run
spacing is therefore 2.54 mm and not negotiable, the gap between contact 6 and
contact 7 is 5.08 mm, and pin 12 - the unused twelfth detent - is 2.54 mm below
contact 11.

THE PITCH IS RE-MEASURED AND NOT COPIED (`EVALUATING-DRAWINGS.md` P3).
`scripts/inkmeasure.py` on the approved page measures this board's widest value,
`3300pF`, at **6.816 mm** of rendered ink and `.047uF` at **6.223 mm** over the
same six characters. At a 6.35 mm centred field offset that leaves 0.912 mm from
a value to its own plate and `pitch - 11.788` to the next capacitor's: 3.452 mm
at 15.24, 2.182 at 13.97, 0.912 at 12.70. 15.24 mm is kept because the fold
bought enough width to keep it - the fold is what P3 asked for, not a tighter
pitch. **That this lands on the same number as the approved page is because it
is the same text**, which is a re-derivation and not a transcription.

THE CAPACITOR VALUES ON THE SHEET ARE NOT THE MODEL'S STRINGS, and this run did
not change them. `circuits/pultec/electrical/mid.ts` holds `330nF`, `3.3nF`,
`1nF`; the approved sheet holds `.33uF`, `3300pF`, `1000pF`. The sheet's are
what the reviewer approved and what the measurement above is of. Changing them
would change the drawing's content, which is not what "fit it on Letter" asks
for, and would make the pitch narrower than it needs to be for the page he has
seen.
"""
MIL = 1.0 / 0.0254


def mil(v):
    """mm -> mil, as an integer. Every coordinate here is a multiple of 1.27 mm
    (= 50 mil exactly), so a non-integral result is a typo and must fail."""
    x = v * MIL
    if abs(x - round(x)) > 1e-6:
        raise SystemExit(f"{v} mm is not a whole number of mils ({x})")
    return int(round(x))


def g(v):
    """Round to the 1.27 mm grid and refuse if it was not already on it."""
    mil(v)
    return round(v, 2)


# ---------------------------------------------------------------------------
# 1. THE FRAME, MEASURED. `scripts/framegeom.py` on this kicad-cli 10.0.5.
# ---------------------------------------------------------------------------
# USLetter landscape renders 279.400 x 215.900 mm. The inner frame line is at
# 11.980 on every side bar the south, where it is 203.877. The title block is
# a CORNER and not a band: x 159.300..267.250, y 171.831..203.750. So content
# that reaches east of 159.300 must stay north of 171.831.
FRAME = (11.980, 11.980, 267.377, 203.877)
TITLE_BLOCK = (159.300, 171.831, 267.250, 203.750)
USABLE_FULL_WIDTH = (FRAME[0], FRAME[1], FRAME[2], TITLE_BLOCK[1])

# The task statement's "roughly 265 x 185 mm" is optimistic in both directions:
# measured, it is 255.397 x 191.897 inside the frame and 255.397 x 159.851 apart
# of the title block. Verified rather than trusted, as it asked.

# ---------------------------------------------------------------------------
# 2. THE RIGID TRANSLATION of the five groups the reviewer has already seen.
# ---------------------------------------------------------------------------
# The Junction group and the four stand-ins are not re-laid: they move as one
# block, by one offset, so the only thing that changed about them is where the
# page's origin is. Their band measures 248.92 x 52.07 mm on the approved page
# (x 55.88..304.80, y 49.53..101.60) and 248.92 mm already fits the 255.397 mm
# the frame gives, so nothing inside it has to change at all.
BAND_DX = g(15.24 - 55.88)        # -40.64
BAND_DY = g(15.24 - 49.53)        # -34.29

# ---------------------------------------------------------------------------
# 3. THE MID GROUP.
# ---------------------------------------------------------------------------
PITCH = 15.24                     # re-measured; see the module docstring

MID_X1, MID_Y1 = 15.24, 72.39     # the group rectangle
MID_X2, MID_Y2 = 264.16, 168.91

IN_LABEL = (30.48, None)          # `hi_boost_out`, the section's input
# NOT 29.21, which is where this started. `hi_boost_out` is twelve
# characters and its tag draws 13.5 mm WEST of its anchor, which at 29.21
# left 0.318 mm between the tag's west ink and the group rectangle's own
# edge - measured on the render by `scripts/inkmeasure.py`, visible in no
# count on the sheet. One grid step east makes it 1.588 mm and shortens the
# input wire from 5.08 to 3.81 mm; nothing else moves.
RV1_X = 38.10                     # the level rheostat, rotation 90
SW1_X, SW1_Y = 67.31, 121.92      # the eleven-throw selector
# NOT 64.77. At 64.77 the `sel_common` label's text ended 0.323 mm west of
# SW1's own body edge - measured on the render; `akcli check --layout` called
# it an overlap, which it is not, and 0.323 mm is tight enough that the lint
# being wrong is no comfort. The selector, the bank and the return block all
# move one grid step east together; RV1 and the input label do not, so the
# rheostat-to-pole wire grows from 7.62 to 10.16 mm and nothing else changes.
THROW_X = g(SW1_X + 15.24)        # 80.01 - where every selector run starts
POLE_X = g(SW1_X - 15.24)         # 49.53
BANK_X0 = 90.17                   # the westmost capacitor of BOTH tiers
X_JOIN = 224.79                   # the vertical that joins rail A to rail B

RAIL_A_Y = g(SW1_Y - 44.45)       #  77.47  coil_return, tier A
COIL_A_Y = g(SW1_Y - 38.10)       #  83.82  L1, L2, rotation 180
TAP_A_Y = g(SW1_Y - 27.94)        #  93.98  the tier-A buses, at one y
TAP_B_Y = g(SW1_Y + 25.40)        # 147.32  the tier-B buses, at one y
COIL_B_Y = g(SW1_Y + 35.56)       # 157.48  L3, L4, L5, rotation 0
RAIL_B_Y = g(SW1_Y + 41.91)       # 163.83  coil_return, tier B

# Switch:SW_Rotary_1x12, read off the installed library - see the docstring.
CONTACT_Y = {k: g(SW1_Y - 15.24 + (k - 1) * 2.54) for k in range(1, 7)}
CONTACT_Y.update({k: g(SW1_Y + 2.54 + (k - 7) * 2.54) for k in range(7, 12)})
NC_PIN_Y = g(SW1_Y + 15.24)       # 137.16, pin 12

# (ref, contact, tap), in WEST-TO-EAST order within each tier. The contact-to-
# capacitance and contact-to-tap mapping is MID_POSITIONS in
# circuits/pultec/electrical/mid.ts, transcribed from P3bandDoc.pdf p3.
TIER_A = [
    ("C1", 1, "tap_2h"), ("C2", 2, "tap_2h"), ("C3", 3, "tap_2h"),
    ("C4", 4, "tap_2h"), ("C5", 4, "tap_2h"),
    ("C6", 5, "tap_1h"), ("C7", 5, "tap_1h"), ("C8", 6, "tap_1h"),
]
# Contacts DESCEND west to east here. See the module docstring: it is forced.
TIER_B = [
    ("C16", 11, "tap_0r1h"), ("C17", 11, "tap_0r1h"),
    ("C15", 10, "tap_0r22h"), ("C13", 9, "tap_0r22h"), ("C14", 9, "tap_0r22h"),
    ("C11", 8, "tap_0r45h"), ("C12", 8, "tap_0r45h"),
    ("C9", 7, "tap_0r45h"), ("C10", 7, "tap_0r45h"),
]
BANK = TIER_A + TIER_B
TIER_OF = {r: "A" for r, _, _ in TIER_A}
TIER_OF.update({r: "B" for r, _, _ in TIER_B})

CAP_X = {}
for _i, (_r, _c, _t) in enumerate(TIER_A):
    CAP_X[_r] = g(BANK_X0 + _i * PITCH)
for _i, (_r, _c, _t) in enumerate(TIER_B):
    CAP_X[_r] = g(BANK_X0 + _i * PITCH)

CAP_CONTACT = {r: c for r, c, _ in BANK}
CAP_TAP = {r: t for r, _, t in BANK}

# Device:C at rotation 0 has pin 1 at y-3.81 (the head, toward its tap bus) and
# pin 2 at y+3.81 (the tail, ON its own contact's run). At rotation 180 the two
# swap, which is exactly the mirror tier B needs: the run enters at the TOP and
# the bus is BELOW.
CAP_ROT = {r: (0 if TIER_OF[r] == "A" else 180) for r, _, _ in BANK}
CAP_Y = {r: g(CONTACT_Y[CAP_CONTACT[r]] + (-3.81 if TIER_OF[r] == "A" else 3.81))
         for r, _, _ in BANK}
CAP_HEAD_Y = {r: g(CAP_Y[r] + (-3.81 if TIER_OF[r] == "A" else 3.81))
              for r, _, _ in BANK}

TAP_ORDER = ["tap_2h", "tap_1h", "tap_0r45h", "tap_0r22h", "tap_0r1h"]
TAP_TIER = {"tap_2h": "A", "tap_1h": "A",
            "tap_0r45h": "B", "tap_0r22h": "B", "tap_0r1h": "B"}
TAP_Y = {t: (TAP_A_Y if TAP_TIER[t] == "A" else TAP_B_Y) for t in TAP_ORDER}
TAP_CAPS = {t: [r for r, _, tt in BANK if tt == t] for t in TAP_ORDER}
TAP_WEST = {t: min(CAP_X[r] for r in TAP_CAPS[t]) for t in TAP_ORDER}
TAP_EAST = {t: max(CAP_X[r] for r in TAP_CAPS[t]) for t in TAP_ORDER}

# One winding per tap, placed BETWEEN two risers rather than on one, so its drop
# tees into the bus's interior instead of landing on a capacitor's riser.
# Literals rather than a formula, because a computed midpoint is not always on
# the grid and is sometimes exactly on a capacitor.
COIL_X = {"tap_2h": 125.73, "tap_1h": 171.45,
          "tap_0r45h": 186.69, "tap_0r22h": 140.97, "tap_0r1h": 95.25}
COIL_Y = {t: (COIL_A_Y if TAP_TIER[t] == "A" else COIL_B_Y) for t in TAP_ORDER}
COIL_ROT = {t: (180 if TAP_TIER[t] == "A" else 0) for t in TAP_ORDER}
COIL_REF = {"tap_2h": "L1", "tap_1h": "L2", "tap_0r45h": "L3",
            "tap_0r22h": "L4", "tap_0r1h": "L5"}
# Device:L pin 1 is the TAP end and pin 2 the coil_return end (verified against
# the approved page's own wires). Rotation 180 puts pin 1 at y+3.81 and pin 2 at
# y-3.81; rotation 0 swaps them. So tier A's windings sit between a rail ABOVE
# and a bus BELOW, and tier B's between a bus above and a rail below.
COIL_TAP_PIN_Y = {t: g(COIL_Y[t] + (3.81 if COIL_ROT[t] == 180 else -3.81))
                  for t in TAP_ORDER}
COIL_RET_PIN_Y = {t: g(COIL_Y[t] + (-3.81 if COIL_ROT[t] == 180 else 3.81))
                  for t in TAP_ORDER}
RAIL_Y = {t: (RAIL_A_Y if TAP_TIER[t] == "A" else RAIL_B_Y) for t in TAP_ORDER}

RAIL_A_WEST = min(COIL_X[t] for t in TAP_ORDER if TAP_TIER[t] == "A")
RAIL_B_WEST = min(COIL_X[t] for t in TAP_ORDER if TAP_TIER[t] == "B")

# The east end of each selector run: the LAST capacitor on that contact.
RUN_END = {k: max(CAP_X[r] for r, c, _ in BANK if c == k) for k in range(1, 12)}

# --- the west chain --------------------------------------------------------
RV1_AT = (RV1_X, SW1_Y)
RV1_WEST_PIN = g(RV1_X - 3.81)
RV1_EAST_PIN = g(RV1_X + 3.81)
TIE_Y = g(SW1_Y - 6.35)
TIE_X = g(RV1_X + 6.35)
IN_LABEL_AT = (IN_LABEL[0], SW1_Y)

# --- the return block, hung off the join at the selector's own height ------
# On the approved page this block sits east of a single rail. Here the rail is
# two rails and a join, and the block hangs off the JOIN at mid height, which
# puts it in the one part of the sheet nothing else reaches and leaves `in`
# pointing right. Its internal geometry is the approved page's, translated.
SW2_AT = (g(X_JOIN + 5.08), SW1_Y)
SW2_POLE = (X_JOIN, SW1_Y)
SW2_BOOST = (g(SW2_AT[0] + 5.08), g(SW1_Y - 2.54))
SW2_CUT = (g(SW2_AT[0] + 5.08), g(SW1_Y + 2.54))
R1_AT = (g(SW2_BOOST[0] + 19.05), SW2_BOOST[1])   # rot 270: pin 2 W, pin 1 E
IN_NODE = (g(R1_AT[0] + 3.81), R1_AT[1])
R2_AT = (g(SW2_CUT[0] + 7.62), 130.81)  # rotation 0
R3_AT = (IN_NODE[0], R2_AT[1])          # rotation 0
GND_LINK_Y = g(R2_AT[1] + 3.81)
GND_SYM = (g((R2_AT[0] + R3_AT[0]) / 2), GND_LINK_Y)

# ---------------------------------------------------------------------------
# 4. Placements. (ref, x, y, rotation)
# ---------------------------------------------------------------------------
PLACE = [(COIL_REF[t], COIL_X[t], COIL_Y[t], COIL_ROT[t]) for t in TAP_ORDER] \
    + [(r, CAP_X[r], CAP_Y[r], CAP_ROT[r]) for r, _, _ in BANK] \
    + [
        ("SW1", SW1_X, SW1_Y, 0),
        ("RV1", RV1_AT[0], RV1_AT[1], 90),
        ("SW2", SW2_AT[0], SW2_AT[1], 0),
        ("R1", R1_AT[0], R1_AT[1], 270),
        ("R2", R2_AT[0], R2_AT[1], 0),
        ("R3", R3_AT[0], R3_AT[1], 0),
    ]
MOVE_POWER = [("#PWR07", GND_SYM[0], GND_SYM[1])]

# ---------------------------------------------------------------------------
# 5. Wires. (x1, y1, x2, y2, net, what)
# ---------------------------------------------------------------------------
ADD_WIRES = [
    (RAIL_A_WEST, RAIL_A_Y, X_JOIN, RAIL_A_Y, "coil_return",
     f"rail A, {X_JOIN - RAIL_A_WEST:.2f} mm: L1, L2 and the join"),
    (RAIL_B_WEST, RAIL_B_Y, X_JOIN, RAIL_B_Y, "coil_return",
     f"rail B, {X_JOIN - RAIL_B_WEST:.2f} mm: L5, L4, L3 and the join"),
    (X_JOIN, RAIL_A_Y, X_JOIN, RAIL_B_Y, "coil_return",
     f"the join, {RAIL_B_Y - RAIL_A_Y:.2f} mm: one six-pin net drawn once "
     f"across two tiers, with the mode switch's pole on it"),
]
for _t in TAP_ORDER:
    _x = COIL_X[_t]
    ADD_WIRES.append((_x, COIL_RET_PIN_Y[_t], _x, RAIL_Y[_t], "coil_return",
                      f"{COIL_REF[_t]}.2 to rail "
                      f"{'A' if TAP_TIER[_t] == 'A' else 'B'}"))
    ADD_WIRES.append((_x, COIL_TAP_PIN_Y[_t], _x, TAP_Y[_t], _t,
                      f"{COIL_REF[_t]}.1 to the {_t} bus"))
    ADD_WIRES.append((TAP_WEST[_t], TAP_Y[_t], TAP_EAST[_t], TAP_Y[_t], _t,
                      f"{_t} bus, {TAP_EAST[_t] - TAP_WEST[_t]:.2f} mm"))
for _r, _c, _t in BANK:
    ADD_WIRES.append((CAP_X[_r], CAP_HEAD_Y[_r], CAP_X[_r], TAP_Y[_t], _t,
                      f"{_r}.1 riser to {_t}, "
                      f"{abs(CAP_HEAD_Y[_r] - TAP_Y[_t]):.2f} mm"))
for _k in range(1, 12):
    ADD_WIRES.append((THROW_X, CONTACT_Y[_k], RUN_END[_k], CONTACT_Y[_k],
                      f"sel{_k}",
                      f"sel{_k} run, {RUN_END[_k] - THROW_X:.2f} mm, "
                      f"a single straight horizontal with no corner"))
ADD_WIRES += [
    (IN_LABEL_AT[0], SW1_Y, RV1_WEST_PIN, SW1_Y, "hi_boost_out",
     f"the input label to RV1.1 (ccw), {RV1_WEST_PIN - IN_LABEL_AT[0]:.2f} mm"),
    (RV1_EAST_PIN, SW1_Y, POLE_X, SW1_Y, "sel_common",
     f"RV1.3 (cw) east to the selector pole, {POLE_X - RV1_EAST_PIN:.2f} mm"),
    (RV1_X, g(SW1_Y - 3.81), RV1_X, TIE_Y, "sel_common",
     "RV1.2 (wiper) up 2.54 mm"),
    (RV1_X, TIE_Y, TIE_X, TIE_Y, "sel_common",
     "the rheostat tie, east 6.35 mm over the body"),
    (TIE_X, TIE_Y, TIE_X, SW1_Y, "sel_common",
     "the rheostat tie, down onto the pole wire"),
    (SW2_BOOST[0], SW2_BOOST[1], g(R1_AT[0] - 3.81), R1_AT[1], "boost_return",
     f"SW2.1 (boost) east to R1.2, {R1_AT[0] - 3.81 - SW2_BOOST[0]:.2f} mm"),
    (SW2_CUT[0], SW2_CUT[1], R2_AT[0], SW2_CUT[1], "cut_return",
     f"SW2.3 (cut) east {R2_AT[0] - SW2_CUT[0]:.2f} mm"),
    (R2_AT[0], SW2_CUT[1], R2_AT[0], g(R2_AT[1] - 3.81), "cut_return",
     "down to R2.1"),
    (IN_NODE[0], IN_NODE[1], R3_AT[0], g(R3_AT[1] - 3.81), "in",
     f"the `in` node down to R3.1, {R3_AT[1] - 3.81 - IN_NODE[1]:.2f} mm"),
    (R2_AT[0], GND_LINK_Y, R3_AT[0], GND_LINK_Y, "GND",
     f"R2.2 to R3.2: one ground symbol for the two return legs, "
     f"{R3_AT[0] - R2_AT[0]:.2f} mm"),
]

# ---------------------------------------------------------------------------
# 6. Junction dots.
# ---------------------------------------------------------------------------
ADD_JUNCTIONS = []
for _t in TAP_ORDER:
    _rw = RAIL_A_WEST if TAP_TIER[_t] == "A" else RAIL_B_WEST
    if _rw < COIL_X[_t] < X_JOIN:
        ADD_JUNCTIONS.append((COIL_X[_t], RAIL_Y[_t],
                              f"rail {TAP_TIER[_t]} through {COIL_REF[_t]}.2"))
ADD_JUNCTIONS.append((SW2_POLE[0], SW2_POLE[1],
                      "the mode switch's pole on the join's interior"))
for _t in TAP_ORDER:
    _pts = sorted({CAP_X[r] for r in TAP_CAPS[_t]} | {COIL_X[_t]})
    for _x in _pts:
        if TAP_WEST[_t] < _x < TAP_EAST[_t]:
            _who = COIL_REF[_t] if _x == COIL_X[_t] else \
                next(r for r in TAP_CAPS[_t] if CAP_X[r] == _x)
            ADD_JUNCTIONS.append((_x, TAP_Y[_t], f"{_t} bus through {_who}"))
for _k in range(1, 12):
    for _r in [r for r, c, _ in BANK if c == _k]:
        if CAP_X[_r] < RUN_END[_k]:
            ADD_JUNCTIONS.append((CAP_X[_r], CONTACT_Y[_k],
                                  f"sel{_k} run through {_r}.2"))
ADD_JUNCTIONS += [
    (GND_SYM[0], GND_SYM[1], "the shared ground symbol on the return legs' link"),
    (TIE_X, SW1_Y, "the rheostat tie onto the pole wire"),
]

# ---------------------------------------------------------------------------
# 7. Labels. ONE PER NET PER GROUP.
# ---------------------------------------------------------------------------
# `justify` is the half of a local label the approved page did not have to think
# about, and this page does. A local label is written `justify left bottom`,
# which puts its TEXT ABOVE the wire, 0.339 mm away from it (measured, 600 dpi).
# In tier A the only other thing in those rows is the run 2.54 mm above, so each
# label is anchored east of where that run ends - the approved page's own rule.
#
# IN TIER B THAT RULE HAS NO SOLUTION: the run above extends FURTHER east than
# the run the label is on, so no anchor on a tier-B run is away from it.
#
# **`justify left top` WAS TRIED AS THE MIRROR AND THE RENDER REFUTED IT.**
# It does not put the text below the wire; it puts the text's top 0.46 mm ABOVE
# the anchor, so the wire is drawn through the top of the glyphs - six rows of
# wire ink inside the text's own rows for sel7..sel10 and twenty-two for sel11,
# measured by `scripts/labelclear.py`. Nothing on the sheet sees it and
# `akcli check --layout` does not report it. A local label's text is above its
# wire whatever you ask for, so all eleven are `bottom` and the four in tier B
# that cannot escape the run above are left 0.677 mm away from it, measured and
# reported rather than designed away.
GLOBAL, LOCAL = "global", "local"
# There is only one usable value, and naming it for what it DOES rather than for
# what was wanted is deliberate: a constant called BELOW whose value is "bottom"
# is the next reader's wasted hour.
TEXT_ABOVE = "bottom"

ADD_LABELS = [
    ("hi_boost_out", IN_LABEL_AT[0], SW1_Y, GLOBAL, 180, TEXT_ABOVE,
     "the section's input, west of RV1.1, pointing into the wire"),
    ("sel_common", RV1_X, TIE_Y, LOCAL, 0, TEXT_ABOVE,
     "the rheostat's output node, on the tie's horizontal"),
    ("coil_return", RAIL_A_WEST, RAIL_A_Y, LOCAL, 0, TEXT_ABOVE,
     "rail A's west end - the one label this six-pin net carries"),
    ("in", IN_NODE[0], IN_NODE[1], GLOBAL, 0, TEXT_ABOVE,
     "the boost leg's return to the input node, pointing right"),
    ("boost_return", SW2_BOOST[0], SW2_BOOST[1], LOCAL, 0, TEXT_ABOVE, "SW2.1 to R1"),
    ("cut_return", SW2_CUT[0], SW2_CUT[1], LOCAL, 0, TEXT_ABOVE, "SW2.3 to R2"),
]
# The five tap buses, each named on its own winding's drop or riser - the one
# place in each tier with nothing else in it.
for _t in TAP_ORDER:
    if TAP_TIER[_t] == "A":
        _y = g(TAP_A_Y - 2.54)
    else:
        _y = g(TAP_B_Y + 3.81)
    ADD_LABELS.append((_t, COIL_X[_t], _y, LOCAL, 0, TEXT_ABOVE,
                       f"the {_t} bus, on {COIL_REF[_t]}'s "
                       f"{'drop' if TAP_TIER[_t] == 'A' else 'riser'}"))
# Eleven contact labels, all with their text ABOVE their own run - see the note
# on justify above. Tier A anchors each east of where the run ABOVE it ends,
# which is the approved page's rule and leaves nothing else in the label's rows.
# Tier B cannot satisfy that rule at all, so it anchors each east of where the
# run BELOW it ends instead: that keeps the four from piling up in one column
# and makes the cascade mirror the tier, and it leaves the run 2.54 mm above
# each of them, measured at 0.677 mm from the text. sel1 and sel11 are the
# two ends of the ladder and have no neighbour of their own to apart.
SEL_LABEL = {}
for _k in range(1, 12):
    if _k == 1:
        _ax = g(THROW_X + 2.54)
        _just = TEXT_ABOVE
    elif _k == 11:
        # NOT `THROW_X + 2.54`, which is where this started. At that anchor the
        # east end of `sel11` grazed the junction dot at C16's tail by 0.03 mm
        # in y and 0.2 mm in x - one pixel row at 600 dpi, found by
        # `scripts/labelclear.py` and by nothing else. One pitch step further
        # east clears the dot and still sits on run 11.
        _ax = g(THROW_X + 2.54 + PITCH - 7.62)
        _just = TEXT_ABOVE
    elif _k <= 6:
        _ax = g(RUN_END[_k - 1] + 2.54)
        _just = TEXT_ABOVE
    else:
        _ax = g(RUN_END[_k + 1] + 2.54)
        _just = TEXT_ABOVE
    SEL_LABEL[_k] = (_ax, _just)
    ADD_LABELS.append((f"sel{_k}", _ax, CONTACT_Y[_k], LOCAL, 0, _just,
                       f"contact {_k}"))

ADD_NO_CONNECT = [("SW1.12", "the unused twelfth detent of a 1x12 rotary wired "
                             "for eleven positions; ComponentOverride.ncPins "
                             "declares it")]

# ---------------------------------------------------------------------------
# 8. The proofs. Each one refuses rather than warns.
# ---------------------------------------------------------------------------


def assert_on_grid():
    for r, x in CAP_X.items():
        mil(x), mil(CAP_Y[r])
    for t in TAP_ORDER:
        mil(COIL_X[t]), mil(COIL_Y[t]), mil(TAP_Y[t])
    for x1, y1, x2, y2, _n, _w in ADD_WIRES:
        mil(x1), mil(y1), mil(x2), mil(y2)
    for x, y, _w in ADD_JUNCTIONS:
        mil(x), mil(y)
    for _n, x, y, _s, _r, _j, _w in ADD_LABELS:
        mil(x), mil(y)


def assert_axis_aligned():
    for x1, y1, x2, y2, net, what in ADD_WIRES:
        if x1 != x2 and y1 != y2:
            raise SystemExit(f"[{net}] {what}: not axis-aligned")


def assert_buses_disjoint():
    """The five tap groups must be contiguous in contact order within a tier, so
    the buses of a tier do not overlap in x and can sit at ONE y."""
    for tier in ("A", "B"):
        taps = [t for t in TAP_ORDER if TAP_TIER[t] == tier]
        spans = sorted((TAP_WEST[t], TAP_EAST[t], t) for t in taps)
        for (a1, a2, ta), (b1, b2, tb) in zip(spans, spans[1:]):
            if a2 >= b1:
                raise SystemExit(f"tier {tier}: {ta} bus {a1}..{a2} overlaps "
                                 f"{tb} bus {b1}..{b2} at one y")
    for t in TAP_ORDER:
        if not TAP_WEST[t] < COIL_X[t] < TAP_EAST[t]:
            raise SystemExit(f"{t}: {COIL_REF[t]}'s drop at {COIL_X[t]} is not "
                             f"inside its bus {TAP_WEST[t]}..{TAP_EAST[t]}")
        if COIL_X[t] in {CAP_X[r] for r in TAP_CAPS[t]}:
            raise SystemExit(f"{t}: {COIL_REF[t]}'s drop lands on a capacitor "
                             f"riser at x={COIL_X[t]} rather than between two")


def assert_monotone():
    """Tier A's x ascends with contact number; tier B's descends."""
    a = [CAP_CONTACT[r] for r, _, _ in TIER_A]
    b = [CAP_CONTACT[r] for r, _, _ in TIER_B]
    if a != sorted(a):
        raise SystemExit(f"tier A contacts are not ascending west to east: {a}")
    if b != sorted(b, reverse=True):
        raise SystemExit(f"tier B contacts are not descending west to east: {b}")


def assert_no_crossing():
    """No selector run crosses any capacitor column or any riser.

    A column is the capacitor's body plus its riser: in tier A it runs from the
    cap's tail pin (on its own run) NORTH to the tap bus; in tier B SOUTH. A run
    crosses a column when it passes the column's x AND its y lies strictly
    inside the column's y span. Run k reaches x only when x <= RUN_END[k], so
    this is a finite pairwise check over 11 runs and 17 columns and it is run
    rather than argued.
    """
    offenders = []
    for k in range(1, 12):
        ry = CONTACT_Y[k]
        for r, c, t in BANK:
            if c == k:
                continue
            x = CAP_X[r]
            if x > RUN_END[k]:
                continue                      # the run ends west of the column
            lo, hi = sorted((CONTACT_Y[c], TAP_Y[t]))
            if lo < ry < hi:
                offenders.append(f"sel{k} at y={ry} crosses {r}'s column "
                           f"(x={x}, y {lo}..{hi})")
    if offenders:
        raise SystemExit("CROSSINGS:\n  " + "\n  ".join(offenders))


def assert_runs_clear_the_buses():
    """No selector run passes through a tap bus, which is the other way a fan
    like this goes wrong. A bus sits at one y per tier; a run at a contact's y."""
    for k in range(1, 12):
        ry = CONTACT_Y[k]
        for t in TAP_ORDER:
            if TAP_Y[t] != ry:
                continue
            if TAP_WEST[t] <= RUN_END[k] and THROW_X <= TAP_EAST[t]:
                raise SystemExit(f"sel{k} runs along the {t} bus at y={ry}")


def assert_text_clear_of_runs():
    """A capacitor's Reference and Value sit 6.35 mm EAST of it, on the rows of
    two neighbouring contacts' runs. They miss those runs only because each ends
    west of the capacitor - which is true in tier A because x ascends with
    contact and in tier B because it descends. Checked, not assumed."""
    offenders = []
    for r, c, _t in BANK:
        fx = g(CAP_X[r] + 6.35)
        for fy in (g(CAP_Y[r] - 1.27), g(CAP_Y[r] + 1.27)):
            for k in range(1, 12):
                if CONTACT_Y[k] != fy:
                    continue
                if RUN_END[k] >= fx - 3.408:      # measured half text width
                    offenders.append(f"{r}'s field at ({fx},{fy}) is on sel{k}, "
                               f"which reaches x={RUN_END[k]}")
    if offenders:
        raise SystemExit("FIELD/RUN COLLISIONS:\n  " + "\n  ".join(offenders))


def assert_inside_frame():
    """Every coordinate this module places is inside the Letter frame and apart
    of the title block. This is NOT the headline fit check - that is
    `extent.py` on the rendered sheet, which also sees the band and the group
    rectangles - but a wire placed outside the frame should fail here."""
    fx1, fy1, fx2, fy2 = FRAME
    tx1, ty1, _tx2, _ty2 = TITLE_BLOCK
    pts = []
    for x1, y1, x2, y2, net, _w in ADD_WIRES:
        pts += [(x1, y1, net), (x2, y2, net)]
    for x, y, w in ADD_JUNCTIONS:
        pts.append((x, y, w))
    for n, x, y, _s, _r, _j, _w in ADD_LABELS:
        pts.append((x, y, n))
    for ref, x, y, _r in PLACE:
        pts.append((x, y, ref))
    pts += [(MID_X1, MID_Y1, "rect"), (MID_X2, MID_Y2, "rect")]
    for x, y, who in pts:
        if not (fx1 <= x <= fx2 and fy1 <= y <= fy2):
            raise SystemExit(f"{who} at ({x},{y}) is outside the frame {FRAME}")
        if x > tx1 and y > ty1:
            raise SystemExit(f"{who} at ({x},{y}) is inside the title block")


def check():
    assert_on_grid()
    assert_axis_aligned()
    assert_monotone()
    assert_buses_disjoint()
    assert_no_crossing()
    assert_runs_clear_the_buses()
    assert_text_clear_of_runs()
    assert_inside_frame()


if __name__ == "__main__":
    check()
    print("arrangement: every proof passes")
    print(f"  tier A  contacts 1-6   caps {[r for r, _, _ in TIER_A]}")
    print(f"  tier B  contacts 11-7  caps {[r for r, _, _ in TIER_B]}")
    print(f"  bank x {BANK_X0} .. {max(CAP_X.values())}  pitch {PITCH}")
    print(f"  rail A {RAIL_A_WEST}..{X_JOIN} at y {RAIL_A_Y}; "
          f"rail B {RAIL_B_WEST}..{X_JOIN} at y {RAIL_B_Y}; "
          f"join {RAIL_B_Y - RAIL_A_Y:.2f} mm")
    print(f"  {len(PLACE)} placements, {len(ADD_WIRES)} wires, "
          f"{len(ADD_JUNCTIONS)} junctions, {len(ADD_LABELS)} labels")
    tot = sum(abs(w[2] - w[0]) + abs(w[3] - w[1]) for w in ADD_WIRES)
    print(f"  wire length placed here: {tot:.2f} mm; "
          f"longest {max(abs(w[2] - w[0]) + abs(w[3] - w[1]) for w in ADD_WIRES):.2f} mm")
    runs = [RUN_END[k] - THROW_X for k in range(1, 12)]
    print(f"  eleven selector runs: {', '.join('%.2f' % r for r in runs)} mm "
          f"= {sum(runs):.2f} mm total")
