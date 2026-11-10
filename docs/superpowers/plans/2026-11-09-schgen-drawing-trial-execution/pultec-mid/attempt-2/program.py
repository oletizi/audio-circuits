# Auto‑generated schematic symbols
import sys
import os

# Get project path and import kicad schematic interface
PROJECT_PATH = os.environ['PROJECT_PATH']
sys.path.append(PROJECT_PATH)
from modules.kicad_sch_interface import *

### Placing center symbol 1 : Device:R###

center_x_1, center_y_1 = 150.0, 110.0

add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1, pos_y=center_y_1, reference="R1", value="4.7K", rotation=0, mirror="None")

### Placing other symbols in the Schematic with respect to the center symbol 1###

# left side for the boost/boost/boost chain
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (-120), pos_y=center_y_1 + (30), reference="C1", value="0.33uF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (-120), pos_y=center_y_1 + (24), reference="C2", value="0.15uF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (-120), pos_y=center_y_1 + (16), reference="C3", value="0.047uF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (-120), pos_y=center_y_1 + (8),  reference="C4", value="0.022uF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (-120), pos_y=center_y_1 + (0),  reference="C5", value="3300pF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="device",  symbol_name="C", pos_x=center_x_1 + (-120), pos_y=center_y_1 + (-10), reference="C6", value="0.022uF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="device",  symbol_name="C", pos_x=center_x_1 + (-120), pos_y=center_y_1 + (-16), reference="C7", value="1000uF", rotation=0, mirror="None")

add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (-120), pos_y=center_y_1 + (-30), reference="R3", value="100K", rotation=0, mirror="None")

# centre area for the two 5‑pin connectors, the SPDT switch and GND
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05", pos_x=center_x_1 + (-75), pos_y=center_y_1 + (-45), reference="J1", value="Conn_01x05", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05", pos_x=center_x_1 + (-75), pos_y=center_y_1 + (-45), reference="J2", value="Conn_01x05", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Switch", symbol_name="SW_Rotary_1x12", pos_x=center_x_1 + (0),  pos_y=center_y_1 + (0),  reference="SW1", value="ROTARY_SWITCH", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Switch", symbol_name="Switch:SW_SPDT",      pos_x=center_x_1 + (0),  pos_y=center_y_1 + (10), reference="SW2", value="SPDT_SWITCH", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="power",   symbol_name="GND",   pos_x=center_x_1 + (-5), pos_y=center_y_1 + (-50), reference="#PWR1", value="GND", rotation=0, mirror="None")

# right side for the mid‑tap‑tap‑tap block
add_schematic_symbol(symbol_lib="Device", symbol_name="L", pos_x=center_x_1 + (24), pos_y=center_y_1 + (52), reference="L1", value="2H", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="L", pos_x=center_x_1 + (24), pos_y=center_y_1 + (44), reference="L2", value="1H", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="L", pos_x=center_x_1 + (24), pos_y=center_y_1 + (35), reference="L3", value="450mH", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="L", pos_x=center_x_1 + (24), pos_y=center_y_1 + (11), reference="L4", value="450mH", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="L", pos_x=center_x_1 + (24), pos_y=center_y_1 + (2),  reference="L5", value="220mH", rotation=90, mirror="None")

add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (24), pos_y=center_y_1 + (2),  reference="R2", value="47K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (24), pos_y=center_y_1 + (-10), reference="R4", value="10K", rotation=0, mirror="None")

add_schematic_symbol(symbol_lib="Device", symbol_name="R_Potentiometer", pos_x=center_x_1 + (24), pos_y=center_y_1 + (12), reference="RV1", value="47K", rotation=0, mirror="None")

add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (24), pos_y=center_y_1 + (24), reference="R5", value="1K",  rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (24), pos_y=center_y_1 + (36), reference="C8", value="0.12uF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (24), pos_y=center_y_1 + (39), reference="C9", value="0.12uF", rotation=0, mirror="None")

add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (24), pos_y=center_y_1 + (52), reference="C10", value="2200pF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (24), pos_y=center_y_1 + (55), reference="C11", value="4700pF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (24), pos_y=center_y_1 + (60), reference="C12", value="1500pF", rotation=0, mirror="None")

add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (24), pos_y=center_y_1 + (70), reference="C13", value="4700pF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (24), pos_y=center_y_1 + (74), reference="C14", value="2200pF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (24), pos_y=center_y_1 + (80), reference="C15", value="4700pF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (24), pos_y=center_y_1 + (82), reference="C16", value="2.2K",   rotation=0, mirror="None")

add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (24), pos_y=center_y_1 + (88), reference="R6", value="47K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (24), pos_y=center_y_1 + (80), reference="R7", value="0R", rotation=0, mirror="None")

add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (24), pos_y=center_y_1 + (72), reference="R9", value="47K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (24), pos_y=center_y_1 + (63), reference="R10",value="100K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (24), pos_y=center_y_1 + (58), reference="R11", value="4.7K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (24), pos_y=center_y_1 + (54), reference="R12", value="0R",  rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (24), pos_y=center_y_1 + (50), reference="R13", value="4.7K", rotation=0, mirror="None")

add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1 + (24), pos_y=center_y_1 + (20), reference="R14", value="100K", rotation=0, mirror="None")

add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (24), pos_y=center_y_1 + (17), reference="C17", value="4700pF", rotation=0, mirror="None")

add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1 + (24), pos_y=center_y_1 + (5),  reference="C18", value="2200pF", rotation=0, mirror="None")

# 3 GND symbols for each side
add_schematic_symbol(symbol_lib="power",  symbol_name="GND", pos_x=center_x_1 + (-5),  pos_y=center_y_1 + (-50), reference="#PWR1", value="GND",    rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="power",  symbol_name="GND", pos_x=center_x_1 + (0),  pos_y=center_y_1 + (20),  reference="#PWR2", value="GND",    rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="power",  symbol_name="GND", pos_x=center_x_1 + (24), pos_y=center_y_1 + (10),  reference="#PWR3", value="GND",    rotation=0, mirror="None")

#################### Placing global labels and connecting to neighbor pin #############
# global label for hi_boost_out
x_SW1_6, y_SW1_6 = get_pin_location(symbol_ref="SW1", pin_name="6")
add_label(label_pos=[x_SW1_6+(8), y_SW1_6+(0)], label_text="hi_boost_out", label_ref="hi_boost_out_0", label_type="input", text_orient="right")
# Connecting label to neighbour pin
connect_pins("hi_boost_out_0","1","SW1","6")

# global label for lo_boins (lo_boost_in)
x_SW1_1, y_SW1_1 = get_pin_location(symbol_ref="SW1", pin_name="1")
add_label(label_pos=[x_SW1_1+(8), y_SW1_1+(0)], label_text="lo_boins", label_ref="lo_boins_0", label_type="input", text_orient="right")
# Connecting label to neighbour pin
connect_pins("lo_boins_0","1","SW1","1")

# global label for mid_boost_return
x_SW2_2, y_SW2_2 = get_pin_location(symbol_ref="SW2", pin_name="B")
add_label(label_pos=[x_SW2_2+(7), y_SW2_2+(0)], label_text="mid_boost_return", label_ref="mid_boost_return_0", label_type="input", text_orient="right")
# Connecting label to neighbour pin
connect_pins("mid_boost_return_0","1","SW2","B")

# global label for mid_coil_return
x_L3_1, y_L3_1 = get_pin_location(symbol_ref="L3", pin_name="1")
add_label(label_pos=[x_L3_1+(6), y_L3_1+(0)], label_text="mid_coil_return", label_ref="mid_coil_return_0", label_type="input", text_orient="right")
# Connecting label to neighbour pin
connect_pins("mid_coil_return_0","1","L3","1")

# global label for out 
x_SW1_8, y_SW1_8 = get_pin_location(symbol_ref="SW1", pin_name="8")
add_label(label_pos=[x_SW1_8+(8), y_SW1_8+(0)], label_text="out", label_ref="out_0", label_type="input", text_orient="right")
# Connecting label to neighbour pin
connect_pins("out_0","1","SW1","8")


###################################################################### CONNECTING WIRES ###############

# connecting #PWR3 pin 1 (Pin ID 1 -- Name None) to R13 pin 1 (Pin ID 1 -- Name None)
connect_pins("#PWR3","1","R13","1")

# Connecting #PWR1 pin 1 (Pin ID 1 -- Name None) to R10 pin 1 (Pin ID 1 -- Name None)
connect_pins("#PWR1","1","R10","1")

# Connecting J2 pin 1 (Pin ID 1 -- Name None) to SW1 pin 6 (Pin ID 6 -- Name None)
connect_pins("J2","1","SW1","6")

# Connecting J1 pin 5 (Pin ID 5 -- Name None) to SW2 pin C (Pin ID 3 -- Name None)
connect_pins("J1","5","SW2","C")

# Connecting J1 pin 4 (Pin ID 4 -- Name None) to SW2 pin B (Pin ID 2 -- Name None)
connect_pins("J1","4","SW2","B")

# Connecting J1 pin 3 (Pin ID 3 -- Name None) to SW1 pin 6 (Pin ID 6 -- Name None)
connect_pins("J1","3","SW1","6")

# Connecting SW1 pin 6 (Pin ID 6 -- Name None) to C7 pin 1 (Pin ID 1 -- Name None)
connect_pins("SW1","6","C7","1")

# Connecting SW1 pin 4 (Pin ID 4 -- Name None) to C3 pin 1 (Pin ID 1 -- Name None)
connect_pins("SW1","4","C3","1")

# Connecting SW1 pin 3 (Pin ID 3 -- Name None) to C2 pin 1 (Pin ID 1 -- Name None)
connect_pins("SW1","3","C2","1")

# Connecting SW1 pin 1 (Pin ID 1 -- Name None) to C1 pin 1 (Pin ID 1 -- Name None)
connect_pins("SW1","1","C1","1")

# Connecting SW1 pin 6 (Pin ID 6 -- Name None) to SW2 pin A (Pin ID 1 -- Name None)
connect_pins("SW1","6","SW2","A")

# Connecting SW1 pin 5 (Pin ID 5 -- Name None) to SW2 pin A (Pin ID 1 -- Name None)
connect_pins("SW1","5","SW2","A")

# Connecting C13 pin 1 (Pin ID 1 -- Name None) to C14 pin 1 (Pin ID 1 -- Name None)
connect_pins("C13","1","C14","1")

# Connecting C14 pin 1 (Pin ID 1 -- Name None) to C15 pin 1 (Pin ID 1 -- Name None)
connect_pins("C14","1","C15","1")

# Connecting C15 pin 1 (Pin ID 1 -- Name None) to C16 pin 1 (Pin ID 1 -- Name None)
connect_pins("C15","1","C16","1")

# Connecting C16 pin 1 (Pin ID 1 -- Name None) to L6 pin 1 (Pin ID 1 -- Name None)
connect_pins("C16","1","L6","1")

# Connecting C17 pin 1 (Pin ID 1 -- Name None) to C18 pin 1 (Pin ID 1 -- Name None)
connect_pins("C17","1","C18","1")

# Connecting C8 pin 1 (Pin ID 1 -- Name None) to C9  pin 1 (  Pin ID 1 -- Name None)
connect_pins("C8","1","C9","1")

# Connecting C9  pin 1 ( Pin ID 1 -- Name None)  to C10 pin 1 (Pin ID 1 -- Name None)
connect_pins("C9","1","C10","1")

# Connecting C10 pin 1 (Pin ID 1 -- Name None)  to C11  pin 1 ( Pin ID 1 -- Name None)
connect_pins("C10","1","C11","1")

# Connecting C11  pin 1 ( Pin ID 1 -- Name None)  to C12  pin 1 ( Pin 1 -- Name None)
connect_pins("C11","1","C12","1")

# Connecting C12  pin 1 ( Pin 1 -- Name None)  to C13  pin 1 ( Pin 1 -- Name None)
connect_pins("C12","1","C13","1")

# Connecting C10  pin 2 ( Pin ID 2 -- Name None) to L5 pin 1 ( Pin 1 - Name None)
connect_pins("C10","2","L5","1")

# Connecting R1 pin 2 (Pin ID 2 -- Name None) to L4 pin 1 ( Pin 1 - Name None)
connect_pins("R1","2","L4","1")

# Connecting  R1 pin 2 (Pin ID 2 -- Name None) to R14 1 (Pin 1 -- Name None)
connect_pins("R1","2","R14","1")

# Connecting C1 1 (Pin ID 1 -- Name None) to C2 2 (Pin ID 2 -- Name None)
connect_pins("C1","1","C2","2")

# Connecting R8 1 ( Pin ID 1 -- Name None) to C3 1 (Pin ID 1 -- Name None)
connect_pins("C8","2","R8","1")

# Connecting L5 2 ( Pin 1- Name None) to L6 1 ( Pin 1- Name None)
connect_pins("L5","2","L6","1")

# Connecting R7 1 ( Pin ID 1 -- Name None) to L6 1 ( Pin 1- Name None)
connect_pins("R6","2","L6","1")

# Connecting R2 1 (Pin ID 1 -- Name None) to R6/2 (Pin 2 -- Name None)
connect_pins("R2","1","R6","2")

# Connecting R3 1 ( Pin ID 1 -- Name None) to R7 1 ( Pin 1 - Name None)
connect_pins("R3","1","R7","1")

# Connecting R5 1 ( Pin ID 1 -- Name None) to R7 1 ( Pin 1 - Name None)
connect_pins("R5","1","R7","1")

# Connecting R8 1 (Pin ID 1 -- Name None) to R10 2 (Pin 2 - Name None)
connect_pins("R3","1","R9","1")

# Connecting R4 1 ( Pin ID 1 -- Name None) to R10 2 (  Pin 2 - Name None)
connect_pins("R2","1","R9","1")


# Connecting all the wire connections for all the nets
write_out_all_wires()