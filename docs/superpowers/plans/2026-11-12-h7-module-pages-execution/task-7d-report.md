Task 7d report: the mcu page (brief Step 3, last block)

STATUS: BLOCKED ON ONE ERC ERROR, awaiting a controller ruling. The page is repaired, committed and pushed, with 0 model disagreements. verify.sh exits 1 on it.

Page
- drafted/h7-platform/h7-module/mcu.kicad_sch, sha256 c3d780a2ec08d385c4fe777c288f851f3c8803754cf995c6cb6f1da49539f981
- SVG: drafted/h7-platform/h7-module/mcu.svg
- PNG (150 dpi): /private/tmp/claude-501/-Users-orion-work-audio-circuits-work-digital-pedal-platform/c729a991-f777-4832-b741-bdd4bc3b0883/scratchpad/t7d/render/mcu.png
- Repair: drafted/h7-platform/h7-module/repair/mcu/ (layout.py, 02-wire.py, and the generated ports.json, net_strokes.json, 01-place.json, pins.json, 02-wire.json, 02-wire.nets.json, 04-hierarchical-labels.json). replay.sh runs it through repair_block. Each op-list went through `akcli plan` (dry run) and then `akcli draw --apply`.
- RECORD.md has a section for mcu ("mcu: the STM32H743 (Task 7d)"), status UNREVIEWED, and rows in both tables. REPLAY.md has the end sha256.

verify.sh outcome: EXIT 1
- Model comparison: componentIdentity 0, netMembership 0, pinIdentity 0, values 0. 0 of 90 ports are on the wrong net. Export: 1 component, 147 nets, 176 net members.
- Under the one-block root, /mcu/ has 1 error and 1 warning:
  - error, `pin_to_pin`: "Pins of type Power output and Power output are connected", between "Symbol U1 Pin 81 [VCAP, Power output, Line]" and "Symbol U1 Pin 125 [VCAP, Power output, Line]".
  - warning, `ground_pin_not_ground`: on VSSA, pin 37.
- The root / has 1 error: `label_dangling` on VCAP's stub.
- The cause: the stock symbol MCU_ST_STM32H7:STM32H743IITx types both VCAP pins power_out, and the model joins them on VCAP (circuits/h7-platform/module/mcu.ts:37, "VCAP1 pin 81 joined to VCAP2 pin 125", processor-and-memory.md:136, CORE-04).
- The draft carries the same error, both alone and under the one-block root. No wiring on the page can remove it.
- I did not change the model, the symbol or the ERC settings. The real root will carry this error too.
- Options for the ruling. None of them was tried.
  - (a) A project ERC exclusion for this one violation, in the root's .kicad_pro, with a declared table that verify.sh honours.
  - (b) A C4 project symbol that types the VCAP pins differently. This changes the model's symbol.
  - (c) A project pin map that allows power_out to power_out. This applies to every net.

Driver-table entries added (ruling CR-MODULE-CROSS-PAGE-DRIVERS), committed separately in 33ba10c
- Before these entries, ERC under the one-block root reported `pin_not_driven` on U1 pin 31 (NRST) and U1 pin 166 (BOOT0).
- NRST -> reset_boot, U5 pin 2, "~{RESET}". This is the open-drain output (reset-boot.ts:27). The symbol is TPS3839DBZ, which types pin 2 as output.
- BOOT0 -> reset_boot, SW2 pin 1, the BOOT button (reset-boot.ts:35).
  - R12, the pull-down, cannot be named in the table. The table's model check needs a symbol pin number, and the model keys a resistor's pins a/b.
  - Either pin is passive, and either serves the stand-in.
- Both entries pass the model check.
- Their effect on other pages: swd now gets a stand-in on NRST, and decoupling gets one on BOOT0. Both still verify at 0/0 on their sheets.
- I added no PWR_FLAG table entry, because ERC needed none. U1 drives FLASH_CLK and the 22 SDRAM nets, and those entries already name mcu as the driving block, so the mcu root places no stand-in for them.

NC pins
- All 57 noConnect pins in the intent carry a no-connect, and none of them is on a net.

Paper fit, as measurements
- US Letter landscape inner frame: x 11.980 to 267.377 mm, y 11.980 to 203.877 mm.
- At rotation 0, U1 alone is 231.14 mm tall, pin end to pin end. The sheet itself is 215.9 mm tall.
  - I built a rotation-0 layout in scratch. It overshoots the frame south by 72.983 mm. The draft overshoots by 61.553 mm.
  - Part of the symbol lies off the paper, so a render cuts off part of the symbol.
- I therefore placed U1 at rotation 90.
  - Content extent: x 13.97 to 265.43 mm, y 33.02 to 185.42 mm.
  - paper_fit.py: "fits: yes".
- Paper, symbol and block are unchanged.
- What rotation 90 costs: the one-pin labels and U1's side pin names and numbers read vertically.

Page measurements (draft -> page)
- True crossings: 1 -> 1. The page's crossing is VREF_A over 3V3_D. It is topologically forced: around the body the pins come 3V3_D, VREF_A, 3V3_D, VREF_A.
- T-meetings: 120 -> 0.
- Orphan junctions: 0 of 1 -> 0 of 18.
- Tees without a dot: 15 -> 0. Collinear overlapping pairs: 120 -> 0.
- Labels: 5 (3 global) -> 90, all hierarchical.
- Wires: 41 -> 133. Total length: 722.63 -> 1059.18 mm.
- Corners: 4 -> 7. Junctions: 1 -> 18.

Checks at the end
- Every committed page sha256 is unchanged. Carrier c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8 is unchanged.
- verify.sh exits 0 on 11 of 12 module pages, every page except mcu. mcu exits 1, as above.
- erc-control.sh: "erc-control.sh: every control came out as stated", exit 0.
- replay.sh, run into a new empty directory: REPLAY-EXIT=0. It reached every sha256, including "the replayed mcu.kicad_sch is byte-identical to the committed sheet".
- `bun run typecheck`: clean.
- bun test, the three files: 59 pass, 0 fail.
- The pedals port verify.sh: 17 PASS.

Commits (pushed to origin/feature/digital-pedal-platform)
- 33ba10c h7 module: cross-page drivers for NRST and BOOT0 (Task 7d)
- 674a91f h7 module: repair the mcu page (Task 7d)

Concerns
1. The VCAP `pin_to_pin` needs a ruling before this page can verify, and before the root (Step 4) can reach 0 ERC errors.
2. Rotation 90 is my layout choice. The basis is a measurement: at rotation 0 the symbol is taller than the paper. The rotation-0 variant was not committed. If the owner wants it, it is one layout file away, and it will overshoot.
3. The BOOT0 entry names SW2 rather than R12, for the tool reason above. It costs one table edit if wrong, and no page bytes.
4. decisions.md's CR-MODULE-CROSS-PAGE-DRIVERS text still says the table "has one entry". That was already stale after Task 7c. I did not amend the ruling text.
