"""Write op-list 02 for the h7-pedal usb page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. J7's A8 and B8 and
U15's port 2 (pins 3 and 4) carry the intent's no-connects. Every segment ends at the next tap, since
a wire end inside another segment is refused; each crossing layout.py names is two segments passing
each other, not an end.

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
from layout import (TITLE, X_3V3, X_BAR, X_DM_DOWN, X_DM_JOIN, X_DP_JOIN, X_DP_UP, X_EAST, X_LOOP_E,  # noqa: E402
                    X_LOOP_W, Y_LOOP_M, Y_LOOP_P,
                    X_GND_W, X_LABEL_W, X_OE_DOWN, X_S, X_SENSE_LABEL, X_VBUS_UP, Y_3V3, Y_EN, Y_GND,
                    Y_GTOP, Y_SENSE, Y_SHIELD, Y_VBUS)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])


def on_row(pin, y, what):
    if w.y(pin) != y:
        raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not on {what} ({y})")


# VBUS: J7's four stacked VBUS pins east and up to the row, east past C58 to U14's column, down to its
# pin 5; R84 stands on that corner.
w.path("VBUS", "J7.A4", (X_VBUS_UP, w.y("J7.A4")), (X_VBUS_UP, Y_VBUS), (w.x("C58.1"), Y_VBUS),
       (w.x("U14.5"), Y_VBUS), "U14.5")
w.path("VBUS", (w.x("C58.1"), Y_VBUS), "C58.1")
if w.p("R84.1") != (w.x("U14.5"), Y_VBUS):
    raise SystemExit(f"02-wire: R84's pin 1 {w.p('R84.1')} is not on the VBUS corner above U14's pin 5")

# USB_VBUS_SENSE: R84's top east along the sense row past R85 and C60 to the label.
for pin in ("R84.2", "R85.1", "C60.1"):
    on_row(pin, Y_SENSE, "the sense row")
w.path("USB_VBUS_SENSE", "R84.2", "R85.1", "C60.1", (X_SENSE_LABEL, Y_SENSE))
w.label("USB_VBUS_SENSE", (X_SENSE_LABEL, Y_SENSE), 0)

# CC1 and CC2 along their rows to R80 and R81.
on_row("R80.1", w.y("J7.A5"), "CC1's row")
on_row("R81.1", w.y("J7.B5"), "CC2's row")
w.path("USB_CC1", "J7.A5", "R80.1")
w.path("USB_CC2", "J7.B5", "R81.1")

# D- (A7, B7) and D+ (A6, B6): each pair joined, then to the tees west of U14; D+ steps up across D-.
w.path("USB_C_DM", "J7.A7", (X_DM_JOIN, w.y("J7.A7")), (X_DM_JOIN, w.y("J7.B7")), "J7.B7")
w.path("USB_C_DM", (X_DM_JOIN, w.y("J7.B7")), (X_DM_DOWN, w.y("J7.B7")), (X_DM_DOWN, w.y("U14.3")), (X_LOOP_W, w.y("U14.3")))
w.path("USB_C_DP", "J7.A6", (X_DP_JOIN, w.y("J7.A6")), (X_DP_JOIN, w.y("J7.B6")), "J7.B6")
w.path("USB_C_DP", (X_DP_JOIN, w.y("J7.B6")), (X_DP_UP, w.y("J7.B6")), (X_DP_UP, w.y("U14.1")), (X_LOOP_W, w.y("U14.1")))
# Each I/O pair's two pins are separate pins on the symbol, so each data row tees off west of U14,
# loops around the body (D+ over it, D- under it) and rejoins east of it, on its way to U15.
for net, pin_in, pin_out, to, y_loop in (("USB_C_DP", "U14.1", "U14.6", "U15.1", Y_LOOP_P),
                                         ("USB_C_DM", "U14.3", "U14.4", "U15.2", Y_LOOP_M)):
    y = w.y(pin_in)
    if w.y(pin_out) != y or w.y(to) != y:
        raise SystemExit(f"02-wire: {pin_in}, {pin_out} and {to} are not on one row")
    w.path(net, (X_LOOP_W, y), pin_in)
    w.path(net, pin_out, (X_LOOP_E, y), to)
    w.path(net, (X_LOOP_W, y), (X_LOOP_W, y_loop), (X_LOOP_E, y_loop), (X_LOOP_E, y))

# The MCU side: U15's D+ and D- east to the labels.
w.path("USB_DP", "U15.8", (X_EAST, w.y("U15.8")))
w.label("USB_DP", (X_EAST, w.y("U15.8")), 0)
w.path("USB_DM", "U15.7", (X_EAST, w.y("U15.7")))
w.label("USB_DM", (X_EAST, w.y("U15.7")), 0)

# 3V3_D: U15's VCC up to the row, east to the vertical (C59 above it, R83 below it), on to the label.
on_row("C59.1", Y_SENSE, "C59's foot, level with the sense row")
w.path("3V3_D", "U15.10", (w.x("U15.10"), Y_3V3), (X_3V3, Y_3V3), (X_EAST, Y_3V3))
w.label("3V3_D", (X_EAST, Y_3V3), 0)
w.path("3V3_D", "C59.1", (X_3V3, Y_3V3), "R83.1")

# USB_EN_N: OE east, down to the row, east past R83's foot to the label.
on_row("R83.2", Y_EN, "the USB_EN_N row")
w.path("USB_EN_N", "U15.6", (X_OE_DOWN, w.y("U15.6")), (X_OE_DOWN, Y_EN), "R83.2", (X_EAST, Y_EN))
w.label("USB_EN_N", (X_EAST, Y_EN), 0)

# Shield: J7's SH down to the shield row, R82 and C57 hanging from it.
for pin in ("C57.1", "R82.1"):
    on_row(pin, Y_SHIELD, "the shield row")
w.path("USB_SHIELD", "J7.SH", (w.x("J7.SH"), Y_SHIELD), "C57.1", "R82.1")

# GND. The label, the top row east to C59's top; R85's and C60's tops on it.
for pin in ("R85.2", "C60.2", "C59.2"):
    on_row(pin, Y_GTOP, "the top GND row")
w.path("GND", (X_LABEL_W, Y_GTOP), (X_GND_W, Y_GTOP), (X_BAR, Y_GTOP), "R85.2", "C60.2", "C59.2")
w.label("GND", (X_LABEL_W, Y_GTOP), 180)
# The CC and C58 bar: R81's and C58's GND ends level, R80's one row up, rising to the top row.
on_row("R81.2", w.y("C58.2"), "C58's GND end")
w.path("GND", "R81.2", (X_BAR, w.y("R81.2")), "C58.2")
w.path("GND", "R80.2", (X_BAR, w.y("R80.2")))
w.path("GND", (X_BAR, w.y("R81.2")), (X_BAR, w.y("R80.2")), (X_BAR, Y_GTOP))
# Down J7's west side to the bottom row, which takes R82, C57, J7, U14, U15 and U15's S.
bottom = ["R82.2", "C57.2", "J7.A1", "U14.2", "U15.5"]
for pin in ("R82.2", "C57.2"):
    on_row(pin, Y_GND, "the bottom GND row")
w.path("GND", (X_GND_W, Y_GTOP), (X_GND_W, Y_GND), "R82.2", "C57.2", *[(w.x(t), Y_GND) for t in bottom[2:]],
       (X_S, Y_GND))
for t in bottom[2:]:
    w.path("GND", (w.x(t), Y_GND), t)
w.path("GND", "U15.9", (X_S, w.y("U15.9")), (X_S, Y_GND))
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
