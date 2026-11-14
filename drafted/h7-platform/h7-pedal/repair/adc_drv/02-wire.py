"""Write op-list 02 for the h7-pedal adc_drv page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

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
from layout import (DY, TITLE, X_5V_W, X_BOT, X_GND_E, X_INV, X_LABEL_5V, X_LABEL_GND, X_LABEL_IN,  # noqa: E402
                    X_LABEL_VIN, X_OUT, Y_5V, Y_FB, Y_FB2, Y_GND, Y_IN, Y_OUT, Y_VB)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])


def on_row(pin, y, what):
    if w.y(pin) != y:
        raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not on {what} ({y})")


# (suffix, band offset, C_AC, R_IN, R_FA, C_FA, R_TOP, R_BOT, C_VBIAS, R_O, C_VIN, +IN, -IN, OUT)
BANDS = (
    ("L", 0, "C72", "R103", "R104", "C73", "R105", "R106", "C74", "R107", "C75", "U18.3", "U18.2", "U18.1"),
    ("R", DY, "C76", "R108", "R109", "C77", "R110", "R111", "C78", "R112", "C79", "U18.5", "U18.6", "U18.7"),
)
for x, dy, c_ac, r_in, r_fa, c_fa, r_top, r_bot, c_vb, r_o, c_vin, plus, minus, out in BANDS:
    y5, yg, yvb, yin, yout, yfb, yfb2 = (v + dy for v in (Y_5V, Y_GND, Y_VB, Y_IN, Y_OUT, Y_FB, Y_FB2))
    on_row(plus, yvb, f"the VBIAS_{x} row")
    for pin in (f"{c_ac}.1", f"{c_ac}.2", f"{r_in}.1", f"{r_in}.2", minus):
        on_row(pin, yin, f"the {x} input row")
    for pin in (out, f"{r_o}.1", f"{r_o}.2", f"{c_vin}.1"):
        on_row(pin, yout, f"the {x} output row")
    on_row(f"{r_fa}.1", yfb, "R_FA's loop")
    on_row(f"{c_fa}.1", yfb2, "C_FA's loop")
    # The input: IN_FOLLOW_x's label west of C_AC; C_AC into R_IN; R_IN into -IN past the node.
    w.path(f"IN_FOLLOW_{x}", f"{c_ac}.1", (X_LABEL_IN, yin))
    w.label(f"IN_FOLLOW_{x}", (X_LABEL_IN, yin), 180)
    w.path(f"ADC_AC_{x}", f"{c_ac}.2", f"{r_in}.1")
    w.path(f"ADC_INV_{x}", f"{r_in}.2", (X_INV, yin), minus)
    # The feedback: from the node down past R_FA's loop to C_FA's; east through each to the OUT tap.
    w.path(f"ADC_INV_{x}", (X_INV, yin), (X_INV, yfb), (X_INV, yfb2), f"{c_fa}.1")
    w.path(f"ADC_INV_{x}", (X_INV, yfb), f"{r_fa}.1")
    w.path(f"ADC_OUT_{x}", out, (X_OUT, yout), f"{r_o}.1")
    w.path(f"ADC_OUT_{x}", (X_OUT, yout), (X_OUT, yfb), (X_OUT, yfb2), f"{c_fa}.2")
    w.path(f"ADC_OUT_{x}", f"{r_fa}.2", (X_OUT, yfb))
    # VINx: R_O past C_VIN to its label.
    w.path(f"VIN{x}", f"{r_o}.2", f"{c_vin}.1", (X_LABEL_VIN, yout))
    w.label(f"VIN{x}", (X_LABEL_VIN, yout), 0)
    # VBIAS_x: R_TOP down to the row, east past R_BOT and C_VBIAS into +IN.
    w.path(f"VBIAS_{x}", f"{r_top}.2", (w.x(f"{r_top}.2"), yvb), (w.x(f"{r_bot}.1"), yvb),
           (w.x(f"{c_vb}.1"), yvb), plus)
    w.path(f"VBIAS_{x}", (w.x(f"{r_bot}.1"), yvb), f"{r_bot}.1")
    w.path(f"VBIAS_{x}", (w.x(f"{c_vb}.1"), yvb), f"{c_vb}.1")
    # GND: R_BOT, C_VBIAS and C_VIN up to the band's GND row.
    for pin in (f"{r_bot}.2", f"{c_vb}.2", f"{c_vin}.2"):
        w.path("GND", pin, (w.x(pin), yg))
    # 5V_A: R_TOP up to the band's 5V_A row.
    w.path("5V_A", f"{r_top}.1", (w.x(f"{r_top}.1"), y5))

# 5V_A: the upper row from the west vertical east past R105, the supply unit's V+, C80 and C81 to its
# label; the vertical down to the lower row, which runs east to R110.
on_row("U18.8", Y_5V, "the 5V_A row")
on_row("U18.4", Y_GND, "the GND row")
for pin in ("C80.1", "C81.1"):
    w.path("5V_A", pin, (w.x(pin), Y_5V))
for pin in ("C80.2", "C81.2"):
    w.path("GND", pin, (w.x(pin), Y_GND))
w.path("5V_A", (X_5V_W, Y_5V), (w.x("R105.1"), Y_5V), "U18.8", (w.x("C80.1"), Y_5V), (w.x("C81.1"), Y_5V),
       (X_LABEL_5V, Y_5V))
w.label("5V_A", (X_LABEL_5V, Y_5V), 0)
w.path("5V_A", (X_5V_W, Y_5V), (X_5V_W, Y_5V + DY), (w.x("R110.1"), Y_5V + DY))

# GND: the upper row from R106 east past C74, C75, the supply unit's V-, C80 and C81 to the east
# vertical; the vertical down to the lower row, which runs from R111 past C78 and C79 to GND's label.
w.path("GND", (X_BOT, Y_GND), (w.x("C74.2"), Y_GND), (w.x("C75.2"), Y_GND), "U18.4", (w.x("C80.2"), Y_GND),
       (w.x("C81.2"), Y_GND), (X_GND_E, Y_GND), (X_GND_E, Y_GND + DY))
w.path("GND", (X_BOT, Y_GND + DY), (w.x("C78.2"), Y_GND + DY), (w.x("C79.2"), Y_GND + DY), (X_GND_E, Y_GND + DY),
       (X_LABEL_GND, Y_GND + DY))
w.label("GND", (X_LABEL_GND, Y_GND + DY), 0)

print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
