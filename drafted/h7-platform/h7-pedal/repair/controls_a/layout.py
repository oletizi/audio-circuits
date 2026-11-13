"""The h7-pedal controls_a page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/controls.ts`, `controlsABlock`): control positions 1 to 3, each
as CR-PEDAL-CONTROL-NODE draws it. The arrangement, its rows and columns, its field placements and its
one crossing are `../tools/controls_page.py`'s, shared with controls_b; this file names the parts.

Designators, from the intent (position n: pot, R_PUn, button, R_BTNn, R_POSn, C_POSn):
POS1 RV1, R52, SW1, R53, R54, C49; POS2 RV2, R55, SW2, R56, R57, C50; POS3 RV3, R58, SW3, R59, R60, C51.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tools"))
import controls_page  # noqa: E402

PORTS = ("POS1", "POS2", "POS3")
POSITIONS = (
    {"pot": "RV1", "pu": "R52", "sw": "SW1", "rbtn": "R53", "rpos": "R54", "cpos": "C49"},
    {"pot": "RV2", "pu": "R55", "sw": "SW2", "rbtn": "R56", "rpos": "R57", "cpos": "C50"},
    {"pot": "RV3", "pu": "R58", "sw": "SW3", "rbtn": "R59", "rpos": "R60", "cpos": "C51"},
)

# ref: (x, y, rotation, mirror)
PARTS = controls_page.parts(POSITIONS)
FIELDS = controls_page.field_plan(POSITIONS)
RECT = controls_page.RECT
TITLE = "h7-pedal: controls_a"
PWR_FLAGS = 0

# The page note (`page.Wiring.note`, left-justified by `text_edits.py`): CR-PEDAL-POPULATION's
# variant positions and CR-PEDAL-CONTROL-NODE require it to say that exactly one fit is placed per
# position; each part named is this page's designator.
NOTES = [(controls_page.note(PORTS, POSITIONS), controls_page.NOTE_AT)]
