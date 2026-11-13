"""The h7-pedal expr_ref page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/expr-ref.ts`): J4 (J_EXP, NMJ6HCD2: T on EXP_TIP_J, R on
EXP_RING, S on GND, RN on EXP_RN, TN and SN not connected); the tip chain D7 (D_ESD_TIP), R44 (R_TIP
22.0 k), C45 (1 nF) and R45 (10 M) to GND, R46 (R_EXPIN 2.2 M), U13 (U_EXP, MCP6001, a follower on
VREF_A) with C46 (100 nF at VDD), R47 (1.00 k) and C47 (100 nF) to EXPR_TIP; plug detect R48 (1 k) to
EXPR_DETECT with R49 (100 k) to GND; the ring D8 (D_ESD_RING) and C44 (100 nF) to GND, fed through R43
(R_REF 3.30 k) from REF_OUT, the blocking network's output: U12 (U_REFBLK, LM66100; VIN on VREF_A, CE
on REF_CE, VOUT on REF_OUT, GND, N/C and ST on GND), D9 (D_RCLAMP, cathode on REF_OUT), R42 (R_CE
100 k, REF_OUT to REF_CE), Q6 (Q_REFEN, 2N7002: drain on REF_CE, source on GND, gate on REF_ENG) and
R41 (R_ENG 100 k, VREF_A to REF_ENG); the HW_REV divider R50 (20.0 k) from VREF_A, R51 (2.49 k) and
C48 (100 nF) to GND.

J4 at the west, mirrored top to bottom so its pins read, north to south, TN, T, RN, R, SN, S. Three
bands run east from it:

- The tip, at the top: J4's T rises to the tip row, which runs east past D7 (down to GND), through
  R44, past C45 and R45 (down to GND), through R46 into U13's + input. U13's output runs east past
  the feedback tap through R47 to EXPR_TIP's label, pointing east, with C47 down to GND; the feedback
  runs from the tap down under U13 and back up into its - input. The tip band's GND row runs under
  it. U13's VDD rises to the VREF_A row along the top, with C46 hanging from that row west of U13.
- Plug detect, in the middle: J4's RN runs straight east to R48 and on to EXPR_DETECT's label,
  pointing east; R49 rises from that row to the tip band's GND row.
- The ring and the blocking network, at the bottom, read east to west: VREF_A comes down a vertical
  east of the labels into U12's VIN (U12 mirrored left to right, so VOUT faces west), REF_OUT runs
  west from VOUT past D9 (down to GND) and through R43 to the ring row, past C44 and D8 (down to GND)
  to J4's R, which drops to it. U12's N/C, ST and GND join under it; its CE row runs east to Q6's
  drain (Q6 mirrored left to right, gate east), whose gate takes R41 from the VREF_A vertical; R42
  runs from REF_OUT down under U12 and up into the CE row. The bottom GND row runs under the band,
  from GND's label at the west, pointing west; J4's S drops to it.
- East of the labels: the VREF_A vertical, from the top row down to R41; then a GND vertical joining
  the tip band's GND row to the bottom one; then the HW_REV divider hanging from the VREF_A row (R50
  down to the HW_REV node, R51 and C48 down to the tip band's GND row), HW_REV's label east of it,
  pointing east, and VREF_A's label at the top row's east end, pointing east.

THE FOUR CROSSINGS, each forced by the parts' pin order (`RECORD.md` says why for each): C46's GND
lead crosses the row into U13's + input; the follower's feedback, run under U13, crosses U13's VSS
lead; the tip band's GND row crosses the VREF_A vertical on its way to the GND vertical; R42's
under-run crosses U12's GND lead.

Symbol geometry (read from the draft's lib_symbols), at rotation 0, unmirrored:
Connector_Audio:NMJ6HCD2 every pin 200 east: S 200 north, SN 100 north, R level, RN 100 south, T 200
south, TN 300 south. h7-platform:PESD12VL1BA and Device:D_Schottky pin 1 150 west, pin 2 150 east (at
270, pin 1 north). h7-platform:MCP6001T-OT VOUT (1) 300 east; VIN+ (3) 300 west, 100 north; VIN- (4)
300 west, 100 south; VDD (5) 100 west, 300 north; VSS (2) 100 west, 300 south.
h7-platform:LM66100DCK VIN (1) 300 west, 100 north; CE (3) 300 west, 100 south; GND (2) 300 south;
VOUT (6) 300 east, 100 north; N/C (4) 300 east; ST (5) 300 east, 100 south (mirrored left to right,
east and west swap). Transistor_FET:2N7002 G (1) 200 west; S (2) 100 east, 200 south; D (3) 100 east,
200 north (mirrored left to right, G east, S and D 100 west). Device:R and Device:C pin 1 150 north,
pin 2 150 south (at 90, pin 1 west; at 180, pin 1 south; at 270, pin 1 east).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, below, east, fields, west  # noqa: E402

Y_VREF = 1400      # the VREF_A row along the top
Y_TIP = 1900       # the tip row (U13's + input)
Y_BUF = 2000       # U13's output row, R47, EXPR_TIP
Y_HW = 2000        # the HW_REV node row
Y_FB = 2450        # the follower's feedback, under U13
Y_GND_TIP = 2600   # the tip band's GND row
Y_DET = 3000       # J4's RN, R48, EXPR_DETECT
Y_RING = 3600      # the ring row and REF_OUT (U12's VOUT, VIN)
Y_CE = 3800        # U12's CE row to Q6's drain
Y_UGND = 4050      # where U12's N/C, ST and GND leads join
Y_R42 = 4150       # R42's run under U12
Y_GND = 4400       # the bottom GND row
X_GND_LABEL = 1400  # GND's label
X_LEAD_S = 1800    # J4's S lead down to the bottom GND row
X_LEAD_T = 1800    # J4's T lead up to the tip row
X_LEAD_R = 1900    # J4's R lead down to the ring row
X_FB_W = 4600      # the feedback's west vertical, into U13's - input
X_BUF = 5400       # the feedback tap on U13's output row
X_LABEL_E = 6500   # EXPR_TIP's and EXPR_DETECT's labels
X_R42_DOWN = 5150  # R42's run leaves REF_OUT here
X_UGND = 5300      # U12's N/C and ST leads join here
X_VREF_E = 7700    # the VREF_A vertical
X_GND_E = 8000     # the GND vertical
X_HW_LABEL = 9200  # HW_REV's label
X_VREF_LABEL = 9200  # VREF_A's label

# ref: (x, y, rotation, mirror)
PARTS = {
    "J4": (1400, 3100, 0, "x"),
    "D7": (2100, 2050, 270, "none"),
    "R44": (2600, 1900, 90, "none"),
    "C45": (3100, 2050, 0, "none"),
    "R45": (3600, 2050, 0, "none"),
    "R46": (4100, 1900, 90, "none"),
    "C46": (4500, 1650, 0, "none"),
    "U13": (5000, 2000, 0, "none"),
    "R47": (5800, 2000, 90, "none"),
    "C47": (6200, 2150, 0, "none"),
    "R48": (5650, 3000, 90, "none"),
    "R49": (6000, 2850, 180, "none"),
    "D8": (2200, 3750, 270, "none"),
    "C44": (3200, 3750, 0, "none"),
    "R43": (3850, 3600, 270, "none"),
    "D9": (4200, 3750, 270, "none"),
    "U12": (5700, 3700, 0, "y"),
    "R42": (6200, 4000, 180, "none"),
    "Q6": (6700, 4000, 0, "y"),
    "R41": (7200, 4000, 270, "none"),
    "R50": (8400, 1700, 0, "none"),
    "R51": (8400, 2300, 0, "none"),
    "C48": (8800, 2300, 0, "none"),
}

# Offsets in mm. The first render (parts closer together) had long values running into the next
# part (D8's into C44, D9's into U12, U13's into R47's): the parts were spread east and the fields
# moved; each long-valued part has its fields east with room to its next neighbour. The second render
# had R41's fields below it, 77 mil over Q6's value; they moved above.
FIELDS = {
    "J4": below(8.89, 11.43),
    "D7": above(8.89, 6.35),
    "R44": below(2.159, 4.445),
    "C45": east(2.794),
    "R45": east(1.778),
    "R46": below(2.159, 4.445),
    "C46": west(2.794),
    "U13": fields((2.54, -8.89, "left"), (2.54, -6.35, "left")),
    "R47": below(2.159, 4.445),
    "C47": east(2.794),
    "R48": above(4.445, 2.159),
    "R49": east(1.778),
    "D8": east(2.54),
    "C44": east(2.794),
    "R43": above(4.445, 2.159),
    "D9": east(2.54),
    "U12": fields((0, -10.16, None), (0, -7.62, None)),
    "R42": west(1.778),
    "Q6": fields((2.54, 3.81, "left"), (2.54, 6.35, "left")),
    "R41": above(4.445, 2.159),
    "R50": east(1.778),
    "R51": east(1.778),
    "C48": east(2.794),
}
RECT = (25.4, 25.4, 248.92, 116.84)
TITLE = "h7-pedal: expr_ref"
PWR_FLAGS = 0
