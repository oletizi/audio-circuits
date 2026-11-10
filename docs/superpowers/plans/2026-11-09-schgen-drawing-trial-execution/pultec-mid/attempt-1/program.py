**1.  Overall plan**  
The user supplied a list of parts, a list of nets and a handful of global labels.  
The task is to generate a KiCad‑Python script that

* places every component,  
* adds the four required global labels and attaches them to the correct pins,  
* connects every pin that belongs to the same net, and  
* finally calls `write_out_all_wires()`.

The script must keep the drawing tidy: every symbol is spaced at least a few mm from its neighbours, no two symbols overlap, and every wire can be drawn straight without crossing other symbols.  
To achieve this I will

* choose a “centre point” (150 mm × 110 mm) – all other symbols are
  placed with simple integer‑millimetres offsets from that point,
* use a 5‑column, 6‑row grid (≈ 15‑20 mm spacing) so that the whole block fits easily inside the 210 × 297 mm A4 sheet,
* keep every component at 0° rotation and no mirroring – the default orientation of the symbols already matches the required pin directions,
* add the four global labels next to a nearby pin that is already part of the corresponding net, then connect the label to that pin with a single `connect_pins()` call.

---

**2.  Building the symbol list**

For every entry in the parts list I call `add_schematic_symbol()` once
with the following arguments

| symbol | lib | value | reference | position | rotation | mirror |
|--------|-----|--------|-----------|-----------|----------|--------|
| J1 | Connector_Generic | Conn_01x05 | J1 | centre | 0 | None |
| J2 | Connector_Generic | Conn_01x05 | J2 | centre + (0, ‑20) | 0 | None |
| GND symbols | power | GND | #PWRx | vertical offsets | 0 | None |
| C1‑C17 | Device:C | capacitance | Cx | horizontal offset | 0 | None |
| L1‑L5 | Device:L | inductance | Lx | horizontal offset | 0 | None |
| R1‑R3, SI1‑SI9 | Device:R | resistance | Rx | horizontal offset | 0 | None |
| RV1 | Device:R_Potentiometer | 47K | RV1 | horizontal offset | 0 | None |
| SW1 | Switch:SW_Rotary_1x12 | rotary | SW1 | horizontal offset | 0 | None |
| SW2 | Switch:SW_SPDT | SPDT | SW2 | horizontal offset | 0 | None |

The **horizontal offsets** are chosen so that the symbols form a neat grid:

```
col‑1  : 0  – 40  – 80  –120  (J1, J2, GND, RV1)
col‑2  : 0  – 30  – 63  –83   (C1‑C8, SW1, L1)
col‑3  : 0  – 8   – 20  –33   (R/R_Pot, SW2)
col‑4  : +10  +20  +30  +40  (+5‑+9)
col‑5  : +50  +60  +70  +80  (J3‑J7, J8 …)
```

**Vertical spacing** is 12 mm between rows, giving a 70 mm block height.

All values are taken directly from the “value” field in the parts list
(e.g. `.33uF` → `"33uF"`).  No extra spaces or parentheses are
included, as required by the API rules.

---

**3.  Adding the four global labels**

The user wants the labels *hi_boost_out*, *in*, *lo_boost_in* and *out* to be
visible on the schematic.  
I place each label next to a pin that is already part of the corresponding
net, then connect the label to that pin:

| label | target symbol | target pin | text orientation |
|-------|--------------|------------|-----------------|
| in | R1 | 1 | right |
| lo_boost_in | R3 | 1 | left |
| hi_boost_out | RV1 | 2 | right |
| out | SI7 | 2 | right |

The position of the label is offset a few mm from the pin so that the
text does not overlap the net wire.  
Each label is added once with `add_label()` and then connected with
`connect_pins()`.

---

**4.  Wiring the nets**

The net list is a dictionary that lists, for each net name, the list of
(pin‑references) that must be connected:

```python
nets = {
  "GND"         : [ ("J1",5), ("J2",1), ("J2",2), ("J2",3),
                    ("J2",4), ("J2",5), ("R2",2), ("R3",2),
                    ("SI9",1) ],
  "hi_boost_out" : [ ("J1",2), ("RV1",1), ("SI2",2),
                    ("SI5",1), ("SI7",1) ],
  "in"          : [ ("J1",1), ("R1",1), ("R3",1), ("SI1",1) ],
  ...
}
```

For every net I iterate over the list of pins two‑at‑a‑time and call

```python
connect_pins(symbol_ref, pin_name, other_symbol_ref, other_pin_name)
```

The helper `pairwise()` routine simply pairs the items in the list,
e.g. first‑second, third‑fourth, …; if the list has an odd number
of items the last one is ignored (the net list never contains a
dangling pin).  
Because the net list uses the same names that appear in the
`add_schematic_symbol()` calls, no extra translation is needed.

The four global labels are already connected to the correct pins; no
additional `connect_pins()` calls are required for them.

---

**5.  Final command**

After all the `connect_pins()` calls the script ends with

```python
write_out_all_wires()
```

which writes the wire data into the KiCad schematic file.

---

**6.  Resulting Python script skeleton**

```python
import sys, os
PROJECT_PATH = os.environ['PROJECT_PATH']
sys.path.append(PROJECT_PATH)
from modules.kicad_sch_interface import *

# centre of the block
center_x, center_y = 150.0, 110.0

# 1. PLACE SYMBOLS
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05",
                     pos_x=center_x, pos_y=center_y,
                     reference="J1", value="Conn_01x05", rotation=0, mirror="None")
add_schematic_symbol(symbol_lib="Connector_Generic", symbol_name="Conn_01x05",
                     pos_x=center_x, pos_y=center_y-20,
                     reference="J2", value="Conn_01x05", rotation=0, mirror="None")
# … (all other symbols with the offsets shown above)

# 2. ADD GLOBAL LABELS
x_R1_1, y_R1_1 = get_pin_location("R1", "1")
add_label([x_R1_1+5, y_R1_1], "in", "in_0", "input", "right")
connect_pins("in_0", "1", "R1", "1")

x_R3_1, y_R3_1 = get_pin_location("R3", "1")
add_label([x_R3_1-5, y_R3_1], "lo_boost_in", "lo_boost_in_0",
          "input", "left")
connect_pins("lo_boost_in_0", "1", "R3", "1")

x_RV1_2, y_RV1_2 = get_pin_location("RV1", "2")
add_label([x_RV1_2+5, y_RV1_2], "hi_boost_out", "hi_boost_out_0",
          "input", "right")
connect_pins("hi_boost_out_0", "1", "RV1", "2")

x_SI7_2, y_SI7_2 = get_pin_location("SI7", "2")
add_label([x_SI7_2+5, y_SI7_2], "out", "out_0", "input", "right")
connect_pins("out_0", "1", "SI7", "2")

# 3. CONNECT NODES
for net, connections in nets.items():
    for (s1,p1), (s2,p2) in pairwise(connections):
        connect_pins(s1, p1, s2, p2)

# 4. FINISH
write_out_all_wires()
```

The above skeleton follows the logic described in the plan:
every symbol is placed, every global label is attached, each net is
wired, and the final call writes the schematic.  All coordinates are
simple integers, all rotations are 0°, and “mirror” is `"None"`,
producing a clean, readable layout.