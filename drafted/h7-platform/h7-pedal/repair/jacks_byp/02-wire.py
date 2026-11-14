"""Write op-list 02 for the h7-pedal jacks_byp page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. The jacks' unused
contacts carry the intent's no-connects. Every segment ends at the next tap, since a wire end inside
another segment is refused.

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
from layout import (TITLE, X_3V3_LABEL, X_DRV_E, X_DRV_W, X_ESD_E, X_ESD_W, X_FX_IN, X_FX_OUT,  # noqa: E402
                    X_GND_E, X_GND_LABEL, X_GND_W, X_LABEL_W, X_SLEEVE_E, X_SLEEVE_W, X_TIP_L, X_TIP_L_E,
                    Y_3V3, Y_3V3_LABEL, Y_DRV, Y_GATE, Y_GND, Y_GND_TOP, Y_PF, Y_TIP_L, Y_TIP_R)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])


def on_row(pin, y, what):
    if w.y(pin) != y:
        raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not on {what} ({y})")


for pin in ("J10.T", "K1.6", "K2.6", "J12.T", "D13.1", "D15.1"):
    on_row(pin, Y_TIP_R, "the right channel's tip row")
for pin in ("K1.3", "K2.3", "D12.1", "D14.1"):
    on_row(pin, Y_TIP_L, "the left channel's tip row")
for pin in ("K1.1", "K2.1", "D17.2", "D19.2", "K1.8", "K2.8"):
    on_row(pin, Y_3V3, "the coil row")
for pin in ("D16.2", "D18.2", "Q10.3"):
    on_row(pin, Y_DRV, "the RELAY_DRV row")
for pin in ("Q10.1", "R126.1", "Q11.3", "R125.2", "R125.1"):
    on_row(pin, Y_GATE, "the gate row")
on_row("Q11.1", Y_PF, "PF_TRIP's row")
for a, b in (("K1.2", "K2.2"), ("K1.7", "K2.7"), ("K1.4", "K2.4"), ("K1.5", "K2.5")):
    if w.y(a) != w.y(b):
        raise SystemExit(f"02-wire: {a} and {b} are not on one row")

# The right channel: J10's T straight east past D13 to K1's COM 6; K2's COM 6 straight east past D15
# to J12's T.
w.path("IN_TIP_R", "J10.T", "D13.1", "K1.6")
w.path("OUT_JACK_R", "K2.6", "D15.1", "J12.T")

# The left channel: J10's TN and J9's T join on a vertical, which runs east past D12 to K1's COM 3;
# K2's COM 3 east past D14, down to J11's T.
w.path("IN_TIP_L", "J10.TN", (X_TIP_L, w.y("J10.TN")))
w.path("IN_TIP_L", "J9.T", (X_TIP_L, w.y("J9.T")))
w.path("IN_TIP_L", (X_TIP_L, w.y("J10.TN")), (X_TIP_L, Y_TIP_L), (X_TIP_L, w.y("J9.T")))
w.path("IN_TIP_L", (X_TIP_L, Y_TIP_L), "D12.1", "K1.3")
w.path("OUT_JACK_L", "K2.3", "D14.1", (X_TIP_L_E, Y_TIP_L), (X_TIP_L_E, w.y("J11.T")), "J11.T")

# Across the gap: BYP_R and BYP_L straight from K1 to K2; the NO pins each to its label.
w.path("BYP_R", "K1.7", "K2.7")
w.path("BYP_L", "K1.2", "K2.2")
for net, pin in (("FX_IN_R", "K1.5"), ("FX_IN_L", "K1.4")):
    w.path(net, pin, (X_FX_IN, w.y(pin)))
    w.label(net, (X_FX_IN, w.y(pin)), 0)
for net, pin in (("FX_OUT_R", "K2.5"), ("FX_OUT_L", "K2.4")):
    w.path(net, pin, (X_FX_OUT, w.y(pin)))
    w.label(net, (X_FX_OUT, w.y(pin)), 180)

# 3V3_P: the coil row from K1's coil 1 past the two suppressors to K2's; its label hangs between them.
w.path("3V3_P", "K1.1", "D17.2", (X_3V3_LABEL, Y_3V3), "D19.2", "K2.1")
w.path("3V3_P", (X_3V3_LABEL, Y_3V3), (X_3V3_LABEL, Y_3V3_LABEL))
w.label("3V3_P", (X_3V3_LABEL, Y_3V3_LABEL), 270)

# Each suppressor: the Zener's cathode down to the 1N4148W's.
w.path("SUP_IN", "D17.1", "D16.1")
w.path("SUP_OUT", "D19.1", "D18.1")

# RELAY_DRV: K1's coil 8 west and down to the row, east past D16, Q10's drain and D18, and up to K2's
# coil 8.
w.path("RELAY_DRV", "K1.8", (X_DRV_W, Y_3V3), (X_DRV_W, Y_DRV), "D16.2", "Q10.3", "D18.2", (X_DRV_E, Y_DRV),
       (X_DRV_E, Y_3V3), "K2.8")

# The driver: Q10's gate row west past R126 and Q11's drain to R125; R125's far end west to
# RELAY_EN's label; Q11's gate west to PF_TRIP's label.
w.path("RELAY_GATE", "Q10.1", "R126.1", "Q11.3", "R125.2")
w.path("RELAY_EN", "R125.1", (X_LABEL_W, Y_GATE))
w.label("RELAY_EN", (X_LABEL_W, Y_GATE), 180)
w.path("PF_TRIP", "Q11.1", (X_LABEL_W, Y_PF))
w.label("PF_TRIP", (X_LABEL_W, Y_PF), 180)

# GND: over each upper jack a short row takes its sleeve and its channel's ESD diode, and runs to a
# vertical down the page's outer edge to the bottom row; the bottom row takes the lower jacks'
# sleeves, D12, the driver and D14. GND's label at the row's west end.
w.path("GND", "J10.S", (X_SLEEVE_W, w.y("J10.S")), (X_SLEEVE_W, Y_GND_TOP))
w.path("GND", "D13.2", (X_ESD_W, Y_GND_TOP), (X_SLEEVE_W, Y_GND_TOP), (X_GND_W, Y_GND_TOP), (X_GND_W, Y_GND))
w.path("GND", "J12.S", (X_SLEEVE_E, w.y("J12.S")), (X_SLEEVE_E, Y_GND_TOP))
w.path("GND", "D15.2", (X_ESD_E, Y_GND_TOP), (X_SLEEVE_E, Y_GND_TOP), (X_GND_E, Y_GND_TOP), (X_GND_E, Y_GND))
w.path("GND", "J9.S", (X_SLEEVE_W, w.y("J9.S")), (X_SLEEVE_W, Y_GND))
w.path("GND", "J11.S", (X_SLEEVE_E, w.y("J11.S")), (X_SLEEVE_E, Y_GND))
drops = ("D12.2", "Q11.2", "R126.2", "Q10.2", "D14.2")
for pin in drops:
    w.path("GND", pin, (w.x(pin), Y_GND))
row = [(X_GND_LABEL, Y_GND), (X_GND_W, Y_GND), (X_SLEEVE_W, Y_GND)] + [(w.x(p), Y_GND) for p in drops]
w.path("GND", *row, (X_SLEEVE_E, Y_GND), (X_GND_E, Y_GND))
w.label("GND", (X_GND_LABEL, Y_GND), 180)

print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
