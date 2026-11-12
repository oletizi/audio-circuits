Task 7b fix round 1: report

Status: DONE. Every MUST-HOLD check was run and passed (quoted below). No page byte changed.

Commits (pushed to feature/digital-pedal-platform; no AI attribution):
- 0d614a4 h7 module: verify.sh fails a port label on the wrong net (Task 7b fix I2, M3)
- fc53373 h7 module: correct the interface port counts; explain two lib warnings (Task 7b fix I1, M1, M2)

What was done

I1. RECORD.md interface section. I took the figures from repair/interface/ports.json and the page's export, not from the review:
- ports.json: 35 ports; GND reaches J1.20 and J2.20; 34 reach one pin; 34 have drafted=false.
- export: 35 of 39 nets named /<port>. verify.sh port labels: "0 of 35 ports on the wrong net". The sheet has 35 hierarchical_label nodes.
- So ":302" now reads "35 ports: GND on J1.20 and J2.20, and 34 that each reach one pad", and ":310" reads "The stroke of the 34 nets the draft drew no wire for".
- A grep over docs/, drafted/ and .superpowers/ found no other "36 ports" or "35 undrawn". The implementer's report said "35 undrawn nets", but that phrase did not match in .superpowers/, so I left it.

I2. Ruling CR-MODULE-PORT-LABEL-CHECK. It is recorded in docs/h7-platform/decisions.md after CR-MODULE-CROSS-PAGE-DRIVERS, labelled "Controller ruling (the owner may override).", dated 2026-11-12.
- New repair/tools/port-labels.ts, checkPortLabels(block, exported):
  - Called by block-netcompare.ts after compareSheetToModel. block-netcompare.ts exits 1 on any fault.
  - For every port in drawingPages()'s page.ports, the importNetlist export must have a net "/<port>" whose sorted pins equal port.pins.
  - A missing net is reported along with the net the port's pins are actually on.
  - Net names come only from the kicad-cli export. A label NAME on a sheet exported alone names its net "/NAME" (measured on qspi: /FLASH_CLK and the others).
  - Private nets are labelled by their unprefixed model name (TOOLING.md "Multi-page drawing"). drawingPagesFromNetwork's checkPrivateTexts refuses a private text equal to a port name, so "/<port>" cannot be a private net.
  - The comment that "net names are reported, never failed on" now applies to private nets only.
- page.py Wiring.op_list now refuses a label whose wire end belongs to a segment drawn for another net. replay.sh exercises it on all seven 7b blocks, and every op-list still matches.
- verify.sh's failure text and header name the port-label check.
- Controls are in new repair/tools/port-label-control.sh. erc-control.sh calls it as control 13; controls 1-12 are unchanged.
  - P1, positive: all eight pages verify, each "port labels: 0 of N".
  - P2, negative: interface copy with LED1 and LED2 swapped.
  - P3, negative: qspi copy with the FLASH_IO1 label deleted.
  - P4, negative: Wiring.op_list on a synthetic two-port case with the labels swapped.
  - The copies are made by new repair/tools/label_tamper.py. It parses by parenthesis depth, honours quoted strings, refuses a name the sheet does not carry exactly once, and re-checks the depth after editing. It works on scratch copies only.
- REPLAY.md's tool table lists port-labels.ts, port-label-control.sh and label_tamper.py.
- RECORD.md's common section now notes the check.

M1. RECORD.md usb_dfu and qspi sections each gained a paragraph on the lib_symbol_mismatch warning. I measured it myself:
- Each draft (usb_dfu 8961061e..., qspi 1cde054c...) copied beside the committed sym-lib-table reports one lib_symbol_mismatch: "Symbol U6 [USBLC6-2SC6]" and "Symbol U4 [W25Q128JVS]".
- In place, beside build/draw's sym-lib-table, which maps Power_Protection and Memory_Flash to copperhead's sym-lib-cache, each reports 0.

M2. RECORD.md qspi section:
- The scratch-root ERC run is now cited as a one-time measurement that nothing committed re-runs.
- The evidence it rested on now points to erc-control.sh controls 10 and 11.
- The table row "ERC under a scratch root holding the mcu draft and this page" is removed.
- decisions.md CR-MODULE-CROSS-PAGE-DRIVERS still mentions that run in its "Why". I left that alone, since it is the ruling's own record.

M3. page.load_layout now requires PWR_FLAGS. All seven 7b layout.py files define it; power uses its own scripts, not load_layout.

Qspi "controller has not ruled" lines: commit 27bc5a0 had already updated them. RECORD.md no longer says this, so I left it.

Checks, quoted
- sha256, after the fix:
  - clock 83f751b2...
  - id_strap 7649af43...
  - interface 0cfb3dac...
  - power 906f4549...
  - qspi a9578cf6...
  - reset_boot ca60cfca...
  - swd 48692365...
  - usb_dfu 80947ede...
  - carrier c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8.
  - All unchanged.
- verify.sh exits 0 on all eight pages. Port labels:
  - power 0 of 3
  - interface 0 of 35
  - clock 0 of 3
  - reset_boot 0 of 4
  - swd 0 of 5
  - usb_dfu 0 of 3
  - id_strap 0 of 3
  - qspi 0 of 8
- erc-control.sh: rc=0, "erc-control.sh: every control came out as stated", including "port-label-control.sh: every control came out as stated".
- replay.sh into a new scratch directory:
  - rc=0, and every generated file "matches the committed copy";
  - each of the eight sheets reports "is byte-identical to the committed sheet";
  - the sym-lib-table matches.
- bun run typecheck: clean.
- bun test (h7-module, drafted-kicad-round-trip, h7-carrier): 59 pass, 0 fail.
- Pedals verify.sh: 17 PASS, rc=0.

Negative controls' failure messages, verbatim
- Interface, LED1 and LED2 swapped:
    port LED1: expected pins J1.5 on net "/LED1"; found J1.4
    port LED2: expected pins J1.4 on net "/LED2"; found J1.5
    verify.sh: FAILED - the netlist export disagrees with the model on a component, a net, a pin, a value or a port's label (listed above)
- Qspi, FLASH_IO1 label deleted:
    port FLASH_IO1: expected pins U4.2 on net "/FLASH_IO1"; found no net named "/FLASH_IO1" - its pins are on net "unconnected-(U4-DO{slash}IO_{1}-Pad2)" (U4.2)
    verify.sh: FAILED - the netlist export disagrees with the model on a component, a net, a pin, a value or a port's label (listed above)
- Generation (P4): wire: label B at (500, 0) sits on the end of a wire drawn for ['A']; a port's label must sit on a wire drawn for that port's net

Concerns
- The new check compares a block sheet exported alone. A label that is right on its page but bound to the wrong parent net on the real root is still the root export's job (Step 4).
- erc-control.sh now runs verify.sh on all eight pages in control 13, on top of the runs it already made, so it takes longer.
- The step-3 question to the owner about who sends the renders is still open, as the review noted. It is not in this round's scope.
