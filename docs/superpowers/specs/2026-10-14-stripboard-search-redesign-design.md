---
title: Stripboard placement and routing — owning the model, and why the search must change
date: 2026-10-14
status: draft-for-owner-review
---

# Owning the board model, and putting wires back in reach

Sub-project **S1b** of `2026-10-08-agent-authored-boards-design.md`, superseding the
search half of `2026-10-10-stripboard-pipeline-design.md` (**PIPELINE**). Its criteria
remain `2026-10-10-stripboard-acceptance-criteria.md` (**CRITERIA**, approved by the
owner 2026-10-13), amended in the two places named under *Corrections to the record*.

**This is a specification.** No implementation code was written producing it.

## Why

Four days of work on the existing pipeline produced a layout with **28 cuts on 14 nets
and zero wires**, against hand layouts of **0.38–0.45 cuts per net with four wires
each**. The pipeline is roughly **four to five times worse per net than a person**, and
the gap is not closing: the last three tasks bought 6 cuts, then 0, then 0.

The reason is not that the problem is hard. These are small instances — 11 to 22 nets,
16 to 34 parts, grids of a few hundred holes — and a person solves one in an evening.
The reason is architectural, and it is in two parts.

### The search cannot express the move that matters

`tools/stripboard/place.ts:239` states the rule: **one gesture per candidate.** Each
candidate is a single gesture, scored alone, accepted greedily. But using a wire
requires three coordinated decisions — move a pad onto its own strip, move it to a
column a wire can reach, *then* run the wire. The first two pay nothing on their own.
**A one-gesture-per-candidate greedy climber cannot see past the first**, so the third
never becomes available.

Measured: a full 20,000-evaluation run enumerated **one** `add-wire` candidate, and the
fork refused it on reach. §6.9 of `docs/stripboard/pipeline-verification.md` records
7,417 such candidates in an earlier era. The lever the owner identified as primary is,
in practice, absent.

### The tool cannot express it either

The pinned fork documents eleven verbs. **Adding a wire is not one of them** — wires go
on through `--author --op add-wire`, which does not appear in `--help` at all. And
`--move-batch`, the one primitive that applies several gestures atomically and lets a
caller score from stdout, accepts **only `move` and `rotate`**.

So the gesture needing coordination with a placement change is exactly the gesture that
cannot share a candidate with one. This is not fixable in this repository's TypeScript.

### And the inner loop is a subprocess

The same run made **126,435 fork invocations** for 20,000 evaluations — 6.3 process
launches per candidate, ~12 ms each, ~25 minutes. Three runs in a row ended on
`Q4 budget-exhausted` without converging. **Every figure this project has reported is
"best found before the clock ran out," not "best."**

## What changes

**The model moves into this repository. VeroRoute becomes the witness.**

### The model

A stripboard is small and exactly describable: a grid of holes; strips of copper broken
by cuts into segments; parts occupying hole sets; wires joining two holes; nets as sets
of pins that must be connected. Connectivity is union-find over segments and wire
endpoints. Low-boost is 448 cells.

Two consequences follow immediately, and both dissolve problems rather than managing
them:

**Cuts stop being a decision.** A cut is fully determined by placement plus wires: on
any strip, two different nets in adjacent runs of holes force a cut between them. That
is the identity `C = Σ(blocks per strip) − (occupied strips)` this repository already
uses. **The search space is placements and wires only**, and every candidate's cost is
exact and immediate.

**A pad becomes a part with one hole.** Tasks 1, 2, 8 and 9 of
`2026-10-13-buildable-pultec-layouts.md` exist solely because `PAD` and `PART` are
different species in the fork's dump. In our own model they are one thing at different
sizes, and **that entire class of defect stops being expressible.**

### The boundary

VeroRoute keeps three jobs it is genuinely good at and loses the one it is not:

| job | who |
| --- | --- |
| netlist → starting placement (`--import`) | VeroRoute |
| the search, cut derivation, scoring | **this repository** |
| independent confirmation of cuts and completeness (`--check`, AutoFill) | VeroRoute |
| writing the `.vrt` a person opens, prints and builds from | VeroRoute |

**This strengthens CRITERIA's governing invariant rather than straining it.** Today
VeroRoute is inside the thing being judged. In this design it is a second,
independently written implementation that checks our answer — and a disagreement
between our cut count and AutoFill's is a **bug alarm**, not an ambiguity. The
machinery to detect it already exists as `HC8`'s netlist equivalence.

### The search

Constructive seeds, then local improvement. Seed by deciding which strip hosts each
net, placing parts so their pins land there, and running a wire where a net must span —
the way a person works. Then improve from several such seeds, with **compound
candidates**, including move-and-wire as one proposal.

**The algorithm is deliberately not fixed here.** Once an evaluation costs microseconds
rather than 75 ms, annealing, late-acceptance hill climbing and near-exhaustive search
all become available, and which wins is a measurement. What this spec fixes is the
*shape*: constructive seeds, compound moves, the existing acceptance ordering, and
**running to convergence rather than to a budget**. A design doc that named the
algorithm would be asserting something nobody has measured, which is the failure mode
this plan's own record documents five times over.

## Benchmarks

The benchmark is **boards the owner laid out by hand and then built and used.**

| board | nets | cuts | cuts/net | wires | extent | status |
| --- | --- | --- | --- | --- | --- | --- |
| **feedback** | 11 | 5 | **0.45** | 4 | 16 × 18 | **primary** — built, passes `make check` |
| **buffered** | 13 | 5 | **0.38** | 4 | 20 × 34 | secondary — built, passes `make check` |

**Target:** match `feedback`'s cuts-per-net, using wires at a comparable rate, within the
declared stock of **34 strips × 27 columns**.

`buffered` exceeds that stock by seven columns. **This is not evidence of a limit of
hand layout** — the owner's account is that he did not measure his stock before laying
it out. Fitting 27 columns is an ordinary constraint to meet, not a victory over the
hand result, and this spec does not claim otherwise.

### Excluded, and why

- **`lab`** — never built; the owner abandoned it as *"weirdly complicated."* Its zero
  cuts are therefore **not** an achievement to emulate. It is retained as a **negative
  control**: a board that would score perfectly on everything this pipeline minimises
  and that a person rejected on sight. If the new search produces something lab-shaped,
  that is a warning.
- **`staged`** — provenance unestablished; the owner does not trust his recollection and
  the repository does not record who placed it.
- **`B1-frozen` (`pultec-low-boost-frozen`)** — **withdrawn as a benchmark.** See below.

## Corrections to the record

Two, both to be made before implementation starts.

**`B1-frozen`'s provenance is not `[external]`.** CRITERIA line 455 records it as *"the
owner's hand layout."* The owner states he did not produce it. The only source for the
claim was an agent-written sentence in `tests/fixtures/stripboard/provenance.txt`, which
was then cited into an owner-approved specification. **An unverified agent assertion
became the external standard the pipeline is graded against** — the precise failure the
governing invariant exists to prevent. The mark becomes *unverified*; the fixture is
retained for regression, not as a bar.

**`V3`'s deviation is superseded, not revived.** A deviation recorded on 2026-10-13 held
that `B1-frozen` was the wrong target because it could not run. It is now the wrong
target for a better reason: nobody can say what it measures. The benchmark moves to
`feedback` and `buffered`.

## What is explicitly NOT changing

The criteria document; the adoption gate and its ten refusals; the span, footprint and
pin-pattern data; the provenance chain; the refusal discipline; the report; `make check`
and the four buildability verifiers. **None of those is the problem.** This replaces the
inner loop — `climb*`, `moves*`, and the per-candidate fork traffic — and nothing above it.

**`OBJ1` and `OBJ2` are untouched.** No new term in `F`, no eleventh hard constraint, and
**no legibility metric.** `lab` is the reason that prohibition is right rather than
merely stated: the owner rejected it on judgment, so any tidiness measure would be an
agent's invention standing in for his taste. `G5` — human review — remains load-bearing,
and the renderer fixed on 2026-10-14 is what makes exercising it possible.

## Risks, stated rather than buried

**We would own a cut-derivation implementation.** If ours and AutoFill's disagree we have
two truths. Accepted, because the disagreement is detectable by construction here and
the alternative is inferring cost through a 12 ms subprocess we cannot see inside.

**A rewrite of the inner loop discards working code.** `climb*` and `moves*` are tested
and correct for what they do. The case for replacing them is that what they do cannot
reach the answer, not that they are faulty.

**The constructive seed could encode taste.** Deciding which strip hosts a net is a
placement heuristic, and a heuristic chosen to make the benchmark pass would be an agent
grading its own work. Mitigation: seeds are generated from several orderings and judged
only by the existing acceptance rule, never hand-tuned against a benchmark figure.

## Decisions

| decision | who | why |
| --- | --- | --- |
| Own the model; VeroRoute becomes importer, verifier and exporter | **[owner]** 2026-10-14 | *"yes, your recommendation"*, after the alternative — extending the fork and keeping the architecture — was offered and costed |
| The fork is in scope to change, or to abandon | **[owner]** 2026-10-14 | verbatim: *"you can do whatever you want with the fork, including abandon it for something more suitable if need be"* |
| Benchmark is `feedback` and `buffered` | **[owner]** 2026-10-14 | the two boards he hand-laid and built; `lab` and `staged` excluded on his instruction |
| `lab` is a negative control, not a target | **[owner]** 2026-10-14 | verbatim: *"It was weirdly complicated. so I abandoned it"* |
| No legibility term despite `lab` | agent, under `OBJ2` | adding one would be an agent authoring the criterion its own output is graded by |
| Algorithm left unfixed | agent | which search wins is a measurement; naming one here would assert what nobody has measured |

## Open questions for the owner

1. **The evaluation budget.** Three runs have ended budget-exhausted. Under this design
   the budget largely stops mattering — but if a run still fails to converge, what should
   it do: report, or keep going?
2. **Connector grouping.** The owner proposed moving controls off-board behind
   wire-to-board connectors and stated no strong preference on grouping. Under this
   design a pad is just a one-hole part, so the pad problem dissolves without it. The
   proposal is therefore **deferred, not rejected**: it remains available as a packaging
   choice, to be decided by measurement if it is ever needed.
