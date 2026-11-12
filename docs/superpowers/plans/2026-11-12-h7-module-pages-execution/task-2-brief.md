### Task 2: ST's pin data and the module pin map (MODULE-INTERNAL-PIN-MAP)

**Files:**
- Create: `circuits/h7-platform/vendor/st-pin-data/STM32H743IITx.xml`, `LICENSE`, `SOURCE`. Copy them byte for byte from `git -C /Users/orion/work/pedals-work/digital-pedal-platform show 5b926d0:h7-platform/vendor/st-pin-data/<file>`. Upstream is STMicroelectronics/STM32_open_pin_data at `7d1f1514ed5583ec5007ad91236b4e1d377295b1`, `mcu/STM32H743IITx.xml`, under BSD-3-Clause.
- Create: `circuits/h7-platform/st-pin-data.ts` (the loader), `circuits/h7-platform/module-pins.ts` (the assignment), `circuits/h7-platform/pin-map-check.ts`
- Modify: `docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify-nocode.sh`, `nocode-amendment-controls.sh` and the execution README. Allow exactly `circuits/h7-platform/vendor/st-pin-data/` (`.xml`, `LICENSE`, `SOURCE`), disclosed on the PASS line. Add two control cases: an `.xml` there passes, and an `.xml` elsewhere under `circuits/h7-platform/` fails.
- Test: `tests/circuits/h7-module-pins.test.ts`

**Interfaces:**
- Produces `loadPinData(): McuPinData`, where `McuPinData` is `{ pins: readonly McuPin[] }` and `McuPin` is `{ name: string; position: number; type: "I/O" | "Power" | "Reset" | "Boot" | "MonoIO"; signals: readonly string[] }`. It parses the XML (176 `<Pin>` elements). It refuses on any other type, or on a count other than 176.
- Produces `MODULE_PINS: readonly PinAssignment[]`, where `PinAssignment` is `{ net: string; pin: string; signal: string; source: string }`. `pin` is the port name (for example `PH5`), and `signal` is ST's signal name (for example `FMC_SDNWE`).
- Produces `checkPinMap(assignments, interfacePins, data): readonly string[]`. It returns problems, with an empty list meaning it passed. `interfacePins` comes from `module-interface.json`'s per-pin `moduleMcuPin`, read through `loadContract()`.
- **Modifies `circuits/h7-platform/contract.ts`** (issue 31, finding 4). Today `ContractPin` has no `moduleMcuPin`, and `parsePin` discards it.
  - Add `moduleMcuPin: string | null` to `ContractPin`, and validate it in `parsePin` with the JSON's own semantics: a string on a signal pin, `null` where the JSON has `null` (9 pins).
  - Any other value refuses, naming the pin, and a key that is absent also refuses. It is never read as "no assignment", because that would quietly empty the interface side of the collision check.
  - The JSON is not edited, and no second parser of it is written.
  - Tests go in the existing contract tests: `"moduleMcuPin is kept, a string or null"`, `"a pin without moduleMcuPin refuses"`, and, in `h7-module-pins.test.ts`, `"the real loaded contract rejects an internal assignment to PC0"`.
  - The carrier's tests must stay green.
- **The assignment, and where each part comes from:**
  - **Starting point:** pedals `CORE-BRIEF.md` §6 (line 309 onward at `5b926d0`).
    - SDRAM bank 1: SDCLK PG8, SDNRAS PF11, SDNCAS PG15, A0–A12, BA0/1, D0–D15, NBL0/1.
    - QUADSPI bank 1: CLK PF10, NCS PB10, IO0–IO3 on PF8, PF9, PF7, PF6.
    - HSE: PH0, PH1.
    - SWD: PA13, PA14.
  - **Moves from split spec §6.2** (`docs/superpowers/specs/2026-10-05-h7-modular-split-design.md:516` at `5b926d0`, D23): SDNWE to PH5, SDNE0 to PH3, SDCKE0 to PH2.
  - **DFU USB:** PA11 and PA12 (`processor-and-memory.md` :102, :128, :267).
  - **Not internal:** SAI1 (CORE-BRIEF :362) belongs to the interface, so it is excluded.
  - **Controller ruling `CR-MODULE-ID-STRAP-PIN`:** the ID strap goes on the first pin, in ascending LQFP position, whose signal list includes an `ADCx_INP` channel and which is free of every internal and interface assignment. Record the chosen pin and the rule, and say that the rule is only a deterministic choice: split spec §6.5 says just "a free module ADC pin", and no document prefers one.
  - Every assignment's `source` names its citation, whether pedals doc and line, `processor-and-memory.md` line, or ruling.
- **Power pins:** every `Type="Power"` pin, plus VREF+ (38, `MonoIO`), NRST (31) and BOOT0 (166), must reach a net in the module model (Task 6 asserts it). The pin data gives:
  - VDD at 15, 23, 36, 49, 62, 72, 82, 91, 103, 127, 136, 149, 159 and 172;
  - VSS at 14, 22, 48, 61, 71, 90, 102, 113, 126, 135, 148 and 158;
  - VBAT 6, VSSA 37, VDDA 39, VCAP 81 and 125, VDD33_USB 114, PDR_ON 171.

  Assert these counts from the data. Do not copy them from this list.

- [ ] **Step 1: Copy the three vendor files and check them byte for byte** against `git show`. Amend the nocode verifier and its controls (see Files). Run `verify.sh`: 17 `PASS`.
- [ ] **Step 2: Write the failing tests:**
  - `"the pin data has 176 pins, and PH5 at 46 lists FMC_SDNWE"`;
  - `"every assignment names a signal ST lists on that pin"`;
  - `"no pin and no net is used twice across the internal map and the 31 interface pins"`;
  - `"the ID strap pin follows CR-MODULE-ID-STRAP-PIN"`, which recomputes the rule from the data and compares;
  - **negative controls:** `checkPinMap` returns a problem naming PC1 for `FMC_SDNWE` on PC1, and a problem naming both nets for an assignment placed on an interface pin.
- [ ] **Step 3: Run them and confirm they fail.**
- [ ] **Step 4: Implement** the loader, `MODULE_PINS` and `checkPinMap`. Parse with a small purpose-built reader of `<Pin>` and `<Signal>` elements, or a dependency already in `package.json`; add none.
- [ ] **Step 5: Verify, then record.**
  - Run the tests, typecheck and `verify.sh` (17 `PASS`).
  - Add the ruling `CR-MODULE-ID-STRAP-PIN` to `decisions.md`.
  - Amend `processor-and-memory.md` §10 to point at `module-pins.ts` as the derived map. Do not restate the table.
  - Close MODULE-INTERNAL-PIN-MAP in `open-items.md` by citing the test. Its criterion is a choice plus a collision check, and both are now made.
  - Commit and push.

