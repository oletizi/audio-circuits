# h7-platform parts

Ported from:
- [h7-platform/OWNER-DEFAULTS.md][own]: "Panel parts at a glance" (OWN-05), OWN-01, and the BOOT0 and Reset switch section
- [h7-platform/CORE-BRIEF.md][cb]: §2, §4 (D1, D5, D8 to D11, D14, D17), §5 (the HSE crystal)
- [2026-10-05-h7-split-rulings.md][ledger] (the S1 rulings ledger): the rulings linked below through [decisions.md](decisions.md)
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §2 (O-2, O-3, O-12, O-17, O-18), §5.1, §5.1.1, §5.1.2, §6.1, §9.2
- [h7-platform/POWER.md][pw] §3.1 (selected parts); [h7-platform/ANALOG.md][an] §3, §5.7, §7.3, §13; [h7-platform/BYPASS-RELAY.md][br] §3; [h7-platform/SCHEMATIC-CHECKLIST.md][chk]: the MCU heading, CORE-18, CORE-23, CODEC-01, USB-04, USB-06 and PWR-18, for LCSC codes, for CORE-18's SDRAM alternates (§7), for the MPN of C1591 (USB-04's C_VBUS, the part §7's C_VBUS option at PA1 uses), and for R_PFB's MPN (PWR-18); [h7-platform/SDRAM-COMPATIBILITY.md][sd]
- The S1 analyses: [power-fail.md][pf] §10, [pedal-digital-rail.md][pdr] §8, [3v3-d.md][d3] §1 to §3, [vin-mod.md][vm] §2, §8, [vref-a.md][vref] §5, [codec-domain.md][cd] §6, [crossings.md][cx] §0, §2, §6, [envelope.md][env] §1, §2, [controls.md][ctl] §1 to §3
- [2026-09-30-h7-pedal-platform-design.md][plat] (the original platform spec): *Architecture decisions*

This is the table of the parts already chosen for the STM32H743 digital pedal platform (h7-platform): for each, its role, its manufacturer part number (MPN), the manufacturer, the LCSC code where a source records one, the board it sits on, who chose it and the source the choice rests on. It records the choices as they stood in the pedals repository at commit `5b926d0`. Nothing here has been built, modelled or drawn in this repository.

**This is not a bill of materials.** A fully specified BOM binds only when someone else sources and places the parts: in phase 4, for the fabrication and assembly package (the port spec's phases; CLAUDE.md, G245). Phase 2 re-authors each board as a model and may change any part a controller ruling chose. **What is listed:** every part the topic documents name by MPN or LCSC code, and every part the S1 parts tables (power-fail.md §10, vin-mod.md §8, pedal-digital-rail.md §8, codec-domain.md §6, crossings.md) and `POWER.md` §3.1 specify by MPN, checked against later rulings. **What is not listed:** parts the sources specify only by value, and the v1-era passives that only `SCHEMATIC-CHECKLIST.md` specifies by MPN (its PWR, AIO, CTL and USB rows: for example the 0.1 % Yageo RT0805 divider and gain resistors, the C0G compensation capacitors, the USB shield RC). Those rows are the checklist's circuit content, which this port carries separately; their values are in the topic documents.

## How to read the table

- **Chosen by** is either an anchor into [decisions.md](decisions.md) or "controller ruling". The labels are decisions.md's. A part named inside an owner decision is a controller part choice, not the owner's decision, unless the owner named the part himself, as he did for the footswitch actuator and the soft button ([O-17](decisions.md#o-17)), or approved a delta whose subject is the part ([D14](decisions.md#d14), [D17](decisions.md#d17)). Where a controller ruling with an entry chose the part, the cell links that entry. "Controller ruling (design note)" means a pedals design note or S1 analysis chose the part and decisions.md has no entry of its own for the choice; the owner may override it like any ruling. "Study assumption" marks a part an S1 study assumed although the split left its choice open.
- **MPN** is as the source writes it. Where a topic document names a part by its family (for example "TPS62933F") and a source gives the orderable code, the cell gives the orderable code and the source is cited.
- **LCSC** is carried only where a source records a code, and the Source cell names that source. "—" means no source records one. Stock counts and prices are not carried: they were dated observations, and availability is decided at the PCBWay quote ([OWN-07](decisions.md#own-07)).
- **Board** is h7-module, h7-pedal, a hung footswitch board (built separately and joined to h7-pedal at final assembly), the enclosure, or the bring-up carrier ([O-13](decisions.md#o-13)).
- **Footprints are not carried as facts.** Every part's footprint must be re-verified against installed KiCad libraries; §8 lists the footprint names the sources give, each marked so.
- A part that is no longer the choice appears only on a line beginning *Not in force:* (§9). A fallback or alternate a source names but does not fit is in §7.
- `K106-E1-11` is the catalogue number of the Omron/ARATAS G6K data sheet, not a different relay.

## 1. The processor module (h7-module)

| Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |
| --- | --- | --- | --- | --- | --- | --- |
| MCU, U_MCU (LQFP-176) | STM32H743IIT6 | STMicroelectronics | C89597 | h7-module | Owner decision [O-3](decisions.md#o-3) (the module keeps the LQFP-176 STM32H743IIT6) | [split spec §2][split]; [original spec][plat], *Architecture decisions*; LCSC from [SCHEMATIC-CHECKLIST.md][chk] (MCU heading); [processor-and-memory.md](processor-and-memory.md) §4 |
| 32 MB SDRAM, U_SDRAM (TSOP-II-54) | W9825G6KH-6I | Winbond | C97572 | h7-module | Controller ruling [D1](decisions.md#d1) (the 32 MB class; the fitted part is named in split spec §6.1) | [CORE-BRIEF.md §4][cb] D1; [split spec §6.1][split]; [SDRAM-COMPATIBILITY.md][sd]; LCSC from [SCHEMATIC-CHECKLIST.md][chk] CORE-18; [processor-and-memory.md](processor-and-memory.md) §6 |
| QSPI NOR flash, U_FLASH, bank 1 (data only) | W25Q128JVSIQ | Winbond | C97521 | h7-module | Controller ruling [D11](decisions.md#d11) (one flash on bank 1) | [CORE-BRIEF.md §2, §4][cb]; [original spec][plat], *Architecture decisions*; [envelope.md §2][env] (the IQ suffix); LCSC from [SCHEMATIC-CHECKLIST.md][chk] CORE-23; [OWNER-DEFAULTS.md][own] (ALL-08 lifecycle list) records it as "not recommended for new design; kept"; [processor-and-memory.md](processor-and-memory.md) §7 |
| 25 MHz HSE crystal, Y_HSE | NX3225GA-25.000M-STD-CRG-2 (NX3225GA 25 MHz, CL 8 pF) | NDK | C1985619 (C438901 is another NX3225GA 25 MHz 8 pF listing) | h7-module | Controller ruling [D8](decisions.md#d8) | [CORE-BRIEF.md §5][cb]; [processor-and-memory.md](processor-and-memory.md) §3 (open item HSE-CRYSTAL-CHECKS) |
| NRST supervisor, U_SUP | TLV803EA30DBZR | Texas Instruments | C5218924 | h7-module | Owner decision [D14](decisions.md#d14) (an owner-approved delta) | [CORE-BRIEF.md §4][cb] D14; [POWER.md §3.1][pw]; [power.md](power.md) §5.3 |
| VDDA ferrite, FB_VDDA | BLM21PG221SN1D | Murata | C85840 | h7-module | Owner decision [D17](decisions.md#d17) (an owner-approved delta), narrowed by [R-57](decisions.md#r-57) (VDDA-WIDEBAND may need a bead with more inductance) | [CORE-BRIEF.md §4][cb] D17; [POWER.md §3.1][pw]; [analog.md](analog.md) EC-VDDA-WIDEBAND |
| 3.3 V buck, U_BUCK | TPS62933FDRLR | Texas Instruments | C5219272 | h7-module | Controller ruling [D5](decisions.md#d5) (the buck, on the module); the part is `POWER.md` §3.3's | [POWER.md §3.1, §3.3][pw]; [power.md](power.md) §5.2 |
| Buck inductor, L_BUCK (WE-XHMI 4.7 µH) | 74439346047 | Würth Elektronik | C6827938 (the source found no LCSC product record for it on 2026-10-06; open item POWER-PARTS-STOCK) | h7-module | Controller ruling (design note) | [POWER.md §3.1][pw]; [pedal-digital-rail.md §8][pdr]; [power.md](power.md) §5.2 |
| Buck output capacitors, C_BOUT1 to C_BOUT3 (22 µF 25 V X5R 1206) | CL31A226KAHNNNE | Samsung | C12891 | h7-module | Controller ruling (design note) | [POWER.md §3.1][pw]; [power.md](power.md) §5.2 (open item MLCC-DC-BIAS) |
| Buck soft-start capacitor, C_SS (33 nF) | CL10B333KB8NNNC | Samsung | C21117 | h7-module | Controller ruling (design note) | [pedal-digital-rail.md §8][pdr]; [power.md](power.md) §5.2 |
| Buck input filter inductor, L_FILT (WE-LQS 4.7 µH) | 74404054047 | Würth Elektronik | C1331933 | h7-module | Controller ruling [R-48](decisions.md#r-48) (the module carries the buck input network unchanged) | [POWER.md §3.1][pw]; [power.md](power.md) §4.2 |
| Input filter damping capacitor, C_DAMP (47 µF 35 V aluminium) | EEE-FK1V470P | Panasonic | C178565 | h7-module | Controller ruling [R-48](decisions.md#r-48) | [POWER.md §3.1][pw]; [power.md](power.md) §4.2 |
| Buck input ceramics, C_BIN1 and C_BIN2 (10 µF 50 V X7R 1206) | CL31B106KBHNNNE | Samsung | C89632 | h7-module | Controller ruling [R-48](decisions.md#r-48) | [POWER.md §3.1][pw]; [vin-mod.md][vm] (input network row); [power.md](power.md) §4.2 |
| Buck input HF bypass, C_BINHF (100 nF 50 V X7R 0805) | CL21B104KBCNNNC | Samsung | C1711 | h7-module | Controller ruling [R-48](decisions.md#r-48) | [POWER.md §3.1][pw]; [vin-mod.md §8][vm]; [power.md](power.md) §4.2 |
| Buck EN/UVLO divider top, R_UV1 (18.0 kΩ ±1 %) | 0603WAF1802T5E | Uniroyal | C25810 | h7-module | Controller ruling [R-47](decisions.md#r-47) | [vin-mod.md §2, §8][vm]; [power.md](power.md) §4.1 |
| Buck EN/UVLO divider bottom, R_UV2 (4.30 kΩ ±1 %) | 0603WAF4301T5E | Uniroyal | C23159 | h7-module | Controller ruling [R-47](decisions.md#r-47) | [vin-mod.md §2, §8][vm]; [power.md](power.md) §4.1 |
| ROM-DFU USB socket, J_USB_MOD (vertical 16-pin USB-C) | TYPE-C-31-E-17 | HRO | C7424785 | h7-module | Controller ruling [R-60](decisions.md#r-60), under owner decision [O-11](decisions.md#o-11) | [S1 ledger R-60][ledger]; [envelope.md §1][env]; [mechanical-and-controls.md](mechanical-and-controls.md) EC-MODULE-USB (open item USB-DFU-VERTICAL) |
| SWD header, J_SWD (2 × 5, 1.27 mm) | FTSH-105-01-F-DV-K | Samtec | C5382952 | h7-module | Controller ruling [D9](decisions.md#d9) (the header); the part is SCHEMATIC-CHECKLIST USB-06's, used by the envelope study | [CORE-BRIEF.md §4][cb] D9; [envelope.md §2][env]; LCSC from [SCHEMATIC-CHECKLIST.md][chk] USB-06; [mechanical-and-controls.md](mechanical-and-controls.md) §3.1 (open item MODULE-PART-HEIGHT-READINGS) |
| BOOT0 and RESET tactile switches, SW_BOOT and SW_RESET (right angle, THT) | PTS645VL31-2 LFS | C&K (Littelfuse) | C2799147 (the source records LCSC listing it as not recommended for new designs; lifecycle unverified) | h7-module | Controller ruling [OWN-05](decisions.md#own-05) (moved to the module under [O-12](decisions.md#o-12)); [R-55](decisions.md#r-55) caps its claims at its 60 °C rating | [OWNER-DEFAULTS.md][own], BOOT0 and Reset switch section; [envelope.md §2][env]; [mechanical-and-controls.md](mechanical-and-controls.md) §3.1; [processor-and-memory.md](processor-and-memory.md) §8 |
| Module header, J_MOD_A and J_MOD_B (1 × 20, male), each cut to 20 ways from the 64-way strip 800-10-064-10-002000 | 800-10-020-10-002000 | Mill-Max | — | h7-module | Controller ruling [R-61](decisions.md#r-61) (a controller part choice under owner decision [O-12](decisions.md#o-12)) | [S1 ledger R-61][ledger]; [envelope.md §1][env]; [mechanical-and-controls.md](mechanical-and-controls.md) EC-SOCKET-AND-HEADER (open item MODULE-HEADER-SOURCING) |

## 2. The audio pedal board (h7-pedal): power entry, power-fail and rails

| Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Per-branch reverse-polarity Schottky, D_AIN and D_MIN | PMEG4030ER,115 | Nexperia | C389355 | h7-pedal | Controller ruling [R-35](decisions.md#r-35) | [power-fail.md §10][pf]; [POWER.md §3.1][pw]; [power.md](power.md) §3.1 |
| Hold-up reservoir, C_BULK and C_BULK2 to C_BULK4 (100 µF 35 V aluminium) | EEE-FK1V101P | Panasonic | C128462 | h7-pedal | Controller ruling [R-35](decisions.md#r-35), [R-40](decisions.md#r-40) (the fourth can) | [power-fail.md §10][pf]; [POWER.md §3.1][pw]; [power.md](power.md) §3.2 |
| VIN_A ceramics: C_PROT, C_LIN and the op-amp decoupling; U_PRAIL's input capacitors (10 µF 50 V X7R 1206) | CL31B106KBHNNNE | Samsung | C89632 | h7-pedal | Controller ruling (design note) | [POWER.md §3.1][pw]; [pedal-digital-rail.md §8][pdr]; [power.md](power.md) §3.2, §6.4 (open item MLCC-DC-BIAS) |
| Input ferrite, FB_IN (its position is an S2 choice) | BLM31KN601SN1L | Murata | C668306 | h7-pedal | Controller ruling (design note) | [POWER.md §3.1][pw]; [power.md](power.md) §8 |
| Power-fail supervisor at VIN, U_PF | TPS3808G01DBVR | Texas Instruments | C19653 | h7-pedal | Controller ruling [R-36](decisions.md#r-36) (the sense point and divider; the part is v1's) | [power-fail.md §10][pf]; [BYPASS-RELAY.md][br] (PWR-18); [power.md](power.md) §3.3 |
| Schmitt inverter making PF_TRIP and PF_ON, U_PFINV (dual) | SN74LVC2G14DBVR | Texas Instruments | C12401 | h7-pedal | Controller ruling [R-37](decisions.md#r-37), [R-40](decisions.md#r-40) (the dual part) | [power-fail.md §10][pf]; [bypass-relay.md](bypass-relay.md) §4.3 |
| Override and gate-driver N-MOSFETs: Q_PFG, Q_PFR, Q_VDIS, Q_MSWD | AO3400A | Alpha & Omega | C20917 | h7-pedal | Controller ruling [R-37](decisions.md#r-37), [R-38](decisions.md#r-38) | [power-fail.md §10][pf]; [power.md](power.md) §3.5; [bypass-relay.md](bypass-relay.md) §4.3 |
| Module load switch, Q_MSW (P-MOSFET, TO-252) | AOD4185 | Alpha & Omega | C400894 | h7-pedal | Controller ruling [R-41](decisions.md#r-41) | [power-fail.md §10][pf]; [S1 ledger R-41][ledger]; [power.md](power.md) §3.5 |
| VIN_MOD discharge resistor, R_VDIS (10.0 Ω, pulse proof, 2010) | CRCW201010R0FKEFHP | Vishay | C4332954 | h7-pedal | Controller ruling [R-42](decisions.md#r-42) | [power-fail.md §10][pf]; [power.md](power.md) §3.5 |
| Clamp and steering diodes: D_PFCL, D_SS, D_GS | BAS116H,115 | Nexperia | C74210 | h7-pedal | Controller ruling [R-40](decisions.md#r-40) (D_PFCL, D_SS), [R-49](decisions.md#r-49) (D_GS) | [power-fail.md §10][pf]; [power.md](power.md) §3.3, §3.5 |
| Plug-in gate hold capacitor, C_GS (220 nF 50 V X7R 0805) | CL21B224KBFNNNE | Samsung | C5378 | h7-pedal | Controller ruling [R-49](decisions.md#r-49) | [power-fail.md §10][pf]; [power.md](power.md) §4.6 |
| Plug-in gate hold bleeder, R_GSB (470 kΩ) | 0603WAF4703T5E | Uniroyal | C23178 | h7-pedal | Controller ruling [R-49](decisions.md#r-49) | [power-fail.md §10][pf]; [power.md](power.md) §4.6 |
| Power-fail sense divider top, R_PFT1 (13.0 kΩ 0.1 %) | RT0603BRD0713KL | Yageo | C861121 | h7-pedal | Controller ruling [R-40](decisions.md#r-40) (the divider split) | [power-fail.md §10][pf]; [power.md](power.md) §3.3 |
| Power-fail sense divider, R_PFT2 (174 kΩ 0.1 %; v1's R_PFT) | RT0603BRD07174KL | Yageo | C861163 | h7-pedal | Controller ruling [R-40](decisions.md#r-40) | [power-fail.md §10][pf]; [power.md](power.md) §3.3 |
| Power-fail sense divider bottom, R_PFB (10.0 kΩ 0.1 %; v1's part) | RT0603BRD0710KL | Yageo | C95204 | h7-pedal | Controller ruling [R-36](decisions.md#r-36) | [power-fail.md §10][pf] (LCSC); MPN from [SCHEMATIC-CHECKLIST.md][chk] PWR-18; [power.md](power.md) §3.3 |
| SENSE filter, C_PFS (1 nF C0G; v1's part) | CL10C102JB8NNNC | Samsung | C163508 | h7-pedal | Controller ruling [R-36](decisions.md#r-36) | [power-fail.md §10][pf] (LCSC); MPN from [BYPASS-RELAY.md §3.4][br]; [power.md](power.md) §3.3 |
| U_PF VDD decoupling, C_PF (100 nF X7R; v1's part) | CL10B104KB8NNNC | Samsung | C1591 | h7-pedal | Controller ruling (design note) | [power-fail.md §10][pf] (LCSC); MPN from [BYPASS-RELAY.md §3.4][br] |
| Re-engage delay, C_PFCT on U_PF's CT (47 nF NP0 (C0G) ±5 % 50 V 1206) | C1206N473J050T | Holy Stone | C5451690 | h7-pedal | Controller ruling [R-40](decisions.md#r-40) | [power-fail.md §10][pf]; [power.md](power.md) §3.5 |
| VIN bleeder, R_VBLD (10.0 kΩ 1206) | 1206W4F1002T5E | Uniroyal | C17902 | h7-pedal | Controller ruling [R-36](decisions.md#r-36) | [power-fail.md §10][pf]; [power.md](power.md) §3.3 |
| PF_OK pull-up and the PF_TRIP and PF_ON pull-downs, R_PFPU, R_PFTPD, R_PFONPD (100 kΩ) | 0603WAF1003T5E | Uniroyal | C25803 | h7-pedal | Controller ruling [R-37](decisions.md#r-37) | [power-fail.md §10][pf]; [power.md](power.md) §3.4 |
| Q_MSW gate top and soft-start reset, R_MSWT and R_SSR (15.0 kΩ) | 0603WAF1502T5E | Uniroyal | C22809 | h7-pedal | Controller ruling [R-41](decisions.md#r-41) (re-sized for the AOD4185) | [power-fail.md §10][pf]; [power.md](power.md) §3.5 |
| Q_MSW gate bottom, R_MSWB (4.30 kΩ) | 0603WAF4301T5E | Uniroyal | C23159 | h7-pedal | Controller ruling [R-41](decisions.md#r-41) | [power-fail.md §10][pf]; [power.md](power.md) §3.5 |
| Q_MSW Miller-ramp soft-start capacitor, C_SS (2.2 µF 50 V X7R 1206) | CL31B225KBHNNNE | Samsung | C50254 | h7-pedal | Controller ruling [R-41](decisions.md#r-41) (re-sized) | [power-fail.md §10][pf]; [power.md](power.md) §3.5 |
| 3V3_P EN delay resistor, R_PEN (150 kΩ) | 0603WAF1503T5E | Uniroyal | C22807 | h7-pedal | Controller ruling [R-44](decisions.md#r-44) | [power-fail.md §10][pf]; [power.md](power.md) EC-QPEN-RESET |
| 3V3_P EN delay capacitor, C_PEN, two in parallel (4.7 µF 50 V X7R 1206) | CL31B475KBHNNNE | Samsung | C51205 | h7-pedal | Controller ruling [R-58](decisions.md#r-58) (two in parallel) | [power-fail.md §10][pf]; [power.md](power.md) EC-QPEN-RESET |
| Q_PEN drain resistor, R_PENS (180 Ω) | 0603WAF1800T5E | Uniroyal | C22828 | h7-pedal | Controller ruling [R-52](decisions.md#r-52) | [power-fail.md §10][pf]; [vin-mod.md §8][vm]; [power.md](power.md) EC-QPEN-RESET |
| 3V3_P EN pull-down, R_PENPD (1.00 MΩ) | 0603WAF1004T5E | Uniroyal | C22935 | h7-pedal | Controller ruling [R-45](decisions.md#r-45) | [power-fail.md §10][pf]; [power.md](power.md) EC-QPEN-RESET |
| HF bypass, 100 nF 50 V X7R 0805: U_PRAIL's input (and `POWER.md`'s C_SCH and C_PROTHF, whose split placement goes with FB_IN's, an S2 choice) | CL21B104KBCNNNC | Samsung | C1711 | h7-pedal | Controller ruling (design note); U_PRAIL's under [R-25](decisions.md#r-25) | [POWER.md §3.1][pw]; [pedal-digital-rail.md §8][pdr] |
| 5V_A LDO output capacitor, C_LOUT (10 µF 16 V X7R 1206) | CL31B106KOHNNNE | Samsung | C47971 | h7-pedal | Controller ruling (design note) | [POWER.md §3.1][pw]; [power.md](power.md) §7 |
| 5V_A LDO noise-reduction and feed-forward capacitors, C_NR and C_FF (10 nF 50 V) | CL21B103KBANNNC | Samsung | C1710 | h7-pedal | Controller ruling (design note) | [POWER.md §3.1][pw]; [power.md](power.md) §7 |
| 3V3_P EN reset, Q_PEN (N-MOSFET, SOT-23) | 2N7002,215 | Nexperia | C65189 | h7-pedal | Controller ruling [R-58](decisions.md#r-58) | [power-fail.md §10][pf]; [S1 ledger R-58][ledger]; [power.md](power.md) EC-QPEN-RESET |
| 5V_A LDO, U_LDO | TPS7A4901DGNR | Texas Instruments | C16430 | h7-pedal | Controller ruling [D3](decisions.md#d3) (the 5V_A LDO); the part is `POWER.md` §3.4's | [POWER.md §3.1, §3.4][pw]; [power.md](power.md) §7 |
| Pedal digital rail buck, U_PRAIL (3V3_P) | TPS62933FDRLR | Texas Instruments | C5219272 | h7-pedal | Controller ruling [R-25](decisions.md#r-25) | [pedal-digital-rail.md §8][pdr]; [power.md](power.md) §6.1 |
| U_PRAIL's inductor (WE-XHMI 4.7 µH), the module buck's network copied | 74439346047 | Würth Elektronik | C6827938 (no LCSC product record found on 2026-10-06; open item POWER-PARTS-STOCK) | h7-pedal | Controller ruling [R-25](decisions.md#r-25) | [pedal-digital-rail.md §8][pdr]; [power.md](power.md) §6.1 |
| U_PRAIL's output capacitors (22 µF 25 V X5R 1206) | CL31A226KAHNNNE | Samsung | C12891 | h7-pedal | Controller ruling [R-25](decisions.md#r-25) | [pedal-digital-rail.md §8][pdr]; [power.md](power.md) §6.1 |
| U_PRAIL's soft-start capacitor (33 nF) | CL10B333KB8NNNC | Samsung | C21117 | h7-pedal | Controller ruling [R-25](decisions.md#r-25) | [pedal-digital-rail.md §8][pdr] |

## 3. h7-pedal: analog, codec domain and crossings

| Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Codec, U_CODEC (TSSOP-28), clock master in hardware mode | PCM3060PWR | Texas Instruments | C2651841 | h7-pedal | Owner decision [O-2](decisions.md#o-2) (the PCM3060 on the audio board as clock master); hardware mode is [D2](decisions.md#d2) (controller ruling) | [split spec §2][split]; [original spec][plat], *Architecture decisions*; LCSC from [SCHEMATIC-CHECKLIST.md][chk] CODEC-01; [analog.md](analog.md) §13.1 |
| Codec oscillator, U_XO (SG-210STF 12.288000 MHz L) | X1G0041710019 | Epson | C255992 | h7-pedal | Controller ruling [R-29](decisions.md#r-29), implementing owner decision [D20](decisions.md#d20) | [codec-domain.md §6][cd]; [analog.md](analog.md) §13.2 |
| Codec VDD regulator, U_CVDD | TPS7A2433DBVR | Texas Instruments | C2866134 | h7-pedal | Controller ruling [R-30](decisions.md#r-30), implementing owner decision [D22](decisions.md#d22) | [codec-domain.md §6][cd]; [analog.md](analog.md) §13.3 |
| U_CVDD input and output capacitors, C_CVDDIN and C_CVDDOUT (1 µF 16 V X7R 0603) | CL10B105KO8NNNC | Samsung | C59782 | h7-pedal | Controller ruling [R-30](decisions.md#r-30) | [codec-domain.md §6][cd]; [analog.md](analog.md) §13.6 |
| Power-down clamp, D_CVCL | PMEG4005AEA,115 | Nexperia | C426867 | h7-pedal | Controller ruling [R-30](decisions.md#r-30) | [codec-domain.md §6][cd]; [analog.md](analog.md) §13.3 |
| 3V3_CODEC bleeder, R_CBLD (3.60 kΩ ±1 % 0603) | 0603WAF3601T5E | Uniroyal | C22980 | h7-pedal | Controller ruling [R-30](decisions.md#r-30) | [codec-domain.md §6][cd]; [analog.md](analog.md) §13.3 |
| Codec local reset supervisor, U_CRST | TLV803EA29DBZR | Texas Instruments | C1852114 | h7-pedal | Controller ruling [R-31](decisions.md#r-31), implementing owner decision [D21](decisions.md#d21) | [codec-domain.md §6][cd]; [analog.md](analog.md) EC-CODEC-RESET |
| Codec reset pull-up, R_CRST (4.70 kΩ ±1 % 0603) | 0603WAF4701T5E | Uniroyal | C23162 | h7-pedal | Controller ruling [R-31](decisions.md#r-31) (as amended to 4.70 kΩ) | [codec-domain.md §6][cd]; [analog.md](analog.md) EC-CODEC-RESET |
| Codec-domain 100 nF decoupling: C_XO, C_CRST; also U_PFINV's C_PFINV (50 V X7R 0603) | GRM188R71H104KA93D | Murata | C77055 | h7-pedal | Controller ruling (design note) | [codec-domain.md §6][cd]; [power-fail.md §10][pf]; [analog.md](analog.md) §13.6 |
| Audio and VMID op-amps: U_VMID, U_IN, U_OUT, U_ADC (four duals) | OPA1688IDR | Texas Instruments | C206212 | h7-pedal | Controller ruling (design note: `ANALOG.md` "Decision: OPA1688 for every audio and VMID op-amp"); the owner's [AN-D1](decisions.md#an-d1) full scale is set by its swing | [ANALOG.md §3, §13][an]; [POWER.md §3.1][pw]; [analog.md](analog.md) §3, §4 |
| Expression-tip follower, U_EXP | MCP6001T-I/OT | Microchip | C116490 | h7-pedal | Controller ruling (design note); its supply on VREF_A is owner decision [D19](decisions.md#d19) | [ANALOG.md §13][an]; [analog.md](analog.md) §4, §10.2 |
| Jack ESD diodes on every audio tip and the expression tip and ring | PESD12VL1BA,115 | Nexperia | C38558 | h7-pedal | Owner decision [OWN-03](decisions.md#own-03) ("PESD12VL1BA stays the fitted part (owner decision)") | [ANALOG.md §5.7][an]; [analog.md](analog.md) §6.6 |
| DC-blocking capacitors, C_DC and the ADC driver's coupling capacitor (22 µF 25 V aluminium, FT series) | EEE-FT1E220AR | Panasonic | C401767 | h7-pedal | Controller ruling (design note) | [ANALOG.md][an] (the C_AC part); [analog.md](analog.md) §7.3 |
| Expression back-feed blocking ideal diode, U_REFBLK | LM66100DCKR | Texas Instruments | C2869734 | h7-pedal | Controller ruling [R-17](decisions.md#r-17) | [vref-a.md][vref] (S2 pedal carry list); [analog.md](analog.md) §9.6 |
| U_REFBLK enable, Q_REFEN (N-MOSFET) | 2N7002,215 | Nexperia | C65189 | h7-pedal | Controller ruling [R-17](decisions.md#r-17) | [vref-a.md][vref]; [analog.md](analog.md) §9.6 |
| U_REFBLK gate and enable resistors, R_ENG and R_CE (100 kΩ) | not named for this role (LCSC code only) | — | C25803 | h7-pedal | Controller ruling [R-17](decisions.md#r-17) | [vref-a.md][vref]; [analog.md](analog.md) §9.6 |
| Expression tip series resistor, R_EXPIN (2.2 MΩ) | not named (LCSC code only) | — | C22938 | h7-pedal | Controller ruling [R-17](decisions.md#r-17) | [vref-a.md][vref]; [analog.md](analog.md) §9.6 |
| Ring Schottky clamp, D_RCLAMP | PMEG4005AEA,115 | Nexperia | C426867 | h7-pedal | Controller ruling [R-19](decisions.md#r-19) | [vref-a.md][vref]; [analog.md](analog.md) EC-RING-REFERENCE |
| Expression ring reference, R_REF (3.30 kΩ 1 % 1206) | 1206W4F3301T5E | Uniroyal | C26032 | h7-pedal | Controller ruling [R-19](decisions.md#r-19), within [AN-RING](decisions.md#an-ring) | [vref-a.md][vref]; [analog.md](analog.md) EC-RING-REFERENCE |
| SAI isolation buffer toward the module, U_ISO_M (triple, on 3V3_D) | SN74LVC3G34DCTR | Texas Instruments | C139356 | h7-pedal | Controller ruling (S1 crossing analysis); its series resistors are [R-10](decisions.md#r-10) | [crossings.md][cx] (parts table); [analog.md](analog.md) §14; [architecture.md](architecture.md) §4.8 |
| SAI isolation buffer toward the codec, U_ISO_C (single, on 3V3_CODEC) | SN74LVC1G34DBVR | Texas Instruments | C840096 | h7-pedal | Controller ruling (S1 crossing analysis) | [crossings.md][cx] (parts table); [analog.md](analog.md) §14; [architecture.md](architecture.md) §4.8 |

## 4. h7-pedal: bypass relays

| Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Bypass relays, K_BYP_IN and K_BYP_OUT (DPDT, SMD, 3 V coil, non-latching); data sheet catalogue number K106-E1-11 | G6K-2F-Y DC3 (on tape: G6K-2F-Y-TR DC3) | Omron / ARATAS | C93168 | h7-pedal | Controller ruling, in the `BYPASS-RELAY.md` note the owner approved under [OWN-01](decisions.md#own-01) (his decision is relay bypass; no recorded words of his name the part) | [BYPASS-RELAY.md §3.1][br]; [OWNER-DEFAULTS.md][own] OWN-01; [bypass-relay.md](bypass-relay.md) EC-RELAY-PART |
| Relay coil driver, Q_BYP (N-MOSFET, both coils) | AO3400A | Alpha & Omega | C20917 | h7-pedal | Controller ruling, in the note approved under [OWN-01](decisions.md#own-01); its gate network is [R-13](decisions.md#r-13) | [BYPASS-RELAY.md §3][br]; LCSC from [power-fail.md §10][pf]; [bypass-relay.md](bypass-relay.md) §5.2 |
| Coil suppressor diodes, D_BF_IN and D_BF_OUT | 1N4148W-7-F | Diodes Inc. | — | h7-pedal | Controller ruling, in the note approved under [OWN-01](decisions.md#own-01) | [BYPASS-RELAY.md §3][br]; [bypass-relay.md](bypass-relay.md) §5.2 |
| Coil suppressor Zeners, D_BZ_IN and D_BZ_OUT | BZT52C12-7-F | Diodes Inc. | — | h7-pedal | Controller ruling, in the note approved under [OWN-01](decisions.md#own-01) | [BYPASS-RELAY.md §3][br]; [bypass-relay.md](bypass-relay.md) §5.2 |

## 5. h7-pedal: panel parts, controls, MIDI and USB

| Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Control-position pot fit, RV_POSn (10 kΩ linear, short shaft) | RV16AF-41 B10K | Alpha (Taiwan) | — | h7-pedal | Controller ruling (envelope study, split spec §5.1.1), under owner decisions [O-17](decisions.md#o-17) (the ~10 mm loft) and [O-18](decisions.md#o-18) (pot-or-button positions) | [split spec §5.1.1, §5.1.2][split]; [envelope.md][env]; [mechanical-and-controls.md](mechanical-and-controls.md) EC-BOARD-HEIGHT, EC-CONTROL-POSITIONS (open item VREF-A-LOAD-ALLOWANCES: resistance tolerance unprinted) |
| Control-position button fit (6 × 6 THT tactile) | TC-6610-17-100G | HCTL | C2845265 | h7-pedal | Owner decision [O-17](decisions.md#o-17) ("lets start with the simple option A"), made a position fit by [O-18](decisions.md#o-18) | [controls.md §2][ctl]; [split spec §5.1.1][split]; [mechanical-and-controls.md](mechanical-and-controls.md) EC-BUTTON |
| ¼ in audio jacks (two in, two out) and the expression jack (TRS, ring normal) | NMJ6HCD2 | Neutrik | C368502 | h7-pedal | Controller ruling [OWN-05](decisions.md#own-05); kept by [R-62](decisions.md#r-62) | [OWNER-DEFAULTS.md][own] (panel parts); [envelope.md §5][env]; [mechanical-and-controls.md](mechanical-and-controls.md) FIG-HEIGHTS-UNDER-BOARD |
| DC power jack, J_DC | PJ-057AH | Same Sky | C3095780 | h7-pedal | Study assumption: envelope.md §5 uses [OWN-05](decisions.md#own-05)'s v1-era choice; split spec §9.2 leaves the DC jack to S2 | [OWNER-DEFAULTS.md][own] (panel parts); [envelope.md §5][env]; [mechanical-and-controls.md](mechanical-and-controls.md) FIG-HEIGHTS-UNDER-BOARD |
| LEDs, LED1 and LED2 | WP7113ID | Kingbright | C6926004 | h7-pedal | Controller ruling [OWN-05](decisions.md#own-05); used by [R-27](decisions.md#r-27) | [OWNER-DEFAULTS.md][own] (panel parts); [pedal-digital-rail.md][pdr]; [power.md](power.md) §6.3 |
| LED series resistors, R_LED1 and R_LED2 (100 Ω ±1 % 0603) | 0603WAF1000T5E | Uniroyal | C22775 | h7-pedal | Controller ruling [R-27](decisions.md#r-27) | [pedal-digital-rail.md §8][pdr]; [power.md](power.md) §6.3 |
| Footswitch series resistors, R_FSW1 and R_FSW2 (1.20 kΩ ±1 % 0603) | 0603WAF1201T5E | Uniroyal | C22765 | h7-pedal | Controller ruling [R-22](decisions.md#r-22) | [3v3-d.md §2][d3]; [power.md](power.md) §5.4 |
| I²C expansion bus pull-ups (2.40 kΩ ±1 % 0603) | 0603WAF2401T5E | Uniroyal | C22940 | h7-pedal | Controller ruling [R-21](decisions.md#r-21) | [3v3-d.md §1][d3]; [power.md](power.md) §5.4 |
| MIDI OUT open-drain driver, U_MIDIDRV (on 3V3_D) | SN74LVC1G07DBVR | Texas Instruments | C7829 | h7-pedal | Controller ruling [R-23](decisions.md#r-23) | [3v3-d.md][d3]; [power.md](power.md) §5.4 |
| MIDI_UART_TX pull-up at U_MIDIDRV's input, R_TXPU (18.0 kΩ ±1 %) | 0603WAF1802T5E | Uniroyal | C25810 | h7-pedal | Controller ruling [R-28](decisions.md#r-28) | [pedal-digital-rail.md §8][pdr]; [3v3-d.md][d3]; [power.md](power.md) §5.4 |
| MIDI OUT high-side switch, Q_MIDI (P-MOSFET) | AO3401A | Alpha & Omega | C15127 | h7-pedal | Controller ruling [R-26](decisions.md#r-26) | [pedal-digital-rail.md §8][pdr]; [power.md](power.md) §6.3 (open item POWER-PARTS-STOCK: lifecycle to confirm) |
| Q_MIDI gate pull-up, R_MGP (160 Ω ±1 % 1206) | 1206W4F1600T5E | Uniroyal | C17919 | h7-pedal | Controller ruling [R-26](decisions.md#r-26) as amended by [R-53](decisions.md#r-53) | [pedal-digital-rail.md §8][pdr]; [power.md](power.md) §6.3 |
| MIDI OUT RA, four in parallel (130 Ω ±1 % 1206) | 1206W4F1300T5E | Uniroyal | C17914 | h7-pedal | Controller ruling [R-26](decisions.md#r-26) | [pedal-digital-rail.md §8][pdr]; [power.md](power.md) §6.3 |
| MIDI OUT RC (10 Ω ±1 % 1206) | 1206W4F100JT5E | Uniroyal | C17903 | h7-pedal | Controller ruling [R-26](decisions.md#r-26) | [pedal-digital-rail.md §8][pdr]; [power.md](power.md) §6.3 |
| USB isolation switch on pins 36/37, U_USBSW | TS3USB221RSER | Texas Instruments | C130085 | h7-pedal; bring-up carrier | Controller ruling [R-14](decisions.md#r-14) | [crossings.md][cx] (R-14 section); [architecture.md](architecture.md) §4.8; [firmware-facing-requirements.md](firmware-facing-requirements.md) |
| USB ESD protection at the pedal's USB-C, U_ESD | USBLC6-2SC6 | STMicroelectronics | C7519 | h7-pedal | Controller ruling [D10](decisions.md#d10) (ESD moves to the pedal board) | [CORE-BRIEF.md §4][cb] D10; [crossings.md §0][cx]; LCSC also in [SCHEMATIC-CHECKLIST.md][chk] USB-04; [analog.md](analog.md) FIG-VBUS-HOTPLUG |

## 6. Footswitch boards, module socket and enclosure

| Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Footswitch actuator, FSW1 and FSW2 (spring stomp actuator in the top panel; Tayda A-8660) | PBS-24-MP | DAIER | — | enclosure (top panel) | Owner decision [O-17](decisions.md#o-17) ("this is the stomp switch actuator") | [split spec §2, §5.1.1][split]; [controls.md §1][ctl]; [mechanical-and-controls.md](mechanical-and-controls.md) EC-FOOTSWITCH |
| Footswitch tact switch, build A (collar on the panel; 7.00 mm) | 1301.9316.24 (Schurter LSH) | Schurter | C6390328 | hung footswitch board | Controller ruling: the realisation under owner decision [R-56](decisions.md#r-56) | [controls.md §1][ctl]; [S1 ledger R-56][ledger]; [mechanical-and-controls.md](mechanical-and-controls.md) FIG-FOOTSWITCH-BUILDS |
| Footswitch tact switch, build B (panel between two nuts; 4.30 mm) | 1301.9314.24 (Schurter LSH) | Schurter | C4364459 | hung footswitch board | Controller ruling: the realisation under owner decision [R-56](decisions.md#r-56) | [controls.md §1][ctl]; [S1 ledger R-56][ledger]; [mechanical-and-controls.md](mechanical-and-controls.md) FIG-FOOTSWITCH-BUILDS |
| Hung-board spacers, two per board (M3 SMT, 5 mm) | 9774050360R (WA-SMSI) | Würth Elektronik | C19274041 | h7-pedal (soldered to its underside) | Controller ruling: the realisation under owner decision [R-56](decisions.md#r-56) | [controls.md §1][ctl]; [mechanical-and-controls.md](mechanical-and-controls.md) FIG-FOOTSWITCH-BUILDS |
| Hung-board 2-pin header, build A | TSW-102-14-F-S | Samtec | C5803811 | hung footswitch board | Controller ruling: the realisation under owner decision [R-56](decisions.md#r-56) | [controls.md §1][ctl]; [mechanical-and-controls.md](mechanical-and-controls.md) §5.4 |
| Hung-board 2-pin header, build B | TSW-102-07-F-S | Samtec | C3331037 | hung footswitch board | Controller ruling: the realisation under owner decision [R-56](decisions.md#r-56) | [controls.md §1][ctl]; [mechanical-and-controls.md](mechanical-and-controls.md) §5.4 |
| Module socket, J_MOD_A and J_MOD_B (1 × 20, female, low profile) | 801-43-020-10-012000 | Mill-Max | — | h7-pedal (underside); bring-up carrier | Controller ruling [R-61](decisions.md#r-61) (a controller part choice under owner decision [O-12](decisions.md#o-12)) | [S1 ledger R-61][ledger]; [envelope.md §1][env]; [mechanical-and-controls.md](mechanical-and-controls.md) EC-SOCKET-AND-HEADER |
| Enclosure (landscape) | 1590BB | Hammond | — | enclosure | Owner decision [O-17](decisions.md#o-17), narrowed by [R-62](decisions.md#r-62) (controller ruling: design to the owner-measured Tayda 1590BB-style box; plan sizes stay Hammond's) | [split spec §5.1.1][split]; [S1 ledger R-62][ledger]; [mechanical-and-controls.md](mechanical-and-controls.md) EC-ENCLOSURE (open item ENCLOSURE-FIRST-BUILD) |

The module socket's board is "h7-pedal; bring-up carrier" because [R-5](decisions.md#r-5) puts the female part on the pedal and carrier boards; the carrier's own parts list was never drawn up in the pedals repository.

## 7. Named alternates and fallbacks (not fitted)

Parts a source names as a fallback, an alternate or an option. None is the current choice.

| Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Fallback module socket (the Preci-Dip pair) | 801-87-020-10-012101 | Preci-Dip | — (the source found no LCSC listing) | h7-pedal; bring-up carrier | Controller ruling [R-61](decisions.md#r-61) (the fallback pair) | [S1 ledger R-61][ledger]; [envelope.md §1][env]; [mechanical-and-controls.md](mechanical-and-controls.md) §3.2 |
| Fallback module header, cut to 20 from the 64-way 800-10-064-10-002101 | 800-10-020-10-002101 | Preci-Dip | C6091837 | h7-module | Controller ruling [R-61](decisions.md#r-61) (the fallback pair) | [S1 ledger R-61][ledger]; [envelope.md §1][env]; [mechanical-and-controls.md](mechanical-and-controls.md) §3.2 |
| SDRAM in the same 32 MB class: footprint and nets accept it | AS4C16M16SA (-6, -7); MT48LC16M16A2 (-6A, -7E, -75); IS42S16320F (-6, -7, an optional class) | Alliance; Micron; ISSI | — | h7-module | Controller ruling [D1](decisions.md#d1) (the class) | [SDRAM-COMPATIBILITY.md][sd]; [SCHEMATIC-CHECKLIST.md][chk] CORE-18; [processor-and-memory.md](processor-and-memory.md) §6 (open item SDRAM-SOURCES-RECHECK) |
| Stocked alternate for U_XO; needs a footprint change | OT3EL4C4JI-111OLP-12.288M | YXC | C5203555 | h7-pedal | Controller ruling [R-29](decisions.md#r-29) (named in its fix round) | [codec-domain.md §1][cd]; [analog.md](analog.md) §13.2 |
| First fallback for U_CRST: the EA29 with the R pinout (pin 1 RESET̅, 2 GND, 3 VDD; orderable code not named) | TLV803EA29, R pinout | Texas Instruments | C1852118 | h7-pedal | Controller ruling (design note: the codec-domain analysis's stock notes, under [R-31](decisions.md#r-31)) | [codec-domain.md §6][cd]; [analog.md](analog.md) §13.6 |
| Second fallback for U_CRST (only 45 mV of start-up margin) | TLV803EA30DBZR | Texas Instruments | C5218924 | h7-pedal | Controller ruling (design note: the codec-domain analysis's stock notes, under [R-31](decisions.md#r-31)) | [codec-domain.md §6][cd]; [analog.md](analog.md) §13.6 |
| Unqualified 40 V, 3 A alternative to the PMEG4030ER | SS34-E3/57T | Vishay | C13354 | h7-pedal | Controller ruling (design note; not qualified: open item SCHOTTKY-ALTERNATE-UNQUALIFIED) | [POWER.md][pw]; [open-items.md](open-items.md) |
| Unfitted option for the jack ESD diodes | PESD15VL1BA | Nexperia | — | h7-pedal | Owner decision [OWN-03](decisions.md#own-03) records it as an unfitted option | [ANALOG.md §5.7][an]; [analog.md](analog.md) §6.6 |
| Option for VBUS-HOTPLUG: C_VBUS 100 nF X7R from PA1 to GND, if a model does not show PA1 ≤ 3.6 V | CL10B104KB8NNNC | Samsung | C1591 | h7-pedal | Controller ruling [R-57](decisions.md#r-57) (the option, not a fit) | [crossings.md][cx]; MPN from [BYPASS-RELAY.md][br] (C_PF row); [analog.md](analog.md) FIG-VBUS-HOTPLUG |

## 8. Footprints

Footprint names are not carried as facts. Each name below is the one a pedals source gives, and each is to be **re-verified against installed KiCad libraries** before it is used; the port spec's decision is that custom symbols and footprints are remade later, not copied.

- G6K-2F-Y relays: `Relay_SMD:Relay_DPDT_Omron_G6K-2F-Y` ([BYPASS-RELAY.md §3.1][br]; [bypass-relay.md](bypass-relay.md) §5.1 records it present in KiCad 10.0.5's library on 2026-11-10). Re-verify against installed KiCad libraries, and against the data sheet's mounting dimensions (open item BYPASS-PARTS-TO-MODEL).
- PTS645VL31-2 LFS: `Button_Switch_THT:SW_Tactile_SPST_Angled_PTS645Vx31-2LFS` ([OWNER-DEFAULTS.md][own]). Re-verify against installed KiCad libraries.
- WP7113ID: `LED_THT:LED_D5.0mm` ([OWNER-DEFAULTS.md][own]). Re-verify against installed KiCad libraries.
- NMJ6HCD2: a stock footprint named `Jack_6.35mm_Neutrik_NMJ6HCD2_Horizontal`, its library not named by the source ([OWNER-DEFAULTS.md][own]). Re-verify against installed KiCad libraries.
- SN74LVC3G34DCTR: the land pattern is to come from TI's DCT (SM8) recommended pattern in SCES366L, not a generic footprint ([crossings.md][cx]). Re-verify against installed KiCad libraries.
- TYPE-C-31-E-17: the land pattern is to come from the HRO drawing (open item USB-DFU-VERTICAL). Re-verify against installed KiCad libraries.
- Every other part: the pedals repository's custom libraries (`H7.pretty`, `Pedal_Panel`) stayed behind. Re-verify against installed KiCad libraries.

## 9. Not in force

*Not in force:* Q_MSW as an AO3401A (R-38 as first written), replaced by the AOS AOD4185 ([R-41](decisions.md#r-41)). The AO3401A remains the choice for Q_MIDI.

*Not in force:* the diode reset of 3V3_P's EN, D_PEN (BAS116H), replaced by Q_PEN, a 2N7002,215 ([R-58](decisions.md#r-58)). BAS116H remains the choice for D_PFCL, D_SS and D_GS.

*Not in force:* R_PENS as 150 Ω, Uniroyal 0603WAF1500T5E (C22808), replaced by 180 Ω, 0603WAF1800T5E ([R-52](decisions.md#r-52)).

*Not in force:* R_VDIS as a 27.0 Ω Vishay CRCW120627R0FKEAHP ([R-40](decisions.md#r-40)) and then a 10.0 Ω Vishay CRCW120610R0FKEAHP ([R-41](decisions.md#r-41)), replaced by the CRCW201010R0FKEFHP ([R-42](decisions.md#r-42)).

*Not in force:* the catalogue's TLV803EA30 as the codec's reset ([R-31](decisions.md#r-31)), replaced by the TLV803EA29DBZR; the TLV803EA30DBZR stays the module's NRST supervisor and is U_CRST's second fallback (§7).

*Not in force:* the OPA1652 VMID buffer of `POWER.md` §3.5, removed by `ANALOG.md` §4.

*Not in force:* the module socket and header as Samtec SLW-120-01-G-S sockets with Samtec TLW-120-06-G-S headers, then the Preci-Dip 801-87-020-10-012101 socket with the Preci-Dip 800-10-020-10-002101 header as the first choice ([R-54](decisions.md#r-54)), replaced by the Mill-Max pair ([R-61](decisions.md#r-61)); the Preci-Dip pair is the fallback (§7).

*Not in force:* the module's USB socket as the right-angle HCTL HC-TYPE-C-16P-01A, replaced by the vertical HRO TYPE-C-31-E-17 ([R-60](decisions.md#r-60)).

*Not in force:* the footswitch's switch as the C&K PTS645SM43SMTR92 LFS on 4 mm spacers, with the Samtec TSW-102-07-F-S header in every build; replaced by the Schurter LSH in two builds ([R-56](decisions.md#r-56)'s realisation). Before that, the APEM Multimec 3F 3FSH9, replaced on the owner's pushback ([mechanical-and-controls.md](mechanical-and-controls.md) EC-FOOTSWITCH).

*Not in force:* the v1 panel parts the split replaced ([OWN-05](decisions.md#own-05)): the Alpha RV16AF-42-15R1-B10K pots, the Dailywell 1MS3T2B3M2QES toggles and the E-Switch FS5700SPMT2B2M2QE footswitches. This is what v1 contained, which is all it is.

*Not in force:* candidates compared and not chosen, for the analog branch's element: the ideal-diode controllers LM74700-Q1, LM74800-Q1 and LM74810-Q1, and the comparator-only LM74801-Q1 ([R-33](decisions.md#r-33)); for 3V3_P: a linear LM317 ([power.md](power.md) §6.2); for the relay driver: the BSS138; for the relays: the latching G6KU and Panasonic TQ2-L2; for the audio op-amps: the OPA1652, OPA1642 and OPA2197 ([analog.md](analog.md) §3).

*Not in force:* the module socket candidates not chosen ([envelope.md §1][env]): Samtec SSM-120-L-SV, Harwin M20-786, Samtec HLE-120-02-G-DV, Harwin M20-7812045, Preci-Dip 801-87-020-30-002101 and -30-480101, and Mill-Max 801-43-020-10-002000.

*Not in force:* the control candidates not chosen ([controls.md §3][ctl]): the C&K PTS645SK13SMTR92 LFS button (the owner chose option A), the Würth WS-TATV 430456043736 board-on-board footswitch, and a whole E-Switch FS5700-family footswitch on the board.

*Not in force:* the 1590BBS enclosure and the other studies in `envelope.md`'s history table, each superseded before the O-17 baseline.

## 10. Parts named in these documents that are not parts of these boards

These MPNs appear in the topic documents but are not chosen for any board here, so they are neither in the tables nor superseded choices:

- **On a Daisy Seed, the development substitute:** the STM32H750IB (STM32H750IBKx package on a Rev5), the WM8731 (Rev5 codec), the PCM3060 on a Rev7 (the same codec as ours, the Seed's own), the AK4556 or AK4430 (Rev4's codec, the sources disagree), the TAC5242 (Seed3 codec), the LP2985 (Rev5 pin-21 LDO) and a TPS6217x-series buck (Rev5 pin 38) ([architecture.md](architecture.md) §8; [open-items.md](open-items.md)).
- **In OSCAR, the open hardware the platform derives from, and not carried:** the AMS1117 and PGA2310 ([processor-and-memory.md](processor-and-memory.md) §2), and OSCAR's 2N7002 relay driver with a plain 1N4148W ([bypass-relay.md](bypass-relay.md) §8).
- **Cited for a figure or a reference dimension:** the Alpha SF12030F, the part the owner gave as the one the PBS-24-MP likely copies, whose printed dimensions are the footswitch study's source ([F-3](decisions.md#f-3)); NDK's EXS00A-CG06750, the crystal type AN2867 tabulates ([processor-and-memory.md](processor-and-memory.md) §3); TI's ISOM8710, cited to show that the 2.0 mA MIDI IN allocation can be met (no MIDI IN receiver is chosen: open item MIDI-IN-RECEIVER-STOCK); and TI's example TDK 10 µF 50 V 1206, whose 3.45 µF figure stands as an allowance for the fitted CL31B106KBHNNNE.

## 11. What this document does not carry

- **Stock counts and prices.** They were dated observations. Availability and lifecycle are re-checked at the PCBWay quote ([OWN-07](decisions.md#own-07)); the parts the S1 analyses flagged are on that watch (open item POWER-PARTS-STOCK).
- **Footprint names as facts** (§8).
- **Parts chosen only by value**, without an MPN or an LCSC code in the topic documents (most resistors and capacitors; the crystal's 8 pF load capacitors; the spacers' ISO 7092 M3 shims and the footswitch's ISO 7089 M12 washer). Their values are in the topic documents, and phase 4's BOM chooses them.
- **The mute parts and the v1 BOM rows that no longer exist.** The solid-state mute was removed by the owner's relay-bypass decision ([OWN-01](decisions.md#own-01)).

[own]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/OWNER-DEFAULTS.md
[cb]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/CORE-BRIEF.md
[ledger]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-05-h7-split-rulings.md
[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
[plat]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-09-30-h7-pedal-platform-design.md
[pw]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/POWER.md
[an]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/ANALOG.md
[br]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/BYPASS-RELAY.md
[chk]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/SCHEMATIC-CHECKLIST.md
[sd]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/SDRAM-COMPATIBILITY.md
[pf]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/power-fail.md
[pdr]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/pedal-digital-rail.md
[d3]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/3v3-d.md
[vm]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/vin-mod.md
[vref]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/vref-a.md
[cd]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/codec-domain.md
[cx]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/crossings.md
[env]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/envelope.md
[ctl]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/controls.md
