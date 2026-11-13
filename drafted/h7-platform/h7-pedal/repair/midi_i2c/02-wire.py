"""Write op-list 02 for the h7-pedal midi_i2c page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. U16's NC (pin 1) carries
the intent's no-connect. The page note is layout.NOTES. Every segment ends at the next tap, since a
wire end inside another segment is refused; the one crossing layout.py names is two segments passing
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
from layout import (NOTES, TITLE, X_3V3_W, X_3V3P_LABEL, X_EAST, X_I2C_LABEL, X_LABEL_W,  # noqa: E402
                    X_RX_LABEL, X_TX_LABEL, Y_3V3D, Y_3V3D_LOW, Y_3V3P, Y_DRAIN, Y_GND, Y_J8_GND,
                    Y_PIN4, Y_PIN5, Y_SCL, Y_SDA, Y_TX)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])


def on_row(pin, y, what):
    if w.y(pin) != y:
        raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not on {what} ({y})")


# J8 is turned so its pins point up, west to east 1 (3V3_D), 2 (TX), 3 (RX), 4 (GND).
tops = [w.p(f"J8.{n}") for n in "1234"]
if len({y for _, y in tops}) != 1 or [x for x, _ in tops] != sorted(x for x, _ in tops):
    raise SystemExit(f"02-wire: J8's pins {tops} are not one row, 1 to 4 west to east")

# MIDI_UART_TX: the label east past R86 and J8's riser into U16's A.
on_row("R86.1", Y_TX, "the TX row")
on_row("U16.2", Y_TX, "the TX row")
w.path("MIDI_UART_TX", (X_TX_LABEL, Y_TX), "R86.1", (w.x("J8.2"), Y_TX), "U16.2")
w.label("MIDI_UART_TX", (X_TX_LABEL, Y_TX), 180)
w.path("MIDI_UART_TX", "J8.2", (w.x("J8.2"), Y_TX))

# 3V3_D. The lower row: the label east past R93, R94 and TP6 to J8's 3V3_D riser; from it, west of
# MIDI_UART_TX's label, the vertical up to the top row, which takes R86, U16's VCC and C61.
for pin in ("R93.2", "R94.2", "TP6.1"):
    on_row(pin, Y_3V3D_LOW, "the lower 3V3_D row")
w.path("3V3_D", (X_LABEL_W, Y_3V3D_LOW), (X_3V3_W, Y_3V3D_LOW), "R93.2", "R94.2", "TP6.1",
       (w.x("J8.1"), Y_3V3D_LOW), "J8.1")
w.label("3V3_D", (X_LABEL_W, Y_3V3D_LOW), 180)
on_row("C61.1", Y_3V3D, "the top 3V3_D row")
w.path("3V3_D", (X_3V3_W, Y_3V3D_LOW), (X_3V3_W, Y_3V3D), (w.x("R86.2"), Y_3V3D), (w.x("U16.5"), Y_3V3D), "C61.1")
w.path("3V3_D", "R86.2", (w.x("R86.2"), Y_3V3D))
w.path("3V3_D", "U16.5", (w.x("U16.5"), Y_3V3D))

# The I2C pull-ups' lower ends west to their labels; SDA's drops one row first, under SCL's.
on_row("R93.1", Y_SCL, "the SCL row")
w.path("EXP_I2C_SCL", (X_I2C_LABEL, Y_SCL), "R93.1")
w.label("EXP_I2C_SCL", (X_I2C_LABEL, Y_SCL), 180)
w.path("EXP_I2C_SDA", (X_I2C_LABEL, Y_SDA), (w.x("R94.1"), Y_SDA), "R94.1")
w.label("EXP_I2C_SDA", (X_I2C_LABEL, Y_SDA), 180)

# MIDI_UART_RX: J8's RX up to the lower row's level and east to its label.
w.path("MIDI_UART_RX", "J8.3", (w.x("J8.3"), Y_3V3D_LOW), (X_RX_LABEL, Y_3V3D_LOW))
w.label("MIDI_UART_RX", (X_RX_LABEL, Y_3V3D_LOW), 0)

# MIDI_GATE: U16's Y east past C61 and R87 into Q9's gate.
on_row("R87.1", Y_TX, "the gate row")
on_row("Q9.1", Y_TX, "the gate row")
w.path("MIDI_GATE", "U16.4", "R87.1", "Q9.1")

# 3V3_P: the label east to R87's top and Q9's source.
w.path("3V3_P", (X_3V3P_LABEL, Y_3V3P), (w.x("R87.2"), Y_3V3P), (w.x("Q9.2"), Y_3V3P), "Q9.2")
w.label("3V3_P", (X_3V3P_LABEL, Y_3V3P), 180)
w.path("3V3_P", "R87.2", (w.x("R87.2"), Y_3V3P))

# MIDI_DRAIN: Q9's drain down to the drain row, the four RA resistors hanging from it.
ra = ["R88", "R89", "R90", "R91"]
for r in ra:
    on_row(f"{r}.1", Y_DRAIN, "the drain row")
    on_row(f"{r}.2", Y_PIN4, "the MIDI_PIN4 row")
w.path("MIDI_DRAIN", "Q9.3", (w.x("Q9.3"), Y_DRAIN), *[f"{r}.1" for r in ra])
w.path("MIDI_PIN4", *[f"{r}.2" for r in ra], (X_EAST, Y_PIN4))
w.label("MIDI_PIN4", (X_EAST, Y_PIN4), 0)

# MIDI_PIN5: the label west to R92, which hangs to the GND row.
on_row("R92.1", Y_PIN5, "the MIDI_PIN5 row")
w.path("MIDI_PIN5", (X_EAST, Y_PIN5), "R92.1")
w.label("MIDI_PIN5", (X_EAST, Y_PIN5), 0)

# GND: the label east along the bottom, taking U16's drop (which J8's GND joins), C61's drop and R92.
on_row("R92.2", Y_GND, "the GND row")
w.path("GND", (X_LABEL_W, Y_GND), (w.x("U16.3"), Y_GND), (w.x("C61.2"), Y_GND), "R92.2")
w.label("GND", (X_LABEL_W, Y_GND), 180)
w.path("GND", "U16.3", (w.x("U16.3"), Y_J8_GND), (w.x("U16.3"), Y_GND))
w.path("GND", "J8.4", (w.x("J8.4"), Y_J8_GND), (w.x("U16.3"), Y_J8_GND))
w.path("GND", "C61.2", (w.x("C61.2"), Y_GND))

for lines, at in NOTES:
    w.note(lines, at)
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
