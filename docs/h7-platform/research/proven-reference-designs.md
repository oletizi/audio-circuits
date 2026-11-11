# Proven architectural choices for an STM32H7 digital pedal: survey of open shipping designs

Ported from: [docs/research/2026-09-30-proven-reference-designs.md](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/research/2026-09-30-proven-reference-designs.md)

> **Dated research. Background only; it does not bind.** This is a research document as it stood in the pedals repository at commit `5b926d0`, brought across below this banner with its text as written; the only edits are that pedals file paths became pinned links. It records what the research found on its date, and a later decision may have overtaken any claim in it. The documents that bind are [decisions.md](../decisions.md) and [architecture.md](../architecture.md); where this text and either of them disagree, they win, and this text is left as the research said it.

Research date: 2026-09-30. Target spec: stereo 24-bit audio, STM32H7, 6 pots, 3 toggles, 2 footswitches, USB, MIDI, expression input, 9V DC in. Assembled turnkey by PCBWay in small runs.

**Framing.** We are not cloning a Daisy. Each architecture decision should follow a choice that several *independent* open designs have already shipped, using parts we can source ourselves. Electrosmith/Daisy counts as one data point among several.

**Legend.** **V** = verified: I saw it in the file or page cited. **U** = unverified: from a secondary source, or inferred.

Sourcing figures are a snapshot of the JLCPCB/LCSC parts API taken on the research date. "JLC stock" is the stock in JLC's assembly warehouse, not LCSC's total stock. Prices are LCSC unit prices in USD. PCBWay sources from its own channels, so treat these numbers only as a sign that a part is available.

---

## 0. Summary of recommendations

| Decision | Recommendation | Independent precedent | Sourcing |
|---|---|---|---|
| MCU + package | **STM32H743IIT6 (LQFP-176)**. STM32H743ZIT6 (LQFP-144) is the fallback. | OSCAR (H743IIT6, the same part); OWL Genius (H743ZGT6 LQFP144); Daisy (H750IB, the same 176-pin family, but BGA) | C89597, JLC stock 1516, about $11 |
| External RAM | **FMC SDRAM, x16 bus, TSOP-II-54** (32–64 MB) | OSCAR IS42S16320 (64 MB); 4ms STS AS4C16M16SA (32 MB); OWL Genius IS42S16400J (8 MB); Axoloti/Ksoloti x16 | Weak point. Exact parts have thin stock; see §2 |
| Program/data flash | Internal 2 MB on the H743, plus one SPI/QSPI NOR (W25Q128JVSIQ) | OSCAR W25Q128JVS; OWL N25Q128 SPI flash; Daisy IS25LP064A QSPI | W25Q128JVSIQ C97521, JLC stock 51k |
| Codec | **TI PCM3060** in hardware mode; codec is the SAI slave and the MCU supplies MCLK | OSCAR (HW mode, V); Daisy Seed Rev7 (HW mode, V); Daisy Patch SM (I2C mode, V) | Active at TI (V). C2651841, JLC stock 128, about $3.76 at 100 |
| Analog front end | **Single supply from 9V_A with a buffered mid-rail Vref**, FET/audio op-amp (OPA1652/OPA1642), about 1 MΩ input | Terrarium, Hothouse, FunBox, Seed3 Pedal DevKit, Torvalds GuitarPedal, OWL Pedal rev04 | Op-amps plentiful |
| Power tree | Series Schottky for reverse polarity, ferrite pi-filters, separate analog LDO (5V_A) and a 3.3V_D rail | All six 9V designs surveyed use a series Schottky | Commodity parts |
| USB | USB FS device, USBLC6-2SC6 ESD protection, BOOT0 button for ROM DFU | Daisy Seed/Patch SM, Seed3 DevKit, OWL Genius, Torvalds (USBLC6-2P6) | USBLC6-2SC6 C7519, JLC stock 38k |
| MIDI | TRS Type A input through an **H11L1** opto into a UART; output through a buffer with 220 Ω resistors | OSCAR, FunBox, Seed3 DevKit (H11L1); OWL Genius (6N137); Torvalds (TLP2310) | H11L1SR2M C20082, JLC stock 20k |
| Expression | TRS: ring driven from a reference voltage, tip through an op-amp follower (MCP6002/OPA165x), RC filter into the ADC | Daisy Petal (OPA1654), Seed3 DevKit and datasheet (MCP6002), FunBox | MCP600x C7378, JLC stock 24k |

---

## 1. Why the original hypothesis was dropped: Daisy files are not a full core design (V)

- **The Electrosmith "Hardware" GitHub repo has been removed.** The GitHub org was renamed `electro-smith` → `daisyaudio`. Neither org has a Hardware repo now. Staff said on the forum that schematics moved to the product pages. An old community fork (jull-taragan/Hardware, MIT) holds only the Patch/Pod/Seed Rev4 files.
- **Patch SM schematic** (`ES_Daisy_Patch_SM_Rev3-REDUCED.sch`, Eagle 9.6.2, published only as a 4-page PDF): it shows only the headers, USB, analog I/O op-amps, power and Eurorack CV conversion.
  - It does **not** show the MCU, SDRAM, QSPI, codec or crystal. The core cannot be copied from it.
  - Its datasheet carries an MIT notice, which covers the documents.
- **Daisy Seed Rev7 schematic** is also a "Reduced" one-page PDF. It shows:
  - Headers and USB with ESD protection.
  - A buck regulator to 3V3_D (the part label reads "TPS6217N"; exact part U).
  - An LP2985 4.5V LDO for the codec analog supply.
  - The codec I/O passives.
  - Per the datasheet: **PCM3060 in hardware mode**, 24-bit left-justified, both ADC and DAC as slaves, SAI1 clocks shared (PE2 MCLK, PE3 SD_B, PE4 FS, PE5 SCK, PE6 SD_A), no I2C.
  - The datasheet's revision table: Rev5 switched to the WM8731 after the AK4556 was discontinued; Rev7 switched to the PCM3060 because the WM8731 was discontinued.
- **Daisy Petal**: a legacy product, with only a Rev5 schematic PDF. It has:
  - 6 pots, 4 footswitches, 3 toggles, an encoder, expression input, 8 RGB ring LEDs driven by 2× PCA9685.
  - **No MIDI.**
  - Input: MCP6004 follower, 2 MΩ bias resistor to a 2.5 V virtual ground (V_AUDIOBIAS).
  - Output: OPA1654 follower, 10 µF coupling, 100 Ω series.
  - Power: 9V → LD1117-5V → isolated DC-DC → +5V_ISOL for the analog section.
- **Daisy Seed3** (datasheet v2.1, Aug 2026):
  - STM32H750, **TI TAC5242** codec, 64 MB SDRAM, USB-C.
  - The datasheet includes reference circuits for a 9V input, an instrument-level I/O (OPA1652, single supply), expression input and MIDI. They are useful as a design cookbook.
- **Seed3 Pedal DevKit** (github.com/daisyaudio/Seed3-DevKit-Pedal) is a KiCad carrier with BOM and gerbers, but its repo has **no LICENSE file**. Use it only as a reference, not as a source to copy from.
- **libDaisy** (github.com/daisyaudio/libDaisy, MIT) has `src/daisy_patch_sm.cpp` and `src/daisy_petal.cpp` (V). The core is hardwired to:
  - QSPI IS25LP064A on PF6–PF10/PG6.
  - SAI1 on PE2–PE6.
  - Patch SM: PCM3060 over I2C2 (PB10/PB11).
  - SDRAM AS4C16M32MSA-6BIN on a **32-bit** FMC bus (`src/dev/sdram.cpp`).
  - HSE 16 MHz (PLLM=4, PLLN=240 → 480 MHz).

  A 16-bit-SDRAM board therefore needs its own SDRAM init. The SAI, ADC, codec, MIDI and USB drivers can be reused as they are.

---

## 2. Decision-by-decision survey

### 2.1 MCU family and package

| Design | MCU | Package | Shipped | Source |
|---|---|---|---|---|
| OSCAR (DADDesign) | STM32H743IIT6 | LQFP-176 | DIY project with gerbers; retail U | OSCAR_PROC_01 KiCad (V) |
| OWL Genius (Rebel) | STM32H743ZGTx | LQFP-144 | Yes (V, OpenWare HISTORY) | OpenWare `Genius/*.ioc` (V) |
| OWL Magus3/MagusH7, Lich3/Witch3 | STM32H743ZGTx | LQFP-144 | U | OpenWare (V) |
| OWL Xibeca | STM32H743IIKx | UFBGA-176 | U | OpenWare (V) |
| Daisy Seed / Patch SM / Seed3 | STM32H750IB(K6) | UFBGA-176+25 | Yes | libDaisy linker `core/STM32H750IB_*.lds` (V); package from the LCSC listing of IBK6 (U for the module) |
| OWL2 family, 4ms STS/DLD/SMR, Axoloti/Ksoloti | STM32F427 | LQFP-144 | Yes | OpenWare .ioc, 4ms linker scripts (V) |
| 4ms SWN | STM32F765ZG | LQFP-144 | Yes | swn.sch (V) |
| MI Clouds/Rings/Warps/Elements | STM32F405RGT6 | LQFP-64 | Yes | pichenettes/eurorack .sch (V) |

**Observations**
- The **LQFP** H743 has two independent open precedents (OSCAR, Rebel). The BGA H750 has one (Daisy).
- LQFP-144/176 with an FMC SDRAM is the dominant pattern overall: about 10 shipped designs across F4/F7/H7.
- The H743 has 2 MB of internal flash; the H750 has 128 KB. The H743 therefore avoids Daisy's QSPI-execute and bootloader architecture.
- The 176-pin LQFP has the same pin count as Daisy's 176-ball part, so the libDaisy pin map can probably be reused. **U**: confirm in CubeMX that every pin used (FMC D16–D31 on ports H/I, SAI1 on port E, QSPI on port F/G) is bonded out on LQFP176.

**Sourcing (LCSC snapshot)**

| Part | LCSC | JLC stock | Price |
|---|---|---|---|
| STM32H743IIT6 | C89597 | 1516 | $11.09 @1 |
| STM32H743ZIT6 | C114408 | 10 | $9.23 @100 |
| STM32H743ZGT6 | C730184 | 235 | — |
| STM32H743VIT6 (LQFP100, no x32 FMC) | C114409 | 3602 | — |
| STM32H750IBT6 | C730201 | 149 | — |
| STM32H750IBK6 (Daisy's part) | C730200 | 972 | — |
| STM32H743IIK6 | C129442 | 0 | — |

Lifecycle status on st.com was not retrieved (the page timed out). **U**: check NRND status and ST's longevity commitment before committing.

**Recommendation:** STM32H743IIT6 (LQFP-176). It matches OSCAR exactly, belongs to the same family as Rebel and Daisy, and is the easiest package for a 4-layer board with turnkey assembly.

### 2.2 External memory

| Design | Memory | Bus | Source |
|---|---|---|---|
| OSCAR | IS42S16320 SDRAM (64 MB) + 2× W25Q128JVS | FMC x16 + SPI/QSPI | KiCad (V) |
| OWL Genius / OWL2 | IS42S16400J (8 MB) + N25Q128 SPI NOR | FMC x16 | Genius schematic, owl3.ld (V) |
| 4ms STS | AS4C16M16SA (32 MB) | FMC x16 | STS .kicad_sch, sdram_driver.h (V) |
| 4ms DLD | 32 MB SDRAM, part U | FMC | sdram.h (V) |
| Axoloti / Ksoloti | SDRAM (Ksoloti comment names MT48LC16M16A2P) | FMC x16 | firmware/sdram.c (V) |
| Daisy | AS4C16M32MSA-6BIN (64 MB) + IS25LP064A | FMC **x32**, BGA | libDaisy (V) |
| Torvalds GuitarPedal | APS6404L-3SQR (8 MB PSRAM) | QSPI | KiCad (V); RP2354, not an STM32 |
| MI modules | none (internal RAM only) | — | (V) |

**Sourcing (LCSC snapshot)**

| Part | LCSC | JLC stock | Price | Note |
|---|---|---|---|---|
| IS42S16320F-7TL (OSCAR) | C1348750 | 0 | about $15.9 @100 | Costly |
| AS4C16M16SA-6TIN (4ms STS) | C570212 | 30 | $13.9 | |
| IS42S16400J-7TLI-TR (OWL, 8 MB) | C94865 | 1628 | $3.92 @100 | |
| W9825G6KH-6 (Winbond 32 MB) | C62246 | 9034 | $5.63 | No open precedent found in this survey |
| AS4C16M32MSA-6BIN (Daisy) | C1350444 | 0 | — | BGA |
| W25Q128JVSIQ (flash) | C97521 | 51172 | $1.77 @100 | |
| APS6404L-3SQR-SN (PSRAM) | C5333729 | 4617 | — | |

**Recommendation:** FMC SDRAM on an x16 bus, 54-pin TSOP-II, wired to the standard JEDEC pinout so 256-Mbit (32 MB) parts (AS4C16M16SA, W9825G6KH, MT48LC16M16A2) fit the same footprint. **Correction (post-review):** the IS42S16320 is 512 Mbit (32M×16 = 64 MB), a different density class with an extra column-address bit. It is not a drop-in substitute; it needs a different firmware/FMC configuration. Interchangeability within a class also still requires a compatibility matrix (pinout, address bits, refresh, timing, speed grade, init parameters).
- 32 MB already gives about 87 seconds of stereo 48 kHz float32 audio (32 MiB ÷ (48000 × 2 ch × 4 bytes)), or about 2.9 minutes as int16.
- A QSPI PSRAM (8 MB) is a lower-pin-count option, but this survey found no shipped STM32 audio precedent for it.

### 2.3 Codec, control mode and clocking

| Codec | Used by | Control | Clock master | Status |
|---|---|---|---|---|
| **PCM3060** | OSCAR (V), Daisy Seed Rev7 (V), Patch SM (V), Seed2 DFM | HW pins (OSCAR, Seed Rev7); I2C (Patch SM) | Codec is the SAI slave; MCU drives MCLK (OSCAR via SAI2_MCLK, Daisy via SAI1 PE2) | TI: **Active** (V) |
| **CS4271/CS4272** | 4ms STS, DLD (I2C); OWL Witch/Lich/Magus/Genius/Pedal2 (SPI) | I2C or SPI | 4ms: MCU MCLK; OWL Genius: SAI slave, so the codec or an external crystal (24.576 MHz on Genius) is master | Cirrus status U. CS4271-CZZ C1521477: JLC stock 0. CS4272-CZZR C2151111: 1375 |
| WM8731 | MI Clouds/Rings/Warps/Elements, 4ms SWN/SMR, OWL Pedal, Daisy Seed Rev5 | I2C | mixed | **Discontinued**, per the Electrosmith Seed datasheet revision table (V). Avoid |
| AK4556 | Daisy Seed Rev4 | HW | MCU | **Discontinued** (same source). Avoid |
| TAC5242 / TAC5112 | Daisy Seed3 (V, datasheet); Torvalds GuitarPedal (V) | I2C/HW (TAC5242 control mode U) | U | Active (V, from the "newer alternatives" list on TI's PCM3060 page). TAC5242IRGER C47122155, JLC stock 1202 |
| ADAU1961 | Axoloti/Ksoloti | I2C, internal PLL | codec PLL | C654424, JLC stock 97 |

**Recommendation:** PCM3060.
- It has the most independent open precedent on the STM32H7 (OSCAR plus Daisy), and TI lists it as Active.
- In hardware mode it needs no driver. Firmware matches libDaisy's Seed Rev7 path (SAI1 slave codec, 24-bit left-justified).
- Route the I2C pins to the MCU through 0 Ω resistors so the board can also run the Patch SM I2C driver (`src/dev/codec_pcm3060.cpp`).
- The 28-pin TSSOP is easy to assemble.
- Keep the TAC5242 as the planned migration path. Electrosmith has already moved to it, and Torvalds also uses it.

### 2.4 Analog input buffer and output stage

| Design | Rail | Input stage | Output stage | Source |
|---|---|---|---|---|
| Seed3 Pedal DevKit | single, +9V_A | OPA1652, 1 MΩ, bias from 5V_A, LPF 48k/HPF 3 Hz, gain 0.58 to fit the codec input range | OPA1652, G=1.6 | KiCad (V, via sub-survey) |
| Seed3 datasheet "Instrument level" | single, +9V | OPA1652 follower, 1 MΩ to AREF_AUDIO_BIAS, then an anti-alias inverting stage | OPA1652 inverting, 100 Ω out | datasheet p.22 (V) |
| Daisy Petal Rev5 | single, 5V_ISOL | MCP6004 follower, 2 MΩ bias to 2.5 V | OPA1654 follower | PDF (V) |
| Terrarium (PedalPCB) | single, 5 V (78L05) | TL072 follower, 1 MΩ to VREF 2.5 V | follower, 100 Ω, 100k | PDF (V, sub-survey) |
| Hothouse (Cleveland Music) | single, 5 V | MCP6024, 1 MΩ | 100 Ω/100k | Eagle (V, sub-survey) |
| FunBox v3 (GuitarML) | single, 5 V | MCP6024 | follower | KiCad (V, sub-survey) |
| OWL Pedal rev04 | single, VCC/2 | 2 MΩ, Sallen-Key LPF, TL074 | TL074 inverting | PDF (V, sub-survey) |
| Torvalds GuitarPedal | single, 3.3VA | OPA2365, 1 MΩ | — | KiCad (V, sub-survey) |
| OSCAR | **bipolar ±** (from 12 V via isolated A1209S/B1209S + LM317/LM337) | OPA1642/OPA1644 | NE5532, PGA2310 analog dry path | KiCad (V) |

**Recommendation:** single supply from a filtered 9V_A rail, with a buffered mid-rail reference.
- Seven independent designs use a single supply. Only OSCAR is bipolar, and it needs a 12 V input and isolated DC-DC modules.
- Use about 1 MΩ input impedance, an OPA1652/OPA1642-class op-amp and a 3 Hz–48 kHz band limit.
- Scale the signal into the PCM3060's input range. The Seed3 DevKit's 0.58 gain is a worked example.
- Running the op-amps from 9V instead of 5V gives more headroom for hot pickups. Seed3 does this; the 5 V designs do not.

**Sourcing (LCSC snapshot):** OPA1652AIDR C30025 (stock 1647), OPA1642AIDR C67640 (5298), OPA1602AIDR C70884, MCP6004T-I/SL C7378 (24k), NE5532DR C7426.

### 2.5 Power tree (9 V in)

- **Reverse polarity:** every 9 V design surveyed uses a series Schottky.
  - 1N5817: Terrarium, FunBox.
  - SM5817: Hothouse.
  - NSR1020MW2T3G: Seed3 DevKit, Seed3 datasheet, Patch SM.
  - 1N5819: Torvalds.
  - S1J: OWL Pedal2.
- **Analog rail:** a linear regulator — L78L05 (Terrarium, Hothouse, FunBox), LP2985-5.0 (Seed3 DevKit), LD1117-5V (Petal). Seed3 runs its op-amps directly from a ferrite-filtered +9V_A (datasheet Fig. 1.1).
- **Digital 3.3 V:** a small buck — Daisy Seed (TPS6217x, U) and Patch SM (TPS5621x label, U), Torvalds TPS62153, OWL TSR-1 module — or a 1117 LDO (MI, 4ms, OWL Genius TLV1117LV33).

**Recommendation:**
1. Barrel jack (center-negative pedal standard), a series Schottky (NSR1020 or SS14-class), and ferrite pi-filters, as in Seed3 Fig. 1.1.
2. Split into +9V_A for the op-amps, a 5V_A LDO for the codec VCC (LP2985-5.0), and a 3.3 V buck for the MCU and SDRAM.

An H743 at 480 MHz plus SDRAM draws a few hundred mA, which is too much heat for a linear regulator dropping 9 V to 3.3 V (estimate, U).

### 2.6 USB, MIDI, expression

- **USB:** FS device on PA11/PA12, with USBLC6-2SC6 ESD protection (Seed3 Fig. 1.3, Seed3 DevKit, OWL Genius, Daisy) and a BOOT0 button for ST ROM DFU (Daisy Seed and Patch SM schematics show BOOT and RESET buttons). Sourcing: C7519, JLC stock 38k.
- **MIDI in:** opto into a UART RX.
  - H11L1: OSCAR, FunBox, Seed3 DevKit. The Seed3 datasheet Fig. 7.1 shows a 220 Ω input resistor and a 270 Ω pull-up to 3.3 V.
  - 6N137: OWL Genius. TLP2310: Torvalds.
  - TRS Type A: Torvalds, FunBox, OSCAR README.
  - Sourcing: H11L1SR2M C20082 (20k), 6N137SDM C15825 (20k).
- **MIDI out:** Torvalds uses an SN74AHCT1G125 5 V buffer with 220 Ω resistors on TRS. The Seed3 DevKit provides 5-pin DIN out/thru.
- **Expression:** TRS with a reference voltage on the ring, then 1 MΩ to ground, an op-amp follower, a 10k/20k divider and a 10 nF filter into the ADC (Seed3 datasheet Fig. 4.5, MCP6002). The Petal uses an OPA1654 for both the expression reference and the expression buffer.

---

## 3. Risks and open items

1. **No single open design covers the whole spec.**
   - OSCAR is closest on the core (H743 LQFP + SDRAM + PCM3060, MIT KiCad), but it runs on 12 V with bipolar rails, has MIDI in only, and has no expression input.
   - The I/O side has to be combined from the Seed3 cookbook, FunBox and Torvalds.
   - Combining them is itself an integration decision, though each sub-circuit has precedent.
2. **SDRAM sourcing is the weakest link.** The exact parts used by the open designs (IS42S16320F, AS4C16M16SA) show thin or zero JLC stock and high prices. Design for the shared x16 TSOP-54 footprint so substitutes fit, and get a PCBWay quote early.
3. **libDaisy reuse is partial.**
   - Its SDRAM init is hardcoded to Daisy's x32 BGA part.
   - It targets the H750 (128 KB flash, QSPI boot).
   - An H743 with x16 SDRAM needs a custom board file and a new SDRAM config. That is a firmware task, not a new hardware decision.
4. **CS4271 lifecycle** at Cirrus was not verified. It is the most replicated codec, but LCSC shows 0 JLC stock for the -CZZ.
5. **The LQFP176 vs UFBGA176 pin parity** (needed to reuse the libDaisy pin map) is unverified.
6. **Licenses:**

   | Design | License | Verified? |
   |---|---|---|
   | OSCAR boards | MIT; OSCAR_P01A01 Apache-2.0 | V (sub-survey) |
   | Rebel hardware | GPL-3.0 | V |
   | Torvalds GuitarPedal | GPL-2.0 | V |
   | Hothouse | CC-BY-SA-4.0 | V |
   | FunBox | MIT | V |
   | Mutable Instruments | CC-BY-SA-3.0 | U |
   | 4ms | U | — |
   | Seed3 DevKit | **none** | — |

   GPL and CC-BY-SA terms apply only if we copy schematic or layout content, not if we reuse a topology.
7. **WM8731 and AK4556 are discontinued** (V, Electrosmith). Do not copy older MI, 4ms or OWL codec choices directly.

---

## Sources

**Electrosmith / Daisy**
- Forum, Hardware repo removal: https://community.daisy.audio/t/where-did-the-github-hardware-repo-go/4961
- Legacy page: https://daisy.audio/pages/legacy
- Docs hub: https://docs.daisy.audio/hardware/
- Patch SM schematic (reduced): https://daisy.nyc3.cdn.digitaloceanspaces.com/products/patch-sm/ES_Daisy_Patch_SM_Schematic.pdf
- Patch SM datasheet: https://daisy.nyc3.cdn.digitaloceanspaces.com/products/patch-sm/ES_Patch_SM_datasheet_v1.0.5.pdf
- Seed Rev7 schematic (reduced): https://daisy.nyc3.cdn.digitaloceanspaces.com/products/seed/ES_Daisy_Seed_Rev7.pdf
- Seed datasheet: https://daisy.nyc3.cdn.digitaloceanspaces.com/products/seed/Daisy_Seed_datasheet.pdf
- Seed3 datasheet: https://daisy.nyc3.cdn.digitaloceanspaces.com/products/seed3/Daisy_Seed3_datasheet.pdf
- Petal Rev5 schematic: https://daisy.nyc3.cdn.digitaloceanspaces.com/products/petal/ES_Daisy_Petal_Rev5.pdf
- Old Hardware fork: https://github.com/jull-taragan/Hardware
- libDaisy:
  - Patch SM board file: https://github.com/daisyaudio/libDaisy/blob/master/src/daisy_patch_sm.cpp
  - Petal board file: https://github.com/daisyaudio/libDaisy/blob/master/src/daisy_petal.cpp
  - SDRAM driver: https://github.com/daisyaudio/libDaisy/blob/master/src/dev/sdram.cpp
  - System/clock setup: https://github.com/daisyaudio/libDaisy/blob/master/src/sys/system.cpp
  - PCM3060 driver: https://github.com/daisyaudio/libDaisy/blob/master/src/dev/codec_pcm3060.cpp
- Seed3 Pedal DevKit: https://github.com/daisyaudio/Seed3-DevKit-Pedal

**OSCAR**
- https://github.com/DADDesign-Projects/OSCAR_P01A01
- https://github.com/DADDesign-Projects/OSCAR_PROC_01
- https://github.com/DADDesign-Projects/OSCAR_AUDIO_01

**Rebel Technology (OWL)**
- OpenWare firmware (.ioc, hardware.h, cs4272.c, owl3.ld): https://github.com/RebelTechnology/OpenWare
- Hardware files: https://github.com/RebelTechnology/RebelTechnology
- Befaco hardware repo (README only): https://github.com/Befaco/hardware

**Other open designs**
- Torvalds GuitarPedal: https://github.com/torvalds/GuitarPedal
- Mutable Instruments: https://github.com/pichenettes/eurorack
- 4ms Company:
  - https://github.com/4ms/STS
  - https://github.com/4ms/DLD
  - https://github.com/4ms/SWN
  - https://github.com/4ms/SMR
- Axoloti: https://github.com/axoloti/axoloti
- Ksoloti: https://github.com/ksoloti/ksoloti
- Terrarium (PedalPCB): https://docs.pedalpcb.com/project/Terrarium-PedalPCB.pdf
- Hothouse: https://github.com/clevelandmusicco/open-source-pedals
- FunBox: https://github.com/GuitarML/FunBox

**Parts and sourcing**
- TI PCM3060 product page (Active): https://www.ti.com/product/PCM3060
- LCSC/JLCPCB parts data: JLCPCB parts API (`selectSmtComponentList`). LCSC product URLs follow the pattern https://www.lcsc.com/product-detail/...\_C{number}.html for each C-number cited above.
