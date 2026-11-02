# Reproduce front end — detailed visual trace

Source: user-uploaded Tascam 38 two-sheet high-quality schematic, **amplifier sheet 1**, upper portion of channel-1 REC/PLAY AMPL PCB.

## Directly readable component connections

- **K101** is drawn with a **relay coil**, a separate **changeover signal contact**, and **D101** across the coil. The upper supply to the coil is labeled **24V**. The lower coil terminal continues into the mode-control wiring. Thus the owner's question whether the relay shorts 24V to ground is answered at the circuit-symbol level: **the relay coil is an energized load, and its signal contact is electrically separate**. Exact actuation polarity at the card connector is not yet confirmed.
- The switched reproduce signal enters the network at the **primary of TR101**, with **L101 1.2mH**, **C101 470p**, **C136 470p** around that network. These values are read directly from the drawing.
- **TR101** is a transformer; its secondary connects into the **U101 1/2** input circuit. The drawing labels **R101 510**, **R102 220k**, **C102 100p**, **R103 330**, **R104 470k**, **R106 33k** around this front end.
- **U101 1/2** uses pins 5/6 (inputs) and 7 (output). Its output passes via **R112 1k** and **C105 10µF/50V** to subsequent input/sync/repro selection circuitry.
- A local network containing **Q101**, **Q103**, **D102**, **D104**, **R108 5k trim**, and **R110 5k trim** connects to the front-end bias/equalization circuitry. This is not simply a transformer feeding a fixed-gain op-amp.

## Engineering consequences

1. Replacing TR101 with a direct op-amp input is a **new topology** and requires a noise/loading analysis, not a drop-in substitution.
2. Preserve the function of K101's signal contacts and coil control when modeling the interface; distinguish coil return from head signal ground.
3. Do not assume the card's various 0V and -15V nets are interchangeable merely because they share a schematic label.
4. Playback equalization and mode-dependent attenuation/switching extend beyond this block. A reproduce-only design still needs the downstream path.

## Still not proven

The exact J101/P101 pin assignment for the K101 coil return, head conductor, and their respective returns. The owner worksheet proposes J101-2 and J101-4 respectively; the **component-level topology** above is directly readable, but the complete motherboard trace to those contacts has not yet been independently established.
