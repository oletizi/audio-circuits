"""The swd page's placement, in mils, sheet coordinates (x east, y south).

Read by `../tools/place.py` (op-list 01), `02-wire.py` and `../tools/text_edits.py`. Nothing here is
computed from the draft.

J3 in the middle. Its signal pins face east: NRST (pin 10), SWCLK (pin 4) and SWDIO (pin 2) each run
east as a row to its hierarchical label on the east edge, with that signal's test point tapping the
row; SWO, KEY and NC/TDI (pins 6, 7, 8) carry no-connects. VTref (pin 1) rises to a 3V3_D row above
J3 and GND (pins 3, 5 and 9) drop to a GND row under it; both rows run west to their labels on the
west edge, each tapped by its test point. SWCLK's and SWDIO's rows are 100 mil apart (J3's pitch),
so SWCLK's test point stands up from its row and SWDIO's hangs down from its own.
"""
from page import fields

Y_3V3 = 3400      # the 3V3_D row above J3
Y_GND = 5000      # the GND row under J3
X_WEST = 4000     # the 3V3_D and GND labels
X_EAST = 6800     # the NRST, SWCLK and SWDIO labels

# ref: (x, y, rotation, mirror). Connector:Conn_ARM_JTAG_SWD_10 at rotation 0: VTref 600 mil north
# of the origin, GND (3, 5) 600 mil south and GNDDetect (9) 600 mil south and 100 west, the signals
# 500 mil east (~RESET 300 north, SWCLK 100 north, SWDIO level), KEY 400 west.
# Connector:TestPoint: its one pin at the origin, the body above it at rotation 0, below at 180.
PARTS = {
    "J3": (5000, 4200, 0, "none"),
    "TP8": (5800, 3900, 0, "none"),
    "TP7": (6100, 4100, 0, "none"),
    "TP6": (6400, 4200, 180, "none"),
    "TP9": (4500, Y_3V3, 0, "none"),
    "TP10": (4400, Y_GND, 0, "none"),
}
# Offsets in mm. A test point's fields east of its body, Reference over Value: above its row when
# the body stands up, below it when it hangs down. J3's centred above its body, which ends 12.7 mm
# above the origin, west of VTref's rise.
UP = fields((1.524, -4.445, "left"), (1.524, -2.54, "left"))
DOWN = fields((1.524, 2.54, "left"), (1.524, 4.445, "left"))
FIELDS = {
    "J3": fields((-2.54, -16.51, "right"), (-2.54, -13.97, "right")),
    "TP8": UP,
    "TP7": UP,
    "TP6": DOWN,
    "TP9": UP,
    "TP10": UP,
}
RECT = (91.44, 73.66, 190.5, 134.62)
TITLE = "h7-module: swd"
PWR_FLAGS = 0
