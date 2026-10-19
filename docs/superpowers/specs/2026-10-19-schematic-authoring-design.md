---
title: Schematic authoring - the generator, its two seams, and what grades it
date: 2026-10-19
status: draft-for-owner-review
revision: revised 2026-10-19 against an independent third-party review
parent: ./2026-10-08-agent-authored-boards-design.md
---

Schematic authoring
===================

**This is the child spec for sub-project T2** of
[`2026-10-08-agent-authored-boards-design.md`](./2026-10-08-agent-authored-boards-design.md).
It does not re-argue the parent. Where the two disagree, **the parent wins** and
the disagreement is a defect in this document.

**The research this rests on is indexed, with its reliability recorded per pass,
at [`../../schematic/README.md`](../../schematic/README.md).** **Six passes are
indexed there; this spec draws on five of them.** The sixth verified nothing by
running or by reading a primary source, and three of its characterisations have
since been measured false. Read the index before building on any single pass.

Revision 1, 2026-10-19: an independent review, and what it changed
--------------------------------------------------------------------

**This document was reviewed by a third party that did not write it, and this
section records that the review happened and what it moved.** It is here rather
than folded silently into the text because this repository shows a corrected
claim as corrected (`CLAUDE.md`, and the parent's own *"Correction,
2026-10-19"*).

**The reviewer approved the architecture** - the port plus two ELK seams, the
link-by-link derivation chain, and the refusal to invent a numeric readability
threshold. It raised **eleven findings**: three blocking, the rest high, medium
or corrections. The controller re-measured the checkable ones and accepted
essentially all of it.

| # | Finding | How this revision resolves it | Where |
| --- | --- | --- | --- |
| 1 | **BLOCKING.** The spec stated two different template-selection rules - *"ELK is what that refusal falls through to"* and *"template where one matches; ELK otherwise"* | A three-valued selection result. **Only not-applicable selects ELK**; a matching template that fails refuses | §1.3 |
| 2 | **BLOCKING.** The ELK-to-KiCad realization contract was absent | Five realization obligations settled here, plus a **re-validation** requirement the reviewer did not reach | §1.4 |
| 3 | **BLOCKING.** *"Does not get worse"* had no defined baseline | Measurement separated from acceptance; **no composite score at this stage**; the baseline channel is `stripboard/render-approvals.json` extended | §3.3 |
| 4 | **HIGH.** The ELK evidence is not representative, and §1.1 overclaimed from it | §1.1's *"ELK does not have that problem"* is **withdrawn and replaced with what was actually measured**; a spike is recorded as the next step | §1.1, §6 |
| 5 | **HIGH.** Multi-sheet was undefined | Blocks / sheets / section boards distinguished, one cross-sheet mechanism made authoritative, a single-sheet-versus-multi-sheet net-membership test added. **One part of this finding is corrected** | §1.6 |
| 6 | **HIGH.** Symbol orientation had no authority order | Template, then circuit-context rule, then ELK - and ELK may not invent symbol semantics | §1.5 |
| 7 | **MEDIUM.** One milestone held both *"templates out of scope"* and *"five Pultec schematics"* | Split into **M1** and **M2**. Carries the reviewer's distinction between a component-block template and a sheet-level composition construct | §6, §5.5 |
| 8 | **MEDIUM.** The readability reviewer had no output contract | A finding's required fields, without prescribing what the findings are; and a reviewer may not silently change the criteria | §3.5 |
| 9 | **MEDIUM.** Nothing tied the individual link checks to one derivation | A **generation manifest** of input and output hashes | §2.1 |
| 10 | **Correction.** The round trip was described as partition equality; it is more than that | The complete contract stated: identity, pins, values, footprints | §2 |
| 11 | **Correction.** `docs/schematic/README.md` said *"the three documents"* while indexing six | Fixed in that file, with the correction shown | the index |

**Two places where the review itself is corrected**, recorded because a review
is evidence and not an authority:

- **On finding 5.** The reviewer warned that sheet partitioning must never alter
  the electrical partition. **The architecture already prevents that hazard:**
  the electrical partition is `circuits/pultec/partition.ts`, which runs
  **upstream** of schematic generation, and sheets are decided **downstream** of
  the section `Network`. There is no code path by which a sheet decision reaches
  the partition. The cross-sheet contract still has to be written - that part of
  the finding stands - but the hazard is not live.
- **On finding 3's supporting figure.** The controller's note said
  `stripboard/render-approvals.json` holds **17 entries**. Measured:
  **it holds five**, one per Pultec section board, with **six** `ownerWords`
  utterances across them and **twelve** declared fields per entry; the sibling
  `stripboard/exemptions.json` holds two. **The mechanism is exactly as
  described and the count was wrong**, so the channel is adopted and the figure
  is corrected rather than repeated.

**And one place the review strengthened a finding the reviewer had half of** -
the re-validation requirement in §1.4. That is the controller's addition, marked
as such there.

What this builds, and what says it is done
-------------------------------------------

**A generator that turns a circuit model into a KiCad schematic a person can
read**, and the gates that say whether it did.

**Done is the owner's bar and it has two halves that only work together**
(parent, "What the Pultec is to this work"):

- the tooling is **general-purpose schematic authoring discipline**, not a Pultec
  schematic generator;
- and **if it cannot generate the five Pultec section schematics, it has failed.**

The evidence that it is general is precisely that it does the Pultec **without
special-casing**. Neither half stands alone.

The decisions already made
----------------------------

Recorded in the parent, in the owner's words. **Listed here so a plan does not
re-open them**, not restated as though new.

| Decision | Where |
| --- | --- |
| The Pultec is the forcing function AND the acceptance test | parent, "What the Pultec is to this work" |
| Per-board schematics are **derived from the canonical schematic**; that derivation is crucial to modularizing | parent, "Authority hierarchy" |
| **Both authority directions are requirements**; ex nihilo is required and is NOT this work | parent, "Both authority directions" |
| A schematic is **not always a derived artifact** and must never be regenerated over | parent, "A schematic is not always derived" |
| **Two tracks**: a general engine, and a growing library of idiom templates | parent, "Two tracks" |
| **The axis is net degree**, not chronology - measured | parent, "Two tracks", corrected 2026-10-19 |
| Build it by **porting `schgen` whole and adding ELK** at the seams where it excels | parent, "Two tracks", owner 2026-10-19 |

1. Architecture: one port, two seams
--------------------------------------

**Port `tools/schgen/` from the pedals repository whole** - the IR and its
validator, the s-expression writer, the symbol-library loader that flattens
`extends`, the geometry layer, deterministic UUIDs (v5 from stable keys, so
output is byte-stable), the append-only reference lock, the wire-safety
refusals, the seven templates, the ~160 clearance refusals, and the gates.

**Then add ELK as a geometry backend at two seams**, both identified by reading
the pedals tree:

**Seam A - within a block that NO TEMPLATE SUPPORTS.** `render/blocks.ts` states
the contract today: *"A template that cannot realise its subgraph, or that
produces a layout whose geometry disagrees with the IR, is a generation error."*
That one sentence covers two situations this spec now separates, because they
want opposite answers - see §1.3. **ELK is the renderer for the case where no
template supports the topology at all.** It is not a recovery path for a
template that was tried and failed.

**Seam B - between blocks, at sheet level** (`sheets.ts`, `sheetCheck.ts`,
`pageRefs.ts`). Arranging blocks on a page is a graph-layout problem, and it is
the one that produced a 1:1.97 unusable ribbon when a competing tool did it
badly.

### 1.1 Why ELK, and what was actually measured

**Every circuit in `circuits/` has a ground net of degree 6 or more**, and net
degree is what defeats a general schematic router: measured 12/12 routed at max
degree <= 4 against 17/44 at >= 5, with a control separating degree from part
count (15 parts in a series chain routed 15/15; 15 parts on one degree-15 net
routed 1/5).
[`../../schematic/generation-prior-art-circuit-families.md`](../../schematic/generation-prior-art-circuit-families.md),
all `[RAN]`; registered as `docs/known-gaps.md` **G90**.

**ELK ROUTES AND IS DETERMINISTIC WHERE THAT ROUTER FAILS. IT DOES NOT FOLLOW
THAT IT DRAWS A GOOD AUDIO SCHEMATIC.**

> **Withdrawn 2026-10-19 on review, shown rather than edited away.** This
> paragraph read: ***"ELK does not have that problem.** Driven through a
> schematic-aware front end it drew 14 capacitors in parallel at zero crossings
> in 0.17 s, byte-identical across 30 runs."*** **That overclaimed, and the
> reviewer was right about why:** 14 capacitors between two nodes is a highly
> regular network, and the sentence generalised from the most regular probe in
> the set to circuits that are not like it.

What
[`../../schematic/generation-prior-art-third-pass.md`](../../schematic/generation-prior-art-third-pass.md)
§3.4-3.5 actually establishes, `[RAN]`, ten probes run three times each:

- **Routing success and determinism: 10/10, 30 runs, byte-for-byte identical,
  never slower than 0.19 s.** The probe set is broader than the review assumed -
  it includes 3-, 5- and 7-way selector fan-outs and a **25-part Pultec-shaped
  passive EQ**, not only capacitor banks. Determinism is not a configuration
  there; it is what the tool does, and it is the property the first pass recorded
  as a gap across the whole prior art.
- **On the regular probe the drawing is good:** 14 capacitors in parallel render
  as a bank between two bus rails with junction dots at every tap and **zero
  crossings between different nets** - though in ELK's crossing-minimising order
  rather than numeric order.
- **On the one representative probe the drawing is NOT good, and the research
  says so in terms:** the 25-part Pultec-shaped EQ *"renders correctly and
  legibly ... and is **not a good audio schematic**"* - **15 crossings between
  different nets**, **1.72 bends per edge**, the seven throws of the HF selector
  placed at the far upper left and travelling the entire 1232-unit canvas width
  to reach their capacitors at the far right, and **signal flow not left to
  right** (`vin` and `vout` sit in the middle of the sheet).

**So the correct claim is narrow: ELK solves the failure mode that defeats
`schematizer` - it routes high-degree nets, repeatably - and it does not by
itself solve arrangement.** That is precisely why the seam is a seam and not a
replacement for the template library, and why §1.5 keeps symbol semantics out of
ELK's hands.

**High net degree may correlate with routing difficulty without being its only
cause.** Terminal placement and topology matter too, and nothing measured so far
separates them. **The spike that would is §6's next step, and it is not a
precondition already met.**

### 1.2 What we take from `netlistsvg` and what we do not

`netlistsvg` (MIT) is the proof that ELK can be driven to schematic-shaped
output. **We take its mechanism and not its code path**, because it emits SVG
and we emit `.kicad_sch`. **What that leaves us owing is a realization
contract, and §1.4 is it.**

The mechanism, which is the transferable part: **every symbol declares which
SIDE each pin leaves from** (`top`/`bottom`/`left`/`right`), and ELK is told
those port positions are **fixed**. That one constraint is what turns a generic
layered graph drawing into something that reads like a circuit.

**A second thing it does that we keep, and the research already names why.**
`netlistsvg`'s input carries a part's drawn orientation (`r_v` for a vertical
resistor, `c_h` for a horizontal capacitor) rather than deriving it: *"orientation
is a semantic choice about the circuit, which is how this repository already
treats criteria that must not come from the producing agent"* (third pass §3.3).
§1.5 makes that an authority order.

### 1.3 Template selection: a three-valued result, and only one value selects ELK

**This replaces two sentences that stated different rules.** The withdrawn
reading - *"ELK is what that refusal falls through to"*, inherited from the
parent's seam-A paragraph - would make ELK a recovery path for a template that
had already been tried. **It is not.** An implementer needs one rule, so here it
is.

**Selecting a block's renderer produces one of three results**, computed from
the IR subgraph and the template set before anything is drawn:

| result | what it means | what happens |
| --- | --- | --- |
| **not-applicable** | no template in the library supports this topology | **route the block through ELK** |
| **applicable** | a template supports this topology and realised it | emit the template's geometry; the clearance and wire-safety checks then grade it |
| **generation-failed** | a template supports this topology and did not realise it acceptably | **REFUSE**, and say which of the two sub-cases it is |

**`generation-failed` has two sub-cases and both refuse**, because they are
different defects and the report must distinguish them:

- **the template produced invalid electrical geometry** - geometry disagreeing
  with the IR. **Report a template defect**, naming the template and the IR
  connection it failed to realise;
- **the template produced geometry that fails a clearance constraint.**
  **Report the violated constraint**, naming it, the obstacle pair, and the
  block.

**THE REASON, AND IT IS THE WHOLE POINT OF THE DISTINCTION: if ELK rescues a
template that should have worked, defects in the preferred rendering path go
dark.** The sheet looks fine, the gate passes, and a template that is broken for
every future circuit of that shape is never reported. That is the *"a fallback
degrades the GATE, not just the drawing"* lesson this spec already cites
approvingly from `docs/known-gaps.md` **G84** - and the withdrawn sentence
violated it one section after quoting it. The pedals objection it dismissed
(*"why generate a knowingly inferior schematic and rely on an agent later
noticing it?"*) does not apply to `not-applicable`, where nothing was tried and
there is no defect to hide; it applies with full force to `generation-failed`.

**What decides the result must not be an agent's judgement**, and it already is
not: `blocks.ts` asks whether a template realises the IR subgraph, which is a
property of the subgraph and the template. **Selection is decided before
anything is drawn. It is never degradation after something failed.**

#### Does this contradict the parent? No - and saying why matters, because the parent wins

**The parent uses the same loose phrasing**: *"ELK becomes what that refusal
falls through to."* Read alone that is the reading this section withdraws, and
this document's own rule is that where the two disagree the parent wins. **They
do not disagree.** The parent's governing paragraph on this exact question is
*"Selection, not degradation"*, and it states the three-valued rule in words:
*"the choice is made before anything is drawn rather than after something
failed"*, and *"the selector already exists and is mechanical ... Use it as the
selector. Do not add a judgement call beside it."* It also names the reason this
section gives, that a fallback *"degraded the GATE - a reviewer ends up auditing
damage the pipeline chose to do."*

**So the parent already holds the rule and states it imprecisely in one
sentence.** §1.3 is the precise form of the parent's own position, not a
departure from it. **What is owed: the parent's two "falls through to" sentences
should be tightened to match when that document is next edited**, and until they
are, a reader who finds them should come here. This is recorded rather than
silently relied on.

### 1.4 The ELK-to-KiCad realization contract

**New in revision 1. The reviewer found this missing; it is the second blocking
finding.** §1.2 says we take `netlistsvg`'s mechanism and not its code path, and
until this revision the spec then said nothing about how ELK's output becomes a
`.kicad_sch`.

**THE CLAIM AN IMPLEMENTER MUST START FROM: a geometrically valid ELK drawing is
not necessarily a valid KiCad schematic.** ELK knows about nodes, ports and
orthogonal edges. KiCad knows about a 1.27 mm electrical grid, pin ends that are
the only places a wire connects, junction objects that make a crossing a
connection, and symbol transforms that move pins. Every one of those is a way a
correct ELK drawing becomes a wrong schematic.

**And the electrical round trip (§2) cannot stand in for geometric checks,
because a schematic can export a correct netlist while visually suggesting wrong
connections.** That is the same gap §3.2 is built on, arriving from the other
direction: KiCad joins a wire to a pin only at the pin's end, and a reader joins
anything drawn on a pin's line. A netlist export sees the first and is blind to
the second.

Five obligations, settled here:

1. **Grid snapping must not merge previously distinct wires.** ELK coordinates
   are continuous; KiCad's electrical grid is 1.27 mm. Snapping two distinct
   parallel segments onto the same grid line makes them collinear and overlapping,
   which `schgen`'s wire-safety refusal already treats as a defect - and if both
   land on a pin end they become one net. **The contract is that snapping is
   checked for identity collapse, not assumed to preserve it:** after snapping,
   the set of distinct wire geometries and the set of net memberships must both
   be unchanged from before snapping, and a collapse refuses.
2. **ELK edge junctions become KiCad wire junctions explicitly, including
   multi-terminal nets.** A net of degree n > 2 drawn as a tree has n - 2 or more
   branch points, and in KiCad a branch point is only a connection if a junction
   object is emitted there. **Every branch point of every net carries an emitted
   junction, and every emitted junction sits on exactly one net.** A crossing
   between different nets carries no junction, and a net's branch point carrying
   none is a refusal rather than a cosmetic miss.
3. **Port positions survive rotation and mirroring by being recomputed, never
   carried.** A symbol's declared port side (§1.2) is in the symbol's own frame.
   The fixed-port constraint handed to ELK, and the coordinate a wire is attached
   to, are both in the sheet frame. **The transform is applied once, to the
   library pin geometry, and the result is what both ELK and the emitter see** -
   so there is one transformed geometry and no second copy to drift. §1.5's
   four-step mapping is the check.
4. **Routes are kept off unrelated pins, labels and symbol bodies by the same
   obstacle matrix that grades template output**, not by a second set of rules -
   see the re-validation requirement below.
5. **When snapping makes a previously valid route invalid, the generator
   REFUSES. Decided here, and it is deliberately the unambitious answer.** A
   repair pass is a second layout engine with no gate of its own, written at the
   point in the pipeline where the agent has the least information and the most
   incentive to make the sheet pass. A refusal names the block, the segment and
   the constraint, and is a defect report against the realization layer.
   **CRITERION: no generated schematic is emitted whose geometry was altered
   after its last clearance check.** A repair pass may be proposed later as a
   change to this clause, with its own gate.

#### The clearance checks must be RE-VALIDATED against ELK geometry, not merely reused

**This is the controller's addition. The reviewer recommended reusing `schgen`'s
wire-safety and clearance checks after realization, and reuse is not enough.**

The evidence is in
[`../../schematic/schgen-development-history.md`](../../schematic/schgen-development-history.md)
§6, CONFIRMED against 105 commits and their messages: those refusals **accreted
one pair at a time over eleven steps**, and *"every new check discovered that the
previous checks had a blind spot, and the blind spot was always the same shape:
category A had been modelled as an obstacle for category B but not for category
C."* Body-vs-anchor but not body-vs-glyph. Glyph-vs-text but not glyph-vs-body.
Glyph-vs-body but not glyph-vs-glyph. Text-vs-everything but not
text-vs-no-connect-marker.

**They were grown against template-produced geometry.** ELK is a different
geometry source with different bend patterns and different port approach angles.
**Pointing a pairwise-accreted check set at a new geometry source is exactly the
condition that creates a fresh blind spot** - the ladder is a property of how the
checks were built, not of the board that provoked them.

**CRITERION, which is the research's own and not this spec's invention
(`docs/known-gaps.md` G85, *"what would settle it: an up-front
obstacle-category matrix"*): enumerate the obstacle categories once and check
the full matrix of pairs, rather than re-running the eleven-step ladder against
a new geometry source.** The categories the research names: bodies, pin lines,
pin numbers, pin names, interior graphics, wires, junctions, power/`PWR_FLAG`
glyphs, label outlines, field text, frame borders, no-connect markers (including
at hidden pins), and KiCad's DNP cross.

**MECHANISM, and it is the research's guess and not a measurement:** that an
up-front matrix is cheaper than the ladder. The criterion binds; the mechanism
is advice from someone who had not yet tried it. **If the matrix turns out not to
meet the criterion - a pair that is meaningless, a pair that needs a
direction-sensitive test rather than a symmetric one - record the deviation
rather than quietly doing something else** (`CLAUDE.md`, the worked example at
G52).

### 1.5 Symbol orientation: whose decision it is

**New in revision 1, finding 6.** Orientation was unstated, and ELK's graph
direction would otherwise have decided it by default.

**The authority order, highest first:**

1. **An explicit orientation in a reviewed template wins.** A template is a
   human arrangement reviewed once (§3.1); its orientations are part of what was
   reviewed.
2. **Otherwise a circuit-context rule gives a preferred orientation.** These are
   rule-library entries - circuit-independent, reviewed before the artifact
   exists - not per-block choices.
3. **ELK then places, subject to fixed port geometry.** It may position and it
   may choose among orientations the rules leave open; **it may not invent symbol
   semantics through graph direction alone.**

**Semantic orientation and physical transform are different things and the
contract keeps them apart.** *"The NPN's collector is up and the emitter is
down"* is semantic. *"This instance is mirrored about Y so its base faces the
driver"* is a transform. **The same NPN mirrored for readability keeps its pin
identity** - mirroring moves geometry, never pin assignment. A transform that
changes which terminal a pad or wire reaches is a defect, not a style.

**So the mapping below is verified end to end, and it is one mapping with four
links rather than four facts that happen to agree:**

```text
IR terminal  ->  symbol-library pin  ->  transformed geometric pin  ->  KiCad electrical connection
```

**Built on `schgen`'s existing symbol-library loader, not reimplemented.** That
loader is already in the port list because an unflattened copy *"silently drops
every pin"* (parent, "What ports"), and it is the only thing here that knows what
a library pin is. A second reader of symbol geometry would be a second answer to
the same question.

This is the schematic-side half of what the parent's gate 7 does for the board
(*"electrical terminal -> schematic pin -> footprint pad -> PCB net"*), and the
parent's reason carries over verbatim: a sheet can hold every expected part on
correctly named nets and still have a wire reaching the wrong terminal.

### 1.6 Blocks, sheets and section boards

**New in revision 1, finding 5.** The spec had one ELK seam at sheet level and no
account of what a sheet is.

**Three partitions, which may overlap and are not identical:**

| partition | authority | decided |
| --- | --- | --- |
| **functional block** | `include(prefix, network, portMap)` in the circuit model | by the circuit author, upstream of everything here |
| **physical section board** | `circuits/pultec/partition.ts` plus physicalization | upstream of schematic generation |
| **schematic sheet** | this generator | **downstream of the section `Network`** |

**The reviewer's hazard here is already prevented, and that is finding 5's
correction** (see the revision table above): sheets cannot alter the electrical
partition, because the partition is computed before the generator runs and the
generator consumes it. A sheet may group two functional blocks, split one across
two sheets, or correspond to a board one-to-one. **None of those is an
electrical claim.**

**One cross-sheet connection mechanism is authoritative, and the others are
decoration.** Which one is open (§5.2) and must be pinned before the first
multi-sheet output; what is settled is that **exactly one mechanism carries
cross-sheet connectivity** and a net that crosses a sheet boundary by any other
means is a refusal. The candidates are power symbols, global labels and
hierarchical ports, and they have different KiCad semantics - a drawing that uses
two of them for the same net reads as two claims about one connection.

**The test, which is the reviewer's and is adopted as written: generate the same
network as one sheet and as multiple sheets, export both through `kicad-cli`, and
verify identical net membership.** Coverage:

- **a shared rail** - the case a power symbol exists for;
- **a signal crossing more than two sheets** - a two-sheet test cannot
  distinguish a working mechanism from one that happens to pair up;
- **a repeated block** - two instances of one function must not merge through a
  cross-sheet name collision, which is the failure a prefixed net scheme exists
  to prevent.

**This test is cheap and load-bearing** because it compares the generator against
itself through KiCad, so it needs no reference drawing and works in both authority
directions.

### 1.7 The seam's two constraints

**One visual language across both paths.** A sheet with template-drawn blocks
beside ELK-drawn blocks reads as two drawings stapled together unless grid, flow
direction, label placement and line conventions are common. **A concrete
instance to settle rather than discover:** `netlistsvg`'s analog skin sets ELK
direction `DOWN` while its digital skin flows left-to-right, and `schgen`'s
templates carry their own conventions. **One must be pinned and the others made
to match.** §1.1's measurement makes this sharper than it looked: on the 25-part
probe, signal flow was neither direction consistently - `vin` and `vout` sat in
the middle of the sheet.

**What decides a block's path must not be an agent's judgement.** §1.3 is the
rule, and it is mechanical.

2. The derivation chain, and where each link is checked
---------------------------------------------------------

The owner: *"The per-board schematics need to be derived from the canonical
schematic - that's a crucial part of modularizing."*

```text
canonical <board>.kicad_sch        AUTHORED - never regenerated, never overwritten
        │  kicad-cli netlist export
        ▼
circuits/<circuit>/electrical/     derived
        │  partition
        ▼
a section Network                  derived; stand-ins and junction enter HERE
        │  schematic authoring (this spec)
        ▼
<board>.kicad_sch                  GENERATED
```

**The parent records that gate 4 is defective** because it compares a generated
section schematic **directly** against the whole-EQ netlist, which rejects - the
section legitimately carries stand-ins and junction headers the whole EQ does
not have. **Those are products of modularization, not foreign matter.**

**This spec's position: each LINK is checked, and no check spans the chain.**

| link | what is checked | status |
| --- | --- | --- |
| canonical -> electrical model | existing: the committed netlist export, compared by content | **exists** |
| electrical -> section network | existing: `assertLayoutMatchesCircuit`, the composition gate over all 31 subsets | **exists** |
| section network -> generated schematic | **the round trip**: export a netlist from the generated `.kicad_sch` with `kicad-cli` and compare it against the section network on the full contract below | **to build** |
| scaffold doc vs layout | `make check`'s scaffold-membership guard | **exists**, added 2026-10-18 |

**The round trip is the only new check, and the pattern is proven - and its
contract is wider than this spec first said.** Finding 10 was a correction and it
is accepted: `tests/circuits/kicad-round-trip.ts` does not compare net partitions
alone. **Verified by reading it:** `expectSameCircuit` compares the net partition
as sorted sets of `designator.pin` ignoring net names, **and** a
designator-to-value map, **and** each component's footprint against
`component.part?.footprint`. The file's own header says so: *"compare that export
with the circuit by net membership (a partition, ignoring net names), values and
footprints."*

**So the complete contract for the new check, stated rather than inherited:**

| compared | why it is not covered by the one before it |
| --- | --- |
| **component identity** | a net partition is over `designator.pin` strings; two components swapped consistently produce the same partition |
| **pin identity** | pad-count parity cannot catch a swapped IN/OUT (parent, gate 5) |
| **net membership**, as a partition ignoring net names | catches wrong connectivity and a renamed interface net with equivalent topology |
| **values** | a correct topology with a wrong capacitor is a correct netlist |
| **footprints where declared** | *where declared* is deliberate: the existing test compares against `component.part?.footprint`, so a component with no declared part has nothing to compare and that must not read as a pass |

A competing tool certifies every output the same way and reported 100% on 117
circuits.

**And the warning that the round trip CANNOT catch, which must be written where
an implementer will read it.** A certificate verifies what it was given, not
what you meant. Measured: a tool whose input format could not express a rotary
selector drew *"an excellent picture of a circuit that is not the Pultec"*, and
its round-trip certificate was blind to the substitution because the
substitution happened upstream. **Our chain is only as good as the link that
checks the model against the authored schematic**, and that link is the existing
committed-netlist comparison, not the round trip.

**The second thing it cannot catch is geometric**, and §1.4 states it: a
schematic can export a correct netlist while visually suggesting wrong
connections. The round trip is not a readability gate and must never be reported
as one.

### 2.1 A generation manifest, so the link checks certify ONE derivation

**New in revision 1, finding 9.** Four link checks that each pass prove nothing
jointly unless they ran over the same derivation. Nothing above said they did.

**Every generated schematic is accompanied by a manifest recording the hashes
of:**

- the canonical schematic's **netlist export** (the authority for a
  schematic-first circuit);
- the **section network** the generator consumed;
- the **template library** version and the **rule library** version that graded
  it;
- the **generated schematic** itself.

**CRITERION: a gate that reports a pass names the manifest it passed against,
and a manifest whose input hashes do not match the files on disk fails rather
than regenerating silently.**

This is not a new discipline here, which is the argument for it: the parent's
`run.json` records hashes of the source board, the intent, the rules, the policy
and the engine commit, and *"`adopt` refuses a run whose result hash has
changed"*. The stripboard side does the same, and
`stripboard/render-approvals.json` scopes an owner approval to a
`candidateSha256` for exactly this reason - **an approval of a render is an
approval of those bytes.** The schematic side had no equivalent.

3. Acceptance: three mechanisms, and no invented number
---------------------------------------------------------

**No published source anywhere states an acceptable number of wire crossings,
bends or wire length.** Not IEC 61082-1, not ANSI Y14.15 (*"as few as
possible"*), and the research literature is weaker rather than stronger - one
published generator reports only relative reduction, another explicitly declines
to report crossing or visual metrics, a third scores aesthetics **subjectively
out of ten by a human** and names that as a limitation.

**So inventing a threshold would put this project ahead of every published
source while appearing to cite one.** That is the failure the governing
invariant exists to prevent. **No criterion in this design carries a numeric
crossing, bend or length threshold** unless a named source states it with a
clause, or the owner states it as his own decision and it is recorded as his.

What we have instead, strongest first:

### 3.1 Readable by construction - templates

**This is how the proven generator actually achieved legible output, and it
never graded readability at all.** Its four gates are all correctness; there is
no aesthetic score anywhere in it. Legibility came from templates that place one
idiom in an arrangement a human designed once and reviewed once - *"one op-amp
unit with + above - on the left and the output on the right... the feedback
parts run as rows in a corridor below the body"*.

**That is channel 2 of the parent's governing principle** - a standing rule
library, circuit-independent, reviewed once, applied without further sign-off -
and NOT a rubric applied after the fact.

### 3.2 Specific misreadings refused - clearance

~160 refusals in the render layer alone. The reasoning is the sharpest idea in
the whole body of prior work:

> *"KiCad joins a wire or label to a pin only at the pin's end, but a reader
> joins anything drawn on a pin's line or inside a symbol's body."*

**The gap between what the tool considers connected and what a human eye reads
as connected is where unreadable schematics live - and it is a boolean, not a
score.** A wire through a symbol body is electrically perfect and visually a lie.

**These accreted pairwise over eleven steps**, each step finding that the prior
checks had the same shape of blind spot - category A modelled as an obstacle for
B but not for C. **This port short-circuits that ladder**: enumerate the obstacle
categories once and check the full pair matrix. **And §1.4 says why that is not
optional once ELK is in the pipeline** - the checks were grown against
template-produced geometry, so a new geometry source is the condition that
creates a fresh blind spot.

### 3.3 Measured, with no threshold - and measurement is separated from acceptance

**Rewritten in revision 1. Finding 3 was blocking and it was right.** This
section read: *"Measure and record; require that a given netlist's drawing does
not get worse."* **That sentence hid three unanswered questions** - what the
baseline is for a circuit never generated before, what it is for a circuit whose
canonical schematic holds different components from its section network
(stand-ins, junction headers), and what happens when yesterday's output would
perpetuate an already-bad result. **And it did not say whether improving
crossings while doubling wire length is a regression.**

**The structure is the reviewer's: MEASUREMENT and ACCEPTANCE are separate
things.**

**Measure these four, independently and separately reported:**

| measure | unit |
| --- | --- |
| bends | count, and per edge |
| crossings between different nets | count |
| wire length | total, in grid steps |
| occupied area | sheet extent actually used |

**NO COMPOSITE SCORE AT THIS STAGE.** This is a narrowing of what this spec
previously proposed and the change is deliberate. It said the shape to use was
AEM's - *"a per-net average of a multiplicative discount on bends and on
crossings against an alignment baseline, less a length penalty"* - **and that
shape is a composite whose four sub-terms are unpublished.** Adopting the shape
of a formula we cannot reproduce would produce a number that looks cited, trades
the four measures against each other at weights nobody chose, and answers
"crossings down, length doubled" by hiding the trade rather than showing it.
**Four numbers reported side by side show it.** A composite may be proposed
later as a reviewed change with its weights argued; it is not adopted here.

**What survives from AEM, and it is worth keeping:** **its benchmark is twelve
real discrete-analog boards with a public BSD-licensed netlist dataset and
published scores**, so our own measures can be exercised on the same circuits.
That is a fixture source, not a formula.

**Note which term the literature puts first.** Bends, then crossings. That is
consistent with the one user study in evidence, which attributes the harm to
**right-angle bends** rather than crossings and finds **no correlation between
crossing count and task performance at all** - while declaring its own sample too
small to be conclusive. **A schematic is orthogonal by convention, so bends are
intrinsic to the form.** This orders the report; it does not weight a score,
because there is no score.

**ACCEPTANCE, which is a different question from measurement:**

| case | acceptance |
| --- | --- |
| **a known fixture** | compare each measure against a **reviewed, versioned baseline held outside the generator** |
| **a circuit generated for the first time** | **report the measures with no pass/fail.** A first generation has nothing to regress against, and inventing a verdict for it is inventing a threshold |

**THE BASELINE CHANNEL ALREADY EXISTS AND IS NOT INVENTED HERE - this is the
controller's addition to finding 3 and it is the part that makes the finding
actionable.** `stripboard/render-approvals.json` is this repository's mechanism
for an externally-held, provenance-carrying judgement about a produced artifact,
and `tools/stripboard/approvals-model.ts` documents what it is for. **Measured,
because the figure it was relayed with was wrong** (see the revision table):
the file holds **five** approvals, one per Pultec section board, each carrying
**twelve** declared fields - `id`, `board`, `candidateSha256`, `renderedFrom`,
`admits`, `why`, `grantedBy`, `grantedOn`, `ownerWords`, `doesNotExcuse`,
`consultedBy`, `note` - with six `ownerWords` utterances across the five.

Three properties of it are exactly what a readability baseline needs, which is
the argument for extending it rather than building a parallel registry:

- **it is scoped to bytes.** An entry names one board and one `candidateSha256`,
  so *"the owner approved this board"* cannot silently cover a later, different
  board for the same section. A readability baseline needs the same scoping for
  the same reason;
- **it carries his words verbatim, one utterance per list element**, because *"a
  single string would have made an agent's concatenation of them the record"*;
- **a producing agent cannot silently replace it.**
  `tools/stripboard/approvals-read.ts` refuses a
  record with no quote, a quote in the narrator's voice, and a quote that is the
  entry's own reasoning in quotation marks; the registry is committed; the
  adoption prints the entry it was admitted on. **The mechanism's own stated
  limit is recorded rather than papered over** - *"no file can prove the owner
  said anything"*, residual at `docs/known-gaps.md` **G27** - and the design
  makes a forgery expensive and visible instead.

**CRITERION: a readability baseline is held in a committed registry outside the
generator, scoped to the artifact's bytes, and a gate cites the entry it passed
against.**

**MECHANISM, and it is this spec's and not a measurement: extend
`stripboard/render-approvals.json`'s shape to schematic renders.** Whether that
is a new registry with the same twelve-field shape, a `subjectKind` discriminator
on the existing one, or a shared loader is an implementation question the plan
answers. **Record the deviation if the shape does not carry over** - a schematic
baseline differs from a render approval in at least one way the plan must face:
an approval admits one termination, whereas a baseline carries four measured
numbers.

### 3.4 Three criteria this repository can make objective, where others cannot

A real asset and the reason the general-purpose claim is testable here:

- **functional-grouping disjointness** - `include(prefix, network, portMap)`
  names the functional blocks, so "are the blocks visually disjoint" is a
  question about declared sets;
- **congruent repeated sub-circuits** - a repeated block is literally the same
  function applied twice, so two instances should draw congruently;
- **rail via power symbol** - rails must be declared ports, so a rail drawn as an
  ordinary net is detectable.

**Elsewhere these are judgement calls. Here they are properties of the model.**
Registered as an asset at `docs/known-gaps.md` **G75**.

### 3.5 And one gate this project must build better than its source

The proven generator's readability review was done by an agent **denied the
source**, rendering pages to PNG at 300 dpi and cropping region by region. **No
human with domain expertise ever read those drawings for legibility**, and 16 of
19 cosmetic defects were knowingly shipped.

Worse for our purposes: **that reviewer's prompt pre-named the defect
categories**, and five of twenty findings map onto the hint list one-to-one
(`docs/known-gaps.md` **G83**). The reviewer was independent of the source but
**not of the producing controller's expectations.**

**So: a reviewing agent is handed the CRITERION and never the list.** That is the
invariant applied to the gate itself.

#### The output contract, added in revision 1

**Finding 8, and it is a real gap in "criterion, never the list":** withholding
the defect categories stops the reviewer being led and does nothing to stop a
vague finding. *"The mid sheet is hard to follow"* is unactionable and
unfalsifiable. **So the FORM of a finding is specified while its CONTENT is
not** - which is the distinction that keeps this from reintroducing the hint
list.

**Every finding carries:**

| field | why |
| --- | --- |
| **the affected sheet or region** | a finding nobody can locate cannot be fixed or disputed |
| **what a reader might misinterpret, stated as the misreading** | not *"this is unclear"* but *"a reader would take this wire as joining C3 to the coil return"* |
| **electrical error or readability problem** | they go to different places: an electrical error is a generator defect; a readability problem is graded against the criteria |
| **enough visual evidence to reproduce it** | the render, the crop, the coordinates - whatever makes a second reader able to look at the same thing |
| **blocking or suggestion** | 16 of 19 cosmetic defects were knowingly shipped at the source project; that is a legitimate outcome only if the reviewer said which were which |

**Nothing here says what the findings should be, how many there should be, or
what categories they fall into.** The fields are the contract.

**AND THE REVIEWER MAY NOT SILENTLY MODIFY THE ACCEPTANCE CRITERIA.** A reviewer
that adds a constraint it then grades against has authored the criteria for the
artifact in front of it - the governing invariant, one level up from where it is
usually caught. **A recurring new failure mode is a PROPOSED ADDITION to the
standing rule library, subject to independent review, and never an automatically
accepted constraint.** The proposal is a legitimate and wanted output; the
automatic acceptance is the failure.

4. Out of scope, with reasons
-------------------------------

- **Ex nihilo generation.** A requirement (parent), explicitly not this work:
  *"that's not our current situation."*
- **PCB synthesis, placement and routing** - T4, T5, T6 of the parent.
- **Changing any adopted layout.** The owner: *"Leave the approved boards alone."*
- **Reimplementing AEM, and now also adopting its SHAPE.** Its sub-terms are
  unpublished. Revision 1 narrows this further than the first draft did: §3.3 no
  longer proposes using its composite form either. Its benchmark circuits remain
  useful as fixtures.
- **A composite readability score, at this stage.** The four measures are
  reported separately. A composite is a reviewed change with its weights argued,
  not a default.
- **A geometry repair pass after snapping** (§1.4, obligation 5). Refusal is the
  decided behaviour; a repair pass needs its own gate and is not specified here.
- **Designing the five new templates and the three uncovered constructs** - see
  §5.5 and §6's M2.
- **Adopting `schematizer` or `weave` code.** Measured unsuitable - one cannot
  route our net degrees, the other's input format cannot express a selector, a
  pot, a jumper or a connector, and its repository ships no LICENSE.

5. Open questions this spec does NOT answer
---------------------------------------------

Named so a plan does not pretend they are settled.

### 5.1 Do the seven ported templates transfer?

They were sized by a 103-block digital mainboard. Nothing is known about their
pass rate on circuits that are mostly passive chains, dividers and op-amp
stages. **Parent G87.** The measurement: run them and count. **This is M1's
existing-template parity demonstration** (§6).

### 5.2 Which direction does the sheet flow, and which cross-sheet mechanism is authoritative?

See §1.7 and §1.6. **Two conventions must be pinned**, and §1.1's measurement
says the first one is not self-evident: on the 25-part probe, signal flow ran
neither left-to-right nor top-down consistently.

### 5.3 Are `schgen`'s templates separable from its geometry layer?

If they are coupled, seam A costs more than it looks. **A code-reading question,
an hour, and it should be answered before the plan is written.**

### 5.4 Is a passive's symbol declared per part or derived from its kind?

`lib/model/kinds.ts` already derives pin vocabulary by kind; the analogous move
for symbols is available and unmade. 15 of `pultec-low-boost`'s 19 components
declare no symbol. **§1.5's authority order does not settle this** - it says who
decides an orientation, not where a symbol choice is declared.

### 5.5 The five new templates are not designed - and finding 7 says two of three remaining constructs may not be templates at all

`selectorBank`, `potNetwork`, `tappedReturn`, `modeSwitch`, `bjtStage`, plus the
three constructs the parent records as having no template at all - the stand-in
group, the junction bus, and a gang spanning two boards. **Designing them is
spec work, not plan work**, and this document does not do it.

**What revision 1 adds, because the reviewer found a distinction this spec
missed and it changes what those constructs ARE:**

| construct | what it may actually be |
| --- | --- |
| the **stand-in group** | a **sheet-level composition construct** - a conditionally populated set with a group identity and a population rule, which is a property of a sheet's composition rather than of one idiom's arrangement |
| the **junction bus** | likewise **sheet-level** - a fixed-pinout interface between boards, which is what a sheet boundary is for |
| a **gang spanning two boards** | as much a **cross-sheet documentation requirement** as a layout problem: one shaft, two poles, two sheets, and a reader has to be able to see that they move together |

**The reviewer, and it is adopted as a constraint on the design work rather than
as the design: *"Don't force all three through the same abstraction merely to
make the template list uniform."*** The parent already warns that
`passiveChain` *"would silently absorb a stand-in group as ordinary series and
shunt resistors and lose both the group identity and the population
condition"* - the same failure one level up. A uniform template list is not a
goal.

6. Milestones, and the spike that comes first
-----------------------------------------------

**New in revision 1, finding 7.** This spec said designing the five new
templates was out of scope while T2's acceptance in the parent is five Pultec
section schematics. **Those cannot both sit in one milestone**, and the parent's
own four-milestone sequence for T2 did not separate them either.

**The next step, and it is not a precondition already met: the ELK
representativeness spike.** The owner has scheduled it **after** this revision,
so it is recorded here as the next piece of work rather than as evidence this
spec rests on.

**What it tests: at least three representative structures**, using **real
repository circuit fragments** rather than probes reconstructed in a tool's own
input format - which is what the existing evidence is (§1.1):

- a **large passive star or parallel bank**;
- an **interacting ladder with branches**;
- a **mixed topology with a selector, a potentiometer, and a feedback or return
  path**.

**What it records, per structure:** electrical correctness, routing success,
crossings, bends, page extent, and determinism.

**This spec does not resolve the spike's questions and does not predict its
results.** What it does is stop §1.1 from standing on the regular case.

**Then two milestones:**

| | M1 | M2 |
| --- | --- | --- |
| **deliverable** | `schgen` ported; ELK integrated at both seams; the geometry and verification contracts of §1.3, §1.4, §1.5, §1.6, §2 and §2.1 established | the analog idioms designed and implemented, then **all five Pultec section schematics** |
| **acceptance** | **existing-template parity** - the seven ported templates draw the circuits already in this repository, graded by the ported gates and the new contracts | the five sections generable **from general templates**, without special-casing |
| **what it does NOT produce** | any Pultec section schematic | - |

**M1 producing no Pultec schematic is not a cost to be minimised**, and the
parent says so in terms: the milestone order *"is the discipline rather than an
obstacle to it"*, and **a plan that reorders T2 to reach a Pultec sheet earlier
is reintroducing the shortcut.**

Decisions
---------

| What | Who | Why |
| --- | --- | --- |
| Port `schgen` whole and add ELK at the seams | owner, 2026-10-19 | *"Why can't we port schgen and add ELK for geometries it excels at?"*, then *"agreed. proceed"* |
| ~~ELK is what seam A's refusal falls through to~~ **WITHDRAWN on review** - only `not-applicable` selects ELK; a matching template that fails REFUSES | this spec, revision 1 | the withdrawn form made ELK a recovery path for a template that had been tried, so a defect in the preferred rendering path would go dark - which is the G84 lesson this spec cites one section earlier |
| A selection result is three-valued, and a `generation-failed` report names which sub-case | this spec, revision 1 | a template defect and a clearance violation are different defects and need different reports |
| A geometrically valid ELK drawing is not a valid KiCad schematic; five realization obligations are settled here | this spec, revision 1 | the spec took `netlistsvg`'s mechanism and not its code path and then specified no realization |
| Snapping that invalidates a route REFUSES; no repair pass | this spec, revision 1 | a repair pass is a second layout engine with no gate, written where the agent has least information and most incentive |
| The clearance checks are RE-VALIDATED against ELK geometry via an obstacle-category matrix, not merely reused | controller, revision 1 | G85: they accreted pairwise over eleven steps against template-produced geometry; a new geometry source is the condition that creates a fresh blind spot |
| Orientation authority: reviewed template, then circuit-context rule, then ELK - and ELK may not invent symbol semantics | this spec, revision 1 | `netlistsvg` already treats orientation as an input, and the third pass names why: it is a semantic choice about the circuit |
| Sheets are downstream of the section network; the electrical partition is upstream and unreachable from here | this spec, revision 1 | corrects the reviewer: the hazard it named is already prevented by `circuits/pultec/partition.ts`'s position in the chain |
| Each derivation LINK is checked; no check spans the chain | this spec | gate 4's defect is that it compares at the wrong point, not that the authority is wrong |
| The round trip's contract is component identity, pin identity, net membership, values, and footprints where declared | this spec, revision 1, from reading `tests/circuits/kicad-round-trip.ts` | the first draft described it as partition equality; the existing test already compares values and footprints too |
| A generation manifest ties the link checks to one derivation | this spec, revision 1 | four checks that each pass prove nothing jointly unless they ran over the same inputs; `run.json` and `candidateSha256` are the existing precedent |
| No invented crossing, bend or length threshold | this spec, from measurement | no published source states one; inventing one would appear to cite a standard that does not exist |
| Measurement is separated from acceptance; four measures reported independently | this spec, revision 1 | *"does not get worse"* had no baseline for a new circuit, for a section whose components differ from the canonical, or for an already-bad previous result |
| **No composite score at this stage**, including AEM's shape | this spec, revision 1 | its sub-terms are unpublished, and a composite hides the crossings-down-length-doubled trade rather than showing it |
| The readability baseline extends `stripboard/render-approvals.json`'s channel rather than inventing one | controller, revision 1 | it is already externally held, scoped to bytes, carries his words verbatim, and is protected against a producing agent silently replacing it |
| A reviewing agent gets the criterion, never the defect list | this spec | measured: the source project's reviewer had its categories pre-named and five of twenty findings matched the hints one-to-one (G83) |
| A readability finding has a required FORM; its content is unprescribed; a reviewer may not silently change the criteria | this spec, revision 1 | "criterion, never the list" prevented leading the reviewer and permitted a vague finding |
| T2 splits into M1 (port, ELK, contracts, existing-template parity) and M2 (idioms, then five Pultec sections) | this spec, revision 1 | "templates out of scope" and "five Pultec schematics" cannot both be one milestone's acceptance |
| The stand-in group and the junction bus may be sheet-level composition constructs, and a cross-board gang a cross-sheet documentation requirement | reviewer, revision 1 | *"Don't force all three through the same abstraction merely to make the template list uniform."* |
| Designing the five new templates is NOT in this spec | this spec | they are design decisions; a plan argues from a spec and does not invent one |
</content>
