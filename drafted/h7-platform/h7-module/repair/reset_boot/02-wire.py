"""Write op-list 02 for the reset_boot page (`draughting/pages/page.py`, `Wiring`).

One 3V3_D row on top and one GND row at the bottom, each from its label on the west edge, with
every part that returns to them dropping onto them. The BOOT0 row runs from SW2's pin 1 east past
R12 and C48 and west to its label; the NRST row from U5's ~RESET east past R11, C47 and SW1 to its
label on the east edge. Each label is LOCAL here; op-list 04 makes it the block's hierarchical label.

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
from layout import TITLE, X_EAST, X_WEST, Y_3V3, Y_GND, Y_SIG  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])
if w.y("U5.2") != Y_SIG:
    raise SystemExit(f"02-wire: U5's ~RESET is at {w.p('U5.2')}, not on the NRST row {Y_SIG}")


def rail(net, y, taps, label_at_west):
    """A row from the west edge through each tap's column, each tap dropping to its pin."""
    w.path(net, (X_WEST, y), *[(w.x(t), y) for t in taps])
    for t in taps:
        w.path(net, (w.x(t), y), t)
    if label_at_west:
        w.label(net, (X_WEST, y), 180)


rail("3V3_D", Y_3V3, ["SW2.2", "C46.1", "U5.3", "R11.1"], True)
rail("GND", Y_GND, ["R12.2", "C48.2", "C46.2", "U5.1", "C47.2", "SW1.2"], True)

boot = ["SW2.1", "R12.1", "C48.1"]
rail("BOOT0", Y_SIG, boot, True)

nrst = ["R11.2", "C47.1", "SW1.1"]
w.path("NRST", "U5.2", *[(w.x(t), Y_SIG) for t in nrst], (X_EAST, Y_SIG))
for t in nrst:
    w.path("NRST", (w.x(t), Y_SIG), t)
w.label("NRST", (X_EAST, Y_SIG), 0)
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
