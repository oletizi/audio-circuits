"""The h7-pedal controls_b page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`.
Nothing here is computed from the draft.

The block (`circuits/h7-platform/pedal/controls.ts`, `controlsBBlock`): control positions 4 to 6, each
as CR-PEDAL-CONTROL-NODE draws it. The arrangement, its rows and columns, its field placements and its
one crossing are `../tools/controls_page.py`'s, shared with controls_a; this file names the parts.

Designators, from the intent (position n: pot, R_PUn, button, R_BTNn, R_POSn, C_POSn):
POS4 RV4, R61, SW4, R62, R63, C52; POS5 RV5, R64, SW5, R65, R66, C53; POS6 RV6, R67, SW6, R68, R69, C54.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "tools"))
import controls_page  # noqa: E402

PORTS = ("POS4", "POS5", "POS6")
POSITIONS = (
    {"pot": "RV4", "pu": "R61", "sw": "SW4", "rbtn": "R62", "rpos": "R63", "cpos": "C52"},
    {"pot": "RV5", "pu": "R64", "sw": "SW5", "rbtn": "R65", "rpos": "R66", "cpos": "C53"},
    {"pot": "RV6", "pu": "R67", "sw": "SW6", "rbtn": "R68", "rpos": "R69", "cpos": "C54"},
)

# ref: (x, y, rotation, mirror)
PARTS = controls_page.parts(POSITIONS)
FIELDS = controls_page.field_plan(POSITIONS)
RECT = controls_page.RECT
TITLE = "h7-pedal: controls_b"
PWR_FLAGS = 0

# The page note (`page.Wiring.note`, left-justified by `text_edits.py`): CR-PEDAL-POPULATION's
# variant positions and CR-PEDAL-CONTROL-NODE require it to say that exactly one fit is placed per
# position; each part named is this page's designator.
NOTES = [(controls_page.note(PORTS, POSITIONS), controls_page.NOTE_AT)]
