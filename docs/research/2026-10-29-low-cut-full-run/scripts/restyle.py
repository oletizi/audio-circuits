"""Give akcli's new wires and labels copperhead's own stroke and label style.

akcli 0.22.0 has no stroke parameter on `add_wire` and no `shape`/style on
`add_net_label`, so every element it writes comes out at `(width 0)` with no
net colour and `(shape input)`. copperhead colours a wire BY NET, and colour is
how a reader follows one, so an uncoloured segment spliced into a coloured net
makes the page say something the circuit does not.

Every uuid and every colour below is a literal, read off the two sheets. This
script edits text; it computes no position.

usage: restyle.py <sheet.kicad_sch>
"""
import re
import sys

# copperhead's per-net wire colour on this sheet, read from the baseline
GREY = "70 70 70 1"        # GND
PURPLE = "130 50 170 1"    # hi_boost_out
PLAIN = None               # in, out, lo_boost_in, hcut_t1, hi_tap, c*_sel

WIRE_COLOUR = {
    # hi_boost_out: the new trunk above the cap bank, its seven risers and
    # RV1's drop
    "9f894740-ed1f-56ff-806f-13a09a823db1": PURPLE,
    "409b8748-1a94-54c5-955c-e81cd4042542": PURPLE,
    "9cf47d6d-dc06-5e69-b0a1-c0afc0eec7e3": PURPLE,
    "1616d990-3872-5dc9-afb5-4921e7452600": PURPLE,
    "52329294-5b10-5df3-9d87-1069fca1b5f1": PURPLE,
    "80910538-1334-5379-b2fd-07f6c94d4b66": PURPLE,
    "e17a2018-4957-5865-8d37-01701b737fd9": PURPLE,
    "d4244e0e-1e10-5387-921e-60a0fe6de85e": PURPLE,
    "e0b7ec67-7eb7-5dbd-8b87-0521ab7eadc5": PURPLE,
    "f275a191-25e3-5c41-91ea-de3ba98eaa96": PURPLE,
    "c6a402b9-51a9-571a-80a0-76c530444307": PURPLE,
    "045c20e5-1755-5426-b180-4a06b10e624c": PURPLE,
    "b14e23c5-f47e-57f1-9786-7c11e67cfd1c": PURPLE,
    "8d9a69f6-79ba-5da0-89b3-1cffa5c95c7e": PURPLE,
    "d61ee6dd-c23c-59ac-8c52-f66f633fab9d": PURPLE,
    # GND: the J2 trunk and the PWR_FLAG stub
    "7d5c5a94-d257-552a-b892-daeb4f44af78": GREY,
    "165869fa-a5e8-5c72-b83f-85e1ca7ea792": GREY,
    # uncoloured on this sheet: the six selector runs, C7's strap, and the
    # two new lo_boost_in segments in Lo boost
    "8d6c6c7c-707e-5c41-a28d-69ab21e572ad": PLAIN,
    "9c574128-c88a-59bb-84a1-0da04dfb4dd3": PLAIN,
    "fdb4b12f-723c-5a8a-a943-00a06a1eb79a": PLAIN,
    "72948e9a-b892-5b4a-88a8-cf38bcd63cd1": PLAIN,
    "54b66df7-3859-5a52-91e8-a7ddbd8a6b75": PLAIN,
    "d3c9fca7-562e-515b-abea-ca9ebdbcb100": PLAIN,
    "eac1050b-0860-5433-94e8-81d80f5c4c54": PLAIN,
    "e03b5630-712b-5d65-b980-42c7813b5579": PLAIN,
    "b245e110-afbe-50c1-862f-8dd8aea4fc5b": PLAIN,
}

# the new labels: uuid -> (name, at, rotation, justify, colour)
GLOBALS = {
    "ba18165b-d9c8-568c-8166-bb1fd79614de":
        ("hi_boost_out", "172.72 111.76 0", "left", PURPLE),
    "6e047301-b1b2-5a32-b87b-347d2e47566d":
        ("lo_boost_in", "238.76 52.07 0", "left", PLAIN),
    "1103c439-7d15-5c83-83c7-0ddddccc0e8e":
        ("out", "229.87 67.31 0", "left", PLAIN),
}

LOCALS = {
    "eddcb29a-81f5-5319-a3e0-d4f54d479e7b": ("c1_sel", "81.28 121.92 0"),
    "0c271d29-26ee-56d9-9fea-bdd622f28c4e": ("c2_sel", "86.36 124.46 0"),
    "b18f5643-7e79-5acf-a3a4-c208a3f71dd0": ("c3_sel", "91.44 127 0"),
    "b1b460ff-9d65-5a39-a2af-a9155cf7c862": ("c4_sel", "96.52 129.54 0"),
    "916f3c37-1f24-5fb8-836b-38127519e4e3": ("c5_sel", "101.6 132.08 0"),
    "a10c942e-637b-584d-b8aa-245385d7de82": ("c6_sel", "106.68 134.62 0"),
}


def main():
    path = sys.argv[1]
    src = open(path).read()
    changed = 0

    for uuid, colour in WIRE_COLOUR.items():
        old = f'(stroke (width 0) (type default)) (uuid "{uuid}")'
        if old not in src:
            sys.exit(f"wire {uuid}: expected stroke form not found")
        col = f" (color {colour})" if colour else ""
        new = f'(stroke (width 0.254) (type default){col}) (uuid "{uuid}")'
        src = src.replace(old, new)
        changed += 1

    for uuid, (name, at, just, colour) in GLOBALS.items():
        old = (f'(global_label "{name}" (shape input) (at {at}) '
               f'(effects (font (size 1.27 1.27)) (justify {just})) '
               f'(uuid "{uuid}"))')
        if old not in src:
            sys.exit(f"global_label {uuid}: expected form not found\n  {old}")
        col = f" (color {colour})" if colour else ""
        xy = " ".join(at.split()[:2])
        new = (f'(global_label "{name}" (shape passive) (at {at}) '
               f'(fields_autoplaced yes)\n'
               f'\t\t(effects (font (size 1.27 1.27) (thickness 0.2){col})'
               f' (justify {just}))\n'
               f'\t\t(uuid "{uuid}")\n'
               f'\t\t(property "Intersheetrefs" "${{INTERSHEET_REFS}}"'
               f' (at {xy} 0)\n'
               f'\t\t\t(effects (font (size 1.27 1.27)) hide)\n'
               f'\t\t)\n'
               f'\t)')
        src = src.replace(old, new)
        changed += 1

    for uuid, (name, at) in LOCALS.items():
        old = (f'(label "{name}" (at {at}) '
               f'(effects (font (size 1.27 1.27)) (justify left bottom)) '
               f'(uuid "{uuid}"))')
        if old not in src:
            sys.exit(f"label {uuid}: expected form not found\n  {old}")
        new = (f'(label "{name}" (at {at})\n'
               f'\t\t(effects (font (size 1.27 1.27) (thickness 0.2))'
               f' (justify left bottom))\n'
               f'\t\t(uuid "{uuid}")\n'
               f'\t)')
        src = src.replace(old, new)
        changed += 1

    open(path, "w").write(src)
    print(f"restyled {changed} element(s) in {path}")


main()
