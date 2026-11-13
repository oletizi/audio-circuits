"""The sdram page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`. Nothing here is
computed from the draft.

U3 (the project symbol `h7-platform:W9825G6KH`, design change C4) stands in the middle, its pins in
the part's own TSOP order: 1 to 27 down the west side, 28 to 54 up the east side, 100 mil apart.

- Every signal pin runs straight out, west or east, by one 300 mil stub to its hierarchical label.
- Each side has two vertical buses beyond the label column, which the supply pins reach by stubs
  passing between the labels. West: 3V3_D nearer (pins 1, 3, 9, 14, 27), GND farther (6, 12). East:
  GND nearer (28, 41, 46, 52, 54), 3V3_D farther (43, 49). The supply pins alternate with each
  other down each side (west 3V3_D, 3V3_D, GND, 3V3_D, GND, 3V3_D, 3V3_D; east GND, GND, 3V3_D,
  GND, 3V3_D, GND, GND), so a stub to the farther bus crosses the nearer one: four crossings, the
  two west GND stubs and the two east 3V3_D stubs.
- A 3V3_D row along the top joins both 3V3_D buses; a GND row along the bottom joins both GND buses.
  3V3_D's and GND's hierarchical labels are at their west ends.
- R9, the /CS pull-up, stands west of the west buses: SDRAM_NE (pin 19) runs west across both west
  buses (two more crossings) to R9's pin 1 and on to SDRAM_NE's hierarchical label; R9's pin 2
  rises to the 3V3_D row. R9 cannot stand in the stub region: U3's pins 18 and 20, either side of
  pin 19, are signals 100 mil away.
- C36 to C42 stand in a row east of the east buses, 400 mil apart so each one's fields clear the
  next one's leads, each from the 3V3_D row down to the GND row.
- Pin 40 (NC) carries the intent's no-connect.
"""
from page import east, fields

Y_3V3 = 2600      # the 3V3_D row along the top
Y_GND = 6000      # the GND row along the bottom
X_WEST = 2900     # 3V3_D's, GND's and SDRAM_NE's labels
X_R9 = 3200       # R9's column
X_W_GND = 3500    # the west GND bus (farther)
X_W_3V3 = 3600    # the west 3V3_D bus (nearer)
X_W_LABEL = 4400  # the west signal labels
X_E_LABEL = 6000  # the east signal labels
X_E_GND = 6800    # the east GND bus (nearer)
X_E_3V3 = 6900    # the east 3V3_D bus (farther)

# ref: (x, y, rotation, mirror). h7-platform:W9825G6KH at rotation 0: pins 1 to 27 500 mil west of
# the origin, pin 1 1300 mil north to pin 27 1300 mil south; pins 28 to 54 500 mil east, pin 28 1300
# mil south to pin 54 1300 mil north; the body 1400 mil each way north and south. Device:R/C at
# rotation 0: pin 1 north, pin 2 south, 150 mil; at 180 the reverse.
PARTS = {
    "U3": (5200, 4400, 0, "none"),
    "R9": (X_R9, 4750, 180, "none"),   # pin 2 (3V3_D) north, pin 1 (SDRAM_NE, on pin 19's row) south
    "C36": (7200, 4400, 0, "none"),
    "C37": (7600, 4400, 0, "none"),
    "C38": (8000, 4400, 0, "none"),
    "C39": (8400, 4400, 0, "none"),
    "C40": (8800, 4400, 0, "none"),
    "C41": (9200, 4400, 0, "none"),
    "C42": (9600, 4400, 0, "none"),
}
# Offsets in mm. U3's fields centred above its body, under the 3V3_D row; R9's and each capacitor's
# east of its body.
FIELDS = {
    "U3": fields((0, -40.64, None), (0, -38.1, None)),
    "R9": east(1.778),
    **{f"C{n}": east(2.794) for n in range(36, 43)},
}
RECT = (55.88, 58.42, 254.0, 160.02)
TITLE = "h7-module: sdram"
PWR_FLAGS = 0
# The 38 SDRAM ports reaching one pin each (every one but SDRAM_NE) have no wire on the draft and so
# no stroke. copperhead colours a FAMILY of signal nets - nets sharing the prefix before the first
# underscore, at least two of them - one colour from a fixed palette
# (`draughting/copperhead/src/kicad/draft/engine.ts`, FAMILY_PALETTE). On the draft SDRAM_NE, the one
# SDRAM net in the intent, has no family and carries the default stroke. Taking a colour copperhead
# never drew would be this page's invention, so every SDRAM net keeps the default stroke the draft
# gives SDRAM_NE (the qspi page's rule for its FLASH nets).
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
ONE_PIN_SIGNALS = (
    [f"SDRAM_A{n}" for n in range(13)] + [f"SDRAM_D{n}" for n in range(16)]
    + ["SDRAM_BA0", "SDRAM_BA1", "SDRAM_CKE", "SDRAM_CLK", "SDRAM_NBL0", "SDRAM_NBL1", "SDRAM_NCAS",
       "SDRAM_NRAS", "SDRAM_NWE"]
)
UNDRAWN_STROKES = {n: DEFAULT_STROKE for n in ONE_PIN_SIGNALS}
