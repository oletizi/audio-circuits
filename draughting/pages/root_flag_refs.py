"""Give the h7-module ROOT's PWR_FLAGs references no other sheet of the hierarchy uses: #FLG01,
#FLG02, ... in file order, in place of the #PWR0<n> akcli writes.

Why (Task 7e, the parked minor "duplicate #PWR references across sheets"). akcli numbers #PWR0<n>
per SHEET (`akcli/writers/instances.py`: one past the highest #PWR0<n> already in that sheet), so
the root's three flags came out #PWR01 to #PWR03 while the power page's two are #PWR01 and #PWR02.
MEASURED with kicad-cli 10.0.5 on the assembled root: with those references, `kicad-cli sch export
netlist` prints "Warning: schematic has annotation errors, please use the schematic editor to fix
them"; the same root without its flags prints nothing, and the two exports are identical apart from
their (source) line (an export leaves out every `#` reference). ERC reported no violation for it in
either case. A warning that something is wrong with the drawing's annotation is a warning nobody
should have to learn to ignore, and the power page is approved, so it is the root that renumbers.
"#FLG" is the reference prefix KiCad's own `power:PWR_FLAG` symbol carries.

akcli 0.22.0 has no operation that sets a reference, so this is a direct text edit, like the block
pages' text_edits.py: each flag found by lib_id "power:PWR_FLAG" through
`draughting/measure/kicad_sheet.py`'s parser (never by a line pattern), and its reference rewritten
only inside that flag's own symbol list (the Reference property and the instance's reference).

Refuses: a flag count other than <expected>; a flag whose reference is not #PWR0<n>; a sheet that
already holds a #FLG reference.

usage: python3 root_flag_refs.py <root.kicad_sch> <expected-flag-count>
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

if len(sys.argv) != 3:
    sys.exit(f"root_flag_refs.py: expected two arguments, the root sheet and the expected flag count; got {len(sys.argv) - 1}")
path, expected = sys.argv[1], int(sys.argv[2])
text = open(path, encoding="utf-8", newline="").read()
# "#FLG" alone is the library symbol's own Reference default, in lib_symbols; a numbered one is ours.
if re.search(r'"#FLG\d', text):
    sys.exit(f"root_flag_refs.py: {path} already holds a numbered #FLG reference; run it once, on the sheet akcli wrote")
flags = [s for s in kicad_sheet.read(path).symbols() if s.lib_id == "power:PWR_FLAG"]
if len(flags) != expected:
    sys.exit(f"root_flag_refs.py: {path} holds {len(flags)} PWR_FLAG(s), expected {expected} (root-flags.ts's op-list)")
edits = []
for n, s in enumerate(sorted(flags, key=lambda f: f.node.start), 1):
    if not re.fullmatch(r"#PWR0\d+", s.ref or ""):
        sys.exit(f"root_flag_refs.py: the PWR_FLAG at ({s.x}, {s.y}) has reference {s.ref!r}, not akcli's #PWR0<n>")
    block = text[s.node.start:s.node.end]
    old, new = f'"{s.ref}"', f'"#FLG{n:02d}"'
    if block.count(old) != 2:
        sys.exit(f"root_flag_refs.py: the PWR_FLAG {s.ref} carries its reference {block.count(old)} times, expected 2 (property and instance)")
    edits.append((s.node.start, s.node.end, block.replace(old, new)))
for start, end, new in sorted(edits, reverse=True):
    text = text[:start] + new + text[end:]
open(path, "w", encoding="utf-8", newline="").write(text)
print(f"root_flag_refs.py: {len(edits)} root PWR_FLAG reference(s) renamed #FLG01..#FLG{len(edits):02d}")
