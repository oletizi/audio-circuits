"""Dump the geometry a stage-1 repair needs: the named parts' pin points (sheet
mm, from `akcli component --json`, cross-checked against kicad_sheet's own
lib_symbols reading), and every wire and junction inside a box around stage 1,
with uuids.

usage: python3 geometry.py <sheet.kicad_sch> REF [REF ...]
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

AKCLI = str(ROOT / "draughting" / "venv-akcli" / "bin" / "akcli")
MIL = 0.0254

path = sys.argv[1]
sheet = kicad_sheet.read(path)
sheet_points = set(sheet.pin_points())
for ref in sys.argv[2:]:
    out = subprocess.run([AKCLI, "--json", "component", path, ref], check=True,
                         capture_output=True, text=True).stdout
    c = json.loads(out)
    print(f"{ref} {c['library_ref']} at ({c['x_mil'] * MIL:.2f}, {c['y_mil'] * MIL:.2f}) "
          f"rot {c['rotation']} mirror {c['mirror']} value {c['value']}")
    for p in c["pins"]:
        x, y = round(p["x_mil"] * MIL, 2), round(p["y_mil"] * MIL, 2)
        on_sheet = any(abs(x - sx) < 0.02 and abs(y - sy) < 0.02 for sx, sy in sheet_points)
        print(f"   pin {p['number']} ({x}, {y}) {'agrees with lib_symbols' if on_sheet else 'NOT A SHEET PIN POINT'}")

X0, X1, Y0, Y1 = 55.0, 115.0, 40.0, 140.0
print("wires touching the stage-1 box", (X0, X1, Y0, Y1))
for w in sheet.wires():
    if any(X0 <= x <= X1 and Y0 <= y <= Y1 for x, y in ((w.x1, w.y1), (w.x2, w.y2))):
        print("  ", w)
print("junctions in the box")
for j in sheet.junctions():
    if X0 <= j[0] <= X1 and Y0 <= j[1] <= Y1:
        print("  ", j)
