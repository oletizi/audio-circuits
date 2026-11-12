Task 7e review: brief Step 4 (the module root) and fix round 1
=================================================================

Range `f986afa..299405c` (8 commits, confirmed with `git log --oneline f986afa..HEAD`). Read-only. No tracked file changed: `git status --short` was empty after every run. The reviewer judged no drawing and no layout. Every measurement below is connectivity, ERC, bytes or text.

## Spec compliance

**Verdict: ✅ Spec compliant.** Every Step 4 requirement holds when I run it myself:

- **Root export against `h7Module()`.** `verify-root.sh` gives componentIdentity, netMembership, pinIdentity and values all 0. It reports "export: 94 components, 174 nets, 482 net members; model: 94 components". `root-netcompare.ts:462` requires the sorted designator list to equal the model's, so each component appears exactly once. `registerDraftedProjectTests` is bound at `tests/circuits/h7-module.test.ts:184-194`.
- **Root ERC.** 0 errors on every sheet, and exactly one excluded violation: `pin_to_pin` on `/mcu/`, U1 81/125. The 4 warnings are `lib_symbol_mismatch` 3 on `/` and `ground_pin_not_ground` 1.
  - `h7-module.kicad_pro` carries exactly one `erc_exclusions` entry.
  - kicad-cli honours it. root-control control 6 removes the entry, and the same pins then fail as an error. Control 7 doubles the entry, and the run fails on the count.
- **Stand-in drivers.** The real root has none: `counts.py` reports "symbols 3 (0 parts, 0 power, 3 flags)". `root-drivers.ts` places 25 of 25 entries on their nets with their real drivers. NRST is driven by U5.2 and carries all 7 model pins.
- **PWR_FLAGs.** There are 5 across the hierarchy: 3V3_D, VREF_A and VSSA on the root, `power_VIN_BUCK` and GND on power. That is one per declared net, each at its home. The probe finds 5 `#` references and none repeated.
  - Controls 2 to 5 came out as stated inside `erc-control.sh` control 18: duplicate, missing, a private flag on FB, and a repeated `#` reference.
- **`tests/fixtures/h7-module.net`.** It is identical to a fresh export of the committed root, ignoring only the date, source and tool lines.
- **`perfboard.json`.** It declares `sch` and `netlist`.
- **`make -C boards/h7-module check`.** Exit 0.
- **`replay.sh`.** I ran it into a new scratch directory, and it exited 0. It reached every draft sha256 (reset_boot's draft is `a68c14b8…`) and every page sha256 (reset_boot's page is `00407478…`). It reached the root blank `134c620e…`, the root `3590b959…` and the `.kicad_pro` `62905f75…`, and found every block sheet unchanged.

⚠️ **Cannot verify from here: Step 4's "send the root render to the owner with a question".** That is the controller's act.

## Checks I ran

| check | result |
| --- | --- |
| `sh drafted/h7-platform/h7-module/repair/tools/verify-root.sh` | exit 0, "every check passed"; paper_fit "fits: yes"; root_sheets_fit "12 of 12" |
| `sh .../erc-control.sh` | exit 0, "every control came out as stated"; control 18 "10 root controls came out as stated" |
| `bash .../repair/replay.sh <scratch>/replay` | exit 0, as above |
| `bun run typecheck` | exit 0 |
| `bun test` h7-module, h7-module-parts, drafted-kicad-round-trip, h7-carrier, two-block-project, h7-project-symbol, root-arrangement | 110 pass, 0 fail, no warnings in the output |
| `make -C boards/h7-module check` | exit 0 |
| two-block fixture `replay.sh` into scratch | exit 0; root, a and b byte-identical |
| `root_pin_justify.py` connectivity | a scratch copy with all 204 sheet-pin justifies removed exports byte-identically to the committed root (date/source/tool lines aside) |
| `root-flags.ts` connectivity | a scratch copy with the 3 root flags removed by `strip_pwr_flags.py` exports byte-identically; neither copy prints the annotation warning |
| reset_boot vs the approved predecessor | `git show 2b7dde8:…/reset_boot.kicad_sch` hashes to `ca60cfca…`; the diff against HEAD is exactly 8 lines: the lib_symbols name, Value, Datasheet, Description, the two unit names, pin 2 `output` -> `open_collector`, and the placed `lib_id`. No position, wire, label, field or junction changed |
| TI SLVSES2J, read from the PDF with pdftotext | p. 5 Table 6-1, DCK/DBZ column: GND 1, RESET 2 (O), VDD 3 (I). p. 1: "TLV803E: open-drain, active-low". p. 3: "803E: Open-Drain Active-Low", and the R/V pinout letters. The project symbol's pins (`h7-platform.kicad_sym`, diff lines 102-258) match: 1 GND power_in, 2 `~{RESET}` open_collector, 3 VDD power_in |
| independent library scan (my own text scanner, 22,784 symbols in all installed libraries) | no symbol has pin 2 RESET/RST typed open_collector or open_emitter with pin 1 GND. Pin 2 is `~{RESET}` with pin 1 GND only on LM809, MIC811LUY, TCM809 and TPS3839DBZ, all typed `output`. This confirms the rejection of TPS3839DBZ, and the absence of any stock stand-in |
| same-class audit | the symbol table in RECORD.md lists every distinct symbol among the 94 components; only U5's was named for another part. I agree |
| committed `h7-module.svg` | a fresh `render.sh … root` differs from it only in its date line |
| the "0 overlapping text" figure | I re-ran the scratch `t7e-fix/svg_stroked_text.py` on the committed SVG: "overlapping pairs of body text ink boxes: 0"; "body text ink crossing a sheet box edge: 4 [power, qspi, id_strap, decoupling]", as RECORD.md states |
| page numbers | the root's sheet instances number mcu 2, decoupling 183, vdda 194, power 203, sdram 210, qspi 293, clock 310, reset_boot 317, swd 326, usb_dfu 337, id_strap 344, interface 351. The PDF of page 317 prints "Id: 317/13". This is consistent with "op index + 2": mcu's 1 + 180 ops puts decoupling at 183 |
| `as` casts, `any`, `@ts-ignore` in added TypeScript; file sizes | none; the largest new or changed file is 393 lines (`h7-module-parts.test.ts`) |

## Strengths

- **The fix round treated the NRST ERC error as a defect, not as an allowance.** The stand-in typed RESET push-pull, while the fitted part is open drain. Retyping the symbol from the datasheet removed the error without widening CR-MODULE-VCAP-ERC.
- **The reset_boot change is minimal and proven.** Every op-list is byte-identical, and the sheet diff is the symbol alone.
- **The root checks can fail, and each has a control.**
  - `root_erc.py` holds excluded violations to the allowance table, and holds the exclusion count to the allowance count.
  - `hierarchy-flags.ts` maps flags to module nets through real pins, never through net names.
  - `root_sheets_fit.py` covers the gap in `paper_fit.py`.
  - `root_tamper.py` refuses any path under `drafted/`.
- **Refusals name what is missing and where to fix it.** See `root-arrangement.ts:119-124` and `:173-180`, and `root-flags.ts:396-408`.
- **The project symbol's geometry test pins it to TPS3839DBZ's** (`h7-module-parts.test.ts`, the `at(...)` comparison), so the page's wiring cannot drift silently.

## Issues

### Critical

None.

### Important

**I1. RECORD.md's page-status table carries a false root status.** `drafted/h7-platform/h7-module/RECORD.md:44` still reads "UNREVIEWED; `verify-root.sh` exits 1, on ONE root ERC error … `pin_to_pin` on NRST … which needs a ruling".
- Since fix round 1, `verify-root.sh` exits 0, and the error is gone. The root section of the same file (around line 200) says so.
- **Failure:** the controller, or the owner reading the status table, is told the root has an open ERC error and an unmade ruling. A stale cause is the failure CLAUDE.md singles out.
- **Fix:** rewrite the row as UNREVIEWED with `verify-root.sh` exit 0, and give the fix-round history in one clause.

**I2. RECORD.md's page-status table says the changed reset_boot page is reviewed.** `RECORD.md:48` reads "reset_boot | **reviewed 2026-11-12**, *"approved. proceed"*, … against the sha256 below".
- The sha256 "below" is now `00407478…`, which the owner never reviewed. The approval was of `ca60cfca…`.
- The reset_boot section itself correctly says UNREVIEWED, so the file contradicts itself, and the summary table claims a verdict for bytes that carry none.
- **Failure:** a reader of the table, or any later tool that reads it, treats the swapped page as approved. EVALUATING-DRAWINGS.md section 5 forbids advancing a page's status by anything but the owner's verdict, and this row has the same effect.
- **Fix:** mark the row UNREVIEWED (changed after approval of `ca60cfca…`), as the section does.

**I3. The arrangement tool's own header describes a rule it does not implement.**
- `tools/draught/root-arrangement.ts:7-21` states the rule as "stacked down a column … A new column starts … A column's sheet boxes share one west edge". It says refusals cover "a block that does not fit even in a column of its own, or a board whose columns run past the frame's east edge".
- `tools/draught/assemble-root.ts:13-20` repeats the column rule.
- The code (`arrangeRoot`, `root-arrangement.ts:155-198`) packs tallest first at candidate points. That is what TOOLING.md, decisions.md CR-MODULE-ROOT-FITS-LETTER and the fix report describe. The fix report says the column rule was replaced before commit, but its description was not.
- **Failure:** the next agent reading the tool that carries a ruling is told a different rule from the one the code runs. The header and the function docstring in the same file disagree, so a reader cannot tell which is the ruling's rule. CLAUDE.md: "Supersede means delete".
- **Fix:** replace both headers with the packing rule.

**I4. `render.sh` with a numbered sub-sheet page writes a PDF/PNG of that page and an SVG of the root, silently.** I measured this on a scratch copy of the committed project.
- `render.sh … 317` gives a PDF whose text reads "Sheet: /reset_boot/ Id: 317/13". The SVG the same run writes as `<stem>.svg` has title block "Sheet: / Id: 1/13": the root.
- `render.sh … 2` gives a PDF of `/mcu/` and an SVG of the root.
- kicad-cli 10.0.5's `sch export svg --pages` does not select the sub-sheet the way `export pdf --pages` does. The "exactly one SVG file" guard (`render.sh:97-98`) passes because one file is written.
- `REPLAY.md:120` and the script header (`render.sh:12-16`) both document "a KiCad page number … renders that one page".
- **Failure:** anyone who renders a block page through the root gets a matched-looking PDF/PNG/SVG triple in which the SVG is a different page. A wrong artifact under the right name is the false green the project catalogues.
- **Scope:** only the `root` argument is used today, and it is correct, because the root is page 1.
- **Fix:** either refuse any page argument but `root`, or check the SVG's title-block "Sheet:" or "Id:" against the page requested.

### Minor

**M1. The off-paper count disagrees across files.**
- `docs/h7-platform/decisions.md:1670` (CR-MODULE-ROOT-FITS-LETTER) and `tests/draught/root-arrangement.test.ts:8` say "9 of its 12 sheet symbols" lay off the paper at Task 7e.
- `RECORD.md:260` and `:274` say `root_sheets_fit.py` found 2 of 12 on the paper (10 off), and so does the fix report. The 9 appears to come from the Task 7e render, which showed 3 sheets.
- **Failure:** a reader cannot tell which is the measurement.

**M2. The "no two text boxes overlap" figure rests on a scratch script that is not committed.**
- The script is the scratchpad's `t7e-fix/svg_stroked_text.py`. I re-ran it and it reproduces 0. RECORD.md:262 discloses that it is scratch.
- `decisions.md` (CR-MODULE-ROOT-FITS-LETTER, "After both steps, a measurement of the render's drawn text finds no two text boxes overlapping") states it without that caveat.
- CLAUDE.md: "A measurement goes in a tool or a test that re-runs it, never in prose". The scratchpad is not durable, so the figure becomes unre-derivable.
- **Fix:** say "scratch, not committed" in decisions.md too, or commit the script as a reported (not gating) measure.

**M3. The sub-sheet page numbers are not recorded.** The owner will see them in the project, for example "Id: 183/13" on decoupling and "Id: 317/13" on reset_boot, but RECORD.md states only the root's "Id: 1/13" (`RECORD.md:292`). The fix report names this (concern 6), but no committed file does.

**M4. `root_sheets_fit.py` misstates where its frame comes from.** Its docstring (lines 9-10) says the frame is "paper_fit.py's FRAME_X and FRAME_Y (imported, not copied)". It is copied (lines 23-25) and text-checked against paper_fit.py by `check_frame_constants`.

**M5. `replay.sh` labels its root checkpoint "root 01 to 04"** (replay.sh, the `check` after `root_pin_justify.py`). That checkpoint follows five steps: blank, ops, flags, refs and justify. REPLAY.md and RECORD.md number the justify step 5.

**M6. The determinism test is weak.** `tests/draught/root-arrangement.test.ts` ("the arrangement is deterministic") compares two calls in one process, so it could not catch dependence on ordering outside the function. The committed `01-assemble.json` being regenerated byte-identically by replay is the stronger evidence, and it holds.

**M7. CR-MODULE-ROOT-FITS-LETTER names only two of the three flag placements.** Its flag bullet says "That puts 3V3_D on mcu's west edge, and VREF_A on decoupling", and omits VSSA, which is on mcu's east edge, bottom pin. RECORD.md gives all three. This is incomplete, not false.

## Rulings, electrically

I found nothing electrically wrong in the listed rulings:
- The amended CR-MODULE-SUPERVISOR-SYMBOL types the TLV803E RESET `open_collector`, which is what SLVSES2J states.
- The single VCAP exclusion matches exactly U1 81/125 on `/mcu/`.
- The PWR_FLAG homes give each supply net one flag.

## Assessment

**Spec compliance:** ✅

**Task quality:** Needs fixes

**Reasoning:** The root is electrically sound and every gate I re-ran passes:
- export 0/0/0/0 with 94 components once each;
- 0 ERC errors with the single honoured exclusion;
- 5 flags, one per net;
- 25 of 25 drivers;
- replay reaches every sha256;
- justify and flags change no connectivity.

Two status rows in RECORD.md now state false things about the root and the reset_boot page. The arrangement tool documents a rule it does not run. `render.sh` silently writes the wrong page's SVG for any numbered page.
