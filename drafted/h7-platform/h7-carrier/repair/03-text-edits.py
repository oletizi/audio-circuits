"""The repair's direct text edits - what akcli 0.22.0 has no operation for.

1. WIRE STROKE. akcli's add_wire writes `(stroke (width 0) (type default))`. Each wire takes the
   stroke copperhead drew its net in on the draft (`net_strokes.py`), found through the net
   02-wire.py drew it for (its sidecar). Refuses a wire the sidecar does not name, and a net the
   draft gives no stroke.
2. FIELDS. Every placed part's Reference and Value, and every power symbol's Value, restated as
   literals: position, angle (horizontal when symbol rotation + field angle is a multiple of 180,
   TOOLING.md repair class 5) and centred justification. A Value that is only the KiCad symbol's
   own name (TestPoint, Conn_01x02, Conn_01x20, USB_C_Receptacle_USB2.0_16P) is hidden.
3. THE GROUP RECTANGLE AND CAPTION, resized to the content (TOOLING.md repair class 8).

usage: python3 03-text-edits.py <sheet.kicad_sch> <02-wire.nets.json> <net_strokes.json>
"""
import json
import pathlib
import re
import sys

if len(sys.argv) != 4:
    raise SystemExit("usage: python3 03-text-edits.py <sheet> <02-wire.nets.json> <net_strokes.json>")
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
        raise SystemExit(f"03-text-edits: net {net} has no stroke on the draft")
    key = frozenset({(mm(x1), mm(y1)), (mm(x2), mm(y2))})
    want[key] = strokes[net]
wire_re = re.compile(r'\(wire \(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\) '
                     + re.escape(NEW_STROKE))
done = 0


def restroke(m):
    global done
    key = frozenset({(f"{float(m.group(1)):g}", f"{float(m.group(2)):g}"),
                     (f"{float(m.group(3)):g}", f"{float(m.group(4)):g}")})
    if key not in want:
        raise SystemExit(f"03-text-edits: wire {m.group(0)} is not in the 02 sidecar")
    done += 1
    return m.group(0).replace(NEW_STROKE, want[key])


src = wire_re.sub(restroke, src)
if done != len(segs) or src.count("(wire") != len(segs):
    raise SystemExit(f"03-text-edits: restroked {done} wires, the sidecar has {len(segs)}, "
                     f"the sheet has {src.count('(wire')} '(wire' tokens")
print(f"wire strokes: {done}")

# 2. Fields ---------------------------------------------------------------------------------
# ref -> {field: (x_mm, y_mm, angle) or "hide"}; absolute sheet positions, text centred.
FIELDS = {
    "J1": {"Reference": (142.24, 111.12, 0), "Value": (142.24, 165.74, 0)},
    "J2": {"Reference": (142.24, 27.3, 0), "Value": (142.24, 25.15, 0)},
    "J3": {"Reference": (248.92, 111.12, 0), "Value": "hide"},
    "J4": {"Reference": (248.92, 27.3, 0), "Value": "hide"},
    "J5": {"Reference": (20.32, 37.6, 0), "Value": "hide"},
    "J7": {"Reference": (60.96, 37.6, 0), "Value": "hide"},
    "J8": {"Reference": (86.36, 37.6, 0), "Value": "hide"},
    "J6": {"Reference": (33.02, 66.8, 0), "Value": "hide"},
    "F1": {"Reference": (33.02, 38.35, 90), "Value": (33.02, 36.3, 90)},
    "TP1": {"Reference": (41.91, 35.0, 0), "Value": "hide"},
    "TP2": {"Reference": (71.12, 35.0, 0), "Value": "hide"},
    "TP3": {"Reference": (96.52, 35.0, 0), "Value": "hide"},
    "TP4": {"Reference": (111.76, 35.0, 0), "Value": "hide"},
    "TP5": {"Reference": (195.58, 89.9, 0), "Value": "hide"},
    "TP6": {"Reference": (203.2, 89.9, 0), "Value": "hide"},
    "TP7": {"Reference": (210.82, 89.9, 0), "Value": "hide"},
    "TP8": {"Reference": (218.44, 89.9, 0), "Value": "hide"},
    "R7": {"Reference": (72.3, 45.72, 0), "Value": (73.4, 48.26, 0)},
    "R8": {"Reference": (97.7, 45.72, 0), "Value": (98.8, 48.26, 0)},
    "R5": {"Reference": (59.76, 81.28, 0), "Value": (58.66, 83.82, 0)},
    "R4": {"Reference": (74.8, 78.74, 0), "Value": (75.9, 81.28, 0)},
    "C3": {"Reference": (100.2, 73.66, 0), "Value": (101.3, 76.2, 0)},
    "C1": {"Reference": (115.4, 81.28, 0), "Value": (116.5, 83.82, 0)},
    "U2": {"Reference": (95.5, 100.3, 0), "Value": (101.5, 102.9, 0)},
    "U1": {"Reference": (126.0, 87.4, 0), "Value": (132.2, 89.7, 0)},
    "R1": {"Reference": (191.6, 99.06, 0), "Value": (192.2, 101.6, 0)},
    "R6": {"Reference": (21.5, 114.3, 0), "Value": (21.5, 116.84, 0)},
    "C2": {"Reference": (29.1, 114.3, 0), "Value": (31.8, 116.84, 0)},
    "R2": {"Reference": (234.95, 86.6, 90), "Value": (234.95, 88.9, 90)},
    "R3": {"Reference": (227.4, 86.36, 0), "Value": (226.3, 88.9, 0)},
}
# Power symbols: the Value is the rail's name. Offsets by orientation, in mm from the pin.
POWER_OFFSET = {
    ("up", 0): (0.0, -3.556, 0),
    ("down", 0): (0.0, 3.556, 0),
    ("up", 270): (6.4, 0.0, 90),     # pointing east: name east of the arrow
    ("up", 90): (-6.4, 0.0, 90),     # pointing west: name west of the arrow
}
NAME_EXTRA = {"VIN_MOD": 1.1}         # a longer name sits further from the arrow

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
if len(blocks) != src.count("(lib_id "):
    raise SystemExit(f"03-text-edits: found {len(blocks)} symbol instances, the sheet has "
                     f"{src.count('(lib_id ')} '(lib_id' tokens")

prop_re = re.compile(r'\(property "(Reference|Value)" "([^"]*)" \(at [-\d.]+ [-\d.]+ \d+\)\n'
                     r'(\t+)\(effects \(font \(size 1\.27 1\.27\)\)( \(justify [a-z ]+\))?( hide)?\)')


def edit_block(text, ref, plan):
    def one(m):
        field = m.group(1)
        if field not in plan:
            return m.group(0)
        spec = plan[field]
        if spec == "hide":
            pos = re.search(r'\(at [-\d.]+ [-\d.]+ \d+\)', m.group(0)).group(0)
            return (f'(property "{field}" "{m.group(2)}" {pos}\n'
                    f'{m.group(3)}(effects (font (size 1.27 1.27)) hide)')
        x, y, a = spec
        return (f'(property "{field}" "{m.group(2)}" (at {x:g} {y:g} {a})\n'
                f'{m.group(3)}(effects (font (size 1.27 1.27)))')
    new, n = prop_re.subn(one, text)
    if n != 2:
        raise SystemExit(f"03-text-edits: {ref} has {n} Reference/Value fields in the expected form, not 2")
    return new


out = []
last = 0
seen = set()
for start, end, lib_id, x, y, rot in blocks:
    text = src[start:end]
    ref = re.search(r'\(property "Reference" "([^"]+)"', text).group(1)
    if ref.startswith("#FLG"):
        continue
    if ref.startswith("#PWR"):
        net = re.search(r'\(property "Value" "([^"]+)"', text).group(1)
        kind = "down" if net == "GND" else "up"
        if (kind, rot) not in POWER_OFFSET:
            raise SystemExit(f"03-text-edits: {ref} ({net}) at rotation {rot} has no field rule")
        dx, dy, a = POWER_OFFSET[(kind, rot)]
        extra = NAME_EXTRA.get(net, 0.0)
        dx += extra if dx > 0 else -extra if dx < 0 else 0.0
        plan = {"Value": (round(x + dx, 3), round(y + dy, 3), a)}
    else:
        if ref not in FIELDS:
            raise SystemExit(f"03-text-edits: no field placement for {ref}")
        plan = FIELDS[ref]
    seen.add(ref)
    out.append(src[last:start])
    out.append(edit_block(text, ref, plan))
    last = end
out.append(src[last:])
src = "".join(out)
unused = set(FIELDS) - seen
if unused:
    raise SystemExit(f"03-text-edits: FIELDS names parts not on the sheet: {sorted(unused)}")
print(f"fields: {len(seen)} symbols")

# 3. Group rectangle and caption ------------------------------------------------------------
RECT = (13.97, 15.24, 254.0, 168.91)
rect_re = re.compile(r'\(rectangle \(start [-\d.]+ [-\d.]+\) \(end [-\d.]+ [-\d.]+\)\n'
                     r'\t\t\(stroke \(width 0\.3\) \(type dash\)')
if len(rect_re.findall(src)) != 1:
    raise SystemExit("03-text-edits: expected exactly one group rectangle in copperhead's form")
src = rect_re.sub(f'(rectangle (start {RECT[0]:g} {RECT[1]:g}) (end {RECT[2]:g} {RECT[3]:g})\n'
                  '\t\t(stroke (width 0.3) (type dash)', src)
cap_re = re.compile(r'\(text "H7 bring-up carrier" \(at [-\d.]+ [-\d.]+ 0\)')
if len(cap_re.findall(src)) != 1:
    raise SystemExit("03-text-edits: expected exactly one group caption")
src = cap_re.sub(f'(text "H7 bring-up carrier" (at {RECT[0] + 2:g} {RECT[1] + 2:g} 0)', src)
print(f"group rectangle: {RECT}")

path.write_text(src)
