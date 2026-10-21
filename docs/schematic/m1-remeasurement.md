The M1 re-measurement: the spikes' figures re-taken on the real pipeline
========================================================================

Task 17 of the M1 schematic-authoring plan, 2026-10-20.

**WHAT THIS DOCUMENT IS.** Two spikes measured this generator's layout quality
before the generator existed:
[`elk-spike.md`](elk-spike.md) on whole circuits and
[`elk-block-spike.md`](elk-block-spike.md) on declared blocks. **Both drove ELK
through `netlistsvg` at `d3518f1` with its pinned `elkjs` 0.7.1, and this
generator does not** - so two contaminations are cleared here rather than one:

1. **no template was in the loop** (spec §5.6), which is the gap this task was
   written for;
2. **a front end this generator will not use was in the loop** - port glyphs
   were `netlistsvg`'s 30x20 `inputExt` cells, the congruence formula
   `6*len(id) + 5` was its 10 px monospace font metrics, and `direction=DOWN`
   was its analog skin's setting, none of them ELK's
   (`../known-gaps.md` **G180**).

**The spikes' RATIOS survive and their ABSOLUTES do not**, because a ratio taken
under identical conditions on both sides is unaffected by a skin that inflates
both.

**WHAT THIS DOCUMENT IS NOT: an acceptance.** Spec §3.3 gives the four measures
no threshold - *"no published source anywhere states an acceptable number of
wire crossings, bends or wire length"* (**G71**) - and revision 4 adds that
absent a dominance rule they are descriptive. **Every figure below that came out
unfavourably is recorded as a finding and nothing was changed to improve one.**

**WHERE THE FIGURES COME FROM, AND HOW TO RE-RUN THEM.** Every number is
produced by committed code and asserted by a committed test, which is
**G209**'s lesson applied (*"round 1's figures were computed in a scratch script
and were the only number in these entries nobody else could reproduce"*):

```
bun tools/schgen/remeasure.ts            the per-block table, and BLOCK_SIZE
bun tools/schgen/remeasure-ceiling.ts    the ceiling's shape and the floor's basis
bun tools/schgen/remeasure-composed.ts   the integrated experiment
bun tools/schgen/remeasure-edges.ts      the flat probe and G100's edge mechanism
bun tools/schgen/remeasure-criteria.ts   congruence and disjointness
bun test tests/schgen/remeasure.test.ts          the per-block table, step 4, coverage, 3.4
bun test tests/schgen/remeasure-ceiling.test.ts  BOTH BOUNDS, the sweep, and BLOCK_SIZE
bun test tests/schgen/remeasure-edges.test.ts    the flat-against-blocked edge counts
```

**EVERY FIGURE HERE IS CONFIRMED BY THIS WRITER** - run, read and pinned - with
one class of exception, stated once: **every figure attributed to a spike, to
`G94`-`G106` or to `G160`-`G223` is RELAYED**, read out of the named document
while writing `tools/schgen/remeasure-spikes.ts` and not re-executed.

Step 1: the census, re-run with the ELK backend live
----------------------------------------------------

**The template-applicability census is byte-identical to the committed copy.**
`realised` is still **0 of 12** and no block moved to `refused`. That is the
strongest form the result can take: the census consults `selectRenderer` and the
template registry only, so a working ELK backend cannot move a number in it.

**TWO AXES, AND ONLY ONE OF THEM MOVED.** Five of the twelve declared blocks now
DRAW. **That is the ELK axis.** In the census's vocabulary `realised` means *a
template drew the block*, so a sentence like *"five blocks moved from `elk` to
`realised`"* would be false in its own words. The template axis is 0 of 12 as
declared, and
[`template-parity-anchors.md`](template-parity-anchors.md)'s 2 of 12 is what a
template COULD draw under an anchor nobody declared (**G160**).

| axis | before | now |
| --- | --- | --- |
| blocks drawn by a TEMPLATE, as declared | 0 of 12 | **0 of 12** |
| blocks drawn by a template under a PROBED anchor | 2 of 12 | 2 of 12, unchanged and still not declared |
| blocks the ELK backend DRAWS through every gate | unmeasured before Task 13 | **5 of 12** |
| blocks whose ELK geometry the gates REFUSE | unmeasured | **7 of 12** |

Step 3: the four measures per declared block, and the spike's table beside them
------------------------------------------------------------------------------

**TWO GEOMETRY STAGES, LABELLED PER ROW - ruling R40.** Five blocks have an
`accepted` drawing: canonicalised, snapped, junction-checked and
clearance-checked. The other seven have only `backend-output`: the pre-snap
canonical topology of what `elkjs` emitted, which **is a real measurement of the
router and is not a drawing.** An unlabelled mixture would be the worst of both.

| block | parts | units | placements | graph cells | ports | port-glyph share | stage | bends | bends/edge | crossings | wire length | occupied area | aspect |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ob-buffer` | 9 | 11 | 11 | 14 | 3 | 21.4 % | backend-output | 28 | 0.97 | 7 | 436.80 | 3233.45 | 1.24 |
| `oc-power` | 8 | 8 | 8 | 11 | 3 | 27.3 % | backend-output | 5 | 0.19 | 1 | 163.00 | 1056.00 | 2.64 |
| `oc-audio` | 12 | 14 | 14 | 18 | 4 | 22.2 % | backend-output | 30 | 0.75 | 5 | 636.81 | 4076.47 | 2.20 |
| `oc-sidechain` | 17 | 19 | 19 | 24 | 5 | 20.8 % | backend-output | 27 | 0.55 | 7 | 811.92 | 6638.13 | 1.78 |
| `pt-core` | 24 | 24 | 24 | 26 | 2 | 7.7 % | backend-output | 83 | 1.15 | 78 | 2469.63 | 12668.79 | 1.22 |
| `tp-leg-upper` | 3 | 3 | 3 | 5 | 2 | 40.0 % | **accepted** | 8 | 1.33 | **0** | 48 | 513 | 1.42 |
| `tp-leg-feedback` | 3 | 3 | 3 | 5 | 2 | 40.0 % | **accepted** | 8 | 1.33 | **0** | 48 | 513 | 1.42 |
| `tp-leg-lower-a` | 3 | 3 | 3 | 5 | 2 | 40.0 % | **accepted** | 8 | 1.33 | **0** | 48 | 513 | 1.42 |
| `tp-leg-lower-b` | 3 | 3 | 3 | 5 | 2 | 40.0 % | **accepted** | 8 | 1.33 | **0** | 48 | 513 | 1.42 |
| `tp-leg-collector` | 2 | 2 | 2 | 4 | 2 | 50.0 % | **accepted** | 6 | 1.20 | **0** | 32 | 221 | 0.76 |
| `tp-leg-emitter-bypass` | 2 | 2 | 2 | 6 | 4 | 66.7 % | backend-output | 6 | 1.00 | 0 | 48.40 | 153.60 | 1.10 |
| `tp-stage` | 16 | 16 | 16 | 23 | 7 | 30.4 % | backend-output | 24 | 0.62 | 7 | 375.57 | 2201.61 | 1.30 |

Wire length and occupied area are in grid steps and square grid steps. **A
`backend-output` row's length is fractional because that geometry has not been
snapped to the 1.27 mm grid yet** - the figure is of the router's own
coordinates, and that is what the stage label means.

**THE GATE THAT REFUSED EACH OF THE SEVEN.** Five reach `checkLayout` and fail;
two refuse earlier.

| block | the gate of spec §1.4's realization contract that refused it |
| --- | --- |
| `ob-buffer`, `oc-power`, `pt-core`, `tp-leg-emitter-bypass`, `tp-stage` | obligation 4: `checkLayout` |
| `oc-audio` | obligation 1: snapping collapsed geometry that was distinct before it |
| `oc-sidechain` | obligation 3: one transform, two readers - one port coordinate disagrees |

**THE FIVE ACCEPTED ROWS REPRODUCE G216's TABLE, AND THAT AGREEMENT IS NARROW.**
14 placements and 224 grid steps of wire over the five, the same figures
**G200** carries. Both sides run over the geometry `adaptElkLayoutReported`
returns, which `lib/schgen/elk/adapt.ts` has already canonicalised, so **two
implementations agreeing is a check on the arithmetic and NOT a cross-check of
the geometry** - G216's own correction to its round-1 independence claim, applied
here before the claim was made.

### The spike's §3 table, block by block, with a verdict per figure

**ONLY TWO OF THE FIVE FIGURES ARE THE SAME QUANTITY AT ALL.**
`tools/schgen/remeasure-spikes.ts`'s `comparabilityOf` is the one place that
decides this, and it throws for a measure nothing states a reason for:

| measure | comparable? | why |
| --- | --- | --- |
| `crossings` | **yes, in kind** | both count contacts between segments of DIFFERENT nets. The absolute is contaminated by the skin's node sizes, so a difference is not attributable; the quantity is the same one |
| `aspect` | **yes** | a ratio of two lengths in one unit is dimensionless, so it is the one figure in §3's table whose unit survives the change of frontend |
| `bendsPerEdge` | **NO** | **G220**, measured: the spike divides ELK's `bendPoints` by ELK's own spanning-chain edge count and this repository divides bends by maximal POLYLINES. The two agree only for a two-terminal net |
| `wireLength` | **NO** | the spike's unit is the skin's pixel and this repository's is the 1.27 mm grid step, and the two geometries are not one drawing at two scales |
| `bends` | **NO** | the spike published no bend COUNT, only the per-edge ratio |

| block | spike row | spike crossings | M1 crossings | verdict | spike aspect | M1 aspect | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `oc-power` | `oc-power` | 0 | **1** | **moved** | 3.11 | 2.64 | moved |
| `oc-audio` | `oc-audio` | 28 | **5** | **moved** | 1.48 | 2.20 | moved |
| `oc-sidechain` | `oc-sidechain` | 20 | **7** | **moved** | 1.81 | 1.78 | moved |
| `tp-leg-upper` | `leg-upper` | 0 | 0 | **reproduced** | 1.86 | 1.42 | moved |
| `tp-leg-feedback` | `leg-feedback` | 0 | 0 | **reproduced** | 2.05 | 1.42 | moved |
| `tp-leg-lower-a` | `leg-lowerA` | 0 | 0 | **reproduced** | 1.99 | 1.42 | moved |
| `tp-leg-lower-b` | `leg-lowerB` | 0 | 0 | **reproduced** | 1.99 | 1.42 | moved |
| `tp-leg-collector` | `leg-collector` | 0 | 0 | **reproduced** | 1.11 | 0.76 | moved |
| `ob-buffer`, `pt-core`, `tp-leg-emitter-bypass`, `tp-stage` | **none** | - | - | **no spike row** | - | - | - |

**A block with no spike row is NOT compared against a nearby one**, which the
brief requires in terms. The four orphans hold 9, 24, 2 and 16 parts and the
spike's table has rows at 9, 2 and 17 parts, so a *nearest size* rule would have
found a partner for three of them. It would have been comparing different
circuits.

**The part counts agree on all eight mapped rows** - 8, 12, 17, 2, 3, 3, 3, 3 -
and that agreement is a check that could have failed: a re-partition between the
spike and Task 9's declaration would have moved one.

### Step 3's mechanism: the decomposition ADDS edges on this backend

**G100** explains its 6.1x crossing reduction by *"the three blocks carry FEWER
EDGES THAN THE WHOLE - 96 against 139"*, and **G105** turns the 43 missing edges
into the bound. **Re-taken here, and it is backwards:**

| circuit | genuinely FLAT | its declared blocks | ratio | direction |
| --- | --- | --- | --- | --- |
| `optical-compressor` | 43 nodes, **69 edges** | 3 blocks, 53 nodes, **72 edges** | **0.958x** | **ADDS 3** |
| `transistor-preamp` | 34 nodes, **48 edges** | 7 blocks, 53 nodes, **53 edges** | **0.906x** | **ADDS 5** |

**THE GENUINELY FLAT SUBJECT IS THE CIRCUIT DECLARED AS ONE BLOCK**, so no net is
multi-block and only a rail or an off-sheet net gets a boundary node. **An earlier
version of this document reported 1.000x from a probe that had inherited the
blocked declaration's boundary nodes** - it never rebuilt `Circuit.unitBlock`, so
`labelledNets` still saw the original split. That figure is retained in G100 as a
named subject because it isolates the cancellation exactly; **it is not a flat
baseline.**

**THE PER-NET RULE, AGREEING WITH THE MEASUREMENT ON THREE SUBJECTS.**
`edgesForNet` makes a net of degree n into n - 1 chain edges; under the blocked
declaration a net crossing k blocks is labelled, external in each, and
contributes `(U + k) - k = U`, while under the flat declaration it is internal
unless it is a rail and contributes `U - 1`. **So blocked minus flat is the count
of nets that cross a block boundary and are not rails:**

| circuit | those nets | predicted | measured |
| --- | --- | --- | --- |
| `optical-compressor` | `OUT_PRE`, `VBIAS`, `VBIAS_RAW` | 3 | **3** |
| `transistor-preamp` | `BASE`, `BYPASS_CAP`, `BYPASS_JUMPED`, `COLLECTOR`, `EMITTER` | 5 | **5** |
| the five-leg union | none | 0 | **0** |

**That a cross-block net is always labelled is `lib/schgen/ir/classify.ts:47` and
not a measurement**, so the edge addition is a consequence of this generator's
labelling rule rather than of decomposition as such. Whether that rule is right
is a generator design question this task does not answer.

**The absolute counts are not set beside 139 and 96.** The spike's edge count
came out of `netlistsvg`'s converter and nothing establishes that it builds a
net's edges the way `graph.ts` does. What is the same CLAIM is *"decomposition
hands ELK a smaller graph"*, and the measurement refutes it in direction.

**This is the one part of the paired control that needs no drawing**, which is
why it could be re-taken on `optical-compressor` although none of its three
blocks draws.

Step 4: the integrated experiment
---------------------------------

**THE SUBJECT IS NOT THE ONE THE BRIEF NAMES, AND THE SUBSTITUTION IS CONTROLLER
RULING R38.** The brief's mechanism is `optical-compressor` at the equivalent of
`v-bare`, *"because both ends of the comparison already exist"*. All three `oc-*`
blocks are among the seven the gates refuse, so there is no composed side to
measure. R38: *"the subject becomes the sub-circuit induced by the blocks that
actually draw - at HEAD, the five transistor-preamp legs. Measure BOTH ENDS
HERE."*

**FOUR THINGS THAT TRAVEL WITH EVERY FIGURE IN THIS SECTION:**

1. **the spike's 6.1x is NOT RE-DERIVABLE on this subject and is reported
   NOT-COMPARABLE.** It is not approximated, not scaled, and no *"fraction of
   6.1x survived"* is computed against a different circuit;
2. **the flat side is a SUB-CIRCUIT**, five of `transistor-preamp`'s seven
   declared blocks. A composed-against-flat comparison over a five-block subset
   of one circuit family is a much narrower claim than the brief anticipated;
3. **there is NO template in this comparison.** G105's criterion asks for *"both
   template-drawn and ELK-drawn blocks"*; as declared the templates draw 0 of
   12, so the composed side is five ELK blocks. **That half of the criterion is
   not met**, and saying so is the result;
4. **a result below 1x would be a legitimate outcome** - a finding about seam B
   rather than a failure of the measurement.

### The flat side REFUSES, and that refusal is the result

The five legs' members as ONE graph, through the same
`elkInputOf` -> `layoutBlocks` -> `adaptElkLayoutReported` chain every declared
block goes through:

> **REFUSED** by `lib/schgen/elk/adapt.ts`, spec §1.4's realization contract,
> **obligation 2**: *"block `tp-drawing-legs~flat`: the junctions the sheet
> emitter would place disagree with the branch points of the canonical topology
> in 1 place(s). For template geometry `junctionPoints` is cosmetic; for ELK
> geometry it is not, because a branch point with no junction is a connection
> KiCad does not make (spec 1.4 obligation 2). net BASE branches at (45.72,
> 48.26) (t-junction) and no junction is emitted"*

**So the accepted-stage comparison has only one side.** The flat probe is a
measurement subject and declares nothing: `flatSubgraphOf` builds one
`BlockSubgraph` over the union of five declared blocks' members, writes no file
and no declaration, and emits nothing. It is the posture **G160** states for the
anchor sweep: a brute-forced subject *"chooses no arrangement, writes no
declaration and emits nothing, so it is a measurement rather than an authored
criterion."*

### Both ends, side by side

| | stage | placements | wires | nets | bends | bends/edge | crossings | wire length | occupied area | aspect |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **flat, one graph** | accepted | - | - | - | - | - | - | - | - | - |
| **flat, one graph** | backend-output | 14 | 73 | 13 | 38 | 1.03 | **1** | **360.20** | 6180.28 | 1.15 |
| the five blocks, summed | backend-output | 14 | - | - | 38 | - | **0** | **227.60** | - | - |
| the five blocks, each | accepted | 14 | 67 | - | 38 | - | **0** | **224** | - | - |
| **composed by seam B** | accepted | 14 | 67 | 13 | 38 | 1.31 | **0** | **224** | 7038 | 3.33 |
| **the crossing RATIO of the two ends** | - | - | - | - | - | - | **NOT TAKEN** | - | - | - |

**THE CROSSING RATIO IS A ROW THAT SAYS "NOT TAKEN" RATHER THAN A ROW THAT IS
MISSING, and the reason is in the table above it: the composed side measures
ZERO crossings, so there is no denominator.** A ratio there would have had to be
written as infinite, or capped at some number nobody measured, and either would
have been a fabricated headline for the one experiment this task exists to make
possible. **What there is instead is the two figures** - 1 crossing flat against
0 in blocks, at the one stage where both sides have a figure - and the wire ratio
below, which does have a denominator.

- **the composed row reproduces G200's and G209's own figures** - 14 placements,
  67 segments, 224 grid steps - which is the strongest evidence available that
  the seam-B path and the block path have not diverged;
- **seam B adds no crossing and no wire**: inter-block crossings **0**,
  inter-block wire length **0**, frame overlaps **0**. That is **G208** re-taken,
  and G208's own trap is named with it: *"seam B adds no crossings is true of
  THIS generator because this generator joins blocks with labels rather than
  with wires"*;
- **the only stage-matched comparison is the `backend-output` pair**, and on it
  the flat graph has **1 crossing against the blocks' 0** and **360.20 grid steps
  of wire against 227.60** (1.58x). The bend count is **38 on both sides**;
- **the crossing ratio is NOT TAKEN, because the blocks measure zero.** There is
  no denominator. That is a result about this subject - the decomposition
  removes the single crossing the flat graph has - and not a figure that was
  left out;
- the composed sheet's frame-inclusive extent is **203.20 x 81.28 mm, 2.50:1**,
  packed by the ELK packer. **It moves with the packer** (**G207**: 185.42 x
  38.10 against 109.22 x 71.12 mm for identical content) and is therefore not
  compared against anything.

**WHAT THIS EXPERIMENT ESTABLISHES, said plainly.** On a five-block subset of one
circuit family, at the one stage where both sides have a figure, decomposition
removes 1 crossing and 1.58x of the wire (360.20 grid steps against 227.60), and
composition spends none of that
back. **It is a much smaller subject than the 37-part paired control the bound
was stated on, and a reader must not carry this ratio to that circuit.** When
more blocks draw, this is the measurement to re-take.

Step 5: the ceiling's shape, and the floor
------------------------------------------

**THE CEILING IS 3 PLACEMENTS ON THIS PIPELINE, AND IT IS NOT 9.**

The sweep: every declared block laid out in four declaration orders - permuting
`g.units`, which is exactly **G95**'s *"reordering the `.capacitor(...)` calls"*
reached at the one place this pipeline exposes it - with the inter-net crossing
count measured in each. The permutations come from a fixed-seed generator, so
re-running gives the same orders.

| block | parts | placements | distinct orders | crossings over those orders | verdict | gates |
| --- | --- | --- | --- | --- | --- | --- |
| `tp-leg-collector` | 2 | 2 | 2 | 0, 0 | **INVARIANT** | accepted |
| `tp-leg-emitter-bypass` | 2 | 2 | 2 | 0, 0 | **INVARIANT** | refuse |
| `tp-leg-upper` | 3 | 3 | 3 | 0, 0, 0 | **INVARIANT** | accepted |
| `tp-leg-feedback` | 3 | 3 | 3 | 0, 0, 0 | **INVARIANT** | accepted |
| `tp-leg-lower-a` | 3 | 3 | 3 | 0, 0, 0 | **INVARIANT** | accepted |
| `tp-leg-lower-b` | 3 | 3 | 3 | 0, 0, 0 | **INVARIANT** | accepted |
| `oc-power` | 8 | 8 | 4 | **1, 3, 2, 2** | MOVES | refuse |
| `ob-buffer` | 9 | 11 | 4 | **7, 7, 4, 8** | MOVES | refuse |
| `oc-audio` | 12 | 14 | 4 | **5, 12, 7, 6** | MOVES | refuse |
| `tp-stage` | 16 | 16 | 4 | **7, 4, 5, 6** | MOVES | refuse |
| `oc-sidechain` | 17 | 19 | 4 | **7, 14, 9, 19** | MOVES | refuse |
| `pt-core` | 24 | 24 | 4 | **78, 53, 39, 65** | MOVES | refuse |

**THE CLEAREST ROW IS `oc-power`: the SAME 8-part block the spike measured at
0, 0, 0, 0 gives 1, 3, 2, 2 here.** The spike's second ceiling measure -
*"inter-net crossings are ZERO on every block of 8 parts or fewer"* - also fails
on it, at 1 crossing in declaration order. So **both of G101's two independent
ceiling measures agree with each other here, as they did there, and both put the
boundary between 3 and 8 rather than at 9.**

**A 2-placement block has only two permutations and a 3-placement block only
six**, so `distinctOrders` is 2 or 3 on the six small rows. That is reported
rather than padded: an invariance over one order would be vacuous.

**PER SIZE, WITH THE SUBJECT COUNT AND HOW MANY ARE REFUSED GEOMETRY - ruling
R40.** Of the seven sizes the spike swept, **five have no declared subject in
this repository at all.** R40 forbids constructing one: *"if no real subject
exists at a size, that size is unmeasured and you say so, per size."*

| size, in placements | subjects here | of which the gates refuse |
| --- | --- | --- |
| 3 | 4 (`tp-leg-upper`, `-feedback`, `-lower-a`, `-lower-b`) | 0 |
| 4 | **UNMEASURED** | - |
| 8 | 1 (`oc-power`) | **1** |
| 9 | **UNMEASURED** | - |
| 13 | **UNMEASURED** | - |
| 17 | **UNMEASURED** | - |
| 28 | **UNMEASURED** | - |

**THE CEILING IS A PROPERTY OF THE BACKEND's OUTPUT AND NOT OF THE PIPELINE's
ACCEPTED OUTPUT.** Of the twelve subjects, seven are layouts the gates refuse,
including the only subject at size 8 - the one that fixes the upper end of the
window. The sweep is taken at the uniform `backend-output` stage on all twelve
precisely so that the stage is not a confound; a sweep over accepted geometry
only would cover five blocks of one circuit family at two sizes.

**AND THE CEILING's OWN SIZE IS THE THIN SPOT, which an aggregate conceals.**
Size 3 - the ceiling itself - has **four subjects that are ONE topology**: the
four bias legs draw byte-identically (**G185**), so they are the same block four
times, and each was swept over **3 of its 6 possible permutations**. Size 2 is
better supported - **two distinct topologies, both swept exhaustively** (2 of 2
permutations) - **but size 2 is not the ceiling.** So the bound's upper edge rests
on one refused layout at size 8 and its lower edge on one topology at half its
permutations. *"Three distinct topologies"* is true of sizes 2 and 3 together and
does not disclose either of those.

Across sizes 2 and 3 together the distinct subjects are *a bias leg*,
`tp-leg-collector` and `tp-leg-emitter-bypass` - three topologies over six
blocks.

### The floor is UNMEASURED, and the reason is that the quantity does not exist

**G101**'s floor rested on `netlistsvg` emitting a 30x20 `inputExt` CELL per
declared port, so *"a 1-part block's drawing was two-thirds boundary"*.
`[RAN]` **All 38 boundary nodes of all 12 declared ELK blocks have width 0 and
height 0.** The worst port-glyph share is `tp-leg-emitter-bypass` at **66.7 %**
of graph cells. **That falls inside the spikes' published 10-67 %, and a RANGE
OVERLAP is all that is** - no per-block share was compared against any spike row,
because the spike's per-block shares are for blocks this repository does not
declare. **And a block whose cells are two-thirds boundary has a drawing with no
boundary AREA at all.**

**So the share is the interface cost's size in the graph ELK solves, which is the
relationship §1.8 revision 4 says to name, and the floor stays unmeasured.** The
earlier reading that *"a floor EXISTS however the boundary is drawn"* was an
argument rather than a measurement, and nothing measured here finds one.

What a small block does still cost is §1.6's cross-sheet mechanism: one global
label or power symbol per crossing net, drawn at the block's own anchor and
therefore inside its own extent (**G208**). That cost is glyphs and eye-travel,
not ink.

### `BLOCK_SIZE`, and what it does not do

```
ceiling: 3           placements, measured here
floor:   "unmeasured"
```

**It is a REPORTING bound and refuses nothing** - plan decision **D1**: the
generator never cuts a block, so a numeric bound that refused one would refuse a
declaration. `blocksOutside` names the six declared blocks above the ceiling -
`ob-buffer`, `oc-power`, `oc-audio`, `oc-sidechain`, `pt-core`, `tp-stage` - and
the generator still draws them.

**THE COST BEING PAID IS THE CEILING's, on 7 of the 12 declared blocks.** Above
the ceiling the measured quality is not a property of the circuit: the crossing
count moves with declaration order by up to **3.0x** (`oc-power`, 1 to 3; the largest
absolute swing is `pt-core`'s 39 to 78). So
§3.3's four measures over those blocks are partly measurements of a
serialization. **The floor's cost is not being paid and cannot be**, because this
backend emits no boundary area for a small block's drawing to be dominated by.

**THE CAVEAT TRAVELS WITH THE FIGURE.** The window comes from 12 declared blocks
of 4 circuits; the invariant side is three distinct topologies; **no declared
block in this repository has more than 24 placements, so nothing above that was
tested at all.** G101's own caveat applies unchanged: the spikes' 18 blocks came
from two unusual parents, a 76-part passive EQ and a 37-part compressor with two
dual op-amps.

**Ruling R39 did not fire.** It widens `ceiling` to `number | "unmeasured"` only
if Step 5 cannot measure one. It could, so the field keeps the plan's `number`.

Step 6: congruence, with the rail glyphs the instances actually get
------------------------------------------------------------------

**G97**'s amendment sets the criterion: *"congruence must be measured with the
rail glyphs the two instances would actually get, because that is what broke it
here, not the topology."* Through `netlistsvg`'s `v-rails` the four legs stopped
drawing alike, because `leg-upper` runs from `VCC` and got a `vcc` glyph while
`leg-feedback` runs from `COLLECTOR` and got none.

**ON THIS PIPELINE THE GLYPH IS NOT A POLICY CHOICE**, which is why the clause is
satisfiable rather than contrived: `subgraphOf` puts every rail the block touches
in `g.rails` with its declared `RailSpec`, and `anchorsToSymbols` turns the
block's own anchors into a power symbol for a rail and a global label for every
other boundary net. **The four legs genuinely differ in what they get:**

| leg | power symbols it draws | global labels it draws |
| --- | --- | --- |
| `tp-leg-upper` | `VCC` / `power:VCC` at (17780, 1270) | `BASE` at (35560, 25400) |
| `tp-leg-feedback` | **none** | `COLLECTOR` at (17780, 1270), `BASE` at (35560, 25400) |
| `tp-leg-lower-a` | `GND` / `power:GND` at (35560, 25400) | `BASE` at (17780, 1270) |
| `tp-leg-lower-b` | `GND` / `power:GND` at (35560, 25400) | `BASE` at (17780, 1270) |

**AND CONGRUENCE HOLDS ANYWAY.** All four legs place their three parts at the
same three points - `jumper` at (7620, 3810), `floor` at (19050, 8890), `trim`
at (25400, 19050), every one at rotation 0 - draw the same wire geometry, and
bring their two boundary nets to the same two anchor points. The jumper-to-trim
displacement is **(14, 12) grid steps on all four**.

**The structural reason, which is why this is not luck:** a boundary net is a
zero-size node in the graph ELK solves, and its glyph is attached at the anchor
the layout has already produced. **A glyph cannot move a layout it is placed
after.** That is the same reason **G185** gives for the same result at node-box
scale; this is it with the glyphs in.

**THE SKIN's FORMULA PREDICTS A SPREAD AND THE MEASURED SPREAD IS ZERO.**
`6 * len(id) + 5` over the four jumpers' semantic component ids -
`upper_bias_jumper` (17), `feedback_bias_jumper` (20), `lower_bias_a_jumper`
(19), `lower_bias_b_jumper` (19) - gives **107, 125, 119, 119**, which the spike
matched *"4 of 4 to the pixel"*. **It predicts the four x offsets DIFFER. They do
not: all four are 14 grid steps.** The formula's absolute output is in the skin's
pixels and is not comparable; the spread it predicts is dimensionless, and it is
**0 of 4** here.

Step 7: disjointness at sheet level
-----------------------------------

**G97**'s flat-scale answer was *no*: the Pultec stand-in group spanned **67 % of
the canvas with 11 non-members inside its box.** Re-taken on the composed sheet,
in that entry's own three columns:

| block | members | its own extent | of the usable A3 canvas | non-members inside it |
| --- | --- | --- | --- | --- |
| `tp-leg-upper` | 3 | 27 x 19 grid steps | **0.90 %** | **0** |
| `tp-leg-feedback` | 3 | 27 x 19 | **0.90 %** | **0** |
| `tp-leg-lower-a` | 3 | 27 x 19 | **0.90 %** | **0** |
| `tp-leg-lower-b` | 3 | 27 x 19 | **0.90 %** | **0** |
| `tp-leg-collector` | 2 | 13 x 17 | **0.39 %** | **0** |

**Frame-box overlaps: 0 under the ELK packer and 0 under the shelf packer.**

And the frame-box reading of the same criterion, `nonMemberContainments`, is
**empty on `mini`'s signal sheet** - with the control that could have failed: a
frame grown to swallow the page reports every symbol that is not its own block's.

**WHY THE SUBJECT IS A PROBE AND NOT A CIRCUIT's OWN SHEET.** `layoutSheet`
realises every block of a sheet, and `transistor-preamp` declares all seven of
its blocks on one sheet, two of which do not draw - so **the circuit's own sheet
cannot be laid out at all** (**G211**). The committed test asserts that it
throws, so the limit is a check rather than a note.

What could not be compared, and why
-----------------------------------

**This section is the point of the document.** A figure that could not be taken
is reported as not taken, per figure, never omitted and never approximated.

| what | why |
| --- | --- |
| **the spike's 6.1x paired control** | all three `optical-compressor` blocks are refused by the gates, so there is no composed side. Ruling **R38** substitutes a five-leg subject and forbids approximating, scaling or computing a fraction of 6.1x against it |
| **the crossing ratio of Step 4's two ends** | the composed side measures **0** crossings. There is no denominator. The flat side's 1 crossing against 0 is reported as the figures, not as a ratio |
| **`bendsPerEdge` against the spikes** | **G220**: two different denominators. 1.33 beside a published 1.72 *"looks like a comparison and is not one"* |
| **`wireLength` against the spikes** | the skin's pixel against the 1.27 mm grid step, with no conversion, because the two geometries are not one drawing at two scales |
| **`bends` against the spikes** | the spikes published no bend count |
| **`occupiedArea` against the spikes** | the spikes published a canvas in pixels and no area. Only its ASPECT survives the unit change |
| **the edge counts 139 and 96** | the spike's edge model is `netlistsvg`'s converter and nothing establishes it is `graph.ts`'s n-1 chain. The RATIO is compared and the absolutes are not |
| **the spike's rows for `standin-low-cut`, `standin-mid`, `standin-hi-boost`, `standin-low-boost`, `standin-hi-cut`, `pultec-low-boost`, `pultec-low-cut`, `pultec-hi-cut`, `pultec-hi-boost`, `pultec-mid`** | ten of the spike's eighteen blocks. Neither Pultec stand-in network is in `PARITY_CIRCUITS` and no authoring file declares either group, so **no block of this repository corresponds to them** and none was substituted |
| **this repository's `ob-buffer`, `pt-core`, `tp-leg-emitter-bypass` and `tp-stage`** | the spikes measured no block that is these blocks. A nearest-size rule would have found a partner for three of the four and would have been comparing different circuits |
| **G97's 67 % of canvas and 11 non-members** | its two subjects are the Pultec stand-in groups, which are not declared here. The disjointness figures above are on a different subject and are not a before-and-after against those |
| **the ceiling at 4, 9, 13, 17 and 28 placements** | no declared block of this repository has those sizes, and ruling **R40** forbids constructing one. Five of the spike's seven sweep sizes are unmeasured here |
| **the four measures of a TEMPLATE-drawn block of this repository** | there are none. As declared the ported templates draw 0 of 12 (**G160**), so spec §5.6's *"templates in the loop"* is cleared only in the sense that the loop now has a template registry in it that declined every block |
| **G94's crash** | not re-measured here. **G185** records 12 of 12 blocks laying out with 0 raises at the pinned `elkjs@0.9.3` and states that this *"is consistent with G94 and establishes nothing about it"*. Task 14 is where that question is settled |

**AND ONE THING THAT CANNOT BE COMPARED AT ALL, which is the largest caveat in
this document.** Spec §5.6's gap is *"ELK draws the subgraph left over AFTER
templates have drawn its neighbours"*. **No template drew a neighbour**, because
no template draws any block of this repository as declared. So the measurements
above are still ELK in isolation plus seam B's composition - which is more than
the spikes had, and less than §5.6 asks for. **The gap narrows and does not
close**, and what would close it is a template that draws one of these blocks,
which is a finding about the template set and not about this task.
