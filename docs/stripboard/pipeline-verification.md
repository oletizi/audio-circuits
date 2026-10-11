# What the stripboard pipeline's verification does and does not cover

This page is the register of what the pipeline's checks prove, and — more
useful — what a pass of each one leaves uncovered. It is opened here by the
first task with a finding to put in it, and is extended as later tasks measure
more; it is not a document written at the end, because a document written last
is one whose early findings were held in somebody's head until then.

At this point it covers two things. `HC8`: its trust boundary, its nine
geometry refusals, the one refusal that belongs to a different module than the
one `HC8`'s contract names, and the verdict built on the
graph — the open, the short, and the three refusals the reference side
contributes. And the two dump lines Task 7 added to the fork, `BOUNDS` and
`DIRECTION`, which are not adopted here yet and whose meaning is narrower than
either name suggests.
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

Three things follow, and each is a thing a later task would otherwise assume:

- `BOUNDS` and the hole extent are **different quantities**, and the difference
  is real rather than theoretical: on `transistor-preamp-staged` `BOUNDS` reaches
  five columns further right than any hole, and one row further up. Substituting
  one for the other silently redefines whatever reads it.
- `BOUNDS` is nonetheless the **only** dump-readable source of a part's extent
  across the strips. A `PART` line carries a column span and no row span, so a
  multi-row footprint's row extent appears nowhere else.
- They can also coincide exactly, as on `pultec-low-boost`. A test that compared
  the two on one board and found them equal would therefore conclude the wrong
  thing about both.

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
