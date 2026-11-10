# Auto-generated schematic symbols
import sys
import os
import math

# Get project path and import kicad schematic interface
PROJECT_PATH = os.environ['PROJECT_PATH']
sys.path.append(PROJECT_PATH)
from modules.kicad_sch_interface import *

# ------------------------------------------------------------------------------
# Placing all symbols in the Schematic
# ------------------------------------------------------------------------------

# Center reference point for the main block (approx. centre of the sheet)
center_x_1, center_y_1 = 150.0, 110.0

# Place the two connectors on the left side
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05",
                     pos_x=center_x_1 + (-80), pos_y=center_y_1 + (8),
                     reference="J1", value="Conn_01x05", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05",
                     pos_x=center_x_1 + (-80), pos_y=center_y_1 + (-2),
                     reference="J2", value="Conn_01x05", rotation=0, mirror=None)

# Pass‑through for the GND power symbol to the right of the block
add_schematic_symbol(symbol_lib="power", symbol_name="GND",
                     pos_x=center_x_1 + (-40), pos_y=center_y_1 + (-24),
                     reference="#PWR1", value="GND", rotation=0, mirror=None)

# Place the 7 resistors (R1‑R7) in a vertical chain
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-74), pos_y=center_y_1 + (36),
                     reference="R1",  value="4.7K", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-63), pos_y=center_y_1 + (36),
                     reference="R2",  value="47K", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-52), pos_y=center_y_1 + (36),
                     reference="R3",  value="10K", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-41), pos_y=center_y_1 + (36),
                     reference="R4",  value="0R",  rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-30), pos_y=center_y_1 + (36),
                     reference="R5",  value="4.7K", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-19), pos_y=center_y_1 + (36),
                     reference="R6",  value="0R",  rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (-8), pos_y=center_y_1 + (36),
                     reference="R7",  value="56K", rotation=0, mirror=None)

# Place the 9 capacitors (C1‑C9)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (-74), pos_y=center_y_1 + (25),
                     reference="C1",  value="4700pF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (-63), pos_y=center_y_1 + (25),
                     reference="C2",  value="4700pF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (-52), pos_y=center_y_1 + (25),
                     reference="C3",  value="3300pF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (-41), pos_y=center_y_1 + (25),
                     reference="C4",  value="1000pF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (-30), pos_y=center_y_1 + (25),
                     reference="C5",  value="470pF",  rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (-19), pos_y=center_y_1 + (25),
                     reference="C6",  value="1000pF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (-8), pos_y=center_y_1 + (25),
                     reference="C7",  value="1000pF", rotation=0, mirror=None)

# Place the 4 inductors (L1‑L4) in a vertical chain
add_schematic_symbol(symbol_lib="Device", symbol_name="L",
                     pos_x=center_x_1 + (-2),  pos_y=center_y_1 + (35),
                     reference="L1",  value="100mH",  rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="L",
                     pos_x=center_x_1 + ( 7),  pos_y=center_y_1 + (35),
                     reference="L2",  value="200mH",  rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="L",
                     pos_x=center_x_1 + (16),  pos_y=center_y_1 + (35),
                     reference="L3",  value="300mH",  rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="L",
                     pos_x=center_x_1 + (25),  pos_y=center_y_1 + (35),
                     reference="L4",  value="600mH",  rotation=0, mirror=None)

# Place the rotary switch (SW_Rotary_1x6_MP)
add_schematic_symbol(symbol_lib="Switch", symbol_name="SW_Rotary_1x6_MP",
                     pos_x=center_x_1 + (30), pos_y=center_y_1 + (45),
                     reference="SW1", value="SW_Rotary_1x6_MP",
                     rotation=90, mirror=None)

# Place the potentiometers (RV1, RV2)
add_schematic_symbol(symbol_lib="Device", symbol_name="R_Potentiometer",
                     pos_x=center_x_1 + (30), pos_y=center_y_1 + (12),
                     reference="RV1", value="47K", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R_Potentiometer",
                     pos_x=center_x_1 + (40), pos_y=center_y_1 + (12),
                     reference="RV2", value="10K", rotation=0, mirror=None)

# Place the 8 small capacitors/inductors (SI1‑SI8)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                     pos_x=center_x_1 + (48), pos_y=center_y_1 + (22),
                     reference="SI1", value="0.047uF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (48), pos_y=center_y_1 + (16),
                     reference="SI2", value="430R",  rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (48), pos_y=center_y_1 + (10),
                     reference="SI3", value="0R",  rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (48), pos_y=center_y_1 + ( 2),
                     reference="SI4", value="4.7K", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (48), pos_y=center_y_1 + (-8),
                     reference="SI5", value="0R",  rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (48), pos_y=center_y_1 + (-16),
                     reference="SI6", value="56K", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (48), pos_y=center_y_1 + (-22),
                     reference="SI7", value="0R",  rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                     pos_x=center_x_1 + (48), pos_y=center_y_1 + (-27),
                     reference="SI8", value="100K", rotation=0, mirror=None)

# Place a GND power symbol on the right side to gather all ground pins
add_schematic_symbol(symbol_lib="power", symbol_name="GND",
                     pos_x=center_x_1 + (58), pos_y=center_y_1 + (-31),
                     reference="#PWR2", value="GND", rotation=0, mirror=None)

# Place a second GND power symbol on the far right for the J2 connector ground net
add_schematic_symbol(symbol_lib="power", symbol_name="GND",
                     pos_x=center_x_1 + (68), pos_y=center_y_1 + (-31),
                     reference="#PWR3", value="GND", rotation=0, mirror=None)

# ------------------------------------------------------------------
# Placing all global labels in the Schematic and connect them to the neighbour pin
# ------------------------------------------------------------------

# Add the external net labels and connect them to the first pin of each net
# The label position is offset by ±10 mm so the text sits outside the block
add_label(label_pos=[center_x_1+(-75), center_y_1+(15)],  # left side
          label_text="in",  label_ref="in_0",  label_type="bidirectional", text_orient="left")
connect_pins("in_0", "1", "SW1", "7")            # SW1 pin 7 is the common pin for “in”

add_label(label_pos=[center_x_1+(70), center_y_1+(15)],   # right side
          label_text="lo_boost_in", label_ref="lo_boost_in_0",
          label_type="bidirectional", text_orient="right")
connect_pins("lo_boost_in_0", "1", "SI7", "2")   # SI7 pin 2 is a node on the “lo‑boost‑in” net

add_label(label_pos=[center_x_1+(58), center_y_1+(22)],   # right side
          label_text="out", label_ref="out_0",
          label_type="bidirectional", text_orient="right")
connect_pins("out_0", "1", "SI6", "1")            # SI6 pin 1 is the “out” node

add_label(label_pos=[center_x_1+(60), center_y_1+(29)],   # right side
          label_text="hi_boost_out", label_ref="hi_boost_out_0",
          label_type="bidirectional", text_orient="right")
connect_pins("hi_boost_out_0", "1", "J1", "2")     # J1 pin 2 is the “hi‑boost‑out” node

# ------------------------------------------------------------------
# Connecting all wires in the Schematic
# ------------------------------------------------------------------

# 1) Connect all GND pins
# – connector J1 pin 5, J2 pins 1‑5, SI7.1, SI8.2
connect_pins("J1", "5", "#PWR1", "1")
connect_pins("J2", "1", "#PWR1", "1")
connect_pins("J2", "2", "#PWR1", "1")
connect_pins("J2", "3", "#PWR1", "1")
connect_pins("J2", "4", "#PWR1", "1")
connect_pins("J2", "5", "#PWR1", "1")
connect_pins("SI7", "1", "#PWR1", "1")
connect_pins("SI8", "2", "#PWR1", "1")

# 2) Connect the four external nets
connect_pins("J1", "2", "RV1", "3")   # J1.2 – RV1.3 – SI3.1 – SI5.1
connect_pins("J1", "3", "SI1", "1")
connect_pins("J1", "3", "SI4", "2")
connect_pins("J1", "3", "SI6", "2")
connect_pins("J1", "3", "SI7", "2")
connect_pins("J1", "4", "SI5", "2")
connect_pins("J1", "4", "SI6", "1")

# 3) Inter‑connect the resistor, capacitor, inductor, potentiometer and switch network
#   (the order below follows the net list; each line is one wire)

# R1 <‐ C1 & L1
connect_pins("R1", "1", "C1", "2")
connect_pins("C1", "1", "L1", "1")

# R2 <‐ C2 & L2
connect_pins("R2", "1", "C2", "2")
connect_pins("C2", "1", "L2", "1")

# R3 <‐ C3 & L3
connect_pins("R3", "1", "C3", "2")
connect_pins("C3", "1", "L3", "1")

# R4 <‐ C4 & L4
connect_pins("R4", "1", "C4", "2")
connect_pins("C4", "1", "L4", "1")

# R5 <‐ C5 & RV1 (middle tap)
connect_pins("R5", "1", "C5", "2")
connect_pins("C5", "1", "RV1", "2")
connect_pins("C5", "1", "L1", "2")

# R6 <‐ C6 & RV2
connect_pins("R6", "1", "C6", "2")
connect_pins("C6", "1", "RV2", "2")
connect_pins("C6", "1", "L2", "2")

# R7 <‐ C7 & RV1 (adjacent tap)
connect_pins("R7", "1", "C7", "2")
connect_pins("C7", "1", "RV1", "1")
connect_pins("C7", "1", "L1", "2")

# R1 (second side) <‐ C8 & L2
connect_pins("R1", "2", "C8", "2")
connect_pins("C8", "1", "L2", "1")

# R2 (second side) <‐ C9 & L3
connect_pins("R2", "2", "C9", "2")
connect_pins("C9", "1", "L3", "1")

# R1 (second side) <‐ R7 & L4
connect_pins("R1", "2", "R7", "2")
connect_pins("R7", "1", "L4", "1")

# R6 <‐ L6 (the 3‑way connection) and L3
connect_pins("R6", "2", "L6", "1")
connect_pins("L6", "1", "L3", "1")

# R6 <‐ L5 (the 2‑way connection)
connect_pins("R6", "2", "L5", "1")

# R3 <‐ L5
connect_pins("R3", "2", "L5", "1")

# R1 (third side) <‐ R6 & L2
connect_pins("R1", "2", "R6", "1")

# R2 (third side) <‐ R6
connect_pins("R2", "1", "R6", "1")

# Connect the rotary switch to the resistor network
connect_pins("SW1", "1", "R3", "2")
connect_pins("SW1", "2", "R2", "2")
connect_pins("SW1", "3", "R2", "2")
connect_pins("SW1", "4", "R2", "2")
connect_pins("SW1", "5", "R8", "2")
connect_pins("SW1", "6", "R8", "2")
connect_pins("SW1", "7", "R8", "1")

# 4) Connect the other GND power symbol to the J2 ground pin
connect_pins("J2", "1", "#PWR2", "1")

# 5) Connect the remaining ground symbols
connect_pins("#PWR1", "1", "#PWR3", "1")

# ------------------------------------------------------------------
# Write out all wires in the Schematic
# ------------------------------------------------------------------
write_out_all_wires()