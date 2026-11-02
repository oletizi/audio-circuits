"""Absolute pin positions of every placed symbol, read from the sheet itself.

`TOOLING.md` trap: `akcli pins` MIXES UNITS - given `--at` in mm it returns
`y_mil` as the mm figure plus a +/-150 **mil** offset, so its spacing is right
and its absolute positions are wrong. The sheet's own `lib_symbols` block is
the authority, and this script reads it.

It also prints each lib symbol's pin table in SYMBOL coordinates, which is what
a placement is worked out from.

**AND BECAUSE IT IS THE AUTHORITY, IT CARRIED ALL THREE PARSE BUGS AT ONCE.**
It was not among the six the 2026-10-29 runs found, and it had every one of
their causes:

- the **newline-only pin pattern**, so copperhead's one-line power-symbol pins
  resolved to nothing - the same blind spot that made `junction_audit.py` report
  a false orphan at `pultec-mid`'s shared ground symbol;
- the **entry-span search** that ran to the END OF THE FILE when no further
  `lib_symbols` entry followed, which on `hi-cut-hybrid.kicad_sch` gave the
  rotary switch every coordinate on the page;
- the **block-form-only symbol-instance pattern**, so an instance akcli wrote on
  one line was not listed at all. `#PWR010` on the accepted `pultec-low-boost`
  page is one, and this script would have printed no pin position for it while
  looking like a complete survey.

All three are gone: it reads through `docs/research/lib/kicad_sheet.py`, which
parses by balanced parentheses and refuses when its parse does not account for
every token in the source.

usage: pingeom.py <sheet.kicad_sch> [designator ...]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402


def main():
    sheet = kicad_sheet.read(sys.argv[1])
    want = set(sys.argv[2:])
    table = sheet.lib_pins()

    print("=== lib_symbols pin tables, SYMBOL coordinates (x, y, angle, length)")
    for lib_id, pins in sorted(table.items()):
        print(f"  {lib_id}   ({len(pins)} pin(s), every '(pin' token in the "
              f"entry accounted for)")
        for p in pins:
            print(f"      pin {str(p.number):>3}  at ({p.sx}, {p.sy}) "
                  f"angle {p.angle} length {p.length}"
                  f"{'  [hidden]' if p.hidden else ''}")
    print()

    print("=== placed symbols, SHEET coordinates")
    shown = 0
    for s in sheet.symbols():
        if want and s.ref not in want:
            continue
        shown += 1
        print(f"  {s.ref:8} {s.lib_id:32} at ({s.x}, {s.y}) rot {s.rot}")
        for p in table.get(s.lib_id, []):
            dx, dy = kicad_sheet.rotate(p.sx, -p.sy, s.rot)
            print(f"      pin {str(p.number):>3} -> "
                  f"({round(s.x + dx, 3)}, {round(s.y + dy, 3)})")
        for f in s.fields:
            if f.name not in ("Reference", "Value") or f.x is None:
                continue
            horiz = (s.rot + f.angle) % 180 == 0
            print(f"      {f.name:9} {f.text!r:12} at ({f.x}, {f.y}) "
                  f"angle {f.angle}"
                  f"  renders {'HORIZONTAL' if horiz else 'VERTICAL'}"
                  f"{'  [hidden]' if f.hidden else ''}")
    print()
    print(f"{shown} of {len(sheet.symbols())} placed symbols listed")


main()
