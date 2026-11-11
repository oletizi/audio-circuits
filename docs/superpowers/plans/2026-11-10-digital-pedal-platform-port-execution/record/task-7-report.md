Task 7 report: docs/h7-platform/processor-and-memory.md and firmware-facing-requirements.md

Status: DONE_WITH_CONCERNS
Commit: 1b67596 "h7-platform port: processor-and-memory.md and firmware-facing-requirements.md" (BASE 6da0b90), pushed.

## What was written

- docs/h7-platform/processor-and-memory.md (new). Contents:
  - How the core brief is carried: a table giving the current meaning of D1 to D24 per split spec 9.4, each linked to decisions.md. Not-in-force lines for D4 and D13.
  - 1. Effective constraints: EC-MODULE-MCU, EC-SDRAM-CLASS, EC-SDRAM-CONTROL-PINS (D23) and EC-CLOCK-TREE. EC-CLOCK-TREE is set by CORE-BRIEF 5b and PW-TJ, and amended by split 9.4 (quoted). It has Not-in-force lines for SAI1 master MCLK on PLL3 and for CRS SYNCSRC=11/USB2.
  - 2. Module contents, what was taken from OSCAR_PROC_01, and what was left out.
  - 3. HSE: FIG-HSE-GM, the load capacitors, the AN2606 verdict and its residual risk.
  - 4. MCU supply network: D7, D15, the VOS0/rev V requirement, and PW-TJ, which now refers to the clock tree as revised by 9.4.
  - 5. Clock tree as revised: a diagram, the settings table, what 9.4 changed, and the jitter item marked Not in force.
  - 6. SDRAM, from SDRAM-COMPATIBILITY.md in full: the matrix, the pinout, FIG-SDRAM-READ-SLACK, FIG-SDRAM-WRITE-SETUP, FIG-FMC-SDTR1, the register values with their arithmetic, FIG-SDRAM-REFRESH, the init sequence and mode register, what is not verified, and the bring-up test.
  - 7. QSPI.
  - 8. Reset, BOOT0, SWD, and the module's ROM-DFU socket (R-60 / USB-DFU-VERTICAL).
  - 9. Identification.
  - 10. Internal MCU pin assignments: where each is recorded in pedals, not carried as fact, re-derived in phase 2.
  - 11. What did not cross. 12. Open items.
- docs/h7-platform/firmware-facing-requirements.md (new). It opens with "This repository does not own firmware." and says nothing here sets firmware up. Contents:
  - 1. The two board configurations: Seed H750/QSPI against module H743/internal flash, identification by the flash-size register, and Seed revision pins.
  - 2. Memory: 32 MB SDRAM on every board (O-4), the FMC obligations, the D13 PC3SO rule as Not in force, and the original spec's cache and DMA rule.
  - 3. Flash map, bootloaders and recovery limits:
    - 3.1 BL-1 to BL-4, the recovery invariant and its limit, bootloader entry.
    - 3.2 DAISY-BOOTLOADER-LIMITS: facts.md section 7 ported in full with its pinned source; the code-size reading; BL-3 on a Seed.
  - 4. EC-SAI2-SLAVE (codec-master SAI2): CKSTR=1, the kernel clock, digital silence, the codec reset not being firmware's; Not-in-force lines for the v1 slave codec, SAI1, and the v1 CODEC_RST sequence.
  - 5. Clock and peripheral settings the hardware analyses assume, including the VOS1 fallback.
  - 6. EC-USB-OTG-HS (USB update enumeration), the USB switch, D+ soft-disconnect, ROM DFU on the module socket, V9.0, and PB15/PB14 with the unplug rule. Not-in-force line for OTG_FS/PA9/VBDEN/USB33DEN.
  - 7. Pin states by power domain: a table plus the bootloader-time states.
  - 8. Relay and watchdog sequencing.
  - 9. Controls, revision, analog and power obligations.
  - 10. What did not cross. 11. Open items.
- docs/h7-platform/open-items.md:
  - 10 rows appended; the table stays contiguous, every row has 7 cells, and there are no duplicate ids (86 rows).
  - FIRMWARE-INTERFACE-OBLIGATIONS extended with DAC1 disabled and unused pins in analog mode, and a link to section 7.
  - One Ported-from bullet: SDRAM-COMPATIBILITY.md, LAYOUT-CARRYFORWARD.md, SCHEMATIC-CHECKLIST.md.
- verify.sh: check_firmware, with its dispatcher entry and ALL_CHECKS entry. Both documents must exist. firmware-facing-requirements.md must contain H750, H743, QSPI, 32 MB, bootloader, SAI2, watchdog and USB, and the exact sentence "This repository does not own firmware."

## RED and GREEN

RED, before the documents existed:
```
FAIL firmware: [missing docs/h7-platform/processor-and-memory.md] [missing docs/h7-platform/firmware-facing-requirements.md]
PASS effective
PASS provenance
PASS nocode
exit=1
```
GREEN:
```
PASS firmware
PASS effective
PASS provenance
PASS nocode
PASS openitems
PASS decisions
PASS architecture
PASS power
PASS analog
PASS bypass
PASS bytes
exit=0
```
Mutation test of check_firmware, run on a scratch copy of the tree (the repository was not touched):

| Case | Result | exit |
| --- | --- | --- |
| unchanged | PASS | 0 |
| sentence removed | FAIL (lacks the sentence) | 1 |
| 'watchdog' lines removed | FAIL | 1 |
| processor-and-memory.md removed | FAIL (missing) | 1 |

A script also checked the following:
- Every relative link and anchor from the two new documents and open-items.md resolves. The one miss, mechanical-and-controls.md, is linked from a pre-existing row and is Task 8's file.
- Every reference-style link is defined and used.
- Table column counts are consistent.
- There are 0 control bytes in the three files.
- No forbidden drawing word appears except inside two vendor quotes:
  - AN4938's "a good choice";
  - NDK's "better to connect with a GND".

## Open-passage count per source section against rows

Counted by reading, as Tasks 3 to 6 did: the verb "carries" dominates a grep. 42 passages. 10 new rows, 1 existing row extended, 11 existing rows or entries reused.

| Source section | Passages | Rows |
| --- | --- | --- |
| CORE-BRIEF.md | 14 | NEW MCU-SILICON-AND-BOOTLOADER-ID (D12 V9.0 and bootloader ID; 5 residual risk V13.2; 5b VOS0 rev V only); NEW HSE-CRYSTAL-CHECKS (5 "Unverified (HSE)" x4, incl. dated LCSC observation; load-cap trim at bring-up); NEW MODULE-CLOCK-TREE-RESTATE (5b RM0433 CRS_CFGR contradiction); NEW MODULE-INTERNAL-PIN-MAP (6 OSCAR pin map); reused OSCAR-AUDIO-LICENCE-L1 (L1). Not rowed (3, explained below) |
| SDRAM-COMPATIBILITY.md | 9 | NEW SDRAM-BRINGUP-TEST (tRRD inferred; SDCLK duty assumed); NEW SDRAM-LAYOUT-TIMING (6 trace delays; 3 layout consequence); NEW SDRAM-SOURCES-RECHECK (JEDEC pinout; AS4C revision; Micron source; ordering status; 2 AS4C CKE wording) |
| facts.md 4-8 | 4 | reused SAI-KERNEL-CLOCK-SLAVE (4), FLASH-SIZE-REGISTER (5), PCM3060-POR-XO-START (6), the Rev4 conflict entry + SEED-REVISION-RECORD (8). Section 7 has none; it is ported in full |
| split spec 6 | 11 | NEW USB-DFU-VERTICAL (6.1, R-60); NEW BOOTLOADER-FLASH-MAP (BL-1 sector and reserved size; BL-4 option bytes); MODULE-INTERNAL-PIN-MAP (6.2 collision re-check never run; 6.5 strap pin); reused RECOVERY-PATH-CHECKS (BL-2; PB15 at ROM boot; PB14 switch checks), USB-SWITCH-FS-IMPEDANCE, FLASH-SIZE-REGISTER (6.5). Closed by later rulings: 6.3 EN threshold (R-47), 6.3 hot-plug re-run (R-59), both in power.md |
| split spec 11 | 1 | "The Daisy bootloader's limits are a plan item": closed by facts.md 7, now ported (DAISY-BOOTLOADER-LIMITS). NEW FIRMWARE-PROCESSOR-OBLIGATIONS for the section 11 / CORE-BRIEF 5b / SDRAM 4 obligations no row named (not a keyword passage; added so the processor-side obligations are tracked like the interface, power and analog ones) |
| split spec 12.4 | steps 0-4 | step 0 withdrawn by O-16; steps 1, 3, 4 map to existing rows (SEED-*, Task 3's, SEED-MODULE-PARITY); step 2 maps to MCU-SILICON-AND-BOOTLOADER-ID (SWD, REV_ID), HSE-CRYSTAL-CHECKS, SDRAM-BRINGUP-TEST, RECOVERY-PATH-CHECKS, BOOTLOADER-FLASH-MAP, MODULE-INTERNAL-PIN-MAP (strap), FIRMWARE-PROCESSOR-OBLIGATIONS (flash). No row of their own |
| original spec firmware sections | 3 | reused MCU-LONGEVITY; bring-up step 3 -> SDRAM-BRINGUP-TEST; step 7 [inspect] recovery invariant -> BOOTLOADER-FLASH-MAP |

Not rowed, with reasons:
- **CORE-BRIEF 2, the C35/C36 VCC-pair inference.** It is about which OSCAR capacitor pair sat at the codec's pin 24. D3 states the pedal's own pin-local 100 nF + 10 µF, so on the split the inference has no consumer.
- **D4's optional external RST pull-down.** D4 is withdrawn. The RST pull-down allowance on the split lives in CODEC-DOMAIN-BRINGUP.
- **5b's unquantified fractional-PLL jitter.** It is superseded by split 9.3, which reworks BU-22: "PLL3 jitter no longer affects the codec, which runs from the XO". It is carried on a Not-in-force line, and the XO's own jitter is in CODEC-DOMAIN-BRINGUP.

D17's conditional approval is settled (decisions.md D17), so it is not a passage. The difference between 42 passages and 10 new rows is otherwise merging, where one piece of evidence settles several passages.

## Conflicts raised

None.
- facts.md section 8's Rev4 disagreement links Task 3's existing conflict entry.
- The RM0433 self-contradiction on CRS_CFGR is not raised as a conflict. CORE-BRIEF itself ruled the register text an error. On the split, both readings give 10 for USB1 SOF; that is this document's reading, and it is labelled as such. MODULE-CLOCK-TREE-RESTATE carries it.

## Labels applied, with source wording

- **D1 to D13:** controller rulings, as decisions.md carries them. D4 and D13 are "withdrawn" (split 9.4, "**Withdrawn.**").
- **D14 to D24:** owner-approved, in two groups:
  - D14 to D19 "Approved by the owner, 2026-10-04";
  - D20 to D24 "approved by the owner on 2026-10-05 (O-14)".
- **Owner:** O-1, O-2, O-3, O-4, O-7, O-11, O-12, O-14, O-16 (split section 2), and PW-TJ (POWER.md "Owner decision: MCU junction temperature").
- **Controller rulings:** RR-11 (Q-6, Q-7), R-9, R-14, R-15, R-20, R-21, R-22, R-38, R-58, R-60, OWN-06, OWN-07.
- No label was restated differently from decisions.md.
- Porter's readings are labelled "This document's reading" or "This document's arithmetic":
  - the CRS SYNCSRC agreement;
  - any APB at 120 MHz meeting 2 x SCK;
  - the 64 MB part running with optional FMC values and a 32 MB region;
  - the module's flash term being the binding code-size limit.

## Anchors other tasks and the decisions.md amendment may need

- processor-and-memory.md:
  - #ec-module-mcu, #ec-sdram-class, #ec-sdram-control-pins, #ec-clock-tree;
  - #fig-hse-gm, #fig-sdram-read-slack, #fig-sdram-write-setup, #fig-fmc-sdtr1, #fig-sdram-refresh.
- firmware-facing-requirements.md:
  - **#daisy-bootloader-limits**: the closure of split section 16's "Daisy bootloader limits", which Task 3 rested on facts.md section 7. Task 3's architecture.md / report may cite this anchor.
  - #ec-sai2-slave, #ec-usb-otg-hs.
  - Sections 7 (pin states by domain) and 8 (relay and watchdog), which the FIRMWARE-*-OBLIGATIONS rows and bypass-relay.md section 6 point at.

### What decisions.md should link (for the amendment dispatch; decisions.md was not edited)

- **PW-TJ** "keep 480 MHz at VOS0 and the CORE-BRIEF §5b clock tree" needs an Amended-by note that split spec §9.4 revised that tree: SAI1 -> SAI2 slave, PLL3's MCLK role ends, USB on OTG_HS with CRS on USB1 SOF. Link processor-and-memory.md#ec-clock-tree.
- **D4:** link firmware-facing-requirements.md#ec-sai2-slave (the codec reset is not firmware's) and processor-and-memory.md's delta table.
- **D13:** link processor-and-memory.md#ec-sdram-control-pins.
- **D20:** firmware-facing-requirements.md#ec-sai2-slave.
- **D21:** analog.md#ec-codec-reset (Task 5) and firmware-facing-requirements.md section 4.
- **D22:** analog.md section 13.3.
- **D23:** processor-and-memory.md#ec-sdram-control-pins.
- **D24:** power.md section 4.1.
- **D1 and O-4:** processor-and-memory.md#ec-sdram-class.
- **D8:** processor-and-memory.md#fig-hse-gm.
- **O-11 and R-60:** firmware-facing-requirements.md section 3.1 and processor-and-memory.md section 8; R-60 also links the open item USB-DFU-VERTICAL.
- **RR-11 (Q-7):** firmware-facing-requirements.md section 3.1.
- **R-9:** firmware-facing-requirements.md#ec-sai2-slave.
- **R-14:** firmware-facing-requirements.md#ec-usb-otg-hs.

## Carried items from earlier tasks

- **facts.md section 7** is now ported, at firmware-facing-requirements.md#daisy-bootloader-limits, with libDaisy commit 08087203 and the pinned facts.md link.
- **USB-DFU-VERTICAL (R-60)** is still open at the pin: LAYOUT-CARRYFORWARD.md names it as an S2 module requirement, and S2 never ran. It is now its own row (phase 2). No existing row named it; RECOVERY-PATH-CHECKS mentions R-60 only as mitigation. Task 8 (mechanical) should reuse this row rather than add another for the plug column or the receptacle.
- **The rows other documents link to firmware-facing-requirements.md:**
  - FIRMWARE-ANALOG-OBLIGATIONS -> section 9 (the controls list) and section 8 (the relay sequence and watchdog);
  - FIRMWARE-POWER-OBLIGATIONS -> sections 5 and 9 (VOS1 fallback, peripheral clocks, I2C 400 kHz, 5 ms debounce, 2.5 s hold);
  - FIRMWARE-INTERFACE-OBLIGATIONS -> sections 4, 6 and 7 (CKSTR, no pulls on SAI pins, pins 32/34/35 not driven, PA1 pulls off, D+ soft-disconnect, USB_EN_N, plus DAC1 and analog-mode pins);
  - bypass-relay.md section 6 -> section 8;
  - architecture.md rule 13 and section 5 -> sections 3, 6 and 7.
- **Rows reused:** SAI-KERNEL-CLOCK-SLAVE, FLASH-SIZE-REGISTER, PCM3060-POR-XO-START, MCU-TJ-MEASURE.
- **Module internal pin assignments:** not carried as fact. processor-and-memory.md section 10 says where each is recorded:
  - CORE-BRIEF section 6;
  - PINMAP.md and pinmap.json;
  - the split's section 6.2 changes and D23;
  - the vendored ST pin data;
  - the never-written module-pins.json.
  Phase 2 re-derives them under the row MODULE-INTERNAL-PIN-MAP.

## Edits to other tasks' text

- open-items.md FIRMWARE-INTERFACE-OBLIGATIONS: appended DAC1 disabled, unused pins in analog mode, and the link to section 7. Additive only.
- No superseded value was found stated as current in architecture.md, power.md, analog.md or bypass-relay.md. I scanned for SAI1, PLL3, MCLK, PC3SO, PC3_C, SYNCSRC, USB2 SOF, OTG_FS, PI4 and CODEC_RST. No other task's text was rewritten.

## Concerns

1. **decisions.md PW-TJ** still says "the CORE-BRIEF §5b clock tree" with no 9.4 note. I could not edit it; processor-and-memory.md section 4 and EC-CLOCK-TREE show the revision. This is for the amendment dispatch.
2. **The SDRAM-COMPATIBILITY register values and the clock-tree settings are carried as analysis results.** These are FMC_SDCR1/SDTR1/SDRTR, the init sequence and the PLL values. firmware-facing-requirements.md presents them as constraints the hardware analyses rest on, not as firmware setup. A reviewer may judge whether register values cross the "does not set firmware up" line. My reading is that they are the compatibility analysis's results, which port spec Goal 2 names.
3. **BU identifiers are cited from SCHEMATIC-CHECKLIST.md** (BU-05, -06, -07, -09, -12, -15, -18, -20 to -22, -24, CORE-14, -25, -27), which was not in my source list. They are cited for traceability; the bring-up checklist task carries them.
4. **The 64 MB optional class** under O-4 (32 MB region on every board) is my reading, and it is labelled as such: FMC values follow the part, and the region stays at 32 MB. No source states it.
5. **The FIRMWARE-PROCESSOR-OBLIGATIONS row** is not from a keyword passage. I added it so processor-side obligations are tracked the way the interface, power and analog obligations are. It partly overlaps FIRMWARE-INTERFACE-OBLIGATIONS on CKSTR, and says so.

## Fix round 1 (commit 1502047)


Important: BU-18 (PWR_CR3.USB33DEN) and BU-12's VBUS-comparator rule
(VBDEN = 0, B-session valid forced, VBUS read as a GPIO) are restated as
current for OTG_HS on PB14/PB15 with VBUS on PA1, under EC-USB-OTG-HS,
and added to FIRMWARE-PROCESSOR-OBLIGATIONS. Only the OTG_FS/PA9/divider
specifics stay on the Not-in-force line. That both rules apply unchanged
to the OTG_HS core is labelled as this document's reading. Section 10
no longer claims the v1 BU items' split meaning "is above" without
saying where.

Accuracy points:
- D21: the power-fail supervisor driving RST is attributed to RR-11's
  Q-6 ruling.
- EC-CLOCK-TREE gains O-2 and D20 under Amended by.
- EC-SDRAM-CLASS cites split spec section 3's SDRAM row; the
  Not-in-force line is split so the still-binding clause (the fitted
  density sets the FMC column count) is stated as in force; the 64 MB
  reading is labelled.
- Firmware section 2 frames the FMC values as what the SDRAM analysis
  assumes and points to processor-and-memory.md 6.3 and its FIG anchors.
- The PB4/SPARE5 claim is corrected to the contract's input spare, and
  the analog-mode question is labelled as this document's reading.
- The 79 mA margin cites power.md 5.1 first.
- The Ported-from list names CORE-14 and BU-09.

Rows: none added; FIRMWARE-PROCESSOR-OBLIGATIONS extended.

Process note: the edits were applied by one Python script, which was written through a Bash heredoc containing '#' characters (markdown anchors). That breaks the owner's no-# in heredoc rule. It ran without a prompt and the edit result was checked by verify.sh. It is recorded here rather than hidden.

Command: PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh firmware openitems effective provenance nocode decisions architecture power analog bypass bytes
Output: PASS for all 11 checks (firmware, openitems, effective, provenance, nocode, decisions, architecture, power, analog, bypass, bytes); exit=0.
Also re-checked: every link and anchor resolves (the only miss is the pre-existing link to Task 8's mechanical-and-controls.md); 86 rows, no duplicate ids; consistent table columns; 0 control bytes.
