"""List every wire segment on a sheet, optionally restricted to a rectangle,
with its stroke colour and uuid.

The parse is `docs/research/lib/kicad_sheet.py`, which reads both the block form
copperhead writes and the one-line form akcli writes, and refuses when its parse
does not account for every `(wire` token in the source. The pattern this script
used to carry ran from the `(pts` past the stroke to the `(uuid`, which is one
character away from the shape that silently dropped 23 of `pultec-hi-cut`'s 77
wires - every grey ground wire, including all six of J2's stubs - by stopping at
a `(color ...)` member it did not expect.

usage: wires.py <sheet.kicad_sch> [x1 y1 x2 y2]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

sheet = kicad_sheet.read(sys.argv[1])
box = [float(v) for v in sys.argv[2:6]] if len(sys.argv) > 5 else None

rows = []
for w in sheet.wires():
    if box:
        if not (min(box[0], box[2]) <= min(w.x1, w.x2)
                and max(w.x1, w.x2) <= max(box[0], box[2])
                and min(box[1], box[3]) <= min(w.y1, w.y2)
                and max(w.y1, w.y2) <= max(box[1], box[3])):
            continue
    kind = "H" if w.horizontal else ("V" if w.vertical else "DIAG")
    rows.append((kind, w.x1, w.y1, w.x2, w.y2,
                 abs(w.x2 - w.x1) + abs(w.y2 - w.y1),
                 w.colour or "-", w.uuid))

rows.sort(key=lambda r: (r[2], r[1]))
print(f"{len(rows)} wire(s)" + (f" fully inside {box}" if box else "")
      + f"   of {len(sheet.wires())} on the sheet, all accounted for")
for kind, x1, y1, x2, y2, ln, col, uuid in rows:
    print(f"  {kind:4} ({x1:7.2f},{y1:7.2f}) -> ({x2:7.2f},{y2:7.2f})  "
          f"{ln:6.2f} mm  colour {col:14} {uuid}")
