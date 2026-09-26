---
title: Transistor preamp, loop board (Build 4, first step) - global feedback around the two-stage buffered amplifier
date: 2026-09-25
status: Draft for operator review (provisional values - see Calibration)
brief: docs/transistor-preamp/microphone-preamp-feedback-lab.md
builds-on: docs/superpowers/specs/2026-09-24-transistor-preamp-buffered-design.md
---

# Loop board (Build 4, first step)

## Purpose

The brief's Build 4: feedback around more than one stage, so that one loop
sets the gain of the whole amplifier. This first step closes a loop around
the buffered board (Build 3) as it is - the tuned collector-feedback stage
plus the emitter follower - rather than jumping to a three-stage, 1073-like
design. The operator chose this deliberately, to learn the loop mechanism
from a board that has already been measured.

What it should show:

- the loop trades gain for control: less gain, but gain set mainly by two
  resistors, wider bandwidth, and less sensitivity to the transistor and the
  load;
- how much it trades depends on the LOOP GAIN - the open-loop gain divided by
  the closed-loop gain - and this chain has little to trade. That limitation is
  itself the lesson, and the reason real preamps (the 1073 section included)
  build far more gain than they keep.

The three-stage, direct-coupled design with emitter feedback and compensation
is a later, separately gated step.

## Circuit

```
IN ─ R8 4.7k ─ C2 ─┬─ BASE (Q1) ─ stage 1 ─ C3 ─ follower Q2 ─┬─ C5 ─ OUT
                   │                                          │
                   └── RV5 (trim) ── R9 22k ── C6 10µF ───────┘  (from Q2's emitter)
```

Everything on the buffered board, unchanged, plus four parts:

- **R8 4.7k input resistor** (id `input_resistor`), from the input header to
  the input coupling cap C2. It is one half of the gain-setting pair.
- **The feedback leg**, from Q2's emitter back to Q1's base: **C6 10µF**
  (id `loop_feedback_cap`; + terminal on Q2's emitter, about 3.1 V, - toward
  the base side, about 1.5 V), then **R9 22k** fixed floor (id
  `loop_feedback_floor`) and **RV5 200k** trim-pot (id `loop_feedback_trim`),
  wired as a rheostat like every other leg. The leg spans about 22k-222k.

Why this is NEGATIVE feedback: stage 1 inverts and the follower does not, so
the chain inverts overall; returning the output to the input stage's base
opposes the input.

Why C6: it blocks DC, so the loop acts on the signal only and leaves both
stages' bias exactly where the operator tuned it (the simulated operating
point is identical with and without the loop). Its corner with the feedback
leg is below 1 Hz.

Closed-loop gain: with lots of loop gain it would approach the leg resistance
divided by R8 (about 4.7 to 47). With this chain's modest loop gain it lands
well below that, and the trim-pot turns the AMOUNT OF FEEDBACK: turning it up
raises the gain toward the open-loop value and reduces the loop gain.

Opening the loop for comparisons: lift C6 (no jumpers, as on the feedback
board). With C6 out the board is the buffered board plus R8.

Designators: the buffered board's, plus R8, R9, RV5 and C6. 25 parts. Board
`boards/transistor-preamp-loop/`, circuit
`circuits/transistor-preamp/loop-board.ts`, built on the buffered board's
code rather than a copy of it.

## Simulated behaviour (model, at the feedback board's START settings)

| | 1 kHz gain | -3 dB band | peaking | 2k-load retention |
|---|---|---|---|---|
| open loop (R8 fitted, C6 out) | 17.2 | 8.9 Hz - 0.89 MHz | none | 0.990 |
| closed, leg 33k | 4.9 | 5.0 Hz - 3.2 MHz | none | 0.997 |
| closed, leg 68k | 7.7 | 5.6 Hz - 2.0 MHz | none | 0.995 |
| closed, leg 150k | 11.1 | 7.1 Hz - 1.4 MHz | none | 0.993 |

- **R8 halves the open-loop gain** (about 35 without it to 17 with it): it
  forms a divider with Q1's base, which presents only about 6k (r_pi at
  about 0.55 mA). So at a closed-loop gain of about 8 the loop gain is only
  about 2 - the benefits are real but modest, as expected.
- **No peaking anywhere from 1 Hz to 10 MHz**, and the bandwidth widens as
  feedback increases: the model shows a stable loop with margin. A two-stage
  loop with this little loop gain is low-risk, but the model has no board
  parasitics, so the bench check below is still required.
- The DC operating point is unchanged by the loop (Q1 base 1.47 V, emitter
  0.82 V, collector 8.00 V; Q2 emitter 3.14 V).
- Headroom is still set by stage 1's bias: with the collector at about 8 V,
  the output can swing only about 1 V upward before clipping. The loop does
  not create headroom; retuning stage 1 (a lower feedback leg centres the
  collector - see the earlier discussion) does.

## Calibration (why the values are provisional)

The operator is building and measuring Build 3 first. Once the measured
trim-pot legs, DC voltages and gains are in, the model is set to those values
and compared with the bench. R8, the feedback leg's range and C6 are then
confirmed or adjusted before any board is generated. The design's shape does
not depend on that; its numbers might.

## Verification

In `tests/circuits/transistor-preamp-loop.test.ts`:

- validates, 25 parts, one designator each; the buffered board's parts and
  designators unchanged;
- the feedback leg runs from Q2's emitter through C6, R9 and RV5 to Q1's base;
  C6's + terminal faces Q2's emitter; RV5 is a rheostat;
- the DC operating point equals the buffered board's (within 1%);
- with the loop closed at the START settings plus a mid-range leg: the 1 kHz
  gain is inverting and below the open-loop gain (C6 removed) by a margin
  showing the loop acts (closed less than 0.8 of open);
- turning the leg up raises the closed-loop gain (monotonic over three
  settings);
- no peaking: across 1 Hz-10 MHz the gain never exceeds its 1 kHz value by
  more than 10% (a sanity bound for a stable loop, not a phase-margin figure);
- the closed-loop upper -3 dB point is higher than the open-loop one;
- the KiCad round trip, schematic stub with project, board directory, netlist
  fixture, first strip-mode layout - as for the previous boards.

## Bench procedure

1. Power up through a current-limited supply with no signal; look at the
   output on a scope at a fast timebase for high-frequency oscillation before
   anything else. Repeat with the trim at both ends of its travel.
2. Measure gain at 100 Hz, 1 kHz and 10 kHz into 100k, with the loop closed at
   two or three trim settings, and open (C6 lifted).
3. Swap Q1 for another 2N3904 and repeat the 1 kHz gain, open and closed: the
   closed-loop gain should change proportionally less. This is the loop's
   main claim.
4. If distortion can be measured, compare open and closed at the same output
   level, as the brief asks.
