"""Quantify SchGen's pin-extraction limitation across the installed KiCad libs.

SchGen's extract_pins_from_symbol() (modules/utils/kicad_add_symbol.py) only
collects pin UUIDs from a unit sub-symbol whose FIRST child is a (pin ...):

    if item[0] == 'symbol' and item[2][0] == 'pin':

A unit body that opens with a graphic (rectangle / polyline / arc / circle)
therefore yields zero pin entries in the placed instance, and
get_pin_location() then raises TypeError. This script counts, per library, how
many top-level symbols have at least one unit sub-symbol whose first child is a
pin (= addressable) versus none (= not addressable).

Indentation in .kicad_sym is tabs: 1 tab = top-level symbol,
2 tabs = unit sub-symbol, 3 tabs = child of a unit.
"""

import re
import sys
from pathlib import Path

SYMBOL_DIR = Path("/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols")

TOP = re.compile(r'^\t\(symbol "([^"]+)"')
UNIT = re.compile(r'^\t\t\(symbol "([^"]+)"')
CHILD = re.compile(r"^\t\t\t\(([a-z_]+)")

probe_names = set(sys.argv[1:])

total_ok = total_bad = 0
per_lib = {}
probe_report = {}

for lib_file in sorted(SYMBOL_DIR.glob("*.kicad_sym")):
    ok = bad = 0
    cur_top = None
    cur_unit_firstchild_pending = False
    top_has_pin_first_unit = False
    unit_firsts = []

    def finish_top():
        global ok, bad, total_ok, total_bad
        if cur_top is None:
            return
        if top_has_pin_first_unit:
            ok += 1
            total_ok += 1
        else:
            bad += 1
            total_bad += 1
        if f"{lib_file.stem}:{cur_top}" in probe_names or cur_top in probe_names:
            probe_report[f"{lib_file.stem}:{cur_top}"] = (
                top_has_pin_first_unit, list(unit_firsts))

    with lib_file.open(encoding="utf-8") as fh:
        for line in fh:
            m = TOP.match(line)
            if m:
                finish_top()
                cur_top = m.group(1)
                top_has_pin_first_unit = False
                unit_firsts = []
                cur_unit_firstchild_pending = False
                continue
            if UNIT.match(line):
                cur_unit_firstchild_pending = True
                continue
            c = CHILD.match(line)
            if c and cur_unit_firstchild_pending:
                cur_unit_firstchild_pending = False
                unit_firsts.append(c.group(1))
                if c.group(1) == "pin":
                    top_has_pin_first_unit = True
    finish_top()
    per_lib[lib_file.stem] = (ok, bad)

print(f"TOTAL addressable={total_ok}  not-addressable={total_bad}  "
      f"({100.0*total_bad/(total_ok+total_bad):.1f}% not addressable)")

for lib in ["Device", "power", "Switch", "Connector_Generic", "Connector",
            "Amplifier_Operational", "Transistor_FET"]:
    if lib in per_lib:
        o, b = per_lib[lib]
        print(f"  {lib:26} addressable={o:5} not-addressable={b:5}")

print()
for k, (good, firsts) in sorted(probe_report.items()):
    print(f"  PROBE {k:42} addressable={good}  unit_first_children={firsts}")
