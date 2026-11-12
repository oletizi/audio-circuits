Task 7a, fix round 1: report

Status: DONE_WITH_CONCERNS (one deviation from the expected list, stated under I2 and Concerns).

Commits (all on feature/digital-pedal-platform, pushed):
- 66fad6e Move pinNumbersFromTable and everyPin to lib/kicad/from-network.ts (M5)
- dd67b6d h7 module repair tools: the review's minor findings (M1-M4, M6, M7)
- df949b5 h7 module: one PWR_FLAG per net, declared once, checked per block (I2)
- e54ac07 h7 module: record the PWR_FLAG ruling where rulings live (I1)

No commit carries AI attribution. The power page and carrier page bytes are unchanged.

## The cross-sheet measurement (I2 d), verbatim

MEASURED, not inferred: two PWR_FLAGs on one shared net on two different sheets under one root are an ERC `pin_to_pin` error.

Script: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/fix1/crosssheet.sh. It copies tests/fixtures/two-block-board/drafted/ (a.kicad_sch, b.kicad_sch, the root) to scratch, places a PWR_FLAG with akcli `place_pwr_flag` at each block's GND hierarchical label (4500, 2650) mils, and runs `kicad-cli sch erc --severity-all` on the root.

```
kicad-cli 10.0.5
--- case none: PWR_FLAG on GND in sheet(s): none
sheet /: 0 violation(s)
sheet /a/: 0 violation(s)
sheet /b/: 0 violation(s)
--- case a-only: PWR_FLAG on GND in sheet(s): a
sheet /: 0 violation(s)
sheet /a/: 0 violation(s)
sheet /b/: 0 violation(s)
--- case a-and-b: PWR_FLAG on GND in sheet(s): a b
sheet /: 0 violation(s)
sheet /a/: 1 violation(s)
  [error] pin_to_pin: Pins of type Power output and Power output are connected
      - Symbol #PWR01 Pin 1 [Power output, Line] @ (1.143, 0.6731)
      - Symbol #PWR01 Pin 1 [Power output, Line] @ (1.143, 0.6731)
sheet /b/: 0 violation(s)
```

(The two items are the two flags, one per sheet; akcli named each `#PWR01` on its own sheet, and both sit at the same sheet coordinates.)

A second cross-sheet measurement, on the module itself (script crossmodule.sh in the same folder): the power page with an extra PWR_FLAG on 3V3_D, under the one-block root whose 3V3_D stub carries the root's flag:

```
sheet /: 4 violation(s)
  [error] pin_to_pin: Pins of type Power output and Power output are connected
      - Symbol #PWR01 Pin 1 [Power output, Line] @ (0.2794, 0.4318)
      - Symbol #PWR03 Pin 1 [Power output, Line] @ (2.5146, 1.016)
  [error] label_dangling: Label not connected
      - Label 'GND' @ (0.2794, 0.4826)
  [error] label_dangling: Label not connected
      - Label 'VIN_MOD' @ (0.2794, 0.5334)
  [warning] lib_symbol_mismatch: Symbol 'TPS62933F' doesn't match copy in library 'Regulator_Switching'
      - Symbol U2 [TPS62933F] @ (1.4732, 1.016)
sheet /power/: 0 violation(s)
```

So the ruling's "why" rests on both the same-sheet case (the review's) and the cross-sheet case (these two). Both are in the ruling's text, in 03-pwr-flags.py's docstring and in RECORD.md's PWR_FLAG paragraph.

## Findings and what was done

### I1: the ruling recorded where rulings live
- docs/h7-platform/decisions.md: new `### CR-MODULE-PWR-FLAGS`, after CR-MODULE-PAGE-RAILS. It has the neighbours' fields: Label (Controller ruling (the owner may override).), Date 2026-11-12, Decides, Why (with the three measurements), Costs if wrong, Set by, Carried in.
- CR-MODULE-PAGE-RAILS: the "Open with it:" line is replaced by "Settled with it:", which links to the new ruling.
- RECORD.md: "Not ruled: the two PWR_FLAGs" is replaced by a bullet that links CR-MODULE-PWR-FLAGS and carries the measurements.
- verdicts.md: in the h7-module power page entry only, "the PWR_FLAG admission" is now a link to `../h7-platform/decisions.md#cr-module-pwr-flags`. Nothing else in the file changed (one-line diff).

### I2: the tooling
- (a) The table is drafted/h7-platform/h7-module/repair/tools/pwr-flag-homes.ts, and the ruling cites it. `SHARED_FLAG_HOME` holds GND -> power and 3V3_D, VREF_A, VSSA -> root. VIN_BUCK is kept out of it, listed apart in `PRIVATE_FLAGS` (power).
  - The table's contents came from a survey, scratchpad fix1/survey.py; its output is in survey.out. The survey ran `kicad-cli sch erc` on each of the twelve committed drafts, mapped each `power_pin_not_driven` pin to its net through that draft's netlist export, and aggregated pin types per shared net across all twelve exports:
    - 3V3_D has power_in 26 and no power_out;
    - GND has power_in 12 and no power_out;
    - VREF_A has power_in 1 and no power_out;
    - VCAP has power_out 2, so it needs no flag;
    - VSSA: ERC reports `Symbol U1 Pin 37 [VSSA, Power input, Line]` on the mcu draft, on net `unconnected-(U1-VSSA-Pad37)`, because that draft leaves pin 37 unwired. The model puts pin 37 on VSSA (module/mcu.ts), and nothing on VSSA is a power output. So VSSA is in the table, homed on the root. **This goes beyond the brief's expected "3V3_D and VREF_A". The brief said to take the list from ERC, and ERC reports it.**
- (b) one-block-root.ts places `place_pwr_flag` at a stub's label exactly when `flagLivesElsewhere(net, block)`. It refuses if the stub labels and the flagged nets disagree in count.
  - For power, it now prints "stub PWR_FLAGs on 3V3_D", with no GND flag on the stub.
  - /power/ under it: 0 errors, 0 warnings.
  - The root `/` now has 2 label_dangling where it had 3, because the 3V3_D stub label meets the flag. RECORD.md's table records that.
- (c) verify.sh has a new step, "PWR_FLAGs on shared nets", which runs before ERC. It works in three parts:
  - flag_probe.py finds each placed PWR_FLAG by lib_id through draughting/measure/kicad_sheet.py's parser, which handles both textual forms. It rewrites the flag's reference to FLGPROBE<n> inside that symbol's own list, in a scratch copy only.
  - This is needed because kicad-cli's netlist export leaves out `#` references (measured: the power page's export lists neither flag; the probe copy's lists both).
  - flag-check.ts then reads the probe's kicad-cli export and fails in three cases, naming the net: a flag on a shared net whose home is elsewhere, a flag on a shared net with no declared home, or an export whose flag count differs from the sheet's.
  - The ERC-under-root step moved into erc-one-block-root.sh, which verify.sh and the new positive control both call.
- (d) Measured; see above.
- (e) erc-control.sh keeps controls 1-7 and adds two:
  - 8, negative: a scratch power page with an extra PWR_FLAG on 3V3_D, placed at its hierarchical label by flag_at_label.py and akcli, fails with "flag-check.ts: FAIL - power carries a PWR_FLAG on shared net 3V3_D, whose single flag lives on root (pwr-flag-homes.ts, ruling CR-MODULE-PWR-FLAGS)".
  - 9, positive: the committed **swd** draft, sha256-checked against the recorded a772b4a7...7837. The control applies only the committed hierarchical-labels.ts op-list, which turns copperhead's labels into the block boundary; no part or wire moves. It requires the sheet to have no flag of its own. Alone, the sheet reports `error power_pin_not_driven: 2` (J3 GND and VTref). Under its one-block root, whose stubs carry flags on 3V3_D and GND, /swd/ has 0 errors and 0 warnings.
  - Why swd: mcu, decoupling, qspi and reset_boot were tried. decoupling has no power input. qspi keeps a `pin_not_driven` (an input, not power) after the label step. reset_boot also passed, but swd was picked. mcu would need repair.
  - **The draft as committed cannot serve on its own.** Its copperhead global labels give `hier_label_mismatch` at the root, so the label op-list is applied. That op-list is the C3 step that makes a draft a block page, not a placement repair.
- (f) The note is in RECORD.md under "## What the root must do about PWR_FLAGs (Task 7b)", and in the brief's Step 4 (task-7-brief.md). The root must:
  - place the root-held flags;
  - check exactly one PWR_FLAG per net across the hierarchy against the table;
  - reach 0 ERC errors at the root.
  The note also says that assemble-root.ts places no flag today, and that no check of the one-per-net rule across the whole hierarchy exists yet.

### Minors
- M1: 02-wire.py's docstring now names 05-text-edits.py and op-list 04 (03 is the PWR_FLAGs).
- M2: replay.sh's `apply` writes akcli's plan and draw stderr to `$work/akcli-<oplist>.err.{plan,draw}` and names the file on failure.
- M3: replay.sh assigns `want="$(draft_sha "$b")" || exit 1` before `check`, so draft_sha's own message stops the replay.
- M4: counts.py classifies by lib_id. The power page reads "symbols 21 (19 parts, 0 power, 2 flags)", and RECORD.md's row is corrected.
- M5: `everyPin` and `pinNumbersFromTable` now live in lib/kicad/from-network.ts. `everyPin` replaces that file's private `allPins`, which was the same function. block-netcompare.ts and the tests (drafted-kicad-round-trip, two-block-project, sheet-model, sheet-model.test) import from there. own-mapping-board.ts keeps only the interface.
- M6: render.sh sends kicad-cli's pdf and svg stderr through the same Fontconfig filter as magick's. A render of the power page printed no Fontconfig line.
- M7: the module erc_counts.py docstring states that it ALWAYS exits 0, and why: the sheet alone always has one pin_not_connected per hierarchical label, and the verdict is erc_sheets.py's under the root. REPLAY.md no longer says "copied unchanged"; its file table lists the new tools.

## Must-hold checks, with output

Run from the repository root, by scratchpad fix1/musthold.sh. Its output is in musthold.out.

```
== power sha
906f454928df01a8c32826a277f041e2a3151fef8ac69a967f14f7abf8b7875f  drafted/h7-platform/h7-module/power.kicad_sch
== carrier sha
c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8  drafted/h7-platform/h7-carrier/h7-carrier.generated-do-not-edit.kicad_sch
== verify.sh power
exit 0
verify.sh: every step ran
== module erc-control.sh
== 1. committed power page verifies
   pass
== 2. power page without its PWR_FLAGs fails
strip_pwr_flags.py: removed 2 placed PWR_FLAG instance(s)
   fails as expected
== 3-7. erc_sheets.py on synthetic reports
   absent: exit 1 as expected
   target-error: exit 1 as expected
   root-other: exit 1 as expected
   extra-sheet: exit 1 as expected
   root-dangling: exit 0 as expected
== 8. power page with a PWR_FLAG on 3V3_D fails, naming 3V3_D
   fails as expected: flag-check.ts: FAIL - power carries a PWR_FLAG on shared net 3V3_D, whose single flag lives on root (pwr-flag-homes.ts, ruling CR-MODULE-PWR-FLAGS)
== 9. swd draft, hierarchical labels only, no GND flag of its own, passes ERC under its one-block root
   alone:    error power_pin_not_driven: 2
   under the one-block root: sheet /swd/: errors 0, warnings 0; one-block-root: one sheet "swd" with pins 3V3_D, GND, NRST, SWCLK, SWDIO; stub PWR_FLAGs on 3V3_D, GND
erc-control.sh: every control came out as stated
exit 0
== carrier erc-control.sh
   pass
== 2. a report with an ERC error fails
   fails as expected
== 3. a report with only warnings passes
   pass
erc-control.sh: every control came out as stated
== replay   (bash drafted/h7-platform/h7-module/repair/replay.sh <new scratch dir>)
exit 0
after make draw, mcu.kicad_sch: f4814efe8202001dd8ecf2cb64c56e3c329ff604ce91f30292b64448fd4282eb
after make draw, decoupling.kicad_sch: 6c9d10a2f9cbeb8219380d3f52f54f23c9a775133e486012934166587d2eefdb
after make draw, vdda.kicad_sch: dd3216347137c8e7b95ee07b03fade7d19382283ce2f95e4bfa52d6d3ed79bdd
after make draw, power.kicad_sch: 1aee153350e07e96d7ecc09a5b25a4ff6c6987016244840a081d716b79df38b4
after make draw, sdram.kicad_sch: bd560a2406a4ab6d7181202cf0cc59861d7880ff1bddf0592f075e93df04f2f8
after make draw, qspi.kicad_sch: 1cde054c9d8e9d8cf2e362503d47a140ea39cf69bc709774d2ee9aa4e1a4c788
after make draw, clock.kicad_sch: 4e6c1565f3b035a5137d2ee2aec5d5c428d6b4a8e4bb3ae2206769dac3a236bb
after make draw, reset_boot.kicad_sch: ce4271830f6994b4bd197c9ca3a269f42395d3937b2fa89cb1f5786d4588d5c0
after make draw, swd.kicad_sch: a772b4a70a576bf77c940ac686b81a5d6259b442e5eefda3c840f3cc6d637837
after make draw, usb_dfu.kicad_sch: 8961061ef5970c5f567bb53c8adcb63d83636187c63391dbc16ad284c83fe791
after make draw, id_strap.kicad_sch: 4155a90943894fc2dedf9945034ec3d4c3a35f7cde36052c74fb1d9f13ec6ddd
after make draw, interface.kicad_sch: a19804fc684e8b0d33d8fc50b305421b2399378590f109a260f56d9b5c2adaae
after 01 to 05, power.kicad_sch: 906f454928df01a8c32826a277f041e2a3151fef8ac69a967f14f7abf8b7875f
the replayed power.kicad_sch is byte-identical to the committed sheet
the committed sym-lib-table matches the one this replay makes
== typecheck
$ tsc --noEmit
exit 0
== tests  (h7-carrier, drafted-kicad-round-trip, h7-module, two-block-project, sheet-model)
 73 pass
 0 fail
 397 expect() calls
Ran 73 tests across 5 files.
== port verify
exit 0
17   (PASS lines; last: PASS mechanical, PASS parts, PASS bringup, PASS readme)
```

- tests/circuits/two-block-board.test.ts does not exist. The two-block tests are tests/circuits/two-block-project.test.ts, which I ran.
- sheet-model.test.ts was added because M5 touched it.
- A wider run, `bun test tests/circuits tests/schgen-trial/request.test.ts`, gave 442 pass and 0 fail.
- The replay also ran each generated op-list check ("matches the committed copy") and every akcli step reported APPLIED; see mh-replay.log.

## Concerns

1. **VSSA is in the table, beyond the brief's expected 3V3_D and VREF_A.** ERC reports it, on the mcu draft's unwired pin 37, and the model puts that pin on VSSA. If the mcu repair finds VSSA driven some other way, the table changes; the ruling's text names VSSA.
2. **The positive control applies the committed hierarchical-labels.ts op-list to the swd draft.** No draft passes the one-block root as copperhead wrote it, because its global labels give hier_label_mismatch. No part or wire moves, but this is a step beyond "the committed draft unaltered".
3. **The table's VREF_A and VSSA homes rest on the drafts' pin types.** The mcu, vdda and decoupling pages are not repaired yet. A repaired page could carry a power output on one of these nets (none is visible in the stock symbols today); then that net leaves the table.
4. **Nothing yet checks one flag per net across the whole hierarchy.** That is Task 7b's job (RECORD.md's new section). Until then the per-block check covers each page against the table, and the root ERC is the backstop.
5. **In the fixture measurement, akcli named the flag on each sheet `#PWR01`.** Two `#PWR` references are duplicated across sheets, and ERC did not report it. Task 7b's root may meet duplicate `#PWR` references across pages; KiCad annotates power references per sheet as placed.
