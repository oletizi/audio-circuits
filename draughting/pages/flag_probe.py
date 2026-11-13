"""Write a PROBE copy of a sheet in which each placed power:PWR_FLAG carries the reference
FLGPROBE<n>, so that `kicad-cli sch export netlist` lists it and says which net it sits on.

Why a probe. kicad-cli's netlist export leaves out every symbol whose reference starts with `#`,
and akcli names a PWR_FLAG `#PWR0n` (measured: the h7-module power page's export lists neither flag; the
probe copy's lists both, each as a node of its net). The copy is scratch and never committed; the
sheet under check is not touched.

The flags are found by lib_id "power:PWR_FLAG" through `draughting/measure/kicad_sheet.py`'s
parser, never by a line pattern: a sheet holds symbols in two textual forms, KiCad's multi-line one
and akcli's one-line one (TOOLING.md's trap index). The reference is rewritten only inside each
flag's own symbol list, by `flag_rewrite.py`, which `hierarchy_flag_probe.py` shares. Refuses a
sheet already carrying a FLGPROBE reference.

Prints the number of flags found.

usage: python3 flag_probe.py <in.kicad_sch> <out.kicad_sch>
"""
import pathlib
import sys

from flag_rewrite import refuse_if_probed, rewrite_flags

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

TOOL = "flag_probe.py"

if len(sys.argv) != 3:
    sys.exit(f"{TOOL}: expected two arguments, the sheet and the probe copy to write; got {len(sys.argv) - 1}")
src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf-8", newline="").read()
refuse_if_probed(text, src, TOOL)
flags = [s for s in kicad_sheet.read(src).symbols() if s.lib_id == "power:PWR_FLAG"]
text, _ = rewrite_flags(text, flags, 1, f"on {src}", TOOL)
open(dst, "w", encoding="utf-8", newline="").write(text)
print(len(flags))
