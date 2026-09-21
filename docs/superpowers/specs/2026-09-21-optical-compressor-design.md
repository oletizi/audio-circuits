---
title: +9 V LA-2A-inspired optical compressor module
date: 2026-09-21
status: Draft for review (revision 2)
supersedes: revision 1 draft
---

# +9 V LA-2A-inspired optical compressor module

## 0. Revision note

This is a revised draft. Revision 1 proposed a sound architecture; this revision
corrects two numeric errors, adds the quantitative constraints that were
previously deferred, and resolves a conflict with the repository's file-size
convention. Changes from revision 1 are summarized in Appendix A so reviewers who
read the first draft can see what moved and why.

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

Because the optical element is slow, this loop cannot oscillate at audio rates.
The realistic instability is **envelope oscillation** — a low-frequency breathing
or pumping in which gain reduction and recovery chase each other. It appears when
loop gain is high and release is substantially faster than attack.

This distinction matters for acceptance testing: "no oscillation" must be
verified by watching the gain-reduction envelope on sustained program material,
not by checking that the audio output is free of tones. §13 states the criterion
in those terms.

## 6. Numeric constraints

These constraints were deferred in revision 1. They are derivable now, and
stating them up front converts several "measure it later" items into pass/fail
windows.

### 6.1 Sidechain headroom budget

This is the tightest constraint in the design and the reason several otherwise
attractive refinements are too expensive.

At a nominal 9.0 V input, after the Schottky drop the rail is about 8.7 V and
VBIAS is about 4.35 V. The TL07xH family has a rail-to-rail output stage, so at
light loading the sidechain amplifier swings to within roughly 150 mV of each
rail — about **±4.15 V peak** around VBIAS. (This rail-to-rail output is an
independent reason to specify the H suffix, beyond the supply-range reason given
in §8.1.)

Against that swing, the detector places two series junction drops between the
sidechain output and any LED current at all:

| Element | Drop |
|---|---|
| 1N4148 rectifier forward voltage | ~0.60 V |
| 2N3904 base-emitter forward voltage | ~0.65 V |
| **Total before any gain reduction** | **~1.25 V** |

So the usable detector window is:

```
20 * log10(4.15 V / 1.25 V) = 10.4 dB
```

**The entire control range from first detection to sidechain clipping is about
10 dB.** Referred back through the 11x sidechain gain, that is 114 mV peak at the
makeup output for onset and 377 mV peak for full drive.

Consequences that follow directly:

* **The rectifier diode drop is the threshold.** The design has no threshold
  control, but it does have a threshold, and this is it. It is temperature
  dependent (roughly −2 mV/°C per junction) and part dependent.
* **Emitter degeneration is expensive here.** Adding ~1 V across an emitter
  resistor to make LED current β-independent (§6.4) would cut the window to about
  7.5 dB. That is a real trade, not a free improvement.
* **A precision rectifier buys back ~5.7 dB.** Moving the diode inside the
  sidechain op-amp's feedback loop removes its 0.60 V from the budget, widening
  the window to 20·log10(4.15/0.65) ≈ 16.1 dB. This is why §8.6.2 provisions for it
  even though v1 does not populate it.

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

Repeating the §6.1 calculation at a depleted 9 V battery (7.5 V terminal, 7.18 V
after the diode, VBIAS 3.59 V, swing ±3.44 V) gives a detector window of 8.8 dB —
a ~1.6 dB loss of control range, on top of reduced audio headroom.

**Specify a regulated 9 V adapter as the reference supply** and validate against
it. Battery operation is not prohibited, but it is not a v1 validation target and
the compressor's behavior is expected to change measurably as the battery
depletes. Revision 1 deferred the minimum supply voltage; this revision sets the
validation floor at 9.0 V nominal and records battery behavior as a measurement
(§12.2 item 13), not a guarantee.

### 6.4 LED drive predictability

The 2N3904 operates in its active region across most of the control range, where
I_C = β · I_B. The 2N3904's β spans roughly 100–300 across parts and current, so
**LED current at a given detector voltage varies by up to 3× between
transistors.** The collector resistor caps only the saturated maximum; it does not
set the current elsewhere on the curve.

This is accepted for v1. The mitigation — emitter degeneration — costs ~3 dB of
the §6.1 window and is deferred to a later revision with a controlled-current
driver, where the headroom can be budgeted deliberately rather than spent
piecemeal.

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
* **2.2 µF** output coupling capacitor followed by a 100 kΩ output pulldown.

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
sidechain clipping at 377 mV peak, both referred to the makeup output.

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

* **10 µF detector capacitor (C_DET)**; and
* 100 kΩ release resistor (R_REL) in parallel with the capacitor.

Both parts must be independently bypassable or depopulatable.

#### 8.6.1 Why 10 µF, and why revision 1's release figure was wrong

Revision 1 specified 1 µF and described a "nominal 100 ms electrical time
constant" from 1 µF × 100 kΩ. That calculation omits the base path and is wrong by
roughly an order of magnitude.

The detector node has two discharge paths, not one. Besides R_REL, it drives the
2N3904 base through R_B = 10 kΩ, and the base-emitter junction clamps the base at
~0.65 V. At V_DET = 1.5 V:

| Path | Current |
|---|---|
| Base, (1.5 − 0.65) / 10 kΩ | 85 µA |
| R_REL, 1.5 / 100 kΩ | 15 µA |
| **Total** | **100 µA** |

The base path dominates roughly 6:1. With C_DET = 1 µF the node falls at
100 mV/ms, so it traverses from 1.5 V to the 0.65 V cutoff — at which point the
LED is fully off and gain reduction has completely released — in about **8.5 ms**.
R_REL barely participates, and the release resistor's nominal time constant never
governs anything audible.

The same 100 µA figure also predicts the ripple. Half-wave rectification of a
100 Hz signal leaves ~10 ms between peaks, over which 1 µF loses
100 µA × 10 ms / 1 µF = **1.0 V** — more than the entire 0.85 V control span. The
LED would effectively strobe at 100 Hz, leaving all smoothing to the vactrol.

Both problems have the same fix. With C_DET = 10 µF:

* the electrical release becomes ~85 ms, close to revision 1's stated intent; and
* the 100 Hz inter-peak droop falls to ~0.1 V, roughly 12% of the control span.

**This also reverses revision 1's recommended first bench test.** Revision 1
preferred omitting the capacitor entirely and letting the vactrol do the
smoothing; with no storage at all the detector node collapses between every peak,
and low-frequency buzz is the likely result. The better experiment is to start at
10 µF and work *down* (4.7 µF, 2.2 µF, 1 µF) until ripple becomes audible,
recording where the boundary falls.

The release still is not a single number. The photocell adds its own nonlinear,
history-dependent recovery, and the cascaded response must be measured as a
system (§12.2 items 6 and 7).

#### 8.6.2 Precision rectifier population option

Per §6.1, moving the rectifier diode inside the sidechain amplifier's feedback
loop removes 0.60 V of the 1.25 V detector threshold and widens the control window
from ~10.4 dB to ~16.1 dB.

v1 populates the simple detector. But the board must be laid out so the precision
variant is a **population change, not a respin**:

* reserve a footprint for a second 1N4148 (D_FB) from the sidechain amplifier
  output back to its inverting input;
* reserve a footprint for the feedback-path series resistor the precision
  configuration requires; and
* make the simple-detector diode's anode net and the sidechain amplifier's
  inverting-input net both reachable at the same pads, so the two configurations
  differ only in which parts are fitted.

Document the exact populate/depopulate list for both configurations in the module
design notes, so the swap is mechanical rather than a re-derivation.

### 8.7 LED driver

Use a 2N3904 as a low-side LED driver:

* emitter to ground;
* base driven from the detector node through 10 kΩ;
* collector connected to the vactrol LED cathode;
* vactrol LED anode connected to `+9V_PROTECTED` through the current-limit
  resistor; and
* 100 kΩ from base to ground so the transistor turns fully off when undriven.

**Start with a 4.7 kΩ LED resistor**, not 2.2 kΩ. Revision 1 had these inverted.
With approximately 8.7 V after the protection diode, an assumed 1.5 V LED drop and
0.2 V saturated transistor voltage:

| R_LED | I_LED(max) |
|---|---|
| 4.7 kΩ | 1.5 mA |
| 2.2 kΩ | 3.2 mA |
| 1 kΩ | 7.0 mA |

The reason to prefer 4.7 kΩ is §6.2. The acceptance target needs R_LDR ≈ 10 kΩ,
which a VTL5C3-class part reaches at a few hundred microamps. Specifying 3.2 mA
maximum is roughly an order of magnitude more current than the target requires,
which compresses the entire useful control range into the bottom of PEAK
REDUCTION's travel and makes the control feel abrupt near the top. 1.5 mA still
provides substantial margin over the ~0.5 mA the target implies.

Keep 2.2 kΩ and 1 kΩ as population alternatives for characterization, but do not
fit the 1 kΩ option unless the selected vactrol's datasheet and measured response
justify roughly 7 mA. The 1.5 V LED forward-drop assumption is itself
part-dependent — red vactrol LEDs commonly sit near 1.8 V — so recompute this
table once the part is chosen.

This transistor stage is intentionally simple; it is not a precision current
source, and §6.4 records the β-dependence that follows. If LED current proves too
supply-dependent or the compression curve too abrupt, a controlled-current driver
can be proposed as a separate revision.

### 8.8 LED current measurement

Bench item §12.2 item 2 requires LDR resistance at several known LED currents, so the
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

Both pots must fail safely when a wiper goes open or intermittent. **Tie each
wiper to the appropriate end terminal** so intermittent contact produces a bounded
resistance rather than an open circuit — for GAIN this matters most, since an open
wiper in the feedback path drives the makeup stage to maximum gain. Revision 1
said "where possible"; there is no case here where it is not possible, so it is a
requirement.

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
repository's 300–500 line ceiling.

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
8. **Detector window**: sidechain-amplifier output voltage at first detectable
   gain reduction, and at visible clipping. **Expected ~10 dB apart** (§6.1); a
   materially smaller measured window is the trigger for populating the §8.6.2
   precision rectifier.
9. Rectifier ripple at the detector node, swept from C_DET = 10 µF downward
   (4.7 µF, 2.2 µF, 1 µF), recording where audible modulation begins.
10. Measured electrical release with the LED driver connected, confirming the
    §8.6.1 analysis rather than the nominal R_REL·C_DET product.
11. Distortion and noise at representative guitar, line, and maximum expected
    levels.
12. Interaction between GAIN and PEAK REDUCTION.
13. VBIAS DC stability and audio ripple at idle and maximum gain reduction, at
    9.0 V and again at 7.5 V to quantify the §6.3 degradation.
14. Power-up transient: thump amplitude at the output and gain-reduction excursion
    during the ~2.5 s VBIAS ramp (§8.9).
15. Clean headroom at the buffered input, gain-reduction node, makeup output, and
    sidechain output using a regulated 9.0 V supply.
16. LED current at maximum drive across at least three 2N3904 samples, to bound
    the §6.4 β spread in practice.

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
| Narrow detector window (~10 dB, §6.1) | Compression goes from absent to full over a small level range; sidechain clips early | Measure it explicitly (§12.2.8); populate the §8.6.2 precision rectifier if the measured window is short |
| Unknown vactrol characteristics | Wrong attenuation range or unusable timing | Screen datasheets against the §6.2 windows before ordering; characterize before freezing R_SHUNT or LED current |
| β spread in the LED driver (§6.4) | Compression law varies 3× between transistor samples | Measure across samples (§12.2.16); defer emitter degeneration to a revision that can afford the ~3 dB headroom cost |
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
* whether the §8.6.2 precision rectifier gets populated in v1's final form;
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
* simple half-wave detector and 2N3904 LED driver, with the precision-rectifier
  variant provisioned as a population option;
* C_DET = 10 µF and R_LED = 4.7 kΩ as starting values, per §8.6.1 and §8.7;
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
