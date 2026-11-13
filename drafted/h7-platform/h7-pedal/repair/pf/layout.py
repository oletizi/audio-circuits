"""The h7-pedal pf page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/pf.ts`): U1 (U_PF, TPS3808G01) senses VIN through R2 (R_PFT1),
R3 (R_PFT2) and R4 (R_PFB), with D3 (D_PFCL) clamping the node between R2 and R3 and C8 (C_PFS) on
SENSE; C10 (C_PFCT) on CT; C9 (C_PF) its 5V_A decoupling; R5 (R_PFPU) pulls PF_OK to 5V_A. U2
(U_PFINV, SN74LVC2G14): gate 1 makes PF_TRIP from PF_OK, gate 2 makes PF_ON from PF_TRIP; C11
(C_PFINV) its decoupling; R6 (R_PFTPD) and R7 (R_PFONPD) hold PF_TRIP and PF_ON low.

The page reads west to east between a 5V_A row on top and a GND row at the bottom, both from their
hierarchical labels at the west edge. C9 and C11, the two 5V_A decoupling capacitors, stand across
the two rows next to their labels: any place nearer their ICs is crossed by the signal path, which
runs west to east between the rows from VIN to the two outputs. Then VIN's label, R2, the clamp
node with D3 hanging to GND, R3, and the SENSE node with R4 and C8 hanging to GND, on one row into
U1's SENSE. U1's MR takes 5V_A by a riser from its west stub to the 5V_A row; MR sits between SENSE
and CT on the symbol, so that riser crosses the SENSE row (one crossing, from the pin order). CT's
stub drops to C10. U1's RESET runs east on the PF_OK row, R5 hanging from 5V_A onto it, into U2's
1A. PF_TRIP leaves 1Y east to its label at the east edge; from a node east of U2 it also runs down,
west under U2 and up into 2A, R6 hanging from that bottom run to GND. Gate 1's output feeding gate 2's
input on one symbol puts 1Y and 2A on opposite sides, so that run crosses U2's GND drop and PF_ON's
row (two crossings, from the pin order). PF_ON leaves 2Y east to its label, R7 hanging to GND.

Symbol geometry (read from the draft's lib_symbols), at rotation 0: Device:R and Device:C pin 1
150 mil north, pin 2 150 mil south (at 90, pin 1 west and pin 2 east); Device:D pin 1 (K) 150 mil
west, pin 2 (A) 150 mil east (at 270, K north); h7-platform:TPS3808G01DBV SENSE (5), MR (3) and CT
(4) 400 mil west at 100 north, 0 and 100 south, RESET (1) 400 east, VDD (6) 300 north, GND (2) 300
south; 74xGxx:SN74LVC2G14DBV 1A (1) and 2A (3) 400 west at 100 north and south, 1Y (6) and 2Y (4)
400 east likewise, VCC (5) 400 north, GND (2) 400 south.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, east, fields, west  # noqa: E402

Y_5V = 2100        # the 5V_A row
Y_SENSE = 2700     # VIN, the clamp node and SENSE, into U1's SENSE (pin 5)
Y_PFOK = 2800      # U1's RESET into U2's 1A
Y_PFON = 3000      # U2's 2Y (and 2A, west of U2) east to PF_ON's label
Y_LOOP = 3350      # PF_TRIP's run under U2, from the east node to 2A
Y_GND = 3700       # the GND row
X_WEST = 1500      # the 5V_A and GND labels
X_VIN = 2700       # VIN's label
X_CLAMP = 3450     # PF_CLAMP: D3's column
X_MR = 5100        # MR's riser to the 5V_A row
X_LOOP_W = 7300    # PF_TRIP's run rises here into 2A
X_LOOP_E = 8600    # the PF_TRIP node east of U2
X_EAST = 9400      # the PF_TRIP and PF_ON labels

# ref: (x, y, rotation, mirror)
PARTS = {
    "C9": (1800, 2900, 0, "none"),
    "C11": (2250, 2900, 0, "none"),
    "R2": (3100, Y_SENSE, 90, "none"),
    "D3": (X_CLAMP, 3100, 270, "none"),
    "R3": (3800, Y_SENSE, 90, "none"),
    "R4": (4200, 3100, 0, "none"),
    "C8": (4600, 3100, 0, "none"),
    "C10": (5450, 3250, 0, "none"),
    "U1": (6100, Y_PFOK, 0, "none"),
    "R5": (6750, 2450, 180, "none"),
    "R6": (7600, 3500, 0, "none"),
    "U2": (7900, 2900, 0, "none"),
    "R7": (9000, 3350, 0, "none"),
}

# Offsets in mm. The hanging parts' fields east of the body; D3's west of it (east is R4's); R2's
# and R3's centred above the row; U1's under its body, east of its GND drop (above it is R5); U2's
# above its body, east of its VCC drop; R6's west of it, under the PF_TRIP run (east is U2's GND).
FIELDS = {
    "C9": east(2.794),
    "C11": east(2.794),
    "R2": above(5.08, 2.54),
    "D3": west(2.54),
    "R3": above(5.08, 2.54),
    "R4": east(1.778),
    "C8": east(2.794),
    "C10": east(2.794),
    "U1": fields((1.27, 7.62, "left"), (1.27, 10.16, "left")),
    "R5": east(1.778),
    "R6": west(1.778),
    "U2": fields((1.27, -11.43, "left"), (1.27, -8.89, "left")),
    "R7": east(1.778),
}
RECT = (27.94, 45.72, 251.46, 99.06)
TITLE = "h7-pedal: pf"
PWR_FLAGS = 0
# VIN reaches one pin on this page (R2's pin 1), so copperhead drafted no wire for it and the draft
# gives it no stroke. Its name has no underscore, so copperhead's family rule
# (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: two or more nets sharing the
# prefix before the first underscore) gives it no colour; it takes the default stroke, the one the
# entry page's VIN carries. A drawing choice, not a transcription.
UNDRAWN_STROKES = {"VIN": "(stroke (width 0.254) (type default))"}
