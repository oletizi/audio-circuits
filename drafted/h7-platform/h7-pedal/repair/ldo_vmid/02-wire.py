"""Write op-list 02 for the h7-pedal ldo_vmid page (`draughting/pages/page.py`, `Wiring`).

The rows and columns are `layout.py`'s. VIN_A runs east along its row from its label, taking C25,
the riser into U4's IN and EN, C30, C31, U5's V+ and R22. GND runs east along its row from its label,
taking C25, U4's GND and PowerPAD (one point), C27, R20, C26, C30, C31, U5's V-, R23 and C29. 5V_A runs
from U4's OUT east to its label, taking R19, C28, C26, TP5 and R21; 5V_A_CODEC from R21's foot to its
label. LDO_FB runs from U4's FB down to the FB row and east under R19 and C28, R20 hanging from it;
LDO_NR from U4's NR/SS to C27, whose drop to GND crosses the FB row. VMID runs from R22's foot east
through a node to R24, taking R23 and C29, and from the node down to R25; VMID_IN_L and VMID_IN_R
join each resistor to its unit's +IN. VMID_L and VMID_R run from each unit's OUT east to its label,
and from a node back down, west under the body and up into its -IN. U4's NC (3) and DNC (7) are the
intent's no-connects. Every segment ends at the next tap, since a wire end inside another segment is
refused.

usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out> > 02-wire.json
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / "draughting" / "pages"))
sys.path.insert(0, str(HERE.parent / "tools"))
sys.path.insert(0, str(HERE))
import page  # noqa: E402
import title_block  # noqa: E402
from layout import (TITLE, X_EAST, X_FB, X_LOOP_E, X_LOOP_W, X_NODE, X_OUT, X_VTAP, X_WEST,  # noqa: E402
                    Y_5V, Y_CODEC, Y_FB, Y_GND, Y_LOOP_A, Y_LOOP_B, Y_VIN, Y_VMID)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])

# VIN_A: the row from its label east to R22, a drop to each tap, and the riser into IN and EN.
drops = ["C25.1", "C30.1", "C31.1", "U5.8", "R22.1"]
w.path("VIN_A", (X_WEST, Y_VIN), (w.x("C25.1"), Y_VIN), (X_VTAP, Y_VIN),
       *[(w.x(pin), Y_VIN) for pin in drops[1:]])
w.label("VIN_A", (X_WEST, Y_VIN), 180)
for pin in drops:
    w.path("VIN_A", (w.x(pin), Y_VIN), pin)
w.path("VIN_A", (X_VTAP, Y_VIN), (X_VTAP, w.y("U4.8")), (X_VTAP, w.y("U4.5")), "U4.5")
w.path("VIN_A", (X_VTAP, w.y("U4.8")), "U4.8")

# GND: the row from its label east to C29, and a drop from each tap.
hang = ["C25.2", "U4.4", "C27.2", "R20.2", "C26.2", "C30.2", "C31.2", "U5.4", "R23.2", "C29.2"]
w.path("GND", (X_WEST, Y_GND), *[(w.x(pin), Y_GND) for pin in hang])
w.label("GND", (X_WEST, Y_GND), 180)
for pin in hang:
    w.path("GND", pin, (w.x(pin), Y_GND))

# 5V_A: OUT east to its label, R19, C28, C26 and R21 hanging from it, TP5 on it.
taps = ["R19.1", "C28.1", "C26.1"]
w.path("5V_A", "U4.1", *[(w.x(pin), Y_5V) for pin in taps], "TP5.1", (w.x("R21.1"), Y_5V), (X_OUT, Y_5V))
w.label("5V_A", (X_OUT, Y_5V), 0)
for pin in taps + ["R21.1"]:
    w.path("5V_A", (w.x(pin), Y_5V), pin)

# 5V_A_CODEC: R21's foot down and east to its label.
w.path("5V_A_CODEC", "R21.2", (w.x("R21.2"), Y_CODEC), (X_OUT, Y_CODEC))
w.label("5V_A_CODEC", (X_OUT, Y_CODEC), 0)

# LDO_FB: FB east and down to the FB row, then east under R19 and C28; R20 hangs from it.
w.path("LDO_FB", "U4.2", (X_FB, w.y("U4.2")), (X_FB, Y_FB), (w.x("R19.2"), Y_FB), (w.x("C28.2"), Y_FB))
w.path("LDO_FB", (w.x("R19.2"), Y_FB), "R19.2")
w.path("LDO_FB", (w.x("C28.2"), Y_FB), "C28.2")
w.path("LDO_FB", (w.x("R20.1"), Y_FB), "R20.1")

# LDO_NR: NR/SS east to C27.
w.path("LDO_NR", "U4.6", "C27.1")

# VMID: R22's foot down to the row, east through R23's and C29's taps and the node to R24; the node
# down to R25.
w.path("VMID", "R22.2", (w.x("R22.2"), Y_VMID), (w.x("R23.1"), Y_VMID), (w.x("C29.1"), Y_VMID),
       (X_NODE, Y_VMID), "R24.1")
for pin in ("R23.1", "C29.1"):
    w.path("VMID", (w.x(pin), Y_VMID), pin)
w.path("VMID", (X_NODE, Y_VMID), (X_NODE, w.y("R25.1")), "R25.1")

# VMID_IN_L and VMID_IN_R: each resistor to its unit's +IN.
w.path("VMID_IN_L", "R24.2", "U5.3")
w.path("VMID_IN_R", "R25.2", "U5.5")

# VMID_L and VMID_R: each OUT east to its label; from the node, the loop under the body into -IN.
for net, out, minus, loop in (("VMID_L", "U5.1", "U5.2", Y_LOOP_A), ("VMID_R", "U5.7", "U5.6", Y_LOOP_B)):
    y = w.y(out)
    w.path(net, out, (X_LOOP_E, y), (X_EAST, y))
    w.label(net, (X_EAST, y), 0)
    w.path(net, (X_LOOP_E, y), (X_LOOP_E, loop), (X_LOOP_W, loop), (X_LOOP_W, w.y(minus)), minus)
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
