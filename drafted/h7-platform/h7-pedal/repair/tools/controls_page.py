"""The two control pages' shared placement and wiring (h7 pedal pages plan, Task 9b): controls_a
(positions 1-3) and controls_b (positions 4-6) are the same three-position circuit
(`circuits/h7-platform/pedal/controls.ts`; CR-PEDAL-CONTROL-NODE), so one plan draws both, and each
block's `layout.py` and `02-wire.py` name only their own parts. Written once so that a change to one
page's arrangement cannot miss the other's.

Coordinates are mils, sheet coordinates (x east, y south). Nothing here is computed from a draft.

Per position n (`CR-PEDAL-CONTROL-NODE`): the pot RV (ccw pin 1 on GND, wiper pin 2 on POSn_NODE,
cw pin 3 on VREF_A); R_PUn (10.0 k, pin 1 3V3_D, pin 2 the node); the button SW (pin 1 the node,
pin 2 POSn_BTN); R_BTNn (1.00 k, pin 1 POSn_BTN, pin 2 GND); R_POSn (10.0 k, pin 1 the node, pin 2
POSn); C_POSn (100 nF, pin 1 POSn, pin 2 GND).

THE ARRANGEMENT. The three positions stand one above another, each a row read west to east: the
pot, its wiper starting the node row, R_PU hanging from it, the button, R_POS in the row, C_POS at
the pin, and POSn's label at the east end, pointing east. The second position is the first's mirror
image top to bottom, so the first's and second's GND rows meet between them, and the second's and
third's VREF_A and 3V3_D stubs meet between those two:

    position 1  (VREF_A, 3V3_D above the node row; GND below)
    position 2  (GND above; 3V3_D, VREF_A below)        mirrored
    position 3  (VREF_A, 3V3_D above; GND below)

VREF_A: one bus west of the pots, from position 1's stub down to position 3's, its label at the top
stub's west end, pointing west. 3V3_D: one bus east of the POS labels, from position 1's stub down
to position 3's, its label at the top stub's east end, pointing east. GND: positions 1 and 2's rows
are joined by a short vertical east of the POS labels; position 2's row runs on east, across the
3V3_D bus, to an outer vertical that comes down to position 3's row, which runs west to GND's label
at the bottom west, pointing west.

THE ONE CROSSING (GND over the 3V3_D bus) is a property of the circuit, not of this arrangement:
each of three positions joins all three rails, and each rail is one connected wire (one label per
port), which is the graph K3,3, and K3,3 cannot be drawn in a plane without a crossing.

Symbol geometry (read from the controls_a draft's lib_symbols), at rotation 0, unmirrored:
Device:R_Potentiometer pin 1 150 north, pin 3 150 south, wiper (2) 150 east (mirrored top to bottom,
pin 1 south and pin 3 north). Switch:SW_Push pin 1 200 west, pin 2 200 east (at 90, pin 1 south; at
270, pin 1 north). Device:R and Device:C pin 1 150 north, pin 2 150 south (at 90, pin 1 west; at 180,
pin 1 south).
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[4] / "draughting" / "pages"))
from page import above, below, east, west  # noqa: E402

X_V_LABEL = 1700   # VREF_A's and GND's labels, at the west
X_VB = 2000        # the VREF_A bus
XP = 2400          # the pots (wiper 150 east)
XU = 2900          # R_PU
XS = 3300          # the button, and R_BTN under or over it
XR = 3800          # R_POS, at rotation 90 (pins 150 west and east)
XC = 4300          # C_POS
X_POS_LABEL = 4700  # each POSn label
X_GL = 5100        # the GND link between positions 1 and 2
X_DB = 5500        # the 3V3_D bus
X_GB = 5900        # the outer GND vertical down to position 3
X_D_LABEL = 6200   # 3V3_D's label

# Each position's node row; position 2 is mirrored top to bottom.
Y_NODE = (1900, 3900, 4900)
MIRRORED = (False, True, False)
# The group rectangle (mm), round the three positions and the labels; the note below it.
RECT = (27.94, 30.48, 172.72, 152.4)  # east edge moved out after the third render: 3V3_D's label touched it
NOTE_AT = (1100, 6550)


def note(ports, positions):
    """The page note's lines: CR-PEDAL-POPULATION (variant positions) has it say that exactly one fit
    is placed per position; each line names the position's parts by this page's designators."""
    lines = [
        "Each control position is fitted per effect with a pot or a button: exactly one fit is placed per position.",
        "Both fits are drawn (CR-PEDAL-POPULATION, variant positions; CR-PEDAL-CONTROL-NODE; open row CONTROL-POSITION-VARIANTS).",
    ]
    for port, p in zip(ports, positions):
        lines.append(f"- {port}: pot fit {p['pot']}; button fit {p['sw']} with its pull-up {p['pu']}; "
                     f"always fitted {p['rbtn']}, {p['rpos']}, {p['cpos']}.")
    return lines


def rows(i):
    """(VREF_A stub, 3V3_D stub, node, GND row) of position index i (0, 1, 2)."""
    y = Y_NODE[i]
    s = -1 if MIRRORED[i] else 1
    return y - 400 * s, y - 300 * s, y, y + 900 * s


def parts(positions):
    """layout.PARTS for three positions, each a dict with pot, pu, sw, rbtn, rpos, cpos (references)."""
    out = {}
    for i, p in enumerate(positions):
        y = Y_NODE[i]
        if MIRRORED[i]:
            out[p["pot"]] = (XP, y, 0, "none")         # pin 1 (GND) north, pin 3 (VREF_A) south
            out[p["pu"]] = (XU, y + 150, 180, "none")  # pin 2 on the node, pin 1 south
            out[p["sw"]] = (XS, y - 200, 90, "none")   # pin 1 on the node (south), pin 2 north
            out[p["rbtn"]] = (XS, y - 650, 180, "none")  # pin 1 south (BTN), pin 2 north (GND)
            out[p["cpos"]] = (XC, y - 300, 180, "none")  # pin 1 south (POSn), pin 2 north (GND)
        else:
            out[p["pot"]] = (XP, y, 0, "x")            # pin 3 (VREF_A) north, pin 1 (GND) south
            out[p["pu"]] = (XU, y - 150, 0, "none")    # pin 1 north, pin 2 on the node
            out[p["sw"]] = (XS, y + 200, 270, "none")  # pin 1 on the node (north), pin 2 south
            out[p["rbtn"]] = (XS, y + 650, 0, "none")  # pin 1 north (BTN), pin 2 south (GND)
            out[p["cpos"]] = (XC, y + 300, 0, "none")  # pin 1 north (POSn), pin 2 south (GND)
        out[p["rpos"]] = (XR, y, 90, "none")           # pin 1 west (node), pin 2 east (POSn)
    return out


def field_plan(positions):
    """layout.FIELDS: placed after renders. Each resistor's and capacitor's fields east of its body;
    the pot's west of its body (the first render put them east, over the wiper's pin number); the
    button's east of its body, past the plunger (the first render put them west, where the value ran
    under the pot's GND drop on position 2); R_POS's centred on the node row's side away from the
    button (above on positions 1 and 3, under 3V3_D's stub 300 mil up; below on position 2, over
    3V3_D's stub 300 mil down: the second render had them above there, under the button's value)."""
    out = {}
    for i, p in enumerate(positions):
        out[p["pot"]] = west(3.81)
        out[p["pu"]] = east(1.778)
        out[p["sw"]] = east(2.54)
        out[p["rbtn"]] = east(1.778)
        out[p["cpos"]] = east(2.794)
        out[p["rpos"]] = below(2.159, 4.445) if MIRRORED[i] else above(4.445, 2.159)
    return out


def wire(w, positions, ports):
    """Op-list 02's wiring for three positions; `ports` names each position's POS net, in order."""
    def on(pin, xy, what):
        if w.p(pin) != xy:
            raise SystemExit(f"02-wire: {pin} at {w.p(pin)} is not at {xy} ({what})")

    gnd_rows = []
    for i, (p, port) in enumerate(zip(positions, ports)):
        y_v, y_d, y, y_g = rows(i)
        node = f"{port}_NODE"
        on(f"{p['pot']}.2", (XP + 150, y), f"{port}'s wiper on the node row")
        on(f"{p['pu']}.2", (XU, y), "the node row")
        on(f"{p['sw']}.1", (XS, y), "the node row")
        on(f"{p['rpos']}.1", (XR - 150, y), "the node row")
        # The node row: wiper, R_PU, the button, R_POS.
        w.path(node, f"{p['pot']}.2", f"{p['pu']}.2", f"{p['sw']}.1", f"{p['rpos']}.1")
        # The button returns through R_BTN to GND.
        w.path(f"{port}_BTN", f"{p['sw']}.2", f"{p['rbtn']}.1")
        # R_POS to the pin, C_POS from it, and the label.
        w.path(port, f"{p['rpos']}.2", (XC, y), (X_POS_LABEL, y))
        w.path(port, (XC, y), f"{p['cpos']}.1")
        w.label(port, (X_POS_LABEL, y), 0)
        # VREF_A from the pot's cw end to its stub row; 3V3_D from R_PU's top to its stub row.
        w.path("VREF_A", f"{p['pot']}.3", (XP, y_v))
        # GND drops (rises, on the mirrored position) to the position's GND row.
        for pin in (f"{p['pot']}.1", f"{p['rbtn']}.2", f"{p['cpos']}.2"):
            w.path("GND", pin, (w.x(pin), y_g))
        gnd_rows.append(y_g)
        # R_PU's pin 1 sits on its position's 3V3_D stub row, which starts there.
        on(f"{p['pu']}.1", (XU, y_d), "the 3V3_D stub row")
        on(f"{p['pot']}.3", (XP, y - 150 if not MIRRORED[i] else y + 150), "the pot's cw end")

    (v1, d1, _, g1), (v2, d2, _, g2), (v3, d3, _, g3) = (rows(0), rows(1), rows(2))
    # VREF_A: the label, the top stub to the bus and on to position 1's pot; the bus down through
    # position 2's stub to position 3's.
    w.path("VREF_A", (X_V_LABEL, v1), (X_VB, v1), (XP, v1))
    w.label("VREF_A", (X_V_LABEL, v1), 180)
    w.path("VREF_A", (X_VB, v1), (X_VB, v2), (X_VB, v3))
    w.path("VREF_A", (X_VB, v2), (XP, v2))
    w.path("VREF_A", (X_VB, v3), (XP, v3))
    # 3V3_D: position 1's stub east to the bus and on to the label; the bus down through position 2's
    # stub to position 3's.
    w.path("3V3_D", (XU, d1), (X_DB, d1), (X_D_LABEL, d1))
    w.label("3V3_D", (X_D_LABEL, d1), 0)
    w.path("3V3_D", (X_DB, d1), (X_DB, d2), (X_DB, d3))
    w.path("3V3_D", (XU, d2), (X_DB, d2))
    w.path("3V3_D", (XU, d3), (X_DB, d3))
    # GND: each position's row from the pot's drop east through its other drops; positions 1 and 2
    # joined at X_GL; position 2's row on across the 3V3_D bus to the outer vertical, down to position
    # 3's row, which runs west past the pot's drop to the label.
    for i, p in enumerate(positions):
        xs = [XP, XS, XC]
        y_g = gnd_rows[i]
        if i == 0:
            w.path("GND", *[(x, y_g) for x in xs], (X_GL, y_g))
        elif i == 1:
            w.path("GND", *[(x, y_g) for x in xs], (X_GL, y_g), (X_GB, y_g))
        else:
            w.path("GND", (X_V_LABEL, y_g), *[(x, y_g) for x in xs], (X_GB, y_g))
            w.label("GND", (X_V_LABEL, y_g), 180)
    w.path("GND", (X_GL, g1), (X_GL, g2))
    w.path("GND", (X_GB, g2), (X_GB, g3))
