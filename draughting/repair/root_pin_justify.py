"""Justify an akcli-assembled ROOT's sheet pin names into their sheet boxes, as KiCad itself writes
such pins: west-edge pins `(justify left)`, east-edge pins `(justify right)`. (Ruling
CR-MODULE-ROOT-FITS-LETTER, Task 7e fix round 1.) Written for the h7-module root and moved here from
its repair directory (H7 module plan, final review M5): nothing in it is board-specific, and it is
the repair step every akcli root needs (TOOLING.md, C3).

Why. To fit US Letter, `tools/draught/root-arrangement.ts` puts half of mcu's 90 sheet pins on the
EAST edge of its sheet box. akcli 0.22.0 writes every sheet pin's effects with no justify
(`akcli/writers/handlers/sheets.py`, `_effects()`), and has no op that sets one. With no justify,
kicad-cli 10.0.5 draws a sheet pin's name CENTRED about 1.45 mm inside the edge, so a long name runs
across the edge and over its stub. Measured on the first render: east-edge "SDRAM_A5"'s ink ran from
x 83.28 to 92.36 mm against the edge at 86.36, into its own stub label at 91.78; west-edge
"USB_VBUS_SENSE"'s ran 6.6 mm west of interface's edge at 191.77, into its label. KiCad's own
files write an east-edge sheet pin as `(at x y 0)` with `(justify right)` in its effects, and a
west-edge one as `(at x y 180)` with `(justify left)`: 330 east-edge and 480 west-edge pins in
KiCad's demo projects, read from the files.

What it does. It adds `(justify left)` to the effects of every sheet pin at angle 180 (the west
edge) and `(justify right)` to every one at angle 0 (the east edge). Pins are found through
`draughting/measure/kicad_sheet.py`'s parser, never by a line pattern.

Refuses:
- a west- or east-edge pin count other than the one the root op-list declares (`side` in
  01-assemble.json);
- a pin at angle 180 or 0 that does not sit on its sheet's west or east edge, and a pin at any
  other angle (the root op-list writes none);
- a sheet that already carries a justify on any sheet pin (run it once, on the sheet akcli wrote).

usage: python3 root_pin_justify.py <root.kicad_sch> <01-assemble.json>
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

if len(sys.argv) != 3:
    sys.exit(f"root_pin_justify.py: expected the root sheet and its 01-assemble.json; got {len(sys.argv) - 1} argument(s)")
path, assemble = sys.argv[1], sys.argv[2]
pins = [p for op in json.load(open(assemble))["ops"] if op["op"] == "add_sheet" for p in op["pins"]]
declared = {side: sum(1 for p in pins if p["side"] == side) for side in ("left", "right")}
text = open(path, encoding="utf-8", newline="").read()
OLD = "(effects (font (size 1.27 1.27)))"
# angle -> (the side it means, the justify KiCad writes for it)
SIDES = {0.0: ("right", "right"), 180.0: ("left", "left")}
edits = []
found = {"left": 0, "right": 0}
for sheet in kicad_sheet.read(path).root.kids("sheet"):
    at, size = sheet.kid("at"), sheet.kid("size")
    west = float(at.atoms[0])
    edge_x = {"left": west, "right": west + float(size.atoms[0])}
    for pin in sheet.kids("pin"):
        name = pin.atoms[0]
        block = text[pin.start:pin.end]
        if "justify" in block:
            sys.exit(f"root_pin_justify.py: sheet pin {name} already carries a justify; run this once, on the sheet akcli wrote")
        pat = pin.kid("at")
        angle = float(pat.atoms[2])
        if angle not in SIDES:
            sys.exit(f"root_pin_justify.py: sheet pin {name} is at angle {pat.atoms[2]}; the root op-list writes only west (180) and east (0) pins")
        side, justify = SIDES[angle]
        if abs(float(pat.atoms[0]) - edge_x[side]) > 1e-6:
            sys.exit(f"root_pin_justify.py: sheet pin {name} is at angle {pat.atoms[2]} but at x {pat.atoms[0]}, not on its sheet's {side} edge {edge_x[side]}")
        if block.count(OLD) != 1:
            sys.exit(f"root_pin_justify.py: sheet pin {name}'s effects are not akcli's {OLD}")
        found[side] += 1
        edits.append((pin.start, pin.end, block.replace(OLD, f"(effects (font (size 1.27 1.27)) (justify {justify}))")))
if found != declared:
    sys.exit(f"root_pin_justify.py: {path} has west and east sheet pins {found}; {assemble} declares {declared}")
for start, end, new in sorted(edits, reverse=True):
    text = text[:start] + new + text[end:]
open(path, "w", encoding="utf-8", newline="").write(text)
print(f"root_pin_justify.py: {found['left']} west-edge sheet pin(s) justified left, {found['right']} east-edge justified right")
