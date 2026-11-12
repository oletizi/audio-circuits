"""The vdda page's placement, in mils, sheet coordinates (x east, y south).

Read by `../tools/place.py` (op-list 01), `02-wire.py` and `../tools/text_edits.py`. Nothing here is
computed from the draft.

The page reads west to east along two rows. The VREF_A row on top: 3V3_D's hierarchical label on the
west edge, FB1 lying along the row (pin 1, 3V3_D, west; pin 2, VREF_A, east), then the bank C21, C22
(10uF) and C23, C24 (.1uF), each standing between the VREF_A row and the VSSA row below, then the
damping leg R1 over C25 in one column, R1 from the VREF_A row and C25 to the VSSA row, the DAMP node
between them; VREF_A's hierarchical label on the east edge. The VSSA row underneath: R2 lying along
its west end (pin 1, VSSA, east; pin 2, GND, west) with GND's hierarchical label west of it, under
3V3_D's; VSSA's hierarchical label on the east edge, under VREF_A's.

That is the bank and the leg as the model holds them (ruling CR-MODULE-VDDA-BANK: the bank from
VDDA to VSSA, and the leg R in series with C across the bank, never in the DC path), and VSSA to GND
through R2 alone (`circuits/h7-platform/module/vdda.ts`).
"""
from page import east, fields

Y_VREF = 3500     # the VREF_A row (3V3_D west of FB1)
Y_VSSA = 4800     # the VSSA row (GND west of R2)
X_WEST = 3300     # 3V3_D's and GND's labels
X_EAST = 6600     # VREF_A's and VSSA's labels

# ref: (x, y, rotation, mirror). Device:FerriteBead and Device:R at rotation 0: pin 1 150 mil north,
# pin 2 150 mil south; at 90 pin 1 west and pin 2 east; at 270 the reverse. Device:C at rotation 0:
# pin 1 north, pin 2 south, 150 mil.
PARTS = {
    "FB1": (3800, 3500, 90, "none"),
    "C21": (4400, 4150, 0, "none"),
    "C22": (4800, 4150, 0, "none"),
    "C23": (5200, 4150, 0, "none"),
    "C24": (5600, 4150, 0, "none"),
    "R1": (6100, 3850, 0, "none"),
    "C25": (6100, 4400, 0, "none"),
    "R2": (3800, 4800, 270, "none"),
}
# Offsets in mm. Each upright part's fields east of its body; FB1's and R2's above their bodies,
# Reference over Value.
FIELDS = {
    "FB1": fields((0, -6.35, None), (0, -3.81, None)),
    "C21": east(2.794),
    "C22": east(2.794),
    "C23": east(2.794),
    "C24": east(2.794),
    "R1": east(1.778),
    "C25": east(2.794),
    "R2": fields((0, -6.35, None), (0, -3.81, None)),
}
RECT = (66.04, 71.12, 182.88, 132.08)
TITLE = "h7-module: vdda"
PWR_FLAGS = 0
# 3V3_D and GND each reach one pin on this page (FB1's pin 1, R2's pin 2), so copperhead drafted no
# wire for them and the draft gives them no stroke. Neither belongs to a copperhead colour family
# (`draughting/copperhead/src/kicad/draft/engine.ts`, FAMILY_PALETTE: nets sharing the prefix before
# the first underscore, at least two of them); every net the draft does draw here carries the
# default stroke, so these two take it as well. A drawing choice, not a transcription.
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
UNDRAWN_STROKES = {"3V3_D": DEFAULT_STROKE, "GND": DEFAULT_STROKE}
