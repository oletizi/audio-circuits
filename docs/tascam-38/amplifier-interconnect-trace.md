# Tascam 38 amplifier and motherboard: schematic trace, pass 1

Status: **PARTIAL TRACE — not a complete pinout**. Source: user-supplied *Tascam 38 Complete schematics (High quality scan).pdf*, **page 1, Amplifier Schematic Diagram**. Page 2 is the tape transport schematic. All observations below are based on direct visual inspection of the uploaded two-sheet scan, not web snippets. All eight amplifier cards are interchangeable (owner confirmation); the drawing renders channel 1 in detail and channels 2–8 as repeated interconnects.

## Drawing structure and boundary

The horizontal dashed boundary separates **REC/PLAY AMPL PCB** (above) from **MOTHER PCB** (below) for channel 1. Matching **P10x/J10x** connector groups appear on either side. The repeated channel 2–8 section shows the corresponding groups feeding the common motherboard buses. This is the *existing interface*, which remains in place for the first working card.

### Connector groups seen at channel-1 boundary

| Amplifier connector | Motherboard mate | Visible numbered contacts | Confidence | Trace status |
| --- | --- | --- | --- | --- |
| J101 | P101 | 4,3,2,1 (shown in drawing order) | High | Partial; see below |
| J103 | P103 | 6,5,4,3,2,1 | High | Partial |
| J106 | P106 | 7,6,5,4,3,2,1 | High | Partial |
| J108 | P108 | 4,3,2,1 | High | Partial |
| J104 | P104 | 1,2,3,4,5,6,7 (drawing order) | High | Partial |
| J107 | P107 | 1,2,3,4,5,6,7 | High | Partial |
| J102 | P102 | 1,2,3,4,5,6,7 | High | Partial |
| J105 | P105 | 1,2,3,4,5,6,7 | High | Partial |

**Caution:** Contact counts/order are readings of the *schematic symbols*, not yet independently verified physical connector orientation or pin numbering. The figure uses opposite drawing orders on some connectors.

## Specific circuit and interface observations

1. **Reproduce/sync head signal path:** The **HEAD PCB** is at the left of the amplifier drawing and routes via the **MOTHER PCB** to the amplifier. J101/P101 sits under the low-level head input section. The circuit immediately above J101 includes a **K101** relay, transformer **TR101**, and **U101 1/2** (op-amp), with head-source switching and equalization circuitry farther right. Exact contact-to-head mapping needs tracing at full magnification.
2. **Power and switching:** J103/P103 and J106/P106 are shown underneath the amplifier's input/monitor switching and reproduce sections. The circuit has explicit **+24 V**, **-15 V**, and **0 V** markings; these are *circuit node annotations*, not yet a proven pin assignment for either connector.
3. **Reproduce equalization and output:** The signal chain includes **U102**, transistor/JFET switching, trim/equalization networks, and mode-dependent paths. Do not replace the original path with a generic flat-gain preamp without preserving tape equalization and switching.
4. **Bias/record:** The amplifier contains a **BIAS AMPL** section, bias trap/filter inductors, and record-head driver circuitry. J104/P104, J107/P107, J102/P102 and J105/P105 participate in the wider interconnect; each contact must be traced before determining which can safely be unused in a reproduce-only prototype.
5. **Motherboard distribution:** The lower drawing explicitly labels buses **6V, 0V, POWER MUTE, REC MODE, REC SIGNAL, PLAY MUTE, 0V, 24V, +B(+15V), -B(-15V), 0V** going toward the power-supply section. This is an ordered list of visible bus labels, **not a mapping to particular pins**.
6. **Mode-selection architecture:** The FUNCTION PCB routes channel-specific control through connector groups into the MOTHER PCB. The OUT SELECT PCB and IN/OUT PCB likewise terminate on the motherboard. The original motherboard therefore provides both common buses and channel-specific signal routing.

## Work required for a complete electrical netlist

- Trace **each contact** on J101, J103, J106, J108, J104, J107, J102, J105 to its endpoint on both sides of the dashed boundary.
- Separate direct copper joins (solid junction dots) from crossings without junctions.
- Classify each net: head-level audio, line audio, record/bias, switching, power, ground, meter.
- Record which nets change with REPRO, SYNC, INPUT, REC and mute states.
- Check head switching and relay behavior before any live experiments; do not inject DC into head windings.
- Trace the common power/control buses and channel-specific differences in **motherboard routing**, while retaining one common interchangeable amplifier card.

## Explicitly deferred

PCB outline, fabrication, enclosure, replacement motherboard, cable harness and connector sourcing. **Do not infer a complete pinout from this pass.**

## Next artifact

A contact-by-contact table with columns `connector,pin,card_side_node,motherboard_side_node,signal_class,mode_dependency,source_coordinate,confidence,notes`, with one row per contact and no invented values.
