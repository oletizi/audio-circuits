---
title: Stripboard placement and routing — owning the model, and why the search must change
date: 2026-10-14
status: draft-for-owner-review (revision 3, after a second third-party review)
---

# Owning the board model, and putting wires back in reach

Sub-project **S1b** of `2026-10-08-agent-authored-boards-design.md`, superseding the
search half of `2026-10-10-stripboard-pipeline-design.md` (**PIPELINE**). Its criteria
remain `2026-10-10-stripboard-acceptance-criteria.md` (**CRITERIA**, approved by the
owner 2026-10-13), amended in the two places named under *Corrections to the record*.

**This is a specification.** No implementation code was written producing it.

**Revision 2** answered a third-party review of revision 1: two blocking findings (cut
derivation, materialization), two high (termination, benchmark interpretation) and three
medium. **Revision 3** answers a second review of revision 2: wire net identity, the
round-trip equivalence contract, a bounded budget experiment, and an architectural
invariant that the core must run without VeroRoute. Where this document pushes back
rather than accepting, it says so and why.

## What a stripboard is FOR, in the owner's words

Recorded because it is the purpose every criterion in this project serves, and until
2026-10-14 it was nowhere in the repository in his own words. Verbatim:

> *"Cuts are as far as I'm willing to go to modify the board. Modifying the board
> introduces uncertainty that becomes a troubleshooting nightmare. The point of building a
> stripboard version of a circuit is to test the circuit. If the board modifications
> introduce enough uncertainty, it becomes an exercise in testing the board build, which I
> have no interest in, since ALL of these circuits will eventually be manufactured on real
> printed circuit boards at pcbway or similar."*

**Four things follow, and three of them were being assumed rather than known.**

**The objective is aligned, and now has a reason behind it.** `F` minimises cuts above all
else. Cuts are modifications; modifications are uncertainty; uncertainty means debugging the
board instead of the circuit. So *minimise `C`* is not an aesthetic preference about tidy
boards — it is **minimise the number of ways the board can lie to you about the circuit.**
Nothing in `OBJ1` changes; what changes is that it can now be justified rather than merely
cited.

**No modification beyond a cut is available to the search, ever.** Not spot-facing a pad,
not scraping a run, not drilling. This is a **hard bound on the move set**, not a
preference, and it is why `Cut { strip, afterColumn }` is the whole vocabulary.

**`lab`'s rejection was not taste.** This document previously recorded it as a board the
owner *"abandoned as weirdly complicated"* and treated that as a judgement a metric could
not capture. In the light of the above it is sharper than that: **a complicated board
defeats the purpose**, because complexity is uncertainty and uncertainty is what makes the
exercise a test of the build rather than of the circuit. `lab` still may not become an
optimisation target — `OBJ2` holds and any tidiness metric would still be an agent's
invention — but the reason it was rejected is now legible rather than mysterious.

**The stripboard is a test fixture, not the deliverable.** Every circuit here is bound for a
manufactured PCB. That bounds how much effort is worth spending past the benchmark: the
target is to **match a board the owner built and used**, not to find an optimum. A search
that reaches the hand result has done its job; one that spends ten times the budget to shave
a further cut has misunderstood what the board is for.

## Why

Four days of work on the existing pipeline produced a layout with **28 cuts on 14 nets
and zero wires**, against hand layouts of **5 cuts on 11 and 13 nets, with four wires
each**. The last three tasks bought 6 cuts, then 0, then 0.

The reason is not that the problem is hard. These are small instances — 11 to 22 nets,
16 to 34 parts, grids of a few hundred holes — and a person solves one in an evening.
The reason is architectural, in three parts, each measured.

### The search cannot express the move that matters

`tools/stripboard/place.ts:239` states the rule: **one gesture per candidate.** Using a
wire requires three coordinated decisions — move a pad onto its own strip, move it to a
column a wire can reach, *then* run the wire. The first two pay nothing alone. **A
one-gesture greedy climber cannot see past the first**, so the third never becomes
available. Measured: a 20,000-evaluation run enumerated **one** `add-wire` candidate and
the fork refused it on reach, where §6.9 of `docs/stripboard/pipeline-verification.md`
records 7,417 in an earlier era.

### The tool cannot express it either

The pinned fork documents eleven verbs. **Adding a wire is not one of them** — wires go
on through `--author --op add-wire`, absent from `--help`. And `--move-batch`, the one
primitive applying several gestures atomically, accepts **only `move` and `rotate`**.

### And the inner loop is a subprocess

**126,435 fork invocations for 20,000 evaluations** — 6.3 launches per candidate, ~12 ms
each, ~25 minutes. Three runs ended `Q4 budget-exhausted` without settling, so **every
figure this project has reported is "best found before the clock ran out."**

### The decision, and its reason

The owner ruled out the cheaper alternative — extending the fork so a candidate could
express move-and-wire while keeping the architecture — on grounds stronger than the
performance argument this document originally made. **His words, verbatim:**

> *"I think being tied to a forked gui for our core logic is a bad idea. We can use
> veroroute as a reference and a witness—even a human starting point, but the core
> agent-focused layout solution code should be ours."*

That settles the boundary on where the dependency sits rather than on how fast it runs,
and it holds even if the fork were free to call.

## What changes

**The model moves into this repository. VeroRoute becomes reference, witness, and a
human's input device.**

### The model

A grid of holes; strips of copper broken by cuts into segments; parts occupying hole
sets; wires joining two holes; nets as sets of pins that must be connected. Connectivity
is union-find over segments and wire endpoints. Low-boost is 448 cells.

Two things dissolve rather than being managed:

**Cuts stop being a decision.** A cut is determined by placement plus wires — see the
contract below, which revision 1 stated too loosely.

**A pad becomes a part with one hole.** Tasks 1, 2, 8 and 9 of
`2026-10-13-buildable-pultec-layouts.md` exist solely because `PAD` and `PART` are
different species in the fork's dump. Here they are one thing at different sizes, and
**that class of defect stops being expressible.**

### Cut derivation — the contract (first review, finding 1 — accepted with one correction)

**An electrically significant contact is a component pin OR a wire endpoint.** Revision 1
said "two different nets in adjacent runs of holes," which reads as pins only. A wire
endpoint anchored in an otherwise empty hole makes that hole — and its strip —
electrically meaningful, and **a strip carrying no pins at all can still be a routing
conductor between two wire endpoints.** A derivation that walks only pins misses both.

So, per strip: take its significant contacts in column order, label each with its
reference net, and group them into maximal runs of one net. **A cut is required between
each adjacent pair of runs belonging to different nets.** The count is
`Σ(runs per strip) − (occupied strips)`, the identity this repository already uses.

#### How a wire endpoint gets its net (second review, finding 1)

A component pin's net comes from the circuit. **A wire endpoint has none intrinsically**,
and revision 2 did not say where one comes from — the largest remaining gap in it.

**A wire carries a DECLARED net, and both of its endpoints must resolve to that net.**

**Where this document pushes back on the review's diagnosis, because it changes the fix.**
The review describes a circular dependency — cuts need net labels, labels depend on wire
connectivity, connectivity depends on cuts. **That is a fixpoint, not a cycle**, and it
resolves in a fixed order: build the uncut graph (each strip whole, plus wires), propagate
net identity outward from component pins, find conductors carrying two nets, derive cuts,
re-split, recompute. It terminates. And the safety does not come from the derivation being
acyclic — **it comes from the verifier being independent of the derivation**, which is why
`HC8` moves inward as a precondition rather than remaining a post-hoc check.

**Why declared ownership is nonetheless right, for a stronger reason than the review
gives.** The review favours it because invalid proposals become easier to detect. The real
reason is that **a wire's net is an INPUT to the decision to add it, never a discovery.**
The constructive seed adds a wire *because* net X must span two strips; the identity is
known before the wire exists. A wire whose net cannot be named from pins is not ambiguous
— **it is a wire that connects nothing**, and the model refuses to propose it rather than
labelling it after the fact.

So: a wire declares its net; a wire whose declared net is not reachable from a component
pin through the candidate's own connectivity is **refused by name, at construction**; and
a strip carrying only wire endpoints is a legitimate intermediate conductor whose net is
the one its wires declare.

**The verifier ignores the declaration entirely.** Copper reconstruction establishes what
a candidate actually connects, from geometry alone, and compares that against the
reference netlist. The optimizer may use intended identities to build; the verifier may
not use them to judge. A candidate whose declared nets agree with its wiring but whose
geometry does not is exactly the failure this separation exists to catch.

**Cut position needs a convention, because several positions are electrically
equivalent and not physically equivalent.** Between two runs there may be many empty
holes; a cut in the wrong one can foul a component lead, a solder bridge, or a wire
anchor. The convention is stated in the implementation plan, not invented here, and it
must be a declared rule with a test rather than an emergent property of a loop.

**Required is not sufficient, and both are verified per candidate.** Separating nets does
not prove each net is whole. Two invariants, checked in the model **before** a candidate
is scored, not after optimisation:

1. no copper-connected component holds terminals of two different reference nets;
2. every reference net's terminals lie in one component.

**Where this document pushes back on the review:** these are not new invariants to
define. They are `HC8`, which exists, is tested, and has a negative-fixture suite, and
the acceptance ordering already puts open-net count first. The defect was in revision
1's prose, not in the project's model. What changes is that `HC8` moves **inward** — from
a check on an exported artifact to a precondition on every candidate — which is cheap
in-memory and was not affordable at 12 ms a look.

### Materialization — model to `.vrt` (first review, finding 2 — accepted in full)

Revision 1 assigned VeroRoute the job of writing the `.vrt` and never said how a complete
desired board state becomes one. That was the largest hole in it.

**A declarative board-state import is added to the fork**, and the optimizer emits a
complete placement-and-routing description that VeroRoute materializes atomically.
Gesture replay is rejected: replaying thousands of moves would carry the old
architecture's coordinate shifts, failed moves and state divergence into the new one,
which is four days of this project's evidence. Writing `.vrt` bytes ourselves is also
rejected — it is a binary format, and making us the writer of the artifact VeroRoute is
meant to witness would destroy the independence the boundary exists for.

The contract specifies: stable component identity and pin mapping; absolute placement
coordinates and orientation; wire endpoints and explicitly required cuts; board
dimensions and strip orientation; failure behaviour when a state cannot be represented;
and a **round-trip check that the exported `.vrt` reconstructs the same electrical and
physical model.**

**The governing clause, from the review and adopted verbatim in intent:** VeroRoute must
not silently repair or reinterpret a candidate. **If it changes the layout, the exported
result is a different candidate and must be graded again.**

#### Two equivalences, and a fork behaviour that forces the distinction (second review, finding 2)

Revision 2 required both that VeroRoute not reinterpret a candidate **and** that it derive
cuts independently. The second review is right that those conflict as written: if our
model and AutoFill choose different but electrically equivalent cut positions, revision 2
does not say whether that is a failed round trip.

Two equivalences, and they are not interchangeable:

- **Physical-state equivalence** — identical placements, orientations, wire endpoints,
  strip geometry **and cut positions**.
- **Electrical equivalence** — identical connectivity, wherever interchangeable cuts land.

**The importer's round-trip check requires PHYSICAL-STATE equivalence.** Electrical
equivalence is insufficient for an artifact a person builds from: two electrically
identical cut placements are not equally easy to make, and one of them may foul a lead or
a wire anchor. VeroRoute's independently derived cut set is compared **separately**, and a
disagreement is **reported, never silently adopted.**

**A fork behaviour makes this a requirement on the import feature rather than a
preference, and the second review could not have known it.** `tools/stripboard/score.ts:32`
and `tools/stripboard/cut-necessity.ts:26` both record that **`AutoFillVero` re-derives the
whole cut set every time a candidate is painted.** So the fork does not merely hold an
opinion about cuts — it will overwrite ours on materialization. The declarative importer
must therefore **suppress or survive AutoFill**, and physical-state equivalence has to be
actively defended rather than obtained by passing cut positions in and hoping. Without
that, every materialized board silently becomes AutoFill's candidate rather than the
optimizer's.

**Dependency risk the review did not name:** this makes the fork a hard dependency on a
feature only this project uses, and pushing to `oletizi/veroroute-perfboard` was an
owner-authorised block (`OB1`) for weeks. It is unblocked — *"you can do whatever you
want with the fork"* — but the fork now sits on the critical path for producing a
buildable artifact, where today it sits on the critical path for searching.

### The core runs without VeroRoute, and a test enforces it (second review, finding 4)

The owner's decision rejects tying core logic to a forked GUI. Revision 2 then made a
custom fork feature necessary to produce any artifact — so the dependency was pushed
outward and nothing stopped it creeping back.

**The invariant:** the model, cut derivation, the connectivity verifier and the search
**run with VeroRoute not installed.** VeroRoute is invoked for exactly three things:
importing an existing layout as a starting point, materializing a selected candidate, and
independent comparison. The core's tests use **native TypeScript fixtures — not `.vrt`
files and not subprocesses** — and the materialization adapter is replaceable without
touching the optimizer.

**This is enforced by a test rather than stated as a principle**, which is the part the
review left implicit and the part that matters here: a test that exercises the core with
the binary absent, and fails if anything in the model reaches for it. This project has
repeatedly had principles that nothing enforced — the renderer that could not draw a
Pultec board, the leak metric that watched the wrong directory, the `[external]` mark on
an agent-written claim. A stated boundary with no test is the same shape.

It also buys the thing the owner's decision was actually for: if the export tool is ever
replaced, the optimizer does not move.

### The search

Constructive seeds, then local improvement with **compound candidates**, including
move-and-wire as one proposal.

**Seeds are constraint-aware (first review, finding 6 — accepted).** A part's terminals have a
bounded separation — `minSpanHoles` and `maxSpanHoles`, which exist and are tested — so
assigning its two nets to strips it cannot span produces a seed that is impossible to
realise and wastes the optimizer's time repairing a decision that should never have been
made. The seed builder checks feasibility before committing a strip assignment, and **a
failed construction names the conflicting assignments** rather than silently substituting
a different placement.

**The algorithm is deliberately not fixed here.** Once an evaluation costs microseconds,
annealing, late-acceptance hill climbing and near-exhaustive search all become available,
and which wins is a measurement. What this spec fixes is the shape. Naming an algorithm
here would assert what nobody has measured — the failure mode this project's record
documents five times over.

### Termination (first review, finding 3 — accepted; revision 1 was wrong)

Revision 1 said the search should run "to convergence rather than to a budget." **That is
not a termination policy.** A hill climber converges to a local optimum; annealing can run
forever; a search can stall for millions of evaluations without proving anything. Cheaper
evaluations do not remove the need for a limit.

Worse, revision 1 loosened something this project already had right. `CRITERIA`'s `Q1`–`Q6`
already encode a budget, a stagnation stop, and `Q1`'s at-floor clause **is** the
proven-lower-bound termination the review asks for. **The stopping taxonomy is retained
unchanged; only the budget rises**, because the reason it was small is gone.

An exhausted run reports the best valid candidate found and **does not claim optimality.**
That separation — stopping is about the run, admissibility is about the candidate — is
already recorded as a deviation in the previous plan and stands.

## Verification chain (first review, finding 5 — accepted and sharpened)

```
circuit netlist + physical constraints
  → TypeScript model: candidate, derived cuts, HC8 invariants per candidate
    → VeroRoute: declarative import, atomic materialization, round-trip check
      → independent copper-reconstruction verifier against the reference netlist
        → existing acceptance and adoption gates, unchanged
```

**Where this document is sharper than the review:** "agreement is not conclusive proof"
is true but blunt. The useful statement is *which* parts are independent. VeroRoute's cut
derivation and AutoFill are third-party C++ written years ago with no knowledge of this
model, so **that** comparison is genuinely independent and a disagreement is a real bug
alarm. The **inputs** are not independent: footprints, pin patterns and the netlist all
come from us. **A wrong footprint makes both implementations agree and both wrong.** That
is the precise residual risk, and it is why the copper-reconstruction verifier is retained
as a distinct acceptance mechanism rather than folded into the comparison.

## Benchmarks (first review, finding 4 — accepted)

The benchmark is **boards the owner laid out by hand and then built and used.** Both
currently pass `make check` and both declare a schematic, so neither has drifted from the
netlist it was laid against — verified 2026-10-14.

| board | nets | cuts | wires | extent | status |
| --- | --- | --- | --- | --- | --- |
| **feedback** | 11 | 5 | 4 | 16 × 18 | **primary** — built, passes |
| **buffered** | 13 | 5 | 4 | 20 × 34 | secondary — built, passes |

**Primary measure: exact-instance regression.** Run the optimizer on the same circuit,
the same footprint set and the same board constraints as each hand layout, and require it
to **match or improve the construction cost** on that instance.

**Cuts-per-net is demoted to a cross-circuit diagnostic**, and revision 1 was wrong to
build a target on it. This project's own cost identity says cut count is driven by
occupied strips and segment runs, **not** by net count, so two circuits with equal net
counts can differ entirely in pin count, connectivity and routing difficulty. The ratio is
reported across boards; it is not a law.

**Stock:** 34 strips × 27 columns. `buffered` exceeds it by seven columns. **This is not
evidence of a limit of hand layout** — the owner's account is that he did not measure his
stock first. Fitting 27 columns is an ordinary constraint, not a victory over the hand
result, and revision 1's framing of it as one was a flattering story the facts do not
support.

### Excluded, and why

- **`lab`** — never built; abandoned as *"weirdly complicated."* Its zero cuts are **not**
  an achievement to emulate.
- **`staged`** — provenance unestablished; the owner does not trust his recollection and
  the repository does not record who placed it.
- **`B1-frozen`** — withdrawn as a benchmark. See below.

### `lab`'s role as negative control (first review, finding 7 — accepted with a guard)

"Warn when a layout is lab-shaped" is not testable, and revision 1 should not have left it
there. `lab` exercises the **human-review workflow**, not the optimizer: present the
generated layout and `lab` side by side, with their metrics and their renderings, and have
a reviewer say why one is harder to build or follow.

**The guard this document adds:** anything that exercise produces lands as an
**owner-settled rule**, never an agent-derived one. "Identify deficiencies in the standing
rule library" is one step from a legibility metric arriving through the back door, and
`lab` is precisely the evidence that such a metric would be an agent's invention standing
in for the owner's taste. `OBJ2` holds.

## Corrections to the record

**`B1-frozen`'s provenance is not `[external]`.** CRITERIA line 455 records it as *"the
owner's hand layout."* The owner states he did not produce it. The only source was an
agent-written sentence in `tests/fixtures/stripboard/provenance.txt`, cited into an
owner-approved specification — so **an unverified agent assertion became the external
standard the pipeline is graded against**, the precise failure the governing invariant
exists to prevent. The mark becomes *unverified*; the fixture is retained for regression,
not as a bar.

**`V3`'s deviation is superseded.** A deviation of 2026-10-13 held `B1-frozen` the wrong
target because it could not run. It is the wrong target for a better reason: nobody can
say what it measures.

## What is explicitly NOT changing

The criteria document; the adoption gate and its ten refusals; the span, footprint and
pin-pattern data; the provenance chain; the refusal discipline; the report; `make check`
and the four buildability verifiers; `Q1`–`Q6`. **None of those is the problem.** This
replaces the inner loop — `climb*`, `moves*`, and the per-candidate fork traffic.

**`OBJ1` and `OBJ2` are untouched.** No new term in `F`, no eleventh hard constraint, and
no legibility metric.

## Risks, stated rather than buried

**We own a cut-derivation implementation.** If ours and AutoFill's disagree we have two
truths. Accepted: the disagreement is detectable by construction, and the alternative is
inferring cost through a subprocess we cannot see inside.

**Shared inputs defeat the witness.** A wrong footprint or pin pattern makes both
implementations agree and both wrong. Mitigated by retaining copper reconstruction against
the reference netlist, not by the VeroRoute comparison.

**The fork moves onto the artifact critical path.** See *Materialization*.

**A rewrite discards working code.** `climb*` and `moves*` are tested and correct for what
they do. The case is that what they do cannot reach the answer, not that they are faulty.

**The constructive seed could encode taste.** A seed heuristic tuned to make a benchmark
pass would be an agent grading its own work. Mitigation: seeds come from several orderings,
judged only by the existing acceptance rule, never hand-tuned against a benchmark figure.

## Decisions

| decision | who | why |
| --- | --- | --- |
| Core layout logic is ours; VeroRoute is reference, witness and human starting point | **[owner]** 2026-10-14 | verbatim: *"being tied to a forked gui for our core logic is a bad idea… the core agent-focused layout solution code should be ours"* |
| Option A (extend the fork, keep the architecture) is rejected | **[owner]** 2026-10-14 | *"Don't worry about option A"* — decided on where the dependency sits, not on speed |
| The fork is in scope to change, or to abandon | **[owner]** 2026-10-14 | verbatim: *"you can do whatever you want with the fork, including abandon it for something more suitable if need be"* |
| Benchmark is `feedback` and `buffered` | **[owner]** 2026-10-14 | the two boards he hand-laid and built; `lab` and `staged` excluded on his instruction |
| `lab` is a negative control, not a target | **[owner]** 2026-10-14 | verbatim: *"It was weirdly complicated. so I abandoned it"* |
| `buffered`'s width overrun is not a human limit | **[owner]** 2026-10-14 | verbatim: *"I was lazy and didn't measure my stock… not because I was incapable"* |
| No legibility term despite `lab` | agent, under `OBJ2` | adding one would be an agent authoring the criterion its own output is graded by |
| Algorithm left unfixed | agent | which search wins is a measurement |
| `HC8` moves inward as a per-candidate precondition | agent, after review | cheap in-memory; it was unaffordable at 12 ms a look |
| The budget is set by experiment, and no number is proposed here | **[owner]** 2026-10-14 | verbatim: *"We need to arrive at that by experimenting and gathering empirical evidence, not by fiat"* |
| A wire declares its net; the verifier ignores the declaration | agent, after second review | a wire's net is an input to the decision to add it, not a discovery; a wire whose net is unnameable connects nothing |
| The importer's round trip requires physical-state equivalence, not electrical | agent, after second review | two electrically identical cut placements are not equally buildable, and `AutoFillVero` re-derives every cut on paint |
| The core model, verifier and search run with VeroRoute absent, enforced by a test | agent, after second review | the owner's boundary was a principle nothing enforced; this project has had several |
| Panel connectors are a hardware preference, not a design dependency | agent, from the owner's earlier suggestion | the problem it addressed does not exist once a landing hole is a one-hole part |

## How the budget is set — by experiment, not by fiat

`Q1`–`Q6` are retained and the budget rises. **How far is a measurement, and this document
deliberately names no number.**

The owner was offered the choice and declined it on the right grounds — *"We need to arrive
at that by experimenting and gathering empirical evidence, not by fiat."* That is also a
correction to how revision 2 framed it: offering an arbitrary number to the owner for
ratification would have repeated the previous budget's mistake with better provenance. **The
20,000 that three runs died against was never measured either**; it was sized from timings
of a pipeline that spent 6.3 subprocess launches per candidate, and it stopped meaning
anything the moment the inner loop moved in-process.

**The experiment that yields it**, run once the model exists and reported like any other
measurement:

- **A bounded ladder, not one enormous run** (second review, finding 3). Revision 2 said
  "far beyond any plausible setting," which is undefined and an invitation to an unbounded
  experiment. Instead: run each benchmark instance at **successive orders of magnitude**,
  recording the best objective seen at each, and **stop at a stated resource ceiling** —
  wall-clock and disk, both named in the implementation plan, both reported.
  This is not pedantry in this repository: an implementer reading a measurement instruction
  this week produced 126,435 invocations and 3.2 GB of output, and a full disk followed.
- Report the **marginal improvement** each step of the ladder buys, which is the figure a
  budget is actually chosen from — not the raw curve.
- Report the spread across seeded restarts at several budgets, because a budget that only
  one lucky seed needs is not a budget.
- **Set the value from those curves, as a deliberate edit carrying the run that justifies
  it**, under `K3`'s ratchet — the same discipline every other parameter in
  `stripboard/rules.json` is held to.

Until that run exists the budget stays a **declared unknown** rather than a plausible
default, for the reason `CRITERIA` already gives for `τ`: a number used silently is a worse
failure than one used knowingly, and a proposed default with nobody behind it is the worst
of both.

## Open question for the owner

**Panel wiring: soldered or plugged?** Earlier today the owner suggested moving the controls
off the board and connecting them with wire-to-board connections — in plain terms, putting a
pin header on the board for the panel wiring instead of soldering each pot and switch wire
into its own bare hole.

**That suggestion was aimed at a problem this design removes.** Scattered single landing
holes were unmovable, unspaceable and invisible to the wire planner; a connector is an
ordinary part with an ordinary footprint, so the difficulty disappeared. Here a landing hole
is already just a part with one hole, so **nothing in the search needs it.**

What remains is a **hardware preference about building and servicing the board**, not a fix:
soldering panel wires directly into holes, against plugging them into a header. It blocks
nothing, no agent should decide it, and it can be answered whenever the owner is next
thinking about the enclosure. If the answer is "connectors," grouping is then decidable by
measurement, since the owner has said he has no strong preference there.
