"""Write op-list 02 for the h7-pedal out page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

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
from layout import (DY, TITLE, X_GND_E, X_INV, X_LABEL_FX, X_LABEL_GND, X_LABEL_VIN, X_LABEL_VMID,  # noqa: E402
                    X_LABEL_VOUT, X_OA, Y_FO, Y_FO2, Y_GND, Y_INV, Y_NI, Y_OUT, Y_VM)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])


def on_row(pin, y, what):
    if w.y(pin) != y:
        raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not on {what} ({y})")


# (suffix, band offset, C_A+, C_A-, R_D1, R_D2, R_FO, C_FO, R_GO, C_GO, R_S, C_OUT, C_DC, R_B, out pad,
#  GND pad, +IN, -IN, OUT)
BANDS = (
    ("L", 0, "C82", "C83", "R113", "R114", "R115", "C84", "R116", "C85", "R117", "C86", "C87", "R118", "TP11",
     "TP12", "U19.3", "U19.2", "U19.1"),
    ("R", DY, "C88", "C89", "R119", "R120", "R121", "C90", "R122", "C91", "R123", "C92", "C93", "R124", "TP13",
     "TP14", "U19.5", "U19.6", "U19.7"),
)
gnd_rows = []
for (x, dy, c_ap, c_am, r_d1, r_d2, r_fo, c_fo, r_go, c_go, r_s, c_out, c_dc, r_b, tp_out, tp_gnd,
     plus, minus, out) in BANDS:
    yvm, yni, yout, yinv, yfo, yfo2, yg = (v + dy for v in (Y_VM, Y_NI, Y_OUT, Y_INV, Y_FO, Y_FO2, Y_GND))
    for pin in (f"{c_am}.1", f"{c_am}.2", f"{r_d2}.1", f"{r_d2}.2", f"{r_go}.1", f"{c_go}.1", plus):
        on_row(pin, yni, f"the OUT_NI_{x} row")
    for pin in (f"{c_ap}.1", f"{c_ap}.2", f"{r_d1}.1", f"{r_d1}.2", minus):
        on_row(pin, yinv, f"the OUT_INV_{x} row")
    for pin in (out, f"{r_s}.1", f"{r_s}.2", f"{c_out}.1", f"{c_dc}.1", f"{c_dc}.2", f"{tp_out}.1", f"{r_b}.1"):
        on_row(pin, yout, f"the {x} output row")
    on_row(f"{r_fo}.1", yfo, "R_FO's loop")
    on_row(f"{c_fo}.1", yfo2, "C_FO's loop")
    on_row(f"{tp_gnd}.1", yg, "the GND row")
    # The upper leg: VOUTx-'s label, C_A-, R_D2, past R_GO and C_GO into +IN.
    w.path(f"VOUT{x}-", f"{c_am}.1", (X_LABEL_VOUT, yni))
    w.label(f"VOUT{x}-", (X_LABEL_VOUT, yni), 180)
    w.path(f"OUT_AM_{x}", f"{c_am}.2", f"{r_d2}.1")
    w.path(f"OUT_NI_{x}", f"{r_d2}.2", f"{r_go}.1", f"{c_go}.1", plus)
    # VMID_x: R_GO and C_GO up to the row, which runs west to the label.
    w.path(f"VMID_{x}", f"{r_go}.2", (w.x(f"{r_go}.2"), yvm))
    w.path(f"VMID_{x}", f"{c_go}.2", (w.x(f"{c_go}.2"), yvm), (w.x(f"{r_go}.2"), yvm), (X_LABEL_VMID, yvm))
    w.label(f"VMID_{x}", (X_LABEL_VMID, yvm), 180)
    # The lower leg: VOUTx+'s label, C_A+, R_D1, the node into -IN.
    w.path(f"VOUT{x}+", f"{c_ap}.1", (X_LABEL_VOUT, yinv))
    w.label(f"VOUT{x}+", (X_LABEL_VOUT, yinv), 180)
    w.path(f"OUT_AP_{x}", f"{c_ap}.2", f"{r_d1}.1")
    w.path(f"OUT_INV_{x}", f"{r_d1}.2", (X_INV, yinv), minus)
    # The feedback: from the node down past R_FO's loop to C_FO's; east through each to the OUT tap.
    w.path(f"OUT_INV_{x}", (X_INV, yinv), (X_INV, yfo), (X_INV, yfo2), f"{c_fo}.1")
    w.path(f"OUT_INV_{x}", (X_INV, yfo), f"{r_fo}.1")
    w.path(f"OUT_OA_{x}", out, (X_OA, yout), f"{r_s}.1")
    w.path(f"OUT_OA_{x}", (X_OA, yout), (X_OA, yfo), (X_OA, yfo2), f"{c_fo}.2")
    w.path(f"OUT_OA_{x}", f"{r_fo}.2", (X_OA, yfo))
    # The output: R_S past C_OUT into C_DC; C_DC past the pad and R_B to FX_OUT_x's label.
    w.path(f"OUT_S_{x}", f"{r_s}.2", f"{c_out}.1", f"{c_dc}.1")
    w.path(f"FX_OUT_{x}", f"{c_dc}.2", f"{tp_out}.1", f"{r_b}.1", (X_LABEL_FX, yout))
    w.label(f"FX_OUT_{x}", (X_LABEL_FX, yout), 0)
    # GND drops onto the band's GND row.
    for pin in (f"{c_out}.2", f"{r_b}.2"):
        w.path("GND", pin, (w.x(pin), yg))
    gnd_rows.append((yg, c_out, tp_gnd, r_b))

# VIN_A: the supply unit's V+ east past C94 and C95 to its label.
on_row("U19.8", Y_NI, "the VIN_A row")
on_row("U19.4", Y_GND, "the GND row")
w.path("VIN_A", "U19.8", (w.x("C94.1"), Y_NI), (w.x("C95.1"), Y_NI), (X_LABEL_VIN, Y_NI))
w.label("VIN_A", (X_LABEL_VIN, Y_NI), 0)
for pin in ("C94.1", "C95.1"):
    w.path("VIN_A", (w.x(pin), Y_NI), pin)
for pin in ("C94.2", "C95.2"):
    w.path("GND", pin, (w.x(pin), Y_GND))

# GND: the upper band's row from C_OUT past the GND pad, R_B, the supply unit's V-, C94 and C95 to the
# east vertical, down to the lower band's row, which runs from its C_OUT past its pad and R_B to the
# vertical and on to GND's label.
(yg_l, c_out_l, tp_l, r_b_l), (yg_r, c_out_r, tp_r, r_b_r) = gnd_rows
w.path("GND", (w.x(f"{c_out_l}.2"), yg_l), f"{tp_l}.1", (w.x(f"{r_b_l}.2"), yg_l), "U19.4", (w.x("C94.2"), yg_l),
       (w.x("C95.2"), yg_l), (X_GND_E, yg_l), (X_GND_E, yg_r))
w.path("GND", (w.x(f"{c_out_r}.2"), yg_r), f"{tp_r}.1", (w.x(f"{r_b_r}.2"), yg_r), (X_GND_E, yg_r), (X_LABEL_GND, yg_r))
w.label("GND", (X_LABEL_GND, yg_r), 0)

print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
