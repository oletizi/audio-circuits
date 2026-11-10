# h7-platform architecture

Ported from:
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §1, §3, §4, §5 (§5.0 to §5.7), §6, §7, §8, §13, §13.1, §14, §16
- [2026-09-30-h7-pedal-platform-design.md][plat] (the original platform spec): *Purpose*, *Guiding principle*, *Specification*, *Architecture decisions*, *Controls and I/O*, *Programming and test access*, *Recovery invariant*, *Open items*
- [h7-platform/MODULE-INTERFACE.md][mi]: the 40-pin table, rendered from the draft contract
- [h7-platform/module-interface.json][contract]: `connector`, `seedExceptions` (the same file is in this repository, byte-identical, at [circuits/h7-platform/module-interface.json](../../circuits/h7-platform/module-interface.json))
- [h7-platform/interface-analysis/facts.md][facts]: the documents table, §1 to §3, §8
- [h7-platform/interface-analysis/crossings.md][crossings]: the interface rules part, §0, §2, §4 to §8 (the SAI timing of §1 and the codec-side resistors of §3 are carried in [analog.md](analog.md))
- [h7-platform/CORE-BRIEF.md][cb] §1 (the OSCAR sources and open item L1)
- [2026-10-05-h7-split-rulings.md][ledger] (the S1 rulings ledger): the entries linked below through [decisions.md](decisions.md)
- [h7-platform/BYPASS-RELAY.md][bypass] §3.3 (the v1 gate pull-down, cited as history) and [h7-platform/interface-analysis/3v3-d.md][3v3d] §2 (the footswitch series resistor)

This document describes how the STM32H743 digital pedal platform (h7-platform) is split into boards, what each board contains, the rules that govern the 40-pin interface between them, the minimal bring-up carrier, and what is known and not known about the Daisy Seed that stands in for the processor module during development. It records the design as it stood in the pedals repository at commit `5b926d0`. Nothing described here has been built, modelled or drawn in this repository: that is phases 2 to 4 of the [port spec](../superpowers/specs/2026-11-10-digital-pedal-platform-port-design.md).

**Every figure in this document is paper analysis of a board that has not been built.** Each figure states its inputs and method next to it, and links the pedals analysis it came from.

Decisions are linked by anchor into [decisions.md](decisions.md). An owner decision is labelled "owner"; everything else there is a controller ruling, which the owner may override. Open items are rows in [open-items.md](open-items.md), named here by their Id.

The detailed analyses live in the topic documents beside this one: [power.md](power.md) (VIN_MOD, 3V3_D, the pedal digital rail), [analog.md](analog.md) (VREF_A, the codec domain, SAI timing), [bypass-relay.md](bypass-relay.md) (the relays and the power-fail path), [processor-and-memory.md](processor-and-memory.md) and [firmware-facing-requirements.md](firmware-facing-requirements.md) (the module's core and what firmware depends on), and [mechanical-and-controls.md](mechanical-and-controls.md) (enclosure, stack height, control positions).

## 1. What the platform is

A reusable digital pedal platform: each pedal built on it differs only in its firmware and its enclosure art. Boards are made in small runs and assembled turnkey by PCBWay ([original spec][plat], *Purpose*).

The original specification, as it still binds the production pedal ([original spec][plat], *Specification*):
- stereo audio at 24 bits and 48 kHz;
- an STM32H7-class MCU;
- USB, including MIDI over USB;
- an expression input;
- a 9 V to 12 V DC input, and survival of an 18 V input continuously (the 18 V condition; split spec §3, §9.1).

The panel controls are now six configurable control positions (each a pot or a button per effect), two footswitches and two LEDs ([O-18](decisions.md#o-18), owner).

*Not in force:* "6 pots, 3 toggle switches, 2 footswitches, 2 LEDs" ([original spec][plat], *Specification*), replaced by [O-17](decisions.md#o-17) (three soft buttons in place of the toggles) and then [O-18](decisions.md#o-18) (six configurable positions; no separate buttons).

**Guiding principle** ([original spec][plat]). Each subsystem starts from a documented reference circuit that has shipped in one or more independent open designs, and production depends on no Electrosmith/Daisy module or supply chain. The datasheet outranks the reference design, and combining sub-circuits that each have precedent is new work, verified as new work.

## 2. The three boards

The split ([O-1](decisions.md#o-1), owner) turns the one monolithic board of the earlier design into a socketed processor module and an audio pedal board, joined by one 40-pin interface on the Daisy Seed header pinout. [O-13](decisions.md#o-13) (owner) adds a third, minimal board for the module's first power.

| Board | Name here | What it is | Its contents |
|---|---|---|---|
| Core processor module | **h7-module** | Implements the interface contract. In production our own STM32H743 module sits in the socket; during development a real Daisy Seed does ([O-16](decisions.md#o-16), owner) | §5 |
| Audio pedal board | **h7-pedal** | The codec, the analog stages, the bypass relays and their coil supply, the LED supply, the power entry and every panel control. Takes logic power and the ADC reference from the module and nothing else | §6 |
| Minimal bring-up carrier | **bring-up carrier** | A 40-pin breakout with a codec loopback and test points, so a new module gets a safe first power without risking an audio board | §7 |

Each audio board is a self-contained audio system with its own clock. The module is a processor that slaves to whatever audio clock the board provides, so the same module works with any future audio board that provides the bit clock, frame clock and data on the same pins (split spec §4).

### 2.1 What changed from the one-board design

The split spec §3 lists every area where the split boards differ from the platform spec. The left column below is what the monolithic v1 design contained: a record of v1, not an authority. v1 was generated by tooling the owner has rejected, and the split superseded it.

| Area | What v1 contained (record only) | After the split (in force) | Set by |
|---|---|---|---|
| Boards | One board | h7-module and h7-pedal, joined by a Seed-pinout 2 × 20 interface | [O-1](decisions.md#o-1) |
| Codec clocking | ADC and DAC slave, MCU-supplied MCLK on SAI1 | PCM3060 IFMD high: ADC master at 256 fS, DAC slave; a 12.288 MHz oscillator on the audio board; MCU SAI2, both blocks slave; no MCLK on the interface | [O-2](decisions.md#o-2), [D20](decisions.md#d20) |
| Codec digital supply | From the 3V3 buck | A local 3.3 V regulator fed from 5V_A on the audio board | [D22](decisions.md#d22) |
| Codec reset | Driven by an MCU pin | Local on the audio board: power-on reset AND the power-fail supervisor; not on the interface | [D21](decisions.md#d21), [RR-11](decisions.md#rr-11) |
| Audio peripheral | SAI1 on PE2–PE6 | SAI2 on PA0, PA2, PD11, PG9 | [O-2](decisions.md#o-2) |
| Pin map source | A pin map file | The contract for the 40 interface pins; a module-internal map for the module's own pins | [O-7](decisions.md#o-7) |
| SDRAM control pins | PC0, PC4, PC3_C | PH5 SDNWE, PH3 SDNE0, PH2 SDCKE0, freeing PC0 and PC4 for the header | [D23](decisions.md#d23) |
| USB | USB-C on PA11/PA12, ROM DFU on the same connector | Pedal USB-C on PB14/PB15 (the OTG_HS controller using its internal full-speed PHY); ROM DFU on the module's own socket on PA11/PA12 | [O-11](decisions.md#o-11), [RR-7](decisions.md#rr-7) |
| 3V3 regulator | Buck with EN from 5V_A and the power-fail shed | Inside the module, EN from its own VIN as an undervoltage lockout; external load limited to logic (pin 38) and the ADC reference (pin 21) | [D24](decisions.md#d24), [RR-3](decisions.md#rr-3) |
| Relay-coil and LED supply | 3V3_D | A pedal-board digital rail, 3V3_P | [RR-3](decisions.md#rr-3), [R-25](decisions.md#r-25) |
| ADC reference | VDDA/VREF+ on 3V3_D, one board | Pin 21, `VREF_A`, an ADC reference rail with its own contract | [RR-1](decisions.md#rr-1) |
| Domain crossings | One 3.3 V domain | Independently sequenced domains meet at the interface; sequencing is an interface requirement (IF-PD-1) | [RR-2](decisions.md#rr-2) |
| Power-loss bypass timing | Supervisor sheds the buck | An isolated, held-up analog branch, a module-branch load switch and a supervisor that drops the relays directly | [O-6](decisions.md#o-6) |
| Hardware revision strap | One strap for the one board | The strap identifies the audio board; the module identifies itself | split spec §6.5 |
| Recovery | ROM DFU over the pedal's USB-C, and SWD | SWD and ROM DFU on the module; end-user updates by our own bootloader in flash over the pedal's USB-C | [O-11](decisions.md#o-11) |
| 18 V survival | Whole board | Unchanged for the production pair. A Seed is not rated for it (S-1, §12) | split spec §3, §9.1 |
| SDRAM | Build-time choice of 32 MB or 64 MB | 32 MB is the module baseline; firmware fits 32 MB on every board, the Seed included | [O-4](decisions.md#o-4) |

## 3. Block diagram

Split spec §4, in this repository's words. The pedal digital rail is 3V3_P, fed from VIN_MOD after the module branch's reverse-polarity element ([R-25](decisions.md#r-25)); it never draws on the analog hold-up reservoir.

```text
                AUDIO PEDAL BOARD (h7-pedal)                                  MODULE (h7-module)
 DC jack - reverse polarity, protection -+- analog branch (isolated, held up) - 5V_A, VMID, op-amps
                                         |      +- 5V_A - codec VDD regulator - PCM3060 VDD, 12.288 MHz XO
                                         +- module branch - VIN_MOD ------------ pin 39 -> module 3V3 buck
                                         |      +- pedal digital rail 3V3_P - relay coils, LEDs, MIDI OUT loop
 footswitch, button and I2C pull-ups, MIDI IN, isolation buffers <- 3V3_D <------- pin 38 <- (logic only)
 pot tops, ring reference, HW_REV, expression follower <- VREF_A <---------------- pin 21 <- (VDDA = VREF+)
 PCM3060 (clock master) - BCK, LRCK, DOUT - isolation buffer ---------------------> SAI2 block B, slave receive
                        <- DIN ----------- isolation buffer ---------------------- SAI2 block A, sync slave transmit
 control positions, expression, HW_REV ------------------------------------------> ADC1 (analog or digital in)
 footswitches, EXPR_DETECT, VBUS sense ------------------------------------------> GPIO
 relay gate, LED gates, USB switch enable <--------------------------------------- GPIO, TIM3 PWM
 MIDI header <--------------------------------------------------------------------> USART1
 USB-C (ESD) - USB isolation switch <---------------------------------------------> OTG_HS, internal full-speed PHY
 I2C expansion bus, codec I2C links (not fitted) <--------------------------------> I2C1
```

## 4. The interface

### 4.1 What the interface is

**A project-owned electrical contract, mechanically compatible with the Daisy Seed 40-pin header** ([RR-4](decisions.md#rr-4), controller ruling). Same pitch, row spacing, pin numbering and pin-to-port assignment, so a Seed plugs into the same socket. Electrically the contract is ours: it states supply ranges, load limits, power domains and failsafe rules that no Electrosmith document states. Our module is the production implementation and guarantees the whole contract. A Seed is a **development substitute** compatible with the signal contract and the documented development load envelope, with the exceptions below. The module carries no Daisy name; the contract is named by function, "Seed-header-compatible 40-pin module contract" (split spec §5.0; risk R-12, open item MODULE-NAME-TRADEMARK).

The contract is held as data at [circuits/h7-platform/module-interface.json](../../circuits/h7-platform/module-interface.json) ([O-7](decisions.md#o-7), owner). Its `status` is `draft`: it was never frozen in the pedals repository (open item CONTRACT-FREEZE). Its `source` fields cite pedals paths; they are historical provenance, resolved through the README's provenance index, not paths that resolve here.

**Seed exceptions and limitations** (split spec §5.0, S-1 to S-10; the contract adds S-11 and S-12). Where the split spec said the Seed3 bench characterisation settles an item, read "the first-bring-up confirmation of R-2a to R-2c": [O-16](decisions.md#o-16) (owner) withdrew the bench characterisation.

| # | Exception or limitation | Consequence (in force) |
|---|---|---|
| S-1 | VIN rated 5–17 V (Rev7, `DS120`) or 4–17 V (Rev5, Seed3); no 18 V survival | Seed benches run from a 9 V supply (§12) |
| S-2 | No published current rating on pin 38 or pin 21 (U, §16 item 8) | The contract's load limits are guaranteed by our module only; the Seed is observed at first bring-up at the development envelope (R-2b; open item SEED-PIN38-PIN21-LOAD) |
| S-3 | Pins 16–19 are driven and loaded by the Seed's own codec (`SCH-R5` sheet 4) | Pins 16–19 are `reservedCompatibility`: never assigned |
| S-4 | AGND and DGND are not joined on the Seed (`SCH-R5` sheet 1) | The audio board joins pins 20 and 40 |
| S-5 | The Daisy bootloader drives the SDMMC1 pins and may run a USB host on pins 36/37 during its grace period (`LD-BOOT`); exact states U (§16 item 11) | RELAY_EN kept off those pins; the switch input on them carries series resistance (§4.5; R-2c; open item SEED-BOOTLOADER-PIN-STATES) |
| S-6 | Onboard loads on header pins of Rev7 and Seed3 are unpublished (U, §16 item 7) | A named risk with a design margin, confirmed at first bring-up before a Seed is plugged in (R-2a; open item SEED-ONBOARD-LOADS) |
| S-7 | Different silicon and clocks: STM32H750, 16 MHz HSE, 64 MB SDRAM, QSPI execution | A separate firmware board configuration; firmware fits 32 MB |
| S-8 | No module identification strap | Firmware identifies a Seed by its flash size (open item FLASH-SIZE-REGISTER) |
| S-9 | Inrush, ripple, back-feed and hot-plug behaviour on VIN, pin 38 and pin 21 are unpublished | The contract values are verified on our module; on a Seed they are bench observations only (open item SEED-VIN-SWITCH-ON) |
| S-10 | Pin 21 on the Seed is an LDO output shared with the Seed's own analog loads (Rev5: LP2985); its noise and capacitance limits are unpublished | Development readings on a Seed are not evidence for the VREF_A noise requirement (open items SEED-PIN21-NOISE, SEED-PIN21-CAPACITANCE) |
| S-11 | Revisions differ: VIN minimum 4 V (Rev5) or 5 V (Rev7); onboard codec WM8731 (Rev5) or PCM3060 (Rev7); revision pins PD3 (Rev5), PD5 (Rev7), PD4 (Seed2 DFM), PH6 (Seed3) | The bench supply rule applies to every revision; pins 16–19 are reserved, so the codec difference is invisible to the contract; the fitted revision is recorded at first bring-up (open item SEED-REVISION-RECORD) |
| S-12 | No Electrosmith document names the Seed MCU's package; Rev5 matches ST's STM32H750IBKx; Rev7 and Seed3 package U | Every contract function was checked on both STM32H750IB packages; ports and alternate-function numbers agree on both |

*Not in force:* S-1's consequence as the split spec and the contract record it, "Seed benches run on 9–12 V supplies only (O-15)", and S-11's "9–12 V development limit on every revision (O-15)", narrowed by [R-50](decisions.md#r-50) to 9 V (§12).

### 4.2 Physical: two 1 × 20 parts

- **Connector.** Two rows of 20 pins, 2.54 mm pitch, rows 15.24 mm apart, first-to-last pin 48.26 mm, 1.5 mm holes (`DS120` p. 11). The Seed itself is 51 × 18 mm.
- **Two parts, not one** ([O-8](decisions.md#o-8), owner, reopened 2026-10-05; [R-5](decisions.md#r-5)). The interface is two ordinary 1 × 20 2.54 mm parts, each its own BOM line: **J_MOD_A** carries contract pins 1–20 (its pads 1–20) and **J_MOD_B** carries contract pins 21–40 (its pads 1–20). Contract pin n is J_MOD_A pin n for n ≤ 20 and J_MOD_B pin n − 20 for n ≥ 21. On a board the two parts sit 15.24 mm apart, J_MOD_B rotated 180°, so its pin 1 (contract pin 21) is opposite J_MOD_A pin 20. Female on the pedal and the carrier, male on the module.
- **Numbering.** Pins 1–20 run down one row and 21–40 back up the other; pin 1 is opposite pin 40 and pin 20 opposite pin 21. In the top view (component side up, `DS120` p. 1), pins 1 and 40 are at the USB-connector end, pin 1 in the row carrying D0–D14 (§8 item 1). The landing pattern carries no pin numbers, so footprint placement takes its numbering from the top-view pinout. **A mirrored footprint would put VIN on a signal pin.**
- **Mounting.** Socketed, on the audio board's underside, module component face toward the back plate, reachable with the back plate off ([O-12](decisions.md#o-12), [O-17](decisions.md#o-17), owner; [RR-8](decisions.md#rr-8)). The socket and header pair and the stack height are in [mechanical-and-controls.md](mechanical-and-controls.md); the parts are controller choices, last set by [R-61](decisions.md#r-61).
- **Module envelope.** The contract records a maximum module outline and component heights on both faces relative to pin 1, and the stack height. The audio board reserves the envelope as a keep-out. Both are frozen with the contract before audio-board layout, which confirms them and may not change them ([RR-8](decisions.md#rr-8); open item STACK-HEIGHT-CONFIRM).
- **Hot-plug of the module is not supported.** The socket mates all pins at once with no defined order, so the module is inserted and removed with power off (split spec §5.6.1).

### 4.3 The 40 pins

Transcribed from [MODULE-INTERFACE.md][mi], which the pedals repository rendered from the draft contract. Direction is the module's view ("in" is into the module). Every signal pin is 3.3 V logic; analog inputs span 0 V to VREF_A, ratiometric to pin 21. Our module uses the same MCU port as the Seed on every signal pin, so one firmware pin header serves both. Domains are `module_3v3`, `adc_ref`, `pedal_codec_3v3`, `pedal_digital`, `usb_vbus` (§4.8), or `none` for a passive switch or a MOSFET gate. "Seed risk" names the bench-only facts of §8 that the pin depends on.

| Pin | Seed label | Signal | Category | Dir | Port | Function | Domain module / pedal | Protection (class, part role) | Seed risk | Part, pad |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | D0 | SPARE1 | signal | in | PB12 | GPIO | module_3v3 / none | — | R-2a | J_MOD_A 1 |
| 2 | D1 | SPARE2 | signal | in | PC11 | GPIO | module_3v3 / none | — | R-2a, R-2c | J_MOD_A 2 |
| 3 | D2 | SPARE3 | signal | in | PC10 | GPIO | module_3v3 / none | — | R-2a, R-2c | J_MOD_A 3 |
| 4 | D3 | LED2 | signal | out | PC9 | TIM3_CH4 | module_3v3 / none | — | R-2a, R-2c | J_MOD_A 4 |
| 5 | D4 | LED1 | signal | out | PC8 | TIM3_CH3 | module_3v3 / none | — | R-2a, R-2c | J_MOD_A 5 |
| 6 | D5 | FSW1 | signal | in | PD2 | GPIO | module_3v3 / module_3v3 | — | R-2a, R-2c | J_MOD_A 6 |
| 7 | D6 | SPARE4 | signal | in | PC12 | GPIO | module_3v3 / none | — | R-2a, R-2c | J_MOD_A 7 |
| 8 | D7 | RELAY_EN | signal | out | PG10 | GPIO | module_3v3 / none | — | R-2a, R-2c | J_MOD_A 8 |
| 9 | D8 | FSW2 | signal | in | PG11 | GPIO | module_3v3 / module_3v3 | — | R-2a | J_MOD_A 9 |
| 10 | D9 | SPARE5 | signal | in | PB4 | GPIO | module_3v3 / none | — | R-2a | J_MOD_A 10 |
| 11 | D10 | USB_EN_N | signal | out | PB5 | GPIO | module_3v3 / module_3v3 | — | R-2a | J_MOD_A 11 |
| 12 | D11 | EXP_I2C_SCL | signal | bidir, open drain | PB8 | I2C1_SCL | module_3v3 / module_3v3 | — | R-2a | J_MOD_A 12 |
| 13 | D12 | EXP_I2C_SDA | signal | bidir, open drain | PB9 | I2C1_SDA | module_3v3 / module_3v3 | — | R-2a | J_MOD_A 13 |
| 14 | D13 | MIDI_UART_TX | signal | out | PB6 | USART1_TX | module_3v3 / module_3v3 | — | R-2a | J_MOD_A 14 |
| 15 | D14 | MIDI_UART_RX | signal | in | PB7 | USART1_RX | module_3v3 / module_3v3 | — | R-2a | J_MOD_A 15 |
| 16 | Audio in L | — | reservedCompatibility | nc | — | — | none / none | — | — | J_MOD_A 16 |
| 17 | Audio in R | — | reservedCompatibility | nc | — | — | none / none | — | — | J_MOD_A 17 |
| 18 | Audio out L | — | reservedCompatibility | nc | — | — | none / none | — | — | J_MOD_A 18 |
| 19 | Audio out R | — | reservedCompatibility | nc | — | — | none / none | — | — | J_MOD_A 19 |
| 20 | AGND | GND | ground | ground | — | — | none / none | — | — | J_MOD_A 20 |
| 21 | 3V3 A | VREF_A | reference | reference out | — | — | adc_ref / adc_ref | — | R-2b | J_MOD_B 1 |
| 22 | A0 | POS1 | signal | in | PC0 | ADC1_INP10 | module_3v3 / adc_ref | — | R-2a | J_MOD_B 2 |
| 23 | A1 | POS2 | signal | in | PA3 | ADC1_INP15 | module_3v3 / adc_ref | — | R-2a | J_MOD_B 3 |
| 24 | A2 | POS3 | signal | in | PB1 | ADC1_INP5 | module_3v3 / adc_ref | — | R-2a | J_MOD_B 4 |
| 25 | A3 | POS4 | signal | in | PA7 | ADC1_INP7 | module_3v3 / adc_ref | — | R-2a | J_MOD_B 5 |
| 26 | A4 | POS5 | signal | in | PA6 | ADC1_INP3 | module_3v3 / adc_ref | — | R-2a | J_MOD_B 6 |
| 27 | A5 | POS6 | signal | in | PC1 | ADC1_INP11 | module_3v3 / adc_ref | — | R-2a | J_MOD_B 7 |
| 28 | A6 | EXPR_TIP | signal | in | PC4 | ADC1_INP4 | module_3v3 / adc_ref | — | R-2a | J_MOD_B 8 |
| 29 | A7 | HW_REV | signal | in | PA5 | ADC1_INP19 | module_3v3 / adc_ref | — | R-2a | J_MOD_B 9 |
| 30 | A8 | EXPR_DETECT | signal | in | PA4 | GPIO | module_3v3 / adc_ref | — | R-2a | J_MOD_B 10 |
| 31 | A9 | USB_VBUS_SENSE | signal | in | PA1 | GPIO | module_3v3 / usb_vbus | divider-within-limits (vbus-sense-divider) | R-2a | J_MOD_B 11 |
| 32 | D25 (A10) | CODEC_DOUT | signal | in | PA0 | SAI2_SD_B | module_3v3 / pedal_codec_3v3 | isolation-buffer-ioff (sai-isolation-to-module; companion sai-module-series) | R-2a | J_MOD_B 12 |
| 33 | D26 | CODEC_DIN | signal | out | PD11 | SAI2_SD_A | module_3v3 / pedal_codec_3v3 | isolation-buffer-ioff (sai-isolation-to-codec) | R-2a | J_MOD_B 13 |
| 34 | D27 | CODEC_LRCK | signal | in | PG9 | SAI2_FS_B | module_3v3 / pedal_codec_3v3 | isolation-buffer-ioff (sai-isolation-to-module; companion sai-module-series) | R-2a | J_MOD_B 14 |
| 35 | D28 (A11) | CODEC_BCK | signal | in | PA2 | SAI2_SCK_B | module_3v3 / pedal_codec_3v3 | isolation-buffer-ioff (sai-isolation-to-module; companion sai-module-series) | R-2a | J_MOD_B 15 |
| 36 | D29 | USB_DM | signal | bidir | PB14 | USB_OTG_HS_DM | module_3v3 / usb_vbus | isolation-buffer-ioff (usb-isolation-switch) | R-2a, R-2c | J_MOD_B 16 |
| 37 | D30 | USB_DP | signal | bidir | PB15 | USB_OTG_HS_DP | module_3v3 / usb_vbus | isolation-buffer-ioff (usb-isolation-switch) | R-2a, R-2c | J_MOD_B 17 |
| 38 | 3V3 D | 3V3_D | power | power out | — | — | module_3v3 / module_3v3 | — | R-2b | J_MOD_B 18 |
| 39 | VIN | VIN_MOD | power | power in | — | — | none / none | — | — | J_MOD_B 19 |
| 40 | DGND | GND | ground | ground | — | — | none / none | — | — | J_MOD_B 20 |

**Pin-assignment history** (each an effective constraint):
- Pins 22–27 carry the six control positions POS1–POS6, and pins 1, 2, 3, 7 and 10 are SPARE1–SPARE5: signal pins, GPIO inputs, no pedal-board load. **Set by:** [O-18](decisions.md#o-18) (owner), [R-8](decisions.md#r-8). **Amended by:** [R-14](decisions.md#r-14) (pin 11 becomes USB_EN_N).

*Not in force:* POT1–POT6 on pins 22–27 and TOGGLE1_A to TOGGLE3_B on pins 1, 2, 3, 7, 10 and 11 (the names the split spec's §5.3 first assigned, still shown there as "was" notes); SPARE6 on pin 11. `facts.md` §3 still uses the pre-O-18 names POT2, POT4, POT5, TOGGLE1_B, TOGGLE2_A and TOGGLE2_B for pins 23, 25, 26, 2, 3 and 7.

FSW1 is on PD2 (pin 6) and RELAY_EN on PG10 (pin 8), swapped in the split spec's own correction so the safety-relevant output never shares a pin with a boot-time peripheral (§4.5).

### 4.4 The pin budget

Counted from `DS120` Table 2 (split spec §5.2, independent recount):

- 40 pins − 5 power, reference and ground (pins 20, 21, 38, 39, 40) − 4 reserved for the Seed's codec (16–19) = **31 signal-capable pins**, D0–D30. Of these, 12 are ADC-capable (A0–A11) and 19 digital-only.
- The SAI2 audio port takes 4 (two of them, PA0 and PA2, ADC-capable) and the pedal USB 2, leaving **25**: 10 ADC-capable and 15 digital-only.
- **Demand now: 18 signals**, after [O-18](decisions.md#o-18) freed the six former toggle pins and [R-14](decisions.md#r-14) took one back for USB_EN_N: 8 analog (POS1–POS6, EXPR_TIP, HW_REV), 2 footswitches, 2 LEDs, RELAY_EN, EXPR_DETECT, MIDI TX and RX, VBUS sense, USB_EN_N. Plus the 2-pin I²C expansion bus. **Five spare pins remain**, all digital-only (PB12, PC11, PC10, PC12, PB4). Every ADC-capable pin is used.
- New low-bandwidth controls go on the I²C expansion bus, not on new interface pins ([RR-6](decisions.md#rr-6)). Expansion devices are polled, because no interrupt pin is assigned; a future board that needs an interrupt takes it from an expander or gives up a control pin (split spec §5.4). A new analog input goes through an I²C ADC on the bus. A high-bandwidth or interrupt-driven signal needs a different module footprint (the Seed2 DFM has two more ADC pins; split spec §14 R-1, research §2.2). What a spare becomes later is a contract change (split spec §5.2). The spares are not interchangeable: SPARE2, SPARE3 and SPARE4 (PC11, PC10, PC12) are SDMMC1 pins the Daisy bootloader may drive (§4.5), and SPARE5 (PB4) resets as NJTRST with a pull-up, harmless only on an input.
- Every function on every signal pin was checked against ST's pin data for the STM32H743IITx and for both STM32H750IB packages: the same alternate-function numbers on both dies (SAI2_SCK_B AF8; SAI2_FS_B, SD_A, SD_B AF10; USART1 AF7; I2C1 AF4; TIM3 AF2; OTG_HS DM/DP AF12; ADC1 inputs as analog). No pin fails on either MCU (split spec §5.2, §16 item 13).

### 4.5 Why the pins are where they are

Split spec §5.4, with the rulings that set the values since.

- **Analog inputs on A0–A7, contiguous.** All eight are ADC1 channels, read by one DMA scan, and grouped at one end of a header row.
- **EXPR_DETECT and VBUS sense on A8/A9**, the only signals that can take ADC-capable pins without taking a pin a digital-only signal needs.
- **No reset-time hazard on outputs.** RELAY_EN (PG10) and the LED gates (PC8, PC9) are plain GPIO, analog/high-impedance at reset, so the relays stay in bypass and the LEDs stay off through reset. PB4 resets as NJTRST with a pull-up, so it carries a spare input, never an output.
- **The Daisy bootloader and the SD pins.** On a Seed, the Daisy bootloader's grace period (2.5 s, longer if no program is present or BOOT is held) probes an SD card on SDMMC1 (PC8–PC12, PD2) and a USB drive on pins 36/37 (`LD-BOOT`). So **RELAY_EN sits on PG10**, which carries no SDMMC or USB function and is not an interface `LD-BOOT` names, and FSW1 moved to PD2. The footswitch inputs carry **1.20 kΩ** series resistors, so a bootloader-driven pin into a closed switch sees at most 3.6 V / (1.20 kΩ × 0.99) = 3.03 mA (method: the 3.6 V maximum drive level across the resistor at its 1 % low limit, the pin's own resistance ignored, a paper bound; [R-22](decisions.md#r-22); [3v3-d.md][3v3d] §2). LED flicker during the grace period is accepted as cosmetic. The exact pin states stay U until measured (open item SEED-BOOTLOADER-PIN-STATES).
- **LED PWM on TIM3_CH3/CH4 (PC8/PC9)**, not PB4/PB5, for the NJTRST reason.
- **PB8/PB9 are the I²C expansion bus (I2C1)** ([RR-6](decisions.md#rr-6)). Its pull-ups sit on the audio board, to 3V3_D, so the bus lives in the module's domain. Every device on it is powered from 3V3_D, or its connection is a declared cross-domain crossing with failsafe protection. Devices are polled: no interrupt pin is assigned. Any LED or other load current behind an expander comes from the pedal digital rail through a MOSFET, never from pin 38. Bus speed, budget and pull-ups are [R-21](decisions.md#r-21). The codec's I²C pins reach the bus only through not-fitted links on this audio board ([D2](decisions.md#d2)).
- **USART1 on PB6/PB7** for MIDI.
- **CODEC_RST is off the interface.** With the codec as clock master its system clock comes from the audio board's oscillator, so a local reset meets the PCM3060's sequence (clocks present, RST held ≥ 2048/fS, then released). The reset is driven by the power-on reset AND the power-fail supervisor ([RR-11](decisions.md#rr-11), Q-6; [D21](decisions.md#d21), owner-approved). If the owner overrides it and wants MCU control of the codec reset, the expansion bus loses a pin.
- **USB_EN_N on pin 11 (PB5)** enables the pedal's USB isolation switch ([R-14](decisions.md#r-14)). PB5 has no Seed onboard function (`DS120` v1.2.0 Table 2) and is not configured by the ST ROM bootloader per AN2606 Rev 70 Table 135 as transcribed in `facts.md` §3; that second fact is a freeze blocker until the document is re-read (open item **FB-AN2606**). PB12 was rejected because the Seed's pinout labels it USB ID.

### 4.6 The audio port

[O-2](decisions.md#o-2) (owner) and [D20](decisions.md#d20) (owner-approved). The PCM3060 is clock master in hardware mode: IFMD (its pin 27) high, "Master (256 fS) mode for ADC, slave mode for DAC" (TI SLAS533B), BCK1/BCK2 tied and LRCK1/LRCK2 tied, so the DAC slaves to the ADC's clocks. A 12.288 MHz packaged oscillator on the audio board drives the system clock inputs ([R-29](decisions.md#r-29) chooses it). The MCU runs **SAI2** block B as asynchronous slave receiver (SCK_B, FS_B, SD_B) and block A as synchronous slave transmitter on block B's clocks (SD_A). Format: 24-bit left-justified, 48 kHz, BCK at 64 fS = 3.072 MHz. MCLK is not on the interface. Firmware sets CKSTR = 1 in both SAI2 blocks ([R-9](decisions.md#r-9)).

The interface has only two ground pins (20, 40), neither beside the clock pins; the audio board routes the four SAI nets over unbroken ground, keeps them clear of the USB pair on pins 36/37, and puts series resistors at the codec for signal integrity only (risks R-6 and R-15, open items SAI-ACROSS-HEADER and SAI-LAYOUT-RULES). The SAI timing analysis and the codec-side series values are in [analog.md](analog.md).

TDM: SAI supports it, so a future multichannel audio board can run TDM slots on the same four pins; at 256 fS bit clocks that board must re-check signal integrity across the header. No current requirement depends on it.

### 4.7 Power, reference and ground across the interface

The module supplies **logic power (pin 38) and the ADC reference (pin 21) only** ([RR-1](decisions.md#rr-1), [RR-3](decisions.md#rr-3)). Relay coils, LEDs and the MIDI OUT loop are powered from the pedal digital rail; the codec's 3.3 V supply and oscillator are on the pedal board. The limits below are interface allocations the split spec chose to cover the listed loads with the platform's 1.5× rule (declared loads × 1.5 must fit the limit); they are not component values. The values the S1 analyses set are in [power.md](power.md) and [analog.md](analog.md).

| Pin | Rail | Rule |
|---|---|---|
| 39 | **VIN_MOD**, module supply input | Driven only by the audio board's module branch, never by the module. The module never sources current out of pin 39, and the analog hold-up reservoir never feeds it. Our module survives the 18 V input condition on it; a Seed is rated 17 V. DC-jack hot-plug with the module fitted is supported; module hot-plug is not. Values: [power.md](power.md) |
| 38 | **3V3_D**, module 3.3 V logic supply out | **25 mA continuous**, all pedal-board loads together (so declared loads ≤ 16.7 mA). Permitted load roles only: footswitch and control-position button pull-ups, the I²C expansion pull-ups and devices, the MIDI IN receiver and the MIDI OUT driver's supply ([R-23](decisions.md#r-23)), the module-side supply of the SAI isolation buffer, and the USB isolation switch with its enable pull-up ([R-14](decisions.md#r-14)). No relay coils, no LEDs, no analog loads, no regulator inputs. Back-feed prohibited: no pedal-board source, regulator output or diode connects to it. 0 V when the module is off |
| 21 | **VREF_A**, ADC reference rail (VDDA = VREF+ after the module's VDDA ferrite and bank) | **10 mA continuous, 15 mA for at most 1 ms.** Permitted loads only: the pot tops of positions fitted with pots, the expression ring reference (with the plug-detect divider behind it), the HW_REV divider, and the supply of the expression follower ([D19](decisions.md#d19)). No switching, pulsed or digital load. Filtering is on the module; the audio board adds no series element. Back-powering prohibited. It rises and falls with the module's 3V3; no pedal function that must work with the module off may use it. Values: [analog.md](analog.md) |
| 20, 40 | **GND** | Both joined to the audio board's single GND ([D18](decisions.md#d18)). The Seed does not join them; its datasheet requires the carrier to |

A button-fitted control position pulls up to 3V3_D, never to VREF_A, and a button can never short VREF_A: with a pot and a button both fitted (which the overlapping footprints prevent) a press draws at most 3.513 V / 1.00 kΩ = 3.5 mA through the always-fitted 1.00 kΩ resistor (inputs: the 3V3_D maximum 3.513 V, the 1.00 kΩ series resistor; paper bound, split spec §5.1.2). The control-position scheme is in [mechanical-and-controls.md](mechanical-and-controls.md).

### 4.8 Power domains and IF-PD-1

Each interface pin belongs to one power domain on each side, and the contract records them (`powerDomain`, [RR-9](decisions.md#rr-9)).

| Domain | Supply | Sequenced with |
|---|---|---|
| `module_3v3` | The module's 3V3: every module I/O and pin 38 | — |
| `adc_ref` | VREF_A (pin 21), derived from the module's 3V3 | `module_3v3` (rises and falls with it) |
| `pedal_codec_3v3` | Codec VDD and the oscillator, from the local regulator on 5V_A, on the held-up analog branch | Independent. Outlives `module_3v3` at power-down; at power-up the order is not controlled |
| `pedal_digital` | The pedal digital rail 3V3_P: relay coils, LEDs, the MIDI OUT loop, any pedal-side logic | Independent |
| `usb_vbus` | The host's VBUS on the pedal's USB-C | Independent; present with the pedal unpowered |

**Requirement IF-PD-1** ([RR-2](decisions.md#rr-2), controller ruling). *Neither board may source current through an interface signal into an unpowered I/O domain beyond the manufacturer's power-off injection limits, in any order of power-up or power-down, with a Seed or our module fitted.* It is part of the contract. A pin is a **crossing** when an output in one domain drives an input in a domain that is not sequenced with it; a crossing must declare `failsafeRequired` and name a protection class and the part role that implements it. A pin whose pedal side is `none` (a passive switch or a MOSFET gate with a pull-down) is not a crossing.

**Limits it is held to** (split spec §5.6.5; `facts.md` §2 confirms the same figures on the H750 in DS12556 Rev 7):
- **Module side, DS12110 Rev 10, with every module supply at 0 V.** FT pins accept at most Min(VDD, VDDA, VDD33USB, VBAT) + 4.0 V = **4.0 V** (Table 21). Injected current on FT, TT, RST and B pins except PA4/PA5 is −5 / +0 mA, and 0 mA either way on PA4/PA5; positive injection "does not occur for input voltages lower than the specified maximum value" (Table 22 note 3). Input leakage on FT pins ≤ 1,500 nA (FT_u ≤ 5,000 nA) with VIN below Max(VDDXXX) + 3.6 V, which is **3.6 V unpowered** (Table 60 note 6). Pull-ups and pull-downs must be disabled above Min(VDD, VDDA, VDD33USB) + 0.3 V (note 7). While powered, PA0 and PA1 tolerate no injection either way and PA2 none negative (Table 59; `facts.md` §2 adds PA1, PA4, PA5, PA6 and PA7 to the split spec's PA0 and PA2).
- **Codec side, SLAS533B.** DIN, RST and the system clock inputs are 5 V-tolerant Schmitt inputs (−0.3 to 6.5 V). BCK, LRCK and DOUT are limited to VDD + 0.3 V, which is 0.3 V with the codec unpowered. ±10 mA on any non-supply pin. No unpowered leakage or injection figure.
- **SLAS533B does not guarantee static or high-impedance outputs in reset**: RST low for ≥ 2048/fS puts the device in power-down, DOUT is forced to a zero *code* after a 1936/fS fade-out, and nothing states that master-mode BCK and LRCK stop. Asserting codec RST on a power-fail trip is kept because it also mutes the codec, but it is **not** the protection.

**The crossings and their protection** (paper analysis, [crossings.md][crossings] §2, §4, §7; rulings [R-10](decisions.md#r-10), [R-14](decisions.md#r-14)). Series resistance alone is not acceptable as the primary measure: absolute maximum ratings are stress limits, not operating guarantees.

| Pins | Crossing | Protection class | Realisation | Why it meets IF-PD-1 (paper analysis of an unbuilt board) |
|---|---|---|---|---|
| 32, 34, 35 (DOUT, LRCK, BCK) | `pedal_codec_3v3` into `module_3v3` | `isolation-buffer-ioff` | A triple buffer powered from the receiving side (3V3_D), TI SN74LVC3G34DCTR, beside the codec; 47 kΩ bias to GND on each input; 470 Ω 1 % between each output and its interface pin (companion role `sai-module-series`, never the protection on its own) | Ioff ±10 µA with its supply off (SCES366L §6.5). With the codec domain off and the module up, each input sits at ≤ 5 µA × 47.47 kΩ = 0.24 V (inputs: II ±5 µA, 47 kΩ at +1 %), under VIL 0.8 V, so the module sees a static low. The 470 Ω bounds a fight with the ST ROM bootloader, which drives PA2 push-pull as USART2_TX: 3.6 V / (470 Ω × 0.99) = 7.74 mA (both drivers taken as ideal), inside the MCU's 8 mA operating figure and 20 mA absolute maximum ([R-10](decisions.md#r-10)) |
| 33 (DIN) | `module_3v3` into `pedal_codec_3v3` | `isolation-buffer-ioff` | A single buffer powered from the codec rail, TI SN74LVC1G34DBVR; 47 kΩ bias on its input | Ioff ±10 µA (SCES519O §5.5): a running module never drives an unpowered codec. Module off and codec up: the input sits at ≤ 2 µA × 47.47 kΩ = 0.09 V, a static low on DIN |
| 31 (USB_VBUS_SENSE) | `usb_vbus` into `module_3v3`, present with the module unpowered | `divider-within-limits` | 12.0 kΩ over 20.0 kΩ, 1 % | Highest pin voltage 3.498 V (VBUS 5.50 V taken 1 % high, top resistor −1 %, bottom +1 %), under the 3.6 V unpowered limit; lowest 2.698 V at VBUS 4.35 V, over VIH 2.52 V; draw 0.18 mA. Steady state only: the plug-in edge is open item VBUS-HOTPLUG (carried in [analog.md](analog.md)) |
| 36, 37 (USB D−, D+) | `usb_vbus` side and the host, into `module_3v3` | `isolation-buffer-ioff` | USB isolation switch TI TS3USB221RSER between the interface pins and the ESD part and receptacle, VCC from 3V3_D, active-low enable on pin 11 held off by 10.0 kΩ to 3V3_D | Open at reset, through the ST ROM bootloader and with the module unpowered; IOFF ±2 µA for 0–3.6 V with it unpowered (SCDS220M §5.5). It exists because the ST ROM bootloader drives PB14 push-pull high, which a host reads as a low-speed attach and then drives SE0 reset against, through PB14, above the 20 mA absolute maximum ([R-14](decisions.md#r-14); [crossings.md][crossings] §7.3). Not crossings in the other direction while closed: a host drives the lines only after a device pull-up has held one above VIH (USB 2.0 §7.1.7.3) |

Not crossings: RELAY_EN and LED1/LED2 drive MOSFET gates with pull-downs to GND; MIDI_UART_TX and the I²C bus stay in `module_3v3` (the MIDI OUT loop's crossing into `pedal_digital` is at the open-drain driver's output, on the pedal side, [R-23](decisions.md#r-23)); the pots, expression input and HW_REV are in `adc_ref`, sequenced with the module, and their external back-feed is the VREF_A back-feed rule (risk R-14, open item VREF-A-BACKFEED-GATE). If pedal-side logic on the pedal digital rail ever takes a module output (for example a latch), that pin becomes a crossing with declared protection.

**The power-fail sequence the analysis must show** (split spec §5.6.5): input lost → supervisor trips → relay gate pulled low and codec RST asserted → relays open while the reservoir holds the analog rail → module 3V3 collapses while the codec domain is still up → the isolation buffers keep every SAI crossing inside IF-PD-1 until the codec domain has collapsed too. The same analysis covers power-up in either order. The realisation is in [bypass-relay.md](bypass-relay.md) and [power.md](power.md); the measurement is open item IF-PD-1-MEASURE.

### 4.9 Output gates and the onboard-pull margin

**Gate pull-downs** ([R-13](decisions.md#r-13), amended by [R-57](decisions.md#r-57)). Each output gate must tolerate any unknown onboard pull-up to pin 38 of 100 kΩ or more, the gate held at or under 0.5 V at the 3V3_D maximum. As restated under R-57 ([crossings.md][crossings] §6.1), the smallest tolerated pull-up is R_pd × 1.01 × (3.513 / 0.5 − 1) − R_series × 0.99, which must be ≤ 100 kΩ. The relay gate's pull-down is **15.0 kΩ** and the LED gates' **10.0 kΩ**, 1 %, giving **87.4 kΩ** for the relay gate (with the 3.9 kΩ series resistor) and **60.8 kΩ** for the LED gates (with CTL-05's 100 Ω). A **3.9 kΩ** 1 % resistor sits between RELAY_EN and the relay gate, so the supervisor's override (an N-MOSFET on the gate since [R-37](decisions.md#r-37)) sinks at most 3.6 V / 3.861 kΩ = 0.93 mA from the MCU pin, and the gate still reaches 3.274 V × 14.85 / (14.85 + 3.939 + 0.05) = 2.58 V at the 3V3_D minimum, above the 2.5 V at which the AO3400A's on-resistance is specified (inputs: the resistor values at their 1 % limits, the MCU's output resistance read from VOH at 8 mA; [crossings.md][crossings] §6).

*Not in force:* the 100 kΩ gate pull-downs of the v1 design ([BYPASS-RELAY.md][bypass] §3.3 and CTL-05), replaced on the split pedal by [R-13](decisions.md#r-13).

**The onboard-pull tolerance per pin** (risk R-2a; [R-11](decisions.md#r-11), [R-13](decisions.md#r-13); [crossings.md][crossings] §5). For each signal pin, the analysis states the smallest unknown onboard pull to pin 38 or pin 40 that the audio-board circuit on that pin tolerates without a wrong state, and records it in the contract (`seedOnboardPullTolerance`). The binding pin is no longer RELAY_EN or the LED gates, as the split spec's §14 expected, but the control positions' pot fit: **498.4 kΩ**, the largest tolerance and so the first bring-up threshold (method: 10.0 kΩ wiper resistor plus the B10K pot's Thevenin resistance at ±30 %, error at most 2 % of full scale at the worst wiper position). The expected open-circuit reading on a Seed, above 1 MΩ, clears it (open item SEED-ONBOARD-LOADS).

### 4.10 The contract as data

The contract file ([O-7](decisions.md#o-7), owner) holds, at top level: the two connector parts and their geometry and numbering; the module envelope and stack height; the MCU on each side (Seed STM32H750IB, module STM32H743IIT6) with the ST pin-data files used to check them; the five power domains; the rail contracts of VIN_MOD, 3V3_D and VREF_A; the Seed exceptions S-1 to S-12; reserved-pin overrides (none); a `status` (draft or frozen); and exactly 40 pins.

Per pin: number; category (`signal`, `power`, `reference`, `ground`, `reservedCompatibility`); a reason when reserved; the Seed label; the net name, unique and identical on both boards; direction (module view); voltage class; power domain on each side; source and sink current limits where relevant; whether each side can be powered while the other is off; whether failsafe protection is required and, if so, the protection class, the part role that implements it and any companion roles; the Seed and module MCU ports (required equal on every signal pin); the peripheral function; the required reset state; the Seed fact (V with a citation, or U with its risk ids); the onboard-pull tolerance; and notes.

The split spec also required the net name to be in upper-case snake form. That was a rule of the pedals schematic generator and is not carried: this repository does not care about the letter case of net names.

In the pedals repository, the module pin map, both boards' J_MOD_A/J_MOD_B pin tables and the firmware pin header were generated from the contract or checked against it. None of that tooling crossed. Whether a check in this repository validates the phase-2 models against the contract is open item CONTRACT-MODEL-CHECK.

### 4.11 The interface rules

The rules every board, model and drawing on this interface must keep. Each links where it was set.

1. **IF-PD-1.** No current through an interface signal into an unpowered I/O domain beyond the manufacturer's power-off limits, in any power order, with a Seed or our module fitted ([RR-2](decisions.md#rr-2); §4.8).
2. **Every crossing declares its protection**, and the net passes through a part with that protection role. A companion series resistor never satisfies the rule on its own ([RR-9](decisions.md#rr-9), [R-10](decisions.md#r-10); [crossings.md][crossings] §2.3, §8).
3. **Pins 16–19 are `reservedCompatibility`**: no signal, no function, no port, unconnected on every audio board and on our module, because a fitted Seed drives and loads them. Changing that category needs a recorded owner decision ([RR-5](decisions.md#rr-5); split spec §5.7).
4. **VREF_A takes only its four permitted load roles**, no switching load, and nothing on the pedal sources current into it ([RR-1](decisions.md#rr-1); §4.7).
5. **3V3_D takes only declared logic loads within 25 mA**, and nothing on the pedal sources current into it ([RR-3](decisions.md#rr-3); §4.7).
6. **VIN_MOD is driven only by the pedal's module branch** and never back-fed from the module or the analog reservoir (§4.7).
7. **Both boards' J_MOD_A/J_MOD_B nets equal the contract's signal on every pin**, through the pin-n mapping of §4.2 ([O-8](decisions.md#o-8), [R-5](decisions.md#r-5)).
8. **The Seed and module MCU ports are equal on every signal pin**, so one firmware pin header serves both (split spec §5.3).
9. **The audio board joins pins 20 and 40** to its one GND.
10. **No safety-relevant output shares a pin with a boot-time peripheral** of either bootloader (RELAY_EN on PG10; the USB switch enable held off by a pull-up) (§4.5).
11. **New controls go on the I²C expansion bus**, polled, powered from 3V3_D or declared as a crossing ([RR-6](decisions.md#rr-6), [R-21](decisions.md#r-21)).
12. **The module is inserted and removed with power off.**
13. **What the interface asks of firmware**, recorded as constraints on the hardware (this repository does not own firmware; [firmware-facing-requirements.md](firmware-facing-requirements.md)): the SAI pins are never configured with internal pulls, and pins 32, 34 and 35 are never driven (codec outputs); CKSTR = 1 in both SAI2 blocks; PA1's pulls stay off, and D+ is soft-disconnected while pin 31 reads VBUS absent; USB_EN_N is driven low only by the application and our bootloader; DAC1 stays disabled (PA4, PA5); unused pins stay in analog mode (open item FIRMWARE-INTERFACE-OBLIGATIONS).

## 5. The module (h7-module)

From [O-4](decisions.md#o-4) (owner), with the parts that implement them (split spec §6.1). Detail is in [processor-and-memory.md](processor-and-memory.md).

| Block | Parts | Notes |
|---|---|---|
| MCU and its supply network (VDD, VCAP, VDD33USB, VBAT, VDDA/VREF+, PDR_ON) | STM32H743IIT6, LQFP-176 | Keeps the LQFP-176; the module matches the Seed pinout, not its size ([O-3](decisions.md#o-3), owner) |
| 32 MB SDRAM | W9825G6KH-6I | Three control pins move ([D23](decisions.md#d23)) |
| QSPI flash | W25Q128JV on bank 1 | |
| 25 MHz HSE | NX3225GA and load capacitors | |
| Reset supervisor | TLV803EA30 on NRST ([D14](decisions.md#d14)) | |
| BOOT0 and RESET buttons | | Need not be reachable in a finished pedal ([O-12](decisions.md#o-12)) |
| 3.3 V regulator | TI TPS62933F buck with its input filter and bulk | EN from VIN_MOD as an undervoltage lockout ([D24](decisions.md#d24)) |
| SWD | 2 × 5 1.27 mm header and pogo pads ([D9](decisions.md#d9)) | |
| USB socket on PA11/PA12 for ROM DFU, with ESD | HRO TYPE-C-31-E-17, a vertical USB-C receptacle facing the back plate, 5.1 kΩ Rd on CC1 and CC2 ([R-60](decisions.md#r-60)) | Added by [O-11](decisions.md#o-11) (owner); not part of the 40-pin interface |
| Module identification strap | A resistor strap on a free module ADC pin, the audio board's divider scheme | split spec §6.5 |
| Interface headers J_MOD_A, J_MOD_B | Two 1 × 20 male headers; parts per [R-61](decisions.md#r-61) | |

The module carries no codec, no analog audio and no panel parts.

- **Pin map changes** (split spec §6.2). SDRAM SDNWE PC0 → PH5, SDNE0 PC4 → PH3, SDCKE0 PC3_C → PH2 ([D23](decisions.md#d23); this retires [D13](decisions.md#d13) and its "never set PC3SO" firmware rule). The interface ports are the 31 signal ports of §4.3, none of which collides with the SDRAM, QSPI, HSE or SWD pins. The module's internal MCU pin assignments are not in the contract; phase 2 re-derives them (port spec, *What this leaves open*).
- **Power** (split spec §6.3). VIN_MOD feeds the buck through the buck's own input filter and bulk, which belong to the module so it works in any carrier. Every part on VIN_MOD is rated for the 18 V input condition with derating. Its outputs are 3V3_D to pin 38 and VREF_A to pin 21, within their contracts. Values: [power.md](power.md).
- **Recovery** (split spec §6.4; [O-11](decisions.md#o-11), owner). SWD on the module is the guaranteed recovery path. The ST ROM DFU runs on the module's own USB socket, for bench recovery of a bricked unit; the ROM bootloader uses OTG_FS on PA11/PA12 in forced device mode with no VBUS sensing, so VBUS need not reach the MCU. End-user updates use our own bootloader in flash over the pedal's USB-C on pins 36/37, under requirements BL-1 to BL-4 (flash room for the bootloader; enumeration from the bootloader on pins 36/37 with nothing outside the contract; on a Seed the Daisy bootloader stays the update path; ROM DFU and SWD survive any bootloader). End users enter the bootloader by holding both footswitches at power-up, or by a USB command from the running application ([RR-11](decisions.md#rr-11), Q-7). Unplug the pedal's or carrier's USB-C before entering ROM DFU: a host's D+ pull-down can hold PB15 low at a BOOT0 entry, and the USB switch is the hardware safeguard for PB14 ([R-14](decisions.md#r-14)). Firmware-facing detail: [firmware-facing-requirements.md](firmware-facing-requirements.md).
- **BL-3 on a Seed** (effective constraint). On a Seed, firmware is updated through the Seed's own micro-USB (Daisy DFU or ST ROM DFU); DFU through the Daisy bootloader over the pedal's USB-C is not available, because the Daisy bootloader does not drive pin 11 and the pedal's USB switch stays open while it runs. The application uses the pedal's USB-C once it drives pin 11 low. **Set by:** split spec §6.4 BL-3. **Amended by:** [R-14](decisions.md#r-14).
- **Identification** (split spec §6.5). The audio board's revision is HW_REV on pin 29. Firmware tells a Seed (STM32H750, 128 KB flash) from our module (STM32H743, 2 MB flash) by the flash-size register (open item FLASH-SIZE-REGISTER). The module's own revision is its strap, which firmware does not read on a Seed.

## 6. The audio pedal board (h7-pedal)

From [O-5](decisions.md#o-5) (owner) as amended by [O-17](decisions.md#o-17) and [O-18](decisions.md#o-18), with the parts that implement them (split spec §7.1).

| Block | Content | Detail |
|---|---|---|
| Power entry | DC jack, reverse-polarity protection and input filter, reworked into an isolated held-up analog branch, a module branch with a load switch, and the pedal digital rail | [power.md](power.md), [bypass-relay.md](bypass-relay.md); [O-6](decisions.md#o-6) |
| Analog supply | 5V_A LDO (TPS7A49), VMID references and buffers, on the analog branch | [power.md](power.md), [analog.md](analog.md) |
| Codec | PCM3060 with IFMD high, its 12.288 MHz oscillator, codec-side series resistors, local reset from power-on reset and the power-fail supervisor, local 3.3 V VDD regulator on 5V_A | §4.6; [D20](decisions.md#d20)–[D22](decisions.md#d22); [analog.md](analog.md) |
| SAI domain isolation | The two buffers, biases and 470 Ω resistors of §4.8 | [R-10](decisions.md#r-10) |
| Input and output stages, jack ESD | Unchanged circuits on the analog branch rail | [analog.md](analog.md) |
| Bypass relays and drive | Coils on the pedal digital rail; supervisor override of the relay gate; 15.0 kΩ gate pull-down | [bypass-relay.md](bypass-relay.md) |
| Pedal digital rail | 3V3_P, a TPS62933F fed from VIN_MOD: relay coils, LEDs, the MIDI OUT loop | [R-25](decisions.md#r-25); [power.md](power.md) |
| Controls | Six configurable control positions (pot or button per effect), two footswitches on hung boards, two LEDs, expression input; pot tops, ring reference, HW_REV and the expression follower on VREF_A; button and footswitch pull-ups on 3V3_D; LED anodes on the pedal digital rail | [O-17](decisions.md#o-17), [O-18](decisions.md#o-18); [mechanical-and-controls.md](mechanical-and-controls.md) |
| USB-C | ESD, VBUS sense to pin 31, shield, the USB isolation switch to pins 36/37 | §4.8; [R-14](decisions.md#r-14) |
| MIDI header (not fitted) | To pins 14/15; MIDI IN receiver and MIDI OUT driver supply on 3V3_D; the MIDI OUT loop on the pedal digital rail | [R-23](decisions.md#r-23) |
| I²C expansion bus pull-ups | On pins 12/13, to 3V3_D | [R-21](decisions.md#r-21) |
| Interface sockets J_MOD_A, J_MOD_B | Two 1 × 20 female sockets on the underside | §4.2; [R-61](decisions.md#r-61) |
| Test pads | The power and audio pads | |

**Codec changes from v1** (split spec §7.2; v1 is cited only as what changed): IFMD to the codec VDD; system clock from the oscillator, not the MCU; series resistors on BCK, LRCK and DOUT; local reset; the I²C links unchanged in form, now reaching the expansion bus; domain isolation on all four SAI nets.

*Not in force:* the codec's RST driven by an MCU pin ([D4](decisions.md#d4), withdrawn), and its VDD from the 3V3 buck ([D5](decisions.md#d5), revised).

**Why the power-fail path had to be replaced** (split spec §7.4). In v1 the power-fail supervisor stopped the buck, so the bulk capacitor fed only the analog load while the output relay opened. With the buck inside the module and no EN pin on the interface, the module's load can no longer be removed from the capacitor feeding the analog stages, so the analog branch is isolated and held up, the module branch is switched off by the supervisor, and the supervisor drops the relays directly. Requirements R-PF-1 to R-PF-11 and their realisation are in [bypass-relay.md](bypass-relay.md) and [power.md](power.md) (risk R-3, open item POWER-FAIL-REPLACEMENT-MEASURE).

## 7. The bring-up carrier

Split spec §13.1; [O-13](decisions.md#o-13) (owner). **A minimal board that takes the module in the same Seed-pinout female sockets as the audio board, and exists only to give the module a safe first power.** First power on a new module goes on the carrier, current-limited, so a module fault cannot damage an audio board; swapping a module into a working audio board stays possible afterwards (split spec §12.4).

- **Contents:** the two 1 × 20 sockets, J_MOD_A and J_MOD_B, with every pin broken out to a header or test point; a codec loopback on the SAI2 pins, so the module's SAI slave can be exercised against a working codec clock without the full audio board; test points on VIN_MOD, 3V3_D, VREF_A, GND and the SAI nets; dummy loads on 3V3_D and VREF_A at their contract limits (25 mA; 10 mA), fitted by jumper; a current-limited VIN entry (the supply, not the board, sets the limit, with a fuse or a current-limited bench input); pins 36/37 brought out to a USB connection for the bootloader enumeration check, through the same USB isolation switch and enable pull-up as the pedal ([R-14](decisions.md#r-14)).
- **Not in scope:** analog audio stages, relays, panel controls, MIDI, the module's own functions.
- **Form:** it reuses the h7-pedal codec circuit where it can, including the SAI domain isolation, and obeys the same contract rules (IF-PD-1, the rail contracts, the reserved pins). Whether the codec loopback is analog out to in or a digital path was left to the plan and never decided; it is phase 2's to decide (open item CARRIER-LOOPBACK-FORM).
- **Acceptance:** a module on the carrier powers up current-limited without a fault; the SAI slave locks to the loopback clocks; pins 36/37 enumerate from the bootloader.

Where the carrier reuses the h7-pedal codec circuit, it carries the OSCAR_AUDIO_01 licence question with it (§10).

## 8. What is known about the Daisy Seed

Split spec §16, with the S1 analyses' additions. `V` means a fact stated, with a citation, in an Electrosmith primary document or the research; `U` marks a Seed fact those documents do not settle.

**Sources** (Electrosmith primary documents, read 2026-10-05): `DS120`, Daisy Seed datasheet v1.2.0 (Rev7); `DS105`, v1.0.5 (Rev5); `SCH-R5`, the reduced Rev5 schematic printed in `DS105` pp. 12–15 (no Rev7 or Seed3 schematic is published); `DS-S3`, the Seed3 datasheet v2.1.0; `LD-H`, libDaisy's `daisy_seed.h`/`.cpp`; `LD-BOOT`, libDaisy's Daisy bootloader document. URLs are in the split spec §16. `facts.md` adds the libDaisy commit read (`08087203`) and that `DS120` v1.2.0 was vendored in full on 2026-10-06.

**Verified (V):**
1. Pin numbering: 1–20 down one row, 21–40 back up the other; 1 opposite 40, 20 opposite 21; pins 1/40 at the USB end in the top view.
2. Power and ground: AGND 20, +3V3A 21, +3V3D 38, VIN 39, DGND 40.
3. Pins 16–19: audio in L, in R, out L, out R, loaded by the Seed codec's coupling network.
4. D0–D14 on pins 1–15: PB12, PC11, PC10, PC9, PC8, PD2, PC12, PG10, PG11, PB4, PB5, PB8, PB9, PB6, PB7.
5. A0–A9 on pins 22–31: PC0, PA3, PB1, PA7, PA6, PC1, PC4, PA5, PA4, PA1; A10 PA0 (32), D26 PD11 (33), D27 PG9 (34), A11 PA2 (35).
6. PB14/PB15 are D29/D30 on pins 36/37.
9. Pin 21 (+3V3A) is the MCU's VREF+ and VDDA rail; output only.
10. AGND and DGND are not joined on the Seed (only a not-fitted 0 Ω link); the carrier must join them.
12. VIN range: 5–17 V on Rev7 (`DS120`), 4–17 V on Rev5 and Seed3. The 17 V maximum is why Seed benches are restricted (§12).
13. ST's pin data for both STM32H750IB packages carries every contract function on the same port with the same alternate-function number as the H743IITx.

**Remaining U**, each a named risk with a design margin, confirmed at the first bring-up of the audio board with a Seed fitted, in the order R-2a, R-2b, R-2c, before any other check on that board ([O-16](decisions.md#o-16), owner; split spec §13 step 1 as withdrawn):
- **Item 7, onboard loads on header pins, Rev7 and Seed3** (R-2a). Rev5 has none on D0–D30, and libDaisy puts every onboard function (user LED PC7, test point PG14, codec reset PB11, revision pins PD3/PD4/PD5/PH6) on non-header ports. Open item SEED-ONBOARD-LOADS.
- **Item 8, 3V3 D and 3V3 A output current** (R-2b). No Electrosmith rating. On Rev5, pin 38 is a TPS6217x-series buck and pin 21 an LP2985 150 mA LDO, both also feeding the Seed. A bench reading at the development envelope is an observation, not a rating. Open item SEED-PIN38-PIN21-LOAD.
- **Item 11, header pin states during the Daisy bootloader** (R-2c). `LD-BOOT` documents SD-card and USB-drive probing; drive, pulls and waveforms are undocumented. Open item SEED-BOOTLOADER-PIN-STATES.
- **The pin-21 regulator's stability range on Rev7 and Seed3** (split spec §5.6.3): Rev5 is an LP2985; Rev7 and Seed3 are U. Open item SEED-PIN21-CAPACITANCE.

**Seed revision identification** (`facts.md` §8). `DS120` p. 13: Rev4 (2020–2021, the original), Rev5 (2021–2023, WM8731 codec), Rev7 (2023 on, PCM3060 codec); each revision's "version pin" is shorted to GND, PD3 for Rev5 and PD5 for Rev7. libDaisy's `CheckBoardVersion()` reads PD3, PD4, PD5 and PH6 with pull-ups, in that order, the first low one winning: PD3 Rev5, PD4 Seed2 DFM, PD5 Rev7, PH6 Seed3 (TAC5242 codec, libDaisy only), none Rev4. The two sources disagree on Rev4 (see the conflict entry in [open-items.md](open-items.md)). The first step of first bring-up with a Seed records which board is fitted (open item SEED-REVISION-RECORD).

**MCU facts the contract depends on** (`facts.md` §1 to §3; documents: DS12110 Rev 10, the H743 revision the split spec fixes; DS12556 Rev 7, the H750; AN2606 Rev 70; RM0433 Rev 8. st.com could not be reached to check for later revisions: open item DATASHEET-REVISIONS-RECHECK):
- **Per-pin GPIO current.** The contract records **8 mA** source and sink on every signal pin it applies to: the current ST guarantees at a stated level on a CMOS port (VOL ≤ 0.4 V sinking 8 mA, VOH ≥ VDD − 0.4 V sourcing 8 mA, 2.7 V ≤ VDD ≤ 3.6 V; DS12110 Table 61). The 20 mA row (VOL ≤ 1.3 V) equals the absolute maximum and is not used. The sum limits (140 mA source or sink) are checked by the board analyses, not per pin. DS12556 states the same rows for the H750.
- **Pin types on the H750** (DS12556 Table 7) agree with the H743 on every pin the split spec names: PA0, PA2 FT_a; PA1 FT_ha; PB14, PB15 FT_u; PD11, PG9 FT_h; PB8, PB9 FT_fh. The power-off limits of §4.8 hold for the Seed.
- **The ST system-memory bootloader** (AN2606 Rev 70 §60, Table 135; it runs only with BOOT0 high or the option bytes so set) configures contract pins 2, 3, 4, 7, 13, 14, 23, 25, 26, 29, 30, 35, 36 and 37. It drives PC11 (pin 2), PA6 (pin 26), PA2 (pin 35) and PB14 (pin 36) as push-pull outputs, which the analyses treat as possibly driven while it runs. PC9 (LED2, pin 4) is I2C3_SDA, open-drain no pull: it can pull the LED gate low or release it, never drive it high. **PG10 (RELAY_EN) and PC8 (LED1) are not bootloader pins**, and per this transcription neither is PB5 (pin 11), the fact FB-AN2606 requires re-reading before the freeze.

## 9. Order of work, as this repository takes it

The split spec's §13 ([O-10](decisions.md#o-10), owner, refined by [RR-10](decisions.md#rr-10) and [O-16](decisions.md#o-16)): draft the structural contract, run the electrical analyses that populate it, freeze it, design the bring-up carrier against the frozen contract, split the schematic, then layout of the audio board and then the module, inside the frozen envelope. In the pedals repository the work stopped after the analyses: the contract was populated but never frozen, the schematic was never split, and no layout exists.

In this repository the same order maps onto the port spec's phases. Freezing the contract and modelling the three boards are phase 2; drawing them is phase 3; layout and the fabrication package are phase 4. The order in which the three boards go through those phases is phase 2's to decide. The preconditions survive: **the module envelope and stack height are frozen before audio-board layout** ([RR-8](decisions.md#rr-8)), and **first power on a new module is on the carrier** ([O-13](decisions.md#o-13)).

## 10. Licences of the derived circuitry

The module's MCU, SDRAM and flash circuitry derives from DADDesign OSCAR_PROC_01 (MIT). The PCM3060 codec circuitry on the h7-pedal derives from DADDesign OSCAR_AUDIO_01, whose `LICENSE` file is MIT while its README says the project is licensed under the Apache License 2.0. **The OSCAR_AUDIO_01 licence statement is unresolved upstream**: `CORE-BRIEF.md` records it as open item L1, an owner question to put to the author, and the split spec §9.1 lists "OSCAR licence item L1" as unchanged by the split. Until it is settled, the derived codec circuitry is distributed in compliance with both licences: [circuits/h7-platform/LICENSE-OSCAR](../../circuits/h7-platform/LICENSE-OSCAR) keeps the MIT notice and carries an Apache-2.0 attribution and statement of changes, and [circuits/h7-platform/LICENSE-APACHE-2.0](../../circuits/h7-platform/LICENSE-APACHE-2.0) carries the full text. The obligation follows the circuit into the phase-2 models and the phase-4 fabrication files (open item OSCAR-AUDIO-LICENCE-L1).

## 11. Risks

Split spec §14, with what has happened to each since. Every row not closed is an open item.

| Risk | What it is | Where it stands | Open item |
|---|---|---|---|
| R-1 | No free interface pins | **Premise superseded.** Written before [O-18](decisions.md#o-18) freed the six toggle pins; after [R-14](decisions.md#r-14) five digital-only spares remain (§4.4). What survives is a constraint, not an open item: every ADC-capable pin is used, so new analog inputs go through the I²C expansion bus, and a high-bandwidth or interrupt-driven signal needs a different module footprint (the Seed2 DFM has two more ADC pins, research §2.2), a decision for whichever later board needs one | — |
| R-2 | Remaining Seed unknowns; first bring-up step 0 records which Seed is fitted | Open | SEED-REVISION-RECORD |
| R-2a | Onboard loads on header pins, Rev7 and Seed3 | Open, U; tolerance per pin recorded (§4.9) | SEED-ONBOARD-LOADS |
| R-2b | Pin 38 and pin 21 current on a Seed | Open, U | SEED-PIN38-PIN21-LOAD |
| R-2c | Header pin states during the Daisy bootloader | Open, U | SEED-BOOTLOADER-PIN-STATES |
| R-3 | The power-fail replacement is new | Paper analysis only | POWER-FAIL-REPLACEMENT-MEASURE |
| R-4 | Analog headroom at the 9 V cold minimum | Paper analysis only | ANALOG-HEADROOM-9V |
| R-5 | Cross-domain injection between the codec's held-up 3.3 V and the module's 3V3 | Paper analysis only (§4.8) | IF-PD-1-MEASURE |
| R-6 | Signal integrity across the header: two ground pins, none beside the SAI clocks | Paper analysis only | SAI-ACROSS-HEADER, SAI-LAYOUT-RULES |
| R-7 | Recovery path: ROM DFU off the pedal's USB-C; PB15 at BOOT0; a faulty bootloader | Mitigated on paper ([R-14](decisions.md#r-14), [R-60](decisions.md#r-60), BL-1 to BL-4) | RECOVERY-PATH-CHECKS |
| R-8 | The Seed is not identical silicon | Open | SEED-MODULE-PARITY |
| R-9 | Seed supply: single source, sold out at the time of the research | Mitigated: development starts on an original Seed the owner holds ([F-4](decisions.md#f-4), the split spec's sentence; [O-16](decisions.md#o-16)); the [OWN-07](decisions.md#own-07) procurement watch, extended to the Seed3 stand-ins, is in force. Production does not depend on a Seed | SEED-SUPPLY |
| R-10 | Stacking height | Paper study done; not frozen | STACK-HEIGHT-CONFIRM |
| R-11 | Two designs can drift apart | No check exists in this repository | CONTRACT-MODEL-CHECK |
| R-12 | Trademark: the module must not carry the Daisy name; whether it is registered is U | Mitigated by naming by function | MODULE-NAME-TRADEMARK |
| R-13 | 12 V worst-case relay margin (−0.2 ms in v1, a record of v1 only) | Paper analysis only; merged with R-3 | POWER-FAIL-REPLACEMENT-MEASURE |
| R-14 | VREF_A back-feed from the expression jack into an unpowered module | Resolved on paper by blocking ([R-17](decisions.md#r-17), [R-19](decisions.md#r-19)); bring-up gate | VREF-A-BACKFEED-GATE |
| R-15 | SAI isolation delay and load | Paper analysis only; merged with R-6 | SAI-ACROSS-HEADER |
| R-16 | Plan-time contract values unset | Populated by the S1 analyses; the contract is still a draft | CONTRACT-FREEZE |

Risk R-14 here is the split spec's risk, not ruling [R-14](decisions.md#r-14).

## 12. Development bench supply with a Seed fitted

A development bench with a real Daisy Seed fitted runs from a **9 V** supply, until bring-up measures a Seed's VIN current and capacitance through the module-branch switch-on (open item SEED-VIN-SWITCH-ON). The reasons: a Seed's VIN maximum is 17 V, it has no 18 V survival, and its switch-on stress through the module load switch cannot be bounded from published data. Production uses our module, which survives the 18 V condition. The analysis behind it is in [power.md](power.md).
- **Set by:** [O-15](decisions.md#o-15) (a controller ruling despite its number).
- **Amended by:** [R-50](decisions.md#r-50) (narrowed to 9 V); [R-58](decisions.md#r-58); [R-59](decisions.md#r-59).

*Not in force:* "Development with a real Seed fitted is limited to 9–12 V supplies" ([O-15](decisions.md#o-15) as first written; split spec §3, §5.0 S-1, §12.4, §15 Q-3), and the split spec's §12.4 step 1 "on a 9–12 V supply only while a Seed is fitted", narrowed by R-50.

[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
[plat]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-09-30-h7-pedal-platform-design.md
[mi]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/MODULE-INTERFACE.md
[contract]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/module-interface.json
[facts]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/facts.md
[crossings]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/crossings.md
[cb]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/CORE-BRIEF.md
[ledger]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-05-h7-split-rulings.md
[bypass]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/BYPASS-RELAY.md
[3v3d]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/3v3-d.md
