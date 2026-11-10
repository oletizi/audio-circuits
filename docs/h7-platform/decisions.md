# h7-platform decisions

Ported from:
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §2, §2.1, §5.1.1, §5.1.2, §9.1, §9.2, §9.4, §15
- [2026-09-30-h7-pedal-platform-design.md][plat] (the original platform spec): *Architecture decisions*, *Power*, *Open items*
- [2026-10-05-h7-split-rulings.md][ledger] (the S1 rulings ledger): R-1 to R-62
- [h7-platform/OWNER-DEFAULTS.md][own]: OWN-01 to OWN-07, D14 to D19
- [h7-platform/CORE-BRIEF.md][cb] §4: D1 to D19 (the file stops at D19 at the pinned commit)
- [2026-10-03-h7-schgen-a2-rulings.md][a2] and [2026-10-03-h7-schgen-a1-rulings.md][a1]: owner-decision entries about the circuit only
- [h7-platform/ANALOG.md][analog] "Owner decisions (resolved)"; [h7-platform/POWER.md][power] "Owner decision: MCU junction temperature"; [h7-platform/BYPASS-RELAY.md][bypass] status and owner decision; [h7-platform/SCHEMATIC-CHECKLIST.md][checklist] OWN-03

This is the record of every live owner decision, owner-supplied fact and controller ruling about the STM32H743 digital pedal platform (h7-platform), as they stood in the pedals repository at commit `5b926d0`. Every link here points at that commit, so it keeps resolving after the pedals repository is archived. The topic documents beside this one (architecture, power, analog, bypass relay, processor and memory, mechanical and controls) carry the analyses and values in full; an entry here says what was decided, by whom, and what changed it since.

Every figure quoted here comes from a paper analysis of a board that has not been built.

## How to read this document

**Labels.** An entry is an **owner decision** only where the source says so. In the S1 ledger that is an entry titled "Owner decision" (R-34, R-43) or one quoting his answer under "Owner decision, quoted" (R-56). In the split spec it is O-1 to O-18, except O-15, which the split spec records as a controller ruling despite its number. In the older design notes it is a passage that says the owner decided or approved it. **Owner-supplied facts** are his measurements and statements of fact, carried apart from the rulings built on them. Everything else is a **controller ruling, which the owner may override**. An entry that says "confirmed" without naming who confirmed it is carried as a controller ruling, and the ambiguity is stated beside it.

**Precedence** (the port spec's "How amendments resolve"). Authority first, then date. An owner decision is superseded only by a later owner decision. A controller ruling never supersedes an owner decision: where one narrows an owner decision, it is carried as a narrowing the owner may override and linked from the decision. Among rulings and analyses, the later dated text supersedes what it names. Where the sources cannot settle a disagreement, it is a `### Conflict:` entry in [open-items.md](open-items.md), and this document picks neither side.

**Effective constraints.** Each entry states the value in force once, with **Set by** and **Amended by** links. A value that is no longer in force appears only on a line that begins *Not in force:*.

**Owner's words.** Text inside quotation marks after "Owner:" or "Answer:" is copied from the source at the pinned commit. Where an entry has no quotation, the source records the decision but not his words.

### Anchors

Every entry is a level-3 heading whose text is only its identifier, so the anchor is the identifier in lower case. Link an entry as `decisions.md#<anchor>`.

| Entry kind | Heading | Anchor | Example |
|---|---|---|---|
| Split-spec owner decision (and O-15) | `### O-n` | `#o-n` | `decisions.md#o-17` |
| S1 ledger entry | `### R-n` | `#r-n` | `decisions.md#r-58` |
| CORE-BRIEF delta | `### Dn` | `#dn` | `decisions.md#d20` |
| OWN item | `### OWN-0n` | `#own-0n` | `decisions.md#own-05` |
| Split-spec review-response ruling | `### RR-n` | `#rr-n` | `decisions.md#rr-8` |
| Older owner decisions on the platform (no number of their own in the source) | `### PS-18V`, `### PW-TJ`, `### AN-D1`, `### AN-D2` | `#ps-18v`, `#pw-tj`, `#an-d1`, `#an-d2` | `decisions.md#an-d1` |
| Owner-supplied fact (numbered by this document) | `### F-n` | `#f-n` | `decisions.md#f-5` |

`AN-D1` and `AN-D2` are `ANALOG.md`'s own owner-decision numbers D1 and D2. They are prefixed here because CORE-BRIEF's deltas D1 and D2 are different things. Q-6 and Q-7 are under [RR-11](#rr-11). The ledger's unnumbered "R-31 and R-32 amendment" is folded into [R-31](#r-31) and [R-32](#r-32).

## Owner decisions

### O-1

**A processor module on the Daisy Seed pinout and an audio pedal board.**
- **Date:** 2026-10-05.
- **Decides:** split the platform into a core processor module on the Daisy Seed 40-pin pinout (2 × 20, 2.54 mm, rows 15.24 mm apart) and an audio pedal board. Development uses a real Seed or Seed3; production uses our own H743 module, with no Electrosmith dependency.
- **Set by:** [split spec §2][split].
- **Amended by:** [O-16](#o-16) (owner) names the accepted development substitutes: the original Daisy Seed (Rev5 or Rev7, STM32H750IB, same pinout) or the Seed3, and development starts on an original Seed. [RR-4](#rr-4) (ruling) states what a Seed is: a development substitute compatible with the signal contract and the documented development load envelope, with listed exceptions.

### O-2

**The codec is on the audio board, as clock master; SAI2 crosses the interface.**
- **Date:** 2026-10-05.
- **Decides:** the codec is on the audio board, joined to the module over digital audio on SAI2: SCK PA2, FS PG9, SD-in PA0, SD-out PD11. The PCM3060 is clock master in hardware mode (IFMD high: "Master (256 fS) mode for ADC, slave mode for DAC", TI SLAS533B), BCK fixed at 64 fS, clocks tied, driven by a 12.288 MHz packaged oscillator on the audio board. The STM32 SAI is slave. MCLK is not on the interface. Codec I²C crosses the interface if pins allow. TDM capability is noted for future multichannel audio boards.
- **Set by:** [split spec §2][split]; implemented by [D20](#d20).
- **Amended by:** [RR-6](#rr-6) and [RR-11](#rr-11) (rulings) settle "if pins allow": the codec's I²C reaches the I²C expansion bus (PB8/PB9) through not-fitted links on this audio board. [R-29](#r-29) (ruling) chooses the oscillator. [R-9](#r-9) (ruling) fixes the SAI clock-edge setting firmware must use.

### O-3

**The module matches the Seed pinout only, not its size.**
- **Date:** 2026-10-05.
- **Decides:** the module keeps the LQFP-176 STM32H743IIT6. The audio board reserves the larger outline; a real Seed still plugs into the same 40 pins.
- **Set by:** [split spec §2][split].
- **Amended by:** none.

### O-4

**Module contents.**
- **Date:** 2026-10-05.
- **Decides:** MCU, 32 MB SDRAM, QSPI flash, 25 MHz crystal, reset supervisor, BOOT/RESET buttons, its own 3.3 V regulator, SWD header, and a USB socket on PA11/PA12 for ROM DFU. VIN comes in on the Seed's VIN pin; 3.3 V goes out on the Seed's 3V3 pins. Firmware must fit 32 MB of SDRAM (the Seed has 64 MB).
- **Set by:** [split spec §2][split].
- **Amended by:** [O-11](#o-11) (owner) added the USB socket. [RR-1](#rr-1) and [RR-3](#rr-3) (rulings) narrow "3.3 V out": pin 38 is a low-current logic supply and pin 21 is the ADC reference, and neither powers relay coils or LEDs. [R-60](#r-60) (ruling) makes the module's USB socket a vertical USB-C receptacle.

### O-5

**Audio board contents.**
- **Date:** 2026-10-05.
- **Decides:** DC jack and protection, 5V_A, VMID, codec and oscillator, input and output stages, bypass relays, the panel controls, footswitches, LEDs, expression, MIDI, and USB-C wired to the Seed's external USB pins.
- **Set by:** [split spec §2][split].
- **Amended by:** [O-17](#o-17) (owner): the three toggles become three momentary soft buttons. [O-18](#o-18) (owner): the pots and buttons become six configurable control positions. [RR-3](#rr-3) (ruling): relay-coil and LED power are on the pedal board, from the pedal digital rail, which [R-25](#r-25) makes 3V3_P.

*Not in force:* "pots, toggles" as separate panel controls (O-5 as first written), replaced by O-17 and then O-18.

### O-6

**A hold-up replacement for the bypass relays' power-off timing.**
- **Date:** 2026-10-05.
- **Decides:** the bypass-relay power-off timing used to shed the buck, which now sits inside the module with no EN pin on the Seed pinout. A replacement must hold the analog rail steady while the relays release. The recommended direction is a diode-isolated hold-up reservoir feeding the analog supply; final values are re-analysed in the plan.
- **Set by:** [split spec §2][split], §7.4.
- **Amended by:** realised by controller rulings [R-33](#r-33) to [R-45](#r-45) and [R-58](#r-58), within the owner's own [R-34](#r-34) (the R-PF-7 basis) and [R-43](#r-43) (the supply rating). The circuit is in the bypass-relay and power documents.

### O-7

**One contract, held as data, for the 40 pins.**
- **Date:** 2026-10-05.
- **Decides:** one contract, `module-interface.json`, lists all 40 pins. The audio board pin map, the module pin map and the firmware pin header are generated from it or checked against it. It replaces `pinmap.json` as the source of truth.
- **Set by:** [split spec §2][split], §5.7.
- **Amended by:** none. In this repository the contract is `circuits/h7-platform/module-interface.json`, still a draft; the pedals tools that generated or checked against it did not come across, and `pinmap.json` stayed behind (port spec, *Decisions*).

### O-8

**The 40-pin interface is two 1 × 20 parts.**
- **Date:** 2026-10-05; the connector clause reopened by the owner the same day.
- **Decides:** two designs, the module (h7-module) and the audio pedal board (h7-pedal). The 40-pin interface is two ordinary 1 × 20 2.54 mm header parts, each with its own BOM line: J_MOD_A carries contract pins 1–20 (its pins 1–20) and J_MOD_B carries contract pins 21–40 (its pins 1–20). The source's words for the reopening: "**Owner note, reopened 2026-10-05: two 1×20 parts.**"
- **Set by:** [split spec §2][split].
- **Amended by:** [R-5](#r-5) (ruling) implements the two parts.
- **Not carried:** the clause giving each design "its own full gates" (gate 8 over the OSCAR subcircuits, and so on) is about the pedals schematic generator and stayed behind with it.

*Not in force:* "one 40-pin connector part" and the quantity-2 footprint-field workaround, withdrawn by the owner's reopening of O-8.

### O-9

**Testing: audio board first with a real Seed, our module on a bring-up carrier.**
- **Date:** 2026-10-05.
- **Decides:** the audio board is tested first with a real Seed; our module is tested on a minimal bring-up carrier (40-pin breakout, codec loopback, test pads) or by swapping it into a working audio board; there is one firmware pin header, generated from the contract.
- **Set by:** [split spec §2][split].
- **Amended by:** [O-13](#o-13) (owner) makes the carrier a scoped deliverable and puts first power on it (split spec §12.4, §13.1). [O-16](#o-16) (owner): development starts on an original Seed, because the Seed3 is out of stock.

*Not in force:* "with a real Seed3" as the first audio-board test (O-9 as first written), replaced by O-16's accepted substitutes.

### O-10

**Order of work.**
- **Date:** 2026-10-05.
- **Decides:** the interface spec and contract first, then splitting the design into two boards, then audio board layout, then module layout. The contract is drafted, populated by analysis and only then frozen.
- **Set by:** [split spec §2][split].
- **Amended by:** [RR-10](#rr-10) (ruling) refines it into the split spec's ten steps (§13). [O-16](#o-16) (owner) withdraws step 1, the Seed3 bench characterisation. The contract was never frozen in the pedals repository (its `status` is still `draft`).
- **Not carried:** "Sub-project B (layout tooling) comes before both layouts" names the pedals repository's own layout tooling, which stays behind. In this repository the phases are the port spec's (models, schematics, then layout and fabrication).

### O-11

**End-user firmware update over the pedal's USB-C; ROM DFU on the module's own socket.**
- **Date:** 2026-10-05.
- **Decides:** end-user firmware update uses a bootloader in flash, run over the pedal's USB-C on the Seed USB pins 36/37. The STM32 ROM DFU stays available on the module's own USB socket for bench recovery of a bricked unit. The module and the firmware contract must leave room for the bootloader in flash, and USB on pins 36/37 must be enumerable from the bootloader.
- **Set by:** [split spec §2][split], §6.4, §11, §15 Q-1.
- **Amended by:** [RR-11](#rr-11) (ruling, Q-7): end users enter the bootloader by holding both footswitches at power-up, or by a USB command from the running application. [R-14](#r-14) (ruling) puts a USB isolation switch between pins 36/37 and the pedal's USB-C; with a Seed fitted, DFU through the Daisy bootloader over the pedal's USB-C is lost (the Seed's own USB still works). [R-60](#r-60) (ruling): the module's own socket is a vertical USB-C receptacle, and "Owner decision O-11 stands".

### O-12

**The module is socketed.**
- **Date:** 2026-10-05.
- **Decides:** female headers on the audio board, so a Seed or our module plugs in and out. The enclosure must allow the stacking height. The module's BOOT/RESET buttons need not be reachable in a finished pedal.
- **Set by:** [split spec §2][split], §5.1, §15 Q-2.
- **Amended by:** [RR-8](#rr-8) (ruling): the module envelope and stack height are fixed by a mechanical study and frozen with the contract before audio-board layout; layout confirms them and may not change them. [O-17](#o-17) (owner): the sockets sit on the audio board's underside, and the module is reachable with the back plate off. The socket and header parts are controller choices, last set by [R-61](#r-61): socket Mill-Max 801-43-020-10-012000, header Mill-Max 800-10-020-10-002000 cut to 20 from the stocked 800-10-064-10-002000, the Preci-Dip pair as fallback. Stack height 15.17 mm.

*Not in force:* the parts named in O-12's row as annotations: Preci-Dip 801-87-020-10-012101 sockets (first Samtec SLW-120-01-G-S), with Samtec TLW-120-06-G-S headers, then Preci-Dip 800-10-020-10-002101 headers ([R-54](#r-54)). These were controller part choices, not the owner's decision, and R-61 replaced them.

### O-13

**A minimal bring-up carrier.**
- **Date:** 2026-10-05.
- **Decides:** build a minimal bring-up carrier: a 40-pin breakout with a codec loopback and test points. It is a scoped deliverable in the order of work.
- **Set by:** [split spec §2][split], §13.1, §15 Q-5.
- **Amended by:** none. Swapping a module into a working audio board stays possible, but first power is on the carrier (split spec §12.4).

### O-14

**CORE-BRIEF deltas D20–D24 are approved.**
- **Date:** 2026-10-05.
- **Decides:** the deltas D20–D24, as listed in split spec §9.4, are approved.
- **Set by:** [split spec §2, §9.4, §15 Q-4][split].
- **Amended by:** none. The split spec says "The plan step appends them to `CORE-BRIEF.md` §4"; that append never happened, so `CORE-BRIEF.md` stops at D19 at the pinned commit. This port does not append them either: they are recorded here as [D20](#d20) to [D24](#d24), each citing §9.4.

### O-16

**No bench characterisation of a real Seed3; the accepted development substitutes.**
- **Date:** 2026-10-05, after approval of the split spec.
- **Decides:** the contract is drafted and frozen from documents alone (`DS105`, `DS120`, `DS-S3`, `LD-H`, `LD-BOOT`, `SCH-R5`). The three bench-only facts (split spec §16 items 7, 8 and 11) are carried as named risks R-2a to R-2c with stated design margins, confirmed at first bring-up of the audio board with a Seed fitted. Split spec §13 step 1 is withdrawn. The accepted development substitutes are the original Daisy Seed (Rev5 or Rev7, STM32H750IB, same 40-pin pinout) or the Seed3; development starts on an original Seed. The VIN minimum is 4 V on Rev5 and 5 V on Rev7, both with a 17 V maximum. The onboard codec differs by revision (Rev5 WM8731, Rev7 PCM3060), which does not matter because pins 16–19 are `reservedCompatibility`. The first step of first bring-up with a Seed records which revision is fitted.
- **Set by:** [split spec §2][split].
- **Amended by:** none. O-16 also says O-15's development bench limit "applies to every revision"; that is a cross-reference to [O-15](#o-15), a controller ruling, and the limit it refers to is O-15 as narrowed by [R-50](#r-50) (the port spec's "How amendments resolve", rule 1). The owner's facts behind O-16 are [F-4](#f-4).

*Not in force:* O-16's words for the limit it cross-references, "the 9–12 V development limit (O-15)"; the limit now in force is 9 V ([O-15](#o-15)).

### O-17

**Mechanical baseline: the reference commercial digital pedal's layout.**
- **Date:** 2026-10-05.
- **Owner:** "They use soft switches for the foot switches as well, which gives them a LOT more room on the back side because the board sits much closer to the top of the enclosure—by my measurement, about 10mm of loft from the board to the shoulder of the potentiometers." Then: "The footswitch soft-switches are on little standoff boards, which is a concession they make for the depth of the foot switch extensions". On the toggles, from his earlier decision: "Use a soft switch mounted on the board with a push button extension.... that way, we can program its function". On production mounting: "don't over-constrain what a 'production' version will look like yet."
- **Owner, choosing the parts (2026-10-05):** the footswitch actuator: "this is the stomp switch actuator: https://www.taydaelectronics.com/momentary-pcb-spring-switch.html" (DAIER PBS-24-MP). On the switch under the spring: "the board switch under the spring stomp actuators should be a tactile switch… why would those be hard to source?" and "the switch is actuated by a spring. The whole point of the spring is to offer forgiving compliance that translates a hard foot stomp to a gentle button press". The soft buttons: "lets start with the simple option A" (HCTL TC-6610-17-100G).
- **Decides:** a Hammond 1590BB in landscape; the audio board's top face about 10.7 mm below the lid's inner face, set by short-shaft Alpha RV16AF-41 pots; soft footswitches, each a DAIER PBS-24-MP spring actuator in the lid pressing a tactile switch on a small standoff board hung under the audio board; every jack, the bypass relays and the socketed module on the underside, reachable with the back plate off. Production mounting is deferred until a working board exists.
- **Set by:** [split spec §2, §5.1.1][split].
- **Amended by:** [O-18](#o-18) (owner) replaces the three separate buttons with six configurable positions. [R-56](#r-56) (owner decision, with the controller's realisation) replaces the tactile switch under the spring with a Schurter LSH in two builds. [R-62](#r-62) (ruling, on the owner's measurements [F-5](#f-5)) re-bases the enclosure depths on the owner-measured box; plan sizes stay Hammond's. [R-55](#r-55) (ruling) sets the footswitch lid hole at Ø13.4 with an M12 washer under the outside nut. [R-60](#r-60) and [R-61](#r-61) (rulings) set the module's USB socket and the socket and header pair under the board. The owner's measurements quoted above are also [F-1](#f-1) to [F-3](#f-3).

*Not in force:* the owner's decision of 2026-10-04 (A2 rulings) "footswitch = a PCB-mount momentary with a complete manufacturer PCB drawing", superseded by O-17's soft footswitches.

*Not in force:* the C&K PTS645SM43SMTR92 LFS tactile switch on two 4 mm M3 spacers with a 1.00 mm rest gap, and the Ø12.4 lid hole, replaced by R-56 and R-55.

### O-18

**Six configurable control positions, in layout B.**
- **Date:** 2026-10-05.
- **Owner:** asked whether the three buttons should go where they fit or in a neat row: "B. The controls are the user interface—they have to seem natural". Then: "Another approach is to have a bank of six swappable controls so we can spec any combination of 6 knobs and/or switches in the main control cluster, tailored for the given effect to be loaded into the firmware and the enclosure art." Approved: "yes, proceed". On the layout candidates: "I prefer B".
- **Decides:** the main control cluster is six positions, each fitted per effect with either a pot (RV16AF-41) or a tactile button (HCTL TC-6610-17-100G); firmware configures each position; lid drilling and art are per effect; the two footswitches stay fixed; the three separate buttons are removed. Layout B is an even 2 × 3 grid with the LEDs between the footswitches. Its two binding rules: the module's connector-face parts stand at most 4.97 mm (`moduleEnvelope.maxHeightBottomMm`), and every pot, button and LED lead within the module outline is trimmed to at most 1.4 mm below the audio board after soldering. The picture he chose from is [layout-B.svg](layout-B.svg).
- **Set by:** [split spec §2, §5.1.2][split].
- **Amended by:** [R-54](#r-54) and [R-61](#r-61) (rulings) set the 4.97 mm figure through the socket and header choice. [R-55](#r-55) (ruling) adds that each trimmed joint is reflowed or inspected (IPC J-STD-001), and that the socket tails are trimmed to at most 0.6 mm above the board. [R-8](#r-8) (ruling) records the contract change: pins 22–27 carry POS1–POS6 and the freed toggle pins become spares.

*Not in force:* the connector-face limit as 3.69 mm (SLW socket) and then 3.32 mm (TLW header), before R-54.

### D14

**NRST pull-up and supervisor.**
- **Date:** approved by the owner 2026-10-04.
- **Decides:** the NRST pull-up is 10 kΩ, not OSCAR's 4.7 kΩ, and a TLV803EA30DBZR supervisor drives NRST open-drain, sensing 3V3_D at the MCU.
- **Set by:** [OWNER-DEFAULTS.md][own] D14; [CORE-BRIEF.md §4][cb].
- **Amended by:** split spec §9.4: kept, on the module.

### D15

**Test pads on carried-over nets.**
- **Date:** approved by the owner 2026-10-04.
- **Decides:** bench pads on VCAP and VDDA, each with a GND pad, and a pogo pad on BOOT0.
- **Set by:** [OWNER-DEFAULTS.md][own] D15; [CORE-BRIEF.md §4][cb].
- **Amended by:** split spec §9.4: kept, on the module.

### D16

**VREF+/VDDA also feeds the pots, the expression reference and the HW_REV strap.**
- **Date:** approved by the owner 2026-10-04; revised by split spec §9.4, whose deltas the owner approved on 2026-10-05 ([O-14](#o-14)).
- **Decides (as revised):** on the module, the VDDA net's extra contact is connector pin 21, the ADC reference rail VREF_A. The pot, expression and HW_REV contacts move to the pedal board, as loads on VREF_A ([RR-1](#rr-1)).
- **Set by:** [OWNER-DEFAULTS.md][own] D16; [CORE-BRIEF.md §4][cb].
- **Amended by:** [split spec §9.4][split] (revised).

### D17

**The VDDA ferrite part.**
- **Date:** approved by the owner 2026-10-04, conditional on OSCAR's FB3 being a different part; the condition was met (the A2 Task 18 outcome: OSCAR's FB3 carries no MPN, so it is not identifiable as this part), so D17 stands.
- **Decides:** FB_VDDA is Murata BLM21PG221SN1D.
- **Set by:** [OWNER-DEFAULTS.md][own] D17; [CORE-BRIEF.md §4][cb].
- **Amended by:** split spec §9.4: kept, on the module. [R-57](#r-57) (ruling) sets the S2 module requirement VDDA-WIDEBAND on the network this bead is part of (f0 ≤ 158.0 kHz: more VDDA-bank capacitance or a bead with more inductance).

### D18

**One GND net instead of OSCAR's split grounds.**
- **Date:** approved by the owner 2026-10-04.
- **Decides:** OSCAR_AUDIO_01's DGND, GNDA and GNDD_SAI map to the single GND net.
- **Set by:** [OWNER-DEFAULTS.md][own] D18; [CORE-BRIEF.md §4][cb].
- **Amended by:** split spec §9.4: kept on both boards. The audio board joins interface pins 20 and 40 (split spec §5.6.4, exception S-4).

### D19

**The expression-tip follower runs on VDDA.**
- **Date:** approved by the owner 2026-10-04 (the A2 rulings record it as "Owner decision (2026-10-04): D19 APPROVED").
- **Decides (as revised):** U_EXP (MCP6001) has its supply on the ADC reference, with its 100 nF bypass C_EXP. After the split the follower stays on VREF_A.
- **Set by:** [OWNER-DEFAULTS.md][own] D19; [CORE-BRIEF.md §4][cb]; [A2 rulings][a2].
- **Amended by:** [split spec §9.4][split]: "D19's follower stays on VREF_A". [RR-1](#rr-1): "U_EXP stays on it (D19)".

### D20

**The codec as clock master: IFMD to VDD, SCKI from a 12.288 MHz XO.**
- **Date:** approved by the owner 2026-10-05 ([O-14](#o-14)).
- **Decides:** IFMD (pin 27) to VDD, and SCKI1/SCKI2 from a 12.288 MHz XO: the codec is clock master. It implements [O-2](#o-2).
- **Set by:** [split spec §9.4][split]. Never appended to `CORE-BRIEF.md`; this entry is its record.
- **Amended by:** none. [R-29](#r-29) (ruling) chooses the XO.

### D21

**Codec RST from a local reset circuit.**
- **Date:** approved by the owner 2026-10-05 ([O-14](#o-14)).
- **Decides:** codec RST comes from a local reset circuit on the audio board instead of the MCU. Q-6's ruling adds that the power-fail supervisor also drives RST; the split spec says the delta text records that.
- **Set by:** [split spec §9.4][split]. Never appended to `CORE-BRIEF.md`; this entry is its record.
- **Amended by:** [RR-11](#rr-11) (ruling, Q-6) adds the power-fail supervisor. [R-31](#r-31) and [R-37](#r-37) (rulings) choose the reset part and the fan-out. It replaces [D4](#d4).

### D22

**Codec VDD from a local 3.3 V regulator on 5V_A.**
- **Date:** approved by the owner 2026-10-05 ([O-14](#o-14)).
- **Decides:** codec VDD comes from a local 3.3 V regulator fed from 5V_A, so the codec's VCC-before-VDD sequencing holds without a buck EN.
- **Set by:** [split spec §9.4][split] (and §7.3). Never appended to `CORE-BRIEF.md`; this entry is its record.
- **Amended by:** none. [R-30](#r-30) (ruling) chooses the regulator and its power-down clamp.

### D23

**SDRAM control pins on PH5, PH3 and PH2.**
- **Date:** approved by the owner 2026-10-05 ([O-14](#o-14)).
- **Decides:** SDNWE, SDNE0 and SDCKE0 are on PH5, PH3 and PH2, freeing PC0 and PC4 for the header.
- **Set by:** [split spec §9.4][split] (and §3). Never appended to `CORE-BRIEF.md`; this entry is its record.
- **Amended by:** none. It replaces [D13](#d13).

### D24

**The module buck's EN from VIN_MOD.**
- **Date:** approved by the owner 2026-10-05 ([O-14](#o-14)).
- **Decides:** the module buck's EN comes from VIN_MOD instead of 5V_A.
- **Set by:** [split spec §9.4][split] (and §6.3). Never appended to `CORE-BRIEF.md`; this entry is its record.
- **Amended by:** none. [R-47](#r-47) (ruling) sizes the EN/UVLO divider.

### R-34

**R-PF-7 at exactly 9.00 V.**
- **Date:** 2026-10-06 (S1 Task 15).
- **Question:** "At what supply voltage must the pedal reach its full 7.62 Vp-p output level without clipping?"
- **Answer:** "Exactly 9.0 V (Recommended)". Option text: "Same basis as your 2026-10-01 full-scale decision. Use the simple diode per supply branch. An adapter running 5% low (~8.55 V) plus cable loss would clip about 0.4 V (≈0.5 dB) sooner at the very loudest peaks. Running from a 12 V supply gives full headroom anyway."
- **Decides:** R-PF-7 is VIN_A at a 9.00 V input, with no adapter tolerance and no cable drop, cold (−20 °C), at least 8.44 V. With the per-branch PMEG4030ER the ledger computes 9.00 − 0.385 = 8.615 V. With a 5 %-low adapter and 0.1 V of cable drop it would be 8.065 V, about 0.44 dB less clip-free level; that case is information, not a requirement.
- **Set by:** [S1 ledger R-34][ledger].
- **Amended by:** [R-40](#r-40) (ruling) records that R-34 covers R-PF-7 only: the plug-pull hold-up margins keep the brief's basis (supply 5 % low, 0.1 V cable, element cold). It supersedes [R-33](#r-33) in effect: no ideal diode is used.

### R-43

**The supply rating.**
- **Date:** 2026-10-06 (S1 Task 15 fix round 4).
- **Question:** "What power-supply rating should the pedal promise? …"
- **Answer:** "Design for 1 A, measure (Recommended)". Option text: "Keep the design as is, which is safe on a 1 A supply. Measure real current on the first board, then publish the real figure; it may well come in near 300–500 mA."
- **Decides:** the design is safe and starts on a 1 A supply. Its sufficient condition is a regulated 9 V supply that holds at least 8.55 V at 0.98 A behind 0.185 Ω; steady running draws at most 0.70 A. The published rating follows a bring-up measurement of the steady and peak input current. A weak supply is safe but does not start: the module retries while the pedal sits in bypass with the dry signal passing.
- **Set by:** [S1 ledger R-43][ledger].
- **Amended by:** restated 2026-10-06 (S1 Task 17 fix D-D-2; the ledger says "the owner decision is not reopened") on the module's real start-up. [R-50](#r-50) withdrew an unsourced retry-power figure in it.

*Not in force:* the sufficient condition as 8.55 V at 1.08 A, before the D-D-2 restatement.

### R-56

**Footswitch: design for both lid stack-ups.**
- **Date:** 2026-10-06 (S1 Task 17; review D-A-2, D-A-7).
- **Question:** "Do you have one of the Tayda/DAIER stomp actuators (PBS-24-MP) on hand? …"
- **Answer:** "No, design for both", the option "Make the switch-board spacer height work for either mounting (e.g. pick a switch and spacer whose rest-gap window covers both, or plan an adjustable spacer), and confirm on the first build."
- **Decides (the owner):** the switch board must work with (a) the actuator's collar on the lid's inner face and (b) the lid clamped between two nuts, the inner one run down on the collar; the first build confirms it.
- **Realisation (the controller's, under that decision; the owner may override it):** a Schurter LSH tact switch, whose end stop is rated 50 N / 3 s, on two 5 mm Würth WA-SMSI 9774050360R spacers, in two builds on one audio board. Build A for stack-up (a): Schurter 1301.9316.24 (7.00 mm) with three 0.5 mm shims and a TSW-102-14-F-S header. Build B for stack-up (b): Schurter 1301.9314.24 (4.30 mm) with two shims and a TSW-102-07-F-S header. The first build presses each cap until it seats and confirms the switch closes, is open at rest, the tip lands on the actuator and the spring is not coil-bound; one 0.5 mm shim corrects a gap.
- **Set by:** [S1 ledger R-56][ledger]; [split spec §5.1.1][split] (amended 2026-10-06).
- **Amended by:** none. The owner's fact behind it is [F-6](#f-6).

*Not in force:* the C&K PTS645SM43SMTR92 LFS switch on 4 mm spacers, which R-56 replaced because it publishes no rating.

### OWN-01

**Relay bypass in place of the output mute.**
- **Date:** 2026-10-04.
- **Decides:** the stereo outputs get a relay that holds the pedal in bypass (each input jack wired straight to its output jack) whenever there is no steady power. Bypass is the mute state. It replaces the solid-state output mute. The footswitches stay momentary, read by the MCU.
- **Set by:** [BYPASS-RELAY.md][bypass] ("Owner decision (2026-10-04)", "approved by the owner on 2026-10-04"); [OWNER-DEFAULTS.md][own] OWN-01 ("Decided by the owner: relay bypass"); [A2 rulings][a2] (where it supersedes the same-day "fit the mute" decision and the early "drop relay"); [platform spec][plat], *Architecture decisions*, "Bypass (amended 2026-10-04)".
- **Amended by:** split spec §9.1: relay bypass unchanged; the power-fail shed it used is replaced by the hold-up design [O-6](#o-6) directs.

*Not in force:* the solid-state mute and its not-fitted footprints, and the shed of the buck by the power-fail supervisor (OWN-01's first text, before the split).

### OWN-03

**ESD diodes at the audio and expression jacks.**
- **Date:** 2026-10-02.
- **Decides:** Nexperia PESD12VL1BA,115 on every audio tip (AIO-21) and on the expression tip and ring (CTL-10). The PESD15VL1BA is recorded as an unfitted option; "PESD12VL1BA stays the fitted part (owner decision)".
- **Set by:** [SCHEMATIC-CHECKLIST.md][checklist] OWN-03 ("Resolved by the owner, 2026-10-02") and AIO-21; [ANALOG.md][analog] §5.7.
- **Amended by:** split spec §9.2: unchanged (pedal board).

### PS-18V

**18 V continuous survival, and reverse polarity.**
- **Date:** platform spec, 2026-09-30 (rev 5, owner decisions 2026-10-01).
- **Decides:** the pedal survives 18 V DC continuously, and reverse polarity, without damage. The spec's words: "This is an owner decision: an 18 V pedal supply plugged in by mistake is a continuous condition, not a transient. *Survival is not operation.*" The operating input range is 9 V to 12 V DC (the platform spec's *Power* table).
- **Set by:** [platform spec][plat], *Power*, "Survival".
- **Amended by:** split spec §9.1: unchanged for the production pair (module and audio board). It holds to 74 °C ambient ([R-32](#r-32)), above the platform's processor-limited operating envelope ([R-20](#r-20)). [R-41](#r-41) (ruling) confirms that 18 V is a survival condition, applied continuously, not an operating point. A bench with a real Seed fitted has no 18 V survival; see [O-15](#o-15).

### PW-TJ

**MCU junction temperature at 480 MHz (VOS0).**
- **Date:** 2026-10-01.
- **Decides:** keep 480 MHz at VOS0 and the CORE-BRIEF §5b clock tree, with three requirements that follow: thermal copper under and around the LQFP-176 (an owner layout item); a bring-up measurement of the die temperature from the MCU's internal sensor, in the closed enclosure under a representative DSP load; and a firmware fallback to 400 MHz at VOS1 if the sensor reads 95 °C or more, which needs the VOS1 clock configuration validated first.
- **Set by:** [POWER.md][power], "Owner decision: MCU junction temperature at 480 MHz (VOS0). Resolved by the owner, 2026-10-01".
- **Amended by:** split spec §9.1: unchanged; the thermal copper moves to module layout ([OWN-06](#own-06)). The processor-limited envelope it sets (TA ≤ 34.7 °C at 480 MHz VOS0 worst case, ≤ 57 °C at VOS1 400 MHz, `POWER.md` §4.2) is the envelope [R-20](#r-20) evaluates self-heating claims against.

### AN-D1

**Full-scale level: 7.62 Vp-p into 10 kΩ.**
- **Date:** 2026-10-01.
- **Decides:** `ANALOG.md`'s owner decision D1, "Resolved by the owner, 2026-10-01: option (b), 7.62 Vp-p into 10 kΩ", at both the input and the output jacks: the swing the OPA1688 produces inside its guaranteed-linear region at the cold minimum VIN_PROT of 8.44 V. Its acceptance gate is a bring-up THD+N measurement at full scale with a 9.0 V input, cold and hot, into 10 kΩ.
- **Set by:** [ANALOG.md][analog], "Owner decisions (resolved)"; [platform spec][plat], *Open items* item 3.
- **Amended by:** split spec §9.1: unchanged, protected by R-PF-7, whose basis is the owner's [R-34](#r-34).

*Not in force:* the original 8 Vp-p full-scale target, replaced by D1.

### AN-D2

**"≥ 1 MΩ input" means resistive input impedance.**
- **Date:** 2026-10-01.
- **Decides:** `ANALOG.md`'s owner decision D2, "Resolved by the owner, 2026-10-01: resistive input impedance" (pedal practice).
- **Set by:** [ANALOG.md][analog], "Owner decisions (resolved)".
- **Amended by:** none.

## Owner-supplied facts

These are the owner's own measurements and statements of fact. The F-numbers are this document's; the sources do not number them. Each is linked to the decision or ruling built on it.

### F-1

- **Date:** 2026-10-05.
- **Owner:** "by my measurement, about 10mm of loft from the board to the shoulder of the potentiometers." (the reference commercial pedal).
- **Source:** [split spec §2 O-17, §5.1.1][split].
- **Used by:** [O-17](#o-17).

### F-2

- **Date:** 2026-10-05.
- **Owner:** "it looks like the throw of the spring is about 5mm" (the footswitch actuator).
- **Source:** [split spec §5.1.1][split]. The Alpha SF12030F drawing prints the travel as 10.2 − 5.1 = 5.1 mm.
- **Used by:** [O-17](#o-17), [R-56](#r-56).

### F-3

- **Date:** 2026-10-05.
- **Fact:** the owner gave the Alpha SF12030F as the part the DAIER PBS-24-MP likely copies. The source records this without his words.
- **Source:** [split spec §5.1.1][split].
- **Used by:** [O-17](#o-17), [R-56](#r-56) (the Alpha's printed dimensions are taken as the primary source; the two agree within 0.5 mm everywhere).

### F-4

- **Date:** 2026-10-05.
- **Fact:** "The owner has original Seeds and the Seed3 is out of stock, so development starts on an original Seed." This is the split spec's sentence, not his words.
- **Source:** [split spec §2 O-16][split].
- **Used by:** [O-16](#o-16).

### F-5

- **Date:** 2026-10-06, measured from the inside of the top panel.
- **Owner:** "On my reference board, the tallest shoulder is 11.25mm above the pcb."; "the jack is about 15.8mm tall"; "the box is about 28.3mm deep (to the top of the screw hole posts, which is where the lid's lip rests). Its about 30mm to the bottom edge of the enclosure"; "Im measuring from the inside. The tangent of the jack hole is about 26.77 mm from the inside top of the enclosure"; "the lip of the lid rises 3mm from the inside of the lid and 2mm from the edge of the lid. So, the inside of the lid is 1mm deeper than the side edges of the enclosure".
- **Source:** [S1 ledger R-62][ledger].
- **Used by:** [R-62](#r-62).

### F-6

- **Date:** 2026-10-06.
- **Fact:** the owner does not have a DAIER PBS-24-MP actuator on hand (his answer "No, design for both" to the question in [R-56](#r-56)).
- **Source:** [S1 ledger R-56][ledger].
- **Used by:** [R-56](#r-56).

## Controller rulings (the owner may override)

Each entry below is a controller ruling. The owner may override any of them. None supersedes an owner decision; where one narrows an owner decision, the owner decision links to it.

### O-15

**Development bench supply with a real Seed fitted.**
- **Label:** a controller ruling on best practice, which the owner may override. The split spec numbers it among the owner decisions but records it as "(2026-10-05, controller ruling on best practice; the owner may override)", and §15 closes Q-3 "by controller ruling on best practice (O-15)". So [R-50](#r-50)'s 9 V rule is a ruling narrowing a ruling, not a ruling overriding the owner.
- **Date:** 2026-10-05; narrowed 2026-10-06.
- **Current:** a development bench with a real Daisy Seed fitted runs from a 9 V supply, until bring-up measures a Seed's VIN current and capacitance through the switch-on. The reason: a Seed's VIN maximum is 17 V (minimum 5 V on Rev7, 4 V on Rev5), it has no 18 V survival, and its switch-on stress through the module load switch cannot be bounded from published data. No added protection on the audio board's module branch for the Seed, and no 18 V survival test with a Seed fitted. Production uses our module.
- **Set by:** [split spec §2 O-15, §5.0 S-1, §15 Q-3][split].
- **Amended by:** [R-50](#r-50) (narrowed to 9 V: "This narrows O-15's" range); [R-58](#r-58) ("R-50's 9 V benches stand"); [R-59](#r-59) (at 9.45 V the hot-plug bound on VIN_MOD is 13.56 V, 3.4 V under a Seed's 17 V).

*Not in force:* O-15's original range, "Development with a real Seed fitted is limited to 9–12 V supplies" (split spec §2, §3, §5.0 S-1, §9.1, §15 Q-3; ledger R-7), narrowed by R-50.

### RR-1

**Pin 21 is an ADC reference rail, VREF_A, with a contract.**
- **Date:** 2026-10-05 (review response).
- **Decides:** load limits, capacitance, back-feed, filtering, noise and unpowered behaviour are contracted. Permitted loads: pot tops, the expression ring reference, the HW_REV divider and the U_EXP supply. U_EXP stays on it ([D19](#d19)).
- **Set by:** [split spec §2.1][split], §5.6.3.
- **Amended by:** S1 rulings fill in its values: [R-15](#r-15), [R-16](#r-16), [R-17](#r-17), [R-18](#r-18), [R-19](#r-19), [R-57](#r-57).

### RR-2

**Power-domain sequencing is an interface requirement.**
- **Date:** 2026-10-05.
- **Decides:** no board may source current through an interface signal into an unpowered I/O domain beyond the manufacturer's limits.
- **Set by:** [split spec §2.1][split], §5.6.5.
- **Amended by:** none.

### RR-3

**VIN_MOD and the module's 3V3 output get electrical contracts; relay-coil and LED power move to the pedal board.**
- **Date:** 2026-10-05.
- **Decides:** the module supplies logic only.
- **Set by:** [split spec §2.1][split], §5.6.1, §5.6.2, §7.5.
- **Amended by:** [R-23](#r-23), [R-24](#r-24), [R-46](#r-46), [R-51](#r-51), [R-59](#r-59) fill in values; [R-25](#r-25) chooses the pedal digital rail.

### RR-4

**The interface is a project-owned electrical contract.**
- **Date:** 2026-10-05.
- **Decides:** the contract is mechanically compatible with the Daisy Seed header; our module guarantees the full contract; a Seed is a development substitute compatible with the signal contract and the documented development load envelope, with listed exceptions (split spec §5.0, S-1 to S-10).
- **Set by:** [split spec §2.1][split], §5.0.
- **Amended by:** none.

### RR-5

**Pins 16–19 are `reservedCompatibility`.**
- **Date:** 2026-10-05.
- **Decides:** the contract marks pins 16–19 `reservedCompatibility`, never assigned, because a fitted Seed drives and loads them.
- **Set by:** [split spec §2.1][split], §5.7.
- **Not carried:** "the gate refuses to assign them" names a pedals checker, which stayed behind.

### RR-6

**PB8/PB9 are the I²C expansion bus.**
- **Date:** 2026-10-05.
- **Decides:** the architecture's route for adding low-bandwidth controls without new interface pins.
- **Set by:** [split spec §2.1][split], §5.2, §5.4.
- **Amended by:** [R-21](#r-21) sets the bus speed, budget and pull-ups.

### RR-7

**USB wording.**
- **Date:** 2026-10-05.
- **Decides:** the pedal's USB is described as "OTG_HS controller using its internal full-speed PHY".
- **Set by:** [split spec §2.1][split].

### RR-8

**Mounting is decided; envelope and stack height frozen before audio-board layout.**
- **Date:** 2026-10-05.
- **Decides:** socketed ([O-12](#o-12)), on the audio board's underside in the [O-17](#o-17) baseline. The module envelope and stack height are frozen with the contract after the mechanical study, as a precondition of audio-board layout.
- **Set by:** [split spec §2.1][split], §5.1, §5.1.1, §13.
- **Amended by:** none. The study's values are in the contract (`stackHeightMm` 15.17 mm, `maxHeightBottomMm` 4.97 mm; [R-61](#r-61)); the contract is still a draft.

### RR-9

**The contract gains per-pin power-domain fields.**
- **Date:** 2026-10-05.
- **Decides:** each contract pin records its power domains on both sides.
- **Set by:** [split spec §2.1][split], §5.7.
- **Not carried:** "gate 9 flags unprotected cross-domain outputs" names a pedals checker, which stayed behind. The rule it checked, [RR-2](#rr-2), is carried.

### RR-10

**Order of work in ten steps.**
- **Date:** 2026-10-05.
- **Decides:** Seed3 bench characterisation first, then the draft of the structural contract, analysis that populates the electrical values, contract freeze, bring-up carrier, schematic split, gates, layout tooling, audio layout, module layout.
- **Set by:** [split spec §2.1, §13][split].
- **Amended by:** [O-16](#o-16) (owner) withdraws the Seed3 bench characterisation. The gate and layout-tooling steps named pedals tools and stayed behind; this repository's phases are the port spec's.

### RR-11

**Q-6 and Q-7 closed by ruling.**
- **Date:** 2026-10-05.
- **Decides:** **Q-6, codec reset:** the codec reset is local to the pedal board, driven by the power-on reset AND the power-fail supervisor; `CODEC_RST` is not on the interface; the codec's I²C crosses on the I²C expansion bus through not-fitted links on this board. If the owner overrides it and wants MCU control of the codec reset, the expansion bus loses a pin. **Q-7, entering the bootloader without the BOOT button:** end users hold both footswitches at power-up, or send a USB command to the running application. Bench recovery keeps the module's own USB socket with ROM DFU, and SWD.
- **Set by:** [split spec §2.1, §15][split].
- **Amended by:** [D21](#d21) (owner-approved) records the local reset; [R-31](#r-31) and [R-37](#r-37) realise it.

### OWN-02

**R_RF value.**
- **Label:** controller ruling. The source's line reads "**Owner decision (2026-10-04):** Decided on best practice (2026-10-04); owner may override." It is headed as an owner decision but says it was decided on best practice with the override reserved to him, under his standing instruction to decide engineering questions by best practice and report. That is a ruling he may override; the heading is ambiguous and is recorded here as such.
- **Date:** 2026-10-04.
- **Decides:** R_RF is 1.0 kΩ 1 % 0603, as `ANALOG.md` §5.3 designs it.
- **Set by:** [OWNER-DEFAULTS.md][own] OWN-02.
- **Amended by:** split spec §9.2: unchanged (pedal board).

### OWN-04

**MIDI header supply.**
- **Label:** controller ruling, with the same ambiguous heading as [OWN-02](#own-02).
- **Date:** 2026-10-04; narrowed 2026-10-06.
- **Current:** the MIDI header's 3.3 V supply is 3V3_D (contract pin 38), inside its 25 mA logic-load contract, and supplies the MIDI IN receiver and the MIDI OUT open-drain driver only. The MIDI OUT current loop is powered from the pedal digital rail. The header stays unpopulated.
- **Set by:** [OWNER-DEFAULTS.md][own] OWN-04.
- **Amended by:** split spec §9.2; [R-23](#r-23) (the split spec's §9.2 calls it "ruling R-23 (confirmed)" without saying who confirmed it; the ledger names the confirmer as the controller).

### OWN-05

**Panel and enclosure parts.**
- **Label:** controller ruling, with the same ambiguous heading as [OWN-02](#own-02).
- **Date:** 2026-10-04; changed 2026-10-05 and 2026-10-06.
- **Current:** pots are RV16AF-41 (O-17); each of the six control positions is an RV16AF-41 pot or an HCTL TC-6610-17-100G button per effect (O-18), with no separate buttons; the footswitches are DAIER PBS-24-MP actuators pressing Schurter LSH tact switches on boards hung under the audio board, in two builds (R-56); the BOOT0 and RESET tactile switches move to the module and need not be reachable in a closed enclosure (O-12). The split spec leaves the remaining panel parts to be chosen in S2 (§9.2); later rulings use the Neutrik NMJ6HCD2 jacks ([R-62](#r-62)) and Kingbright WP7113ID LEDs ([R-27](#r-27)).
- **Set by:** [OWNER-DEFAULTS.md][own] OWN-05.
- **Amended by:** [split spec §9.2][split]; [O-17](#o-17), [O-18](#o-18), [R-56](#r-56).

*Not in force:* the v1 panel parts that the split replaced: the RV16AF-42-15R1-B10K pots, the Dailywell 1MS3T2B3M2QES toggles and the E-Switch FS5700SPMT2B2M2QE footswitches. This is what v1 contained, which is all it is.

### OWN-06

**Thermal copper under the MCU.**
- **Label:** controller ruling, with the same ambiguous heading as [OWN-02](#own-02). The requirement itself comes from the owner's [PW-TJ](#pw-tj).
- **Date:** 2026-10-04.
- **Decides:** the copper area and vias under the MCU are layout features; after the split they belong to module layout.
- **Set by:** [OWNER-DEFAULTS.md][own] OWN-06.
- **Amended by:** split spec §9.2: moves to module layout.

### OWN-07

**Procurement watch.**
- **Label:** controller ruling, with the same ambiguous heading as [OWN-02](#own-02).
- **Date:** 2026-10-04; extended 2026-10-05 and 2026-10-06.
- **Decides:** no schematic change for stock; lifecycle and stock are re-checked and dated at the PCBWay quote, and a part is replaced through its design note when it is no longer Active, never because of one day's stock figure. A substitute must match the stated tolerance, TCR and voltage. The watch extends to the Seed3 stand-ins, the 2 × 20 header pins and sockets, the XO, the codec VDD regulator, the analog-branch isolation element, the SAI domain isolation part and the pedal digital rail regulator, and to the thinly stocked parts the S1 analyses flagged.
- **Set by:** [OWNER-DEFAULTS.md][own] OWN-07.
- **Amended by:** [split spec §9.2][split] (extended).

### D1

**SDRAM class.**
- **Label:** controller ruling. `CORE-BRIEF.md` records no owner approval for D1 to D13: they are the brief's deltas from OSCAR, which the approved generator spec took as given ("about 10 of the 13 CORE-BRIEF deltas"). The owner's approvals start at D14. The ambiguity is recorded here.
- **Decides:** the 32 MB baseline class: 256 Mbit × 16, 13 row bits, 9 column bits, 4 banks; the TSOP-II-54 pinout and A0–A12 carry over from OSCAR.
- **Set by:** [CORE-BRIEF.md §4][cb]; compatibility in `SDRAM-COMPATIBILITY.md`.
- **Amended by:** split spec §3: 32 MB is the module baseline, and firmware fits 32 MB on every board, the Seed included ([O-4](#o-4)).

### D2

**PCM3060 in hardware mode, with I²C on not-fitted links.**
- **Label:** controller ruling (see [D1](#d1)).
- **Decides:** the codec runs in hardware mode with its I²C option left open through not-fitted 0 Ω links and the strap arrangement the brief describes.
- **Set by:** [CORE-BRIEF.md §4][cb].
- **Amended by:** [split spec §9.4][split]: kept; the pin 27 note is revised for IFMD high ([D20](#d20)). The links reach the expansion bus nets ([RR-11](#rr-11)).

*Not in force:* D2's clause "Pin 27 is IFMD in H/W mode and ADR in I2C mode. Keep it low", revised for IFMD high by §9.4.

### D3

**The 5V_A LDO, rated for the protected input.**
- **Label:** controller ruling (see [D1](#d1)).
- **Decides:** the 5V_A LDO feeds PCM3060 VCC, with the pin-local 100 nF plus 10 µF.
- **Set by:** [CORE-BRIEF.md §4][cb].
- **Amended by:** not named in split spec §9.4. On the split it is on the audio board's analog branch, and also feeds the codec VDD regulator ([D22](#d22)).

### D4

**Codec RST driven by the MCU: withdrawn.**
- **Label:** controller ruling (see [D1](#d1)); withdrawn.
- **Status:** **withdrawn** by [split spec §9.4][split] and replaced by the local reset of [D21](#d21).
- **Set by:** [CORE-BRIEF.md §4][cb].

*Not in force:* D4's codec RST on net `CODEC_RST`, driven by an MCU GPIO.

### D5

**The 3V3_D buck replaces OSCAR's digital supply.**
- **Label:** controller ruling (see [D1](#d1)).
- **Decides (as revised):** the buck is on the module and no longer feeds codec VDD.
- **Set by:** [CORE-BRIEF.md §4][cb].
- **Amended by:** [split spec §9.4][split] (revised); [D22](#d22), [D24](#d24).

### D6

**BOOT0 and Reset buttons.**
- **Label:** controller ruling (see [D1](#d1)).
- **Decides:** OSCAR's circuits are kept; the buttons are on the module ([O-4](#o-4)) and need not be reachable in a closed enclosure ([O-12](#o-12)).
- **Set by:** [CORE-BRIEF.md §4][cb].
- **Amended by:** not named in split spec §9.4.

### D7

**MCU power pins OSCAR gets wrong or leaves short.**
- **Label:** controller ruling (see [D1](#d1)).
- **Decides:** PDR_ON tied to VDD; VCAP1 joined to VCAP2, each with 2.2 µF; 100 nF plus 1 µF on VDD33USB; OSCAR's VDDA bank kept.
- **Set by:** [CORE-BRIEF.md §4][cb].
- **Amended by:** not named in split spec §9.4; on the module.

### D8

**HSE crystal.**
- **Label:** controller ruling (see [D1](#d1)).
- **Decides:** 25 MHz, with OSCAR's unspecified part replaced.
- **Set by:** [CORE-BRIEF.md §4][cb] (and §5).
- **Amended by:** [split spec §9.4][split]: the HSE and the AN2606 verdict are kept for the module; the Seed's 16 MHz HSE is a firmware board configuration.

### D9

**SWD header.**
- **Label:** controller ruling (see [D1](#d1)).
- **Decides:** the 2 × 5 1.27 mm Cortex debug header with pogo pads.
- **Set by:** [CORE-BRIEF.md §4][cb].
- **Amended by:** [split spec §9.4][split]: kept (module).

### D10

**USB ESD and VBUS sense.**
- **Label:** controller ruling (see [D1](#d1)).
- **Decides (as revised):** ESD protection and VBUS sense move to the pedal board; VBUS is sensed on PA1 as a GPIO; PA11/PA12 go to the module's own USB socket.
- **Set by:** [CORE-BRIEF.md §4][cb].
- **Amended by:** [split spec §9.4][split] (revised). [R-57](#r-57) adds the S2 item VBUS-HOTPLUG on PA1.

*Not in force:* VBUS sense on PA9 (D10 before the split).

### D11

**One flash, bank 1 only.**
- **Label:** controller ruling (see [D1](#d1)).
- **Decides:** one QSPI flash on bank 1; PH2/PH3 now carry SDCKE0/SDNE0 and PG9 carries SAI2_FS_B.
- **Set by:** [CORE-BRIEF.md §4][cb].
- **Amended by:** [split spec §9.4][split]: kept, with the pin uses above.

### D12

**Bootloader pin cautions.**
- **Label:** controller ruling (see [D1](#d1)).
- **Decides:** the AN2606 cautions on bootloader pins; PB15 is now the pedal's USB D+, which must not be held low at boot.
- **Set by:** [CORE-BRIEF.md §4][cb].
- **Amended by:** [split spec §9.4][split] (revised); [R-14](#r-14) (PB14 under the ROM bootloader); [R-57](#r-57) (freeze blocker FB-AN2606).

### D13

**PC3_C carries SDCKE0: withdrawn.**
- **Label:** controller ruling (see [D1](#d1)); withdrawn.
- **Status:** **withdrawn** by [split spec §9.4][split]: SDCKE0 moves to PH2 ([D23](#d23)).
- **Set by:** [CORE-BRIEF.md §4][cb].

*Not in force:* D13's FMC_SDCKE0 on the PC3_C pad, with firmware never setting PC3SO.

### R-1

**The contract's `seedFact` marking.**
- **Date:** recorded before S1 dispatch (plan S1, 2026-10-05).
- **Decides:** a pin whose Seed behaviour depends on a bench-only fact is marked `seedFact` U, with a source naming the verified parts and the U item: every signal pin is U (split spec §16 item 7, R-2a); pins 2–8, 36 and 37 also name item 11 (R-2c); pins 21 and 38 name item 8 (R-2b). Pins 16–20, 39 and 40 are V.
- **Set by:** [S1 ledger R-1][ledger].

### R-2

**Contract schema additions.**
- **Date:** before S1 dispatch.
- **Decides:** the contract adds `status` (draft/frozen), `reservedOverrides`, `seedOnboardPullTolerance`, `seedRisks`, per-rail `moduleSourceRoles` and `benchLoadRoles`, and `protection.companionRoles`.
- **Set by:** [S1 ledger R-2][ledger].
- **Amended by:** [R-14](#r-14) replaces the protection class it gave pins 36/37.

*Not in force:* the protection class `usb2-attach-protocol` for pins 36/37, replaced by `isolation-buffer-ioff` (R-14).

### R-5

**The 40-pin interface is two parts in the BOM.**
- **Date:** 2026-10-05 (reopened by the owner, [O-8](#o-8)).
- **Decides:** two connector parts per board, `J_MOD_A` (contract pins 1–20) and `J_MOD_B` (contract pins 21–40), each an ordinary 1 × 20 2.54 mm part with its own BOM line (female on the pedal and carrier boards, male on the module). Contract pin n is `J_MOD_A` pin n for n ≤ 20 and `J_MOD_B` pin n − 20 for n ≥ 21. On a board the two are 15.24 mm apart, `J_MOD_B` rotated 180°, so its pin 1 (contract pin 21) is opposite `J_MOD_A` pin 20. The pedals-specific symbol and footprint names stayed behind.
- **Set by:** [S1 ledger R-5][ledger].

*Not in force:* the earlier ruling "one `J_MOD` part per board, quantity 2".

### R-6

**SAI trace-and-connector allowance.**
- **Date:** 2026-10-05.
- **Decides:** no source gives the Seed-side path length, so a 2 ns engineering allowance is applied once per traversal of the header (twice on DIN). Margins are at least 75 ns.
- **Set by:** [S1 ledger R-6][ledger].

### R-8

**Spare interface pins and the control positions.**
- **Date:** 2026-10-05 (on owner decisions [O-18](#o-18) and layout B).
- **Decides:** a freed GPIO pin stays a `signal` pin with a unique name, direction `in`, function `GPIO`. Pins 22–27 are POS1–POS6. 3V3_D gains the load role `control-button-pullup` (1.92 mA declared).
- **Set by:** [S1 ledger R-8][ledger].
- **Amended by:** [R-14](#r-14): pin 11 becomes USB_EN_N; the spares are SPARE1–SPARE5 on pins 1, 2, 3, 7 and 10.

*Not in force:* six spares SPARE1–SPARE6 on pins 1, 2, 3, 7, 10 and 11.

### R-9

**SAI timing edges and the half period.**
- **Date:** 2026-10-05 (S1 Task 10).
- **Decides:** the SAI timing is checked with launch and capture on opposite BCK edges, the half period being the codec's minimum pulse width 0.4 t(BCY) = 130.2 ns. Both SAI2 blocks run with CKSTR = 1, which firmware must set. Margins: 75.3 ns setup, 110.3 ns hold.
- **Set by:** [S1 ledger R-9][ledger].
- **Amended by:** [R-57](#r-57) adds the codec's slave-side timing (DIN, LRCK2, BCK2).

### R-10

**Series resistors between the to-module isolation buffer and the module pins.**
- **Date:** 2026-10-05; amended 2026-10-06.
- **Decides:** 470 Ω 1 % between each SN74LVC3G34 (U_ISO_M) output and pins 32, 34 and 35, carrying the companion role `sai-module-series`. It bounds the fight with the ST ROM bootloader driving PA2, and covers firmware that misconfigures PA0 or PG9.
- **Set by:** [S1 ledger R-10][ledger].
- **Amended by:** the Task 10 fix round (2026-10-06), in the same entry.

*Not in force:* the role `sai-isolation-to-module` on these resistors, and the "keeps the paths matched" reason, both withdrawn in the Task 10 fix round.

### R-11

**R-2a criteria where no logic threshold applies.**
- **Date:** 2026-10-05; amended 2026-10-06.
- **Decides:** an analog input tolerates an onboard pull that costs at most 2 % of full scale; a pin with no audio-board circuit and CODEC_DIN take 450 Ω; the I²C pins 10 kΩ; USB D−/D+ USB 2.0's ZINP ≥ 300 kΩ. The pot fit binds at 498.4 kΩ, the first bring-up threshold.
- **Set by:** [S1 ledger R-11][ledger].
- **Amended by:** its fix-round note after [R-13](#r-13).

### R-12

**USB D+/D− protection class: superseded.**
- **Date:** 2026-10-05.
- **Status:** its class is superseded by [R-14](#r-14); its attach argument still holds with the USB switch closed. Its title says "confirmed" without naming who confirmed it; it is carried as a controller ruling.
- **Set by:** [S1 ledger R-12][ledger].

### R-13

**Gate pull-downs and the R-2a gate criterion.**
- **Date:** 2026-10-06.
- **Decides:** each output gate must tolerate any unknown onboard pull-up to pin 38 of 100 kΩ or more. Relay gate pull-down R_BPD 15.0 kΩ; LED gate pull-downs 10.0 kΩ.
- **Set by:** [S1 ledger R-13][ledger].
- **Amended by:** [R-57](#r-57) adds the series terms: pin 8 tolerates 87.4 kΩ, pins 4/5 60.8 kΩ; the 100 kΩ criterion still holds.

### R-14

**PB14 under the ST ROM bootloader: a USB isolation switch.**
- **Date:** 2026-10-06.
- **Decides:** the pedal and the carrier fit U_USBSW, TI TS3USB221RSER, between J_MOD pins 36/37 and the USBLC6-2/USB-C, VCC from 3V3_D, its active-low OE held off by R_USBEN 10.0 kΩ 1 % to 3V3_D. Pin 11 (PB5) becomes USB_EN_N. Pins 36/37 take the protection class `isolation-buffer-ioff`. 3V3_D gains the load role `usb-isolation-switch`. The procedure stays as a second safeguard: unplug the pedal's or carrier's USB-C before ROM DFU entry. Cost: DFU through the Daisy bootloader over the pedal's USB-C is lost with a Seed fitted.
- **Set by:** [S1 ledger R-14][ledger].
- **Amended by:** [R-57](#r-57): Electrosmith's DS120 Table 2 confirms PB5 has no onboard function; the other fact it rests on (AN2606 Table 135 has no PB5) could not be read and is the freeze blocker FB-AN2606.

### R-15

**Control resolution and the VREF_A noise requirement.**
- **Date:** 2026-10-06; amended three times the same day.
- **Current:** firmware reads the six control positions and the expression input at 10 bits (a decision; no document states a control resolution). The permitted VREF_A noise in the control band is 1,123 µV rms; the control band is 0–421 Hz. Wideband noise at pin 21, up to the ADC's sampling bandwidth, must stay at or under 806 µV rms (LSB/4), a module requirement. Above the band, firmware's control smoothing must attenuate the residue.
- **Set by:** [S1 ledger R-15][ledger].
- **Amended by:** its fix-round amendments; [R-57](#r-57) (one ceramic basis: the band becomes 0–421 Hz, and the module must meet f0 ≤ 158.0 kHz, requirement VDDA-WIDEBAND).

*Not in force:* the control band 0–179 Hz, before R-57.

*Not in force:* the wideband estimate 0.745 mV rms at pin 21, withdrawn as a bound by R-57 (the present bank gives 2.13 mV rms on R-57's basis).

### R-16

**Pot tolerance and the VREF_A dynamic peak.**
- **Date:** 2026-10-06.
- **Decides:** the pot-top load takes the B10K pots at −20 % (8.0 kΩ), an allowance; the expression input is specified for passive pedals; the dynamic peak is the plain sum of the ring short, the blocking network, the filter charge and the pots and fixed loads.
- **Set by:** [S1 ledger R-16][ledger].
- **Amended by:** its fix-round amendment; [R-17](#r-17) and [R-19](#r-19) set the current figures.

### R-17

**Back-feed blocking on the expression input.**
- **Date:** 2026-10-06; amended through the Task 11 fix rounds.
- **Decides:** an LM66100 ideal diode (U_REFBLK) in series between VREF_A and R_REF, its CE held by R_CE 100 kΩ and a 2N7002 (Q_REFEN) gated from VREF_A through R_ENG 100 kΩ; R_EXPIN 2.2 MΩ between the tip node and U_EXP's input. Claimed to 85 °C ([R-20](#r-20)). Bring-up gate: with the module unpowered and +5 V on the ring through R_REF, VREF_A must read at most 0.6 V, with a slow 0 → +5 V sweep and a hot repeat. A bleeder on the module's 3V3 is recorded for S2 as a backstop, not adopted.
- **Set by:** [S1 ledger R-17][ledger]. It resolves split spec §14 risk R-14 (which is not ruling R-14).

*Not in force:* CE tied straight to VOUT, R_CE 1.00 MΩ, R_EXPIN 1.00 MΩ, and the 105 °C figures, all replaced in the fix rounds.

### R-18

**VREF_A maximum external capacitance: 4 µF.**
- **Date:** 2026-10-06.
- **Decides:** 4 µF, a recorded decision rather than a derivation. Carried to the module design: a loop-stability and start-up check of the module's 3V3 buck with its total capacitance plus the contract's external capacitance, before the contract is frozen; and a damping leg across the VDDA bank, never a series resistance in VDDA's DC path. The 145.5 µF bound covers the Rev5 Seed only.
- **Set by:** [S1 ledger R-18][ledger].

### R-19

**The −5 V ring case: R_REF and a Schottky clamp.**
- **Date:** 2026-10-06.
- **Current:** D_RCLAMP, Nexperia PMEG4005AEA, from GND to the node between U_REFBLK's output and R_REF; R_REF 3.30 kΩ 1 % 1206 (Uniroyal 1206W4F3301T5E). The ring role declares 3.50 mA and the VREF_A total 6.49 mA, × 1.5 = 9.74 mA against 10 mA. Claimed from −20 °C to 85 °C.
- **Set by:** [S1 ledger R-19][ledger].
- **Amended by:** its fix-round amendments (R_REF value, R_CE, temperature basis).

*Not in force:* R_REF 1.00 kΩ, then 3.09 kΩ.

### R-20

**Design temperature range for the analyses.**
- **Date:** 2026-10-06.
- **Decides:** part ratings, leakage and other temperature-dependent part parameters are claimed from −20 °C to 85 °C, and nothing in the contract above 85 °C; a part's own rating caps a claim below that (the bypass relays to 70 °C ambient). Self-heating claims are evaluated to the platform's processor-limited thermal envelope ([PW-TJ](#pw-tj)), and each states its limit.
- **Set by:** [S1 ledger R-20][ledger].

### R-21

**I²C expansion bus: Fast-mode, capacitance budget and pull-ups.**
- **Date:** 2026-10-06.
- **Decides:** 400 kHz; at most four expansion devices and 40 cm of bus wiring, or the board buffers the bus; pull-ups 2.40 kΩ ±1 %, only on the audio board; expansion boards fit no pull-ups of their own; any ESD or TVS part on SDA/SCL counts toward the bus capacitance at its maximum.
- **Set by:** [S1 ledger R-21][ledger].
- **Amended by:** [R-61](#r-61): the 2 pF per socket contact becomes an allowance for the Mill-Max parts.

### R-22

**Footswitch series resistor and debounce.**
- **Date:** 2026-10-06.
- **Decides:** 1.20 kΩ ±1 % between each footswitch node and its pin; the 100 nF stays at the node; firmware debounces in a 5 ms window, confirmed at bring-up against the fitted footswitch's measured bounce.
- **Set by:** [S1 ledger R-22][ledger].

### R-23

**Pin-38 allocation and the MIDI split.**
- **Date:** 2026-10-06. "Confirmed 2026-10-06 (controller ruling)".
- **Decides:** the MIDI OUT current loop is powered from the pedal digital rail, switched by an open-drain Ioff driver (U_MIDIDRV, SN74LVC1G07) on 3V3_D from MIDI_UART_TX. 3V3_D's MIDI allocation covers the MIDI IN receiver (2.0 mA, met by a cited part) and the driver. The declared 3V3_D total is 16.66 mA, × 1.5 = 24.99 mA, inside the 25 mA logic-load contract.
- **Set by:** [S1 ledger R-23][ledger].
- **Amended by:** [R-26](#r-26) (the driver drives a high-side P-MOSFET instead of sinking the loop); [R-28](#r-28) (the driver role becomes 0.21 mA, `i2c-device` 6.3 mA).

### R-24

**3V3_D external capacitance, peak and ripple.**
- **Date:** 2026-10-06.
- **Decides:** `maxExternalCapacitanceUf` 10 µF (a decision, carried to the module's loop and start-up check); `maxPeakCurrentMa` 26.3 mA; `rippleMvPp` 20.7 mV.
- **Set by:** [S1 ledger R-24][ledger].

### R-25

**Pedal digital rail: 3V3_P, a TPS62933F on VIN_MOD.**
- **Date:** 2026-10-06.
- **Decides:** the rail is 3V3_P from a TI TPS62933FDRLR, with `POWER.md` §3.3's network, fed from VIN_MOD after the module branch's reverse-polarity element, never from VIN_A. It carries both relay coils, both LEDs, the MIDI OUT loop and Q_MIDI's gate pull-up. Its EN follows PF_ON through the network of [R-44](#r-44).
- **Set by:** [S1 ledger R-25][ledger].
- **Amended by:** [R-44](#r-44), [R-45](#r-45), [R-52](#r-52), [R-58](#r-58) (EN network).

*Not in force:* "RT and EN floating" (R-25 as first written).

### R-26

**MIDI OUT short circuit: a high-side P-MOSFET switch.**
- **Date:** 2026-10-06.
- **Current:** Q_MIDI, AOS AO3401A, source on 3V3_P, drain to RA, RA to MIDI pin 4; RA is four 130 Ω ±1 % 1206 in parallel; RC is 10 Ω ±1 % 1206; Q_MIDI's gate is pulled up to 3V3_P by R_MGP 160 Ω ±1 % 1206 (Uniroyal 1206W4F1600T5E) and pulled low by U_MIDIDRV.
- **Set by:** [S1 ledger R-26][ledger].
- **Amended by:** its fix round 1; [R-53](#r-53) (R_MGP at Q_MIDI's 85 °C threshold).

*Not in force:* R_MGP 1.00 kΩ, then 270 Ω 0603.

### R-27

**Pedal-rail allowances.**
- **Date:** 2026-10-06.
- **Decides:** WP7113ID VF,min 1.6 V (an allowance), so the LED series resistor is 100 Ω; TPS62933F loss 0.35 W; input capacitance 3.45 µF effective per 10 µF 50 V 1206, less 10 %, with 10 mΩ ESR. Bring-up measures all three.
- **Set by:** [S1 ledger R-27][ledger].
- **Amended by:** [R-53](#r-53): the 3.45 µF is TI's figure for a TDK part and stands as the allowance for the fitted Samsung part.

### R-28

**Pull-up on MIDI_UART_TX.**
- **Date:** 2026-10-06.
- **Decides:** R_TXPU 18.0 kΩ ±1 % from MIDI_UART_TX to 3V3_D, at U_MIDIDRV's input, so the driver is held off while the MCU pin is unconfigured.
- **Set by:** [S1 ledger R-28][ledger].

### R-29

**Codec oscillator.**
- **Date:** 2026-10-06.
- **Decides:** U_XO is the Epson SG-210STF 12.288000 MHz L (X1G0041710019) on 3V3_CODEC with 100 nF, ST̅ tied high. The stability criterion is amended to ±50 ppm all-inclusive over the operating range, excluding aging. The 15 pF CMOS load is a layout requirement on XO_OUT.
- **Set by:** [S1 ledger R-29][ledger].

### R-30

**Codec VDD regulator and the power-down clamp.**
- **Date:** 2026-10-06.
- **Decides:** U_CVDD is a TI TPS7A2433DBVR from the codec's VCC net to 3V3_CODEC; D_CVCL, a PMEG4005AEA, from OUT to IN; R_CBLD 3.60 kΩ ±1 % from 3V3_CODEC to GND. An exception to `POWER.md` §4.1 is accepted for the power-down: at most 24 mV past the regulator's VOUT ≤ VIN + 0.3 V rating, below about −5 °C.
- **Set by:** [S1 ledger R-30][ledger].
- **Amended by:** [R-53](#r-53) (the exception's onset).

### R-31

**Codec local reset.**
- **Date:** 2026-10-06.
- **Current:** U_CRST is the TLV803EA29DBZR; R_CRST is 4.70 kΩ from CODEC_RST_N to 3V3_CODEC; v1's R_RST_PD stays not fitted, because fitted it would put RST across VIH.
- **Set by:** [S1 ledger R-31][ledger].
- **Amended by:** the ledger's "R-31 and R-32 amendment" (S1 Task 15 fix round 1, review I-3, R_CRST 4.70 kΩ); [R-40](#r-40); [R-53](#r-53).

*Not in force:* R_CRST 10.0 kΩ, and the catalog's TLV803EA30 for this reset.

### R-32

**5V_A with the codec domain: the 18 V survival claim.**
- **Date:** 2026-10-06.
- **Decides:** the TPS7A49's 18 V survival junction claim is evaluated to the platform's thermal envelope ([R-20](#r-20)): Tj ≤ 125 °C holds to 74.1 °C ambient and Tj ≤ 115 °C to 64.1 °C, both above the 57 °C envelope, so no operating condition is removed. Options are listed if the envelope ever rises.
- **Set by:** [S1 ledger R-32][ledger].
- **Amended by:** the ledger's "R-31 and R-32 amendment" (0.803 W, 74.1 °C and 64.1 °C).

### R-33

**A comparator-only ideal diode does not meet R-PF-7.**
- **Date:** 2026-10-06.
- **Status:** superseded in effect by the owner's [R-34](#r-34): with R-PF-7 at 9.00 V every candidate passes, and no ideal diode is used.
- **Set by:** [S1 ledger R-33][ledger].

### R-35

**Realisation and reservoir.**
- **Date:** 2026-10-06.
- **Decides:** one PMEG4030ER per branch (D_AIN to VIN_A, D_MIN to the module branch). VIN_A's reservoir is four 100 µF 35 V aluminium cans (C_BULK to C_BULK4) with the X7R parts already on VIN_A.
- **Set by:** [S1 ledger R-35][ledger].
- **Amended by:** [R-40](#r-40) (the fourth can).

*Not in force:* three cans (C_BULK to C_BULK3), before R-40.

### R-36

**Sense point, divider and VIN bleeder.**
- **Date:** 2026-10-06.
- **Decides:** U_PF (TPS3808G01) senses VIN at the jack, upstream of both branch elements, through a 0.1 % divider; R_VBLD 10.0 kΩ 1206 defines VIN's fall after a plug pull. The trip is 7.799–8.159 V falling and the release at most 8.404 V.
- **Set by:** [S1 ledger R-36][ledger].
- **Amended by:** [R-40](#r-40) (the top resistor splits into R_PFT1 13.0 kΩ and R_PFT2 174 kΩ with D_PFCL for reverse 18 V); [R-58](#r-58) (the bounds with ISENSE).

### R-37

**RESET fan-out.**
- **Date:** 2026-10-06.
- **Decides:** U_PF's open-drain RESET drives only the node PF_OK (pulled up to 5V_A); a Schmitt inverter, U_PFINV, makes PF_TRIP (high when tripped), which drives three AO3400A N-MOSFETs: Q_PFG on the relay gate, Q_PFR on CODEC_RST_N and Q_VDIS on the VIN_MOD discharge. The relay gate and CODEC_RST_N are no longer joined.
- **Set by:** [S1 ledger R-37][ledger].
- **Amended by:** [R-40](#r-40): U_PFINV is the dual SN74LVC2G14, PF_TRIP on channel A and PF_ON on channel B.

### R-38

**Re-engage: the module load switch with a VIN_MOD discharge.**
- **Date:** 2026-10-06.
- **Decides:** Q_MSW between D_MIN and VIN_MOD, on only while U_PF is released; Q_VDIS with R_VDIS discharges VIN_MOD while tripped, so the module always reboots, and boots into bypass.
- **Set by:** [S1 ledger R-38][ledger].
- **Amended by:** [R-40](#r-40) (Q_MSWD driven from PF_ON); [R-41](#r-41) (Q_MSW becomes an AOS AOD4185); [R-42](#r-42) (R_VDIS 10.0 Ω Vishay CRCW201010R0FKEFHP); [R-49](#r-49) (the gate held through the plug-in edge).

*Not in force:* Q_MSW as an AO3401A, and R_VDIS as 22 Ω 1206 and then a 10.0 Ω 1206.

### R-39

**The two hold-up frames and the detection bound.**
- **Date:** 2026-10-06.
- **Decides:** the hold-up is checked in two frames, both at least zero: the plug pull, and the slow fall, which holds for any fall profile and any detection time.
- **Set by:** [S1 ledger R-39][ledger].
- **Amended by:** [R-40](#r-40) (frame 1's basis).

### R-40

**Task 15 fix round 1.**
- **Date:** 2026-10-06.
- **Decides:** a set of rulings on the power-fail review: the fourth reservoir can; the plug-pull basis (the owner's R-34 covers R-PF-7 only); the re-engage delay td from C_PFCT 47 nF C0G on U_PF's CT (154–395 ms with the device spread, inside firmware's 2.5 s bypass hold); the reverse-18 V divider split and clamp; R_CRST 4.70 kΩ; the dual inverter; and further items in the entry.
- **Set by:** [S1 ledger R-40][ledger].
- **Amended by:** [R-41](#r-41) supersedes its R_VDIS discharge bound (R-PF-10), which started from the trip maximum rather than VIN_MOD's 18 V; [R-42](#r-42) and later rulings change R_VDIS's part.

### R-41

**Task 15 fix round 2.**
- **Date:** 2026-10-06.
- **Decides:** 18 V is a survival condition applied continuously, not an operating point, and Q_MSW's switch-on at 18 V is checked as a survival case; Q_MSW becomes an AOS AOD4185 (TO-252); the supply rating is left to the owner, which [R-43](#r-43) settled.
- **Set by:** [S1 ledger R-41][ledger].
- **Amended by:** [R-42](#r-42) supersedes its SOA basis, its 3.9 A carry and its 1206 R_VDIS.

### R-42

**Task 15 fix round 3.**
- **Date:** 2026-10-06.
- **Decides:** the junction-temperature method for Q_MSW's switch-on, and R_VDIS 10.0 Ω Vishay CRCW201010R0FKEFHP (2010).
- **Set by:** [S1 ledger R-42][ledger].
- **Amended by:** [R-45](#r-45), [R-50](#r-50), [R-58](#r-58) (later figures).

### R-44

**3V3_P held off during Q_MSW's ramp.**
- **Date:** 2026-10-06.
- **Current:** U_PRAIL's EN is driven from PF_ON through R_PEN 150 kΩ ±1 %, with C_PEN from EN to GND (two 4.7 µF 50 V X7R in parallel) and R_PENPD 1.00 MΩ; C_PEN is reset by Q_PEN, a Nexperia 2N7002 gated by PF_TRIP, through R_PENS 180 Ω. Every release, cold or after a trip, waits the full delay of at least 230 ms, which clears the slowest switch-on ramp. 3V3_P starts about 0.1 s later at boot, inside firmware's 2.5 s bypass hold.
- **Set by:** [S1 ledger R-44][ledger].
- **Amended by:** [R-45](#r-45) (R_PENS, R_PENPD, C_PEN 4.7 µF); [R-52](#r-52) (R_PENS 180 Ω); [R-58](#r-58) (Q_PEN replaces the diode; C_PEN doubled).

*Not in force:* the diode reset of EN: D_PEN (BAS116H) from EN to PF_ON, with R_PENS 150 Ω in series, which left C_PEN near the threshold after a brownout. R-58 replaced it with Q_PEN.

*Not in force:* C_PEN 2.2 µF, then a single 4.7 µF.

### R-45

**Task 15 fix round 5.**
- **Date:** 2026-10-06.
- **Decides:** the EN network changes (R_PENPD, C_PEN) and the copper and SOA basis for Q_MSW: a module's current model as VIN_MOD rises replaces the flat current carry.
- **Set by:** [S1 ledger R-45][ledger].
- **Amended by:** [R-52](#r-52), [R-58](#r-58).

### R-46

**VIN_MOD's range.**
- **Date:** 2026-10-06.
- **Current:** minimum 7.93 V, maximum 12.6 V, survival 18 V (no element drop is taken for the maximum and survival).
- **Set by:** [S1 ledger R-46][ledger].
- **Amended by:** [R-58](#r-58) (the D_MIN drop from Table 7 log-interpolated; `minV` 7.93 V).

*Not in force:* minimum 7.94 V, before R-58.

### R-47

**The module's EN/UVLO divider.**
- **Date:** 2026-10-06.
- **Decides:** R_UV1 18.0 kΩ and R_UV2 4.30 kΩ ±1 %: start 5.58–6.75 V, stop at least 5.50 V. It implements [D24](#d24).
- **Set by:** [S1 ledger R-47][ledger].

### R-48

**The module's input network.**
- **Date:** 2026-10-06.
- **Decides:** the module carries `POWER.md` §1's buck input branch unchanged, with no extra bulk.
- **Set by:** [S1 ledger R-48][ledger].

### R-49

**Q_MSW's gate held through the plug-in edge.**
- **Date:** 2026-10-06 (a controller-delegated EE ruling).
- **Decides:** C_GS 220 nF from Q_MSW's source through D_GS (BAS116H), with R_GSB 470 kΩ across C_GS, holds the switch off at a plug-in from rest; otherwise the module is bounded by the hot-plug figure. Bring-up adds a fast re-plug and a contact-bounce case.
- **Set by:** [S1 ledger R-49][ledger].
- **Amended by:** its Task 16 fix round 1 (values); [R-59](#r-59) (the hot-plug figure).

*Not in force:* C_GS 100 nF and R_GSB 1.00 MΩ, before the fix round.

### R-50

**Q_MSW's SOA carry, the retry pour and the Seed.**
- **Date:** 2026-10-06.
- **Decides:** the carry is closed on the junction temperature with the module's real start-up (governing figure 123.7 °C at 18 V since [R-58](#r-58)); the module's whole 3V3 capacitance is at most 150 µF, an S2 module requirement; the S2 pour gives RθJA ≤ 95 °C/W on 1 oz. A Seed's switch-on cannot be bounded from published data, so **Seed benches run from a 9 V supply** until bring-up measures a Seed's VIN current and capacitance through the switch-on. This narrows [O-15](#o-15), itself a controller ruling.
- **Set by:** [S1 ledger R-50][ledger].
- **Amended by:** [R-58](#r-58) ("R-50's 9 V benches stand"); [R-59](#r-59).

### R-51

**VIN_MOD's permitted ripple.**
- **Date:** 2026-10-06.
- **Decides:** 40.4 mV p-p, 1.5 × what the carrier presents at 450–550 kHz.
- **Set by:** [S1 ledger R-51][ledger].

### R-52

**R_PENS 180 Ω.**
- **Date:** 2026-10-06.
- **Decides:** R_PENS is 180 Ω.
- **Set by:** [S1 ledger R-52][ledger].
- **Amended by:** [R-58](#r-58) supersedes its re-release analysis; R_PENS now sits in Q_PEN's drain.

*Not in force:* R-52's re-release delay of at least 32.7 ms after a trip, refuted by R-58 (18.4 ms with EN's pull-up and the diode's real forward voltage).

### R-53

**Task 17 section C fixes.**
- **Date:** 2026-10-06.
- **Decides:** R_MGP 160 Ω ±1 % 1206 at Q_MIDI's 85 °C threshold; the 3.45 µF CIN figure stands as an allowance; the PCM3060's 12 mA IDD is an allowance taken to 85 °C; R-30's exception onset is corrected; R_RST_PD stays not fitted; text corrections. The underlying `task-17-rulings.md` was never committed to the pedals repository; this ledger entry is the record.
- **Set by:** [S1 ledger R-53][ledger].

### R-54

**The module header: Preci-Dip's own.**
- **Date:** 2026-10-06.
- **Status:** its part choice is superseded by [R-61](#r-61), whose fallback pair it remains. Its reason, that the maker of the socket stands behind the mate, carries into R-61.
- **Set by:** [S1 ledger R-54][ledger].

### R-55

**Section A mechanical rules.**
- **Date:** 2026-10-06.
- **Current:** the footswitch lid hole is Ø13.4 (ISO 273 fine-series M12 clearance 13.0 plus 0.4 powder coat), with an ISO 7089 M12 washer under the outside nut. Both trim rules (leads over the module, socket tails) add IPC J-STD-001's step: reflow each trimmed joint or inspect it for damage from the cut, stated on the PCBWay order page. Rated temperatures cap their claims: the module's PTS645VL switches at 60 °C, the footswitch's Schurter LSH at 70 °C, both above the 57 °C envelope.
- **Set by:** [S1 ledger R-55][ledger].
- **Amended by:** [R-62](#r-62) withdraws its lid relief.

*Not in force:* R-55's lid relief at each ¼ in jack, at least 1.25 mm deep, withdrawn by R-62.

### R-57

**Task 17 section B fixes.**
- **Date:** 2026-10-06.
- **Decides:** one ceramic basis (nominal × 0.9 × 0.85 × 0.5 = 0.3825) for the VDDA bank and C_POSn; the control band 0–421 Hz ([R-15](#r-15)); the hard S2 module requirement **VDDA-WIDEBAND**, f0 ≤ 158.0 kHz (L_min × C_bank,eff ≥ 1.015 µH·µF), with the 806 µV requirement not relaxed; the gate tolerances with series terms ([R-13](#r-13)); the codec's slave timing; the S2 item **VBUS-HOTPLUG** (show PA1 ≤ 3.6 V from a model, or fit C_VBUS 100 nF from PA1 to GND; bring-up scopes PA1 at a USB-C plug-in); and the contract freeze blocker **FB-AN2606** (AN2606 could not be obtained; the contract is not frozen until it is read). The underlying `task-17-rulings.md` was never committed to the pedals repository; this ledger entry is the record.
- **Set by:** [S1 ledger R-57][ledger].

### R-58

**Task 17 section D fixes, power-fail: 3V3_P's EN reset by Q_PEN.**
- **Date:** 2026-10-06.
- **Decides:** Q_PEN (Nexperia 2N7002, gate on PF_TRIP, source GND, drain through R_PENS 180 Ω to U_PRAIL's EN) replaces the diode reset, and C_PEN becomes two 4.7 µF 50 V X7R in parallel, so every release waits at least 230 ms ([R-44](#r-44)). It restates the bounds behind the switch-on: trip 7.799–8.159 V, release at most 8.404 V; Q_MSW's governing figure 123.7 °C at 18 V; `minV` 7.93 V; `maxPeakCurrentMa` 674 mA. A Seed at 9.45 V would reach 137.7 °C in its switch-on path, so R-50's 9 V benches stand. The underlying `task-17-rulings.md` was never committed to the pedals repository; this ledger entry is the record.
- **Set by:** [S1 ledger R-58][ledger].

### R-59

**Task 17 section D fixes, VIN_MOD: re-plug, pin-39 hot plug, and the 9 V Seed bench.**
- **Date:** 2026-10-06.
- **Decides:** `vinMod.hotPlugPeakV` is 26.3 V at pin 39, and pin-39 parts are rated against it; a re-plug inside the re-engage delay keeps Q_MSW at or under 129.4 °C and R_VDIS inside its pulse rating; at a 9.45 V bench supply the hot-plug bound on VIN_MOD is 13.56 V, 3.4 V under a Seed's 17 V, which supports [O-15](#o-15) as narrowed to 9 V.
- **Set by:** [S1 ledger R-59][ledger].

*Not in force:* `vinMod.hotPlugPeakV` 25.8 V, before R-59.

### R-60

**The module's USB-C: a vertical receptacle facing the back plate.**
- **Date:** 2026-10-06.
- **Decides:** J_USB_MOD is the HRO TYPE-C-31-E-17, a vertical 16-pin USB Type-C receptacle on the module's component face, its mouth toward the back plate, with 5.1 kΩ Rd on CC1 and CC2. A straight plug enters with the back plate off. [O-11](#o-11) stands. S2 module requirement USB-DFU-VERTICAL carries the land pattern and footprint work. The underlying `task-17-research-A.md` was never committed to the pedals repository; this ledger entry is the record.
- **Set by:** [S1 ledger R-60][ledger].

*Not in force:* the right-angle HCTL HC-TYPE-C-16P-01A, whose mouth faced J_OUT_R 9.2 mm away in layout B.

### R-61

**The module socket and header: Mill-Max's own pair.**
- **Date:** 2026-10-06.
- **Decides:** socket Mill-Max 801-43-020-10-012000; header Mill-Max 800-10-020-10-002000, cut to 20 from the stocked 800-10-064-10-002000. Fallback: the Preci-Dip pair, socket 801-87-020-10-012101 with its header cut to 20 from 800-10-064-10-002101. Stack height 15.17 mm and `maxHeightBottomMm` 4.97 mm unchanged. Before the contract freeze, Mill-Max confirms that cutting is acceptable and the 20-way's lead time. The underlying `task-17-research-A.md` was never committed to the pedals repository; this ledger entry is the record.
- **Set by:** [S1 ledger R-61][ledger].

### R-62

**The enclosure: the owner-measured reference box.**
- **Date:** 2026-10-06 (a controller ruling on the owner's measurements, [F-5](#f-5)).
- **Decides:** design to the measured box, taken to be the owner's preferred supplier's (Tayda) 1590BB-style box. Below the top panel's inner face: rim 30.0 mm; the lid lip's top 28.0 mm; the lid's inner face inside the lip 31.0 mm. The lip is assumed within 4 mm of the inside wall (not measured). Plan sizes stay Hammond's. Room under the board: 18.7 mm at the centre, 15.7 mm over the lip band, 17.7 mm to the rim. The ¼ in jacks clear the lip by 0.03 mm nominal, accepted on the owner's working reference pedal plus a first-build check. No contract value is loosened. The NMJ6HCD2 jacks and layout B stay. First-build check: the ordered box matches the reference.
- **Set by:** [S1 ledger R-62][ledger].

*Not in force:* the room under the board from Hammond's drawing (29.75 mm inside height, 17.45 mm under the board), and R-55's lid relief.

## What this document does not carry

- **Generator-only rulings.** S1 ledger R-3 (hermetic `kicad-cli` gates and the v1 manifest), R-4 (the gate-9 role model) and R-7 (which gates apply to the carrier). Every entry of [the A1 rulings][a1], which are about the pedals generator; its one ruling touching an owner approval, that gate 8 accepts deltas `CORE-BRIEF.md` §4 declares with owner approval, is a generator rule, and the approvals themselves are [D14](#d14) to [D19](#d19). The unnumbered controller rulings in [the A2 rulings][a2]. `OWNER-DEFAULTS.md` ALL-07 (an ERC exclusion for a stock KiCad symbol on v1). The gate clauses of [O-8](#o-8), [RR-5](#rr-5), [RR-9](#rr-9) and [RR-10](#rr-10), and split spec §10.
- **Superseded owner decisions** appear only on *Not in force:* lines beside the decision that replaced them.

[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
[plat]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-09-30-h7-pedal-platform-design.md
[ledger]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-05-h7-split-rulings.md
[own]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/OWNER-DEFAULTS.md
[cb]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/CORE-BRIEF.md
[a1]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-03-h7-schgen-a1-rulings.md
[a2]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-03-h7-schgen-a2-rulings.md
[analog]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/ANALOG.md
[power]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/POWER.md
[bypass]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/BYPASS-RELAY.md
[checklist]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/SCHEMATIC-CHECKLIST.md
