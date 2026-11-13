"""Write op-list 02 for the h7-pedal prail page (`draughting/pages/page.py`, `Wiring`).

The rows and columns are `layout.py`'s. VIN_MOD runs east along its row from its label, taking C14,
C15 and C16, and drops to U3's VIN. GND runs east along its row from its label, taking C14-C16, Q4's
source, R17, C23, C24, C21, U3's GND, R14 and C17-C20. PF_ON is one stub from its label to R16, and
PF_TRIP one from its label to Q4's gate. PRAIL_EN runs from R16 east to U3's EN, tapped by R18, R17,
C23 and C24; PEN_D joins Q4's drain to R18. PRAIL_SS joins U3's SS to C21; PRAIL_BST U3's BST to
R15; PRAIL_BST_CAP R15 to C22's top. PRAIL_SW runs from U3's SW through C22's bottom pin to L1.
3V3_P runs from L1 east to its label, taking R13 and C17-C20. PRAIL_FB runs from U3's FB east to
R13's bottom, and down to R14. U3's RT (pin 1) is the intent's no-connect. Every segment ends at the
next tap, since a wire end inside another segment is refused.

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
from layout import TITLE, X_EAST, X_PF, X_VDROP, X_WEST, Y_EN, Y_GND, Y_TRIP, Y_VIN  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])

# VIN_MOD: the row from its label east, a drop to each input capacitor, and down into U3's VIN.
caps_in = ["C14.1", "C15.1", "C16.1"]
w.path("VIN_MOD", (X_WEST, Y_VIN), *[(w.x(pin), Y_VIN) for pin in caps_in], (X_VDROP, Y_VIN),
       (X_VDROP, w.y("U3.3")), "U3.3")
w.label("VIN_MOD", (X_WEST, Y_VIN), 180)
for pin in caps_in:
    w.path("VIN_MOD", (w.x(pin), Y_VIN), pin)

# GND: the row from its label east to C20, and a drop from each tap.
hang = ["C14.2", "C15.2", "C16.2", "Q4.2", "R17.2", "C23.2", "C24.2", "C21.2", "U3.4", "R14.2",
        "C17.2", "C18.2", "C19.2", "C20.2"]
w.path("GND", (X_WEST, Y_GND), *[(w.x(pin), Y_GND) for pin in hang])
w.label("GND", (X_WEST, Y_GND), 180)
for pin in hang:
    w.path("GND", pin, (w.x(pin), Y_GND))

# PF_ON and PF_TRIP: one stub each from its label.
w.path("PF_ON", (X_PF, Y_EN), "R16.1")
w.label("PF_ON", (X_PF, Y_EN), 180)
w.path("PF_TRIP", (X_PF, Y_TRIP), "Q4.1")
w.label("PF_TRIP", (X_PF, Y_TRIP), 180)

# PRAIL_EN: R16 east to U3's EN, with R18 rising onto it and R17, C23, C24 hanging from it.
taps = ["R18.2", "R17.1", "C23.1", "C24.1"]
w.path("PRAIL_EN", "R16.2", *[(w.x(pin), Y_EN) for pin in taps], "U3.2")
for pin in taps:
    w.path("PRAIL_EN", (w.x(pin), Y_EN), pin)

# PEN_D: Q4's drain up to R18.
w.path("PEN_D", "Q4.3", "R18.1")

# PRAIL_SS, PRAIL_BST, PRAIL_BST_CAP and PRAIL_SW, east of and beside U3.
w.path("PRAIL_SS", "U3.7", "C21.1")
w.path("PRAIL_BST", "U3.6", "R15.1")
w.path("PRAIL_BST_CAP", "R15.2", "C22.1")
w.path("PRAIL_SW", "U3.5", "C22.2", "L1.1")

# 3V3_P: L1 east to its label, R13 and the output capacitors hanging from it.
caps_out = ["C17.1", "C18.1", "C19.1", "C20.1"]
y_out = w.y("L1.2")
w.path("3V3_P", "L1.2", "R13.1", *[(w.x(pin), y_out) for pin in caps_out], (X_EAST, y_out))
w.label("3V3_P", (X_EAST, y_out), 0)
for pin in caps_out:
    w.path("3V3_P", (w.x(pin), y_out), pin)

# PRAIL_FB: U3's FB east to R13's bottom, then down to R14.
w.path("PRAIL_FB", "U3.8", "R13.2", "R14.1")
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
