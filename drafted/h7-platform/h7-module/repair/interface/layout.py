"""The interface page's placement, in mils, sheet coordinates (x east, y south).

Read by `../tools/place.py` (op-list 01), `02-wire.py` and `../tools/text_edits.py`. Nothing here is
computed from the draft.

The page holds the two 1 x 20 module headers, J1 (contract pins 1-20) and J2 (contract pins 21-40),
side by side, J1 west of J2, each upright with pin 1 at the top and its pins facing west. Each pad
with a signal runs west by one stub to its hierarchical label, so the labels stand in two columns,
one per header; J1's pads 16-19 carry no-connects (the contract's reserved pins). The two GND
pads, J1.20 and J2.20, are the one net on the page with two pins: GND's label is J1.20's, in J1's
column like every other pad's, and J2.20 joins it along a row under both headers.
"""
import json
import pathlib

from page import above

# ref: (x, y, rotation, mirror). Connector_Generic:Conn_01x20 at rotation 0: pins on the west side,
# 200 mil west of the origin, pin 1 at the top (900 mil above the origin), 100 mil pitch.
PARTS = {
    "J1": (4700, 4200, 0, "none"),
    "J2": (7300, 4200, 0, "none"),
}

STUB = 300            # each pad's wire west to its label
TEE = 150             # where J2.20's return meets J1.20's stub, west of J1.20
Y_GND_BELOW = 300     # the GND return row, this far below pad 20

# Both fields centred above each header (pin 1 is 22.86 mm above the origin), clear of the GND
# return row under the headers.
FIELDS = {
    "J1": above(29.21, 26.67),
    "J2": above(29.21, 26.67),
}
RECT = (63.5, 63.5, 195.58, 148.59)
TITLE = "h7-module: interface"
PWR_FLAGS = 0
# Every signal pad's port reaches one pin, so copperhead drafted no wire for it and the draft gives
# its net no stroke. Each takes copperhead's stroke for a net of no colour family, the stroke the
# draft's one drawn net (GND) carries: the draft has no wire for these nets to read a family from.
# The ports are ports.json's, which the replay generates from the model before this is read.
UNDRAWN_STROKE = "(stroke (width 0.254) (type default))"
PORTS = json.loads((pathlib.Path(__file__).resolve().parent / "ports.json").read_text())
UNDRAWN_STROKES = {p["name"]: UNDRAWN_STROKE for p in PORTS if not p["drafted"]}
