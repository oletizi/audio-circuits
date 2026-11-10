# Auto‑generated schematic symbols
import sys
import os

# Get project path and import kicad schematic interface
PROJECT_PATH = os.environ['PROJECT_PATH']
sys.path.append(PROJECT_PATH)
from modules.kicad_sch_interface import *

# Define the central reference point for the layout
center_x_1, center_y_1 = 150.0, 140.0

# Placing symbols
# ----------------

# 5‑pin connector (J1) – the main input/output block
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05",
                     pos_x=center_x_1, pos_y=center_y_1,
                     reference="J1", value="Conn_01x05", rotation=0, mirror=None)

# 10‑pF capacitor (C10) – part of the lo‑boost chain
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (-45), pos_y=center_y_1 + (0),
                     reference="C10", value="0.01uF", rotation=0, mirror=None)

# 4.7 kΩ potentiometer (RV1) – controls booster voltage
add_schematic_symbol(symbol_lib="Device", symbol_name="R_Potentiometer",
                     pos_x=center_x_1 + (-45), pos_y=center_y_1 + (-15),
                     reference="RV1", value="4.7K", rotation=90, mirror=None)

# 6‑position rotary switch (SW1) – splits the j12_p# nets
add_schematic_symbol(symbol_lib="Switch", symbol_name="SW_Rotary_1x6_MP",
                     pos_x=center_x_1 + (-45), pos_y=center_y_1 + (-30),
                     reference="SW1", value="SW_Rotary_1x6_MP", rotation=0, mirror=None)

# 6 resistors (R5–R4) – form the j12_p# network (right side)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-27), pos_y=center_y_1 + (7),
                     reference="R5", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-27), pos_y=center_y_1 + (-2),
                     reference="R4", value="100K", rotation=0, mirror=None)

# 1‑0 Ω resistor (SI1) – part of the “in” net
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-27), pos_y=center_y_1 + (-17),
                     reference="SI1", value="0R", rotation=0, mirror=None)

# 47 kΩ resistor (SI2) – part of the “lo‑boost” chain
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-17), pos_y=center_y_1 + (-24),
                     reference="SI2", value="47K", rotation=0, mirror=None)

# 100 kΩ resistor (SI3) – “lo‑boost” connection
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-17), pos_y=center_y_1 + (-33),
                     reference="SI3", value="100K", rotation=0, mirror=None)

# 22 kΩ resistor (SI4) – “lo‑boost” network
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-7), pos_y=center_y_1 + (-20),
                     reference="SI4", value="22K", rotation=0, mirror=None)

# 56 kΩ resistor (SI5) – “lo‑boost” bridge
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-7), pos_y=center_y_1 + (-33),
                     reference="SI5", value="56K", rotation=0, mirror=None)

# Ground symbol for J2
add_schematic_symbol(symbol_lib="power", symbol_name="GND",
                     pos_x=center_x_1 + (-7), pos_y=center_y_1 + (-44),
                     reference="#PWR1", value="GND", rotation=0, mirror=None)

# 0.015 µF capacitor (C6)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (2), pos_y=center_y_1 + (17),
                     reference="C6", value="0.015uF", rotation=0, mirror=None)

# 0.01 µF capacitors (C7, C11) – part of the “j10‑p#” network
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (2), pos_y=center_y_1 + (12),
                     reference="C7", value="0.01uF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (2), pos_y=center_y_1 + (5),
                     reference="C11", value="0.01uF", rotation=0, mirror=None)

# Additional small resistors (R6–R1) – horizontal line for “j12_p#” connections
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (19), pos_y=center_y_1 + (-5),
                     reference="R6", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (19), pos_y=center_y_1 + (-13),
                     reference="R1", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (26), pos_y=center_y_1 + (-5),
                     reference="R2", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (26), pos_y=center_y_1 + (-13),
                     reference="R3", value="0R", rotation=0, mirror=None)

# 18 more small resistors (S8–S15) – continue the horizontal line
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (33), pos_y=center_y_1 + (-5),
                     reference="R8", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (33), pos_y=center_y_1 + (-13),
                     reference="R9", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (40), pos_y=center_y_1 + (-5),
                     reference="R10", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (40), pos_y=center_y_1 + (-13),
                     reference="R11", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (49), pos_y=center_y_1 + (-19),
                     reference="R12", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (49), pos_y=center_y_1 + (-26),
                     reference="R13", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (58), pos_y=center_y_1 + (-19),
                     reference="R14", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (58), pos_y=center_y_1 + (-26),
                     reference="R15", value="0R", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (58), pos_y=center_y_1 + (-50),
                     reference="R16", value="0R", rotation=0, mirror=None)

# Two 0.047 µF capacitors (C1, C2) – part of the “in” and “j10‑p#” nets
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (48), pos_y=center_y_1 + (17),
                     reference="C1", value="0.047uF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (48), pos_y=center_y_1 + (12),
                     reference="C2", value="0.047uF", rotation=0, mirror=None)

# Three more capacitors (C3, C4, C5) – on the “lo‑boost” side
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (45), pos_y=center_y_1 + (3),
                     reference="C3", value="0.047uF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (60), pos_y=center_y_1 + (3),
                     reference="C4", value="0.022uF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (69), pos_y=center_y_1 + (3),
                     reference="C5", value="0.022uF", rotation=0, mirror=None)

# 0.033 µF capacitor (C3) – “j10‑p#” net
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (30), pos_y=center_y_1 + (21),
                     reference="C3", value="0.033uF", rotation=0, mirror=None)

# 0.01 µF capacitor (C8) – “j10‑p#” net
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (25), pos_y=center_y_1 + (15),
                     reference="C8", value="0.01uF", rotation=0, mirror=None)

# 0.01 µF capacitor (C9) – “j10‑p#” net
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (22), pos_y=center_y_1 + (10),
                     reference="C9", value="0.01uF", rotation=0, mirror=None)

# 0.01 µF capacitor (C13) – “j10‑p#” net
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (21), pos_y=center_y_1 + (24),
                     reference="C13", value="0.01uF", rotation=0, mirror=None)

# 0.01 µF capacitor (C14) – “j10‑p#” net
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (17), pos_y=center_y_1 + (19),
                     reference="C14", value="0.01uF", rotation=0, mirror=None)

# All global GND and power labels used for the J2 connector
add_schematic_symbol(symbol_lib="power", symbol_name="GND",
                     pos_x=center_x_1 + (-7), pos_y=center_y_1 + (-44),
                     reference="#PWR1", value="GND", rotation=0, mirror=None)

# Global power symbol for the low‑boost output
add_schematic_symbol(symbol_lib="power", symbol_name="VAA",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (11),
                     reference="#PWR2", value="lo_boost_out", rotation=0, mirror=None)

# Global label for the high‑boost output
add_schematic_symbol(symbol_lib="power", symbol_name="VAA",
                     pos_x=center_x_1 + (7), pos_y=center_y_1 + (13),
                     reference="#PWR3", value="hi_boost_out", rotation=0, mirror=None)

# 3‑pin connector (J2) – the other side of the board
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05",
                     pos_x=center_x_1 + (26), pos_y=center_y_1 + (-26),
                     reference="J2", value="Conn_01x05", rotation=0, mirror=None)

# Global GND for J2
add_schematic_symbol(symbol_lib="power", symbol_name="GND",
                     pos_x=center_x_1 + (27), pos_y=center_y_1 + (-39),
                     reference="#PWR4", value="GND", rotation=0, mirror=None)

# Global labels for the four nets
# ----------------

# LABEL: lo_boost_in
lo_boost_in_pos = get_pin_location(symbol_ref="C10", pin_name="2")
add_label(label_pos=[lo_boost_in_pos[0]+(5), lo_boost_in_pos[1]-(5)],
          label_text="lo_boost_in", label_ref="lo_boost_in_0",
          label_type="input", text_orient="right")

# LABEL: in
in_pos = get_pin_location(symbol_ref="J1", pin_name="Pin_1")
add_label(label_pos=[in_pos[0]-(5), in_pos[1]+(5)],
          label_text="in", label_ref="in_0",
          label_type="input", text_orient="left")

# LABEL: out
out_pos = get_pin_location(symbol_ref="J1", pin_name="Pin_4")
add_label(label_pos=[out_pos[0]+(5), out_pos[1]-(5)],
          label_text="out", label_ref="out_0",
          label_type="input", text_orient="right")

# LABEL: hi_boost_out
hi_boost_out_pos = get_pin_location(symbol_ref="J1", pin_name="Pin_2")
add_label(label_pos=[hi_boost_out_pos[0]+(5), hi_boost_out_pos[1]+(5)],
          label_text="hi_boost_out", label_ref="hi_boost_out_0",
          label_type="input", text_orient="right")

# Connecting all wires
# ----------------

# Connecting the global labels to the anchor pins
connect_pins("lo_boost_in_0", "1", "C10", "2")
connect_pins("in_0", "1", "J1", "Pin_1")
connect_pins("out_0", "1", "J1", "Pin_4")
connect_pins("hi_boost_out_0", "1", "J1", "Pin_2")

# Connections that build the “in” net
connect_pins("J1", "Pin_1", "SI1", "1")
connect_pins("J1", "Pin_1", "SI6", "1")

# Connections that build the “lo‑boost_in” net
connect_pins("C10", "2", "C1", "1")
connect_pins("C10", "2", "C2", "1")
connect_pins("C10", "2", "C3", "1")
connect_pins("C10", "2", "C4", "1")
connect_pins("C10", "2", "C5", "1")
connect_pins("C10", "2", "C6", "1")
connect_pins("C10", "2", "C7", "1")
connect_pins("C10", "2", "C8", "1")
connect_pins("C10", "2", "C9", "1")
connect_points("C10", "2", "C10", "1")   # keep all 10‑pF caps in the chain
connect_pins("C10", "2", "J1", "Pin_3")

# Connections that build the “hi‑boost_out” net
connect_pins("C1", "1", "C6", "1")
connect_pins("C1", "1", "C14", "1")
connect_pins("C1", "1", "C13", "1")
connect_pins("C1", "1", "C3", "1")
connect_pins("C1", "1", "C7", "1")
connect_pins("C1", "1", "C9", "1")
connect_pins("C1", "1", "C13", "1")
connect_pins("J1", "Pin_2", "C1", "2")

# Connections that build the “out” net
connect_pins("J1", "Pin_4", "C2", "1")
connect_pins("J1", "Pin_4", "C5", "1")
connect_pins("J1", "Pin_4", "R1", "1")
connect_pins("J1", "Pin_4", "C9", "1")
connect_pins("J1", "Pin_4", "C8", "1")

# Wiring the J2 connector to the rest of the circuit
connect_pins("#PWR3", "1", "J2", "Pin_1")
connect_pins("#PWR4", "1", "J2", "Pin_5")
connect_pins("J2", "Pin_4", "#PWR2", "1")
connect_pins("J2", "Pin_3", "#PWR1", "1")

# Wiring the switch and the “j12_p#” nets
connect_pins(SW1, "1", "J2", "Pin_1")
connect_pins(SW1, "2", "R6", "2")
connect_pins(SW1, "3", "R8", "2")
connect_pins(SW1, "4", "R10", "2")
connect_pins(SW1, "5", "R12", "2")

# Potentiometer connections
connect_pins(RV1, "1", "R14", "2")
connect_pins(RV1, "3", "R15", "2")

# The remaining inter‑component connections – the “star” wires to the anchor pins
# (These are all the explicit connect_pins calls that were derived from the net list – the
#   6‑pin switch, the two potentiometer pins, and the 0.01 µF capacitors.)
connect_pins("RV1", "2", "R15", "1")
connect_pins("RV1", "3", "R13", "1")
connect_pins("R3", "1", "R5", "1")
connect_pins("R4", "2", "R6", "2")
connect_pins("R7", "3", "R16", "2")
connect_pins("RV1", "1", "R18", "1")
connect_pins("R5", "3", "R17", "1")
connect_pins("R6", "3", "R17", "2")
connect_pins("R7", "2", "R16", "2")

# End of wire connections
write_out_all_wires()