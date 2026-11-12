Task 7c review: the vdda, sdram and decoupling block pages (fc53373..03caf6f)

Reviewer: the task reviewer seat. Read-only. No tracked file was changed. Nothing after 03caf6f was
considered; `git diff 03caf6f HEAD` was empty when the checks ran. The review package was read in
passes, by offset. The sheet and SVG bodies were skipped and checked by tools instead (see "Checks run").
This review does not judge any drawing's layout or crossings.

### Spec Compliance

- ✅ **Spec compliant** for Step 3 as applied to vdda, sdram and decoupling.
  - Each page is repaired with akcli. Every op-list and both hand-written scripts are committed
    under `repair/<block>/`:
    - `layout.py` and `02-wire.py`;
    - the generated `ports.json`, `net_strokes.json`, `01-place.json`, `pins.json`, `02-wire.json`,
      `02-wire.nets.json` and `04-hierarchical-labels.json`;
    - `intent.json`, which was already committed.
  - Each page checks against its block's model with 0, 0, 0, 0, and 0 ports are on the wrong net.
  - Each block's own sheet has 0 ERC errors under the one-block root.
  - Each page is rendered: the committed SVGs match a fresh `render.sh` except for the timestamp line.
  - Each page is recorded UNREVIEWED.
- ⚠️ **Cannot verify from the diff:**
  - Step 3 requires each render to be sent to the owner with a question and nothing else. The
    report gives PNG paths in scratch but does not say a message was sent. The controller should
    confirm that the three renders went out.
  - The port-execution `verify.sh` (17 PASS) was not run here. The report says it passes. The
    carrier page's sha256 was checked: it is still `c9355a88…`.

### Checks run

| check | result |
| --- | --- |
| `verify.sh vdda vdda.kicad_sch` | exit 0. Model comparison 0/0/0/0; port labels 0 of 4; sheet alone 4 errors and 2 warnings; one-block root: `/` 0/0, `/vdda/` 0/0; 0 crossings; 0 orphan junctions; fits US Letter |
| `verify.sh sdram sdram.kicad_sch` | exit 0. Model comparison 0/0/0/0; port labels 0 of 41; sheet alone 55 errors (31 `pin_not_connected`, 22 `pin_not_driven`, 2 `power_pin_not_driven`) and 39 warnings; one-block root: `/` 1 error (`label_dangling`, SDRAM_NE's stub) and 33 warnings, `/sdram/` 0/0; stand-in drivers on exactly the 22 table nets; 6 true crossings at the coordinates RECORD gives; fits |
| `verify.sh decoupling decoupling.kicad_sch` | exit 0. Model comparison 0/0/0/0; port labels 0 of 5; one-block root: `/` 1 error (`label_dangling`, VCAP's stub), `/decoupling/` 0/0; 0 crossings; fits |
| `replay.sh` into a new scratch directory (read first; it refuses a non-empty directory and checks every op-list byte for byte) | exit 0. Every intent matches. All 11 page sha256s are reached, each sheet is byte-identical to the committed one, and 77 generated files match their committed copies. The sym-lib-table matches |
| `erc-control.sh` | "every control came out as stated", exit 0. Its P1 now covers all eleven pages |
| `bun run typecheck` | clean |
| `bun test tests/circuits/h7-module.test.ts tests/circuits/drafted-kicad-round-trip.test.ts` | 36 pass, 0 fail, no other output |
| draft sheet-alone ERC (`build/draw/h7-module/<b>/`; the draft sha256s match `replay.sh`) | vdda 2 `pin_not_connected`; sdram 38 + 22 + 2; decoupling 2. All three match RECORD's draft column |
| values and parts on each page against the model | vdda: FB1 220R@100MHz, C21/C22 10uF, C23/C24 .1uF, C25 22uF, R1 0R3, R2 0R. These are `VDDA_RULED` (`vdda-noise.ts:121-144`) and `vdda.ts`. sdram: U3 `h7-platform:W9825G6KH` W9825G6KH-6I, C36 to C42 .1uF, R9 10K (`sdram.ts:60-65`); pin 40 is `no_connect` in the library and carries the one no-connect. decoupling: C1 to C14, C16 and C18 .1uF, C15 4.7uF, C17 1uF, C19/C20 2.2uF, TP1 to TP5 `Connector:TestPoint` (`mcu-decoupling.ts:32-49`). No page has a footprint, and the model declares none |

**The 22 new `cross-page-drivers.ts` entries (lines 69-90).** Each was checked against
`circuits/h7-platform/module-pins.ts` and `vendor/st-pin-data/STM32H743IITx.xml`. All 22 agree on
every point:

- the net and the port name;
- the module-pins line number cited (34-48 and 65-70, plus 72 for CKE), and the CORE-BRIEF or
  split-spec citation that line carries;
- the LQFP-176 position, from ST's `Position=` attribute;
- the FMC signal, which ST lists on that pin, including FMC_SDNWE on PH5, FMC_SDCKE0 on PH2 and
  FMC_SDCLK on PG8.

The set is exactly right. A classification of `sdram/ports.json` by the electrical type of U3's pins
in `h7-platform.kicad_sym` gives:

- 22 nets whose only pin is a U3 `input`: exactly the table's 22;
- 16 `bidirectional` DQ nets;
- SDRAM_NE, an `input` sharing its net with R9's passive pin;
- 3V3_D and GND, on `power_in` pins.

So no entry is missing and none is extra.

**The claim that the sdram `lib_symbol_issues` warning comes only from having no `.kicad_pro`
is confirmed, with one refinement.** The sheet, the committed `sym-lib-table` and the library were
copied in the same relative layout, and kicad-cli 10.0.5 was run three ways:

| variant | result |
| --- | --- |
| no `.kicad_pro` | `lib_symbol_issues` 1 |
| `{}` `.kicad_pro` plus the `sym-lib-table` | the warning is gone; every other count is identical (31/22/2 errors, 38 `isolated_pin_label`) |
| `.kicad_pro` but no `sym-lib-table` | the warning is back |

So the warning clears with the pair, a project file and the committed table, which is what the
Step 4 root will have. The RECORD wording at RECORD.md:901-909 is accurate. No `lib_symbol_mismatch`
appears once the library is found, so the embedded U3 matches `h7-platform.kicad_sym`.

**What the 31-of-41 `pin_not_connected` observation means (RECORD.md:910).** Measured:

- All 41 hierarchical labels are in the file.
- The ten labels with no report are GND, SDRAM_A0 to A3, A10, BA0, BA1, D9 and D10. Nine of them
  still draw an `isolated_pin_label` warning in the same run, so kicad-cli does see them. It simply
  does not emit the "non-existent parent sheet" error for them.
- No other marker shares a position with any of the ten, so this is not marker de-duplication.
- The cause was not diagnosed here either. It is a kicad-cli reporting quirk that depends on the
  layout (the RECORD notes that an earlier layout gave 41).

Why this does not change a verdict: every label is otherwise accounted for.

- The netlist port-label check puts all 41 on their own nets.
- Under the one-block root, the ERC reports no `hier_label_mismatch`, so every label met its sheet pin.
- `erc_counts.py` never fails on the sheet-alone run.

What it does mean: **the sheet-alone `pin_not_connected` count is not a census of hierarchical
labels.** That contradicts the premise written into `erc_counts.py` (Minor 1 below).

### Strengths

- Every value and pin in the new driver entries traces to a cited module-pins line and to ST's
  data, and the set matches the U3 input pins exactly, not approximately. `checkCrossPageDrivers`
  holds each entry against the model and the installed MCU symbol on every run.
- `sdram/02-wire.py` takes U3's pins by side and net from the intent and the ports, rather than from
  a typed list. It refuses when:
  - the two pin columns are not single columns (lines 25-30);
  - R9 is off pin 19's row (lines 50-52);
  - a stub lies outside its bus (line 60).

  `layout.py`'s typed `ONE_PIN_SIGNALS` cannot drift silently, because `text_edits.py:37,52`
  refuses a wire whose net has no stroke.
- The RECORD sections give before and after measurements that re-measure as stated: draft ERC,
  page ERC, crossings with coordinates, and the `/` sheet's items, which were checked here by
  rebuilding the one-block roots. They report the two kicad-cli anomalies as measured but not
  diagnosed, rather than explaining them away. They make no status claim beyond UNREVIEWED.
- The replay extension is minimal (`repair_block` reused). It reaches all eleven sha256s from a new
  directory.
- The early commit of the decoupling scripts is disclosed in the 03caf6f message.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

1. **`drafted/h7-platform/h7-module/repair/tools/erc_counts.py:5-7` states a premise that this task
   measured to be false, and the tool was not amended.**
   - The docstring says *"a block sheet alone always carries one `pin_not_connected` error per
     hierarchical label"*. The sdram page carries 31 for 41 labels (RECORD.md:910, re-measured here).
   - The contradiction is recorded only in RECORD. CLAUDE.md asks for a defect that is not being
     fixed to be noted beside the code.
   - Failure scenario: a later agent trusts the docstring and uses the sheet-alone count as a label
     census, either in a control or to explain a count. On sdram that agent concludes ten labels
     are missing, or builds a check that passes or fails for a reason kicad-cli does not keep.
   - Fix: amend the docstring to say "usually; not on sdram, see RECORD".

2. **`drafted/h7-platform/h7-module/RECORD.md:44` (pre-existing, next to this task's new rows 45-47)
   still says qspi is "`verify.sh` exits 1 on one ERC error under the one-block root, awaiting a
   controller ruling".**
   - The qspi section (RECORD.md:671, :719) records the ruling and `/qspi/` at 0/0.
   - This task's own P1 control, `port-label-control.sh:27`, now requires qspi to verify, and it
     does.
   - Failure scenario: someone reading the page table takes qspi for a withheld page.
   - This is not a 7c line, but this task edited the rows on either side of it and the
     cross-page-driver paragraph that describes qspi's resolution. Fix it in passing.

3. **`drafted/h7-platform/h7-module/repair/tools/cross-page-drivers.ts:54` says `mcuDriver` is "the
   form every entry so far takes", but the FLASH_CLK entry (lines 60-67) is still written out in
   full.** Its source also lacks the `module-pins.ts:<line>` form the new entries use.
   - Failure scenario: a reader cannot find FLASH_CLK's module-pins line from the table, which every
     other entry gives.
   - Fix: write FLASH_CLK through `mcuDriver`, with its line cited the same way.

4. **Commit 0f06844 carries `repair/decoupling/layout.py` and `02-wire.py` before they had been run.**
   - Failure scenario: someone bisecting at 0f06844 finds decoupling scripts that do not produce the
     committed page (none is committed there yet) and later changed (03caf6f changes `layout.py` again).
   - The 03caf6f message discloses it, and `replay.sh` at 0f06844 does not call them, so nothing
     breaks. This is history only; no action.

**Observations (not findings, and not 7c's code):**

- `erc_sheets.py`'s allowance of `label_dangling` on `/` applies to any such error, not only to the
  stubs' labels. Rebuilding the one-block roots shows that KiCad files `isolated_pin_label`
  warnings about the block sheet's own hierarchical labels under `/`: on sdram, 16 of the 32 name
  `Hierarchical Label 'SDRAM_D…'`, and decoupling's `/` names its sheet's BOOT0 label.
- So attribution to `/` is not purely the stubs'. No case was found where a block-sheet error was
  hidden this way. It is raised only so that the Step 4 root ERC, which has no allowance, is relied
  on as the backstop.

### Assessment

**Spec compliance:** ✅ Spec compliant (⚠: the owner sends for the three renders are not verifiable
from the diff).

**Task quality:** Approved.

**Reasoning:** Every page's connectivity agrees with the model and passes its ERC under the
one-block root. The replay reaches every sha256 from a new directory, and all 22 new driver entries
agree with module-pins.ts and ST's pin data, with the set matching U3's input pins exactly. The four
Minor items are a stale tool docstring, a stale pre-existing status row, an inconsistent table
entry and commit history. None of them affects a page.

Counts: Critical 0, Important 0, Minor 4.
