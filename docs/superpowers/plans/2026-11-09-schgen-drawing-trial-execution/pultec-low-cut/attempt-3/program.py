**1.  Overall strategy**

* Choose the rotary switch **SW1** as the “anchor” of the drawing – it is the most complex symbol and will be placed in the centre of the sheet ( x = 150 mm, y = 150 mm ).  
* All other symbols are positioned with integer‑multiple‑of‑10 mm offsets from this centre so that the entire layout fits comfortably inside a 210 × 297 mm A4 sheet and the components do not overlap.  
* Two 5‑pin connectors (J1, J2) are placed to the left of the centre; they act as the external interface for the net labels.  
* Ground connections are gathered at the bottom/right side of the drawing; the GND symbol is not explicitly added – the “#PWR1” symbol can be used as a global ground reference.  

**2.  Symbol placement (library / name, reference, value, position, rotation, mirror)**  

| Symbol | Library / name | Ref | Value | pos_x | pos_y | rot | mirror |
|--------|---------------|-----|-------|-------|-------|-----|--------|
| SW1 | Switch/SW_Rotary_1x6_MP | SW1 | – | 150 | 150 | 0° | None |
| J1 | Connector_Generic/Conn_01x05 | J1 | – | 150‑120 | 150+30 | 0° | None |
| J2 | Connector_Generic/Conn_01x05 | J2 | – | 150‑120 | 150‑30 | 0° | None |
| C1 | Device/C | C1 | 0.018uF | 150‑120 | 150+10 | 0° | None |
| C2 | Device/C | C2 | 0.01uF | 150‑110 | 150+10 | 0° | None |
| C3 | Device/C | C3 | 4700pF | 150‑100 | 150+10 | 0° | None |
| C4 | Device/C | C4 | 3300pF | 150‑90 | 150+10 | 0° | None |
| C5 | Device/C | C5 | 2200pF | 150‑80 | 150+10 | 0° | None |
| C6 | Device/C | C6 | 1800pF | 150‑70 | 150+10 | 0° | None |
| C7 | Device/C | C7 | 1000nF | 150‑60 | 150+10 | 0° | None |
| RV1 | Device/R_Potentiometer | RV1 | 470kΩ | 150+20 | 150+15 | 0° | None |
| SI1 | Device/R | SI1 | 0Ω | 150+20 | 150+0 | 90° | None |
| SI2 | Device/R | SI2 | 47kΩ | 150+30 | 150+0 | 0° | None |
| SI3 | Device/C | SI3 | 0.047uF | 150+40 | 150+0 | 0° | None |
| SI4 | Device/R | SI4 | 430Ω | 150+40 | 150‑15 | 0° | None |
| SI5 | Device/R | SI5 | 0Ω | 150+40 | 150‑30 | 90° | None |
| SI6 | Device/R | SI6 | 4.7kΩ | 150+30 | 150‑30 | 0° | None |
| SI7 | Device/R | SI7 | 56kΩ | 150+50 | 150‑15 | 0° | None |
| SI8 | Device/R | SI8 | 0Ω | 150+50 | 150‑30 | 90° | None |
| SI9 | Device/R | SI9 | 100kΩ | 150+60 | 150‑15 | 0° | None |

**3.  Global labels**

* **in** – placed next to J1 pin 1.  
* **lo_boost_in** – placed next to J2 pin 3.  
* **hi_boost_out** – placed next to C7 pin 1.  
* **out** – placed next to SI5 pin 1.  

All labels use `text_orient="right"` because they sit to the left of the sheet; the orientation makes the text readable without having to flip it.

**4.  Wire connections (net‑list interpretation)**  

For each net we create a chain of `connect_pins()` calls that joins the first two items in the list, then the next two, etc.  The order is chosen so that the wires stay straight and avoid crossing.

| Net | Connections (in the order of the script) |
|------|----------------------------------------|
| **GND** | J1.5 ↔ J2.1, J2.2 ↔ J2.3, J2.4 ↔ J2.5, J2.5 ↔ SI8.1, J2.5 ↔ SI9.2 |
| **hi_boost_out** | C1.1 ↔ C2.1 ↔ C3.1 ↔ C4.1 ↔ C5.1 ↔ C6.1 ↔ C7.1 ↔ RV1.1 ↔ SI2.2 ↔ SI5.1 |
| **in** | J1.1 ↔ SI1.1 ↔ SI9.1 |
| **j5_p1** | SW1.1 ↔ C1.2 |
| **j5_p2** | SW1.2 ↔ C2.2 |
| **j5_p3** | SW1.3 ↔ C3.2 ↔ C7.2 |
| **j5_p4** | SW1.4 ↔ C4.2 |
| **j5_p5** | SW1.5 ↔ C5.2 |
| **j5_p6** | SW1.6 ↔ C6.2 |
| **lo_boost_in** | J1.3 ↔ SI3.1 ↔ SI6.2 ↔ SI7.2 ↔ SI8.2 |
| **out** | J1.4 ↔ RV1.2 ↔ RV1.3 ↔ SI7.1 ↔ SW1.7 |
| **si_hi_boost_j20_p3** | SI1.2 ↔ SI2.1 |
| **si_hi_cut_j12_p3** | SI3.2 ↔ SI4.2 |
| **si_hi_cut_j4_p2** | SI4.1 ↔ SI5.2 ↔ SI6.1 |

*The “j5_pX” nets are single‑wire connections from a switch pin to a capacitor pin; they are placed in the order that mirrors the switch’s pin numbering.*

**5.  Why the chosen rotations & mirrors**

* The 0 Ω resistors (SI1, SI5, SI8) are rotated 90° so their single pin is on the left side of the symbol – this matches the horizontal routing of the short–wire style.  
* All other components keep their default 0° orientation; no mirroring is needed.  
* The potenti‑meter (RV1) is left in the default orientation so its wiper (pin 2) is on the right side, which is convenient for the “wiper‑to‑output” connection to SI2.2 and the “top‑to‑bottom” connections to the output net.

**6.  Wire‑generation sequence**

After all `connect_pins()` calls the script ends with `write_out_all_wires()`.  This single call flushes the internal wire list to the KiCad schematic file.  

The script is wrapped with the standard boiler‑plate that imports the KiCad API:

```python
import sys, os
PROJECT_PATH = os.environ['PROJECT_PATH']
sys.path.append(PROJECT_PATH)
from modules.kicad_sch_interface import *
```

**7.  Summary of the final Python script**

The final script will:

1. Import the KiCad API.  
2. Place the 26 symbols using `add_schematic_symbol()` with the coordinates and orientations described above.  
3. Create the four global labels with `add_label()` next to the appropriate pins.  
4. Connect every pin pair according to the net list with `connect_pins()`.  
5. Call `write_out_all_wires()` to output the schematic.

All offsets are integer multiples of 10 mm, all rotations are 0° or 90°, and no mirroring is used except for the rotated 0 Ω resistors.  
The resulting schematic will be tidy, all components are clearly separated, and all nets are correctly wired, satisfying the user’s design intent.