"""Write op-list 01: delete copperhead's wiring and labels, then place every part and power symbol.

Deletes every wire, label, junction and no-connect copperhead drew (02 redraws the wiring), deletes
the power symbols this page does not use, and moves and orients every part and power symbol to
layout.py's placement. Reads the draft only for the uuids of what it deletes.

usage: python3 01-place.py <draft.kicad_sch> > 01-place.json
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
sys.path.insert(0, str(HERE))
import kicad_sheet  # noqa: E402
from layout import DELETE_POWER, PARTS, POWER  # noqa: E402

if len(sys.argv) != 2:
    raise SystemExit("usage: python3 01-place.py <draft.kicad_sch>")
sheet = kicad_sheet.read(sys.argv[1])
refs = {s.ref for s in sheet.symbols()}
missing = (set(PARTS) | set(POWER) | set(DELETE_POWER)) - refs
if missing:
    raise SystemExit(f"01-place: the draft has no symbol {sorted(missing)}; is this the draft make draw wrote?")
unplaced = {r for r in refs if not r.startswith("#")} - set(PARTS)
if unplaced:
    raise SystemExit(f"01-place: layout.py places no position for {sorted(unplaced)}")
unhandled = {r for r in refs if r.startswith("#")} - set(POWER) - set(DELETE_POWER)
if unhandled:
    raise SystemExit(f"01-place: layout.py neither places nor deletes {sorted(unhandled)}")

ops = []
for w in sheet.wires():
    ops.append({"op": "delete_object", "uuid": w.uuid})
for lab in sheet.labels():
    ops.append({"op": "delete_object", "uuid": lab[6].kid("uuid").atoms[0]})
for j in sheet.junctions():
    ops.append({"op": "delete_object", "uuid": j[2]})
for n in sheet.no_connects():
    ops.append({"op": "delete_object", "uuid": n[2]})
for ref in DELETE_POWER:
    ops.append({"op": "delete_component", "designator": ref, "cascade": False})
for ref, (x, y, rot, mirror) in PARTS.items():
    ops.append({"op": "move_component", "designator": ref, "x_mil": x, "y_mil": y})
    ops.append({"op": "set_component_transform", "designator": ref, "rotation": rot, "mirror": mirror})
for ref, (x, y, rot) in POWER.items():
    ops.append({"op": "move_component", "designator": ref, "x_mil": x, "y_mil": y})
    ops.append({"op": "set_component_transform", "designator": ref, "rotation": rot, "mirror": "none"})
print(json.dumps({"protocol_version": 2, "target_format": "kicad",
                  "target_file": pathlib.Path(sys.argv[1]).name, "ops": ops}, indent=1))
