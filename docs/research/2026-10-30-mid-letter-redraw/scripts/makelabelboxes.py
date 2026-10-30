"""Write the labelclear.py box list for the eleven `selN` contact labels.

The anchors come from `arrangement.py` - the same literals the ops were built
from - so a box cannot drift from the label it is measuring. The box spans the
label's own x range plus 0.3 mm of lead-in, and 3 mm either side in y, which
reaches the runs 2.54 mm above and below and nothing further.

The two controls are literals and are the point of the file: one box over empty
paper, which must report no ink of either kind, and one box over a label the
sheet is KNOWN to draw a wire through - `coil_return` sits on the rail it names,
which every local label on this page does - so the classifier is shown to call
an overlap when there is one.

usage: makelabelboxes.py <out.json>
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import arrangement as A  # noqa: E402


def main():
    boxes = []
    for k in range(1, 12):
        ax, _just = A.SEL_LABEL[k]
        ay = A.CONTACT_Y[k]
        boxes.append({"tag": f"sel{k}", "x1": round(ax + 0.3, 3),
                      "y1": round(ay - 3.0, 3), "x2": round(ax + 5.6, 3),
                      "y2": round(ay + 3.0, 3), "expect": "apart"})
    boxes.append({"tag": "CONTROL empty", "x1": 20.0, "y1": 150.0,
                  "x2": 40.0, "y2": 160.0, "expect": "empty"})
    # THE OVERLAP CONTROL IS NOT A BOX. A first attempt put one over rail A
    # where `coil_return` is anchored, expecting text and wire in shared rows -
    # and the detector correctly reported them 0.212 mm apart, because a local
    # label's text is never in its own wire's rows. A box cannot manufacture an
    # overlap on a page that has none. `labelclear.py --overlap-control` perturbs the
    # sheet instead: it flips one label's justify to `top`, which this run has
    # measured as drawing the wire through the glyphs, and asserts the detector
    # then reports the overlap. A control has to perturb the same kind of object
    # the check counts - the mid run's §9.5 lesson, one level in.
    json.dump({"dpi": 600, "boxes": boxes,
               "overlap_control": {"label": "sel8",
                                   "x": A.SEL_LABEL[8][0],
                                   "y": A.CONTACT_Y[8]}},
              open(sys.argv[1], "w"), indent=1)
    print(f"{len(boxes)} boxes + one perturbation control -> {sys.argv[1]}")
    return


main()
