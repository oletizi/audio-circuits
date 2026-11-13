# h7-platform decisions

Ported from:
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §2, §2.1, §5.1.1, §5.1.2, §9.1, §9.2, §9.4, §15
- [2026-09-30-h7-pedal-platform-design.md][plat] (the original platform spec): *Architecture decisions*, *Power*, *Open items*
- [2026-10-05-h7-split-rulings.md][ledger] (the S1 rulings ledger): R-1 to R-62
- [h7-platform/OWNER-DEFAULTS.md][own]: OWN-01 to OWN-07, D14 to D19
- [h7-platform/CORE-BRIEF.md][cb] §4: D1 to D19 (the file stops at D19 at the pinned commit)
- [2026-10-03-h7-schgen-a2-rulings.md][a2] and [2026-10-03-h7-schgen-a1-rulings.md][a1]: owner-decision entries about the circuit, the two A2 controller rulings still live in the design notes (the chassis bond and the expression ring's DC limit), the A2 ruling on how Task 1's OWN items were decided, and the A1 ruling on gate 8's deltas
- [2026-10-03-h7-schematic-generator-design.md][gen] (the generator spec): gate 8, as evidence on how D1 to D13 were treated
- [h7-platform/ANALOG.md][analog] "Owner decisions (resolved)" and §8.2 (the ring limit); [h7-platform/POWER.md][power] "Owner decision: MCU junction temperature", §4 and §4.4 (no input TVS) and §7.2 (the chassis bond); [h7-platform/BYPASS-RELAY.md][bypass] status, owner decision and §11 item 2; [h7-platform/SCHEMATIC-CHECKLIST.md][checklist] OWN-02 to OWN-07

This is the record of every live owner decision, owner-supplied fact and controller ruling about the STM32H743 digital pedal platform (h7-platform), as they stood in the pedals repository at commit `5b926d0`. Every link here points at that commit, so it keeps resolving after the pedals repository is archived. The topic documents beside this one (architecture, power, analog, bypass relay, processor and memory, mechanical and controls) carry the analyses and values in full; an entry here says what was decided, by whom, and what changed it since.

Every figure quoted here comes from a paper analysis of a board that has not been built.

## How to read this document

**Labels.** An entry is an **owner decision** only where the source says so. In the S1 ledger that is an entry titled "Owner decision" (R-34, R-43) or one quoting his answer under "Owner decision, quoted" (R-56). In the split spec it is O-1 to O-18, except O-15, which the split spec records as a controller ruling despite its number. In the older design notes it is a passage that says the owner decided or approved it. **Owner-supplied facts** are his measurements and statements of fact, carried apart from the rulings built on them. Everything else is a **controller ruling, which the owner may override**. An entry that says "confirmed" without naming who confirmed it is carried as a controller ruling, and the ambiguity is stated beside it.

**Precedence** (the port spec's "How amendments resolve"). Authority first, then date. An owner decision is superseded only by a later owner decision. A controller ruling never supersedes an owner decision: where one narrows an owner decision, it is carried as a narrowing the owner may override and linked from the decision. Among rulings and analyses, the later dated text supersedes what it names. Where the sources cannot settle a disagreement, it is a `### Conflict:` entry in [open-items.md](open-items.md), and this document picks neither side.

**Effective constraints.** Each entry states the value in force once, with **Set by** and **Amended by** links. A value that is no longer in force appears only on a line that begins *Not in force:*. Where a controller ruling narrows an owner decision, the owner decision says so on a **Narrowed by** line.

**Figures.** A figure quoted here from an analysis is a summary. The entry's **Derived in** line links the section of a topic document that carries the figure's inputs, its method and its pinned source; read the figure there. A **Carried in** line links where a decision with no figure of its own is carried into the design.

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
| Older owner decisions on the platform (no number of their own in the source) | `### PS-18V`, `### PW-TJ`, `### PW-NOTVS`, `### AN-D1`, `### AN-D2` | `#ps-18v`, `#pw-tj`, `#pw-notvs`, `#an-d1`, `#an-d2` | `decisions.md#an-d1` |
| Older controller rulings on the platform still in force (no number of their own in the source) | `### PW-CHASSIS`, `### AN-RING` | `#pw-chassis`, `#an-ring` | `decisions.md#pw-chassis` |
| Owner-supplied fact (numbered by this document) | `### F-n` | `#f-n` | `decisions.md#f-5` |
| Phase-2 controller ruling of this repository on the bring-up carrier (no source in the pedals repository) | `### CR-CARRIER-<topic>` | `#cr-carrier-<topic>` | `decisions.md#cr-carrier-dummy-loads` |

`AN-D1` and `AN-D2` are `ANALOG.md`'s own owner-decision numbers D1 and D2. They are prefixed here because CORE-BRIEF's deltas D1 and D2 are different things. `PW-NOTVS`, `PW-CHASSIS` and `AN-RING` are this document's names: the prefix says which design note records the entry (`POWER.md` or `ANALOG.md`). Q-6 and Q-7 are under [RR-11](#rr-11). The ledger's unnumbered "R-31 and R-32 amendment" is folded into [R-31](#r-31) and [R-32](#r-32).

## Owner decisions

### O-1

**A processor module on the Daisy Seed pinout and an audio pedal board.**
- **Date:** 2026-10-05.
- **Decides:** split the platform into a core processor module on the Daisy Seed 40-pin pinout (2 × 20, 2.54 mm, rows 15.24 mm apart) and an audio pedal board. Development uses a real Seed or Seed3; production uses our own H743 module, with no Electrosmith dependency.
- **Set by:** [split spec §2][split].
- **Amended by:** [O-16](#o-16) (owner) names the accepted development substitutes: the original Daisy Seed (Rev5 or Rev7, STM32H750IB, same pinout) or the Seed3, and development starts on an original Seed.
- **Narrowed by:** [RR-4](#rr-4) (controller ruling; the owner may override) states what a Seed is: a development substitute compatible with the signal contract and the documented development load envelope, with listed exceptions.

### O-2

**The codec is on the audio board, as clock master; SAI2 crosses the interface.**
- **Date:** 2026-10-05.
- **Decides:** the codec is on the audio board, joined to the module over digital audio on SAI2: SCK PA2, FS PG9, SD-in PA0, SD-out PD11. The PCM3060 is clock master in hardware mode (IFMD high: "Master (256 fS) mode for ADC, slave mode for DAC", TI SLAS533B), BCK fixed at 64 fS, clocks tied, driven by a 12.288 MHz packaged oscillator on the audio board. The STM32 SAI is slave. MCLK is not on the interface. Codec I²C crosses the interface if pins allow. TDM capability is noted for future multichannel audio boards.
- **Set by:** [split spec §2][split]; implemented by [D20](#d20).
- **Amended by:** none (no later owner decision); [D20](#d20) (owner-approved) implements it.
- **Narrowed by:** [RR-6](#rr-6) and [RR-11](#rr-11) (controller ruling; the owner may override) settle "if pins allow": the codec's I²C reaches the I²C expansion bus (PB8/PB9) through not-fitted links on this audio board. [R-29](#r-29) (controller ruling; the owner may override) chooses the oscillator. [R-9](#r-9) (controller ruling; the owner may override) fixes the SAI clock-edge setting firmware must use.
- **Carried in:** [analog.md §13.1](analog.md#131-what-it-is); [firmware-facing-requirements.md EC-SAI2-SLAVE](firmware-facing-requirements.md#ec-sai2-slave); [processor-and-memory.md EC-CLOCK-TREE](processor-and-memory.md#ec-clock-tree).

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
- **Amended by:** [O-11](#o-11) (owner) added the USB socket.
- **Narrowed by:** [RR-1](#rr-1) and [RR-3](#rr-3) (controller ruling; the owner may override) narrow "3.3 V out": pin 38 is a low-current logic supply and pin 21 is the ADC reference, and neither powers relay coils or LEDs. [R-60](#r-60) (controller ruling; the owner may override) makes the module's USB socket a vertical USB-C receptacle.
- **Carried in:** [processor-and-memory.md EC-SDRAM-CLASS](processor-and-memory.md#ec-sdram-class) and [§2](processor-and-memory.md#2-what-the-module-carries); [firmware-facing-requirements.md §2](firmware-facing-requirements.md#2-memory-32-mb-of-sdram-on-every-board).

### O-5

**Audio board contents.**
- **Date:** 2026-10-05.
- **Decides:** DC jack and protection, 5V_A, VMID, codec and oscillator, input and output stages, bypass relays, the panel controls, footswitches, LEDs, expression, MIDI, and USB-C wired to the Seed's external USB pins.
- **Set by:** [split spec §2][split].
- **Amended by:** [O-17](#o-17) (owner): the three toggles become three momentary soft buttons. [O-18](#o-18) (owner): the pots and buttons become six configurable control positions.
- **Narrowed by:** [RR-3](#rr-3) (controller ruling; the owner may override): relay-coil and LED power are on the pedal board, from the pedal digital rail, which [R-25](#r-25) (controller ruling; the owner may override) makes 3V3_P.

*Not in force:* "pots, toggles" as separate panel controls (O-5 as first written), replaced by O-17 and then O-18.

### O-6

**A hold-up replacement for the bypass relays' power-off timing.**
- **Date:** 2026-10-05.
- **Decides:** the bypass-relay power-off timing used to shed the buck, which now sits inside the module with no EN pin on the Seed pinout. A replacement must hold the analog rail steady while the relays release. The recommended direction is a diode-isolated hold-up reservoir feeding the analog supply; final values are re-analysed in the plan.
- **Set by:** [split spec §2][split], §7.4.
- **Amended by:** the owner's own [R-34](#r-34) (the R-PF-7 basis) and [R-43](#r-43) (the supply rating), within which it is realised.
- **Narrowed by:** [R-33](#r-33), [R-35](#r-35) to [R-42](#r-42), [R-44](#r-44), [R-45](#r-45) and [R-58](#r-58) (controller ruling; the owner may override), which realise it, with the owner decisions [R-34](#r-34) and [R-43](#r-43) between them.
- **Carried in:** [bypass-relay.md EC-POWER-FAIL-OVERRIDE](bypass-relay.md#ec-power-fail-override) and [§4](bypass-relay.md#4-power-fail); [power.md §3](power.md#3-pedal-power-entry-the-isolated-held-up-analog-branch).

*Not in force:* the owner's approval of the v1 power-fail shed (2026-10-04), an owner decision carried in the same note as [OWN-01](#own-01): the power-fail supervisor pulled the one-board v1 design's buck EN low so the relays released before the output stage moved. Its record is `BYPASS-RELAY.md`'s status line, "approved by the owner on 2026-10-04 and implemented", answering its §11 item 2, "Approve the power-fail shed". This later owner decision superseded it: split spec §9.1's row "Relay bypass (2026-10-04) and the power-fail shed (`BR` §11 item 2)" reads "The approved shed is replaced by §7.4, which the owner directed (O-6)".

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
- **Amended by:** none after the owner's reopening.
- **Narrowed by:** [R-5](#r-5) (controller ruling; the owner may override) implements the two parts.
- **Not carried:** the clause giving each design "its own full gates" (gate 8 over the OSCAR subcircuits, and so on) is about the pedals schematic generator and stayed behind with it.

*Not in force:* "one 40-pin connector part" and the quantity-2 footprint-field workaround, withdrawn by the owner's reopening of O-8.

### O-9

**Testing: audio board first with a real Seed, our module on a bring-up carrier.**
- **Date:** 2026-10-05.
- **Decides:** the audio board is tested first with a real Seed; our module is tested on a minimal bring-up carrier (40-pin breakout, codec loopback, test pads) or by swapping it into a working audio board; there is one firmware pin header, generated from the contract.
- **Set by:** [split spec §2][split].
- **Amended by:** [O-13](#o-13) (owner) makes the carrier a scoped deliverable and puts first power on it (split spec §12.4, §13.1). [O-16](#o-16) (owner): development starts on an original Seed, which the owner has, because the Seed3 is out of stock (a research finding, not his statement; see O-16).

*Not in force:* "with a real Seed3" as the first audio-board test (O-9 as first written), replaced by O-16's accepted substitutes.

### O-10

**Order of work.**
- **Date:** 2026-10-05.
- **Decides:** the interface spec and contract first, then splitting the design into two boards, then audio board layout, then module layout. The contract is drafted, populated by analysis and only then frozen.
- **Set by:** [split spec §2][split].
- **Amended by:** [O-16](#o-16) (owner) withdraws step 1, the Seed3 bench characterisation. The contract was never frozen in the pedals repository (its `status` is still `draft`). Then the owner's direction of 2026-11-10 in this repository (`docs/known-gaps.md` G311): the order of work is the controller's, chosen to put drawn pages in front of him soonest, so the boards are drawn against the draft contract while the freeze proceeds alongside, and a page the freeze changes is redrawn.
- **Narrowed by:** [RR-10](#rr-10) (controller ruling; the owner may override) refines it into the split spec's ten steps (§13).
- **Not carried:** "re-run every gate" (after the split) names the pedals generator's gates, which stayed behind with it; and "Sub-project B (layout tooling) comes before both layouts" names the pedals repository's own layout tooling, which stays behind. In this repository the phases are the port spec's (models, schematics, then layout and fabrication).

### O-11

**End-user firmware update over the pedal's USB-C; ROM DFU on the module's own socket.**
- **Date:** 2026-10-05.
- **Decides:** end-user firmware update uses a bootloader in flash, run over the pedal's USB-C on the Seed USB pins 36/37. The STM32 ROM DFU stays available on the module's own USB socket for bench recovery of a bricked unit. The module and the firmware contract must leave room for the bootloader in flash, and USB on pins 36/37 must be enumerable from the bootloader.
- **Set by:** [split spec §2][split], §6.4, §11, §15 Q-1.
- **Amended by:** none (no later owner decision).
- **Narrowed by:** [RR-11](#rr-11) (controller ruling, Q-7; the owner may override): end users enter the bootloader by holding both footswitches at power-up, or by a USB command from the running application. [R-14](#r-14) (controller ruling; the owner may override) puts a USB isolation switch between pins 36/37 and the pedal's USB-C; with a Seed fitted, DFU through the Daisy bootloader over the pedal's USB-C is lost (the Seed's own USB still works). [R-60](#r-60) (controller ruling; the owner may override): the module's own socket is a vertical USB-C receptacle, and "Owner decision O-11 stands".
- **Carried in:** [firmware-facing-requirements.md §3.1](firmware-facing-requirements.md#31-our-module-a-bootloader-in-flash-ahead-of-the-application); [processor-and-memory.md §8](processor-and-memory.md#8-reset-boot-debug-and-the-modules-usb-socket).

### O-12

**The module is socketed.**
- **Date:** 2026-10-05.
- **Decides:** female headers on the audio board, so a Seed or our module plugs in and out. The enclosure must allow the stacking height. The module's BOOT/RESET buttons need not be reachable in a finished pedal.
- **Set by:** [split spec §2][split], §5.1, §15 Q-2.
- **Amended by:** [O-17](#o-17) (owner): the sockets sit on the audio board's underside, and the module is reachable with the back plate off.
- **Narrowed by:** [RR-8](#rr-8) (controller ruling; the owner may override): the module envelope and stack height are fixed by a mechanical study and frozen with the contract before audio-board layout; layout confirms them and may not change them. The socket and header parts are controller choices, last set by [R-61](#r-61) (controller ruling; the owner may override): socket Mill-Max 801-43-020-10-012000, header Mill-Max 800-10-020-10-002000 cut to 20 from the stocked 800-10-064-10-002000, the Preci-Dip pair as fallback. Stack height 15.17 mm.
- **Derived in:** [mechanical-and-controls.md FIG-STACK-HEIGHT](mechanical-and-controls.md#fig-stack-height) (the 15.17 mm); [EC-MODULE-MOUNTING](mechanical-and-controls.md#ec-module-mounting) and [EC-SOCKET-AND-HEADER](mechanical-and-controls.md#ec-socket-and-header).

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
- **Amended by:** none.
- **Narrowed by:** [R-50](#r-50) (controller ruling, via [O-15](#o-15); the owner may override). O-16 says O-15's development bench limit "applies to every revision"; that is a cross-reference to O-15, a controller ruling, and the limit it refers to is O-15 as narrowed by R-50 to 9 V (the port spec's "How amendments resolve", rule 1).
- **Facts behind it:** the owner's fact is [F-4](#f-4), that he has original Seeds. That the Seed3 is out of stock is research, not his statement: split spec §9.2 lists the Seed3 stand-ins as "single source, out of stock per the research, V", and §14 risk R-9 as "single source, sold out at the time of the research (V)".

*Not in force:* O-16's words for the limit it cross-references, "the 9–12 V development limit (O-15)"; the limit now in force is 9 V ([O-15](#o-15)).

### O-17

**Mechanical baseline: the reference commercial digital pedal's layout.**
- **Date:** 2026-10-05.
- **Owner:** "They use soft switches for the foot switches as well, which gives them a LOT more room on the back side because the board sits much closer to the top of the enclosure—by my measurement, about 10mm of loft from the board to the shoulder of the potentiometers." Then: "The footswitch soft-switches are on little standoff boards, which is a concession they make for the depth of the foot switch extensions". On the toggles, from his earlier decision: "Use a soft switch mounted on the board with a push button extension.... that way, we can program its function". On production mounting: "don't over-constrain what a 'production' version will look like yet."
- **Owner, choosing the parts (2026-10-05):** the footswitch actuator: "this is the stomp switch actuator: https://www.taydaelectronics.com/momentary-pcb-spring-switch.html" (DAIER PBS-24-MP). On the switch under the spring: "the board switch under the spring stomp actuators should be a tactile switch… why would those be hard to source?" and "the switch is actuated by a spring. The whole point of the spring is to offer forgiving compliance that translates a hard foot stomp to a gentle button press". The soft buttons: "lets start with the simple option A" (HCTL TC-6610-17-100G).
- **Decides:** a Hammond 1590BB in landscape; the audio board's top face about 10.7 mm below the lid's inner face (the owner's measurement of the reference pedal: "about 10mm of loft from the board to the shoulder of the potentiometers", [F-1](#f-1)); soft footswitches, each a DAIER PBS-24-MP spring actuator in the lid pressing a tactile switch on a small standoff board hung under the audio board; every jack, the bypass relays and the socketed module on the underside, reachable with the back plate off. Production mounting is deferred until a working board exists.
- **Set by:** [split spec §2, §5.1.1][split].
- **Not the owner's:** the pot part. The split spec's summary line gives the board height as "about 10.7 mm below the lid's inner face (short-shaft RV16AF-41 pots)", in parentheses, and the envelope study sizes the 10.7 mm from the Alpha RV16AF-41's catalogue depth (`envelope.md` Owner inputs and §0); none of the owner's recorded words names the pot. The short-shaft Alpha RV16AF-41 is a controller part choice under this decision ([parts.md](parts.md) §5).
- **Amended by:** [O-18](#o-18) (owner) replaces the three separate buttons with six configurable positions. [R-56](#r-56) (owner decision, with the controller's realisation) replaces the tactile switch under the spring with a Schurter LSH in two builds. The owner's measurements quoted above are also [F-1](#f-1) to [F-3](#f-3).
- **Narrowed by:** [R-62](#r-62) (controller ruling on the owner's measurements [F-5](#f-5); the owner may override) re-bases the enclosure depths on the owner-measured box; plan sizes stay Hammond's. [R-55](#r-55) (controller ruling; the owner may override) sets the footswitch lid hole at Ø13.4 with an M12 washer under the outside nut. [R-60](#r-60) and [R-61](#r-61) (controller ruling; the owner may override) set the module's USB socket and the socket and header pair under the board.
- **Derived in:** [mechanical-and-controls.md EC-BOARD-HEIGHT](mechanical-and-controls.md#ec-board-height) (the 10.7 mm); [EC-ENCLOSURE](mechanical-and-controls.md#ec-enclosure), [EC-FOOTSWITCH](mechanical-and-controls.md#ec-footswitch), [§5.4](mechanical-and-controls.md#54-clearances-attachment-and-connection) (the Ø13.4 lid hole) and [EC-PRODUCTION-MOUNTING](mechanical-and-controls.md#ec-production-mounting).

*Not in force:* the owner's decision of 2026-10-04 (A2 rulings) "footswitch = a PCB-mount momentary with a complete manufacturer PCB drawing", superseded by O-17's soft footswitches.

*Not in force:* the C&K PTS645SM43SMTR92 LFS tactile switch on two 4 mm M3 spacers with a 1.00 mm rest gap, and the Ø12.4 lid hole, replaced by R-56 and R-55.

### O-18

**Six configurable control positions, in layout B.**
- **Date:** 2026-10-05.
- **Owner:** asked whether the three buttons should go where they fit or in a neat row: "B. The controls are the user interface—they have to seem natural". Then: "Another approach is to have a bank of six swappable controls so we can spec any combination of 6 knobs and/or switches in the main control cluster, tailored for the given effect to be loaded into the firmware and the enclosure art." Approved: "yes, proceed". On the layout candidates: "I prefer B".
- **Decides:** the main control cluster is six positions, each fitted per effect with either a pot or a tactile button (the split spec annotates the pot as RV16AF-41, a controller part choice from the envelope study, and the button as the HCTL TC-6610-17-100G the owner chose under [O-17](#o-17)); firmware configures each position; lid drilling and art are per effect; the two footswitches stay fixed; the three separate buttons are removed. Layout B is an even 2 × 3 grid with the LEDs between the footswitches. Its two binding rules: the module's connector-face parts stand at most 4.97 mm (`moduleEnvelope.maxHeightBottomMm`), and every pot, button and LED lead within the module outline is trimmed to at most 1.4 mm below the audio board after soldering. [layout-B.svg](layout-B.svg) is the record of layout B, the layout the owner chose. It is not the exact file he chose from: that was `candidate-B.svg` at pedals commit `b0e69c8`, which a pedals script regenerated as `layout-B.svg`, last at `753d63e`, before R-60, R-61 and R-62, each of which leaves layout B unchanged. Every control, footswitch, LED, jack and relay position is the one he saw; the title, the module outline, the socket bodies and the hung boards' size changed ([mechanical-and-controls.md §4.3](mechanical-and-controls.md#43-the-layout-b-picture)).
- **Set by:** [split spec §2, §5.1.2][split].
- **Amended by:** none (no later owner decision).
- **Narrowed by:** [R-54](#r-54) and [R-61](#r-61) (controller ruling; the owner may override) set the 4.97 mm figure through the socket and header choice. [R-55](#r-55) (controller ruling; the owner may override) adds that each trimmed joint is reflowed or inspected (IPC J-STD-001), and that the socket tails are trimmed to at most 0.6 mm above the board. [R-8](#r-8) (controller ruling; the owner may override) records the contract change: pins 22–27 carry POS1–POS6 and the freed toggle pins become spares.
- **Derived in:** [mechanical-and-controls.md EC-LEAD-TRIM](mechanical-and-controls.md#ec-lead-trim) and [FIG-STACK-HEIGHT](mechanical-and-controls.md#fig-stack-height) (the 4.97 mm and 1.4 mm rules), [FIG-SOCKET-TAILS](mechanical-and-controls.md#fig-socket-tails) (the 0.6 mm), [EC-CONTROL-POSITIONS](mechanical-and-controls.md#ec-control-positions) and [EC-LAYOUT-B](mechanical-and-controls.md#ec-layout-b).

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
- **Amended by:** split spec §9.4: kept, on the module.
- **Narrowed by:** [R-57](#r-57) (controller ruling; the owner may override) sets the S2 module requirement VDDA-WIDEBAND on the network this bead is part of (f0 ≤ 158.0 kHz: more VDDA-bank capacitance or a bead with more inductance).
- **Derived in:** [analog.md FIG-VDDA-WIDEBAND](analog.md#fig-vdda-wideband) and [EC-VDDA-WIDEBAND](analog.md#ec-vdda-wideband) (the 158.0 kHz).

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
- **Amended by:** [split spec §9.4][split]: "D19's follower stays on VREF_A".
- **Narrowed by:** [RR-1](#rr-1) (controller ruling; the owner may override) keeps it within VREF_A's contract: "U_EXP stays on it (D19)".

### D20

**The codec as clock master: IFMD to VDD, SCKI from a 12.288 MHz XO.**
- **Date:** approved by the owner 2026-10-05 ([O-14](#o-14)).
- **Decides:** IFMD (pin 27) to VDD, and SCKI1/SCKI2 from a 12.288 MHz XO: the codec is clock master. It implements [O-2](#o-2).
- **Set by:** [split spec §9.4][split]. Never appended to `CORE-BRIEF.md`; this entry is its record.
- **Amended by:** none.
- **Narrowed by:** [R-29](#r-29) (controller ruling; the owner may override) chooses the XO.
- **Carried in:** [firmware-facing-requirements.md EC-SAI2-SLAVE](firmware-facing-requirements.md#ec-sai2-slave); [processor-and-memory.md EC-CLOCK-TREE](processor-and-memory.md#ec-clock-tree); [analog.md §13.1](analog.md#131-what-it-is).

### D21

**Codec RST from a local reset circuit.**
- **Date:** approved by the owner 2026-10-05 ([O-14](#o-14)).
- **Decides:** codec RST comes from a local reset circuit on the audio board instead of the MCU. This is what the owner approved.
- **Set by:** [split spec §9.4][split]. Never appended to `CORE-BRIEF.md`; this entry is its record.
- **Amended by:** none (no later owner decision). It replaces [D4](#d4).
- **Narrowed by:** [RR-11](#rr-11) (controller ruling, Q-6; the owner may override): the power-fail supervisor also asserts RST. Split spec §9.4: "Q-6's ruling (§15) adds that the power-fail supervisor also drives RST; the plan step records that in the delta text". That plan step never ran, so the supervisor clause is the ruling's, not part of the owner-approved delta. [R-31](#r-31) and [R-37](#r-37) (rulings) choose the reset part and the fan-out through Q_PFR.
- **Carried in:** [analog.md EC-CODEC-RESET](analog.md#ec-codec-reset); [firmware-facing-requirements.md §4](firmware-facing-requirements.md#4-audio-the-codec-is-master-sai2-is-slave) (the codec's reset is not firmware's).

### D22

**Codec VDD from a local 3.3 V regulator on 5V_A.**
- **Date:** approved by the owner 2026-10-05 ([O-14](#o-14)).
- **Decides:** codec VDD comes from a local 3.3 V regulator fed from 5V_A, so the codec's VCC-before-VDD sequencing holds without a buck EN.
- **Set by:** [split spec §9.4][split] (and §7.3). Never appended to `CORE-BRIEF.md`; this entry is its record.
- **Amended by:** none.
- **Narrowed by:** [R-30](#r-30) (controller ruling; the owner may override) chooses the regulator and its power-down clamp.
- **Carried in:** [analog.md §13.3](analog.md#133-vdd-regulator-and-the-power-down-clamp-r-30); [power.md §7](power.md#7-5v_a-and-the-analog-branch).

### D23

**SDRAM control pins on PH5, PH3 and PH2.**
- **Date:** approved by the owner 2026-10-05 ([O-14](#o-14)).
- **Decides:** SDNWE, SDNE0 and SDCKE0 are on PH5, PH3 and PH2, freeing PC0 and PC4 for the header.
- **Set by:** [split spec §9.4][split] (and §3). Never appended to `CORE-BRIEF.md`; this entry is its record.
- **Amended by:** none. It replaces [D13](#d13).
- **Carried in:** [processor-and-memory.md EC-SDRAM-CONTROL-PINS](processor-and-memory.md#ec-sdram-control-pins).

### D24

**The module buck's EN from VIN_MOD.**
- **Date:** approved by the owner 2026-10-05 ([O-14](#o-14)).
- **Decides:** the module buck's EN comes from VIN_MOD instead of 5V_A.
- **Set by:** [split spec §9.4][split] (and §6.3). Never appended to `CORE-BRIEF.md`; this entry is its record.
- **Amended by:** none.
- **Narrowed by:** [R-47](#r-47) (controller ruling; the owner may override) sizes the EN/UVLO divider.
- **Carried in:** [power.md §4.1](power.md#41-the-modules-enuvlo-divider).

### R-34

**R-PF-7 at exactly 9.00 V.**
- **Date:** 2026-10-06 (S1 Task 15).
- **Question:** "At what supply voltage must the pedal reach its full 7.62 Vp-p output level without clipping?"
- **Answer:** "Exactly 9.0 V (Recommended)". Option text: "Same basis as your 2026-10-01 full-scale decision. Use the simple diode per supply branch. An adapter running 5% low (~8.55 V) plus cable loss would clip about 0.4 V (≈0.5 dB) sooner at the very loudest peaks. Running from a 12 V supply gives full headroom anyway."
- **Decides:** R-PF-7 is VIN_A at a 9.00 V input, with no adapter tolerance and no cable drop, cold (−20 °C), at least 8.44 V. With the per-branch PMEG4030ER the ledger computes 9.00 − 0.385 = 8.615 V. With a 5 %-low adapter and 0.1 V of cable drop it would be 8.065 V, about 0.44 dB less clip-free level; that case is information, not a requirement.
- **Set by:** [S1 ledger R-34][ledger].
- **Amended by:** none. R-34 supersedes [R-33](#r-33) in effect: no ideal diode is used.
- **Narrowed by:** [R-40](#r-40) (controller ruling; the owner may override) records that R-34 covers R-PF-7 only: the plug-pull hold-up margins keep the brief's basis (supply 5 % low, 0.1 V cable, element cold).
- **Derived in:** [power.md §3.1](power.md#31-the-analog-branch-r-pf-7-and-its-load) (8.615 V, 8.065 V and 0.44 dB); [analog.md FIG-HEADROOM](analog.md#fig-headroom).

### R-43

**The supply rating.**
- **Date:** 2026-10-06 (S1 Task 15 fix round 4).
- **Question:** "What power-supply rating should the pedal promise? …"
- **Answer:** "Design for 1 A, measure (Recommended)". Option text: "Keep the design as is, which is safe on a 1 A supply. Measure real current on the first board, then publish the real figure; it may well come in near 300–500 mA."
- **Decides:** the design is safe and starts on a 1 A supply. Its sufficient condition is a regulated 9 V supply that holds at least 8.55 V at 0.98 A behind 0.185 Ω; steady running draws at most 0.70 A. The published rating follows a bring-up measurement of the steady and peak input current. A weak supply is safe but does not start: the module retries while the pedal sits in bypass with the dry signal passing.
- **Set by:** [S1 ledger R-43][ledger].
- **Amended by:** none (no later owner decision).
- **Narrowed by:** the controller's restatement of 2026-10-06 on the module's real start-up (S1 Task 17 fix D-D-2; the ledger says "the owner decision is not reopened") (controller ruling; the owner may override); [R-50](#r-50) (controller ruling; the owner may override) withdrew an unsourced retry-power figure in it.
- **Derived in:** [power.md §3.5](power.md#35-re-engage-the-module-load-switch-q_msw-r-pf-5) and its *Supply rating* paragraph under [FIG-EN-DELAY](power.md#fig-en-delay) (8.55 V at 0.98 A behind 0.185 Ω); [§4.3](power.md#43-the-switch-on-and-the-9-v-dip).

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
- **Derived in:** [mechanical-and-controls.md EC-FOOTSWITCH](mechanical-and-controls.md#ec-footswitch), [§5.2](mechanical-and-controls.md#52-the-two-lid-stack-ups), [FIG-REST-GAP-WINDOWS](mechanical-and-controls.md#fig-rest-gap-windows), [FIG-FOOTSWITCH-BUILDS](mechanical-and-controls.md#fig-footswitch-builds) (the two builds' heights and shims) and [FIG-FOOTSWITCH-LOAD](mechanical-and-controls.md#fig-footswitch-load) (the 50 N end stop).

*Not in force:* the C&K PTS645SM43SMTR92 LFS switch on 4 mm spacers, which R-56 replaced because it publishes no rating.

### OWN-01

**Relay bypass in place of the output mute.**
- **Date:** 2026-10-04.
- **Decides:** the stereo outputs get a relay that holds the pedal in bypass (each input jack wired straight to its output jack) whenever there is no steady power. Bypass is the mute state. It replaces the solid-state output mute. The footswitches stay momentary, read by the MCU.
- **Set by:** [BYPASS-RELAY.md][bypass] ("Owner decision (2026-10-04)", "approved by the owner on 2026-10-04"); [OWNER-DEFAULTS.md][own] OWN-01 ("Decided by the owner: relay bypass"); [A2 rulings][a2] (where it supersedes the same-day "fit the mute" decision and the early "drop relay"); [platform spec][plat], *Architecture decisions*, "Bypass (amended 2026-10-04)".
- **Amended by:** none to the relay bypass: split spec §9.1, "Relay bypass unchanged".
- **Carried in:** [bypass-relay.md EC-UNPOWERED-BYPASS](bypass-relay.md#ec-unpowered-bypass) and [EC-RELAY-PART](bypass-relay.md#ec-relay-part).

*Not in force:* the solid-state mute and its not-fitted footprints, which this decision replaced.

The owner's 2026-10-04 approval of the power-fail shed, carried in the same note as this decision, is superseded by [O-6](#o-6), and recorded there.

### OWN-03

**ESD diodes at the audio and expression jacks.**
- **Date:** 2026-10-02.
- **Decides:** Nexperia PESD12VL1BA,115 on every audio tip (AIO-21) and on the expression tip and ring (CTL-10). The PESD15VL1BA is recorded as an unfitted option; "PESD12VL1BA stays the fitted part (owner decision)".
- **Set by:** [SCHEMATIC-CHECKLIST.md][checklist] OWN-03 ("Resolved by the owner, 2026-10-02") and AIO-21; [ANALOG.md][analog] §5.7.
- **Amended by:** split spec §9.2: unchanged (pedal board).
- **Carried in:** [analog.md §6.6](analog.md#66-clamping-and-overload).

### PS-18V

**18 V continuous survival, and reverse polarity.**
- **Date:** platform spec, 2026-09-30 (rev 5, owner decisions 2026-10-01).
- **Decides:** the pedal survives 18 V DC continuously, and reverse polarity, without damage. The spec's words: "This is an owner decision: an 18 V pedal supply plugged in by mistake is a continuous condition, not a transient. *Survival is not operation.*" The operating input range is 9 V to 12 V DC (the platform spec's *Power* table).
- **Set by:** [platform spec][plat], *Power*, "Survival".
- **Amended by:** split spec §9.1: unchanged for the production pair (module and audio board).
- **Narrowed by:** [O-15](#o-15) (controller ruling; the owner may override): a development bench with a real Seed fitted has no 18 V survival. [R-32](#r-32) (controller ruling; the owner may override): it holds to 74 °C ambient, above the platform's processor-limited operating envelope ([R-20](#r-20), controller ruling). [R-41](#r-41) (controller ruling; the owner may override) confirms that 18 V is a survival condition, applied continuously, not an operating point.
- **Derived in:** [power.md §8](power.md#8-18-v-survival-by-board) (survival by board) and [§7](power.md#7-5v_a-and-the-analog-branch) (the 74 °C ambient of R-32).

### PW-TJ

**MCU junction temperature at 480 MHz (VOS0).**
- **Date:** 2026-10-01.
- **Decides:** keep 480 MHz at VOS0 and the CORE-BRIEF §5b clock tree, with three requirements that follow: thermal copper under and around the LQFP-176 (an owner layout item); a bring-up measurement of the die temperature from the MCU's internal sensor, in the closed enclosure under a representative DSP load; and a firmware fallback to 400 MHz at VOS1 if the sensor reads 95 °C or more, which needs the VOS1 clock configuration validated first.
- **Set by:** [POWER.md][power], "Owner decision: MCU junction temperature at 480 MHz (VOS0). Resolved by the owner, 2026-10-01".
- **Amended by:** split spec §9.1: unchanged; the thermal copper moves to module layout. Split spec §9.4 revises the CORE-BRIEF §5b clock tree this decision kept: "SAI1 → SAI2, both blocks slave; PLL3's MCLK role ends …; USB on the OTG_HS controller (USB1) using its internal full-speed PHY, with CRS synchronised to USB1 SOF, not USB2". The 480 MHz system clock at VOS0 is not affected ([processor-and-memory.md EC-CLOCK-TREE](processor-and-memory.md#ec-clock-tree)).
- **Narrowed by:** [OWN-06](#own-06) (controller ruling; the owner may override) makes the thermal copper a layout feature, now of module layout.
- **The figures behind it** (`POWER.md`'s owner-decision section, at maximum currents, TJ = 105 °C at VOS0, θJA 43.0 °C/W): the ambient at which the junction reaches 105 °C is 34.7 °C for the used-peripheral build-up with an estimated 30 mA of I/O, 26.1 °C with the full 88.8 mA I/O bound, and 20.4 °C with every peripheral enabled (580 mA). So 34.7 °C is not the worst case. At 400 MHz VOS1, where TJ may reach 125 °C, the ambient may reach 57 °C. The ledger's [R-20](#r-20) states the envelope it evaluates self-heating claims against as "`POWER.md` §4.2 gives TA ≤ 34.7 °C at 480 MHz VOS0 worst case and ≤ 57 °C at VOS1 400 MHz"; the table it cites is in the owner-decision section, not §4.2, and its worst row is 20.4 °C. The self-heating rulings ([R-32](#r-32), [R-55](#r-55)) compare against 57 °C.
- **Derived in:** [power.md §5.3](power.md#53-mcu-reset-decoupling-and-junction-temperature).

### PW-NOTVS

**No input TVS, while an 18 V hot plug peaks at or below about 28 V at the buck's VIN.**
- **Date:** 2026-10-02 (design-review gap G-S2).
- **Decides:** the DC input has no TVS diode, provided the hot-plug analysis keeps the peak at the buck's VIN at or below about 28 V (87 % of the buck's 32 V absolute maximum) for an 18 V hot plug. The source's words: "**Decision (owner, 2026-10-02).** No input TVS, provided this analysis keeps the peak at the buck's VIN at or below about 28 V (87 % of its 32 V absolute maximum) for an 18 V hot plug." It is the design note's sentence; his own words are not recorded. Had the peak exceeded 28 V, a bidirectional TVS from VIN to GND before the input diode and a ≥ 50 V bulk capacitor would have been added.
- **Set by:** [POWER.md][power] §4.4, "Hot-plug overshoot (design-review gap G-S2)"; repeated in §4, "**No input TVS is fitted** (owner decision 2026-10-02, design-review gap G-S2)".
- **Amended by:** none (no later owner decision). Split spec §5.6.1 requires the analysis re-run with the module branch and the connector in the path, inside our module's survival rating and, on a Seed bench, inside 17 V.
- **Narrowed by:** [R-59](#r-59) (controller ruling; the owner may override) records the re-run on the split: `vinMod.hotPlugPeakV` 26.3 V at pin 39 and 25.76 V at the module buck's VIN, and "Pin-39 parts are rated against 26.3 V; ≤ 28 V holds". So the condition still holds and the decision stands.
- **Derived in:** [power.md §4.5](power.md#45-hot-plug-at-the-module-input), [FIG-HOTPLUG](power.md#fig-hotplug) (26.3 V) and [FIG-SEED-HOTPLUG](power.md#fig-seed-hotplug) (the 9 V Seed bench).

*Not in force:* the one-board v1 result that first met the condition, 21.9 V at the buck's VIN over the parameter grid and 24.8 V at an extreme corner (`POWER.md` §4.4). The split moved the buck onto the module, and R-59's figures replace it.

### AN-D1

**Full-scale level: 7.62 Vp-p into 10 kΩ.**
- **Date:** 2026-10-01.
- **Decides:** `ANALOG.md`'s owner decision D1, "Resolved by the owner, 2026-10-01: option (b), 7.62 Vp-p into 10 kΩ", at both the input and the output jacks: the swing the OPA1688 produces inside its guaranteed-linear region at the cold minimum VIN_PROT of 8.44 V. Its acceptance gate is a bring-up THD+N measurement at full scale with a 9.0 V input, cold and hot, into 10 kΩ.
- **Set by:** [ANALOG.md][analog], "Owner decisions (resolved)"; [platform spec][plat], *Open items* item 3.
- **Amended by:** split spec §9.1: unchanged, protected by R-PF-7, whose basis is the owner's [R-34](#r-34).
- **Derived in:** [analog.md FIG-HEADROOM](analog.md#fig-headroom) and [§2](analog.md#2-levels-and-the-analog-interface-table); [power.md §3.1](power.md#31-the-analog-branch-r-pf-7-and-its-load) (the 8.44 V).

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
- **Derived in:** [mechanical-and-controls.md §5.1](mechanical-and-controls.md#51-the-actuator) (the dimension-by-dimension comparison behind "within 0.5 mm").

### F-4

- **Date:** 2026-10-05.
- **Fact:** the owner has original Daisy Seeds. The split spec's sentence is "The owner has original Seeds and the Seed3 is out of stock, so development starts on an original Seed"; it is the spec's sentence, not his words.
- **Not his fact:** that the Seed3 is out of stock. The split spec records it as research: §9.2, "single source, out of stock per the research, V"; §14 risk R-9, "single source, sold out at the time of the research (V)".
- **Source:** [split spec §2 O-16, §9.2, §14][split].
- **Used by:** [O-16](#o-16).

### F-5

- **Date:** 2026-10-06, measured from the inside of the top panel.
- **Owner:** "On my reference board, the tallest shoulder is 11.25mm above the pcb."; "the jack is about 15.8mm tall"; "the box is about 28.3mm deep (to the top of the screw hole posts, which is where the lid's lip rests). Its about 30mm to the bottom edge of the enclosure"; "Im measuring from the inside. The tangent of the jack hole is about 26.77 mm from the inside top of the enclosure"; "the lip of the lid rises 3mm from the inside of the lid and 2mm from the edge of the lid. So, the inside of the lid is 1mm deeper than the side edges of the enclosure".
- **Source:** [S1 ledger R-62][ledger].
- **Used by:** [R-62](#r-62); [mechanical-and-controls.md FIG-JACKS-OVER-LIP](mechanical-and-controls.md#fig-jacks-over-lip) and [FIG-JACK-HOLE-CROSSCHECK](mechanical-and-controls.md#fig-jack-hole-crosscheck).

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
- **Derived in:** [power.md EC-SEED-BENCH](power.md#ec-seed-bench), [FIG-SEED-HOTPLUG](power.md#fig-seed-hotplug) (13.56 V) and [FIG-SEED-TJ](power.md#fig-seed-tj) (why a Seed's switch-on cannot be bounded).

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
- **Derived in:** [mechanical-and-controls.md FIG-STACK-HEIGHT](mechanical-and-controls.md#fig-stack-height) and [EC-STACK-HEIGHT](mechanical-and-controls.md#ec-stack-height).

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
- **Carried in:** Q-6 in [analog.md EC-CODEC-RESET](analog.md#ec-codec-reset) and [bypass-relay.md EC-POWER-FAIL-OVERRIDE](bypass-relay.md#ec-power-fail-override); Q-7 in [firmware-facing-requirements.md §3.1](firmware-facing-requirements.md#31-our-module-a-bootloader-in-flash-ahead-of-the-application).

### OWN-02

**R_RF value.**
- **Label:** controller ruling. `OWNER-DEFAULTS.md`'s line reads "**Owner decision (2026-10-04):** Decided on best practice (2026-10-04); owner may override." It is headed as an owner decision but says it was decided on best practice with the override reserved to him, under his standing instruction to decide engineering questions by best practice and report. That is a ruling he may override; the heading is ambiguous and is recorded here as such. Two other records of the same items read as rulings:
  - `SCHEMATIC-CHECKLIST.md` marks OWN-02, OWN-04, OWN-05, OWN-06 and OWN-07 each "**Resolved on best practice, 2026-10-04 (owner may override):**", where OWN-03 alone reads "Resolved by the owner, 2026-10-02".
  - The first entry of [the A2 rulings][a2]: "Ruling: per the owner standing preference (defer EE judgement; decide by best practice, report, do not ask), Task 1 OWN items are decided by the controller on best practice and reported to the owner with the option to override".
- **Date:** 2026-10-04.
- **Decides:** R_RF is 1.0 kΩ 1 % 0603, as `ANALOG.md` §5.3 designs it.
- **Set by:** [OWNER-DEFAULTS.md][own] OWN-02; [SCHEMATIC-CHECKLIST.md][checklist] OWN-02.
- **Amended by:** split spec §9.2: unchanged (pedal board).
- **Carried in:** [analog.md §6.3](analog.md#63-rf-filter-and-coupling).

### OWN-04

**MIDI header supply.**
- **Label:** controller ruling, with the same ambiguous heading as [OWN-02](#own-02).
- **Date:** 2026-10-04; narrowed 2026-10-06.
- **Current:** the MIDI header's 3.3 V supply is 3V3_D (contract pin 38), inside its 25 mA logic-load contract, and supplies the MIDI IN receiver and the MIDI OUT open-drain driver only. The MIDI OUT current loop is powered from the pedal digital rail. The header stays unpopulated.
- **Set by:** [OWNER-DEFAULTS.md][own] OWN-04.
- **Amended by:** split spec §9.2; [R-23](#r-23) (the split spec's §9.2 calls it "ruling R-23 (confirmed)" without saying who confirmed it; the ledger names the confirmer as the controller).
- **Derived in:** [power.md §5.4](power.md#54-pin-38-what-the-pedal-may-draw-from-3v3_d) (the 25 mA contract and the pin-38 budget).

### OWN-05

**Panel and enclosure parts.**
- **Label:** controller ruling, with the same ambiguous heading as [OWN-02](#own-02).
- **Date:** 2026-10-04; changed 2026-10-05 and 2026-10-06.
- **Current:** pots are the short-shaft Alpha RV16AF-41, a controller part choice from the envelope study under [O-17](#o-17)'s board height (no recorded words of the owner name it); each of the six control positions is a pot or an HCTL TC-6610-17-100G button per effect (O-18), with no separate buttons; the footswitches are DAIER PBS-24-MP actuators pressing Schurter LSH tact switches on boards hung under the audio board, in two builds (R-56); the BOOT0 and RESET tactile switches move to the module and need not be reachable in a closed enclosure (O-12). The split spec leaves the remaining panel parts to be chosen in S2 (§9.2); later rulings use the Neutrik NMJ6HCD2 jacks ([R-62](#r-62)) and Kingbright WP7113ID LEDs ([R-27](#r-27)).
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

### PW-CHASSIS

**Chassis bond: a ground lug under one audio-jack nut.**
- **Label:** controller ruling. `POWER.md` §7.2: "**Decided (2026-10-04, A2 Task 8 controller ruling; best practice, owner may override):**"; [the A2 rulings][a2] ALL-09, "best practice, owner may override"; `SCHEMATIC-CHECKLIST.md` ALL-09, "Resolved on best practice, 2026-10-04 (A2 Task 8 controller ruling; owner may override)".
- **Date:** 2026-10-04 (the bond itself was defined 2026-10-02, design-review gap G-E1).
- **Decides:** the die-cast enclosure is bonded to GND at one point, by a ground lug with a star washer under one audio-jack nut, wired to a dedicated GND solder pad (plated through-hole, Ø2.5 mm pad, 1.2 mm drill) near the DC jack. Powder coat insulates, so it is masked or scraped under the lug, and enclosure-to-GND continuity is checked after coating. The reason: the chosen Neutrik NMJ6HCD2 jacks have a polyamide shell and nut, so the jack sleeves give no bond. The USB shell stays on its 1 MΩ ∥ 4.7 nF RC, and the DC jack stays isolated.
- **Set by:** [POWER.md][power] §7.2, item 4; [A2 rulings][a2] (ALL-09); [SCHEMATIC-CHECKLIST.md][checklist] ALL-09.
- **Amended by:** none. The split leaves it with the audio board, which carries the jacks.
- **Carried in:** [power.md §10](power.md#10-ground-and-return-paths).

*Not in force:* the bond through the metal audio-jack sleeves and their panel nuts, as `POWER.md` §7.2 first wrote it, which the polyamide jacks cannot give.

### AN-RING

**The expression ring's external DC limit: ±5 V.**
- **Label:** controller ruling. `ANALOG.md` §8.2: "**Ring external DC limit: ±5 V** (A2 Task 13 ruling, best practice; owner may override)". [The A2 rulings][a2]: "Ruling (EE, decided on best practice per CLAUDE.md, owner may override): the expression ring is specified for passive expression pedals; its external DC limit is restated as ±5 V (not ±12 V; tip keeps ±12 V)". The A2 file gives the ruling no date of its own; it sits between two owner decisions dated 2026-10-04.
- **Date:** 2026-10-04, by its place in the A2 rulings.
- **Decides:** the expression input is specified for passive expression pedals, which put no voltage on the ring, so the ring's external DC limit is ±5 V, set by R_REF's dissipation. The tip keeps ±12 V. The ESD diode on the ring stays for ESD.
- **Set by:** [ANALOG.md][analog] §8.2; [A2 rulings][a2].
- **Amended by:** none to the limit. [R-19](#r-19) (ruling) designs the split pedal's −5 V ring case within it: R_REF 3.30 kΩ and the Schottky clamp D_RCLAMP. At −5 V, R_REF 3.30 kΩ dissipates 22 mW of its 1206's 250 mW.
- **Derived in:** [analog.md §10.1](analog.md#101-ring-reference) (the limit and R_REF's dissipation) and [FIG-VREF-LOAD](analog.md#fig-vref-load) (the −5 V ring in the VREF_A budget).

*Not in force:* ±12 V on the ring, restated to ±5 V by this ruling; and R_REF 1.00 kΩ from VDDA, whose 69 mW at −5 V `ANALOG.md` §8.2 cites, replaced on the split pedal by R-19.

### D1

**SDRAM class.**
- **Label:** controller ruling, with an ambiguity the owner may want to settle. The evidence each way:
  - **For a ruling.** `CORE-BRIEF.md` records no owner approval for D1 to D13. They are the brief's deltas from OSCAR. The owner's recorded approvals start at D14 ([OWNER-DEFAULTS.md][own]: "The owner approved deltas D14–D19 on 2026-10-04").
  - **For an owner approval.** The generator spec, whose front matter reads "status: approved-design (rev 3)", required them in its gate 8: "Every difference must be declared as one of CORE-BRIEF D1–D13", and its approach needs "about 10 of the 13 CORE-BRIEF deltas" ([generator spec][gen]). The file does not say who approved it. The A1 ruling that extended gate 8 to D14 onward reads, in full: "Ruling: A2 pre-flight (a)2 — gate 8 accepts any delta that CORE-BRIEF.md §4 declares with owner approval; D14–D18 were approved 2026-10-04 — the spec's "D1–D13" predates owner-approved later deltas — cost if wrong: none, because deltas still need owner approval to enter CORE-BRIEF." ([A1 rulings][a1]). Read one way, "deltas still need owner approval to enter CORE-BRIEF" is a rule that every delta in `CORE-BRIEF.md` §4, D1 to D13 included, carries owner approval. Read the other way, "the spec's "D1–D13" predates owner-approved later deltas" contrasts D1 to D13 with the owner-approved deltas that came after them, and suggests they had no such approval.
  - **How it is carried.** The port spec's label rule counts an entry as an owner decision only where the source says so, and no source says the owner approved D1 to D13 by name. So D1 to D13 are carried as controller rulings, and the owner may rule otherwise.
- **Decides:** the 32 MB baseline class: 256 Mbit × 16, 13 row bits, 9 column bits, 4 banks; the TSOP-II-54 pinout and A0–A12 carry over from OSCAR.
- **Set by:** [CORE-BRIEF.md §4][cb]; compatibility in `SDRAM-COMPATIBILITY.md`.
- **Amended by:** split spec §3: 32 MB is the module baseline, and firmware fits 32 MB on every board, the Seed included ([O-4](#o-4)).
- **Carried in:** [processor-and-memory.md EC-SDRAM-CLASS](processor-and-memory.md#ec-sdram-class).

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
- **Carried in:** [processor-and-memory.md's delta table](processor-and-memory.md#how-the-core-brief-is-carried); [firmware-facing-requirements.md EC-SAI2-SLAVE](firmware-facing-requirements.md#ec-sai2-slave) (the codec's reset is not firmware's); [analog.md EC-CODEC-RESET](analog.md#ec-codec-reset).

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
- **Decides:** PDR_ON tied to VDD; VCAP1 joined to VCAP2, each with 2.2 µF; 100 nF plus 1 µF on VDD33USB; a VDDA bank on FB_VDDA that meets VDDA-WIDEBAND (below).
- **Set by:** [CORE-BRIEF.md §4][cb].
- **Amended by:** not named in split spec §9.4; on the module.
- **Narrowed by:** [R-57](#r-57) (controller ruling; the owner may override): the VDDA bank must meet VDDA-WIDEBAND, f0 ≤ 158.0 kHz ([processor-and-memory.md §4](processor-and-memory.md#4-the-mcu-and-its-supply-network); [analog.md EC-VDDA-WIDEBAND](analog.md#ec-vdda-wideband)).

*Not in force:* OSCAR's VDDA bank of 2 × 100 nF + 2 × 2.2 µF as the module's bank, which `CORE-BRIEF.md` D7 kept because it meets AN4938's 100 nF + 1 µF; on R-57's ceramic basis it gives 2.13 mV rms at pin 21, over the 806 µV requirement ([processor-and-memory.md §4](processor-and-memory.md#4-the-mcu-and-its-supply-network)).

### D8

**HSE crystal.**
- **Label:** controller ruling (see [D1](#d1)).
- **Decides:** 25 MHz, with OSCAR's unspecified part replaced.
- **Set by:** [CORE-BRIEF.md §4][cb] (and §5).
- **Amended by:** [split spec §9.4][split]: the HSE and the AN2606 verdict are kept for the module; the Seed's 16 MHz HSE is a firmware board configuration.
- **Derived in:** [processor-and-memory.md FIG-HSE-GM](processor-and-memory.md#fig-hse-gm).

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
- **Carried in:** [processor-and-memory.md EC-SDRAM-CONTROL-PINS](processor-and-memory.md#ec-sdram-control-pins).

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
- **Carried in:** [architecture.md §4.2](architecture.md#42-physical-two-1--20-parts).

*Not in force:* the earlier ruling "one `J_MOD` part per board, quantity 2".

### R-6

**SAI trace-and-connector allowance.**
- **Date:** 2026-10-05.
- **Decides:** no source gives the Seed-side path length, so a 2 ns engineering allowance is applied once per traversal of the header (twice on DIN). Margins are at least 75 ns.
- **Set by:** [S1 ledger R-6][ledger].
- **Derived in:** [analog.md FIG-SAI-MARGINS](analog.md#fig-sai-margins).

### R-8

**Spare interface pins and the control positions.**
- **Date:** 2026-10-05 (on owner decisions [O-18](#o-18) and layout B).
- **Decides:** a freed GPIO pin stays a `signal` pin with a unique name, direction `in`, function `GPIO`. Pins 22–27 are POS1–POS6. 3V3_D gains the load role `control-button-pullup`.
- **Current:** `control-button-pullup` is declared at 1.94 mA, its 1 % worst case at the 3.513 V rail maximum. The spares are SPARE1–SPARE5 on pins 1, 2, 3, 7 and 10; pin 11 is USB_EN_N.
- **Set by:** [S1 ledger R-8][ledger].
- **Amended by:** [R-14](#r-14): pin 11 becomes USB_EN_N; the spares are SPARE1–SPARE5 on pins 1, 2, 3, 7 and 10. [R-23](#r-23) declares the pin-38 loads at their 1 % worst case: "button pull-ups 1.94 (spec §5.6.2's 0.70 and 1.92 are nominal)".
- **Derived in:** [power.md §5.4](power.md#54-pin-38-what-the-pedal-may-draw-from-3v3_d) (the role's 1.94 mA); [mechanical-and-controls.md EC-CONTROL-POSITIONS](mechanical-and-controls.md#ec-control-positions).

*Not in force:* six spares SPARE1–SPARE6 on pins 1, 2, 3, 7, 10 and 11.

*Not in force:* `control-button-pullup` at 1.92 mA (R-8 as written, the split spec's nominal figure), before R-23's worst-case declaration.

### R-9

**SAI timing edges and the half period.**
- **Date:** 2026-10-05 (S1 Task 10).
- **Decides:** the SAI timing is checked with launch and capture on opposite BCK edges, the half period being the codec's minimum pulse width 0.4 t(BCY) = 130.2 ns. Both SAI2 blocks run with CKSTR = 1, which firmware must set. Margins: 75.3 ns setup, 110.3 ns hold.
- **Set by:** [S1 ledger R-9][ledger].
- **Amended by:** [R-57](#r-57) adds the codec's slave-side timing (DIN, LRCK2, BCK2).
- **Derived in:** [analog.md FIG-SAI-MARGINS](analog.md#fig-sai-margins) (75.28 ns and 110.28 ns, recorded here rounded); [firmware-facing-requirements.md EC-SAI2-SLAVE](firmware-facing-requirements.md#ec-sai2-slave) (CKSTR = 1).

### R-10

**Series resistors between the to-module isolation buffer and the module pins.**
- **Date:** 2026-10-05; amended 2026-10-06.
- **Decides:** 470 Ω 1 % between each SN74LVC3G34 (U_ISO_M) output and pins 32, 34 and 35, carrying the companion role `sai-module-series`. It bounds the fight with the ST ROM bootloader driving PA2, and covers firmware that misconfigures PA0 or PG9.
- **Set by:** [S1 ledger R-10][ledger].
- **Amended by:** the Task 10 fix round (2026-10-06), in the same entry.
- **Carried in:** [analog.md §14.2](analog.md#142-sai-timing-at-bck--3072-mhz).

*Not in force:* the role `sai-isolation-to-module` on these resistors, and the "keeps the paths matched" reason, both withdrawn in the Task 10 fix round.

### R-11

**R-2a criteria where no logic threshold applies.**
- **Date:** 2026-10-05; amended 2026-10-06.
- **Decides:** an analog input tolerates an onboard pull that costs at most 2 % of full scale; a pin with no audio-board circuit and CODEC_DIN take 450 Ω; the I²C pins 10 kΩ; USB D−/D+ USB 2.0's ZINP ≥ 300 kΩ. The pot fit binds at 498.4 kΩ, the first bring-up threshold.
- **Set by:** [S1 ledger R-11][ledger].
- **Amended by:** its fix-round note after [R-13](#r-13).
- **Derived in:** [architecture.md §4.9](architecture.md#49-output-gates-and-the-onboard-pull-margin) (the onboard-pull tolerance per pin, the 498.4 kΩ among them).

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
- **Derived in:** [architecture.md §4.9](architecture.md#49-output-gates-and-the-onboard-pull-margin) (87.4 kΩ and 60.8 kΩ); [bypass-relay.md EC-RELAY-GATE](bypass-relay.md#ec-relay-gate) (R_BPD).

### R-14

**PB14 under the ST ROM bootloader: a USB isolation switch.**
- **Date:** 2026-10-06.
- **Decides:** the pedal and the carrier fit U_USBSW, TI TS3USB221RSER, between J_MOD pins 36/37 and the USBLC6-2/USB-C, VCC from 3V3_D, its active-low OE held off by R_USBEN 10.0 kΩ 1 % to 3V3_D. Pin 11 (PB5) becomes USB_EN_N. Pins 36/37 take the protection class `isolation-buffer-ioff`. 3V3_D gains the load role `usb-isolation-switch`. The procedure stays as a second safeguard: unplug the pedal's or carrier's USB-C before ROM DFU entry. Cost: DFU through the Daisy bootloader over the pedal's USB-C is lost with a Seed fitted.
- **Set by:** [S1 ledger R-14][ledger].
- **Amended by:** [R-57](#r-57): Electrosmith's DS120 Table 2 confirms PB5 has no onboard function; the other fact it rests on (AN2606 Table 135 has no PB5) could not be read and is the freeze blocker FB-AN2606.
- **Carried in:** [firmware-facing-requirements.md EC-USB-OTG-HS](firmware-facing-requirements.md#ec-usb-otg-hs) and [DAISY-BOOTLOADER-LIMITS](firmware-facing-requirements.md#daisy-bootloader-limits); [power.md §5.4](power.md#54-pin-38-what-the-pedal-may-draw-from-3v3_d) (the switch's load role).

### R-15

**Control resolution and the VREF_A noise requirement.**
- **Date:** 2026-10-06; amended three times the same day.
- **Current:** firmware reads the six control positions and the expression input at 10 bits (a decision; no document states a control resolution). The permitted VREF_A noise in the control band is 1,123 µV rms; the control band is 0–421 Hz. Wideband noise at pin 21, up to the ADC's sampling bandwidth, must stay at or under 806 µV rms (LSB/4), a module requirement. Above the band, firmware's control smoothing must attenuate the residue.
- **Set by:** [S1 ledger R-15][ledger].
- **Amended by:** its fix-round amendments; [R-57](#r-57) (one ceramic basis: the band becomes 0–421 Hz, and the module must meet f0 ≤ 158.0 kHz, requirement VDDA-WIDEBAND).
- **Derived in:** [analog.md EC-CONTROL-NOISE-BAND](analog.md#ec-control-noise-band); [FIG-VREF-806](analog.md#fig-vref-806) (806 µV), [FIG-VREF-1123](analog.md#fig-vref-1123) (1,123 µV rms), [FIG-VREF-BAND](analog.md#fig-vref-band) (421 Hz) and [FIG-VDDA-WIDEBAND](analog.md#fig-vdda-wideband) (2.13 mV rms, 158.0 kHz).

*Not in force:* the control band 0–179 Hz, before R-57.

*Not in force:* the wideband estimate 0.745 mV rms at pin 21, withdrawn as a bound by R-57 (the present bank gives 2.13 mV rms on R-57's basis).

### R-16

**Pot tolerance and the VREF_A dynamic peak.**
- **Date:** 2026-10-06.
- **Decides:** the pot-top load takes the B10K pots at −20 % (8.0 kΩ), an allowance; the expression input is specified for passive pedals; the dynamic peak is the plain sum of the ring short, the blocking network, the filter charge and the pots and fixed loads.
- **Set by:** [S1 ledger R-16][ledger].
- **Amended by:** its fix-round amendment; [R-17](#r-17) and [R-19](#r-19) set the current figures.
- **Derived in:** [analog.md FIG-VREF-LOAD](analog.md#fig-vref-load).

### R-17

**Back-feed blocking on the expression input.**
- **Date:** 2026-10-06; amended through the Task 11 fix rounds.
- **Decides:** an LM66100 ideal diode (U_REFBLK) in series between VREF_A and R_REF, its CE held by R_CE 100 kΩ and a 2N7002 (Q_REFEN) gated from VREF_A through R_ENG 100 kΩ; R_EXPIN 2.2 MΩ between the tip node and U_EXP's input. Claimed to 85 °C ([R-20](#r-20)). Bring-up gate: with the module unpowered and +5 V on the ring through R_REF, VREF_A must read at most 0.6 V, with a slow 0 → +5 V sweep and a hot repeat. A bleeder on the module's 3V3 is recorded for S2 as a backstop, not adopted.
- **Set by:** [S1 ledger R-17][ledger]. It resolves split spec §14 risk R-14 (which is not ruling R-14).
- **Derived in:** [analog.md §9.6](analog.md#96-back-feed-from-the-expression-jack) and [FIG-VREF-BLOCKED](analog.md#fig-vref-blocked) (the unpowered bound and the CE margin); [EC-RING-REFERENCE](analog.md#ec-ring-reference).

*Not in force:* CE tied straight to VOUT, R_CE 1.00 MΩ, R_EXPIN 1.00 MΩ, and the 105 °C figures, all replaced in the fix rounds.

### R-18

**VREF_A maximum external capacitance: 4 µF.**
- **Date:** 2026-10-06.
- **Decides:** 4 µF, a recorded decision rather than a derivation. Carried to the module design: a loop-stability and start-up check of the module's 3V3 buck with its total capacitance plus the contract's external capacitance, before the contract is frozen; and a damping leg across the VDDA bank, never a series resistance in VDDA's DC path. The 145.5 µF bound covers the Rev5 Seed only.
- **Set by:** [S1 ledger R-18][ledger].
- **Derived in:** [analog.md §9.3](analog.md#93-maximum-external-capacitance-4-µf-a-decision) (the 145.5 µF bound).

### R-19

**The −5 V ring case: R_REF and a Schottky clamp.**
- **Date:** 2026-10-06.
- **Current:** D_RCLAMP, Nexperia PMEG4005AEA, from GND to the node between U_REFBLK's output and R_REF; R_REF 3.30 kΩ 1 % 1206 (Uniroyal 1206W4F3301T5E). The ring role declares 3.50 mA and the VREF_A total 6.49 mA, × 1.5 = 9.74 mA against 10 mA. Claimed from −20 °C to 85 °C.
- **Set by:** [S1 ledger R-19][ledger].
- **Amended by:** its fix-round amendments (R_REF value, R_CE, temperature basis).
- **Derived in:** [analog.md FIG-VREF-LOAD](analog.md#fig-vref-load) (3.50 mA, 6.49 mA and 9.74 mA); [EC-RING-REFERENCE](analog.md#ec-ring-reference).

*Not in force:* R_REF 1.00 kΩ, then 3.09 kΩ.

### R-20

**Design temperature range for the analyses.**
- **Date:** 2026-10-06.
- **Decides:** part ratings, leakage and other temperature-dependent part parameters are claimed from −20 °C to 85 °C, and nothing in the contract above 85 °C; a part's own rating caps a claim below that (the bypass relays to 70 °C ambient). Self-heating claims are evaluated to the platform's processor-limited thermal envelope ([PW-TJ](#pw-tj)), and each states its limit. The ledger gives that envelope as "TA ≤ 34.7 °C at 480 MHz VOS0 worst case and ≤ 57 °C at VOS1 400 MHz"; [PW-TJ](#pw-tj) records why 34.7 °C is not the worst VOS0 row, and the rulings that apply the envelope compare against 57 °C.
- **Set by:** [S1 ledger R-20][ledger].
- **Derived in:** [power.md §5.3](power.md#53-mcu-reset-decoupling-and-junction-temperature) (the envelope's figures).

### R-21

**I²C expansion bus: Fast-mode, capacitance budget and pull-ups.**
- **Date:** 2026-10-06.
- **Decides:** 400 kHz; at most four expansion devices and 40 cm of bus wiring, or the board buffers the bus; pull-ups 2.40 kΩ ±1 %, only on the audio board; expansion boards fit no pull-ups of their own; any ESD or TVS part on SDA/SCL counts toward the bus capacitance at its maximum.
- **Set by:** [S1 ledger R-21][ledger].
- **Amended by:** [R-61](#r-61): the 2 pF per socket contact becomes an allowance for the Mill-Max parts.
- **Derived in:** [power.md §5.4](power.md#54-pin-38-what-the-pedal-may-draw-from-3v3_d) (the bus capacitance, the pull-up window and the 2.40 kΩ).

### R-22

**Footswitch series resistor and debounce.**
- **Date:** 2026-10-06.
- **Decides:** 1.20 kΩ ±1 % between each footswitch node and its pin; the 100 nF stays at the node; firmware debounces in a 5 ms window, confirmed at bring-up against the fitted footswitch's measured bounce.
- **Set by:** [S1 ledger R-22][ledger].
- **Derived in:** [power.md §5.4](power.md#54-pin-38-what-the-pedal-may-draw-from-3v3_d); the debounce window for firmware in [firmware-facing-requirements.md §9](firmware-facing-requirements.md#9-controls-revision-and-the-other-analog-and-power-obligations).

### R-23

**Pin-38 allocation and the MIDI split.**
- **Date:** 2026-10-06. "Confirmed 2026-10-06 (controller ruling)".
- **Decides:** the MIDI OUT current loop is powered from the pedal digital rail, switched by an open-drain Ioff driver (U_MIDIDRV, SN74LVC1G07) on 3V3_D from MIDI_UART_TX. 3V3_D's MIDI allocation covers the MIDI IN receiver (2.0 mA, met by a cited part) and the driver. The declared 3V3_D total is 16.66 mA, × 1.5 = 24.99 mA, inside the 25 mA logic-load contract.
- **Set by:** [S1 ledger R-23][ledger].
- **Amended by:** [R-26](#r-26) (the driver drives a high-side P-MOSFET instead of sinking the loop); [R-28](#r-28) (the driver role becomes 0.21 mA, `i2c-device` 6.3 mA).
- **Derived in:** [power.md §5.4](power.md#54-pin-38-what-the-pedal-may-draw-from-3v3_d) (the 16.66 mA table).

### R-24

**3V3_D external capacitance, peak and ripple.**
- **Date:** 2026-10-06.
- **Decides:** `maxExternalCapacitanceUf` 10 µF (a decision, carried to the module's loop and start-up check); `maxPeakCurrentMa` 26.3 mA; `rippleMvPp` 20.7 mV.
- **Set by:** [S1 ledger R-24][ledger].
- **Derived in:** [power.md §5.4](power.md#54-pin-38-what-the-pedal-may-draw-from-3v3_d) and [§5.2](power.md#52-the-module-buck) (26.3 mA and 20.7 mV).

### R-25

**Pedal digital rail: 3V3_P, a TPS62933F on VIN_MOD.**
- **Date:** 2026-10-06.
- **Decides:** the rail is 3V3_P from a TI TPS62933FDRLR, with `POWER.md` §3.3's network, fed from VIN_MOD after the module branch's reverse-polarity element, never from VIN_A. It carries both relay coils, both LEDs, the MIDI OUT loop and Q_MIDI's gate pull-up. Its EN follows PF_ON through the network of [R-44](#r-44).
- **Set by:** [S1 ledger R-25][ledger].
- **Amended by:** [R-44](#r-44), [R-45](#r-45), [R-52](#r-52), [R-58](#r-58) (EN network).
- **Carried in:** [power.md §6.1](power.md#61-the-rail); [bypass-relay.md EC-COIL-RAIL](bypass-relay.md#ec-coil-rail).

*Not in force:* "RT and EN floating" (R-25 as first written).

### R-26

**MIDI OUT short circuit: a high-side P-MOSFET switch.**
- **Date:** 2026-10-06.
- **Current:** Q_MIDI, AOS AO3401A, source on 3V3_P, drain to RA, RA to MIDI pin 4; RA is four 130 Ω ±1 % 1206 in parallel; RC is 10 Ω ±1 % 1206; Q_MIDI's gate is pulled up to 3V3_P by R_MGP 160 Ω ±1 % 1206 (Uniroyal 1206W4F1600T5E) and pulled low by U_MIDIDRV.
- **Set by:** [S1 ledger R-26][ledger].
- **Amended by:** its fix round 1; [R-53](#r-53) (R_MGP at Q_MIDI's 85 °C threshold).
- **Derived in:** [power.md §6.3](power.md#63-leds-and-the-midi-out-switch).

*Not in force:* R_MGP 1.00 kΩ, then 270 Ω 0603.

### R-27

**Pedal-rail allowances.**
- **Date:** 2026-10-06.
- **Decides:** WP7113ID VF,min 1.6 V (an allowance), so the LED series resistor is 100 Ω; TPS62933F loss 0.35 W; input capacitance 3.45 µF effective per 10 µF 50 V 1206, less 10 %, with 10 mΩ ESR. Bring-up measures all three.
- **Set by:** [S1 ledger R-27][ledger].
- **Amended by:** [R-53](#r-53): the 3.45 µF is TI's figure for a TDK part and stands as the allowance for the fitted Samsung part.
- **Derived in:** [power.md §6.2](power.md#62-why-switching-and-its-loss) (0.35 W), [§6.3](power.md#63-leds-and-the-midi-out-switch) (the LED resistor) and [§6.4](power.md#64-input-ripple-and-survival) (3.45 µF).

### R-28

**Pull-up on MIDI_UART_TX.**
- **Date:** 2026-10-06.
- **Decides:** R_TXPU 18.0 kΩ ±1 % from MIDI_UART_TX to 3V3_D, at U_MIDIDRV's input, so the driver is held off while the MCU pin is unconfigured.
- **Set by:** [S1 ledger R-28][ledger].
- **Derived in:** [power.md §5.4](power.md#54-pin-38-what-the-pedal-may-draw-from-3v3_d) (the driver role's 0.21 mA).

### R-29

**Codec oscillator.**
- **Date:** 2026-10-06.
- **Decides:** U_XO is the Epson SG-210STF 12.288000 MHz L (X1G0041710019) on 3V3_CODEC with 100 nF, ST̅ tied high. The stability criterion is amended to ±50 ppm all-inclusive over the operating range, excluding aging. The 15 pF CMOS load is a layout requirement on XO_OUT.
- **Set by:** [S1 ledger R-29][ledger].
- **Carried in:** [analog.md §13.2](analog.md#132-oscillator-r-29).

### R-30

**Codec VDD regulator and the power-down clamp.**
- **Date:** 2026-10-06.
- **Decides:** U_CVDD is a TI TPS7A2433DBVR from the codec's VCC net to 3V3_CODEC; D_CVCL, a PMEG4005AEA, from OUT to IN; R_CBLD 3.60 kΩ ±1 % from 3V3_CODEC to GND. An exception to `POWER.md` §4.1 is accepted for the power-down: at most 24 mV past the regulator's VOUT ≤ VIN + 0.3 V rating, below about −5 °C.
- **Set by:** [S1 ledger R-30][ledger].
- **Amended by:** [R-53](#r-53) (the exception's onset).
- **Derived in:** [analog.md FIG-CVCL](analog.md#fig-cvcl) (the 24 mV exception) and [§13.3](analog.md#133-vdd-regulator-and-the-power-down-clamp-r-30).

### R-31

**Codec local reset.**
- **Date:** 2026-10-06.
- **Current:** U_CRST is the TLV803EA29DBZR; R_CRST is 4.70 kΩ from CODEC_RST_N to 3V3_CODEC; v1's R_RST_PD stays not fitted, because fitted it would put RST across VIH.
- **Set by:** [S1 ledger R-31][ledger].
- **Amended by:** the ledger's "R-31 and R-32 amendment" (S1 Task 15 fix round 1, review I-3, R_CRST 4.70 kΩ); [R-40](#r-40); [R-53](#r-53).
- **Derived in:** [analog.md EC-CODEC-RESET](analog.md#ec-codec-reset) and [FIG-CODEC-RST](analog.md#fig-codec-rst).

*Not in force:* R_CRST 10.0 kΩ, and the catalog's TLV803EA30 for this reset.

### R-32

**5V_A with the codec domain: the 18 V survival claim.**
- **Date:** 2026-10-06.
- **Decides:** the TPS7A49's 18 V survival junction claim is evaluated to the platform's thermal envelope ([R-20](#r-20)): Tj ≤ 125 °C holds to 74.1 °C ambient and Tj ≤ 115 °C to 64.1 °C, both above the 57 °C envelope, so no operating condition is removed. Options are listed if the envelope ever rises.
- **Set by:** [S1 ledger R-32][ledger].
- **Amended by:** the ledger's "R-31 and R-32 amendment" (0.803 W, 74.1 °C and 64.1 °C).
- **Derived in:** [power.md §7](power.md#7-5v_a-and-the-analog-branch) (0.803 W; 74 °C and 64 °C, the ledger's 74.1 °C and 64.1 °C rounded).

### R-33

**A comparator-only ideal diode does not meet R-PF-7.**
- **Date:** 2026-10-06.
- **Status:** superseded in effect by the owner's [R-34](#r-34): with R-PF-7 at 9.00 V every candidate passes, and no ideal diode is used.
- **Set by:** [S1 ledger R-33][ledger].
- **Carried in:** [power.md §3.1](power.md#31-the-analog-branch-r-pf-7-and-its-load) (the candidates compared).

### R-35

**Realisation and reservoir.**
- **Date:** 2026-10-06.
- **Decides:** one PMEG4030ER per branch (D_AIN to VIN_A, D_MIN to the module branch). VIN_A's reservoir is four 100 µF 35 V aluminium cans (C_BULK to C_BULK4) with the X7R parts already on VIN_A.
- **Set by:** [S1 ledger R-35][ledger].
- **Amended by:** [R-40](#r-40) (the fourth can).
- **Derived in:** [power.md §3.2](power.md#32-the-hold-up-reservoir).

*Not in force:* three cans (C_BULK to C_BULK3), before R-40.

### R-36

**Sense point, divider and VIN bleeder.**
- **Date:** 2026-10-06.
- **Decides:** U_PF (TPS3808G01) senses VIN at the jack, upstream of both branch elements, through a 0.1 % divider; R_VBLD 10.0 kΩ 1206 defines VIN's fall after a plug pull. The trip is 7.799–8.159 V falling and the release at most 8.404 V.
- **Set by:** [S1 ledger R-36][ledger].
- **Amended by:** [R-40](#r-40) (the top resistor splits into R_PFT1 13.0 kΩ and R_PFT2 174 kΩ with D_PFCL for reverse 18 V); [R-58](#r-58) (the bounds with ISENSE).
- **Derived in:** [power.md FIG-TRIP](power.md#fig-trip) (7.799–8.159 V, release ≤ 8.404 V) and [§3.3](power.md#33-the-supervisor-at-vin-r-pf-6-r-pf-9).

### R-37

**RESET fan-out.**
- **Date:** 2026-10-06.
- **Decides:** U_PF's open-drain RESET drives only the node PF_OK (pulled up to 5V_A); a Schmitt inverter, U_PFINV, makes PF_TRIP (high when tripped), which drives three AO3400A N-MOSFETs: Q_PFG on the relay gate, Q_PFR on CODEC_RST_N and Q_VDIS on the VIN_MOD discharge. The relay gate and CODEC_RST_N are no longer joined.
- **Set by:** [S1 ledger R-37][ledger].
- **Amended by:** [R-40](#r-40): U_PFINV is the dual SN74LVC2G14, PF_TRIP on channel A and PF_ON on channel B.
- **Carried in:** [bypass-relay.md §4.3](bypass-relay.md#43-the-override-and-the-codec-reset-r-pf-4-r-pf-11) and [EC-POWER-FAIL-OVERRIDE](bypass-relay.md#ec-power-fail-override); [power.md §3.4](power.md#34-timing-and-margins-r-pf-1-to-r-pf-3-r-pf-8).

### R-38

**Re-engage: the module load switch with a VIN_MOD discharge.**
- **Date:** 2026-10-06.
- **Current:** Q_MSW, an AOS AOD4185, between D_MIN and VIN_MOD, on only while U_PF is released, through Q_MSWD driven from PF_ON; its gate network R_MSWT 15.0 kΩ and R_MSWB 4.30 kΩ. Q_MSW has a diode-steered Miller-ramp soft start: C_SS 2.2 µF 50 V X7R from its drain to a node, D_SS (BAS116H) from that node to the gate, and R_SSR 15.0 kΩ from the source to that node, which resets C_SS during the off time. Q_VDIS with R_VDIS, a 10.0 Ω Vishay CRCW201010R0FKEFHP (2010), discharges VIN_MOD while tripped, so the module always reboots, and boots into bypass.
- **Set by:** [S1 ledger R-38][ledger].
- **Amended by:** [R-40](#r-40) (Q_MSWD driven from PF_ON; the soft start C_SS, D_SS and R_SSR added; R_VDIS 27.0 Ω pulse-proof); [R-41](#r-41) (Q_MSW becomes an AOS AOD4185, its gate network and soft start re-sized for it; R_VDIS 10.0 Ω 1206); [R-42](#r-42) (R_VDIS 10.0 Ω Vishay CRCW201010R0FKEFHP); [R-49](#r-49) (the gate held through the plug-in edge).
- **Derived in:** [power.md §3.5](power.md#35-re-engage-the-module-load-switch-q_msw-r-pf-5) (the switch, the soft start and the ramp rates).

*Not in force:* Q_MSW as an AO3401A, with R_MSWT 10.0 kΩ and R_MSWB 12.0 kΩ (R-38 as first written).

*Not in force:* R_VDIS as 22 Ω 1206 (R-38), then 27.0 Ω pulse-proof 1206, Vishay CRCW120627R0FKEAHP (R-40), then 10.0 Ω 1206, Vishay CRCW120610R0FKEAHP (R-41).

*Not in force:* the soft start as R-40 first sized it, C_SS 1 µF and R_SSR 33.0 kΩ, re-sized by R-41.

### R-39

**The two hold-up frames and the detection bound.**
- **Date:** 2026-10-06.
- **Decides:** the hold-up is checked in two frames, both at least zero: the plug pull, and the slow fall, which holds for any fall profile and any detection time.
- **Set by:** [S1 ledger R-39][ledger].
- **Amended by:** [R-40](#r-40) (frame 1's basis).
- **Derived in:** [power.md §3.4](power.md#34-timing-and-margins-r-pf-1-to-r-pf-3-r-pf-8).

### R-40

**Task 15 fix round 1.**
- **Date:** 2026-10-06.
- **Decides:** a set of rulings on the power-fail review: the fourth reservoir can; the plug-pull basis (the owner's R-34 covers R-PF-7 only); the re-engage delay td from C_PFCT 47 nF C0G on U_PF's CT (154–395 ms with the device spread, inside firmware's 2.5 s bypass hold); the reverse-18 V divider split and clamp; R_CRST 4.70 kΩ; the dual inverter; and further items in the entry.
- **Set by:** [S1 ledger R-40][ledger].
- **Amended by:** [R-41](#r-41) supersedes its R_VDIS discharge bound (R-PF-10), which started from the trip maximum rather than VIN_MOD's 18 V; [R-42](#r-42) and later rulings change R_VDIS's part.
- **Derived in:** [power.md §3.4](power.md#34-timing-and-margins-r-pf-1-to-r-pf-3-r-pf-8) (the 154–395 ms re-engage delay) and [§3.5](power.md#35-re-engage-the-module-load-switch-q_msw-r-pf-5).

### R-41

**Task 15 fix round 2.**
- **Date:** 2026-10-06.
- **Decides:** 18 V is a survival condition applied continuously, not an operating point, and Q_MSW's switch-on at 18 V is checked as a survival case; Q_MSW becomes an AOS AOD4185 (TO-252); the supply rating is left to the owner, which [R-43](#r-43) settled.
- **Set by:** [S1 ledger R-41][ledger].
- **Amended by:** [R-42](#r-42) supersedes its SOA basis, its 3.9 A carry and its 1206 R_VDIS.
- **Carried in:** [power.md §3.5](power.md#35-re-engage-the-module-load-switch-q_msw-r-pf-5).

### R-42

**Task 15 fix round 3.**
- **Date:** 2026-10-06.
- **Decides:** the junction-temperature method for Q_MSW's switch-on, and R_VDIS 10.0 Ω Vishay CRCW201010R0FKEFHP (2010).
- **Set by:** [S1 ledger R-42][ledger].
- **Amended by:** [R-45](#r-45), [R-50](#r-50), [R-58](#r-58) (later figures).
- **Derived in:** [power.md §3.6](power.md#36-q_msws-switch-on-junction-temperature).

### R-44

**3V3_P held off during Q_MSW's ramp.**
- **Date:** 2026-10-06.
- **Current:** U_PRAIL's EN is driven from PF_ON through R_PEN 150 kΩ ±1 %, with C_PEN from EN to GND (two 4.7 µF 50 V X7R in parallel) and R_PENPD 1.00 MΩ; C_PEN is reset by Q_PEN, a Nexperia 2N7002 gated by PF_TRIP, through R_PENS 180 Ω. Every release, cold or after a trip, waits the full delay of at least 230 ms, which clears the slowest switch-on ramp. 3V3_P starts about 0.1 s later at boot, inside firmware's 2.5 s bypass hold.
- **Set by:** [S1 ledger R-44][ledger].
- **Amended by:** [R-45](#r-45) (R_PENS, R_PENPD, C_PEN 4.7 µF); [R-52](#r-52) (R_PENS 180 Ω); [R-58](#r-58) (Q_PEN replaces the diode; C_PEN doubled).
- **Derived in:** [power.md EC-QPEN-RESET](power.md#ec-qpen-reset) and [FIG-EN-DELAY](power.md#fig-en-delay) (the 230 ms).

*Not in force:* the diode reset of EN: D_PEN (BAS116H) from EN to PF_ON, with R_PENS 150 Ω in series, which left C_PEN near the threshold after a brownout. R-58 replaced it with Q_PEN.

*Not in force:* C_PEN 2.2 µF, then a single 4.7 µF.

### R-45

**Task 15 fix round 5.**
- **Date:** 2026-10-06.
- **Decides:** the EN network changes (R_PENPD, C_PEN) and the copper and SOA basis for Q_MSW: a module's current model as VIN_MOD rises replaces the flat current carry.
- **Set by:** [S1 ledger R-45][ledger].
- **Amended by:** [R-52](#r-52), [R-58](#r-58).
- **Derived in:** [power.md §3.6](power.md#36-q_msws-switch-on-junction-temperature) and [FIG-POUR](power.md#fig-pour); [EC-QPEN-RESET](power.md#ec-qpen-reset).

### R-46

**VIN_MOD's range.**
- **Date:** 2026-10-06.
- **Current:** minimum 7.93 V, maximum 12.6 V, survival 18 V (no element drop is taken for the maximum and survival).
- **Set by:** [S1 ledger R-46][ledger].
- **Amended by:** [R-58](#r-58) (the D_MIN drop from Table 7 log-interpolated; `minV` 7.93 V).
- **Derived in:** [power.md FIG-MINV](power.md#fig-minv) and [§4](power.md#4-vin_mod-pin-39).

*Not in force:* minimum 7.94 V, before R-58.

### R-47

**The module's EN/UVLO divider.**
- **Date:** 2026-10-06.
- **Decides:** R_UV1 18.0 kΩ and R_UV2 4.30 kΩ ±1 %: start 5.58–6.75 V, stop at least 5.50 V. It implements [D24](#d24).
- **Set by:** [S1 ledger R-47][ledger].
- **Derived in:** [power.md §4.1](power.md#41-the-modules-enuvlo-divider).

### R-48

**The module's input network.**
- **Date:** 2026-10-06.
- **Decides:** the module carries `POWER.md` §1's buck input branch unchanged, with no extra bulk.
- **Set by:** [S1 ledger R-48][ledger].
- **Carried in:** [power.md §4.2](power.md#42-the-modules-input-network).

### R-49

**Q_MSW's gate held through the plug-in edge.**
- **Date:** 2026-10-06 (a controller-delegated EE ruling).
- **Decides:** C_GS 220 nF from Q_MSW's source through D_GS (BAS116H), with R_GSB 470 kΩ across C_GS, holds the switch off at a plug-in from rest; otherwise the module is bounded by the hot-plug figure. Bring-up adds a fast re-plug and a contact-bounce case.
- **Set by:** [S1 ledger R-49][ledger].
- **Amended by:** its Task 16 fix round 1 (values); [R-59](#r-59) (the hot-plug figure).
- **Derived in:** [power.md §4.6](power.md#46-q_msw-at-the-plug-in-edge-and-a-fast-re-plug).

*Not in force:* C_GS 100 nF and R_GSB 1.00 MΩ, before the fix round.

### R-50

**Q_MSW's SOA carry, the retry pour and the Seed.**
- **Date:** 2026-10-06.
- **Decides:** the carry is closed on the junction temperature with the module's real start-up (governing figure 123.7 °C at 18 V since [R-58](#r-58)); the module's whole 3V3 capacitance is at most 150 µF, an S2 module requirement; the S2 pour gives RθJA ≤ 95 °C/W on 1 oz. A Seed's switch-on cannot be bounded from published data, so **Seed benches run from a 9 V supply** until bring-up measures a Seed's VIN current and capacitance through the switch-on. This narrows [O-15](#o-15), itself a controller ruling.
- **Set by:** [S1 ledger R-50][ledger].
- **Amended by:** [R-58](#r-58) ("R-50's 9 V benches stand"); [R-59](#r-59).
- **Derived in:** [power.md FIG-QMSW-TJ](power.md#fig-qmsw-tj) (123.7 °C), [FIG-POUR](power.md#fig-pour) (95 °C/W), [FIG-SEED-TJ](power.md#fig-seed-tj) and [EC-SEED-BENCH](power.md#ec-seed-bench).

### R-51

**VIN_MOD's permitted ripple.**
- **Date:** 2026-10-06; restated 2026-10-06 (S1 Task 17).
- **Current:** `permittedRippleMvPp` 41.6 mV p-p, by R-51's rule: 1.5 × what the carrier presents at 450–550 kHz, rounded up (U_PRAIL 27.2 mV plus the module's own ripple reflected through L_FILT, 0.47 mV).
- **Set by:** [S1 ledger R-51][ledger].
- **Amended by:** [R-53](#r-53), which restates the figure when the pedal rail's input ripple rises with R_MGP 160 Ω: "the contract's `permittedRippleMvPp` 41.6 mV (R-51's rule unchanged: 1.5 × (27.2 + 0.47) mV, rounded up; 40.4 before)".
- **Derived in:** [power.md §4.4](power.md#44-ripple).

*Not in force:* 40.4 mV p-p (R-51 as first written, on U_PRAIL's 26.4 mV), before R-53.

### R-52

**R_PENS 180 Ω.**
- **Date:** 2026-10-06.
- **Decides:** R_PENS is 180 Ω.
- **Set by:** [S1 ledger R-52][ledger].
- **Amended by:** [R-58](#r-58) supersedes its re-release analysis; R_PENS now sits in Q_PEN's drain.
- **Derived in:** [power.md EC-QPEN-RESET](power.md#ec-qpen-reset) (R-58's 18.4 ms finding and the Q_PEN reset).

*Not in force:* R-52's re-release delay of at least 32.7 ms after a trip, refuted by R-58 (18.4 ms with EN's pull-up and the diode's real forward voltage).

### R-53

**Task 17 section C fixes.**
- **Date:** 2026-10-06.
- **Decides:** R_MGP 160 Ω ±1 % 1206 at Q_MIDI's 85 °C threshold; the 3.45 µF CIN figure stands as an allowance; the PCM3060's 12 mA IDD is an allowance taken to 85 °C; R-30's exception onset is corrected; R_RST_PD stays not fitted; text corrections; and the consequences it re-records, among them VIN_MOD's `permittedRippleMvPp` 41.6 mV ([R-51](#r-51)). The underlying `task-17-rulings.md` was never committed to the pedals repository; this ledger entry is the record.
- **Set by:** [S1 ledger R-53][ledger].
- **Derived in:** [power.md §6.3](power.md#63-leds-and-the-midi-out-switch) (R_MGP), [§6.4](power.md#64-input-ripple-and-survival) and [§4.4](power.md#44-ripple); [analog.md FIG-CVCL](analog.md#fig-cvcl) and [§13.5](analog.md#135-the-domains-budget).

### R-54

**The module header: Preci-Dip's own.**
- **Date:** 2026-10-06.
- **Status:** its part choice is superseded by [R-61](#r-61), whose fallback pair it remains. Its reason, that the maker of the socket stands behind the mate, carries into R-61.
- **Set by:** [S1 ledger R-54][ledger].
- **Carried in:** [mechanical-and-controls.md §3.2](mechanical-and-controls.md#32-the-socket-and-the-header) and [EC-SOCKET-AND-HEADER](mechanical-and-controls.md#ec-socket-and-header).

### R-55

**Section A mechanical rules.**
- **Date:** 2026-10-06.
- **Current:** the footswitch lid hole is Ø13.4 (ISO 273 fine-series M12 clearance 13.0 plus 0.4 powder coat), with an ISO 7089 M12 washer under the outside nut. Both trim rules (leads over the module, socket tails) add IPC J-STD-001's step: reflow each trimmed joint or inspect it for damage from the cut, stated on the PCBWay order page. Rated temperatures cap their claims: the module's PTS645VL switches at 60 °C, the footswitch's Schurter LSH at 70 °C, both above the 57 °C envelope.
- **Set by:** [S1 ledger R-55][ledger].
- **Amended by:** [R-62](#r-62) withdraws its lid relief.
- **Derived in:** [mechanical-and-controls.md §5.4](mechanical-and-controls.md#54-clearances-attachment-and-connection) (the Ø13.4 hole), [EC-LEAD-TRIM](mechanical-and-controls.md#ec-lead-trim) and [§7](mechanical-and-controls.md#7-assembly-rules) (the trim rules), [§3.2](mechanical-and-controls.md#32-the-socket-and-the-header) and [FIG-FOOTSWITCH-LOAD](mechanical-and-controls.md#fig-footswitch-load) (the rated temperatures).

*Not in force:* R-55's lid relief at each ¼ in jack, at least 1.25 mm deep, withdrawn by R-62.

### R-57

**Task 17 section B fixes.**
- **Date:** 2026-10-06.
- **Decides:** one ceramic basis (nominal × 0.9 × 0.85 × 0.5 = 0.3825) for the VDDA bank and C_POSn; the control band 0–421 Hz ([R-15](#r-15)); the hard S2 module requirement **VDDA-WIDEBAND**, f0 ≤ 158.0 kHz (L_min × C_bank,eff ≥ 1.015 µH·µF), with the 806 µV requirement not relaxed; the gate tolerances with series terms ([R-13](#r-13)); the codec's slave timing; the S2 item **VBUS-HOTPLUG** (show PA1 ≤ 3.6 V from a model, or fit C_VBUS 100 nF from PA1 to GND; bring-up scopes PA1 at a USB-C plug-in); and the contract freeze blocker **FB-AN2606** (AN2606 could not be obtained; the contract is not frozen until it is read). The underlying `task-17-rulings.md` was never committed to the pedals repository; this ledger entry is the record.
- **Set by:** [S1 ledger R-57][ledger].
- **Derived in:** [analog.md FIG-VREF-BAND](analog.md#fig-vref-band) (421 Hz), [FIG-VDDA-WIDEBAND](analog.md#fig-vdda-wideband) (0.3825, 158.0 kHz, 1.015 µH·µF) and [EC-VDDA-WIDEBAND](analog.md#ec-vdda-wideband); [FIG-VBUS-HOTPLUG](analog.md#fig-vbus-hotplug); [§14.2](analog.md#142-sai-timing-at-bck--3072-mhz) (the slave timing); [architecture.md §4.9](architecture.md#49-output-gates-and-the-onboard-pull-margin) (the gate tolerances).

### R-58

**Task 17 section D fixes, power-fail: 3V3_P's EN reset by Q_PEN.**
- **Date:** 2026-10-06.
- **Decides:** Q_PEN (Nexperia 2N7002, gate on PF_TRIP, source GND, drain through R_PENS 180 Ω to U_PRAIL's EN) replaces the diode reset, and C_PEN becomes two 4.7 µF 50 V X7R in parallel, so every release waits at least 230 ms ([R-44](#r-44)). It restates the bounds behind the switch-on: trip 7.799–8.159 V, release at most 8.404 V; Q_MSW's governing figure 123.7 °C at 18 V; `minV` 7.93 V; `maxPeakCurrentMa` 674 mA. A Seed at 9.45 V would reach 137.7 °C in its switch-on path, so R-50's 9 V benches stand. The underlying `task-17-rulings.md` was never committed to the pedals repository; this ledger entry is the record.
- **Set by:** [S1 ledger R-58][ledger].
- **Derived in:** [power.md EC-QPEN-RESET](power.md#ec-qpen-reset), [FIG-EN-DELAY](power.md#fig-en-delay) (230 ms), [FIG-TRIP](power.md#fig-trip), [FIG-QMSW-TJ](power.md#fig-qmsw-tj) (123.7 °C), [FIG-MINV](power.md#fig-minv) (7.93 V), [§4](power.md#4-vin_mod-pin-39) (674 mA) and [FIG-SEED-TJ](power.md#fig-seed-tj) (137.7 °C).

### R-59

**Task 17 section D fixes, VIN_MOD: re-plug, pin-39 hot plug, and the 9 V Seed bench.**
- **Date:** 2026-10-06.
- **Decides:** `vinMod.hotPlugPeakV` is 26.3 V at pin 39, and pin-39 parts are rated against it; a re-plug inside the re-engage delay keeps Q_MSW at or under 129.4 °C and R_VDIS inside its pulse rating; at a 9.45 V bench supply the hot-plug bound on VIN_MOD is 13.56 V, 3.4 V under a Seed's 17 V, which supports [O-15](#o-15) as narrowed to 9 V. "≤ 28 V holds": the owner's no-TVS criterion ([PW-NOTVS](#pw-notvs)) is still met.
- **Set by:** [S1 ledger R-59][ledger].
- **Derived in:** [power.md FIG-HOTPLUG](power.md#fig-hotplug) (26.3 V), [§4.6](power.md#46-q_msw-at-the-plug-in-edge-and-a-fast-re-plug) (129.4 °C and R_VDIS's pulse) and [FIG-SEED-HOTPLUG](power.md#fig-seed-hotplug) (13.56 V).

*Not in force:* `vinMod.hotPlugPeakV` 25.8 V, before R-59.

### R-60

**The module's USB-C: a vertical receptacle facing the back plate.**
- **Date:** 2026-10-06.
- **Decides:** J_USB_MOD is the HRO TYPE-C-31-E-17, a vertical 16-pin USB Type-C receptacle on the module's component face, its mouth toward the back plate, with 5.1 kΩ Rd on CC1 and CC2. A straight plug enters with the back plate off. [O-11](#o-11) stands. S2 module requirement USB-DFU-VERTICAL carries the land pattern and footprint work. The underlying `task-17-research-A.md` was never committed to the pedals repository; this ledger entry is the record.
- **Set by:** [S1 ledger R-60][ledger].
- **Derived in:** [mechanical-and-controls.md EC-MODULE-USB](mechanical-and-controls.md#ec-module-usb) and [FIG-USB-PLUG-COLUMN](mechanical-and-controls.md#fig-usb-plug-column); carried in [firmware-facing-requirements.md §3.1](firmware-facing-requirements.md#31-our-module-a-bootloader-in-flash-ahead-of-the-application) and [processor-and-memory.md §8](processor-and-memory.md#8-reset-boot-debug-and-the-modules-usb-socket). Its S2 work is the open item USB-DFU-VERTICAL in [open-items.md](open-items.md).

*Not in force:* the right-angle HCTL HC-TYPE-C-16P-01A, whose mouth faced J_OUT_R 9.2 mm away in layout B.

### R-61

**The module socket and header: Mill-Max's own pair.**
- **Date:** 2026-10-06.
- **Decides:** socket Mill-Max 801-43-020-10-012000; header Mill-Max 800-10-020-10-002000, cut to 20 from the stocked 800-10-064-10-002000. Fallback: the Preci-Dip pair, socket 801-87-020-10-012101 with its header cut to 20 from 800-10-064-10-002101. Stack height 15.17 mm and `maxHeightBottomMm` 4.97 mm unchanged. Before the contract freeze, Mill-Max confirms that cutting is acceptable and the 20-way's lead time. The underlying `task-17-research-A.md` was never committed to the pedals repository; this ledger entry is the record.
- **Set by:** [S1 ledger R-61][ledger].
- **Derived in:** [mechanical-and-controls.md EC-SOCKET-AND-HEADER](mechanical-and-controls.md#ec-socket-and-header), [FIG-STACK-HEIGHT](mechanical-and-controls.md#fig-stack-height) (15.17 mm and 4.97 mm) and [FIG-SEED-IN-SOCKETS](mechanical-and-controls.md#fig-seed-in-sockets).

### R-62

**The enclosure: the owner-measured reference box.**
- **Date:** 2026-10-06 (a controller ruling on the owner's measurements, [F-5](#f-5)).
- **Decides:** design to the measured box, taken to be the owner's preferred supplier's (Tayda) 1590BB-style box. Below the top panel's inner face: rim 30.0 mm; the lid lip's top 28.0 mm; the lid's inner face inside the lip 31.0 mm. The lip is assumed within 4 mm of the inside wall (not measured). Plan sizes stay Hammond's. Room under the board: 18.7 mm at the centre, 15.7 mm over the lip band, 17.7 mm to the rim. The ¼ in jacks clear the lip by 0.03 mm nominal, accepted on the owner's working reference pedal plus a first-build check. No contract value is loosened. The NMJ6HCD2 jacks and layout B stay. First-build check: the ordered box matches the reference.
- **Set by:** [S1 ledger R-62][ledger].
- **Derived in:** [mechanical-and-controls.md EC-ENCLOSURE](mechanical-and-controls.md#ec-enclosure), [FIG-ROOM-UNDER-BOARD](mechanical-and-controls.md#fig-room-under-board) (18.7, 15.7 and 17.7 mm), [FIG-HEIGHTS-UNDER-BOARD](mechanical-and-controls.md#fig-heights-under-board), [FIG-JACKS-OVER-LIP](mechanical-and-controls.md#fig-jacks-over-lip) (0.03 mm) and [FIG-JACK-HOLE-CROSSCHECK](mechanical-and-controls.md#fig-jack-hole-crosscheck).

*Not in force:* the room under the board from Hammond's drawing (29.75 mm inside height, 17.45 mm under the board), and R-55's lid relief.

### CR-CARRIER-BREAKOUT

**The carrier breaks every contract pin out to two 1 × 20 male headers.**
- **Label:** Controller ruling (the owner may override). A phase-2 ruling of this repository, not carried from the pedals repository.
- **Date:** 2026-11-11.
- **Decides:** every contract pin goes to a 1 × 20 2.54 mm male header, `brk_a` for J_MOD_A and `brk_b` for J_MOD_B, pad for pad with the sockets (symbol `Connector_Generic:Conn_01x20`). A header pin is the one breakout terminal a reserved pin (16–19) is allowed on the carrier, so each `RESERVED_<pin>` net holds exactly the socket pad and that header pin. Why headers, not 40 test points: [O-13](#o-13)'s 40-pin breakout in two parts instead of forty, which keeps the drawn page near the size the drawing loop has already handled.
- **Set by:** the controller, H7 carrier plan Task 5 (`docs/superpowers/plans/2026-11-11-h7-carrier-first-page.md`).
- **Carried in:** [architecture.md §7](architecture.md#7-the-bring-up-carrier) ("every pin broken out to a header or test point"); `circuits/h7-platform/carrier-board.ts`.

### CR-CARRIER-TEST-POINTS

**Probe test points on the power nets and the four SAI nets.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-11.
- **Decides:** one probe test point (`Connector:TestPoint`) each on VIN_MOD, 3V3_D, VREF_A, GND and the four SAI nets, contract pins 32–35 (CODEC_DOUT, CODEC_DIN, CODEC_LRCK, CODEC_BCK), as [architecture.md §7](architecture.md#7-the-bring-up-carrier) lists them. Each draws no current from either rail (no DC path).
- **Set by:** the controller, H7 carrier plan Task 5.

### CR-CARRIER-USB-C

**The carrier's USB connection is a USB-C receptacle with 5.1 kΩ CC pull-downs, and the pedal's shield network.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-11.
- **Decides:** a USB 2.0 Type-C receptacle (`Connector:USB_C_Receptacle_USB2.0_16P`; no part number chosen), each CC pin (A5, B5) 5.1 kΩ to GND, which is the module's USB-DFU arrangement ([processor-and-memory.md](processor-and-memory.md) §8, line 267); SBU1 and SBU2 unconnected; both D+ pins and both D− pins joined at the receptacle. The shell goes to GND through 1 MΩ in parallel with 4.7 nF, as the pedal's USB-05 does ([schematic-checklist.md](schematic-checklist.md) USB-05). The shield network is part of this ruling, mirroring the pedal's USB-05; the owner may strike it. Why mirror the pedal: the carrier exists to exercise the same interface path the pedal will.
- **Set by:** the controller, H7 carrier plan Task 5.
- **Carried in:** `circuits/h7-platform/carrier-board.ts` (`j_usb`, `r_cc1`, `r_cc2`, `r_shld`, `c_shld`).

### CR-CARRIER-ESD

**USB ESD protection on the carrier: the pedal's USBLC6-2SC6, fitted as the pedal fits it.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-11.
- **Decides:** U_ESD, ST USBLC6-2SC6 ([parts.md](parts.md) §5, the pedal's part under [D10](#d10)), between the isolation switch's port 1 and the receptacle, wired as [schematic-checklist.md](schematic-checklist.md) USB-04 wires it on the pedal: D+ through I/O1 (pins 1 and 6), D− through I/O2 (pins 3 and 4), pin 2 to GND, pin 5 to VBUS with C_VBUS 100 nF to GND. Symbol: the part's own stock `Power_Protection:USBLC6-2SC6` (spec C4).
- **Set by:** the controller, H7 carrier plan Task 5. C_VBUS is part of this ruling, mirroring the pedal's USB-04; the owner may strike it.

### CR-CARRIER-VBUS-SENSE

**VBUS reaches contract pin 31 through the pedal's divider.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-11.
- **Decides:** USB_VBUS_SENSE (pin 31) is VBUS through 12.0 kΩ over 20.0 kΩ, 1 %, the pedal's divider ([architecture.md](architecture.md) §4.8, pin 31 row). Why: the same interface path as the pedal.
- **Set by:** the controller, H7 carrier plan Task 5.
- **Open, applies here too:** VBUS-HOTPLUG ([R-57](#r-57); [open-items.md](open-items.md)). The divider copies the pedal's topology, so the carrier inherits the pedal's unresolved plug-in edge. With the module unpowered and a host's VBUS ringing to the 11.11 V lossless bound, PA1 can reach 7.00 V ([analog.md](analog.md) FIG-VBUS-HOTPLUG), past the 4.0 V an unpowered FT pin accepts. The carrier's `c_vbus` is VBUS-to-GND at the USBLC6-2 (schematic-checklist.md USB-04). It is **not** R-57's option, which is a capacitor from USB_VBUS_SENSE to GND; that option is now fitted as `c_vbus_sense` ([CR-CARRIER-VBUS-SENSE-CAP](#cr-carrier-vbus-sense-cap)). The carrier's USB sense path is not cleared for physical bring-up until this item is settled for the carrier. Raised by the circuit review in [issue 30](https://github.com/oletizi/audio-circuits/issues/30).

### CR-CARRIER-VBUS-SENSE-CAP

**R-57's sense-node capacitor is fitted on the carrier: 100 nF X7R from USB_VBUS_SENSE to GND.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-11.
- **Decides:** the carrier model gains `c_vbus_sense` (C4), 100 nF X7R (CL10B104KB8NNNC, C1591; [parts.md](parts.md) line 177's option) from USB_VBUS_SENSE (pin 31, PA1) to GND. It is a separate part from `c_vbus`, the USBLC6-2's VBUS-to-GND bypass; two documents call both of them C_VBUS. Why: [issue 30](https://github.com/oletizi/audio-circuits/issues/30) found the carrier's divider has the pedal's unresolved plug-in edge and no capacitor on the sense node, and the owner, 2026-11-11, said to fit the fix before the carrier page is reviewed.
- **What it covers**, computed from the model by `circuits/h7-platform/vbus-sense.ts` and asserted in `tests/circuits/h7-carrier.test.ts`: on [analog.md](analog.md) FIG-VBUS-HOTPLUG's basis (38.25 nF, already derated once; not derated again) and the carrier's own 12.0 k / 20.0 k divider at 1 %, PA1 stays ≤ 3.6 V and ≤ 4.0 V for the windows that figure gives, with VBUS held at the 11.11 V bound and a start from the steady level; the windows from a 0 V start are longer. The DC divider is unchanged, so a 4.35 V VBUS still reads above VIH; the capacitor only delays that, and the delay is stated by the same test.
- **Not settled by this:** whether a real host and cable stay inside those windows. A ring is not a step held at its peak, and no document read gives a host's source impedance or a cable's L and R. VBUS-HOTPLUG stays open, and the carrier's USB sense path stays not cleared for physical bring-up, until a host-and-cable model or the bring-up scope of PA1 (IF-PD-1-MEASURE) exists.
- **Set by:** the controller, after issue 30.

### CR-CARRIER-USBSW-SELECT

**The isolation switch's select pin is tied to GND, and its second port is unused.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-11.
- **Decides:** on the carrier's TS3USB221RSER, S (pin 9) goes to GND and 2D+/2D− (pins 3, 4) are not connected. With S low and OE low the common port D connects to 1D (TI SCDS220M p. 12, Table 7-1), so port 1 goes to the ESD part and the receptacle. [R-14](#r-14) names the switch, its supply and its enable but not S, and no document in `docs/h7-platform/` states it. S is still counted as a control input in the switch's ΔI_CC allowance on 3V3_D (CR-CARRIER-DUMMY-LOADS).
- **Set by:** the controller, H7 carrier plan Task 5, on the implementer's report that S was unspecified.

### CR-CARRIER-USBSW-SYMBOL

**The TS3USB221RSER is drawn from a project symbol.**
- **Label:** Controller ruling (the owner may override), under the spec's rule C4.
- **Date:** 2026-11-11.
- **Decides:** the TS3USB221 has no symbol of its own in the installed KiCad libraries. The two candidates, `Interface_USB:TS3USB30ERSWR` and `TS3USB30EDGSR`, differ from its RSE pinout on 9 and 8 of its 10 pins (TI SCDS220M p. 3 Table 4-1 against TI SCDS255G p. 3 Table 4-1). A scan of all 320 installed single-unit 10-pin symbols found none that matches, and a control run of the same scan did find TS3USB30ERSWR. So, under C4, the symbol is a project symbol `h7-platform:TS3USB221RSER` in `circuits/h7-platform/h7-platform.kicad_sym`, transcribed pin for pin from SCDS220M Table 4-1. C4's precondition was shown first: `tests/circuits/h7-project-symbol.test.ts` drafts it with the real copperhead through the repository's draft path, exports it with `kicad-cli`, and checks each pin's net and name. The draft path names the library in a project `sym-lib-table`. The port verifier's `nocode` check allows `.kicad_sym` under `circuits/h7-platform/` only.
- **Set by:** the controller, H7 carrier plan Task 5, on the implementer's BLOCKED report.

### CR-CARRIER-RAIL-LOADS

**Every part with a pin on 3V3_D or VREF_A states its worst-case current.**
- **Label:** Controller ruling (the owner may override). It is the plan's ruling P1.
- **Date:** 2026-11-11.
- **Decides:** the 25 mA 3V3_D limit ([power.md](power.md) §5.4) and the 10 mA VREF_A limit ([architecture.md](architecture.md) §4.7, pin 21) bound the carrier's aggregate draw, so the carrier's rail budget covers every part with a pin on either rail and refuses any that has none. The socket is the rail's source (0 A). Breakout header pins, test points and decoupling capacitors have no DC path (0 A). The TS3USB221 draws I_CC 30 µA plus ΔI_CC 20 µA for each of its two control inputs plus the OE input current I_IN 1 µA (SCDS220M p. 5, §5.5, VCC 3.6 V), in every state. The enable pull-up draws 3.513 V / (R × 0.99) while firmware enables USB, and nothing otherwise. Each dummy load draws the same expression for its own resistor when its jumper is fitted. Every resistance is read from the model, never copied as a constant, and 3.513 V is the rail maximum ([power.md](power.md) §5.2).
- **Set by:** the controller, H7 carrier plan Task 5.
- **Carried in:** `circuits/h7-platform/rail-budget.ts`.

### CR-CARRIER-DUMMY-LOADS

**Dummy loads: 147 Ω on 3V3_D and 357 Ω on VREF_A, each fitted by a jumper.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-11.
- **Decides:** each dummy load is a 1 % resistor to GND behind a 2-pin jumper header (`Connector_Generic:Conn_01x02`) from its rail. Its value is the smallest E96 resistor that keeps the rail's **aggregate** draw within its limit in **every** supported state with the dummy fitted. Every one of the eight combinations of three flags is supported: 3V3_D dummy fitted or not, VREF_A dummy fitted or not, USB enabled or not. No interlock or note rules any of them out, because a bring-up user who enables USB with the dummy fitted is using the board normally. The worst case on 3V3_D is both dummies fitted with USB enabled: 147 Ω gives 24.139 mA, plus the 0.355 mA pull-up, plus 0.071 mA for the switch (I_CC 30 µA, SCDS220M p. 5 §5.5; ΔI_CC 2 × 20 µA; I_IN 1 µA), for **24.565 mA ≤ 25 mA**. 143 Ω gives 25.240 mA in that state. **This replaces the plan's earlier 143 Ω after the plan review.** On VREF_A, nothing else draws current: 357 Ω gives **9.940 mA ≤ 10 mA**, and 348 Ω would give 10.197 mA. Packages: 1206 for 3V3_D (3.513 V across 147 Ω: 84.0 mW nominal, 84.8 mW at −1 %), 0805 for VREF_A.
- **Set by:** the controller, H7 carrier plan Task 5 (plan review finding).
- **Derived in:** `tests/circuits/h7-carrier.test.ts` ("every supported state keeps each rail within its limit", "dummy fitted with USB enabled is within the 3V3_D limit").

### CR-CARRIER-VIN

**The carrier's VIN entry: a 2-pin input and a 0.75 A hold fuse.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-11.
- **Decides:** VIN_MOD enters through a 2-pin input header (`Connector_Generic:Conn_01x02`; pin 1 is the supply, pin 2 is GND) and a fuse (`Device:Fuse`) in series. The bench supply's current limit stays the primary limit ([architecture.md §7](architecture.md#7-the-bring-up-carrier)). The fuse's hold current is **0.75 A**: the next standard PTC hold current above the module's largest documented VIN_MOD input current. That figure is **729 mA**, the 1.5× peak down to VIN_MOD 7.32 V ([power.md](power.md) §4, line 246), which exceeds the contract's `maxPeakCurrentMa` of 674 mA (line 240). No part number is chosen, because a schematic needs none (CLAUDE.md, G245). The model has no fuse kind, so the fuse is modelled as kind `ic` with pins "1" and "2". Its rating reaches the drawing's value field as "0.75A hold" through the part's stated value (`part.value`, which the value lowering uses for a part with no electrical quantity), set in `circuits/h7-platform/parts.ts`.
- **Set by:** the controller, H7 carrier plan Task 5.

### CR-MODULE-ID-STRAP-PIN

**The module's ID strap goes on the first free ADC-capable pin in ascending LQFP position.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** the module revision strap ([processor-and-memory.md](processor-and-memory.md) §9) is on the first pin, in ascending LQFP position, whose ST signal list includes an `ADCx_INPy` channel and which no internal assignment (`circuits/h7-platform/module-pins.ts`) and no interface assignment (`moduleMcuPin` in `module-interface.json`) uses. Computed from ST's pin data, that is PC2_C (position 34, signal ADC3_INP0); net `MODULE_ID_STRAP`.
- **Only a deterministic choice:** split spec §6.5 says "a free module ADC pin" and no document prefers one. The rule exists so the choice is reproducible and checkable, not because PC2_C is better suited than another free ADC pin; the owner may move it.
- **Open condition, to be rechecked before firmware bring-up:** PC2_C is an STM32H7 "_C" pad. ST's pin data (`circuits/h7-platform/vendor/st-pin-data/STM32H743IITx.xml`) names the pad `PC2_C` at position 34 and shows no separate PC2 pad in this package, and nothing else assigns PC2. The documents in this repository describe the analog switch only for the PC3_C pad (SYSCFG_PMCR.PC3SO, from `CORE-BRIEF.md` D13; [processor-and-memory.md](processor-and-memory.md), "How the core brief is carried", and [D13](#d13)); none of them, and not ST's pin data, names a switch or a register for PC2_C. Whether PC2_C has such a switch, what controls it, and whether its state matters for reading the strap on ADC3_INP0 were NOT checked against RM0433 or DS12110, so this ruling is conditional on that check. The register name this entry first gave for PC2_C was written from memory and is withdrawn (H7 module plan, final review I2). The check is carried by open item MODULE-ID-STRAP-C-PAD ([open-items.md](open-items.md)) and [firmware-facing-requirements.md](firmware-facing-requirements.md) §1, and it is the condition on open item MODULE-INTERNAL-PIN-MAP's closure.
- **Set by:** the controller, H7 module plan Task 2 (open item MODULE-INTERNAL-PIN-MAP).
- **Derived in:** `tests/circuits/h7-module-pins.test.ts` ("the ID strap pin follows CR-MODULE-ID-STRAP-PIN"), which recomputes the rule from the data.

### CR-MODULE-VDDA-BANK

**The module's VDDA bank is 2 × 10 µF + 2 × 100 nF X7R, with a damping leg of 0.30 Ω in series with 22 µF X7R across it.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** the bank is [analog.md](analog.md) FIG-VDDA-WIDEBAND's own example (line 298), meeting its nominal X7R ≥ 10.1 µF. The damping leg keeps the documented size, about 22 µF with R about 0.25–0.5 Ω (analog.md §9.3, line 274; open item VDDA-DAMPING-LEG), across the bank and never in VDDA's DC path ([R-18](#r-18)). R_DAMP_VDDA is the E24 value in 0.25–0.5 Ω with the least worst-case Q over the bead's DCR bound (Q at DCR 0 and at 0.045 Ω, the larger taken), subject to ≤ 806 µV rms at pin 21 and \|H\| at 450 kHz not above the undamped bank's; ties go to the lower R. That is **0.30 Ω**. Part numbers are not needed for the drawing; they are left to phase 4.
- **Inputs and basis:** ΔIL 1.66 A peak-to-peak at fSW 450 kHz ([power.md](power.md) §5.4, line 425; §5.2, line 374); the buck output 30.6 µF effective with 3.33 mΩ ESR (analog.md line 298); FB_VDDA's L at its lower bound, 165 Ω / (2π × 100 MHz) = 0.2626 µH, and DCR from 0 to its 0.045 Ω bound (analog.md lines 242, 272); every bank and leg ceramic on [R-57](#r-57)'s basis, 0.3825; odd harmonics to the 15th, root-sum-square; the bank's and leg's ESR taken as 0 Ω, no part being chosen (not conservative above f0, where ESR raises the shunt impedance).
- **Computed** by `circuits/h7-platform/vdda-noise.ts` (FIG-VDDA-WIDEBAND's method in code, which reproduces its 2.12 mV rms and 234.1 kHz for the old bank) and asserted in `tests/circuits/h7-vdda-noise.test.ts`:

  | | DCR 0 | DCR 0.045 Ω |
  |---|---|---|
  | rms at pin 21 | 363.4 µV | 362.4 µV |
  | \|H\| at 450 kHz (undamped 0.0657) | 0.0635 | 0.0633 |
  | pole-pair Q | 2.246 | 1.261 |

  The bank alone puts f0 at 111.7 kHz and gives 376.0 µV rms undamped. So the network meets 806 µV, and the leg does not raise \|H\| at 450 kHz.
- **Q ≤ 1 is not reached with the documented leg size.** Its 22 µF (8.4 µF effective) is about the bank's 7.7 µF, and a parallel R-C leg that size cannot bring the pole-pair Q to 1 at any R in the range (the least worst-case Q is 2.246, at 0.30 Ω). The source's "Q = 1 needs R ≥ √(L/C)" is the series-resistance form of Q, Q = √(L/C) / R, and does not size a leg across the bank. A larger leg capacitor was not taken: it would be a redesign, and it spends R-50's budget. Recorded for the owner's review of the page.
- **Toward [R-50](#r-50)'s 150 µF:** the bank and leg add 20.2 µF + 22 µF = **42.2 µF** nominal to the module's 3V3. The module's total is 116.8 µF over 39 capacitors, summed by `moduleCapacitance3v3` ([CR-MODULE-3V3-SUM](#cr-module-3v3-sum)) and asserted in `tests/circuits/h7-module.test.ts` ("the sum is within 150 uF").
- **Not settled by this:** VDDA-WIDEBAND, 3V3D-RIPPLE-INTO-VREF-A and VDDA-DAMPING-LEG stay open, conditional on Murata's curve (L is only a lower bound, and Q rises with L) and the chosen parts' DC-bias curves ([open-items.md](open-items.md)).
- **Set by:** the controller, H7 module plan Task 3, on the implementer's report that no candidate reaches Q ≤ 1.
- **Carried in:** `circuits/h7-platform/vdda-noise.ts` (`VDDA_RULED`, which the module model reads).

### CR-MODULE-USB-ESD

**The module's DFU socket takes the pedal's USBLC6-2SC6, wired as USB-04 wires it, with its VBUS pin on the socket's VBUS and nothing else.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** the ESD part named only as "the ESD part" in [processor-and-memory.md](processor-and-memory.md) §8 (line 267) is the USBLC6-2SC6, the part the pedal fits ([parts.md](parts.md), USB-04 at [schematic-checklist.md](schematic-checklist.md) line 213): D+ and D− through I/O1 (pins 1 and 6) and I/O2 (pins 3 and 4), pin 2 GND, pin 5 VBUS with 100 nF from pin 5 to GND at the part. D+ is on I/O1 and D− on I/O2, the order USB-04 gives. Socket side is pins 1 and 3, MCU side pins 6 and 4 (`DFU_ESD_WIRING`). Symbol `Power_Protection:USBLC6-2SC6`.
- **What pin 5 connects to:** line 267 describes DP1/DP2 and DN1/DN2 "through the ESD part" and says nothing of the module socket's VBUS. Ruled: pin 5 joins the socket's four VBUS pins (A4, B4, A9, B9) and nothing else. VBUS is on no rail and reaches no MCU pin, as USB-02 has it for the pedal (line 208), and the ROM DFU does not need it: its conditions are USB FS on PA11/PA12 in forced device mode with VDD33USB fed from the module's 3V3 ([processor-and-memory.md](processor-and-memory.md) §3, line 128).
- **The 100 nF** is USB-04's, for the reason USB-04 gives (the pin-5 node has no low-impedance return but the cable; ST Doc ID 11265 Rev 5 §2.1, Figures 15 and 18). Whether 100 nF is inside USB 2.0's device VBUS capacitance limit was not checked (USB2-SPEC-UNREAD).
- **Settles:** the ESD half of USB-DFU-VERTICAL. The footprint half, the land pattern, the thickness note and the plug column stay open for phase 4. The socket's shell connection is not stated for the module and is not ruled here.
- **Set by:** the controller, H7 module plan Task 4.
- **Carried in:** `circuits/h7-platform/module-parts.ts` (`DFU_ESD`, `DFU_ESD_WIRING`, `DFU_VBUS_CAP_F`).

### CR-MODULE-SDRAM-SYMBOL

**The SDRAM's symbol is a project symbol, `h7-platform:W9825G6KH`; `part.mpn` stays W9825G6KH-6I.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** spec C4 allows the stock `Memory_RAM:MT48LC16M16A2TG` only if its 54 pins match the W9825G6KH datasheet pin for pin, by name and number. The condition holds across the whole `Memory_RAM` library, so every symbol in it was compared, and none matches. (Multi-unit symbols, which split their pins over drawn units, are counted and left out of the pin comparison: they are not one 54-pin body.) The closest are two. `MT48LC16M16A2TG`, read against Winbond's W9825G6KH Rev. A04 (20 Mar 2017) p. 4 section 4 and p. 5 section 5, has all the numbers and differs in names at five pins: 15 (datasheet LDQM, stock DQML), 20 and 21 (BS0 and BS1, stock BA0 and BA1), 22 (A10/AP, stock A10) and 39 (UDQM, stock DQMH). `W9812G6KH-5`, `-6`, `-6I` and `-75` (the 128 Mbit part) differ at one pin: 36 is A12 on the W9825G6KH and NC on them, which is the address line the 256 Mbit part adds, so using one would leave the SDRAM's A12 pin unnamed and unconnectable. So the project symbol, with the datasheet's names, is used.
- **Shown drawable:** `tests/circuits/h7-project-symbol.test.ts` ("h7 project symbol W9825G6KH") has copperhead draft all 54 pins and `kicad-cli` export each on the datasheet's name.
- **Compared in:** `tests/circuits/h7-module-parts.test.ts`, which records the datasheet table with its citation and asserts the five mismatches.
- **Set by:** the controller, H7 module plan Task 4.

### CR-MODULE-SUPERVISOR-SYMBOL

**The NRST supervisor's symbol is the project symbol `h7-platform:TLV803EA30DBZR` (RESET typed open collector); `part.mpn` is TLV803EA30DBZR.**
*Amended 2026-11-12 (below): the entry first ruled `Power_Supervisor:TPS3839DBZ` as a pin stand-in, and the body below keeps that reasoning as history. TPS3839DBZ types the RESET pin push-pull and the TLV803E's is open drain, so it was replaced.*
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** no installed symbol is named for the TLV803E. TI's SLVSES2J (rev. May 2021) p. 5 Table 6-1, column "DCK, DBZ", gives pin 1 GND, pin 2 RESET (overbarred, active low), pin 3 VDD; p. 4 Figure 6-1 labels it "Pin 1 = GND", and section 12.1's worked example, TLV803EA29DBZR, reads "Pin 1 = GND". TLV803EA30DBZR carries no R or V pinout letter before DBZ, so that column applies (Table 12-1's letters are the alternatives). The first `Power_Supervisor` symbol in library order whose pins match by name and number is TPS3839DBZ (`1=GND 2=~{RESET} 3=VDD`). The ones before it differ: LM809 (pin 3 VCC), TCM809 (V_{DD}) and TLV810EA29DBZ (RESET without the overbar: the active-high part).
- **A stand-in for the pins only:** the symbol's name is another part's; the value field and `mpn` say which part is fitted.
- **Compared in:** `tests/circuits/h7-module-parts.test.ts`, which scans the library for the first match rather than trusting this entry.
- **Set by:** the controller, H7 module plan Task 4.
- **Amended:** Controller ruling (the owner may override). 2026-11-12, H7 module plan Task 7e fix round 1.
  - **What was wrong.** The module root's ERC reported `pin_to_pin` on NRST between J3 pin 10 (`open_collector`) and U5 pin 2. TPS3839DBZ types pin 2 `output`, which is push-pull. The fitted TLV803EA30DBZR drives NRST open drain ([D14](#d14), owner-approved). TI SLVSES2J p. 1, Features, says "TLV803E: open-drain, active-low", and p. 3, section 5 Device Comparison, says "803E: Open-Drain Active-Low". So the approved reset_boot page stated the wrong output stage. That is the defect; the ERC error was its symptom.
  - **The amended rule.** A stand-in symbol must match the fitted part's pin electrical types, as well as its pin names and numbers. An open-drain output maps to KiCad's `open_collector`.
  - **The scan.** All 223 installed libraries were read from the files, `Power_Supervisor` first, comparing name, number and type. No symbol has 1 = GND, 2 = `~{RESET}` typed `open_collector`, 3 = VDD or VCC.
    - By name alone, two symbols match: TPS3839DBZ, and LM809 with VCC on pin 3. Both type pin 2 `output`.
    - The 1,347 symbols the pin reader refuses (multi-unit, or a pin number declared twice) were read by text. None has a pin 2 named `~{RESET}` typed `open_collector`.
  - **So, under C4,** the part uses a project symbol, `h7-platform:TLV803EA30DBZR`, in `circuits/h7-platform/h7-platform.kicad_sym`.
    - Its pins come from SLVSES2J p. 5 Table 6-1, column "DCK, DBZ": pin 1 GND (`power_in`), pin 2 RESET overbarred (`open_collector`), pin 3 VDD (`power_in`, the supply input Table 6-1 marks "I").
    - Its geometry is TPS3839DBZ's: the body, the pin positions and lengths, and the field positions. So the reset_boot page keeps every position and wire.
    - Its Value, Datasheet and Description name the TLV803E.
  - **What C4 requires first is shown.** `tests/circuits/h7-project-symbol.test.ts` ("h7 project symbol TLV803EA30DBZR") has copperhead draft the symbol, and kicad-cli export each pin on the datasheet's name and type.
  - **The test.** `tests/circuits/h7-module-parts.test.ts` scans every installed library by name, number and type, and requires no match. Its negative control is that TPS3839DBZ is now rejected for its pin-2 type.
  - **The reset_boot page.** It was redrawn by its own replay, with only the symbol swapped. Every generated op-list was byte-identical to the committed one. The page differs from the approved bytes only in `lib_id`, the embedded symbol's name, its Value, Datasheet and Description fields, and pin 2's type. Its sha256 went from `ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397` to `00407478a4357332aa46164387305ba433dec173796b8d343d3bad86e09bdd24`. It is UNREVIEWED again.
  - **Same class.** No other module part has a symbol named for another part. The audit is in `drafted/h7-platform/h7-module/RECORD.md`.
  - **Costs if wrong:** one project symbol to remove, and a redraw of reset_boot.

### CR-MODULE-ID-STRAP-VALUES

**The ID strap is revision 1's divider of the HW_REV scheme: 20.0 kΩ from VDDA to the strap pin, 2.49 kΩ from the pin to GND, 100 nF at the pin.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** [processor-and-memory.md](processor-and-memory.md) §9 gives the strap "the same divider scheme as the audio board's HW_REV" ([analog.md](analog.md) §11, line 347). That scheme has revisions 1 to 8, coded at n / 9, and **no code 0**: a ratio of 0 is in the "below 0.0556 is a strap fault" band that firmware refuses. The module is the first build, so it takes revision 1: R_top 20.0 kΩ, R_bot 2.49 kΩ, both 1 %, nominal ratio 0.1107, 12-bit code 453, worst-case band 0.0973 to 0.1242, 100 nF at the pin (`ID_STRAP`). The source "does not say which code each split board carries" (analog.md, below the table), so this is a choice, and any other row is as faithful.
- **Where the top connects:** VDDA (VREF+), because the scheme's "the result is a ratio, so reference error cancels" holds only against the ADC's own reference. The 100 nF is on the 3V3 domain's far side of the divider's top resistor, and `moduleCapacitance3v3` counts it.
- **Set by:** the controller, H7 module plan Task 4.
- **Carried in:** `circuits/h7-platform/module-parts.ts` (`ID_STRAP`).

### CR-MODULE-BLEEDER

**The VREF_A back-feed bleeder is not fitted.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** the option (≤ 12 kΩ on the module's 3V3, 0.29 mA when powered; [analog.md](analog.md) line 325; open item VREF-A-BLEEDER-DECISION) is not fitted. The reason: nothing in `docs/h7-platform/` states a load on the module's 3V3 that the bleeder serves. It was recorded as an analysis-level backstop to the single-sample bring-up gate (VREF-A-BACKFEED-GATE), the document that records it calls it "an option not adopted", and the back-feed it bounds comes from out-of-specification use of the expression jack, which VREF-A-BACKFEED-GATE carries.
- **Not changed:** VREF-A-BACKFEED-GATE stays open and is still the gate.
- **Set by:** the controller, H7 module plan Task 4.

### CR-MODULE-VIN-PROTECTION

**Nothing is fitted ahead of L_FILT beyond what [power.md](power.md) lists.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** the owner decision PW-NOTVS (power.md line 293) is no input TVS, provided the buck's VIN peak stays at or below about 28 V; the analysis gives 26.3 V at pin 39 (R-59). [open-items.md](open-items.md) MODULE-POWER-PARTS-TO-MODEL names only a 26.3 V rating for anything fitted at pin 39. The module's input network is R-48's unchanged: L_FILT, C_BIN1, C_BIN2, C_BINHF, R_DAMP, C_DAMP, with R_UV1 and R_UV2 on EN. A transcription adds no part the documents do not name.
- **Set by:** the controller, H7 module plan Task 4.

### CR-MODULE-HSE-LOAD

**The HSE load capacitors are 8 pF each, C0G, with no series resistor.**
- **Label:** Controller ruling (the owner may override). The values are stated in the source; the ruling records only that the module takes them.
- **Date:** 2026-11-12.
- **Decides:** [processor-and-memory.md](processor-and-memory.md) §3 (line 117) states "CL1 = CL2 = 8 pF C0G, no series resistor", from CL = 8 pF and Cs = 4 pF assumed, by CL = CL1·CL2/(CL1 + CL2) + Cs (AN2867 §3.3): 4 + 4 = 8. No value is derived here. Trimmed at bring-up (BU-05); Cs depends on the layout (HSE-CRYSTAL-CHECKS).
- **Set by:** the controller, H7 module plan Task 4.
- **Carried in:** `circuits/h7-platform/module-parts.ts` (`HSE_LOAD_CAP_F`).

### CR-MODULE-SWD-HEADER

**The SWD header is USB-06's pinout on `Connector:Conn_ARM_JTAG_SWD_10`.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** [schematic-checklist.md](schematic-checklist.md) USB-06 (line 215), [processor-and-memory.md](processor-and-memory.md) line 266: pin 1 VTref is the module's 3V3, 2 SWDIO (PA13), 3 and 5 GND, 4 SWCLK (PA14), 6 SWO not connected, 7 key not connected, 8 not connected, 9 GNDDetect to GND, 10 NRST. The stock symbol's ten pins are those functions (`1 VTref, 2 SWDIO/TMS, 3 GND, 4 SWCLK/TCK, 5 GND, 6 SWO/TDO, 7 KEY, 8 NC/TDI, 9 GNDDetect, 10 ~{RESET}`). The pins left open stay marked not connected.
- **Not settled:** the check against DDI0314H appendix C, which is not in hand (SWD-PINOUT-FORMAL-SPEC stays open).
- **Set by:** the controller, H7 module plan Task 4.
- **Carried in:** `circuits/h7-platform/module-parts.ts` (`SWD_HEADER_CONNECTIONS`).

### CR-MODULE-3V3-SUM

**The module's 3V3 capacitance is the sum over the domain the buck charges, found by topology; at most 150 µF (R-50).**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** `moduleCapacitance3v3` (`circuits/h7-platform/module-3v3-budget.ts`) walks from the 3V3 net (the contract's `3V3_D`) through two-terminal resistors and inductors, which takes in FB_VDDA and the damping leg's series resistor, and counts every capacitor with a pin on a net it reaches, at nominal, once. It stops at GND, at an `ic`, connector or switch, and at a capacitor, so VCAP (charged by the MCU's internal regulator) is out of the domain. A capacitor with no value, or any other kind of part on a domain net not listed with a reason, refuses. Two optional parameters: `knownNonCapacitive`, a part id mapped to the stated reason it is on a domain net and adds no capacitance, and `rootNet`, the net the walk starts from (`MODULE_3V3_NET` unless given). The module's own check (`tests/circuits/h7-module.test.ts`) passes neither; only the sum's unit tests do. `assertModuleCapacitanceWithinLimit` takes both and forwards both, so the sum it checks against 150 µF is the sum the walk gives. [power.md](power.md) line 183 uses this sum for the switch-on bound and [analog.md](analog.md) line 298 says the VDDA bank counts toward it; [CR-MODULE-VDDA-BANK](#cr-module-vdda-bank) puts 42.2 µF of it behind the bead and the 0.30 Ω resistor.
- **Over-counts, in the safe direction:** C_BST counts 100 nF, because the walk crosses L_BUCK to the switching node; and nominal values are not derated.
- **Settles:** the 150 µF half of MODULE-BUCK-LOOP-STARTUP: the module model's total is 116.8 µF, asserted in `tests/circuits/h7-module.test.ts` ("the sum is within 150 uF"). The loop and start-up check needs TI's application report or a simulation and stays open.
- **Set by:** the controller, H7 module plan Task 4.

### CR-MODULE-USB-C-PINS

**On the module's DFU socket J_USB_MOD, the GND pins go to GND, SBU1 and SBU2 are not connected, and the shell goes to GND through 1 MΩ in parallel with 4.7 nF.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** the pins of the HRO TYPE-C-31-E-17 (`Connector:USB_C_Receptacle_USB2.0_16P`) that [processor-and-memory.md](processor-and-memory.md) §8 (line 267) leaves unstated. A1, A12, B1 and B12 go to GND. A8 (SBU1) and B8 (SBU2) are not connected. The shell (SH) goes to GND through 1 MΩ in parallel with 4.7 nF. That is the treatment the carrier has ([CR-CARRIER-USB-C](#cr-carrier-usb-c)) and the pedal has ([schematic-checklist.md](schematic-checklist.md) USB-05), so the platform has one USB-C shell treatment. [CR-MODULE-USB-ESD](#cr-module-usb-esd) states that the module socket's shell connection "is not stated for the module and is not ruled here"; this ruling settles it.
- **Not settled:** the shield parts' ratings (USB-05 names a 2 kV capacitor for the pedal) and the footprint half of USB-DFU-VERTICAL.
- **Set by:** the controller, H7 module plan Task 6.
- **Carried in:** `circuits/h7-platform/module/usb-dfu.ts` (`j_usb_mod`, `r_shld`, `c_shld`).

### CR-MODULE-BEAD-VALUE

**A ferrite bead is drawn with its rated impedance as its value, never with henries; FB_VDDA reads "220R@100MHz".**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** FB_VDDA is an `inductor` in the model so that the 3V3 capacitance walk crosses it ([CR-MODULE-3V3-SUM](#cr-module-3v3-sum)), and its inductance is the analysis lower bound `BEAD_L_MIN_H`, 0.263 µH ([analog.md](analog.md) line 272), used only by that walk and the VDDA analysis. That figure is not the bead's rating. The rating, 220 Ω at 100 MHz ([analog.md](analog.md) line 242; [parts.md](parts.md) line 35 names the part, BLM21PG221SN1D, and not the rating), is carried in the part spec (`beadImpedance`), and `valueFor` (`lib/kicad/value-notation.ts`) writes it as the value of any inductor on `Device:FerriteBead` or `Device:FerriteBead_Small`. The same function supplies the drafted intent's value and the value the sheet-agreement check compares, so the page and the model cannot disagree. A bead with no rated impedance refuses, naming the part. No installed KiCad library carries a bead with an impedance value, so the spelling is chosen: the impedance in the resistance spelling, "@", and the frequency in MHz.
- **Set by:** the controller, H7 module plan Task 6.
- **Carried in:** `circuits/h7-platform/module-parts.ts` (`FERRITE_VDDA`); `lib/kicad/value-notation.ts`; tested in `tests/kicad/value-notation.test.ts`.

### CR-MODULE-PAGE-RAILS

**A module block page draws no rail power symbol; GND and the rails are labelled wires, joined through the root.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** on every h7-module block page, GND, 3V3_D, VREF_A and VIN_MOD are drawn as wires carrying the block's hierarchical label, never as power symbols, as design change C3 built it (`TOOLING.md`, "Multi-page drawing"). The reason: C3 says cross-page connections are never joined by matching names, and a power symbol joins every sheet by name around the root, so a missing rail boundary at the root would be hidden from every current control.
- **Costs if wrong:** the owner asks for power symbols on the module pages; then the drawing practice adds a fixture port that is not a rail and a rail-binding check, and the pages are redrawn.
- **Set by:** the controller, H7 module plan, after Task 5's review. Recorded here in Task 7, with the page that first rests on it.
- **Settled with it:** a `PWR_FLAG` is a symbol from KiCad's `power` library but joins no nets by name, so this ruling does not exclude it; where the module's flags go, and that each net carries at most one, is [CR-MODULE-PWR-FLAGS](#cr-module-pwr-flags).

### CR-MODULE-PWR-FLAGS

**Each h7-module net carries at most one PWR_FLAG across the module's hierarchy: GND's on the power page, every other shared net's on the root.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:**
  - A `PWR_FLAG` is admitted on a module page where ERC needs one: a net with a KiCad power input on it and no power output anywhere in the module reports `power_pin_not_driven` as an error without it. It joins no nets by name ([CR-MODULE-PAGE-RAILS](#cr-module-page-rails)).
  - Each net of the module carries at most one, across the whole hierarchy.
  - GND keeps its flag on the power page, which the owner approved with it and which is not redrawn. VIN_BUCK is private to the power block and keeps its own flag there.
  - Every other shared net ERC needs flagged gets its single flag on the module's ROOT sheet (Task 7e drew it): 3V3_D, VREF_A and VSSA, as `kicad-cli sch erc`'s `power_pin_not_driven` reports on the twelve drafts show, cross-checked against the exports' pin types. VSSA's report is on the mcu draft's unwired pin 37, which the model puts on VSSA. So a block page carries no flag on a shared net whose flag lives elsewhere.
- **Why:** two PWR_FLAGs on one net are an ERC `pin_to_pin` error, and moving GND's flag to the root would redraw an approved page. The error is MEASURED, not inferred, on one sheet and across sheets, with kicad-cli 10.0.5:
  - one sheet: the Task 7a review placed a second flag on the power page's own GND row and ERC reported a new `pin_to_pin`;
  - across sheets, on a copy of the two-block fixture (`tests/fixtures/two-block-board/`): one flag on GND in block a and one in block b gave, at the root, *"[error] pin_to_pin: Pins of type Power output and Power output are connected"* on `/a/`, between the two flags; one flag in block a alone gave 0 violations;
  - across sheets, on the module: the power page with an extra flag on 3V3_D, under a one-block root whose 3V3_D stub carries the root's flag, gave the same `pin_to_pin` on `/`.
- **Costs if wrong:** GND's flag sits on the power page while the others sit on the root, which is an inconsistency. If the owner wants them all in one place, the power page is redrawn and the table edited.
- **Set by:** the controller, H7 module plan, Task 7a fix round 1, after the task review (I1, I2).
- **Carried in:** the table `drafted/h7-platform/h7-module/repair/tools/pwr-flag-homes.ts`. `repair/tools/one-block-root.ts` puts a flag on a stub exactly when the net's flag lives off the block under check; `repair/tools/verify.sh` (`flag-check.ts`) fails a block page carrying a flag on a shared net whose flag lives elsewhere, naming the net; `repair/tools/erc-control.sh` holds a negative and a positive control. The root, which Task 7e assembled, places the root-held flags, and `repair/tools/verify-root.sh` checks exactly one PWR_FLAG per flagged net across the hierarchy, at its declared home (`hierarchy_flag_probe.py`, `hierarchy-flags.ts`; `drafted/h7-platform/h7-module/RECORD.md`).

### CR-MODULE-CROSS-PAGE-DRIVERS

**A block page's ERC under its one-block root takes a stand-in driver on each declared signal net whose driver is on another page; the module's real root must clear each with its real driver.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:**
  - One declared table lists each signal net whose driver is on another page: the net, the driving block, and the driving symbol pin, taken from the model with its source cited. It is declared, never derived by scanning drafts or pages. The table is `CROSS_PAGE_DRIVERS` in `drafted/h7-platform/h7-module/repair/tools/cross-page-drivers.ts`, which is the authority for its contents; each entry carries its source there. By group: FLASH_CLK, driven by the mcu page's U1 PF10 (the qspi page's entry, Task 7b); the SDRAM address, bank, byte-mask, clock and command nets whose only pin on the sdram page is a W9825G6KH input, each driven by the mcu page's U1 FMC pin (Task 7c); and NRST and BOOT0, U1's two input pins on the mcu page, driven on the reset_boot page by U5's ~{RESET} and SW2 (Task 7d).
  - Each entry is held to the model on every run: the driving block exists, the designator is a component of that block, the pin is on the entry's net in `h7Module()`, the driving block has a port on the net, and the pin's name is the one the installed KiCad symbol gives that number. An entry failing any of these is refused, naming what is missing.
  - The one-block root supplies a stand-in driver on the net's stub only when the block under check is not the driving block. The mcu page, when it is repaired, gets none for FLASH_CLK.
  - A PWR_FLAG is NOT the stand-in: these nets are signal nets, not power nets, and a PWR_FLAG would put a power output on a signal.
  - Step 4's real root ERC must clear each entry with its real driver, and the stand-in plays no part there (`drafted/h7-platform/h7-module/RECORD.md`, the section on what the root must do).
  - Entries come only from nets ERC reports on the pages being verified. A page that needs one adds it, with its source, when it is repaired.
- **Why:** on the qspi page (sha256 `a9578cf6b8bc881ce1cd57d98c862a80241e772c9e7e687195b897e33ca23ea1`), ERC under the one-block root reported `pin_not_driven` on *"Symbol U4 Pin 6 [CLK, Input, Line]"*. U4's CLK is the only pin of FLASH_CLK on that page, and its driver, U1's PF10, is on the mcu page, which a one-block root does not hold. Under a scratch root holding the mcu draft and the qspi page, `/qspi/` gave 0 errors and 0 warnings. The page is correct, and the check lacked the cross-page driver.
- **The stand-in, MEASURED with kicad-cli 10.0.5 on the qspi page under its one-block root:**
  - the root's FLASH_CLK sheet pin typed `output` instead of `input`: `/qspi/` still reports the same `pin_not_driven`. A sheet pin of type output is not counted as a driver, so that candidate is rejected;
  - no installed symbol has a single pin of type output or bidirectional: a scan of every top-level symbol under `/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols` found one-pin symbols only of types input (4), passive (13), power_in (101) and power_out (1, `power:PWR_FLAG`, excluded above). Every output-pin symbol with three pins or fewer carries two more pins, power_in, input or (for `Simulation_SPICE:VOLTMETER_DIFF`) passive, each of which would have to be tied off or driven on the root;
  - `Connector:TestPoint` (verified on disk in `Connector.kicad_sym`: one pin, number 1, `passive`, at the symbol origin), placed at the FLASH_CLK stub's label: `/qspi/` reports **0 errors and 0 warnings**, and `/` keeps only its `label_dangling` on FLASH_NCS's stub. KiCad's ERC counts a passive pin as driving an input; the page itself shows the same thing, since U4's /CS is not reported because R10's passive pin is on its net. Measured with the reference `DRV1` and with `#DRV1`, the same counts both times; the tool uses `#DRV<n>`, so the stand-in is plainly not a part.
  - So the stand-in is `Connector:TestPoint`. A passive pin cannot raise a `pin_to_pin` conflict, so a type conflict between a block's pin and its real driver is visible only at the real root, which is why the real root must clear each entry.
- **Costs if wrong:** one tooling revision. No page bytes change: the stand-in is placed only on the scratch root `verify.sh` builds.
- **Set by:** the controller, H7 module plan, Task 7b, on the qspi page's verify failure.
- **Carried in:** the table `drafted/h7-platform/h7-module/repair/tools/cross-page-drivers.ts`, beside `pwr-flag-homes.ts`, with its model check. `repair/tools/one-block-root.ts` places the stand-in; `repair/tools/erc_sheets.py` now prints each error on the block's sheet with the symbol and pin KiCad names; `repair/tools/erc-control.sh` holds a positive control (the committed qspi page verifies, `/qspi/` at 0 and 0) and two negatives (the table overridden through `H7_CROSS_PAGE_DRIVERS_TABLE` to omit FLASH_CLK fails with `pin_not_driven` on U4's CLK; an entry naming U1 pin 29, which the model puts on HSE_IN, is refused by the model check).

### CR-MODULE-PORT-LABEL-CHECK

**A block page fails verification when a port's hierarchical label sits on an exported net whose pins differ from the pins the model puts on that port's net within the block.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:**
  - The verifier checks it: `verify.sh` runs `block-netcompare.ts`, which, after the membership comparison, requires the kicad-cli export of the block sheet to carry a net named `/<port>` for every port `drawingPages()` gives the block, holding exactly that port's pins. The net names come from the export (`importNetlist`), never from a line pattern in the sheet. Exported alone, the block sheet is the root kicad-cli sees, so a label `NAME` names its net `/NAME`; a private net's label is its unprefixed model name (TOOLING.md, "Multi-page drawing"), which `drawingPagesFromNetwork` refuses to let equal a port name, so `/<port>` can only be the port's own net.
  - It covers two swapped labels (each port's net holds the other's pins), a label on the wrong wire (the pins differ), and a missing label (no net of that name). Each failure names the port, the pins expected and the pins found.
  - Generation checks the same: `Wiring.op_list` (`repair/tools/page.py`) refuses a label placed on the end of a wire drawn for any net other than the label's own.
- **Why:** the membership comparison cannot see it. A port reaching one pin is a one-member net, so swapping two such ports' labels leaves every net's membership unchanged, and `verify.sh` reported 0, 0, 0, 0 on such a page. That covers 34 of 35 ports on interface and 5 of 8 on qspi, and the mcu and sdram pages rely on it more (Task 7b review, I2). The committed pages were right; the tooling would not have caught it had they been wrong.
- **Costs if wrong:** one tooling revision. No page bytes change.
- **Set by:** the controller, H7 module plan, Task 7b fix round 1, on the Task 7b review's I2.
- **Carried in:** `drafted/h7-platform/h7-module/repair/tools/port-labels.ts` (the check), called by `block-netcompare.ts`; `repair/tools/page.py` (`Wiring.op_list`); controls in `repair/tools/port-label-control.sh`, called by `erc-control.sh` as control 13: all eight committed module pages verify with 0 ports on the wrong net; a scratch copy of interface with LED1 and LED2 swapped (one pin each, J1.5 and J1.4) fails naming both; a scratch copy of qspi with the FLASH_IO1 label deleted fails naming it; and `Wiring.op_list` refuses a synthetic label on another net's wire. The copies are made by `repair/tools/label_tamper.py`, which parses by parenthesis depth.

### CR-MODULE-VCAP-ERC

**The mcu page's one `pin_to_pin` error, between U1's VCAP1 and VCAP2, is admitted as one declared ERC allowance; the stock symbol is kept.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:**
  - The VCAP1–VCAP2 join is the documented circuit: [processor-and-memory.md](processor-and-memory.md) line 136 (VCAP1 pin 81 joined to VCAP2 pin 125), [schematic-checklist.md](schematic-checklist.md) CORE-04, and [D7](#d7). ERC's `pin_to_pin`, *"Pins of type Power output and Power output are connected"*, comes from the stock symbol `MCU_ST_STM32H7:STM32H743IITx`, which types both pins `power_out`, not from the circuit.
  - That error is admitted as ONE declared ERC allowance: sheet `/mcu/`, type `pin_to_pin`, between exactly U1 pin 81 and U1 pin 125.
  - `verify.sh` honours only that allowance, and names each violation it excuses, with this ruling's id, in its closing output. Any other error stays an error: any other `pin_to_pin`; the same type on other pins; the same pins on another sheet.
  - The module root's `.kicad_pro` carries the same single exclusion at Step 4, and no other (`drafted/h7-platform/h7-module/RECORD.md`, the section on what the root must do).
  - The stock symbol is kept. No project symbol is made, and the mcu page's bytes do not change (sha256 `c3d780a2ec08d385c4fe777c288f851f3c8803754cf995c6cb6f1da49539f981`).
- **Why:** the model joins the two pins on one net, VCAP (`circuits/h7-platform/module/mcu.ts`, `SUPPLY_NETS`), and no wiring of two `power_out` pins on one net avoids the error. The page's export agrees with the model with 0 disagreements; under its one-block root, `/mcu/` reported this one error and nothing else of error severity (Task 7d report).
- **History:** v1 carried this same exclusion, "awaiting an owner sign-off" ([schematic-checklist.md](schematic-checklist.md) ALL-07). This document lists `OWNER-DEFAULTS.md` ALL-07 as not carried (*What this document does not carry*, below), and that stays true of v1's sign-off: this ruling is the controller's, made afresh on the module page's own ERC report, not a carried owner approval. It is listed for the owner.
- **Costs if wrong:** the owner wants a project symbol that retypes VCAP. That means one C4 project symbol, a redraw of the mcu page, and removing this allowance.
- **Set by:** the controller, H7 module plan, Task 7d, on the mcu page's verify failure.
- **Carried in:** the one declared table `drafted/h7-platform/h7-module/repair/tools/erc-allowances.ts` (`ERC_ALLOWANCES`: sheet, type, the two (designator, pin number) pairs, the ruling id and the source). It is held to the model on every run: the sheet names a block of `h7Module()`, the designator is a component of that block, both pins are on VCAP in the model, and the installed symbol types each pin `power_out`; an entry failing any of these is refused, naming what is missing. `repair/tools/erc_sheets.py` excuses a violation only when the sheet, the type and exactly the two (designator, pin) pairs it parses from KiCad's items all match, prints each excused violation with the ruling id, fails an allowance matched by more than one violation, and reports an allowance that matched nothing on a sheet the run holds as stale without failing; the match is `repair/tools/erc_match.py`'s, which `root_erc.py` shares. `repair/tools/erc-control.sh` controls 14 to 17 and 20: the committed mcu page verifies and its closing lines name the excused violation; with the allowance removed through the `H7_ERC_ALLOWANCES_TABLE` test override the same run fails on `pin_to_pin`; an allowance naming U1 pins 81 and 126 is refused by the model check; and on synthetic reports other pins, another designator, another type, a third item, another sheet or the exact pair reported twice each fail, while a stale allowance is reported and passes; and the model check refuses, each alone, a stated pin type the symbol does not carry, a designator naming no component, and the same pin twice.

### CR-MODULE-ROOT-PROJECT-FILE

**The module's root sheet has a `.kicad_pro` committed beside it.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** *"Task 7 commits a .kicad_pro beside the module's root sheet, as the carrier page has one; the two-block fixture needs none (it is test data, and ERC already runs on it with defaults)."* The file carries nothing but the ERC exclusions the declared allowances admit ([CR-MODULE-VCAP-ERC](#cr-module-vcap-erc)); KiCad's defaults apply to everything else. `TOOLING.md`'s C3 note that no `.kicad_pro` is written beside a project stays true of the C3 tooling and the fixture.
- **Costs if wrong:** *"the owner opens a sheet with no project file."*
- **Set by:** the controller, H7 module plan, at Task 5's completion. The words above are the controller's, from the plan's progress log, now committed as [`progress.md`](../superpowers/plans/2026-11-12-h7-module-pages-execution/progress.md); recorded here in Task 7e, when the file was made.
- **Carried in:** `drafted/h7-platform/h7-module/h7-module.kicad_pro`, written by `repair/tools/kicad-pro.ts` and checked by `repair/replay.sh`.

### CR-MODULE-ROOT-FITS-LETTER

**The module root fits US Letter's inner frame, with every sheet symbol on the paper.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **What was wrong.** The root as assembled at Task 7e overshot US Letter by 779 mm, and 10 of its 12 sheet symbols lay off the paper (`root_sheets_fit.py` on that root: "2 of 12"). `tools/draught/assemble-root.ts` used a fixed arrangement: three blocks to a row, pins 200 mil apart down the left edge. The mcu sheet alone was 462 mm tall. `assemble-root.ts` is this repository's own tool, so making it fit is completing that tool's job, not a judgement of layout.
- **Decides:**
  - The arrangement fits the frame (`tools/draught/root-arrangement.ts`). It is deterministic, and it is a fixed rule computed from the blocks' port counts and the lengths of their texts:
    - Pins are 100 mil apart, and stubs are 200 mil long.
    - Each block is a cell: its box, its sheet name and file name, and its stubs and their labels.
    - Cells are packed tallest first, ties in `Network.blocks` order. Each goes at the first candidate point, smallest y then x, where it lies inside the frame, clear of the title block (measured in `docs/research/2026-10-30-letter-repaper.md` section 3), and at least 100 mil from every other cell.
    - A block with more ports than one edge holds within the frame carries the first half of its pins, in name order, down the west edge, and the rest down the east edge. On the module only mcu does: 45 and 45.
    - A board that cannot fit is refused, naming the block.
  - Two repair steps follow, because of what the first render showed:
    - **Pin names.** akcli 0.22.0 writes no justify on a sheet pin, so kicad-cli 10.0.5 centres a pin name about 1.45 mm inside the edge. A long name then crossed its box edge and its stub, and ran into its own label. `root_pin_justify.py` (now `draughting/repair/root_pin_justify.py`) justifies west-edge pins left and east-edge pins right, as KiCad's own files write them (810 sheet pins in KiCad's demo projects, read from the files).
    - **PWR_FLAGs.** With pins 100 mil apart, a PWR_FLAG drawn toward a neighbouring stub put its text on that stub's label. `repair/tools/root-flags.ts` now puts each root flag on the first stub label of its net that is the top pin of its edge (rotation 0), or else the bottom pin (rotation 180). That puts 3V3_D on mcu's west edge, VREF_A on decoupling's west edge, and VSSA on mcu's east edge.
  - After both steps, a measurement of the render's drawn text finds no two text boxes overlapping. The measure is `repair/tools/svg_stroked_text.py`, which `verify-root.sh` reports and does not judge.
  - `repair/tools/verify-root.sh` now judges the paper:
    - `draughting/measure/paper_fit.py` must report "fits: yes".
    - `root_sheets_fit.py` (now `draughting/measure/root_sheets_fit.py`) must find every sheet box inside the frame and clear of the title block. paper_fit.py does not measure a sheet box, and on the old root it said nothing about the 9 sheets off the paper.
    - `root-control.sh` control 10 moves one sheet off the paper in a scratch copy, and both checks must then fail.
- **What it changes.** The root's bytes and its two op-lists, `root/01-assemble.json` and `root/02-pwr-flags.json`. The two-block fixture's root and its `01-assemble.json` also change: they come from the same tool, and its controls pass. No block page changes.
- **Costs if wrong:** the owner wants another paper size or another arrangement. That means a rule change in one file and a regenerated root.
- **Set by:** the controller, H7 module plan Task 7e fix round 1.

### CR-MODULE-INDUCTANCE-NOTATION

**4.7 µH is drawn ".0047mH", as the existing inductance formatter writes it.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** L_FILT and L_BUCK (L1, L2 on the power page) keep the Value `lib/kicad/value-notation.ts` already writes for 4.7 µH. Changing the formatter is outside the H7 module plan and would change other boards' values.
- **Costs if wrong:** the owner asks for µH; a formatter change and redraws follow.
- **Set by:** the controller, H7 module plan Task 6.

### CR-MODULE-SUBOHM-RKM

**A resistor from 100 mΩ to 1 Ω is written in RKM notation ("0R22", "0R3").**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** the value notation is extended to 100 mΩ–1 Ω in RKM, tested, because the documents' R_DAMP 0.22 Ω ([power.md](power.md) line 270) and the ruled 0.30 Ω leg ([CR-MODULE-VDDA-BANK](#cr-module-vdda-bank)) must be drawn. The one changed test (0.5 Ω now "0R5") is the intended behaviour change.
- **Costs if wrong:** a `lib/` rule to revert and two Value fields.
- **Set by:** the controller, H7 module plan Task 6.
- **Carried in:** `lib/kicad/value-notation.ts`; R3 on the power page reads "0R22".

### CR-PEDAL-KINDS

**The pedal adds no model kind; each part type is built as an existing one.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:**
  - MOSFETs, the bypass relays, regulators, supervisors, logic, the isolation buffers, the USB switch, the ESD array, the bidirectional jack TVS (PESD12VL1BA, which has no anode and cathode), the oscillator, the ideal diode and the codec are `ic`, as the module and carrier build their buck, supervisor, USB switch and ESD part.
  - Diodes, Schottkys, Zeners and LEDs are `diode`, numbered `{ cathode: "1", anode: "2" }`. Every diode symbol the pedal uses has pin 1 named K and pin 2 named A on disk (`Diode:PMEG4030ER`, `Diode:1N4148W`, `Device:D`, `Device:D_Schottky`, `Device:D_Zener`, `Device:LED`).
  - The switching audio jacks are `switch` (a part that switches is not an inert connector, `lib/model/types.ts` `electricallyInert`). The control pots are `potentiometer`. The OPA1688 and MCP6001 are `opamp`.
  - **Which end of `Device:R_Potentiometer` is `ccw`.** Its graphics carry no rotation sense: a plain resistor body with pin 1 at its top end `(at 0 3.81 270)`, pin 3 at its bottom end `(at 0 -3.81 90)` and the wiper, pin 2, entering from the side `(at 3.81 0 180)` with the arrow. The pot's own data sheet was not fetched from the manufacturer. So this is a choice, not a reading: **ccw = pin 1, wiper = pin 2, cw = pin 3** (`POTENTIOMETER_PIN_NUMBERS`).
- **Costs if wrong:** for the pot, every control's direction reverses (a swap of two numbers and the footprint check at layout). For the kinds, a kind added later and the parts moved to it.
- **Set by:** the controller, h7 pedal pages plan Task 2.
- **Carried in:** `circuits/h7-platform/pedal-parts.ts`; tested in `tests/circuits/h7-pedal-parts.test.ts`.

### CR-PEDAL-PIN-MATCH

**A pedal part's symbol matches its data sheet when every pin agrees in number, name and electrical type, as stated here.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** how the amended rule of [CR-MODULE-SUPERVISOR-SYMBOL](#cr-module-supervisor-symbol) (names, numbers and types) is applied to the pedal, for its own stock symbols and stand-ins alike.
  - **Number:** exact. Where the manufacturer labels the leads but numbers none, the number comes from where the part's ruling says, and the ruling carries the cost.
  - **Hidden:** a symbol pin is hidden only where the part's ruling says so (the TPS7A49's PowerPAD, CR-PEDAL-SYMBOL-TPS7A4901). A hidden pin cannot be wired on a page, and a hidden `power_in` pin is an implicit global net in KiCad, so a stand-in that hides a pin does not match. *Added in the Task 2 review.*
  - **Name:** exact and case-sensitive, in KiCad's spelling: an overbar `~{…}` only where the data sheet's own figure or table draws one; a minus or en dash as ASCII `-`. KiCad's subscript markup `_{…}` is compared rendered (`V_{DD}` is the data sheet's subscripted VDD). An empty symbol name does not match a named pin.
  - **Type: the first clause that applies decides.** (1) A discrete or protection part's terminals (diode, relay, ESD array, TVS) are `passive`, except a MOSFET's gate, which is `input` (an insulated gate drawing only I_GSS). (2) A supply or ground pin is `power_in`. (3) A regulator's or ideal diode's output is `power_out`. (4) "No internal connection" is `free`, KiCad's "not internally connected"; "do not connect" is `no_connect`. (5) The data sheet's I/O column where it gives a direction: I `input`, O `output`, I/O `bidirectional`, an open-drain output `open_collector`. (6) Where the column gives none (TI's A, P or a dash), a pin whose only function is to take an external part (soft-start, bootstrap, timing or bias) or a thermal connection (an exposed pad) is `passive`. (7) Otherwise the description's own word: "input" `input`, "output" `output`. *Amended in the Task 2 review: the discrete-part clause was listed last, and in that order USBLC6-2SC6's GND would have been `power_in` where the table, and the stock symbol, have `passive`; clauses 6 and 7 are written out so that the order predicts TPS62933F's RT (passive) and SW (output).*
- **The documents read (2026-11-12), each fetched as a PDF:** TI SLAS533B (PCM3060), SBOS724A (OPA1688), SCES366L (SN74LVC3G34), SCES519O (SN74LVC1G34), SCES296AG (SN74LVC1G07), SCES200O (SN74LVC2G14), SBVS050N (TPS3808), SLVSES2J (TLV803E), SBVS121E (TPS7A49), SBVS386E (TPS7A24), SLUSEA4D (TPS62933F), SCDS220M (TS3USB221), SLVSEZ8A (LM66100), all from ti.com; Microchip DS20001733L (MCP6001) from microchip.com; Alpha & Omega AO3400A Rev 3.1, AO3401A Rev 3.1, AOD4185 Rev.4.2 and package outlines PO-00001 (SOT23) and PO-00009 (TO252) from aosmd.com; Diodes Inc. DS30086 Rev. 32-2 (1N4148W) and DS18004 Rev. 38-2 (BZT52C) from diodes.com; Omron Cat. No. K106-E1-11 (G6K) from omron.com; Epson SG-210STF brief from epsondevice.com. nexperia.com, st.com and kingbright.com refused or timed out, so these were read from LCSC's copies (datasheet.lcsc.com): Nexperia BAS116H Rev. 3, PMEG4005AEA v.4, PMEG4030ER v.4, PESDxL1BA Rev. 02, 2N7002 Rev. 7; ST USBLC6-2 Doc ID 11265 Rev 5; Kingbright WP7113ID DSAF0012 Rev V.13A; Epson SGxxxxCAN_E_Ver2.16; Murata JENF243A_0091C-01 (BLM31KN601SN1L). Each part's document, revision, page, table and URL are in `circuits/h7-platform/pedal-pin-tables.ts`.
- **Costs if wrong:** a rule loosened or tightened changes which parts need project symbols; each table and symbol is re-checked by the test.
- **Set by:** Drafted by the Task 2 implementer; adopted by the controller after the Task 2 review.
- **Carried in:** `circuits/h7-platform/pedal-pin-tables.ts`; `tests/circuits/h7-pedal-symbols.ts`.

### CR-PEDAL-SYMBOL-PROJECT

**Eleven pedal parts are drawn from project symbols, each generated from a stock symbol and its data sheet table.**
- **Label:** Controller ruling (the owner may override), under spec C4.
- **Date:** 2026-11-12.
- **Decides:** the parts below have no installed symbol that matches under [CR-PEDAL-PIN-MATCH](#cr-pedal-pin-match). A scan of all 22,734 installed symbols the pin reader accepts (50 more declare a pin number twice and are counted, not compared) finds none for any of them, and the same scan, as a control, does find `74xGxx:SN74LVC2G14DBV` and `Oscillator:SG-5032CAN`. Each project symbol in `circuits/h7-platform/h7-platform.kicad_sym` is the stock symbol named, flattened and renamed, its pins renamed and retyped from the table, Value, Datasheet and Description set to the part, Footprint emptied. Its geometry is the stock symbol's, except that a stock pin hidden as not connected is shown and moved to an empty place on the body edge, because it is a pin of the fitted part that a page may wire. The differences from each base, which the test asserts pin by pin, are the reason for each, and each part's entry below states them.
- **Shown drawable (C4):** `tests/circuits/h7-pedal-project-symbol-draw.test.ts` has the real copperhead draft each one with every pin on its own net, and the real kicad-cli export each pin with its data sheet name and type. It measured that kicad-cli writes a space in a pin name as "_" in the netlist (OPA1688's "OUT A" as "OUT_A"); the drafted page carries the space.
- **Regenerated:** `tests/circuits/h7-pedal-project-symbols.ts` makes them; `tests/circuits/h7-pedal-parts.test.ts` regenerates each and compares it with the committed library. The writer is `docs/superpowers/plans/2026-11-12-h7-pedal-pages-execution/task-2/write-project-symbols.ts`.
- **Set by:** the controller, h7 pedal pages plan Task 2.
- **Costs if wrong:** each part's entry below.

### CR-PEDAL-SYMBOL-PCM3060

**U_CODEC, PCM3060PWR is drawn from the project symbol `h7-platform:PCM3060PW`.**
- **Label:** Controller ruling (the owner may override), under spec C4 and [CR-PEDAL-SYMBOL-PROJECT](#cr-pedal-symbol-project).
- **Date:** 2026-11-12.
- **Decides:** `h7-platform:PCM3060PW` from `Audio:PCM3060`: pin 27 is `~{MS}/ADR/IFMD` (SLAS533B p. 7 and p. 8 Table 1; stock "AD"); pin 21 VCOM is `passive` (Table 1 gives it no direction; stock `output`).
- **Costs if wrong:** one project symbol to drop for the stock one, and the pages that use it redrawn.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-OPA1688

**U_VMID, U_IN, U_OUT and U_ADC, OPA1688IDR is drawn from the project symbol `h7-platform:OPA1688xD`.**
- **Label:** Controller ruling (the owner may override), under spec C4 and [CR-PEDAL-SYMBOL-PROJECT](#cr-pedal-symbol-project).
- **Date:** 2026-11-12.
- **Decides:** `h7-platform:OPA1688xD` from `Amplifier_Operational:OPA1692xD`, 3 units (A, B, supply): no stock OPA1688; the stand-ins name the pins `+`, `-` and nothing where SBOS724A p. 3 Table 6-1 names them +IN A, -IN A, OUT A (and B). `part.symbolPins` numbers each unit.
- **Costs if wrong:** one project symbol to drop for the stock one, and the pages that use it redrawn.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-SN74LVC3G34

**U_ISO_M, SN74LVC3G34DCTR is drawn from the project symbol `h7-platform:SN74LVC3G34DCT`.**
- **Label:** Controller ruling (the owner may override), under spec C4 and [CR-PEDAL-SYMBOL-PROJECT](#cr-pedal-symbol-project).
- **Date:** 2026-11-12.
- **Decides:** `h7-platform:SN74LVC3G34DCT` from `74xGxx:74LVC3G34`, 4 units: the stock gate pins are unnamed; SCES366L p. 3 names them 1A, 1Y, 2A, 2Y, 3A, 3Y. Its types matched. Stock unit 2 is gate 3 (pins 2, 6) and unit 3 is gate 2 (pins 3, 5); `part.symbolPins` keys the units by gate.
- **Costs if wrong:** one project symbol to drop for the stock one, and the pages that use it redrawn.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-SN74LVC1G34

**U_ISO_C, SN74LVC1G34DBVR is drawn from the project symbol `h7-platform:SN74LVC1G34DBV`.**
- **Label:** Controller ruling (the owner may override), under spec C4 and [CR-PEDAL-SYMBOL-PROJECT](#cr-pedal-symbol-project).
- **Date:** 2026-11-12.
- **Decides:** `h7-platform:SN74LVC1G34DBV` from `74xGxx:74LVC1G34`: pins 2 (A) and 4 (Y) are unnamed on the stock symbol, where SCES519O p. 3 Table 4-1 names them A and Y. Its numbers and types match.
- **Costs if wrong:** one project symbol to drop for the stock one, and the pages that use it redrawn.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-SN74LVC1G07

**U_MIDIDRV, SN74LVC1G07DBVR is drawn from the project symbol `h7-platform:SN74LVC1G07DBV`.**
- **Label:** Controller ruling (the owner may override), under spec C4 and [CR-PEDAL-SYMBOL-PROJECT](#cr-pedal-symbol-project).
- **Date:** 2026-11-12.
- **Decides:** `h7-platform:SN74LVC1G07DBV` from `74xGxx:74LVC1G07`: pins 2 (A) and 4 (Y) are unnamed on the stock symbol, where SCES296AG p. 3 Pin Functions names them A and Y. Its numbers and types match, Y `open_collector`.
- **Costs if wrong:** one project symbol to drop for the stock one, and the pages that use it redrawn.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-TPS3808G01

**U_PF, TPS3808G01DBVR is drawn from the project symbol `h7-platform:TPS3808G01DBV`.**
- **Label:** Controller ruling (the owner may override), under spec C4 and [CR-PEDAL-SYMBOL-PROJECT](#cr-pedal-symbol-project).
- **Date:** 2026-11-12.
- **Decides:** `h7-platform:TPS3808G01DBV` from `Power_Supervisor:TPS3808DBV`: RESET "is an open-drain output" (SBVS050N p. 4 Table 5-1), `open_collector`; the stock symbol types it `output`, the defect [CR-MODULE-SUPERVISOR-SYMBOL](#cr-module-supervisor-symbol) found in TPS3839DBZ.
- **Costs if wrong:** one project symbol to drop for the stock one, and the pages that use it redrawn.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-TPS7A4901

**U_LDO, TPS7A4901DGNR is drawn from the project symbol `h7-platform:TPS7A4901DGN`.**
- **Label:** Controller ruling (the owner may override), under spec C4 and [CR-PEDAL-SYMBOL-PROJECT](#cr-pedal-symbol-project).
- **Date:** 2026-11-12.
- **Decides:** `h7-platform:TPS7A4901DGN` from `Regulator_Linear:TPS7A4101DGN`: pin 6 is NR/SS (`passive`) and pin 7 DNC (`no_connect`) per SBVS121E p. 4, which the stock symbol hides as NC; pin 3 NC is "not internally connected" (`free`); pin 9 is PowerPAD, stacked under GND pin 4 as the stock symbol draws it, which is how the pedal wires it ([schematic-checklist.md](schematic-checklist.md) PWR-08). Pins 3, 6 and 7 are moved to the body edge and shown.
- **Costs if wrong:** one project symbol to drop for the stock one, and the pages that use it redrawn.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-TPS7A2433

**U_CVDD, TPS7A2433DBVR is drawn from the project symbol `h7-platform:TPS7A2433DBV`.**
- **Label:** Controller ruling (the owner may override), under spec C4 and [CR-PEDAL-SYMBOL-PROJECT](#cr-pedal-symbol-project).
- **Date:** 2026-11-12.
- **Decides:** `h7-platform:TPS7A2433DBV` from `Regulator_Linear:TLV70033_SOT23-5` (no stock TPS7A24, same pin roles): pin 4 is "No internal connection" (SBVS386E p. 3 Table 5-1), `free`, and shown.
- **Costs if wrong:** one project symbol to drop for the stock one, and the pages that use it redrawn.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-LM66100

**U_REFBLK, LM66100DCKR is drawn from the project symbol `h7-platform:LM66100DCK`.**
- **Label:** Controller ruling (the owner may override), under spec C4 and [CR-PEDAL-SYMBOL-PROJECT](#cr-pedal-symbol-project).
- **Date:** 2026-11-12.
- **Decides:** `h7-platform:LM66100DCK` from `Power_Management:LM66100DCK`: pin 4 is "N/C", "Not internally connected" (SLVSEZ8A p. 3), `free`, and shown, since the pedal ties it to GND ([analog.md](analog.md) line 314).
- **Costs if wrong:** one project symbol to drop for the stock one, and the pages that use it redrawn.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-MCP6001

**U_EXP, MCP6001T-I/OT is drawn from the project symbol `h7-platform:MCP6001T-OT`.**
- **Label:** Controller ruling (the owner may override), under spec C4 and [CR-PEDAL-SYMBOL-PROJECT](#cr-pedal-symbol-project).
- **Date:** 2026-11-12.
- **Decides:** `h7-platform:MCP6001T-OT` from `Amplifier_Operational:MCP6001-OT`: DS20001733L p. 11 Table 3-1 names the pins VOUT, VSS, VIN+, VIN-, VDD; the stock symbol has nothing, V-, +, -, V+.
- **Costs if wrong:** one project symbol to drop for the stock one, and the pages that use it redrawn.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-PESD12VL1BA

**The jack ESD diodes, PESD12VL1BA,115 is drawn from the project symbol `h7-platform:PESD12VL1BA`.**
- **Label:** Controller ruling (the owner may override), under spec C4 and [CR-PEDAL-SYMBOL-PROJECT](#cr-pedal-symbol-project).
- **Date:** 2026-11-12.
- **Decides:** `h7-platform:PESD12VL1BA` from `Device:D_TVS`: Nexperia's pinning table gives "cathode 1" and "cathode 2" (PESDxL1BA Rev. 02, Table 2), written K1 and K2 with Nexperia's own K for cathode (PMEG4005AEA v.4 Table 2); the stock symbol says A1, A2.
- **Costs if wrong:** one project symbol to drop for the stock one, and the pages that use it redrawn.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-TLV803EA29

**U_CRST, TLV803EA29DBZR, is drawn from the module's project symbol `h7-platform:TLV803EA30DBZR`.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** the pedal's supervisor is TLV803EA29DBZR ([parts.md](parts.md) §3, U_CRST), checked in the sources before this ruling. SLVSES2J p. 26 section 12.1.1 reads "TLV803EA29DBZR is open-drain, active-low, … Pin 1 = GND", the same DBZ pins (p. 5 Table 6-1, "DCK, DBZ") and output stage as the module's TLV803EA30DBZR. The module's symbol matches by name, number and type, so it stands in; the value field and `mpn` say which part is fitted. The control in `tests/circuits/h7-pedal-parts.test.ts`: `Power_Supervisor:TPS3839DBZ` is rejected for this part with exactly one difference, pin 2 typed `output`.
- **Costs if wrong:** none beyond a renamed symbol: both parts' pins are the same.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-SG-210STF

**U_XO, Epson X1G0041710019 (SG-210STF), is drawn from the stand-in `Oscillator:SG-5032CAN`.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** the SG-210STF's own stock symbol differs from Epson's pin map only in pin 4's case, "Vcc" against "VCC" (Epson SG-210STF brief p. 2 Pin Map; SGxxxxCAN_E_Ver2.16 p. 2 Terminal Assignment). Under [CR-PEDAL-PIN-MATCH](#cr-pedal-pin-match) names are case-sensitive, and Epson's SG-5032CAN symbol, the same four pins, matches by name, number and type, so it stands in before a project symbol is made. Its stock Footprint field names the 5032 package; no footprint is taken from it.
- **Costs if wrong:** if case is ruled not to matter, the own symbol replaces it, one symbol swap.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-AO3400A

**The AO3400A and AO3401A use their own stock symbols, numbered G 1, S 2, D 3; Alpha & Omega does not number the pins.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** AO3400A Rev 3.1 and AO3401A Rev 3.1, p. 1, label the SOT23 leads D, G and S in a top-view drawing and number none; the SOT23 outline PO-00001 numbers none either. The numbers are read from that drawing: the pin-1 dot sits at the G lead, and D is the lead alone on its side, which is pin 3 in Nexperia's SOT23 numbering (2N7002 Rev. 7 Table 2: 1 G, 2 S, 3 D). That gives 1 G, 2 S, 3 D, which is the stock `Transistor_FET:AO3400A` and `AO3401A`. **The numbering is an inference from a drawing, not a stated table.**
- **Costs if wrong:** gate and source swapped on the footprint for the five AO3400A N-MOSFETs, Q_PFG, Q_PFR, Q_VDIS, Q_MSWD and Q_BYP ([parts.md](parts.md) lines 61 and 123), and the AO3401A Q_MIDI (line 141); the schematic's connectivity is unchanged, and the layout's footprint check would have to catch it.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-AOD4185

**Q_MSW, AOD4185 (TO-252), is drawn from `Transistor_FET:Q_PMOS_GDS`: 1 G, 2 D, 3 S.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** there is no AOD4185 symbol. AOD4185 Rev.4.2 p. 1 labels the TO252 leads G and S with the tab D, and the TO-251A version's three leads G, D, S in order; it numbers none, and the outline PO-00009 numbers none. Reading the leads in that order gives 1 G, 2 D (the centre lead, the tab), 3 S, which the generic `Q_PMOS_GDS` has (gate `input`, drain and source `passive`). **The numbering is an inference from a drawing.**
- **Costs if wrong:** the load switch's gate and source swapped on the footprint; caught only at layout.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-SYMBOL-DIODES

**Four diodes without a stock symbol of their own use generic Device symbols; three manufacturers do not number the terminals.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-12.
- **Decides:** PMEG4005AEA (D_CVCL, D_RCLAMP) uses `Device:D_Schottky`, BAS116H (D_PFCL, D_SS, D_GS) `Device:D`, BZT52C12-7-F (D_BZ_IN, D_BZ_OUT) `Device:D_Zener` (the stock `Diode:BZT52Bxx` names the B tolerance, not the fitted C), and WP7113ID (LED1, LED2) `Device:LED`. Each has pin 1 K, pin 2 A, both `passive`. Nexperia numbers its terminals (PMEG4005AEA v.4 and PMEG4030ER v.4 Table 2, 1 K cathode, 2 A anode; BAS116H Rev. 3 Table 2, 1 cathode, 2 anode). Diodes Inc. (DS30086 Rev. 32-2, DS18004 Rev. 38-2: "Polarity: Cathode Band") and Kingbright (DSAF0012 Rev V.13A p. 1: the cathode lead labelled) say which terminal is the cathode and number neither; their numbers are [CR-PEDAL-KINDS](#cr-pedal-kinds)'s cathode 1, anode 2.
- **Costs if wrong:** for the unnumbered three, a diode reversed on the footprint, caught at layout.
- **Set by:** the controller, h7 pedal pages plan Task 2.

### CR-PEDAL-DC-JACK

**The pedal's DC jack is drawn from the generic 2-pin `Connector:Barrel_Jack`, with no part number: centre pin GND, sleeve VIN, no switch contact.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** J_DC uses `Connector:Barrel_Jack` (checked on disk), with no MPN, because a schematic needs none (CLAUDE.md, G245) and the only part named, the PJ-057AH, is a study assumption ([parts.md](parts.md) line 134; open item DC-JACK-FIT). Pin 1 is drawn as the centre pin (its graphic is the rounded centre contact at the top of the symbol) and goes to GND; pin 2, the sleeve contact, goes to VIN, as PWR-01 states the polarity: "centre pin GND, sleeve +V" ([schematic-checklist.md](schematic-checklist.md) line 117). Which pin is the centre is read from the symbol's graphics, not from a part's drawing. **No switch contact is used**: no document in `docs/h7-platform/` connects one, so `Barrel_Jack_Switch` would add a pin with nothing on it. Carried in `circuits/h7-platform/pedal-rulings.ts` (`DC_JACK`).
- **Not settled by this:** DC-JACK-FIT, which closes only in phase 4 on a chosen part, its footprint and a plug fitted by hand.
- **Costs if wrong:** if the chosen part numbers its centre pin 2, the two nets swap on one symbol, caught when the footprint is chosen; if a later source uses a switch contact, the symbol becomes `Barrel_Jack_Switch` and one pin is added.
- **Set by:** the controller, h7 pedal pages plan Task 3.

### CR-PEDAL-FB-IN

**FB_IN sits in series on the input path both branches share, between the jack node VIN and the node the two Schottkys take; C_SCH is on VIN and C_PROTHF on VIN_A.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** "Where FB_IN sits on the split pedal is an S2 choice" ([power.md](power.md) line 28). It is ruled here:
  - **FB_IN** (BLM31KN601SN1L, [parts.md](parts.md) line 58) runs from **VIN**, the jack node and the supervisor's sense point (power.md lines 25 and 47), to a new node **VIN_FB**, which takes the anodes of D_AIN and D_MIN.
  - **C_SCH** (100 nF 50 V X7R, parts.md line 82) is on VIN, the ferrite's jack side, as v1 put it on the ferrite's input side ([POWER.md §1](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/POWER.md), "C39 (C_SCH) … FB2 (FB_IN)").
  - **C_PROTHF** (the same part) is on VIN_A beside C_PROT, where v1 had it beside C_PROT on VIN_PROT, which the split renames VIN_A (power.md line 26).
- **Why there:** the hot-plug analysis behind HOT-PLUG-PEAK models "an optional ferrite 0–3 µH" (power.md line 295) as part of one series path from the source to the diode pair: the pinned model's own description is "a series inductance and resistance (cable plus any ferrite), and one or two Schottky branches" ([hotPlug.ts](https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/circuit/analysis/hotPlug.ts), lines 2–3). This position is the one that grid covers; a ferrite in one branch only is a circuit the analysis did not model. It is also v1's arrangement carried across the split: on v1 the ferrite was on the path every load shared, so it filtered the switching regulator's conducted emission as well as the analog branch's; ahead of the per-branch diodes is where that path now is. C_SCH ahead of the diodes sees a reversed plug: as a non-polar 50 V ceramic it takes −18 V within the rating power.md line 498 gives the input HF capacitor, and the jack's 24.64 V hot-plug extreme (power.md §4.5) is under 50 V.
- **Not modelled by the analysis, recorded:** C_SCH's 100 nF between the cable and the ferrite (the model lumps the two), as v1's model did. HOT-PLUG-PEAK stays open; it closes on BU-25, not on this ruling.
- **Costs if wrong:** one ferrite and two capacitors move between three nets on one page, and VIN_FB disappears if the ferrite moves into a branch; the hot-plug grid would then not cover the position.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-rulings.ts` (`FB_IN_POSITION`).

### CR-PEDAL-CHASSIS-PAD

**The chassis-bond GND pad is not a model part.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** [PW-CHASSIS](#pw-chassis)'s "dedicated GND solder pad (plated through-hole, Ø2.5 mm pad, 1.2 mm drill) near the DC jack" ([power.md](power.md) line 533; [layout-carry-forward.md](layout-carry-forward.md) line 71) is pad geometry on the GND net, which is layout: a wire from the enclosure lug lands on it. It joins no two nets and carries no value, so a model part for it would add a single pin to GND and nothing else. It goes on the board as a pad in phase 4, from layout-carry-forward.md line 71.
- **Costs if wrong:** one `Connector:TestPoint`-like part on GND added to the power-entry page.
- **Set by:** the controller, h7 pedal pages plan Task 3.

### CR-PEDAL-LOGIC-DECOUPLING

**U_ISO_M, U_ISO_C and U_MIDIDRV each take 100 nF at their VCC pin, as each part's data sheet recommends.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** no document in `docs/h7-platform/` gives these values. Each data sheet was fetched on 2026-11-13 from ti.com and read:
  - U_ISO_M, SN74LVC3G34DCTR, on 3V3_D ([architecture.md](architecture.md) line 255): TI SCES366L (rev. October 2015) p. 10, §10 Power Supply Recommendations: "For devices with a single supply, a 0.1-μF capacitor is recommended" (https://www.ti.com/lit/ds/symlink/sn74lvc3g34.pdf).
  - U_ISO_C, SN74LVC1G34DBVR, on 3V3_CODEC (architecture.md line 256): TI SCES519O (rev. October 2025) p. 15, §8.3: "A 0.1μF capacitor is recommended for this device" (https://www.ti.com/lit/ds/symlink/sn74lvc1g34.pdf).
  - U_MIDIDRV, SN74LVC1G07DBVR, on 3V3_D ([parts.md](parts.md) line 139): TI SCES296AG (rev. October 2025) p. 11, §8.3: "A 0.1-μF capacitor is recommended for devices with a single supply" (https://www.ti.com/lit/ds/symlink/sn74lvc1g07.pdf).
  Each part has one VCC pin, so each takes one 100 nF capacitor from VCC to GND. The data sheets' optional 1 µF in parallel is not fitted.
- **Not settled by this:** the two 100 nF on 3V3_D count toward its 10 µF external-capacitance limit ([R-24](#r-24)); the pedal's total is for the block models to sum.
- **Costs if wrong:** a capacitor value on three parts.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-rulings.ts` (`LOGIC_DECOUPLING`).

### CR-PEDAL-TEST-PADS

**The pedal's test pads: power pads on VIN, VIN_A, VIN_MOD, 5V_A and 3V3_D with a GND pad, and the four audio pads each with a GND pad beside it.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** the pedal half of TEST-PAD-SPLIT, and so the pedal's side of the conflict entry on the v1 test pads ([open-items.md](open-items.md)), which says "Assigning them is a design choice, not a reading of the sources". The split spec says the pedal "keeps the power and audio pads" ([architecture.md](architecture.md) line 344; [layout-carry-forward.md](layout-carry-forward.md) line 88). Each pad is a `Connector:TestPoint`. Each v1 pad ([layout-carry-forward.md](layout-carry-forward.md) line 88), placed or dropped:
  - **VIN before the Schottky** → VIN, still the node before both Schottkys ([CR-PEDAL-FB-IN](#cr-pedal-fb-in)).
  - **VIN_PROT** → VIN_A, VIN_PROT's split name ([power.md](power.md) line 26).
  - **5V_A** → 5V_A. **3V3_D** → 3V3_D: the audio board is tested first with a real Seed ([O-9](#o-9)), which carries none of our module's pads, and 3V3_D is the pedal's logic supply.
  - **GND** (the grid's) → one GND pad.
  - **Added: VIN_MOD**, because BU-25 scopes VIN_MOD at pin 39 ([bring-up.md](bring-up.md) line 88) and TEST-PAD-SPLIT asks for the pads its measurements need.
  - **Audio:** an input pad on each channel's R_RF/C_RF node (AIO-02, [schematic-checklist.md](schematic-checklist.md) line 152; nets named IN_RF_L and IN_RF_R here, since no document names that node) and an output pad on each FX_OUT_x (AIO-17, line 167), each with a GND pad beside it.
  - **Dropped, with the reason:** SWDIO, SWCLK and NRST (the SWD header and its pogo pads go to the module, split spec §6.1; `circuits/h7-platform/module/swd.ts`); BOOT0, VDDA and VCAP ([D15](#d15) keeps them on the module); VIN_BUCK (the module's input network, power.md line 29, not a pedal net).
- **Not settled by this:** whether the pads form a pogo grid, and where they sit (layout); the module half of TEST-PAD-SPLIT.
- **Costs if wrong:** test points added or removed on the power-entry, input and output pages; nothing in the circuit changes.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-rulings.ts` (`TEST_PADS`).

### CR-PEDAL-HW-REV

**The pedal's HW_REV strap is revision 1's divider: 20.0 kΩ from VREF_A to HW_REV, 2.49 kΩ to GND, 100 nF at the pin.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** [analog.md](analog.md) §11 gives the divider, VREF_A to GND with 100 nF at pin 29 (line 347), and revisions 1 to 8 (line 351 onward), and "the sources read do not say which code each split board carries". The pedal is the first build, so it takes revision 1, the same row and the same reasoning as the module's [CR-MODULE-ID-STRAP-VALUES](#cr-module-id-strap-values). The values are read from the module's `ID_STRAP` constant, not retyped. Any other row is as faithful.
- **Costs if wrong:** two resistor values; firmware reads another code.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-rulings.ts` (`HW_REV_STRAP`).

### CR-PEDAL-CONTROL-NODE

**Each control position is drawn as one node joining the pot's wiper, R_PUn, the button and R_POSn; the button returns through R_BTNn to GND; both fits are drawn at every position.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** no document draws the node; it is assembled from [power.md](power.md) line 417 ("R_PUn 10.0 kΩ to 3V3_D, R_BTNn 1.00 kΩ to GND, R_POSn 10.0 kΩ to the pin") and [architecture.md](architecture.md) line 230 ("a press draws at most 3.513 V / 1.00 kΩ = 3.5 mA through the always-fitted 1.00 kΩ resistor"). For position n:
  - **POSn_NODE** joins the pot's wiper, R_PUn (10.0 kΩ from 3V3_D), one side of the button and R_POSn.
  - The button's other side is **POSn_BTN**, which R_BTNn (1.00 kΩ) takes to GND. R_BTNn's far end is GND, as power.md line 417 states it.
  - R_POSn (10.0 kΩ) runs to the contract pin **POSn**, where C_POSn (100 nF) goes to GND ([analog.md](analog.md) line 364).
  - The pot (RV16AF-41 B10K) runs from **ccw = GND to cw = VREF_A** ([analog.md](analog.md) line 364: "from VREF_A to GND"). Which end is cw is a choice: turning clockwise raises the reading.
  - **Both fits are drawn at every position.** Each position "carries the pot footprint and the button footprint", and the per-effect fit is a KiCad design variant that marks parts fitted or Do Not Populate per symbol instance ([mechanical-and-controls.md](mechanical-and-controls.md) line 298), so every symbol of both fits is on the schematic. The union is the circuit architecture.md line 230 already bounds ("with a pot and a button both fitted … at most 3.5 mA"). The page notes that each position is fitted with a pot or a button per effect (open item CONTROL-POSITION-VARIANTS, phase 4). These are variant positions, not [CR-PEDAL-POPULATION](#cr-pedal-population)'s not-fitted parts.
- **Costs if wrong:** for the order of the button and R_BTNn, two nets swap names on six positions; for the pot's direction, every control reverses (firmware can invert it); for drawing both fits, a check of the default build (Task 8) has to know the six positions are variants.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-rulings.ts` (`CONTROL_POSITION`, `controlPositionNets`).

### CR-PEDAL-FOOTSWITCH

**Each footswitch input is a 2-pad connector on the pedal: pin 1 the switch node, pin 2 GND.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** "FSWn and GND cross on a 2-pin 2.54 straight header soldered through both boards", and "the audio board gets the header's two through-holes" ([mechanical-and-controls.md](mechanical-and-controls.md) line 398). The pedal side is modelled as a 2-pin connector, `Connector_Generic:Conn_01x02` (the carrier's `HEADER_2`), per input. Pin 1 is the switch node, named **FSW1_SW** / **FSW2_SW** here: the node with the 10.0 kΩ pull-up and 100 nF ([power.md](power.md) line 415), ahead of R_FSWn (1.20 kΩ) to the contract net FSWn. Pin 2 is GND. The switch is on the hung board and is not on the pedal's model.
- **Costs if wrong:** one symbol per input; pin 1 and pin 2 swapped is caught at layout.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-rulings.ts` (`FOOTSWITCH_CONNECTION`).

### CR-PEDAL-LED-MOSFET

**The LED switches are AO3400A, gate through 100 Ω, 10.0 kΩ gate pull-down.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** CTL-05 names only v1's BSS138-7-F ([schematic-checklist.md](schematic-checklist.md) line 187), and records that its RDS(on) at a 3.3 V gate is typical only. The split's N-MOSFET everywhere else on the pedal is the AO3400A ([parts.md](parts.md) line 61; Q_BYP, line 123), with the stock symbol and pin numbers of [CR-PEDAL-SYMBOL-AO3400A](#cr-pedal-symbol-ao3400a); no source names another part for the LEDs. The gate series resistor is **100 Ω**, the value [architecture.md](architecture.md) line 266 used to compute the LED gates' 60.8 kΩ onboard-pull margin ("with CTL-05's 100 Ω"); the pull-down is [R-13](#r-13)'s 10.0 kΩ.
- **Costs if wrong:** a part number on two positions; another MOSFET's pinout may change the symbol.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-rulings.ts` (`LED_SWITCH`).

### CR-PEDAL-USB-C

**The pedal's USB-C receptacle is the stock `Connector:USB_C_Receptacle_USB2.0_16P`, with no part number.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** the receptacle takes USB-01's wiring ([schematic-checklist.md](schematic-checklist.md) line 207), USB-02's VBUS (line 208) and USB-05's shield (line 214), on the symbol the carrier and module use ([CR-CARRIER-USB-C](#cr-carrier-usb-c)). No MPN, because a schematic needs none (G245); v1's HC-TYPE-C-16P-01A is named only as "v1 contained".
- **Costs if wrong:** none for the schematic; a part number at the BOM.
- **Set by:** the controller, h7 pedal pages plan Task 3.

### CR-PEDAL-USBSW

**On the pedal, U_USBSW's S pin goes to GND, its second port is unused, and VCC takes 100 nF: the carrier's rulings.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** the switch has the same role on the pedal as on the carrier, between J_MOD pins 36/37 and the ESD part and receptacle ([R-14](#r-14); [architecture.md](architecture.md) line 258), so [CR-CARRIER-USBSW-SELECT](#cr-carrier-usbsw-select) (S to GND selects port 1, TI SCDS220M Table 7-1; 2D+/2D− not connected) and the carrier's 100 nF at VCC (SCDS220M p. 15 §8.3) carry to the pedal. The capacitor's value is read from the carrier model, not retyped.
- **Costs if wrong:** one pin's net and one capacitor, on the carrier as well.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-rulings.ts` (`PEDAL_USB_SWITCH`).

### CR-PEDAL-VBUS-SENSE-CAP

**R-57's sense-node capacitor is fitted on the pedal: 100 nF from USB_VBUS_SENSE to GND, the carrier's part.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** the pedal fits `c_vbus_sense`, the carrier's [CR-CARRIER-VBUS-SENSE-CAP](#cr-carrier-vbus-sense-cap) value (100 nF X7R, [parts.md](parts.md) line 177's option), from USB_VBUS_SENSE (pin 31) to GND. The pedal's divider is the carrier's, 12.0 kΩ over 20.0 kΩ, 1 % ([architecture.md](architecture.md) line 257), so `vbusSenseAnalysis`'s windows hold for it unchanged and were not re-run; `tests/circuits/h7-pedal-rulings.test.ts` compares the pedal's divider and capacitor with the carrier's model, and fails if they part.
- **Which board owes the fix** (the inventory's conflict 6.3): [analog.md](analog.md) FIG-VBUS-HOTPLUG says "the module design … fits C_VBUS", and VBUS-HOTPLUG says "fitted in the phase-2 pedal model and the carrier model". The divider and the sense node are on the pedal and the carrier, not the module, so the pedal and the carrier owe it; the open-items row is followed.
- **Not settled by this:** whether a real host and cable stay inside the windows. VBUS-HOTPLUG stays open, as it does for the carrier.
- **Costs if wrong:** one capacitor, and a delay on the VBUS-present reading the carrier's test already states.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-rulings.ts` (`VBUS_SENSE_CAP`).

### CR-PEDAL-VBUS-IDS

**The two capacitors both called C_VBUS take the carrier's ids: `c_vbus` at the USBLC6-2's pin 5, `c_vbus_sense` on USB_VBUS_SENSE.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** USB-04's C_VBUS ([schematic-checklist.md](schematic-checklist.md) line 213) is `c_vbus`; the sense-node option of [parts.md](parts.md) line 177 and VBUS-HOTPLUG is `c_vbus_sense`, as the carrier names them (the row itself says "a model gives them distinct ids").
- **Costs if wrong:** two ids renamed.
- **Set by:** the controller, h7 pedal pages plan Task 3.

### CR-PEDAL-MIDI

**MIDI on the pedal: the not-fitted 4-pin header and R-26's MIDI OUT driver and switch are drawn; the connector carrying the loop and the MIDI IN receiver are not.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:**
  - [OWN-04](#own-04)'s unpopulated header governs: USB-08's 1 × 4 header, 1 = 3V3_D, 2 = MIDI_UART_TX, 3 = MIDI_UART_RX, 4 = GND ([schematic-checklist.md](schematic-checklist.md) line 217). OWN-04 is itself a controller ruling under an ambiguous heading, so it binds here as the standing ruling, and the owner may override it. The header is modelled and drawn, not fitted ([CR-PEDAL-POPULATION](#cr-pedal-population)).
  - [R-26](#r-26)'s MIDI OUT driver and switch are drawn up to the nets the sources name ([power.md](power.md) line 460): U_MIDIDRV and R_TXPU on 3V3_D, Q_MIDI, R_MGP, RA (four 130 Ω) and RC. RA's far end is "MIDI pin 4" and RC's far end "pin 5"; the nets are named **MIDI_PIN4** and **MIDI_PIN5** here.
  - **The connector that carries MIDI pins 4 and 5 is not drawn.** No source names it: the header carries neither 3V3_P nor the loop (the inventory's conflict 6.4), and the CA-033 ferrites "go at the jack" ([open-items.md](open-items.md) line 62) of a jack no document names. It is not invented. The page says so, and the open row MIDI-OUT-CONNECTOR records the gap for the owner.
  - **The MIDI IN receiver is not drawn** until MIDI-IN-RECEIVER-STOCK closes (spec, lines 347–348); its network is not in the repository.
  - U_MIDIDRV's decoupling is [CR-PEDAL-LOGIC-DECOUPLING](#cr-pedal-logic-decoupling)'s.
- **Costs if wrong:** if the owner names a MIDI jack, MIDI_PIN4 and MIDI_PIN5 land on it and the ferrites are added; if he wants the loop on the header, the header grows two pins and OWN-04's pinout changes.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-population.ts` (`MIDI`).

### CR-PEDAL-I2C-EXPANSION

**No I²C expansion connector is drawn: no source names one.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** the pedal carries the expansion bus's pull-ups, 2.40 kΩ to 3V3_D ([power.md](power.md) line 413; [architecture.md](architecture.md) line 342), and the codec's not-fitted links. Where an expansion device connects is in no document, so no connector is invented; the open row I2C-EXPANSION-CONNECTOR records the gap.
- **Costs if wrong:** one connector added to the MIDI and I²C page when the owner names it.
- **Set by:** the controller, h7 pedal pages plan Task 3.

### CR-PEDAL-PCM3060-VALUES

**The PCM3060's straps and decoupling are schematic-checklist.md's CODEC-02 to CODEC-10, as written there.**
- **Label:** Controller ruling (the owner may override).
- **Date:** 2026-11-13.
- **Decides:** the values are given, not open (the inventory's conflict 6.6): VCC (24) and VDD (7) each 100 nF + 10 µF ([schematic-checklist.md](schematic-checklist.md) line 88); VCOM (21) 100 nF + 10 µF and nothing else (line 92); the four grounds on GND (line 93); MODE 220 kΩ ± 5 % to DGND (line 98); IFMD to the codec's VDD, 3V3_CODEC (line 99); FMT 4.7 kΩ to VDD (line 103); DEMP 4.7 kΩ to DGND (line 104); and the not-fitted positions of lines 98, 104 and 105, which [CR-PEDAL-POPULATION](#cr-pedal-population) takes out of the model. The 10 µF parts' MPNs, which line 88 says are "in parts.md" and are not, are not needed for a schematic (G245). The spec's line listing these values as open carries a dated note pointing here.
- **Costs if wrong:** none beyond the checklist's own values.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-rulings.ts` (`PCM3060_VALUES`).

### CR-PEDAL-POPULATION

**The pedal model is the default fitted build: a not-fitted part that would join or load nets is left out of the model and off the page; a not-fitted connector is drawn with a note.**
- **Label:** Controller ruling (the owner may override). From [issue 33](https://github.com/oletizi/audio-circuits/issues/33), P1.
- **Date:** 2026-11-13.
- **Decides:** the model's component and part records, the drawing intent and the sheet-agreement path carry no population state, and this plan adds none. Every not-fitted position the documents name for the pedal, found by searching `docs/h7-platform/` for "not fitted", "not-fitted", "DNF", "unpopulated" and "not populated", is in one of two classes.
  - **A part whose fitting would join or load nets: left out of the model and off the page.** The block's module comment names each and its source, and the codec page carries a text note listing them with CODEC-10's sheet note verbatim: "I2C mode = fit both links, fit MODE 0 Ω (CODEC-06) and remove the 220 kΩ, remove the pin-2 4.7 kΩ pull-down and fit the DNF pull-up." Drawing one would fail the round trip, since the page would carry a part the model does not.
    - CODEC-06's 0 Ω from MODE to DGND ([schematic-checklist.md](schematic-checklist.md) line 98): fitted, it shorts the 220 kΩ hardware-mode strap.
    - CODEC-09's 4.7 kΩ pull-up from pin 2 to VDD (line 104): fitted, it loads pin 2 against its pull-down.
    - CODEC-10's two 0 Ω links, pin 1 to EXP_I2C_SCL and pin 2 to EXP_I2C_SDA (line 105): fitted, each joins a codec pin's net to a contract net.
    - v1's R_RST_PD, 10 kΩ from CODEC_RST_N to GND ([analog.md](analog.md) lines 63 and 411; [R-53](#r-53)): fitted, it would put the released RST across VIH, so it is never fitted. It is listed because the documents name the position.
  - **A connector whose fitting adds no on-board path: modelled and drawn, with a note that it is not fitted.** Fitting it gives a cable somewhere to land and joins no two on-board nets, so the fitted and unfitted boards are the same circuit. Whether it is placed is a BOM fact for the assembly consumer (G245).
    - USB-08's MIDI UART header (line 217; [OWN-04](#own-04), "The header stays unpopulated"). It joins no on-board nets because its four pins have no internal connection (`MIDI_HEADER` is `electricallyInert`), and each lands on a net the board already has: 3V3_D, MIDI_UART_TX, MIDI_UART_RX, GND.
  - **Named "not fitted" and not a pedal position:** the Seed's AGND/DGND link (architecture.md line 377, on the Seed); the PA11 pull-up (firmware-facing-requirements.md line 144) and the second QSPI flash (processor-and-memory.md line 258), both on the module; [parts.md](parts.md) §7's alternates (line 163), which are other part numbers for fitted positions, the PESD15VL1BA among them, and whose C_VBUS option is now fitted ([CR-PEDAL-VBUS-SENSE-CAP](#cr-pedal-vbus-sense-cap)); lines that restate CODEC-10's links (architecture.md lines 94 and 206, processor-and-memory.md line 26, this document's [O-2](#o-2), [RR-11](#rr-11) and [D2](#d2)); and *Not in force:* lines (schematic-checklist.md lines 81 and 96, bring-up.md line 86, this document's line 378). The control positions' per-effect fit (mechanical-and-controls.md line 298) is a design variant, not a not-fitted part: [CR-PEDAL-CONTROL-NODE](#cr-pedal-control-node) draws both fits.
- **Costs if wrong:** the I²C-mode build has no drawing until a later plan adds a population property; a connector misclassed as the second kind would hide an on-board join, which is why each connector's reason is stated.
- **Set by:** the controller, h7 pedal pages plan Task 3.
- **Carried in:** `circuits/h7-platform/pedal-population.ts` (`NOT_FITTED_PARTS`, `NOT_FITTED_CONNECTORS`, `CODEC10_SHEET_NOTE`).

## What this document does not carry

- **Generator-only rulings.** S1 ledger R-3 (hermetic `kicad-cli` gates and the v1 manifest), R-4 (the gate-9 role model) and R-7 (which gates apply to the carrier). Every entry of [the A1 rulings][a1], which are about the pedals generator; its one ruling touching an owner approval, that gate 8 accepts deltas `CORE-BRIEF.md` §4 declares with owner approval, is a generator rule, and the approvals themselves are [D14](#d14) to [D19](#d19); its words are quoted as evidence under [D1](#d1). The unnumbered controller rulings in [the A2 rulings][a2], except the two still live in the design notes, carried as [PW-CHASSIS](#pw-chassis) and [AN-RING](#an-ring), and the first, quoted under [OWN-02](#own-02). `OWNER-DEFAULTS.md` ALL-07 (an ERC exclusion for a stock KiCad symbol on v1); the module's own allowance for the same VCAP1–VCAP2 error is a new controller ruling, [CR-MODULE-VCAP-ERC](#cr-module-vcap-erc), not this carried. The gate clauses of [O-8](#o-8), [O-10](#o-10), [RR-5](#rr-5), [RR-9](#rr-9) and [RR-10](#rr-10), and split spec §10; and O-10's clause putting the pedals layout tooling (Sub-project B) before both layouts.
- **Superseded owner decisions** appear only on *Not in force:* lines beside the decision that replaced them.

[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
[plat]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-09-30-h7-pedal-platform-design.md
[ledger]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-05-h7-split-rulings.md
[own]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/OWNER-DEFAULTS.md
[cb]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/CORE-BRIEF.md
[a1]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-03-h7-schgen-a1-rulings.md
[a2]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-03-h7-schgen-a2-rulings.md
[gen]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-03-h7-schematic-generator-design.md
[analog]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/ANALOG.md
[power]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/POWER.md
[bypass]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/BYPASS-RELAY.md
[checklist]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/SCHEMATIC-CHECKLIST.md
