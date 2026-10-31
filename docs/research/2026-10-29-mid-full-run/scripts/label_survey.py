"""List every label on the sheet, grouped by net name, with pairwise distances.

This feeds the duplicate-on-page-label count, which `EVALUATING-DRAWINGS.md`
requires to read zero after a collapse pass - so a label this script does not
see is a duplicate nobody collapses.

**ITS TWO PATTERNS WERE BOTH PINNED TO A TEXTUAL LAYOUT**, and both would have
dropped a label silently rather than refusing. The local-label pattern required
a newline and one tab before `(label`, so an akcli-written one-line local label
would not have been listed. The global-label pattern required a `(shape ...)`
member, and the hi-cut run's §9.2 is precisely about akcli writing global labels
differently from copperhead - `(shape input)` where copperhead writes
`(shape passive)`, with `(fields_autoplaced yes)` and the hidden
`Intersheetrefs` property omitted. One more omission in that direction and this
check would have under-counted.

Measured on all seven committed sheets both patterns happened to be complete,
which is why nothing caught them. It reads through
`docs/research/lib/kicad_sheet.py` now, which parses by balanced parentheses and
refuses when its parse does not account for every label token in the source.

usage: label_survey.py <sheet.kicad_sch>
"""
import collections
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

sheet = kicad_sheet.read(sys.argv[1])
by_net = collections.defaultdict(list)

KINDS = {"global_label": "global", "label": "local",
         "hierarchical_label": "hier"}

for kind, text, x, y, angle, shape, _ in sheet.labels():
    by_net[text].append((KINDS[kind], x, y, angle, shape))

total = sum(len(v) for v in by_net.values())
print(f"{total} label(s) on {len(by_net)} net(s); every label token in the file "
      f"is accounted for, or this script would have refused")
print()

for net in sorted(by_net):
    inst = by_net[net]
    print(f"{net}  ({len(inst)} label{'s' if len(inst) > 1 else ''})")
    for kind, x, y, rot, shape in inst:
        print(f"    {kind:7s} at ({x}, {y}) rot {rot} shape {shape or '-'}")
    if len(inst) > 1:
        for i in range(len(inst)):
            for j in range(i + 1, len(inst)):
                a, b = inst[i], inst[j]
                d = math.hypot(a[1] - b[1], a[2] - b[2])
                man = abs(a[1] - b[1]) + abs(a[2] - b[2])
                print(
                    f"    gap ({a[1]},{a[2]})-({b[1]},{b[2]}): "
                    f"straight {d:.2f} mm, orthogonal run {man:.2f} mm"
                )
    print()
