"""The h7-pedal codec page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/codec.ts`): U9 (U_CODEC, PCM3060PWR, `h7-platform:PCM3060PW`, in
hardware mode) with C36 and C37 (100 nF and 10 uF, VCC's 5V_A_CODEC to GND), C38 and C39 (100 nF and
10 uF, VDD's 3V3_CODEC to GND), C40 and C41 (100 nF and 10 uF, VCOM to GND); the straps R28 (220 k,
MODE to GND), R29 (4.7 k, MC/SCL/FMT to 3V3_CODEC) and R30 (4.7 k, MD/SDA/DEMP to GND), and
MS/ADR/IFMD (pin 27) straight to 3V3_CODEC; the 33 ohm series resistors R31 (BCK1 and BCK2 to
BCK_CODEC), R32 (LRCK1 and LRCK2 to LRCK_CODEC) and R33 (DOUT to DOUT_CODEC); SCKI1 and SCKI2 on
XO_OUT; DIN on DIN_CODEC; RST on CODEC_RST_N; VINL, VINR and VOUTL+/-, VOUTR+/- each to its label;
ZEROL and ZEROR (pins 13, 14) open; the four ground pins on GND.

U9 in the middle, unrotated. Its west side, north to south, carries the straps, RST, the analog
inputs and the SAI and clock pins; its east side the analog outputs, ZEROR and ZEROL, DOUT and VCOM:

- Over U9, the 3V3_CODEC rail runs west from VDD past R29 (up from the FMT row), the IFMD tap and C38
  and C39 (down to a GND run) to its label, pointing west; the 5V_A_CODEC row runs east from VCC past
  C36 and C37 (down to a GND run) to its label, pointing east.
- The west straps: FMT through R29 up to the rail; DEMP west to R30, which rises to the west GND run;
  IFMD west to a vertical up to the rail; RST west to CODEC_RST_N's label; MODE west to R28, which
  rises to the west GND run.
- VINL, VINR and DIN each west to its label, pointing west, close to U9.
- The SAI pairs: LRCK1 and LRCK2 join on the nearest column, which rises to a row west through R32
  to LRCK_CODEC's label; SCKI1 and SCKI2 on the next column, which drops to a row west to XO_OUT's
  label; BCK1 and BCK2 on the farthest, which runs west through R31 to BCK_CODEC's label.
- The east side: VOUTL+, VOUTL-, VOUTR+ and VOUTR- each east to its label; ZEROR and ZEROL carry
  no-connects; DOUT east through R33 to DOUT_CODEC's label; VCOM east past C40 and C41 (down to the
  GND row).
- GND: a vertical down the west side, west of the labels, from the west GND run to the GND row along
  the bottom, which takes U9's four ground pins, C40 and C41, and runs east to a vertical up to the east
  GND run; GND's label at the row's west end, pointing west.
- The population note under the band (`NOTES`).

THE FOUR CROSSINGS, each forced by U9's pin order (`RECORD.md` says why): on the west side the pins
run LRCK1, BCK1, SCKI1, DIN, LRCK2, BCK2, SCKI2, so each pair's join interleaves with the other two,
and three crossings are the fewest any join of the three pairs on that side can have (BCK1's run
over the LRCK column, SCKI1's over it, BCK2's over the SCKI column); and FMT and IFMD go to 3V3_CODEC
with DEMP, going to GND, between them, so IFMD's vertical crosses DEMP's row.

Symbol geometry (read from the draft's lib_symbols), at rotation 0, unmirrored, sheet coordinates:
h7-platform:PCM3060PW, every side pin 500 from the origin: west, north to south, 1 FMT 800 north, 2
DEMP 700, 27 IFMD 600, 15 RST 500, 28 MODE 400, 25 VINL 200, 26 VINR 100, 4 LRCK1 level, 5 BCK1 100
south, 6 SCKI1 200, 12 DIN 400, 11 LRCK2 500, 10 BCK2 600, 9 SCKI2 700; east, 20 VOUTL+ 500 north,
19 VOUTL- 400, 18 VOUTR+ 200, 17 VOUTR- 100, 14 ZEROR 100 south, 13 ZEROL 200, 3 DOUT 400, 21 VCOM
500; north (1100), 7 VDD 100 west, 24 VCC 100 east; south (1100), 8 DGND 200 west, 16 SGND 100 west,
23 AGND 100 east, 22 AGND 200 east. Device:R and Device:C pin 1 150 north, pin 2 150 south (at 90,
pin 1 west; at 180, pin 1 south; at 270, pin 1 east).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import east, fields, west  # noqa: E402

X_U9, Y_U9 = 5000, 3300
Y_RAIL = 1900        # the 3V3_CODEC rail (west) and the 5V_A_CODEC row (east)
Y_CAPGND = 2300      # the GND runs under the supply capacitors, west and east
Y_LEXIT = 3050       # the LRCK column's row west to R32
Y_BEXIT = 3650       # the BCK column's row west to R31
Y_SEXIT = 4300       # the SCKI column's row west to XO_OUT
Y_GND = 4900         # the GND row
X_COMB = 1500        # the west GND vertical, west of every label
X_GND_E = 7000       # the east GND vertical
X_IFMD = 4100        # IFMD's vertical up to the rail
X_COL_L = 3400       # LRCK1 and LRCK2's column
X_COL_S = 3300       # SCKI1 and SCKI2's column
X_COL_B = 3200       # BCK1 and BCK2's column
X_LABEL_NEAR = 4000  # RST's, VINL's, VINR's and DIN's labels
X_LABEL_W = 2400     # LRCK_CODEC's and BCK_CODEC's labels
X_LABEL_XO = 2900    # XO_OUT's label
X_LABEL_3V3 = 2300   # 3V3_CODEC's label
X_LABEL_GND = 1200   # GND's label
X_LABEL_VOUT = 6200  # the four VOUT labels and DOUT_CODEC's
X_LABEL_E = 6600     # 5V_A_CODEC's label

# ref: (x, y, rotation, mirror)
PARTS = {
    "U9": (X_U9, Y_U9, 0, "none"),
    "R29": (4300, 2350, 180, "none"),
    "R30": (3900, 2450, 180, "none"),
    "C38": (3150, 2050, 0, "none"),
    "C39": (2700, 2050, 0, "none"),
    "R28": (3300, 2750, 180, "none"),
    "R32": (2900, Y_LEXIT, 270, "none"),
    "R31": (2900, Y_BEXIT, 270, "none"),
    "C36": (5700, 2050, 0, "none"),
    "C37": (6150, 2050, 0, "none"),
    "R33": (5900, 3700, 90, "none"),
    "C40": (5700, 3950, 0, "none"),
    "C41": (6150, 3950, 0, "none"),
}

# Offsets in mm.
FIELDS = {
    "U9": fields((-12.7, 25.4, "right"), (-12.7, 27.94, "right")),
    "R29": east(1.778),
    "R30": west(1.778),
    "C38": east(2.794),
    "C39": east(2.794),
    "R28": west(1.778),
    "R32": fields((0, -4.445, None), (0, -2.159, None)),
    "R31": fields((0, -4.445, None), (0, -2.159, None)),
    "C36": east(2.794),
    "C37": east(2.794),
    "R33": fields((0, -4.445, None), (0, -2.159, None)),
    "C40": east(2.794),
    "C41": east(2.794),
}
RECT = (25.4, 38.1, 185.42, 129.54)
TITLE = "h7-pedal: codec"
PWR_FLAGS = 0

# The population note (`page.Wiring.note`, left-justified by `text_edits.py`): CR-PEDAL-POPULATION's
# class 1 requires the codec page to list the parts left out of the model and off the page, with
# CODEC-10's sheet note verbatim. Each part's line is its `what` from NOT_FITTED_PARTS
# (`circuits/h7-platform/pedal-population.ts`), and the last line is CODEC10_SHEET_NOTE;
# `tests/circuits/h7-pedal-codec-note.test.ts` holds the committed sheet's note to both.
NOTES = [
    ([
        "Not fitted, not modelled and not drawn (CR-PEDAL-POPULATION, class 1):",
        "- codec_mode_link: CODEC-06's 0 ohm from MODE (pin 28) to DGND, for the I2C option",
        "- codec_demp_pullup: CODEC-09's 4.7 kohm pull-up from MD/SDA/DEMP (pin 2) to VDD, the SDA pull-up for I2C mode",
        "- codec_scl_link: CODEC-10's 0 ohm from MC/SCL/FMT (pin 1) to EXP_I2C_SCL (contract pin 12)",
        "- codec_sda_link: CODEC-10's 0 ohm from MD/SDA/DEMP (pin 2) to EXP_I2C_SDA (contract pin 13)",
        "- codec_rst_pulldown: v1's R_RST_PD, 10 kohm from CODEC_RST_N to GND",
        "CODEC-10's sheet note:",
        "I2C mode = fit both links, fit MODE 0 Ω (CODEC-06) and remove the 220 kΩ, remove the pin-2 4.7 kΩ pull-down and fit the DNF pull-up.",
    ], (1000, 5700)),
]

# Eleven ports reach one pin each on this page (R31's, R32's and R33's pin 2, and U9's RST, DIN, VINL,
# VINR and the four VOUTs), so copperhead drafted no wire for them and the draft gives them no stroke.
# By copperhead's own family rule (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: two
# or more nets sharing the prefix before the first underscore, one palette colour per family), an
# undrawn net whose family has a drafted member takes that member's stroke, the draft's strokes being
# kept: CODEC_RST_N joins CODEC_DEMP, CODEC_FMT, CODEC_MODE and CODEC_VCOM, which the draft draws in
# the palette's first colour (30 90 200); BCK_CODEC, LRCK_CODEC and DOUT_CODEC join BCK_PIN, LRCK_PIN
# and DOUT_PIN, each alone in its family on the draft and drawn in the default stroke. DIN_CODEC,
# VINL, VINR and the four VOUTs share no prefix with another net (the VOUT names have no underscore):
# the default. A drawing choice, not a transcription.
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
UNDRAWN_STROKES = {
    "CODEC_RST_N": "(stroke (width 0.254) (type default) (color 30 90 200 1))",
    "BCK_CODEC": DEFAULT_STROKE,
    "LRCK_CODEC": DEFAULT_STROKE,
    "DOUT_CODEC": DEFAULT_STROKE,
    "DIN_CODEC": DEFAULT_STROKE,
    "VINL": DEFAULT_STROKE,
    "VINR": DEFAULT_STROKE,
    "VOUTL+": DEFAULT_STROKE,
    "VOUTL-": DEFAULT_STROKE,
    "VOUTR+": DEFAULT_STROKE,
    "VOUTR-": DEFAULT_STROKE,
}
