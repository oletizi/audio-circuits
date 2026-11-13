"""One block page's direct text edits - what akcli 0.22.0 has no operation for. Driven by layout.py.

1. WIRE STROKE. akcli's add_wire writes `(stroke (width 0) (type default))`. Each wire takes the
   stroke copperhead drew its net in on the draft (`net_strokes.py`), found through the net
   02-wire.py drew it for (its sidecar). A net the draft drew no wire for (a port reaching one pin,
   which copperhead cannot draft) takes the stroke layout.UNDRAWN_STROKES names for it, with that
   file's reason. Refuses a wire the sidecar does not name and a net with neither.
2. FIELDS. Every part's Reference and Value as literals from layout.FIELDS (offsets in mm from the
   symbol's origin, and a justification), never copied from the draft. Every field ends horizontal:
   field angle = symbol rotation mod 180 (TOOLING.md repair class 5: a field renders horizontal when
   symbol rotation + field angle is a multiple of 180). A hidden field stays hidden.
3. THE GROUP RECTANGLE AND ITS CAPTION, to layout.RECT (TOOLING.md repair class 8); the caption's
   text is copperhead's, only its place moves.
4. NOTES (layout.NOTES, added by 02-wire.py through `page.Wiring.note`): each akcli text note is
   made left-justified; their count must be layout.NOTES's (none on a page that declares none).

Refuses a part not at layout.PARTS's place, a symbol count that does not add up (parts plus
layout.PWR_FLAGS one-line PWR_FLAG instances), and a field not in the expected form.

usage: python3 text_edits.py <block-dir> <sheet.kicad_sch> <02-wire.nets.json> <net_strokes.json>
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import page  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 text_edits.py <block-dir> <sheet> <02-wire.nets.json> <net_strokes.json>")
layout = page.load_layout(sys.argv[1])
path = pathlib.Path(sys.argv[2])
segs = json.loads(pathlib.Path(sys.argv[3]).read_text())
strokes = dict(json.loads(pathlib.Path(sys.argv[4]).read_text()))
undrawn = getattr(layout, "UNDRAWN_STROKES", {})
for net, stroke in undrawn.items():
    if net in strokes:
        raise SystemExit(f"text_edits: layout.UNDRAWN_STROKES names {net}, which the draft does draw")
    strokes[net] = stroke
src = path.read_text()
MIL = 0.0254


def mm(v):
    return f"{round(v * MIL, 4):g}"


# 1. Wire strokes ---------------------------------------------------------------------------
NEW_STROKE = "(stroke (width 0) (type default))"
want = {}
for x1, y1, x2, y2, net in segs:
    if net not in strokes:
        raise SystemExit(f"text_edits: net {net} has no stroke on the draft and none in layout.UNDRAWN_STROKES")
    want[frozenset({(mm(x1), mm(y1)), (mm(x2), mm(y2))})] = strokes[net]
wire_re = re.compile(r'\(wire \(pts \(xy ([-\d.]+) ([-\d.]+)\) \(xy ([-\d.]+) ([-\d.]+)\)\) '
                     + re.escape(NEW_STROKE))
done = 0


def restroke(m):
    global done
    key = frozenset({(f"{float(m.group(1)):g}", f"{float(m.group(2)):g}"),
                     (f"{float(m.group(3)):g}", f"{float(m.group(4)):g}")})
    if key not in want:
        raise SystemExit(f"text_edits: wire {m.group(0)} is not in the 02 sidecar")
    done += 1
    return m.group(0).replace(NEW_STROKE, want[key])


src = wire_re.sub(restroke, src)
if done != len(segs) or src.count("(wire") != len(segs):
    raise SystemExit(f"text_edits: restroked {done} wires, the sidecar has {len(segs)}, "
                     f"the sheet has {src.count('(wire')} '(wire' tokens")
print(f"wire strokes: {done}")

# 2. Fields ---------------------------------------------------------------------------------
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
if flags != layout.PWR_FLAGS or len(blocks) + flags != src.count("(lib_id "):
    raise SystemExit(f"text_edits: found {len(blocks)} part instances and {flags} PWR_FLAGs "
                     f"({layout.PWR_FLAGS} expected); the sheet has {src.count('(lib_id ')} '(lib_id' tokens")

prop_re = re.compile(r'\(property "(Reference|Value)" "([^"]*)" \(at [-\d.]+ [-\d.]+ \d+\)\n'
                     r'(\t+)\(effects \(font \(size 1\.27 1\.27\)\)( \(justify [a-z ]+\))?( hide)?\)')


mirror_re = re.compile(r'\n\t\t\(at [-\d.]+ [-\d.]+ \d+\)(?: \(mirror ([xy])\))?\n')


def mirror_of(text, ref):
    """The instance's mirror as layout.PARTS spells it: "none", "x" or "y"."""
    m = mirror_re.search(text)
    if m is None:
        raise SystemExit(f"text_edits: {ref}'s placement line is not in the expected form")
    return m.group(1) or "none"


def plan_for(ref, x, y, rot, mirror):
    """field -> (x_mm, y_mm, angle, justify or None)."""
    px, py, prot, pmirror = layout.PARTS[ref]
    if (round(x / MIL), round(y / MIL), rot, mirror) != (px, py, prot, pmirror):
        raise SystemExit(f"text_edits: {ref} is at {(x, y, rot, mirror)}, not layout.py's {layout.PARTS[ref]}")
    if ref not in layout.FIELDS:
        raise SystemExit(f"text_edits: layout.FIELDS has no placement for {ref}")
    angle = rot % 180
    # KiCad applies a field's justification in the symbol's frame: on a part at rotation 90 or 180 a
    # field written "right" renders left-justified on the page, and the reverse (seen on the
    # reset_boot page's SW2, rotation 90). A part mirrored left to right, `(mirror y)`, swaps it once
    # more (seen on the h7 pedal's usb U15, rotation 0, and midi_i2c J8, rotation 270: a field written
    # "left" rendered right-justified; Task 9a). FIELDS says how a field should READ, so swap it here.
    # A part mirrored top to bottom at rotation 0 or 180 keeps it (midi_i2c's Q9 and fsw_led's Q8,
    # rotation 0, read as written). At rotation 90 or 270 a top-to-bottom mirror acts on the page's
    # horizontal, which no page here has measured, so a justified field there is refused.
    justified = any(just for _, _, just in layout.FIELDS[ref].values())
    if mirror == "x" and rot in (90, 270) and justified:
        raise SystemExit(f"text_edits: {ref} is mirrored top to bottom at rotation {rot}, and how KiCad then "
                         "justifies a field has not been measured; centre its fields (justify None), or "
                         "measure a render and extend this rule")
    swap = (rot in (90, 180)) != (mirror == "y")
    flip = {"left": "right", "right": "left"} if swap else {}
    return {f: (x + dx, y + dy, angle, flip.get(just, just)) for f, (dx, dy, just) in layout.FIELDS[ref].items()}


def edit_block(text, ref, plan):
    def one(m):
        fx, fy, a, justify = plan[m.group(1)]
        just = f" (justify {justify})" if justify else ""
        hide = m.group(5) or ""
        return (f'(property "{m.group(1)}" "{m.group(2)}" (at {round(fx, 3):g} {round(fy, 3):g} {a})\n'
                f'{m.group(3)}(effects (font (size 1.27 1.27)){just}{hide})')
    new, n = prop_re.subn(one, text)
    if n != 2:
        raise SystemExit(f"text_edits: {ref} has {n} Reference/Value fields in the expected form, not 2")
    return new


out = []
last = 0
seen = set()
ref_re = re.compile(r'\(property "Reference" "([^"]+)"')
unit_re = re.compile(r'\n\t\t\(unit (\d+)\)')
units_of = {}
for start, end, _, _, _, _ in blocks:
    r = ref_re.search(src[start:end]).group(1)
    units_of[r] = units_of.get(r, 0) + 1
for start, end, lib_id, x, y, rot in blocks:
    text = src[start:end]
    # A multi-unit part's instances are keyed <ref>:<unit> in layout.py (`page.instance_key`).
    reference = ref_re.search(text).group(1)
    unit = unit_re.search(text)
    ref = page.instance_key(reference, int(unit.group(1)) if unit else 1, units_of[reference])
    if ref not in layout.PARTS:
        raise SystemExit(f"text_edits: {ref} is on the sheet and not in layout.py")
    seen.add(ref)
    out.append(src[last:start])
    out.append(edit_block(text, ref, plan_for(ref, x, y, rot, mirror_of(text, ref))))
    last = end
out.append(src[last:])
src = "".join(out)
if seen != set(layout.PARTS):
    raise SystemExit(f"text_edits: layout.py places {sorted(set(layout.PARTS) - seen)}, which the sheet lacks")
print(f"fields: {len(seen)} symbols")

# 3. Group rectangle and caption ------------------------------------------------------------
RECT = layout.RECT
rect_re = re.compile(r'\(rectangle \(start [-\d.]+ [-\d.]+\) \(end [-\d.]+ [-\d.]+\)\n'
                     r'\t\t\(stroke \(width 0\.3\) \(type dash\)')
if len(rect_re.findall(src)) != 1:
    raise SystemExit("text_edits: expected exactly one group rectangle in copperhead's form")
src = rect_re.sub(f'(rectangle (start {RECT[0]:g} {RECT[1]:g}) (end {RECT[2]:g} {RECT[3]:g})\n'
                  '\t\t(stroke (width 0.3) (type dash)', src)
# The caption is copperhead's block form, its `(at ...)` ending the line; a note akcli's add_text
# wrote (step 4) is one line with its effects after the `(at ...)`, so it does not match here.
cap_re = re.compile(r'\n\t\(text "([^"]*)" \(at [-\d.]+ [-\d.]+ 0\)(?=\n)')
if len(cap_re.findall(src)) != 1:
    raise SystemExit("text_edits: expected exactly one group caption")
src = cap_re.sub(lambda m: f'\n\t(text "{m.group(1)}" (at {RECT[0] + 2:g} {RECT[1] + 2:g} 0)', src)
print(f"group rectangle: {RECT}")

# 4. Notes ----------------------------------------------------------------------------------
# akcli's add_text writes no justification, and KiCad centres a text on its point; each note
# (`page.Wiring.note`, from layout.NOTES) is made left-justified, so its point is its left end.
# The count must be layout.NOTES's: a page with none has none.
note_re = re.compile(r'(\n\t\(text "(?:[^"\\]|\\.)*" \(at [-\d.]+ [-\d.]+ 0\) \(effects \(font \(size 1\.27 1\.27\)\))'
                     r'(\) \(uuid )')
want_notes = len(getattr(layout, "NOTES", ()))
src, n_notes = note_re.subn(lambda m: m.group(1) + " (justify left)" + m.group(2), src)
if n_notes != want_notes or src.count("\n\t(text ") != 1 + want_notes:
    raise SystemExit(f"text_edits: justified {n_notes} notes; layout.NOTES has {want_notes}, "
                     f"the sheet has {src.count(chr(10) + chr(9) + '(text ')} '(text' tokens at the top level")
if want_notes:
    print(f"notes: {n_notes}")

path.write_text(src)
