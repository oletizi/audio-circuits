"""The h7-pedal in_fe page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/in-fe.ts`), per channel (left first, then right): R95 and R99
(R_RF 1.0 k) from FX_IN_x to IN_RF_x; on IN_RF_x, C62 and C66 (C_RF 100 pF) and R96 and R100 (R_PD
22 M) to GND, and the input pads TP7 and TP9; C63 and C67 (C_IN 47 nF) from IN_RF_x to IN_AC_x; R97
and R101 (R_DIV1 1.50 M) from IN_AC_x to node T, IN_T_x, with C64 and C68 (C_COMP 110 pF) across them;
R98 and R102 (R_DIV2 1.00 M) from node T to VMID_x; C65 and C69 (C_T 160 pF) from node T to GND; U17
(U_IN, OPA1688, three units) A = left and B = right, each a unity follower with +IN on node T and OUT
and -IN on IN_FOLLOW_x; its supply unit on VIN_A and GND with C70 and C71 (100 nF and 10 uF); the GND
pads TP8 and TP10.

Two channel rows read west to east, the left above the right, with one GND row between them:

- Each channel from FX_IN_x's label at the west, pointing west, through R_RF onto IN_RF_x, which
  carries the input pad and C_RF and R_PD to the GND row; through C_IN onto IN_AC_x; through R_DIV1,
  with C_COMP on a loop beside it (above it on the left channel, below on the right), onto node T,
  which carries R_DIV2 (its far end west to VMID_x's label, pointing west) and C_T to the GND row; and
  into U17's +IN. U17's OUT runs east to IN_FOLLOW_x's label, pointing east, and loops back under (or
  over) the body into -IN.
- The right channel is the left one turned about the GND row: its hanging parts rise to the row, its
  pad hangs below its row. U17's units stay at rotation 0 (`page.place_ops`), so the right
  channel's follower loop runs under its body, as the left's does. The right channel's C_RF, R_PD and
  C_T sit 100 mil east of the left's, so no point on the GND row takes four wires.
- The GND row from GND's label at the west, pointing west, past the two GND pads (TP8 up, TP10 down)
  and the channels' drops, east to the supply unit's V- and the two decoupling capacitors, which hang
  from the VIN_A row over it; VIN_A's label at that row's east end, pointing east.

Symbol geometry (read from the draft's lib_symbols), at rotation 0, unmirrored, sheet coordinates:
h7-platform:OPA1688xD units A and B +IN 300 west 100 north, -IN 300 west 100 south, OUT 300 east,
unit C V+ (8) 300 north and V- (4) 300 south; Device:R and Device:C pin 1 150 north, pin 2 150 south
(at 90, pin 1 west; at 180, pin 1 south); Connector:TestPoint pin 1 at its origin, body north (at 180,
south). U17's units are keyed `U17:<unit>` (`draughting/pages/page.py`, `instance_key`).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import east, fields  # noqa: E402

Y_L = 2300          # the left channel's row
Y_COMP_L = 2000     # C64's loop over R97
Y_VMID_L = 2600     # R98's far end west to VMID_L's label
Y_LOOP_L = 2700     # U17A's follower loop under its body
Y_GND = 2900        # the GND row
Y_VMID_R = 3200     # R102's far end west to VMID_R's label
Y_R = 3500          # the right channel's row
Y_COMP_R = 3800     # C68's loop under R101
Y_LOOP_R = 3900     # U17B's follower loop under its body
Y_VIN = 2300        # the VIN_A row over the supply unit
X_FX = 1300         # FX_IN_L's and FX_IN_R's labels
X_GND_LABEL = 1600  # GND's label
X_AC = 3650         # IN_AC_x's tap into C_COMP's loop
X_T = 4350          # node T's tap into C_COMP's loop
X_VMID = 4350       # VMID_L's and VMID_R's labels
X_LOOP_W = 5600     # the follower loops rise into -IN here
X_LOOP_E = 6500     # the follower loops leave the outputs here
X_FOLLOW = 6900     # IN_FOLLOW_L's and IN_FOLLOW_R's labels
X_VIN_LABEL = 9500  # VIN_A's label

# key: (x, y, rotation, mirror); a multi-unit part's units as <ref>:<unit>
PARTS = {
    "R95": (1700, Y_L, 90, "none"),
    "TP7": (2100, Y_L, 0, "none"),
    "C62": (2400, 2450, 0, "none"),
    "R96": (2800, 2450, 0, "none"),
    "C63": (3300, Y_L, 90, "none"),
    "C64": (4000, Y_COMP_L, 90, "none"),
    "R97": (4000, Y_L, 90, "none"),
    "R98": (4600, 2450, 0, "none"),
    "C65": (5100, 2450, 0, "none"),
    "U17:1": (6000, 2400, 0, "none"),
    "TP8": (2000, Y_GND, 0, "none"),
    "TP10": (2200, Y_GND, 180, "none"),
    "R99": (1700, Y_R, 90, "none"),
    "TP9": (2100, Y_R, 180, "none"),
    "C66": (2500, 3350, 180, "none"),
    "R100": (2900, 3350, 180, "none"),
    "C67": (3300, Y_R, 90, "none"),
    "C68": (4000, Y_COMP_R, 90, "none"),
    "R101": (4000, Y_R, 90, "none"),
    "R102": (4600, 3350, 180, "none"),
    "C69": (5200, 3350, 180, "none"),
    "U17:2": (6000, 3600, 0, "none"),
    "U17:3": (7900, 2600, 0, "none"),
    "C70": (8700, 2600, 0, "none"),
    "C71": (9100, 2600, 0, "none"),
}

# Offsets in mm. The horizontal parts' fields over the left channel's row and under the right's
# (C_COMP's on the far side of its loop, R_DIV1's on the near side); the hanging parts' east of their
# bodies; the signal pads' east of their circles, the GND pads' west of theirs; U17A's and U17B's
# centred above the body; the supply unit's and decoupling capacitors' east of their bodies. The
# first render had the horizontal capacitors' fields on their plates (moved 0.889 mm out), TP10's
# Reference on the GND row and TP8's Value by GND's label (each moved 1.27 mm off the row), and
# U17C's fields over C70 (C70, C71 and VIN_A's label moved 400 mil east). The second had TP7's Value
# on the IN_RF_L row; TP7's fields moved 1.27 mm up.
FIELDS = {
    "R95": fields((0, -4.445, None), (0, -2.159, None)),
    "TP7": fields((1.27, -5.08, "left"), (1.27, -2.794, "left")),
    "C62": east(2.794),
    "R96": east(1.778),
    "C63": fields((0, -5.334, None), (0, -3.048, None)),
    "C64": fields((0, -5.334, None), (0, -3.048, None)),
    "R97": fields((0, 2.159, None), (0, 4.445, None)),
    "R98": east(1.778),
    "C65": east(2.794),
    "U17:1": fields((0, -10.16, None), (0, -7.62, None)),
    "TP8": fields((-1.27, -5.08, "right"), (-1.27, -2.54, "right")),
    "TP10": fields((-1.27, 3.81, "right"), (-1.27, 6.35, "right")),
    "R99": fields((0, 2.159, None), (0, 4.445, None)),
    "TP9": fields((1.27, 1.27, "left"), (1.27, 3.81, "left")),
    "C66": east(2.794),
    "R100": east(1.778),
    "C67": fields((0, 3.048, None), (0, 5.334, None)),
    "C68": fields((0, 3.048, None), (0, 5.334, None)),
    "R101": fields((0, -4.445, None), (0, -2.159, None)),
    "R102": east(1.778),
    "C69": east(2.794),
    "U17:2": fields((0, -10.16, None), (0, -7.62, None)),
    "U17:3": east(2.54),
    "C70": east(2.794),
    "C71": east(2.794),
}
RECT = (17.78, 40.64, 251.46, 106.68)
TITLE = "h7-pedal: in_fe"
PWR_FLAGS = 0

# Four ports reach one pin each on this page (R95's and R99's pin 1, R98's and R102's pin 2), so
# copperhead drafted no wire for them and the draft gives them no stroke. By copperhead's own family
# rule (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: two or more nets sharing the
# prefix before the first underscore, one palette colour per family), an undrawn net whose family has
# a drafted member takes that member's stroke. FX_IN_L and FX_IN_R are a family, and VMID_L and
# VMID_R another, with no drafted member on this page: each takes the default, as the interface page's
# undrawn nets do. A drawing choice, not a transcription.
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
UNDRAWN_STROKES = {"FX_IN_L": DEFAULT_STROKE, "FX_IN_R": DEFAULT_STROKE, "VMID_L": DEFAULT_STROKE,
                   "VMID_R": DEFAULT_STROKE}
