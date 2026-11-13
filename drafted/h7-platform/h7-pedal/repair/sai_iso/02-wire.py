"""Write op-list 02 for the h7-pedal sai_iso page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. U11's pin 1 carries the
intent's no-connect. Every segment ends at the next tap, since a wire end inside another segment is
refused.

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
from layout import (TITLE, X_BIAS, X_COMB, X_LABEL_E, X_LABEL_SUPPLY, X_LABEL_W, Y_3V3C,  # noqa: E402
                    Y_3V3D, Y_BCK, Y_DIN, Y_DOUT, Y_GND, Y_LRCK, Y_U11_GND)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])


def on_row(pin, y, what):
    if w.y(pin) != y:
        raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not on {what} ({y})")


# The three to-module rows: (codec-side net, bias resistor, gate input, gate output net, gate output,
# 470 ohm, contract net), in architecture.md line 255's order.
ROWS = [
    ("DOUT_CODEC", "R34", "U10.1", "ISO_DOUT", "U10.7", "R37", "CODEC_DOUT", Y_DOUT),
    ("LRCK_CODEC", "R35", "U10.3", "ISO_LRCK", "U10.5", "R38", "CODEC_LRCK", Y_LRCK),
    ("BCK_CODEC", "R36", "U10.6", "ISO_BCK", "U10.2", "R39", "CODEC_BCK", Y_BCK),
]
for codec, bias, a, iso, y, series, contract, row in ROWS:
    for pin in (f"{bias}.1", a, y, f"{series}.1", f"{series}.2"):
        on_row(pin, row, f"the {codec} row")
    w.path(codec, (X_LABEL_W, row), f"{bias}.1", a)
    w.label(codec, (X_LABEL_W, row), 180)
    w.path(iso, y, f"{series}.1")
    w.path(contract, f"{series}.2", (X_LABEL_E, row))
    w.label(contract, (X_LABEL_E, row), 0)

# The DIN row: CODEC_DIN past R40 into U11's A; U11's Y to DIN_CODEC.
for pin in ("R40.1", "U11.2", "U11.4"):
    on_row(pin, Y_DIN, "the DIN row")
w.path("CODEC_DIN", (X_LABEL_W, Y_DIN), "R40.1", "U11.2")
w.label("CODEC_DIN", (X_LABEL_W, Y_DIN), 180)
w.path("DIN_CODEC", "U11.4", (X_LABEL_E, Y_DIN))
w.label("DIN_CODEC", (X_LABEL_E, Y_DIN), 0)

# 3V3_CODEC: U11's VCC down to its row, which runs west past C43 to its label.
w.path("3V3_CODEC", "U11.5", (w.x("U11.5"), Y_3V3C), "C43.1", (X_LABEL_W, Y_3V3C))
w.label("3V3_CODEC", (X_LABEL_W, Y_3V3C), 180)

# 3V3_D: U10's supply unit's VCC east past C42 to its label.
on_row("U10.8", Y_3V3D, "the 3V3_D row")
w.path("3V3_D", "U10.8", "C42.1", (X_LABEL_SUPPLY, Y_3V3D))
w.label("3V3_D", (X_LABEL_SUPPLY, Y_3V3D), 0)

# GND: each bias resistor's run west to the comb (R36's drops onto U11's GND run); the comb down to
# the GND row, which runs east past C43, U10's supply unit and C42 to GND's label.
w.path("GND", "R34.2", (X_COMB, w.y("R34.2")))
w.path("GND", "R35.2", (X_COMB, w.y("R35.2")))
w.path("GND", "R36.2", (X_BIAS, Y_U11_GND))
w.path("GND", "U11.3", (X_BIAS, Y_U11_GND), (X_COMB, Y_U11_GND))
w.path("GND", "R40.2", (X_COMB, w.y("R40.2")))
comb = sorted({w.y("R34.2"), w.y("R35.2"), Y_U11_GND, w.y("R40.2"), Y_GND})
w.path("GND", *[(X_COMB, y) for y in comb])
for pin in ("C43.2", "C42.2"):
    w.path("GND", pin, (w.x(pin), Y_GND))
on_row("U10.4", Y_GND, "the GND row")
w.path("GND", (X_COMB, Y_GND), (w.x("C43.2"), Y_GND), "U10.4", (w.x("C42.2"), Y_GND), (X_LABEL_SUPPLY, Y_GND))
w.label("GND", (X_LABEL_SUPPLY, Y_GND), 0)
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
