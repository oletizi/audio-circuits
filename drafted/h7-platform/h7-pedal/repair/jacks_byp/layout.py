"""The h7-pedal jacks_byp page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/jacks-byp.ts`): the input jacks J9 (J_IN_L, tip on IN_TIP_L)
and J10 (J_IN_R, tip on IN_TIP_R, its tip-normal TN on IN_TIP_L), the output jacks J11 (J_OUT_L, tip
on OUT_JACK_L) and J12 (J_OUT_R, tip on OUT_JACK_R), every sleeve on GND and every other contact
open (the intent's no-connects); the ESD diodes D12 to D15 (PESD12VL1BA), pin 1 on IN_TIP_L,
IN_TIP_R, OUT_JACK_L and OUT_JACK_R, pin 2 on GND; the relays K1 (K_BYP_IN) and K2 (K_BYP_OUT),
`Relay:G6K-2`: coil 1 on 3V3_P and 8 on RELAY_DRV, COM 3 and 6 on the jack nets, NC 2 and 7 on BYP_L
and BYP_R (K1 to K2), NO 4 and 5 on FX_IN_L and FX_IN_R (K1) and FX_OUT_L and FX_OUT_R (K2); Q10
(Q_BYP, AO3400A) drain RELAY_DRV, source GND, gate RELAY_GATE; R125 (R_RELAY_EN 3.9 k) from RELAY_EN
to the gate, R126 (R_BPD 15.0 k) from the gate to GND, Q11 (Q_PFG, AO3400A) drain on the gate, gate
PF_TRIP, source GND; per coil a 1N4148W (D16, D18) from RELAY_DRV to SUP_IN or SUP_OUT and a
BZT52C12 (D17, D19) from 3V3_P to the same node, cathode to cathode.

The page reads west to east along the audio path, the right channel above the left as the relays'
pin order puts it:

- The input jacks at the west, J10 (right) over J9 (left), pins facing east. J10 is unmirrored, so
  its pins read, north to south, S, SN, R, RN, T, TN; J9 is mirrored top to bottom, TN, T, RN, R, SN,
  S. J10's T runs straight east to K1's COM 6 (IN_TIP_R); J10's TN and J9's T join on a vertical and
  run east to K1's COM 3 (IN_TIP_L).
- K1 turned 90 and mirrored left to right, so its COM and coil-8 pins face west and its NC, NO and
  coil-1 pins face east; K2 turned 90 unmirrored, the same pins facing each other across the gap
  between them. Across the gap, north to south: FX_IN_R's and FX_OUT_R's labels, BYP_R straight from
  K1 to K2, FX_IN_L's and FX_OUT_L's labels, BYP_L straight, and the 3V3_P row from K1's coil to
  K2's.
- Each coil's suppressor hangs from the 3V3_P row near its relay: the BZT52C12 (anode up), then the
  1N4148W (anode down) onto the RELAY_DRV row under the relays. 3V3_P's label hangs between them,
  pointing down.
- RELAY_DRV: K1's coil 8 west and down, the row east under the gap past both suppressors and Q10's
  drain, and up to K2's coil 8 at the east.
- Under the RELAY_DRV row: Q10 upright, its gate row running west past R126 (down to GND), Q11's
  drain and R125, whose far end runs west to RELAY_EN's label; Q11's gate west to PF_TRIP's label.
- The output jacks at the east, J12 (right) over J11 (left), pins facing west: J12 mirrored left to
  right (S, ..., T, TN, north to south), J11 turned 180 (TN, T, ..., S). K2's COM 6 runs straight
  east to J12's T; K2's COM 3 east and down to J11's T.
- GND: a row along the bottom, the left jack's sleeve and the left channels' ESD diodes dropping
  to it, Q11, R126 and Q10 dropping to it from the driver; the upper jacks' sleeves and the right
  channels' ESD diodes rise to a short row over each upper jack, which runs to a vertical down each
  outer edge of the page to the bottom row; GND's label at the bottom row's west end, pointing west.

Symbol geometry (read from the draft's lib_symbols), at rotation 0, unmirrored, sheet coordinates:
Connector_Audio:NMJ6HCD2 every pin 200 east, S 200 north, SN 100 north, R level, RN 100 south, T 200
south, TN 300 south; Relay:G6K-2 north side (300 north) 1 at 400 west, 2 at 100 west, 4 at 100 east,
7 at 300 east, 5 at 500 east, south side (300 south) 8 at 400 west, 3 level, 6 at 400 east;
Transistor_FET:AO3400A 1 G 200 west, 3 D 100 east 200 north, 2 S 100 east 200 south;
h7-platform:PESD12VL1BA, Device:D_Zener and Diode:1N4148W pin 1 150 west, pin 2 150 east; Device:R
pin 1 150 north, pin 2 150 south. A rotation of 90 turns north to west; a mirror left to right
negates x after the rotation (`draughting/pages/pins.py`, which checks every pin against akcli).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, below, east, fields  # noqa: E402

Y_GND_TOP = 2300     # the short GND rows over the upper jacks
Y_TIP_R = 2900       # IN_TIP_R and OUT_JACK_R, straight from the upper jacks' T to the relays' COM 6
Y_TIP_L = 3300       # IN_TIP_L and OUT_JACK_L, at the relays' COM 3
Y_3V3 = 3700         # the 3V3_P row between the coils
Y_3V3_LABEL = 3850   # 3V3_P's label, hanging from the row
Y_DRV = 4400         # the RELAY_DRV row under the relays
Y_GATE = 4600        # RELAY_GATE, west from Q10's gate
Y_PF = 4800          # PF_TRIP, west from Q11's gate
Y_GND = 5200         # the GND row
X_GND_W = 1500       # the west GND vertical
X_GND_LABEL = 1300   # GND's label
X_SLEEVE_W = 2500    # the input jacks' sleeve runs turn here
X_TIP_L = 2700       # J10's TN and J9's T join on this vertical
X_ESD_W = 3200       # D12 and D13
X_DRV_W = 3800       # K1's coil 8 drops here to the RELAY_DRV row
X_LABEL_W = 4000     # RELAY_EN's and PF_TRIP's labels
X_FX_IN = 4800       # FX_IN_L's and FX_IN_R's labels
X_3V3_LABEL = 5650   # 3V3_P's label stub
X_FX_OUT = 6500      # FX_OUT_L's and FX_OUT_R's labels
X_DRV_E = 7500       # K2's coil 8 drops here to the RELAY_DRV row
X_ESD_E = 7800       # D14 and D15
X_TIP_L_E = 8800     # K2's COM 3 turns down to J11's T here
X_SLEEVE_E = 8900    # the output jacks' sleeve runs turn here
X_GND_E = 9900       # the east GND vertical

# ref: (x, y, rotation, mirror)
PARTS = {
    "J10": (2100, 2700, 0, "none"),
    "J9": (2100, 3900, 0, "x"),
    "D13": (X_ESD_W, 2750, 90, "none"),
    "D12": (X_ESD_W, 3450, 270, "none"),
    "K1": (4300, 3300, 90, "y"),
    "D17": (4800, 3850, 90, "none"),
    "D16": (4800, 4250, 270, "none"),
    "D19": (6500, 3850, 90, "none"),
    "D18": (6500, 4250, 270, "none"),
    "K2": (7000, 3300, 90, "none"),
    "R125": (4400, Y_GATE, 90, "none"),
    "Q11": (4900, 4800, 0, "none"),
    "R126": (5300, 4750, 0, "none"),
    "Q10": (5900, 4600, 0, "none"),
    "D15": (X_ESD_E, 2750, 90, "none"),
    "D14": (X_ESD_E, 3450, 270, "none"),
    "J12": (9300, 2700, 0, "y"),
    "J11": (9300, 3900, 180, "none"),
}

# Offsets in mm. The jacks' fields under their bodies; the relays' above theirs; the ESD diodes'
# east of the body; the suppressors' toward the middle of the gap (D16's and D17's east, D18's and
# D19's west) so 3V3_P's label hangs between them; Q11's west, under PF_TRIP's run; R125's on either
# side of its body, between the RELAY_DRV row and PF_TRIP's run. The first render had Q10's fields
# 3.81 mm east of its origin, over its drain's pin number; they moved to 6.35 mm.
FIELDS = {
    "J10": below(11.43, 13.97),
    "J9": below(8.89, 11.43),
    "D13": east(2.54),
    "D12": east(2.54),
    "K1": above(20.32, 17.78),
    "D17": east(2.54),
    "D16": east(2.54),
    "D19": fields((-2.54, -1.27, "right"), (-2.54, 1.27, "right")),
    "D18": fields((-2.54, -1.27, "right"), (-2.54, 1.27, "right")),
    "K2": above(20.32, 17.78),
    "R125": fields((0, -2.159, None), (0, 2.159, None)),
    "Q11": fields((-1.27, 3.81, "right"), (-1.27, 6.35, "right")),
    "R126": east(1.778),
    "Q10": fields((6.35, -1.27, "left"), (6.35, 1.27, "left")),
    "D15": east(2.54),
    "D14": east(2.54),
    "J12": below(11.43, 13.97),
    "J11": below(8.89, 11.43),
}
RECT = (20.32, 50.8, 256.54, 137.16)
TITLE = "h7-pedal: jacks_byp"
PWR_FLAGS = 0

# Six ports reach one pin each on this page (K1's and K2's NO pins 4 and 5, R125's pin 1 and Q11's
# gate), so copperhead drafted no wire for them and the draft gives them no stroke. By copperhead's
# own family rule (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: two or more nets
# sharing the prefix before the first underscore, one palette colour per family), an undrawn net
# whose family has a drafted member takes that member's stroke, the draft's strokes being kept:
# RELAY_EN joins RELAY_DRV and RELAY_GATE, which the draft draws in (210 120 0). FX_IN_L, FX_IN_R,
# FX_OUT_L and FX_OUT_R are a family with no drafted member, and PF_TRIP shares its prefix with no
# other net on the page: each takes the default, as the interface page's undrawn nets do. A drawing
# choice, not a transcription.
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
UNDRAWN_STROKES = {
    "RELAY_EN": "(stroke (width 0.254) (type default) (color 210 120 0 1))",
    "FX_IN_L": DEFAULT_STROKE,
    "FX_IN_R": DEFAULT_STROKE,
    "FX_OUT_L": DEFAULT_STROKE,
    "FX_OUT_R": DEFAULT_STROKE,
    "PF_TRIP": DEFAULT_STROKE,
}
