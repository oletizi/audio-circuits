"""Write op-list 02 for the usb_dfu page (`../tools/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. J4's A8 and B8 carry
the intent's no-connects.

usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out> > 02-wire.json
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "tools"))
sys.path.insert(0, str(HERE))
import page  # noqa: E402
from layout import (TITLE, X_DM_DOWN, X_DM_JOIN, X_DP_DOWN, X_DP_JOIN, X_EAST, X_GND_DROP,  # noqa: E402
                    X_GND_WEST, X_VBUS_UP, X_WEST, Y_GND, Y_GTOP, Y_POCKET_GND, Y_SHIELD, Y_VBUS)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])

# VBUS: J4's four stacked VBUS pins, up to the row, east past C49 and down to U6's pin 5.
w.path("DFU_VBUS", "J4.A4", (X_VBUS_UP, w.y("J4.A4")), (X_VBUS_UP, Y_VBUS), (w.x("C49.1"), Y_VBUS),
       (w.x("U6.5"), Y_VBUS), "U6.5")
w.path("DFU_VBUS", (w.x("C49.1"), Y_VBUS), "C49.1")

# CC1 and CC2 along their rows to R13 and R14.
w.path("CC1", "J4.A5", "R13.1")
w.path("CC2", "J4.B5", "R14.1")
for cc, r in (("J4.A5", "R13.1"), ("J4.B5", "R14.1")):
    if w.y(cc) != w.y(r):
        raise SystemExit(f"02-wire: {r} at {w.p(r)} is not on {cc}'s row")

# D- (A7, B7) and D+ (A6, B6): each pair joined, then to U6; D- crosses D+ once on the way.
w.path("DFU_CONN_DM", "J4.A7", (X_DM_JOIN, w.y("J4.A7")), (X_DM_JOIN, w.y("J4.B7")), "J4.B7")
w.path("DFU_CONN_DM", (X_DM_JOIN, w.y("J4.B7")), (X_DM_DOWN, w.y("J4.B7")), (X_DM_DOWN, w.y("U6.3")), "U6.3")
w.path("DFU_CONN_DP", "J4.A6", (X_DP_JOIN, w.y("J4.A6")), (X_DP_JOIN, w.y("J4.B6")), "J4.B6")
w.path("DFU_CONN_DP", (X_DP_JOIN, w.y("J4.B6")), (X_DP_DOWN, w.y("J4.B6")), (X_DP_DOWN, w.y("U6.1")), "U6.1")

# The MCU side, east to the labels.
w.path("DFU_USB_DP", "U6.6", (X_EAST, w.y("U6.6")))
w.label("DFU_USB_DP", (X_EAST, w.y("U6.6")), 0)
w.path("DFU_USB_DM", "U6.4", (X_EAST, w.y("U6.4")))
w.label("DFU_USB_DM", (X_EAST, w.y("U6.4")), 0)

# Shield: J4's SH down to the shield row, R15 and C50 hanging from it.
w.path("SHIELD", "J4.SH", (w.x("J4.SH"), Y_SHIELD), (w.x("C50.1"), Y_SHIELD), (w.x("R15.1"), Y_SHIELD), "R15.1")
w.path("SHIELD", (w.x("C50.1"), Y_SHIELD), "C50.1")

# GND: the label, the top row east to the pocket drop, the run down J4's west side to the bottom row.
w.path("GND", (X_WEST, Y_GTOP), (X_GND_WEST, Y_GTOP), (X_GND_DROP, Y_GTOP), (X_GND_DROP, w.y("R13.2")),
       (X_GND_DROP, Y_POCKET_GND))
w.label("GND", (X_WEST, Y_GTOP), 180)
w.path("GND", "R13.2", (X_GND_DROP, w.y("R13.2")))
if w.y("R14.2") != Y_POCKET_GND or w.y("C49.2") != Y_POCKET_GND:
    raise SystemExit(f"02-wire: R14's pin 2 {w.p('R14.2')} and C49's pin 2 {w.p('C49.2')} are not on the pocket GND bar {Y_POCKET_GND}")
w.path("GND", "R14.2", (X_GND_DROP, Y_POCKET_GND), "C49.2")
bottom = ["R15.2", "C50.2", "J4.A1", "U6.2"]
w.path("GND", (X_GND_WEST, Y_GTOP), (X_GND_WEST, Y_GND), *[(w.x(t), Y_GND) for t in bottom])
for t in bottom:
    w.path("GND", (w.x(t), Y_GND), t)
print(w.op_list(sys.argv[3], TITLE, sys.argv[4]))
