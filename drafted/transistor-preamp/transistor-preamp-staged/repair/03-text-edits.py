"""The repair's direct text edits - what akcli 0.22.0 has no operation for.

1. WIRE STROKE. akcli's add_wire writes `(stroke (width 0) (type default))`.
   Every wire on this page carries 0.254 mm and its net's colour (or no colour,
   on the nets that had none), read off copperhead's draft. Each new wire takes
   the stroke of the pre-existing wires it meets end to end or at a junction;
   when those disagree, or there are none, this refuses rather than choosing.
2. UNUSED EMBEDDED SYMBOL. Deleting RV1-RV4 leaves `Device:R_Potentiometer_Trim`
   in `lib_symbols` with no instance. KiCad drops an unused cache entry when it
   saves; this removes it the same way. Refuses if any instance still uses it.

usage: python3 03-text-edits.py <sheet.kicad_sch>   (edits in place)
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

NEW_STROKE = "(stroke (width 0) (type default))"
UNUSED = "Device:R_Potentiometer_Trim"

path = pathlib.Path(sys.argv[1])
src = path.read_text()
sheet = kicad_sheet.read(str(path))
wires = sheet.wires()
fresh = [w for w in wires if w.width == 0]
old = [w for w in wires if w.width != 0]
if not fresh:
    raise SystemExit("03-text-edits: no width-0 wire on the sheet - is this the sheet after 01's op-list?")

lines = src.split("\n")


def stroke_text_of(uuid):
    hits = [ln for ln in lines if f'(uuid "{uuid}")' in ln and ln.lstrip().startswith("(wire")]
    if len(hits) != 1:
        raise SystemExit(f"03-text-edits: wire {uuid} is not one one-line (wire ...) form ({len(hits)} found)")
    start = hits[0].index("(stroke ")
    end = hits[0].index(" (uuid ")
    return hits[0][start:end]


# Resolve each fresh wire's stroke from old wires touching it, iterating so a
# fresh wire touching only another fresh wire inherits once that one resolves.
resolved = {}
pending = list(fresh)
while pending:
    progress = False
    for w in list(pending):
        strokes = set()
        for o in old:
            if any(o.contains(x, y) for x, y in ((w.x1, w.y1), (w.x2, w.y2))) or \
                    any(w.contains(x, y) for x, y in ((o.x1, o.y1), (o.x2, o.y2))):
                strokes.add(stroke_text_of(o.uuid))
        for f in fresh:
            if f.uuid in resolved and f.uuid != w.uuid and (
                    any(f.contains(x, y) for x, y in ((w.x1, w.y1), (w.x2, w.y2)))):
                strokes.add(resolved[f.uuid])
        if len(strokes) > 1:
            raise SystemExit(f"03-text-edits: wire {w} meets wires of different strokes {sorted(strokes)}; "
                             "it is on two nets or the page's strokes are inconsistent - not choosing")
        if len(strokes) == 1:
            resolved[w.uuid] = strokes.pop()
            pending.remove(w)
            progress = True
    if not progress:
        raise SystemExit(f"03-text-edits: no stroke to copy for {pending}; no pre-existing wire meets them")

for i, ln in enumerate(lines):
    for uuid, stroke in resolved.items():
        if f'(uuid "{uuid}")' in ln and ln.lstrip().startswith("(wire"):
            if NEW_STROKE not in ln:
                raise SystemExit(f"03-text-edits: wire {uuid} does not carry akcli's stroke text")
            lines[i] = ln.replace(NEW_STROKE, stroke)
            print(f"stroke {uuid}: {stroke}")
src = "\n".join(lines)

# 2. The unused embedded symbol, removed by balanced-paren span.
if f'(lib_id "{UNUSED}")' in src:
    raise SystemExit(f"03-text-edits: an instance still uses {UNUSED}; not removing its library entry")
head = f'(symbol "{UNUSED}"'
at = src.find(head)
if at < 0:
    raise SystemExit(f"03-text-edits: no lib_symbols entry {UNUSED} to remove")
depth = 0
i = at
in_str = False
while True:
    c = src[i]
    if in_str:
        if c == "\\":
            i += 1
        elif c == '"':
            in_str = False
    elif c == '"':
        in_str = True
    elif c == "(":
        depth += 1
    elif c == ")":
        depth -= 1
        if depth == 0:
            break
    i += 1
line_start = src.rfind("\n", 0, at)
src = src[:line_start] + src[i + 1:]
print(f"removed lib_symbols entry {UNUSED}")
path.write_text(src)
