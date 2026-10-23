"""EDA_TEXT::GetTextBox and the stroked-outline bounds, from the INSTALLED KiCad runtime.

Research probe for Task 1 of docs/superpowers/plans/2026-10-22-text-handling-research.md.
Nothing in lib/ or any check calls it.

  echo '{"size_nm": 1270000, "strings": ["R100", "100nF"]}' \
    | /Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/3.9/bin/python3.9 \
      tools/schgen/text-metrics/kicad-box.py

Route 2 of that task's Step 2: the installed runtime. KiCad ships only the pcbnew bindings, so the
EDA_TEXT carrying the text is a PCB_TEXT. EDA_TEXT::GetTextBox, EDA_TEXT::GetEffectiveTextShape and
the stroke font itself are all in common/, shared with eeschema, and GetTextBox takes the pen width
from GetEffectiveTextPenWidth() with NO render settings of its own - so for a single line of
non-bold 1.27 mm text the number is the number eeschema computes. THAT CLAIM IS NOT ASSUMED HERE:
probe.ts drives these outputs against the same strings measured through an eeschema SVG export
(route 3) and against the font source (route 1), and reports every disagreement.

It reports GetBuildVersion() in its own output so a reader can tell which KiCad produced the
figures, and refuses a string it cannot measure rather than returning a zero box.
"""

import json
import sys

import pcbnew


def main():
    request = json.load(sys.stdin)
    size = int(request["size_nm"])
    thickness = int(request.get("thickness_nm", 0))
    board = pcbnew.BOARD()
    out = []
    for s in request["strings"]:
        item = pcbnew.PCB_TEXT(board)
        item.SetTextSize(pcbnew.VECTOR2I(size, size))
        item.SetTextThickness(thickness)
        item.SetText(s)
        item.SetTextPos(pcbnew.VECTOR2I(0, 0))
        box = item.GetTextBox(None)
        row = {
            "text": s,
            "effective_pen_nm": item.GetEffectiveTextPenWidth(),
            "text_box_w_nm": box.GetWidth(),
            "text_box_h_nm": box.GetHeight(),
            "text_box_x_nm": [box.GetLeft(), box.GetRight()],
            "text_box_y_nm": [box.GetTop(), box.GetBottom()],
        }
        if s.strip() == "":
            # A string that draws nothing has no outline; an empty SHAPE_COMPOUND's BBox is not a
            # measurement of anything, so it is reported as absent rather than as a zero box.
            row["ink_present"] = False
        else:
            shape = item.GetEffectiveTextShape(True, pcbnew.BOX2I(), pcbnew.EDA_ANGLE(0, pcbnew.DEGREES_T))
            bb = shape.BBox()
            row["ink_present"] = True
            row["ink_w_nm"] = bb.GetWidth()
            row["ink_h_nm"] = bb.GetHeight()
            row["ink_x_nm"] = [bb.GetLeft(), bb.GetRight()]
            row["ink_y_nm"] = [bb.GetTop(), bb.GetBottom()]
        out.append(row)
    json.dump({"kicad_build": pcbnew.GetBuildVersion(), "rows": out}, sys.stdout)


main()
