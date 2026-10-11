# What the stripboard pipeline's verification does and does not cover

This page is the register of what the pipeline's checks prove, and — more
useful — what a pass of each one leaves uncovered. It is opened here by the
first task with a finding to put in it, and is extended as later tasks measure
more; it is not a document written at the end, because a document written last
is one whose early findings were held in somebody's head until then.

At this point it covers four things. `HC8`: its trust boundary, its nine
geometry refusals, the one refusal that belongs to a different module than the
one `HC8`'s contract names, and the verdict built on the
graph — the open, the short, and the three refusals the reference side
contributes. The two dump lines Task 7 added to the fork, `BOUNDS` and
`DIRECTION`, whose meaning is narrower than either name suggests, and which
**are** now adopted here (§2.7 — §2's opening sentence about that was stale when
it was written, and §2.7 says why). `HC10`'s placement clause, which the owner
decided on 2026-10-11 after the task brief's wording was measured to refuse
every hand-laid board in the repository (§3). And CHECKPOINT 1, the ten hard
constraints run over two boards a person built (§4).
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
