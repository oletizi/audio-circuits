# Audio control topology: closer examination of the amplifier drawing

Source: user-supplied high-resolution amplifier schematic `p2(1).pdf`, detailed channel-1 REC/PLAY AMPL PCB.

## Important topology distinction

Q110 (INPUT), Q106 (SYNC) and Q105 (REPRO) are drawn as controlled branches between the audio/control network and a lower common bus, each with its own diode D112, D107 and D106. They should **not** be modeled as three ordinary series switches selecting among three independent input wires. The topology is consistent with shunt gating/muting, but the full effect of each control voltage and surrounding resistors requires further analysis before assigning an active-high/active-low truth table.

The first reproduce amplifier U101 (half 1) drives R112 (1k) and C105 (10uF/50V), then Q107 and the network leading toward U101 (half 2). R113 (1k) and R115 (2.2k) are visible near the second half of U101. The K102 output mute relay is a distinct device with a 24V coil and D120 suppression diode.

The lower part of the card includes U102 halves, an L103/L105 frequency-shaping network, K103, and a separate U103 section. The U103 circuit shows a 15V supply, a 100pF input capacitor C134, a 1.3mH inductor L106 and test points TP2/TP3. This is not a simple DC control network; its AC-coupled and tuned components matter for the record/bias path. The schematic marks AC65V in this area, which must be treated as a high-frequency circuit annotation rather than a safe measurement instruction.

## Verification boundaries

These are component-level observations, not proof of the 50 contact-to-contact motherboard routes. The precise shunt-device polarity, K102 and K103 timing, and the purpose of the U103 test-point voltages remain to be resolved from the drawing and service procedures. Keep the existing motherboard and do not energize an unverified replacement card.
