---
title: Schematic authoring - the generator, its two seams, and what grades it
date: 2026-10-19
status: draft-for-owner-review
parent: ./2026-10-08-agent-authored-boards-design.md
---

Schematic authoring
===================

**This is the child spec for sub-project T2** of
[`2026-10-08-agent-authored-boards-design.md`](./2026-10-08-agent-authored-boards-design.md).
It does not re-argue the parent. Where the two disagree, **the parent wins** and
the disagreement is a defect in this document.

**The research this rests on is indexed, with its reliability recorded per pass,
at [`../../schematic/README.md`](../../schematic/README.md).** Four passes, three
of which ran things. Read the index before building on any single one of them -
three characterisations in the weakest pass have since been measured false.

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

**Seam A - within a block that no template can realise.** `render/blocks.ts`
states the contract today: *"A template that cannot realise its subgraph, or
that produces a layout whose geometry disagrees with the IR, is a generation
error."* That is a hard refusal, and it was the right call when there was
nothing good to fall through to - pedals considered and killed a fallback to
label-rendering because *"why generate a knowingly inferior schematic and rely
on an agent later noticing it?"*. **ELK is what that refusal now falls through
to**, and the objection does not carry: a layered orthogonal engine is not a
knowingly inferior rendering.

**Seam B - between blocks, at sheet level** (`sheets.ts`, `sheetCheck.ts`,
`pageRefs.ts`). Arranging blocks on a page is a graph-layout problem, and it is
the one that produced a 1:1.97 unusable ribbon when a competing tool did it
badly.

### 1.1 Why ELK, in one measurement

**Every circuit in `circuits/` has a ground net of degree 6 or more**, and net
degree is what defeats a general schematic router: measured 12/12 routed at max
degree <= 4 against 17/44 at >= 5, with a control separating degree from part
count (15 parts in a series chain routed 15/15; 15 parts on one degree-15 net
routed 1/5).

**ELK does not have that problem.** Driven through a schematic-aware front end it
drew 14 capacitors in parallel at **zero crossings in 0.17 s, byte-identical
across 30 runs**. Determinism is not a configuration there; it is what the tool
does.

### 1.2 What we take from `netlistsvg` and what we do not

`netlistsvg` (MIT) is the proof that ELK can be driven to schematic-shaped
output. **We take its mechanism and not its code path**, because it emits SVG
and we emit `.kicad_sch`.

The mechanism, which is the transferable part: **every symbol declares which
SIDE each pin leaves from** (`top`/`bottom`/`left`/`right`), and ELK is told
those port positions are **fixed**. That one constraint is what turns a generic
layered graph drawing into something that reads like a circuit.

### 1.3 The seam's two constraints

**One visual language across both paths.** A sheet with template-drawn blocks
beside ELK-drawn blocks reads as two drawings stapled together unless grid, flow
direction, label placement and line conventions are common. **A concrete
instance to settle rather than discover:** `netlistsvg`'s analog skin sets ELK
direction `DOWN` while its digital skin flows left-to-right, and `schgen`'s
templates carry their own conventions. **One must be pinned and the others made
to match.**

**What decides a block's path must not be an agent's judgement.** It is already
mechanical and must stay so: `blocks.ts` asks whether a template realises the
IR subgraph, which is a property of the subgraph and the template, not an
opinion about the drawing. **Template where one matches; ELK otherwise. This is
SELECTION, decided before anything is drawn - never degradation after something
failed.**

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
| section network -> generated schematic | **the round trip**: export a netlist from the generated `.kicad_sch` with `kicad-cli`, compare net PARTITIONS as sets of `ref:pin`, ignoring net names | **to build** |
| scaffold doc vs layout | `make check`'s scaffold-membership guard | **exists**, added 2026-10-18 |

**The round trip is the only new check, and the pattern is proven.** This
repository already does exactly this shape in `tests/circuits/kicad-round-trip.ts`
- compare by net membership, values and footprints, ignoring net names. A
competing tool certifies every output the same way and reported 100% on 117
circuits.

**And the warning that the round trip CANNOT catch, which must be written where
an implementer will read it.** A certificate verifies what it was given, not
what you meant. Measured: a tool whose input format could not express a rotary
selector drew *"an excellent picture of a circuit that is not the Pultec"*, and
its round-trip certificate was blind to the substitution because the
substitution happened upstream. **Our chain is only as good as the link that
checks the model against the authored schematic**, and that link is the existing
committed-netlist comparison, not the round trip.

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
categories once and check the full pair matrix.

### 3.3 Measured, with no threshold - the relative form

Measure and record; **require that a given netlist's drawing does not get
worse.** No absolute number is needed and none is available.

**What to measure, and the shape comes from the one published metric validated
on discrete analog.** AEM's formula was read: a **per-net average** of a
**multiplicative discount on bends and on crossings** against an **alignment
baseline**, less a **length penalty**. Its four sub-terms are not published so it
cannot be reimplemented exactly - but the shape is reusable, and **its benchmark
is twelve real discrete-analog boards with a public BSD-licensed netlist dataset
and published scores**, so our own measure can be exercised on the same circuits.

**Note which term comes first.** Bends, then crossings. That is consistent with
the one user study in evidence, which attributes the harm to **right-angle
bends** rather than crossings and finds **no correlation between crossing count
and task performance at all** - while declaring its own sample too small to be
conclusive. **A schematic is orthogonal by convention, so bends are intrinsic to
the form.**

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

### 3.5 And one gate this project must build better than its source

The proven generator's readability review was done by an agent **denied the
source**, rendering pages to PNG at 300 dpi and cropping region by region. **No
human with domain expertise ever read those drawings for legibility**, and 16 of
19 cosmetic defects were knowingly shipped.

Worse for our purposes: **that reviewer's prompt pre-named the defect
categories**, and five of twenty findings map onto the hint list one-to-one. The
reviewer was independent of the source but **not of the producing controller's
expectations.**

**So: a reviewing agent is handed the CRITERION and never the list.** That is the
invariant applied to the gate itself.

4. Out of scope, with reasons
-------------------------------

- **Ex nihilo generation.** A requirement (parent), explicitly not this work:
  *"that's not our current situation."*
- **PCB synthesis, placement and routing** - T4, T5, T6 of the parent.
- **Changing any adopted layout.** The owner: *"Leave the approved boards alone."*
- **Reimplementing AEM.** Its sub-terms are unpublished; the shape is used, the
  formula is not claimed.
- **Adopting `schematizer` or `weave` code.** Measured unsuitable - one cannot
  route our net degrees, the other's input format cannot express a selector, a
  pot, a jumper or a connector, and its repository ships no LICENSE.

5. Open questions this spec does NOT answer
---------------------------------------------

Named so a plan does not pretend they are settled.

1. **Do the seven ported templates transfer?** They were sized by a 103-block
   digital mainboard. Nothing is known about their pass rate on circuits that
   are mostly passive chains, dividers and op-amp stages. **Parent G87.** The
   measurement: run them and count.
2. **Which direction does the sheet flow?** See 1.3. One convention must be
   pinned.
3. **Are `schgen`'s templates separable from its geometry layer?** If they are
   coupled, seam A costs more than it looks. **A code-reading question, an hour,
   and it should be answered before the plan is written.**
4. **Is a passive's symbol declared per part or derived from its kind?**
   `lib/model/kinds.ts` already derives pin vocabulary by kind; the analogous
   move for symbols is available and unmade. 15 of `pultec-low-boost`'s 19
   components declare no symbol.
5. **The five new templates are not designed.** `selectorBank`, `potNetwork`,
   `tappedReturn`, `modeSwitch`, `bjtStage`, plus the three constructs the
   parent records as having no template at all - the stand-in group, the
   junction bus, and a gang spanning two boards. **Designing them is spec work,
   not plan work**, and this document does not do it.

Decisions
---------

| What | Who | Why |
| --- | --- | --- |
| Port `schgen` whole and add ELK at the seams | owner, 2026-10-19 | *"Why can't we port schgen and add ELK for geometries it excels at?"*, then *"agreed. proceed"* |
| ELK is what seam A's refusal falls through to | this spec | pedals killed a fallback to label-rendering because it degraded toward something worse; a layered orthogonal engine does not |
| Each derivation LINK is checked; no check spans the chain | this spec | gate 4's defect is that it compares at the wrong point, not that the authority is wrong |
| No invented crossing, bend or length threshold | this spec, from measurement | no published source states one; inventing one would appear to cite a standard that does not exist |
| The relative no-regression form instead | this spec | it needs no threshold and is what the field actually does |
| A reviewing agent gets the criterion, never the defect list | this spec | measured: the source project's reviewer had its categories pre-named and five of twenty findings matched the hints one-to-one |
| Designing the five new templates is NOT in this spec | this spec | they are design decisions; a plan argues from a spec and does not invent one |
