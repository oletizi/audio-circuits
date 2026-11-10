# h7-platform mechanical and controls

Ported from:
- [h7-platform/interface-analysis/envelope.md][env]: "Owner inputs", §0 (the enclosure and the room under the board), §1 (the socket, header and module USB parts), §2 and §3 (placement on the module and its outline), §4 (stack height), §5 (fit in the 1590BB, layout B's plan placement), §7 (documents read and readings still to confirm)
- [h7-platform/interface-analysis/controls.md][ctl]: §1 (footswitches), §2 (soft buttons), §3 (candidates reported), §4 (readings still to confirm)
- [h7-platform/interface-analysis/layouts/layouts.md][lay] and [h7-platform/interface-analysis/layouts/layout-B.svg][svg] (layout B, the six control positions, the trim rules)
- [2026-10-05-h7-split-rulings.md][ledger] (the S1 rulings ledger): R-54, R-55, R-56, R-60, R-61, R-62
- [2026-10-05-h7-modular-split-design.md][split] (the split spec): §2 (O-12, O-17, O-18), §5.1, §5.1.1, §5.1.2
- [h7-platform/LAYOUT-CARRYFORWARD.md][lcf] (the layout notes for footswitch boards, lid and enclosure) and [h7-platform/mechanical/step/README.md][step] (the STEP models, which stay in pedals)

This document describes the mechanical side of the STM32H743 digital pedal platform (h7-platform) after the split into a processor module (h7-module) and an audio pedal board (h7-pedal): the enclosure and the room under the audio board, how the module is socketed and its stack height, the six control positions and their placement (layout B), the footswitches and the buttons. It records the design as it stood in the pedals repository at commit `5b926d0`. Nothing here has been built, modelled or drawn in this repository.

**Every figure in this document is paper analysis of a board that has not been built.** Each figure states its inputs and its method beside it and links the pedals analysis it came from. Lengths are in mm. The pedals analyses hold every mechanical position to about 1 mm (the "1 mm tolerance" below), and a margin "after the tolerance" is the nominal margin less 1 mm.

Decisions are linked by anchor into [decisions.md](decisions.md). An owner decision is labelled "owner"; an owner measurement is an "owner-supplied fact"; everything else there is a controller ruling, which the owner may override. Open items are rows in [open-items.md](open-items.md), named here by their Id. The electrical side of the control positions is in [architecture.md](architecture.md) §4.7 (the button fit and VREF_A), [analog.md](analog.md) §12 (the pot fit) and [power.md](power.md) §5.4 (the button pull-ups on 3V3_D); the connector, its pin numbering and the mirrored-footprint hazard are in [architecture.md](architecture.md) §4.2. This document carries the mechanical side.

## Words used here

The sources use "lid" for two different panels. In the footswitch and button studies and in O-17, the lid is the box's face, where the pots, buttons and footswitches mount ("Board ~10.7 mm below the lid"). In R-62 and `envelope.md` §0 and §5, the lid is the removable cover on the back, with a raised lip ("Below the top panel's inner face: ... the lid's inner face inside the lip **31.0**"). This document says **top panel** for the first and **back plate** for the second, and quotes the sources unchanged. Depths are measured downward from the top panel's inner face unless a line says otherwise.

The **box frame** for plan positions is layout B's: seen from above, x 0 … 112.66 from the left wall, y 0 … 87.16 from the rear wall toward the player, at the top panel (`envelope.md` §5). The **module frame** is relative to contract pin 1, seen from the module's component face: row A (J_MOD_A, pins 1–20) at x = 0, row B (J_MOD_B, pins 21–40) at x = 15.24, pins from y = 0 to y = 48.26 (`envelope.md`, preamble).

## How the sources are carried

| Source | Authority | How it is labelled here |
| --- | --- | --- |
| [O-12](decisions.md#o-12): the module is socketed | Owner | Owner. The socket and header parts written beside it are controller part choices, last set by [R-61](decisions.md#r-61) |
| [O-17](decisions.md#o-17): the mechanical baseline (1590BB, board height, soft footswitches on hung boards, everything tall on the underside) | Owner | Owner, with the parts he chose on 2026-10-05 (the PBS-24-MP actuator, a tactile switch under the spring, the HCTL button) |
| [O-18](decisions.md#o-18): six configurable control positions in layout B | Owner | Owner. Its two binding rules bind since he chose B ("binding since the owner chose B (2026-10-05)", `layouts.md`); the 4.97 mm figure is a controller figure, set through the socket and header choices of [R-54](decisions.md#r-54) and [R-61](decisions.md#r-61); the 1.4 mm figure is the HCTL button's own lead, 3.0 − 1.6 (split spec §5.1.2 rule 2), a part the owner chose ("lets start with the simple option A") |
| [R-56](decisions.md#r-56): design the footswitch for both lid stack-ups | Owner ("Owner decision, quoted" in the ledger) | Owner for the decision. The realisation (a Schurter LSH switch in two builds) is the controller's |
| [R-55](decisions.md#r-55), [R-60](decisions.md#r-60), [R-61](decisions.md#r-61), [RR-8](decisions.md#rr-8) | Controller | Controller rulings |
| [R-62](decisions.md#r-62): design to the owner-measured box | Controller, on the owner's measurements | Controller ruling. The measurements it rests on are owner-supplied fact [F-5](decisions.md#f-5), carried apart from it |
| [F-1](decisions.md#f-1), [F-2](decisions.md#f-2), [F-3](decisions.md#f-3), [F-6](decisions.md#f-6) | Owner | Owner-supplied facts |
| `envelope.md`, `controls.md`, `layouts.md` | S1 analyses | Paper analysis, each figure with its inputs |

A sentence that is this port's own reading, and not a source's, says so ("this document's reading").

## 1. Effective constraints

### EC-ENCLOSURE

**A 1590BB-size box in landscape, designed to the owner-measured reference box: below the top panel's inner face, the box rim is 30.0, the back plate's lip top 28.0 (a raised band assumed to lie within 4 mm of the inside wall), and the back plate's inner face inside the lip 31.0. Plan sizes are Hammond's: 112.66 × 87.16 inside at the top panel, top panel 2.25 thick.** The ordered boxes are assumed to match the reference box, and the first build checks that they do (ENCLOSURE-FIRST-BUILD).
- **Set by:** [O-17](decisions.md#o-17) (owner; the baseline he adopted names the enclosure as a Hammond 1590BB in landscape, in `envelope.md`'s Owner inputs and split spec §5.1.1).
- **Amended by:** [R-62](decisions.md#r-62) (ruling, 2026-10-06, on the owner's measurements [F-5](decisions.md#f-5)): "Design to the measured box", taken to be "the owner's preferred supplier's (Tayda) 1590BB-style box"; "Plan sizes stay Hammond's". R-62 narrows O-17's enclosure (it keeps the 1590BB size and changes only the depths, from the owner's own box); it is linked from O-17 and the owner may override it.

*Not in force:* Hammond's drawn inside height 29.75 and rim 27.75 below the top panel, and the room they gave: 17.45 under the board to the back plate's pocket face and 15.45 to the seam (`envelope.md` §0, "Before R-62").

### EC-BOARD-HEIGHT

**The audio board's top face sits 10.7 below the top panel's inner face, set by short-shaft Alpha RV16AF-41 pots (D = 10.7), whose mounting face seats on the top panel.** The audio board is 1.6 thick, so its underside is 12.3 down.
- **Set by:** [O-17](decisions.md#o-17) (owner, adopting the reference pedal's layout: "about 10mm of loft from the board to the shoulder of the potentiometers", owner-supplied fact [F-1](decisions.md#f-1)). Board thickness: PCBWay order page, 1.6 mm, read 2026-10-05 (`envelope.md` §0).
- **Amended by:** none. The reference pedal's own board is 11.25 below (F-5: "On my reference board, the tallest shoulder is 11.25mm above the pcb").

### EC-MODULE-MOUNTING

**The module is socketed on the audio board's underside, its component face toward the back plate, and is reachable with the back plate off. The module's BOOT and RESET buttons need not be reachable in a finished pedal.**
- **Set by:** [O-12](decisions.md#o-12) (owner: socketed; the split spec records with it that the enclosure must allow the stacking height, §2, §5.1); [O-17](decisions.md#o-17) (owner: the underside, reachable with the back plate off).
- **Amended by:** [RR-8](decisions.md#rr-8) (ruling): the module envelope and the stack height are fixed by the mechanical study and frozen with the contract before audio-board layout; layout confirms them and may not change them. They are not frozen (CONTRACT-FREEZE, STACK-HEIGHT-CONFIRM).

### EC-SOCKET-AND-HEADER

**Socket: Mill-Max 801-43-020-10-012000, two (J_MOD_A, J_MOD_B), on the audio board's underside. Header: Mill-Max 800-10-020-10-002000, two, on the module, each cut to 20 ways from the stocked 64-way strip 800-10-064-10-002000. Fallback: the Preci-Dip pair, socket 801-87-020-10-012101 with its header cut to 20 from 800-10-064-10-002101.** The contract keeps `mech.socketContactRatingA` at 3 A, the lower of the Mill-Max contact (4.5 A) and the Preci-Dip fallback (3 A).
- **Set by:** [R-61](decisions.md#r-61) (ruling, 2026-10-06). These are controller part choices under [O-12](decisions.md#o-12), not the owner's decision.
- **Amended by:** none. Before the contract freeze, Mill-Max confirms that cutting the strip is acceptable and the 20-way's lead time (MODULE-HEADER-SOURCING).

*Not in force:* the Samtec SLW-120-01-G-S socket ("Lead-Free Solderable: No, Lead Wave only"), the Samtec TLW-120-06-G-S header, and the Preci-Dip 801-87-020-10-012101 / 800-10-020-10-002101 pair as the first choice ([R-54](decisions.md#r-54)); the Preci-Dip pair remains the fallback.

### EC-STACK-HEIGHT

**The stack height is 15.17 below the audio board's underside, and the module's connector-face parts stand at most 4.97** (the contract's `moduleEnvelope.stackHeightMm` and `maxHeightBottomMm`). Derivation: [FIG-STACK-HEIGHT](#fig-stack-height).
- **Set by:** [RR-8](decisions.md#rr-8) (ruling: the study fixes both); [O-18](decisions.md#o-18) (owner: layout B, under which the connector-face limit binds, "binding since the owner chose B").
- **Amended by:** [R-54](decisions.md#r-54) (15.17 and 4.97, through the Preci-Dip header); [R-61](decisions.md#r-61) (the Mill-Max pair keeps both: "Stack height 15.17 mm and `maxHeightBottomMm` 4.97 mm unchanged"); [R-62](decisions.md#r-62) ("No contract value is loosened"). The contract is still a draft.

*Not in force:* the connector-face limit as 5.09 (the first drafted contract), 3.69 (layout B with the SLW socket) and 3.32 (with the TLW header, before R-54); the stack as 13.52 (TLW header).

*Not in force:* the 13.89 stack (4.57 + 1.52 + 1.6 + 6.2, the SLW socket and TLW header), which `envelope.md` says "is taken as the owner's acceptance of the low-profile socketed stack". The owner's words accepted a baseline described without a number ("Low-profile socket: a Daisy Seed sits slightly proud but connects"; "Yes, adopt it (Recommended)"); 13.89 was the study's figure for it. R-54: "The owner accepted a 13.89 mm stack in O-17; 15.17 mm still fits and is reported." `envelope.md`'s Owner inputs say where it went: "Reported to the controller." The split spec requires the study to report the stack height and envelope to the owner (§5.1: "reported to the owner"; §13.1: "records it in the drafted contract and reports it to the owner"), and no source shows that the 15.17 stack or the 4.97 limit reached him (STACK-HEIGHT-OWNER-REPORT). This is not a conflict: O-12 fixes no number, and 15.17 fits.

### EC-MODULE-USB

**The module's own USB socket (J_USB_MOD, for ROM DFU) is the HRO TYPE-C-31-E-17, a vertical receptacle on the module's component face, its mouth toward the back plate, so a straight plug enters with the back plate off.** It stands 6.00 ±0.1 above the module, under the 6.2 tallest part, so the stack is unchanged.
- **Set by:** [R-60](decisions.md#r-60) (ruling, 2026-10-06), under [O-11](decisions.md#o-11) (owner: ROM DFU on the module's own socket; R-60: "Owner decision O-11 stands").
- **Amended by:** none. The land pattern, footprint and thickness note are open item USB-DFU-VERTICAL.

*Not in force:* the right-angle HCTL HC-TYPE-C-16P-01A, whose mouth faced J_OUT_R 9.2 away in layout B, too little for a straight plug's overmold; and the claim that it was "reachable with the plate off" (`envelope.md` §5, withdrawn there).

### EC-CONTROL-POSITIONS

**The main control cluster is six positions, POS1–POS6. Each is fitted per effect with either an Alpha RV16AF-41 B10K pot or an HCTL TC-6610-17-100G button; firmware configures each position; the top-panel drilling and art are per effect. The two footswitches stay fixed, and the three separate buttons of O-17 are gone.** Each position carries both footprints, overlapping on one axis, so a pot and a button cannot both be fitted ([§4.2](#42-both-fits-on-every-position)).
- **Set by:** [O-18](decisions.md#o-18) (owner: "Another approach is to have a bank of six swappable controls so we can spec any combination of 6 knobs and/or switches in the main control cluster, tailored for the given effect to be loaded into the firmware and the enclosure art."; "yes, proceed").
- **Amended by:** [R-8](decisions.md#r-8) (ruling): pins 22–27 carry POS1–POS6 ([architecture.md](architecture.md) §4).

*Not in force:* O-17's three momentary soft buttons with extensions, and before them the three SPDT toggles; replaced by O-18 (owner).

### EC-LAYOUT-B

**The controls are placed by layout B: an even 2 × 3 grid of positions, the two footswitches at the front, the two LEDs between the footswitches, the jacks on the side walls, a relay in each rear corner, the module turned 90° under the middle.** Positions in [§4.1](#41-layout-b-the-placement).
- **Set by:** [O-18](decisions.md#o-18) (owner: "B. The controls are the user interface—they have to seem natural"; of the three candidates, "I prefer B").
- **Amended by:** none. R-60, R-61 and R-62 each leave layout B's arrangement unchanged ("Layout B's drawing is unchanged", R-60; "layout B unchanged", R-61; "The NMJ6HCD2 and layout B stay", R-62).

### EC-LEAD-TRIM

**Every pot, button and LED lead within the module outline is trimmed after soldering to at most 1.4 below the audio board, and the module sockets' tails to at most 0.6 above it. Each trimmed joint is then reflowed, or inspected under magnification for damage from the cut (IPC J-STD-001). No lead sits over the two socket bodies.** The PCBWay order page carries the instruction (text in [§7](#7-assembly-rules)).
- **Set by:** [O-18](decisions.md#o-18) (owner: layout B; the lead rule is its second binding rule); split spec §5.1.2 rule 3 (the socket tails, a controller rule from the S1 Task 9 review).
- **Amended by:** [R-55](decisions.md#r-55) (ruling): both trim rules add the reflow-or-inspect step. [R-61](decisions.md#r-61): the Mill-Max tail is 3.18 like the Preci-Dip's, so the 0.6 rule stands.

### EC-FOOTSWITCH

**Each footswitch is a DAIER PBS-24-MP spring actuator (Tayda A-8660) in the top panel pressing a Schurter LSH 6 × 6 tact switch on a small board hung under the audio board. The switch board works with either lid stack-up: build A for the collar on the panel's inner face, build B for the panel clamped between two nuts. The panel hole is Ø13.4 with an ISO 7089 M12 washer under the outside nut.** Build details in [§5](#5-footswitches).
- **Set by:** [O-17](decisions.md#o-17) (owner: soft footswitches on standoff boards; the actuator, "this is the stomp switch actuator: https://www.taydaelectronics.com/momentary-pcb-spring-switch.html"; a tactile switch under the spring, "the board switch under the spring stomp actuators should be a tactile switch… why would those be hard to source?"); [R-56](decisions.md#r-56) (owner: "No, design for both").
- **Amended by:** [R-56](decisions.md#r-56)'s realisation (the controller's: the Schurter LSH, 5 mm spacers, two builds); [R-55](decisions.md#r-55) (ruling: the Ø13.4 hole and the washer; the switch's 70 °C rating caps its claim).

*Not in force:* the owner's decision of 2026-10-04 (A2 rulings), "footswitch = a PCB-mount momentary with a complete manufacturer PCB drawing", superseded by O-17's soft footswitches (owner).

*Not in force:* the C&K PTS645SM43SMTR92 LFS switch on two 4 mm M3 spacers with a 1.00 mm rest gap, the Samtec TSW-102-07-F-S header in every build, and the Ø12.4 panel hole (12.0 bare fit + 0.4 powder coat); replaced by R-56's realisation and R-55. Before that, the APEM Multimec 3F 3FSH9 (100 N), replaced on the owner's pushback quoted above.

### EC-BUTTON

**The button fit is the HCTL TC-6610-17-100G, a 6 × 6 through-hole tactile switch mounted on the audio board's top face with no extension, through a Ø4.0 drilled panel hole.** Figures in [§6](#6-the-button).
- **Set by:** the owner's choice of 2026-10-05, recorded under [O-17](decisions.md#o-17): "lets start with the simple option A". The hole is the controller's (`controls.md` §2).
- **Amended by:** [O-18](decisions.md#o-18) (owner): the button is now one of the two fits of a control position, not a separate control.

### EC-PRODUCTION-MOUNTING

**How a production pedal mounts the module (socketed or soldered) is deferred until a working board exists.**
- **Set by:** [O-17](decisions.md#o-17) (owner: "don't over-constrain what a 'production' version will look like yet.").
- **Amended by:** none.

This is an owner deferral: the question returns to the owner after bring-up, once a working board exists. It has no open-items row because no phase of this port's programme (phase 2, 3, 4 or bring-up) closes it.

## 2. The enclosure and the room under the board

### 2.1 The box

| Fact | Value | Source |
| --- | --- | --- |
| Box rim (bottom edge of the walls) | 30.0 below the top panel's inner face | F-5: "Its about 30mm to the bottom edge of the enclosure", "Im measuring from the inside" |
| Back plate lip's top (a raised band just inside the walls, on the screw posts) | 28.0 = 30.0 − 2 (the posts measured about 28.3; R-62 takes 28.0 as the conservative reading) | F-5: "the lip of the lid rises 3mm from the inside of the lid and 2mm from the edge of the lid"; R-62 |
| Back plate's inner face inside the lip | 31.0 = 30.0 + 3 − 2 | F-5: "the inside of the lid is 1mm deeper than the side edges of the enclosure" |
| Lip band width | within 4 of the inside wall: an assumption, not measured | R-62 |
| Top panel thickness | 2.25 | [Hammond 1590BB drawing][hammond], read 2026-10-05, SECTION B-B |
| Inside length × width at the top panel | 112.66 × 87.16 (the walls draft outward: 113.83 × 89.50 at the rim) | same, SECTION B-B, SECTION A-A, INSIDE BOX |
| Lid-screw bosses | centres 103.50 × 78.00 apart; boss diameter not dimensioned | same, INSIDE BOX (4X 6-32 UNC). Layout B gives each corner a provisional 9.58 allowance (boss centre + 5.0) |

The reference box is about 2.25 deeper inside than Hammond's drawing (rim 30.0 against 27.75). R-62: "The owner's box is the one being built into; a working build with a deeper jack outweighs a drawing of a different box." Its cost if wrong, as R-62 states it: "If the ordered box is shallower or the lip wider, the jacks or the hung boards meet the lip: the first build shows it before any order of many."

### FIG-ROOM-UNDER-BOARD

Paper analysis of an unbuilt board. **Inputs:** the box depths of §2.1 (R-62, from F-5); the board's top face 10.7 down (EC-BOARD-HEIGHT); the board 1.6 thick. **Method:** each depth less 10.7 + 1.6. **Source:** [envelope.md §0][env].

| Room below the audio board's underside | Value | Arithmetic | What lies over it |
| --- | --- | --- | --- |
| To the back plate's centre face | **18.7** | 31.0 − 10.7 − 1.6 | the module and a Seed |
| To the lip's top (within 4 of a wall) | **15.7** | 28.0 − 10.7 − 1.6 | the jacks, relays and hung boards |
| To the box rim (the wall below a wall opening) | **17.7** | 30.0 − 10.7 − 1.6 | — |

### FIG-HEIGHTS-UNDER-BOARD

Paper analysis of an unbuilt board. **Inputs:** each part's height below the underside (sources in the table); FIG-ROOM-UNDER-BOARD; a +0.4 powder-coat oversize on wall openings. **Method:** each part is checked against the face it lies over (the lip's top for anything within 4 of a wall, the centre face otherwise): clearance = room − height, then less the 1 mm tolerance. **Source:** [envelope.md §5][env].

| Part | Below the underside | Over | Clearance, nominal / after the tolerance | Wall opening (+0.4) | Opening above the lip's top / wall below it to the rim |
| --- | --- | --- | --- | --- | --- |
| Module | 15.17 (FIG-STACK-HEIGHT) | centre (10.70 from the rear wall at the closest) | 3.53 / 2.53 | none | — |
| Daisy Seed in the sockets | 16.08 (FIG-SEED-IN-SOCKETS) | centre (inside the module outline) | 2.62 / 1.62 | none | — |
| ¼ in jacks, Neutrik NMJ6HCD2 (four audio, one expression) | 15.67 tall, axis 8.14 (ST-NMJ6HCD2 side view) | lip band (on the wall) | **0.03 / −0.97** (accepted on the reference build: [FIG-JACKS-OVER-LIP](#fig-jacks-over-lip)) | Ø11.4 + 0.4 = Ø11.8, spans 2.24 … 14.04 | 1.66 (0.66) / 3.66 |
| DC jack, Same Sky PJ-057AH | 11.00 tall, axis 6.50 (datasheet 09/12/2024 p. 2) | lip band | 4.70 / 3.70 | its whole 9.00 × 11.00 front face + 0.4, spans −0.2 … 11.2 | 4.50 (3.50) / 6.50 |
| Bypass relays, Omron G6K-2F-Y DC3 (K106-E1-11) | 5.2 | lip band (1.5 from the rear wall) | 10.50 / 9.50 | none | — |
| Hung footswitch boards (§5) | 5 + 1.5 + 1.6 = 8.1 at the deeper build | lip band (1.66 from the front wall) | 7.60 / 6.60 (build B 8.10 / 7.10) | none | — |

`envelope.md` §5: "Everything fits under the board, with the ¼ in jacks over the lip resting on the reference build as stated. The tightest toleranced margin elsewhere is the ¼ in hole above the lip's top: 0.66 mm after the tolerance. The S2 layout must hold the jacks' seating to the board." (AUDIO-BOARD-MECH-LAYOUT.)

*Not in force:* the clearances against Hammond's drawing (`envelope.md` §5, "Superseded"): module 1.28 to the back plate after the tolerance, Seed 0.37, ¼ in jack 0.78, jack hole 1.41 (0.41) above the seam, DC jack 5.45 and 4.25 (3.25), relays 11.25, hung boards 8.35.

### FIG-JACKS-OVER-LIP

Paper analysis of an unbuilt board, set beside the owner's working build. **Inputs:** our jack 15.67 tall below a 10.7 + 1.6 board; the reference board 11.25 down with a 15.8 jack and a 1.6 board (F-5, the reference's board thickness taken as 1.6 by `envelope.md`); the lip top at 28.0. **Method:** each jack's bottom depth is board depth + board + jack. **Source:** [envelope.md §5][env]; [R-62](decisions.md#r-62).

- Ours: 10.7 + 1.6 + 15.67 = **27.97**, 0.03 above the lip's top; under the 1 mm tolerance rule the margin is **−0.97**.
- The reference pedal's: 11.25 + 1.6 + 15.8 = **28.65**, 0.65 past our 28.0 lip top (0.35 past the 28.3 posts) and 0.68 deeper than ours, and the reference pedal assembles.

R-62 states plainly that "the tolerance arithmetic alone does not carry them": the claim rests on the owner's working reference pedal plus a first-build check that the back plate seats on its posts with the jacks fitted (ENCLOSURE-FIRST-BUILD). Layout B names the five jacks as the only parts allowed to rest on the reference fit; any other part within the tolerance of the lip over the band is a violation (`envelope.md` §5).

*Not in force:* [R-55](decisions.md#r-55)'s relief of the back plate's land at each ¼ in jack (at least 1.25 deep, from the pocket's edge to the rim), which modelled Hammond's lid pocket; withdrawn by R-62 ("no lid relief").

### FIG-JACK-HOLE-CROSSCHECK

Paper analysis of an unbuilt board. **Inputs:** the ¼ in hole's lower tangent 14.04 below the underside (FIG-HEIGHTS-UNDER-BOARD); the reference's tangent, F-5: "The tangent of the jack hole is about 26.77 mm from the inside top of the enclosure". **Method:** 10.7 + 1.6 + 14.04. **Source:** [envelope.md §5][env].

Ours is **26.34** below the top panel, 0.43 higher than the reference's 26.77, against our board's 0.55 higher position (10.7 against 11.25): `envelope.md` calls this consistent.

## 3. The module under the board

### 3.1 Placement on the module and its outline

`envelope.md` §2 places the module's tall parts to find the envelope. Each courtyard is the larger of the land pattern and the body at maximum tolerance, plus IPC-7351B's nominal 0.25 per side; the keep-out beside each socket row is half the 2.54 socket width plus 1.0, 2.27 per row. Module frame (§Words used here):

| Part | What | Courtyard x | Courtyard y | Height | Face |
| --- | --- | --- | --- | --- | --- |
| J_MOD_A / J_MOD_B | 800-10-020-10-002000 (R-61) | −1.52 … 1.52 / 13.72 … 16.76 | −1.52 … 49.78 | 3.18 | connector |
| L_FILT | WE-LQS 5040 | 4.67 … 10.57 | −2.50 … 3.20 | 4.0 | component |
| C_DAMP | EEE-FK1V470P | 3.97 … 11.27 | 3.70 … 12.00 | 6.1 | component |
| U_BUCK | TPS62933F | 6.30 … 8.95 | 12.50 … 15.20 | 0.6 | component |
| L_BUCK | WE-XHMI 6060 | 3.95 … 11.30 | 15.70 … 22.85 | 6.1 | component |
| J_SWD | FTSH-105-01-F-DV-K | 3.94 … 11.30 | 23.35 … 30.20 | 5.97 | component |
| SW_RESET / SW_BOOT | PTS645VL31-2 LFS | 3.12 … 12.12 | 30.70 … 39.30 / 39.80 … 48.40 | 6.2 | component |
| U_SUP | TLV803EA30 | 18.00 … 21.90 | 3.00 … 6.54 | 1.12 | component |
| Y_HSE | NX3225GA | 18.00 … 22.10 | 8.00 … 11.30 | 0.9 | component |
| U_FLASH | W25Q128JVSIQ | 18.00 … 23.88 | 12.00 … 21.32 | 2.16 | component |
| U_MCU | STM32H743IIT6 | 24.40 … 51.60 | −2.50 … 24.70 | 1.6 | component |
| U_SDRAM | W9825G6KH-6I | 26.58 … 49.43 | 25.70 … 38.90 | 1.2 | component |
| J_USB_MOD | TYPE-C-31-E-17, vertical (R-60) | 18.00 … 29.03 | 45.23 … 50.47 | 6.10 | component |

The outline is the bounding box of every courtyard plus 1.0: x −2.52 … 52.60, y −3.50 … 51.47, so **55.12 × 54.97**. The component face points away from the audio board, toward the back plate. Small passives, the ESD part and the identification strap go in the free areas. Two of the heights are readings the sources mark as unconfirmed: the FTSH -K shroud height (Samtec F-221 does not dimension it) and the PTS645 V body height (read from the front view) (MODULE-PART-HEIGHT-READINGS). This placement is the envelope study's; the module's own layout is phase-2 and phase-4 work, and the module's internal pin map is open item MODULE-INTERNAL-PIN-MAP.

### 3.2 The socket and the header

**Socket, Mill-Max 801-43-020-10-012000** (catalogue p. 53, FIG. 4, "Low Profile Socket (long insulator)"): insulator 4.19, 2.54 wide; clip 2.24 down a 3.71 bore; Ø0.56 tail 3.18; 6-finger BeCu contact rated 4.5 A; accepts Ø0.64–0.94 round and 0.64 square pins; plating 43 (tin sleeve, 0.76 µm gold clip); RoHS. **Header, Mill-Max 800-10-020-10-002000** (FIG. 1): a Ø0.76 pin 3.61 above the insulator's top face, 3.18 from that face to the seating plane (a 2.79 insulator plus the pin's collar), Ø0.61 tail 3.0 below the seating plane; 0.25 µm gold. Mill-Max offers both on one page as one system: "Receptacles accept 0,76 diameter and 0,64 square pins". Source: [envelope.md §1][env]; [R-61](decisions.md#r-61).

**The mate.** The 3.61 post passes the 2.24 clip by **1.37** and stops **0.10** short of the 3.71 bore, so the header's seating plane rests on the socket and the module PCB sits 4.19 + 3.18 = **7.37** below the audio board. If the collar sank into the module's holes the gap would shrink by at most the 0.39 collar; the connector-face limit keeps 1.0 for the tolerance, so a lead would still clear by at least 0.61. The module's holes are sized from Mill-Max's part drawing so the collar seats on the board, and the socket's Ø0.56 tail takes its finished hole from the same drawing, not the Preci-Dip value (AUDIO-BOARD-MECH-LAYOUT).

**Stock and the cut-from-strip assembly note** (R-61). The 20-way header showed Mouser 0 and is discontinued as a Digi-Key value-added item; the 64-way strip 800-10-064-10-002000 showed Digi-Key 3,147 (Active) and Mouser 460, read 2026-10-06. Each 20-way header is cut from a 64-way strip, three per strip, between pins 20 and 21 through the insulator web, with a cutter that leaves no burr past the 2.54 pitch outline; the cut end is inspected, and the cut header's seating plane is checked flat on the module before soldering. Catalogue p. 53 shows no break-off feature, so this is a hand step. Mill-Max is to confirm that cutting is acceptable and the 20-way's factory lead time before the contract freeze (MODULE-HEADER-SOURCING).

**The fallback pair, Preci-Dip.** Socket 801-87-020-10-012101: insulator 4.2, clip 2.4 down a 3.7 bore, Ø0.62 tail 3.18, mating pins "Ø 0.70 to 0.90 mm, 0.635 mm square", 3 A, 500 cycles; lead-free to J-STD-002A with SnAg3.8Cu0.7 and 260 °C for 20 s; drilled hole Ø1.15 ±0.02. Header 800-10-020-10-002101 (catalogue p. 108, "Straight pin connector, height 3.2 mm, short pin, solder tail, single row"): insulator 3.17, Ø0.76 pin 3.6, cut to 20 from 800-10-064-10-002101 when used. The 3.6 post passes the 2.4 clip by 1.2 and stops 0.1 short of the 3.7 bore, so the stack is the same 7.37 (4.2 + 3.17). Availability read 2026-10-05 and 2026-10-06: socket Digi-Key 344 (Active), TTI Europe 200, no LCSC listing; header Mouser 5, LCSC C6091837 0; the 64-way strip Digi-Key 236, Mouser 76. Preci-Dip publishes no lifecycle field, so Digi-Key's "Active" stands in for the status (R-55, D-A-8). Source: [envelope.md §1][env].

**Contact capacitance.** Catalogue p. 53 states none; the I²C budget's 2 pF per contact ([R-21](decisions.md#r-21)) stands as an allowance on the Preci-Dip's ≤ 1 pF figure for the same 2.54 geometry (open item I2C-RISE-AND-DEBOUNCE).

**Bring-up check.** Insert and withdraw a module once and confirm every contact is continuous and the module is held (MODULE-SOCKET-MATE).

### FIG-STACK-HEIGHT

Paper analysis of an unbuilt board. **Inputs:** socket insulator 4.19 and header 3.18 to its seating plane (Mill-Max p. 53); module PCB 1.6; tallest module part 6.2 (SW_RESET / SW_BOOT, C&K PTS645 V, through-hole, Littelfuse datasheet revised VL 01/29/26); the tallest lead over the module 1.4 below the board (the HCTL button's, 3.0 − 1.6; pot and LED leads trimmed to it); the 1 mm tolerance. **Method:** the stack is the sum of the four heights from the audio board's underside; the connector-face limit is the room between the underside and the module's connector face (socket + header) less the lead and the tolerance. **Source:** [envelope.md §4][env]; [R-61](decisions.md#r-61).

| Socket | Header (to its seating plane) | Module PCB | Tallest part | **Stack** | Connector-face limit |
| --- | --- | --- | --- | --- | --- |
| 4.19 | 3.18 | 1.6 | 6.2 | **15.17** | 4.19 + 3.18 − 1.4 − 1.0 = **4.97** |
| *Fallback: Preci-Dip 4.2* | *3.17* | *1.6* | *6.2* | *15.17* | *4.97* |

Against the room: 18.7 − 15.17 = 3.53 nominal, **2.53** after the tolerance, to the back plate's centre face (FIG-HEIGHTS-UNDER-BOARD). Our module places nothing on its connector face but the J_MOD headers, and the Daisy Seed's drawing (datasheet v1.2.0 p. 10) shows parts only on its top face, so neither module uses the 4.97 allowance. Every module, ours and any other, must keep to it (split spec §5.1.2 rule 1).

### FIG-SEED-IN-SOCKETS

Paper analysis of an unbuilt board. **Inputs:** the Seed's drawing ([Daisy Seed datasheet v1.2.0 p. 10][seedp10]): 8.4 from its PCB's underside to the pin tips, 5.6 from its PCB top to its tallest part; its header insulator, which the drawing does not dimension, taken as the standard 2.54 of a 0.100 in header (Samtec TSW F-226), so the posts are 5.86; the Mill-Max socket's 4.19 insulator and 3.71 bore. **Method:** a post longer than the bore bottoms in it and holds the insulator up by the difference; the Seed's PCB depth is the socket height less the bore plus the pin length. **Source:** [envelope.md §1][env]; [R-61](decisions.md#r-61).

- The 5.86 posts bottom in the 3.71 bore, so a Seed sits **2.15** proud of the socket tops (5.86 − 3.71).
- Its PCB is 4.19 − 3.71 + 8.4 = **8.88** below the audio board's underside, whatever its insulator, and its tallest part 8.88 + 1.6 + 5.6 = **16.08** down: 2.62 from the back plate's centre face, **1.62** after the tolerance.
- It mates: its 0.635 square posts are inside the "0,64 square" the receptacle accepts.

The insulator is an assumption; first bring-up with a Seed confirms the proud height and the mate (MODULE-SOCKET-MATE). The split spec records this as a known development limitation (§5.1.1).

### FIG-SOCKET-TAILS

Paper analysis of an unbuilt board. **Inputs:** the socket tail 3.18 (Mill-Max p. 53 FIG. 4; the Preci-Dip's is the same); the board 1.6; the RV16AF-41's body rear face 10.7 − 9.1 = 1.6 above the board (RV16AF-41 side view, body depth 9.1). **Method:** the tail's height above the top face against the pot body's height there. **Source:** [envelope.md §5][env]; split spec §5.1.2 rule 3.

The tails stand 3.18 − 1.6 = **1.58** above the top face, and both 51.3-long socket rows (box frame y 11.70 … 14.74 and 26.94 … 29.98, x 30.53 … 81.83) pass under the three rear-row pot bodies, 1.6 up: untrimmed, a tail clears a pot body by **0.02**, not the 1 mm tolerance. Trimmed to at most 0.6, it keeps 1.0 (EC-LEAD-TRIM). `envelope.md`: no change to layout B's arrangement avoids it (the rows run under all three rear pots in any orientation that keeps the socket rows clear of the leads), and no surface-mount socket fits ([§8](#8-what-did-not-cross)). In plan the tails clear every other top-face part by 1.82 or more.

### FIG-USB-PLUG-COLUMN

Paper analysis of an unbuilt board. **Inputs:** the HRO TYPE-C-31-E-17 drawing (rev A, 2022.11.23): height 6.00 ±0.1, body 9.70, ring flange 10.38 × 4.59; the plug overmold's section bounded at 12.85 × 7 by the USB Type-C Cable and Connector Specification Release 2.0 §3.10.2 Figure 3-79 (recommended receptacle spacing); the module outline in layout B. **Method:** the bounding section, centred on the receptacle, placed in the box frame and checked against every underside part. **Source:** [envelope.md §1, §5][env]; [R-60](decisions.md#r-60).

The column lies at box x 28.97 … 35.97, y 30.31 … 43.16, inside the module's outline, **8.11** from the left-wall jacks (J_OUT_L, J_OUT_R, J_EXP), 21.81 from K_BYP_OUT and 53.94 from K_BYP_IN; nothing hangs below the module there. The receptacle stands at most 6.10, under the 6.2 tallest part, so the stack stays 15.17. Its locating pegs (about 0.4, undimensioned) stay inside the 1.6 module PCB. **Bench note:** the plug's removal force (HRO: 0.8–2.0 kgf, up to 19.6 N) pulls the module out of its sockets, so hold the module against the board while withdrawing the plug. The drawing's layout note "THICKNESS 0.8±0.10MM" against a 1.6 module, the land pattern and the footprint are open item USB-DFU-VERTICAL.

## 4. The six control positions and layout B

### 4.1 Layout B: the placement

Positions in the box frame (§Words used here), from `envelope.md` §5 and `layouts.md`. Source: [envelope.md §5][env]; [layouts.md][lay].

| Part | x | y |
| --- | --- | --- |
| POS1–POS3 (rear row; each an RV16AF-41 pot or an HCTL button; pot pin rows 16 forward of the shaft) | 28.50, 56.33, 84.16 | 22 |
| POS4–POS6 (front row; pot pin rows 16 rearward) | 28.50, 56.33, 84.16 | 49 |
| FSW1, FSW2 (actuator axes; collars 14.05 square) | 25.50, 87.16 | 77 |
| LED1, LED2 (between the footswitches) | 42.00, 70.66 | 77 |
| J_OUT_L, J_OUT_R, J_EXP (left wall) | 0 … 20.86 | centres 20.4, 40.2, 60.0 |
| J_IN_L, J_IN_R (right wall); J_DC (right wall) | 91.80 … 112.66; 98.11 … 112.66 | centres 20.4, 40.2; 57.0 |
| K_BYP_OUT, K_BYP_IN (rear corners) | 12.25 … 22.75, 89.91 … 100.41 | 1.5 … 8.5 |
| Module outline, turned 90° | 28.85 … 83.82 | 10.70 … 65.82 |
| FSW1_BOARD, FSW2_BOARD (hung, 24 × 15, on 5 mm spacers and shims, §5) | 13.5 … 37.5, 75.16 … 99.16 | 70.5 … 85.5 |

**What the grid gives** (`layouts.md`): knob centres 27.8 apart across and 27 front to back; 8 between 19 mm knobs (the common MXR and Davies 1510 size); knobs 10.78 from the nearest footswitch nut; the footswitches 61.66 apart and 10.16 from the inside front wall; the LEDs 16.5 inboard of each footswitch, level with them. Every pair of parts on each face is at least 1 apart (smallest: 1.30 on the top face, 1.10 underneath, 1.30 for leads), inside the box and clear of the corners. All six positions' lead fields cross the module outline, at most 1.4 below the board, at least 1 clear of the two socket bodies, which the 4.97 connector-face limit allows (FIG-STACK-HEIGHT).

**The rules the plan check uses** (`layouts.md`, "Rules used"):

| Rule | Value | Why |
| --- | --- | --- |
| Clearance between parts | 1 | the pedal's mechanical tolerance |
| Space between knobs | at least 4 | so each knob can be gripped without turning its neighbour (a design choice) |
| Knob to footswitch nut | at least 10 | so a foot on the switch does not catch a knob (a design choice) |
| Relay to its jacks | within 10 | short audio wiring |
| LED to its footswitch | within 20 | so the light is seen as that switch's |
| Pot leg row | 16 off the shaft | the RV16AF-41 drawing; the rows point into the gap between the knob rows |

**Why leads cross the module.** `layouts.md`: the module is 55 × 55 in a 112.66 × 87.16 box, and two rows of positions with their legs span about 30 front to back and 54 side to side, so "Keeping every leg off the module turns out to be impossible with six positions" once the jacks and footswitch boards are in. That is why layout B rests on the connector-face limit (FIG-STACK-HEIGHT) and the lead trim (EC-LEAD-TRIM).

**Comparable pedals** (`layouts.md`, read 2026-10-05): the PedalPCB Terrarium (six pots in two rows of three, LEDs above the footswitches), the Cleveland Music Co. Hothouse (6 pots, 3 toggles, 2 footswitches, 2 LEDs), the GuitarML Funbox, and Chase Bliss pedals (seen only as a search summary). The S1 report recommended candidate A (the LEDs directly above the switches); the owner chose B (O-18).

### 4.2 Both fits on every position

Each position carries the pot footprint and the button footprint on the same axis, with the button's pull-up R_PUn beside them. The RV16AF-41's three pins sit 16 from the shaft axis (RV16AF-41 drawing, PCB MOUNTING HOLE DETAIL), so the button's 6 × 6 land, centred on the axis, falls inside the pot body's Ø17 plan and clear of the pot's pins: a pot and a button cannot both be fitted. The per-effect fit is a KiCad 10 design variant (each variant marks parts fitted or Do Not Populate per symbol instance and carries it to the board), and the overlapping courtyards are declared on the button footprint with the footprint attribute "Exempt from courtyard requirement". Source: split spec §5.1.2. Whether the PCBWay plugin exports only the active variant's fitted parts was left for S2 to confirm and never was (CONTROL-POSITION-VARIANTS).

The electrical scheme per position (R_POSn 10.0 kΩ and C_POSn 100 nF always fitted; R_BTNn 1.00 kΩ always fitted; R_PUn 10.0 kΩ to 3V3_D with a button) is in [architecture.md](architecture.md) §4.7 and [analog.md](analog.md) §12; it is not restated here.

### 4.3 The layout-B picture

[layout-B.svg](layout-B.svg) is a byte-identical copy of the pedals file at the pin ([pinned link][svg]), carried as the record of layout B, the layout the owner chose ("I prefer B", [O-18](decisions.md#o-18)). It was last regenerated at pedals commit `753d63e` (2026-10-06 12:55), before the commits that made R-60 and R-61 (`9693f7d`, 14:08) and R-62 (`a705f7f`, 16:23); each of those rulings leaves layout B as it was (R-60: "Layout B's drawing is unchanged"; R-61: "layout B unchanged"; R-62: "The NMJ6HCD2 and layout B stay"). It shows, to scale in mm, the top with every position a knob, the top with a mixed fit (POS1–POS3 knobs, POS4–POS6 buttons), and the underside seen through the board. A pedals script generated it; nothing in this repository regenerates or edits it.

**What the file at the pin is, found by this port.** The picture on the screen when the owner said "I prefer B" was `candidate-B.svg` at pedals commit `b0e69c8` ([pinned link][svg-chosen]); commit `216f324` renamed it `layout-B.svg`, and the pedals script regenerated it four times more by `753d63e` (2026-10-06). Comparing the two pinned files, the control, footswitch, LED, jack and relay positions are unchanged. What changed is the title ("Candidate B:" became "Layout B (baseline, owner 2026-10-05):"), the module outline (55.09 became 55.12, the header change of R-54), the socket bodies (51.55 × 2.99 at x 30.41 became 51.3 × 3.04 at x 30.53, the socket changes), and the hung boards (12 deep at y 71 became 15 deep at y 70.5, R-56's board). The file here is therefore the chosen layout as the S1 rulings left it, not the exact bytes he looked at.

## 5. Footswitches

### 5.1 The actuator

The owner chose the DAIER PBS-24-MP (Tayda A-8660, "Momentary PCB Spring Switch"; [O-17](decisions.md#o-17)) and gave the Alpha SF12030F as the part it likely copies (owner-supplied fact [F-3](decisions.md#f-3)); the Alpha's printed dimensions are the primary source, and the two agree within 0.5 everywhere. A cap and plug in an M12 bushing push a steel spring onto a tactile switch on a PCB; an internal conical spring returns the plug. The Tayda listing: "This component does not contain an internal switching mechanism. Instead, it uses a spring to actuate a switch mounted on a PCB."; "Action Force: 2.5 ± 0.8 Kgf"; "Life: ≥10,000 cycles". Source: [controls.md §1][ctl].

| Dimension | Alpha SF12030F (printed) | PBS-24-MP | Difference |
| --- | --- | --- | --- |
| Cap top to bushing top | 10.2 | 9.80 (printed) | 0.40 |
| Bushing top to S-nut / collar bottom | 14.3 | 14.80 (printed) | 0.50 |
| S-nut / collar thickness | 5.0 | 4.90 (measured) | 0.10 |
| Free spring below it | 6.0 ±0.3 | 6.00 (printed arithmetic) | 0 |
| Hex nut | 2.00 (measured) | 2.19 (measured) | 0.19 |
| S-nut / collar diameter | Ø14.0 | 14.05 (printed) | 0.05 |
| Cap travel | 5.1 (10.2 − 5.1) | 4.97 (measured) | 0.13 |

"Measured" lengths were read off the drawings: the Alpha's section at 400 dpi (46.1 px/mm, scaled from the printed 14.3 and 5.0), the PBS-24-MP's 600 ppi raster at 46.31 px/mm (the mean of the scales from the printed 14.80 and 30.60) (FOOTSWITCH-PAPER-READINGS). The owner on the travel: "it looks like the throw of the spring is about 5mm" ([F-2](decisions.md#f-2)).

### 5.2 The two lid stack-ups

Asked whether a PBS-24-MP was on hand ([F-6](decisions.md#f-6): he had none), the owner answered "No, design for both", the option "Make the switch-board spacer height work for either mounting (e.g. pick a switch and spacer whose rest-gap window covers both, or plan an adjustable spacer), and confirm on the first build." ([R-56](decisions.md#r-56), owner.)

- **(a) Collar on the panel.** The knurled S-nut or collar seats on the top panel's inner face; the hex nut (and a washer) clamp from outside. Spring tip below the panel's inner face: collar + spring = **11.00** (Alpha), **10.90** (PBS-24-MP).
- **(b) Panel between two nuts.** An inner hex nut, run down against the collar, takes the panel's inner face; the outer nut clamps from outside; the collar hangs below. Tip: nut + collar + spring = **13.00** (Alpha, its 2.00 nut), **13.09** (PBS-24-MP, a second nut of its 2.19 kind). As drawn, the Alpha's lower nut sits 1.14 up the thread, which would drop the tip by that much more, so in (b) the inner nut must be run down onto the collar.

### 5.3 The switch: Schurter LSH (the controller's realisation under R-56)

A Schurter LSH gull-wing 6 × 6 tact switch ([Schurter 6x6 tact data sheet][schurter], 02.09.2025): body 6 × 6, 3.6 tall; pads 10.00 apart and 2.10 long, rows 4.50 apart; actuation force **1.6 ± 0.5 N**; travel **0.25 +0.2/−0.1**; more than 10⁵ operations; **end-stop strength 50 N / 3 s**; operating −20 to 70 °C. Its actuator diameter is not printed for the height-variable types; measured on the drawing against the 6 mm body it is 3.65–3.85, and 3.6 is taken (FOOTSWITCH-PAPER-READINGS). It replaces the C&K PTS645SM43SMTR92 LFS, which publishes no load rating. The owner on what the switch carries: "the switch is actuated by a spring. The whole point of the spring is to offer forgiving compliance that translates a hard foot stomp to a gentle button press". Source: [controls.md §1][ctl]; [R-56](decisions.md#r-56).

### FIG-SPRING-RATE

Paper analysis, on a stated assumption. **Inputs:** the Alpha's "Operating Force: 650±200 gf.cm", read as gf; the cap's 5.1 travel. **Method:** the force is assumed to be the spring's over the whole travel, linear: 450 gf / 5.1 and 850 gf / 5.1. **Source:** [controls.md §1][ctl].

**0.87 … 1.63 N/mm.** Neither actuator publishes the spring's rate. The internal return spring counts in this bound, which overstates the steel spring: conservative for the load on the switch, optimistic for closing it, so the first build confirms the closing (CONTROLS-FIRST-BUILD).

### FIG-REST-GAP-WINDOWS

Paper analysis of an unbuilt board. **Inputs:** FIG-SPRING-RATE; each actuator's cap travel (5.1, 4.97); the Schurter's force (1.1 … 2.1 N) and travel (largest 0.45); the 1 mm tolerance. **Method:** the rest gap is the spring tip's height above the switch actuator at rest; two rules, each in the worst case of ±1: at rest at most **0.2** of preload (0.33 N at 1.63 N/mm, 30 % of the Schurter's smallest 1.1 N); and at a full stomp the weakest spring at the largest gap, compressed until the cap seats, less the switch's largest travel, pushes at least the switch's largest force (2.1 N). **Source:** [controls.md §1][ctl].

- Windows: **Alpha 0.80 … 1.22**, **PBS-24-MP 0.80 … 1.09**.
- Both actuators fit in (a) only if the switch top is 11.80 … 11.99 below the panel, and in (b) only at 13.89 … 14.18: two windows 0.19 and 0.29 wide, 1.90 apart. No single switch height covers both stack-ups; the hardware comes in 0.5 steps (spacers, ISO 7092 M3 washers) and (a) and (b) need different remainders, so the switch height differs between builds too.

### FIG-FOOTSWITCH-BUILDS

Paper analysis of an unbuilt board. **Inputs:** the audio board's underside 12.30 below the panel; two Würth WA-SMSI 9774050360R M3 SMT spacers, **5 mm** (LCSC C19274041, 2,265 in stock, read 2026-10-06; the 4 mm part showed 0); ISO 7092 M3 shims 0.5 each; the switch heights; the spring tips of §5.2. **Method:** switch top = 12.30 + spacer + shims − switch height; rest gap = switch top − spring tip. **Source:** [controls.md §1][ctl]; [R-56](decisions.md#r-56).

The audio board is the same for both builds; the hung board's PCB is the same; its switch, shims and 2-pin header differ.

| Build | Stack-up | Switch | Shims per spacer | Switch top below the panel | Rest gap Alpha / PBS-24-MP | Header |
| --- | --- | --- | --- | --- | --- | --- |
| **A** | (a) collar on the panel | Schurter **1301.9316.24**, 7.00 (LCSC C6390328, 750) | **3** (1.5) | 12.30 + 5 + 1.5 − 7.00 = **11.80** | 0.80 / **0.90** | TSW-102-14-F-S (C5803811, 214) |
| **B** | (b) panel between two nuts | Schurter **1301.9314.24**, 4.30 (LCSC C4364459, 498) | **2** (1.0) | 12.30 + 5 + 1.0 − 4.30 = **14.00** | 1.00 / **0.91** | TSW-102-07-F-S (C3331037, 3,987) |

Both builds put both actuators inside their windows. For the PBS-24-MP the margins are 0.10 / 0.19 (A) and 0.11 / 0.18 (B) inside 0.80 … 1.09; the Alpha in build A sits at its window's floor, 0.80. In the worst case for closing the spring still pushes **at least 2.26 N** against the switch's largest 2.1 N. Stock figures are LCSC's, read 2026-10-06. **Assembly instruction:** choose the build by the stack-up the enclosure uses; in (b) run the inner nut down against the collar before the panel goes on. **First-build check:** press the cap until it seats and confirm the switch closes, the spring is not coil-bound, the tip lands on the actuator, and the switch is open at rest; if a gap is wrong, one 0.5 shim moves it the right way (CONTROLS-FIRST-BUILD).

### FIG-FOOTSWITCH-LOAD

Paper analysis of an unbuilt board. **Inputs:** FIG-SPRING-RATE (stiffest 1.63 N/mm); the smallest gap and smallest switch travel over both builds; the switch's 50 N / 3 s end-stop strength; a 2.0 design factor (Vidosic, as quoted in Juvinall and Marshek; the section number is not confirmed, FOOTSWITCH-PAPER-READINGS); the PBS-24-MP's "2.5 ± 0.8 Kgf". **Method:** the most the spring can put on the switch is its rate times its largest compression once the cap seats; the actuator's figure is also read, at its worst, as a force reaching the switch: (2.5 + 0.8) kgf × 9.807 N/kgf. **Source:** [controls.md §1][ctl]; [R-56](decisions.md#r-56).

- The spring's most: **8.42 N** (build A with the Alpha), **5.94 ×** under 50 N, above the 2.0 design factor.
- The actuator's figure at its worst: **32.36 N**, also under 50 N (1.55 ×). So no reading of the "Action Force" matters.
- The spring compresses 3.81 … 4.05 when the cap seats, and the stomp then bottoms on the bushing and the panel, not on the switch. Omron's tactile-switch precautions warn against "applying additional force after the plunger has stopped", which is why the spring's compression is bounded rather than the stomp passed through.

**Temperature** ([R-55](decisions.md#r-55)): the Schurter's −20 to 70 °C caps the footswitch claim at 70 °C, above the platform's 57 °C envelope ([R-20](decisions.md#r-20)), so no operating condition is lost.

### FIG-FOOTSWITCH-DEPTH-CHAIN

Paper analysis of an unbuilt board. **Inputs and method:** the stack-ups of §5.2 and FIG-FOOTSWITCH-BUILDS, each depth measured below the top panel's inner face. **Source:** [controls.md §1][ctl].

| Item | Build A, stack-up (a) | Build B, stack-up (b) |
| --- | --- | --- |
| Collar underside | 5.00 (Alpha) / 4.90 (PBS) | 7.00 / 7.09 |
| Audio board top face | 10.70 | 10.70 |
| Free spring tip | 11.00 / 10.90 | 13.00 / 13.09 |
| Switch actuator top | 11.80 | 14.00 |
| Audio board underside | 12.30 | 12.30 |
| Switch body top | 15.20 | 14.70 |
| Hung board top face | 12.30 + 5 + 1.5 = 18.80 | 12.30 + 5 + 1.0 = 18.30 |
| Hung board underside | 20.40 | 19.90 |
| The back plate lip's top, under the hung board (R-62) | 28.00 | 28.00 |

*Not in force:* Hammond's pocket face at 29.75 as the bottom of this chain, and the hung boards' 9.35 / 9.85 to it (before R-62).

### 5.4 Clearances, attachment and connection

- **Panel hole** ([R-55](decisions.md#r-55)): ISO 273's fine-series clearance for M12, 13.0, plus 0.4 powder coat = **Ø13.4**. The medium (13.5) or coarse (14.5) series would leave the PBS-24-MP's nut (13.65 across the flats) uncovered. The flats bear on only 0.125 a side, so an **ISO 7089 M12 washer** (bore 13.0, OD 24, 2.5 thick) goes under the outside nut. PBS thread to spare: 2.95 in (a), 0.76 in (b).
- **Audio board:** a **Ø7.0** hole on each footswitch axis (the Ø5.0 spring plus 1 a side). In (a) the switch actuator reaches 0.50 into it; in (b) the spring tip comes 0.79 out of it toward the switch.
- **Spring tip on the actuator:** the PBS-24-MP's Ø1.5 tip, 1 off centre, reaches 1.75 from the axis, inside the actuator's 1.80 radius.
- **Top face under the collar:** parts within the 14.05 keep-out stay at or under **4.70** in (a) and **2.61** in (b). The header posts stand 2.57 (A) and 0.78 (B).
- **Underside:** the hung board (24 × 15, provisional) lies over the lip band, 1.66 from the front wall, 7.60 (A) / 8.10 (B) above the lip's top, 6.60 / 7.10 after the tolerance. On the hung board the switch is turned 90°, its pads across the board, 1.80 from each spacer; the header sits beside a spacer, 7.75 along and 6.0 across the board from the axis, 1.73 from the spacer and 1.23 from the board edge (on-board placement, judged by IPC-7351B courtyards, not the 1 mm enclosure tolerance). The hung boards keep at least 1 from the module, the relays, the jacks and the LED leads.
- **Attachment and connection** (owner question, 2026-10-05: "how will the hung boards be attached? Soldered headers?"). The two 5 mm spacers are soldered to the audio board's underside; the build's shims go on the screws and the hung board is screwed to the spacers from below. FSWn and GND cross on a 2-pin 2.54 straight header soldered through both boards at final assembly, its insulator on the hung board: in build A a TSW-102-14-F-S (13.46 overall, 2.79 tail, 8.13 post; 1.19 of tail below the hung board, 2.57 of post above the audio board), in build B a TSW-102-07-F-S (10.92 overall, 2.54 tail, 5.84 post; 0.94 and 0.78). A straight-through header takes any gap up to its post length, so the spacers and shims alone set the rest gap. The audio board gets the header's two through-holes 7.75 along the board (toward the wall) and 6.0 toward the player from each footswitch axis (`LAYOUT-CARRYFORWARD.md`). **Build note:** PCBWay builds the hung boards separately (the build's switch is the only difference), so the header's joints on the audio board and the screws are made at final assembly. The series resistors, the pull-ups and the LEDs stay on the audio board.

Source: [controls.md §1][ctl]; [LAYOUT-CARRYFORWARD.md][lcf].

## 6. The button

**HCTL TC-6610-17-100G** ([HCTL drawing rev A][hctl], LCSC C2845265): 6 × 6 through-hole tactile switch, stem Ø3.0 ±0.1, **17 ±0.2** from the seating plane to the stem top, cover 2.8 plus 0.5 bosses, 7.6 ±0.2 across the bent leads, leads 3 below the seating plane, 100 ±50 gf, 100,000 cycles. It mounts on the audio board's top face with no extension. LCSC showed it Active with 840 in stock on 2026-10-05. Source: [controls.md §2][ctl].

### FIG-BUTTON-FIT

Paper analysis of an unbuilt board. **Inputs:** the 17 ±0.2 stem height; the board 10.7 below the panel (EC-BOARD-HEIGHT); the panel 2.25; the 1 mm assembly tolerance; ISO 273's coarse-series clearance for a 3 mm diameter, 3.6; a 0.4 powder-coat allowance. **Method:** proud height = stem − board depth − panel; worst case less 1 and 0.2; hole = clearance + coat; play = (hole after the coat − stem) / 2. **Source:** [controls.md §2][ctl].

- **Proud of the panel:** 17 − 10.7 − 2.25 = **4.05** (2.85 at worst: −1 assembly, −0.2 part).
- **Pressed travel:** the drawing does not print the switch's travel; it is the dome's travel inside the 3.3 body. `controls.md`: whatever it is, the stem stays above the panel face for any travel under 2.85, so a finger pressing the stem actuates the switch before it can touch the panel, and the stem cannot bottom on the panel: it is a plain Ø3.0 cylinder with nothing wider than the hole, and the switch body stops 7.40 below the panel's inner face (CONTROLS-FIRST-BUILD).
- **Panel hole:** 3.6 + 0.4 = **Ø4.0** drilled. After the coat the stem (at most 3.1) keeps **0.25–0.35** of radial play. The coarse series is chosen over the medium (3.4) so a small board-to-panel offset does not make the stem rub. The board is located by the pot bushings in their own panel holes, so those holes and the drilling must hold the button axes within 0.25 of the hole centres (ENCLOSURE-DRAWING-CHECKS).
- **Leads:** 3.0 − 1.6 = 1.4 out of the underside, the figure the connector-face limit is built on (FIG-STACK-HEIGHT).

*Not in force:* the buttons' provisional placement as three separate controls, SW_BTN1 (6.75, 71.25), SW_BTN2 (105.91, 71.25), SW_BTN3 (72.00, 19.25) (`controls.md` §2), superseded by O-18's six positions.

## 7. Assembly rules

The trim rules of EC-LEAD-TRIM go on the S2 fabrication notes and on the PCBWay order page, since the plugin exports only the board. The text the pedals sources give for the order page ([layouts.md][lay]):

> Assembly: after soldering, trim (1) every pot, button and LED lead inside the module outline to at most 1.4 mm below the board and (2) the module sockets' tails to at most 0.6 mm above the board. Reflow each trimmed joint, or inspect it under magnification for damage from the cut (IPC J-STD-001).

The other assembly notes: the module headers are cut from the 64-way strip (§3.2); the footswitch build is chosen by the stack-up, and in (b) the inner nut is run down against the collar (FIG-FOOTSWITCH-BUILDS); the hung boards' header joints and screws are made at final assembly (§5.4); the module is held against the board while the USB plug is withdrawn (FIG-USB-PLUG-COLUMN). That the order carries the trim text is open item TRIM-RULES-ORDER.

## 8. What did not cross

- **The STEP models and their generators** (pedals `h7-platform/mechanical/`, about 47 MB) stay in pedals until layout needs them (port spec, Non-goals). They are listed, with what each models and where it came from, in [mechanical/step/README.md][step]. The 1590BB and 1590BBS enclosure models, the module socket and header models, the actuators and the switches are among them.
- **The analysis code** that checked these figures (`envelopeInputs.ts`, `enclosure.ts`, `controlLayout.ts`, `footswitch.ts`, `footswitchBuilds.ts`, `buttonInputs.ts` and their tests, under pedals `h7-platform/circuit/analysis/`) stays behind: no code crosses. Phase 2 re-derives what it needs from the inputs stated here.
- **The datasheets** in pedals `h7-platform/interface-analysis/sources/` are cited by name and, where the pedals analyses record one, by the vendor's URL.
- **The socket candidates not chosen** (`envelope.md` §1): Samtec SSM-120-L-SV, Harwin M20-786, Samtec HLE-120-02-G-DV, Harwin M20-7812045, Preci-Dip 801-87-020-30-002101 and -30-480101, Mill-Max 801-43-020-10-002000. The single-row SMT parts were ruled out on height against Hammond's drawing; R-62 notes that the SSM's height alone no longer rules it out against the 18.7 centre room (1.01 after the tolerance with the TLW's spacer), "but it needs an unchosen long-post header; not re-opened". The double-row parts do not fit layout B's 4.55 lead band. This is a recorded option, not an open item.
- **Layout candidates A and C** (`layouts.md`): A had the LEDs right above each footswitch; C was a tighter cluster (x 33, 56.33, 79.66; y 20 and 46.85) with 4.3 between knobs. Their code and drawings were removed in pedals when the owner chose B.
- **The button candidate not chosen** (`controls.md` §3): C&K PTS645SK13SMTR92 LFS (13.0 SMT, flush with the panel, needing an extension; LCSC not confirmed). The owner chose option A.
- **The footswitch history** (`controls.md` §3): the Würth WS-TATV 430456043736 board-on-board candidate (dropped: the spring tip reaches below the audio board's top face, and it publishes no static-load rating), and the FS5700 whole-footswitch family: "A whole M12 footswitch still cannot sit on the board: the FS5700 family seats 16.70 mm above its board (E-Switch T790002 Rev B)".
- **The history table of `envelope.md`** (the 1590BBS study, the module on the top face, the PCB-mounted FS5700 footswitches with the board 20.7 under the panel): each was superseded before the O-17 baseline.
- **Dated stock counts** are carried where the sources give them, with their read dates; availability is decided at the PCBWay quote ([OWN-07](decisions.md#own-07)).

## 9. Open items this document raises

In [open-items.md](open-items.md): ENCLOSURE-FIRST-BUILD, ENCLOSURE-DRAWING-CHECKS, MODULE-PART-HEIGHT-READINGS, MODULE-HEADER-SOURCING, AUDIO-BOARD-MECH-LAYOUT, MODULE-SOCKET-MATE, TRIM-RULES-ORDER, CONTROL-POSITION-VARIANTS, CONTROLS-FIRST-BUILD and FOOTSWITCH-PAPER-READINGS. It adds STACK-HEIGHT-OWNER-REPORT (the 15.17 stack and the 4.97 limit, reported to the controller and not shown to have reached the owner) and extends STACK-HEIGHT-CONFIRM (the margins the stack rests on). It relies on rows other documents raised: USB-DFU-VERTICAL (the module's receptacle, its land pattern and thickness note, the plug column, the bench note), I2C-RISE-AND-DEBOUNCE (the 2 pF contact allowance), CONTRACT-FREEZE (`stackHeightMm` and `maxHeightBottomMm` are draft values), MODULE-INTERNAL-PIN-MAP and RECOVERY-PATH-CHECKS.

[env]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/envelope.md
[ctl]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/controls.md
[lay]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/layouts/layouts.md
[svg]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/layouts/layout-B.svg
[svg-chosen]: https://github.com/oletizi/pedals/blob/b0e69c87c0d9a3dc32c9e08740df8017077cbfa8/h7-platform/interface-analysis/layouts/candidate-B.svg
[ledger]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/plans/2026-10-05-h7-split-rulings.md
[split]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/docs/superpowers/specs/2026-10-05-h7-modular-split-design.md
[lcf]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/LAYOUT-CARRYFORWARD.md
[step]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/mechanical/step/README.md
[hammond]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/sources/Hammond-1590BB.pdf
[seedp10]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/sources/Electrosmith-Daisy-Seed-datasheet-v1.2.0-p10.pdf
[schurter]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/sources/Schurter-6x6-tact.pdf
[hctl]: https://github.com/oletizi/pedals/blob/5b926d0aaf002d3ea111786f6ab9cdb72b8a913e/h7-platform/interface-analysis/sources/HCTL-TC-6610-17-100G.pdf
