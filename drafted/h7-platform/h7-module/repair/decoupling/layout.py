"""The decoupling page's placement, in mils, sheet coordinates (x east, y south).

Read by `../tools/place.py` (op-list 01), `02-wire.py` and `../tools/text_edits.py`. Nothing here is
computed from the draft.

Two bands, one above the other.

- The upper band: a 3V3_D row along the top and a GND row under it, each from its hierarchical
  label on the west edge. C1 to C18, in reference order west to east, 400 mil apart, each stand
  between them, pin 1 up to 3V3_D and pin 2 down to GND.
- The lower band: the bench pads and VCAP. A VCAP row from its hierarchical label on the west edge
  takes C19 and C20, each hanging from it to a second GND row, and ends in TP1, standing up from the
  row's east end. East of it, VREF_A's hierarchical label and a short row ending in TP3, then
  BOOT0's hierarchical label and a short row ending in TP5, each standing up. TP2 and TP4, the GND
  pads (each beside the pad it pairs with, TP1 and TP3), hang down from the second GND row.
- The second GND row runs east under everything and rises at the page's east edge to the upper GND
  row, east of the VREF_A and BOOT0 rows' ends, so the two bands join without a crossing.

The pads and their pairing are the block's own (`circuits/h7-platform/module/mcu-decoupling.ts`:
one pad on VCAP and one on VDDA, each with a GND pad, and a pogo pad on BOOT0; D15).
"""
from page import east, fields

Y_3V3 = 2400      # the 3V3_D row
Y_GND = 3200      # the upper GND row
Y_LOWER = 4000    # the VCAP, VREF_A and BOOT0 rows
Y_GND2 = 4700     # the lower GND row
X_WEST = 1600     # 3V3_D's, GND's and VCAP's labels
X_VREF = 4000     # VREF_A's label
X_BOOT0 = 5800    # BOOT0's label
X_EAST = 9200     # the GND rise joining the two GND rows

# ref: (x, y, rotation, mirror). Device:C at rotation 0: pin 1 north, pin 2 south, 150 mil.
# Connector:TestPoint: its one pin at the origin, the body 130 mil north of it at rotation 0 and
# south at 180.
PARTS = {
    **{f"C{n}": (2000 + 400 * (n - 1), 2800, 0, "none") for n in range(1, 19)},
    "C19": (2000, 4300, 0, "none"),
    "C20": (2400, 4300, 0, "none"),
    "TP1": (2800, Y_LOWER, 0, "none"),
    "TP2": (3200, Y_GND2, 180, "none"),
    "TP3": (4400, Y_LOWER, 0, "none"),
    "TP4": (4800, Y_GND2, 180, "none"),
    "TP5": (6200, Y_LOWER, 0, "none"),
}
# Offsets in mm. Each capacitor's fields east of its body. A test point's east of its body,
# Reference over Value: above its row when it stands up, below its row when it hangs down (the swd
# page's placement).
UP = fields((1.524, -4.445, "left"), (1.524, -2.54, "left"))
DOWN = fields((1.524, 2.54, "left"), (1.524, 4.445, "left"))
FIELDS = {
    **{f"C{n}": east(2.794) for n in range(1, 21)},
    "TP1": UP,
    "TP2": DOWN,
    "TP3": UP,
    "TP4": DOWN,
    "TP5": UP,
}
RECT = (27.94, 50.8, 241.3, 132.08)
TITLE = "h7-module: decoupling"
PWR_FLAGS = 0
# VREF_A and BOOT0 each reach one pin on this page (TP3's, TP5's), so copperhead drafted no wire for
# them and the draft gives them no stroke. Neither is in a copperhead colour family on this page
# (`draughting/copperhead/src/kicad/draft/engine.ts`, FAMILY_PALETTE: nets sharing the prefix before
# the first underscore, at least two of them), so each takes the stroke the draft gives the nets it
# does draw here, recorded in net_strokes.json. A drawing choice, not a transcription.
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
UNDRAWN_STROKES = {"VREF_A": DEFAULT_STROKE, "BOOT0": DEFAULT_STROKE}
