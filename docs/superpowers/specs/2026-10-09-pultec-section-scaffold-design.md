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
  the rest are genuinely disconnected at the open switch pins.

So there is nothing to approximate or curve-fit. The stand-in is not a model of the absent
section - it is a **subset of the absent section's own flat-state components**, which is a
stronger claim and the reason the equivalence is exact rather than close. "Inert" means
disconnected, not merely unimportant: see **Reduction** below, because the difference between
those two readings is what made the earlier design wrong.

### The stand-ins

At the reference flat settings - low frequency 100 Hz, high frequency 5 kHz, mid 1 kHz:

| Absent section | Stand-in | Between |
| --- | --- | --- |
| hi-boost | 47k | `in` - `hi_boost_out` |
| hi-cut | 4k7 **in parallel with** (430R + 47nF) | `hi_boost_out` - `lo_boost_in` |
| low-cut | a wire (0 ohms) | `hi_boost_out` - `out` |
| low-boost | 56k, **and** a 0-ohm shunt | `lo_boost_in` - `out`, and `lo_boost_in` - ground |
| mid | 100k, **and** 25.3nF + 1H + 4k7 in series | `in` - ground, and `hi_boost_out` - `in` |

The 25.3 nF is the 22 nF and 3.3 nF of mid's 1 kHz position in parallel; the 1 H is its
`L_MID_1H` tap; the 4k7 is `R_MID_BOOST`. The 0-ohm branches here are **circuit elements** -
the pot arms that flat resolves to a short - and are not to be confused with the removable
isolation links of the next section, which are configuration hardware.

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

### Isolation: how many links a stand-in needs

An earlier revision of this spec said each stand-in sits behind "a two-pad removable link in
series". **That is wrong, and wrong in the dangerous direction** - it would have been built
before it was caught, because the error is in the hardware instruction rather than in the
model.

Several stand-ins are **three-terminal**. Low-boost's has a 56k to `out` and a short to
ground, both meeting at one node. Wire that node to `lo_boost_in` through a single link and
pull the link for a full build, and the two remaining branches still connect `out` to ground
through the 56k. Measured on the full five-section build, that spurious load costs:

```
   Hz    reference   one link pulled    error
    20     -21.432          -22.022    -0.589 dB
   100     -19.469          -20.039    -0.570 dB
  1000      -7.905           -8.134    -0.229 dB
 10000     -37.330          -37.394    -0.064 dB
```

**The rule is n-1 links for an n-terminal stand-in**, where ground counts as a terminal.
Breaking all but one leg leaves the network hanging by a single point, connecting nothing to
nothing. Breaking only some of them leaves a path. With both the `lo_boost_in` and `out` legs
broken, the same build measures 0.000 dB at every frequency.

| Absent section | Boundary terminals | Links |
| --- | --- | --- |
| hi-boost | `in`, `hi_boost_out` | 1 |
| hi-cut | `hi_boost_out`, `lo_boost_in` | 1 |
| low-cut | `hi_boost_out`, `out` | 1 |
| low-boost | `lo_boost_in`, `out`, ground | 2 |
| mid | `in`, `hi_boost_out`, ground | 2 |

Seven links in total. **The count is derived from each stand-in's topology, never assumed** -
that is the part that generalises, and the specific counts above are what the derivation
yields for these five sections. No multipole switch or removable module is needed; plain
two-pad links suffice once there are enough of them.

Links fitted means that section is absent; links omitted means the real board drives that
segment.

### Reduction: what the derivation may and may not do

The stand-in is obtained from the section, and **the obtaining must not change what the
section presents at its boundary.** This is easy to get wrong, so the algorithm is specified
rather than described.

**Keep every component on a path between two boundary nodes. Drop only components that are
genuinely disconnected.** No series/parallel collapsing, no star-mesh transformation, no
elimination of internal nodes. The result is already small - three to five components per
section - because flat is degenerate, so there is nothing to gain from reducing further and a
whole class of impedance-altering bugs to avoid. A stand-in that is literally a subset of the
section's own flat-state components cannot differ from it.

Invariants the derivation must hold, and test:

- every boundary node of the section is a node of the stand-in;
- a component is dropped only if no path through it joins two boundary nodes;
- a branch reachable through an ideal short is **not** floating. A pot arm at 0 ohms is a
  short, and the branch beyond it is live. This is exactly the omission that made the earlier
  design wrong.

**`pruneFloatingBranches` must not be reused here.** It exists to prepare a network for
simulation under one source and load configuration, and a branch irrelevant to that
configuration can matter when a different boundary node is driven by a neighbouring section.
Scaffold derivation needs its own reduction with the invariants above.

### Verification

**The primary criterion is boundary equivalence, not frequency response.** A stand-in's job
is to present the right impedance at the nodes it shares with other sections, and two
networks can agree on one input-to-output transfer function while differing at another
boundary. So:

**Gate A - boundary equivalence.** For each section, the stand-in and the real flat section
must have equivalent multiport behaviour at their shared boundary: drive each boundary node
in turn with the others held, sweep frequency, and compare the resulting boundary admittances.
They must agree to tolerance across the band.

If the reduction above is conservative, this holds **by construction** - the stand-in is a
subset of the section's own flat components, so there is nothing to fit. That is the point of
specifying the reduction that way: Gate A is then a guard against reduction bugs rather than a
curve-fitting criterion, and a failure means the derivation broke something rather than that
the approximation is poor.

**Gate B - composition.** For every combination, the composed network's behaviour for each
present section must match `THREE_BAND_REFERENCE` under the same control vector, with absent
sections held at their declared reference-flat settings. This is the secondary check, and it
is what the measurements below report.

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

**And it must cover control interactions, not only one control at a time.** Every figure in
this document was measured by sweeping a single section's control with the others flat, and
that is not sufficient for this circuit. Two controls on the same ladder influence each
other - the Pultec's most characteristic move is low boost and low cut raised *together* at
the same frequency, which is the whole reason the EQP-1 is wanted - and a test that only ever
moves one control at a time would never exercise it. So for each combination the suite runs a
set of control vectors: all flat, each control at maximum, the boost-and-cut pairs at
maximum, and every control at maximum. The reference comparison uses the **same** vector,
with absent sections held at their declared reference-flat settings.

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

**The low-frequency selectors are ganged, and that is the worse of the two cases.** There are
two distinct scenarios and they need distinguishing:

- *The absent section's selector is simply gone.* The scaffold assumes a setting; nothing can
  move it; the only risk is forgetting which setting it is.
- *The absent section's selector is ganged to a present one.* `SW_LO_CUT` and `SW_LO_BOOST`
  share one shaft (`lo_freq`). If one of low-cut or low-boost is present and the other
  absent, **turning the present section's frequency knob silently invalidates the stand-in**,
  because in the real circuit that one knob moves both.

So the design **prohibits any claim of full-range equivalence** while a ganged selector is
away from the scaffold's reference setting. Concretely: the declared frequency state is part
of the test fixture, and the suite asserts it equals the reference model's setting. A
mismatch is a test failure, not a quietly degraded result. Selectable stand-in capacitors
would lift the restriction at a parts cost; that is an implementation decision this design
leaves open, and until it is taken the restriction is real and must be on the silkscreen.

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
  state means absent. Where a stand-in needs two links, both carry the same section's name,
  so a half-disabled stand-in reads as obviously incomplete.
- The scaffold board's silkscreen states the frequency setting it emulates, because that is
  the limit most likely to be forgotten and the one that looks like a circuit fault rather
  than a configuration error.
- The generated wiring guide gains a scaffold section listing, per configuration, which
  links are fitted.

**The wiring guide is a verified artifact, not prose beside the design.** It is generated
from the same configuration model the stand-ins come from, and a test asserts that its link
instructions match the actual connectivity of the generated layout. Without that it becomes a
second, independently maintained description of the same facts - and the drift would appear
as a builder following correct-looking instructions onto a wrong board. The repository already
holds guides this way: the wiring-sync test is deliberately read-only and content-compared,
because an earlier version rewrote the files it was checking and then passed.

The wiring guide exists because a layout does not say that `C1` is 100 nF. A scaffold that
does not say which links to remove has the same defect, and a worse failure mode: a link
left fitted in a full build parallels the real section it was standing in for, which is
quiet, plausible, and wrong.

## Acceptance criteria

| Gate | Required result |
| --- | --- |
| Stand-in derivation | deterministic output from the electrical model; committed values are a derived artifact compared by content |
| Reduction invariants | every boundary node retained; a component dropped only when no path through it joins two boundary nodes; a branch beyond an ideal short treated as live |
| Boundary equivalence | stand-in and real flat section have equivalent multiport behaviour across the band |
| Isolation | every branch of a disabled stand-in is electrically disconnected; **n-1 links for an n-terminal stand-in**, count derived from topology |
| Composition | all 31 non-empty section combinations pass |
| Control interaction | simultaneous control vectors match the full reference, including the boost-and-cut pairs |
| Frequency contract | the fixture's declared frequency state equals the reference model's; a mismatch fails |
| Integration | all sections present, all links omitted: **strict graph equivalence** with the reference network |
| Documentation | generated link instructions agree with the generated layout's connectivity |

## Out of scope

- Resolving the inductor part question. The scaffold surfaces it.
- Selectable stand-in capacitors. Noted as an option above; not designed here.
- Any PCB form of the scaffold. This is a perfboard-era piece, like the sections it serves.
- Compensating for anything other than an absent section's flat state. A scaffold does not
  emulate a section being *present and set somewhere* - only absent.
