"""Per-group-rectangle content bounding box and the four edge margins.

Read-only. It computes no placement; it reports what is already on the sheet so
a margin can be matched rather than invented.

WHAT WAS WRONG WITH IT, MEASURED - three things, two of them fixed here
======================================================================

**1. THE LAST `lib_symbols` ENTRY ABSORBED THE WHOLE SHEET.** This script found
an entry's end by searching for the next `^\\t\\t(symbol "` and, when there was
none, ran to the END OF THE FILE. The last entry on `hi-cut-hybrid.kicad_sch` is
`Switch:SW_Rotary_1x6_MP`, so its "library geometry" was every coordinate on the
page: 45,191 characters where the entry is 7,352. That is why it named `SW1` as
both the bottom-most and the top-most item inside the **Lo boost** and **Mid**
rectangles, where SW1 does not appear - SW1 is 50 mm below, in Hi cut - and why
it reported a bottom margin of **0.00 mm** for Lo boost where the render shows
2.5 mm. Twenty-six points were wrongly attributed to SW1 inside the Lo boost
rectangle alone. Fixed by taking every span from the parse:
`docs/research/lib/kicad_sheet.py`, which has the positive control for it.

**2. LIBRARY PINS COME IN TWO TEXTUAL FORMS** and this script's pin pattern
demanded the newline before `(at ...)`, so it missed the pins of copperhead's
one-line power symbols entirely. Same shared reader, same fix.

**3. A TEXT MARGIN FROM A CHARACTER COUNT IS AN ESTIMATE, AND TWO OF THEM WERE
PUBLISHED AS MEASUREMENTS.** The Mid rectangle's graphics+text margins of
1.90 mm and 0.64 mm were quoted as this page's two tightest numbers; both came
from `width = 0.75 * size * len(text)`, which is not how the KiCad stroke font
draws. `scripts/textwidth.py` measured the ink: at size 1.27, `2200pF` draws
6.858 mm over six characters and `.047uF` draws 6.223 mm over the same six,
because the leading `.` is a narrow glyph. The estimate gives 5.715 mm for both,
so it is **0.5 to 1.1 mm narrow on a six-character value** and reports a text
margin that much LOOSER than it is.

So the text columns are now **opt in** (`--estimate-text`) and every number in
them is printed with a leading `~`. An estimate you have to ask for cannot be
quoted as a measurement by accident, which is what happened to 1.90 and 0.64.
**To measure a text margin, render and use `scripts/textwidth.py`.**

A FIELD'S STORED ANGLE IS NOT THE ANGLE IT RENDERS AT
=====================================================
KiCad composes it with the parent symbol's rotation, so a field at angle 90 on a
symbol at rotation 270 draws HORIZONTALLY. An earlier version read the stored
angle alone and reported `SI6`'s reference as a vertical 2.86 mm-tall box where
it renders as a horizontal 1.27 mm-tall one - a 1.43 mm error in a margin, in
the direction that makes a page look TIGHTER than it is. The rule, read off the
sheet and confirmed in the render: orientation is horizontal when
`(symbol_rotation + field_angle) mod 180 == 0`. Kept.

usage: boxgeom.py <sheet.kicad_sch> [--estimate-text]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

# The character-count estimator and its MEASURED error, from
# `scripts/textwidth.py` on hi-cut at size 1.27: six characters draw 6.223 to
# 6.858 mm of ink where this gives 5.715 mm.
GLYPH_ADVANCE = 0.75
MEASURED_SIX_CHAR_INK_MM = (6.223, 6.858)
MEASURED_AT_SIZE = 1.27


def content_points(sheet):
    """[(x, y, who, kind)] every drawn graphic point on the sheet."""
    pts = []
    for w in sheet.wires():
        pts += [(w.x1, w.y1, "wire", "wire"), (w.x2, w.y2, "wire", "wire")]
    table = sheet.lib_graphics()
    for s in sheet.symbols():
        if s.lib_id not in table:
            raise SystemExit(f"{s.ref}: no lib_symbols entry for {s.lib_id}")
        for sx, sy in table[s.lib_id]:
            dx, dy = kicad_sheet.rotate(sx, -sy, s.rot)
            pts.append((round(s.x + dx, 3), round(s.y + dy, 3), s.ref, "graphic"))
    return pts


def text_points(sheet):
    """[(x, y, text, kind)] ESTIMATED glyph-box corners of visible fields.

    The field's angle is composed with its parent symbol's rotation - see the
    module docstring. The box width is an estimate and is marked as one by every
    caller.
    """
    pts = []
    for s in sheet.symbols():
        for f in s.fields:
            if f.hidden or f.name not in ("Reference", "Value"):
                continue
            if f.x is None or f.size is None or not f.text:
                continue
            w = GLYPH_ADVANCE * f.size * len(f.text)
            h = f.size
            if (s.rot + f.angle) % 180 == 90:
                w, h = h, w
            pts += [(f.x - w / 2, f.y - h / 2, f.text, "text"),
                    (f.x + w / 2, f.y + h / 2, f.text, "text")]
    return pts


def group_label(sheet, x1, y1):
    """The group title drawn at a rectangle's top-left inset, or '?'."""
    for text, tx, ty, _ in sheet.texts():
        if abs(tx - (x1 + 2.0)) < 0.1 and abs(ty - (y1 + 2.0)) < 0.1:
            return text
    return "?"


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    estimate_text = "--estimate-text" in sys.argv[1:]
    if len(args) != 1:
        raise SystemExit(__doc__.strip().splitlines()[-1])

    sheet = kicad_sheet.read(args[0])
    rects = sheet.rectangles()
    groups = [r for r in rects if r[0] > 5 and (r[2] - r[0]) > 10]
    content = content_points(sheet)
    texts = text_points(sheet) if estimate_text else []

    print(f"{len(sheet.rectangles())} sheet rectangles, {len(groups)} of them "
          f"group boxes; {len(content)} graphic points from "
          f"{len(sheet.symbols())} symbols and {len(sheet.wires())} wires")
    if estimate_text:
        lo, hi = MEASURED_SIX_CHAR_INK_MM
        est = GLYPH_ADVANCE * MEASURED_AT_SIZE * 6
        print()
        print("  ESTIMATED TEXT MARGINS FOLLOW AND THEY ARE NOT MEASUREMENTS.")
        print(f"  The estimator gives {est:.3f} mm for six characters at size "
              f"{MEASURED_AT_SIZE}; textwidth.py MEASURED {lo:.3f} to {hi:.3f} mm")
        print(f"  of ink for the same, so a text margin here reads up to "
              f"{(hi - est) / 2:.2f} mm LOOSER than it draws.")
        print("  Every estimated number is printed with a leading '~'. To measure "
              "one, render and use scripts/textwidth.py.")
    print()

    for (x1, y1, x2, y2) in sorted(groups, key=lambda r: (r[1], r[0])):
        label = group_label(sheet, x1, y1)

        def inside(pts):
            return [p for p in pts
                    if x1 - 0.01 <= p[0] <= x2 + 0.01 and y1 - 0.01 <= p[1] <= y2 + 0.01]

        rows = [("graphics", inside(content), "")]
        if estimate_text:
            rows.append(("graphics+text", inside(content) + inside(texts), "~"))

        print(f"=== {label}   rect ({x1}, {y1}) -> ({x2}, {y2})"
              f"   {x2 - x1:.2f} x {y2 - y1:.2f} mm")
        for what, pts, mark in rows:
            if not pts:
                print(f"  {what:14s} nothing inside")
                continue
            gx0 = min(p[0] for p in pts)
            gx1 = max(p[0] for p in pts)
            gy0 = min(p[1] for p in pts)
            gy1 = max(p[1] for p in pts)
            left = min(pts, key=lambda p: p[0])
            right = max(pts, key=lambda p: p[0])
            top = min(pts, key=lambda p: p[1])
            bot = max(pts, key=lambda p: p[1])
            print(f"  {what:14s} margins  left {mark}{gx0 - x1:6.2f}  "
                  f"right {mark}{x2 - gx1:6.2f}  top {mark}{gy0 - y1:6.2f}  "
                  f"bottom {mark}{y2 - gy1:6.2f}")
            print(f"  {'':14s}          left-most {left[2]!r} at ({left[0]}, {left[1]})"
                  f"   right-most {right[2]!r} at ({right[0]}, {right[1]})")
            print(f"  {'':14s}          top-most {top[2]!r} at ({top[0]}, {top[1]})"
                  f"   bottom-most {bot[2]!r} at ({bot[0]}, {bot[1]})")
        print()


main()
