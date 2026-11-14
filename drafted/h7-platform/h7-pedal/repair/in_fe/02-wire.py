"""Write op-list 02 for the h7-pedal in_fe page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. The intent has no
no-connects on this page. Every segment ends at the next tap, since a wire end inside another
segment is refused.

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
from layout import (TITLE, X_AC, X_FOLLOW, X_FX, X_GND_LABEL, X_LOOP_E, X_LOOP_W, X_T, X_VIN_LABEL,  # noqa: E402
                    X_VMID, Y_COMP_L, Y_COMP_R, Y_GND, Y_L, Y_LOOP_L, Y_LOOP_R, Y_R, Y_VIN, Y_VMID_L,
                    Y_VMID_R)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])


def on_row(pin, y, what):
    if w.y(pin) != y:
        raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not on {what} ({y})")


# Each channel: (suffix, row, R_RF, pad, C_RF, R_PD, C_IN, C_COMP, R_DIV1, R_DIV2, C_T, +IN, -IN, OUT,
# C_COMP's loop row, R_DIV2's label row, follower loop row).
CHANNELS = (
    ("L", Y_L, "R95", "TP7", "C62", "R96", "C63", "C64", "R97", "R98", "C65", "U17.3", "U17.2", "U17.1",
     Y_COMP_L, Y_VMID_L, Y_LOOP_L),
    ("R", Y_R, "R99", "TP9", "C66", "R100", "C67", "C68", "R101", "R102", "C69", "U17.5", "U17.6", "U17.7",
     Y_COMP_R, Y_VMID_R, Y_LOOP_R),
)

for x, row, r_rf, pad, c_rf, r_pd, c_in, c_comp, r_div1, r_div2, c_t, plus, minus, out, y_comp, y_vmid, y_loop in CHANNELS:
    for pin in (f"{r_rf}.1", f"{r_rf}.2", f"{pad}.1", f"{c_rf}.1", f"{r_pd}.1", f"{c_in}.1", f"{c_in}.2",
                f"{r_div1}.1", f"{r_div1}.2", f"{r_div2}.1", f"{c_t}.1", plus):
        on_row(pin, row, f"the {x} channel's row")
    for pin in (f"{c_comp}.1", f"{c_comp}.2"):
        on_row(pin, y_comp, f"the {x} channel's C_COMP loop")
    on_row(f"{r_div2}.2", y_vmid, f"VMID_{x}'s row")
    # FX_IN_x's label west of R_RF.
    w.path(f"FX_IN_{x}", f"{r_rf}.1", (X_FX, row))
    w.label(f"FX_IN_{x}", (X_FX, row), 180)
    # IN_RF_x: R_RF east past the pad, C_RF and R_PD into C_IN.
    w.path(f"IN_RF_{x}", f"{r_rf}.2", f"{pad}.1", f"{c_rf}.1", f"{r_pd}.1", f"{c_in}.1")
    # IN_AC_x: C_IN into R_DIV1, with a tap round to C_COMP.
    w.path(f"IN_AC_{x}", f"{c_in}.2", (X_AC, row), f"{r_div1}.1")
    w.path(f"IN_AC_{x}", (X_AC, row), (X_AC, y_comp), f"{c_comp}.1")
    # Node T: R_DIV1 east past R_DIV2 and C_T into +IN, with a tap round to C_COMP.
    w.path(f"IN_T_{x}", f"{r_div1}.2", (X_T, row), f"{r_div2}.1", f"{c_t}.1", plus)
    w.path(f"IN_T_{x}", (X_T, row), (X_T, y_comp), f"{c_comp}.2")
    # VMID_x: R_DIV2's far end west to its label.
    w.path(f"VMID_{x}", f"{r_div2}.2", (X_VMID, y_vmid))
    w.label(f"VMID_{x}", (X_VMID, y_vmid), 180)
    # IN_FOLLOW_x: OUT east to the label; from the tap, the loop under the body into -IN.
    w.path(f"IN_FOLLOW_{x}", out, (X_LOOP_E, w.y(out)), (X_FOLLOW, w.y(out)))
    w.label(f"IN_FOLLOW_{x}", (X_FOLLOW, w.y(out)), 0)
    w.path(f"IN_FOLLOW_{x}", (X_LOOP_E, w.y(out)), (X_LOOP_E, y_loop), (X_LOOP_W, y_loop), (X_LOOP_W, w.y(minus)), minus)

# VIN_A: the supply unit's V+ east past C70 and C71 to its label.
on_row("U17.8", Y_VIN, "the VIN_A row")
w.path("VIN_A", "U17.8", (w.x("C70.1"), Y_VIN), (w.x("C71.1"), Y_VIN), (X_VIN_LABEL, Y_VIN))
w.label("VIN_A", (X_VIN_LABEL, Y_VIN), 0)
for pin in ("C70.1", "C71.1"):
    w.path("VIN_A", (w.x(pin), Y_VIN), pin)

# GND: the row from its label east past the two GND pads, each channel's C_RF, R_PD and C_T, the
# supply unit's V- and the two decoupling capacitors.
on_row("TP8.1", Y_GND, "the GND row")
on_row("TP10.1", Y_GND, "the GND row")
on_row("U17.4", Y_GND, "the GND row")
drops = ["C62.2", "C66.2", "R96.2", "R100.2", "C65.2", "C69.2"]
for pin in drops + ["C70.2", "C71.2"]:
    w.path("GND", pin, (w.x(pin), Y_GND))
w.path("GND", (X_GND_LABEL, Y_GND), "TP8.1", "TP10.1", *[(w.x(p), Y_GND) for p in drops], "U17.4",
       (w.x("C70.2"), Y_GND), (w.x("C71.2"), Y_GND))
w.label("GND", (X_GND_LABEL, Y_GND), 180)

print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
