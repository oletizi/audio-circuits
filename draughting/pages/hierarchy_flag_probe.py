"""Write a PROBE copy of a whole hierarchical project - the root and every sheet it names - in which
each placed power:PWR_FLAG carries the reference FLGPROBE<k>, so that `kicad-cli sch export netlist`
of the probe root lists every flag of the hierarchy and says which net each sits on. The whole-project
form of `flag_probe.py` (which probes one sheet), for `hierarchy-flags.ts`.

Why a probe: kicad-cli's export leaves out every `#` reference, and every flag here is one (#PWR0<n>
on the power page, #FLG0<n> on the root). The copy is scratch, written to <out-dir>, never committed;
the project under check is not touched.

Writes <out-dir>/probe-map.json: FLGPROBE<k> -> {"sheet": "root" or the block's Sheetname, "ref": the
flag's real reference}. Prints the number of flags.

ALSO FAILS ON A `#` REFERENCE USED TWICE ACROSS THE HIERARCHY, naming it and its sheets, with exit
status 3 AFTER the probe is written, so the flag check can still run and a run names both faults.
kicad-cli's export warns "schematic has annotation errors" on one (measured, Task 7e: the root's
flags as akcli numbered them, #PWR01 to #PWR03, beside the power page's #PWR01 and #PWR02), and the
export, which drops `#` references, cannot show which. Exit 1 is a probe that could not be written.

Sheets are found from the root's own (sheet ...) entries (Sheetname, Sheetfile), never by listing the
directory, so a stray file is not read and a missing one refuses. Flags are found by lib_id through
`draughting/measure/kicad_sheet.py`'s parser; the reference is rewritten only inside each flag's own
symbol list, by `flag_rewrite.py`, which `flag_probe.py` shares. Refuses a sheet already carrying a
FLGPROBE reference.

usage: python3 hierarchy_flag_probe.py <project-dir> <board> <out-dir>
"""
import collections
import json
import pathlib
import shutil
import sys

from flag_rewrite import refuse_if_probed, rewrite_flags

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

TOOL = "hierarchy_flag_probe.py"

if len(sys.argv) != 4:
    sys.exit(f"hierarchy_flag_probe.py: expected three arguments, the project directory, the board and the output directory; got {len(sys.argv) - 1}")
project, board, out = pathlib.Path(sys.argv[1]), sys.argv[2], pathlib.Path(sys.argv[3])
root_file = project / f"{board}.kicad_sch"
if not root_file.is_file():
    sys.exit(f"hierarchy_flag_probe.py: no root sheet at {root_file}")


def prop(node, name):
    for p in node.kids("property"):
        if len(p.atoms) >= 2 and p.atoms[0] == name:
            return p.atoms[1]
    return None


root = kicad_sheet.read(str(root_file))
sheets = [("root", f"{board}.kicad_sch")]
for s in root.root.kids("sheet"):
    name, file = prop(s, "Sheetname"), prop(s, "Sheetfile")
    if name is None or file is None:
        sys.exit(f"hierarchy_flag_probe.py: a sheet on {root_file} lacks Sheetname or Sheetfile")
    sheets.append((name, file))

out.mkdir(parents=True, exist_ok=True)
probe_map = {}
refs = collections.defaultdict(list)
k = 0
for name, file in sheets:
    src = project / file
    if not src.is_file():
        sys.exit(f"hierarchy_flag_probe.py: the root names sheet {name!r} in {file}, which is not in {project}")
    text = open(src, encoding="utf-8", newline="").read()
    refuse_if_probed(text, src, TOOL)
    symbols = kicad_sheet.read(str(src)).symbols()
    for s in symbols:
        if s.ref and s.ref.startswith("#"):
            refs[s.ref].append(name)
    flags = sorted((s for s in symbols if s.lib_id == "power:PWR_FLAG"), key=lambda s: s.node.start)
    text, renamed = rewrite_flags(text, flags, k + 1, f"on sheet {name!r}", TOOL)
    for probe, ref in renamed:
        probe_map[probe] = {"sheet": name, "ref": ref}
    k += len(renamed)
    open(out / file, "w", encoding="utf-8", newline="").write(text)
for extra in ("sym-lib-table", f"{board}.kicad_pro"):
    if (project / extra).is_file():
        shutil.copyfile(project / extra, out / extra)
(out / "probe-map.json").write_text(json.dumps(probe_map, indent=1) + "\n")
print(k)
dupes = {r: where for r, where in refs.items() if len(where) > 1}
for r, where in sorted(dupes.items()):
    print(f"hierarchy_flag_probe.py: FAIL - reference {r} is used {len(where)} times across the hierarchy, on {', '.join(where)}", file=sys.stderr)
print(f"hierarchy_flag_probe.py: {len(refs)} '#' reference(s) across {len(sheets)} sheets, {len(dupes)} used more than once", file=sys.stderr)
sys.exit(3 if dupes else 0)
