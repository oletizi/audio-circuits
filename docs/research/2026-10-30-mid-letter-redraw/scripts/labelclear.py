"""How a local label's rendered TEXT sits against the WIRES that run past it.

WHY THIS CHECK EXISTS. The approved page anchors each `selN` label east of where
the run above it ends, so no label's text shares rows with another run. A folded
bank has a descending tier where that rule has no solution: the run above
extends further east than the run the label sits on. Whether KiCad leaves
daylight between a label's glyphs and a wire 2.54 mm away is a question only the
render answers - `akcli check --layout` is wrong in both directions on this
family of page, and nothing on the sheet sees a label drawn over a wire at all.

IT TAKES THE WIRES FROM THE SHEET AND ONLY THE TEXT FROM THE RENDER, and that
split is a correction. The first version classified both by colour, and it could
not be made to work: KiCad draws a capacitor's Reference and Value in teal
`(0,100,100)` and this page draws its tap buses in teal `(0,130,120)`, so no
colour test separates "a bus wire" from "a capacitor's own label". It reported
35 rows of wire ink through `sel11` where the thing in the box was C16's
Reference, 2.2 mm apart. The sheet already knows where every wire is to the
micron; the render is needed only for how wide and how tall a glyph draws.

A local label's text renders near-BLACK, `(15,15,15)` measured, unless the
restyle pass gave it a net colour. So this check covers the eleven `selN`
labels, which carry none, and does not cover the five `tap_*` labels, which do.

CONTROLS, both required to pass:
  - a box over empty paper must report no text ink.
  - A PERTURBATION, because a box cannot manufacture an overlap on a page that has none.
    An earlier attempt put a control box over the rail that `coil_return` is
    anchored to, expecting shared rows, and the detector correctly reported the
    two 0.212 mm apart - a local label's text is never in its own wire's rows.
    So the control flips one named label's justify from `bottom` to `top` in a
    copy of the sheet, which this run measured as drawing the wire through the
    glyphs, and asserts the detector then reports the overlap. A control has to
    perturb the same KIND of object the check counts.

ON THE NAME: it is "label CLEARANCE", a distance between two pieces of ink,
and not the forbidden adjective. `EVALUATING-DRAWINGS.md` rule 2 bans a
vocabulary of QUALITY about a drawing; this file reports millimetres and
refuses, and it never says whether a page is anything. The word is left in
the filename rather than renamed across three pushed commits, and the reason
is written here so an audit of that vocabulary finds it.

usage: labelclear.py <sheet.kicad_sch> <boxes.json>
"""
import json
import pathlib
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

KC = "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli"
HALF_STROKE = 0.127      # a 0.254 mm wire is drawn 0.127 either side of its y


def render(sch, out, dpi):
    pdf = out / "page.pdf"
    subprocess.run([KC, "sch", "export", "pdf", "-o", str(pdf), sch],
                   check=True, capture_output=True)
    png = out / "page.png"
    subprocess.run(["magick", "-density", str(dpi), str(pdf),
                    "-background", "white", "-alpha", "remove", str(png)],
                   check=True, capture_output=True)
    arr = np.asarray(Image.open(png).convert("RGB")).astype(int)
    if (arr.sum(axis=2) < 600).sum() == 0:
        raise SystemExit("REFUSING: the render holds no ink at all. A 16-bit "
                         "I;16 grey PNG converted to 'L' reads as all 255.")
    return arr


def text_rows(img, b, ppmm):
    """Pixel rows in the box holding near-BLACK ink, which is label text."""
    x0, x1 = int(round(b["x1"] * ppmm)), int(round(b["x2"] * ppmm))
    y0, y1 = int(round(b["y1"] * ppmm)), int(round(b["y2"] * ppmm))
    if x0 < 0 or y0 < 0 or x1 > img.shape[1] or y1 > img.shape[0]:
        raise SystemExit("REFUSING: box %s falls outside the render" % b["tag"])
    sub = img[y0:y1, x0:x1]
    mx, mn = sub.max(axis=2), sub.min(axis=2)
    black = (mx < 110) & (mx - mn <= 25)
    idx = np.where(black.any(axis=1))[0]
    if not len(idx):
        return None
    return (b["y1"] + idx[0] / ppmm, b["y1"] + (idx[-1] + 1) / ppmm,
            int(black.sum()))


def wires_in_box(sheet, b):
    """[(y, x1, x2)] horizontal wires whose span crosses the box's x range."""
    out = []
    for w in sheet.wires():
        if not w.horizontal:
            continue
        lo, hi = sorted((w.x1, w.x2))
        if hi < b["x1"] or lo > b["x2"]:
            continue
        if not (b["y1"] - 1.0 <= w.y1 <= b["y2"] + 1.0):
            continue
        out.append((w.y1, lo, hi))
    return sorted(out)


def report_box(sheet, img, b, ppmm):
    tr = text_rows(img, b, ppmm)
    ws = wires_in_box(sheet, b)
    want = b.get("expect", "apart")
    if tr is None:
        ok = (want == "empty")
        print("%-26s %18s %5d %22s %9s %9s  %s"
              % (b["tag"], "-", len(ws), "-", "-", "-",
                 "NO TEXT INK as expected" if ok else "NO TEXT INK - box missed it"))
        return ok, False
    t1, t2, px = tr
    inside = [w for w in ws if t1 - HALF_STROKE < w[0] < t2 + HALF_STROKE]
    above = [w for w in ws if w[0] + HALF_STROKE <= t1]
    below = [w for w in ws if w[0] - HALF_STROKE >= t2]
    ga = max((w[0] + HALF_STROKE for w in above), default=None)
    gb = min((w[0] - HALF_STROKE for w in below), default=None)
    overlap = bool(inside)
    ok = (want == "overlap") if overlap else (want == "apart")
    print("%-26s %18s %5d %22s %9s %9s  %s"
          % (b["tag"], "%.3f..%.3f" % (t1, t2), len(ws),
             ", ".join("%.2f" % w[0] for w in ws)[:22],
             "%.3f" % (t1 - ga) if ga is not None else "-",
             "%.3f" % (gb - t2) if gb is not None else "-",
             ("WIRE AT y=%s RUNS THROUGH THE TEXT"
              % ", ".join("%.2f" % w[0] for w in inside)) if overlap else ""))
    return ok, overlap


def overlap_control(sch, spec, img_dpi, ppmm):
    oc = spec.get("overlap_control")
    if oc is None:
        raise SystemExit("REFUSING: the box list carries no overlap_control, so "
                         "a no-overlap result cannot be told from a check that "
                         "cannot fail")
    src = open(sch).read()
    needle = f'(label "{oc["label"]}" (at '
    i = src.find(needle)
    if i < 0:
        raise SystemExit(f"REFUSING: no local label {oc['label']!r} to perturb")
    j = src.index(")", src.index("(justify left bottom", i))
    perturbed = src[:i] + src[i:j].replace("(justify left bottom",
                                           "(justify left top", 1) + src[j:]
    if perturbed == src:
        raise SystemExit(f"REFUSING: {oc['label']!r} is not `justify left "
                         f"bottom`, so the perturbation changed nothing")
    box = {"tag": "CONTROL %s justify top" % oc["label"],
           "x1": oc["x"] + 0.3, "y1": oc["y"] - 3.0,
           "x2": oc["x"] + 5.6, "y2": oc["y"] + 3.0, "expect": "overlap"}
    with tempfile.TemporaryDirectory() as td:
        td = pathlib.Path(td)
        p = td / "pultec-mid.kicad_sch"
        p.write_text(perturbed)
        for extra in ("pultec-mid.kicad_pro", "sym-lib-table"):
            s = pathlib.Path(sch).with_name(extra)
            if s.exists():
                (td / extra).write_text(s.read_text())
        img = render(str(p), td, img_dpi)
        sheet = kicad_sheet.read(str(p))
        ok, fired = report_box(sheet, img, box, ppmm)
    if not fired:
        raise SystemExit("REFUSING: the overlap control did not fire, so every "
                         "no-overlap reading above means nothing")


def main():
    sch, spec_path = sys.argv[1], sys.argv[2]
    spec = json.load(open(spec_path))
    dpi = spec.get("dpi", 600)
    ppmm = dpi / 25.4
    sheet = kicad_sheet.read(sch)
    with tempfile.TemporaryDirectory() as td:
        img = render(sch, pathlib.Path(td), dpi)
    print("sheet %s" % sch)
    print("rendered %d x %d px at %d dpi; %d wires read from the sheet"
          % (img.shape[1], img.shape[0], dpi, len(sheet.wires())))
    print()
    print("%-26s %18s %5s %22s %9s %9s  %s"
          % ("tag", "text rows (mm)", "wires", "their y (mm)",
             "gap above", "gap below", "verdict"))
    failures = []
    for b in spec["boxes"]:
        ok, _ = report_box(sheet, img, b, ppmm)
        if not ok:
            failures.append(b["tag"])
    overlap_control(sch, spec, dpi, ppmm)
    print()
    if failures:
        raise SystemExit("REFUSING: %d box(es) did not match expectation: %s"
                         % (len(failures), ", ".join(failures)))
    print("every box matched its expectation, and the perturbation control fired")


main()
