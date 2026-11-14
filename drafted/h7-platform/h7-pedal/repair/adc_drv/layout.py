"""The h7-pedal adc_drv page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/adc-drv.ts`), per channel (left, then right): C72 and C76
(C_AC 22 uF, + toward IN_FOLLOW_x) to ADC_AC_x; R103 and R108 (R_IN 10.0 k) to ADC_INV_x, U18's -IN;
R104 and R109 (R_FA 10.0 k) with C73 and C77 (C_FA 47 pF) across them from ADC_INV_x to ADC_OUT_x,
U18's OUT; R105 and R110 (R_VBIAS_TOP 2.00 k) from 5V_A to VBIAS_x, R106 and R111 (R_VBIAS_BOT
2.00 k) and C74 and C78 (C_VBIAS 10 uF) from VBIAS_x to GND, VBIAS_x on U18's +IN; R107 and R112 (R_O
100) from ADC_OUT_x to VINL or VINR, with C75 and C79 (C_VIN 2.2 nF) from there to GND. U18 (U_ADC,
OPA1688, three units): unit A the left stage, unit B the right; unit C V+ on 5V_A and V- on GND, with
C80 and C81 (100 nF and 10 uF).

Two bands, the left channel above the right, each the same, read west to east:

- Over each band, its 5V_A row and, under that, its GND row. R_VBIAS_TOP hangs from the 5V_A row
  west of where the GND row starts, and drops to the VBIAS_x row; R_VBIAS_BOT and C_VBIAS rise from the
  VBIAS_x row to the GND row; the VBIAS_x row runs east into U18's +IN.
- Under the VBIAS_x row, the input row: IN_FOLLOW_x's label at the west, pointing west, then C_AC,
  R_IN and the ADC_INV_x node into U18's -IN. From the node, the feedback goes down and east under U18
  through R_FA, with C_FA on a second loop below it, to the ADC_OUT_x tap east of U18's OUT.
- U18's OUT east through R_O onto VINx, where C_VIN rises to the GND row, and on to VINx's label,
  pointing east.
- U18's supply unit and its two capacitors between the left band's 5V_A and GND rows, east of the
  outputs. 5V_A's two rows meet on a vertical down the west edge, west of the input labels; GND's two
  rows on a vertical down the east edge, east of the VIN labels. 5V_A's label at the upper row's east
  end and GND's at the lower GND row's east end, each pointing east.

Why the rails are above each band: U18's units stay at rotation 0, unmirrored (`page.place_ops`),
so +IN (VBIAS_x) is over -IN (the input row) on the unit's west side, and the bias divider's 5V_A
and GND ends both lie on the far side of VBIAS_x from the input row. With both rows above it,
neither divider end crosses the input row.

Symbol geometry (read from the draft's lib_symbols), at rotation 0, unmirrored, sheet coordinates:
h7-platform:OPA1688xD units A and B +IN 300 west 100 north, -IN 300 west 100 south, OUT 300 east,
unit C V+ (8) 300 north and V- (4) 300 south; Device:R, Device:C and Device:C_Polarized (pin 1 the +
terminal) pin 1 150 north, pin 2 150 south (at 90, pin 1 west; at 180, pin 1 south). U18's units are
keyed `U18:<unit>` (`draughting/pages/page.py`, `instance_key`).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import east, fields  # noqa: E402

# One band's rows, as offsets from the band's 5V_A row; the right channel's band is DY lower.
DY = 2300
Y_5V = 1600          # the left band's 5V_A row
Y_GND = 2200         # the left band's GND row
Y_VB = 2700          # the left band's VBIAS_L row, U18A's +IN
Y_IN = 2900          # the left band's input row, U18A's -IN
Y_OUT = 2800         # U18A's OUT, R_O and VINL
Y_FB = 3200          # R_FA's loop
Y_FB2 = 3500         # C_FA's loop
X_5V_W = 800         # the west 5V_A vertical
X_LABEL_IN = 1500    # IN_FOLLOW_L's and IN_FOLLOW_R's labels
X_INV = 2900         # the ADC_INV_x node's tap into the feedback loops
X_TOP = 3100         # R_VBIAS_TOP
X_BOT = 3500         # R_VBIAS_BOT; each GND row starts here
X_CVB = 4000         # C_VBIAS
X_FB = 4200          # R_FA and C_FA
X_OUT = 5300         # the ADC_OUT_x tap
X_VIN = 6300         # C_VIN
X_LABEL_VIN = 6700   # VINL's and VINR's labels
X_GND_E = 8700       # the east GND vertical
X_LABEL_5V = 8700    # 5V_A's label
X_LABEL_GND = 9100   # GND's label

PARTS = {}
FIELDS = {}
# (band offset, C_AC, R_IN, R_FA, C_FA, R_TOP, R_BOT, C_VBIAS, R_O, C_VIN, unit)
BANDS = (
    (0, "C72", "R103", "R104", "C73", "R105", "R106", "C74", "R107", "C75", "U18:1"),
    (DY, "C76", "R108", "R109", "C77", "R110", "R111", "C78", "R112", "C79", "U18:2"),
)
for dy, c_ac, r_in, r_fa, c_fa, r_top, r_bot, c_vb, r_o, c_vin, unit in BANDS:
    PARTS[c_ac] = (1900, Y_IN + dy, 90, "none")
    PARTS[r_in] = (2500, Y_IN + dy, 90, "none")
    PARTS[r_top] = (X_TOP, 1950 + dy, 0, "none")
    PARTS[r_bot] = (X_BOT, 2450 + dy, 180, "none")
    PARTS[c_vb] = (X_CVB, 2450 + dy, 180, "none")
    PARTS[unit] = (4800, Y_OUT + dy, 0, "none")
    PARTS[r_fa] = (X_FB, Y_FB + dy, 90, "none")
    PARTS[c_fa] = (X_FB, Y_FB2 + dy, 90, "none")
    PARTS[r_o] = (5800, Y_OUT + dy, 90, "none")
    PARTS[c_vin] = (X_VIN, 2650 + dy, 180, "none")
    # Offsets in mm. The horizontal parts' fields above them (C_FA's below its loop); the vertical
    # parts' east of their bodies; each op-amp unit's centred above its body.
    FIELDS[c_ac] = fields((0, -5.334, None), (0, -3.048, None))
    FIELDS[r_in] = fields((0, -4.445, None), (0, -2.159, None))
    FIELDS[r_top] = east(1.778)
    FIELDS[r_bot] = east(1.778)
    FIELDS[c_vb] = east(2.794)
    FIELDS[unit] = fields((0, -10.16, None), (0, -7.62, None))
    FIELDS[r_fa] = fields((0, -4.445, None), (0, -2.159, None))
    FIELDS[c_fa] = fields((0, 3.048, None), (0, 5.334, None))
    FIELDS[r_o] = fields((0, -4.445, None), (0, -2.159, None))
    FIELDS[c_vin] = east(2.794)
PARTS["U18:3"] = (7100, 1900, 0, "none")
PARTS["C80"] = (7900, 1900, 0, "none")
PARTS["C81"] = (8300, 1900, 0, "none")
FIELDS["U18:3"] = east(2.54)
FIELDS["C80"] = east(2.794)
FIELDS["C81"] = east(2.794)
# The first render had U18C's fields over C80; C80, C81, the east GND vertical and both rail labels
# moved 400 mil east.
RECT = (17.78, 33.02, 238.76, 154.94)
TITLE = "h7-pedal: adc_drv"
PWR_FLAGS = 0

# Two ports reach one pin each on this page (C72's and C76's pin 1), so copperhead drafted no wire
# for them and the draft gives them no stroke. By copperhead's own family rule
# (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: two or more nets sharing the prefix
# before the first underscore, one palette colour per family), an undrawn net whose family has a
# drafted member takes that member's stroke. IN_FOLLOW_L and IN_FOLLOW_R are a family with no drafted
# member on this page: each takes the default, as the interface page's undrawn nets do. A drawing
# choice, not a transcription.
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
UNDRAWN_STROKES = {"IN_FOLLOW_L": DEFAULT_STROKE, "IN_FOLLOW_R": DEFAULT_STROKE}
