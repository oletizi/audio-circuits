"""Write op-list 02 for the h7-pedal controls_a page (`draughting/pages/page.py`, `Wiring`). The
wiring is `../tools/controls_page.py`'s, shared with controls_b; layout.py names the parts. The page
note is layout.NOTES.

Each label is LOCAL here; op-list 04 makes it the block's hierarchical label. Every segment ends at
the next tap, since a wire end inside another segment is refused.

usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out> > 02-wire.json
"""
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[4] / "draughting" / "pages"))
sys.path.insert(0, str(HERE.parent / "tools"))
sys.path.insert(0, str(HERE))
import controls_page  # noqa: E402
import page  # noqa: E402
import title_block  # noqa: E402
from layout import NOTES, PORTS, POSITIONS, TITLE  # noqa: E402

if len(sys.argv) != 5:
    raise SystemExit("usage: python3 02-wire.py <pins.json> <ports.json> <sheet-file-name> <nets-sidecar-out>")
w = page.Wiring(sys.argv[1], HERE / "intent.json", sys.argv[2])
controls_page.wire(w, POSITIONS, PORTS)
for lines, at in NOTES:
    w.note(lines, at)
print(w.op_list(sys.argv[3], TITLE, title_block, sys.argv[4]))
