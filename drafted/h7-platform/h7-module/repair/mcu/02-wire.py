"""Write op-list 02 for the mcu page (`draughting/pages/page.py`, `Wiring`). See layout.py for the plan.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. Every NC pin carries
the intent's no-connect (CORE-27: an unused GPIO is NC in the model, `circuits/h7-platform/module/
mcu.ts`), and no NC pin is wired.

Which pins are on which face, and on which net, is read from pins.json, the intent and ports.json,
never from a list typed here; the nets the layout routes by hand (3V3_D, VREF_A, VCAP, GND, VSSA)
are checked to reach exactly the pins and faces it expects, so a model change stops this script by
name.

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
from title_block import DATE  # noqa: E402
from layout import (E_LABEL_DROP, TITLE, X0, X_E_TURN, X_W_3V3, X_W_VREF, Y0, Y_3V3_ROW,  # noqa: E402
                    Y_N_LABEL, Y_RAIL_LABEL, Y_S_LABEL, Y_VCAP_TEE, Y_VREF_ROW)

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])
ports = json.loads(pathlib.Path(sys.argv[2]).read_text())
one_pin = {port["name"] for port in ports if len(port["pins"]) == 1}
nc = set(w.no_connect_pins)

# U1's pins by face, from where pins.json puts them relative to U1's origin (rotation 90).
X_WEST, X_EAST = X0 - 4600, X0 + 4500
Y_NORTH, Y_SOUTH = Y0 - 1400, Y0 + 1400
faces = {"W": [], "E": [], "N": [], "S": []}
for number in w.pins["U1"]:
    x, y = w.p(f"U1.{number}")
    face = "W" if x == X_WEST else "E" if x == X_EAST else "N" if y == Y_NORTH else "S" if y == Y_SOUTH else None
    if face is None:
        raise SystemExit(f"02-wire: U1 pin {number} at {(x, y)} is on no face of the symbol as layout.py places it")
    faces[face].append(f"U1.{number}")


def net_of(pin):
    return w.pin_net.get(pin)


def on(face, net):
    return [p for p in faces[face] if net_of(p) == net]


def expect(net, got):
    want = sorted(p for p in w.pin_net if w.pin_net[p] == net)
    if sorted(got) != want:
        raise SystemExit(f"02-wire: {net} reaches {want} where layout.py routes {sorted(got)}; the model has changed")


# Every pin is an NC, a one-pin port, or on a net routed below.
for pins in faces.values():
    for pin in pins:
        if pin in nc:
            if net_of(pin) is not None:
                raise SystemExit(f"02-wire: {pin} is a no-connect in the intent and on {net_of(pin)}")
        elif net_of(pin) is None:
            raise SystemExit(f"02-wire: {pin} is on no net and is not a no-connect")

# One-pin signals, north and south: each straight out by one stub to its label. No one-pin port is
# on the west or east face (checked: those faces hold only the routed nets below).
for pin in faces["W"] + faces["E"]:
    if net_of(pin) in one_pin and net_of(pin) != "VSSA":
        raise SystemExit(f"02-wire: {pin} ({net_of(pin)}) is a one-pin port on the west or east face, which layout.py does not route")
for face, y_label, rot in (("N", Y_N_LABEL, 90), ("S", Y_S_LABEL, 270)):
    for pin in faces[face]:
        net = net_of(pin)
        if net in one_pin:
            w.path(net, pin, (w.x(pin), y_label))
            w.label(net, (w.x(pin), y_label), rot)

# 3V3_D: the west pins to the 3V3_D bus; the bus south to its row, east under PDR_ON and up to it.
west_3v3 = sorted(on("W", "3V3_D"), key=w.y)
pdr_on = on("S", "3V3_D")
vdda = on("W", "VREF_A")
vref_plus = on("S", "VREF_A")
expect("3V3_D", west_3v3 + pdr_on)
expect("VREF_A", vdda + vref_plus)
if len(pdr_on) != 1 or len(vdda) != 1 or len(vref_plus) != 1:
    raise SystemExit(f"02-wire: layout.py routes one 3V3_D pin and one VREF_A pin on the south face and one VREF_A pin on "
                     f"the west face; got {pdr_on}, {vref_plus}, {vdda}")
pdr_on, vdda, vref_plus = pdr_on[0], vdda[0], vref_plus[0]
if not w.y(vdda) < min(w.y(p) for p in west_3v3):
    raise SystemExit(f"02-wire: VDDA {vdda} is not north of every west 3V3_D pin, so its run west would cross the 3V3_D bus")
if not w.x(vref_plus) < w.x(pdr_on):
    raise SystemExit("02-wire: VREF+ is not west of PDR_ON on the south face, so VREF_A's rise would cross 3V3_D's row")
# NRST and BOOT0, west of VREF+, have labels above both rows (Y_S_LABEL < Y_VREF_ROW < Y_3V3_ROW).
for p in faces["S"]:
    if w.x(vref_plus) < w.x(p) < w.x(pdr_on):
        raise SystemExit(f"02-wire: {p} lies between VREF+ and PDR_ON on the south face; layout.py expects them adjacent")

ys = [w.y(p) for p in west_3v3]
w.path("3V3_D", *[(X_W_3V3, y) for y in ys], (X_W_3V3, Y_3V3_ROW), (w.x(pdr_on), Y_3V3_ROW), pdr_on)
for p in west_3v3:
    w.path("3V3_D", p, (X_W_3V3, w.y(p)))
w.path("3V3_D", (X_W_3V3, Y_3V3_ROW), (X_W_3V3, Y_RAIL_LABEL))
w.label("3V3_D", (X_W_3V3, Y_RAIL_LABEL), 270)

# VREF_A: VDDA west to the VREF_A bus, south to its row, east under VREF+ and up to it.
w.path("VREF_A", vdda, (X_W_VREF, w.y(vdda)), (X_W_VREF, Y_VREF_ROW), (w.x(vref_plus), Y_VREF_ROW), vref_plus)
w.path("VREF_A", (X_W_VREF, Y_VREF_ROW), (X_W_VREF, Y_RAIL_LABEL))
w.label("VREF_A", (X_W_VREF, Y_RAIL_LABEL), 270)

# VCAP: its two south pins meet at a tee; the east one runs on down to the label.
vcap = sorted(on("S", "VCAP"), key=w.x)
expect("VCAP", vcap)
if len(vcap) != 2:
    raise SystemExit(f"02-wire: layout.py joins two VCAP pins on the south face; got {vcap}")
first, second = vcap
w.path("VCAP", first, (w.x(first), Y_VCAP_TEE), (w.x(second), Y_VCAP_TEE))
w.path("VCAP", second, (w.x(second), Y_VCAP_TEE))
w.path("VCAP", (w.x(second), Y_VCAP_TEE), (w.x(second), Y_S_LABEL))
w.label("VCAP", (w.x(second), Y_S_LABEL), 270)

# The east face: the stacked VSS point (GND) and VSSA, north of it. Every pin at a point is on the
# wire's net (Wiring checks it), so one wire takes all twelve stacked VSS pins.
gnd = on("E", "GND")
vssa = on("E", "VSSA")
expect("GND", gnd)
expect("VSSA", vssa)
if len({w.p(p) for p in gnd}) != 1 or len(vssa) != 1 or not w.y(vssa[0]) < w.y(gnd[0]):
    raise SystemExit(f"02-wire: layout.py expects GND's pins stacked at one point with VSSA north of it; got {gnd}, {vssa}")
if len(faces["E"]) != len(gnd) + 1:
    raise SystemExit(f"02-wire: the east face holds {faces['E']}, more than GND and VSSA")
g, v = gnd[0], vssa[0]
w.path("GND", g, (X_E_TURN, w.y(g)), (X_E_TURN, w.y(g) + E_LABEL_DROP))
w.label("GND", (X_E_TURN, w.y(g) + E_LABEL_DROP), 270)
w.path("VSSA", v, (X_E_TURN, w.y(v)), (X_E_TURN, w.y(v) - E_LABEL_DROP))
w.label("VSSA", (X_E_TURN, w.y(v) - E_LABEL_DROP), 90)
print(w.op_list(sys.argv[3], TITLE, DATE, sys.argv[4]))
