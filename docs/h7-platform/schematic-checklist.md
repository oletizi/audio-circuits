# h7-platform schematic checklist: the circuit items

Ported from:
- [h7-platform/SCHEMATIC-CHECKLIST.md][chk]: the preamble, §1 to §8 (CORE, CODEC, PWR, AIO, CTL, USB, ALL and the OWN items), §10 and §11; its §9 (BU-01 to BU-29) is [bring-up.md](bring-up.md)
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §9.2 (the OWN items), §9.3 (the board each checklist item now belongs to, and what it changes), §9.4 (the CORE-BRIEF deltas the items cite), §6.2, §7.1 to §7.5

`SCHEMATIC-CHECKLIST.md` was the per-sheet list the v1 schematic of the STM32H743 digital pedal platform (h7-platform) was drawn and checked against: one board, before the split. This document keeps its **circuit items under their original identifiers**, says which of the split's boards each belongs to (split spec §9.3 tags every item: the processor module **h7-module** or the audio pedal board **h7-pedal**), and gives each item's meaning on the split. The bring-up carrier ([O-13](decisions.md#o-13), owner) reuses the h7-pedal codec circuit where it can ([architecture.md](architecture.md) §7), so the CODEC items bind it there too. It records the design as it stood in the pedals repository at commit `5b926d0`; no board has been modelled or drawn in this repository.

**What is dropped.** Items that test the pedals repository's old schematic generator or its gates, rather than the circuit, are not carried; §9 lists each with its reason, for the README's map.

**How each item is carried.**
- **Linked, not restated**, where a topic document already carries the item's content. The topic document is then the authority, with its inputs and sources.
- **Stated here** where no topic document carries it (pin-level wiring, straps and notes the analyses did not need).
- **"v1 contained"** marks a part number (MPN, LCSC code) that only `SCHEMATIC-CHECKLIST.md` specifies. **That is what v1 contained, which is all it is**: not a part chosen for the split boards, which phase 2 chooses. Where [parts.md](parts.md) already carries the part, the item links there instead.
- A value or wiring the split replaced appears only on a line beginning *Not in force:*, with the source that replaced it.

**Every figure here is paper analysis of a board that has not been built.** Decisions are linked by anchor into [decisions.md](decisions.md), whose labels this document follows. The label names (U_MCU, R_DIV1, …) are `SCHEMATIC-CHECKLIST.md`'s functional labels, used to identify a part in this document only.

**Full scale and input impedance.** Full scale is 7.62 Vp-p into 10 kΩ at both jacks ([AN-D1](decisions.md#an-d1), owner); "≥ 1 MΩ input" means resistive input impedance ([AN-D2](decisions.md#an-d2), owner). The checklist's rule "where `POWER.md` and `ANALOG.md` give different analog values, `ANALOG.md` wins" is applied in [analog.md](analog.md).

## 1. CORE (MCU, SDRAM, flash, crystal): h7-module

Split spec §9.3: "CORE 01–23, 26, 27: h7-module"; CORE-24 moves to the pedal; CORE-25 still applies.

- **CORE-01** · h7-module · Every VDD pin (15, 23, 36, 49, 62, 72, 82, 91, 103, 127, 136, 149, 159, 172: 14 pins, from ST's pin data) on the module's 3.3 V rail, each with its own 100 nF X7R at the pin ([processor-and-memory.md](processor-and-memory.md) §4; the capacitor's part, CL10B104KB8NNNC, is in [parts.md](parts.md)). The item's annotation clause is dropped (§9).
- **CORE-02** · h7-module · One ≥ 4.7 µF ceramic for the package, near the MCU ([processor-and-memory.md](processor-and-memory.md) §4; AN4938 §2.2). v1 contained: CL21A475KAQNNNE, 4.7 µF 25 V X5R 0805 (LCSC C1779).
- **CORE-03** · h7-module · Every VSS pin (14, 22, 48, 61, 71, 90, 102, 113, 126, 135, 148, 158) on GND (ST's pin data).
- **CORE-04** · h7-module · VCAP1 (pin 81) and VCAP2 (pin 125) joined into one net, 2.2 µF ±20 %, ESR < 100 mΩ, X7R on each pin, connected to no supply ([processor-and-memory.md](processor-and-memory.md) §4; [D7](decisions.md#d7)). MLCC ESR at these values is typically tens of mΩ, but the catalogue gives no guaranteed figure (open item CHECKLIST-PARTS-PARAMETRICS). A stock KiCad symbol that types both pins `power_out` raises an ERC power-output conflict on the joined net (`SCHEMATIC-CHECKLIST.md` ALL-07). v1 contained: 2 × CL21B225KAFNNNE, 2.2 µF 25 V X7R 0805 (C19110).
- **CORE-05** · h7-module · VDD33USB (pin 114) on the 3.3 V rail with 100 nF **plus 1 µF** ([processor-and-memory.md](processor-and-memory.md) §4). v1 contained: CL10A105KB8NNNC (C15849).
- **CORE-06** · h7-module · VBAT (pin 6) tied to the 3.3 V rail, with 100 nF ([processor-and-memory.md](processor-and-memory.md) §4).
- **CORE-07** · h7-module · VDDA (pin 39) fed through FB_VDDA, BLM21PG221SN1D ([D17](decisions.md#d17), owner-approved; [parts.md](parts.md) §1), with the VDDA bank on the MCU side, from VDDA to VSSA ([processor-and-memory.md](processor-and-memory.md) §4). On the split the bank must meet the wideband requirement and gains a damping leg: [analog.md](analog.md) [EC-VDDA-WIDEBAND](analog.md#ec-vdda-wideband) and §9.3 ([R-18](decisions.md#r-18), [R-57](decisions.md#r-57)); open items VDDA-WIDEBAND and VDDA-DAMPING-LEG.

*Not in force:* CORE-07's bank of 2 × 100 nF + 2 × 2.2 µF as sufficient for the module: [R-57](decisions.md#r-57) finds the present bank over VREF_A's wideband limit and requires the resonance of [analog.md](analog.md) EC-VDDA-WIDEBAND. v1 contained for it: C1591 and C19110.

- **CORE-08** · h7-module · VREF+ (pin 38) tied to VDDA (pin 39); VSSA (pin 37) to GND through a 0 Ω R_VSSA ([processor-and-memory.md](processor-and-memory.md) §4). On the split the VDDA net also leaves the module on interface pin 21 as VREF_A, and the pots, the expression reference and HW_REV reach it there, on the pedal ([D16](decisions.md#d16), owner-approved, as revised by split spec §9.4). v1 contained: 0603WAF0000T5E (C21189).
- **CORE-09** · h7-module · PDR_ON (pin 171) tied to the 3.3 V rail ([processor-and-memory.md](processor-and-memory.md) §4; [D7](decisions.md#d7)).
- **CORE-10** · h7-module · NRST (pin 31): 10 kΩ pull-up, 100 nF to GND, the Reset switch to GND, the supervisor's RESET output, SWD header pin 10, and a pogo pad ([processor-and-memory.md](processor-and-memory.md) §8; [D14](decisions.md#d14), owner-approved). v1 contained: 0603WAF1002T5E, 10 kΩ 1 % (C25804).
- **CORE-11** · h7-module · The supervisor TLV803EA30DBZR ([parts.md](parts.md) §1): RESET (open drain) to NRST; VDD on the 3.3 V rail sensed at the MCU's VDD pins ([layout-carry-forward.md](layout-carry-forward.md) §2); GND. The symbol's pinout is the plain DBZ variant, **pin 1 GND, pin 2 RESET, pin 3 VDD** (the "R" and "V" pinout variants differ; SLVSES2J Table 6-1). C_SUP 100 nF X7R from pin 3 to pin 1, at the pin (SLVSES2J §8.3.1). Thresholds and margins: [power.md](power.md) §5.3.
- **CORE-12** · h7-module · BOOT0 (pin 166): 4.7 kΩ pull-down to GND, 100 nF to GND, the BOOT switch to the 3.3 V rail, a pogo pad; BOOT0 is a dedicated pin ([processor-and-memory.md](processor-and-memory.md) §8; [D6](decisions.md#d6)). v1 contained: 0603WAF4701T5E, 4.7 kΩ (C23162; the same code is R_CRST's in [parts.md](parts.md) §3).
- **CORE-13** · h7-module · The 25 MHz HSE crystal between PH0/HSE_IN (pin 29) and PH1/HSE_OUT (pin 30), both case pads to GND: [processor-and-memory.md](processor-and-memory.md) §3 and [parts.md](parts.md) §1 carry the part, its LCSC code and its margin.
- **CORE-14** · h7-module · Load capacitors C_HSE1 = C_HSE2 = 8 pF C0G, one from each crystal pin to GND, no series resistor ([processor-and-memory.md](processor-and-memory.md) §3; trimmed at bring-up, BU-05). v1 contained: CC0603CRNPO9BN8R0, 8 pF 50 V NP0 (C327316).
- **CORE-15** · h7-module · PC14/PC15 (pins 9/10, the LSE pins) left unconnected: the LSE is not used (`CORE-BRIEF.md` §6).
- **CORE-16** · h7-module, reworded by split spec §9.3 · PB15 is not pulled low by anything on the module: AN2606 Rev 70 Table 135 says PB15 held low blocks every bootloader interface. On the split PB15 is the pedal's USB D+ on pin 37, and a host's D+ pull-down could hold it low during a BOOT0 entry with a cable attached; hence the rule to unplug the pedal's USB-C before BOOT0 recovery (split spec §6.4; [firmware-facing-requirements.md](firmware-facing-requirements.md) §6; open item RECOVERY-PATH-CHECKS). PA10 stays unallocated (split spec §6.2).

*Not in force:* CORE-16's "PB14, PA10 left free": PB14 is the pedal's USB D− on pin 36 (split spec §5.3, §6.4).

- **CORE-17** · h7-module, re-run against the new map (split spec §9.3) · Which contract pins double as ST ROM-bootloader pins, and what they meet in boot mode: [firmware-facing-requirements.md](firmware-facing-requirements.md) §7, "While a bootloader runs", and [architecture.md](architecture.md) §8, from `facts.md` §3 (open item FB-AN2606). For the module's internal pins, v1's note stands as v1 wrote it: OSCAR's FMC and QSPI pins that double as bootloader pins (PF0/PF1 I2C2, PE11–PE14 SPI4, PB10 USART3_TX) see a high-impedance SDRAM (SDNE0 pulled up) and a deselected flash (NCS pulled up) in boot mode, so they are harmless. No source re-ran it against the split's module pins, whose assignment is open item MODULE-INTERNAL-PIN-MAP.

*Not in force:* CORE-17's note on PA4 (HW_REV) as SPI1_NSS and PA6 (POT6) as SPI1_MISO with the pot's 10 kΩ limiting contention: v1's pin assignment, replaced by the contract's ([architecture.md](architecture.md) §4.3).

- **CORE-18** · h7-module · The SDRAM: Winbond W9825G6KH-6I, with the approved alternates: [processor-and-memory.md](processor-and-memory.md) §6.1 and [parts.md](parts.md) §1, §7.
- **CORE-19** · h7-module, changed by split spec §9.3 · SDRAM pins on the FMC nets (W9825G6KH pin numbers, TSOP-II-54):

  | SDRAM pin | Net | SDRAM pin | Net |
  |---|---|---|---|
  | 23, 24, 25, 26 (A0–A3) | SDRAM_A0–A3 | 2, 4, 5, 7 (DQ0–DQ3) | SDRAM_D0–D3 |
  | 29–34 (A4–A9) | SDRAM_A4–A9 | 8, 10, 11, 13 (DQ4–DQ7) | SDRAM_D4–D7 |
  | 22 (A10/AP) | SDRAM_A10 | 42, 44, 45, 47 (DQ8–DQ11) | SDRAM_D8–D11 |
  | 35 (A11), 36 (A12) | SDRAM_A11, SDRAM_A12 | 48, 50, 51, 53 (DQ12–DQ15) | SDRAM_D12–D15 |
  | 20 (BS0), 21 (BS1) (Winbond's names; BA0/BA1 elsewhere) | SDRAM_BA0, SDRAM_BA1 | 15 (LDQM) / 39 (UDQM) | SDRAM_NBL0 / SDRAM_NBL1 |
  | 16 (WE#) | SDRAM_NWE | 37 (CKE) | SDRAM_CKE |
  | 17 (CAS#) | SDRAM_NCAS | 38 (CLK) | SDRAM_CLK |
  | 18 (RAS#) | SDRAM_NRAS | 19 (CS#) | SDRAM_NE |

  Pin 40 (NC) unconnected (`SDRAM-COMPATIBILITY.md` §2.1). On the split SDRAM_NWE, SDRAM_NE and SDRAM_CKE reach the MCU on PH5, PH3 and PH2 ([D23](decisions.md#d23), owner-approved; [processor-and-memory.md](processor-and-memory.md) [EC-SDRAM-CONTROL-PINS](processor-and-memory.md#ec-sdram-control-pins)). The MCU side of every other net is open item MODULE-INTERNAL-PIN-MAP.
- **CORE-20** · h7-module · SDRAM VDD (1, 14, 27) and VDDQ (3, 9, 43, 49) on the 3.3 V rail, each with its own 100 nF at the pin; VSS (28, 41, 54) and VSSQ (6, 12, 46, 52) on GND ([processor-and-memory.md](processor-and-memory.md) §2).
- **CORE-21** · h7-module · A 10 kΩ pull-up on SDRAM_NE to the 3.3 V rail ([processor-and-memory.md](processor-and-memory.md) §2). v1 contained: C25804.

*Not in force:* CORE-21's "SDRAM_CKE lands on the PC3_C pad (pin 35)": SDCKE0 moves to PH2 ([D23](decisions.md#d23)); [D13](decisions.md#d13) is withdrawn (split spec §9.4).

- **CORE-22** · h7-module · The SDRAM layout note: [layout-carry-forward.md](layout-carry-forward.md) §2 carries its rules; the read budget is [processor-and-memory.md](processor-and-memory.md) FIG-SDRAM-READ-SLACK and FIG-SDRAM-WRITE-SETUP. The note's conversion of that budget to about 200 mm of round trip used an estimated 6–7 ps/mm on FR-4, a typical figure and not a measured stack-up value (open item SDRAM-LAYOUT-TIMING).
- **CORE-23** · h7-module · The flash W25Q128JVSIQ, SOIC-8 208 mil ([parts.md](parts.md) §1; [processor-and-memory.md](processor-and-memory.md) §7). **The IQ suffix is required**: QE = 1 is fixed at the factory, so pins 3 and 7 are IO2/IO3 and never /WP or /HOLD; an IM or JM part would need pull-ups there. Pins: 1 /CS = FLASH_NCS with a 10 kΩ pull-up to the 3.3 V rail; 2 FLASH_IO1; 3 FLASH_IO2; 4 GND; 5 FLASH_IO0; 6 FLASH_CLK; 7 FLASH_IO3; 8 the 3.3 V rail with 100 nF at the pin (W25Q128JV Rev F §4.1). Its layout note is in [layout-carry-forward.md](layout-carry-forward.md) §2.
- **CORE-24** · h7-pedal (moved by split spec §9.3) · The HW_REV strap on interface pin 29: [analog.md](analog.md) §11 carries the divider (from VREF_A), its revision table, its 100 nF and its TCR. v1 contained, for its revision 1 values: R_top 0603WAF2002T5E, 20.0 kΩ 1 % (C4184), and R_bot 0603WAF2491T5E, 2.49 kΩ 1 % (C22908). Which code each split board carries is not stated by any source read ([analog.md](analog.md) §11).

*Not in force:* CORE-24's strap from VREF+ on PA4 (pin 50) on the one board; the split puts it on the pedal from VREF_A on interface pin 29 (split spec §6.5, §9.3).

- **CORE-25** · h7-module firmware · DAC1 stays disabled: PA4 is DAC1_OUT1 and PA5 is DAC1_OUT2, and on the split both carry inputs from the pedal (split spec §9.3, "still applies (PA4, PA5)"; [firmware-facing-requirements.md](firmware-facing-requirements.md) §7).
- **CORE-26** · h7-module layout · The MCU's thermal copper: [layout-carry-forward.md](layout-carry-forward.md) §2 ([PW-TJ](decisions.md#pw-tj), owner; [OWN-06](decisions.md#own-06)).
- **CORE-27** · h7-module · Unused MCU pins get no external resistor and stay in their reset state, analog mode; the unused debug pins move to analog mode at boot: [firmware-facing-requirements.md](firmware-facing-requirements.md) §7 (RM0433 Rev 8 §11.3.1, §11.3.13, §11.4.1).

*Not in force:* CORE-27's "PB8/PB9 unconnected while the CODEC-10 I2C links are DNF": split spec §9.3, "PB8/PB9 are the I²C expansion bus, pulled up on the audio board".

## 2. CODEC (PCM3060): h7-pedal

Split spec §9.3: "CODEC 01–13: h7-pedal. Rewritten: CODEC-05 …, CODEC-07 …, CODEC-10 …, CODEC-11 …. Added: XO, codec VDD regulator, series resistors, SAI domain isolation". The codec domain the split adds is [analog.md](analog.md) §13 and §14.

- **CODEC-01** · h7-pedal · The PCM3060PWR, TSSOP-28 ([parts.md](parts.md) §3).
- **CODEC-02** · h7-pedal · VCC (pin 24) from 5V_A through the 0 Ω position of PWR-15, with 100 nF + 10 µF to AGND at the pin; VDD (pin 7) with 100 nF + 10 µF to DGND (pin 8) at the pin (SLAS533B "Power Supply Pins": 0.1 µF ceramic plus 10 µF "as close to the pins as possible"). On the split VDD comes from the codec's own regulator on 5V_A ([D22](decisions.md#d22), owner-approved; [analog.md](analog.md) §13.3). The 10 µF part is in [parts.md](parts.md).

*Not in force:* CODEC-02's "VDD (pin 7) on 3V3_D": split spec §7.3 and [D22](decisions.md#d22) give VDD a local 3.3 V regulator on 5V_A.

- **CODEC-03** · h7-pedal · VCOM (pin 21): 100 nF + 10 µF to AGND at the pin, the 10 µF holding its value at 2.5 V bias (X7R 16 V 1206, or tantalum). **No other connection to VCOM**: its allowable load is ±1 µA, and the ADC bias comes from VBIAS_L/VBIAS_R ([analog.md](analog.md) §6.1; SLAS533B "VCOM Pin").
- **CODEC-04** · h7-pedal · AGND1 (23), AGND2 (22), SGND (16) and DGND (8) all on the one GND net, each with a via at the pin, joined under the part (SLAS533B "Grounding"; [power.md](power.md) §10; [D18](decisions.md#d18)).
- **CODEC-05** · h7-pedal, rewritten by split spec §9.3 · RST (pin 15) from the local reset, driven by the power-on reset and the power-fail supervisor ([analog.md](analog.md) [EC-CODEC-RESET](analog.md#ec-codec-reset), §13.4; [D21](decisions.md#d21), owner-approved; [RR-11](decisions.md#rr-11)).

*Not in force:* CODEC-05's RST = CODEC_RST from the MCU (PI4), with a not-fitted 10 kΩ pull-down: [D4](decisions.md#d4) is withdrawn (split spec §9.4).

- **CODEC-06** · h7-pedal · MODE (pin 28): **220 kΩ ± 5 % to DGND** for hardware mode with differential VOUT (SLAS533B "Mode Control" and "MODE Pin"; [analog.md](analog.md) §7.1; [D2](decisions.md#d2)), plus a **not-fitted 0 Ω** from MODE to DGND for the I²C option. v1 contained: 0603WAF2203T5E, 220 kΩ 1 % (C22961).
- **CODEC-07** · h7-pedal, rewritten by split spec §9.3 · MS/ADR/IFMD (pin 27) to the codec's VDD: ADC master at 256 fS, DAC slave, and I²C address bit 0 = 1 in a future software-mode build ([D20](decisions.md#d20), owner-approved; [analog.md](analog.md) §13.1).

*Not in force:* CODEC-07's pin 27 "tied directly to DGND" (ADC slave, DAC slave): split spec §7.2 and [D20](decisions.md#d20).

- **CODEC-08** · h7-pedal · MC/SCL/FMT (pin 1): **4.7 kΩ to VDD**. FMT high selects 24-bit left-justified, the format the interface carries ([architecture.md](architecture.md) §4.6); the resistor doubles as the SCL pull-up (SLAS533B "Parallel Hardware Control"). v1 contained: C23162.
- **CODEC-09** · h7-pedal · MD/SDA/DEMP (pin 2): **4.7 kΩ to DGND**, de-emphasis off; plus a **not-fitted 4.7 kΩ pull-up to VDD**, the SDA pull-up for I²C mode (SLAS533B "Parallel Hardware Control"). v1 contained: C23162.
- **CODEC-10** · h7-pedal, rewritten by split spec §9.3 · The I²C links: pin 1 and pin 2 each through a **not-fitted 0 Ω** to the I²C expansion bus nets EXP_I2C_SCL and EXP_I2C_SDA (interface pins 12/13; [D2](decisions.md#d2)). The sheet note stands: "I2C mode = fit both links, fit MODE 0 Ω (CODEC-06) and remove the 220 kΩ, remove the pin-2 4.7 kΩ pull-down and fit the DNF pull-up." v1 contained: C21189.
- **CODEC-11** · h7-pedal, rewritten by split spec §9.3 · SCKI1 (6) and SCKI2 (9) from the 12.288 MHz oscillator; BCK1 (5) and BCK2 (10), LRCK1 (4) and LRCK2 (11), and DOUT (3) through the series resistors and the domain isolation to the socket; DIN (12) from the socket through the isolation; ZEROL (14) and ZEROR (13) left open ([analog.md](analog.md) §13.2, §14; [D20](decisions.md#d20)).

*Not in force:* CODEC-11's SCKI1/SCKI2 on CODEC_MCLK from the MCU: split spec §7.2 and [D20](decisions.md#d20).

- **CODEC-12** · h7-pedal · VOUTL+ (20), VOUTL− (19), VOUTR+ (18) and VOUTR− (17) to the output stages with AIO-15's leg assignment; VINL (25) and VINR (26) from the ADC drivers (AIO-12).
- **CODEC-13** · h7-pedal layout · The codec's placement across the zones, its DOUT load and the SAI terminations: [layout-carry-forward.md](layout-carry-forward.md) §3.

## 3. POWER: split between the boards

Split spec §9.3: "PWR-01–04, 08–13, 15, 17 to the pedal (02–04 reworked into two branches …). PWR-05–07 to the module. PWR-06 EN reworked (§6.3). PWR-14 sequencing reworked (§5.6.5, §7.3). PWR-16 split. PWR-18 replaced by §7.4's circuit. Added: pedal digital rail (§7.5); VIN_MOD, 3V3_D and VREF_A contract items (§5.6)". The split's power tree is [power.md](power.md) §1.

- **PWR-01** · h7-pedal · The DC jack takes a 5.5 × 2.1 mm plug, **centre negative** (centre pin GND, sleeve +V), and is plastic-bodied or isolated from the enclosure because its sleeve is +V ([power.md](power.md) §1, §10). v1's part is a study assumption on the split ([parts.md](parts.md) §5; split spec §9.2 leaves it to S2; open item DC-JACK-FIT).
- **PWR-02** · h7-pedal, reworked into two branches · The reverse-polarity element is one PMEG4030ER per branch, D_AIN and D_MIN ([power.md](power.md) §1, §3; [R-35](decisions.md#r-35)).

*Not in force:* PWR-02's single series Schottky D_REV from the jack to VIN_SCH: split spec §7.4 splits it per branch.

- **PWR-03** · h7-pedal, reworked into two branches · The input filter and the bulk: [power.md](power.md) §3.2 and §4.5 (the reservoir on VIN_A; the input ferrite, whose place on the split pedal is an S2 choice, open item HOT-PLUG-PEAK). The parts are in [parts.md](parts.md) §2.
- **PWR-05** · h7-module · The buck's input filter: L_FILT, C_BIN1/C_BIN2, C_BINHF and the damping pair R_DAMP 0.22 Ω 1 % 0805 with C_DAMP 47 µF 35 V aluminium, in series from VIN_BUCK to GND ([power.md](power.md) §4.2; [parts.md](parts.md) §1). v1 contained for R_DAMP: Yageo RL0805FR-070R22L (C327215).
- **PWR-06** · h7-module, EN reworked · The buck TPS62933F: [power.md](power.md) §5.2 carries RT floating (500 kHz), the soft start that must not float, the bootstrap with its 0 Ω footprint, and the 32.4 kΩ / 10.0 kΩ feedback; its EN from VIN_MOD is [power.md](power.md) §4.1 ([D24](decisions.md#d24), owner-approved). Pin-level: RT (pin 1) carries a no-connect flag; VIN (3) = VIN_BUCK; GND (4); SW (5) to L_BUCK; BST (6); SS/PG (7); FB (8). v1 contained: R_FBT 0603WAF3242T5E, 32.4 kΩ 1 % (C13187); R_FBB 10.0 kΩ 1 % (C25804); R_BST 0 Ω (C21189).

*Not in force:* PWR-06's EN divider from 5V_A (100 kΩ over 40.2 kΩ, v1 40.2 kΩ 0603WAF4022T5E, C12447) and BUCK_EN carrying the power-fail supervisor's RESET: [D24](decisions.md#d24) takes EN from VIN_MOD, and split spec §9.3 replaces PWR-18.

- **PWR-07** · h7-module · L_BUCK and the output capacitors C_BOUT1 to C_BOUT3 plus 100 nF ([power.md](power.md) §5.2; [parts.md](parts.md) §1).
- **PWR-08** · h7-pedal · U_LDO, TPS7A4901DGNR, on VIN_A: [power.md](power.md) §7 carries the input and output capacitors, EN tied to IN, the 32.4 kΩ / 10.0 kΩ feedback (5.024 V), CNR/SS and CFF. Pin-level, from SBVS121E: IN (8); EN (5) tied to IN; OUT (1) = 5V_A; FB (2); NR/SS (6); **pin 7 (DNC) connected to nothing, not even GND**, with a no-connect flag; NC (3) open or GND; GND (4) tied to the PowerPAD, and the PowerPAD to the GND plane with vias (its via drills: [layout-carry-forward.md](layout-carry-forward.md) §3). v1 contained: R_LDOT 0603WAF3242T5E (C13187), R_LDOB 10.0 kΩ (C25804).
- **PWR-09** · h7-pedal · The mid-rail divider, 2 × 100 kΩ 0.1 % 25 ppm/°C from VIN_A to GND, with 10 µF 50 V X7R at the node ([power.md](power.md) §7; [analog.md](analog.md) §5). v1 contained: Yageo RT0805BRD07100KL, "100 kΩ ±0.1 % ±25 ppm/°C, 150 V, 125 mW" (C122537).
- **PWR-10** · h7-pedal · The VMID buffers, one OPA1688 per pedal, channel A to VMID_L and B to VMID_R, each a plain unity-gain follower with no output capacitor and no isolation resistor, each input fed from the divider through 10.0 kΩ 1 % ([analog.md](analog.md) §5; [parts.md](parts.md) §3). v1 contained for the 10.0 kΩ: C25804.
- **PWR-11** · h7-pedal · Every OPA1688 package's V+ pin (8) with 100 nF + 10 µF 50 V to GND, including U_ADC on 5V_A; V− (4) on GND (SBOS724A layout guidelines). The capacitor parts are in [parts.md](parts.md).
- **PWR-12** · h7-pedal and h7-module · Capacitor voltage ratings. Every capacitor on the input-voltage nets (v1: VIN_SCH, VIN_PROT, VIN_BUCK) is rated ≥ 35 V (aluminium) or 50 V (ceramic). *This document's reading, not a source's:* on the split those nets are VIN, VIN_A and VIN_MOD on the pedal and VIN_MOD and VIN_BUCK on the module, since each sees the same 18 V condition (split spec §6.3, "every part on VIN_MOD is rated for the 18 V input condition with derating"; §9.3 moves PWR-05 to the module). The rest as v1 listed: signal ceramics on VMID-referred nodes 50 V; the signal electrolytics C_AC and C_DC 25 V (up to 17.5 V across them); the buck's 22 µF outputs 25 V; the LDO's output and the codec's 10 µF parts 16 V. The survival analysis behind them is [power.md](power.md) §3.7 and §8 ([PS-18V](decisions.md#ps-18v), owner).
- **PWR-14** · both, reworked · Sequencing: the codec's VCC up before VDD and down after it, now held by its local regulator and clamp ([analog.md](analog.md) §13.3); the module's own supervisor covers the MCU; every crossing inside IF-PD-1 ([power.md](power.md) §9; [architecture.md](architecture.md) §4.8).

*Not in force:* PWR-14's sequencing through the buck's EN divider on 5V_A, with U_PF's RESET on BUCK_EN: split spec §7.3 ("v1's method is gone"), [D24](decisions.md#d24), and §9.3's replacement of PWR-18.

- **PWR-15** · h7-pedal · An 0805 0 Ω, fitted, in series between the LDO's output and the codec's VCC decoupling, a bring-up option for a ferrite; no ferrite on 5V_A otherwise ([analog.md](analog.md) §13.1 joins 5V_A_CODEC through it; [power.md](power.md) §7 records the position as v1's; BU-04). v1 contained: 0805W8F0000T5E (C17477).
- **PWR-16** · split by split spec §9.3 · The test pads: [layout-carry-forward.md](layout-carry-forward.md) §3, "Test pads"; no source settles the split (open item TEST-PAD-SPLIT and its conflict entry).
- **PWR-17** · both, layout · One GND net, an unsplit layer-2 GND plane, placement zones, and the buck's hot loop: [layout-carry-forward.md](layout-carry-forward.md) §1 and §2; [power.md](power.md) §10.
- **PWR-18** · h7-pedal, replaced by split spec §7.4's circuit · The power-fail supervisor and its override: [power.md](power.md) §3; [bypass-relay.md](bypass-relay.md) §4 and [EC-POWER-FAIL-OVERRIDE](bypass-relay.md#ec-power-fail-override). The supervisor TPS3808G01 and the 0.1 % divider parts are in [parts.md](parts.md) §2.

*Not in force:* PWR-18 as v1 wrote it, U_PF sensing VIN_PROT with its RESET on BUCK_EN; [bypass-relay.md](bypass-relay.md) §9 carries its history line.

**Added by split spec §9.3:** the pedal digital rail 3V3_P ([power.md](power.md) §6); the VIN_MOD, 3V3_D and VREF_A contract items ([power.md](power.md) §4, §5.4; [analog.md](analog.md) §9).

## 4. AUDIO I/O: h7-pedal

Split spec §9.3: "AIO 01–21: h7-pedal. AIO-07, AIO-14 (and PWR-10, PWR-11) take the analog branch rail. AIO-19 coil supply on the pedal digital rail. AIO-20 gains the supervisor override and the RELAY_EN series resistance; R_BPD kept". Per channel, L and R identical; the op-amps are one dual package per function, channel A = L and B = R. [analog.md](analog.md) §6 and §7 carry the stages and their values, with `ANALOG.md`'s names (its R1, R2, C1, C2 are this list's R_DIV1, R_DIV2, C_COMP, C_AC at the input). v1's 0.1 % resistors were Yageo RT0805BRD (0805, ±0.1 %, ±25 ppm/°C, 150 V).

- **AIO-01** · h7-pedal · Two input jacks used as TS (R, RN and SN open); the **right input's tip-normal contact connects to the left tip net**, so the right front end follows the left source with no plug in the right jack ([analog.md](analog.md) §6.2; the jack part is in [parts.md](parts.md) §5).
- **AIO-02** · h7-pedal · R_RF 1.0 kΩ in series from FX_IN_x (the input relay's NO contact), C_RF 100 pF C0G 50 V to GND ([analog.md](analog.md) §6.3; [OWN-02](decisions.md#own-02)); an input test pad on the R_RF/C_RF node with a GND pad beside it. v1 contained: R_RF C21190; C_RF CL10C101JB8NNNC (C14858).
- **AIO-03** · h7-pedal · R_PD 22 MΩ to GND on the jack side of C_IN ([analog.md](analog.md) §6.2). v1 contained: 0805W8F2205T5E (C34719).
- **AIO-04** · h7-pedal · C_IN 47 nF C0G 50 V 1206 ([analog.md](analog.md) §6.3). v1 contained: TDK C3216C0G1H473JT000N, "47 nF 50 V C0G ±5 %" (C342651).
- **AIO-05** · h7-pedal · R_DIV1 1.50 MΩ 0.1 % from C_IN to node T, with C_COMP 110 pF C0G ±2 % across it ([analog.md](analog.md) §6.2, §6.4). v1 contained: RT0805BRD071M5L (C865285); CC0603GRNPO9BN111 (C519475).
- **AIO-06** · h7-pedal · R_DIV2 1.00 MΩ 0.1 % from node T to **this channel's** VMID_x; C_T 160 pF C0G ±2 % from T to GND; ±5 % capacitors are not acceptable ([analog.md](analog.md) §6.2, §6.4). v1 contained: RT0805BRD071ML (C706228); CC0603GRNPO9BN161 (C3860559).
- **AIO-07** · h7-pedal · U_IN, an OPA1688 unity follower on VIN_A (the analog branch rail), input at node T ([analog.md](analog.md) §6.4).
- **AIO-08** · h7-pedal · C_AC 22 µF 25 V aluminium, + toward U_IN, then R_IN 10.0 kΩ 1 % to U_ADC's inverting input ([analog.md](analog.md) §6.5; the electrolytic is in [parts.md](parts.md) §3). v1 contained for R_IN: C25804; v1 also named Panasonic EEE-FK1E220R (C178541) as meeting the same ≥ 25 V requirement.
- **AIO-09** · h7-pedal · U_ADC, an OPA1688 inverting stage on **5V_A** (not the analog branch rail): R_FA 10.0 kΩ 1 % ∥ C_FA 47 pF C0G ([analog.md](analog.md) §6.5). v1 contained: R_FA C25804; C_FA CC0603GRNPO9BN470 (C519455).
- **AIO-10** · h7-pedal · U_ADC's non-inverting input on VBIAS_x: 2 × 2.00 kΩ 0.1 % from 5V_A to GND with 10 µF X7R at the node, one node per channel, not tied to VCOM and not shared ([analog.md](analog.md) §6.1). v1 contained: RT0805BRD072KL (C865384).
- **AIO-11** · h7-pedal · No clamp at node T or at VINx; the only external diode on the input is the jack-side ESD diode; no VCOM-fed bias and no series resistor at VINx ([analog.md](analog.md) §6.6).
- **AIO-12** · h7-pedal · U_ADC's output through R_O 100 Ω to VINL/VINR, with C_VIN 2.2 nF C0G to GND at the codec pin; DC-coupled ([analog.md](analog.md) §6.5). v1 contained: C_VIN CL10C222JB8NNNC (C33353); the 100 Ω's code is in [parts.md](parts.md).
- **AIO-13** · h7-pedal · C_A+ and C_A− 10 µF 50 V X7R, one in series with each DAC leg ([analog.md](analog.md) §7.1).
- **AIO-14** · h7-pedal · U_OUT, an OPA1688 difference amplifier on VIN_A: R_D1 = R_D2 20.0 kΩ 0.1 %; R_FO = R_GO 19.1 kΩ 0.1 % 25 ppm; C_FO = C_GO 47 pF C0G ±2 % across R_FO and R_GO; R_GO returns to **this channel's** VMID_x ([analog.md](analog.md) §7.1). v1 contained: RT0805BRD0720KL (C469660); RT0805BRD0719K1L (C706224); CC0603GRNPO9BN470 (C519455).
- **AIO-15** · h7-pedal · **Leg assignment**: VOUTx+ → C_A+ → R_D1 → inverting input; VOUTx− → C_A− → R_D2 → non-inverting input. Left: pin 20 inverting, pin 19 non-inverting; right: pin 18 inverting, pin 17 non-inverting. Firmware passes samples unnegated on this basis; swapping legs needs a recorded firmware negation ([analog.md](analog.md) §7.1).
- **AIO-16** · h7-pedal · R_S 100 Ω after the feedback tap; C_OUT 220 pF C0G from the R_S/C_DC node to GND ([analog.md](analog.md) §7.4, where C_OUT is "C_O"). v1 contained: C_OUT CL10C221JB8NNNC (C27675).
- **AIO-17** · h7-pedal · C_DC 22 µF 25 V aluminium, + toward the op-amp, then FX_OUT_x (the output relay's NO contact); R_B 100 kΩ bleed from FX_OUT_x to GND; an output test pad on FX_OUT_x with a GND pad beside it, so bring-up sees the output stage in either relay state ([analog.md](analog.md) §7.3; [bypass-relay.md](bypass-relay.md) §2).
- **AIO-18** · h7-pedal · Two output jacks used as TS (TN, R, RN and SN open) ([parts.md](parts.md) §5).
- **AIO-19** · h7-pedal · The bypass relays and their pin map: [bypass-relay.md](bypass-relay.md) §2.1; the coils on 3V3_P ([bypass-relay.md](bypass-relay.md) [EC-COIL-RAIL](bypass-relay.md#ec-coil-rail)).
- **AIO-20** · h7-pedal, gains the override · The relay drive: [bypass-relay.md](bypass-relay.md) §5.2, [EC-RELAY-GATE](bypass-relay.md#ec-relay-gate) and [EC-POWER-FAIL-OVERRIDE](bypass-relay.md#ec-power-fail-override); the gate network values are [R-13](decisions.md#r-13)'s. That bypass-relay document carries v1's gate network on its history line.
- **AIO-21** · h7-pedal · The jack ESD diodes, four PESD12VL1BA,115, input diodes on IN_TIP_x and output diodes on OUT_JACK_x, the jack side of the relays ([analog.md](analog.md) §6.6; [OWN-03](decisions.md#own-03), owner); their placement is [layout-carry-forward.md](layout-carry-forward.md) §3.

## 5. CONTROLS: h7-pedal

Split spec §9.3: "CTL 01–10: h7-pedal. CTL-01, CTL-07, CTL-08 reference VREF_A …. CTL-05 LED anodes on the pedal digital rail. CTL-02 bootloader note re-run …. CTL-05 gates on PC8/PC9. Added: series resistors on the switch inputs that share the Seed's SDMMC1 pins …. CTL-01 and CTL-03 become the six control positions (O-18)".

- **CTL-01** · h7-pedal, becomes the six control positions · Each position fitted per effect with a pot from VREF_A to GND, its wiper through 10.0 kΩ to 100 nF X7R at the pin, or a button ([analog.md](analog.md) §12; [O-18](decisions.md#o-18), owner; [mechanical-and-controls.md](mechanical-and-controls.md) §4). v1 contained for the 10.0 kΩ: C25804.
- **CTL-02** · h7-pedal, re-run by split spec §9.3 · Which control pins are ST ROM-bootloader pins, and what that means: [firmware-facing-requirements.md](firmware-facing-requirements.md) §7, "While a bootloader runs" (split spec §9.3: "PA3 is POT2, PA2 is now SAI2 SCK"). Firmware samples each control channel at ≤ 10 kHz (BU-10).
- **CTL-03** · h7-pedal, becomes the six control positions · A button fit pulls up to 3V3_D and puts nothing on VREF_A ([analog.md](analog.md) §12; [architecture.md](architecture.md) §4.7). The series resistors on the switch inputs that share the Seed's SDMMC1 pins are the split's addition ([architecture.md](architecture.md) §4.5, "The Daisy bootloader and the SD pins"; [R-22](decisions.md#r-22)).

*Not in force:* CTL-03's three on-off-on toggles on PD2 to PD7 with internal pull-ups and 1.00 kΩ series resistors: removed under [O-18](decisions.md#o-18).

- **CTL-04** · h7-pedal · The footswitch nodes: a 10 kΩ pull-up to 3V3_D and 100 nF from the node to GND, then a series resistor to the pin; the inputs' 250 mV Schmitt hysteresis (DS12110 Table 147) turns the slow RC edge into one transition, and firmware polls at the block rate and debounces in a 5 ms window ([R-22](decisions.md#r-22), which sets the series resistor; [firmware-facing-requirements.md](firmware-facing-requirements.md) §9). The switch itself is the hung-board footswitch of [mechanical-and-controls.md](mechanical-and-controls.md) §5.

*Not in force:* CTL-04's E-Switch FS5700 footswitch (replaced under [O-17](decisions.md#o-17)) and its 1.00 kΩ series resistor to PG10/PG11 (replaced by [R-22](decisions.md#r-22) and the contract pins).

- **CTL-05** · h7-pedal · Each LED switched low side by an N-MOSFET whose gate is driven through a series resistor (v1: 100 Ω) from LED1 / LED2 (PC8 / PC9 on the split), with a gate pull-down so the LED is off while the module is not driving it; the LED anode from **3V3_P** through R_LED, cathode to the drain, source to GND (split spec §7.5, §9.3; [power.md](power.md) §6.3; the pull-down's value is [R-13](decisions.md#r-13)'s, 10.0 kΩ). v1 contained: Diodes BSS138-7-F, VGS(th) 0.5–1.5 V (C40912). [bypass-relay.md](bypass-relay.md) §5.2 records that the BSS138's RDS(on) at a 3.3 V gate is typical only.

*Not in force:* CTL-05's LED anodes on 3V3_D, gates on PH6/PH9 and the 100 kΩ gate pull-down: split spec §7.5 and [R-13](decisions.md#r-13).

- **CTL-06** · h7-pedal · R_LED 100 Ω: [power.md](power.md) §6.3 ([R-27](decisions.md#r-27)).
- **CTL-07** · h7-pedal · The expression ring reference, from VREF_A through the blocking network: [analog.md](analog.md) §9.6 and §10.1 ([R-17](decisions.md#r-17), [R-19](decisions.md#r-19); the ±5 V ring limit is [AN-RING](decisions.md#an-ring)).

*Not in force:* CTL-07's R_REF 1.00 kΩ 1206 straight from VREF+ to the ring (v1 contained: Uniroyal 1206W4F1001T5E, C4410) and its back-feed argument into VDDA: [R-19](decisions.md#r-19) sets R_REF at 3.30 kΩ, and [R-17](decisions.md#r-17) blocks back-feed into the unpowered module.

- **CTL-08** · h7-pedal · The expression tip: R_TIP 22.0 kΩ in series, 1 nF C0G and 10 MΩ to GND, into the follower U_EXP on VREF_A with 100 nF at its VDD pin, then 1.00 kΩ and 100 nF X7R at the ADC pin ([analog.md](analog.md) §10.2, §10.3, which adds the split's 2.2 MΩ input resistor). U_EXP is the MCP6001T-I/OT ([parts.md](parts.md) §3) with **the standard SOT-23-5 pinout: 1 VOUT, 2 VSS, 3 VIN+, 4 VIN−, 5 VDD**, not the R or U variant; its bypass within 2 mm (DS20001733L §4.4). v1 contained: R_TIP C31850; 10 MΩ C7250; 1.00 kΩ C21190.
- **CTL-09** · h7-pedal · The expression jack: TRS with a ring-normal contact, convention ring = reference, tip = wiper, sleeve = GND; plug detect on EXPR_DETECT ([analog.md](analog.md) §10.3). v1 contained: 1.00 kΩ C21190; 100 kΩ C25803.

*Not in force:* CTL-09's detect on PG12, "No plug: PG12 high (3.24 V)": split spec §6.2 frees PG12, and [analog.md](analog.md) §10.3 gives the split's detect level.

- **CTL-10** · h7-pedal · The expression jack's two ESD diodes, PESD12VL1BA,115, on the tip on the jack side of R_TIP and on the ring on the jack side of the ring reference, each GND pad on its own via at the jack terminal ([analog.md](analog.md) §10.2, §6.6; [OWN-03](decisions.md#own-03), owner).

## 6. USB, EXPANSION AND DEBUG: split between the boards

Split spec §9.3: "USB-01–05, 08, 09 to the pedal; USB-03's divider is re-derived for PA1 (the `PW` §5.2 ratio ≤ 0.76 was for FT pin PA9). USB-06, 10 to the module. USB-07 split".

- **USB-01** · h7-pedal · The pedal's USB-C receptacle: CC1 (A5) and CC2 (B5) each 5.1 kΩ 1 % to GND, separately; D+ (A6, B6) joined and D− (A7, B7) joined, now to pins 37/36 through the USB isolation switch ([R-14](decisions.md#r-14); [architecture.md](architecture.md) §4.3); SBU1/SBU2 open; the GND pins to GND at the connector. v1 contained: HCTL HC-TYPE-C-16P-01A, OSCAR's part (C2894897); the 5.1 kΩ 0603WAF5101T5E (C23186).
- **USB-02** · h7-pedal · VBUS (A4, B4, A9, B9) goes only to the ESD part's pin 5, its capacitor (USB-04) and the VBUS-sense divider. **VBUS is on no power rail**: USB does not power the pedal (original spec *USB-C*; [firmware-facing-requirements.md](firmware-facing-requirements.md) §6).
- **USB-03** · h7-pedal, re-derived for PA1 · The VBUS-sense divider to pin 31 (PA1): [architecture.md](architecture.md) §4.8 and [analog.md](analog.md) §14.4 ([FIG-VBUS-HOTPLUG](analog.md#fig-vbus-hotplug); open item VBUS-HOTPLUG). The OTG VBUS comparators are not used; VBUS is read as a GPIO level ([firmware-facing-requirements.md](firmware-facing-requirements.md) §6). v1's low-VBUS margin argument rested on the USB 2.0 specification, which was not opened (open item USB2-SPEC-UNREAD).

*Not in force:* USB-03's 22.0 kΩ / 47.0 kΩ divider to PA9 and its margins against PA9's limits: split spec §9.3 re-derives the divider for PA1; [firmware-facing-requirements.md](firmware-facing-requirements.md) §6 carries the same history line.

- **USB-04** · h7-pedal · The USBLC6-2SC6 at the connector ([parts.md](parts.md)): D+ and D− through I/O1 (pins 1↔6) and I/O2 (pins 3↔4); pin 2 GND to the plane at the connector; pin 5 to VBUS with C_VBUS 100 nF X7R 50 V from pin 5 to GND at the part. No series resistors or pull-ups on the data lines. Why C_VBUS: the part steers a positive surge on I/O1 or I/O2 through its upper diode into the pin-5 node, clamped there by the internal Zener, and ST's layout figure shows 100 nF on VBUS at the pin (Doc ID 11265 Rev 5 §2.1, Figures 15, 18); VBUS here carries nothing else but the divider, so without the capacitor that node has no low-impedance return but the cable. Whether 100 nF is inside USB 2.0's device VBUS capacitance limit was not checked (open item USB2-SPEC-UNREAD); the data sheet's revision is open item DATASHEET-REVISIONS-RECHECK. The capacitor part is in [parts.md](parts.md).
- **USB-05** · h7-pedal · The shield: the shell to GND through R_SHLD 1 MΩ ∥ C_SHLD 4.7 nF 2 kV X7R 1206, at the connector, a 2 kV capacitor because the shell takes ESD ([power.md](power.md) §10; original spec *USB-C* left the values to that phase). v1 contained: R_SHLD 0805W8F1004T5E, 150 V (C17514); C_SHLD FH 1206B472K202NT (C41017).
- **USB-06** · h7-module · The SWD header, 2 × 5 1.27 mm ([D9](decisions.md#d9); [processor-and-memory.md](processor-and-memory.md) §8; the part is in [parts.md](parts.md) §1): pin 1 VTref = the module's 3.3 V; 2 SWDIO (PA13); 3, 5 GND; 4 SWCLK (PA14); 6 SWO **not connected**; 7 key/NC; 8 NC; 9 GNDDetect to GND; 10 NRST. Checked on 2026-10-02 against Arm's "Cortex-M Debug Connectors" overview, which matches; the formal definition it cites (CoreSight Components TRM DDI0314H, appendix C) was not retrieved (open item SWD-PINOUT-FORMAL-SPEC).
- **USB-07** · split by split spec §9.3 · The pogo and audio pads: [layout-carry-forward.md](layout-carry-forward.md) §3, "Test pads"; open item TEST-PAD-SPLIT and its conflict entry.
- **USB-08** · h7-pedal · The MIDI UART header, not fitted, 1 × 4 2.54 mm: 1 = 3V3_D, 2 = MIDI_UART_TX, 3 = MIDI_UART_RX, 4 = GND; on the split to pins 14/15 and 3V3_D from pin 38 ([architecture.md](architecture.md) §6; [R-23](decisions.md#r-23); [OWN-04](decisions.md#own-04)). v1 contained: XFCN PZ254V-11-04P (C492403).

*Not in force:* USB-08's TX and RX on PB13/PB12: split spec §6.2 frees them; the contract puts MIDI on PB6/PB7 ([architecture.md](architecture.md) §4.3).

- **USB-09** · h7-pedal · Relay footprints: only K_BYP_IN and K_BYP_OUT ([OWN-01](decisions.md#own-01), owner; [bypass-relay.md](bypass-relay.md)).
- **USB-10** · h7-module · The Reset and BOOT0 tactile switches, SPST momentary: Reset to GND (CORE-10), BOOT0 to the 3.3 V rail (CORE-12); on the module, not reachable in a closed enclosure ([processor-and-memory.md](processor-and-memory.md) §8; [O-12](decisions.md#o-12), owner).

## 7. ALL SHEETS: both boards

Split spec §9.3: "ALL 01–09: Both designs. ALL-03 reads 'contract nets'. ALL-05 lists each design's sheets. ALL-08 covers the new parts".

- **ALL-03** · both · The interface nets use the contract's net names ([architecture.md](architecture.md) §4.3; open item CONTRACT-MODEL-CHECK).
- **ALL-04** · both · One GND net; no separate AGND/DGND nets ([D18](decisions.md#d18), owner-approved).
- **ALL-08** · both · A lifecycle check of every part (fitted and not fitted), recorded with its date and source, before the schematic is drawn and again at the PCBWay quote; a line that is not Active gets a replacement through its design note or a recorded owner acceptance; stock is a dated observation, never a pass condition ([OWN-07](decisions.md#own-07); split spec §9.3 extends it to the split's new parts; open items POWER-PARTS-STOCK and LAYOUT-FAB-NOTES).
- **ALL-09** · h7-pedal · The chassis bond: [PW-CHASSIS](decisions.md#pw-chassis), [power.md](power.md) §10, [layout-carry-forward.md](layout-carry-forward.md) §3; the continuity check is in [bring-up.md](bring-up.md) §6.

## 8. The OWN items

`SCHEMATIC-CHECKLIST.md` §8's owner items, OWN-01 to OWN-07, are entries in [decisions.md](decisions.md), with split spec §9.2's effect on each: [OWN-01](decisions.md#own-01) and [OWN-03](decisions.md#own-03) (owner decisions), [OWN-02](decisions.md#own-02), [OWN-04](decisions.md#own-04), [OWN-05](decisions.md#own-05), [OWN-06](decisions.md#own-06) and [OWN-07](decisions.md#own-07) (controller rulings, labelled there with the ambiguity of their heading). The checklist's pointer to "the open UNVERIFIED checks in `OWNER-DEFAULTS.md`" (OWN-05) is carried by the documents that ported `OWNER-DEFAULTS.md` ([parts.md](parts.md), [mechanical-and-controls.md](mechanical-and-controls.md)).

## 9. Items not carried: they test the old generator or its gates

Each of these existed to satisfy a check in the pedals repository's schematic generator or its gates, not to make the circuit work. Where an item also said something about the circuit, that part is carried in the place named.

- **CORE-01's annotation clause** (the item itself is carried): "U_MCU must be annotated U1", because the pin-map check keyed on that reference. Reference designators belong to KiCad here, not to a checking tool.
- **PWR-04**: the protected rail's net named exactly `VIN_PROT`, because the BOM check found the parts on it by that leaf net name. Split spec §9.3 extends "the VIN_PROT name and AbsMaxV rules" to both branches as rules of that check. The circuit content, the analog and buck branches kept apart in copper, is superseded by the split's two branches ([layout-carry-forward.md](layout-carry-forward.md) §3).
- **PWR-13**: an AbsMaxV field recorded on every active part with a pin on VIN_PROT, and those parts annotated `U` + digit, so the BOM check's ≥ 20 V gate would not skip them. The requirement it enforced, that every part on the input nets survives 18 V with derating, is [power.md](power.md) §3.7 and §8 ([PS-18V](decisions.md#ps-18v)).
- **ALL-01**: Manufacturer, MPN, Supplier and SupplierPart on every part except `#`, `TP`, `H` and `FID` references, the BOM check's field contract. What the fabricator needs from the board file is [layout-carry-forward.md](layout-carry-forward.md) §1.
- **ALL-02**: not-fitted parts marked and still carrying the four BOM fields, because the BOM check did not skip them. The parts that are not fitted are named in their own items (CODEC-06, CODEC-09, CODEC-10, USB-08).
- **ALL-05**: the six hierarchical sheets of the v1 schematic, the generator's repository layout. How a board is drawn here is `TOOLING.md`'s.
- **ALL-06**: functional labels never used as references, and every active part on VIN_PROT annotated `U`, `Q` or `D` + digit for the BOM check's regular expression, with the mapping recorded in v1's verification file. Designators belong to KiCad here (CLAUDE.md, "Ids are semantic; designators belong to KiCad").
- **ALL-07**: KiCad ERC run at warning severity, every waiver recorded in v1's verification file, and the one error-level exclusion (VCAP1/VCAP2) awaiting an owner sign-off. A record of v1's verification, which split spec §8 does not carry as evidence; [decisions.md](decisions.md) records the exclusion as not carried. The circuit fact is under CORE-04.

## 10. What did not cross

- `SCHEMATIC-CHECKLIST.md`'s instruction that the owner draws the schematic and "Task 13" walks the list into `boards/v1/VERIFICATION.md`: v1's process.
- Its §10, the coverage table mapping v1's items to the original spec's requirement lines, with its item count: a record of v1's coverage of a superseded spec. The split's own coverage is split spec §9.3, applied above.
- The JLCPCB parts-API lookups of 2026-10-01 and every stock figure: availability is decided at the PCBWay quote ([OWN-07](decisions.md#own-07)).
- Its §9 (BU-01 to BU-29), which is [bring-up.md](bring-up.md).

## 11. Open items this document raises or relies on

Raised here, in [open-items.md](open-items.md): USB2-SPEC-UNREAD, SWD-PINOUT-FORMAL-SPEC, CHECKLIST-PARTS-PARAMETRICS. Extended here: SDRAM-LAYOUT-TIMING (the 6–7 ps/mm estimate) and DATASHEET-REVISIONS-RECHECK (this checklist's citation of the USBLC6-2 revision). Relied on: VDDA-WIDEBAND, VDDA-DAMPING-LEG, RECOVERY-PATH-CHECKS, FB-AN2606, MODULE-INTERNAL-PIN-MAP, DC-JACK-FIT, HOT-PLUG-PEAK, TEST-PAD-SPLIT, VBUS-HOTPLUG, CONTRACT-MODEL-CHECK, POWER-PARTS-STOCK, LAYOUT-FAB-NOTES.

[chk]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/SCHEMATIC-CHECKLIST.md
[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
