---
title: Stripboard placement and routing — the pipeline
date: 2026-10-10
status: draft-for-review
---

# An agent-driven, repeatable stripboard placement-and-routing pipeline

Sub-project **S1a** of `2026-10-08-agent-authored-boards-design.md`. This is a
specification. No implementation code was written producing it, no C++ was modified, no
`.vrt` was written, and the only existing document it changes is the parent's `S1a`
Deliverable row, which now cites this file.

Three documents are its evidence base and are cited rather than restated:

- `2026-10-10-stripboard-placement-cost-design.md` — the identity `C = N + J − S_occ`, its
  derivation from the fork's own cut-derivation source, its exact verification on all five
  boards, the floor per board, the levers quantified, the objective function and the
  stopping rule. Cited below as **COST**.
- `2026-10-10-stripboard-move-verb-findings.md` — what the vendored fork can actuate and
  observe, measured against the binary shipped at the time. Cited below as **MOVE**. **Its
  observability findings are partly superseded**; see the second revision's note below.
- `2026-10-10-stripboard-remeasurement.md` — both of the above re-run against the fork the
  repository is actually pinned to, plus three more hand-laid boards. Cited below as
  **RE-MEASURE**, and **authoritative where it contradicts either**.

Anything measured for this document alone is marked **(measured here)** and names the
command. Anything undetermined is marked undetermined rather than estimated.

**This is a revision.** It incorporates a third-party review of the first draft and two owner
parameters that are now settled. Nothing was measured for the revision; every figure in it still
traces to COST, to MOVE, or to the owner's instruction. What changed, and where:

| | change | where | why it was needed |
| --- | --- | --- | --- |
| 1 | **B1 split into B1-frozen and B1-current** | §3.2, §3.3, §3.4, §7.3 A4, §10 V3, D15 | the one benchmark was being applied to a circuit it was never measured on |
| 2 | **H8, a copper-derived netlist-equivalence gate, and M1.7, the observability it needs** | §2.2, §4.7, §7.3 A1, §10 V4/V11, D16 | nothing in H1–H7 reconstructs connectivity independently, and nothing looks for a short |
| 3 | **An escape mechanism, and a verdict that distinguishes a bound from an exhaustion** | §7.3, §7.4, §10 V10, D17 | the search had no escape at all, and an exhausted budget was reportable as a result |
| 4 | **H9, a minimum span; the review's manual-audit remedy rejected** | §2.2, §8.3, §10 V4, D18 | H4 and H5 bound a span above and by the tool; nothing bounded it below by the part |
| 5 | **`A_occ`, occupied bounding-box area, in R3's ranking** | §2.4, §6.1 R3, D19 | the ranking had a proxy for spread and no measurement of it |
| 6 | **The determinism contract split into canonical identity and execution provenance** | §10 V6, §10.1, D20 | "metrics" named no canonical subset |
| 7 | **`ρ_w = 0.25` and the span data's new source** | §8.1, §8.2, §8.4, §9.2, D21, D10, D11, H-1, H-5 | the owner settled both, and §8.1's reasoning had the risk term's sign backwards |
| 8 | **H-9 deleted** | §13 | the parent's stale "Out of scope" entry was withdrawn in commit `60b0192`; supersede means delete |
| 9 | **One governing timing figure, and a derived claim recomputed** | §4.6, §7.3, D8, H-10 | two samples, and a gloss derived from the smaller one |

The per-family lead-span bounds H5 and H9 consume are **not defined here.** They are a separate
data module with its own documentation page, being added alongside this revision, and **that
module is their authority** — no span number appears in this document.

**This is the second revision, and unlike the first one it is driven by measurement.**
`2026-10-10-stripboard-remeasurement.md` — cited below as **RE-MEASURE** — re-ran COST's and
MOVE's figures against the fork the repository is actually pinned to. Two things came out of it.
The fork moved: merging `feature/transistor-preamp` advanced `veroroute.pin` from `5a282a6` to
`2cfaad8`, which adds `Src/Headless_dump_pins.cpp` and with it `GRID` and `PIN` lines, so three
gaps this document specified work against no longer exist. And three more hand-laid boards came
into reach, which settle a gate this document had set from one board. **RE-MEASURE is
authoritative wherever it contradicts COST, MOVE or the first revision of this document.**

Anything measured for *this* revision is marked **(measured here, second revision)** and names
the command, to keep it distinguishable from the first revision's "(measured here)", which was
taken against `5a282a6`.

| | change | where | why it was needed |
| --- | --- | --- | --- |
| 10 | **M1.1 cut to two dump fields and a help correction; `GRID` and `PIN` supply the rest** | §2.2 H6, §4, §4.1, §4.5, D5, D22 | the fork moved under the spec, and three of the four fields M1.1 was specified to add are now either printed or not needed |
| 11 | **M1.2 shrunk to the actuator refusal, re-tested against `2cfaad8`** | §2.2 H3, §4.2, D6 | floating is observable in two places now; the defect M1.2 was written for is measurably still there |
| 12 | **M1.7's fork-side half retired; the gate and its module unchanged** | §4.7, D16 | two of its four observability rows were already printed when the row was written, one is supplied by `PIN`, and the fourth would weaken the gate's independence |
| 13 | **Milestone 1 re-ordered, and M1.1 is no longer first** | §4 | the item that was the prerequisite for everything is now the one nothing waits on |
| 14 | **`κ_bench` starts at 0.05 and relaxes only by ratchet** | §3.1, §3.3, §3.4, §7.1, §7.2, §7.2.1, §7.3, §10 V12, §13 H-4, D23 | `κ_bench = 0.06` would reject three hand-laid boards that are built, in service and passing `make check` |
| 15 | **The benchmark set widens to four hand-laid boards** | §3.4, §3.5, §13 H-5, D24 | B1-frozen rested on the one hand-laid board that fails `make check`, while three passing ones sat unused |
| 16 | **H2 gets a worked example, and H-8 is deleted** | §2.2.1, §10 V2, §13 | the identity's inapplicable case was found by accident, and a limits table carrying a resolved item will be believed |
| 17 | **A run records the commit its binary was BUILT from, not only the pin** | §9.3, §10.1, §13 H-10, D25 | the pin and the local build disagreed, and every figure in COST and MOVE went through the wrong binary |

---

## 1. What this sub-project is for

Five discrete Pultec EQ section boards need stripboard layouts. **Four of the five
committed layouts do not conduct.** `--check` against the netlist exported from today's
`physicalBoard(section)` reports 19, 13, 7 and 6 incomplete nets on mid, hi-boost, hi-cut
and low-cut (COST §2.4). Their required segment joins are 46, 27, 24 and 16 while they
supply 3, 0, 3 and 0 solder bridges and no wires at all, so most of the joins are simply
absent. Their cut counts — 65, 40, 32, 23 — are therefore not baselines to beat. They are
the cut cost of unfinished work.

The cause is not a tuning problem. `--import`'s placement is `Board::AddComponent`'s
`-1, -1` branch: a row-major first-fit sweep that takes the first hole where `PutDown`
succeeds, always at direction `'W'`, never consulting `parsed.m_nets` — nets are painted
*after* every part is already fixed (MOVE §3). There is no placement strategy to improve.
**It is to be replaced.**

Only low-boost conducts, at 5 cuts against a derived floor of 4 (COST §2.2).

**The owner's instruction, and the reason this sub-project exists.** Laying these out by
hand is fiddly, repeatable, measurable work, and agent cycles are cheaper than the owner's.
A first solution that technically works while leaving a person doing remedial work is a
failure, not a delivery. The Pultec is the **forcing function** for building general
pipeline tooling, not a one-off to get past: every component below is specified over
"a circuit and a hole grid", and the five boards are what proves it.

S1a depends on S0 in the parent's table, and the dependency is real: all five layouts are
stale against today's model because the scaffold stand-in parts are not placed yet
(COST §2.3). The pipeline works from the model, so it needs the model the scaffold work
settles.

---

## 2. The objective, and why it has no taste in it

### 2.1 The function

COST §4.1 fixes it, and this document adopts it unchanged:

> **minimise  F = C + ρ_w · W + ρ_s · B**

with `C` the count of `CUT ` lines, `W` the count of `WIRE` lines and `B` the count of
`SOLDER` lines in `--dump-board` on the candidate. Every term is a line count in a report
the producing agent did not write.

`C` is not an opinion about the placement. It is an exact function of it:
`C = N + J − S_occ`, derived from `DeriveCuts` and verified to the unit on all five boards
(COST §1.4, §1.6). `N` is a property of the circuit; `J` and `S_occ` are properties of the
placement; nothing else enters.

One subtlety worth stating so the function is read correctly: `B` prices something the
agent does not place. VeroRoute derives solder bridges itself in `Board::CalcSolder`, read
back by `DeriveBridges` (COST §1.5), so `B` is influenced by placement and never chosen
directly. `W` is the opposite — a wire is a component somebody puts down.

### 2.2 The hard constraints

COST §4.1's H1–H7, adopted with one strengthening and one clarification, plus **H8 and H9
added here** for reasons the sections named in their rows give.

**A naming note, because two tables in this document would otherwise collide.** The hard
constraints are `H1`–`H9`, written without a hyphen. The honest limits in §13 are `H-1`–`H-12`,
written with one. They are different sequences and a citation must carry the hyphen or omit it
deliberately; `H8` and `H-8` were never the same claim, and `H-8` has since been **deleted**
(§13), so a citation of it resolves to nothing rather than to the hard constraint. The collision
is not made worse here: no new limit takes the number 8, and no new hard constraint is added.

| | Constraint | Checked by |
| --- | --- | --- |
| H1 | Every net electrically whole. | `--check BOARD --netlist NET` exits 0 and reports no `incomplete` net. |
| H2 | Cuts actually derivable. | `CUT_STATE COMPUTED`; never `UNRESOLVED`, never `NOT_APPLICABLE`. |
| H3 | **Nothing floating, established from copper rather than from component state.** | Milestone 1 item M1.2. COST's H3 reads the `FLOATING` field on `PART`/`PAD`; against `2cfaad8` a floating part also prints **no `PIN` line at all**, so the dump says it twice. §4.2 says why two component-reported signals are still not a copper reading and what M1.2 adds. |
| H4 | Every lead span within the **tool's** range: 2–16 holes. Its lower end is a fact about VeroRoute, not about any part. | `CompTypes::GetMinLength`/`GetMaxLength`, enforced the same way `lib/kicad/import-string.ts` already enforces `MAX_SPAN = 15` grid steps. |
| H5 | Every lead span within the part's **physical** reach — an **upper** bound. | The per-family `maxSpanHoles` in the span data module (§8.2). **Refuse without it.** |
| H6 | The layout fits the stock the owner bought. | The dump's `GRID <rows> <cols>` line against the declared stripboard rows × columns. **This no longer waits on M1.1**: `GRID` is printed by `2cfaad8` and is always emitted, once (RE-MEASURE, "What the newer fork adds"). The board's own size is the right quantity here, because `MoveComps` grows the board by panning rather than letting anything leave it (§4.4), so a layout that does not fit shows up as a board larger than the stock. |
| H7 | The layout still matches the circuit. | `--check`'s schematic-delta section is empty. |
| H8 | **Netlist equivalence, reconstructed from copper.** The connected components of the board's copper, computed outside VeroRoute, partition the pins exactly as the reference netlist does — no reference net split across two components (an open) and no two reference nets inside one component (a short). | Milestone 1 item M1.7, which is the only item that makes the geometry readable at all. §4.7 says why H1–H3 and H7 do not already cover this and what it costs. |
| H9 | **Every lead span at or above the part's own physical minimum** — a `minSpanHoles` **lower** bound. | The per-family `minSpanHoles` in the same span data module, enforced the same way H5 is. §8.3 says why H4 and H5 leave this open and why a manual audit is not the remedy. |
| H10 | **Every placed part's pins lie on straight lines parallel to the strips.** A footprint whose pins sit on a circle, an arc, or any pattern that cannot be decomposed into rows parallel to the strip direction is not placeable on stripboard, and the pipeline refuses it rather than placing it. | The owner's rule, stated 2026-10-10: *"I'm not going to mount a round switch into a stripboard. That never works. Round footprints do not work well with stripboard."* See §2.3.1 for what this does and does not forbid, and for the two places the repository already follows it. |

**Overlap is not a separate constraint, and that is why H3 matters so much.**
`Board::CanPutDown` refuses a placement that collides with occupied holes (MOVE §1.3), so
an overlapping move does not produce an overlapping board — it produces a *floating part*.
H3 is therefore the overlap check as well as the placement check, and §4.2 shows that the
signals it depends on are today the single most dangerous gap in the tooling.

### 2.2.1 H2's worked example — the board the identity cannot describe

**H2 is the abstract constraint; this is the board that shows what it excludes.** It is written
down because RE-MEASURE found it by accident, and an accident nobody records is an accident
somebody repeats as a bug report.

`transistor-preamp-lab` **(measured here, second revision**,
`veroroute --dump-board boards/transistor-preamp-lab/*.vrt`**)**:

| | value |
| --- | --- |
| `CUT_STATE` | `UNRESOLVED`, with **19** `CUT_CONFLICT` lines |
| `N` (`NODE` lines) | 18 |
| `P` (`PIN` lines) | 62 |
| `CUT ` lines | 0 |
| `S_occ` (distinct strips holding a lead) | 17 |
| `J`, from the identity | 0 − 18 + 17 = **−1** |

`J = −1` is impossible: `J = Σ(kₙ − 1)` over the nets and every term is at least 0. **It is not a
counterexample to the identity.** The board's zero cut count does not mean "no cuts are needed",
it means *the cuts could not be worked out* — `ValidateStripConnectivity` found nineteen strips
whose connectivity is not safely known, and the grammar's own rule is that `UNRESOLVED` prints no
cut list rather than an empty-looking-clean one. The identity's `C` is the count of cuts a
derivation produced, and there was no derivation. **H2 already excludes this board**, and these
are the numbers it excludes.

**A negative `J` is a sound cheap detector for a board the identity cannot describe — and it is
not a replacement for H2.** Sound, because `J < 0` contradicts `J ≥ 0`, so it can only arise when
one of `C`, `N` or `S_occ` is not the quantity the identity names. Not complete, and the arithmetic
says why rather than an impression: an unresolved board with `C = 0` yields `J = S_occ − N`, which
is negative only when `S_occ < N`. `transistor-preamp-feedback` sits at `S_occ = 13` against
`N = 11` (§3.5), so a board of that shape could be `UNRESOLVED` and still report `J = +2`. The
detector would miss it; H2 would not. So H2 stays the constraint and `J < 0` is a free extra
reading V2 takes on every candidate.

### 2.3 Why there is no legibility term

The parent's governing invariant:

> **An agent may never author the acceptance criteria for the specific artifact it is
> producing.**

A legibility, tidiness or neatness term is a term an agent scores itself on. Adding one
would reintroduce the exact failure the parent records — a floorplan graded against intent
the grading agent had chosen, reporting success on a board with the input stage 8 mm from
the output stage. So `F` carries no such term, and `H1`–`H7` are each either a line in a
report the agent did not write or a number the owner supplied.

Legibility is not thereby dismissed. It enters the way the parent says it may: through a
reviewed, circuit-independent rule library, or through an independent reviewing agent that
is never the author (§9.4). Never as a term in `F`.

### 2.3.1 Round pin patterns are refused, and what that does not mean

H10 forbids placing a footprint whose pins sit on a circle or an arc. A strip is a straight
line of copper, so a circle of pins crosses a different strip at nearly every pin and shares
one with pins it must not share with — every such hole becomes a cut, and the body sits over
holes it does not use. The owner's judgement is blunter and worth preserving verbatim: *"I'm
not going to mount a round switch into a stripboard. That never works."*

**This is a rule about PIN GEOMETRY, not about body shape, and the distinction decides
whether the rule is useful or catastrophic.** A radial electrolytic has a cylindrical body and
two leads in a straight line; it is placeable, and `CP_Radial_D5.0mm_P2.00mm` and its
siblings carry derived spans in the span data module precisely because they are. Read H10 as
banning round bodies and every electrolytic on every board becomes unplaceable.

The repository already follows this rule in two places, which is evidence it is the settled
practice rather than a new constraint:

- `circuits/pultec/off-board.ts` puts all six rotary selectors off-board **permanently**, with
  the reason stated at the definition: a six- or eleven-position rotary is a panel-mount part
  with a shaft and a bushing and "does not mount on stripboard under any variant". That file
  is the single definition of residency, and it is data rather than a rule about kinds because
  residency is a build decision the owner keeps open — but this entry is marked permanent,
  unlike the inductors, which are off-board only pending a part choice.
- The span data module admits `TO-92_Inline` and not the triangular TO-92. The inline variant
  was chosen deliberately; the arc variant would fail H10.

The parent design records one qualification, and it is about scope rather than correctness:
the shaft-and-bushing reasoning "is a claim about *stripboard*, and it is right about
stripboard. PCB-mount rotaries exist" — so H10 binds this pipeline and must not be carried
into the PCB pipeline (T1) as though it were a general truth about rotaries.

**Refuse, never route around.** A circuit needing a round-pattern part on a board gets that
part declared off-board with its terminals wired back, as the Pultec's selectors are. The
pipeline does not get to decide that for itself: residency is the circuit's own data, so the
refusal names the part and points at the residency set, and a human moves it.

### 2.4 `F` and the ranking are two things, and the ranking has one geometric term

**First, a distinction the document owed and did not state.** `F` and R3's lexicographic
ranking are not the same object and were readable as if they were:

- **`F = C + ρ_w·W + ρ_s·B` is the scalar the search accepts on.** `ΔF < 0` is P2's acceptance
  test, and Q1–Q6 and A3 are stated in `F` and its floor.
- **R3's ranking orders candidates that `F` cannot separate.** It is what P3 uses to choose
  among admissible candidates and what P2 uses to accept a plateau move at `ΔF = 0` (§7.4).

A term in the ranking is therefore **not** a term in `F`, and cannot cause the search to accept
a worse `F`. That is the property everything below depends on.

**The concern, and what was already handled.** An objective in `C` alone can reward sprawl:
lower `C` by raising `S_occ`, spreading the board out, and call it an improvement when the board
has not become easier to build. Three things already bear on it:

- **R3's declared ranking already carries a geometric term** — pin-bounding-box wirelength, in
  fourth position. The spec was not silent on spread.
- **`ΔF < 0` is strict**, so a move that spreads the board without lowering `F` is rejected —
  and once `A_occ` is in the ranking, §7.4's plateau move cannot admit one either, because a
  spreading move at equal `C`, `W` and `B` makes the ranking strictly worse. **H6 bounds the
  whole layout to the stock the owner bought**, so spread has a hard ceiling rather than only a
  preference against it. The one acceptance rule that can take a spreading move is E3's bounded
  worse-acceptance, which is off unless configured and bounded when it is.
- **Spending strips is the intended lever and is nearly free.** Lever 2 (§5.2) *is* raising
  `S_occ`, it removes one cut per strip spent and adds nothing, and mid occupies 4 of its 35
  available rows. Sprawl that lowers `C` is not a bug being exploited; it is the design.

**The gap conceded.** Nothing in the ranking is an **area** measurement, and the wirelength term
is a **labelled proxy.** The reason it is a proxy has changed and the label has not: it is no
longer that the geometry is unreadable — `2cfaad8`'s `PIN` lines give every placed lead's hole, so
a per-net pin bounding box is now a direct reading — it is that a pin bounding box is a proxy for
**track length**, which is the quantity that would matter, and no track-length measure is derived
anywhere in this document (H-11). Two candidates with equal `C`, `W` and `B` can differ in how
much board they occupy, and the ranking as it stood would separate them only by a proxy for
something else.

**The term.** Occupied bounding-box area, as a direct reading of M1.1's `BOUNDS`:

> `A_occ = (maxRow − minRow + 1) × (maxCol − minCol + 1)`

placed **below all three construction-cost terms and above the wirelength proxy**, giving R3's
order: cuts, wire bridges, solder bridges, `A_occ`, pin-bounding-box wirelength. Two reasons for
that exact position, each stated so the position is reviewable rather than felt:

1. **Below the construction-cost terms**, because a smaller board that costs more to build is
   not an improvement, and lexicographic order is what guarantees `A_occ` can never buy a cut.
2. **Above the wirelength proxy**, because `A_occ` is a measurement of the thing and the
   wirelength term is a proxy for a different thing (H-11). A measured quantity outranks a
   labelled proxy.

**What it is not, because D3 is at stake.** `A_occ` is two subtractions and a multiplication over
four integers the fork prints. It is not compactness-as-tidiness, not neatness, not legibility,
and no agent chooses it, scores it or has any latitude in computing it. **An agent may never
author the acceptance criteria for its own artifact**, and a term with a judgement in it —
"looks clean", "groups sensibly", "reads well" — would be exactly that whatever it was called.
`A_occ` is admissible precisely because it is a fixed geometric measurement with no opinion
available inside it. If a future term cannot be written as arithmetic on fields the fork prints,
it belongs in the rule library or with the independent reviewer (§9.4), not in R3.

**`A_occ` is not a constraint.** H6 is the constraint; `A_occ` only orders. The two are not
redundant: H6 asks whether the board fits the stock, `A_occ` asks which of two fitting boards
uses less of it.

---

## 3. The benchmark, and why it satisfies the invariant

### 3.1 The benchmark

**low-boost's committed layout was laid out by the owner, by hand, in the GUI.** The
provenance is in the history **(measured here**, `git log` over
`boards/pultec-low-boost/pultec-low-boost.perfboard.vrt`**)**: commit `a33cb4d` ("layout")
touches that one binary file and nothing else, and `2f62ee1` ("Lay out the low-boost
board") describes the arrangement in the first person — *"Six frequency capacitors on one
strip, cut into six segments between the selector throws; R2 across the out and
lo_boost_in strips; the pot's wiper and cw tied by a solder bridge, which is the rheostat
wiring."* Both are authored by `oletizi` and neither carries any agent attribution.

What it achieves (COST §1.6, §2.2):

| | value |
| --- | --- |
| cuts | **5** (verified here: `--dump-board` reports 5 `CUT ` lines) |
| floor at its `S_occ` | **4** |
| nets complete / incomplete | 6 / **0** — the only one of the five that conducts |
| `J` | 1, supplied by its single `SOLDER` line at `(9,6)-(10,6)` |
| `κ = J/(P−N)` | 1/18 = **0.055** |

**The `κ` figure is 1/18 and this document previously rounded it to 0.06.** RE-MEASURE prints it
as 0.055, and the rounding is not cosmetic any more: §7.2's clustering bound is now set *just
under* this value, so 0.06 and 0.055 are on opposite sides of the gate. Every `κ` figure in this
document is the exact fraction with its decimal to three places, and the fraction is the
authority.

**The identity reads straight off the dump now, with no reconstruction (measured here, second
revision**, `veroroute --dump-board boards/pultec-low-boost/pultec-low-boost.perfboard.vrt`**):**
9 `NODE` lines, 27 `PIN` lines, `VERTICAL_STRIPS 0`, 5 distinct rows among the `PIN` holes, and 5
`CUT ` lines — so `S_occ = 5` and `J = C − N + S_occ = 5 − 9 + 5 = 1`, matching COST's
hand-checked figure exactly. This is the first time any of those terms has been *read* rather
than reconstructed, and it is why §4.1 shrinks.

### 3.2 Why this satisfies the invariant, and why it is a first-class criterion

It is a number no agent chose, about an artifact no agent produced, measured by a tool no
agent wrote. That is precisely the shape of criterion the invariant demands, and it is
stronger than a rule file because it is an *achieved* result rather than a stated
aspiration: somebody did this, with these hands, on this circuit.

So it is an acceptance criterion, not a comparison of interest. **It is two criteria, and the
split is the point of this subsection**, because a single `C ≤ 5` would silently compare two
different circuits.

#### 3.2.1 Why one criterion was wrong

An earlier draft of this document stated the benchmark as a single rule: *"on low-boost, the
pipeline must reach `C ≤ 5` with `W = 0` and every net complete, starting from the
import-placed board."* §3.4 of this same document states, a few paragraphs below, that low-boost
is **9 nets and 27 pins on the committed board** and **14 nets and 40 pins against today's
model** (COST §2.2, §2.3). The hand layout reached 5 cuts at `S_occ = 5` on the 9-net board.

Run the identity on the other circuit. `C = N + J − S_occ`, so `C ≤ 5` at `N = 14` requires

> `S_occ ≥ 9 + J`

— nine occupied strips before a single net is allowed to split, against the five the owner's
layout needed. That is not the problem the owner solved. **A single `C ≤ 5` points the pipeline
at a 14-net circuit and reports the result as a comparison with a 9-net hand layout.** The
document already contained both numbers and the identity that relates them, and failed to draw
the conclusion. The project has exactly one externally authored layout (§3.4), and the old B1
was spending it on the wrong circuit.

#### 3.2.2 B1-frozen — the benchmark, kept at full force

> **B1-frozen. Against the exact electrical model, footprints and board dimensions the hand
> layout was built for — 9 nets, 27 pins, and the grid the fixture's own `GRID` line reports —
> the pipeline must reach `C ≤ 5` with `W = 0` and every net complete, starting from the
> import-placed board.** A run that does not is a failing run.

**The grid is cited to the fixture's `GRID` line and not restated as a number, and that is a
correction.** This document previously said "the 14 × 34 grid", citing COST §2.2. Dumping the
fixture board itself **(measured here, second revision**,
`git show 2f62ee1:boards/pultec-low-boost/pultec-low-boost.perfboard.vrt` into the scratchpad,
then `veroroute --dump-board`**)** reports `GRID 14 32`, with 9 `NODE` lines, 27 `PIN` lines, 5
`CUT ` lines, one `SOLDER` line and no `WIRE` line — so the nets, the pins and the cut count are
confirmed and the column count was not 34. The same command on `a33cb4d` reports `GRID 36 35`
with `CUT_STATE UNRESOLVED` and no cuts, which confirms that commit as the pre-layout state and
`2f62ee1` as the layout. **A number copied into prose is a number that goes stale with nothing
failing** — the same reason §8.2 states no span figure — so the fixture's own `GRID` line is the
authority and no grid figure appears here.

This is the externally authored benchmark and it keeps every bit of its force, **because it is
now the same problem the owner solved.** `C ≤ 5` at `N = 9` requires `S_occ ≥ 4 + J`, which the
hand layout meets at `S_occ = 5, J = 1`. Matching it is matching a hand.

`W = 0` is retained here as a **property of the artifact being reproduced**, not as a general
preference: the owner's layout carries zero `WIRE` lines, so a reproduction that needs a wire
has not reproduced it. §8.1's `ρ_w = 0.25` says wires are cheap in general; it does not licence
spending one here, and §3.2.3 says why the clause is deliberately not carried forward.

**How the fixture is pinned.** The live model changes under S0 — that is the whole of S1a's
dependency (§1) — so the benchmark cannot be stated against whatever `physicalBoard('low-boost')`
returns on the run. It is stated against a **committed fixture**, extracted once, deliberately,
by `git show` from the commits that authored the layout:

| fixture file | obtained from | why it is a file and not a regeneration |
| --- | --- | --- |
| the layout `.vrt` | `git show 2f62ee1:boards/pultec-low-boost/pultec-low-boost.perfboard.vrt` | binary `QDataStream`; the only legitimate writer is the veroroute binary (N5), so it is copied, never rebuilt |
| the netlist export it was built against | the export from the model as of `2f62ee1`, committed as text | regenerating it against the live model is exactly the bug B1-frozen exists to prevent |
| the board's declared grid and stock | committed beside the other two | the grid is a fact about that board at that commit, not about the current one — the committed board dumps `GRID 14 32` today and so does the fixture, but nothing may assume they will stay equal |

**This document did not extract the fixture's netlist export, and does not assert what that
export contains.** What it did do, in this revision, is dump the fixture *board* at `2f62ee1`:
9 `NODE` lines and 27 `PIN` lines, agreeing with the committed board's own figures (COST §2.2).
The fixture's netlist export must agree with those figures too; if the extraction cannot
reproduce an export that does, the fixture is wrong and **says which number disagreed** rather
than being adjusted until the benchmark passes. A fixture tuned to make its own test pass is not
a benchmark.

The mechanism is one this repository already uses and the fixture sits with the others:
`tests/fixtures/` already holds a committed netlist export and a committed `--dump-board`
capture for `pt2399-core`, for the same reason. Three rules govern the fixture, each because
its absence has a named failure:

1. **It lives under `tests/fixtures/`, never under `boards/`.** `make -C boards/<board> check`
   runs `netlist-agrees`, which regenerates the export every run and decides freshness by
   content (§9.4). A deliberately frozen model under `boards/` is a deliberately stale one, and
   the freshness guard would be right to fail it. Put the fixture where the guard does not run,
   rather than weakening the guard.
2. **It records `a33cb4d` and `2f62ee1` as its provenance, in the fixture directory, in text.**
   A fixture whose origin is in somebody's memory is not evidence (**transcription is evidence,
   not memory**).
3. **It is hashed like any other input.** The run manifest records the fixture's `sha256` the
   way R6 records `source.sha256`, so a silently edited benchmark is a changed hash rather than
   a quietly easier test.

#### 3.2.3 B1-current — the scaffolded board's own criterion

The scaffolded low-boost board is a different circuit and gets a criterion derived from **its
own** floor, by the identity, with nothing inherited from the hand layout:

> **B1-current. On the scaffolded low-boost board, the pipeline must reach
> `(F − F_floor) / max(1, F_0 − F_floor) < τ` against that board's own `C_floor` as P0 derives
> it (§5.5), with every net complete and H1–H9 holding.**

Three things it deliberately does **not** say:

- **No absolute cut count.** `C ≤ 5` on this board means `S_occ ≥ 9 + J`, a requirement nobody
  derived and nobody achieved. The bound is floor-relative because the floor is the only lower
  bound this document derives (COST §2.1), and it is derived per board from `N` and `R`.
- **No `W = 0`.** Carrying that clause across would let an artefact of the owner's hand layout
  override `ρ_w = 0.25`, a parameter the owner settled in the other direction (§8.1). A board
  that spends a wire to unlock a better arrangement is doing what it was told.
- **No claim to be externally authored.** B1-current is derived, not achieved; it is the same
  bound A3 applies to every board, named separately only so that nobody reads B1-frozen's
  number as applying here. **The externally authored criterion is B1-frozen, and it is the only
  one.**

B1-frozen is non-negotiable and is the first thing the pipeline is pointed at — before
B1-current, and before the four unfinished boards, because on those there is nothing to be
wrong against.

### 3.3 What it means if the pipeline cannot match it

It means the pipeline is worse than the owner's hands at the one job it exists to take
over, and the honest response is to say so and stop, not to lower the bar. The readings below
are of **B1-frozen**, because that is the criterion a failure of which carries that meaning; a
B1-current failure is an ordinary failure to reach a derived floor and reads under §7.3. Three
readings are distinguishable and the run must say which:

1. **The optimiser is weak.** `C > 5` on the frozen fixture while H1–H9 all hold and `κ` is
   well above the clustering bound of §7.2. A search problem: the move set, the escape mechanisms
   of §7.4, the seed construction or the stopping rule. **Note what this reading is not.** The
   bound is deliberately set just under the best hand result (§7.2.1), so missing it is the
   expected first outcome and on its own says nothing about the optimiser. This reading needs
   `C > 5` on the frozen fixture — a failure against the owner's own achieved cut count — not
   merely a `κ` above the bound.
2. **A constraint binds.** `C > 5` on the frozen fixture because `maxSpanHoles` (H5) forbids
   the spans low-boost actually uses, or `minSpanHoles` (H9) forbids a compression it relies
   on. Then the pipeline is being asked to reproduce a layout under bounds it is not allowed to
   exceed, and the remedy is in the span data (§8.2), not in the search. **This reading is
   falsifiable on the frozen fixture and was not on the old B1**: the owner's own spans are in
   the fixture, so a binding bound can be shown to be the cause by checking the hand layout's
   own spans against the data.
3. **The scorer is wrong.** `C ≤ 5` reported and `--check`, H8's reconstruction or `make check`
   disagrees. That is §10's failure, and it is the worst of the three because it looks like
   success.

A fourth reading exists only for B1-current and must not be confused with any of the three:
**the bound was not reached within the budget.** That is a stop, not a verdict about the
pipeline's quality, and §7.3's bound status is what distinguishes it.

### 3.4 The honest risk: relieved from n = 1, and not eliminated

**This section previously said "one board is one data point". It is now four, and the change is a
relief rather than a resolution.** §3.5 is the evidence and the numbers; this section is what they
do and do not license.

low-boost is the smallest of the five Pultec boards (9 nets, 27 pins on the committed board;
14 nets, 40 pins against today's model — COST §2.2, §2.3) and it is the only hand-worked one of
the five. Three hand-laid boards outside the Pultec set are now measured (§3.5). So:

- **B1-frozen is a necessary condition, not a sufficient one.** A pipeline that matches 5 cuts
  on the frozen low-boost fixture and produces an unbuildable mid board has passed B1-frozen
  and failed. Unchanged by the widening.
- **Freezing the fixture does not add a data point; it stops one being spent wrongly.** That
  argument is unchanged too. What §3.5 adds is three *further* externally authored layouts, not a
  second reading of low-boost.
- **B1-frozen is still the only externally authored *criterion*.** §3.5's boards are a benchmark
  *set* — they ground the admissibility bound and they validate the grader — and none of them
  gets a `C ≤ n` clause, because nobody set out to minimise cuts on them and this document will
  not retrofit an intention onto somebody else's board.
- **Four boards still cannot support a fitted threshold.** COST §5 is explicit that five could
  not either, and RE-MEASURE says the same in its own words: the measurement establishes the
  direction and magnitude of an error, not a new constant. **So the clustering bound is not
  fitted to these four values and must not be** — §7.2.1 sets it from the best single
  demonstrated result and relaxes it by ratchet, which is the opposite of a fit.
- The comparison between low-boost and the other four Pultec boards is confounded three ways —
  hand-worked versus import default, routed versus not routed, parts across the strips versus
  along them (COST §3.4b, L5). It is evidence for the mechanism the identity derives, not an
  independent estimate of any lever. §3.5's boards are hand-worked and routed, so they remove the
  first two confounds from the *level* of `κ` a human reaches, and they do not remove the third.

The way to retire the remainder is more externally authored layouts, which only the owner can
supply, and this document does not pretend otherwise.

### 3.5 The benchmark set, widened to four hand-laid boards

**B1-frozen rested on low-boost, and RE-MEASURE found that low-boost is the one hand-laid board
in the repository that fails `make check`.** It fails for a known reason — it is stale against
today's scaffolded model, holding nine parts where the model now needs nineteen, and a terminal
block where the junction is two header rows — and its five cuts were correct for the nine-net
circuit it was drawn against. **The B1-frozen / B1-current split of §3.2 is exactly the remedy for
that staleness and it stands unchanged.** What does not stand is resting the whole benchmark set
on that one board while three externally authored, physically built, `make check`-passing boards
sat in `boards/` unused.

The set is therefore four boards. Every figure is RE-MEASURE's, and every one was
**(measured here, second revision**, `veroroute --dump-board` on each committed `.vrt`, with
`S_occ` as the count of distinct strips holding at least one `PIN` hole and
`J = C − N + S_occ`**)** reproduced to the unit:

| board | N | P | cuts | `S_occ` | `J` | `κ = J/(P−N)` | `W` | `B` | `make check` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pultec-low-boost | 9 | 27 | 5 | 5 | 1 | 1/18 = **0.055** | 0 | 1 | FAIL (stale, above) |
| pt2399-core | 21 | 65 | 12 | 17 | 8 | 8/44 = **0.181** | 4 | 6 | PASS |
| transistor-preamp-feedback | 11 | 37 | 5 | 13 | 7 | 7/26 = **0.269** | 4 | 3 | PASS |
| transistor-preamp-staged | 22 | 78 | 10 | 23 | 11 | 11/56 = **0.196** | 7 | 5 | PASS |

The `make check` verdicts are RE-MEASURE's and are not re-run here. The `W` and `B` columns are
not in RE-MEASURE's table and are added here, because §13's H-5 turns on them.

**What each one contributes that the others do not.** This is the part that makes it a set rather
than a longer list:

| board | what only it contributes |
| --- | --- |
| **pultec-low-boost** | The only board whose layout was authored *as* a minimisation, in the first person, in a commit message (§3.1). It is the only source of a `C ≤ n` criterion, and the lowest `κ` any hand has reached here. It is also the only one of the four that fails `make check`, which is why it cannot be the whole set. |
| **pt2399-core** | The only board carrying a multi-pin **IC** — a `DIP16` beside a `SIP5` — and on it `NODE 23` lists `U1` twice **(measured here, second revision)**, so COST §1.5's **third** join mechanism, a part with two pins on one net, arises on an IC rather than on a potentiometer. That mechanism is not unique to it: low-boost's `NODE 9` lists `RV_LO_BOOST` twice and the two preamp boards do the same on their trimmers. What is unique is the shape — a sixteen-pin package on a 1-hole pitch, where the pins are not free to be reassigned to strips. It is also the only one of the three **passing** boards where lever 2 is not exhausted: `N − S_occ = 21 − 17 = 4`, so 4 of its 12 cuts are strip-sharing cost — low-boost is the other board in the set with room left, at `9 − 5 = 4`. And `tests/fixtures/` already holds a committed netlist export and `--dump-board` capture for it (§3.2.2), so it is the board the fixture machinery already reaches. |
| **transistor-preamp-feedback** | The loosest `κ` in the set at 7/26, so it sets the far end of the observed human range, and the smallest net count of the three passing boards. It is also where `S_occ > N` most clearly — 13 strips for 11 nets — so `N − S_occ = −2`: **the strips it spent more than cover its nets, and its five cuts are seven splits less two strips credited back.** A board that spent strips freely and tolerated splits anyway is the single most direct evidence against reading a low `κ` as a requirement. |
| **transistor-preamp-staged** | The largest of the four at 22 nets and 78 pins on a 30 × 39 grid, which is the only one approaching mid's 28 nets. It is the set's only evidence that a hand-laid result at this `κ` scales past low-boost's size, and it carries the most wires of the four (7). |

**Two things the set is used for, and one it is not.**

- It **grounds** §7.2.1's clustering bound: the bound is set relative to the best value in this
  table, and the other three are the record of what a human reaches when cuts are not the thing
  being minimised.
- It **validates the grader.** M1.7's reconstruction (§4.7) must agree with the reference netlist
  on all four, and three of the four pass `make check` independently, so a disagreement is a bug
  in the reconstruction rather than an ambiguity about the board.
- It is **not** a sample to fit anything to. See §3.4's fourth bullet and V9.

---

## 4. Milestone 1 — make the fork actuable, and its scores trustworthy

**This milestone is smaller than it was, because the fork moved under it.** `2cfaad8` added
`Src/Headless_dump_pins.cpp` with `GRID <rows> <cols>` and `PIN <name> <pin> AT <row>,<col>`
(RE-MEASURE), and `tools/guide/dump.ts` — merged from the same branch, transcribed from that C++
and cross-checked against a real dump — is already a typed parser for the whole grammar. What
remains is stated against `2cfaad8` throughout this section, and where an item was specified
against `5a282a6` and is now unnecessary it is **deleted rather than marked done**.

**What has not changed is the absence of any actuator (measured here, second revision**, the
binary at `.tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute`**).** The shipped
verb set at `2cfaad8` is `--adopt`, `--check`, `--dump-board`, `--dump-netlist`, `--import`,
`--set-strips`, `--stretch` and `--update` — eight, read from `kHeadlessFlags[]` and confirmed
against `--help` — plus four test-only verbs, `--author`, `--verify-gui-reconcile`,
`--verify-tango-import` and `--verify-transactional-apply`. **There is no `--move` and no
`--rotate`**; a grep of `Src/Headless*.cpp` for either string returns nothing. An unrecognised
flag still does not error: `Headless::Run` returns -1 and `main()` opens a GUI window, so
`--move low.vrt --ref C19 --to 5,5` times out after 5 s with no stdout and no stderr (MOVE §2.3).
Only the verb list is restated here; the first revision's list omitted `--dump-netlist` and
counted seven.

**The dependency order, re-derived, and it is no longer the numeric order.** The item that was
the prerequisite for everything — M1.1 — is now the one nothing waits on, because `GRID` and
`PIN` already supply every term the scorer and the identity need (§3.1, measured). The order is:

| | item | the dependency, stated as what is impossible before it |
| --- | --- | --- |
| 1 | **M1.2** (§4.2) | You cannot **trust** a score. Scoring is already possible — which is the problem: §4.2's defect is measurably still live at `2cfaad8`, so a wrong score is reachable today and a right one is not distinguishable from it. |
| 2 | **M1.7** (§4.7) | You cannot **certify** that a board conducts what the netlist says and nothing more. It no longer waits on a fork change at all (§4.7), so it is unblocked now, and it can be written and validated against §3.5's four hand-laid boards while there is still no generator to write it around — which is R2's generate-and-grade split at its strongest. |
| 3 | **M1.3** (§4.3) | You cannot actuate **safely**: the guard has to exist in the verb before the verb does, or an optimiser's first no-op is a process abort. |
| 4 | **M1.4** (§4.4) | You cannot actuate **at all**. |
| 5 | **M1.1** (§4.1) | You cannot verify a rotation's effect **in the dump** by reading orientation directly. `DIRECTION` is M1.5's verification field and that is its one Milestone 1 consumer; `BOUNDS`'s consumer is R3's `A_occ`, which is Milestone 2. |
| 6 | **M1.5** (§4.5) | You cannot explore orientation — the axis behind 68–75% of every board's cuts, and the one `--import` never tries. |
| 7 | **M1.6** (§4.6) | Nothing is impossible without it. It buys breadth only, and §4.6 says how much. |

**Two items are therefore out of numeric order, and the numbers are left alone deliberately.**
M1.7 was appended after the first six were specified, and M1.1 has moved from first to fifth in
this revision. Renumbering either would silently invalidate every citation of M1.1 through M1.6 in
the sections below, in the Decisions table, and in the source documents' successors. **The number
is a label; the table above is the order, and where they disagree the table wins.**

**One ordering constraint is a sequencing trap and must be read before M1.2 is implemented.**
M1.7's fourth fixture is §4.2's floated-`C19` board, and the only thing that produces one is a
shipped verb that exits 0 while floating a part — which is precisely what M1.2 removes. **Capture
and commit that fixture from the current binary first.** Afterwards no shipped verb will produce
one, and a negative fixture that cannot be regenerated is a negative fixture somebody will delete
as unexplained. It was produced in the course of this revision (§4.2) and the command is there.

**M1.7 no longer enlarges Milestone 1.** It did when it was specified, because it carried a second
round of dump-grammar work. §4.7 records what `2cfaad8` supplies and what the fork never needed to
supply, and what is left of M1.7 is entirely in this repository. H8 remains a hard constraint and
is unaffected: what shrank is its prerequisite, not the gate.

Every item that *is* a change to `.tools/veroroute-perfboard` changes a **pinned fork**
(`veroroute.pin`, commit `2cfaad8171cd9a2be881117d19f4d748e8e1a4a0`). Moving the pin
follows the existing rule: deliberately, in its own commit, saying what changed upstream
and why — **and rebuilding, because the pin and the build are separate facts and disagreed once
already** (D25). Every new verb must be registered in **both** `kHeadlessFlags[]` and
`Headless_help.cpp`, or it hangs a build instead of failing it;
`tests/usage.test.ts` already enforces that agreement in both directions (MOVE §2.3).

### 4.1 M1.1 — two dump fields and a help correction

**This item was the prerequisite for everything and it is not one any more.** `2cfaad8` supplies
what the scorer needs, so M1.1 keeps only the fields the fork still does not print *and* something
in this document still reads. It is fifth in the dependency order, not first.

**What the fork now supplies, and what each of M1.1's four original fields became
(measured here, second revision**, `grep` over `Src/Headless_dump*.cpp` and a dump of the
committed low-boost board**):**

| field as first specified | status at `2cfaad8` |
| --- | --- |
| `ROWS <n>` and `COLS <n>` | **Superseded and deleted.** `GRID <rows> <cols>` prints exactly this, always, once. H6 reads it directly (§2.2) and the toroid's interpretation follows from it. RE-MEASURE calls the absent board size the "most consequential" of MOVE's gaps; it is closed. |
| `BOUNDS <minRow>,<minCol> <maxRow>,<maxCol>` | **Still absent and still wanted.** `Board::GetBounds` exists (`Board.h:710`) and nothing prints it. Its one consumer is R3's `A_occ` (§2.4, D19), which is specified as a direct reading of it. |
| `DIRECTION <W\|E\|N\|S>` on `PART` | **Still absent and still wanted.** No `Headless_dump*.cpp` calls `Component::GetDirection()`. |
| a row-extent field on `PART`, from `Component::GetCompRows()` | **Deleted.** Its stated purpose was the part's occupied rectangle, "hence occupancy and overlap". `PIN` reads every placed lead's hole directly, so lead occupancy is a reading rather than a reconstruction, and **overlap is not a separate constraint in this document at all** (§2.2): `CanPutDown` refuses a colliding placement and the symptom is a floating part, which §4.2's measurement now shows the dump reports twice. `GetCompRows()` is still printed nowhere — it is used inside `PinHoles` in `Headless_dump_pins.cpp` and never emitted — but nothing here needs it. Deleting it also removes the token-collision hazard the row carried, since there is no board-level `ROWS` to collide with. |

**What is left, and what each one is for:**

| line / field | source | its one consumer |
| --- | --- | --- |
| `BOUNDS <minRow>,<minCol> <maxRow>,<maxCol>` | `Board::GetBounds` (`Board.h:710`) | `A_occ` in R3's lexicographic ranking (§2.4). **Not a substitute:** the bounding box of the `PIN` and `WIRE` holes is computable today and is a *different quantity* — lead extent, not the footprint rectangle, so a part whose body is wider than its lead span is measured short. Using it would silently redefine a settled ranking term, which is a change to D19 and not an implementation detail. |
| `DIRECTION <W\|E\|N\|S>` on `PART` | `Component::GetDirection()` | M1.5's effect check (§4.5), and COST L5's orientation lever. **Not derivable:** a two-lead part's orientation can be inferred from its two `PIN` rows, but a single-pad part has no second hole to compare and a symmetric footprint has no asymmetry to read, and inferring orientation from footprint patterns in `Src/CompTypes.cpp` is exactly the dependence §4.7 refuses for the same reason — a reconstruction that shares the scorer's footprint assumptions is not independent of them. |

Both are appended dump lines in the grammar's own append-only shape, documented in
`Headless_dump.cpp`'s grammar comment at the point of change — or, following
`Headless_dump_pins.cpp`'s own precedent, in the file that prints them.

Also in scope and **not** superseded: **correct `--help`.** It claims `SPAN` is *"direction-aware,
so it reads the same regardless of how the part is rotated on the board"*, and
`GetCols(direction)` is precisely not that (COST §7.3). The claim is still in the shipped grammar
comment at `2cfaad8`. It matters *more* now, not less: `tools/guide/dump.ts` records the correct
reading — *"A part's `SPAN` field is its footprint's own column count … never a lead span"* — but
a consumer who reads `--help` instead of that module gets the false claim, and `PIN` is what makes
the true lead span available to anyone who knows not to trust `SPAN`. **A help text that is wrong
about an observable is worse than a missing one.**

**What the first draft's four consequences became.** Three of them are closed by the fork and one
was never M1.1's to close, and listing them is how the retirement stays checkable:

- **`S_occ` is observable.** It is the count of distinct strips holding at least one `PIN` hole,
  with `VERTICAL_STRIPS` naming the axis — verified on low-boost in §3.1 and on all four benchmark
  boards in §3.5, reproducing COST's probe-derived figures to the unit. COST's reconstruction from
  footprint patterns in `Src/CompTypes.cpp` and `Src/FootPrint.h`, which could not run on low-boost
  at all (COST L3, L4), is no longer needed by anything.
- **Lead spans are observable.** `R2` and `C19` on low-boost reported `SPAN 1` across thirteen
  accepted `--stretch grow` steps that demonstrably changed their span (COST §7.3 item 2). Their
  `PIN` lines do not: the committed low-boost board prints `PIN C19 1 AT 5,13` and
  `PIN C19 2 AT 3,13`, a three-hole span, beside `PART C19 … SPAN 1`. H4, H5 and H9 therefore read
  a lead span rather than a proxy for one.
- **The grid-size probe is retired.** COST obtained the board size by asking
  `--author --op add-wire --at 9999,c` to place a wire past the far edge and reading the clamped
  position out of the refusal. `GRID` prints it. That trick should not have been the interface and
  is not one.
- **"A legal destination cannot be told from an off-board one" was never M1.1's job.** `GRID` gives
  the bound a caller compares against, and the refusal that matters is in the verb: §4.4 requires
  `--move` to verify its landing and refuse rather than wrap, and a board-size line does not make
  that check unnecessary.

**Verified how.** A test asserting each of the two new fields is present on both a
horizontal-strip board and a perfboard. The identity regression test that was specified here
**has already been run and belongs to no future item**: `C = N + J − S_occ` holds as a direct
reading on every board measured in §3.1 and §3.5, including low-boost's hand-checked figures, and
V2 makes it a per-candidate check. What a test must still assert about `DIRECTION` is M1.5's
(§4.5), and about `BOUNDS` is that `A_occ` computed from it equals `A_occ` computed by a second
code path over the same four integers (V1's discipline).

### 4.2 M1.2 — the actuator's floating refusal

**Still the most dangerous gap, and it is first in the dependency order now.** The item shrank
because the *observability* half of it arrived with the fork; what did not shrink is the hard
constraint, because the measured defect is unchanged.

**Re-measured against `2cfaad8` (measured here, second revision**, on a copy of
`boards/pultec-low-boost/pultec-low-boost.perfboard.vrt` taken to the scratchpad — never a board
under `boards/`**):**

```
$ veroroute --stretch low.vrt --ref C19 --direction grow -o s1.vrt ; echo "exit=$?"
exit=0
$ veroroute --dump-board s1.vrt | grep '^PART C19'
PART C19 CAP_FILM .22uF FLOATING SPAN 1
```

**Exit 0, no stdout, no stderr, and a board written with the part off it — on the first step, not
the thirteenth.** `CUT ` is still 5, `NODE` is still 9, and `GRID` is still `14 32`, so nothing
panned. The whole dump diff is **three lines**, and it is worth printing because the difference
from MOVE's one-line diff is the entire change the fork made here:

```
< PART C19 CAP_FILM .22uF AT 3,13 SPAN 1
> PART C19 CAP_FILM .22uF FLOATING SPAN 1
< PIN C19 1 AT 5,13
< PIN C19 2 AT 3,13
```

So the dump now says it twice: the `PART` line's placement field flips to `FLOATING`, **and the
part's two `PIN` lines disappear.** `tools/guide/dump.ts` already records the rule the second
signal rests on — *"A FLOATING component prints no PIN line: it has no holes"*, from
`Headless_dump_pins.cpp`'s own grammar paragraph — and types a missing entry as floating. **A
floating part is observable now, and MOVE §5.2's "cannot see that it has broken the board" is too
strong against this fork.**

**Three things that are not fixed, and they are the whole of the remaining item:**

1. **The actuator still exits 0 and still writes the board.** That is the defect. Observability
   turns a silent corruption into a detectable one; it does not stop the verb producing it, and
   §4.4's trax gate means *every* moved component can be left floating at once.
2. **Every term in `F` still reads as a healthy board.** `C`, `W` and `B` are the cut, wire and
   solder counts (§2.1) and all three are unchanged. A scorer that computes `F` the way §2.1
   defines it scores this board as good. Both signals are sufficient only for a scorer that
   already knows to look at them first and reject — which is still MOVE §5.2's conclusion,
   narrowed from "the signal is missing" to "the signal is not where the score is".
3. **Both signals are component-reported, not copper-derived.** `FLOATING` is
   `Component::GetIsPlaced()`; the absent `PIN` lines are that same predicate, since
   `DumpGridAndPins` skips an unplaced component before it looks at a single hole. The `NODE`
   block is still `GetBoardMembership` over `comp.GetNodeId(p)` (`Reconcile.cpp:51-65`) and still
   lists `C19.1` and `C19.2` as net members. **Two readings of one predicate are not two
   witnesses.** H3 asks for copper, and that is H8's reconstruction (§4.7), not this item.

COST §3.2 hit the same hazard independently: growing `C18` thirteen times left it
`FLOATING` while `--stretch` exited 0 at every step.

**Deliverable, now one part rather than two:**

1. **A refusal in the actuator.** Every verb that takes a part off the board and puts it
   back — `--stretch` today, `--move` and `--rotate` from M1.4/M1.5 — records
   `GetIsPlaced()` for every affected component before acting and **refuses without writing
   `OUTPUT`** if any component that was placed is not placed afterwards. This is the posture
   `Headless_author.h` already states: *"MOST OPS VERIFY THEIR OWN EFFECT before the board
   is written, because several of the underlying calls return void and do nothing silently
   when they cannot act."*

**The second part — a board-level copper-truth line in the dump — is deleted.** It was specified
so a scorer would have one place to look and reject first, rather than joining `PART` lines to
`NODE` lines and noticing an inconsistency. No joining is needed: the `PART` line's own placement
field is that one place, and a part with no `PIN` lines is the same statement again. A third line
asserting what two lines already assert, **from the same predicate**, would be a new dump field
whose only honest content is `GetIsPlaced()` — and a line *named* for copper that reports
component state is the shape this document rejects in §4.7 as worse than no gate, because it
looks like one. **H3 therefore reads the `PART` placement field and the absence of `PIN` lines,
and its copper half is H8's.** The hard constraint is unchanged; only the claim about where its
evidence comes from is now accurate.

**Verified how.** A test that the `C19` stretch above exits non-zero and writes no output. A test
that a board deliberately saved with a floating part is rejected **by name**, reading the `PART`
placement field and asserting the part has no `PIN` lines — two assertions, because a future
change that kept one signal and dropped the other should fail loudly. That fixture is the
floated-`C19` board, which the current binary produces with the command above and which **must be
captured and committed before this item lands**, since afterwards no shipped verb will produce
one (§4). A check that cannot fail proves nothing, and this is the check whose failure mode is
silence.

### 4.3 M1.3 — the zero-delta abort

`Board::MoveComps` opens with `assert(deltaRow != 0 || deltaCol != 0)` and
`assert(!GetDisableMove())`, and the generated Makefile defines `QT_NO_DEBUG` but **not**
`NDEBUG` (MOVE §2.3 item 8):

```
$ grep '^DEFINES' .tools/veroroute-perfboard/build/Makefile
DEFINES       = -DQT_NO_DEBUG -DQT_WIDGETS_LIB -DQT_GUI_LIB -DQT_NETWORK_LIB -DQT_CORE_LIB
```

So `assert` is live in the shipped build, and reaching `MoveComps` with a zero delta is a
**process abort**, not an error message. **An optimiser will propose a no-op eventually** —
a hill-climb sweeping every single-part move enumerates `Δ = (0,0)` by construction unless
something excludes it — and an abort mid-run is indistinguishable from a crash.

**This must be handled in the verb, not in the build.** The two remedies have very
different blast radii and should not be confused:

| remedy | blast radius | decision |
| --- | --- | --- |
| Guard in the verb: refuse a zero delta, and refuse when `GetDisableMove()`, before calling | one new verb; mirrors the GUI, which guards both (`HaveZeroDeltaRowCol` at `mainwindow_events.cpp:814`, `GetDisableMove()` at `:1013`) | **adopted** |
| Define `NDEBUG` in the build | disables *every* assert in the binary, including ones that are currently the only thing stopping worse states | **not adopted**; a separate decision if ever wanted |
| Change the asserts to returns in `Board_components.cpp` | changes the Board layer's contract for the GUI too | **not adopted** here |

Note that going through `MoveUserComps` rather than `MoveComps` gets both guards for free
(`Board_components.cpp:1021-1022`) — but it then *returns early and silently*, giving a
clean exit 0 and an unchanged board. So the verb guards explicitly and says which guard
fired. **Refusals teach.**

**Verified how.** A test that `--move --ref R2 --delta 0,0` exits non-zero with a message
naming the zero delta and writes no output; a test that the process does not abort (exit
status distinguishable from a signal).

### 4.4 M1.4 — an absolute move

`Board::MoveComps(compIds, deltaRow, deltaCol)` and `Board::MoveUserComps(deltaRow,
deltaCol)` take a **delta**, never a destination. Nothing in `Board.h`, `Board*.cpp`,
`CompManager.h`, `Component.h` or `FootPrint.h` takes a target row/column for a
placed part (MOVE §1.1).

Three properties make `delta = target − current` *not* equivalent to a destination API:

1. **Coordinates wrap toroidally.** `MoveComps` calls `MakeToroid(newRow, newCol)` on every
   component, and `Grid.h:356-370` wraps rather than refusing. An overshoot does not fail —
   it lands somewhere else, and looks like a successful move.
2. **The `bool` is `bPanned`, not success**, and **`PutDown`'s result is discarded** at
   `Board_components.cpp:1139`. The part is taken off its old position at step 4 *before*
   anything checks whether the destination is free, so a blocked move leaves it floating and
   says nothing (MOVE §1.3).
3. **A pan shifts every coordinate on the board.** `MoveComps` calls `Pan()` when the moved
   rect would leave the grid, growing the board. COST's own measurement hit this: thirteen
   `--stretch` steps on `C19` **silently shifted low-boost's whole circuit up by three rows**
   (COST §7.1). A caller tracking positions across moves that does not know this is wrong
   about every part it did not move.

**Deliverable.** A `kShipped` verb — the same character as `--stretch`, a deliberate single
edit to a named part — with the grammar MOVE §2.1 proposes:

```
--move BOARD --ref NAME (--delta R,C | --to R,C) -o OUTPUT
```

Reusing, not re-deriving, `Headless_author.cpp`'s `ClickSelectComps` (MOVE §2.2 step 3),
which already mirrors the GUI's selection sequence and has already been corrected twice.
Each step names its GUI counterpart, per the fork's stated convention: *"THIS IS NOT A
PARALLEL IMPLEMENTATION."*

It must, before writing `OUTPUT`:

- **take a destination** (`--to`) and compute the delta inside the verb;
- **refuse rather than wrap** — verify the part's final `GetRow()`/`GetCol()` equals the
  request and refuse otherwise;
- **verify every previously-placed part is still placed**, iterating the whole user group
  rather than only `--ref`, because `ResetUserGroup` selects siblings too and because the
  trax gate leaves *every* moved component floating if the track pattern will not go back
  down (MOVE §2.3 items 2 and 5);
- **verify the selection took** — `ResetUserGroup` returns `void` and silently ignores
  `TRAX_COMPID`, so check `GetIsUserComp(compId)`, which is what `OpSelect` already does;
- **report any pan.** Refusing on a pan is the honest cheap option and is also a real
  restriction, which belongs in the help text rather than being discovered. If `--to` is
  accepted across a pan, the verb re-expresses the target against the panned board and still
  verifies the landing.
- never write to a path it derived itself: one `-o`, required (`Headless.cpp:76-86`).

**Verified how.** A test per refusal: an occupied destination refuses and writes nothing; an
out-of-range `--to` refuses rather than wrapping (assert the landing, not just the exit
code); a move that pans is reported as such; a move of a part in an operator-made group
reports every component the group held. Plus the positive case: `--to R,C` lands at exactly
`R,C` and the dump says so.

### 4.5 M1.5 — rotate

`Board::RotateUserComps(bool bCW)` and `Board::RotateComps(const std::list<int>&, bool)`
exist (`Board.h:872,876`), with `Component::Rotate` (`Component.h:548`) as the per-part
primitive. **No verb exposes any of them** (COST §7.2).

This is not a nice-to-have. Part orientation is the structural lever behind COST §3.1's
68–75%: the four import-placed boards have every part lying *along* the strips and sit at
`J ≈ P − N` (48, 28, 24, 18 against `J` of 46, 27, 24, 16 — exact on hi-cut), while
low-boost has every part *across* and sits at `J = 1`. `--import` never tries any direction
but `'W'` (MOVE §3), so the baseline does not explore this axis at all, and today nothing
headless can.

**Deliverable.** A `--rotate` verb of the same shape as M1.4, comparing `GetDirection()`
before and after as its effect check, with M1.2's floating refusal and M1.3's guards.

**Note the trap it inherits, and what defused it.** `--help`'s claim that `SPAN` reads the same
regardless of rotation is false, because `GetCols(direction)` swaps rows and cols for `N`/`S`, and
the false claim is still in the shipped text at `2cfaad8` (§4.1). **That was the reason M1.1 was
listed first, and it is no longer a reason**: `PIN` reports each lead's actual hole, read off the
grid rather than derived from the footprint's shape, so a rotated part's lead span is a reading
and not a `SPAN` interpretation. `tools/guide/dump.ts` already refuses to derive any position from
`SPAN`. The trap survives only for a consumer that reads `--help` and not that module, which is
why correcting the help text stays in M1.1 even though nothing else about M1.1 is urgent.

**Verified how.** Rotating a part changes the `PIN` holes in the expected direction — the lead
span transposes between rows and columns — and, once M1.1 lands, changes `DIRECTION` in the dump.
**The `PIN` assertion is the one that can be written now; the `DIRECTION` assertion is why M1.1
sits immediately before this item** (§4), because reading the orientation directly is what makes
the check independent of the lead pattern, and a single-pad or symmetric part has no lead pattern
to read. Four rotations return the board to its starting dump. This item also closes COST L5 by
making the orientation lever controllably measurable for the first time: rotate one board's parts,
change nothing else, re-measure.

### 4.6 M1.6 — a batch / in-process mode

**An enabler of search breadth, not a correctness item.** Stated that way deliberately,
because the two source documents differ in emphasis and the difference should not be
inherited silently:

- COST §6.3 measured ~13 ms per invocation (20 runs per row) and concluded *"the
  process-per-gesture interface is not the bottleneck and does not need batching."*
- MOVE §4.1 measured at 200 runs per row: `--version` 10.78 ms (the process-launch floor,
  no board), `--dump-board` on mid 11.71 ms, `--adopt` on mid 11.82 ms. Board I/O is
  therefore about **1 ms**, and **launch is 91% of every invocation.**

**The 200-run sample governs, and every timing claim in this document is stated against it.**
The reason is sample size and nothing else: 11.71 ms at n = 200 and ~13 ms at n = 20 agree to
within about 11%, so there is no disagreement to adjudicate on the merits — the larger sample is
simply the better estimate of the same quantity, and preferring it costs nothing. Where this
document previously carried a figure derived from the 13 ms number, it is recomputed (§7.3's Q4
gloss is the one instance).

Both conclusions stand, in the units they are actually about — and the units were run together
before, which is worth separating:

| quantity | at 11.71 ms per invocation | order |
| --- | --- | --- |
| **invocations** (one gesture, one dump, one check) per second | ≈ 85 | 10² |
| **candidate evaluations** per second, at the four invocations §5.5's P2 loop needs — apply, autofill, check, dump | ≈ 21 | 10¹ |

The one-move verb at order 10² gestures per second is enough to drive the climb COST §6
specifies, so **batching is not a prerequisite.** Removing the launch floor — 10.78 ms of the
11.71 ms, board I/O being about 1 ms — raises the invocation rate to order 10³, about **12× more
invocations for the same machine time**, a ratio between two measured numbers rather than a
projection. Two honest qualifications on that ratio: it bounds the **launch** saving only and
does not claim the work each invocation performs becomes free; and it widens how much of the
search space a run can cover, not whether its answers are right.

**Deliverable.** A batch form of the move verb, built around
`Headless_transactional.cpp:44-51`'s **`CaptureBoardDump`**, which swaps `std::cout`'s
stream buffer for an `ostringstream` around `PrintBoardDump` so a verb can obtain the exact
`--dump-board` text of an in-memory board with no file round trip. That is exactly the
in-process scoring primitive a batch needs, and it already exists.

Two constraints the fork's own documents impose:

1. **Per-move verification, not one check at the end.** MOVE §2.3 lists five ways a single
   move does nothing quietly. A batch that verifies only the final state cannot say which
   move broke it.
2. **Transactional honesty.** `ApplyReconciliation` is expected to leave the in-memory board
   byte-identical when it rejects, and `--update` never saves on a failed apply. A batch
   inherits that standard: if move *k* of *N* fails, either the whole batch is refused and
   `OUTPUT` is never written, or the verb reports exactly which prefix landed. Silently
   saving a partial batch is the one outcome every existing verb is built to avoid.

**Ordering is deliberate: `--move` first, batch only once the one-move form's verification
is proven** (MOVE §4.3). Building the batch first means writing the verification and the
loop at once, with nothing to check the verification against.

**Rejected alternative, named on evidence.** A long-lived process fed moves on stdin would
remove the 10.78 ms floor entirely, and it is a larger change: a REPL is a new interaction
model, not a verb, and the fork has no precedent for one. The measured numbers say the batch
verb captures nearly all of the available saving without it.

**Verified how.** A batch of N moves produces a board byte-identical to N sequential
one-move invocations; a batch whose move *k* fails writes no output and names *k*; the
in-process dump text is byte-identical to the `--dump-board` text for the same board state.

### 4.7 M1.7 — the netlist-equivalence gate (H8), reconstructed from copper

**This item was "per-net copper geometry, and the netlist-equivalence gate". The geometry half is
retired** — `2cfaad8` prints what the reconstruction needs, and two of the fields the first draft
asked for were printed before it was written. What is left is the gate, and the gate is the part
that mattered.

**What H1, H2, H3 and H7 do not do between them: reconstruct the board's connectivity from the
board.** Each is a reading of VeroRoute's own conclusion about a board, taken from the same
subsystem the optimiser is perturbing:

| | what it proves | whose conclusion it reads |
| --- | --- | --- |
| H1 | every net is complete | `--check`, over `GetBoardMembership` |
| H2 | the cut list is derivable | `DeriveCuts` |
| H3 (with M1.2) | nothing floats | component placement state, twice — the `PART` line's placement field and the absence of `PIN` lines, both `Component::GetIsPlaced()` (§4.2) |
| H7 | the part set still matches the circuit | `--check`'s schematic delta |

**And that subsystem is already known to have a hole.** `GetBoardMembership`
(`Reconcile.cpp:51-65`) iterates `comp.GetNodeId(p)` — what the *component* records — rather
than the copper, which is precisely why §4.2's floated `C19` left the `NODE` block identical
and went undetected. A completeness verdict computed from component records cannot be the
independent witness that the copper is right, because the failure mode is the records
disagreeing with the copper.

So H8: **compute the connected components of the copper, outside VeroRoute, and compare their
partition of the pins against the reference netlist.** Two directions of failure, both required:

- a reference net whose pins fall in **two or more** copper components — an **open**, a
  connection that should exist and does not;
- **two or more** reference nets whose pins fall in **one** copper component — a **short**, a
  connection that should not exist and does.

A completeness check detects the first and is structurally blind to the second: a short joins
two nets and leaves both of them "complete". Nothing in H1–H7 looks for a short at all.

**Where the review that prompted this is wrong, and it is still wrong.** The review suggested this
might be a matter of documenting what `--check` already does and adding fixtures. It is not.
Treating H8 as a documentation task would produce a gate that re-reads `GetBoardMembership` under
a new name and reports independence it does not have, which is a worse outcome than no gate
because it looks like one. **That argument is unchanged. What has changed is the cost of doing it
properly**, and the first draft overstated it.

**Deliverable, part one: the observability — retired.** The first draft read H-8 as saying the
geometry does not exist in the dump and specified a second round of dump-grammar work to add it.
Measured against `2cfaad8`, every input an independent reconstruction needs is printed, and **two
of the four rows were already printed when the row was written.** Row by row, so the retirement is
checkable rather than asserted:

| what was to be made readable | status, and why |
| --- | --- |
| **the holes each net's copper paints**, per net, as `(row, col)` runs | **Not printed, not needed, and adding it would weaken the gate.** It is VeroRoute's own assignment of nets to holes — the conclusion H8 exists to check independently — so a reconstruction reading it would be reading `AutoFillVero`'s answer and comparing it with the netlist. The copper graph a stripboard actually has is **geometry, not net assignment**: a strip is continuous copper, a `CUT` severs it, a `SOLDER` joins two neighbouring strips at a column, a `WIRE` joins its two ends, and COST §1.5 enumerates exactly those three join mechanisms and no fourth. All of it is printed. |
| **the hole each component pin occupies** | **Supplied, and supplied the way the row demanded.** `PIN <name> <pin> AT <row>,<col>` is read off the grid itself — `Headless_dump_pins.cpp` walks the footprint rectangle and takes `Element::GetSlotPinIndex` per hole — **not** reconstructed from the footprint patterns in `Src/CompTypes.cpp` and `Src/FootPrint.h` the way COST §1.6's script had to, and COST L4 records that the script could not run on low-boost at all. The one requirement that made this row more than a convenience is met exactly. |
| **cut positions**, as `(row, col)` with the side they cut | **Was already printed, and the row was wrong when written.** `CUT <row>,<col>,<nodeId> <row>,<col>,<nodeId>` has carried both positions since Task 11f; the first draft said the `CUT` lines "are counted today" and needed locating. The reconstruction **ignores both `nodeId` fields**: they are `Element::GetNodeId()`, VeroRoute's assignment again, so using them would reintroduce exactly the dependence this item exists to avoid. The positions are all it takes. |
| **the strip axis**, as a board-level line | **Was already printed, and this row was wrong too.** `VERTICAL_STRIPS <0|1>` is always emitted, and `VERO_TRACKS <0|1>` distinguishes a stripboard from a perfboard. A tool reading the dump has been able to tell which neighbour relation is "the same strip" all along. |

Two inputs the original table did not list and the reconstruction also needs, both printed:
**`GRID <rows> <cols>`** for each strip's extent, and **`WIRE <name> AT <row>,<col> ENDS <end>
<end>`** for the wire edges.

**So M1.7 is no longer a fork change at all, and §4.7's own caveat is what caught it.** The first
draft wrote: *"the implementation plan must enumerate the remaining fields, rather than assuming
this table is a complete list of what is missing."* Enumerated against `2cfaad8`, the remaining
fields are none. Two rows were already satisfied, one is satisfied by the newer fork, and one is a
field the gate is better off without. **H8 is unaffected as a hard constraint** — what shrank is
its prerequisite, not the gate — and the whole of M1.7 is now part two below, in this repository.

**Deliverable, part two: the reconstruction — and it is now the whole item.** A module in this
repository that reads the dump text and nothing else, and:

- builds the copper graph with edge set exactly the three join mechanisms COST §1.5 enumerates
  — an uncut within-strip neighbour, a derived solder bridge between adjacent strips at a shared
  column, and a wire — plus nothing. **The edge relation is reviewed against COST §1.5 and is
  not re-derived here**, because §5.2's correction is precisely that a plausible fourth
  mechanism (a stretched two-terminal part as a join) does not exist and a pipeline that
  believes in it produces boards that do not conduct;
- takes pin-to-net **from the reference netlist export**, which is upstream of VeroRoute
  entirely, and pin-to-hole and hole-to-hole from the dump geometry;
- **never reads the `NODE` lines, and never reads any `nodeId` field.** The `NODE` block is
  `GetBoardMembership`'s output and the `nodeId` on a `CUT` line is `Element::GetNodeId()`; both
  are VeroRoute's own net assignment, and not reading either is the independence. The `CUT`
  line's two **positions** are read and its two node ids are discarded. A test asserts the
  module still produces a verdict from a dump in which the `NODE` block has been emptied — if it
  does, it is reading the right lines.

It shares no code with the scorer and no code with `--check`. This is R2's generate-and-grade
split applied to connectivity: the thing that mutates the board and the thing that certifies it
are two implementations of nothing in common.

**Verified how — and the negative fixtures are the deliverable, not a courtesy.**

1. **An open.** A fixture board on which one net is severed — a cut inserted inside a net's run,
   or a required wire removed. H8 must reject it and **name the net and the two components its
   pins fell into.**
2. **A short.** A fixture board on which two nets share a strip with the separating cut removed.
   H8 must reject it and **name both nets.** This is the fixture no existing check catches, and
   it is the reason the gate exists.
3. **Agreement where agreement is expected.** On the frozen low-boost fixture (§3.2.2) and on
   **every board of §3.5's benchmark set** — three of which pass `make check` independently —
   H8's partition equals the reference netlist's. A disagreement is a bug in one of the two and
   **refuses the run** rather than picking a winner. This is the positive case the widened
   benchmark set buys: four externally authored boards, with an IC, transistors, wires and solder
   bridges among them, graded before any actuator exists to perturb them.
4. **The known hole, closed.** §4.2's floated-`C19` board — the one where every term in `F` reads
   healthy — must be rejected by H8 as well as by M1.2, from a different direction. Two
   independent detections of one measured failure is the standard; one is a coincidence. **That
   board is producible from the current binary and must be captured before M1.2 lands** (§4,
   §4.2).

**The cost, restated downward.** As first specified M1.7 added a second round of dump-grammar work
to the fork, a reconstruction module and three fixtures to this repository, and a per-candidate
check strictly more expensive than counting lines. **The fork work is gone** (part one above):
what remains is the module, the fixtures and the per-candidate check. The first draft's conclusion
that "Milestone 1 is larger than the six items it was first specified with, and this item is why"
**no longer holds**, and §4's ordering table is where the milestone's shape is now stated. The
alternative to the item was accepting that the one subsystem known to read component records
instead of copper is also the only witness that the copper is right, which was never an
alternative and still is not.

---

## 5. Milestone 2 — the pipeline

### 5.1 Replace the placer

`--import`'s sweep is netlist-blind and has no strategy to improve (§1, MOVE §3). It is also
**order-dependent** — the result is a function of netlist part order, which is a function of
the KiCad export, and nothing records that dependency — and it **always succeeds**, because
`while(!bOK)` grows the board until something fits, so it cannot report a placement failure,
only an unboundedly tall board.

The replacement does not patch that loop. It takes the board `--import` produces as a
starting state and drives it with M1.4/M1.5/`--stretch`, scoring with `--dump-board`. The
`.vrt` is a binary `QDataStream` and **the only legitimate writer of one is the veroroute
binary** (MOVE §6.3 item 5), which is the whole reason Milestone 1 exists.

### 5.2 The two levers, exact and exhaustive

From the identity, `C = (N − S_occ) + J`. Those two addends sum to the whole cut count, so
the levers are not a guess and there is no third one (COST §3.6).

**Lever 1 — clustering: put a net's pins on one strip.** Drives `J` toward 0, worth exactly
one cut per split eliminated, and it simultaneously removes a join that would otherwise need
a bridge or a wire. It is **68–75% of every unfinished board's cuts**: 46 of 65 on mid, 27 of
40 on hi-boost, 24 of 32 on hi-cut, 16 of 23 on low-cut (COST §3.1). Do this first.

**Lever 2 — spend strips.** Drives `S_occ` toward `N`, worth exactly one cut per additional
strip that takes a net off a shared strip, exhausted at `S_occ = N`. Worth 19, 13, 8, 7 and 4
cuts on the five boards — and **already paid for**: mid occupies 4 of its 35 available rows,
and the four import-placed boards have 31, 32, 32 and 33 unused rows (COST §3.3, §2.2).

**Stretch is the enabler, not a cost term.** Its value is already counted inside the two
levers. What it buys is reach: **it lets a pin land on the strip its net already occupies, so
no join is needed in the first place** (COST §1.5).

**The correction that must not be lost.** A component lead can **never** supply a
segment-join. A two-terminal part's two leads sit on two *different* nets by construction, so
stretching it across strips `r` and `r+n−1` connects net A to net B — it does not rejoin one
net's two segments. Joins come from exactly three things: a **solder bridge** between
adjacent strips at a shared column (VeroRoute derives these itself), a **wire** for
non-adjacent strips (nothing derives these, so a net needing one and lacking one is reported
`incomplete`), or a **multi-pin part with two pins on one net** (COST §1.5). A pipeline that
treats a stretched resistor as a bridge will produce boards that do not conduct and score
them as if they did.

A second premise correction worth carrying: a two-terminal part with both leads on one strip
is a short **only if no cut separates them**. With a cut between them it is an ordinary,
correct stripboard idiom, and it is what four of the five committed layouts do for every
single part. It is not an impossibility, it is a price.

### 5.3 Feasibility is established; reach is the open question

COST §6.4 measured the five net graphs' RCM bandwidths — net-graph vertices are nets, edges
are forced by on-board components, off-board components break out as free single-hole pads
and force nothing:

| board | nets | max degree | bandwidth lower bound `⌈maxdeg/2⌉` | RCM ordering bandwidth (an upper bound) |
| --- | --- | --- | --- | --- |
| mid | 28 | 6 | 3 | 5 |
| hi-boost | 20 | 6 | 3 | 4 |
| hi-cut | 14 | 10 | 5 | 9 |
| low-cut | 14 | 12 | 6 | 11 |
| low-boost | 14 | 10 | 5 | 9 |

All five are inside the tool's 15-strip span ceiling, with margin. **So clustering is
geometrically feasible, and the tool's span limit is not the obstruction.** What limits how
aggressively it can be pushed is physical reach — §8.2 — not whether.

A bandwidth of `b` needs a part spanning `b + 1` holes, i.e. a lead pitch of `b × 2.54 mm`.
Arithmetic on the footprints this repository fixes (DIN0207 resistor: 6.3 mm body on 10.16 mm
pitch; B32529 film capacitor: 7.2 × 2.5 mm body, leads on 5.00 mm centres leaving the same
face — COST §3.2):

| needed bandwidth | span (holes) | lead pitch | lead past a DIN0207 shoulder, per side | outward splay per B32529 lead |
| --- | --- | --- | --- | --- |
| 4 (hi-boost) | 5 | 10.16 mm — the DIN0207 footprint's own pitch | 1.93 mm, already bent out at that pitch | 2.58 mm |
| 5 (mid) | 6 | 12.70 mm | 3.20 mm | 3.85 mm |
| 9 (hi-cut, low-boost) | 10 | 22.86 mm | 8.28 mm | 8.93 mm |
| 11 (low-cut) | 12 | 27.94 mm | **10.82 mm** | **11.47 mm** |
| 15 (the tool's ceiling) | 16 | 38.10 mm | 15.90 mm | 16.55 mm |

The last row reproduces COST §3.2's two figures, which is the arithmetic's check. **This is
arithmetic on footprints, not a reach claim** — exactly as COST states it, and §8.2 says what
would make it one. The binding row is low-cut's: one net per strip on all five boards at these
orderings requires about 10.8 mm of lead past a resistor's shoulder and about 11.5 mm of splay
on a film capacitor.

Measured stretch headroom in the tool, against today's model (`CAP_FILM2` at 3 holes,
`RESISTOR4` at 5): **13 increments on every film capacitor and 11 on every resistor**, with
`--stretch --ref board_terminals` refused immediately, because a terminal block's pin pitch is
not a lever (COST §3.2).

### 5.4 One constraint on the arrangement, not an obstruction

`junction_signals` on every board is a `SIP5` carrying all five ladder nets at 1-hole pitch.
Turned across the strips it pins those five nets to five consecutive strips in a fixed order;
laid along a strip it puts five nets on one strip and costs four cuts. It is the only component
forcing more than two nets together (COST §6.4). The pipeline must treat it as a fixed
sub-arrangement, not as a part to be placed independently.

### 5.5 Pipeline stages

Following COST §6.2's phases, with the actuators Milestone 1 supplies:

| stage | what it does | writes |
| --- | --- | --- |
| **P0 targets** | per board: `N`, `P`, `C_floor = max(0, N − R)`, the net graph, max degree, the bandwidth bounds. COST §2 and §6.4 are this stage, already done for the five boards. | the run directory's `targets.json` |
| **P1 seed by construction** | assign one net per strip in a low-bandwidth linear arrangement; place each part across the strips of its two nets; stretch to reach. Should land at or near `J = 0`. **Search is for what construction cannot reach.** | a candidate `.vrt` |
| **P2 climb** | search on `F` with the move set `move / rotate / stretch / add-wire / delete-wire` **plus §7.4's net-cluster move**, evaluating each candidate by applying it to a scratch copy, running `--author --op autofill`, dumping, computing `F` and checking H1–H9. Reject on any hard-constraint failure. Accept on `ΔF < 0`, or on `ΔF = 0` with a strictly better R3 ranking, or under §7.4's bounded worse-acceptance if a bound is configured. Restart per §7.4 when a climb exhausts. | candidates and their scores |
| **P3 grade** | the full acceptance check (§9.2) on the best candidate, independent of the generator; rank the admissible candidates by R3 | `run.json` |
| **P4 report** | the layout, the canonical metrics, which stopping rule fired, **the bound status (§7.3)**, and what remains open. Then a human makes the judgement calls `CLAUDE.md` reserves. | the run directory |

`--author --op autofill` re-runs `AutoFillVero` without needing a netlist, which is what makes
a fast evaluation loop possible at all (COST §7.4). Note that `AutoFillVero` runs on `--update`
and on `--author --op autofill` and **not** on `--import --strips` or `--set-strips`, and an
unpainted board reports `CUT_STATE UNRESOLVED` with no cut list — so the identity is not
silently wrong there, it is refused (COST A2). H2 is that refusal, surfaced.

**The generator and the grader must not share code.** P2's move generator proposes; P3 grades
with the full check. This is the sibling repository's most valuable property and §6 carries it
over verbatim.

---

## 6. What to reuse from the sibling repository, and what not to

The tooling is in **`/Users/orion/work/pedals-work/digital-pedal-platform`**, not `pedals`:
`pedals` has no `tools/placement/`, no `make/krt.mk` and no `pcb/` directory at all (MOVE
§6.1). `digital-pedal-platform` has `tools/placement/` (31 files, 3,441 lines), `tools/krt/`,
`make/krt.mk` and rule files under `fuzz/boards/<board>/placement-rules.json`. **Treat it as
read-only.** Nothing in it is to be modified; it is read to make this section concrete.

It is less of a cold start than it looks: `digital-pedal-platform/tools/perfboard/check.ts`
already spawns **this fork's binary** and parses `--dump-board` `CUT` lines.

### 6.1 Reuse — the architecture

| | What | Why it ports |
| --- | --- | --- |
| R1 | **Schema-versioned JSON rules with a strict loader.** `placement-rules.json` carries `"schema": 1`; `tools/placement/rules.ts` loads it through `rejectUnknown`, `requireArray`, `requireNumber` (`strict.ts`), so an unknown key is an error, not ignored. Each entry carries a free-text `note` recording *why* the number is what it is. | This project's "refuse rather than guess" and "an empty whitelist that refuses loudly beats a general rule that quietly accepts a guess", and "refusals teach". Reuse the shape and the strictness; the rule vocabulary is different. |
| R2 | **The generate-and-grade split, where repair only PROPOSES.** `repair.ts`: *"The repair only proposes; the caller grades the result with the full intent check, so a repair can never weaken acceptance."* | The single most valuable property to carry: an optimiser's move generator must never also be its acceptance test. It maps onto Milestone 1 exactly — the move verb actuates, the dump scores, and the two share no code. |
| R3 | **A declared, lexicographic ranking.** `routeAll.ts` exports `RANKING` as a string constant stating the order in prose, with the reason for each position beside it. | A reviewable ranking beats a weighted sum with tuned coefficients. The stripboard order is §2.4's five terms: **cuts, then wire bridges, then solder bridges, then occupied bounding-box area, then pin-bounding-box wirelength** — and `F`'s `ρ` weights exist for the one trade the owner actually has an opinion about (§8.1), not as a knob to fit. |
| R4 | **Two-condition termination, one of which is "stop and fix the cause".** `routeAll` stops once `passes` candidates pass (default 5) **or** when `sameFailures` results in a row share a failure signature (default 3), because a repeated failure is *"a systematic cause to fix, not a candidate to skip"*. | Directly portable. The stripboard failure signature is the failing check names plus the set of floating parts and the `CUT_CONFLICT` positions. It gives a principled stop that is not an iteration cap. |
| R5 | **Run directories, never the canonical artifact; adoption separate.** Runs land under `build/`; only an explicit `adopt-<board>` writes a board. | Matches the fork's own rule — `-o` required, the input board never edited in place (`Headless.cpp:76-86`) — and §9's single gate. |
| R6 | **Provenance manifests keyed by content hash.** `manifest.ts`'s `run.json` records `source.sha256`, `intent_sha256`, `rules_sha256`, `policy_sha256`, `engine_commit`, the overrides used, and per-candidate `sha256` plus checks plus metrics. | This project's "derived artifacts are regenerated every run and compared by content, never by timestamp", with the hashes written down. Hash the pinned veroroute commit where that tooling hashes `engine_commit`. |
| R7 | **Seeded determinism.** `--seeds 0 1 2 3 4`, the seed recorded per candidate. | A reproducible optimiser run needs exactly this, and §10's V6 depends on it. |
| R8 | **The injected-spawn / no-default-binary posture.** `tools/perfboard/check.ts` injects `SpawnVeroroute` for tests and **throws** when `VEROROUTE` is unset rather than guessing a path: *"A hardcoded `$HOME/src/...` is right on exactly one machine and wrong everywhere else... a spawn that quietly fails is the shape that reads as a clean board."* | Both halves. This repository already resolves `VEROROUTE` through `make/veroroute.mk` with an explicit override winning, so the two postures compose. |
| R9 | **The Makefile *pattern*** — `place-<board>` / `route-<board>` / `check-intent-<board>` / `adopt-<board>`, runs under `build/`, a required `FROM`. | A pattern worth copying. The engine-acquisition machinery is not: the engine is already here and already pinned. |

### 6.2 Do not reuse

| | What | Why not |
| --- | --- | --- |
| N1 | **All of `tools/placement/geometry.ts` and the millimetre rule semantics** — courtyards, `Rect`, `circleHitsRect`, `overlaps`, `inside`, `translate`, `separation.min_mm`, `proximity.max_mm`, `anchors.tolerance_mm`, `rot_tolerance_deg`. | Stripboard is an integer row/column grid. Clearance is not a continuous distance and overlap is hole occupancy — and here it is not even a check, because `CanPutDown` refuses a collision and the symptom is a floating part (§2.2). Porting mm geometry onto a hole grid introduces a unit that does not exist in the `.vrt`. |
| N2 | **`repairProximity`'s continuous sweep** at `STEP_MM = 0.1` with `MARGIN_MM = 0.3`. | The stripboard search space is enumerable exactly — every (row, column, direction) triple — so a continuous sweep with a margin is both wrong and unnecessary. |
| N3 | **The `KiCadRoutingTools` engine, and `make/krt.mk` as more than a pattern.** | It is a PCB autorouter and knows nothing of strips, cuts or solder bridges. The veroroute fork is this project's engine, already vendored and already pinned. |
| N4 | **`tools/placement/policy.ts`**, for now. | Its override allow-list exists to fence an external engine's free-form flags. The fork's verbs are a small fixed set with no tunable flags to fence. Revisit only if a move verb grows options worth gating. |
| N5 | **`applyEdits`/`parse` from `@/kicad/sexpr`**, as `repair.ts` uses them to rewrite `.kicad_pcb` text. | A `.vrt` is a binary `QDataStream` (`Headless.cpp:132-141`; `Headless_author.h` notes *"no fixture can be typed by hand"*). The only legitimate writer of a `.vrt` is the veroroute binary. |

---

## 7. The iterative scheme and its stopping rule

The owner asked for a target ratio **driven at iteratively**, not a first solution accepted.

### 7.1 The progress variable

COST §5 established that `C/N`, `C/parts` and `C/P` have no predictive power, and the one
dimensionless number worth tracking is

> **κ = J / (P − N) ∈ [0, 1]** — the fraction of the available splitting a layout has
> committed, so that `C = (N − S_occ) + κ · (P − N)`.

Measured: **0.96, 0.96, 1.00, 0.89** on the four import-placed Pultec boards. The four unfinished
boards are at or within 11% of the worst possible value.

**On the hand-laid boards, every value now measured (§3.5):** **0.055** on low-boost, **0.181** on
`pt2399-core`, **0.196** on `transistor-preamp-staged`, **0.269** on
`transistor-preamp-feedback`. The first revision carried one of these, rounded to 0.06, and read
it as the norm. **It is the outlier**: the three boards that pass `make check` sit three to five
times higher. §7.2.1 is what this document does about that, and it is not what a reader would
expect.

`κ` is comparable across boards of different sizes and is **computable from the dump directly**:
`J = C − N + S_occ`, with `N` the `NODE` count, `P` the `PIN` count, `S_occ` the distinct strips
among the `PIN` holes and the axis from `VERTICAL_STRIPS`. No reconstruction and no M1.1 — §3.1
and §3.5 are that reading, on four hand-laid boards.

### 7.2 The targets

| | target | value | status |
| --- | --- | --- | --- |
| **Drive target** | `κ → 0` | 0 | Not a parameter. `κ = 0` means every net occupies one segment, which is COST §2.1's condition (a). P1 seeds *at* it by construction. |
| **Clustering bound** (admissibility condition A2, not the whole of admissibility) | `κ ≤ κ_bench` | **0.05** | A **parameter** with that default, **settled by the owner as the hard end of a ratchet** (§7.2.1, D23). It sits just under low-boost's measured 1/18 = 0.055, the best result any hand in this repository has reached (§3.5). It is **not** the measured value of any artifact and does not claim to be: it is deliberately just past the best demonstrated one. **The first runs are expected to fail it** (§7.2.1). |
| **Floor tolerance** | `(F_i − F_floor) / max(1, F_0 − F_floor) < τ` | **0.05** | COST §6.4's `S2`, which is `Q2` in §7.3's naming. The owner's tolerance; this is its proposed default. **The two 0.05s are unrelated** — one is a dimensionless clustering fraction, the other a fraction of the gap to a derived floor — and the coincidence of the digits is noted here so nobody reads one as derived from the other. |

**`κ = 0` is not by itself the floor, and a scheme that treated it as one would stop early.**
`C = (N − S_occ) + κ·(P − N)`, so at `κ = 0` the board still carries `N − S_occ` cuts — 19,
13, 8, 7 and 4 on the five Pultec boards (COST §3.3). Lever 2 is what removes those, and it is
already paid for. So `κ = 0` closes the lever worth 68–75% and leaves the remaining 25–32%
on the table. **`C = C_floor` requires both** `κ = 0` and `S_occ = min(N, R)`, and
substituting gives `C = N − min(N, R) = max(0, N − R)`, which is COST §2.1's floor exactly.
That is why §7.3 has no separate "clustering done" terminal rule and why admissibility
carries a floor bound as well as a `κ` bound.

### 7.2.1 The clustering bound is a ratchet, and it starts hard

> **Settled: `κ_bench` starts at 0.05, and every relaxation of it is a deliberate edit carrying
> the evidence that forced it.** The owner's decision: start at a harder bound and back off
> gradually, only if it proves impracticable.

**Why 0.05 rather than the measured values.** The first revision set the bound at low-boost's own
`κ`, rounded to 0.06, because low-boost was the only hand-laid board then in view. RE-MEASURE
shows three more, all passing `make check`, at 0.181, 0.196 and 0.269 — so a bound at 0.06 would
**refuse layouts the owner has already built and which are in service**, including `pt2399-core`,
which this repository describes as transcribed from a board that was physically built and works.
A bar no existing artifact clears is not a bar; it is a bug that happens to be strict.

The obvious repair is to loosen the bound to admit them. **That is not the decision.** The four
measured values are recorded in §3.5 so that nobody can re-derive a loose bound without seeing
them, and the bound is set at 0.05 anyway, for a reason about information rather than about rigour:

- **A bound set where no artifact has ever reached yields nothing when it fails.** Set it at 0
  and every run fails, and the failure says only that 0 was not reached — which was already known.
- **A bound just past the best demonstrated result makes a failure informative.** 0.05 is just
  under 1/18, a value one person reached by hand on one board. A run that misses it has missed
  something a human has done, and the verdict then has to say *what stopped it* — which is the
  reading §7.3 requires and the thing nobody knows yet.
- **A bound set from the other three would be set from boards nobody was minimising cuts on.**
  §3.5 says what each contributes; what none of them contributes is an attempt at a low `κ`.
  0.181 is the cost of not trying, not the cost of trying and failing, and an admissibility gate
  calibrated on the former licenses the latter.

**Why an aggressive bound is affordable, which is the part that makes it safe rather than brave.**
`κ` is not load-bearing on its own. **The per-board floor derived from the identity is the real
grounding**, `C_floor = max(0, N − R)` (COST §2.1), and **A3 already bounds the whole of `F`
against it** — `(F − F_floor) / max(1, F_0 − F_floor) < τ`. A2 and A3 are independent on purpose
(§7.3): one on the dominant lever, one on the total. A board that misses A2 and meets A3 is a
board within tolerance of its own derived floor, which is a real result about a real lower bound,
and the clustering bound does not take that away from it.

**The ratchet, and the precedent it is modelled on.** This repository already has a discipline for
a bound proven over a range, and `CLAUDE.md` states it: value ranges *"are proven with tests over
the range they claim. Extending one is a deliberate edit with a test beside it, never a silent
widening."* `lib/kicad/value-notation.ts` is the worked example — `MIN_OHMS` and
`MAX_OHMS_EXCLUSIVE` carry a comment recording that *"Both ends were widened independently and
both widenings are kept: down to 1R for the Pultec's 430R hi-cut series resistor, up to 10M for
the transistor preamp's bias network"*, each widening named to the artifact that forced it, with
tests asserting both boundaries. `κ_bench` moves the same way:

1. **Moving it requires a run that demonstrably could not reach it**, in the run directory, with
   its `bound` field and its evidence.
2. **The binding constraint is named, and it is named from the constraint side.** §8.4's
   vocabulary is the one that counts: `maxSpanHoles` forbidding the reach, or `minSpanHoles`
   forbidding the compression, with the board and the net pair. H-3's packing feasibility is the
   other admissible answer, and §5.3's arithmetic is what sizes it. **"The search did not get
   there" is not an admissible cause** — that is §7.3's `search-exhausted` or `budget-exhausted`,
   which says nothing about whether a better layout exists, so a relaxation resting on it is a
   relaxation of the wrong number.
3. **It is a deliberate edit to `stripboard/rules.json`**, with the evidence in the entry's
   `note`, a test beside it, and the previous value and its reason **kept** rather than
   overwritten — the union is the record, exactly as the value-notation comment keeps both
   widenings.
4. **Never a silent widening, and never a widening because the gate became inconvenient.** A gate
   relaxed to let a run pass is not a gate. If the reason to move the number is that runs keep
   failing it, the number does not move; the verdict reports the shortfall (§7.3) and the pipeline
   is what gets worked on.

**The first runs are expected to fail this bound, and that is the intent.** It is written here so
that nobody reads the expected outcome as a defect:

- **A run that misses A2 and meets everything else is not a broken pipeline.** §7.3 already
  separates stopping from admissibility, and V8 already requires a non-admissible run to name the
  rule that fired and the gap remaining. **What is added is that a run failing A2 must name the
  binding constraint as well**, so "missed the clustering bound, binding constraint was X" is a
  different sentence from "the pipeline is broken" and neither can be mistaken for the other.
  V12 tests it.
- **§3.3's reading 1 does not apply to it.** "The optimiser is weak" needs `C > 5` on the frozen
  fixture — a failure against the owner's achieved cut count — not a `κ` above a bound set past
  the owner's own value.

**Why the bound cannot refuse a provably optimal layout, which bounds the damage an aggressive
value can do.** The only optimality claim this pipeline may make is `bound = at-floor` under Q1
(§7.3), and `C = C_floor` requires `κ = 0` and `S_occ = min(N, R)` (§7.2). So a layout that
reaches the floor sits at `κ = 0`, which is inside **any** positive `κ_bench`. **A2 can therefore
only ever refuse a layout about which nothing has been proved** — never one that reached a derived
lower bound. The number is a gate on unproven work, which is the only kind of work an aggressive
gate should be allowed to hold up.

### 7.3 Stopping is not accepting

**A run stops for one of six reasons and is admissible for a different one.** Conflating them
is how a pipeline reports success on a board it merely gave up on, so the two are separated and
the run reports both.

**A naming note, because the collision would otherwise be a live ambiguity.** COST §6.4 labels
its stopping rules `S1`–`S5`, and the parent document labels its sub-projects `S0`, `S1`, `S1a`.
In a document that cites both, `S1` would mean two things. The stopping rules are therefore
**`Q1`–`Q6`** here, mapping one-to-one onto COST's `S1`–`S5` in order, with `Q6` added from the
sibling repository's failure-signature termination (R4). `S0`/`S1`/`S1a` keep their parent
meanings throughout this document and refer only to sub-projects.

**Stop at the first of:**

| | Rule | Measured how |
| --- | --- | --- |
| Q1 | **At the floor.** `C = C_floor` and `W = 0` — equivalently `κ = 0` and `S_occ = min(N, R)` and `W = 0`. | Dump counts against P0's `targets.json`. Terminal: nothing below the floor exists. |
| Q2 | **Within tolerance of the floor.** `(F_i − F_floor) / max(1, F_0 − F_floor) < τ`, `F_floor = C_floor`, default `τ = 0.05`. | Arithmetic on counts. |
| Q3 | **Search exhausted.** Every seed's climb has reached a round — a full sweep of the move set of §7.4, *including* the net-cluster move — that produced no accepted move, and no restart remains in the seed list. | The round's accepted-move counter is 0 for the last seed, and the restart schedule is spent. **Not terminal before the seed list is spent:** §7.4 says why a single no-accepted-move round is a restart trigger, not a stop. |
| Q4 | **Marginal yield collapsed.** `(F_{i−1} − F_i) / evaluations_i < 1/2000` for two consecutive rounds: under one unit of `F` bought per 2,000 candidate evaluations. | Counters only. Evaluated **per climb**, with the run-level total also reported, so a restart cannot reset the counter and present a collapsed yield as fresh progress. |
| Q5 | **Budget spent.** The owner's evaluation cap reached. | Counter, at **run** level. Restarts spend the same cap; the schedule's division of it across seeds is recorded (§7.4). |
| Q6 | **Systematic cause.** Three consecutive results share a failure signature (R4). | Signature comparison, **within and across restarts**. Three results sharing a signature across two different seeds is stronger evidence of a systematic cause than three within one, not weaker. Reports the cause; does not retry. |

**Q1 is stated in `C` and `W` while Q2 and A3 are stated in `F`, and the two agree.** `F_floor`
is `C_floor`, so `F = F_floor` needs `W = 0` *and* `B = 0`, and Q1 names only the first. The
second follows rather than being assumed: `κ = 0` means no net is split, a derived solder bridge
exists only to supply a join, and `J = 0` means there is no join to supply (COST §1.5). So `B`
is 0 wherever Q1's conditions hold. Spelled out because a reader comparing the two formulations
would otherwise have to reconstruct it, and a rule whose consistency has to be reconstructed is
a rule somebody will one day read as two rules.

**Q4 is the diminishing-returns rule proper.** `1/2000` is a proposed default and a parameter,
chosen so the threshold is a concrete amount of machine time rather than an impression. At the
governing 11.71 ms per invocation (§4.6), 2,000 evaluations is **roughly 94 s** of machine time
for the P2 loop as §5.5 specifies it — four invocations per evaluation: apply, autofill, check,
dump — and roughly 23 s for a single invocation per evaluation. An earlier draft said "roughly
80 s", which was arithmetic on COST's superseded 13 ms figure and on an invocation count it
never stated; both are corrected here, and the invocation count is now named so the figure can
be checked. M1.6's batch form reduces it. Q2's `τ`, Q5's cap and Q6's run length are the
owner's.

**The bound status, which is not the stopping rule.** The document already draws this
distinction for constrained cut floors — H-2 records that no constrained floor is derived, so a
board whose reach forbids one net per strip has no stated lower bound at all — and the
optimiser's verdict must carry it too. **A run that exhausted its search budget has not proved
that a lower bound exists.** So `run.json` carries a `bound` field with exactly one of:

| `bound` | fires under | what it licenses saying |
| --- | --- | --- |
| `at-floor` | Q1 | **The only optimality claim this pipeline may make**, and only against the *unconstrained* floor `max(0, N − R)` (COST §2.1). Nothing below it exists, so the search cannot have missed anything. |
| `within-tolerance` | Q2 | The result is within `τ` of a derived lower bound. A bound, not an optimum: something better may exist inside the tolerance. |
| `search-exhausted` | Q3 | Every seeded climb stopped improving under this move set. **Says nothing about whether a better layout exists** — only that these moves from these seeds did not find one. |
| `budget-exhausted` | Q4, Q5 | The run ran out of yield or of cap. **The weakest statement available**, and the one most easily misread: a number reached at the end of a budget is where the search stopped, not where the problem bottoms out. |
| `systematic-cause` | Q6 | A repeated failure signature. Not a result about cost at all; a cause to fix. |

Three rules keep the distinction from eroding:

1. **The report's wording is generated from the `bound` field**, not written per run. A phrasing
   table keyed by `bound` means an exhausted run cannot be described as optimal by an author who
   was feeling good about the number.
2. **Only `at-floor` may be reported as a lower bound having been met.** Every other value
   reports the achieved `F`, the derived floor and the gap, with no claim about the gap being
   irreducible.
3. **Where `maxSpanHoles` or `minSpanHoles` binds, even `at-floor` is relative to the
   unconstrained floor** and must say so (H-2). The constrained floor is undetermined; a run may
   not invent one by stopping at it.

**Admissible** is a separate verdict, reached only when **all four** of:

| | Condition | What it bounds |
| --- | --- | --- |
| A1 | H1–H9 all hold. | The board conducts, **has the connectivity the netlist says and no more** (H8), is buildable within the declared reach at both ends (H5, H9), and fits the stock. Nothing is tradeable here. |
| A2 | `κ ≤ κ_bench`, default **0.05** (§7.2.1). | The clustering lever — 68–75% of every unfinished board's cuts. **Deliberately set past the best demonstrated hand result**, so failing it is the expected early outcome and a failure must name the binding constraint, not merely the gap (below, and V12). |
| A3 | `(F − F_floor) / max(1, F_0 − F_floor) < τ`. | The **whole** objective against the derived floor, which is the parent's stated S1a gate: *"cuts and wire bridges within a stated factor of the derived floor"*. A2 alone would pass a board at `κ = 0` that had spent none of its spare strips — mid has 31 unused rows. |
| A4 | On low-boost, **whichever of the two boards is being run**: on the frozen fixture, B1-frozen (`C ≤ 5`, `W = 0`, every net complete); on the scaffolded board, B1-current (A3's bound against that board's own floor, every net complete, and no `W` clause). | A4 previously named one criterion and left which board ambiguous, which is §3.2.1's error reproduced in the admissibility table. The externally authored benchmark is B1-frozen; B1-current is derived. A run states which board it ran and therefore which clause of A4 it met. |

A2 and A3 are independent bounds on purpose: one on the dominant lever, one on the total.
Neither implies the other.

**A4's second clause is deliberately redundant with A3** and is stated anyway. On the scaffolded
low-boost board B1-current *is* A3's bound, so A4 adds nothing there; it is kept as a row so
that a reader looking up "what does low-boost have to do" finds both boards named in one place
rather than finding `C ≤ 5` and applying it to the wrong one. The redundancy is the cheaper
error.

**A run that stops without being admissible exits non-zero and names the rule that fired, the
bound status, and the gap remaining.** It does not hand over a layout as though it were
finished. A skipped check must never look like a passing one, and neither must an abandoned
search.

**And it must say which kind of non-admissible run it was, because `κ_bench` is set past the best
hand result and the expected early outcome is a failure (§7.2.1).** The verdict therefore reports
**which conditions of A1–A4 failed, individually**, and never a single "not admissible":

| what failed | what the verdict must say | what it may not be read as |
| --- | --- | --- |
| **A2 alone**, with A1, A3 and A4 holding | `κ` achieved, `κ_bench`, and **what bound the clustering**: a span bound with its board and net pair (§8.4), a packing infeasibility (H-3), or — where neither applies — the stopping rule that fired, said plainly as the search having stopped rather than as a constraint. The board met every hard constraint and came within `τ` of its own derived floor. | the pipeline being broken, or `κ_bench` needing to move — moving it is the ratchet's business and takes the named evidence, and a stopped search is not that evidence (§7.2.1) |
| **A1** — any of H1–H9 | which constraint, and which net or part | a search result at all. A board that does not conduct has no cost worth reporting |
| **A3** | the achieved `F`, the derived floor and the gap, with the `bound` field's wording (§7.3's three rules) | a bound on what is achievable, unless `bound = at-floor` |
| **A4** | which board was run and therefore which clause applied | B1-frozen having been met, when the run was against the scaffolded board (V3) |

The distinction is not stylistic. **A2 failing and the pipeline being broken produce the same exit
code**, so the only thing that separates them is what the report says, and §7.3's first rule
already requires the wording to be generated from the `bound` field rather than written per run.
V12 extends that to A2.

### 7.4 Escaping a local minimum, and staying reproducible while doing it

**The gap this closes.** The document as first written specified a strictly improving hill
climb and **no escape mechanism of any kind** — a grep of it for *restart*, *plateau*,
*annealing* and *coordinated multi-component move* returned nothing. That is a real defect and
the identity says why, rather than general search folklore saying so.

`C = (N − S_occ) + J`, and `J` counts a net's extra segments. **A net's `J` contribution falls
only when its last stray pin joins the rest**, so moving one of a net's three scattered parts
one hole typically changes `J` by zero and may raise it, while moving all three together to one
strip removes a whole cut. The cost surface over single-part moves is therefore flat or
adverse exactly where the arrangement is one coordinated step from being better. A strictly
improving single-part climb is not merely at risk of being trapped on this problem; the
dominant lever is structurally invisible to it.

Three mechanisms, in the order the argument above recommends them:

| | Mechanism | Why this one | Parameters |
| --- | --- | --- | --- |
| E1 | **The net-cluster move.** The move set gains a move that takes *every on-board part with a pin on net X* and applies one delta, or one rotation, to all of them. Enumerated over the nets, not over the parts. | It makes the dominant lever a single move. Derived from the identity rather than chosen: the unit whose motion changes `J` is a net's pin set. **Required.** | none — the net list comes from the netlist |
| E2 | **Seeded restarts.** P1's seed construction is a linear arrangement of the net graph (§5.5); a restart takes a different low-bandwidth ordering and climbs again, keeping the best candidate across all climbs. | Costs nothing but evaluations, needs no new numeric parameter, and reuses R7's existing `--seeds 0 1 2 3 4` and per-candidate seed record. **Required.** | the seed list, already R7's |
| E3 | **Bounded acceptance of a worse candidate.** Accept `ΔF > 0` within a configured bound, from a recorded seeded PRNG. | The classical escape, and the only one of the three that can cross a barrier `E1` does not happen to span. **Optional, and off unless configured.** | a bound in `stripboard/rules.json` with **no default** — nothing in COST, MOVE or this document supplies a schedule, and this document will not invent one. **Refuse rather than guess**: unconfigured means E3 does not run, stated in the report, not quietly approximated. |

**Plus plateau moves, which are free.** P2 accepts `ΔF = 0` when the candidate is strictly
better under R3's lexicographic ranking (§2.4). This needs no parameter and **cannot cycle**: a
strict decrease in a lexicographic order over a finite set of integer tuples terminates, so a
plateau walk either leaves the plateau or stops. It is also the mechanism that makes `A_occ`
earn its place — on a flat `C` surface the area term is what tells two arrangements apart.

**How this interacts with Q1–Q6.** Restated, because an escape mechanism bolted onto unchanged
stopping rules would be stopped before it ran:

- **Q3 is no longer a stop on its first firing.** A round with no accepted move ends *that
  climb*; it fires Q3 only when the seed list is spent. Without this change E2 is unreachable —
  the rule that used to be "local optimum" would halt the run at the first local optimum, which
  is the condition E2 exists to leave.
- **Q1 and Q2 stay terminal and unchanged.** They are statements about a derived floor, and no
  amount of further search improves on reaching it.
- **Q4 is per climb, with a run-level total also reported.** A restart legitimately resumes
  progress, so resetting the yield counter is correct; hiding that the run as a whole has
  stalled is not, so both numbers appear.
- **Q5's cap is run-level and shared.** The schedule's division across seeds is recorded in
  `run.json`, so "the budget" means one number and a restart cannot quietly grant itself more.
- **Q6 compares signatures across restarts as well as within one** — see its row above.

**How it stays reproducible, which V6 requires.** Every non-determinism introduced here is a
function of the recorded seed and of nothing else:

- the restart schedule — which seeds, in which order, with which share of the cap — is derived
  from the seed list alone, never from elapsed time or remaining wall clock;
- **E1's cluster enumeration order is explicit**, from the netlist's net order, never from
  iteration over a hash map;
- E3's draws come from one seeded PRNG whose algorithm and seed are recorded, never from the
  platform default;
- nothing consults a clock, a PID, a temporary path or a directory listing order.

V6 is extended accordingly (§10): same seed list and same inputs must reproduce the candidates
**and the restart boundaries**, not merely the final board. A run that lands on the same board
by a different path has not demonstrated the determinism the escape mechanisms need.

---

## 8. The two parameters that could not be derived, and are now settled

Both are still **parameters, never constants** — they live in files, with notes, changed by a
reviewed edit. What has changed since this document's first draft is that **neither is
outstanding.** `ρ_w` is supplied by the owner, as an instruction with a reason in it. The
per-family lead spans are supplied as a committed data module derived from datasheets, rather
than as a measurement of the owner's parts drawer. The refusal mechanism §8.2 specified is
unchanged; only the source of the data moved.

### 8.1 `ρ_w` — a wire bridge against a cut, in the owner's own hands

> **Settled: `ρ_w = 0.25`.** One cut costs as much as four wires. The owner's instruction:
> *"favor wires over cuts. cuts are harder and more error prone."* `ρ_s = 1` stands.

**This inverts the reasoning this document previously carried, and the inversion is the finding
— not the number.** The superseded argument ran:

> *A cut is one operation... A wire bridge is several... Pulling the other way: a cut is
> permanent and hard to inspect. A missed cut is an invisible short, and an over-enthusiastic
> one nicks the neighbouring strip. So a bridge is dearer than a cut but not by an order of
> magnitude.* — proposed `ρ_w = 3`

The first two clauses are about **labour** and they are not disputed: a wire is more handling
than a cut. The third clause is where the argument went wrong. It named the cut's permanence and
invisibility and then **entered them on the cut's side of the ledger**, as a reason the gap
between a wire and a cut is not large — treating a risk as a mitigation of the thing that
carries it. The owner's judgement is the opposite and is the correct reading: **the invisibility
*is* the cost.**

| | the superseded argument | the owner's judgement |
| --- | --- | --- |
| a wire's extra handling | counts against the wire | counts against the wire — unchanged |
| a cut being permanent and invisible when missed | *narrows* the gap, so `ρ_w` is above 1 | *is* the cut's dominant cost, so `ρ_w` is below 1 |
| resulting ratio | `ρ_w = 3` — a wire costs three cuts | **`ρ_w = 0.25` — a cut costs four wires** |

So this is a **sign error in the argument**, not a difference of weight, and recording only the
new number would leave the faulty reasoning in place to be re-derived by the next person who
needs a default. The reason it is a sign error and not a taste: a wire bridge's failure modes —
wrong length, lifted, shorting a neighbour — are **visible on the board and reversible with an
iron**. A missed cut is visible nowhere; it is found by a circuit that does not work, and it is
found after the board is built. An error you cannot see while building and cannot undo cheaply
is dearer than an error you can, and the labour difference does not close that gap.

`ρ_s = 1` for a solder bridge stands unchanged: one blob at one hole pair, comparable to one
cut, and VeroRoute derives where it goes without being asked.

**The parameter's effect at both ends, restated for a value below 1:**

- At `ρ_w = 0.25` the optimiser will spend up to four wires to remove one cut, and will not
  spend five. Wire-heavy boards are now a *permitted* outcome rather than a symptom.
- As `ρ_w → ∞` it never bridges, and H1 then forces one net per strip — which is the
  `C_floor = 0` regime. **A large `ρ_w` and a large board are the same instruction.** The owner's
  value is at the far other end, so that equivalence no longer describes the configured
  pipeline; it is kept because it explains why low-boost's hand layout looks the way it does.

#### 8.1.1 `ρ_w` is not the mechanism that reduces the cut count, and this is where that is said

This matters more than the value, because a reader who sees `ρ_w = 0.25` next to the
instruction *"favor wires over cuts"* will reasonably conclude that the parameter is what
delivers fewer cuts. **It is not.** The identity says why:

> `C = N + J − S_occ`

**`J` enters with a positive sign.** Splitting a net costs a cut *and* creates a join that must
then be supplied — by a solder bridge, by a wire, or by a multi-pin part with two pins on one
net (COST §1.5). So a wire does not *replace* a cut; a wire is what pays for a split that
already cost a cut. **Cuts and wires largely move together.** Spending a wire to retire a cut is
not generally an available trade, and a pipeline tuned on the belief that it is would spend
wires and find the cut count unmoved.

The levers that actually serve the owner's stated goal are the two §5.2 derives, and both remove
cuts without buying wires:

| lever | effect on `C` | effect on `W` |
| --- | --- | --- |
| **clustering**, `J → 0` | removes one cut per split eliminated — 68–75% of every unfinished board's cuts | removes the join too, so it removes the *need* for the wire as well. **It removes both.** |
| **spending strips**, `S_occ → N` | removes one cut per additional strip, exhausted at `S_occ = N` | **none at all.** It adds nothing to pay for. And it is nearly free: mid occupies 4 of its 35 available rows, and the four import-placed boards have 31, 32, 32 and 33 unused rows (COST §3.3, §2.2). |

**What `ρ_w = 0.25` actually buys** is permission: where a wire unlocks an arrangement that is
better overall — a clustering that would otherwise be unreachable, a strip assignment that a
part cannot span — the optimiser may spend it without the objective fighting back. It widens the
feasible set. It is not the cut-reduction mechanism, and anybody tuning it in the hope of fewer
cuts is tuning the wrong number.

**One honest gap, unchanged by the parameter being settled:** both Pultec boards measured carry
**zero `WIRE` lines** (MOVE §5.1), so the `ρ_w · W` term is unexercised against real data. The
first board the pipeline produces with a wire on it is the first test of it — and at `ρ_w = 0.25`
that board arrives sooner than it would have at 3.

### 8.2 The per-family lead spans — now data with datasheet provenance

**This is the binding constraint on reaching the floor, and the source for it has been
settled.** It is no longer a measurement the owner is asked to make on the stock in the parts
drawer. It is **a per-family span data module, derived from datasheets**, carrying
`minSpanHoles` and `maxSpanHoles` per part family, being added to the repository alongside its
own documentation page.

**That module is the authority on the span bounds, and this document does not restate its
numbers.** No span figure appears here. H5 consumes its `maxSpanHoles`; H9 (§8.3) consumes its
`minSpanHoles`; and where the two documents could disagree, the module wins, because a number
copied into prose is a number that goes stale without anything failing.

What this document continues to own is the **arithmetic the bounds will be checked against**,
which is unchanged: the repository fixes the footprints and nothing more — a grep of `docs/`
finds body dimensions, lead *pitches* and courtyards, and **nothing at all about how long a lead
is or how tightly it may be bent** (COST §3.2). The tool's 16-hole ceiling implies a 38.1 mm
pitch, which is 15.9 mm of lead past each end of a 6.3 mm DIN0207 body, or 16.55 mm of outward
splay per lead on a B32529 whose leads leave the same face — a different and probably tighter
geometry. §5.3's table gives the figure at every bandwidth these boards actually need; the
binding one is low-cut's, about 10.8 mm and 11.5 mm respectively. Those are **arithmetic on
footprints, not reach claims** — what makes them reach claims is the module.

**What changed, and what did not:**

| | first draft | now |
| --- | --- | --- |
| who supplies the number | the owner, by measuring stock with a rule | a committed data module, derived from datasheets |
| where it lives | a table beside `FILM_CAPACITOR_IMPORT_STRINGS` in `lib/kicad/import-string.ts` | the span data module, with its own docs page |
| what provenance each entry carries | a measurement recorded in a comment | datasheet provenance, per family, in the module |
| which bounds | `maxSpanHoles` only | `minSpanHoles` **and** `maxSpanHoles` (§8.3) |
| what the pipeline does without it | **refuses** | **refuses — unchanged** |

**Why the datasheet source is better than the drawer, and it is not only convenience.** A
measurement of one batch in one drawer is a fact about that batch; a datasheet figure is the
bound the part is sold against, so it survives restocking and it is checkable by a second
person without access to the drawer. **Verify names against the thing itself** applies: a
datasheet is a thing on disk to be cited, where a remembered caliper reading is not.

**What the pipeline does without the data: it refuses.** Both bounds are required parameters
with **no default**, and the pipeline will not run without them. Per this project's practice,
refusing loudly beats defaulting to a guess: the whole point of the stretch lever is reach, and
a span the part cannot physically make is not a lever but a fiction. A default here would
produce boards that score well and cannot be built, which is the worst available outcome
because the arithmetic looks right. **The refusal is the mechanism and it is unchanged by the
source moving** — including for a family the module has no datasheet figure for, which must
refuse by name rather than fall back to the tool's 2–16 bound.

### 8.3 The minimum span — the bound H4 and H5 both leave open

**H4 bounds a span by the tool. H5 bounds it above by physical reach. Nothing bounds it
below by the part.** `--stretch shrink` can therefore compress a part until its two leads are
nearer to each other than its own body is long, and every check in this document would pass the
result:

- `C` falls or holds, because a shorter span is a legal placement and may even cluster better;
- H1 and H8 are satisfied, because the copper is whatever the compressed placement paints;
- H4 is satisfied down to **2 holes**, because 2 is `CompTypes::GetMinLength`'s floor — **a fact
  about VeroRoute, not about any component**;
- H5 is satisfied trivially, being an upper bound.

The arithmetic, on the one footprint this document already fixes: a **DIN0207 is 6.3 mm of body
on a 10.16 mm nominal pitch** (COST §3.2, carried in §5.3's table). A 2-hole span is
2.54 mm × 2 = **5.08 mm** of pitch — less than the body it has to straddle. There is no bending
that achieves it. The pipeline would be scoring an arrangement that cannot be assembled, which
is precisely the failure §8.2 refuses a *default* in order to avoid, arriving from the other
direction.

**So: H9, a hard constraint, from the same data module as H5.** Every lead span at or above the
family's `minSpanHoles`, checked on every candidate exactly as H5 is, and the stretch move
generator never proposes a shrink below it — the constraint is enforced in the grader
regardless, per R2, because the generator only proposes.

#### 8.3.1 The review's remedy is rejected, and the reason is the point of the sub-project

The review that surfaced this gap proposed instead that *"a final physical audit… can remain
manual for the first implementation."* **Rejected.** Three reasons, in increasing order of
weight:

1. **It reinstates the hand work this sub-project exists to remove.** §1 and D2: laying these
   boards out by hand is fiddly, repeatable, measurable work, and **agent cycles are cheaper
   than the owner's**. A pipeline that produces a layout and then hands a person a per-part
   span audit has moved the fiddly work rather than removed it. *A first solution that
   technically works while leaving a person doing remedial work is a failure, not a delivery* —
   that sentence is in §1 and it decides this.
2. **A manual audit is a check that can be skipped silently.** The failure mode of a human
   audit step is that it is not performed, and nothing says so. **A skipped check must never
   look like a passing one** is the practice the whole workflow is built on, and §4.2 is a
   measured instance of what it costs when it is violated by a tool. A manual step is the same
   violation with a person in it.
3. **The bound is data, so it belongs in data.** A minimum span is a number about a part family
   derived from a datasheet — the same kind of thing as `maxSpanHoles`, from the same module,
   with the same provenance. There is no judgement in it to reserve for a human. §9.5 reserves
   buildability judgements for the owner and that reservation stands; "is this span shorter than
   the body" is not one of them, it is a comparison of two integers.

**Where the audit idea is right**, and it is kept in the form the parent allows: an independent
reviewing agent that never authored the artifact may read a board and report that it passes
every rule while plainly being wrong (§9.5). That is a finding against the rule library. It is
not a substitute for the gate, and it is not the author checking its own spans.

### 8.4 Two failures the span data forces the pipeline to distinguish

With the bounds supplied, the pipeline must tell these apart, the way the parent's
outline-expansion loop does:

- *the search did not find the floor* — a retry, a wider move set, a different seed, or one of
  §7.4's escape mechanisms. Reported with a `bound` of `search-exhausted` or
  `budget-exhausted` (§7.3), never as a bound on what is achievable;
- *the floor is unreachable under the supplied bounds* — a design finding and a hard stop,
  reporting which board, which net pair, **which bound bound it** (`maxSpanHoles` forbidding
  the reach, or `minSpanHoles` forbidding the compression) and how much reach would be needed
  (§5.3's table is that arithmetic).

Without the distinction the pipeline either searches an impossible problem forever or stops
with a misleading reason. **No constrained floor is derived in this document** — the
unconstrained floor `max(0, N − R)` is COST §2.1's and stands; what the floor becomes when
either span bound binds is undetermined (§13, H-2). This is the same distinction §7.3's `bound`
field carries, reached from the constraint side rather than the search side, and the two must
agree in a report: a run that stopped because a span bound binds is not a run that ran out of
budget.

---

## 9. How a produced layout reaches the repository

### 9.1 Where candidates live

Under `build/stripboard/<board>/<stamp>/`, gitignored, never `boards/`. This satisfies both
the sibling repository's run-directory discipline (R5) and the fork's own rule that a verb
never writes to a path it derived for itself (`Headless.cpp:76-86`). `place` and `route` leave
`boards/**` byte-identical, and a test asserts it (§10 V7).

### 9.2 The criteria, and where they live

Per the invariant, the producing agent authors none of these.

| What | Where | Who may change it |
| --- | --- | --- |
| `ρ_w` (**0.25**, the owner's), `ρ_s` (**1**), `τ`, `κ_bench` (**0.05**, the owner's, ratcheted), Q4's threshold, Q5's cap, Q6's run length, the seed list, E3's acceptance bound (**no default**) | one repository-level `stripboard/rules.json`, schema-versioned, unknown keys rejected (R1), each entry carrying its `note` — and for `ρ_w` the note records the owner's instruction and §8.1's sign correction, not just the value | a reviewed change, with a test beside it. **`κ_bench` is additionally a ratchet**: its `note` keeps every previous value with the run and the named binding constraint that moved it, and a relaxation without that evidence is refused (§7.2.1, D23) |
| per-family `minSpanHoles` and `maxSpanHoles` | the span data module (§8.2), with datasheet provenance per family. **That module is the authority; nothing here duplicates its numbers.** | a reviewed change, with a test over the range it claims |
| the R3 ranking, including `A_occ`'s position in it | a declared string constant beside the ranker (R3), stating the order and the reason for each position | a reviewed change. §2.4's two reasons for `A_occ`'s position are what a change has to argue against. |
| the stock the owner bought: rows × columns per board | a new declared field in the board's existing `boards/<board>/perfboard.json` | the owner — it is a fact about a purchase, not a judgement |

**The parameters are circuit-independent and reviewed once, deliberately, in the parent's rule
library pattern**: changing them is a reviewed change, using them is not. There is no per-board
criteria file an agent could draft, which is the hole a per-board file would open.

### 9.3 The gate

**One command admits a layout, and it is the only thing that writes under `boards/`.** A new
verb on the existing CLI (`tools/cli/perfboard.ts`), named in the implementation plan, acting
on `$(CURDIR)` the way every other verb there does — no `BOARD=` variable, because two ways to
say which board is two places for one fact to be wrong.

It refuses:

1. a candidate whose `sha256` differs from the one `run.json` records, and a candidate whose
   **canonical artifact hash** (§10, V6) differs from the recorded one;
2. a `run.json` whose rules / span-data / stock hashes differ from the current committed
   files — so a parameter cannot be slipped in after a run. Where the run is B1-frozen's, the
   frozen fixture's hash too (§3.2.2);
3. a provenance chain that does not start from the board as it now is;
4. a veroroute commit in `run.json` that differs from `veroroute.pin`, **and separately a built
   commit in `run.json` that differs from either** — the pin is what was intended and
   `tools/perfboard/acquire.ts`'s `builtCommit()` is what ran, they have disagreed once already,
   and an unknown built commit is refused rather than taken as agreement (§10.1, D25);
5. any failing check, including a non-admissible verdict under §7.3;
6. an uncommitted layout, unless `--allow-dirty` — which is exactly how `update` and
   `stripboard` already behave, so git stays the undo.

Each refusal names what is missing, where to fix it, and why it is not defaulted.

### 9.4 `make check` is the existing gate and stays the gate

`make -C boards/<board> check` already runs `veroroute`, `netlist-agrees`, `wiring` and then
`bun tools/cli/perfboard.ts check -C .`, which checks the layout against the circuit it was
built from. Three consequences, stated so nothing is quietly weakened:

- **Nothing is added to `make check` that the pipeline authored.** The pipeline's own
  admissibility check is *upstream* of adoption, not a new clause in the gate.
- **Adoption is post-gated by `make check` as it stands.** An adopted board on which
  `make check` does not exit 0 is a failed adoption and is reverted; `make check`'s verdict is
  the repository's verdict, before and after.
- **The freshness guards still apply.** `netlist-agrees` regenerates the export every run and
  decides freshness from content, never from a timestamp, and `wiring` rewrites the panel
  guide so drift surfaces as a git diff. A pipeline-produced layout is subject to both.

### 9.5 The judgement calls that remain a human's

Buildability and the feel of the thing in the hand. The parent's replacement rule governs
unchanged — *an agent may author a placement and a route when the result is graded by code
against criteria the agent did not write for that artifact, and reaches the repository through
a single gate that verifies its provenance* — and the parent's third channel stays available:
**an independent reviewing agent, never the one that authored the artifact**, reading the board
and the metrics against the rule library and stating whether anything passes the rules while
plainly being wrong. That is a finding against the rule library, not against the board. Nothing
in §5 decides whether a board is nice to build, and **look at the output, not only the tests**:
the layout is rendered and read before anyone calls it good.

---

## 10. Verifying the pipeline itself

Distinct from verifying a layout. The question is: **how do we know the optimiser is not
fooling itself?**

The instructive precedent is COST §5's normalisation finding. Across the four import-placed
boards `C/P` is 0.92, 0.91, 0.91, 0.85 — a coefficient of variation of about 3%, which looks
like a law until low-boost arrives at 0.19 and the five-board variation jumps to roughly 38%.
The apparent constant is not a property of the circuits. **It is the fingerprint of the
placer**: lay every part along a strip and every pin becomes its own segment, so
`C ≈ P − S_occ` and `C/P ≈ 1 − S_occ/P`. Fitting a cuts-per-pin ratio to these boards would be
fitting to a placement strategy and reporting it as circuit complexity.

That generalises into the governing test of this section: **a metric that cannot distinguish a
good placer from a bad one is not a metric.**

| | Check | Why |
| --- | --- | --- |
| V1 | **The scorer's counts are reproduced independently.** On a fixture, the scorer's `C`, `W`, `B` equal `grep -c '^CUT '`, `'^WIRE'`, `'^SOLDER'` on the same dump, computed by a different code path. | The scorer must not be the only thing that can read its own input. |
| V2 | **The identity as a per-candidate self-check, with two readings.** `C = N + J − S_occ` must hold on every candidate scored, with `N` the `NODE` count, `S_occ` the distinct strips among the `PIN` holes on the axis `VERTICAL_STRIPS` names, and `J = C − N + S_occ`. **A disagreement is a scorer bug and refuses the run. A negative `J` refuses too**, and for a different reason: `J = Σ(kₙ − 1) ≥ 0`, so `J < 0` means one of the three terms is not the quantity the identity names — in practice a `CUT_STATE` that is not `COMPUTED`, which H2 also catches (§2.2.1). | Exact on all five Pultec boards with no residual (COST §1.6) and on all four benchmark boards as a direct reading (§3.5). It is free and exact on every single evaluation, and there is no excuse for not taking it. The `J < 0` clause costs one comparison and documents a case RE-MEASURE found by accident. |
| V3 | **The benchmark, re-derived — on the frozen fixture, and only there.** Starting from the import-placed board built from the **frozen** low-boost model (§3.2.2), the pipeline must reach `C ≤ 5`, `W = 0`, every net complete: B1-frozen. The scaffolded low-boost board is checked separately against B1-current, and **V3 may not be reported as satisfied by a run against the scaffolded board.** | Externally authored, and §3.2.1 is why the two cannot share one check: `C ≤ 5` at `N = 14` is a requirement nobody derived. §3.3 says what each failure mode of B1-frozen means. |
| V4 | **Negative fixtures: the grader must fail things, by name.** A layout with a floated part; one with a net left incomplete; **one with two nets shorted together (§4.7)**; one with a span above `maxSpanHoles`; **one with a span below `minSpanHoles` (§8.3)**; one not fitting the declared stock. Each must be rejected and each must name which constraint and which net or part. | A grader that cannot fail proves nothing — the parent's gate-9 discipline, and §4.2's measured gap is exactly a check that failed silently. The open and the short are H8's two directions and **neither is optional**: the short is the one no pre-existing check catches at all. |
| V5 | **The placer-discrimination test.** Any statistic the pipeline reports must separate the pipeline's placement from `--import`'s first-fit on the *same* board by more than its across-board variation. A statistic that is stable across the four import-placed boards and changes on the hand-laid one is fingerprinting the placer; one that does *not* change when the placer is replaced is measuring nothing. | This is COST §5's finding turned into a test. It is the check that catches a pipeline grading itself against its own habits. |
| V6 | **Determinism, as two separate contracts.** See the split below the table: **canonical artifact identity** must reproduce exactly; **execution provenance** need not and is not compared. | R7, and this project's rule for derived artifacts. The old single sentence said *metrics*, which was already narrower than a byte-identical manifest — but "metrics" named no subset, so the contract was underspecified in exactly the place a reproduction argument happens. |
| V7 | **Repository safety.** A full run leaves `boards/**` byte-identical. | Parent gate 11. The run directory is the only thing that changes. |
| V8 | **Termination honesty.** A run that stops without an admissible verdict exits non-zero and names the rule that fired, **which conditions of A1–A4 failed individually**, and the gap remaining. A test asserts the non-zero exit on a deliberately under-budgeted run. | §7.3. A stop is not a pass. The per-condition breakdown is what keeps a run that failed only the clustering bound from reading as a run that failed everything (§7.2.1, V12). |
| V9 | **No fitted coefficient anywhere.** A review check, not a code one: the pipeline reports no ratio fitted across boards, and any constant it carries traces to a derivation, a measurement, or an owner's parameter. | Five boards cannot support a regression, and four of them are not routed (COST §5). A curve through these points is a curve through four broken layouts and one working one. |
| V10 | **An exhausted run cannot read as an optimal one.** `run.json` carries `bound` with exactly one of §7.3's five values; the report's wording is generated from that field; and a test over a deliberately under-budgeted run asserts `bound = budget-exhausted` and that the generated wording contains no optimality or minimality claim. | §7.3, and the same discipline H-2 already applies to constrained floors: **a run that exhausted its budget has not proved a lower bound exists.** Q1 is the only rule that proves anything of the kind, and only against the unconstrained floor. |
| V11 | **H8 is independent of what it checks.** The reconstruction module produces a verdict from a dump whose `NODE` block has been emptied **and whose `CUT` lines' node ids have been replaced with garbage**, and shares no symbol with the scorer or with `--check`'s path. | §4.7. A gate that re-reads `GetBoardMembership` under a new name reports an independence it does not have, which is worse than no gate because it looks like one. The `CUT` node ids are the same subsystem's output arriving by a second route, so the test covers both. |
| V12 | **A hard bound cannot read as a broken pipeline.** On a run that fails **only** A2 — H1–H9 holding, A3 met, A4 met — the verdict names `κ` achieved, `κ_bench`, and what bound the clustering (§7.3's table); a test asserts the generated wording contains no claim that the pipeline malfunctioned and no claim that `κ_bench` should move. Conversely, a run that fails A1 must not produce the A2 wording. | §7.2.1. `κ_bench = 0.05` is set past the best demonstrated hand result on purpose, so the expected early outcome is this exact verdict — and an expected outcome that reads as a defect will be "fixed" by moving the number, which is the one thing the ratchet forbids. V10 applies the same discipline to an exhausted budget; this is its sibling for an aggressive bound. |

### 10.1 The determinism contract, split

V6 is two contracts and the document previously ran them together. Each half is named, and
which half a comparison is making is never left to the reader:

**Canonical artifact identity — must reproduce, byte for byte.** A deterministic hash over, and
only over:

| input to the hash | why it is in |
| --- | --- |
| the candidate `.vrt` bytes | the artifact itself |
| the rules file (`stripboard/rules.json`) content | `ρ_w`, `ρ_s`, `τ`, `κ_bench`, the stopping thresholds, E3's bound |
| the source model's netlist export content, or the frozen fixture's (§3.2.2) | the problem being solved |
| the span data module's content | H5 and H9's bounds change the feasible set |
| the seed and the seed list | §7.4's restarts and E3's draws are functions of these |
| the pinned veroroute commit (`veroroute.pin`) and the pipeline's own commit | the tool versions, hashed where R6 hashes `engine_commit` |
| **the commit the binary was BUILT from**, as `tools/perfboard/acquire.ts`'s `builtCommit()` returns it | the pin is the *intended* fork and this is the one that ran. They have disagreed, and every figure in COST and MOVE went through the disagreement (D25). `undefined` is recorded as unknown and treated as "not the pinned commit", never as agreement — which is `acquire.ts`'s own stated rule |

Same inputs, same hash, byte-identical `.vrt`, and **identical canonical metrics**: `C`, `W`,
`B`, `F`, `N`, `J`, `S_occ`, `κ`, `A_occ`, every H1–H9 pass/fail, the R3 ranking tuple, the
stopping rule that fired, the `bound` value, and §7.4's restart boundaries. That list **is** what
"metrics" meant and it is now enumerated, because an unenumerated subset is one somebody can
quietly shrink when a comparison fails.

**Execution provenance — recorded, never compared.** Timestamps, the run directory's `<stamp>`,
temporary paths, durations, wall-clock totals, the host, the machine's measured milliseconds per
invocation, and evaluation counts attributable to scheduling. These are **kept** — they are how
§4.6's figures were obtained and how H-7 would be settled — and they are **excluded from the
canonical hash** and from V6's comparison.

Two consequences worth stating so nothing is quietly weakened:

- `run.json` has two blocks, canonical and provenance, and the gate (§9.3) compares the first
  only. A manifest that mixed them would make the gate fail on the clock.
- **Determinism is not reproducibility of timing.** A run that produces the same canonical hash
  in twice the machine time has reproduced. A run that produces a different hash in the same
  time has not, however close its metrics look.

---

## 11. Out of scope

- **PCB place and route.** That is the parent's **T1** (the KRT port) and its engine is
  KiCadRoutingTools, which knows nothing of strips, cuts or solder bridges. Nothing here
  touches it.
- **Schematic generation.** The parent's **T2** (the schgen port and the five new templates).
  This pipeline reads a netlist; it does not draw one.
- **The five layouts' actual content.** This document defines the pipeline; the layouts are its
  output. No part is placed here, no `.vrt` is written here, and §1's board figures are
  measurements of the committed state, not proposals for a new one.
- **The build and the measurement.** S1's work and the owner's: their bench, their hands, their
  ears. S1a hands them a layout and a wiring guide, nothing more.
- **Changes to the fork beyond Milestone 1** — whose boundary **no longer includes a second round
  of dump-grammar work**, because M1.7's observability half is retired (§4.7) and M1.1 is down to
  `BOUNDS`, `DIRECTION` and a help correction (§4.1). The first revision's bullet said the
  opposite and is corrected here rather than left to be inferred. Still out: defining `NDEBUG` in
  the build, changing the Board layer's assert contract, a stdin REPL, and any change to the
  `.vrt` format. Each is named and declined with its reason (§4.3, §4.6). Also out:
  **`Component::GetCompRows()` as a dump field** — declined with its reason in §4.1, not omitted.
- **Panel wiring, enclosure and form factor.** The parent keeps these open as data and picks
  none of them.
- **Defining the per-family lead spans.** H5's `maxSpanHoles` and H9's `minSpanHoles` are a
  separate data module with datasheet provenance and its own documentation page (§8.2). **That
  module is their authority.** This document states no span number and must not acquire one; a
  figure copied into prose is a figure that goes stale with nothing failing.
- **A worse-acceptance schedule for E3.** §7.4 specifies the mechanism and leaves its bound a
  parameter with no default, because nothing in COST, MOVE or the owner's instruction supplies
  one. Inventing an annealing schedule here would be inventing a number, which this document
  does not do (§7.4, V9).
- **A manual per-part buildability audit.** Declined with its reason in §8.3.1, not omitted: the
  span bounds are data and belong in a gate. What remains a human's is in §9.5.

---

## 12. Decisions

| | Decision | Who | Why |
| --- | --- | --- | --- |
| D1 | **The stripboard carve-out is withdrawn; agents place and route stripboard layouts.** | The owner, 2026-10-10, recorded in the parent's "Governing-document changes" | The carve-out narrowed "never place parts or route a board" to stripboard on the ground that no such pipeline exists there. That is the wrong kind of reason: "no pipeline exists" argues for building one, not for keeping the prohibition that makes building one unthinkable. As written it also left S1 quietly depending on hand layout for four boards. `CLAUDE.md`, `AGENTS.md` and `README.md` were updated to match in commit 5089cda. |
| D2 | **S1a exists as its own sub-project, with the Pultec as its forcing function.** | The owner | Laying five boards out by hand is fiddly, repeatable, measurable work, and agent cycles are cheaper than the owner's. A first solution that technically works while leaving a person doing remedial work is a failure, not a delivery. Everything here is specified over "a circuit and a hole grid"; the five boards are what proves it. |
| D3 | **No legibility, tidiness or neatness term in `F`.** | This spec, from the parent's governing principle | A term an agent scores itself on is the agent authoring its own acceptance criteria, which is the failure the parent records — a board graded clean with the input stage 8 mm from the output stage. Legibility enters through a reviewed rule library or an independent reviewer, never through `F`. |
| D4 | **low-boost's hand layout is a first-class acceptance criterion (B1-frozen): `C ≤ 5`, `W = 0`, every net complete, against the frozen model it was built for.** | This spec | It was laid out by the owner by hand — commits `a33cb4d` and `2f62ee1`, authored by `oletizi`, no agent attribution — it is the only one of the five that conducts, and it sits at 5 cuts against a floor of 4. A number no agent chose, about an artifact no agent produced. Risk recorded: one board was one data point (§3.4), which is why `κ_bench` is a parameter. Amended by D15; the data-point risk is relieved by D24 and `κ_bench` is set by D23. |
| D5 | **~~The `--dump-board` extension precedes everything else.~~ Superseded by D22.** | This spec; **withdrawn** 2026-10-10 on RE-MEASURE's evidence | The original reasoning was sound and its premise expired: zero `ROWS`/`COLS`/`BOUNDS` lines existed at `5a282a6`, so `S_occ` had to be reconstructed by probe and by hand, and a rotate verb shipped first would have let a scorer misread a rotated part's span via `SPAN`. `2cfaad8` prints `GRID` and `PIN`, which supply the board size and every placed lead's hole, so `S_occ` and every lead span are readings (§3.1, §3.5) and the `SPAN` trap is defused for any consumer not reading `--help` (§4.5). **The row is kept rather than deleted because it is cited by name and because a decision whose premise expired is itself the finding** — "supersede means delete" governs patterns and stubs, not the record of a decision that was right when made. What replaces it is D22. |
| D6 | **The actuator must refuse rather than write a floating part; the dump's copper-truth line is dropped.** | This spec, amended 2026-10-10 on a re-test against `2cfaad8` | Re-measured on the newer binary: `--stretch` on `C19` **still** exits 0, with no stdout and no stderr, and saves the part `FLOATING` with `CUT` at 5, `NODE` at 9 and `GRID` unchanged (§4.2). **The defect is not fixed.** What changed is that the dump now reports the float twice — the `PART` placement field, and the part's two `PIN` lines disappearing — so the diff is three lines rather than one and MOVE §5.2's "cannot see that it has broken the board" is too strong against this fork. Two consequences. First, the refusal in the actuator is the whole item and is unchanged: observability turns a silent corruption into a detectable one and does not stop the verb producing it, and **every term in `F` still reads as a healthy board.** Second, the specified board-level copper-truth dump line is **deleted**: both existing signals are `Component::GetIsPlaced()`, a third line from the same predicate would add nothing, and a line *named* for copper that reports component state is the shape §4.7 rejects as worse than no gate. H3's copper half is H8's (D16). It remains the overlap check, because `CanPutDown`'s refusal surfaces as a float. |
| D7 | **The zero-delta abort is guarded in the verb; the fork's asserts are left alone.** | This spec | An optimiser will propose a no-op eventually, and `assert` is live in the shipped build. A guard in the verb is local and reviewable; defining `NDEBUG` disables every assert in the binary and changing the asserts changes the Board layer's contract for the GUI. Different remedies, different blast radii. |
| D8 | **`--move` before a batch verb.** | MOVE §4.3, adopted here | The one-move verb is what makes the batch verb's per-move verification reviewable. Building the batch first means writing the verification and the loop at once, with nothing to check the verification against. At the governing 11.71 ms per invocation the one-move verb already drives order 10² **gestures** per second, which is order 10¹ candidate evaluations per second at P2's four invocations each (§4.6). |
| D9 | **`--import`'s placer is replaced, not tuned.** | MOVE §3, adopted here | It never consults `parsed.m_nets`; nets are painted after every part is fixed. There is no placement strategy to improve, it is order-dependent on the KiCad export with nothing recording that dependency, and it cannot report a placement failure at all. |
| D10 | **The per-family span bounds are required with no default; the pipeline refuses without them.** | This spec, from COST §3.2 and L1; source amended by D18 | The repository holds no lead-length or bend-radius data. A default would produce boards that score well and cannot be built — the worst outcome, because the arithmetic looks right. Refusing loudly beats defaulting to a guess. The refusal is unchanged now that the data is datasheet-derived rather than owner-measured, including for a family the data has no figure for. |
| D11 | **`ρ_w` and `ρ_s` are parameters, never constants.** | This spec, from COST §4.3; values settled by D21 | They are facts about one person's bench, their cutter, their eyesight and what they find tedious. Nothing in the repository, the fork or the circuit can supply them — which is why they had to be asked for rather than derived, and why they live in a rules file with a note each. |
| D12 | **`κ = J/(P−N)` is the progress variable; no ratio is fitted across boards.** | This spec, from COST §5 | `C/N`, `C/parts` and `C/P` fingerprint the placer, not the circuit — 0.85–0.92 with ~3% variation on four boards, 0.19 on the fifth. The identity needs no sample; anything beyond it would. |
| D13 | **Reuse the sibling repository's architecture; reuse none of its geometry.** | This spec, from MOVE §6 | Schema-versioned strict rules, generate-and-grade with repair that only proposes, a declared ranking, two-condition termination, hashed run manifests, seeded determinism and the injected-spawn posture all port. Millimetre courtyards, the continuous repair sweep, the KRT engine, `policy.ts` and s-expression text editing do not: a `.vrt` is a binary `QDataStream` and the grid is integers. |
| D14 | **Adoption goes through one gate; `make check` stays the gate.** | This spec, from the parent's replacement rule | The pipeline's admissibility check is upstream of adoption, never a new clause in `make check`. Nothing the pipeline authored is added to the repository's verdict. |
| D15 | **B1 is split into B1-frozen and B1-current; a single `C ≤ 5` was comparing two different circuits.** | This spec, 2026-10-10, after third-party review | §3.4 of this same document states that low-boost is 9 nets / 27 pins on the committed board and 14 nets / 40 pins against today's model. Run the identity: `C ≤ 5` at `N = 14` requires `S_occ ≥ 9 + J`, against the `S_occ = 5` the hand layout needed at `N = 9`. The old B1 therefore pointed the pipeline at a circuit the benchmark was never measured on and called the result a comparison with the owner's hands. **The document contained both numbers and the identity relating them, and failed to draw the conclusion** — which is the reason the split is recorded as a decision and not as a wording fix. B1-frozen keeps the benchmark's full force by running the same problem the owner solved, pinned as a committed fixture under `tests/fixtures/` with `a33cb4d` and `2f62ee1` as its provenance; B1-current gets a floor-relative bound derived from its own board. The distinction is carried into A4, V3 and §3.3. |
| D16 | **A copper-derived netlist-equivalence gate (H8) is a hard constraint, and it is a reconstruction rather than documentation.** (First stated as "it needs new observability rather than new documentation"; the observability half is retired, the rest stands.) | This spec, from a third-party review, with the review's cost estimate rejected; amended 2026-10-10 | H1 proves completeness, H2 that cuts are derivable, H3 with M1.2 that nothing floats, H7 that the part set matches — and **none of them is an independent reconstruction.** All four read the same VeroRoute subsystem the optimiser perturbs, and that subsystem is known to have a hole: `GetBoardMembership` reads component nodeIds rather than copper, which is exactly why §4.2's floated part went undetected. A completeness check is also structurally blind to a **short**, which leaves both joined nets reading complete. The review suggested this might be documentation plus fixtures, and that is still rejected: a gate that re-reads `GetBoardMembership` under a new name is worse than no gate because it looks like one. **Amended 2026-10-10: the gate stands and its fork-side prerequisite is retired.** The first draft rested the cost on H-8, reading it as saying the geometry does not exist in the dump. Enumerated against `2cfaad8` (§4.7), two of the four fields it specified were **already printed when the row was written** — `CUT` has carried both hole positions since Task 11f, and `VERTICAL_STRIPS` has always named the strip axis — one is supplied by `PIN`, read off the grid exactly as the row demanded, and the fourth, the painted-hole runs per net, is VeroRoute's own net assignment and would **weaken** the gate's independence. So M1.7 adds no dump lines, does not enlarge Milestone 1, and is entirely a module, three fixtures and a per-candidate check in this repository. Negative fixtures for both an open and a short remain part of the deliverable. |
| D17 | **The search gets an escape mechanism, and the verdict distinguishes a bound from an exhaustion.** | This spec, from a third-party review | The document specified a strictly improving climb and **no escape of any kind** — no restart, plateau, annealing or coordinated multi-component move appeared in it. The identity says why that is a defect and not a style choice: a net's `J` contribution falls only when its last stray pin joins the rest, so the dominant lever is invisible to single-part moves. §7.4 adopts the net-cluster move (E1) and seeded restarts (E2) as required, bounded worse-acceptance (E3) as a parameter with **no default** because nothing in the sources supplies a schedule, and free plateau moves broken by R3's ranking. Q3 becomes a restart trigger before it is a stop, or E2 would be unreachable. Separately and more importantly: **a run that exhausted its budget has not proved a lower bound exists.** H-2 already drew that distinction for constrained cut floors; §7.3's `bound` field carries it into the optimiser's verdict, V10 tests it, and only Q1 may be reported as optimality. |
| D18 | **A minimum span is a hard constraint in data (H9); the proposed manual physical audit is rejected.** | This spec, from a third-party review, remedy rejected | H4 bounds a span by the **tool** (its 2-hole floor is a fact about VeroRoute) and H5 bounds it above by reach. **Nothing bounded it below by the part**, so `--stretch shrink` could compress a DIN0207 — 6.3 mm of body on 10.16 mm nominal pitch — to a 2-hole, 5.08 mm span that no bending achieves, and every check in the document would pass it. The review proposed instead that "a final physical audit… can remain manual for the first implementation". **Rejected**: it reinstates exactly the hand work this sub-project exists to remove (§1, D2 — agent cycles are cheaper than the owner's, and a solution that leaves a person doing remedial work is a failure), a manual step's failure mode is that it is silently not performed, and the bound has no judgement in it — it is a datasheet figure compared to an integer. Buildability bounds belong in data derived from datasheets and enforced by a gate; the span data module is the authority for both bounds. |
| D19 | **Occupied bounding-box area enters R3's ranking below the construction-cost terms; it is a measurement, not a taste.** | This spec, from a third-party review, accepted with a correction | The review argued the objective can reward sprawl. Partly already handled, and the document should have said so: R3's declared ranking already carried pin-bounding-box wirelength in fourth place, `ΔF < 0` is strict so spread that buys nothing is rejected, H6 caps spread against the owner's stock, and raising `S_occ` *is* lever 2 and is nearly free. The conceded gap is real though: nothing measured **area**, and the wirelength term is a labelled proxy (H-11). `A_occ` is `(maxRow − minRow + 1) × (maxCol − minCol + 1)` from M1.1's `BOUNDS` — arithmetic on four integers the fork prints, with no latitude inside it — placed below cuts, wires and bridges so lexicographic order guarantees it can never buy a cut, and above the proxy because a measurement outranks a proxy. **Explicitly not** a legibility, tidiness or neatness term: D3 stands, and an agent may never author the acceptance criteria for its own artifact. **`BOUNDS` is still the source, and that is why it is the one field M1.1 keeps besides `DIRECTION`** (§4.1): the bounding box of the `PIN` and `WIRE` holes is computable at `2cfaad8` and measures lead extent rather than the footprint rectangle, so substituting it would silently redefine this term rather than implement it. |
| D20 | **The determinism contract is split into canonical artifact identity and execution provenance.** | This spec, from a third-party review, accepted with a correction | V6 said "byte-identical candidate `.vrt` and identical `run.json` metrics", which was **already narrower than the review read it** — it said metrics, not a byte-identical manifest. But "metrics" named no subset, so the contract was underspecified exactly where a reproduction argument happens. §10.1 enumerates the canonical hash's inputs and the canonical metric list, and names what is provenance — timestamps, stamps, temporary paths, durations, host, measured milliseconds — recorded and never compared. An unenumerated subset is one somebody can quietly shrink when a comparison fails. |
| D21 | **`ρ_w = 0.25`, supplied by the owner, and the document's previous reasoning carried a sign error.** | The owner, 2026-10-10: *"favor wires over cuts. cuts are harder and more error prone."* `ρ_s = 1` stands | One cut costs as much as four wires. The number alone would be the smaller half of this. §8.1 previously reasoned that a cut being permanent and invisible when missed **offsets** a wire's extra labour — entering the risk on the cut's side of the ledger, as a reason the gap is small. The owner's judgement is that the invisibility **is** the cost: a wire's failures are visible on the board and reversible with an iron, a missed cut is found by a circuit that does not work, after the board is built. So this is a sign error in the argument, not a different weight, and recording only the value would leave the faulty reasoning to be re-derived. Recorded with it, because it matters more than the parameter: **`ρ_w` is not the mechanism that reduces the cut count.** `J` enters the identity with a positive sign, so a split costs a cut *and* needs a join that a wire supplies — cuts and wires largely move together and a wire does not retire a cut. The levers that serve the owner's goal are clustering (`J → 0`, which removes both) and spending strips (`S_occ → N`, which removes cuts and adds nothing, and is nearly free — mid occupies 4 of its 35 available rows). A low `ρ_w` buys permission to spend a wire where it unlocks a better arrangement. |
| D22 | **M1.1 is cut to `BOUNDS`, `DIRECTION` and the help correction, and Milestone 1 is re-ordered with M1.1 fifth.** | This spec, 2026-10-10, from RE-MEASURE and from reading `2cfaad8`'s source | The fork moved under the spec. `2cfaad8` adds `Src/Headless_dump_pins.cpp`, printing `GRID <rows> <cols>` once per board and `PIN <name> <pin> AT <row>,<col>` per placed lead, read off the grid rather than derived from a footprint; and `tools/guide/dump.ts`, merged from the same branch, is already a typed parser for it. Of M1.1's four fields, `ROWS`/`COLS` are **superseded by `GRID`** and the per-part row extent is **deleted** — its purpose was occupancy and overlap, `PIN` reads lead occupancy directly, and overlap is not a separate constraint in this document at all (§2.2). What survives is `BOUNDS`, whose one consumer is `A_occ` (D19), and `DIRECTION`, whose one Milestone 1 consumer is M1.5's effect check, plus the `--help` correction about `SPAN`, which is still wrong at `2cfaad8` and matters more now that the true lead span is readable elsewhere. **The consequence is an ordering inversion, not just a smaller item**: M1.1 was first because nothing could be scored without it, and §3.1's reading of the identity straight off the dump — `N = 9`, `P = 27`, `S_occ = 5`, `J = 1`, with no reconstruction — is the measurement that moved it to fifth. §4's table is the order and the numbers are left alone, because renumbering would invalidate every citation. |
| D23 | **The clustering bound starts at `κ_bench = 0.05` and relaxes only by ratchet.** | **The owner**, 2026-10-10: start at a harder bound and back off gradually, only if it proves impracticable | RE-MEASURE settles that `κ_bench = 0.06` is wrong, and the direction of the error is the surprise: three hand-laid boards that **pass `make check`** sit at 0.181, 0.196 and 0.269, so a bound at 0.06 would refuse layouts that are built and in service, `pt2399-core` among them. The obvious repair is to loosen it to admit them, and **that is not the decision.** 0.05 sits just under low-boost's 1/18 = 0.055, the best result any hand here has reached, and the reasoning is about information: a bound where no artifact has ever reached — 0, say — yields nothing when it fails, while one just past the best demonstrated result makes a failure informative, because something stopped the pipeline short of a thing a person has done and the verdict has to name it. The other three values are the cost of **not** minimising cuts, not the cost of trying and failing, so calibrating a gate on them would license the former. **Relaxation is modelled on this repository's discipline for proven value ranges** (`CLAUDE.md`: ranges "are proven with tests over the range they claim. Extending one is a deliberate edit with a test beside it, never a silent widening" — `lib/kicad/value-notation.ts` is the worked example, keeping both of its independent widenings and naming the artifact that forced each). So moving `κ_bench` takes a run that demonstrably could not reach it **with the binding constraint named**, committed as a deliberate edit carrying that evidence, previous values kept — never a silent widening, and never because the gate became inconvenient. **The first runs are expected to fail it, and that is the intent**; A2's failure must therefore be reported distinctly from a malfunction (§7.3, V12). What makes it affordable is that `κ` is not load-bearing alone: the per-board floor from the identity is the real grounding and A3 already bounds the whole of `F` against it. The four measured values are recorded in §3.5 so a later reader cannot re-derive a loose bound without seeing that 0.05 was chosen first and deliberately. |
| D24 | **The benchmark set is four hand-laid boards; B1-frozen remains the only externally authored criterion.** | This spec, 2026-10-10, from RE-MEASURE | B1-frozen rested on low-boost, which RE-MEASURE shows is **the one hand-laid board in the repository that fails `make check`** — for the known reason that it is stale against the scaffolded model, holding nine parts where the model needs nineteen. The B1-frozen / B1-current split is exactly the remedy for that staleness and stands unchanged (D15). What does not stand is resting the set on that board while `pt2399-core`, `transistor-preamp-feedback` and `transistor-preamp-staged` — externally authored, physically built, passing — sat unused. All three are added with their measured `N`, `P`, cuts, `S_occ`, `J` and `κ`, each contributing something the others do not (§3.5): the only multi-pin IC, hence COST §1.5's third join mechanism; the loosest `κ` and the clearest case of strips spent past `N`; and the largest board, nearest mid's size. **They are a benchmark set, not a criterion**: none gets a `C ≤ n` clause, because nobody set out to minimise cuts on them and this document will not retrofit an intention onto somebody else's board. They ground D23's bound and they validate M1.7's grader before any actuator exists (§4.7). §3.4's "n = 1" risk is **relieved, not eliminated** — four boards still cannot support a fitted threshold, which COST §5 and RE-MEASURE both say in their own words, and V9 still forbids one. |
| D25 | **A run records the commit its binary was BUILT from, not only the commit the pin names.** | This spec, 2026-10-10, from what RE-MEASURE had to exist to fix | Merging `feature/transistor-preamp` moved `veroroute.pin` to `2cfaad8` and left the local build at `5a282a6`, so **every figure in COST and in MOVE was measured with the wrong binary** and RE-MEASURE is the cost of finding out. Every measurement in this sub-project passes through that one executable. **§10.1 already puts the tool versions in the canonical artifact identity** — it hashes `veroroute.pin` and the pipeline's own commit, where R6 hashes `engine_commit` — so nothing here duplicates that requirement, and §9.3's fourth refusal already compares the run's veroroute commit against the pin. **What the pin cannot witness is which build ran.** `--version` prints `VeroRoute Version 2.40` (measured here, second revision) — the upstream app version, carrying no fork commit — so the binary cannot identify its own source. The repository already holds the answer and already records why: `tools/perfboard/acquire.ts`'s `.built-commit` stamp exists because *"advancing `veroroute.pin` left the old binary in place and the run reported the NEW commit while executing the OLD code"*, it is written only after a build has been verified to produce a binary, and `builtCommit()` returns `undefined` for an unknown build, which callers must treat as "not the pinned commit" rather than as agreement. So the canonical block carries `builtCommit()`'s value beside the pin and the gate compares both. **A run's numbers can then never be read without knowing which fork produced them**, which is the property whose absence cost a full re-measurement. |

---

## 13. Honest limits

Carried from COST and RE-MEASURE where they bear on this spec, plus what this document could not
determine. **Two rows are gone and three changed in the second revision**: H-8 is deleted and
H-11 carries what survived it, H-4 and H-5 are rewritten because measurement closed most of each,
H-10 now names the binary its timings came from, and H-12 is new. The paragraph below the table
says why a resolved row is deleted rather than annotated.

| # | What is not determined | What settles it |
| --- | --- | --- |
| H-1 | **Whether the span data covers every family these five boards use.** The bounds themselves are no longer undetermined — they are datasheet-derived data in the span data module (§8.2), which is their authority, and this document states none of its numbers. What this document cannot determine is whether every family has a datasheet figure; COST §3.2 notes the B32529's datasheet gives a minimum body-to-bend distance and the DIN0207's does not. §5.3's arithmetic — about 10.8 mm of lead past a DIN0207 shoulder and 11.5 mm of splay on a B32529 for the worst of the five — remains arithmetic on footprints, and the module is what turns it into a reach claim. | The module, per family. Where it has no figure it refuses by name rather than falling back to the tool's 2–16 bound (D10), so the gap is loud rather than silently filled. |
| H-2 | **What the floor becomes when either span bound binds.** The unconstrained floor `max(0, N − R)` is derived and stands. No constrained floor is derived here, so a board whose reach forbids one net per strip has no stated lower bound to be measured against. **This is the distinction §7.3's `bound` field generalises** to the optimiser's whole verdict: only `at-floor` under Q1 is a bound, and it is a bound against the unconstrained floor. | A derivation, or — faster — running P1 under the supplied bounds and reading the result. Until then the pipeline reports the shortfall rather than a second floor, and never reports an exhausted search as a bound (V10). |
| H-3 | **Whether `C = 0` is attainable on any of these boards** (COST L2). It is the floor and §5.3 shows no span-ceiling obstruction, but no packing feasibility argument exists: parts across the strips consume columns, and nothing proves mid's 31 on-board components fit in 37 columns without overlap. | Run P1 once M1.4 and M1.5 exist, and read the result. Construction answers this faster than any proof. |
| H-4 | **Whether `κ_bench = 0.05` is reachable at all.** The limit this row recorded — that `κ_bench = 0.06` rested on one board — is **closed by measurement**: four hand-laid boards are measured (§3.5) and the bound is no longer an extrapolation from any of them, because it is not fitted to them. It is set just under the best single demonstrated result, deliberately (§7.2.1, D23). What is undetermined is whether any pipeline, or any hand, reaches it on the Pultec boards, and the three passing boards at 0.181, 0.196 and 0.269 are a reason to doubt it. **The first runs are expected to fail it, and a failure is not evidence that the bound is wrong** — the ratchet needs a named binding constraint, not a string of failures. | A run that cannot reach it, with what bound the clustering named (§7.2.1's ratchet, §7.3's table). Until then the bound stands and the shortfall is reported (V8, V12). More externally authored layouts would inform it and only the owner can supply them. |
| H-5 | **The `ρ_w · W` trade is unexercised, though the term is not.** `ρ_w` and `ρ_s` are settled at 0.25 and 1 (§8.1, D21), so COST L6 is closed. **This row previously said no board in the repository exercises the term, and that is now false**: three of the four benchmark boards carry wires — 4 on `pt2399-core`, 4 on `transistor-preamp-feedback`, 7 on `transistor-preamp-staged` (measured here, second revision, §3.5) — so a hand-laid board that spends wires is a thing this repository has, four times over, and `F` can be computed on each with a real `W`. What survives is narrower and still real: **no board here is evidence about the *trade*.** None was laid out against this objective, so none says whether 0.25 is the right exchange rate; and the Pultec boards still carry zero `WIRE` lines (MOVE §5.1), so the circuits the pipeline is actually pointed at have no wire precedent. | The first **produced** board with a wire on it is the trade's first real test, and at `ρ_w = 0.25` that board arrives sooner than it would have at the superseded default of 3. A timed bench trial would settle the *ratio*, which is no longer the open question. |
| H-6 | **The committed cut counts are not a baseline** (COST L8). 65 / 40 / 32 / 23 come from layouts with 19, 13, 7 and 6 incomplete nets, and all five are stale against today's model. | Re-measure after S0 lands and the boards are updated. COST §2.3's floor table is already stated against the current model, so it will not need redoing. |
| H-7 | **`PlaceFloaters`' scaling is undetermined** (MOVE §4.1). It is a `while(true)` loop over all components, inside the ~1 ms figure for boards of mid's size; nothing larger was tried, and the cost of `MoveComps` itself in isolation was not measured. | Measure on a board substantially larger than mid, once M1.4 exists. It bears on search breadth, not on correctness. |
| H-10 | **The two source documents' per-gesture timings differ**: ~13 ms (n = 20, COST §6.3) against 11.71 ms (n = 200, MOVE §4.1), and their conclusions about batching differ in emphasis. **Both were measured against the stale `5a282a6` build and neither is re-measured here** (D25). | **The 200-run sample governs**, on sample size alone — the two agree to within about 11%, so there is no substantive disagreement, and the larger sample is the better estimate of the same quantity. Every timing claim in this document is stated against 11.71 ms, and §7.3's Q4 gloss was recomputed from it (§4.6). §4.6 resolves the conclusions: batching is an enabler of breadth, not a prerequisite. **What the fork change could have moved is the ~1 ms board-I/O term, not the 10.78 ms launch floor**: `2cfaad8` adds one `GRID` line plus one `PIN` line per placed lead, which is 28 extra lines on low-boost and 66 on `pt2399-core`. Re-measuring on `2cfaad8` would settle it, and nothing in this document's conclusions about order of magnitude turns on a term of that size. |
| H-11 | **Whether the dump's geometry supports a defensible per-net track-length measure.** This is what survived the deletion of H-8, stated in its own row rather than left inside a resolved one. The geometry is readable now — `PIN` gives each lead's hole, `GRID` the strip extent, `CUT`/`SOLDER`/`WIRE` the edges — so the obstruction is no longer observability. It is that no track-length term is **derived** anywhere here. | A term derived from that geometry with a test beside it. Until then R3's pin-bounding-box wirelength stays **labelled a proxy** — for track length, not for missing data — and `A_occ` (§2.4) is the ranking's one measured geometric term because it reads `BOUNDS` directly. |
| H-12 | **Where the two definitions of `S_occ` diverge.** This document computes `S_occ` as the number of distinct strips holding at least one placed lead, from the `PIN` lines. On the five Pultec boards that agrees with COST's probe-derived value exactly (RE-MEASURE's own Limits), and §3.5's four hand-laid boards agree with the identity to the unit. But a strip can in principle carry a net through painted holes with no lead on it, so the two definitions are **not identical in general**, and the identity's `S_occ` is the term COST derived from `DeriveCuts`. | Where they could diverge is not established. V2's per-candidate identity check is what would surface it: a board on which the two definitions differ would fail `C = N + J − S_occ` and refuse the run, which is the right outcome — a residual in the identity is a scorer bug until somebody proves otherwise. |

**H-8 and H-9 are deliberately absent, and neither number is reused.**

**H-8** recorded that per-net geometry is not observable and that M1.7 would have to add it. It is
**false against `2cfaad8`**: `PIN <name> <pin> AT <row>,<col>` reports every placed lead's hole,
read off the grid rather than derived from a footprint, and with `GRID` and `VERTICAL_STRIPS` that
makes per-net segment counts, `S_occ` and lead occupancy computable — which §3.1 and §3.5 do on
four hand-laid boards, and which RE-MEASURE did on all five Pultec boards, reproducing COST's
probe-derived cut counts and `S_occ` to the unit. The row is **deleted rather
than rewritten**, for the same reason H-9 was: a limits table carrying a resolved item will be
believed by somebody reading it a milestone from now, and that reader would conclude the geometry
must still be added. What genuinely survived it is a *different* claim — that no track-length
measure is derived — and it is **H-11**, a new row, rather than a quiet re-tenanting of H-8. The
number is left unoccupied so that a stale citation of H-8 resolves to nothing. Every citation of
it in this document was repointed: §2.2's naming note, §2.4 twice, §4.7, D16 and D19.

**H-9** recorded that the parent's "Out of scope" section still forbade automating perfboard
layout. The owner withdrew that entry in commit `60b0192`, keeping the one clause that survived
the reversal — strips and cuts are a different problem from copper on a plane, which is why S1a is
its own sub-project rather than a use of T1. **Supersede means delete**, so the row is gone rather
than marked resolved, and the number is left unoccupied so that a stale citation of H-9 resolves
to nothing rather than to the wrong limit.
