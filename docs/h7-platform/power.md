# h7-platform power

Ported from:
- [h7-platform/POWER.md][pw]: designator map (not carried, see below), owner decision on MCU junction temperature, §1 to §9
- [h7-platform/interface-analysis/vin-mod.md][vm]: §0 to §10 (VIN_MOD, pin 39)
- [h7-platform/interface-analysis/3v3-d.md][d3]: §0 to §6 (3V3_D, pin 38)
- [h7-platform/interface-analysis/pedal-digital-rail.md][pdr]: §0 to §8 (3V3_P)
- [h7-platform/interface-analysis/power-fail.md][pf]: §0 to §11 (the power-fail replacement)
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §5.6.1, §5.6.2, §6.3, §7.3, §7.4, §7.5, §9 (the amendments to `POWER.md`)
- [2026-10-05-h7-split-rulings.md][ledger] (the S1 rulings ledger): R-50, R-58, R-59, and the entries linked below through [decisions.md](decisions.md)
- [h7-platform/circuit/analysis/vinModSummary.ts][vms]: read only for the method behind the copper-pour ceiling ([FIG-POUR](#fig-pour)); no code crosses

This document describes how the STM32H743 digital pedal platform (h7-platform) is powered after the split into a processor module (h7-module) and an audio pedal board (h7-pedal): the pedal's power entry and its power-fail replacement, the module supply VIN_MOD on interface pin 39, the module's 3.3 V rail and the 3V3_D logic supply it lends the pedal on pin 38, the pedal digital rail 3V3_P, the analog supply 5V_A, 18 V survival and hot plug, sequencing, and grounding. It records the design as it stood in the pedals repository at commit `5b926d0`. Nothing here has been built, modelled or drawn in this repository.

**Every figure in this document is paper analysis of a board that has not been built.** Each figure states its inputs and its method beside it, and links the pedals analysis it came from. Temperature-dependent part figures are claimed from −20 °C to 85 °C ([R-20](decisions.md#r-20)) unless a row says otherwise.

Decisions are linked by anchor into [decisions.md](decisions.md). An owner decision is labelled "owner"; everything else there is a controller ruling, which the owner may override. Open items are rows in [open-items.md](open-items.md), named here by their Id. The interface rules for pins 38, 39 and 21 are in [architecture.md](architecture.md) §4.7; VREF_A (pin 21), the codec domain and the analog stages are in [analog.md](analog.md); the relay timing that the power-fail path serves is in [bypass-relay.md](bypass-relay.md).

## How the pre-split power note is carried

`POWER.md` was written for the one-board design (v1) before the split. Its text uses pre-split names (VIN_PROT, D1, BUCK_EN, one 3V3_D feeding everything) and it opens with a map from its own part names to the v1 schematic's reference designators. **That designator map is not carried**: the v1 schematic is not an authority here, and the parts below are named by their design labels (U_BUCK, D_AIN and so on). The split spec §9 amends `POWER.md` ("`ANALOG.md`, `POWER.md` ... updated. Amendments in §9", §8), and the S1 analyses re-derived each figure the split changed. This document applies those amendments. Where a figure below is v1's and has no split re-derivation, it says "v1 figure" and names the board it now applies to.

| Pre-split name (`POWER.md`) | After the split | Where |
|---|---|---|
| VIN (the jack) | VIN, the jack node; the power-fail supervisor senses it ([R-36](decisions.md#r-36)) | pedal |
| D1 (D_REV), one series Schottky | D_AIN to the analog branch and D_MIN to the module branch, one PMEG4030ER each ([R-35](decisions.md#r-35)) | pedal |
| VIN_PROT | **VIN_A**, the analog branch after D_AIN, with the hold-up reservoir; the module branch after D_MIN and the load switch Q_MSW is **VIN_MOD** (pin 39) | pedal |
| C_SCH, FB_IN (input ferrite), VIN_SCH | Where FB_IN sits on the split pedal is an S2 choice ([vin-mod.md §9][vm] item 2); the hot-plug grid covers 0–3 µH and no ferrite | pedal |
| C_BULK | C_BULK and C_BULK2 to C_BULK4 on VIN_A ([R-35](decisions.md#r-35), [R-40](decisions.md#r-40)) | pedal |
| L_FILT, C_BIN1, C_BIN2, C_BINHF, R_DAMP, C_DAMP (VIN_BUCK) | The module's own input network, unchanged ([R-48](decisions.md#r-48)) | module |
| U_BUCK (TPS62933F), 3V3_D | The module's 3.3 V regulator. Its EN comes from VIN_MOD through R_UV1/R_UV2 ([D24](decisions.md#d24), owner-approved; [R-47](decisions.md#r-47)). Its output feeds the module and leaves on pin 38 as 3V3_D, a 25 mA logic supply | module |
| U_SUP (TLV803EA30) on NRST | Unchanged, on the module ([D14](decisions.md#d14)) | module |
| U_LDO (TPS7A49), 5V_A, U_VMID, op-amps | On VIN_A | pedal |
| U_PF (TPS3808G01) on BUCK_EN | Senses VIN, drives PF_OK only, and through an inverter drives the relay gate, codec reset, the module load switch, VIN_MOD's discharge and 3V3_P's EN ([R-37](decisions.md#r-37), [R-38](decisions.md#r-38), [R-58](decisions.md#r-58)) | pedal |
| Relay coils, LEDs on 3V3_D | On the pedal digital rail **3V3_P** ([R-25](decisions.md#r-25)) | pedal |
| PCM3060 VDD from 3V3_D | From a local regulator on 5V_A, U_CVDD ([D22](decisions.md#d22), owner-approved; [R-30](decisions.md#r-30)) | pedal |

*Not in force:* `POWER.md` §5.2's power-fail shed, U_PF's open-drain RESET joined to the buck's EN node (BUCK_EN), tripping at VIN_PROT 7.45 V and releasing at ≤ 7.84 V 12–28 ms later; replaced by the split spec §7.4 circuit, which the owner directed ([O-6](decisions.md#o-6)), as realised by the rulings [R-33](decisions.md#r-33), [R-35](decisions.md#r-35) to [R-42](decisions.md#r-42), [R-44](decisions.md#r-44), [R-45](decisions.md#r-45) and [R-58](decisions.md#r-58) and the owner decisions [R-34](decisions.md#r-34) and [R-43](decisions.md#r-43).

*Not in force:* the buck's EN from the 5V_A divider (100 kΩ over 40.2 kΩ, `POWER.md` §3.3, §5.2), which enforced the codec's VCC-before-VDD order on v1; replaced by [D24](decisions.md#d24) on the module and by [D22](decisions.md#d22) on the pedal.

## 1. The power tree after the split

Split spec §7.4 (owner direction [O-6](decisions.md#o-6)), as realised by the S1 analyses ([power-fail.md §2, §7][pf]; [pedal-digital-rail.md §3][pdr]; [vin-mod.md §3][vm]):

```text
 DC jack (5.5 x 2.1 mm, centre negative) - VIN (power-fail sense point)
   |
   +- D_AIN (PMEG4030ER) - VIN_A: C_BULK..C_BULK4 (4 x 100 uF Al) + X7R parts (hold-up reservoir)
   |                         -> U_LDO TPS7A49 -> 5V_A -> codec VCC, ADC drivers, U_CVDD (codec VDD, oscillator), U_PF VDD, U_PFINV
   |                         -> VMID divider and followers, the VIN_A op-amp stages
   |
   +- D_MIN (PMEG4030ER) - Q_MSW (AOD4185 load switch) - VIN_MOD
                              |                              |
                              |                              +- interface pin 39 -> module input network -> module buck (TPS62933F)
                              |                              |     -> module 3V3 (MCU, SDRAM, flash, VDDA via FB_VDDA)
                              |                              |     -> pin 38 3V3_D (25 mA logic supply to the pedal)
                              |                              |     -> pin 21 VREF_A (ADC reference rail; analog.md)
                              |                              +- U_PRAIL (TPS62933F) -> 3V3_P -> relay coils, LEDs, MIDI OUT loop
                              +- Q_VDIS + R_VDIS 10 ohm: discharges VIN_MOD while tripped
 U_PF (TPS3808G01) senses VIN upstream of both diodes; PF_OK -> U_PFINV -> PF_TRIP and PF_ON:
   PF_TRIP: relay gate low (Q_PFG), codec RST (Q_PFR), VIN_MOD discharge (Q_VDIS), 3V3_P EN reset (Q_PEN)
   PF_ON:   Q_MSW on through Q_MSWD, and 3V3_P's EN delay through R_PEN / C_PEN
```

- The analog branch has its own reverse-polarity element, which also isolates it: when the input disappears, neither the module branch nor 3V3_P can draw from the reservoir (split spec §7.4; [R-35](decisions.md#r-35)). D_AIN blocks any current from VIN_A back to VIN, so the reservoir cannot feed the module's inrush ([vin-mod.md §4][vm]).
- 3V3_P is fed from VIN_MOD, after the module branch's reverse-polarity element and the load switch, never from VIN_A ([R-25](decisions.md#r-25); [pedal-digital-rail.md §3][pdr]). A branch of its own was rejected: it needs a third diode and its own bulk, and its ripple would still reach VIN.
- The pedal's operating input range and its survival condition are the owner's: **9 V to 12 V** DC operating, and 18 V DC continuously plus reverse polarity survived without damage, "Survival is not operation" ([PS-18V](decisions.md#ps-18v), owner). 18 V is a survival condition, not an operating point ([R-41](decisions.md#r-41)).

## 2. Effective constraints

### EC-SEED-BENCH

**A development bench with a real Daisy Seed fitted runs from a 9 V supply, until bring-up measures a Seed's VIN current and capacitance through the module-branch switch-on** (open item SEED-VIN-SWITCH-ON). The reason: a Seed's VIN maximum is 17 V and it has no 18 V survival; its switch-on current through Q_MSW cannot be bounded from published data, and under the only published assumption (a Rev5's regulator) the switch-on holds Q_MSW's 140 °C check line only at 9 V + 5 % ([FIG-SEED-TJ](#fig-seed-tj)); at that supply the hot-plug bound on VIN_MOD stays 3.4 V under the Seed's 17 V ([FIG-SEED-HOTPLUG](#fig-seed-hotplug)). No added protection is fitted on the module branch for a Seed, and no 18 V survival test is run with a Seed fitted. Production uses our module.
- **Set by:** [O-15](decisions.md#o-15) (a controller ruling despite its O-number; the split spec records it as "controller ruling on best practice; the owner may override").
- **Amended by:** [R-50](decisions.md#r-50) (narrows O-15's range to 9 V, "This narrows O-15's" range in the ledger's words; a ruling narrowing a ruling); [R-58](decisions.md#r-58) (the Seed at 9.45 V reaches 137.7 °C, "so R-50's 9 V benches stand"); [R-59](decisions.md#r-59) (13.56 V hot-plug bound at 9.45 V).
- **Cross-reference:** the owner's [O-16](decisions.md#o-16) says O-15's development limit "applies to every revision"; the limit it refers to is O-15 as narrowed by R-50.

*Not in force:* O-15 as first written, "Development with a real Seed fitted is limited to 9–12 V supplies" (split spec §2, §3, §5.0 S-1, §9.1, §15 Q-3), the split spec §5.6.1 Survival row "Seed benches run on 9–12 V (O-15)", and the split spec §12.4 bring-up step 1, "on a 9–12 V supply only while a Seed is fitted (O-15)", narrowed by R-50; and §12.4 step 0's bare-Seed3 bench "on a 9–12 V supply", a step the owner's O-16 withdrew (split spec §13 step 1).

*Not in force:* the Seed figures before S1 Task 17. R-50's text as first written read 123.1 °C at 9.45 V and 139.65 °C at 12.6 V; R-58 restated them as computed, 123.18 / 139.68 °C (review D-D-11), before its slower slow corners raised them to 137.7 / 147.3 °C. R-50 set the 9 V rule from the start, whatever those figures were, because a Seed's switch-on could not be bounded from published data; a 12 V Seed bench was never permitted under R-50.

### EC-QPEN-RESET

**Q_PEN resets 3V3_P's EN.** U_PRAIL's EN follows PF_ON through R_PEN 150 kΩ against R_PENPD 1.00 MΩ to GND, into C_PEN, two 4.7 µF 50 V X7R in parallel (9.4 µF). **Q_PEN**, a Nexperia 2N7002,215 (LCSC C65189, SOT-23), has its gate on PF_TRIP and its source on GND, and its drain reaches EN through R_PENS 180 Ω. While the supervisor is tripped, Q_PEN holds C_PEN at ≤ 0.5 mV, so every release, from a cold start or after a trip, waits the full EN delay of at least 230 ms ([FIG-EN-DELAY](#fig-en-delay)), which clears the slowest Q_MSW switch-on ramp (148.5 ms) by 82 ms. 3V3_P (the coils, LEDs and MIDI OUT loop) therefore never draws through Q_MSW during its ramp, and its EN falls below 1.1 V within 3.14 ms of a trip ([power-fail.md §7][pf]).
- **Set by:** [R-44](decisions.md#r-44) (EN follows PF_ON, so 3V3_P is held off during the ramp); [R-58](decisions.md#r-58) (the Q_PEN reset and C_PEN doubled).
- **Values R-58 kept from earlier rulings:** R_PENPD 1.00 MΩ from [R-45](decisions.md#r-45) (which also made C_PEN a single 4.7 µF, doubled by R-58), and R_PENS 180 Ω from [R-52](decisions.md#r-52); both predate R-58.
- **Amended by:** none since R-58.

*Not in force:* the diode reset of EN, D_PEN (BAS116H) from EN to PF_ON with R_PENS in series ([R-44](decisions.md#r-44) to [R-52](decisions.md#r-52)), replaced by Q_PEN under R-58 because a diode leaves C_PEN at its floor near the threshold: after a brownout the release started at 0.94 V and EN rose 18.4 ms later, inside the 12.6 V slow ramp, which R-44 forbids.

*Not in force:* R-52's re-release delay of at least 32.7 ms after a trip, and the earlier "≥ 115 ms" and "≥ 76 ms" EN delays; C_PEN 2.2 µF, then a single 4.7 µF; and "EN floating" ([R-25](decisions.md#r-25) as first written).

## 3. Pedal power entry: the isolated, held-up analog branch

Why the replacement exists (split spec §7.4): on v1 the supervisor stopped the buck, so the bulk capacitor fed only the analog load while the output relay opened. The buck is now inside the module, the Seed pinout has no EN pin, and no interface pin is free for one, so the module's load (about 2.9 W at its regulator output) could no longer be removed from the capacitor that feeds the analog stages. The requirements R-PF-1 to R-PF-11 are in the split spec §7.4 and in [bypass-relay.md](bypass-relay.md); the realisation below is [power-fail.md][pf]'s.

### 3.1 The analog branch: R-PF-7 and its load

| Quantity | Value | Basis |
|---|---|---|
| R-PF-7 basis | VIN_A ≥ 8.44 V at exactly 9.00 V in, no adapter tolerance, no cable drop, cold | Owner decision [R-34](decisions.md#r-34): asked "At what supply voltage must the pedal reach its full 7.62 Vp-p output level without clipping?", he answered "Exactly 9.0 V (Recommended)". It covers R-PF-7 only; the hold-up keeps the brief's basis ([R-40](decisions.md#r-40)) |
| D_AIN drop | ≤ 0.385 V at −20 °C | PMEG4030ER Table 7, ≤ 330 mV at 0.1 A, 25 °C, plus Fig. 4's typical 1.23 mV/K × 45 K ([power-fail.md §1][pf]) |
| VIN_A at 9.00 V | **8.615 V** ≥ 8.44 V | 9.00 − 0.385 V. Information, not a requirement: a 9 V adapter 5 % low with 0.1 V of cable drop gives 8.065 V, clipping the loudest peaks about 0.44 dB sooner (open item ANALOG-HEADROOM-9V) |
| VIN_A load, `pf.vinALoadMaxMa` | **80.15 mA** | `BYPASS-RELAY.md` §5.2's 63 mA analog load plus the codec domain's input side, 17.15 mA, with R_CRST 4.70 kΩ ([power-fail.md §1][pf]). The sense divider and bleeder sit on VIN, not VIN_A |

Candidates compared ([power-fail.md §2][pf]): a per-branch PMEG4030ER (chosen, [R-35](decisions.md#r-35)); ideal-diode controllers (LM74700-Q1, LM74800-Q1 and LM74810-Q1 pass, with drops ≤ 29 mV; the comparator-only LM74801-Q1 is rejected by [R-33](decisions.md#r-33)); and a load switch behind one shared Schottky (8.533 V). The per-branch Schottky is the split spec's preferred realisation; the load switch is kept as the re-engage mechanism (§3.5).

### 3.2 The hold-up reservoir

| Part | Count | Nominal | Effective | Basis |
|---|---|---|---|---|
| EEE-FK1V101P 100 µF 35 V aluminium (C_BULK, C_BULK2–4), LCSC C128462 | 4 | 400 µF | 320 µF | −20 % initial tolerance |
| CL31B106KBHNNNE 10 µF 50 V X7R (C_PROT, C_LIN, three op-amp decoupling), LCSC C89632 | 5 | 50 µF | 25 µF | 0.5 × under DC bias |
| **Total** | | **450 µF** | **345 µF** | VIN_A falls at 80.15 mA / 345 µF = **0.232 V/ms** |

The binding hold-up case needs 247 µF effective, and the 12 V slow-fall margin stays ≥ 0 if the cans lose a further 28 % cold or over life (+0.10 ms at × 0.72) ([power-fail.md §3][pf]; [R-35](decisions.md#r-35), [R-40](decisions.md#r-40) added the fourth can).

### 3.3 The supervisor at VIN (R-PF-6, R-PF-9)

U_PF, a TPS3808G01, senses VIN at the jack, upstream of both diodes ([R-36](decisions.md#r-36)): R_PFT1 13.0 kΩ from VIN to a clamp node, R_PFT2 174 kΩ from the clamp node to SENSE, R_PFB 10.0 kΩ to GND, all ±0.1 %, with C_PFS 1 nF at SENSE; D_PFCL (BAS116H) from GND to the clamp node for reverse polarity; R_VBLD 10.0 kΩ on VIN so VIN falls after a plug pull. VDD and MR are on 5V_A.

#### FIG-TRIP

**Trip 7.799–8.159 V falling, release ≤ 8.404 V rising** (a consequence figure [R-58](decisions.md#r-58) states). Inputs: VIT 0.405 V ±2 % (SBVS050N); the divider (13.0 + 174) kΩ over 10.0 kΩ, each ±0.1 % (±0.19 % on the ratio); D_PFCL's ≤ 80 nA leakage through 13 kΩ (≤ 1.04 mV at the top); SENSE input current ±25 nA (SBVS050N §6.5) through the whole 187 kΩ top (±4.68 mV). Method: trip = VIT × (187 + 10.0) / 10.0, nominal 0.405 × 19.7 = 7.979 V, taken to each corner with the tolerances and the two current terms added; release = trip maximum × 1.03 (the part's hysteresis). Against R-PF-6: the release sits 46 mV under the sagged 9 V level of 8.45 V (8.55 V less 0.1 V of cable), and the trip ≥ 0.291 V under it (R-PF-6 asks ≥ 0.27 V). Source: [power-fail.md §4][pf]. Paper analysis of an unbuilt board.

*Not in force:* 7.804–8.155 V and ≤ 8.399 V, before R-58 added the SENSE input current.

Reversed 18 V: the clamp node sits at most 1.09 V below GND, so SENSE is ≥ −0.059 V, inside the −0.3 V limit; D_PFCL carries 1.39 mA and R_PFT1 takes 24.9 mW of 100 mW. A Schottky on SENSE itself was rejected: its hot leakage through the divider would shift the trip by tenths of a volt.

### 3.4 Timing and margins (R-PF-1 to R-PF-3, R-PF-8)

**t_open = 3.068 ms** (`pf.openMaxMs`) is the sum of: detection 0.017 ms (plug pull through 9.52 kΩ × 2 nF plus the 9.5 µs SENSE filter); SENSE to RESET 0.050 ms, an allowance (SBVS050N gives 20 µs typical only, [R-58](decisions.md#r-58)); gate drive 0.00067 ms; and the relay release, 3.0 ms (K106-E1-11 maximum). V_B, the level VIN_A must stay above, is VIN_A,steady / 2 + VMID error + 0.1 V at the supply's +5 % with no drop: 4.842 V at 9 V, 6.421 V at 12 V. The two frames are those of [R-39](decisions.md#r-39) ([power-fail.md §5][pf]):

| Margin | Release 3.0 ms | At BU-19's 2.7 ms | Frame |
|---|---|---|---|
| Plug pull, 9 V | **+10.80 ms** | +11.10 ms | VIN_A unfed from 8.065 V (supply 5 % low, 0.1 V cable, [R-40](decisions.md#r-40)) |
| Plug pull, 12 V | **+16.27 ms** | +16.57 ms | from 10.915 V |
| Slow fall, 9 V | **+8.01 ms** | +8.31 ms | VIN_A ≥ 7.799 − 0.385 = 7.414 V at the trip |
| Slow fall, 12 V | **+1.21 ms** | +1.51 ms | the binding case; needs ≥ 247 µF effective, 345 µF fitted |

The relay override, the codec reset on a trip and their checks (R-PF-4, R-PF-11; [R-37](decisions.md#r-37)) are in [bypass-relay.md](bypass-relay.md). In outline: U_PF's RESET drives only PF_OK (100 kΩ to 5V_A); U_PFINV, an SN74LVC2G14 on 5V_A, makes PF_TRIP (channel A, high when tripped) and re-inverts it to PF_ON (channel B); 100 kΩ pull-downs hold both low when 5V_A is off.

### 3.5 Re-engage: the module load switch Q_MSW (R-PF-5)

**Circuit** ([R-38](decisions.md#r-38), [R-41](decisions.md#r-41), [R-42](decisions.md#r-42), [R-49](decisions.md#r-49); [power-fail.md §7][pf]):
- **Q_MSW**, an AOS AOD4185 (−40 V, ±20 V, < 20 mΩ at −4.5 V, TO-252), between D_MIN and VIN_MOD. Gate network: R_MSWT 15.0 kΩ source to gate; R_MSWB 4.30 kΩ gate to Q_MSWD (AO3400A, gate on PF_ON).
- **Soft start:** C_SS 2.2 µF 50 V X7R from the drain to a node X, D_SS (BAS116H) from X to the gate, R_SSR 15.0 kΩ from the source to X. As the drain rises, D_SS conducts and C_SS holds the gate on its Miller plateau, so VIN_MOD ramps at the gate current over C_SS.
- **Re-engage delay:** C_PFCT 47 nF C0G on U_PF's CT gives td **154–395 ms** (SBVS050N Eq. 1, CT ±5 %, device spread 0.602–1.398×). Power-up gains this delay, inside firmware's 2.5 s bypass hold.
- **Discharge:** Q_VDIS (AO3400A, gate PF_TRIP) with R_VDIS 10.0 Ω Vishay CRCW201010R0FKEFHP (2010) discharges VIN_MOD while tripped, so the module always reboots, into bypass.
- **Plug-in gate hold:** C_GS 220 nF from the source to D_GS (BAS116H, cathode on the gate), with R_GSB 470 kΩ across C_GS (§4.6).
- **3V3_P's EN:** held off during the ramp by Q_PEN and C_PEN ([EC-QPEN-RESET](#ec-qpen-reset)).

| Check | Figure | Basis ([power-fail.md §7][pf] unless named) |
|---|---|---|
| Ramp at the fastest plateau | 2.03 / 2.91 / 4.42 V/ms at 9.45 / 12.6 / 18 V | gate current (VS − 1.7 V) / R_MSWB − 1.7 V / R_MSWT into C_SS × 0.9 × 0.85 × 0.5 (tolerance, X7R over temperature, DC bias) |
| Slowest ramp, end | 148.5 ms at the lowest running 7.33 V; 54.5 / 33.0 / 23.3 ms at 9.45 / 12.6 / 18 V | slow corner: \|VGS(th)\| max 3 V + 0.9 V plateau overdrive (an allowance from AOD4185 Fig. 2, typical) + 0.1 V cold; C_SS +10 % × 1.15; the pre-plateau also charges C_GS |
| VSG on, lowest running VS (7.33 V) | ≥ 4.60 V | ≥ 4.5 V, where RDS(on) < 20 mΩ |
| VSG at the 24.8 V hot-plug corner | ≤ 16.04 V | ±20 V rating (80 %) |
| On-state drop and junction at 0.623 A | 19.1 mV, 11.9 mW, Tj 86 °C | RDS(on) × 23 / 15 from the data sheet's 125 °C maximum row |
| VIN during the ramp, 9 V supply 5 % low behind 0.185 Ω | **≥ 8.368 V**, 0.21 V above the trip maximum | VIN_A's 80 mA + inrush into 220 µF + the module's ≤ 0.63 A real start-up peak, ≤ 0.98 A ([vin-mod.md §4][vm]); so U_PF cannot trip and the switch closes once |
| VIN_MOD discharge from 18 V to 1.0 V | **6.42 ms** (6.53 ms at 18.9 V), against VIN_A's 18.14 ms fall from 7.414 V to 3.2 V: margin 11.6 ms | τ = 10 Ω × 220 µF = 2.22 ms. At VIN_MOD ≤ 1 V, U_PRAIL is off and 3V3_P ≤ 2.0 V, under the coil's cold must-operate 2.00 V, so the relays cannot re-engage whatever RELAY_EN does |
| R_VDIS per trip from 18 V | 35.6 mJ; 32.7 W for 1.11 ms equivalent | 63 % of the CRCW2010-HP continuous-pulse trace's 52 W at 1.2 ms (document 20043 p. 5, read from the graph); average under back-to-back trips 0.23 W, 28 % of 0.82 W at 85 °C |

#### FIG-EN-DELAY

**3V3_P's EN waits at least 230 ms after every release** ([R-58](decisions.md#r-58)). Inputs: R_PEN 150 kΩ and R_PENPD 1.00 MΩ, ±1 %; C_PEN two 4.7 µF × 0.73 (−10 % tolerance, DC bias, X7R at −20 °C); PF_ON high at 5.202 V; EN's pull-up currents Ip 0.7 µA and Ih 1.4 µA, typical only, × 3 allowed each; the lowest rising threshold taken as VEN_FALL's minimum, 1.1 V (SLUSEA4D §8.5 gives VEN_RISE ≤ 1.28 V and no minimum); the start from Q_PEN's rest, ≤ 0.5 mV. Method: EN charges with τ = (R_PEN ∥ R_PENPD) × C_PEN,min toward the highest Thevenin drive, Ip included; the delay is the time to reach 1.1 V. Result: **≥ 230 ms**, against the slowest switch-on ramp's 148.5 ms (7.33 V): an 82 ms margin. The latest EN is about 0.64 s (the slowest τ toward the weakest drive, 3.42 V with Q_PEN's 85 °C leakage of 5.32 µA, a straight line between the 2N7002's 25 °C and 150 °C maxima), inside firmware's 2.5 s bypass hold; EN high is ≤ 5.353 V (SLUSEA4D Eq. 5), under 5.5 V. While tripped, Q_PEN (RDS(on) ≤ 5.3 Ω at VGS 4.5 V, × 9.25 / 5 hot = 9.8 Ω) holds EN at ≤ 0.5 mV; C_PEN dumps ≤ 5.353 V / 178.2 Ω = 30.0 mA into Q_PEN (300 mA rating), and EN falls below 1.1 V within ≤ 3.14 ms. After a trip PF_TRIP stays high for at least td min, 154 ms, while Q_PEN empties C_PEN with τ ≤ 1.9 ms, so the next release starts from ≤ 0.5 mV and waits the same 230 ms. Source: [power-fail.md §7][pf]. Paper analysis of an unbuilt board (open item QPEN-RERELEASE).

**Behaviour the owner should know** (review M-8, recorded as a note, not a decision): v1's MCU rode through a dip to about 4 V. On the split pedal any dip at the jack below the trip (7.80–8.16 V) reboots the module; the pedal holds bypass for td plus firmware's 2.5 s, with the dry signal passing. A 9 V supply that sags that low under load is already below the analog headroom.

**Supply rating** (owner decision [R-43](decisions.md#r-43)): asked what rating the pedal should promise, he answered "Design for 1 A, measure (Recommended)". The design's sufficient condition is a regulated 9 V supply that holds ≥ 8.55 V at **0.98 A** behind 0.185 Ω of cable (VIN_A 80 mA + inrush into 220 µF + the module's ≤ 0.63 A at the switch-on); steady running draws ≤ 0.70 A. The published rating follows a bring-up measurement (open item SUPPLY-RATING-MEASURE). A weaker supply is safe but does not start: the module retries once per td while the pedal sits in bypass; R_VDIS averages about 0.06 W at 9 V.

*Not in force:* the sufficient condition as 8.55 V at 1.08 A (R-41's 0.08 + 0.38 + 0.62 A), restated by S1 Task 17 fix D-D-2 without reopening the owner decision.

### 3.6 Q_MSW's switch-on junction temperature

**Method** ([R-42](decisions.md#r-42), [R-45](decisions.md#r-45); [power-fail.md §7][pf]): VIN_MOD rises linearly from 0 to VS over the ramp time T, and Q_MSW carries the inrush plus the module's current across VDS = VS − VIN_MOD. Peak power P̂ and energy E are integrated over that profile. Then **Tj ≤ 85 °C + P̂ × ZθJC(T) + E / C_pad**, where ZθJC comes from AOD4185 Fig. 11 (single pulse, normalised to RθJC 2.4 °C/W, read from the graph; 0.70 for T ≤ 6 ms, 0.82 for T ≤ 25 ms, 1.0 for T ≤ 100 ms), and C_pad is the heat capacity of the 1 oz copper directly under the tab, 36 mm² × 35 µm × 3.45 J/(cm³·K) = **4.35 mJ/K** (an upper bound on the case rise: lateral spreading, the tab and the FR-4 are ignored). The check line is Tj ≤ **140 °C**, 10 °C under the 150 °C limit, itself 25 °C under the 175 °C absolute maximum. Fig. 15's ZθJA is not used: its short-time values fall below Fig. 11's ZθJC, which cannot be, so it is not conservative.

Corners: **fast**, \|VGS(th)\| min 1.7 V, lowered for a hot plateau, C_SS × 0.9 × 0.85 × 0.5; **slow**, \|VGS(th)\| max 3 V + 0.9 V overdrive + 0.1 V cold, C_SS +10 % × 1.15, R_SSR's and R_GSB's currents subtracted from the gate current.

#### FIG-QMSW-TJ

**Q_MSW ≤ 123.7 °C at 18 V (the governing switch-on figure; [R-50](decisions.md#r-50), [R-58](decisions.md#r-58)).** Inputs: the module's real start-up ([R-50](decisions.md#r-50); [vin-mod.md §4][vm]): nothing drawn below its EN start; from the start it soft-starts over tSS ≥ 33 nF × 0.9 × 0.8 V / 6.5 µA = 3.66 ms (SLUSEA4D Eq. 6, C_SS −10 %, ISS maximum); the full 892 mA load drawn at every VOUT; the module's whole 3V3 capacitance, ≤ 150 µF (an S2 module requirement), charging at 150 µF × 3.392 V / 3.66 ms = 139 mA; the full-load loss at η 0.85, 0.62 W, drawn from the first instant; input current = ((I_load + I_cap) × VOUT(t) + P_loss) / VIN_MOD with VIN_MOD on Q_MSW's ramp; 220 µF of inrush. Method: the Tj bound above, on each corner. Result:

| Corner | Fast / slow Tj, this module |
|---|---|
| 9.45 V | 94.8 / 94.9 °C |
| 12.6 V | 103.3 / 99.7 °C |
| **18 V** | **123.7** / 110.4 °C |
| 18.9 V (information) | 127.9 / 112.4 °C |
| 7.33 V slow | 90.8 °C |

The binding 18 V corners hold the 140 °C check line at up to **3.21×** this module's current. Pointwise the module exceeds the earlier Task 15 current profile by up to 1.155× for an instant at the end of its soft start; that profile was a sufficient condition, not the requirement, and since R-50 it is information only (it reaches 142.7 °C at 18 V fast, under 150 °C). Source: [vin-mod.md §4][vm]. Paper analysis of an unbuilt board; the switch-on itself still needs a circuit-simulator check and a bring-up scope (open item QMSW-SWITCH-ON-CHECK).

*Not in force:* 119.4 °C with 4.06× headroom (R-50 as first written), before R-58's C_SS temperature term and slow-corner plateau overdrive.

#### FIG-POUR

**S2 pour ceiling: Q_MSW's DPAK pour gives RθJA ≤ 95 °C/W on 1 oz copper** ([R-50](decisions.md#r-50)), with a tab pad ≥ 36 mm² ([R-45](decisions.md#r-45)). Inputs: a supply too weak to hold the trip makes the module retry once per td min, 154 ms; the energy E of one switch-on and its junction temperature Tj, each on the slow corners (which carry the most energy) with this module's real start-up ([FIG-QMSW-TJ](#fig-qmsw-tj)). Method: the average retry power is E / td min; the ceiling is the RθJA at which that average, added to one switch-on's Tj, just reaches 150 °C: RθJA,max = (150 °C − Tj,slow) / (E / td min) (the method of [vinModSummary.ts][vms], read and not carried). Result:

| Supply | Retry average E / td min | RθJA ceiling |
|---|---|---|
| 9.45 V | 0.14 W | 384 °C/W |
| 12.6 V | 0.23 W | 222 °C/W |
| **18 V** | 0.39 W | **102 °C/W** (101.9) |

At 18 V: (150 − 110.4) / 0.39 ≈ 102 °C/W, the figure [vin-mod.md §4][vm] and [power-fail.md §11][pf] record; [power-fail.md §7][pf] records it as 101.9 °C/W, from the unrounded energy. 18 V binds; **95 °C/W is required, about 1.07× under it**. A retry at 18 V needs an 18 V supply that collapses below the 8.16 V trip, so the binding case is itself improbable. With the pour, the steady 12 mW of on-state loss adds 1.1 °C. 1 oz is PCBWay's default outer copper and the recorded assumption; 2 oz is not ordered. Source: [vin-mod.md §4][vm], [power-fail.md §11][pf]. Paper analysis of an unbuilt board (open item QMSW-POUR-LAYOUT).

*Not in force:* "Q_MSW's retry average is ≤ 0.4 W", which had no computed source (withdrawn by R-50); the ceilings 551 / 282 / 120 °C/W before R-58's slower slow corners.

### 3.7 Survival of the power-entry parts (R-PF-9)

| Part | Forward 18 V (24.8 V hot-plug corner) | Reversed 18 V | Rating |
|---|---|---|---|
| D_AIN, D_MIN (PMEG4030ER) | Conducting; D_AIN I²t ≤ 1.52 A²s at the hot-plug extreme corners (14.6 % of 10.4 A²s) | VR 18 V | VR 40 V (45 %) |
| R_VBLD 10 kΩ 1206 | 32 mW | 32 mW | 250 mW |
| R_PFT1 13 kΩ | ≤ 0.21 mW | 24.9 mW | 100 mW |
| D_PFCL (BAS116H) | VR ≤ 23.2 V | IF 1.39 mA | VR 75 V, IF 215 mA |
| U_PF SENSE | ≤ 1.26 V | ≥ −0.059 V | −0.3 to 7 V |
| Q_MSW (AOD4185) | VDS ≤ 24.8 V (62 %), VSG ≤ 16.04 V (80 %); switch-on Tj ≤ 123.7 °C; partial conduction at a fast re-plug ≤ 129.4 °C (§4.6) | 0 V (behind D_MIN) | 40 V, ±20 V |
| Q_MSWD, Q_VDIS (AO3400A) | VDS ≤ 24.8 V / 18 V | 0 V | 30 V |
| R_VDIS 10 Ω | 35.6 mJ, 32.7 W per trip; ≤ 61.2 W for ≤ 0.26 ms at a re-plug | 0 | CRCW2010-HP single pulse ≥ 250 W at ≤ 0.3 ms |
| Q_PEN (2N7002) | VDS ≤ 5.35 V; 30.0 mA dump | 0 | 60 V, 300 mA |
| C_SS 2.2 µF 50 V | ≤ 24.8 V | 0 | 50 V |
| C_GS 220 nF 50 V, D_GS, R_GSB 470 kΩ | ≤ 16.04 V; R_GSB ≤ 0.55 mW | 0 | 50 V; VR 75 V; 100 mW |
| C_BULK2–4 | 17.6 V DC (50 %) | 0 | 35 V |

Source: [power-fail.md §8][pf]. U_PFINV and the AO3400A gate drivers see only 5V_A (≤ 5.2 V).

## 4. VIN_MOD (pin 39)

The interface rule for pin 39 is in [architecture.md](architecture.md) §4.7. The values below are the S1 analysis behind the contract's `vinMod` limits ([vin-mod.md][vm]; rulings [R-46](decisions.md#r-46) to [R-52](decisions.md#r-52), amended by [R-58](decisions.md#r-58) and [R-59](decisions.md#r-59)). The contract is in this repository unchanged at [circuits/h7-platform/module-interface.json](../../circuits/h7-platform/module-interface.json) and the results at [circuits/h7-platform/interface-analysis-results.json](../../circuits/h7-platform/interface-analysis-results.json); both are still draft.

| Limit | Value | Basis |
|---|---|---|
| `minV` | **7.93 V** | [FIG-MINV](#fig-minv) |
| `maxV` | **12.6 V** | 12 V × 1.05 with no drop: the PMEG4030ER and AOD4185 publish no minimum VF or RDS(on) |
| `survivalV` | **18 V** | the 18 V input condition with no drop, continuous (split spec §5.6.1) |
| `maxSteadyCurrentMa` | **449 mA** | 3.392 V × 892 mA / (7.93 V × 0.85) = 448.9 mA: the module's 3V3 budget (§5.1) reflected through its buck at η 0.85 (SLUSEA4D Eq. 25), at `minV` |
| `maxPeakCurrentMa` | **674 mA** | the same at 1.5 × 892 mA: 673.3 mA, recorded rounded up. Socket: 3 A × 1000 = 3000 mA ≥ 1.5 × 674 = 1011 mA, and the platform rule's 2000 mA cap on the peak is far above 674 mA (729 mA at 7.32 V) |
| `maxInrushPeakA` | **0.65 A** | the module's bulk, 78.5 µF, × the ramp (≤ 4.50 V/ms at 18 V with the hot plateau), plus the module's start-up current: 0.648 A at most, at 18 V fast, rounded up. It starts only after td, flows through D_MIN, and is far under the socket's 2000 mA |
| `permittedRippleMvPp` | **41.6 mV p-p** | §4.4 |
| `moduleInputBulkUf` | **67.1 µF** nominal, 78.5 µF at most | the module's input network ([R-48](decisions.md#r-48)): aluminium +20 %, ceramics +10 % with no bias |
| `hotPlugPeakV` | **26.3 V** at pin 39 | [FIG-HOTPLUG](#fig-hotplug) |

**Below `minV`.** The pedal keeps running until U_PF trips, so the module also sees VIN_MOD down to 7.799 − 0.480 = **7.32 V**, where it draws 486 mA steady and 729 mA at the 1.5× peak. For module designers: the 449 / 674 mA limits apply at VIN_MOD ≥ 7.93 V; brown-out operation to the trip draws up to 486 / 729 mA, which the socket still carries ([vin-mod.md §1][vm]).

*Not in force:* `minV` 7.94 V, `maxPeakCurrentMa` 673 mA, `maxInrushPeakA` 0.61 A and `hotPlugPeakV` 25.8 V, before R-58 and R-59.

#### FIG-MINV

**VIN_MOD minimum 7.93 V** (`minV`; [R-46](decisions.md#r-46) as amended by [R-58](decisions.md#r-58)). Inputs: a 9 V supply 5 % low, 8.55 V; cable 0.185 Ω carrying VIN_A's 80.15 mA plus the module branch's 623 mA (0.130 V); D_MIN cold, 0.4676 V; Q_MSW, 0.623 A × 20 mΩ = 0.0125 V. D_MIN's drop is PMEG4030ER Table 7 (330 mV at 0.1 A, 440 mV at 1 A) log-interpolated at 0.65 A, 330 + 110 × log₁₀(6.5) = 419.4 mV, plus Fig. 4's typical 1.07 mV/K × 45 K (25 °C to −20 °C), an allowance: 0.4676 V. The 623 mA branch current is the module's input power, 892 mA × 3.392 V / 0.85 = 3.56 W, plus 3V3_P's faulted input, 1.361 W: 4.921 W at 7.9 V. Method: 8.55 − 0.130 − 0.4676 − 0.0125 = 7.9398 V, rounded down to 7.93 V. Checks: ≥ 5.0 V (the Rev7 Seed minimum, `DS120`, the contract rule) and ≥ the module's EN start maximum over 0.9, 6.75 / 0.9 = 7.50 V. The cable drop replaces the brief's flat 0.1 V (`BYPASS-RELAY.md` §3.4's drop at 0.54 A; the pedal now draws 0.70 A); the brief's formula would give 7.970 V, and the lower figure is recorded. Source: [vin-mod.md §1][vm]; the 623 mA branch current and 3V3_P's faulted 1.361 W are from [power-fail.md §7][pf] (the drop-and-junction row) and §6.2 here. Paper analysis of an unbuilt board.

### 4.1 The module's EN/UVLO divider

R_UV1 18.0 kΩ (LCSC C25810) from VIN_MOD to EN and R_UV2 4.30 kΩ (C23159) to GND, both ±1 %, on the module ([R-47](decisions.md#r-47), implementing the owner-approved [D24](decisions.md#d24)). With SLUSEA4D Eq. 3–5 ([vin-mod.md §2][vm]):

| Figure | Value | Basis |
|---|---|---|
| Start, maximum | **6.75 V** | VEN_RISE 1.28 V × (1 + R1 high / R2 low), no Ip credited |
| Start, minimum | **5.58 V** | VEN_FALL 1.1 V (VEN_RISE has no minimum) × (1 + R1 low / R2 high), less Ip × 3 × R1 |
| Stop, minimum | **5.50 V** | as the start minimum, less (Ip + Ih) × 3 × R1 |
| EN at 18 V; at the 26.23 V hot-plug bound | 3.55 V; 5.16 V | Eq. 5 at its highest corner, against 5.5 V |
| Divider current at 18 V | 0.82 mA | |

The start maximum is under 0.9 × `minV` = 7.14 V and under the lowest running VIN_MOD, 7.32 V; the stop minimum is above the buck's own UVLO (3.8 V rising maximum). Small resistors keep the typical-only Ip and Ih (× 3 allowed) from moving the thresholds by more than 0.12 V. The 0.23 V typical hysteresis is harmless: Q_MSW's Miller loop drives VIN_MOD, so the module's start current cannot pull VIN_MOD back through the threshold.

### 4.2 The module's input network

The module carries `POWER.md` §1's buck input branch unchanged ([R-48](decisions.md#r-48); split spec §6.3): L_FILT 4.7 µH (Würth 74404054047), C_BIN1/C_BIN2 2 × 10 µF 50 V X7R, C_BINHF 100 nF, and the damping leg R_DAMP 0.22 Ω + C_DAMP 47 µF 35 V aluminium (Panasonic EEE-FK1V470P). No other bulk sits ahead of L_FILT.

- **VIN_MOD's capacitance:** 78.5 µF (module) + 22.1 µF (U_PRAIL's 2 × 10 µF + 100 nF at most) = **≤ 100.6 µF**, inside power-fail.md's 220 µF; another module may put up to 197.9 µF on VIN_MOD ([vin-mod.md §3][vm]).
- **Middlebrook criterion** (SNVA538: the filter's peak output impedance far below the converter's input impedance): the peak |ZOUT| is ≤ 0.80 Ω near 10 kHz over L ±20 %, C_BIN 6–10 µF effective, C_DAMP ±20 % and its ESR 0–0.36 Ω. The binding case is the 1.5× peak load at 7.32 V: |ZIN| = V² / P = 10.0 Ω, a ratio of **12.5×** (21.9 dB), which meets R-48's 10×.
- **Damping** (`POWER.md` §4.3, v1's derivation of the same network): SNVA538's parallel Rd–Cd network with n = Cd / C = 4.7–7.8 gives Rd,opt ≈ 0.38 Ω; the fitted 0.22 Ω plus C_DAMP's ESR up to 0.36 Ω gives a peak |ZOUT| of 0.50–0.86 Ω at 13–27 kHz (numerical evaluation of sL ∥ 1/(sC) ∥ (Rd + 1/(sCd))). **R_DAMP–C_DAMP must not be removed or replaced by a lower-resistance network**: removing it raises v1's hot-plug grid worst from 21.9 V to 24.0 V (`POWER.md` §4.4).

### 4.3 The switch-on and the 9 V dip

[FIG-QMSW-TJ](#fig-qmsw-tj) gives the switch-on junction temperature. On a 9 V supply 5 % low behind 0.185 Ω the module's peak during any ramp is 0.63 A, the supply carries at most 0.98 A, and VIN stays ≥ 8.368 V, 0.21 V over the trip maximum 8.159 V; the module could draw up to 1.58 A at the moment of peak inrush before VIN reached the trip ([vin-mod.md §4][vm]; [power-fail.md §7][pf]).

### 4.4 Ripple

What the carrier presents on VIN_MOD at 450–550 kHz ([R-51](decisions.md#r-51) as restated under [R-53](decisions.md#r-53); [vin-mod.md §5][vm]):
- U_PRAIL: **27.2 mV p-p** ([§6.4](#64-input-ripple-and-survival)).
- The module's own input ripple reflected back: 87 mV p-p at C_BIN (SLUSEA4D Eq. 23 at 892 mA, 6 µF, 450 kHz), through L_FILT (−20 %) into the carrier's 6.21 µF: **0.47 mV**.
- Total **27.7 mV**. **`permittedRippleMvPp` = 41.6 mV**, 1.5 × 27.7 rounded up (the platform's 1.5× allocation rule). R-51 records 1.5 × what the carrier presents rather than what the module tolerates, a tighter number.
- The module accepts it: the filter passes −47 dB at 450 kHz (L −20 %, C_BIN 6 µF), so 41.6 mV becomes 0.22 mV at the buck's input, about 1 % of 3V3_D's 20.7 mV even with no loop rejection.
- Not covered: adapter supply-frequency ripple (a regulated adapter is assumed; the buck's loop rejects low frequencies), and the beat between the two unsynchronised 450–550 kHz bucks, which can fall in the audio band at ≤ 0.22 mV at the buck input; the bring-up idle-versus-load spur comparison covers it (open items VIN-MOD-RIPPLE-MEASURE, LDO-PSRR-SPUR).

*Not in force:* `permittedRippleMvPp` 40.4 mV (R-51 as first written, with U_PRAIL at 26.4 mV), restated by R-53's R_MGP 160 Ω.

### 4.5 Hot plug at the module input

**Owner decision (`POWER.md` §4.4, "Decision (owner, 2026-10-02)", design-review gap G-S2): no input TVS**, "provided this analysis keeps the peak at the buck's VIN at or below about 28 V (87 % of its 32 V absolute maximum) for an 18 V hot plug". Its entry is [PW-NOTVS](decisions.md#pw-notvs); [POWER.md §4.4][pw] is its source. Had the peak exceeded 28 V, a bidirectional TVS before the input diode and a ≥ 50 V bulk capacitor would have been added. The split spec §5.6.1 requires the analysis re-run with the module branch and connector in the path, inside our module's survival rating and, on a Seed bench, inside 17 V. Module hot-plug (inserting or removing the module with power applied) is not supported.

**Method** ([vin-mod.md §6][vm]; `POWER.md` §4.4's model): an ideal voltage step (contact closure, bounce ignored, stiff source: a real supply's impedance only lowers the peak); cable 1 µH/m loop inductance (assumed) and 42 mΩ/m (18 AWG, both conductors); an optional ferrite 0–3 µH at 38 / 15 / 0 mΩ; Schottkys at 0.30 V + 0.03 Ω × I that block reverse current, so the first peak is held; zero-ESR ceramics; aluminium capacitors with ESR; RK4 time-domain integration at 50 ns over 0.6 ms. Validation: the re-run reproduces v1's figures (nominal 17.71 / 17.80 V, grid worst 19.59 / 21.89 V at 70 A, extreme corner 24.77 V) at 25 ns and at 50 ns. Grid: 1 / 2 m, ferrite 0 / 1 µH; VIN_A 25–55 µF ceramic and 320–480 µF aluminium at ESR 0.04–0.16 Ω per can; with Q_MSW conducting also U_PRAIL's 6.21–22.1 µF, C_BIN 6–10 µF and C_DAMP ESR 0.05–0.36 Ω. Six extreme corners at the low-capacitance, low-ESR ends (0.5 m with 2 µH at 38 and 15 mΩ; 0.3 m with 3 µH; 0.5 m with no ferrite; the jack's steepest rise), and one at the high-capacitance end for D_AIN's I²t. A 144-point sweep with Q_MSW off and 1,152 with it on, at 18 V and 12 V, confirmed the extreme corners dominate every figure ([hotPlugSweep.ts][sweep], cited as history; not carried).

| 18 V | Grid | Extreme |
|---|---|---|
| Jack VIN (Q_MSW's VDS) | 18.45 V | **24.64 V** (62 % of 40 V) |
| VIN_A | 18.06 V | 23.91 V (TPS7A49 36 V, OPA1688 40 V, C_BULK 35 V) |
| Peak current; D_AIN I²t | 121 A; 0.71 A²s | 228 A; **1.52 A²s** (14.6 % of the 10.4 A²s IFSM half-sine) |
| Q_MSW fully on (bound): VIN_MOD at pin 39; module buck VIN | 18.28 V; 18.34 V | **26.23 V**; 25.76 V ≤ 28 V (238 A peak) |
| Re-plug (VIN_A at 17.7 V, VIN_MOD discharged, Q_MSW fully on) | | VIN_MOD 24.95 V; buck VIN 23.61 V |

| 12 V | Grid | Extreme |
|---|---|---|
| Jack VIN | 12.29 V | 16.39 V |
| Bound: VIN_MOD (a Seed's VIN) | 12.08 V | **17.34 V**, over a Seed's 17 V (hence [EC-SEED-BENCH](#ec-seed-bench)) |
| Re-plug: VIN_MOD | | 16.49 V |

#### FIG-HOTPLUG

**`hotPlugPeakV` = 26.3 V at pin 39** ([R-59](decisions.md#r-59)). Inputs and method: the hot-plug model above, at 18 V, at the extreme corners, with Q_MSW conducting from the first instant (a bound: at a plug-in from rest Q_MSW is held off, §4.6). Result: VIN_MOD at pin 39 peaks at 26.23 V, recorded as 26.3 V; the module buck's VIN after L_FILT peaks lower, at 25.76 V. Both are ≤ 28 V, the owner's no-TVS criterion. Pin-39 parts (the EN divider, any protection ahead of L_FILT) are rated against 26.3 V. Source: [vin-mod.md §6][vm]. Paper analysis of an unbuilt board.

#### FIG-SEED-HOTPLUG

**At a 9.45 V bench supply the hot-plug bound on VIN_MOD is 13.56 V, 3.4 V under a Seed's 17 V** ([R-59](decisions.md#r-59)). Inputs: the supply at 9 V + 5 % = 9.45 V; the hot-plug model and extreme corners above; Q_MSW conducting from the first instant. Method: the same integration as [FIG-HOTPLUG](#fig-hotplug), at 9.45 V, with the sweep re-checked to confirm the extremes dominate at that supply. Result: 13.56 V (12.89 V at 9.0 V); 17 − 13.56 = 3.44 V of margin. At 12.6 V the same bound is 17.34 V, over 17 V. Source: [vin-mod.md §6][vm]. Paper analysis of an unbuilt board; it supports [EC-SEED-BENCH](#ec-seed-bench).

### 4.6 Q_MSW at the plug-in edge, and a fast re-plug

**Without a hold, Q_MSW turns on at the plug-in edge.** The edge (≤ 1.86 V/µs at the jack) pulls charge Qc ≤ 21.3 nC through Q_MSW's Cgd, Q_MSWD's Coss and D_SS's Cd over a 24.3 V step (typical capacitances × 1.5), which onto Q_MSW's Cgs (2.36 nF typical) would give VSG ≈ 9.0 V ([vin-mod.md §6][vm]).

**The hold** ([R-49](decisions.md#r-49), a controller-delegated EE ruling, as amended in its fix round): C_GS 220 nF 50 V X7R 0805 (LCSC C5378) from the source to D_GS (BAS116H, C74210), R_GSB 470 kΩ (C23178) across C_GS. From a discharged C_GS, VSG ≤ VF(D_GS) + Qc / C_GS,min = 1.09 + 21.3 nC / 168.3 nF = **1.217 V**, 0.36 V under \|VGS(th)\| min at 85 °C (1.58 V). Three bounce edges inside τ reach 1.47 V, still under. Turn-on is slowed by (C_SS + C_GS) / C_SS = 1.10 in its pre-plateau only; turn-off keeps its ~100 µs because D_GS is then reverse-biased; on-state VSG ≥ 4.60 V.

*Not in force:* C_GS 100 nF and R_GSB 1.00 MΩ, before R-49's fix round.

**What the hold does not cover: a re-plug within about 0.44 s of an unplug that followed operation.** C_GS still holds up to 16.04 V and decays through R_GSB: τ × ln(16.04 / 0.36) = 0.435 s. Inside that window the edge can turn Q_MSW on ([R-59](decisions.md#r-59)):
- **Fully on:** VIN_MOD stays ≤ 26.3 V (re-plug runs 24.95 V) and the module buck's VIN ≤ 25.76 V, all ≤ 28 V.
- **Partly on:** a re-plug inside td finds Q_VDIS on, so R_VDIS 10 Ω loads VIN_MOD. Nothing drives Q_MSW's gate during td, so after an edge it relaxes through R_MSWT on Ciss (2550 pF typical × 1.5): τ = 58 µs from at most 17.26 V to 1.58 V (2.39 τ), plus the time R_MSWT takes to move Qgd (8.6 nC × 1.5) across the whole supply, 117 µs: a span of **≤ 255 µs**. Swept as a fixed current limit of 0.5–200 A at 18 V, at the six extreme corners, from rest and at an instant re-plug (108 runs), with Tj ≤ 85 °C + P̂ × Z(span) + E / C_pad and Z from AOD4185 Fig. 10's single-pulse power rating (read from the graph, × 1.2) up to 1 ms: the hottest case, a 5 A limit at an instant re-plug (87.4 W over 0.255 ms, 10.6 mJ), gives **Tj ≤ 129.4 °C**, under the 140 °C check line.
- **R_VDIS at a re-plug:** ≤ 61.2 W peak and 9.7 mJ over ≤ 0.26 ms, 24 % of the CRCW2010-HP single-pulse chart's ≥ 250 W at ≤ 0.3 ms (document 20043 p. 5, read from the graph).

*Not in force:* the re-plug bound of 122.5 °C over 0.91 ms (no R_VDIS, no span bound), before R-59.

### 4.7 A Daisy Seed on VIN_MOD

A Seed cannot be bounded from published data: the Rev7 and Seed3 regulators are unpublished; a Rev5's +3V3D is a TPS6217x with an illegible suffix; no revision publishes its VIN capacitance or start-up current ([vin-mod.md §7][vm]).

#### FIG-SEED-TJ

**A Seed at a 9.45 V bench supply would take Q_MSW to 137.7 °C in its switch-on path** ([R-58](decisions.md#r-58); [R-50](decisions.md#r-50)). Inputs: the Rev5 assumption (TI SLVSAT8E): the Seed's regulator draws from its UVLO, VUVLO falling minimum 2.6 V, and its input current is bounded only by the high-side current limit ILIMF ≤ 1.35 A (stated at 12 V and 25 °C only; the overshoot term of SLVSAT8E Eq. 2 needs an unpublished inductance); the full 220 µF of inrush; the supply at 9.45 V; Q_MSW's slow corner (\|VGS(th)\| max 3 V + 0.9 V overdrive + 0.1 V cold, C_SS +10 % × 1.15). Method: a flat 1.35 A drawn from 2.6 V upward, integrated over Q_MSW's ramp for P̂ and E, with Tj ≤ 85 °C + P̂ × ZθJC(T) + E / C_pad (§3.6). Result:

| Supply | Fast / slow Tj | Flat current that holds Tj ≤ 140 °C |
|---|---|---|
| 9.45 V | 111.6 / **137.7 °C** | **1.41 A**, 1.05× over ILIMF |
| 12.6 V | 127.9 / **147.3 °C** | 1.17 A, under ILIMF: fails the 140 °C check line (under 150 °C) |

So the 9 V bench is the only Seed bench that holds the check line, and with thin margin: the bring-up measurement of a Seed's VIN current comes before any Seed bench at the edge of 9 V + 5 % (open item SEED-VIN-SWITCH-ON). Source: [vin-mod.md §7][vm]. Paper analysis of an unbuilt board, on an assumed Seed.

## 5. The module's 3.3 V rail and 3V3_D (pin 38)

### 5.1 The module's 3V3 budget

Split spec §5.6.2 ("Module 3V3 regulator budget"): `POWER.md` §2.1's 1,029 mA (v1's whole 3V3_D) less the codec VDD (12 mA, now on the pedal), the relay coils (114 mA) and the LEDs (40 mA) is 863 mA. That still holds the pedal-side loads on pins 21 and 38 at their 3.3 V values (pots 1.98, expression reference 3.3, HW_REV 0.17, footswitch pull-ups 0.66: 6.11 mA); replacing them with the two contract limits (10 mA + 25 mA) gives 863 − 6.11 + 35 = **about 892 mA**. 1.5 × = 1.34 A against the TPS62933F's 3 A. The split spec asks for `POWER.md` §2.1 to be re-run on this basis; the S1 analyses use 892 mA throughout, and the re-run is open (MODULE-3V3-BUDGET).

The v1 rows the module keeps ([POWER.md §2.1][pw], maxima at the cited tables; v1 figures, now the module's):

| Load | Figure | Basis |
|---|---|---|
| H743 IDD, 480 MHz VOS0, all peripherals enabled, Tj = 105 °C | 550 mA | DS12110 Table 119, maximum column (Tables 120–121 lower). A build-up from the used peripherals gives 452 mA (390 mA all-off maximum at 105 °C + 257.7 µA/MHz × 240 MHz = 61.8 mA from Table 127, measured at 25 °C, so an estimate) |
| H743 I/O switching | 88.8 mA | DS12110 §7.3.6, ISW = VDD × fSW × CL with CL = 5 pF CIO + load pin + 3 pF trace (assumed): SDCLK 92.5 MHz, 22 address/control lines and 16 DQ at SDCLK/2, QSPI 60 MHz clock and 4 IO at 30 MHz. A bound with every line toggling every cycle |
| SDRAM | 180 mA | worst candidate IDD4, IS42S16320F-6 (ISSI Rev B1) at 166 MHz with outputs open; SDCLK here is 92.5 MHz |
| W25Q128JV | 25 mA | program/erase maximum (Revision F §9.4) |
| VDDA (ADC1) | 1.44 mA | DS12110 Table 174, worst row |
| VDD33USB | 10 mA allowance | DS12110 gives no separate figure (open item MODULE-3V3-BUDGET) |
| Pull-ups and dividers on the module | part of v1's 7.5 mA row | flash and SDRAM chip-select pull-ups, the buck feedback divider; the pots, expression reference, HW_REV and footswitch pull-ups move to the pedal (pins 21 and 38) |
| TLV803E supervisor | 1 µA | SLVSES2J §7.5 |

**Absolute maximum on the MCU supply pins:** DS12110 Table 110 limits ΣIVDD to 620 mA. The used-peripheral build-up with the LEDs switched by external MOSFETs gives 452 + 88.8 = 541 mA, a 79 mA margin. On the split the LEDs are on the pedal (3V3_P), switched by MOSFETs whose gates are module pins, so no LED current reaches the MCU's VDD pins. Firmware enables only the peripheral clocks it uses (a hardware dependency, [firmware-facing-requirements.md](firmware-facing-requirements.md)).

### 5.2 The module buck

`POWER.md` §3.3, carried to the module (split spec §6.1, §6.3); the part is a TPS62933F (TPS62933FDRLR, LCSC C5219272):
- **Why this part:** its 3.8–30 V operating range covers VIN_MOD at 18 V, so it *operates* at the survival condition, not merely survives; absolute maximum 32 V (SLUSEA4D §8.1, §8.3). The FCCM ("F") variant holds a constant switching frequency at every load (SLUSEA4D §9.4.5, "this mode can help avoid switching frequency drop into audible range") and has no spread spectrum, so its tone is fixed and easy to filter and identify.
- **Switching frequency 500 kHz, RT floating** (450–550 kHz). 1.2 MHz was rejected on v1 because the LDO behind the buck's input filter loses PSRR with frequency (SBVS121E Figure 14, typical, read from the graph: about 45–50 dB at 500 kHz, about 35 dB at 1.2 MHz). That is a v1 reason: on the split the LDO sits on VIN_A, behind D_AIN, and the module's reflected ripple on VIN_MOD is bounded at 0.47 mV (§4.4); the frequency is kept.
- **On and off times:** at 17.6 V, D = 0.193, tON = 350 ns, above the 70 ns minimum; at 8.5 V, tOFF = 1.09 µs, above 140 ns: no foldback over 8.5–17.6 V (v1's range; the split's VIN_MOD runs from 7.32 V, open item MODULE-BUCK-LOOP-STARTUP).
- **Inductor L_BUCK:** Würth 74439346047 (WE-XHMI 4.7 µH), ISAT(10 %) 6.5 A typical, above the high-side current limit maximum of 5.8 A as SLUSEA4D §10.2.2.7 advises; IR 7.4 A; RDC ≤ 14.3 mΩ. At v1's 1,029 mA the peak was 1.61 A and the ripple 0.87–1.17 A over 8.5–17.6 V (SLUSEA4D Eq. 15, 17); the module's 892 mA is lower.
- **Output:** 3 × 22 µF X5R 25 V 1206 (CL31A226KAHNNNE) for ≥ 40 µF effective at 3.4 V (an assumption, open item MLCC-DC-BIAS), plus 100 nF. Nominal ripple 7.3 mV p-p (Eq. 20: 1.17 A / (8 × 500 kHz × 40 µF)); the bound the contract records is 20.7 mV (§5.4).
- **Feedback:** 32.4 kΩ over 10.0 kΩ, 1 %, VREF 0.8 V: 0.8 × 4.24 = **3.392 V**, range **3.274–3.513 V** over VFB 784–816 mV and 1 % resistors. Inside the MCU's 3.6 V, the SDRAM's 3.0–3.6 V and the flash's 2.7–3.6 V. The setpoint is above SLUSEA4D Table 10-2's 3.3 V on purpose, for margin to the supervisor.
- **Soft start:** C_SS 33 nF: tSS = 33 nF × 0.8 V / 5.5 µA = 4.8 ms nominal; 3.66 ms at its fastest (§3.6). The SS pin must not float. The 0805 part `POWER.md` chose was out of stock and replaced by CL10B333KB8NNNC (C21117).
- **Bootstrap:** C_BST 100 nF ≥ 16 V X7R, with a 0 Ω R_BST footprint.
- **EN:** from VIN_MOD through R_UV1/R_UV2 (§4.1).

### 5.3 MCU reset, decoupling and junction temperature

**Reset** (`POWER.md` §5.1, on the module, [D14](decisions.md#d14) owner-approved): PDR_ON to VDD enables the internal POR/PDR, which alone would release reset at VDD ≈ 1.67 V + 377 µs, during the 3.3 V ramp. So a supervisor holds NRST: TLV803EA30DBZR, open drain (NRST is bidirectional), VIT− 3.08 V ± 2 % = 3.018–3.142 V, VIT+ maximum 3.189 V, delay 130–270 ms. Margins against the 3.274 V rail minimum: start-up 3.274 − 3.189 = **85 mV**; run-time dip headroom 3.274 − 3.142 = **132 mV** (load-step droop not computed: open item 3V3D-RAIL-MEASURE). NRST network: 10 kΩ pull-up (OSCAR's 4.7 kΩ changed), 100 nF to VSS, the reset button and the SWD NRST. **Layout:** the supervisor's VDD senses 3V3 at the MCU's VDD pins, not at the buck output. VDD's fall rate (≥ 10 µs/V required, DS12110 Table 115): v1's figure, about 0.9 A into about 80 µF, gives about 91 µs/V; the module's 3V3 may now carry up to 150 µF ([R-50](decisions.md#r-50)), which only slows the fall further at the same load, and the module's own figure is part of MODULE-BUCK-LOOP-STARTUP's re-derivation.

**Decoupling** (`POWER.md` §5.4, the module part; AN4938 §2.2, DS12110 Table 114, [D7](decisions.md#d7)): 100 nF at each of 14 VDD pins plus one ≥ 4.7 µF; VCAP1 and VCAP2 joined, 2.2 µF each, ESR < 100 mΩ, X7R; VDD33USB 100 nF + 1 µF; VBAT tied to VDD with 100 nF; VDDA from VDD through FB_VDDA (BLM21PG221SN1D, [D17](decisions.md#d17)) with a VDDA bank that must hold FB_VDDA's resonance at f0 ≤ 158.0 kHz, a nominal X7R bank of at least 10.1 µF with this bead ([R-57](decisions.md#r-57); [analog.md](analog.md) [EC-VDDA-WIDEBAND](analog.md#ec-vdda-wideband); open item VDDA-WIDEBAND); VREF+ tied to VDDA; VSSA to VSS through a 0 Ω link; PDR_ON to VDD; SDRAM 100 nF on each of 7 VDD/VDDQ pins; flash 100 nF; the supervisor 100 nF at its VDD.

*Not in force:* OSCAR's VDDA bank (2 × 100 nF + 2 × 2.2 µF) as the module's bank; [R-57](decisions.md#r-57) finds it gives 2.13 mV rms at pin 21, over 806 µV, and requires the change above.

**MCU junction temperature** (owner decision [PW-TJ](decisions.md#pw-tj), unchanged by the split; the thermal copper moves to module layout, [OWN-06](decisions.md#own-06)): keep 480 MHz at VOS0, where TJ must stay ≤ 105 °C (DS12110 Table 113). With θJA 43.0 °C/W (Table 222, JEDEC board) and P = IDD × 3.392 V, the ambient that just reaches 105 °C is **34.7 °C** for the used-peripheral build-up with 30 mA of I/O (an estimate: 482 mA, 1.635 W, 70.3 °C rise), 26.1 °C with the full 88.8 mA I/O bound, 20.4 °C with every peripheral enabled. The owner chose thermal copper under and around the LQFP-176 (an unbroken L2 GND plane, an L1 pour inside the lead ring stitched on about a 1 mm via pitch, each VSS on its own via, L4 pour where routing allows), a bring-up measurement of the die temperature from the internal sensor in the closed enclosure under DSP load (open item MCU-TJ-MEASURE), and a firmware fallback to 400 MHz at VOS1 (TJ limit 125 °C, ambient up to **57 °C** by the same method: 466 mA, 1.579 W, 67.9 °C rise) if the sensor reads ≥ 95 °C, once the VOS1 clock configuration is validated. TA ≤ 57 °C is the platform's processor-limited envelope that self-heating claims are evaluated against ([R-20](decisions.md#r-20)).

### 5.4 Pin 38: what the pedal may draw from 3V3_D

The limit is **25 mA continuous**, all pedal-board loads together, so declared loads × 1.5 ≤ 25 mA, ≤ 16.67 mA ([architecture.md](architecture.md) §4.7). The declared loads, at their 1 % worst case and the 3.513 V rail maximum ([R-23](decisions.md#r-23) as amended by [R-28](decisions.md#r-28); [3v3-d.md §4][d3]):

| Role | mA | Basis |
|---|---|---|
| footswitch-pullup | 0.71 | 2 × 3.513 V / 9.9 kΩ |
| control-button-pullup | 1.94 | 6 × 3.513 V / 10.89 kΩ (R_PUn 10.0 kΩ + R_BTNn 1.00 kΩ at −1 %) |
| i2c-pullup | 2.96 | both lines held low: 2 × 3.513 V / 2.376 kΩ |
| sai-isolation-module-side | 2.15 | the module-side SAI buffer ([architecture.md](architecture.md) §4.8) |
| usb-isolation-switch | 0.39 | the USB switch and its enable pull-up ([R-14](decisions.md#r-14)) |
| midi-header-supply | 2.00 | MIDI IN receiver only (an allocation a cited part meets: TI ISOM8710, ICC ≤ 2 mA) |
| midi-out-driver | 0.21 | U_MIDIDRV SN74LVC1G07 ICC ≤ 10 µA + R_TXPU 18.0 kΩ while TX is low, 3.513 V / 17.82 kΩ |
| i2c-device | 6.30 | four expansion devices together (an allocation) |
| **Total** | **16.66** | × 1.5 = **24.99 mA ≤ 25 mA** |

**Why MIDI OUT is not on pin 38** ([R-23](decisions.md#r-23), "confirmed 2026-10-06 (controller ruling)"): CA-033's 3.3 V MIDI OUT loop draws up to 8.46 mA ((3.513 − 1.4) V / 249.85 Ω), 1.94 mA over what was left with no I²C device at all, and 112 mA into a shorted cable. A load on a shortable cable belongs on the carrier's own supply, so the loop runs on 3V3_P (§6), and only the open-drain driver's supply is on 3V3_D.

*Not in force:* the split spec §5.6.2's pre-analysis pin-38 budget (I²C pull-ups ≤ 6.0 mA, button pull-ups 1.92 mA nominal, 8.1 mA remainder), and `midi-out-driver` 0.01 mA with `i2c-device` 6.5 mA, before R-28.

**The I²C expansion bus** ([R-21](decisions.md#r-21); [3v3-d.md §1][d3]): Fast-mode 400 kHz. Bus capacitance 136 pF per line (four devices × 10 pF, the module pin 10 pF, the pedal's own device 10 pF, socket and header 2 pF each as allowances, 40 cm of wiring at 1.8 pF/cm: an allowance, since no per-length figure was stated). Pull-up window 1.3–2.60 kΩ: R_max = 300 ns / (0.8473 × 136 pF) = 2.60 kΩ; the floor is the onboard-pull tolerance's 1.3 kΩ, above R_min = (3.513 − 0.4) V / 3 mA = 1.04 kΩ. **2.40 kΩ ±1 %** (Uniroyal 0603WAF2401T5E, C22940) on the pedal only: rise 279 ns, sink 1.48 mA per line. At most four expansion devices and 40 cm of bus wiring, or the board buffers the bus; expansion boards fit no pull-ups; any ESD or TVS part on SDA/SCL counts toward the bus capacitance at its maximum.

**Footswitch inputs** ([R-22](decisions.md#r-22); [3v3-d.md §2][d3]): 10.0 kΩ pull-up to 3V3_D at the switch node, 100 nF at the node, and **1.20 kΩ ±1 %** (C22765) from the node to the pin on both footswitches, so a Daisy bootloader driving CMD high into a closed switch sources ≤ 3.6 V / 1.188 kΩ = 3.03 mA ≤ 3.3 mA. Closed-switch level 0.14 V against VIL max − 0.2 V = 0.78 V. Release τ = 10.1 kΩ × 110 nF = 1.11 ms; firmware debounces in a 5 ms window (a decision, confirmed at bring-up against the fitted footswitch).

**Control-position buttons** ([3v3-d.md §3][d3]): R_PUn 10.0 kΩ to 3V3_D, R_BTNn 1.00 kΩ to GND, R_POSn 10.0 kΩ to the pin: pressed ≤ 0.34 V, released ≥ 3.269 V against VIH 2.29 V.

**Peak, external capacitance and ripple** ([R-24](decisions.md#r-24); [3v3-d.md §5][d3]):

| Contract value | Value | Basis |
|---|---|---|
| `maxExternalCapacitanceUf` | **10 µF** (a decision) | SLUSEA4D states no maximum output capacitance in a document in hand; 10 µF covers 100 nF at each load plus about 1 µF of bulk on each expansion board and the MIDI header board. Carried to the module's loop and start-up check with VREF_A's 4 µF (open item MODULE-BUCK-LOOP-STARTUP) |
| `maxPeakCurrentMa` | **26.3 mA** | declared 16.66 mA + charging the permitted 10 µF over the fastest soft start, 10 µF × 3.513 V / 3.66 ms = 9.61 mA; an upper bound (full-voltage loads during the ramp) |
| `rippleMvPp` | **20.7 mV p-p** (bound) | SLUSEA4D Eq. 15 at VIN 17.6 V, VOUT 3.513 V, L 4.7 µH −20 %, fSW 450 kHz: ΔIL = 1.66 A. Capacitive term (Eq. 20) into 40 µF × 0.9 × 0.85 = 15.1 mV; ESR term (Eq. 19) at 10 mΩ per part, three in parallel (an allowance), 5.5 mV; their sum is an upper bound |

That ripple reaches pin 21 through FB_VDDA and the VDDA bank. On ruling [R-57](decisions.md#r-57)'s ceramic basis the module's present bank passes 2.13 mV rms of it, over VREF_A's 806 µV wideband requirement, so the module's VDDA network must change to meet f0 ≤ 158.0 kHz (open items 3V3D-RIPPLE-INTO-VREF-A and VDDA-WIDEBAND; the requirement is [analog.md](analog.md#ec-vdda-wideband)).

*Not in force:* the S1 estimate of 0.745 mV rms at pin 21, "a 7.6 % margin that the module design must keep" (the VDDA bank at −10 % only), withdrawn as a bound by [R-57](decisions.md#r-57).

## 6. The pedal digital rail 3V3_P

3V3_P feeds the two bypass relay coils, the two LEDs and the MIDI OUT loop, never from pin 38 and never from VIN_A (split spec §7.5; [R-25](decisions.md#r-25) to [R-27](decisions.md#r-27), amended by [R-53](decisions.md#r-53); [pedal-digital-rail.md][pdr]).

### 6.1 The rail

**U_PRAIL**, a TPS62933F with the module buck's network copied: **3.392 V nominal, 3.274–3.513 V**, on VIN_MOD, RT floating, EN as [EC-QPEN-RESET](#ec-qpen-reset).

| Load at 3.513 V | mA | Basis |
|---|---|---|
| Relay coils (G6K-2F-Y DC3, two) | 113.6 | 3.513 V / (91 Ω × 0.9 × 0.755) = 56.8 mA each: −10 % tolerance, then cold −40 °C (`BYPASS-RELAY.md` §3.2) |
| LEDs | 40.0 | 2 × 20 mA cap; the fitted 100 Ω gives 19.3 mA each |
| MIDI OUT loop | 8.46 | CA-033's 3.3 V network, all −5 %, VF 1.4 V |
| Q_MIDI gate pull-up | 22.18 | R_MGP 160 Ω −1 % while a 0 bit is sent |
| **Normal total** | **184.3** | × 1.5 = **276 mA** against 3 A |
| Faulted total, MIDI pin 4 shorted to ground | 287.9 | the loop's 8.46 mA replaced by 112.1 mA |

**Coils at the rail minimum:** 3.274 V − 113.6 mA × 68.8 mΩ (AO3400A at VGS 2.5 V, scaled to the hot corner by its own 125 °C row) = 3.2662 V against the must-operate hot bound 3.178 V (the coil's 2.4 V must-operate voltage scaled for copper resistance to an 85 °C coil, 2.978 V, plus the plan's 0.2 V guard): **margin 0.088 V**. Maximum 3.513 V is 78 % of the 4.5 V limit. The 85 °C is the coil's temperature, 70 °C ambient plus self-heating, so the relay claim holds to **70 °C ambient**, the relay's own rating, below R-20's 85 °C. A 5 V-class rail cannot feed the 4.5 V-maximum DC3 coil, so the rail stays 3.3 V class.

*Not in force:* the coil margin 0.091 V at a 25 °C AO3400A resistance, before R-53.

### 6.2 Why switching, and its loss

A linear LM317 at 17.55 V in and the rail minimum would dissipate (17.55 − 3.274) V × 184.3 mA + 17.55 V × 0.1 mA = **2.63 W**: a 157 °C rise at RθJA 59.6 °C/W, Tj 207 °C at 50 °C ambient. Rejected. The TPS62933F: FCCM loss taken as **0.35 W**, an allowance ([R-27](decisions.md#r-27): SLUSEA4D gives FCCM efficiency only at 5 V out, Figure 8-22, about 0.28–0.29 W at light load from 24 V, + 20 %); Tj at 85 °C ambient = 85 + 0.35 × 60.2 °C/W (EVM) = **106 °C** (124 °C with JEDEC 112.2 °C/W), both ≤ 140 °C. Input power at the faulted load: 3.513 V × 287.9 mA + 0.35 W = **1.361 W** (1.00 W normal).

### 6.3 LEDs and the MIDI OUT switch

**LED resistors 100 Ω** ([R-27](decisions.md#r-27)): the WP7113ID publishes no minimum VF, so 1.6 V is an allowance (`SCHEMATIC-CHECKLIST.md` CTL-06's floor, below the typical's 85 °C value and the 617 nm photon energy); R ≥ (3.513 − 1.6) V / (20 mA × 0.99) = 96.6 Ω, so the smallest E24 value is 100 Ω (C22775): 19.3 mA, under 20 mA and the 30 mA absolute maximum.

**MIDI OUT** ([R-26](decisions.md#r-26), [R-53](decisions.md#r-53)): Q_MIDI (AOS AO3401A, C15127), a high-side P-MOSFET with its source on 3V3_P, its drain to RA (four 130 Ω ±1 % 1206 in parallel, C17914) and then MIDI pin 4; pin 5 through RC 10 Ω ±1 % 1206 (C17903) to GND. Its gate is pulled up to 3V3_P by R_MGP 160 Ω ±1 % 1206 (C17919) and pulled low by U_MIDIDRV's open-drain output (SN74LVC1G07 on 3V3_D, driven by MIDI_UART_TX). A shorted cable (112.1 mA pin 4 to ground, 86.0 mA pin 4 to pin 5) flows through Q_MIDI and the resistors, never through U_MIDIDRV, which sinks only 22.18 mA in every fault (within its 24 mA VOL row). Q_MIDI takes at most V² / 4R = 98 mW; each RA part 95.9 mW of 250 mW in fault (a). Turn-off bound at the hot threshold (\|VGS(th)\| 0.26 V at 85 °C, a −4 mV/K allowance; typical capacitances × 1.25): **1.89 µs ≤ 2 µs**, CA-033's edge figure.

*Not in force:* R_MGP 1.00 kΩ, then 270 Ω 0603 (turn-off 3.19 µs at the hot threshold).

### 6.4 Input ripple and survival

U_PRAIL's ripple on VIN_MOD (`pedalRail.inputRippleMvPp`), SLUSEA4D Eq. 23 at the worst corner of each term: IOUT the faulted 287.9 mA (a cable fault can persist); CIN = 2 × 3.45 µF × 0.9 = 6.21 µF (3.45 µF is TI's figure at 24 V for its own example part, a TDK 10 µF 50 V 1206, used as an allowance for the fitted Samsung CL31B106KBHNNNE until its DC-bias curve is read: open item MLCC-DC-BIAS); fSW 450 kHz; ESR 10 mΩ per part, two in parallel. Result 25.75 + 1.44 = **27.2 mV p-p**. Survival: VIN 17.55 V against 32 V absolute maximum (55 %); the input capacitors are 50 V parts; everything else sits on 3V3_P at ≤ 3.513 V.

*Not in force:* 26.4 mV with R_MGP 270 Ω, and 25.5 mV before R-26's fix round.

## 7. 5V_A and the analog branch

On the pedal, on VIN_A (split spec §7.3, §7.4; `POWER.md` §3.4, §3.5).

- **U_LDO, TPS7A4901DGNR (C16430):** input absolute maximum 36 V, operating 3–35 V, so it also operates at 18 V. Dropout ≤ 600 mV at 150 mA. Feedback 32.4 kΩ over 10.0 kΩ with VFB 1.185 V: **5.024 V**. CNR/SS 10 nF (tSS 14 ms), CFF 10 nF, CIN 10 µF 50 V, COUT 10 µF (≥ 2.2 µF minimum, ESR < 200 mΩ). EN tied to IN. PSRR "≥ 52 dB (10 Hz to 400 kHz)" in the features list; about 45–50 dB at 500 kHz read from Figure 14 (typical, open item LDO-PSRR-SPUR).
- **Headroom:** VIN_A 8.615 V at 9.00 V cold (§3.1) against 5.024 + 0.6 = 5.62 V needed.
- **5V_A load on the split pedal: 60.75 mA** = v1's 43.6 mA (codec VCC 36 mA, ADC drivers 4 + 1 mA, VBIAS dividers 2.51 mA, LDO feedback 0.12 mA, the supervisor 0.006 mA) + the codec domain's 17.15 mA (codec VDD through U_CVDD, its oscillator, the codec-side SAI isolation; with R_CRST 4.70 kΩ). Codec VDD comes from U_CVDD, a TPS7A2433 on 5V_A, so VDD can never exceed VCC while 5V_A rises and regulates ([D22](decisions.md#d22), [R-30](decisions.md#r-30)); the detail is in [analog.md](analog.md).
- **LDO dissipation** (`POWER.md` §4.2, dated note for the split; [R-32](decisions.md#r-32)): P = (VIN − 5.024 V) × 60.75 mA + VIN × 0.8 mA (IGND typical), VIN taken at the jack (conservative), RθJA 63.4 °C/W:

| VIN | P | ΔTJ | TJ at TA = 50 °C | Highest TA for TJ ≤ 125 °C | for TJ ≤ 115 °C |
|---|---|---|---|---|---|
| 12 V (operating maximum) | 0.433 W | 27.5 °C | 78 °C | 97 °C | 87 °C |
| 18 V (survival) | 0.803 W | 50.9 °C | 101 °C | **74 °C** | 64 °C |

  Both limits lie above the 57 °C envelope ([R-32](decisions.md#r-32)), so no operating condition is removed.

  *Not in force:* `POWER.md` §4.2's v1 table at 43.6 mA, which held 125 °C at 18 V to 88 °C ambient.

- **VMID** (`POWER.md` §3.5, revised by `ANALOG.md` §4): a 2 × 100 kΩ divider, 0.1 %, 25 ppm/°C, from VIN_A to GND with a 10 µF 50 V X7R at the node (corner 0.32 Hz), buffered per channel by an OPA1688 unity-gain follower fed through 10 kΩ, with no output capacitor and no isolation resistor. VMID = VIN_A / 2. The op-amp stages and their headroom are in [analog.md](analog.md).
- **5V_A has no ferrite.** An 0805 0 Ω position, R_5VA, fitted in series between the LDO output and the codec VCC decoupling, is a bring-up option for a ferrite if the spur measurement implicates 5V_A (`POWER.md` §7.3). The split pedal keeps it: split spec §9.3 sends PWR-15 to the pedal unchanged, and [codec-domain.md §1](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/codec-domain.md) has the codec's VCC net `5V_A_CODEC` joined to 5V_A by "v1's R_5VA, 0 Ω" ([analog.md](analog.md) §13.1).

## 8. 18 V survival, by board

The condition (owner, [PS-18V](decisions.md#ps-18v)): 18 V continuous at the jack; every part inside its absolute maximum with derating; correct audio not required. Nothing above 18 V steady is claimed. `POWER.md` §4.1's table is v1's, taken at VIN_PROT 17.6 V; the rows below are carried to the board each part now sits on, at the same figures, with the split's additions.

| Part | Board | Stress | Rating | Basis |
|---|---|---|---|---|
| D_AIN, D_MIN (PMEG4030ER) | pedal | 18 V reversed; forward ≤ 0.24 W (v1's worst, 0.543 A at 9 V) | VR 40 V; Rth(j-a) 130 K/W with a 1 cm² cathode pad (220 K/W standard) | 45 % of VR; ΔTj 31 °C. **Layout: a 1 cm² cathode pad** |
| Input HF capacitor 100 nF 50 V X7R | pedal | 17.6 V DC; hot-plug ring ≤ 2 × 18 V | 50 V | 35 % DC |
| Input ferrite BLM31KN601SN1L | pedal (place an S2 choice) | ≤ 0.543 A | 2.9 A at 85 °C | 19 %; no pulse rating published (open item HOT-PLUG-PEAK) |
| C_BULK..C_BULK4 100 µF 35 V Al | pedal | 17.6 V DC | 35 V | 50 % |
| X7R 10 µF 50 V on VIN_A | pedal | 17.6 V | 50 V | 35 % |
| U_LDO TPS7A49 | pedal | VIN 17.6 V | 36 V | 49 %; Tj in §7 |
| OPA1688 on VIN_A (3 packages) | pedal | VS 17.6 V; 88 mW per package | 40 V (36 V recommended) | 44 %; ΔTJ 10 °C at 116.1 °C/W |
| U_PRAIL TPS62933F | pedal | 17.55 V | 32 V | 55 %; §6 |
| Power-entry parts of §3 | pedal | §3.7 | | [power-fail.md §8][pf] |
| L_FILT 74404054047 | module | the module's input current, 449 mA steady, 674 mA peak (§4) | IR 3 A, ISAT 3.8 A | v1 took 481 mA through it (`POWER.md` §4.1) |
| C_BIN1/2, C_BINHF (50 V) | module | 18 V DC | 50 V | 36 % |
| C_DAMP 47 µF 35 V Al + R_DAMP 0.22 Ω | module | 18 V DC | 35 V; 240 mA ripple | 51 %; R_DAMP ≈ 0.2 mW (v1 figure) |
| U_BUCK TPS62933F | module | VIN 18 V; loss 0.62 W (the full-load loss the S1 switch-on model takes, §3.6; v1's figure at 3.49 W output and η 0.85, `POWER.md` §4.1) | 32 V; operates to 30 V; TJ ≤ 150 °C | 56 %; ΔTJ = 0.62 × 60.2 °C/W (EVM) = 37 °C, TJ 87 °C at 50 °C ambient (119 °C with JEDEC 112.2 °C/W, which SLUSEA4D says not to design with) |
| Pin-39 parts on the module | module | hot plug 26.3 V | | rated against 26.3 V ([R-59](decisions.md#r-59)) |

The module-row percentages at 18 V are 18 / 50 = 36 %, 18 / 35 = 51 % and 18 / 32 = 56 % (VIN_MOD's survival value has no drop taken, [R-46](decisions.md#r-46)). Hot-plug peaks are in §4.5; they are transients, not continuous stresses.

**A recorded exception** (`POWER.md` §4.1 dated note; [R-30](decisions.md#r-30)): at power-down below about −5 °C, codec VDD can exceed VCC by up to 24 mV more than U_CVDD's VOUT ≤ VIN + 0.3 V rating, at its clamp's bounded 4.84 mA, only with the pass device off and the codec held in reset. It applies to that transient only ([analog.md](analog.md)).

## 9. Sequencing

- **Power-up** ([power-fail.md §8][pf]): VIN_A charges through D_AIN; U_PF holds PF_OK low until VIN passes the release, then for td (154–395 ms); meanwhile the module is off, the relay gate and codec RST are held, and VIN_MOD is discharged. Then Q_MSW ramps VIN_MOD and the module soft-starts; the module's own supervisor releases NRST 130–270 ms after its 3V3 is above 3.19 V. 3V3_P starts ≥ 230 ms after release ([EC-QPEN-RESET](#ec-qpen-reset)), after the slowest ramp. The relays stay in bypass throughout, until firmware runs the engage sequence.
- **Power-down:** at the trip, the relay gate and codec RST assert together; the module branch opens and is discharged, so the module's 3V3 collapses while the codec domain, on the reservoir, is still up; the SAI isolation keeps every crossing inside IF-PD-1 ([architecture.md](architecture.md) §4.8). While the TPS7A49 conducts (VIN_A ≥ 3 V), 5V_A follows VIN_A in dropout at ≤ 0.232 V/ms; below that, its fall and the codec clamp's current are not bounded (open item POWER-FAIL-SEQUENCE-CHECKS).
- **Below 5V_A ≈ 0.8 V:** U_PF's RESET is undefined, and U_PFINV is unspecified below 1.65 V, so Q_MSW could close early for 5V_A between about 0.65 V and 1.65 V. R_PFONPD holds PF_ON low when U_PFINV's outputs float, and the consequence is benign: RELAY_EN is high-impedance at boot, so the gate pull-down holds the relays, and the codec's local reset holds the codec.
- **Codec VCC before VDD:** met on the pedal by deriving VDD from 5V_A (§7), not by the module buck's EN.
- **USB plugged in with no DC input:** VBUS powers nothing. VBUS sense is on PA1 through a divider that keeps the pin ≤ 3.6 V at the maximum VBUS (split spec §5.6.5; [architecture.md](architecture.md) §4.8).

*Not in force:* `POWER.md` §5.2's VBUS-sense constraint for PA9 (ratio ≤ 0.76, PA9 ≤ 4.0 V with VDD = 0), replaced by the PA1 divider (split spec §9.3, USB-03 re-derived); and `POWER.md` §5.3's codec reset from an MCU pin ([D4](decisions.md#d4), withdrawn; [D21](decisions.md#d21)).

## 10. Ground and return paths

`POWER.md` §7, written for one board. Its decision applies to both boards; its placement zones are **pre-split** and are restated here by board. One GND net per board ([D18](decisions.md#d18)); the pedal joins interface pins 20 and 40.

- **One continuous ground plane, partitioned by placement.** The PCM3060's AGND1, AGND2, SGND and DGND "should be connected directly to each other under the parts" (SLAS533B), so a split plane would join under the codec anyway and force every return crossing it through one bridge. The TPS62933 needs only a short, wide input loop (SLUSEA4D §12.1). AN4938 §9.1 asks for a GND plane beside every high-speed signal layer (a 4-layer minimum, L2 GND), and the 92.5 MHz SDRAM and 60 MHz QSPI need an unbroken reference. L2 is a solid, unsplit GND plane; noise separation comes from placement.
- **Module (from v1's zones P and D):** the buck's input loop (C_BIN1, C_BIN2, C_BINHF → VIN → GND) on the top layer, capacitors close, several GND vias at their pads; the SW node short and wide; the feedback divider at FB, away from SW, with its own VOUT sense; the buck on the side away from anything analog; the SDRAM beside the FMC pins (≤ 120 mm); the supervisor sensing 3V3 at the MCU's VDD pins; FB_VDDA at the VDDA pin with its bank on the MCU side; the MCU thermal copper (§5.3).
- **Pedal (from v1's zones P and A, and the jack rule):** the LDO at the analog side, near the codec, fed from VIN_A; the codec straddling the digital/analog boundary with pins 1–14 toward the digital side; **no switching digital trace (of v1's list, those on the pedal: SAI, USB, LED PWM, MIDI UART) crosses the analog zone on any layer**; the codec's VCC and VCOM capacitors returned to AGND and its VDD capacitors to DGND, each with a via at the pad. External ground current from a daisy-chain supply flows between the audio jacks and the DC jack, so the DC jack is placed so that path does not run under the codec's analog half or the input stage; the DC jack's sleeve is +V (centre negative), so it is plastic-bodied or isolated from the enclosure. Where U_PRAIL and Q_MSW sit relative to the analog zone is an S2 placement; U_PRAIL's input loop follows the module buck's rules.
- **Chassis bond** ([PW-CHASSIS](decisions.md#pw-chassis); `POWER.md` §7.2: "Decided (2026-10-04, A2 Task 8 controller ruling; best practice, owner may override)"): the die-cast enclosure bonds to GND at one point, a ground lug with a star washer under one audio-jack nut, wired to a dedicated GND solder pad near the DC jack (plated through-hole, Ø2.5 mm pad, 1.2 mm drill); powder coat is masked or scraped under the lug, and continuity is checked after coating. The NMJ6HCD2 jacks' polyamide shells give no bond. The USB shell stays on 1 MΩ ∥ 4.7 nF.

## 11. What did not cross

- `POWER.md`'s designator map and its v1 schematic references (C39, U5 and the like): the v1 schematic is not an authority.
- `POWER.md` §9's stock table: dated observations of 2026-10-01; availability is decided at the PCBWay quote ([OWN-07](decisions.md#own-07)). The S1 analyses' own stock flags are open item POWER-PARTS-STOCK.
- The calculators, tests and sweep scripts behind the S1 figures (`vinModSummary.ts`, `hotPlugSweep.ts`, `powerFailSummary.ts` and their tests): no code crosses. Each figure above carries its inputs and method so phase 2 can re-derive it against this repository's model.
- v1's hot-plug figures (`POWER.md` §4.4) are carried only as the validation the split re-run reproduced (§4.5).

## 12. Open items this document raises

In [open-items.md](open-items.md): MODULE-3V3-BUDGET, MLCC-DC-BIAS, TPS62933F-EFFICIENCY, LDO-PSRR-SPUR, PMEG4030ER-TYPICALS, HOT-PLUG-PEAK, SCHOTTKY-ALTERNATE-UNQUALIFIED, MCU-TJ-MEASURE, 3V3D-RAIL-MEASURE, MODULE-POWER-PARTS-TO-MODEL, MODULE-BUCK-LOOP-STARTUP, PEDAL-POWER-PARTS-TO-MODEL, QMSW-SWITCH-ON-CHECK, QMSW-GATE-HOLD-REPLUG, QMSW-POUR-LAYOUT, QPEN-RERELEASE, SUPPLY-RATING-MEASURE, POWER-FAIL-SEQUENCE-CHECKS, VIN-MOD-RIPPLE-MEASURE, 3V3P-RAIL-MEASURE, MIDI-OUT-BRINGUP, POWER-PARTS-STOCK, MIDI-IN-RECEIVER-STOCK, FIRMWARE-POWER-OBLIGATIONS, I2C-RISE-AND-DEBOUNCE, 3V3D-RIPPLE-INTO-VREF-A. It also relies on rows other documents raised: SEED-VIN-SWITCH-ON, POWER-FAIL-REPLACEMENT-MEASURE, ANALOG-HEADROOM-9V, SEED-PIN38-PIN21-LOAD.

[pw]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/POWER.md
[vm]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/vin-mod.md
[d3]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/3v3-d.md
[pdr]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/pedal-digital-rail.md
[pf]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/power-fail.md
[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
[ledger]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-05-h7-split-rulings.md
[vms]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/circuit/analysis/vinModSummary.ts
[sweep]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/circuit/analysis/hotPlugSweep.ts
