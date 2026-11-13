"""The h7-pedal entry page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/entry.ts`): the DC jack J3 (J_DC), FB1 (FB_IN) from VIN to
VIN_FB, D1 (D_AIN) from VIN_FB to VIN_A, D2 (D_MIN) from VIN_FB to VIN_MSW, the reservoir on VIN_A
(C3 to C6, C_BULK to C_BULK4; C7, C_PROT; C2, C_PROTHF), C1 (C_SCH) and R1 (R_VBLD) on VIN, and the
pads TP1 (VIN), TP2 (VIN_A) and TP3 (GND).

The page reads west to east along the power path. J3 stands at the west, mirrored top to bottom so
its sleeve (pin 2, VIN) is its upper pin and its centre pin (pin 1, GND) the lower: VIN runs east
on one row, GND on a row under it. On the VIN row: VIN's hierarchical label on a stub rising from
the row, TP1 above the row, C1 and R1 hanging to GND, then FB1 in series. At VIN_FB the path
splits: D1 continues east on the same row into VIN_A, whose capacitors hang to GND and whose label
ends the row at the east with TP2 above it; D2 takes a row above, from a riser at VIN_FB, to
VIN_MSW's label. TP3 hangs under the GND row, whose label is at its west end. Both diodes are
turned 180 so each anode (pin 2) is west and each cathode (pin 1) east.

Symbol geometry (KiCad 10.0.5's libraries, read from the draft's lib_symbols), at rotation 0:
Device:C, C_Polarized, R and FerriteBead pin 1 150 mil north, pin 2 150 mil south (at 90, pin 1
west and pin 2 east); Diode:PMEG4030ER pin 1 (K) 150 mil west, pin 2 (A) 150 mil east;
Connector:TestPoint its one pin at the origin, the body north of it (at 180, south);
Connector:Barrel_Jack pin 1 at (+300, -100) and pin 2 at (+300, +100), which mirror x swaps.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, below, east, fields  # noqa: E402

Y_VIN = 3000          # the VIN, VIN_FB and VIN_A row
Y_MSW = 2600          # D2's row, VIN_FB to VIN_MSW
Y_GND = 3600          # the GND row
Y_HANG = 3300         # the centre of every part hanging from the VIN row to GND
X_JACK_DROP = 1900    # J3.1's wire turns down to the GND row here
X_GND_WEST = 1500     # the GND row's west end, where its label sits
X_VIN_LABEL = 2000    # VIN's label stub rises from the VIN row here
Y_VIN_LABEL = 2700    # to here
X_SPLIT = 3800        # VIN_FB: the riser to D2's row
X_MSW_LABEL = 4550    # VIN_MSW's label, at the east end of D2's row
X_VIN_A_LABEL = 7600  # VIN_A's label, at the east end of the VIN row

# ref: (x, y, rotation, mirror)
PARTS = {
    "J3": (1500, 3100, 0, "x"),
    "TP1": (2300, Y_VIN, 0, "none"),
    "C1": (2600, Y_HANG, 0, "none"),
    "R1": (3000, Y_HANG, 0, "none"),
    "FB1": (3500, Y_VIN, 90, "none"),
    "D1": (4100, Y_VIN, 180, "none"),
    "D2": (4100, Y_MSW, 180, "none"),
    "C3": (4600, Y_HANG, 0, "none"),
    "C4": (5050, Y_HANG, 0, "none"),
    "C5": (5500, Y_HANG, 0, "none"),
    "C6": (5950, Y_HANG, 0, "none"),
    "C7": (6400, Y_HANG, 0, "none"),
    "C2": (6850, Y_HANG, 0, "none"),
    "TP2": (7100, Y_VIN, 0, "none"),
    "TP3": (2300, Y_GND, 180, "none"),
}

# Offsets in mm. The hanging parts' fields east of the body; the diodes' and the bead's centred
# (D1's below the VIN row, FB1's above it, D2's above its own row); J3's above its body; TP1's and
# TP2's east of the circle above the row, TP3's east of it under the GND row. The first render, with
# FB1's below the row, the pads' Value under the row, the hanging parts 400 mil apart and R1 300 mil
# from C1, showed FB1's Value running into D1's, TP1's into C1's, and each capacitor's Value reaching
# its east neighbour's body; the second showed TP2's Value running into VIN_A's label. This
# placement is the third.
FIELDS = {
    "J3": above(8.89, 6.35),
    "TP1": fields((1.27, -3.81, "left"), (1.27, -1.27, "left")),
    "C1": east(2.794),
    "R1": east(1.778),
    "FB1": above(6.35, 3.81),
    "D1": below(3.81, 6.35),
    "D2": above(6.35, 3.81),
    "C3": east(2.794),
    "C4": east(2.794),
    "C5": east(2.794),
    "C6": east(2.794),
    "C7": east(2.794),
    "C2": east(2.794),
    "TP2": fields((1.27, -3.81, "left"), (1.27, -1.27, "left")),
    "TP3": fields((1.27, 3.81, "left"), (1.27, 6.35, "left")),
}
RECT = (31.75, 50.8, 205.74, 101.6)
TITLE = "h7-pedal: entry"
PWR_FLAGS = 0
# VIN_MSW reaches one pin on this page (D2's pin 1), so copperhead drafted no wire for it and the
# draft gives it no stroke. By copperhead's own family rule (`draughting/copperhead/src/kicad/draft/
# engine.ts`, netColorsOf: nets sharing the prefix before the first underscore, at least two of
# them) it belongs to the VIN family with VIN_A and VIN_FB, which the draft draws in that family's
# blue, so it takes the same stroke. A drawing choice, not a transcription.
UNDRAWN_STROKES = {"VIN_MSW": "(stroke (width 0.254) (type default) (color 30 90 200 1))"}
