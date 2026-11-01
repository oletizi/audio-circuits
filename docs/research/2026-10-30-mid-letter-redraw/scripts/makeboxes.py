"""Write the inkmeasure.py box list for a sheet's capacitor Value fields.

The boxes come from the sheet's OWN field anchors, read through the shared
reader, so a box cannot drift from the thing it is measuring. The half-extents
are literals and are printed by inkmeasure.py.

The y half-extent is 1.05 mm: the Reference sits 2.54 mm from the Value on these
sheets, so a 2.1 mm tall window around the Value anchor cannot reach it, and a
box tall enough to reach it would report the wider of the two.

usage: makeboxes.py <sheet.kicad_sch> <out.json> [extra_tag:x1,y1,x2,y2,expect ...]
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

HALF_W_WEST = 3.4      # mm west of the anchor - stops short of the own plate
HALF_W_EAST = 5.0      # mm east of the anchor
HALF_H = 1.05          # mm either side of the anchor


def main():
    sheet = kicad_sheet.read(sys.argv[1])
    boxes = []
    for s in sheet.symbols():
        if s.lib_id != "Device:C" or not s.ref.startswith("C"):
            continue
        for f in s.fields:
            if f.name != "Value" or f.hidden:
                continue
            boxes.append({"tag": "%s %s" % (s.ref, f.text),
                          "x1": round(f.x - HALF_W_WEST, 3),
                          "y1": round(f.y - HALF_H, 3),
                          "x2": round(f.x + HALF_W_EAST, 3),
                          "y2": round(f.y + HALF_H, 3),
                          "expect": "ink"})
    for extra in sys.argv[3:]:
        tag, rest = extra.split(":", 1)
        x1, y1, x2, y2, expect = rest.split(",")
        boxes.append({"tag": tag, "x1": float(x1), "y1": float(y1),
                      "x2": float(x2), "y2": float(y2), "expect": expect})
    json.dump({"dpi": 600, "boxes": boxes}, open(sys.argv[2], "w"), indent=1)
    print("%d boxes -> %s" % (len(boxes), sys.argv[2]))


main()
