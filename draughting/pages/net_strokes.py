"""Read copperhead's per-net wire stroke off the DRAFT, so the repaired page keeps its colours.

For every net akcli names on the draft, collects the stroke text of every draft wire with an end
on one of that net's pins, and of every wire joined to those through shared ends. Refuses when one
net carries two strokes, or when a net with wires gets none.

usage: python3 net_strokes.py <draft.kicad_sch>  -> JSON {net: stroke_text} on stdout
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
src = pathlib.Path(path).read_text()
sheet = kicad_sheet.read(path)
nets = json.loads(subprocess.run([str(AKCLI), "nets", path, "--json"], check=True,
                                 capture_output=True, text=True).stdout)["nets"]
pin_at = {}
for x, y, ref in sheet.pin_points_by_ref():
    pin_at.setdefault((x, y), set()).add(ref)
lib = sheet.lib_pins()
member_points = {}
for s in sheet.symbols():
    for lp in lib[s.lib_id]:
        dx, dy = kicad_sheet.rotate(lp.sx, -lp.sy, s.rot)
        member_points[f"{s.ref}.{lp.number}"] = (round(s.x + dx, 3), round(s.y + dy, 3))

wires = sheet.wires()


def stroke_of(w):
    node = next(n for n in sheet.root.walk("wire") if n.kid("uuid").atoms[0] == w.uuid)
    st = node.kid("stroke")
    return " ".join(src[st.start:st.end].split())


out = {}
for net in nets:
    seeds = {member_points[m] for m in net["members"] if m in member_points}
    reached = [w for w in wires if any(w.ends_at(x, y) for x, y in seeds)]
    frontier = list(reached)
    while frontier:
        w = frontier.pop()
        for o in wires:
            if o in reached:
                continue
            if any(o.contains(x, y) for x, y in ((w.x1, w.y1), (w.x2, w.y2))) or \
                    any(w.contains(x, y) for x, y in ((o.x1, o.y1), (o.x2, o.y2))):
                reached.append(o)
                frontier.append(o)
    strokes = {stroke_of(w) for w in reached}
    if len(strokes) > 1:
        raise SystemExit(f"net_strokes: net {net['name']} carries {sorted(strokes)} on the draft - not choosing")
    if strokes:
        out[net["name"]] = strokes.pop()
print(json.dumps(out, indent=1, sort_keys=True))
