**1.  What the user wants**  
The request defines a small boost‑converter block that uses a 6‑position rotary switch (SW1) to select among 10 input capacitors (C1‑C10) and a small resistor network (R1, RV1, SI1‑SI6).  
The four nets that must appear as global labels are:

| Net | What it carries | Pins that belong to it |
|-----|----------------|-----------------------|
| **in** | Low‑impedance rail (ground‑like) | J1‑1, J1‑3, SI1‑1, SI6‑1 |
| **lo\_boost\_in** | Reference for the low‑impedance side | all C‑cap “1” pins, all SR‑potentiometer pins, all low‑side switch pins |
| **hi\_boost\_out** | High‑voltage output | J1‑4, J1‑6, the high‑side side of each of the 10 capacitors (C1‑2 … C10‑2) and the high‑side switch pins 1‑6 |
| **out** | The high‑voltage output that is fed to the load | J1‑5, all “8” pins of the capacitors that are already connected to the high‑side network (C2‑8, C8‑8), and the extra high‑side switch pin 6 |

The schematic must be readable, centred on an A4 sheet, and must use the KiCad Python API functions provided.

---

**2.  Symbol placement strategy**  

* **Reference point** – `center_x = 150.0 mm, center_y = 150.0 mm` is chosen so the whole layout is centred on the sheet.  
* **Power/ground symbols** – All GND and VIN symbols are placed to the left of the centre so that the long horizontal “in / lo‑boost‑in” line can run straight to the right.  
* **Capacitors** – Two columns of 10 caps are arranged next to the two 5‑pin connectors.  
  * Column 0 (C1‑C5) is left‑aligned with the first connector; column 1 (C6‑C10) is offset by the width of the connectors plus a 10 mm gap.  
  * The 2200 pF capacitor (C10) sits in column 1, at the far right, so its high‑side pin will line‑up with the switch.  
* **Resistors & potenti‑meter** – R1, RV1, SI1‑SI6 are clustered immediately to the right of the capacitor columns.  
  * RV1 (the potenti‑meter) is oriented 90° so its wiper (3) points to the right; the other two pins (1 & 2) point straight up/down.  
  * SI1‑SI6 are kept at 0° so all pins run up/down, making it easy to connect them to the “in” and “lo‑boost‑in” nets.  
* **Rotary‑switch** – SW1 is placed to the right of the resistor cluster and rotated 270° (counter‑clockwise).  
  * With this rotation the “G” pin (ground side) now points downward towards the J2‑pins that carry the “lo‑boost‑in” net, while the 1‑6 pins (four of the 6‑position contacts) point upward to the high‑side network.  
* **Connector J1 & J2** – Both 5‑pin connectors are placed on the left side of the layout, one below the other, with J2 mirrored so its pin‑layout is identical but rotated 180° for readability.  
  * J1 carries the “in”, “lo‑boost‑in”, “hi‑boost‑out” and “out” nets on its pins 1‑6.  
  * J2 carries the same nets on its pins 1‑5, but the ground pins (5 and 1‑4) are pulled down into the GND net.

All coordinates are expressed as `center_x ± offset` and `center_y ± offset` so that a small adjustment keeps the whole block centred.

---

**3.  Global labels**  

Four net labels are created with `add_label`:

| Label | `label_pos` (relative to the pin) | `label_text` | `label_ref` | `label_type` | `text_orient` |
|-------|-----------------------------------|---------------|-------------|--------------|----------------|
| in | [x_J1_1‑6 mm, y_J1_1] | “in” | “in_0” | “input” | “left” |
| lo_boost_input | [x_C1_1‑10 mm, y_C1_1] | “lo_boost_in” | “lo_boost_in_0” | “input” | “left” |
| hi_boost_out | [x_J1_4 + 10 mm, y_J1_4] | “hi_boost_out” | “hi_boost_out_0” | “output” | “right” |
| out | [x_J1_5 + 10 mm, y_J1_5] | “out” | “out_0” | “bidirectional” | “right” |

The offsets are chosen so the label text sits a few millimetres away from the pin, never overlapping other wires.  

---

**4.  Connections – the “NETS” list**  

The user supplied a set of net definitions.  Each net is a list of pin pairs that must be electrically shorted.  The script will call `connect_pins` for every pair.  The order is not critical because all nets are independent, but for readability we group them by net name:

1. **GND** – connect the GND symbol to J1‑5, J2‑1‑5, SI5‑1 and SI6‑2 and the ground pin of the J2 connector.  
2. **in** – connect the “in” label to J1‑1, J1‑3, SI1‑1 and SI6‑1.  
3. **lo_boost_in** – connect the “lo‑boost‑in” label to every capacitor “1” pin, RV1 pins 1‑3, and the low‑side switch pins.  
4. **hi_boost_out** – connect the “hi‑boost‑out” label to the high‑side pins of C1‑C10 and the high‑side switch pins 1‑6.  
5. **out** – connect the “out” label to C2‑8 and C8‑8 and the high‑side switch pins 6‑7.  

Finally each explicit pair from the **NETS** list is wired with a separate `connect_pins` call.  For example, `C3.2` ↔ `SW1.3` becomes:

```python
connect_pins("C3", "2", "SW1", "3")
```

All arguments are simple: the symbol reference and the pin name (or number).  The pin names are exactly those defined in the library (e.g. “2”, “3”, “MP”).

---

**5.  Rotation / mirroring justification**  

* The switch was rotated 270° so that its ground‑side pin (G) faces downward, making the long “in / lo‑boost‑in” line run straight to J2‑pins 1‑5.  
* No mirroring is required for the other symbols because their default orientation already aligns with the schematic axes.  
* The J2 connector is the mirrored copy of J1, which the library automatically creates; we therefore set `mirror="None"` for J2 to keep its orientation consistent.

---

**6.  Final script outline**

1. **Import the KiCad interface** – as shown in the example.  
2. **Place the centre symbol (the centre of the block).**  
3. **Place every other symbol** using `add_schematic_symbol` with the calculated coordinates, references and values (e.g. “47uF” for the 0.047 µF caps, “430R” for R1).  
4. **Create the four global labels** with `add_label`.  
5. **Wire every net** with `connect_pins`.  
6. **Call `write_out_all_wires()`** to write the schematic file.

This sequence follows the API’s contract, guarantees that all pins are correctly connected, and keeps the layout centered and readable.