"""The h7-pedal codec_sup page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/codec-sup.ts`): U6 (U_CVDD, TPS7A2433DBVR: IN and EN on
5V_A_CODEC, OUT on 3V3_CODEC, GND, pin 4 NC open) with C32 (C_CVDDIN 1 uF, 5V_A_CODEC to GND) and C33
(C_CVDDOUT 1 uF, 3V3_CODEC to GND); D6 (D_CVCL, PMEG4005AEA: anode 3V3_CODEC, cathode 5V_A_CODEC); R26
(R_CBLD 3.60 k, 3V3_CODEC to GND); U7 (U_XO, the SG-210STF on the SG-5032CAN stand-in symbol: ST and
VCC on 3V3_CODEC, GND, OUT on XO_OUT) with C34 (C_XO 100 nF); U8 (U_CRST, TLV803EA29: VDD on
3V3_CODEC, GND, open-drain RESET on CODEC_RST_N) with C35 (C_CRST 100 nF); R27 (R_CRST 4.70 k,
CODEC_RST_N to 3V3_CODEC); Q5 (Q_PFR, AO3400A: drain on CODEC_RST_N, gate PF_TRIP, source GND).

One band, read west to east along the 3V3_CODEC rail:

- 5V_A_CODEC enters at the west, its label pointing west, and runs east past C32 (down to GND) into
  U6's IN; U6's EN joins the row just west of IN. D6 sits over U6, from a tap on the 5V_A_CODEC row
  (its cathode, west) to a tap on the 3V3_CODEC rail (its anode, east), so the clamp reads across
  the regulator it clamps.
- U6's OUT starts the 3V3_CODEC rail, which runs east past C33 and R26 (down to GND), C34, U7 (VCC
  straight up to the rail, ST up to it from the west), C35, U8 (VDD straight up) and R27 (up from
  the CODEC_RST_N row) to 3V3_CODEC's label at the east end, pointing east.
- U7's OUT runs east to XO_OUT's label, pointing east, before C35.
- U8's RESET starts the CODEC_RST_N row, which runs east past R27 and Q5's drain to its label at the
  east end, pointing east. Q5's gate takes PF_TRIP from a label west of it, pointing west.
- The GND row runs under the band, from GND's label at the west, pointing west, to Q5's source.

Symbol geometry (read from the draft's lib_symbols), at rotation 0, unmirrored, sheet coordinates:
h7-platform:TPS7A2433DBV IN (1) 300 west, 100 north; EN (3) 300 west; GND (2) 300 south; NC (4) 300
east, 100 south; OUT (5) 300 east, 100 north. Device:D_Schottky K (1) 150 west, A (2) 150 east.
Oscillator:SG-5032CAN ST (1) 300 west; GND (2) 300 south; OUT (3) 300 east; VCC (4) 300 north.
h7-platform:TLV803EA30DBZR GND (1) 300 south; RESET (2) 400 east; VDD (3) 300 north.
Transistor_FET:AO3400A G (1) 200 west; S (2) 100 east, 200 south; D (3) 100 east, 200 north.
Device:R and Device:C pin 1 150 north, pin 2 150 south (at 180, pin 1 south).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, east, fields  # noqa: E402

Y_CLAMP = 1600     # D6's row, over U6
Y_RAIL = 2000      # the 5V_A_CODEC row (west of U6) and the 3V3_CODEC rail (east of it)
Y_EN = 2100        # U6's EN
Y_RST = 2300       # XO_OUT's row, and the CODEC_RST_N row
Y_GATE = 2500      # Q5's gate, PF_TRIP
Y_GND = 2800       # the GND row
X_LABEL_W = 1200   # 5V_A_CODEC's and GND's labels
X_CLAMP_K = 2500   # D6's cathode tap on the 5V_A_CODEC row
X_EN = 2700        # U6's EN joins the 5V_A_CODEC row
X_CLAMP_A = 3650   # D6's anode tap on the 3V3_CODEC rail
X_XO_LABEL = 5900  # XO_OUT's label
X_PF_LABEL = 8350  # PF_TRIP's label
X_LABEL_E = 9600   # 3V3_CODEC's and CODEC_RST_N's labels

# ref: (x, y, rotation, mirror)
PARTS = {
    "C32": (1800, 2150, 0, "none"),
    "D6": (3100, Y_CLAMP, 0, "none"),
    "U6": (3100, 2100, 0, "none"),
    "C33": (3900, 2150, 0, "none"),
    "R26": (4300, 2150, 0, "none"),
    "C34": (4700, 2150, 0, "none"),
    "U7": (5300, 2300, 0, "none"),
    "C35": (6700, 2150, 0, "none"),
    "U8": (7300, 2300, 0, "none"),
    "R27": (8200, 2150, 180, "none"),
    "Q5": (8700, 2500, 0, "none"),
}

# Offsets in mm.
FIELDS = {
    "C32": east(2.794),
    "D6": above(6.35, 3.81),
    "U6": fields((0, -6.35, None), (0, 9.525, None)),
    "C33": east(2.794),
    "R26": east(1.778),
    "C34": east(2.794),
    "U7": fields((0, -10.16, None), (0, 10.16, None)),
    "C35": east(2.794),
    "U8": fields((3.81, -6.35, "left"), (3.81, 10.16, "left")),
    "R27": east(1.778),
    "Q5": east(5.08),
}
RECT = (25.4, 25.4, 251.46, 76.2)
TITLE = "h7-pedal: codec_sup"
PWR_FLAGS = 0

# Two ports reach one pin each on this page (Q5's gate and U7's OUT), so copperhead drafted no wire
# for them and the draft gives them no stroke. By copperhead's own family rule
# (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: two or more nets sharing the prefix
# before the first underscore), PF_TRIP and XO_OUT each share their prefix with no other net on this
# page, as do the four nets the draft draws (all in the default stroke), so both take the default.
# A drawing choice, not a transcription.
UNDRAWN_STROKES = {
    "PF_TRIP": "(stroke (width 0.254) (type default))",
    "XO_OUT": "(stroke (width 0.254) (type default))",
}
