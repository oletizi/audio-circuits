# Auto-generated schematic symbols
import sys
import os

# Get project path and import kicad schematic interface
PROJECT_PATH = os.environ['PROJECT_PATH']
sys.path.append(PROJECT_PATH)
from modules.kicad_sch_interface import *

### Placing center symbol 1 : Connector_Generic:Conn_01x05###

center_x_1, center_y_1 = 150.0, 110.0

add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05", pos_x=center_x_1, pos_y=center_y_1, reference="J1", value="Conn_01x05", rotation=0, mirror="None")

### Placing all other symbols in the Schematic with respect to the center symbol 1###

# Placing J2 next to J1
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05", pos_x=center_x_1+(30), pos_y=center_y_1+(30), reference="J2", value="Conn_01x05", rotation=0, mirror="None")

# Placing C1 in the first column (to the left of J1) on the positive side
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1+(-45), pos_y=center_y_1+(15), reference="C1", value="0.33uF", rotation=0, mirror="None")
# Placing C2 next to C1
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1+(-45), pos_y=center_y_1+(0), reference="C2", value="0.22uF", rotation=0, mirror="None")

# Placing C3 next to C2, and C4 next to C3
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1+(-35), pos_y=center_y_1+(15), reference="C3", value="0.12uF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1+(-35), pos_y=center_y_1+(0), reference="C4", value="0.068uF", rotation=0, mirror="None")

# Placing C5 next to C4, and C6 next to C5
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1+(-25), pos_y=center_y_1+(15), reference="C5", value="0.047uF", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1+(-25), pos_y=center_y_1+(0), reference="C6", value="0.033uF", rotation=0, mirror="None")

# Placing the 56k resistor
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1+(-45), pos_y=center_y_1+(-10), reference="R1", value="56K", rotation=0, mirror="None")

# Placing the 47k pot
add_schematic_symbol(symbol_lib="Device", symbol_name="R_Potentiometer", pos_x=center_x_1+(-30), pos_y=center_y_1+(-10), reference="RV1", value="47K", rotation=0, mirror="None")

# Placing the 0Ω resistor
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1+(-35), pos_y=center_y_1+(-25), reference="SI1", value="0R", rotation=0, mirror="None")

# Placing the 47k resistor
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1+(-25), pos_y=center_y_1+(-25), reference="SI2", value="47K", rotation=0, mirror="None")

# Placing the 0.047uF capacitor
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=center_x_1+(-25), pos_y=center_y_1+(-30), reference="SI3", value="0.047uF", rotation=0, mirror="None")

# Placing the 430R resistor
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1+(-15), pos_y=center_y_1+(-15), reference="SI4", value="430R", rotation=0, mirror="None")

# Placing the 0Ω resistor (second) - pin 5 of the first pin (centered on J1)
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1+(-5), pos_y=center_y_1+(-25), reference="SI5", value="0R", rotation=0, mirror="None")

# Placing the 4.7k resistor
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1+(-5), pos_y=center_y_1+(-35), reference="SI6", value="4.7K", rotation=0, mirror="None")

# Placing the 0Ω for the switch (the switch will be placed later)
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1+(-5), pos_y=center_y_1+(-40), reference="SI7", value="0R", rotation=0, mirror="None")

# Placing the 100k resistor
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=center_x_1+(-5), pos_y=center_y_1+(-50), reference="SI8", value="100K", rotation=0, mirror="None")

# Placing the rotary switch (7 pins + 1 ground) in a new location (to the right of the rest)
add_schematic_symbol(symbol_lib="Switch", symbol_name="SW_Rotary_1x6_MP", pos_x=center_x_1+(5), pos_y=center_y_1+(-5), reference="SW1", value="SW_Rotary_1x6_MP", rotation=0, mirror="None")

# Placing the ground symbols
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=center_x_1+(-50), pos_y=center_y_1+(-50), reference="#PWR_GND", value="GND", rotation=0, mirror="None")

### Placing global labels in the Schematic and connect them to the neighbor pin ###

# Add label lo_boost_in next to SW7_1 pin G (pin name is G)
x_SW1_1, y_SW1_1 = get_pin_location(symbol_ref="SW1", pin_name="G")
add_label(label_pos=[x_SW1_1+(10), y_SW1_1+(0)], label_text="lo_boost_in", label_ref="lo_boost_in_0", label_type="input", text_orient="right")
# Connecting Label lo_boost_in label_id:0 to SW7_1 pin G (Pin ID 5 -- Name G)
connect_pins("lo_boost_in_0", "1", "SW1", "G")

# Add label out next to R7_2 pin 2 (pin name is 2)
x_R7, y_R7 = get_pin_location(symbol_ref="R7", pin_name="2")
add_label(label_pos=[x_R7+(10), y_R7+(0)], label_text="out", label_ref="out_0", label_type="input", text_orient="right")
# Connecting Label out label_id:0 to R7 pin 2 (Pin ID 2 -- Name 2)
connect_pins("out_0", "1", "R7", "2")

# Add label in next to C1_2 pin 2 (pin name is 2)
x_C1_2, y_C1_2 = get_pin_location(symbol_ref="C1", pin_name="2")
add_label(label_pos=[x_C1_2+(10), y_C1_2+(0)], label_text="in", label_ref="in_0", label_type="input", text_orient="right")
# Connecting Label in label_id:0 to C1 pin 2 (Pin ID 2 -- Name 2)
connect_pins("in_0", "1", "C1", "2")

# Add label hi_boost_out next to SW7_2 pin 2 (pin name is 2)
x_R7_2, y_R7_2 = get_pin_location(symbol_ref="R7", pin_name="2")
add_label(label_pos=[x_R7_2+(10), y_R7_2+(0)], label_text="hi_boost_out", label_ref="hi_boost_out_0", label_type="input", text_orient="right")
# Connecting Label hi_boost_out label_id:0 to R7 pin 2 (Pin ID 2 -- Name 2)
connect_pins("hi_boost_out_0", "1", "R7", "2")

### Connecting all wires in the Schematic ###


# Connecting #PWR_GND pin 1 (Pin ID 1 -- Name 1) to SI8 pin 1 (Pin ID 1 -- Name 1)
connect_pins("#PWR_GND", "1", "SI8", "1")

# Connecting C1 pin 1 (Pin ID 1 -- Name 1) to C2 1 (Pin ID 1 -- Name 1)
connect_pins("C1", "1", "C2", "1")

# Connecting C4 2 (Pin ID 2 -- Name 2) to C5 2 (Pin ID 2 -- Name 2)
connect_pins("C4", "2", "C5", "2")

# Connecting R2 pin 2 (Pin ID 2 -- Name 2) to C3 1 (Pin ID 1 -- Name 1)
connect_pins("R2", "2", "C3", "1")

# Connecting C4 1 (Pin ID 1 -- Name 1) and C5 1 (Pin ID 1 -- Name 1) to C5.2 (Pin ID 2 -- Name 2)
connect_pins("C4", "1", "C5", "1")
connect_pins("C5", "1", "C5", "2")

# Connecting C5.1 (Pin ID 1 -- Name 1) to C6 1 (Pin ID 1 -- Name 1)
connect_pins("C5", "1", "C6", "1")

# Connecting R1 pin 1 (Pin ID 1 -- Name 1) to C5.2 (Pin ID 2 -- Name 2)
connect_pins("R1", "1", "C5", "2")

# Connecting R6.1 (Pin ID 1 -- Name 1) to C6 2 (Pin ID 2 -- Name 2)
connect_pins("R6", "1", "C6", "2")

# Connecting C2 1 (Pin ID 1 -- Name 1) to R3 1 (Pin ID 1 -- Name 1)
connect_pins("C2", "1", "R3", "1")

# Connecting J1 pin 3 (Pin ID 3 -- Name Pad) to C1 1 (Pin ID 1 -- Name 1)
connect_pins("J1", "Pin_3", "C1", "1")

# Connecting C6 2 (Pin ID 2 -- Name 2) and R1.2 (Pin ID 2 -- Name 2) to SW8_1 pin 2 (Pin ID 2 -- Name 2)
connect_pins("C6", "2", "R1", "2")
connect_pins("R1", "2", "SW1", "2")

# Connecting J2 pin 4 (Pin ID 4 -- Name Pad) to C2.2 (Pin ID 2 -- Name 2)
connect_pins("J2", "Pin_4", "C2", "2")

# Connecting J1 pin 4 (Pin ID 4 -- Name Pad) to C3 2 (Pin ID 2 -- Name 2)
connect_pins("J1", "Pin_4", "C3", "2")

# Connecting J2 pin 5 (Pin ID 5 -- Name Pad) to C3.2
connect_pins("J2", "Pin_5", "C3", "2")

# Connecting C1 2 (Pin ID 2 -- Name 2) and C5 2 (Pin ID 2 -- Name 2) to SW9_1 pin 1 (Pin ID 1 -- Name 1)
connect_pins("C1", "2", "C5", "2")
connect_pins("C5", "2", "SW1", "1")

# Connecting J2 pin 2 (Pin ID 2 -- Name Pad) and C2.2 (Pin ID 2 -- Name 2) to SW9_1 pin 6 (Pin ID 6 -- Name 1)
connect_pins("J2", "Pin_2", "C2", "2")
connect_pins("C2", "2", "SW1", "6")

# Connecting J2 pin 1 (Pin ID 1 -- Name Pad) and C1.2 (Pin ID 2 -- Name 2) to SW9_1 pin 5 (Pin ID 5 -- Name 1)
connect_pins("J2", "Pin_1", "C1", "2")
connect_pins("C1", "2", "SW1", "5")

# Connecting C3 2 (Pin ID 2 -- Name 2) and C4 1 (Pin ID 1 -- Name 1) to J1 pin 1 (Pin ID 1 -- Name Pad)
connect_pins("C3", "2", "C4", "1")
connect_pins("C4", "1", "J1", "1")

# Connecting C1 1 (Pin ID 2 -- Name 1) and C1 2 (Pin ID 2 -- Name 1) to J1 5 (Pin ID 5 -- Name Pad)
connect_pins("C1", "1", "C1", "2")
connect_pins("C1", "2", "J1", "5")

# Connecting J1 pin 2 (Pin ID 2 -- Name Pad) to C2.2 (Pin ID 2 -- Name 2)
connect_pins("J1", "Pin_2", "C2", "2")

# Connecting J1 pin 1 (Pin ID 1 -- Name Pad) to C5.2 (Pin ID 2 -- Name 2)
connect_pins("J1", "Pin_1", "C5", "2")

# Connecting J2 2 (Pin ID 2 -- Name Pad) to C2 2 (Pin ID 2 -- Name 2)
connect_pins("J2", "2", "C2", "2")

# Connecting J2 2 (Pin ID 2 -- Name Pad) to C2.2 (Pin ID 2 -- Name 2)
connect_pins("J2", "2", "C2", "2")

# Connecting SW1 pin MP (Pin ID 7 -- Name MP) to SW1.pin 6 (Pin ID 6 -- Name 1)
connect_pins("SW1", "MP", "SW1", "6")

# Connecting R4.2 (Pin ID 2 -- Name 2) to SW1.1 (Pin ID 1 -- Name 1)
connect_pins("R4", "2", "SW1", "1")

# Connecting R3.2 (Pin ID 2 -- Name 2) to SW1 3 (Pin ID 3 -- Name 1)
connect_pins("R3", "2", "SW1", "3")

# Connecting C4 1 (Pin ID 1 -- Name 1) to SW1 2 (Pin ID 2 -- Name 1)
connect_pins("C4", "1", "SW1", "2")

# Connecting J2 pin 5 (Pin ID 5 -- Name Pad) to SW1.3 (Pin ID 3 -- Name 1)
connect_pins("J2", "5", "SW1", "3")

# Connecting R7.1 (Pin ID 1 -- Name 1) to SW1 5 (Pin ID 5 -- Name 1)
connect_pins("R7", "1", "SW1", "5")

# Connecting C3 1 (Pin ID 1 -- Name 1) to SW1 7 (Pin ID 7 -- Name 1)
connect_pins("C3", "1", "SW1", "7")

write_out_all_wires()