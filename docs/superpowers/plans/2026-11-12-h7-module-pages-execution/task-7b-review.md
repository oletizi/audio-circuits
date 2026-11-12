Task 7b review: e54ac07..1a2078f (interface, clock, reset_boot, swd, usb_dfu, id_strap, qspi)

### Spec Compliance

- ❌ Issues found: one false figure in RECORD.md's interface section (I1 below). Everything else the brief's Step 3 asks of these seven pages is present and checks out:
  - each page repaired with akcli, op-lists and scripts committed under `repair/<block>/` and `repair/tools/` (TOOLING.md step 5.5);
  - 0 disagreements against the block model on every page (componentIdentity, netMembership, pinIdentity, values all 0);
  - 0 ERC errors on `/<block>/` under the one-block root on six pages. qspi's single `pin_not_driven` on U4 CLK is the already-ruled one-block-root artifact, and RECORD.md records it honestly at :41 and :632-644;
  - an SVG render committed beside each page;
  - every page marked UNREVIEWED.
- ⚠️ Cannot verify from the diff:
  - Step 3's "send the render to the owner with a question and nothing else". The report says nothing was sent. The controller should confirm who sends them.
  - RECORD.md:41 and :632 say "the controller has not yet ruled". Both go stale once the separate tooling fix lands, and must be updated with it.

### Checks run (by this reviewer)

- `verify.sh` on each committed page: interface, clock, reset_boot, swd, usb_dfu and id_strap exit 0; qspi exits 1. The qspi failure is at ERC under the one-block root, `/qspi/` 1 error, `pin_not_driven` on "Symbol U4 Pin 6 [CLK, Input, Line]", which is the ruled artifact. Every per-page figure in RECORD.md (ERC on the sheet alone, `/` and `/<block>/`, crossings, junctions, labels, paper fit, symbols, pins, wires, corners) matches this run.
- `replay.sh` into a new scratch directory: every draft sha256 matched, and every generated `ports.json`, `net_strokes.json`, `01-place.json`, `pins.json`, `02-wire.json`, `02-wire.nets.json` and `04-hierarchical-labels.json` matched its committed copy. It reached each end sha256 (interface 0cfb3dac, clock 83f751b2, reset_boot ca60cfca, swd 48692365, usb_dfu 80947ede, id_strap 7649af43, qspi a9578cf6; power 906f4549 unchanged), each byte-identical to the committed sheet, and the sym-lib-table matched.
- `erc-control.sh`: exit 0, "every control came out as stated".
- `bun run typecheck`: clean. `bun test tests/circuits/h7-module.test.ts tests/circuits/drafted-kicad-round-trip.test.ts`: 36 pass, 0 fail.
- A port-name check of my own (named risk: per-page checks are blind to which label a one-pin pin gets; see I2). I exported each page with kicad-cli and required the net `/<port>` to contain the pins `ports.json` gives that port. Result: 61 ports across 7 pages, 0 mismatches. The check could have failed: a parse that read no nets reported 7 failures before I fixed the parser.
- Values and parts on each page against the rulings:
  - clock: C44/C45 8pF (CR-MODULE-HSE-LOAD); Y1 is a 25 MHz part (decisions.md:80).
  - reset_boot: U5 TLV803EA30DBZR on `Power_Supervisor:TPS3839DBZ` (CR-MODULE-SUPERVISOR-SYMBOL); R11 10K, R12 4.7K, C46-C48 .1uF, which match reset-boot.ts and its cited sources.
  - swd: J3 `Conn_ARM_JTAG_SWD_10`, with no-connects on 6/7/8 (CR-MODULE-SWD-HEADER).
  - usb_dfu: U6 USBLC6-2SC6, C49 .1uF (CR-MODULE-USB-ESD); R15 1M and C50 4700pF, with no-connects on A8/B8 (CR-MODULE-USB-C-PINS).
  - id_strap: R16 20K, R17 2.49K, C51 .1uF (CR-MODULE-ID-STRAP-VALUES).
  - qspi: R10 10K, C43 .1uF, U4 W25Q128JVSIQ, matching qspi.ts and CORE-23.
  - No disagreement found.
- Crystal_GND24 stacking checked against the library on disk: pins 2 and 4 are both at (0, -5.08) in Device.kicad_sym, so the single case drop on clock is sound.
- Commits: none of the seven carries AI attribution. The working tree is clean apart from an untracked `repair/tools/cross-page-drivers.ts`, which belongs to the controller's separate fix and was not reviewed.

### Strengths

- The shared tools make each block's directory hold only placement and wiring: `tools/page.py`, `place.py` and `text_edits.py`, with per-block `layout.py` and `02-wire.py`. Each Task 7b block replays through one `repair_block` function (replay.sh:140-175), with every generated file compared before it is applied.
- `Wiring` refuses things at the point of drawing, before any op-list is applied: a non-axis-aligned or zero-length segment, an end inside another segment, a pin on a wire interior, and a wire end on another net's pin. The report says the last of these caught R10 reversed on qspi before anything was applied.
- The two KiCad behaviours are found, written down where they bite, and handled in code: Crystal_GND24's stacked case pins (page.py:148-151) and the mirrored justification on rotated parts (text_edits.py:109-112).
- The qspi exception is handled honestly. The page is not hidden, the harness is not edited to make it pass, the cause is measured, and the failing check is stated at the top of the section and in the page table.
- Per-block scripts carry small guards that name what is wrong (for example usb_dfu/02-wire.py:30-32 and :55-56, swd/02-wire.py:24-25, id_strap/02-wire.py:20-21).

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

**I1. RECORD.md:290 and RECORD.md:298 state false counts for the interface block.**
- What is wrong:
  - :290 reads "36 ports: GND on J1.20 and J2.20, and 35 that each reach one pad".
  - :298 reads "The stroke of the 35 nets the draft drew no wire for".
  - Measured: `repair/interface/ports.json` holds 35 ports. One is GND, with 2 pins; 34 reach one pad. The page has 35 hierarchical labels, and RECORD's own table says "35 of 39 (every port; the 4 others are J1's no-connect pads)". So `UNDRAWN_STROKES` covers 34 nets, not 35.
  - The implementer's report repeats "the 35 undrawn nets".
- Failure scenario: the owner, or the Step 4 reviewer, reconciles the section against its own measurement table and finds 36 ports against 35 labels. They then either suspect a missing label on the page or stop trusting the section. CLAUDE.md treats a figure in prose as the thing that goes wrong, and the section is the record bound to this page's sha256.
- Fix: :290 should read "35 ports: GND on J1.20 and J2.20, and 34 that each reach one pad". :298 should read "34 nets".

**I2. Every per-page check is blind to which port label sits on a one-pin port's wire. The shared `Wiring` does not check it either.**
- Where:
  - `repair/tools/page.py:169-175` checks only that each label is on exactly one wire end and that there is one label per port. It never compares the label's name with the net of the segment ending at that point.
  - `repair/tools/block-netcompare.ts:46-47` says outright that net names are "reported, never failed on".
  - `hierarchical-labels.ts check` counts labels per port. It does not check pins.
- Why it matters: a port reaching one pin is a one-member net, so swapping two such labels leaves membership identical and verify.sh still reports 0,0,0,0. This covers 34 of 35 ports on interface, 5 of 8 on qspi, 2 of 3 on usb_dfu and 1 of 3 on id_strap, and the mcu and sdram pages to come will rely on it more.
- The pages committed here are right: I checked all 61 ports by export, with 0 mismatches. The tooling would not have caught it if they were wrong.
- Failure scenario: on the sdram page an op swaps two adjacent address labels in `02-wire.py`. `Wiring` accepts it, verify.sh exits 0, and RECORD records "0, 0, 0, 0". The error surfaces only if Step 4's root export compares cross-page membership, after the page has been sent to the owner.
- Fix: in `Wiring.op_list`, for each label, find the segment or segments with an end at `at` and refuse unless their net equals the label's name. The data is already in `self.segments`, so this is a few lines. Optionally, also make `block-netcompare.ts` fail when a port's `/name` net lacks the port's pins.

#### Minor (Nice to Have)

**M1. RECORD.md:531/:533 (usb_dfu) and :669/:671 (qspi) show a `lib_symbol_mismatch` warning in the page column and not in the draft column, with no explanation.**
- I measured where it comes from. The drafts were measured beside copperhead's vendored `sym-lib-cache`. When the drafts are copied beside the committed `sym-lib-table`, each reports the same warning (U6 `USBLC6-2SC6` and U4 `W25Q128JVS`, both `extends` symbols). So the repair did not introduce it; the two columns were measured in different library contexts.
- Failure scenario: a reader concludes the repair altered U6's or U4's embedded symbol. The power section (:211) and the carrier's RECORD explain this same warning, but these two sections do not.
- Fix: add one sentence to each of the two sections.

**M2. RECORD.md:638-644 and :672 cite a scratch-root ERC run ("/qspi/ 0 errors, 0 warnings") that nothing committed can re-run.**
- No script or op-list for that scratch root is in `repair/`. CLAUDE.md asks that a measurement live in a tool that re-runs it.
- Failure scenario: the controller's pending fix changes the root, and nobody can reproduce the evidence the qspi exception rested on.
- Fix: likely superseded by the controller's fix. When it lands, replace the paragraph with a reference to the committed check.

**M3. `repair/tools/text_edits.py:93` reads `layout.PWR_FLAGS`, but `page.load_layout` (`page.py:42`) does not require it.**
- Failure scenario: a later block's `layout.py` omits it, and the run stops with an `AttributeError` traceback instead of `load_layout`'s named refusal.
- Fix: add `PWR_FLAGS` to the tuple at page.py:42.

### Assessment

**Spec compliance:** Issues found (I1).

**Task quality:** Needs fixes.

**Reasoning:** The seven pages agree with the model, reach 0 ERC errors on their own sheets under the one-block root (qspi's single error is the ruled artifact), and replay byte-for-byte from committed op-lists and scripts. What needs fixing is a false count in the interface record (I1) and a refusal gap in the shared wiring tool that leaves one-pin port labels unchecked by any per-page check (I2). I2 matters most for the mcu and sdram pages still to come.
