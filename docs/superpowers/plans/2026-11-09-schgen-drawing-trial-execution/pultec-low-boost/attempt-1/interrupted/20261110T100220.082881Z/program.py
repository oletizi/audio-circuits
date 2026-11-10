# Auto‑generated schematic symbols
import sys
import os

# Get project path and import kicad schematic interface
PROJECT_PATH = os.environ['PROJECT_PATH']
sys.path.append(PROJECT_PATH)
from modules.kicad_sch_interface import *

### Placing center symbol 1 : Connector_Generic:Conn_01x05 (J1) ###
center_x_1, center_y_1 = 150.0, 110.0
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05",
                    pos_x=center_x_1, pos_y=center_y_1,
                    reference="J1", value="", rotation=0, mirror=None)

### Placing other symbols in the Schematic with respect to the center symbol 1 ###
# J1 is the main connector; all other symbols are placed relative to its centre.
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05",
                    pos_x=center_x_1 + (-80), pos_y=center_y_1 + (15),
                    reference="J2", value="", rotation=0, mirror=None)

# Global ground symbols
add_schematic_symbol(symbol_lib="power", symbol_name="GND",
                    pos_x=center_x_1 + (-85), pos_y=center_y_1 + (-25),
                    reference="#PWR_GND", value="GND", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="power", symbol_name="GND",
                    pos_x=center_x_1 + (-80), pos_y=center_y_1 + (-25),
                    reference="#PWR_J2_GND", value="GND", rotation=0, mirror=None)

# Resistor R1 (56 kΩ) – high‑boost‑in
add_schematic_symbol(symbol_lib="Device", symbol_name="R",
                    pos_x=center_x_1 + (-70), pos_y=center_y_1 + (-10),
                    reference="R1", value="56K", rotation=0, mirror=None)

# Potentiometer RV1 (47 kΩ) – voltage‑divider
add_schematic_symbol(symbol_lib="Device", symbol_name="R_Potentiometer",
                    pos_x=center_x_1 + (-60), pos_y=center_y_1 + (-10),
                    reference="RV1", value="47K", rotation=0, mirror=None)

# Switch SW1 (6‑position rotary)
add_schematic_symbol(symbol_lib="Switch", symbol_name="SW_Rotary_1x6_MP",
                    pos_x=center_x_1 + (-40), pos_y=center_y_1 + (-10),
                    reference="SW1", value="", rotation=0, mirror=None)

# Capacitors C1‑C6 placed in a row below the switch
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                    pos_x=center_x_1 + (-50), pos_y=center_y_1 + (-20),
                    reference="C1", value="0.33uF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                    pos_x=center_x_1 + (-40), pos_y=center_y_1 + (-20),
                    reference="C2", value="0.22uF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                    pos_x=center_x_1 + (-30), pos_y=center_y_1 + (-20),
                    reference="C3", value="0.12uF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                    pos_x=center_x_1 + (-20), pos_y=center_y_1 + (-20),
                    reference="C4", value="0.068uF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                    pos_x=center_x_1 + (-10), pos_y=center_y_1 + (-20),
                    reference="C5", value="0.047uF", rotation=0, mirror=None)
add_schematic_symbol(symbol_lib="Device", symbol_name="C",
                    pos_x=center_x_1 + (0),  pos_y=center_y_1 + (-20),
                    reference="C6", value="0.033uF", rotation=0, mirror=None)

# Resistors SI1‑SI8 (0 Ω – 100 kΩ)