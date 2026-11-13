"""Write op-list 02 for the h7-pedal codec_sup page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. U6's pin 4 (NC) carries
the intent's no-connect. Every segment ends at the next tap, since a wire end inside another segment
is refused.

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
from layout import (TITLE, X_CLAMP_A, X_CLAMP_K, X_EN, X_LABEL_E, X_LABEL_W, X_PF_LABEL,  # noqa: E402
                    X_XO_LABEL, Y_CLAMP, Y_GATE, Y_GND, Y_RAIL, Y_RST)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])


def on_row(pin, y, what):
    if w.y(pin) != y:
        raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not on {what} ({y})")


for pin in ("C32.1", "U6.1", "U6.5", "C33.1", "R26.1", "C34.1", "U7.4", "C35.1", "U8.3", "R27.2"):
    on_row(pin, Y_RAIL, "the rail row")
for pin in ("U7.1", "U7.3", "U8.2", "R27.1", "Q5.3"):
    on_row(pin, Y_RST, "the XO_OUT and CODEC_RST_N row")
for pin in ("D6.1", "D6.2"):
    on_row(pin, Y_CLAMP, "D6's row")
on_row("Q5.1", Y_GATE, "Q5's gate row")

# 5V_A_CODEC: from its label east past C32, D6's cathode tap and EN's tap into U6's IN; EN up to the
# row; D6's cathode up from its tap.
w.path("5V_A_CODEC", (X_LABEL_W, Y_RAIL), "C32.1", (X_CLAMP_K, Y_RAIL), (X_EN, Y_RAIL), "U6.1")
w.label("5V_A_CODEC", (X_LABEL_W, Y_RAIL), 180)
w.path("5V_A_CODEC", "U6.3", (X_EN, w.y("U6.3")), (X_EN, Y_RAIL))
w.path("5V_A_CODEC", (X_CLAMP_K, Y_RAIL), (X_CLAMP_K, Y_CLAMP), "D6.1")

# 3V3_CODEC: the rail from U6's OUT east past every load to its label; D6's anode down to it, U7's ST
# up to it from the west.
rail = ["U6.5", (X_CLAMP_A, Y_RAIL), "C33.1", "R26.1", "C34.1", (w.x("U7.1"), Y_RAIL), "U7.4", "C35.1", "U8.3",
        "R27.2", (X_LABEL_E, Y_RAIL)]
w.path("3V3_CODEC", *rail)
w.label("3V3_CODEC", (X_LABEL_E, Y_RAIL), 0)
w.path("3V3_CODEC", "D6.2", (X_CLAMP_A, Y_CLAMP), (X_CLAMP_A, Y_RAIL))
w.path("3V3_CODEC", "U7.1", (w.x("U7.1"), Y_RAIL))

# XO_OUT: U7's OUT east to its label.
w.path("XO_OUT", "U7.3", (X_XO_LABEL, Y_RST))
w.label("XO_OUT", (X_XO_LABEL, Y_RST), 0)

# CODEC_RST_N: U8's RESET east past R27 and Q5's drain to its label.
w.path("CODEC_RST_N", "U8.2", "R27.1", "Q5.3", (X_LABEL_E, Y_RST))
w.label("CODEC_RST_N", (X_LABEL_E, Y_RST), 0)

# PF_TRIP: Q5's gate west to its label.
w.path("PF_TRIP", "Q5.1", (X_PF_LABEL, Y_GATE))
w.label("PF_TRIP", (X_PF_LABEL, Y_GATE), 180)

# GND: each drop down to the row, which runs from GND's label east to Q5's source.
drops = ("C32.2", "U6.2", "C33.2", "R26.2", "C34.2", "U7.2", "C35.2", "U8.1", "Q5.2")
for pin in drops:
    w.path("GND", pin, (w.x(pin), Y_GND))
w.path("GND", (X_LABEL_W, Y_GND), *sorted({(w.x(p), Y_GND) for p in drops}))
w.label("GND", (X_LABEL_W, Y_GND), 180)
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
