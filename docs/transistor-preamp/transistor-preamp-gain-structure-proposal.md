# Independently controlled transistor preamp with transformer output

Status: Draft for review — architecture proposed; component values and modified circuit not yet validated.

Date: 26 September 2026 (Pacific time)

## Purpose

Extend the working 24 V transistor preamp into an experimental amplifier with independent control over first-stage drive, second-stage drive, transformer drive, and final output level. Preserve strong bass while exploring transistor distortion and any useful coloration from the output transformer.

The preferred architecture uses independently biased, AC-coupled gain stages. This supports deliberate gain staging and bench experimentation. It is inspired by the separation of amplifier functions in studio preamps, without attempting to reproduce a Neve 1073.

## Existing hardware and evidence

The reference implementation is `buffered-board.ts` on the `feature/transistor-preamp` branch of audio-circuits. Q1 is a collector-feedback common-emitter gain stage. Q2 is a separately biased 2N3904 emitter follower, with a 100k/100k base divider, a 1.5k emitter resistor, and a 10 µF output coupling capacitor, C5. The operator has built this circuit on stripboard and tested it up to 24 V. Existing repository simulation tests use 9 V; they do not validate the proposed extension at 24 V.

The bench setup adds an input attenuator and an EDCOR WSM10K/10K after C5. A 50k output attenuator follows the transformer and feeds an audio interface. The blue scope probe measures the full transformer secondary before the output pot. The setup is presently measured unbalanced. The pot and interface together load the transformer; this load depends on the interface impedance and pot position.

At 20 Hz, the scope showed 1.8300 V AC RMS at Q2's emitter and 1.7994 V RMS at the transformer secondary: a voltage ratio of 98.3%, approximately −0.15 dB. The waveforms showed no obvious gross clipping at that setting. This is a single operating-point observation, not a distortion specification or proof of flat overall frequency response.

With higher input drive, Q1's collector showed clear upper-peak clipping. Q2 reproduced that clipping, with possible additional limiting at the negative trough. The transformer secondary showed droop across the flattened plateau. The image alone does not establish magnetic saturation; coupling, frequency response, loading, and driver behavior remain possible contributors. RMS readings of these distorted signals do not isolate the bass fundamental.

These observations support continued use of the existing 2N3904 buffer for initial tests. They do not yet establish the maximum clean transformer drive available.

## Proposed signal path and controls

Input attenuator → existing Q1 gain stage → interstage attenuator → new voltage-gain stage → transformer-drive attenuator → existing Q2 output buffer → C5 → transformer → existing output attenuator → interface.

Retain Q1 and Q2's current designators; designate the new gain transistor Q3 unless repository conventions require otherwise. Functional names should be used alongside designators so physical signal order remains clear.

| Control | Location | Purpose |
|---|---|---|
| Input drive | Before Q1 | Set Q1's input level and distortion |
| Interstage level | After Q1, before Q3 | Reduce Q1's distorted output before Q3, or increase Q3 drive |
| Transformer drive | After Q3, before Q2 | Set excitation of the buffer and transformer |
| Output level | After transformer | Set interface level without directly attenuating the signal ahead of the transformer |

These are signal attenuators, not changes to the stages' intrinsic gain. Emitter degeneration or bypass controls can separately vary gain and linearity. Bias and collector-load trims remain setup adjustments because they can also change operating point and headroom.

The controls provide useful choices, not perfect independence. A later stage cannot undo upstream distortion, and available gain and headroom constrain every combination. The output pot can change reflected loading, so its setting must be recorded during electrical comparisons.

## Coupling and bias

Each voltage-gain stage and the output buffer has its own DC bias network. For each interstage attenuator, use a coupling capacitor from the preceding stage to the pot's top terminal, connect the bottom terminal to signal ground, and connect the wiper through another coupling capacitor to the following transistor's biased base.

The capacitor before the pot keeps collector DC off the control; the capacitor after the wiper prevents the pot from changing the next stage's bias. Choose capacitance, voltage rating, and polarity from the actual node voltages and impedances. Do not simply assign every capacitor 10 µF. Multiple coupling networks can accumulate bass loss and phase shift.

Pot values are design decisions still to be calculated. A high-value pot can present substantial source resistance at intermediate settings and weaken drive into a transistor base. A low-value pot can excessively load the preceding collector. Select each pot with both neighboring stages, then verify its full travel.

## Output stage and transformer

Keep the transformer after C5, with no intentional steady DC through its primary. For the WSM10K/10K, primary pins 1 and 4 are the full winding; secondary pins 5 and 8 are the full winding. Leave center taps 2 and 6 disconnected for these tests. C5's positive terminal faces Q2's emitter.

Retain the 2N3904 initially. Additional voltage gain can produce a larger signal from a clean Q1 output, but it cannot increase Q2's current capacity or supply-limited swing. Characterize Q2 before specifying a replacement.

If Q2 limits the desired output, redesign its operating point and drive together. Review emitter current, sink path, base drive, transistor dissipation, C5, and transformer loading. A BD139 or similar device may provide useful thermal/current margin, but substituting it alone does not solve the problem. Stiffening Q2's bias divider also increases the load on the preceding stage and must be evaluated with it.

The transformer-drive knob controls excitation of both Q2 and the transformer. It cannot guarantee that the transformer saturates before the electronics clip. The proposed amplifier remains useful even if the transformer primarily provides isolation and the desired distortion comes from the transistor stages.

## Why AC coupling

The supplied Neve schematic has two directly coupled common-emitter stages followed by a directly coupled emitter follower, with feedback around the block. Its DC operating points and feedback are designed together. That approach reduces interstage coupling networks and supports integrated bias and gain control.

Here, independent stage adjustment and accessible drive controls take priority. AC coupling gives each block its own operating point and provides practical attenuator insertion points. DC coupling is not inherently necessary for strong bass, and an arbitrary pot inside a direct-coupled block would disturb bias and feedback. A complete direct-coupled amplifier can remain a later comparison experiment.

## Development and verification

1. Record the existing 24 V baseline: actual supply, both transistors' base/emitter/collector DC voltages with no signal, trim settings, input level, pot settings, and interface model/input mode. Confirm the as-built capacitor values and ratings.
2. Compare low-level gain at 20, 40, 80, 100 Hz and 1 kHz with generator amplitude and controls fixed. Measure Q1 collector, Q2 emitter, primary, and secondary as needed. Distinguish the complete preamp response from the emitter-to-secondary transfer.
3. Characterize Q2 separately, temporarily disconnecting Q1's signal feed and injecting a known AC-coupled signal into the existing biased buffer input. Find its clean swing with the transformer and interface load attached. This separates output-drive limits from Q1 clipping.
4. Design Q3 and both new interstage controls. Calculate bias, loading, gain range, and coupling behavior at 24 V; simulate operating points and signal response before generating a revised schematic and stripboard extension. Do not assume Q1's values can simply be duplicated.
5. Build the extension and inspect each stage as drive rises. Identify where distortion first appears. Check for unwanted high-frequency oscillation over control travel and intended loads.
6. Make level-matched recordings of clean operation, Q1 distortion, Q3 distortion, and higher transformer drive. Record the primary signal as well as the secondary when assessing transformer coloration. Use spectra where available to separate new harmonics from loss of bass fundamental.

Use normal scope ground clips only on intended ground/reference nodes; scope channel grounds are shared. Do not clip a ground lead to a biased transistor node. Record when a secondary probe grounds one end of an otherwise floating output.

## Decisions still required

- Q3 topology, gain, operating point, and component values.
- Interstage pot resistances/tapers and coupling capacitor values.
- Target clean output and acceptable bass loss/distortion under a defined load.
- Whether Q2 needs redesign after isolated testing.
- Whether to retain the unbalanced output attenuator for the prototype or design a balanced attenuator for the finished unit.
- Input transformer selection and microphone noise/gain requirements; these are outside the immediate gain-structure extension.

Proceed with the independently controlled AC-coupled architecture. Use the working board as the baseline and let measured output headroom determine whether a stronger transformer driver is necessary.

## References and scope of evidence

- Repository: https://github.com/oletizi/audio-circuits/tree/feature/transistor-preamp/circuits/transistor-preamp
- Buffered-stage design: https://github.com/oletizi/audio-circuits/blob/feature/transistor-preamp/docs/superpowers/specs/2026-09-24-transistor-preamp-buffered-design.md
- Existing transformer proposal: https://github.com/oletizi/audio-circuits/blob/feature/transistor-preamp/docs/transistor-preamp/24v-transformer-coupled-preamp.md
- Operator-supplied schematics, transformer label photographs, and 26 September 2026 scope captures in this discussion.

This proposal records the new gain-structure direction and current bench evidence. It does not claim that the extension has been built, simulated, or tested, and it does not overwrite the earlier output-driver proposal.
