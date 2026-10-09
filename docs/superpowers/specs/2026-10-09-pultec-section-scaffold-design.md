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

At the reference flat settings - low frequency 100 Hz, high frequency 5 kHz, mid 1 kHz.

**This table is CHECKED AGAINST THE DERIVATION, not hand-maintained.** It is prose for a
reader; the authority is `allStandIns()` and its committed artifact
`circuits/pultec/generated/scaffold.json`, regenerated and compared by content on every run.
The "Parts" column is the component count the derivation actually yields, and
`tests/board/scaffold-equivalence.test.ts` pins the entries a change could quietly move. If
this table and the artifact ever disagree, the artifact is right and this table is stale.

| Absent section | Stand-in | Between | Parts |
| --- | --- | --- | --- |
| hi-boost | a 0-ohm arm in series with 47k - presents 47k | `in` - `hi_boost_out` | 2 |
| hi-cut | a 0-ohm arm, then 4k7 **in parallel with** (430R + 47nF) | `hi_boost_out` - `lo_boost_in` | 4 |
| low-cut | a wire (0 ohms) | `hi_boost_out` - `out` | 1 |
| low-boost | 56k, **and** a 0-ohm shunt | `lo_boost_in` - `out`, and `lo_boost_in` - ground | 2 |
| mid | 100k, **and** a 0-ohm arm + 25.3nF + 1H + 4k7 in series | `in` - ground, and `hi_boost_out` - `in` | 6 |

Fifteen components in total. The 25.3 nF is the 22 nF and 3.3 nF of mid's 1 kHz position in
parallel; the 1 H is its `L_MID_1H` tap; the 4k7 is `R_MID_BOOST`. The 0-ohm branches here
are **circuit elements** - the pot arms that flat resolves to a short - and are not to be
confused with the removable isolation links of the next section, which are configuration
hardware. They are carried as components with both of their nets, never as node merges, for
the reasons under Reduction below; that is why hi-boost is two parts rather than one and mid
is six rather than five.

**What is NOT in the table is as derived as what is.** hi-boost's 0.3 H tap, `R3`, `RV_HI_Q`
and `C16` form a loop from `in` back to `in` across that 0-ohm arm, and low-cut's `C4` and
low-boost's `C21` each sit directly across one, so all six carry no current and the reduction
drops them. An earlier implementation decided liveness on the raw graph, where an ideal short
reads as an ordinary edge rather than as one electrical node, and kept all six - which put an
inductor with no part number on the scaffold's parts list for a dead branch.

### The rule that composes

**Fit the stand-in for a section if and only if that section is absent.**

That is the electrical rule, and it is local: whether a section's stand-in belongs in a
build depends only on whether that section is present, never on which others are. Its effect
is that the ladder is always whole - every element present, as the real section or as its
flat-state equivalent - so every present section sees the source and load impedances it would
see in the full EQ. This is what Gate B proves across all 31 combinations.

**One thing it does not settle: WHICH present board fits the group.** With the scaffolding on
the section boards rather than on a board of its own, "fit hi-cut's stand-in" has to name a
board when two or more are built, or two boards fit it and put it in parallel. That is a
build-instruction question, not an electrical one - the electrics are indifferent to which
board a part sits on - and it is answered under **Exactly one supplier per absent section**
below.

### Where the scaffolding lives: on each section board

**Every section board carries its own scaffolding.** One board, configured at build time,
either stands alone or joins one or more others. That is what modular means here, and it is
the owner's requirement rather than a conclusion drawn from the electrics.

An earlier revision of this document argued the opposite - one separate scaffold board - and
gave three reasons. Two were weak and one was a real problem used as an excuse to avoid
solving it:

- *"There is exactly one of each stand-in."* The real problem, and the only one worth
  anything: if low-boost carries a stand-in for hi-cut and low-cut carries one too, building
  those two without hi-cut puts two hi-cut stand-ins in parallel and quietly halves a value.
  That is a build-instruction problem, solved below, not a reason to centralise the parts.
- *"The section boards stay electrically transparent."* This never applied. The transparency
  guarantee is about `physicalOnly` parts, which must add no connection; a stand-in is an
  ordinary conducting component that happens to be temporary. Nothing in `projectPhysical`
  needs changing either way.
- *"It is honest about what it is."* Answered by labelling, not by location. See **Build
  legibility**.

#### Exactly one supplier per absent section

For any build, each ABSENT section's stand-in is fitted on exactly one PRESENT board, and the
generated wiring guide states per configuration which board fits what. Standalone, one board
fits all four other groups. With low-boost and low-cut both built and hi-cut absent, one of
them fits hi-cut's group and the other fits none of it.

**The rule, stated rather than implied:** sections have a canonical order, taken from their
position along the ladder -

1. hi-boost (`in` to `hi_boost_out`)
2. hi-cut (`hi_boost_out` to `lo_boost_in`)
3. low-cut (`hi_boost_out` to `out`)
4. low-boost (`lo_boost_in` to `out`)
5. mid (bridges `in` and `hi_boost_out`)

- and every absent section's group is fitted on **the first present board in that order**.
"Deterministic" on its own was not a specification: an assignment that depended on object
iteration order would be stable until something unrelated reordered it. The bus is what makes
the choice free electrically - every board sees every ladder net - so the ordering only needs
to be fixed and legible, not clever.

One consequence to know before building: the assignment is stable only while boards are added
LATER in the order. Build low-boost alone and it hosts all four groups; add hi-boost
afterwards and hi-boost becomes the supplier, so those parts move. No derivable rule avoids
this - "whichever board you built first" is not a property of the circuit - so the guide
states the assignment for the configuration in front of you and the move is visible as a diff
between two guides rather than a surprise at the bench.

The assignment is computed, never remembered, because remembering it is exactly the failure
that would halve a value invisibly.

#### One layout per board, and placement is the switch

**There is one layout per section board, and it never varies.** It always carries its own
parts, the footprint positions for the other four sections' stand-ins, and one junction. A
build configures the board by **populating those positions or leaving them empty**, and by
wiring the junction across to another board or leaving it unwired. The copper is identical
either way.

So there are no removable links anywhere in this design. Placement is the switch. An earlier
revision specified seven two-pad links with an `n-1` rule for multi-terminal stand-ins, and
all of it is deleted: a group that is not fitted needs no leg broken, because its parts are
not on the board. The consequence, accepted deliberately: changing a board's configuration
after it is built means desoldering a group, not pulling a link.

#### The junction is a stacking 2x05 bus

The five ladder nets are common to every board by construction - that is why the sections
interact at all - so the interconnect is a **shared bus**, not a choice among topologies. A
star or a daisy chain would impose a hub or an order on nets that are genuinely shared, and
buy nothing.

**The boards stack.** Each carries one 2x05 junction at 2.54 mm, the stripboard grid, fitted
with a stacking (long-tail) header: pins below, socket above, so an assembled stack carries
every net up through it. The footprint is the same two rows of five holes a plain
`PinHeader_2x05_P2.54mm_Vertical` describes - a stacking header differs in the part, not the
pads - so the layout does not change with the choice, and a bench build can still use a
ribbon socket or individual leads on the same pattern before anything is stacked.

Pinout, with a ground return beside each signal:

| Pin | Net | Pin | Net |
| --- | --- | --- | --- |
| 1 | `in` | 2 | `0` |
| 3 | `hi_boost_out` | 4 | `0` |
| 5 | `lo_boost_in` | 6 | `0` |
| 7 | `out` | 8 | `0` |
| 9 | `0` | 10 | `0` |

All five nets appear on every board's junction, not only the ones the bare section touches:
populate hi-cut's and mid's stand-ins on low-boost's board and it gains `hi_boost_out` and
`in`, which the section alone never names. That uniformity is what makes the bus work and
what makes any present board able to host any absent section's group.

The interleaved grounds are not only a ribbon convention. These are high-impedance nodes,
47 k to 470 k, and `in` and `out` would otherwise run adjacent with nothing between them -
a feedback path, and the same concern the parent design's input/output separation rule exists
for. In a stack the same reasoning applies to the pin field rather than to a cable.

**A 1x05 screw terminal is NOT compatible, and an earlier revision of this document claimed
it was.** The claim rested on pin pitch alone: a 2.54 mm 1x05 block's pins do match one row
of the header. Its BODY does not - `TerminalBlock_Xinya_XY308-2.54-5P_1x05_P2.54mm_Horizontal`
measures 14.20 by 7.50 mm and reaches about 3.9 mm to one side of its pin row, where the
header's second row is 2.54 mm away, so the body overhangs it by roughly 1.4 mm. Matching
pitch is not mechanical compatibility, and the two are easy to confuse into a claim that
survives review. Stacking settles it regardless: a screw terminal cannot be stacked through.

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
no elimination of internal nodes. The result is already small - **one, two, two, four and six
components for low-cut, hi-boost, low-boost, hi-cut and mid respectively, fifteen in all** -
because flat is degenerate, so there is nothing to gain from reducing further and a whole
class of impedance-altering bugs to avoid. A stand-in that is literally a subset of the
section's own flat-state components cannot differ from it.

**"On a path" means a SIMPLE path, and between two distinct ELECTRICAL nodes.** Both
qualifiers were learned the hard way and neither is decoration:

- *Simple.* Two capacitors in parallel on a dead-end selector throw each reach the boundary
  **through the other**, by a route that leaves a node and comes back to it. That is a cycle,
  carrying no current, and an implementation that asked only "can each end reach a boundary
  node" kept both.
- *Electrical.* An ideal short makes its two graph nodes **one electrical node**, so a loop
  closed through a short reads as a path on the graph while conducting nothing. Deciding
  liveness on graph nodes kept six of the Pultec's twenty-one derived components, hi-boost's
  dead 0.3 H branch among them. So for the component under test, merge every **other** ideal
  short into electrical nodes, then require that component to span two distinct electrical
  nodes and to lie on a simple path between two distinct boundary electrical nodes. **Never
  merge through the component under test**: low-cut's 0-ohm arm *is* its stand-in and is
  precisely what makes `hi_boost_out` and `out` one node, so merging through it would make it
  a self-loop and delete the section's only component.

This is a statement about how liveness is COMPUTED and leaves the next rule untouched: the
stand-in that comes out still carries every surviving 0-ohm component with both of its
distinct nets.

**Ideal shorts are components, never node merges - IN THE OUTPUT.** A pot arm that flat
resolves to 0 ohms is emitted as a zero-ohm component carrying both of its distinct nets. It
must not be collapsed by merging its two nodes, for two reasons: the branch beyond a short is
live, not floating - the omission that made the earlier design wrong - and merging would
destroy a stand-in outright. Low-cut's entire stand-in *is* a short between `hi_boost_out` and
`out`; merge those nodes and there is nothing left to make removable, and the terminal count
collapses from two to one.

This rule governs what a stand-in CONTAINS, not how liveness is computed, and the two must be
kept apart. The liveness test above reasons over electrical nodes precisely BECAUSE a short is
electrically a merge; it still never rewrites one. Conflating the two cost this design twice -
once in the reduction, where a loop through a short read as a current-carrying path, and once
in the boundary-admittance guard, where an ideal short was approximated by a 1e12 S
conductance and the Schur complement then lost the 47k it was measuring: `g = 2.1e-5` falls
below one ulp of `1e12`, so the result collapsed to exactly zero. The guard therefore merges
shorts too, and **refuses** rather than returning a number when ideal shorts join all of a
network's boundary nets into one node - which is low-cut's stand-in, whose only coverage is
therefore the exact structural gate A1.

Invariants the derivation must hold, and test:

- every externally shared node, ground included, is a node of the stand-in;
- a component is dropped only if no **simple** path through it joins two distinct boundary
  **electrical** nodes;
- a branch reachable **beyond** an ideal short is **not** floating; a branch **across** one
  is inert and is dropped;
- no two distinct nodes are merged **in the output**, whatever the impedance between them.

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

**Gate C - integration, and it must run on the layout, not only the model.** With all five
sections built and no stand-in group populated on any of them, the recovered graph must be
**strictly equivalent** to the reference network. Not "the scaffolding measures as inert" -
graph equivalence.

The graph under test is the one **derived from the physical layout**: the netlist exported
from the five boards' perfboard layouts plus the junction wiring between them, with each
board populated as built. A model-only version of this gate would prove
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

**The boundary Gate C's deadness property is asked against is the scaffold's own, not the
reference network's three declared ports.** The scaffold crosses five nets, two of them
interior ladder nodes (`hi_boost_out`, `lo_boost_in`), and a leak confined to those two joins
no two of `{in, out, 0}` - so a gate boundaried on the reference's ports reports an empty live
set and passes. That is not hypothetical: the isolation defect that forced this revision is
invisible for low-cut under the narrow boundary and caught under the wide one, and was found
for mid only because mid happens to bridge `in` and ground. The boundary must be **derived
from the resolved scaffold-only network** rather than listed: `lo_boost_in` is merged away by
a closed selector contact and resolves to `j10_p4`, so a hardcoded pre-resolution list is
itself wrong, and a derived set grows exactly when the defect it hunts is present.
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

So each board must **declare which setting its stand-ins emulate**, and the 0.00 dB result
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

It is the **only** such part the scaffold needs - mid's `L_MID_1H` is the one inductor in all
fifteen stand-in components - and that is a derived fact, asserted in
`tests/board/scaffold-equivalence.test.ts` rather than assumed. It very nearly was not: an
earlier reduction kept hi-boost's `L_HI_BOOST_300MH` on a branch that carries no current, so
the parts list asked a builder to source a second unobtainable inductor for a dead loop. A
reduction that starts keeping dead reactive branches again would quietly put it back, which
is why the count is pinned rather than described.

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

`lib/board/scaffold/index.ts` takes a section and a flat control state, resolves it,
**applies the boundary-preserving reduction specified under Reduction above**, and returns
the stand-in network together with its discovered boundary nodes. The committed values are
then a derived artifact, regenerated and compared by content like every other.

It returns no isolation points. An earlier revision derived them for the removable links,
with a rule about breaking all but one external terminal per connected piece; placement
replaced the links, so that derivation is deleted rather than kept for a mechanism nothing
uses.

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

The configuration must be readable off the hardware, and with placement as the switch the
thing to read is which positions are populated and why.

- Each stand-in group is labelled with the section it stands in for, so an unpopulated group
  reads as a deliberate choice rather than a missing part. This is what carries the weight
  the separate board was claimed to carry: a labelled group nobody mistakes for part of the
  circuit, on the board that needs it.
- Each board's silkscreen states the frequency setting its stand-ins emulate, because that
  is the limit most likely to be forgotten and the one that looks like a circuit fault
  rather than a configuration error. Up to 3.71 dB rides on it.
- The generated wiring guide lists, per configuration, which groups to populate on which
  board and which junction pins to wire - including the deterministic choice of supplier
  when two or more boards are present.

**The wiring guide is a verified artifact, not prose beside the design.** It is generated
from the same model the stand-ins come from, and a test asserts its instructions match the
connectivity of the generated network. Without that it becomes a second, independently
maintained description of the same facts, and the drift would appear as a builder following
correct-looking instructions onto a wrong board. The repository already holds guides this
way: the wiring-sync test is deliberately read-only and content-compared, because an earlier
version rewrote the files it was checking and then passed.

The guide exists because a layout does not say that `C1` is 100 nF. A scaffolding scheme
that does not say which groups to populate has the same defect and a worse failure mode:
two boards each fitting the same absent section's group put it in parallel and halve a
value, which is quiet, plausible and wrong.

## Acceptance criteria

| Gate | Required result |
| --- | --- |
| Stand-in derivation | deterministic output from the electrical model; committed values are a derived artifact compared by content |
| Reduction invariants | every boundary node retained; a component dropped only when no simple path through it joins two distinct boundary electrical nodes; a branch beyond an ideal short treated as live, a branch across one as inert; no node merged in the output |
| Boundary discovery | the boundary is every externally shared node including ground, discovered from the model, never inferred from the named ladder nodes |
| Structural equivalence (A1) | the stand-in is a subset of the section's flat-resolved live components, with identical boundary node identities; exact, no tolerance. Subset alone is NOT sufficient - a reduction that wrongly DROPS a live component is still a subset - so A1 is paired with the oracle row below |
| Liveness oracle | an independent brute-force search for a simple path between two distinct boundary electrical nodes through each component, written without reference to the production implementation, agrees with `reduceToBoundary` on every component of every section and on randomised networks containing ideal shorts, parallel edges and self-loops. Restating the liveness predicate as its own acceptance criterion would be circular; only an independently derived answer catches over-dropping |
| Numerical equivalence (A2) | boundary admittances agree to relative `1e-9` with a `1e-15` S floor, real and imaginary parts, 24+ points per decade over 20 Hz - 20 kHz. Ideal shorts are merged into electrical nodes, not approximated |
| Short-circuit partition | the stand-in and the original flat section induce the SAME partition of boundary nets into short-circuit equivalence classes, asserted for every section. This is the general property; low-cut's exemption from numerical comparison is then a consequence of it rather than a carve-out - its two boundary nets fall in one class, so no finite admittance exists between them, the guard refuses, and the admittance comparison runs over whatever independent classes remain |
| Exactly one supplier | for every build, each absent section's stand-in is fitted on exactly one present board, chosen deterministically and stated in the generated guide; two boards fitting the same group is a defect the guide must make impossible to reach by following it |
| One layout per board | the layout is identical for every configuration; a configuration differs only in which positions are populated and whether the junction is wired |
| Junction | one 2x05 at 2.54 mm per board, same pads on every board, carrying all five ladder nets with interleaved ground returns. Fitted with a stacking header so boards stack and the nets form a shared bus; a ribbon socket or individual leads work on the same pads for a bench build. A 1x05 screw terminal does NOT fit - its body overhangs the second row |
| Composition | all 31 non-empty section combinations pass, to `1e-6` dB on unrounded values |
| Control interaction | simultaneous control vectors match the full reference, including the boost-and-cut pairs |
| Frequency contract | the fixture's declared frequency state equals the reference model's; a mismatch fails |
| Integration | all five sections built with no stand-in group populated on any board: **strict graph equivalence** with the reference network. Required on the model, and again on the graph derived from the physical layouts - see the two milestones below |
| Documentation | the generated guide's population and junction-wiring instructions agree with the generated network's connectivity, including which board supplies each absent section's group |

## Two milestones, and only the first is reachable now

The acceptance criteria above mix two kinds of claim, and an earlier revision demanded
layout-derived verification in the table while excluding it under Out of scope. That
contradiction is resolved by naming the halves:

**S0-model — reachable now, and complete when every row above except Integration's second
clause passes.** Stand-in derivation, boundary discovery, the reduction invariants and the
liveness oracle, structural and numerical equivalence, the short-circuit partition property,
composition across all 31 combinations, control interaction, the frequency contract, supplier
assignment, and the generated population and wiring instructions. None of it needs a layout.

**S0-physical — blocked on layouts that do not exist.** The layout-derived Integration check,
and assembly checks on a built stack. This needs all five VeroRoute layouts redrawn, which is
the human designer's work.

**S0 is not "accepted" until both are done.** Reporting the model milestone as completion of
S0 would be the same failure the Integration row guards against: a check that cannot run
looking like one that passed.

## Out of scope

- **Reducing the per-board part count by any means** - a scaffold daughterboard per section,
  a plug-in module, or reserving fewer positions. The owner's requirement is that each board
  carry its own scaffolding and be configurable at build time to stand alone or join others,
  and that is a decision taken rather than a conclusion drawn from the electrics. The cost is
  real and worth stating plainly: every board reserves positions for roughly thirteen parts it
  populates only when standing alone, so the design optimises the standalone case at the
  expense of the complete assembly, which populates none of them. Recorded as accepted, not
  overlooked.

- Resolving the inductor part question. The scaffold surfaces it.
- Selectable stand-in capacitors. Noted as an option above; not designed here.
- Any PCB form of the scaffold. This is a perfboard-era piece, like the sections it serves.
- Compensating for anything other than an absent section's flat state. A scaffold does not
  emulate a section being *present and set somewhere* - only absent.

- **The layout-derived half of Gate C.** `tests/pultec/scaffold-integration.test.ts` checks
  the model-side claim this document calls non-negotiable: with all five sections present and
  no stand-in group populated, the recovered network is strictly equivalent to
  `THREE_BAND_REFERENCE` -
  exact, no tolerance, proven both ways (every scaffold-originated component is dead, and the
  live subgraph matches the reference's by id, kind, parameters and nets). What it cannot
  check is the other half Gate C asks for: the SAME claim on the graph **derived from the
  physical layout** - the netlist exported from the five boards' perfboard layouts plus the
  junction wiring between them, as built. That half stays owner-blocked on one thing:

  **A VeroRoute layout for each section board, redrawn.** Moving the scaffolding onto the
  section boards changes every one of them. low-boost's committed layout is now stale twice
  over: it holds 9 parts where the board needs roughly 22 plus the stand-in positions, and
  it places a 5.08 mm terminal block where the junction is now a 2x05 header. The other four
  sections were never drawn. Placing and routing them is the human designer's work, per this
  repository's division of labour - an agent does not lay out a board - and only then does
  `make check`'s netlist-export-and-compare machinery have layouts to run the comparison
  against.

  The withdrawn `boards/pultec-scaffold/perfboard.json` is no longer a prerequisite for
  anything: there is no separate scaffold board to declare. The designator problem that
  blocked it disappears with it, because every stand-in part now sits on a section board
  whose designators are already facts about the vendored Pultec schematic.

  Until the layouts exist, the model-side test above is what verifies this claim, and it says
  so in its own header comment rather than silently standing in for the layout-derived half.
