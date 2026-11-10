**1.  Overall plan**

The user wants a KiCad schematic that implements the exact net‑list described in the *NETS* section.  
All of the components are ordinary parts (capacitors, resistors, a pot, a rotary switch and two 5‑pin connectors) plus a global *GND* symbol and four global labels (`hi_boost_out`, `in`, `lo_boost_in`, `out`).  
The code will

* place every symbol on a 210 × 297 mm sheet with generous spacing,
* place the four labels at convenient anchor points,
* connect every pin that belongs to a net to the corresponding label,
* create the single‑to‑single “j5_… / si_…” wires,
* connect all GND pins to the global GND label,
* and finally call `write_out_all_wires()`.

All coordinates are taken relative to a central reference point (`center_x = 150 mm`, `center_y = 110 mm`).  Offsets are integers, so the layout stays clean and is easy to read.

---

**2.  Symbol placement**

| Symbol | reference | value | relative offset (dx, dy) | rotation | mirror | reason for placement |
|--------|-----------|--------|------------------------|----------|---------|--------------------|
| J1 (Conn_01x05) | J1 | – | `(-120, +10)` | 0° | None | left‑most connector – its pins face right; the first two pins are used for the *in* and *hi‑boost‑out* nets. |
| J2 (Conn_01x05) | J2 | – | `(-120, ‑15)` | 0° | None | same column as J1, lower; pins 1‑5 supply the GND net and the *lo‑boost‑in* net. |
| C1 … C7 (Device:C) | C1‑C7 | 0.018 µF … 1 µF | `(-100, +20), (-100, +16), … (-100, ‑4)` | 0° | None | vertical column; the “1‑pins” all belong to *hi‑boost‑out*. |
| RV1 (Device:R_Potentiometer) | RV1 | 470 kΩ | `(-80, +20)` | 0° | None | two position pins (1‑2) feed *hi‑boost‑out* and *out*. |
| SW1 (Switch:SW_Rotary_1x6_MP) | SW1 | – | `(-60, +10)` | 0° | None | 6 positions give the *j5_pX* nets; the centre pin supplies the *out* net. |
| SI1 … SI9 (Device:R) | SI1‑SI9 | 0 Ω … 100 kΩ | `(-45, +20), (-45, +16), … (-45, ‑12)` | 0° | None | each resistor is paired with a single source or destination pin for the *j5_…* and *si_…* nets. |
| #PWR1 (power:GND) | #PWR1 | GND | `(-120, ‑25)` | 0° | None | global GND label; all GND pins are tied here. |

All offsets keep the bounding boxes separated by at least 4 mm, so there is no overlap.

---

**3.  Global label placement**

The four nets that need a visual label are placed near the “central” element of the net, then offset by 10 mm so the label text does not sit on the pin.

| Label | anchor pin | label position (x, y) | orientation | comment |
|-------|-----------|-----------------------|------------|----------|
| `in` | J1.1 | `center_x‑120 + (-15), center_y+10` | `left` | pulled left of the pin |
| `lo_boost_in` | J1.3 | `center_x‑120 + (-10), center_y‑3` | `right` | central in the *lo‑boost‑in* column |
| `hi_boost_out` | the middle of the C‑column (C4) | `center_x‑100 + (20), center_y+6` | `right` | right of the column, so the wire runs horizontally |
| `out` | J1.4 | `center_x‑120 + (25), center_y‑7` | `right` | right of the pin, near the *out* column |

Each call to `add_label` uses the pin coordinates from `get_pin_location()` plus the ±10 mm offset.

---

**4.  Wire‑connection strategy**

* **Common‑net wiring**

  For each of the four nets we first connect **all source pins** to the corresponding label.  
  The label behaves like a single‑pin node; every `connect_pins(label_ref, "1", component_ref, pin)` call automatically merges all those sources into one net when `write_out_all_wires()` is called.

  Example:  
  `hi_boost_out` – all C1‑1 … C7‑1, J1‑2, RV1‑1, SI2‑2, SI5‑1 are joined to the label `hi_boost_out_0`.

* **Single‑to‑single connections**

  The six *j5_pX* nets and three *si_…_j…_p…* nets are simple two‑pin links.  
  Each pair is wired consecutively, e.g. `connect_pins("C1", "2", "SW1", "1")` for `j5_p1`.

* **GND wiring**

  All GND pins (J1‑5, J2‑1 … J2‑5, SI8‑1, SI9‑2) are directly attached to the global GND symbol `#PWR1`.  
  Each of those connections uses the GND pin’s name `1` (the single pin of a GND symbol) and the component’s actual pin number, e.g. `connect_pins("#PWR1", "1", "J1", "5")`.

* **Rotation‑dependent pin names**

  All pins are referenced by their numeric or symbolic names as they appear in the symbol description (e.g. `"1"`, `"2"`, `"MP"`).  
  No rotation is needed for any symbol; all are placed with 0° so the pin names already match the desired direction.

---

**5.  Step‑by‑step outline of the generated script**

1. **Boiler‑plate** – import the project path and the `kicad_sch_interface` module.  
2. **Central symbol** – place a 74‑HC595 (or any suitable core) at `(150, 110)`; it serves as the reference point for all offsets.  
3. **Place each component** – call `add_schematic_symbol()` with the library, name, reference, value, and offset described in section 2.  
4. **Add the four global labels** – for each of `in`, `lo_boost_in`, `hi_boost_out`, `out` call `add_label()` with the calculated position and orientation.  
5. **Connect all *in‑net* sources** – for each net use `connect_pins(label_ref, "1", component_ref, pin)` for every source pin.  
6. **Connect the single‑to‑single j5 / si nets** – each pair is wired with a single `connect_pins()` call.  
7. **Connect all GND pins** – each GND pin is wired directly to `#PWR1`.  
8. **Finish** – `write_out_all_wires()` creates the actual wire objects in the KiCad file.

All function calls are written as individual statements (no loops), because the provided API does not support loops.  The resulting schematic will be tidy, all nets will be correctly merged, and the layout will be centered on the sheet.

---