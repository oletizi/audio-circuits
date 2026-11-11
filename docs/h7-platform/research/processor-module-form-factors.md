# Processor module form factors: survey for splitting the h7-platform into a core module and audio carriers

Ported from: [docs/research/2026-10-05-processor-module-form-factors.md](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/research/2026-10-05-processor-module-form-factors.md)

Pedals paths this document cites, pinned at the same commit where they exist there: [`h7-platform/pinmap.json`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/pinmap.json), [`h7-platform/boards/v1/SUMMARY.md`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/boards/v1/SUMMARY.md), [`h7-platform/CORE-BRIEF.md`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/CORE-BRIEF.md). The OSCAR KiCad checkout `.tools/oscar` it names is not a file in the pedals history at that commit, so it has no link.

> **Dated research. Background only; it does not bind.** This is a research document as it stood in the pedals repository at commit `5b926d0`, brought across below this banner with its text as written; the only edits are that pedals file paths became pinned links. It records what the research found on its date, and a later decision may have overtaken any claim in it. The documents that bind are [decisions.md](../decisions.md) and [architecture.md](../architecture.md); where this text and either of them disagree, they win, and this text is left as the research said it.

Research date: 2026-10-05. Scope: choose a processor-module pinout that matches a popular, available, off-the-shelf STM32H7 board, so the real board can stand in during development and our own compatible module can be built for production. One or more analog/audio carrier boards plug into it.

**Owner direction (2026-10-05, settled).** The codec stays **off** the processor module. The PCM3060 and everything analog go on the carrier/audio board. The module talks to audio boards over digital audio only: one SAI (or I2S) block with MCLK, plus I2C if a codec needs it. "Codec on module vs carrier" is therefore no longer a sub-decision. The survey instead checks, for every candidate, whether the pinout brings out a **full SAI block with MCLK** that stays usable alongside the module's own SDRAM and QSPI, and still leaves the ADCs and GPIOs we need.

**Legend.** **V** = verified: I saw it in the file or page cited. **U** = unverified: from a secondary source, or inferred. Nothing here is legal advice; the licence notes say what the files state.

---

## 0. What the module must carry through its connector

From [`h7-platform/pinmap.json`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/pinmap.json) and [`h7-platform/boards/v1/SUMMARY.md`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/boards/v1/SUMMARY.md), with the codec moved to the carrier:

| Group | Signals | Count |
|---|---|---|
| Digital audio to the carrier codec | MCLK, BCK (SCK), LRCK (FS), DAC data, ADC data | 5 (one SAI with both blocks, or one block plus the other block's data pin) |
| Codec control | CODEC_RST (GPIO); CODEC_I2C_SCL/SDA (DNF on v1, hardware mode) | 1 + 2 optional |
| Analog inputs | POT1–POT6, EXPR_TIP, HW_REV | 8 ADC |
| GPIO | TOGGLE1–3 A/B (6), FSW1–2 (2), LED1–2 (2, PWM), RELAY_EN (1), EXPR_DETECT (1) | 12 |
| MIDI | UART TX/RX | 2 |
| USB | D+/D−, VBUS sense | 2–3 |
| Debug | SWDIO, SWCLK, NRST (can live on the module) | 3 |
| Power | VIN or 3V3, GND, a clean 3V3/VDDA reference for the pots | 3+ |

So the module connector needs about **5 SAI + 8 ADC + 13–15 GPIO + 2 UART + USB + power**, around 35 signal pins.

---

## 1. Summary table

| Candidate | MCU (firmware fit with our H743IIT6) | SDRAM on module | Connector | Full SAI + MCLK out, alongside SDRAM/QSPI? | 8 ADC + ~15 GPIO + UART left? | Available today | Can we build our own compatible module? | Pedal/synth precedent | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **Daisy Seed / Seed3 (40-pin)** | STM32H750IB, BGA. Same core and peripherals; 128 KB internal flash, so dev builds run from QSPI | 64 MB, 32-bit | 2×20 THT, 2.54 mm, rows 15.24 mm apart | **Yes, SAI2** on pins 31–35 (V) | Yes, tightly: 9 ADC + 15 digital + USB pair | Seed3 $29.99, out of stock, "restock en route"; original Seed no longer listed | Yes: pinout plus MIT-noticed datasheet, own PCB | Many: Terrarium, Hothouse, FunBox, Versio, Daisy Patch (external codec on SAI2) | **Recommended interface** |
| Daisy Seed2 DFM (50-pin) | Same as Seed | 64 MB | 5 × 2×5 SMT, 1.27 mm | **Yes, SAI2**, same pins (V) | Yes, more room: 11 ADC after SAI | $29.99, in stock | Yes (as above) | Product-oriented variant; precedents U | Good electrically; second footprint, not drop-in with Seed |
| Daisy Patch SM | STM32H750IB | 64 MB | 4 × 2×5 THT, 2.54 mm | **No.** SAI2 SCK pin is behind CV conditioning; I2S2 has no MCLK pin | ADCs are Eurorack-scaled | $39.99, sold out | — | Eurorack only | Poor fit |
| Arduino Portenta H7 | STM32H747XI, dual-core BGA | 8 MB | 2 × Hirose DF40 80-pin, 0.4 mm, plus MKR headers | I2S2 with MCK on J1 (V); the SAI on J2 has no MCLK | 8 ADC exactly; enough GPIO | About $114, active, quoted 18-week lead time | CC BY-SA 4.0 pinout and schematics; share-alike applies | Not in pedals | Poor fit (8 MB, I2S not SAI, cost) |
| WeAct MiniSTM32H7xx | STM32H743VIT6, LQFP-100 | **None** (LQFP-100 cannot address SDRAM) | 2 × 2×22, 2.54 mm | **No** in practice: SAI1_MCLK_A (PE2) is the QSPI IO2 line; PE3 drives the LED | Yes | Cheap, AliExpress/Taobao | GPL-3.0 repository | No | Poor fit (no SDRAM) |
| Waveshare CoreH743I | **STM32H743IIT6, LQFP-176: the same part as ours** | 8 MB (IS42S16400J) | 2.0 mm double-row headers, "all the I/O ports" | **Yes, SAI1 on PE2–PE6** if the onboard SDRAM leaves them free (U; must check the schematic) | Yes: every pin is out | $53.99, Waveshare store | Our own pin map, so no pinout licence question | None in audio | **Runner-up** |
| Emcraft SOM-STM32H7 (the module ST lists) | STM32H750, TFBGA-240 | 32/64 MB | 128 castellated pads, 1 mm | Up to 3 SAI per the block diagram (V); exact pins behind a login | Probably | Price and stock on request | No: closed design, schematics only with a paid kit | Industrial | Poor fit |
| OSCAR_PROC_01 / OSCAR_AUDIO_01 | STM32H743IIT6, the same as ours | 64 MB | Ad hoc 1×7 + 1×6 2.54 mm sockets | Yes, SAI1 PE2–PE6 crosses a 2.54 mm header (V) | Its UI sits on the processor board | DIY, gerbers only | MIT (and Apache-2.0 claim) | One DIY pedal | Precedent, not a standard |
| Generic H743IIT6 + 32 MB SDRAM core boards (AliExpress, "FK743", ALIENTEK) | Same part as ours | 32 MB, W9825G6KH (our class) | Varies by seller | Usually yes (U) | U | Marketplace listings, no lifecycle | U, often no files | None found | Poor fit (no stable standard) |

---

## 2. Candidates in detail

### 2.1 Daisy Seed (Rev7) and Seed3: 40-pin

Sources: Daisy Seed datasheet v1.0.5 (Electrosmith, Jan 2023), mirrored at <https://www.electrokit.com/upload/product/41020/41020659/Daisy_Seed_datasheet_v1.0.5.pdf>; current Seed datasheet v1.2.0 (Mar 2026) <https://daisy.nyc3.cdn.digitaloceanspaces.com/products/seed/Daisy_Seed_datasheet.pdf>; Seed3 datasheet v2.1.0 (Aug 2026) <https://daisy.nyc3.cdn.digitaloceanspaces.com/products/seed3/Daisy_Seed3_datasheet.pdf>; Seed3 shop page <https://daisy.audio/products/seed3>; catalogue <https://daisy.audio/collections/all>; pricing update <https://daisy.audio/blogs/seeds-n-circuits/daisy-fulfillment-pricing-update-2026>; libDaisy (MIT) <https://github.com/daisyaudio/libDaisy>.

1. **MCU.** STM32H750IB, Cortex-M7 at 480 MHz (V, Seed3 datasheet). Earlier research found the package to be UFBGA-176+25 (U for the module). The H750 is the 128 KB-flash value-line part of the same family as our H743, with the same peripherals and pin functions. Our firmware's peripheral code ports directly. The difference is flash: on a real Seed, development builds must run from QSPI or RAM through the Daisy bootloader, not from 2 MB internal flash. On our own module, with an H743, the firmware runs from internal flash as planned. HSE on the Seed is 16 MHz (libDaisy, per the 2026-09-30 research), ours is 25 MHz, so the clock setup is per-board configuration.
2. **On the module.** MCU; 64 MB SDRAM (AS4C16M32MSA on a 32-bit bus, per earlier research, U); 8 MB QSPI flash (V, Seed3); onboard codec (Rev7: PCM3060 on SAI1 PE2–PE6, hardware mode, V; Seed3: TI TAC5242, V); a VIN regulator (VIN 4–17 V, V); a codec LDO; USB connector (micro-USB on Rev7, USB-C on Seed3, with USBLC6-2SC6 on Seed3, V); a 2×5 1.27 mm JTAG/SWD header (V for Rev7, which ships it; U for Seed3); a user LED on PC7 (V).
3. **Connector.** 2×20 THT pins, 2.54 mm pitch, rows 15.24 mm apart, board 51 × 18 mm (V, landing pattern). **SAI with MCLK:** pins 31–35 carry SAI2: PA1 SAI2_MCLK_B, PA0 SAI2_SD_B, PD11 SAI2_SD_A, PG9 SAI2_FS_B, PA2 SAI2_SCK_B (V, Table 2). None of these is used by the module's SDRAM, QSPI or onboard codec, so the full block is free. Electrosmith's own datasheet v1.2.0 Figure 2.0 is a reference circuit for an **external PCM3060 on exactly these pins** (V). libDaisy's `daisy_patch.cpp` drives a second codec (AK4556) on the carrier through these pins, with block B as master receive and block A as synchronous slave transmit (V).
   - **Pin budget with SAI2 taken:** 9 ADC pins remain (A0–A8: PC0, PA3, PB1, PA7, PA6, PC1, PC4, PA5, PA4) for our 8 analog inputs, which leaves one spare. 15 digital pins remain (D0–D14). D29/D30 (PB14/PB15) are the second USB port, used for the carrier's USB-C.
   - Our 12 GPIO plus CODEC_RST plus MIDI UART (USART1 on PB6/PB7) need 15. That fits **exactly**, with the spare ADC pin as the only margin, **if the codec I2C pins are dropped**. They are DNF on v1 because the PCM3060 runs in hardware mode, so dropping them costs nothing today. A codec that needs I2C on a later carrier would take PB8/PB9 and cost two of the GPIOs.
   - LED PWM fits: PB4/PB5 are TIM3_CH1/CH2 (V, ST alternate functions in the Seed table).
   - **USB:** the header carries only the OTG_HS port with its internal FS PHY (PB14/PB15). The ROM DFU bootloader uses only OTG_FS on PA11/PA12 (AN2606, quoted in [`h7-platform/CORE-BRIEF.md`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/CORE-BRIEF.md) §5), and those pins go to the module's own USB socket. ROM-DFU recovery therefore stays on the module's socket, not the carrier's USB-C. This changes our "PA11/PA12 recovery" invariant (see §4).
   - **Power:** VIN on the Seed is rated 4–17 V absolute (V). Our spec requires surviving 18 V, so the carrier must feed the module from a protected, regulated rail, not raw VIN_PROT.
4. **Availability.** Seed3 costs $29.99 each, falling to $23.99 at 1000 (V). It is **sold out, "Restock en route"** today (V). The original Seed is no longer in the catalogue (V, catalogue lists Seed2 DFM, Seed3, Patch SM, kits). Its v1.0.5 datasheet promised manufacture "until January, 2027"; v1.2.0 dropped that page (V). The Seed3 datasheet's copyright line is now "Qu-Bit Electronix, Inc. DBA Daisy" (V). The 2026 price update cites memory-chip cost increases (V). The board has a single source (Daisy). That matters only for development, because production uses our own module.
5. **Licence.** The Seed, Seed2 DFM, Patch SM and Seed3 datasheets carry the MIT permission notice, which names "documentation files" (V). libDaisy is MIT (V, GitHub licence field). Full schematics are not published: the Seed schematic is a "reduced" PDF, and the Hardware repository was withdrawn (V, 2026-09-30 research). We would copy no Daisy circuitry, only the header pin assignment, which is published under the MIT notice. Do not use the "Daisy" name on our module (trademark caution; U whether it is registered).
6. **Precedents.** Shipping or kit pedals built on the Seed include PedalPCB Terrarium (6 knobs, 4 switches, 2 footswitches, 2 LEDs, the same control set as ours), Cleveland Music Co. Hothouse, GuitarML FunBox and kshep's 125B build (V, Daisy community thread <https://community.daisy.audio/t/summary-of-daisy-seed-guitar-pedal-hardware-options/7336>). Noise Engineering's Versio Eurorack platform runs on a Seed (V, <https://noiseengineering.us/blogs/loquelic-literitas-the-blog/create-your-own-firmware-on-a-versio-module/>). Electrosmith's Daisy Patch puts a second codec on the carrier through SAI2 (V, libDaisy). The pinout has been stable across Rev4, Rev5, Rev7 and Seed3, through three codec changes (V, "Hardware Revisions" page and Seed3 "pin-to-pin compatible").
7. **Schematic carry-over (our own Seed-pinout module).**
   - **Module, unchanged:** MCU support (decoupling, VCAP, VDDA ferrite, PDR_ON, NRST supervisor, BOOT0, crystal), QSPI flash, SDRAM circuit and the SWD header move over as they are.
   - **Module, changed:** three SDRAM control nets move off pins the Seed header needs. FMC_SDNWE goes from PC0 to PH5, FMC_SDNE0 from PC4 to PH3, and FMC_SDCKE0 from PC3_C to PH2. These are the standard bank-1 alternates, Daisy's own choice per earlier research (U), and PH2/PH3 were freed by delta D11. The 3V3 buck moves onto the module, fed from the carrier.
   - **Pin map:** every carrier signal is reassigned to a Seed pin, and SAI1 becomes SAI2. That is a firmware configuration change: the same PLL3 kernel clock can feed SAI2 (U, RM0433 kernel-clock table).
   - **Carrier:** the codec sheet, audio-io, controls and most of power move to the carrier unchanged, except for the nets that land on the header. USB-C moves to D29/D30.

### 2.2 Daisy Seed2 DFM: 50-pin SMT

Source: datasheet v1.0.11 <https://daisy.nyc3.cdn.digitaloceanspaces.com/products/seed2-dfm/Daisy_Seed2_DFM.pdf>; page <https://daisy.audio/pages/daisy-seed2-dfm>.

- **MCU and module contents.** As the Seed: 64 MB SDRAM, onboard codec with **differential** audio I/O (V). No JTAG header (V, pricing update). The datasheet does not name the codec (U).
- **Connector.** 50 pins in five 2×5 banks, SMT male, 1.27 mm. The mating carrier part is Amphenol 20021311-00010T4LF / 20021321-00010C4LF (V). The board is 28 × 55 mm (V). VIN is 6.1–15 V (V).
- **SAI.** The same SAI2 pins: E1 PA1 MCLK_B, E2 PA0 SD_B, E3 PD11 SD_A, D10 PG9 FS_B, E4 PA2 SCK_B (V). It adds PC2/PC3 (ADC12/13) on C10/D8 (V), so 11 ADC pins remain with SAI2 taken, which is more comfortable than the Seed.
- **Availability.** $29.99, **in stock** (377 units at the time of the search, U), and now sold to everyone, not just commercial accounts (V).
- **Verdict.** It is electrically the best Daisy part for us, and the one in stock. But it is a different footprint from the 40-pin Seed, it uses fine-pitch SMT headers, and it has a lower VIN maximum. Pick **one** Daisy footprint. The 40-pin Seed is the more widely copied interface; the DFM is the better product part. See §3.

### 2.3 Daisy Patch SM

Source: datasheet v1.0.5 <https://daisy.nyc3.cdn.digitaloceanspaces.com/products/patch-sm/ES_Patch_SM_datasheet_v1.0.5.pdf>.

- The module contains the MCU, SDRAM, codec **and Eurorack conditioning** (V). It needs ±12 V supplies (rated ±6 to ±17 V) (V).
- **SAI.** Not available. PA1/PA0 are exposed (A2/A3), but PA2, the SAI2 SCK, only reaches C3 as a conditioned, input-only CV jack. PD11 and PG9 are not exposed. SPI2/I2S2 pins (PB4, PD3, PC2, PC3) are exposed, but no I2S2_MCK (V, Table 2). PCM3060 needs MCLK. **Poor fit.**
- $39.99, sold out (V).

### 2.4 Arduino Portenta H7 (ABX00042)

Sources: datasheet <https://docs.arduino.cc/resources/datasheets/ABX00042-ABX00045-ABX00046-datasheet.pdf>; full pinout <https://docs.arduino.cc/resources/pinouts/ABX00042-full-pinout.pdf>; schematics <https://docs.arduino.cc/resources/schematics/ABX00042-schematics.pdf>; DigiKey <https://www.digikey.com/en/products/detail/arduino/ABX00042/11657626>.

1. **MCU.** STM32H747XIH6, dual core M7 + M4, BGA (V). It is the same family, but the dual-core power and boot setup differs from the H743, and the M4 core is unused by us. Firmware fit is fair, not direct.
2. **On the module.** 8 MB SDRAM, 16 MB QSPI (V). PMIC MC34PF1550, a 25 MHz crystal, a USB3320C HS PHY, Ethernet PHY, Wi-Fi/Bluetooth module and a secure element (V, block diagram). **8 MB is a quarter of our 32 MB baseline.**
3. **Connector.** Two Hirose DF40 80-pin, 0.4 mm board-to-board connectors (DF40C-80DP-0.4V(51) per search result, U), plus MKR-style 2.54 mm headers.
   - **SAI:** J1 carries I2S MCK/WS/DI/DO (pins 56/58/60/62, V), with I2S2 CK/SDI/SDO/WS nets (V, schematic). J2 carries "SAI CK/FS/D0" (49/51/53, V) **without MCLK**. A PCM3060 could run from the I2S2 port with MCK, but through the SPI/I2S peripheral rather than SAI. That is a firmware audio-driver change.
   - **ADC:** A0–A7, exactly 8 (V). GPIO 0–6 plus PWM 0–9 are enough. SWD is on J1 (V).
4. **Availability.** About $113.90 (V, search snippet of distributor pricing). Active, with an 18-week manufacturer lead time (U, distributor snippet). Single source (Arduino).
5. **Licence.** The pinout and schematics state CC BY-SA 4.0 (V, pinout PDF). We could build a compatible module, but the share-alike terms would attach to the derived design files. Arduino is a trademark.
6. **Precedents.** No pedal or synth found.
7. **Carry-over.** Low: different MCU variant, BGA, PMIC power, and I2S instead of SAI.

**Verdict: poor fit.** The SDRAM is too small, the price is about four times a Seed, there is no MCLK on the SAI port, and the 0.4 mm connectors are fine-pitch.

### 2.5 WeAct MiniSTM32H7xx (H743VIT6 / H750VBT6)

Sources: <https://github.com/WeActStudio/MiniSTM32H7xx> (README, `Hardware/STM32H7xx SchDoc V12.pdf`); NuttX board page <https://nuttx.apache.org/docs/latest/platforms/arm/stm32h7/boards/weact-stm32h743/index.html>; CNX review <https://www.cnx-software.com/2024/03/12/weact-stm32h743-arm-cortex-m7-board-ships-with-a-0-96-inch-lcd-and-a-choice-of-camera-sensors/>.

1. **MCU.** STM32H743VIT6, LQFP-100 (V). It has the same die as ours, so the firmware fits. But **LQFP-100 does not bring out the PF/PG FMC address pins, so it cannot carry SDRAM** (U, from the package pin set; the board has none, V).
2. **On the module.** 8 MB QSPI (W25Q64) plus 8 MB SPI flash, a 0.96" ST7735 LCD, microSD, a DCMI camera port, a 25 MHz HSE, a TLV62569 buck and USB-C (V).
3. **Connector.** Two 2×22 2.54 mm headers; the board is 40.64 × 66.88 mm (V).
   - **SAI:** the QSPI uses PB2 CLK, PB6 NCS, PD11 IO0, PD12 IO1, **PE2 IO2** and PD13 IO3, and the blue LED transistor sits on **PE3** (V, schematic V12). PE2 is the only SAI1_MCLK_A pin in this package, and SAI2 block A's LQFP-100 pins (PD11–PD13) are the QSPI. A full SAI with MCLK means giving up the QSPI flash or rewiring. **Not usable as built.**
4. **Availability.** WeAct official Taobao and AliExpress stores (V), cheap; single source.
5. **Licence.** The repository is GPL-3.0 (V).
6. **Precedents.** None found in audio.

**Verdict: poor fit** (no SDRAM, and the SAI MCLK pin is taken).

### 2.6 Waveshare CoreH743I

Sources: product page <https://www.waveshare.com/product/coreh743i.htm>; wiki <https://www.waveshare.com/wiki/CoreH743I>.

1. **MCU.** **STM32H743IIT6, LQFP-176: the exact part on our v1 board** (V). Firmware fits directly. The one difference is the HSE crystal: 8 MHz on the Waveshare board (V) against our 25 MHz, handled in the per-board clock configuration.
2. **On the module.** 8 MB SDRAM (IS42S16400J, 64 Mbit x16, in the same TSOP-II-54 package as our class) (V), a 32.768 kHz crystal, USB with power management, and a JTAG/SWD connector (V).
3. **Connector.** 2.0 mm pitch headers, and "All the I/O ports are accessible on the pin headers" (V). The exact pin count was not verified (U).
   - **SAI:** SAI1 on PE2–PE6 is available unless the onboard SDRAM uses those pins. Standard FMC SDRAM uses PE0/PE1/PE7–PE15, not PE2–PE6 (U for Waveshare's routing; check the schematic before committing).
   - ADC and GPIO: everything is out. PA11/PA12 are reachable, so the carrier's USB-C keeps ROM DFU.
4. **Availability.** $53.99 each from Waveshare (V). Stock and lifecycle were not stated (U). Single source.
5. **Licence.** If we follow this route, our module's pinout is simply our own pin map, so no third-party pinout question arises. Waveshare publishes the schematic for reference (U for its licence terms).
6. **Precedents.** None in audio or pedals.
7. **Carry-over.** Almost all of it. The core sheet becomes the module as it is. The pin map is unchanged, except where Waveshare's SDRAM routing takes a pin we use, which must be checked. The carrier is the rest of v1.

**Verdict: runner-up.** It gives the best firmware and schematic carry-over, but it is not a popular, proven audio interface. Its 8 MB SDRAM limits buffer sizes on the stand-in, and its headers are large and fine-ish pitch.

### 2.7 ST's own STM32H7 modules

- ST sells no STM32H7 SoM of its own. Its partner page for an "STM32H7 System-on-Module (SOM-STM32H7)" is Emcraft's product (V, search result for <https://www.st.com/en/partner-products-and-services/stm32h7-system-on-module-som-stm32h7.html>; the page itself timed out on fetch).
- ST's H7 boards (NUCLEO-H743ZI2, STM32H747I-DISCO, H743I-EVAL) are development boards, not modules.

### 2.8 Emcraft SOM-STM32H7

Sources: hardware architecture v1.1 <https://emcraft.com/som/stm32h7/stm32h7-som-ha-1_1.pdf>; resource page <https://www.emcraft.com/products/1090>.

- **Module.** STM32H750, TFBGA-240; 32/64 MB SDRAM on a 16/32-bit bus; 64 MB QSPI NOR; 25 MHz crystal; 30.5 × 40.5 mm; single 3.3 V supply (V).
- **Connector.** 128 castellated edge pads, 1 mm pitch (V).
- **SAI.** Up to 3 SAI per the block diagram; the ETM trace shares pins with SAI1/SAI4 (V). The exact pinout is a spreadsheet behind registration (V).
- **Availability.** Price on request; "please contact us about part availability" (V).
- **Licence.** Closed: schematics come only with the purchased Starter and Design kits (V).
- **Verdict: poor fit.** No cheap stand-in, closed design, single source, uClinux-oriented, and no audio precedent.

### 2.9 OSCAR_PROC_01 / OSCAR_AUDIO_01 (the split we copied)

Source: `.tools/oscar` (KiCad; not a file in the pedals history at the pin), [`h7-platform/CORE-BRIEF.md`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/CORE-BRIEF.md) §1–§2.

- **MCU and module.** STM32H743IIT6 LQFP-176, 64 MB IS42S16320, two W25Q128 flashes, USB, SWD (V). The processor board also carries the pedal UI: TFT, encoders and footswitch headers (V).
- **Interconnect.** Ad hoc 2.54 mm single-row sockets and headers: 1×7, 1×6, 1×3 and several 1×2 (V, KiCad footprints). The SAI link is pins 1–5 of J7 to J5, carrying SAI1 SD_A, SCK_A, FS_A, SD_B and MCLK_A on PE2–PE6 (V, CORE-BRIEF §2). This shows a working precedent of **codec on the audio board, SAI1 plus MCLK over a 2.54 mm header**.
- **Licence.** MIT (and an Apache-2.0 claim on AUDIO_01) (V).
- **Availability.** DIY gerbers only; not an off-the-shelf module.
- **Verdict.** It is the ancestor of our core and confirms the codec-on-carrier split, but it is not a module standard to match.

### 2.10 Other STM32H7 boards seen

- **Generic H743IIT6 + 32 MB SDRAM core boards** (eBay, Amazon, AliExpress; "FK743M", ALIENTEK, "TKOWTB"). They carry the same MCU and the same SDRAM class as ours (W9825G6KH) (U, listing text, e.g. <https://www.ebay.com/itm/126773215556>). Pinouts differ per seller, documentation varies, and none states a lifecycle. Not a standard to build to.
- **No other STM32H7 audio module** with a published pinout and shipping pedal use was found. The Rebel OWL H7 products (Genius, Magus, Lich, Witch) are single-board designs, not modules (2026-09-30 research). Teensy and Bela are not STM32.

---

## 3. Recommendation

### First choice: the Daisy Seed 40-pin interface, with the codec on the carrier over SAI2

**What it means.**
- The carrier board has the Seed's 2×20, 2.54 mm socket footprint.
- The PCM3060 sits on the carrier, wired to header pins 31–35 (SAI2, with MCLK) exactly as in Electrosmith's own "External Audio Codec" reference circuit.
- Pots, toggles, footswitches, LEDs, relay, expression and MIDI land on the Seed's ADC and GPIO pins (§2.1 item 3).
- **Development:** plug in a real Seed3 (or the original Seed). Its onboard codec is simply left unused.
- **Production:** plug in **our own module**: an STM32H743 with our 32 MB SDRAM, QSPI flash, 25 MHz crystal, supervisor, 3V3 regulator, USB socket and SWD header, with its pins in the Seed positions. It has no codec. Nothing in production comes from Electrosmith or Qu-Bit.

**Why.** It is the only candidate that meets all three of the owner's tests:
- It is popular, known-good and available. Seed3 is in production at $29.99 and pin-compatible across four hardware revisions.
- Its interface is proven in shipping pedals and synths, including a commercial carrier that hosts its own codec over these exact SAI2 pins (Daisy Patch).
- It brings out a full SAI with MCLK that does not collide with the module's SDRAM or QSPI.

It also has the same control set as the Terrarium pedal, which already fits on it.

**Trade-offs, stated plainly.**
1. **The pins are tight.** With the codec on SAI2 we have **one spare pin**, and only because the codec's I2C lines are dropped (they are unfitted today anyway). A future codec that needs I2C, or a new control, would need a pin taken from somewhere else. Switching the module footprint to the Seed2 DFM later would give two more pins, but it is a different footprint.
2. **Our module will not be Seed-sized unless we go to BGA.** The Seed is 18 mm wide, and our LQFP-176 MCU is about 26 mm square, so it cannot fit between or beside the header rows inside that outline. Two ways out:
   - **(a) Keep our LQFP-176 and SDRAM as designed and make the module larger,** with the header pins in the Seed positions. The carrier reserves a bigger keep-out area. This carries the schematic over and adds no new technique. **Recommended.**
   - **(b) Match the Seed outline exactly,** using the UFBGA-176 version of the H743 (H743IIK6, the same die) and a BGA SDRAM, as Daisy does. That is a new risk for us: fine-pitch BGA fan-out, more layers and X-ray-inspected assembly. Keep it for later.
3. **USB recovery changes.** The Seed header carries only the second USB port (PB14/PB15). The chip's built-in USB DFU recovery works only on PA11/PA12, which stay on the module's own USB socket. The carrier's USB-C can do USB-MIDI and application-level firmware updates, but last-resort recovery means reaching the module's socket or using SWD. On our own module we can place its USB socket where an enclosure hole can expose it.
4. **The development stand-in is not identical silicon.** A real Seed has an H750 with 128 KB of internal flash, a 16 MHz crystal, a 32-bit SDRAM bus and 64 MB. Development firmware on a Seed must run from QSPI through the Daisy bootloader, and the board configuration (clock, SDRAM) differs from our module's. The audio, ADC, GPIO and USB code is the same.
5. **18 V survival** must be handled on the carrier. The Seed's VIN maximum is 17 V, so the carrier feeds the module from a protected, regulated rail.
6. **Single-source development part.** The stand-in exists only while Daisy sells it. The Seed3 is out of stock today, and the original Seed is no longer listed. Buy a few stand-ins now. Production is unaffected.

### Second choice: an "every pin out" H743IIT6 core board (Waveshare CoreH743I class), with our own module using our existing pin map

**Why second.**
- It is the closest silicon match: the same H743IIT6 LQFP-176.
- SAI1 on PE2–PE6, every ADC and PA11/PA12 are all on the header, so **our v1 pin map and USB recovery invariant survive unchanged**. Almost the whole v1 schematic carries over.
- The stand-in costs $53.99 and is available from Waveshare.

**Why not first.**
- No audio or pedal product uses this interface, so the module pinout would effectively be our own invention.
- The stand-in has 8 MB of SDRAM and an 8 MHz crystal.
- Its 2.0 mm headers are large.
- Waveshare's internal SDRAM routing must still be checked for collisions with our pin map before committing (U).

### SAI pin availability per candidate (replaces the codec-placement sub-decision)

| Candidate | SAI block with MCLK on the connector | Free alongside onboard SDRAM/QSPI? |
|---|---|---|
| Daisy Seed / Seed3 | SAI2: PA1 MCLK_B, PA2 SCK_B, PG9 FS_B, PA0 SD_B, PD11 SD_A (pins 31–35) (V) | Yes (V; the onboard codec uses SAI1 internally) |
| Daisy Seed2 DFM | SAI2, same pins (E1–E4, D10) (V) | Yes (V) |
| Daisy Patch SM | None: SAI2 SCK is behind CV conditioning; I2S2 has no MCK (V) | — |
| Portenta H7 | I2S2 with MCK on J1 (V); SAI on J2 has no MCLK (V) | Yes for I2S2 (U); SAI unusable for PCM3060 |
| WeAct H743VIT6 | SAI1_MCLK_A PE2 is the QSPI IO2; PE3 drives the LED (V) | No |
| Waveshare CoreH743I | SAI1 PE2–PE6 on the headers (V that all I/O are out) | Probably (U; check the SDRAM routing) |
| Emcraft SOM-STM32H7 | Up to 3 SAI (V); pins behind a login | U |
| OSCAR_PROC_01 | SAI1 PE2–PE6 on J7 (V) | Yes (V) |

### Next steps if the owner accepts the first choice

1. Re-map [`h7-platform/pinmap.json`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/pinmap.json) onto Seed pin positions. Move the SDRAM control nets to PH2/PH3/PH5, and switch the audio from SAI1 to SAI2. Re-run the pin-map checks.
2. Settle the module outline (option 2a) and the carrier keep-out with the enclosure layout.
3. Decide the module's USB socket position for recovery access.
4. Buy two or three Seed3 or Seed boards as development stand-ins while they are in stock.

---

## Pass 2 (codec-master clocking)

Research date: 2026-10-05, after pass 1. **Pass 1 above is left as it was written**; where pass 2 corrects it, this section says so.

**New rule (owner, 2026-10-05).**
- The audio board carries its own clock source. The codec is the clock master and generates BCK and LRCK. The STM32 SAI runs as a slave.
- MCLK is therefore no longer a module pin.
- The module must bring out one complete audio port of four pins: **SCK, FS, SD-in, SD-out**. The pins may come from:
  - two sub-blocks of one SAI (SAI1–SAI4), where one block is the synchronous slave of the other, so only one SCK and one FS pin are needed;
  - or an SPI/I2S block in full-duplex I2S.
- The four pins must be free of the module's own SDRAM, QSPI and on-board peripherals.

**TDM.** Every SAI supports TDM. Plain I2S on the SPI/I2S peripheral does not. A port that is I2S-only limits a future multi-channel codec to two channels per data line (U for the exact RM0433 section; this is the stated premise of the rule).

### P2.1 Is codec-master / SAI-slave proven practice?

Yes. Several independent shipping designs do it, and the PCM3060 supports it in hardware mode.

| Design | MCU | What the source shows | Status |
|---|---|---|---|
| **Rebel Technology OWL Genius** | STM32H743ZG | `Genius/Src/main.c`: `hsai_BlockA1.Init.AudioMode = SAI_MODESLAVE_TX`, `hsai_BlockB1 ... SAI_MODESLAVE_RX`, I2S 24-bit (V). `Genius.ioc`: SAI1 on PD6 SD_A, PE3 SD_B, PE4 FS_A, PE5 SCK_A, with **no SAI MCLK pin** (PE2 is SPI4_SCK) (V). <https://github.com/RebelTechnology/OpenWare> | Shipping (2026-09-30 research) |
| Rebel OWL family (Lich, Lich3, Magus, Magus3, MagusH7, Witch, Witch3, Wizard, Prism, OwlPedal2, Xibeca, Noctua and others) | STM32F4/F7/H7 | `SAI_MODESLAVE_TX/RX` in every listed target's `main.c` or `.ioc` (V, GitHub code search of OpenWare) | Shipping (U per product) |
| **Mutable Instruments Clouds, Rings, Warps** (revised hardware) | STM32F405 | `codec.Init(!version.revised(), ...)` passes `mcu_is_master = false` on revised boards, giving `I2S_Mode_SlaveTx` (V, `pichenettes/eurorack` `rings/rings.cc`, `clouds/clouds.cc`, `warps/warps.cc`, `rings/drivers/codec.cc`) | Shipped in volume |
| 4ms mdrivlib (used across 4ms firmware) | STM32F7/H7/MP1 | `SaiConfig::RXMaster` sets RX as `SAI_MODEMASTER_RX` and TX as `SAI_MODESLAVE_TX`; the opposite mode makes both blocks slave-capable (V, `4ms/mdrivlib` `drivers/sai.cc`). Which 4ms products select codec-master is U. | Library |
| RT-Thread ART-Pi MEDIA-IO audio board (WM8988) | STM32H750 | Schematic note: "默认使用外部24Mhz晶振提供MCLK，如果选择MCU提供MCLK，需要手动解焊R20，焊接R21" ("by default an external 24 MHz crystal supplies MCLK; to have the MCU supply it, remove R20 and fit R21") (V, `SCH_MEDIA-IO_V1.2.pdf`) | Reference/dev board |

**PCM3060 in master mode (TI SLAS533B, March 2007, revised March 2008, <https://www.ti.com/lit/ds/symlink/pcm3060.pdf>), all V:**
- **Parallel hardware control, IFMD (pin 27):** "LOW: Slave mode for ADC, slave mode for DAC; HIGH: Master (256 fS) mode for ADC, slave mode for DAC". So hardware mode **does** support master, but only for the ADC, at 256 fS.
- "In master mode, BCK1/2 and LRCK1/2 are outputs from the PCM3060. BCK1/2 and LRCK1/2 are generated by the PCM3060 from SCKI1/2, and BCK1/2 is fixed at 64 fS."
- Our v1 codec sheet already ties BCK1 to BCK2 and LRCK1 to LRCK2 ([`h7-platform/CORE-BRIEF.md`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/CORE-BRIEF.md) §2). With IFMD high, the ADC drives both clocks and the DAC slaves to the same clocks. One strap change does it: **IFMD from DGND to VDD**.
- **The codec does not make its own system clock.** SCKI1/SCKI2 are inputs only ("System clock input for ADC / DAC"; there is no oscillator amplifier in the pin table). The audio board therefore needs a **12.288 MHz packaged crystal oscillator (XO)**, not a bare crystal, driving SCKI1 and SCKI2. This is 256 fS at 48 kHz, the only ratio hardware-mode master allows.
- "In master mode, there is a possibility of performance degradation due to heavy loads on BCK1/LRCK1, BCK2/LRCK2 and DOUT. It is recommended to load these pins as lightly as possible." Best practice across a module connector: short traces, a series resistor of about 22–33 Ω at the codec on BCK, LRCK and DOUT, and a ground pin beside each clock pin. If a carrier ever drives a long or multi-drop clock run, buffer it.
- Firmware consequence: PLL3 no longer sets the sample rate. Both SAI blocks become slaves, and the 48 kHz rate is set by the XO, so the MCU and codec cannot drift apart.

### P2.2 Re-check of every candidate under the new rule

"Port" means the four-pin audio port. Changed verdicts are marked **(changed)**.

| Candidate | Audio port (4 pins, no MCLK) | Free of SDRAM/QSPI/on-board parts? | TDM? | Effect on ADC/GPIO budget | Verdict |
|---|---|---|---|---|---|
| Daisy Seed / Seed3 (40-pin) | SAI2: PA2 SCK_B (pin 35), PG9 FS_B (34) or PC0 (22), PA0 SD_B (32), PD11 SD_A (33) (V, Seed and Seed3 Table 2; libDaisy `daisy_patch.cpp` uses the same set) | Yes (V) | Yes | **PA1 (A9) is freed**: 10 ADC for 8 needed, 15 digital pins, 2 spare. The codec I2C pins now fit too. | Recommended, with more margin |
| Daisy Seed2 DFM | SAI2, same pins (E4, D10, E2, E3) (V) | Yes (V) | Yes | 12 ADC after the port | Good fit (unchanged) |
| Daisy Patch SM **(changed)** | I2S2 full duplex: PB4 SPI2_CS/WS (D1), PD3 SPI2_SCK (D10), PC2 SPI2_MISO (D8), PC3 SPI2_MOSI (D9) (V, Table 2 alternate functions). SAI2 is still unusable (SCK only through CV conditioning). | Yes (V) | **No** (I2S) | It uses D8/D9, two of its few plain ADC pins | An audio port now exists, but it is still a **poor fit**: ±12 V supply, Eurorack conditioning, sold out |
| Arduino Portenta H7 **(changed)** | I2S2 full duplex: CK PD3, WS PB9, SDI PI2, SDO PI3 (V, schematic `ABX00042`, I2S2 bus) on J1 pins 56/58/60/62 (V that these four pins are the I2S group). **Correction to pass 1:** the pinout PDF labels J1-56 "I2S MCK", but the schematic's I2S2 bus has only CK, SDI, SDO and WS, so J1-56 is most likely the bit clock (U). The J2 "SAI" group shows CK/FS/D0 only (V); a second data line (net `SAI2A D1`) appears in the schematic but not on the pinout (U). | Yes (U; the I2S2 pins carry no SDRAM/QSPI function) | **No** on I2S2 | 8 ADC exactly | An audio port now exists, but it is still a **poor fit**: 8 MB SDRAM, H747, about $114 |
| WeAct MiniSTM32H7xx **(changed)** | (a) SAI1: PE5 SCK_A, PE4 FS_A, PE6 SD_A, PE3 SD_B. PE4–PE6 go only to the DCMI camera connector, free when no camera is fitted. PE3 drives the blue LED through a PDTC114ET digital transistor, so that load stays on SD_B unless the LED part is removed (V, schematic V12). (b) I2S2 on PB12–PB15: PB14/PB15 are only a header console UART (V, NuttX). | (a) Yes, with the LED caveat; (b) U | (a) yes; (b) no | Plenty of GPIO; LQFP-100 ADCs | Port possible, but still a **poor fit: no SDRAM** (LQFP-100) |
| Waveshare CoreH743I **(changed: now verified)** | SAI1: PE5 SCK_A, PE4 FS_A, PE6 SD_A, PE3 SD_B (or PD6 SD_A), on the 2.0 mm headers (V that all I/O are out) | **Yes (V).** The schematic `CoreH743I_SchDoc.pdf` shows the SDRAM (IS42S16400J) on FMC **bank 2**: SDNE1 PH6, SDCKE1 PH7, SDNWE PH5, SDNRAS PF11, SDNCAS PG15, SDCLK PG8, BA0/1 PG4/PG5, NBL0/1 PE0/PE1, A0–A11 on PF0–PF5/PF12–PF15/PG0/PG1, D0–D15 on PD0/PD1/PD8–PD10/PD14/PD15/PE7–PE15. **A12 (pin 36) is unconnected.** PE2–PE6 are free. | Yes | Everything else is out. **But PH6 (our LED1, TIM12_CH1) is its SDNE1**, so LED1 must move (TIM12_CH1 is also on PB14). | Runner-up, with two concrete fixes: move LED1, and match Waveshare's bank-2 SDRAM pins on our module. Being 64 Mbit with no A12, the stand-in cannot take a 32 MB part. |
| Emcraft SOM-STM32H7 | Up to 3 SAI (V); pins behind a login (V) | U | Yes | U | Poor fit (unchanged) |
| OSCAR_PROC_01 | SAI1 PE3–PE6 (V); PE2 MCLK simply unused | Yes (V) | Yes | — | Precedent (unchanged) |
| Generic H743IIT6 + 32 MB boards | U per seller | U | U | U | Poor fit (unchanged: no stable pin map) |

### P2.3 New candidates found by widening the search

| Candidate | MCU | SDRAM | Connector | Audio port (verified) | ADC/GPIO | Availability and licence | Verdict |
|---|---|---|---|---|---|---|---|
| **RT-Thread ART-Pi** | STM32H750XBH6, TFBGA-225, 128 KB flash (V, Zephyr board doc) | **32 MB** (V) | Two 2×20 2.54 mm headers, P1 Raspberry-Pi-compatible (V, `ART-Pi扩展引脚说明.pdf`) | SAI2 block A plus SD_B on P1's "RPI_AUDIO" group: **PI5 SCK_A, PI7 FS_A, PI6 SD_A, PG10 SD_B** (PI4 MCLK_A unused). V: the schematic `ART-Pi_SCH_V1.5_Release.pdf` maps the nets to balls A3/B3/A2/A9, and its MCU symbol maps those balls to PI5/PI7/PI6/PG10. | SDRAM: PC2 SDNE0, PC3 SDCKE0, PH5 SDNWE, PF11, PG8, PG15 (V, CubeMX `.ioc`); no overlap with the SAI2 pins. TDM yes. **Only 5 ADC channels on the headers** (V, CNX/Core Electronics summaries), against our 8. | DFRobot/Mouser/Core Electronics, about $40 (U). RT-Thread "open-source hardware"; the repository has no licence field (V), so hardware terms are U. It has a matching audio board with a codec-master crystal (MEDIA-IO, WM8988). | **New, poor fit for us**: too few ADC pins, single-source H750, Wi-Fi/ST-LINK baggage. Good evidence that a 32 MB H7 core with an SAI on a 2×20 header works. |
| phancak/STM32H7_Board (GitHub) | STM32H7S3 | U | U | U | U | Hobby project (U) | Not evaluated: the H7S is a different sub-family from our H743 |

No STM32H7 module with 32 MB or more SDRAM **and** at least 8 ADC pins **and** a stable public pin map was found other than the Daisy family and our own design. The Emcraft SOM remains the only commercial H7 SoM found (ST's partner page lists it). No H743 SoM was found.

### P2.4 Recommendation after pass 2

**First choice, unchanged: the Daisy Seed 40-pin interface. The carrier puts the PCM3060 in hardware-mode master (IFMD high) with its own 12.288 MHz XO, and wires it to SAI2 slave on pins 32–35.**
- Dropping MCLK frees one more ADC pin (PA1). The pin budget goes from one spare to two, and the codec I2C pins now fit as well.
- The Seed is still the only popular, available, pedal-proven interface with ≥ 32 MB SDRAM and enough ADC pins.
- Codec-master with an SAI slave is the arrangement the shipping OWL Genius already uses on the same H743. The PCM3060 datasheet supports it with one strap.
- All other pass-1 trade-offs still apply: larger module outline unless we use a BGA chip, ROM-DFU on the module's socket, the Seed's VIN limit, and a single-source development part.

**Runner-up, unchanged: a Waveshare CoreH743I-class board.**
- It is the same LQFP-176 H743. SAI1 on PE3–PE6 is now verified free of its SDRAM, and PA11/PA12 reach the carrier.
- Two verified fixes are needed:
  - LED1 moves off PH6, because Waveshare uses PH6 for SDNE1.
  - Our module copies Waveshare's FMC bank-2 SDRAM control pins (PH5/PH6/PH7), so one firmware build runs on both.
- Its 8 MB SDRAM with no A12 limits only the stand-in.

**Third: ART-Pi (new).** It has the right memory (32 MB) and a verified SAI on a 2.54 mm header, but only 5 ADC pins on its headers and an H750.

**Changes to make on the v1 design for codec-master, whichever module wins:**
1. PCM3060 IFMD strap from DGND to VDD (OSCAR ties pin 27 directly to DGND, [`h7-platform/CORE-BRIEF.md`](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/CORE-BRIEF.md) §2).
2. Add a 12.288 MHz 3.3 V CMOS XO on the carrier, feeding SCKI1/SCKI2, with its own 100 nF decoupling.
3. Fit series resistors near the codec on BCK, LRCK and DOUT.
4. Remove CODEC_MCLK from the module pin map.
5. Firmware: both SAI blocks become slaves, and the PLL3 audio configuration is no longer used for MCLK.
