"""The h7-pedal usb page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/usb.ts`): J7 (J_USB, the USB-C receptacle); R80 and R81 (R_CC1,
R_CC2, 5.1 k to GND); R82 and C57 (R_SHLD, C_SHLD, the shell to GND); U14 (U_ESD, USBLC6-2SC6) with
C58 (C_VBUS at its VBUS pin); U15 (U_USBSW, TS3USB221), R83 (R_USBEN, 3V3_D to its OE) and C59
(C_USBSW, at its VCC); the VBUS sense divider R84 over R85 (R_VBUS_TOP, R_VBUS_BOT) with C60
(C_VBUS_SENSE).

The page reads west to east along the data path: J7, then U14 with its I/O pins on the two data rows
(I/O1 in at pin 1 and out at pin 6, I/O2 in at 3 and out at 4; the symbol's two pins of a pair are
separate pins, so each pair is also joined by a loop around the body, D+ over it and D- under it),
then U15, mirrored left to
right so its connector side (1D+, 1D-) faces U14 and its MCU side (D+, D-, S, OE) faces east, then
the MCU-side labels. GND's label is at the west end of a GND row along the top of the page, which
runs down J7's west side to a GND row along the bottom.

Above the data rows: VBUS leaves J7 and rises to its row, which runs east past C58 to U14's VBUS
column; R84 stands on that corner, and the sense row runs east from its top past R85 and C60 (each
standing between the sense row and the top GND row) to the USB_VBUS_SENSE label. CC1 and CC2 run east
from J7 to R80 and R81, lying along their rows; their GND ends, and C58's, join a GND bar that rises
across the VBUS row to the top GND row. U15's VCC rises to the 3V3_D row, which runs east to 3V3_D's
label; C59 stands on that row's vertical between it and the top GND row, east of the sense label.

Below the data rows: J7's GND pins, U14's GND, U15's GND and its S pin drop to the bottom GND row; the
shell drops to the shield row, with R82 and C57 hanging from it to the GND row. OE runs east and
down to the USB_EN_N row; R83 hangs from the 3V3_D vertical, which drops across the two MCU-side data
rows, to that row.

The crossings, each forced by where the pins are: J7 has D- above D+ and U14 has I/O1 (D+) above
I/O2 (D-), so the two data nets cross once between them; U14's VBUS pin is on top and its GND pin
underneath, so VBUS's drop to pin 5 crosses the D+ loop and the GND drop from pin 2 the D- loop;
the CC resistors and C58 sit between the
VBUS row and the data rows, so their GND crosses the VBUS row once; U15's S sits between its D- and
OE pins, so its drop to GND crosses OE's row once; and R83 joins 3V3_D (U15's VCC is above the data
rows) to OE (below them), so 3V3_D crosses the two MCU-side data rows.

Symbol geometry (read from the draft's lib_symbols), at rotation 0, unmirrored:
Connector:USB_C_Receptacle_USB2.0_16P the signal pins 600 mil east of the origin (VBUS 600 north,
CC1 400, CC2 300, A7 100, B7 0, A6 100 south, B6 200, A8 500, B8 600); GND 900 south; SH 900 south
and 300 west. Power_Protection:USBLC6-2SC6 pin 5 200 north, pin 2 300 south, pins 1 and 3 200 west
(level, and 100 south), pins 6 and 4 200 east (level, and 100 south). h7-platform:TS3USB221RSER
pins 1 to 4 400 east (200 and 100 north, 100 and 200 south), 8, 7, 9 and 6 400 west (200 and 100
north, 100 and 200 south), VCC (10) 400 north, GND (5) 400 south; mirrored left to right, east and
west swap. Device:R and Device:C pin 1 150 mil north, pin 2 150 south (at rotation 90, pin 1 west;
at 180, pin 1 south).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, below, east, fields, west  # noqa: E402

Y_GTOP = 2000      # the top GND row
Y_SENSE = 2300     # the USB_VBUS_SENSE row
Y_VBUS = 2600      # the VBUS row
Y_3V3 = 3100       # the 3V3_D row
Y_EN = 4500        # the USB_EN_N row
Y_SHIELD = 4700    # the shield row under J7
Y_GND = 5000       # the bottom GND row
X_LABEL_W = 1100   # GND's label
X_GND_W = 1300     # GND's run down J7's west side
X_VBUS_UP = 3200   # VBUS leaves J7 and rises to its row here
X_DM_JOIN = 3200   # J7's two D- pins join here
X_DP_JOIN = 3300   # J7's two D+ pins join here
X_DM_DOWN = 4000   # D- steps down to U14's I/O2 row
X_DP_UP = 4200     # D+ steps up to U14's I/O1 row, crossing D-
X_BAR = 4300       # the CC and C58 GND bar rises to the top GND row here
X_SENSE_LABEL = 6400  # USB_VBUS_SENSE's label
X_S = 6700         # U15's S drops to the GND row here
X_OE_DOWN = 6800   # OE steps down to the USB_EN_N row here
X_3V3 = 7400       # the 3V3_D vertical: C59 above, R83 below
X_EAST = 8000      # the MCU-side labels
X_LOOP_W = 5000    # the tee west of U14 where each I/O pair's loop leaves its data row
X_LOOP_E = 5600    # the tee east of U14 where each loop rejoins its data row
Y_LOOP_P = 3300    # the D+ loop over U14 (I/O1, pins 1 and 6)
Y_LOOP_M = 4200    # the D- loop under U14 (I/O2, pins 3 and 4)

# ref: (x, y, rotation, mirror)
PARTS = {
    "J7": (2500, 3700, 0, "none"),
    "R80": (3500, 3300, 90, "none"),
    "R81": (3900, 3400, 90, "none"),
    "C58": (4600, 3250, 0, "none"),
    "U14": (5300, 3700, 0, "none"),
    "R84": (5300, 2450, 180, "none"),
    "R85": (5700, 2150, 180, "none"),
    "C60": (6000, 2150, 180, "none"),
    "U15": (6200, 3900, 0, "y"),
    "C59": (7400, 2150, 180, "none"),
    "R83": (7400, 4350, 0, "none"),
    "R82": (1700, 4850, 0, "none"),
    "C57": (1950, 4850, 0, "none"),
}

# Offsets in mm, placed after renders. J7's fields above its body, clear of its pin names (the first
# render put its Value across VBUS); R80's above it, R81's below it (the two rows are 100 mil apart);
# R85's west of it (east, its Value ran into C60's body);
# U14's east of its GND drop under the D- loop (the first render had them across R84's VBUS drop and
# U15's fields); U15's above its body, east of its VCC rise. U15 is mirrored left to right and KiCad
# mirrors a field's justification with it (measured on the second render: a field written "left" read
# right-justified), so its fields are written "right" to read left-justified, starting just east of VCC.
FIELDS = {
    "J7": above(25.4, 22.86),
    "R80": above(4.445, 2.159),
    "R81": below(2.159, 4.445),
    "C58": east(2.794),
    "U14": fields((1.27, 16.51, "left"), (1.27, 19.05, "left")),
    "R84": west(1.778),
    "R85": west(1.778),
    "C60": east(2.794),
    "U15": fields((1.27, -13.97, "right"), (1.27, -11.43, "right")),
    "C59": east(2.794),
    "R83": east(1.778),
    "R82": west(1.778),
    "C57": east(2.794),
}
RECT = (20.32, 40.64, 220.98, 132.08)
TITLE = "h7-pedal: usb"
PWR_FLAGS = 0
# USB_DP and USB_DM each reach one pin on this page (U15's 8 and 7), so copperhead drafted no wire for
# either and the draft gives them no stroke. copperhead colours a FAMILY of signal nets - nets
# sharing the prefix before the first underscore, two or more of them - one colour from its palette
# (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf); on the draft the USB family
# (USB_CC1, USB_CC2, USB_C_DM, USB_C_DP, USB_EN_N, USB_SHIELD, USB_VBUS_SENSE) carries the palette's
# first colour. USB_DP and USB_DM are in that family by the same rule, so they take its stroke.
USB_FAMILY_STROKE = "(stroke (width 0.254) (type default) (color 30 90 200 1))"
UNDRAWN_STROKES = {"USB_DM": USB_FAMILY_STROKE, "USB_DP": USB_FAMILY_STROKE}
