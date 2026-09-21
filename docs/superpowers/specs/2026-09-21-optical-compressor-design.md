---
title: +9 V LA-2A-inspired optical compressor module
date: 2026-09-21
status: Draft for review (revision 2)
supersedes: revision 1 draft
---

# +9 V LA-2A-inspired optical compressor module

## 0. Revision note

**Revision 3**, following third-party review of revision 2.

Revision 1 proposed a sound architecture. Revision 2 corrected two numeric errors
and added quantitative constraints, but introduced a significant analytical
mistake of its own: it conflated *detector headroom* with *usable control range*,
and on the strength of that conflation deferred the emitter degeneration that the
driver actually requires to function as a compressor at all. Review caught this.

Revision 3 makes three circuit changes and withdraws one unsupported claim:

* **§8.7 adds a 1 kΩ emitter resistor** and drops R_LED to 3.3 kΩ. Without it the
  control range is ~1 dB and the law is effectively a switch (§6.1.2).
* **§10.1 splits the potentiometer failure requirements.** Revision 2's
  wiper-to-end rule is correct for GAIN and would have shorted out PEAK
  REDUCTION's divider.
* **§8.6 drops C_DET to 4.7 µF**, because degeneration raised the discharge
  impedance ~5×.
* **§8.6.2 withdraws the precision-rectifier "population option."** It was never
  achievable as a population change on a single supply.

Changes from revision 1 are in Appendix A; changes from revision 2, with the
review findings that prompted them, are in Appendix B.

## 1. Summary

Add a solid-state optical compressor to audio-circuits built around a generic
LED/LDR vactrol. The design borrows the operating model and control philosophy of
an LA-2A without attempting to reproduce its tube amplifier, transformers,
electroluminescent panel, T4 cell, or exact transfer curve.

The module is designed for a conventional guitar-pedal supply: one nominal +9 V
input and ground. A buffered half-supply reference (VBIAS) provides the DC
operating point for the audio and sidechain op-amp stages.

The first version should be deliberately simple:

* a passive optical attenuator in the audio path;
* a feedback sidechain derived from the compressor output;
* a half-wave level detector and transistor LED driver;
* no ratio, threshold, attack, or release controls;
* PEAK REDUCTION and GAIN as the only user controls; and
* an electrical release network sized from the driver's actual loading, with the
  vactrol contributing the program-dependent part of the recovery.

This is an experimental module, not a claim of LA-2A equivalence. Its purpose is
to make the useful architecture explicit, buildable, and measurable while
preserving the program-dependent behavior of the selected vactrol.

## 2. Context

audio-circuits is a modular tscircuit library. The repository currently uses:

* TypeScript/TSX circuit components;
* explicit schX/schY schematic coordinates through `createGrid()`;
* left-to-right signal flow and top-to-bottom voltage flow;
* component names prefixed by a required module name;
* named nets for readable schematics;
* explicit file imports rather than directory imports or path aliases;
* screw terminals at module boundaries;
* one standalone `.circuit.tsx` fixture per module; and
* a 300–500 line ceiling on source files.

The existing `OpampBuffer` uses a bipolar supply and a generic TL072. This module
cannot reuse that power contract unchanged. It introduces the single-supply
conventions needed by pedal circuits: `+9V_RAW`, `+9V_PROTECTED`, `VBIAS`, and
`GND`. It also requires a TL072H rather than silently assuming that every legacy
TL072 variant is characterized at 9 V.

## 3. Goals

1. Produce a usable, breadboard-correlated optical compressor circuit.
2. Preserve the two-control, program-dependent character of a simple optical
   feedback compressor.
3. Represent the vactrol as a reusable four-terminal library component without
   pretending that tscircuit can simulate its optical transfer function.
4. Keep the first abstraction boundary small: one library part and one complete
   compressor module.
5. Expose enough test points and configuration options to characterize the
   sidechain and substitute different vactrols.
6. Make the module independently renderable, type-checkable, and exportable.
7. State the design's numeric constraints — detector window, vactrol selection
   criteria, release behavior — as acceptance windows that bench measurement must
   land inside, rather than as values discovered after the fact.

## 4. Non-goals

* Reproducing the LA-2A schematic, tube stages, transformers, T4 cell, frequency
  response, noise floor, distortion spectrum, or calibrated gain-reduction law.
* Providing a mathematically precise threshold or compression ratio.
* Adding attack, release, ratio, knee, sidechain-filter, stereo-link, or limiter
  controls in v1.
* Supporting bipolar operation or multiple supply variants in the same component.
* Treating an LED/LDR vactrol as interchangeable with an original T4 module.
* Creating a production PCB before the selected optical element is measured.
* Extracting generic `OpticalAttenuator` and `OpticalSidechain` *modules* before
  their interfaces have been validated in the complete circuit. Note that this
  constrains the public module surface, not the internal file organization; see
  §11.1.
* Guaranteeing full performance from a depleting 9 V battery; see §6.3.

## 5. Operating principle

The audio path uses a fixed series resistor and the vactrol LDR as a shunt
attenuator:

```
buffered input -- R_SHUNT --+-- makeup amplifier -- output
                            |
                           LDR
                            |
                          VBIAS
```

Its instantaneous gain is approximately:

```
Vout / Vin = R_LDR / (R_SHUNT + R_LDR)
```

With the LED dark, R_LDR should be much larger than R_SHUNT, so insertion loss is
small. As LED current rises, R_LDR falls and the signal is attenuated.

The sidechain is fed from the module output. A louder output drives the vactrol
LED harder; the resulting attenuation then lowers the level seen by the
sidechain. This negative-feedback loop lets the detector, optical element, and
audio path establish the compression curve together.

```
              +---------------------------------------------+
              |                                             |
IN -> buffer -> optical attenuator -> makeup gain -> OUT ----+
                 ^                                   |
                 |                                   v
                 +-- vactrol LED <- driver <- detector
```

This feedback topology is central to the proposal. A feed-forward option may be
evaluated later, but it should not complicate the first module.

### 5.1 Stability: the failure mode is in the envelope domain

The dominant expected instability is in the **envelope domain** — a low-frequency
breathing or pumping in which gain reduction and recovery chase each other. It
appears when loop gain is high and release is substantially faster than attack.

Audio-rate oscillation is not expected, because a photoconductive cell's response
rolls off in the tens of hertz and the loop therefore has negligible gain at audio
frequencies. That is a reason to look for envelope instability first, not a proof
that audio-rate oscillation is impossible.

This distinction matters for acceptance testing: "no oscillation" must be
verified by watching the gain-reduction envelope on sustained program material,
not by checking that the audio output is free of tones. §13 states the criterion
in those terms.

## 6. Numeric constraints

These constraints were deferred in revision 1. They are derivable now, and
stating them up front converts several "measure it later" items into pass/fail
windows.

### 6.1 Sidechain thresholds and control range

Revision 2 conflated two different quantities under the name "window." This
section separates them, because the distinction is what drove the driver change
in §8.7.

There are **three** thresholds on the sidechain amplifier's output, not two:

| # | Threshold | Set by | Estimable in advance? |
|---|---|---|---|
| 1 | Detector conduction — first gain reduction | Rectifier + V_BE drops | Yes |
| 2 | **Maximum useful LED current — full gain reduction** | Driver transfer function | Yes, once the driver is defined |
| 3 | Sidechain clipping | Op-amp output swing | Estimate only; measure |

**The musically relevant control range is 1 → 2, not 1 → 3.** Revision 2 computed
1 → 3, called it the control range, and built three conclusions on top of it. All
three were wrong.

#### 6.1.1 Threshold 1: detector conduction

Two series junction drops stand between the sidechain output and any LED current:

| Element | Drop |
|---|---|
| 1N4148 rectifier forward voltage | ~0.60 V |
| 2N3904 base-emitter forward voltage | ~0.65 V |
| **Total before any gain reduction** | **~1.25 V** |

**The rectifier diode drop is the threshold.** The design has no threshold
control, but it has a threshold, and this is it. It is temperature dependent
(roughly −2 mV/°C per junction) and part dependent.

#### 6.1.2 Threshold 2: full drive — and why revision 2's driver failed here

Threshold 2 is set entirely by the driver's transfer function, and revision 2's
driver placed it almost on top of threshold 1.

With a bare common-emitter stage (no emitter resistor) and R_B = 10 kΩ, the base
current needed for full LED current is I_C/β, so:

| β | I_B at 1.5 mA | Drop across R_B | Threshold 2 | Control range (1→2) |
|---|---|---|---|---|
| 100 | 15 µA | 0.15 V | 1.40 V | **~1.0 dB** |
| 300 | 5 µA | 0.05 V | 1.30 V | **~0.3 dB** |

The entire LED sweep from dark to full drive occupies 0.05–0.15 V of detector
voltage. That is not a compressor control law; it is approximately a switch, and
in a feedback loop it produces near-limiting behavior with an extremely sharp
knee. It is also 3× β-dependent, which §6.4 previously recorded as a separate
problem — it is the same problem.

**§8.7 therefore adds a 1 kΩ emitter resistor.** With degeneration,
I_E ≈ (V_DET − V_BE)/R_E, so the span is set by a resistor rather than by β:

| Configuration | Threshold 1 | Threshold 2 | Control range | β spread |
|---|---|---|---|---|
| No R_E (revision 2) | 1.25 V | ~1.40 V | ~1.0 dB | ~3× |
| **R_E = 1 kΩ (revision 3)** | **1.25 V** | **~2.75 V** | **~6.8 dB** | **~7%** |

Degeneration does not *cost* control range here — it *creates* it. Revision 2
framed it as a headroom expense to be deferred; that was backwards.

#### 6.1.3 Threshold 3: sidechain clipping

At a nominal 9.0 V input the rail is about 8.7 V after the Schottky drop and
VBIAS is about 4.35 V. The TL07xH family has a rail-to-rail output stage, so the
sidechain amplifier should swing to within roughly 100–150 mV of each rail —
about **±4.15 V peak** around VBIAS.

**This is an estimate, not a specification.** TI characterizes rail headroom at a
40 V supply with a 10 kΩ load; that figure does not transfer to an 8.7 V rail.
§12.2 item 15 measures it, and §18 flags it as a load-bearing assumption. The
rail-to-rail output stage remains an independent reason to specify the H suffix
beyond the supply-range reason in §8.1.

With R_E = 1 kΩ, threshold 3 sits about 20·log10(4.15/2.75) ≈ 3.6 dB above
threshold 2. That margin is the design's tolerance for op-amp swing coming in
below estimate, for V_BE and diode drops varying with temperature, and for
supply sag (§6.3). It is not usable control range.

Referred back through the 11x sidechain gain, thresholds 1 and 2 correspond to
114 mV and 250 mV peak at the makeup output.

### 6.2 Vactrol selection criteria

With R_SHUNT = 22 kΩ, the shunt-attenuator equation yields explicit selection
windows. A candidate part is suitable when it satisfies both:

**Dark resistance** (sets insertion loss when idle):

| R_LDR dark | Insertion loss | Verdict |
|---|---|---|
| 10 MΩ | −0.02 dB | excellent |
| 1 MΩ | −0.19 dB | acceptable |
| 500 kΩ | −0.37 dB | marginal |
| 100 kΩ | −1.73 dB | unacceptable |

→ **Require dark resistance ≥ 1 MΩ.**

**Illuminated resistance** (sets achievable gain reduction):

| Target GR | Required R_LDR |
|---|---|
| 10 dB | ≤ 10.2 kΩ |
| 15 dB | ≤ 4.76 kΩ |
| 20 dB | ≤ 2.44 kΩ |

→ **Require R_LDR ≤ 10.2 kΩ at or below the chosen maximum LED current** to meet
the §13 acceptance target.

These two numbers are the part-selection specification. A datasheet can be
screened against them before anything is ordered.

### 6.3 Supply voltage

At a depleted 9 V battery (7.5 V terminal, 7.18 V after the diode, VBIAS 3.59 V,
estimated swing ±3.44 V) threshold 3 falls to about 1.9 dB above threshold 2,
down from 3.6 dB.

Note what this does and does not change. Thresholds 1 and 2 are set by junction
drops and R_E, not by the rail, so the **control range itself is unaffected** at
~6.8 dB. What shrinks is the margin protecting it. Once the supply sags far
enough that threshold 3 crosses threshold 2, the sidechain clips before full
drive and the top of the compression range is lost abruptly rather than
gradually. That is the failure mode to watch for, and it arrives sooner than the
audio path's own headroom limit.

**Specify a regulated 9 V adapter as the reference supply** and validate against
it. Battery operation is not prohibited, but it is not a v1 validation target and
the compressor's behavior is expected to change measurably as the battery
depletes. Revision 1 deferred the minimum supply voltage; this revision sets the
validation floor at 9.0 V nominal and records battery behavior as a measurement
(§12.2 item 13), not a guarantee.

### 6.4 LED drive predictability

Without degeneration the 2N3904 operates in its active region across the whole
control range, where I_C = β · I_B. With β spanning roughly 100–300 across parts
and current, **LED current at a given detector voltage would vary by up to 3×
between transistors**, and the collector resistor would cap only the saturated
maximum.

Revision 2 accepted this and deferred the mitigation. Revision 3 does not,
because §6.1.2 showed it is not a separate problem: the same β multiplication
that makes the current unpredictable also compresses the control law into
~0.15 V. One resistor fixes both.

With R_E = 1 kΩ, the base current error term is I_B · R_B, so the threshold-2
voltage becomes:

| β | I_B | I_B · R_B | Threshold 2 (V_DET) |
|---|---|---|---|
| 100 | 15 µA | 0.15 V | 2.30 V |
| 300 | 5 µA | 0.05 V | 2.20 V |

A 0.10 V spread on a 1.5 V span is about **7%**, down from 3×. A controlled-current
driver could reduce it further, but it is no longer the pressing problem revision 2
took it for, and it remains deferred on those grounds rather than on headroom
grounds.

## 7. User controls

### 7.1 PEAK REDUCTION

PEAK REDUCTION is a 100 kΩ panel-mounted potentiometer in the sidechain feed. It
controls how much output signal reaches the detector. At minimum, the wiper must
reduce detector drive to approximately zero. Increasing the control causes a given
output level to produce more LED current and therefore more gain reduction.

The first prototype may use a linear pot while the useful control law is being
measured. Pot taper is a user-interface decision and should not be frozen before
that measurement. Note that §6.2 predicts the useful range will be concentrated
at low LED currents, which is a taper argument — see §8.7.

### 7.2 GAIN

GAIN controls the non-inverting makeup amplifier after the optical attenuator. The
initial target is approximately unity through 11x voltage gain:

```
gain = 1 + R_FEEDBACK / R_GROUND
```

With R_GROUND = 10 kΩ and a 100 kΩ feedback control, the nominal range is
1x–11x. A small fixed resistor may be placed in series with the pot if testing
shows that a lower maximum or a protected minimum feedback resistance is
desirable.

Because the sidechain is taken after makeup gain, the two controls interact. That
interaction is expected in a feedback compressor and should be documented, not
designed away accidentally.

## 8. Proposed circuit

### 8.1 Power and bias reference

The module uses a conventional pedal supply:

* `+9V_RAW`: nominal external +9 V input;
* `+9V_PROTECTED`: supply after series reverse-polarity protection;
* `GND`: external power and audio ground; and
* `VBIAS`: buffered half-supply reference, nominally about 4.35 V after the
  Schottky drop.

Use a series 1N5817 Schottky diode between `+9V_RAW` and `+9V_PROTECTED`, followed
by 47 µF bulk capacitance and 100 nF high-frequency bypassing to ground. This
protection costs roughly 0.2–0.4 V of headroom, which is already accounted for in
§6.1 and must be included in clipping tests.

Generate VBIAS with two 47 kΩ resistors from `+9V_PROTECTED` to ground. Bypass the
divider midpoint with 47 µF in parallel with 100 nF, then buffer it with one
op-amp section. The unbuffered divider node is `VBIAS_RAW`; only the buffer output
is `VBIAS`. Audio bias returns, the LDR shunt, and op-amp gain-setting resistors
connect to `VBIAS`, never to `VBIAS_RAW`.

The divider's source impedance is 23.5 kΩ, so with 47 µF the reference corner is
0.14 Hz and the **power-up ramp is about 2.5 s to 90%**. See §8.9 for the
consequences.

Each op-amp package receives local 100 nF ceramic decoupling directly between
`+9V_PROTECTED` and ground. Place the 47 µF supply reservoir near the power entry.

**Op-amp section assignment.** Use two TL072H packages, allocated deliberately —
revision 1 left this unassigned:

| Package | Section A | Section B |
|---|---|---|
| U1 (audio) | input buffer | makeup amplifier |
| U2 (control) | sidechain amplifier | VBIAS buffer |

Keeping the sidechain amplifier out of the audio package separates a
transient-rich, rectifier-loaded stage from the two clean audio stages. All four
sections are used, so none is left floating.

The TL072H is specified for a 4.5–40 V total supply, has a rail-to-rail output
stage (§6.1), and preserves the familiar high-impedance JFET input behavior at a
9 V pedal supply. Do not substitute the repository's current generic TL072
supplier part without verifying the exact suffix and its recommended operating
range.

### 8.2 Input buffer

The input stage is a unity-gain, non-inverting TL072H buffer:

* 100 nF input coupling capacitor;
* 1 MΩ input-bias resistor to VBIAS after the capacitor;
* nominal input impedance of 1 MΩ; and
* no intentional voltage gain.

100 nF into 1 MΩ gives a −3 dB corner of **1.6 Hz**, so bass loss at the input is
not a concern with this bias resistor. The value would only need to increase if a
much lower bias resistance were adopted or if the driving source impedance turned
out to be high enough to matter.

### 8.3 Optical attenuator

The buffered signal passes through R_SHUNT, initially 22 kΩ, to the gain-reduction
node. The vactrol LDR connects from that node to VBIAS. For AC, the low-impedance
buffered and bypassed VBIAS node acts as the attenuator's signal ground while
preserving the approximately half-supply DC operating point.

The gain-reduction node is DC-biased at VBIAS through R_SHUNT, so it has a defined
operating point regardless of how high the LDR's dark resistance goes.

R_SHUNT = 22 kΩ is provisional, but §6.2 now expresses the selection criteria as a
function of it, so changing R_SHUNT means recomputing that table. Provide
footprints or population options for 10 kΩ, 22 kΩ, and 47 kΩ during prototype
layout.

Do not add a coupling capacitor between the attenuator and makeup amplifier; both
stages share the same VBIAS DC operating point.

### 8.4 Makeup amplifier

The attenuated node feeds a non-inverting TL072H stage:

* non-inverting input connected directly to the gain-reduction node;
* 10 kΩ from the inverting input to VBIAS;
* panel-mounted GAIN pot in the feedback path; and
* **2.2 µF** output coupling capacitor followed by a 100 kΩ output pulldown. If a
  polarized part is used, its **positive terminal faces the op-amp output**,
  which sits at VBIAS against a pulldown to ground.

The coupling capacitor is raised from revision 1's 1 µF. Into the specified
minimum 10 kΩ external load in parallel with the 100 kΩ pulldown (9.1 kΩ), 1 µF
gives a 17.5 Hz corner — audible bass loss into a real load. 2.2 µF gives 8.0 Hz.

The output is specified for loads of 10 kΩ or greater. If the module is expected
to drive long cables or lower impedances, that requirement belongs in an
output-stage module rather than being hidden in this compressor.

### 8.5 Feedback sidechain amplifier

Take the sidechain signal from the makeup-amplifier output before the final output
coupling capacitor. Connect the bottom of PEAK REDUCTION to VBIAS, so its wiper
varies only the AC component around the shared bias point. Route the wiper into a
non-inverting TL072H amplifier with an initial gain of 11x:

* R_BIAS = 10 kΩ from the inverting input to VBIAS;
* R_FEEDBACK = 100 kΩ; and
* nominal voltage gain 1 + 100k / 10k = 11.

This gain makes a simple silicon-diode detector practical without requiring a
precision rectifier. Per §6.1, it places compression onset at 114 mV peak and
full gain reduction at 250 mV peak, both referred to the makeup output, with
sidechain clipping a further 3.6 dB above that.

Raising this gain does **not** widen the control window — it moves both ends of
the window down together and clips sooner. The window is set by the junction drops
against the available swing, not by the gain. Values should remain easy to change
on the prototype, but changes should be made with §6.1 in hand.

### 8.6 Detector and release network

AC-couple the VBIAS-centered sidechain-amplifier output through a 1 µF capacitor
into a ground-referenced 1N4148 half-wave rectifier. The coupling capacitor
prevents the approximately 4.35 V bias from holding the LED driver on
continuously. If a polarized capacitor is used, its positive terminal faces the
op-amp. The rectifier charges the detector node, which drives the LED transistor
through a 10 kΩ base resistor.

**The detector network is:**

* **4.7 µF detector capacitor (C_DET)**; and
* 100 kΩ release resistor (R_REL) in parallel with the capacitor.

Both parts must be independently bypassable or depopulatable.

#### 8.6.1 Release model

Revision 1 computed the release as C_DET × R_REL and got 100 ms. Revision 2
identified the missing base path but then treated the discharge current as
constant, which understated the time. Both were wrong; this is the corrected
model.

**The discharge is exponential, not linear.** With the emitter resistor from §8.7
in place, the detector node sees the base path as R_B + (β+1)·R_E — degeneration
multiplies R_E by the current gain as seen from the base — in parallel with R_REL.
At β = 100:

| Path | Impedance from detector node | Current at full drive (V_DET = 2.15 V) |
|---|---|---|
| Base | 10 kΩ + 101 kΩ = 111 kΩ | 13.5 µA |
| R_REL | 100 kΩ | 21.5 µA |
| **Total** | **52.6 kΩ (19.0 µS)** | **35 µA** |

**Degeneration restores R_REL to relevance.** In revision 2's undegenerated
circuit the base path dominated 6:1 and the release resistor governed nothing;
here it carries the larger share, which is a second reason to prefer the
degenerated driver.

The node decays toward an asymptote of ~0.31 V with τ = C_DET / 19.0 µS. Using
**LED current falling from 90% to 10%** as the release metric — a measurable
quantity, unlike "full release at exactly 0.65 V," since V_BE itself falls with
current — the span works out to 1.235 τ:

| C_DET | τ | Release (90%→10%) | 100 Hz ripple |
|---|---|---|---|
| 1 µF | 53 ms | ~65 ms | ~23% of span |
| 2.2 µF | 116 ms | ~145 ms | ~11% |
| **4.7 µF** | **247 ms** | **~305 ms** | **~5%** |
| 10 µF | 526 ms | ~650 ms | ~2.3% |

**These are estimates from a simplified model** that holds V_BE fixed at 0.65 V
and ignores the vactrol entirely. Real V_BE falls with current, and τ itself is
β-dependent (at β = 300 the base path rises to 311 kΩ, stretching the 4.7 µF
release to ~440 ms). Treat the table as a starting point and a sanity check on
measurements, not as a prediction.

**C_DET is 4.7 µF, down from revision 2's 10 µF.** The change follows from the
driver: degeneration raised the discharge impedance roughly 5×, so the same
ripple performance now needs less capacitance, and 10 µF would push the release
past 600 ms before the vactrol's own recovery is even added.

The ripple column uses the same constant-current approximation over the ~10 ms
between 100 Hz half-wave peaks and is likewise a rough estimate. What survives
from revision 2 is the qualitative conclusion: omitting C_DET entirely leaves the
node with no storage between peaks and is the wrong opening experiment. Start at
4.7 µF and sweep both directions (§12.2 item 9).

The release is not a single number in any case. The photocell adds its own
nonlinear, history-dependent recovery, and the cascaded response must be measured
as a system (§12.2 items 6 and 7).

#### 8.6.2 Precision rectifier: not a population option

Revision 2 claimed the simple detector could become a precision rectifier through
a population change, backed by two reserved footprints. **That claim does not
survive scrutiny and is withdrawn.**

Three problems, in increasing order of severity:

1. **Topology mismatch.** §8.5's sidechain amplifier is non-inverting. A precision
   half-wave rectifier is an inverting topology — the signal moves from the + pin
   to a resistor into the − pin. That is a different circuit, not a fitted part.
2. **Op-amp saturation.** Revision 2 never specified how the amplifier avoids
   driving into its rail on the half-cycle when the rectifier diode is reverse
   biased. The canonical answer is a second clamp diode closing the loop, which
   revision 2 did not account for.
3. **Single-supply level shifting.** This is the blocker. A precision rectifier
   referenced to VBIAS produces a VBIAS-referenced output, but the detector node
   is ground-referenced. AC-coupling between them would undo the rectification,
   and re-referencing the rectifier to ground costs the op-amp its negative swing.
   Resolving this needs a different sidechain architecture, not a different BOM.

**Consequence for v1:** the board carries labeled test pads at the sidechain
amplifier's inverting input and output so the topology can be probed and
experimented with on the bench. It does not claim a no-respin upgrade path. If
measurement shows the 1.25 V threshold is genuinely limiting, the fix is a
sidechain redesign proposed on its own merits with the level-shifting problem
solved first.

**§8.5 also stays non-inverting** as a result. Revision 3 briefly considered
flipping it to inverting so both configurations would share a topology, but with
the population option withdrawn the only remaining effect would be loading the
100 kΩ PEAK REDUCTION wiper with the inverting stage's input resistor — a
significant distortion of the control law for no benefit.

### 8.7 LED driver

Use a 2N3904 as a low-side LED driver, **with emitter degeneration**:

* **emitter to ground through R_E = 1 kΩ** (new in revision 3);
* base driven from the detector node through R_B = 10 kΩ;
* collector connected to the vactrol LED cathode through the §8.8 sense resistor;
* vactrol LED anode connected to `+9V_PROTECTED` through R_LED; and
* 100 kΩ from base to ground so the transistor turns fully off when undriven.

#### 8.7.1 Why the emitter resistor is not optional

Revision 2 specified a bare common-emitter stage and deferred degeneration as a
headroom expense. §6.1.2 shows why that was wrong: without R_E the entire LED
sweep occupies 0.05–0.15 V of detector voltage, giving a control range of roughly
0.3–1.0 dB depending on β. The circuit would behave as a near-switch.

R_E = 1 kΩ sets I_E ≈ (V_DET − V_BE) / R_E, so 1.5 mA of LED current requires a
1.5 V span rather than a 0.15 V one:

| | Control range | β spread | Release governed by |
|---|---|---|---|
| No R_E | ~1.0 dB | ~3× | base path, 6:1 |
| R_E = 1 kΩ | ~6.8 dB | ~7% | R_REL, 1.6:1 |

One resistor fixes the control law, the β-dependence of §6.4, and the release
model of §8.6.1 simultaneously.

#### 8.7.2 Current limit

**R_LED = 3.3 kΩ**, revised from 4.7 kΩ to account for the 1.5 V now dropped
across R_E. Budget at full drive, from an 8.7 V rail:

| Element | Drop |
|---|---|
| Vactrol LED (assumed) | 1.5 V |
| R_LED, 3.3 kΩ at 1.5 mA | 4.95 V |
| Sense resistor, 10 Ω | 0.015 V |
| V_CE (active region, not saturated) | 0.74 V |
| R_E, 1 kΩ at 1.5 mA | 1.5 V |
| **Total** | **8.7 V** |

V_CE of 0.74 V keeps the transistor comfortably out of saturation across the
range, which matters now that the stage is meant to be a transconductance
element rather than a switch.

The 1.5 mA target comes from §6.2: the acceptance criterion needs R_LDR ≈ 10 kΩ,
and specifying several milliamps more than that compresses the useful range into
the bottom of PEAK REDUCTION's travel. **The LED current at which a candidate
vactrol reaches 10 kΩ must be read from its datasheet** and this table recomputed
— revision 2 asserted a figure for a "VTL5C3-class" part from memory without a
citation, and that claim is withdrawn.

Keep 2.2 kΩ and 1.5 kΩ as population alternatives for characterization. The 1.5 V
LED forward-drop assumption is part-dependent — red vactrol LEDs commonly sit
near 1.8 V — so recompute once the part is chosen.

This stage is still not a precision current source. A controlled-current driver
remains a candidate for a later revision, but §6.4 records that degeneration has
already removed most of the motivation.

### 8.8 LED current measurement

Bench item §12.2.2 requires LDR resistance at several known LED currents, so the
LED current must be measurable without desoldering. Revision 1 called for a
"collector/current measurement point," which is not sufficient on its own.

Place a **10 Ω sense resistor in series with the LED** (between the transistor
collector and the vactrol LED cathode), with a labeled test point on each side. A
meter across it reads current directly at 10 mV/mA without breaking the circuit or
disturbing the operating point — at the 1.5 mA maximum it drops 15 mV, negligible
against the budget in §8.7.

### 8.9 Power-up behavior

VBIAS ramps over roughly 2.5 s (§8.1). During that ramp the makeup and sidechain
outputs slew toward their operating points, the rectifier sees a one-sided
transient, and the LED can receive a pulse — producing an audible thump and a
burst of gain reduction at switch-on.

This is expected behavior for a single-supply design of this type and is not
mitigated in v1. It is recorded as a measurement (§12.2 item 14) so that the
decision to add muting, or to stage the supply rails, is made from an observation
rather than a guess.

## 9. Vactrol representation

Add a generic four-terminal `Vactrol` component under `lib/opto/` with semantic pin
names:

* `LED_A` — LED anode;
* `LED_K` — LED cathode;
* `LDR_1` — first photocell terminal; and
* `LDR_2` — second photocell terminal.

**The footprint prop is required, with no default.** Revision 1 said "require or
clearly default its footprint"; this revision removes the hedge. §12.1 item 7
requires every vactrol pin to map to a datasheet-verified pad, and a silently
defaulted footprint is precisely the kind of fallback that lets missing
information reach fabrication output undetected. Omitting the footprint must be a
type error, not a guess.

The component represents connectivity and physical packaging only. It must not
imply that tscircuit understands optical coupling, LDR memory, attack time,
release time, or resistance as a function of LED current. Put that limitation in
the component comment and in the module design notes.

Do not model the vactrol as an ordinary variable resistor controlled by a net.
There is no electrical control connection between the LED and LDR, and inventing
one would destroy the isolation that defines the part.

## 10. Module interface

```ts
export interface OpticalCompressorProps {
  name: string
  /** Required: no default. See §9. */
  vactrolFootprint: string
  shuntResistance?: string
  sidechainGainResistance?: string
  sidechainBiasResistance?: string
  detectorCapacitance?: string
  releaseResistance?: string
  ledResistance?: string
  inputCap?: string
  outputCap?: string
  sidechainCouplingCap?: string
  pcbX?: number
  pcbY?: number
  schX?: number
  schY?: number
}
```

Changes from revision 1: `vactrolFootprint` is required; `sidechainGainResistance`
is joined by `sidechainBiasResistance` because the sidechain gain is set by two
resistors and one prop could not express it unambiguously; and the three coupling
capacitors are exposed, since §8.4 already revises one of them and §8.6 expects
the detector network to be swept.

Defaults match the provisional values in this proposal. The two panel
potentiometers are external controls and connect through explicit module terminals
rather than being silently treated as board-mounted parts.

### 10.1 Connectors

| Connector | Pins | Purpose |
|---|---|---|
| `J_IN` | IN, GND | AC-coupled audio input |
| `J_OUT` | OUT, GND | AC-coupled audio output |
| `J_PWR` | +9V_RAW, GND | Pedal supply input |
| `J_PEAK` | TOP, WIPER, BOTTOM | Peak Reduction pot |
| `J_GAIN` | TOP, WIPER, BOTTOM | Gain pot |

`J_PEAK`'s third pin is named `BOTTOM`, not `VBIAS` as in revision 1. It connects
to VBIAS, but naming a physical terminal after the net it happens to land on
conflates two things the schematic should keep separate — and it makes the two pot
connectors gratuitously asymmetric.

Both pots must fail safely when a wiper goes open or intermittent, but **the two
require different treatments** — revision 2 applied one rule to both and was
wrong to do so.

**GAIN is a rheostat.** It sits in the makeup amplifier's feedback path and only
its resistance matters. Tie the wiper to the appropriate end terminal, so
intermittent contact produces a bounded resistance rather than an open circuit.
This matters most here, because an open wiper in a feedback path drives the
makeup stage to maximum gain.

**PEAK REDUCTION is a three-terminal voltage divider** — TOP from the makeup
output, BOTTOM to VBIAS, WIPER to the sidechain amplifier. Tying its wiper to
either end would short out part of the divider and destroy the control. Revision
2 specified exactly that, in pursuit of connector symmetry; it would not have
worked. Instead, add a **1 MΩ resistor from the wiper to VBIAS**. Against the
100 kΩ pot this perturbs the control law by roughly a tenth of its own
contribution while guaranteeing that an open wiper settles at VBIAS, producing
zero detector drive and therefore no compression.

The two connectors keep symmetric physical pin names. Their electrical failure
handling is not symmetric and cannot be made so.

### 10.2 Test points

Expose labeled test points for:

* buffered input;
* gain-reduction node;
* compressor output before coupling;
* sidechain amplifier output;
* detector node;
* LED sense resistor, both terminals (§8.8);
* `+9V_PROTECTED` and `VBIAS`; and
* ground.

## 11. Repository changes

```
lib/
├── chips/
│   └── TL072H.tsx
└── opto/
    ├── Vactrol.tsx
    └── index.ts
modules/
└── optical-compressor/
    ├── OpticalCompressor.tsx        # public module: props, composition, inter-part traces
    ├── parts/
    │   ├── PowerSection.tsx         # protection, reservoir, VBIAS divider + buffer
    │   ├── AudioPath.tsx            # input buffer, attenuator, makeup amplifier
    │   └── Sidechain.tsx            # sidechain amp, detector, LED driver, sense resistor
    ├── DESIGN-NOTES.md              # modeling boundary, populate lists, measured values
    ├── index.ts
    └── optical-compressor.circuit.tsx
```

And updates `lib/index.ts`, `modules/index.ts`, and `README.md`.

### 11.1 On the `parts/` split

Revision 1 placed the entire circuit in a single `OpticalCompressor.tsx`. Power,
bias, buffer, attenuator, makeup, sidechain, detector, driver, five connectors,
roughly ten test points, and all interconnecting traces will not fit in the
300–500 line ceiling.

**Provenance of that ceiling.** It is a standing convention of this project's
maintainer, but through revision 2 it lived only in the maintainer's personal
global configuration and was not visible in the repository — a reviewer working
from the public tree could not verify it, and reasonably challenged it.
Revision 3 adds the rule to the checked-in project `CLAUDE.md` so it is a real,
auditable project convention rather than an unstated one.

The split resolves this **without** violating §4's prohibition on premature
module extraction, because the two are different boundaries:

* `parts/*.tsx` are internal, **not exported** from `index.ts`, and not added to
  `modules/index.ts`. They take a `name` prefix and layout coordinates and nothing
  else. They are file organization.
* `OpticalAttenuator` / `OpticalSidechain` as *modules* would be public, reusable,
  separately-fixtured surfaces with stable prop contracts. Those remain deferred
  until the complete circuit validates their interfaces.

If a part later earns promotion to a real module, that is a deliberate change to
the public surface, made with measurements in hand.

`OpticalCompressor.tsx` uses `createGrid()` and explicit coordinates. Keep the
audio path on the center row, power and decoupling above and below the relevant
op-amps, and the sidechain on a separate lower row flowing back toward the LED
driver. All component and net names are prefixed with `name`.

The standalone fixture should be large enough for a legible schematic and initial
PCB placement. Its power connector and bias network are part of the fixture
because single-supply behavior is part of the module's contract. It is a
development fixture, not the production board.

Do not create a general-purpose `boards/` design in this change. The compressor
should first pass electrical validation as a standalone module.

## 12. Verification

### 12.1 Static project checks

The change is complete at the repository level when:

1. `bun install` succeeds from a clean clone.
2. `bun run typecheck` passes.
3. The standalone compressor fixture renders in `tsci dev` without unresolved
   traces or overlapping critical labels.
4. `tsci build modules/optical-compressor/optical-compressor.circuit.tsx` succeeds.
5. Schematic signal flow is legible from left to right.
6. All external connections and test points have stable semantic names.
7. Exported fabrication data maps every vactrol pin to the selected device's
   verified pad number.
8. The selected op-amp supplier part is explicitly a TL072H-compatible device
   characterized for operation below the protected 9 V rail.
9. No source file exceeds the repository's 500-line ceiling.
10. `vactrolFootprint` is required, so omitting it fails `typecheck` rather than
    producing a default footprint.

### 12.2 Bench characterization

Before calling the electrical design validated, record:

1. Dark resistance after at least 30 seconds with the LED off. **Pass window:
   ≥ 1 MΩ** (§6.2).
2. LDR resistance at several LED currents from approximately 0.1 mA through the
   intended maximum, measured via the §8.8 sense resistor. **Pass window:
   ≤ 10.2 kΩ at or below maximum current** (§6.2).
3. Audio insertion loss with the LED off. **Pass window: better than −0.2 dB.**
4. Maximum gain reduction at the intended LED-current limit.
5. Attack time after a level step.
6. Recovery after both a 100 ms pulse and several seconds of illumination.
7. Output level versus input level at several PEAK REDUCTION settings.
8. **All three §6.1 thresholds**, measured at the sidechain-amplifier output:
   (a) first detectable gain reduction; (b) the level at which further increase
   stops producing additional gain reduction; (c) visible clipping. **Expected:
   (a) ≈ 1.25 V, (b) ≈ 2.75 V, (c) ≈ 4.15 V — so (a)→(b) ≈ 6.8 dB of control
   range with ≈ 3.6 dB of margin above it.** This is the single most important
   measurement in the list: it validates or refutes the driver change in §8.7,
   and (b) cannot be predicted reliably without the selected transistor and
   vactrol in circuit.
9. Rectifier ripple at the detector node, swept **both directions** from
   C_DET = 4.7 µF (10 µF, 2.2 µF, 1 µF), recording where audible modulation
   begins.
10. Electrical release with the LED driver connected, measured as **LED current
    falling from 90% to 10%** (§8.6.1). Compare against the ~305 ms estimate;
    the nominal R_REL·C_DET product predicts neither the shape nor the duration.
11. Distortion and noise at representative guitar, line, and maximum expected
    levels.
12. Interaction between GAIN and PEAK REDUCTION.
13. VBIAS DC stability and audio ripple at idle and maximum gain reduction, at
    9.0 V and again at 7.5 V to quantify the §6.3 degradation.
14. Power-up transient: thump amplitude at the output and gain-reduction excursion
    during the ~2.5 s VBIAS ramp (§8.9).
15. Clean headroom at the buffered input, gain-reduction node, makeup output, and
    sidechain output using a regulated 9.0 V supply. **Record the TL072H output
    swing explicitly** — §6.1.3's ±4.15 V estimate is extrapolated from a 40 V
    characterization and is the design's most load-bearing unverified number.
16. LED current at maximum drive across at least three 2N3904 samples, to confirm
    that degeneration has reduced the §6.4 β spread to single-digit percent.
17. **Control-law shape**: gain reduction versus detector voltage across the full
    range, to confirm the law is progressive rather than switch-like. Revision 2's
    undegenerated driver would have failed this; it is the acceptance test for
    §8.7's emitter resistor.

Measurements must identify the exact vactrol part and sample. Optical parts can
have wide tolerances, so a single measurement is evidence for a prototype, not a
general component specification.

## 13. Acceptance criteria

The first design is successful when:

* with the LED off, insertion loss is better than −0.2 dB;
* PEAK REDUCTION moves continuously from negligible compression to at least 10 dB
  of useful gain reduction on ordinary program material, without the useful range
  collapsing into the last few degrees of rotation;
* GAIN can recover the lost level without obvious clipping at the target operating
  level;
* the gain-reduction **envelope** is stable on sustained program material — no
  pumping or breathing oscillation (§5.1);
* release is slow and smooth enough for the intended musical use;
* short and sustained signals recover differently when the chosen vactrol has
  meaningful optical memory;
* no audible rectifier buzz is present at normal settings;
* the vactrol LED remains within its selected safe current; and
* the module satisfies the repository checks above.

The 10 dB gain-reduction target is deliberately modest. A larger range is welcome,
but it should not be obtained by overdriving the LED or accepting a poor dark-state
insertion loss.

## 14. Risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Control range narrower than the ~6.8 dB estimate (§6.1.2) | Compression goes from absent to full over a small level range; law feels switch-like | Measure all three thresholds (§12.2.8) and the law's shape (§12.2.17); increase R_E if the measured range is short |
| Measured op-amp swing below the ±4.15 V estimate (§6.1.3) | Sidechain clips before full drive; top of the compression range lost abruptly | Measure it (§12.2.15); the 3.6 dB margin above threshold 2 exists to absorb this |
| Unknown vactrol characteristics | Wrong attenuation range or unusable timing | Screen datasheets against the §6.2 windows before ordering; characterize before freezing R_SHUNT or LED current |
| Residual β spread (§6.4) | LED current varies ~7% between transistor samples | Measure across samples (§12.2.16); acceptable at this magnitude, unlike the 3× of the undegenerated design |
| Wide part-to-part vactrol tolerance | Units behave differently | Measure multiple samples; consider selection or calibration only if variance is musically unacceptable |
| Cascaded electrical and optical release | Recovery becomes excessively slow | Make C_DET and R_REL independently optional; sweep downward from 10 µF |
| Half-wave ripple | Audible amplitude modulation or distortion | Start at C_DET = 10 µF per §8.6.1; reduce only to the measured audible boundary; adopt full-wave rectification only if evidence requires it |
| Feedback-loop interaction | Controls feel coupled, or the envelope pumps | Treat interaction as expected; test the envelope specifically (§5.1); revise loop gain rather than adding precision controls |
| Incorrect vactrol footprint | Fabricated board miswires the vactrol | Required footprint prop (§9) plus datasheet verification before PCB export |
| tscircuit cannot simulate optical dynamics | Rendered circuit appears more validated than it is | State the modeling boundary in `DESIGN-NOTES.md`; make bench results part of acceptance |
| Virtual-ground impedance or layout error | Compression signal leaks into the audio bias reference | Buffer and locally bypass VBIAS; keep LED current returns on real ground; measure ripple under maximum gain reduction |
| Battery depletion (§6.3) | Control range and headroom shrink as the battery drains | Validate against a regulated 9.0 V adapter; record 7.5 V behavior rather than guaranteeing it |
| Power-up transient (§8.9) | Audible thump and a burst of gain reduction at switch-on | Measure it (§12.2.14); decide on muting from the observation |

## 15. Deferred decisions

These remain open, but several that revision 1 deferred are now resolved by §6 and
are listed in Appendix A instead.

* exact vactrol manufacturer and part number (criteria are now specified; the part
  is not);
* final R_SHUNT value;
* final LED resistor, once the real LED forward voltage is known;
* final C_DET, from the §12.2.9 sweep;
* PEAK REDUCTION and GAIN pot tapers;
* maximum makeup gain;
* whether half-wave rectification is quiet enough;
* final R_E, if the measured control range (§12.2.8) differs from ~6.8 dB;
* whether a redesigned sidechain solving the §8.6.2 level-shifting problem is
  worth proposing at all;
* whether to adopt a controlled-current LED driver in a later revision; and
* whether validated internal parts deserve promotion to reusable modules.

## 16. Implementation sequence

1. Add an explicit `TL072H` library component and verify its supplier part,
   footprint, and rail-to-rail output specification.
2. Add the generic `Vactrol` library component with a required footprint prop, and
   verify its pin naming and schematic rendering with a temporary fixture.
3. Screen candidate vactrols against the §6.2 windows and order parts.
4. Build and measure the protected 9 V supply and buffered VBIAS network.
5. Implement `parts/PowerSection.tsx`, `parts/AudioPath.tsx`, and
   `parts/Sidechain.tsx`, then compose them in `OpticalCompressor.tsx`.
6. Add and render the standalone module fixture.
7. Type-check and build the fixture.
8. Breadboard the same topology and characterize the selected vactrol against the
   §12.2 pass windows.
9. Update provisional component values from measurements; record them in
   `DESIGN-NOTES.md`.
10. Export and inspect the schematic and footprint mapping.
11. Only after electrical validation, propose a production PCB or promote stable
    internal parts to modules.

## 17. Decision requested

Approve the following direction for implementation:

* solid-state, LA-2A-inspired behavior rather than an LA-2A clone;
* one nominal +9 V pedal supply with Schottky reverse-polarity protection, with a
  regulated adapter as the validation reference;
* a buffered half-supply VBIAS reference for all biased audio stages;
* TL072H op-amps, in two packages split audio/control per §8.1;
* feedback detection from the post-makeup output;
* two controls only: PEAK REDUCTION and GAIN;
* simple half-wave detector and a **degenerated** 2N3904 LED driver, with the
  precision-rectifier variant withdrawn as unachievable on a single supply and
  reduced to bench test pads (§8.6.2);
* R_E = 1 kΩ, R_LED = 3.3 kΩ, and C_DET = 4.7 µF as starting values, per §8.6.1
  and §8.7;
* separate failure-mode treatments for the two potentiometers (§10.1);
* the §6.2 vactrol selection criteria as the part-screening specification;
* one generic `Vactrol` library component with a required footprint, and one
  complete compressor module built from internal parts; and
* bench characterization against the §12.2 pass windows as a required part of
  design validation.

Approval authorizes implementation of the experimental module and fixture. It does
not approve a production PCB or freeze the values that depend on the chosen
optical element.

## 18. References

* Texas Instruments, *TL07xH Low-Noise FET-Input Operational Amplifiers* — TL072H
  supply range, rail-to-rail output stage, input range, packaging, and electrical
  specifications. Verify the rail-to-rail output claim against the current
  datasheet revision, since §6.1's headroom budget depends on it.
* oletizi/audio-circuits — current repository structure and module conventions.

---

## Appendix A: Changes from revision 1

### Corrections

| § | Revision 1 | Revision 2 | Reason |
|---|---|---|---|
| 8.6.1 | Electrical release "nominal 100 ms" from 1 µF × 100 kΩ | ~8.5 ms as specified; 10 µF needed for ~85 ms | The 2N3904 base path draws ~85 µA vs. R_REL's 15 µA and dominates 6:1; R_REL never governs anything audible |
| 8.6 | C_DET = 1 µF; preferred first test is to omit it | C_DET = 10 µF; sweep downward | At 1 µF the node loses ~1.0 V between 100 Hz peaks against a 0.85 V control span; omitting it removes all storage |
| 8.7 | R_LED = 2.2 kΩ default, 4.7 kΩ alternate | R_LED = 4.7 kΩ default, 2.2 kΩ alternate | §6.2 shows the 10 dB target needs ~0.5 mA; 3.2 mA crams the range into the top of the pot |
| 8.4 | Output coupling 1 µF | 2.2 µF | 1 µF into the specified 10 kΩ minimum load gives a 17.5 Hz corner |
| 10.1 | `J_PEAK` pins TOP / WIPER / VBIAS | TOP / WIPER / BOTTOM | Terminal names should not be net names; also makes both pot connectors symmetric |

### Additions

* **§6 Numeric constraints** — new section: sidechain headroom budget, vactrol
  selection windows, supply-voltage stance, LED drive predictability.
* **§5.1** — names envelope oscillation as the actual instability mode, and
  §13 restates the acceptance criterion accordingly.
* **§8.1** — op-amp sections assigned to packages, audio separated from control.
* **§8.6.2** — precision rectifier provisioned as a population option, with the
  layout requirements that make it a swap rather than a respin.
* **§8.8** — 10 Ω LED sense resistor with test points, so §12.2.2 is actually
  performable.
* **§8.9** — power-up transient documented and added to bench items.
* **§11.1** — `parts/` file split, with the distinction between file organization
  and module extraction made explicit.
* **§12.2** — pass/fail windows attached to bench items 1–3; new items 8, 9, 10,
  14, 16.

### Hedges removed

* §9 — vactrol footprint changed from "require or clearly default" to required, no
  default. A defaulted footprint is a fallback that can reach fabrication output
  carrying an unverified pad map.
* §10.1 — pot wiper tie changed from "where possible" to required; there is no
  case here where it is not possible, and an open GAIN wiper drives the makeup
  stage to maximum gain.
* §6.3 — minimum supply voltage moved out of deferred decisions; validation floor
  set at 9.0 V nominal with battery behavior recorded rather than guaranteed.

### Resolved from revision 1's deferred list

* minimum supported supply voltage → §6.3
* maximum LED current and LED resistor starting value → §8.7
* detector capacitor starting value → §8.6.1
* vactrol selection criteria (previously implicit in "exact part number") → §6.2

> **Note.** Appendix A describes revision 2 as it stood. Several of its entries
> were themselves corrected in revision 3 — notably the §10.1 wiper rule, the
> §8.6.1 release figures, and the §8.7 LED resistor. Appendix B is authoritative
> where the two disagree.

---

## Appendix B: Changes from revision 2

Prompted by third-party review. Findings 1, 2 and 3 were raised as blocking;
all three are accepted.

### Blocking findings — circuit changes

**B1. Control range was not what §6.1 calculated.** Revision 2 computed detector
conduction → sidechain clipping (10.4 dB) and called it the control range. The
actual control range ends at maximum LED current, which with a bare
common-emitter stage and R_B = 10 kΩ arrives after only 0.05–0.15 V of detector
travel — roughly 0.3–1.0 dB depending on β. Revision 2's circuit would have
behaved as a near-switch.

*Change:* §6.1 rewritten around three thresholds instead of two. §8.7 adds
R_E = 1 kΩ, restoring ~6.8 dB of control range; R_LED drops 4.7 kΩ → 3.3 kΩ to
absorb the 1.5 V now across R_E. §12.2.8 and a new §12.2.17 measure the result.

*Consequence beyond the finding:* §6.4's framing was inverted. Revision 2 called
degeneration a ~3 dB headroom expense to defer; it is the change that makes the
control law exist, and it also cuts β spread from ~3× to ~7%.

**B2. The wiper rule was wrong for PEAK REDUCTION.** §10.1 required tying both
pot wipers to an end terminal. That is correct for GAIN, a rheostat in the
feedback path, and would have shorted out part of PEAK REDUCTION's three-terminal
divider.

*Change:* §10.1 split into separate GAIN and PEAK REDUCTION requirements; PEAK
REDUCTION gets a 1 MΩ wiper-to-VBIAS resistor for open-wiper safety instead.

**B3. The precision rectifier was never a population option.** Two reserved
footprints do not convert a non-inverting amplifier into an inverting precision
rectifier, revision 2 never addressed op-amp saturation on the off half-cycle,
and — decisively — a VBIAS-referenced rectifier cannot feed a ground-referenced
detector without level shifting that the single supply does not permit.

*Change:* §8.6.2 rewritten to withdraw the claim, stating all three problems.
The board keeps labeled test pads only. §8.5 consequently stays non-inverting,
since flipping it would have loaded the PEAK REDUCTION wiper for no remaining
benefit.

### Quantitative corrections

**B4. The release calculation used a linear approximation on an exponential
decay.** Revision 2's 8.5 ms figure held the discharge current at 100 µA; base
current actually falls continuously with detector voltage.

*Change:* §8.6.1 rebuilt on the exponential model, with the release metric
redefined as **LED current falling 90% → 10%**, which is measurable, unlike
"release at exactly 0.65 V" — V_BE moves with current. C_DET drops 10 µF →
4.7 µF, because degeneration raised the discharge impedance ~5× and 10 µF would
now give a ~650 ms release. All figures are marked as model estimates, including
the ripple numbers, which share the same approximation.

**B5. The degeneration penalty was arithmetically inconsistent.** Revision 2's
prose said ~1 V across the emitter resistor; its arithmetic used 0.5 V, giving
7.5 dB where 1 V gives 5.3 dB. Moot after B1 — recast as detector margin above
threshold 2 (~3.6 dB) rather than as usable range.

### Other accepted corrections

| Item | Change |
|---|---|
| §5.1 | "Cannot oscillate at audio rates" softened to "dominant expected instability is in the envelope domain," with the photoconductive roll-off given as a reason rather than a proof |
| §6.1.3 | TL072H swing marked an estimate extrapolated from a 40 V characterization; §12.2.15 now measures it explicitly |
| §8.4 | Polarity added for the 2.2 µF output capacitor (positive toward the op-amp) |
| §8.7.2 | Uncited "VTL5C3-class reaches target at a few hundred µA" claim withdrawn; datasheet reading made a prerequisite |
| §11.1 | Provenance of the 300–500 line ceiling stated; rule added to the checked-in project `CLAUDE.md` so it is auditable from the repository |
| §8.8 | "Bench item §12.2 item 2" → "§12.2.2" |

### Disputed, and how it was resolved

* **"The second threshold must be measured."** Partly. It is measurable and
  §12.2.8 measures it, but it was also calculable in advance — the review
  calculated it — and treating it as unknowable would have shipped a near-switch
  control law to the bench. Revision 3 treats B1 as a design defect with a
  circuit fix, not as a documentation gap.
* **"Verify the 300–500 line convention; it is not in the public CLAUDE.md."**
  Correct that it was unverifiable from the repository; incorrect that it might
  not exist. It was a real standing convention living only in the maintainer's
  global configuration. Fixed by publishing it rather than by annotating it.
