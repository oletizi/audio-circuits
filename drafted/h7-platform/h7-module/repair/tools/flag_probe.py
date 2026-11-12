"""Write a PROBE copy of a sheet in which each placed power:PWR_FLAG carries the reference
FLGPROBE<n>, so that `kicad-cli sch export netlist` lists it and says which net it sits on.

Why a probe. kicad-cli's netlist export leaves out every symbol whose reference starts with `#`,
and akcli names a PWR_FLAG `#PWR0n` (measured: the power page's export lists neither flag; the
probe copy's lists both, each as a node of its net). The copy is scratch and never committed; the
sheet under check is not touched.

The flags are found by lib_id "power:PWR_FLAG" through `draughting/measure/kicad_sheet.py`'s
parser, never by a line pattern: a sheet holds symbols in two textual forms, KiCad's multi-line one
and akcli's one-line one (TOOLING.md's trap index). The reference is rewritten only inside each
flag's own symbol list. Refuses a sheet already carrying a FLGPROBE reference.

Prints the number of flags found.

usage: python3 flag_probe.py <in.kicad_sch> <out.kicad_sch>
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

PREFIX = "FLGPROBE"

if len(sys.argv) != 3:
    sys.exit(f"flag_probe.py: expected two arguments, the sheet and the probe copy to write; got {len(sys.argv) - 1}")
src, dst = sys.argv[1], sys.argv[2]
text = open(src, encoding="utf-8", newline="").read()
if PREFIX in text:
    sys.exit(f"flag_probe.py: {src} already contains {PREFIX}; a probe reference would not be unique")
flags = [s for s in kicad_sheet.read(src).symbols() if s.lib_id == "power:PWR_FLAG"]
edits = []
for n, s in enumerate(flags, 1):
    if not s.ref:
        sys.exit(f"flag_probe.py: the PWR_FLAG at ({s.x}, {s.y}) has no Reference to rewrite")
    block = text[s.node.start:s.node.end]
    old = f'"{s.ref}"'
    if old not in block:
        sys.exit(f"flag_probe.py: the PWR_FLAG {s.ref} at ({s.x}, {s.y}) does not carry its reference as {old}")
    edits.append((s.node.start, s.node.end, block.replace(old, f'"{PREFIX}{n}"')))
for start, end, new in sorted(edits, reverse=True):
    text = text[:start] + new + text[end:]
open(dst, "w", encoding="utf-8", newline="").write(text)
print(len(flags))
