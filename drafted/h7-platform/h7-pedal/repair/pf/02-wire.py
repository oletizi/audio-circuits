"""Write op-list 02 for the h7-pedal pf page (`draughting/pages/page.py`, `Wiring`).

The rows and columns are `layout.py`'s. 5V_A runs east along its row from its label, taking C9,
C11, MR's riser, U1's VDD, R5 and U2's VCC. GND runs east along its row from its label, taking C9,
C11, D3, R4, C8, C10, U1's GND, R6, U2's GND and R7. VIN is one stub from its label to R2. PF_CLAMP
runs from R2 to R3 with D3's riser; PF_SENSE from R3 east to U1's SENSE, tapped by R4 and C8; PF_CT
from U1's CT to C10; PF_OK from U1's RESET east to U2's 1A, tapped by R5. PF_TRIP runs from 1Y east
to its label, and from the node at X_LOOP_E down, west under U2 (through R6's pin 1) and up into 2A.
PF_ON runs from 2Y east to its label, tapped by R7. Every segment ends at the next tap, since a wire
end inside another segment is refused; the three crossings are segments passing each other, not
ends.

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
from layout import (TITLE, X_CLAMP, X_EAST, X_LOOP_E, X_LOOP_W, X_MR, X_VIN, X_WEST,  # noqa: E402
                    Y_5V, Y_GND, Y_LOOP, Y_PFOK, Y_SENSE)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])

# 5V_A: the row from its label east to U2's VCC, and a drop to each tap.
X_R5 = w.x("R5.2")
w.path("5V_A", (X_WEST, Y_5V), (w.x("C9.1"), Y_5V), (w.x("C11.1"), Y_5V), (X_MR, Y_5V), (w.x("U1.6"), Y_5V),
       (X_R5, Y_5V), (w.x("U2.5"), Y_5V), "U2.5")
w.label("5V_A", (X_WEST, Y_5V), 180)
for pin in ("C9.1", "C11.1", "U1.6", "R5.2"):
    w.path("5V_A", (w.x(pin), Y_5V), pin)
w.path("5V_A", (X_MR, Y_5V), (X_MR, w.y("U1.3")), "U1.3")

# GND: the row from its label east to R7, and a drop from each tap.
hang = ["C9.2", "C11.2", "D3.2", "R4.2", "C8.2", "C10.2", "U1.2", "R6.2", "U2.2", "R7.2"]
w.path("GND", (X_WEST, Y_GND), *[(w.x(pin), Y_GND) for pin in hang])
w.label("GND", (X_WEST, Y_GND), 180)
for pin in hang:
    w.path("GND", pin, (w.x(pin), Y_GND))

# VIN: one stub from its label to R2.
w.path("VIN", (X_VIN, Y_SENSE), "R2.1")
w.label("VIN", (X_VIN, Y_SENSE), 180)

# PF_CLAMP: R2 to R3, and D3's cathode up to the row.
w.path("PF_CLAMP", "R2.2", (X_CLAMP, Y_SENSE), "R3.1")
w.path("PF_CLAMP", (X_CLAMP, Y_SENSE), "D3.1")

# PF_SENSE: R3 east to U1's SENSE, with R4 and C8 hanging from it.
w.path("PF_SENSE", "R3.2", (w.x("R4.1"), Y_SENSE), (w.x("C8.1"), Y_SENSE), "U1.5")
for pin in ("R4.1", "C8.1"):
    w.path("PF_SENSE", (w.x(pin), Y_SENSE), pin)

# PF_CT: U1's CT west to C10's column, then down to it.
w.path("PF_CT", "U1.4", (w.x("C10.1"), w.y("U1.4")), "C10.1")

# PF_OK: U1's RESET east to U2's 1A, R5 dropping onto it.
w.path("PF_OK", "U1.1", (X_R5, Y_PFOK), "U2.1")
w.path("PF_OK", "R5.1", (X_R5, Y_PFOK))

# PF_TRIP: 1Y east to its label; from the node, the run under U2 into 2A through R6's pin 1.
w.path("PF_TRIP", "U2.6", (X_LOOP_E, Y_PFOK), (X_EAST, Y_PFOK))
w.label("PF_TRIP", (X_EAST, Y_PFOK), 0)
w.path("PF_TRIP", (X_LOOP_E, Y_PFOK), (X_LOOP_E, Y_LOOP), "R6.1", (X_LOOP_W, Y_LOOP), (X_LOOP_W, w.y("U2.3")), "U2.3")

# PF_ON: 2Y east to its label, R7 hanging from it.
w.path("PF_ON", "U2.4", (w.x("R7.1"), w.y("U2.4")), (X_EAST, w.y("U2.4")))
w.label("PF_ON", (X_EAST, w.y("U2.4")), 0)
w.path("PF_ON", (w.x("R7.1"), w.y("U2.4")), "R7.1")
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
