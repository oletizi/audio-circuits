# h7-platform layout carry-forward

Ported from:
- [h7-platform/LAYOUT-CARRYFORWARD.md][lcf]: every section ("Fabrication and footprints", "Placement and routing", "Hand checks before and at first bring-up", "Split audio board (S2): control cluster, layout B", "Split module and audio board (S2): VREF_A, pin 21")
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §6.1, §6.3, §6.4, §7.1, §7.4, §8, §9.1, §9.2, §9.3, §12.4, §13.1 (the board each item now belongs to)
- [h7-platform/SCHEMATIC-CHECKLIST.md][chk]: the layout notes it put on the v1 sheets (CORE-22, CORE-23, CORE-26, CODEC-13, PWR-16, PWR-17, USB-07, AIO-21, CTL-10)
- [h7-platform/DESIGN-REVIEW.md][dr]: linked, not copied (§7 below)
- [h7-platform/boards/v1/REFMAP.md][refmap]: only to translate the v1 reference designators `LAYOUT-CARRYFORWARD.md` uses into functional labels
- [docs/standards/pcbway-fab-rules.md][fab] in the pedals repository, the fabrication rule `LAYOUT-CARRYFORWARD.md` cites

This document lists what the layouts of the STM32H743 digital pedal platform (h7-platform) must honour that a schematic cannot show: where parts go, how copper is drawn, what the fabrication order must say, and what is checked by hand on the first boards. `LAYOUT-CARRYFORWARD.md` was written for v1, one board, and then grew two sections for the split. Here every item is restated against the three boards of the split: the processor module (**h7-module**), the audio pedal board (**h7-pedal**) and the bring-up carrier ([O-13](decisions.md#o-13), owner). It records the design as it stood in the pedals repository at commit `5b926d0`. No board has been modelled, drawn or laid out in this repository, so **every item here is open until a phase-4 layout shows it met**, and each is named in a row of [open-items.md](open-items.md).

**Every figure in this document is paper analysis of a board that has not been built.** Figures that a topic document already carries with their inputs and method are linked there, not restated.

**Words.** "The carrier" in this document means the bring-up carrier of [O-13](decisions.md#o-13) only. The S1 analyses `vin-mod.md` and `power-fail.md` use "carrier" for the board the module plugs into, which is h7-pedal; where this document draws on them it says h7-pedal.

**The v1 schematic is not an authority.** `LAYOUT-CARRYFORWARD.md` names parts by their v1 reference designator (U6, C40, TP7) with the functional label in brackets. This document uses the functional label and gives the v1 reference in brackets as "v1 U6" for traceability only; that is what v1 contained, which is all it is. Decisions are linked by anchor into [decisions.md](decisions.md), whose labels this document follows.

## 1. Every board

Items that bind each board that is laid out (h7-module, h7-pedal and the carrier), each for its own parts. The sources wrote these for the one v1 board and restated none of them for the carrier, which split spec §13.1 and [architecture.md](architecture.md) §7 describe only by contents. **That the board-file, lifecycle, net-class and USB-pair items bind the carrier too is this document's reading, not a source's.**

- **One solid ground plane.** One GND net per board ([D18](decisions.md#d18), owner-approved delta), an unsplit GND plane on layer 2, noise separation by placement. [power.md](power.md) §10 restates v1's zones P, D and A by board and is the authority for this item; it is not repeated here. *Source:* `LAYOUT-CARRYFORWARD.md` "Placement and routing", first item; `SCHEMATIC-CHECKLIST.md` PWR-17; `POWER.md` §7.
- **Part data reaches the fabricator through the board file.** PCBWay sees only what its KiCad plugin exports from the board, so each board's file carries every fitted part's MPN, manufacturer and supplier part, and the "do not populate" mark on every part that is not fitted. Notes the board file cannot carry go on the fabrication drawing and are typed on the PCBWay order page. *Source:* `LAYOUT-CARRYFORWARD.md` "Fabrication and footprints"; the module sockets' and headers' MPN items in its "Split audio board" section. Open item LAYOUT-FAB-NOTES.
- **Lifecycle and stock re-checked when quoting** ([OWN-07](decisions.md#own-07), controller ruling): dated, at the PCBWay quote, a part replaced through its design note when it is no longer Active. Open items POWER-PARTS-STOCK and LAYOUT-FAB-NOTES.
- **Net classes** (design-review gap G-L2, `LAYOUT-CARRYFORWARD.md` "Placement and routing"): trace-width and via rules for the nets that carry the input voltage or high current. On the split those are, per board:
  - h7-pedal: VIN, VIN_A and VIN_MOD, which see 18 V continuously ([PS-18V](decisions.md#ps-18v), owner) and the hot-plug peaks of [power.md](power.md) §4.5 (FIG-HOTPLUG); the module branch through Q_MSW, which carries the whole module's input current; 3V3_P ([power.md](power.md) §6.1). Pin 38's 3V3_D is a 25 mA logic supply on this board ([power.md](power.md) §5.4).
  - h7-module: VIN_MOD and the buck's input VIN_BUCK (the same voltages, [power.md](power.md) §4); the module's 3V3 at its budget ([power.md](power.md) §5.1).
  - the carrier (this document's reading): VIN_MOD from its current-limited entry, and the module's outputs at their contract limits ([architecture.md](architecture.md) §7).
  Open item LAYOUT-NET-CLASSES.
- **USB data pairs** (gap G-L3): no differential-pair rule was ever written for D+/D−. `LAYOUT-CARRYFORWARD.md`: "set 90 Ω and keep them short". *This document's reading, not a source's:* on the split the rule applies to three paths, the pedal's USB-C through its isolation switch to pins 36/37 ([R-14](decisions.md#r-14)); the carrier's USB connection on pins 36/37, through the same switch ([architecture.md](architecture.md) §7); and the module's ROM-DFU socket on PA11/PA12 ([R-60](decisions.md#r-60)). Open item USB-DIFF-PAIR-RULE.
- **The enclosure and the room under the board** (gap G-L1). On the split this is the mechanical study's: the owner-measured reference box ([R-62](decisions.md#r-62) on the owner's [F-5](decisions.md#f-5)), the heights under the audio board and the stack height, all in [mechanical-and-controls.md](mechanical-and-controls.md) §1 to §3 (EC-ENCLOSURE, EC-STACK-HEIGHT, FIG-HEIGHTS-UNDER-BOARD). The tall electrolytics v1 named for the box-depth check are, on the split: C_BULK to C_BULK4 on h7-pedal's VIN_A (v1 C40 was C_BULK); C_AC_L, C_AC_R, C_DC_L and C_DC_R on h7-pedal (v1 C76, C90, C85, C99); and C_DAMP on h7-module (v1 C46), which moves with the buck's input network (split spec §6.1). Two more G-L1 items bind h7-pedal and no split source restates them: **check the pot nut's thickness against the panel**, and **the LED spacers**. Open items STACK-HEIGHT-CONFIRM and AUDIO-BOARD-MECH-LAYOUT.

## 2. h7-module

- **MCU cooling copper** (owner's [PW-TJ](decisions.md#pw-tj); [OWN-06](decisions.md#own-06), controller ruling, moves it to module layout; split spec §9.1, §9.2; `SCHEMATIC-CHECKLIST.md` CORE-26). The copper itself is described in [power.md](power.md) §5.3 and §10. `LAYOUT-CARRYFORWARD.md` adds one instruction: **record the via count on the board.** Open items MODULE-LAYOUT-RULES and MCU-TJ-MEASURE.
- **The buck** (v1 U5, U_BUCK; split spec §6.1 moves it, its input filter and bulk to the module): the hot loop C_BIN1, C_BIN2, C_BINHF → VIN pin → GND pin on the top layer with several GND vias at the capacitor pads; the switch node to L_BUCK short and wide; the feedback divider R_FBT / R_FBB away from the switch node, with its own sense trace from the output. [power.md](power.md) §10 carries the same list. Open item MODULE-LAYOUT-RULES.
- **Hot-plug test pads at the buck's input.** v1 placed its VIN_BUCK bench pads (v1 TP5, TP6) at the C_BIN1/C_BIN2 pads for the hot-plug measurement. Split spec §9.3 moves that measurement to the module input (BU-25 in [bring-up.md](bring-up.md)), which scopes the module buck's VIN among other points (open item HOT-PLUG-PEAK). Which board carries which test pad after the split is not settled by any source (open item TEST-PAD-SPLIT and its conflict entry).
- **Supervisor sensing.** The module's reset supervisor (v1 U2, U_SUP, the TLV803EA30) senses the 3.3 V rail at the MCU's VDD pins, not at the buck output (`SCHEMATIC-CHECKLIST.md` CORE-11; [processor-and-memory.md](processor-and-memory.md) §8). Open item MODULE-LAYOUT-RULES.
- **VDDA filter and crystal.** FB_VDDA (v1 FB1) at the MCU's VDDA pin, with the VDDA bank on the MCU side; the crystal Y_HSE (v1 Y1) and its 8 pF capacitors C_HSE1/C_HSE2 tight to PH0/PH1 with no vias (gap G-L4). Open item MODULE-LAYOUT-RULES.
- **VDDA damping leg** (requirement VDDA-DAMP; [R-18](decisions.md#r-18)): placed at the bank on the MCU side of FB_VDDA with its own ground via to the bank's ground; no resistance in VDDA's DC path. Values and reasoning: [analog.md](analog.md) §9.3; open item VDDA-DAMPING-LEG.
- **VDDA-LOOP and VDDA-WIDEBAND** ([R-57](decisions.md#r-57)): the buck's loop and start-up checked with the module's whole 3.3 V capacitance plus what the contract allows outside it (open item MODULE-BUCK-LOOP-STARTUP); the VDDA bank sized for the wideband requirement ([analog.md](analog.md) EC-VDDA-WIDEBAND, FIG-VDDA-WIDEBAND; open items VDDA-WIDEBAND and 3V3D-RIPPLE-INTO-VREF-A). The control-band limit is [analog.md](analog.md) EC-CONTROL-NOISE-BAND; its measurement is open item VREF-A-NOISE-MEASURE.
- **SDRAM and QSPI routing** (`SCHEMATIC-CHECKLIST.md` CORE-22 and CORE-23, from AN4938 §9.4.2 and §9.4.3; `LAYOUT-CARRYFORWARD.md` "SDRAM and QSPI routing"): 50 Ω ± 10 % referenced to the layer-2 GND plane; every trace under 120 mm; SDRAM data on a different layer from address and control, or at least 5 mm apart; each data lane matched within ± 10 mm, SDCLK within ± 10 mm of the data and address groups; SDCLK on an inner layer, at least 3 trace widths from other signals, few vias, no serpentine; at most 20 pF per trace and 30 pF total load; no series terminations (AN4938 asks for them only above 120 mm). The QSPI flash likewise, with **its data routed on one signal layer**, its clock at least 3 trace widths from other signals. The read and setup budgets these rules protect are [processor-and-memory.md](processor-and-memory.md) FIG-SDRAM-READ-SLACK and FIG-SDRAM-WRITE-SETUP; open items SDRAM-LAYOUT-TIMING and MODULE-LAYOUT-RULES.
- **SWD header solder paste.** J_SWD (v1 J8), the Samtec FTSH-105, asks for a 0.152 mm stencil, and the usual 0.10–0.12 mm default under-pastes it: ask for a 0.15 mm stencil or check the paste volume when ordering. *Source:* `LAYOUT-CARRYFORWARD.md` "Fabrication and footprints". Open item LAYOUT-FAB-NOTES.
- **The ROM-DFU socket** (USB-DFU-VERTICAL, [R-60](decisions.md#r-60)): the vertical HRO TYPE-C-31-E-17 on the component face, its land pattern, the plug column and the thickness note are carried in full by open item USB-DFU-VERTICAL and [mechanical-and-controls.md](mechanical-and-controls.md) EC-MODULE-USB and FIG-USB-PLUG-COLUMN.
- **The module's headers** ([R-61](decisions.md#r-61); fallback [R-54](decisions.md#r-54)): the holes sized from Mill-Max's part drawing so the pin collar seats on the board; the assembly note that each 20-way header is cut from a 64-way strip, the cut end inspected and the seating plane checked flat; the MPN (with the strip as the bought item), manufacturer and the note on the module's fabrication drawing. [mechanical-and-controls.md](mechanical-and-controls.md) EC-SOCKET-AND-HEADER and §3.2; open items AUDIO-BOARD-MECH-LAYOUT, MODULE-HEADER-SOURCING and LAYOUT-FAB-NOTES.
- **Inside the envelope.** Module layout stays inside the frozen module envelope ([RR-8](decisions.md#rr-8); split spec §13 step 10); open item STACK-HEIGHT-CONFIRM.
- **The back-feed bleeder** is an option for the module design, not adopted ([analog.md](analog.md) §9.6; open item VREF-A-BLEEDER-DECISION).

## 3. h7-pedal

**Power entry.**
- **Two branches that never share copper.** v1 ran VIN_PROT as two copper branches from its bulk capacitors, one to the analog side and one to the buck's input filter, which never shared a trace. On the split the branches are separate nets behind separate reverse-polarity diodes, D_AIN to VIN_A and D_MIN through Q_MSW to VIN_MOD ([power.md](power.md) §1; split spec §7.4). *This document's reading, not a source's:* the v1 rule's purpose, keeping the module's switching current out of the analog supply's copper, carries to the split as keeping VIN_A's copper apart from VIN_MOD's from the jack onward. Open item PEDAL-POWER-LAYOUT-RULES.
- **Reverse-polarity diode copper.** A **1 cm² cathode pad** on each of D_AIN and D_MIN, the two PMEG4030ER diodes that replace v1's D1 (D_REV): [power.md](power.md) §8 lists it as the layout condition of the diodes' survival figure (Rth(j-a) 130 K/W with that pad). `LAYOUT-CARRYFORWARD.md` gave the same area for v1's single diode. Open item PEDAL-POWER-LAYOUT-RULES.
- **Q_MSW's copper** (the module load switch's DPAK pour): [power.md](power.md) FIG-POUR; open item QMSW-POUR-LAYOUT.
- **The power-fail supervisor**: U_PF senses VIN at the jack ([R-36](decisions.md#r-36)); where it and its divider sit is an S2 placement no source fixed. Open item PEDAL-POWER-LAYOUT-RULES.
- **The 5V_A LDO's thermal vias.** U_LDO (v1 U6), the TPS7A4901 on h7-pedal, was drawn on v1 with KiCad's stock footprint, whose thermal vias have 0.2 mm drills; PCBWay's minimum drill is 0.3 mm ([pcbway-fab-rules.md][fab]). Either the via drills are enlarged, or the vias are left out of the footprint and placed in the board, and whether they are tented or filled is agreed with PCBWay (gap G-L5). `LAYOUT-CARRYFORWARD.md` notes that this was its only item that changes copper. Open item LAYOUT-FAB-NOTES.
- **U_PRAIL's input loop** follows the module buck's rules; where U_PRAIL and Q_MSW sit relative to the analog zone is an S2 placement ([power.md](power.md) §10). Open item PEDAL-POWER-LAYOUT-RULES.

**Analog, codec and jacks.**
- **Zones and the codec.** No switching digital trace crosses the analog zone on any layer; the PCM3060 straddles the digital/analog boundary with pins 1–14 toward the digital side; its DOUT load ≤ 20 pF; no series terminations on the SAI lines at the codec beyond the ones the split adds ([power.md](power.md) §10; `SCHEMATIC-CHECKLIST.md` CODEC-13; the split's codec-side series resistors are [analog.md](analog.md) §14.3).
- **Decoupling returns.** Each op-amp's decoupling at its supply pin 8 with its own GND via; the codec's VDD capacitors returned to pin 8 (DGND) and its VCC and VCOM capacitors to AGND1/AGND2, each with a via at the pad ([power.md](power.md) §10; `SCHEMATIC-CHECKLIST.md` CODEC-02 to CODEC-04). Open item PEDAL-ANALOG-LAYOUT-RULES.
- **Jack ESD diodes** at their jack terminals, each GND pad on its own via, on the jack side of the relays, and the expression jack's two diodes likewise (`SCHEMATIC-CHECKLIST.md` AIO-21, CTL-10). Open item PEDAL-ANALOG-LAYOUT-RULES.
- **The bypass relays**: [bypass-relay.md](bypass-relay.md) §7 restates `LAYOUT-CARRYFORWARD.md`'s relay item with the split's names; open item PEDAL-ANALOG-LAYOUT-RULES.
- **The SAI nets across the socket**: open item SAI-LAYOUT-RULES ([analog.md](analog.md) §14).
- **The expression blocking network** ([R-17](decisions.md#r-17), [R-19](decisions.md#r-19)): the LM66100, its CE resistor, the 2N7002 and the Schottky clamp in one tight group between the VREF_A pin-21 trace and R_REF, the clamp's ground return straight to the plane; U_EXP's IN+ node behind its 2.2 MΩ input resistor short and guarded; the only capacitor directly on VREF_A is U_EXP's 100 nF bypass, inside the 4 µF the contract allows ([analog.md](analog.md) §9.3, §9.6, §10). Open item PEDAL-ANALOG-LAYOUT-RULES.
- **The oscillator and the codec VDD clamp**: XO_OUT short to SCKI1/SCKI2; D_CVCL beside U_CVDD (open item PEDAL-ANALOG-LAYOUT-RULES; [analog.md](analog.md) §13).

**USB-C.** The pedal's USB-C with its ESD part and the ESD part's VBUS capacitor at the connector (v1 J7, U15 and C112: J_USB, U_ESD, C_VBUS; `SCHEMATIC-CHECKLIST.md` USB-04; split spec §9.3 moves USB-01 to USB-05 to the pedal). v1 placed J_USB "at the zone-D edge nearest PA11/PA12"; on the split its data lines go through the isolation switch to pins 36/37, and *this document's reading, not a source's*, is that the connector then sits where that path to the socket is short. Open item USB-DIFF-PAIR-RULE.

**Chassis bond.** A ground lug under one audio-jack nut wired to a dedicated GND pad near the DC jack (v1 TP7, TP_CHASSIS_GND: a 2.5 mm pad with a 1.2 mm hole); the powder coat masked or scraped under the lug; enclosure-to-GND continuity checked after coating ([PW-CHASSIS](decisions.md#pw-chassis), controller ruling; [power.md](power.md) §10; `SCHEMATIC-CHECKLIST.md` ALL-09). The check is in [bring-up.md](bring-up.md) §6.

**The DC jack.** The jack is plastic-bodied or isolated from the enclosure, because its sleeve is +V ([power.md](power.md) §10). v1's part, the Same Sky PJ-057AH, has three 3.0 × 0.8 mm plated slots and a Ø2.10 mm unplated peg hole, and the enclosure's DC-jack hole was placed from that footprint (front face 13.75 mm ahead of pin 1, plug axis 6.50 mm above the board). Split spec §9.2 leaves the remaining panel parts, the DC jack among them, to S2, so the PJ-057AH is a study assumption on the split ([parts.md](parts.md) §5). Still owed from v1: a hand check that a standard 5.5 × 2.1 mm plug fits. Open item DC-JACK-FIT.

**Do not substitute BZT52C12-7-F-79.** A substitution at quote for the relay suppressors' BZT52C12-7-F Zener must not pick the "-79" suffix, which Diodes PCN-2780 makes end-of-life; BZT52C12-7-F is the PCN's named replacement and is Active. Open item LAYOUT-FAB-NOTES.

**Control cluster, layout B, the module sockets and the footswitch boards.** `LAYOUT-CARRYFORWARD.md`'s split section on layout B ([O-18](decisions.md#o-18), owner) is carried in [mechanical-and-controls.md](mechanical-and-controls.md):
- placement of the six positions, the footswitches, the LEDs and the module (§4.1; EC-LAYOUT-B; [layout-B.svg](layout-B.svg));
- both footprints on each position (§4.2; open item CONTROL-POSITION-VARIANTS);
- the lead and socket-tail trim rules and their order-page text (EC-LEAD-TRIM, §7; open item TRIM-RULES-ORDER);
- the sockets, their fallback and their footprints (EC-SOCKET-AND-HEADER, §3.2; open items AUDIO-BOARD-MECH-LAYOUT and MODULE-HEADER-SOURCING), with the parts' MPNs on the footprints (open item LAYOUT-FAB-NOTES);
- no lead within 1 mm of the socket bodies (open item AUDIO-BOARD-MECH-LAYOUT);
- the hung footswitch boards, their spacers, the two builds and the audio board's holes (EC-FOOTSWITCH, §5; open items AUDIO-BOARD-MECH-LAYOUT and CONTROLS-FIRST-BUILD);
- the lid and the enclosure (EC-ENCLOSURE, §2; open items ENCLOSURE-FIRST-BUILD and ENCLOSURE-DRAWING-CHECKS).

One build note from that section is an order-page item: PCBWay builds the hung footswitch boards apart from the audio board, so the header's joints on the audio board's top face and the screws are made at final assembly; **order the hung boards with the header fitted on them and say so on the order page.** Open item LAYOUT-FAB-NOTES.

**Test pads.** v1 had one pogo grid (SWDIO, SWCLK, NRST, BOOT0, GND, 3V3_D, 5V_A, VIN_PROT, and VIN before the Schottky) on one side, bench pads off the grid (VDDA, VCAP, VIN_BUCK, each with a GND pad), and audio pads at the inputs and outputs each beside a GND pad, with no pads on codec pins, on the HSE crystal nets or on USB D+/D− (`SCHEMATIC-CHECKLIST.md` PWR-16, USB-07). Split spec §9.3 says only "PWR-16 split" and "USB-07 split"; §7.1 says the pedal "keeps the power and audio pads"; §6.1 moves the SWD header's pogo pads to the module. Which net the v1 VIN_PROT pad lands on, which board carries 3V3_D and GND pogo pads, and whether each board has a grid of its own, no source settles: see the conflict entry on the v1 test pads in [open-items.md](open-items.md) and open item TEST-PAD-SPLIT.

## 4. The bring-up carrier

The carrier's contents are split spec §13.1 ([architecture.md](architecture.md) §7). What its layout must honour from the items above:
- **The module sockets**: the same Seed-pinout female sockets as the audio board, with every pin broken out to a header or a test point; the socket part, its fallback and the hole sizes as on h7-pedal (§3). *This document's reading, not a source's:* the socket-tail trim rule exists because of the audio board's rear pot bodies (EC-LEAD-TRIM) and has no counterpart on the carrier, which has no panel controls.
- **The SAI nets and the codec loopback**: the carrier reuses the h7-pedal codec circuit, including the SAI domain isolation, and obeys the same rules (IF-PD-1, the rail contracts, the reserved pins); open items SAI-LAYOUT-RULES (which names the carrier) and CARRIER-LOOPBACK-FORM.
- **Pins 36/37 to a USB connection** through the same isolation switch and enable pull-up as the pedal ([architecture.md](architecture.md) §7); that the 90 Ω pair rule binds this path is this document's reading (§1). Open item USB-DIFF-PAIR-RULE.
- **Test points** on VIN_MOD, 3V3_D, VREF_A, GND and the SAI nets; **dummy loads** on 3V3_D and VREF_A at their contract limits, fitted by jumper; **a current-limited VIN entry** (the supply, not the board, sets the limit).
- **Net classes and part data** as in §1.

## 5. Not in force

*Not in force:* the "Power-fail supervisor" item as v1 placed it: U16 (U_PF) and its divider near U5 (U_BUCK)'s EN pin with SENSE taken at VIN_PROT (the "Supervisor sensing" item, the reset supervisor at the MCU's VDD pins, stays in force, §2) (`LAYOUT-CARRYFORWARD.md` "Placement and routing"). Split spec §9.3 ("PWR-18 replaced by §7.4's circuit") and [R-36](decisions.md#r-36) put the sense point at VIN at the jack; [bypass-relay.md](bypass-relay.md) §7 carries the same line.

*Not in force:* VIN_PROT as one net feeding both the analog side (v1 U6, U7 and the VMID divider) and the buck's input filter L_FILT (v1 L1), replaced by the two branches of split spec §7.4 ([power.md](power.md) §1).

*Not in force:* "3V3_D carries 1.03 A (0.9 A plus 114 mA of relay coil current)" as a net-class figure. Split spec §7.5 moves the coils onto 3V3_P and §5.6.2 makes pin 38's 3V3_D a 25 mA logic supply; the module's 3.3 V budget is [power.md](power.md) §5.1.

*Not in force:* "22–25 V peaks when a supply is plugged in hot" as v1's hot-plug figure for VIN, VIN_PROT and VIN_BUCK; the split's re-run is [power.md](power.md) §4.5 (split spec §6.3, §9.3).

*Not in force:* the enclosure-fit items for parts the split removed: the footswitch's M12 thread passing the lid datum with 4.3 mm left for the wall and nut (the FS5700 footswitch, replaced under [O-17](decisions.md#o-17)) and the toggles' 1/4-40 bushings (the toggles, removed under [O-18](decisions.md#o-18)); `LAYOUT-CARRYFORWARD.md` "Placement and routing", gap G-L1. The other G-L1 items still bind h7-pedal (§1).

*Not in force:* "Six panel parts had no lifecycle status that could be reached": an observation about v1's panel set, which split spec §9.2 (OWN-05, as changed by O-17 and O-18) replaced. The lifecycle re-check itself stands (§1).

*Not in force:* the meter checks of the FS5700 footswitch's PUSH/FREE terminals and the toggles' silver contacts at about 0.1 mA (`LAYOUT-CARRYFORWARD.md` "Hand checks"): both parts left the design under [O-17](decisions.md#o-17) and [O-18](decisions.md#o-18).

*Not in force:* the hand check "ALL-07 sign-off" (the one ERC exclusion on v1, VCAP1/VCAP2, awaiting an owner signature in `boards/v1/VERIFICATION.md`): split spec §8 carries no v1 verification result as evidence ("Every gate and every agent gate is re-run on both designs"), and [decisions.md](decisions.md) records the ERC exclusion as not carried. The circuit fact behind it is in [schematic-checklist.md](schematic-checklist.md) CORE-04.

*Not in force:* "Firmware. Configure SAI1 for left-justified 24-bit": the interface is SAI2 on the split, both blocks slave (split spec §9.4, [D20](decisions.md#d20)); the format, 24-bit left-justified, is unchanged and carried in [firmware-facing-requirements.md](firmware-facing-requirements.md) EC-SAI2-SLAVE.

*Not in force:* the "fit the output mute or not" check, already gone in `LAYOUT-CARRYFORWARD.md` because the owner chose relay bypass on 2026-10-04 ([OWN-01](decisions.md#own-01)).

## 6. Hand checks and first-board measurements

`LAYOUT-CARRYFORWARD.md` lists hand checks "on top of the bring-up items BU-01 to BU-29". On the split they are in [bring-up.md](bring-up.md): the first-board measurements it names (the supervisor's margins under SDRAM load, BU-03; the output op-amp's distortion at 9.0 V in, BU-01; the hot-plug peak, BU-25, with no TVS footprint under the owner's [PW-NOTVS](decisions.md#pw-notvs)), and the first-build checks of the split sections (the enclosure, the footswitches, the module sockets, the expression input's back-feed gate, VREF_A's noise at pin 21) in [bring-up.md](bring-up.md) §6.

## 7. Third-party review checklist

[DESIGN-REVIEW.md][dr] maps the Predictable Designs "Design Review Checklist: Essentials" onto the v1 board. It is third-party material, so it is linked here and not copied. Its sections "2. PCB Layout (18 checks)" and "3. Enclosure (13 checks)" are the checks a phase-4 layout review runs against each split board; the PDF it cites is the authority for their wording. Its gap identifiers G-L1 to G-L5, cited above, are the gaps `LAYOUT-CARRYFORWARD.md` answered.

## 8. What did not cross

- The v1 reference designators as a naming scheme (they are kept only in brackets above, for traceability).
- `LAYOUT-CARRYFORWARD.md`'s pointers to pedals files that this repository does not carry (`boards/v1/REFMAP.md`, `boards/v1/VERIFICATION.md`, `circuit/analysis/controlLayout.ts`, `envelopeInputs.ts`): the facts they held are in the documents linked above, and no code crosses.
- The stock counts and dated readings it quotes (Mouser and Digi-Key counts for the headers, LCSC stock for the USB socket): availability is decided at the PCBWay quote ([OWN-07](decisions.md#own-07)).

## 9. Open items this document raises or relies on

Raised here, in [open-items.md](open-items.md): LAYOUT-FAB-NOTES, LAYOUT-NET-CLASSES, USB-DIFF-PAIR-RULE, MODULE-LAYOUT-RULES, PEDAL-POWER-LAYOUT-RULES, DC-JACK-FIT, TEST-PAD-SPLIT, and the conflict entry on the v1 test pads. Extended here: PEDAL-ANALOG-LAYOUT-RULES (the decoupling returns and the expression blocking network), AUDIO-BOARD-MECH-LAYOUT (the pot nut and the LED spacers) and ENCLOSURE-FIRST-BUILD (the chassis bond's continuity check). Relied on: STACK-HEIGHT-CONFIRM, MODULE-HEADER-SOURCING, TRIM-RULES-ORDER, CONTROL-POSITION-VARIANTS, CONTROLS-FIRST-BUILD, ENCLOSURE-FIRST-BUILD, ENCLOSURE-DRAWING-CHECKS, USB-DFU-VERTICAL, VDDA-DAMPING-LEG, VDDA-WIDEBAND, 3V3D-RIPPLE-INTO-VREF-A, VREF-A-NOISE-MEASURE, MODULE-BUCK-LOOP-STARTUP, VREF-A-BLEEDER-DECISION, SDRAM-LAYOUT-TIMING, SAI-LAYOUT-RULES, CARRIER-LOOPBACK-FORM, QMSW-POUR-LAYOUT, HOT-PLUG-PEAK, MCU-TJ-MEASURE, POWER-PARTS-STOCK.

[lcf]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/LAYOUT-CARRYFORWARD.md
[chk]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/SCHEMATIC-CHECKLIST.md
[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
[dr]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/DESIGN-REVIEW.md
[refmap]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/boards/v1/REFMAP.md
[fab]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/standards/pcbway-fab-rules.md
