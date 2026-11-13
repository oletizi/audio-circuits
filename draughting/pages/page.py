"""Shared op-list writers for a board's block pages (first written for the h7-module pages repaired
in its Task 7b; moved here from `drafted/h7-platform/h7-module/repair/tools/` by the H7 pedal plan's
Task 4, which made the title block's date an argument, since it is the board's and not the tool's).

The module's power page (its Task 7a) carries its own copies of these steps in its `repair/power/`;
this module is the same three steps, written once and driven by each block's `layout.py`, so each
block's directory holds only what is particular to it: where its parts go (`layout.py`) and how its
nets are wired (`02-wire.py`). The steps:

- `place_ops`: op-list 01. Delete every wire, label, junction and no-connect copperhead drew, then
  move and orient every part to the layout. Refuses a draft carrying a power symbol or flag, and
  one whose parts are not the layout's.
- `Wiring`: op-list 02. Every wire as one straight segment, each carrying the net it is drawn for
  (a sidecar the text edits read); a junction wherever three or more connections meet; the
  no-connects; one LOCAL label per port net, which `tools/draught/hierarchical-labels.ts` turns
  into the block's hierarchical label at the same place; the title block. Refuses a segment that
  is not axis-aligned, a zero-length one, a segment ending inside another, a pin on a wire's
  interior, a wire end at a pin of a different net than the one the wire is drawn for, a
  label that is not on exactly one wire end, and a label on a wire drawn for a different net.
- `layout.py` names, for `text_edits.py`, every part's field placement, the group rectangle and
  the strokes of nets the draft drew no wire for.

Coordinates are mils, sheet coordinates (x east, y south), as akcli takes them.
"""
import importlib.util
import json
import pathlib
import sys
from collections import Counter

ROOT = pathlib.Path(__file__).resolve().parents[2]
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
    for name in ("PARTS", "FIELDS", "RECT", "TITLE", "PWR_FLAGS"):
        if not hasattr(module, name):
            raise SystemExit(f"page.py: {path} does not define {name}")
    return module


def op_list(target, ops):
    return json.dumps({"protocol_version": 2, "target_format": "kicad", "target_file": target, "ops": ops},
                      indent=1)


def instance_key(ref, unit, units_of_ref):
    """layout.PARTS's key for one placed instance: the reference for a single-unit part, and
    `<ref>:<unit>` for each unit of a multi-unit part (as `U5:1`, `U5:2`, `U5:3`)."""
    return f"{ref}:{unit}" if units_of_ref > 1 else ref


def instance_keys(sheet):
    """[(key, Symbol)] for every part instance on the sheet, keyed as `instance_key` says."""
    units = {}
    for s in sheet.symbols():
        u = s.node.kid("unit")
        units.setdefault(s.ref, []).append((int(u.atoms[0]) if u is not None and u.atoms else 1, s))
    return [(instance_key(ref, unit, len(each)), s) for ref, each in units.items() for unit, s in each]


def place_ops(draft, layout):
    """Op-list 01: delete copperhead's wiring and labels, then place and orient every part.

    A MULTI-UNIT PART is placed unit by unit, each under its `<ref>:<unit>` key (`instance_key`), by
    `move_component` with its `unit`. akcli 0.22.0's `set_component_transform` takes no unit and
    acts on the first instance of a reference only, so a multi-unit part's units must stay at
    rotation 0, unmirrored, as copperhead drafts them; anything else is refused, naming the unit.
    """
    sheet = kicad_sheet.read(draft)
    keyed = instance_keys(sheet)
    refs = {key for key, _ in keyed}
    power = sorted(r for r in refs if r.startswith("#"))
    if power:
        raise SystemExit(f"place: the draft carries power symbols or flags {power}; a block page draws none (TOOLING.md C3)")
    if refs != set(layout.PARTS):
        raise SystemExit(f"place: the draft's parts {sorted(refs)} are not layout.py's {sorted(layout.PARTS)}; "
                         "is this the draft make draw wrote?")
    drafted = dict(keyed)
    ops = []
    for w in sheet.wires():
        ops.append({"op": "delete_object", "uuid": w.uuid})
    for lab in sheet.labels():
        ops.append({"op": "delete_object", "uuid": lab[6].kid("uuid").atoms[0]})
    for j in sheet.junctions():
        ops.append({"op": "delete_object", "uuid": j[2]})
    for n in sheet.no_connects():
        ops.append({"op": "delete_object", "uuid": n[2]})
    for key, (x, y, rot, mirror) in layout.PARTS.items():
        if ":" not in key:
            ops.append({"op": "move_component", "designator": key, "x_mil": x, "y_mil": y})
            ops.append({"op": "set_component_transform", "designator": key, "rotation": rot, "mirror": mirror})
            continue
        ref, unit = key.split(":")
        unmirrored = drafted[key].node.kid("mirror") is None
        if (rot, mirror) != (0, "none") or drafted[key].rot != 0 or not unmirrored:
            raise SystemExit(f"place: {key} is a unit of a multi-unit part; akcli's set_component_transform "
                             "cannot reach one unit, so it must be drafted and placed at rotation 0, unmirrored")
        ops.append({"op": "move_component", "designator": ref, "x_mil": x, "y_mil": y, "unit": int(unit)})
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

    def op_list(self, sheet_name, title, title_block, nets_out):
        """The op-list; `title` (the page's) and the board's `title_block` module (its
        `repair/tools/title_block.py`: DATE, REV, COMMENT1) fill the title block. Each is the board's
        own datum, never computed here, so a replay writes the same bytes; a missing one refuses."""
        block = {}
        for name in ("DATE", "REV", "COMMENT1"):
            value = getattr(title_block, name, None)
            if not isinstance(value, str) or not value:
                raise SystemExit(f"wire: the board's title_block.py must define {name} as a non-empty string "
                                 f"(it is the board's title-block datum, not the tool's); got {value!r}")
            block[name] = value
        ends = Counter()
        for a, b, _ in self.segments:
            ends[a] += 1
            ends[b] += 1
        pin_at = {}
        for ref in self.pins:
            for number, xy in self.pins[ref].items():
                pin_at.setdefault(tuple(xy), []).append(f"{ref}.{number}")
        # A point holding several pins (a symbol's stacked pins, as Crystal_GND24's two case pins) is
        # one connection for the junction rule: a wire ending there makes two, not three.
        pin_points = Counter({pt: 1 for pt in pin_at})
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
            # The label names the net of the wire it sits on. Without this, two one-pin ports' labels
            # could be swapped and every membership check would still pass (ruling
            # CR-MODULE-PORT-LABEL-CHECK, the h7-module's; verify.sh checks the same on the export).
            under = [net for a, b, net in self.segments if at in (a, b)]
            if under != [name]:
                raise SystemExit(f"wire: label {name} at {at} sits on the end of a wire drawn for {under}; "
                                 f"a port's label must sit on a wire drawn for that port's net")
        named = Counter(name for name, _, _ in self.labels)
        if set(named) != self.port_names or any(n != 1 for n in named.values()):
            raise SystemExit(f"wire: the labels {dict(named)} are not one per port {sorted(self.port_names)}; "
                             "a private net is drawn as wire, and a port gets one label")
        ops = [{"op": "add_wire", "vertices": [list(a), list(b)]} for a, b, _ in self.segments]
        ops += [{"op": "add_junction", "at": list(pt)} for pt in junctions]
        ops += [{"op": "add_no_connect", "pin": pin} for pin in self.no_connect_pins]
        for name, (lx, ly), rot in self.labels:
            ops.append({"op": "add_net_label", "name": name, "at": [lx, ly], "scope": "local", "rotation": rot})
        ops.append({"op": "set_title_block", "title": title, "date": block["DATE"], "rev": block["REV"],
                    "comment1": block["COMMENT1"]})
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
