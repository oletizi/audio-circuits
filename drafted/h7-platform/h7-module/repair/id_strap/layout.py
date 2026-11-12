"""The id_strap page's placement, in mils, sheet coordinates (x east, y south).

Read by `../tools/place.py` (op-list 01), `02-wire.py` and `../tools/text_edits.py`. Nothing here is
computed from the draft.

The divider stands upright: VREF_A enters on a row from its label on the west edge and turns down
into R16; R16 and R17 stand one above the other with the strap node between them, which runs east
past C51 to MODULE_ID_STRAP's label on the east edge; R17 and C51 drop to a GND row that runs west
to GND's label.
"""
from page import east

Y_VREF = 3700     # VREF_A's row
Y_STRAP = 4300    # the strap node's row
Y_GND = 4900      # the GND row
X_WEST = 4500     # the VREF_A and GND labels
X_EAST = 6100     # MODULE_ID_STRAP's label

# ref: (x, y, rotation, mirror). Device:R/C at rotation 0: pin 1 north, pin 2 south, 150 mil.
PARTS = {
    "R16": (5000, 4000, 0, "none"),
    "R17": (5000, 4600, 0, "none"),
    "C51": (5500, 4600, 0, "none"),
}
# Offsets in mm: each part's fields east of its body (Device:R 1.016 mm either side of its axis,
# Device:C's plates 2.032).
FIELDS = {
    "R16": east(1.778),
    "R17": east(1.778),
    "C51": east(2.794),
}
RECT = (101.6, 73.66, 180.34, 129.54)   # the two-line caption ends above the VREF_A row
TITLE = "h7-module: id_strap"
PWR_FLAGS = 0
# VREF_A reaches one pin (R16's pin 1), so copperhead drafted no wire for it and the draft gives it
# no stroke. It takes copperhead's stroke for a net of no colour family, the stroke the draft's two
# drawn nets carry: the draft has no wire for it to read a colour from.
UNDRAWN_STROKES = {"VREF_A": "(stroke (width 0.254) (type default))"}
