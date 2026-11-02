# High-resolution amplifier schematic: playback and mode-control circuit pass

**Source:** user's `p2(1).pdf` (Tascam 38 **amplifier** sheet), 5250×9000 px. Inspected rotated native-resolution crop spanning the channel-1 amplifier's left and center circuits and its mating motherboard connectors. **No web-based schematic substitution.**

## Direct circuit observations

1. **Reproduce input relay K101:** 24V is marked at the upper relay-coil supply. **D101** is connected across the coil. A separate switched contact connects the head-input line into the **TR101** transformer/input network. Do not model the relay coil as a signal contact.
2. **First amplifier:** **U101 1/2** is drawn with output pin 7, inputs pins 5/6. Its output goes through **R112 1k** and **C105 10µF/50V** into the following signal path. The preceding network includes **TR101**, **L101 1.2mH**, **C101 470pF** and **C136 470pF**. The schematic marks a **13.1V** local node at this stage.
3. **Source selection:** downstream are three separate devices **Q110 (INPUT)**, **Q106 (SYNC)**, and **Q105 (REPRO)**, with associated switching diodes **D112, D107, D106**. The drawn INPUT/SYNC/REPRO controls are **distinct**, so a replacement must not reduce these to one undifferentiated record/play state.
4. **Output amplifier/mute:** **U101 2/2** is shown with output pin 1 and inputs pins 2/3. The following circuitry includes **Q112**, a relay **K102** supplied from 24V and diode **D210** across its coil. This is a separate output/muting relay from K101.
5. **Additional equalization/control stage:** **U102 1/2** and **U102 2/2** appear in the lower amplifier section, with trim networks and inductors **L103 2.4mH**, **L105 3mH**. These paths are not merely flat-gain playback amplifiers.
6. **Function-control wiring:** **J174/P174**, **J175/P175** and **J173/P173** join the function-board controls to the motherboard, independently of the eight amplifier connector groups. They carry channel-specific switch control buses, not additional amplifier-card edge contacts.
7. **Amplifier mating connector order:** left to right in the native scan, J101/P101 (4), J103/P103 (6), J106/P106 (**8**), J108/P108 (4), J107/P107 (7), J104/P104 (7), J102/P102 (7), J105/P105 (7). **50 contacts total.** The card-side and motherboard-side drawing numbers are aligned at the boundary; do not infer signal identity from geometric adjacency.

## Critical distinction

The preceding items are **component-level and connector-count verification**. The full motherboard-side end-to-end mapping remains incomplete. The native scan visibly distinguishes junction dots from many wire crossings, but verifying a candidate requires tracing each conductor from its pin through every bend and junction. The owner's worksheet is a hypothesis register, not a proven netlist.

## Verification checklist for next pass

- J101/P101: coil return and switched head-input path to P121.
- J103/P103 and J106/P106: distinguish sync-head pickup, record signal and power/ground contacts.
- J108/P108: separate erase head and oscillator routing.
- J107/P107: rail distribution, mute/record controls.
- J104/P104: INPUT/SYNC/REPRO control routing.
- J102/P102 and J105/P105: output and meter connections, including the contradictory J102-5/J105-1-or-2 owner worksheet entries.

## Evidence limits

No numeric head impedance, relay timing, safe test points or full contact netlist can yet be claimed. Do not energize a replacement card from these notes. Motherboard retained, fabrication deferred.
