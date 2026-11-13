"""The reset_boot page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`. Nothing here is
computed from the draft.

Two circuits between one 3V3_D row on top and one GND row at the bottom, both rows entering from
the west edge, where their hierarchical labels are:
- BOOT0, west: SW2 from the 3V3_D row down to the BOOT0 row, which runs west to BOOT0's label on the
  west edge, between the 3V3_D and GND labels; R12 and C48 hang from it to GND.
- NRST, east: C46 across the rows; U5 with VDD (pin 3) up to 3V3_D, GND (pin 1) down to GND and
  ~RESET (pin 2) east on the NRST row; R11 from 3V3_D down to the NRST row; C47 and SW1 from the
  NRST row down to GND. The NRST row ends in NRST's label on the east edge.
"""
from page import east, fields, west

Y_3V3 = 3700      # the 3V3_D row
Y_SIG = 4300      # the BOOT0 row and the NRST row (U5's pin 2)
Y_GND = 5000      # the GND row
X_WEST = 3700     # the 3V3_D, BOOT0 and GND labels
X_EAST = 8400     # NRST's label

# ref: (x, y, rotation, mirror). Device:R/C at rotation 0: pin 1 north, pin 2 south, 150 mil from
# the origin. Switch:SW_Push at rotation 90: pin 2 north, pin 1 south; at 270, pin 1 north; 200 mil.
# h7-platform:TLV803EA30DBZR (TPS3839DBZ's geometry; CR-MODULE-SUPERVISOR-SYMBOL as amended) at
# rotation 0: pin 3 (VDD) 300 mil north, pin 1 (GND) 300 mil south, pin 2 (~RESET) 400 mil east.
PARTS = {
    "SW2": (4300, 4000, 90, "none"),
    "R12": (4700, 4650, 0, "none"),
    "C48": (5100, 4650, 0, "none"),
    "C46": (5900, 4350, 0, "none"),
    "U5": (6500, Y_SIG, 0, "none"),
    "R11": (7200, 4000, 0, "none"),
    "C47": (7600, 4650, 0, "none"),
    "SW1": (8000, 4650, 270, "none"),
}
# Offsets in mm. Resistors' and capacitors' fields east of them (Device:R's body is 1.016 mm either
# side of its axis, Device:C's plates 2.032); SW2's west of it, clear of R12; U5's under the NRST
# row, east of its GND drop.
FIELDS = {
    "SW2": west(3.81),
    "R12": east(1.778),
    "C48": east(2.794),
    "C46": east(2.794),
    "U5": fields((2.54, 6.35, "left"), (2.54, 8.89, "left")),
    "R11": east(1.778),
    "C47": east(2.794),
    "SW1": east(3.81),
}
RECT = (71.12, 81.28, 231.14, 132.08)
TITLE = "h7-module: reset_boot"
PWR_FLAGS = 0
