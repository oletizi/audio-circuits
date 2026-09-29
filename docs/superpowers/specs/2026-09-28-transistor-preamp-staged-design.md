---
title: Transistor preamp, staged board - a second gain stage with panel drive and character controls
date: 2026-09-28
status: Approved by the operator; implementation in progress (plan docs/superpowers/plans/2026-09-28-transistor-preamp-staged.md)
proposal: docs/transistor-preamp/transistor-preamp-gain-structure-proposal.md (approved, revision 2)
builds-on: docs/superpowers/specs/2026-09-24-transistor-preamp-buffered-design.md
---

# Staged board

## Purpose

The next version of the operator's 24 V preamp, per the approved gain-structure
proposal: add a second voltage-gain stage (Q3) between the existing
collector-feedback stage (Q1) and the emitter-follower output buffer (Q2),
with its gain controls. One change from the built buffered board: Q3 and its
three controls. Q1 and Q2 are unchanged (the operator judged Q2 satisfactory;
its isolation test is shelved).

What the operator wants from Q3, in their words: to "drive that stage to
saturation or back it off independently", to "dial in the amount of
saturation manually on a per-source basis" - explicitly not a stage that is
"polite until it's not" - and no need to match transistors.

## Decisions

Made with the operator while designing this step; each binds the design and
the implementation plan.

| Decision | By | Why |
|---|---|---|
| Change one thing at a time: this version adds Q3 and its controls, nothing else | Operator | Each version should be testable against the last |
| The gain controls come as part of adding Q3, not as a version of their own | Operator | A version with independent control at each stage makes each stage testable on its own |
| Q2 (the follower) is kept as built; its isolation test is shelved | Operator | Assumed satisfactory for now |
| Frequency response is judged by listening, not measured | Operator | The bench instruments cannot resolve gain differences between frequencies usefully, and the operator likes the current board's sound |
| Saturation is dialled in manually per source; not a stage that is "polite until it's not" | Operator | The point of Q3 is controllable coloration |
| No transistor matching: the design must work with any 2N3904 | Operator | Parts from the bag, swapped freely |
| Q3 is divider-biased with emitter degeneration (not another collector-feedback stage) | Operator, on the recommendation above | Saturates under control, with gain and bias nearly independent of β, and a high input impedance for the pot ahead of it |
| DRIVE, CHARACTER and TRANSFORMER DRIVE are panel pots on headers, not trim-pots | Operator | They are adjusted per source |
| Q3's collector bias is fixed and centred, not trimmed | Recommended; not contested | DRIVE and CHARACTER already give the saturation control; a fixed centred bias keeps Q3 transistor-independent; off-centre bias is a later experiment |
| Stage 1's 24 V bass shelf (Q1's bypass) is recorded, not fixed, in this version | Follows from one change at a time | See the finding below |
| Capacitor voltage ratings are not a concern for the test boards | Operator | Test boards only; a real build will specify proper ratings |
| Build 4's global-feedback loop board stays paused | Operator | This AC-coupled, independently controlled direction replaces it for now |

## Signal path and controls

```
IN → [input pot, off-board] → C2 → Q1 (unchanged) → C3 → DRIVE → C6 → Q3 → C8
   → TRANSFORMER DRIVE → C9 → Q2 (unchanged) → C5 → transformer → [output pot, off-board]
```

Three new panel controls, off-board pots on 3-pin headers:

| Control | Where | What it does |
|---|---|---|
| **DRIVE** (RV5, 25k) | between Q1 and Q3 | how hard Q3 is driven: the amount of saturation |
| **CHARACTER** (RV6, 1k, rheostat) | in Q3's emitter bypass branch | the shape of the onset: toward 0 Ω, early and gradual saturation with high gain; toward 1k, cleaner for longer with a firmer edge |
| **TRANSFORMER DRIVE** (RV7, 25k) | between Q3 and Q2 | backs the saturated signal down (or not) before Q2 and the transformer |

Per source: set DRIVE and CHARACTER for the saturation wanted, then
TRANSFORMER DRIVE for how hard the output stage and transformer are pushed,
then the existing output pot for level into the interface.

Each attenuator follows the proposal's coupling rule: a capacitor from the
preceding stage to the pot's top, the pot's bottom to ground, and the wiper
through another capacitor to the next stage's biased base, so no pot carries
DC or disturbs a bias. C3, formerly the capacitor into Q2, now feeds DRIVE.

## Q3

A divider-biased common-emitter stage with emitter degeneration, chosen for
the two properties the operator asked for:

- **It saturates, under the operator's control.** Degeneration does not stop
  a stage clipping; the drive level decides whether it reaches its limits.
  CHARACTER sets how it gets there: little degeneration lets the transistor's
  own curve round the waveform progressively as DRIVE rises (gradual,
  asymmetric, mostly even-harmonic), more degeneration keeps it clean until a
  firmer edge.
- **It does not depend on the particular transistor.** The divider is stiff
  (about ten times the base current of a β = 100 part flows through it), so the
  base voltage is set by resistors and the emitter current is
  (V_B − V_BE) ÷ R_E, nearly independent of β; the emitter sits near 2.3 V, so
  the ±50 mV V_BE spread between devices moves the current by about 2%. The
  gain, R_C ÷ (unbypassed emitter resistance + r_e), depends on resistors and
  that stable current, not on β. Any 2N3904 will do; no matching.

Values (24 V):

| Part | Value | Role |
|---|---|---|
| R8 / R9 | 100k / 15k | base divider (base about 3.0 V; Thévenin about 13k) |
| R11 | 1.2k | emitter DC resistor (emitter about 2.3 V, about 1.9 mA) |
| R10 | 5.6k | collector load (collector about 13.4 V: centred between rail and emitter) |
| C7 + R12 + RV6 | 470µF + 22 Ω + 1k panel pot | CHARACTER bypass branch, beside R11 |
| C6 | 22µF | DRIVE wiper to Q3 base |
| C8 | 10µF | Q3 collector to TRANSFORMER DRIVE |
| C9 | 10µF | TRANSFORMER DRIVE wiper to Q2 base |
| Q3 | 2N3904 | |

- The **centred collector** gives symmetric headroom. Fixed, not trimmed:
  DRIVE and CHARACTER already give the saturation control, and a centred
  bias keeps the stage transistor-independent. Deliberately off-centre bias,
  for asymmetric clipping, can be a later experiment.
- The **22 Ω floor** in the bypass branch caps Q3's gain at about 110. Fully
  bypassed, a 2N3904 at 1.9 mA would reach about 450, which would make DRIVE
  touchy and drop Q3's input impedance to about 1k. The emitter's DC path is
  always R11 alone, so no pot sets the bias.
- **C7 at 470µF** puts the bypass corner near 10 Hz at the lowest CHARACTER
  setting (22 Ω plus r_e of about 13 Ω).

## Simulated behaviour (model, 24 V, stage 1 at the operator's tuned legs)

| Quantity | Result |
|---|---|
| Q3 operating point | base 2.98 V, emitter 2.30 V (about 1.9 mA), collector 13.35 V |
| Q1 and Q2 operating points | unchanged: Q1 collector 19.85 V, Q2 emitter 9.58 V |
| Q3 gain, CHARACTER 0 / 250 / 1000 Ω | 111 / 17 / 7 |
| DRIVE at 10% / 50% / 90% of a linear track | 0.08 / 0.31 / 0.73 of Q1's output reaches Q3's base |
| Bass added by Q3 and its networks | under 2% loss at 20 Hz (output-to-Q1-collector ratio 0.98 of its 1 kHz value) |

- **Total gain is very high by design:** about 9,400 (80 dB) from Q1's input
  to the output with everything at maximum and CHARACTER at 0. That surplus is
  what lets DRIVE push Q3 into saturation from ordinary source levels; DRIVE
  and TRANSFORMER DRIVE are there to take it back.
- **DRIVE is loaded by Q3's input** (about 8-13k depending on CHARACTER), so
  halfway along the track gives about 0.31 rather than 0.5. It is still
  smooth and monotonic; with a real audio-taper pot the feel will differ from
  these linear-track numbers anyway. A 10k pot would reduce the interaction
  but load Q1's collector more (Q1's gain would drop about 20%); 25k is the
  balance chosen.
- **Polarity:** Q1 and Q3 invert and Q2 does not, so the chain is
  non-inverting overall (the existing board inverts).
- **What the model cannot show:** the saturation itself. The simulation tools
  here run operating-point and small-signal AC analyses only, so the shape of
  Q3's saturation at each CHARACTER setting is a bench result, not a
  simulated one.

### A finding about the existing stage 1

At 24 V the existing board already loses bass in stage 1: Q1's collector at
20 Hz is about 0.40 of its 1 kHz value (about −8 dB). At 24 V Q1 runs at
about 1.5 mA, so its r_e is about 18 Ω and its 220µF bypass stops bypassing
below about 40 Hz. The input capacitor into Q1's low input impedance costs a
further 12% at 20 Hz. This is not introduced by Q3, and changing it would be
a separate change (for example, a 1000µF Q1 bypass moves the corner to about
9 Hz). The operator likes the current board's sound, so it is recorded here
as a finding and an option, not changed.

## Board and tooling

- **Circuit:** `circuits/transistor-preamp/staged-board.ts`, built from the
  existing shared pieces: `addFeedbackStage(builder, "DRIVE_TOP")` (stage 1,
  with C3 now landing on DRIVE's top) and `addFollower(builder)` (Q2, whose
  input net the TRANSFORMER DRIVE coupling cap C9 lands on). Stage 1's and
  Q2's parts, ids and designators are unchanged.
- **Panel pots in the model:** each is a `potentiometer` (so simulations can
  turn it), with a 3-pin header footprint
  (`Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical`, VeroRoute
  `SIP3`) and the `Device:R_Potentiometer` symbol, vendored alongside the
  existing symbols. CHARACTER is wired as a rheostat (wiper strapped to one
  end on the board), like every trim-pot.
- **Designators:** Q3; R8-R12; C6-C9; RV5 (DRIVE), RV6 (CHARACTER), RV7
  (TRANSFORMER DRIVE). 32 parts in all.
- **Tooling:** the netlist value formatter handles resistances from 1k up;
  R12 (22 Ω) needs it extended below 1k, with a test.
- **Board:** `boards/transistor-preamp-staged/`, with the schematic stub and
  project, netlist fixture, and a first strip-mode layout, as for the
  previous boards.

## Verification

In `tests/circuits/transistor-preamp-staged.test.ts`:

- validates, 32 parts, one designator each; stage 1's and Q2's parts and
  designators match the buffered board's;
- each attenuator is wired cap - pot - cap as above, and CHARACTER is a
  rheostat in a branch beside R11, which alone carries the emitter's DC;
- at 24 V: all three transistors active (emitter current above 0.1 mA, VCE
  above 1 V), and Q3's collector centred - between 40% and 60% of the way
  from its emitter to the rail;
- CHARACTER: Q3's 1 kHz gain falls as its resistance rises, with at least a
  10:1 range across the pot;
- DRIVE and TRANSFORMER DRIVE: the level reaching the next stage rises
  monotonically with the wiper;
- bass: Q3 and its networks cost less than 0.5 dB at 20 Hz relative to 1 kHz
  (output over Q1's collector);
- the chain is non-inverting at 1 kHz;
- the KiCad round trip of the stub, and the fixture agreement once the
  schematic exists.

The transistor-independence of Q3's bias is argued above, not tested: the
repository has one 2N3904 model.

## Bench

Power up current-limited; check the three transistors' DC voltages against
the table above. Then, per source: turn DRIVE and CHARACTER and listen for
where Q3's saturation starts and how it grows; confirm TRANSFORMER DRIVE
backs the level down without changing the character; swap Q3 for another
2N3904 and confirm the sound and Q3's collector voltage barely change.
