Task 7c report: the vdda, sdram and decoupling block pages

Status: DONE. All three pages are repaired, verified, rendered, recorded UNREVIEWED and committed. Each page was pushed before the next was started. No ruling was needed, and none was made.

Pages

| block | sha256 | PNG (150 dpi) | SVG | verify.sh |
| --- | --- | --- | --- | --- |
| vdda | 7f066a9ab786252b592d14ffaa8886e934876bcc678666b73c1922f06eee2444 | /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7c/render/vdda.png | /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/vdda.svg | exit 0 |
| sdram | 0812ab0287bdb8e126f8bd3b2d4a09e54251ee6dc0e62e784d871b9947a48bcf | /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7c/render/sdram.png | /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/sdram.svg | exit 0 |
| decoupling | 8d20ff5196f59330bb77424024d856124808d3d49c5affe89db56f7516c416cb | /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7c/render/decoupling.png | /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/decoupling.svg | exit 0 |

On every page the comparison with the model gives 0, 0, 0, 0 and every port is on its own net. Under the one-block root, the block's own sheet reports 0 errors and 0 warnings. All three pages fit US Letter, including decoupling with its 25 parts, so there is no overshoot to record.

Commits (branch feature/digital-pedal-platform, pushed)

- 2245ac7 h7 module: repair the vdda page (Task 7c)
- 0f06844 h7 module: repair the sdram page (Task 7c)
- 03caf6f h7 module: repair the decoupling page (Task 7c)

What changed besides the pages

- `repair/<block>/` for each of the three blocks holds:
  - the hand-written `layout.py` and `02-wire.py`;
  - the generated `ports.json`, `net_strokes.json`, `01-place.json`, `pins.json`, `02-wire.json`, `02-wire.nets.json` and `04-hierarchical-labels.json`.
- `repair/replay.sh` gained `repair_block vdda`, `sdram` and `decoupling`, plus their sha256 constants. `REPLAY.md` gained the three end rows.
- `repair/tools/port-label-control.sh` P1 now loops over all eleven committed pages.
- `repair/tools/cross-page-drivers.ts` gained 22 entries for the sdram page, under CR-MODULE-CROSS-PAGE-DRIVERS:
  - The nets are SDRAM_A0 to SDRAM_A12, BA0, BA1, NBL0, NBL1, CLK, CKE, NWE, NRAS and NCAS. Each is driven by U1's FMC pin on the mcu page.
  - Each entry names its `module-pins.ts` line, the line that file cites, and the LQFP-176 position.
  - A small `mcuDriver` helper keeps each entry to one line. The file is 215 lines.
  - These 22 nets are exactly the draft's 22 `pin_not_driven` errors.
  - SDRAM_NE needs no entry because R9's passive pin is on it. The DQ nets need none because U3's DQ pins are bidirectional.
  - The table's model check passes on every run.
- `pwr-flag-homes.ts` is unchanged. None of the three pages needs a shared net flagged that the table lacks.
- RECORD.md:
  - Three Sheets rows, three page-table rows, and one section per page in the 7b form: rulings, the draft and page measurement table, and observations.
  - The cross-page driver paragraph now names the sdram entries.

Final checks, run after the last commit's content was in place

- Every committed page's sha256 is unchanged. The eight earlier module pages match their RECORD values. The carrier is c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8.
- verify.sh exits 0 on all eleven module pages.
- erc-control.sh: "every control came out as stated", exit 0.
- replay.sh, into a new directory, exits 0 and reaches all eleven page sha256s.
- `bun run typecheck`: clean.
- bun test with h7-module, drafted-kicad-round-trip and h7-carrier: 59 pass, 0 fail.
- The port-execution verify.sh prints 17 PASS and exits 0.

Concerns and observations

1. sdram has 6 true crossings. They are recorded in its RECORD section with coordinates and cause:
   - The supply pins of the W9825G6KH alternate between 3V3_D and GND down each side, so a stub to the farther bus crosses the nearer one. That gives 2 crossings on each side.
   - SDRAM_NE crosses both west buses to reach R9 (2 more). R9 cannot stand in the stub region, because U3's pins 18 and 20 are signals 100 mil away.
   - Whether the crossings are acceptable is the owner's question.
2. sdram has a `lib_symbol_issues` warning: "the current configuration does not include the symbol library 'h7-platform'".
   - kicad-cli reads the directory's sym-lib-table only when a `.kicad_pro` sits beside the sheet. `drafted/h7-platform/h7-module/` has none yet.
   - Measured: with an empty `.kicad_pro` added in a scratch copy, the warning goes away and every other count stays the same.
   - It is a warning, not an error. The root's `.kicad_pro` in Step 4 should clear it, and Step 4 should confirm that.
3. On sdram, kicad-cli reports `pin_not_connected` for only 31 of the 41 hierarchical labels when the sheet runs alone.
   - The same 10 labels are missing on two runs. An earlier layout of the page reported all 41.
   - verify.sh does not judge the sheet-alone run, so this changes no verdict. I did not look into why. It is recorded in the section.
4. The draft columns now show a failure on the port-label row on every draft. That check postdates the 7b draft measurements, and a draft has no hierarchical labels. This is stated in each section.
5. Commit hygiene: the decoupling `layout.py` and `02-wire.py` went into the sdram commit (0f06844) before they had been run. The decoupling commit says so. The replay does not use them before 03caf6f.
6. Under the one-block root, decoupling's `/` reports `label_dangling` on VCAP's stub. That is expected: VCAP is in neither table, and every pin on it on this page is passive.
7. No model defect was found and no transcription question came up. Every value drawn comes from the intent the model generated, including FB1 "220R@100MHz", R1 "0R3" and R2 "0R". VDDA-DAMPING-LEG stays open, and the vdda section says so.
