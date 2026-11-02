"""The four things akcli 0.22.0 cannot do, applied as literal text edits.

1. `add_wire` has no stroke parameter, so every wire it writes comes out
   `(width 0)` with no colour, against copperhead's `0.254` and its per-net
   colour. Colour is how a reader follows one net across a sheet, so a mixed
   cluster is a real defect and `scripts/colour_check.py` is the check for it.
2. `add_net_label` writes no `thickness` and no colour, and a GLOBAL label it
   adds comes out `(shape input)` - an arrow-pointed tag - where every one
   copperhead wrote is `(shape passive)`, a plain rectangle. It also omits
   `(fields_autoplaced yes)` and the hidden `Intersheetrefs` property, so each
   added global label is rewritten whole in copperhead's own form.
3. There is NO operation for a symbol field's position or ANGLE.
   `move_component` carries the offsets and angles copperhead chose for the
   arrangement the move just destroyed. **This board shows the class in BOTH
   directions at once**, which is why `TOOLING.md`'s one-directional wording is
   wrong: the twelve capacitors turned 270 -> 0 kept `angle 90` and render
   VERTICAL, and the five stand-ins turned 0 -> 90/270 kept `angle 0` and also
   render VERTICAL. The rule is
       a field renders horizontally when (symbol rotation + field angle) mod 180 == 0
   and 36 of this board's fields failed it after the ops.
4. There is no operation for a group RECTANGLE or for a group's TITLE text, so
   the Mid box and its heading are literal edits.

Every number here is a literal and every substitution must match exactly once,
so a half-applied edit fails loudly rather than silently.

usage: restyle.py <sheet.kicad_sch>
"""
import re
import sys

sys.path.insert(0, __file__.rsplit("/", 1)[0])
import make_repairs as M            # noqa: E402  - the arrangement, as literals

GREY = "70 70 70 1"
TEAL = "0 130 120 1"
BLUE = "30 90 200 1"
PURPLE = "130 50 170 1"

# copperhead's per-net palette, read off the colours it put on the baseline's
# own labels and wires rather than invented here.
NET_COLOUR = {
    "GND": GREY,
    "tap_2h": TEAL, "tap_1h": TEAL, "tap_0r45h": TEAL,
    "tap_0r22h": TEAL, "tap_0r1h": TEAL,
    "hcut_t1": BLUE, "hcut_t2": BLUE,
    "hi_boost_out": PURPLE, "hi_tap": PURPLE,
}

# --- 3. symbol fields -------------------------------------------------------
# (ref, value, ref_x, ref_y, val_x, val_y, angle)
#
# The seventeen capacitors take their text 6.35 mm to the RIGHT of the symbol,
# one line above and one below the body's midline - one offset for seventeen
# parts instead of copperhead's seventeen. The five winding sections take
# theirs 6.35 mm to the LEFT, because the eastmost one's text would otherwise
# reach SW2's body.
#
# The 6.35 mm offset is paired with the 15.24 mm pitch, and both are MEASURED
# for this part set (scripts/textwidth.py): this board's widest value draws
# 6.858 mm, which at a 6.35 mm centred offset leaves 0.89 mm to its own plate
# and 3.43 mm to the next capacitor's. `.047uF` draws 6.223 mm at the same six
# characters, so character count is not a proxy for text width.
FIELDS = [(r, None,
           round(M.CAP_X[r] + 6.35, 2), round(M.CAP_Y[r] - 1.27, 2),
           round(M.CAP_X[r] + 6.35, 2), round(M.CAP_Y[r] + 1.27, 2), 0)
          for r, _, _ in M.BANK]
FIELDS += [(M.COIL_REF[t], None,
            round(M.COIL_X[t] - 6.35, 2), round(M.COIL_Y - 1.27, 2),
            round(M.COIL_X[t] - 6.35, 2), round(M.COIL_Y + 1.27, 2), 0)
           for t in M.TAP_ORDER]
FIELDS += [
    # The eleven-throw selector: heading above the body, value below it, clear
    # of the no-connect marker on pin 12 at (100.33, 177.80).
    ("SW1", "11-way selector", 85.09, 143.51, 85.09, 185.42, 0),
    # The level rheostat, rotation 90 - so a field needs angle 90 to render
    # horizontally. Its carried offsets put both fields over the wiper tie.
    ("RV1", "47K", 50.80, 168.91, 50.80, 171.45, 90),
    # The mode switch and the three return resistors.
    ("SW2", "boost/off/cut", 364.49, 109.22, 364.49, 111.76, 0),
    ("R1", "4.7K", 388.62, 111.76, 388.62, 119.38, 90),
    ("R2", "1K", 372.11, 125.73, 372.11, 128.27, 0),
    ("R3", "100K", 387.35, 125.73, 387.35, 128.27, 0),
    # --- the two stand-in groups the label collapse reached -----------------
    ("SI1", "0R", 102.87, 64.77, 102.87, 67.31, 0),
    ("SI2", "47K", 109.22, 66.04, 109.22, 73.66, 90),
    ("SI5", "0R", 166.37, 57.15, 166.37, 59.69, 90),
    ("SI6", "4.7K", 196.85, 57.15, 196.85, 59.69, 90),
    ("SI4", "430R", 180.34, 67.31, 180.34, 74.93, 90),
    ("SI3", ".047uF", 196.85, 67.31, 196.85, 74.93, 90),
    # The one ground symbol the two return legs share. Its carried `GND` text
    # sat on the link it terminates, so it goes below the triangle.
    ("#PWR07", "GND", 384.81, 138.43, 384.81, 136.91, 0),
]

# --- 4. the Mid group rectangle and its heading -----------------------------
RECTS = [
    ("(start 55.88 106.68) (end 363.22 224.79)",
     "(start 22.86 106.68) (end 400.05 186.69)",
     "Mid: the re-authored section is 70 mm wider and 38 mm shallower than "
     "copperhead's two-band wrap, so the box follows the content both ways"),
]
TEXTS = [
    ('(text "Mid" (at 57.88 108.68 0)', '(text "Mid" (at 24.86 108.68 0)',
     "the heading sits 2 mm inside the box's top-left corner, which moved"),
]


def num(v):
    """KiCad writes 139.7 rather than 139.70, and 254 rather than 254.0."""
    return f"{v:.4f}".rstrip("0").rstrip(".")


def main():
    path = sys.argv[1]
    src = open(path).read()
    n = 0

    # --- 1. wire strokes and colours ---------------------------------------
    for x1, y1, x2, y2, net, _why in M.ADD_WIRES:
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

    # --- 2a. local labels: thickness, and the net colour where there is one --
    for name, x, y, scope, rot, _why in M.ADD_LABELS:
        if scope != "local":
            continue
        old = (f'(label "{name}" (at {num(x)} {num(y)} {rot})'
               f' (effects (font (size 1.27 1.27)) (justify left bottom))')
        col = NET_COLOUR.get(name)
        c = f" (color {col})" if col else ""
        new = (f'(label "{name}" (at {num(x)} {num(y)} {rot})'
               f' (effects (font (size 1.27 1.27) (thickness 0.2){c})'
               f' (justify left bottom))')
        if src.count(old) != 1:
            sys.exit(f"local label {name} at ({x},{y}): {src.count(old)} matches")
        src = src.replace(old, new, 1)
        n += 1

    # --- 2b. global labels: rewritten whole, in copperhead's own form --------
    for name, x, y, scope, rot, _why in M.ADD_LABELS:
        if scope != "global":
            continue
        just = "right" if rot == 180 else "left"
        old_re = (re.escape(f'(global_label "{name}" (shape input) '
                            f'(at {num(x)} {num(y)} {rot}) ')
                  + r'\(effects \(font \(size 1\.27 1\.27\)\) '
                  + re.escape(f'(justify {just})')
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
               f' (justify {just}))\n'
               f'\t\t(uuid "{m.group(1)}")\n'
               f'\t\t(property "Intersheetrefs" "${{INTERSHEET_REFS}}" '
               f'(at {num(x)} {num(y)} 0)\n'
               f'\t\t\t(effects (font (size 1.27 1.27)) hide)\n'
               f'\t\t)\n'
               f'\t)')
        src = src[:m.start()] + new + src[m.end():]
        n += 1

    # --- 3. symbol fields ---------------------------------------------------
    for ref, val, rx, ry, vx, vy, ang in FIELDS:
        anchor = f'(property "Reference" "{ref}" (at '
        if src.count(anchor) != 1:
            sys.exit(f"{ref}: Reference anchor matched {src.count(anchor)} times")
        start = src.index(anchor)
        # The Reference, then the first Value after it: both inside this one
        # symbol block, so no other part's identical value can be hit.
        head = f'(property "Reference" "{ref}" (at '
        i = src.index(head, start)
        j = src.index(")", i + len(head))
        src = src[:i + len(head)] + f"{num(rx)} {num(ry)} {num(ang)}" + src[j:]
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

    # --- 4. the group rectangle and its heading -----------------------------
    for old, new, why in RECTS + TEXTS:
        if src.count(old) != 1:
            sys.exit(f"{src.count(old)} matches for: {why}")
        src = src.replace(old, new, 1)
        print(f"  {why}")
        n += 1

    open(path, "w").write(src)
    print(f"{n} literal edits applied to {path}")


main()
