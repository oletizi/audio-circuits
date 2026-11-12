# H7 Module Pages: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Model the processor module `h7-module` as a `Network` built from one `include()`d block per function, derive its MCU pin map from ST's pin data, and carry it through `TOOLING.md`'s loop as one page per block, assembled into one hierarchical KiCad project. Each block page goes to the owner as it is drawn.

**Architecture:** Five parts.
- **Composition record.** `Network` keeps a record of its own composition, written by `include()`. That makes the model the only source of which part is on which page, and of how the pages join.
- **Pin map.** It is derived from ST's pin data, committed beside the board, and checked by a test. The test checks that every function exists on its pin, and that no pin or net is used twice across the internal signals and the 31 interface pins.
- **Rulings with analysis.** The VDDA bank, the damping leg and the module's other open choices are settled by controller rulings. Each ruling that states a quantity is backed by an analysis in code.
- **Multi-page drawing (C3).** `make draw` learns to draft one sheet per block. The repair turns boundary labels into hierarchical labels and builds the root sheet from the `include()` bindings. The round-trip test compares the assembled project's `kicad-cli` export with the board model, and three negative controls cover the ways it could fail.
- **The module itself.** It is modelled and drawn last, block by block.

**Tech Stack:** Bun + TypeScript (`bun test`, `bun run typecheck`), GNU make, KiCad 10.0.5 `kicad-cli`, copperhead 0.12.0 and akcli 0.22.0 (pinned in `draughting/tools.lock.json`).

**Spec:** `docs/superpowers/specs/2026-11-10-h7-platform-models-and-schematics-design.md` (approved 2026-11-11). This plan covers sequence steps 2 (C3) and 3 (the module). C6, the pedal, the contract freeze and the carrier's loopback each get a later plan. Precedent: `docs/superpowers/plans/2026-11-11-h7-carrier-first-page.md` and its execution record.

## Global Constraints

- Read `CLAUDE.md`, `EVALUATING-DRAWINGS.md`, `TOOLING.md` and `.claude/skills/drawing-a-schematic/SKILL.md` before any task that renders. The drawing practice is used as it stands, plus C1, C2, C4 (already landed) and C3 (this plan).
- **Forbidden words about any drawing:** better, best, good, clean, readable, legible. No agent evaluates a drawing. Every drawing goes to the owner, and only an electrical fault (connectivity disagreeing with the model, or an ERC error) may withhold one. A message carrying a drawing carries a question and nothing else, and the render goes out before any summary.
- **No circuit question to the owner without a drawing.** Open choices are settled by controller rulings, labelled "Controller ruling (the owner may override)" and recorded in `docs/h7-platform/decisions.md` and in the page's `RECORD.md`.
- **Transcription:** every component, value and connection cites a `docs/h7-platform/` line, a datasheet page, ST's pin data, or a controller ruling. Nothing comes from memory. No redesign: the module is the module `docs/h7-platform/` describes.
- **Chosen and drawn is not electrically shown** (spec). A ruling or a page closes a row that asks for a choice. A row that states a quantity closes only on an analysis that meets the row's own requirement, with its inputs cited. When an input is missing (Murata's curve, DC-bias curves), the row stays open, marked conditional, and names what must be rechecked.
- **No placeholder parts, fallbacks or mock data** outside tests. Missing data throws an error that names it.
- **Imports:** relative paths with the `.ts` extension. No `any`, no `as` casts, no `@ts-ignore`. Files stay under 500 lines.
- **KiCad symbol and footprint names** are verified against `/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols` on disk, never written from memory. C4 order: the part's own stock symbol; else a stock symbol that matches pin for pin, verified against the datasheet and cited per part; else a project symbol in `circuits/h7-platform/h7-platform.kicad_sym`, only after showing copperhead drafts it.
- **Control characters** are never typed as escapes into tool parameters. Build them in code, and count bytes to check.
- **No `#`** inside Bash heredocs or multi-line quoted arguments. Write files with the Write tool and commit with `git commit -F <file>`. Never use `sed` for writes. Prefer a script over a complex one-liner. Run anything over 10 minutes with `nohup`.
- **Commits:** commit and push after each step that leaves the tree coherent. Never add AI attribution to a commit or PR. No git hooks. Never raise a PR or merge.
- **No memory files.** Never write `~/.claude/projects/*/memory/`. Pass every constraint above to any sub-agent.
- **Checks stay green:**
  - `PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh` prints 17 `PASS` after every task.
  - `bun test tests/circuits/h7-carrier.test.ts tests/circuits/drafted-kicad-round-trip.test.ts` still passes.
  - The carrier page's sha256 is unchanged unless a task says otherwise.
- **Pre-existing failures:** `make check` at `boards/pt2399-core`, and `tests/stripboard/temp-scratch.test.ts` flagging `tests/schgen-trial/comparator-controls.test.ts`. Neither is this plan's to fix. Report them, never mask them.

## Review Focus

1. **A pin given a function ST's data does not list for it.** For example, FMC_SDNWE on PC1. The pin-map check must refuse, naming the pin and the function. Test owned by Task 2.
2. **A pin or a net used twice.** This covers an internal signal placed on one of the 31 interface pins (for example, the ID strap on PC0, which `module-interface.json` already gives to an interface signal), or one net on two pins. The check must refuse. This is the collision check the pedals record says ran and never did. Test owned by Task 2.
3. **A block-private net that copperhead draws as a global label.** Global labels join across sheets by name, so two blocks' private `FB` nets would merge silently. The project round-trip must fail on it. Test owned by Task 5, as one of C3's three negative controls.
4. **A capacitor added to the module's 3V3 without being counted.** The capacitance sum must refuse a part on 3V3 with no entry, and fail when the total exceeds 150 µF (R-50). Test owned by Task 4.
5. **The analysis code drifting from the figure it reimplements.** The VDDA noise function must reproduce `analog.md`'s 2.12 mV rms for the old bank (2 × 2.2 µF + 2 × 100 nF, on R-57's basis) before it is trusted on the new one. Test owned by Task 3.
6. **A component on no page, or on two.** The board-wide designator map and the block record must refuse both. Test owned by Task 1, and again on the module in Task 6.

---

### Task 1: The composition record on `Network`

**Files:**
- Modify: `lib/model/types.ts` (`Network`), `lib/model/include.ts`, `lib/model/builder.ts` (`include`, `done`)
- Modify: every `Network` literal that `bun run typecheck` names once the field is required
- Test: `tests/model/include-blocks.test.ts`

**Interfaces:**
- Produces `Network.blocks: readonly BlockRecord[]`, which is required. A network built with no `include()` has `[]`.
- `BlockRecord` is `{ prefix: string; componentIds: readonly string[]; ports: Readonly<Record<string, string>> }`. `ports` maps the included network's port name to the parent net it was bound to. `componentIds` are the prefixed ids.
- Produces `blockOf(network: Network, componentId: string): string | null`. It returns the prefix of the block holding the component, or null for a part added at top level.
- **Controller ruling: nested includes are recorded as one level.** When an included network itself has blocks, `include()` refuses, with a message saying nested composition is not yet drawn (C3 draws one level) and naming the inner prefixes. A refusal, not a flattening that loses the inner boundary.

- [ ] **Step 1: Write the failing tests:**
  - `"a network with no include has no blocks"`;
  - `"include records its prefix, prefixed component ids and port bindings"`, using two small blocks that share a port net `3V3` and each have a private net `FB`. Assert two records, and that the private nets are `a_FB` and `b_FB`;
  - `"blockOf names the block, and null for a top-level part"`;
  - `"including a network that has blocks refuses, naming the inner prefixes"`.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test tests/model/include-blocks.test.ts`.
- [ ] **Step 3: Implement.** `Builder.include` appends the record, and `done()` keeps it. Fix the `Network` literals that typecheck names, adding `blocks: []` or spreading an existing network.
- [ ] **Step 4: Verify.** Run `bun test` (whole suite, apart from the pre-existing failures) and `bun run typecheck`. Commit and push.

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

### Task 3: The VDDA network, by ruling and analysis (VDDA-WIDEBAND, 3V3D-RIPPLE-INTO-VREF-A, VDDA-DAMPING-LEG)

**Files:**
- Create: `circuits/h7-platform/vdda-noise.ts`
- Test: `tests/circuits/h7-vdda-noise.test.ts`
- Modify: `docs/h7-platform/decisions.md`, `open-items.md`, `analog.md` (one pointer in FIG-VDDA-WIDEBAND)

**Interfaces:**
- Produces `vddaNoise(inputs: VddaInputs): VddaResult`.
  - `VddaInputs` holds:
    - ripple: `deltaIL_A`, `fsw_Hz`, `cout_F` (effective), `esr_ohm`;
    - bead: `beadL_H`, `beadDcr_ohm`;
    - `bank`: a list of `{ nominal_F; esr_ohm }`;
    - `basis`: the derating factor;
    - `damping`: `{ r_ohm; c_F } | null`;
    - `harmonics`: the highest odd harmonic.
  - `VddaResult` holds `f0_Hz`, `q`, `hAt_fsw` (|H| at fsw), `rmsAtPin21_V` and a per-harmonic breakdown.
- **Method** (`analog.md` FIG-VDDA-WIDEBAND, line 298; recon in the execution record):
  - The inductor current is a triangle of ΔIL. Its odd harmonics have amplitude 8ΔIL/(π²n²); the fundamental is 4ΔIL/π² peak. `analog.md` states the fundamental only, so the 1/n² series is this plan's reading of a triangle, recorded as such.
  - Each harmonic passes through the output capacitor's impedance √(Xc² + ESR²).
  - It then passes through the bead-and-bank transfer.
    - Undamped, that is `1/((f/f0)² − 1)` above f0.
    - With a damping leg, it is the full complex divider: the bead's L and DCR in series, into the bank in parallel with the leg's R + 1/(jωC).
  - The harmonic rms values are summed root-sum-square, up to the 15th harmonic.
- **Inputs** (`power.md` :425, :377, :374; `analog.md` :242, :272, :282):
  - ΔIL is 1.66 A, at fsw 450 kHz (the low end of 450–550 kHz, and the worst case for this filter).
  - The output capacitor is 30.6 µF effective with an ESR of 3.33 mΩ.
  - The bead's L is ≥ 0.263 µH. That is a bound from |Z| at 100 MHz, because Murata's curve was not read.
  - The bead's DCR is ≤ 0.045 Ω.
  - Every ceramic is taken on R-57's basis, 0.3825.
  - The limit is 806 µV rms.
- **Controller ruling `CR-MODULE-VDDA-BANK`:**
  - The bank is 2 × 10 µF + 2 × 100 nF X7R, `analog.md` :298's own example.
  - The damping leg is R_DAMP_VDDA in series with 22 µF X7R, across the bank (`open-items.md` :81). R is chosen by this task as the value in the E24 series, between 0.25 and 0.5 Ω, that minimises `rmsAtPin21_V`, subject to Q ≤ 1 and to `hAt_fsw` not exceeding the undamped value.
  - Part numbers are needed for the drawing only as values. MPNs are left for phase 4, and the ruling says so.
  - If no R in the range meets 806 µV, stop and report it to the controller with the numbers. Do not widen the range.
- **What closes:** none of the three rows closes on this alone. Each row's settlement names Murata's curve or the chosen parts' DC-bias curves, and neither is in hand. Each row is amended to cite this analysis as the result on the stated bounds, and stays open, conditional on those two inputs.

- [ ] **Step 1: Write the failing tests:**
  - `"the old bank reproduces analog.md's 2.12 mV rms, undamped"`: 2 × 2.2 µF + 2 × 100 nF on 0.3825, to 0.02 mV;
  - `"the old bank's f0 is 234.1 kHz"`;
  - `"the ruled bank and damping leg meet 806 uV rms at pin 21"`;
  - `"the damping leg keeps Q at or below 1 and does not raise |H| at 450 kHz"`;
  - `"a basis of 1.0 is refused"`: the function requires the basis to be stated and below 1, so a figure on nominal values cannot pass for an R-57 figure.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement `vddaNoise`**, and the ruled values as an exported constant that Task 6's model reads, so that the model and the analysis cannot disagree.
- [ ] **Step 4: Verify, and record.**
  - Record `CR-MODULE-VDDA-BANK` in `decisions.md`, with the computed figures as the test asserts them.
  - Amend the three rows in `open-items.md`.
  - Add one pointer in `analog.md` FIG-VDDA-WIDEBAND to the code and the ruling.
  - Commit and push.

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
  - `moduleCapacitance3v3(network: Network): { total_F: number; entries: readonly { id: string; nominal_F: number }[] }`. It counts every capacitor with a pin on the module 3V3 net, at nominal. It refuses a capacitor on 3V3 that has no value, and refuses any component on 3V3 that is neither a capacitor nor listed as a known non-capacitive load.
  - The test asserts the total is ≤ 150 µF (R-50).
  - MODULE-BUCK-LOOP-STARTUP stays open: its loop and start-up check needs TI's application report or a simulation. The row is amended to cite this sum as the half that is settled.

- [ ] **Step 1: Write the failing tests:**
  - symbol existence for every module part, and C4 pin-for-pin matches for the SDRAM and the supervisor;
  - `"the capacitance sum refuses an uncounted part on 3V3"`;
  - `"the capacitance sum fails above 150 uF"`, a control that adds 100 µF.
  (The module network those last two tests read comes in Task 6. Here they use a small fixture network, and Task 6 adds the real assertion.)
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement**, record each ruling, and amend the rows: USB-DFU-VERTICAL in part, VREF-A-BLEEDER-DECISION closed, MODULE-POWER-PARTS-TO-MODEL left to Task 6.
- [ ] **Step 4: Verify.** Run the tests, typecheck and `verify.sh`. Commit and push.

### Task 5: Multi-page drawing (C3), proven on a two-block test board

C3 is built and checked on a small synthetic board before the module uses it. A failure in the plumbing then surfaces on two small pages, not on ten large ones. The test board is never shown to the owner, so nothing about it is a drawing for review.

**Files:**
- Modify: `tools/cli/draw.ts`, `tools/draught/draw-draft.ts`, `tools/draught/draw-intent.ts`, `tools/draught/intent-from-network.ts`
- Modify: `tools/perfboard/declaration.ts`: a `pcb` declaration's `sch` may name a hierarchical root sheet. How the declaration says so is the builder's choice, stated in `TOOLING.md`. Whether a board is multi-page is read from its circuit module (it exports `drawingPages()`), never guessed from the file.
- Create: `tools/draught/assemble-root.ts`, which writes an akcli op-list for the root sheet from `Network.blocks`
- Create: `tools/draught/hierarchical-labels.ts`, which writes an akcli op-list that, on one block sheet, deletes copperhead's labels on the block's port nets, adds a `hierarchical` label per port, and turns any global label on a private net into a local one
- Create: `tests/fixtures/two-block-board/` (a circuit module with two blocks sharing `3V3` and `GND` ports, each with a private `FB` net)
- Modify: `tests/circuits/drafted-sheet.ts` with `registerDraftedProjectTests`; `tests/circuits/drafted-kicad-round-trip.test.ts`
- Modify: `TOOLING.md`, `.claude/skills/drawing-a-schematic/SKILL.md`: a C3 section in each. TOOLING is the original; the skill copies it.
- Test: `tests/draught/draw-pages.test.ts`, `tests/circuits/two-block-project.test.ts`

**Interfaces:**
- A circuit module with blocks exports `drawingPages(): readonly { block: string; intent: DrawIntent }[]`, one entry per `Network.blocks` record. Each intent comes from `intentFromNetwork` over that block's components only, with the board-wide `DESIGNATORS`, and its port nets marked so that the draft names them.
- For such a board, `make draw` drafts each page into `build/draw/<board>/<block>/<block>.kicad_sch` and re-papers, renders and measures each one. The pre-draft partition check runs per block, against that block's components and nets taken from the model. With no independent netlist, it prints the C2 `NO INDEPENDENT NETLIST:` block, once per board.
- The committed form is `drafted/<circuit>/<board>/`:
  - `<board>.kicad_sch` (the root);
  - `<block>.kicad_sch` per block;
  - one `RECORD.md`, with a row per sheet sha256 and a root sha256;
  - `repair/`, with one subdirectory per block plus `root/`, and one `replay.sh` that reaches every sha256.
- `registerDraftedProjectTests({ board, circuit, netlist, ... })` exports the root with `kicad-cli` and runs `compareSheetToModel` on the whole board model. It asserts that every model component appears exactly once across the sheets, under its `DESIGNATORS` reference, and checks every sheet's sha256 against `RECORD.md`.
- **The three negative controls** (spec C3), each a test that edits a copy of the assembled two-block project and requires the round trip to fail:
  1. **Missing boundary connection:** delete one sheet pin's wire at the root.
  2. **Wrong boundary connection:** swap two sheet pins' wires at the root.
  3. **Private nets sharing a name:** in both block sheets, make the `FB` labels global.

- [ ] **Step 1: The composition-driven pieces, test first.**
  - `drawingPages` for the two-block fixture: two pages, every component on exactly one, ports marked.
  - `assemble-root` produces one `add_sheet` per block, with one sheet pin per port, wired to the parent net.
  - `hierarchical-labels` produces, for each port net, deletes of copperhead's labels and one `hierarchical` label.
  - Run them and confirm they fail; implement; confirm they pass.
- [ ] **Step 2: `make draw` per page.**
  - Write the failing test in `tests/draught/draw-pages.test.ts`: two sheets under `build/draw/two-block-board/`, each re-papered to `USLetter`, each with a render, and one `NO INDEPENDENT NETLIST:` block.
  - Implement, and confirm a one-page board's behaviour is byte-for-byte unchanged: the h7-carrier draft sha256 is still `f5c427e8c6558c2e744762890dc8dd2a24bd39ff52784d29af9e4ad89c27419f` (its `REPLAY.md`).
- [ ] **Step 3: Draft, repair and assemble the two-block project** by the loop, with the repair committed under `tests/fixtures/two-block-board/drafted/`. This is a fixture, so it is never sent. Run `kicad-cli sch erc` on the root (0 errors), and export the root.
- [ ] **Step 4: The project round trip and its three negative controls.** Write the tests, see them fail before the fixture exists, then pass, with each control failing the round trip.
- [ ] **Step 5: Verify.**
  - Run `bun test tests/draught/ tests/circuits/` and typecheck.
  - Run the carrier's replay into a new empty directory: it still reaches `c9355a88…`.
  - Record C3 in `TOOLING.md` and the skill, saying what is new and what a block page still shares with a one-page board.
  - Commit and push.

### Task 6: The module model

**Files:**
- Create: `circuits/h7-platform/module/` with one file per block. Each exports a function returning that block's `Network` with declared ports:
  - `mcu.ts` holds U_MCU only, with every one of its pins on a port or a private net. It is atomic, so every other block reaches the MCU through ports.
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
  - every MCU pin is on a net, and every `Power` pin's net is the one its name implies (VDD → `3V3`, VSS and VSSA → `GND` via the 0 Ω for VSSA, VDDA → `VDDA`, VREF+ → `VDDA`, VCAP → `VCAP`, PDR_ON → `3V3`);
  - every `MODULE_PINS` net is on its assigned pin;
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

### Task 7: Draw the module, page by page, and send each page

**Files:**
- Create: `drafted/h7-platform/h7-module/` (the root, one sheet per block, `RECORD.md`, `repair/`)
- Modify: `boards/h7-module/perfboard.json` (`sch`, `netlist`) once the project exists; `tests/circuits/h7-module.test.ts` (`registerDraftedProjectTests`); `tests/circuits/drafted-kicad-round-trip.test.ts`; `tests/fixtures/h7-module.net`, which is `kicad-cli`'s export of the root, written by `make netlist-agrees`

- [ ] **Step 1: Toolchain.** Run `make draught-doctor`: every pinned tool matches.
- [ ] **Step 2: Draft every page.** Run `make -C boards/h7-module draw`. Record the advisory, the per-page `NO INDEPENDENT NETLIST:` notice, and each page's paper overshoot.
- [ ] **Step 3: Repair one block page at a time, in this order:**
  - power;
  - interface;
  - the small blocks (clock, reset-boot, swd, usb-dfu, id-strap, qspi);
  - vdda;
  - sdram;
  - mcu-decoupling;
  - mcu.

  For each page:
  - repair with akcli (place, wire, hierarchical labels, text), with the op-lists committed under `repair/<block>/`;
  - check it against the block's model (0 disagreements) and with ERC (0 errors);
  - render;
  - **send the render to the owner with a question and nothing else**, then go on to the next block. Do not wait for a verdict. A verdict asking for a change takes precedence over the next block (spec, Sequence).
- [ ] **Step 4: Assemble the root** from `assemble-root.ts`. Then:
  - export the root and bind it with `registerDraftedProjectTests`: 0 disagreements and every component once;
  - write the fixture with `make netlist-agrees`;
  - run `replay.sh` into a new empty directory, and require it to reach every sha256;
  - send the root render to the owner with a question.
- [ ] **Step 5: Records.**
  - `RECORD.md` lists every controller ruling the pages rest on, linked to `decisions.md`, plus the C3 notes and the measurement set before and after each repair.
  - After the owner's verdicts, or when they ask, send the rulings summary as a separate message.
  - Commit the execution record to `docs/superpowers/plans/2026-11-12-h7-module-pages-execution/` (CLAUDE.md, "commit the execution record").
  - Commit and push.

## Risks the owner should know about

- **The MCU page.** The stock STM32H743IITx symbol is one 176-pin unit. It may not fit a Letter page with its nets, even alone. The plan draws it and sends it anyway. If it does not fit, that is a question for the owner, attached to the page.
- **Repair cost.** Pages above 44 symbols have never been repaired here. Splitting blocks at 40 symbols is the protection, and the order in Task 7 puts the small pages in front of the owner first.
- **The VDDA figures are bounds, not a demonstration.** Without Murata's impedance curve and the capacitors' DC-bias curves, the VDDA rows stay open even when the analysis passes.
- **copperhead's global labels.** A global label on a private net would join two blocks silently. The hierarchical-label repair and negative control 3 are the protection. A page repaired by hand outside that script would not be covered.
