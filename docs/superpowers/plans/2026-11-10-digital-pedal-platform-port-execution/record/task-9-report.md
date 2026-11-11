# Task 9 report: docs/h7-platform/parts.md

Status: DONE_WITH_CONCERNS. Commit de62221 ("h7-platform port: parts.md"), pushed to origin/feature/digital-pedal-platform.

## What was written

- `docs/h7-platform/parts.md` (new). Sections: how to read the table; §1 h7-module (19 rows); §2 h7-pedal power entry, power-fail and rails (18); §3 h7-pedal analog, codec domain and crossings (21); §4 bypass relays (4); §5 panel parts, controls, MIDI and USB (15); §6 footswitch boards, module socket and enclosure (8); §7 named alternates and fallbacks, not fitted (9); §8 footprints (each marked "re-verify against installed KiCad libraries"); §9 Not in force (13 lines, each beginning `*Not in force:*`); §10 parts named in the documents that are not parts of these boards (Seed, OSCAR, cited reference parts); §11 what is not carried. Every table uses the header `Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source`. Opens with a `Ported from:` list of pinned links.
- No stock and no price carried. LCSC codes only where a source records one; each row's Source cell names that source (POWER.md §3.1, power-fail.md §10, pedal-digital-rail.md §8, 3v3-d.md, codec-domain.md §6, vref-a.md, crossings.md, controls.md, OWNER-DEFAULTS.md panel table, CORE-BRIEF.md §5 and D17, ANALOG.md §13, BYPASS-RELAY.md §3.1, and SCHEMATIC-CHECKLIST.md for the MCU C89597, SDRAM C97572, flash C97521, codec C2651841, USB ESD C7519, SWD header C5382952).
- Where a topic document gives a family name and a source the orderable code, the row gives the orderable code from the cited source: PCM3060PWR, W25Q128JVSIQ, TPS62933FDRLR, TPS7A4901DGNR, TPS3808G01DBVR, SN74LVC2G14DBVR, SN74LVC1G07DBVR, OPA1688IDR, MCP6001T-I/OT, USBLC6-2SC6, PMEG4030ER,115, BAS116H,115, and the resistor and capacitor MPNs for C_GS, R_GSB, R_FSW, R_LED, RA, RC, R_MGP from power-fail.md §10, 3v3-d.md §2 and pedal-digital-rail.md §8. R_UV1, R_UV2, R_ENG/R_CE and R_EXPIN have LCSC codes only and are marked "not named for this role (LCSC code only)".
- `verify.sh`: new `check_parts`, dispatcher entry `parts`, and `parts` appended to ALL_CHECKS. Every table whose header row is exactly the seven columns is checked; each row must have seven cells and non-empty `Chosen by` and `Source`; `\|` is stripped before splitting; no such table, or tables with no rows, fails.

## RED

```
FAIL parts: [missing docs/h7-platform/parts.md]
PASS provenance
PASS nocode
PASS effective
PASS decisions
PASS openitems
exit=1
```

Further failure cases, run against mutated copies of the finished file (scratch script `parts_check_cases.py`, original restored):

```
[missing file] exit=1 FAIL parts: [missing docs/h7-platform/parts.md]
[header renamed in every table] exit=1 FAIL parts: [no table with header | Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |;]
[empty Chosen by] exit=1 FAIL parts: [line 78 (Codec oscillator, U_XO (SG-210STF 12.288000 MHz L)): empty Chosen by;]
[empty Source] exit=1 FAIL parts: [line 78 (Codec oscillator, U_XO (SG-210STF 12.288000 MHz L)): empty Source;]
[six cells] exit=1 FAIL parts: [line 78: 6 cells, expected 7;]
[escaped pipe inside a cell (expect PASS)] exit=0 PASS parts
[restored original] exit=0 PASS parts
```

## GREEN

`PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh parts provenance nocode effective decisions openitems`, after the commit:

```
PASS parts
PASS provenance
PASS nocode
PASS effective
PASS decisions
PASS openitems
exit=0
```

## The MPN walk (step 4)

Method. I read every document under docs/h7-platform/ (decisions.md, architecture.md, power.md, analog.md, bypass-relay.md, processor-and-memory.md, firmware-facing-requirements.md, mechanical-and-controls.md, open-items.md) for part numbers, helped by token scans (letter-digit tokens, numeric-led part numbers such as Mill-Max and Schurter codes, long Würth numbers, and every LCSC code with its context), and classified each by reading its passage. The list below is that reading; a scratch script (`walk.py`) then cross-checked it mechanically against parts.md. A final reverse scan of every letter-digit token in the documents absent from parts.md left only non-parts (net and pin names, document numbers, the `CA-033` MIDI specification, the `CRCW2010-HP` series name, the `HC-49` package, `IS42S16320F-6`, which is covered by the IS42S16320F row's "-6").

Format: MPN: documents that name it -> where it went in parts.md. "table §n" is a table row in section n; §7 is the alternates table; "Not-in-force" is a `*Not in force:*` line; "§10 reference list" is the list of parts that are not parts of these boards. Family names and orderable codes are listed separately where the documents use both.

- STM32H743IIT6: found in architecture.md, decisions.md, firmware-facing-requirements.md, mechanical-and-controls.md, open-items.md, processor-and-memory.md -> table §1
- W9825G6KH-6I: found in architecture.md, firmware-facing-requirements.md, mechanical-and-controls.md, processor-and-memory.md -> table §1
- W25Q128JV: found in architecture.md, firmware-facing-requirements.md, mechanical-and-controls.md, power.md, processor-and-memory.md -> table §1
- W25Q128JVSIQ: found in mechanical-and-controls.md -> table §1
- NX3225GA: found in architecture.md, mechanical-and-controls.md, open-items.md, processor-and-memory.md -> table §1
- NX3225GA-25.000M-STD-CRG-2: found in processor-and-memory.md -> table §1
- TLV803EA30DBZR: found in decisions.md, power.md, processor-and-memory.md -> table §1, table §7, Not-in-force
- TLV803EA30: found in analog.md, architecture.md, decisions.md, mechanical-and-controls.md, power.md, processor-and-memory.md -> table §1, table §7, Not-in-force
- BLM21PG221SN1D: found in analog.md, decisions.md, open-items.md, power.md, processor-and-memory.md -> table §1
- TPS62933F: found in architecture.md, bypass-relay.md, decisions.md, mechanical-and-controls.md, open-items.md, power.md -> prose §How to read the table, table §1, table §2
- TPS62933FDRLR: found in decisions.md, power.md -> table §1, table §2
- 74439346047: found in open-items.md, power.md -> table §1, table §2
- CL31A226KAHNNNE: found in power.md -> table §1, table §2
- CL10B333KB8NNNC: found in power.md -> table §1, table §2
- 74404054047: found in open-items.md, power.md -> table §1
- EEE-FK1V470P: found in mechanical-and-controls.md, power.md -> table §1
- CL31B106KBHNNNE: found in analog.md, open-items.md, power.md -> table §1, table §2, §10 reference list
- TYPE-C-31-E-17: found in architecture.md, decisions.md, mechanical-and-controls.md, open-items.md, processor-and-memory.md -> table §1, §8 footprints, Not-in-force
- FTSH-105-01-F-DV-K: found in mechanical-and-controls.md, open-items.md -> table §1
- PTS645VL31-2: found in mechanical-and-controls.md, open-items.md -> table §1, §8 footprints
- PTS645VL: found in decisions.md, mechanical-and-controls.md, open-items.md -> table §1, §8 footprints
- 800-10-020-10-002000: found in decisions.md, mechanical-and-controls.md, open-items.md -> table §1
- 800-10-064-10-002000: found in decisions.md, mechanical-and-controls.md, open-items.md -> table §1
- 801-43-020-10-012000: found in decisions.md, mechanical-and-controls.md, open-items.md -> table §6
- PMEG4030ER: found in analog.md, decisions.md, open-items.md, power.md -> table §2, table §7
- EEE-FK1V101P: found in power.md -> table §2
- BLM31KN601SN1L: found in power.md -> table §2
- TPS3808G01: found in bypass-relay.md, decisions.md, power.md -> table §2
- SN74LVC2G14: found in bypass-relay.md, decisions.md, power.md -> table §2
- AO3400A: found in analog.md, architecture.md, bypass-relay.md, decisions.md, open-items.md, power.md -> table §2, table §4
- AOD4185: found in decisions.md, open-items.md, power.md -> table §2, Not-in-force
- CRCW201010R0FKEFHP: found in decisions.md, power.md -> table §2, Not-in-force
- BAS116H: found in decisions.md, open-items.md, power.md -> table §2, Not-in-force
- 2N7002,215: found in analog.md, open-items.md, power.md -> table §2, table §3, Not-in-force
- 2N7002: found in analog.md, bypass-relay.md, decisions.md, open-items.md, power.md -> table §2, table §3, Not-in-force, §10 reference list
- TPS7A49: found in analog.md, architecture.md, bypass-relay.md, decisions.md, power.md -> table §2
- TPS7A4901DGNR: found in power.md -> table §2
- PCM3060: found in analog.md, architecture.md, bypass-relay.md, decisions.md, firmware-facing-requirements.md, open-items.md, power.md, processor-and-memory.md -> table §3, §10 reference list
- SG-210STF: found in analog.md, decisions.md -> table §3
- X1G0041710019: found in analog.md, decisions.md -> table §3
- TPS7A2433DBVR: found in analog.md, decisions.md -> table §3
- CL10B105KO8NNNC: found in analog.md -> table §3
- PMEG4005AEA,115: found in analog.md, open-items.md -> table §3
- PMEG4005AEA: found in analog.md, decisions.md, open-items.md -> table §3
- 0603WAF3601T5E: found in analog.md -> table §3
- TLV803EA29DBZR: found in analog.md, decisions.md, open-items.md -> table §3, Not-in-force
- TLV803EA29: found in analog.md, decisions.md, open-items.md -> table §3, table §7, Not-in-force
- 0603WAF4701T5E: found in analog.md -> table §3
- GRM188R71H104KA93D: found in analog.md -> table §3
- OPA1688: found in analog.md, decisions.md, open-items.md, power.md -> table §3
- OPA1688IDR: found in analog.md -> table §3
- MCP6001: found in analog.md, decisions.md -> table §3
- MCP6001T-I/OT: found in analog.md -> table §3
- PESD12VL1BA,115: found in analog.md, decisions.md -> table §3
- PESD12VL1BA: found in analog.md, decisions.md, open-items.md -> table §3
- EEE-FT1E220AR: found in analog.md -> table §3
- LM66100: found in analog.md, decisions.md, firmware-facing-requirements.md, open-items.md -> table §3
- LM66100DCKR: found in analog.md, open-items.md -> table §3
- 1206W4F3301T5E: found in analog.md, decisions.md -> table §3
- SN74LVC3G34DCTR: found in analog.md, architecture.md, open-items.md -> table §3, §8 footprints
- SN74LVC1G34DBVR: found in analog.md, architecture.md, open-items.md -> table §3
- G6K-2F-Y: found in bypass-relay.md, mechanical-and-controls.md, open-items.md, power.md -> table §4, §8 footprints
- G6K-2F-Y-TR: found in bypass-relay.md, open-items.md -> table §4
- 1N4148W-7-F: found in bypass-relay.md, open-items.md -> table §4
- 1N4148W: found in bypass-relay.md, open-items.md -> table §4, §10 reference list
- BZT52C12-7-F: found in bypass-relay.md, open-items.md -> table §4
- BZT52C12: found in bypass-relay.md, open-items.md -> table §4
- RV16AF-41: found in analog.md, decisions.md, mechanical-and-controls.md, open-items.md -> table §5
- TC-6610-17-100G: found in decisions.md, mechanical-and-controls.md -> table §5
- NMJ6HCD2: found in decisions.md, mechanical-and-controls.md, power.md -> table §5, §8 footprints
- PJ-057AH: found in mechanical-and-controls.md -> table §5
- WP7113ID: found in decisions.md, open-items.md, power.md -> table §5, §8 footprints
- 0603WAF2401T5E: found in power.md -> table §5
- SN74LVC1G07: found in decisions.md, power.md -> table §5
- AO3401A: found in decisions.md, open-items.md, power.md -> table §5, Not-in-force
- 1206W4F1600T5E: found in decisions.md -> table §5
- TS3USB221RSER: found in architecture.md, decisions.md, firmware-facing-requirements.md, open-items.md -> table §5
- USBLC6-2: found in analog.md, decisions.md, open-items.md -> table §5
- PBS-24-MP: found in decisions.md, mechanical-and-controls.md, open-items.md -> table §6, §10 reference list
- 1301.9316.24: found in decisions.md, mechanical-and-controls.md -> table §6
- 1301.9314.24: found in decisions.md, mechanical-and-controls.md -> table §6
- 9774050360R: found in decisions.md, mechanical-and-controls.md -> table §6
- TSW-102-14-F-S: found in decisions.md, mechanical-and-controls.md -> table §6
- TSW-102-07-F-S: found in decisions.md, mechanical-and-controls.md -> table §6, Not-in-force
- 1590BB: found in decisions.md, mechanical-and-controls.md, open-items.md -> table §6, Not-in-force
- 801-87-020-10-012101: found in decisions.md, mechanical-and-controls.md -> table §7, Not-in-force
- 800-10-020-10-002101: found in decisions.md, mechanical-and-controls.md, open-items.md -> table §7, Not-in-force
- 800-10-064-10-002101: found in decisions.md, mechanical-and-controls.md, open-items.md -> table §7
- AS4C16M16SA: found in open-items.md, processor-and-memory.md -> table §7
- MT48LC16M16A2: found in open-items.md, processor-and-memory.md -> table §7
- IS42S16320F: found in power.md, processor-and-memory.md -> table §7
- OT3EL4C4JI-111OLP-12.288M: found in analog.md, open-items.md -> table §7
- SS34-E3/57T: found in open-items.md -> table §7
- PESD15VL1BA: found in analog.md, decisions.md -> table §7
- CRCW120627R0FKEAHP: found in decisions.md -> Not-in-force
- CRCW120610R0FKEAHP: found in decisions.md -> Not-in-force
- OPA1652: found in analog.md -> Not-in-force
- SLW-120-01-G-S: found in decisions.md, mechanical-and-controls.md -> Not-in-force
- TLW-120-06-G-S: found in decisions.md, mechanical-and-controls.md -> Not-in-force
- HC-TYPE-C-16P-01A: found in decisions.md, mechanical-and-controls.md, processor-and-memory.md -> Not-in-force
- PTS645SM43SMTR92: found in decisions.md, mechanical-and-controls.md -> Not-in-force
- 3FSH9: found in mechanical-and-controls.md -> Not-in-force
- RV16AF-42-15R1-B10K: found in decisions.md -> Not-in-force
- 1MS3T2B3M2QES: found in decisions.md -> Not-in-force
- FS5700SPMT2B2M2QE: found in decisions.md -> Not-in-force
- LM74700-Q1: found in power.md -> Not-in-force
- LM74800-Q1: found in power.md -> Not-in-force
- LM74810-Q1: found in power.md -> Not-in-force
- LM74801-Q1: found in power.md -> Not-in-force
- LM317: found in power.md -> Not-in-force
- BSS138: found in analog.md, bypass-relay.md -> Not-in-force
- G6KU: found in bypass-relay.md -> Not-in-force
- TQ2-L2: found in bypass-relay.md -> Not-in-force
- OPA1642: found in analog.md -> Not-in-force
- OPA2197: found in analog.md -> Not-in-force
- SSM-120-L-SV: found in mechanical-and-controls.md -> Not-in-force
- M20-786: found in mechanical-and-controls.md -> Not-in-force
- HLE-120-02-G-DV: found in mechanical-and-controls.md -> Not-in-force
- M20-7812045: found in mechanical-and-controls.md -> Not-in-force
- 801-87-020-30-002101: found in mechanical-and-controls.md -> Not-in-force
- 801-43-020-10-002000: found in mechanical-and-controls.md -> Not-in-force
- PTS645SK13SMTR92: found in mechanical-and-controls.md -> Not-in-force
- 430456043736: found in mechanical-and-controls.md -> Not-in-force
- FS5700: found in decisions.md, mechanical-and-controls.md -> Not-in-force
- 1590BBS: found in mechanical-and-controls.md -> Not-in-force
- STM32H750IB: found in architecture.md, decisions.md, firmware-facing-requirements.md, processor-and-memory.md -> §10 reference list
- STM32H750IBKx: found in architecture.md -> §10 reference list
- WM8731: found in architecture.md, decisions.md, open-items.md -> §10 reference list
- AK4556: found in open-items.md -> §10 reference list
- AK4430: found in open-items.md -> §10 reference list
- TAC5242: found in architecture.md -> §10 reference list
- LP2985: found in analog.md, architecture.md, open-items.md -> §10 reference list
- TPS6217x: found in architecture.md, open-items.md, power.md -> §10 reference list
- AMS1117: found in processor-and-memory.md -> §10 reference list
- PGA2310: found in processor-and-memory.md -> §10 reference list
- SF12030F: found in decisions.md, mechanical-and-controls.md -> §10 reference list
- EXS00A-CG06750: found in processor-and-memory.md -> §10 reference list
- ISOM8710: found in open-items.md, power.md -> §10 reference list
- K106-E1-11: found in bypass-relay.md, mechanical-and-controls.md, open-items.md, power.md -> prose §How to read the table, table §4

Summary: 139 entries, none unplaced. K106-E1-11 is the G6K data sheet's catalogue number, not a part; it is stated in the relay row and in "How to read the table".

## Chosen-by labels, with their source wording

Every row's label, as written in the tables (MPN (role): Chosen by):

- STM32H743IIT6 (MCU, U_MCU (LQFP-176)): Owner decision [O-3](decisions.md#o-3) (the module keeps the LQFP-176 STM32H743IIT6)
- W9825G6KH-6I (32 MB SDRAM, U_SDRAM (TSOP-II-54)): Controller ruling [D1](decisions.md#d1) (the 32 MB class; the fitted part is named in split spec §6.1)
- W25Q128JVSIQ (QSPI NOR flash, U_FLASH, bank 1 (data only)): Controller ruling [D11](decisions.md#d11) (one flash on bank 1)
- NX3225GA-25.000M-STD-CRG-2 (NX3225GA 25 MHz, CL 8 pF) (25 MHz HSE crystal, Y_HSE): Controller ruling [D8](decisions.md#d8)
- TLV803EA30DBZR (NRST supervisor, U_SUP): Owner decision [D14](decisions.md#d14) (an owner-approved delta)
- BLM21PG221SN1D (VDDA ferrite, FB_VDDA): Owner decision [D17](decisions.md#d17) (an owner-approved delta), narrowed by [R-57](decisions.md#r-57) (VDDA-WIDEBAND may need a bead with more inductance)
- TPS62933FDRLR (3.3 V buck, U_BUCK): Controller ruling [D5](decisions.md#d5) (the buck, on the module); the part is `POWER.md` §3.3's
- 74439346047 (Buck inductor, L_BUCK (WE-XHMI 4.7 µH)): Controller ruling (design note)
- CL31A226KAHNNNE (Buck output capacitors, C_BOUT1 to C_BOUT3 (22 µF 25 V X5R 1206)): Controller ruling (design note)
- CL10B333KB8NNNC (Buck soft-start capacitor, C_SS (33 nF)): Controller ruling (design note)
- 74404054047 (Buck input filter inductor, L_FILT (WE-LQS 4.7 µH)): Controller ruling [R-48](decisions.md#r-48) (the module carries the buck input network unchanged)
- EEE-FK1V470P (Input filter damping capacitor, C_DAMP (47 µF 35 V aluminium)): Controller ruling [R-48](decisions.md#r-48)
- CL31B106KBHNNNE (Buck input ceramics, C_BIN1 and C_BIN2 (10 µF 50 V X7R 1206)): Controller ruling [R-48](decisions.md#r-48)
- not named for this role (LCSC code only) (Buck EN/UVLO divider top, R_UV1 (18.0 kΩ ±1 %)): Controller ruling [R-47](decisions.md#r-47)
- not named for this role (LCSC code only) (Buck EN/UVLO divider bottom, R_UV2 (4.30 kΩ ±1 %)): Controller ruling [R-47](decisions.md#r-47)
- TYPE-C-31-E-17 (ROM-DFU USB socket, J_USB_MOD (vertical 16-pin USB-C)): Controller ruling [R-60](decisions.md#r-60), under owner decision [O-11](decisions.md#o-11)
- FTSH-105-01-F-DV-K (SWD header, J_SWD (2 × 5, 1.27 mm)): Controller ruling [D9](decisions.md#d9) (the header); the part is the v1 checklist's, used by the envelope study
- PTS645VL31-2 LFS (BOOT0 and RESET tactile switches, SW_BOOT and SW_RESET (right angle, THT)): Controller ruling [OWN-05](decisions.md#own-05) (moved to the module under [O-12](decisions.md#o-12)); [R-55](decisions.md#r-55) caps its claims at its 60 °C rating
- 800-10-020-10-002000 (Module header, J_MOD_A and J_MOD_B (1 × 20, male), each cut to 20 ways from the 64-way strip 800-10-064-10-002000): Controller ruling [R-61](decisions.md#r-61) (a controller part choice under owner decision [O-12](decisions.md#o-12))
- PMEG4030ER,115 (Per-branch reverse-polarity Schottky, D_AIN and D_MIN): Controller ruling [R-35](decisions.md#r-35)
- EEE-FK1V101P (Hold-up reservoir, C_BULK and C_BULK2 to C_BULK4 (100 µF 35 V aluminium)): Controller ruling [R-35](decisions.md#r-35), [R-40](decisions.md#r-40) (the fourth can)
- CL31B106KBHNNNE (VIN_A ceramics: C_PROT, C_LIN and the op-amp decoupling; U_PRAIL's input capacitors (10 µF 50 V X7R 1206)): Controller ruling (design note)
- BLM31KN601SN1L (Input ferrite, FB_IN (its position is an S2 choice)): Controller ruling (design note)
- TPS3808G01DBVR (Power-fail supervisor at VIN, U_PF): Controller ruling [R-36](decisions.md#r-36) (the sense point and divider; the part is v1's)
- SN74LVC2G14DBVR (Schmitt inverter making PF_TRIP and PF_ON, U_PFINV (dual)): Controller ruling [R-37](decisions.md#r-37), [R-40](decisions.md#r-40) (the dual part)
- AO3400A (Override and gate-driver N-MOSFETs: Q_PFG, Q_PFR, Q_VDIS, Q_MSWD): Controller ruling [R-37](decisions.md#r-37), [R-38](decisions.md#r-38)
- AOD4185 (Module load switch, Q_MSW (P-MOSFET, TO-252)): Controller ruling [R-41](decisions.md#r-41)
- CRCW201010R0FKEFHP (VIN_MOD discharge resistor, R_VDIS (10.0 Ω, pulse proof, 2010)): Controller ruling [R-42](decisions.md#r-42)
- BAS116H,115 (Clamp and steering diodes: D_PFCL, D_SS, D_GS): Controller ruling [R-40](decisions.md#r-40) (D_PFCL, D_SS), [R-49](decisions.md#r-49) (D_GS)
- CL21B224KBFNNNE (Plug-in gate hold capacitor, C_GS (220 nF 50 V X7R 0805)): Controller ruling [R-49](decisions.md#r-49)
- 0603WAF4703T5E (Plug-in gate hold bleeder, R_GSB (470 kΩ)): Controller ruling [R-49](decisions.md#r-49)
- 2N7002,215 (3V3_P EN reset, Q_PEN (N-MOSFET, SOT-23)): Controller ruling [R-58](decisions.md#r-58)
- TPS7A4901DGNR (5V_A LDO, U_LDO): Controller ruling [D3](decisions.md#d3) (the 5V_A LDO); the part is `POWER.md` §3.4's
- TPS62933FDRLR (Pedal digital rail buck, U_PRAIL (3V3_P)): Controller ruling [R-25](decisions.md#r-25)
- 74439346047 (U_PRAIL's inductor (WE-XHMI 4.7 µH), the module buck's network copied): Controller ruling [R-25](decisions.md#r-25)
- CL31A226KAHNNNE (U_PRAIL's output capacitors (22 µF 25 V X5R 1206)): Controller ruling [R-25](decisions.md#r-25)
- CL10B333KB8NNNC (U_PRAIL's soft-start capacitor (33 nF)): Controller ruling [R-25](decisions.md#r-25)
- PCM3060PWR (Codec, U_CODEC (TSSOP-28), clock master in hardware mode): Owner decision [O-2](decisions.md#o-2) (the PCM3060 on the audio board as clock master); hardware mode is [D2](decisions.md#d2) (controller ruling)
- X1G0041710019 (Codec oscillator, U_XO (SG-210STF 12.288000 MHz L)): Controller ruling [R-29](decisions.md#r-29), implementing owner decision [D20](decisions.md#d20)
- TPS7A2433DBVR (Codec VDD regulator, U_CVDD): Controller ruling [R-30](decisions.md#r-30), implementing owner decision [D22](decisions.md#d22)
- CL10B105KO8NNNC (U_CVDD input and output capacitors, C_CVDDIN and C_CVDDOUT (1 µF 16 V X7R 0603)): Controller ruling [R-30](decisions.md#r-30)
- PMEG4005AEA,115 (Power-down clamp, D_CVCL): Controller ruling [R-30](decisions.md#r-30)
- 0603WAF3601T5E (3V3_CODEC bleeder, R_CBLD (3.60 kΩ ±1 % 0603)): Controller ruling [R-30](decisions.md#r-30)
- TLV803EA29DBZR (Codec local reset supervisor, U_CRST): Controller ruling [R-31](decisions.md#r-31), implementing owner decision [D21](decisions.md#d21)
- 0603WAF4701T5E (Codec reset pull-up, R_CRST (4.70 kΩ ±1 % 0603)): Controller ruling [R-31](decisions.md#r-31) (as amended to 4.70 kΩ)
- GRM188R71H104KA93D (Codec-domain 100 nF decoupling: C_XO, C_CRST; also U_PFINV's C_PFINV (50 V X7R 0603)): Controller ruling (design note)
- OPA1688IDR (Audio and VMID op-amps: U_VMID, U_IN, U_OUT, U_ADC (four duals)): Controller ruling (design note: `ANALOG.md` "Decision: OPA1688 for every audio and VMID op-amp"); the owner's [AN-D1](decisions.md#an-d1) full scale is set by its swing
- MCP6001T-I/OT (Expression-tip follower, U_EXP): Controller ruling (design note); its supply on VREF_A is owner decision [D19](decisions.md#d19)
- PESD12VL1BA,115 (Jack ESD diodes on every audio tip and the expression tip and ring): Owner decision [OWN-03](decisions.md#own-03) ("PESD12VL1BA stays the fitted part (owner decision)")
- EEE-FT1E220AR (DC-blocking capacitors, C_DC and the ADC driver's coupling capacitor (22 µF 25 V aluminium, FT series)): Controller ruling (design note)
- LM66100DCKR (Expression back-feed blocking ideal diode, U_REFBLK): Controller ruling [R-17](decisions.md#r-17)
- 2N7002,215 (U_REFBLK enable, Q_REFEN (N-MOSFET)): Controller ruling [R-17](decisions.md#r-17)
- not named for this role (LCSC code only) (U_REFBLK gate and enable resistors, R_ENG and R_CE (100 kΩ)): Controller ruling [R-17](decisions.md#r-17)
- not named (LCSC code only) (Expression tip series resistor, R_EXPIN (2.2 MΩ)): Controller ruling [R-17](decisions.md#r-17)
- PMEG4005AEA,115 (Ring Schottky clamp, D_RCLAMP): Controller ruling [R-19](decisions.md#r-19)
- 1206W4F3301T5E (Expression ring reference, R_REF (3.30 kΩ 1 % 1206)): Controller ruling [R-19](decisions.md#r-19), within [AN-RING](decisions.md#an-ring)
- SN74LVC3G34DCTR (SAI isolation buffer toward the module, U_ISO_M (triple, on 3V3_D)): Controller ruling (S1 crossing analysis); its series resistors are [R-10](decisions.md#r-10)
- SN74LVC1G34DBVR (SAI isolation buffer toward the codec, U_ISO_C (single, on 3V3_CODEC)): Controller ruling (S1 crossing analysis)
- G6K-2F-Y DC3 (on tape: G6K-2F-Y-TR DC3) (Bypass relays, K_BYP_IN and K_BYP_OUT (DPDT, SMD, 3 V coil, non-latching); data sheet catalogue number K106-E1-11): Controller ruling, in the `BYPASS-RELAY.md` note the owner approved under [OWN-01](decisions.md#own-01) (his decision is relay bypass; no recorded words of his name the part)
- AO3400A (Relay coil driver, Q_BYP (N-MOSFET, both coils)): Controller ruling, in the note approved under [OWN-01](decisions.md#own-01); its gate network is [R-13](decisions.md#r-13)
- 1N4148W-7-F (Coil suppressor diodes, D_BF_IN and D_BF_OUT): Controller ruling, in the note approved under [OWN-01](decisions.md#own-01)
- BZT52C12-7-F (Coil suppressor Zeners, D_BZ_IN and D_BZ_OUT): Controller ruling, in the note approved under [OWN-01](decisions.md#own-01)
- RV16AF-41 B10K (Control-position pot fit, RV_POSn (10 kΩ linear, short shaft)): Owner decision [O-17](decisions.md#o-17), as decisions.md records it, and [O-18](decisions.md#o-18) (each position a pot or a button)
- TC-6610-17-100G (Control-position button fit (6 × 6 THT tactile)): Owner decision [O-17](decisions.md#o-17) ("lets start with the simple option A"), made a position fit by [O-18](decisions.md#o-18)
- NMJ6HCD2 (¼ in audio jacks (two in, two out) and the expression jack (TRS, ring normal)): Controller ruling [OWN-05](decisions.md#own-05); kept by [R-62](decisions.md#r-62)
- PJ-057AH (DC power jack, J_DC): Controller ruling [OWN-05](decisions.md#own-05); the split leaves remaining panel parts to S2 ([split spec §9.2][split]), and only the S1 envelope study uses this one
- WP7113ID (LEDs, LED1 and LED2): Controller ruling [OWN-05](decisions.md#own-05); used by [R-27](decisions.md#r-27)
- 0603WAF1000T5E (LED series resistors, R_LED1 and R_LED2 (100 Ω ±1 % 0603)): Controller ruling [R-27](decisions.md#r-27)
- 0603WAF1201T5E (Footswitch series resistors, R_FSW1 and R_FSW2 (1.20 kΩ ±1 % 0603)): Controller ruling [R-22](decisions.md#r-22)
- 0603WAF2401T5E (I²C expansion bus pull-ups (2.40 kΩ ±1 % 0603)): Controller ruling [R-21](decisions.md#r-21)
- SN74LVC1G07DBVR (MIDI OUT open-drain driver, U_MIDIDRV (on 3V3_D)): Controller ruling [R-23](decisions.md#r-23)
- AO3401A (MIDI OUT high-side switch, Q_MIDI (P-MOSFET)): Controller ruling [R-26](decisions.md#r-26)
- 1206W4F1600T5E (Q_MIDI gate pull-up, R_MGP (160 Ω ±1 % 1206)): Controller ruling [R-26](decisions.md#r-26) as amended by [R-53](decisions.md#r-53)
- 1206W4F1300T5E (MIDI OUT RA, four in parallel (130 Ω ±1 % 1206)): Controller ruling [R-26](decisions.md#r-26)
- 1206W4F100JT5E (MIDI OUT RC (10 Ω ±1 % 1206)): Controller ruling [R-26](decisions.md#r-26)
- TS3USB221RSER (USB isolation switch on pins 36/37, U_USBSW): Controller ruling [R-14](decisions.md#r-14)
- USBLC6-2SC6 (USB ESD protection at the pedal's USB-C, U_ESD): Controller ruling [D10](decisions.md#d10) (ESD moves to the pedal board)
- PBS-24-MP (Footswitch actuator, FSW1 and FSW2 (spring stomp actuator in the top panel; Tayda A-8660)): Owner decision [O-17](decisions.md#o-17) ("this is the stomp switch actuator")
- 1301.9316.24 (Schurter LSH) (Footswitch tact switch, build A (collar on the panel; 7.00 mm)): Controller ruling: the realisation under owner decision [R-56](decisions.md#r-56)
- 1301.9314.24 (Schurter LSH) (Footswitch tact switch, build B (panel between two nuts; 4.30 mm)): Controller ruling: the realisation under owner decision [R-56](decisions.md#r-56)
- 9774050360R (WA-SMSI) (Hung-board spacers, two per board (M3 SMT, 5 mm)): Controller ruling: the realisation under owner decision [R-56](decisions.md#r-56)
- TSW-102-14-F-S (Hung-board 2-pin header, build A): Controller ruling: the realisation under owner decision [R-56](decisions.md#r-56)
- TSW-102-07-F-S (Hung-board 2-pin header, build B): Controller ruling: the realisation under owner decision [R-56](decisions.md#r-56)
- 801-43-020-10-012000 (Module socket, J_MOD_A and J_MOD_B (1 × 20, female, low profile)): Controller ruling [R-61](decisions.md#r-61) (a controller part choice under owner decision [O-12](decisions.md#o-12))
- 1590BB (Enclosure (landscape)): Owner decision [O-17](decisions.md#o-17), narrowed by [R-62](decisions.md#r-62) (controller ruling: design to the owner-measured Tayda 1590BB-style box; plan sizes stay Hammond's)
- 801-87-020-10-012101 (Fallback module socket (the Preci-Dip pair)): Controller ruling [R-61](decisions.md#r-61) (the fallback pair)
- 800-10-020-10-002101 (Fallback module header, cut to 20 from the 64-way 800-10-064-10-002101): Controller ruling [R-61](decisions.md#r-61) (the fallback pair)
- AS4C16M16SA (-6, -7); MT48LC16M16A2 (-6A, -7E, -75); IS42S16320F (-6, -7, an optional class) (SDRAM in the same 32 MB class: footprint and nets accept it): Controller ruling [D1](decisions.md#d1) (the class)
- OT3EL4C4JI-111OLP-12.288M (Stocked alternate for U_XO; needs a footprint change): Controller ruling [R-29](decisions.md#r-29) (named in its fix round)
- TLV803EA29, R pinout (First fallback for U_CRST: the EA29 with the R pinout (pin 1 RESET̅, 2 GND, 3 VDD; orderable code not named)): Controller ruling (design note: the codec-domain analysis's stock notes, under [R-31](decisions.md#r-31))
- TLV803EA30DBZR (Second fallback for U_CRST (only 45 mV of start-up margin)): Controller ruling (design note: the codec-domain analysis's stock notes, under [R-31](decisions.md#r-31))
- SS34-E3/57T (Unqualified 40 V, 3 A alternative to the PMEG4030ER): Controller ruling (design note; not qualified: open item SCHOTTKY-ALTERNATE-UNQUALIFIED)
- PESD15VL1BA (Unfitted option for the jack ESD diodes): Owner decision [OWN-03](decisions.md#own-03) records it as an unfitted option
- CL10B104KB8NNNC (Option for VBUS-HOTPLUG: C_VBUS 100 nF X7R from PA1 to GND, if a model does not show PA1 ≤ 3.6 V): Controller ruling [R-57](decisions.md#r-57) (the option, not a fit)

The source wording behind the labels that are not plain controller rulings:

- **O-3 (STM32H743IIT6).** decisions.md O-3, an owner decision: "the module keeps the LQFP-176 STM32H743IIT6" (split spec §2 row O-3: "It keeps the LQFP-176 STM32H743IIT6").
- **O-2 (PCM3060PWR).** decisions.md O-2, an owner decision: "the codec is on the audio board ... The PCM3060 is clock master in hardware mode". The codec itself first appears in the original platform spec's *Architecture decisions* ("TI PCM3060 (Active at TI) in hardware mode"); hardware mode is D2, a controller ruling.
- **D14 (TLV803EA30DBZR) and D17 (BLM21PG221SN1D).** decisions.md lists both under Owner decisions, "approved by the owner 2026-10-04"; D14 decides "a TLV803EA30DBZR supervisor drives NRST open-drain", D17 "FB_VDDA is Murata BLM21PG221SN1D". The part is the delta's subject, so the owner's approval names it.
- **OWN-03 (PESD12VL1BA,115; PESD15VL1BA as unfitted option).** decisions.md OWN-03, owner decision: "PESD12VL1BA stays the fitted part (owner decision)"; "The PESD15VL1BA is recorded as an unfitted option".
- **O-17 (PBS-24-MP, TC-6610-17-100G).** decisions.md O-17 "Owner, choosing the parts (2026-10-05)": "this is the stomp switch actuator: https://www.taydaelectronics.com/momentary-pcb-spring-switch.html" (DAIER PBS-24-MP); "lets start with the simple option A" (HCTL TC-6610-17-100G).
- **O-17 (RV16AF-41 B10K; Hammond 1590BB).** decisions.md O-17 Decides: "a Hammond 1590BB in landscape; the audio board's top face about 10.7 mm below the lid's inner face, set by short-shaft Alpha RV16AF-41 pots"; OWN-05: "pots are RV16AF-41 (O-17)". See concern 1. The 1590BB is narrowed by R-62 (controller ruling on owner-supplied fact F-5).
- **R-56 realisation (Schurter 1301.9316.24 and 1301.9314.24, Würth 9774050360R, Samtec TSW-102-14-F-S and TSW-102-07-F-S).** decisions.md R-56: "Decides (the owner): the switch board must work with (a) ... and (b) ..."; "Realisation (the controller's, under that decision; the owner may override it): a Schurter LSH tact switch ... on two 5 mm Würth WA-SMSI 9774050360R spacers ... Build A ... Schurter 1301.9316.24 ... TSW-102-14-F-S header. Build B ... Schurter 1301.9314.24 ... TSW-102-07-F-S header." Labelled "Controller ruling: the realisation under owner decision R-56".
- **R-61 (Mill-Max socket and header; Preci-Dip fallback).** decisions.md O-12 Narrowed by: "The socket and header parts are controller choices, last set by R-61 (controller ruling; the owner may override)". mechanical-and-controls.md EC-SOCKET-AND-HEADER: "These are controller part choices under O-12, not the owner's decision."
- **Bypass-note parts (G6K-2F-Y DC3, AO3400A Q_BYP, 1N4148W-7-F, BZT52C12-7-F).** decisions.md OWN-01 decides relay bypass and records no words of the owner naming a part; bypass-relay.md EC-RELAY-PART: "Set by: `BYPASS-RELAY.md` §1 and §3, the note the owner approved on 2026-10-04". Labelled "Controller ruling, in the `BYPASS-RELAY.md` note the owner approved under OWN-01". See concern 2.
- **OWN-05 (NMJ6HCD2, PJ-057AH, WP7113ID, PTS645VL31-2 LFS).** decisions.md OWN-05 is labelled a controller ruling ("with the same ambiguous heading as OWN-02"); "later rulings use the Neutrik NMJ6HCD2 jacks (R-62) and Kingbright WP7113ID LEDs (R-27)"; "the BOOT0 and RESET tactile switches move to the module". See concern 3 for PJ-057AH.
- **D-numbered controller rulings (D1, D3, D5, D8, D9, D10, D11).** decisions.md labels D1 to D13 "controller ruling, with an ambiguity the owner may want to settle".
- **"Controller ruling (design note)".** Parts a pedals design note or S1 analysis chose with no decisions.md entry of its own: 74439346047, CL31A226KAHNNNE, CL10B333KB8NNNC (module), CL31B106KBHNNNE, BLM31KN601SN1L, GRM188R71H104KA93D, OPA1688IDR (`ANALOG.md`: "Decision: OPA1688 for every audio and VMID op-amp"), MCP6001T-I/OT, EEE-FT1E220AR, SN74LVC3G34DCTR and SN74LVC1G34DBVR (S1 crossing analysis), SS34-E3/57T, and U_CRST's two fallbacks (codec-domain analysis stock notes).

## Anchors other tasks may need

parts.md section headings: `## 1. The processor module (h7-module)` (#1-the-processor-module-h7-module), `## 7. Named alternates and fallbacks (not fitted)`, `## 8. Footprints`, `## 9. Not in force`, `## 10. Parts named in these documents that are not parts of these boards`. Task 12's README can map OWNER-DEFAULTS.md's "Panel parts at a glance" and POWER.md §3.1 "Selected parts" to parts.md.

## Concerns

1. **RV16AF-41 is labelled O-17 because decisions.md does so, but no recorded words of the owner name the pot.** The brief's rule says a part inside an owner decision is a controller choice unless the owner named it. decisions.md's O-17 Decides line and OWN-05's "pots are RV16AF-41 (O-17)" attribute it to O-17, and the split spec puts it in O-17's baseline text (not in the italic annotations): "The owner adopted that layout ... (short-shaft RV16AF-41 pots)". I followed decisions.md (the instruction not to restate its labels) and wrote "as decisions.md records it". If the controller reads the rule strictly, the row should read "Controller ruling, recorded in O-17's baseline", and decisions.md's O-17 and OWN-05 should say so too; I did not edit decisions.md.
2. **Bypass-relay parts: owner-approved note, controller part choice.** EC-RELAY-PART's "Set by" says the owner approved the note naming the G6K-2F-Y. I labelled the relay and its drive parts controller choices inside that approved note, because no recorded words of the owner name a part and decisions.md's OWN-01 decides relay bypass only. That is a different treatment from D14/D17 (owner-approved deltas whose subject is the part). If the controller holds that approving the note is approving its parts, the four §4 rows change to OWN-01.
3. **PJ-057AH is used only by the S1 envelope study.** Split spec §9.2 leaves the "remaining parts" of OWN-05 to S2; decisions.md names later rulings for NMJ6HCD2 (R-62) and WP7113ID (R-27) but none for the DC jack. I kept it as a table row (chosen by OWN-05, the row says only the envelope study uses it) rather than "v1 record only", because an S1 analysis that still binds (the room under the board) rests on it.
4. **The SWD header FTSH-105-01-F-DV-K is the v1 checklist's part (USB-06), used by the S1 envelope study.** D9 fixes only "the 2 × 5 1.27 mm Cortex debug header". Same treatment as concern 3.
5. **processor-and-memory.md §8 says "the platform needs only tactile switches"** for BOOT0/RESET, while R-55 and the envelope study use the PTS645VL31-2 LFS and its 6.2 mm height sets the stack. parts.md lists the PTS645VL31-2 LFS (OWN-05, carried by R-55). Not a conflict in the sources, but the topic document's sentence could be read as leaving the part open.
6. **Two parts hold two roles.** The TLV803EA30 is on a Not-in-force line as the codec's reset and in the tables as the module's U_SUP and as U_CRST's second fallback; the AO3401A and BAS116H likewise appear on Not-in-force lines for one role and in the tables for another. Each Not-in-force line says which role it retires.
7. **Candidates compared and not chosen are on Not-in-force lines** (LM747xx/LM748xx, LM317, BSS138, G6KU, TQ2-L2, OPA1652/OPA1642/OPA2197, the socket and control candidates), because the brief offers only the table or a Not-in-force line. Parts that belong to other hardware (the Seed's, OSCAR's) or are cited for a figure (SF12030F, EXS00A-CG06750, ISOM8710, the TDK example) went to a separate §10 list instead: they are neither choices nor superseded choices. That is a third destination the brief did not name.
8. **The Würth 74439346047 LCSC code C6827938 is carried with the source's note that LCSC had no product record for it on 2026-10-06** (open item POWER-PARTS-STOCK); the code may be wrong.
9. **SCHEMATIC-CHECKLIST.md is cited for six LCSC codes** before Task 10 ports its content. It is a pedals design note (not the v1 schematic), so I treated it as a source that records codes.
10. The scratch helpers (`mpn_context.py`, `walk.py`, `parts_check_cases.py`) are in my scratchpad, not committed.


## Fix round 1 (commit 3f1240d, pushed)

### Changes

1. **RV16AF-41.** I checked the wording at the pin. Split spec line 24 (the summary) has "(short-shaft RV16AF-41 pots)" in parentheses. The O-17 row (line 57) never names the pot. The O-18 row (line 58) and §5.1.2 (line 186) name it only as an annotation. envelope.md's Owner inputs and §0 size the 10.7 mm from the Taiwan Alpha catalogue.
   - parts.md now reads: "Controller ruling (envelope study, split spec §5.1.1), under owner decisions O-17 (the ~10 mm loft) and O-18 (pot-or-button positions)".
   - decisions.md, O-17 Decides: the pot clause is replaced by the owner's loft measurement (F-1). A new "Not the owner's:" line says where the pot comes from.
   - decisions.md, O-18 Decides: the pot is described as the split spec's annotation and a controller choice. This line had the same promotion, so I edited it under item 1 as well.
   - decisions.md, OWN-05 Current: the pot is now "a controller part choice from the envelope study under O-17's board height".
2. **PJ-057AH.** Chosen by now reads "Study assumption: envelope.md §5 uses OWN-05's v1-era choice; split spec §9.2 leaves the DC jack to S2". "How to read the table" now defines "Study assumption". FTSH-105-01-F-DV-K is unchanged except for the USB-06 wording.
3. **R_UV1 and R_UV2.** They now carry 0603WAF1802T5E and 0603WAF4301T5E (Uniroyal), citing vin-mod.md §2 and §8.
4. **MPN-specified passives.** I read each S1 parts table at the pin: power-fail.md §10, vin-mod.md §8, pedal-digital-rail.md §8, codec-domain.md §6 and crossings.md. I also read POWER.md §3.1.
   - The 20 rows added:
     - R_PFT1 RT0603BRD0713KL C861121
     - R_PFT2 RT0603BRD07174KL C861163
     - R_PFB RT0603BRD0710KL C95204 (the MPN is from SCHEMATIC-CHECKLIST PWR-18; power-fail.md §10 gives only "v1's parts" and the code)
     - C_PFS CL10C102JB8NNNC C163508
     - C_PF CL10B104KB8NNNC C1591 (both MPNs from BYPASS-RELAY.md §3.4)
     - C_PFCT C1206N473J050T C5451690
     - R_VBLD 1206W4F1002T5E C17902
     - R_PFPU/R_PFTPD/R_PFONPD 0603WAF1003T5E C25803
     - R_MSWT/R_SSR 0603WAF1502T5E C22809
     - R_MSWB 0603WAF4301T5E C23159
     - C_SS CL31B225KBHNNNE C50254
     - R_PEN 0603WAF1503T5E C22807
     - C_PEN CL31B475KBHNNNE C51205 ×2
     - R_PENS 0603WAF1800T5E C22828
     - R_PENPD 0603WAF1004T5E C22935
     - the 100 nF HF bypass CL21B104KBCNNNC C1711, one row on h7-pedal (U_PRAIL's input) and one on h7-module (C_BINHF, under R-48)
     - C_LOUT CL31B106KOHNNNE C47971
     - C_NR/C_FF CL21B103KBANNNC C1710
     - R_TXPU 0603WAF1802T5E C25810
   - Supersession check against power.md and decisions.md: each value is current. The only superseded MPN in these tables is R_PENS 150 Ω 0603WAF1500T5E (C22808), replaced by 180 Ω under R-52; it is now on a Not-in-force line. R_GSB's earlier 1.00 MΩ and C_GS's earlier 100 nF have no MPN named for those roles, so they are not added.
   - The scope sentence (old line 14) now says what is listed and what is not. Not listed: the v1-era passives that only SCHEMATIC-CHECKLIST.md specifies by MPN (its PWR, AIO, CTL and USB rows, for example the RT0805 0.1 % resistors, the C0G compensation capacitors and the USB shield RC). Those belong to the checklist port.
5. **Smaller fixes.**
   - The section numbers now point to §9 (Not in force) and §7 (alternates).
   - The W25Q128JVSIQ "not recommended for new design; kept" note now cites OWNER-DEFAULTS.md's ALL-08 lifecycle list.
   - Ported-from now names SCHEMATIC-CHECKLIST as the source of CORE-18's alternates, C1591's MPN and PWR-18's R_PFB, and vin-mod.md §2 and §8.
   - The FTSH row now reads "SCHEMATIC-CHECKLIST USB-06's".
6. **verify.sh `parts`.** A header row whose first cell is "Role" but is not the exact seven-column header now fails. Shown on a scratch copy, with original restored:

```
[missing file] exit=1 FAIL parts: [missing docs/h7-platform/parts.md]
[header renamed in every table] exit=1 FAIL parts: [line 28: header starting | Role | is not | Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |;line 53: ...;line 94: ...;line 120: ...;line 129: ...;]
[one table's header reordered, the others intact] exit=1 FAIL parts: [line 28: header starting | Role | is not | Role | MPN | Manufacturer | LCSC | Board | Chosen by | Source |;]
[empty Chosen by] exit=1 FAIL parts: [line 97 (Codec oscillator, U_XO (SG-210STF 12.288000 MHz L)): empty Chosen by;]
[empty Source] exit=1 FAIL parts: [line 97 (Codec oscillator, U_XO (SG-210STF 12.288000 MHz L)): empty Source;]
[six cells] exit=1 FAIL parts: [line 97: 6 cells, expected 7;]
[escaped pipe inside a cell (expect PASS)] exit=0 PASS parts
[restored original] exit=0 PASS parts
```

The table now has 105 part rows (20 module, 36 pedal power, 21 analog, 4 relay, 16 panel, 8 footswitch, socket and enclosure) and 9 alternates. I re-ran the MPN walk: every MPN is still placed.

### Command and output

`PEDALS_REPO=/Users/orion/work/pedals-work/digital-pedal-platform bash docs/superpowers/plans/2026-11-10-digital-pedal-platform-port-execution/verify.sh parts provenance nocode effective decisions openitems`

```
PASS parts
PASS provenance
PASS nocode
PASS effective
PASS decisions
PASS openitems
exit=0
```

### Notes

- **Two different C_VBUS parts.** SCHEMATIC-CHECKLIST USB-04's C_VBUS sits on the ESD part's VBUS pin. R-57's C_VBUS option sits at PA1. They share the part C1591 (CL10B104KB8NNNC). parts.md cites the checklist only for that MPN and says where the checklist's capacitor sits.
- **"carrier" in vin-mod.md §8.** Its Board column says "carrier" for C_GS, D_GS, R_GSB and R_PENS. power.md places those parts on the pedal, so parts.md keeps "h7-pedal".
- **Concern 1 of the first report is resolved.** decisions.md O-18 was edited as well as O-17 and OWN-05.
