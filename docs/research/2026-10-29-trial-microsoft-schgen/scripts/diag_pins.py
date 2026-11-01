"""Diagnose why get_pin_location() fails for some symbols.

Counts the (pin "<n>" (uuid ...)) entries SchGen's extract_pins_from_symbol()
wrote into each placed symbol instance, and prints a full traceback for one
failing lookup.
"""

import os
import re
import sys
import traceback

PROJECT_PATH = os.environ["PROJECT_PATH"]
sys.path.append(PROJECT_PATH)

SCH = sys.argv[1]
text = open(SCH, encoding="utf-8").read()

blocks = re.split(r"\n    \(symbol\n", text)
for b in blocks[1:]:
    lib = re.search(r'\(lib_id "([^"]+)"', b)
    ref = re.search(r'\(property "Reference" "([^"]+)"', b)
    npin = len(re.findall(r'\(pin "[^"]*"\n\s+\(uuid', b))
    if lib and ref:
        print(f"INSTANCE {ref.group(1):4} {lib.group(1):35} instance_pin_entries={npin}")

from modules.kicad_sch_interface import *  # noqa: E402

set_schematic_filename(SCH)

for ref in ["X0", "X6", "X7"]:
    try:
        print(f"LOOKUP {ref} pin 1 ->", get_pin_location(symbol_ref=ref, pin_name="1"))
    except Exception:
        print(f"LOOKUP {ref} pin 1 -> TRACEBACK")
        traceback.print_exc()
