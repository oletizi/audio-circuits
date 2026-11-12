### Task 6: The module model

**Files:**
- Create: `circuits/h7-platform/module/` with one file per block. Each exports a function returning that block's `Network` with declared ports:
  - `mcu.ts` holds U_MCU only. It is atomic, so every other block reaches the MCU through ports. All 176 pins are accounted for, each as either a specified connection (a port) or an explicit NC.
    - An NC is allowed only on a GPIO that no internal function, interface signal or ID strap uses, and each one cites CORE-27 (`schematic-checklist.md` :79: unused MCU pins get no external resistor and stay in their reset state).
    - Meaningless private nets for unused pins, and ports for them, are both forbidden (issue 31, finding 2).
  - `mcu-decoupling.ts` holds the VCAP capacitors and the per-VDD 100 nF capacitors, the ≥ 4.7 µF, VDD33USB's 100 nF + 1 µF, VBAT's 100 nF, and the test pads (`processor-and-memory.md` :31, :136-141).
  - `vdda.ts` holds FB_VDDA, the bank and the damping leg from Task 3's constant, VREF+ tied to VDDA, and VSSA to VSS through 0 Ω (:138).
  - `sdram.ts`, `qspi.ts`, `clock.ts` (Y_HSE and its load capacitors).
  - `reset-boot.ts` holds U_SUP, NRST's 10 kΩ + 100 nF, BOOT0's 4.7 kΩ + 100 nF, and SW_RESET and SW_BOOT (:264-265).
  - `swd.ts`, `usb-dfu.ts`, `power.ts` (L_FILT through the buck and its output, `power.md` :270, :370-382 and `parts.md` :36-45), `id-strap.ts`, `interface.ts` (J_MOD_A and J_MOD_B from the contract).
- Create: `circuits/h7-platform/module-board.ts`, holding `h7Module(): Network`, which `include()`s every block, plus `DESIGNATORS` keyed by prefixed id, `PIN_NUMBERS`, and `drawingPages()`.
- Create: `boards/h7-module/perfboard.json` (`kind: "pcb"`)
- Test: `tests/circuits/h7-module.test.ts`, which is the board's `make check` test

**Interfaces:**
- **Block size:** a block whose page holds more than 40 symbols is split before drawing (spec C3: "a block too large for a Letter page is split; the page is never shrunk").
- **The MCU exception:** U_MCU alone cannot be split, because it is one component. If its page overflows Letter, that page is drawn and sent anyway. Nothing is withheld for layout. The overflow is recorded in `RECORD.md` as an observation, and it is raised with the owner as a question attached to that page.
- **Every part:**
  - cites its source line;
  - takes its MCU pins from `MODULE_PINS` (Task 2);
  - takes its part spec from Task 4.

- [ ] **Step 1: Write the failing tests:**
  - the module validates;
  - `checkInterface(h7Module(), "module", { J_MOD_A: …, J_MOD_B: … })` reports no mismatches (G4);
  - all 176 MCU pins have an entry, and a missing pin entry fails;
  - every required pin is connected to the net its function implies. NC never stands in for a required signal: a required pin marked NC fails. The required pins are:
    - every `Power` pin: VDD → `3V3`; VSS → `GND`; VSSA → `VSSA`, joined to `GND` through the 0 Ω; VDDA → `VDDA`; VCAP → `VCAP`; PDR_ON → `3V3`; VBAT and VDD33_USB as `processor-and-memory.md` :31 and :137 give them;
    - VREF+ → `VDDA`, NRST and BOOT0;
    - every `MODULE_PINS` net, on its assigned pin;
    - every interface pin's `moduleMcuPin`;
  - every other pin is NC and is a GPIO, and the test lists them, so a newly used pin left NC shows up as a changed list;
  - **control:** marking PH5 (FMC_SDNWE) NC fails;
  - every component appears in exactly one block, and has exactly one designator;
  - the 3V3 capacitance sum is ≤ 150 µF;
  - the VDDA block's values equal Task 3's constant;
  - symbols and pin numbers check as in the carrier test.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement the blocks and the board.** Write one block per commit, with the block's tests green before the next.
- [ ] **Step 4: Verify.**
  - Run the tests, typecheck, `make -C boards/h7-module check` and `verify.sh` (17 `PASS`).
  - Close MODULE-POWER-PARTS-TO-MODEL by citing the model and the test.
  - Re-run MODULE-3V3-BUDGET only if the model makes every load sourced. Otherwise amend the row and leave it open.
  - Commit and push.

