"""Write op-list 02 for the interface page (`draughting/pages/page.py`, `Wiring`).

Every pad with a signal runs west by one stub to a LOCAL label of its port's name, which op-list 04
(`tools/draught/hierarchical-labels.ts`) turns into the block's hierarchical label at the same
place. GND is the one net with two pins: its label is on J1.20's stub, and J2.20 drops to a row
under both headers and comes up to meet that stub west of J1.20. J1's reserved pads 16-19 carry the
intent's no-connects.

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
from layout import STUB, TEE, TITLE, Y_GND_BELOW  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])

for port in sorted(w.port_names):
    if port == "GND":
        continue
    [pin] = [q for q, net in w.pin_net.items() if net == port]
    px, py = w.p(pin)
    w.path(port, pin, (px - STUB, py))
    w.label(port, (px - STUB, py), 180)

x1, y1 = w.p("J1.20")
x2, y2 = w.p("J2.20")
y_row = y1 + Y_GND_BELOW
w.path("GND", "J1.20", (x1 - TEE, y1), (x1 - STUB, y1))
w.label("GND", (x1 - STUB, y1), 180)
w.path("GND", "J2.20", (x2 - TEE, y2), (x2 - TEE, y_row), (x1 - TEE, y_row), (x1 - TEE, y1))
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
