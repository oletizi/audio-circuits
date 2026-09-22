The vactrol model is an assumption, and here is how to replace it

Status: accepted, pending measurement. The measurements are deliberately deferred,
not forgotten; this file is the named place they land.

## What is assumed

`lib/sim/models/vactrol.ts` models a vactrol as an LED branch driving a
light-dependent resistor whose resistance follows

    R = darkOhms * exp(ln(litOhms / darkOhms) * clamp(I_LED / fullDriveAmps, 0, 1))

that is, log-resistance linear in LED current, clamped saturating at both ends
rather than extrapolating.

**This law is invented.** It is not from a datasheet, not from a measurement, and
not from the compressor specification. The specification gives two endpoints only
— dark resistance at least 1 MΩ, and at most 10.2 kΩ at full drive — and
explicitly declines to specify the curve between them, naming a calibrated
gain-reduction law and a precise threshold or ratio among its non-goals.

Two endpoints do not define a curve. Linear-in-resistance, linear-in-log-resistance
and a power law all pass through the same two points and produce materially
different compression behaviour. Log-resistance was chosen because it is the
conventional shape for this class of device and because it introduces no numbers
beyond the two the specification already gives. That is a reason to prefer it, not
evidence that it is right.

The LED forward voltage is a second assumption, and a separate one. The LED branch
is built from the registry's `1N4148` — a silicon signal diode, not an LED — plus a
series offset bringing the branch drop to a value the caller must state. It is a
structural stand-in. No claim is made that its curve resembles a real LED's.

## What follows from that

No compression-behaviour assertion rests on this model: not gain reduction, not
threshold, not ratio, not release. Any such number would be an artifact of the
interpolation above, presented as a property of the circuit.

The model exists so the compressor emits a valid netlist and its bias points
resolve. That is its whole job.

## Why the LED forward voltage matters more than it looks

Measured on the specification's §8.7 driver stage — 8.7 V rail, R_LED 3.3 kΩ, 10 Ω
sense resistor, 2N3904 with a 1 kΩ emitter resistor:

| LED representation | I_LED | V_CE |
|---|---|---|
| `1N4148` alone, 0.63 V | 1.5000 mA | 1.5948 V |
| ~1.5 V junction (the spec's assumption) | 1.4987 mA | 0.7286 V |
| ~1.8 V, typical red LED | 1.4983 mA | 0.4442 V |
| ~2.2 V | 1.4746 mA | 0.1757 V |

Two things to read from this.

In this driver stage, LED current is largely insensitive to the forward drop,
because the emitter resistor makes it a current sink: I_E is approximately
(V_DET − V_BE) / R_E. Swapping the bare `1N4148` for the 1.5 V junction moves the
current by 0.087 %; going all the way to 2.2 V moves it by 1.7 %. So a concern
about the forward drop distorting LED current is aimed at the wrong quantity
**here**.

That holds only because of the transistor. In a passive branch — rail through
R_LED straight into the LED, no transistor — the forward drop sets the current
directly, and the same spread moves it by 0.26–0.46 mA on a 1.5 mA target. Both
statements are true of different circuits, and the qualifier is the whole content
of the claim.

The forward drop lands on V_CE instead, and §8.7.2 allocates only 0.74 V there. The
1.5 V row reproduces that allocation, so the specification's own budget is
self-consistent. But the error runs in the flattering direction: a simulation using
a bare `1N4148` shows 1.59 V of collector headroom where the specification's own
assumption gives 0.73 V. This is why the forward voltage is a required parameter
with no default — every deck must state the value it assumes, so the assumption
travels with the result instead of hiding in the model.

Note also that §8.7.2 already requires the LED *current* at which a candidate
vactrol reaches 10 kΩ to be read from its datasheet, while treating the 1.5 V
forward voltage as settled. On these numbers the forward voltage deserves the same
treatment, because the headroom has no room to absorb it being wrong.

### The stated forward voltage is exact at one current only

The stand-in is a silicon junction plus a fixed offset, and the offset is computed
to make the branch drop correct at `fullDriveAmps`. A real junction's drop is
current-dependent, so below that point the branch drops less than the stated value.
Measured, for 1.5 V stated with full drive at 2 mA:

| I_LED | branch drop | error against the stated 1.5 V |
|---|---|---|
| 1.5 mA | 1.4855 V | −0.97 % |
| 0.5 mA | 1.4307 V | −4.62 % |
| 0.1 mA | 1.3511 V | −9.93 % |
| 0.05 mA | 1.3169 V | −12.21 % |

This matters for the measurement plan below, whose sampling is deliberately densest
between 0.05 and 0.5 mA — precisely where the stand-in is furthest off. It is a
limitation of the stand-in, not of the measurements: real readings taken there are
exactly what replaces it.

## What to measure, when the time comes

The vactrols are hand-made, so there is no datasheet — and measurements of the
actual units are better provenance than a datasheet would be. A datasheet describes
a part built to someone else's tolerances; these measurements describe the part
going into the circuit.

**Rig.** Supply through a series resistor R_S to the LED anode, cathode to ground.
The voltage across R_S gives I_LED; the voltage across the LED gives V_F. Read
R_LDR on a meter's resistance range, which is adequate at these values.

**Forward voltage.** V_F at 0.5, 1.0, 1.5 and 2.0 mA. This alone settles the
headroom question above.

**Transfer curve.** R_LDR at 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1.0, 1.25, 1.5 and
2.0 mA. Denser at the low end deliberately: that is where log R moves fastest and
where the control law lives.

**Dark resistance.** With the LED off for ten minutes or more.

Three things that will corrupt the data if unguarded:

- **Sweep upward only.** These cells respond in milliseconds to increasing light and
  in seconds to minutes to decreasing light. A descending or jumbled sweep measures
  hysteresis rather than the curve.
- **A dark reading taken seconds after switch-off can be an order of magnitude low.**
  Wait.
- **Check the light sealing.** Measure dark resistance once in a lit room and once
  with the assembly covered. A difference means the measurement is of the room.

Record ambient temperature; these cells drift with it.

More than one unit would show whether the curve is a property of the build process
or of a single cell. For a one-off build the specific unit matters most, so this is
useful rather than essential.

**Release timing** — R_LDR decay after the LED switches off — would be needed before
any release claim. It requires a scope or a logged divider node. Until it exists,
nothing claims release behaviour.

## Replacing the assumption

Substitute the measured curve for the law in `lib/sim/models/vactrol.ts`, record its
provenance in the file header to the standard the other entries in
`lib/sim/models/` meet — what was measured, on what, under what conditions, and what
remains uncertain — and pass the measured forward voltage at the operating current
wherever a deck currently states an assumed one.

Only then revisit which claims become defensible. That decision is better made with
the numbers in hand than guessed at now, and it is a decision about the
specification's non-goals, not only about this file.
