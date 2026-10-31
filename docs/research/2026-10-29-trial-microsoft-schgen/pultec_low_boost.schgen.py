"""pultec-low-boost, hand-written as a SchGen generated-program.

Written by hand in the format of SchGen's own example
schematic_generation/sch_examples/imu_L1.py, using only the five primitives
that config.py's system prompt defines:
  add_schematic_symbol, get_pin_location, add_label, connect_pins,
  write_out_all_wires.

Every coordinate is a literal. Author coordinates are the ones SchGen's prompt
describes: origin at the bottom-left of a 297 x 210 mm A4 sheet, Y increasing
upward (kicad_sch_interface applies reY() = 210 - y and snaps to the 1.27 mm
grid). All positions here sit on that grid already, so the snap shifts the whole
drawing uniformly and relative alignment is preserved.

Netlist this is drawn from (as KiCad exports it from the project's model):
  0 (ground)      : C1.1 C2.1 C3.1 C4.1 C5.1 C6.1 J1.5 J2.1 J2.2 J2.3 J2.4
                    J2.5 RV1.1 SI8.2
  Net-(C1-Pad2)   : C1.2 SW1.1        Net-(C4-Pad2)  : C4.2 SW1.4
  Net-(C2-Pad2)   : C2.2 SW1.2        Net-(C5-Pad2)  : C5.2 SW1.5
  Net-(C3-Pad2)   : C3.2 SW1.3        Net-(C6-Pad2)  : C6.2 SW1.6
  Net-(SI1-Pad2)  : SI1.2 SI2.1
  Net-(SI3-Pad2)  : SI3.2 SI4.2
  Net-(SI4-Pad1)  : SI4.1 SI5.2 SI6.1
  hi_boost_out    : J1.2 SI2.2 SI5.1 SI7.1
  in              : J1.1 SI1.1 SI8.1
  lo_boost_in     : J1.3 R1.1 RV1.2 RV1.3 SI3.1 SI6.2 SW1.7
  out             : J1.4 R1.2 SI7.2
  SW1.MP is a mechanical mounting lug, on no net, and is left unconnected.

SW1 is the real 6-way rotary: Switch:SW_Rotary_1x6_MP, pins 1..6 + common 7 +
mounting lug MP. Nothing is substituted. J1/J2 are Connector_Generic:Conn_01x05.
Stock SchGen cannot address the pins of any of those three symbols; run this
with SCHGEN_PATCH_PINS=1 to apply the four-line fix described in the report.
"""

import os
import sys

PROJECT_PATH = os.environ['PROJECT_PATH']
sys.path.append(PROJECT_PATH)

if os.environ.get("SCHGEN_PATCH_PINS") == "1":
    import modules.utils.kicad_add_symbol as _kas

    def _extract_pins_all_children(symbol_sexp):
        """SchGen's extract_pins_from_symbol, with its `item[2][0] == 'pin'`
        guard replaced by a scan of every child of every unit sub-symbol."""
        pins = []
        for item in symbol_sexp:
            if isinstance(item, list) and len(item) > 2 and item[0] == 'symbol':
                for pin_info in item[2:]:
                    if (isinstance(pin_info, list) and len(pin_info) > 1
                            and pin_info[0] == 'pin'):
                        for p_item in pin_info:
                            if (isinstance(p_item, list) and len(p_item) > 1
                                    and p_item[0] == 'number'):
                                pins.append(['pin', p_item[1],
                                             ['uuid', _kas.generate_uuid()]])
                                break
        return pins

    _kas.extract_pins_from_symbol = _extract_pins_all_children
    print("NOTE: extract_pins_from_symbol patched (SCHGEN_PATCH_PINS=1)")

from modules.kicad_sch_interface import *

### Placing the symbols ###

# -- Block: board connector J1 (in / hi_boost_out / lo_boost_in / out / GND)
#    rot 0 + mirror y puts its five pins on the right-hand side, pin 1 at top.
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05", pos_x=38.1, pos_y=171.9, reference="J1", value="5-pin", rotation=0, mirror="y")

# -- Block: ground connector J2, rotated so its five pins point downward
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05", pos_x=38.1, pos_y=146.5, reference="J2", value="5-pin", rotation=90, mirror="None")

# -- Block: input chain, left to right along y = 184.6
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=88.9, pos_y=184.6, reference="SI1", value="0R", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=107.95, pos_y=184.6, reference="SI2", value="47K", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=146.05, pos_y=184.6, reference="SI7", value="0R", rotation=90, mirror="None")
# input shunt, hanging below the `in` node
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=85.09, pos_y=176.98, reference="SI8", value="100K", rotation=0, mirror="None")

# -- Block: shaping network, upper branch along y = 159.2
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=88.9, pos_y=159.2, reference="SI5", value="0R", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=107.95, pos_y=159.2, reference="SI6", value="4.7K", rotation=90, mirror="None")
# -- Block: shaping network, lower branch along y = 146.5
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=96.52, pos_y=146.5, reference="SI4", value="430R", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=111.76, pos_y=146.5, reference="SI3", value=".047uF", rotation=270, mirror="None")

# -- Block: boost control pot and the series resistor to the output
add_schematic_symbol(symbol_lib="Device", symbol_name="R_Potentiometer", pos_x=203.2, pos_y=133.8, reference="RV1", value="47K", rotation=180, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="R", pos_x=228.6, pos_y=133.8, reference="R1", value="56K", rotation=0, mirror="None")

# -- Block: 6-way rotary selector and its capacitor bank.
#    The selector's six pins are on a fixed 2.54 mm pitch and a Device:C body
#    is 4.06 mm across, so the caps are stepped right as well as down: that
#    keeps every selector-to-cap wire a single straight horizontal run.
add_schematic_symbol(symbol_lib="Switch", symbol_name="SW_Rotary_1x6_MP", pos_x=76.2, pos_y=83.0, reference="SW1", value="6-way", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=95.25, pos_y=90.62, reference="C1", value=".33uF", rotation=270, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=104.14, pos_y=88.08, reference="C2", value=".22uF", rotation=270, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=113.03, pos_y=85.54, reference="C3", value=".12uF", rotation=270, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=121.92, pos_y=83.0, reference="C4", value=".068uF", rotation=270, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=130.81, pos_y=80.46, reference="C5", value=".047uF", rotation=270, mirror="None")
add_schematic_symbol(symbol_lib="Device", symbol_name="C", pos_x=139.7, pos_y=77.92, reference="C6", value=".033uF", rotation=270, mirror="None")

# -- Ground symbols, one per ground pin
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=85.09, pos_y=168.09, reference="#PWR1", value="GND", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=203.2, pos_y=124.91, reference="#PWR2", value="GND", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=50.8, pos_y=166.82, reference="#PWR3", value="GND", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=33.02, pos_y=133.8, reference="#PWR4", value="GND", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=35.56, pos_y=133.8, reference="#PWR5", value="GND", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=38.1, pos_y=133.8, reference="#PWR6", value="GND", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=40.64, pos_y=133.8, reference="#PWR7", value="GND", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=43.18, pos_y=133.8, reference="#PWR8", value="GND", rotation=0, mirror="None")
# The cap-bank grounds go to two columns, 5.08 mm apart within each column,
# because a power:GND symbol is 2.54 mm tall and the bank steps by 2.54 mm.
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=152.4, pos_y=90.62, reference="#PWR9", value="GND", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=163.83, pos_y=88.08, reference="#PWR10", value="GND", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=152.4, pos_y=85.54, reference="#PWR11", value="GND", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=163.83, pos_y=83.0, reference="#PWR12", value="GND", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=152.4, pos_y=80.46, reference="#PWR13", value="GND", rotation=90, mirror="None")
add_schematic_symbol(symbol_lib="power", symbol_name="GND", pos_x=163.83, pos_y=77.92, reference="#PWR14", value="GND", rotation=90, mirror="None")

### Placing all global labels and connecting each to its neighbour pin ###

# `in` -- one label on J1 pin 1, one on the wired SI1/SI8 cluster
x_J1_1, y_J1_1 = get_pin_location(symbol_ref="J1", pin_name="1")
add_label(label_pos=[x_J1_1+(7.62), y_J1_1+(0)], label_text="in", label_ref="in_J1", label_type="input", text_orient="right")
connect_pins("in_J1", "1", "J1", "1")

x_SI1_1, y_SI1_1 = get_pin_location(symbol_ref="SI1", pin_name="1")
add_label(label_pos=[x_SI1_1+(-8.89), y_SI1_1+(0)], label_text="in", label_ref="in_SI1", label_type="input", text_orient="left")
connect_pins("in_SI1", "1", "SI1", "1")

# `hi_boost_out` -- J1 pin 2, the SI5 input, and the wired SI2/SI7 cluster
x_J1_2, y_J1_2 = get_pin_location(symbol_ref="J1", pin_name="2")
add_label(label_pos=[x_J1_2+(7.62), y_J1_2+(0)], label_text="hi_boost_out", label_ref="hb_J1", label_type="bidirectional", text_orient="right")
connect_pins("hb_J1", "1", "J1", "2")

x_SI5_1, y_SI5_1 = get_pin_location(symbol_ref="SI5", pin_name="1")
add_label(label_pos=[x_SI5_1+(-8.89), y_SI5_1+(0)], label_text="hi_boost_out", label_ref="hb_SI5", label_type="bidirectional", text_orient="left")
connect_pins("hb_SI5", "1", "SI5", "1")

x_SI7_1, y_SI7_1 = get_pin_location(symbol_ref="SI7", pin_name="1")
add_label(label_pos=[x_SI7_1+(0), y_SI7_1+(-8.89)], label_text="hi_boost_out", label_ref="hb_SI7", label_type="bidirectional", text_orient="bottom")
connect_pins("hb_SI7", "1", "SI7", "1")

# `lo_boost_in` -- six separate clusters
x_J1_3, y_J1_3 = get_pin_location(symbol_ref="J1", pin_name="3")
add_label(label_pos=[x_J1_3+(7.62), y_J1_3+(0)], label_text="lo_boost_in", label_ref="lb_J1", label_type="bidirectional", text_orient="right")
connect_pins("lb_J1", "1", "J1", "3")

x_SI6_2, y_SI6_2 = get_pin_location(symbol_ref="SI6", pin_name="2")
add_label(label_pos=[x_SI6_2+(8.89), y_SI6_2+(0)], label_text="lo_boost_in", label_ref="lb_SI6", label_type="bidirectional", text_orient="right")
connect_pins("lb_SI6", "1", "SI6", "2")

x_SI3_1, y_SI3_1 = get_pin_location(symbol_ref="SI3", pin_name="1")
add_label(label_pos=[x_SI3_1+(8.89), y_SI3_1+(0)], label_text="lo_boost_in", label_ref="lb_SI3", label_type="bidirectional", text_orient="right")
connect_pins("lb_SI3", "1", "SI3", "1")

x_RV1_3, y_RV1_3 = get_pin_location(symbol_ref="RV1", pin_name="3")
add_label(label_pos=[x_RV1_3+(0), y_RV1_3+(8.89)], label_text="lo_boost_in", label_ref="lb_RV1", label_type="bidirectional", text_orient="top")
connect_pins("lb_RV1", "1", "RV1", "3")

x_R1_1, y_R1_1 = get_pin_location(symbol_ref="R1", pin_name="1")
add_label(label_pos=[x_R1_1+(0), y_R1_1+(8.89)], label_text="lo_boost_in", label_ref="lb_R1", label_type="bidirectional", text_orient="top")
connect_pins("lb_R1", "1", "R1", "1")

x_SW1_7, y_SW1_7 = get_pin_location(symbol_ref="SW1", pin_name="7")
add_label(label_pos=[x_SW1_7+(-8.89), y_SW1_7+(0)], label_text="lo_boost_in", label_ref="lb_SW1", label_type="bidirectional", text_orient="left")
connect_pins("lb_SW1", "1", "SW1", "7")

# `out` -- J1 pin 4, the SI7 output, and the R1 output
x_J1_4, y_J1_4 = get_pin_location(symbol_ref="J1", pin_name="4")
add_label(label_pos=[x_J1_4+(7.62), y_J1_4+(0)], label_text="out", label_ref="out_J1", label_type="output", text_orient="right")
connect_pins("out_J1", "1", "J1", "4")

x_SI7_2, y_SI7_2 = get_pin_location(symbol_ref="SI7", pin_name="2")
add_label(label_pos=[x_SI7_2+(8.89), y_SI7_2+(0)], label_text="out", label_ref="out_SI7", label_type="output", text_orient="right")
connect_pins("out_SI7", "1", "SI7", "2")

x_R1_2, y_R1_2 = get_pin_location(symbol_ref="R1", pin_name="2")
add_label(label_pos=[x_R1_2+(0), y_R1_2+(-8.89)], label_text="out", label_ref="out_R1", label_type="output", text_orient="bottom")
connect_pins("out_R1", "1", "R1", "2")

### Connecting all wires in the Schematic ###

# `in` cluster: SI1 pin 1 up to SI8 pin 1
connect_pins("SI1", "1", "SI8", "1")

# Net-(SI1-Pad2): SI1 pin 2 to SI2 pin 1
connect_pins("SI1", "2", "SI2", "1")

# `hi_boost_out` cluster: SI2 pin 2 across to SI7 pin 1
connect_pins("SI2", "2", "SI7", "1")

# Net-(SI4-Pad1): SI5 pin 2 to SI6 pin 1, and SI5 pin 2 down to SI4 pin 1
connect_pins("SI5", "2", "SI6", "1")
connect_pins("SI5", "2", "SI4", "1")

# Net-(SI3-Pad2): SI4 pin 2 to SI3 pin 2
connect_pins("SI4", "2", "SI3", "2")

# `lo_boost_in` cluster at the pot: wiper tied to the top end
connect_pins("RV1", "2", "RV1", "3")

# Net-(Cn-Pad2): rotary selector pins to the capacitor bank
connect_pins("SW1", "1", "C1", "2")
connect_pins("SW1", "2", "C2", "2")
connect_pins("SW1", "3", "C3", "2")
connect_pins("SW1", "4", "C4", "2")
connect_pins("SW1", "5", "C5", "2")
connect_pins("SW1", "6", "C6", "2")

# Ground
connect_pins("SI8", "2", "#PWR1", "1")
connect_pins("RV1", "1", "#PWR2", "1")
connect_pins("J1", "5", "#PWR3", "1")
connect_pins("J2", "1", "#PWR4", "1")
connect_pins("J2", "2", "#PWR5", "1")
connect_pins("J2", "3", "#PWR6", "1")
connect_pins("J2", "4", "#PWR7", "1")
connect_pins("J2", "5", "#PWR8", "1")
connect_pins("C1", "1", "#PWR9", "1")
connect_pins("C2", "1", "#PWR10", "1")
connect_pins("C3", "1", "#PWR11", "1")
connect_pins("C4", "1", "#PWR12", "1")
connect_pins("C5", "1", "#PWR13", "1")
connect_pins("C6", "1", "#PWR14", "1")

write_out_all_wires()
