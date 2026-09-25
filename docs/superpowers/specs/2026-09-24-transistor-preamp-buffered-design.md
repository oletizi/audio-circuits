---
title: Transistor preamp, buffered board (Build 3) - collector-feedback stage plus emitter follower
date: 2026-09-24
status: Draft for operator review (revision 2)
brief: docs/transistor-preamp/microphone-preamp-feedback-lab.md
builds-on: docs/superpowers/specs/2026-09-23-transistor-preamp-lab-design.md
---

> **Revision 2**, after third-party review. Accepted: Q2's bias described
> accurately as β-dependent (the divider is soft on purpose); the input
> impedance Q2 presents to stage 1, and how it moves with the load; a bench
> measurement list for Q2's operating point; the 1073 connection stated as a
> principle rather than a model. Partly accepted: the 2k-load criterion is now
> primarily comparative, but the 0.9 floor is kept, because it follows from the
> circuit (derivation in Verification) rather than being arbitrary. Not taken:
> turning Q2's operating-point voltages into simulation assertions - they are a
> bench exercise, and precise simulated values would test the 2N3904 model,
> not the operator's transistor.

# Buffered board (Build 3)

## Purpose

The brief's Build 3: add an emitter-follower output buffer after the
collector-feedback gain stage the operator has built and tuned
(`circuits/transistor-preamp/feedback-board.ts`). The follower gives nearly
unity voltage gain but can drive a low load with far less effect on the gain
stage. The brief's test compares the single-stage output with the buffered
output into 100k, 10k and 2k loads.

The principle this step introduces is to stop asking one transistor stage to
provide voltage gain and drive whatever load follows it at the same time. It
is one step in the progression the brief follows:

single common-emitter stage → collector-feedback stage → voltage-gain stage
plus current-gain (buffer) stage → multistage amplifier with global feedback.

This is not a model of the 1073's output stage; it is the architectural
principle behind that design's separate amplifier sections. Build 4 (global
feedback around the whole chain) is a later, separately designed and
simulated step.

Decisions made with the operator: stage 1 keeps all four trim-pots (so it can
be retuned); this work stays on the `feature/transistor-preamp` branch.

## Circuit

```
IN ─C2─┬─ stage 1 (unchanged: Q1, R1+RV1, R2+RV2, R3+RV3, R4, C1+RV4)
       │
 COLLECTOR ─C3 10µF─┬─ Q2 base            Q2 collector ─ VCC
                    │                     Q2 emitter ─┬─ R7 1.5k ─ GND
         VCC ─ R5 100k ─┤                             └─ C5 10µF ─ OUT
         GND ─ R6 100k ─┘
```

- **Stage 1** is the feedback board's stage, built by the same function
  (`addFeedbackStage` in `feedback-board.ts`), so the parts, trim ranges, ids
  and designators are identical and the operator's tuned settings carry
  across. The only change is where its output coupling cap C3 lands: the
  follower's base (net `BUFFER_BASE`) instead of the output header.
- **Follower Q2** (id `buffer_transistor`): a 2N3904, collector on VCC, emitter
  on net `BUFFER_EMITTER`. Its base is biased by R5 100k (VCC to base, id
  `buffer_bias_upper`) and R6 100k (base to ground, id `buffer_bias_lower`),
  with R7 1.5k (id `buffer_emitter_resistor`) as the emitter resistor. No
  trim-pot: nothing on it is worth tuning.

### Q2's bias depends on β, on purpose

The 100k/100k divider intentionally presents a light load to stage 1, and so
it is soft: its Thévenin equivalent is 4.5 V behind 50k, and Q2's base current
pulls the base below the naive half-supply. The emitter current is roughly

  I_E ≈ (V_TH − V_BE) / (R7 + R_TH/(β+1)) = (4.5 − 0.7) / (1.5k + 50k/(β+1))

which is about 1.5 mA at β = 50, 1.9 mA at β = 100 and 2.2 mA at β = 200. The
exact emitter voltage and current therefore depend on the transistor fitted.
The design does not need a precise operating point, because the follower has
ample headroom for the experiment - but the sag below 4.5 V is worth
measuring (see Bench measurements), because it shows that a divider has an
output impedance and that base current loads it.

Do not "fix" this by stiffening the divider (say, 10k/10k): Q2's bias would
sit nearer 4.5 V, but stage 1 would be loaded far harder, which is exactly
what the buffer is there to avoid.

### What stage 1 actually sees

At AC, Q2's own input impedance, roughly r_in ≈ (β+1)(R7 ∥ R_L), sits in
parallel with the divider's 50k. At β = 100:

- into a 100k load: R7 ∥ R_L ≈ 1.48k, r_in ≈ 149k, and stage 1's collector
  sees about 50k ∥ 149k ≈ 37.5k;
- into a 2k load: R7 ∥ R_L ≈ 857 Ω, r_in ≈ 87k, and stage 1 sees about
  50k ∥ 87k ≈ 32k.

So the follower does not completely isolate stage 1 from the output load. It
greatly reduces the effect: without it, stage 1's 1.8k collector resistor
would face the 2k load directly. That "emitter follower = infinite input
impedance, zero output impedance" is only an approximation is part of the
lesson.
- **Output cap C5** (id `buffer_output_cap`): 10µF, + terminal (pin a) on
  `BUFFER_EMITTER`, - on `OUT`.
- **Headers:** input, output and power, as on the feedback board.
- **Designators:** stage 1's as on the feedback board (R1-R4, RV1-RV4, C1-C4,
  Q1, J1-J3), plus Q2, R5, R6, R7, C5. 21 parts in all.
- Unbuffered-versus-buffered comparisons use the operator's existing
  single-stage board; this board has no second output.

## Verification

In `tests/circuits/transistor-preamp-buffered.test.ts`:

- validates, 21 parts, one designator each;
- stage 1 matches the feedback board part for part and designator for
  designator;
- the coupling (C3 collector to follower base; follower emitter through C5 to
  OUT) is as drawn;
- lowers to VeroRoute (Q2 `TO92`, C5 `CAP_ELECTRO_200`);
- the schematic notes carry stage 1's settings and describe the follower;
- at the feedback board's `START` settings: both transistors active
  (emitter current above 0.1 mA, VCE above 1 V), overall gain above 1 and
  inverting at 1 kHz;
- **load retention**, the gain into 2k divided by the gain into 100k, at 1 kHz.
  The primary requirement is comparative: the buffered board must retain
  materially more than the unbuffered feedback board, which is asserted below
  0.7 (its 1.8k collector resistor in parallel with 2k roughly halves its
  gain). The buffered board is also held to a regression floor of 0.9, which
  follows from the circuit rather than being picked: the follower's output
  resistance is about r_e + (stage 1 source ∥ divider)/(β+1) ≈ 13 Ω +
  (1.8k ∥ 50k)/101 ≈ 30 Ω, so its own gain is about 857/887 ≈ 0.97 into 2k
  against 1480/1510 ≈ 0.98 into 100k, and stage 1's load changing from about
  37.5k to 32k (in parallel with its 1.8k) costs under 1% more. Expected
  retention is therefore about 0.98; 0.9 leaves room for the β spread;
- the KiCad round trip of the generated stub.

The simulation checks stay sanity bounds. They do not assert Q2's
operating-point voltages: those depend on the fitted transistor's β, and are
the bench's to measure.

## Bench measurements

Alongside the brief's measurement log, record for Q2 (power on, no signal):
its base voltage, emitter voltage, V_BE, emitter current (V_E ÷ 1.5k) and
V_CE (9 V − V_E). Compare the base voltage with the naive 4.5 V, and with the
β-dependent estimate above, to see the divider's output impedance at work.
Then record the brief's load comparison: buffered and unbuffered (the
single-stage board) outputs into 100k, 10k and 2k.

## Build order

1. Share stage 1: `addFeedbackStage`, and `transistor2N3904(id, ...)` in
   `parts.ts` (done; existing boards' tests pass).
2. `circuits/transistor-preamp/buffered-board.ts`: `transistorPreampBuffered`,
   `DESIGNATORS`, `PIN_NUMBERS`, `schematicNotes`, reusing the feedback board's
   `START` and `controlStateFor`.
3. Schematic stub and project (`bun run schematic-stub`), then
   `boards/transistor-preamp-buffered/` (perfboard.json, Makefile), the
   netlist fixture via `make netlist-agrees` with a fixture-agreement test,
   `make import`, `make stripboard STRIPS=horizontal`. Commit after each.
