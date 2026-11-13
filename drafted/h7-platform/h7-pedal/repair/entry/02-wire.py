"""Write op-list 02 for the h7-pedal entry page (`draughting/pages/page.py`, `Wiring`).

The rows and columns are `layout.py`'s. VIN runs east from J3.2 to FB1.1, tapped by VIN's label
stub, TP1, C1 and R1. VIN_FB runs from FB1.2 to D1's anode, with a riser at X_SPLIT up to D2's
anode. VIN_A runs from D1's cathode east to its label, tapped by C3 to C6, C7, C2 and TP2. VIN_MSW
is one stub from D2's cathode to its label. GND runs along its row from its label at the west end,
taking J3.1's drop, TP3 and every hanging part's pin 2. Every segment ends at the next tap, since a
wire end inside another segment is refused.

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
from layout import (TITLE, X_GND_WEST, X_JACK_DROP, X_MSW_LABEL, X_SPLIT, X_VIN_A_LABEL, X_VIN_LABEL,  # noqa: E402
                    Y_GND, Y_MSW, Y_VIN, Y_VIN_LABEL)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])

HANG_VIN = ["C1", "R1"]
HANG_VIN_A = ["C3", "C4", "C5", "C6", "C7", "C2"]

# VIN: J3.2 east along the row to FB1.1; each tap is a segment end.
w.path("VIN", "J3.2", (X_VIN_LABEL, Y_VIN), "TP1.1", (w.x("C1.1"), Y_VIN), (w.x("R1.1"), Y_VIN), "FB1.1")
w.path("VIN", (X_VIN_LABEL, Y_VIN), (X_VIN_LABEL, Y_VIN_LABEL))
w.label("VIN", (X_VIN_LABEL, Y_VIN_LABEL), 90)
for ref in HANG_VIN:
    w.path("VIN", (w.x(f"{ref}.1"), Y_VIN), f"{ref}.1")

# VIN_FB: FB1.2 to D1's anode, and the riser to D2's anode.
w.path("VIN_FB", "FB1.2", (X_SPLIT, Y_VIN), "D1.2")
w.path("VIN_FB", (X_SPLIT, Y_VIN), (X_SPLIT, Y_MSW), "D2.2")

# VIN_MSW: D2's cathode to its label.
w.path("VIN_MSW", "D2.1", (X_MSW_LABEL, Y_MSW))
w.label("VIN_MSW", (X_MSW_LABEL, Y_MSW), 0)

# VIN_A: D1's cathode east along the row to its label.
taps = [(w.x(f"{ref}.1"), Y_VIN) for ref in HANG_VIN_A]
w.path("VIN_A", "D1.1", *taps, "TP2.1", (X_VIN_A_LABEL, Y_VIN))
w.label("VIN_A", (X_VIN_A_LABEL, Y_VIN), 0)
for ref in HANG_VIN_A:
    w.path("VIN_A", (w.x(f"{ref}.1"), Y_VIN), f"{ref}.1")

# GND: the row from its label east to the last hanging part, J3.1's drop, TP3 and each pin 2.
hang = HANG_VIN + HANG_VIN_A
w.path("GND", (X_GND_WEST, Y_GND), (X_JACK_DROP, Y_GND), "TP3.1", *[(w.x(f"{ref}.2"), Y_GND) for ref in hang])
w.label("GND", (X_GND_WEST, Y_GND), 180)
w.path("GND", "J3.1", (X_JACK_DROP, w.y("J3.1")), (X_JACK_DROP, Y_GND))
for ref in hang:
    w.path("GND", f"{ref}.2", (w.x(f"{ref}.2"), Y_GND))
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
