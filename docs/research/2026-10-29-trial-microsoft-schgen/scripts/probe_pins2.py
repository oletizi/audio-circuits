"""Second probe: the rotary switch and the 5-pin connector, with SchGen's
pin-extraction bug monkey-patched so their pins become addressable.

The patch replaces the `item[2][0] == 'pin'` test in
modules/utils/kicad_add_symbol.extract_pins_from_symbol with a scan of every
child of every unit sub-symbol. Nothing else is changed.
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

import modules.utils.kicad_add_symbol as kas  # noqa: E402


def extract_pins_patched(symbol_sexp):
    pins = []
    for item in symbol_sexp:
        if isinstance(item, list) and len(item) > 2 and item[0] == 'symbol':
            for pin_info in item[2:]:
                if isinstance(pin_info, list) and len(pin_info) > 1 and pin_info[0] == 'pin':
                    for p_item in pin_info:
                        if isinstance(p_item, list) and len(p_item) > 1 and p_item[0] == 'number':
                            pins.append(['pin', p_item[1], ['uuid', kas.generate_uuid()]])
                            break
    return pins


kas.extract_pins_from_symbol = extract_pins_patched

from modules.kicad_sch_interface import *  # noqa: E402

set_schematic_filename(str(out))

CASES = [
    ("Switch", "SW_Rotary_1x6_MP", 0, "None",
     ["1", "2", "3", "4", "5", "6", "7", "MP"]),
    ("Switch", "SW_Rotary_1x6_MP", 180, "None",
     ["1", "2", "3", "4", "5", "6", "7", "MP"]),
    ("Connector_Generic", "Conn_01x05", 0, "None", ["1", "2", "3", "4", "5"]),
    ("Connector_Generic", "Conn_01x05", 180, "None", ["1", "2", "3", "4", "5"]),
]

CX, CY = 40.0, 180.0
step = 0.0
for i, (lib, name, rot, mir, pins) in enumerate(CASES):
    ref = f"Y{i}"
    px, py = CX + step, CY
    add_schematic_symbol(symbol_lib=lib, symbol_name=name, pos_x=px, pos_y=py,
                         reference=ref, value="PROBE", rotation=rot, mirror=mir)
    step += 50.0
    locs = []
    for p in pins:
        try:
            locs.append(f"{p}={get_pin_location(symbol_ref=ref, pin_name=p)}")
        except Exception as exc:
            locs.append(f"{p}=ERR({type(exc).__name__}: {exc})")
    print(f"RESULT {lib}:{name} rot={rot} center=({px},{py}) -> " + "  ".join(locs))
