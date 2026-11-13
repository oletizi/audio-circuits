"""Write op-list 02 for the h7-pedal fsw_led page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. Every segment ends at
the next tap, since a wire end inside another segment is refused.

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
from layout import (TITLE, X_3V3D_E, X_3V3D_LABEL, X_3V3P_LABEL, X_3V3P_W, X_FSW_LABEL,  # noqa: E402
                    X_LABEL_W, Y_3V3D_BOT, Y_3V3D_TOP, Y_3V3P_BOT, Y_3V3P_TOP, Y_FSW1, Y_FSW2, Y_GND,
                    Y_LED1, Y_LED2)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])


def on_row(pin, y, what):
    if w.y(pin) != y:
        raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not on {what} ({y})")


# The LED section, one channel above the GND row and its mirror below:
# (port, series R, pull-down R, MOSFET, LED, anode R, gate row, 3V3_P row)
LEDS = [("LED1", "R75", "R76", "Q7", "D10", "R74", Y_LED1, Y_3V3P_TOP),
        ("LED2", "R78", "R79", "Q8", "D11", "R77", Y_LED2, Y_3V3P_BOT)]
for port, rs, rpd, q, d, ra, y_gate, y_rail in LEDS:
    n = port[-1]
    on_row(f"{rs}.1", y_gate, f"{port}'s gate row")
    on_row(f"{q}.1", y_gate, f"{port}'s gate row")
    on_row(f"{rpd}.1", y_gate, f"{port}'s gate row")
    on_row(f"{ra}.1", y_rail, "the 3V3_P row")
    w.path(port, (X_LABEL_W, y_gate), f"{rs}.1")
    w.label(port, (X_LABEL_W, y_gate), 180)
    w.path(f"LED{n}_G", f"{rs}.2", f"{rpd}.1", f"{q}.1")
    w.path("GND", f"{rpd}.2", (w.x(f"{rpd}.2"), Y_GND))
    w.path("GND", f"{q}.2", (w.x(f"{q}.2"), Y_GND))
    w.path(f"LED{n}_K", f"{q}.3", f"{d}.1")
    w.path(f"LED{n}_A", f"{d}.2", f"{ra}.2")

# 3V3_P: the label, the top row to R74, the vertical west of the LED labels, the bottom row to R77.
w.path("3V3_P", (X_3V3P_LABEL, Y_3V3P_TOP), (X_3V3P_W, Y_3V3P_TOP), "R74.1")
w.label("3V3_P", (X_3V3P_LABEL, Y_3V3P_TOP), 180)
w.path("3V3_P", (X_3V3P_W, Y_3V3P_TOP), (X_3V3P_W, Y_3V3P_BOT), "R77.1")

# The footswitch section, one channel above the GND row and its mirror below:
# (port, header, pull-up, capacitor, series R, node row, 3V3_D row)
FSWS = [("FSW1", "J5", "R70", "C55", "R71", Y_FSW1, Y_3V3D_TOP),
        ("FSW2", "J6", "R72", "C56", "R73", Y_FSW2, Y_3V3D_BOT)]
for port, j, rpu, c, rs, y_node, y_rail in FSWS:
    for pin in (f"{j}.1", f"{rpu}.2", f"{c}.1", f"{rs}.1"):
        on_row(pin, y_node, f"{port}'s node row")
    on_row(f"{rpu}.1", y_rail, "the 3V3_D row")
    w.path(f"{port}_SW", f"{j}.1", f"{rpu}.2", f"{c}.1", f"{rs}.1")
    w.path(port, f"{rs}.2", (X_FSW_LABEL, y_node))
    w.label(port, (X_FSW_LABEL, y_node), 0)
    w.path("GND", f"{j}.2", (w.x(f"{j}.2"), Y_GND))
    w.path("GND", f"{c}.2", (w.x(f"{c}.2"), Y_GND))

# 3V3_D: the top row from R70 east to the label, the vertical east of the FSW labels, the bottom row
# back west to R72.
w.path("3V3_D", "R70.1", (X_3V3D_E, Y_3V3D_TOP), (X_3V3D_LABEL, Y_3V3D_TOP))
w.label("3V3_D", (X_3V3D_LABEL, Y_3V3D_TOP), 0)
w.path("3V3_D", (X_3V3D_E, Y_3V3D_TOP), (X_3V3D_E, Y_3V3D_BOT), "R72.1")

# GND: the label east along the row across the page, every drop and rise above landing on it.
drops = sorted({w.x(p) for p in ("R76.2", "Q7.2", "R79.2", "Q8.2", "J5.2", "C55.2", "J6.2", "C56.2")})
w.path("GND", (X_LABEL_W, Y_GND), *[(x, Y_GND) for x in drops])
w.label("GND", (X_LABEL_W, Y_GND), 180)
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
