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

**The rule, stated as a construction: for each connected component of a stand-in, isolate all
but one of its distinct external terminals** - ground counting as a terminal. Breaking all but
one leg leaves that component hanging by a single point, connecting nothing to nothing;
breaking only some of them leaves a path. With both the `lo_boost_in` and `out` legs broken,
the same build measures 0.000 dB at every frequency.

Per *connected component*, not per section, and this matters for durability rather than for
today's numbers. A section whose flat state resolves into two unconnected pieces needs each
piece isolated on its own, and a single count applied to the section as a whole would be
wrong. It is also a sufficient rule rather than a proven minimum: a network with redundant
terminal connections might admit fewer points. Deriving it from the connected components of
the resolved network means a change to the electrical model cannot silently invalidate it.

For the five sections as they stand, every stand-in resolves to one connected component, so
the rule yields:

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

**Boundary discovery comes first, and is discovered rather than listed.** The terminal tables
in this document are results, not inputs. A node is a boundary node if it is referenced by
any component outside the section, or is a declared port of the section, **or is ground.**

Ground must be in that set explicitly. Otherwise consider a resistor from a boundary node to
an internal node with a capacitor from there to ground: with ground excluded, no path through
that chain joins two boundary nodes, and a legitimate shunt network is discarded. The two
statements "on a path between two boundary nodes" and "not genuinely disconnected" are **not**
equivalent, and ground in the boundary set is what reconciles them.

The hazard is narrow here but the guard is still worth having. This repository has no implicit
or global nets - ground crosses a composition boundary only as a declared port, and it already
appears on every section board's terminal block - so ground is discoverable rather than
special. An implementation that inferred the boundary from the four named ladder nodes would
nonetheless get this wrong, which is why discovery is specified.

**Then: keep every component on a path between two boundary nodes, and drop only components
that are genuinely disconnected.** No series/parallel collapsing, no star-mesh transformation,
no elimination of internal nodes. The result is already small - three to five components per
section - because flat is degenerate, so there is nothing to gain from reducing further and a
whole class of impedance-altering bugs to avoid. A stand-in that is literally a subset of the
section's own flat-state components cannot differ from it.

**Ideal shorts are components, never node merges.** A pot arm that flat resolves to 0 ohms is
kept as a zero-ohm component and used as an ordinary edge for path-finding. It must not be
collapsed by merging its two nodes, for two reasons: the branch beyond a short is live, not
floating - the omission that made the earlier design wrong - and merging would destroy a
stand-in outright. Low-cut's entire stand-in *is* a short between `hi_boost_out` and `out`;
merge those nodes and there is nothing left to make removable, and the terminal count collapses
from two to one.

Invariants the derivation must hold, and test:

- every externally shared node, ground included, is a node of the stand-in;
- a component is dropped only if no path through it joins two boundary nodes;
- a branch reachable through an ideal short is **not** floating;
- no two distinct nodes are merged, whatever the impedance between them.

**`pruneFloatingBranches` must not be reused here.** It exists to prepare a network for
simulation under one source and load configuration, and a branch irrelevant to that
configuration can matter when a different boundary node is driven by a neighbouring section.
Scaffold derivation needs its own reduction with the invariants above.

### Verification

**The primary criterion is boundary equivalence, not frequency response.** A stand-in's job
is to present the right impedance at the nodes it shares with other sections, and two
networks can agree on one input-to-output transfer function while differing at another
boundary. So:

**Gate A1 - structural equivalence, and it is exact.** Because the reduction only discards
disconnected components, the stand-in must be a **subset of the section's flat-resolved live
components**, with identical node identities on the boundary. That is testable as set
equality, with no tolerance at all, and it is the real guarantee. Specifying it this way keeps
the numerical gate from being load-bearing: there is nothing being fitted, so a tolerance is
never what decides correctness.

**Gate A2 - numerical boundary equivalence**, as a guard against the invariants being
implemented wrongly in a way that still produces a plausible network. For each section, drive
each boundary node in turn with the others held, sweep, and compare boundary admittances
between the stand-in and the real flat section. Specified concretely, because "to tolerance"
decides nothing:

- **Sampling:** 20 Hz to 20 kHz, logarithmically, at least 24 points per decade, plus the
  band edges and each selector's nominal corner frequency.
- **Comparison:** real and imaginary parts of each complex admittance, separately.
- **Tolerance:** relative `1e-9`, with an absolute floor of `1e-15` S so that a near-zero
  admittance cannot fail on relative error alone. These are solver-noise tolerances, not
  perceptual ones - the two networks are structurally identical, so anything above numerical
  noise is a defect.

**Gate B - composition.** For every combination, the composed network's behaviour for each
present section must match `THREE_BAND_REFERENCE` under the same control vector, with absent
sections held at their declared reference-flat settings.

Gate B needs a **looser tolerance than A2, and for a stated reason**: it compares two
different netlists, so matrix ordering inside the solver differs and the results are not
bit-identical even when the circuits are. `1e-6` dB is tight enough to catch any real
electrical discrepancy and loose enough to survive reordering. It is not a perceptual
threshold and must not be relaxed to one.

**Tests compare unrounded values.** Every `0.00 dB` printed in this document is a
two-decimal rendering of a computed figure, and a test asserting on the rendered string would
pass on a 0.004 dB error. The assertions are on the raw numbers against the tolerances above.

Gate B is the secondary check, and it is what the measurements below report.

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

**Gate C - integration, and it must run on the layout, not only the model.** With every link
omitted and all five sections present, the recovered graph must be **strictly equivalent** to
the reference network. Not "the scaffold measures as inert" - graph equivalence.

The graph under test is the one **derived from the physical layout**: the netlist exported
from the perfboard layouts of the section boards and the scaffold board, plus the inter-board
wiring, with the links in their as-built state. A model-only version of this gate would prove
that the intended configuration is right while missing a connection accidentally left in the
layout - and the isolation bug that forced this revision was precisely a
hardware-realization error that the model-side gate would have passed. Checking only the
model here would repeat that mistake in the test suite.

The workflow already supports it: `make check` re-exports each board's netlist from its
source on every run and compares by content, so this is a new comparison over existing
machinery rather than new machinery.

**One limitation, stated because it bounds what Gate C can claim.** A layout exists in one
link configuration at a time, so the layout-derived gate verifies **the configuration as
built** and no other. Coverage of all 31 combinations comes from Gate B, which is model-side.
Neither gate subsumes the other: Gate B covers every configuration but only as the model
believes it to be, and Gate C covers what was actually built but only one configuration of
it.

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

`lib/board/scaffold.ts` takes a section and a flat control state, resolves it, **applies the
boundary-preserving reduction specified under Reduction above**, and returns the stand-in
network together with its discovered boundary nodes and isolation points. The committed values
are then a derived artifact, regenerated and compared by content like every other.

**It does not call `pruneFloatingBranches`.** An earlier draft of this section said it
"prunes floating branches", which read as permission to reuse that function and contradicted
the Reduction section outright. It prepares a network for simulation under one source and load
configuration and is wrong for this purpose.

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
| Boundary discovery | the boundary is every externally shared node including ground, discovered from the model, never inferred from the named ladder nodes |
| Structural equivalence (A1) | the stand-in is a subset of the section's flat-resolved live components, with identical boundary node identities; exact, no tolerance |
| Numerical equivalence (A2) | boundary admittances agree to relative `1e-9` with a `1e-15` S floor, real and imaginary parts, 24+ points per decade over 20 Hz - 20 kHz |
| Isolation | for each connected component of a stand-in, all but one distinct external terminal is broken; the count is derived from the resolved network's connected components, not assumed |
| Composition | all 31 non-empty section combinations pass, to `1e-6` dB on unrounded values |
| Control interaction | simultaneous control vectors match the full reference, including the boost-and-cut pairs |
| Frequency contract | the fixture's declared frequency state equals the reference model's; a mismatch fails |
| Integration | all sections present, all links omitted: **strict graph equivalence** with the reference network, on the graph derived from the physical layout |
| Documentation | generated link instructions agree with the generated layout's connectivity |

## Out of scope

- Resolving the inductor part question. The scaffold surfaces it.
- Selectable stand-in capacitors. Noted as an option above; not designed here.
- Any PCB form of the scaffold. This is a perfboard-era piece, like the sections it serves.
- Compensating for anything other than an absent section's flat state. A scaffold does not
  emulate a section being *present and set somewhere* - only absent.

- **The layout-derived half of Gate C.** `tests/pultec/scaffold-integration.test.ts` checks
  the model-side claim this document calls non-negotiable: with all five sections present and
  every link removed, the recovered network is strictly equivalent to `THREE_BAND_REFERENCE` -
  exact, no tolerance, proven both ways (every scaffold-originated component is dead, and the
  live subgraph matches the reference's by id, kind, parameters and nets). What it cannot
  check is the other half Gate C asks for: the SAME claim on the graph **derived from the
  physical layout** - the netlist exported from the perfboard layouts of the section boards and
  the scaffold board, plus the inter-board wiring, in their as-built state. That half stays
  owner-blocked on two things that do not exist yet, in order:

  1. **A declared scaffold board.** `boards/pultec-scaffold/perfboard.json` was withdrawn
     during this feature's own execution (see `lib/board/scaffold/wiring.ts`'s module
     comment) because a perfboard-driven board needs a physicalization - a `DESIGNATORS` map,
     pad orders, an off-board set, the same contract every section board already supplies
     (`circuits/pultec/physical/*.ts`) - and none exists for the scaffold. It cannot be
     supplied the way the five section boards were: their designators are facts about the
     vendored Pultec schematic, and the scaffold has no schematic to be a fact about.
     Assigning `JP1..JP7` to the links without one would be invented, not derived, and this
     repository refuses to fabricate a designator.
  2. **A VeroRoute layout for that board**, once (1) exists - placed and routed by the human
     designer, per this repository's own division of labour; an agent does not lay out a
     board. Only then does `make check`'s netlist-export-and-compare machinery have a layout
     to run the comparison against, and the layout-derived half of Gate C becomes runnable.

  Until both exist, the model-side test above is what verifies this claim, and it says so in
  its own header comment rather than silently standing in for the layout-derived half.
