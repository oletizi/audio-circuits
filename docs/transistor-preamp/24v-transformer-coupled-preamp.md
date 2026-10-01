# 24 V transformer-coupled microphone preamp: output-stage design proposal

**Status:** Draft for review
**Date:** 25 September 2026 (Pacific time)
**Related work:** [From one transistor to a feedback microphone preamp](microphone-preamp-feedback-lab.md) (the existing 9 V feedback lab). This is a separate 24 V instrument prototype, not a revision of the original breadboard lab.

## 1. Aim

Build a deliberately colored microphone preamp with substantial bass even when driven hard, smooth upper frequencies, and an output transformer that contributes useful level-dependent coloration. Begin by characterizing the EDCOR 600:600 and 10k:10k transformers already on hand. Design the output amplifier and its transformer as a unit after measuring their interaction.

This is a 24 V single-rail, discrete-transistor design inspired by the division of labor in transformer-coupled studio preamps. It does not purport to reproduce a Neve 1073 circuit or sound. The existing 9 V transistor feedback lab supplies useful experiments and measurement habits, but its component values and operating points do not transfer to 24 V.

### Desired behavior

- A strong 30–100 Hz fundamental at useful output levels, including when the low frequencies develop harmonics or compression. Controlled bass distortion is welcome; bass disappearing is not.
- Controllable coloration: raise internal drive, then reduce the level delivered to the recording interface without undoing the drive at the output transformer.
- Balanced microphone input and balanced, floating transformer secondary in the eventual full preamp. Bench work starts with a signal generator and output-stage test fixture.
- A separately adjustable high-frequency contour if the chosen transformer itself does not soften the top sufficiently.

The sound is a hypothesis to test, not a performance claim about a transformer before its exact part number and loading are known.

## 2. System architecture

The signal path is:

1. Balanced microphone input.
2. Input transformer.
3. Low-noise transistor gain block.
4. DRIVE control.
5. 24 V output driver.
6. DC-blocked output transformer.
7. Balanced output attenuator.
8. Recording interface or other line input.

The input transformer, microphone loading, shielding, switchable gain, and optional phantom power are later design decisions. The first build injects a known signal at the output driver's input. The driver has its own defined bias and does not depend on a particular upstream gain circuit.

**First output topology:** a capacitively coupled, single-ended Class A driver with a BD139 or similar suitably rated NPN as an experimental output device. A voltage-gain stage drives the BD139 emitter follower; the follower's emitter feeds a large series coupling capacitor, then the line transformer's primary. Its collector goes to +24 V, and an emitter bias/current-sink path establishes quiescent current. The line-transformer primary carries no intentional DC. Include a controlled discharge path and check start-up and power-down transients. A BD139 is chosen for comfortable current and thermal margin, not because a nominal 600 Ω line transformer calls for speaker-amplifier power.

The driver's actual circuit, resistor values, quiescent current, compensation, and cooling follow measurements and simulation. A simple emitter resistor may be adequate for the first fixture; a current sink or another topology is an option if positive/negative swing, dissipation, or bass drive prove inadequate. Provide test points at the follower emitter, both sides of the coupling capacitor, the primary, and the loaded secondary. Check the signal at all these points to distinguish amplifier clipping from transformer behavior.

**Drive control:** variable signal level ahead of the driver. **Output control:** a switched, balanced attenuator after the transformer secondary, or an equivalent balanced pad with defined termination. Do not put an arbitrary single potentiometer across one leg of a floating balanced output; it changes loading and balance. Record the actual load presented to the secondary in every measurement. A load choice can itself be an experiment, but the control should not accidentally change it when comparing drive settings.

### Why current and voltage both matter

For a 600 Ω resistive equivalent, 3 V peak would require 5 mA peak. A real transformer's input current also includes magnetizing current, particularly at low frequency, and its effective impedance depends on secondary termination.

A 20 mA quiescent setting is therefore only an initial test condition. The earlier 20 mA × 600 Ω = 12 V illustration is not a guaranteed Class A swing: the emitter's bias path, transistor headroom, rail, transformer magnetizing current, and signal polarity all set the actual limit. Measure the limit under the chosen load at 20, 40, and 100 Hz.

At roughly 12 V across the device, a 20 mA idle current implies about 0.24 W dissipation, before checking worst-case device voltage/current and thermal conditions. ST specifies 1.25 W at 25 °C ambient for its BD139 without a case-temperature condition; verify the chosen vendor's package and derating. (ST BD139 family datasheet.)

The capacitor and transformer's magnetizing inductance both affect bass. For illustration, 470 µF with a pure 600 Ω resistance alone has a nominal RC corner near 0.56 Hz, but this calculation says nothing about the transformer's low-frequency inductance or the driver's effective impedance. Choose the capacitor's voltage rating and polarity from measured DC conditions; verify the full circuit at 20–40 Hz rather than trusting this isolated estimate.

## 3. Transformer candidates and constraints

| Candidate | First use | What to learn |
|---|---|---|
| Owned EDCOR 600:600 | First line-output fixture, DC blocked, known secondary loads | Whether the driver delivers enough LF voltage/current, and where fundamental loss or harmonics first appear. |
| Owned EDCOR 10k:10k | Same fixture, with bias/drive and load revisited | Whether its lighter nominal load, different magnetizing behavior, and winding design produce preferable bass and top end. |
| Optional EDCOR 10k:600 | Later step-down comparison, after baseline | Roughly 4.08:1 nominal turns ratio; secondary voltage is about 12.2 dB lower at equal primary voltage in an ideal unloaded model. The secondary load reflects to the primary as n² × Rload; it is not always 10 kΩ. |

Record the exact series and part numbers printed on the two owned units before applying series specifications. EDCOR publishes an XSM series with a 10 Vrms maximum input, 20 Hz–20 kHz response specified within 1 dBu, and 1 kHz THD+N under specified conditions; its WSM series has different core dimensions and a 0.5 W rating.

These figures do not establish the distortion knee at 20 or 40 Hz for the particular transformers on hand. The nominal impedance numbers label an intended source/load application and winding ratio; neither number is the primary's DC resistance or a constant AC impedance. (EDCOR XSM; EDCOR WSM.)

**Separate topology study:** a transformer used directly in a transistor collector must tolerate its DC current. Do not put either owned line transformer directly in the collector circuit without a verified DC rating.

The EDCOR XSE10-10K previously suggested for this experiment is gapped and lists 90 mA maximum DC, but its published output is 6 Ω and frequency range 70 Hz–18 kHz. It is a speaker output transformer, not an immediate candidate for a bass-heavy balanced line output. A DC-coupled stage would need an appropriately specified transformer and a new driver/load design. (EDCOR XSE10-10K.)

## 4. Build sequence

### Phase A — identify and measure the iron independently

1. Photograph labels, measure DC winding resistance, confirm winding isolation and polarity, and record dimensions. Identify exact series from manufacturer data if possible.
2. Drive each primary from a known, low-impedance, AC-coupled source within the source's limits. Test with a high-impedance secondary load and an explicit load appropriate to that transformer (initially 600 Ω or 10 kΩ respectively). State which is connected in each plot. Avoid sending DC through an ungapped winding.
3. Record primary voltage at the winding, secondary voltage, and their fundamental components at 20, 30, 40, 50, 80, 100, 1k, and 10k Hz as levels rise. Check for generator/interface clipping. Sweep no farther than the driver's safe output or the transformer's documented rating without a deliberate, monitored overload test.

### Phase B — output-driver fixture

1. Build the driver with a current-limited 24 V supply, a dummy load first, then the DC-blocked 600:600 primary. Verify the DC operating point and actual primary DC current (target approximately zero at steady state) before raising signal level.
2. Start with a modest Class A bias, provisionally in the 15–30 mA range, then inspect positive and negative swing, dissipation, and heat. This range is an experimental starting point, not a finished specification. Scope the stage for ultrasonic oscillation and watch what happens during turn-on/off.
3. Repeat with the 10k:10k unit; revise driver bias and termination intentionally rather than assuming an interchangeable load. Compare at the same primary voltage, the same secondary output level, and the same listening level as three separate questions.
4. Add a fixed balanced output pad for level-matched listening; only then design a variable output control with a documented load and attenuation range.

### Phase C — microphone preamp integration

Choose an input transformer whose microphone source loading, ratio, shielding, and noise are appropriate. Design a gain block that can drive the output fixture over its useful range without forcing the gain stages into unwanted clipping.

Provide switchable or adjustable gain, DC operating points, overload indicators or measurement pads, and optional adjustable HF shaping. Decide explicitly whether the transistor stages, transformer, or both are intended to saturate at a given DRIVE setting.

Design phantom power as a separately protected, tested input subsystem if required; never apply phantom power to the initial generator/breadboard fixture.

## 5. Measurements and decision rule

For each part/load/bias combination, save the actual primary and secondary load conditions, frequency, primary voltage/current if available, secondary voltage, fundamental amplitude, spectrum or THD if the instrument resolves it, rail current, and driver temperature.

Capture 20/40/80 Hz level sweeps plus a 1 kHz reference. A scope waveform alone cannot separate bass harmonic generation from a falling fundamental; use FFT or an analyzer where possible. Record whole-system audio and level-match before listening. Test with both bass-rich instruments/voices and controlled tones.

The preferred operating range is one where low-frequency harmonics and/or compression become musically useful while the 30–80 Hz fundamental remains strong relative to the midband reference and the output driver has not already clipped.

Set a quantitative threshold after obtaining clean baseline curves; an initial comparison marker is the point where the bass fundamental departs by 1 dB from its own low-level trend at fixed frequency. That marker is diagnostic, not an automatic pass/fail rule. Evaluate the 20 Hz result separately from the desired musical range.

If the output transformer never colors usefully under the 24 V fixture, retain it for balanced output and obtain coloration in a deliberately designed upstream stage instead of overdriving the electronics blindly.

## 6. Open design decisions

- Exact owned transformer part numbers and their published curves, if any.
- Target source microphone(s), minimum noise performance, gain range, maximum output level, and whether 48 V phantom power is required.
- Expected receiving input impedance(s), cable length, and the attenuation range needed after the transformer.
- Which output-driver topology offers enough clean electrical swing to reveal magnetic coloration at the desired levels without excessive dissipation.
- Whether bass-rich distortion is better obtained in the output transformer, the transistor gain block, or their combination, as determined by isolated measurements and matched-level listening.

## Sources

The source links were lost when this proposal was pasted in; the URLs below still need restoring.

- EDCOR XSM line-transformer specifications (URL missing)
- EDCOR WSM line-transformer specifications (URL missing)
- EDCOR XSE10-10K single-ended transformer specifications (URL missing)
- ST BD139/BD140 datasheet (URL missing)
