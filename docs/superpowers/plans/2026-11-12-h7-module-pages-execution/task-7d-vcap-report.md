Task 7d, ruling CR-MODULE-VCAP-ERC: report

STATUS: DONE. verify.sh exits 0 on all twelve module pages. The mcu page's one pin_to_pin is excused by the one declared allowance, and the closing output names it. No .kicad_sch bytes changed.

Commits (pushed to origin/feature/digital-pedal-platform)
- 89c6140 h7 module: one declared ERC allowance for VCAP1-VCAP2 (Task 7d)
- 17ea496 h7 module: record CR-MODULE-VCAP-ERC; correct two stale lines (Task 7d)

What changed
- drafted/h7-platform/h7-module/repair/tools/erc-allowances.ts (new, 188 lines). This is the one declared table, `ERC_ALLOWANCES`. Its one entry has:
  - ruling CR-MODULE-VCAP-ERC, sheet /mcu/, type pin_to_pin;
  - pins (U1, 81) and (U1, 125), net VCAP, symbolPinType power_out, and a source.
  - Model check, on every run (`checkErcAllowances`):
    - the sheet is /<block>/ for a block of h7Module();
    - the designator resolves through DESIGNATORS to a component of that block;
    - each pin is on the entry's net in the model, so both pins are on VCAP;
    - the installed KiCad symbol types each pin power_out;
    - the two pins are distinct.
  - Any failure is refused, naming what is missing.
  - Test override: H7_ERC_ALLOWANCES_TABLE. It is announced on stderr as "TEST OVERRIDE" and checked the same way.
  - CLI: `bun erc-allowances.ts <out.json>` writes the checked table for erc_sheets.py.
- cross-page-drivers.ts now exports `pinConnection` and a new `installedSymbolPin` (the old `symbolPinName` wraps it). No change to the table or to behaviour.
- erc_sheets.py takes a required third argument, the allowances JSON.
  - It excuses an error only when all of these hold: path equal, type equal, exactly two items, each parsed by `^Symbol (\S+) Pin (\S+) \[`, and the sorted pairs equal the allowance's.
  - Each excused violation prints as `excused: error <type> on <sheet> under <ruling>: <items>`, and the sheet line reads "errors N (k excused by a declared allowance)".
  - An allowance whose sheet is in the report and which matched nothing prints `stale allowance: ...` and does not fail the run.
  - An allowance for a sheet not in the report is not applicable, and nothing is printed for it. For that reason the other eleven pages do not print a stale line.
- erc-one-block-root.sh runs erc-allowances.ts before erc_sheets.py. A refusal fails the run.
- verify.sh captures the one-block-root log. It still prints the log, and then at its close it:
  - repeats every `excused:` line, or prints "no ERC error excused by a declared allowance";
  - repeats every stale line.
- erc-control.sh: controls 1 to 13 are unchanged. The synthetic `expect` now passes an empty allowances file. New controls:
  - 14, positive: the committed mcu page verifies, and the closing lines name the excused VCAP pin_to_pin with CR-MODULE-VCAP-ERC.
  - 15, negative: the allowance is removed through the override. The override is announced and the run fails with "/mcu/ has 1 ERC error(s): pin_to_pin".
  - 16, negative: an allowance naming U1 pins 81 and 126 is refused by the model check: "U1 pin 126 is on net GND in the model, not on VCAP".
  - 17, erc_sheets.py on synthetic reports:
    - the exact pair is excused and named;
    - other pins, another type, a third item, and the same pins on /power/ each fail;
    - a stale allowance is reported and passes.
- REPLAY.md tools table: a row for erc-allowances.ts, the erc_sheets.py row extended, and controls 14 to 17 noted.
- docs/h7-platform/decisions.md:
  - `### CR-MODULE-VCAP-ERC` is added after CR-MODULE-PORT-LABEL-CHECK. It is labelled "Controller ruling (the owner may override).", dated 2026-11-12, and has these parts:
    - decides;
    - why;
    - history: v1's exclusion awaited an owner sign-off (ALL-07); ALL-07 is listed as not carried; and this ruling is listed for the owner;
    - costs if wrong: one C4 symbol, an mcu redraw, and the allowance removed;
    - set by, and carried in.
  - The "does not carry" ALL-07 clause now points to the new ruling.
  - CR-MODULE-CROSS-PAGE-DRIVERS: "has one entry" is replaced by a pointer to `CROSS_PAGE_DRIVERS` and the nets by group: FLASH_CLK; the SDRAM input nets; NRST and BOOT0.
  - The neighbouring bullet was stale in the same way, and I also replaced it. It named "the pages not yet repaired (vdda, sdram, decoupling, mcu)". It now says only that a page adds its entries when it is repaired.
- RECORD.md:
  - qspi row: "verify.sh exits 0 since ruling CR-MODULE-CROSS-PAGE-DRIVERS (27bc5a0); before it, it exited 1 (the history is in its section)". qspi's own section already kept the history and is unchanged.
  - mcu row and section: they now say exits 0 under the ruling. The prior exit-1 text is kept, headed "The history, kept".
  - "What the root must do":
    - the cross-page-drivers paragraph's list of entries now points to the table and names its groups (it had omitted NRST and BOOT0);
    - a new paragraph says the root's .kicad_pro carries exactly the one exclusion (/mcu/, pin_to_pin, U1 81 and 125), and that the root's ERC check excuses only that and fails on any other error.

Checks, run after the last code change
- sha256 of every page:
  - clock 83f751b2…, decoupling 8d20ff51…, id_strap 7649af43…, interface 0cfb3dac…, mcu c3d780a2ec08d385c4fe777c288f851f3c8803754cf995c6cb6f1da49539f981, power 906f4549…, qspi a9578cf6…, reset_boot ca60cfca…, sdram 0812ab02…, swd 48692365…, usb_dfu 80947ede…, vdda 7f066a9a…;
  - carrier c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8;
  - `git status --porcelain -- '*.kicad_sch'` is empty.
- verify.sh: exit 0 on all twelve pages (power, interface, clock, reset_boot, swd, usb_dfu, id_strap, qspi, vdda, sdram, decoupling, mcu). The eleven pages other than mcu close with "verify.sh: no ERC error excused by a declared allowance".
- erc-control.sh: "erc-control.sh: every control came out as stated", exit 0.
- replay.sh into a new empty directory: REPLAY-EXIT=0. 12 "byte-identical" lines, including "the replayed mcu.kicad_sch is byte-identical to the committed sheet".
- bun run typecheck: exit 0.
- bun test tests/circuits/h7-module.test.ts tests/circuits/drafted-kicad-round-trip.test.ts tests/circuits/h7-carrier.test.ts: 59 pass, 0 fail.
- PEDALS_REPO=… verify.sh (port): exit 0, 17 PASS.

verify.sh mcu, closing lines, verbatim
verify.sh: every step ran
verify.sh: ERC errors excused by a declared allowance (erc-allowances.ts):
   excused: error pin_to_pin on /mcu/ under CR-MODULE-VCAP-ERC: Symbol U1 Pin 81 [VCAP, Power output, Line]; Symbol U1 Pin 125 [VCAP, Power output, Line]

Concerns
1. The model check also requires the installed symbol to type both pins power_out. This goes beyond the brief. If a project symbol ever retypes VCAP, the run refuses instead of reporting the allowance as stale. That is deliberate, because the ruling says to remove the allowance in that case. It is one line to drop if the controller wants stale-only behaviour.
2. A stale allowance is reported only when its sheet is in the run's report. For a one-block root that means only on the mcu run. An allowance whose sheet path were mistyped would never match anything. It would still show up, because the mcu run would then fail.
3. The item parsing relies on KiCad's "Symbol <ref> Pin <n> [" item description. An item that does not parse makes the violation not excusable, so a format change fails loudly rather than excusing.
4. A concurrent commit, c8778ec (the owner's verdicts on qspi, vdda, sdram and decoupling), landed before mine. Its message says RECORD.md statuses follow after the VCAP fix. I did not change those four pages' UNREVIEWED status in RECORD.md. That is still to do.
5. The root sheet `/` under the mcu one-block root reports 166 warnings. They are warnings, they were there before, and they do not fail the run. I did not investigate them.
