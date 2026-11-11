# h7-platform bypass relay

Ported from:
- [h7-platform/BYPASS-RELAY.md][br]: the status line and owner decision, §0 to §12 (the relay bypass as designed and approved for the one-board v1)
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §7.4 (the power-fail replacement and its requirements R-PF-1 to R-PF-11), §7.5 (the pedal digital rail and the `BYPASS-RELAY.md` implications), and the passages that amend this note: §5.6.5 (the power-fail sequence), §7.1, §8, §9.1, §9.3, §11
- [h7-platform/interface-analysis/power-fail.md][pf]: §5, §6 (the relay override and the codec reset on a trip, R-PF-4 and R-PF-11), §7, §8, §9, §11 (how the R-PF items were met on paper)
- [2026-10-05-h7-split-rulings.md][ledger] (the S1 rulings ledger): R-13, R-37, R-38, R-40, R-57, and the entries linked below through [decisions.md](decisions.md)

This document describes the bypass relays of the STM32H743 digital pedal platform (h7-platform) after the split into a processor module (h7-module) and an audio pedal board (h7-pedal): what the relays connect, why the jacks are wired straight through whenever the pedal is unpowered, how the relays are driven, what happens to them on a power-fail, and what firmware must do around them. The relays, their drive and the power-fail override are all on the h7-pedal. It records the design as it stood in the pedals repository at commit `5b926d0`. Nothing here has been built, modelled or drawn in this repository.

**Every figure in this document is paper analysis of a board that has not been built.** Each figure states its inputs and its method beside it, and links the pedals analysis it came from. Temperature-dependent part figures are claimed from −20 °C to 85 °C ([R-20](decisions.md#r-20)) unless a row says otherwise.

Decisions are linked by anchor into [decisions.md](decisions.md). An owner decision is labelled "owner"; everything else there is a controller ruling, which the owner may override. Open items are rows in [open-items.md](open-items.md), named here by their Id. Facts other documents already state are linked rather than restated: the supervisor, its trip points, the hold-up timing and the module load switch are in [power.md](power.md) §3; the coil rail 3V3_P and the coil-voltage check are in [power.md](power.md) §6.1; the gate pull-down criterion and RELAY_EN's pin are in [architecture.md](architecture.md) §4.5 and §4.9; the pop the relays prevent and the analog stages either side of them are in [analog.md](analog.md) §8; the codec's local reset is [analog.md](analog.md) EC-CODEC-RESET.

## How the pre-split note is carried

`BYPASS-RELAY.md` was written for v1, one board with one 3.3 V buck, before the split. Its text uses pre-split names. The split spec says what changes (§7.5, "`BYPASS-RELAY.md` implications (amended in the plan, not here)"; §8, `circuit/bypassRelay.ts` "Reworked: relays and suppressors carried; coil rail is the pedal digital rail; supervisor and gate override reworked"). At the pinned commit `BYPASS-RELAY.md` itself carries only one of those amendments, a dated note in §3.3; the others were made in the S1 analyses. This document applies all of them. A figure below that is v1's and has no split re-derivation says "v1 figure".

| Pre-split (`BYPASS-RELAY.md`) | After the split | Set by |
|---|---|---|
| Coils, suppressor Zeners on **3V3_D** (the MCU's buck) | On the pedal digital rail **3V3_P**, never on pin 38 and never on VIN_A | split spec §7.5; [RR-3](decisions.md#rr-3), [R-25](decisions.md#r-25) |
| Drive pin **PI5**, the former MUTE net, renamed RELAY_EN | **RELAY_EN** on contract pin 8 (PG10), a module output across the interface | [architecture.md](architecture.md) §4.3, §4.5 |
| R_BG 100 Ω gate series resistor | **R_RELAY_EN 3.9 kΩ** | [R-13](decisions.md#r-13) |
| R_BPD 100 kΩ gate pull-down | **R_BPD 15.0 kΩ** | [R-13](decisions.md#r-13), amended by [R-57](decisions.md#r-57) |
| VIN_PROT, the one supply node after D1 | **VIN_A**, the isolated, held-up analog branch | [power.md](power.md) §3; [R-35](decisions.md#r-35) |
| U_PF on VIN_PROT, RESET on BUCK_EN: the power-fail shed of the buck | U_PF senses VIN at the jack and drives PF_OK only; an inverter's PF_TRIP pulls the relay gate low through **Q_PFG** and asserts the codec reset through **Q_PFR** | split spec §7.4 (R-PF-4, R-PF-11); [O-6](decisions.md#o-6); [R-36](decisions.md#r-36), [R-37](decisions.md#r-37), [R-40](decisions.md#r-40) |
| 3V3_D budget 915 + 114 = 1,029 mA | The coils leave the module's budget; 3V3_P carries them | split spec §7.5; [power.md](power.md) §5.1, §6.1 |
| "Firmware ramps the DAC around every change", "watchdog on" | Unchanged | split spec §11 ("Unchanged contracts: RELAY_EN sequencing and watchdog (`BR` §4)") |

*Not in force:* the coils and the suppressor Zeners on 3V3_D (`BYPASS-RELAY.md` §1, §2.1, §3.1, §3.3), replaced by 3V3_P under split spec §7.5 and [R-25](decisions.md#r-25).

*Not in force:* the v1 gate network, R_BG 100 Ω from PI5 and R_BPD 100 kΩ (`BYPASS-RELAY.md` §3.3; `SCHEMATIC-CHECKLIST.md` AIO-20 as replaced by `BYPASS-RELAY.md` §9), replaced on the split pedal by [R-13](decisions.md#r-13).

*Not in force:* the v1 power-fail shed: U_PF (TPS3808G01) on VIN_PROT through 174 kΩ over 10.0 kΩ, its open-drain RESET on BUCK_EN, tripping at 7.288–7.616 V (7.452 V nominal) and releasing at ≤ 7.84 V 12–28 ms later, so the buck stopped and the analog load alone drained the bulk (`BYPASS-RELAY.md` §3.4, §5.4; checklist item PWR-18 as `BYPASS-RELAY.md` §9 wrote it). The owner approved it with the note on 2026-10-04 (`BYPASS-RELAY.md` status line: "approved by the owner on 2026-10-04 and implemented"; split spec §9.1's Owner decisions table, row "Relay bypass (2026-10-04) and the power-fail shed"); split spec §9.1 records that "The approved shed is replaced by §7.4, which the owner directed (O-6)". See [O-6](decisions.md#o-6) and [OWN-01](decisions.md#own-01).

*Not in force:* v1's relay margins after the shed's trip, +3.1 ms at 9 V and −0.2 ms at 12 V in the worst-case stack, and the "≤ 0.10 V" tick at 12 V (`BYPASS-RELAY.md` §5.4, §12). They are a record of v1 only (split spec §14 R-13); the split's margins are in [power.md](power.md) §3.4.

*Not in force:* "3V3_D budget becomes 1,029 mA" (`BYPASS-RELAY.md` §3.2), replaced by the module budget of split spec §5.6.2 and a separate 3V3_P budget ([power.md](power.md) §5.1, §6.1).

## 1. Effective constraints

### EC-UNPOWERED-BYPASS

**Whenever the pedal has no steady power, each input jack is wired straight to its output jack through two relay contacts, and nothing else touches the signal.** The relays are non-latching (single-side stable): with no coil current they rest on their break (NC) contacts, and those contacts are the bypass path. Bypass is also the mute state; there is no other output mute.
- **Set by:** [OWN-01](decisions.md#own-01) (owner, 2026-10-04: "The stereo outputs get a relay that holds the pedal in **bypass** (each input jack wired straight to its output jack) whenever there is no steady power. Bypass is the mute state", `BYPASS-RELAY.md`, "Owner decision (2026-10-04)").
- **Amended by:** none. Split spec §9.1: "Relay bypass unchanged."

### EC-RELAY-PART

**Two Omron/ARATAS G6K-2F-Y DC3 relays (DPDT, surface mount, 3 V coil, non-latching): K_BYP_IN switches both inputs, K_BYP_OUT both outputs.** K106-E1-11 is the catalogue number of the G6K data sheet, not a different relay (`BYPASS-RELAY.md` §0; [power-fail.md §0][pf]). Each coil has a 1N4148W + BZT52C12 suppressor; one AO3400A, Q_BYP, switches both coils low-side.
- **Set by:** `BYPASS-RELAY.md` §1 and §3, the note the owner approved on 2026-10-04 ("Status: approved by the owner on 2026-10-04", recorded in [OWN-01](decisions.md#own-01)).
- **Amended by:** split spec §8 ("relays and suppressors carried"); the coil rail moves to 3V3_P ([EC-COIL-RAIL](#ec-coil-rail)).

### EC-COIL-RAIL

**The coils and their suppressor Zeners are on the pedal digital rail 3V3_P, 3.274–3.513 V**, a TPS62933F (U_PRAIL) fed from VIN_MOD, never from VIN_A and never from pin 38. The coil-voltage check at this range (must-operate, maximum, and the ambient the claim holds to) is in [power.md](power.md) §6.1, "Coils at the rail minimum".
- **Set by:** split spec §7.5 ([RR-3](decisions.md#rr-3)); [R-25](decisions.md#r-25).
- **Amended by:** [R-44](decisions.md#r-44), [R-45](decisions.md#r-45), [R-52](decisions.md#r-52), [R-58](decisions.md#r-58) (3V3_P's EN network, which holds the coil supply off until after Q_MSW's switch-on ramp, [power.md](power.md#ec-qpen-reset)).

### EC-RELAY-GATE

**Q_BYP's gate is driven from RELAY_EN through R_RELAY_EN 3.9 kΩ, pulled to GND by R_BPD 15.0 kΩ, and pulled low on a power-fail trip by Q_PFG.** High on RELAY_EN = effect engaged (coils energised); low, high-impedance, in reset or unpowered = bypass.
- **Set by:** `BYPASS-RELAY.md` §3.3 and §3.5 (the drive and the polarity); [R-13](decisions.md#r-13) (the split values); split spec §7.4 R-PF-4 (the override).
- **Amended by:** [R-57](decisions.md#r-57) (the gate-tolerance criterion with the series terms, 87.4 kΩ, [architecture.md](architecture.md) §4.9); [R-37](decisions.md#r-37) (the override is an N-MOSFET, Q_PFG, driven by an inverter, not the supervisor's own pin).

*Not in force:* "R_x,min = 15 kΩ × (3.513 / 0.5 − 1) = 90.4 kΩ" (`BYPASS-RELAY.md` §3.3's split amendment and R-13 as first written), restated with the series terms by R-57 as 87.4 kΩ.

### EC-POWER-FAIL-OVERRIDE

**On a power-fail trip the relay gate is pulled low and the codec reset asserted together, independent of the processor, while the held-up analog branch keeps the output stage steady until the output relay's contacts are open.** U_PF's open-drain RESET drives only PF_OK; U_PFINV (SN74LVC2G14 on 5V_A) channel A makes PF_TRIP, which drives Q_PFG (relay gate), Q_PFR (CODEC_RST_N), Q_VDIS (VIN_MOD discharge) and Q_PEN (3V3_P's EN).
- **Set by:** [O-6](decisions.md#o-6) (owner: the hold-up replacement); split spec §7.4 R-PF-4 and R-PF-11; [RR-11](decisions.md#rr-11) (Q-6: the supervisor also drives the codec reset).
- **Amended by:** [R-37](decisions.md#r-37) (RESET fan-out through an inverter and N-MOSFETs); [R-40](decisions.md#r-40) (the dual inverter, PF_TRIP and PF_ON, 100 kΩ pull-downs); [R-58](decisions.md#r-58) (Q_PEN on PF_TRIP).

*Not in force:* split spec §7.4's sketch, "Power-fail supervisor: senses upstream of the isolation; its open-drain output pulls the relay gate low directly and asserts codec RST", with one supervisor pin on both nodes. [R-37](decisions.md#r-37) found that joining them puts 1.98 V on the relay gate through the codec's reset pull-up with RELAY_EN high-impedance ("relays engage uncommanded") and drags CODEC_RST_N to 0.78 V with RELAY_EN low ([S1 ledger R-37][ledger]).

### EC-FIRMWARE-RELAY-CONTRACT

**Firmware keeps RELAY_EN low until the codec is clocked and settled and at least 2.5 s have passed since power-up, ramps the DAC to zero around every relay change with 10 ms for the contacts, and keeps the independent watchdog enabled** (§6).
- **Set by:** `BYPASS-RELAY.md` §4.
- **Amended by:** none. Split spec §11: "Unchanged contracts: RELAY_EN sequencing and watchdog (`BR` §4)"; "Firmware outputs digital silence until FS is running and the codec has settled (`BR` §4 holds unchanged)".

## 2. Topology

### 2.1 Nets and contacts

Per channel x = L, R (`BYPASS-RELAY.md` §2.1; the circuits either side are unchanged by the split, split spec §7.1):

| Net | Connects |
|---|---|
| IN_TIP_x | Input jack tip, its jack ESD diode, **K_BYP_IN COM** |
| FX_IN_x | K_BYP_IN NO → R_RF_x and the front end ([analog.md](analog.md) §6) |
| BYP_x | K_BYP_IN NC ↔ K_BYP_OUT NC: the bypass link |
| FX_OUT_x | The output stage's C_DC_x on its jack side, R_B_x 100 kΩ bleed, the output test pad, **K_BYP_OUT NO** |
| OUT_JACK_x | Output jack tip, its jack ESD diode, **K_BYP_OUT COM** |
| RELAY_DRV | Coil pin 8 of both relays, Q_BYP drain |

G6K-2F-Y terminals (K106-E1-11, "Terminal Arrangement/Internal Connections", top view): **1 = coil +, 8 = coil −; 3 and 6 = COM; 2 and 7 = NC (break); 4 and 5 = NO (make).** The coil is polarised. OSCAR wires the same pins the same way (`BYPASS-RELAY.md` §8).

- **K_BYP_IN:** pole A pin 3 = IN_TIP_L, pin 2 = BYP_L, pin 4 = FX_IN_L; pole B pin 6 = IN_TIP_R, pin 7 = BYP_R, pin 5 = FX_IN_R.
- **K_BYP_OUT:** pole A pin 3 = OUT_JACK_L, pin 2 = BYP_L, pin 4 = FX_OUT_L; pole B pin 6 = OUT_JACK_R, pin 7 = BYP_R, pin 5 = FX_OUT_R.
- **Coils:** pin 1 of both relays on 3V3_P; pin 8 of both on RELAY_DRV.
- **Suppressor, per coil:** 1N4148W anode on RELAY_DRV (coil pin 8), its cathode to the BZT52C12 cathode, the Zener's anode on 3V3_P (coil pin 1). While the coil is on, the diode is reverse-biased and the branch carries nothing; at turn-off the drain flies up and is clamped at 3V3_P + VF + VZ.

```text
 IN_TIP_L -+- jack ESD          K_BYP_IN pole A                K_BYP_OUT pole A         +- jack ESD
           +----------- COM -- NC ------- BYP_L ------------- NC -- COM ---------------+- OUT_JACK_L
                         +- NO -- FX_IN_L - R_RF_L - front end (analog.md)
                                        output stage (analog.md) - C_DC_L - FX_OUT_L - NO -+
                                                                        R_B_L 100k -+
 (R channel identical on pole B of each relay.)

 3V3_P -+- K_BYP_IN coil (1 -> 8) --+- RELAY_DRV - Q_BYP drain     Q_BYP: AO3400A, source GND
        |  BZT52C12 - 1N4148W ------+                               gate <- R_RELAY_EN 3.9k <- RELAY_EN (pin 8, PG10)
        +- K_BYP_OUT coil (1 -> 8) -+  (own BZT52C12 - 1N4148W)     gate - R_BPD 15.0k - GND
                                                                    gate - Q_PFG drain (gate PF_TRIP), source GND
```

### 2.2 What each state connects

| State | When | Output jacks see | Effect input sees |
|---|---|---|---|
| **Bypass** (coils off) | §3's list | Their own input jack, through two NC contacts, each ≤ 100 mΩ (K106-E1-11, at 10 mA, 1 VDC) | FX_IN_x floating behind R_RF, held at 0 V DC by R_PD 22 MΩ and C_RF 100 pF; the converter sees near-silence |
| **Engaged** (coils on) | Firmware sets RELAY_EN high | FX_OUT_x, the output stage, through one NO contact | Its input jack |

- **Normalling works in bypass.** The right input's tip-normal contact joins IN_TIP_R to IN_TIP_L with no plug in the right input, upstream of the relays, so a mono source reaches both outputs in bypass as it does when engaged.
- **Mono and stereo switch together:** four signal paths, one drive.
- **Inputs and outputs on different relays** (OSCAR's arrangement) keep the effect output and the effect input out of one relay body, so no output-to-input coupling path exists inside a relay.
- **The output side is at 0 V DC in both states.** C_DC, R_B and the output test pad are on FX_OUT_x, so R_B holds the NO contact at 0 V DC, and bring-up sees the output stage in either relay state.

### 2.3 Why the inputs are switched too

`BYPASS-RELAY.md` §2.3, v1 figures, circuits unchanged by the split:
1. **Unpowered bypass must be a wire.** Unpowered, the input stage's clamp engages above about 1.3 V at the jack; with an unswitched input a hot pickup's peaks would push current through C1 (110 pF) into an unpowered op-amp's ESD diodes while the guitar plays through bypass, a nonlinear load on the bypass signal.
2. **Loading in bypass.** Unswitched, the guitar would always see the front end's 2.25 MΩ and 185 pF. Switched, it sees only the jack ESD diode (19 pF typical) and the open NO contact.
3. **It is what the reference designs do** (§8).

The jack ESD diodes stay on the jack nets, so ESD protection is the same in both states.

## 3. The unpowered state, and every way to reach bypass

A non-latching relay "returns to its rest contacts whenever coil current stops, for any reason" (`BYPASS-RELAY.md` §1). The G6K-2F-Y DC3 must release once its coil voltage falls to 10 % of nominal, 0.3 V (K106-E1-11); with Q_BYP off, RELAY_DRV sits at 3V3_P through the suppressor and the coil sees 0 V. So bypass is reached by physics, not by firmware, in each of these cases:

| Case | Why the coils are off | Where it is shown |
|---|---|---|
| **No power at the jack** | No coil supply at all | — |
| **Power-up, until firmware engages** | RELAY_EN (PG10) is analog/high-impedance through reset, so R_BPD holds the gate low; 3V3_P itself starts only ≥ 230 ms after U_PF releases; firmware then holds bypass ≥ 2.5 s | [architecture.md](architecture.md) §4.5; [power.md](power.md) §9, [EC-QPEN-RESET](power.md#ec-qpen-reset) |
| **MCU reset, brown-out, watchdog reset, ROM DFU, firmware crash** | Any reset puts the pin high-impedance; a hung program ends in a watchdog reset | `BYPASS-RELAY.md` §4 item 7; [architecture.md](architecture.md) §4.5 |
| **Module unpowered or not driving** (with a Seed or our module) | R_BPD pulls the gate low "whatever the pedal digital rail is doing" (split spec §7.5); an unknown onboard pull-up on RELAY_EN down to 87.4 kΩ still leaves the gate ≤ 0.5 V | [architecture.md](architecture.md) §4.9; open item SEED-ONBOARD-LOADS |
| **A Seed's bootloader grace period** | RELAY_EN sits on PG10, which carries no SDMMC or USB function and is not an interface the Daisy bootloader's documentation (`LD-BOOT`) names; its drive and pull states there are undocumented | [architecture.md](architecture.md) §4.5; open item SEED-BOOTLOADER-PIN-STATES |
| **Power-fail trip** | Q_PFG pulls the gate low whatever RELAY_EN does (R-PF-4), and the module branch is switched off and discharged | §4; [power.md](power.md) §3.5 |
| **Effect off** (the firmware default) | Firmware sets RELAY_EN low | §6 |

"Whichever mode is selected, power loss, reset and boot always end in relay bypass" (`BYPASS-RELAY.md` §4 item 5). The unpowered bypass path itself is open item **BYPASS-PATH-UNPOWERED** (BU-29).

## 4. Power-fail

### 4.1 Why the v1 shed could not cross the split

On v1 the supervisor stopped the buck at the trip, so the bulk capacitor fed only the analog load and the output relay had time to open before the output stage moved. The buck is now inside the module, the Seed pinout has no EN pin and no interface pin is free for one, so the module's load can no longer be removed from the capacitor that feeds the analog stages (split spec §7.4). `BYPASS-RELAY.md` §5.6 had already shown that a supervisor which only pulls the relay gate low, with the buck left running, loses the race by 2.5–2.7 ms in the worst case (v1 figure) because the buck keeps draining the shared bulk. The split keeps that gate wiring and removes its cause: the analog branch is isolated and held up, so the module's load cannot drain it ([O-6](decisions.md#o-6), owner; [power.md](power.md) §3). Split spec R-PF-4: "the `BR` §5.6 wiring, which failed there only because the buck kept draining the shared capacitor".

### 4.2 The requirements and how each is met on paper

The requirements are split spec §7.4's; the numbers they name are `BYPASS-RELAY.md` §5's and `ANALOG.md`'s. Each was met on paper by the S1 power-fail analysis ([power-fail.md][pf]; rulings [R-33](decisions.md#r-33), [R-35](decisions.md#r-35) to [R-42](decisions.md#r-42), [R-44](decisions.md#r-44), [R-45](decisions.md#r-45) and [R-58](decisions.md#r-58), and the owner decisions [R-34](decisions.md#r-34) and [R-43](decisions.md#r-43)), a paper analysis of an unbuilt board; the last column names the open item that holds it open.

| Id | Requirement (split spec §7.4) | On paper | Open item |
|---|---|---|---|
| R-PF-1 | The output relay's contacts open before the analog rail falls to V_B = VMID + 0.1 V | V_B 4.842 V at 9 V, 6.421 V at 12 V ([power.md](power.md) §3.4) | POWER-FAIL-REPLACEMENT-MEASURE |
| R-PF-2 | Contact-opening budget t_open = t_detect + SENSE to RESET + gate turn-off + the release, the release term being ≤ 3.0 ms (K106-E1-11; BU-19 target ≤ 2.7 ms). The split spec's note on R-PF-2 (pre-flight K-7/D-1): the 3.0 ms "is the contacts' datasheet release maximum, one term of the budget. It does not cap t_open"; R-PF-1 and R-PF-3 must hold with t_open | t_open 3.068 ms: detection 0.017 ms + SENSE to RESET 0.050 ms (an allowance) + gate 0.00067 ms + release 3.0 ms ([power.md](power.md) §3.4) | POWER-FAIL-REPLACEMENT-MEASURE |
| R-PF-3 | Hold-up: VIN_A ≥ V_B for at least t_open in the full worst-case stack, margin ≥ 0 at 9 V and at 12 V | +10.80 / +16.27 ms (plug pull, 9 / 12 V), +8.01 / +1.21 ms (slow fall); 345 µF effective, 80.15 mA ([power.md](power.md) §3.2, §3.4) | POWER-FAIL-REPLACEMENT-MEASURE |
| R-PF-4 | Relay override independent of the processor; RELAY_EN cannot hold the coils on during a trip, with a Seed or our module; series resistance keeps the MCU pin and the override inside their ratings; the gate pull-down releases the relays whenever the module stops driving RELAY_EN | Q_PFG; [FIG-OVERRIDE](#fig-override) | RELAY-OVERRIDE-ON-TRIP |
| R-PF-5 | No re-engage without the ramp: after any trip the coils stay off until firmware runs the full engage sequence | The module load switch Q_MSW opens and VIN_MOD is discharged while tripped, so the module always reboots, into bypass, after td 154–395 ms ([R-38](decisions.md#r-38); [power.md](power.md) §3.5); a latch was rejected because it would make RELAY_EN a declared crossing ([power-fail.md §7][pf]) | POWER-FAIL-REPLACEMENT-MEASURE |
| R-PF-6 | Start-up on a sagging 9 V supply; no trip on normal sag | Trip 7.799–8.159 V, release ≤ 8.404 V at VIN, 46 mV under the sagged 8.45 V ([power.md](power.md#fig-trip) FIG-TRIP) | POWER-FAIL-REPLACEMENT-MEASURE |
| R-PF-7 | Analog headroom not reduced | VIN_A 8.615 V at exactly 9.00 V in, cold, against 8.44 V ([R-34](decisions.md#r-34), owner; [power.md](power.md) §3.1) | ANALOG-HEADROOM-9V |
| R-PF-8 | Detection time bounded | Sensing at VIN, upstream of both diodes; t_detect 0.017 ms on a plug pull, and the slow-fall frame holds for any detection time ([R-39](decisions.md#r-39)) | POWER-FAIL-REPLACEMENT-MEASURE |
| R-PF-9 | Every new part rated for the 18 V continuous condition with derating; the supervisor's VDD (5V_A) stays up through the trip | [power.md](power.md) §3.7, §8 | POWER-FAIL-SEQUENCE-CHECKS (SENSE with 18 V reversed), PEDAL-POWER-PARTS-TO-MODEL (each rating re-derived against the model) |
| R-PF-10 | The codec's VCC (5V_A) up before VDD and down after VDD; the module's own reset supervisor covers the MCU; every interface crossing inside IF-PD-1 through the whole trip and power-up in either order | VDD from 5V_A through U_CVDD ([power.md](power.md) §9; [analog.md](analog.md) §13.3); crossings [architecture.md](architecture.md) §4.8 | POWER-FAIL-SEQUENCE-CHECKS (VCC/VDD order), IF-PD-1-MEASURE (crossings) |
| R-PF-11 | The supervisor asserts codec RST together with the relay override; it does not replace the SAI isolation | Q_PFR, on the same PF_TRIP as Q_PFG ([analog.md](analog.md#ec-codec-reset) EC-CODEC-RESET, [FIG-CODEC-RST](analog.md#fig-codec-rst)) | RELAY-OVERRIDE-ON-TRIP, CODEC-DOMAIN-BRINGUP |

Split spec §7.4's "Final component values are **marked for re-analysis in the plan**" was answered by that analysis; the values it chose are in [power.md](power.md) §3 and in §4.3 below.

### 4.3 The override and the codec reset (R-PF-4, R-PF-11)

`power-fail.md` §6, as [R-37](decisions.md#r-37) and [R-40](decisions.md#r-40) set it:
- U_PF's RESET drives only **PF_OK**, with R_PFPU 100 kΩ to 5V_A.
- **U_PFINV**, an SN74LVC2G14 dual Schmitt inverter on 5V_A with 100 nF: channel A makes **PF_TRIP** (high when tripped), which drives **Q_PFG** (drain on the relay gate), **Q_PFR** (drain on CODEC_RST_N) and **Q_VDIS**, all AO3400A, and **Q_PEN** (2N7002, [R-58](decisions.md#r-58)); channel B re-inverts PF_TRIP into **PF_ON**, which drives Q_MSWD.
- **R_PFTPD** and **R_PFONPD**, 100 kΩ, hold PF_TRIP and PF_ON low when 5V_A is off and U_PFINV's outputs float.

#### FIG-OVERRIDE

**With RELAY_EN high, Q_PFG sinks 0.93 mA through R_RELAY_EN and holds the relay gate at ≤ 45 µV, independent of the processor.** Inputs: the MCU's output high at most 3.6 V; R_RELAY_EN 3.9 kΩ at its 1 % low limit, 3.861 kΩ; Q_PFG's RDS(on) ≤ 48 mΩ at VGS ≥ 2.5 V (AO3400A Rev 3.1). Method: the current is 3.6 V / 3.861 kΩ = 0.93 mA, and the gate voltage is that current across RDS(on), 0.93 mA × 48 mΩ = 45 µV, far below the AO3400A's 0.65 V minimum threshold. The same 0.93 mA is the MCU pin's load and is inside its rating ([architecture.md](architecture.md) §4.9). Source: [power-fail.md §6][pf]; [S1 ledger R-13, R-37][ledger]. Paper analysis of an unbuilt board.

The other checks `power-fail.md` §6 records, each a paper analysis of an unbuilt board:
- **PF_OK.** High is ≥ 4.849 V − 5.3 µA × 101 kΩ = 4.31 V, above the inverter's VT+ maximum 3.7 V. Low is ≤ 0.02 V (VOL 0.4 V at 1 mA scaled to the 52 µA sink), under VT− minimum 1.1 V.
- **R-PF-11.** Q_PFR asserts RST with Q_PFG. With R_CRST 4.70 kΩ the released RST is ≥ 2.58 V at the codec's VDD minimum, including Q_PFR's 40 µA leakage allowance at 85 °C, and the asserted sink is 0.72 mA ([analog.md](analog.md) FIG-CODEC-RST).
- **Through the trip.** PF_TRIP follows 5V_A, which stays ≥ 4.2 V until the contacts are open (VIN_A ≥ V_B ≥ 4.84 V less the TPS7A49's ≤ 0.6 V dropout, [S1 ledger R-37][ledger]), so Q_PFG and Q_PFR stay fully on. Q_PFR stays on until 3V3_CODEC is below U_CRST's threshold, and U_CRST holds RST after that.
- **After the override loses its drive**, at 5V_A below about 2.6 V: the module branch is already down, so 3V3_P cannot operate a coil whatever RELAY_EN does. That rests on VIN_MOD reaching ≤ 1.0 V (6.42 ms from 18 V) before VIN_A falls to 3.2 V (18.14 ms); at VIN_MOD ≤ 1 V, 3V3_P ≤ 2.0 V, under the coil's cold must-operate 2.00 V ([power.md](power.md) §3.5; open item POWER-FAIL-SEQUENCE-CHECKS).
- **IF-PD-1.** Neither drain is an interface pin, so no crossing changes.

### 4.4 The sequence at power loss

Split spec §5.6.5 states the sequence the analysis must show, and [architecture.md](architecture.md) §4.8 carries it: input lost → supervisor trips → relay gate pulled low and codec RST asserted → relays open while the reservoir holds the analog rail → module 3V3 collapses while the codec domain is still up → the isolation buffers keep every SAI crossing inside IF-PD-1. On paper the contacts are open ≤ 3.068 ms after the input is lost on a plug pull, while VIN_A falls at ≤ 0.232 V/ms ([power.md](power.md) §3.4).

- **Residual when engaged at the moment of loss** (`BYPASS-RELAY.md` §5.4, written for v1). v1's analysis: in the ≤ 3.3 ms before the contacts opened the output stage's DC was still steady; what could reach the jack was "the wet signal stopping abruptly when the MCU and SAI clocks stop, plus the PCM3060's behaviour when its clocks stop (not specified; `AN` §11 item 10 estimates a few mV for the reset case). This is a cut, not a DC thump. BU-08 measures it." **That conclusion is v1's; no source re-analysed the residual on the split.** This document's reading, not a source's: on the split the mechanism differs, because the codec is its own clock master from its oscillator and its RST is asserted at the trip (R-PF-11); split spec §5.6.5 records that after RST falls it takes about 40 ms (1936/fS at 48 kHz) before even DOUT is forced to zero, longer than the ≤ 3.068 ms to open the contacts, and that SLAS533B gives no output state in reset. The residual stays a BU-08 measurement (open item POWER-FAIL-REPLACEMENT-MEASURE).
- **Mains-off** (the supply switched off at the wall) is slower than a plug pull: the adapter's own output capacitance keeps feeding the board after the trip (`BYPASS-RELAY.md` §5.4). The split analysis covers it with the slow-fall frame ([R-39](decisions.md#r-39)).
- **Supply dips.** On the split any dip at the jack below the trip (7.80–8.16 V) reboots the module; the pedal holds bypass for td plus firmware's 2.5 s, with the dry signal passing throughout ([power.md](power.md) §3.5, "Behaviour the owner should know"). A supply too weak to hold the trip during the switch-on retries once per td while the pedal sits in bypass.

*Not in force:* "A dip below the trip lasting more than about 20 µs ... does reboot the pedal into bypass (previously the board rode through until about 4 V)", with the trip at 7.29–7.62 V (`BYPASS-RELAY.md` §5.4, v1).

### 4.5 Power-up

The relays are de-energised from the first moment: U_PF holds PF_TRIP high until VIN passes its release and for td (154–395 ms) after, so Q_PFG holds the gate; the module branch is off and discharged; 3V3_P starts ≥ 230 ms after release; RELAY_EN is high-impedance until firmware runs; and firmware holds bypass ≥ 2.5 s ([power.md](power.md) §9). The output stage's power-up excursion (0.92 V into 10 kΩ, v1 figure, [analog.md](analog.md) §8) lands on R_B, not on the jack. `BYPASS-RELAY.md` §5.5: "Power-up pop: none at the jack by construction." BU-08 checks power-up and MCU reset (expected: no excursion, relay never closes).

## 5. Parts

### 5.1 The relay: Omron/ARATAS G6K-2F-Y DC3 (two)

All values K106-E1-11 unless stated (`BYPASS-RELAY.md` §3.1).

| Item | Value |
|---|---|
| Form | DPDT (2c), single-side stable (non-latching), outside-L SMT terminals; "-Y" = 3.2 mm coil-to-contact terminal spacing, 2,500 V impulse coil to contact |
| Size | 10 × 6.5 × 5.2 mm, 0.7 g |
| Contacts | Bifurcated crossbar, Ag (Au-alloy contact); contact resistance 100 mΩ max (10 mA, 1 VDC); failure rate (P level) 10 µA at 10 mVDC, so specified for low-level (dry) signal loads |
| Coil, 3 VDC | 33.0 mA, 91 Ω (±10 %, 23 °C), about 100 mW; must operate 80 % max (2.4 V), must release 10 % min (0.3 V), maximum voltage 150 % (4.5 V) |
| Maximum coil voltage vs ambient | 150 % flat from −40 to 70 °C (graph, p. 4) |
| Operate / release time | **3 ms max / 3 ms max**, without the suppressor; with the 1N4148W + BZT52C12 suppressor the release is not in the data sheet (open item POWER-FAIL-REPLACEMENT-MEASURE, BU-19) |
| Mechanical life | 50 × 10⁶ operations minimum |
| Ambient | −40 to 70 °C |
| Footprint | KiCad `Relay_SMD:Relay_DPDT_Omron_G6K-2F-Y` (the footprint OSCAR uses; the name is present in KiCad 10.0.5's footprint library, checked on 2026-11-10); `BYPASS-RELAY.md` §3.1 assigns a check of it against the p. 6 mounting dimensions to a later step (open item BYPASS-PARTS-TO-MODEL) |
| Lifecycle | "In production" on the manufacturer's G6K page for G6K-2F-Y, -TR and -T1, read 2026-10-04; the manufacturer names G6K as the replacement for its discontinued G6H series |
| Ordering | G6K-2F-Y DC3 (tape: G6K-2F-Y-TR DC3), LCSC C93168 |

**Coil current** on 3V3_P: 56.8 mA per coil, 113.6 mA for both, worst case (3.513 V into 91 Ω × 0.9 × 0.755: −10 % tolerance, then cold −40 °C copper); 37.3 mA per coil at 3.392 V nominal. It is part of 3V3_P's budget ([power.md](power.md) §6.1), not the module's, and it does not pass through the MCU's supply pins (Q_BYP switches it).

**Why not the alternatives** (`BYPASS-RELAY.md` §3.1, §1). A latching relay (G6KU, Panasonic TQ2-L2) stays wherever it was last set, so bypass on power loss would need stored energy and a reset pulse on the way down: it fails the requirement by design. A 5 V coil on 5V_A (OSCAR's coil voltage) "puts 2 × 21 mA of switched coil current on the codec's analog rail, and 5V_A outlives 3V3_D at power-down (`PW` §5.2), which is the wrong order for dropping the relay"; a 4.5 V coil on 5V_A has the same objection (`BYPASS-RELAY.md` §3.1, written when the coils were on 3V3_D).

### 5.2 The coil drive

| Design label | Part | Values used |
|---|---|---|
| Q_BYP | Alpha & Omega AO3400A (SOT-23) | VDS 30 V; VGS ±12 V; VGS(th) 0.65–1.45 V; RDS(on) < 48 mΩ at VGS = 2.5 V, < 32 mΩ at 4.5 V; Ciss 630 pF typical (AO3400A Rev 3.1) |
| R_RELAY_EN | 3.9 kΩ 1 % | gate series resistor ([R-13](decisions.md#r-13)) |
| R_BPD | 15.0 kΩ 1 % | gate pull-down ([R-13](decisions.md#r-13)) |
| D_BF_IN, D_BF_OUT | Diodes 1N4148W-7-F (SOD-123) | 100 V, IFM 300 mA (DS30086) |
| D_BZ_IN, D_BZ_OUT | Diodes BZT52C12-7-F (SOD-123) | VZ 11.4–12.7 V at 5 mA, ZZT 25 Ω (DS18004 Rev 38-2) |
| Q_PFG | AO3400A | the power-fail override, drain on the gate (§4.3) |

- **One MOSFET for both coils.** Both relays always switch together, and 114 mA is far below the part's rating. A BSS138 was rejected: its RDS(on) at a 3.3 V gate is typical only (DS30144 Fig. 1), so the coil-voltage margin would not be guaranteed.
- **Diode plus Zener at the coil pins.** A plain diode (OSCAR's 1N4148W) protects the MOSFET but holds the coil current up and slows release; a Zener in series makes the current decay fast (Omron FAQE10041). Release time is the critical number in the power-fail budget, so the Zener is fitted.
- **Gate drive.** With RELAY_EN high the gate reaches 2.58 V at the 3V3_D minimum, above the 2.5 V at which RDS(on) is specified ([architecture.md](architecture.md) §4.9).

#### FIG-DRAIN-PEAK

**Q_BYP's drain peaks at about 18.5 V at coil turn-off, under its 30 V rating.** Inputs: the coil rail at its 3.513 V maximum; the 1N4148W's forward drop taken as 1.0 V; the BZT52C12's VZ at its 12.7 V maximum (at 5 mA) plus its 25 Ω ZZT carrying the 52 mA excess of the 57 mA coil current over that test current. Method: the drain is clamped at rail + VF + VZ = 3.513 + 1.0 + (12.7 + 0.052 A × 25 Ω = 14.0) ≈ 18.5 V; the energy is the coil's stored ½LI², tens of µJ. Source: [BYPASS-RELAY.md §3.3][br]. v1 figure, computed on 3V3_D; 3V3_P has the same 3.274–3.513 V range ([power.md](power.md) §6.1), so the inputs are unchanged (this document's observation). The ZZT extrapolation from 5 mA to 57 mA is the source's estimate, not a data-sheet curve. Paper analysis of an unbuilt board.

#### FIG-GATE-TURN-OFF

**Q_BYP turns off in about 9.5 µs once RELAY_EN stops driving.** Inputs: R_BPD 15.0 kΩ; the AO3400A's Ciss 630 pF, typical (no maximum published). Method: the gate discharges through R_BPD with τ = 15.0 kΩ × 630 pF = 9.45 µs. Source: [BYPASS-RELAY.md §3.3][br] (split-pedal amendment, [S1 ledger R-13][ledger]: "turn-off gets faster (9.5 µs), which only helps R-PF-2"). On a trip the gate is discharged by Q_PFG instead, in the 0.67 µs gate term of t_open ([power.md](power.md) §3.4). Paper analysis of an unbuilt board.

*Not in force:* the v1 gate time 100 kΩ × 630 pF = 63 µs, "off within about 0.2 ms of PI5 going Hi-Z" (`BYPASS-RELAY.md` §3.3).

## 6. What firmware must do

`BYPASS-RELAY.md` §4, kept unchanged by split spec §11. **This repository does not own firmware**; these are constraints the hardware relies on, collected in [firmware-facing-requirements.md](firmware-facing-requirements.md) and open item FIRMWARE-ANALOG-OBLIGATIONS. "Muting the codec" means writing zero samples to the DAC, ramped: the PCM3060 is in hardware mode with no mute pin. Ramps are 10 ms, linear or raised-cosine; the shape is a firmware choice.

1. **Boot.** RELAY_EN stays low until the codec is clocked and settled (on the split: SAI2 frame sync running from the codec's oscillator and the codec out of its local reset; split spec §11) **and** at least 2.5 s (5τ of the VMID divider) have passed since power-up. The output stage settles into R_B meanwhile; the jacks never see it.
2. **Engage (bypass → effect).** DAC output at zero (or ramp it there); set RELAY_EN high; wait **10 ms** (operate 3 ms maximum plus bounce); ramp the DAC from zero to the effect signal over 10 ms.
3. **Disengage (effect → bypass).** Ramp the DAC to zero over 10 ms; set RELAY_EN low; wait **10 ms** (release plus bounce) before any later engage. The DSP may keep running, but its output is disconnected.
4. **Why it is pop-free.** At every relay change FX_OUT_x is at 0 V DC (R_B holds the jack side of C_DC) and the DAC sends silence, so no DC step and no signal edge cross the contact; the listener hears the dry signal stop for the transfer time and the wet signal fade in, the same mute-around-the-switch scheme as Coda's anti-pop relay bypass ("imperceptible in practice", about 40 ms of silence).
5. **Effect-off behaviour is a firmware setting.** Relay true bypass (RELAY_EN low) is the default; DSP bypass with trails (RELAY_EN stays high and the DSP passes the dry signal and any decaying tail) is the alternative Eventide and Strymon offer. `BYPASS-RELAY.md` §11 item 1 records this as settled with no hardware decision needed.
6. **Footswitches unchanged.** FSW1 and FSW2 are momentary inputs; firmware decides what toggles the relays.
7. **Reset, watchdog, DFU, crash.** Any reset puts RELAY_EN high-impedance, so bypass. **Firmware must keep the independent watchdog enabled, so a hung program ends in a reset and therefore in bypass.**
8. **After a power-fail trip** the module has rebooted (R-PF-5), so the engage sequence above runs again from boot.

## 7. Layout

`BYPASS-RELAY.md` §7, with the split applied; open item PEDAL-ANALOG-LAYOUT-RULES carries it to the pedal layout:
- K_BYP_IN close to the input jacks, K_BYP_OUT close to the output jacks; BYP_L and BYP_R are audio traces routed as a pair over unbroken GND, away from switching parts (v1 named the buck and the SDRAM, both now on the module).
- Each suppressor at its relay's coil pins; Q_BYP near the relays; the coil-current loop (3V3_P → coil → Q_BYP → GND) small and out of the analog zone.
- The jack ESD diodes stay at the jack terminals, on the jack side of the relays.
- Relay height 5.2 mm, checked against the enclosure with the other tall parts (open item STACK-HEIGHT-CONFIRM).

*Not in force:* "U_PF and its divider near the buck's EN pin; SENSE taken at VIN_PROT" (`BYPASS-RELAY.md` §7); on the split U_PF senses VIN at the jack ([R-36](decisions.md#r-36)).

## 8. Where each element is proven

`BYPASS-RELAY.md` §8, the evidence behind the owner's standard "as few novel architectural decisions as possible, each choice proven across independent shipping designs":

| Element | Where it ships or is published |
|---|---|
| Non-latching relays that drop to input → output bypass when unpowered, stereo | Eventide H9: "When [RELAY] Bypass is selected the H9 uses relays to 'hard wire' your inputs to your outputs", and "whenever the H9's powered down, its electronics are completely bypassed by the relays" (H9 user guide, p. 18) |
| Relay true bypass on a stereo digital pedal, with a firmware-selectable buffered/DSP alternative | Strymon BigSky: "True Bypass (electromechanical relay switching)" plus "Analog Buffered Bypass" (product page) |
| The relay, the arrangement and the drive style | OSCAR (open hardware, the base of this platform): two G6K-2F-Y, K1 switching both inputs and K2 both outputs, jacks on COM, NC linked K1 ↔ K2, NO to the effect; coil pin 1 on the rail, pin 8 to the driver; a 1N4148W per coil; a 2N7002 low-side switch from an MCU pin. Read from the OSCAR_AUDIO_01 and OSCAR_PROC_01 netlists at the commits `CORE-BRIEF.md` §1 pins |
| Non-latching DPDT, MCU-driven, unpowered = bypass, mute around the switching | Coda Effects (published design): "without power supply, the relay de-energizes and defaults to bypass"; anti-pop by muting for about 40 ms |
| Diode + Zener coil suppression for fast release | Omron FAQE10041 |

Differences from OSCAR, each for a stated reason: a 3 V coil on its own rail instead of 5 V; an AO3400A instead of a 2N7002 (RDS(on) guaranteed at a 2.5 V gate); a gate pull-down (OSCAR has none, so its gate floats during reset); a Zener in each suppressor; and the power-fail override. **The power-fail path is the one element not copied from a surveyed pedal**: none of the sources document their power-down timing, and OSCAR and Coda simply let the relay drop when the MCU loses power. The v1 shed used the converter's EN as an undervoltage lockout; the split replaces it with the held-up branch and the direct gate override that `BYPASS-RELAY.md` §5.6 had evaluated (§4.1). Neither is proven in a surveyed pedal; on paper the split's version meets R-PF-1 to R-PF-11, and bring-up measures it.

## 9. Bring-up and checklist items

`BYPASS-RELAY.md` §9 replaced or added these items in `SCHEMATIC-CHECKLIST.md`, and split spec §9.3 reworks them for the split. They are carried as open items, not as checklist entries:

| Item | What it checks (as reworked by the split) | Open item |
|---|---|---|
| AIO-19, AIO-20, AIO-02, AIO-17, AIO-21 | The relays, their pin map and the drive (§2, §5); AIO-19's coil supply on 3V3_P; AIO-20 "gains the supervisor override and the RELAY_EN series resistance; R_BPD kept" | BYPASS-PARTS-TO-MODEL, INTERFACE-PARTS-TO-MODEL, PEDAL-POWER-PARTS-TO-MODEL |
| BU-08 | Pop at the jacks: plug pull and mains-off, at 9 V and 12 V, at maximum DSP and SDRAM load, engaged; the output jack disconnects from FX_OUT before FX_OUT leaves its DC level, and the transient is inaudible; also power-up and MCU reset. The split scopes the supervisor output, the relay gate and VIN_A instead of BUCK_EN | POWER-FAIL-REPLACEMENT-MEASURE |
| BU-11 | Firmware: RELAY_EN high only after the codec is clocked and settled and ≥ 2.5 s after power-up; ramp-to-zero, 10 ms, ramp-in around every change; watchdog on; samples unnegated | FIRMWARE-ANALOG-OBLIGATIONS |
| BU-19 | G6K release and operate time on the board with the suppressor, hot and cold; ≤ 3.0 ms is the data-sheet limit and ≤ 2.7 ms the target R-PF-2 keeps; bounce recorded | POWER-FAIL-REPLACEMENT-MEASURE |
| BU-27 | Switching transient at the jack, engage and disengage, with a guitar and with a 1 kHz tone: no click beyond the brief dry-signal gap | POWER-FAIL-REPLACEMENT-MEASURE |
| BU-28 | U_PF trip and release points, now at the new sense point (VIN), the reboot into bypass on a slow supply ramp, and the pedal starting and staying up on a 9 V supply set to 8.45 V at the jack under full DSP load | POWER-FAIL-REPLACEMENT-MEASURE |
| BU-29 | The bypass path unpowered: jack-to-jack ≤ 0.2 Ω, a guitar playing through both channels, mono in to both outputs | BYPASS-PATH-UNPOWERED |
| Added by split spec §9.3 | Codec RST on a trip; RELAY_EN scoped through the Daisy bootloader's grace period with a Seed fitted | RELAY-OVERRIDE-ON-TRIP; SEED-BOOTLOADER-PIN-STATES |

*Not in force:* PWR-18 as `BYPASS-RELAY.md` §9 added it (U_PF's RESET to BUCK_EN, trip 7.29–7.62 V, release ≤ 7.84 V); split spec §9.3: "PWR-18 replaced by §7.4's circuit".

## 10. What did not cross

- `BYPASS-RELAY.md` §0's datasheet SHA-256 prefixes: the documents are cited here by name and revision.
- The dated stock observation (LCSC C93168, 6,430 in stock at $1.36 at 10+, 2026-10-04): availability is decided at the PCBWay quote ([OWN-07](decisions.md#own-07)).
- `BYPASS-RELAY.md` §6's list of the removed solid-state mute's nine parts and their v1 reference designators: the mute is gone ([OWN-01](decisions.md#own-01)), and the v1 schematic is not an authority. One finding carried: the BSS138's RDS(on) at 3.3 V is typical only (§5.2).
- `BYPASS-RELAY.md` §10's amendments to other pedals files (the platform spec, `CORE-BRIEF.md` §3, `ANALOG.md`, `POWER.md`, the pin map, `OWNER-DEFAULTS.md`, `LAYOUT-CARRYFORWARD.md`): their effect is carried in the documents beside this one.
- `BYPASS-RELAY.md` §3.2's v1 rail arithmetic (D1's current, the mute LED drive, the 3V3_D budget): v1 only; the split's budgets are in [power.md](power.md).
- `BYPASS-RELAY.md` §5.6's v1 worked numbers for the gate-only alternative: its conclusion is carried in §4.1.

## 11. Open items this document raises

In [open-items.md](open-items.md): BYPASS-PARTS-TO-MODEL, BYPASS-PATH-UNPOWERED, RELAY-OVERRIDE-ON-TRIP. It extends POWER-FAIL-REPLACEMENT-MEASURE (the residual at the moment of loss, BU-08's split scope, BU-28's 8.45 V start), PEDAL-ANALOG-LAYOUT-RULES (the relay layout notes), STACK-HEIGHT-CONFIRM (the relay height) FIRMWARE-ANALOG-OBLIGATIONS (the split spec's "unchanged contracts"), ANALOG-HEADROOM-9V (R-PF-7), POWER-FAIL-SEQUENCE-CHECKS (R-PF-9, R-PF-10), IF-PD-1-MEASURE (R-PF-10's crossings) and PEDAL-POWER-PARTS-TO-MODEL (R-PF-9's ratings), each now naming the requirement it holds open. It also relies on rows other documents raised: CODEC-DOMAIN-BRINGUP, 3V3P-RAIL-MEASURE, QPEN-RERELEASE, INTERFACE-PARTS-TO-MODEL, SEED-ONBOARD-LOADS, SEED-BOOTLOADER-PIN-STATES.

[br]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/BYPASS-RELAY.md
[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
[pf]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/power-fail.md
[ledger]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-05-h7-split-rulings.md
