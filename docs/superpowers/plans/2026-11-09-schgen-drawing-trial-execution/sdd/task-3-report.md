Task 3 report: proving the comparator before trusting it

Status: DONE. Commit 00df6db on ai-schgen, pushed.

What was implemented

- tools/schgen-drawing-trial/compare.ts (95 lines)
  - `trialModel(board)`: `modelForSheet(board)` with each component's pinNumbers replaced by `requestPinNumbers(component)` (controller ruling; done in compare.ts, lib/ untouched).
  - `compareAttempt(board, netlistPath)`: refuses a board that is not approved (`approvedSheetDigest`), and refuses a missing netlist file by name. It then returns `{ attempt, approvedBaseline }`. Both come from `compareSheetToModel` against the same rule-numbered model. `attempt` is the netlist at the path; `approvedBaseline` is a fresh `exportDraftedSheet("pultec", board)`. Nothing is subtracted, filtered or normalised.
  - CLI: `bun tools/schgen-drawing-trial/compare.ts BOARD NETLIST OUT_JSON` writes `{board, netlist, attempt, approvedBaseline}`. It refuses wrong arity. Smoke-tested on the low-boost export.
- tests/schgen-trial/comparator-controls.test.ts (292 lines), 10 tests on pultec-low-boost's fresh kicad-cli export.
  - Netlist mutations edit a copy of the export in a temp dir.
  - The power-symbol cases copy the sheet, .kicad_pro and sym-lib-table to a temp dir, edit the sheet copy, and re-export it with kicad-cli.
  - A missing kicad-cli throws; it never skips.

Cases and assertions
- known equal: attempt toEqual approvedBaseline.
- pin moved: attempt.netMembership longer than baseline's.
- two nets merged: same.
- net renamed (to "0"): netMembership equal to baseline's, and the whole attempt equals the baseline.
- pin numbers swapped (pins 1/2 of the first two-pin part on different nets, R2 excluded): componentIdentity+pinIdentity+netMembership longer than baseline's.
  - R2 is excluded because the page already carries R2 swapped, so swapping it here would remove a disagreement.
- pin left unconnected: moved to its own `unconnected-(REF-PadN)` net; netMembership longer.
- power symbol restyled: every `copperhead_power:GND` (lib_symbols entry and lib_id) becomes `power:GND`, and every `#PWR0n` is renumbered to `#PWR5nn`. Value stays GND. attempt equals approvedBaseline.
- power symbol renamed on one pin: the first placed ground symbol's Value goes GND to AGND. netMembership longer.
- nothing adjusted: attempt toEqual a direct `compareSheetToModel(trialModel...)` call on the same moved-pin netlist, and not equal to the baseline.
- R2 baseline: see below.

Power-symbol findings
Both cases behave with `compareSheetToModel` as it stands, so no normalisation was added and the commit says so.
- Power symbols never enter the export's components list.
- The comparator compares only which pins share a net, never the net name.
- So a library or `#PWR` change is invisible, and a Value change on one symbol splits the net and is reported.
One limit: the rename case changed a symbol that carries an explicit Value property, the first one placed. The sheet also has an inline ground symbol (#PWR010) with no Value property of its own. That symbol was restyled in the restyle case but was not the subject of the rename case.

R2 baseline finding
- `DECLARED_PIN_NUMBERS` keys the swap by component id `R2`. That component's sheet designator is `R1`. This is measured: trialModel's designators map R2 to R1, and declared a=2,b=1 against rule a=1,b=2.
- It shows up in **netMembership**, as four entries over J1.3/J1.4/R1.1/R1.2 and their nets. It does not show up in pinIdentity: the pin-number set stays {1,2}, so pinIdentity cannot see it.
- The test reads the designator from the model rather than hard-coding R1. It asserts at least one netMembership entry mentions that designator and that no pinIdentity entry does.

Baseline contents (low-boost, rule-numbered model), measured
- componentIdentity: empty.
- pinIdentity: the SW1 MP lug.
- netMembership: the R2/R1 swap (4 entries).
- values: SW1 "6-way selector", plus 7 leading-zero capacitor texts (e.g. "0.33uF" against ".33uF").
- footprints: 17 entries where the page has no footprint and the model declares one.
- footprintsUndeclared: RV_LO_BOOST, SW_LO_BOOST.
The brief named only the MP lug and the switch Value as known baseline disagreements; the values and footprints lists carry more than that. They are reported beside each attempt, as designed.

TDD evidence
- RED: `bun test tests/schgen-trial/comparator-controls.test.ts` before compare.ts existed failed with `Cannot find module '../../tools/schgen-drawing-trial/compare.ts'`: 0 pass, 1 fail, 1 error.
- First GREEN attempt: 9 pass, 1 fail. The R2 test failed because it searched for the string "R2", but R2's sheet designator is R1. I fixed the test to read the designator from the model.
- GREEN: `bun test tests/schgen-trial/` gave 45 pass, 0 fail, 121 expect() calls across 2 files. `bun run typecheck` was clean.

Files changed
- tools/schgen-drawing-trial/compare.ts (new)
- tests/schgen-trial/comparator-controls.test.ts (new)

Self-review
- No any, no casts, no ts-ignore. Relative .ts imports. No fallback: a missing netlist or an unapproved board throws by name.
- No committed file is modified; every mutation writes into an os.tmpdir() directory.
- The mutation helpers pick their targets structurally (the first net with at least N members), not by hard-coded names, except the R2 exclusion in the swap case. Each sheet-edit helper throws if the edit changed nothing.
- The mutation tests assert "more entries than baseline" rather than "non-empty". That is the stronger form here, because the low-boost baseline netMembership is already non-empty because of R2.

Concerns
- The test temp dirs under os.tmpdir() are not removed after the tests. They are small, but they accumulate across runs.
- The netlist-text helpers depend on kicad-cli 10's tab-indented layout. If it changes, splitNets throws loudly; it does not mis-mutate silently.
- The baseline's values and footprints lists are wider than the brief's "MP lug and switch Value". Downstream readers of the comparison should expect that.
