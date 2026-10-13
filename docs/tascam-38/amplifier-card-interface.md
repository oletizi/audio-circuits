# Tascam 38 amplifier-card interface — investigation log

Status: **Partial schematic review; connector-level electrical pinout NOT verified** (2026-10-12).

## Source inspected

[Tascam 38 8-Track Recorder/Reproducer Schematic Diagram, 12-page PDF](https://manuals.plus/m/ae03866737e45d4a714f2ae747de858fec9e434b0d3a23d2c4691fe690f36b12.pdf). The source's large amplifier drawing spans PDF pages 1–4 (zero-based pages 0–3). This log records only details legible in those images. It is not a pinout or an approved fabrication reference.

## Verified observations from drawing

- The top-level amplifier drawing identifies distinct **HEAD PCB**, **MOTHER PCB**, **REC/PLAY AMPL PCB**, **MASTER OSC PCB**, **IN/OUT PCB**, **FUNCTION PCB**, and **OUT SELECT PCB** assemblies (PDF pages 1–3).
- The head drawing distinguishes **REPRO HEAD**, **SYNC HEAD**, and **ERASE HEAD** connections (PDF page 1). The label **SYNC HEAD** is the schematic's label; its physical relationship to the record head needs confirmation.
- The single-channel amplifier drawing shows **INPUT**, **SYNC**, and **REPRO** selection circuitry and a **BIAS AMPL** block (PDF pages 2–3).
- Component reference list names **U101 JRC-4558D-D**, **U102 RC-4558T1**, **U103 BIAS AMPL**, and **2SK68AM** JFETs (PDF page 1).
- The amplifier-to-motherboard interface is depicted as multiple connector groups (PDF pages 2–4). The page 3/4 diagram visibly distinguishes **1ch REC/PLAY AMPL PCB** and **2ch–8ch REC/PLAY AMPL PCB**. **Do not assume channel 1 and channels 2–8 have identical connector wiring.**
- The motherboard carries signal/control interconnections between the channel amplifier, function selection, head and line I/O boards; its continued use is required in the first prototype.

## What is NOT yet verified

- Complete physical edge-contact count, pitch, thickness, orientation, mating connector type, pin numbering, keying or clearance.
- Electrical function, polarity, safe voltage/current, and signal direction of *each* card contact.
- Whether the amplifier schematic's J/P labels map one-to-one to physically separable connectors or edge-finger groups.
- Head winding inductance/impedance, grounding/shield routing, or calibration constants.
- Channel 1 versus channels 2–8 differences, especially power/mode/oscillator distribution.
- Safe partial-card behavior if record/bias circuitry is omitted.

## Required next evidence

1. High-resolution crops or direct access to a readable full-size amplifier schematic, especially the entire card-to-motherboard boundary on PDF pages 2–4.
2. Photos of both sides of one removed original card and its motherboard connector (power off), with a ruler/calipers reference.
3. Trace connector contact numbers from card to motherboard and log all nets; mark uncertainty explicitly.
4. Measure existing card dimensions and slot clearance; compare channel 1 to another slot.
5. Define a bench-powered dummy/interface verification procedure before inserting any new card.

## Development decision

**Retain the motherboard unchanged until a usable, motherboard-compatible replacement card has been built and validated.** External chassis, harness, and card-edge bypass are deferred. This investigation is **incomplete**, and no schematic/PCB should be generated from this document alone.
