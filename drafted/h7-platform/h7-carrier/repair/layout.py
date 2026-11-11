"""The h7-carrier repair's placement, in mils, sheet coordinates (x east, y south).

Shared by 01-place.py (which writes the delete-and-place op-list) and 02-wire.py (which writes the
wiring op-list from the pins akcli reports after 01 is applied). Nothing here is computed from the
draft: every number is a placement chosen for this page.
"""

# ref: (x, y, rotation, mirror)
PARTS = {
    # B band (contract pins 21-40): socket J2 west, pins east; breakout J4 east, pins west.
    "J2": (5600, 2100, 0, "y"),
    "J4": (9800, 2100, 0, "none"),
    # A band (contract pins 1-20), below B.
    "J1": (5600, 5400, 0, "y"),
    "J3": (9800, 5400, 0, "none"),
    # USB path, west to east: receptacle, ESD between the D+ line (north) and D- line (south),
    # switch with its port-1 side west.
    "J6": (1300, 3400, 0, "none"),
    "U2": (3400, 4200, 0, "none"),
    "U1": (4800, 3900, 0, "y"),
    "R5": (2500, 3250, 0, "none"),   # CC2 Rd
    "R4": (2800, 3150, 0, "none"),   # CC1 Rd
    "C3": (3800, 2950, 0, "none"),   # C_VBUS
    "C1": (4400, 3250, 0, "none"),   # U1 VCC bypass
    "R6": (700, 4550, 0, "none"),    # shield R
    "C2": (1000, 4550, 0, "none"),   # shield C
    "R1": (7400, 3950, 0, "none"),   # OE pull-up
    # B taps hanging below the B band.
    "TP5": (7700, 3300, 180, "none"),
    "TP6": (8000, 3300, 180, "none"),
    "TP7": (8300, 3300, 180, "none"),
    "TP8": (8600, 3300, 180, "none"),
    "R2": (9250, 3300, 270, "none"),  # VBUS -> sense, pin 1 east
    "R3": (9100, 3450, 0, "none"),    # sense -> GND
    # Power entry, dummy loads and rail test points, north-west.
    "J5": (800, 1600, 0, "y"),
    "F1": (1300, 1600, 90, "none"),
    "TP1": (1650, 1600, 0, "none"),
    "J7": (2400, 1600, 0, "y"),
    "TP2": (2800, 1600, 0, "none"),
    "R7": (2700, 1850, 0, "none"),
    "J8": (3400, 1600, 0, "y"),
    "TP3": (3800, 1600, 0, "none"),
    "R8": (3700, 1850, 0, "none"),
    "TP4": (4400, 1600, 0, "none"),
}

# Power symbols and flags: designator -> (x, y, rotation). Each reuses a symbol copperhead
# placed on the same net; the rest are deleted.
POWER = {
    # 3V3_D
    "#PWR01": (5800, 2900, 270),   # J2.18, pointing east
    "#PWR02": (9600, 2900, 90),    # J4.18, pointing west
    "#PWR03": (4800, 3100, 0),     # U1 VCC / C1
    "#PWR04": (7400, 3800, 0),     # R1
    "#PWR05": (3100, 1600, 0),     # J7 pin 1
    # GND
    "#PWR08": (5800, 3100, 0),     # J2.20
    "#PWR09": (9600, 3100, 0),     # J4.20
    "#PWR10": (7300, 6400, 0),     # A band row 20
    "#PWR11": (9100, 3600, 0),     # R3
    "#PWR12": (5300, 4200, 0),     # U1 S
    "#PWR13": (4800, 4300, 0),     # U1 GND
    "#PWR14": (4400, 3400, 0),     # C1
    "#PWR15": (3400, 4500, 0),     # U2 GND
    "#PWR16": (3800, 3100, 0),     # C3
    "#PWR17": (2800, 3300, 0),     # R4
    "#PWR18": (2500, 3400, 0),     # R5
    "#PWR19": (1300, 4300, 0),     # J6 GND
    "#PWR20": (1000, 4700, 0),     # shield R6 / C2
    "#PWR21": (1100, 1700, 0),     # J5 pin 2
    "#PWR22": (2700, 2000, 0),     # R7
    "#PWR23": (3700, 2000, 0),     # R8
    "#PWR24": (4400, 1800, 0),     # TP4
    # VBUS
    "#PWR25": (3800, 2800, 0),     # receptacle rail / C3
    "#PWR26": (9400, 3300, 0),     # R2
    "#PWR27": (3400, 4000, 0),     # U2 VBUS
    # VIN_MOD
    "#PWR29": (5800, 3000, 270),   # J2.19
    "#PWR30": (9600, 3000, 90),    # J4.19
    "#PWR31": (2000, 1600, 0),     # F1 out
    # VREF_A
    "#PWR33": (6300, 1200, 0),     # B band row 1
    "#PWR34": (4100, 1600, 0),     # J8 pin 1
    # PWR_FLAGs, one per rail, on that rail's symbol point.
    "#FLG01": (3100, 1600, 180),   # 3V3_D
    "#FLG02": (4400, 1800, 90),    # GND
    "#FLG03": (3800, 2800, 270),   # VBUS
    "#FLG04": (2000, 1600, 180),   # VIN_MOD
    "#FLG05": (4100, 1600, 180),   # VREF_A
}

DELETE_POWER = ["#PWR06", "#PWR07", "#PWR28", "#PWR32", "#PWR35", "#PWR36"]

# Columns 02-wire.py draws on.
LABEL_X = 6000                      # one local label per band row, just east of the socket's pins
B_TAPS = {17: 6800, 16: 7000, 12: 7700, 13: 8000, 14: 8300, 15: 8600, 11: 9100}
A_TAP_X = 7200                      # USB_EN_N, up from the A band to OE
B_ROW1_SYMBOL_X = 6300              # VREF_A symbol on the B band's row 1
A_ROW20_SYMBOL_X = 7300             # GND symbol on the A band's row 20
