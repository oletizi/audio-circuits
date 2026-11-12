# H7 Pedal Pages: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Model the audio pedal board `h7-pedal` as a `Network` of `include()`d blocks, transcribed from `docs/h7-platform/`, and carry it through `TOOLING.md`'s loop as one page per block in one hierarchical KiCad project. Each page goes to the owner as soon as it is drawn. The contract freeze runs alongside.

**Architecture:** Six parts.
- **Multi-unit packages (spec C6).** A package with more than one unit lowers to KiCad without loss. The pedal has four dual OPA1688s and a 4-unit stock 74LVC3G34. This lands first, because the analog pages cannot be drawn without it.
- **Shared page tooling.** The module's per-board repair and verification tools move to one shared place, so that the pedal's pages do not get a third copy of them.
- **Parts and rulings.** Every pedal part gets a part spec and a symbol chosen under C4 as amended: names, numbers and electrical types must match. The open choices are settled by controller rulings.
- **The model, in three groups:** power, digital and controls, analog. Each group is modelled and then drawn before the next is modelled, so pages reach the owner while the rest is still being built (spec G3, Sequence step 4).
- **The board:** the root, the interface check (G4), the round trip and the PARTS-TO-MODEL rows.
- **The contract freeze**, run alongside the drawing and never ahead of it.

**Tech Stack:** Bun + TypeScript (`bun test`, `bun run typecheck`), GNU make, KiCad 10.0.5 `kicad-cli`, copperhead 0.12.0 and akcli 0.22.0 (pinned in `draughting/tools.lock.json`).

**Spec:** `docs/superpowers/specs/2026-11-10-h7-platform-models-and-schematics-design.md` (approved 2026-11-11). This plan covers Sequence step 4 (the pedal), spec change C6, and the contract-freeze track. The carrier's loopback (step 5) gets a later plan.

**Precedent:** `docs/superpowers/plans/2026-11-12-h7-module-pages.md`, its execution record `…-execution/`, and the module's `drafted/h7-platform/h7-module/RECORD.md`. Every module ruling about how pages are drawn and checked carries over unchanged:
- CR-MODULE-PAGE-RAILS
- CR-MODULE-PWR-FLAGS
- CR-MODULE-CROSS-PAGE-DRIVERS
- CR-MODULE-PORT-LABEL-CHECK
- CR-MODULE-ROOT-PROJECT-FILE
- CR-MODULE-ROOT-FITS-LETTER
- CR-MODULE-BEAD-VALUE
- CR-MODULE-SUBOHM-RKM
- CR-MODULE-INDUCTANCE-NOTATION

The pedal gets its own copies of the per-board tables (flag homes, cross-page drivers, ERC allowances).

**Source inventory:** the reconnaissance that sized this plan cites every fact `file:line`. It is committed as `docs/superpowers/plans/2026-11-12-h7-pedal-pages-inventory.md`. Its block list, its 17 unruled items (§1.4) and its conflicts (§6) are what Tasks 3 and 5 settle. Line numbers in it were read at `7ff9288`.

## Global Constraints

- Read `CLAUDE.md`, `EVALUATING-DRAWINGS.md`, `TOOLING.md` and `.claude/skills/drawing-a-schematic/SKILL.md` before any task that renders. The drawing practice is used as it stands, plus C1–C4 (already landed) and C6 (Task 1).
- **Forbidden words about any drawing:** better, best, good, clean, readable, legible. No agent evaluates a drawing. Only an electrical fault (connectivity disagreeing with the model, or an ERC error) may withhold one. A message carrying a drawing carries a question and nothing else, and the render goes first.
- **No circuit question to the owner without a drawing.** Open choices are settled by controller rulings, labelled "Controller ruling (the owner may override)". They are recorded in `docs/h7-platform/decisions.md` and in the page's `RECORD.md`.
- **Transcription:** every component, value and connection cites a `docs/h7-platform/` line, a data sheet page, or a controller ruling. Nothing comes from memory, and nothing is redesigned.
- **A fetched data sheet** is cited by document number, revision, page and table, with the URL it came from. The fetch is recorded in the task report. A document that cannot be fetched is never stood in for from memory: what depends on it stays open, and the row says so.
- **Chosen and drawn is not electrically shown.** A ruling or a page closes a row that asks for a choice. A row that states a quantity closes only on an analysis meeting its own requirement, with its inputs cited. Otherwise it stays open and is marked conditional.
- **No placeholder parts.** Where the sources leave a part unnamed and no ruling can be made from them, the part is left undrawn and its page says so (spec, anti-goals). An undrawn part never becomes a generic stand-in presented as a choice.
- **Stand-in symbols** (CR-MODULE-SUPERVISOR-SYMBOL, as amended): a stock symbol stands in for another part only when its pin names, numbers AND electrical types all match the fitted part's data sheet. An open-drain output is `open_collector`. Otherwise a C4 project symbol goes in `circuits/h7-platform/h7-platform.kicad_sym`.
- **KiCad symbol names** are verified on disk under `/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`, never written from memory.
- No `any`, no `as` casts, no `@ts-ignore`. Relative imports with `.ts`. Files under 500 lines.
- No placeholder data or fallbacks outside tests. Every refusal names what is missing, where to fix it, and why it is not defaulted.
- Never type control-character escapes into a tool parameter; build them in code.
- No `#` inside Bash heredocs or multi-line quoted arguments. Write files with the Write tool, and commit with `git commit -F <file>`.
- Never use `sed` for writes. Prefer a script over a complex one-liner. Use `nohup` for runs over 10 minutes.
- Commit and push after each coherent step. No AI attribution in commits. No git hooks. No PR or merge, and never ask the owner about either.
- No memory files. Pass every constraint above to every sub-agent.
- **Checks stay green after every task:**
  - the port `verify.sh` prints 17 `PASS`;
  - `bun run typecheck` is clean;
  - `bun test` shows only the pre-existing failure (`tests/stripboard/temp-scratch.test.ts` flagging `tests/schgen-trial/comparator-controls.test.ts`);
  - every approved carrier and module page keeps its sha256 unless a task says otherwise, and `verify-root.sh` still passes on the module.

## Review Focus

1. **One section of a dual landing on the other's pins.** Swapping or duplicating a unit's mapping must fail the round trip (spec C6's negative controls). Test owned by Task 1.
2. **A stand-in symbol whose pin types differ from the fitted part's.** The reset supervisor did this on the module. Every pedal stand-in is checked by name, number and type against its cited data sheet. Test owned by Task 2.
3. **A contract pin bound to the wrong pedal net, or a reserved pin connected on the pedal.** `checkInterface(h7Pedal(), "pedal", …)` must refuse both. Test owned by Task 10.
4. **A part with no source.** Every pedal component's provenance cites a `file:line` or a ruling id, and a test refuses one that does not. The control is owned by Task 5. The test runs again over each group in Tasks 6, 8 and 10.
5. **A cross-page signal whose real driver never meets it.** The pedal's root ERC must clear every cross-page-drivers entry with its real driver. Each net must carry exactly one PWR_FLAG across the pedal hierarchy. Test owned by Task 11.
6. **The moved tools changing a module result.** After Task 4, the module's replay must reach every sha256 it reached before, and `verify-root.sh` must still pass. Test owned by Task 4.

---

### Task 1: Multi-unit packages lower without loss (spec C6)

**Files:**
- Modify:
  - `lib/kicad/symbol-library.ts`: the multi-unit refusal at `supportedUnitSymbols` (:242-272);
  - `lib/kicad/from-network.ts` (`pinNumberFor`, `everyPin`, `pinNumbersFromTable`, `toImportedNetlist`);
  - `tools/draught/intent-from-network.ts` (:109-111);
  - `lib/kicad/sheet-agreement.ts` (`resolvePins`, :263-306);
  - `tests/circuits/sheet-pin-numbers.ts` (:149-151).
- Create: `tests/fixtures/dual-opamp-board/`, a minimal board: one dual op-amp with both sections, each wired as a buffer, plus its supplies.
- Test: `tests/kicad/multi-unit.test.ts`

**Interfaces:**
- Produces: `PartSpec.symbolPins` (`lib/model/types.ts:69-70`, keyed by unit name) is read by every lowering path. A unit's canonical pin resolves through `symbolPins[unit][pin]`, and a package pin through `symbolPins["package"]` (or the key the code already uses; read the type). A multi-unit component without `symbolPins` refuses, naming the component and its units.
- Produces: `symbolPins(libId)` returns each unit's pins for a multi-unit symbol, as `{ unit: number; pins: … }[]`, instead of refusing. `symbolStrokeSegments` stays refusing, because nothing on the drawing path needs it; say so in its refusal.
- The citations in the spec drifted. This task's commit records the measured lines in `TOOLING.md` under C6.

- [ ] **Step 1: Write the failing tests:**
  - `"both sections of a dual lower to distinct pins under one reference"`: A's `in+` → 3, `in-` → 2, `out` → 1; B's `in+` → 5, `in-` → 6, `out` → 7; `v+` → 8, `v-` → 4. Take these numbers from the stock symbol's units, read on disk, not from this line;
  - `"a fresh kicad-cli export of the drafted fixture agrees with the model"`, via `registerDraftedProjectTests` or the single-sheet round trip the carrier uses;
  - **control:** swapping A's and B's mapping fails;
  - **control:** duplicating A's mapping onto B fails;
  - `"a multi-unit component with no symbolPins refuses"`;
  - `"symbolPins reads a 3-unit stock symbol unit by unit"`, on the stand-in Task 2 will check. Use `Amplifier_Operational:OPA2197xD` for the mechanism only. Its fitness as the OPA1688's symbol is Task 2's question.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.** Make the lookup unit-aware through `symbolPins`. Single-unit parts keep the per-kind `PIN_NUMBERS` path unchanged.
- [ ] **Step 4: Verify.**
  - The whole suite and typecheck pass.
  - The carrier and every module page reach their sha256 under replay.
  - Draft the fixture with `make draw` and repair it. Commit it under `tests/fixtures/dual-opamp-board/`, with its replay.
  - Record C6 in `TOOLING.md`.
  - Commit and push.

### Task 2: Pedal part specs and symbols

**Files:**
- Create: `circuits/h7-platform/pedal-parts.ts`, holding one exported `PartSpec` per pedal part type: value or MPN, symbol, `symbolPins` for multi-unit parts, and `DATASHEET_PIN_NAMES` entries with types.
- Modify, if needed: `circuits/h7-platform/h7-platform.kicad_sym`, for project symbols only.
- Test: `tests/circuits/h7-pedal-parts.test.ts`

**Interfaces:**
- Consumes Task 1's `symbolPins`.
- Produces the part constants that Tasks 6, 8 and 9 import. Name them for the part, as `module-parts.ts` does (e.g. `OPA1688`, `PCM3060`, `TPS7A49`).
- **Kinds (controller ruling, recorded in decisions.md as CR-PEDAL-KINDS):** no new kind is added.
  - MOSFETs, relays, regulators, supervisors, logic, isolators, the USB switch, ESD parts, bidirectional TVS diodes, the oscillator and the ideal diode are `ic`, as the module and carrier precedent does.
  - Diodes, Schottkys, Zeners and LEDs are `diode`, with `PIN_NUMBERS.diode = { cathode: "1", anode: "2" }`. Check that on disk for each symbol used.
  - Switching jacks are `switch` (`lib/model/types.ts:72-90`). Pots are `potentiometer`.
  - Which end of `Device:R_Potentiometer` is `ccw` is not in the repository. Rule it in CR-PEDAL-KINDS, citing the symbol's pin graphics, with this cost if wrong: every control's direction reverses.
- Symbols, from the inventory §4.3, each to be re-verified on disk:
  - **OPA1688 (no stock symbol).** Fetch SBOS724A. If a 3-unit stand-in matches names, numbers and types, use it, citing the page. Otherwise make a project symbol.
  - **TPS7A4901DGNR.** `TPS7A4101DGN` is not a pin match, because PWR-08 puts NR/SS on pin 6. So it gets a project symbol from SBVS121E unless a stock match exists.
  - **TPS7A2433DBVR, AOD4185, PMEG4005AEA, BAS116H, PESD12VL1BA and BZT52C12.** Fetch each data sheet. Use a matching stock symbol, or make a project symbol.
  - **SN74LVC3G34DCTR.** Use the 4-unit stock `74xGxx:74LVC3G34` through Task 1, if its types match SCES366L.
  - **Every other part.** Use the stock symbol the inventory names, with its types checked.

- [ ] **Step 1: Write the failing tests:**
  - every pedal `ic` and `diode` part's symbol matches its `DATASHEET_PIN_NAMES` by name, number AND electrical type, read from the installed library or the project library;
  - **control:** the module's old `Power_Supervisor:TPS3839DBZ` is rejected as a stand-in for TLV803EA29DBZR (U_CRST), because of its pin-2 type;
  - every multi-unit part declares `symbolPins` covering every unit;
  - every part's provenance cites a data sheet document, revision and page, or a `docs/h7-platform/` line.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.** Fetch each data sheet. Record each fetch (URL, document, revision) in the report and in the part's provenance. If a data sheet cannot be fetched, that part's symbol stays unchosen: the part is left undrawn, and the page says so. Record CR-PEDAL-KINDS and each stand-in or project-symbol ruling (CR-PEDAL-SYMBOL-<part>).
- [ ] **Step 4: Verify,** then commit and push.

### Task 3: The pedal's open choices, ruled

**Files:**
- Modify: `docs/h7-platform/decisions.md` (new `CR-PEDAL-*` entries), `docs/h7-platform/open-items.md`
- Create: `circuits/h7-platform/pedal-rulings.ts`, holding the ruled values as constants with their ruling ids, so that the model imports them rather than retyping them.
- Test: `tests/circuits/h7-pedal-rulings.test.ts`

**Interfaces:** produces one constant per ruled value, each carrying its ruling id. Every ruling in this task is a controller ruling with a cost if wrong. Each one reads its sources in full, and an owner decision (an `OWN-`, `O-` or `D`-numbered entry) outranks a controller ruling (`R-`). The rulings to make are these, each from the inventory's §1.4 and §6, with the default stated where the sources give one:
- **The DC jack (#1).** A generic `Connector:Barrel_Jack` or `Barrel_Jack_Switch` symbol, with no MPN; DC-JACK-FIT closes in phase 4. Whether the switch contact is used comes from the sources, or it is not used.
- **The FB_IN position (#2, #3).** Ruled from `power.md:28` and the HOT-PLUG-PEAK analysis (`oi:56`). C_SCH and C_PROTHF follow it.
- **The chassis-bond pad (#4).** Not a model part. Rule that and record why: it is pad geometry, which is layout.
- **The U_ISO_M and U_ISO_C decoupling (#5, #6).** From SCES366L and SCES519O, once fetched. Otherwise ruled 100 nF on each VCC by the board's own convention, cited, and marked to recheck.
- **The test pads (#7) and TEST-PAD-SPLIT.** The pedal's pad list, each pad on a named net or dropped with a reason. This settles the conflict entry at `oi:138-143` for the pedal.
- **HW_REV (#8).** The revision-1 divider. It is the module's choice (CR-MODULE-ID-STRAP-VALUES), and the inventory's 6.11 records that any row is as faithful.
- **The control-position node topology (#9).** Stated once, as the model will draw it, from `power.md:417` and `architecture.md:230`.
- **The footswitch connection (#10).** A 2-pad connector per input.
- **The LED MOSFET (#11).** AO3400A, the split's N-MOSFET elsewhere (`parts.md:61`), unless a source names another part.
- **The USB-C receptacle (#12).** The stock generic symbol, with no MPN.
- **The TS3USB221 decoupling and S pin on the pedal (#13).** The carrier's rulings, re-read for the pedal's role.
- **C_VBUS_SENSE (#14) and VBUS-HOTPLUG.** Fitted, with the carrier's value (CR-CARRIER-VBUS-SENSE-CAP), unless the pedal's divider differs. If it differs, re-run `vbusSenseAnalysis` on the pedal's values. This also settles which board owes the fix (the inventory's 6.3).
- **MIDI (#15, #16, #17; the inventory's 6.4).**
  - OWN-04's unpopulated 4-pin header governs: it is an owner decision.
  - R-26's MIDI OUT driver and switch are drawn up to the nets the sources name.
  - If no source names the connector that carries R-26's pin-4/pin-5 loop, that loop's connector is NOT invented. It is left undrawn, the page says so, and a new open row records the gap for the owner to see on that page.
  - The MIDI IN receiver is left undrawn until MIDI-IN-RECEIVER-STOCK closes (spec). Task 12 attempts that.
- **The PCM3060 values (the inventory's 6.6).** Taken from `chk:88-105`. The spec's line saying they are open is corrected by a plan-time note. The 10 µF parts' MPNs are not needed for a schematic (G245).
- **Two C_VBUS ids (6.5).** Adopt the carrier's ids, `c_vbus` and `c_vbus_sense`.

- [ ] **Step 1: Write the failing tests.** Each ruled constant exists, carries its ruling id, and that id exists as a heading in `decisions.md`.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Write the rulings and the constants.** Update the open-items rows they settle, citing the ruling. Leave every quantity row open.
- [ ] **Step 4: Verify,** then commit and push.

### Task 4: Shared page tooling

**Files:**
- Move: the board-independent tools in `drafted/h7-platform/h7-module/repair/tools/` to `draughting/pages/`:
  - verify.sh, erc_sheets.py, one-block-root.ts, flag-check.ts, port-labels.ts, block-netcompare.ts, verify-root.sh, root_erc.py, render.sh and the control scripts;
  - with the board named by an argument or a per-board config file.
- Keep: each board's tables (`pwr-flag-homes.ts`, `cross-page-drivers.ts`, `erc-allowances.ts`) under `drafted/h7-platform/<board>/repair/tools/`.
- Modify: the module's `replay.sh`, `REPLAY.md` and `RECORD.md`; `TOOLING.md`.
- Test: the module's own controls (`erc-control.sh`, `root-control.sh`, `render-control.sh`, `port-label-control.sh`) run through the moved tools.

**Interfaces:** produces `draughting/pages/verify.sh <board-dir> <block> <sheet>` and `draughting/pages/verify-root.sh <board-dir>`, plus the controls, each reading the board's tables from `<board-dir>/repair/tools/`. A missing table refuses and names the file.

- [ ] **Step 1:** Record every module page's and the root's sha256, and the output of every module control, as the baseline.
- [ ] **Step 2: Move and parameterise.** Nothing in a table moves.
- [ ] **Step 3: Verify.**
  - The module's replay reaches every sha256 in the baseline.
  - Every module control comes out as stated.
  - `verify-root.sh` exits 0.
  - **Control:** pointed at a board directory with no `pwr-flag-homes.ts`, the tools refuse and name the file.
  - Commit and push.

### Task 5: The pedal's blocks and board skeleton

**Files:**
- Create: `circuits/h7-platform/pedal/build.ts`, `pedal/nets.ts` and `pedal/interface.ts` (J_MOD_A and J_MOD_B, as `module/interface.ts` builds them, with the pedal's rule: reserved pins NC).
- Create: `circuits/h7-platform/pedal-board.ts`, holding `h7Pedal()`, `BLOCKS`, `DESIGNATORS`, `PIN_NUMBERS`, `PAGE_GROUPS` and `drawingPages()`.
- Create: `boards/h7-pedal/perfboard.json` (`kind: "pcb"`).
- Test: `tests/circuits/h7-pedal.test.ts`, the board's `make check` test.

**Interfaces:**
- **Blocks (controller ruling CR-PEDAL-BLOCKS):** the inventory's §1.1 list, with `controls` split into `controls_a` (positions 1-3) and `controls_b` (positions 4-6). That gives 19 blocks:
  - entry, pf, modsw, prail, ldo_vmid;
  - codec_sup, codec, sai_iso;
  - in_fe, adc_drv, out, jacks_byp;
  - expr_ref, controls_a, controls_b, fsw_led, usb, midi_i2c, interface.
- Every OPA1688 dual stays whole in its block, because one package does one function, A = L and B = R (`chk:149`).
- The single-transistor placements are as the inventory's §1.1 proposes: Q_PFG in jacks_byp, Q_PFR in codec_sup, Q_PEN in prail, Q_VDIS in modsw.
- **Shared nets** take the names in the inventory's §1.2. Contract nets take the contract's names. A net §1.2 marks "name not given" is ruled a name in CR-PEDAL-NETS, which lists each one.
- `h7Pedal()` grows as each group lands, and each group's blocks are added in their task. This task delivers the interface block and the skeleton.

- [ ] **Step 1: Write the failing tests:**
  - the skeleton validates;
  - the interface block puts every contract signal on its net, and every reserved pin NC;
  - every component appears in exactly one block, and has exactly one designator;
  - every component's provenance cites a `file:line` or a ruling id. **Control:** a component with an empty provenance fails.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify,** then commit and push.

### Task 6: Model the power group

Blocks: entry, pf, modsw, prail and ldo_vmid. U_VMID is a whole OPA1688 dual, so this group needs Tasks 1 and 2.

**Files:** create `circuits/h7-platform/pedal/{entry,pf,modsw,prail,ldo-vmid}.ts`. Modify `pedal-board.ts` and `tests/circuits/h7-pedal.test.ts`.

**Sources:**
- `power.md` :25-63, :117-147, :437-474 and :489;
- `parts.md`'s pedal power rows;
- `chk` PWR-xx;
- the inventory's §1.3 B1–B5, which lists each part with its citation;
- U_PRAIL's network, which is the module's power network copied (`power.md`; `module/power.ts` shows the module's transcription, not a source).

- [ ] **Step 1: Write the failing tests,** for each block:
  - its parts and values, each against its cited line;
  - its ports;
  - its multi-unit parts' unit wiring: U_VMID A → VMID_L, B → VMID_R (`chk:131`).
  - For the whole group: VIN_A, VIN_MOD, 5V_A and 3V3_P each reach the blocks §1.2 lists, and no others.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement one block per commit,** each block's tests green before the next.
- [ ] **Step 4: Verify.**
  - Run the tests, typecheck, `make -C boards/h7-pedal check` and the port `verify.sh`.
  - Narrow PEDAL-POWER-PARTS-TO-MODEL to what is still unmodelled or unrated. Ratings are quantities: they close only on a check against R-PF-9, so the row stays open for those.
  - Commit and push.

### Task 7: Draw the power group, and the interface page

**Files:**
- Create: `drafted/h7-platform/h7-pedal/`, holding the sheets, `RECORD.md`, `repair/` and the board's tables (`pwr-flag-homes.ts`, `cross-page-drivers.ts`, `erc-allowances.ts`).

- [ ] **Step 1:** Run `make draught-doctor`, then `make -C boards/h7-pedal draw`. Record each page's advisory and paper overshoot.
- [ ] **Step 2: Repair each page in this order:** interface, entry, pf, modsw, prail, ldo_vmid. For each page:
  - repair it with akcli, committing the op-lists under `repair/<block>/` and extending `replay.sh`;
  - `draughting/pages/verify.sh` exits 0, which means 0 model disagreements, 0 port labels on the wrong net, and 0 ERC errors under the one-block root;
  - render it;
  - add a `RECORD.md` section, with status UNREVIEWED and every ruling the page rests on;
  - commit and push.
- [ ] **Step 3: The controller sends each page to the owner** with a question and nothing else, as it lands. A verdict asking for a change comes before the next page.

### Task 8: Model the digital and controls group

Blocks: codec_sup, codec, sai_iso, expr_ref, controls_a, controls_b, fsw_led, usb and midi_i2c. U_ISO_M is the 4-unit 74LVC3G34, which needs Task 1.

**Files:** one file per block under `circuits/h7-platform/pedal/`; `pedal-board.ts`; the tests.

**Sources:**
- `analog.md` :63, :360, :370-407 and :486;
- `chk` CODEC-xx (:88-110), USB-xx (:205-217) and AIO-xx;
- `architecture.md` :137-178, :230 and :257;
- `bypass-relay.md` where relevant;
- the inventory's §1.3 B6–B8 and B13–B17;
- Task 3's constants.

The MIDI IN receiver, and any MIDI connector no source names, are left out of the model with a refusal-style comment naming the open row. Never model a placeholder.

- [ ] **Step 1: Write the failing tests:**
  - per block: its parts, values and ports;
  - the PCM3060's straps and decoupling against `chk:88-105`;
  - the SAI isolation: U_ISO_M and U_ISO_C directions and resistors against INTERFACE-PARTS-TO-MODEL's figures (`oi:45`);
  - the HW_REV divider against Task 3's constant;
  - the USB path against the carrier's equivalent where the sources make them the same circuit.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement one block per commit.**
- [ ] **Step 4: Verify.** Narrow INTERFACE-PARTS-TO-MODEL. Commit and push.

### Task 9: Draw the digital and controls group

The procedure is Task 7's, for these blocks in this order: usb, midi_i2c, fsw_led, controls_a, controls_b, expr_ref, codec_sup, sai_iso, codec.

The midi_i2c page records, on the page's own `RECORD.md` section, every part left undrawn and the open row that holds it.

The controller sends each page as it lands.

- [ ] **Step 1:** Repair, verify, render, record and commit each page, as Task 7 Step 2 sets out.
- [ ] **Step 2:** The controller sends each page as it lands.

### Task 10: Model the analog group

Blocks: in_fe, adc_drv, out and jacks_byp. Three whole OPA1688 duals (U_IN, U_ADC, U_OUT), the jacks, and the relays.

**Files:** one file per block, `pedal-board.ts`, the tests.

**Sources:**
- `analog.md` :124-200;
- `bypass-relay.md` :90-125 and :185, with the G6K-2 pin map at `bypass:97`;
- `chk` AIO-xx (:149-167);
- the inventory's §1.3 B9–B12.

- [ ] **Step 1: Write the failing tests:**
  - per block: parts, values, ports, and each dual's A = L and B = R;
  - the relay pin map against `bypass:97`;
  - the whole board: `checkInterface(h7Pedal(), "pedal", { J_MOD_A, J_MOD_B })` reports no mismatch, and any connection to a reserved pin fails it (G4);
  - every component cites a source;
  - every block is included once.
- [ ] **Step 2: Run them and confirm they fail.**
- [ ] **Step 3: Implement one block per commit.**
- [ ] **Step 4: Verify.**
  - Narrow PEDAL-ANALOG-PARTS-TO-MODEL and BYPASS-PARTS-TO-MODEL. Their re-derivations and the relay footprint check stay open where they need a data sheet or an analysis.
  - Record the pedal half of CONTRACT-MODEL-CHECK.
  - Commit and push.

### Task 11: Draw the analog group, then the root

- [ ] **Step 1:** Draw the analog pages with Task 7's procedure, in this order: jacks_byp, in_fe, adc_drv, out. The controller sends each page as it lands.
- [ ] **Step 2: Assemble the root** with `assemble-root.ts`, plus a `.kicad_pro`.
  - The root fits US Letter with every sheet on the paper (CR-MODULE-ROOT-FITS-LETTER).
  - The root-held PWR_FLAGs come from the pedal's `pwr-flag-homes.ts`, and there is exactly one per flagged net across the hierarchy.
  - No stand-in drivers: root ERC clears every cross-page-drivers entry with its real driver.
  - Root ERC shows 0 errors, apart from declared allowances. Each allowance has its own ruling, and is excluded in the `.kicad_pro`.
- [ ] **Step 3: Bind and check the project.**
  - Bind it with `registerDraftedProjectTests`: 0 disagreements against `h7Pedal()`, and every component once.
  - Add the round-trip entry.
  - Add `sch` and `netlist` to `perfboard.json`.
  - Write `tests/fixtures/h7-pedal.net` with `make netlist-agrees`.
  - Run `replay.sh` into a new directory: it reaches every sha256.
- [ ] **Step 4:** The controller sends the root with a question.

### Task 12: The contract freeze, alongside

This task runs whenever an implementer slot is free. It never blocks a page, and it changes no page. Order (spec, Sequence):
1. **FB-AN2606.** Fetch AN2606 (Rev 70 or later). Cite Table 135 and its page, showing whether PB5 is a bootloader pin, and record the result beside the contract. If the document cannot be fetched, the row stays open with the attempt recorded.
2. **DATASHEET-REVISIONS-RECHECK.** For DS12110, DS12556, AN2606, RM0433 and USBLC6-2: the latest revision fetched, and each fact the contract cites confirmed or its analysis re-run. The same rule on documents that cannot be fetched applies.
3. **MIDI-IN-RECEIVER-STOCK.** A receiver meeting the 2.0 mA allocation, stock checked at LCSC with the date and code recorded. If it closes, the MIDI IN receiver is modelled and its page is redrawn and re-sent.
4. **STACK-HEIGHT-OWNER-REPORT.** The implementer writes the report as a file: the 15.17 mm stack and the 4.97 mm connector-face limit, with their sources. **The controller sends it to the owner as a message of its own, never with a drawing.** The owner's answer is recorded in `decisions.md` if they decide anything.
5. **CONTRACT-FREEZE**, only when rows 1–4 and every freeze blocker the topic documents carry are closed.
   - The step first enumerates those blockers from the documents into the row. The row does not list them today.
   - The freeze edits `module-interface.json`'s `status`, in a commit of its own. That contradicts `contract.ts:4` ("never edited here"), so a controller ruling amends that comment in the same commit.
   - G4 then re-runs on every board, and every page it changes is redrawn and re-sent.
   - If any blocker stays open, the freeze does not happen in this plan. The row says which blocker holds it.

- [ ] **Step 1:** Rows 1–3, each with its fetch record, rows updated, committed.
- [ ] **Step 2:** Write the row-4 report for the controller.
- [ ] **Step 3:** Row 5, or record what holds it.

### Task 13: Records

- [ ] `RECORD.md` lists every ruling the pedal pages rest on, linked to `decisions.md`, with the measurement set before and after each repair.
- [ ] After the owner's verdicts, the controller sends the rulings summary as a separate message.
- [ ] Commit the inventory to `docs/superpowers/plans/2026-11-12-h7-pedal-pages-inventory.md`, if it is not already committed with this plan. Commit the execution record to `docs/superpowers/plans/2026-11-12-h7-pedal-pages-execution/`.
- [ ] Commit and push.

## Risks the owner should know about

- **Data sheets not in the repository.** Five pedal parts have no matching stock symbol (OPA1688, TPS7A49, TPS7A24, AOD4185, PESD12VL1BA), and their data sheets are not in the repository. If one cannot be fetched, that part stays undrawn and its page says so, rather than being drawn from memory.
- **MIDI.** The documents disagree about MIDI. An owner decision makes it an unpopulated 4-pin header, while the MIDI OUT circuit drives the pins of a jack no document names. The plan draws what the sources name and leaves the rest visibly undrawn. The page that shows the gap is where the owner can rule.
- **The contract freeze may not complete in this plan.** Three of its rows need ST documents or LCSC data from outside the repository, and one needs the owner's answer to a report.
- **Page count and repair cost.** Nineteen block pages and a root, at up to about 28 symbols each. The module's largest repaired pages were of that size.
