Task 7d review: the mcu page and ruling CR-MODULE-VCAP-ERC
Range 03caf6f..f986afa. Reviewer: task reviewer, read-only. No tracked file was changed.

### Spec Compliance

- ✅ Spec compliant. Brief Step 3 applied to mcu has every required part:
  - the repair with akcli, with its op-lists under `repair/mcu/`;
  - 0 model disagreements and 0 unexcused ERC errors under the one-block root;
  - a render, `mcu.svg`;
  - a RECORD section, with the measurement set before and after the repair.
- The VCAP allowance matches the ruling as written in `docs/h7-platform/decisions.md` (CR-MODULE-VCAP-ERC):
  - one entry;
  - sheet `/mcu/`, type `pin_to_pin`, between U1 pins 81 and 125;
  - held to the model;
  - named in the closing output.
- ⚠️ Cannot verify from the diff: whether the render was sent to the owner with a question and nothing else (Step 3, last bullet). `docs/schematic/verdicts.md` says the mcu page "has not been shown", and RECORD gives it UNREVIEWED. The controller should confirm that sending the page is still pending.
- Controller commits:
  - c8778ec adds only the verdicts.md entry.
  - f986afa changes only 16 lines of RECORD.md.
  - Both are accurate:
    - The four sha256 in the verdicts entry match the files on disk: qspi a9578cf6…, vdda 7f066a9a…, sdram 0812ab02…, decoupling 8d20ff51….
    - The four commits it cites are the commits that added those sheets: 1a2078f qspi, 2245ac7 vdda, 0f06844 sdram, 03caf6f decoupling.
    - The RECORD rows and section headers now read "reviewed 2026-11-12, *"approved"*" for exactly those four pages.
    - The mcu page stays UNREVIEWED.
    - The entry does not record the word "approved" as an owner decision on CR-MODULE-VCAP-ERC, and it says so. The qspi row's citation `27bc5a0` resolves to the cross-page-drivers commit.

### Checks run

| check | result |
| --- | --- |
| `sh .../tools/verify.sh mcu .../mcu.kicad_sch` | exit 0. sha256 c3d780a2ec08d385c4fe777c288f851f3c8803754cf995c6cb6f1da49539f981. componentIdentity, netMembership, pinIdentity and values all 0. Export: 1 component, 147 nets, 176 members. 0 of 90 ports on the wrong net. `/mcu/`: errors 1 (1 excused), warnings 1. `/`: errors 1 (`label_dangling`), warnings 166. 1 true crossing. 0 T-meetings. 0 orphan junctions. Fits US Letter. The closing lines name the excused `pin_to_pin` under CR-MODULE-VCAP-ERC. |
| `bash .../repair/replay.sh <scratch>/replay-work` (read first) | REPLAY-EXIT=0, with 12 "byte-identical" lines. For mcu: the draft is f4814efe…; ports, net_strokes, 01-place, pins, 02-wire, 02-wire.nets and 04-hierarchical-labels each match the committed copy; all three akcli applies report APPLIED; the hierarchical-label post-condition holds; the end sha256 is c3d780a2…, byte-identical to the committed sheet. The sym-lib-table matches. `git status` was clean afterwards. |
| `sh .../tools/erc-control.sh` | exit 0, "every control came out as stated". Controls 14 to 17 all came out as stated (detail below). |
| `bun run typecheck` | clean (tsc printed nothing) |
| `bun test tests/circuits/h7-module.test.ts tests/circuits/drafted-kicad-round-trip.test.ts` | 36 pass, 0 fail |
| `verify.sh` on swd and decoupling (focused check of the new driver entries' effect) | both exit 0. swd gets a stand-in on NRST; decoupling gets one on BOOT0. Each sheet is at 0 errors and 0 warnings. |
| draft ERC alone, `build/draw/h7-module/mcu/mcu.kicad_sch` (focused check of RECORD's draft column) | 93 errors (`pin_not_connected` 86, `pin_not_driven` 2, `pin_to_pin` 1, `power_pin_not_driven` 4) and 1 warning. This matches RECORD. |

### Connectivity against the model

I wrote a script, `nc-check.ts` in the scratchpad. It parses the `kicad-cli` netlist export of the committed sheet and compares it with `mcuPinPlan()`:
- 147 nets and 176 pins in the export. No pin appears twice.
- Each of the 176 positions is on its model net: 0 mismatches.
- 57 positions are NC in the plan. For each one, all of these hold:
  - its exported net is `unconnected-(U1-…)` with exactly one member;
  - ST's pin data types it `I/O`;
  - its source is the CORE-27 rule (`circuits/h7-platform/module/mcu.ts:56`).
- The sheet holds exactly 57 `(no_connect` items.
- ERC under the one-block root reports no `pin_not_connected` on `/mcu/`, so every unconnected pin carries a marker. It reports no `no_connect_connected` and no `no_connect_dangling`, so no marker sits on a connected pin or off a pin.

### ERC under the one-block root

**The allowance excuses only an exact match** (`erc_sheets.py:60-70`). It excuses a violation only when all of these hold:
- the severity is error;
- the path is equal and the type is equal;
- the violation has exactly two items, and every item parses as `^Symbol (\S+) Pin (\S+) \[`;
- the sorted (designator, pin) pairs equal the allowance's.

An item that does not parse makes the violation unexcusable, so it fails loudly. `erc-allowances.ts` limits the sheet to `/<block>/` (`checkErcAllowances`), so an allowance can never apply to the root `/`.

**Could each control fail? Yes:**
- 14 (positive) fails if verify.sh fails, or if the exact closing line is missing.
- 15 (negative) fails if the run passes with the allowance removed, if the override is not announced, or if the failure is not `/mcu/`'s `pin_to_pin`.
- 16 (negative) fails if the run passes, or if the refusal does not name U1 pin 126 as off VCAP.
- 17 (synthetic) runs six cases:
  - `exact`, with the items in reverse order, which exercises the sort;
  - `other-pins`, `other-type`, `third-item` and `other-sheet`. In each of these a matcher that ignored that dimension would excuse the violation, exit 0 and trip the control;
  - `stale`, which requires the stale line.

The gaps are in Minor M3.

**The 166 warnings on `/`: one type, and no defect hidden.** All 166 are `isolated_pin_label` ("Label connected to only one pin"). They are 83 nets counted twice:
- 83 items are `Label '<net>'`, the root stub's local label.
- 83 items are `Hierarchical Label '<net>'`, the mcu page's own hierarchical label. KiCad files these under `/`.

I checked set equality against `repair/mcu/ports.json`:
- Both sets of 83 names are exactly the 86 one-pin ports, less three.
- The three are NRST and BOOT0, which carry the stand-in's pin, and VSSA, which carries the stub's PWR_FLAG.

So each warning says only that, under a root holding one block, the net's single pin is U1's. That is a property of the one-block root. It goes away at the real root, where the other pages supply the net's other members. The port-label check already holds each of these labels to its pin: 0 of 90 on the wrong net.

The one `/` error is `label_dangling` on the root's local label `VCAP`. VCAP has two pins on the page, so KiCad does not raise `isolated_pin_label` for it. Its stub carries no flag and no stand-in, so on the root's own subgraph the label meets nothing. This is the same root-only pattern as FLASH_NCS on qspi.

### NRST and BOOT0 entries (`repair/tools/cross-page-drivers.ts`, the Task 7d entries)

- **NRST -> reset_boot, U5 pin 2: correct.**
  - The model has `u_sup` pin 2 on NRST (`circuits/h7-platform/module/reset-boot.ts:27`).
  - DESIGNATORS gives U5 (`module-board.ts:101`).
  - The installed `Power_Supervisor:TPS3839DBZ` types pin 2 `output`, name `~{RESET}`.
  - The model check passed at runtime.
- **BOOT0 -> reset_boot, SW2 pin 1: correct, and the choice is sound.**
  - The model has `sw_boot` from BOOT0 to 3V3_D (`reset-boot.ts:35`).
  - DESIGNATORS gives SW2 (`module-board.ts:103`).
  - The claim that R12 cannot be named is true. `r_boot0_pulldown` is a two-terminal passive keyed `a`/`b` (`reset-boot.ts:33`). The table's check looks the entry's pin number up among the model's pin keys, and requires that number to name a pin on the installed symbol.
- What the table needs from a driver:
  - At the one-block root, the stand-in is a passive TestPoint. Which reset_boot pin the entry names makes no difference to what ERC sees there.
  - Step 4's obligation is that the named pin is on BOOT0 in the root's export. SW2 pin 1 is.
- Electrically, R12 holds BOOT0's resting state and SW2 forces it high. Both are passive, so neither is a "driver" in KiCad's sense, and naming either one is equally truthful.
- An observation, not a finding: the entry's source calls U5 "open drain", while the stand-in symbol types pin 2 as push-pull `output`. CR-MODULE-SUPERVISOR-SYMBOL already rules on this, and the gap makes no ERC difference on this net.

### Strengths

- `checkErcAllowances` (`erc-allowances.ts:156-179`) holds the allowance to the model on every run:
  - the sheet maps to a block, and the designator resolves to a component of that block;
  - both pins are on the entry's net;
  - the installed symbol types both pins as stated;
  - the two pins are distinct.

  It collects every problem before refusing, and each refusal names what is missing.
- `verify.sh:87-95` repeats every excused violation and every stale allowance after "every step ran", so a pass that rests on the allowance is never silent.
- `02-wire.py` does not hard-code pin lists. It derives each pin's face and net from pins.json, the intent and ports.json, and it refuses by name when the model and the layout disagree (`expect`, and the face and ordering refusals).
- RECORD records the rotation-0 overshoot as a measurement, not as an opinion.
- The `## mcu` section's measurement table matches every figure I re-measured: the draft's ERC alone, the page's ERC alone, the `/mcu/` and `/` counts under the one-block root, the crossings, junctions, labels, paper fit and counts.

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

**M1. A stale sentence in RECORD.**
- **Where:** `drafted/h7-platform/h7-module/RECORD.md:1100`.
- **What:** it says "`verify.sh` stops at the ERC failure, so the page column's … rows come from the same steps run without stopping". Since CR-MODULE-VCAP-ERC, verify.sh exits 0 on this page and runs every step.
- **Failure scenario:** a reader takes the page column for an off-path measurement, or thinks verify.sh still fails on mcu. The row status at RECORD line 241 says the opposite.
- **Fix:** say the column comes from verify.sh.

**M2. Control 17's synthetic item misdescribes pin 126.**
- **Where:** `drafted/h7-platform/h7-module/repair/tools/erc-control.sh:191`.
- **What:** it describes pin 126 as `[VDD, Power input, Line]`. The installed `MCU_ST_STM32H7:STM32H743IITx` names pin 126 `VSS`, typed `passive`, and the model puts it on GND (control 16's own refusal says so).
- **Effect:** the control parses only the designator and the number, so its result is unaffected. The text is still false in a file that is evidence.
- **Failure scenario:** a reader takes the line as a statement about pin 126.

**M3. Three refusals in the allowance model check have no isolating control.**
- **Where:** `drafted/h7-platform/h7-module/repair/tools/erc-allowances.ts:128-152` and `:167`.
- **What:** the `symbolPinType` comparison, the wrong-designator refusal and the "same pin" refusal have no control that triggers them alone.
  - Control 16's pin 126 trips both the net problem and the type problem, and the control greps only the net message.
  - Control 17 never varies the designator.
- **Failure scenario:** a refactor drops the pin-type comparison, or compares only pin numbers. All 17 controls still pass, and an allowance whose stated cause no longer holds (a project symbol that retypes VCAP) is no longer refused, which is the case the ruling says must remove it.
- **Fix:** add two cases:
  - pins 81 and 125 with `symbolPinType` `power_in`, requiring the "typed power_out … not power_in" refusal;
  - a synthetic item `Symbol U2 Pin 81 [`, required to fail.

**M4. One allowance can excuse any number of violations.**
- **Where:** `drafted/h7-platform/h7-module/repair/tools/erc_sheets.py:60-70`.
- **What:** nothing caps the excused count at the one violation the ruling describes.
- **Failure scenario:** the real root (Step 4) instantiates the mcu sheet twice by mistake. The pair is then reported twice and both reports are excused. Each one is printed as an `excused:` line, so this is visible but not failing.
- **Fix:** require at most one match per allowance.

**M5. The root's warnings are counted, not itemised or bounded.**
- **Where:** `drafted/h7-platform/h7-module/repair/tools/erc_sheets.py:111-119`.
- **What:** KiCad files the block page's own hierarchical-label `isolated_pin_label` warnings under `/`. There warnings never fail, and they are counted rather than itemised.
- **Today:** nothing is hidden. The 83 block-label warnings are exactly the expected one-pin ports (verified above).
- **Failure scenario:** a future block-label warning of another type on `/`, for example a `same_local_global_label`, would pass unseen.
- **Fix:** add one line to RECORD's `/` row stating what the 166 are, or a check that the `/` warnings name only one-pin ports.

**M6. Two helpers are duplicated across the two tables.**
- **Where:** `isRecord`, and the designator-to-id resolution with its "names N components" refusal: `erc-allowances.ts:80` and `:128-131`, duplicated from `cross-page-drivers.ts:121` and `:185-189`.
- **Size:** small (about 5 lines).
- **Failure scenario:** a change to the DESIGNATORS lookup rule is made in one table and not the other.
- **Fix:** export the resolver from one module, as `pinConnection` and `installedSymbolPin` already are.

**Not findings, noted for the controller:**
- `footprintsUndeclared: 1 (mcu_u_mcu)` in verify.sh's output is the same advisory every page prints (swd 6, decoupling 25). It is not this task's.
- Two `fails as expected:` lines with empty text appear in control 13 (port-label-control.sh). They are not this task's controls.

### Tooling quality

- No `any`, no `as` cast and no `@ts-ignore` in `erc-allowances.ts` or `cross-page-drivers.ts`. The one grep hit is the word "any" in prose.
- Imports are relative and carry `.ts`.
- Lengths: `erc-allowances.ts` 188, `cross-page-drivers.ts` 243, `erc_sheets.py` 131, `erc-control.sh` 208, `verify.sh` 95, `mcu/02-wire.py` 137, `mcu/layout.py` 69. All are under 500.
- Every refusal names what is missing, and the reason:
  - the override parser names the entry and key;
  - `checkErcAllowances` names the ruling, the pins and each problem;
  - `erc_sheets.py` names the expected third argument;
  - `02-wire.py` names the net, the pins expected and the pins found.

### Committed files

- `git ls-files repair/mcu` lists layout.py, 02-wire.py, intent.json, ports.json, net_strokes.json, 01-place.json, pins.json, 02-wire.json, 02-wire.nets.json and 04-hierarchical-labels.json. That is every file the replay generates or reads for mcu, and the replay checks each generated one byte for byte.
- `mcu/__pycache__` is ignored (`.gitignore:72`).
- The rotation-0 scratch layout is not committed, and RECORD says so. It is not part of the page's record.

### RECORD.md accuracy

These claims were checked, and hold:
- the mcu row and the end sha256 (also in REPLAY.md and replay.sh);
- "Every block sheet is drawn";
- the four PWR_FLAG stubs;
- the 2 driver entries and their reasons;
- 57 NC pins with no-connects;
- the rotation and paper figures (frame and extent, as verify.sh prints them);
- every row of the measurement table;
- the `ground_pin_not_ground` note (pin 37, VSSA);
- the root-obligation paragraphs for cross-page drivers and the VCAP exclusion.

The decisions.md ruling cites three sources, and all three resolve:
- `processor-and-memory.md:136` (VCAP1 pin 81 joined to VCAP2 pin 125);
- `schematic-checklist.md:28` CORE-04, which itself names the ERC conflict and ALL-07;
- the anchor `#d7`.

The "does not carry" clause correctly distinguishes v1's ALL-07 from the new ruling. The only inaccuracy is M1.

### Assessment

**Spec compliance:** ✅ Spec compliant. One ⚠️: whether the page was sent to the owner is not visible from the diff.

**Task quality:** Approved.

**Reasoning:**
- The page agrees with the model on all 176 pins, and every NC pin is a CORE-27 unused I/O with a no-connect and no net.
- The allowance excuses only the exact pair on `/mcu/`, and the 166 root warnings are exactly 83 one-pin ports counted twice.
- replay.sh reaches every sha256 from scratch.
- The findings are a stale sentence, a misdescribed synthetic item, and controls that leave three refusals unisolated. None of them hides an electrical fault.
