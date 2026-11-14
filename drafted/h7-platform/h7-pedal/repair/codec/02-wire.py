"""Write op-list 02 for the h7-pedal codec page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. U9's ZEROL and ZEROR
(pins 13, 14) carry the intent's no-connects. Every segment ends at the next tap, since a wire end
inside another segment is refused; the four crossings layout.py names are two segments passing each
other, not an end.

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
from layout import (NOTES, TITLE, X_COL_B, X_COL_L, X_COL_S, X_COMB, X_GND_E, X_IFMD,  # noqa: E402
                    X_LABEL_3V3, X_LABEL_E, X_LABEL_GND, X_LABEL_NEAR, X_LABEL_VOUT, X_LABEL_W, X_LABEL_XO, Y_BEXIT,
                    Y_CAPGND, Y_GND, Y_LEXIT, Y_RAIL, Y_SEXIT)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])


def on_row(pin, y, what):
    if w.y(pin) != y:
        raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not on {what} ({y})")


def west_to(net, pin, x):
    """A pin's row straight west to x."""
    w.path(net, pin, (x, w.y(pin)))


for pin in ("C38.1", "C39.1", "C36.1", "C37.1"):
    on_row(pin, Y_RAIL, "the supply rows")
for pin in ("R32.1", "R32.2"):
    on_row(pin, Y_LEXIT, "the LRCK column's row")
for pin in ("R31.1", "R31.2"):
    on_row(pin, Y_BEXIT, "the BCK column's row")
on_row("R29.1", w.y("U9.1"), "the FMT row")
on_row("R30.1", w.y("U9.2"), "the DEMP row")
on_row("R30.2", Y_CAPGND, "the west GND run")
on_row("R28.1", w.y("U9.28"), "the MODE row")
on_row("R28.2", Y_CAPGND + 300, "R28's top")
on_row("R33.1", w.y("U9.3"), "the DOUT row")
for pin in ("C40.1", "C41.1"):
    on_row(pin, w.y("U9.21"), "the VCOM row")

# 3V3_CODEC: VDD up to the rail, which runs west past R29, the IFMD vertical, C38 and C39 to its
# label; FMT through R29 up to it; IFMD west to its vertical and up.
w.path("3V3_CODEC", "U9.7", (w.x("U9.7"), Y_RAIL), (w.x("R29.2"), Y_RAIL), (X_IFMD, Y_RAIL), "C38.1", "C39.1",
       (X_LABEL_3V3, Y_RAIL))
w.label("3V3_CODEC", (X_LABEL_3V3, Y_RAIL), 180)
w.path("3V3_CODEC", "R29.2", (w.x("R29.2"), Y_RAIL))
w.path("3V3_CODEC", "U9.27", (X_IFMD, w.y("U9.27")), (X_IFMD, Y_RAIL))
w.path("CODEC_FMT", "U9.1", "R29.1")

# 5V_A_CODEC: VCC up to its row, east past C36 and C37 to its label.
w.path("5V_A_CODEC", "U9.24", (w.x("U9.24"), Y_RAIL), "C36.1", "C37.1", (X_LABEL_E, Y_RAIL))
w.label("5V_A_CODEC", (X_LABEL_E, Y_RAIL), 0)

# The straps and RST: DEMP west to R30 and MODE west to R28 (each up to the west GND run); RST west
# to its label.
w.path("CODEC_DEMP", "U9.2", "R30.1")
west_to("CODEC_RST_N", "U9.15", X_LABEL_NEAR)
w.label("CODEC_RST_N", (X_LABEL_NEAR, w.y("U9.15")), 180)
w.path("CODEC_MODE", "U9.28", "R28.1")

# The analog inputs and DIN, each to its label close to U9.
for net, pin in (("VINL", "U9.25"), ("VINR", "U9.26"), ("DIN_CODEC", "U9.12")):
    west_to(net, pin, X_LABEL_NEAR)
    w.label(net, (X_LABEL_NEAR, w.y(pin)), 180)

# The SAI pairs on three columns: LRCK nearest (up to its row west through R32), SCKI next (down to
# its row west to XO_OUT), BCK farthest (its row west through R31). Each pin's run ends at its column.
west_to("LRCK_PIN", "U9.4", X_COL_L)
west_to("LRCK_PIN", "U9.11", X_COL_L)
w.path("LRCK_PIN", (X_COL_L, w.y("U9.11")), (X_COL_L, w.y("U9.4")), (X_COL_L, Y_LEXIT), "R32.1")
w.path("LRCK_CODEC", "R32.2", (X_LABEL_W, Y_LEXIT))
w.label("LRCK_CODEC", (X_LABEL_W, Y_LEXIT), 180)
west_to("XO_OUT", "U9.6", X_COL_S)
west_to("XO_OUT", "U9.9", X_COL_S)
w.path("XO_OUT", (X_COL_S, w.y("U9.6")), (X_COL_S, w.y("U9.9")), (X_COL_S, Y_SEXIT), (X_LABEL_XO, Y_SEXIT))
w.label("XO_OUT", (X_LABEL_XO, Y_SEXIT), 180)
west_to("BCK_PIN", "U9.5", X_COL_B)
west_to("BCK_PIN", "U9.10", X_COL_B)
w.path("BCK_PIN", (X_COL_B, w.y("U9.5")), (X_COL_B, Y_BEXIT), (X_COL_B, w.y("U9.10")))
w.path("BCK_PIN", (X_COL_B, Y_BEXIT), "R31.1")
w.path("BCK_CODEC", "R31.2", (X_LABEL_W, Y_BEXIT))
w.label("BCK_CODEC", (X_LABEL_W, Y_BEXIT), 180)

# The east side: the four VOUTs to their labels; DOUT through R33; VCOM past C40 and C41.
for net, pin in (("VOUTL+", "U9.20"), ("VOUTL-", "U9.19"), ("VOUTR+", "U9.18"), ("VOUTR-", "U9.17")):
    w.path(net, pin, (X_LABEL_VOUT, w.y(pin)))
    w.label(net, (X_LABEL_VOUT, w.y(pin)), 0)
w.path("DOUT_PIN", "U9.3", "R33.1")
w.path("DOUT_CODEC", "R33.2", (X_LABEL_VOUT, w.y("R33.2")))
w.label("DOUT_CODEC", (X_LABEL_VOUT, w.y("R33.2")), 0)
w.path("CODEC_VCOM", "U9.21", "C40.1", "C41.1")

# GND: the west run from R30 past R28's rise and C38's and C39's drops to the west vertical; the
# vertical down to the GND row; the row east under U9's ground pins, C40 and C41 to the east vertical, which rises to
# the east run under C36 and C37.
for pin in ("C38.2", "C39.2", "C36.2", "C37.2"):
    w.path("GND", pin, (w.x(pin), Y_CAPGND))
w.path("GND", "R28.2", (w.x("R28.2"), Y_CAPGND))
w.path("GND", "R30.2", (w.x("R28.2"), Y_CAPGND), (w.x("C38.2"), Y_CAPGND), (w.x("C39.2"), Y_CAPGND), (X_COMB, Y_CAPGND))
w.path("GND", (X_COMB, Y_CAPGND), (X_COMB, Y_GND))
drops = ("U9.8", "U9.16", "U9.23", "U9.22", "C40.2", "C41.2")
for pin in drops:
    w.path("GND", pin, (w.x(pin), Y_GND))
w.path("GND", (X_LABEL_GND, Y_GND), (X_COMB, Y_GND), *[(w.x(p), Y_GND) for p in drops], (X_GND_E, Y_GND))
w.label("GND", (X_LABEL_GND, Y_GND), 180)
w.path("GND", (X_GND_E, Y_GND), (X_GND_E, Y_CAPGND))
w.path("GND", (X_GND_E, Y_CAPGND), (w.x("C37.2"), Y_CAPGND), (w.x("C36.2"), Y_CAPGND))

for lines, at in NOTES:
    w.note(lines, at)
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
