"""Write op-list 02 for the qspi page (`../tools/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label.

usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out> > 02-wire.json
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "tools"))
sys.path.insert(0, str(HERE))
import page  # noqa: E402
from layout import TITLE, X_WEST, Y_3V3, Y_GND  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])

# FLASH_NCS: U4's pin 1 west to its label, R10 dropping onto it from the 3V3_D row.
y_ncs = w.y("U4.1")
w.path("FLASH_NCS", "U4.1", (w.x("R10.1"), y_ncs), (X_WEST, y_ncs))
w.path("FLASH_NCS", (w.x("R10.1"), y_ncs), "R10.1")
w.label("FLASH_NCS", (X_WEST, y_ncs), 180)

# The five one-pin signals, each west to its label.
for net, pin in (("FLASH_CLK", "U4.6"), ("FLASH_IO0", "U4.5"), ("FLASH_IO1", "U4.2"), ("FLASH_IO2", "U4.3"),
                 ("FLASH_IO3", "U4.7")):
    w.path(net, pin, (X_WEST, w.y(pin)))
    w.label(net, (X_WEST, w.y(pin)), 180)

# 3V3_D along the top: R10, U4's VCC, C43.
taps = ["R10.2", "U4.8", "C43.1"]
w.path("3V3_D", (X_WEST, Y_3V3), *[(w.x(t), Y_3V3) for t in taps])
for t in taps:
    w.path("3V3_D", (w.x(t), Y_3V3), t)
w.label("3V3_D", (X_WEST, Y_3V3), 180)

# GND along the bottom: U4's GND, C43.
taps = ["U4.4", "C43.2"]
w.path("GND", (X_WEST, Y_GND), *[(w.x(t), Y_GND) for t in taps])
for t in taps:
    w.path("GND", (w.x(t), Y_GND), t)
w.label("GND", (X_WEST, Y_GND), 180)
print(w.op_list(sys.argv[3], TITLE, sys.argv[4]))
