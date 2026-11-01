"""Dump every sheet element whose coordinates fall inside a rectangle.

Read-only reporting aid. It does not compute any placement.

**IT ONLY REPORTS ENDPOINTS FOR A WIRE, AND THAT IS STATED RATHER THAN FIXED.**
A wire that merely PASSES THROUGH the region with both endpoints outside it is
not listed, which `verify.py`'s band occupancy exists to cover and says so. A
segment crossing the region is therefore invisible here; use `verify.py` or
`wires.py` if that matters.

**THREE OF ITS PATTERNS UNDERSTOOD ONLY ONE OF THE TWO TEXTUAL FORMS A SHEET
USES.** Its symbol pattern required `(symbol` followed by a newline and two tabs
before `(lib_id ...)`, so it listed nothing for an instance akcli had written on
ONE line - `#PWR010` on the accepted `pultec-low-boost` page is one, and this
script would have shown an empty region where a ground symbol sits. Its
global-label pattern required a `(shape ...)` member, and its local-label
pattern a newline and a tab. All of them now come from
`docs/research/lib/kicad_sheet.py`, which parses by balanced parentheses.

usage: dump_region.py <sheet.kicad_sch> x0 y0 x1 y1
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

sheet = kicad_sheet.read(sys.argv[1])
x0, y0, x1, y1 = (float(v) for v in sys.argv[2:6])


def inside(x, y):
    return x0 <= x <= x1 and y0 <= y <= y1


print("--- wires (ENDPOINTS inside the region only; a segment crossing it is "
      "not listed) ---")
for w in sheet.wires():
    if inside(w.x1, w.y1) or inside(w.x2, w.y2):
        print(f"  ({w.x1}, {w.y1}) -> ({w.x2}, {w.y2})  colour {w.colour or '-'}"
              f"  {w.uuid}")

print("--- junctions ---")
for jx, jy, uuid in sheet.junctions():
    if inside(jx, jy):
        print(f"  ({jx}, {jy})  {uuid}")

print("--- symbols ---")
for s in sheet.symbols():
    if not inside(s.x, s.y):
        continue
    mir = s.node.kid("mirror")
    print(f"  {s.ref}  {s.lib_id}  at ({s.x}, {s.y}) rot {s.rot} "
          f"mirror {mir.atoms[0] if mir and mir.atoms else '-'}")
    for f in s.fields:
        if f.name not in ("Reference", "Value") or f.x is None:
            continue
        hid = " (hidden)" if f.hidden else ""
        print(f"      {f.name} {f.text!r} text at ({f.x}, {f.y}) "
              f"angle {f.angle} size {f.size}{hid}")

print("--- global labels ---")
for kind, text, lx, ly, angle, shape, _ in sheet.labels():
    if kind == "global_label" and inside(lx, ly):
        print(f"  {text!r} {shape or '-'} at ({lx}, {ly}) rot {angle}")

print("--- local labels ---")
for kind, text, lx, ly, angle, shape, _ in sheet.labels():
    if kind == "label" and inside(lx, ly):
        print(f"  {text!r} at ({lx}, {ly}) rot {angle}")

print("--- hierarchical labels ---")
for kind, text, lx, ly, angle, shape, _ in sheet.labels():
    if kind == "hierarchical_label" and inside(lx, ly):
        print(f"  {text!r} {shape or '-'} at ({lx}, {ly}) rot {angle}")

print("--- no_connect ---")
for nx, ny, uuid in sheet.no_connects():
    if inside(nx, ny):
        print(f"  ({nx}, {ny})  {uuid}")

print("--- sheet text ---")
for text, tx, ty, angle in sheet.texts():
    if inside(tx, ty):
        print(f"  {text!r} at ({tx}, {ty}) rot {angle}")
