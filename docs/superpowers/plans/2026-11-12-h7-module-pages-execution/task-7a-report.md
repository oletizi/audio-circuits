Task 7a report: draft every h7-module page, repair the power page

Power page renders (open these before reading further):
- PNG, 150 dpi: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7/render/power.png
- SVG (committed): /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/power.svg
- PDF: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7/render/power.pdf
- The sheet: /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/power.kicad_sch

Status: DONE_WITH_CONCERNS. The page agrees with the model and has 0 ERC errors on its own sheet under a one-block root. It rests on one choice no ruling covers: two PWR_FLAGs (concern 1). Without them the page fails ERC with 2 errors.

Commits (pushed to feature/digital-pedal-platform)
- b5c15e6 h7 module: record three controller rulings the power page rests on (docs/h7-platform/decisions.md: CR-MODULE-PAGE-RAILS, CR-MODULE-INDUCTANCE-NOTATION, CR-MODULE-SUBOHM-RKM)
- 7272b8d h7 module: draft all twelve pages, repair the power page

Power page sha256: 906f454928df01a8c32826a277f041e2a3151fef8ac69a967f14f7abf8b7875f. Status UNREVIEWED.

Step 1: make draught-doctor reported that every pinned tool matched. akcli doctor's advisory listed only a MISSING optional akcli.toml.

Step 2: make -C boards/h7-module draw (about 20 s)
- No ADVISORY section was printed.
- NO INDEPENDENT NETLIST: printed once for the board, as C2 states.
- A second run produced byte-identical drafts and intents.
- No draft has a power symbol: 0 power: lib_ids, 0 #PWR and 0 #FLG on all twelve.
- Paper: copperhead drafted mcu on A3, power on A4 and the other ten on A5. All twelve were re-papered to US Letter. Only mcu overshoots the frame: 61.553 mm to the south (content y 15.24 to 265.43 mm; the frame ends at 203.877 mm).
- Every page's intent is committed at drafted/h7-platform/h7-module/repair/<block>/intent.json. The twelve draft sha256 values are in RECORD.md and in replay.sh.

Draft notes for the other 11 pages: the measurement suite as make draw printed it. The selftest reported 10 controls on every page, every one moved or fired. Label counts are labels (global labels). Observations only.

| page | drafted | wires | labels | NC | true crossings | T-meetings | tees without a dot | paper | copperhead notes |
|---|---|---|---|---|---|---|---|---|---|
| mcu | 1 part, A3 | 41 | 5 (3) | 57 | 1 | 120 | 15 (y 25.4 mm row) | overshoots 61.553 mm S | not compacted; ink at 17% of the frame |
| decoupling | 25 parts, A5 | 59 | 31 (31) | 0 | 0 | 0 | 0 | fits | the group wrapped onto 3 bands; label overlaps went from 14 to 0 after 60 passes |
| vdda | 8, A5 | 23 | 7 (6) | 0 | 0 | 0 | 0 | fits | |
| sdram | 9, A5 | 33 | 30 (29) | 1 | 0 | 0 | 0 | fits | |
| qspi | 3, A5 | 12 | 4 (2) | 0 | 0 | 0 | 0 | fits | |
| clock | 3, A5 | 12 | 3 (0) | 0 | 0 | 0 | 0 | fits | |
| reset_boot | 8, A5 | 26 | 10 (5) | 0 | 1 | 0 | 0 | fits | "hang refused: SW1 could not be placed cleanly on U5.2; drawn in a column instead" (copperhead's words) |
| swd | 6, A5 | 15 | 7 (4) | 3 | 0 | 0 | 0 | fits | |
| usb_dfu | 7, A5 | 37 | 13 (8) | 2 | 0 | 0 | 0 | fits | J4 mirrored |
| id_strap | 3, A5 | 10 | 2 (0) | 0 | 0 | 0 | 0 | fits | |
| interface | 2, A5 | 3 | 1 (0) | 4 | 0 | 0 | 0 | fits | J1 mirrored |

Power draft, before repair: 85 wires, 15 labels (4 global), 3 true crossings, 1 T-meeting, and 1 tee without a dot, which sits at a collinear overlap. The before and after table is in RECORD.md.

Step 3: the power page
- Repair, under drafted/h7-platform/h7-module/repair/power/:
  - 01-place: delete copperhead's wiring, then place and orient the 19 parts from layout.py.
  - 02-wire: straight segments, computed junctions, the RT no-connect, one local label per port, and the title block.
  - 03-pwr-flags.
  - 04-hierarchical-labels: from tools/draught/hierarchical-labels.ts, followed by its check.
  - 05-text-edits: per-net strokes, fields set by orientation rule, and the group rectangle.
- Every op-list went through akcli plan, then draw --apply, and each reported APPLIED. The net diff after 02 re-formed the 11 nets with the intent's pin counts.
- repair/replay.sh, run from the commit into a new empty directory, reached all 12 draft sha256 values and the page sha256. The replayed page is byte-identical to the committed one.
- Agreement: block-netcompare.ts compares the kicad-cli export against h7Module() restricted to the power block's componentIds.
  - componentIdentity 0, netMembership 0, pinIdentity 0, values 0.
  - The export has 19 components, 12 nets and 44 members.
  - Negative controls on copies of the page: R5 changed to "4.7K" gives values 1 and exit 1; the R8 GND stub deleted gives netMembership 3 and exit 1.
- ERC (kicad-cli sch erc --severity-all):
  - On the sheet alone: 3 errors and 1 warning. The 3 errors are pin_not_connected, one per hierarchical label ("cannot be connected to non-existent parent sheet"). No repair of a block page can remove them.
  - Under a one-block root (tools/one-block-root.ts, built from assemble-root.ts), sheet /power/: 0 errors, 0 warnings.
  - Under the same root, sheet /: 3 label_dangling errors, because the root's stub labels have no other block to meet, and 1 warning.
  - Warning on every run: lib_symbol_mismatch, U2's embedded TPS62933F against the library copy. It is also on the draft.
- Parenthesis depth 0. 1 true crossing, where the EN descent crosses the VIN_BUCK row. 0 T-meetings, 0 orphan junctions out of 24, 0 tees without a dot.
- Labels: 3, all hierarchical. 60 wires, 765.81 mm. 3 wire corners. Fits US Letter.
- 3 of 12 exported nets carry a model name, the port nets. The private nets are unlabelled wire.

Concerns
1. PWR_FLAGs, not ruled.
   - U2's VIN (on VIN_BUCK) and GND are power_in pins. No power_out pin is on either net, so ERC reports 2 power_pin_not_driven errors on the draft and on the repair without flags.
   - I added a PWR_FLAG on VIN_BUCK and one on GND (op-list 03).
   - I measured a PWR_FLAG on a copy of the two-block fixture: one flag on a's private FB and one on b's. The root export stayed /a/FB and /b/FB, four nets, the same as the control. ERC on that root reported 0 errors and 0 warnings. So a PWR_FLAG joins no nets by name, which is the reason CR-MODULE-PAGE-RAILS gives.
   - But the flag is a power-library symbol. The controller should rule whether the ruling admits it.
   - Removing op-list 03 reproduces a page that fails ERC.
   - akcli names the flags #PWR01 and #PWR02. Every page will likely do the same, so references repeat across sheets. The fixture probe had duplicate #PWR01 references on two sheets and ERC reported 0 errors.
   - The MCU page will meet the same ERC question on 3V3_D and VREF_A.
2. Three controller rulings from the ledger are now recorded in decisions.md: no power symbols, .0047mH, and 0R22. They existed only in the gitignored progress.md. I recorded them as the controller's, with the costs it gave.
3. The per-block ERC count is taken under a one-block root. The sheet-alone count cannot reach 0 for any block page. I report both.
4. No .kicad_pro yet. As ruled, it comes with the root. Renders use KiCad defaults.
5. Block names in the model are mcu, decoupling, vdda, power, sdram, qspi, clock, reset_boot, swd, usb_dfu, id_strap and interface. The brief's names (mcu-decoupling, reset-boot, usb-dfu, id-strap) differ.
6. The carrier's verify.sh used `tail -7` on junction_audit, which cut off the summary when collinear pairs are listed. The module copy greps the summary lines instead. The carrier is untouched.

Green checks
- PEDALS_REPO=... verify.sh: 17 PASS.
- bun test h7-carrier and drafted-kicad-round-trip: 37 pass.
- bun test tests/draught tests/circuits: 499 pass.
- bun run typecheck: clean. It covers the new .ts files under drafted/.
- Carrier sha256 is still c9355a88...d8f8.
- make -C boards/h7-module check: ok, with its notice unchanged.
- The pre-existing failures (pt2399-core make check, temp-scratch test) were not run.
