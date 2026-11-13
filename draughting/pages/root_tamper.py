"""Scratch edits for a board's root controls (first written for the h7-module's root-control.sh) on a
COPY of the board's project. Never run on the
committed files: each mode refuses a path under drafted/.

Modes:
  flag-at-label <01-assemble.json> <net> <index>
      print an akcli op-list placing one PWR_FLAG at the <index>-th (0-based) root stub label named
      <net>, in the root op-list's order (root-flags.ts puts its flag at a top or bottom one).
  flag-at-pin <pins.json> <designator> <pin> <target-file>
      print an akcli op-list placing one PWR_FLAG on a block page at that pin's point.
  rename-ref <sheet> <old> <new>
      rewrite a placed symbol's reference <old> to <new>; it must occur exactly twice (property and
      instance), else refuse.
  cut-stub <root.kicad_sch> <01-assemble.json> <sheet-name> <pin>
      rename the root stub label of that sheet pin to <text>_CUT, which disconnects that sheet pin
      from the rest of its net on the root.
  move-sheet <root.kicad_sch> <sheet-name> <dy-mm>
      move that sheet symbol's box (its (at), nothing else) <dy-mm> south; its pins, stubs and labels
      stay where they were. For the paper-fit control (the US Letter rule of `TOOLING.md`, design change C3).

Labels and symbols are found through `draughting/measure/kicad_sheet.py`'s parser, never by a line
pattern; numbers are compared as numbers.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

MM_PER_MIL = 0.0254


def refuse_committed(path):
    if "/drafted/" in str(pathlib.Path(path).resolve()):
        sys.exit(f"root_tamper.py: {path} is under drafted/; the controls edit scratch copies only")


def oplist(target, ops):
    print(json.dumps({"protocol_version": 2, "target_format": "kicad", "target_file": target, "ops": ops}, indent=1))


def labels_named(assemble, net):
    return [op for op in json.load(open(assemble))["ops"] if op["op"] == "add_net_label" and op["name"] == net]


mode, args = sys.argv[1], sys.argv[2:]
if mode == "flag-at-label":
    assemble, net, index = args[0], args[1], int(args[2])
    found = labels_named(assemble, net)
    if index >= len(found):
        sys.exit(f"root_tamper.py: only {len(found)} root stub label(s) named {net}")
    oplist(json.load(open(assemble))["target_file"], [{"op": "place_pwr_flag", "at": found[index]["at"], "rotation": 0}])
elif mode == "flag-at-pin":
    pins, ref, pin, target = args
    oplist(target, [{"op": "place_pwr_flag", "at": json.load(open(pins))[ref][pin], "rotation": 0}])
elif mode == "rename-ref":
    path, old, new = args
    refuse_committed(path)
    text = open(path, encoding="utf-8", newline="").read()
    hits = [s for s in kicad_sheet.read(path).symbols() if s.ref == old]
    if len(hits) != 1:
        sys.exit(f"root_tamper.py: {len(hits)} placed symbol(s) referenced {old}; expected one")
    s = hits[0]
    block = text[s.node.start:s.node.end]
    if block.count(f'"{old}"') != 2:
        sys.exit(f"root_tamper.py: {old} occurs {block.count(chr(34) + old + chr(34))} times in its symbol; expected 2")
    text = text[:s.node.start] + block.replace(f'"{old}"', f'"{new}"') + text[s.node.end:]
    open(path, "w", encoding="utf-8", newline="").write(text)
    print(f"root_tamper.py: {old} -> {new}")
elif mode == "cut-stub":
    path, assemble, sheet_name, pin = args
    refuse_committed(path)
    ops = json.load(open(assemble))["ops"]
    starts = [i for i, op in enumerate(ops) if op["op"] == "add_sheet" and op["name"] == sheet_name]
    if len(starts) != 1:
        sys.exit(f"root_tamper.py: {len(starts)} sheet(s) named {sheet_name} in {assemble}")
    sheet = ops[starts[0]]
    k = [p["name"] for p in sheet["pins"]].index(pin)
    after = [op for op in ops[starts[0] + 1:] if op["op"] == "add_net_label"]
    at = after[k]["at"]
    want = (round(at[0] * MM_PER_MIL, 4), round(at[1] * MM_PER_MIL, 4))
    text = open(path, encoding="utf-8", newline="").read()
    sheet_doc = kicad_sheet.read(path)
    hits = []
    for lab in sheet_doc.root.kids("label"):
        p = lab.kid("at")
        xy = (round(float(p.atoms[0]), 4), round(float(p.atoms[1]), 4)) if p is not None else None
        if xy == want:
            hits.append(lab)
    if len(hits) != 1:
        sys.exit(f"root_tamper.py: {len(hits)} root label(s) at {want}; expected the one stub label of {sheet_name}.{pin}")
    lab = hits[0]
    name = lab.atoms[0]
    block = text[lab.start:lab.end]
    text = text[:lab.start] + block.replace(f'"{name}"', f'"{name}_CUT"', 1) + text[lab.end:]
    open(path, "w", encoding="utf-8", newline="").write(text)
    print(f"root_tamper.py: the root stub label of {sheet_name}.{pin} ({name}) at {want} is now {name}_CUT")
elif mode == "move-sheet":
    path, sheet_name, dy = args[0], args[1], float(args[2])
    refuse_committed(path)
    text = open(path, encoding="utf-8", newline="").read()
    hits = [n for n in kicad_sheet.read(path).root.kids("sheet")
            if any(p.atoms[:2] == ["Sheetname", sheet_name] for p in n.kids("property"))]
    if len(hits) != 1:
        sys.exit(f"root_tamper.py: {len(hits)} sheet(s) named {sheet_name}")
    at = hits[0].kid("at")
    old = text[at.start:at.end]
    new = f"(at {at.atoms[0]} {float(at.atoms[1]) + dy:g})"
    text = text[:at.start] + new + text[at.end:]
    open(path, "w", encoding="utf-8", newline="").write(text)
    print(f"root_tamper.py: sheet {sheet_name} box {old} -> {new}")
else:
    sys.exit(f"root_tamper.py: unknown mode {mode!r}")
