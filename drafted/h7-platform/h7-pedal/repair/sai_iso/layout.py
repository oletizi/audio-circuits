"""The h7-pedal sai_iso page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/sai-iso.ts`): U10 (U_ISO_M, SN74LVC3G34DCTR, four units: gate
1 DOUT_CODEC to ISO_DOUT, gate 2 LRCK_CODEC to ISO_LRCK, gate 3 BCK_CODEC to ISO_BCK, the supply unit
on 3V3_D and GND) with C42 (100 nF, 3V3_D to GND); R34, R35 and R36 (47 k, each gate's input to
GND); R37, R38 and R39 (470 ohm, each ISO_ output to the contract nets CODEC_DOUT, CODEC_LRCK and
CODEC_BCK); U11 (U_ISO_C, SN74LVC1G34DBVR: A on CODEC_DIN, Y on DIN_CODEC, VCC on 3V3_CODEC, GND,
pin 1 no internal connection) with C43 (100 nF, 3V3_CODEC to GND) and R40 (47 k, CODEC_DIN to GND).

U10's units follow the project symbol's numbering (CR-PEDAL-SYMBOL-SN74LVC3G34): unit 1 is gate 1
(pins 1, 7), unit 2 is gate 3 (pins 6, 2), unit 3 is gate 2 (pins 3, 5), unit 4 the supply (GND 4,
VCC 8). A multi-unit part's units stay at rotation 0, unmirrored (`draughting/pages/page.py`,
`place_ops`).

Four signal rows stacked, each read west to east, the codec side's three to-module signals first in
architecture.md line 255's order (DOUT, LRCK, BCK), then DIN, the module's signal to the codec:

- Each to-module row: its codec-side label at the west, pointing west, past its 47 k bias (hanging
  down) into its gate; the gate's output through its 470 ohm to the contract net's label at the east,
  pointing east.
- The DIN row: CODEC_DIN's label at the west past R40 (hanging down) into U11's A; U11's Y east to
  DIN_CODEC's label. U11 is mirrored top to bottom, so its GND (and its no-connect pin 1) face up and
  its VCC down.
- GND: a comb down the west side, west of the labels, takes each bias resistor's run (R36's shares
  U11's GND run) down to a GND row along the bottom, which runs east past C43, U10's supply unit and
  C42 to GND's label at its east end, pointing east.
- Under the DIN row, the 3V3_CODEC row from U11's VCC west past C43 (down to GND) to its label,
  pointing west; east of it, U10's supply unit with VCC up to the 3V3_D row, which runs east past C42
  (down to GND) to its label, pointing east.

Symbol geometry (read from the draft's lib_symbols), at rotation 0, unmirrored, sheet coordinates:
h7-platform:SN74LVC3G34DCT gate units A 600 west, Y 500 east; the supply unit VCC (8) 400 north, GND
(4) 400 south. h7-platform:SN74LVC1G34DBV A (2) 600 west; Y (4) 500 east; VCC (5) 200 west, 400
north; GND (3) 200 west, 400 south; pin 1 100 west, 400 south (mirrored top to bottom, north and
south swap). Device:R and Device:C pin 1 150 north, pin 2 150 south (at 90, pin 1 west).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, east, fields, west  # noqa: E402

Y_DOUT = 1800      # gate 1, DOUT
Y_LRCK = 2600      # gate 2, LRCK
Y_BCK = 3400       # gate 3, BCK
Y_U11_GND = 3800   # U11's GND (and R36's) run to the comb
Y_DIN = 4200       # U11, DIN
Y_3V3C = 4900      # the 3V3_CODEC row
Y_3V3D = 4500      # the 3V3_D row
Y_GND = 5300       # the GND row
X_COMB = 1100      # the GND comb
X_LABEL_W = 2000   # the west labels
X_BIAS = 2400      # the bias resistors
X_LABEL_E = 5300   # the contract nets' and DIN_CODEC's labels
X_LABEL_SUPPLY = 7000  # 3V3_D's and GND's labels

# ref: (x, y, rotation, mirror)
PARTS = {
    "U10:1": (3500, Y_DOUT, 0, "none"),
    "U10:3": (3500, Y_LRCK, 0, "none"),
    "U10:2": (3500, Y_BCK, 0, "none"),
    "U10:4": (5800, 4900, 0, "none"),
    "R34": (X_BIAS, Y_DOUT + 150, 0, "none"),
    "R35": (X_BIAS, Y_LRCK + 150, 0, "none"),
    "R36": (X_BIAS, Y_BCK + 150, 0, "none"),
    "R37": (4500, Y_DOUT, 90, "none"),
    "R38": (4500, Y_LRCK, 90, "none"),
    "R39": (4500, Y_BCK, 90, "none"),
    "U11": (3500, Y_DIN, 0, "x"),
    "R40": (X_BIAS, Y_DIN + 150, 0, "none"),
    "C43": (2700, Y_3V3C + 150, 0, "none"),
    "C42": (6200, Y_3V3D + 150, 0, "none"),
}

# Offsets in mm.
FIELDS = {
    "U10:1": above(10.16, 7.62),
    "U10:3": above(10.16, 7.62),
    "U10:2": above(10.16, 7.62),
    "U10:4": west(6.35),
    "R34": east(1.778),
    "R35": east(1.778),
    "R36": east(1.778),
    "R37": above(4.445, 2.159),
    "R38": above(4.445, 2.159),
    "R39": above(4.445, 2.159),
    "U11": fields((7.62, 2.54, "left"), (7.62, 5.08, "left")),
    "R40": east(1.778),
    "C43": east(2.794),
    "C42": east(2.794),
}
RECT = (20.32, 27.94, 193.04, 139.7)
TITLE = "h7-pedal: sai_iso"
PWR_FLAGS = 0

# Four ports reach one pin each on this page (R37's, R38's and R39's pin 2, and U11's Y), so copperhead
# drafted no wire for them and the draft gives them no stroke. By copperhead's own family rule
# (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: two or more nets sharing the prefix
# before the first underscore, one palette colour per family), CODEC_DOUT, CODEC_LRCK and CODEC_BCK
# share the prefix CODEC with CODEC_DIN, which the draft does draw, alone in that family on the draft,
# in the default stroke; the draft's strokes are kept, so the three take CODEC_DIN's default and the
# family stays one stroke. DIN_CODEC shares its prefix with no other net: the default. A drawing
# choice, not a transcription.
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
UNDRAWN_STROKES = {
    "CODEC_DOUT": DEFAULT_STROKE,
    "CODEC_LRCK": DEFAULT_STROKE,
    "CODEC_BCK": DEFAULT_STROKE,
    "DIN_CODEC": DEFAULT_STROKE,
}
