# What the stripboard pipeline's verification does and does not cover

This page is the register of what the pipeline's checks prove, and — more
useful — what a pass of each one leaves uncovered. It is opened here by the
first task with a finding to put in it, and is extended as later tasks measure
more; it is not a document written at the end, because a document written last
is one whose early findings were held in somebody's head until then.

At this point it covers six things, and **this sentence said "four" while the
page already had five sections** — a stale count in the one paragraph a reader
starts from, corrected here rather than left to be rediscovered. `HC8`: its
trust boundary, its nine
geometry refusals, the one refusal that belongs to a different module than the
one `HC8`'s contract names, and the verdict built on the
graph — the open, the short, and the three refusals the reference side
contributes. The two dump lines Task 7 added to the fork, `BOUNDS` and
`DIRECTION`, whose meaning is narrower than either name suggests, and which
**are** now adopted here (§2.7 — §2's opening sentence about that was stale when
it was written, and §2.7 says why). `HC10`'s placement clause, which the owner
decided on 2026-10-11 after the task brief's wording was measured to refuse
every hand-laid board in the repository (§3). CHECKPOINT 1, the ten hard
constraints run over two boards a person built (§4). CHECKPOINT 2, the climb
driven against the real binary from each starting arm (§5). And Task 18's
escapes: what `E1` as specified does and does not do, what the search's
import-closure scan found, CHECKPOINT 3 - the measured arm comparison, whose
rate is zero on all three arms - what the cluster move did to `F`, the stretch
defect the comparison found on the way, CHECKPOINT 4, the GATHER that takes the
constructed arm from 16 cuts to 10, and CHECKPOINT 5, the comparison re-run with
the complete move set - still 0 of 5 on every arm, with the tiebreak inverted -
and CHECKPOINT 6, the same comparison again with the gather able to see the empty
board, where the rate is zero a third time and the inversion widens to all five
seeds (§6).
`docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`
is the authority for every criterion; where this page and that document differ,
that document wins.

---

## 1. `HC8` — netlist equivalence reconstructed from copper

`HC8` certifies that a produced layout implements the intended circuit, by
rebuilding the board's copper connectivity **outside VeroRoute** and comparing
the resulting partition of pins against the reference netlist.

The reconstruction is `tools/stripboard/copper.ts`, over the geometry contract
in `tools/stripboard/geometry-contract.ts`. It reads six dump lines — `GRID`,
`VERTICAL_STRIPS`, `PIN`, `CUT`, `SOLDER`, `WIRE` — and builds edges from
exactly the three join mechanisms `COST` §1.5 enumerates:

1. an uncut within-strip neighbour,
2. a derived solder bridge between adjacent strips at a shared along-strip
   coordinate,
3. a wire.

**There is no fourth, and a component lead is not one.** A two-terminal part's
leads sit on two different nets by construction, so a pipeline that treated a
stretched resistor as a bridge would produce boards that do not conduct and
score them as if they did. `PIN` lines are read for *where a lead sits* and
never as an edge.

### 1.1 Why the gate exists

`HC1`, `HC2`, `HC3` and `HC7` each read VeroRoute's own conclusion about the
board, from the subsystem the optimiser perturbs. That subsystem has a
demonstrated hole: `--stretch` once exited 0 and wrote a board with a part
floating in mid-air while the `CUT`, `NODE` and `GRID` line counts stayed
identical, so anything grading from those counts accepted it. `HC8` exists so
that at least one check does not read VeroRoute's answer.

### 1.2 The trust boundary — `V11`, and limit `H-13`

**This is independent connectivity reconstruction from VeroRoute-reported
physical geometry.** The honest scope is narrower than "independent", and
stating it narrowly is the point:

- It **is** independent of VeroRoute's **membership calculation** —
  `GetBoardMembership`, the subsystem the optimiser perturbs and the one with
  the demonstrated hole. That is the independence that matters, because that is
  where the measured failure was. The reconstruction never reads a `NODE` line
  or any `nodeId` field.
- It is **not** independent of VeroRoute's **geometry export**: it consumes it.

> **If the dump omits a cut or misreports a pin coordinate, this verifier
> produces a perfectly consistent and wrong answer.** Nothing validates the
> reported geometry against the binary `.vrt`, and a defect in the export is a
> defect the optimiser and the verifier share.

That limit is **acceptable, and is recorded as limit `H-13` rather than as a
plan**: stronger independence means parsing a binary `QDataStream`
(`PIPELINE` `N5`), which is already the reason the sibling repository's
s-expression text tooling does not transfer here. It must be **explicit, not
implied** — it is stated in `copper.ts`'s module comment and here, and the
pipeline's report **must** print it beside an `HC8` pass so that a reader of a
verdict sees what the pass does and does not cover. That report does not exist
yet; this is a requirement on it, not a description of it.

**`V11` is the test of the independence claim**: the reconstruction must still
produce the same partition from a dump whose `NODE` block is emptied and whose
`CUT` node ids are replaced with garbage. It is driven in
`tests/stripboard/copper.test.ts`. Measured: with a `CUT` line's `nodeId` read
into the component key — the one defect whose presence would still look like a
working gate — the garbled board's components differed (`"0,2" => 424242`
against `"0,2" => 8`) and that test, alone of fifteen, failed.

### 1.3 The nine refusals

The nine narrow the gap that *is* reachable: they reject a dump that is
malformed **on its own terms**, which is the part of a bad export this module
can see. Each is a member of the `GeometryRefusal` union, each has one recorded
reason, and each is driven by a test that was shown to fail when its validation
was removed.

| refusal | what is malformed | why guessing is not available |
| --- | --- | --- |
| `missing-line` | `GRID` or `VERTICAL_STRIPS` absent | the extent and the strip axis are definitions, not defaults — a dump with no `VERTICAL_STRIPS` line does not default to rows |
| `unsupported-strip-axis` | `VERTICAL_STRIPS` is neither `0` nor `1` | a third value means the grammar moved; "the same strip" has no meaning until it is read |
| `cuts-not-computed` | `CUT_STATE` is not `COMPUTED` | under `UNRESOLVED` the cut list is *not emitted*, so zero `CUT` lines is indistinguishable from no cuts |
| `out-of-bounds` | a hole named by a contracted line lies outside `GRID` | a coordinate off the board is a grammar change or a corrupt dump; clamping it invents a hole |
| `cut-not-strip-adjacent` | a `CUT` names two holes on one strip more than one step apart | the contract is the two *strip-adjacent* holes; which intervening gap to sever is not stated and not derivable |
| `cut-across-strips` | a `CUT` names two holes on **different** strips | a cut severs a strip along its run; a pair across strips describes nothing the fork emits |
| `duplicate-pin` | two `PIN` lines with the same `ref.pin` at the same hole | a repeated record means a concatenated dump or a bad parse; de-duplicating hides both |
| `conflicting-pin` | two `PIN` lines with the same `ref.pin` at **different** holes | one lead cannot be in two holes; picking either is picking a board |
| `solder-not-strip-neighbours` | a `SOLDER` pair is not two holes on neighbouring strips at one shared along-strip coordinate | a bridge between non-neighbours is a join mechanism the edge set has not got |

**Every input is validated before any union is performed.** A graph half-built
from input later found malformed is a graph somebody debugs instead of rejects.

### 1.4 `cuts-not-computed` is the one that is easy to miss, and it is measured

An earlier draft left `CUT_STATE` to the scorer. But the scorer and the grader
are deliberately separate paths (`R2`), so a refusal living only in the scorer
does not protect the grader — and `HC8` is the grader's electrical gate. The
refusal therefore lives in both, with one wording, and `HC2` reads the same
field a third time from the constraint side.

**What it prevents, measured on a real board.**
`boards/transistor-preamp-lab` is this case live: `CUT_STATE UNRESOLVED`, 19
`CUT_CONFLICT` lines, and **zero `CUT` lines**. With the refusal made
unreachable, the reconstruction returned, for that board's `GRID 29 46`:

```
componentCount 29   over 1334 holes
```

One component per strip, every strip whole, every cut the board needs missing —
an answer that is wrong in at least 19 places and carries no sign of it. That
is the plausible-and-wrong answer the refusal exists to prevent, and it is why
an absent cut list is not treated as an empty one.

### 1.5 Where two refusals overlap, their order decides which fires

Two pairs were found to overlap on real inputs, and both orderings are now
asserted by name rather than by "something threw":

- Remove the `cut-across-strips` clause and `CUT 0,1 1,1` under horizontal
  strips refuses as `cut-not-strip-adjacent` instead — the strip is read off
  the first hole, so a cross-strip pair's along-strip gap collapses to 0.
- Remove the `duplicate-pin` clause and a repeated `PIN R1 1 AT 0,0` refuses as
  `conflicting-pin: PIN R1.1 is reported at 0,0 and at 0,0` — a conflict with
  itself.

Both are refusals, so a test asserting only that something threw would not see
the swap. This is the reason the refusal test asserts the member name.

### 1.6 A refusal that is not `HC8`'s to make: a `FLOATING` wire

A floating wire joins nothing, and the reconstruction has **no branch for
one** — because none can arrive. `tools/guide/dump.ts`'s `parseWireEnd`
already refuses a `WIRE <name> FLOATING ENDS - -` line, so a dump carrying one
never becomes a `BoardDump`. A branch for an unreachable state would be a claim
the module cannot evidence.

It is recorded here because the refusal belongs to a **different module** than
the one `HC8`'s contract names, which makes it the kind of fact that gets
rediscovered: a board with a hand-drawn jumper left unplaced is rejected by the
dump parser, with the parser's wording, before `HC8` is reached.

**That refusal is now pinned by a test, in both places.** Task 3's review found
it load-bearing for `HC8` and untested anywhere in the repository — a claim true
today, relied on, and unguarded. It is now driven from the parser's side
(`tests/guide/dump.test.ts`) and from `HC8`'s side
(`tests/stripboard/copper.test.ts`, through `boardGeometry`), so a future change
that modelled floating wires instead of refusing them cannot hand the
reconstruction a wire with no ends without a test going red. Measured: deleting
`parseWireEnd`'s `end === "-"` clause fails both, with
`"unreadable WIRE end \"-\" on WIRE W2"` in place of the floating-wire wording.

### 1.7 Three dump-grammar corrections the pipeline's plan drafts had wrong

Each was checked against the pinned fork's source and against real dumps under
`tests/fixtures/`, not recalled:

- A `WIRE` end is `<row>,<col>,<gridNodeId>,<wireNodeId>` — **four** fields,
  per `Src/Headless_dump_wires.cpp`'s grammar paragraph. The two node ids are
  present in the text and discarded by the reconstruction.
- A `NODE` line is `NODE <id> NAME <name> <members…>`; the `NAME` keyword is
  not optional.
- A `CUT` hole's node id is an unsigned integer, so a "garbage node id" fixture
  must be a large number rather than a negative one.

### 1.8 The verdict on the graph: the open, the short, and the entry point

`tools/stripboard/equivalence.ts` turns the copper graph into `HC8`'s verdict.
It **partitions the pins and never compares counts**: `componentCount` is
derived over every hole the `GRID` line declares, so it counts canvas strips
rather than nets, and a count comparison would accept a board whose pins are
grouped entirely wrongly whenever the two numbers happened to agree.

**Both failure directions are reported, separately.** An **open** is one
reference net whose pins fall in two or more copper components, reported with
the pins grouped by component; a **short** is one component holding pins of two
or more reference nets, reported with the net names and one hole as the witness.
The short is the direction that justifies the gate: joining two nets leaves
**both** reading complete, so a completeness check is structurally blind to it
and nothing in `HC1`–`HC7` looks for one.

**It takes dump TEXT, not a `BoardDump`.** The task brief's signature was
`netlistEquivalence(dump: BoardDump, …)`, and that signature cannot deliver
`HC8`'s wording: `missing-line` and `unsupported-strip-axis` are
*inexpressible* through a parsed dump, which carries a grid and a boolean axis
by construction. A caller that parsed the text itself would still throw — the
parser refuses a missing `GRID` — but with the parser's wording, which names
neither the refusal member nor the contract version. Measured: swapping
`boardGeometry` for `parseBoardDump` replaces
`missing-line: the dump has no VERTICAL_STRIPS line.` with
`--dump-board produced no VERTICAL_STRIPS line, …`, a refusal that is not
`HC8`'s.

**Three refusals of its own**, each driven by a test and each shown to fail
when its clause was removed:

| refusal | what is malformed | why guessing is not available |
| --- | --- | --- |
| `reference-pin-not-on-board` | a reference pin for which the dump prints no `PIN` line | a missing hole is **not** an open; it is `HC3`'s refusal and `HC8`'s too, and reporting an open would name the wrong constraint and point at the wrong fix |
| `empty-reference` | the reference netlist has no nets | every net of an empty reference is trivially in one component, so the verdict would read `equivalent` for **any** board — a pass indistinguishable from a real one |
| `empty-reference-net` | a reference net listing no pins | a net with no members can be shown neither whole nor split, so grading it grades nothing while reporting a result |

**`V11`'s equality assertion alone does not catch the node-keying mutant
here**, and that is worth recording because the obvious test looks sufficient.
Measured: with each pin's component taken from the node id its `CUT` line
reports, both the garbled and the un-garbled board returned the **same** wrong
verdict — `mid` open with the same groups, because the groups are ordered by
component number and `3` and `999999` sort to the same side — so the equality
held. What caught it is the assertion beside it that the verdict is
`equivalent`. In `tests/stripboard/copper.test.ts` the equality *is* decisive,
because there the component map itself is compared; one layer up it is not, and
`tests/stripboard/equivalence.test.ts` says so in the test it belongs to.

**The independence claim is asserted over the import closure, not over one
file's text.** `tests/stripboard/import-closure.ts` walks the transitive graph
and **refuses** an unresolvable specifier rather than dropping the edge, because
a closure computed over a partial graph is smaller than the real one and the
module that fell out of it may be the forbidden one. The earlier form,
`expect(text).not.toContain("score.ts")` over a single file, was satisfied by
one transitive import through any third module. Measured, both halves: importing
`tools/perfboard/check.ts` from `equivalence.ts` fails the closure test, and
importing it from `copper.ts` instead — a module `equivalence.ts` imports but
does not name — fails it **again**, which is exactly the case the substring scan
passed.

The walker's `EXTERNAL` set enumerates bare specifiers by name. The brief's
claim that the only ones here are node builtins and `bun:test` is wrong:
`lib/sim/operating-point.ts` imports `eecircuit-engine`, this repository's one
npm dependency, so any closure reaching `lib/sim/` hits it. It was found by
exactly the mutation above, which first failed on the bare specifier instead of
on the forbidden module — loud, but naming the wrong fault.

### 1.9 What an `HC8` pass does **not** cover

- A defect in VeroRoute's geometry export (§1.2, limit `H-13`).
- Whether the board can be built: spans, pin patterns, stock extent and
  legibility are `HC4`, `HC5`, `HC6`, `HC9` and `HC10`, and `HC8` is silent on
  all of them.
- Whether the **reference netlist** is right. `HC8` compares the copper against
  that netlist; both being wrong the same way is not something it can see.
- **That a real board carrying a short exits 0 under `--check` while `HC8`
  rejects it.** This is the end-to-end form of the claim that `HC8` detects a
  class of defect no pre-existing check detects at all, and it is **unproven**.
  Both of `HC8`'s directions are driven from hand-written dump text, which is
  the module's real input seam, but no board was run through `--check` to
  establish the end-to-end half, and none can currently be produced: cuts are
  derived by `DeriveCuts` and **no verb in the pinned fork edits one**, so a
  board with the separating `CUT` removed cannot be written. `CRITERIA`'s
  reasoning that `GetBoardMembership` would still read both nets complete is an
  argument from that function's source, not a measurement. The proof belongs to
  Task 6, which is owner-blocked (`OB5`) pending the owner's choice between the
  three recorded routes; the `OB5` note at the top of
  `tests/stripboard/equivalence.test.ts` says the same thing beside the tests,
  and Task 6 deletes it when the real fixture lands.

---

## 2. `BOUNDS` and `DIRECTION` — what the two new dump lines say, and what they do not

Task 7 (M1.1) added two facts to the pinned fork's `--dump-board`. Neither is
adopted here yet: `veroroute.pin` still names the commit before them, and the
typed parser in `tools/guide/dump.ts` does not read either line. This section
records what they mean, because the meaning of `BOUNDS` in particular is not
what its name suggests and a later reader who assumes otherwise gets a wrong
answer quietly.

### 2.1 `BOUNDS` is a union of three sources, and it is not the fabrication extent

`Board::GetBounds` (`Src/Board.h`) returns the union of three things, and
reports failure only when all three are empty:

1. every grid element, on every layer, carrying a node id **or** a pin —
   painted copper, a wire's run, a solder-bridged hole, and every pin hole
   whether painted or blank;
2. `m_compMgr.GetBounding()` — every component's `GetFootprintRect()` plus the
   trax pattern's rect, filtered on **neither** `GetIsPlaced()` **nor** type, so
   an unplaced part still contributes the rect it last sat in;
3. `m_textMgr.GetBounding()` — every **text label**'s rect, which is an
   annotation and not a physical feature.

So the line can **over**-state, and a consumer that sized a piece of stock from
it would sometimes cut too much. It is also only the union: nothing in the dump
attributes any of its four numbers to one of the three sources.

**Measured on this repository's own boards**, with the fork built at the Task 7
branch, comparing `BOUNDS` against the extent of the holes the dump enumerates
(`PIN`, `WIRE` ends, `SOLDER`):

| board | `GRID` | `BOUNDS` | `PIN`-hole box | all enumerated holes |
| --- | --- | --- | --- | --- |
| `transistor-preamp-staged` | 30 x 39 | `2,1 27,37` | `3,2 27,31` | `3,2 27,32` |
| `transistor-preamp-feedback` | 16 x 18 | `0,0 15,17` | `0,1 15,16` | `0,0 15,16` |
| `pultec-low-boost` | 14 x 32 | `3,3 10,28` | `3,3 10,28` | `3,3 10,28` |
| `pt2399-core` | 17 x 36 | `0,0 16,35` | `0,0 16,35` | `0,0 16,35` |

Three things follow, and each is a thing a later task would otherwise assume:

- `BOUNDS` and the hole extent are **different quantities**, and the difference
  is real rather than theoretical: on `transistor-preamp-staged` `BOUNDS` reaches
  five columns further right than any hole, and one row further up. Substituting
  one for the other silently redefines whatever reads it.
- `BOUNDS` is nonetheless the **only** dump-readable source of a part's extent
  across the strips. A `PART` line carries a column span and no row span, so a
  multi-row footprint's row extent appears nowhere else.
- They can also coincide exactly, as on `pultec-low-boost` and `pt2399-core`. A
  test that compared the two on one board and found them equal would therefore
  conclude the wrong thing about both.

### 2.2 The decomposition that was considered and not made — a finding for the owner

`BOUNDS` could be emitted as three lines, one per source, which would let a
consumer separate the fabrication extent from the annotation and from a floating
part's stale rect. **Task 7 did not do it**: it is a change to `Board::GetBounds`
or to its callers rather than an added dump line, which is a larger fork change
than M1.1 asks for, and the conservative use the pipeline makes of the union —
report both figures and name the discrepancy — is sound without it. The option is
recorded here so that it exists as a choice and nobody has to re-read `Board.h`
to find it. The three sources are named in §2.1 above and in the grammar comment
in `Src/Headless_dump_pins.cpp`.

### 2.3 Unverified: a text label inflating `BOUNDS`

Source 3 above — a text label moving `BOUNDS` — **is not covered by any test,
and the reason is not that it was forgotten**. `Board::AddTextBox` is reached
only from `mainwindow.cpp`'s Text Box menu action; no headless verb creates or
moves a `TextManager` rect, and `--author --op move-label` moves a *component's*
label offsets, which `GetBounds` never reads. No committed fixture is a pair of
boards differing only by a label, so the inflation cannot be shown by comparing
two dumps either.

What **is** measured is that `BOUNDS` exceeds the enumerated-hole extent on real
boards (§2.1) and that it grows to enclose a wire end lying outside every pin
(`tests/bounds.test.ts` in the fork). Those establish that the line is not the
hole extent; they do **not** establish which of sources 2 and 3 produced any
particular excess. Any check that depends on telling those two apart is
unsupported by evidence today.

### 2.4 `DIRECTION`, and two consequences for a consumer

`DIRECTION <W|E|N|S>` is appended to every **placed** `PART` line and absent
from a `FLOATING` one, mirroring the existing rule that a floating component
prints no `PIN` line. Two things about it are not obvious from its shape:

- **`SPAN` is not rotation-invariant, and `DIRECTION` is what tells its two
  readings apart.** `CompElementGrid::GetCols(direction)` (`Src/Grid.h`) returns
  the footprint's **row** count for a part facing `N` or `S`. Measured on the
  fork's `pt2399-core-hand-placed-v63.vrt`: one `CAP_CERAMIC` footprint reads
  `SPAN 2` facing `W` and `SPAN 1` facing `N`. The fork's grammar comment
  asserted the opposite until Task 7 corrected it, and `--help` carried no
  statement about `SPAN` at all; both now state the true rule.
- **A fifth token is possible.** `Component::Load` reads the direction as a raw
  char out of the `.vrt`, so a damaged or hand-edited board can carry a value
  that is none of the four, and the dump prints `UNKNOWN` rather than inventing
  `W`. A parser that types this field as the four letters alone will refuse such
  a board — which is the right outcome, provided it refuses by name.

### 2.5 `BOUNDS` is inserted, not appended, and what that costs

Every previous addition to this grammar went at the end of the output. `BOUNDS`
sits immediately after `GRID` and before the `PIN` block, because it is a
board-level fact like `GRID` and a single board-level line printed after a
variable-length per-pin block reads as if it belonged to the last pin. No
existing line's shape, field count or value changes, and no two existing lines
change their order relative to each other, so every prefix-extracting consumer is
unaffected.

What does change: **a dump captured as a golden file gains a line in its middle
rather than at its end.** Any comparison of a committed capture against a freshly
generated one will differ by that line once the pin moves, which is a fact about
`tests/fixtures/*.dump` here and not about the fork.

### 2.6 `DIRECTION` is the half of that which can actually refuse

The inserted `BOUNDS` line is the cheap half, and framing the pin-move problem
around it understates the risk. **A new line an old parser never asks for is
ignorable; a missing field on a line it already parses is a refusal.** Every
committed dump text in this repository — the five `.dump` fixtures and about
eight hand-written dump literals in tests — carries **placed** `PART` lines with
no `DIRECTION` field, because they were captured before the field existed. Two
of those captures are frozen evidence with provenance and may not be
regenerated.

So the contract "`direction` is `undefined` exactly when the part is floating",
which the brief states and which the fork's own reader first enforced with a
throw, **would have refused all of them at once the moment the pin advanced** —
a mass failure of files nobody is allowed to change, triggered by a one-line
change to `veroroute.pin`.

The rule that replaces it, and it applies to the repository-side parser just as
much as to the fork's:

- `direction` is **optional on a placed part too**, and the reason is recorded
  beside the type: a capture is older than the grammar by construction.
- `bounds` is optional in the same way, which is already the brief's
  instruction for step 7.
- **The refusal belongs to the consumer that acts on the value**, not to the
  reader of the text: Task 15's `A_occ` for `bounds`, Task 8's effect check and
  Task 14's `HC10` for `direction`. The fork's reader now shows the shape —
  `maybeBoundsOf` answers "is it there", `boundsOf` and `usableDirection` refuse
  by name for a caller that needs an answer.
- **What is still refused is the contradiction**: a `FLOATING` part carrying a
  direction, which no build prints and which would mean two fields on one line
  disagree.
- **`UNKNOWN` is received, never cast and never normalised to `W`.** It is
  narrowed by comparison, and the caller that acts on a direction refuses it by
  name — which is exactly what the dump itself does rather than guessing.

### 2.7 Both fields are adopted here now, and two of section 2's claims about that were stale

Section 2 opens by saying neither field is adopted: *"`veroroute.pin` still names
the commit before them, and the typed parser in `tools/guide/dump.ts` does not
read either line."* The second half was true until commit `4e72a17`. **The first
half was already false when it was written**, and it was not checked at the time:

- `veroroute.pin` names `ed6c5a6`, which Tasks 8 and 9 advanced it to.
- `31c0197` — *"BOUNDS and each placed part's DIRECTION, and the SPAN claim that
  was false"* — is an **ancestor** of `ed6c5a6` (`git merge-base --is-ancestor`
  says so, and `git log ed6c5a6` lists it). Tasks 8 and 9 built `--rotate` and
  `--move-batch` **on top of** the Task 7 branch.
- So the **pinned binary has been emitting both fields all along**. Measured by
  running it: every board under `boards/` prints a `BOUNDS` line and a
  `DIRECTION` field on every placed `PART` line, and the four `BOUNDS` figures
  reproduce §2.1's table exactly, including the five-column over-statement on
  `transistor-preamp-staged`.

The lesson is §2's own: a claim about an observable is worth re-measuring when
the thing it is about has moved, and a pin bump moved it. The repository-side
reading landed under §2.6's rule rather than the Task 7 brief's, in
`tools/guide/dump-model.ts` (`Bounds`, `PartDirection`, `boundsOf`,
`usableDirection`) and `tools/guide/dump.ts`. §2.6's third name,
`maybeBoundsOf`, has no counterpart here and does not need one: on this side the
optional **field** `BoardDump.bounds` already answers "is it there", and a
function wrapping a field read would be a second spelling of one state.

---

## 3. `HC10`'s placement clause — the owner's rule, and the inverted one it replaced

**The owner decided this clause on 2026-10-11, and the rule below is now
criteria.** His words: *"dips should span strips with a cut down the middle, like
a breadboard."* The rule:

> **No two pins belonging to the same footprint row may share a strip.**

A row lying ALONG a strip puts every pin of that row on one piece of copper —
that is the short being ruled out. A row crossing the strips puts each of its
pins on its own strip — that is the breadboard mounting being ruled in. The
DIP's centre cut is `HC1`'s and `HC8`'s business, where connectivity is decided;
`HC10` does not assert it a second time. A one-pin row cannot violate the rule,
because a row of one pin cannot be shorted to itself.

**The task brief's wording was the INVERSE of this, and §3.2–§3.3 below are the
measurements that established it.** They are kept rather than deleted because
they are the evidence the decision was made against, and because the inverted
reading is the one a later reader will reach for again. §3.5 records what the
rule needed before it could be implemented.

### 3.1 What was asked for

CRITERIA's `HC10` criterion sentence is *"every placed part's pins lie on
straight lines parallel to the strips"*, and its "Checked by" column specifies a
**footprint-level** classification that *"refuses by name before any placement
exists to grade"*. Task 2 built that half (`lib/kicad/pin-pattern.ts`,
`admitPattern`). Task 14's brief adds a **placement** half, worded:

> for every **placed** part, its resolved `PIN` holes must decompose into rows
> along the strip axis the dump reports: every pin's along-strip coordinate may
> vary freely, and the pins must fall on a set of strips whose occupied strips
> are exactly the rows the footprint's classification predicts, **consistent
> with the part's `DIRECTION`**.

### 3.2 What that rule does to the boards that exist

Measured with the pinned binary, each placed part's `PIN` holes grouped by
strip, against `pinPatternFor(footprint)`'s own row decomposition, with the
footprint read from each board's committed netlist export:

| board | placed parts with pins | agree | disagree | no recorded footprint data |
| --- | --- | --- | --- | --- |
| `pt2399-core` | 24 | 2 | 10 | 12 |
| `transistor-preamp-feedback` | 16 | **3** | **13** | 0 |
| `transistor-preamp-staged` | 34 | 3 | 27 | 4 |

The three that agree on `transistor-preamp-feedback` are its three `SIP2`
headers. Everything else disagrees in **one shape**, and the shape is the point:

```
R1 R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal:
   on 2 strip(s) sizes [1,1], classification predicts 1 row(s) sizes [2]
Q1 TO-92_Inline:
   on 3 strip(s) sizes [1,1,1], classification predicts 1 row(s) sizes [3]
```

**A two-terminal part's leads are on two different strips because they are on
two different nets.** Both leads on one strip is a short across the part. So the
correct mounting of a resistor, a film capacitor, an electrolytic, a `TO-92` and
a `TRIM_FLAT` is with its single classification row running **across** the
strips, which is exactly what the rule above refuses. Those three boards pass
`make check` today and were laid out by hand.

### 3.3 The transpose is not the rule either, and that is what makes this a decision

Reading the rule the other way round — the classification's rows must run across
the strips — fits every two-terminal part and the `TRIM_FLAT` (`RV1`'s three
pins on strips 3, 4, 5, against a 2-row classification whose three distinct
along-row positions transpose to three strips), and then fails the two parts the
first reading fits:

- `pt2399-core`'s `U1`, a `DIP-16`, has its 16 pins on **8 strips of 2**, cols
  19 and 22, which is its classification exactly: 8 rows of 2, `rowPitchSteps`
  all 1, along-row extent 4 holes. `SPAN 4 DIRECTION N`.
- `J1` (`SIP5`) has 5 pins on 5 strips, against 5 rows of 1.

So **both orientations appear on boards that work** under the brief's reading,
which is what made it a decision rather than a defect. The owner settled it:
§3's rule, not the brief's.

### 3.4 Implementing the owner's rule needed one reading, and it is this one

**`classification.rows` is NOT the decomposition the rule means, for three
recorded footprints.** Any grid pad pattern decomposes into rows along *either*
axis, and `classifyPads` returns the first axis that works — `x` whenever `x`
works. Measured over all thirteen recorded footprints, that disagrees with the
longer-rowed decomposition for exactly three:

| footprint | `classification.rows` | the rule's rows |
| --- | --- | --- |
| `DIP-16_W7.62mm` | 8 rows of 2 (the pad PAIRS `1`+`16`, `2`+`15`, …) | **2 rows of 8** (the two sides) |
| `PinHeader_1x02` | 2 rows of 1 | **1 row of 2** |
| `PinHeader_1x05` | 5 rows of 1 | **1 row of 5** |

The other ten are identical either way.

**The DIP decides it.** A breadboard-mounted `DIP-16` puts one pin from each
side on each of eight strips, so its sixteen pins *do* sit two to a strip — and
read against `classification.rows`, where that pair IS a row, the owner's rule
would refuse exactly the mounting he named. Measured on `pt2399-core`'s `U1`:
eight violations, one per strip. Read against the two rows of eight, it passes.

So `hc10Rows` in `tools/stripboard/constraints-physical.ts` groups the recorded
pads by the across-coordinate of whichever axis yields the LONGER rows.
`classification` remains the authority for the footprint half (`admitPattern`);
this is only the grouping the placement rule is phrased over. **It was measured
before being relied on**, on four committed boards:

| board | parts graded | violations | `make check` |
| --- | --- | --- | --- |
| `pt2399-core` | 12 | **0** | passes |
| `transistor-preamp-feedback` | 16 | **0** | passes |
| `transistor-preamp-staged` | 30 | **0** | passes |
| `transistor-preamp-lab` | 31 | **5** | **fails** |

Zero on every board that passes `make check`, and five on the one that does not
— `C3`, `R4`, `RV2`, `RV4` and `RV5`, each with both leads of one row on a
single strip. So the rule is satisfied by every board in service **and is not
vacuous**: it discriminates on real data, which a rule satisfied by everything
would not.

### 3.5 What `HC10` exists for, kept as the standing reason

`HC10` is a **cost judgement**: a refused pattern *"crosses a different strip at
nearly every pin and shares one with pins it must not share with, so nearly
every such hole becomes a cut"*. The owner's rule is the cheap readable proxy
for that cost. A rule phrased over the cut count directly would need no
per-footprint row decomposition at all, and `C` is already a term of `F`; it is
recorded here as an option, not a change made.

### 3.5a Two of the four checkpoint boards also refuse on `PAR2`, which is separate

Independently of §3.2, the four boards Task 14's CHECKPOINT 1 grades do not
divide the way the brief predicts:

- **`pt2399-core` refuses, as the brief predicts**: 12 of its 24 placed parts
  carry `Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm` or
  `Capacitor_THT:CP_Radial_D5.0mm_P2.50mm`, both in `UNSOURCED`, so `HC5`, `HC9`
  and `HC10` refuse by name. Its extent also exceeds the stock (`OB4`).
- **`transistor-preamp-staged` also refuses, which the brief expects to pass.**
  It places `Capacitor_THT:CP_Radial_D10.0mm_P5.00mm` and
  `Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical`, and **neither is
  in `LEAD_SPANS`, in `UNSOURCED`, or in `PIN_PATTERNS`**. So the refusal is the
  plain unlisted-footprint one, not the better-worded `UNSOURCED` one, and it is
  `PAR2` working as designed on data nobody has recorded yet. Adding the two
  entries needs a named part and its datasheet; it is not a code change.
- `transistor-preamp-feedback` has every footprint recorded and is the one board
  of the three whose only failure is §3.2's.

### 3.6 `transistor-preamp-staged` is out of the grader's board set, and NOT because it failed

The four footprint-keyed constraints refuse it by name: it places
`Capacitor_THT:CP_Radial_D10.0mm_P5.00mm` and
`Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical`, and **neither is in
`LEAD_SPANS`, in `UNSOURCED`, or in `PIN_PATTERNS`** — so the refusal is the
plain unlisted-footprint one rather than the better-worded `UNSOURCED` one. That
is `PAR2` working as designed on data nobody has recorded yet.

**The board is active work owned by another branch**, where its footprint data is
being authored. It is not retired and nothing about it is superseded. So this
branch neither supplies that data nor guesses it: guessing would invent a
datasheet value, which is the failure the whitelist exists to prevent, and
supplying it would collide with the other branch's work on the same two tables.
Nothing under `boards/transistor-preamp-staged/` is touched here.

**Its dump stays a geometry fixture**, and that is a different role.
`tests/fixtures/stripboard/transistor-preamp-staged.dump` and the `HC8` agreement
test are unchanged: the reconstruction either partitions those pins correctly or
it does not, whatever branch owns the design. Only membership of the set of
boards that must satisfy all ten constraints is affected.

---

## 4. CHECKPOINT 1 — the grader over boards a person built

Run by `tests/stripboard/grade-checkpoint.test.ts`, which is a STANDING test: a
checkpoint run once is a checkpoint that stops holding. Both boards are dumped
live from the binary `veroroute.pin` names, because every committed `.dump`
predates the `BOUNDS` line and `HC6` refuses a dump without one.

**The set is two boards, and neither exclusion is a board that failed.**
`transistor-preamp-staged` is §3.6. `pultec-low-boost` is excluded on a measured
obstruction: the frozen benchmark's reference export is EESchema v1.1, which
carries **no footprint field**, so the four footprint-keyed constraints have
nothing to read; and the frozen board places `board_terminals`
(`BLOCK_200MIL3`, three pins), which today's low-boost model no longer has at all
— `--check` reports it as removed. Reading footprints from today's model would
grade a 9-net hand layout against a 14-net circuit, which that fixture's own
provenance forbids.

### 4.1 `transistor-preamp-feedback` — **A1 = true, all ten hold**

The ground-truth result: a board somebody laid out by hand, that passes
`make check`, and that the grader does not refuse. Each verdict's own figures,
read rather than merely asserted:

| | verdict | the figures it measured |
| --- | --- | --- |
| `HC1` | holds | `--check` exited 0, no incomplete net |
| `HC2` | holds | `CUT_STATE COMPUTED`, over **5** derived cuts |
| `HC3` | holds | no part reads `FLOATING`; all **16** placed parts print their `PIN` lines |
| `HC4` | holds | every measurable span inside 2–16 holes, over **11** two-lead parts; 5 parts have no bendable span |
| `HC5` | holds | every span at or below its family's `maxSpanHoles` |
| `HC6` | holds | extent `0,0 15,17` = **16 × 18**, fits stock 34 × 27; `BOUNDS` agrees exactly; trim keeps all **61** required features and reproduces the same **11** pin groups |
| `HC7` | holds | `Schematic delta` heading absent, which is what a matching board prints |
| `HC8` | holds | all **11** reference nets partition exactly — no open, no short, contract version 2 |
| `HC9` | holds | every span at or above its family's `minSpanHoles` |
| `HC10` | holds | footprint half admits all 16; placement half finds no footprint row with two pins on one strip |

**A single all-hold board proves the grader can pass something, not that it can
fail that board**, so the checkpoint also perturbs this same input in one place
— the stock shrunk to one column under the board's measured 18 — and requires
`HC6` to refuse and `A1` to go false. Without that, "all ten hold on a real
board" is a statement about the grader's appetite.

### 4.2 `pt2399-core` — **REFUSES, and the refusal is the checkpoint passing**

Expected to refuse, on two conflicts the criteria already record from the owner
himself. **What would be a failure is `pt2399-core` grading admissible.**

- **`PAR2` refuses it by name**, and the name is the footprint rather than the
  part: twelve of its twenty-four placed parts carry
  `Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm` or
  `Capacitor_THT:CP_Radial_D5.0mm_P2.50mm`, both listed in `UNSOURCED` precisely
  so they refuse here. The whole table throws, which is why each constraint is
  also exported on its own.
- **`HC6` names both figures** (`OB4`): fabrication extent `0,0 16,35` =
  **17 × 36** against **stock 34 × 27**, reported as *"36 columns needed against
  27"*. The owner's own reading: *"It doesn't fit on my stock boards. I
  improvised to make it work."*
- `BOUNDS` and the enumerated features agree exactly on this board, so the
  extent is not an artefact of the union.

### 4.3 Two findings the checkpoint produced that were not predicted

1. **`HC9` catches six resistors on `transistor-preamp-staged`** at spans of 2–4
   holes against `R_Axial_DIN0207`'s recorded `minSpanHoles` of 5 (`R1`, `R3`,
   `R5`, `R6`, `R7`, `R9`), and `HC5` catches `C8` at 14 holes against a
   `maxSpanHoles` of 11. Each of those spans is measured **across** the strips —
   a two-hole span is an axial part standing on end with one lead bent back — and
   the recorded geometry is `mounting: "axial-horizontal"`, which does not cover
   vertical mounting of an axial part. So this is either a different part than
   the recorded Vishay MBB0207, a recorded minimum that does not apply to the
   mounting used, or six strained joints. **It is a finding for the owner, not a
   reason to widen a bound**, and it is on a board this branch does not own.
2. **`HC2` and `HC8` interact on an unresolved board, and `HC8` reports rather
   than throws.** `copperGraph` refuses `CUT_STATE UNRESOLVED` by name
   (`cuts-not-computed`), correctly — the cut list is absent rather than empty.
   `hc8` therefore checks the state first and returns `held: false` saying
   equivalence was **not established**, naming `HC2` as the owner of the cause.
   The distinction: a throw means "this candidate cannot be graded", which is
   right for missing DATA (`PAR2`); an unresolved cut list is a fact about the
   BOARD that another constraint already names, and the honest verdict is that
   equivalence is unknown. It is not a skip that looks like a pass — `held` is
   false, so `A1` is false.

### 4.4 `HC10`'s placement half refuses a square pin field rather than breaking the tie

The rule reads over the footprint's **longer-row** axis (§3.4). A square pad
field has no longer axis, so the rule has no row decomposition to be read over
and **there is no answer to give**. `hc10Rows` therefore throws, naming the
footprint and both equal extents.

**Why not a documented tie-break.** Under one — falling to `x`, which is what
the first implementation did silently — the verdict becomes the tie-break rather
than the rule. Measured: a 2 × 2 pad field at 2.54 mm grades `held = false`, and
the *same field rotated a quarter turn* grades `held = true`. Two verdicts for
what is physically one arrangement. The refusal is this repository's standard
instead: an empty whitelist that refuses loudly beats a general rule that
quietly accepts a guess.

**It refuses for nobody today.** All thirteen recorded footprints have one axis
strictly longer, and the degenerate shapes — one row, rows of one pin, a single
pad — are decided by the comparison rather than by a tie. The refusal exists to
stop an arbitrary verdict the day a square part arrives, and it names
`docs/stripboard/pipeline-verification.md` §3 as where the owner's answer should
be recorded when one is given.

### 4.5 Two span tables can be consulted in one grade, and why that is latent

`HC4`, `HC5` and `HC9` read their bounds through `CheckInput.spans`. `HC10`'s
footprint half does **not**: it calls `admitPattern`, which reads the
module-level `LEAD_SPANS` **directly** (`lib/kicad/pin-pattern-model.ts`), and
nothing routes `CheckInput.spans` to it. So a grade can consult two different
span tables.

**It is latent rather than live, and the reason is the shape of the
injections.** No production code builds a `CheckInput`; `checkpointInput`
injects neither map; and the test injections are `[...LEAD_SPANS, ring]` and
`[...PIN_PATTERNS, ring]`, which **extend rather than replace** — they shadow no
recorded entry, so both paths read the same figure for every footprint either
one looks up. The comment that says so lives at the injection point in
`tests/stripboard/grade-fixtures.ts`, because a future author who injects a
*replacement* span table would get a grade that half-ignores it: the three span
constraints would use the new figure and `HC10` would quietly use the old one.

**It showed itself while writing §4.4's test.** Keying the synthetic square to a
synthetic footprint name made the footprint half refuse on `admitPattern`'s
missing-span guard, so the placement half was never reached and the tie refusal
could not be exercised at all. The test keys the square onto
`PinHeader_1x02_P2.54mm_Vertical` — recorded at `[2, 2]`, which is what a 2 × 2
field at 2.54 mm measures — so the footprint half admits it and the placement
half runs. Re-plumbing `admitPattern` is scope for a later task.

### 4.6 `HC8`'s fixture was failing three constraints, and now fails one

`two-nets-shorted` was Task 4's board reused — that file's `WHOLE` with its
`CUT` line removed — so that the grader and the equivalence module were held
against one artifact. But that board's `R2` straddles a single strip with
**both** leads on it: that is what makes it a short, and it is also exactly what
`HC10`'s placement half forbids, at a 3-hole span below the resistor's recorded
minimum of 5. So `HC8`'s fixture was also failing `HC9` and `HC10`, and **a
fixture that fails three constraints cannot show which one it is for.**

The overlap was avoidable, so it was removed. The board is now three 1x02
headers chained across four strips, where two nets meet on one strip without any
part straddling one, and `grade.test.ts` asserts the failing set is **exactly
`[HC8]`**. The drift guard in `equivalence.test.ts` is deleted rather than
weakened — its subject is gone, because the two boards are now meant to differ —
and that file carries the reason where the test was. Nothing is lost: the board
is still read through `netlistEquivalence`, by `HC8` itself, in the V4 table.

**The three fixtures whose overlap is NOT avoidable** keep theirs, and each says
so: `cuts-unresolved` fails `HC1`/`HC7` because it is a real board that fails
`--check`, and `HC8` cannot be computed on it at all (§4.3); `span-above-tool-
range` fails `HC5` too because the resistor's own `maxSpanHoles` IS the tool
ceiling; `schematic-delta` fails `HC1` because `--check` exits non-zero on a
delta.

### 4.7 A provenance file that misdescribed its own fixtures

`tests/fixtures/stripboard/negative/provenance.txt` claimed *"no span figure
appears in any fixture or in the test."* The three span `.dump` files baked the
derived row straight in — `AT 17,1`, `AT 5,1`, `AT 4,1`. **The claim was false,
and a provenance file that misdescribes its own fixtures is worse than none,
because the next reader trusts it** — this repository's rule being that
transcription is evidence, not memory.

Fixed by making the claim true rather than by softening it, which is also what
the task brief asked for: the three fixtures are no longer files. They are
constructed in `grade-fixtures.ts`'s `SPAN_FIXTURES`, which names a footprint,
reads the bound through `leadSpanFor`, and builds the dump text and the netlist
from it. A datasheet revision now moves the fixture with the module. The
constructor also **asserts the derived span still offends its constraint**, so a
revision that moved a bound far enough fails loudly instead of leaving a fixture
that quietly tests nothing.

### 4.8 The tie refusal misdiagnosed a one-pad footprint, and the order is the fix

**A defect the tie refusal (§4.4) caused.** A SINGLE PAD IS A TIE TOO — its
widest row is 1 along either axis — and `hc10Rows` ran BEFORE pad membership was
checked. So a two-hole part mis-declared with `PinHeader_1x01` refused with the
square-pin-field message: *"A square pin field needs a rule the owner has not
given. Take it to him."* The real fault is a wrong footprint name.

**A refusal that sends somebody to the owner for a decision when they have a
typo is worse than no message, because it teaches the wrong thing** — and that
is the same rule that makes the tie refuse at all, applied to the refusal rather
than to the check. Nothing passed silently either way; this was a wrong remedy
inside a `throw`.

Two changes in `hc10PlacementOrientation`, in this order:

1. **Pad membership is checked first**, so a part with holes the footprint has
   no pads for gets the accurate refusal — which now also names the pads the
   footprint *does* have, so the reader can see at once that it is the wrong
   footprint.
2. **A part with fewer than two holes skips the row derivation entirely**,
   because one pin cannot share a strip with itself. This is what keeps a
   LEGITIMATELY placed one-pad part — `PinHeader_1x01` is the recorded one —
   away from `hc10Rows`, which would otherwise refuse a part that trivially
   complies.

**A false claim beside the tie is corrected too.** The comment said a single pad
was *"decided by the comparison rather than by a tie"*. It is not: it IS a tie.
It now says what the code does — of the thirteen recorded footprints, twelve
have one axis strictly longer and `PinHeader_1x01` is the one-pad case the order
above handles.

Both halves are tested, and the first is proved able to fail: with the
membership pre-check disabled, the one-pad test fails with the square-pin-field
message quoted verbatim in the task hand-off.

### 4.9 `HC10` has its own file now, at the seam that was written down first

`constraints-physical.ts` passed the 500-line ceiling while fixing §4.8. The cut
was the one its own module comment had already named rather than one found under
pressure: `hc10`, `hc10FootprintEligibility`, `hc10PlacementOrientation`,
`patternFor`, `rowsAlong` and `hc10Rows` to `constraints-pattern.ts`.

They are the **only** dependants of `lib/kicad/pin-pattern.ts` and
`pin-pattern-model.ts` among the ten checks, so the seam took two imports with
it and left `HC4`, `HC5`, `HC6` and `HC9` reading only `lead-span*` and
`./extent.ts`. `HC10` still belongs to the physical group by subject and says
so; it left by line count. `constraints.ts` re-exports it, the import-closure
test covers the new module, and nothing else changed.

Final sizes: `constraints.ts` 56 (surface), `constraints-model.ts` 254,
`constraints-electrical.ts` 199, `constraints-physical.ts` 263,
`constraints-pattern.ts` 309.

### 4.10 Where the two-span-tables hazard is documented

§4.5's warning has moved from the test-side injection point to
**`CheckInput.spans`'s own declaration** in
`tools/stripboard/constraints-model.ts`. The person it is for is a future author
adding a production `CheckInput` builder, and they will be reading the field's
declaration, not the test fixtures where the hazard happened to be discovered. A
one-line pointer stays at the injection site, which now says only that the
injections EXTEND rather than REPLACE the real tables and that this is
load-bearing.

---

## 5. CHECKPOINT 2 — the climb against the real binary, from each starting arm

The first run of Task 17's `climb` against the pinned fork, on the import-placed
low-boost board. **The headline is that three of the four starts refuse before
the first candidate, the fourth climbs and converges inadmissible, and four of
the six move kinds had to be deferred on evidence this run produced.** Nothing
below was adjusted to make a figure look better; the move set shrank because the
fork refused what it contained.

### 5.1 How it was run

A scratch script, not committed, driving the repository's own paths — no second
export and no second import:

```
VR=.tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute
loadDeclaration("boards/pultec-low-boost/perfboard.json") -> exportNetlistFor()  (the netlist)
"$VR" --import <netlist> --strips horizontal -o imported.vrt                     (the start board)
deriveTargets(physicalBoard("low-boost"), rules.stockRows, "pultec-low-boost")   (N=14, P=50, cutFloor=0)
referenceNetsFromExport(<netlist>)                                               (14 nets)
footprints: component.id -> component.part.footprint over physicalBoard("low-boost")  (17 declared)
stockFor("boards/pultec-low-boost/perfboard.json", rules)                        (34 x 27, rules-default)
rules: the committed stripboard/rules.json, evaluationCap 20000, worseAcceptance null
then, per start: seedCandidate({arm, seed: 0}) -> climb(start, {batch: false})
```

`unpainted-import-board` is not a `SeedArm`: it is `imported.vrt` handed straight
to `climb` with no arm in front of it, and it is in the table because it is the
only start that is not already painted. See 5.3.

### 5.2 What each start did — RUN 1, with `rotate` deferred

**Superseded in part by 5.6, and kept because it is the evidence for 5.3 and
5.4.** This run had `move` and `stretch` only; 5.6 is the same run with the
occupancy carried and `rotate` restored.

| start | outcome | rounds | evaluations | `acceptedPerRound` | `F0` | `F` best | `A1` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `constructed` | refused before the first candidate | — | — | — | — | — | — |
| `import` | refused before the first candidate | — | — | — | — | — | — |
| `random` | refused before the first candidate | — | — | — | — | — | — |
| `unpainted-import-board` | **climbed, stopped on `S3`** | **3** | **78** | **[1, 1, 0]** | **39** | **37** | **false** |

The one run that happened: `C = 37`, `W = 0`, `B = 0`, 311 fork invocations,
3.4 s wall. It accepted one move in round 0 and one in round 1, round 2 accepted
nothing, and `S3` stopped it — a local optimum under the move set it had.
`F` fell from 39 to 37, which is **two cuts removed by search**, against a
derived floor of 0. The best board fails `HC1`, `HC6`, `HC8` and `HC10`, so
`admissibleA1` is `false` and the run reports that rather than reporting nothing
found: `A1` classifies the result, not the step.

**Two cuts is not a result anybody should be pleased with**, and the reason it is
so small is 5.4: the climb had `move` and `stretch` and nothing else.

### 5.3 Why three of the four starts refuse, each with its cause

- **`constructed` and `random`: `occupancyOf` refuses a part facing `N`.** Both
  arms turn parts, and for a part across the strips `SPAN` is the footprint's ROW
  count while its stretched length appears in no dump line at all (COST §7.3
  item 2 — `GetCompRows`, the field `--dump-board` does not report). So the board
  an arm hands back is one the move enumerator cannot read. Refusal, verbatim:
  `part "C18": it faces N, and for a part across the strips SPAN is its
  footprint's ROW count while its column extent - the stretched length - appears
  in no dump line, so there is no rectangle to read.`
- **`import`: `--move` refuses on a painted board.** Every arm's last gesture is
  `--author --op autofill`, because `HC2` refuses an unresolved cut list, so an
  arm's output is painted — and `--move` will not relocate a part onto holes that
  overlap its own current footprint once `AutoFillVero` has painted copper into
  them. Measured three ways on this board: `--move C18 --to 1,0` succeeds on
  `imported.vrt` and is refused on `import.vrt` (one autofill is enough); and
  after relocating `C18` to open space at `20,20` and repainting, `21,20` and
  `20,21` are refused while `23,20` succeeds. A one-hole move always overlaps, so
  the painted start refuses on round 0, move 0.

  This also found a real bug in `climb`, now fixed: it was chaining gestures on
  the PAINTED file. The paint is a scoring artifact; `Measured.source` carries
  the board a gesture applies to, and `Evaluation.candidate` stays the painted
  board that was scored and graded.

### 5.4 The move set this run actually had, and what each deferral cost

Four of the six kinds are in `DEFERRED_KINDS`, three of them on evidence from
this run. 26 moves enumerated on the fixture board, 12 applicable.

| kind | applicable | why not |
| --- | --- | --- |
| `move` | yes | — |
| `stretch` | yes | — but only after `Component::CanStretch` was transcribed as `VEROROUTE_STRETCH_BOUNDS`: the run proposed `--stretch junction_grounds --direction grow`, geometrically clear, and the fork refused it (`junction_grounds cannot grow`) after 24 accepted gestures. A geometric fit is not a stretchable part. Both `SIP5` parts refuse both directions, measured, while `RESISTOR` and `CAP_FILM_WIDE` shrink on the same board — and `CanStretch` as READ predicts the opposite for `COMP::SIP` (min 1, max 255), so which `COMP` the dump's `SIP5` is has **not** been established and the entry rests on the measurement. |
| `rotate` | **YES, since 5.6** — it was deferred for this run only | A turn produces a board `occupancyOf` cannot read — 5.3's cause, reached by the climb's own accepted gesture. **This is the expensive one:** orientation is the structural lever behind COST §3.1's 68–75%, and the search does not have it. |
| `add-wire` | **no** | The wire anchors only at a FREE hole (`--at 1,0` is refused: *"the wire could not be placed at that position (it is floating)"*), and this enumeration anchors at a PIN hole — the only hole it can identify as belonging to a net. And a fresh wire is `1x3` ALONG the row (`--at 10,10` yields `WIRE Wire1 AT 10,10 ENDS 10,10 10,12`), so under horizontal strips it joins one strip to itself. Making it useful is three gestures in one candidate, or a fork change letting `--op add-wire` name both ends. |
| `delete-wire` | **no** | No verb in the pinned fork deletes a placed component. Blocked on the fork, not on a task. |
| `cluster` | **no** | Task 18's. |

### 5.5 What this run does and does not establish

**It establishes that the search runs and moves `F`.** 78 evaluations, two
accepted moves, two cuts removed, `S3` reached, `history` one entry per
evaluation and `evaluationsToCross` satisfied by it. Before this run nothing in
the plan had evaluated a single real candidate.

**It does not establish a rate, and it is not an arm comparison.** One seed, one
board, one climb; and three of the four starts produced no run at all, so
`compareSeedArms` has nothing to compare — its own `RETIREMENT` note already
says a start count is not a rate, and this is that case live.

**It does not establish that the move set is adequate.** The opposite: a climb
with `move` and `stretch` alone converged after two accepted moves, and the one
lever COST calls structural (orientation) was absent. The next useful figure is
the same run with the occupancy carried forward instead of re-derived per dump —
already `seed-placement.ts`'s documented pattern, needing `enumerateMoves` to be
handed an occupancy rather than deriving one, which is a change to the signature
the plan declares.

### 5.6 RUN 2 — the occupancy carried, `rotate` restored

5.4's `rotate` deferral was the expensive one, and it was removable: the wall it
hit is the wall Task 16 had already hit and solved. `enumerateMoves` now takes a
CARRIED `Occupancy` instead of deriving one from each dump, advanced per applied
gesture by `occupancyAfter` — which is Task 16's own `appliedGestures`
underneath, transcribed from `Board::RotateComps` and held against the real
binary across 43 gestures and 11 placements with zero divergence. **There is no
second occupancy advance:** the enumeration proposes a move exactly when that
call returns an occupancy, and the climb advances with the same call.

Same board, same netlist, same rules, same seed, same script:

| start | outcome | rounds | evaluations | `acceptedPerRound` | `F0` → `F` | `A1` |
| --- | --- | --- | --- | --- | --- | --- |
| `constructed` | refused before the first candidate | — | — | — | — | — |
| `import` | refused before the first candidate | — | — | — | — | — |
| `random` | refused before the first candidate | — | — | — | — | — |
| `unpainted-import-board` | climbed, stopped on `S3` | 3 | **77** | **[2, 1, 0]** | 39 → **36** | **false** (`HC1`, `HC6`, `HC8`, `HC10`) |

`C = 36`, `W = 0`, `B = 0`; 307 fork invocations, 3.4 s. Against run 1's
`[1, 1, 0]` and `F = 37`: **three accepted moves instead of two, and three cuts
removed instead of two**, for one fewer evaluation. Reproduced on two
independent runs of the script.

**That is a small improvement and restoring orientation did not transform the
result.** It is worth saying why rather than filing it as disappointing: the
climb still converged after three accepted moves out of 77 evaluations, so what
limits it is not which single-part gestures are available. The two levers COST
calls structural for the cut count — clustering a net's parts onto one strip
(`E1`, Task 18) and spending strips — are both still absent, and COST says so
in advance: *"a strictly improving single-part climb is not merely at risk of
being trapped on this problem; the dominant lever is structurally invisible to
it."* This run is that sentence measured.

### 5.7 Why the three arms STILL refuse, and why carrying the occupancy could not help them

Both causes are about the board an arm HANDS OVER, not about what the climb does
afterwards, so neither moved:

- **`constructed` and `random`** hand over a board that **already** carries a
  turned part, because their own gestures turn parts before the climb sees
  anything. A climb reads its FIRST occupancy off the board it is given —
  `occupancyOf` is the only way to do that and there may only be one such read —
  and `occupancyOf` refuses a part facing `N` or `S`. Carrying the occupancy
  fixes every turn the climb itself takes and can do nothing about a turn that
  happened before it was called.
- **`import`** hands over a PAINTED board, because every arm's last gesture is
  `--author --op autofill` (`HC2` refuses an unresolved cut list), and `--move`
  refuses a relocation overlapping a part's own footprint once copper has been
  painted into the holes it would vacate (5.3).

**Both are Task 16 interface questions and neither is the climb's to fix.** The
shape of the fix is the same for both: `seedCandidate` hands back the occupancy
it tracked and the unpainted board beside the painted one — it already tracks
the occupancy internally, for exactly this reason, so nothing new has to be
derived. Until then the only start that can be climbed is the raw `--import`
board, which is not a `SeedArm`, and **Task 16's arm comparison has nothing to
compare**: `compareSeedArms`' own `RETIREMENT` note already says a start count
is not a rate, and this is that case live on three arms out of three.

### 5.8 The handover contract, and why 5.7's two causes were interface facts

§5.7 reported that all three arms refused before the first candidate and that
carrying the occupancy inside the climb could not help them, because both causes
are about the board an arm HANDS OVER. Both are now fixed at the handover, and
the fix is the one place it could have been.

**`seedCandidate` returns `SeedStart { board, occupancy }`.** The occupancy is
the one thing a dump cannot express — for a part facing `N` or `S`, `SPAN` is the
footprint's ROW count and its stretched length appears in no line (COST §7.3
item 2) — and every arm already TRACKED it while emitting gestures, for exactly
that reason. Handing it over costs nothing; recovering it afterwards is
impossible. `ClimbInput.occupancy` is required with no default, and
`tools/stripboard/climb.ts` now reads no geometry off a dump at all.

**The handed-over board is UNPAINTED.** The trailing `autofill()` is gone from
all three arms and deleted from `seed-arms.ts` outright. It was there so the
start could be SCORED — `HC2` refuses an unresolved cut list rather than
mis-scoring it, which is still correct — but it was satisfied in the wrong
place: `--move` refuses a relocation overlapping a part's own footprint once
copper has been painted into the holes it would vacate (§5.3), so a painted
handover made the first single-part move of any climb impossible.

**WHO PAINTS, AND WHEN.** `climb` paints on EVERY evaluation — apply, autofill,
check, dump — into its own `-filled.vrt`, so it needs the handover unpainted and
a painted one breaks it. A consumer that wants to score the START itself (an
`ArmRunner` reporting `ArmRun.startAdmissible`) paints a COPY and scores that,
leaving the handover alone. Nothing paints in place and nothing paints in the
arms. `SeedStart`'s own comment carries this, and
`tests/stripboard/seed-geometry.test.ts` holds both halves against the real
binary: the handover reports `CUT_STATE UNRESOLVED`, and a painted copy of it
reports `COMPUTED`.

**The import arm now emits no gesture at all**, since its start is `--import`'s
own placement with nothing done to it, so `drive` hands over a COPY of the
imported board. The copy does not go through the fork — it only puts the start
where the run directory wants it, so a failed run still leaves the imported
board untouched. The refusal this replaces claimed that "every arm ends with
`--author --op autofill`", which is now false by design.

### 5.9 RUN 3 — all three arms climb; on ONE SEED the control reaches the lowest `F`

With the handover contract of 5.8, every arm produces a candidate and every arm
climbs. Same board, netlist, rules, seed 0 and binary as runs 1 and 2.

| start | rounds | evaluations | accepted moves | `acceptedPerRound` | `F0` → `F` | `C` | `A1` | failing | invocations | wall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `constructed` | 29 | 2058 | **44** | `[4,3,2,2,2,2,2,2,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1,1,1,1,1,1,0]` | **21 → 17** | 17 | false | `HC1`, `HC5`, `HC6`, `HC8`, `HC9`, `HC10` | 8,293 | 91 s |
| `import` | 3 | 77 | 3 | `[2,1,0]` | 39 → 36 | 36 | false | `HC1`, `HC6`, `HC8`, `HC10` | 308 | 3.3 s |
| `random` | 53 | 5110 | **84** | `[7,6,5,3,2,3,2,1,2,1,2,…,1,0]` | **31 → 14** | 14 | false | `HC1`, `HC6`, `HC8`, `HC10` | 20,484 | 234 s |
| `raw-import-board` (not a `SeedArm`) | 3 | 77 | 3 | `[2,1,0]` | 39 → 36 | 36 | false | `HC1`, `HC6`, `HC8`, `HC10` | 308 | 3.6 s |

All four stopped on `S3` — a whole round accepting nothing — and none reached the
`20,000` evaluation cap, so `S5` did not fire on any of them.

**Against runs 1 and 2, which could only climb the raw board: 3 accepted moves
and `F = 36` then, 84 accepted moves and `F = 14` now.** The whole difference is
which board the climb could start from.

#### What this says, stated narrowly

- **On this one seed, the control reaches the lowest `F`.** `random` reaches
  `F = 14` against `constructed`'s 17 and `import`'s 36. The uniform draw is the
  null hypothesis Task 16 built to be beaten, and on THIS SEED it is not beaten.
  **That is not the comparison and may not be read as one:** `compareSeedArms`
  was not run, the mark was not evaluated, and one seed is not a rate. The
  standing ruling is that nothing may read a retirement against a non-rate, and
  this bullet is a non-rate.
- **`constructed` starts best and finishes worse.** `F0 = 21` against `random`'s
  31 and `import`'s 39 — the construction really does place a better board than
  either — and it then converges 3 higher. A better start that climbs to a worse
  layout is the shape of a start that has boxed its own parts in.
- **`import` and `raw-import-board` agree in every single field.** That is a
  free cross-check and it is worth keeping: the import arm now hands over a
  COPY of the imported board, so the two must agree, and they do.
- **4.00 to 4.03 fork invocations per evaluation**, across all four arms. That
  independently confirms the recorded cost model — apply, autofill, check,
  dump — against a figure nothing here was fitted to.

#### What this is NOT, and the rule it must not be read against

**This is not Task 16's arm comparison and nothing here may retire an arm.**
`compareSeedArms` was not run; the decision variable is the SUCCESS RATE over
the reviewed seed set against `B1-frozen`'s mark, and this is **one seed, one
board, one climb, with the mark not evaluated at all**. `RETIREMENT` says in its
own words that a start count is not a rate, and final `F` on one seed is its
tiebreak only for a run where no arm reaches the mark — which is a question
nobody has asked yet. The figures above are evidence for that comparison to be
run against, not a verdict standing in for it.

#### Two findings worth acting on

1. **`constructed` starts already failing `HC5` and `HC9`** — the lead-span
   constraints — where `import` and `random` do not. Its own `--stretch`
   gestures put spans outside the family's recorded range. The no-regression
   rule did not break them: they were broken before the climb began, and the
   climb was right to keep moving. But a span is a PHYSICAL REACH, so this is
   not something the search can repair — a start that is inadmissible on a
   constraint no gesture can fix is carrying a defect rather than a head start,
   which may be the whole explanation for why the best start converges to the
   worst-but-one layout. `seed-constructed.ts` consults
   `lib/kicad/lead-span.ts`'s bound through `appliedGestures`' geometry only,
   not through `HC5`/`HC9`'s, and that gap is where to look.
2. **Every arm still ends `A1` false on `HC1`, `HC6`, `HC8` and `HC10`**, and
   84 accepted moves did not change that. `C = 14` against a derived floor of 0
   with `κ` still far from the bench. Clustering (`E1`, Task 18) remains the
   lever nothing has tested.

---

## 6. Task 18's escapes — what `E1` cost, what the closure scan found, and the arm comparison

Task 18 added the three escapes: `E1` the net-cluster move, `E2` seeded
restarts, `E3` a bounded worse-acceptance that stays off until a bound is
configured. Three things belong in this register, and the first two are findings
rather than results.

### 6.1 `E1` as specified moves a net's parts TOGETHER, which is not the gesture its own justification describes

PIPELINE §7.4 defines `E1` as *"every on-board part with a pin on net X and one
delta, or one rotation, to all of them"*, and justifies it by saying *"moving
all three together to one strip removes a whole cut"*. **A common delta cannot
gather a net's parts onto one strip.** A translation preserves their relative
positions, so the strips the net's own holes sit on shift together and its
segment count across strips is unchanged — which means the clustered net's own
`J` contribution is unchanged by its own cluster move.

What the move DOES change is where the net's holes sit relative to **the other
nets' holes** on the strips they share. That is how `J` falls: two holes of one
net separated along a strip by a third net's hole are two segments, and
translating the first net's parts past the interrupter makes them one.
`tests/stripboard/escapes.test.ts` holds that on a four-part board where all six
enumerated single-part moves leave `J` at 3 and one cluster takes it to 1.

So the mechanism is real and the sentence that motivates it is loose. Two
gestures the spec's wording suggests are **not implemented, and that is recorded
here rather than quietly done**:

- the gathering move — several deltas, one per part — which is a different move
  with a different enumeration;
- §7.4's *"or one rotation"*, which the `Move` union carries no field for.

A third limit, from this repository rather than from the spec: the cluster's
deltas are the same four `UNIT_DELTAS` a single `move` uses, so a cluster
translates a net one hole per candidate and a gathering that needs two holes
takes two rounds, each intermediate step having to fit on its own. Whether a
wider neighbourhood pays is unmeasured, exactly as `UNIT_DELTAS` says of itself.

**The compound gesture's one choice is the order of the PARTS**: furthest along
the delta first, so a part vacates before its follower arrives. It is one
declared order and not a search over orders, and **a cluster that order cannot
sequence is not proposed — which is not a claim that no order could.** Nothing
has measured how often another order would have landed one this rejects.

### 6.2 The closure scan found two `readdirSync` calls, and neither can reach a scored evaluation

`tests/stripboard/escapes-search.test.ts` walks the TRANSITIVE import closure of
`search.ts`, `climb.ts` and `moves.ts` — 104 files — and scans every one of them
for `Date.now`, `performance.now`, `process.pid`, `readdirSync` and
`Math.random`. Two files name one:

| file | identifier | in | why it cannot reach an evaluation |
| --- | --- | --- | --- |
| `tools/bom/catalog.ts` | `readdirSync` | `loadCatalog(dir)` | reads the parts catalogue for the BOM comparison `--check` makes; the search calls neither |
| `tools/perfboard/declaration.ts` | `readdirSync` | `discoverDeclarations(root)` | walks for every board's `perfboard.json`, for the CLI verb that checks all of them; the search is handed one declaration path by its caller and reads it through `stockFor` |

**The edge that carries both into the closure is TYPE-ONLY.**
`tools/stripboard/check-report.ts` imports `type { CheckRun }` from
`tools/perfboard/check.ts`, which erases — so no runtime code of `check.ts`, or
of anything it imports, is loaded by an evaluation at all, and these two files
are two and three further hops beyond that. The import walker counts type-only
edges deliberately (`tests/stripboard/import-closure.ts` says why: a shared type
definition is a shared definition), which is what puts them in a closure nothing
can reach them through at runtime.

**The closure was NOT narrowed and the forbidden list was NOT shortened.** Both
files are named exemptions in the test, each with its reason, and a second test
asserts that each one still names its identifier and that the admitting import
is still spelled `import type` — so an exemption that stopped being true fails
rather than rots.

What this still does not prove, which is the same limit the test states: a scan
cannot see an aliased access (`const now = Date["now"]`), a clock reached
through a node builtin the walker skips by name, or a nondeterminism that is not
one of those five identifiers. The guarantee for determinism is Task 21's
comparison of two runs; this is the cheap early warning that names the file.

### 6.3 CHECKPOINT 3 — Task 16's arm comparison, run: **every arm's rate is 0 of 5**

The first run of `compareSeedArms` against the pinned fork, and the first figure
in this plan that is a RATE rather than a count. Fifteen searches — three arms by
the reviewed seed list `[0, 1, 2, 3, 4]` — each one `search()` with that single
seed, on the import-placed low-boost board, under the committed rules with
`evaluationCap` 20,000 and `worseAcceptance` null. 293,720 fork invocations,
59.9 minutes of search.

**How it was run.** A scratch script, not committed, in two phases so the
expensive one is resumable: `measure <arm> <seed>` runs one `search` and appends
its `ArmRun` to a JSONL file, skipping a pair already recorded; `compare` runs
`compareSeedArms` over a runner that REPLAYS that file and **refuses a pair the
file does not carry**, so the rates, the mark and the retirement verdict are the
harness's own and not the script's. The inputs are §5.1's, unchanged:

```
VR=.tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute
loadDeclaration("boards/pultec-low-boost/perfboard.json") -> exportNetlistFor()
"$VR" --import <netlist> --strips horizontal -o imported.vrt
deriveTargets(physicalBoard("low-boost"), rules.stockRows, "pultec-low-boost")
mark: FROZEN_MARK - B1-frozen's own clause, C <= 5, W = 0, every net complete
```

`B1-frozen`'s clause is *"starting from the import-placed board"*, so the frozen
fixture is the MARK here and not the start.

| arm | seed | `F` | `C` | `W` | `metMark` | `evaluationsToCross` | `startAdmissible` | `admissibleA1` | nets complete | evaluations | rounds | failing | s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `constructed` | 0 | **16** | 16 | 0 | false | never | false | false | false | 4157 | 37 | `HC1 HC5 HC6 HC8 HC9 HC10` | 226 |
| `constructed` | 1 | **16** | 16 | 0 | false | never | false | false | false | 4157 | 37 | `HC1 HC5 HC6 HC8 HC9 HC10` | 226 |
| `constructed` | 2 | **16** | 16 | 0 | false | never | false | false | false | 4568 | 40 | `HC1 HC5 HC6 HC8 HC9 HC10` | 247 |
| `constructed` | 3 | **16** | 16 | 0 | false | never | false | false | false | 5755 | 48 | `HC1 HC5 HC6 HC8 HC9 HC10` | 312 |
| `constructed` | 4 | **17** | 17 | 0 | false | never | false | false | false | 3537 | 31 | `HC1 HC5 HC6 HC8 HC9 HC10` | 190 |
| `import` | 0–4 | **36** | 36 | 0 | false | never | false | false | false | 83 | 3 | `HC1 HC6 HC8 HC10` | 4 |
| `random` | 0 | **14** | 13 | 0 | false | never | false | false | false | 8858 | 63 | `HC1 HC8 HC10` | 486 |
| `random` | 1 | **13** | 12 | 0 | false | never | false | false | false | 6072 | 41 | `HC1 HC8 HC10` | 334 |
| `random` | 2 | **14** | 14 | 0 | false | never | false | false | false | 10226 | 70 | `HC1 HC8 HC10` | 558 |
| `random` | 3 | **17** | 16 | 0 | false | never | false | false | false | 9391 | 64 | `HC1 HC8 HC10` | 509 |
| `random` | 4 | **15** | 14 | 0 | false | never | false | false | false | 10028 | 73 | `HC1 HC8 HC10` | 483 |

The `import` arm's five rows are identical in every field, which is not a
copy-paste: it has exactly ONE start and the seed changes nothing about it
(`seed-arms.ts` records that asymmetry and why it is kept), so its five restarts
repeat the same climb. `F = 13` on `random` seed 1 with `C = 12` and `W = 0`
means one SOLDER bridge: `F = C + 0.25W + 1B`.

**THE THREE RATES, which is the decision variable:**

```
separated: false
retireable: []
rates: constructed 0/5 import 0/5 random 0/5
```

**IT WAS MEASURED WITH THE GATHER UNIMPLEMENTED**, which §6.6 added afterwards
and which is the move `E1`'s own justification describes: so a rate of zero on
every arm is a fact about this move set and must not be read as a verdict on the
arms, because the lever COST calls dominant was absent from all three of them.
**§6.7 IS THE SAME COMPARISON RE-RUN WITH THE MOVE SET COMPLETE** - the rate is
zero again and the TIEBREAK INVERTS - and the numbers below are left exactly as
they were measured, because both runs are evidence and the difference between
them is itself the finding.

**What that rate is a rate over, exactly:** how many of the five reviewed seeds
produced a run meeting `B1-frozen`'s mark on ALL of its clauses, on the
import-placed `pultec-low-boost` board, with one climb per seed and a 20,000-
evaluation cap per run. **No run met it, so every arm's rate is zero** — the
nearest any came is `C = 12` against a bar of 5, with every net still incomplete.

**NOTHING IS RETIREABLE AND THE HARNESS SAYS SO ITSELF.** `RETIREMENT`'s own
last clause is the one that fires: *"If no arm meets the mark on any seed,
nothing is retired and the comparison says so: a run in which every arm scored
zero measured the budget, not the arms."* `retireable` is `[]` and `separated` is
`false`. No arm is deleted, no arm is selected, and `SeedInput.arm` stays a
required parameter with no default.

**THE TIEBREAK, which is the only thing this run DOES separate the arms on.**
`RETIREMENT` names final `F` per seed as the tiebreak for exactly this case, and
on it the CONTROL ARM WINS: `random` reaches a lower `F` than `constructed` on
four of the five seeds (14 vs 16, 13 vs 16, 14 vs 16, 15 vs 17) and loses one
(17 vs 16 on seed 3). `import` is last on every seed by more than twenty cuts.
**The uniform draw is the null hypothesis Task 16 built to be beaten, and over
the reviewed seed set it is not beaten.** That is a tiebreak inside a run where
nothing met the mark, not a rate, and it retires nothing by the declared rule —
but it is the second measurement in a row pointing the same way (§5.9 was the
first, on one seed).

**START ADMISSIBILITY, measured rather than quoted.** `startAdmissible` is
`false` on all fifteen runs, which is what Task 16 predicted from the
incomplete-net counts it quotes — 19, 13, 7 and 6 on mid, hi-boost, hi-cut and
low-cut. Every arm starts inadmissible, every arm ends inadmissible, and no run
in this comparison ever had `A1` hold at any point.

**`evaluationsToCross` is `never` on all fifteen**, because the crossing figure
is `F <= 5` and the best run reached 13. The two statistics beside the rate
therefore say the same thing the rate does.

**What stopped each run.** All fifteen stopped on `S3` — a round that accepted
nothing — and none reached the 20,000-evaluation cap, so `S5` did not fire and no
run is reported as a cap failure. The run-level cap was never the binding
constraint.

### 6.4 What `E1` actually did, which is less than its justification predicted

**Clusters fire, and only on the control arm.** Across the fifteen runs, 9,210
cluster candidates were evaluated and **four of them set a new best-so-far `F`** —
all four on `random` (seed 0: 22 → 21; seed 2: 21 → 20 and 20 → 19; seed 4:
23 → 22). On `constructed` and `import` the figure is zero in every run.

| arm | cluster candidates | `--move --delta` gestures | new-best-`F` steps | of those, clusters |
| --- | --- | --- | --- | --- |
| `constructed` (5 runs) | 2,712 | 10,232 | 22 | **0** |
| `import` (5 runs) | 15 | 45 | 15 | **0** |
| `random` (5 runs) | 6,483 | 23,445 | 47 | **4** |

The counting is explained where it is done: a cluster candidate is identified
from the run directory, because it is the only kind that writes staged
`r<r>-m<i>.vrt.cluster-<n>.vrt` files beside itself, and the `F` of each
candidate comes from the climb's own `history`. **What the table counts is
candidates that set a new best-so-far `F`, not acceptances**: the climb also
accepts a TIE in `F` with a strictly better ranking tuple, and a plateau
acceptance is invisible in an `F` history. So clusters may well have been
accepted more often than four times; what is measured is their effect on `F`.

**AND `F` DID NOT MOVE.** The clean comparison is against §5.9's single-part run
on seed 0, which used the same board, binary and rules and differed only in
having no cluster move. It was taken on the FIRST sweep of this comparison, whose
model still carried §6.5's stretch defect, so the only difference between the two
columns is `E1`:

| arm, seed 0 | §5.9, single-part only | with `E1` | evaluations |
| --- | --- | --- | --- |
| `import` | `F` 36 | `F` 36 | 77 → 83 (+8%) |
| `constructed` | `F` 17 | `F` 17 | 2,058 → 2,989 (+45%) |
| `random` | `F` 14 (`C` 14) | `F` 14 (`C` 13, one bridge) | 5,110 → 8,294 (+62%) |

**So `E1` cost between 8% and 62% more evaluations and improved the final `F` on
no arm.** On `random` it traded one cut for one solder bridge, which `F` prices
identically. A cluster did set a new best `F` on the way there, and the run
converged to the same number anyway.

**This does not show that clustering is not the lever COST says it is.** It shows
that THIS cluster move — one common delta, one hole at a time, over the four unit
deltas — is not reaching it on this board. §6.1 is the reason to look at next: a
common translation cannot change the clustered net's own segment count across
strips, and the gathering gesture the justification describes (several deltas, or
a rotation applied to the whole net) is a different move that nothing has built.
`κ` is still far from the bench and `C = 12` against a derived floor of 0.

### 6.5 The comparison found a real defect: a stretch bound read along the wrong axis

**The first sweep did not finish.** On `random` seed 3 the model proposed
`--stretch C18 --direction shrink` on a turned `CAP_FILM_WIDE` and the fork
refused — `--stretch: C18 cannot shrink` — which stopped the run after seven
rounds and left that seed with no run at all. `applyMove` is built to stop and
name the gesture for exactly this case: *"a refusal here means that model and the
binary disagree about what is placeable, which is the finding, not a candidate to
drop."*

**The cause, measured on the refusing board rather than reasoned about.** The
board is a scratch candidate from that run - round 6, move 5 - so it is not kept
here and is reproducible by re-running that seed under the pre-fix model; what it
said about C18 is `PART C18 CAP_FILM_WIDE .33uF AT 31,24 SPAN 3 DIRECTION N` with
its leads at `31,25` and `32,25`, and these are the two probes taken against it:

```
$ "$VR" --stretch <board> --ref C18 --direction grow -o grown.vrt     # exit 0
$ "$VR" --dump-board grown.vrt | grep C18
PART C18 CAP_FILM_WIDE .33uF AT 31,24 SPAN 3 DIRECTION N
PIN C18 1 AT 31,25
PIN C18 2 AT 33,25
$ "$VR" --stretch grown.vrt --ref C18 --direction shrink -o shrunk.vrt # exit 0
```

So for a part facing `N` the length that stretches is the LEAD DISTANCE ALONG THE
ROWS — it changed from 1 to 2 while `AT` and `SPAN` both stayed put — and `SPAN`
is the body's column count. `occupancyAfter` checked the family's bound against
`rect.cols` for every part regardless of its facing, while `stretchedRect` has
always moved the axis `across` names; on a turned part those are different axes,
so a part already at its minimum length read as having room.

**A square footprint hides it** — a 3x3 rect reads the same on both axes — which
is why it survived every fixture until a real board turned a 2x3 one. The fix
reads `rect.across ? rect.rows : rect.cols`, and
`tests/stripboard/moves.test.ts` holds it on a hand-built turned
`CAP_FILM_WIDE` at the recorded minimum, with its mirror lying along the strips
so the test fails under a fix that merely swapped the axes.

**The comparison was then re-measured from scratch under the fixed model**, which
is why §6.3's figures are not the first sweep's: the fix narrows the proposed move
set of any turned part, and a comparison across two different move sets is a
comparison between unlike runs. The `import` arm, which turns nothing, produced
byte-identical counters in both sweeps — `F` 36, 83 evaluations, 3 rounds — which
is the cross-check that the fix touched only what it was supposed to. Under the
fixed model `random` seed 3 completed, at `F = 17`.

Two more things the two sweeps together say, both of them about the fix rather
than about `E1`:

- **the constructed arm improved**, from `F = 17` on every seed to `F = 16` on
  four of five, and the random arm's seed-0 figure did not move at all;
- **no cluster gesture was ever refused by the binary**, in either sweep:
  33,722 `--move --delta` invocations in the second and 21,327 in the nine runs
  of the first whose directories can still be read, every one of them accepted.
  The cluster's own model and the fork did not disagree once.

### 6.6 CHECKPOINT 4 — the GATHER, which IS the lever: `F` 16 → 10 on the constructed arm

§6.4 measured that `E1`'s one-delta cluster changed `F` on no arm, and §6.1 said
why: a common translation cannot change the clustered net's own segment count
across strips, so **the move cannot change the quantity it exists to change**.
The controller's ruling of 2026-10-12 is that when a plan's mechanism cannot
achieve its own stated purpose, the purpose survives — so the gather §7.4's
justification describes was built: **each on-board part carrying a pin on net X
moved by ITS OWN delta, so that its pin on net X lands on one common strip.**
`tools/stripboard/moves-model.ts`'s `gather` arm and `./moves-cluster.ts` carry
the mechanism; this is what it did against the real binary.

**Seed 0, same board, binary and rules as §5.9 and §6.3**, so the three columns
differ only in the move set:

| arm, seed 0 | §5.9 single-part | §6.3 + one-delta cluster | **+ gather** | evaluations |
| --- | --- | --- | --- | --- |
| `import` | 36 | 36 | **36** | 83 → 83 |
| `constructed` | 17 | 16 | **10** | 4,157 → 4,150 |
| `random` | 14 | 14 | **11** | 8,858 → 9,698 |

**The constructed arm falls six cuts, from 16 to 10**, and it is the lowest `F`
anything in this plan has reached from a constructed start. The run is 32 rounds
and 4,150 evaluations — **fewer than the 4,157 the cluster-only run spent**, so
the six cuts cost no extra budget at all.

**And the gathers are the big steps, not incidental ones.** Of the 8 candidates
that set a new best-so-far `F` on that run, three were gathers:

```
single r0-m56  F 21 -> 20      single r1-m65  F 16 -> 15
single r0-m113 F 20 -> 19      gather r1-m133 F 15 -> 14
gather r0-m114 F 19 -> 16      gather r1-m138 F 14 -> 13
                               single r2-m63  F 13 -> 12
                               single r3-m136 F 12 -> 10
```

`gather r0-m114` takes `F` from 19 to 16 **in one candidate** — three cuts at
once, which is the shape §7.4's argument predicts and which no single-part move
in this pipeline has ever produced. Five of the eleven cuts that run removed came
from a gather.

**On the random arm the improvement is real and NOT attributable to a gather.**
`F` fell from 14 to 11, and of the 16 new-best-`F` candidates not one was a
gather (one was a cluster, 22 → 21, and the other fifteen were single-part
moves). 224 gathers were evaluated and none set a new best `F`. What changed the
outcome is the TRAJECTORY: a wider move set means a different sweep, different
plateau acceptances and a different walk, and the run ended three cuts lower. So
the honest reading is that the gather is what moved the constructed arm, and the
random arm's three cuts are a trajectory difference this measurement cannot
attribute to any one kind.

**On the import arm not one gather was proposed, and THIS PARAGRAPH SAID THAT
WAS "a property of the board rather than of the move". IT IS NOT. IT IS A
PROPERTY OF THE ENUMERATION, and the correction is left visible here rather than
rewritten away.** What is true: the enumeration AT THIS POINT proposed gathers
only onto strips the net ALREADY occupied, `--import` packs all seventeen parts
into rows 0–2 of a 35-row board, so every such destination was another part's
footprint and no sequence completed. What the paragraph then claimed — *"the
gather needs room, and the import arm's own start does not have any"* — is false:
**that board has 32 empty rows, and the enumeration never asked about one of
them.** Widening the candidates to every strip finds 192 gathers that fit on that
same board (§6.8). The narrow set was a deliberate cost choice and a defensible
one; recording its consequence as a fact about the board was not, and it is the
fifth comment of that class in four tasks. §6.3's `import` row is unchanged at 36
here for the same reason: nothing was added to its move set, because the
enumeration did not ask.

#### WHY it moves the constructed arm: the gather finishes the arrangement the construction could not place

This is the mechanism behind the headline figure, and it is measured on the
constructed arm's own start rather than argued. `assignStrips` gives every net a
strip of its own — on seed 0: `si_hi_cut_j12_p3`→0, `si_hi_cut_j4_p2`→1,
`si_hi_boost_j20_p3`→2, `in`→3, `hi_boost_out`→4, `lo_boost_in`→5, `out`→6,
`0`→7, then the junction's six pads on 8 to 13. **The placement then cannot
finish the job: on the start it produces, 8 of its 14 nets are SPREAD over two or
three strips**, and the assigned strip is among them in every case:

```
0[7,11 -> 7]  out[6,8 -> 6]  lo_boost_in[5,7,9 -> 5]  in[3,7 -> 3]
si_hi_boost_j20_p3[2,4 -> 2]  hi_boost_out[4,6 -> 4]
si_hi_cut_j12_p3[1,10 -> 0]  si_hi_cut_j4_p2[0,5,7 -> 1]
```

**A gather is exactly the gesture that pulls one of those nets back onto a single
strip** - which is the arrangement the construction intended, so the gather is
completing the constructed arm's own plan rather than finding a new one. Of the
208 gathers proposed on that start, 6 aim at the net's ASSIGNED strip; the rest
aim elsewhere, which is why the move pays even where it disagrees with the
assignment.

**And the control arm has no such plan to finish**, which is the reading
consistent with the firing counts: `random` places uniformly, so its nets are
spread by accident rather than by an intention one gesture can complete, and its
gathers fire three times against the constructed arm's twelve. That is an
explanation of the measurement rather than a second measurement: nothing has
tested it by, say, running the construction's assignment through a random
placement.

**AND IT CUTS BOTH WAYS, WHICH IS THE PART A READER MUST NOT SKIP.** If the
gather's value on this arm is that it finishes an arrangement the construction
intended, then what the figures show is **a placement shortfall in
`seedCandidate` that one move happens to repair** - not that constructing a start
is the better strategy. *"The construction is right and its placer cannot
finish"* fits every number in §6.6, §6.7 and §6.8 exactly as well as *"a
constructed start is better"*, and no run here separates them. §6.8's limits list
carries the same caveat beside the inversion it qualifies.

| arm, seed 0 | candidates | of them clusters | of them gathers | compound `--move --delta` gestures | new-best-`F` steps | of those, gathers |
| --- | --- | --- | --- | --- | --- | --- |
| `constructed` | 4,149 | 530 | 168 | 2,365 | 8 | **3** |
| `random` | 9,697 | 1,452 | 224 | 5,652 | 16 | 0 |
| `import` | 82 | 3 | 0 | 9 | 3 | 0 |

**No gather gesture was refused by the binary** on either run, which is the same
cross-check the cluster passed: the model's per-part deltas and the fork's
`--move --delta` agreed on all 8,017 compound gestures these two runs spent.

**What this does NOT establish**, written down because the figures are the most
flattering in this plan so far:

- **it is one seed on one board**, not a rate. §6.3's rate stands at 0 of 5 for
  every arm and nothing here changes it, because `C = 10` is still twice
  `B1-frozen`'s bar of 5 and every net is still incomplete (`HC1` fails on all
  three runs);
- **the arms are not re-compared.** §6.3 was measured with the gather
  unimplemented, and re-running it to chase a better number is exactly what the
  standing ruling beside `RETIREMENT` forbids;
- **`κ` is still far from the bench** and `A1` is still false on every run, on
  `HC1`, `HC8` and `HC10` at minimum;
- **the gather's own schedule is one declared order**, and a gather it cannot
  sequence is not proposed. Nothing has measured how often another order would
  have placed one it rejected.

### 6.7 CHECKPOINT 5 — the arm comparison RE-RUN with the gather: still 0 of 5, and **the tiebreak inverts**

§6.3's rate was measured with the gather absent from all three arms, so it is a
rate about a search missing its main move. This is the same comparison with the
move set complete: **same five reviewed seeds, same import-placed low-boost
board, same committed rules at `evaluationCap` 20,000, same `FROZEN_MARK`, same
replay-runner harness — the move set is the only thing that changed.** 15 runs,
281,935 fork invocations, 58.5 minutes of search.

**§6.3 IS NOT EDITED.** Both runs are evidence and the comparison between them is
itself the finding, so the pre-gather table stays where it is with its own
annotation and this is a separate section. **AND THIS ONE IS SUPERSEDED IN TURN
BY §6.8**, which is the same comparison once more with the gather's candidate
strips widened to the whole board - the narrowing this run still carried is what
made §6.6 record a false cause, and §6.8 is where the inversion is measured
against a lever that can see the empty rows.

| arm | seed | `F` | `C` | `W` | `metMark` | `evaluationsToCross` | `startAdmissible` | `admissibleA1` | nets complete | evaluations | rounds | failing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `constructed` | 0 | **10** | 10 | 0 | false | never | false | false | false | 4150 | 32 | `HC1 HC5 HC6 HC8 HC9 HC10` |
| `constructed` | 1 | **10** | 10 | 0 | false | never | false | false | false | 4150 | 32 | `HC1 HC5 HC6 HC8 HC9 HC10` |
| `constructed` | 2 | **10** | 10 | 0 | false | never | false | false | false | 4243 | 32 | `HC1 HC5 HC6 HC8 HC9 HC10` |
| `constructed` | 3 | **11** | 11 | 0 | false | never | false | false | false | 5767 | 45 | `HC1 HC5 HC6 HC8 HC9 HC10` |
| `constructed` | 4 | **13** | 13 | 0 | false | never | false | false | false | 3712 | 30 | `HC1 HC5 HC6 HC8 HC9 HC10` |
| `import` | 0–4 | **36** | 36 | 0 | false | never | false | false | false | 83 | 3 | `HC1 HC6 HC8 HC10` |
| `random` | 0 | **11** | 10 | 0 | false | never | false | false | false | 9698 | 63 | `HC1 HC8 HC10` |
| `random` | 1 | **12** | 12 | 0 | false | never | false | false | false | 6501 | 41 | `HC1 HC8 HC10` |
| `random` | 2 | **13** | 13 | 0 | false | never | false | false | false | 8087 | 52 | `HC1 HC8 HC10` |
| `random` | 3 | **15** | 13 | 0 | false | never | false | false | false | 8948 | 60 | `HC1 HC8 HC10` |
| `random` | 4 | **13** | 13 | 0 | false | never | false | false | false | 8349 | 57 | `HC1 HC6 HC8 HC10` |

**THE RATE IS UNCHANGED AND IT IS STILL ZERO:**

```
separated: false
retireable: []
rates: constructed 0/5 import 0/5 random 0/5
```

**What it is a rate over, exactly:** how many of the five reviewed seeds
`[0,1,2,3,4]` produced a run meeting `B1-frozen`'s mark on ALL of its clauses —
`C <= 5`, `W = 0`, every net complete — on the import-placed `pultec-low-boost`
board, one `search` per seed with one climb in it, under the committed rules at a
20,000-evaluation cap. **No run met it: the best is `C = 10` against a bar of 5,
and every net is still incomplete on all fifteen.** `evaluationsToCross` is
`never` on all fifteen, because the crossing figure is `F <= 5`. All fifteen
stopped on `S3`; none reached the cap. Nothing is retireable, by `RETIREMENT`'s
own last clause — a run in which every arm scored zero measured the budget, not
the arms.

#### THE TIEBREAK INVERTED, and the pre-gather conclusion was backwards

`RETIREMENT` names final `F` per seed as the tiebreak for exactly the case where
no arm reaches the mark. Side by side:

| seed | `constructed` pre → post | `random` pre → post | pre-gather winner | post-gather winner |
| --- | --- | --- | --- | --- |
| 0 | 16 → **10** | 14 → 11 | `random` | **`constructed`** |
| 1 | 16 → **10** | 13 → 12 | `random` | **`constructed`** |
| 2 | 16 → **10** | 14 → 13 | `random` | **`constructed`** |
| 3 | 16 → **11** | 17 → 15 | `constructed` | **`constructed`** |
| 4 | 17 → **13** | 15 → 13 | `random` | **tie at 13** |

**Pre-gather the control won four of five seeds; post-gather the constructed arm
wins four and ties the fifth, and loses none.** Mean final `F` goes from
`constructed` 16.2 / `random` 14.6 to `constructed` 10.8 / `random` 12.8. So the
pre-gather reading — *"the control wins twice running"* — is not merely
incomplete: **with the dominant lever implemented it is reversed.** §5.9's
one-seed observation and §6.3's five-seed tiebreak were both taken from a search
that did not have the move the construction's own advantage depends on.

**That still retires nothing and selects nothing.** The decision variable is the
RATE, it is zero on every arm, and a tiebreak inside a run where nothing met the
mark is evidence for a later comparison rather than a verdict. `random` remains
the control and cannot be retired by this experiment at all; `constructed` and
`import` are not retireable because neither rate exceeds the control's zero.
What has changed is which way the evidence points if a rate ever separates them.

#### Two of the constructed arm's seeds produce different boards and identical counters

`constructed` seeds 0 and 1 report the same `F`, the same round count, the same
evaluation count and the same invocation count in **both** sweeps. The starts are
not the same board: all five seeds produce DISTINCT start files, measured by
hashing them. What differs between seeds 0 and 1 is the perturbation
`assignStrips` applies - `seed` adjacent-block transpositions - and at seed 1 the
transposition swaps `j10_p1` and `j10_p2`, two ONE-PIN junction pads, between
strips 12 and 13.

So two boards that differ by two single-pin pads at the far end of the
arrangement climb to the same place at the same cost. It is recorded because the
identical rows look like a copy-paste error and are not, and because it is the
sharpest available illustration of `assignStrips`' own warning that *"this arm's
restarts explore very little"*.

#### `import` proposed ZERO gathers, on every seed — **and the cause stated here was wrong**

Measured, and the figure stands: across its five runs the enumeration emitted
`single=79 cluster=3` per run and **no gather at all**.

**THE CAUSE THIS SECTION GAVE DOES NOT.** It said the import arm *"is not
competing on the same terms as the other two"* and that this was *"a property of
where `--import` leaves the parts rather than of luck or of the seed"*. The first
half is true of this run and the second half is false: the parts are packed into
rows 0–2 of a **35-row** board, so there are 32 empty rows, and what denied the
arm the move was the CANDIDATE SET — gathers onto the strips a net already
occupied, which on that packing are all taken. The enumeration never asked about
rows 3 to 34. §6.8 is the same comparison with the candidates widened to every
strip, where this arm proposes gathers like any other.

**The honest residue of the paragraph:** on THIS run the import arm did not have
the dominant move and the other two did, so its row measures a search missing it
— which is a reason to read §6.8 rather than this section for what the arm can
do.

#### Where the gathers actually fired

| arm | gather candidates (5 runs) | new-best-`F` steps | of those, gathers | of those, clusters |
| --- | --- | --- | --- | --- |
| `constructed` | 767 | 34 | **12** | 0 |
| `import` | 0 | 15 | 0 | 0 |
| `random` | 1,054 | 56 | **3** | 4 |

The biggest single steps in the whole document are gathers on the constructed
arm: `gather r1-m147 F 15 -> 11` on seed 3 — **four cuts in one candidate** — and
`gather r0-m114 F 19 -> 16` on seeds 0 and 1. On `random` the gathers fire on
three of five seeds and carry one cut each; its improvement over §6.3 is mostly
trajectory, exactly as §6.6 said of seed 0.

**No compound gesture was refused by the binary** in any of the fifteen runs:
35,907 `--move --delta` invocations across the clusters and gathers — 11,802 on
`constructed`, 24,060 on `random`, 45 on `import` — every one accepted.

#### What this still does not establish

- **the mark is not met and nobody has argued it is reachable on this board**:
  `C = 10` against 5, `HC1` failing on all fifteen, `A1` false everywhere, `κ`
  still far from the bench;
- **one board, one budget, one climb per seed.** The rate is over the five
  reviewed seeds and nothing wider;
- **`constructed` starts inadmissible on `HC5` and `HC9`** — the lead-span
  constraints — on all five seeds, which §5.9 flagged as a defect no gesture can
  repair, and the gather has not changed that;
- **the two sweeps are not a controlled A/B on the gather alone for `random`**,
  whose trajectory differs for the reason §6.6 gives.

### 6.8 CHECKPOINT 6 — the comparison with the gather able to see the empty board: **still 0 of 5, and the inversion WIDENS**

§6.7's run was measured with the gather asking only about strips a net already
occupied, which on the import-placed board proposed zero gathers and let §6.6
record that as a property of the board. It is not: that board has 32 empty rows.
This is the same comparison with the candidates widened to **every strip**, the
whole net required to fit, and nets with fewer than two on-board parts excluded —
*same five reviewed seeds, same board, same committed rules at `evaluationCap`
20,000, same `FROZEN_MARK`, same harness; the candidate set is the only change.*
15 runs, **775,016 fork invocations, 161 minutes of search** — 2.7 times §6.7's
cost, which is what the widening is bought with.

**§6.3 and §6.7 are not edited.** Three runs, three move sets, one table each.

| arm | seed | `F` | `C` | `W` | `metMark` | `startAdmissible` | `admissibleA1` | nets complete | evaluations | rounds | failing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `constructed` | 0 | **8** | 8 | 0 | false | false | false | false | 13767 | 60 | `HC1 HC5 HC8 HC9 HC10` |
| `constructed` | 1 | **8** | 8 | 0 | false | false | false | false | 13969 | 60 | `HC1 HC5 HC8 HC9 HC10` |
| `constructed` | 2 | **8** | 8 | 0 | false | false | false | false | 15300 | 70 | `HC1 HC5 HC8 HC9 HC10` |
| `constructed` | 3 | **7** | 7 | 0 | false | false | false | false | 14084 | 56 | `HC1 HC5 HC8 HC9 HC10` |
| `constructed` | 4 | **7** | 7 | 0 | false | false | false | false | 11306 | 48 | `HC1 HC5 HC6 HC8 HC9 HC10` |
| `import` | 0–4 | **33** | 33 | 0 | false | false | false | false | 4086 | 21 | `HC1 HC6 HC8 HC10` |
| `random` | 0 | **12** | 12 | 0 | false | false | false | false | 15813 | 61 | `HC1 HC8 HC10` |
| `random` | 1 | **12** | 12 | 0 | false | false | false | false | 9423 | 41 | `HC1 HC8 HC10` |
| `random` | 2 | **12** | 12 | 0 | false | false | false | false | 15256 | 70 | `HC1 HC8 HC10` |
| `random` | 3 | **16** | 15 | 0 | false | false | false | false | 11238 | 63 | `HC1 HC8 HC10` |
| `random` | 4 | **14** | 14 | 0 | false | false | false | false | 12927 | 65 | `HC1 HC8 HC10` |

**THE RATE IS STILL ZERO:**

```
separated: false
retireable: []
rates: constructed 0/5 import 0/5 random 0/5
```

Same thing it is a rate over as §6.7: how many of the five reviewed seeds
produced a run meeting `B1-frozen`'s mark on ALL clauses — `C <= 5`, `W = 0`,
every net complete — on the import-placed `pultec-low-boost` board, one climb per
seed, 20,000-evaluation cap. **No run met it.** The best is now `C = 7` against a
bar of 5 — the closest anything in this plan has come — and `HC1` still fails on
all fifteen, so no run meets the completeness clause whatever its cut count.
`evaluationsToCross` is `never` everywhere. All fifteen stopped on `S3`, none
reached the cap, so `S5` did not fire and no run is a cap failure. Nothing is
retireable.

#### The inversion did not just hold: it widened

| seed | `constructed` §6.3 → §6.7 → §6.8 | `random` §6.3 → §6.7 → §6.8 | winner now |
| --- | --- | --- | --- |
| 0 | 16 → 10 → **8** | 14 → 11 → 12 | **`constructed`** by 4 |
| 1 | 16 → 10 → **8** | 13 → 12 → 12 | **`constructed`** by 4 |
| 2 | 16 → 10 → **8** | 14 → 13 → 12 | **`constructed`** by 4 |
| 3 | 16 → 11 → **7** | 17 → 15 → 16 | **`constructed`** by 9 |
| 4 | 17 → 13 → **7** | 15 → 13 → 14 | **`constructed`** by 7 |

**`constructed` wins all five seeds**, where §6.7 had it winning four and tying
one and §6.3 had it losing four. Mean final `F`: `constructed` 16.2 → 10.8 →
**7.6**; `random` 14.6 → 12.8 → **13.2**. **So the pre-gather conclusion was not
merely incomplete, and the widening strengthened rather than explained away the
reversal** — which is the outcome the review named as the one that would make it
a real result.

**AND THE CONTROL ARM GOT SLIGHTLY WORSE**, which is worth saying plainly because
it is the opposite direction from the lever's own effect: `random` goes 12.8 →
13.2 on the mean, worse on three seeds and better on two. A wider move set is a
different sweep and a different walk; it does not monotonically help. The gather
set a new best `F` three times across its five runs (and a cluster four times),
against the constructed arm's 38.

**It still retires nothing.** The decision variable is the rate, it is zero on
every arm, and `RETIREMENT`'s tiebreak is evidence for a later comparison rather
than a verdict. `random` is the control and cannot be retired by this experiment
at all.

#### `import` proposes 2,962 gathers per run now, and improves

**The number that was zero is 14,810 across its five runs** — 2,962 each — and
the arm's `F` moves for the first time in this document: **36 → 33**, in 21
rounds and 4,086 evaluations rather than 3 rounds and 83. One of its five
new-best-`F` steps is a gather (`gather r2-m41 F 36 -> 35`).

So the import arm DID have room, and §6.6's *"the gather needs room and the
import arm's own start does not have any"* was false twice over: the room was
there and the move could use it once the enumeration asked. What remains true is
that the arm is far behind the other two — 33 against 7 and 12 — which is now a
statement about `--import`'s first-fit placement rather than about what the
search could reach from it.

#### Where the gathers fired, and what the widening cost

| arm | candidates (5 runs) | of them gathers | of them clusters | compound `--move --delta` gestures | new-best-`F` steps | of those, gathers | of those, clusters |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `constructed` | 68,421 | 28,442 | 5,825 | 118,206 | 56 | **38** | 0 |
| `import` | 20,425 | 14,810 | 750 | 41,750 | 25 | **5** | 0 |
| `random` | 64,652 | 20,222 | 6,680 | 77,185 | 54 | 3 | 4 |

**68% of the constructed arm's new-best-`F` steps are gathers** (38 of 56), and
on seed 0 nine of its eleven steps are a single unbroken chain of them: `F` 19 →
18 → 16 → 15 → 14 → 12 → 11 → 10 → 9, with a one-hole move finishing 9 → 8. That
is the lever behaving the way `COST` says clustering should.

**The cost, measured rather than assumed.** Per round on the import-placed board:
280 candidate ATTEMPTS (8 nets with two or more on-board parts by 35 strips), of
which 192 fit and are evaluated; a candidate that does not fit costs no fork
invocation at all. The applicable move set per round went from 27 to 219 there.
Per run that is 4,086 evaluations against 83, and across the fifteen runs
775,016 invocations against §6.7's 281,935 — **2.7x the machine time for 2 to 6
cuts per arm.** 237,141 compound gestures were spent and **not one was refused by
the binary.**

#### What this still does not establish

**NO RUN IN ANY OF THE THREE SWEEPS PRODUCED A BUILDABLE BOARD.** Forty-five
runs, none admissible: `HC1` fails on every one, so every best board has at least
one net the fork reports incomplete, and a board whose circuit is not connected
is not a board anybody can build from. `C = 7` against a bar of 5 is a cut count
on an unfinished layout, and the two facts side by side invite being read as
"nearly done" when the one that matters to the owner - a board he can build - is
still at zero.

- **the mark is still unmet and the gap is still large**: `C = 7` against 5 with
  every net incomplete, `A1` false on all fifteen, `κ` not at the bench;
- **THE INVERSION HAS TWO READINGS AND THIS RUN CANNOT SEPARATE THEM.** §6.6's
  own measurement is that the gather repairs the constructed arm's OWN placement
  shortfall: `assignStrips` intends one net per strip and the placement leaves 8
  of 14 nets spread over two or three. So *"the construction's belief about a
  good layout is right and its placer cannot finish the job"* fits every number
  here exactly as well as *"a constructed start is better"* - and on the first
  reading the gather is a REPAIR for a defect in `seedCandidate` rather than a
  general advantage of constructing. What would separate them is not in this
  sweep: a start built to the same arrangement by a different placer, or the
  construction's assignment applied to a random placement. **A reader may not
  conclude from these figures that constructing a start is the better strategy**,
  only that this constructed start plus this gather reaches the lowest `F`
  measured;
- **the control arm getting worse is unexplained, and the hypothesis is named
  rather than measured.** `random`'s mean rose 12.8 → 13.2, worse on three seeds
  and better on two. The plausible mechanism is that a wider neighbourhood can
  hurt a greedy climb: more candidates per round means more ways to reach a worse
  local optimum FIRST, and `S3` then stops there. Nothing here tests it - the
  acceptance order, not just the move set, would have to be instrumented. And
  **0.4 of a cut over five seeds is not placed against what five seeds can
  resolve**: no spread is computed, no repeat at another seed set is run, and the
  figure is reported because the direction is worth knowing and not because it is
  distinguishable from noise;
- **`constructed` still starts inadmissible on `HC5` and `HC9`** on every seed,
  which no gesture repairs - and that is now its ONLY remaining structural
  failure besides `HC1`/`HC8`/`HC10`, since `HC6` holds on four of its five runs;
- **one board, one budget, one climb per seed**; the rate is over five seeds;
- **the candidate set is now "every strip", which is not obviously the right
  shape either.** It is the complete set rather than a measured optimum, and the
  per-round cost above is what a tighter rule would have to beat;
- **the gather's single-pass schedule is unproven in general** - the argument for
  it is in `./moves-cluster.ts` and a case it misses shows up as a gather not
  proposed.

### 6.9 CHECKPOINT 7 — the move set is complete: `add-wire` fires 7,417 counted times, is **never once accepted**, and the reason is the objective

The move set is complete for the first time: `occupancyOf` carries every wire's
holes, `add-wire` is a compound create-turn-stretch gesture, `delete-wire` is
refused with a measurement rather than a reading, and a candidate whose cuts
cannot be computed is rejected and counted instead of ending the run.
`DEFERRED_KINDS` holds one kind where it held three. Everything else is §6.8's
experiment unchanged — *same five reviewed seeds, same import-placed board, same
committed rules at `evaluationCap` 20,000, same `FROZEN_MARK`, same harness.*
15 runs, **763,545 fork invocations, 159 minutes of search.**

**§6.3, §6.7 and §6.8 are not edited.** Four runs, four move sets, one table
each.

| arm | seed | `F` | `C` | `W` | `metMark` | nets complete | evaluations | unscoreable | rounds | failing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `constructed` | 0 | **8** | 8 | **0** | false | false | 13238 | 0 | 60 | `HC1 HC5 HC8 HC9 HC10` |
| `constructed` | 1 | **8** | 8 | **0** | false | false | 13421 | 0 | 60 | `HC1 HC5 HC8 HC9 HC10` |
| `constructed` | 2 | **8** | 8 | **0** | false | false | 14595 | 0 | 70 | `HC1 HC5 HC8 HC9 HC10` |
| `constructed` | 3 | **7** | 7 | **0** | false | false | 13432 | 1 | 56 | `HC1 HC5 HC8 HC9 HC10` |
| `constructed` | 4 | **7** | 7 | **0** | false | false | 10648 | 0 | 48 | `HC1 HC5 HC6 HC8 HC9 HC10` |
| `import` | 0–4 | **33** | 33 | **0** | false | false | 4314 | 0 | 21 | `HC1 HC6 HC8 HC10` |
| `random` | 0 | REFUSED | — | — | — | — | — | — | — | see below |
| `random` | 1 | **12** | 12 | **0** | false | false | 9280 | 5 | 41 | `HC1 HC8 HC10` |
| `random` | 2 | **12** | 12 | **0** | false | false | 15218 | 0 | 70 | `HC1 HC8 HC10` |
| `random` | 3 | **16** | 15 | **0** | false | false | 11842 | 0 | 63 | `HC1 HC8 HC10` |
| `random` | 4 | **14** | 14 | **0** | false | false | 13641 | 3 | 65 | `HC1 HC8 HC10` |

**THE RATE IS STILL ZERO.** Over the five reviewed seeds `compareSeedArms`
REFUSES rather than reporting, because `random` seed 0 produced no run and a
runner that answered a missing pair with a default would decide the rates this
comparison measures. Over the four seeds every arm did produce a run:

```
crossing objective: F <= 5    decision variable: success-rate
arm constructed: reached 0/4 refused 0
arm import:      reached 0/4 refused 0
arm random:      reached 0/4 refused 0
separated: false    retireable: []
```

It is a rate over the same thing as §6.7 and §6.8: how many seeds produced a run
meeting `B1-frozen` on ALL clauses — `C <= 5`, `W = 0`, every net complete — on
the import-placed `pultec-low-boost` board, one climb per seed, 20,000-evaluation
cap. `evaluationsToCross` is `never` everywhere; all fourteen runs that completed
stopped on `S3` and none reached the cap (the fifteenth stopped on a refusal).

**`HC1` fails on all fifteen runs and nothing in any of the four sweeps has
produced a board anybody could build, and the best cut count reached is 7 against
the owner's hand-laid bar of 5** — one sentence, because apart they read as each
other's consolation.

#### `F`, `C` and `W` are identical, seed for seed, to the sweep WITHOUT the wire kinds

| arm | §6.8 `F` per seed | §6.9 `F` per seed |
| --- | --- | --- |
| `constructed` | 8, 8, 8, 7, 7 | **8, 8, 8, 7, 7** |
| `import` | 33, 33, 33, 33, 33 | **33, 33, 33, 33, 33** |
| `random` | 12, 12, 12, 16, 14 | (refused), **12, 12, 16, 14** |

`W = 0` in every best board of all fifteen, as in all forty-five before them, and
`F = C` exactly on every run but `random` 3 (where one `SOLDER` bridge the
autofill made accounts for the 16 against 15). **Lifting the deferral changed no
run's outcome at all** — and that is a finding about the cost model, not about the
implementation, because the kind demonstrably fires.

#### It fires: 7,417 counted wire candidates, none refused by the binary, none ever best

| arm | seed | candidates | of them `add-wire` | compound gestures | refused by the fork | `add-wire` steps that set a new best `F` |
| --- | --- | --- | --- | --- | --- | --- |
| `constructed` | 0 | 13,237 | 707 | 28,456 | 0 | **0** |
| `constructed` | 1 | 13,420 | 707 | 28,972 | 0 | **0** |
| `constructed` | 2 | 14,594 | 795 | 29,384 | 0 | **0** |
| `constructed` | 4 | 10,647 | 355 | 23,844 | 0 | **0** |
| `import` | 0–4 | 4,313 | 276 each | 9,061 | 0 | **0** |
| `random` | 2 | 15,217 | 1,533 | 29,358 | 0 | **0** |
| `random` | 3 | 11,841 | 1,940 | 25,292 | 0 | **0** |

Eleven of the fifteen runs: 7,417 `add-wire` candidates in total, not one of
which set a new best `F` in any run. The other three runs are the unclassifiable
ones below, and `random` seed 0 refused.

#### Why no wire is ever accepted, measured three ways

1. **At a stalled board a wire is pure cost.** `random` seed 1 ends at `F = 12,
   C = 12, W = 0, B = 0`. Scoring all 21 of its final round's wire candidates
   gives **`F = 12.25, C = 12, W = 1, B = 0` for every one** — identical in `N`,
   `P`, `S_occ`, `J` and `κ` too. A wire does not remove a cut: `C` is the fork's
   cut derivation and `S_occ` counts `PIN` holes, and a wire's ends are not pins,
   so a wire is invisible to `C = N + J − S_occ` and shows up only as its `ρ_w`.
2. **The one wire that was better lost its round.** In round 0 of the same run
   `r0-m109` scores `F = 19.25` against an incumbent at 20 — it displaced a
   `SOLDER` bridge, `B` 1 → 0. The round's best candidate scored **17**, and a
   greedy climb takes the round's best.
3. **A wire cannot be taken on credit, by design.** `worseAcceptanceRan` is
   `false` on all fifteen because `worseAcceptance` is `null`, which `PIPELINE E3`
   and `CRITERIA PAR3` require be reported rather than approximated. Only strict
   improvements are ever accepted, so a gesture whose payoff needs a SECOND step
   can never be the first one.

So `rhoWire`'s stated exchange — *"up to four wires to remove one cut"* — **is
not reachable through this move set as scored.** Nothing in it makes a wire
remove a cut within one accepted step, so the price is only ever paid.

#### Why `netsComplete` is false on all fourteen scoreable runs

The reading that the search *"structurally cannot complete a net"* is too strong:
a net can be completed by GATHERING its pins onto one strip, which needs no wire,
and the search does use that route. The measured account is narrower and worse.

**Nothing the search optimises counts completeness.** `F = C + ρ_w·W + ρ_s·B` has
no completeness term, and `./rank.ts`'s `RANKING` — cuts, then wire bridges, then
solder bridges, then `A_occ`, then pin-bounding-box wirelength — has none either,
by `OBJ2`'s own prohibition on a legibility term. `HC1` reaches acceptance only
through the no-regression clause, which forbids BREAKING a constraint that held;
`HC1` is already false on every arm's start, so it blocks nothing and rewards
nothing.

**What that costs, measured on `random` seed 3** (the one run whose best board is
still on disk), with the fork's own `--check --netlist`:

| board | nets incomplete | nets complete | cuts |
| --- | --- | --- | --- |
| its seeded start | **14 of 14** | 0 | 21 |
| its best board (`F = 16`) | **13 of 14** | 1 | 15 |
| the import-placed start | 13 of 14 | 1 | 38 |
| the owner's frozen fixture | **0** | 6 | 5 |

**63 rounds and 11,842 evaluations completed ONE net and removed six cuts.** That
is the search doing exactly what it was told: an unconnected board is a cheap
board, and `C` is what it is scored on.

**And the two gestures that finish a net the gather cannot are both unavailable
in practice.** A net spread over `k` strips needs `k − 1` joins, which is what
`J = C − N + S_occ` counts: `random` seed 1 ends with `N = 14`, `S_occ = 25`,
`J = 23` — twenty-three required joins and `W = 0`, `B = 0` made. Of the two ways
to make one, the wire is priced as pure cost and never accepted (above), and the
solder bridge **has no gesture at all** — `B` is only ever what `AutoFillVero`
happens to produce. The owner's own frozen board uses one.

**So the cause is the objective, not the geometry and not premature
convergence**, and the evidence separates them:

- **not premature convergence**: all fourteen completed runs stopped on `S3` — a
  round in which no candidate improved — and none reached the cap. With completeness unpriced and
  `E3` off, a larger budget stalls at the same kind of board;
- **geometry is not EXCLUDED, and this sweep cannot exclude it.** Nothing here
  shows a complete layout exists for this 14-net export on 35 strips. The frozen
  fixture is complete at 5 cuts, 1 solder bridge and no wires — but its dump
  reports 6 nets against the export's 14, so **it is not a feasibility proof for
  this netlist** and must not be read as one. What would settle it is a complete
  layout for THIS export, hand-laid or from another placer, or a lower bound on
  the joins it requires;
- **what would change the outcome is a change nobody here may make alone**:
  admissibility gating acceptance, or `J` or the incomplete-net count entering
  `F`, or a wire priced against what it completes. All three are objective
  changes, which belong to `COST` and `CRITERIA` and not to a search module.

#### Three runs the firing audit cannot classify, and what it does not touch

`constructed` 3, `random` 1 and `random` 4 produce a directory-versus-history
disagreement — 13,432 files against a history of 13,432, 9,284 against 9,280,
13,643 against 13,641 — and `cluster-firing.ts` refuses to align them rather than
guess which index is which. **The gap is exactly each run's unscoreable count**
(1, 5 and 3): an unscoreable candidate writes its board file and produces no
history entry. So what those three runs cannot contribute is the per-KIND
breakdown; their `F`, `C`, `W`, evaluations and rounds come from the run record
rather than from the directory and are unaffected.

#### `add-wire` reaches real shorts, and they are counted rather than fatal

Nine candidates across the fifteen runs could not be scored at all: a wire
bridging two strips on a packed board shorts two nets, `AutoFillVero` reports
`CUT_STATE UNRESOLVED` with `CUT_CONFLICT` lines, and `./score.ts` refuses the
board. `./climb.ts` rejects and counts the candidate instead of stopping the run.
**Before that change this sweep could not have run**: the first such candidate
ended the run.

#### One run refused, and the refusal's own diagnosis was wrong

`random` seed 0 stopped on `occupied-missing-pins: part junction_grounds (SIP5)
is placed but the dump has no PIN lines for it` — the guard that exists so an
undercounted `S_occ` can never flatter a layout, because `S_occ` enters
`C = N + J − S_occ` negatively. The message then asserted *"the dump came from an
unpinned or older veroroute fork"*, and **that diagnosis is false here**:

- the same pinned binary produced the sweep's other 763,545 invocations;
- a replay of the same arm, seed, board and code — the sweep's own `search` call
  with the same seeded PRNG — passed the refusal point (about 1,070 painted
  boards, 6,436 invocations) and reached 28,000 board files without refusing. A
  second isolated attempt passed it again, to about 8,900 evaluations, before it
  was stopped;
- **0 of 333** of that seed's round-0 candidates, re-autofilled and re-dumped,
  has a placed part with no `PIN` lines, and all 333 report `CUT_STATE COMPUTED`;
- the only thing the failing run had that the replays did not is a SECOND fork
  process: a scratch janitor dumping boards every 60 seconds against the same
  root. That is a correlation, not a mechanism.

So the refusal is a transient divergence in one dump, unexplained, and
`noPinLinesMessage` now names both causes and how to tell them apart — re-dump
the same board; an unpinned binary never prints `PIN` lines, an incomplete dump
comes back clean. **The guard itself is not softened**, and `random` seed 0 has no
figure in this sweep: it is one refusal, not a zero.

#### What this still does not establish

- **the wire finding is one board and one cut derivation.** `W = 0` and "a wire
  never removes a cut" are measured on the low-boost export with this netlist; a
  board whose nets are split where a cut cannot separate them could behave
  differently, and nothing here tests one;
- **the evaluation counts moved in both directions** (`constructed` 0:
  13,767 → 13,238; `import`: 4,086 → 4,314) although the move set only grew. Each
  run's trajectory differs once the candidate list differs, so per-round totals
  are not comparable between sweeps; what is comparable — and identical — is the
  final `F`, `C` and `W`;
- **`delete-wire` is still refused**, so a board that acquires a wire can never
  shed one. The refusal is measured (`./moves-model.ts`) and is a limit of the
  fork's verb set;
- **`E3` remains unconfigured**, so the one mechanism that would let a wire be
  taken on credit has still never run in this repository;
- **the completeness account is measured on one run's best board.** The ranking
  and objective argument holds for all fifteen by construction, but the
  nets-incomplete counts above are `random` seed 3's; the other best boards were
  deleted with their run directories to bound scratch disk.
