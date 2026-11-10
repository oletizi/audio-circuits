**1.  What the user wants**  
The user has supplied a list of parts, a set of net names and a list of four global labels.  
The task is to generate a KiCad schematic that  
* contains every part,  
* connects every pin that belongs to the same net, and  
* places the four global labels (`hi_boost_out`, `in`, `lo_boost_in`, `out`) on the proper wires.  

All parts are passive (capacit‑, resistor‑, inductor‑, potentiometer‑ and a rotary‑switch).  
The schematic must be readable and free of overlapping symbols.

---

**2.  Overall layout plan**  

| Symbol | Reference | Library | Value | Position (relative to centre) | Rotation | Mirror | Reason |
|--------|-----------|---------|--------|------------------------------|----------|--------|--------|
| SW1 | SW1 | Switch/​SW_Rotary_1x6_MP | “~” | (0 mm, 0 mm) | 270° | None | Anchor of the whole block; its horizontal pin line matches the other components |
| C1‑C9 | C1 … C9 | Device/C | 4700 pF, 3300 pF, 1000 pF, 470 pF, 1000 pF, 0.5 µF, 430 R, 0 R, 50.0 µF | Left‑middle‑right columns; 20 mm vertical offset for the top row, 0 mm for the middle row, ‑20 mm for the bottom row | 0° (except C9 and C9‑2 are 180° to keep the 0.5 µF on the right side) | None | Keeps the vertical column layout tidy |
| R1‑R6 | R1 … R6 | Device/R or R/Potentiometer | 4.7 kΩ, 47 kΩ, 10 kΩ, 1.0 kΩ, 0 R, 56 kΩ | Left‑middle‑right columns; same vertical rows as the capacitors | 0° (except R2 is 180° so its 430 Ω is on the left side) | None | Keeps the horizontal wire bundle clean |
| L1‑L4 | L1 … L4 | Device/L | 100 mH, 200 mH, 300 mH, 600 mH | Left‑middle‑right columns; same vertical rows as the capacitors | 0° | None | Keeps the inductors in a straight column |
| J1, J2 | J1, J2 | Connector_Generic/Conn_01x05 | “Conn_01x05” | Bottom‑left and bottom‑right (–20 mm, –30 mm and –20 mm, –20 mm) | 0° | None | Keeps the two 1‑x‑5 connectors close together |
| GND | GNDA | power/GND | “GND” | Bottom‑left (–8 mm, –20 mm) | 0° | None | Placed under the connectors – a common ground‑bus position |

The centre of the schematic is set to **(150 mm, 110 mm)** so the whole block sits near the centre of the A4 sheet.  
All horizontal offsets are 8 mm (≈ 0.33 in) and all vertical offsets are multiples of 20 mm, giving at least one‑footprint clearance between neighbouring symbols.

---

**3.  Adding the global labels**  

For each label in **LABELS** we

1. Pick a *representative pin* that is part of the net (the first pin in the net list is usually easiest).  
2. Call `get_pin_location(symbol_ref, pin_name)` to get the exact coordinate.  
3. Offset that coordinate by ±5 mm (left or right) so the label sits next to the wire, not on top of it.  
4. Use `add_label` with `label_type="input"` – all these nets are driven from the connectors / switch so an **input** orientation is appropriate.  
5. Connect the label to the chosen pin with `connect_pins(label_ref, "1", symbol_ref, pin_name)`.

The four nets are small, so one label per net is enough:  
* `hi_boost_out_0` – attached to C1‑1 (the first pin of the hi‑boost net)  
* `in_0` – attached to J1‑1 (the first pin of the in net)  
* `lo_boost_in_0` – attached to C6‑1 (first pin of the lo‑boost net)  
* `out_0` – attached to J1‑4 (first pin of the out net)  

All labels are placed on the *right* side of the connected wire except the `in_0` label which is on the *left* side, giving a consistent visual flow from the connectors to the rest of the circuit.

---

**4.  Wiring the nets**  

Each net from the **NETS** section is connected by chaining all its pins in the order they were listed.  
The algorithm is:

```
for net in NETS:
    pins = list_of_pin_pairs   # (symbol, pin_name) for each net pin
    for i in range(len(pins)-1):
        connect_pins(pins[i].symbol, pins[i].pin_name,
                    pins[i+1].symbol, pins[i+1].pin_name)
    # connect the global label to the first pin
    connect_pins(net_label, "1", pins[0].symbol, pins[0].pin_name)
```

**Why this works**

* A *chain* guarantees that all pins are electrically in the same net.  
* The order is arbitrary – the resulting net is still the same – but using the order from the user’s file keeps the code predictable.  
* For the large nets (e.g. `j15_p1`) we still only need a few `connect_pins` calls because we connect the four “terminal” wires together.  
* The global label is attached to the first pin of the chain so that the entire wire segment is labelled.

Examples of a few chains that will appear in the script:

* **lo_boost_in** – `C6.1 → C7.1 → C9.1 → L1.1` (C6‑1 is the first pin, so the label is connected to it).  
* **hi_boost_out** – `C1.1 → C2.1 → C3.1 → C5.1` (label on C1‑1).  
* **j15_p2** – `C4.1 → C8.1 → L2.1` (label on C4‑1).  
* **j15_p3** – `C2.1 → C3.1 → C5.1 → L3.1` (label on C2‑1).  
* **j15_p4** – `C1.1 → L4.1` (label on C1‑1).  
* **j8_p1** – `C7.2 → SW1‑6` (label on C7‑2).   … etc.

The other nets (`j8_p2 … j8_p6`, `j20_p1`, `j20_p3`, `j19_p1`) are built in the same way.

---

**5.  Closing the script**  

After all `connect_pins` statements, a single call to `write_out_all_wires()` flushes the netlist to the KiCad file.  
No other code is required.

---

**6.  Why the chosen rotations & mirroring work**  

* **SW1** – 270°: the rotary‑switch symbol has its 6‑position pins on a horizontal line; this orientation matches the horizontal bus that runs through the middle row, making all wires straight.  
* **R2 and R6** – 180°: mirrors the 47 kΩ and 430 R resistors so that they sit on the same horizontal line as the other resistors, keeping the wire bundle neat.  
* **C9 and C2.2** – 180°: places the 0.5 µF capacitor on the right side of the block, avoiding a long horizontal run across the left side and keeping the right‑hand side of the block uncluttered.  
* **All other symbols** are left at 0° so that their vertical pins are already aligned with the vertical columns, which is the simplest for routing a grid‑like layout.

---

**7.  Summary of the script flow**

1. **Imports** – bring in the KiCad‑sch interface.  
2. **Define centre** – `center_x_1 = 150.0`, `center_y_1 = 110.0`.  
3. **Add symbols** – a call to `add_schematic_symbol` for every part using the offsets described above.  
4. **Create labels** – for each global label:  
   * `get_pin_location` → position → `add_label` → `connect_pins` to the pin.  
5. **Wire the nets** – for each net: chain all its pins with `connect_pins`, then connect the global label to the first pin.  
6. **Write the wires** – a single `write_out_all_wires()` call.

This logical, column‑by‑column, and chain‑by‑chain approach guarantees a clean, non‑overlapping schematic that satisfies the user’s net‑list and label requirements.