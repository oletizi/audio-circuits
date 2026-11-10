# h7-platform firmware-facing requirements

Ported from:
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §5.5, §5.6.5, §6.4, §6.5, §9.3, §9.4, §11, §12.4
- [2026-09-30-h7-pedal-platform-design.md][plat] (the original platform spec): *Bring-up firmware (acfx repository)*, *Bring-up sequence*, *SDRAM*, *USB-C*, *Hardware revision identification*, *Recovery invariant*
- [h7-platform/CORE-BRIEF.md][cb]: §5, §5b, D10, D12, as amended by split spec §9.4
- [h7-platform/SDRAM-COMPATIBILITY.md][sd]: §4
- [h7-platform/interface-analysis/facts.md][facts]: §3 to §8 (§7, the Daisy bootloader's limits, in full)
- [h7-platform/interface-analysis/crossings.md][cross]: §1, §2.3, §4, §7.3, §7.4, §8 (what the interface asks of firmware)
- [h7-platform/BYPASS-RELAY.md][br] §4; [h7-platform/POWER.md][pw], "Owner decision: MCU junction temperature", §2.1; [h7-platform/ANALOG.md][an] §9.3, §10, §12; [h7-platform/interface-analysis/3v3-d.md][d3] §6; [h7-platform/interface-analysis/vref-a.md][vref] §5
- [h7-platform/SCHEMATIC-CHECKLIST.md][checklist]: USB-03 and §9 bring-up identifiers, cited for traceability only
- [2026-10-05-h7-split-rulings.md][ledger] (the S1 rulings ledger): R-9, R-14, R-15, R-22, R-57, through [decisions.md](decisions.md)

**This repository does not own firmware.** Its mandate names five hardware output classes and no firmware, and where the platform's firmware lives is left open (the port spec, "What this leaves open"). This document records the hardware side of the firmware contract: what the hardware imposes on firmware, and what the hardware relies on firmware to do, restated against the split architecture. Each item is a constraint on the hardware or an assumption the hardware analyses make. Nothing here sets firmware up: there is no code, no linker script, no build configuration and no pin header here, and none is planned.

**Every figure in this document is paper analysis of a board that has not been built.** No firmware exists for the split boards, so every obligation below is open until bring-up shows firmware doing it; each is named in a row of [open-items.md](open-items.md).

Decisions are linked by anchor into [decisions.md](decisions.md); "owner" marks an owner decision, D14 to D24 are deltas the owner approved, and everything else there is a controller ruling, which the owner may override. The hardware these constraints describe is in [processor-and-memory.md](processor-and-memory.md) (the module), [architecture.md](architecture.md) §4 (the interface), [analog.md](analog.md), [power.md](power.md) and [bypass-relay.md](bypass-relay.md).

## 1. Two board configurations

The audio board takes either our module or a Daisy Seed on the same 40 pins ([O-1](decisions.md#o-1), owner; [O-16](decisions.md#o-16), owner, names the accepted Seeds). The same firmware source is built for each (split spec §11, §12.4 step 4):

| | Daisy Seed (development substitute) | Our module (production) |
| --- | --- | --- |
| MCU | STM32H750IB, 128 KB internal flash | STM32H743IIT6, 2 MB internal flash |
| HSE | 16 MHz | 25 MHz ([processor-and-memory.md](processor-and-memory.md) §3) |
| SDRAM | 64 MB, the Seed's own wiring (taken from libDaisy, MIT, as reference only) | 32 MB, W9825G6KH-6I, control pins on PH2/PH3/PH5 ([D23](decisions.md#d23)) |
| Where the application runs | From QSPI flash (or SRAM), loaded by the Daisy bootloader (§3) | From internal flash, above our bootloader (§3) |
| QSPI flash | The Seed's own, holding the application | One W25Q128JV, for data only ([processor-and-memory.md](processor-and-memory.md) §7) |
| Update path | The Seed's own micro-USB (Daisy DFU or ST ROM DFU) | Our bootloader over the pedal's USB-C on pins 36/37; ROM DFU on the module's own socket |

- **One pin map serves both**: the contract's Seed and module MCU ports are equal on every signal pin (split spec §5.3, §11; [architecture.md](architecture.md) §4.11 rule 8). The Seed's internal SDRAM and QSPI wiring is not on the header.
- **Which board is fitted** is read from the flash-size register at 0x1FF1E880 (RM0433 Rev 8 §61.2: "Bits 15:0 F_ID(15:0): Flash memory size ... expressed in Kbytes"). The values each device reads are **not stated** in RM0433 Rev 8, DS12110 Rev 10 or DS12556 Rev 7; by RM0433's encoding of the datasheet sizes they are 0x0800 on the STM32H743xI and 0x0080 on the STM32H750xB, which are derived values. Firmware reads the 16-bit value, **treats any value other than those two as an unknown module and refuses**, and first bring-up records the value read on a real Seed and a real module ([facts.md §5][facts]; split spec §6.5; open item FLASH-SIZE-REGISTER).
- **The module's own revision** is a resistor strap on a module ADC pin, decoded like HW_REV; firmware does not read it on a Seed (split spec §6.5). **Which Seed revision is fitted** is read from its version pins: libDaisy's `DaisySeed::CheckBoardVersion()` reads PD3, PD4, PD5 and PH6 with pull-ups, in that order, the first one low winning (PD3 Rev5, PD4 Seed2 DFM, PD5 Rev7, PH6 Seed3, none Rev4); DS120 p. 13 disagrees about Rev4 ([facts.md §8][facts]; the conflict entry in [open-items.md](open-items.md); open item SEED-REVISION-RECORD; [architecture.md](architecture.md) §8).
- **The two configurations are not identical silicon**, so a bug may show on one only; the parity check is open item SEED-MODULE-PARITY.

## 2. Memory: 32 MB of SDRAM on every board

**The SDRAM region firmware uses is 32 MB on both boards** ([O-4](decisions.md#o-4), owner: "Firmware must fit 32 MB of SDRAM (the Seed has 64 MB)"; split spec §11 "Memory"; [processor-and-memory.md](processor-and-memory.md) [EC-SDRAM-CLASS](processor-and-memory.md#ec-sdram-class)).

What the module's SDRAM hardware relies on firmware to do ([SDRAM-COMPATIBILITY.md §4][sd]; [processor-and-memory.md](processor-and-memory.md) §6, where each value's derivation is):
- **The SDRAM analysis assumes FMC SDRAM bank 1 configured for the fitted class**: the register values, their derivation and the per-class difference are in [processor-and-memory.md](processor-and-memory.md) §6.3 ([FIG-FMC-SDTR1](processor-and-memory.md#fig-fmc-sdtr1), [FIG-SDRAM-REFRESH](processor-and-memory.md#fig-sdram-refresh)). The two classes differ in their column count, so the configuration the analysis assumes follows the fitted part. *This document's reading:* split spec §3 calls 32 MB "the module baseline" and O-4 fixes the region at 32 MB on every board; no source says whether a 64 MB part may still be fitted, and if one were, the analysis's optional-class configuration would apply with a 32 MB region. The original spec's rule that a board built with one class and running firmware for the other "is a configuration error, and the bring-up SDRAM test catches it" still describes the FMC side.
- The analysis assumes the initialization sequence of [processor-and-memory.md](processor-and-memory.md) §6.3: a ≥ 200 µs wait with the clock running, 8 auto-refresh cycles, then the mode register (CAS latency 3, burst length 1).
- It assumes SDCLK at 92.5 MHz: the read slack (1.411 ns before trace delay) and the refresh count are computed at that clock. The 64 ms refresh holds for TA ≤ 85 °C only.
- With the SDRAM control pins on PH2/PH3/PH5, set those pins up for the FMC ([D23](decisions.md#d23)). Nothing about PC3SO applies on the split.

*Not in force:* "Firmware must never set PC3SO" (`CORE-BRIEF.md` D13), withdrawn with D13 when SDCKE0 moved to PH2 (split spec §6.2, §9.4).

On a Seed the SDRAM is 64 MB with the Seed's own wiring; firmware still uses 32 MB of it (O-4).

**Memory map and cache rules the original spec stated for the bring-up firmware** (original spec, *Bring-up firmware*, "Memory map and cache policy"), carried because one of them rests on a hardware fact: large effect buffers in an SDRAM linker section, cacheable write-back; **audio DMA buffers in D2 SRAM, which the DMA controller serving the SAI can reach (it cannot reach DTCM)**, marked non-cacheable by an MPU region; stack and hot DSP state in DTCM/AXI SRAM. The SAI on the split is SAI2 (§4).

## 3. The flash map, the bootloaders and their recovery limits

### 3.1 Our module: a bootloader in flash ahead of the application

The owner's [O-11](decisions.md#o-11): end-user firmware update uses a bootloader in flash, run over the pedal's USB-C on pins 36/37; the ST ROM DFU stays available on the module's own USB socket for bench recovery. Split spec §6.4 sets requirements BL-1 to BL-4 on the hardware and the firmware contract, and §11 how firmware takes them:

- **BL-1. Flash room.** The module's internal flash leaves room for the bootloader at the start of flash, ahead of the application. The flash map is recorded in the firmware contract (split spec §11); the application is linked and started at an offset above the bootloader; "the linker script, the application's vector table offset and the update tool all take the flash map from that one record". **The H743's flash sector size and the reserved size were never confirmed or set**: split spec §6.4 left both to the S2 plan, which never ran. Open item BOOTLOADER-FLASH-MAP.
- **BL-2. Enumeration from the bootloader.** USB on pins 36/37 must be enumerable from the bootloader, which brings up OTG_HS on PB14/PB15 with its own USB clock source, without depending on any pin outside the 40-pin contract and without needing the application to have run (§6).
- **BL-3. On a Seed** the Daisy bootloader remains the update path; parity applies to the application, not to the bootloader image (§3.2). The bootloader image is per board configuration; the application source is shared (split spec §11).
- **BL-4. Recovery survives any bootloader.** The ROM DFU and SWD paths stay available however the bootloader is written or damaged, so a bad bootloader cannot brick a module permanently. "The plan keeps the flash readout-protection option bytes at a level that leaves the ROM bootloader and SWD usable" (split spec §6.4). The original spec's recovery invariant states the firmware side: **firmware never sets readout protection level 2 or any option byte that disables debug or the system bootloader**; BOOT0 is a dedicated pin, and the ROM DFU and SWD stay reachable whatever the state of the application or the external flash. **The limit of that invariant**, in the original spec's words: "This is not a defence against deliberately malicious firmware. Such firmware could reprogram option bytes, and v1 has no hardware mechanism to stop it." Nothing in the split adds such a mechanism. Open item BOOTLOADER-FLASH-MAP carries the option-byte check.
- **Bootloader entry** ([RR-11](decisions.md#rr-11), ruling, Q-7): the bootloader samples FSW1 and FSW2 (pins 6 and 9) at power-up and stays in update mode if both are held; the running application offers a USB command that restarts into the bootloader. Entry needs no pin outside the contract. The footswitch inputs' 1.20 kΩ series resistors and 100 nF ([R-22](decisions.md#r-22)) are part of what the bootloader reads ([power.md](power.md) §5.4; 5 ms debounce, §9 below).
- **Recovery paths in order** (split spec §6.4): SWD on the module header is the guaranteed recovery path; ROM DFU on the module's own USB socket for bench recovery of a bricked unit; our bootloader for end-user updates.

### 3.2 A Daisy Seed: the Daisy bootloader's flash map

On a Seed the Daisy bootloader stays the update path and the Seed configuration keeps its own flash map (split spec §11). Split spec §16 listed "Daisy bootloader limits on code size and memory use (§11)" among the facts the plan verifies; `facts.md` §7 is that verification, and this section ports it, closing the item on a document in this repository.

#### DAISY-BOOTLOADER-LIMITS

Source: libDaisy `doc/md/_a7_Getting-Started-Daisy-Bootloader.md` (`LD-BOOT`) at libDaisy commit `08087203debc646d3710ec8caa35bac6cf20ab5e` (2026-09-29), github.com/electro-smith/libDaisy, as quoted in [facts.md §7][facts] (S1 Task 7, 2026-10-05). The quotations are `facts.md`'s transcription of that file; this repository did not re-read libDaisy.

- **The internal flash holds the bootloader, not the application.** "the built-in bootloader can only reprogram the chip's internal flash (128kB)"; "The bootloader will reside in the internal flash like any normal application"; "Since the bootloader lives there, any program that you intend to run with it can't use that region."
- **Valid program locations are QSPI and SRAM only**: "the Daisy bootloader will only accept QSPI and SRAM as valid locations for programs".
- **QSPI: programs are stored at 0x90040000, at most 7936 KB.** "Programs are stored on the QSPI flash chip ... The first four 64kB sectors are left untouched ... QSPI flash lies at address `0x90000000`, so programs are stored at `0x90040000`." The example `BOOT_QSPI` memory map gives a "QSPIFLASH: ... 7936 KB" region. The 7936 KB limit applies to programs run from QSPI only.
- **SRAM: programs of at most 480 kB.** "The bootloader needs a portion of the SRAM for its own processes. It uses 32kB located at the end of the region, so any programs run from SRAM cannot be greater than 480kB." The 480 kB limit applies to programs run from SRAM only. The example `BOOT_SRAM` map places RAM sections in "DTCMRAM ... 128 KB".
- "you can easily run significantly larger programs (up to 480kB on SRAM and almost 8MB on QSPI flash)."
- **Grace period**: "the bootloader has a grace period of 2.5 seconds on startup ... If no program is present, it will simply wait in the grace period until a DFU transaction occurs." During it the bootloader probes an SD card on SDMMC1 and a USB drive on pins 36/37; the header pins' exact states then are undocumented (split spec §16 item 11; open item SEED-BOOTLOADER-PIN-STATES; [architecture.md](architecture.md) §4.5).

`facts.md`'s note for the firmware contract: on a Seed the application runs from QSPI (≤ 7936 KB at 0x90040000) or SRAM (≤ 480 kB); the 128 KB internal flash holds the Daisy bootloader.

**Code size on both boards** (split spec §11): "Code size must fit the Seed's QSPI execution path as well as our module's 2 MB internal flash." *This document's reading, not a source's:* on our module the application's room is 2 MB less the bootloader's reserved region, a size BL-1 never set (open item BOOTLOADER-FLASH-MAP); on a Seed running from QSPI it is 7936 KB. So the module's term is the smaller one for any application that also fits the Seed's QSPI path, and it cannot be stated as a number until the reserved size is.

**The Seed's update path in the pedal** (split spec §6.4 BL-3 as amended by [R-14](decisions.md#r-14), ruling): the Daisy bootloader does not drive pin 11 (USB_EN_N), so the pedal's USB switch stays open while it runs, and DFU over the pedal's USB-C is not available with a Seed fitted. Firmware is updated through the Seed's own micro-USB (Daisy DFU or ST ROM DFU). The application uses the pedal's USB-C once it drives pin 11 low. This is an effective constraint in [architecture.md](architecture.md) §5 ("BL-3 on a Seed").

## 4. Audio: the codec is master, SAI2 is slave

#### EC-SAI2-SLAVE

**The PCM3060 is clock master (IFMD high: ADC master at 256 fS, DAC slave), running from its own 12.288 MHz oscillator; the MCU runs SAI2 block B as asynchronous slave receiver (SCK_B, FS_B, SD_B) and block A as synchronous slave transmitter on block B's clocks (SD_A); the frame rate comes from the oscillator.** Format: 24-bit left-justified, 48 kHz, BCK 64 fS = 3.072 MHz. Interface pins: 35 CODEC_BCK (PA2), 34 CODEC_LRCK (PG9), 32 CODEC_DOUT (PA0, into the MCU), 33 CODEC_DIN (PD11, from the MCU). MCLK is not on the interface.
- **Set by:** [O-2](decisions.md#o-2) (owner); [D20](decisions.md#d20) (owner-approved); split spec §5.5, §11 "Audio".
- **Amended by:** [R-9](decisions.md#r-9) (ruling) fixes the clock edges (below); split spec §9.4 revises the clock tree ([processor-and-memory.md](processor-and-memory.md) [EC-CLOCK-TREE](processor-and-memory.md#ec-clock-tree)).

*Not in force:* "ADC slave, DAC slave, 24-bit left-justified, MCU-supplied system clock" (original spec *Architecture decisions*, Codec), with SAI1 block A master transmitter and block B synchronous slave receiver on PE2–PE6 and MCLK on PE2 (`CORE-BRIEF.md` §5b, §6).

What firmware must do for the audio port to work as the hardware analyses assume:
- **CKSTR = 1 in both SAI2 blocks** ([R-9](decisions.md#r-9); [crossings.md §1, §8][cross]). RM0433 Rev 8 §51.6.2: "1: Signals generated by the SAI change on SCK falling edge, while signals received by the SAI are sampled on the SCK rising edge". With the PCM3060 in master mode sampling DIN on BCK's rising edge and changing DOUT on its falling edge (SLAS533B), every path then launches on one edge and is captured on the other; the SAI timing margins in [analog.md](analog.md) §14.2 rest on it.
- **Keep the SAI2 kernel clock selected and enabled as in master mode, and keep the APB clock feeding SAI2 above 2 × SCK** (above 6.144 MHz at SCK 3.072 MHz). RM0433 says the clock generator is off in slave mode but not whether the kernel clock may stop; this is `facts.md` §4's conservative reading. Open item SAI-KERNEL-CLOCK-SLAVE.
- **Output digital silence until FS is running and the codec has settled** (split spec §11 "Audio"; `BYPASS-RELAY.md` §4 holds unchanged).
- **The codec's reset is not firmware's.** It is a local reset on the pedal, released by its own supervisor ([D21](decisions.md#d21), owner-approved) and asserted by the power-fail supervisor ([RR-11](decisions.md#rr-11), Q-6 ruling; [analog.md](analog.md) [EC-CODEC-RESET](analog.md#ec-codec-reset)). `CODEC_RST` is not on the interface ([RR-11](decisions.md#rr-11), Q-6). The PCM3060's power-on behaviour on a still-starting oscillator is not stated in SLAS533B; the local reset holds RST low until the oscillator is running and VDD is in range ([facts.md §6][facts]; open item PCM3060-POR-XO-START). What firmware sees is only that FS may start later than the module and may stop on a power-fail trip; the slave lock from cold and after an MCU reset is a bring-up check (split spec §9.3, BU-20 reworked; open item SAI-KERNEL-CLOCK-SLAVE).

*Not in force:* the v1 firmware reset sequence, "Start the SAI1 clocks (MCLK, BCK, LRCK) with RST low. Hold RST low for at least tRST = 2048 / fS = 42.7 ms ... Raise RST" on CODEC_RST (PI4) (`POWER.md` §5.3; `CORE-BRIEF.md` D4, withdrawn).

## 5. Clocks and peripheral settings the hardware analyses assume

The clock tree, as `CORE-BRIEF.md` §5b set it and split spec §9.4 revised it, is in [processor-and-memory.md](processor-and-memory.md) §5. What firmware must hold to, because a hardware analysis rests on it:
- **480 MHz at VOS0**, which needs revision V silicon (open item MCU-SILICON-AND-BOOTLOADER-ID), with flash at 4 wait states and every bus inside DS12110 Table 112's VOS0 limits.
- **SDCLK 92.5 MHz** (PLL2R 185 MHz, kernel / 2), under the 100 MHz limit; the SDRAM analysis in §2 is computed at it.
- **QUADSPI at 60 MHz with an even prescaler (/4), and only the fast-read instructions (0Bh, 3Bh, 6Bh, BBh, EBh), never Read Data (03h)**, which the W25Q128JV limits to 50 MHz ([processor-and-memory.md](processor-and-memory.md) §7; `SCHEMATIC-CHECKLIST.md` BU-09).
- **ADC kernel 92.5 MHz, fADC 23.125 MHz at BOOST = 10**, or slower (`CORE-BRIEF.md` §5b; `POWER.md` §2.1 budgets the ADC at its worst row and notes "the firmware uses BOOST = 10").
- **USB on OTG_HS from HSI48, with CRS synchronised to USB1 SOF** (§6).
- **The 400 MHz VOS1 fallback.** The owner's [PW-TJ](decisions.md#pw-tj): if the internal temperature sensor reads ≥ 95 °C, firmware switches to 400 MHz at VOS1 (TJ limit 125 °C, DS12110 Table 113) and reports it over CDC; the 10 °C below the 105 °C VOS0 limit covers the sensor's ±3 °C linearity, its calibration uncertainty and the thermal lag. **The VOS1 configuration (PLL1, HCLK ≤ 200 MHz, flash wait states, the FMC, SAI and ADC kernel limits at VOS1) must be validated before the fallback can be used** (`POWER.md`, "Owner decision: MCU junction temperature", item 3; BU-21). Open items FIRMWARE-POWER-OBLIGATIONS and MCU-TJ-MEASURE.
- **Only the peripheral clocks it uses enabled**: the MCU current budget, and its 79 mA margin to DS12110 Table 110's 620 mA ΣIVDD, is computed on that basis ([power.md](power.md) §5.1, "Absolute maximum on the MCU supply pins"; `POWER.md` §2.1; BU-15 is v1's identifier for the same rule).
- **I²C1 in Fast-mode at ≤ 400 kHz** on PB8/PB9, polled (no interrupt pin): the pull-ups are sized for 400 kHz ([R-21](decisions.md#r-21); [3v3-d.md §6][d3]; split spec §11).

Open item FIRMWARE-PROCESSOR-OBLIGATIONS collects the module-side settings above that no other row names.

## 6. USB: update enumeration and the ROM DFU

#### EC-USB-OTG-HS

**The application's and our bootloader's USB device is the OTG_HS controller (USB1) using its internal full-speed PHY on PB14/PB15 (interface pins 36/37), clocked from HSI48 with CRS synchronised to that port's SOF; VBUS is sensed on PA1 (pin 31) as a GPIO level.** The same pins must enumerate from the bootloader (BL-2), so the bootloader's USB clock setup is its own and does not rely on application initialisation.
- **Set by:** split spec §6.4 BL-2, §11 "USB"; §9.4 (the clock-tree revision).
- **Amended by:** [R-14](decisions.md#r-14) (ruling) puts a USB isolation switch between pins 36/37 and the pedal's USB-C, enabled by firmware (below).

**Two v1 USB rules still bind, restated for OTG_HS on PB14/PB15 with VBUS on PA1.** No source withdraws them: split spec §9.3 reworks BU-08, -16, -20, -22, -25 and -28 and re-derives USB-03's divider for PA1, and §9.4 and §11 change only the controller and the sense pin.
- **The USB33 voltage detector enabled (PWR_CR3.USB33DEN) before the USB device is used** (`CORE-BRIEF.md` §5b USB row: "Enable the USB33 voltage detector (PWR_CR3.USB33DEN)"; BU-18). *This document's reading:* OTG_HS's internal full-speed PHY is supplied from VDD33USB as OTG_FS's was, so the rule carries over unchanged; no split source restates it.
- **The OTG VBUS comparators not used**: VBUS valid detection off (OTG_GCCFG.VBDEN = 0), B-session valid forced (OTG_GOTGCTL.BVALOEN = 1, BVALOVAL = 1), and connect and disconnect handled from the VBUS level read as a GPIO, now on PA1 (`SCHEMATIC-CHECKLIST.md` USB-03, BU-12; split spec §11: "VBUS sensed on PA1 as a GPIO level"). On the split VBUS reaches PA1 through a divider, not the controller's VBUS input, so the comparators have nothing to compare. *This document's reading:* the same register fields apply on the OTG_HS core; no split source names them.

Both are in open item FIRMWARE-PROCESSOR-OBLIGATIONS.

*Not in force:* the application's USB as a full-speed device on PA11/PA12 (OTG_FS, USB2), with VBUS sensed on PA9 through a 22.0 kΩ / 47.0 kΩ divider (original spec *USB-C*; `CORE-BRIEF.md` D10; `SCHEMATIC-CHECKLIST.md` USB-03), and the detector enabled "before using OTG_FS" (BU-18's wording). On the split, PA11/PA12 serve only the ROM DFU on the module's own socket, and PA9/PA10 are unallocated (split spec §6.2).

What the hardware relies on firmware to do for USB update enumeration:
- **Close the USB isolation switch, and only from the application and our bootloader.** The pedal (and the bring-up carrier) fit a TI TS3USB221RSER between pins 36/37 and the USB-C, enabled low on pin 11 (USB_EN_N, PB5) and held off by a 10.0 kΩ pull-up to 3V3_D. Firmware drives PB5 low to close it (VOL ≤ 0.4 V at 8 mA, DS12110 Table 61, against the switch's VIL; it sinks 3.513 V / 9.9 kΩ = 0.35 mA). It stays open through reset, through the ST ROM bootloader (which, per `facts.md` §3's transcription, does not touch PB5; open item FB-AN2606), through the Daisy bootloader on a Seed, and with the module unpowered ([R-14](decisions.md#r-14); [crossings.md §7.4][cross]).
- **Soft-disconnect D+ while pin 31 reads VBUS absent**, and leave PA1's internal pulls off ([crossings.md §4, §7.4, §8][cross]; §7 below). USB does not power the pedal: VBUS is on no power rail, so flashing and USB operation need the pedal's own supply (original spec *USB-C*).
- **The switch adds up to 6 Ω** to the MCU's full-speed driver, whose own impedance ST does not publish; USB 2.0 §7.1.1.1 requires 28–44 Ω including series elements. Bring-up checks full-speed enumeration and an error-free large CDC transfer with the switch closed (open item USB-SWITCH-FS-IMPEDANCE).
- **Enumeration from the bootloader on pins 36/37** is checked first on the bring-up carrier (which brings pins 36/37 out to a USB connection) and then in the pedal (split spec §12.4 steps 2 and 3; open item RECOVERY-PATH-CHECKS).
- *This document's reading of the CRS sync source, not a source's:* ST's HAL and RM0433 Table 98 give 10 for USB1 SOF, and RM0433's contradictory CRS_CFGR text also gives 10 for "OTG HS1 SOF (default)", so the split's choice is the value both readings agree on ([processor-and-memory.md](processor-and-memory.md) §5; open item MODULE-CLOCK-TREE-RESTATE).

**The ROM DFU on the module's own socket** (split spec §6.4; `CORE-BRIEF.md` §5, D10, D12; [processor-and-memory.md](processor-and-memory.md) §3, §8):
- It uses OTG_FS on PA11/PA12 in forced device mode with no VBUS sensing and no external pull-up, clocked from HSI48 with CRS (AN2606 Rev 70 Table 135), so it does not depend on the HSE and VBUS need not reach the MCU. **PA11/PA12 stay USB-only**; the pull-up on PA11 that AN2606 Table 136 offers as a workaround is not fitted, because it would corrupt D−.
- **Bootloader V9.0 (0x90)**, AN2606 Table 136: "Additional reset needed after power off/on to enable connection to the BL interfaces." On such a part DFU may not enumerate on the first boot after a power cycle; pressing Reset with BOOT0 held fixes it. Table 136 does not list this for V9.1 or V9.2. Bring-up reads the bootloader ID at 0x1FF1E7FE (BU-06; open item MCU-SILICON-AND-BOOTLOADER-ID).
- **PB15 and PB14 at ROM boot.** PB15 must not be held low at boot, or no bootloader interface connects; PB15 is now the pedal's USB D+, and a host's D+ pull-down could hold it low during a BOOT0 entry with a cable attached. The ROM bootloader drives PB14 (USB D−) push-pull high as USART1_TX, which a host reads as a low-speed attach and drives SE0 reset against, above PB14's 20 mA absolute maximum; the USB switch is the hardware fix ([R-14](decisions.md#r-14)). With bootloader V9.1, USART1 activity on one pin pair also drives the other TX pin (PB14 or PA9) (`CORE-BRIEF.md` D12). **Unplug the pedal's or the carrier's USB-C before entering ROM DFU**: the procedure stays as a second safeguard (split spec §6.4; open item RECOVERY-PATH-CHECKS).

## 7. Pin states that depend on power domain

Each interface pin belongs to one power domain on each side, and requirement IF-PD-1 bounds what may cross between domains that are not sequenced together ([architecture.md](architecture.md) §4.8; split spec §5.6.5): the module's 3V3 (`module_3v3`) and VREF_A (`adc_ref`) rise and fall together; the codec domain (`pedal_codec_3v3`) outlives the module at power-down and has no controlled order at power-up; the pedal digital rail (`pedal_digital`) is independent; the host's VBUS (`usb_vbus`) is present with the pedal unpowered. The hardware protects every crossing; these are the pin states it relies on firmware to keep ([crossings.md][cross]; split spec §11 "Domain rules", "Unchanged contracts"; open item FIRMWARE-INTERFACE-OBLIGATIONS):

| Pin(s) | State firmware keeps | Why (the hardware fact) |
| --- | --- | --- |
| 32, 33, 34, 35 (SAI2) | **No internal pull-up or pull-down, ever** | DS12110 Table 60 note 7: above Min(VDD, VDDA, VDD33USB) + 0.3 V the internal pulls must be disabled; the codec side can be up while the module is not |
| 32, 34, 35 (CODEC_DOUT, CODEC_LRCK, CODEC_BCK) | **Never driven** by firmware; inputs only | They are codec outputs through the pedal's isolation buffer. A 470 Ω resistor bounds a fight (3.6 V / (470 Ω × 0.99) = 7.74 mA), including the ST ROM bootloader driving PA2 as USART2_TX; PA0 tolerates no injection and PA2 none negative even when powered (DS12110 Table 59) |
| 31 (USB_VBUS_SENSE, PA1) | **Internal pulls off**; read as a GPIO level | The VBUS divider holds the pin at or under 3.498 V with the module unpowered; PA1 tolerates no injection either way (Table 59). The plug-in edge is open item VBUS-HOTPLUG |
| 36, 37 (USB D−, D+) | **D+ soft-disconnected while pin 31 reads VBUS absent** | The attach argument of `crossings.md` §7.1–§7.2 holds with the switch closed |
| 11 (USB_EN_N, PB5) | **Driven low only by the application and our bootloader** | The pull-up holds the switch open at reset, in either bootloader and unpowered (§6) |
| 8 (RELAY_EN, PG10) | **High only after the boot conditions of §8**; high-impedance at any reset | A gate pull-down drops the relays to bypass whenever the pin is not driven, and on a power-fail trip the supervisor pulls the gate low whatever the pin does ([bypass-relay.md](bypass-relay.md) §3, [EC-POWER-FAIL-OVERRIDE](bypass-relay.md#ec-power-fail-override)) |
| 4, 5 (LED2 PC9, LED1 PC8) | PWM to MOSFET gates with pull-downs | Not crossings. PC9 is an ST bootloader pin (I2C3_SDA, open drain, no pull): in ROM boot it can pull the gate low or release it, never drive it high ([facts.md §3][facts]) |
| 29, 30 (HW_REV PA5, EXPR_DETECT PA4) | **DAC1 stays disabled** | PA4 is DAC1_OUT1 and PA5 is DAC1_OUT2 (`SCHEMATIC-CHECKLIST.md` CORE-25, from ST's pin data); on the split both pins carry inputs from the pedal. Split spec §9.3: "CORE-25 (DAC1 disabled) still applies (PA4, PA5)". PA4 and PA5 also tolerate 0 mA injection either way (DS12110 Table 22) |
| Every unused pin | **Left in analog mode**; at boot the unused JTAG pins (PA15, PB3, PB4) moved to analog mode, PA13/PA14 left in SWD alternate function | `SCHEMATIC-CHECKLIST.md` CORE-27 and BU-24 (v1's wording; split spec §11 keeps "unused pins left in analog mode"): unused pins get no external resistor and stay in their reset state, analog mode, with the input Schmitt trigger and the weak pulls off. PB4 is interface pin 10 (SPARE5) on the split, which the contract lists as a GPIO input spare ([architecture.md](architecture.md) §4.3; it resets as NJTRST with a pull-up, §4.5). *This document's reading:* BU-24's "move PB4 to analog mode" was written when PB4 was unused; no source says whether firmware keeps SPARE5 in analog mode or as an input while no board uses it |

**While a bootloader runs**, other states apply that firmware does not control:
- **The ST ROM bootloader** (only with BOOT0 high or the option bytes so set) configures contract pins 2, 3, 4, 7, 13, 14, 23, 25, 26, 29, 30, 35, 36 and 37, and drives PC11 (pin 2), PA6 (pin 26), PA2 (pin 35) and PB14 (pin 36) as push-pull outputs; AN2606 does not state whether a slave SPI MISO drives while NSS is high, so the analyses treat these as possibly driven. PG10 (RELAY_EN) and PC8 (LED1) are not bootloader pins, and per `facts.md` §3's transcription neither is PB5 (open item FB-AN2606) ([facts.md §3][facts]; [architecture.md](architecture.md) §8).
- **The Daisy bootloader** on a Seed probes SDMMC1 (PC8–PC12, PD2) and pins 36/37 during its 2.5 s grace period; the exact states are undocumented (open item SEED-BOOTLOADER-PIN-STATES). RELAY_EN sits on PG10, which carries neither function.

## 8. Relay and watchdog sequencing

The bypass relays are wired so that the unpowered state is bypass, and any reset, crash or power loss returns there ([bypass-relay.md](bypass-relay.md) [EC-UNPOWERED-BYPASS](bypass-relay.md#ec-unpowered-bypass)). What the hardware relies on firmware to do is the effective constraint [EC-FIRMWARE-RELAY-CONTRACT](bypass-relay.md#ec-firmware-relay-contract) and [bypass-relay.md](bypass-relay.md) §6 (`BYPASS-RELAY.md` §4, which split spec §11 lists among the "Unchanged contracts: RELAY_EN sequencing and watchdog"). In brief:
- **Boot**: RELAY_EN stays low until the codec is clocked and settled (SAI2 frame sync running from the codec's oscillator, the codec out of its local reset) **and** at least 2.5 s (5τ of the VMID divider, 5 × 0.5 s) have passed since power-up. The power-fail supervisor's re-engage delay (td 154–395 ms, [power.md](power.md) §3.5) and 3V3_P's enable (latest about 0.64 s, [R-58](decisions.md#r-58)) sit inside that 2.5 s hold.
- **Engage and disengage**: the DAC ramped to zero over 10 ms, RELAY_EN changed, 10 ms for operate or release plus bounce, then the DAC ramped back in over 10 ms.
- **Watchdog**: **firmware must keep the independent watchdog enabled, so a hung program ends in a reset and therefore in bypass.**
- **After a power-fail trip** the module has rebooted (R-PF-5, "No re-engage without the ramp", realised by the module-branch load switch, [R-38](decisions.md#r-38)), so the boot sequence runs again from the start ([bypass-relay.md](bypass-relay.md) §6 item 8).
- Effect-off behaviour (relay true bypass or DSP bypass with trails) is a firmware setting with no hardware decision needed.

Open items FIRMWARE-ANALOG-OBLIGATIONS (which carries the relay sequence and the watchdog with the analog obligations, as `ANALOG.md` §12 hands them over) and RELAY-OVERRIDE-ON-TRIP (the hardware override that does not depend on firmware).

## 9. Controls, revision and the other analog and power obligations

The analog and power analyses hand firmware these constraints; each is open until bring-up shows firmware doing it.

**From the analog side** ([ANALOG.md §9.3, §10, §12][an]; [vref-a.md §5][vref]; [R-15](decisions.md#r-15); open item FIRMWARE-ANALOG-OBLIGATIONS):
- The six control positions and the expression input read at 10 bits ([R-15](decisions.md#r-15), a ruling); control smoothing that attenuates VREF_A's residue above the 0–421 Hz control band ([analog.md](analog.md) [EC-CONTROL-NOISE-BAND](analog.md#ec-control-noise-band)).
- Readings taken while VREF_A ramps, including the LM66100's turn-on, discarded.
- Each pot channel sampled at ≤ 10 kHz: the recharge error through the 12.5 kΩ source is 1.65 mV (2.0 LSB12) at 10 kHz ([ANALOG.md §10][an]).
- The expression input ignored while EXPR_DETECT reads high (no plug), and its minimum and maximum calibrated.
- The HW_REV decode thresholds at (k + 0.5) / 9 of full scale, 12-bit codes 228, 682, 1138, 1592, 2048, 2502, 2958, 3412, 3868; a reading below 0.0556 or above 0.9444 is a strap fault, and **firmware refuses audio and reports it** ([analog.md](analog.md) §11). A build that does not support the detected revision likewise refuses to start audio and reports why (original spec *Hardware revision identification*).
- Samples passed through unnegated, given the output stage's leg assignment ([analog.md](analog.md) §7.1).

**From the power side** ([POWER.md][pw]; [3v3-d.md §6][d3]; open item FIRMWARE-POWER-OBLIGATIONS): the VOS1 fallback and the peripheral-clock rule (§5); I²C1 at ≤ 400 kHz (§5); a **5 ms footswitch debounce window** (the switch node's release τ is 10.1 kΩ × 110 nF = 1.11 ms; [R-22](decisions.md#r-22)); the 2.5 s bypass hold (§8).

**From the original spec's bring-up firmware** (original spec, *Bring-up firmware*), the items the hardware is sized around: blocks of 48 frames at 48 kHz with a hard 1.0 ms deadline; controls read by ADC DMA, smoothed and dead-banded; footswitches polled at the block rate; LEDs driven by PWM; the bring-up firmware doubling as factory test with machine-readable CDC results. Which framework runs this is not this repository's to decide.

## 10. What did not cross

- The acfx bring-up firmware plan itself (the adapter's location, its toolchain and presets, TinyUSB, the CMake files), except where §2, §8 and §9 carry the hardware constraints it stated.
- The firmware pin header the pedals repository generated from the contract, and the v1 firmware header it replaced.
- `SCHEMATIC-CHECKLIST.md`'s BU firmware items as they stood for v1 (BU-09, BU-12, BU-18, BU-20 cite `CORE-BRIEF.md` §5b verbatim, including SAI1 and SYNCSRC = 11) are not carried in their v1 wording. Their split meaning: BU-09's clock items in §5 and processor-and-memory.md §5; BU-12's comparator rule and BU-18's USB33DEN rule in §6, restated for OTG_HS and PA1; BU-20's FMC values in processor-and-memory.md §6.3. The bring-up checklist carries the identifiers.

## 11. Open items this document raises or relies on

In [open-items.md](open-items.md): BOOTLOADER-FLASH-MAP, FIRMWARE-PROCESSOR-OBLIGATIONS (raised here); FIRMWARE-INTERFACE-OBLIGATIONS, FIRMWARE-POWER-OBLIGATIONS, FIRMWARE-ANALOG-OBLIGATIONS, SAI-KERNEL-CLOCK-SLAVE, FLASH-SIZE-REGISTER, PCM3060-POR-XO-START, MCU-TJ-MEASURE, MCU-SILICON-AND-BOOTLOADER-ID, MODULE-CLOCK-TREE-RESTATE, RECOVERY-PATH-CHECKS, USB-SWITCH-FS-IMPEDANCE, FB-AN2606, VBUS-HOTPLUG, SEED-BOOTLOADER-PIN-STATES, SEED-REVISION-RECORD, SEED-MODULE-PARITY, RELAY-OVERRIDE-ON-TRIP (reused or raised in [processor-and-memory.md](processor-and-memory.md)); and the conflict entry on the Rev4 Seed.

[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
[plat]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-09-30-h7-pedal-platform-design.md
[cb]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/CORE-BRIEF.md
[sd]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/SDRAM-COMPATIBILITY.md
[facts]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/facts.md
[cross]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/crossings.md
[br]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/BYPASS-RELAY.md
[pw]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/POWER.md
[an]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/ANALOG.md
[d3]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/3v3-d.md
[vref]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/vref-a.md
[checklist]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/SCHEMATIC-CHECKLIST.md
[ledger]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-05-h7-split-rulings.md
