"""Write op-list 02 for the clock page (`draughting/pages/page.py`, `Wiring`).

HSE_IN runs from its label on the west edge to the crystal's pin 1, with C44 dropping from it;
HSE_OUT from the crystal's pin 3 to its label on the east edge, with C45 dropping from it. One GND
row under them takes C44's pin 2, the crystal's stacked case pins and C45's pin 2, and carries
GND's label at its west end. Each label is LOCAL here; op-list 04 makes it the block's hierarchical
label.

usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out> > 02-wire.json
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / "draughting" / "pages"))
sys.path.insert(0, str(HERE.parent / "tools"))
sys.path.insert(0, str(HERE))
import page  # noqa: E402
from title_block import DATE  # noqa: E402
from layout import TITLE, X_EAST, X_WEST, Y_GND, Y_HSE  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])
for pin in ("Y1.1", "Y1.3"):
    if w.y(pin) != Y_HSE:
        raise SystemExit(f"02-wire: {pin} is at {w.p(pin)}, not on the HSE row {Y_HSE}")

w.path("HSE_IN", (X_WEST, Y_HSE), (w.x("C44.1"), Y_HSE), "Y1.1")
w.path("HSE_IN", (w.x("C44.1"), Y_HSE), "C44.1")
w.label("HSE_IN", (X_WEST, Y_HSE), 180)

w.path("HSE_OUT", "Y1.3", (w.x("C45.1"), Y_HSE), (X_EAST, Y_HSE))
w.path("HSE_OUT", (w.x("C45.1"), Y_HSE), "C45.1")
w.label("HSE_OUT", (X_EAST, Y_HSE), 0)

taps = ["C44.2", "Y1.2", "C45.2"]
w.path("GND", (X_WEST, Y_GND), *[(w.x(t), Y_GND) for t in taps])
for t in taps:
    w.path("GND", (w.x(t), Y_GND), t)
w.label("GND", (X_WEST, Y_GND), 180)
print(w.op_list(sys.argv[3], TITLE, DATE, sys.argv[4]))
