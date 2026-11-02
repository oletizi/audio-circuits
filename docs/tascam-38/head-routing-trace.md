# Tascam 38 head-to-amplifier routing: tracing pass 2

Source: uploaded **Tascam 38 Complete schematics (High quality scan).pdf**, sheet 1 (Amplifier Schematic Diagram), enlarged head section and central motherboard section. Scope: electrical connectivity only. This document distinguishes directly drawn connector mates from **unresolved downstream net identities**.

## Head PCB → Mother PCB (channel 1)

The head section of sheet 1 explicitly depicts three separate windings and three two-conductor interconnects. Reading from top to bottom:

| Source | Head-board side | Motherboard side | Signal | Confidence |
|---|---|---|---|---|
| REPRO HEAD | P401 → J401 → J121 | P121 | Reproduce-head pair | High (connector family and winding) |
| SYNC HEAD | P402 → J402 → J151 | P151 | Sync-head pair | High |
| ERASE HEAD | P403 → J403 → J161 | P161 | Erase-head pair | High |

The drawing also shows the repeated channel 2–8 families: **J122–J128/P122–P128** (repro), **J152–J158/P152–P158** (sync), **J162–J168/P162–P168** (erase). These are separate from the amplifier card's J101–J108 connections.

**Important:** This table verifies which winding connects through which connector family; it does **not** establish winding polarity, shielding termination, or which amplifier card contact receives each wire. Those must be established by tracing the dense motherboard lines and their junctions. The source calls the second winding a SYNC HEAD; do not infer a separate physical record head solely from this label.

## Amplifier card ↔ motherboard

The central drawing directly shows the mated pairs **J101/P101 (4 contacts)**, **J103/P103 (6)**, **J106/P106 (7)** and **J108/P108 (4)**. Each numbered contact mates to the same number on the opposite half of the horizontal board boundary. These 21 contacts are **not** yet assigned signal names.

The upper/lower drawings repeat the same amplifier card interface for channels 2–8. There is one interchangeable card design (owner-confirmed).

## Function and common supply routing

- **J174/P174** and **J175/P175** route grouped function-switch signals for channels 1–8; **J173/P173** is an additional four-contact function-board connection. These are motherboard/control connectors, not amplifier-card contacts.
- The motherboard's **P171/J171** has the following directly printed nets: contact 1 `6V`, 2 `0V`, 3 `POWER MUTE`, 4 `REC MODE`, 5 `REC SIGNAL`, 6 `PLAY MUTE`, 7 `0V`, 8 `24V`, 9 `+B(15V)`, 10 `-B(-15V)`, 11 `0V`. This is a verified *bus connector* mapping; it is not an amplifier card mapping.
- **P172/J172** is a distinct two-contact connector next to P171/J171; its electrical identity is not assigned in this pass.

## Signal path segments still unresolved

1. Trace the two wires leaving **P121** to exact amplifier contacts (including junctions and any mode switching).
2. Trace **P151** and **P161** separately; do not conflate low-level sync pickup with erase or record drive.
3. For every **P101, P103, P106, P108** contact, identify both its motherboard destination and card-side component node.
4. Then trace the remaining **P104, P107, P102, P105** contacts (28 contacts).
5. Distinguish a wire crossing from a connected junction dot in the large-format scan before marking any endpoint verified.

## Why this is not yet a pinout

The full-size drawing contains dense crossings, and the cropped overview does not reliably distinguish all junctions. Assigning connector nets based on vertical alignment or proximity would create false circuit information. Keep unknown assignments explicit until each path has been visually followed to a labeled endpoint.

**Development decision:** Leave motherboard unchanged, prioritize a working compatible amplifier card, and defer fabrication/enclosure topics.
