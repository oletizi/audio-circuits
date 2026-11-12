Final-review fix round: H7 module pages plan

Implementer's report. The base is 8cd5c47. No .kicad_sch or .kicad_pro byte changed. No drawing is judged here.

Commits, in order:
- eca4bb7 I2
- aa595f4 M2, M10, doc deferred minors
- c6922f7 M1, M3, M7, value-notation and vdda-noise deferred minors
- 62fa10b M11, code deferred minors, and the code-side limitation records
- 5931143 verify-nocode subdirectory refusal
- a2b9a17 M9
- dc2cf8e M6 and the repair-tool deferred minors
- b67b211 M4, M5
- 07f43ea M8
- c184b3d the remaining limitation records, REPLAY.md and the VCAP ruling


ITEMS

Important
- I1: not done. Out of scope by instruction: the controller commits the execution record.
- I2: fixed.
  - The register name "SYSCFG PC2SO" is removed from CR-MODULE-ID-STRAP-PIN. No document in the repository names a switch or a register for PC2_C.
    - ST's pin data names only the pad (`PC2_C`, position 34).
    - The repository's documents name SYSCFG_PMCR.PC3SO for PC3_C alone, from CORE-BRIEF D13.
  - The ruling now says the name was written from memory and is withdrawn.
  - MODULE-INTERNAL-PIN-MAP is "closed, conditional" and names the unchecked condition.
  - The new open row MODULE-ID-STRAP-C-PAD (phase: bring-up) carries the check and says what settles it.
  - firmware-facing-requirements.md §1 and §11 point at that row, and processor-and-memory.md §9 notes the condition.
  - CR-MODULE-ID-STRAP-PIN's text agrees with all of these.

Minor
- M1: fixed. `h7-vdda-noise.test.ts` asserts every figure that is quoted (363.4 / 362.4 / 376.0 µV, 111.7 kHz, 0.0635 / 0.0633 / 0.0657, 0.2626 µH, 7.73 and 8.4 µF effective).
- M2: fixed. These now cite the landed 116.8 µF assertion, or name Task 7e for the root:
  - open-items MODULE-BUCK-LOOP-STARTUP;
  - CR-MODULE-VDDA-BANK's total;
  - CR-MODULE-3V3-SUM's "Settles";
  - CR-MODULE-PWR-FLAGS (two places).
- M3: fixed. The comment in `value-notation.ts` now says 100 mΩ to 1 Ω is admitted in RKM and 0 to 100 mΩ stays refused.
- M4: fixed. The skill's C3 copy gains the root arrangement rule, the justify step, the sheets-on-paper check and the `.kicad_pro` note.
- M5: fixed.
  - Moves:
    - `root_sheets_fit.py` to `draughting/measure/`;
    - `root_pin_justify.py` to `draughting/repair/`.
  - Their root depth is fixed.
  - References are repointed in replay.sh, verify-root.sh, root-control.sh, REPLAY.md, RECORD.md, TOOLING.md and decisions.md.
  - Not done: the two-block fixture's root is still neither justified nor fit-checked. TOOLING already states this ("test data, never sent for review").
- M6: fixed, apart from the kicad-cli path.
  - `erc_match.py` is the one allowance match, and erc_sheets.py and root_erc.py both use it.
  - `flag_rewrite.py` is the one FLGPROBE rewrite.
  - `table-input.ts` carries isRecord, the string check, the override reader and the designator resolver.
  - The hard-coded kicad-cli path is recorded as a limitation, in a comment in cross-page-drivers.ts (macOS-only tooling).
- M7: fixed. The `as const` is replaced by a typed array.
- M8: fixed. The new `tests/circuits/drafted-render-binding.test.ts`:
  - re-renders all 13 sheets with the pinned kicad-cli;
  - compares each against the committed SVG, with the export time masked exactly once;
  - requires the sheets and the renders to pair one to one;
  - carries a control.
  - RECORD.md names it.
- M9: fixed. The pin-number rules move verbatim to `tests/circuits/sheet-pin-numbers.ts` (218 lines), and sheet-model.ts is 323 lines.
- M10: fixed. Five rows now say "above".
- M11: fixed. The USBLC6 refusal names the file and table to add to, and why the names are not defaulted.

Deferred minors marked "fix now"
- T2 verify-nocode.sh subdirectories: fixed. The rule matches the name after the directory and refuses a "/". A seventh control case was added, and all 7 behave as stated. The README says so.
- T2 implicit `any` in h7-interface-check.test.ts: fixed. The value is typed `unknown` and narrowed, and the empty-string refusal now has a test.
- T2 "SYSCFG PC2SO": fixed with I2 (removed).
- T4 rootNet not forwarded: fixed, with a test. CR-MODULE-3V3-SUM states both optional parameters.
- T4 `c_bst` test capacitor: fixed (renamed `c_both_pins`).
- T5 `groups[prefix] ?? ""`: fixed. It throws now.
- T6 beadImpedance check: fixed. It runs before every early return, with a test over a resistor, a capacitor and a part.value part.
- T6 parts.md rating citation: fixed. The rating now cites analog.md:242; parts.md:35 is named for the part only.
- T7c erc_counts.py docstring: fixed. REPLAY.md's row is fixed too.
- T7c FLASH_CLK form: fixed (now in `mcuDriver` form).
- T7d erc-control.sh pin 126 text: fixed (`[VSS, Passive, Line]`).
- T7d isolating controls: fixed. New control 20 isolates three refusals: pin type (power_in), designator (U99) and same pin. Control 17 gains the synthetic `U2 Pin 81` item and the pair reported twice.
- T7d one allowance excusing any number: fixed. erc_sheets.py fails an allowance matched more than once, with control 17's "twice" case.

Deferred minors marked "record", and where each is recorded
- T1 physicalize empty componentIds: recorded as a limitation, in a comment in `lib/board/physicalize.ts`.
- T1 refusal test rebuilds `outer`: record, no action.
- T1 repeated `blocks: []` literals: record, no action.
- T2 duplicate `toBeDefined`: record, no action.
- T2 no observed red run for the two contract tests: recorded here, in the execution record. It cannot be made retroactively.
- T2 the `loadContract` default parameter: recorded as a limitation, in a comment in `pin-map-check.ts`.
- T3 "at both ends" in VDDA-WIDEBAND: fixed in the row text rather than recorded.
- T3 undamped form compared with the damped divider: recorded as a limitation, in a comment in `vdda-noise.ts` (`dampingCandidates`).
- T3 silent trim of tiny coefficients: recorded as a limitation, in a comment beside the line in `vdda-noise.ts`. I checked it: for the ruled bank, every candidate leg and the old bank, at both DCR ends, it drops only exact zeros.
- T3 dates in UTC against local time: record, no action.
- T4 the W9825G6KH table written three times: recorded as a limitation, in a comment in `module-parts.ts`.
- T4 the `/multi-unit/` text match: recorded as a limitation, in a comment in `h7-module-parts.test.ts`.
- T5 the partition check's refs come from `page.intent.parts`: recorded as a limitation, in a comment in `tools/draught/draw-draft.ts` (`verifyPageAgainstModel`).
- T5 the `--intent` path imports the module: recorded as a limitation, in a comment in `tools/draught/draw-intent.ts`.
- T5 two DrawingPage guards: recorded as a limitation, in a comment beside each guard (draw-intent.ts, hierarchical-labels.ts).
- T5 the round-trip test rebuilds ProjectModel: recorded as a limitation, in a comment in `drafted-kicad-round-trip.test.ts`.
- T5 commit 5ee0b9f's message has the carrier sha tail wrong: recorded here, in the execution record. History is not rewritten.
- T6 the sub-ohm "0." prefix: recorded as a limitation, in a comment in `value-notation.ts`.
- T6 process (blocks before the red run; a heredoc with `#`): recorded here, in the execution record.
- T7b env overrides are not refused outside the controls: recorded as a limitation, in a comment in `repair/tools/table-input.ts`.
- T7b the hard-coded kicad-cli path: recorded as a limitation, in a comment in `repair/tools/cross-page-drivers.ts`.
- T7b port-labels trusts `drawingPages`: recorded as a limitation, in a comment in `repair/tools/port-labels.ts`.
- T7c decoupling scripts committed early: record, no action.
- T7d root warnings counted, not bounded: recorded as a limitation in two docstrings:
  - `root_erc.py`, for the module root;
  - `erc_sheets.py`, for the one-block root.
- T7d duplicated helpers: fixed with M6.
- T7e render.sh refuses a sheet name with a space: recorded as a limitation, in a comment in `repair/tools/render.sh`.

Nothing was left undone because it would change page bytes.


CHECKS (run after the last commit, c184b3d)
- sha256: every drafted `.kicad_sch` and `.kicad_pro` (28 files) is identical to the baseline taken before any edit.
  - `git diff 8cd5c47 -- '*.kicad_sch' '*.kicad_pro'` is empty.
  - The carrier is c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8.
- verify.sh: exit 0 on all twelve block pages (power, interface, clock, reset_boot, swd, usb_dfu, id_strap, qspi, vdda, sdram, decoupling, mcu).
- verify-root.sh: exit 0, "verify-root.sh: every check passed".
- replay.sh into a new directory: exit 0.
  - Every sheet is byte-identical, and the root reaches 3590b959….
  - The .kicad_pro reaches 62905f75….
  - "every block sheet is unchanged by the root's assembly".
- `bun run typecheck`: clean.
- `bun test`: 3158 tests across 289 files, 3157 pass and 1 fails.
  - The failure is the pre-existing one: `tests/stripboard/temp-scratch.test.ts` flags `schgen-trial/comparator-controls.test.ts: 1 unnamed site(s)`.
  - The test count went up from 3139 because of the new tests.
- `make -C boards/h7-module check`: exit 0, 28 pass, 0 fail.
- Port verify.sh: 17 PASS.
- nocode-amendment-controls.sh: "all 7 cases behave as stated".
- erc-control.sh, run under nohup because control scripts and the tools they call changed. Last line: "erc-control.sh: every control came out as stated".
  - That covers controls 1 to 20, including the new control 20 and control 17's other-designator and twice cases.
  - It ran in parallel with `bun test` and finished well inside 25 minutes.


CONCERNS
- MODULE-ID-STRAP-C-PAD stays open until someone reads RM0433 for PC2_C. If the read finds that a setting is needed, firmware has a new rule. If it finds the pad cannot be read on ADC3, the strap moves pin (a controller ruling).
- The two-block fixture's root is still not justified or fit-checked by the moved tools. Only h7-module runs them.
- Rendering the 13 sheets adds about 4 s to `bun test`.
