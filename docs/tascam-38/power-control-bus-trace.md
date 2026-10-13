# Tascam 38 schematic: verified power/control bus and connector inventory

Source: user-uploaded *Tascam 38 Complete schematics (High quality scan).pdf*, **sheet 1 (amplifier)**. Source SHA-256 `b9d7cb5f16964db0def11d54ae059681e07d02f86720e102469009b2d5ccea69`.

## Verified P171/J171 power-supply interface

The bottom-middle motherboard drawing shows connector **P171** mating **J171**. Eleven individually numbered conductors go to explicitly named supply/control nets, in the following drawing order. This is a **motherboard-to-power-supply-section connector**, NOT one of the amplifier card's J101–J108 interfaces.

| Contact | Label in drawing |
| --- | --- |
| 1 | `6V` |
| 2 | `0V` |
| 3 | `POWER MUTE` |
| 4 | `REC MODE` |
| 5 | `REC SIGNAL` |
| 6 | `PLAY MUTE` |
| 7 | `0V` |
| 8 | `24V` |
| 9 | `+B (15V)` |
| 10 | `-B (-15V)` |
| 11 | `0V` |

This establishes the **named motherboard bus signals**, but it does **not** establish which J101–J108 contact receives each signal. Those branches must be traced individually. Voltage labels are schematic nominal values, not live measurements.

## Head board

The left-hand head assembly drawing shows **REPRO HEAD**, **SYNC HEAD** and **ERASE HEAD** for channel 1, terminating at **P401/P402/P403**, through **J401/J402/J403**, then **J121/J151/J161** to **P121/P151/P161** on the motherboard. The repeated channels 2–8 use grouped connector designators **J122–J128**, **J152–J158**, **J162–J168** and their corresponding P connectors. These are source/destination *connector families*, not yet a verified per-contact winding polarity map.

## Amplifier card boundary

The diagram labels the following eight card/motherboard pairs: **J101/P101 (4), J103/P103 (6), J106/P106 (7), J108/P108 (4), J104/P104 (7), J107/P107 (7), J102/P102 (7), J105/P105 (7)**. Numbers in parentheses are visible contact counts, totaling **49**. They are not 49 verified net assignments.

The **J101/P101** connector is located beneath the channel-1 amplifier input area; the head path also passes through the motherboard. Further tracing is needed to prove its per-pin head function. Do not infer that all four contacts carry head audio.

## Next tracing work

1. Trace P121/P151/P161 motherboard conductors into J101/P101 and other amplifier inputs, recording every junction.
2. Follow each J101–J108 contact on the amplifier side to components and mode-switching nodes.
3. Follow motherboard side of each contact to head, line I/O, oscillator, function PCB or P171 buses.
4. Create a complete net table with one row per contact; keep unknown endpoints blank until verified.

**Scope:** Electrical circuit/interface analysis only. Motherboard unchanged; all eight amplifier cards interchangeable. No manufacturing work.
