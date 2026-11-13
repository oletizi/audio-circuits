"""Write op-list 02 for the power page: every wire, junction and no-connect, and one LOCAL label per port.

Reads the pin points `draughting/pages/pins.py` reports from the sheet after op-list 01, so a wire that
names a pin lands on akcli's own reading of it. Every wire is one straight segment and carries the
net it is drawn for, written to a sidecar (`02-wire.nets.json`) that 05-text-edits.py reads to give
each wire its net's stroke. A junction goes wherever three or more connections meet (wire ends and
pins), computed from the segments.

Labels: one LOCAL label on each of the block's three port nets (VIN_MOD, GND, 3V3_D), at the end of
its wire on the page edge. Op-list 04 (`tools/draught/hierarchical-labels.ts`; 03 is the
PWR_FLAGs) turns each into the block's hierarchical label at the same place. No private net is labelled: each is drawn as wire.

Refuses a segment that is not axis-aligned, a zero-length one, a segment ending inside another,
and a pin that lies on a wire's interior (which KiCad would join without a wire end there).

usage: python3 02-wire.py <pins.json> <sheet-file-name> <nets-sidecar-out> > 02-wire.json
"""
import json
import pathlib
import sys
from collections import Counter

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from layout import (X_EN, X_PORT_EAST, X_PORT_WEST, X_SW_TAP, X_VIN_MOD_TAP, Y_EN, Y_FB, Y_GND,  # noqa: E402
                    Y_SW, Y_TOP, Y_VIN)

if len(sys.argv) != 4:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <sheet-file-name> <nets-sidecar-out>")
PINS = json.loads(pathlib.Path(sys.argv[1]).read_text())


def p(ref_pin):
    ref, pin = ref_pin.split(".")
    if ref not in PINS or pin not in PINS[ref]:
        raise SystemExit(f"02-wire: no pin {ref_pin} in {sys.argv[1]}")
    return tuple(PINS[ref][pin])


def x(ref_pin):
    return p(ref_pin)[0]


segments = []  # ((x1, y1), (x2, y2), net)


def path(net, *pts):
    """A polyline on one net, as straight segments; each point a REF.PIN or an (x, y) in mils."""
    xy = [p(q) if isinstance(q, str) else q for q in pts]
    for a, b in zip(xy, xy[1:]):
        if a[0] != b[0] and a[1] != b[1]:
            raise SystemExit(f"02-wire: segment {a}-{b} on {net} is not axis-aligned")
        if a == b:
            raise SystemExit(f"02-wire: zero-length segment at {a} on {net}")
        segments.append((a, b, net))


def drop(net, rail_y, ref_pin):
    """A vertical stub from a rail at rail_y to a pin directly above or below it."""
    path(net, (x(ref_pin), rail_y), ref_pin)


labels = []  # (name, (x, y), rotation)

# --- VIN_MOD: the west port, L1, and the row above the input network to R4 ------------------
path("VIN_MOD", (X_PORT_WEST, Y_VIN), (X_VIN_MOD_TAP, Y_VIN), "L1.1")
path("VIN_MOD", (X_VIN_MOD_TAP, Y_VIN), (X_VIN_MOD_TAP, Y_TOP), "R4.1")
labels.append(("VIN_MOD", (X_PORT_WEST, Y_VIN), 180))

# --- VIN_BUCK: L1 to U2's VIN, every input-network part hanging from it ---------------------
VIN_TAPS = ["R3.1", "C26.1", "C27.1", "C28.1"]
path("VIN_BUCK", "L1.2", *[(x(t), Y_VIN) for t in VIN_TAPS], "U2.3")
for t in VIN_TAPS:
    drop("VIN_BUCK", Y_VIN, t)
path("DAMP", "R3.2", "C29.1")

# --- EN: R4 east along the top row, down across the VIN_BUCK row to EN; R5 below to GND -------
path("EN", "R4.2", (X_EN, Y_TOP), (X_EN, Y_EN), "U2.2")
path("EN", (X_EN, Y_EN), "R5.1")

# --- SS: C31 just west of U2; RT left open ------------------------------------------------------
if p("U2.7")[1] != p("C31.1")[1]:
    raise SystemExit(f"02-wire: C31's pin 1 {p('C31.1')} is not on U2's SS row {p('U2.7')}")
path("SS", "U2.7", "C31.1")

# --- BST, SW and the output ---------------------------------------------------------------------
path("BST", "U2.6", "R6.1")
path("BST_CAP", "R6.2", "C30.1")
path("SW", "C30.2", (X_SW_TAP, Y_SW))
path("SW", "U2.5", (X_SW_TAP, Y_SW), "L2.1")
OUT_TAPS = ["R7.1", "C32.1", "C33.1", "C34.1", "C35.1"]
path("3V3_D", "L2.2", *[(x(t), Y_SW) for t in OUT_TAPS], (X_PORT_EAST, Y_SW))
for t in OUT_TAPS[1:]:
    drop("3V3_D", Y_SW, t)
labels.append(("3V3_D", (X_PORT_EAST, Y_SW), 0))
path("FB", "R7.2", "R8.1")
if p("U2.8")[1] != Y_FB or p("R7.2")[1] != Y_FB:
    raise SystemExit(f"02-wire: the FB row is {Y_FB} and U2.8 / R7.2 are at {p('U2.8')} / {p('R7.2')}")
path("FB", "R7.2", "U2.8")

# --- GND: one row under everything that returns to GND, from the west port -----------------------
GND_TAPS = ["C29.2", "C26.2", "C27.2", "C28.2", "R5.2", "C31.2", "U2.4", "R8.2", "C32.2", "C33.2",
            "C34.2", "C35.2"]
path("GND", (X_PORT_WEST, Y_GND), *[(x(t), Y_GND) for t in GND_TAPS])
for t in GND_TAPS:
    drop("GND", Y_GND, t)
labels.append(("GND", (X_PORT_WEST, Y_GND), 180))

# --- checks: junctions, ends inside segments, pins on wire interiors -----------------------------
ends = Counter()
for a, b, _ in segments:
    ends[a] += 1
    ends[b] += 1
pin_points = Counter(tuple(xy) for ref in PINS for xy in PINS[ref].values())
junctions = [pt for pt in sorted(set(ends)) if ends[pt] + pin_points.get(pt, 0) >= 3]


def interior(pt, a, b):
    on_x = a[0] == b[0] == pt[0] and min(a[1], b[1]) < pt[1] < max(a[1], b[1])
    on_y = a[1] == b[1] == pt[1] and min(a[0], b[0]) < pt[0] < max(a[0], b[0])
    return on_x or on_y


for a, b, net in segments:
    for pt in ends:
        if pt not in (a, b) and interior(pt, a, b):
            raise SystemExit(f"02-wire: a segment ends at {pt}, inside segment {a}-{b} ({net}); split it there")
    for pt in pin_points:
        if interior(pt, a, b):
            raise SystemExit(f"02-wire: a pin sits at {pt}, inside segment {a}-{b} ({net}); KiCad would join it")
for name, (lx, ly), _ in labels:
    if ends[(lx, ly)] != 1:
        raise SystemExit(f"02-wire: label {name} at {(lx, ly)} is not on exactly one wire end")

ops = [{"op": "add_wire", "vertices": [list(a), list(b)]} for a, b, _ in segments]
ops += [{"op": "add_junction", "at": list(pt)} for pt in junctions]
ops.append({"op": "add_no_connect", "pin": "U2.1"})
for name, (lx, ly), rot in labels:
    ops.append({"op": "add_net_label", "name": name, "at": [lx, ly], "scope": "local", "rotation": rot})
ops.append({"op": "set_title_block", "title": "h7-module: power", "date": "2026-11-12", "rev": "A",
            "comment1": "generated - do not edit"})
pathlib.Path(sys.argv[3]).write_text(json.dumps(
    [[a[0], a[1], b[0], b[1], net] for a, b, net in segments], indent=0) + "\n")
print(json.dumps({"protocol_version": 2, "target_format": "kicad", "target_file": sys.argv[2],
                  "ops": ops}, indent=1))
