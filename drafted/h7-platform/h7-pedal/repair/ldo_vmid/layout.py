"""The h7-pedal ldo_vmid page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/ldo-vmid.ts`): U4 (U_LDO, TPS7A4901) makes 5V_A from VIN_A,
IN and EN on VIN_A, NC (3) and DNC (7) no-connects; C25 (C_LIN) on VIN_A; R19 (R_LDOT) and R20
(R_LDOB) the feedback divider, C28 (C_FF) from OUT to FB, C27 (C_NR) on NR/SS, C26 (C_LOUT) on 5V_A,
TP5 its test pad; R21 (R_5VA) from 5V_A to 5V_A_CODEC. R22 and R23 (R_VMID_TOP, R_VMID_BOTTOM)
divide VIN_A to VMID, C29 (C_VMID) at the node; R24 and R25 (R_VMID_IN_L, R_VMID_IN_R) feed U5's
two followers (OPA1688, unit A to VMID_L, unit B to VMID_R); U5's supply unit on VIN_A and GND with
C30 and C31 (C_VMID_HF, C_VMID_BULK).

The page is one band between a VIN_A row on top and a GND row at the bottom, both from their
hierarchical labels at the west edge, read west to east as two sections. The LDO: C25 across the
rows by the labels; a riser from VIN_A into U4's IN and EN; U4's OUT east on the 5V_A row, with R19,
C28, C26, TP5 and R21 on it and 5V_A's label at the section's east end; R21 down onto the
5V_A_CODEC row and its label under 5V_A's. U4's FB drops and runs east on the FB row under R19 and
C28, R20 hanging from it to GND; C27 hangs from NR/SS to GND and crosses the FB row (one crossing:
NR/SS sits between OUT and FB on the symbol, inside the loop OUT-R19-FB). VMID: C30, C31 and U5's
supply unit across the rows; R22 from VIN_A down to the VMID row, R23 and C29 hanging from it; the
VMID row runs east through R24 into unit A's +IN, and drops at a node to the row through R25 into
unit B's +IN; each unit's output runs east to its label, with its follower loop back under the body
into its -IN.

Symbol geometry (read from the draft's lib_symbols), at rotation 0: Device:R and Device:C pin 1
150 mil north, pin 2 150 mil south (at 90, pin 1 west and pin 2 east); h7-platform:TPS7A4901DGN IN
(8), NC (3), EN (5) 300 mil west at 100 north, 0 and 100 south, OUT (1), NR/SS (6), FB (2) 300 east
likewise, DNC (7) 300 north, GND (4) and PowerPAD (9) both 300 south; h7-platform:OPA1688xD units A
and B +IN 300 west 100 north, -IN 300 west 100 south, OUT 300 east, unit C V+ 300 north and V- 300
south; Connector:TestPoint pin 1 at its origin, body north. U5's units are keyed `U5:<unit>`
(`draughting/pages/page.py`, `instance_key`).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, east, fields  # noqa: E402

Y_VIN = 2400       # the VIN_A row
Y_5V = 2900        # U4's OUT east: the 5V_A row
Y_VMID = 3000      # R22's foot east through R24 into U5A's +IN: the VMID row
Y_FB = 3500        # the FB row under R19 and C28
Y_CODEC = 3500     # R21's foot east to 5V_A_CODEC's label
Y_LOOP_A = 3400    # U5A's follower loop under its body
Y_LOOP_B = 4200    # U5B's
Y_GND = 4500       # the GND row
X_WEST = 1300      # the VIN_A and GND labels
X_VTAP = 1950      # VIN_A's riser into U4's IN and EN
X_FB = 2800        # U4's FB drop
X_OUT = 5500       # the 5V_A and 5V_A_CODEC labels
X_NODE = 8700      # the VMID row's drop to R25
X_LOOP_W = 9050    # the follower loops rise here into -IN
X_LOOP_E = 9800    # the follower loops leave the outputs here
X_EAST = 10000     # the VMID_L and VMID_R labels

# key: (x, y, rotation, mirror); a multi-unit part's units as <ref>:<unit>
PARTS = {
    "C25": (1650, 3450, 0, "none"),
    "U4": (2400, 3000, 0, "none"),
    "C27": (2950, 3150, 0, "none"),
    "R19": (3400, 3200, 0, "none"),
    "R20": (3400, 3800, 0, "none"),
    "C28": (3850, 3200, 0, "none"),
    "C26": (4300, 3500, 0, "none"),
    "TP5": (4700, Y_5V, 0, "none"),
    "R21": (5100, 3200, 0, "none"),
    "C30": (6250, 3450, 0, "none"),
    "C31": (6650, 3450, 0, "none"),
    "U5:3": (7100, 3400, 0, "none"),
    "R22": (7650, 2700, 0, "none"),
    "R23": (7950, 3450, 0, "none"),
    "C29": (8350, 3450, 0, "none"),
    "R24": (8900, Y_VMID, 90, "none"),
    "R25": (8900, 3800, 90, "none"),
    "U5:1": (9400, 3100, 0, "none"),
    "U5:2": (9400, 3900, 0, "none"),
}

# Offsets in mm. The hanging parts' fields east of the body; R24's and R25's centred above their
# rows; U4's centred above its body, under the VIN_A row; TP5's east of its circle above the row
# (the modsw page's TP4); U5's units: A's and B's centred above the body, C's east of it. The first
# render, with C31 at 6600, U5C at 6950, C29 at 8300 and the node at 8650, showed C31's Value against
# U5C's V- pin and R23's Value against C29's plate; the second, C30's Value against C31's plate.
FIELDS = {
    "C25": east(2.794),
    "U4": fields((0, -12.7, None), (0, -10.16, None)),
    "C27": east(2.794),
    "R19": east(1.778),
    "R20": east(1.778),
    "C28": east(2.794),
    "C26": east(2.794),
    "TP5": fields((1.27, -3.81, "left"), (1.27, -1.27, "left")),
    "R21": east(1.778),
    "C30": east(2.794),
    "C31": east(2.794),
    "U5:3": east(2.54),
    "R22": east(1.778),
    "R23": east(1.778),
    "C29": east(2.794),
    "R24": above(5.08, 2.54),
    "R25": above(5.08, 2.54),
    "U5:1": fields((0, -10.16, None), (0, -7.62, None)),
    "U5:2": fields((0, -10.16, None), (0, -7.62, None)),
}
RECT = (21.59, 53.34, 264.16, 119.38)
TITLE = "h7-pedal: ldo_vmid"
PWR_FLAGS = 0
# Three nets reach no wire on the draft: 5V_A_CODEC reaches one pin on this page (R21's pin 2), so
# copperhead drafted nothing for it; VMID_L and VMID_R join each unit's OUT to its own -IN, and the
# draft carries no wire on either. By copperhead's own family rule
# (`draughting/copperhead/src/kicad/draft/engine.ts`, netColorsOf: two or more nets sharing the
# prefix before the first underscore), VMID_L and VMID_R are of the draft's VMID family with
# VMID_IN_L and VMID_IN_R, which the draft draws in palette colour 2 (130 50 170), so they take it.
# 5V_A_CODEC's prefix is 5V, 5V_A's; the draft draws 5V_A, alone in that family on the draft, in the
# default stroke, so 5V_A_CODEC takes the default too. Drawing choices, not transcriptions.
UNDRAWN_STROKES = {
    "5V_A_CODEC": "(stroke (width 0.254) (type default))",
    "VMID_L": "(stroke (width 0.254) (type default) (color 130 50 170 1))",
    "VMID_R": "(stroke (width 0.254) (type default) (color 130 50 170 1))",
}
