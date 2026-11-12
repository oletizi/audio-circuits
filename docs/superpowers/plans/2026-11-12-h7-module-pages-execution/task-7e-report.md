# Task 7e report: the h7-module root (brief Step 4)

## Status

DONE_WITH_CONCERNS. Every item is done except one. Root ERC is NOT at 0 errors: there is one
unexcused error, and no ruling covers it. I did not make that ruling, because it would contradict
CR-MODULE-VCAP-ERC's "no other". No block page byte changed.

## Artifacts

- Root: `drafted/h7-platform/h7-module/h7-module.kicad_sch`, sha256 `fd7baeabadac2ed81049b24484c8ee53c27f82fbcb5efb569a1328726fef1d86`.
- Project file: `drafted/h7-platform/h7-module/h7-module.kicad_pro`, sha256 `62905f75e8abc6cf0890616b8021b8a31140395b01575e817e372bbd6f09a5a0`. It carries exactly one exclusion, for VCAP.
- The root's blank text has sha256 `134c620e32f4587ab861a8210298ae31533ca041247b3bb183f8e1b13eef25d2`.
- SVG: `/Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/h7-module.svg`
- PNG at 150 dpi: `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7e/render/root.png`. It is made from page 0 of the 13-page PDF, because `render.sh` assumes a single page.
- The `sym-lib-table` was already committed. With the `.kicad_pro` beside it, kicad-cli reads it, and root ERC shows no `lib_symbol_issues`.

## Results, item by item

1. **Assembly.** The root comes from `assemble-root.ts blank`, then `ops` (`repair/root/01-assemble.json`), then `root-flags.ts` (`02-pwr-flags.json`), then `root_flag_refs.py`. `kicad-pro.ts` writes the `.kicad_pro`.
2. **PWR_FLAGs.** The root carries three flags: 3V3_D, VREF_A and VSSA, each at that net's first root stub label.
   - `hierarchy_flag_probe.py` and `hierarchy-flags.ts` check that the whole hierarchy carries exactly one flag per declared net, at its declared home. The committed project has 5 flags on 5 nets.
   - Control 2 is a duplicate 3V3_D flag on the decoupling page. It fails, naming 3V3_D.
   - Control 3 removes the root's flags. It fails, naming 3V3_D, VREF_A and VSSA.
   - A duplicate on the root itself cannot be made with akcli: `place_pwr_flag` on a net that already has a flag on that sheet moves the existing flag instead of adding one. I measured this.
3. **Cross-page drivers.** The root has no stand-in drivers: `counts.py` finds 3 symbols, all of them flags.
   - ERC reports 0 `pin_not_driven`.
   - `root-drivers.ts` finds all 25 entries on their nets, each with its real driving pin.
   - Control 9 cuts reset_boot's NRST stub. It fails on NRST.
4. **VCAP exclusion.** kicad-cli 10.0.5 does honour `.kicad_pro` exclusions; I measured it. With the entry present, the violation is reported as `"excluded": true` with severity warning. If the pins are swapped or x is one unit off, the exclusion is not honoured: the real violation stays an error, and a phantom excluded marker is added beside it.
   - `root_erc.py` holds every excluded violation to `erc-allowances.ts` by exact match. Each allowance must match exactly once, and the number of exclusions must equal the number of allowances.
   - Controls 6 to 8 cover this: no exclusion fails, the exclusion doubled fails, and synthetic stray and exact cases behave as stated.
5. **Root ERC: NOT 0 errors.** There is 1 error, one excluded violation (VCAP), and these warnings:

   | Warning | Count | Where |
   | --- | --- | --- |
   | `lib_symbol_mismatch` | 3 | U2, U4, U6, on `/` |
   | `ground_pin_not_ground` | 1 | U1 pin 37 (VSSA) |

   The error is a `pin_to_pin` on `/swd/`: "Pins of type Open collector and Output are connected". The pins are J3 pin 10, `~{RESET}`, typed open collector by `Conn_ARM_JTAG_SWD_10`, and U5 pin 2, `~{RESET}`, typed output by the TPS3839DBZ stand-in symbol (CR-MODULE-SUPERVISOR-SYMBOL).
   - The fitted TLV803EA30DBZR drives NRST open-drain (D14, owner-approved). So the circuit is right, and the error comes from how the stand-in symbol types its pin.
   - The two pins sit on different pages, so the passive stand-ins could not show this conflict. The record already said only the real root could show it.
   - There are three options for the ruling, none tried:
     - **A second declared allowance.** This amends CR-MODULE-VCAP-ERC's "no other".
     - **A C4 project symbol for the TLV803E** that types pin 2 open collector. This changes the approved reset_boot page.
     - **A project-wide ERC pin-map change** that makes open collector against output a warning. This applies to every net in the project.
6. **Root export against the whole model.**
   - `compareSheetToModel` gives 0, 0, 0, 0.
   - The export holds 94 components (each once), 174 nets and 482 net members.
   - `registerDraftedProjectTests` is bound in `tests/circuits/h7-module.test.ts`, and the module is added to `PROJECTS` in `drafted-kicad-round-trip.test.ts`.
7. **Board declaration.** `boards/h7-module/perfboard.json` now declares `sch` (the root) and `netlist`. `make netlist-agrees` wrote `tests/fixtures/h7-module.net`; a second run left it unchanged. `make -C boards/h7-module check` passes.
8. **The two parked minors.**
   - **(a) Repeated `#PWR` references matter to export.** kicad-cli's export prints "schematic has annotation errors" on stdout, not stderr. ERC is silent about it. I fixed it by renaming the root's flags `#FLG01` to `#FLG03`. The probe now fails on any `#` reference used twice across the hierarchy, and `verify-root.sh` fails on the warning (control 5).
   - **(b) The flag-check gap is covered.** Control 4 puts a flag on power's private FB net. `flag-check.ts` passes it as private, and the whole-hierarchy check fails it.
9. **Replay.** `replay.sh` now replays the root and the `.kicad_pro` and checks that no block sheet changed.
   - Because the board now declares a netlist, `make draw` no longer prints the `NO INDEPENDENT NETLIST` block. `replay.sh` now requires that the block is absent.
   - The drafts are the same bytes as before.
10. **Render.** The SVG and PNG are listed under Artifacts. The root does not fit US Letter: it overshoots south by 779.103 mm.
    - `assemble-root.ts` uses a fixed arrangement. The mcu sheet alone is 462 mm tall, and the content reaches y = 983 mm.
    - The render shows the mcu sheet (pins down to POS5), decoupling and vdda. The other nine sheets fall below the edge of the paper.
11. **RECORD.md.**
    - It has a new root section: UNREVIEWED, the measurements, the rulings it rests on, and the ERC finding.
    - The "What the root must do" section is now "What the root does", with evidence.
    - The stale line around 1100 is fixed. The `NO INDEPENDENT NETLIST` note is updated.
    - REPLAY.md and the TOOLING.md C3 note are updated.
    - decisions.md gains CR-MODULE-ROOT-PROJECT-FILE, which records the Task 5 controller ruling. Until now that ruling existed only in the gitignored progress log.

## New tools (in `repair/tools/`)

- `root-flags.ts`
- `root_flag_refs.py`
- `kicad-pro.ts`
- `hierarchy_flag_probe.py`
- `hierarchy-flags.ts`
- `root-drivers.ts`
- `root-netcompare.ts`
- `root_erc.py`
- `verify-root.sh`
- `root-control.sh` (nine controls)
- `root_tamper.py` (scratch edits for the controls; it refuses to edit any path under `drafted/`)

## End checks, quoted

These are from the final run of the scratchpad's `final.sh`:

- **sha256.** All twelve block pages match the sheet table in RECORD.md: "13 rows, 0 differ []", which counts the root row too. The carrier's is `c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8`.
- **verify.sh on the twelve block pages.** "all twelve: exit 0".
- **erc-control.sh.** Exit 0, "every control came out as stated".
- **root-control.sh.** Exit 0, "every control came out as stated".
- **verify-root.sh.** Exit 1, "these checks failed: erc". This is the NRST error from Concern 1.
- **replay.sh,** into a new empty directory. Exit 0. It reached every sha256, including the root (`fd7baeab...`) and the `.kicad_pro` (`62905f75...`). Every block sheet was unchanged.
- **`bun run typecheck`.** Exit 0.
- **`bun test`** on `h7-module`, `drafted-kicad-round-trip`, `h7-carrier` and `two-block-project`. "78 pass, 0 fail".
- **`make -C boards/h7-module check`.** Exit 0.
- **The port `verify.sh`.** Exit 0, 17 PASS.

## Commits

All are pushed to `feature/digital-pedal-platform`:

- `d3071d4` assembles the root sheet, its flags and its `.kicad_pro`.
- `7b53e51` binds the project tests, the board declaration and the fixture.
- `3a60f98` makes `replay.sh` reach the root.
- `67e0bdc` adds the root controls.
- `71db737` adds RECORD.md, REPLAY.md, the TOOLING.md note, the decisions.md entry and the SVG.

## Concerns

1. **The root's unexcused ERC error on NRST needs a ruling.** The options are in item 5. Until then, `verify-root.sh` exits 1, by design, and names only the ERC check.
2. **The root's paper.** The fixed arrangement overshoots US Letter by 779 mm, and the render shows 3 of the 12 sheets. Whether to change the arrangement or the paper is the controller's question. I changed nothing in `assemble-root.ts`, because the two-block fixture depends on it.
3. **`render.sh` assumes one page,** but the root's PDF has 13 pages. I made the PNG from page 0 by hand and recorded the command in RECORD.md.
4. **`root-control.sh` is not called from `erc-control.sh`.** This keeps `erc-control.sh`'s result independent of the open ERC ruling. It can be added as control 18 once root ERC is at 0.
