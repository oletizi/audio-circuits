"""Probe: place each symbol this trial needs and read back its pin locations
through SchGen's own get_pin_location(), so the hand-written program can use
measured offsets rather than assumed ones.
"""

import os
import sys
from pathlib import Path

PROJECT_PATH = os.environ["PROJECT_PATH"]
sys.path.append(PROJECT_PATH)

BLANK = '''(kicad_sch
    (version 20231120)
    (generator "eeschema")
    (generator_version "8.0")
    (uuid "00000000-0000-0000-0000-000000000000")
    (paper "A4")
    (lib_symbols)
    (sheet_instances
        (path "/"
            (page "1")
        )
    )
    (symbol_instances)
)
'''

out = Path(sys.argv[1])
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(BLANK, encoding="utf-8")

from modules.kicad_sch_interface import *  # noqa: E402

set_schematic_filename(str(out))

CASES = [
    ("Device", "R", 0, "None", ["1", "2"]),
    ("Device", "R", 90, "None", ["1", "2"]),
    ("Device", "C", 0, "None", ["1", "2"]),
    ("Device", "C", 90, "None", ["1", "2"]),
    ("Device", "R_Potentiometer", 0, "None", ["1", "2", "3"]),
    ("Device", "R_Potentiometer", 90, "None", ["1", "2", "3"]),
    ("Switch", "SW_Rotary_1x6_MP", 0, "None",
     ["1", "2", "3", "4", "5", "6", "7", "MP"]),
    ("Connector_Generic", "Conn_01x05", 0, "None",
     ["1", "2", "3", "4", "5"]),
    ("Connector_Generic", "Conn_01x05", 180, "None",
     ["1", "2", "3", "4", "5"]),
    ("power", "GND", 0, "None", ["1"]),
    ("power", "GND", 180, "None", ["1"]),
]

CX, CY = 40.0, 180.0
step = 0.0
for i, (lib, name, rot, mir, pins) in enumerate(CASES):
    ref = f"X{i}"
    px = CX + step
    py = CY
    add_schematic_symbol(symbol_lib=lib, symbol_name=name, pos_x=px, pos_y=py,
                         reference=ref, value="PROBE", rotation=rot, mirror=mir)
    step += 20.0
    locs = []
    for p in pins:
        try:
            locs.append(f"{p}={get_pin_location(symbol_ref=ref, pin_name=p)}")
        except Exception as exc:
            locs.append(f"{p}=ERR({exc})")
    print(f"RESULT {lib}:{name} rot={rot} center=({px},{py}) -> " + "  ".join(locs))
