"""A copy of SchGen's init_project.py main path with exactly two deviations,
both forced and both named:

  1. The blank sheet it writes gets a real root UUID instead of the nil
     "00000000-0000-0000-0000-000000000000" that init_project.make_kicad_sch()
     hardcodes. KiCad 10.0.5 resolves no symbol instance against a nil sheet
     path, so with the stock template it plots an empty A4 frame and exports an
     empty netlist, both with exit code 0 and no diagnostic.
  2. The get_fp() footprint step at the end is skipped. It needs
     export/organized_fp.json, which the repo does not ship and which its own
     generator (modules/utils/kicad_scan_lib.gather_footprints_by_lib) cannot
     produce: that function raises NameError: name 'sys' is not defined at
     kicad_scan_lib.py:552. Footprints do not affect the drawing.

Everything else -- the template, the set_schematic_filename injection, the
subprocess invocation -- is init_project.py's.
"""

import os
import subprocess
import sys
import uuid
from pathlib import Path

project_path = os.environ["PROJECT_PATH"]
project_name = sys.argv[1]
schematic_code = Path(sys.argv[2]).resolve()
root_uuid = sys.argv[3] if len(sys.argv) > 3 else str(uuid.uuid4())

TEMPLATE = """(kicad_sch
    (version 20231120)
    (generator "eeschema")
    (generator_version "8.0")
    (uuid "{u}")
    (paper "A4")
    (lib_symbols)
    (sheet_instances
        (path "/"
            (page "1")
        )
    )
    (symbol_instances)
)
"""

project_dir = Path.cwd() / project_name
project_dir.mkdir(parents=True, exist_ok=True)
sch_path = project_dir / f"{project_name}.kicad_sch"
sch_path.write_text(TEMPLATE.format(u=root_uuid), encoding="utf-8")
print(f"root uuid: {root_uuid}")

code_text = schematic_code.read_text(encoding="utf-8")
target_import = "from modules.kicad_sch_interface import *"
insert_line = f'set_schematic_filename(r"{sch_path}")'
if insert_line not in code_text:
    if target_import not in code_text:
        raise RuntimeError(f"Cannot find import line: {target_import}")
    code_text = code_text.replace(
        target_import, f"{target_import}\n{insert_line}", 1)
    schematic_code.write_text(code_text, encoding="utf-8")

env = os.environ.copy()
env["PROJECT_PATH"] = project_path
res = subprocess.run([sys.executable, str(schematic_code)], cwd=project_path,
                     env=env, text=True, stdout=subprocess.PIPE,
                     stderr=subprocess.STDOUT)
print(res.stdout)
if res.returncode != 0:
    raise RuntimeError(f"Failed to run schematic code: {schematic_code}")
print(f"Schematic file: {sch_path}")
