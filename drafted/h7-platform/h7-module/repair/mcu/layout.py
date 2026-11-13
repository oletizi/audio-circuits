"""The mcu page's placement, in mils, sheet coordinates (x east, y south).

Read by `draughting/pages/place.py` (op-list 01), `02-wire.py` and `draughting/pages/text_edits.py`. Nothing here is
computed from the draft.

U1 (the stock `MCU_ST_STM32H7:STM32H743IITx`, one unit of 176 pins) stands at ROTATION 90. Why, as a
measurement: at rotation 0 the symbol alone, pin end to pin end, is 9100 mil (231.14 mm) tall,
against a US Letter landscape sheet 215.9 mm tall and an inner frame 191.9 mm tall
(`draughting/measure/paper_fit.py`), so part of the symbol lies off the paper and no render of the
page shows it. A layout at rotation 0 was built and measured (RECORD.md: 72.983 mm overshoot south).
At rotation 90 the symbol is 231.14 mm wide and 71.12 mm tall, against a frame 255.4 mm wide.

At rotation 90 (counter-clockwise on the page) the symbol's faces turn: its top supply pins face
WEST (VDDA at the north end, VBAT at the south end), its west pins face SOUTH (NRST at the west end,
VCAP at the east end), its east pins face NORTH (PA0 at the west end, PE15 at the east end), and its
bottom pins face EAST (VSSA north of the twelve stacked VSS pins).

- Every one-pin signal runs straight out, north or south, by one 300 mil stub to its hierarchical
  label. Every NC pin carries the intent's no-connect and no wire.
- The 16 west 3V3_D pins (VBAT, VDD, VDD33_USB) run 200 mil west to a 3V3_D bus, which runs south
  past the bottom label row, east to a point under PDR_ON (pin 171, south face) and up to it, with a
  stub down to 3V3_D's hierarchical label.
- VDDA (pin 39, the north end of the west face, north of every 3V3_D pin) runs west past the 3V3_D
  bus's north end to a VREF_A bus, which runs south, east to a point under VREF+ (pin 38, south face)
  and up to it, with a stub down to VREF_A's hierarchical label. Around the body the four pins come
  in the order 3V3_D (west face), VREF_A (39), 3V3_D (171), VREF_A (38), reading clockwise from
  VBAT, so two nets drawn outside the body must cross once: the VREF_A row crosses the 3V3_D bus,
  at (X_W_3V3, Y_VREF_ROW).
- VCAP's two pins (81 and 125, south face, adjacent) join at a tee and run down to VCAP's label.
- GND (the stacked VSS point, east face) and VSSA (pin 37, north of it) each run 100 mil east and
  then turn, GND down and VSSA up, to a label.
"""
import json
import pathlib

from page import fields

X0, Y0 = 5650, 4000      # U1's origin
X_W_3V3 = X0 - 4800      # the 3V3_D bus (U1's west pins are at X0 - 4600)
X_W_VREF = X0 - 4900     # the VREF_A bus, west of it
Y_N_LABEL = Y0 - 1700    # the north signal labels (U1's north pins are at Y0 - 1400)
Y_S_LABEL = Y0 + 1700    # the south signal labels (U1's south pins are at Y0 + 1400)
Y_VREF_ROW = Y0 + 2300   # VREF_A's row under the south labels, east to VREF+
Y_3V3_ROW = Y0 + 2500    # 3V3_D's row under it, east to PDR_ON
Y_RAIL_LABEL = Y0 + 2800  # 3V3_D's and VREF_A's labels, at the foot of their buses
Y_VCAP_TEE = Y0 + 1500   # where VCAP's two pins meet
X_E_TURN = X0 + 4600     # GND and VSSA turn here (U1's east pins are at X0 + 4500)
E_LABEL_DROP = 300       # GND's label 300 mil below its pin, VSSA's 300 mil above

# ref: (x, y, rotation, mirror).
PARTS = {
    "U1": (X0, Y0, 90, "none"),
}
# Offsets in mm: Reference over Value, centred in the body, where no pin name reaches.
FIELDS = {
    "U1": fields((0, -1.27, None), (0, 1.27, None)),
}
RECT = (13.97, 33.02, 265.43, 185.42)
TITLE = "h7-module: mcu"
PWR_FLAGS = 0
# The 86 ports reaching one pin each have no wire on the draft and so no stroke. Every net the draft
# draws on this page (3V3_D, GND, VCAP, VREF_A) carries copperhead's default stroke, and none of
# those is a colour family. Taking a colour copperhead never drew would be this page's invention, so
# every one-pin net takes that default stroke (the qspi and sdram pages' rule).
DEFAULT_STROKE = "(stroke (width 0.254) (type default))"
# The ports are ports.json's, which the replay generates from the model before this is read (the
# interface page's form).
PORTS = json.loads((pathlib.Path(__file__).resolve().parent / "ports.json").read_text())
UNDRAWN_STROKES = {p["name"]: DEFAULT_STROKE for p in PORTS if not p["drafted"]}
