"""Boxes for the tight spots and the unoccupied regions on the Letter page.

These are the numbers the sheet cannot give: how close a global label's TAG comes
to the group rectangle it sits in, how wide a capacitor's value draws against its
own plate and the next one's, and where the page is empty. Every box is derived
from `arrangement.py`'s literals so it cannot drift from what it measures.

TWO BOXES HERE WERE WRONG ON THEIR FIRST RUN and the corrections are kept rather
than tidied away, because both are the same mistake in opposite directions:

  - "VOID upper-left" started at y 73.5 and caught the group's own `Mid`
    HEADING, reporting 7.832 mm of ink in a box asserted empty. Moved to 78.0 it
    still caught ONE PIXEL ROW of the same heading - 0.085 mm tall, 111 pixels -
    because the heading is drawn larger than body text and its glyph bottoms
    reach y 78.08. It starts at 79.0. A 0.085 mm reading is the check being
    useful: at any coarser resolution it would have passed while the box was
    still describing the wrong region.
  - "VOID band under A" asserted that the strip at y 99..101 under tier A's
    buses is empty. It is not: that is exactly where the seventeen RISERS run.
    There is no void there and the box was describing a region this writer had
    imagined rather than looked at. Deleted rather than adjusted.

A box asserted empty that finds ink is the check working. The failure mode to
fear is the opposite - a box asserted empty that is empty because it fell off
the page - which is why `inkmeasure.py` also carries a box asserted to hold ink.

usage: maketightboxes.py <sheet.kicad_sch> <out.json>
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import arrangement as A  # noqa: E402
import kicad_sheet       # noqa: E402

HALF_STROKE = 0.127


def main():
    sheet = kicad_sheet.read(sys.argv[1])
    boxes = [
        # The section's input tag against the group rectangle's west edge.
        {"tag": "hi_boost_out tag", "x1": A.MID_X1 + 0.4, "y1": A.SW1_Y - 3.6,
         "x2": A.IN_LABEL[0] + 0.8, "y2": A.SW1_Y + 3.6, "expect": "ink"},
        # The return's `in` tag against the rectangle's east edge.
        {"tag": "in tag", "x1": A.IN_NODE[0] + 0.13, "y1": A.IN_NODE[1] - 3.3,
         "x2": A.MID_X2 - 0.4, "y2": A.IN_NODE[1] + 3.3, "expect": "ink"},
        # SW2's pin numbers beside the two return-leg labels.
        {"tag": "SW2 pin1 + boost_return", "x1": A.SW2_BOOST[0] - 3.4,
         "y1": A.SW2_BOOST[1] - 1.4, "x2": A.SW2_BOOST[0] + 18.0,
         "y2": A.SW2_BOOST[1] + 1.4, "expect": "ink"},
        {"tag": "SW2 pin3 + cut_return", "x1": A.SW2_CUT[0] - 3.4,
         "y1": A.SW2_CUT[1] - 1.4, "x2": A.SW2_CUT[0] + 18.0,
         "y2": A.SW2_CUT[1] + 1.4, "expect": "ink"},
        # The three unoccupied regions inside the Mid rectangle, each bounded by
        # the drawing rather than guessed at: see the module docstring.
        {"tag": "VOID upper-left", "x1": A.MID_X1 + 1.0, "y1": 79.0,
         "x2": A.BANK_X0 - 2.5, "y2": A.TAP_A_Y + 4.5, "expect": "empty"},
        {"tag": "VOID lower-left", "x1": A.MID_X1 + 1.0, "y1": 148.0,
         "x2": A.RAIL_B_WEST - 10.0, "y2": A.MID_Y2 - 1.0, "expect": "empty"},
        {"tag": "VOID lower-right", "x1": A.X_JOIN + 2.0, "y1": 146.0,
         "x2": A.MID_X2 - 1.0, "y2": A.MID_Y2 - 1.0, "expect": "empty"},
        {"tag": "CONTROL ink at SW1", "x1": A.SW1_X - 14.0,
         "y1": A.SW1_Y - 16.0, "x2": A.SW1_X + 15.0, "y2": A.SW1_Y + 14.0,
         "expect": "ink"},
    ]
    # Every capacitor's value, measured against its OWN plate and the NEXT
    # capacitor's. The anchors come from the sheet so the box follows the field.
    for s in sheet.symbols():
        if s.lib_id != "Device:C" or not s.ref.startswith("C"):
            continue
        for f in s.fields:
            if f.name == "Value" and not f.hidden:
                boxes.append({"tag": "%s %s" % (s.ref, f.text),
                              "x1": round(f.x - 3.4, 3),
                              "y1": round(f.y - 1.05, 3),
                              "x2": round(f.x + 5.0, 3),
                              "y2": round(f.y + 1.05, 3),
                              "expect": "ink"})
    json.dump({"dpi": 600, "boxes": boxes}, open(sys.argv[2], "w"), indent=1)
    print("%d boxes -> %s" % (len(boxes), sys.argv[2]))


main()
