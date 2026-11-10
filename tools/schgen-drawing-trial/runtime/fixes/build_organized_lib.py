"""Build SchGen's export/organized_lib.json with SchGen's own generator.

    python /trial/fixes/build_organized_lib.py SYMBOL_DIR OUT_DIR

SchGen's README (step "mkdir export", then run modules/utils/kicad_scan_lib.py)
has the user generate export/organized_lib.json; the repository does not ship
it. modules/symbol_context.py loads it AT IMPORT from the cwd-relative path
./export/organized_lib.json, and when the file is absent load_organized_lib()
prints a line and returns {} - after which describe_symbol_info() matches no
symbol and the prompt's symbol context is silently `{}`. So the image builds
the file, and trial/prompt.py refuses a context that does not cover every
requested symbol.

The file is made by SchGen's gather_symbols_by_lib() and save_organized_lib(),
called here rather than through kicad_scan_lib's __main__, with two fixes:

  organized_lib_sys
      kicad_scan_lib imports `sys` only under `if __name__ == "__main__":`,
      yet gather_symbols_by_lib() writes progress through sys.stdout, so
      calling it from an import raises NameError. The module is given `sys`
      before the call. Nothing else about the scan changes (SKIP_LIB, fields,
      the `extends` handling are SchGen's).

  pin_name_empty
      KiCad 10.0.5's libraries write an unnamed pin as (name ""); KiCad 8's,
      which SchGen trained on, wrote (name "~"). symbol_context's
      _extract_bbox_and_pins substitutes the pin number only for "~", so under
      10.0.5 Device:R, Device:C, power:GND and others reach the prompt with an
      empty pin_name and no identifier. Before the file is saved, each pin's
      stored name '""' is rewritten to '"~"' - KiCad 8's spelling - and
      SchGen's own "~" handling then substitutes the number. Only that one
      value changes; a pin with a real name is untouched. organized_lib.json
      is read only by the prompt side (symbol_context); the emitter does not
      load it. Made by controller ruling, Task 4 fix round 2.

The __main__ path is not used because it reads KICAD_SYMBOL_LIB_PATH
(config.py's Linux /usr/share/kicad/symbols, absent here) and then goes on to
the footprint scan, which needs footprint libraries the trial does not use.
The symbol libraries are KiCad 10.0.5's, the same ones build_repo.py and
emit.sh use.
"""

import contextlib
import os
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit("usage: build_organized_lib.py SYMBOL_DIR OUT_DIR")

SYMBOL_DIR = Path(sys.argv[1])
OUT_DIR = Path(sys.argv[2])
PROJECT_PATH = os.environ.get("PROJECT_PATH")
if not PROJECT_PATH:
    raise SystemExit("PROJECT_PATH is unset; SchGen's modules resolve their imports from it")
if not SYMBOL_DIR.is_dir():
    raise SystemExit(
        f"symbol directory {SYMBOL_DIR} does not exist: organized_lib.json is read from "
        "KiCad 10.0.5's *.kicad_sym libraries and there is no substitute for them"
    )
sys.path.append(PROJECT_PATH)

from modules.utils import kicad_scan_lib as scan  # noqa: E402

# How parse_sexp stores the two spellings of "this pin has no name".
EMPTY_NAME = '""'
KICAD8_NO_NAME = '"~"'


def _pin_nodes(tree: object):
    if isinstance(tree, list):
        if tree and tree[0] == "pin":
            yield tree
        for item in tree:
            yield from _pin_nodes(item)


def pin_name_empty(org_lib: dict) -> int:
    """Rewrite each pin's stored (name "") to (name "~"); return how many.

    Only the `name` child of a `pin` node whose stored value is exactly '""'
    changes. Everything else in the scan output is left as SchGen made it.
    """
    count = 0
    for symbols in org_lib.values():
        for info in symbols:
            tree = info.get("symbol")
            if not isinstance(tree, list):  # an `extends` entry holds a string
                continue
            for pin in _pin_nodes(tree):
                for child in pin[1:]:
                    if (isinstance(child, list) and len(child) >= 2 and child[0] == "name"
                            and child[1] == EMPTY_NAME):
                        child[1] = KICAD8_NO_NAME
                        count += 1
    return count


scan.sys = sys  # the organized_lib_sys fix, see the module docstring
# gather_symbols_by_lib writes a carriage-return progress line per symbol
# (about a megabyte in a build log); it is discarded, errors still raise.
with open(os.devnull, "w", encoding="utf-8") as devnull, contextlib.redirect_stdout(devnull):
    org_lib = scan.gather_symbols_by_lib(SYMBOL_DIR)
print(f"gather_symbols_by_lib: {len(org_lib)} libraries, "
      f"{sum(len(v) for v in org_lib.values())} symbols")
pin_name_empty_count = pin_name_empty(org_lib)  # the pin_name_empty fix
print(f"pin_name_empty: {pin_name_empty_count} pin names \"\" -> \"~\"")
if pin_name_empty_count == 0:
    raise SystemExit(
        "pin_name_empty rewrote no pin name. KiCad 10.0.5's libraries write every unnamed pin "
        "as (name \"\"), so zero means the scan's stored form changed and the fix no longer "
        "applies; the prompt would then describe those pins with no identifier"
    )
for required in ("power", "Device"):
    if not org_lib.get(required):
        raise SystemExit(
            f"gather_symbols_by_lib({SYMBOL_DIR}) produced no '{required}' library; the trial's "
            "requests name symbols from it, so the symbol context would be missing them"
        )
OUT_DIR.mkdir(parents=True, exist_ok=True)
scan.save_organized_lib(org_lib, str(OUT_DIR))
