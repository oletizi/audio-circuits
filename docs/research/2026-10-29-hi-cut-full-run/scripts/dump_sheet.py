"""Every wire, junction, label and no-connect on a sheet, with its uuid.

Read-only. The uuids are what akcli deletes by, so this is the input to the
op-list rather than a check.

**IT PARSED BY BLOCK, AND IT COULD NOT READ A SHEET akcli HAD WRITTEN.** That is
two corrections in one, a day apart.

The FIRST version matched `(wire (pts ...) (stroke (width W) ...))` with a single
pattern and SILENTLY DROPPED every wire carrying a `(color ...)` inside its
stroke - 23 of the 77 wires on `pultec-hi-cut`, including all six of J2's ground
stubs, which are exactly the wires a ground repair has to find. It printed 54
wires and said nothing about the 23. That was fixed by parsing the pretty-printed
BLOCK form and counting `(wire` tokens first.

The SECOND version therefore understood only ONE of the two forms a sheet uses.
copperhead writes the block form and akcli writes wires on one line, so on the
finished mid page - 18 block-form against 64 one-line - it exited with *"parsed
18 wire blocks but the file holds 82 '(wire' tokens"*. **That refusal was correct
and is why nothing downstream believed 18**, but it made this a BEFORE-SIDE-ONLY
tool and nothing said so, and the whole point of the script is to hand uuids to
a repair pass that runs on the after side.

It now reads both forms, because it parses by balanced parentheses rather than by
indentation: `docs/research/lib/kicad_sheet.py`. The token-count refusal is kept
and is now enforced on wires, junctions, labels and no-connects alike - a parse
that drops input must refuse, not print a short list.

usage: dump_sheet.py <sheet.kicad_sch> [x1 y1 x2 y2]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402


def main():
    sheet = kicad_sheet.read(sys.argv[1])
    box = [float(v) for v in sys.argv[2:6]] if len(sys.argv) > 5 else None

    def inside(*pts):
        if box is None:
            return True
        x1, y1, x2, y2 = box
        return all(x1 <= x <= x2 and y1 <= y <= y2 for x, y in pts)

    wires = sheet.wires()
    one_line = sum(1 for w in wires
                   if sheet.src.count(f"(wire (pts (xy {w.x1:g} {w.y1:g})"))
    print(f"=== wires ({len(wires)} parsed, every '(wire' token accounted for)")
    print(f"    {one_line} written on one line, {len(wires) - one_line} in block "
          f"form - this script reads both")
    for w in wires:
        if not inside((w.x1, w.y1), (w.x2, w.y2)):
            continue
        print(f"  ({w.x1}, {w.y1}) -> ({w.x2}, {w.y2})  "
              f"len {abs(w.x1 - w.x2) + abs(w.y1 - w.y2):7.2f}  "
              f"width {w.width if w.width is not None else '?'}  "
              f"colour {w.colour or '-':14}  {w.uuid}")

    print(f"=== junctions ({len(sheet.junctions())} parsed)")
    for x, y, uuid in sheet.junctions():
        if not inside((x, y)):
            continue
        print(f"  ({x}, {y})  {uuid}")

    labels = sheet.labels()
    print(f"=== labels ({len(labels)} parsed)")
    for kind, text, x, y, angle, shape, node in labels:
        if not inside((x, y)):
            continue
        eff = node.kid("effects")
        colour = thick = None
        if eff is not None:
            fnt = eff.kid("font")
            if fnt is not None:
                cn = fnt.kid("color")
                if cn is not None:
                    colour = " ".join(cn.atoms)
                tn = fnt.kid("thickness")
                if tn is not None:
                    thick = tn.atoms[0]
        un = node.kid("uuid")
        print(f"  {kind:18} {text:16} at ({x}, {y}) rot {angle} "
              f"shape {shape or '-':8} colour {colour or '-':14} "
              f"thickness {thick or '-':6} "
              f"{un.atoms[0] if un and un.atoms else '-'}")

    print(f"=== no_connect ({len(sheet.no_connects())} parsed)")
    for x, y, uuid in sheet.no_connects():
        if not inside((x, y)):
            continue
        print(f"  ({x}, {y})  {uuid}")


main()
