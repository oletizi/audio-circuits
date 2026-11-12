# h7-platform processor and memory

Ported from:
- [h7-platform/CORE-BRIEF.md][cb]: §1 to §6 (§4 deltas D1 to D19), **as amended by split spec §9.4**
- [h7-platform/SDRAM-COMPATIBILITY.md][sd]: inputs, §1 to §6
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §6 (§6.1 to §6.5), §9.4, §11, §12.4, §16
- [2026-09-30-h7-pedal-platform-design.md][plat] (the original platform spec): *Architecture decisions*, *SDRAM*, *Programming and test access*, *Recovery invariant*, *Open items*
- [h7-platform/interface-analysis/facts.md][facts]: §3 (the PB0 note), §4, §5
- [2026-10-05-h7-split-rulings.md][ledger] (the S1 rulings ledger): R-60, and the entries linked through [decisions.md](decisions.md)
- [h7-platform/LAYOUT-CARRYFORWARD.md][lcf]: the module requirement USB-DFU-VERTICAL
- [h7-platform/SCHEMATIC-CHECKLIST.md][checklist]: §9 identifiers CORE-14, BU-05 to BU-07, BU-09 and BU-20 to BU-22, cited for traceability only

This document describes the processor side of the STM32H743 digital pedal platform (h7-platform) after the split: the processor module (h7-module) with its MCU, SDRAM, QSPI flash, crystal, clock tree, reset, boot and debug access, and how it is identified. It records the design as it stood in the pedals repository at commit `5b926d0`. Nothing here has been built, modelled or drawn in this repository.

**Every figure in this document is paper analysis of a board that has not been built.** Each figure states its inputs and its method beside it and links the pedals document it came from.

Decisions are linked by anchor into [decisions.md](decisions.md). An owner decision is labelled "owner"; D14 to D24 are deltas the owner approved; everything else there is a controller ruling, which the owner may override. Open items are rows in [open-items.md](open-items.md), named here by their Id. The module's power (its buck, the 3V3 budget, the reset supervisor's thresholds, decoupling values and the junction-temperature decision) is in [power.md](power.md) §5; the interface and the module's place in the system are in [architecture.md](architecture.md) §4 and §5; what firmware must do with this hardware is in [firmware-facing-requirements.md](firmware-facing-requirements.md).

## How the core brief is carried

`CORE-BRIEF.md` was written for the one-board design (v1). It said what to copy from DADDesign's OSCAR boards (OSCAR_PROC_01 for the MCU, SDRAM, flash, HSE, USB and SWD; OSCAR_AUDIO_01 for the PCM3060), what to leave out, and what to change (its deltas D1 to D19), and it fixed the HSE crystal and the clock tree. The split spec §9.4 revisits it: **D4 and D13 are withdrawn, D20 to D24 are new and approved by the owner** ([O-14](decisions.md#o-14)), and several others are revised. D20 to D24 were never appended to `CORE-BRIEF.md`; [decisions.md](decisions.md) records them. This document states each delta's current meaning only, and links the entry that carries its history.

| Delta | Current meaning on the split | Entry |
| --- | --- | --- |
| D1 SDRAM class | 256 Mbit × 16 = 32 MB baseline; the fitted part is W9825G6KH-6I (split spec §6.1); firmware fits 32 MB on every board ([O-4](decisions.md#o-4), owner) | [D1](decisions.md#d1) (ruling) |
| D2 codec hardware mode, I²C on not-fitted links | Kept, on the pedal; pin 27 note revised for IFMD high | [D2](decisions.md#d2) (ruling); [analog.md](analog.md) |
| D3 5V_A LDO feeds codec VCC | On the pedal's analog branch | [D3](decisions.md#d3) (ruling); [power.md](power.md) §7 |
| D4 codec RST driven by the MCU | **Withdrawn**; replaced by the local reset of D21 | [D4](decisions.md#d4) |
| D5 buck replaces OSCAR's digital supply | The buck is on the module and no longer feeds codec VDD | [D5](decisions.md#d5) (ruling); [power.md](power.md) §5.2 |
| D6 BOOT0 and Reset buttons | OSCAR's circuits kept, on the module; need not be reachable in a closed enclosure ([O-12](decisions.md#o-12), owner) | [D6](decisions.md#d6) (ruling) |
| D7 MCU power pins | PDR_ON to VDD; VCAP1 and VCAP2 joined, 2.2 µF each; VDD33USB 100 nF + 1 µF; on the module. The VDDA bank must change: [R-57](decisions.md#r-57) requires FB_VDDA's resonance at f0 ≤ 158.0 kHz (§4) | [D7](decisions.md#d7) (ruling); [power.md](power.md) §5.3 |
| D8 HSE crystal | 25 MHz with a specified part (§3 below); kept for the module; the Seed's 16 MHz HSE is a firmware board configuration | [D8](decisions.md#d8) (ruling) |
| D9 SWD header | Kept, on the module | [D9](decisions.md#d9) (ruling) |
| D10 USB ESD and VBUS sense | ESD and VBUS sense move to the pedal, sense on PA1 as a GPIO; PA11/PA12 go to the module's own USB socket | [D10](decisions.md#d10) (ruling) |
| D11 one flash, bank 1 | Kept; the freed PH2/PH3 now carry SDCKE0/SDNE0, and PG9 carries SAI2_FS_B | [D11](decisions.md#d11) (ruling) |
| D12 bootloader pin cautions | Revised: PB15 is now the pedal's USB D+ | [D12](decisions.md#d12) (ruling); [firmware-facing-requirements.md](firmware-facing-requirements.md) §6 |
| D13 PC3_C carries SDCKE0 | **Withdrawn**; SDCKE0 moves to PH2 (D23) | [D13](decisions.md#d13) |
| D14 NRST pull-up and supervisor | Kept, on the module | [D14](decisions.md#d14) (owner-approved) |
| D15 test pads | Kept, on the module | [D15](decisions.md#d15) (owner-approved) |
| D16, D19 VDDA's extra contacts | On the module, VDDA's one extra contact is interface pin 21, VREF_A; the pots, expression and HW_REV contacts and the expression follower are loads on VREF_A on the pedal | [D16](decisions.md#d16), [D19](decisions.md#d19) (owner-approved); [analog.md](analog.md) §9 |
| D17 VDDA ferrite | BLM21PG221SN1D, kept, on the module; narrowed by [R-57](decisions.md#r-57) (controller ruling): the network it is part of must meet VDDA-WIDEBAND, f0 ≤ 158.0 kHz, by more VDDA-bank capacitance or a bead with more inductance (§4) | [D17](decisions.md#d17) (owner-approved) |
| D18 one GND net | Kept on both boards | [D18](decisions.md#d18) (owner-approved) |
| D20 codec clock master | IFMD to VDD, SCKI from a 12.288 MHz oscillator | [D20](decisions.md#d20) (owner-approved) |
| D21 codec local reset | From a local reset on the pedal | [D21](decisions.md#d21) (owner-approved); the power-fail supervisor also driving RST is [RR-11](decisions.md#rr-11)'s Q-6 ruling |
| D22 codec VDD regulator | A local 3.3 V regulator on 5V_A | [D22](decisions.md#d22) (owner-approved) |
| D23 SDRAM control pins | SDNWE, SDNE0, SDCKE0 on PH5, PH3, PH2 | [D23](decisions.md#d23) (owner-approved) |
| D24 module buck EN | From VIN_MOD | [D24](decisions.md#d24) (owner-approved) |

*Not in force:* D4's codec RST on net `CODEC_RST`, driven by an MCU GPIO, with the codec held in reset by its internal 50 kΩ pull-down while the MCU is in reset (`CORE-BRIEF.md` D4).

*Not in force:* D13's FMC_SDCKE0 on the PC3_C pad, which needs SYSCFG_PMCR.PC3SO left at 0 so the analog switch stays closed, and the firmware rule "never set PC3SO" (`CORE-BRIEF.md` D13).

The codec half of `CORE-BRIEF.md` §2 (the PCM3060, its straps, its decoupling) is on the pedal after the split and is carried in [analog.md](analog.md) §13. The relays `CORE-BRIEF.md` §3 lists are in [bypass-relay.md](bypass-relay.md). The OSCAR licences are in [architecture.md](architecture.md) §10 and open item OSCAR-AUDIO-LICENCE-L1.

## 1. Effective constraints

### EC-MODULE-MCU

**The module's MCU is the STM32H743IIT6 in LQFP-176** (480 MHz, 2 MB flash, about 1 MB SRAM; original spec *Architecture decisions*). The module matches the Seed's 40-pin pinout, not its size.
- **Set by:** original spec *Architecture decisions*; [O-3](decisions.md#o-3) (owner) keeps the LQFP-176 on the module.
- **Amended by:** none. ST's longevity commitment is open item MCU-LONGEVITY. 480 MHz needs revision V silicon (§4); open item MCU-SILICON-AND-BOOTLOADER-ID.

### EC-SDRAM-CLASS

**The module fits 32 MB of SDRAM: 256 Mbit × 16, 13 row bits (A0–A12), 9 column bits, 4 banks, TSOP-II-54; the part named is the Winbond W9825G6KH-6I.** Firmware's SDRAM region is 32 MB on both boards, the Seed included.
- **Set by:** original spec *SDRAM* (the baseline class); [D1](decisions.md#d1) (ruling).
- **Amended by:** [O-4](decisions.md#o-4) (owner): 32 MB on the module, and firmware fits 32 MB of SDRAM though the Seed has 64 MB; split spec §3's SDRAM row: "Build-time choice between 32 MB baseline and 64 MB optional class" becomes "32 MB is the module baseline; firmware fits 32 MB on every board, the Seed included"; split spec §6.1 names the part.

*Not in force:* the linker's SDRAM region size following the fitted class (original spec *SDRAM*: the fitted density "sets the FMC column-bit count, the refresh count and the linker's SDRAM region size together"); after O-4 and split spec §3 the region is 32 MB on every board.

Still in force from that sentence: the fitted density is a build-time board configuration that sets the FMC column-bit count (§6.3). *This document's reading:* split spec §3 calls 32 MB "the module baseline", which is the closest any source comes to the optional 64 MB class on the split; no source says whether a 64 MB part may still be fitted, and if one is, its FMC values follow the part while the region stays 32 MB.

### EC-SDRAM-CONTROL-PINS

**SDNWE is on PH5, SDNE0 on PH3 and SDCKE0 on PH2, on FMC SDRAM bank 1.** ST's pin data lists these functions on these pins (split spec §6.2). PH2 and PH3 were freed by dropping OSCAR's second flash (D11). The FMC configuration changes only in its pin setup.
- **Set by:** [D23](decisions.md#d23) (owner-approved).
- **Amended by:** none.

*Not in force:* SDNWE on PC0, SDNE0 on PC4 and SDCKE0 on PC3_C (v1, from OSCAR; `CORE-BRIEF.md` §6, D13).

### EC-CLOCK-TREE

**HSE 25 MHz; PLL1 gives the 480 MHz system clock at VOS0; PLL2 gives the FMC kernel clock (SDCLK 92.5 MHz) and the ADC kernel clock; QUADSPI runs at 60 MHz from HCLK; SAI2 runs both blocks as slaves on the codec's clocks; the application's USB is the OTG_HS controller with its internal full-speed PHY, clocked from HSI48 with the clock recovery system (CRS) synchronised to USB1 SOF.** §5 gives every value and its source.
- **Set by:** [CORE-BRIEF.md §5, §5b][cb]; [PW-TJ](decisions.md#pw-tj) (owner) keeps 480 MHz at VOS0.
- **Amended by:** [O-2](decisions.md#o-2) (owner: the codec is clock master and the STM32 SAI is slave; MCLK is not on the interface) and [D20](decisions.md#d20) (owner-approved: IFMD to VDD, SCKI from a 12.288 MHz XO), which end the MCU's MCLK; split spec §9.4: "SAI1 → SAI2, both blocks slave; PLL3's MCLK role ends (the SAI kernel clock requirement in slave mode is a plan item); USB on the OTG_HS controller (USB1) using its internal full-speed PHY, with CRS synchronised to USB1 SOF, not USB2". The revised tree as a whole was never restated: open item MODULE-CLOCK-TREE-RESTATE. The slave-mode kernel clock: open item SAI-KERNEL-CLOCK-SLAVE.

*Not in force:* SAI1 block A master transmitter on PLL3 (P3 = 8, pll3_p_ck 98.303986 MHz, MCKDIV 8) driving MCLK 12.287998 MHz on PE2 (SAI1_MCLK_A), −0.147 ppm from PLL quantisation, with SCK 3.072 MHz and FS 47 999.993 Hz (`CORE-BRIEF.md` §5b).

*Not in force:* CRS_CFGR.SYNCSRC = 11 (USB2 SOF) for the application's USB on OTG_FS at PA11/PA12, with USBSEL = 11 (`CORE-BRIEF.md` §5b; `SCHEMATIC-CHECKLIST.md` BU-09).

## 2. What the module carries

The split spec §6.1 lists the module's contents ([O-4](decisions.md#o-4), owner, with [O-11](decisions.md#o-11) adding the USB socket); [architecture.md](architecture.md) §5 has the table. This document carries the processor blocks:

| Block | Parts | Section |
| --- | --- | --- |
| MCU and its supply network (VDD, VCAP, VDD33USB, VBAT, VDDA/VREF+, PDR_ON) | STM32H743IIT6, LQFP-176 | §4 |
| HSE | NDK NX3225GA 25 MHz, 8 pF C0G load capacitors | §3 |
| 32 MB SDRAM and decoupling | W9825G6KH-6I | §6 |
| QSPI flash | Winbond W25Q128JV on QUADSPI bank 1 | §7 |
| Reset supervisor and NRST network; BOOT0 and RESET buttons; SWD | TLV803EA30 ([D14](decisions.md#d14)); OSCAR's BOOT0/NRST circuits ([D6](decisions.md#d6)); 2 × 5 1.27 mm header and pogo pads ([D9](decisions.md#d9)) | §8 |
| USB socket on PA11/PA12 for ROM DFU, with ESD | HRO TYPE-C-31-E-17, vertical ([R-60](decisions.md#r-60)) | §8 |
| Module identification strap | a resistor strap on a free module ADC pin | §9 |

The module carries no codec, no analog audio and no panel parts. Its 3.3 V buck and input network are in [power.md](power.md) §4 and §5.

**What `CORE-BRIEF.md` took from OSCAR_PROC_01 for these blocks** ([CORE-BRIEF.md §2][cb]; OSCAR_PROC_01 at commit `012f013d36ca110554ac18d96e6703bb5525aea5`, MIT): the MCU with its VCAP, VDD, VBAT and VDDA/VREF+ networks; NRST (pull-up, 100 nF, button); BOOT0 (4.7 kΩ pull-down, 100 nF, button to VDD); the HSE on PH0/PH1; the SDRAM on FMC bank 1 with a 10 kΩ pull-up on FMC_SDNE0 and its seven 100 nF capacitors on pins 1, 14, 27 (VDD) and 3, 9, 43, 49 (VDDQ), pin 40 (NC) left unconnected; the flash on QUADSPI bank 1 with a 10 kΩ pull-up on its chip select and 100 nF. Every one of the MCU's 176 pin numbers in OSCAR's symbol was checked against ST's `STM32H743IITx.xml`. What it changed is the delta table above.

**What it left out** ([CORE-BRIEF.md §3][cb]): OSCAR's power (isolated converters, AMS1117, bulk electrolytics), analog stages, PGA2310, MIDI opto, the second flash, the TFT, encoders and their headers, OSCAR's 1 × 4 debug header and its ESD part.

## 3. HSE

[CORE-BRIEF.md §5][cb]; [D8](decisions.md#d8) (ruling), kept for the module by split spec §9.4.

- **Frequency 25 MHz.** OSCAR's tested value; inside the H743's HSE range of 4–48 MHz (DS12110 Rev 11 Table 131); AN4938 Rev 7 §4.1.2 calls 25 MHz "a good choice to get accurate Ethernet, USB OTG high-speed peripheral, I2S, and SAI". USB DFU does not depend on it (below).
- **Part: NDK NX3225GA 25 MHz, CL = 8 pF, ESR ≤ 50 Ω, 3.2 × 2.5 mm**, parameters from AN2867 Rev 24 Table 9 (NDK EXS00A-CG06750). Orderable MPN NX3225GA-25.000M-STD-CRG-2 (LCSC C1985619, an exact MPN match, −40 to +85 °C as the distributor lists it; LCSC C438901 is another NX3225GA 25 MHz 8 pF listing); both codes read in the LCSC catalogue on 2026-10-01, a dated observation. NDK 2008E_NX3225GA_e confirms CL 8 pF, −40 to +85 °C, ESR ≤ 50 Ω for 20–50 MHz, ±20 ppm at 25 ± 3 °C and ±30 ppm over temperature, and that pads #2/#4 are unconnected inside ("better to connect with a GND"). Any crystal that passes the gm check below and the temperature range can replace it.
- **Load capacitors CL1 = CL2 = 8 pF C0G**, no series resistor (`SCHEMATIC-CHECKLIST.md` CORE-14). Inputs: CL = 8 pF, stray Cs assumed 4 pF. Method: CL = CL1·CL2/(CL1 + CL2) + Cs (AN2867 §3.3), so 8 = 4 + 4. Trimmed at bring-up by measuring the HSE on MCO1 (BU-05). Paper analysis of an unbuilt board.

#### FIG-HSE-GM

**The NX3225GA's oscillator margin: gm_crit 0.40 mA/V at C0 = 1 pF and 0.60 mA/V at C0 = 3 pF, against the H743's Gm_crit_max of 1.5 mA/V; it passes for any C0 up to 9.4 pF.** Inputs: F = 25 MHz, ESR = 50 Ω (maximum), CL = 8 pF, C0 = 1 or 3 pF; Gm_crit_max = 1.5 mA/V (DS12110 Rev 11 Table 131). Method: AN2867 Rev 24 §3.4 requires gm_crit = 4 · ESR · (2πF)² · (C0 + CL)² ≤ Gm_crit_max; solving for the largest C0 + CL that passes at 50 Ω and 25 MHz gives 17.4 pF, so C0 ≤ 17.4 − 8 = 9.4 pF. For comparison, a typical HC-49 (CL 18 pF, C0 7 pF, ESR 40 Ω) gives about 2.5 mA/V and fails; OSCAR's part has no MPN, so its margin cannot be checked. Source: [CORE-BRIEF.md §5][cb]. Paper analysis of an unbuilt board.

**Unverified** ([CORE-BRIEF.md §5][cb], "Unverified (HSE)"), all carried in open item HSE-CRYSTAL-CHECKS: AN2867 lists the NX3225GA in its STM8 section, and ST has not listed it for the H7, so its suitability rests on the gm check alone; the NDK datasheet gives no C0; Cs depends on the layout and sets the final CL1/CL2.

**USB DFU works with a 25 MHz HSE** (AN2606 Rev 70 §60, Rev 62 §53 the same; the original spec's open item 4, settled):
- The ROM bootloader runs the system clock at 64 MHz from the HSI, and USB from HSI48 with CRS enabled (Table 135, RCC row: "CRS is enabled for the DFU to allow USB to be clocked by HSI48 48 MHz").
- It does not detect the HSE and has no list of supported HSE frequencies: Table 136 records the change at V13.3, "Switch USB clock input from HSE to HSI48 with CRS", which V9.0 (0x90), V9.1 (0x91) and V9.2 (0x92) inherit. Table 3 lists DFU bootloader ID 0x92 for this family.
- DFU conditions: USB FS on PA11/PA12 in forced device mode with no external pull-up and no USBREGEN mode; VDD33USB is fed from the module's 3V3.
- **Residual risk:** the first bootloader, V13.2 (0xD2), clocked USB from the HSE, and AN2606 does not say which HSE values it supported. The brief says "That version belongs to the earliest silicon", and separately that rev Y/W silicon cannot run 480 MHz anyway (ES0392 Rev 15 §2.2.21). Bring-up reads REV_ID and the bootloader ID (open item MCU-SILICON-AND-BOOTLOADER-ID).

## 4. The MCU and its supply network

On the module, unchanged by the split except where noted (split spec §6.1: "Unchanged"; [CORE-BRIEF.md §2, §4][cb]). The capacitor values, the supervisor's thresholds and the junction-temperature decision are in [power.md](power.md) §5.3; this section says what each connection is and why.

- **PDR_ON (pin 171) tied to VDD** ([D7](decisions.md#d7)): holding it high enables the internal POR/PDR supervisor (AN4938 Rev 7 §2.3.5); tying it to VSS would need an external supervisor (§2.3.6). OSCAR left it unconnected.
- **VCAP1 (pin 81) joined to VCAP2 (pin 125)**, each with 2.2 µF, ESR < 100 mΩ, X7R (AN4938 Rev 7 §2.2; DS12110 Rev 11 Table 114: 2.2 µF per capacitor, ±20 %, ESR < 100 mΩ). OSCAR had them as separate nets.
- **VDD**: 100 nF at each of the 14 VDD pins and at VDD33USB (OSCAR's 15), plus one ≥ 4.7 µF ceramic close to the package (AN4938 Rev 7 §2.2, `CORE-BRIEF.md` D5). **VDD33USB** gains 1 µF beside its 100 nF (AN4938 §2.2). **VBAT** (pin 6) tied to VDD with 100 nF.
- **VDDA/VREF+**: VDDA fed from VDD through FB_VDDA (Murata BLM21PG221SN1D, [D17](decisions.md#d17)); VREF+ (pin 38) tied to VDDA (pin 39); VSSA (pin 37) joined to VSS through 0 Ω. On the split the VDDA net also leaves the module on interface pin 21 as VREF_A ([D16](decisions.md#d16)), so its bank must meet the hard module requirement VDDA-WIDEBAND ([R-57](decisions.md#r-57), controller ruling): **FB_VDDA's resonance at f0 ≤ 158.0 kHz, L_min × C_bank,eff ≥ 1.015 µH·µF; with the BLM21PG221SN1D (L ≥ 0.263 µH) a bank of C_eff ≥ 3.86 µF, a nominal X7R bank of at least 10.1 µF, or a bead with more inductance**, with R-18's damping leg across it ([analog.md](analog.md) [EC-VDDA-WIDEBAND](analog.md#ec-vdda-wideband), FIG-VDDA-WIDEBAND, §9.3; open items VDDA-WIDEBAND and VDDA-DAMPING-LEG). AN4938's own minimum is 100 nF + 1 µF. The 4 µF external limit on pin 21 is in [analog.md](analog.md) §9.

*Not in force:* OSCAR's VDDA bank of 2 × 100 nF + 2 × 2.2 µF (4.6 µF) as the module's bank. [R-57](decisions.md#r-57): on its ceramic basis that network gives 2.13 mV rms at pin 21, over the 806 µV requirement, so the module must change.
- **Test pads** ([D15](decisions.md#d15), owner-approved): bench pads on VCAP and VDDA, each with a GND pad, and a pogo pad on BOOT0.
- **Voltage scaling and silicon revision.** 480 MHz needs VOS0, which needs the LDO supply and TJ ≤ 105 °C (DS12110 Table 112, Table 113) and is available only on revision V silicon; VOS0 is missing on revisions Y and W (ES0392 Rev 15 §2.2.21). Bring-up reads REV_ID (DBGMCU_IDC, 0x2003 = rev V) ([CORE-BRIEF.md §5, §5b][cb]; open item MCU-SILICON-AND-BOOTLOADER-ID). The board's SDRAM timing (§6) also takes rev V's figures.
- **Junction temperature**: the owner's [PW-TJ](decisions.md#pw-tj) keeps 480 MHz at VOS0 with thermal copper (now module layout, [OWN-06](decisions.md#own-06)), a bring-up measurement and a firmware fallback to 400 MHz at VOS1. Figures and method: [power.md](power.md) §5.3; open items MCU-TJ-MEASURE and FIRMWARE-POWER-OBLIGATIONS. PW-TJ's "the CORE-BRIEF §5b clock tree" now means that tree as revised by split spec §9.4 ([EC-CLOCK-TREE](#ec-clock-tree)); the revision touches the SAI and USB clocks, not PLL1's 480 MHz.

## 5. Clock tree

[CORE-BRIEF.md §5b][cb] (sources: RM0433 Rev 8, DS12110 Rev 11, ES0392 Rev 15), as revised by split spec §9.4. The values below are the ones the hardware analyses rest on (the SDRAM timing in §6, the QSPI clock in §7, the ADC sampling in [analog.md](analog.md)); what firmware must set is in [firmware-facing-requirements.md](firmware-facing-requirements.md) §5. All three PLLs take the HSE (one source, RCC_PLLCKSELR.PLLSRC = HSE). RM0433 §8.5.5: F_ref = F_HSE / DIVM; F_VCO = F_ref × (DIVN + FRACN / 2^13); F_out = F_VCO / DIVy; the register fields DIVN, DIVP, DIVQ, DIVR hold the value − 1.

```text
HSE crystal 25.000 MHz (PH0/PH1)
 |
 +-- PLL1  DIVM1=5 -> ref 5.000 MHz (4-8 MHz range, wide VCO)
 |         DIVN1=192, integer -> VCO 960.000 MHz
 |         P1=2 -> 480.000 MHz -> SYSCLK
 |           +-- D1CPRE /1 -> CPU 480 MHz (VOS0)
 |           +-- HPRE /2   -> HCLK 240 MHz -> QUADSPI kernel (QSPISEL=00), prescaler /4 -> flash CLK 60.000 MHz
 |                 +-- every APB prescaler /2 -> APB1-4 120 MHz; timers 240 MHz
 |
 +-- PLL2  DIVM2=10 -> ref 2.500 MHz (2-4 MHz range, wide VCO)
 |         DIVN2=148, integer -> VCO 370.000 MHz
 |         R2=2 -> 185.000 MHz -> FMC kernel (FMCSEL=10), SDCLK = kernel / 2 -> 92.500 MHz
 |         P2=4 ->  92.500 MHz -> ADC kernel (ADCSEL=00), prescaler /2, fixed /2 on rev V -> fADC 23.125 MHz (BOOST=10)
 |
 +-- PLL3  no longer feeds an MCLK (split spec section 9.4); its use for the SAI2 kernel clock is open (SAI-KERNEL-CLOCK-SLAVE)

SAI2: block B asynchronous slave receiver, block A synchronous slave transmitter, both on the codec's BCK and LRCK
     (BCK 3.072 MHz = 64 fS, fS 48 kHz from the codec's 12.288 MHz oscillator; analog.md section 13.2)

HSI48 48 MHz, trimmed by CRS synchronised to USB1 SOF -> USB kernel -> OTG_HS (USB1) internal full-speed PHY on PB14/PB15
```

**Settings and checks that stand** ([CORE-BRIEF.md §5b][cb], "Settings and checks"):

| Item | Setting | Result | Limit and source |
| --- | --- | --- | --- |
| Voltage scaling | LDO supply, VOS1 then SYSCFG_PWRCR.ODEN = 1, wait for VOSRDY | VOS0 | RM0433 §6.6.2; rev V only (ES0392 §2.2.21); TJ ≤ 105 °C (DS12110 Tables 112, 113) |
| PLL1 | M = 5, N = 192, P = 2, integer | 5 MHz ref, 960 MHz VCO, 480 MHz | PLL input 2–16 MHz, VCO 192–960 MHz, P ≤ 480 MHz at VOS0 (DS12110 Table 137); the VCO sits at its 960 MHz maximum, as in OSCAR and ST's 480 MHz configurations |
| CPU / HCLK / APB | /1, /2, every APB /2 | 480 / 240 / 120 MHz | fCPU ≤ 480, fHCLK ≤ 240, fPCLK ≤ 120 MHz at VOS0 (DS12110 Table 112) |
| Flash | LATENCY 4 WS, WRHIGHFREQ = 10 | — | 225–240 MHz AXI at VOS0 (RM0433 Table 17) |
| FMC kernel | FMCSEL = 10 (pll2_r_ck) | 185 MHz | ≤ 300 MHz at VOS0 (RM0433 Table 60) |
| **SDCLK** | FMC_SDCR1.SDCLK = 10 (kernel / 2) | **92.5 MHz** (period 10.81 ns) | **100 MHz**: DS12110 §3.15 (FMC_SDCLK is the kernel clock / 2) and §6.3.17, rev Y, "FMC_SDCLK = 100 MHz at 20 pF" for 1.8–3.6 V; §7.3.17 gives 110 MHz for rev V at 2.7–3.6 V; the platform takes the stricter 100 MHz. 92.5 MHz leaves 7.5 % margin. It is OSCAR's tested value, with the same PLL2 settings |
| ADC | ADCSEL = 00, CKMODE = 00, PRESC /2, BOOST = 10 | 92.5 MHz kernel, fADC 23.125 MHz | ADC kernel ≤ 100 MHz at VOS0 (RM0433 Table 60); fADC ≤ 25 MHz with BOOST = 10 (DS12110 Table 174); chosen for slow pot sampling; firmware may slow it further |
| QUADSPI | QSPISEL = 00 (rcc_hclk3), PRESCALER = 3 (/4) | 60 MHz, 50 % duty | kernel ≤ 250 MHz at VOS0 (RM0433 Table 60); §7 |
| Unused PLL outputs | DIVyEN = 0, DIVy = 0 | — | RM0433 §8.5.5 |

**What split spec §9.4 changed** (quoted under [EC-CLOCK-TREE](#ec-clock-tree)), and what is left open:
- **SAI2 slave.** With the codec as clock master ([D20](decisions.md#d20)), "when the audio block is defined as slave, the clock generator is OFF. The value of NOMCK, MCKDIV and OSR bits are ignored" (RM0433 Rev 8 §51.4.8, quoted in `facts.md` §4). Whether the SAI kernel clock must still run in slave mode, and any minimum ratio to SCK, is not stated in RM0433 or DS12110 Table 108. The stated slave-mode constraint is on the APB clock: PCLK greater than twice SCK (RM0433 §51.4.4 note; DS12110 Table 108 note 2), so PCLK > 6.144 MHz at SCK 3.072 MHz. *This document's arithmetic, not a source's:* every APB clock in the tree above is 120 MHz, so whichever APB clock feeds SAI2 meets it with a wide margin. SCK 3.072 MHz is also under Table 108's 128 × fS = 6.144 MHz slave limit. `facts.md` §4's conservative reading keeps the SAI2 kernel clock selected and enabled as in master mode. Open item SAI-KERNEL-CLOCK-SLAVE.
- **USB on OTG_HS (USB1) with CRS on USB1 SOF.** `CORE-BRIEF.md` §5b found RM0433 contradicting itself on the CRS sync source: ST's HAL and RM0433 Table 98 (the interconnect matrix) give LSE = 01, USB1 SOF = 10 (the default) and USB2 SOF = 11, while RM0433's CRS_CFGR text (§9.8.2) reads "00: USB2 SOF, 01: LSE, 10: OTG HS1 SOF (default)"; the brief treated the register text as the error. *This document's reading, not a source's:* both readings give 10 for USB1 SOF, so the split's choice falls on the one value the two agree on, and it is the reset value. Which kernel clock selection serves OTG_HS was not restated by any source. Open item MODULE-CLOCK-TREE-RESTATE. CRS sync from USB SOF is broken only on rev Y silicon (ES0392 §2.2.3; rev X/V not affected).
- **PLL3.** Its MCLK role ends. What clocks the SAI2 kernel, and whether PLL3 is then needed at all, is part of MODULE-CLOCK-TREE-RESTATE.

*Not in force:* "Fractional-mode jitter is not quantified ... PLL3 runs in fractional mode ... The bring-up audio measurements (spec step 4) are the check" (`CORE-BRIEF.md` §5b; `SCHEMATIC-CHECKLIST.md` BU-22). The split spec §9.3 reworks BU-22: "PLL3 jitter no longer affects the codec, which runs from the XO". The oscillator's jitter is carried in open item CODEC-DOMAIN-BRINGUP.

## 6. SDRAM

[SDRAM-COMPATIBILITY.md][sd] decides which × 16 TSOP-II-54 SDRAMs the platform accepts and gives the FMC values per density class. It was written for v1; on the split the SDRAM, its FMC bank and its timing are unchanged and only three control pins move ([EC-SDRAM-CONTROL-PINS](#ec-sdram-control-pins)). Its inputs: SDCLK 92.5 MHz (§5); the module's 3V3 at 3.392 V nominal, 3.274–3.513 V with tolerances ([power.md](power.md) §5); TA ≤ 85 °C, which the processor's own thermal limits keep the board inside ([PW-TJ](decisions.md#pw-tj); [R-20](decisions.md#r-20) claims nothing above 85 °C). Sources: Alliance AS4C16M16SA Rev 3.0 (LCSC mirror), Winbond W9825G6KH Rev A04, Micron 256Mb SDR Rev W (LCSC mirror), ISSI IS42S16320F Rev C4, RM0433 Rev 8 §22.9, DS12110 Rev 11 Tables 167 and 169 (rev V; Tables 70 and 72 for rev Y).

### 6.1 Classes and parts

| | AS4C16M16SA | W9825G6KH | MT48LC16M16A2 | IS42S16320F |
| --- | --- | --- | --- | --- |
| Class | Baseline (32 MB) | Baseline | Baseline | Optional (64 MB) |
| Rows / columns / banks | 13 / 9 / 4 | 13 / 9 / 4 | 13 / 9 / 4 | 13 / 10 / 4 |
| Refresh | 8192 / 64 ms | 8K / 64 ms at TA ≤ 85 °C | 8192 / 64 ms | 8K / 64 ms |
| VDD, VDDQ | 3.0–3.6 V | 3.0–3.6 V | 3.0–3.6 V | 3.0–3.6 V (IS42**S** only; IS42**R** is 2.3–2.7 V and excluded) |
| Grades read | -6, -7 | -5/-5I, -6/-6I/-6J/-6L, -75/75J/75L | -6A, -7E, -75 (die revisions D and G) | -6, -7 |
| Verdict | Compatible with the baseline class | Compatible with the baseline class | Compatible with the baseline class, at CL = 3 | Compatible with the optional class |

Every part covers the module's 3.274–3.513 V. Each verdict applies to the part's TSOP-II ordering codes at TA ≤ 85 °C with the class configuration below ([SDRAM-COMPATIBILITY.md §2, §5][sd]). The fitted part is the W9825G6KH-6I ([EC-SDRAM-CLASS](#ec-sdram-class)).

**Pinout.** All four datasheets give the same 54-pin × 16 assignment pin for pin (VDD 1, 14, 27; VSS 28, 41, 54; VDDQ 3, 9, 43, 49; VSSQ 6, 12, 46, 52; DQ0–DQ7 on 2, 4, 5, 7, 8, 10, 11, 13; DQ8–DQ15 on 42, 44, 45, 47, 48, 50, 51, 53; LDQM 15, UDQM 39; WE#, CAS#, RAS#, CS# on 16–19; BA0, BA1 on 20, 21; A10/AP 22; A0–A3 on 23–26; A4–A9 on 29–34; A11 35; A12 36; CKE 37; CLK 38; pin 40 NC). Only names differ (Winbond's BS0/BS1). A12 is a row address in all four, because both classes have 8192 rows. Pin 40 is NC in all four and stays unconnected, as OSCAR leaves it. BA0 and BA1 sit on FMC_A14 and FMC_A15 (RM0433 Table 195). The JEDEC standard itself was not obtained (open item SDRAM-SOURCES-RECHECK).

### 6.2 CAS latency 3 at 92.5 MHz

Every candidate grade meets tCK at CL = 3 (the slowest CL = 3 minimum is 7.5 ns; tCK is 10.811 ns). **CL = 3 is chosen for both classes**, because CL = 2 fails for part of the Micron family: its -6A CL = 2 rating is "Not applicable for Revision D" (Table 12 note 6), and the read timing below.

#### FIG-SDRAM-READ-SLACK

**Read slack at the MCU is 1.411 ns at CL = 3, before any trace delay; CL = 2 would be −0.689 ns with a Micron -6A:G.** Inputs: FMC kernel period 5.4054 ns (185 MHz); tw(SDCLK) min = 2 × Tfmc_ker_ck − 1 = 9.811 ns and data setup tsu(SDCLKH_Data) ≥ 3 ns (DS12110 Table 167, rev V); worst tAC at CL = 3 = 5.4 ns; Micron -6A:G tAC at CL = 2 = 7.5 ns; other parts at CL = 2 = 6 ns. Method: the FMC samples read data on its SDCLK rising edge; the SDRAM drives data tAC after its own clock edge one period earlier, so slack = tw(SDCLK) min − tAC max − tsu: 9.811 − 5.4 − 3 = 1.411 ns; 9.811 − 7.5 − 3 = −0.689 ns; 9.811 − 6.0 − 3 = 0.811 ns. Read hold: th = 0 ns, and every part holds data tOH ≥ 2.5 ns (≥ 1.8 ns for Micron with no load). Source: [SDRAM-COMPATIBILITY.md §3][sd]. Paper analysis of an unbuilt board.

**Layout consequence.** With RPIPE = 0, the SDCLK flight time plus the DQ flight time must stay under 1.411 ns, less any margin the layout keeps (open item SDRAM-LAYOUT-TIMING).

#### FIG-SDRAM-WRITE-SETUP

**Address and command setup slack 1.905 ns; write-data setup slack 2.405 ns on rev V silicon (0.405 ns on rev Y).** Inputs: half of tw(SDCLK) min, 4.905 ns, assumed for each clock phase (DS12110 gives only the period: open item SDRAM-BRINGUP-TEST); td(SDCLKL_Add) 1.5 ns; td(SDCLKL_Data) 1.0 ns rev V (Table 169), 3.0 ns rev Y (Table 72); the SDRAM's tAS, tCMS and tDS 1.5 ns. Method: the FMC changes outputs on SDCLK's falling edge and the SDRAM samples on the next rising edge, so slack = 4.905 − td − 1.5. Hold: the FMC holds data 0 ns and commands 0.5 ns past the next falling edge, about half a period after the sampling edge, against tAH/tDH/tCMH ≤ 1.0 ns. Source: [SDRAM-COMPATIBILITY.md §3][sd]. Paper analysis of an unbuilt board.

### 6.3 FMC configuration per class

The board uses SDRAM bank 1 only (SDNE0/SDCKE0); FMC_SDCR1 and FMC_SDTR1 carry every value, and FMC_SDCR2 and FMC_SDTR2 stay at reset (RM0433 §22.9.5: SDCLK, RBURST and RPIPE exist only in FMC_SDCR1; TRP and TRC come only from FMC_SDTR1; with one device FMC_SDTR2.TWR "must be kept at reset value (0xF)"). These are analysis results that firmware takes as constraints ([firmware-facing-requirements.md](firmware-facing-requirements.md) §2).

#### FIG-FMC-SDTR1

**FMC_SDTR1 timings in SDCLK cycles, baseline / optional: TRCD 2 / 2, TRP 2 / 2, TRAS 5 / 4, TRC 7 / 6, TWR 3 / 2, TXSR 7 / 7, TMRD 2 / 2.** Inputs: tCK = 10.8108 ns; the worst part and grade in each class: TRCD and TRP from AS4C -7 (21 ns) / ISSI -6 (18 ns); TRAS from W9825 -75 (45 ns) / ISSI -6 (42 ns), used as the minimum self-refresh period; TRC from Micron -7E tRFC 66 ns and -75 tRC/tRFC 66 ns / ISSI tRC 60 ns (RM0433: TRC must cover tRC and tRFC); TXSR from W9825 -75 and Micron -75 75 ns / ISSI -6 70 ns; TMRD from AS4C -7 14 ns / ISSI -7 14 ns. Method: each worst-case time divided by tCK and **rounded up** (e.g. 21 / 10.8108 = 1.943 → 2; 66 / 10.8108 = 6.105 → 7); TWR is the largest of the datasheet tWR (2 cycles in both classes) and RM0433's constraints TWR ≥ TRAS − TRCD (5 − 2 = 3 baseline; 4 − 2 = 2 optional) and TWR ≥ TRC − TRCD − TRP (7 − 2 − 2 = 3; 6 − 2 − 2 = 2). Every baseline field is at least the optional one, so the baseline value also meets every optional-class timing. tRRD (worst 15 ns, 2 cycles) is not an FMC field. Source: [SDRAM-COMPATIBILITY.md §4.1][sd]. Paper analysis of an unbuilt board.

**Register values** (RM0433 §22.9.5; FMC_SDTR1 fields hold cycles − 1):

| Register | Baseline (32 MB) | Optional (64 MB) | Fields |
| --- | --- | --- | --- |
| FMC_SDCR1 | **0x0000 19D9** | **0x0000 19DA** | NC 9 columns (01) or 10 (10); NR 13 rows (10); MWID 16 bits (01); NB four banks (1); CAS 3 cycles (11); WP 0; SDCLK kernel / 2 (10); RBURST 1; RPIPE 00 |
| FMC_SDTR1 | **0x0112 6461** | **0x0111 5361** | TMRD, TXSR, TRAS, TRC, TWR, TRP, TRCD from FIG-FMC-SDTR1, each − 1 |
| FMC_SDRTR | **0x0000 057C** | **0x0000 057C** | COUNT 702, REIE 0, CRE 0 |

The arithmetic: baseline FMC_SDCR1 = 0x1 + 0x8 + 0x10 + 0x40 + 0x180 + 0x800 + 0x1000 = 0x19D9, optional the same with NC 0x2; baseline FMC_SDTR1 = 0x1 + (6 << 4) + (4 << 8) + (6 << 12) + (2 << 16) + (1 << 20) + (1 << 24) = 0x01126461; optional 0x1 + (6 << 4) + (3 << 8) + (5 << 12) + (1 << 16) + (1 << 20) + (1 << 24) = 0x01115361. RBURST = 1 follows RM0433 §22.9.3; RPIPE = 0 follows from FIG-SDRAM-READ-SLACK and is OSCAR's tested setting; RBURST and RPIPE change only after a precharge-all command.

#### FIG-SDRAM-REFRESH

**FMC_SDRTR COUNT = 702, a refresh every 7.600 µs against the 7.8125 µs the parts require.** Inputs: 8192 rows per 64 ms in both classes; SDCLK 92.5 MHz; RM0433's 20-cycle margin "if an internal refresh request occurs when a read request has been accepted". Method: 64 ms / 8192 = 7.8125 µs = 722.656 SDCLK cycles, rounded **down** to 722 (a longer interval would violate tREF); COUNT = 722 − 20 = 702 (0x2BE); interval (COUNT + 1) / 92.5 MHz = 7.600 µs; register = COUNT << 1 = 0x057C. Checks: COUNT ≥ 41; COUNT is not TWR + TRP + TRC + TRCD + 4 (18 baseline, 16 optional). The 2.7 % gap is far larger than the crystal's tolerance. **The 64 ms figure holds for TA ≤ 85 °C only**: grades rated to 105 °C (Winbond -6J/75J, ISSI A2, Micron AT) need 16 ms above 85 °C, which COUNT = 702 does not provide. Source: [SDRAM-COMPATIBILITY.md §4.2][sd]. Paper analysis of an unbuilt board.

**Initialization sequence** (RM0433 §22.9.3; the delays and counts are the largest any part in either class needs, so one sequence serves both): write FMC_SDCR1 then FMC_SDTR1; clock-configuration enable (FMC_SDCMR 0x0000 0011, SDCKE driven high); wait **≥ 200 µs** with the clock running (AS4C16M16SA and W9825G6KH; Micron and ISSI need 100 µs); precharge all (0x0000 0012); auto-refresh × 8 (0x0000 00F3; W9825G6KH requires 8, the others ≥ 2); load mode register with MRD 0x230 (0x0004 6014); write FMC_SDRTR 0x0000 057C; FMC_SDCR1.WP already 0. **Mode register 0x230**: burst length 1 (RM0433 requires BL = 1), sequential, CAS latency 3, standard operation, single-location writes, reserved bits 0. AS4C16M16SA's note 11 says to bring CKE high after the 200 µs, while its Figure 22 draws CKE high through it; the FMC raises SDCKE at the clock-enable command, which matches Figure 22 and Micron's sequence. The source records this as a datasheet inconsistency, not a failure ([SDRAM-COMPATIBILITY.md §2, §4.3, §4.4][sd]).

**Not verified** ([SDRAM-COMPATIBILITY.md §6][sd]), each named in an open item: the JEDEC TSOP-II-54 × 16 pinout (JESD21-C not obtained; the four datasheets and OSCAR's footprint agree, which is evidence of a common pinout, not a check against JEDEC) and the AS4C16M16SA revision (only Rev 3.0, "Advanced", was found), the Micron revision (LCSC's mirror, not confirmed as Micron's latest) and each part's ordering status: SDRAM-SOURCES-RECHECK. tRRD (RM0433 has no field and does not describe Activate-to-Activate spacing; two Activates are at least TRCD + 1 = 3 cycles = 32.4 ns ≥ 15 ns apart *if* the controller works as §22.9.3 describes, which is inferred, not stated) and the SDCLK duty cycle (FIG-SDRAM-WRITE-SETUP assumes half-period phases): SDRAM-BRINGUP-TEST. The trace delays the slacks above leave out: SDRAM-LAYOUT-TIMING.

**Bring-up** (original spec, *Bring-up sequence* step 3; split spec §12.4 step 2, BU-07), in this order: walking 1s and 0s on the data bus; address-line alias test; full-memory pattern test; pseudo-random fill and verify; **sustained** pseudo-random verify while SAI audio DMA and the caches are active. On a board whose fitted class and FMC configuration disagree, this test is what catches it (original spec *SDRAM*). Open item SDRAM-BRINGUP-TEST.

## 7. QSPI flash

[CORE-BRIEF.md §2, §5b][cb], [D11](decisions.md#d11) (ruling); split spec §6.1: "W25Q128JV on bank 1, Unchanged".

- **One Winbond W25Q128JV** (128 Mbit) on QUADSPI bank 1, with a 10 kΩ pull-up on its chip select and 100 nF decoupling. OSCAR's second flash on bank 2 is not fitted, freeing PH2, PH3, PG9 and PG14.
- **On the module the flash holds data, not code**: code runs from the H743's internal 2 MB flash (original spec *Architecture decisions*: "Code runs from the internal 2 MB. One W25Q128JV SPI/QSPI NOR is fitted for data"; split spec §11: "our module (H743 ... internal flash)"). On a Seed the application runs from the Seed's own QSPI flash through the Daisy bootloader ([firmware-facing-requirements.md](firmware-facing-requirements.md) §3).
- **Clock: 60 MHz at 50 % duty**, QUADSPI kernel from HCLK 240 MHz, prescaler /4. The W25Q128JV datasheet (Winbond Revision F, 27 Mar 2018, §9.6) allows FR ≤ 133 MHz at 3.0–3.6 V and ≤ 104 MHz at 2.7–3.0 V for every instruction except Read Data (03h), which is limited to 50 MHz, and asks for a clock high and low time of at least 45 % of the period. An odd QUADSPI divider gives unequal phases ("The clock signal remains low one cycle longer than it stays high", RM0433 QUADSPI_CR.PRESCALER): /3 would have given 80 MHz at 33 % high time. /4 gives 60 MHz at 50 %, with margin to 104 MHz over the whole supply range. **Firmware must use the fast-read instructions (0Bh, 3Bh, 6Bh, BBh, EBh), not 03h, at this clock** ([firmware-facing-requirements.md](firmware-facing-requirements.md) §5).

## 8. Reset, boot, debug and the module's USB socket

- **NRST** ([D14](decisions.md#d14), owner-approved): 10 kΩ pull-up (OSCAR's 4.7 kΩ changed), 100 nF to VSS, the RESET button to VSS, the SWD NRST, and a TLV803EA30DBZR supervisor driving NRST open drain, sensing the module's 3V3 at the MCU. Thresholds and margins: [power.md](power.md) §5.3.
- **BOOT0** (pin 166, [D6](decisions.md#d6)): 4.7 kΩ pull-down to VSS, 100 nF to VSS, and the BOOT button to VDD, with a pogo pad ([D15](decisions.md#d15)). The buttons sit on the module and need not be reachable in a closed enclosure ([O-12](decisions.md#o-12), owner). OSCAR used PTS645 right-angle through-hole switches; the platform needs only tactile switches.
- **SWD** ([D9](decisions.md#d9)): the 2 × 5 1.27 mm Cortex debug header (VTref, SWDIO, SWCLK, SWO optional, NRST, GND) and pogo pads for SWDIO, SWCLK, NRST, the module's 3V3 and GND. OSCAR's header had no VTref and no NRST. SWD is the guaranteed recovery path (split spec §6.4).
- **The module's own USB socket for ROM DFU** ([O-11](decisions.md#o-11), owner; [R-60](decisions.md#r-60), ruling). PA11/PA12 (USB_OTG_FS DM/DP) go to a vertical 16-pin USB 2.0 Type-C receptacle, **HRO TYPE-C-31-E-17** (LCSC C7424785; 454 in stock, read 2026-10-06, a dated observation), on the module's component face with its mouth toward the back plate, with ESD protection; CC1 (A5) and CC2 (B5) each 5.1 kΩ 1 % Rd to GND; DP1/DP2 and DN1/DN2 joined at the receptacle to PA12/PA11 through the ESD part. Height 6.00 ± 0.1 mm, under the PTS645's 6.2 mm; its courtyard (x 18.00 … 29.03, y 45.23 … 50.47 mm from contract pin 1) keeps the contract outline unchanged; a straight plug enters with the back plate off. The module requirement **USB-DFU-VERTICAL** ([LAYOUT-CARRYFORWARD.md][lcf]; [S1 ledger R-60][ledger]) carries the work that was never done: the drawing's recommended land pattern (16 pads 0.30 × 0.69 mm at 0.50 mm pitch, four shell tabs, two Ø0.50 +0.1 mm peg holes), confirmation that the drawing's layout note "THICKNESS 0.8±0.10MM" does not bind a 1.6 mm module, the 12.85 × 7 mm plug column kept clear of every module part taller than the receptacle, and the part and footprint themselves. Bench note: the plug's removal force (up to 2.0 kgf) pulls on the module, so hold the module while withdrawing the plug. Open item USB-DFU-VERTICAL. The underlying `task-17-research-A.md` was never committed to the pedals repository and is not in its history; the ledger entry R-60 is the record.

*Not in force:* the right-angle HCTL HC-TYPE-C-16P-01A for the module's socket, whose mouth faced J_OUT_R 9.2 mm away in layout B ([R-60](decisions.md#r-60)).

How firmware updates and recovery use these paths, and the limits on them, is [firmware-facing-requirements.md](firmware-facing-requirements.md) §3 and §6.

## 9. Identification

Split spec §6.5:
- **Module type** is read from the flash-size register at 0x1FF1E880: the STM32H743xI has 2 MB of flash, the Seed's STM32H750xB 128 KB. The values the register reads are not stated in RM0433 Rev 8, DS12110 Rev 10 or DS12556 Rev 7; by RM0433's encoding (the size in Kbytes) the datasheet sizes give 0x0800 and 0x0080, which are derived values ([facts.md §5][facts]). Open item FLASH-SIZE-REGISTER.
- **Module revision** is a resistor strap on a free module ADC pin, with the same divider scheme as the audio board's HW_REV ([analog.md](analog.md) §11). A Seed has no such strap, and firmware does not read it when it detects a Seed. The pin is not assigned (§10). `facts.md` §3 checked one candidate the pedals S2 plan had named, PB0, and found it is not an ST system-bootloader pin; that is a check on a candidate, not an assignment.
- **Audio board revision** is HW_REV on interface pin 29, on the pedal ([analog.md](analog.md) §11).

## 10. The module's internal MCU pin assignments

The contract fixes only the 40 interface pins ([architecture.md](architecture.md) §4.3). **The module's internal MCU pin assignments (SDRAM, QSPI, HSE, SWD, the DFU socket on PA11/PA12, the module identification strap) are `MODULE_PINS` in `circuits/h7-platform/module-pins.ts`, the derived map; this section does not restate it.** Each assignment cites its source there, and `tests/circuits/h7-module-pins.test.ts` checks every function against ST's pin data and every port and net against the contract's 31 interface pins; the ID strap's pin is the controller ruling [CR-MODULE-ID-STRAP-PIN](decisions.md#cr-module-id-strap-pin). What follows is what the map was derived from. Where the pedals repository records them:
- [CORE-BRIEF.md §6][cb], "OSCAR's pin assignments (starting point for Task 8)": OSCAR_PROC_01's SDRAM, SAI1, flash, USB, SWD, HSE and dedicated pins, by LQFP-176 position, each signal checked against ST's `STM32H743IITx.xml`. It is what OSCAR and v1 started from, and that is all it is.
- [h7-platform/PINMAP.md][pinmapmd] and [h7-platform/pinmap.json][pinmap]: v1's generated pin map (the v1 schematic is not an authority, and the pin map was retired in favour of the contract, [O-7](decisions.md#o-7)).
- The changes the split made to it: split spec §6.2 ([D23](decisions.md#d23) moves three SDRAM control pins; v1's PI4, PI5, PH6, PH9, PG12, PB0, PB12, PB13, PD3–PD7, PE2–PE6 and PA9 become unallocated and analog-mode, apart from PA11/PA12, which go to the module's USB socket, and PA9/PA10, which stay unallocated).
- ST's pin data as the pedals repository vendored it: [vendor/st-pin-data/STM32H743IITx.xml][stpin] (with the two STM32H750IB files beside it).
- The split spec planned a hand-authored module-internal pin file (`module-pins.json`, §10.2) merged with the contract and refused on any port or net used twice. It was never written; no such file exists at the pinned commit.

Split spec §6.2 states that none of the 31 interface ports collides with the SDRAM, QSPI, HSE or SWD pins, "checked against `pinmap.json`; the plan's contract gate re-checks it mechanically". That re-check never ran on the split; it runs now, as `checkPinMap` (`circuits/h7-platform/pin-map-check.ts`) under `tests/circuits/h7-module-pins.test.ts`. Open item MODULE-INTERNAL-PIN-MAP (closed).

## 11. What did not cross

- `CORE-BRIEF.md` §2's OSCAR reference designators and §6's pin tables, as fact (§10 says where they are).
- The generated v1 pin map (`PINMAP.md`, `pinmap.json`) and the firmware pin header generated from it.
- The codec, analog, power, relay and USB-C parts of `CORE-BRIEF.md` and the split spec, which the other topic documents carry.
- The pedals generator's gate 8 (OSCAR equivalence) and its subcircuit names, which were tooling.
- `SDRAM-COMPATIBILITY.md`'s datasheet SHA-256 prefixes; its sources are named in §6 above and the pinned file keeps the hashes.

## 12. Open items this document raises or relies on

In [open-items.md](open-items.md): MCU-SILICON-AND-BOOTLOADER-ID, HSE-CRYSTAL-CHECKS, MODULE-CLOCK-TREE-RESTATE, SDRAM-BRINGUP-TEST, SDRAM-LAYOUT-TIMING, SDRAM-SOURCES-RECHECK, USB-DFU-VERTICAL, MODULE-INTERNAL-PIN-MAP (raised here); SAI-KERNEL-CLOCK-SLAVE, FLASH-SIZE-REGISTER, MCU-LONGEVITY, MCU-TJ-MEASURE, FIRMWARE-POWER-OBLIGATIONS, OSCAR-AUDIO-LICENCE-L1, CODEC-DOMAIN-BRINGUP, DATASHEET-REVISIONS-RECHECK (reused).

[cb]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/CORE-BRIEF.md
[sd]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/SDRAM-COMPATIBILITY.md
[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
[plat]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-09-30-h7-pedal-platform-design.md
[facts]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/facts.md
[ledger]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-05-h7-split-rulings.md
[lcf]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/LAYOUT-CARRYFORWARD.md
[checklist]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/SCHEMATIC-CHECKLIST.md
[pinmapmd]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/PINMAP.md
[pinmap]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/pinmap.json
[stpin]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/vendor/st-pin-data/STM32H743IITx.xml
