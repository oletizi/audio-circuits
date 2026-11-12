"""The usb_dfu page's placement, in mils, sheet coordinates (x east, y south).

Read by `../tools/place.py` (op-list 01), `02-wire.py` and `../tools/text_edits.py`. Nothing here is
computed from the draft.

The page reads west to east: the socket J4, then the ESD part U6, then the two MCU-side ports
(DFU_USB_DP, DFU_USB_DM) on the east edge. J4's pins face east, top to bottom VBUS, CC1, CC2, D-
(A7, B7), D+ (A6, B6), SBU1 and SBU2; its GND pins and shield are at the bottom.

- VBUS runs from J4 along a row above everything to U6's VBUS (pin 5), with C49 hanging from it next
  to U6 (ruling CR-MODULE-USB-ESD: "100 nF from pin 5 to GND at the part").
- J4's two D- pins join and run to U6's pin 3, its two D+ pins join and run to U6's pin 1. J4 has D-
  above D+, U6 has pin 1 (D+) above pin 3 (D-), so the two cross once, between the parts.
- CC1 and CC2 run east to R13 and R14, lying along their rows. Those rows are enclosed by VBUS above
  and the D lines below, so GND reaches R13, R14 and C49 by one drop from a GND row along the top of
  the page, which crosses the VBUS row once.
- The top GND row starts at GND's label on the west edge and also runs down the west side of J4 to
  the bottom GND row, which takes R15, C50, J4's GND pins and U6's GND (pin 2). The shield runs
  from J4's SH to R15 and C50 (ruling CR-MODULE-USB-C-PINS).
"""
from page import east, fields, west

Y_GTOP = 3100     # the GND row along the top of the page
Y_VBUS = 3500     # the VBUS row
Y_SHIELD = 5300   # the shield row under J4
Y_GND = 5800      # the bottom GND row
X_WEST = 3300     # GND's label
X_GND_WEST = 3500  # GND's run down the west side of J4
X_VBUS_UP = 5400  # VBUS leaves J4 and rises to its row here
X_DM_JOIN = 5400  # J4's two D- pins join here
X_DP_JOIN = 5500  # J4's two D+ pins join here
X_DM_DOWN = 6700  # D- turns down to U6's row, crossing D+
X_DP_DOWN = 6900  # D+ turns down to U6's row
X_GND_DROP = 6700  # the GND drop into the CC pocket
Y_POCKET_GND = 4000  # the GND bar taking R14 and C49
X_EAST = 8100     # DFU_USB_DP's and DFU_USB_DM's labels

# ref: (x, y, rotation, mirror). Connector:USB_C_Receptacle_USB2.0_16P at rotation 0: the signal
# pins 600 mil east of the origin (VBUS 600 north, CC1 400, CC2 300, A7 100, B7 0, A6 100 south,
# B6 200, A8 400, B8 500); GND 900 mil south; SH 900 south and 300 west.
# Power_Protection:USBLC6-2SC6: pin 5 200 north, pin 2 300 south, pins 1 and 3 200 west (level and
# 100 south), pins 6 and 4 200 east. Device:R at rotation 90: pin 1 west, pin 2 east, 150 mil.
PARTS = {
    "J4": (4700, 4300, 0, "none"),
    "R13": (5700, 3900, 90, "none"),
    "R14": (6400, 4000, 90, "none"),
    "C49": (7100, 3850, 0, "none"),
    "U6": (7500, 4700, 0, "none"),
    "R15": (3900, 5500, 0, "none"),
    "C50": (4200, 5500, 0, "none"),
}
# Offsets in mm. R13's fields above it (the VBUS row is 400 mil up), R14's below it (the D- row is
# 300 mil down). C49's east of it, west of U6's VBUS descent; U6's east of its body above the
# DFU_USB rows; R15's west of it, C50's east of it, both clear of the GND runs; J4's above its body.
FIELDS = {
    "J4": fields((0, -21.59, None), (0, -19.05, None)),
    "R13": fields((0, -4.445, None), (0, -2.159, None)),
    "R14": fields((0, 2.159, None), (0, 4.445, None)),
    "C49": east(2.794),
    "U6": fields((2.54, -7.62, "left"), (2.54, -5.08, "left")),
    "R15": west(1.778),
    "C50": east(2.794),
}
RECT = (73.66, 71.12, 223.52, 152.4)
TITLE = "h7-module: usb_dfu"
PWR_FLAGS = 0
# DFU_USB_DM and DFU_USB_DP each reach one pin (U6's 4 and 6), so copperhead drafted no wire for them
# and the draft gives them no stroke. copperhead colours a FAMILY of signal nets - nets sharing the
# prefix before the first underscore, at least two of them - one colour from a fixed palette
# (`draughting/copperhead/src/kicad/draft/engine.ts`, FAMILY_PALETTE); on the draft the DFU family
# (DFU_CONN_DM, DFU_CONN_DP, DFU_VBUS) carries the palette's first colour. DFU_USB_DM and DFU_USB_DP
# are in that family, so they take its stroke.
DFU_FAMILY_STROKE = "(stroke (width 0.254) (type default) (color 30 90 200 1))"
UNDRAWN_STROKES = {"DFU_USB_DM": DFU_FAMILY_STROKE, "DFU_USB_DP": DFU_FAMILY_STROKE}
