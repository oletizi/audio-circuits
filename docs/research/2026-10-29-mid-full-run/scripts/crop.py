"""Render a sheet and cut the crops this run needs out of it, in sheet mm.

Every rectangle is a literal written by hand after reading the geometry dump.
Nothing is computed from the component list. The SAME boxes are cut from both
sides of the before/after pair, because a crop pair is only a comparison if it
frames the same region of the page.

`mid-whole`, `west-chain` and `nc-marker` are sized to contain BOTH states of
their region - `TOOLING.md` records a pair whose box fitted only the after
state, so the before side was cut off. The close crops of the bank, the coil
row and the return block are regions that did not EXIST before: copperhead put
nothing there. Their before side is therefore mostly blank, and that is a true
statement about the region rather than a cropping error.

usage: crop.py <sheet.kicad_sch> <out-prefix> [crop-name ...]
"""
import os
import subprocess
import sys

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
DENSITY = 300
PPMM = DENSITY / 25.4

# name -> (x1, y1, x2, y2) in sheet millimetres
CROPS = {
    # The whole re-authored section. The box reaches x 18..406 and y 102..230
    # so that it covers the group as COPPERHEAD drew it (55.88..363.22,
    # 106.68..224.79) as well as the repaired rectangle (22.86..400.05,
    # 106.68..186.69).
    "mid-whole": (18, 102, 406, 230),
    # The level rheostat, the eleven-throw selector and the pole wire. Contains
    # the selector at both its positions (before y 177.8..210.8, after
    # 146.05..179.07).
    "west-chain": (20, 140, 136, 218),
    # Pin 12's no-connect marker with its neighbours, at 4x the others' zoom.
    # Before (105.41, 209.55), after (100.33, 177.80).
    "nc-marker": (88, 168, 126, 220),
    # The seventeen capacitors in three overlapping close crops. EVERY one of
    # these parts had its Reference and Value rewritten, which is the class
    # invisible to every automated check.
    "bank-left": (112, 136, 212, 164),
    "bank-mid": (204, 143, 300, 173),
    "bank-right": (294, 155, 382, 181),
    # The five winding sections, the five tap buses and the coil_return rail.
    "coil-row": (150, 110, 376, 144),
    # SW2, the two return legs, the input shunt and the two ground symbols.
    "return-block": (350, 103, 408, 145),
    # J2: five stacked ground symbols became one on a trunk, and the PWR_FLAG
    # moved onto a stub off it.
    "junction-j2": (54, 76, 98, 102),
    # J1, whose ground symbol the PWR_FLAG was drawn inside.
    "junction-j1": (56, 50, 98, 80),
    # The Hi boost stand-in: the duplicate `hi_tap` pair collapsed to a wire.
    "hi-boost": (92, 48, 142, 80),
    # The Hi cut stand-in: `hcut_t2` x3 and `lo_boost_in` x2 collapsed.
    "hi-cut": (138, 48, 232, 80),
    # The whole stand-in band, so each group is seen beside its neighbours.
    "top-band": (50, 44, 312, 104),
}


def main():
    sch, prefix = sys.argv[1], sys.argv[2]
    names = sys.argv[3:] or list(CROPS)
    out = os.path.dirname(prefix) or "."
    os.makedirs(out, exist_ok=True)
    pdf = prefix + ".pdf"
    subprocess.run([KC, "sch", "export", "pdf", "-o", pdf, sch],
                   check=True, capture_output=True)
    full = prefix + ".png"
    subprocess.run(["magick", "-density", str(DENSITY), pdf,
                    "-background", "white", "-alpha", "remove", full],
                   check=True, capture_output=True)
    print("full:", full)
    for n in names:
        x1, y1, x2, y2 = CROPS[n]
        px, py = int(x1 * PPMM), int(y1 * PPMM)
        w, h = int((x2 - x1) * PPMM), int((y2 - y1) * PPMM)
        dst = f"{prefix}-{n}.png"
        args = ["magick", full, "-crop", f"{w}x{h}+{px}+{py}", "+repage"]
        if n == "nc-marker":
            args += ["-filter", "point", "-resize", "400%"]
        subprocess.run(args + [dst], check=True, capture_output=True)
        print("crop:", dst, f"({x1},{y1})-({x2},{y2}) mm")


main()
