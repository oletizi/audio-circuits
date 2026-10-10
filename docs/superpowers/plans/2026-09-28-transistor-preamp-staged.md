# Staged Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second gain stage (Q3) with three panel controls - DRIVE, CHARACTER, TRANSFORMER DRIVE - between the built buffered board's collector-feedback stage (Q1) and its emitter-follower output (Q2), and take it through to a KiCad schematic stub and a first stripboard layout.

**Architecture:** A new circuit, `circuits/transistor-preamp/staged-board.ts`, built from the existing shared pieces (`addFeedbackStage`, `addFollower`) plus Q3 and its controls. Panel pots are modelled as potentiometers on 3-pin header footprints, so simulations can turn them. Tooling gains sub-1k resistor values and one vendored symbol.

**Tech Stack:** TypeScript on Bun (`bun test`), ngspice via `eecircuit-engine`, KiCad 10 (`kicad-cli`), the pinned VeroRoute fork.

**Spec:** `docs/superpowers/specs/2026-09-28-transistor-preamp-staged-design.md` (approved). Its Decisions table binds this plan.

## Decisions (from the spec; binding)

- One change from the built buffered board: Q3 and its three controls. Q1 and Q2 are unchanged, including stage 1's 24 V bass shelf (recorded in the spec, not fixed here).
- The controls arrive with Q3, not as a version of their own.
- Q3 is divider-biased with emitter degeneration; its collector bias is fixed and centred; no trim-pot on Q3.
- DRIVE (25k), CHARACTER (1k, rheostat) and TRANSFORMER DRIVE (25k) are panel pots on 3-pin headers.
- Saturation is the operator's to dial in; nothing in the design limits or softens it beyond the 22 Ω CHARACTER floor.
- No transistor matching: Q3's bias and gain must not depend on β (argued in the spec; the repository has one 2N3904 model, so it is not tested).
- Frequency response is judged by listening; tests check only that Q3 adds little bass loss.
- Capacitor voltage ratings are not a concern for this test board.
- Build 4's loop board stays paused.

## Global Constraints

- Imports are explicit relative paths with the `.ts` extension.
- No fallbacks, no mock data outside tests; every unhandled case throws an error that names the thing, the observed state and the fix.
- Never bypass typing: no `any`, no `as Type` casts, no `@ts-ignore`.
- Files stay under 300–500 lines.
- Semantic ids in circuit source; designators only in `DESIGNATORS`.
- Values are bench starting points; simulation checks are sanity bounds, not predictions.
- `bun test` and `bun run typecheck` pass before every commit. Commit and push after each task, with no AI attribution of any kind in commit messages.
- Never put `#` inside a Bash heredoc or multi-line quoted argument; never use `sed` to write files.

---

### Task 1: Resistor values below 1k

R12 (22 Ω) needs a netlist value; the formatter refuses below 1k.

**Files:** Modify `lib/kicad/value-notation.ts`; test `tests/kicad/value-notation.test.ts`.

- [ ] **Step 1: Update the tests.** In "decades the board does not exercise are refused, not guessed", replace `expect(() => valueFor(resistor(470))).toThrow(/1k.*10M/s)` with `expect(() => valueFor(resistor(0.5))).toThrow(/1R.*10M/s)`, and change the `1e7` line's regex to `/1R.*10M/s`. In the resistor-boundaries test, change its regex the same way. Append:

```ts
test("resistances below 1k are spelled in ohms with an R suffix", () => {
  expect(valueFor(resistor(22))).toBe("22R")
  expect(valueFor(resistor(470))).toBe("470R")
  expect(valueFor(resistor(1))).toBe("1R")
  expect(valueFor(resistor(1000))).toBe("1K")
})
```

- [ ] **Step 2:** Run `bun test tests/kicad/value-notation.test.ts`; expect the new test and the retargeted refusals to fail.
- [ ] **Step 3: Implement.** In `lib/kicad/value-notation.ts`, set `const MIN_OHMS = 1`, make the refusal message read "(1R up to but not including 10M)", and return `ohms < 1000 ? \`${decimal(ohms)}R\` : ohms < 1e6 ? \`${decimal(ohms / 1000)}K\` : \`${decimal(ohms / 1e6)}M\``. Keep the `decimal` helper; `decimal(22)` is `"22"`.
- [ ] **Step 4:** `bun test && bun run typecheck`; all pass.
- [ ] **Step 5:** Commit and push: "Spell resistances below 1k in ohms, for the staged board's 22 ohm floor".

### Task 2: Vendor the panel pot symbol

**Files:** Modify `lib/kicad/symbol-library.ts` (`VENDORED_SYMBOLS`); create `lib/kicad/symbols/Device/R_Potentiometer.sexpr` by running the script; update `lib/kicad/symbols/PROVENANCE.md`.

- [ ] **Step 1:** Add `"Device:R_Potentiometer"` to `VENDORED_SYMBOLS`, after `"Device:R_Potentiometer_Trim"`.
- [ ] **Step 2:** Run `bun test tests/kicad/symbol-library.test.ts`; expect "every vendored symbol loads" to fail (no file yet).
- [ ] **Step 3:** Run `bun tools/kicad/vendor-symbols.ts /Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`. It rewrites all vendored files; `git diff --stat lib/kicad/symbols` must show only the new file added (the others are byte-identical). In `PROVENANCE.md`, change "The other six are verbatim" to "The other seven are verbatim".
- [ ] **Step 4:** Confirm the symbol's pins are numbered 1, 2, 3 with 2 the wiper (the same as `Device:R_Potentiometer_Trim`, so `PIN_NUMBERS.potentiometer` applies unchanged). `bun test && bun run typecheck`.
- [ ] **Step 5:** Commit and push: "Vendor Device:R_Potentiometer for panel pots".

### Task 3: The staged board circuit

**Files:** Modify `circuits/transistor-preamp/parts.ts` (panel pot builder); create `circuits/transistor-preamp/staged-board.ts`; test `tests/circuits/transistor-preamp-staged.test.ts`; fix the part count in the spec.

**Interfaces produced:** `panelPot(id, value, ccw, wiper, cw): Component` in `parts.ts`; from `staged-board.ts`: `transistorPreampStaged(): Network`, `DESIGNATORS`, `PIN_NUMBERS`, `CHARACTER_LEG: Leg`, `type StagedSetting = FeedbackSetting & { drive: number; character: string; transformerDrive: number }`, `START: StagedSetting`, `controlStateFor(setting): ControlState`, `schematicNotes(): readonly string[]`.

- [ ] **Step 1: Write the failing tests** in `tests/circuits/transistor-preamp-staged.test.ts`, covering the spec's Verification list:
  - validates; 34 parts; one designator each; every id and designator of the buffered board's `DESIGNATORS` present and unchanged;
  - DRIVE: `C3` from `COLLECTOR` to `DRIVE_TOP`; the DRIVE pot's cw on `DRIVE_TOP`, ccw on `GND`, wiper on `DRIVE_WIPER`; `C6` from `Q3_BASE` (+) to `DRIVE_WIPER`. TRANSFORMER DRIVE the same shape: `C8` from `Q3_COLLECTOR` (+) to `TRANSFORMER_DRIVE_TOP`, the pot, `C9` from `BUFFER_BASE` (+) to `TRANSFORMER_DRIVE_WIPER`;
  - CHARACTER: `C7` from `Q3_EMITTER` (+) to `CHARACTER_CAP`, R12 from `CHARACTER_CAP` to `CHARACTER_FLOOR`, the CHARACTER pot a rheostat (ccw on `CHARACTER_FLOOR`, wiper and cw on `GND`); R11 is the only resistor from `Q3_EMITTER` to `GND`;
  - lowers to VeroRoute: Q3 `TO92`, each panel pot `SIP3`, C7 `CAP_ELECTRO_400`;
  - at 24 V and `START`: all three transistors have emitter current above 0.1 mA and VCE above 1 V (Q2's collector is `VCC`); Q3's collector is between 40% and 60% of the way from its emitter voltage to 24 V;
  - CHARACTER at total branch resistances 22R, 272R and 1022R: Q3's 1 kHz gain (`Q3_COLLECTOR` over `Q3_BASE`) strictly falls, and the first is at least 10 times the last;
  - DRIVE at positions 0.1, 0.5 and 0.9: the 1 kHz level at `Q3_BASE` strictly rises; TRANSFORMER DRIVE likewise at `BUFFER_BASE`;
  - bass: `(|OUT|/|COLLECTOR|)` at 20 Hz divided by the same at 1 kHz is above 0.944 (under 0.5 dB);
  - non-inverting: the phase of `OUT` at 1 kHz (ideal 1 V source at `input`) is within 45° of 0;
  - the KiCad round trip, via `tests/circuits/kicad-round-trip.ts`.

  Use a 24 V supply, the `input` port as source (amplitude 1, series 0), a 10k load on `output`, and a sweep from 5 Hz to 100 kHz. Intermediate nodes are read with `runAcSweep` on `toSpiceNetlist(resolveNetwork(...))` and `spiceNodeName`, as `tests/circuits/transistor-preamp-buffered.test.ts` reads operating points.
- [ ] **Step 2:** Run it; expect failure (module missing).
- [ ] **Step 3: Panel pot builder.** In `parts.ts`, add a `PANEL_POT: PartSpec` (`footprint: "Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical"`, `symbol: "Device:R_Potentiometer"`) and `panelPot(id, value, ccw, wiper, cw)` returning a linear-taper `potentiometer` component on it, with a comment: the pot itself is off-board on a 3-pin header; modelled as a potentiometer so simulations can turn it; its value is the panel pot's.
- [ ] **Step 4: The circuit.** `staged-board.ts`, with a module comment in the style of `buffered-board.ts` citing the spec. Build: the input header on `IN_EXT` and the `input` port; `addFeedbackStage(builder, "DRIVE_TOP")`; the DRIVE pot (id `drive_pot`, 25k); `C6` (id `drive_coupling_cap`, 22µF, `CP_Radial_D5.0mm_P2.00mm`); Q3's divider R8 100k (`q3_bias_upper`, VCC to `Q3_BASE`) and R9 15k (`q3_bias_lower`); R10 5.6k (`q3_collector_resistor`); R11 1.2k (`q3_emitter_resistor`); `C7` (`character_bypass_cap`, 470µF, `CP_Radial_D10.0mm_P5.00mm`); R12 22 Ω (`character_floor`); the CHARACTER pot (`character_pot`, 1k, rheostat); Q3 (`transistor2N3904("second_gain_transistor", ...)`); `C8` (`q3_output_cap`, 10µF); the TRANSFORMER DRIVE pot (`transformer_drive_pot`, 25k); `C9` (`buffer_input_cap`, 10µF); then `addFollower(builder)`. Every electrolytic's `a` (+) faces the higher DC node, as the tests assert.
  `DESIGNATORS`: `...buffered.DESIGNATORS`, then Q3, R8–R12, C6–C9, RV5 (drive), RV6 (character), RV7 (transformer drive).
  `CHARACTER_LEG: Leg = { floor: { id: "character_floor", value: "22" }, trimId: "character_pot", trim: "1k" }` (used for `legPosition`; the branch is built explicitly because `addLeg` builds trim-pots, not panel pots).
  `START`: the feedback board's `START`, with `drive: 0.5`, `character: "272"`, `transformerDrive: 0.5`. `controlStateFor`: the feedback board's pot positions plus `drive_pot` and `transformer_drive_pot` at their positions and `character_pot` at `legPosition(CHARACTER_LEG, parseValue(character))`.
  `schematicNotes()`: the buffered board's notes, then one line each naming DRIVE (RV5), CHARACTER (RV6) and TRANSFORMER DRIVE (RV7) and what each does, as in the spec's controls table.
- [ ] **Step 5:** Tests pass; confirm they catch a disconnected CHARACTER branch (temporarily wire its pot to a dangling net, see the CHARACTER test fail, restore). `bun test && bun run typecheck`.
- [ ] **Step 6:** In the spec, correct "32 parts in all" to "34 parts in all" (the buffered board's 21, plus Q3, R8–R12, C6–C9 and RV5–RV7).
- [ ] **Step 7:** Commit and push: "Add the staged board: a second gain stage with panel drive and character controls".

### Task 4: Stub, board and first layout

- [ ] **Step 1:** `bun run schematic-stub circuits/transistor-preamp/staged-board.ts transistorPreampStaged circuits/transistor-preamp/staged-board.kicad_sch` (writes the `.kicad_pro` too).
- [ ] **Step 2:** `boards/transistor-preamp-staged/perfboard.json` (sch, circuit `../../circuits/transistor-preamp/staged-board.ts`, export `transistorPreampStaged`, netlist `../../tests/fixtures/transistor-preamp-staged.net`, vrt `transistor-preamp-staged.perfboard.vrt`) and the one-line `Makefile` copied from another board.
- [ ] **Step 3:** Add the fixture-agreement test to the staged test file (`expectSameCircuit(importNetlist(...fixture...), board)`); see it fail; run `make -C boards/transistor-preamp-staged netlist-agrees` to create the fixture; see it pass. Commit and push.
- [ ] **Step 4:** `make -C boards/transistor-preamp-staged import`; commit and push. `make -C boards/transistor-preamp-staged stripboard STRIPS=horizontal`; commit and push.

### Task 5: Records

- [ ] **Step 1:** In `docs/transistor-preamp/README.md`, add a row for the staged board (the gain-structure proposal's next version: Q3 with DRIVE, CHARACTER and TRANSFORMER DRIVE; stub and layout generated, not yet built).
- [ ] **Step 2:** Set the spec's status to Implemented. Commit and push.
