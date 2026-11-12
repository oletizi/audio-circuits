Task 7a fix round 1, scoped re-review (2d05096..e54ac07)

Run by me: power.kicad_sch sha256 = 906f4549...875f (matches); erc-control.sh: all nine controls came out as stated; bun run typecheck: clean; h7-module + drafted-kicad-round-trip tests: 36 pass, 0 fail. I did not re-run replay.sh; I read the replay.sh diff.

Per finding
- I1 addressed: CR-MODULE-PWR-FLAGS is at docs/h7-platform/decisions.md:1568 with Label, Date, Decides, Why (three measurements), Costs if wrong, Set by, Carried in. CR-MODULE-PAGE-RAILS line 1566 now says "Settled with it" and links it. "Not ruled" no longer appears in RECORD.md.
- I2 addressed: the ruling is one flag per net across the hierarchy (GND on power, 3V3_D/VREF_A/VSSA on root), recorded with a same-sheet and two cross-sheet measurements. pwr-flag-homes.ts holds the table. one-block-root.ts puts a stub flag only where the net's flag lives elsewhere (power gets none on GND; swd gets 3V3_D and GND). The check and controls can fail (see below).
- M1 addressed: 02-wire.py docstring now names 05-text-edits.py and op-list 04.
- M2 addressed: replay.sh apply writes akcli stderr to files in $work and names them on failure.
- M3 addressed: replay.sh assigns want="$(draft_sha ...)" || exit 1 before check.
- M4 addressed: counts.py classifies by lib_id.
- M5 addressed: everyPin and pinNumbersFromTable moved to lib/kicad/from-network.ts (221 lines); block-netcompare.ts and the tests import from there; own-mapping-board.ts is 19 lines.
- M6 addressed: render.sh filters the Fontconfig warning from kicad-cli stderr as well.
- M7 addressed: erc_counts.py docstring states it always exits 0 and why; REPLAY.md no longer says "copied unchanged".

New-defect checks
- The flag check reads nets from the export, not a line pattern. flag_probe.py finds flags by lib_id through kicad_sheet.py's parser and rewrites the reference only inside that symbol's span (in a scratch copy). flag-check.ts reads the kicad-cli netlist export via importNetlist and takes each flag's net from pin FLGPROBE<n>.1 membership. It also fails if the export's flag count differs from the sheet's count, so a dropped flag cannot pass.
- The controls could fail: control 8 (extra flag on 3V3_D) fails by name; control 2 (flags stripped) fails; control 9 is a positive that passes only with the stub flags (alone it shows power_pin_not_driven 2).
- No file over 500 lines in the diff (largest tool 76 lines, from-network.ts 221). No `any`, no `as` casts, no @ts-ignore in the added lines (grep hits were comments only).
- VSSA in the table is consistent with the controller's note; the table's reasoning is in pwr-flag-homes.ts and the ruling.

New findings
- Minor, flag-check.ts:49-52: a flag on a net that is not one of the block's port names is classed private and allowed. If a block page ever draws a shared net under a name other than its port name, the flag would pass unseen. Not reachable for the power page today; the root-level one-per-net check (Task 7b, already recorded as outstanding in RECORD.md) is the backstop.
- Minor, informational: the fix report's concern 5 (duplicate #PWR01 references across sheets) is unresolved and is correctly handed to Task 7b.

Overall verdict: approved
