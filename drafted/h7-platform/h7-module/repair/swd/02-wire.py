"""Write op-list 02 for the swd page (`../tools/page.py`, `Wiring`).

Each of J3's three signals runs east from its pin to its label on the east edge, split at its test
point's pin. VTref rises to the 3V3_D row and runs west past TP9 to its label; GND (pins 3 and 5,
stacked, and pin 9) drops to the GND row, which runs west past TP10 to its label. J3's pins 6, 7
and 8 carry the intent's no-connects. Each label is LOCAL here; op-list 04 makes it the block's
hierarchical label.

usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out> > 02-wire.json
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "tools"))
sys.path.insert(0, str(HERE))
import page  # noqa: E402
from layout import TITLE, X_EAST, X_WEST, Y_3V3, Y_GND  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])

for net, pin, tp in (("NRST", "J3.10", "TP8.1"), ("SWCLK", "J3.4", "TP7.1"), ("SWDIO", "J3.2", "TP6.1")):
    if w.y(tp) != w.y(pin):
        raise SystemExit(f"02-wire: {tp} at {w.p(tp)} is not on {pin}'s row {w.p(pin)}")
    w.path(net, pin, tp, (X_EAST, w.y(pin)))
    w.label(net, (X_EAST, w.y(pin)), 0)

if w.y("TP9.1") != Y_3V3 or w.y("TP10.1") != Y_GND:
    raise SystemExit("02-wire: TP9 and TP10 are not on the 3V3_D and GND rows")
w.path("3V3_D", "J3.1", (w.x("J3.1"), Y_3V3), "TP9.1", (X_WEST, Y_3V3))
w.label("3V3_D", (X_WEST, Y_3V3), 180)
w.path("GND", (X_WEST, Y_GND), "TP10.1", (w.x("J3.9"), Y_GND), (w.x("J3.3"), Y_GND), "J3.3")
w.path("GND", (w.x("J3.9"), Y_GND), "J3.9")
w.label("GND", (X_WEST, Y_GND), 180)
print(w.op_list(sys.argv[3], TITLE, sys.argv[4]))
