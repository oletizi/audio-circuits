# h7-pedal source inventory (for the pedal-pages plan)

Read-only research, worktree `digital-pedal-platform`, branch `feature/digital-pedal-platform`, HEAD `7ff9288`. Every fact carries `file:line`. Paths are relative to the repository root unless absolute. "Not in repository" means a search of the tracked files found no source. Line numbers in `docs/h7-platform/open-items.md` are table rows (one row per line).

Abbreviations: `parts` = docs/h7-platform/parts.md; `power` = docs/h7-platform/power.md; `analog` = docs/h7-platform/analog.md; `bypass` = docs/h7-platform/bypass-relay.md; `arch` = docs/h7-platform/architecture.md; `chk` = docs/h7-platform/schematic-checklist.md; `dec` = docs/h7-platform/decisions.md; `oi` = docs/h7-platform/open-items.md; `mech` = docs/h7-platform/mechanical-and-controls.md; `spec` = docs/superpowers/specs/2026-11-10-h7-platform-models-and-schematics-design.md; `contract` = circuits/h7-platform/module-interface.json.

---

## 1. The pedal's functional blocks (proposal)

### 1.0 What constrains the cut

- One page per functional block, each block one `include()`d sub-network; a block too large for Letter is split, never shrunk (spec:224-261).
- `include()` moves whole components; a multi-section package lives in one block (CLAUDE.md "Composition"; spec:231-232).
- OPA1688 allocation: four duals, one function per package, channel A = L, B = R: U_VMID (VIN_A), U_IN (VIN_A), U_OUT (VIN_A), U_ADC (5V_A) (analog:134-142; chk:149 "the op-amps are one dual package per function, channel A = L and B = R"; chk:131 PWR-10 "channel A to VMID_L and B to VMID_R"). **No OPA1688 package is shared between two functions**, so a by-function cut keeps every package whole; a by-channel cut (an L page and an R page) would split all four packages and is excluded.
- The pedal blocks the architecture lists (arch:330-344): power entry; analog supply; codec; SAI isolation; input and output stages with jack ESD; bypass relays; 3V3_P; controls; USB-C; MIDI header; I2C pull-ups; interface sockets; test pads.
- The spec's whole-board estimate is 270-300 parts (spec:146), "the reconnaissance's estimates, not measurements" (spec:140). The per-block counts below sum to about 330 with every decoupling and DNF position counted; they are estimates from the documents, not a model count.
- The largest page drawn so far holds 44 symbols (spec:226-227); the proposal keeps each block at or under about 36.

### 1.1 Proposed block list (one line each)

| # | Block (prefix) | Function | Est. parts |
|---|---|---|---|
| B1 | `entry` | DC jack, reverse-polarity Schottkys, input filter, hold-up reservoir on VIN_A, VIN bleeder | 12 |
| B2 | `pf` | Power-fail supervisor at VIN, sense divider, inverter making PF_TRIP / PF_ON | 13 |
| B3 | `modsw` | Module load switch Q_MSW onto VIN_MOD, its soft start, gate hold, VIN_MOD discharge | 12 |
| B4 | `prail` | 3V3_P buck U_PRAIL (copied module network) and its EN delay / Q_PEN reset | 19 |
| B5 | `ldo_vmid` | 5V_A LDO, R_5VA link, VMID divider and U_VMID (whole dual) | 17 |
| B6 | `codec_sup` | Codec domain supply, oscillator, local reset (U_CVDD, D_CVCL, R_CBLD, U_XO, U_CRST, Q_PFR) | 13 |
| B7 | `codec` | PCM3060, its straps, decoupling, DNF I2C links, 33 ohm series resistors | 19 |
| B8 | `sai_iso` | SAI domain isolation buffers, biases, 470 ohm module-side resistors | 11 (2 unruled caps) |
| B9 | `in_fe` | Input front ends L/R up to the follower (U_IN, whole dual), input test pads | 21 |
| B10 | `adc_drv` | ADC drivers L/R (U_ADC, whole dual), VBIAS nodes, codec-pin RC | 21 |
| B11 | `out` | Output difference amps L/R (U_OUT, whole dual), DC block, bleed, output test pads | 28 |
| B12 | `jacks_byp` | Four audio jacks, jack ESD, two bypass relays, coil drive, suppressors, Q_PFG | 18 |
| B13 | `expr_ref` | Expression jack and ESD, VREF_A blocking network, ring reference, tip chain, U_EXP, plug detect, HW_REV strap | 25 |
| B14 | `controls` | Six control positions (pot and button fits, R_POS/C_POS/R_BTN/R_PU each) | 36 |
| B15 | `fsw_led` | Two footswitch inputs (hung-board connections), two LEDs with MOSFET switches | 18 |
| B16 | `usb` | Pedal USB-C, CC resistors, ESD, shield RC, USB isolation switch, VBUS sense divider | 13 (1-2 unruled) |
| B17 | `midi_i2c` | MIDI OUT driver and high-side switch, MIDI header (DNF), MIDI IN receiver (unruled), I2C pull-ups | 11 + unruled |
| B18 | `interface` | J_MOD_A, J_MOD_B sockets; test pads (unruled) | 2 + unruled |

Placement choices made in this proposal (each a recommendation, for the plan to rule): Q_PFG sits in B12 (its drain is the relay gate, a B12-private net) and takes PF_TRIP as a port; Q_PFR sits in B6 (drain on CODEC_RST_N); Q_PEN sits in B4 (drain via R_PENS on 3V3_P's EN); Q_VDIS sits in B3. Each is a single-unit SOT-23 part, so this is a free choice, not an atomicity constraint. B14 at 36 parts could be split 3+3 positions with no atomicity cost.

### 1.2 Shared nets (block ports)

Contract-named nets take the contract's names (arch:137-178; contract pins, e.g. RELAY_EN contract:769). Pedal-internal shared nets use the documents' names.

| Net | Source of the name | Blocks |
|---|---|---|
| GND | arch:158, :178 (pins 20, 40 both GND; "The audio board joins pins 20 and 40", arch:294) | all |
| VIN (jack node, sense point) | power:25, :47 | B1, B2 |
| VIN_A | power:27, :49 | B1, B5 (LDO input, VMID divider, U_VMID), B9 (U_IN), B11 (U_OUT). Not B2: U_PF's VDD is 5V_A (power:121) |
| VIN_MOD | power:27, :53; contract pin 39 (contract:2206-2210) | B3, B4, B18 |
| D_MIN cathode node (Q_MSW source side; name not given in docs) | power:53, :147 | B1, B3 |
| 5V_A | power:50, :474 | B2 (U_PF VDD/MR, U_PFINV, R_PFPU, power:121, :142), B5, B6 (via 5V_A_CODEC), B10 (U_ADC, VBIAS) |
| 5V_A_CODEC | analog:370; power:489 | B5 (R_5VA), B6, B7 |
| 3V3_CODEC | analog:370, :387 | B6, B7, B8 (U_ISO_C VCC) |
| 3V3_P | power:437; bypass:101 | B4, B12, B15, B17 |
| 3V3_D | contract pin 38 (contract:2172-2176) | B8, B14, B15, B16, B17, B18 |
| VREF_A | contract pin 21 (contract:1318-1322) | B13, B14, B18 |
| PF_TRIP | power:62; bypass:185 | B2, B3 (Q_VDIS), B4 (Q_PEN), B6 (Q_PFR), B12 (Q_PFG) |
| PF_ON | power:63; bypass:185 | B2, B3 (Q_MSWD), B4 (R_PEN) |
| CODEC_RST_N | analog:63, :407 | B6, B7 |
| VMID_L, VMID_R | analog:125-127; chk:131 | B5, B9 (R_DIV2), B11 (R_GO) |
| FX_IN_L, FX_IN_R | bypass:91 | B12, B9 |
| FX_OUT_L, FX_OUT_R | bypass:93 | B11, B12 |
| Follower outputs into C_AC (name not given) | analog:124; chk:158 | B9, B10 |
| VINL, VINR codec inputs (pin names, chk:110) | chk:162 | B10, B7 |
| VOUTL+/-, VOUTR+/- (pin names, chk:110, :165) | chk:163-165 | B7, B11 |
| Codec-side BCK, LRCK, DOUT (after the 33 ohm) and DIN (names not given) | analog:486; chk:106 | B7, B8 |
| CODEC_DOUT, CODEC_DIN, CODEC_LRCK, CODEC_BCK | contract pins 32-35 (contract:1846-2013) | B8, B18 |
| IN_TIP_L (with right input's tip-normal) | bypass:90, :125; chk:151 | B12 only |
| RELAY_EN | contract pin 8 (contract:765-769) | B12, B18 |
| LED1, LED2 | contract pins 5, 4 (contract:615-619, :565-569) | B15, B18 |
| FSW1, FSW2 | contract pins 6, 9 | B15, B18 |
| POS1..POS6 | contract pins 22-27 (contract:1352-1601) | B14, B18 |
| EXPR_TIP, HW_REV, EXPR_DETECT | contract pins 28-30 (contract:1646-1748) | B13, B18 |
| USB_VBUS_SENSE, USB_EN_N, USB_DM, USB_DP | contract pins 31, 11, 36, 37 | B16, B18 |
| EXP_I2C_SCL, EXP_I2C_SDA | contract pins 12, 13 | B7 (DNF links, chk:105), B17, B18 |
| MIDI_UART_TX, MIDI_UART_RX | contract pins 14, 15 | B17, B18 |

### 1.3 Per-block part lists

Notation: **[UNRULED]** marks a part whose value, MPN or connection the documents do not give. A part listed with only a value has no MPN in the documents; that is not a gap for a schematic (CLAUDE.md G245; parts:14), so only missing values and connections are flagged, plus missing MPNs where a symbol choice depends on them.

#### B1 `entry` (about 12)
- J_DC DC jack, 5.5 x 2.1 mm, centre negative, plastic-bodied or isolated (chk:117 PWR-01; power:47, :532). MPN: Same Sky PJ-057AH is a **study assumption** (parts:134; oi:123 DC-JACK-FIT). **[UNRULED]** part, and whether any switch contact is used (not stated).
- FB_IN input ferrite, BLM31KN601SN1L, C668306 (parts:58); **its position on the split pedal is an S2 choice** (power:28; power:499; oi:56). **[UNRULED]** connection.
- C_SCH and C_PROTHF, 100 nF 50 V X7R 0805, CL21B104KBCNNNC (parts:82), "whose split placement goes with FB_IN's, an S2 choice" (parts:82). **[UNRULED]** connection.
- D_AIN, D_MIN, PMEG4030ER,115, C389355 (parts:55; power:26, :49, :53; chk:118 PWR-02).
- C_BULK, C_BULK2-4, 100 uF 35 V aluminium, EEE-FK1V101P, C128462 (parts:56; power:113).
- C_PROT, 10 uF 50 V X7R 1206, CL31B106KBHNNNE, C89632 (parts:57; power:114).
- R_VBLD 10.0 kOhm 1206, 1206W4F1002T5E, C17902, "on VIN so VIN falls after a plug pull" (parts:73; power:121).
- Chassis-bond GND solder pad near the DC jack, PTH 2.5 mm pad, 1.2 mm drill (power:533; chk:231 ALL-09). **[UNRULED]** whether it is a model part (a pad, no part named).
- Contract pins touched: none directly.

#### B2 `pf` (about 13)
- U_PF TPS3808G01DBVR, C19653; senses VIN; VDD and MR on 5V_A; RESET drives PF_OK only (parts:59; power:121, :142; bypass:184).
- R_PFT1 13.0 kOhm 0.1 %, RT0603BRD0713KL, C861121, VIN to clamp node (parts:67; power:121).
- R_PFT2 174 kOhm 0.1 %, RT0603BRD07174KL, C861163, clamp node to SENSE (parts:68; power:121).
- R_PFB 10.0 kOhm 0.1 %, RT0603BRD0710KL, C95204, SENSE to GND (parts:69; power:121).
- D_PFCL BAS116H,115, C74210, GND to clamp node (parts:64; power:121).
- C_PFS 1 nF C0G, CL10C102JB8NNNC, C163508, at SENSE (parts:70; power:121).
- C_PF 100 nF X7R, CL10B104KB8NNNC, C1591, U_PF VDD (parts:71).
- C_PFCT 47 nF C0G 5 % 50 V 1206, C1206N473J050T, C5451690, on CT (parts:72; power:149).
- R_PFPU 100 kOhm to 5V_A on PF_OK, 0603WAF1003T5E, C25803 (parts:74; bypass:184).
- U_PFINV SN74LVC2G14DBVR, C12401, on 5V_A with 100 nF; A makes PF_TRIP, B re-inverts to PF_ON (parts:60; bypass:185; power:142).
- C_PFINV 100 nF 50 V X7R 0603, GRM188R71H104KA93D, C77055 (parts:104).
- R_PFTPD, R_PFONPD 100 kOhm pull-downs, 0603WAF1003T5E, C25803 (parts:74; bypass:186).
- Ports: VIN, 5V_A, GND, PF_TRIP, PF_ON. Contract pins: none.

#### B3 `modsw` (about 12)
- Q_MSW AOD4185, C400894, TO-252, between D_MIN and VIN_MOD (parts:62; power:147).
- Q_MSWD AO3400A, C20917, gate on PF_ON (parts:61; power:147).
- R_MSWT 15.0 kOhm source to gate, 0603WAF1502T5E, C22809; R_MSWB 4.30 kOhm gate to Q_MSWD, 0603WAF4301T5E, C23159 (parts:75-76; power:147).
- C_SS 2.2 uF 50 V X7R 1206 drain to node X, CL31B225KBHNNNE, C50254; D_SS BAS116H X to gate; R_SSR 15.0 kOhm source to X (parts:77, :64, :75; power:148).
- C_GS 220 nF 50 V X7R 0805, CL21B224KBFNNNE, C5378, source to D_GS; D_GS BAS116H, cathode on the gate; R_GSB 470 kOhm across C_GS, 0603WAF4703T5E, C23178 (parts:65-66, :64; power:151, :323).
- Q_VDIS AO3400A (gate PF_TRIP) with R_VDIS 10.0 Ohm CRCW201010R0FKEFHP, C4332954, discharging VIN_MOD (parts:61, :63; power:150).
- Ports: D_MIN node, VIN_MOD, PF_ON, PF_TRIP, GND. Contract pin 39 (VIN_MOD) via B18.

#### B4 `prail` (about 19)
- U_PRAIL TPS62933FDRLR, C5219272, "the module buck's network copied", 3.392 V, on VIN_MOD, RT floating (parts:87; power:437).
- L 4.7 uH WE-XHMI 74439346047 (parts:88); output 22 uF 25 V X5R 1206 CL31A226KAHNNNE, C12891 (parts:89; count "3 x 22 uF ... plus 100 nF" from the module's network, power:377); C_SS 33 nF CL10B333KB8NNNC (parts:90); input 2 x 10 uF + 100 nF (power:272; parts:57, :82); feedback 32.4 kOhm over 10.0 kOhm (power:378); C_BST 100 nF with 0 Ohm R_BST footprint (power:380). These values are the module's, applied by "copied" (power:437; dec R-25 at dec:987-996); module source of the same network: circuits/h7-platform/module/power.ts:53-71.
- EN network: R_PEN 150 kOhm (0603WAF1503T5E, C22807) from PF_ON; R_PENPD 1.00 MOhm (0603WAF1004T5E, C22935) to GND; C_PEN 2 x 4.7 uF 50 V X7R 1206 (CL31B475KBHNNNE, C51205); Q_PEN 2N7002,215 (C65189) gate PF_TRIP, source GND, drain via R_PENS 180 Ohm (0603WAF1800T5E, C22828) to EN (parts:78-81, :85; power:85).
- Ports: VIN_MOD, 3V3_P, PF_ON, PF_TRIP, GND.

#### B5 `ldo_vmid` (about 17)
- U_LDO TPS7A4901DGNR, C16430; IN (8); EN (5) tied to IN; OUT (1) = 5V_A; FB (2); NR/SS (6); pin 7 DNC "connected to nothing ... with a no-connect flag"; NC (3) open or GND; GND (4) and PowerPAD (chk:129 PWR-08; parts:86; power:474).
- R_LDOT 32.4 kOhm, R_LDOB 10.0 kOhm (power:474; chk:129 "v1 contained: R_LDOT 0603WAF3242T5E (C13187), R_LDOB 10.0 kOhm (C25804)").
- C_LIN (CIN) 10 uF 50 V X7R (parts:57; power:474); C_LOUT 10 uF 16 V X7R CL31B106KOHNNNE, C47971 (parts:83); C_NR, C_FF 10 nF 50 V CL21B103KBANNNC, C1710 (parts:84; power:474).
- R_5VA 0 Ohm 0805, LDO output to codec VCC decoupling (power:489; chk:138 PWR-15).
- VMID divider 2 x 100 kOhm 0.1 % 25 ppm/C from VIN_A, 10 uF 50 V X7R at the node (analog:148; power:488; chk:130 PWR-09).
- U_VMID OPA1688IDR, C206212, A -> VMID_L, B -> VMID_R, unity followers, no output capacitor, each input through 10.0 kOhm 1 % (parts:105; analog:149; chk:131 PWR-10).
- U_VMID V+ (8) 100 nF + 10 uF 50 V; V- (4) GND (chk:132 PWR-11).
- Ports: VIN_A, 5V_A, 5V_A_CODEC, VMID_L, VMID_R, GND.

#### B6 `codec_sup` (about 13)
- U_CVDD TPS7A2433DBVR, C2866134, IN on 5V_A_CODEC, OUT 3V3_CODEC (parts:98; analog:387).
- C_CVDDIN, C_CVDDOUT 1 uF 16 V X7R 0603, CL10B105KO8NNNC, C59782 (parts:99; analog:440).
- D_CVCL PMEG4005AEA,115, C426867, anode 3V3_CODEC, cathode 5V_A_CODEC (parts:100; analog:401).
- R_CBLD 3.60 kOhm 1 % 0603, 0603WAF3601T5E, C22980, 3V3_CODEC to GND (parts:101; analog:401).
- U_XO Epson X1G0041710019 (SG-210STF 12.288000 MHz L), C255992; ST-bar tied to 3V3_CODEC; C_XO 100 nF (parts:97; analog:374). OUT drives SCKI1 and SCKI2 (chk:106).
- U_CRST TLV803EA29DBZR, C1852114, VDD on 3V3_CODEC, C_CRST 100 nF, open-drain RESET on CODEC_RST_N (parts:102, :104; analog:407).
- R_CRST 4.70 kOhm 1 % 0603, 0603WAF4701T5E, C23162, CODEC_RST_N to 3V3_CODEC (parts:103; analog:63).
- Q_PFR AO3400A, drain on CODEC_RST_N, gate PF_TRIP (analog:63; bypass:185).
- R_RST_PD 10 kOhm: **not fitted** (analog:63, :411). Whether to model a DNF position: not stated.
- Ports: 5V_A_CODEC, 3V3_CODEC, CODEC_RST_N, PF_TRIP, XO_OUT (name from analog:383), GND.

#### B7 `codec` (about 19)
- U_CODEC PCM3060PWR, C2651841, TSSOP-28 (parts:96; chk:87).
- VCC (24) from 5V_A via PWR-15's 0 Ohm, 100 nF + 10 uF to AGND; VDD (7) 100 nF + 10 uF to DGND (chk:88 CODEC-02). 10 uF MPN: chk:88 says "The 10 uF part is in parts.md", parts.md has no codec 10 uF row (see section 6).
- VCOM (21) 100 nF + 10 uF, no other connection (chk:92 CODEC-03).
- AGND1 (23), AGND2 (22), SGND (16), DGND (8) all on GND (chk:93).
- RST (15) = CODEC_RST_N (chk:94; analog:407).
- MODE (28) 220 kOhm 5 % to DGND, plus a not-fitted 0 Ohm MODE to DGND (chk:98 CODEC-06; v1 0603WAF2203T5E C22961).
- MS/ADR/IFMD (27) to VDD (chk:99 CODEC-07; analog:370).
- MC/SCL/FMT (1) 4.7 kOhm to VDD (chk:103 CODEC-08; v1 C23162).
- MD/SDA/DEMP (2) 4.7 kOhm to DGND plus a not-fitted 4.7 kOhm to VDD (chk:104 CODEC-09).
- Pins 1 and 2 each through a not-fitted 0 Ohm to EXP_I2C_SCL / EXP_I2C_SDA (chk:105 CODEC-10).
- SCKI1 (6), SCKI2 (9) from U_XO; BCK1 (5)/BCK2 (10) tied, LRCK1 (4)/LRCK2 (11) tied; ZEROL (14), ZEROR (13) open (chk:106 CODEC-11; arch:213).
- 33 Ohm series on BCK, LRCK and DOUT at the codec (analog:486; parts n/a).
- VINL (25), VINR (26) from B10; VOUT pins (17-20) to B11 with AIO-15's leg assignment (chk:110, :165).
- Contract pins touched: 12, 13 through DNF links only.

#### B8 `sai_iso` (about 11)
- U_ISO_M SN74LVC3G34DCTR, C139356, on 3V3_D, toward the module (parts:115; arch:255).
- U_ISO_C SN74LVC1G34DBVR, C840096, on 3V3_CODEC, toward the codec (parts:116; arch:256).
- 47 kOhm bias to GND on each buffer input, four (arch:255-256; oi:45).
- 470 Ohm 1 % between each U_ISO_M output and pins 32/34/35, three (arch:255; oi:45; dec R-10).
- Decoupling on U_ISO_M and U_ISO_C VCC: **[UNRULED]** (no document gives a value; the carrier ruled its USB switch's from SCDS220M, circuits/h7-platform/carrier-board.ts:157).
- Contract pins: 32 CODEC_DOUT, 33 CODEC_DIN, 34 CODEC_LRCK, 35 CODEC_BCK; failsafe roles `sai-isolation-to-module` + companion `sai-module-series` (32, 34, 35) and `sai-isolation-to-codec` (33) (contract; arch:170-173).

#### B9 `in_fe` (about 21)
Per channel x = L, R (chk:149-157; analog:123-172):
- R_RF 1.0 kOhm from FX_IN_x; C_RF 100 pF C0G 50 V to GND (chk:152; analog:167). Input test pad on the R_RF/C_RF node with a GND pad (chk:152) **[UNRULED]** as a model part (TEST-PAD-SPLIT, oi:124).
- R_PD 22 MOhm jack side of C_IN (chk:153); C_IN 47 nF C0G 50 V 1206 (chk:154).
- R_DIV1 1.50 MOhm 0.1 % with C_COMP 110 pF C0G 2 % across; R_DIV2 1.00 MOhm 0.1 % to this channel's VMID_x; C_T 160 pF C0G 2 % node T to GND (chk:155-156; analog:163, :172).
- U_IN OPA1688IDR unity follower on VIN_A, input at node T (chk:157); V+ 100 nF + 10 uF 50 V (chk:132).
- Ports: FX_IN_L/R, VMID_L/R, VIN_A, follower outputs, GND.

#### B10 `adc_drv` (about 21)
Per channel (chk:158-162; analog:159, :176):
- C_AC 22 uF 25 V aluminium (+ toward U_IN), EEE-FT1E220AR, C401767 (parts:108; chk:158).
- R_IN 10.0 kOhm 1 %; R_FA 10.0 kOhm 1 % with C_FA 47 pF C0G (chk:158-159).
- VBIAS_x: 2 x 2.00 kOhm 0.1 % 5V_A to GND, 10 uF X7R at the node, one per channel (chk:160; analog:159).
- R_O 100 Ohm to VINx; C_VIN 2.2 nF C0G at the codec pin (chk:162).
- U_ADC OPA1688IDR on 5V_A; V+ 100 nF + 10 uF 50 V (chk:159, :132).

#### B11 `out` (about 28)
Per channel (chk:163-167; analog:196-211):
- C_A+ and C_A- 10 uF 50 V X7R, one per DAC leg (chk:163).
- R_D1 = R_D2 20.0 kOhm 0.1 %; R_FO = R_GO 19.1 kOhm 0.1 % 25 ppm; C_FO = C_GO 47 pF C0G 2 %; R_GO to VMID_x (chk:164).
- Leg assignment: VOUTx+ -> C_A+ -> R_D1 -> inverting input; VOUTx- -> C_A- -> R_D2 -> non-inverting; left pin 20 inverting, 19 non-inverting; right 18 inverting, 17 non-inverting (chk:165; analog:198).
- R_S 100 Ohm; C_OUT 220 pF C0G (chk:166).
- C_DC 22 uF 25 V aluminium EEE-FT1E220AR (+ toward op-amp) to FX_OUT_x; R_B 100 kOhm FX_OUT_x to GND; output test pad on FX_OUT_x (chk:167; parts:108).
- U_OUT OPA1688IDR on VIN_A; V+ 100 nF + 10 uF 50 V (chk:164, :132).

#### B12 `jacks_byp` (about 18)
- Input jacks L, R and output jacks L, R: NMJ6HCD2, C368502 (parts:133). Inputs used as TS with R, RN, SN open; right input's tip-normal (TN) to the left tip net (chk:151 AIO-01; bypass:125). Outputs TS with TN, R, RN, SN open (chk:168).
- Four PESD12VL1BA,115, C38558: inputs on IN_TIP_x, outputs on OUT_JACK_x (chk:171; parts:107; analog:184).
- K_BYP_IN, K_BYP_OUT G6K-2F-Y DC3, C93168; pins 1 coil +, 8 coil -, 3/6 COM, 2/7 NC, 4/5 NO; pole A L, pole B R (bypass:97-101; parts:122).
- Q_BYP AO3400A, drain RELAY_DRV (both coils' pin 8), source GND (bypass:95, :112).
- R_RELAY_EN 3.9 kOhm 1 % RELAY_EN to gate; R_BPD 15.0 kOhm 1 % gate to GND (bypass:242-243).
- D_BF_IN, D_BF_OUT 1N4148W-7-F; D_BZ_IN, D_BZ_OUT BZT52C12-7-F; 1N4148W anode RELAY_DRV, cathode to Zener cathode, Zener anode on 3V3_P (bypass:102, :244-245; parts:124-125).
- Q_PFG AO3400A, drain on the relay gate, gate PF_TRIP (bypass:115, :246).
- Contract pin 8 RELAY_EN.

#### B13 `expr_ref` (about 25)
- J_EXP NMJ6HCD2 TRS, ring-normal; ring = reference, tip = wiper, sleeve GND (parts:133; chk:197 CTL-09).
- Two PESD12VL1BA on tip (jack side of R_TIP) and ring (jack side of R_REF) (chk:201 CTL-10).
- U_REFBLK LM66100DCKR, C2869734, VIN on VREF_A, ST and N/C to GND; Q_REFEN 2N7002,215; R_ENG 100 kOhm VREF_A to Q_REFEN gate; R_CE 100 kOhm on CE; D_RCLAMP PMEG4005AEA,115 cathode at the U_REFBLK-out/R_REF node, anode GND; R_REF 3.30 kOhm 1 % 1206 (1206W4F3301T5E, C26032) to ring (analog:307-314; parts:109-114).
- Ring 100 nF X7R to GND (analog:331).
- R_TIP 22.0 kOhm; 1 nF C0G and 10 MOhm to GND; R_EXPIN 2.2 MOhm (C22938); U_EXP MCP6001T-I/OT, C116490, on VREF_A, standard SOT-23-5 pinout 1 VOUT, 2 VSS, 3 VIN+, 4 VIN-, 5 VDD, 100 nF at VDD (chk:196; analog:311, :335; parts:106, :112).
- EXPR_TIP filter 1.00 kOhm and 100 nF X7R (analog:339).
- Plug detect: ring-normal -> 1 kOhm -> EXPR_DETECT, 100 kOhm to GND (analog:340).
- HW_REV divider VREF_A to GND, 100 nF at pin 29 (analog:347). Resistor values per revision table (analog:349-358); **[UNRULED]** which revision code the split pedal carries ("the sources read do not say which code each split board carries", analog:360).
- Contract pins: 21 VREF_A (load roles `expr-ring-reference`, `hw-rev-divider`, `u-exp-supply`, contract:279-283), 28 EXPR_TIP, 29 HW_REV, 30 EXPR_DETECT.

#### B14 `controls` (about 36)
Per position n = 1..6 (analog:364; mech:300; power:417):
- RV_POSn RV16AF-41 B10K, VREF_A to GND (parts:131; analog:364); button TC-6610-17-100G, C2845265 (parts:132).
- R_POSn 10.0 kOhm wiper to pin; C_POSn 100 nF X7R at the pin; R_BTNn 1.00 kOhm always fitted; R_PUn 10.0 kOhm to 3V3_D with a button (mech:300).
- Connection of the button fit: "R_PUn 10.0 kOhm to 3V3_D, R_BTNn 1.00 kOhm to GND, R_POSn 10.0 kOhm to the pin" (power:417) and "a press draws at most 3.513 V / 1.00 kOhm ... through the always-fitted 1.00 kOhm resistor" with a pot also fitted (arch:230). **[UNRULED as one drawn topology]**: no document draws the node where the wiper, R_PUn, the button and R_BTNn meet; it is assembled from power:417 and arch:230.
- The per-effect fit is a KiCad design variant (oi:115 CONTROL-POSITION-VARIANTS, phase 4).
- Contract pins 22-27 POS1..POS6; 21 VREF_A (`pot-top`); 38 3V3_D (`control-button-pullup`).

#### B15 `fsw_led` (about 18)
- Footswitch nodes x2: 10.0 kOhm pull-up to 3V3_D at the node, 100 nF node to GND, R_FSW1/R_FSW2 1.20 kOhm 1 % node to pin (0603WAF1201T5E, C22765) (power:415; parts:137; chk:183).
- Footswitch connection: FSWn and GND cross on a 2-pin header soldered through both boards; the audio board gets two through-holes (mech:397). **[UNRULED]** how the model represents the pedal side (a 2-pad connector or nothing).
- LED1, LED2 WP7113ID, C6926004, anode from 3V3_P through R_LED 100 Ohm (0603WAF1000T5E, C22775), cathode to the MOSFET drain (parts:135-136; chk:187).
- LED switch N-MOSFETs x2, gate series resistor (v1: 100 Ohm; arch:266 uses "CTL-05's 100 Ohm"), gate pull-down 10.0 kOhm (chk:187; dec R-13 at dec:876-883). **[UNRULED]** MPN: v1's BSS138-7-F is named only as "v1 contained" (chk:187), and the BSS138 was rejected for the relay because its RDS(on) at 3.3 V is typical only (bypass:248).
- Contract pins 4 LED2, 5 LED1, 6 FSW1, 9 FSW2; 38 3V3_D (`footswitch-pullup`).

#### B16 `usb` (about 13)
- Pedal USB-C receptacle: CC1 (A5), CC2 (B5) each 5.1 kOhm 1 % to GND; D+ (A6, B6) joined, D- (A7, B7) joined; SBU open; GND pins to GND (chk:207 USB-01). **[UNRULED]** MPN (spec:146 "the pedal USB-C receptacle"; chk:207 names only v1's HC-TYPE-C-16P-01A).
- VBUS goes only to U_ESD pin 5, its capacitor and the sense divider; on no rail (chk:208 USB-02).
- U_ESD USBLC6-2SC6, C7519: I/O1 pins 1/6 D+, I/O2 pins 3/4 D-, pin 2 GND, pin 5 VBUS with C_VBUS 100 nF X7R 50 V to GND (chk:213 USB-04; parts:146).
- R_SHLD 1 MOhm with C_SHLD 4.7 nF 2 kV X7R 1206, shell to GND (chk:214 USB-05).
- U_USBSW TS3USB221RSER, C130085, VCC 3V3_D; R_USBEN 10.0 kOhm 1 % to 3V3_D on USB_EN_N (dec R-14 at dec:885-892; parts:145). U_USBSW decoupling: **[UNRULED]** for the pedal (carrier precedent carrier-board.ts:157). S pin / port-2 wiring: ruled for the carrier only (CR-CARRIER-USBSW-SELECT, dec:1376).
- VBUS sense divider 12.0 kOhm over 20.0 kOhm 1 % to pin 31 (arch:257).
- C_VBUS_SENSE 100 nF X7R (C1591) from PA1 node to GND: an **option** (parts:177; oi:78). **[UNRULED]** fit on the pedal.
- Contract pins 11 USB_EN_N, 31 USB_VBUS_SENSE (role `vbus-sense-divider`), 36/37 USB_DM/DP (role `usb-isolation-switch`); 38 3V3_D (`usb-isolation-switch`).

#### B17 `midi_i2c` (about 11 + unruled)
- U_MIDIDRV SN74LVC1G07DBVR, C7829, on 3V3_D, input MIDI_UART_TX (parts:139; power:460).
- R_TXPU 18.0 kOhm 1 % MIDI_UART_TX to 3V3_D (parts:140; dec R-28 at dec:1018-1024).
- Q_MIDI AO3401A, C15127, source 3V3_P, drain to RA (4 x 130 Ohm 1 % 1206 parallel, C17914) to "MIDI pin 4"; pin 5 via RC 10 Ohm 1 % 1206 (C17903) to GND; R_MGP 160 Ohm 1 % 1206 gate to 3V3_P; gate pulled low by U_MIDIDRV (power:460; parts:141-144; dec:1000-1003).
- "The optional CA-033 ferrites go at the jack" (oi:62). **[UNRULED]** values and fit.
- MIDI connector carrying "MIDI pin 4 / pin 5": **[UNRULED]** (no part, no pinout; see conflict 6.4).
- MIDI UART header, not fitted, 1 x 4 2.54 mm: 1 = 3V3_D, 2 = MIDI_UART_TX, 3 = MIDI_UART_RX, 4 = GND (chk:217 USB-08; dec OWN-04 at dec:608-615 "The header stays unpopulated").
- MIDI IN receiver: **[UNRULED]**; only TI ISOM8710 is cited to show 2.0 mA can be met (parts:227; oi:73). Spec: until a stocked part is ruled, "that block is left undrawn and the page says so" (spec:347-348). Its network (input resistor, protection diode, pull-up) is not in the repository.
- U_MIDIDRV decoupling: **[UNRULED]**.
- I2C pull-ups R_SCL_PU / R_SDA_PU_EXP 2.40 kOhm 1 % (0603WAF2401T5E, C22940) to 3V3_D, pedal only (parts:138; power:413; oi:62).
- I2C expansion connector: **[UNRULED]** (no document names one; arch:342 lists only "I2C expansion bus pull-ups").
- Contract pins 12, 13, 14, 15; 38 3V3_D (roles `i2c-pullup`, `i2c-device`, `midi-header-supply`, `midi-out-driver`, contract:177-186).

#### B18 `interface` (2 + unruled)
- J_MOD_A, J_MOD_B 1 x 20 female, Mill-Max 801-43-020-10-012000, pedal underside (parts:158; arch:127). Reserved pins 16-19 unconnected (arch:288; interface-check.ts:13-15).
- Test pads: "The power and audio pads" (arch:344); per-board list **[UNRULED]** (oi:124 TEST-PAD-SPLIT; conflict oi:138-143 [*dated note, 2026-11-13: oi:140-145 after Task 3 added two rows; the pedal's list is now CR-PEDAL-TEST-PADS*]).
- Contract: all 40 pins (contract pins array from contract:416).

### 1.4 Unruled parts, values and connections (count: 17)

| # | Item | Block | What the documents give | What would rule it |
|---|---|---|---|---|
| 1 | DC jack part and use of its switch contact | B1 | study assumption PJ-057AH (parts:134) | a controller ruling (part, or generic barrel symbol and no MPN); DC-JACK-FIT closes only in phase 4 (oi:123) |
| 2 | FB_IN position | B1 | "an S2 choice" (power:28) | a controller ruling on the position (choice, not quantity) |
| 3 | C_SCH, C_PROTHF placement | B1 | "goes with FB_IN's" (parts:82) | follows #2 |
| 4 | Chassis-bond pad as a model part | B1 | pad geometry only (power:533) | a ruling whether a pad is modelled |
| 5 | U_ISO_M decoupling | B8 | none | value from SCES366L (not in repository) or a ruling |
| 6 | U_ISO_C decoupling | B8 | none | value from SCES519O (not in repository) or a ruling |
| 7 | Input/output test pads as parts | B9, B11 | AIO-02, AIO-17 name them (chk:152, :167) | TEST-PAD-SPLIT ruling (oi:124) |
| 8 | HW_REV revision code (R_top/R_bot) | B13 | table only; code not assigned (analog:360) | a controller ruling choosing a row (the module made the same choice for its ID strap, dec:1499-1508) |
| 9 | Control-position node topology as drawn | B14 | assembled from power:417 + arch:230 | a ruling stating the node, recorded beside the model |
| 10 | Footswitch pedal-side connection | B15 | two through-holes (mech:397) | a ruling on the model part (2-pad connector) |
| 11 | LED switch N-MOSFET MPN (x2) | B15 | v1 BSS138-7-F only (chk:187) | a ruling (a symbol needs a pinout; AO3400A is the split's N-MOSFET elsewhere, parts:61) |
| 12 | Pedal USB-C receptacle MPN | B16 | none for the pedal (spec:146) | not needed for a schematic (G245); stock generic symbol exists |
| 13 | U_USBSW decoupling; S pin and port 2 on the pedal | B16 | carrier-only rulings (carrier-board.ts:150-157; dec:1376) | a pedal ruling or reuse of the carrier's |
| 14 | C_VBUS_SENSE fit | B16 | option (parts:177) | a choice ruling (VBUS-HOTPLUG closes on a model or the fit, oi:78) |
| 15 | MIDI OUT connector (pins 4/5) and CA-033 ferrites | B17 | "MIDI pin 4", "pin 5" (power:460); ferrites "go at the jack" (oi:62) | a ruling on the connector and its pinout, reconciled with USB-08 (conflict 6.4) |
| 16 | MIDI IN receiver and its network | B17 | ISOM8710 cited only (parts:227) | MIDI-IN-RECEIVER-STOCK (stock check at LCSC, not in repository) |
| 17 | U_MIDIDRV decoupling; I2C expansion connector | B17 | none | rulings |

---

## 2. Pedal-tagged and pedal-relevant rows in open-items.md

"Kind": **Q** = states a quantity (closes only on analysis, spec:365-375); **C** = asks a choice (a ruling or committed page can close it); **M** = a modelling row (each part present in the model with its figures re-derived, so it is part choice and part re-derivation); **B** = bring-up or phase 4 evidence.

| Row id | file:line | Status (verbatim head) | What it asks | Kind | Block |
|---|---|---|---|---|---|
| FB-AN2606 | oi:20 | "open — not verified; the contract stays draft" | AN2606 Rev 70+ Table 135 read showing PB5 is not a bootloader pin, recorded beside the contract | C (document reading) | B16 (USB_EN_N), contract |
| OSCAR-AUDIO-LICENCE-L1 | oi:21 | "open — unresolved upstream" | the author's answer on MIT vs Apache-2.0 for the codec circuitry "(PCM3060 and its straps)"; phase 4 | C (external) | B7 |
| STACK-HEIGHT-CONFIRM | oi:35 | "open — paper analysis only; not frozen" | layout confirms 15.17 mm stack; phase 4 | B | B18, B12 (relay height) |
| CONTRACT-MODEL-CHECK | oi:36 | "open — the signal-net and reserved-pin half is checked by `checkInterface` ... stays open until the h7-module, h7-pedal and carrier models each pass it. The failsafe-protection half is NOT yet checked" | each board's J_MOD nets equal the contract; failsafe pins through a part with the declared role | C/M | B18, B8, B16 |
| CONTRACT-FREEZE | oi:39 | "open — draft" | `status` set to frozen in its own commit after every freeze blocker closes | C | contract |
| DATASHEET-REVISIONS-RECHECK | oi:40 | "open — not verified" | DS12110 Rev 11 vs 10, DS12556, AN2606, RM0433, USBLC6-2 checked for later revisions | C (document reading) | B16 (USB ESD part), contract |
| PCM3060-POR-XO-START | oi:41 | "open — the data sheet is silent; conservative bound adopted on paper" | BU-16 cold power-up | B | B6 |
| INTERFACE-PARTS-TO-MODEL | oi:45 | "open — not modelled" | SAI isolation (two buffers, 47 kOhm, 470 Ohm, 33 Ohm), gate pull-downs 15.0 k / 10.0 k, 3.9 k, USB switch + 10.0 k, 12.0 k / 20.0 k VBUS divider, each in the model "with its role", figures re-derived | M | B6/B7, B8, B12, B15, B16 |
| HOT-PLUG-PEAK (FB_IN mention) | oi:56 | "open — paper analysis only" | BU-25 hot plug; names the input ferrite "whose place on the split pedal is an S2 choice" | B (the position itself is C, no row of its own) | B1 |
| PEDAL-POWER-PARTS-TO-MODEL | oi:62 | "open — not modelled" | every power-entry, power-fail, Q_MSW, U_PRAIL, EN, MIDI OUT, LED, coil, footswitch, I2C and VMID part with value, rating and supplier code; each rating re-derived against R-PF-9 | M (re-derivation is Q) | B1-B5, B12, B15, B17 |
| MIDI-IN-RECEIVER-STOCK | oi:73 | "open — not checked" | a receiver meeting 2.0 mA confirmed stocked at LCSC, code recorded, before the freeze | C (needs external stock data) | B17 |
| VBUS-HOTPLUG | oi:78 | "open — not verified; the source model is not available" | a host-and-cable model showing PA1 <= 3.6 V, or a sense-node capacitor fitted in the pedal and carrier models | Q or C (either route) | B16 |
| PEDAL-ANALOG-PARTS-TO-MODEL | oi:83 | "open — not modelled" | input/output stages, jacks, blocking network, codec domain, 33 Ohm, with values, ratings, roles, codes; figures re-derived | M (re-derivation is Q) | B5-B7, B9-B13 |
| PEDAL-ANALOG-LAYOUT-RULES | oi:84 | (layout) | layout carries | B | B13, B6, B12 |
| ANALOG-HEADROOM-9V | oi:28 | (bring-up) | THD+N at 9 V | B | B11 |
| HW-REV-ADC-ACCURACY (the HW_REV row) | oi:91 | "open — assumption" | bring-up reading inside its band | B | B13 |
| CODEC-DOMAIN-BRINGUP | oi:92 | "open — not stated; allowances" | bring-up | B | B6 |
| BYPASS-PARTS-TO-MODEL | oi:93 | "open — not modelled; footprint not checked against the data sheet" | relays, pin map, nets, Q_BYP, suppressors in the model; footprint pads vs K106-E1-11 p. 6 | M + C (footprint check needs the data sheet, not in repository) | B12 |
| BYPASS-PATH-UNPOWERED | oi:94 | "open — not measured" | BU-29 | B | B12 |
| RELAY-OVERRIDE-ON-TRIP | oi:95 | "open — paper analysis only" | bring-up scope | B | B2, B12, B6 |
| STACK-HEIGHT-OWNER-REPORT | oi:107 | "open — reported to the controller, not shown reported to the owner" | the 15.17 mm stack and 4.97 mm connector-face limit put to the owner, answer recorded, before the freeze | C (owner) | contract, B18 |
| DC-JACK-FIT (the DC jack) | oi:123 | "open — part not chosen; not checked" | the jack chosen, footprint and hole placed, a plug fitted by hand; phase 4 | C + B | B1 |
| TEST-PAD-SPLIT | oi:124 | "open — not settled by any source" | each board's test-pad list in its model, each v1 pad placed on a named net or dropped with a reason | C | B18 (and B9/B11 pads) |
| Conflict: the v1 test pads on the split boards | oi:138-143 [*dated note, 2026-11-13: oi:140-145 after Task 3 added two rows*] | (conflict entry) | "Assigning them is a design choice, not a reading of the sources" (oi:142, now oi:144); "Settled by phase 2's per-board pad lists" (oi:143, now oi:145) | C | B18 |
| USB2-SPEC-UNREAD | oi:125 | "open — not verified" | USB 2.0 VBUS capacitance limit vs pedal VBUS capacitance | Q (needs USB 2.0 spec, not in repository) | B16 |
| MLCC-DC-BIAS | oi:52 | "open — not verified; allowances" | DC-bias curves of fitted parts, incl. pedal VIN_A ceramics and U_PRAIL input | Q | B1, B4 |
| POWER-PARTS-STOCK | oi:72 | "open — dated observations" | phase 4 | B | several |
| CONTROL-POSITION-VARIANTS | oi:115 | "open — not confirmed" | phase 4 | B | B14 |

Rows asked for that have **no row of their own**:
- **HW_REV code per board**: no open-items row; the gap is stated in analog:360 and spec:146 only. The HW_REV row that exists is HW-REV-ADC-ACCURACY (oi:91), a bring-up row.
- **FB_IN**: no row; mentioned inside HOT-PLUG-PEAK (oi:56) and PEDAL-POWER-PARTS-TO-MODEL does not list it (oi:62). The open choice is power:28 and parts:58, :82; spec:146 lists it as left open.
- **PCM3060 straps**: no row; the values are in chk:98-105 (CODEC-06 to CODEC-10); spec:146 nonetheless lists "PCM3060 strap and decoupling values" as left open (conflict 6.6). OSCAR-AUDIO-LICENCE-L1 (oi:21) names the straps only as the licensed circuitry.

---

## 3. The contract-freeze rows in detail

Order, per the spec: "FB-AN2606, DATASHEET-REVISIONS-RECHECK, MIDI-IN-RECEIVER-STOCK, STACK-HEIGHT-OWNER-REPORT, then CONTRACT-FREEZE" (spec:176-178). The freeze runs alongside drawing; pages are drawn against the draft (spec:171-176; dec:145 O-10 amendment citing known-gaps G311). STACK-HEIGHT-OWNER-REPORT "goes to the owner in a message of its own, never with a drawing" (spec:179-181).

| Order | Row | Asks | Settling evidence (oi column 5) | Needs a document not in the repository? | Needs the owner? |
|---|---|---|---|---|---|
| 1 | FB-AN2606 (oi:20) | Confirm PB5 (pin 11, USB_EN_N) is not configured by the ST system bootloader; R-14 rests on it; DS120 Table 2 already confirms the Seed half | "AN2606 (Rev 70 or later) read for STM32H74xxx/75xxx, Table 135, with revision, table and page cited, showing PB5 is not a bootloader pin; recorded beside the contract" | **Yes**: ST AN2606. No PDF or transcript in the tracked tree (only `circuits/h7-platform/vendor/st-pin-data/` is vendored). st.com refused on 2026-10-06 (oi:20) | No |
| 2 | DATASHEET-REVISIONS-RECHECK (oi:40) | Check DS12556 (Rev 7 held), AN2606 (Rev 70), RM0433 (Rev 8), USBLC6-2 (Rev 5, LCSC copy) for later revisions; compare DS12110 Rev 11 with Rev 10 | "Each document checked on st.com, and DS12110 Rev 11 compared with Rev 10 on the figures cited; any later revision read, and the facts the contract cites from it (pin types, injection limits, Table 135, GPIO currents, the USBLC6-2 leakage) confirmed, or the dependent analyses re-run" | **Yes**: all five ST documents; none tracked | No |
| 3 | MIDI-IN-RECEIVER-STOCK (oi:73) | A MIDI IN receiver meeting the 2.0 mA `midi-header-supply` allocation, stocked | "A receiver meeting 2.0 mA confirmed stocked at LCSC, its code recorded, before the contract freeze" | **Yes**: LCSC stock data (external); the ISOM8710 data sheet is not tracked | No (a controller choice) |
| 4 | STACK-HEIGHT-OWNER-REPORT (oi:107) | Report 15.17 mm stack and 4.97 mm connector-face limit (contract `moduleEnvelope.stackHeightMm`, `maxHeightBottomMm`) to the owner | "put to the owner, and his answer recorded (in decisions.md if he decides anything), before the contract's `status` is set to frozen" | No (the figures are in mech EC-STACK-HEIGHT / FIG-STACK-HEIGHT, oi:107) | **Yes** (a report; his answer is recorded) |
| 5 | CONTRACT-FREEZE (oi:39) | Set `status` to frozen (contract:3 reads `"draft"`) | "The contract's `status` set to frozen in a commit of its own, after every freeze-blocker row is closed and every plan-time value is present" | No | No, but it waits on 1-4 and on "the freeze checks the other topic documents carry" (oi:39), which the row does not enumerate |

Notes:
- CONTRACT-FREEZE also names RR-8: "Audio-board layout may not start before it" (oi:39); layout is phase 4, so it does not block pedal pages.
- `contract.ts` reads `status` as "draft" | "frozen" (circuits/h7-platform/contract.ts:26, :68-70) and nothing else checks it.
- The contract JSON is "a byte-identical imported record and is never edited here" (contract.ts:4). A freeze edits it; the plan has to reconcile that statement.
- The contract still holds superseded statements: S-1's consequence reads "Seed benches run on 9–12 V supplies only (O-15)" in `seedExceptions` (contract top-level, printed from the JSON), which arch:122 marks not in force (narrowed by R-50).

---

## 4. Model infrastructure gaps

### 4.1 Multi-unit lowering (spec C6), checked against the code at HEAD

Spec C6 (spec:282-299) cites four places. On disk:

- `tools/draught/intent-from-network.ts`: the spec cites :100-102; **the flattening is at :109-111**: `for (const pins of [component.pins, ...component.units.map((unit) => unit.pins)])` then ``const member = `${ref}.${pinNumberFor(component, pin, pinNumbers)}` `` with no unit argument. Lines 100-102 are the duplicate-designator error text. The citation has drifted by 9 lines; the defect it names is present.
- `lib/kicad/from-network.ts:69-72`: `pinNumberFor(component, pin, pinNumbers)` reads `pinNumbers[component.kind]?.[pin]` (line 70), unit-blind. Confirmed. The same flattening is also in `everyPin` (:85-89), `pinNumbersFromTable` (:98-107, builds a `Map` canonical pin -> number, so two units' `in+` collapse to one key) and `toImportedNetlist` (:205-211). The spec does not cite these three.
- `lib/kicad/sheet-agreement.ts:267`: inside `resolvePins` (:263-306). The map handed in is canonical pin -> number per component (`numbers.get(canonical)`, :270); units are walked at :297-301 with the same map. When two units' pins map to one number it **throws** ("claimed by both", :281-288) rather than merging silently; a correct dual cannot be expressed because the map has one key per canonical name.
- `lib/kicad/symbol-library.ts`: `supportedUnitSymbols` (:242-272) refuses any unit sub-symbol numbered above 1 (:257-267, "a multi-unit symbol. This function does not support multi-unit symbols"). Callers: `symbolPins` (:275) and `symbolStrokeSegments`; the h7 symbol checks compare `DATASHEET_PIN_NAMES` against `symbolPins` (circuits/h7-platform/parts.ts:91-109; module-parts.ts:181).
- `PartSpec.symbolPins` ("Canonical pin -> KiCad symbol pin number, keyed by unit name", lib/model/types.ts:69-70) exists, and **no lowering path reads it**: the only readers are a test refusal (tests/circuits/sheet-pin-numbers.ts:149-151, "declares part.symbolPins, and this builder does not read it") and a test expectation (tests/circuits/opamp-buffer.test.ts:98). One circuit sets it, single-section (circuits/opamp-buffer.ts:144).
- The `opamp` kind already models units: unit pins `in+`, `in-`, `out`; package pins `v+`, `v-` (lib/model/kinds.ts:38, :46).

**OPA1688 in the installed library** (`/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`, checked on disk): **no symbol named OPA1688**. `Amplifier_Operational.kicad_sym` has OPA1602, OPA1604, OPA1612AxD, OPA1641, OPA1655D(BV), OPA1656ID, OPA1662D, OPA1678, OPA1679, OPA1692xD/xDGK, OPA2197xD, among others; none is the OPA1688. Candidate stand-ins with the standard dual SOIC-8 pinout:
- `Amplifier_Operational:OPA2197xD` (line 43697), `extends NCS2325D`, footprint `Package_SO:SOIC-8_3.9x4.9mm_P1.27mm`. The parent `NCS2325D` (line 36489) has **three units**: unit 1 pins 1 (out), 2 (-), 3 (+); unit 2 pins 5 (+), 6 (-), 7 (out); unit 3 pins 4 (V-), 8 (V+). Same structure: `OPA1692xD` (line 42307), `OPA2156xD`, `OPA2196xD`.
- `Amplifier_Operational:OPA1678` / `OPA1612AxD` extend `LM2904` (line 16121), the same three-unit pinout, no footprint set.
- Every one of these is a multi-unit symbol, so it hits the symbol-library refusal (symbol-library.ts:257-267) as well as the lowering gap.
- The OPA1688 data sheet (SBOS724A) is **not in the repository**; the only pin facts in the repository are "V+ pin (8)" and "V- (4)" (chk:132 PWR-11), and the dual-per-function, A = L / B = R allocation (chk:149). A pin-for-pin check of a stand-in against SBOS724A (spec C4 rule, spec:275-279) needs the data sheet.

Other pedal parts whose stock symbols are multi-unit (so C6 is not only the op-amps):
- `74xGxx:74LVC3G34` (line 25421): **four units** (1: pins 1/7, 2: pins 2/6, 3: pins 3/5, 4: GND 4 / VCC 8) for U_ISO_M.
- `74xGxx:74LVC2G14` (line 19060): three units. But `74xGxx:SN74LVC2G14DBV` (line 27242, extends `Inverter_Schmitt_Dual`, line 25784) is **single-unit**: 1 1A, 2 GND, 3 2A, 4 2Y, 5 VCC, 6 1Y, footprint SOT-23-6. U_PFINV can avoid C6.

### 4.2 Kinds the pedal needs that `lib/model/kinds.ts` lacks

`lib/model/kinds.ts:29-41`: resistor, capacitor, inductor, photoresistor, diode (`anode`, `cathode`), bjt, potentiometer (`ccw`, `wiper`, `cw`), switch (open), opamp, ic (open), connector (open). Open vocabularies: ic, connector, switch (:62). The spec leaves the choice to the builder: "There is no regulator, relay, crystal, LED, FET, fuse or ferrite kind ... Adding a kind is allowed if a part needs one, with a test beside it" (spec:408-411).

| Need on the pedal | Kind available? | How module/carrier handled the same need |
|---|---|---|
| Regulators (U_LDO, U_PRAIL, U_CVDD), supervisors (U_PF, U_CRST), logic (U_PFINV, U_ISO_*, U_MIDIDRV), USB switch, ESD, ideal diode U_REFBLK, oscillator U_XO, codec | `ic` | buck as `ic` (module/power.ts:65-67); supervisor `ic` (module/reset-boot.ts:28); USB switch and ESD `ic` (carrier-board.ts:152, :160) |
| MOSFETs (AO3400A x6+, AO3401A, AOD4185, 2N7002 x2) | none; `ic` by precedent | no FET on module or carrier |
| Relays G6K-2F-Y (coil + 2 poles) | none; `switch` has positions/contacts (module/build.ts:64-70 `pushButton`) or `ic` | none on module or carrier |
| Diodes, Schottkys, Zeners, TVS (PESD12VL1BA bidirectional) | `diode` (anode/cathode); a bidirectional TVS has no anode/cathode | no discrete diode on module or carrier |
| LEDs | `diode` could carry them (Device:LED pins 1 K, 2 A) | none |
| Ferrite FB_IN | `inductor` + `part.beadImpedance` (types.ts:93-99) | FB_VDDA as `inductor` (module/vdda.ts:36) |
| Fuse | n/a on pedal | `ic` with `part.value` (parts.ts:81-86) |
| Switching audio jacks (normals) | `connector` is wrong for a switching part: "A part that switches is not an inert connector and belongs in `kind: "switch"`" (types.ts:72-90) | none |
| Pots | `potentiometer` | none on h7; elsewhere (circuits/transistor-preamp/parts.ts:56) |
| Buttons, footswitch | `switch` | `pushButton` (module/build.ts:64-70) |
| Multi-unit op-amps | `opamp` with units | none on h7 (C6) |

PIN_NUMBERS consequences: a `diode` needs `{ cathode: "1", anode: "2" }` for `Device:D`, `Device:D_Zener`, `Device:LED`, `Diode:1N4148W` and the PMEG symbols (all pin 1 K, pin 2 A, checked on disk); a `potentiometer` needs `{ ccw, wiper, cw }` -> `Device:R_Potentiometer` pins 1/2/3 (which end is ccw is not in the repository); jack symbols use letter pins T, TN, R, RN, S, SN (`Connector_Audio:AudioJack3_Switch`, line 4113), like the USB-C letters the existing tables already pass through (carrier-board.ts:46-49).

### 4.3 Stock-symbol availability (checked on disk, KiCad 10.0.5 install)

Library path `/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`; line = line in that library file. "Spec C4 said" refers to spec:263-279.

| Part | Exact symbol | Notes |
|---|---|---|
| PCM3060PWR | `Audio:PCM3060` (line 30770), single unit, TSSOP-28 footprint; pins 1 MC/SCL/FMT ... 27 ~{MS}/AD/IFMD, 28 MODE | matches chk pin numbers (chk:98-110) |
| OPA1688IDR | **none**; stand-ins `Amplifier_Operational:OPA2197xD` / `OPA1692xD` (NCS2325D parent), `OPA1678` (LM2904 parent), all 3-unit | section 4.1 |
| SN74LVC3G34DCTR (U_ISO_M) | `74xGxx:74LVC3G34` (line 25421), 4 units, no footprint | spec C4 said none (prefix search on "SN74LVC3G34"); multi-unit |
| SN74LVC1G34DBVR (U_ISO_C) | `74xGxx:74LVC1G34` (line 13571), single unit: 1 NC, 2 in, 3 GND, 4 out, 5 VCC | spec C4 said none |
| SN74LVC1G07DBVR (U_MIDIDRV) | `74xGxx:74LVC1G07` (line 8396), single unit, same 5-pin layout | spec C4 said none |
| SN74LVC2G14DBVR (U_PFINV) | `74xGxx:SN74LVC2G14DBV` (line 27242), single unit | as spec |
| TPS3808G01DBVR (U_PF) | `Power_Supervisor:TPS3808DBV` (line 12393): 1 ~{RESET}, 2 GND, 3 ~{MR}, 4 CT, 5 SENSE, 6 VDD | as spec |
| TLV803EA29DBZR (U_CRST) | none stock; project symbol `h7-platform:TLV803EA30DBZR` (circuits/h7-platform/h7-platform.kicad_sym:1353): 1 GND, 2 ~{RESET}, 3 VDD | CR-MODULE-SUPERVISOR-SYMBOL cites SLVSES2J's worked example TLV803EA29DBZR, "Pin 1 = GND" (dec:1473-1480) |
| G6K-2F-Y DC3 | `Relay:G6K-2` (line 31222), single unit, pins 1-8, pin names empty | pin map from bypass:97 |
| AO3400A | `Transistor_FET:AO3400A` (line 1590), extends Q_NMOS_GSD: 1 G, 2 S, 3 D | as spec |
| AO3401A | `Transistor_FET:AO3401A` (line 1674), extends TP0610T: 1 G, 2 S, 3 D | as spec |
| 2N7002,215 | `Transistor_FET:2N7002` (line 813), extends Q_NMOS_GSD | as spec |
| AOD4185 (TO-252) | **none**; generic `Transistor_FET:Q_PMOS_GDS` (line 71052): 1 G, 2 D, 3 S | AOD4185 pinout not in repository |
| TPS7A4901DGNR (U_LDO) | **none**; `Regulator_Linear:TPS7A4101DGN` (line 169082) exists with 3, 6, 7 NC, 8 IN, 1 OUT, 2 FB, 4 GND, 5 EN, 9 GND | **not a pin match**: PWR-08 puts NR/SS on pin 6 (chk:129) |
| TPS7A2433DBVR (U_CVDD) | **none** (TPS7A20xxxDBV, line 168258, is another family) | pinout of TPS7A24 not in repository |
| TPS62933FDRLR (U_PRAIL) | `Regulator_Switching:TPS62933F` (line 149786), extends TPS62933: 1 RT, 2 EN, 3 VIN, 4 GND, 5 SW, 6 BST, 7 SS, 8 FB | module uses it (module-parts.ts:64) |
| TS3USB221RSER | none stock; project symbol `h7-platform:TS3USB221RSER` (h7-platform.kicad_sym:5) | CR-CARRIER-USBSW-SYMBOL (dec:1384); spec C4 said none |
| USBLC6-2SC6 | `Power_Protection:USBLC6-2SC6` (line 36479), extends USBLC6-2P6 | carrier trap: embedded copy carries parent's footprint (parts.ts:58-61) |
| USB-C receptacle | `Connector:USB_C_Receptacle_USB2.0_16P` (line 359291) | carrier and module use it |
| LM66100DCKR | `Power_Management:LM66100DCK` (line 25153): 1 VIN, 2 GND, 3 ~{CE}, 4 NC, 5 ST, 6 VOUT | as spec |
| MCP6001T-I/OT | `Amplifier_Operational:MCP6001-OT` (line 30611), extends MCP6L91T-EOT: 1 out, 2 V-, 3 +, 4 -, 5 V+ | matches chk:196's standard pinout |
| X1G0041710019 (SG-210STF) | `Oscillator:SG-210STF` (line 8530): 1 ~{ST}, 2 GND, 3 OUT, 4 Vcc | spec C4 said none (prefix search on MPN) |
| PMEG4030ER | `Diode:PMEG4030ER` (line 43025) | as spec |
| PMEG4005AEA | **none** (PMEG4005CEJ, PMEG4005EH, PMEG4005EJ exist) | as spec |
| BAS116H | **none** (BAS16W, BAS16TW exist) | |
| 1N4148W | `Diode:1N4148W` (line 1235) | as spec |
| BZT52C12 | **none** exact; `Diode:BZT52Bxx` (line 17465) | as spec |
| PESD12VL1BA | **none** (PESD3V3/5V0 variants only) | as spec |
| ISOM8710 (MIDI IN candidate) | **none**; `Isolator:6N138` (line 2001), `H11L1` (line 39969), HCPL-06xx exist | only ISOM8710 is named in the repository (parts:227) |
| NMJ6HCD2 jacks | `Connector_Audio:NMJ6HCD2` (line 20009), extends AudioJack3_Switch: T, TN, R, RN, S, SN; footprint `Connector_Audio:Jack_6.35mm_Neutrik_NMJ6HCD2_Horizontal` | |
| DC jack | generic `Connector:Barrel_Jack` / `Barrel_Jack_Switch` (lines 8932, 9363) | part unruled |
| Module sockets | `Connector_Generic:Conn_01x20` (as module/carrier, parts.ts:26-30); `Connector:Conn_01x20_Socket` also exists (line 52431) | |
| LEDs, pots, buttons, R, C, polarised C, ferrite | `Device:LED`, `Device:R_Potentiometer`, `Switch:SW_Push`, `Device:R`, `Device:C`, `Device:C_Polarized`, `Device:FerriteBead` | |
| MIDI DIN | `Connector:DIN-5` (line 220575) exists | MIDI connector unruled |

---

## 5. Carried precedent (module and carrier)

- **Interface sockets.** Carrier: `j_mod_a`, `j_mod_b` built by `make(..., "connector", rowPins(nets, 0|20), MODULE_SOCKET, ...)` (carrier-board.ts:114-121); pad n -> contract pin n + offset (:99-108); reserved pins get net `RESERVED_<pin>` (:88-97). Module: `interfaceBlock()` reads `loadContract()` and `socketPadFor` (module/interface.ts:22-40), reserved pins `NC` (:30-31), any other signal-less pin refused (:32-33); block ports are the contract nets (:39). `socketPadFor` is contract.ts:89-94.
- **Pedal rule in the checker**: reserved pins are nc on module and pedal (interface-check.ts:13-15); `BoardKind` already includes "pedal" (:26); tests call `checkInterface(network, kind, { J_MOD_A: id, J_MOD_B: id })` (tests/circuits/h7-carrier.test.ts:54; tests/circuits/h7-module.test.ts:53). The failsafe half is unchecked (interface-check.ts:17-19).
- **Socket part.** `MODULE_SOCKET` = mpn 801-43-020-10-012000, symbol `Connector_Generic:Conn_01x20`, `electricallyInert: true` (parts.ts:26-30), the part parts:158 puts on the pedal underside.
- **pinField.** Not used by the module or the carrier. It describes "ONE ROW of a pin field a single part occupies, when the model splits that part into one component per row" (lib/model/types.ts:101-112); J_MOD_A and J_MOD_B are two parts, "each its own BOM line" (arch:127). Its only users are the Pultec board (circuits/pultec/physical/parts.ts:410, :446) and the perfboard wiring guide (lib/board/part-text.ts:230-308).
- **DESIGNATORS.** Carrier: flat id -> ref, sockets J1/J2 (carrier-board.ts:53-62). Module: keyed by prefixed id (`interface_j_mod_a: "J1"`), "one numbering across every page", with J1/J2 "the numbers the carrier's sockets carry" (module-board.ts:71-114).
- **PIN_NUMBERS.** Per kind, not per part: carrier resistor, capacitor, connector letters (carrier-board.ts:37-50); module adds inductor (module/build.ts:16-31). Every `ic`/connector/switch pin is named by its symbol pin number.
- **Blocks and pages.** `BLOCKS` = [prefix, builder, caption] (module-board.ts:43-57); `PAGE_GROUPS` from captions (:59); `h7Module()` includes each block with identity port binding (:61-69); block ports named by the nets they carry (module/build.ts:72-78; rationale :5-8); `drawingPages()` = `drawingPagesFromNetwork(h7Module(), DESIGNATORS, PIN_NUMBERS, PAGE_GROUPS)` (module-board.ts:116-119; tools/draught/drawing-pages.ts:150). Private nets drawn without prefix, all nets `signal` (drawing-pages.ts:7-25).
- **Project symbols and pin-name checks.** `PROJECT_SYMBOL_LIBRARY` (parts.ts:18-19), re-exported for `make draw` (module-board.ts:37-38; carrier-board.ts:29-31). `DATASHEET_PIN_NAMES` records each `ic` symbol's pins from a cited data sheet page (parts.ts:91-109; module-parts.ts:181).
- **Round trip.** The module joins `tests/circuits/drafted-kicad-round-trip.test.ts` (:47, :105, :122-123); the carrier with a committed netlist fixture (:61). Drafted pages: `drafted/h7-platform/h7-carrier`, `drafted/h7-platform/h7-module`.
- **Provenance strings** cite `file:line` per component (e.g. carrier-board.ts:110-112, :147-184).

---

## 6. Conflicts (two sources disagree)

6.1 **Spec C4's "no symbol" list against the disk.** spec:270-273 lists no symbol for SN74LVC1G34, SN74LVC3G34, SN74LVC1G07, TLV803, TS3USB221 and the X1G004 oscillator. On disk: `74xGxx:74LVC1G34`, `74xGxx:74LVC3G34`, `74xGxx:74LVC1G07`, `Oscillator:SG-210STF` exist, and project symbols `h7-platform:TLV803EA30DBZR` and `h7-platform:TS3USB221RSER` exist (h7-platform.kicad_sym:1353, :5). The spec itself warns its search "matched symbol names by prefix only" (spec:273-275).

6.2 **Spec C6's line citations against the code.** spec:285 cites intent-from-network.ts:100-102; the flattening is at :109-111. sheet-agreement.ts:267 is inside `resolvePins` (:263) but the unit walk is :297-301, and that path throws rather than silently merging (:281-288). from-network.ts:69-72 is accurate.

6.3 **Which model owes the VBUS-HOTPLUG fix.** analog:494: "the **module design** shows PA1 <= 3.6 V from a host and cable model, or fits C_VBUS". oi:78: "a capacitor from USB_VBUS_SENSE to GND fitted in the phase-2 **pedal model and the carrier model**". The divider and the sense node are on the pedal (arch:257; chk:209).

6.4 **MIDI header against the MIDI OUT circuit.** chk:217 USB-08: a not-fitted 1 x 4 header, 1 = 3V3_D, 2 = MIDI_UART_TX, 3 = MIDI_UART_RX, 4 = GND; dec:608-615 OWN-04: "The header stays unpopulated". power:460 and dec:998-1003 (R-26) put Q_MIDI on 3V3_P on the pedal driving RA to "MIDI pin 4" and RC from "pin 5", and oi:62 puts CA-033 ferrites "at the jack". The 4-pin header carries neither 3V3_P nor the loop's pin 4/5 nets, and no document names the MIDI jack or connector the loop reaches. arch:341 says only "MIDI header (not fitted) | To pins 14/15; MIDI IN receiver and MIDI OUT driver supply on 3V3_D; the MIDI OUT loop on the pedal digital rail".

6.5 **C_VBUS names two capacitors.** parts:177 and oi:78 use C_VBUS for the sense-node option (PA1 to GND); chk:213 USB-04 uses C_VBUS for the VBUS-to-GND capacitor at the USBLC6-2 pin 5. oi:78 records the clash and says a model gives them distinct ids (the carrier uses `c_vbus` and `c_vbus_sense`, carrier-board.ts:163, :183).

6.6 **PCM3060 straps and decoupling: open or given?** spec:146 lists "PCM3060 strap and decoupling values" among what the documents leave open. chk:88 (VCC/VDD 100 nF + 10 uF), chk:92 (VCOM 100 nF + 10 uF), chk:98 (MODE 220 kOhm + DNF 0 Ohm), chk:103 (FMT 4.7 kOhm to VDD), chk:104 (DEMP 4.7 kOhm to DGND + DNF 4.7 kOhm), chk:105 (DNF I2C links) give them. What chk does not give is the 10 uF MPNs: chk:88 says "The 10 uF part is in parts.md", and parts.md has no codec 10 uF row (parts:94-116).

6.7 **TPS7A49 stand-in symbol.** `Regulator_Linear:TPS7A4101DGN` (library line 169082) marks pins 3, 6, 7 NC; chk:129 PWR-08 puts NR/SS on pin 6 and DNC on pin 7 for the TPS7A4901DGNR (from SBVS121E). Not a pin-for-pin stand-in under spec C4.

6.8 **LCSC C25803 with and without an MPN.** parts:74 gives C25803 as Uniroyal 0603WAF1003T5E (100 kOhm); parts:111 gives R_ENG and R_CE as C25803 with "not named for this role (LCSC code only)".

6.9 **Input coupling capacitor name.** analog:124, :176 call the 22 uF input coupling capacitor "C2" (ANALOG.md's local name, analog:132); chk:149, :158 call it C_AC; analog:197 and chk:163 call the output's 10 uF coupling capacitors C_A / C_A+ / C_A-. Not a disagreement in substance, but C_AC (input, 22 uF aluminium) and C_A (output, 10 uF X7R) are one letter apart.

6.10 **Test pads (recorded conflict).** oi:138-143 [*dated note, 2026-11-13: oi:140-145 after Task 3 added two rows*]: chk PWR-16/USB-07 and LAYOUT-CARRYFORWARD (one pogo grid on v1) against split spec §9.3/§6.1/§7.1 (the pedal "keeps the power and audio pads"); "Assigning them is a design choice" (oi:142).

6.11 **HW_REV code.** Not a disagreement, recorded for the plan: analog:360 says no source assigns a code to the split pedal; chk:73 CORE-24 records v1's revision-1 parts (20.0 kOhm, 2.49 kOhm); the module ruled revision 1 for its own ID strap as "a choice, and any other row is as faithful" (dec:1504).

6.12 **Contract `seedExceptions` S-1 consequence** still reads "Seed benches run on 9–12 V supplies only (O-15)" (printed from contract `seedExceptions[0]`), which arch:122 marks not in force (R-50 narrowed it to 9 V).
