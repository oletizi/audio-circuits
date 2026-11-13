"""The h7-pedal prail page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/prail.ts`): U3 (U_PRAIL, TPS62933F) makes 3V3_P from VIN_MOD.
C14, C15 (C_PIN1/2, 10 uF) and C16 (C_PINHF) on VIN_MOD; EN (PRAIL_EN) follows PF_ON through R16
(R_PEN), with R17 (R_PENPD) and C23, C24 (C_PEN) to GND, and Q4 (Q_PEN, 2N7002, gate PF_TRIP, source
GND) pulling it down through R18 (R_PENS) from its drain (PEN_D); C21 (C_SS) on SS; RT a no-connect;
R15 (R_BST) and C22 (C_BST) from BST to SW; L1 from SW to 3V3_P; R13 (R_FB_TOP) and R14
(R_FB_BOTTOM) the feedback divider; C17-C19 (C_POUT1-3) and C20 (C_POUT_HF) on 3V3_P.

The page reads west to east between a VIN_MOD row on top and a GND row at the bottom, both from
their hierarchical labels at the west edge. C14-C16 stand across the two rows next to the labels:
any place nearer U3's VIN is crossed by the EN row, which runs west to east between the rows from
PF_ON's label, through R16, into U3's EN. On the EN row hang, west to east, R18 (from Q4's drain
below it; Q4's gate takes PF_TRIP from its label at the west), R17, C23 and C24. C21 hangs from SS.
VIN_MOD's row drops to VIN just west of U3. East of U3: BST through R15 to C22's top, C22's bottom
on the SW row, which runs on through L1 onto the 3V3_P row; R13 drops from that row to the FB row,
which runs west under L1 and C22 to U3's FB, and R14 on to GND; C17-C20 hang from 3V3_P to GND,
and 3V3_P's label is at the east edge.

Symbol geometry (read from the draft's lib_symbols), at rotation 0: Device:R, Device:C, Device:L
pin 1 150 mil north, pin 2 150 mil south (at 90, pin 1 west and pin 2 east; at 180, pin 1 south);
Regulator_Switching:TPS62933F VIN (3), EN (2), SS (7), RT (1) 300 mil west at 300 and 200 north and
100 and 200 south, BST (6), SW (5), FB (8) 300 east at 300 north, 0 and 300 south, GND (4) 500
south; Transistor_FET:2N7002 G (1) 200 west, D (3) 100 east 200 north, S (2) 100 east 200 south.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, east, fields, west  # noqa: E402

Y_VIN = 2600       # the VIN_MOD row
Y_EN = 3100        # PF_ON through R16 into U3's EN (pin 2)
Y_TRIP = 3850      # PF_TRIP into Q4's gate
Y_GND = 4400       # the GND row
X_WEST = 1300      # the VIN_MOD and GND labels
X_PF = 3050        # the PF_ON and PF_TRIP labels
X_VDROP = 5950     # VIN_MOD's drop to U3's VIN
X_EAST = 10050      # the 3V3_P label

# ref: (x, y, rotation, mirror)
PARTS = {
    "C14": (1650, 3500, 0, "none"),
    "C15": (2050, 3500, 0, "none"),
    "C16": (2450, 3500, 0, "none"),
    "R16": (3400, Y_EN, 90, "none"),
    "R18": (3850, 3400, 180, "none"),
    "Q4": (3750, Y_TRIP, 0, "none"),
    "R17": (4200, 3500, 0, "none"),
    "C23": (4550, 3500, 0, "none"),
    "C24": (5050, 3500, 0, "none"),
    "C21": (5800, 3550, 0, "none"),
    "U3": (6400, 3300, 0, "none"),
    "R15": (7000, 3000, 90, "none"),
    "C22": (7350, 3150, 0, "none"),
    "L1": (7750, 3300, 90, "none"),
    "R13": (8200, 3450, 0, "none"),
    "R14": (8200, 4000, 0, "none"),
    "C17": (8550, 3700, 0, "none"),
    "C18": (8950, 3700, 0, "none"),
    "C19": (9350, 3700, 0, "none"),
    "C20": (9750, 3700, 0, "none"),
}

# Offsets in mm. The hanging parts' fields east of the body, except: C21's west of it (east is U3's
# RT no-connect); R18's west of it, between the PF_ON and PF_TRIP rows; C22's west of it (east is
# L1's); R13's and R14's west (east is C17); R16's, R15's and L1's centred above the row; U3's
# centred above its body; Q4's west of its source, under the PF_TRIP run.
# How the renders moved them: the first, with C24 at 4950 and C21 at 5650, showed C23's Value
# touching C24's plate, so C24, C21, U3 and everything east of it moved 100 to 150 mil east; with
# L1's fields below the row, L1's Value ran into R13's Reference; R18's Value against R17's body,
# then (R17 50 mil east) R17's Reference against C23's plate, so R18's fields went west and R17 back.
FIELDS = {
    "C14": east(2.794),
    "C15": east(2.794),
    "C16": east(2.794),
    "R16": above(5.08, 2.54),
    "R18": west(1.778),
    "Q4": fields((-1.27, 3.81, "right"), (-1.27, 6.35, "right")),
    "R17": east(1.778),
    "C23": east(2.794),
    "C24": east(2.794),
    "C21": west(2.794),
    "U3": fields((0, -13.97, None), (0, -11.43, None)),
    "R15": above(5.08, 2.54),
    "C22": west(2.794),
    "L1": above(5.08, 2.54),
    "R13": west(1.778),
    "R14": west(1.778),
    "C17": east(2.794),
    "C18": east(2.794),
    "C19": east(2.794),
    "C20": east(2.794),
}
RECT = (21.59, 55.88, 264.16, 116.84)
TITLE = "h7-pedal: prail"
PWR_FLAGS = 0
# PF_ON and PF_TRIP each reach one pin on this page (R16's pin 1 and Q4's gate), so copperhead
# drafted no wire for either and the draft gives them no stroke. They take the stroke the modsw page
# gives them, copperhead palette colour 3 (0 130 120), so the PF family is one colour on both pages
# that draw it; no family on this page uses that colour (the draft's PRAIL family takes colour 1).
# A drawing choice, not a transcription.
UNDRAWN_STROKES = {
    "PF_ON": "(stroke (width 0.254) (type default) (color 0 130 120 1))",
    "PF_TRIP": "(stroke (width 0.254) (type default) (color 0 130 120 1))",
}
