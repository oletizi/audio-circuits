"""Write op-list 02 for the sdram page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. U3's pin 40 (NC)
carries the intent's no-connect.

usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out> > 02-wire.json
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / "draughting" / "pages"))
sys.path.insert(0, str(HERE.parent / "tools"))
sys.path.insert(0, str(HERE))
import page  # noqa: E402
import title_block  # noqa: E402
from layout import (TITLE, X_E_3V3, X_E_GND, X_E_LABEL, X_R9, X_W_3V3, X_W_GND, X_W_LABEL,  # noqa: E402
                    X_WEST, Y_3V3, Y_GND)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])
ports = json.loads(pathlib.Path(sys.argv[2]).read_text())

# U3's pins by side and by net, from the intent and the ports (never from a list typed here).
west = sorted((p for p in w.pins["U3"] if int(p) <= 27), key=int)
east_side = sorted((p for p in w.pins["U3"] if int(p) >= 28), key=int)
west_x = {w.x(f"U3.{p}") for p in west}
east_x = {w.x(f"U3.{p}") for p in east_side}
if len(west_x) != 1 or len(east_x) != 1:
    raise SystemExit(f"02-wire: U3's west pins are at x {sorted(west_x)} and east pins at {sorted(east_x)}; expected one column each")


def net_of(pin):
    return w.pin_net.get(f"U3.{pin}")


def pins_on(side, net):
    return [p for p in side if net_of(p) == net]


# One-pin signals: each straight out by one stub to its label.
one_pin = {port["name"] for port in ports if len(port["pins"]) == 1}
for side, x_label, rot in ((west, X_W_LABEL, 180), (east_side, X_E_LABEL, 0)):
    for p in side:
        net = net_of(p)
        if net in one_pin:
            w.path(net, f"U3.{p}", (x_label, w.y(f"U3.{p}")))
            w.label(net, (x_label, w.y(f"U3.{p}")), rot)

# SDRAM_NE (pin 19): west across both west buses to R9's pin 1, on to its label.
y_ne = w.y("U3.19")
if net_of("19") != "SDRAM_NE" or w.p("R9.1") != (X_R9, y_ne):
    raise SystemExit(f"02-wire: R9's pin 1 {w.p('R9.1')} is not on U3 pin 19's row at x {X_R9}, or pin 19 is not SDRAM_NE")
w.path("SDRAM_NE", "U3.19", "R9.1")
w.path("SDRAM_NE", "R9.1", (X_WEST, y_ne))
w.label("SDRAM_NE", (X_WEST, y_ne), 180)


def bus(net, x, stubs, top, bottom):
    """A vertical bus at x from y top to y bottom, split at every stub; each stub pin runs to it."""
    ys = sorted({top, bottom, *[w.y(s) for s in stubs]})
    if ys[0] != top or ys[-1] != bottom:
        raise SystemExit(f"02-wire: a {net} stub lies outside its bus {top}..{bottom} at x {x}")
    w.path(net, *[(x, y) for y in ys])
    for s in stubs:
        w.path(net, s, (x, w.y(s)))


west_3v3 = [f"U3.{p}" for p in pins_on(west, "3V3_D")]
west_gnd = [f"U3.{p}" for p in pins_on(west, "GND")]
east_3v3 = [f"U3.{p}" for p in pins_on(east_side, "3V3_D")]
east_gnd = [f"U3.{p}" for p in pins_on(east_side, "GND")]
bus("3V3_D", X_W_3V3, west_3v3, Y_3V3, max(w.y(s) for s in west_3v3))
bus("GND", X_W_GND, west_gnd, min(w.y(s) for s in west_gnd), Y_GND)
bus("GND", X_E_GND, east_gnd, min(w.y(s) for s in east_gnd), Y_GND)
bus("3V3_D", X_E_3V3, east_3v3, Y_3V3, max(w.y(s) for s in east_3v3))

# The 3V3_D row along the top: its label, R9's rise, both buses, every capacitor's pin 1.
caps = [f"C{n}" for n in range(36, 43)]
w.path("3V3_D", (X_WEST, Y_3V3), (X_R9, Y_3V3), (X_W_3V3, Y_3V3), (X_E_3V3, Y_3V3),
       *[(w.x(f"{c}.1"), Y_3V3) for c in caps])
w.label("3V3_D", (X_WEST, Y_3V3), 180)
w.path("3V3_D", (X_R9, Y_3V3), "R9.2")
for c in caps:
    w.path("3V3_D", (w.x(f"{c}.1"), Y_3V3), f"{c}.1")

# The GND row along the bottom: its label, both buses, every capacitor's pin 2.
w.path("GND", (X_WEST, Y_GND), (X_W_GND, Y_GND), (X_E_GND, Y_GND), *[(w.x(f"{c}.2"), Y_GND) for c in caps])
w.label("GND", (X_WEST, Y_GND), 180)
for c in caps:
    w.path("GND", (w.x(f"{c}.2"), Y_GND), f"{c}.2")
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
