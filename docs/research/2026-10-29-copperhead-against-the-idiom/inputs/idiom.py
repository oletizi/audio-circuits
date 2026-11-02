"""Score each drafted sheet against the four COUNTED features of the
Thompson-Bell arrangement.  These are correspondences, not judgements.

F1 spine        : the longest constant-y wire run of one net, in mm, and
                  what fraction of the drawn width it covers
F2 in-left      : x of the leftmost label/pin carrying the input net is less
                  than x of the rightmost carrying the output net
F3 one 0V y     : how many distinct y values the ground symbols sit at
                  (the reference draws one), and whether that y is the
                  lowest drawn row
F4 blocks below : fraction of non-spine symbols whose y is greater than the
                  spine's y (hanging downward off it)
"""
import glob
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SCHNAME = "pultec-low-boost.kicad_sch"

WIRE = re.compile(r"\(wire\s*\(pts\s*\(xy\s+([-\d.]+)\s+([-\d.]+)\)\s*\(xy\s+([-\d.]+)\s+([-\d.]+)\)\)", re.S)
SYM = re.compile(r'\(symbol\s*\(lib_id\s+"([^"]+)"\)\s*\(at\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\)')
LBL = re.compile(r'\((global_label|label)\s+"([^"]+)"\s*\(shape\s+\w+\)?\s*\(at\s+([-\d.]+)\s+([-\d.]+)', re.S)
LBL2 = re.compile(r'\((global_label|label)\s+"([^"]+)"[^()]*(?:\(shape[^)]*\))?\s*\(at\s+([-\d.]+)\s+([-\d.]+)', re.S)

PAPER_MM = {"A5": (210, 148), "A4": (297, 210), "A3": (420, 297),
            "A2": (594, 420), "A1": (841, 594)}


def parse(path):
    txt = open(path).read()
    segs = [tuple(float(g) for g in m.groups()) for m in WIRE.finditer(txt)]
    syms = [(m.group(1), float(m.group(2)), float(m.group(3)), float(m.group(4)))
            for m in SYM.finditer(txt)]
    labels = [(m.group(1), m.group(2), float(m.group(3)), float(m.group(4)))
              for m in LBL2.finditer(txt)]
    paper = re.search(r'\(paper\s+"([^"]+)"', txt)
    return txt, segs, syms, labels, (paper.group(1) if paper else "?")


def runs_by_y(segs):
    out = {}
    for (x1, y1, x2, y2) in segs:
        if abs(y1 - y2) < 1e-6:
            out.setdefault(round(y1, 3), []).append((min(x1, x2), max(x1, x2)))
    merged = {}
    for y, rs in out.items():
        rs.sort()
        cur = list(rs[0])
        spans = []
        for a, b in rs[1:]:
            if a <= cur[1] + 1e-6:
                cur[1] = max(cur[1], b)
            else:
                spans.append(tuple(cur))
                cur = [a, b]
        spans.append(tuple(cur))
        merged[y] = spans
    return merged


def main(innet="in", outnet="out", gndnames=("GND", "0V")):
    rows = []
    for board in sorted(glob.glob(os.path.join(HERE, "boards", "*"))):
        sch = os.path.join(board, SCHNAME)
        if not os.path.exists(sch):
            continue
        tag = os.path.basename(board)
        txt, segs, syms, labels, paper = parse(sch)
        pw, ph = PAPER_MM.get(paper, (297, 210))

        # F1: longest horizontal run
        best = (0.0, None, None)
        for y, spans in runs_by_y(segs).items():
            for a, b in spans:
                if b - a > best[0]:
                    best = (b - a, y, (a, b))
        spanmm, spiney, spanxs = best
        allx = [s[1] for s in syms] + [l[2] for l in labels]
        ally = [s[2] for s in syms] + [l[3] for l in labels]
        drawnw = (max(allx) - min(allx)) if allx else 1

        # F2: input left of output
        inx = [l[2] for l in labels if l[1] == innet]
        outx = [l[2] for l in labels if l[1] == outnet]
        # the input also appears as bare pin text on a stub; fall back to the
        # leftmost drawn x when the net is wired rather than labelled
        f2 = (min(inx) < max(outx)) if inx and outx else None

        # F3: ground symbol rows
        g = [(s[1], s[2]) for s in syms
             if s[0].startswith("copperhead_power:") and "PWR_FLAG" not in s[0]]
        gys = sorted({round(y, 1) for _, y in g})
        lowest_row = round(max(ally), 1) if ally else 0
        f3_onerow = len(gys) == 1
        f3_bottom = bool(gys) and abs(gys[-1] - lowest_row) < 10

        # F4: how much hangs below the spine line
        nonspine = [s for s in syms if "copperhead_power" not in s[0]]
        below = [s for s in nonspine if spiney is not None and s[2] > spiney + 2]
        f4 = round(len(below) / max(1, len(nonspine)), 2)

        # frame check: anything drawn outside the usable sheet
        off = [s for s in syms if not (0 < s[1] < pw and 0 < s[2] < ph)]

        rows.append({
            "tag": tag, "paper": paper,
            "F1_spine_mm": round(spanmm, 1),
            "F1_spine_frac_of_width": round(spanmm / drawnw, 2) if drawnw else 0,
            "F1_spine_y": spiney,
            "F2_in_left_of_out": f2,
            "F3_gnd_rows": len(gys), "F3_single_row": f3_onerow,
            "F3_on_bottom_row": f3_bottom,
            "F4_frac_below_spine": f4,
            "offsheet_symbols": len(off),
        })
    json.dump(rows, open(os.path.join(HERE, "idiom.json"), "w"), indent=2)
    hdr = ["tag", "paper", "F1_spine_mm", "F1_spine_frac_of_width",
           "F2_in_left_of_out", "F3_gnd_rows", "F3_on_bottom_row",
           "F4_frac_below_spine", "offsheet_symbols"]
    w = [22, 6, 12, 10, 8, 6, 8, 8, 6]
    print(" ".join(h[:x].ljust(x) for h, x in zip(hdr, w)))
    for r in rows:
        print(" ".join(str(r[h])[:x].ljust(x) for h, x in zip(hdr, w)))


if __name__ == "__main__":
    main()
