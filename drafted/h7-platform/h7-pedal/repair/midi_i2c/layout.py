"""The h7-pedal midi_i2c page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/midi-i2c.ts`): the MIDI OUT driver, U16 (U_MIDIDRV,
SN74LVC1G07) with C61 (C_MIDIDRV) and R86 (R_TXPU 18.0 k, MIDI_UART_TX to 3V3_D); Q9 (Q_MIDI, AO3401A,
source on 3V3_P) with R87 (R_MGP 160, gate to 3V3_P); R88-R91 (RA, four 130 in parallel, drain to
MIDI_PIN4); R92 (RC 10, MIDI_PIN5 to GND); J8 (J_MIDI, the not-fitted 1 x 4 MIDI UART header:
3V3_D, MIDI_UART_TX, MIDI_UART_RX, GND); R93 and R94 (the I2C expansion pull-ups, 2.40 k to 3V3_D);
TP6 (the 3V3_D test pad).

The page reads west to east along the MIDI OUT chain: MIDI_UART_TX's label at the west, the TX row
east past R86 (standing up to the top 3V3_D row) and J8's TX riser into U16's A; U16's Y east on the
gate row past C61 and R87 (standing up to the 3V3_P row) into Q9's gate. Q9 is mirrored top to
bottom so its source is up, on the 3V3_P row, and its drain down, on the drain row, from which the
four RA resistors hang to the MIDI_PIN4 row; MIDI_PIN4's label is at the east edge, pointing east,
toward the connector no source names. MIDI_PIN5's label under it, pointing east, goes west to R92,
which hangs to the GND row along the bottom.

Below the TX row, at the west: the lower 3V3_D row from 3V3_D's label, with R93 and R94 hanging from
it to the SCL and SDA rows (their labels at the west, pointing west) and TP6 under it, ending in J8's
3V3_D riser. J8 is turned so its four pins point up, 3V3_D, TX, RX and GND west to east: TX rises to
the TX row, RX rises and runs east to its label, GND rises one step and runs east to U16's GND drop.
The lower 3V3_D row joins the top one by a vertical west of MIDI_UART_TX's label. The page note sits
under the GND row.

The one crossing, forced by where the pins are: the MIDI OUT chain runs from the west edge to the
east edge, U16's VCC is above it and its GND below, so C61 (from 3V3_D to GND at U16) crosses it;
its GND drop crosses the gate row east of U16.

Symbol geometry (read from the draft's lib_symbols), at rotation 0, unmirrored:
h7-platform:SN74LVC1G07DBV A (2) 600 mil west, Y (4) 500 east, VCC (5) 200 west and 400 north, GND
(3) 200 west and 400 south, NC (1) 100 west and 400 south. Transistor_FET:AO3401A G (1) 200 west,
S (2) 100 east and 200 south, D (3) 100 east and 200 north (mirrored top to bottom, S north, D
south). Connector_Generic:Conn_01x04 pins 1 to 4 200 mil west, 100 north to 200 south (turned 270 and
mirrored left to right: 200 north, 100 west to 200 east, 1 to 4). Device:R and Device:C pin 1 150
north, pin 2 150 south (at 180, pin 1 south). Connector:TestPoint its pin at the origin, the body
north (at 180, south).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, below, east, fields, west  # noqa: E402

Y_3V3P = 2000      # the 3V3_P row
Y_3V3D = 2300      # the top 3V3_D row
Y_TX = 2800        # the TX row and the gate row
Y_3V3D_LOW = 3100  # the lower 3V3_D row; RX's run east, level with it
Y_SCL = 3400       # the SCL row
Y_J8_GND = 3300    # J8's GND runs east to U16's GND drop
Y_DRAIN = 3200     # the drain row
Y_PIN4 = 3500      # the MIDI_PIN4 row
Y_SDA = 3700       # the SDA row
Y_PIN5 = 3800      # the MIDI_PIN5 row
Y_GND = 4100       # the GND row
X_LABEL_W = 900    # 3V3_D's, and GND's, labels
X_3V3_W = 1100     # the vertical joining the lower 3V3_D row to the top one
X_I2C_LABEL = 1300  # the SCL and SDA labels
X_TX_LABEL = 1900  # MIDI_UART_TX's label
X_RX_LABEL = 3100  # MIDI_UART_RX's label
X_3V3P_LABEL = 5100  # 3V3_P's label
X_EAST = 8000      # MIDI_PIN4's and MIDI_PIN5's labels

# ref: (x, y, rotation, mirror)
PARTS = {
    "R86": (2300, 2650, 180, "none"),
    "R93": (1500, 3250, 180, "none"),
    "R94": (1800, 3250, 180, "none"),
    "TP6": (2100, 3100, 180, "none"),
    "J8": (2700, 3600, 270, "y"),
    "U16": (4200, 2800, 0, "none"),
    "C61": (4900, 2450, 0, "none"),
    "R87": (5300, 2650, 180, "none"),
    "Q9": (5800, 2800, 0, "x"),
    "R88": (6200, 3350, 0, "none"),
    "R89": (6600, 3350, 0, "none"),
    "R90": (7000, 3350, 0, "none"),
    "R91": (7400, 3350, 0, "none"),
    "R92": (7700, 3950, 0, "none"),
}

# Offsets in mm, placed after renders: U16's west of its VCC pin, above its A pin (the first render
# had them east of VCC, across C61's); RA's resistors 400 mil apart (at 300 each Value ran into the
# next body). KiCad centres a multi-line note on its point vertically, so the note's point is set
# below the GND row by half the note's height (the first render, at 4500, overlapped the row). J8's
# fields read right-justified, ending under its east end: J8 is mirrored left to right, and since the
# Task 9a fix round `text_edits.py` swaps a mirrored part's justification so that what is written here
# is what the page shows (until then this entry said "left", and the page read right-justified).
FIELDS = {
    "R86": east(1.778),
    "R93": west(1.778),
    "R94": east(1.778),
    "TP6": fields((1.27, 3.81, "left"), (1.27, 6.35, "left")),
    "J8": fields((7.62, 2.54, "right"), (7.62, 5.08, "right")),
    "U16": fields((-8.89, -8.89, "right"), (-8.89, -6.35, "right")),
    "C61": east(2.794),
    "R87": east(1.778),
    "Q9": east(5.08),
    "R88": east(1.778),
    "R89": east(1.778),
    "R90": east(1.778),
    "R91": east(1.778),
    "R92": west(1.778),
}
RECT = (17.78, 43.18, 220.98, 109.22)
TITLE = "h7-pedal: midi_i2c"
PWR_FLAGS = 0

# The page note (`page.Wiring.note`, left-justified by `text_edits.py`): what the block leaves
# undrawn and why, and that J8 is not fitted (the brief for Task 9a; CR-PEDAL-MIDI,
# CR-PEDAL-POPULATION). Each line names the ruling or open row that holds it.
NOTES = [
    ([
        "Not drawn on this page:",
        "- The MIDI OUT loop's connector and the CA-033 ferrites at it: no source names the connector",
        "  or its pinout (CR-PEDAL-MIDI; open row MIDI-OUT-CONNECTOR). MIDI_PIN4 and MIDI_PIN5 run on",
        "  to it as ports of the board.",
        "- The MIDI IN receiver and its network, until open row MIDI-IN-RECEIVER-STOCK closes",
        "  (CR-PEDAL-MIDI). MIDI_UART_RX reaches only J8 pin 3 here.",
        "- An I2C expansion connector: no source names one (CR-PEDAL-I2C-EXPANSION; open row",
        "  I2C-EXPANSION-CONNECTOR).",
        "J8, the MIDI UART header (USB-08, OWN-04), is drawn and is NOT FITTED (CR-PEDAL-POPULATION, class 2).",
    ], (1000, 4900)),
]

# Four ports reach one pin each on this page (R92's 1, J8's 3, R93's 1 and R94's 1), so copperhead
# drafted no wire for them and the draft gives them no stroke. By copperhead's own family rule
# (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: two or more nets sharing the prefix
# before the first underscore, families sorted by prefix, one palette colour each), MIDI_PIN5 and
# MIDI_UART_RX are in the MIDI family, which the draft draws in the palette's second colour, so they
# take it. EXP_I2C_SCL and EXP_I2C_SDA would be a family of their own, EXP; had copperhead drafted
# them it would sort between 3V3 (the first colour) and MIDI and take the second, moving MIDI to the
# third. The draft's colours are kept, so EXP takes the palette's third colour (0 130 120), the next
# one no family on this page uses. A drawing choice, not a transcription.
MIDI_STROKE = "(stroke (width 0.254) (type default) (color 130 50 170 1))"
EXP_STROKE = "(stroke (width 0.254) (type default) (color 0 130 120 1))"
UNDRAWN_STROKES = {
    "MIDI_PIN5": MIDI_STROKE,
    "MIDI_UART_RX": MIDI_STROKE,
    "EXP_I2C_SCL": EXP_STROKE,
    "EXP_I2C_SDA": EXP_STROKE,
}
