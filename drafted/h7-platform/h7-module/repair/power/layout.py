"""The power page's placement, in mils, sheet coordinates (x east, y south).

Shared by 01-place.py (the delete-and-place op-list) and 02-wire.py (the wiring op-list, from the
pins akcli reports after 01 is applied). Nothing here is computed from the draft: every number is
a placement chosen for this page.

The page reads west to east: VIN_MOD enters on the west edge, L1 feeds the VIN_BUCK row, which
carries the damping leg (R3, C29) and the input capacitors (C26, C27, C28) down to the GND row and
reaches U2's VIN; U2's SW leaves east through L2 to the 3V3_D row, which carries the output
capacitors (C32 to C35) and leaves on the east edge. The EN divider (R4, R5) takes VIN_MOD along
a row above the input network and comes down to EN; that descent crosses the VIN_BUCK row once.
"""

# Rows.
Y_TOP = 3200      # VIN_MOD to R4, above the input network
Y_VIN = 3700      # VIN_MOD and VIN_BUCK; U2's VIN and BST pins sit on it
Y_EN = 3800       # U2's EN pin
Y_SW = 4000       # U2's SW pin, L2, and the 3V3_D row
Y_FB = 4300       # U2's FB pin, the feedback divider's tap
Y_GND = 4800      # the GND row under every part that returns to GND

# Columns.
X_PORT_WEST = 1200    # VIN_MOD and GND ports
X_VIN_MOD_TAP = 1500  # VIN_MOD splits: east to L1, north to R4
X_EN = 4500           # the EN descent and R5
X_SW_TAP = 7150       # C30 comes down to the SW row
X_PORT_EAST = 9900    # 3V3_D port

# ref: (x, y, rotation). Device:R/C/L at rotation 0 has pin 1 north and pin 2 south; at
# rotation 90, pin 1 west and pin 2 east (checked by pins.py against lib_symbols).
PARTS = {
    "L1": (2000, Y_VIN, 90),
    # damping leg: R3 from VIN_BUCK, C29 (+, pin 1, up) to GND
    "R3": (2500, 3950, 0),
    "C29": (2500, 4450, 0),
    "C26": (2950, 4250, 0),
    "C27": (3350, 4250, 0),
    "C28": (3750, 4250, 0),
    "R4": (2900, Y_TOP, 90),
    "R5": (X_EN, 4150, 0),
    "C31": (5000, 4250, 0),
    "U2": (5800, 4000, 0),
    "R6": (6500, Y_VIN, 90),
    "C30": (7000, Y_VIN, 90),
    "L2": (7550, Y_SW, 90),
    "R7": (7900, 4150, 0),
    "R8": (7900, 4550, 0),
    "C32": (8300, 4400, 0),
    "C33": (8700, 4400, 0),
    "C34": (9100, 4400, 0),
    "C35": (9500, 4400, 0),
}
