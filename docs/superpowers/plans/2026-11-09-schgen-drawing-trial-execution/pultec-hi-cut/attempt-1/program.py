**1.  Overall goal**  
The script must create a single‑sheet Ki‑Cad schematic that contains **all** of the parts listed, puts the four net labels (“hi_boost_out”, “in”, “lo_boost_in” and “out”) on the first pin of the corresponding net, and connects every pin that belongs to the same net together.  
The layout has to be tidy, centred on an A4 sheet (210 × 297 mm) and must leave enough space between components so that their bounding boxes do not overlap.

---

**2.  Choosing a reference point**  
The rotary‑switch “SW1” is the hub of the circuit – it connects to almost every other component.  
Placing it at **(150 mm, 110 mm)** (the centre of the sheet) and giving it a **270° rotation** (so the 1‑6 pins run vertically on the left side of the symbol) gives a convenient “vertical spine” for all wires that run from the left side of the schematic to the right side.  
The long side of the switch is the 1‑6 group, the short side is the centre‑point pin (MP) and the 7‑pin.  
With this orientation the 1‑6 pins are aligned with a vertical column of other components on the left, making it simple to route long, straight wires.

---

**3.  Component placement – a grid**

| Left column (SW1‑side) | Right column (switch‑side) |
|------------------------|--------------------------|
| **Capacitors** C1‑C10 – 5 rows (C1…C10) | **Resistors & Pot.** R1, R2, R3, R4, R5, R6, RV1 – 7 rows |
| **Ground** GND symbol – bottom‑right corner | – |
| **Label pins** (hi_boost_out, in, lo_boost_in, out) – on SW1 pins 1, 6, MP, 7 | – |

* **Spacing** – 10 mm between the left and right columns, 6 mm between rows.  
* **Rotations** – all resistors & capacitors keep rotation 0°, the potentiometer keeps rotation 0° (its 2‑pin lies on the left side, 3‑pin on the right).  
* **Mirroring** – no mirroring is required; the default orientation for every symbol is used.

---

**4.  Adding the four net labels**

Each net label is created on the first pin of the net that will be visible on the schematic.  
The chosen pins are all on the left side of the schematic so that the labels stay close to the switch and do not clutter the right side.

| Net | First pin used for the label | Label text | Pin offset from the symbol (mm) | Orientation |
|-----|----------------------------|-----------|------------------------------|------------|
| **hi_‑boost_out** | SW1.6 | “hi_‑boost_out” | (‑10, 0) | left |
| **in**           | SW1.1 | “in”            | (‑10, 0) | left |
| **lo_‑boost_in** | SW1.MP | “lo_‑boost_in”  | (‑10, 0) | left |
| **out**          | SW1.7 | “out”           | (+10, 0) | right |

The `add_label()` call places a label at the calculated coordinates, then `connect_pins()` ties the label to the pin.

---

**5.  Wiring – one net at a time**

The script uses the user’s net list to decide which pins must be connected.  
For every net:

1. Pick the **first** pin in the list as the *anchor* (the point that the label is attached to).  
2. Connect every other pin on that net to the anchor with a wire.  
3. Repeat for every other pin on the same net.

Below is the logic for each net; the same pattern is repeated in the code.

| Net | Anchor pin (first in list) | Other pins that are wired to it | Reason for the connection |
|-----|---------------------------|--------------------------------|--------------------------|
| **GND** | GND symbol | J1.5, J2.1‑5, SI5.1, SI6.2 | All ground points must be common. |
| **hi_‑boost_out** | SW1.6 | J1.2, RV1.1, SI2.2, SI3.1 | These four pins form the high‑boost output. |
| **in** | SW1.1 | J1.1, SI1.1, SI6.1 | The input line ties the left‑most switch pin to the two 0 Ω resistors. |
| **j12_p1** | C1.2 | C7.2, SW1.1 | C1 and C7 are the two caps that share the same net; they also connect to the switch pin 1. |
| **j12_p2** | C2.2 | C8.2, SW1.2 | Same idea for caps 2 and 8. |
| **j12_p3** | C3.2 | SW1.3 | Caps 3 and the switch 3 are tied. |
| **j12_p4** | C4.2 | C9.2, SW1.4 | Caps 4 and 9 share net with switch 4. |
| **j12_p5** | C10.2 | C5.2, SW1.5 | Caps 10 and 5 share net with switch 5. |
| **j12_p6** | C6.2 | SW1.6 | Caps 6 and switch 6 share net. |
| **j3_p1** | R1.2 | SW1.7 | 7‑position (MP) of the switch is the centre‑point; it is connected to the right‑hand resistor. |
| **j4_p2** | R1.1 | RV1.2 | The left‑hand resistor is joined to the second potentiometer pin. |
| **lo_‑boost_in** | C1.1 | C10.1, C2.1, C3.1, C4.1, C5.1, C6.1, C7.1, C8.1, C9.1, J1.3, RV1.3, SI4.2, SI5.2 | This long line runs through all left‑side components, the first connector, the potentiometer and the two 0 Ω resistors. |
| **out** | J1.4 | SI3.2, SI4.1 | The right‑most side of the schematic – the fourth connector pin, the left‑hand 0 Ω resistor, and the right‑hand 0 Ω resistor are all tied. |
| **si_‑hi_‑boost_j20_p3** | SI1.2 | SI2.1 | The two 0 Ω resistors that sit between the “in” and “hi‑boost” lines are connected together. |

The code for each net follows the pattern  
`connect_pins(anchor_ref, "1", other_ref, other_pin)`  
because the label or the first component has a single pin (pin‑name “1”).

---

**6.  Finalisation**

After all `connect_pins()` calls the script issues

```python
write_out_all_wires()
```

which writes the complete set of wire objects to the schematic file.

---

**7.  Summary of the script flow**

1. **Import the KiCad interface** – `from modules.kicad_sch_interface import *`.  
2. **Place SW1** at `(150,110)` with rotation `270°`.  
3. **Place all capacitors, resistors, the potentiometer and the connectors** in a 10 mm‑by‑6 mm grid on either side of the switch.  
4. **Add the four net labels** on the first pin of each net (`SW1.1`, `SW1.6`, `SW1.MP`, `SW1.7`).  
5. **For every net**:  
   * Pick the first pin as the anchor,  
   * Wire all other pins on that net to the anchor with `connect_pins()`.  
6. **Call `write_out_all_wires()`** once all connections have been defined.

All coordinates are expressed as the switch centre plus an integer offset, keeping the schematic centred and spaced.  
Rotations are limited to 0°, 90°, 180° or 270° and no mirroring is needed.  
The resulting schematic will contain every part, the four global labels, and all net connections, with no overlapping symbols and a clean, readable layout.