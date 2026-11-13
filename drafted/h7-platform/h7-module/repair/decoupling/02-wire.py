"""Write op-list 02 for the decoupling page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

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
from title_block import DATE  # noqa: E402
from layout import (TITLE, X_BOOT0, X_EAST, X_VREF, X_WEST, Y_3V3, Y_GND, Y_GND2, Y_LOWER)  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])
for tp, row in (("TP1.1", Y_LOWER), ("TP2.1", Y_GND2), ("TP3.1", Y_LOWER), ("TP4.1", Y_GND2), ("TP5.1", Y_LOWER)):
    if w.y(tp) != row:
        raise SystemExit(f"02-wire: {tp} at {w.p(tp)} is not on its row {row}")

# The upper band: C1 to C18 between the 3V3_D row and the GND row, which runs on east to the rise.
caps = [f"C{n}" for n in range(1, 19)]
w.path("3V3_D", (X_WEST, Y_3V3), *[(w.x(f"{c}.1"), Y_3V3) for c in caps])
w.label("3V3_D", (X_WEST, Y_3V3), 180)
w.path("GND", (X_WEST, Y_GND), *[(w.x(f"{c}.2"), Y_GND) for c in caps], (X_EAST, Y_GND), (X_EAST, Y_GND2))
w.label("GND", (X_WEST, Y_GND), 180)
for c in caps:
    w.path("3V3_D", (w.x(f"{c}.1"), Y_3V3), f"{c}.1")
    w.path("GND", (w.x(f"{c}.2"), Y_GND), f"{c}.2")

# VCAP: its label, C19's and C20's taps, TP1 at the row's east end.
w.path("VCAP", (X_WEST, Y_LOWER), (w.x("C19.1"), Y_LOWER), (w.x("C20.1"), Y_LOWER), "TP1.1")
w.label("VCAP", (X_WEST, Y_LOWER), 180)
for c in ("C19.1", "C20.1"):
    w.path("VCAP", (w.x(c), Y_LOWER), c)

# VREF_A and BOOT0: each label, a short row east to its pad.
w.path("VREF_A", (X_VREF, Y_LOWER), "TP3.1")
w.label("VREF_A", (X_VREF, Y_LOWER), 180)
w.path("BOOT0", (X_BOOT0, Y_LOWER), "TP5.1")
w.label("BOOT0", (X_BOOT0, Y_LOWER), 180)

# The lower GND row: from the rise west past TP4 and TP2 to C20's and C19's feet.
w.path("GND", (X_EAST, Y_GND2), "TP4.1", "TP2.1", (w.x("C20.2"), Y_GND2), (w.x("C19.2"), Y_GND2))
for c in ("C19.2", "C20.2"):
    w.path("GND", (w.x(c), Y_GND2), c)
print(w.op_list(sys.argv[3], TITLE, DATE, sys.argv[4]))
