"""The five things akcli 0.22.0 cannot do, applied as literal text edits.

1. `add_wire` has no stroke parameter, so every wire it writes comes out
   `(width 0)` with no colour, against copperhead's `0.254` and its per-net
   palette. Colour is how a reader follows one net across a sheet.
2. `add_net_label` writes no `thickness` and no colour, and a GLOBAL label it
   adds comes out `(shape input)` - an arrow-pointed tag - where every one
   copperhead wrote is `(shape passive)`, a plain rectangle. It also omits
   `(fields_autoplaced yes)` and the hidden `Intersheetrefs` property, so each
   added global label is rewritten whole in copperhead's own form.
3. **AND IT HAS NO CONTROL OVER A LOCAL LABEL'S `justify`, which this page
   needs and the approved page did not.** akcli writes `justify left bottom`,
   which puts a label's text ABOVE its wire. Tier B's five selector runs each
   have a run 2.54 mm above them that extends FURTHER east, so there is no
   anchor on a tier-B run that escapes the run above - the approved page's
   own rule for these labels has no solution in a descending tier. `justify
   left top` puts the text BELOW the wire, where the run beneath ends further
   WEST and the same rule works mirrored. Six labels are rewritten for this.
4. There is NO operation for a symbol field's position or ANGLE.
   `move_component` carries the offsets and angles chosen for the arrangement
   the move just destroyed. The rule is
       a field renders horizontally when (symbol rotation + field angle) mod 180 == 0
   so the nine capacitors turned 0 -> 180 and the three windings turned
   180 -> 0 all need restating, and so does every part that moved.
5. There is no operation for a group RECTANGLE or for a group's TITLE text.

Every number here is a literal and every substitution must match exactly once,
so a half-applied edit fails loudly rather than silently.

usage: restyle.py <sheet.kicad_sch>
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import arrangement as A              # noqa: E402  - the arrangement, as literals

GREY = "70 70 70 1"
TEAL = "0 130 120 1"
PURPLE = "130 50 170 1"

# copperhead's own per-net palette, read off the approved page's labels and
# wires rather than invented here.
NET_COLOUR = {
    "GND": GREY,
    "tap_2h": TEAL, "tap_1h": TEAL, "tap_0r45h": TEAL,
    "tap_0r22h": TEAL, "tap_0r1h": TEAL,
    "hi_boost_out": PURPLE,
}

def fp(v):
    """A FIELD coordinate. Deliberately NOT `arrangement.g()`.

    `g()` refuses anything that is not a whole number of 50-mil steps, because a
    wire or a pin off the grid is a defect. A field anchor is text and is not on
    the grid: copperhead's own `GND` offset is 6.10 mm and the capacitors' is
    1.27 mm about a y that is itself offset 3.81 mm, so half of these land on
    0.01 mm fractions. Running them through the grid check refused the correct
    arrangement, which is the right failure from the wrong guard.
    """
    return round(v, 2)


# --- 4. symbol fields -------------------------------------------------------
# (ref, expected value, ref_x, ref_y, val_x, val_y, angle)
#
# The seventeen capacitors take their text 6.35 mm to the RIGHT of the symbol,
# one line above and one below the body's midline - one offset for seventeen
# parts, in both tiers. The 6.35 mm offset is paired with the 15.24 mm pitch and
# both are MEASURED for this part set (`scripts/inkmeasure.py`): the widest
# value draws 6.816 mm, which at a 6.35 mm centred offset leaves 0.912 mm to its
# own plate and 3.452 mm to the next capacitor's.
#
# A capacitor's two fields sit on the rows of two neighbouring contacts' runs.
# They miss those runs only because each ends west of the capacitor, which
# `arrangement.assert_text_clear_of_runs()` checks rather than assumes.
FIELDS = [(r, None,
           fp(A.CAP_X[r] + 6.35), fp(A.CAP_Y[r] - 1.27),
           fp(A.CAP_X[r] + 6.35), fp(A.CAP_Y[r] + 1.27), 0)
          for r, _, _ in A.BANK]
# The five windings take theirs 6.35 mm to the LEFT, in both tiers: L3's text
# would otherwise reach the join, and one offset for five parts is one thing to
# keep correct instead of five.
FIELDS += [(A.COIL_REF[t], None,
            fp(A.COIL_X[t] - 6.35), fp(A.COIL_Y[t] - 1.27),
            fp(A.COIL_X[t] - 6.35), fp(A.COIL_Y[t] + 1.27), 0)
           for t in A.TAP_ORDER]
FIELDS += [
    # The eleven-throw selector: heading above the body, value below it,
    # away from the no-connect marker on pin 12.
    ("SW1", "11-way selector", A.SW1_X, fp(A.SW1_Y - 19.05),
     A.SW1_X, fp(A.SW1_Y + 22.86), 0),
    # The level rheostat, rotation 90 - so a field needs angle 90 to render
    # horizontally. Both fields go below the body, away from the wiper tie above.
    ("RV1", "47K", A.RV1_X, fp(A.SW1_Y + 6.35), A.RV1_X, fp(A.SW1_Y + 8.89), 90),
    # The mode switch. ITS FIELDS ARE SHIFTED 7.62 mm EAST of the approved
    # page's offset: `boost/off/cut` is 13 characters and centred on SW2's own
    # x its west ink would reach 2.3 mm past the join, which the rail is drawn
    # down. Measured on the render, not assumed.
    ("SW2", "boost/off/cut", fp(A.SW2_AT[0] + 7.62), fp(A.SW1_Y - 8.89),
     fp(A.SW2_AT[0] + 7.62), fp(A.SW1_Y - 6.35), 0),
    ("R1", "4.7K", A.R1_AT[0], fp(A.R1_AT[1] - 3.81),
     A.R1_AT[0], fp(A.R1_AT[1] + 3.81), 90),
    ("R2", "1K", fp(A.R2_AT[0] - 5.08), fp(A.R2_AT[1] - 1.27),
     fp(A.R2_AT[0] - 5.08), fp(A.R2_AT[1] + 1.27), 0),
    ("R3", "100K", fp(A.R3_AT[0] - 5.08), fp(A.R3_AT[1] - 1.27),
     fp(A.R3_AT[0] - 5.08), fp(A.R3_AT[1] + 1.27), 0),
    # The one ground symbol the two return legs share. Its carried `GND` text
    # would sit on the link it terminates, so it goes below the triangle.
    ("#PWR07", "GND", A.GND_SYM[0], fp(A.GND_SYM[1] + 7.62),
     A.GND_SYM[0], fp(A.GND_SYM[1] + 6.10), 0),
]

# --- 5. the Mid group rectangle and its heading -----------------------------
# The rectangle as `translate.py` left it, and where the folded content puts it.
RECTS = [
    ("(start -17.78 72.39) (end 359.41 152.4)",
     f"(start {A.MID_X1} {A.MID_Y1}) (end {A.MID_X2} {A.MID_Y2})",
     "Mid: the folded section is 113 mm narrower and 16 mm deeper than the "
     "single row, so the box follows the content both ways"),
]
HEADING_AT = (17.24, 74.39)      # 2 mm inside the box's top-left corner
TEXTS = [
    ('(text "Mid" (at -15.78 74.39 0)',
     f'(text "Mid" (at {HEADING_AT[0]} {HEADING_AT[1]} 0)',
     "the heading sits 2 mm inside the box's top-left corner, which moved"),
]


def num(v):
    """KiCad writes 139.7 rather than 139.70, and 254 rather than 254.0."""
    return f"{v:.4f}".rstrip("0").rstrip(".")


def main():
    path = sys.argv[1]
    A.check()
    src = open(path).read()
    n = 0

    # --- 1. wire strokes and colours ---------------------------------------
    for x1, y1, x2, y2, net, _why in A.ADD_WIRES:
        old = (f"(wire (pts (xy {num(x1)} {num(y1)}) (xy {num(x2)} {num(y2)}))"
               f" (stroke (width 0) (type default))")
        col = NET_COLOUR.get(net)
        c = f" (color {col})" if col else ""
        new = (f"(wire (pts (xy {num(x1)} {num(y1)}) (xy {num(x2)} {num(y2)}))"
               f" (stroke (width 0.254) (type default){c})")
        if src.count(old) != 1:
            sys.exit(f"wire ({x1},{y1})-({x2},{y2}) [{net}]: "
                     f"{src.count(old)} matches")
        src = src.replace(old, new, 1)
        n += 1

    # --- 2/3. local labels: thickness, net colour, and JUSTIFY --------------
    for name, x, y, scope, rot, just, _why in A.ADD_LABELS:
        if scope != "local":
            continue
        old = (f'(label "{name}" (at {num(x)} {num(y)} {rot})'
               f' (effects (font (size 1.27 1.27)) (justify left bottom))')
        col = NET_COLOUR.get(name)
        c = f" (color {col})" if col else ""
        new = (f'(label "{name}" (at {num(x)} {num(y)} {rot})'
               f' (effects (font (size 1.27 1.27) (thickness 0.2){c})'
               f' (justify left {just}))')
        if src.count(old) != 1:
            sys.exit(f"local label {name} at ({x},{y}): {src.count(old)} matches")
        src = src.replace(old, new, 1)
        n += 1

    # --- 2. global labels: rewritten whole, in copperhead's own form --------
    for name, x, y, scope, rot, _just, _why in A.ADD_LABELS:
        if scope != "global":
            continue
        side = "right" if rot == 180 else "left"
        old_re = (re.escape(f'(global_label "{name}" (shape input) '
                            f'(at {num(x)} {num(y)} {rot}) ')
                  + r'\(effects \(font \(size 1\.27 1\.27\)\) '
                  + re.escape(f'(justify {side})')
                  + r'\) \(uuid "([0-9a-f-]+)"\)\)')
        m = re.search(old_re, src)
        if not m:
            sys.exit(f"global label {name} at ({x},{y}) rot {rot}: "
                     f"akcli form not found")
        col = NET_COLOUR.get(name)
        c = f" (color {col})" if col else ""
        new = (f'(global_label "{name}" (shape passive) '
               f'(at {num(x)} {num(y)} {rot}) (fields_autoplaced yes)\n'
               f'\t\t(effects (font (size 1.27 1.27) (thickness 0.2){c})'
               f' (justify {side}))\n'
               f'\t\t(uuid "{m.group(1)}")\n'
               f'\t\t(property "Intersheetrefs" "${{INTERSHEET_REFS}}" '
               f'(at {num(x)} {num(y)} 0)\n'
               f'\t\t\t(effects (font (size 1.27 1.27)) hide)\n'
               f'\t\t)\n'
               f'\t)')
        src = src[:m.start()] + new + src[m.end():]
        n += 1

    # --- 4. symbol fields ---------------------------------------------------
    for ref, val, rx, ry, vx, vy, ang in FIELDS:
        anchor = f'(property "Reference" "{ref}" (at '
        if src.count(anchor) != 1:
            sys.exit(f"{ref}: Reference anchor matched {src.count(anchor)} times")
        start = src.index(anchor)
        i = src.index(anchor, start)
        j = src.index(")", i + len(anchor))
        src = src[:i + len(anchor)] + f"{num(rx)} {num(ry)} {num(ang)}" + src[j:]
        n += 1
        vm = re.compile(r'\(property "Value" "([^"]*)" \(at ').search(src, start)
        if vm is None:
            sys.exit(f"{ref}: no Value property after its Reference")
        if val is not None and vm.group(1) != val:
            sys.exit(f"{ref}: Value is {vm.group(1)!r}, expected {val!r}")
        k = vm.end()
        j = src.index(")", k)
        src = src[:k] + f"{num(vx)} {num(vy)} {num(ang)}" + src[j:]
        n += 1

    # --- 5. the group rectangle and its heading -----------------------------
    for old, new, why in RECTS + TEXTS:
        if src.count(old) != 1:
            sys.exit(f"{src.count(old)} matches for: {why}")
        src = src.replace(old, new, 1)
        print(f"  {why}")
        n += 1

    open(path, "w").write(src)
    print(f"{n} literal edits applied to {path}")


if __name__ == "__main__":
    main()
