"""Second restyle pass: the wires and the label that pass 3 wrote.

akcli 0.22.0 has no stroke parameter on `add_wire` and no `shape` on
`add_net_label`, so every pass has to be followed by this. Same reason, same
form, same literal colours as `restyle.py`; the uuids differ because pass 3
rewrote the trunk and its risers 2.54 mm higher.

usage: restyle3.py <sheet.kicad_sch>
"""
import sys

PURPLE = "130 50 170 1"   # hi_boost_out

WIRE_COLOUR = {
    "55318a18-5e07-56dc-a5cf-5ab9b83b281c": PURPLE,   # C1 riser
    "c988719b-9e28-5635-b0c6-39b16679556e": PURPLE,   # C2 riser
    "2101adc2-8f38-588c-aa78-254020d72dbf": PURPLE,   # C3 riser
    "189b8dc0-a80a-5cac-b996-80609fa3d2be": PURPLE,   # C7 pin-1 stub
    "a3e3f507-2e1c-58ac-895f-2c5d623904a9": PURPLE,   # C4 riser
    "086e8484-d93a-5652-9c0f-7fc9f6054511": PURPLE,   # C5 riser
    "11ab93f3-04ba-549c-a005-6e98c0ee9110": PURPLE,   # C6 riser
    "5b88199c-01c1-586d-bc89-728c44baaea2": PURPLE,   # RV1 drop
    "1891a814-eac6-507c-939f-984212ea2f5a": PURPLE,   # the trunk
    "c5daa586-a5f0-5512-9679-084587739bc5": None,     # C7 pin-2 strap (c3_sel)
}

LABEL = ("46b93c4a-3723-58b3-8b56-5a3a016c2c57", "hi_boost_out",
         "172.72 109.22 0", "left", PURPLE)

# C3's fields were nudged down while C7 sat 7.62 mm above it; with C7 now
# 10.16 mm away they return to copperhead's own offsets, -5.842 and -3.302.
FIELDS = [
    ('(property "Reference" "C3" (at 123.19 121.92 90)',
     '(property "Reference" "C3" (at 123.19 121.158 90)'),
    ('(property "Value" "4700pF" (at 123.19 124.46 90)',
     '(property "Value" "4700pF" (at 123.19 123.698 90)'),
]


def main():
    path = sys.argv[1]
    src = open(path).read()

    for uuid, colour in WIRE_COLOUR.items():
        old = f'(stroke (width 0) (type default)) (uuid "{uuid}")'
        if old not in src:
            sys.exit(f"wire {uuid}: expected stroke form not found")
        col = f" (color {colour})" if colour else ""
        src = src.replace(
            old, f'(stroke (width 0.254) (type default){col}) (uuid "{uuid}")')

    uuid, name, at, just, colour = LABEL
    old = (f'(global_label "{name}" (shape input) (at {at}) '
           f'(effects (font (size 1.27 1.27)) (justify {just})) '
           f'(uuid "{uuid}"))')
    if old not in src:
        sys.exit(f"global_label {uuid}: expected form not found")
    xy = " ".join(at.split()[:2])
    src = src.replace(old, (
        f'(global_label "{name}" (shape passive) (at {at}) '
        f'(fields_autoplaced yes)\n'
        f'\t\t(effects (font (size 1.27 1.27) (thickness 0.2)'
        f' (color {colour})) (justify {just}))\n'
        f'\t\t(uuid "{uuid}")\n'
        f'\t\t(property "Intersheetrefs" "${{INTERSHEET_REFS}}" (at {xy} 0)\n'
        f'\t\t\t(effects (font (size 1.27 1.27)) hide)\n'
        f'\t\t)\n'
        f'\t)'))

    for old, new in FIELDS:
        if old not in src:
            sys.exit(f"field not found:\n  {old}")
        src = src.replace(old, new)

    open(path, "w").write(src)
    print(f"restyled {len(WIRE_COLOUR)} wire(s), 1 label, {len(FIELDS)} field(s)")


main()
