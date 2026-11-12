### Task 4: The module's other rulings, and the 3V3 capacitance sum

**Files:**
- Create: `circuits/h7-platform/module-parts.ts`, holding part specs and C4 symbol choices, with datasheet pin names for each `ic`, as `parts.ts` does for the carrier.
- Create: `circuits/h7-platform/module-3v3-budget.ts`
- Test: `tests/circuits/h7-module-parts.test.ts`
- Modify: `docs/h7-platform/decisions.md`, `open-items.md`

**Interfaces and rulings** (each is "Controller ruling (the owner may override)", recorded in `decisions.md`):
- **`CR-MODULE-USB-ESD`:** the module DFU socket's ESD part is the USBLC6-2SC6, the part the pedal fits (USB-04), with D+ and D− wired as USB-04 wires them. What its VBUS pin (5) connects to follows `processor-and-memory.md` :267's description of the module socket's VBUS. If :267 does not say, rule it and record the ruling. Symbol: `Power_Protection:USBLC6-2SC6`. This settles the ESD half of USB-DFU-VERTICAL. The footprint half stays open for phase 4.
- **`CR-MODULE-SDRAM-SYMBOL`:**
  - W9825G6KH has no stock symbol.
  - Use `Memory_RAM:MT48LC16M16A2TG` only if its 54 pins match the W9825G6KH datasheet pin for pin, by name and number. The test records the datasheet's pin table, with its citation, and compares.
  - `part.mpn` stays W9825G6KH-6I.
  - If the pins do not match, use a project symbol under C4.
- **`CR-MODULE-SUPERVISOR-SYMBOL`:** the same treatment for the TLV803EA30DBZR (SOT-23-3). Compare against `Power_Supervisor` stock symbols, pin for pin, against the TLV803E datasheet, and use the first that matches. Otherwise use a project symbol.
- **`CR-MODULE-ID-STRAP-VALUES`:** the strap's two resistors follow the HW_REV scheme (`processor-and-memory.md` :276). The values are this module's code 0 under that scheme, cited.
- **`CR-MODULE-BLEEDER`:** do not fit the bleeder (VREF-A-BLEEDER-DECISION). The reason given is that `docs/h7-platform/` states no load the bleeder serves on the module. If `open-items.md` :82 or its sources give one, rule to fit it and record why. This row asks for a choice, so the ruling closes it.
- **`CR-MODULE-VIN-PROTECTION`:** nothing is fitted ahead of L_FILT beyond what `power.md` lists (`open-items.md` :60 names only a 26.3 V rating for anything that is fitted). A faithful transcription adds no part the documents do not name.
- **Crystal load capacitors:** values from `processor-and-memory.md` §3 (:111) for CL 8 pF. If §3 states no values, rule them from the NX3225GA datasheet's CL and the stated stray capacitance, citing both.
- **SWD header pinout:** transcribe `processor-and-memory.md` :266 onto `Connector:Conn_ARM_JTAG_SWD_10`. SWD-PINOUT-FORMAL-SPEC stays open; it asks for a check against DDI0314H, which is not in hand.
- **Produces:**
  - `moduleCapacitance3v3(network: Network): { total_F: number; entries: readonly { id: string; nominal_F: number; via: readonly string[] }[] }`.
    - It counts, at nominal, every capacitor the buck charges at start-up. That is the whole 3V3 capacitance, which `power.md` :183 uses for the switch-on bound and `analog.md` :298 says the VDDA bank counts toward.
    - **The domain is found by topology** (issue 31, finding 1). Start from the 3V3 net and walk through two-terminal resistive and inductive parts: resistors, ferrite beads and inductors. FB_VDDA and the damping leg's series resistor are the reason. Every net the walk reaches is in the domain, and every capacitor with a pin on a domain net counts. `via` names the parts walked through to reach it.
    - The walk stops at GND, at any `ic`, connector or switch, and at a capacitor. It never walks through an `ic`, so VCAP, which the MCU's internal regulator charges, is out of the domain and is said to be out.
    - A capacitor in the domain with no value refuses. Any other component on a domain net must be either an `ic`, connector or switch (a stop), or listed with a reason as a known non-capacitive load. Anything else refuses.
  - The test asserts the total is ≤ 150 µF (R-50).
  - MODULE-BUCK-LOOP-STARTUP stays open: its loop and start-up check needs TI's application report or a simulation. The row is amended to cite this sum as the half that is settled.

- [ ] **Step 1: Write the failing tests:**
  - symbol existence for every module part, and C4 pin-for-pin matches for the SDRAM and the supervisor;
  - `"the capacitance sum refuses an uncounted part on 3V3"`;
  - `"the capacitance sum fails above 150 uF"`, a control that adds 100 µF;
  - `"a capacitor behind a ferrite bead counts"` and `"a capacitor behind a series resistor counts"`: each adds one capacitor on the far side, asserts the total rises by its value, and a large enough one trips the 150 µF limit;
  - `"the walk stops at GND and at an ic"`: a capacitor reached only through an `ic`, or only from GND, does not count.
  (The module network those last two tests read comes in Task 6. Here they use a small fixture network, and Task 6 adds the real assertion.)
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement**, record each ruling, and amend the rows: USB-DFU-VERTICAL in part, VREF-A-BLEEDER-DECISION closed, MODULE-POWER-PARTS-TO-MODEL left to Task 6.
- [ ] **Step 4: Verify.** Run the tests, typecheck and `verify.sh`. Commit and push.

