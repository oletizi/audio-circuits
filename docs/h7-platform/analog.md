# h7-platform analog

Ported from:
- [h7-platform/ANALOG.md][an]: the full-scale paragraph, the designator map (not carried, see below), "Owner decisions (resolved)", §0 to §13
- [h7-platform/interface-analysis/vref-a.md][vref]: §0 to §5 (VREF_A, pin 21)
- [h7-platform/interface-analysis/codec-domain.md][cd]: §0 to §7 (the codec's VDD regulator, oscillator and local reset)
- [h7-platform/interface-analysis/crossings.md][cx]: §0, §1 (SAI timing), §3 (codec-side series resistors), §4's VBUS hot-plug paragraph and §8's VBUS-HOTPLUG carry; the rest of that note (the crossing table, the onboard-pull tolerances, the gates, USB) is carried in [architecture.md](architecture.md) §4.8 and §4.9
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §5.5, §5.6.3, §5.6.5, §7.1 to §7.3, §9 (the amendments to `ANALOG.md`)
- [2026-10-05-h7-split-rulings.md][ledger] (the S1 rulings ledger): R-15, R-57, and the entries linked below through [decisions.md](decisions.md)

This document describes the analog side of the STM32H743 digital pedal platform (h7-platform) after the split into a processor module (h7-module) and an audio pedal board (h7-pedal): the audio input and output stages and their headroom, the VMID and bias references, the expression input, the hardware-revision strap and the control positions, the ADC reference rail VREF_A on interface pin 21, the PCM3060 codec's own supply domain, and the crossings between the codec domain and the module. It records the design as it stood in the pedals repository at commit `5b926d0`. Nothing here has been built, modelled or drawn in this repository.

**Every figure in this document is paper analysis of a board that has not been built.** Each figure states its inputs and its method beside it, and links the pedals analysis it came from. Temperature-dependent part figures are claimed from −20 °C to 85 °C ([R-20](decisions.md#r-20)) unless a row says otherwise. Where a figure is arithmetic of this document's own (a check or a reconstruction of a method the source does not spell out), it says so.

Decisions are linked by anchor into [decisions.md](decisions.md). An owner decision is labelled "owner"; everything else there is a controller ruling, which the owner may override. Open items are rows in [open-items.md](open-items.md), named here by their Id. The supplies these stages run on (VIN_A, 5V_A, 3V3_D) are in [power.md](power.md); the interface rules for pin 21 and the full crossing table are in [architecture.md](architecture.md) §4.7 and §4.8; the bypass relays and their timing are in [bypass-relay.md](bypass-relay.md).

## How the pre-split analog note is carried

`ANALOG.md` was written for the one-board design (v1). Its text uses pre-split names and it opens with a map from its own part names to the v1 schematic's reference designators. **That designator map is not carried**: the v1 schematic is not an authority, and parts here are named by their design labels (U_IN, R_RF, C_IN and so on). The split spec states that the input stages, output stages and jack ESD come across with "Supply net renamed to the analog branch rail; circuits unchanged" (§7.1), and §9 amends the rest. This document applies those amendments. Where a figure below is v1's and has no split re-derivation, it says "v1 figure".

| Pre-split name (`ANALOG.md`) | After the split | Where |
|---|---|---|
| VIN_PROT, the rail of the VMID followers, input followers and output stages | **VIN_A**, the held-up analog branch ([power.md](power.md) §3; [R-35](decisions.md#r-35)) | pedal |
| VDDA = VREF+, feeding the pots, the expression ring, U_EXP and HW_REV | **VREF_A**, interface pin 21, the module's VDDA after FB_VDDA and the VDDA bank ([D16, D19](decisions.md#d19), owner-approved, as revised by split spec §9.4) | pedal loads; FB_VDDA and the bank on the module |
| PINMAP pins: pots PA0, PA1, PA2, PA3, PA5, PA6; EXPR_TIP PB0; EXPR_DETECT PG12; HW_REV PA4 | Contract pins: POS1 to POS6 on pins 22 to 27; EXPR_TIP pin 28 (PC4); HW_REV pin 29 (PA5); EXPR_DETECT pin 30 (PA4) ([architecture.md](architecture.md) §4.3) | interface |
| Six pots and the toggles | Six control positions, each a pot or a button per effect ([O-18](decisions.md#o-18), owner) | pedal |
| PCM3060 VDD from 3V3_D; RST from an MCU pin; SCKI from the MCU | VDD from U_CVDD on 5V_A ([D22](decisions.md#d22)); a local reset ([D21](decisions.md#d21)); SCKI from a 12.288 MHz oscillator with the codec as clock master ([D20](decisions.md#d20)); all owner-approved, split spec §9.4 | pedal |
| Relay coils and Q_BYP on 3V3_D; the power-fail shed of the buck | Coils on the pedal digital rail 3V3_P ([R-25](decisions.md#r-25)); the supervisor drops the relays directly ([R-37](decisions.md#r-37)) | pedal; [bypass-relay.md](bypass-relay.md) |
| R_REF 1.00 kΩ from VDDA to the ring | R_REF 3.30 kΩ behind a blocking ideal diode ([EC-RING-REFERENCE](#ec-ring-reference)) | pedal |

*Not in force:* `ANALOG.md` §7's power-fail shed ("the power-fail shed stops the buck at VIN_PROT ≈ 7.45 V and the output relay opens before the output stage moves ... the 12 V worst-case stack misses by 0.2 ms"), replaced by the split spec §7.4 circuit, which the owner directed ([O-6](decisions.md#o-6)); the split's relay margins are in [power.md](power.md) §3.4.

*Not in force:* `ANALOG.md` §8.1 and §8.2's v1 expression ring (R_REF 1.00 kΩ straight from VDDA, ring short 3.3 mA, back-feed of 1.7 mA at +5 V and 8.7 mA at +12 V into VDDA through FB_VDDA), replaced on the split pedal by [R-17](decisions.md#r-17) and [R-19](decisions.md#r-19); `ANALOG.md` §8.1 itself carries the dated note saying so.

## 1. Effective constraints

### EC-CONTROL-NOISE-BAND

**The control band, the band in which VREF_A's permitted noise is set, is 0–421 Hz.** It is the widest corner of the control-position RC filters at their low tolerances ([FIG-VREF-BAND](#fig-vref-band)). Inside it, the permitted noise at pin 21 is 1,123 µV rms ([FIG-VREF-1123](#fig-vref-1123)); above it, firmware's control smoothing must attenuate the residue.
- **Set by:** [R-15](decisions.md#r-15) (controller ruling; the 10-bit control resolution it rests on is a decision, not a sourced fact).
- **Amended by:** [R-57](decisions.md#r-57) (one ceramic basis: C_POSn at 100 nF × 0.9 × 0.85 × 0.5 = 38.25 nF; "the 1,123 µV rms level is unchanged").

*Not in force:* the control band 0–179 Hz with C_POSn at 90 nF (−10 % only), R-15 as first written, the split spec §5.6.3 note "permitted noise 1,123 µV rms in 0–179 Hz", and R-15's "Above 179 Hz the residue tends to 1".

### EC-VDDA-WIDEBAND

**Wideband noise at pin 21, up to the ADC's sampling bandwidth, must stay at or under 806 µV rms (LSB/4), a module requirement.** On R-57's ceramic basis the module's present FB_VDDA and VDDA bank give 2.13 mV rms, so the module must change: FB_VDDA's resonance must sit at **f0 ≤ 158.0 kHz**, that is L_min × C_bank,eff ≥ 1.015 µH·µF, a nominal X7R VDDA bank of at least 10.1 µF with the BLM21PG221SN1D, or a bead with more inductance ([FIG-VDDA-WIDEBAND](#fig-vdda-wideband); open item VDDA-WIDEBAND).
- **Set by:** [R-15](decisions.md#r-15), its fix-round-1 amendment (review M-1: VREF+ is sampled unfiltered, so wideband noise aliases into the band).
- **Amended by:** [R-57](decisions.md#r-57) (the hard S2 module requirement VDDA-WIDEBAND; "The 806 µV requirement (LSB/4, R-15) is not relaxed").

*Not in force:* the wideband estimate 0.745 mV rms at pin 21, "under 806 µV with 7.6 % margin" (bank at −10 % only, f0 ≤ 152.6 kHz), withdrawn as a bound by R-57; and the first estimate, about 0.2 mV rms from the buck's nominal 7.3 mV p-p at 500 kHz with f0 ≤ 153 kHz.

### EC-RING-REFERENCE

**The expression ring reference is R_REF 3.30 kΩ 1 % 1206 (Uniroyal 1206W4F3301T5E, C26032), fed from VREF_A through U_REFBLK, an LM66100 ideal diode held on by Q_REFEN (2N7002) through R_ENG 100 kΩ, with R_CE 100 kΩ on its CE; D_RCLAMP (PMEG4005AEA) from GND to the node between U_REFBLK's output and R_REF; and R_EXPIN 2.2 MΩ ahead of U_EXP's input** ([§9.6](#96-back-feed-from-the-expression-jack)).
- **Set by:** [R-17](decisions.md#r-17) (the blocking network), [R-19](decisions.md#r-19) (R_REF and the clamp).
- **Amended by:** their fix rounds (round 2 set R_REF to 3.30 kΩ; round 3 set R_CE to 100 kΩ and the 85 °C ceiling of [R-20](decisions.md#r-20)).

*Not in force:* R_REF 1.00 kΩ (v1, `ANALOG.md` §8.1), then 3.09 kΩ (S1 Task 11 fix round 1); R_CE 1.00 MΩ and CE tied straight to VOUT; R_EXPIN 1.00 MΩ; the 105 °C figures.

### EC-CODEC-RESET

**The codec's RST is held by U_CRST, a TI TLV803EA29DBZR on 3V3_CODEC, with R_CRST 4.70 kΩ ±1 % (Uniroyal 0603WAF4701T5E, C23162) from CODEC_RST_N to 3V3_CODEC, wired-OR with Q_PFR, an AO3400A whose drain is on CODEC_RST_N and whose gate is PF_TRIP from the inverter on the power-fail supervisor. v1's 10 kΩ pull-down R_RST_PD stays not fitted** ([§13.4](#134-local-reset)).
- **Set by:** [R-31](decisions.md#r-31) (the local reset), on the owner-approved [D21](decisions.md#d21).
- **Amended by:** [R-37](decisions.md#r-37) (the supervisor reaches RST through Q_PFR, not its own pin); [R-40](decisions.md#r-40) (R_CRST 4.70 kΩ; the dual inverter); [R-53](decisions.md#r-53) (R_RST_PD stays not fitted).

*Not in force:* R_CRST 10.0 kΩ (S1 Task 14 and split spec §7.3's note); the power-fail supervisor's open-drain RESET wired straight to CODEC_RST_N; the catalogue's TLV803EA30 for this reset; codec RST driven by the MCU ([D4](decisions.md#d4), withdrawn).

## 2. Levels and the analog-interface table

**Full scale** ([AN-D1](decisions.md#an-d1), owner, 2026-10-01: "option (b), 7.62 Vp-p into 10 kΩ"): the nominal full scale is **7.62 Vp-p into 10 kΩ** at the input and output jacks, the swing the OPA1688 produces inside its guaranteed-linear (AOL) region at the analog rail's cold minimum of 8.44 V. It replaced the original 8 Vp-p target, which needs 8.08 Vp-p at the op-amp and is reachable only at the clip limit. **Input impedance** ([AN-D2](decisions.md#an-d2), owner): "≥ 1 MΩ input" means resistive input impedance.

The codec full scales scale with VCC (SLAS533B Electrical Characteristics). With 5V_A at 5.024 V ([power.md](power.md) §7): ADC full scale 0.6 × 5.024 = **3.014 Vp-p**; DAC full scale (differential) 1.6 × 5.024 = **8.038 Vp-p**.

The analog-interface table, verified on paper (`ANALOG.md` §1; v1 figures, the circuits carried unchanged by split spec §7.1):

| Requirement | Result on paper | Section here |
|---|---|---|
| Input passband 20 Hz–20 kHz, ≤ 0.5 dB | Nominal −0.04 dB; worst case against 1 kHz −0.25/+0.18 dB at 20 Hz and −0.24/+0.16 dB at 20 kHz, including ±0.05 dB decimation ripple | §6.7 |
| Output passband 20 Hz–20 kHz, ≤ 0.5 dB | Worst case −0.08 dB at 20 Hz, −0.12 dB at 20 kHz, into 10 kΩ or open | §7.5 |
| Input impedance ≥ 1 MΩ resistive | 2.25 MΩ (1.12 MΩ normalled); ≥ 2.23 MΩ (1.11 MΩ) with the jack ESD diode's maximum leakage counted as a resistance | §6.2 |
| Output ≤ 1 kΩ, drives ≥ 10 kΩ | 100 Ω mid-band; 375 Ω (463 Ω at C_DC −20 %) at 20 Hz | §7.4 |
| Input full scale 7.62 Vp-p | 7.63 Vp-p at the jack (1 kHz) reaches ADC full scale | §6.5 |
| Output full scale 7.62 Vp-p into 10 kΩ | 7.59 Vp-p into 10 kΩ ∥ 100 kΩ (−0.03 dB), 7.67 Vp-p open | §7.2 |
| Unity passthrough | End-to-end −0.04 dB into 10 kΩ, +0.05 dB open, before the codec's own gain errors (open item ANALOG-CODEC-GAIN-AND-INPUT) | §6.5, §7.2 |
| Above full scale: no node beyond absolute maximum | ADC pins driven only by an op-amp on 5V_A (0.10–4.92 V); every op-amp input a jack reaches limited to ≤ 1.8 mA for DC and slow signals; fast edges limited by R_RF; ESD at each jack clamped by a PESD12VL1BA | §6.6 |
| DC | Input AC-coupled and biased to VMID; output DC-blocked with a 100 kΩ bleed at the jack | §6, §7 |
| Boot and reset | Two non-latching relays hold the jacks in bypass without steady power | §8, [bypass-relay.md](bypass-relay.md) |
| RF filtering, corners documented | Input 959 kHz, 339 kHz, 723 kHz; output 177 kHz and 7.2 MHz | §6.3, §6.5, §7.4 |
| Headroom at the analog rail's minimum | +0.031 Vp-p at 8.44 V | §3 |

## 3. Headroom on the analog branch

Only one stage produces the full jack level at its output: the output difference amplifier. Its op-amp must swing **7.677 Vp-p** (the 8.038 Vp-p DAC full scale × the stage gain 19.1 / 20.0 = 0.955; the 100 Ω series resistor into 10 kΩ ∥ 100 kΩ then loses 0.98912 at the jack, giving 7.593 Vp-p). The next E192 gain step, 19.3 kΩ, would ask 7.757 Vp-p and leave the guaranteed-linear region.

| Stage | Supply | Input common mode at full scale | Output at full scale |
|---|---|---|---|
| VMID follower | VIN_A | VIN_A / 2, static | static |
| Input follower | VIN_A | VMID ± 1.52 V (3.04 Vp-p after the divider) | same |
| ADC driver (inverting) | 5V_A | VBIAS = 5V_A / 2 = 2.51 V, static | 2.51 ± 1.51 V |
| Output difference amp | VIN_A | VMID ± 0.98 V | VMID ± 3.84 V (7.677 Vp-p) |

#### FIG-HEADROOM

**Margin +0.031 Vp-p at 8.44 V cold; +0.145 Vp-p at 8.54 V (25 °C).** Method: linear swing = 2 × (VIN / 2 − AOL edge − δ), where the AOL edge is the OPA1688's guaranteed-linear limit, (V−) + 0.35 V to (V+) − 0.35 V at RL = 10 kΩ over −40 to 85 °C, AOL ≥ 108 dB (SBOS724A §7.5), and δ is the output's DC asymmetry, subtracted from both half-swings. δ = VMID divider error VIN × (0.001 + 25 ppm/°C × 65 °C) / 2 = 11.1 mV at 8.44 V, plus offsets 1.6 mV (VMID follower) + 1.6 mV × noise gain 2 (difference amp) = 4.8 mV (SBOS724A VOS maximum over −40 to 85 °C): δ = 15.9 mV at 8.44 V (−40 °C), 9.1 mV at 8.54 V (25 °C). So 2 × (4.22 − 0.35 − 0.0159) = 7.708 Vp-p against 7.677 Vp-p. The 0.1 % gain resistors can take 0.015 Vp-p of it, leaving at least +0.016 Vp-p. With 1 % / 100 ppm divider resistors δ would be 74 mV and the margin gone, so **the VMID divider must be 0.1 %**. Source: [ANALOG.md §2][an]. Paper analysis of an unbuilt board.

**The 8.44 V basis on the split.** R-PF-7 requires VIN_A at 9 V cold to be at least 8.44 V; the owner fixed the basis as exactly 9.00 V in, no adapter tolerance and no cable drop, cold ([R-34](decisions.md#r-34), owner). With the per-branch PMEG4030ER, VIN_A is 8.615 V at that point ([power.md](power.md) §3.1), so the 8.44 V margin above is a floor, not the operating point. A 9 V adapter 5 % low with 0.1 V of cable drop clips about 0.4 V (about 0.5 dB) earlier at the loudest peaks (split spec §7.4 note).

**Candidates** (`ANALOG.md` §2.2, §2.3; linear swing by the method above):

| VIN | OPA1652 | OPA1642 | OPA2197 | OPA1688 |
|---|---|---|---|---|
| 8.44 V (cold minimum) | 6.81 Vp-p, fail | 8.01 Vp-p, but its common-mode top 4.94 V is under the 5.20 V the difference amp and the 5.74 V the input follower need: fail | 7.81 Vp-p, but the input follower crosses its 5.44–6.94 V transition region where THD and noise degrade: rejected | **7.708 Vp-p (+0.031)** |
| 8.54 V (25 °C) | 6.92, fail | 8.12, common-mode fail | 7.92 | **7.822 (+0.145)** |
| 11.55 V (v1's maximum at 12 V in; v1 figure) | 9.93 | 11.13 | 10.93 | 10.83 |

OPA1688 common-mode checks at 8.44 V (upper limit (V+) − 2 V = 6.44 V): input follower 2.70–5.74 V, margin 0.70 V; difference amp 3.24–5.20 V, margin 1.24 V; VMID follower 4.22 V. On 5V_A the limit is 3.02 V; the ADC driver's inputs sit at 2.51 V (margin 0.51 V) and its output needs 1.00–4.02 V, inside its 0.35–4.67 V AOL region. **Decision: OPA1688 for every audio and VMID op-amp.**

**Limits of the check.** SBOS724A guarantees the 0.35 V edge at RL = 10 kΩ; the output stage actually sees about 6.8 kΩ (9.19 kΩ external in parallel with an effective 25.6 kΩ through the feedback network, 0.57 mA peak in phase). The data sheet gives the edge at 2 kΩ only as typical (0.5 V); a linear interpolation in 1/RL gives 0.37 V at 6.8 kΩ and a −0.005 Vp-p margin, which is not a data-sheet value. The clip limit, 0.1 V at ≤ 1 mA (25 °C only), leaves 0.53 Vp-p. DAC full scale moves with 5V_A (±2.5 % overall) and the DAC gain error (±2 % typical, ±6 % maximum): a unit 0.4 % high uses up the margin, and one more than +7 % high reaches the clip limit. The acceptance gate for AN-D1 is therefore the bring-up THD+N measurement at full scale with a 9.0 V input, cold and hot, into 10 kΩ (open item ANALOG-HEADROOM-9V).

## 4. Op-amp allocation and supply currents

```text
 IN jack ─ K_BYP_IN (NO: FX_IN_x) ─ R_RF 1k ─┬─ C_IN 47n ─ R1 1.50M ─┬─ T ─ U_IN follower ─ C2 22µ ─ R_IN 10k ─ U_ADC (−1) ─ 100Ω ─┬─ PCM3060 VINx
                        C_RF 100p ─┤  (C1 110p ∥ R1)        ├─ R2 1.00M → VMID_x                   (VIN_A)   (5V_A, + in = VBIAS_x = 5V_A/2, 2×2.00k, 10µ)
                        R_PD 22M ──┘                        └─ C_T 160p → GND                                     2.2n → GND ─┘
 PCM3060 VOUTx± ─ C_A 10µ ─ 20.0k ─ U_OUT difference amp (G = 0.955, ref VMID_x) ─ R_S 100Ω ─┬─ C_DC 22µ ─┬─ FX_OUT_x ─ K_BYP_OUT (NO) ─ OUT jack
                                     (VIN_A, 19.1k ∥ 47p)                           C_O 220p ─┘   R_B 100k ─┘
 Coils off: each K_BYP NC contact joins IN jack to OUT jack (bypass; bypass-relay.md)
```

(R1, R2, C1 and C2 are `ANALOG.md`'s local names for the input divider, its compensation capacitor and the coupling capacitor of one channel; they are not reference designators.)

| Function | Part | Rail | Channels |
|---|---|---|---|
| VMID_L, VMID_R followers | U_VMID, OPA1688IDR | VIN_A | 2 |
| Input followers L, R | U_IN, OPA1688IDR | VIN_A | 2 |
| Output difference amps L, R | U_OUT, OPA1688IDR | VIN_A | 2 |
| ADC drivers L, R | U_ADC, OPA1688IDR | 5V_A | 2 |
| Expression follower | U_EXP, MCP6001T-I/OT | VREF_A ([D19](decisions.md#d19), owner-approved) | 1 |

All eight OPA1688 channels are used. Supply current (SBOS724A IQ maximum over −40 to 85 °C, 2 mA per channel): **12 mA** on VIN_A (6 × 2 mA); **7.5 mA** on 5V_A (U_ADC IQ 4 mA, plus U_ADC output and feedback currents 2 × 0.5 mA, plus two VBIAS dividers at 5.024 V / 4.0 kΩ = 1.26 mA each), which made v1's 5V_A load 43.6 mA; the split adds the codec domain to it ([§13.5](#135-the-domains-budget)). U_EXP draws 0.17 mA from VREF_A (DS20001733L IQ maximum). Each OPA1688 package dissipates 2 × 2 mA × 17.6 V = 70 mW at the 18 V survival input, ΔTJ = 0.070 W × 116.1 °C/W = 8 °C (SBOS724A §7.4; v1 figure; [power.md](power.md) §8 carries the survival row).

**Why the ADC driver is on 5V_A.** The PCM3060 VIN pins are rated −0.3 V to VCC + 0.3 V at ±10 mA. An op-amp on 5V_A, the same rail as VCC, cannot drive VINx outside 0 V to 5V_A, so the pins are protected by construction. A series resistor into an AC-coupled pin would form an unspecified divider with the codec's "10 kΩ typical" input resistance, and an AC-coupled pin fails on its own: a heavily clipped low-frequency input can leave 1.9 V on the coupling capacitor, after which an edge drives the pin to about 6.8 V, 15 mA through 100 Ω. DC coupling from a driver biased at mid-VCC follows SLAS533B Figure 34(a), with the bias from per-channel dividers, not the VCOM pin (§6.1).

## 5. VMID reference

- **Divider:** 2 × 100 kΩ, 0.1 %, 25 ppm/°C (needed for δ, §3), with 10 µF 50 V X7R (CL31B106KBHNNNE) at the node: corner 0.32 Hz, τ 0.5 s. On the split it runs from VIN_A ([power.md](power.md) §7).
- **Two followers, one per channel**, U_VMID units 1 and 2, each a plain unity-gain follower with **no output capacitor**, each fed from the divider node through **10 kΩ**. At power-down the rail falls faster than the 10 µF node; the 10 kΩ limits the discharge through the input ESD diode to ≤ 4.3 V / 10 kΩ = 0.43 mA (0.88 mA at 18 V), inside the ±10 mA rating (SBOS724A §7.1 note 2).
- **Why per channel and low impedance.** Each output stage's reference resistor carries 0.98 V peak / 19.1 kΩ = 51 µA of signal current. On v1's earlier node (49.9 Ω in series with 10 µF, |Z| 47 Ω at 20 Hz) that is 4.8 mV p-p of crosstalk into the other channel at 20 Hz, −64 dB relative to 7.6 Vp-p, against the PCM3060's 103 dB channel separation. With one follower per channel, L and R share no reference impedance.
- **Noise:** 10 kΩ gives 12.9 nV/√Hz plus 8 nV/√Hz from the op-amp, at gain 1 at each output (§7.6).

Source: [ANALOG.md §4][an]. *Not in force:* the 49.9 Ω + 10 µF + 100 nF output network and the OPA1652 VMID buffer of `POWER.md` §3.5, removed by `ANALOG.md` §4.

## 6. Input stage (per channel)

### 6.1 The ADC bias, and why VCOM carries no load

The ADC input is single-ended: full scale 0.6 VCC centred at 0.5 VCC, input resistance "10 kΩ typical" (SLAS533B). VCOM supplies 0.5 VCC through 7–18 kΩ with an allowable load of ±1 µA, so **VCOM is not a bias source**: under overload U_ADC saturates, its input clamp diodes (±0.5 V differential) pass current from R_IN into the non-inverting node, about (1.65 − 0.5) V / 5 kΩ = 0.23 mA at v1's 11.55 V rail maximum, 230 × VCOM's allowance. **Each channel has its own bias node VBIAS_x, 2 × 2.00 kΩ 0.1 % from 5V_A to GND with 10 µF X7R** (Thevenin 1.0 kΩ, corner 16 Hz, 1.26 mA). Overload injection moves the node by ≤ 0.23 V in operation (recovering with τ 10 ms) and ≤ 1.76 V at 18 V survival (to ≤ 4.3 V, still inside 5V_A), and only in its own channel; a shared node would couple one clipping channel into the other as a ≤ 0.46 V transient. DC level: VBIAS_x = 5V_A / 2 against the codec's 0.5 VCC centre from the same rail; the mismatch is ±2.5 mV from the divider plus the codec's centre tolerance, which SLAS533B does not give (open item ANALOG-CODEC-GAIN-AND-INPUT); the codec's digital high-pass (0.91 Hz) removes the offset. VCOM keeps only its decoupling. Source: [ANALOG.md §5.1][an].

### 6.2 Bias and input impedance

R1 = **1.50 MΩ** and R2 = **1.00 MΩ** (0.1 %, 0805), a divider from the coupled input to VMID_x; **R_PD 22 MΩ** at the jack side of C_IN keeps C_IN charged with no plug. Input impedance 2.50 MΩ ∥ 22 MΩ = **2.25 MΩ**; normalled (the left source drives both channels) 1.12 MΩ. Both meet AN-D2. The jack ESD diode's leakage, ≤ 50 nA at 12 V (≥ 240 MΩ as a resistance), gives 2.23 MΩ (1.11 MΩ normalled). For information, with 166 pF per channel plus the diode's 19 pF typical: |Zin| 802 kΩ at 1 kHz and 43 kΩ at 20 kHz (401 kΩ and 21.5 kΩ normalled). The divider ratio is 1.00 / 2.50 = 0.40000, so the follower sees 3.04 Vp-p at full scale. Source: [ANALOG.md §5.2][an], [§5.8][an] (right-to-left normalling: the right jack's tip-normal contact is wired to the left tip net).

### 6.3 RF filter and coupling

- **R_RF 1.0 kΩ** in series from the tip, then **C_RF 100 pF C0G** to GND ([OWN-02](decisions.md#own-02), a controller ruling the source heads as an owner decision). With C1 in series with C_T (110 × 165 / 275 = 66.0 pF), the input is 166 pF per channel; the corner from a zero-impedance source is 1 / (2π × 1 kΩ × 166 pF) = **959 kHz**, 0.002 dB at 20 kHz. From a 10 kΩ source the 20 kHz loss is 0.26 dB (about 0.04 dB more with the jack diode).
- **C_IN 47 nF C0G 50 V (1206)**: corner 1 / (2π × 47 nF × 2.50 MΩ) = 1.35 Hz. C0G because it sees signal plus DC.

### 6.4 Compensated divider and follower

About 5 pF of pin and layout capacitance on the divider's 600 kΩ Thevenin source would roll off at 53 kHz, so the divider is compensated like a scope probe: **C1 110 pF** across R1 and **C_T 160 pF** from node T to GND, C0G ±2 % or tighter (±5 % breaks the passband budget, ±0.4 dB at 20 kHz). Ideal C_T + C_par = C1 × R1 / R2 = 165.0 pF, met by 160 pF plus about 5 pF parasitic (the 2–8 pF parasitic range is an assumption, open item ANALOG-PASSBAND-ASSUMPTIONS). The divider's thermal noise, 99.7 nV/√Hz, rolls off above 965 Hz: 3.8 µV rms in band. **U_IN** is an OPA1688 unity follower (common mode 2.70–5.74 V at 8.44 V), loaded by R_IN 10 kΩ to a virtual node. Source: [ANALOG.md §5.5][an].

### 6.5 Gain and level shift to the ADC

**U_ADC** is inverting, **R_IN = R_F = 10.0 kΩ 1 %**, **C_F 47 pF C0G** (339 kHz), AC-coupled from U_IN through **C2 22 µF 25 V aluminium electrolytic** (+ toward U_IN; 1.7 V across it, 6.3 V at 18 V; corner 0.72 Hz). Its output reaches VINx through **R_O 100 Ω** with **2.2 nF C0G** to GND at the pin (723 kHz). Gain 0.40000 × 1.000 × 10 k / 10.1 k = 0.39604, or 0.39530 at 1 kHz once the coupling poles and codec filters are included; input full scale 3.014 / 0.39530 = **7.63 Vp-p** at 1 kHz, within 0.02 dB of AN-D1. A ±30 % spread of the codec's "10 kΩ typical" input resistance moves R_O's divider by about ±0.3 %. Source: [ANALOG.md §5.6][an].

### 6.6 Clamping and overload

- **Codec pins.** VINx is driven only by U_ADC on 5V_A, so it stays inside 0.10–4.92 V. The ADC sees up to 4.82 Vp-p (+4.1 dB over full scale, 12.1 Vp-p at the jack) before U_ADC clips; the ADC's own overload behaviour is not specified (open item ANALOG-CODEC-OVERLOAD-AND-RESET).
- **U_IN, DC and slow signals**, through R_RF + R1 = 1.501 MΩ: an external 12 V gives 8 µA into the op-amp's own ESD diodes. **External DC limit ±12 V**, the jack ESD diode's VRWM; above its V(BR) minimum 14.2 V a sustained source is outside the diode's ratings (pulse ratings only).
- **U_IN, fast edges.** A step reaches node T at C1 / (C1 + C_T + C_par) = 0.40; with T at 4.22 V on an 8.44 V rail the clamp at (V+) + 0.5 V engages only for steps above 4.72 / 0.40 = **11.8 V**. Above it the peak current is ≤ (V_step − 11.8 V) / R_RF for about 0.21 µs: steps up to 21.8 V stay within SBOS724A's 10 mA guidance. With the jack diode fitted a transient is held to its clamping voltage, ≤ 20 V at 1 A (8.2 mA into U_IN) and ≤ 37 V at 5 A (25 mA). Unpowered, the clamp engages at about 1.3 V, and 20 V drives about 18.7 mA for about 0.2 µs, above the guidance; R_RF 4.7 kΩ would bring it to about 4 mA, an option recorded under OWN-02 and not applied.
- **U_ADC's inverting input.** U_IN swinging rail to rail (17.6 V at 18 V) injects ≤ 17.6 V / 10 kΩ = 1.76 mA, inside ±10 mA and far under 5V_A's load, so the LDO never sinks. Differential inputs (±0.5 V absolute maximum) carry ≤ 1.8 mA through 1.50 MΩ, 10 kΩ or 20 kΩ.
- **Jack ESD diodes** ([OWN-03](decisions.md#own-03), owner): one **Nexperia PESD12VL1BA,115** (SOD323, bidirectional, LCSC C38558) from each audio tip to GND at the jack terminal, input tips on the jack side of R_RF, output tips on the jack node at R_B; also on the expression tip and ring. PESD12VL1BA v.3 (14 April 2023): VRWM 12 V; V(BR) 14.2 V minimum; IRM ≤ 50 nA at 12 V; Cd 19 pF typical, no maximum; IEC 61000-4-2 30 kV contact, Ipp 5 A, Ppp 200 W (8/20 µs); V(CL) ≤ 20 V at 1 A, ≤ 37 V at 5 A; no continuous power rating. Full scale (±3.81 V) and an 18 V upstream pedal (≤ ±8.8 V) stay below VRWM. The PESD15VL1BA is an unfitted alternative. The diode's capacitance is nonlinear (19 pF falling to about 13.5 pF over ±3.8 V, typical curve): a pessimistic numerical estimate puts H3 at −102 dB (1 kΩ source, full scale, 1 kHz), −66 dB (10 kΩ, full scale, 6.67 kHz) and −61 dB (100 kΩ resistive, 1 V peak, 3 kHz), against the ADC's −93 dB typical THD+N; it is measured at bring-up (BU-26; open item JACK-ESD-SYSTEM). The diodes are shunt parts, so leaving them unfitted restores the circuit without a board change. At the output the diode is driven through R_S 100 Ω: the RF corner moves from 7.2 to 6.7 MHz and H3 is about −105 dB.

Source: [ANALOG.md §5.7][an].

### 6.7 Input passband and noise

The network is solved by nodal analysis (source, R_RF/C_RF/R_PD, C_IN, R1 ∥ C1, R2 to VMID, C_T + C_par, the follower, C2/R_IN/R_F ∥ C_F, R_O/2.2 nF/10 kΩ, the codec's 0.91 Hz high-pass, and a single-pole model of its 300 kHz anti-alias filter), relative to 1 kHz. Nominal −0.034 dB at 20 Hz, −0.039 dB at 20 kHz. Worst corner (R1, R2 ±0.1 %; C1, C_T ±2 %; C_par 2–8 pF; C_IN ±5 %; C2 ±20 %; C_F ±5 %; codec input resistance 7–13 kΩ): −0.20 to +0.13 dB and −0.19 to +0.11 dB; with ±0.05 dB decimation ripple **−0.25 to +0.18 dB** and **−0.24 to +0.16 dB**. Noise, indicative: front end about 5.2 µV rms in band unweighted (divider 3.8, driver 3.4, follower 1.1) against the ADC floor, 3.014 Vp-p at 99 dB dynamic range = 12.0 µV rms, about 0.8 dB degradation; the comparison mixes unweighted and A-weighted figures (open item ANALOG-NOISE-MEASURE). Source: [ANALOG.md §5.9, §5.10][an].

## 7. Output stage (per channel)

### 7.1 Topology and the DAC load

- DAC mode **differential** (MODE strap 220 kΩ to DGND, CORE-BRIEF D2, kept by split spec §9.4). Each leg carries 4 Vp-p at full scale around 0.48 VCC = 2.41 V.
- Both legs are AC-coupled through **C_A 10 µF 50 V X7R** (1.8 V across it; 6.4 V at 18 V). Reason: the differential bipolar-zero error is ±1 % FSR typical, 80 mV, which DC-coupled would shift the output's DC point by 76 mV and cost 0.15 Vp-p of swing, about five times the AOL margin. The 0.5× DC-bias bound taken for C_A is an assumption (open item ANALOG-PASSBAND-ASSUMPTIONS).
- **U_OUT difference amp:** R1 = R2 = **20.0 kΩ**; R_F = R_G = **19.1 kΩ** 0.1 % 25 ppm (E192); C_F = C_G = **47 pF C0G ±2 %**; R_G returns to VMID_x; **inverting leg from VOUT+, non-inverting leg from VOUT−**, so the stage inverts. The input chain inverts once (U_ADC) and this stage once, so jack-to-jack polarity holds with firmware passing samples unnegated. The model must keep this leg assignment or record a firmware negation instead.
- DAC load: the inverting leg sees R1 / 1.5 = 13.3 kΩ, the non-inverting 39.1 kΩ, both ≥ SLAS533B's 5 kΩ AC-coupled and 10 kΩ; trace capacitance only at the pin (≤ 50 pF).

### 7.2 Gain and level

G = 19.1 / 20.0 = 0.955; op-amp output 8.038 × 0.955 = **7.677 Vp-p**; at the jack × 0.98912 = **7.59 Vp-p into 10 kΩ** (−0.03 dB), 7.67 Vp-p open. End to end at unity firmware gain: a 7.63 Vp-p input gives 7.59 Vp-p into 10 kΩ (−0.04 dB) and 7.67 Vp-p open (+0.05 dB).

### 7.3 DC block and bleed

**C_DC 22 µF 25 V aluminium electrolytic**, + toward the op-amp, Panasonic EEE-FT1E220AR (FT series, LCSC C401767), the same part as the ADC driver's coupling capacitor; it holds VMID, or up to 17.5 V with the op-amp saturated at 18 V. Corner into 9.19 kΩ 0.79 Hz (0.98 Hz at −20 %). **R_B 100 kΩ** holds the jack at 0 V DC.

### 7.4 Output impedance and RF filtering

**R_S 100 Ω** in series after the feedback tap (SBOS724A §8.3.3 recommends a series resistor for capacitive loads): Zout 100 Ω at 1 kHz, 375 Ω at 20 Hz (463 Ω at C_DC −20 %). The feedback poles with 19.1 kΩ give **177 kHz** and attenuate the DAC's out-of-band noise; **C_O 220 pF C0G** from the R_S/C_DC node to GND gives **7.2 MHz**.

### 7.5 Output passband

Nominal (10 kΩ ∥ 100 kΩ) −0.013 dB at 20 Hz, −0.055 dB at 20 kHz; worst corner (C_A 0.5–1.1×, C_DC ±20 %, C_F ±5 %, load 10 kΩ or open) −0.038 / −0.060 dB; with the DAC filter (−0.02 dB at 20 kHz) and ±0.04 dB ripple, **−0.08 dB** and **−0.12 dB**.

### 7.6 Noise and THD

Output stage about 42.4 nV/√Hz, 6.0 µV rms in band; DAC floor 8.038 Vp-p at 104 dB = 17.9 µV rms at the DAC, 17.1 µV at gain 0.955; about 0.5 dB degradation, indicative (open item ANALOG-NOISE-MEASURE). THD: OPA1688 0.00005 % (G = 1, 3.5 Vrms, 2 kΩ); at full scale on 8.44 V the output stays 0.366 V from the rails, inside the 0.35 V edge at the data sheet's 10 kΩ condition (the load caveat of §3).

Source for §7: [ANALOG.md §6][an].

## 8. The jacks in bypass, and the pop the relays prevent

The owner replaced the solid-state output mute with relay bypass ([OWN-01](decisions.md#own-01), owner, 2026-10-04). Two non-latching relays sit between the jacks and the electronics: with the coils off (no power, power-up, MCU reset, brown-out, a power-fail trip, or RELAY_EN low) each input jack is wired to its output jack through two NC contacts; with RELAY_EN high the tips feed the front ends through FX_IN_x and the output stages reach the jacks through FX_OUT_x. C_DC, R_B and the output test pad are on FX_OUT_x, so R_B holds the contact at 0 V DC in both states. The relay part, its drive and its timing on the split are in [bypass-relay.md](bypass-relay.md) and [power.md](power.md) §3.

**What the relays keep off the jack** (`ANALOG.md` §7.1, §7.4; v1 figures, a time-domain model of C_DC with R_S into the load, "audio-band" being the peak after a second-order 20 Hz high-pass):

| Event | Load | Unprotected: jack peak / audio-band peak |
|---|---|---|
| Power-up (VMID τ 0.5 s) | 10 kΩ | 0.92 V / 29 mV |
| Power-up | open | 2.76 V / 31 mV |
| Power-down (rail falling 0.35 V/ms; the output collapses from 4.27 V once the rail falls below VMID + 0.1 V) | 10 kΩ | 4.10 V / 1.22 V |
| Power-down | open | 4.25 V / 1.27 V |

Without protection, power-down puts an almost full-scale step on the jack. So the output relay must open before the analog rail reaches VMID + 0.1 V (R-PF-1), and at power-up firmware holds bypass for at least 2.5 s (5τ of the VMID divider) so the excursion lands on R_B. Relay changes in use are made with the DAC ramped to zero and 0 V DC on both sides of the contact (open item FIRMWARE-ANALOG-OBLIGATIONS). The relay's release with its suppressor is open item POWER-FAIL-REPLACEMENT-MEASURE.

## 9. VREF_A (pin 21)

### 9.1 The rail

Pin 21 is an **ADC reference rail, not a power output**: on our module it is VDDA = VREF+ after FB_VDDA (Murata BLM21PG221SN1D, DCR ≤ 0.045 Ω, |Z| 220 Ω ± 25 % at 100 MHz) and the VDDA bank (2 × 2.2 µF + 2 × 100 nF X7R ±10 % at present); on a Seed it is +3V3A, an LDO output (Rev5 LP2985; Rev7 and Seed3 unpublished). The interface rules (permitted loads only: the pot tops, the expression ring reference with the plug-detect divider behind it, the HW_REV divider and U_EXP's supply; no switching, pulsed or digital load; no series element on the pedal; back-powering prohibited) are in [architecture.md](architecture.md) §4.7. The values the S1 analysis set, recorded in the contract ([R-15](decisions.md#r-15) to [R-19](decisions.md#r-19)):

| Contract value | Value | Basis |
|---|---|---|
| Continuous DC load | 10 mA; declared 6.49 mA, × 1.5 = 9.74 mA | [FIG-VREF-LOAD](#fig-vref-load) |
| Transient | 15 mA for at most 1 ms; dynamic peak 8.50 mA, × 1.5 = 12.75 mA | [FIG-VREF-LOAD](#fig-vref-load) |
| Maximum external capacitance | 4 µF, a decision | §9.3, [R-18](decisions.md#r-18) |
| Permitted noise in the control band | 1,123 µV rms | [FIG-VREF-1123](#fig-vref-1123); band [EC-CONTROL-NOISE-BAND](#ec-control-noise-band) |
| Wideband noise at pin 21 | ≤ 806 µV rms, a module requirement | [EC-VDDA-WIDEBAND](#ec-vdda-wideband) |

The contract and results files carrying these values are byte-identical records in this repository ([circuits/h7-platform/module-interface.json](../../circuits/h7-platform/module-interface.json), [circuits/h7-platform/interface-analysis-results.json](../../circuits/h7-platform/interface-analysis-results.json)); they still contain superseded statements, which the README names.

### 9.2 Loads and the dynamic peak

#### FIG-VREF-LOAD

**Declared 6.49 mA, × 1.5 = 9.74 mA ≤ 10 mA (0.26 mA headroom); dynamic peak 8.50 mA, × 1.5 = 12.75 mA ≤ 15 mA for ≤ 1 ms.** Inputs at VREF_A = 3.513 V (the 3V3_D maximum) and 1 % resistors. Six pot fits is the worst case; a button fit puts nothing on VREF_A.

| Role | Basis | Declared, mA |
|---|---|---|
| Six pot tops | 6 × 3.513 V / 8.0 kΩ (B10K at −20 %, an allowance, [R-16](decisions.md#r-16)) | 2.64 |
| Ring reference | −5 V on the ring (the ring's DC limit, §10.1): (3.513 + 5) V / 3.267 kΩ = 2.61, plus the blocking network 0.89 (D_RCLAMP's leakage allowance 0.86 mA at 85 °C, R_CE's 35 µA, Q_REFEN's gate 0.1 µA, the LM66100's 0.3 µA) | 3.50 |
| HW_REV divider | 3.513 V / 20 kΩ | 0.18 |
| U_EXP supply | MCP6001 IQ maximum 170 µA | 0.17 |
| **Total** | | **6.49** |

D_RCLAMP's 0.86 mA is Nexperia's typical 300 µA at 3.5 V and 85 °C (Fig. 2) scaled by the ratio of the only maximum given (20 µA at 10 V, 25 °C) to its typical (7 µA): an allowance. The dynamic peak is the plain sum ([R-16](decisions.md#r-16) as amended): pot tops 2.63 + ring short 1.08 + network 0.89 + HW_REV 0.18 + U_EXP 0.17 + U_EXP charging its 1.00 kΩ / 100 nF ADC filter from 0 V at the lower of its short-circuit current (±6 mA typical, no maximum) and 3.513 V / 0.99 kΩ = 3.55 mA (τ 0.111 ms) = **8.50 mA**. Even the out-of-specification −5 V ring with a full charge, 10.03 mA, stays inside 15 mA (no 1.5× margin claimed). R_REF must be ≥ 3.079 kΩ for the budget to close; 3.30 kΩ was taken. The budget rests on allowances (open item VREF-A-LOAD-ALLOWANCES). Source: [vref-a.md §1][vref]. Paper analysis of an unbuilt board.

### 9.3 Maximum external capacitance: 4 µF, a decision

On our module, in the bead's inductive region |Z| ≤ ωL, so L ≥ 0.263 µH (|Z| 165 Ω, the 25 % low end of 220 Ω, at 100 MHz; Murata's curve could not be read, so only this lower bound is used). The bank's least effective capacitance on R-57's basis is 4.6 µF × 0.3825 = 1.76 µF, f0 ≤ 234.1 kHz. Neither Q nor the 15 mA / 1 ms step bounds C_ext: Q = √(L/C) / R and the droop I × (R + √(L/C)) both fall as C grows (VREF+ would leave DS12110 Table 87's ≥ 2 V only above L = 12.7 mH). So **4 µF is a recorded decision** ([R-18](decisions.md#r-18)), 40 × the pedal's 0.1 µF C_EXP, the only capacitance directly on VREF_A. It is carried to the module as a loop and start-up check of the module buck with its total 3V3 capacitance plus C_ext (open item MODULE-BUCK-LOOP-STARTUP). On a Rev5 Seed, pin 21 already carries 54.5 µF and the LP2985 allows 1–200 µF, a 145.5 µF bound that covers the Rev5 only (open item SEED-PIN21-CAPACITANCE).

**The VDDA network peaks at resonance whatever C_ext is.** Q = 1 needs R ≥ √(L/C) ≥ 0.23 Ω, five times the bead's DCR. R-18 therefore requires a damping leg across the VDDA bank, about 0.25–0.5 Ω (≈ √(L/C) once Murata's curve gives L) in series with about 22 µF, **never a series resistance in VDDA's DC path** (open item VDDA-DAMPING-LEG). Source: [vref-a.md §2][vref].

### 9.4 Noise in the control band

The pots, the ring and HW_REV divide VREF_A, and the ADC converts against VREF+, so reference noise common to both cancels where the pin follows the reference. Each control pin is filtered and VREF+ is not, so the residue is k × |1 − H(f)| × v_n, k ≤ 1. For a single pole |1 − H| = x / √(1 + x²), 0.707 at the corner. Source for §9.4: [vref-a.md §3][vref] and the [S1 ledger R-15, R-57][ledger].

#### FIG-VREF-806

**LSB/4 = 806 µV rms.** Inputs: the control resolution, 10 bits, a decision ([R-15](decisions.md#r-15): no document states one; "pots are musical controls and 1,024 steps is the chosen resolution"), and a 3.3 V reference. Method: one LSB is 3.3 V / 1,024 = 3.223 mV; a quarter of it is 805.7 µV, recorded as 806 µV rms. The same LSB/4 is the wideband requirement ([EC-VDDA-WIDEBAND](#ec-vdda-wideband)). Paper analysis of an unbuilt board.

#### FIG-VREF-1123

**Permitted VREF_A noise in the control band: 1,123 µV rms.** Inputs: LSB/4 ([FIG-VREF-806](#fig-vref-806)); the residue gain at the band's own corner, 0.707 (the pots' single-pole mismatch |1 − H| at x = 1); U_EXP's supply rejection, taken at 40 dB at the band edge, a residue of 0.010 (an allowance: DS20001733L gives 86 dB typical at DC only). Method: the two residues are added, 0.707 + 0.010 = 0.717, and the noise is the level whose residue equals LSB/4: 805.7 µV / 0.717 = 1,123.6 µV, recorded as **1,123 µV rms** (rounded down; this document's arithmetic shows the unrounded value). The expression chain's own mismatch at the corner is ≤ 0.25, so the pots bind. R-57 left the level unchanged because the residue at the band's own corner is still 0.707. Paper analysis of an unbuilt board.

#### FIG-VREF-BAND

**The band edge.** Inputs: R_POSn 10.0 kΩ at −1 %, 9.9 kΩ; C_POSn 100 nF X7R at its least effective value on R-57's basis, 100 nF × 0.9 (tolerance) × 0.85 (X7R over −55 to 125 °C, covering R-20) × 0.5 (DC bias) = 38.25 nF. Method: the widest pot-filter corner, 1 / (2π × 9.9 kΩ × 38.25 nF) = 420.3 Hz, rounded up to the band of [EC-CONTROL-NOISE-BAND](#ec-control-noise-band). The nominal corner (10 kΩ, 100 nF) is 159 Hz (§12). Paper analysis of an unbuilt board.

### 9.5 Wideband noise and VDDA-WIDEBAND

VREF+ is sampled unfiltered, so wideband noise aliases into the control band, where smoothing can only average it. The requirement is [EC-VDDA-WIDEBAND](#ec-vdda-wideband).

#### FIG-VDDA-WIDEBAND

**The present module network gives 2.13 mV rms at pin 21 (5.58 mV p-p asymptotic), over 806 µV; the requirement is f0 ≤ 158.0 kHz, L_min × C_bank,eff ≥ 1.015 µH·µF.** Inputs: the module's worst-case 3V3 ripple at fSW minimum 450 kHz ([R-24](decisions.md#r-24); [power.md](power.md) §5.2): inductor ripple ΔIL 1.66 A into 30.6 µF (40 µF −10 % −15 %) with 3.33 mΩ ESR; FB_VDDA's L ≥ 0.263 µH; the bank at 4.6 µF × 0.3825 = 1.76 µF. Method: ΔIL treated as a symmetric triangle, whose fundamental 4 ΔIL / π² is the largest of any duty cycle; the capacitor's reactance and ESR in quadrature; FB_VDDA's undamped second-order |H| = 1 / ((f / f0)² − 1) at f0's highest value, 234.1 kHz, |H| 0.371 at 450 kHz; odd harmonics to the 15th added in rms (under 1 %). This document's check of the fundamental: 4 × 1.66 / π² = 0.673 A peak; |Z| = √(11.56² + 3.33²) mΩ = 12.03 mΩ; 8.09 mV peak × 0.371 = 3.00 mV peak = 2.12 mV rms, consistent with the source's 2.13 mV. The requirement is the f0 at which the same sum equals 806 µV, 158.0 kHz, and 1 / (2π × 158.0 kHz)² = 1.015 µH·µF. With L ≥ 0.263 µH the bank needs C_eff ≥ 3.86 µF, a nominal X7R bank ≥ 3.86 / 0.3825 = **10.1 µF** (for example 2 × 10 µF + 2 × 100 nF), or a bead with more inductance. The bank counts toward [R-50](decisions.md#r-50)'s 150 µF on the module's 3V3. R-18's damping leg may be credited only through an |H| computed with the leg at these minimum values; the undamped figure is the requirement. The module design records the chosen parts and their DC-bias curves, or keeps the 0.5 derate. Source: [vref-a.md §3][vref]; [S1 ledger R-57][ledger]. Paper analysis of an unbuilt board; open items VDDA-WIDEBAND, 3V3D-RIPPLE-INTO-VREF-A, and the bring-up measurement VREF-A-NOISE-MEASURE.

### 9.6 Back-feed from the expression jack

Split spec §14 **risk** R-14 (not ruling R-14): VREF_A back-fed from the expression jack into an unpowered module. Cases: +5 V on the ring through R_REF; +12 V on the tip through R_TIP 22 kΩ and U_EXP's input clamp; and −5 V on the ring. Criteria: the module's 3V3 (VDDA = VDD through FB_VDDA) inside DS12110 Table 21's −0.3 to 4.0 V and below the power-on-reset release, 1.62 V minimum rising (Table 27); on a Seed also VDDA < VDD + 0.3 V while VDD < 1 V.

**Unblocked, the bound cannot be shown.** The only fixed load on the unpowered module's 3V3 is the buck's ≤ 42.8 kΩ feedback divider: +5 V on the ring through 3.267 kΩ reaches 4.65 V; +12 V on the tip through 21.8 kΩ reaches 7.95 V.

```text
VREF_A ──┬─ U_REFBLK LM66100 VIN ── VOUT ──┬── R_REF 3.30 kΩ ── ring
         │            CE ── R_CE 100 kΩ ───┤
         │             └─ Q_REFEN 2N7002 D │ (S to GND)
         └─ R_ENG 100 kΩ ── Q_REFEN gate   └── D_RCLAMP PMEG4005AEA cathode (anode GND)
tip ── R_TIP 22 kΩ ── (1 nF, 10 MΩ) ── R_EXPIN 2.2 MΩ ── U_EXP IN+ (U_EXP VDD on VREF_A)
```

Parts ([EC-RING-REFERENCE](#ec-ring-reference)): U_REFBLK TI LM66100DCKR (C2869734, SC-70-6), ST and N/C to GND; Q_REFEN 2N7002,215 (C65189); R_ENG and R_CE 100 kΩ (C25803); D_RCLAMP PMEG4005AEA,115 (C426867, SOD-323); R_EXPIN 2.2 MΩ (C22938). The two parts that touch VREF_A (U_REFBLK's VIN, R_ENG) carry the ring-reference load role.

- **Powered: always on.** Q_REFEN's gate sits ≥ 3.264 V, above the 2N7002's 2.75 V maximum threshold, so it holds CE under VIN − 250 mV, where every LM66100 turns on (SLVSEZ8A §6.5). The ring error is RON × current ≤ 0.23 Ω × 1.20 mA / 3.274 V = **85 ppm** of full scale, under LSB/4 (244 ppm). Powered back-feed at +5 V on the ring is (5 − 3.274) V / 3.267 kΩ = 0.53 mA into the module's load.

#### FIG-VREF-BLOCKED

**Unpowered, at 85 °C with +5 V on the ring: VREF_A ≤ 0.38 V, and U_REFBLK's CE 0.91 V clear of its turn-off level.** Inputs and method ([vref-a.md §4][vref]): VIN, the back-fed VREF_A, is (IOUT,OFF 2.7 + ICE 0.61 + tip clamp 5.5) µA × 42.8 kΩ = 0.38 V. Q_REFEN's drain current is IDSS ≤ 5.32 µA (a straight line between Table 7's 1 µA at 25 °C and 10 µA at 150 °C, which lies above the exponential curve) plus subthreshold current ≤ 1.44 µA (250 µA at the minimum threshold 0.81 V at 85 °C, falling at 192 mV per decade, Fig. 10's 160 mV scaled by absolute temperature, to a gate at 0.38 V). With ICE ≤ 0.61 µA the CE current is ≤ 7.37 µA, which drops 0.74 V across R_CE (+1 %). VOUT is the ring source less R_REF's drop (3.333 kΩ) on the clamp's 0.86 mA, U_REFBLK's 2.7 µA and the CE current: 2.11 V. CE ≥ 2.11 − 0.74 = 1.36 V against VIN + 80 mV = 0.46 V: **0.91 V of margin**. Every term improves toward −20 °C, so 85 °C governs. Blocked bound into 42.8 kΩ: **0.28 / 0.38 V** at 25 / 85 °C, below the 1.62 V POR release and inside 4.0 V; the current enters supply pins, so Table 22's injection limits do not apply. **IOUT,OFF is specified only for VIN ≥ 1.5 V; at VIN ≈ 0 the blocking relies on TI's ORing application** (SLVSEZ8A §9.2.1), hence the bring-up gate (open item VREF-A-BACKFEED-GATE). The margin prevents a latch: were CE to fall below VIN + VOFF, the switch would close and Q_REFEN would hold CE low. Paper analysis of an unbuilt board.

- **R_EXPIN 2.2 MΩ** keeps +12 V on the tip to ≤ 5.5 µA into U_EXP's clamp. IB 19 pA typical at 85 °C costs 42 µV; 1 nA of board leakage 2.2 mV (0.69 LSB10, static), so the IN+ node is kept short and guarded (open item PEDAL-ANALOG-LAYOUT-RULES); the IN+ pole sits near 9–12 kHz, above the tip's 7.2 kHz.
- **D_RCLAMP.** Unpowered, −5 V on the ring drives ≤ 1.53 mA into it; VF ≤ 221 mV at 25 °C (log-interpolated between Table 7's 1 mA and 10 mA rows), and ≤ 294 mV at −20 °C from Fig. 1's typical 1.62 mV/K tempco, so every node stays above −0.3 V (6 mV of margin, ≤ 297 mV with ±2 mV of graph-reading uncertainty). Powered, the clamp is reverse-biased and its leakage is drawn ahead of R_REF.
- **Seed residual, not fixed.** On a bare unpowered Seed, with only the pedal's HW_REV divider (≤ 46.4 kΩ) as a fixed load, +12 V on the tip lifts VDDA to 0.31 V at 25 °C (0.41 V at 85 °C), just above VDD + 0.3 V, which the LP2985 forbids: outside the specification, on a development substitute. The ring cases on a Seed are blocked (≤ 0.16 V at 85 °C for +5 V, ≥ −0.23 V for −5 V).
- **An option not adopted:** a bleeder of ≤ 12 kΩ on the module's 3V3 (9.45 kΩ with the feedback divider) bounds even an unblocked +5 V ring at 5 × 9.45 / (9.45 + 3.267) = 3.72 V, whatever the LM66100 does, for about 0.29 mA when powered. The module design decides (open item VREF-A-BLEEDER-DECISION).

## 10. Expression input

### 10.1 Ring reference

The ring is fed from VREF_A through the blocking network of §9.6 and **R_REF 3.30 kΩ**, so the reading is ratiometric; **100 nF X7R** at the ring to GND. Ring reading across 10–100 kΩ pedals: 70.6 % (10 kΩ at −20 %) to 96.8 % of full scale; at 16 bits that is ≥ 46,000 codes, far above R-15's 1,024 steps, and the blocking network's non-ratiometric error is ≤ 85 ppm. The ring short draws 1.08 mA. Firmware calibrates the minimum and maximum. **Ring external DC limit ±5 V**, set by R_REF's dissipation (A2 Task 13 ruling, "best practice; owner may override", `ANALOG.md` §8.2; a controller ruling, [AN-RING](decisions.md#an-ring)): the input is specified for passive expression pedals, which put no voltage on the ring. At −5 V, R_REF 3.30 kΩ dissipates 22 mW (1206, 250 mW). Source: [vref-a.md §1, §4][vref]; [ANALOG.md §8.1, §8.2][an].

### 10.2 Tip

**R_TIP 22.0 kΩ** in series, then **1 nF C0G** to GND (7.2 kHz) and **10 MΩ** to GND, so the input is defined with no plug (≤ 0.47 % loading error at a 47 kΩ worst-case source); then **R_EXPIN 2.2 MΩ** and **U_EXP**, an MCP6001 follower supplied from VREF_A (common mode VSS − 0.3 V to VDD + 0.3 V; input absolute maximum VSS − 1.0 V to VDD + 1.0 V at ±2 mA; IB ±1 pA). Faults (tip to sleeve, tip to ring, ring to sleeve, a TS plug) stay inside the rails. **Tip external DC limit ±12 V**, the jack ESD diode's VRWM. The PESD12VL1BA sits at the jack on the tip (jack side of R_TIP) and on the ring (jack side of R_REF); its 19 pF has no effect on the tip's 7.2 kHz or the ring's filter, and its ≤ 50 nA leakage into the ≤ 25 kΩ pot Thevenin resistance costs ≤ 1.25 mV, 0.04 % of full scale. U_EXP's output is bounded by 0 V to VREF_A, so it stays inside the ADC pin's conversion range and cannot drive an unpowered module ([D19](decisions.md#d19), owner-approved; split spec §5.6.3, "Why U_EXP stays on VREF_A"). Source: [ANALOG.md §8.2][an]; [vref-a.md §4][vref].

### 10.3 Filter, plug detect and range

- **Filter:** 1.00 kΩ and 100 nF X7R to EXPR_TIP (pin 28): 1.6 kHz; the 100 nF holds the sample charge.
- **Plug detect:** the jack has a ring-normal contact; ring-normal → **1 kΩ** → EXPR_DETECT (pin 30), with **100 kΩ** to GND. No plug: the contact touches the ring, which sits at VREF_A through R_REF, so the pin reads ≥ 0.95 × VREF_A, above VIH 0.7 VDD (DS12110 Table 60); plug in: the contact opens and the pin reads low. Firmware ignores the input while EXPR_DETECT is high.
- **Range:** the source impedance U_EXP sees is at most 25 kΩ + 22 kΩ into a CMOS input, so it adds no error.

*Not in force:* `ANALOG.md` §8's v1 pin assignments (EXPR_TIP on PB0 / ADC1_INP9, EXPR_DETECT on PG12) and its PB0 FT_a note; the contract pins are in [architecture.md](architecture.md) §4.3, and the module-side pin limits in §4.8.

## 11. Hardware-revision strap

The HW_REV divider moves to the pedal (split spec §9.3, CORE-24) and runs from **VREF_A** to GND, with **100 nF** at the pin (contract pin 29, PA5). The result is a ratio, so reference error cancels. PA5, like v1's PA4, takes no injection current (DS12110 Table 22), and the divider never exceeds VREF_A. Revision n is coded at the nominal ratio n / 9. Bands are formed from resistors ±1 % plus TCR 100 ppm/°C × 65 °C = ±0.65 % each, non-tracking; an ADC error budgeted at ±1 % of full scale (DS12110 Table 176 gives typical values only, so the budget is an assumption: open item HW-REV-ADC-ACCURACY); pin leakage ±250 nA × the Thevenin resistance; charge sharing 4 pF / 100 nF.

| Rev | R_top (1 %) | R_bot (1 %) | Nominal ratio | 12-bit code | Worst-case band (ratio) |
|---|---|---|---|---|---|
| 1 | 20.0 kΩ | 2.49 kΩ | 0.1107 | 453 | 0.0973–0.1242 |
| 2 | 35.7 kΩ | 10.2 kΩ | 0.2222 | 910 | 0.2059–0.2386 |
| 3 | 14.3 kΩ | 7.15 kΩ | 0.3333 | 1365 | 0.3157–0.3511 |
| 4 | 18.7 kΩ | 15.0 kΩ | 0.4451 | 1823 | 0.4263–0.4639 |
| 5 | 15.0 kΩ | 18.7 kΩ | 0.5549 | 2272 | 0.5361–0.5737 |
| 6 | 7.15 kΩ | 14.3 kΩ | 0.6667 | 2730 | 0.6489–0.6843 |
| 7 | 10.2 kΩ | 35.7 kΩ | 0.7778 | 3185 | 0.7614–0.7941 |
| 8 | 2.49 kΩ | 20.0 kΩ | 0.8893 | 3642 | 0.8758–0.9027 |

Every divider totals 21.4–45.9 kΩ (≥ 20 kΩ, so ≤ 0.18 mA at 3.513 V); Thevenin ≤ 8.3 kΩ. **Decode thresholds** at (k + 0.5) / 9: 12-bit codes 228, 682, 1138, 1592, 2048, 2502, 2958, 3412, 3868. A reading below 0.0556 or above 0.9444 is a strap fault, and firmware refuses audio and reports it. Each band lies strictly inside its thresholds, with a guard ≥ 3.61 % of full scale (≥ 4.18 % at revisions 1 and 8), so the scheme survives an ADC error up to ±4.6 % of full scale. `ANALOG.md` assigned revision 1 to v1; the sources read do not say which code each split board carries. Source: [ANALOG.md §9][an].

## 12. Control positions

Each of the six positions is fitted per effect with a pot or a button ([O-18](decisions.md#o-18), owner). **Pot fit:** a 10 kΩ linear pot (Alpha RV16AF-41 B10K) from VREF_A to GND, its wiper through **R_POS 10.0 kΩ** to **C_POS 100 nF X7R** at the pin (POS1 to POS6, pins 22 to 27). A **button fit** pulls up to 3V3_D and puts nothing on VREF_A ([architecture.md](architecture.md) §4.7). Nominal corner 159 Hz; settling τ (2.5 kΩ worst-case wiper + 10 kΩ) × 100 nF = 1.25 ms. **Sampling:** DS12110 Table 174 gives CADC 4 pF; with 100 nF at the pin the sample comes from the capacitor, and charge sharing costs 3.3 V × 4 pF / 100 nF = 132 µV (0.16 LSB12) per sample. Recharge between samples: the average current f × CADC × ΔV through 12.5 kΩ gives 0.17 mV (0.2 LSB12) at 1 kHz per channel and 1.65 mV (2.0 LSB12) at 10 kHz, so **firmware samples each pot channel at ≤ 10 kHz**. Leakage ±250 nA × 12.5 kΩ = 3.1 mV, a static offset the dead band absorbs. Source: [ANALOG.md §10][an] (v1 figures; the A2 wiper RC is kept, split spec §7.1). The onboard-pull tolerance of these pins on a Seed is in [architecture.md](architecture.md) §4.9.

## 13. The codec domain

### 13.1 What it is

Split spec §5.6.5's `pedal_codec_3v3`: the PCM3060's VDD, its 12.288 MHz oscillator, the codec-side SAI isolation buffer U_ISO_C and the local reset, on the net 3V3_CODEC. Its regulator is fed from the codec's VCC net 5V_A_CODEC (joined to 5V_A through a 0 Ω, v1's R_5VA) on the held-up analog branch. The codec is the clock master: no MCLK comes from the module ([O-2](decisions.md#o-2), owner; [D20](decisions.md#d20), owner-approved). Split spec §7.2 lists the codec changes: IFMD (pin 27) to VDD ("HIGH: Master (256 fS) mode for ADC, slave mode for DAC", SLAS533B), SCKI1/SCKI2 from the oscillator, series resistors at the codec on BCK, LRCK and DOUT (§14.3), the local reset, the I²C links unchanged in form (now reaching the expansion bus on pins 12/13), and the domain isolation (§14.1). Source: [codec-domain.md][cd].

### 13.2 Oscillator ([R-29](decisions.md#r-29))

**U_XO, Epson SG-210STF 12.288000 MHz L (X1G0041710019, LCSC C255992)**, on 3V3_CODEC with **C_XO 100 nF** (Epson asks 0.01–0.1 µF), ST̅ tied to 3V3_CODEC.

| Item | SLAS533B requirement | SG-210STF |
|---|---|---|
| Frequency | 256 fS = 12.288 MHz at 48 kHz; t(SCY) ≥ 25 ns | 12.288000 MHz, 81.4 ns |
| Duty cycle | 40–60 % | symmetry 45–55 % at 50 % VCC, load ≤ 15 pF |
| Levels | VIH 2 V, VIL 0.8 V | VOH ≥ 2.91 V, VOL ≤ 0.34 V at ±4 mA |
| Jitter | not stated ("may influence dynamic performance") | typical only, at 20 MHz: 1.8 ps RMS, 15 ps p-p; no 12.288 MHz figure |

Selection criteria (set by the S1 plan, not data-sheet facts): **stability ≤ ±50 ppm all-inclusive over the operating range, excluding aging** (the L grade is ±50 ppm over −40 to 85 °C including initial tolerance, temperature, supply and load; aging ±3 ppm in the first year is outside it, an offset of 48 kHz × 53 ppm = 2.5 Hz that nothing depends on, since the module slaves to the codec; R-29 records "excluding aging" as an amendment of the criterion); **start-up ≤ 10 ms** (3.0 ms maximum, from 90 % VCC). VCC 1.60–3.63 V; −40 to 85 °C; 1.8 mA maximum unloaded. Package 2.5 × 2.0 mm, four lands at 1.7 × 1.3 mm pitch. **The 15 pF CMOS load is a layout requirement on XO_OUT**, which drives SCKI1 and SCKI2 (SLAS533B gives no SCKI input capacitance): XO_OUT short and point-to-point (open item PEDAL-ANALOG-LAYOUT-RULES), and bring-up checks the duty cycle at SCKI. Budget with the full 15 pF: 15 pF × 3.366 V × 12.288 MHz = 0.62 mA, so **U_XO 2.43 mA**. A stocked alternate, YXC OT3EL4C4JI-111OLP-12.288M (C5203555), needs a footprint change. Source: [codec-domain.md §1][cd].

### 13.3 VDD regulator and the power-down clamp ([R-30](decisions.md#r-30))

**U_CVDD, TI TPS7A2433DBVR (C2866134, SOT-23-5)**, IN on 5V_A_CODEC, OUT on 3V3_CODEC, with C_CVDDIN and C_CVDDOUT 1 µF 16 V X7R (Samsung CL10B105KO8NNNC, C59782). It implements the owner-approved [D22](decisions.md#d22).

| Criterion | Result |
|---|---|
| 3.3 V ±2 % at full load | ±1.25 % (TJ −40 to 125 °C) + line ±0.25 % + load ±0.5 % = ±2.0 %: 3.234–3.366 V, inside VDD 2.7–3.6 V |
| Dropout at 1.5 × the domain current ≤ 5V_A,min − 3.3 − 0.3 V | 1.5 × 17.05 = 25.58 mA; VDO ≤ 160 mV (the 100 mA row bounds every lower current); 4.849 − 3.3 − 0.16 = 1.389 V ≥ 0.3 V |
| Input absolute maximum, derated | 20 V; 5V_A maximum 5.202 V is 26 %, inside R-30's 50 % |
| Stable with ceramic COUT | 1–100 µF ceramic; the 3V3_CODEC bank is ≤ 12.54 µF |
| Rating ≥ 1.5 × the domain current | 200 mA ≥ 25.58 mA |

5V_A's range is 5.024 × 0.975 × 0.99 = 4.849 V to 5.024 × 1.025 × 1.01 = 5.202 V. Thermal: P = (5.202 − 3.234) × 17.05 mA + 5.202 × 0.1 mA = 34 mW, Tj = 85 + 0.0341 × 167.8 = 91 °C ≤ 115 °C.

#### FIG-CVCL

**VDD stays within 251 mV of VCC at power-down at 25 °C (≤ 324 mV at −20 °C).** SLAS533B asks for VDD generated from the VCC supply to avoid latch-up from wrong sequencing. The PMOS pass element tracks the input below regulation and the UVLO disables it, so VDD ≤ VCC while 5V_A rises and regulates. At power-down the codec bank can hold VDD up while 5V_A falls, beyond the LDO's VOUT ≤ VIN + 0.3 V rating, a case SBVS386E §8.1.4 names; the fix is its own Figure 8-1, a Schottky from OUT to IN: **D_CVCL, PMEG4005AEA (C426867), anode on 3V3_CODEC, cathode on 5V_A_CODEC**. Inputs: the bank 12.54 µF; the worst fall 0.457 V/ms (`BYPASS-RELAY.md` §5.4's v1 figure, kept as the bound); the load 0.89 mA. Method: clamp current C × dV/dt less the load, 12.54 µF × 0.457 V/ms − 0.89 mA = 4.84 mA ≤ 10 mA; VF log-interpolated between Table 7's 1 mA and 10 mA rows (R-19's method): ≤ 251 mV at 25 °C, ≤ 324 mV at −20 °C with Fig. 1's typical 1.62 mV/K tempco (270 and 343 mV on the 10 mA row alone, which covers falls up to 0.87 V/ms). On the split VIN_A falls at ≤ 0.232 V/ms while the TPS7A49 conducts, so D_CVCL carries ≤ 2.02 mA there ([codec-domain.md §7][cd], from `power-fail.md` §5 and §8). **A recorded exception** (R-30): below about −5 °C, VDD − VCC can exceed the LDO's rating by **≤ 24 mV** at −20 °C, only with the pass FET off (VIN below UVLO, 1.85–2.25 V) and the codec held in reset; the rating stands in for body-diode current, nA at 0.34 V. **R_CBLD 3.60 kΩ ±1 % (Uniroyal 0603WAF3601T5E, C22980)** to GND sinks ≥ 3.234 V / 3.636 kΩ = 0.889 mA, above D_CVCL's 0.86 mA hot-leakage allowance, so the regulator keeps control in reset (3.9 kΩ would sink only 0.82 mA); it costs ≤ 0.95 mA. Source: [codec-domain.md §2][cd]. Paper analysis of an unbuilt board; the measurement is open item POWER-FAIL-SEQUENCE-CHECKS.

*Not in force:* the exception's onset "below about 6.5 °C" (the 10 mA row's basis, with 43 mV of excess at −20 °C), corrected to about −5 °C by [R-53](decisions.md#r-53).

### 13.4 Local reset

The realisation is [EC-CODEC-RESET](#ec-codec-reset). U_CRST (C1852114, SOT-23-3) has its VDD on 3V3_CODEC with **C_CRST 100 nF** and its open-drain RESET̅ on CODEC_RST_N (PCM3060 pin 15), with R_CRST to 3V3_CODEC: SLVSES2J §9.2's own example. Q_PFR asserts RST in the same nanoseconds as the relay override (R-PF-11) and stays fully on until 3V3_CODEC is below U_CRST's 2.871 V, after which U_CRST holds RST.

#### FIG-CODEC-RST

**RST released ≥ 2.58 V at 85 °C (2.74 V at 25 °C, 2.29 V at U_CRST's release threshold); asserted, R_CRST draws 0.72 mA.** Inputs: VIH 2 V (TTL Schmitt, 5 V tolerant); the codec's internal pull-down, 50 kΩ typical and IIH ≤ 100 µA at VDD (25 °C), so ≥ 33.0 kΩ, × 0.8 for temperature = 26.4 kΩ (an allowance, R-31); VDD minimum 3.234 V; R_CRST 4.70 kΩ at +1 % = 4.747 kΩ; leakage 40.35 µA (TLV803E 0.35 µA plus Q_PFR's AO3400A IDSS allowance of 40 µA at 85 °C, from 1 µA at 25 °C and 5 µA at TJ 55 °C, doubling per 10 K). Method: the divider 3.234 × 26.4 / (4.747 + 26.4) = **2.741 V**, less the leakage across R_CRST: **2.579 V**; at VIT+ minimum 2.897 V: 2.293 V. Asserted: 3.366 V / 4.653 kΩ = 0.72 mA, inside the TLV803E's VOL ≤ 0.3 V at 2 mA, and ≤ 48 mΩ × 0.72 mA = 35 µV across Q_PFR. Below VDD = 2 V, RST ≤ VDD < VIH, so the codec cannot leave reset early. Fitted, v1's R_RST_PD 10 kΩ would put RST anywhere from 1.83 V to 2.30 V, straddling VIH, so it stays not fitted. Source: [codec-domain.md §3][cd]. Paper analysis of an unbuilt board.

**Delay.** tD (variant A) is 130 ms minimum (270 maximum) over −40 to 125 °C. The need is XO start-up 3.0 ms + tRST 2048 / 48 kHz = 42.7 ms = 45.7 ms: 84 ms of margin. U_CRST counts from VDD > VIT+, which can sit just below the oscillator's t = 0 (90 % VCC), so the gap is bounded by the whole VDD ramp, at most 5V_A's soft start (14 ms nominal, a 28 ms allowance, R-31): 73.7 ms ≤ 130 ms. If VIN_A rises more slowly, VDD tracks it in dropout, but the window that matters is only VDD from 2.897 V to about 3.03 V, and the oscillator runs from 1.6 V, so it is already oscillating through it. **Threshold:** VIT− 2.93 V ±2 % = 2.871–2.989 V; VIT+ ≤ 3.033 V; start-up margin 3.234 − 3.033 = 0.201 V (the EA30 would leave 0.045 V); dip headroom 0.245 V; trip 0.171 V above the codec's 2.7 V floor. This holds the conservative bound adopted for the PCM3060's power-on reset (open item PCM3060-POR-XO-START).

### 13.5 The domain's budget

| Load on 3V3_CODEC | mA | Basis |
|---|---|---|
| PCM3060 IDD | 12 | SLAS533B maximum at 48 kHz ADC + DAC (25 °C, 3.3 V), taken to 85 °C and 3.366 V as an allowance ([R-53](decisions.md#r-53)); 9 mA typical |
| U_XO | 2.43 | §13.2 |
| U_ISO_C and the codec's drive into the SAI biases | 0.94 | [crossings.md §2.4][cx] |
| R_CRST (asserted) | 0.73 | 3.366 V / 4.653 kΩ |
| R_CBLD | 0.95 | §13.3 |
| **Total** | **17.05** | × 1.5 = 25.58 mA against 200 mA |

The input side on 5V_A and VIN_A is 17.05 + 0.1 mA (U_CVDD's ground current, an allowance from a typical figure) = **17.15 mA**. 5V_A carries 43.6 + 17.15 = 60.75 mA; the TPS7A49's dissipation at 12 V and 18 V with it, and [R-32](decisions.md#r-32)'s conclusion that both junction limits lie above the processor-limited envelope, are in [power.md](power.md) §7. The 9 V to 12 V operating range holds Tj ≤ 115 °C even at 85 °C ambient. Source: [codec-domain.md §4, §5][cd].

*Not in force:* the domain current 16.66 mA (16.76 mA on 5V_A, 60.36 mA in all) with R_CRST 10.0 kΩ, as split spec §7.3's note records it.

### 13.6 Parts

| Label | Part | LCSC | Package |
|---|---|---|---|
| U_CVDD | TI TPS7A2433DBVR | C2866134 | SOT-23-5, 0.95 mm |
| U_XO | Epson X1G0041710019 (SG-210STF 12.288000 MHz L) | C255992 | 2.5 × 2.0 mm, 4 lands |
| U_CRST | TI TLV803EA29DBZR | C1852114 | SOT-23-3, 0.95 mm |
| D_CVCL | Nexperia PMEG4005AEA,115 | C426867 | SOD-323 |
| R_CRST | 4.70 kΩ ±1 % 0603, Uniroyal 0603WAF4701T5E | C23162 | 0603 |
| R_CBLD | 3.60 kΩ ±1 % 0603, Uniroyal 0603WAF3601T5E | C22980 | 0603 |
| C_CVDDIN, C_CVDDOUT | 1 µF 16 V X7R, Samsung CL10B105KO8NNNC | C59782 | 0603 |
| C_XO, C_CRST | 100 nF 50 V X7R, Murata GRM188R71H104KA93D | C77055 | 0603 |

None has a pin on 3V3_D or VREF_A, so none needs an interface load role. U_CRST's fallbacks are the EA29 with the R pinout (C1852118; pin 1 RESET̅, 2 GND, 3 VDD) and the EA30 (C5218924), which leaves only 45 mV of start-up margin. Stock was read on 2026-10-06 and is decided at the PCBWay quote (open item POWER-PARTS-STOCK). Source: [codec-domain.md §6][cd].

## 14. Domain crossings

### 14.1 The crossings

The two 3.3 V domains, `pedal_codec_3v3` and `module_3v3`, are separate and do not rise and fall together: the codec domain, on the held-up analog branch, outlives the module's 3V3 at power-down. SLAS533B does not guarantee static or high-impedance outputs in reset, so the pedal isolates all four SAI nets with buffers powered from the receiving side and specified for partial power-down (TI SN74LVC3G34DCTR toward the module, SN74LVC1G34DBVR toward the codec, 47 kΩ bias on each input); codec reset on a power-fail trip is kept, but is not the protection. The requirement (IF-PD-1), the module-side and codec-side limits, and the table of every crossing with its protection and paper analysis are in [architecture.md](architecture.md) §4.8 ([RR-2](decisions.md#rr-2), [R-10](decisions.md#r-10), [R-14](decisions.md#r-14)). This section carries what that table leaves out: the SAI timing, the codec-side resistors and the VBUS plug-in edge.

### 14.2 SAI timing at BCK = 3.072 MHz

**Edges** ([R-9](decisions.md#r-9)). SLAS533B: "DIN is sampled on the rising edge of BCK2, and DOUT is changed on the falling edge of BCK1." RM0433 Rev 8 §51.6.2, CKSTR = 1: signals generated by the SAI change on SCK's falling edge and received signals are sampled on its rising edge. With **CKSTR = 1 in both SAI2 blocks**, every path launches on one BCK edge and is captured on the opposite edge, and the half period is the codec's minimum pulse width, 0.4 t(BCY) = 0.4 × 325.52 = **130.21 ns**, not T/2. With IFMD high the DAC is slave, so DIN, LRCK2 and BCK2 meet SLAS533B Figure 24 (its t(DIS) and t(DIH) equal Figure 25's 10 / 10 ns) ([R-57](decisions.md#r-57)).

**Path delays:**

| Term | Min | Max | Source |
|---|---|---|---|
| 33 Ω at the codec into U_ISO_M's input node | 0 | 0.80 ns | R × 1.01 × 20 pF × ln(1/0.3) |
| U_ISO_M, SN74LVC3G34 tpd, 3.3 V ± 0.3 V, −40 to 125 °C | 1.4 ns (an allowance: SCES366L gives tpd only at its 50 pF / 500 Ω test load) | 5.1 ns | SCES366L §6.6 |
| 470 Ω between U_ISO_M and the module pin ([R-10](decisions.md#r-10)) | 0 | 11.43 ns | R × 1.01 × 20 pF × ln(1/0.3) |
| U_ISO_C, SN74LVC1G34 tpd | 1.0 ns (CL 15 pF, −40 to 85 °C) | 4.7 ns (CL 30/50 pF, −40 to 125 °C) | SCES519O §5.6, §5.8 |
| Header and trace, per traversal ([R-6](decisions.md#r-6)) | 0 | 2 ns | an engineering allowance: no Seed-side path length is published |

The RC terms run to the far CMOS threshold (VIH 0.7 VDD, VIL 0.3 VDD; DS12110 Table 60), so τ × ln(1/0.3) = 1.20 τ. The **20 pF node allowance** ([R-10](decisions.md#r-10)) covers CIO 5 pF typical (no maximum is given) plus the module trace, the socket and header and the Seed's routing, none published. BCK and data take the buffer's minimum and maximum independently (no channel-to-channel skew is given). The 2 ns applies once on each codec-to-module path and twice on DIN (clock out, data back).

#### FIG-SAI-MARGINS

**Setup margin ≥ 75.28 ns, hold margin ≥ 110.28 ns.** Inputs: T = 325.52 ns; tw = 130.21 ns; codec-to-module delay 17.33 ns maximum, 1.40 ns minimum; SLAS533B t(DOD) and t(LRD) 0–30 ns; DS12110 Table 108 (rev Y) slave figures tsu(FS) 7, th(FS) 1, tsu(SD) 1, th(SD) 2, tv(SD_ST) 17 maximum, th(SD_ST) 7 minimum (Table 207, rev V, gives 14 and 9, no worse; DS12556 Table 106 is identical).

| Path | Formula | Margin |
|---|---|---|
| DOUT setup | tw + 1.40 − (t(DOD) 30 + 17.33 + 2) − tsu(SD) 1 | 81.28 ns |
| LRCK setup | tw + 1.40 − (t(LRD) 30 + 17.33 + 2) − tsu(FS) 7 | **75.28 ns** |
| DIN setup | tw − (17.33 + 2 + tv(SD_ST) 17 + 2 + 4.7) − t(DIS) 10 | 77.18 ns |
| DOUT hold | tw + t(DOD) 0 + 1.40 − (17.33 + 2) − th(SD) 2 | **110.28 ns** |
| LRCK hold | tw + t(LRD) 0 + 1.40 − (17.33 + 2) − th(FS) 1 | 111.28 ns |
| DIN hold | tw + 1.40 + th(SD_ST) 7 + 1.0 − t(DIH) 10 | 129.61 ns |
| LRCK2 setup at the slave DAC | tw − (t(LRD) 30 + 0.80) − t(LRS) 10 | 89.41 ns |
| LRCK2 hold at the slave DAC | tw + t(LRD) 0 − 0.80 − t(LRH) 10 | 119.41 ns |

Even a 0 ns minimum for U_ISO_M leaves DOUT hold at 108.9 ns. The longest one-way codec-to-module delay the crossing adds is 19.33 ns. BCK 3.072 MHz is under Table 108's slave clock limit of 128 × fS, and BCK2's 130.21 ns minimum pulse and 325.52 ns period clear Figure 24's 35 ns and 75 ns. The slowed module-side edges (about 11 ns to threshold) shorten a BCK pulse as the SAI sees it by at most (1.20 − 0.36) τ = 8 ns, leaving ≥ 122 ns. The margins are ≥ 75 ns, so the 2 ns header allowance could be 30 times larger before one closed. Source: [crossings.md §1][cx]; [S1 ledger R-6, R-9, R-57][ledger]. Paper analysis of an unbuilt board; open item SAI-ACROSS-HEADER, and layout rules SAI-LAYOUT-RULES.

### 14.3 Codec-side series resistors

SLAS533B gives VOH ≥ 2.8 V at −4 mA from VDD 3.3 V, so the codec's output resistance is at most 125 Ω (no typical is published). U_ISO_M sits beside the codec, so the trace to it is short against BCK's edge length and behaves as a lumped load: the resistor only damps ringing and slows edges into U_ISO_M's 3.5 pF input. Split spec §5.5 gives 22–33 Ω; the upper value damps more and costs 0.8 ns: **33 Ω on BCK, LRCK and DOUT** at the codec. These are for signal integrity only, not the domain protection. Source: [crossings.md §3][cx].

### 14.4 VBUS at a USB-C plug-in

The VBUS-sense divider (12.0 kΩ over 20.0 kΩ, 1 %) holds pin 31 (PA1) at ≤ 3.498 V in steady state with VBUS at 5.50 V taken 1 % high ([architecture.md](architecture.md) §4.8). That is steady state only.

#### FIG-VBUS-HOTPLUG

**A lossless ring bounds VBUS at 11.11 V and PA1 at 7.00 V, past the 4.0 V an unpowered module's FT pin accepts.** Inputs: VBUS 5.555 V (5.50 V + 1 %; the USB Type-C vSafe5V maximum as the USB-IF ECN "USB 2.0 VBUS Max Limit" quotes it; the Type-C specification itself was not read); the divider's highest ratio 20.2 / (11.88 + 20.2) = 0.63. Method: a lossless series LC driven by a step peaks at twice the step, 2 × 5.555 = 11.11 V; × 0.63 = 7.00 V (each 1 V on VBUS adds 0.63 V at PA1). The only clamp on the pedal's VBUS is the USBLC6-2's VBUS-to-GND Zener, whose breakdown sits above 5.5 V by design, so it does not hold PA1 under 4.0 V at that bound. Whether a real plug-in reaches the bound depends on the host's source impedance and capacitance and the cable's L and R, which no document read gives. **Option C_VBUS:** 100 nF X7R (C1591) from PA1 to GND, taken at 38.25 nF (−10 % × 0.85 × 0.5), with the divider's 7.46 kΩ Thevenin, keeps PA1 ≤ 3.6 V for 8.4 µs and ≤ 4.0 V for 44 µs of VBUS held at 11.11 V; a ring spends only part of each cycle near its peak. This document's reconstruction of that method: τ = 7.46 kΩ × 38.25 nF = 285 µs, rising from the steady 3.498 V toward 7.00 V; 3.6 V is reached at τ × ln(3.502 / 3.400) = 8.4 µs and 4.0 V at τ × ln(3.502 / 3.000) = 44 µs, which reproduces the source's figures; they are consistent with a start from the steady-state level (the source's prose does not state its start condition). A real plug-in starts from VBUS ≈ 0 V, so PA1 starts near 0 V, and the 3.498 V start is the shorter, conservative window: from 0 V the 3.6 V window is τ × ln(7.00 / 3.40) ≈ 206 µs and the 4.0 V window τ × ln(7.00 / 3.00) ≈ 242 µs (this document's arithmetic). Source: [crossings.md §4, §8][cx]; [S1 ledger R-57][ledger]. Paper analysis of an unbuilt board; **open item VBUS-HOTPLUG** (the module design shows PA1 ≤ 3.6 V from a host and cable model, or fits C_VBUS), and the bring-up scope of PA1 at a plug-in is in IF-PD-1-MEASURE.

## 15. What did not cross

- `ANALOG.md`'s designator map and its v1 schematic references (U9, R31 and the like): the v1 schematic is not an authority.
- `ANALOG.md` §0's datasheet SHA-256 prefixes and §13's stock table: the documents are cited by name and revision here; the stock figures are dated observations of 2026-10-01, and availability is decided at the PCBWay quote ([OWN-07](decisions.md#own-07)).
- The solid-state output mute (`ANALOG.md` §7.2–§7.3), removed by the owner on 2026-10-04 ([OWN-01](decisions.md#own-01)); one finding carried over: the BSS138's on-resistance at a 3.3 V gate is typical only, which is why the relay driver is an AO3400A.
- The calculators and tests behind the S1 figures (the VREF_A, codec-domain and crossings analysis modules in the pedals repository): no code crosses. Each figure above carries its inputs and method so phase 2 can re-derive it against this repository's model.

## 16. Open items this document raises

In [open-items.md](open-items.md): VDDA-WIDEBAND, VBUS-HOTPLUG, VREF-A-NOISE-MEASURE, VREF-A-LOAD-ALLOWANCES, VDDA-DAMPING-LEG, VREF-A-BLEEDER-DECISION, PEDAL-ANALOG-PARTS-TO-MODEL, PEDAL-ANALOG-LAYOUT-RULES, FIRMWARE-ANALOG-OBLIGATIONS, ANALOG-CODEC-GAIN-AND-INPUT, ANALOG-CODEC-OVERLOAD-AND-RESET, ANALOG-PASSBAND-ASSUMPTIONS, JACK-ESD-SYSTEM, ANALOG-NOISE-MEASURE, HW-REV-ADC-ACCURACY, CODEC-DOMAIN-BRINGUP. It also relies on rows other documents raised: ANALOG-HEADROOM-9V, VREF-A-BACKFEED-GATE, SEED-PIN21-CAPACITANCE, SEED-PIN21-NOISE, MODULE-BUCK-LOOP-STARTUP, 3V3D-RIPPLE-INTO-VREF-A, PCM3060-POR-XO-START, POWER-FAIL-SEQUENCE-CHECKS, POWER-FAIL-REPLACEMENT-MEASURE, IF-PD-1-MEASURE, SAI-ACROSS-HEADER, SAI-LAYOUT-RULES, PEDAL-POWER-PARTS-TO-MODEL, POWER-PARTS-STOCK, FB-AN2606.

[an]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/ANALOG.md
[vref]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/vref-a.md
[cd]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/codec-domain.md
[cx]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/crossings.md
[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
[ledger]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-05-h7-split-rulings.md
