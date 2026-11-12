"""Shared op-list writers for the h7-module block pages repaired in Task 7b.

The power page (Task 7a) carries its own copies of these steps in `../power/`; this module is the
same three steps, written once and driven by each block's `layout.py`, so each block's directory
holds only what is particular to it: where its parts go (`layout.py`) and how its nets are wired
(`02-wire.py`). The steps:

- `place_ops`: op-list 01. Delete every wire, label, junction and no-connect copperhead drew, then
  move and orient every part to the layout. Refuses a draft carrying a power symbol or flag, and
  one whose parts are not the layout's.
- `Wiring`: op-list 02. Every wire as one straight segment, each carrying the net it is drawn for
  (a sidecar the text edits read); a junction wherever three or more connections meet; the
  no-connects; one LOCAL label per port net, which `tools/draught/hierarchical-labels.ts` turns
  into the block's hierarchical label at the same place; the title block. Refuses a segment that
  is not axis-aligned, a zero-length one, a segment ending inside another, a pin on a wire's
  interior, a wire end at a pin of a different net than the one the wire is drawn for, and a
  label that is not on exactly one wire end.
- `layout.py` names, for `text_edits.py`, every part's field placement, the group rectangle and
  the strokes of nets the draft drew no wire for.

Coordinates are mils, sheet coordinates (x east, y south), as akcli takes them.
"""
import importlib.util
import json
import pathlib
import sys
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402


def load_layout(block_dir):
    """Import `<block_dir>/layout.py` by path."""
    path = pathlib.Path(block_dir).resolve() / "layout.py"
    if not path.is_file():
        raise SystemExit(f"page.py: no layout.py in {block_dir}")
    spec = importlib.util.spec_from_file_location(f"layout_{path.parent.name}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    for name in ("PARTS", "FIELDS", "RECT", "TITLE"):
        if not hasattr(module, name):
            raise SystemExit(f"page.py: {path} does not define {name}")
    return module


def op_list(target, ops):
    return json.dumps({"protocol_version": 2, "target_format": "kicad", "target_file": target, "ops": ops},
                      indent=1)


def place_ops(draft, layout):
    """Op-list 01: delete copperhead's wiring and labels, then place and orient every part."""
    sheet = kicad_sheet.read(draft)
    refs = {s.ref for s in sheet.symbols()}
    power = sorted(r for r in refs if r.startswith("#"))
    if power:
        raise SystemExit(f"place: the draft carries power symbols or flags {power}; a block page draws none (TOOLING.md C3)")
    if refs != set(layout.PARTS):
        raise SystemExit(f"place: the draft's parts {sorted(refs)} are not layout.py's {sorted(layout.PARTS)}; "
                         "is this the draft make draw wrote?")
    ops = []
    for w in sheet.wires():
        ops.append({"op": "delete_object", "uuid": w.uuid})
    for lab in sheet.labels():
        ops.append({"op": "delete_object", "uuid": lab[6].kid("uuid").atoms[0]})
    for j in sheet.junctions():
        ops.append({"op": "delete_object", "uuid": j[2]})
    for n in sheet.no_connects():
        ops.append({"op": "delete_object", "uuid": n[2]})
    for ref, (x, y, rot, mirror) in layout.PARTS.items():
        ops.append({"op": "move_component", "designator": ref, "x_mil": x, "y_mil": y})
        ops.append({"op": "set_component_transform", "designator": ref, "rotation": rot, "mirror": mirror})
    return op_list(pathlib.Path(draft).name, ops)


class Wiring:
    """Op-list 02 for one block page, built from the pin points `pins.py` reported after op-list 01.

    `intent` is the block's committed copperhead intent: every wire end that lands on a pin is
    checked against the net the intent puts that pin on, so a wire drawn for one net cannot end on
    another net's pin. Pins the intent does not list (a port reaching one pin, which copperhead
    cannot draft) are read from `ports` (`ports.ts`'s output). Every port must end up with exactly
    one label.
    """

    def __init__(self, pins_path, intent_path, ports_path):
        self.pins = json.loads(pathlib.Path(pins_path).read_text())
        intent = json.loads(pathlib.Path(intent_path).read_text())
        ports = json.loads(pathlib.Path(ports_path).read_text())
        self.pin_net = {}
        for net in intent["nets"]:
            for pin in net["pins"]:
                self.pin_net[pin] = net["name"]
        self.port_names = set()
        for port in ports:
            self.port_names.add(port["name"])
            for pin in port["pins"]:
                if self.pin_net.get(pin, port["name"]) != port["name"]:
                    raise SystemExit(f"wire: {pin} is on {self.pin_net[pin]} in the intent and on port {port['name']}")
                self.pin_net[pin] = port["name"]
        self.no_connect_pins = list(intent["noConnect"])
        self.segments = []   # ((x1, y1), (x2, y2), net)
        self.labels = []     # (name, (x, y), rotation)

    def p(self, ref_pin):
        ref, pin = ref_pin.split(".")
        if ref not in self.pins or pin not in self.pins[ref]:
            raise SystemExit(f"wire: no pin {ref_pin} in pins.json")
        return tuple(self.pins[ref][pin])

    def x(self, ref_pin):
        return self.p(ref_pin)[0]

    def y(self, ref_pin):
        return self.p(ref_pin)[1]

    def path(self, net, *pts):
        """A polyline on one net, as straight segments; each point a REF.PIN or an (x, y) in mils."""
        xy = []
        for q in pts:
            if isinstance(q, str):
                if self.pin_net.get(q) != net:
                    raise SystemExit(f"wire: {q} is on {self.pin_net.get(q)}, not on {net}")
                xy.append(self.p(q))
            else:
                xy.append(tuple(q))
        for a, b in zip(xy, xy[1:]):
            if a[0] != b[0] and a[1] != b[1]:
                raise SystemExit(f"wire: segment {a}-{b} on {net} is not axis-aligned")
            if a == b:
                raise SystemExit(f"wire: zero-length segment at {a} on {net}")
            self.segments.append((a, b, net))

    def label(self, name, at, rotation):
        self.labels.append((name, tuple(at), rotation))

    def op_list(self, sheet_name, title, nets_out):
        ends = Counter()
        for a, b, _ in self.segments:
            ends[a] += 1
            ends[b] += 1
        pin_at = {}
        for ref in self.pins:
            for number, xy in self.pins[ref].items():
                pin_at.setdefault(tuple(xy), []).append(f"{ref}.{number}")
        pin_points = Counter({pt: len(v) for pt, v in pin_at.items()})
        junctions = [pt for pt in sorted(set(ends)) if ends[pt] + pin_points.get(pt, 0) >= 3]

        def interior(pt, a, b):
            on_x = a[0] == b[0] == pt[0] and min(a[1], b[1]) < pt[1] < max(a[1], b[1])
            on_y = a[1] == b[1] == pt[1] and min(a[0], b[0]) < pt[0] < max(a[0], b[0])
            return on_x or on_y

        for a, b, net in self.segments:
            for pt in ends:
                if pt not in (a, b) and interior(pt, a, b):
                    raise SystemExit(f"wire: a segment ends at {pt}, inside segment {a}-{b} ({net}); split it there")
            for pt in pin_points:
                if interior(pt, a, b):
                    raise SystemExit(f"wire: a pin sits at {pt}, inside segment {a}-{b} ({net}); KiCad would join it")
            for pt in (a, b):
                for pin in pin_at.get(pt, []):
                    if self.pin_net.get(pin) != net:
                        raise SystemExit(f"wire: segment {a}-{b} drawn for {net} ends on {pin}, which is on {self.pin_net.get(pin)}")
        for name, at, _ in self.labels:
            if ends[at] != 1:
                raise SystemExit(f"wire: label {name} at {at} is not on exactly one wire end")
        named = Counter(name for name, _, _ in self.labels)
        if set(named) != self.port_names or any(n != 1 for n in named.values()):
            raise SystemExit(f"wire: the labels {dict(named)} are not one per port {sorted(self.port_names)}; "
                             "a private net is drawn as wire, and a port gets one label")
        ops = [{"op": "add_wire", "vertices": [list(a), list(b)]} for a, b, _ in self.segments]
        ops += [{"op": "add_junction", "at": list(pt)} for pt in junctions]
        ops += [{"op": "add_no_connect", "pin": pin} for pin in self.no_connect_pins]
        for name, (lx, ly), rot in self.labels:
            ops.append({"op": "add_net_label", "name": name, "at": [lx, ly], "scope": "local", "rotation": rot})
        ops.append({"op": "set_title_block", "title": title, "date": "2026-11-12", "rev": "A",
                    "comment1": "generated - do not edit"})
        pathlib.Path(nets_out).write_text(json.dumps(
            [[a[0], a[1], b[0], b[1], net] for a, b, net in self.segments], indent=0) + "\n")
        return op_list(sheet_name, ops)


# Field placements for layout.FIELDS: each gives, for Reference and Value, an offset in mm from the
# symbol's origin on the sheet and a justification (None for centred). Every field ends horizontal.
def east(d, row=1.27):
    """Both fields beside the body, east of it, Reference over Value."""
    return {"Reference": (d, -row, "left"), "Value": (d, row, "left")}


def west(d, row=1.27):
    """Both fields beside the body, west of it, Reference over Value."""
    return {"Reference": (-d, -row, "right"), "Value": (-d, row, "right")}


def above(ref_up, value_up):
    """Both fields centred above the body, Reference over Value."""
    return {"Reference": (0, -ref_up, None), "Value": (0, -value_up, None)}


def below(ref_down, value_down):
    """Both fields centred below the body, Reference over Value."""
    return {"Reference": (0, ref_down, None), "Value": (0, value_down, None)}


def fields(reference, value):
    """Reference and Value placed independently: each (dx_mm, dy_mm, justify or None)."""
    return {"Reference": reference, "Value": value}
