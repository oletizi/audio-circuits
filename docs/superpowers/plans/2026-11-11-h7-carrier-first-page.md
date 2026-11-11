# H7 Bring-up Carrier, First Page: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Model the bring-up carrier, without its loopback, as a `Network`, and carry it through `TOOLING.md`'s loop to one drafted page committed under `drafted/h7-platform/h7-carrier/`. That is the first h7 page the owner can review.

**Architecture:** First, the board mechanism learns a second board kind, `pcb`, which has no VeroRoute layout (C1). Second, `make draw` learns to run for a board that has never had a schematic, saying loudly that its pre-draft netlist check did not run (C2). Third, the phase-1 verifier's "no model code" scope rule is retired for the model code phase 2 exists to write, with the record protections kept. Fourth, a checker compares any h7 board's interface connections against `module-interface.json` (G4). The carrier model is then written against all of that, the drafted-page test helpers learn a board that is not Pultec, and the page is drawn with the loop as it stands.

**Tech Stack:** Bun + TypeScript (`bun test`, `bun run typecheck`), GNU make, KiCad 10.0.5 `kicad-cli`, copperhead 0.12.0 and akcli 0.22.0 (pinned in `draughting/tools.lock.json`).

**Spec:** `docs/superpowers/specs/2026-11-10-h7-platform-models-and-schematics-design.md` (approved 2026-11-11 at `3a00182`; status line at `529e839`). This plan covers sequence step 1 only. The module, the pedal, C3 (page composition), C6 (multi-unit packages), the contract freeze and the carrier's loopback each get a later plan.

**Review history:** revised after the plan review in [issue 29](https://github.com/oletizi/audio-circuits/issues/29): Task 3 (verifier transition), Task 6 (drafted-page helpers) and the aggregate 3V3_D load rule in Task 5 are the changes.

## Global Constraints

- Read `CLAUDE.md`, `EVALUATING-DRAWINGS.md`, `TOOLING.md` and `.claude/skills/drawing-a-schematic/SKILL.md` before Task 7. The drawing practice is used as it stands, except for C1 and C2 below.
- **Forbidden words about any drawing:** better, best, good, clean, readable, legible. No agent evaluates a drawing. Every drawing goes to the owner, and only an electrical fault may withhold one.
- **Transcription:** every component, value and connection cites a `docs/h7-platform/` line, a datasheet page, or a controller ruling recorded in `docs/h7-platform/decisions.md`. Nothing comes from memory.
- **Controller rulings** are labelled "Controller ruling (the owner may override)". They never read as owner decisions.
- **No placeholder parts, fallbacks or mock data** outside tests. Missing data throws an error that names it.
- **Imports:** relative paths with the `.ts` extension (project `CLAUDE.md`, "Imports").
- **KiCad symbol and footprint names** are verified against `/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols` and the footprint libraries on disk, never written from memory.
- **Control characters** are never typed as escapes into tool parameters. Build them in code, and count bytes to check.
- **No `#`** inside Bash heredocs or multi-line quoted arguments. Write files with the Write tool and commit with `git commit -F <file>`. Never use `sed` for writes. Prefer a script over a complex one-liner.
- **Commits:** commit and push after each step that leaves the tree coherent. Never add AI attribution to a commit or PR. No git hooks.
- **No memory files.** Never write `~/.claude/projects/*/memory/`. Pass this constraint, and every constraint above, to any sub-agent.
- **Port checks stay green, as amended by Task 3:** `PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh` prints 17 `PASS` lines after every task from Task 3 on that edits `docs/h7-platform/` or `circuits/h7-platform/`. Before Task 3 lands, no task adds a file under `circuits/h7-platform/`.
- **Pre-existing failure:** `make check` already fails at `boards/pt2399-core` ("delay_ic (kind "ic") has no parts-list rule"), identically on `main`. It is not this plan's to fix. Report it, never mask it.

## Review Focus

1. **A perfboard declaration that omits `kind`.** It must refuse, naming the field. Defaulting to perfboard would be exactly the silent default `CLAUDE.md` forbids. Test owned by Task 1.
2. **A `pcb` board that declares `vrt`.** It must refuse: a layout field on a board with no layout is a contradiction, not an extra. Test owned by Task 1.
3. **`make draw` on a perfboard board with no `netlist`.** It must still refuse exactly as it does today. C2 relaxes this for `pcb` only. Test owned by Task 2.
4. **An interface pin swapped between J_MOD_A and J_MOD_B,** for example contract pin 21 wired to J_MOD_A pad 1. It must fail the interface check. That is the mirrored-footprint failure `architecture.md` §4.2 warns about. Test owned by Task 4.
5. **A reserved pin on the carrier that also reaches a second part.** It must fail the interface check, even though a single breakout terminal passes. Test owned by Task 4.
6. **The 3V3_D dummy load fitted while firmware enables USB.** The carrier's aggregate draw must stay within 25 mA in that state too, and a load added to the rail without a stated current must refuse rather than be left out of the sum. Test owned by Task 5.

---

### Task 1: A board kind for boards that are not perfboards (C1)

**Files:**
- Modify: `tools/perfboard/declaration.ts` (the `PerfboardDeclaration` type, `loadDeclaration`)
- Modify: every consumer of `declaration.vrtPath` that `bun run typecheck` names once the type is a union
- Modify: `boards/*/perfboard.json`, all 11 existing declarations, adding `"kind": "perfboard"`
- Modify: `make/board.mk` (the `check` target, lines 378-388)
- Modify: `make/perfboard.mk` (module comment), `TOOLING.md` (a short section on board kinds)
- Test: `tests/perfboard/declaration.test.ts`; a new `tests/perfboard/board-kind-make.test.ts` for the make routing

**Interfaces:**
- Produces: `type BoardKind = "perfboard" | "pcb"`, and `PerfboardDeclaration` as a discriminated union on `kind`. The `perfboard` variant keeps `vrtPath: string`. The `pcb` variant has no `vrtPath`. Both keep `file`, `dir`, `circuitPath`, `exportName`, optional `schPath` and `netlistPath`.
- Produces: a `pcb` board's `make check` runs `netlist-agrees` (unchanged when `sch` is declared; it prints the existing notice when it is not) and then `bun test tests/circuits/<board>.test.ts`. That test file is required for a `pcb` board whether or not `sch` is declared. A `pcb` board never runs `veroroute`, `wiring`, `scaffold-membership` or `tools/cli/perfboard.ts check`.

- [ ] **Step 1: Write the failing declaration tests** in `tests/perfboard/declaration.test.ts`:
  - `"a declaration without kind refuses, naming the field"`: expect `loadDeclaration` to throw `/field "kind"/`.
  - `"kind must be perfboard or pcb"`: `"kind": "smd"` throws `/"perfboard" or "pcb"/`.
  - `"a pcb declaration with vrt refuses"`: throws `/pcb.*vrt/`.
  - `"a pcb declaration needs no vrt"`: loads, with `kind === "pcb"` and `"vrtPath" in decl === false`.
  - `"a perfboard declaration still requires vrt"`: `kind: "perfboard"` without `vrt` throws `/field "vrt"/`.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test tests/perfboard/declaration.test.ts`. Expected: the five new tests fail.
- [ ] **Step 3: Implement `kind` in `loadDeclaration`.** It is required, there is no default, and each refusal says why (`CLAUDE.md`, "Refusals teach"). Add `"kind": "perfboard"` to all 11 `boards/*/perfboard.json`. Narrow every `vrtPath` consumer that typecheck flags on `kind === "perfboard"`, refusing loudly on a `pcb` board wherever only a perfboard makes sense.
- [ ] **Step 4: Write the make-routing test** `tests/perfboard/board-kind-make.test.ts`. It builds a temporary `boards/`-style directory holding a `pcb` declaration and a trivial passing test, runs `make check` there, and asserts:
  - the output contains no `veroroute` or `perfboard check` invocation;
  - the board's test ran.

  A second case removes the board's test file and asserts `make check` fails naming `tests/circuits/<board>.test.ts`.
- [ ] **Step 5: Route `check` on `kind` in `make/board.mk`.** The make side reads the kind through the declaration loader, for example a `bun tools/cli/perfboard.ts kind` verb, never by grepping JSON.
- [ ] **Step 6: Verify.** Run `bun test tests/perfboard/` and `bun run typecheck`: all pass. Then run `make -C boards/transistor-preamp-staged check` and confirm the perfboard path is unchanged.
- [ ] **Step 7: Record C1** in `TOOLING.md` and the `make/perfboard.mk` header comment: what a `pcb` board is, what its `check` runs, and that this is design change C1. Commit and push.

### Task 2: Drawing a board that has never had a schematic (C2)

**Files:**
- Modify: `tools/cli/draw.ts` (the step that requires `declaration.netlistPath` and compares the partition, around lines 258-282)
- Modify: `TOOLING.md` and `.claude/skills/drawing-a-schematic/SKILL.md` (one paragraph each)
- Test: `tests/draught/draw.test.ts`

**Interfaces:**
- Consumes: `PerfboardDeclaration` with `kind` (Task 1).
- Produces: for a `pcb` board with no `netlist` declared, `make draw` skips the intent-versus-netlist partition step. It continues to draft and render, and prints a block that starts with `NO INDEPENDENT NETLIST:`. That block says the pre-draft partition check did not run, that there is no schematic to export one from, and that the binding check is the drafted page's `kicad-cli` export compared with the model (Task 7). A perfboard board with no `netlist` refuses exactly as today.

- [ ] **Step 1: Write the failing tests** in `tests/draught/draw.test.ts`, using its existing harness:
  - `"a pcb board with no netlist drafts and says the partition check did not run"`: the output matches `/^NO INDEPENDENT NETLIST:/m`, and the result is not a refusal.
  - `"a perfboard board with no netlist still refuses"`: the result is a refusal matching the existing `declares no netlist field` text.
  - `"a pcb board that declares a netlist still runs the partition check"`: a deliberately mismatched fixture still refuses.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test tests/draught/draw.test.ts`. Expected: the first new test fails.
- [ ] **Step 3: Implement the branch in `tools/cli/draw.ts`.** Do not write a model-derived netlist to stand in for the missing one (spec, anti-goal "a check that compares the model with itself").
- [ ] **Step 4: Verify.** Run `bun test tests/draught/` and `bun run typecheck`: all pass.
- [ ] **Step 5: Record C2** in `TOOLING.md` and the skill. Commit and push.

### Task 3: Retire the port's "no model code" scope rule for phase 2

The port verifier's `check_nocode` accepts only `.md`, `.json`, `.svg` and `LICENSE-*` files anywhere under `docs/h7-platform/` and `circuits/h7-platform/`. That was phase 1's scope rule: port the records, write no model. Phase 2's G1 exists to write that model, and Tasks 4 and 5 put TypeScript under `circuits/h7-platform/`. The rule did its job and is now superseded for that one tree and that one file type. Everything it protects that still holds is kept.

**Files:**
- Modify: `docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh` (`check_nocode`, `tree_files` callers, the header comment)
- Modify: `docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/README.md` (one paragraph recording the amendment and why)

**Interfaces:**
- Produces: `check_nocode` with these rules, and the check list still at 17 names:
  - **Kept:** under `docs/h7-platform/`, every file is `.md`, `.json`, `.svg` or `LICENSE-*`. A `.ts` there still fails.
  - **Kept:** under `circuits/h7-platform/`, every file that is not `.ts` is `.md`, `.json`, `.svg` or `LICENSE-*`. Any other type fails.
  - **Amended:** a `.ts` file under `circuits/h7-platform/` is allowed. It is phase-2 model code, held by `bun run typecheck` and `bun test`, not by this script.
  - **Kept:** the code-vocabulary scan still covers every non-record `.md` and `.json` file in both trees and `docs/standards/`. It no longer reads `.ts` files, because a source file naming `make -C` in a comment is not ported prose leaking pedals-repo vocabulary, which is what the scan exists to catch.
  - **Unchanged:** `check_bytes` and the five byte-identical records, `check_provenance`, and every other check. The record exemptions in `BYTE_PAIRS` are not widened.
  - **Disclosed:** when `nocode` passes with any `.ts` file present, the PASS line names the amendment, for example `PASS nocode (phase-2 amendment: N .ts files under circuits/h7-platform/ held by typecheck and tests)`.

- [ ] **Step 1: Show the failure first.** Write a scratch script (not under the repo) that creates `circuits/h7-platform/probe.ts`, runs `verify.sh nocode`, records the output and deletes the probe. Expected today: `FAIL nocode` naming `probe.ts`.
- [ ] **Step 2: Amend `check_nocode`** to the rules above, and the script's header comment to say which rule was amended, by which design (phase 2, G1) and why.
- [ ] **Step 3: Negative controls.** Extend the scratch script to run three cases, each creating one probe file, running `verify.sh nocode`, and deleting the probe:
  - `circuits/h7-platform/probe.ts` → `PASS`, with the disclosure text;
  - `circuits/h7-platform/probe.py` → `FAIL`;
  - `docs/h7-platform/probe.ts` → `FAIL`.

  Run it. All three behave as stated. Confirm with `git status` that no probe is left behind. Commit the script under `docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/nocode-amendment-controls.sh` so the controls can be re-run.
- [ ] **Step 4: Verify.** Run the full verifier: 17 `PASS`. Record the amendment in the execution README. Commit and push.

### Task 4: The interface checker (G4, CONTRACT-MODEL-CHECK)

**Files:**
- Create: `circuits/h7-platform/contract.ts`, which loads and types `module-interface.json`
- Create: `circuits/h7-platform/interface-check.ts`
- Test: `tests/circuits/h7-interface-check.test.ts`

**Interfaces:**
- Produces, in `contract.ts`:
  - `loadContract(): InterfaceContract`, where `InterfaceContract` holds `status: "draft" | "frozen"` and `pins: readonly ContractPin[]`;
  - `ContractPin` is `{ pin: number; category: string; signal: string | null; direction: string; failsafeRequired: boolean }`;
  - `socketPadFor(pin: number): { part: "J_MOD_A" | "J_MOD_B"; pad: number }`. Contract pin n maps to J_MOD_A pad n for n ≤ 20, and to J_MOD_B pad n − 20 for n ≥ 21 (`architecture.md` §4.2).

  The loader refuses a file without exactly 40 pins, or with a pin number missing or repeated.
- Produces, in `interface-check.ts`:
  - `checkInterface(network: Network, board: "carrier" | "module" | "pedal", sockets: { J_MOD_A: string; J_MOD_B: string }): InterfaceReport`, where `sockets` gives the component ids;
  - `InterfaceReport` is `{ mismatches: readonly string[]; protectionUnchecked: readonly number[] }`.
- Semantics:
  - **Signal pins.** For every pin whose `signal` is not null, the net on the socket pad must be named exactly `signal`.
  - **Reserved pins (`category === "reservedCompatibility"`) on `module` and `pedal`.** The pad is `nc`.
  - **Reserved pins on `carrier`.** The pad's net is named `RESERVED_<pin>` and holds exactly two members, the socket pad and one breakout terminal (spec, G4 exception).
  - **Failsafe pins.** Every pin with `failsafeRequired === true` is listed in `protectionUnchecked`, because the model has no part-role field yet. The test asserts that list exactly, so the gap is visible and never silent.

- [ ] **Step 1: Write the failing tests**, each against a small hand-built `Network` fixture inside the test file:
  - `"a board whose socket nets equal the contract passes"`: `mismatches` is `[]`.
  - `"a signal net misnamed on one pad is reported"`, with pin 8 named `RELAY` instead of `RELAY_EN`: `mismatches` names pin 8, `J_MOD_A` pad 8, the expected and the found name.
  - `"contract pin 21 on J_MOD_A pad 1 is reported"` (Review Focus 4).
  - `"a reserved pin connected on the pedal is reported"`.
  - `"a carrier reserved pin with one breakout terminal passes"`.
  - `"a carrier reserved pin reaching a second part is reported"` (Review Focus 5).
  - `"protectionUnchecked lists exactly the contract's failsafe pins"`: the expected array is computed from the JSON in the test's own code, not hard-coded from memory, and the test also asserts it is non-empty.
  - `"the loader refuses a 39-pin contract"`.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test tests/circuits/h7-interface-check.test.ts`. Expected: they fail on the missing modules.
- [ ] **Step 3: Implement `contract.ts` and `interface-check.ts`** with the signatures above.
- [ ] **Step 4: Verify.** Run `bun test tests/circuits/h7-interface-check.test.ts` and `bun run typecheck`: all pass.
- [ ] **Step 5: Update `docs/h7-platform/open-items.md` row CONTRACT-MODEL-CHECK.** It stays open until all three boards pass, so cite this test as the check and record that the failsafe-protection half is not yet checked. Run the port verifier (17 PASS, with the Task 3 disclosure). Commit and push.

### Task 5: The carrier model, without loopback

**Files:**
- Create: `circuits/h7-platform/parts.ts`, holding the part specs shared by h7 boards, each with `mpn`, `symbol` and the citation
- Create: `circuits/h7-platform/carrier-board.ts`, which exports `h7Carrier(): Network`, `DESIGNATORS`, `PIN_NUMBERS`, `RAIL_LOADS` and re-exports `drawingIntent`
- Create: `circuits/h7-platform/carrier-board.drawing.ts`, which exports `CARRIER_DRAWING: DrawingInputs` and `drawingIntent(): CopperheadIntent`
- Create: `circuits/h7-platform/rail-budget.ts`, which computes the carrier's worst-case draw per rail and per supported state
- Create: `boards/h7-carrier/Makefile` (the one include line) and `boards/h7-carrier/perfboard.json` (`kind: "pcb"`, `circuit`, `export: "h7Carrier"`, with no `sch`, `netlist` or `vrt`)
- Create: `tests/circuits/h7-carrier.test.ts`
- Modify: `docs/h7-platform/decisions.md` (the carrier rulings) and `docs/h7-platform/open-items.md`

**Interfaces:**
- Consumes: `checkInterface` and `loadContract` (Task 4); the `pcb` kind (Task 1); `intentFromNetwork` (`tools/draught/intent-from-network.ts`).
- Produces: `h7Carrier()`, plus the component ids `j_mod_a` and `j_mod_b` passed to `checkInterface` as `sockets`.
- Produces: `DESIGNATORS: ReadonlyMap<string, string>` (component id → reference) and `PIN_NUMBERS` (the table `intentFromNetwork` lowers with). Task 6 builds the carrier's drafted-page model from these two, not from any Pultec rule.
- Produces, in `rail-budget.ts`:
  - `type CarrierState = { dummy3v3d: boolean; dummyVrefA: boolean; usbEnabled: boolean }`;
  - `RAIL_LOADS`: for each rail (`3V3_D`, `VREF_A`), a table from component id to a function `(state: CarrierState) => number` giving its worst-case current in amps, each entry citing its source;
  - `railDraw(network: Network, rail: "3V3_D" | "VREF_A", state: CarrierState): number`. It refuses a component with a pin on that rail that has no `RAIL_LOADS` entry, naming it. Resistor currents are computed from the resistor's value **read from the network**, at −1 % and the 3.513 V rail maximum (`power.md:378`). They are never copied into the table as constants.

**What the carrier holds.** Authority: `architecture.md` §carrier (line 356) and `parts.md`. Each item marked *ruling* is recorded in `decisions.md` as a controller ruling, with the reason given here.
- **Sockets.** `j_mod_a`, `j_mod_b`: female 1×20 2.54 mm, Mill-Max 801-43-020-10-012000 (`parts.md`, the module socket row), symbol `Connector_Generic:Conn_01x20`. Every pad's net follows Task 4's semantics.
- **Breakout headers (ruling).** Every contract pin goes to a 1×20 2.54 mm male header, `brk_a` and `brk_b`, pad for pad with the sockets, symbol `Connector_Generic:Conn_01x20`. Why headers and not 40 test points: O-13's "40-pin breakout" in two parts instead of forty, which keeps the page near the size the loop has already drawn. A header pin is the reserved pins' one breakout terminal.
- **Test points (ruling).** Probe test points on VIN_MOD, 3V3_D, VREF_A, GND and the four SAI nets (contract pins 32-35), symbol `Connector:TestPoint`, as `architecture.md` lists them.
- **USB path.** Contract pins 36/37 go through U_USBSW TS3USB221RSER with its 10.0 kΩ enable pull-up to 3V3_D, matching the pedal (`parts.md:145`, R-14), with 100 nF decoupling on its supply.
  - **Receptacle (ruling):** USB-C, symbol `Connector:USB_C_Receptacle_USB2.0_16P`, with 2× 5.1 kΩ CC pull-downs. That is the module's USB-DFU arrangement (`processor-and-memory.md:263`).
  - **ESD (ruling):** USBLC6-2SC6, the pedal's choice (`parts.md:146`).
  - **VBUS sense (ruling):** VBUS reaches pin 31 USB_VBUS_SENSE through the pedal's 12.0 kΩ / 20.0 kΩ divider (`parts.md:177`).
  - **Why mirror the pedal:** the carrier's job is to exercise the same interface path the pedal will.
- **Rail loads.** The 25 mA 3V3_D limit (`power.md:395`) and the 10 mA VREF_A limit (`power.md:227`) bound the carrier's **aggregate** draw on each rail, not any one part. `RAIL_LOADS` therefore covers every part with a pin on either rail:
  - **USB enable pull-up:** when `usbEnabled`, firmware holds OE at 0 V, so the current is 3.513 V over the pull-up's value at −1 %, about 0.35 mA (R-14 records 0.35 mA). When not enabled, it is 0.
  - **TS3USB221 supply current:** the maximum I_CC from TI SCDS220M, cited by table and page and read from the datasheet by the implementer. The plan review relays 30 µA; that figure is unconfirmed here, and the datasheet value governs. Count it in every state, because the switch is powered whenever 3V3_D is up.
  - **Decoupling capacitors and test points:** 0 A, with the reason stated in the entry (no DC path).
  - **Dummy loads:** as below.
- **Dummy loads (ruling on values).** Each is fitted by a 2-pin jumper header (`Connector_Generic:Conn_01x02`). Its value is the smallest E96 1 % resistor for which the rail's aggregate draw stays within its limit **in every supported state**, with the dummy fitted. Every combination of the three state flags is supported: no state is ruled out by an interlock or a note, because a bring-up user enabling USB with the dummy fitted is ordinary use.
  - **3V3_D:** chosen by that rule from the I_CC the datasheet gives. If I_CC max is 30 µA, the rule gives **147 Ω**: 24.14 mA, plus 0.355 mA pull-up and 0.03 mA switch, for 24.53 mA. (143 Ω, the previous choice, reaches 25.17 mA with USB enabled, which is what the plan review found.) 1206.
  - **VREF_A:** 357 Ω, 0805, for 9.94 mA against 10 mA, unless another carrier part turns out to sit on VREF_A, in which case the same rule applies.
- **VIN entry (ruling).**
  - **Input:** a 2-pin input connector, symbol `Connector_Generic:Conn_01x02`.
  - **Fuse:** `Device:Fuse`. Its rating is the smallest standard hold current above the module's documented maximum VIN_MOD input current, cited from `power.md` or `vin-mod`. If the documents give no such figure, this step throws instead of choosing one, and the controller rules.
- **Symbols.** Apply the spec's C4 rule. TS3USB221 has no stock symbol. Compare its RSE pinout with `Interface_USB:TS3USB30ERSWR` and `TS3USB30EDGSR` pin by pin from both TI datasheets, and record the comparison with page citations in `parts.ts`. If neither matches pin for pin, do not substitute. Stop and report BLOCKED, naming the mismatch, so the controller can rule on a project symbol under C4.
- **Not on this board:** the loopback and anything from the codec domain (sequence step 5).

- [ ] **Step 1: Write the failing tests** in `tests/circuits/h7-carrier.test.ts`:
  - `"the carrier validates"`: `h7Carrier()` does not throw.
  - `"the carrier's interface matches the contract"`: `checkInterface(h7Carrier(), "carrier", { J_MOD_A: "j_mod_a", J_MOD_B: "j_mod_b" }).mismatches` equals `[]`.
  - `"every component has a unique designator"`: `DESIGNATORS` is 1:1 with the component ids.
  - `"every part names a symbol that exists in the installed KiCad libraries"`: parse each `part.symbol` as `Lib:Name` and assert the `.kicad_sym` file defines `(symbol "Name"`.
  - `"every pin number names the symbol pin it claims"`: for every component, read its symbol from the installed `.kicad_sym` (or the project symbol under C4) and assert that each `PIN_NUMBERS` entry's number exists on the symbol, and, for `ic` parts, that the symbol's pin name at that number is the one the entry claims. This is the independent check on the table Task 6 reuses.
  - `"every supported state keeps each rail within its limit"`: enumerate all eight `CarrierState` combinations, and for each assert `railDraw(h7Carrier(), "3V3_D", s) <= 0.025` and `railDraw(h7Carrier(), "VREF_A", s) <= 0.010`.
  - `"dummy fitted with USB enabled is within the 3V3_D limit"`: the named regression for the plan review's finding, with `{ dummy3v3d: true, dummyVrefA: true, usbEnabled: true }`. Also assert this state draws more than the same state with `usbEnabled: false`, so the pull-up is demonstrably counted.
  - `"a rail load with no stated current refuses"`: add a resistor from 3V3_D to GND to a copy of the carrier network, and assert `railDraw` throws naming it.
  - `"the intent lowers"`: `drawingIntent()` returns one part per component, and no pin is claimed twice under one reference.
- [ ] **Step 2: Run them and confirm they fail.** Run `bun test tests/circuits/h7-carrier.test.ts`. Expected: they fail on the missing module.
- [ ] **Step 3: Write `parts.ts`, `carrier-board.ts`, `carrier-board.drawing.ts`, `rail-budget.ts` and `boards/h7-carrier/`.**
  - `CARRIER_DRAWING` uses one group, `"H7 bring-up carrier"`.
  - `netKinds` lists `GND` as ground, and `VIN_MOD`, `3V3_D`, `VREF_A` and the USB `VBUS` net as power.
  - The module comment of `carrier-board.ts` names its authorities and states what it does not carry: the loopback, the codec, the failsafe-protection check.
- [ ] **Step 4: Verify.** Run `bun test tests/circuits/h7-carrier.test.ts`, `bun run typecheck` and `make -C boards/h7-carrier check`: all pass.
- [ ] **Step 5: Record the rulings** in `decisions.md`, one entry per ruling marked above, in the decisions file's existing entry shape. The dummy-load entry states the aggregate rule, the eight states, the I_CC citation, and that it replaces the plan's earlier 143 Ω after the plan review. In `open-items.md`, update CARRIER-LOOPBACK-FORM to say cut one is drawn without it. Run the port verifier (17 PASS). Commit and push.

### Task 6: The drafted-page test helpers learn a board that is not Pultec

The helpers Task 7 binds the page with were written for the five Pultec boards and assume them:
- `modelForSheet` (`tests/circuits/sheet-model.ts`) has a closed board table and derives designators and pin numbers by Pultec rules. Today `modelForSheet("h7-carrier")` refuses with "no drafted-page model is declared".
- `drafted-kicad-round-trip.test.ts` hard-codes `CIRCUIT = "pultec"`.
- `registerDraftedPageTests` (`tests/circuits/drafted-sheet.ts`) asserts `problems.footprints.length > 0`. That is right for the Pultec pages, whose models declare footprints, and wrong for a model that declares none.

**Files:**
- Modify: `tests/circuits/sheet-model.ts`
- Modify: `tests/circuits/drafted-sheet.ts` (`DraftedPage`, `registerDraftedPageTests`)
- Modify: `tests/circuits/drafted-kicad-round-trip.test.ts`
- Test: `tests/circuits/sheet-model.test.ts` (create it if absent)

**Interfaces:**
- Produces: `modelForSheet` keeps its refusal for an undeclared board and its manifest cross-check. Its board table gains a second entry form, for a board whose module supplies its own mapping: `{ board, module, exportName, build, designators, pinNumbers }`. For the carrier these are `DESIGNATORS` and a per-component pin-number map built from `PIN_NUMBERS` (Task 5). The Pultec entries and the Pultec derivation are unchanged.
- Produces: `DraftedPage` gains `footprintComparisons: "some" | "none"`. With `"some"`, the existing assertion `problems.footprints.length > 0` runs unchanged. With `"none"`, the helper asserts `problems.footprints` is `[]`, and that `footprintlessParts` lists every component in the model, so a part that later acquires a footprint fails the test. The five Pultec boards declare `"some"`. No footprint is invented for the carrier.
- Produces: the round-trip test's `BOARDS` entries each carry `circuit`. The five Pultec entries carry `"pultec"`. The `CIRCUIT` constant is deleted.
- Produces: in the round-trip test, every board additionally asserts that the **fresh** export has `componentIdentity` and `netMembership` both `[]`, in addition to the existing equality with the fixture. Equality with the fixture alone would pass a page and fixture that are wrong together.

- [ ] **Step 1: Write the failing tests** in `tests/circuits/sheet-model.test.ts`:
  - `"the carrier's sheet model uses the carrier's own designators"`: `modelForSheet("h7-carrier").designators` equals `DESIGNATORS`.
  - `"the carrier's sheet model uses the carrier's own pin numbers"`: for each component, its entry in `modelForSheet("h7-carrier").pinNumbers` equals what `PIN_NUMBERS` gives for that component.
  - `"an undeclared board still refuses"`: `modelForSheet("no-such-board")` throws `/no drafted-page model is declared/`.
- [ ] **Step 2: Run them and confirm they fail.** Expected: the two carrier tests fail with the refusal quoted above.
- [ ] **Step 3: Implement** the three changes under Interfaces.
- [ ] **Step 4: Verify the Pultec boards are untouched.** Run `bun test tests/circuits/` and `bun run typecheck`. Every Pultec page test and round-trip test passes exactly as before, now with the added fresh-export zero assertions.
- [ ] **Step 5: Commit and push.**

### Task 7: Draw the carrier page and bind it

**Files:**
- Create: `drafted/h7-platform/h7-carrier/` (the sheet, `.kicad_pro`, `.svg`, `sym-lib-table`, `RECORD.md`, `repair/`), per `TOOLING.md` step 5.5 and `drafted/transistor-preamp/transistor-preamp-staged/` as the worked example
- Create: `tests/fixtures/h7-carrier.net`, `kicad-cli`'s export of the drafted sheet, labelled in `RECORD.md` as an export of the drafted page
- Modify: `boards/h7-carrier/perfboard.json` (add `sch` → the drafted sheet, `netlist` → the fixture)
- Modify: `tests/circuits/h7-carrier.test.ts` (add `registerDraftedPageTests` with `circuit: "h7-platform"` and `footprintComparisons` as Task 6 defines it)
- Modify: `tests/circuits/drafted-kicad-round-trip.test.ts` (add `{ board: "h7-carrier", circuit: "h7-platform", netlist: "tests/fixtures/h7-carrier.net" }`)
- Modify: the spec's G4 exception sentence. "goes to a test point" becomes "goes to one breakout terminal (a test point or a header pin)", noted as a plan-time correction under Task 5's header ruling.

**Interfaces:**
- Consumes: everything above; `modelForSheet("h7-carrier")` (Task 6).

- [ ] **Step 1: Install the toolchain (C5).** Run `bash draughting/install.sh`, then `make draught-doctor`. Expected: exit 0. If the doctor refuses, stop and report its output.
- [ ] **Step 2: Draft.** Run `make -C boards/h7-carrier draw`. Expected: a sheet under `build/draw/h7-carrier/`, and the `NO INDEPENDENT NETLIST:` block from Task 2.
- [ ] **Step 3: Repair and record** by `TOOLING.md`'s loop and the skill, exactly as written there. Measure before and after with the verification set. Commit the page, `RECORD.md` with its sha256 binding row and a list of every controller ruling the page rests on (spec G5, each linking its `decisions.md` entry), and `repair/` with a replay that reaches that sha256.
- [ ] **Step 4: Export and bind.** Export the drafted sheet's netlist with `kicad-cli` to `tests/fixtures/h7-carrier.net`. Declare `sch` and `netlist`. Add `registerDraftedPageTests` with `pinDisagreements`, `valueDisagreements`, `footprintlessParts` and `footprintComparisons` stated exactly, each with a one-line reason. Add the board to the round-trip `BOARDS`.
- [ ] **Step 5: Verify.** Run `bun test tests/circuits/h7-carrier.test.ts tests/circuits/drafted-kicad-round-trip.test.ts` and `make -C boards/h7-carrier check`: all pass. These must include:
  - the carrier's **fresh** `kicad-cli` export showing zero `componentIdentity` and zero `netMembership` disagreement (Task 6), not only equality with the fixture;
  - the moved-pin negative control, for both the fixture and the fresh export, reporting a disagreement.

  If the export disagrees with the model on any connection, that is an electrical fault. Stop, and report the disagreement instead of sending the page.
- [ ] **Step 6: Commit and push.** Report the rendered page path and the `RECORD.md` path to the controller. **Do not describe the drawing.** The controller sends the page to the owner with a question and nothing else (`EVALUATING-DRAWINGS.md` §4). The summary of rulings follows in a separate message, after the owner's verdict.
