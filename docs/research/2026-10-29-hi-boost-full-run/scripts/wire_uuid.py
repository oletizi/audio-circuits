"""Print the uuid of each wire, keyed by its endpoints.

The uuids are what akcli deletes by, so a MISSING line here is a wire a repair
pass cannot reach - and the pattern this script used to carry ran from the
`(pts` past the stroke to the `(uuid`, which is the shape that silently dropped
23 of `pultec-hi-cut`'s 77 wires. It said nothing about the 23, and a tool whose
job is to hand out uuids has no business returning a short list. It reads
through `docs/research/lib/kicad_sheet.py` now, which refuses when its parse
does not account for every `(wire` token in the source.

usage: wire_uuid.py <sheet.kicad_sch> [<substring of an endpoint key> ...]
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "lib"))
import kicad_sheet  # noqa: E402

sheet = kicad_sheet.read(sys.argv[1])
want = sys.argv[2:]

wires = sheet.wires()
shown = 0
for w in wires:
    key = f"({w.x1:g}, {w.y1:g})-({w.x2:g}, {w.y2:g})"
    if want and not any(s in key for s in want):
        continue
    shown += 1
    if w.uuid is None:
        raise SystemExit(
            f"the wire {key} carries no (uuid, so akcli cannot be told to delete "
            f"it - fix the sheet rather than printing a blank")
    print(f"{key:44s} {w.uuid}")

print(f"{shown} of {len(wires)} wires shown; every '(wire' token in the file is "
      f"accounted for")
