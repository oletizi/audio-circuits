---
title: Transistor preamp, buffered board (Build 3) - collector-feedback stage plus emitter follower
date: 2026-09-24
status: Approved design, implementation in progress
brief: docs/transistor-preamp/microphone-preamp-feedback-lab.md
builds-on: docs/superpowers/specs/2026-09-23-transistor-preamp-lab-design.md
---

# Buffered board (Build 3)

## Purpose

The brief's Build 3: add an emitter-follower output buffer after the
collector-feedback gain stage the operator has built and tuned
(`circuits/transistor-preamp/feedback-board.ts`). The follower gives nearly
unity voltage gain but can drive a low load without dragging down the gain
stage. That split, a gain stage followed by a separate output stage, is the
step toward the 1073's division of labour. The brief's test compares the
single-stage output with the buffered output into 100k, 10k and 2k loads.
Build 4 (global feedback around the whole chain) is a later, separately
designed and simulated step.

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
  on net `BUFFER_EMITTER`. Its base is biased near half-supply by R5 100k (VCC
  to base, id `buffer_bias_upper`) and R6 100k (base to ground, id
  `buffer_bias_lower`); R7 1.5k (id `buffer_emitter_resistor`) sets about 2 mA,
  enough to drive the brief's 2k load. 100k/100k keeps the load stage 1's
  collector sees light (about 50k); the bias shifts a little with β, which
  does not matter for a follower. No trim-pot: nothing on it is worth tuning.
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
- into 2k the buffered output keeps more than 0.9 of its 100k-load gain, while
  the unbuffered feedback board keeps less than 0.7;
- the KiCad round trip of the generated stub.

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
