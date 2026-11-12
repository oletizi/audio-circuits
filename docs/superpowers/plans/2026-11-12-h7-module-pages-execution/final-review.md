Final whole-branch review: H7 module pages plan (40e4768..8cd5c47, 70 commits)

Reviewer: final whole-branch reviewer. Read-only on the checkout; nothing tracked was changed and nothing committed.
Method: superpowers code-reviewer template, with the project rules (CLAUDE.md, CONSTITUTION.md, EVALUATING-DRAWINGS.md, the plan's constraints.md) taking precedence.
The diff was reviewed in passes by area, from `git diff --stat` and the source files. The 7.9 MB package was not read whole.

No drawing is judged here. Every page and the root are owner-approved, and nothing below is about layout.


VERDICT

Approved with fixes: 0 Critical, 2 Important, 11 Minor.

Neither Important finding is in the circuit, the model or a drawing. One is the plan's closing step: the execution record is not committed yet. The other is a closed row whose ruling carries an open condition that no row or requirement tracks. Both are documentation fixes. No page bytes change.


CHECKS RUN (at 8cd5c47; the tree was clean before and after)

- `bun run typecheck`: clean.
- `bun test`, the whole suite: 3139 tests across 288 files, 3138 pass and 1 fails.
  - The failure is the pre-existing one named in constraints.md: `tests/stripboard/temp-scratch.test.ts` flags `tests/schgen-trial/comparator-controls.test.ts` ("1 unnamed site(s)").
  - Nothing else fails.
  - `make check` at `boards/pt2399-core`, the other pre-existing failure, was not run (not asked).
- `make -C boards/h7-module check`: 28 pass, 0 fail.
- `sh drafted/h7-platform/h7-module/repair/tools/verify-root.sh`: exit 0, "every check passed".
  - The root export against the whole model is 0/0/0/0 (94 components, 174 nets).
  - 5 PWR_FLAGs, one per flagged net, each at its declared home; no `#` reference used twice.
  - 25 of 25 cross-page drivers are on their nets with their real drivers.
  - Root ERC: 0 errors, and 1 excluded violation (CR-MODULE-VCAP-ERC). Warnings: `lib_symbol_mismatch` 3 on `/`, `ground_pin_not_ground` 1 on `/mcu/`, both as RECORD.md:253 states.
  - paper_fit reports "fits: yes", and every sheet box is on the paper.
- The port verify.sh (`PEDALS_REPO=... bash .../verify.sh`): 17 PASS.
- `replay.sh` into a new scratch directory: exit 0.
  - Every draft, intent and generated op-list matched its committed copy.
  - All twelve block sheets, the root and `h7-module.kicad_pro` are byte-identical to the committed files.
  - No block sheet changed during the root's assembly.
- Also run, not asked:
  - The two-block fixture's `replay.sh` into a scratch directory: exit 0, all three sheets byte-identical.
  - A script cross-checking every sha256 in `replay.sh`, `REPLAY.md`, `RECORD.md` and `docs/schematic/verdicts.md` against the files on disk: all consistent.
  - The carrier sheet's sha256 is still `c9355a88...`.
  - Each committed `.svg` was last changed in the same commit as its `.kicad_sch`.
- Not run, as instructed: `erc-control.sh`.


STRENGTHS

- **The transcriptions hold where I spot-checked them against their sources:**
  - every MODULE_PINS row against pedals `CORE-BRIEF.md` §6 and split spec §6.2 at 5b926d0;
  - power.ts against power.md:256, :270 and :374-382;
  - the decoupling block against processor-and-memory.md:134-141;
  - reset-boot.ts against :264-265;
  - the HSE caps against :117;
  - the ID strap against analog.md §11's row 1;
  - the SDRAM against CORE-19 and CORE-20. `h7-module-blocks.test.ts:176` re-states CORE-19's pin numbers independently rather than reading them from the model.
- **The 22 CR-MODULE rulings are consistent:**
  - Each carries the "Controller ruling (the owner may override)" label and a Set-by line.
  - No reference anywhere names an undefined CR-MODULE id.
  - No ruling contradicts another ruling, the spec or an owner decision (D6, D7, D9, D14 to D18, D23, D24, O-11 and O-12 were checked).
  - Where a later ruling settles what an earlier one left open (USB-C-PINS after USB-ESD on the shell), or replaces a stand-in (the SUPERVISOR-SYMBOL amendment), the later entry says so.
- **The deviations from the plan are recorded and argued, not hidden:**
  - Q ≤ 1 is not reached in CR-MODULE-VDDA-BANK, with the physics stated. I recomputed every figure the ruling quotes, and all are correct today.
  - ID strap revision 1, not code 0, because the scheme has no code 0.
  - MODULE-POWER-PARTS-TO-MODEL is left open because the ratings were not checked. That is the right call under constraints.md's quantity rule.
- **C3 meets the spec's three criteria, with real controls:**
  - The two-block negative controls each edit a copy and require a specific merged or missing membership. They do not just require "non-empty".
  - Control 3 uses the same text, `FB`, per issue 31 finding 5.
  - The project round trip reads references from the sheet text, so a part drawn twice cannot collapse in the export.
  - `recordedSheets` has its own parse control.
- **Refusals name what is missing almost everywhere:** the 3V3 walk, `mcuPinPlan`, `drawingPagesFromNetwork`, the allowance and driver tables, and the vdda-noise input checks.
- **The root ERC is the safety net the per-block allowances needed, and it is stricter than them:**
  - `root_erc.py` requires each allowance to match exactly one excluded violation.
  - It requires the `.kicad_pro` exclusion count to equal the allowance count.
  - It fails when the hierarchy was not read.
  - It caught a real fault: the NRST open-drain stand-in mismatch.


ISSUES

Critical: none.

Important

I1. The plan's execution record is not committed.
- Where: `docs/superpowers/plans/2026-11-12-h7-module-pages-execution/` does not exist. Plan :350 (Task 7 step 5) requires it, and so does CLAUDE.md ("a plan's record is committed beside the plan").
- What: the record lives only in `.superpowers/sdd/2026-11-12-h7-module-pages/`, which is gitignored. That covers progress.md, about 30 task reports and reviews, the deferred-minors list, and this review.
- Failure scenario:
  - The workspace is cleaned when the plan closes, as the execution skill's default does, and the audit trail behind the 22 rulings and 9 per-task reviews is destroyed.
  - `decisions.md:1662` (CR-MODULE-ROOT-PROJECT-FILE) already quotes the controller's words from "the plan's progress log, which is gitignored". The citation then resolves to nothing.
- Fix: commit the record with a README saying it is not findings, as `docs/superpowers/plans/2026-11-11-h7-carrier-first-page-execution/` does. That precedent includes its final review, so this is the expected closing step. It is listed so that it is not skipped.

I2. MODULE-INTERNAL-PIN-MAP is closed while the ruling it rests on is conditional, and the condition is tracked nowhere open.
- Where:
  - `docs/h7-platform/open-items.md:103`: "closed — derived and checked".
  - `docs/h7-platform/decisions.md:1425` (CR-MODULE-ID-STRAP-PIN): "Open condition, to be rechecked before firmware bring-up ... this ruling is conditional on that check".
- What: the strap sits on PC2_C, a "_C" analog-switch pad. Whether the switch state matters for reading ADC3_INP0 was not checked against RM0433 or DS12110. Nothing carries that condition except the ruling body:
  - no open row;
  - no line in firmware-facing-requirements.md;
  - grep finds PC2_C only at decisions.md:1423-1425.
  The register name "SYSCFG PC2SO" is itself from memory (deferred minor, Task 2).
- Failure scenario: a reader of open-items sees the pin map closed, and bring-up firmware reads the strap without the check the ruling demands. This is the same class of "_C pad needs a firmware rule" that split spec §6.2 deliberately retired when it moved SDCKE0 off PC3_C ("retires CB D13 and the 'never set PC3SO' firmware rule").
- Fix, either of:
  - mark the row "closed, conditional", naming the PC2_C check; or
  - carry the check into firmware-facing-requirements.md, or into an open row.
  In the same edit, verify the register name against RM0433 or drop it.

Minor

M1. The VDDA figures quoted in prose are not asserted by any test.
- Where: `decisions.md:1438-1444`, and open-items.md's VDDA-WIDEBAND, 3V3D-RIPPLE-INTO-VREF-A and VDDA-DAMPING-LEG rows. The figures are 363.4 and 362.4 µV, 376.0 µV, 111.7 kHz, and 0.0635, 0.0633 and 0.0657.
- What: `tests/circuits/h7-vdda-noise.test.ts` asserts only ≤ 806 µV, Q 2.246 and 1.261, and the old bank's 2.12 mV, 234.1 kHz and 0.371. Plan Task 3 step 4 asked for the ruling to carry "the computed figures as the test asserts them". I recomputed them (scratch script), and they are correct today.
- Failure scenario: a change to the inputs or the method moves them, every test stays green, and the ruling quotes stale figures. CLAUDE.md: "a figure in prose is a transcription with a date on it".
- Fix: assert them in the test.

M2. Lines left stale by later tasks.
- `open-items.md:61` (MODULE-BUCK-LOOP-STARTUP) says the ≤ 150 µF assertion "lands with the module model". It has landed: 116.8 µF, `tests/circuits/h7-module.test.ts:113`. The row should cite it.
- `decisions.md:1446` says "the module's total is summed by the module plan's later tasks".
- `decisions.md:1593` and `:1600` say "Task 7b draws it" and "The root Task 7b assembles". The root was Task 7e.
- Failure scenario: a reader looks for the sum or the root in the wrong place, or concludes the 150 µF half is still pending.

M3. A comment contradicts the code beside it.
- Where: `lib/kicad/value-notation.ts:76-82` ends "so the band between 0 and 1R stays refused".
- What: lines 84-93 now admit 100 mΩ to 1 Ω in RKM (CR-MODULE-SUBOHM-RKM).
- Failure scenario: the next reader believes sub-ohm values refuse, and works around a refusal that is not there. Supersede means delete.

M4. The skill's C3 copy is stale against TOOLING.md.
- Where: `.claude/skills/drawing-a-schematic/SKILL.md:96-126`, against `TOOLING.md:1063-1084`.
- What: TOOLING gained the following in Task 7e and the skill did not:
  - the root arrangement rule;
  - the `root_pin_justify.py` repair step;
  - the `root_sheets_fit.py` check;
  - the board-level `.kicad_pro` note.
  The skill says it is a copy and points at TOOLING for the full text.
- Failure scenario: an agent working from the skill assembles the next root without the justify step or the sheets-on-paper check.

M5. Generic C3 root tooling lives in one board's repair directory.
- Where: `TOOLING.md:1078` and `:1081` name `drafted/h7-platform/h7-module/repair/tools/root_pin_justify.py` and `root_sheets_fit.py` as, respectively, the repair step every akcli root needs and THE check that sheet symbols are on the paper.
- What: neither is board-specific, and neither is run for any other board. The two-block fixture's root is neither justified nor fit-checked.
- Failure scenario: the pedal plan either copies both scripts (one more copy to drift) or reaches into h7-module's repair directory.
- Fix: before the pedal plan, move both under `tools/draught/` or `draughting/measure/`.

M6. Duplicated logic across the repair tools, beyond Task 7d's M6.
- `erc_sheets.py:37-75` and `root_erc.py:31-55` each carry the item regex, the (designator, pin) parse and the allowance match. They differ in count semantics: a block page excuses any number of matches, while the root requires exactly one.
- `flag_probe.py` and `hierarchy_flag_probe.py` each implement the FLGPROBE rewrite.
- `erc-allowances.ts` and `cross-page-drivers.ts` each carry `isRecord`, `parseOverride` and the designator resolver.
- The kicad-cli path is hard-coded in eight scripts.
- Failure scenario: a fix to the match rule lands in one script, and the per-page and root verdicts then disagree on what an allowance excuses.

M7. An `as const` survives.
- Where: `circuits/h7-platform/vdda-noise.ts:167`.
- What: the plan forbids `as`, and commit 299405c removed the same construct from `root-arrangement.ts` on exactly that ground. No other `as` cast, `any` or `@ts-ignore` was added by this plan's TypeScript (scripted scan of the added lines).

M8. Nothing binds a committed render to its sheet's bytes.
- Where: `drafted/h7-platform/h7-module/*.svg`. `render.sh` compares only the PDF's and SVG's "Sheet:" text, and `verify-root.sh` reads `h7-module.svg` as given.
- What: today every SVG was committed with its sheet (checked against git history).
- Failure scenario: a sheet is re-committed without re-rendering. The verdict stays bound to the sha256 while the picture the owner looked at shows other bytes, and every check passes.
- Fix: in the round-trip test, re-render each sheet with the pinned kicad-cli and compare.

M9. A test helper is over the 500-line limit.
- Where: `tests/circuits/sheet-model.ts` is 533 lines. It was 532 before the plan, which added one line.
- What: this is pre-existing, and recorded here so it is not read as new.

M10. One word points the wrong way.
- Where: `RECORD.md:46-51`.
- What: the rows say "recorded ... against the sha256 below", but the sha256 table is above them.

M11. A refusal that names neither where to fix it nor why.
- Where: `circuits/h7-platform/module-parts.ts:167`: "parts.ts records no pin names for Power_Protection:USBLC6-2SC6".
- What: it names what is missing, but not where to add it (`parts.ts`, `USB_ESD`'s pin table) or why it is not defaulted.


DEFERRED MINORS: DISPOSITION

"Fix now" means cheap and worth doing before the branch closes. "Record" means leave the code, and note the limitation beside it or in the execution record.

| Task | Deferred minor | Still stands? | Disposition |
| --- | --- | --- | --- |
| 1 | physicalize keeps a block with empty componentIds (`lib/board/physicalize.ts:89`) | Yes. An empty page would refuse loudly in `drawingPagesFromNetwork`, since no port reaches a pin. | Record |
| 1 | the refusal test rebuilds `outer` and duplicates an assertion | Yes, cosmetic | Record (no action) |
| 1 | `blocks: []` literals repeated in tests | Yes, cosmetic | Record (no action) |
| 2 | verify-nocode.sh's `vendor/st-pin-data/*.xml` matches at any depth; the README overstates | Yes (verify-nocode.sh case pattern) | Fix now: refuse subdirectories, and add one control |
| 2 | `h7-interface-check.test.ts` JSON.parse implicit any; contract.ts empty-string refusal untested | Yes, at line 144 (line 113 is typed `unknown`) | Fix now: an implicit `any` breaks the typing rule |
| 2 | duplicate `toBeDefined` in the strap test | Yes (`h7-module-pins.test.ts:60` and `:63`) | Record (no action) |
| 2 | no observed red run for the two contract tests | Process; cannot be made retroactively | Record in the execution record |
| 2 | "SYSCFG PC2SO" register name unverified | Yes (`decisions.md:1425`) | Fix now, with I2 |
| 2 | pin-map-check.ts takes `loadContract` as a default parameter | Yes (`interfaceOccupancy(contract = loadContract())`) | Record |
| 3 | Q is the pole-pair Q, not peak \|H\|; say which | Resolved: the decisions table row reads "pole-pair Q", and vdda-noise.ts:26-28 defines it | Closed |
| 3 | "over DCR 0 to 0.045" should say "at both ends" | Fixed in decisions.md; still in the open-items VDDA-WIDEBAND row | Record (trivial) |
| 3 | the undamped ideal form is compared with the damped full divider | Yes. Harmless: the bank meets 806 µV undamped, without the leg | Record |
| 3 | vdda-noise trims tiny leading coefficients silently | Yes, now at `vdda-noise.ts:223` | Record beside the line, or trim exact zeros only |
| 3 | rulings dated 2026-11-12 against a session date of 2026-11-11 | Yes. Harmless (UTC against local time) | Record (no action) |
| 4 | `assertModuleCapacitanceWithinLimit` does not forward `rootNet`; the optional parameters are not in decisions.md | Yes (`module-3v3-budget.ts:124-128`) | Fix now: one parameter |
| 4 | the W9825G6KH 54-pin table is written three times | Yes: `module-parts.ts:176`, `h7-module-parts.test.ts:34`, `h7-project-symbol.test.ts:104` | Record. The test copies serve as independent transcriptions |
| 4 | no test that crossing L_BUCK onto SW cannot escape to the input side | Resolved: `h7-module.test.ts:121-126` requires the input network's capacitors (C_BIN1, C_DAMP) outside the domain | Closed |
| 4 | a test capacitor named `c_bst` connects 3V3 to VDDA | Yes (`h7-module-parts.test.ts:361`) | Fix now (rename) or record |
| 4 | the multi-unit exclusion matches the error text `/multi-unit/` | Yes; it fails loudly if reworded | Record |
| 5 | the per-block partition check takes refs from `page.intent.parts`, not `Network.blocks` | Yes; the project round trip catches a dropped part | Record |
| 5 | `resolveDrawingPages` imports the circuit module on the test-only `--intent` path | Yes (`draw-intent.ts:135`) | Record |
| 5 | two shape guards for DrawingPage | Yes (`hierarchical-labels.ts:134`, `draw-intent.ts:166`) | Record, or consolidate when next touched |
| 5 | the round-trip test rebuilds the fixture's ProjectModel | Yes (`drafted-kicad-round-trip.test.ts:107-125`) | Record |
| 5 | `groups[prefix] ?? ""` is an unreachable fallback | Yes (`drawing-pages.ts:158`) | Fix now: throw (CLAUDE.md: no fallbacks) |
| 5 | commit 5ee0b9f's message has the carrier sha tail wrong | Yes; history | Record in the execution record (no rewrite) |
| 6 | `valueFor`'s beadImpedance refusal is skipped by the capacitor, resistor, pot and `part.value` early returns | Yes (`value-notation.ts:260-299`). A resistor carrying `beadImpedance` is formatted silently. | Fix now: move the check to the top and add a test ("refuse rather than guess") |
| 6 | CR-MODULE-BEAD-VALUE cites parts.md:35 for the rating | Partly. analog.md:242 is now cited too, but parts.md:35 still stands as a rating source and does not carry "220". module-parts.ts:67 is right. | Fix now: drop parts.md from the rating citation at `decisions.md:1570` |
| 6 | the sub-ohm RKM spelling depends on the "0." prefix of `String(number)` | Yes, but safe over the proven range: every number in [0.1, 1) prints with "0." | Record beside `value-notation.ts:93` |
| 6 | process: blocks implemented before the red run; decisions.md written via a heredoc with `#` | History | Record in the execution record |
| 7a | flag-check treats a flag on a non-port net as private | Superseded: `hierarchy-flags.ts` at the root requires exactly one flag per flagged net, at its declared home, across the hierarchy (verify-root output) | Closed |
| 7a | duplicate `#PWR` references across sheets | Resolved: `root_flag_refs.py` renames them, and `hierarchy_flag_probe.py` fails on a duplicate (0 found) | Closed |
| 7b | the env-var table overrides are not refused outside the controls; the closing verdict is silent about them | Yes (`erc-allowances.ts:119-124` and `cross-page-drivers.ts`). They are announced on stderr only. At the root, `root_erc.py`'s exclusion-count match bounds the effect. | Record, or refuse unless a control variable is also set |
| 7b | a passive stand-in cannot catch a pin-type conflict | Resolved: the real root ERC runs, and it caught the NRST conflict | Closed |
| 7b | hard-coded kicad-cli path | Yes, in eight scripts (see M6) | Record (macOS-only tooling) |
| 7b | port-labels trusts `drawingPages` | Yes. `block-netcompare` still compares membership against the model directly | Record |
| 7c | `erc_counts.py`'s docstring premise ("always one `pin_not_connected` per hierarchical label") | Yes (`erc_counts.py:5-7`; sdram has 31 errors for 41 labels) | Fix now: one sentence |
| 7c | RECORD.md:44's stale qspi "exits 1, awaiting ruling" | Resolved: the row now states the ruling and exit 0 | Closed |
| 7c | the FLASH_CLK entry is not in `mcuDriver` form | Yes (`cross-page-drivers.ts:60-67`) | Fix now (trivial) or record |
| 7c | decoupling scripts committed early | History, disclosed | Record (no action) |
| 7d | RECORD:1100 "stops at the ERC failure" | Resolved (no match in RECORD.md) | Closed |
| 7d | erc-control.sh describes pin 126 as `[VDD, Power input, Line]` | Yes, now at `erc-control.sh:195`. The installed symbol has VSS, passive. | Fix now: text only |
| 7d | three allowance refusals with no isolating control | Yes (`erc-allowances.ts` pinProblems and the same-pin check). The pin-type refusal is what removes the allowance if VCAP is ever retyped. | Fix now: the two controls the 7d review gave |
| 7d | one allowance can excuse any number of violations | Yes in `erc_sheets.py`; the root (`root_erc.py`) requires exactly one | Fix now while M6 is aligned, or record |
| 7d | the root's warnings are counted, not bounded | Yes. Root ERC warnings never fail; today they are 3 `lib_symbol_mismatch` and 1 `ground_pin_not_ground`, itemised in RECORD.md:253 | Record |
| 7d | duplicated helpers across the two tables | Yes (see M6) | Record, or fix with M6 |
| 7e | `render.sh` false-refuses a sheet name containing a space | Yes (`render.sh:94`, `grep -o 'Sheet: [^ ]*'`). No such sheet exists. | Record |


DECLINED TO JUDGE

Each line is something I considered and set aside, with the reason.

- Every page's and the root's arrangement, placement and text: EVALUATING-DRAWINGS.md. I am not a qualified reviewer of a drawing, and all thirteen are owner-approved.
- The sub-sheets' title-block page numbers ("Id: 183/13" on decoupling, "Id: 317/13" on reset_boot):
  - They come from akcli's `add_sheet` numbering.
  - `root_pages.py` reports them and never judges them.
  - The owner approved the pages with them visible.
  - No record says whether they are accepted or a tool defect to raise. That is the owner's question, not a review finding.
- Whether CR-MODULE-VDDA-BANK's leg size (worst-case Q 2.25) is acceptable engineering: the ruling records it for the owner, and the analysis behind it is correct.
- The ID strap's own load on VREF_A (about 0.16 mA at 3.513 V through 22.49 kΩ):
  - analog.md's 10 mA figure is the contract's external pin-21 load.
  - No document states a module-internal VDDA budget.
  - The strap follows the HW_REV scheme's "top on VREF_A".
- `footprintsUndeclared: 94`: by design. A schematic needs no footprint (CLAUDE.md G245).
- `erc-control.sh`: not run, as instructed. It passed at 9f6b909 per the caller, and the branch head adds only RECORD edits after it.
- The carrier's replay: not re-run. The carrier sheet's sha256 on disk is unchanged, and the carrier round-trip tests pass in the full suite.
- `make check` at `boards/pt2399-core`: pre-existing failure, not run.


ASSESSMENT

Ready to merge: with fixes. Fix I1 and I2, and the deferred minors marked "Fix now" in the table above.

Reasoning: the model, the analyses, the C3 tooling and the repair loop:

- agree with their sources where spot-checked;
- reproduce byte for byte from a fresh `make draw`;
- carry real negative controls.

Every check asked for is green apart from the pre-existing failure. What remains is record-keeping:

- the plan's own execution record;
- one closed row hiding an open condition;
- a set of small accuracy fixes in comments, rulings and controls.
