"""The qspi page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`. Nothing here is
computed from the draft.

U4's six signal pins face west, and each runs west on its own row to its hierarchical label on the
west edge: FLASH_NCS (pin 1), FLASH_CLK (6), FLASH_IO0 (5), FLASH_IO1 (2), FLASH_IO2 (3), FLASH_IO3
(7), top to bottom as the symbol has them. A 3V3_D row above them, from its label on the west edge,
takes R10, U4's VCC (pin 8) and C43; R10 drops from it to the FLASH_NCS row. A GND row below, from
its label, takes U4's GND (pin 4) and C43.
"""
from page import east, fields

Y_3V3 = 3500      # the 3V3_D row
Y_GND = 5000      # the GND row
X_WEST = 4100     # every label

# ref: (x, y, rotation, mirror). Memory_Flash:W25Q128JVS at rotation 0: the six signal pins 400 mil
# west of the origin, 100 mil apart from pin 1 (300 north) to pin 7 (200 south); VCC 500 north, GND
# 500 south. Device:R/C at rotation 0: pin 1 north, pin 2 south, 150 mil; at 180 the reverse.
PARTS = {
    "U4": (5500, 4300, 0, "none"),
    "R10": (4700, 3750, 180, "none"),   # pin 2 (3V3_D) north, pin 1 (FLASH_NCS) south
    "C43": (6400, 4250, 0, "none"),
}
# Offsets in mm. R10's and C43's fields east of their bodies; U4's above its body, east of the VCC
# rise and west of C43's drop.
FIELDS = {
    "U4": fields((2.54, -16.51, "left"), (2.54, -13.97, "left")),
    "R10": east(1.778),
    "C43": east(2.794),
}
RECT = (78.74, 76.2, 182.88, 134.62)
TITLE = "h7-module: qspi"
PWR_FLAGS = 0
# FLASH_CLK and FLASH_IO0 to FLASH_IO3 each reach one pin, so copperhead drafted no wire for them and
# the draft gives them no stroke. copperhead colours a FAMILY of signal nets - nets sharing the
# prefix before the first underscore, at least two of them - one colour from a fixed palette
# (`draughting/copperhead/src/kicad/draft/engine.ts`, FAMILY_PALETTE). On the draft FLASH_NCS, the
# one FLASH net in the intent, has no family and carries the default stroke; with the five one-pin
# FLASH nets the family would have six members. Taking a colour copperhead never drew would be this
# page's invention, so all six FLASH nets keep the default stroke the draft gives FLASH_NCS.
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
UNDRAWN_STROKES = {n: DEFAULT_STROKE for n in ("FLASH_CLK", "FLASH_IO0", "FLASH_IO1", "FLASH_IO2", "FLASH_IO3")}
