---
title: Stripboard pipeline — the acceptance criteria
date: 2026-10-10
status: draft-for-owner-review
---

# What counts as an acceptable stripboard layout

**This is the reviewable artifact.** It is the complete set of claims about what a stripboard
layout must be, must not be, and is graded on. `2026-10-10-stripboard-pipeline-design.md` —
**PIPELINE** below — is its argument, and `2026-10-10-stripboard-placement-cost-design.md`
(**COST**), `2026-10-10-stripboard-move-verb-findings.md` (**MOVE**) and
`2026-10-10-stripboard-remeasurement.md` (**RE-MEASURE**) are its evidence base.

**Why it is separate.** The parent program design, `2026-10-08-agent-authored-boards-design.md`,
rests on one invariant:

> **An agent may never author the acceptance criteria for the specific artifact it is
> producing.**

Criteria reach an artifact through one of three channels — derived mechanically from the model,
taken from a standing reviewed rule library, or supplied by an independent reviewing agent — and
never through the producing agent's opinion. The owner is the reviewer here, and **a 2,036-line
document is not practically reviewable**, so that channel was nominal rather than real: the
criteria were about 120 lines scattered across four regions of a document that is otherwise
derivation and evidence. They are here so a person can read all of them in one sitting, disagree
with any single line, and have that disagreement be actionable.

**This document is the authority.** Where it and PIPELINE disagree, this wins; PIPELINE cites
these numbers and keeps no second copy of any criterion.

## How to read it

Every criterion is numbered and individually addressable: "A2 is wrong" or "HC9 is wrong" names
exactly one line. Each states what is required and, in a clause, **why** — a criterion whose
reason is missing cannot be argued with — then **how it is checked**, so one that cannot be
checked mechanically is visible as such, then **where it came from.** Provenance is per criterion
because the invariant is about provenance, and a criteria document that does not record it fails
at its one job:

| tag | meaning |
| --- | --- |
| **[owner]** | the owner decided it — the value, the reasoning, or both |
| **[external]** | from an artifact outside this program: low-boost's hand layout, part datasheets and IPC-A-610E via `lib/kicad/lead-span.ts`, or the sibling repository's tooling |
| **[model]** | derived mechanically from the cost identity, the circuit model, or the tool's own reported behaviour |
| **[parent]** | the parent design's governing invariant or its stated S1a gate |
| **[review]** | from an independent third-party review — of PIPELINE's first draft, or of this document — the invariant's third channel, not the producing agent's opinion, and the provenance the owner should check hardest. A review finding is **adjudicated by the owner** before it lands; where he rejected one, the rejection is recorded beside the criterion it was aimed at |

**The naming collision, and the mapping, stated once.** PIPELINE carries two numbered tables
whose prefixes collide: hard constraints `H1`–`H10` without a hyphen, honest limits `H-1`–`H-13`
with one. Here the hard constraints are **`HC1`–`HC10`**, and **`HC`*n* is PIPELINE's `H`*n*** —
which for `HC1`–`HC7` is also COST §4.1's `H`*n*. Nothing is renumbered, only prefixed, so every
citation of `H5` elsewhere in the repository still resolves. PIPELINE's `H-`*n* rows are
**limits, not criteria**, and appear here only as `limit H-2`, `limit H-3`, `limit H-11` and
`limit H-13`.

**Where the criteria come from.** Every criterion is extracted from PIPELINE, except **K5** and
**REP5**, which a second third-party review of *this* document produced and the owner adjudicated
on 2026-10-10 — the invariant's third channel, used as intended, and tagged **[review]**
accordingly. What PIPELINE or that review implies and neither states is in §10, as a gap for the
owner rather than something filled in.

---

## 1. The objective

**OBJ1 — The objective function.** The search minimises **`F = C + ρ_w·W + ρ_s·B`**, with `C`,
`W` and `B` the counts of `CUT `, `WIRE` and `SOLDER` lines in `--dump-board` on the candidate —
because every term is then a line count in a report the producing agent did not write, and `C` is
not an opinion about the placement but an exact function of it. `B` prices something the agent
does not place, VeroRoute deriving the bridges itself; `W` is the opposite.
*Checked:* three line counts on the dump, reproduced by a second code path (PIPELINE V1), with
the identity re-checked on every candidate scored (V2). *Provenance:* **[model]** — COST §4.1,
adopted unchanged. The weights are PAR1.

**OBJ2 — No legibility, tidiness or neatness term in `F`, and none may be added.** Because a term
an agent scores itself on *is* the agent authoring its own acceptance criteria — the failure the
parent records, a floorplan graded against intent the grading agent chose, reporting success on a
board with the input stage 8 mm from the output stage. Legibility is not dismissed: it enters
through a reviewed, circuit-independent rule library or an independent reviewing agent (G5), never
through `F`. **The test a proposed term must pass:** it is arithmetic on fields the fork prints,
with no latitude inside it; anything else belongs in the rule library or with the reviewer.
*Checked:* review, not code — this is the criterion whose violation looks like an improvement.
*Provenance:* **[parent]** (PIPELINE D3).

**OBJ3 — The declared lexicographic ranking.** Candidates `F` cannot separate are ordered by
**cuts, then wire bridges, then solder bridges, then occupied bounding-box area
`A_occ = (maxRow − minRow + 1) × (maxCol − minCol + 1)`, then pin-bounding-box wirelength** —
declared as a string constant beside the ranker stating the order and the reason for each
position, because a reviewable ranking beats a weighted sum with tuned coefficients. `A_occ` sits
below all three construction-cost terms because a smaller board that costs more to build is not an
improvement, and lexicographic order is what guarantees area can never buy a cut; above wirelength
because `A_occ` measures the thing while wirelength is a labelled proxy for track length, which
nothing here derives (limit H-11). **A ranking term is not a term in `F`** and cannot make the
search accept a worse `F`. `A_occ` is not a constraint — HC6 is; `A_occ` only asks which of two
fitting boards uses less of the stock.

**OBJ3.1 — Spanning to an unused strip is preferred to cutting one. [owner], 2026-10-10.**
Given a choice between breaking a strip and moving a part onto one that is not carrying a net,
take the strip. The owner's words: *"I want to favor spans to unused strips over cuts."*

This is already what the ranking and `F` do, and it is recorded so that it stays that way. The
identity `C = N + J − S_occ` takes `S_occ` with a **negative** sign, so every additional strip a
layout occupies removes a cut outright — spreading is not a trade against the cost function, it is
how the cost function is minimised. The only term that pulls the other way is `A_occ`, and it is
lexicographically below all three construction-cost terms precisely so it can never buy a cut
back. **Promoting `A_occ` above cuts, or folding an area term into `F`, would invert this
preference, and is refused.**

Two consequences worth stating where the preference is, rather than leaving them to be rediscovered:

- **The stock is what bounds the spread, not tidiness.** HC6 refuses a layout that does not fit
  34 × 27. Within that, a layout using more strips is not worse for using them — the board is
  already bought. The four unfinished Pultec layouts occupy three to five strips of thirty-four
  and pay 23 to 65 cuts for the privilege; that is the failure this preference exists to prevent.
- **It does not make the floor reachable on its own.** `C_floor = max(0, N − R)` is zero for every
  Pultec section, because each has fewer nets than the board has strips. Reaching it needs every
  net on its own strip, which needs parts that can span between those strips, and the B32529 film
  capacitors reach four holes where mid's net graph wants six. So spreading removes cuts until
  reach stops it, and what remains is bridged by a wire — which is why PAR1 prices a wire at a
  quarter of a cut. The constrained floor is not derived (limit H-2).
*Checked:* the ranking tuple is a canonical metric (PIPELINE §10.1); `A_occ` is computed from
`BOUNDS` and by a second code path over the same four integers. *Provenance:* **[external]** shape
(the sibling repository's `RANKING`); **[review]** for `A_occ`'s presence and position (D19).

---

## 2. The hard constraints

Ten, and nothing in them is tradeable. **A1 is the verdict that all ten hold.**

| | Required, and why | Checked by | From |
| --- | --- | --- | --- |
| **HC1** | **Every net electrically whole**, because a board that does not conduct has no cost worth reporting. | `--check BOARD --netlist NET` exits 0 and reports no `incomplete` net. | [model] |
| **HC2** | **Cuts actually derivable**: `CUT_STATE COMPUTED`, never `UNRESOLVED`, never `NOT_APPLICABLE`. A zero cut count on an unresolved board does not mean no cuts are needed, it means they could not be worked out, and `C` is the count a derivation produced. An unpainted board reports `UNRESOLVED` with no cut list, so the identity is refused there rather than silently wrong. | the dump's `CUT_STATE` line. A negative `J` is a sound cheap extra reading of the same condition and **not** a substitute (V2, PIPELINE §2.2.1). | [model] |
| **HC3** | **Nothing floating.** Every verb that lifts a part and puts it back records `GetIsPlaced()` for each affected component and **refuses without writing its output** if a part that was placed is not placed afterwards — because the measured failure is a verb that exits 0, prints nothing, writes the board with the part off it, and leaves every term of `F` reading healthy. **It is the overlap check too:** `CanPutDown` refuses a colliding placement, so an overlapping move yields a floating part rather than an overlapping board. | the `PART` line's placement field is not `FLOATING` **and** every placed part prints its `PIN` lines — two assertions, so a change keeping one signal and dropping the other fails loudly. Both are `Component::GetIsPlaced()`, so neither is copper; HC8 is. | [model], strengthened on measurement (D6) |
| **HC4** | **Every lead span within the tool's range, 2–16 holes.** Its lower end is a fact about VeroRoute and not about any part, which is why it does not discharge HC9. | `CompTypes::GetMinLength`/`GetMaxLength`, as `lib/kicad/import-string.ts` already enforces `MAX_SPAN = 15` grid steps. | [model] |
| **HC5** | **Every lead span within the part's physical reach** — at or below the family's `maxSpanHoles`, because the tool will stretch any two-terminal part to any span in its range and the part will not, and a span the part cannot make is not a lever but a fiction. | per-candidate comparison against `maxSpanHoles` in `lib/kicad/lead-span.ts`. **Refuse without it** (PAR2). | [external] values, [model] constraint |
| **HC6** | **The layout fits the stock the owner bought: 34 strips × 27 columns**, the board he usually uses. The quantity checked is the **occupied extent**, not the canvas — `GRID` is VeroRoute's drawing area and `--import` leaves it at a default, so a canvas larger than the stock says nothing about copper. A layout whose parts fit inside 34 × 27 can be cut from that board whatever its canvas says. | the pin extent over the dump's `PIN <name> <pin> AT <row>,<col>` lines — `max − min + 1` in each axis — against 34 × 27. **Pin extent is a LOWER bound on physical extent**, because a body overhangs its leads; `BOUNDS` (M1.1) replaces it with the exact figure and tightens the check. A board cut from a different piece declares its own size in `boards/<board>/perfboard.json`, which overrides the default. | [owner] 2026-10-10, measured from his own stock: 27 columns counted, strips counted as "about 35" and recorded as **34** on his instruction to take the conservative figure |
| **HC7** | **The layout still matches the circuit.** | `--check`'s schematic-delta section is empty. | [model] |
| **HC8** | **Netlist equivalence, reconstructed from copper**: the connected components of the board's copper, computed outside VeroRoute, partition the pins exactly as the reference netlist does — no reference net in two components (an **open**), no two reference nets in one (a **short**). Because HC1, HC2, HC3 and HC7 each read VeroRoute's own conclusion, from the subsystem the optimiser perturbs, and that subsystem is known to have a hole — `GetBoardMembership` iterates what the *component* records rather than the copper, which is why a floated part left the `NODE` block identical and went undetected. And because a completeness check is structurally blind to a short, which leaves both joined nets reading complete: nothing in HC1–HC7 looks for one at all. | the reconstruction below, over the geometry contract below. | [review] (D16) |
| **HC9** | **Every lead span at or above the part's own physical minimum** — the family's `minSpanHoles` — because HC4 bounds a span by the tool and HC5 bounds it above by reach, and **nothing bounded it below by the part**: `--stretch shrink` can compress a DIN0207, 6.3 mm of body on a 10.16 mm nominal pitch, to a 2-hole 5.08 mm span no bending achieves, and every other check here passes it. | as HC5, against `minSpanHoles`, **in the grader regardless of the generator**, because the generator only proposes. | [review] (D18), [external] values |
| **HC10** | **Every placed part's pins lie on straight lines parallel to the strips** — the owner's rule, and **a cost judgement rather than a geometric impossibility.** A footprint whose pins sit on a circle, an arc, or any pattern **not decomposable into rows** parallel to the strips is **refused rather than placed**, because a strip is a straight line of copper: a round pattern crosses a different strip at nearly every pin and shares one with pins it must not share with, so **nearly every such hole becomes a cut** — and the body then sits over holes it does not use. Such a board could be routed, with enough cuts; the owner's verdict is that the cut cost is prohibitive and that he will not build it. **Rows plural, and decomposability is the test:** a DIP-16 is two rows parallel to the strips, decomposes, and passes. | a **footprint-level** check against the span/footprint data, because whether a footprint's pins decompose into rows parallel to the strips is a property of the **footprint**, not of a placement: the classification is per footprint family, a non-decomposable family refuses **by name** before any placement exists to grade, and `lib/kicad/lead-span.ts` — keyed by the footprint name the netlist carries, already refusing an unlisted family by name — is the place by shape. **It carries no pin-pattern field yet; §10.3 is that gap.** In A1. | [owner], 2026-10-10 |

**HC8 is checked by a reconstruction, and the gate is only as good as its independence.** A module
in this repository that reads the dump text and nothing else; builds the copper graph from exactly
the three join mechanisms COST §1.5 enumerates — an uncut within-strip neighbour, a derived solder
bridge between adjacent strips at a shared column, a wire — and no fourth; takes pin-to-net from
the reference netlist export, upstream of VeroRoute entirely; and **never reads the `NODE` lines
or any `nodeId` field**, that being the independence. It shares no code with the scorer or with
`--check`, still produces a verdict from a dump whose `NODE` block is emptied and whose `CUT` node
ids are garbage (V11), rejects a seeded open and a seeded short **by name** (V4), and agrees with
the reference netlist on the frozen fixture and on all four hand-laid boards of PIPELINE §3.5. A
gate that re-read `GetBoardMembership` under a new name would report an independence it does not
have, which is worse than no gate because it looks like one.

**What HC8 is independent of, stated exactly, because the honest scope is narrower than
"independent".** It is **independent connectivity reconstruction from VeroRoute-exported physical
geometry.** Independent of VeroRoute's **membership calculation** — `GetBoardMembership`, the
subsystem the optimiser perturbs and the one with the demonstrated hole — which is the
independence that matters, because that is where the measured failure was. It is **not**
independent of VeroRoute's **geometry export**: it consumes it, so a defect in the export is a
defect optimiser and verifier share, and HC8 would not see it. Stronger independence would mean
parsing the `.vrt` directly, and that is **an honest limit rather than a plan** (limit H-13): a
`.vrt` is a binary `QDataStream` (PIPELINE N5), which is already the reason the sibling
repository's s-expression text tooling does not transfer here.

**HC8's geometry contract, version 1.** Every dump line the reconstruction consumes, its fields,
and the fork commit that first emitted it. Each was verified against the pinned fork
(`veroroute.pin`, `2d67ec6`) on 2026-10-10 by running `--dump-board` and by reading
`Src/Headless_dump.cpp`, `Src/Headless_dump_pins.cpp` and `Src/Headless_dump_wires.cpp`; every
commit below is an ancestor of the pin.

| line | fields the reconstruction reads | first emitted by |
| --- | --- | --- |
| `GRID <rows> <cols>` | the board's extent in holes, so a strip's run is bounded | `2cfaad8` |
| `VERTICAL_STRIPS <0\|1>` | the strip axis, so "the same strip" is a defined neighbour relation | `e238b13` |
| `PIN <name> <pin> AT <row>,<col>` | one **lead's** hole, per pin of every placed part | `2cfaad8` |
| `CUT <row>,<col>,<nodeId> <row>,<col>,<nodeId>` | **both positions only**; both `nodeId` fields are discarded | `317e6b4`, positions corrected to ground truth in `e5fdfcf` |
| `SOLDER <row>,<col> <row>,<col>` | the two holes a derived bridge joins | `317e6b4` |
| `WIRE <name> <FLOATING\|AT <row>,<col>> ENDS <end> <end>` | the two ends a wire joins; a `FLOATING` wire joins nothing | `121dca1` |

**The one thing in the contract that is a definition rather than data**, stated precisely because
nothing in the dump states it: **two holes are electrically connected by an uncut strip when they
lie on the same strip — equal `row` if `VERTICAL_STRIPS 0`, equal `col` if `VERTICAL_STRIPS 1` —
and no `CUT` line separates them.** A `CUT` line names two **strip-adjacent** holes and severs the
copper **between** them — `Headless_dump.cpp`'s own words, *"naming the two strip-adjacent holes
to sever the strip between"*, and no `CUT` line on any board in this repository names a
non-adjacent pair (measured here, 2026-10-10, over every `.vrt` under `boards/` and
`tests/fixtures/`). So two holes on one strip are connected exactly when no `CUT` pair lies
strictly between their along-strip coordinates. Everything else in the graph is an edge read
directly off a `SOLDER` line — itself *"two strip-adjacent holes on two different, neighbouring
strips"* — or a `WIRE` line.

**Occupancy and electrical contact are already separate primitives, and the question is closed.**
A `PIN` line reports a **lead's** hole only, never a hole the body merely covers:
`tools/guide/dump.ts` states it at the top of the file — a part's `SPAN` is *"its footprint's own
column span (body width for an electrolytic) - NOT a lead span"*, and *"a lead's actual hole comes
ONLY from a `PIN` line; nothing here derives a position from SPAN."* So the reconstruction never
has to infer which covered holes conduct; it is told which holes hold leads and derives nothing
from `SPAN`.

**HC8 refuses when any contracted line is absent, naming the missing line**, and never degrades
into a partial reconstruction. A dump with no `VERTICAL_STRIPS` line does not default to rows; a
dump with no `GRID` line does not infer the extent from the pins; a placed part with no `PIN`
lines is already HC3's refusal and is HC8's too. A missing line means the binary is not the
pinned fork or the grammar has changed under the contract, which is a thing to fix, not a thing to
work around. The refusal names the line and the contract version. **The version is declared beside
the reconstruction module**, and what pins it to a binary is already in the canonical hash:
PIPELINE §10.1 hashes both `veroroute.pin` and the commit the binary was **built** from, so a
grammar change arriving under the contract changes the hash rather than passing unnoticed.

**HC8's negative fixture — a wrong copper connection VeroRoute's own membership reporting does
not detect.** A board on which **two reference nets share one strip with the separating `CUT`
removed**: the copper joins them, every pin keeps the `nodeId` its component records, so
`GetBoardMembership` still partitions the pins by those records, both nets still read *complete*,
and `--check` exits 0. HC1 passes it, HC2 passes it, HC3 passes it, HC7 passes it. HC8's
reconstruction finds two reference nets in one copper component and **rejects it, naming both
nets.** What it proves: that HC8 detects a class of defect no pre-existing check detects at all,
which is the whole reason the gate exists — the open direction is the easier half and a
completeness check already covers it. It is committed with the same provenance discipline as
`tests/fixtures/pultec-low-boost-c19-floated.*`, whose
`pultec-low-boost-c19-floated.provenance.txt` is the precedent and the template: the input board
and its commit and `sha256`, the fixture's own `sha256`, the exact commands that produced it, the
binary's commit **and** its `builtCommit()`, and a section stating what may **not** be concluded
from it.

**HC9's remedy is a gate and not an audit.** The review that surfaced the gap proposed a manual
physical audit instead. Rejected: it reinstates the hand work this sub-project exists to remove, a
manual step's failure mode is that it is silently not performed, and the bound has no judgement in
it — it is a datasheet figure compared with an integer.

**HC10 is about pin geometry, not body shape**, and the distinction decides whether it is useful
or catastrophic: a radial electrolytic has a cylindrical body and two leads in a straight line and
is placeable. Read as banning round bodies it makes every electrolytic unplaceable.

**And it is a practical verdict, not an impossibility claim; an earlier draft of this document
overstated it.** The owner's words are the criterion: *"I'm not going to mount a round switch into
a stripboard. That never works. Round footprints do not work well with stripboard."* That is a
judgement about cost and about what he will build, and it is enough — a round pin pattern **can**
be routed, with a cut at nearly every pin, so framing the refusal as geometric impossibility
claims more than is true and invites a counterexample that does not overturn the rule. The
justification is the prohibitive cut cost; the authority is the owner, and the provenance stays
**[owner]**.

**HC10 and the residency data are two different instruments and both are needed.** The rotary
exclusion also lives in residency data: `circuits/pultec/off-board.ts` puts all six rotary
selectors off-board and **marks that entry permanent**, unlike the inductors, which are off-board
only pending a part choice. Residency is one circuit's own data and settles the question for
*that* circuit's parts. HC10 is the standing rule, and what it catches that residency data cannot
is **a future circuit that gives a round-pattern part a footprint and declares it on-board** —
nothing in one circuit's residency file constrains another circuit's. Where they overlap they
agree; where they do not, HC10 is the one that generalises.

**Refuse, never route around:** the part is declared off-board with its terminals wired back, as
the Pultec's selectors are; residency is the circuit's own data, so the refusal names the part and
points at the residency set and a human moves it. The rule binds **this** pipeline; PCB-mount
rotaries exist and it must not be carried into the parent's T1.

---

## 3. The benchmark

**B1-frozen — the externally authored benchmark, and the only one.** Against the exact electrical
model, footprints and board dimensions the hand layout was built for — 9 nets, 27 pins, and the
grid the fixture's own `GRID` line reports — **the pipeline must reach `C ≤ 5` with `W = 0` and
every net complete, starting from the import-placed board.** A run that does not is a failing run.
Because it is a number no agent chose, about an artifact no agent produced, measured by a tool no
agent wrote, and it is stronger than a rule file for being an *achieved* result rather than a
stated aspiration. `W = 0` is **a property of the artifact being reproduced**, not a general
preference: the owner's layout carries zero `WIRE` lines, so a reproduction needing a wire has not
reproduced it. It is stated against the *frozen* model because `C ≤ 5` at `N = 14` would require
nine occupied strips before a single net may split, against the five the owner's layout needed —
pointing the pipeline at a 14-net circuit and reporting the result as a comparison with a 9-net
hand layout. A failure is not one thing, and a run says which of the three it is (PIPELINE §3.3).
*Checked:* V3, on the frozen fixture and **only** there; a run against the scaffolded board may
not report V3 satisfied. *Provenance:* **[external]** — the owner's hand layout, commits `a33cb4d`
and `2f62ee1`, authored by `oletizi`, neither carrying agent attribution.

**B1-current — the scaffolded board's own criterion, derived.** On the scaffolded low-boost board
the pipeline must reach `(F − F_floor) / max(1, F_0 − F_floor) < τ` against **that board's own**
`C_floor` as P0 derives it, with every net complete and HC1–HC10 holding. It deliberately carries
**no absolute cut count**, because `C ≤ 5` here is a requirement nobody derived and nobody
achieved; **no `W = 0`**, because carrying that clause across would let an artefact of the hand
layout override PAR1, which the owner settled the other way; and **no claim to be externally
authored.**
*Checked:* A3's arithmetic against that board's floor. *Provenance:* **[model]** — derived, not
achieved.

**B2 — the frozen fixture is pinned, hashed, and never regenerated.** It lives under
`tests/fixtures/`, never under `boards/`, because `make -C boards/<board> check` regenerates the
export every run and decides freshness by content, so a deliberately frozen model under `boards/`
is a deliberately stale one the freshness guard would be right to fail — put the fixture where the
guard does not run rather than weakening the guard. It records `a33cb4d` and `2f62ee1` as its
provenance in the fixture directory, in text, because a fixture whose origin is in somebody's
memory is not evidence. And it is hashed like any other input, so a silently edited benchmark
surfaces as a changed hash rather than as a quietly easier test. If the extraction cannot produce
an export agreeing with the fixture board's own 9 `NODE` and 27 `PIN` lines, **the fixture is wrong
and says which number disagreed** — a fixture tuned to make its own test pass is not a benchmark.
*Checked:* G2.2 compares its hash on a B1-frozen run. *Provenance:* **[model]** — the mechanism
this repository already uses for `pt2399-core`.

---

## 4. The progress variable and its bounds

**K1 — The progress variable and the drive target.** `κ = J / (P − N) ∈ [0, 1]` is the fraction
of the available splitting a layout has committed, so `C = (N − S_occ) + κ·(P − N)`; the drive
target is `κ → 0`, which P1 seeds *at* by construction. Because `C/N`, `C/parts` and `C/P` have no
predictive power — they fingerprint the placer rather than the circuit — while `κ` is comparable
across boards of different sizes and computable from the dump directly. **`κ = 0` is not by itself
the floor and a scheme treating it as one would stop early:** at `κ = 0` the board still carries
`N − S_occ` cuts, so `C = C_floor` needs `κ = 0` **and** `S_occ = min(N, R)`.
*Checked:* `J = C − N + S_occ` from the dump, `N` the `NODE` count, `P` the `PIN` count, `S_occ`
the distinct strips among the `PIN` holes on the axis `VERTICAL_STRIPS` names.
*Provenance:* **[model]** — COST §5.

**K2 — The clustering bound: `κ ≤ κ_bench`, default `κ_bench = 0.05`.** A parameter with that
default, settled by the owner as **the hard end of a ratchet**: start at a harder bound and back
off gradually, only if it proves impracticable. It sits just under low-boost's measured
`1/18 = 0.055`, the best result any hand in this repository has reached, and **it is not the
measured value of any artifact and does not claim to be.** Because a bound set where no artifact
has ever reached yields nothing when it fails — set it at 0 and every run fails, saying only that
0 was not reached — while a bound just past the best demonstrated result makes a failure
informative: something stopped the pipeline short of a thing a person has done, and the verdict
has to name what.
**The figure the bound is unintelligible without**, carried rather than cited: the other three
hand-laid boards sit at `κ` = 0.181, 0.196 and 0.269 and **all three pass `make check`**
(PIPELINE §3.5, from RE-MEASURE), so `κ ≤ 0.06` would have refused three layouts that are built
and in service. The obvious repair is to loosen the bound to admit them, and that is **not** the
decision: those three are the cost of *not* minimising cuts rather than of trying and failing, and
a gate calibrated on the former licenses the latter.
**The first runs are expected to fail this bound, and that is the intent** — so a failure is
reported as REP2 requires and must not read as a malfunction. What makes an aggressive value
affordable rather than brave: `κ` is not load-bearing alone, the per-board derived floor being the
real grounding and A3 bounding the whole of `F` against it independently; and a layout that
reaches the floor sits at `κ = 0`, inside *any* positive `κ_bench`, so **A2 cannot refuse a
provably optimal layout** — which bounds the damage an aggressive value can do, and is all it
bounds. **What A2 can refuse is a layout that is valid and buildable**, lowest-cost of everything
found, and short of the clustering target: that is REP5's middle outcome, not a refusal of
nothing, and a verdict that reports it as inadmissible without reporting it as **buildable** has
not answered the owner's question.
*Checked:* arithmetic on dump counts; it is A2. *Provenance:* **[owner]**, 2026-10-10 (D23).

**K3 — The clustering bound moves only by ratchet.** Four conditions, all required:

1. **A run that demonstrably could not reach it**, in the run directory, with its `bound` field
   and its evidence.
2. **The binding constraint named, from the constraint side** — `maxSpanHoles` forbidding the
   reach or `minSpanHoles` forbidding the compression, with the board and the net pair, or a
   packing infeasibility (limit H-3). **"The search did not get there" is not an admissible
   cause**: that is `search-exhausted` or `budget-exhausted`, which says nothing about whether a
   better layout exists, so a relaxation resting on it relaxes the wrong number.
3. **A deliberate edit to `stripboard/rules.json`**, the evidence in the entry's `note`, a test
   beside it, and the previous value and its reason **kept** rather than overwritten — the union
   is the record.
4. **Never a silent widening, and never a widening because the gate became inconvenient.** A gate
   relaxed to let a run pass is not a gate: if the reason to move the number is that runs keep
   failing it, the number does not move, the verdict reports the shortfall, and the pipeline is
   what gets worked on.

Because this repository already has the discipline for a bound proven over a range and `CLAUDE.md`
states it — ranges *"are proven with tests over the range they claim. Extending one is a
deliberate edit with a test beside it, never a silent widening"* — with
`lib/kicad/value-notation.ts` as the worked example, keeping both of its independent widenings and
naming the artifact that forced each. **This is a criterion about how criteria change, and it is
what keeps the rest of this document from drifting.**
*Checked:* review of the diff that moves the number, against the kept `note` history; REP4 is the
report side of the same distinction. *Provenance:* **[owner]**, 2026-10-10 (D23).

**K4 — The floor tolerance: `(F_i − F_floor) / max(1, F_0 − F_floor) < τ`, `F_floor = C_floor`,
proposed default `τ = 0.05`.** The owner's tolerance, and 0.05 is a *proposed* default rather than
a settled value (§10). **The two 0.05s are unrelated** — one a dimensionless clustering fraction,
one a fraction of the gap to a derived floor — and the coincidence of digits is noted so nobody
reads one as derived from the other.
**τ IS DELIBERATELY UNSET (owner, 2026-10-10), and the pipeline reports instead of judging.**
The owner was asked to choose it and declined on grounds that were correct: the question was put
to him with the wrong floor. He was offered "close 95% of the gap from 65 cuts to 19" on mid, where
19 is `C_floor` evaluated at mid's *current* `S_occ` of four strips — the floor for keeping every
part crammed into the four rows `--import` used. The floor against the board he actually owns is
`max(0, N − R) = max(0, 23 − 34) =` **zero**. A tolerance chosen against a floor that is wrong by
nineteen cuts would have been a number with no meaning, and he said so by asking why cuts could not
be traded for strips (OBJ3.1) — which is exactly what the identity says.

So `τ` has **no value and no default**, and until it has one:

- **Q2 and A3 do not fire.** An outcome of "valid, below target" cannot be reported against an
  unset target, so a run that is valid reports **valid** with its achieved `F`, its derived floor
  and the gap, and the admissibility verdict rests on A1, A2 and A4.
- **The pipeline reports the gap rather than grading it.** What a real run achieves on a real board
  is the evidence a threshold should be set from, and none exists yet: every cut count in this
  suite comes from `--import`'s placement or from a hand layout, neither of which is this pipeline.
- Setting it is a **deliberate edit carrying the run that justifies it**, the same ratchet K3
  imposes on the clustering bound.

*Checked:* arithmetic on counts, when set. It is Q2 and A3. *Provenance:* **[owner]** owns the
value and has not set one; the 0.05 formerly carried here was PIPELINE's proposal and is withdrawn.

**K5 — Floor consistency: `F ≥ F_floor` on every candidate, and a candidate below the declared
floor is a verification failure.** `F_floor = C_floor` is a **lower bound**, so a candidate
scoring beneath it is not an unexpectedly good result — it is proof that one of the two numbers is
not the quantity it claims to be: the floor derivation, the scorer, or the dump the scorer read.
The run **refuses** and reports which candidate, its `F`, the declared `F_floor` and the board,
rather than keeping the candidate and reporting a negative gap. Because the alternative is a
pipeline that reports beating a bound it derived itself, which is the most convincing wrong answer
available to it — `(F − F_floor) / max(1, F_0 − F_floor)` goes negative and Q2 and A3 both pass
with room to spare.
**The precedent, which has already paid off once:** `transistor-preamp-lab` yields `J = −1` from
the identity, and `J = Σ(kₙ − 1) ≥ 0` makes that impossible. The impossible value was not noise —
it correctly revealed a board whose `CUT_STATE` is `UNRESOLVED`, whose zero cut count means the
cuts *could not be derived* rather than that none are needed, and which the identity therefore
cannot describe (RE-MEASURE, PIPELINE §2.2.1; HC2 excludes it). An out-of-range value treated as a
failure found a real defect; the same value treated as a result would have hidden it.
*Checked:* one comparison per candidate, beside V2's identity check and `J ≥ 0` reading, in the
grader. **Negative-tested:** a fixture candidate with a deliberately overstated `F_floor` must be
refused by name, and a test asserts the refusal rather than a negative gap reaching the report.
*Provenance:* **[review]** for the invariant; **[model]** for the refusal and for the `J < 0`
precedent it is modelled on.

---

## 5. Stopping — and a stop is not a pass

A run stops for one of six reasons and is admissible for a different one. Conflating them is how a
pipeline reports success on a board it merely gave up on, so the two are separated and the run
reports both. **Stop at the first of:**

| | Rule, and why | Measured how |
| --- | --- | --- |
| **Q1** | **At the floor, and admissible.** `C = C_floor` and `W = 0`; equivalently `κ = 0`, `S_occ = min(N, R)`, `W = 0` — **and A1–A4 hold on that candidate.** Terminal, because nothing below the floor exists. `B = 0` follows rather than being assumed: `κ = 0` means no net is split, a derived bridge exists only to supply a join, and there is no join to supply. | dump counts against P0's `targets.json`, plus the admissibility verdict |
| **Q2** | **Within tolerance of the floor** (K4), **and admissible.** | arithmetic on counts, plus the admissibility verdict |
| **Q3** | **Search exhausted.** Every seed's climb has reached a full sweep of the move set — *including* the net-cluster move — that produced no accepted move, and no restart remains. **Not terminal before the seed list is spent**, because a single no-accepted-move round is a restart trigger: a rule that stopped at the first local optimum would halt the run in exactly the condition the restarts exist to leave. | the round's accepted-move counter is 0 for the last seed and the restart schedule is spent |
| **Q4** | **Finishing would cost more than the search already has.** With `g = F − C_floor` the gap that provably remains, `r` the recent improvement per evaluation, and `e` the evaluations spent: stop when `g / r > k · e`. Default `k = 1`. **Measured across at least one restart, never within a climb** — improvement here is bursty, so a window inside a flat stretch reads as converged when a restart would have broken it. [owner], 2026-10-10. | counters and the derived floor |
| **Q5** | **Budget spent** — the owner's evaluation cap, at **run** level. Restarts spend the same cap and the schedule's division of it is recorded, so a restart cannot quietly grant itself more. | counter |
| **Q6** | **Systematic cause.** Three consecutive results share a failure signature — the failing check names, the floating parts, the `CUT_CONFLICT` positions — compared **within and across restarts**, because three sharing a signature across two seeds is stronger evidence than three within one. Reports the cause; does not retry, a repeated failure being a systematic cause to fix rather than a candidate to skip. | signature comparison |

**Q1 and Q2 are successful terminations, and a successful termination may not fire on an
inadmissible candidate.** `κ` and the floor tolerance are **differently normalised** — `κ =
J/(P − N)` divides by the splitting available, the tolerance by `F₀ − F_floor` — so they scale
independently and **Q2 can fire while A2 fails.** The worked case, because a theoretical statement
is one somebody later decides is theoretical: with `P − N = 10`, a single unit of `J` is `κ = 0.1`,
**twice** a 0.05 bound; if on the same board `F₀ − F_floor = 40`, that same unit of `J` is a gap
near `0.03`, **inside** `τ = 0.05`. Q2 stops, A2 fails, and the evaluation budget is left unspent
on a board the pipeline was still allowed to improve. **So Q1 and Q2 require admissibility**, and
where the arithmetic holds but admissibility does not, **they do not fire**: the search continues
and stops under another condition — Q3, Q4, Q5 or Q6 — which reports the weaker `bound` the run
has actually earned. Q3–Q6 are unaffected; they were never claims of success.

**Q6's THREE IS INHERITED, NOT DERIVED, AND CARRIES THE SAME HYPOTHESIS DISCIPLINE AS Q4.**
Adopted on the owner's agreement, 2026-10-10. Three consecutive matching signatures is the sibling
repository's number, taken from a different problem — PCB placement, not strips — so it is a
plausible starting value and nothing stronger. Nobody has measured how often this pipeline produces
three identical signatures for a reason other than a genuine systematic cause.

Two ways it could be wrong, and the run record distinguishes them. **Too twitchy**: three restarts
happen to fail on the same constraint by chance, the run stops, and a fourth would have succeeded —
visible as a Q6 stop whose control run goes on to find an admissible layout. **Too patient**: a
board genuinely cannot be done under its constraints and the run grinds through many restarts
before three line up — visible as a long run whose signatures were identical well before it
stopped. Both are read from the signature sequence `run.json` already records, so no extra
instrumentation is needed. The number moves on that evidence under K3's ratchet, as `k` does.

**Q4 IS A HYPOTHESIS, LABELLED AS ONE, AND THE PIPELINE COLLECTS WHAT WOULD REFINE IT.** The
owner's instruction, 2026-10-10: *"we won't figure it out completely by thinking really hard. We
need a credible hypothesis for what might work that isn't obviously dumb that we continuously
refine as we get more experience."* Q4 is that hypothesis and is written to be revised, not
defended.

**Why this shape is credible rather than arbitrary.** What makes this problem unusual is that the
remaining gain is bounded by something derived rather than guessed: `C_floor = max(0, N − R)` is
exact, so `g` is a hard ceiling on what further search can win. The rule therefore has no constant
tied to a unit of `F` — the previous default, one unit per 2,000 evaluations, was a quantity of
machine time dressed as a measure of returns, and it did not scale with a board's difficulty. `k`
is a dimensionless ratio of effort to effort, which is the part that transfers between boards.

**Why it is only a hypothesis, stated so it can be shown wrong:**

- **`g` is optimistic.** The floor ignores physical reach, and mid's net graph wants a six-hole
  span where its B32529 capacitors reach four. So the gap the rule projects against is larger than
  the gap that exists, which biases toward searching too long. That is the safe direction, and it
  is a bias rather than a forecast.
- **`r` is bursty.** A climb goes flat and then drops sharply after a restart, so a rate measured
  inside a flat stretch is not the rate of the search. Hence the across-a-restart window, which is
  a constraint on the implementation and not a detail.
- **Neither has been measured on a real run of this pipeline.** Every cut count in this suite comes
  from `--import`'s placement or from a hand layout.

**What refines it.** `run.json` records the full improvement trace — evaluations, `F`, and the
restart boundaries — so the shape of real curves can be read afterwards rather than argued about.
And because a stopping rule cannot be calibrated by runs that obeyed it, a **control run**
periodically ignores Q4 and continues to the backstop, recording what the rule would have left on
the table. That number, over several boards, is the evidence `k` moves on. Revision follows K3's
ratchet: a changed `k` is a deliberate edit carrying the runs that justify it, never a quiet
adjustment because a gate became inconvenient.

**Q5 is demoted to a backstop and is not a statement about returns.** It exists to stop a bug
looping forever. It is set loose enough that a healthy run never reaches it, and **a run that stops
on Q5 is reported as a failure rather than as a result** — reaching it means either the search or
this rule is broken, and both are worth knowing.

*Provenance:* Q1–Q3 and Q5 **[model]** — COST §6.4's `S1`–`S5` in order, prefixed `Q` here because
the parent's sub-projects are `S0`/`S1`/`S1a` and `S1` would otherwise mean two things. **Q4
[owner]**, 2026-10-10, replacing COST's marginal-yield threshold. Q6 **[external]** — the sibling
repository's failure-signature termination. Q2's `τ`, Q4's `k`, Q5's cap and Q6's run length are
parameters (K4, PAR3).

---

## 6. Admissibility

**A layout is admissible only when all four hold**, and A2 and A3 are independent bounds on
purpose — one on the dominant lever, one on the total. Neither implies the other.

**Admissibility is one of three outcomes, not one of two** — REP5 states the taxonomy and the exit
codes, and it is the authority for them. A layout that fails A1 and a layout that merely misses an
optimisation target are not the same object and must not share a verdict.

| | Condition | What it bounds | From |
| --- | --- | --- | --- |
| **A1** | HC1–HC10 all hold. | the board conducts, has the connectivity the netlist says **and no more** (HC8), is buildable within the declared reach at **both** ends (HC5, HC9), carries no part whose pin pattern the owner refuses to mount (HC10), and fits the stock. Nothing is tradeable. | [model], with HC8/HC9 [review] and HC10 [owner] |
| **A2** | `κ ≤ κ_bench` (K2). | the clustering lever — 68–75% of every unfinished board's cuts. Deliberately set past the best demonstrated hand result, so failing it is the expected early outcome and a failure must name the binding constraint, not merely the gap. | [owner] |
| **A3** | `(F − F_floor) / max(1, F_0 − F_floor) < τ` (K4). | the **whole** objective against the derived floor, which is the parent's stated S1a gate: *"cuts and wire bridges within a stated factor of the derived floor"*. A2 alone would pass a board at `κ = 0` that had spent none of its spare strips — mid occupies 4 of its 35 available rows. | [parent] |
| **A4** | On low-boost, whichever board is being run: the frozen fixture meets B1-frozen, the scaffolded board meets B1-current. **A run states which board it ran and therefore which clause it met.** | deliberately redundant with A3 on the scaffolded board, and kept anyway so a reader looking up what low-boost has to do finds both boards named in one place rather than finding `C ≤ 5` and applying it to the wrong one. The redundancy is the cheaper error. | [review] (D15) |

---

## 7. What a run must report

**REP1 — The `bound` field, and what each value licenses saying.** `run.json` carries `bound` with
exactly one of five values, because **a run that exhausted its search budget has not proved that a
lower bound exists**:

| `bound` | fires under | licenses saying |
| --- | --- | --- |
| `at-floor` | Q1 | **the only optimality claim this pipeline may make**, and only against the *unconstrained* floor `max(0, N − R)` |
| `within-tolerance` | Q2 | within `τ` of a derived lower bound — a bound, not an optimum |
| `search-exhausted` | Q3 | these moves from these seeds did not find better. **Nothing about whether better exists** |
| `budget-exhausted` | Q4, Q5 | **the weakest statement available**: where the search stopped, not where the problem bottoms out |
| `systematic-cause` | Q6 | not a result about cost at all — a cause to fix |

*Checked:* V10 — a test over a deliberately under-budgeted run asserts `bound = budget-exhausted`
and that the generated wording carries no optimality or minimality claim. *Provenance:*
**[review]** (D17), generalising the discipline limit H-2 already applies to constrained floors.

**REP2 — A run that stops without being admissible exits non-zero and says which conditions
failed, individually.** It names the stopping rule that fired, the `bound` status, **which of the
three outcomes of REP5 it reached**, **which of A1–A4 failed, one by one**, and the gap remaining;
never a single "not admissible", and it does not hand over a layout as though it were finished.
**A2 alone** names `κ` achieved, `κ_bench`, and what bound the clustering — a span bound with its
board and net pair, a packing infeasibility, or,
where neither applies, the stopping rule said plainly as the search having stopped rather than as
a constraint. **A1** names which constraint and which net or part. **A3** gives the achieved `F`,
the derived floor and the gap. **A4** says which board was run. Because **A2 failing and the
pipeline being broken produce the same exit code**, so the only thing separating them is what the
report says; and because a skipped check must never look like a passing one, and neither must an
abandoned search.
*Checked:* V8 and V12. *Provenance:* **[review]** (D17), with the per-condition breakdown
following from K2.

**REP3 — The report's wording is generated from the `bound` field, not written per run.** A
phrasing table keyed by `bound` means an exhausted run cannot be described as optimal by an author
who was feeling good about the number. **Only `at-floor` may be reported as a lower bound having
been met**; every other value reports the achieved `F`, the derived floor and the gap, with no
claim that the gap is irreducible. Where `maxSpanHoles` or `minSpanHoles` binds, **even `at-floor`
is relative to the unconstrained floor and must say so** — the constrained floor is undetermined
(limit H-2) and a run may not invent one by stopping at it.
*Checked:* V10, V12. *Provenance:* **[review]**.

**REP4 — A constraint binding and a search stopping are reported differently.** The pipeline
distinguishes *the search did not find the floor* — a retry, a wider move set, a different seed or
an escape mechanism, reported as `search-exhausted` or `budget-exhausted` and **never as a bound
on what is achievable** — from *the floor is unreachable under the supplied bounds*, a design
finding and a hard stop, reporting which board, which net pair, **which bound bound it**, and how
much reach would be needed. Because without the distinction the pipeline either searches an
impossible problem forever or stops with a misleading reason; and the two must agree in one
report, a run that stopped because a span bound binds not being a run that ran out of budget.
*Checked:* the `bound` field against the named binding constraint. This is also the evidence K3
requires before `κ_bench` may move. *Provenance:* **[review]**.

**REP5 — Three outcomes, not two, and the report carries which one.** `run.json` carries an
`outcome` field with exactly one of three values, and the generated wording (REP3) is keyed by it
as well as by `bound`:

| outcome | meaning | exit |
| --- | --- | --- |
| **invalid** | fails a hard electrical or physical constraint — any of HC1–HC10, i.e. A1 | **non-zero** |
| **valid, below target** | electrically and physically acceptable and **buildable** — A1 holds — with an optimisation target unmet: A2, A3 or A4 | **non-zero** |
| **admissible** | valid **and** meets the targets: A1–A4 all hold | **zero** |

Both non-admissible outcomes exit non-zero, so **the exit code does not distinguish them and the
report must** — the same reasoning REP2 already applies to an A2-only failure, now applied to the
verdict itself. The adoption gate is unchanged: G2.5 refuses anything that is not **admissible**,
so *valid, below target* is a layout the pipeline reports and does not adopt.

**Why the binary verdict was wrong.** An earlier draft of this document claimed A2 could only ever
refuse a layout about which nothing had been proved. **That is false and the claim is deleted
rather than softened**: a layout can satisfy every electrical and physical constraint, be the
lowest-cost candidate the run found, be buildable — and still miss a deliberately aggressive
clustering target (K2 sets one on purpose). Reported as a flat refusal, that layout is
indistinguishable from a board that does not conduct. **The owner's question is "can I build
this?", and "is it as good as we wanted?" is a different question**; a two-valued verdict can only
answer the second, and the first is the one a person standing at a bench is asking.
*Checked:* V8 and V12 extend to the `outcome` field — a run failing only A2 must report *valid,
below target*, and a run failing A1 must report *invalid*; a test asserts the two wordings are not
interchangeable. *Provenance:* **[review]** — its strongest finding, accepted; the deleted claim
was this document's own.

---

## 8. The parameters, and where they live

**PAR1 — `ρ_w = 0.25` and `ρ_s = 1`.** Settled by the owner: **one cut costs as much as four
wires.** The instruction, 2026-10-10: *"favor wires over cuts. cuts are harder and more error
prone."* Because a wire bridge's failure modes — wrong length, lifted, shorting a neighbour — are
**visible on the board and reversible with an iron**, while a missed cut is visible nowhere: it is
found by a circuit that does not work, after the board is built, and the labour difference does
not close that gap. PIPELINE previously proposed `ρ_w = 3` by naming the cut's permanence and
invisibility and then entering them on the *cut's* side of the ledger, as a reason the gap is
small; **the invisibility *is* the cost**, so that was a sign error in the argument rather than a
difference of weight, and the correction is recorded with the value so the faulty reasoning is not
re-derived. At 0.25 the optimiser will spend up to four wires to remove one cut and not five;
wire-heavy boards are a *permitted* outcome rather than a symptom. `ρ_s = 1` stands: one blob at
one hole pair, comparable to one cut, and VeroRoute derives where it goes without being asked.
**What `ρ_w` does not buy, which matters more than the value:** it is **not** the mechanism that
reduces the cut count. `J` enters the identity with a positive sign, so a split costs a cut *and*
then needs a join a wire supplies — cuts and wires largely move together, a wire does not retire a
cut, and anybody tuning `ρ_w` in the hope of fewer cuts is tuning the wrong number. The levers
that serve the owner's goal are clustering and spending strips (PIPELINE §8.1.1).
*Checked:* the values live in `stripboard/rules.json` with their notes, and `F` is computed from
them. *Provenance:* **[owner]**, 2026-10-10 (D21).

**PAR2 — The per-family lead spans are datasheet-derived data, and `lib/kicad/lead-span.ts` is
their authority.** HC5 consumes its `maxSpanHoles`, HC9 its `minSpanHoles`. **No span figure
appears in this document or in PIPELINE**, because a number copied into prose is a number that
goes stale with nothing failing; where a document and the module could disagree, the module wins.
**Both bounds are required parameters with no default and the pipeline refuses without them** —
including for a family the module has no datasheet figure for, which refuses **by name** rather
than falling back to the tool's 2–16 range. Because a default would produce boards that score well
and cannot be built, the worst available outcome precisely because the arithmetic looks right; and
because a datasheet figure is the bound the part is sold against, so it survives restocking and is
checkable by a second person, where a remembered caliper reading is not a thing on disk to be
cited.
*Checked:* HC5 and HC9 per candidate. The module throws on an unlisted footprint, and a footprint
whose lead length nobody could source is in `UNSOURCED` with what is missing and throws as well.
`docs/stripboard/lead-span.md` is the authority for *why* each number is what it is (datasheets;
IPC-A-610E §7.1.2.1 for the bend rule). *Provenance:* **[owner]** settled that the bounds come
from a committed datasheet-derived module rather than from a measurement of the parts drawer;
**[external]** values; **[review]** for `minSpanHoles` existing at all (D18); **[model]** for the
refusal (D10).

**PAR3 — The remaining parameters live in one strict rules file, and one of them has no default at
all.** `τ` (K4), Q4's threshold, Q5's cap, Q6's run length, the seed list and the
bounded-worse-acceptance bound all live in one repository-level `stripboard/rules.json`,
schema-versioned, with **unknown keys rejected** by a strict loader and **each entry carrying a
`note` recording why the number is what it is**. The worse-acceptance bound has **no default**:
nothing in COST, MOVE or PIPELINE supplies a schedule and none will be invented, so unconfigured
means the mechanism does not run, **stated in the report**, never quietly approximated.
*Checked:* the strict loader errors on an unknown key rather than ignoring it; the rules file's
content is in the canonical hash, so a parameter cannot be slipped in after a run (G2.2).
*Provenance:* **[owner]** owns the values; **[external]** the strict schema-versioned shape.
`τ = 0.05` and Q4's `1/2000` are PIPELINE's **proposed** defaults — §10.

**PAR4 — The criteria are circuit-independent, reviewed once, and there is no per-board criteria
file.** Changing a parameter is a reviewed change with a test beside it; using one is not. OBJ3's
ranking is a declared string constant beside the ranker stating the order and the reason for each
position, and a change to it has to argue against those reasons. The stock rows × columns per
board is a declared field in the board's existing `boards/<board>/perfboard.json` and is **the
owner's**, because it is a fact about a purchase and not a judgement. Because a per-board criteria
file is a file a producing agent could draft, which is the hole the invariant exists to close.
*Checked:* review, plus G2.2's hash comparison against the committed files. *Provenance:*
**[parent]** — the rule-library pattern.

---

## 9. How a produced layout reaches the repository

**G1 — One command admits a layout, and it is the only thing that writes under `boards/`.** A verb
on the existing CLI acting on `$(CURDIR)` the way every other verb there does — **no `BOARD=`
variable**, because two ways to say which board is two places for one fact to be wrong.
*Provenance:* **[model]** — the fork's own rule that a verb never writes to a path it derived for
itself.

**G2 — What the gate refuses.** Six, and each refusal names what is missing, where to fix it, and
why it is not defaulted:

1. **G2.1** a candidate whose `sha256`, or whose canonical artifact hash, differs from the one
   `run.json` records;
2. **G2.2** a `run.json` whose rules / span-data / stock hashes differ from the current committed
   files — so a parameter cannot be slipped in after a run — and, on a B1-frozen run, the frozen
   fixture's hash as well;
3. **G2.3** a provenance chain that does not start from the board as it now is;
4. **G2.4** a veroroute commit in `run.json` differing from `veroroute.pin`, **and separately a
   built commit differing from either** — the pin is what was intended and `builtCommit()` is what
   ran, they have disagreed once already and every figure in COST and MOVE went through the
   disagreement, and an **unknown** built commit is refused rather than taken as agreement;
5. **G2.5** any failing check, including a non-admissible verdict;
6. **G2.6** an uncommitted layout, unless `--allow-dirty` — exactly how `update` and `stripboard`
   already behave, so git stays the undo.

*Provenance:* **[external]** for the hashed-manifest shape; **[model]** for G2.4 (D25, from what
RE-MEASURE had to exist to fix).

**G3 — Candidates live in a run directory, never in `boards/`.** Under
`build/stripboard/<board>/<stamp>/`, gitignored, and **a full run leaves `boards/**`
byte-identical**, asserted by a test (V7). The run directory is the only thing that changes.
*Provenance:* **[external]** run-directory discipline, **[parent]** gate 11.

**G4 — `make check` stays the repository's verdict, before and after, and the thing it may not
gain is an unreviewed *criterion*, not a *verifier*.** An adopted board on which `make check` does
not exit 0 is a failed adoption and is reverted. The freshness guards still apply —
`netlist-agrees` regenerates the export every run and decides freshness from content and never
from a timestamp, and `wiring` rewrites the panel guide so drift surfaces as a git diff.

**The distinction an earlier wording collapsed.** The invariant is about **who authorises a
criterion**; it says nothing about who writes the code that tests one. "Nothing the pipeline
authored is added to `make check`" read as forbidding both, which has a cost nobody chose: HC8's
copper-reconstruction check and HC5/HC9/HC10's buildability checks would then run only on the
adoption path, and `make check` — the repository's main verification command, the one that runs on
boards a human laid — would stay permanently weaker than the adoption gate, on exactly the
constraints that catch a board that does not conduct.

**What must hold for a check to be admitted to `make check`**, all four:

1. **The criterion it tests is in this document** and reached it through one of the invariant's
   three channels, with its provenance tag — not through the producing agent's opinion.
2. **The criterion has been reviewed by the owner.** Review is of the criterion; the
   implementation does not need his review and the criterion does.
3. **The check is independently tested**, including **negatively**: a fixture it must reject, by
   name. A check that cannot fail is not admitted (V4's discipline).
4. **The check reads data and derives no criterion of its own.** No threshold inside it that is
   not a parameter in `stripboard/rules.json` or a value in a committed data module, and a missing
   parameter refuses rather than defaults (PAR2, PAR3).

A check meeting all four is not the pipeline grading itself: the criterion came from elsewhere and
the verifier is held to a negative test. A check meeting fewer stays on the adoption path only.
*Provenance:* **[parent]** — the replacement rule (D14), with the authorise/implement split
**[review]**, accepted.

**G5 — What remains a human's, and the one channel legibility may enter by.** Buildability and the
feel of the thing in the hand are the owner's. The parent's third channel stays available: **an
independent reviewing agent, never the one that authored the artifact**, reading the board and the
metrics against the rule library and stating whether anything passes the rules while plainly being
wrong — **a finding against the rule library, not against the board.** And the layout is rendered
and read before anyone calls it good: look at the output, not only the tests.
*Provenance:* **[parent]**.

---

## 10. What is left open

Five open questions, recorded rather than filled in, because an agent adding a criterion to its
own acceptance set is precisely the invariant's failure. Each is the owner's to settle or to
reject.

**Parameters not yet owner-settled.** These carry numbers, or need one, and **none of them is
chosen here.**

1. **HC6's stock is now declared — 34 × 27 — and one measured board exceeds it.** RESOLVED
   2026-10-10 by the owner, who measured the board he usually uses. What remains open is a
   discrepancy worth settling rather than assuming away.

   Measured pin extents against 34 × 27, read from `PIN` lines on the committed layouts:

   | board | pin extent | fits |
   | --- | --- | --- |
   | pultec-low-boost | 8 × 26 | yes |
   | transistor-preamp-feedback | 16 × 16 | yes |
   | pultec-low-cut | 3 × 31 | no |
   | pultec-hi-boost, pultec-hi-cut | 3 × 35 | no |
   | pultec-mid | 5 × 35 | no |
   | transistor-preamp-buffered | 20 × 32 | no |
   | transistor-preamp-staged | 25 × 30 | no |
   | **pt2399-core** | **17 × 36** | **no** |

   **The four unfinished Pultec boards fail on shape, not on size.** Three to five strips by
   thirty-odd columns is `--import`'s ribbon, the same fact COST states as mid occupying four of
   thirty-five rows. They are being replaced, so their failure here is a description of the
   placer rather than a constraint on the circuit. The owner's own low-boost fits with
   twenty-six strips to spare, which is the evidence that 34 × 27 is adequate for a Pultec
   section once the parts are packed rather than strung out.

   **`pt2399-core` is the open question.** `README.md` describes it as transcribed from the
   netlist of a board that was physically built and works, and its layout is 36 columns wide on
   27-column stock. Three readings and this document does not choose between them: it was built
   on a wider piece; the committed layout is a later reconstruction that never matched the
   as-built board; or the stock figure does not apply to it. It is not a Pultec section and not
   in S1a's scope, so nothing here waits on it — but a built board that violates a hard
   constraint is exactly the signal that a constraint is wrong, and this project has already
   shipped one such gate today (`κ_bench = 0.06`, which would have refused three working
   boards). **Resolve it before HC6 is enforced on any board outside the Pultec set.**
2. **`τ = 0.05` and Q4's `1/2000` are PIPELINE's proposed defaults, NOT the owner's settled
   values** — unlike PAR1 and K2, which the owner settled with reasons. They are attributed to the
   owner as parameters while carrying numbers he has not been asked about. They remain listed as
   proposals, marked as such in K4 and PAR3, and are **not settled by this revision.**

**Gaps found while revising, listed rather than filled.** Each is a thing a criterion above now
requires and the sources do not supply; none is a new criterion.

3. **HC10's verifier is named and the data it would read does not exist yet.** HC10 is now in A1
   and checked at footprint level, and `lib/kicad/lead-span.ts` is the right place by shape — it
   is keyed by the footprint name the netlist carries and it already refuses an unlisted footprint
   by name, so the refusal path exists. What it does **not** carry is any pin-pattern field: it
   records lead-span geometry, not whether a family's pins decompose into rows parallel to the
   strips. Whether decomposability becomes a field on that module's family geometry or a separate
   classification beside it is a data-authorship decision, and the classification of each family
   is datasheet work with the module's existing provenance discipline — not something to assert
   from memory. **Flagged, not chosen.**
4. **Nothing in the sources says how HC8's negative fixture gets produced.** Its contents and what
   it proves are specified above. But cuts are **derived** — `DeriveCuts`, reported under
   `CUT_STATE COMPUTED` — and the pinned fork has no headless verb that paints or removes one.
   `--help` lists `--dump-netlist`, `--dump-board`, `--import`, `--update`, `--check`, `--adopt`,
   `--set-strips`, `--stretch` and `--move`; the test-only `--author` takes
   `group|select|move-label|add-wire|merge|autofill`. **None of the fifteen edits a cut.** So the
   C19-floated precedent does not transfer directly, because that fixture was captured from a verb
   that produced the defect by itself. How a two-net short is produced — a layout whose derivation
   yields no separating
   cut, a fork change, or a hand-built board under the provenance discipline — is **unsettled**,
   and an invented mechanism here would be a fixture nobody can reproduce.
5. **`A_occ`'s role in the three outcomes is unstated.** OBJ3 puts occupied area in the ranking
   and not in `F`, and REP5's middle outcome turns on an optimisation target being unmet. `A_occ`
   is a ranking term, so it cannot make a layout *valid, below target* — but PIPELINE never says
   whether a ranking term may ever bear on the verdict, and a reader may reasonably ask. Recorded
   as a question, not answered.

---

## 11. Where the argument is

| for | read |
| --- | --- |
| the cost identity `C = N + J − S_occ`, its derivation, its verification on five boards, the per-board floor table, the levers quantified | **COST** |
| what the pinned fork can actuate and observe, and the per-gesture timings | **MOVE** |
| both re-run against the fork the repository is actually pinned to, plus the three further hand-laid boards | **RE-MEASURE** |
| why each criterion above is what it is; the milestones that make it checkable; the reuse boundary against the sibling repository; the measured history; the Decisions and Honest-limits tables | **PIPELINE** |
| the per-family span numbers and why each is what it is | `lib/kicad/lead-span.ts`, `docs/stripboard/lead-span.md` |
| the invariant, its three channels, and the S1a gate | `2026-10-08-agent-authored-boards-design.md` |
