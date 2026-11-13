"""The h7-pedal fsw_led page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/fsw-led.ts`): per footswitch n, J5/J6 (J_FSWn, the 2-pin
header to the hung footswitch board, pin 1 the switch node FSWn_SW, pin 2 GND), R70/R72 (R_FSW_PUn,
10.0 k from 3V3_D to the node), C55/C56 (C_FSWn, 100 nF from the node to GND) and R71/R73 (R_FSWn,
1.20 k from the node to FSWn); per LED n, D10/D11 (LEDn, WP7113ID), R74/R77 (R_LEDn, 100 from 3V3_P
to the anode), Q7/Q8 (Q_LEDn, AO3400A, source on GND, drain on the cathode), R75/R78 (R_LEDn_G, 100
from LEDn to the gate) and R76/R79 (R_LEDn_PD, 10.0 k from the gate to GND).

Two sections, the LEDs at the west and the footswitches at the east, each holding its two channels
one above the other, mirrored about one GND row that runs across the page between them; GND's label
is at its west end, pointing west.

The LED section: each LED's label at the west edge, pointing west, starts its gate row, R75 or R78
lying in it, into its MOSFET's gate; R76 or R79 hangs from the gate row to the GND row. Channel 1
stands above the GND row (Q7's source down to it, its drain up into D10's cathode, D10's anode up
through R74 to the 3V3_P row along the top); channel 2 is its mirror image below (Q8 mirrored top to
bottom, D11 anode down, R77 to a 3V3_P row along the bottom). 3V3_P's label is at the top row's west
end, pointing west, and a vertical west of the LED labels joins the two 3V3_P rows.

The footswitch section: each header, pins facing east, starts its node row, which runs east past
the pull-up and the capacitor and through R71 or R73 to FSW1's or FSW2's label, pointing east; the
header's GND pin goes to the GND row. Channel 1 above (R70 up to a 3V3_D row, C55 down to GND),
channel 2 its mirror below (J6 turned 180, R72 down to a 3V3_D row, C56 up to GND). The two 3V3_D
rows are joined by a vertical east of the FSW labels; 3V3_D's label is at the top row's east end,
pointing east.

Symbol geometry (read from the draft's lib_symbols), at rotation 0, unmirrored:
Connector_Generic:Conn_01x02 pin 1 200 mil west, pin 2 200 west and 100 south (mirrored left to
right, east; turned 180, east, pin 2 100 north). Device:LED K (1) 150 west, A (2) 150 east (at 90,
A north and K south; at 270, A south and K north). Transistor_FET:AO3400A G (1) 200 west, S (2) 100
east and 200 south, D (3) 100 east and 200 north (mirrored top to bottom, S north, D south).
Device:R and Device:C pin 1 150 north, pin 2 150 south (at 90, pin 1 west; at 180, pin 1 south).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, below, east, fields, west  # noqa: E402

Y_3V3P_TOP = 1900  # the 3V3_P row over the LED section
Y_3V3D_TOP = 2500  # the 3V3_D row over the footswitch section
Y_FSW1 = 2800      # FSW1_SW's node row
Y_LED1 = 2900      # LED1's gate row
Y_GND = 3300       # the GND row across the page
Y_LED2 = 3700      # LED2's gate row
Y_FSW2 = 3800      # FSW2_SW's node row
Y_3V3D_BOT = 4100  # the 3V3_D row under the footswitch section
Y_3V3P_BOT = 4700  # the 3V3_P row under the LED section
X_3V3P_LABEL = 900  # 3V3_P's label
X_3V3P_W = 1100    # the vertical joining the two 3V3_P rows, west of the LED labels
X_LABEL_W = 1600   # LED1's, GND's and LED2's labels
X_FSW_LABEL = 5700  # FSW1's and FSW2's labels
X_3V3D_E = 6400    # the vertical joining the two 3V3_D rows, east of the FSW labels
X_3V3D_LABEL = 6600  # 3V3_D's label

# ref: (x, y, rotation, mirror)
PARTS = {
    "R75": (1900, 2900, 90, "none"),
    "R76": (2250, 3050, 0, "none"),
    "Q7": (2600, 2900, 0, "none"),
    "D10": (2700, 2450, 90, "none"),
    "R74": (2700, 2050, 0, "none"),
    "R78": (1900, 3700, 90, "none"),
    "R79": (2250, 3550, 180, "none"),
    "Q8": (2600, 3700, 0, "x"),
    "D11": (2700, 4150, 270, "none"),
    "R77": (2700, 4550, 180, "none"),
    "J5": (3700, 2800, 0, "y"),
    "R70": (4300, 2650, 0, "none"),
    "C55": (4700, 2950, 0, "none"),
    "R71": (5200, 2800, 90, "none"),
    "J6": (3700, 3800, 180, "none"),
    "R72": (4300, 3950, 180, "none"),
    "C56": (4700, 3650, 180, "none"),
    "R73": (5200, 3800, 90, "none"),
}

# Offsets in mm, placed after renders. The first render put the caption over the 3V3_P row and
# 3V3_P's label across the rectangle's west edge; the rectangle and the west labels moved.
FIELDS = {
    "R75": above(4.445, 2.159),
    "R76": east(1.778),
    "Q7": east(5.08),
    "D10": east(3.81),
    "R74": east(1.778),
    "R78": below(2.159, 4.445),
    "R79": east(1.778),
    "Q8": east(5.08),
    "D11": east(3.81),
    "R77": east(1.778),
    "J5": above(5.08, 2.54),
    "R70": east(1.778),
    "C55": east(2.794),
    "R71": above(4.445, 2.159),
    "J6": below(3.81, 6.35),
    "R72": east(1.778),
    "C56": east(2.794),
    "R73": below(2.159, 4.445),
}
RECT = (12.7, 35.56, 182.88, 124.46)
TITLE = "h7-pedal: fsw_led"
PWR_FLAGS = 0
# FSW1, FSW2, LED1 and LED2 each reach one pin on this page (R71's 2, R73's 2, R75's 1, R78's 1), so
# copperhead drafted no wire for them and the draft gives them no stroke. By copperhead's own family
# rule (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: a family is two or more nets
# sharing the prefix before the first underscore) none of the four has an underscore, so none is in
# a family, and copperhead draws such a net in its default stroke (as FSW1_SW and FSW2_SW, each alone
# in its family, are on the draft). They take that default.
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
UNDRAWN_STROKES = {"FSW1": DEFAULT_STROKE, "FSW2": DEFAULT_STROKE, "LED1": DEFAULT_STROKE, "LED2": DEFAULT_STROKE}
