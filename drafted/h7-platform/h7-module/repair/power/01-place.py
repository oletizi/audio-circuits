"""Write op-list 01 for the power page: delete copperhead's wiring and labels, then place every part.

Deletes every wire, label, junction and no-connect copperhead drew (02 redraws the wiring and the
three port labels), and moves and orients every part to layout.py's placement. Reads the draft only
for the uuids of what it deletes and to refuse a draft whose parts are not layout.py's. The draft
carries no power symbol (every net on a block page is kind "signal", TOOLING.md C3), and this
refuses one if it appears.

usage: python3 01-place.py <draft.kicad_sch> > 01-place.json
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = pathlib.Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
sys.path.insert(0, str(HERE))
import kicad_sheet  # noqa: E402
from layout import PARTS  # noqa: E402

if len(sys.argv) != 2:
    raise SystemExit("usage: python3 01-place.py <draft.kicad_sch>")
sheet = kicad_sheet.read(sys.argv[1])
refs = {s.ref for s in sheet.symbols()}
power = sorted(r for r in refs if r.startswith("#"))
if power:
    raise SystemExit(f"01-place: the draft carries power symbols or flags {power}; a block page draws none (TOOLING.md C3)")
if refs != set(PARTS):
    raise SystemExit(f"01-place: the draft's parts {sorted(refs)} are not layout.py's {sorted(PARTS)}; is this the draft make draw wrote?")

ops = []
for w in sheet.wires():
    ops.append({"op": "delete_object", "uuid": w.uuid})
for lab in sheet.labels():
    ops.append({"op": "delete_object", "uuid": lab[6].kid("uuid").atoms[0]})
for j in sheet.junctions():
    ops.append({"op": "delete_object", "uuid": j[2]})
for n in sheet.no_connects():
    ops.append({"op": "delete_object", "uuid": n[2]})
for ref, (x, y, rot) in PARTS.items():
    ops.append({"op": "move_component", "designator": ref, "x_mil": x, "y_mil": y})
    ops.append({"op": "set_component_transform", "designator": ref, "rotation": rot, "mirror": "none"})
print(json.dumps({"protocol_version": 2, "target_format": "kicad",
                  "target_file": pathlib.Path(sys.argv[1]).name, "ops": ops}, indent=1))
