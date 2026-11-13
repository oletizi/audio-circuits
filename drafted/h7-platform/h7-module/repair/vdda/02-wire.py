"""Write op-list 02 for the vdda page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label.

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
from layout import TITLE, X_EAST, X_WEST, Y_VREF, Y_VSSA  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])
for ref_pin, row in (("FB1.1", Y_VREF), ("FB1.2", Y_VREF), ("R2.1", Y_VSSA), ("R2.2", Y_VSSA)):
    if w.y(ref_pin) != row:
        raise SystemExit(f"02-wire: {ref_pin} at {w.p(ref_pin)} is not on its row {row}")

# 3V3_D: its label west of FB1, on the VREF_A row's line.
w.path("3V3_D", (X_WEST, Y_VREF), "FB1.1")
w.label("3V3_D", (X_WEST, Y_VREF), 180)

# VREF_A: from FB1's pin 2 east past the bank and the leg's R1 to its label; each drops to its pin 1.
taps = ["C21.1", "C22.1", "C23.1", "C24.1", "R1.1"]
w.path("VREF_A", "FB1.2", *[(w.x(t), Y_VREF) for t in taps], (X_EAST, Y_VREF))
for t in taps:
    w.path("VREF_A", (w.x(t), Y_VREF), t)
w.label("VREF_A", (X_EAST, Y_VREF), 0)

# DAMP: the leg's inner node, R1's pin 2 straight down to C25's pin 1.
w.path("DAMP", "R1.2", "C25.1")

# VSSA: from R2's pin 1 east under the bank and the leg to its label; each rises from its pin 2.
taps = ["C21.2", "C22.2", "C23.2", "C24.2", "C25.2"]
w.path("VSSA", "R2.1", *[(w.x(t), Y_VSSA) for t in taps], (X_EAST, Y_VSSA))
for t in taps:
    w.path("VSSA", (w.x(t), Y_VSSA), t)
w.label("VSSA", (X_EAST, Y_VSSA), 0)

# GND: R2's pin 2 west to its label, under 3V3_D's.
w.path("GND", "R2.2", (X_WEST, Y_VSSA))
w.label("GND", (X_WEST, Y_VSSA), 180)
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
