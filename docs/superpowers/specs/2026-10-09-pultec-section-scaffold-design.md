---
title: Pultec section scaffold — building one discrete section, and any combination of them
date: 2026-10-09
status: draft-for-review
parent: 2026-10-08-agent-authored-boards-design.md
---

# Pultec section scaffold

Sub-project **S0** of `2026-10-08-agent-authored-boards-design.md`.

## Problem

The Pultec three-band EQ is interactive. Its five sections are not a chain of stages; they
hang off a shared four-node ladder, and each owns exactly one series element of it:

| Ladder segment | Element | Section |
| --- | --- | --- |
| `in` to `hi_boost_out` | `RV_HI_BOOST` arm | hi-boost |
| `hi_boost_out` to `lo_boost_in` | `RV_HI_CUT` arm | hi-cut |
| `hi_boost_out` to `out` | `RV_LO_CUT` arm | low-cut |
| `lo_boost_in` to `out` | `R2` | low-boost |
| `in` / `hi_boost_out` | `RV_MID` bridge and `R_MID_SHUNT` | mid |

Everything else in a section is a shunt network hanging off those nodes. So a section on its
own is not a stage missing its terminations - it is a shunt network holding a *fragment* of
the signal path. Build low-boost alone and it has no output at all at flat, because its own
pot grounds `lo_boost_in` and the only route to `out` normally runs through low-cut's
short.

The requirement is both directions at once:

1. each discrete section works on its own, and
2. each works correctly with **any** combination of the others.

Five sections give 31 non-empty combinations, so a per-combination table is not the answer.
What is needed is a rule that composes.

## What was already designed, and what was wrong with it

An earlier revision designed a scaffold for low-boost alone: a 47k series stand-in and a
4k7, two resistors with removable links, reproducing low-boost's in-situ action to within
0.2 dB through the shelf and under-reading above about 300 Hz.

Extending that approach - one flat-state resistor per absent section - and measuring it
across combinations showed it does not work:

| Configuration | Section | Worst action error | At |
| --- | --- | --- | --- |
| low-boost alone | low-boost | 4.53 dB | 3 kHz |
| low-cut alone | low-cut | 18.68 dB | 20 Hz |
| hi-cut alone | hi-cut | 17.98 dB | 10 kHz |
| hi-boost alone | hi-boost | 8.23 dB | 10 kHz |
| mid alone | mid | 12.14 dB | 1 kHz |

Two separate mistakes were behind that, and both are instructive because neither was
visible from the netlist:

**A section's flat state is not just its ladder element.** `RV_LO_BOOST` at position 0
resolves its `ccw`-`wiper` arm to 0 ohms, which **shorts `lo_boost_in` to ground.** A real
flat low-boost therefore loads the ladder heavily, and a lone 56k series resistor leaves
that node floating. Adding the missing shunt dropped hi-cut from 17.98 to 2.29 dB, low-cut
from 18.68 to 0.27, and mid from 12.14 to 1.94 - one omitted component was most of the
error.

**A section's flat state is not purely resistive.** The residue after that fix traced,
through a leave-one-in matrix, to reactive branches a resistor cannot fake: hi-cut's 4k7
pot arm sits in parallel with `R1` plus the selected capacitor, and mid's flat path runs
through its selected capacitors, an inductor tap and `R_MID_BOOST`.

## The design

**A section's flat state reduces to an exact, small R/L/C network, and the scaffold is that
reduction.** This is the whole idea, and it works because flat is a degenerate setting:

- a potentiometer at position 0 resolves one arm to 0 ohms and the other to its full value,
  so the pot stops being a variable and becomes two fixed resistors, one of them a short;
- a rotary selector closes exactly one throw, so exactly one capacitor branch is live and
  the rest float and prune away.

So there is nothing to approximate or curve-fit. The stand-in is not a model of the absent
section - it is the absent section, at flat, with everything inert removed.

### The stand-ins

At the reference flat settings - low frequency 100 Hz, high frequency 5 kHz, mid 1 kHz:

| Absent section | Stand-in | Between |
| --- | --- | --- |
| hi-boost | 47k | `in` - `hi_boost_out` |
| hi-cut | 4k7 **in parallel with** (430R + 47nF) | `hi_boost_out` - `lo_boost_in` |
| low-cut | a link (0 ohms) | `hi_boost_out` - `out` |
| low-boost | 56k, **and** a link to ground | `lo_boost_in` - `out`, `lo_boost_in` - `0` |
| mid | 100k, **and** 25.3nF + 1H + 4k7 in series | `in` - `0`, `hi_boost_out` - `in` |

The 25.3 nF is the 22 nF and 3.3 nF of mid's 1 kHz position in parallel; the 1 H is its
`L_MID_1H` tap; the 4k7 is `R_MID_BOOST`.

### The rule that composes

**Fit the stand-in for a section if and only if that section is absent.**

That is the whole configuration rule. It is local to each stand-in, needs no knowledge of
which other sections are present, and therefore needs no table of 31 combinations. Its
effect is that the ladder is always whole: every element is present, either as the real
section or as its flat-state equivalent, so every present section sees the source and load
impedances it would see in the full EQ.

### Where the scaffold lives

**One separate scaffold board**, not stand-ins distributed across the section boards. Three
reasons, in order of weight:

1. **There is exactly one of each stand-in.** Distributed across boards, a stand-in for an
   absent neighbour would have to exist on every board that could need it, with a rule to
   fit exactly one - and fitting two would put them in parallel and quietly halve a value.
2. **The section boards stay electrically transparent.** This is the architectural problem
   the parent design flagged: conducting components in a physicalization layer that
   guarantees it adds none, needing a new category in `projectPhysical` narrow enough not to
   become a hole in `assertElectricallyTransparent`. Putting every conducting part on a board
   whose declared purpose is to conduct makes the problem mostly go away. The section boards
   need no new category at all.
3. **It is honest about what it is.** A scaffold board is visibly scaffolding. A resistor
   hidden on a section board is a part somebody will one day take for part of the circuit.

The scaffold board carries, per section, its stand-in components and a two-pad removable
link in series. Link fitted means that section is absent; link omitted means the real board
drives that segment.

### Verification

The gate is composition, not just the standalone case. For every combination under test, the
composed network's **action** for each present section - that section's control at full minus
all-flat - must match the same section's action in `THREE_BAND_REFERENCE`.

Measured, across all five singletons and five multi-section combinations:

```
subset                                 section     worst action error
low-boost                              low-boost         0.00 dB
low-cut                                low-cut           0.00 dB
hi-cut                                 hi-cut            0.00 dB
hi-boost                               hi-boost          0.00 dB
mid                                    mid               0.00 dB
low-boost+low-cut                      both              0.00 dB
hi-boost+hi-cut                        both              0.00 dB
low-cut+low-boost+hi-cut               all three         0.00 dB
low-cut+low-boost+hi-cut+hi-boost      all four          0.00 dB
all five (no stand-ins)                all five          0.00 dB
```

The all-five row is the control: it uses no stand-ins at all and confirms the harness and
that the partition recomposes exactly.

**The test must cover all 31 combinations**, not the ten probed here. Ten was enough to
establish the method; the suite should be exhaustive, because it is cheap and because the
rule's whole claim is that it composes for every subset.

**The integrated case needs its own test**, distinct from the above: with every link omitted
and all five sections present, the recovered graph must be **strictly equivalent** to the
reference network. Not "the scaffold measures as inert" - graph equivalence. That is what
protects the transparency guarantee.

## Limits, measured

These are properties of the design, to be stated wherever the scaffold is offered rather
than discovered at a bench.

**The stand-ins are specific to the frequency setting they emulate.** An absent section has
no frequency switch, so the scaffold must assume one, and its capacitor values follow from
that assumption. Holding the stand-ins at their 5 kHz / 1 kHz values while moving the
circuit's flat settings to 3 kHz produces errors up to **3.71 dB**:

```
section     alone   +hi-boost  +hi-cut  +low-cut  +low-boost   +mid
hi-boost     3.39        —       3.34     3.39       3.39       0.15
hi-cut       3.71       3.71       —      3.71       3.71       0.00
low-cut      0.02       0.02     0.02       —        0.02       0.05
low-boost    1.04       1.04     0.39     1.04         —        0.68
mid          0.17       0.17     0.00     0.17       0.17         —
```

So the scaffold board must **declare which setting it emulates**, and the 0.00 dB result
holds only there. Making the stand-in capacitors selectable, with a switch mirroring the
real section's positions, would lift the restriction at the cost of parts; that is a
decision for the implementation, not something this design forecloses.

**The low-frequency selectors are ganged.** `SW_LO_CUT` and `SW_LO_BOOST` share one shaft
(`lo_freq`). If one of low-cut or low-boost is present and the other absent, the real switch
sets the frequency for the present section, and a fixed scaffold is only faithful at the one
setting it was built for.

**Standing in for mid needs a 1 H inductor**, and mid's inductors have **no part number**.
`docs/pultec/values.md` specifies them electrically - value, tolerance, DCR - and says a
catalogue part, a pot core or a transformer winding all qualify. The scaffold inherits that
open question rather than resolving it, and the parent design's part contract will refuse
rather than guess.

**The metric is action, not absolute level.** Insertion loss differs between a standalone
section and the full EQ, and that difference is real and expected - the makeup stage absorbs
it. Matching action means the EQ curve has the right shape and depth, not that the output
sits at the same level.

**Every figure here is a model prediction.** 0.00 dB means the scaffold reproduces what the
model does, which is a statement about internal consistency. The model is unvalidated: no
unit has been built from it, `R3` is fitted at 4K7 where an inductive build calls for
nominally 470R, and the three pot connections are documentation-derived rather than
netlist-confirmed. The scaffold is what makes measuring a section possible; it does not
make the model true.

## Derivation, not transcription

The values above were computed by resolving each section at flat and reading off what
remained. **That derivation should be code, not a table somebody maintains.**

`lib/board/scaffold.ts` takes a section and a flat control state, resolves it, prunes
floating branches, and returns the stand-in network for its boundary nets. The committed
values are then a derived artifact, regenerated and compared by content like every other.

The alternative - a hand-written list of five stand-ins with their values - is a parallel
copy of facts the model already states, and it would drift the first time a capacitor value
changed. The repository has the rule for this already: **transcription is evidence, not
memory.** A scaffold whose values are derived cannot disagree with the circuit it scaffolds;
one that is typed in can, silently, and the failure would look like a measurement.

## Build legibility

The configuration must be readable off the hardware.

- Each link on the scaffold board is labelled with the section it stands in for, and which
  state means absent.
- The scaffold board's silkscreen states the frequency setting it emulates, because that is
  the limit most likely to be forgotten and the one that looks like a circuit fault rather
  than a configuration error.
- The generated wiring guide gains a scaffold section listing, per configuration, which
  links are fitted.

The wiring guide exists because a layout does not say that `C1` is 100 nF. A scaffold that
does not say which links to remove has the same defect, and a worse failure mode: a link
left fitted in a full build parallels the real section it was standing in for, which is
quiet, plausible, and wrong.

## Out of scope

- Resolving the inductor part question. The scaffold surfaces it.
- Selectable stand-in capacitors. Noted as an option above; not designed here.
- Any PCB form of the scaffold. This is a perfboard-era piece, like the sections it serves.
- Compensating for anything other than an absent section's flat state. A scaffold does not
  emulate a section being *present and set somewhere* - only absent.
