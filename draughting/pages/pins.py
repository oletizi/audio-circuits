"""Query every placed pin's sheet position (mils) from akcli, after op-list 01 is applied.

Each pin point akcli reports is cross-checked against the sheet's own `lib_symbols` reading
(`draughting/measure/kicad_sheet.py`, which handles rotation but not mirror, so the check covers
the unmirrored parts and the mirrored ones are checked by their x being the reflection). Refuses
on any disagreement rather than choosing one.

usage: python3 pins.py <sheet.kicad_sch>   -> JSON {ref: {pin_number: [x_mil, y_mil]}} on stdout
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
AKCLI = ROOT / "draughting" / "venv-akcli" / "bin" / "akcli"
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

path = sys.argv[1]
sheet = kicad_sheet.read(path)
lib = sheet.lib_pins()
out = {}
MM = 0.0254
for s in sheet.symbols():
    raw = subprocess.run([str(AKCLI), "component", path, s.ref, "--json"], check=True,
                         capture_output=True, text=True).stdout
    comp = json.loads(raw)
    mirror = comp["mirror"]
    pins = {}
    for p in comp["pins"]:
        pins[p["number"]] = [round(p["x_mil"]), round(p["y_mil"])]
    # Cross-check against the sheet's own library reading.
    for lp in lib[s.lib_id]:
        dx, dy = kicad_sheet.rotate(lp.sx, -lp.sy, s.rot)
        if mirror == "y":
            dx = -dx
        elif mirror == "x":
            dy = -dy
        x, y = round((s.x + dx) / MM), round((s.y + dy) / MM)
        got = pins.get(lp.number)
        if got is None or abs(got[0] - x) > 1 or abs(got[1] - y) > 1:
            raise SystemExit(f"pins.py: {s.ref} pin {lp.number}: akcli says {got}, lib_symbols says {[x, y]}")
    out[s.ref] = pins
print(json.dumps(out, indent=1, sort_keys=True))
