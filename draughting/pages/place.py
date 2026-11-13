"""Write op-list 01 for one block page from its layout.py (`page.place_ops`).

usage: python3 place.py <block-dir> <draft.kicad_sch> > 01-place.json
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import page  # noqa: E402

if len(sys.argv) != 3:
    raise SystemExit("usage: python3 place.py <block-dir> <draft.kicad_sch>")
print(page.place_ops(sys.argv[2], page.load_layout(sys.argv[1])))
