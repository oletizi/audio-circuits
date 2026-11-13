"""The h7-pedal modsw page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/modsw.ts`): Q1 (Q_MSW, AOD4185 P-MOSFET) from VIN_MSW (its
source) to VIN_MOD (its drain); its gate network R8 (R_MSWT, source to gate) and R9 (R_MSWB, gate to
Q2's drain), Q2 (Q_MSWD, AO3400A, gate on PF_ON, source on GND); the soft start C12 (C_SS, drain to
node X), D4 (D_SS, X to gate) and R10 (R_SSR, source to X); the plug-in gate hold C13 (C_GS, source
to GH), D5 (D_GS, GH to gate) and R11 (R_GSB, across C13); the discharge R12 (R_VDIS, VIN_MOD to
VDIS_D) and Q3 (Q_VDIS, AO3400A, gate on PF_TRIP, source on GND); TP4 on VIN_MOD.

The page reads west to east along the power path: VIN_MSW's label at the west, one row east to Q1,
which lies in the row with its source west, its drain east and its gate pointing down (rotation 270,
mirrored top to bottom), then VIN_MOD east to its label. Under the row, west of Q1: R10 hangs from
VIN_MSW to the X row; C13 and R11 hang from VIN_MSW to the GH run, which ends in D5's anode; D5's
cathode starts the gate row, which takes R8 (hanging from VIN_MSW), D4 (rising from the X row) and
R9, and rises into Q1's gate. The X row runs under Q1 from R10 east to C12, which hangs from VIN_MOD
east of Q1. R9 drops from the gate row to Q2's drain, crossing the X row: X joins a part on Q1's
source side (R10) to one on its drain side (C12) under Q1, which closes a loop around the gate
network, so the gate network's way to Q2 and GND crosses it once. Q2 stands under R9, its gate west
to PF_ON's label, its source down to the GND row. East of C12 on the VIN_MOD row: TP4, then R12
hanging to Q3's drain; Q3's gate west to PF_TRIP's label, its source down to the GND row, whose
label is at its west end under PF_ON's.

Symbol geometry (read from the draft's lib_symbols), at rotation 0: Transistor_FET:Q_PMOS_GDS G (1)
200 mil west, D (2) 100 east and 200 north, S (3) 100 east and 200 south; Transistor_FET:AO3400A G
(1) 200 mil west, S (2) 100 east and 200 south, D (3) 100 east and 200 north; Device:R and Device:C
pin 1 150 mil north, pin 2 150 mil south; Device:D pin 1 (K) 150 mil west, pin 2 (A) 150 mil east
(at 180, K east; at 270, K north); Connector:TestPoint its one pin at the origin, the body north.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, east, fields, west  # noqa: E402

Y_POWER = 2400     # VIN_MSW, Q1's source and drain, VIN_MOD
Y_GATE = 2900      # the GH run (west of D5) and the gate row (east of it)
Y_X = 3300         # node X, from R10 under Q1 to C12
Y_PFON = 4100      # Q2's gate west to PF_ON's label
Y_PFTRIP = 3600    # Q3's gate west to PF_TRIP's label
Y_GND = 4400       # the GND row
X_WEST = 1500      # VIN_MSW's label
X_PFON = 3700      # PF_ON's and GND's labels
X_PFTRIP = 5700    # PF_TRIP's label
X_EAST = 6800      # VIN_MOD's label

# ref: (x, y, rotation, mirror)
PARTS = {
    "R10": (1900, 2850, 0, "none"),
    "C13": (2300, 2650, 0, "none"),
    "R11": (2700, 2650, 0, "none"),
    "D5": (3150, Y_GATE, 180, "none"),
    "R8": (3600, 2650, 0, "none"),
    "D4": (4000, 3100, 270, "none"),
    "R9": (4400, 3600, 0, "none"),
    "Q2": (4300, Y_PFON, 0, "none"),
    "Q1": (4900, 2500, 270, "x"),
    "C12": (5500, 2850, 0, "none"),
    "TP4": (5900, Y_POWER, 0, "none"),
    "R12": (6300, 2850, 0, "none"),
    "Q3": (6200, Y_PFTRIP, 0, "none"),
}

# Offsets in mm. The hanging parts' fields east of the body; D4's west of it (east is R9's drop);
# D5's centred above it; Q1's above the power row (the first render, at 7.62 and 5.08 mm, showed
# Q1's Value touching its body); Q2's and Q3's east of the body; TP4's east of its circle above the
# row.
FIELDS = {
    "R10": east(1.778),
    "C13": east(2.794),
    "R11": east(1.778),
    "D5": above(5.08, 2.54),
    "R8": east(1.778),
    "D4": west(2.54),
    "R9": east(1.778),
    "Q2": east(5.08),
    "Q1": above(10.16, 7.62),
    "C12": east(2.794),
    "TP4": fields((1.27, -3.81, "left"), (1.27, -1.27, "left")),
    "R12": east(1.778),
    "Q3": east(5.08),
}
RECT = (27.94, 45.72, 191.77, 116.84)
TITLE = "h7-pedal: modsw"
PWR_FLAGS = 0
# PF_ON and PF_TRIP each reach one pin on this page (Q2's and Q3's gates), so copperhead drafted no
# wire for either and the draft gives them no stroke. By copperhead's own family rule
# (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: two or more nets sharing the
# prefix before the first underscore) they are a family, PF, beside the two the draft colours: MSW
# (MSW_G, MSW_GH, MSW_X) in the palette's first colour and VIN (VIN_MOD, VIN_MSW) in its second. Had
# copperhead drafted them, PF would sort between the two and take the second colour, moving VIN to
# the third; the draft's colours are kept, so PF takes the palette's third colour (0 130 120), the
# next one no family on this page uses. A drawing choice, not a transcription.
UNDRAWN_STROKES = {
    "PF_ON": "(stroke (width 0.254) (type default) (color 0 130 120 1))",
    "PF_TRIP": "(stroke (width 0.254) (type default) (color 0 130 120 1))",
}
