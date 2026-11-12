Task 7b report: Step 3 for interface, clock, reset_boot, swd, usb_dfu, id_strap, qspi

STATUS: DONE_WITH_CONCERNS

RENDERS FIRST (150 dpi PNG in the scratchpad; SVG committed beside each page):
- interface: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7b/render/interface.png ; /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/interface.svg
- clock: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7b/render/clock.png ; /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/clock.svg
- reset_boot: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7b/render/reset_boot.png ; /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/reset_boot.svg
- swd: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7b/render/swd.png ; /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/swd.svg
- usb_dfu: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7b/render/usb_dfu.png ; /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/usb_dfu.svg
- id_strap: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7b/render/id_strap.png ; /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/id_strap.svg
- qspi: /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7b/render/qspi.png ; /Users/orion/work/audio-circuits-work/digital-pedal-platform/drafted/h7-platform/h7-module/qspi.svg

Every page is UNREVIEWED. Nothing was sent to the owner.

PER BLOCK (sha256; verify.sh; ERC under the one-block root on /<block>/ and on /; rulings)

1. interface - 0cfb3dac4f7a8c8f63c965390c36897a0f21793d865e379070d6d610cd028296
   verify.sh exit 0. Model comparison 0,0,0,0 (2 components, 39 nets, 40 members).
   /interface/: 0 errors, 0 warnings. /: 0 errors, 64 warnings (isolated_pin_label). Sheet alone: 35 errors (pin_not_connected, labels with no parent), 34 warnings.
   Rulings: CR-MODULE-PAGE-RAILS, CR-MODULE-PWR-FLAGS (no flag). Drawing choice: the 35 undrawn nets take copperhead's default stroke (layout.py UNDRAWN_STROKES).

2. clock - 83f751b213f71266095f3826df5283bc5ae53208d95f4757f5d53824a83b55b1
   verify.sh exit 0. 0,0,0,0 (3, 3, 8). /clock/: 0, 0. /: 2 errors (label_dangling), 0 warnings.
   Rulings: CR-MODULE-HSE-LOAD, CR-MODULE-PAGE-RAILS, CR-MODULE-PWR-FLAGS (no flag).

3. reset_boot - ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397
   verify.sh exit 0. 0,0,0,0 (8, 4, 17). /reset_boot/: 0, 0. /: 2 errors (label_dangling), 0 warnings. Sheet alone carries power_pin_not_driven on 3V3_D and GND, cleared by the stub flags.
   Rulings: CR-MODULE-SUPERVISOR-SYMBOL, CR-MODULE-PAGE-RAILS, CR-MODULE-PWR-FLAGS (no flag).

4. swd - 486923651c80caf44123005ed47fcb5a756c128674a052a4f99727a96b8cfef8
   verify.sh exit 0. 0,0,0,0 (6, 8, 15). /swd/: 0, 0. /: 3 errors (label_dangling), 0 warnings.
   Rulings: CR-MODULE-SWD-HEADER, CR-MODULE-PAGE-RAILS, CR-MODULE-PWR-FLAGS (no flag).

5. usb_dfu - 80947ededbb593f37bd87d6e838d232557dfc07c6f6d147ac6257cca5f5a299f
   verify.sh exit 0. 0,0,0,0 (7, 11, 33). /usb_dfu/: 0, 0. /: 0 errors, 5 warnings (isolated_pin_label 4, lib_symbol_mismatch 1).
   Rulings: CR-MODULE-USB-ESD, CR-MODULE-USB-C-PINS, CR-MODULE-PAGE-RAILS, CR-MODULE-PWR-FLAGS (no flag; ERC reports no power input on DFU_VBUS, so no private flag). Drawing choice: DFU_USB_DM/DP take the DFU family's blue by copperhead's own family rule.
   Observation: 2 true crossings, both recorded with their cause in RECORD.md (J4 and U6 order D+/D- oppositely; the CC rows are enclosed by VBUS, U6 and the D lines, so GND enters across VBUS once from a row along the top).

6. id_strap - 7649af4311431f60b159a7d6717c26d136ed3311182f3d5330f11a44eba6cf09
   verify.sh exit 0. 0,0,0,0 (3, 3, 6). /id_strap/: 0, 0. /: 1 error (label_dangling), 0 warnings.
   Rulings: CR-MODULE-ID-STRAP-VALUES, CR-MODULE-ID-STRAP-PIN, CR-MODULE-PAGE-RAILS, CR-MODULE-PWR-FLAGS (no flag).

7. qspi - a9578cf6b8bc881ce1cd57d98c862a80241e772c9e7e687195b897e33ca23ea1
   verify.sh EXIT 1. Model comparison 0,0,0,0 (3, 8, 12).
   /qspi/: 1 error, pin_not_driven, "Input pin not driven by any Output pins", "Symbol U4 Pin 6 [CLK, Input, Line]". /: 1 error (label_dangling), 11 warnings.
   Cause, measured: U4's CLK is the only pin on FLASH_CLK on this page; its driver is U1 PF10 on the mcu page (module-pins.ts:73). The one-block root holds no MCU. Under a scratch root holding this page and the mcu draft (hierarchical-label op-list applied, stub flags on 3V3_D, GND, VREF_A, VSSA), /qspi/ reports 0 errors, 0 warnings. The draft carries the same error. /CS has R10 (passive) on its net; IO0-IO3 are bidirectional; so only CLK is reported.
   Treatment: the page is committed and recorded with this finding at the top of its RECORD.md section, the page-table row says verify.sh exits 1 and awaits a controller ruling. I did NOT change one-block-root.ts, verify.sh or the flag table; a PWR_FLAG on FLASH_CLK would be wrong (not a power net). I judged this not an electrical fault of the page (the model comparison is 0 and the error disappears once the driver is present), so I did not withhold it; the controller may rule otherwise.
   Rulings: CR-MODULE-PAGE-RAILS, CR-MODULE-PWR-FLAGS (no flag). Drawing choice: the 5 undrawn FLASH nets keep the default stroke that the draft gives FLASH_NCS.

No new controller rulings were written to decisions.md. No net was added to pwr-flag-homes.ts (no page needed a shared-net flag the table lacks). No private PWR_FLAG was placed on any of the seven pages.

HOW THE REPAIR IS BUILT
- Shared tools under drafted/h7-platform/h7-module/repair/tools/: page.py (place_ops, Wiring with its refusals, field helpers), place.py, text_edits.py, ports.ts (each block's ports from drawingPages()).
- Per block: <block>/layout.py and <block>/02-wire.py, plus the generated ports.json, net_strokes.json, 01-place.json, pins.json, 02-wire.json, 02-wire.nets.json, 04-hierarchical-labels.json (all regenerated and compared by the replay).
- replay.sh gains repair_block(), called once per block; REPLAY.md lists the end sha256s and the new files. RECORD.md gains "How the Task 7b pages are repaired" and one section per page (rulings, before/after measurements, observations), plus sheet-table and page-table rows.
- Two behaviours found while drawing, now in the shared tools: KiCad 10.0.5's Crystal_GND24 stacks pins 2 and 4 at one point (Wiring counts a stacked point as one connection for junctions); a field's left/right justification renders mirrored on a part at rotation 90 or 180 (text_edits.py swaps it). The Wiring net check caught R10's pins the wrong way round on qspi before any op-list was applied.

COMMITS (all pushed to origin feature/digital-pedal-platform)
- b0d3c00 h7 module: repair the interface page (Task 7b)
- e7404b4 h7 module: repair the clock page (Task 7b)
- 2b7dde8 h7 module: repair the reset_boot page (Task 7b)
- 056ea0d h7 module: repair the swd page (Task 7b)
- 58267d6 h7 module: repair the usb_dfu page (Task 7b)
- 115b170 h7 module: repair the id_strap page (Task 7b)
- 1a2078f h7 module: repair the qspi page (Task 7b); verify.sh fails on U4 CLK

END CHECKS (run after the last commit)
- power page: 906f454928df01a8c32826a277f041e2a3151fef8ac69a967f14f7abf8b7875f drafted/h7-platform/h7-module/power.kicad_sch (unchanged)
- carrier page: c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8 drafted/h7-platform/h7-carrier/h7-carrier.generated-do-not-edit.kicad_sch (the brief's name for it, h7-carrier.kicad_sch, is not the file's name; the sha256 matches)
- erc-control.sh: exit 0, "erc-control.sh: every control came out as stated" (controls 1, 2, 3-7, 8, 9 each as stated)
- replay.sh into a new empty directory: exit 0; every draft sha256 matched; "after 01 to 05" reached power 906f4549..., interface 0cfb3dac..., clock 83f751b2..., reset_boot ca60cfca..., swd 48692365..., usb_dfu 80947ede..., id_strap 7649af43..., qspi a9578cf6...; each byte-identical to the committed sheet; sym-lib-table matches
- bun run typecheck: exit 0 ($ tsc --noEmit, no output)
- bun test tests/circuits/h7-module.test.ts tests/circuits/drafted-kicad-round-trip.test.ts tests/circuits/h7-carrier.test.ts: 59 pass, 0 fail, 318 expect() calls, 3 files
- PEDALS_REPO=... verify.sh (port execution): exit 0, 17 PASS lines
- verify.sh per page: interface 0, clock 0, reset_boot 0, swd 0, usb_dfu 0, id_strap 0, qspi 1 (as above)

CONCERNS
1. qspi fails verify.sh on a harness artifact (above). Options for the controller, none taken: (a) give one-block-root.ts a declared table of nets whose driver is on another page, with a stand-in driver pin on that stub, as it already does for PWR_FLAGs; (b) check such a page under a root that also holds the driving page; (c) accept the page on the root ERC in Step 4. Not checked: whether pages still to come (vdda, sdram, decoupling, mcu) hit the same case.
2. The brief names the carrier page h7-carrier.kicad_sch; the file on disk is h7-carrier.generated-do-not-edit.kicad_sch. Its sha256 is the expected one.
3. Pages usb_dfu (two crossings, a long GND row along the top) and interface (35 one-pad labels) are reported as observations only; I make no judgement of any page.
