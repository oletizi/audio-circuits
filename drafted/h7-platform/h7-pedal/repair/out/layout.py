"""The h7-pedal out page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/out.ts`), per channel (left, then right): C82 and C88 (C_A+
10 uF) from VOUTx+ to OUT_AP_x, R113 and R119 (R_D1 20.0 k) to OUT_INV_x, U19's -IN; C83 and C89 (C_A-
10 uF) from VOUTx- to OUT_AM_x, R114 and R120 (R_D2 20.0 k) to OUT_NI_x, U19's +IN; R115 and R121
(R_FO 19.1 k) with C84 and C90 (C_FO 47 pF) from OUT_INV_x to OUT_OA_x, U19's OUT; R116 and R122 (R_GO
19.1 k) with C85 and C91 (C_GO 47 pF) from OUT_NI_x to VMID_x; R117 and R123 (R_S 100) from OUT_OA_x
to OUT_S_x; C86 and C92 (C_OUT 220 pF) from OUT_S_x to GND; C87 and C93 (C_DC 22 uF, + toward the
op-amp) from OUT_S_x to FX_OUT_x; R118 and R124 (R_B 100 k) from FX_OUT_x to GND; the output pads
TP11 and TP13 on FX_OUT_x and the GND pads TP12 and TP14. U19 (U_OUT, OPA1688, three units): unit A
the left stage, unit B the right; unit C V+ on VIN_A and V- on GND, with C94 and C95 (100 nF and
10 uF).

Two bands, the left channel above the right, each the same, read west to east:

- Into U19's +IN, the upper leg: VOUTx-'s label at the west, pointing west, C_A- and R_D2 onto the
  OUT_NI_x row, from which R_GO and C_GO rise side by side to the VMID_x row over it; VMID_x's label
  at that row's west end, pointing west.
- Into U19's -IN, the lower leg: VOUTx+'s label, C_A+ and R_D1 onto the OUT_INV_x node; from the node
  the feedback goes down and east under U19 through R_FO, with C_FO on a second loop below it, to the
  OUT_OA_x tap east of U19's OUT.
- U19's OUT east through R_S onto OUT_S_x, where C_OUT hangs to the band's GND row, through C_DC (+
  west) onto FX_OUT_x, which carries the output pad (rising) and R_B (hanging to the GND row), to
  FX_OUT_x's label, pointing east. The GND pad sits on the GND row under the output pad.
- U19's supply unit and its two capacitors east of the upper band, between a VIN_A row and the upper
  band's GND row; VIN_A's label at that row's east end. The two GND rows meet on a vertical down the
  east edge; GND's label at the lower row's east end, pointing east.

The legs follow AIO-15 as the model has it: VOUTx+ to the inverting input, VOUTx- to the
non-inverting. U19's units stay at rotation 0, unmirrored (`page.place_ops`), so +IN is over -IN and
the VOUTx- leg is the upper one.

Symbol geometry (read from the draft's lib_symbols), at rotation 0, unmirrored, sheet coordinates:
h7-platform:OPA1688xD units A and B +IN 300 west 100 north, -IN 300 west 100 south, OUT 300 east,
unit C V+ (8) 300 north and V- (4) 300 south; Device:R, Device:C and Device:C_Polarized (pin 1 the +
terminal) pin 1 150 north, pin 2 150 south (at 90, pin 1 west; at 180, pin 1 south);
Connector:TestPoint pin 1 at its origin, body north. U19's units are keyed `U19:<unit>`
(`draughting/pages/page.py`, `instance_key`).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import east, fields  # noqa: E402

# One band's rows; the right channel's band is DY lower.
DY = 2000
Y_VM = 1800          # the VMID_L row
Y_NI = 2300          # the OUT_NI_L row, U19A's +IN; also the VIN_A row
Y_OUT = 2400         # U19A's OUT, R_S, C_DC and FX_OUT_L
Y_INV = 2500         # the OUT_INV_L row, U19A's -IN
Y_FO = 2800          # R_FO's loop
Y_FO2 = 3100         # C_FO's loop
Y_GND = 2900         # the left band's GND row
X_LABEL_VOUT = 1300  # the VOUT labels
X_LABEL_VMID = 2400  # VMID_L's and VMID_R's labels
X_INV = 2650         # the OUT_INV_x node's tap into the feedback loops
X_OA = 4500          # the OUT_OA_x tap
X_LABEL_FX = 6900    # FX_OUT_L's and FX_OUT_R's labels
X_GND_E = 9000       # the east GND vertical
X_LABEL_VIN = 9000   # VIN_A's label
X_LABEL_GND = 9400   # GND's label

PARTS = {}
FIELDS = {}
# (band offset, C_A+, C_A-, R_D1, R_D2, R_FO, C_FO, R_GO, C_GO, R_S, C_OUT, C_DC, R_B, out pad, GND pad, unit)
BANDS = (
    (0, "C82", "C83", "R113", "R114", "R115", "C84", "R116", "C85", "R117", "C86", "C87", "R118", "TP11", "TP12",
     "U19:1"),
    (DY, "C88", "C89", "R119", "R120", "R121", "C90", "R122", "C91", "R123", "C92", "C93", "R124", "TP13", "TP14",
     "U19:2"),
)
for dy, c_ap, c_am, r_d1, r_d2, r_fo, c_fo, r_go, c_go, r_s, c_out, c_dc, r_b, tp_out, tp_gnd, unit in BANDS:
    # The two legs' rows are 200 mil apart, U19's +IN to -IN. The first render had C_A- straight over
    # C_A+, their plates 40 mil apart and reading as one part; C_A+ moved 300 mil east of C_A-, and R_D1
    # 100 mil east with it.
    PARTS[c_am] = (1650, Y_NI + dy, 90, "none")
    PARTS[r_d2] = (2300, Y_NI + dy, 90, "none")
    PARTS[c_ap] = (1950, Y_INV + dy, 90, "none")
    PARTS[r_d1] = (2400, Y_INV + dy, 90, "none")
    PARTS[r_go] = (2800, 2150 + dy, 180, "none")
    PARTS[c_go] = (3300, 2150 + dy, 180, "none")
    PARTS[unit] = (4000, Y_OUT + dy, 0, "none")
    PARTS[r_fo] = (3400, Y_FO + dy, 90, "none")
    PARTS[c_fo] = (3400, Y_FO2 + dy, 90, "none")
    PARTS[r_s] = (4900, Y_OUT + dy, 90, "none")
    PARTS[c_out] = (5300, 2550 + dy, 0, "none")
    PARTS[c_dc] = (5800, Y_OUT + dy, 90, "none")
    PARTS[tp_out] = (6200, Y_OUT + dy, 0, "none")
    PARTS[r_b] = (6500, 2550 + dy, 0, "none")
    PARTS[tp_gnd] = (6200, Y_GND + dy, 0, "none")
    # Offsets in mm. The upper leg's fields above it and the lower leg's below it; R_GO's and C_GO's
    # east of their bodies; each op-amp unit's centred above its body; R_FO's above its loop and
    # C_FO's below; the output row's horizontal parts' above them, the hanging parts' east of their
    # bodies; the output pad's east of its circle, the GND pad's west of its.
    FIELDS[c_am] = fields((0, -5.334, None), (0, -3.048, None))
    FIELDS[r_d2] = fields((0, -4.445, None), (0, -2.159, None))
    FIELDS[c_ap] = fields((0, 3.048, None), (0, 5.334, None))
    FIELDS[r_d1] = fields((0, 2.159, None), (0, 4.445, None))
    FIELDS[r_go] = east(1.778)
    FIELDS[c_go] = east(2.794)
    FIELDS[unit] = fields((0, -10.16, None), (0, -7.62, None))
    FIELDS[r_fo] = fields((0, -4.445, None), (0, -2.159, None))
    FIELDS[c_fo] = fields((0, 3.048, None), (0, 5.334, None))
    FIELDS[r_s] = fields((0, -4.445, None), (0, -2.159, None))
    FIELDS[c_out] = east(2.794)
    FIELDS[c_dc] = fields((0, -5.334, None), (0, -3.048, None))
    FIELDS[tp_out] = fields((1.27, -5.08, "left"), (1.27, -2.794, "left"))
    FIELDS[r_b] = east(1.778)
    FIELDS[tp_gnd] = fields((-1.27, -5.08, "right"), (-1.27, -2.54, "right"))
PARTS["U19:3"] = (7800, 2600, 0, "none")
PARTS["C94"] = (8200, 2600, 0, "none")
PARTS["C95"] = (8600, 2600, 0, "none")
FIELDS["U19:3"] = fields((-3.81, -1.27, "right"), (-3.81, 1.27, "right"))
FIELDS["C94"] = east(2.794)
FIELDS["C95"] = east(2.794)
RECT = (17.78, 38.1, 246.38, 142.24)
TITLE = "h7-pedal: out"
PWR_FLAGS = 0

# Four ports reach one pin each on this page (C82's, C83's, C88's and C89's pin 1), so copperhead
# drafted no wire for them and the draft gives them no stroke. Their names have no underscore, so by
# copperhead's own family rule (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: two or
# more nets sharing the prefix before the first underscore, one palette colour per family) each is a
# family of one, drawn in the default stroke, as the codec page's VOUT nets are. A drawing choice,
# not a transcription.
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
UNDRAWN_STROKES = {"VOUTL+": DEFAULT_STROKE, "VOUTL-": DEFAULT_STROKE, "VOUTR+": DEFAULT_STROKE,
                   "VOUTR-": DEFAULT_STROKE}
