"""Write op-list 02: every wire, junction, no-connect and net label on the page.

Reads the pin points `pins.py` reports from the sheet after op-list 01 (so a wire that names a pin
lands on akcli's own reading of it). Every wire is one straight segment and carries the net it is
drawn for, which goes to a sidecar (`02-wire.nets.json`) that 03-text-edits.py reads to give each
wire its net's stroke. A junction goes wherever three or more connections meet (wire ends and
pins), computed from the segments rather than listed by hand.

usage: python3 02-wire.py <pins.json> <sheet-file-name> <nets-sidecar-out> > 02-wire.json
"""
import json
import pathlib
import sys
from collections import Counter

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from layout import A_ROW20_SYMBOL_X, A_TAP_X, B_ROW1_SYMBOL_X, B_TAPS, LABEL_X  # noqa: E402

if len(sys.argv) != 4:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <sheet-file-name> <nets-sidecar-out>")
PINS = json.loads(pathlib.Path(sys.argv[1]).read_text())


def p(ref_pin):
    ref, pin = ref_pin.split(".")
    if ref not in PINS or pin not in PINS[ref]:
        raise SystemExit(f"02-wire: no pin {ref_pin} in {sys.argv[1]}")
    return tuple(PINS[ref][pin])


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


labels = []  # (name, (x, y))

# --- B band: contract pins 21-40, J2 (socket) pad k to J4 (breakout) pad k. ---------------
B_NETS = {2: "POS1", 3: "POS2", 4: "POS3", 5: "POS4", 6: "POS5", 7: "POS6", 8: "EXPR_TIP",
          9: "HW_REV", 10: "EXPR_DETECT", 11: "USB_VBUS_SENSE", 12: "CODEC_DOUT", 13: "CODEC_DIN",
          14: "CODEC_LRCK", 15: "CODEC_BCK", 16: "USB_DM", 17: "USB_DP"}
path("VREF_A", "J2.1", (B_ROW1_SYMBOL_X, p("J2.1")[1]), "J4.1")
for k in range(2, 18):
    y = p(f"J2.{k}")[1]
    labels.append((B_NETS[k], (LABEL_X, y)))
    if k in B_TAPS:
        path(B_NETS[k], f"J2.{k}", (LABEL_X, y), (B_TAPS[k], y), f"J4.{k}")
    else:
        path(B_NETS[k], f"J2.{k}", (LABEL_X, y), f"J4.{k}")
# B taps.
path("USB_DP", (B_TAPS[17], p("J2.17")[1]), (B_TAPS[17], p("U1.8")[1]), "U1.8")   # switch D+
path("USB_DM", (B_TAPS[16], p("J2.16")[1]), (B_TAPS[16], p("U1.7")[1]), "U1.7")   # switch D-
for k, tp in ((12, "TP5"), (13, "TP6"), (14, "TP7"), (15, "TP8")):
    path(B_NETS[k], (B_TAPS[k], p(f"J2.{k}")[1]), f"{tp}.1")
path("USB_VBUS_SENSE", (B_TAPS[11], p("J2.11")[1]), "R2.2")  # sense node: R2 east, R3 south
path("USB_VBUS_SENSE", "R3.1", "C4.1")                       # C4 in parallel with R3, west of it
path("GND", "R3.2", "C4.2")

# --- A band: contract pins 1-20, J1 (socket) pad k to J3 (breakout) pad k. ----------------
A_NETS = {1: "SPARE1", 2: "SPARE2", 3: "SPARE3", 4: "LED2", 5: "LED1", 6: "FSW1", 7: "SPARE4",
          8: "RELAY_EN", 9: "FSW2", 10: "SPARE5", 11: "USB_EN_N", 12: "EXP_I2C_SCL",
          13: "EXP_I2C_SDA", 14: "MIDI_UART_TX", 15: "MIDI_UART_RX", 16: "RESERVED_16",
          17: "RESERVED_17", 18: "RESERVED_18", 19: "RESERVED_19"}
for k in range(1, 20):
    y = p(f"J1.{k}")[1]
    labels.append((A_NETS[k], (LABEL_X, y)))
    if k == 11:
        path(A_NETS[k], f"J1.{k}", (LABEL_X, y), (A_TAP_X, y), f"J3.{k}")
    else:
        path(A_NETS[k], f"J1.{k}", (LABEL_X, y), f"J3.{k}")
path("GND", "J1.20", (A_ROW20_SYMBOL_X, p("J1.20")[1]), "J3.20")
# USB_EN_N: up from the A band to the switch's OE, on to the pull-up R1.
path("USB_EN_N", (A_TAP_X, p("J1.11")[1]), (A_TAP_X, p("U1.6")[1]))
path("USB_EN_N", "U1.6", (A_TAP_X, p("U1.6")[1]), "R1.2")

# --- the switch ----------------------------------------------------------------------------
path("GND", "U1.9", (p("#PWR12.1")[0], p("U1.9")[1]), "#PWR12.1")   # S to GND (port 1 selected)
path("3V3_D", "U1.10", "#PWR03.1", "C1.1")                   # VCC; 3V3_D symbol at the corner

# --- the receptacle, and the ESD part between the D+ line (north) and the D- line (south) --
# The USBLC6-2SC6 symbol puts I/O1 on pins 1 and 6 and I/O2 on 3 and 4, one of each per side;
# the model has both pins of each pair on the line (USB-04), so each pin is tapped onto its line.
D_PLUS_Y = p("U1.1")[1]
D_MINUS_Y = 4800
D_MINUS_RISE_X = 4300
path("VBUS", "J6.A4", "C3.1")                                 # receptacle VBUS rail
path("USB_CC1", "J6.A5", "R4.1")
path("USB_CC2", "J6.B5", "R5.1")
path("USB_C_DP", "J6.A6", (2000, p("J6.A6")[1]), (2000, p("J6.B6")[1]))
path("USB_C_DP", "J6.B6", (2000, p("J6.B6")[1]), (2000, D_PLUS_Y), (p("U2.1")[0], D_PLUS_Y),
     (p("U2.6")[0], D_PLUS_Y), "U1.1")
path("USB_C_DP", "U2.1", (p("U2.1")[0], D_PLUS_Y))
path("USB_C_DP", "U2.6", (p("U2.6")[0], D_PLUS_Y))
path("USB_C_DM", "J6.A7", (2100, p("J6.A7")[1]), (2100, p("J6.B7")[1]))
path("USB_C_DM", "J6.B7", (2100, p("J6.B7")[1]), (2100, D_MINUS_Y), (3100, D_MINUS_Y),
     (3700, D_MINUS_Y), (D_MINUS_RISE_X, D_MINUS_Y), (D_MINUS_RISE_X, p("U1.2")[1]), "U1.2")
path("USB_C_DM", "U2.3", (3100, p("U2.3")[1]), (3100, D_MINUS_Y))
path("USB_C_DM", "U2.4", (3700, p("U2.4")[1]), (3700, D_MINUS_Y))
path("USB_SHIELD", "J6.SH", "C2.1", "R6.1")                   # shield R || C
path("GND", "R6.2", "C2.2")

# --- power entry, dummy loads, rail test points -------------------------------------------
path("VIN_IN", "J5.1", "F1.1")
path("VIN_MOD", "F1.2", "TP1.1", "#PWR31.1")
path("GND", "J5.2", "#PWR21.1")
path("3V3_D", "J7.1", "TP2.1", "#PWR05.1")
path("DUMMY_3V3D", "J7.2", "R7.1")
path("VREF_A", "J8.1", "TP3.1", "#PWR34.1")
path("DUMMY_VREF_A", "J8.2", "R8.1")
path("GND", "TP4.1", "#PWR24.1")

# --- junctions: wherever three or more connections meet ------------------------------------
ends = Counter()
for a, b, _ in segments:
    ends[a] += 1
    ends[b] += 1
pin_points = Counter(tuple(xy) for ref in PINS for xy in PINS[ref].values())
junctions = [pt for pt in sorted(set(ends)) if ends[pt] + pin_points.get(pt, 0) >= 3]
# A segment end on another segment's interior would need a junction and a split; refuse it.
for a, b, _ in segments:
    for pt in ends:
        if pt in (a, b):
            continue
        on_x = a[0] == b[0] == pt[0] and min(a[1], b[1]) < pt[1] < max(a[1], b[1])
        on_y = a[1] == b[1] == pt[1] and min(a[0], b[0]) < pt[0] < max(a[0], b[0])
        if on_x or on_y:
            raise SystemExit(f"02-wire: a segment ends at {pt}, inside segment {a}-{b}; split it there")

ops = [{"op": "add_wire", "vertices": [list(a), list(b)]} for a, b, _ in segments]
ops += [{"op": "add_junction", "at": list(pt)} for pt in junctions]
for pin in ("U1.3", "U1.4", "J6.A8", "J6.B8"):
    ops.append({"op": "add_no_connect", "pin": pin})
for name, (x, y) in labels:
    ops.append({"op": "add_net_label", "name": name, "at": [x, y], "scope": "local", "rotation": 0})
ops.append({"op": "set_title_block", "title": "h7-carrier", "date": "2026-11-11", "rev": "A",
            "comment1": "generated - do not edit"})
pathlib.Path(sys.argv[3]).write_text(json.dumps(
    [[a[0], a[1], b[0], b[1], net] for a, b, net in segments], indent=0) + "\n")
print(json.dumps({"protocol_version": 2, "target_format": "kicad", "target_file": sys.argv[2],
                  "ops": ops}, indent=1))
