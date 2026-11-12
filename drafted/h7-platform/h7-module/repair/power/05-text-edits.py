"""The power page's direct text edits - what akcli 0.22.0 has no operation for.

1. WIRE STROKE. akcli's add_wire writes `(stroke (width 0) (type default))`. Each wire takes the
   stroke copperhead drew its net in on the draft (`../tools/net_strokes.py`), found through the
   net 02-wire.py drew it for (its sidecar). Refuses a wire the sidecar does not name, and a net the
   draft gives no stroke.
2. FIELDS. Every part's Reference and Value, as literals placed by a rule on layout.py's
   orientation, never copied from the draft: a part standing upright (rotation 0) carries both
   fields beside its body, east of it (justify left) or, where FIELDS_WEST names it, west of it
   (justify right); a part lying east-west (rotation 90) carries them centred above it, Reference
   over Value. Every field ends horizontal, which for a part at rotation 90 means field angle 90
   (TOOLING.md repair class 5: horizontal when symbol rotation + field angle is a multiple of 180).
   U2's two fields sit centred above its body. The two PWR_FLAGs (op-list 03) keep the fields
   akcli wrote: they are one-line instances, counted here so none goes unaccounted for.
3. THE GROUP RECTANGLE AND CAPTION, resized to the content (TOOLING.md repair class 8).

usage: python3 05-text-edits.py <sheet.kicad_sch> <02-wire.nets.json> <net_strokes.json>
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from layout import PARTS  # noqa: E402

if len(sys.argv) != 4:
    raise SystemExit("usage: python3 05-text-edits.py <sheet> <02-wire.nets.json> <net_strokes.json>")
path = pathlib.Path(sys.argv[1])
segs = json.loads(pathlib.Path(sys.argv[2]).read_text())
strokes = json.loads(pathlib.Path(sys.argv[3]).read_text())
src = path.read_text()
MIL = 0.0254


def mm(v):
    return f"{round(v * MIL, 4):g}"


# 1. Wire strokes ---------------------------------------------------------------------------
NEW_STROKE = "(stroke (width 0) (type default))"
want = {}
for x1, y1, x2, y2, net in segs:
    if net not in strokes:
        raise SystemExit(f"05-text-edits: net {net} has no stroke on the draft")
    want[frozenset({(mm(x1), mm(y1)), (mm(x2), mm(y2))})] = strokes[net]
wire_re = re.compile(r'\(wire \(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\) '
                     + re.escape(NEW_STROKE))
done = 0


def restroke(m):
    global done
    key = frozenset({(f"{float(m.group(1)):g}", f"{float(m.group(2)):g}"),
                     (f"{float(m.group(3)):g}", f"{float(m.group(4)):g}")})
    if key not in want:
        raise SystemExit(f"05-text-edits: wire {m.group(0)} is not in the 02 sidecar")
    done += 1
    return m.group(0).replace(NEW_STROKE, want[key])


src = wire_re.sub(restroke, src)
if done != len(segs) or src.count("(wire") != len(segs):
    raise SystemExit(f"05-text-edits: restroked {done} wires, the sidecar has {len(segs)}, "
                     f"the sheet has {src.count('(wire')} '(wire' tokens")
print(f"wire strokes: {done}")

# 2. Fields ---------------------------------------------------------------------------------
# Offsets in mm from the symbol's origin. The bodies: Device:R 1.016 mm either side of its axis,
# Device:C's plates 2.032, Device:C_Polarized's 2.286, Device:L's turns about 1 mm.
BESIDE = {"Device:R": 1.778, "Device:C": 2.794, "Device:C_Polarized": 3.048}
FIELDS_WEST = {"R7", "R8"}   # L2's fields are above the SW row to their west; C32 is east of them
ROW = 1.27                   # Reference and Value sit this far either side of the symbol's centre
# A part lying east-west: (Reference, Value) this far above its axis, beyond the body's half-height.
ABOVE = {"Device:R": (4.445, 2.159), "Device:L": (4.445, 2.159), "Device:C": (5.588, 3.302)}
U2_REF, U2_VALUE = 13.97, 11.43         # above U2's body (its top edge is 10.16 mm above centre)

sym_re = re.compile(r'\n\t\(symbol\n\t\t\(lib_id "([^"]+)"\)\n\t\t\(at ([-\d.]+) ([-\d.]+) (\d+)\)')
blocks = []
for m in sym_re.finditer(src):
    start = m.start() + 1
    depth = 0
    i = start
    while True:
        c = src[i]
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                break
        i += 1
    blocks.append((start, i + 1, m.group(1), float(m.group(2)), float(m.group(3)), int(m.group(4))))
flags = src.count('\n\t(symbol (lib_id "power:PWR_FLAG")')
if flags != 2 or len(blocks) + flags != src.count("(lib_id "):
    raise SystemExit(f"05-text-edits: found {len(blocks)} part instances and {flags} PWR_FLAGs (2 expected); "
                     f"the sheet has {src.count('(lib_id ')} '(lib_id' tokens")

prop_re = re.compile(r'\(property "(Reference|Value)" "([^"]*)" \(at [-\d.]+ [-\d.]+ \d+\)\n'
                     r'(\t+)\(effects \(font \(size 1\.27 1\.27\)\)( \(justify [a-z ]+\))?( hide)?\)')


def plan_for(ref, lib_id, x, y, rot):
    """field -> (x_mm, y_mm, angle, justify or None)."""
    if (round(x / MIL), round(y / MIL), rot) != PARTS[ref]:
        raise SystemExit(f"05-text-edits: {ref} is at {(x, y, rot)}, not layout.py's {PARTS[ref]}")
    if ref == "U2":
        return {"Reference": (x, y - U2_REF, 0, None), "Value": (x, y - U2_VALUE, 0, None)}
    if rot == 90 and lib_id in ABOVE:
        ref_up, value_up = ABOVE[lib_id]
        return {"Reference": (x, y - ref_up, 90, None), "Value": (x, y - value_up, 90, None)}
    if rot != 0 or lib_id not in BESIDE:
        raise SystemExit(f"05-text-edits: no field rule for {ref} ({lib_id}) at rotation {rot}")
    if ref in FIELDS_WEST:
        fx, justify = x - BESIDE[lib_id], "right"
    else:
        fx, justify = x + BESIDE[lib_id], "left"
    return {"Reference": (fx, y - ROW, 0, justify), "Value": (fx, y + ROW, 0, justify)}


def edit_block(text, ref, plan):
    def one(m):
        fx, fy, a, justify = plan[m.group(1)]
        just = f" (justify {justify})" if justify else ""
        return (f'(property "{m.group(1)}" "{m.group(2)}" (at {round(fx, 3):g} {round(fy, 3):g} {a})\n'
                f'{m.group(3)}(effects (font (size 1.27 1.27)){just})')
    new, n = prop_re.subn(one, text)
    if n != 2:
        raise SystemExit(f"05-text-edits: {ref} has {n} Reference/Value fields in the expected form, not 2")
    return new


out = []
last = 0
seen = set()
for start, end, lib_id, x, y, rot in blocks:
    text = src[start:end]
    ref = re.search(r'\(property "Reference" "([^"]+)"', text).group(1)
    if ref not in PARTS:
        raise SystemExit(f"05-text-edits: {ref} is on the sheet and not in layout.py")
    seen.add(ref)
    out.append(src[last:start])
    out.append(edit_block(text, ref, plan_for(ref, lib_id, x, y, rot)))
    last = end
out.append(src[last:])
src = "".join(out)
if seen != set(PARTS):
    raise SystemExit(f"05-text-edits: layout.py places {sorted(set(PARTS) - seen)}, which the sheet lacks")
print(f"fields: {len(seen)} symbols")

# 3. Group rectangle and caption ------------------------------------------------------------
RECT = (13.97, 68.58, 264.16, 130.81)   # the GND row's PWR_FLAG text ends near 127
CAPTION = "3.3 V buck and input network"
rect_re = re.compile(r'\(rectangle \(start [-\d.]+ [-\d.]+\) \(end [-\d.]+ [-\d.]+\)\n'
                     r'\t\t\(stroke \(width 0\.3\) \(type dash\)')
if len(rect_re.findall(src)) != 1:
    raise SystemExit("05-text-edits: expected exactly one group rectangle in copperhead's form")
src = rect_re.sub(f'(rectangle (start {RECT[0]:g} {RECT[1]:g}) (end {RECT[2]:g} {RECT[3]:g})\n'
                  '\t\t(stroke (width 0.3) (type dash)', src)
cap_re = re.compile(r'\(text "' + re.escape(CAPTION) + r'" \(at [-\d.]+ [-\d.]+ 0\)')
if len(cap_re.findall(src)) != 1:
    raise SystemExit("05-text-edits: expected exactly one group caption")
src = cap_re.sub(f'(text "{CAPTION}" (at {RECT[0] + 2:g} {RECT[1] + 2:g} 0)', src)
print(f"group rectangle: {RECT}")

path.write_text(src)
