"""Write op-list 03 for the power page: one PWR_FLAG on VIN_BUCK and one on GND.

WHY. U2's VIN (pin 3, on VIN_BUCK) and GND (pin 4) are KiCad power inputs, and nothing on this
page or anywhere in the module has a power OUTPUT pin on either net: VIN_BUCK is fed through L1,
GND reaches the module through connector pins, both passive. Without a flag `kicad-cli sch erc`
reports `power_pin_not_driven` on both, as ERRORS, on the draft as on the repair. A PWR_FLAG states
that the net is driven from outside the page, which here is true: VIN_MOD (through L1) and GND come
in through the interface.

WHAT IT IS NOT. A PWR_FLAG joins no two nets by name: measured on a copy of the two-block fixture
with a PWR_FLAG on block a's private FB and one on block b's, both labelled "FB" - kicad-cli's root
export kept /a/FB and /b/FB as two nets, the same four nets as the unedited copy, and ERC on that
root reported 0 errors and 0 warnings. A rail power symbol (power:GND, power:+3V3) DOES join every
sheet by name, which is why a block page draws none (TOOLING.md C3); this page still draws none.
It is a symbol from KiCad's `power` library, so the controller's ruling that a block page draws no
power symbols is put to the controller with this measurement (task-7a report).

Each flag sits on an existing wire end, so it adds a connection at a point that already is one:
VIN_BUCK's at C28's tap on the VIN_BUCK row, pointing up; GND's at U2's tap on the GND row,
pointing down.

usage: python3 03-pwr-flags.py <pins.json> <sheet-file-name> > 03-pwr-flags.json
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from layout import Y_GND, Y_VIN  # noqa: E402

if len(sys.argv) != 3:
    raise SystemExit("usage: python3 03-pwr-flags.py <pins.json> <sheet-file-name>")
PINS = json.loads(pathlib.Path(sys.argv[1]).read_text())
c28 = PINS["C28"]["1"][0]
u2_gnd = PINS["U2"]["4"][0]
ops = [
    {"op": "place_pwr_flag", "at": [c28, Y_VIN], "rotation": 0},
    {"op": "place_pwr_flag", "at": [u2_gnd, Y_GND], "rotation": 180},
]
print(json.dumps({"protocol_version": 2, "target_format": "kicad", "target_file": sys.argv[2],
                  "ops": ops}, indent=1))
