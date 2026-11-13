"""Write op-list 02 for the id_strap page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

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
from layout import TITLE, X_EAST, X_WEST, Y_GND, Y_STRAP, Y_VREF  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])
if w.x("R16.2") != w.x("R17.1"):
    raise SystemExit("02-wire: R16 and R17 do not stand in one column")

w.path("VREF_A", (X_WEST, Y_VREF), (w.x("R16.1"), Y_VREF), "R16.1")
w.label("VREF_A", (X_WEST, Y_VREF), 180)

node = (w.x("R16.2"), Y_STRAP)
w.path("MODULE_ID_STRAP", "R16.2", node, "R17.1")
w.path("MODULE_ID_STRAP", node, (w.x("C51.1"), Y_STRAP), (X_EAST, Y_STRAP))
w.path("MODULE_ID_STRAP", (w.x("C51.1"), Y_STRAP), "C51.1")
w.label("MODULE_ID_STRAP", (X_EAST, Y_STRAP), 0)

w.path("GND", (X_WEST, Y_GND), (w.x("R17.2"), Y_GND), (w.x("C51.2"), Y_GND), "C51.2")
w.path("GND", (w.x("R17.2"), Y_GND), "R17.2")
w.label("GND", (X_WEST, Y_GND), 180)
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
