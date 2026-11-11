# h7-platform port: execution record

**This is an execution record, not findings.** It says how the port of the STM32H743 pedal platform's design knowledge from the pedals repository into this one was carried out, what the checks reported at the end, and what did not cross. It binds nothing. **The documents under `docs/h7-platform/`, `circuits/h7-platform/` and `docs/standards/` are what bind**; where this record and one of them disagree, they win. The port's design is [the port spec](../../specs/2026-11-10-digital-pedal-platform-port-design.md) and its task list is [the plan](../2026-11-10-digital-pedal-platform-port.md).

Source: the pedals repository at commit `5b926d0aaf002d3ea111786f6ab9cdb72b8a913e`. Branch `feature/digital-pedal-platform`, forked from main at `05f4a2a`. Every figure below is read from the task reports in [record/](record/) or re-counted from the committed files at the commit named; none is carried from memory.

## What is in this directory

- `verify.sh`, the check script the tasks appended to (`check_nocode` is sourced from `verify-nocode.sh` beside it); its last run is under "Final verify.sh output".
- `record/`, the execution record committed beside the plan, as the project rule asks:
  - `ledger.md`, the controller's progress ledger (the file `progress.md` of the working directory);
  - `task-<n>-brief.md` and `task-<n>-report.md` for every task, including `2b`;
  - `global-constraints.md`, `topic-task-context.md` and `reviewer-instructions.md`, which every implementer and reviewer was given.
- **The reviews themselves are not files.** Each review came back to the controller as a message; what each found and how it was settled is summarised in `record/ledger.md`, one line per review and per fix round. The `review-*.diff` packages are not committed, since they regenerate from `git diff` between the commits the ledger names.

## Controller rulings

The controller's rulings made during execution (the pre-flight scan, the per-task rulings, the deferred minors and the carry-forwards) are in [record/ledger.md](record/ledger.md). The rulings that bear on what the documents say are recorded in the documents themselves, labelled "Controller ruling (the owner may override)" under the port spec's labelling rule; the ledger is the record of why the work proceeded as it did.

## Per-task counts

Open passages are the "Not verified", "Carries", "Carry" and U-status passages and their equivalents in the sources; each became an open-items row (with a phase) or was merged into one, never closed by paraphrase. Figures are the final, post-fix-round ones from each report. "Rows added" is the change in `docs/h7-platform/open-items.md`'s table over the task's commits, re-counted from git as data rows, not counting the table's header and separator lines: 0 after Task 2, 31 after Task 3, 57 after Task 4, 73 after Task 5, 76 after Task 6, 86 after Task 7, 97 after Task 8, 97 after Tasks 2b and 9, 107 after Task 10, 107 at the head of the branch. The per-task figures in the table sum to the same 107. (An earlier version of this record gave each cumulative figure one higher, having counted the header line as a row; "1 row after Task 2" contradicted the statement below that Task 2 added none.)

| Task | Subject | Open passages counted | Rows added | Rows extended | Notes |
| --- | --- | --- | --- | --- | --- |
| 3 | Architecture, original spec, split spec | counted per section; table in the report | 31 (27 first reported; 4 added in fix round 1) | none recorded | The first count wrongly closed R-9 and left S-9, S-10 and the loopback form without rows; fix round 1 corrected both. One conflict entry |
| 4 | Module power, VIN_MOD, 3V3_D, pedal digital rail | 84 | 26 (plus 2 reused) | not recorded | Merged where one piece of evidence settles several passages |
| 5 | Pedal analog, codec domain, crossings, VREF_A | 70 | 16 | 10 (plus 2 reused unchanged) | Includes VDDA-WIDEBAND and VBUS-HOTPLUG |
| 6 | Bypass relays, power-fail | 4 by keyword, plus the substantive ones mapped in the report | 3 | 4 (4 more in the fix round) | Most passages were already rowed by Task 4 |
| 7 | Processor and memory | 42 | 10 | 1 | 11 existing rows or entries reused |
| 8 | Mechanical and controls | counted per section; table in the report | 11 (10 first reported; STACK-HEIGHT-OWNER-REPORT added in the fix round) | STACK-HEIGHT-CONFIRM amended | Two candidate conflicts were considered and rejected |
| 9 | Parts list | none counted; the task writes `parts.md` | 0 | none | 20 MPN rows added to `parts.md` from the S1 parts tables; promotions of unsourced part claims to controller choices were corrected in `decisions.md` |
| 10 | Schematic checklist, layout carry-forward, bring-up | SCHEMATIC-CHECKLIST section 11 has 5 "Not verified here" bullets; the report maps each | 10 | 5 (the first commit message says 6; the report corrects it) | One conflict entry |

Tasks 1, 2, 2b, 11 and 12 added no open-items rows. Task 11 ported the two research documents and the PCBWay fabrication rules into `docs/standards/`. Task 12 wrote the README, source map, provenance index and licence handling.

## Conflicts raised

`docs/h7-platform/open-items.md`, `## Conflicts`, holds two entries, each naming both sides and picking neither:

1. **The Rev4 Daisy Seed's codec and how a Rev4 is detected.** Electrosmith's datasheet DS120 v1.2.0 and libDaisy's `daisy_seed.h` disagree about which codec a Rev4 carries (AK4556 against AK4430) and about detection. Raised by Task 3. It affects only identification of a Rev4 at first bring-up (SEED-REVISION-RECORD).
2. **The v1 test pads on the split boards.** The v1 checklist and layout carry-forward put one pogo grid on one board; the split spec divides the pads between two boards without saying which net each v1 pad lands on. Raised by Task 10. It affects test access only and is settled by phase 2's per-board pad lists (TEST-PAD-SPLIT).

Tasks 4 to 9 raised none.

## What could not be ported, and why

The README of the documents, [docs/h7-platform/README.md](../../../h7-platform/README.md), maps every platform file at the pin to where it went or to why it stayed behind. The reasons are the port spec's non-goals. In summary:

- **Code and generator output.** Everything under `h7-platform/circuit/`, `generated/`, `boards/v1/`, the Makefile, `MODULE-INTERFACE.md` and `PINMAP.md` (generated), `footprints/` (a pedals KiCad library) stayed behind: no pedals code and no generated artifact of the old tooling crosses. Seven checklist items that tested the old generator or its gates were dropped with their reasons (schematic-checklist.md section 9: PWR-04, PWR-13, ALL-01, ALL-02, ALL-05, ALL-06, ALL-07, and CORE-01's annotation clause).
- **Bulk binary material.** Vendor datasheet copies (`interface-analysis/sources/`, about 80 MB) and the STEP models and their generators (`mechanical/`, about 47 MB) stayed behind, cited by pinned link.
- **Process records.** `DESIGN-REVIEW.md`, `interface-analysis/REVIEW.md` and the pedals `README.md` stayed behind as process records; their fixes reached the analyses and the carried ledger entries.
- **Sources that are not in the pedals history.** The Task 17 rulings and research files that ledger entries R-58 and others name (`task-17-rulings.md`, `task-17-research-A.md`) were never committed to pedals. The documents cite the ledger entry that names them and say the underlying file is not in the pedals history. Likewise the `.tools/oscar` path in the processor-module research is not a file at the pin.
- **Superseded material kept only as history.** Candidates A and C of the layout study, the envelope history table and v1's designator map stayed behind. The v1 schematic is not an authority anywhere in the port.
- **Unsettleable upstream.** The two conflicts above, and the owner question the pedals sources left unanswered (OSCAR-AUDIO-LICENCE-L1), are open items, not rulings.
- **Judgement calls left to the controller or owner.** The `make -C fuzz drc-<board>` command in the fab rules was replaced by a pinned link to the pedals Makefile (Task 11, fix round 1). The review of Task 11 found that the `nocode` check did not scan `docs/standards/`; the controller ruled that it should, and Task 11's fix round 1 (`40682f5`) extended `nocode`'s vocabulary scan to `docs/standards/*.md` (the vocabulary loop in `check_nocode`, now in `verify-nocode.sh`). Its file-type rule still covers only `docs/h7-platform/` and `circuits/h7-platform/`, and the standards scan is skipped silently if `docs/standards/` is absent, a deferred minor that `effective` backstops, since `effective` fails when that directory is missing (ledger, Task 11).

## Amendment for phase 2: the "no model code" rule for TypeScript

Phase 1's `nocode` check allowed only `.md`, `.json`, `.svg` and `LICENSE-*` files in both trees, because phase 1 ported records and wrote no model. Phase 2's G1 exists to write that model, and the H7 carrier plan puts TypeScript under `circuits/h7-platform/`, so `verify.sh` was amended for that one tree and that one file type. A `.ts` file under `circuits/h7-platform/` is allowed and is held by `bun run typecheck` and `bun test`; the code-vocabulary scan no longer reads `.ts` files, since a source comment naming `make -C` is not ported prose leaking pedals-repo vocabulary. Kept unchanged: a `.ts` under `docs/h7-platform/` still fails, any other file type in either tree still fails, `BYTE_PAIRS` exemptions are not widened, and every other check is untouched. When `nocode` passes with `.ts` files present its PASS line says so. `nocode-amendment-controls.sh` re-runs three controls (`circuits/h7-platform/probe.ts` passes with the disclosure, `circuits/h7-platform/probe.py` fails, `docs/h7-platform/probe.ts` fails) and exits non-zero if any misbehaves.

**Extended for KiCad symbol libraries (H7 carrier plan, Task 5; controller ruling).** Spec C4 lets a part with no matching stock symbol take a project symbol, and the project's `CLAUDE.md` puts a circuit's KiCad files in its own directory, so `circuits/h7-platform/h7-platform.kicad_sym` holds the TS3USB221RSER symbol. `nocode` now allows `.kicad_sym` under `circuits/h7-platform/` only, exactly as it allows `.ts`; such a file is held by `tests/circuits/h7-project-symbol.test.ts`, which checks its pins against the datasheet and drafts and exports it with the real copperhead and `kicad-cli`. The PASS line discloses both counts. A `.kicad_sym` under `docs/h7-platform/` still fails, and `nocode-amendment-controls.sh` gained that as its fourth case. The vocabulary scan still reads `.kicad_sym` files.

## Final verification

Run from the worktree root at the head of the branch before this commit. Each step's command and result:

| Step | Command | Result |
| --- | --- | --- |
| 1 | `PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh` | exit 0, 17 lines, all PASS; re-run after the record was copied in, identical output |
| 2a | `bun run typecheck` | exit 0 once dependencies were installed with `bun install --frozen-lockfile` (the fresh worktree had no `node_modules`; before that the script exits 127, `tsc: command not found`, on main at `05f4a2a` as well) |
| 2b | `make check` | exit 2, in `boards/pt2399-core`: `component "delay_ic" (kind "ic") has no parts-list rule in tools/bom/needs.ts`. **The pt2399-core failure, with the same message, also occurs on main at `05f4a2a`** (a temporary worktree, since removed). The two runs are not identical: on main the run also stopped at two transistor-preamp boards, a difference that may come from main's temporary worktree lacking the untracked `.tools/` veroroute build; it was not investigated further |

The conclusion that the port did not cause the failure does not rest on the two runs matching, since they do not. It rests on two facts: the port adds only `.md`, `.json`, `.svg` and licence files, and nothing in `tests/`, `tools/` or `lib/` enumerates `circuits/` as circuits or boards (the one glob over it, `circuits/**/*.ts` in `tests/document-control-bytes.test.ts`, matches no file the port adds), so the new `circuits/h7-platform/` directory is not read by the typecheck or the board checks; and the pt2399-core failure is present on main without the port.

## Done when, walked by reading

Items `verify.sh` cannot check.

- **9 V Seed bench.** [power.md EC-SEED-BENCH](../../../h7-platform/power.md#ec-seed-bench) states the 9 V supply as the current value once, then `Set by:` O-15 (labelled a controller ruling despite its O-number) and `Amended by:` R-50, R-58 and R-59. The 9-12 V range does not appear in force in newly written prose; `verify.sh effective` passes, finding the value in force nowhere in the documents; `verify.sh stale-json` lists where it remains in the byte-identical records (in `module-interface.json`), which are exempt. Result: holds.
- **421 Hz.** [analog.md EC-CONTROL-NOISE-BAND](../../../h7-platform/analog.md#ec-control-noise-band) states 0 to 421 Hz once, `Set by:` R-15, `Amended by:` R-57, and the 179 Hz value appears only on a `*Not in force:*` line. FIG-VREF-BAND gives inputs (9.9 kohm, 38.25 nF), method (the widest pot-filter corner) and the result 420.3 Hz. Result: holds.
- **Q_PEN.** [power.md EC-QPEN-RESET](../../../h7-platform/power.md#ec-qpen-reset) states the Q_PEN reset of EN as current, `Set by:` R-44 and R-58, `Amended by:` none since R-58; the diode reset (D_PEN) appears only on a `*Not in force:*` line with its reason. Result: holds.
- **Figures with a basis.** Sampled FIG-TRIP, FIG-POUR (power.md), FIG-CVCL and FIG-SAI-MARGINS (analog.md) and the FIG-VREF-BAND derivation: each states inputs, a method in words and a pinned source, and open-items.md's preamble labels them paper analysis of an unbuilt board. 19 FIG- headings exist in the two documents. This is a sample, not a count of every figure; `verify.sh` does not check figure bases. Result: no figure without a basis found in the sample.
- **Open items that read as closed.** All 107 rows carry a status beginning "open". Sampled VREF-A-BACKFEED-GATE, which says "Resolved on paper", and SEED-SUPPLY, which says "Mitigated, not closed": both carry an open status, the evidence that closes them and a phase, and both say the paper analysis is not a closure. The table's preamble says no row is a closure. Result: no row reads as closed in the sample.
- **Carry-forward rows, firmware requirements, bring-up.** VDDA-WIDEBAND, VBUS-HOTPLUG and FB-AN2606 are present and open (`verify.sh openitems`); BU-01 to BU-29 and the firmware requirements are checked by `verify.sh bringup` and `firmware`.
- **Not walked by this record.** The whole-branch review is the controller's, and the owner has not reviewed any ported text.

## Final verify.sh output

Verbatim, exit status 0. The five indented lines under `records circuits/h7-platform/module-interface.json:` are that byte-identical JSON file's superseded statements; `stale-json` prints them (to standard error, before its own PASS line, which is why they appear under `PASS effective`), and the README warns about them. `interface-analysis-results.json` has none.

```
PASS bytes
PASS nocode
PASS provenance
PASS standards
PASS effective
  records circuits/h7-platform/module-interface.json:
    141:          "source": "interface-analysis/vin-mod.md §1: the 18 V input condition (spec §5.6.1, POWER.md §4.1) less no drop, continuous; hot-plug transients are vinMod.hotPlugPeakV (§6): 26.3 V at pin 39 itself (25.76 V at the module buck's VIN after L_FILT), ≤ 28 V; pin-39 parts are rated against 26.3 V (S1 Task 17 fix D-D-3, 2026-10-06). A Seed: 17 V, so Seed benches run on 9–12 V (O-15; R-50 limits them to 9 V until bring-up measures a Seed)",
    345:          "source": "interface-analysis/vref-a.md §3: the widest control filter corner, R_POSn 9.9 kΩ (−1 %) and C_POSn 38.25 nF (100 nF × 0.9 tolerance × 0.85 X7R temperature × 0.5 DC bias, ruling R-57), 420.3 Hz rounded up (179 Hz before 2026-10-06, S1 Task 17 fix D-B-2, which took C_POSn at −10 % only)",
    355:      "consequence": "Seed benches run on 9–12 V supplies only (O-15)"
    405:      "consequence": "9–12 V development limit on every revision (O-15); pins 16–19 reserved, so the codec difference is invisible to the contract; the fitted revision is recorded at first bring-up (R-2)"
    1349:      "notes": "ADC reference rail, not a power output. Permitted loads only: pot tops, expression ring reference, HW_REV divider, U_EXP supply. Contract in spec §5.6.3. S1 Task 11 (2026-10-06, rulings R-15 to R-18): external capacitance ≤ 4 µF, noise ≤ 1123 µV rms in 0–421 Hz (0–179 Hz before S1 Task 17 fix D-B-2, 2026-10-06, ruling R-57); the pedal blocks back-feed from the expression jack with an LM66100 ideal diode in the ring reference (held on by a 2N7002 while VREF_A is up, a Schottky clamp on its output, R_REF 3.30 kΩ) and 2.2 MΩ ahead of U_EXP's input (interface-analysis/vref-a.md; fix round 1, rulings R-17, R-19)."
  records circuits/h7-platform/interface-analysis-results.json:
PASS stale-json
PASS decisions
PASS architecture
PASS power
PASS analog
PASS openitems
PASS bypass
PASS firmware
PASS mechanical
PASS parts
PASS bringup
PASS readme
```
