"""Write op-list 02 for the h7-pedal expr_ref page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. J4's TN and SN carry
the intent's no-connects. Every segment ends at the next tap, since a wire end inside another segment
is refused; the four crossings layout.py names are two segments passing each other, not an end.

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
from layout import (TITLE, X_BUF, X_FB_W, X_GND_E, X_GND_LABEL, X_HW_LABEL, X_LABEL_E,  # noqa: E402
                    X_LEAD_R, X_LEAD_S, X_LEAD_T, X_R42_DOWN, X_UGND, X_VREF_E, X_VREF_LABEL, Y_BUF,
                    Y_CE, Y_DET, Y_FB, Y_GND, Y_GND_TIP, Y_HW, Y_R42, Y_RING, Y_TIP, Y_UGND, Y_VREF)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])


def on_row(pin, y, what):
    if w.y(pin) != y:
        raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not on {what} ({y})")


for pin in ("D7.1", "R44.1", "R44.2", "C45.1", "R45.1", "R46.1", "R46.2", "U13.3"):
    on_row(pin, Y_TIP, "the tip row")
for pin in ("U13.1", "R47.1", "R47.2", "C47.1"):
    on_row(pin, Y_BUF, "U13's output row")
for pin in ("J4.RN", "R48.1", "R48.2", "R49.1"):
    on_row(pin, Y_DET, "the detect row")
for pin in ("D8.1", "C44.1", "R43.2", "R43.1", "D9.1", "U12.6", "U12.1"):
    on_row(pin, Y_RING, "the ring row")
for pin in ("U12.3", "Q6.3"):
    on_row(pin, Y_CE, "the CE row")

# The tip band: J4's T up to the tip row, past D7, through R44, past C45 and R45, through R46 into
# U13's + input; U13's output past the feedback tap, through R47 to EXPR_TIP, with C47; the feedback
# down under U13 and up into its - input.
w.path("EXP_TIP_J", "J4.T", (X_LEAD_T, w.y("J4.T")), (X_LEAD_T, Y_TIP), "D7.1", "R44.1")
w.path("EXP_TIP_RC", "R44.2", "C45.1", "R45.1", "R46.1")
w.path("EXP_IN", "R46.2", "U13.3")
w.path("EXP_BUF", "U13.1", (X_BUF, Y_BUF), "R47.1")
w.path("EXP_BUF", (X_BUF, Y_BUF), (X_BUF, Y_FB), (X_FB_W, Y_FB), (X_FB_W, w.y("U13.4")), "U13.4")
w.path("EXPR_TIP", "R47.2", "C47.1", (X_LABEL_E, Y_BUF))
w.label("EXPR_TIP", (X_LABEL_E, Y_BUF), 0)
for pin in ("D7.2", "C45.2", "R45.2", "C46.2", "U13.2", "C47.2"):
    w.path("GND", pin, (w.x(pin), Y_GND_TIP))
w.path("GND", "R49.2", (w.x("R49.2"), Y_GND_TIP))

# Plug detect: J4's RN straight east through R48 to EXPR_DETECT, R49 up to the tip band's GND row.
w.path("EXP_RN", "J4.RN", "R48.1")
w.path("EXPR_DETECT", "R48.2", "R49.1", (X_LABEL_E, Y_DET))
w.label("EXPR_DETECT", (X_LABEL_E, Y_DET), 0)

# The ring band, east to west: REF_OUT from U12's VOUT past D9 and R42's run to R43; the ring row
# from R43 past C44 and D8 to J4's R, which drops to it.
w.path("REF_OUT", "U12.6", (X_R42_DOWN, Y_RING), "D9.1", "R43.1")
w.path("EXP_RING", "R43.2", "C44.1", "D8.1", (X_LEAD_R, Y_RING), (X_LEAD_R, w.y("J4.R")), "J4.R")
# R42: from REF_OUT down, under U12, up into the CE row.
w.path("REF_OUT", (X_R42_DOWN, Y_RING), (X_R42_DOWN, Y_R42), "R42.1")
w.path("REF_CE", "U12.3", (w.x("R42.2"), Y_CE), "Q6.3")
w.path("REF_CE", "R42.2", (w.x("R42.2"), Y_CE))
w.path("REF_ENG", "Q6.1", "R41.2")
# U12's N/C and ST join west of it, then its GND lead under it, down to the bottom GND row.
w.path("GND", "U12.4", (X_UGND, w.y("U12.4")), (X_UGND, w.y("U12.5")), (X_UGND, Y_UGND), (w.x("U12.2"), Y_UGND))
w.path("GND", "U12.5", (X_UGND, w.y("U12.5")))
w.path("GND", "U12.2", (w.x("U12.2"), Y_UGND), (w.x("U12.2"), Y_GND))
for pin in ("D8.2", "C44.2", "D9.2", "Q6.2"):
    w.path("GND", pin, (w.x(pin), Y_GND))
w.path("GND", "J4.S", (X_LEAD_S, w.y("J4.S")), (X_LEAD_S, Y_GND))

# The HW_REV divider: R50 down from the VREF_A row to the HW_REV node, R51 and C48 down to the tip
# band's GND row, HW_REV's label east.
w.path("HW_REV", "R50.2", (w.x("R50.2"), Y_HW), "R51.1")
w.path("HW_REV", (w.x("R50.2"), Y_HW), (w.x("C48.1"), Y_HW), (X_HW_LABEL, Y_HW))
w.path("HW_REV", (w.x("C48.1"), Y_HW), "C48.1")
w.label("HW_REV", (X_HW_LABEL, Y_HW), 0)
for pin in ("R51.2", "C48.2"):
    w.path("GND", pin, (w.x(pin), Y_GND_TIP))

# VREF_A: the top row from C46 past U13's VDD east to the vertical and on past R50 to the label; the
# vertical down into U12's VIN and on to R41.
w.path("VREF_A", "C46.1", (w.x("C46.1"), Y_VREF))
w.path("VREF_A", "U13.5", (w.x("U13.5"), Y_VREF))
w.path("VREF_A", (w.x("C46.1"), Y_VREF), (w.x("U13.5"), Y_VREF), (X_VREF_E, Y_VREF), (w.x("R50.1"), Y_VREF),
       (X_VREF_LABEL, Y_VREF))
w.path("VREF_A", (w.x("R50.1"), Y_VREF), "R50.1")
w.label("VREF_A", (X_VREF_LABEL, Y_VREF), 0)
w.path("VREF_A", (X_VREF_E, Y_VREF), (X_VREF_E, Y_RING), (X_VREF_E, w.y("R41.1")))
w.path("VREF_A", "U12.1", (X_VREF_E, Y_RING))
w.path("VREF_A", "R41.1", (X_VREF_E, w.y("R41.1")))

# GND: the tip band's row from D7 east past every drop, across the VREF_A vertical to the GND
# vertical and on to the HW_REV divider; the vertical down to the bottom row, which runs west from it
# past every drop to GND's label.
tip_drops = sorted({w.x(p) for p in ("D7.2", "C45.2", "R45.2", "C46.2", "U13.2", "R49.2", "C47.2")})
w.path("GND", *[(x, Y_GND_TIP) for x in tip_drops], (X_GND_E, Y_GND_TIP), (w.x("R51.2"), Y_GND_TIP),
       (w.x("C48.2"), Y_GND_TIP))
w.path("GND", (X_GND_E, Y_GND_TIP), (X_GND_E, Y_GND))
bottom = sorted({w.x(p) for p in ("D8.2", "C44.2", "D9.2", "Q6.2")} | {X_LEAD_S, w.x("U12.2")})
w.path("GND", (X_GND_LABEL, Y_GND), *[(x, Y_GND) for x in bottom], (X_GND_E, Y_GND))
w.label("GND", (X_GND_LABEL, Y_GND), 180)
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
