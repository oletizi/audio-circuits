"""Does every sheet symbol on a root lie on US Letter's paper: inside the inner frame and clear of
the title block? (Ruling CR-MODULE-ROOT-FITS-LETTER, Task 7e fix round 1.)

`draughting/measure/paper_fit.py` measures wire ends, symbol origins, label anchors and rectangles,
but not a `(sheet ...)` box, so on a root it can report "fits: yes" while a sheet box runs off the
page. This reads every top-level `(sheet (at x y) (size w h) ...)` node and checks the whole box.

The frame is paper_fit.py's FRAME_X and FRAME_Y (imported, not copied); the title block is
`docs/research/2026-10-30-letter-repaper.md` section 3, US Letter landscape, KiCad 10.0.5.

usage: root_sheets_fit.py <root.kicad_sch>
prints one line per sheet and "sheets on the paper: N of N"; exits 1 when any sheet is off the
frame or on the title block, or when the root holds no sheet at all.
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[5]
sys.path.insert(0, str(ROOT / "draughting" / "measure"))
import kicad_sheet  # noqa: E402

FRAME_X = (11.980, 267.377)
FRAME_Y = (11.980, 203.877)
TITLE_BLOCK = (159.300, 171.831, 267.250, 203.750)  # x0, y0, x1, y1


def check_frame_constants():
    """Refuse if paper_fit.py's frame has moved away from the one this file states."""
    text = (ROOT / "draughting" / "measure" / "paper_fit.py").read_text()
    for want in (f"FRAME_X = ({FRAME_X[0]:.3f}, {FRAME_X[1]:.3f})", f"FRAME_Y = ({FRAME_Y[0]:.3f}, {FRAME_Y[1]:.3f})"):
        if want not in text:
            sys.exit(f"root_sheets_fit.py: paper_fit.py no longer states {want}; re-measure and update both files together")


def main():
    if len(sys.argv) != 2:
        sys.exit("usage: root_sheets_fit.py <root.kicad_sch>")
    check_frame_constants()
    doc = kicad_sheet.read(sys.argv[1])
    sheets = list(doc.root.kids("sheet"))
    if not sheets:
        sys.exit(f"root_sheets_fit.py: {sys.argv[1]} holds no (sheet ...) node - is it a root?")
    off = 0
    for node in sheets:
        at, size = node.kid("at"), node.kid("size")
        name = next((p.atoms[1] for p in node.kids("property") if p.atoms and p.atoms[0] == "Sheetname"), "?")
        if at is None or size is None:
            sys.exit(f"root_sheets_fit.py: sheet {name} has no (at) or (size)")
        x0, y0 = float(at.atoms[0]), float(at.atoms[1])
        x1, y1 = x0 + float(size.atoms[0]), y0 + float(size.atoms[1])
        faults = []
        if x0 < FRAME_X[0] or x1 > FRAME_X[1] or y0 < FRAME_Y[0] or y1 > FRAME_Y[1]:
            faults.append("off the inner frame")
        tx0, ty0, tx1, ty1 = TITLE_BLOCK
        if x0 < tx1 and tx0 < x1 and y0 < ty1 and ty0 < y1:
            faults.append("on the title block")
        off += 1 if faults else 0
        print(f"  {name}: x {x0:.3f} .. {x1:.3f}, y {y0:.3f} .. {y1:.3f}  {'FAIL - ' + ', '.join(faults) if faults else 'on the paper'}")
    print(f"sheets on the paper: {len(sheets) - off} of {len(sheets)}")
    if off:
        sys.exit(1)


main()
