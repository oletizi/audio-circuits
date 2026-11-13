"""Write op-list 02 for the h7-pedal modsw page (`draughting/pages/page.py`, `Wiring`).

The rows and columns are `layout.py`'s. VIN_MSW runs east from its label to Q1's source, with R10,
C13, R11 and R8 hanging from it. VIN_MOD runs east from Q1's drain to its label, tapped by C12, TP4
and R12. MSW_GH runs from C13 and R11 to D5's anode; MSW_G from D5's cathode east, taking R8, D4 and
R9, to Q1's gate column and up into the gate. MSW_X runs from R10 east under Q1 to C12, taking D4's
anode. MSWD_D is R9 to Q2's drain, VDIS_D R12 to Q3's drain. PF_ON and PF_TRIP are one stub each,
from the label to the gate. GND runs east from its label, taking Q2's and Q3's sources. Every
segment ends at the next tap, since a wire end inside another segment is refused; the one crossing,
R9's drop over the X row, is two segments passing each other, not an end.

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
from layout import (TITLE, X_EAST, X_PFON, X_PFTRIP, X_WEST, Y_GATE, Y_GND, Y_POWER, Y_X)  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])

# VIN_MSW: the row from its label east to Q1's source; R10, C13, R11 and R8 hang from it.
hang_msw = ["R10.1", "C13.1", "R11.1", "R8.1"]
w.path("VIN_MSW", (X_WEST, Y_POWER), *[(w.x(pin), Y_POWER) for pin in hang_msw], "Q1.3")
w.label("VIN_MSW", (X_WEST, Y_POWER), 180)
for pin in hang_msw:
    w.path("VIN_MSW", (w.x(pin), Y_POWER), pin)

# VIN_MOD: Q1's drain east to its label; C12 and R12 hang from it, TP4 stands on it.
w.path("VIN_MOD", "Q1.2", (w.x("C12.1"), Y_POWER), "TP4.1", (w.x("R12.1"), Y_POWER), (X_EAST, Y_POWER))
w.label("VIN_MOD", (X_EAST, Y_POWER), 0)
for pin in ("C12.1", "R12.1"):
    w.path("VIN_MOD", (w.x(pin), Y_POWER), pin)

# MSW_GH: C13 and R11 down to the run, which ends in D5's anode.
w.path("MSW_GH", (w.x("C13.2"), Y_GATE), (w.x("R11.2"), Y_GATE), "D5.2")
for pin in ("C13.2", "R11.2"):
    w.path("MSW_GH", pin, (w.x(pin), Y_GATE))

# MSW_G: D5's cathode east along the gate row to Q1's column, and up into the gate.
taps = ["R8.2", "D4.1", "R9.1"]
w.path("MSW_G", "D5.1", *[(w.x(pin), Y_GATE) for pin in taps], (w.x("Q1.1"), Y_GATE), "Q1.1")
for pin in taps:
    w.path("MSW_G", (w.x(pin), Y_GATE), pin)

# MSW_X: R10 east along the X row under Q1 to C12, taking D4's anode.
w.path("MSW_X", (w.x("R10.2"), Y_X), (w.x("D4.2"), Y_X), (w.x("C12.2"), Y_X))
for pin in ("R10.2", "D4.2", "C12.2"):
    w.path("MSW_X", pin, (w.x(pin), Y_X))

# MSWD_D and VDIS_D: each resistor down to its MOSFET's drain.
w.path("MSWD_D", "R9.2", "Q2.3")
w.path("VDIS_D", "R12.2", "Q3.3")

# PF_ON and PF_TRIP: each label east to its MOSFET's gate.
w.path("PF_ON", (X_PFON, w.y("Q2.1")), "Q2.1")
w.label("PF_ON", (X_PFON, w.y("Q2.1")), 180)
w.path("PF_TRIP", (X_PFTRIP, w.y("Q3.1")), "Q3.1")
w.label("PF_TRIP", (X_PFTRIP, w.y("Q3.1")), 180)

# GND: the row from its label east to Q3's source; each source drops to it.
w.path("GND", (X_PFON, Y_GND), (w.x("Q2.2"), Y_GND), (w.x("Q3.2"), Y_GND))
w.label("GND", (X_PFON, Y_GND), 180)
for pin in ("Q2.2", "Q3.2"):
    w.path("GND", pin, (w.x(pin), Y_GND))
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
