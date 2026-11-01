"""Render a sheet and cut the named crops out of it.

A CROP PAIR HERE IS NOT THE SAME BOX ON BOTH SIDES, and that is forced rather
than careless. The approved page is A3 and this one is US Letter; the whole
drawing has moved and the Mid group has been re-laid, so there is no box that
contains the same thing on both sheets. Each region therefore carries TWO boxes,
one per side, each sized to contain its own side's whole state of that region -
which is the property the hi-cut run's "crop sized to the after state" finding
asks for, applied where the boxes cannot be identical.

The `--side` argument picks which column of boxes to use, so the same literal
table describes both crops and a box that was changed on one side only is
visible in the diff of this file.

PROMOTED to `draughting/measure/` from
`docs/research/2026-10-30-mid-letter-redraw/scripts/crop.py`. SIX copies
existed at promotion time and no two share a `CROPS`/`REGIONS` table - each
is "Adapted from" the one before it in its own docstring, a lineage rather
than duplicates of one script: `hi-boost-full-run` -> `hi-cut-full-run` and
`hi-boost-hairpin-fix` -> `mid-full-run` -> `mid-letter-redraw`, with
`low-cut-full-run` a side branch off `hi-boost-full-run`. This copy is taken
because it is the newest and most general point in that lineage - the only
one that renders at a per-region DPI, uses a temp directory instead of
leaving `.pdf`/`.png` siblings beside the output, and supports two distinct
boxes per region (`--side before|after`) rather than assuming the same box
works on both sides of a repair. Its own `REGIONS` table is specific to the
mid-letter-redraw run, exactly as every prior copy's table was specific to
its own run: the mechanics are what is promoted, and the next caller is
expected to replace the table with its own boxes, the way every run before
this one did. The other five copies are left in their run directories
unchanged.

usage: crop.py <sheet.kicad_sch> <before|after> <out-prefix> [--dpi N]
"""
import subprocess
import sys
import tempfile
from pathlib import Path

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"

# name: (before box on the A3 approved page, after box on the Letter page, dpi)
# Boxes are (x1, y1, x2, y2) in sheet mm.
#
# `coil-row-a` AND `coil-row-b` CARRY THE SAME BEFORE BOX, AND THAT IS NOT A
# TYPO. On the approved page the five windings and the five tap buses are ONE
# row; the fold splits them into two. There is no "tier A coil row" on the
# before side to crop separately, so both after-crops are compared against the
# single row they came from, and the two before-crops are byte-identical. A
# reader who finds them identical and suspects the script should find this.
REGIONS = {
    "page":          ((0, 0, 420, 297),          (0, 0, 279.4, 215.9),   150),
    "mid-whole":     ((20, 104, 403, 189),       (13, 70, 267, 171),     300),
    "bank-tier-a":   ((112, 130, 250, 180),      (80, 90, 215, 125),     300),
    "bank-tier-b":   ((240, 130, 400, 180),      (80, 120, 215, 152),    300),
    "coil-row-a":    ((150, 112, 370, 140),      (85, 73, 230, 100),     300),
    "coil-row-b":    ((150, 112, 370, 140),      (85, 143, 230, 170),    300),
    "return-block":  ((355, 104, 403, 142),      (215, 105, 267, 148),   300),
    "west-chain":    ((20, 150, 110, 190),       (13, 108, 100, 150),    300),
    "selector":      ((60, 140, 150, 190),       (45, 100, 135, 150),    300),
    "nc-marker":     ((92, 170, 110, 186),       (72, 129, 90, 145),     600),
    "rail-join":     ((350, 110, 375, 140),      (205, 73, 240, 170),    300),
    "stand-in-band": ((50, 45, 310, 105),        (10, 11, 270, 70),      200),
}


def main():
    sch = sys.argv[1]
    side = sys.argv[2]
    prefix = Path(sys.argv[3])
    if side not in ("before", "after"):
        raise SystemExit("side must be 'before' or 'after'")
    prefix.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        pdf = td / "page.pdf"
        subprocess.run([KC, "sch", "export", "pdf", "-o", str(pdf), sch],
                       check=True, capture_output=True)
        by_dpi = {}
        for name, (b, a, dpi) in REGIONS.items():
            by_dpi.setdefault(dpi, []).append((name, b if side == "before" else a))
        for dpi, items in sorted(by_dpi.items()):
            png = td / f"page{dpi}.png"
            subprocess.run(["magick", "-density", str(dpi), str(pdf),
                            "-background", "white", "-alpha", "remove", str(png)],
                           check=True, capture_output=True)
            ppmm = dpi / 25.4
            for name, (x1, y1, x2, y2) in items:
                geom = "%dx%d+%d+%d" % (round((x2 - x1) * ppmm),
                                        round((y2 - y1) * ppmm),
                                        round(x1 * ppmm), round(y1 * ppmm))
                out = prefix.parent / f"{prefix.name}-{name}.png"
                subprocess.run(["magick", str(png), "-crop", geom, "+repage",
                                str(out)], check=True, capture_output=True)
                print("  %-16s %-22s %s" % (name, geom, out))


main()
