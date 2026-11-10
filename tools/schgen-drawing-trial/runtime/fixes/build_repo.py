"""Reconstruct the missing modules/component_repository.json for SchGen.

Copied from docs/research/2026-10-29-trial-microsoft-schgen/scripts/build_repo.py,
with one change: the KiCad symbol directory is a parameter rather than the
macOS KiCad.app path the trial hardcoded, because here it runs inside the
schgen-runtime image build against the host's KiCad 10.0.5 symbol libraries
mounted into the build.

    python build_repo.py SYMBOL_DIR OUT_JSON

The public SchGen repo does not ship modules/component_repository.json (the
.gitignore excludes *.json) and no code in the repo generates it, so
add_schematic_symbol() raises FileNotFoundError on its first call. This script
builds a file with the shape kicad_sch_interface.py expects:

    {level1: {level2: {symbol_lib: [symbol_name, ...]}}}

Top-level symbol names are read directly out of the installed KiCad
*.kicad_sym libraries. Libraries are emitted in sorted filename order.
"""

import json
import re
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: build_repo.py SYMBOL_DIR OUT_JSON")

SYMBOL_DIR = Path(sys.argv[1])
OUT = Path(sys.argv[2])

TOP_SYMBOL = re.compile(r'^\t\(symbol "([^"]+)"')

if not SYMBOL_DIR.is_dir():
    raise SystemExit(
        f"symbol directory {SYMBOL_DIR} does not exist: the component repository "
        "is read from KiCad 10.0.5's *.kicad_sym libraries and there is no "
        "substitute for them"
    )

repo = {"kicad": {"standard": {}}}
bucket = repo["kicad"]["standard"]

for lib_file in sorted(SYMBOL_DIR.glob("*.kicad_sym")):
    names = []
    with lib_file.open(encoding="utf-8") as fh:
        for line in fh:
            m = TOP_SYMBOL.match(line)
            if m:
                names.append(m.group(1))
    if names:
        bucket[lib_file.stem] = names

if not bucket:
    raise SystemExit(
        f"no top-level symbols found in any *.kicad_sym under {SYMBOL_DIR}: an "
        "empty component repository would make every add_schematic_symbol call "
        "miss, so it is refused rather than written"
    )

OUT.write_text(json.dumps(repo, indent=1), encoding="utf-8")

total = sum(len(v) for v in bucket.values())
print(f"libraries: {len(bucket)}  symbols: {total}")

# Report which library first-match-wins picks for the symbols this trial names.
first = {}
for lib, names in bucket.items():
    for n in names:
        first.setdefault(n, lib)

for probe in ["C", "R", "R_Potentiometer", "SW_Rotary_1x6_MP", "Conn_01x05", "GND"]:
    print(f"  {probe!r:22} -> {first.get(probe)!r}")
