"""Write an akcli op-list placing one PWR_FLAG at a sheet's hierarchical label of a given name, for
erc-control.sh's negative control (an extra flag on a shared net whose flag lives elsewhere). The
label's position is read with `draughting/measure/kicad_sheet.py`'s parser, never from a line
pattern. Refuses unless exactly one hierarchical label carries the name.

usage: python3 flag_at_label.py <sheet.kicad_sch> <net> > ops.json
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

MM_PER_MIL = 0.0254

if len(sys.argv) != 3:
    sys.exit(f"flag_at_label.py: expected two arguments, the sheet and the net; got {len(sys.argv) - 1}")
sheet, net = sys.argv[1], sys.argv[2]
hits = [lab for lab in kicad_sheet.read(sheet).labels() if lab[0] == "hierarchical_label" and lab[1] == net]
if len(hits) != 1:
    sys.exit(f"flag_at_label.py: {sheet} has {len(hits)} hierarchical label(s) named {net}; expected exactly one")
_, _, x, y, _, _, _ = hits[0]
at = [round(x / MM_PER_MIL), round(y / MM_PER_MIL)]
print(json.dumps({"protocol_version": 2, "target_format": "kicad", "target_file": pathlib.Path(sheet).name,
                  "ops": [{"op": "place_pwr_flag", "at": at, "rotation": 0}]}, indent=1))
