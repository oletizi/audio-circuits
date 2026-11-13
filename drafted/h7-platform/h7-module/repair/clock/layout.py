"""The clock page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`. Nothing here is
computed from the draft.

The page reads west to east along the HSE row: HSE_IN's label on the west edge, C44 hanging from the
row, the crystal Y1 between pin 1 (HSE_IN) and pin 3 (HSE_OUT), C45 hanging from the row, HSE_OUT's
label on the east edge. Under them one GND row takes C44, the crystal's case pins and C45, and
carries GND's label at its west end. Device:Crystal_GND24 (KiCad 10.0.5's library) draws both case
pins, 2 and 4, at one point under the body, so one drop joins both.
"""
from page import above, east

Y_HSE = 4000      # the crystal's pins 1 and 3
Y_GND = 4800      # the GND row
X_WEST = 4500     # HSE_IN's and GND's labels
X_EAST = 6500     # HSE_OUT's label

# ref: (x, y, rotation, mirror). Device:C at rotation 0: pin 1 north, pin 2 south, 150 mil from the
# origin. Crystal_GND24 at rotation 0: pin 1 west and pin 3 east, 150 mil from the origin; pins 2
# and 4 both 200 mil south of it.
PARTS = {
    "Y1": (5500, Y_HSE, 0, "none"),
    "C44": (4900, 4400, 0, "none"),
    "C45": (6100, 4400, 0, "none"),
}
# Offsets in mm. The capacitors' fields beside them to the east (Device:C's plates are 2.032 mm
# either side of its axis); the crystal's centred above its case outline, whose top edge is about
# 3.8 mm above the origin.
FIELDS = {
    "Y1": above(7.62, 5.08),
    "C44": east(2.794),
    "C45": east(2.794),
}
RECT = (96.52, 83.82, 182.88, 129.54)
TITLE = "h7-module: clock"
PWR_FLAGS = 0
