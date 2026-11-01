"""Find KiCad symbols that SchGen's emitter CAN address, to pick declared
substitutes for the rotary switch and the 5-pin connectors.

Reports, for the libraries of interest, each addressable symbol (a unit
sub-symbol whose first child is a pin) together with its pin numbers.
"""

import re
import sys
from pathlib import Path

SYMBOL_DIR = Path("/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols")

TOP = re.compile(r'^\t\(symbol "([^"]+)"')
UNIT = re.compile(r'^\t\t\(symbol "([^"]+)"')
CHILD = re.compile(r"^\t\t\t\(([a-z_]+)")
PINNUM = re.compile(r'^\t\t\t\t\(number "([^"]*)"')

want_pincount = set(int(a) for a in sys.argv[2:]) if len(sys.argv) > 2 else None
libs = sys.argv[1].split(",")

for lib in libs:
    lib_file = SYMBOL_DIR / f"{lib}.kicad_sym"
    rows = []
    cur = None
    addressable = False
    pending = False
    pins = []

    def flush():
        if cur is None:
            return
        if addressable and (want_pincount is None or len(pins) in want_pincount):
            rows.append((cur, list(pins)))

    with lib_file.open(encoding="utf-8") as fh:
        for line in fh:
            m = TOP.match(line)
            if m:
                flush()
                cur = m.group(1)
                addressable = False
                pending = False
                pins = []
                continue
            if UNIT.match(line):
                pending = True
                continue
            c = CHILD.match(line)
            if c:
                if pending:
                    pending = False
                    if c.group(1) == "pin":
                        addressable = True
                continue
            p = PINNUM.match(line)
            if p:
                pins.append(p.group(1))
    flush()

    print(f"=== {lib}: {len(rows)} addressable symbols matching filter")
    for name, pins in rows:
        print(f"   {name:34} pins({len(pins)}): {','.join(pins)}")
