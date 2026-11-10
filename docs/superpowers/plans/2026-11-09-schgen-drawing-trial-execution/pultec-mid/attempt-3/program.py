# Auto‑generated schematic symbols
import sys
import os

# Get the project path and import kicad schematic interface
PROJECT_PATH = os.environ['PROJECT_PATH']
sys.path.append(PROJECT_PATH)
from modules.kicad_sch_interface import *

# Placing center symbol 1 : Switch:SW_Rotary_1x12
center_x_1, center_y_1 = 105.0, 148.5
add_schematic_symbol(symbol_lib="Switch", symbol_name="SW_Rotary_1x12",
                     pos_x=center_x_1, pos_y=center_y_1, reference="SW1",
                     value="SW_Rotary_1x12", rotation=90, mirror="None")

# Placing other symbols in the Schematic with respect to the center symbol 1
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05",
                     pos_x=center_x_1 + (-83), pos_y=center_y_1 + (22),
                     reference="J1", value="Conn_01x05", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05",
                     pos_x=center_x_1 + (-83), pos_y=center_y_1 + (-20),
                     reference="J2", value="Conn_01x05", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND",
                     pos_x=center_x_1 + (-80), pos_y=center_y_1 + (40),
                     reference="#PWR_GND_J1_J2", value="GND", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-80), pos_y=center_y_1 + (16),
                     reference="R1", value="4.7K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-80), pos_y=center_y_1 + (0),
                     reference="R2", value="1K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-80), pos_y=center_y_1 + (-16),
                     reference="R3", value="100K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R_Potentiometer",
                     pos_x=center_x_1 + (-78), pos_y=center_y_1 + (-30),
                     reference="RV1", value="47K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Switch", symbol_name="SW_SPDT",
                     pos_x=center_x_1 + (-69), pos_y=center_y_1 + (-6),
                     reference="SW2", value="SW_SPDT", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Switch", symbol_name="SW_Rotary_1x12",
                     pos_x=center_x_1 + (-57), pos_y=center_y_1 + (-31),
                     reference="SW1", value="SW_Rotary_1x12", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-57), pos_y=center_y_1 + (20),
                     reference="C1", value="0.33uF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-57), pos_y=center_y_1 + (12),
                     reference="C2", value="0.15uF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-57), pos_y=center_y_1 + (5),
                     reference="C3", value="0.047uF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-57), pos_y=center_y_1 + (-2),
                     reference="C4", value="0.022uF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-57), pos_y=center_y_1 + (-11),
                     reference="C5", value="3300pF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-49), pos_y=center_y_1 + (15),
                     reference="C6", value="0.022uF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-49), pos_y=center_y_1 + (8),
                     reference="C7", value="3300pF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-49), pos_y=center_y_1 + (0),
                     reference="C8", value="0.012uF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-49), pos_y=center_y_1 + (-7),
                     reference="C9", value="0.012uF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-49), pos_y=center_y_1 + (-15),
                     reference="C10", value="2200pF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-49), pos_y=center_y_1 + (-22),
                     reference="C11", value="4700pF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-21), pos_y=center_y_1 + (13),
                     reference="C12", value="1500pF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-21), pos_y=center_y_1 + (6),
                     reference="C13", value="4700pF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-21), pos_y=center_y_1 + (-2),
                     reference="C14", value="2200pF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-21), pos_y=center_y_1 + (-12),
                     reference="C15", value="4700pF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-21), pos_y=center_y_1 + (-20),
                     reference="C16", value="2200pF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-21), pos_y=center_y_1 + (-27),
                     reference="C17", value="1000pF", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="L", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (-1),
                     reference="L1", value="1000mH", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="L", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (-10),
                     reference="L2", value="1mH", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="L", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (-17),
                     reference="L3", value="450mH", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="L", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (-25),
                     reference="L4", value="220mH", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="L", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (-34),
                     reference="L5", value="2H", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Switch", symbol_name="Switch:SW_SPDT",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (-34),
                     reference="SW3", value="Switch:SW_SPDT", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (-46),
                     reference="R4", value="0R", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (-46),
                     reference="R9", value="47K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (-54),
                     reference="R6", value="0R", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", symbol_lib_version="1.0",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (-54),
                     reference="R7", value="4.7K", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R_Potentiometer",
                     pos_x=center_x_1 + (-2), pos_y=center_y_1 + (-54),
                     reference="R10", value="0R", rotation=0, mirror="None")

# Placing all global labels in the Schematic and connect them to the neighbor pin
add_label([150, 140], "hi_boost_out", "hi_boost_out", "input", "left")
add_label([150, 140], "in", "in", "input", "left")
add_label([150, 140], "lo_boost_in", "lo_boost_in", "input", "left")
add_label([150, 140], "out", "out", "input", "left")

# Connecting all wires in the Schematic
# GND connections
connect_pins("J2", "1", "#PWR_GND_J1_J2", "1")
connect_pins("J2", "2", "#PWR_GND_J1_J2", "1")
connect_pins("J2", "3", "#PWR_GND_J1_J2", "1")
connect_pins("J2", "4", "#PWR_GND_J1_J2", "1")
connect_pins("J2", "5", "#PWR_GND_J1_J2", "1")
connect_pins("R9", "2", "#PWR_GND_J1_J2", "1")
connect_pins("R6", "1", "#PWR_GND_J1_J2", "1")

# hi_boost_out net
connect_pins("SW1", "2", "C15", "1")
connect_pins("C8", "1", "SI1", "1")
connect_pins("C5", "1", "SI5", "1")
connect_pins("SW2", "1", "S21", "1")

# in net
connect_pins("R3", "1", "R1", "1")
connect_pins("J1", "1", "R1", "1")
connect_pins("C1", "1", "R1", "1")
connect_pins("C13", "1", "R1", "1")

# lo_boost_in net
connect_pins("J1", "3", "C6", "1")
connect_pins("C16", "1", "C8", "1")
connect_pins("C8", "2", "C16", "2")
connect_pins("C13", "2", "C15", "2")
connect_pins("C12", "1", "C14", "1")

# out net
connect_pins("J1", "4", "C8", "3")
connect_pins("C9", "1", "C12", 3)
connect_pins("C10", "1", "C12", 3)

################################################################################
# mid_cut_return
connect_pins("C7", "1", "C9", "2")
connect_pins("C9", "1", "C10", "2")
connect_pins("C10", "2", "#PWR_VIN", "1")
connect_pins("#PWR_VIN", "1", "C12", "2")
connect_pins("C12", "3", "C13", "1")
connect_pins("C13", "3", "R10", "1")
connect_pins("C14", "1", "C15", "1")
connect_pins("C8", "1", "L1", "1")
connect_pins("L1", "2", "R4", "1")
connect_pins("#PWR_L1", "1", "L4", "1")
connect_pins("R4", "2", "L6", "1")
connect_pins("R9", "2", "#PWR_L1", "1")
connect_pins("L2", "2", "R4", "2")
connect_pins("R10", "1", "R3", "3")
connect_pins("R5", "3", "R6", "1")
connect_pins("R6", "3", "R7", "2")
connect_pins("R9", "3", "R12", "3")
connect_pins("R11", "2", "R8", "3")
connect_pins("R8", "2", "R9", "1")
connect_pins("R13", "1", "SW2", "3")
connect_pins("SW2", "2", "SW2", "3")
connect_pins("SW2", "2", "R12", "3")
connect_pins("SW1", "2", "SW12", "2")
connect_pins("SW12", "1", "SW2", "3")
connect_pins("SW12", "2", "R10", "1")
connect_pins("SW2", "2", "R8", "2")
connect_pins("SW1", "2", "SW2", "2")
connect_pins("#PWR_VIN", "1", "SW1", "2")

################################################################################
# mid_coil_return
connect_pins("SW1", "2", "C15", "6")
connect_pins("C15", "5", "L3", "1")
connect_pins("L3", "1", "C5", "2")
connect_pins("#PWR_VIN", "1", "C7", "1")
connect_pins("C7", "2", "R13", "2")
connect_pins("R12", "1", "R10", "1")
connect_pins("R9", "1", "R8", "1")
connect_pins("L3", "2", "R1", "3")
connect_pins("J1", "3", "R5", "1")
connect_pins("R5", "2", "J1", "2")
connect_pins("J1", "5", "R9", "2")
connect_pins("C10", "5", "C2", "2")
connect_pins("C7", "6", "R6", "2")
connect_pins("R6", "5", "C1", "2")
connect_pins("C1", "6", "C8", "1")
connect_pins("C4", "2", "C6", "1")
connect_pins("C3", "2", "C4", "1")
connect_pins("C6", "6", "C1", "5")
connect_pins("C1", "5", "C2", "2")
connect_pins("C2", "6", "C3", "1")
connect_pins("C3", "5", "C7", "5")
connect_pins("C4", "5", "C5", "3")
connect_pins("C5", "6", "C11", "1")
connect_pins("C8", "6", "C9", "2")
connect_pins("C9", "6", "C19", "1")
connect_pins("C19", "5", "C12", "2")
connect_pins("C13", "2", "C15", "2")
connect_pins("C15", "5", "C16", 2)
connect_pins("C16", "6", "C13", 1)
connect_pins("C12", "5", "C17", 1)
connect_pins("C10", 1, "C11", 2)

################################################################################
# mid_sel_common
connect_pins("C17", "1", "C14", 1)
connect_pins("C11", "4", "C16", 2)
connect_pins("C8", 1, "C12", 2)
connect_pins("C5", 3, "C7", 1)
connect_pins("C4", 3, "C6", 2)
connect_pins("C3", 3, "C9", 2)
connect_pins("C2", 6, "C10", 3)
connect_pins("C2", 2, "#PWR_MID_TAP3_R2", 1)
connect_pins("#PWR_MID_TAP3_R2", 2, "C3", 1)
connect_pins(C3, 2, C4, "5")
connect_pins("C6", "3", "R8", 1)

################################################################################
# mid_tap_0r22h
connect_pins("C13", "2", "C12", "2")
connect_pins("C12", "4", "#PWR_TAP1_R2", "1")
connect_pins("C19", "2", "#PWR_TAP1_R2", "1")
connect_pins("R13", "4", C(3), "1")

################################################################################
# mid_tap_0r45h
connect_pins("C11", "2", C(2), "1")
connect_pins("C17", "#PWR_TAP2_R2", "1")
connect_pins("C18", "#PWR_TAP2_R2", "1")
connect_pins("L2", "1", "L3", "1")
connect_pins("C18", "#PWR_TAP1_R1", "1")
connect_pins("C12", "1", "C13", "2")
connect_pins("C2", "1", "C17", "2")
connect_pins("C9", "2", "R9", "1")
connect_pins("C3", "1", "C6", "2")
connect_pins("C9", "1", "C10", "2")
connect_pins("C1", "2", "C16", "1")

#endregion

write_out_all_wires()