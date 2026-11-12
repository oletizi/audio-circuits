Task 7b re-review 1: 1a2078f..fc53373

Finding verdicts

- I1 (false port counts, interface): ADDRESSED. RECORD.md:309 now reads "35 ports: GND on J1.20 and J2.20, and 34 that each reach one pad"; :317 reads "34 nets". Matches ports.json, the 35 labels at :335, and the committed page.
- I2 (one-pin port labels unchecked): ADDRESSED. Two layers. (a) port-labels.ts:34-58 takes each port's name and pins from drawingPages() and requires the kicad-cli export (importNetlist, nets already sorted at netlist.ts:101) to hold a net `/<port>` with exactly those pins. Nets come from the export, not from line patterns. It is called from block-netcompare.ts and fails the exit code (:68). (b) page.py Wiring.op_list refuses a label whose wire end belongs to another net's segment. Controls could fail: erc-control.sh control 13 ran swap (LED1/LED2), delete (FLASH_IO1) and a synthetic generation case, and each failed with the named message. label_tamper.py refuses a name not present exactly once, so a control cannot pass for want of its target.
- M1 (unexplained lib_symbol_mismatch, usb_dfu and qspi): ADDRESSED. RECORD.md:567 and :727 explain the column difference.
- M2 (uncommitted scratch-root ERC claim): ADDRESSED. RECORD.md:678 now calls it a one-time measurement and points to controls 10 and 11, which re-run.
- M3 (PWR_FLAGS not required by load_layout): ADDRESSED. page.py:42 requires it; all seven layout.py files define it.

Review of 27bc5a0 (CR-MODULE-CROSS-PAGE-DRIVERS) as new work

- Table against the model: cross-page-drivers.ts:162-175 checks each entry against h7Module(). It checks that the block exists, that the designator maps to exactly one component, that the component is in that block, that the pin exists and is on the entry's net, that the block has a port on the net, and that the KiCad pin name matches the installed symbol. It also refuses a duplicate net. FLASH_CLK to mcu U1 pin 28 PF10 passes. Control 12 (pin 29, on HSE_IN) is refused with the message naming the pin and the net.
- Stand-in mechanism: one-block-root.ts places Connector:TestPoint as #DRV<n> at the stub label, and refuses unless exactly one stub label carries the net. The implementer's measurement table is internally consistent: the baseline has 1 error, a typed sheet pin does not drive, and the TestPoint gives 0 errors and 0 warnings. I re-ran the qspi path through erc-control.sh, which printed `/qspi/: errors 0, warnings 0` and "stand-in drivers on FLASH_CLK (for mcu U1 PF10)".
- Controls 10, 11 and 12: each can fail.
  - Control 10 requires 0 and 0 plus the stand-in text in the log.
  - Control 11 requires the TEST OVERRIDE announcement and a failure naming U4 Pin 6 CLK.
  - Control 12 requires a refusal naming U1 pin 29.
  - All three passed in my run.
- Stand-in limits: a passive stand-in cannot raise a pin_to_pin type conflict with the real driver. The ruling and RECORD.md put that on the real root (step 4). It is disclosed, not a defect.

Checks run

- `sh erc-control.sh`: exit 0, "every control came out as stated", controls 1-13 and P1-P4.
- `bun run typecheck`: clean.
- `bun test tests/circuits/h7-module.test.ts tests/circuits/drafted-kicad-round-trip.test.ts`: 36 pass, 0 fail.
- shasum -a 256 of the eight module sheets all equal the RECORD.md sha256 for that sheet (power 906f4549, interface 0cfb3dac, clock 83f751b2, reset_boot ca60cfca, swd 48692365, usb_dfu 80947ede, id_strap 7649af43, qspi a9578cf6). No sheet byte changed in the range.
- File sizes: no tool file over 500 lines (largest ts is cross-page-drivers.ts at 183, page.py at 219). RECORD.md (749) and decisions.md (1657) are documents. A grep of the .ts tools found no `any` and no `as` casts; the only `as` hits are in comments and strings.
- 847f4d2 (owner verdicts): accurate.
  - verdicts.md records "approved. proceed" verbatim for the six pages with sha256s equal to the committed sheets, and the cited commits are each page's last commit.
  - It states qspi was withheld and not covered.
  - RECORD.md flips exactly those six rows and status lines and leaves qspi UNREVIEWED.

New findings

- Minor, cross-page-drivers.ts:84-90 and erc-control.sh. The H7_CROSS_PAGE_DRIVERS_TABLE override can pass an ordinary verify run with a substituted table. A model-valid table such as `[]` removes the stand-in for any block, but only qspi currently needs one. The override is announced on stderr, which control 11 shows reaches the verify log. But verify.sh's closing verdict and exit code do not mention it, and nothing refuses it outside erc-control.sh. Suggest verify.sh print a closing line (or fail) when the variable is set.
- Minor, cross-page-drivers.ts:76. KICAD_CLI is a hard-coded macOS path, duplicated from the shell scripts. It throws on a machine without the install, which is a refusal rather than a skip, so it is not a fallback. The implementer disclosed it.
- Minor, port-labels.ts:20 and :36. It trusts drawingPages() to name the block's ports and pins. A port the page model omits would go unchecked, but compareSheetToModel and hierarchical-labels.ts check labels per port, so this is covered elsewhere. Observation only.

Out-of-scope observations

None.

Verdict

Approved. I1, I2, M1, M2 and M3 are addressed, 27bc5a0 holds up, and the three new items are Minor and non-blocking. No Critical or Important issue.
