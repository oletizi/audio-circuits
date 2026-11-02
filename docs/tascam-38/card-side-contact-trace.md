# Tascam 38 — amplifier sheet direct contact-side verification (pass 4)

**Primary evidence:** uploaded *Tascam 38 Complete schematics (High quality scan).pdf*, amplifier sheet 1, enlarged upper-left of the **1ch REC/PLAY AMPL PCB**. This is a **card-side** trace, not a claim that the complete motherboard-side route is resolved.

## J101 and K101: card-side

| Contact | Direct visual evidence | Status |
| --- | --- | --- |
| J101-1 | Conductive trace rises into the heavy common-return bus under TR101/input stage | Card-side ground/common **verified** |
| J101-2 | Conductor rises to the lower end of K101 coil / D101 suppression diode branch. K101 coil upper end marked 24V. | Card-side **K101 coil drive verified**; motherboard control endpoint remains candidate J180-2 |
| J101-3 | Conductor rises to common-return bus alongside J101-1 | Card-side ground/common **verified** |
| J101-4 | Conductor rises into K101's signal-contact area feeding the TR101 input network. | Card-side **repro signal input verified**; motherboard route to P121 still requires uninterrupted conductor trace |

K101's **coil** and its **signal contacts** are separate elements. The 24V annotation is at the coil supply; no evidence that K101 directly shorts the supply through the signal contacts. Do not assume which coil polarity energizes it until the motherboard-side return/control is traced.

## J106 contact-count correction

J106/P106 visibly has **eight** contacts, numbered 8 through 1 on the amplifier sheet, not seven. The 50-contact total supersedes the 49-contact inventory. The card-side drawing contains distinct heavy common-return conductors, including at the J106 end; do not infer every visually similar ground is the same physical return until the junctions are followed.

## Directly readable playback signal topology

- K101 signal contact routes the low-level head signal into a **TR101** transformer/input resonant network with **L101 1.2mH**, **C101 470pF** and **C136 470pF**.
- **U101 1/2** is a gain stage with the drawing's local components **R101 510Ω**, **R102 220kΩ**, **R103 330Ω**, **C102 100pF**, **R104 470kΩ**, **R106 33kΩ**, **C104 270pF**.
- The signal leaves the first stage through **R112 1kΩ** and **C105 10µF/50V**, followed by Q107 and the INPUT/SYNC/REPRO selection elements **Q110/Q106/Q105** and their associated networks.
- A second **U101 2/2** gain stage is downstream; the output then passes through a K102-related mute/output path.
- The lower circuit contains **U102 1/2** and **U102 2/2**, adjustable equalization components, L103/L105 and a separate record/bias path. These must not be collapsed into a generic flat-gain block.

## Next card-side / motherboard-side checks

- Continue J103/J106/J108 card-side tracing; separately verify P101-4 → P121 reproduce and P106-7 → P151 sync.
- Confirm K101 control source at P101-2, and its relation to output-select switching.
- Resolve J102-5 / J105-1 vs J105-2 inconsistency.
- Identify which card contacts are NC versus only undocumented in the owner's sheet.

**No manufacturing assumptions, and no modifications to the motherboard.**
