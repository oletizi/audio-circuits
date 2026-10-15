# What the stripboard pipeline's verification does and does not cover

This page is the register of what the pipeline's checks prove, and — more
useful — what a pass of each one leaves uncovered. It is opened here by the
first task with a finding to put in it, and is extended as later tasks measure
more; it is not a document written at the end, because a document written last
is one whose early findings were held in somebody's head until then.

At this point it covers seven things, and **this sentence said "four" while the
page already had five sections** — a stale count in the one paragraph a reader
starts from, corrected here rather than left to be rediscovered, and corrected
again when §7 arrived. `HC8`: its
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
seeds (§6). **This enumeration stopped at CHECKPOINT 6 while §6 already had two
more**, which is the same staleness the paragraph above complains of, one level
down: CHECKPOINT 7 is the complete move set, where `add-wire` fires 7,417 counted
times and is never once accepted and the cause is found to be the objective
(§6.9), and CHECKPOINT 8 is what happened when completeness entered the
acceptance rule because of it (§6.10). And `V5` and `V9` (§7): whether a
reported statistic can tell a good placement from a bad one — measured on three
good-versus-bad pairs rather than on the brief's across-board spread, which is
the placer's own fingerprint — every numeric literal the pipeline's sources
carry, named one by one, and **§7.4, the register of every check on this page
whose guarantee is weaker than its subject**, which is the honest counterpart of
the `V` table and the thing to read first.
**The count above said "seven things" while the page had ten sections and then
eleven, which is the third time this paragraph has gone stale**, so the two that
arrived after it are named rather than counted: the SPACING gesture measured
against the fork, where 227 of 315 candidates strictly reduce `C` (§11), and the
same gesture measured in a real climb, where it is accepted fifteen times, takes
the board from 34 cuts to 28 and from 10 open nets to 7, and **leaves `HC1`
failing** (§12). §12 then grew three subsections of its own when Task 8 closed
the wire-generator gate §12.4 found: the generator can see an off-board pad now,
it offered one wire in 20,000 evaluations, the fork refused that one, and the
reported board is **byte-identical** to the one before the fix (§12.9–§12.11).
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
file's text.** `lib/import-closure.ts` walks the transitive graph
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

**The owner decided this clause on 2026-10-11 and AMENDED it on 2026-10-13. The
rule below is the amended one and is now criteria.** His words on the mounting:
*"dips should span strips with a cut down the middle, like a breadboard."* His
words approving the amendment, after being shown §3.4b's measurement and the
proposed rule, verbatim and complete: *"follow your recommendation on HC10."*
The rule:

> **No two pins belonging to the same footprint row may share a PIECE OF COPPER
> — the copper as it is after cuts — unless the netlist puts them on the same
> net.**

**Owner-settled:** a row whose pins share a piece of copper is unbuildable only
when nothing separates pins that must not be joined.

**Agent rationale** (agent-written; he approved the rule, not this wording): a
row lying ALONG a strip is the *candidate* for the fault and not the fault
itself. On an uncut strip it joins every pin of that row, which is a short if
those pins are on different nets; with a cut between them it joins nothing, and
that is the same construction his DIP ruling describes — the DIP's two rows
share each strip pairwise and the centre cut divides them. So the predicate is
*same copper component after cuts, AND different reference nets*. Two pins of one
part on one strip that are on the same net need no cut and pass. The DIP's centre
cut is still `HC1`'s and `HC8`'s business: it divides pins of two DIFFERENT rows,
which are grouped separately, so that pair never meets in one group here. A
one-pin row cannot violate the rule, because a row of one pin cannot be shorted
to itself.

**What was superseded, named rather than left for a reader to infer:** the
2026-10-11 rule was *"no two pins belonging to the same footprint row may share a
strip"*, justified by *"a row lying along a strip puts every pin of that row on
one piece of copper"*. It read the geometry and never the cut state, and §3.4b is
the measurement that retired it.

### 3.4a The word *parallel* in `HC10`'s headline, and which reading the code implements

CRITERIA's criterion sentence is *"every placed part's pins lie on straight lines
parallel to the strips"*, and read literally that is in tension with the
implementation, where a row lying along a strip is the failure CANDIDATE rather
than the requirement. Stated plainly rather than left for the next reader to
guess at:

- **The headline sentence is the FOOTPRINT half, and it is about
  decomposability.** The straight lines are the footprint's own rows, and
  *parallel to the strips* says the pin field is a rectangular grid aligned with
  the board — so a circle, an arc or any pattern that does not decompose into
  rows is refused **by name**, before any placement exists to grade. That is what
  CRITERIA's own "Checked by" column describes, and it is the clause carrying the
  owner's cost judgement: *"nearly every such hole becomes a cut."*
- **The PLACEMENT half is about MOUNTING, and the headline does not settle it.**
  Once a footprint's rows exist, how they sit on the board is a separate
  question, and the owner answered it the other way round from the literal
  reading: the mounting he names puts a row ACROSS the strips. The literal
  reading was measured against the boards and refused 13 of 16, 27 of 34 and 10
  of 12 placed parts on layouts that pass `make check` — §3.2.
- **So the code implements: footprint rows must DECOMPOSE and be grid-aligned
  (the headline, footprint-level), and a row that shares a piece of copper may do
  so only among pins of one net (the placement half, as amended 2026-10-13).**
  Neither half asserts that a row lies along a strip, and neither forbids it.
- **The criterion sentence is NOT rewritten here**, because it is the owner's
  provenance line and an agent may not restate his criterion in its own words.
  CRITERIA's `HC10` row now carries this distinction and points at this section.

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

So `hc10Rows` in `tools/stripboard/constraints-pattern.ts` groups the recorded
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

**THE `make check` COLUMN ABOVE WAS MEASURED BEFORE TASK 25 AND TWO OF ITS ROWS
HAVE SINCE MOVED.** `make check` now grades `HC5`, `HC8`, `HC9` and `HC10`
itself (CRITERIA `G4`), and on that gate `pt2399-core` and
`transistor-preamp-staged` **fail**. Three things are worth separating, because
the easy misreading is that `HC10` turned them red:

- **Neither fails on `HC10`, and neither is re-measured here.** Both refuse on
  §3.5a's `PAR2` refusal — a footprint whose lead span nobody has sourced — and
  that refusal fires in `HC5` before `HC10` is reached, so the full grade
  produces NO `HC10` verdict for either board. The violation counts in the table
  stand as §3.4's own direct measurement over `hc10Rows` and are neither
  confirmed nor contradicted by the `make check` run.
- **The two boards that now pass `make check` outright are
  `transistor-preamp-feedback` and `transistor-preamp-buffered`**, and `HC10`
  holds on both — which is the positive half of the discrimination claim, read
  off the gate rather than off a measurement script.
- **One new violation was measured: `transistor-preamp-loop`'s `C1`**, a
  `CP_Radial_D8.0mm_P3.50mm` at `1,31` and `1,33` with both leads on strip 1 —
  the same shape as `transistor-preamp-lab`'s `C3`, on a board that was already
  failing for other reasons.

**THE VIOLATION COUNTS IN THE TABLE ABOVE ARE AGAINST THE SUPERSEDED RULE.**
They were measured over the geometry-only reading, which §3.4b retired on
2026-10-13, and they are kept because they are the evidence the decision was made
against. Under the amended rule the count on `transistor-preamp-loop` is **0 of
25** rows that share a strip, and the five on `transistor-preamp-lab` are
reported as **no verdict** rather than as violations — see §3.4b for both.

### 3.4b The question §3.4 carried is settled: a cut between the pins is the normal pattern

**The open question was** *"whether a two-lead row along a strip should refuse
when a cut separates its holes"*, and the two electrolytics above were its live
instances. It was put to the owner with the measurement below.

**Owner's words (verbatim and complete), 2026-10-13:** *"follow your
recommendation on HC10."*

**Owner-settled:** a row whose pins share a piece of copper is unbuildable only
when nothing separates pins that must not be joined. **The same principle in his
own earlier words (verbatim):** *"dips should span strips with a cut down the
middle, like a breadboard."*

**What was measured, with the pinned fork, before the rule was changed:**

| board | part | pins | reference nets | `CUT_STATE` | what the dump says | old verdict | amended verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `transistor-preamp-loop` | `C1` (`CP_Radial_D8.0mm_P3.50mm`) | `1,31`, `1,33` | `EMITTER`, `BYPASS_CAP` | `COMPUTED` | `CUT 1,31,10 1,32,11` — **between the two pins** | refused | **holds**, and the held detail quotes the cut |
| `transistor-preamp-lab` | `C3` (`CP_Radial_D5.0mm_P2.00mm`) | `10,8`, `10,9` | `COLLECTOR`, `OUT` | `UNRESOLVED` | no cut list at all; `CUT_CONFLICT 10,9,18` names that location, so a cut IS required there | refused | **no verdict**, naming `CUT_STATE` and `HC2` |

The refusal's own remedy — *"turn the part so its rows cross the strips; the
remedy is in the layout, not in the data"* — was wrong in both cases, because the
layout was already right.

**Agent rationale** (agent-written; he approved the rule, not this wording):

- **The predicate.** Pins of one footprint row on the **same copper component
  after cuts** that belong to **different reference nets**. The partition is
  `copperGraph`'s — `HC8`'s reconstruction, which also accounts for solder
  bridges and wires — so there is no second spelling of "the same copper" in the
  repository. The nets come from the reference netlist, never from a `NODE` line.
  `tools/stripboard/row-copper.ts` holds the reading; `hc10` holds the verdict.
- **Same net needs no cut and passes.** Measured across the whole tree: on
  `transistor-preamp-loop` all **25** rows that share a strip are divided by the
  board's own cuts, and all 25 carry two or more nets; `transistor-preamp-buffered`
  and `transistor-preamp-feedback` have **none**. So the amended rule is not
  vacuous on real data in the other direction either — every live instance of
  shared copper on a passing board is one a cut divides.
- **`CUT_STATE UNRESOLVED` means NO VERDICT, and it is said in those words.**
  Both tempting readings are refused explicitly in the detail string: *no cuts,
  so refuse* condemns `transistor-preamp-lab`'s five such rows, which may be
  perfectly correct, and *assume a cut, so pass* is a check that cannot fail.
  `held` is false, the wording says nothing was computed, and `HC2` owns the
  cause and the remedy — the identical posture `hc8` already takes for the
  identical cause (§1.4). It is a `broken` and **not** a throw, because an
  unresolved cut list is a fact about the board rather than missing data.
- **The cut state is read BEFORE the nets**, so the no-verdict path does not
  depend on a reference netlist lookup. Both the partition and the net index are
  built on first use and not before: a board whose every footprint row crosses the
  strips asks neither question.
- **The refusal IS a short, and `HC8` reports the same board.** One component
  carrying two nets is exactly `HC8`'s short, so no fixture can trip the
  placement half and leave `HC8` held — asserted in
  `tests/perfboard/check-buildability.test.ts` rather than left to be discovered.
  What `HC10` adds is the diagnosis: one part, one row, one strip, and the cut
  that would fix it.
- **The footprint half is untouched.** Its substance is the cut-COST judgement,
  which no cut state can answer; a circle or arc still refuses by name.

**The fixtures moved with the rule.** `rows-along-a-strip` — a DIP-16 row along
one uncut strip with every pin of it on ONE net — is now
`row-along-a-strip-one-net` and is the amendment's **positive control**, because
the amended rule admits it. The negative is `row-along-a-strip-two-nets`: the same
geometry with that row's pins split across two nets and nothing dividing them.
The live boards are asserted from the real dump in
`tests/stripboard/hc10-cut-state.test.ts`, which spawns the binary rather than
copying its lines into a fixture that could drift from the board.

**`make check`'s tally did not move: 2 `ok` / 9 `FAIL`, and no board changed
state.** `transistor-preamp-loop` still fails, on `HC8`'s 15 opens rather than on
`HC10`; `transistor-preamp-lab` still fails, on `HC8`'s unresolved cuts and now
on `HC10`'s no-verdict for the same cause.

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

1. **`HC9` caught six resistors on `transistor-preamp-staged`** at spans of 2–4
   holes against `R_Axial_DIN0207`'s then-recorded `minSpanHoles` of 5 (`R1`,
   `R3`, `R5`, `R6`, `R7`, `R9`), and `HC5` caught `C8` at 14 holes against a
   `maxSpanHoles` of 11. Each of those spans is measured **across** the strips —
   a two-hole span is an axial part standing on end with one lead bent back — and
   the recorded geometry was `mounting: "axial-horizontal"`, which did not cover
   vertical mounting of an axial part. So this was either a different part than
   the recorded Vishay MBB0207, a recorded minimum that did not apply to the
   mounting used, or six strained joints. It was taken to the owner rather than
   fixed by widening a bound.

   **RESOLVED 2026-10-13, AND IT WAS THE SECOND READING.** The owner: *"It's
   standard practice to stand resistors on end when their holes are next to each
   other. That's should NOT be a failure condition"*. `minReachPitchMm` now
   derives an axial family's floor from both of its mountings and takes the
   looser, so the DIN0207's floor is the grid's 2 holes (`docs/stripboard/lead-span.md`
   §4.1a). The six `HC9` failures are gone and so is the only other one in the
   repository, `R2` on the owner's own hand-laid low-boost. **`C8`'s `HC5`
   failure is unchanged**, which is the measurement that says the fix touched
   the floor and not the ceiling: `C8` is a radial electrolytic, which was
   already standing.
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
`HC10`'s placement half forbids, at a 3-hole span below the resistor's
then-recorded minimum of 5 (§4.3 records why that figure has since moved to 2).
So `HC8`'s fixture was also failing `HC9` and `HC10`, and **a
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

**That guard fired on 2026-10-13, which is the measurement that it has teeth.**
When the DIN0207's `minSpanHoles` moved to the tool's own floor (§4.3), the
`span-below-minimum` fixture's derived span fell to 1 hole — below the tool's
range, so it would have offended `HC4` instead and `HC9` would have had no
fixture at all. The constructor refused by name. The fixture now names the WIMA
FKP2, the one remaining recorded two-lead family whose floor is strictly above
the tool's, for the same reason `span-above-reach` names a film capacitor rather
than the resistor.

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
edges deliberately (`lib/import-closure.ts` says why: a shared type
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

### 6.10 CHECKPOINT 8 — completeness enters the acceptance rule: **five nets close for two cuts, and no board is finished**

**What changed in the search, and it is all that changed.** The acceptance rule's
ordering gained a FIRST KEY: the number of nets `--check` reports as
`incomplete`, compared before `F`. Fewer open nets is accepted whatever `F` does,
more open nets is rejected whatever `F` does, and a tie falls through to the
unchanged `ΔF`-then-ranking rule. `E3`'s bound is guarded the same way the
no-regression clause is, so a configured bound could buy a worse `F` and never an
open net. `rhoSolder` moved from 1 to 0.25 in the same commit, on the owner's
instruction that a solder blob is built as a wire. Both are recorded as
deviations in `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md`; neither
spec is edited, and ratifying either is the owner's.

**Why: §6.9's finding, which named this change.** Nothing the search optimised
mentioned completeness, so sixty-three rounds of removing cuts closed one net of
fourteen. §6.9 listed three changes that would alter the outcome and said *"what
would change the outcome is a change nobody here may make alone"*. The owner made
one of them, in the form he chose: *"1 then 3"* — change the scoring first, and
add a second pass only if that is not enough.

**Everything the search sees is §6.9's experiment unchanged** — *same reviewed
seeds, same import-placed `pultec-low-boost` board, same committed rules at
`evaluationCap` 20,000, same `FROZEN_MARK`, one `search()` per pair.*
**§6.3, §6.7, §6.8 and §6.9 are not edited.**

**`F` IS NOT COMPARABLE WITH §6.9 AND `C`, `W`, `B` AND THE OPEN-NET COUNT ARE.**
`rhoSolder` changed in the same commit, so a board carrying a `SOLDER` line scores
differently for a reason that has nothing to do with the search. Every comparison
below is made on **cuts and open nets**; `F` is carried rather than compared, and
the isolation run below is what separates the two changes.

| arm | seed | `F` | `C` | `W` | `B` | **nets open** | nets closed | evaluations | rounds | accepted | unscoreable | §6.9's `C` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `constructed` | 0 | 10 | **10** | 0 | 0 | **9 of 14** | **5** | 15,006 | 63 | 136 | 1 | 8 |
| `constructed` | 1 | 10 | **10** | 0 | 0 | **9 of 14** | **5** | 15,659 | 65 | 140 | 19 | 8 |
| `constructed` | 2 | 11.5 | **11** | 0 | 2 | **9 of 14** | **5** | 17,669 | 72 | 136 | 6 | 8 |
| `constructed` | 3 | 12 | **12** | 0 | 0 | **9 of 14** | **5** | 17,063 | 65 | 121 | 7 | 7 |
| `constructed` | 4 | 11 | **11** | 0 | 0 | **9 of 14** | **4** | 10,378 | 41 | 79 | 19 | 7 |
| `import` | 0 | 35 | **34** | 0 | 4 | **10 of 14** | **3** | 4,592 | 24 | 45 | 36 | 33 |
| `import` | 1 | 35 | **34** | 0 | 4 | **10 of 14** | **3** | 4,592 | 24 | 45 | 36 | 33 |
| `random` | 0 | 14 | **13** | 0 | 4 | **9 of 14** | **5** | 13,939 | 48 | 112 | 0 | refused; 12 in §6.8 |
| `random` | 3 | 17.25 | **16** | 0 | 5 | **10 of 14** | **4** | 16,793 | 78 | 163 | 0 | 15 |

`nets closed` is each run's own start against its own best board, and the start
counts are not uniform: `constructed` seeds 0 to 3 and `random` start at **14 of
14 open**, while `import` and `constructed` seed 4 start at **13 of 14**. Those
are the figures §6.9 records for the same starts. The `import` arm's two seeds
are identical in every column because it has one start and the seed changes
nothing about it, which is `seed-arms.ts`'s recorded asymmetry rather than a
copy-paste.

**NINE OR TEN OF FOURTEEN, on nine runs from seven different starts** — nine on
all five `constructed` seeds and on `random` 0, ten on `random` 3 and on both
`import` runs — across cut counts from 10 to 34, evaluation counts from 4,592 to
17,669 and round counts from 24 to 78. That the number lands in a two-wide band
is an observation and nothing more here: **this sweep does not establish why
nine**, and the consistency is not evidence that nine is a property of the
circuit rather than of this move set and this ordering.

**Every best board was re-checked outside the harness.** `--check --netlist` and
`--dump-board` run by hand on each kept board report the same open-net count, the
same `B` and the same `C` as the record: nine pairs, nine agreements, no
exceptions. The open-net figures above are the fork's, not the harness's
arithmetic.

#### What the key bought, and what it cost

**Four or five nets of fourteen, for one to five cuts.** The `constructed` arm
closed five on every seed but the fourth, where it closed four from a start that
had thirteen open rather than fourteen, and paid 10, 10, 11, 12 and 11 cuts
against §6.9's 8, 8, 8, 7 and 7. `random` 0 closed five at 13 cuts against
§6.8's 12 for the same arm and seed, `random` 3 closed four at 16 against §6.9's
15, and `import` closed three at 34 against 33. Set beside §6.9's measured
board — *"63 rounds and 11,842 evaluations completed ONE net and removed six
cuts"* — the direction has changed.

**THE PAIRED COMPARISON, which is the one figure both sweeps measured on the same
arm at the same seed.** §6.9 reported the per-net counts for exactly one run,
*"the one run whose best board is still on disk"* — `random` seed 3 — so that
pair is where the before and after are both from a measurement rather than from
an inference:

| `random`, seed 3 | §6.9: no completeness in the ordering | §6.10: it is the first key |
| --- | --- | --- |
| its seeded start | 14 of 14 nets open, 21 cuts | 14 of 14 nets open, 21 cuts |
| its best board | **13 of 14 open**, 15 cuts | **10 of 14 open**, 16 cuts |
| nets closed | **1** | **4** |
| rounds | 63 | 78 |
| evaluations | 11,842 | 16,793 |

**Four nets for one cut**, on the pair §6.9 chose to measure. Everywhere else the
open-net column is new, because §6.9 had no per-run figure for it: it recorded
`netsComplete: false` on all fifteen runs and the counts for that one board.

**And the search now spends `F` to do it, visibly.** Every climb's `F` history
rises above its own start before coming down: `constructed` seed 0 reaches
`F = 27` on the way to a best of 10, `random` 0 reaches 30, and `import` reaches
40.25 from a start of 38.25. Under the old rule no accepted candidate could ever
raise `F`. That is the first key doing exactly what it says. The accepted-move
counts moved with it — 79 to 163 per run, where a round sweeps the whole move
set.

#### **NO BOARD IS FINISHED, AND THAT IS THE FINDING**

Nine or ten of fourteen nets are still open on every best board. `HC1` fails on
every run, every run ends inadmissible, and not one of these boards is buildable.
**The change moves the number it was supposed to move and does not finish the
job.**

**It is not the budget.** Every run stopped on `S3` — a round that accepted
nothing — and none reached the 20,000-evaluation cap: the largest spend is 17,669
evaluations with six unscoreable candidates, against a cap that counts both. So
the search CONVERGES with nine or ten nets open, and a larger cap stalls on the
same kind of board. §6.9 reached that conclusion with completeness unpriced; it
survives completeness being the first thing the search looks at. **A climb is
also bigger than it was** — 10,378 to 17,669 evaluations where §6.9's were 4,314
to 15,218 — so the change costs search as well as cuts.

**`W` is still 0 on every run, which is the mechanism worth naming.** §6.9
measured 7,417 `add-wire` candidates, none ever accepted, and explained it by the
objective: a wire keeps the cut count and pays its weight with nothing rewarding
the connection it closes. The completeness key removes that explanation — a wire
that closed a net would now be accepted at any `F` — and **no wire is accepted
anyway.**

**`W = 0` on a best board really does mean no wire was ever accepted in that
climb**, and the inference is worth writing down because it is not obvious: with
`E3` unconfigured every acceptance improves on the incumbent, so the incumbent
and the best coincide, an accepted wire board therefore becomes the best — and
`delete-wire` is refused (`tools/stripboard/moves-model.ts`), so a board that
acquires a wire cannot shed one.

What this sweep can say is therefore exactly this: **no wire candidate was ever
both admissible-against-its-predecessor and better on the ordering** — which
covers two different ways of closing nothing, and does not separate them. A wire
that closed a net without breaking a constraint its predecessor held would have
been accepted at any `F`. Between 0 and 36 candidates per run could not be
scored at all, which is `--author --op autofill` reporting `CUT_STATE UNRESOLVED`
on a wire that shorted two nets — §6.9's measured failure, counted rather than
fatal — and a wire that shorts is a wire that breaks `HC8` on a board where it
held, which clause 1 rejects before the key is consulted. **How many of the rest
closed no net, against how many closed one and broke something, is NOT measured
here.**

#### The isolation run: on the `import` arm `rhoSolder` changed NOTHING, and the key changed everything

Two changes landed in one commit, which is one too many for a comparison. The
`import` arm can separate them, because it has a single start and no seed
dependence: the same pair was run again with the completeness key in place and
`rhoSolder` back at PAR1's **1**.

| `import`, seed 0 | §6.9: no key, `ρ_s = 1` | key, `ρ_s = 1` | key, `ρ_s = 0.25` |
| --- | --- | --- | --- |
| cuts | 33 | **34** | **34** |
| wires | 0 | 0 | 0 |
| solder bridges | 0 | **4** | **4** |
| nets open | not measured per run | **10 of 14** | **10 of 14** |
| evaluations | 4,314 | 4,592 | 4,592 |
| rounds | 21 | 24 | 24 |
| accepted moves | not recorded | 45 | 45 |
| `F` | 33 | 38 | 35 |

**The two key columns are identical in every figure but `F`**: same evaluation
count, same round count, same accepted-move count, and a best board identical on
every count taken from it. On this arm the solder weight changed no decision the
search made and moved only the number reported, so **every structural difference
from §6.9 here is the completeness key's.**

**It also kills the obvious reading of the `B` column.** `B` went from 0 to 4 on
this arm, and the tempting account — a blob priced at a quarter is a blob the
search no longer bothers to remove — is **false**: at `ρ_s = 1`, where a blob
costs a whole cut, the same four appear. What puts them there is the key. The
import-placed start carries one bridge and 38 cuts, so these runs acquire three
more while removing four cuts and closing three nets. **On the owner's bench each
of those four is a short wire he has to run** — *"A solder blob will turn into a
wire on my bench"* — which is why `B` is a column of its own and not left inside
`F`, where four bridges contribute one.

`B` is **0** on four of the five `constructed` seeds and 2 on the fifth, so this
is a fact about particular trajectories and not a general effect of the change.
The `random` arm carries 4 and 5.

**What the isolation run does not establish:** it is ONE arm at ONE seed. Nothing
here says `rhoSolder` is inert on `constructed` or `random`, whose trajectories
differ.

#### Two of fifteen pairs refused when five ran at once, and both completed alone

The first five pairs were run **five at a time**, and two of them — `constructed`
seeds 0 and 1 — stopped on `missing-line: the dump has no GRID line`: a
`--dump-board` that exited 0 and printed nothing. They refused at 74,271 and
12,595 fork invocations, which is not a shared point in a trajectory.

**Re-run alone, `constructed` seed 0 went past its own refusal point and
finished** — 82,394 invocations against the 74,271 where it had stopped — so the
empty dump is **not** a property of a board the new ordering leads the search
onto. The rest of the sweep was therefore run **one pair at a time**, and this
page records what that is evidence of and what it is not:

- §6.9 saw the same CLASS of failure once in 763,545 invocations, on a transient
  it investigated and could not explain, noting that *"the only thing the failing
  run had that the replays did not is a SECOND fork process"*. This sweep ran
  five, saw two failures in roughly 150,000 invocations of concurrent running,
  and saw none in the serial runs that followed;
- **that is a correlation at a higher density, not a mechanism.** Nothing here
  identifies what the concurrent forks contend for, and the disk was not full
  (33 GB free throughout);
- **a refusal is one refusal and not a zero**, exactly as §6.9 recorded it: the
  pair produced no run, and the two refused pairs were re-measured serially
  rather than reported as results.

#### What this still does not establish

- **NINE OF THE FIFTEEN PAIRS ARE MEASURED HERE**, and the section says which
  rather than implying a sweep: all five `constructed` seeds, `import` 0 and 1,
  and `random` 0 and 3. The other six — `random` 1, 2 and 4 and `import` 2, 3 and
  4 — were still being measured, one at a time, when this was written. Three of
  those six are `import` seeds repeating a start the seed does not change, so
  what is genuinely open is `random` 1, 2 and 4;
- **the arm comparison was not re-run.** `compareSeedArms` needs every arm at
  every seed it is given and refuses a missing pair rather than defaulting it, so
  no rate, `separated` or `retireable` verdict is quoted here. The figures above
  are per-pair measurements, not a rate;
- **the two changes are separated only on the `import` arm** (above);
- **the per-KIND firing audit is not available.** §6.9 could say which gesture
  kind set each new best because its run directories survived; this sweep deletes
  each run directory once the best board is copied out, which is what lets a run
  of 17,669 evaluations - nearly 100,000 fork invocations and some gigabytes of
  scratch boards - be followed by another. So *which* gesture closes a net here is
  **not measured**, and the `W = 0` finding above is the only per-kind statement
  that can be made from the counts;
- **`RETIREMENT`'s tiebreak is now stated over a quantity the search
  subordinates.** It names final `F` per seed for a run where no arm reaches the
  mark, and `F` is no longer the first thing the ordering compares. Nothing here
  changes that rule — it is `seed-compare.ts`'s declared text and a criteria-level
  matter — but a tiebreak on `F` between two arms that differ in open nets is
  ordering them by the wrong column;
- **the run report does not carry the open-net count.** `REP`'s fields are
  CRITERIA's, and the figure this section is about reaches a reader only through
  `HC1`'s pass or fail in the failing-check list. Every open-net count on this
  page was read from `Evaluation.openNets` by the harness and re-checked with the
  fork's own `--check` on the kept board;
- **one board, one netlist**, as §6.9 says of its own findings.

#### What it means for route 3, and the owner's own sequence

He said **"1 then 3"**: change the scoring, and add a second pass only if that is
not enough. Measured: the scoring change moves completeness in the direction it
was supposed to move — four or five nets per run where the one measured run
before it closed one, for one to five cuts — and **it is not enough.** The search
converges with nine or ten nets of fourteen open, with the cap unspent and no
wire ever accepted. Route 3's second pass is what that leaves, and these figures
are the evidence for taking it rather than an argument for it.

**What they do not say is what the second pass should do**, and this page will
not propose one: a gesture, a pass order and a stopping rule for a completion
pass are objective-level decisions, which is the line §6.9 drew — *"a change
nobody here may make alone"* — and it has not moved.

### 6.11 CHECKPOINT 9 — the SPREAD move, the lever the owner corrected us on: **1,539 candidates, not one ever best, and the cut count moves on one run of eight**

**What changed in the search, and it is two things.**

1. **An eighth move kind, `spread`.** ONE candidate relocates the pins a net has
   on a single strip onto a strip holding no pin, AND adds the wire that rejoins
   the net to a strip it still occupies. `tools/stripboard/moves-spread.ts` is
   the implementation and quotes the owner's own correction of the cost model as
   the warrant for the kind existing.
2. **A fresh wire's holes are assigned to their net before the candidate is
   scored.** `climb` runs one `--update` for every candidate that CARRIES a
   wire. Every `add-wire` candidate in §6.3 to §6.10 was scored without it,
   which is why §6.9 counted 7,417 of them and reported `W = 0` on every best
   board: a wire's holes carry node id 0 and `--check`'s completeness reads node
   ids, so the join was invisible to the one key the ordering puts first.

**Why: the owner's words (2026-10-12).**

> "Wires let you spread nets across multiple strips so they don't collide with
> other nets that would otherwise have to share the same strip. That's the way
> wires reduce cuts. Otherwise you'd have to pack more nets adjacent to each
> other on a the same strip. Wires let you trade strips for cuts"

**Everything else is §6.10's experiment unchanged** — same reviewed seeds, same
import-placed `pultec-low-boost` board, same committed rules at `evaluationCap`
20,000, one `search()` per pair, the pinned fork. **§6.3, §6.7, §6.8, §6.9 and
§6.10 are not edited.** Cut counts come from `scoreDumpText`, which REFUSES a
board whose `CUT_STATE` is `UNRESOLVED` rather than pricing it at zero cuts.

#### Where the gain has to come from, which is what decided the enumeration

Regroup the identity `C = N + J − S_occ`. `N + J` is the total count of NET
SEGMENTS — one per net per strip it has holes on — and `S_occ` is the strips
holding a pin, so `C = Σ_strips (m_s − 1)`: **a cut sits exactly where two net
segments abut on one strip.** Three cases follow, each a reading of that sum:

| the move | segments | occupied strips | `ΔC` | `ΔF` at `ρ_w = 0.25` |
| --- | --- | --- | --- | --- |
| add a strip to a net, new strip FREE | `+1` | `+1` | **0** | `+0.25` |
| add a strip to a net, new strip OCCUPIED | `+1` | `0` | **`+1`** | `+1.25` |
| **vacate a SHARED strip onto a FREE one** | `0` | `+1` | **`−1`** | **`−0.75`** |

Only the third can pay, so only the third is enumerated. The sources are the
strips where the net's pins abut another net's **on a part the spread would not
move** and where **no pin of the net stays behind**; the targets are the strips
holding no pin at all.

#### The eight pairs

| arm | seed | `F` | `C` | `W` | `B` | **nets open** | evaluations | rounds | accepted | unscoreable | spread candidates | spread ever best | §6.10's `C` / `W` / open |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `constructed` | 0 | 10 | **10** | 0 | 0 | **9 of 14** | 14,944 | 63 | 136 | 243 | 180 | **no** | 10 / 0 / 9 |
| `constructed` | 1 | 10 | **10** | 0 | 0 | **9 of 14** | 15,631 | 65 | 140 | 227 | 180 | **no** | 10 / 0 / 9 |
| `constructed` | 2 | 11.75 | **11** | **1** | 2 | **8 of 14** | 13,116 | 66 | 121 | 3,580 | 549 | **no** | 11 / 0 / 9 |
| `constructed` | 3 | 12.25 | **12** | **1** | 0 | **8 of 14** | 11,980 | 59 | 105 | 3,135 | 84 | **no** | 12 / 0 / 9 |
| `constructed` | 4 | 11 | **11** | 0 | 0 | **9 of 14** | 10,722 | 41 | 79 | 178 | 503 | **no** | 11 / 0 / 9 |
| `import` | 0 | 35 | **34** | 0 | 4 | **10 of 14** | 4,350 | 24 | 45 | 278 | 0 | **no** | 34 / 0 / 10 |
| `random` | 0 | 14 | **13** | 0 | 4 | **9 of 14** | 13,289 | 48 | 113 | 650 | 0 | **no** | 13 / 0 / 9 |
| `random` | 3 | 14.5 | **14** | **2** | 0 | **12 of 14** | 8,285 | 57 | 116 | 2,209 | 43 | **yes, once** | 16 / 0 / 10 |

Every run stopped on `S3` with the cap unspent — the largest total is
`constructed` 2's 16,696 of 20,000 — and every one ended inadmissible.

#### What the spread did: nothing, on seven runs of eight

**1,539 spread candidates across the eight runs and not one was ever the board a
later round swept from.** On five of the eight the cut count, the wire count and
the open-net count are all **identical to §6.10's** — `constructed` 0, 1 and 4,
`import` 0 and `random` 0 — and three of those five enumerated 180, 180 and 503
spread candidates while matching the earlier figures exactly.

**That identity is not a coincidence and it is stronger than it looks.**
`enumerateMoves` appends the spreads LAST, after every other kind, so in each
round every non-spread candidate is evaluated against the same incumbent it
would have met without them; if no spread is accepted, the incumbent at the end
of each round is exactly what it was before the kind existed. No run reached the
cap, so no candidate was dropped for budget. **So on any run whose spread count
is non-zero and whose spread-ever-best is "no", the kind added evaluations and
changed nothing else** — which is five of the eight rows above, and is why the
`constructed` arm's cut counts are 10, 10, 11, 12 and 11, the same five numbers
§6.10 recorded.

**The one run where the cut count moved is `random` 3, and it is not a clean
win.** `C` 16 → 14 and `F` 17.25 → 14.5, for `W` 0 → 2 and `B` 5 → 0 — and
**the open-net count went 10 → 12, which is worse.** One spread was accepted in
that run and one `add-wire` was. Completeness is the ordering's FIRST key, so a
board with twelve open nets is not better than one with ten; the two runs
diverged and this one found a cheaper, less complete board.

#### What the `--update` did, which is the half that paid

**Two nets closed, on two seeds, for one wire each, at no cost in cuts.**
`constructed` 2 and 3 both reach **8 of 14 open** against §6.10's 9, with `C`
unchanged at 11 and 12, `W` 0 → 1, and one `add-wire` candidate accepted in each.
That is the first time in this repository's record that a wire has been accepted
by the main search: §6.9 counted 7,417 `add-wire` candidates and none was best,
and the reason was the node id, not the gesture.

**`import` 0 is the isolation, and it is exact.** Zero spread candidates, so the
`--update` is the only change — and `C`, `W`, `B`, the open-net count, the round
count and the accepted count are all identical to §6.10's. What moved is where
the shorted candidates are counted: 4,350 + 278 against §6.10's 4,592 + 36, the
same 4,628 total, with 242 candidates now rejected at `--update` instead of
being scored as wires that joined nothing.

**And it costs reach.** Once a wire is on the board, a candidate that moves a
part can leave that wire's two ends on two different nets, and `--update` then
refuses to put it back — correctly, in the fork's own words, *"a board where a
jumper has become a short is not a board this tool may write."* That is what
took `random` 3's unevaluable count from §6.10's 0 to 2,209 and `constructed` 2's
from 6 to 3,580. Those candidates are rejected and counted, not skipped
silently.

#### Why the spread cannot fire, measured

**A wire's end joins the net only if it lands on the same PIECE of copper as the
net's pins**, and `AutoFillVero` cuts a strip between two adjacent holes of
different nets. **The fork makes only straight wires** — a `1 × n` or an `n × 1`
— so one line of holes must serve both ends, which means the net's copper on the
two strips has to overlap in that line. Three measurements:

1. taking the first line that FIT, ascending — `wireMovesFor`'s own rule — had
   **every one of the first twenty-five spread candidates refused** by `--update`
   on the import-placed board, because the lowest free line is at the far end of
   the board from the net;
2. ranking the lines by nearness and still taking the first that fit did not fix
   it: the near lines are the ones the parts' own holes block, so the wire went
   to column 23 while the net's pins on the strip it was leaving sat at columns 3
   to 15;
3. with the reach made a REQUIREMENT, the import-placed board admits **zero**
   spread candidates, and the diagnostic says why per net: the best single line
   for the net `0` pair (strip 0 to strip 2) is at reach 0 — a hole that already
   holds a pin — and every reach-1 line is blocked by a part.

**The join a person would draw there is an L** — a wire ALONG one strip to bring
the net's copper under the other strip's, then a wire ACROSS. That is two wires,
and `complete-joins.ts` already plans both halves. At `2 × ρ_w = 0.5` against one
cut the trade would still be `ΔF = −0.5`. **This kind plans one wire and the L is
not built.**

#### One spread measured end to end, which is where the `−1` goes

`random` 3's round-0 spread candidate, decomposed per strip from the two boards'
own `PIN` lines:

| strip | nets before | nets after |
| --- | --- | --- |
| 17 (free) | — | `0` |
| 20 | `in` | — |
| 13 | `hi_boost_out`, `si_hi_cut_j4_p2` | the same plus `in` |

Net segments 36 → 37, occupied strips 22 → 22, so the identity predicts `C + 1`
and the fork's own cut count went **21 → 22** with `W` 0 → 1 and `F` 22.25 →
23.50. Two causes, both in that table: the net KEPT its segment on the strip the
spread was supposed to vacate — a second part held it — and the relocated part
carried its other pin, which emptied strip 20 (taking the `S_occ` gain back) and
landed on strip 13 beside two other nets (adding the cut). The first cause is now
a clause in `spreadSourceStrips`; the second is unmodelled and named.

**No model of the ABSOLUTE cut count was adopted, having been tested.** Counting
net changes along each strip gives 14 where the fork cuts 21 on one board and 30
where it cuts 38 on another; `(segments − strips)` gives 14 and 18 for the same
two. Only the DELTA matched, on one pair, which is not enough to gate an
enumeration on.

#### What this does not establish

- **the two changes are separated only where the spread never fires** —
  `import` 0 and `random` 0 enumerate no spread at all and are therefore the
  `--update` alone. Elsewhere the separation rests on the ordering argument
  above (spreads enumerated last, never accepted, cap unspent), which is a
  reading of the counts rather than a second sweep;
- **seven of the fifteen pairs were not run** — `random` 1, 2 and 4 and `import`
  1, 2, 3 and 4. Four of those are `import` seeds repeating a start the seed
  does not change;
- **the arm comparison was not re-run.** `compareSeedArms` refuses a missing
  pair rather than defaulting it, so no rate, `separated` or `retireable`
  verdict is quoted here;
- **the eight pairs ran on the code before the "no pin stays behind" clause**,
  which landed while they were running. The clause only REMOVES candidates, so
  by the ordering argument it cannot change a run whose spread was never best —
  seven of the eight. **`random` 3 was re-run under it and is unchanged:** `C`
  14, `W` 2, 12 of 14 open, 57 rounds, 8,281 evaluations against 8,285, with 39
  spread candidates instead of 43. The clause removed four candidates and moved
  nothing else, so the table holds at the clause;
- **one run flaked** with `--dump-board produced no PIN line` and was relaunched
  from scratch. §6.9 measured the same refusal once in fifteen; eight runs were
  in parallel on ten cores here, so load is a plausible contributor and is not
  established as the cause;
- **one board, one netlist**, as §6.9 and §6.10 say of their own findings.

#### What it means

**The owner's mechanism is real and this move set still cannot perform it.** The
arithmetic says vacating a shared strip onto a free one is worth exactly one cut
for one wire; what blocks it is not the cost model, the acceptance rule or the
enumeration, but **the shape of the wire the fork will make.** A straight jumper
can rejoin a spread net only where the net's copper on two strips happens to line
up in a free column, and on a board whose parts are packed into three rows it
never does. The next thing to build is the L-shaped join, and that is a decision
about the move set rather than a tuning of this one.

---

## 7. `V5` and `V9` — can a statistic tell two placements apart, and is any constant unaccounted for?

`V5` is *"a metric that cannot distinguish a good placer from a bad one is not a
metric"* (PIPELINE §10). `V9` is *"no fitted coefficient anywhere — the pipeline
reports no ratio fitted across boards, and any constant it carries traces to a
derivation, a measurement, or an owner's parameter"*. Both land in
`tests/stripboard/discrimination.test.ts`, with the three layout pairs `V5` is
measured over in `tests/stripboard/discrimination-fixtures.ts`.

Neither test is the claim its criterion makes, and §7.4 says so in each case
alongside every other check on this page whose guarantee is weaker than its
subject.

### 7.1 `V5`'s stated threshold was the placer's fingerprint, and what replaced it

The task brief's form of `V5` compared each board's import-placed layout against
the pipeline's own and required every statistic to move **"by more than its
across-board variation"**, that variation being computed from the four
import-placed boards' own spread. The reason for computing it rather than
choosing it was good — a threshold nobody picked cannot be picked to pass — and
the quantity it computes is still the wrong one.

COST §5's own measurement is why. Across the four import-placed boards `C/P`
reads **0.92, 0.91, 0.91, 0.85** — a coefficient of variation near 3%, *"which
looks like a law until low-boost arrives at 0.19 and the five-board variation
jumps to roughly 38%"*. The near-constant is a **property of one placer**: lay
every part along a strip and every pin becomes its own segment, so
`C ≈ P − S_occ` on every board that placer produces. A tolerance derived from
that spread measures how consistent `--import` is with itself, and a statistic
asked to beat it is being asked to differ from `--import` by more than
`--import` differs from itself. A fitted coefficient that holds across four
boards from one placer and collapses on a hand layout was never a property of
stripboard.

So `V5` here is not four boards against four boards. It is a **good layout
against a bad layout of the same netlist**, three times over, which is what the
governing sentence is about: a statistic that cannot order those two is not
measuring the layout.

### 7.2 The three pairs, what each one is for, and the mutations that prove the test discriminates

Every pair is `tests/stripboard/climb-boards.ts`'s two resistors and two nets —
`R1` and `R2`, nets `left` and `right`, strips down the columns. **The netlist is
held fixed on both sides of every pair**, which is the only way a statistic that
reads the circuit can be told apart from one that reads the layout.

The good layout is `BETTER_DUMP`: both parts span columns 1–6, so `left` is whole
on column 1 and `right` whole on column 6, no strip carries two net-segments, and
under the identity's sharper form —

```
C = (net-segments) − (occupied strips) = Σ over strips of (segments on that strip − 1)
```

— **a cut exists exactly where two net-segments abut on one strip**, and this
board has no abutment anywhere.

The three bad layouts each spend a different term of `F`, which is why there are
three: one pair leaves whichever term it does not move looking like a statistic
nothing can separate.

| | `C` | `W` | `B` | `F` | `N` | `P` | `S_occ` | `J` | `kappa` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **good** — each net whole on one strip | 0 | 0 | 0 | 0 | 2 | 4 | 2 | 0 | 0 |
| **bad** — both nets split, joins bought with wires | 0 | 2 | 0 | 0.5 | 2 | 4 | 4 | 2 | 1 |
| **bad** — the same two joins bought with solder | 0 | 0 | 2 | 0.5 | 2 | 4 | 4 | 2 | 1 |
| **bad** — two net-segments abutting on one strip | 1 | 2 | 0 | 1.5 | 2 | 4 | 3 | 2 | 1 |

Every figure in that table was read off `scoreDumpText` — **not `scoreDump`**,
because `scoreDumpText` reads the text once and derives both the parsed geometry
and `V1`'s independent line count from it, which is what keeps `V1`'s
second-path check riding on every evaluation here as it does in a run.

Three things in the table are worth reading rather than scanning past.

- **The solder pair and the wire pair have the same `F`.** With
  `rho_s = rho_w = 0.25` — the owner's instruction that a blob on a layout is a
  wire on his bench — the objective cannot tell those two boards apart, and `B`
  is the only statistic that can. That is why `B` is still a separately reported
  fact about a board (`stripboard/rules.json`'s `rhoSolder` note), and why the
  pair is in the table at all.
- **`N` and `P` do not move anywhere**, by construction, and that is the finding
  §7.1's framing exists to produce.
- **The abutted board against the wire board measures the spreading rule.** Same
  netlist, same two joins bought with wires, one more strip spent: `C` falls from
  1 to 0 while `S_occ` rises from 3 to 4. Spreading a net onto an **empty** strip
  is cut-neutral, onto an **occupied** one it is `+1`, and never negative — the
  cut reduction comes from **vacating an abutment**, not from occupying a strip.
  The same reading accounts for `boards/pultec-low-boost`, where all five cuts
  sit on row 3 and that row carries six net-segments.

**`REPORTED_STATISTICS` is derived, not listed.** The test scans every
`tools/stripboard/*.ts` for `score.<field>` and intersects what it finds with
`Object.keys` of a real `Score`. A hand-written list would make `V5` a check on
one agent's opinion of what is reported. Measured, the pipeline reads seven of
the nine: `cuts`, `wires`, `solder`, `objective`, `occupied`, `joins`,
`clustering` — and reads neither `netCount` nor `pinCount`. Those two are exactly
the fields that separate none of the three pairs, so **nothing had to come out of
the reported set**: `V5` found the pipeline already clean on this point, which is
a weaker result than a repair and is reported as what it is. The test asserts the
closure — every field of a `Score` is either read and separates a pair, or
separates nothing and is not read — so a tenth field lands in neither until
somebody decides which.

**It discriminates, and that was measured three ways rather than argued.** Each
mutation was run as a WHOLE-FILE run, never a `-t` filter:

| Mutation | Result |
| --- | --- |
| `objectiveOf` in `tools/stripboard/score.ts` returns a constant | **3 of 9 fail** — `objective` separates no pair; it does not order the good layout first; and it joins `netCount` and `pinCount` in the blind list |
| one pair's `good` pointed at its own `bad` | **2 of 9 fail** — the sharp form, and the "inputs are real" guard that exists to catch a pair comparing a board with itself |
| all three pairs' `good` pointed at their `bad` (the brief's Step 4) | **4 of 9 fail** — every `V5` row |
| `const UNREVIEWED_THRESHOLD = 0.37` added to `tools/stripboard/extent.ts` | **1 of 9 fails** — `V9`'s register, naming `extent.ts` |

A fourth check in the same file is there because of a caveat that would corrupt
every figure above: `--move RV_LO_BOOST_1 --to 3,30` comes back
`CUT_STATE UNRESOLVED`, and **a naive `grep -c '^CUT '` scores that refused board
at zero cuts — the best possible score in the run awarded to a failed gesture.**
Measured on the abutted board with its state flipped: the independent line count
reports no cuts, and `scoreDumpText` refuses with `score-cuts-not-computed`
rather than reporting a winner. Nothing on this page reads a cut count without
`CUT_STATE` having been read first.

### 7.3 `V9`: sixteen literals over forty-three modules, every one named, and a blind spot the sweep found

The sweep lists `tools/stripboard/*.ts`, excludes `rules.ts` — which is where
numbers legitimately live — and reads each remaining file with the pattern
`tests/stripboard/bare-literal.ts` declares. The listing is **derived rather than
written out**, so a module a later task adds is covered without anybody
remembering to add it, and it is asserted non-empty, because a listing that
matched nothing is the most comfortable way for a sweep to pass.

Measured: **43 modules as the sweep listed them, 16 hits in 7 of them.** The module
count moves as modules are added, which is the point of deriving the listing; the
test asserts the listing is non-empty and names `score.ts`, not that it is 43.

| Module | Literals | What they are |
| --- | --- | --- |
| `score.ts` | `2.1`, `1.4`, `2.1`, `4.1` | COST section citations inside refusal messages |
| `targets.ts` | `2.1`, `6.4`, `1.4`, `1.4`, `2.1`, `6.4` | the same, in `targets.ts`'s refusals |
| `geometry-contract.ts` | `1.5` | `"COST 1.5's forbidden …"`, in a refusal message |
| `equivalence.ts` | `2026` | the criteria document's filename, quoted in a refusal |
| `seed-compare.ts` | `2026` | the same filename, quoted in `B1-frozen`'s refusal |
| `seed-geometry.ts` | `255` | the fork's own `GetMaxLength 255`, quoted in a refusal that says the source reading **disagrees** with the measurement |
| `seed-arrangement.ts` | `4294967296`, `1970` | `2^32`, the divisor that maps a 32-bit word to `[0, 1)`; and `1970-01-01T00:00:00`, the fixed `createdAt` a deterministic netlist is written with |

**Fourteen of the sixteen are citations or quoted figures inside string
literals**, which `bare-literal.ts`'s own blind-spot list names as the scan's one
false-positive shape — *"the fix is to say the figure in words or to splice the
parameter in"*. **They are not fixed, and that is a decision rather than an
omission.** The brief's Step 2 says a literal the scan finds *"moves to
`stripboard/rules.json` with a `note`"*, which is right for a threshold and
absurd for `COST 2.1`: rewriting fourteen refusals to say "section two point
one" in words would cost the citations their grep-ability to buy a cleaner
assertion, and a refusal that names its authority by section is what this
repository's refusals are for. So the test compares the sweep's finding against
an explicit **register** instead of against the empty list, exactly — in both
directions, so a literal appearing in a module that is not in the register fails,
and a register row whose literal has gone fails too. **A number nobody can
explain is a number nobody reviewed**, and that is the one thing this test keeps
honest.

**Only the two in `seed-arrangement.ts` are values the code uses, and neither is
a tunable.** `4294967296` is `2^32`, a property of the `>>> 0` arithmetic
immediately above it rather than a parameter — moving it would not retune
anything, it would make `seededPrng` stop returning a number in `[0, 1)`. The
epoch timestamp is there so a netlist written for comparison does not carry the
wall clock; it is a determinism device, and PIPELINE `V6` is what it serves.
Neither is fitted to a board, and neither belongs in `rules.json`, whose entries
are values somebody may reasonably want to change.

**THE SWEEP FOUND A BLIND SPOT THAT `bare-literal.ts`'s OWN LIST DOES NOT
NAME: a hex constant is invisible to it.** Every digit run inside `0x9e3779b9` is
flanked by a letter, so the identifier lookbehind rejects it.
`seed-arrangement.ts`'s mulberry32 carries two — `0x9e3779b9` and `0x6d2b79f5` —
and the sweep reports neither. Measured, and asserted in
`discrimination.test.ts` so the claim cannot go stale. The practical exposure is
small, because nobody writes a weight or a bound in hex; the reason it is written
down anyway is that the five blind spots that file **does** list were each
measured, and a sixth found later would otherwise read as one that had been
considered.

What `V9`'s scan therefore does not establish is `V9`. A threshold written
`5e-2`, a small integer used as a bound, two accepted literals multiplied
together, a hex constant, or a number imported from a module that is not the
rules file all pass it. The judgement half — that no ratio anywhere is fitted
across boards — is this page plus the owner's review, and **five boards cannot
support a regression test of it** either way.

### 7.4 Every check whose guarantee is weaker than its subject

This is the honest counterpart of PIPELINE §10's `V1`–`V12` table, and a reader
asking *"how do we know the optimiser is not fooling itself?"* should read it
before that table rather than after. Each row names where the weaker guarantee is
already written out, so nothing here is a new claim; the rows are the checks this
page's own sections and the committed rules file have measured, **not** a
complete walk of `V1`–`V12`, and the task brief's register of all twelve with
where each test lives is **not on this page** — twelve rows asserted from memory
would be the failure this very section is about.

| Check | What it actually guarantees, and where that is stated |
| --- | --- |
| `V9`'s literal sweep | A text scan, not a proof. Blind to `5e-2`, to a small integer used as a bound, to a composed value, to a value behind a `*` on a line of code, and — found here — to a hex constant; and it false-positives on a figure inside a string. `tests/stripboard/bare-literal.ts`, and §7.3 above |
| Task 19's per-module scan over `stop.ts` | The same pattern, so the same blind spots. Named as a scan in `tests/stripboard/stop-text.test.ts`, whose stronger half is behavioural: every threshold the module applies must MOVE when the rules file's value moves |
| `V5` | That each reported statistic **can** order a good layout ahead of a bad one, on three pairs over one two-resistor netlist. It is not a measurement of any statistic's behaviour on a Pultec board, and the brief's five-board form was replaced for the reason in §7.1 rather than performed and passed |
| `V1`'s `IndependentCount` brand | Closes the accidental bypass and the wrong-board witness; does **not** stop a deliberate `as unknown as` cast, and both of its gates are `bun run typecheck` rather than runtime, so it is as strong as that step is mandatory and no stronger. `tools/stripboard/score.ts` states all four cases, each measured |
| `J ≥ 0` as an `UNRESOLVED` detector | Catches an unresolved board only when the absent cut list happens to drive `J` below zero — it does on `transistor-preamp-lab` and does not on a small fixture. The `CUT_STATE` read is the check that holds; `score.ts` records the measurement |
| `Q4`'s stopping rule | A labelled hypothesis, not a calibrated rule: `g` is optimistic and `r` is bursty, and neither has been measured on a real run. `stripboard/rules.json`'s `yieldFloor` note |
| `Q6`'s signature run of three | Inherited from a sibling repository solving a different problem. `stripboard/rules.json`'s `signatureRun` note names both ways it could be wrong |
| `kappa_bench = 0.05` | The hard end of a ratchet, set just under the best demonstrated hand result. **Not the measured value of any artifact**, and the first runs are expected to fail it. `stripboard/rules.json`'s `kappaBench` note |
| `evaluationCap = 20000` | A backstop sized from measured timings, with an order-of-magnitude margin that is a choice. Nobody has measured what a healthy run of this pipeline spends. Its own note |
| `HC6`'s stock bound | Relative to today's stock, so a width refusal may be a purchasing fact rather than a layout defect. `stripboard/rules.json`'s `stockCols` note |
| §6.2's import-closure scan | A closure scan over imports; §6.2 states what it found and what a pass of it covers |
| §2.3's `BOUNDS` label finding | Recorded as **unverified** in its own heading |
| §6.11's per-kind firing audit | §6.11 records that its sweep deletes each run directory once the best board is copied out, so *which* gesture kind closes a net in that sweep is **not measured** — §6.9's figures survive because its run directories did |

## 8. Task 23 — the `place` verb, CHECKPOINT 2, and the `B1-frozen` run

**The headline, before the detail: `B1-frozen` is NOT met, and not because the
optimiser came second to the owner's hands. The pipeline cannot score the frozen
board at all.** Two of the eight components that layout places carry data this
repository does not record, and the run refuses on them in order. **And the hand
layout itself is inadmissible under the span data as recorded**: `R2` sits at a
three-hole span against a recorded minimum of five. That is **reading 2** of the
three the plan declares — *"a constraint binds … the remedy is in the span data
rather than in the search"* — and the plan calls it falsifiable on this fixture
precisely because the owner's own spans are in it.

Nothing was adjusted to produce a number. `stripboard/rules.json`,
`lib/kicad/lead-span.ts`, `lib/kicad/pin-pattern.ts` and
`VEROROUTE_FOOTPRINT_ROWS` are untouched by this task; the one probe that
supplied a missing figure was made in the working tree, read, and reverted, and
it is labelled as a probe everywhere it is quoted below.

### 8.1 What was built

| | |
| --- | --- |
| `tools/stripboard/place.ts` | the run: import, seed, climb, escapes, stop, grade, `run.json`. With `place-model.ts` (what a run is) and `place-inputs.ts` (what it is graded against), split at the 500-line ceiling |
| `tools/cli/perfboard-stripboard-verbs.ts` | the `place` verb, acting on `$(CURDIR)` like every other verb on that CLI — no `BOARD=` variable |
| `make place` | per board, with `SEED_ARM=`, and `FROZEN=`/`NETLIST_EXPORT=` for the frozen fixture |
| `tools/stripboard/targets-export.ts` | `P0`'s targets for a board whose model exists only as a netlist export, through `deriveTargetsFrom` so there is still one graph, one ordering and one floor |
| `tests/fixtures/stripboard/pultec-low-boost-frozen.footprints.json` | the benchmark's missing column — see §8.4 |

**`--seed-arm` is required and the verb chooses nothing.** Measured:

```
$ bun tools/cli/perfboard.ts place -C boards/pultec-low-boost
"place" needs --seed-arm, and there is NO DEFAULT ARM: the arms are constructed,
import, random. The three are an experiment with random as its control, so an arm
chosen for you would be a comparison whose own treatment nobody named. Name one.
exit 1
```

### 8.2 CHECKPOINT 2 — the chain end to end, and it ran here

**It was deferred to this task by a controller ruling, and the reason is a
dependency rather than a deferral**: Task 20 could not run it because `place` did
not exist, and the checkpoint's own instruction is *"run `place` against one
Pultec board"*. Its dependency is this task. Run here, at a reduced
`evaluationCap` passed through the injected rules, on `boards/pultec-low-boost`,
arm `import`, the committed seed list.

**The chain works.** Nothing threw, the `bound` came from the rule that fired,
and the `outcome` agrees with the verdict its own grader produced — which is all
three of the wiring defects this checkpoint exists to catch, each absent:

| what the checkpoint looks for | measured |
| --- | --- |
| a chain that throws | it did not |
| `outcome: admissible` while a `ConstraintResult.held` is false | `outcome: invalid`, with four constraints failing |
| a `bound` naming a rule `evaluateStop` did not return | `Q5` fired; `bound: budget-exhausted`, which is `Q5`'s own row |

**The run, at `evaluationCap = 400`:**

| | |
| --- | --- |
| outcome | `invalid` — `A1` fails on `HC1`, `HC6`, `HC8`, `HC10` |
| bound | `budget-exhausted`, from `Q5` |
| exit | 1, and the exit line says the RUN failed although the candidate's own outcome is a separate claim |
| cost | `F = 37.5`, derived floor 0, `C = 36`, `W = 0`, `S = 6` |
| completeness | 11 of 14 nets still open |
| `κ` | 0.75 against `κ_bench` 0.05 — `A2` fails, naming no binding constraint (`K3`'s ratchet may not move on it) |
| `A3` | `not-evaluated`: `tau` is unset, so it reports and does not grade |
| `A4` | held — the scaffolded board against `B1-current`, whose clause does not fire while `tau` is unset |
| run | 2 climbs, 400 evaluations, restart at evaluation 384 |
| provenance | 40.4 s wall clock, 25.3 ms per fork invocation at four invocations per evaluation |
| `run.json` | written, both blocks, canonical hash `040333a06b592b9a3e7e76cc42eef33e80ecb6441280e35a880f9d3138f04ef9` |
| `boards/**` | unchanged — `boardsDigest()` before and after are equal, asserted as a standing test |

**The plan expected `valid, below target` and the measurement is `invalid`.** The
expectation was reasonable — *"the cap is deliberately small"* — but it assumed a
board that conducts. At 400 evaluations the import-placed board still has 11 open
nets, and `HC1` alone makes the outcome `invalid`. The full-cap runs of §6.3–6.11
end the same way: 9 of 14 nets open at best. **So `valid, below target` is not an
outcome this pipeline has ever produced on low-boost**, at any cap measured, and
the checkpoint's own expectation is the thing that was wrong rather than the run.

**Three findings the checkpoint produced:**

1. **`Q6` cannot fire in any real run.** `StopState.signatures` is *"every
   failure signature the run has recorded"*, and `ClimbResult` carries none:
   `signatureOf` needs a dump per evaluation and the climb keeps only the dump it
   is standing on. So `place` builds an empty list, `Q6` is `false` on every run,
   and `systematic-cause` is unreachable. It is **not** approximated from the
   failing-constraint ids, which would be a different signature than the one
   `Q6` is specified over. This is exactly *"a `StoppingRule` that never fires in
   a real run"*, which is one of the three defects the checkpoint names — found
   by it, and left standing rather than patched, because `Q6` is Task 19's rule
   and its signature is specified over data the search does not keep.
2. **`A4` reads `held` on a board failing four hard constraints.** On the
   scaffolded board `A4` is `B1-current`, whose tolerance clause does not fire
   while `tau` is unset, so it holds vacuously. The taxonomy is not fooled —
   `outcomeOf` keys on `A1` first and reports `invalid` — but a reader scanning
   the four condition lines sees three failures and one `held`, and the `held`
   line is the one that says it graded nothing. It is `K4` working as written.
3. **The scorer changed under this run, and the run was re-measured against
   it.** The `cost` and `cuts` lines come from the cut-necessity drop test,
   which was uncommitted in this working tree when the checkpoint first ran
   (another task, in flight in the same tree) and landed as `1aa0834` while this
   one was being written. Re-run at that commit: **`F = 37.5`, `C_necessary =
   36`, 36 `CUT` lines, 11 nets open, `κ = 0.75`, two climbs, restart at
   evaluation 384 — identical to the first run in every figure**, with a
   different canonical hash because `pipelineCommit` had moved, which is the
   hash behaving as `V6` requires. Nothing here is provisional on that work any
   more.

   **AND THAT SCORER CHANGE WAS REVERTED ON 2026-10-13, WHICH MOVES NO FIGURE
   ABOVE.** `F` charges the `CUT ` line count again — the departure measured
   inert and is recorded as made, measured and withdrawn in
   `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md`'s deviations
   section. It cannot move these numbers because the two counts AGREED on this
   board: `C_necessary = 36` against 36 `CUT` lines, so `F = 37.5` is the same
   sum either way. What a re-run would print differently is the `cost` line's
   label (`C = 36`, not `C_necessary = 36`) and the `cuts` line's wording, which
   now says `F charges 36 reported CUT line(s); the drop test finds 36 of them
   necessary`. The `cuts` line itself is still printed, once per run.

### 8.3 `V3` — the `B1-frozen` run, and the two refusals it hit

Run as the criterion states it: against the frozen fixture's own model (9 nets,
27 pins), its own footprints, its own `GRID`, **starting from the import-placed
board** — `--import` on the committed EESchema v1.1 export, which produces 8
`PART` lines, 10 `PAD` lines, 27 `PIN` lines and 9 `NODE` lines, agreeing with
the fixture's own counts.

**Refusal 1, the run as committed:**

```
part "board_terminals": no footprint row count is recorded for VeroRoute type
"BLOCK_200MIL3". SPAN gives the footprint's COLUMN count and no dump line gives
its rows, so without an entry there is no rectangle to place or turn. … Recorded:
CAP_FILM, CAP_FILM_WIDE, RESISTOR, SIP5.
```

The starting arm refuses before any candidate exists. `board_terminals` is a
three-pin terminal block that today's low-boost model no longer has, so no run
recorded in §6 ever met it.

**Refusal 2, with that row count supplied in a reverted probe.** The figure is
3, and it was read off the fork rather than guessed: moving `board_terminals` to
open board and turning it clockwise prints `ROTATED board_terminals CW FROM W AT
20,10 HOLES 3x7 TO N AT 18,12 HOLES 7x3`, and the turned part's `SPAN` is 3.
With `["BLOCK_200MIL3", 3]` in the map, the run reaches the grader and refuses
there:

```
no lead span is recorded for footprint "TerminalBlock_Phoenix:TerminalBlock_
Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal": it is not in LEAD_SPANS in
lib/kicad/lead-span.ts, so how far its leads can be bent apart - and how far they
can be brought together - is unknown.
```

That is `PAR2` refusing by name, exactly as it refuses `transistor-preamp-staged`
— the same mechanism, a different board. **The probe was reverted**; the map is
unchanged in the commit.

**A third refusal is behind it and was NOT run.** `PIN_PATTERNS` holds no entry
for that footprint either (grep over `lib/kicad/pin-pattern.ts`), so `HC10`'s
footprint half would refuse next. That one is read off the table rather than
measured in a run, and is labelled accordingly.

**What `V3` therefore reports:** `C` — not measured. `W` — not measured. Nets
complete — not measured. **`B1-frozen`'s bar of `C ≤ 5, W = 0` is not met, and
the run never reached the point where a cut could be counted.** Reading 2 of the
three.

### 8.4 The hand layout's own spans, against the span data as recorded

The plan's first test, run first and read. Every two-lead part of the frozen
layout, its span from its own `PIN` lines, against the bounds for the footprint
the model at `2f62ee1` fits it with:

| part | footprint | span | recorded bounds | |
| --- | --- | --- | --- | --- |
| C18 | `C_Rect_L7.2mm_W3.5mm_P5.00mm` | 3 | 2–4 | inside |
| C19–C23 | `C_Rect_L7.2mm_W2.5mm_P5.00mm` | 3 | 2–4 | inside |
| **R2** | `R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal` | **3** | **5–16** as recorded 2026-10-12; **2–16** as recorded now | **BELOW, then inside** |

`R2`'s minimum as recorded on 2026-10-12 was the manufacturer's own 10.0mm lead
spacing rounded up to four grid steps, and the owner has it in two. **The
reading was that he mounts it upright** — an axial resistor stood on end spans
two steps easily, and the recorded figure was keyed to the `_Horizontal`
footprint. So **the remedy was in the span data**, not in the search, and it was
not a bound to loosen quietly: a span table edited to admit the artifact it is
measured against would be a benchmark grading itself.

**RESOLVED 2026-10-13, and by deriving the missing mounting rather than by
loosening the bound.** The owner: *"It's standard practice to stand resistors on
end when their holes are next to each other. That's should NOT be a failure
condition"*. `minReachPitchMm` now derives an axial family's floor over both
mountings and takes the looser; the flat floor is still 5 holes and still comes
from `Mmin. 10.0`, and the vertical floor comes from the body DIAMETER and the
fold, which are inside one grid step. §4.3 and `docs/stripboard/lead-span.md`
§4.1a carry it, and the plan's deviation entry records the departure from the
spec's `HC9` example. **`R2` is inside its bounds and so is every other two-lead
part on every board in the repository** — the census is in
`.superpowers/sdd/2026-10-10-stripboard-pipeline/vertical-mounting-report.md`.

**The consequence for the benchmark, stated exactly.** The 2026-10-12 reading did
not prove `C ≤ 5, W = 0` unreachable — the pipeline could have reached it with
`R2` at a span of 5 — but it did mean no admissible board could reproduce the
owner's layout. That obstacle is gone. The other three, which are data this task
did not author, remain:

1. `VEROROUTE_FOOTPRINT_ROWS["BLOCK_200MIL3"]` — measured here as 3, needing its
   `CompTypes.h` line and a row in `seed-geometry.test.ts` beside it;
2. a `LEAD_SPANS` entry for the Phoenix `MKDS-1,5/3-5,08` terminal block, which
   is a moulded pin field and would be a `rigid` entry like the pin headers';
3. a `PIN_PATTERNS` entry for the same footprint.

All three are the owner's data to admit, with their provenance; this task did not
author any of them.

### 8.5 The seed-set rate — a diagnostic, and on this board a vacuous one

`placeAcrossSeeds` runs one full-budget `place` per reviewed seed and reports how
many met the `A4` clause of the board that was run. Measured on
`boards/pultec-low-boost` at `evaluationCap = 8` — a reporting check, not a
quality measurement:

| seed | `C` | `W` | bound | outcome |
| --- | --- | --- | --- | --- |
| 0 | 37 | 0 | budget-exhausted | invalid |
| 1 | 37 | 0 | budget-exhausted | invalid |
| 2 | 37 | 0 | budget-exhausted | invalid |
| 3 | 37 | 0 | budget-exhausted | invalid |
| 4 | 37 | 0 | budget-exhausted | invalid |

**Rate: 5 of 5 — and that number says nothing, which is the finding.** `A4` on
the scaffolded board is `B1-current`, whose clause does not fire while `tau` is
unset, so every seed met a clause that graded nothing. The report line now says
so in its own words, and the per-seed rows are what carry information: five
identical runs, every one `invalid`, every one stopped by the backstop. **A rate
is only as informative as the clause it counts**, and on the frozen board — where
the clause is `B1-frozen`'s own `C ≤ 5, W = 0` — it could not be measured at all,
because no run got that far.

**No full-cap sweep was run by this task, and the reason is stated rather than
worked around**: at the committed cap a sweep is five runs of 10,000–16,000
evaluations (§6.11's figures), and the scorer was being changed in this same
worktree while this task ran - a rate measured against a scorer that is about to
change is a rate nobody can reproduce. That work has since landed (`1aa0834`),
so **the full-cap sweep against `boards/pultec-low-boost` is now a measurement
worth taking, and this task did not take it.** What it would answer is how often
a full-budget run reaches the board's own clause, which the reduced-cap table
above cannot say anything about.

### 8.6 What may not be concluded from section 8

- **Nothing here is a measurement of the optimiser against the owner's hands.**
  Reading 1 — *"the optimiser is weak"* — requires `C > 5` on the frozen fixture
  while `HC1`–`HC10` hold, and no candidate on that board was ever graded. The
  §6 runs measure the scaffolded board, which is a different circuit.
- **Nothing here says the scorer is wrong** (reading 3). It says the scorer was
  never reached on the frozen board.
- **The CHECKPOINT 2 figures are this cap's and this commit's.** They were
  re-measured after the cut-necessity work landed and reproduced exactly
  (§8.2's third finding), which says the two tasks' results are consistent and
  says nothing about a full-cap run.
- **A reduced cap measures the chain and not the search.** Every figure in §8.2
  and §8.5 was taken at 8 or 400 evaluations against the committed 20,000, and
  the quality figures this repository has are §6's.

---

## 9. Stated limits from the final whole-branch review

Three reviewers covered the gates and refusals, the search and scoring core, and
the geometry and part data. Most of what they found was fixed; what follows is
what was **recorded instead**, by ruling or because the honest answer is that
closing it is a feature rather than a correction. Each entry is also written
into the code it is about, so a reader who never opens this file still finds it.

**Nothing in this section is a defect that was waved through.** Every one is a
check claiming less than its name suggests, now claiming exactly what it does.

### 9.1 `V2`'s identity is a tautology, and an independent counter is a feature

`tools/stripboard/targets.ts`'s `segmentJoins` **defines** `J = C − N + S_occ`,
and `score.ts` reports that value as `joins`. So the claim that *"the identity
closes on every candidate"* cannot fail: `J` is the rearrangement, not a second
measurement of anything. Nothing in this repository counts net segments
independently — grepped for `segmentsPerStrip`, `netSegments`, `segmentCount`
and `countSegments`: zero hits — so there is no second path for the identity to
close against.

What IS checked per candidate is two bounds, and both are coarse:

- `J ≥ 0` (`targets.ts`'s `negative-joins` refusal). `score.ts`'s own comment
  measures it toothless: with the `cutState` clause disabled, the `UNRESOLVED`
  fixture raised **no refusal at all**, because its terms still give `J = 1`.
- `J ≤ P − N` (`clustering`'s `clustering-undefined` refusal), i.e.
  `C + S_occ ≤ P`.

The identity itself is checked **once**, against COST §1.6's hand-counted
`J = 1` on the frozen low-boost dump (`tests/stripboard/score-identity.test.ts`).
That is good evidence, and it is evidence about one board rather than about every
candidate.

The honest wording, and the one the code now carries: *`J` is derived from `C`,
`N` and `S_occ`; the per-candidate checks are the two bounds; the identity is
checked once, against COST, on one board.* An independent segment counter —
walking each strip's copper and counting the runs of each net — would make `V2`
a real cross-check. That is a feature nobody has built, not a fix to this one.

### 9.2 `Q1`'s at-floor predicate requires the dump's `N` to equal the model's

**VERIFIED, and NOT the unsatisfiability the review suspected.**
`tools/stripboard/stop.ts`'s `q1` mixes two sources, which is deliberate — the
floor is a model quantity — and the consequence is worth stating:

- `targets.cutFloor` and `targets.netCount` are **model**-sourced
  (`targets.ts`).
- `score.joins` is built from the **dump**'s `N`: `score.ts` reads
  `netCount = Object.keys(dump.nodes).length` and passes it to `segmentJoins`.

Solve the clauses together on a board with `N_model ≤ R`: `cutFloor = 0` forces
`C = 0`; `occupied = min(N_model, R) = N_model`; and `joins = 0` then forces
`0 − N_dump + N_model = 0`, i.e. **`N_dump === N_model`**.

So `Q1` carries a fourth condition nobody states: *the candidate's dump must
report the same net count as the model it is graded against.* It is **not**
unsatisfiable. `tests/fixtures/stripboard/pultec-low-boost-imported.dump` has 14
`NODE` lines against that model's 14 nets, so on the `--import`-placed board
every run starts from, the clause holds and `Q1` is reachable.

Where it CANNOT fire is on a layout whose dump disagrees with its model, and
COST §2.3 records all five committed Pultec hand layouts as exactly that — the
oracle in `tests/stripboard/targets-oracle.ts` carries both numbers per board
(low-boost: `nets: 14`, `layoutNets: 9`). On such a board `Q1` is unsatisfiable,
and `Q1` is the only optimality claim this pipeline may make (CRITERIA `Q1`).
Nothing in `stop.ts`, `report.ts` or `floorNote` said so, so a reader would read
*"`Q1` did not fire"* as *"the board is above its floor"* rather than as *"the
question was not askable on this board."* `stop.ts`'s `q1` now says it.

### 9.3 The span table's named part is not the part the catalogue buys

`lib/kicad/lead-span.ts` records the DIN0207 family's geometry as **Vishay
MBB/SMA 0207**'s — `bodyLengthMm: 6.5`, `bodyDiameterMm: 2.5`,
`leadDiameterMm: 0.6`, `leadLengthMm: 28.0`, `manufacturerMinPitchMm: 10.0`,
cited to Vishay document 28766 rev 05-Oct-09. `parts/resistor-*-0207.json` —
nine files — record the part actually fitted to that footprint as **Yageo
MFR-25FBF52-xxx**. `grep -rn "MFR-25\|Yageo" lib docs/stripboard` returns
nothing: the geometry stack has never heard of the part the BOM orders.

**The bounds do not move today.** Traced arithmetically: Yageo's worst-case body
is 6.8mm, so the flat floor is `6.8 + 2 × 0.8 = 8.4mm` → 4 steps → 5 holes, the
same figure, and the vertical floor is still grid-bound
(`2.6/2 + 0.6/2 = 1.6mm < 2.54mm`).

**What is broken is the provenance, which is the thing the rule protects.**
`lead-span.ts`'s own header: *"A FAMILY HAS NO DATASHEET; A PART DOES … Fitting a
different part in the same case size is a reason to come back here, not a reason
to trust these."* **Yageo's lead length is recorded nowhere**, and lead length is
the only dimension that sets the MAXIMUM. The recorded 16-hole ceiling is
clamped by `TOOL_MAX_SPAN_HOLES` on a **28mm Vishay lead**; nobody has
established that the Yageo part's lead also clears it. That is a reach claim
resting on the wrong datasheet.

**No lead length is invented here.** The gap is recorded in `MBB0207`'s own
comment, which now says the Vishay figures stand in for the fitted part and which
dimension is unverified. And `tests/kicad/lead-span.test.ts` now ties every
`parts/*.json` resistor `mpn` to some `LEAD_SPANS` entry's `geometry.mpn`, so the
divergence cannot widen silently — it is a FAILING test the moment a tenth part
file names a manufacturer the span table has not heard of, which is how this one
should have surfaced.

### 9.4 `HC10` reads a different span table from `HC4`, `HC5` and `HC9`

`HC4`, `HC5` and `HC9` take their bounds from `input.spans` through `spanFor`
(`tools/stripboard/constraints-physical.ts`). `HC10`'s footprint half calls
`admitPattern`, which reads the module-level `LEAD_SPANS` **directly**
(`lib/kicad/pin-pattern-model.ts`, its `has` guard and its `leadSpanFor` call),
and nothing routes `input.spans` to it. So one grade can consult two span tables.

It is harmless today only because every injector spreads the real map
(`tests/stripboard/synthetic-footprints.ts`), so no recorded footprint is
shadowed. **One extra optional parameter would close it** — the same seam
`pinPatternFor` and `leadSpanFor` already have. Recorded with that note rather
than left as "if that is ever wanted": the cost of wanting it later is a verdict
in which three constraints use a revised figure and `HC10` uses the old one,
which cannot be explained from the inputs.

### 9.5 Six smaller limits, each now stated where it lives

- **`reportInputOf` hardcodes `binding: undefined`** (`tools/stripboard/place.ts`
  and `stop.ts`), so `REP2`'s requirement that an `A2` failure name what bounded
  the clustering is never met in production — every report says *"No binding
  constraint was stated"* — and the `span` and `packing` arms of
  `BindingConstraint` are dead outside tests, as is
  `report-binding-rule-disagrees`. It is safe in the conservative direction:
  `K3`'s ratchet can never be moved on a production run. Already recorded as
  observed behaviour in §7; repeated here because it is a stated limit rather
  than a hidden one.
- **`ringSpan()` is the one `LeadSpan` its own derivation does not reproduce.**
  `tests/stripboard/synthetic-footprints.ts` declares `kind: "rigid"` with
  `fixedSpanHoles: 4` but `minSpanHoles: 2, maxSpanHoles: 16`, where
  `deriveSpanHoles` on that geometry returns `[4, 4]`. It is test-only,
  deliberate — the wide band keeps `HC4`/`HC5` from refusing the ring before
  `HC10` can grade it — and marked `SYNTHETIC` in every field; it escapes
  `tests/kicad/lead-span.test.ts`'s "every recorded integer is reproduced by the
  arithmetic" because that test iterates `LEAD_SPANS` and this entry is injected.
  The deviation is stated at the fixture.
- **`admitPattern`'s disjunctive band check reads `minSpanHoles` too** — a third
  consumer the stand-on-end widening audit missed. See the deviation entry in
  `docs/superpowers/plans/2026-10-10-stripboard-pipeline.md`, which now carries
  it.
- **`score-objective.test.ts`'s hand arithmetic was stale to the old `ρ_s`** —
  it read `2.25 … 1 + 0.25 + 1`, the derivation for `ρ_s = 1`, while the
  assertion and its guard were at `0.25`. Corrected to `1.5 … 1 + 0.25 + 0.25`.
- **`spread.test.ts`'s test NAME contradicted its body**, claiming reversing the
  reference reverses the spread order where the body asserts (correctly, and
  explains why) that it does not. Renamed.
- **The footprint-name sweep covers what programs read, not what prose cites.**
  `tests/kicad/footprint-names.test.ts` closes the footprint axis the way
  `symbol-names.test.ts` closed the symbol one, and it is WIDER than the symbol
  sweep: besides the declaration shapes it also checks every `<Library>:<Name>`
  literal in a `.ts` file whose library half is an installed footprint library,
  wherever it appears, because both footprint names this repository has shipped
  that nobody can look up were a real library plus a name that library does not
  hold. Two things are deliberately outside it. **Markdown under `docs/` is not
  swept** — it discusses footprint names, including fictional ones held up as
  cautionary examples, and no text sweep can tell a cited name from a claimed
  one. **`circuits/pultec/generated/three-band-eq.net.xml` is not swept** — it is
  an export of the owner's own schematic and names footprints from his personal
  `OL Library`, which is on no other machine. The first run of the sweep found
  nine fictional names: five were replaced with the real name verified on disk,
  three are recorded in `CONSTRUCTED_FOR_A_REFUSAL` with why no installed
  footprint has the property the refusal under test is about, and one took the
  now-enforced `SYNTHETIC:` prefix. The `SYNTHETIC:` exemption checks the name
  half against every installed library rather than the lib id, because the prefix
  replaces the library and a lib-id lookup could only ever answer
  "no such library" — a tautology. Both the sweep and that enforcement were
  driven with a negative control that fails alone.
- **The mid section's eleven-position selector has no part chosen, so its
  netlist cannot be emitted.** `Switch.kicad_sym` has `SW_Rotary_1x3_MP` through
  `SW_Rotary_1x9_MP` and `SW_Rotary_1x12` and nothing at `1x10` or `1x11`, and
  choosing between a 12-way part stopped at 11 and a genuine 11-detent part is
  the owner's decision. An earlier revision carried a deliberately-not-a-lib-id
  sentinel string in `part.symbol` so that emission would succeed; that is the
  fallback this project's rules forbid, and both the constant and the string it
  held are **deleted** rather than deprecated.
  `rotarySymbolFor` now returns `undefined`, the field is omitted, and
  `valueFor` refuses naming `SW_MID`. **Composition is unaffected** — residency
  reads `part.footprint` (`onBoard` in `tools/stripboard/targets.ts`), so `mid`
  still composes and still derives targets (measured: `N = 28`, `P = 96`). The
  limit is therefore *mid's netlist export refuses until the part is chosen*, and
  it is pinned by two tests in `tests/circuits/pultec-boards.test.ts` that must be
  changed deliberately on the day it is.
- **`kinds.ts`'s SPICE refusal named a concept rather than a file**, and
  **`pad-provenance.ts`'s comment was off by one** about where a placed pad's
  provenance field begins — "3 or 4" against a slice of 5 or 4. Both corrected in
  place.

## 10. Task 25 — admitting `HC5`, `HC8`, `HC9` and `HC10` to `make check` (`G4`)

`OB2` cleared on 2026-10-13: the owner reviewed
`docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` and
approved it, which is what `G4`'s second admission condition reads against. The
four verifiers were then wired into `tools/perfboard/check.ts` through
`tools/stripboard/buildability.ts`, and this section is what the run measured.

**`HC6` was deliberately not admitted** (`OB4`), so `make check` still says
nothing about a layout's extent against the owner's stock.

### 10.1 The tally, before and after, over all eleven declared boards

| | before | after |
| --- | --- | --- |
| `ok` | 4 | **2** |
| `FAIL` | 7 | **9** |

The two boards the admission turned red are below. **Neither is a violated
bound**: both are `PAR2` refusals — a footprint whose lead span nobody has read
off a datasheet — so the gate reports NOT GRADED rather than NOT HELD, and both
are red because a refusal is never a pass.

| board | footprint with no recorded span | parts fitted with it | status in the span tables |
| --- | --- | --- | --- |
| `pt2399-core` | `Capacitor_THT:C_Disc_D5.0mm_W2.5mm_P2.50mm` | `C1`, `C4`, `C5`, `C6`, `C8`, `C9`, `C11`, `C12`, `C13`, `C14` | in `UNSOURCED`, with §9.3's reason: no datasheet lead length covers this board's values |
| `pt2399-core` | `Capacitor_THT:CP_Radial_D5.0mm_P2.50mm` | `C7`, `C10` | in `UNSOURCED` |
| `transistor-preamp-staged` | `Connector_PinHeader_2.54mm:PinHeader_1x03_P2.54mm_Vertical` | `RV5`, `RV6`, `RV7` | in neither `LEAD_SPANS` nor `UNSOURCED` |
| `transistor-preamp-staged` | `Capacitor_THT:CP_Radial_D10.0mm_P5.00mm` | `C7` | in neither `LEAD_SPANS` nor `UNSOURCED` |

`measure` refuses on the first such footprint it reaches, so `make check` names
one per board per run; the table above was enumerated over every placed part.
**`transistor-preamp-staged`'s two are the pair CHECKPOINT 1 already records as
being authored on another branch**, and this task neither supplies nor guesses
them.

### 10.2 No span bound is violated anywhere in the tree

`HC5` and `HC9` **hold on every board where they can be graded** —
`transistor-preamp-buffered`, `transistor-preamp-feedback`,
`transistor-preamp-lab` and `transistor-preamp-loop`. So the measured answer to
*"does admitting the reach bounds refuse a board a person built"* is no: what
refuses a board is missing data, not a span the part cannot make.

### 10.3 What the four found on boards that were already failing

Reported because the section now prints on every red board, and these are new
measurements rather than restatements:

| board | constraint | what it names |
| --- | --- | --- |
| `pultec-hi-boost`, `pultec-hi-cut`, `pultec-low-boost`, `pultec-low-cut` | `HC8` | NOT GRADED: `reference-pin-not-on-board` — a reference pin with no `PIN` line, because `make update` added parts that arrive unplaced. `--check` already reports the same parts as `blocked`. |
| `transistor-preamp-lab` | `HC8` | NOT HELD: `CUT_STATE UNRESOLVED`, which is `HC2`'s cause and `HC2`'s remedy |
| `transistor-preamp-lab` | `HC10` | **NO VERDICT**, placement half: `C3` (`CP_Radial_D5.0mm_P2.00mm`, `DIRECTION W`), pins 1 and 2 at `10,8` and `10,9` on strip 10, and `CUT_STATE UNRESOLVED` is not `COMPUTED`, so whether anything divides those holes cannot be read. `HC2`'s cause and `HC2`'s remedy. **Read before 2026-10-13 as NOT HELD on the geometry** — one footprint row on one strip — which §3.4b retired |
| `transistor-preamp-loop` | `HC8` | NOT HELD: 15 opens, 0 shorts |
| `transistor-preamp-loop` | `HC10` | **HELD** since 2026-10-13: all 25 of its footprint rows that share a strip are divided by the board's own cuts, `C1` (`CP_Radial_D8.0mm_P3.50mm`, `DIRECTION W`) among them — pins 1 and 2 at `1,31` and `1,33` with `CUT 1,31 1,32` between them. **Read before the amendment as NOT HELD**, with the remedy *turn the part*, which was wrong advice about a correct layout |
| `pultec-mid` | — | no section at all: its netlist export refuses before the binary is reached (§9.5, `SW_MID` has no part chosen) |

**The two electrolytics WERE the live instance of the question §3.4 carried** —
whether a two-lead row along a strip should refuse when a cut separates its holes
— and the owner settled it on 2026-10-13. His words, verbatim and complete:
*"follow your recommendation on HC10."* §3.4b is the record: the measurement, the
owner-settled rule, the derived predicate, and what an unresolved `CUT_STATE`
means for it. **The tally in §10.1 is unchanged by the amendment — 2 `ok` / 9
`FAIL`, with no board changing state** — because both boards were already failing
on `HC8` for reasons `HC10` never owned.

### 10.4 A refusal is carried in the report rather than thrown out of it

`HC8`'s distinction between *this constraint does not hold* and *this board
cannot be graded* is kept in the WORDING and not in the control flow:
`checkPerfboard` renders a refusal as a `NOT GRADED` section
(`refusedBuildability`) instead of letting it escape. **The reason is the
output.** A refusal that escaped replaced the binary's own report with its own
text, and the four Pultec boards in §10.3 then lost their list of incomplete and
blocked nets — the half of `make check`'s output that says what to go and fix.
Both now print. `ok` is false either way, so nothing is softened.

**What it costs, stated rather than discovered:** a defect in the grader itself
now reads as `NOT GRADED - <message>` under `FAIL <board>` rather than as a
crash. It is still loud, still red, and still quotes the message; the one verdict
it cannot produce is a board that looks clean.

### 10.5 `G4`'s four admission conditions, each against the evidence

1. **The constraint is one CRITERIA states.** `ADMITTED` carries the four ids and
   `tests/stripboard/buildability.test.ts` asserts each is in `CONSTRAINT_IDS`.
2. **The criterion has been reviewed by the owner.** The whole of CRITERIA as it
   stood at `d0d1b3f`, reviewed 2026-10-13; the record is commit `70dba2d`.
3. **The check is independently tested, including negatively, naming a fixture it
   must reject.** `tests/perfboard/check.test.ts` drives `checkPerfboard` over
   `span-above-reach` (`HC5`), `span-below-minimum` (`HC9`), `two-nets-shorted`
   (`HC8`), `round-pin-pattern` (`HC10`'s footprint half) and
   `row-along-a-strip-two-nets` (`HC10`'s placement half, renamed and re-netted
   by §3.4b's amendment), with `healthy` and `row-along-a-strip-one-net` as the
   positive controls. Each assertion is made against **one constraint's own line** in the
   report, because the section prints all four and a held constraint's prose
   names parts, footprints and other constraints' ids — a regex over the whole
   report passes for the wrong reason, which is the defect class this plan hit
   five times.
4. **Every threshold is read from the rules file or a committed data module, and
   refuses rather than defaulting.** The bounds come from `LEAD_SPANS`,
   `PIN_PATTERNS` and `stripboard/rules.json`; §10.1 is that refusal firing on
   two real boards, and a test drives it through `make check`'s own path with
   `CP_Radial_D10.0mm_P5.00mm`.

**One limit this task did NOT make worse**, since §9.4 records it: `HC10` reads
the module-level `LEAD_SPANS` while `HC5` and `HC9` read `CheckInput.spans`. The
`make check` path injects NO span table, so both read the same map and the two
cannot diverge here. Closing §9.4 remains a deliberate edit.

## 11. Task 2 of the buildable-layouts plan — the SPACING gesture, measured against the fork: **227 of 315 candidates strictly reduce `C`, none raises the open-net count, and the kind exhausts itself in seven steps**

**WHY THIS SECTION EXISTS.** `tools/stripboard/moves-space.ts` proposes a pad's
move out of the row `--import` packs it into, and its first draft carried a
derivation of what one such gesture does to the cost that was **wrong in three
ways and wrong in the direction that understates the gesture** — a reader
budgeting reachability off it would have read a seven-fold smaller improving set
and could have misdiagnosed a null result as *"the gesture cannot be accepted"*.
The review of 2026-10-13 caught it. Everything below is measured against the
pinned binary rather than derived, and the code's comments now cite this section
instead of restating it.

### 11.1 Method, and the one place the board differs from the committed fixture

```
  VR=.tools/veroroute-perfboard/veroroute.app/Contents/MacOS/veroroute
  (export the low-boost netlist through the repository's own path:
   loadDeclaration(boards/pultec-low-boost/perfboard.json) into exportNetlistFor)
  "$VR" --import low-boost.net -o imported.vrt --strips horizontal
  "$VR" --dump-board imported.vrt                       # the base board
  "$VR" --move imported.vrt --ref <pad> --to <r>,<c> -o cand.vrt
  "$VR" --author cand.vrt --op autofill -o painted.vrt  # AutoFillVero
  "$VR" --check painted.vrt --netlist low-boost.net     # the open-net count
  "$VR" --dump-board painted.vrt                        # the CUT lines
```

`.tools/veroroute-perfboard/.built-commit` is
`ed6c5a64eb5125346e8b0bc0b434b332c7750bb6`, which is what `veroroute.pin` pins.
**`C` is the painted board's own `CUT` line count and `openNets` is
`--check`'s own `incomplete` net count** — neither is this repository's
arithmetic.

**The board is a REGENERATED import and not the committed dump**, because a
`--move` needs a `.vrt` and the fixture is a `--dump-board` capture. Diffed
against `tests/fixtures/stripboard/pultec-low-boost-imported.dump`, the
regeneration agrees on every `PART` line, every `PAD` hole, every `PIN` line and
all fourteen `NODE` lines, and differs **only** in the selector pads' VALUE
field — today's model gives `SW_Rotary_1x6_MP` where the capture says
`SW_Rotary`. Nothing in this pipeline parses that field.

**TWO REFERENCE NETLISTS ARE IN PLAY AND THE SPLIT IS DELIBERATE.** The gesture
set is enumerated against the FROZEN nine-net export, which is what
`tests/stripboard/moves-space.test.ts` uses and what makes the 315 below
comparable with the suite; `--check` runs against the board's own fourteen-net
export, because that is the netlist the board was imported from and a
completeness verdict against any other netlist is a verdict about another
circuit. §11.2 shows this split is not inert.

Base board: **`C` = 38 cuts, 13 of 14 nets open.**

### 11.2 `dC` over all 315 candidates — and the model that reproduces it, against the one that does not

Every one of the 315 gestures `spacingMoves` proposes on the base board was
applied, painted and dumped. **All 315 were accepted by `--move`** — no refusal,
which is the narrowing by `occupancyAfter` doing its job.

| `dC` | count | what it is |
| --- | --- | --- |
| **−2** | 33 | the pad's departure MERGES two blocks of one net that it sat between |
| **−1** | 194 | the pad's departure removes its own block |
| **0** | 84 | the departure removes no block, or removes one and the arrival adds one |
| **+1** | 4 | the departure removes no block and the arrival adds one |

**227 of 315 strictly reduce `C`.** No `move` can create or destroy a `WIRE` or
a `SOLDER` line, so `W` and `B` are fixed and **`dF = dC`**: 227 candidates
strictly improve `F` on their own, with no plateau machinery and no new rule.

**THE IDENTITY THAT REPRODUCES THE FORK, stated exactly, because a near-miss
version of it is what went wrong.** With `blocks_s` the number of maximal runs
of ONE net in the sequence of OCCUPIED holes along strip `s`, taken in position
order:

```
  C = sum over occupied strips of (blocks_s - 1) = sum(blocks_s) - S_occ
```

A model of that identity, run over the same 315 and keyed by the **fourteen-net**
export, reproduces the fork's histogram **exactly** — `−2:33, −1:194, 0:84,
+1:4`, every bucket. Keyed by the **nine-net** frozen export instead it gives
`−2:33, −1:201, 0:77, +1:4` and claims **234** reducing rather than 227: the
frozen export carries none of the other Pultec sections' nets, so the model sees
no net at all on most of rows 1 and 2 and under-counts seven abutments the fork
charges for. **That is the §11.1 split not being inert, and it is also the reason
a figure derived from the frozen reference may not be reported as a cut count.**

**THE RELATION BETWEEN THE TWO ADJACENCIES IS ONE-DIRECTIONAL.** Two holes in
adjacent positions are necessarily consecutive in occupation order, so every
abutment `tools/stripboard/moves-space-measure.ts` counts IS a block boundary
and a cut; the converse fails. The packing measure is a LOWER BOUND on a strip's
boundaries, never an over-count — which is why it can reach zero on the owner's
row while that row still carries five cuts.

**TWO THINGS THE BLOCK IS NOT.** It is not one block per `(net, strip)` pair —
a net appearing twice on a strip with another net between it is TWO blocks and
two cuts, and the pair-counting reading was the first draft's first error. And a
block boundary is **occupation-order adjacency, not physical adjacency**: two
holes of different nets two apart with nothing between them are still
consecutive in the sequence and still take a cut.

### 11.3 The controlling condition for `dC < 0`, and it is a perfect predictor

The first draft's condition was *"the net keeps no other hole on the strip it
leaves"*. That is satisfied by only **32** of the 288 free-strip destinations
while **227** achieve `dC < 0`, so it is wrong by about seven-fold in the
direction that understates the gesture.

**The controlling condition is that the pad's hole is its OWN NET-BLOCK on the
strip it leaves** — both of its occupation-order neighbours on that strip are
other nets, or absent. Tested as a predicate over the nine pads the gesture
names:

| pad | its own block? | fork `dC < 0` |
| --- | --- | --- |
| `RV_LO_BOOST_1` | yes | **35 of 35** |
| `SW_LO_BOOST_2` … `SW_LO_BOOST_7` | yes | **32 of 35** each |
| `RV_LO_BOOST_2` | no | **0 of 35** |
| `SW_LO_BOOST_1` | no | **0 of 35** |

`35 + 6 x 32 = 227`, which is the whole improving set: **the predicate has no
false positive and no false negative on this board.** The three misses per `SW`
pad are its three occupied-strip destinations, where the departure's `−1` is
cancelled by the arrival's `+1`; `RV_LO_BOOST_1` misses none because its
departure is a `−2` (it sits between two `lo_boost_in` holes, which merge) and
survives an arrival's `+1`.

`RV_LO_BOOST_2` and `SW_LO_BOOST_1` are the two pads that sit INSIDE their own
net's block — `lo_boost_in` holds columns 24, 25 and 26 of row 0 contiguously —
so their departure removes no block and **70 of the 315 candidates (22%) cannot
reduce `C` at all**: 66 are `dC = 0` and 4 are `dC = +1`.

**THEY ARE NOT NARROWED OUT, AND THE REASON IS NOT OVERSIGHT.** The own-block
predicate above would cut 315 to 245 and would remove exactly those 70. 66 of
them are `dC = 0` candidates whose benefit, if any, is in `RANKING`'s `A_occ`
and wirelength positions, which `strictlyBetter` consults precisely at
`dF = 0` — and §6.11 records what happened the last time a kind's candidates
were excluded on a first-order cost argument: *"they were enumerated in one
partial sweep and one of them was in fact accepted, so 'none could ever be
taken' would be false."* Nothing has measured whether any of the 66 is accepted.
The narrowing is RECORDED here as available, with its exact size, for a task
that has a run behind it.

### 11.4 The open-net count: **zero of 315 raise it**, and why that is a property of this board rather than of the gesture

`tools/stripboard/climb-accepts.ts`'s `strictlyBetter` compares `openNets`
**before** `F`, so a candidate that opens a net is rejected whatever it does to
the cost. The first draft's derivation never mentioned that gate.

Measured over all 315: **`dOpenNets = 0` for every single one.** The histogram
has one bucket. The subset the review flagged — the gestures naming a pad on
`lo_boost_in` — is **70** of them (`RV_LO_BOOST_2` and `SW_LO_BOOST_1`, 35
strips each; the review's figure of 64 is not reproduced, and
`RV_LO_BOOST_3` is also on that net but abuts nothing and so is named by no
gesture at all), and all 70 are `dOpenNets = 0`.

**The reason, and it is why this must not be read as a general result.**
`lo_boost_in` is ALREADY one of the 13 nets `--check` calls incomplete on the
base board: its holes on row 0 are column 22 and then columns 24, 25, 26, with
the net-`0` hole of `RV_LO_BOOST_1` at column 23 between them, so the cuts
either side of column 23 already split it. **A net already counted cannot raise
a count of nets.** On a board where such a net were whole, a gesture that lifted
one of its holes onto a strip of its own WOULD raise `openNets` by one and be
rejected outright — so the gate is named in the derivation as the first gate it
is, measured inert here, and not assumed inert elsewhere.

### 11.5 The per-`(pad, strip)` collapse: the identity behind it is weaker than stated, and it costs **nothing** on this board

`spacingMoves` proposes at most one destination per `(pad, strip)` — the first
in ascending position that `occupancyAfter` admits — and justified it by *"a
strip conducts along its whole length, so two destinations on one strip put the
pad on the same copper and score the same `C`"*. **That is true of a FREE strip
and false of an occupied one**, because a destination's occupation-order
neighbours change with its position, which is §11.2's second paragraph applied
to the arrival instead of the departure.

So every admissible destination on each of the three occupied strips was scored
individually against the fork — **27 `(pad, strip)` slots, 157 destinations**:

| pad | strip 0 | strip 1 | strip 2 |
| --- | --- | --- | --- |
| `RV_LO_BOOST_1` | 33, 34 → **−1, −1** | 31–34 → **−1 each** | 23–34 → **−2 each** |
| `RV_LO_BOOST_2` | 34 → **+1** | 31–34 → **0 each** | 23–34 → **+1 each** |
| `SW_LO_BOOST_1` | 34 → **+1** | 31–34 → **0 each** | 23–34 → **+1 each** |
| `SW_LO_BOOST_2` … `_7` | **0 each** | **0 each** | **0 each** |

**In 0 of the 27 slots is the ascending-first hole worse than the best hole on
that strip**, and in 0 of them does a strictly better hole exist. Every
destination on one strip scores identically for one pad.

**The mechanism, so this is a measurement with a cause rather than a
coincidence.** `--import`'s first-fit sweep leaves each occupied strip's free
holes in ONE contiguous run at the high end — row 0 free from column 33, row 1
from 31, row 2 from 23 — so every proposed hole on one strip has the same
occupation-order predecessor (that strip's last occupied hole) and no successor,
and therefore the same arrival cost. **The collapse is therefore sound on this
board for a reason the rule does not state**, and the honest standing is the one
`UNIT_DELTAS` gives itself: it is not known to be the right shape, changing it
needs a run behind it, and the run done here says changing it buys nothing. A
destination-choice rule was written and NOT taken, because it would have added a
second notion of adjacency to the module for a measured benefit of zero.

### 11.6 What it costs, with the units kept straight, and **the kind exhausts itself**

The first draft's cost figures were right in direction and wrong in both
magnitudes, and mixed a run's budget with a climb's rounds.

**The cap is RUN-LEVEL and divided.** `tools/stripboard/search.ts` hands each
climb `rules: { ...input.rules, evaluationCap: remaining }`, so the 20,000 of
`stripboard/rules.json` is shared across the restart schedule. **§6.9's round
counts are PER CLIMB**: `random` seed 3 is 11,842 evaluations over 63 rounds,
which is **188 evaluations per round** — and every row there spends 4,314 to
15,218 in one climb, so those rows are each a run of their own seed rather than
five climbs sharing one cap.

**So the marginal multiplier mid-climb is about 2.7x and not 6.3x.** 315 added
to a round averaging 188 is a round of about 503. The 6.3x figure (59 to 374) is
**round 0 on the import-placed board only**, which is the smallest round a climb
has and therefore the largest multiplier it will ever show.

**The MODEL pass is not where the cost is**, and the figures are measured rather
than assumed: `spacingGestures` 2.0 ms per call, `spacingMoves` 6.1 ms, and
`enumerateMoves` **31.3 ms with this generator removed and 40.9 ms with it** — so
about 9.6 ms more enumeration per round, against a 374-evaluation round that at
4.6's governing 11.71 ms per invocation and four invocations per evaluation is
about 17.5 seconds. A fifth of one percent.

**And the gesture is SELF-LIMITING, which is the figure that matters and was
absent.** Its guard is a strict reduction in a pad's own abutment count, so a
pad that leaves the row stops being named. Measured by applying one spacing
gesture at a time (the lowest free strip for the first pad still abutting — a
stand-in for a step the climb might take, chosen here rather than by `accepts`,
which is the caveat on the sequence and not on the decay):

| step | `enumerateMoves` | of which spacing | pads still abutting | gesture applied |
| --- | --- | --- | --- | --- |
| 0 | 374 | **315** | 9 | `move RV_LO_BOOST_1 to 3,0` |
| 1 | 306 | **245** | 7 | `move SW_LO_BOOST_1 to 3,2` |
| 2 | 276 | **210** | 6 | `move SW_LO_BOOST_2 to 3,4` |
| 3 | 243 | **175** | 5 | `move SW_LO_BOOST_3 to 3,6` |
| 4 | 211 | **140** | 4 | `move SW_LO_BOOST_4 to 3,8` |
| 5 | 178 | **105** | 3 | `move SW_LO_BOOST_5 to 3,10` |
| 6 | 147 | **70** | 2 | `move SW_LO_BOOST_6 to 3,12` |
| 7 | 79 | **0** | 0 | — none proposed |

**Unpacking the row completely costs about 1,260 extra evaluations in total**
(the spacing column summed), which is under 11% of one §6.9-sized climb's
11,842 — not a 6.3x tax on every round. Seven applications and the kind is
silent.

**AND THE DESTINATIONS THE ASCENDING TIE-BREAK PRODUCED ARE
`3,0 / 3,2 / 3,4 / 3,6 / 3,8 / 3,10 / 3,12` — every second hole of strip 3.**
Spacing with a gap of one hole, EMERGENT from the measure, with no gap encoded
anywhere in the module: a pad declines a hole whose strip-neighbour is another
net, so the next pad lands two holes along. The owner's own row uses a gap of
two. That the arrangement has the same shape as his is evidence the measure
points the right way and **is not a claim that the climb would choose this
sequence**, which is §11.7's first limit.

### 11.7 What may not be concluded from section 11

1. **No search ran.** Every figure above is one gesture applied to one board, or
   a hand-picked ladder of them. `accepts` was not consulted once, so nothing
   here says any of the 227 improving candidates is ACCEPTED in a round — a
   round's winner is the best of its siblings, and the spread, gather and
   cluster candidates compete in the same round. Task 3 is what measures that,
   and **§12 is that measurement**: fifteen of the run's 152 accepted gestures
   are spacing gestures, two of them accepted while `F` rose.
2. **It is one board.** The ten pads of low-boost's `PADS3` and `PADS7` on one
   `--import` output. The other four Pultec sections have their own pad counts
   and their own packing, and §11.3's predicate was tested here and nowhere
   else.
3. **`dOpenNets = 0` is this board's answer and not the gesture's**, for the
   reason §11.4 gives in full.
4. **The 227 is `dF` and not an acceptance.** `accepts`' first clause is
   no-regression against the PREDECESSOR over all ten hard constraints, and a
   pad landing on row 34 of a 35-row grid grows the pin extent; `HC6` already
   fails on this board for width, so no regression arises here, but that is a
   property of a board that is already failing.
5. **A FIGURE RECORDED ELSEWHERE DOES NOT REPRODUCE, and it is recorded here
   rather than corrected in place because it predates this work.**
   `tools/stripboard/movable.ts` states, measured 2026-10-13, *"0.0218 ms per
   call [for `movableRefs`], and 4.7 ms for a whole `enumerateMoves` on the real
   low-boost board"*. The first reproduces here at **0.0279 ms** over 2,000
   calls — the same order, machine noise. The second does not: the same call on
   the same fixture with the spacing generator removed is **31.3 ms**, about 6.6
   times the recorded figure. That file's own instruction is *"If a later task's
   round times look wrong, this is the first place to look and the figures above
   are the before"*, so this is that observation being written down. Nothing
   above depends on either figure.
6. **The review's own histogram is not reproduced bucket for bucket.** It
   reports `−2:32, −1:195, 0:82, +1:6`; the fork gives `−2:33, −1:194, 0:84,
   +1:4`. Both total 315 and both agree exactly on **227 strictly reducing**,
   which is the figure every conclusion above rests on. The two disagree by one
   in the `−2`/`−1` split and by two in the `0`/`+1` split, and the
   disagreement is not resolved here: the numbers above are the painted boards'
   own `CUT` lines, and §11.2's fourteen-net model of the identity reproduces
   them exactly, which is the strongest evidence this section can offer for
   them.

## 12. Task 3 of the buildable-layouts plan — the two gestures measured in a real climb: **six cuts and three nets, `HC6` flips to holding, and `HC1` still does not hold**

**THE DELIVERABLE IS THE NUMBER AND THE NUMBER IS NOT A PASS.** On
`boards/pultec-low-boost`, arm `import`, the committed seed list and the
committed cap, the spacing gesture takes the reported board from **34 cuts and
10 of 14 nets open** to **28 cuts and 7 of 14 nets open**, and **`HC1` is false
on both**. No board is finished. §11 measured one gesture against the fork and
said *"Task 3 is what measures that"* — this is that measurement, and §11's
reachability figures survive it: the gesture IS accepted in a real climb,
fifteen times, and it does not close the board.

### 12.1 The two arms, the command, and how the "before" arm was obtained

```
  commit        722c13d  (pipelineCommit, recorded in every run.json below)
  board         boards/pultec-low-boost      arm  import
  rules         stripboard/rules.json unedited - seeds [0, 1, 2, 3, 4],
                evaluationCap 20000, tau null, worseAcceptance null
  fork          ed6c5a64eb5125346e8b0bc0b434b332c7750bb6 (veroroute.pin, .built-commit)

  AFTER   make -C boards/pultec-low-boost place SEED_ARM=import
  BEFORE  the same run with the SPACING GENERATOR'S OUTPUT EXCLUDED
```

**NOTHING IN THE WORKING TREE WAS EDITED TO PRODUCE EITHER ARM.** Tasks 1 and 2
have both landed, so "before" had to be reconstructed, and it was reconstructed
with a **Bun runtime preload** that rewrites two modules AT LOAD TIME:
`tools/stripboard/moves.ts`, whose one `spacingMoves(...)` spread in
`enumerateMoves` returns `[]` in the before arm, and `tools/stripboard/climb.ts`,
where one line beside the acceptance decision records the gesture, its verdict
and the candidate's `openNets`/`F`/`C`. `git status` was clean before and after;
there is no edit to revert and none was made. **A reverted edit would have been
the alternative and this is strictly better: there is no window in which the
tree differs from `HEAD`.**

**THE EXCLUSION IS EXACT, MEASURED RATHER THAN ASSERTED.** On the committed
`pultec-low-boost-imported.dump` fixture with the frozen nine-net reference,
`enumerateMoves` returns **374** moves in the with-spacing arm and **59** in the
without-spacing arm; the removed set is **315** keys, it is **exactly** the set
`spacingMoves` returned, and it is **disjoint** from the 59 that survive. Those
are §11's own figures reproduced at the enumeration seam, which is what makes
the A/B a one-variable comparison.

**WHAT THE "BEFORE" ARM IS NOT.** It is `HEAD` minus Task 2, **not** the
pre-Task-1 pipeline: `./movable.ts`'s union is in it, so a pad still gets its
three unit-delta `move` gestures. The before arm is therefore the right control
for *"what did the SPACING gesture buy"* and the wrong one for *"what did Tasks 1
and 2 together buy"*, and the second question is not answered here.

**THE LITERAL `make place` RUN AGREES WITH THE HARNESS BIT FOR BIT.** The verb
was run on its own, unpreloaded, after both arms
(`build/stripboard/pultec-low-boost/2026-10-14T02-40-45-001Z-import/`), and its
reported candidate's **`candidateSha256` is `2aeaeb9f…`, the same bytes** as the
with-spacing harness run's, with the same `F`, the same `C`, the same seven open
nets, the same stopping rule and the same restart boundaries. So the figures
below are the verb's own and not the harness's.

### 12.2 Both arms' five figures

| | **BEFORE** (spacing excluded) | **AFTER** (`HEAD`, 722c13d) | delta |
| --- | --- | --- | --- |
| **cuts `C`** | **34** (`C_necessary` 34) | **28** (`C_necessary` 28) | **−6** |
| **open nets** | **10 of 14** | **7 of 14** | **−3** |
| **`F`** | **35** | **29.25** | **−5.75** |
| **stopping rule** | **`Q4`**, `bound: budget-exhausted` | **`Q4`**, `bound: budget-exhausted` | same rule |
| **nets still open** | `0`, `hi_boost_out`, `j10_p1`, `j10_p2`, `j10_p3`, `j10_p4`, `j10_p5`, `j10_p6`, `lo_boost_in`, `si_hi_cut_j4_p2` | `0`, `hi_boost_out`, `j10_p2`, `j10_p3`, `j10_p4`, `lo_boost_in`, `si_hi_cut_j4_p2` | `j10_p1`, `j10_p5`, `j10_p6` closed |
| `W` / `B` | 0 / 4 | 0 / 5 | `W` still zero |
| `A1` fails on | **`HC1`, `HC6`, `HC8`** | **`HC1`, `HC8`** | **`HC6` flips to HOLDING** |
| `BOUNDS` | `0,1 4,32` — 5 x 32, **32 columns against 27** | `0,0 8,26` — 9 x 27, **fits** | — |
| occupied strips | 5 | 9 | +4 |
| `kappa` | 0.6944 | 0.6389 | −0.055, still 13x `kappa_bench` |
| `A_occ` | 160 | 243 | +83 |
| climbs / evaluations | 4 / 20,000 | 3 / 20,000 | both spend the cap |
| restarts at | 7,745 · 15,490 · 19,986 | 11,789 · 19,986 | — |
| accepted gestures, run | **163** | **152** | −11 |
| invocations / ms each | 150,049 / 11.70 ms | 126,435 / 12.28 ms | 7.5 vs 6.3 per evaluation |
| wall clock | 1,756 s | 1,552 s | the bigger move set ran **faster** |
| `run.json` hash | `03e3529e…` | `74c130c9…` | §12.7 on why these do not compare |

**ONE CLIMB, ONE SEED - the sharper measurement, and on this arm it is the same
board.** The `import` arm has ONE start and the seed changes nothing about it
(`./seed-arms.ts`' recorded asymmetry), so the run's best candidate is the FIRST
climb's and the single-seed figures carry the whole result:

| seed 0, arm `import` | BEFORE | AFTER |
| --- | --- | --- |
| evaluations | 7,745 | 11,789 |
| rounds | 38 | 45 |
| accepted | 59 | 87 |
| **of which spacing gestures** | **0** | **8** |
| unscoreable | 15 | 15 |
| its best | 10 open, `F` 35, `C` 34 | 7 open, `F` 29.25, `C` 28 |

The before arm's climbs 0 and 1 are identical in every counter — 7,745
evaluations, 38 rounds, 59 accepted, 15 unscoreable — which is that one-start
property showing up as reproducibility rather than as an assertion about it.

**THE BEFORE ARM REPRODUCES §6.10's `import` ROW EXACTLY ON THE BOARD AND NOT ON
THE PATH.** §6.10 records `F = 35`, `C = 34`, `W = 0`, `B = 4`, **10 of 14 open**
for this arm, and all five agree. Its path does not: §6.10's climb is 4,592
evaluations over 24 rounds with 45 accepted and 36 unscoreable, against 7,745 /
38 / 59 / 15 here. Task 1's three pad `move` gestures are in this arm and were
not in that one, so the search walks differently and converges on the same
board. **That the destination survived a change to the move set is the strongest
evidence available that the before arm is the real before.**

### 12.3 Were the spacing gestures actually ACCEPTED? Yes — **15 of 152**, and the kind exhausts itself twice

Every acceptance decision in both runs was recorded. Per kind, over the whole
run (`evaluated` counts only candidates the pipeline could score; the
`unscoreable` 29 and 44 are not in it):

| kind | BEFORE evaluated / accepted | AFTER evaluated / accepted |
| --- | --- | --- |
| `move` (unit deltas) | 2,686 / **119** | 2,306 / **106** |
| **`move` (spacing)** | **0 / 0** | **4,830 / 15** |
| `rotate` | 132 / 15 | 102 / 13 |
| `stretch` | 2,100 / 18 | 1,433 / 14 |
| `cluster` | 662 / 8 | 453 / 2 |
| `gather` | 11,135 / 3 | 9,086 / 2 |
| `spread` | 3,281 / **0** | 1,787 / **0** |
| `add-wire` | **0 / 0** | **0 / 0** |
| total | 19,996 / 163 | 19,997 / 152 |

**The spacing kind takes 24% of the run's evaluations and produces 10% of its
acceptances.** That is a worse hit rate than the unit-delta `move` (4.6%
against 0.31%) and far better than `gather`'s 0.02%; it is **not** free, and
`gather` is the kind spending half this budget for three acceptances.

**The eight accepted in the first climb, with the board they left:**

| round | pad | `openNets` after | `C` after | `F` after |
| --- | --- | --- | --- | --- |
| 0 | `RV_LO_BOOST_1` | 13 | 36 | 36.25 |
| 1 | `SW_LO_BOOST_7` | 11 | 36 | 37 |
| 3 | `SW_LO_BOOST_2` | 9 | 35 | 36.75 |
| 5 | `SW_LO_BOOST_6` | **7** | 36 | 38.25 |
| 8 | `RV_LO_BOOST_1` | 7 | 33 | 34.75 |
| 9 | `SW_LO_BOOST_3` | 7 | 32 | 33.75 |
| 10 | `SW_LO_BOOST_4` | 7 | 31 | 32.75 |
| 35 | `SW_LO_BOOST_5` | 7 | 30 | 32 |

**Rounds 1 and 5 are accepted while `F` RISES** — 36.25 to 37 and 36.75 to
38.25 — because the open-net count is the ordering's first key and it fell. That
is §11.4's gate working in the direction §11.4 said it could not be assumed to
work in, on candidates §11 never evaluated.

**And the kind exhausts itself, twice, as §11.6 predicted in kind if not in
sequence.** The spacing set offered per round of the first climb:

```
  315 315 280 280 210 210 175 175 175 105 70 0 0 ... 0 70 0 0 0 0 0 35 35 35 35
   r0                                        r10  r11      r35          r41-44
```

Eleven rounds to silence, not §11.6's seven — the ladder there moved one pad per
step and a real round sometimes moves two (315 → 315 → 280 is two pads leaving
between enumerations). **It then comes BACK, at rounds 35 and 41–44**, because
other kinds pack a pad back into an abutment and the generator names it again.
§11.6's *"seven applications and the kind is silent"* is therefore a floor on the
cost and not the cost: the real figure on this climb is 4,830 evaluations,
**24% of the run's budget**, against §11.6's projected 1,260.

**In the before arm the generator would have offered 315 on EVERY ONE of the 98
rounds** — the row never unpacks when nothing can unpack it. That is the control
arm confirming the diagnosis the plan opened with, measured rather than argued.

### 12.4 Step 4: **`HC1` does not hold**, and all seven still-open nets are the SAME shape

`HC1` is false on both reported boards. `--check` exits 1, and the fork's own
`Layout state` block is the authority for the list:

```
  AFTER:  0 incomplete · hi_boost_out incomplete · in COMPLETE · j10_p1 COMPLETE
          j10_p2 incomplete · j10_p3 incomplete · j10_p4 incomplete
          j10_p5 COMPLETE · j10_p6 COMPLETE · lo_boost_in incomplete
          out COMPLETE · si_hi_boost_j20_p3 COMPLETE · si_hi_cut_j12_p3 COMPLETE
          si_hi_cut_j4_p2 incomplete                              Cuts: 28
```

**NOT ONE NET IS SHAPE (a) AND NOT ONE IS SHAPE (c). ALL SEVEN ARE SHAPE (b) —
no wire was plannable.** The three shapes have different remedies and this one
is unanimous:

| net | shape | why, from the generator's own conditions |
| --- | --- | --- |
| `j10_p2` | **(b)** | the wire generator sees its pins on **one strip** (0); its other half is the `SW_LO_BOOST` **PAD** on strip 6, which `netPinsAlongStrips` gates out |
| `j10_p3` | **(b)** | the same, pad on strip 7 |
| `j10_p4` | **(b)** | the same, pad on strip 8 |
| `si_hi_cut_j4_p2` | **(b)** | all three of its pins really are on **strip 1**, split along it by a cut — a wire bridges strip PAIRS, so there is nothing to propose |
| `0` | **(b)** | pins on strips 0, 2, 3 (plus a pad on 5); every pair offers end lines and **no offered line takes a bridge** |
| `hi_boost_out` | **(b)** | pins on strips 1, 3, 4; the same — no pair yields a bridge |
| `lo_boost_in` | **(b)** | pins on strips 2, 3, 4 (plus a pad on 0); the same |

**(a) IS EMPTY BECAUSE NO `add-wire` CANDIDATE EXISTS ANYWHERE ON THIS BOARD, AT
ANY POINT IN EITHER RUN.** `wireMovesFor` admits **zero** candidates on the
`--import` start board both arms share, **zero** on the after arm's reported
board and **zero** on the before arm's; and the trace of 19,997 and 19,996
scored candidates contains **no `add-wire` entry at all**. So no net's wire was
rejected on cost, no net's wire was rejected by a hard constraint, and `W = 0`
is not the objective declining to pay for a wire — **it is the generator never
offering one.** §6.9's *"`add-wire` fires 7,417 counted times and is never once
accepted"* does not describe this pipeline any more.

**(c) IS EMPTY, CHECKED BOTH WAYS.** Neither report carries a
`<net> blocked (<member> unplaced)` line, and every reference pin of every open
net resolves to a hole through `referencePinHoles` — so no open net is waiting
on an unplaced part. `HC3` holds on both boards.

**THE ONE FINDING THIS LEAVES FOR A LATER TASK, and it is a production change
this task did not make.** `tools/stripboard/moves-wire.ts`'
`netPinsAlongStrips` walks `dump.pins` and matches against export-spelled ids,
so **a placed `PAD`'s hole is gated out on the spelling** — its own comment says
so and calls it the fourth site pad net membership has to reach, deferred rather
than blocked. The consequence is now measured: **the spacing gesture moves the
selector pads onto strips 6, 7 and 8, which SPLITS `j10_p2`, `j10_p3` and
`j10_p4` across two strips — and the wire generator cannot see that it did.**
Before the gesture those nets were split along one strip and no wire could help
either; after it they are exactly the shape a wire repairs, and nothing proposes
one. That is a wire-generator defect surfaced BY this measurement, not a reason
to doubt the gesture.

**THAT FINDING IS WHAT TASK 8 ACTED ON, AND §12.9 TO §12.11 ARE ITS
MEASUREMENT.** The function now reads the pad's `FROM` field and has moved to
`tools/stripboard/moves-wire-nets.ts`; the three nets' cause of shape (b)
changed and their outcome did not, for a reason §12.10.2 measures. The paragraph
above is left exactly as it was written, because it was right about this board.

### 12.5 What else moved, and must not be read as nothing

**`HC6` IS NO LONGER INERT ON THIS BOARD.** The caution carried into this task
was that `HC6` fails on width (33 against 27) and so cannot reject anything —
its silence must not be read as a pass. On the AFTER board it is not silent:
`BOUNDS 0,0 8,26` is **9 x 27 and fits the declared stock exactly**, so `HC6`
**HOLDS**, and `A1` names two failures instead of three. The gesture traded
width for height — 5 strips by 32 columns became 9 by 27 — which is the one
dimension the owner's stock is tight in. **It also means `HC6` was a live
no-regression clause for part of this climb** rather than a constraint already
lost, and that is a change in what the acceptance rule was enforcing.

**`kappa` BARELY MOVES AND `A2` STILL FAILS**: 0.6944 to 0.6389 against
`kappa_bench` 0.05. Nothing here approaches the clustering bound, and no binding
constraint is named, so `K3`'s ratchet may not move on either run.

**ROUND TIMES LOOK FINE AND THE CACHE IS STILL NOT NEEDED.** The after arm's
move set is the bigger one — up to **568** moves per round against the before
arm's **274** — and it spent **1,552 s** against the before arm's **1,756 s**.
Per-invocation cost is flat (12.28 ms against 11.70 ms, and §11.6's governing
11.71 ms), and the difference is in invocations per evaluation: **6.3 after,
7.5 before**, because the before arm spends more of its budget on `gather` and
`spread`, which cost an extra `--update`. `movableRefs` re-parsing the dump per
call was named as the first place to look if round times looked wrong; they do
not, and no cache was added.

**`spread` WAS ACCEPTED ZERO TIMES IN 5,068 EVALUATIONS ACROSS THE TWO ARMS**,
which is the kind §6.11 and `./moves-spread.ts` carry the owner's own
instruction about. That is an observation for a later task and nothing is
concluded from it here.

### 12.6 What may not be concluded from section 12

1. **`HC1` DOES NOT HOLD.** 7 of 14 nets are open on the best board any arm
   produced. The plan's `HC1`-on-low-boost gate is **not** met, and Task 5's
   precondition — *"Task 5 does not start unless `HC1` holds on low-boost"* — is
   **not satisfied by this measurement.** Task 8's re-measurement (§12.10)
   reports the same seven nets from the same bytes, so it is not satisfied by
   that one either.
2. **It is one board and one arm.** `import`, low-boost, the committed seeds.
   The `constructed` and `random` arms were not run, and §6.10 records them
   reaching 9 of 14 open from a start the spacing gesture has never been
   measured on.
3. **The six cuts and three nets are not attributable to the spacing gesture
   alone.** The arms differ by one variable in the ENUMERATION, and the climb
   that follows is a different walk: the after arm accepted 106 unit-delta
   `move`s and 13 `rotate`s on boards the before arm never stood on. **The
   gesture is what made the difference possible; the final board is the whole
   move set's.**
4. **Both runs stopped on `Q4` having spent the entire 20,000-evaluation cap.**
   `Q4` is the marginal-yield rule and its `k = 1` is a labelled hypothesis;
   `Q5` did not fire, but neither run converged on `S3` either, so **neither
   board is a local optimum under this move set** and a larger cap is untested.
   §6.10's runs all stopped on `S3`; these do not, which is a change in the
   search's behaviour this section does not explain.
5. **No completion pass ran.** `./complete.ts` still has no production caller,
   so the three shapes above are read from the generator's conditions and the
   acceptance trace, not from a pass that tried to close each net.

### 12.7 Two things the record cannot do, found while measuring

1. **`canonicalHash` DOES NOT REPRODUCE ACROSS RUNS ON THIS BOARD, AND THE
   CAUSE IS A CLOCK IN THE NETLIST.** The literal `make place` run and the
   with-spacing harness run produced a **byte-identical best candidate**
   (`candidateSha256` `2aeaeb9f…` both) and **different** canonical hashes,
   because `netlistSha256` differs: the export this board's own model produces
   carries `{ EESchema Netlist Version 1.1 created 2026-10-14T02:40:44 }`, a
   wall-clock stamp, and the two exports differ in that line and in nothing
   else (2,033 bytes each, one line of diff). `V6` wants the hash to prove two
   runs reproduce; on a board with no declared `sch`/`netlist` pair it cannot,
   and the comparison has to be made on `candidateSha256` instead. **That is a
   finding for a later task and nothing was changed for it.**
2. **The carried occupancy cannot be recovered from a reported board**, so the
   per-net bridge test in §12.4 was run against the dump for conditions one and
   two and `wireEndLines`, and the "zero candidates admitted" figure comes from
   inside the run, where the geometry the climb carried was still in hand.
   `occupancyOf` refuses the reported board by name — *"part `C18`: it faces N
   … there is no rectangle to read"* — which is that refusal doing its job.

### 12.8 Reproducing it

```
  bash <scratch>/run-arms.sh          # both arms, then the literal verb; resumable
  bun --preload instrument.ts measure.ts     # one arm; MEASURE_ARM, MEASURE_STAMP
```

`MEASURE_ARM` is `with-spacing` or `without-spacing` and **has no default**, for
the reason `--seed-arm` has none. The committed rules are loaded unedited;
`MEASURE_CAP` exists for a smoke test and **was unset for every figure above.**
Three run directories are left under `build/stripboard/pultec-low-boost/`
(`task3-before-import`, `task3-after-import` and the verb's own stamp), each
pruned after the figures were taken to its `run.json`, its netlist, its
`imported.vrt` and its reported candidate — the full runs were **3.9 GB, 5.0 GB
and 3.9 GB** of candidate boards, and 596 KB of the 12.8 GB remained. `build/` is
git-ignored and `boards/**` is untouched by all three runs. **Those three
directories are gone**: Task 9 cleared them with `make prune-runs` before taking
its floor measurement, so the 596 KB is now zero and those runs are not
re-readable. §12.10's run directory is pruned the same way and to the same four
files, plus the one `add-wire` candidate §12.10.1 rests on.

### 12.9 Task 8 — the gate §12.4 found, closed: `netPinsAlongStrips` now reads a pad's `FROM` field

**THE FIX IS ONE EXPRESSION AND THE MEASUREMENT IS WHY IT IS THERE.** §12.4
named the defect and left it: `netPinsAlongStrips` built its wanted set from the
reference netlist, which spells a pad's pin `SW_LO_BOOST.3`, and tested it
against the `PIN` line's own id, which spells it `SW_LO_BOOST_3.1`, so the
lookup missed for every pad on every board. `PadLine.source` is that same field
already in the export's spelling, so the whole translation is to ask it for a
pad ref and the `PIN` line's id for everything else. The enumeration moved to
`tools/stripboard/moves-wire-nets.ts` in the same change, because
`tools/stripboard/moves-wire.ts` was at exactly the 500-line ceiling; the seam
is *how one wire is shaped* against *which wires the netlist asks for*.

**WHAT IT CHANGES, ON THE COMMITTED FIXTURE AND WITH THE DERIVATION FROM THE
FIXTURE'S OWN LINES.** `tests/fixtures/stripboard/pultec-low-boost-imported.dump`,
graded against `pultec-low-boost-frozen.netlist`:

| net | before | after |
| --- | --- | --- |
| `j10_p2` | `{0: [5]}` | `{0: [5, 28]}` |
| `j10_p3` | `{0: [8]}` | `{0: [8, 29]}` |
| `j10_p4` | `{0: [11]}` | `{0: [11, 30]}` |

The added column is the pad's: `PAD SW_LO_BOOST_3 … AT 0,28 FROM SW_LO_BOOST.3`
against `NODE 3 … C19.2 SW_LO_BOOST.3`. **The STRIP was always right and the
pad was always missing**, which is why the test asserts the along-strip columns
and not the strip set — an assertion on the strips alone passes against the
defect.

**AND THE CANDIDATE COUNT ON THAT BOARD IS STILL ZERO, WHICH IS NOT A
DISAPPOINTMENT BUT THE SECOND CONDITION.** A wire bridges a PAIR of strips, and
on the board `--import` produces both holes of each of these nets are on strip
0 — split ALONG one strip, where `wireBridge` has nothing to bridge.

**THE SECOND CONDITION IS A FREE HOLE BESIDE THE NET'S OTHER PIN, AND IT IS
MEASURED RATHER THAN REASONED.** With the three selector pads moved onto strips
6, 7 and 8 — the shape §12.3's gesture produces — and the capacitors LEFT in row
0, `netPinsAlongStrips` reports the split (`j10_p2: {0: [5], 6: [5]}`),
`wireEndLines` offers lines 5, 4 and 6, and **zero candidates are admitted**:
`--import` packs row 0 from column 0 to column 32, `WIRE_END_REACH` is one hole,
and every one of those three holes in row 0 is another part's. Move the three
capacitors off row 0 as well — `C19` to `4,3`, `C20` to `4,7`, `C21` to `4,11`,
with the pads at `6,5`, `7,9` and `8,13` — and **each of the three nets is
offered one wire**:

```
  add-wire j10_p2 joining 4,6 to 6,6 (at 5,5 as Wire1, 1 turn(s), stretch 0, turn-then-stretch)
  add-wire j10_p3 joining 4,10 to 7,10 (at 5,9 as Wire1, 1 turn(s), stretch 1, turn-then-stretch)
  add-wire j10_p4 joining 4,14 to 8,14 (at 5,13 as Wire1, 1 turn(s), stretch 2, turn-then-stretch)
```

`j10_p2`'s is the worked case: its pins sit at `4,5` and `6,5`, so `wireEndLines`
offers column 5 first (cost 0), then 4 and 6 (cost 2 each, ties to the lower).
Column 5 is refused — the wire's own ends would sit ON `C19.2` and ON the pad —
and column 4 is `C19`'s body cell at `4,4`. Column 6 is free in rows 4, 5 and 6,
so the wire spans those rows there, one hole from each of the net's own pins.
**These are the first `add-wire` candidates any board derived from the real
low-boost layout has admitted since `WIRE_END_REACH` began governing the kind.**
(The purpose-built boards in `tests/stripboard/wire.test.ts` admit one and
always did; what had never produced one is a Pultec board.)

**SO THE TWO CHANGES ARE BOTH NECESSARY AND NEITHER IS SUFFICIENT.** Task 2's
gesture splits a net across two strips; this translation lets the generator see
that it did; and a wire is plannable only where the net's other pin has a free
hole beside it. §12.4 attributed three of the seven open nets to the spelling
alone — that was the right cause of (b) and not the whole condition, and the
board the climb actually reaches decides the rest (§12.10).

**THE MUTATIONS, recorded so the result is not re-derived.** Three, on
2026-10-13, against `tests/stripboard/moves-wire.test.ts`:

  - the translation removed, so the id is spelled the board's way again: **three
    tests fail**, the candidate count on the spaced board goes to **zero**, and
    that is §12.4's finding reproduced as a test;
  - the `NOPROVENANCE` refusal turned into a skip: one test fails, and it is the
    only test holding that condition;
  - the two-`PIN`-lines refusal disabled: one test fails. With the translation in
    place both holes would be attributed to the SAME reference pin, so the net
    would appear split across a strip it is not on and a wire would be planned
    for a split that does not exist.

Mutation cannot catch a predicate that is too PERMISSIVE, which is why the two
board assertions face opposite ways: the imported board must admit NOTHING and
the spaced board must admit something.

### 12.10 Task 8's re-measurement: the same board, **byte for byte**, and `HC1` still does not hold

```
  commit        f97849b  (pipelineCommit, recorded in run.json)
  board         boards/pultec-low-boost      arm  import
  rules         stripboard/rules.json unedited - seeds [0, 1, 2, 3, 4],
                evaluationCap 20000, tau null, worseAcceptance null
  fork          ed6c5a64eb5125346e8b0bc0b434b332c7750bb6
  command       make -C boards/pultec-low-boost place SEED_ARM=import
```

| | §12.2's AFTER (722c13d) | **this run (f97849b)** | delta |
| --- | --- | --- | --- |
| **cuts `C`** | 28 (`C_necessary` 28) | **28** (`C_necessary` 28) | **none** |
| **open nets** | 7 of 14 | **7 of 14** | **none** |
| **`F`** | 29.25 | **29.25** | **none** |
| **stopping rule** | `Q4`, budget-exhausted | **`Q4`, budget-exhausted** | **none** |
| **nets still open** | `0`, `hi_boost_out`, `j10_p2`, `j10_p3`, `j10_p4`, `lo_boost_in`, `si_hi_cut_j4_p2` | **the same seven** | **none** |
| `W` / `S` | 0 / 5 | 0 / 5 | none |
| `A1` fails on | `HC1`, `HC8` | `HC1`, `HC8` | none |
| `kappa` | 0.6389 | 0.6389 | none |
| climbs / evaluations | 3 / 20,000 | 3 / 20,000 | none |
| restarts at | 11,789 · 19,986 | 11,789 · 19,986 | none |
| `candidateSha256` | `2aeaeb9f…` | **`2aeaeb9fd20b8fdd…`** | **the same bytes** |
| invocations / ms each | 126,435 / 12.28 ms | 126,435 / 11.86 ms | none / −0.42 |
| wall clock | 1,552 s | 1,500 s | −52 s |

**THE REPORTED BOARD IS THE SAME FILE.** `candidateSha256` matches §12.2's after
arm exactly, and so do the cut count, the objective, the seven open nets, the
stopping rule, the restart boundaries and the invocation count. **So the
translation bought nothing on this board and this arm, and that is the
result** — not a disappointment to be explained away, and the reason is
measurable rather than speculative. It is below.

**`HC1` DOES NOT HOLD.** `--check` exits 1 with seven incomplete nets, `A1`
fails on `HC1` and `HC8`, and **Task 5's precondition is still not satisfied.**

**THE RUN DID NOT CONVERGE, AND THAT IS NOT A RESULT.** It stopped on `Q4` —
`yieldFloor = 1` — having spent the whole 20,000-evaluation cap, with restarts
at 11,789 and 19,986, exactly as both of Task 3's arms did. `S3` never fired, so
**no board in this measurement is a local optimum under this move set**, and
whether the cap is the binding constraint is a live question for the owner rather
than something these figures answer. Three runs have now ended this way.

### 12.10.1 **One `add-wire` candidate in 20,000 evaluations — and the fork refused it**

The run directory is the record: `applyMove` stages one file per gesture, named
for the kind, and across the run's three climbs — 78,000-odd candidate files —
the pattern `.add-wire-*.vrt` appears **exactly twice**:
`r26-m56.vrt.add-wire-0.vrt` and `…-1.vrt`, one candidate, in seed 0's round 26.
(`.gather-*` appears 5,329 times in that same directory and `.spread-*` 1,206,
so the counting method is not in doubt.)

**There is no `r26-m56-filled.vrt`, so that candidate was never scored**, and
re-running the step it died at names the reason exactly:

```
  $ veroroute --update seed-0/r26-m56.vrt --netlist pultec-low-boost.net -o x.vrt
  the layout's wire Wire1 (1,18 to 2,18, carrying net ids 12 and 13) cannot be
  put back after reconciliation: its two ends are no longer on one net. Move or
  delete it in the GUI, then run this again.
  $ echo $?
  1
```

**That is `WIRE_END_REACH`'s own documented limit, caught in the wild.** The rule
puts a wire's end within one hole of a pin of its net on each strip, and
`tools/stripboard/moves-wire.ts` states that this is *"necessary and not
sufficient: a cut can sit between a pin and the hole beside it, because the cut
list exists only after a candidate is painted"*. Here both ends were in reach and
the copper under them belonged to node ids 12 and 13. The candidate therefore
counted as **unscoreable**, which spends a slot of the cap (`./climb.ts` counts
`history.length + unscoreable` against it) and changes nothing else — which is
consistent with the identical restart boundaries and the identical best board.

So the honest accounting of the kind on this arm is: **enumerated once, refused
by the binary once, accepted zero times, and `W = 0` is still not the objective
declining a wire.** It is no longer *"nothing offers one"* either.

### 12.10.2 The seven open nets, re-classified on the reported board — **three move from invisible to out of reach**

`occupancyOf` refuses the reported board for the reason §12.7 records (*"part
`C18`: it faces N … there is no rectangle to read"*), so `wireMovesFor` cannot be
run against it. What CAN be read from its dump is what the enumeration reads
first: which strips each net holds, and whether any line of holes is within
`WIRE_END_REACH` of the net's own pins on both strips. That is the condition
that was gating these three nets, so it is the condition to re-measure.

| net | strips it holds (along-strip positions) | pairs, and the end lines each offers | shape |
| --- | --- | --- | --- |
| `j10_p2` | 0 `[5]`, **6 `[0]`** | 0/6: **none** | **(b)**, newly for a REACH reason |
| `j10_p3` | 0 `[8]`, **7 `[0]`** | 0/7: **none** | **(b)**, the same |
| `j10_p4` | 0 `[11]`, **8 `[0]`** | 0/8: **none** | **(b)**, the same |
| `si_hi_cut_j4_p2` | 1 `[15, 21, 22]` | no pair at all | **(b)**, unchanged |
| `0` | 0 `[1,3,6,9,12,15]`, 2 `[12]`, 3 `[18..22,17]`, **5 `[0]`** | 0/2: `[12,11,13]`, 0/3: `[16]`, **0/5: `[0,1]`** | lines offered; bridge unmeasurable |
| `lo_boost_in` | 4 `[21]`, 0 `[24,25,26]`, 2 `[14,22]`, 3 `[15]` | 0/2: `[23]`, 2/3: `[14,15]`, 2/4: `[21,22]` | lines offered; bridge unmeasurable |
| `hi_boost_out` | 1 `[13,17]`, 4 `[12]`, 3 `[14]` | 1/3: `[13,14]`, 1/4: `[12,13]`, 3/4: `[13]` | lines offered; bridge unmeasurable |

**(c) IS STILL EMPTY**: `HC3` holds, every reference pin of every open net
resolves to a hole, and no `blocked (… unplaced)` line appears.

**THE THREE SELECTOR NETS HAVE CHANGED SHAPE WITHOUT CHANGING OUTCOME, and that
is the whole content of this measurement.** §12.4 recorded the cause as *"the
wire generator sees its pins on ONE strip"*. It now sees both strips and the
pair. **What it finds there is that no line serves both ends**: the pad sits at
position 0 of its own strip and the capacitor at position 5, 8 or 11 of strip 0,
and `WIRE_END_REACH` is one hole. The nets moved from (b)-because-invisible to
(b)-because-out-of-reach, which is progress in the diagnosis and none at all in
the board.

**AND THE CAUSE OF THAT IS A RULE THIS PAGE ALREADY NAMED.** §11.5 records
`spacingMoves`' destination rule — the first admissible hole on each strip,
**ascending** — and says of it: *"It is systematically at the LOW END of a strip,
which is not neutral with respect to `RANKING`'s `A_occ` and wirelength
positions"*, and that **a destination-choice rule was written and NOT taken**
because the measured benefit was zero. This run is the first measurement in
which it is not zero: every one of the three pads was parked at position 0 while
its own net's other pin is five, eight or eleven holes along another strip, and
a destination in the pin's own COLUMN would put the pair within reach. **That is
a finding for the owner and for Task 4's question, and nothing was changed for it
here** — the measured claim is about reach, and whether a bridge would then fit,
be accepted, and survive `--update` is three further questions this run does not
answer.

**WHAT CANNOT BE CONCLUDED.** It is one board and one arm; `constructed` and
`random` were not run. Nothing here shows that a reachable pair would be
ACCEPTED: the one candidate the run did produce was refused by the binary, and
§6.9's cost-model finding — a wire removes no cut by itself, so `add-wire` is
pure `ρ_w` to the objective — is untouched by this task and remains the standing
reason to expect a lone wire to lose its round.

### 12.11 The other three pad-spelling sites: measured, and **declined with a number**

**FOUR SITES GATE A PAD OUT ON THE SAME SPELLING** —
`tools/stripboard/moves-cluster.ts`'s `clusterRefs` (and `aimedHoles` behind
it), `tools/stripboard/moves-join.ts`'s `joinEndsFor`,
`tools/stripboard/moves-spread.ts`'s `spreadSourceStrips`, and the
`netPinsAlongStrips` §12.9 translated. Task 1 deferred all four together for
want of a measurement. This is the measurement, taken by translating the other
three temporarily and counting the move set on two boards — the working tree was
restored with `git checkout --` and the counts re-checked afterwards.

| board | before | after | the difference |
| --- | --- | --- | --- |
| `pultec-low-boost-imported.dump` | **374** | **598** | +224, **all of them `gather`** (31 → 255) |
| the same board, pads spaced onto strips 6/7/8 | **275** | **461** | +186: `gather` 0 → 126, `spread` 0 → 47, `cluster` 0 → 13 |

**THE WIDENING LANDS IN THE THREE KINDS WITH THE WORST MEASURED HIT RATE.**
§12.3's per-kind acceptance over the whole run: `gather` **2 accepted in 9,086
evaluations**, `spread` **0 in 1,787**, `cluster` **2 in 453**. A 60% wider round
inside an unchanged 20,000-evaluation cap is **about 37% fewer rounds**, on a run
that already spends the whole cap without converging (§12.6 item 4). §6.11
records what this repository paid for the same first-order argument last time:
1,539 extra candidates, never once best.

**SO IT IS DECLINED WITH A NUMBER RATHER THAN DEFERRED WITHOUT ONE**, and what
would change it is a run in which a pad's `cluster`, `gather` or `spread` is
accepted — not a further reading of the code.

**AND THE THREE SITES ARE FOUR, COUPLED: `clusterRefs` CANNOT BE TRANSLATED
ALONE.** `aimedHoles` selects the pin that put a ref in the cluster, by the same
spelling, so a pad selected by a translated `clusterRefs` has no pin there and
it refuses — *"aimedHoles: RV_LO_BOOST_1 is in the cluster of "0" and the dump
reports no PIN line of its on that net"* — on the FIRST net of the imported
board. That refusal is doing its job, and it means the pair moves together or
not at all. Anyone taking this on later should budget for two functions and not
one.

## 13. Task 9 of the buildable-layouts plan — the suite leaked **134 directories a run** into `TMPDIR`, and the metric that said otherwise **measured the wrong directory**

**THE LESSON IS THE METRIC, NOT THE LINE COUNT.** "A full suite leaves zero run
directories behind" was reported repeatedly, across several tasks, as a clean
bill of health for the scratch-leak fix. It was true and it was about
`build/stripboard/` — the one directory that fix had touched. The fixtures write
in **two** places, and nothing ever counted the other. On 2026-10-13 the owner's
disk filled: `TMPDIR` held **over 60,000** scratch directories across eight
prefixes, plus 20 GB under `/private/tmp`. A success metric measured the wrong
directory, and the metric being green is what kept anybody from looking.

### 13.1 What was measured, against a floor the owner had just cleaned

One `bun test` run leaked **134** directories into `TMPDIR`:

| prefix | per run | made by |
| --- | --- | --- |
| `stripboard-rules-` | 65 | `tests/stripboard/rules-fixtures.ts` `fixture()`, called ~60 times |
| `stripboard-climb-` | 55 | `tests/stripboard/climb-fixtures.ts` `freshRunDir()`, 8 test files |
| `stripboard-search-` | 40 | `tests/stripboard/search-fixtures.ts` `freshSearchDir()` |
| `stripboard-stock-` | 10 | `tests/stripboard/grade-fixtures.ts` `fixtureDeclaration()` |
| `checkpoint-` | 8 | `tests/stripboard/checkpoint-fixtures.ts` `checkRunFor()` |
| `stripboard-complete-` | 7 | `tests/stripboard/complete-fixtures.ts` `freshPassDir()` |
| `wiring-sync-` | 2 | `tests/perfboard/wiring-sync.test.ts` |
| `stripboard-seed-geometry-` | 2 | `tests/stripboard/seed-geometry.test.ts` `WORK` |

**WHY THAT IS NOT A TIDINESS NUMBER.** `tests/stripboard/run-scratch.ts`'s header
carries the mechanism: at roughly **4,606** directories in one directory,
`spawnSync` of the pinned fork began returning **exit status 0 with empty
stdout**, and **23 tests in nine unrelated files** failed on *"--dump-board
produced no GRID line"* — a refusal pointing at the fork, about a fork that was
fine. At 134 a run, **34 suite runs** reaches that threshold again. And the
failure presents as a *legitimate refusal*, so a measurement taken on a poisoned
machine is not merely slow; it is **wrong in a way that reads as a finding.**
That is why this task ran ahead of Task 8, whose Task 3 equivalent cost about 80
minutes of fork time.

### 13.2 Two lifetimes, and only one of them is a hook

Thirty-eight files under `tests/` make a temp directory, and they were not all
broken. Sorting them produced two correct shapes and one bug:

1. **The directory's lifetime is one call or one scope** — twenty-seven files
   already did the right thing, naming it and removing it in a `finally`. An
   immediate removal in the scope that made the directory is a *stronger*
   guarantee than a hook at the end of the file, so **none of them was
   converted**: that would have been churn that weakened them.
   `checkpoint-fixtures.ts`'s netlist directory was one of these in everything
   but the removal — the fork reads it during `runVerorouteCheck` and nothing
   reads it after — so it gained the `finally` rather than a registration.
2. **The directory's lifetime is a test, or a whole file** — a run directory
   handed to `climb`, `search` or `complete`; `seed-geometry.test.ts`'s
   module-scope `WORK`. These cannot be removed at the point of creation, and
   they are what the registry is for.
3. **Two helpers hand the directory to the caller** — `tree()` and
   `tmpCatalogDir()`. Every caller already removes what it was handed, and
   neither prefix appeared in the 134. Registering them *as well* would have been
   a second cleanup path beside a first that works, so they were left alone and
   declared instead, so the guard holds their callers to the removal.

`tests/support/temp-scratch.ts` is the registry — one for the whole suite, not
one per fixture module, which is precisely the mistake that produced this bug.
`run-scratch.ts` kept a private `CREATED` list, so the registry that worked was
invisible to every fixture that did not already use it; its list is **deleted**
and it now delegates, keeping only the stamp prefixes, which are run directories
under `build/stripboard/` and genuinely its own.

**`cleanUpTempScratch` RETURNS THE COUNT IT REMOVED.** A cleanup hook that
silently does nothing when its registry is empty looks exactly like a cleanup
hook that worked — the same failure shape as the metric above, one level down.
The return value is what lets the guard refuse that.

**A MODULE-LEVEL `afterAll` IN THE REGISTRY WOULD NOT HAVE WORKED, AND THAT WAS
MEASURED RATHER THAN ASSUMED.** Bun evaluates a module once for the whole run,
so a hook registered at the registry's own module scope attaches to whichever
test file imported it first and to no other — confirmed with a two-file probe.
Every test file that reaches a registering fixture arms the hook itself, which is
the proven pattern and also the one that needs a guard to stay true.

### 13.3 The guard, and what each half of it can and cannot catch

`tests/stripboard/temp-scratch.test.ts`, thirteen tests. It was written first and
it **failed on the real leak** — five behavioural failures reporting
`removed: 0`, and a static failure naming all thirteen offending files — before
anything was fixed.

- **Behavioural (5).** One per leaking prefix: drive the fixture, run the hook,
  assert both that the hook removed something and that no directory under that
  prefix outlived the fixture. These only cover fixtures somebody listed.
- **`every mkdtemp site under tests/ either removes its own directory or
  registers it`.** This is the half that covers the fixtures nobody will list.
  For each `fs.mkdtempSync` site it extracts the name the directory is bound to
  and requires an `rmSync` of that name in the same file; a site that is not
  bound to a name at all, or whose name is never removed, fails and is reported
  by file. A new leaking fixture fails here rather than being found in a year by
  a full disk.
- **`every test file that reaches a registering fixture arms the cleanup
  hook`.** Import-based, so a file that imports a fixtures module without
  touching its registering export is **not** asked for a hook that would do
  nothing — a vacuous hook is the thing this section is about. It also catches a
  `.test.ts` that registers scratch of its own: three of the eight prefixes were
  made in a test file rather than in a fixtures module.
- **`every caller of a hand-it-over helper removes what it was handed`.** Holds
  shape 3 above to its contract instead of waving those two files through.
- **Two tests over the tables themselves** — every declared module really does
  register, really does export the names claimed, and every registering module is
  declared. A stale table is a check that passes while guarding nothing.
- **`make prune-temp derives every prefix the behavioural cases above drive`.**
  The two halves have to agree or neither is worth much: the guard keeps the
  suite from adding to the pile and the verb clears what is already there, so a
  prefix the guard tests and the verb cannot derive is a prefix that accumulates
  for ever.

**WHAT IT DOES NOT COVER, SAID PLAINLY.** `tools/` is not scanned by the site
check: four files there (`tools/perfboard/verbs.ts`, `check.ts`, `import.ts`,
`netlist-sync.ts`, `tools/pultec/schematic-sync.ts`) make temp directories in
production paths, and all of them remove their own. They are production code with
a different review surface, and extending the check to them is a separate change.
`tests/circuits/kicad-round-trip.ts`'s prefix is `` `${stem}-stub-` `` — the
literal begins with an interpolation, so `prune-temp` reports it as a prefix it
cannot derive instead of guessing one.

### 13.4 The result, measured twice

Two consecutive full `bun test` runs, each bracketed by
`find "$TMPDIR" -maxdepth 1 -type d | wc -l`:

| | run 1 | run 2 |
| --- | --- | --- |
| `bun test` | 1891 pass / 0 fail / 0 skip, 172 files, 84.32 s | 1891 pass / 0 fail / 0 skip, 172 files, 83.42 s |
| `TMPDIR` delta | **0** | **0** |
| `build/stripboard` run directories | 0 | 0 |
| `build/stripboard` bytes | 0 | 0 |

The baseline this task inherited was 1878 pass across 171 files; the thirteen
tests and one file added are §13.3's guard. Two earlier pairs of runs, taken
before the guard's last test landed and at a `TMPDIR` holding 28,986 directories
rather than 6,819, also measured **0** — §13.6 is the second of them.
`bun run typecheck` is clean.

**`find`, NEVER A SHELL GLOB.** A zsh glob like `${TMPDIR}adopt-*` **aborts the
whole expansion on a no-match** rather than expanding to nothing, and it silently
produced a wrong count during this task's own measurement before `find` replaced
it. `tempScratchMatching` in the registry reads the directory and filters in
TypeScript for the same reason.

### 13.5 `make prune-temp`, and the 21,362 directories that are the fork's

`prune-temp` is the companion `prune-runs` never had. Like it, it is a
**deliberate verb and a prerequisite of nothing**, and it names every prefix and
its count before it deletes anything.

**ITS PREFIX LIST IS DERIVED FROM THE SOURCES.** Every
`mkdtempSync(path.join(os.tmpdir(), "…"))` and every `freshTempScratch("…")`
under `tests/` and `tools/` is read out of the files, because a hand-kept list of
forty-odd prefixes goes stale the first time a fixture is renamed, and a prune
verb that quietly misses a prefix is the same silence as the metric at the top of
this section. An empty derivation **refuses** rather than reporting a successful
sweep of nothing.

**`vr-gui-*` IS THE FORK'S OWN AND IS DECLARED SEPARATELY, NOT CLAIMED.** No
fixture creates one — they did not appear among the directories a suite run
creates, which is how that was established. The pinned binary makes one per
spawn, so the source is `oletizi/veroroute-perfboard` and fixing it there is a
change to the fork. This verb removes them from **this** side and says whose they
are. Two other groups of accumulated prefixes are from sibling worktrees that
share one `TMPDIR` and from code that no longer exists (`vr-declared-span-`,
`symtext-`, `vr-strips-`, `vr-`, `verify-`, `time-score-`): nothing in any
current checkout creates them, so the derived list does not cover them and the
verb does not pretend to.

**WHAT IT REMOVED WHEN IT WAS RUN.** `TMPDIR` went from **28,986** directories
to **6,819**: **805** of ours, counting a nested prefix once (`stripboard-rules-`
matches every `stripboard-rules-bad-` directory, so summing the per-prefix counts
would over-report, and a verb whose stated count is wrong has not named what it
did), and **21,362** `vr-gui-*`. The 6,819 that remain are the sibling-worktree
and no-longer-created prefixes above, plus macOS's own.

Three literals were found and reported rather than treated as prefixes:
`` `${stem}-stub-` `` in `tests/circuits/kicad-round-trip.ts` begins with an
interpolation, and the guard's own refusal-test arguments (`""`, `"noDash"`,
`"nested/dir-"`) are not prefixes. A literal with no trailing `-` is rejected by
the same rule `freshTempScratch` enforces on its callers, because matching
`TMPDIR` against a stray string could delete another program's work.

### 13.6 The intermittent 50.6 s test: accumulation was the leading candidate and **it is not supported**

The unexplained slow run on record is `escapes-search.test.ts`'s *"every restart
starts from the run's OWN arm"* taking **50.6 s** where it runs in under 5 s
alone, alongside `seed-geometry.test.ts`'s constructed-arm test. Both pass in
isolation and when `tests/stripboard/` runs whole, and an A/B had already ruled
out the spacing generator. Temp-directory accumulation became the leading
candidate because of the mechanism in §13.1 — and the state of this machine made
it directly testable, since `TMPDIR` was sitting at **28,986** directories, six
times the 4,606 at which the fork's `spawnSync` is documented to start returning
empty stdout.

Two full `bun test` runs with per-test times (`--reporter=junit`), one at each
count:

| | `TMPDIR` at 28,986 | `TMPDIR` at 6,819 (after `make prune-temp`) |
| --- | --- | --- |
| *every restart starts from the run's OWN arm* | **2.24 s** | **2.15 s** |
| *the constructed arm places on every reviewed seed* | 4.10 s | 4.11 s |
| slowest test in the suite (`GATE B`) | 20.27 s | 20.14 s |
| whole suite | 84.23 s, 1890 pass / 0 fail | 83.56 s, 1891 pass / 0 fail |
| `TMPDIR` delta | 0 | 0 |

**THE FINDING IS NEGATIVE AND IT IS WORTH AS MUCH AS A POSITIVE ONE.** The test
does not slow down at six times the documented threshold; the 0.09 s between the
two arms is noise, and the constructed-arm test is identical to two decimal
places. **Accumulation is not supported as the cause of the 50.6 s run**, and
the candidate should be struck rather than left as a plausible-sounding
explanation nobody tested. The cause remains unexplained.

**WHAT WAS NOT TESTED, AND WHY.** The 50.6 s run was observed at an unknown
count, possibly nearer the 60,000 the tree held before the owner cleaned it out.
Reaching that figure again would mean deliberately re-poisoning the machine this
task exists to clear, so it was not done. Siblings created anywhere other than
`TMPDIR` itself would not exercise the same lookup and would prove nothing. What
can be said is bounded and measured: not at 28,986.

## 14. Task 10 of the model-and-search plan — the search loop against the owner's own boards: **the gate is MATCHED on both instances and both strategies, `F` 6.75 to 3.25 and 7.5 to 4.25 — but it is matched by the seed-plus-search PIPELINE, because on BOTH boards the constructive seed already clears the hand result before a move is made, and on one of the two the search then contributes nothing**

**WHY THIS SECTION EXISTS.** Task 10 is the point the model-and-search rewrite
was aimed at, and its deliverable is a number rather than a feature. The
benchmark is exact-instance regression against two boards the owner laid out by
hand, built, and uses — so the threshold is fixed data, already measured and
committed, and **not adjustable by whoever is trying to pass it.** Everything
below is read off a run rather than derived, and the two figures that are NOT
flattering are stated in the heading beside the two that are.

### 14.1 The command, the commit, and where every number comes from

```
  bun test tests/stripboard/model/benchmark.test.ts
  bun test tests/stripboard/model/search.test.ts
  bun test tests/stripboard/model/search-stop.test.ts
```

Commit: **`ed8196c`** on `feature/pultec-modular-scaffolding`, which is the state
every figure below was measured at, and re-measured at `998f462`. **Corrected:
this section first cited `54147c3`**, which was the commit that added the gate
rather than the delivered state — a reader could not reproduce from it. The
substance did not move, because `ed8196c` changed only the summary a
`SearchResult` returns and no stop decision, and `998f462` added tests and
comments only; the figures reproduce at all three. The review of this task
re-derived every one of them from an independent script and counted the dump
files by hand outside the code path, and they agreed exactly.

**No**
VeroRoute is involved**: `lib/stripboard/` may not import from `tools/` and may
not spawn a process, which `tests/stripboard/model/no-fork.test.ts` enforces over
the whole import closure, and the benchmark runs inside that guarded suite.

| quantity | where it comes from | not |
| --- | --- | --- |
| the hand boards' `C`, `W`, `B` | `countLines` in `tools/stripboard/score.ts`, over each board's own committed `.dump` | a figure typed into a test |
| the hand boards' `F` | that module's own `objectiveOf`, with `stripboard/rules.json`'s weights | this plan's arithmetic |
| a candidate's `C` | `derivedCuts` in `lib/stripboard/cuts.ts` | a `CUT` line count |
| a candidate's `F` | `objectiveOf` in `lib/stripboard/score.ts` | a second weight table |
| `C_floor`, `N`, `P`, the `rcm` ordering | `targetsFromReference` in `tools/stripboard/targets-export.ts` | a formula respelled in a fixture |
| whether every net is whole | `violationsOf` in `lib/stripboard/invariants.ts` | the absence of a complaint |

### 14.2 The two strategies, declared before they were measured

Both are in `lib/stripboard/search-strategy.ts`, and **neither is called the
default.** The acceptance rule, the move set and the stopping rules are fixed and
belong to the loop; a strategy owns only *which proposals a round looks at, in
what order, and when it commits*, and it sees a proposal only through
`Acceptance.consider` — which is where the weights, the cut derivation, the
soundness check and the evaluation counter all live.

- **`steepest-descent`** — consider every proposal of a round, take the cheapest
  the acceptance rule admitted, ties to `movesFrom`'s declared order.
- **`first-improvement`** — take the first admitted proposal and stop looking.

### 14.3 Step 1 — the before state, per starting point

Nothing to beat yet. These are the starts' own costs, so that the search's
contribution is separable from the constructive seed's.

| instance | starting point | grid | `C` | `W` | `B` | `F` | nets whole |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `transistor-preamp-feedback` | hand board, as built (the threshold) | 16 × 18 | 5 | 4 | 3 | **6.75** | — |
| | `seed part-walk s3` | 34 × 27 | 0 | 10 | 5 | 3.75 | yes |
| | `seed rcm s2` | 34 × 27 | 0 | 11 | 4 | 3.75 | yes |
| | `seed rcm s3` | 34 × 27 | 0 | 9 | 5 | 3.50 | yes |
| | `imported hand board` | 16 × 18 | 5 | 4 | 3 | 6.75 | yes |
| `transistor-preamp-buffered` | hand board, as built (the threshold) | — | 5 | 4 | 6 | **7.50** | — |
| | `seed rcm s2` | 34 × 27 | 0 | 12 | 5 | 4.25 | yes |

**THE CONSTRUCTED SEED ALREADY BEATS BOTH HAND BOARDS ON `F` BEFORE ANY SEARCH
RUNS**, and that is the honest reading of the first four rows: 3.50 against 6.75,
and 4.25 against 7.50. It is paid in board area — the seed spreads across the
whole 34 × 27 stock where the owner's `feedback` board is 16 × 18 — and **area is
not a criterion.** He was shown three rendered boards for one circuit on
2026-10-14, was told plainly that his own beat both of ours on size *and* on cut,
wire and bridge count together, and ruled *"I much prefer the one with zero
cuts."* So the comparison against the hand board is reported as context and the
benchmark question is whether the search improves on the SEED.

**THREE STARTING POINTS WERE ATTEMPTED AND REFUSED, and they are listed because
an unavailable start must not read as one nobody tried.**

| instance | start | refusal |
| --- | --- | --- |
| `transistor-preamp-buffered` | `seed part-walk s3` | `stripboard-seed-ordering-off-board` — the thirteenth net lands on strip 36 against 34 strips |
| `transistor-preamp-buffered` | `seed rcm s3` | the same, on `/BASE_GROUND_FLOOR` |
| `transistor-preamp-buffered` | `imported hand board` | `vero-import-bridge-net-unknown` — `SOLDER 13,21 14,21` joins two holes holding no pin and no wire end, so the net it carries is nowhere in the dump |

**ALL FIFTEEN OF `derivedOrderings`' RULES REFUSE ON `buffered`** — five rules at
strides 1, 2 and 3, measured rather than assumed: at stride 3 the layout runs off
the stock, at stride 2 `RV3`/`RV4`'s moulded field cannot be seated, and at
stride 1 `J1`'s two leads cannot reach. That is why a sixth ordering is in the
start list at all: `rcm` is `tools/stripboard/targets.ts`'s own reverse
Cuthill-McKee arrangement — **the repository's, not a rule invented for this
benchmark** — and it was put in front of BOTH boards rather than only the one
that needed it. Without it the `buffered` instance has no constructed start and
cannot be run.

### 14.4 Step 2 — the result, per instance, per starting point, per strategy

| instance | run | strategy | `C` | `W` | `B` | `F` | stop | evaluations | nets whole |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `feedback` | from the seeds | `steepest-descent` | 0 | 9 | 4 | **3.25** | `Q4` | 36,250 | yes |
| `feedback` | from the seeds | `first-improvement` | 0 | 9 | 4 | **3.25** | `Q4` | 22,428 | yes |
| `feedback` | from the hand board | `steepest-descent` | 4 | 5 | 3 | **6.00** | `Q3` | 3,069 | yes |
| `feedback` | from the hand board | `first-improvement` | 4 | 5 | 3 | **6.00** | `Q3` | 2,062 | yes |
| `buffered` | from the seeds | `steepest-descent` | 0 | 12 | 5 | **4.25** | `Q3` | 11,255 | yes |
| `buffered` | from the seeds | `first-improvement` | 0 | 12 | 5 | **4.25** | `Q3` | 11,255 | yes |

**Every net is whole on every result**, by `violationsOf` over the result's own
derived cuts — which is also the acceptance rule, so no run could have returned
otherwise without the loop being wrong.

**The climbs, which is where the search's own contribution is.**

```
  feedback, from the seeds, steepest-descent        stop Q4
    seed part-walk s3   F 3.75 -> 3.50 -> 3.25   2 moves accepted, 3 rounds, 26,854 evaluations
    seed rcm s2         F 3.75 -> 3.75           0 moves accepted, 1 round,   9,396 evaluations
    seed rcm s3         F 3.50                   never climbed - Q4 fired at this climb's boundary

  feedback, from the seeds, first-improvement       stop Q4
    seed part-walk s3   F 3.75 -> 3.50 -> 3.25   2 moves accepted, 3 rounds, 13,032 evaluations
    seed rcm s2         F 3.75 -> 3.75           0 moves accepted, 1 round,   9,396 evaluations
    seed rcm s3         F 3.50                   never climbed - Q4 fired at this climb's boundary

  feedback, from the hand board, steepest-descent   stop Q3
    imported            F 6.75 -> 6.00           1 move accepted,  2 rounds,  3,069 evaluations

  buffered, from the seeds, both strategies         stop Q3
    seed rcm s2         F 4.25                   0 moves accepted, 1 round,  11,255 evaluations
```

**THE `part-walk s3` CLIMB REPRODUCES THE RECORDED BASELINE EXACTLY** — `F` 3.75
→ 3.50 → 3.25 in two accepted moves, ending at 0 cuts, 9 wires and 4 bridges —
which is the check that the loop is doing what the move generator's own
measurements said it could.

**THE SEARCH IMPROVED THE OWNER'S OWN BOARD.** From his `feedback` layout, both
strategies trade one cut for one wire: `C` 5 → 4, `W` 4 → 5, `F` 6.75 → 6.00, on
the 16 × 18 piece he actually cut and with every net whole. That is the
*"even a human starting point"* case working, and it is one accepted move rather
than a redesign.

### 14.5 Which stopping rule fired, and what each one does and does not claim

| run | rule | what it claims |
| --- | --- | --- |
| `feedback` from the seeds, both strategies | `Q4` | *finishing would cost more than the search already has* — `g/r > k·e` over the last two climb steps, at `k = 1`. **The weakest statement available**: where the search stopped, not where the problem bottoms out |
| `feedback` from the hand board, both strategies | `Q3` | *these moves from these seeds did not find better.* **Nothing about whether better exists** |
| `buffered` from the seeds, both strategies | `Q3` | the same |

**NO RUN STOPPED ON `Q1` OR `Q2`, so this benchmark makes no optimality claim at
all.** `Q1` needs `C = C_floor` **and** `W = 0`; `C_floor` is 0 on both boards
(`N = 11` and `13` against `R = 34`), every result has `C = 0`, and every result
carries wires — so the floor is not reached and `Q1` correctly does not fire.
`Q2` cannot fire while `tau` is `null`, which is the owner's recorded decision
(`K4`) and CRITERIA's stated behaviour rather than a missing branch.

**`Q6` WAS NOT TESTED, AND THAT IS DECLARED RATHER THAN SILENT.** Its signature
is the failing hard-constraint names, the floating parts and the `CUT_CONFLICT`
positions, all of which exist only in a graded dump behind the `tools/` boundary
the core may not cross — and the core has no failure to sign at all, because the
acceptance rule never admits an unsound candidate and an unsound start is
refused. `lib/stripboard/search-stop.ts` carries it in `UNTESTED_IN_CORE` with
that reason, and every `SearchResult` reports it. A rule that can never fire
reads exactly like a rule that was tested and did not, which is a defect this
plan has already caught three times.

**WHICH GUARD ACTUALLY KEEPS THAT HONEST, corrected — this section first credited
`assertTaxonomy` with protection it does not provide.** That function compares
the decided and declared-untested lists as SETS: coverage of `Q1`-`Q6`, and no
rule in both. So it catches a rule that fell out of the taxonomy altogether, and
it would **accept** `Q3` being moved out of the decided table and into the
untested list — covered exactly, nothing in both, and a rule silently no longer
decided. **The thing that pins the untested list to exactly `Q6` is
`expect(untested).toEqual(["Q6"])` in `tests/stripboard/model/search.test.ts`.**
`tests/stripboard/model/search-stop.test.ts` asserts the gap itself, so the limit
is not taken on trust, and it is also what makes `assertTaxonomy`'s own claim to
be reachable true — four tests call it, where in the first round of this task
none did.

**`A1`-`A4` WERE NOT EVALUATED EITHER, AND A `Q1` FROM THIS BENCHMARK WOULD HAVE
BEEN WEAKER THAN CRITERIA'S.** The predicate handed to `Q1` and `Q2` is
`violationsOf` and nothing else; the full verdict is `HC1`-`HC10` plus the
clustering bound, the floor tolerance and `A4`, it lives in
`tools/stripboard/verdict.ts`, and it needs a materialized dump. No run here
reached `Q1`, so nothing was claimed on the weaker predicate — but the gap is
recorded because the next run might.

### 14.6 Step 4 — THE GATE

**MATCHED, on both instances and both strategies.** The comparison carries no
tolerance: `<=` against the hand board's own `F`, counted off its own dump.

| instance | hand `F` (fixed data) | search `F` | margin | **cheapest seed, unaided** | seed alone clears? |
| --- | --- | --- | --- | --- | --- |
| `transistor-preamp-feedback` | 6.75 | 3.25 | 3.50 cheaper | 3.50 (`seed rcm s3`) | **yes** |
| `transistor-preamp-buffered` | 7.50 | 4.25 | 3.25 cheaper | 4.25 (`seed rcm s2`) | **yes** |

**WHAT IS MATCHED IS THE SEED-PLUS-SEARCH PIPELINE AND NOT THE SEARCH, and the
last two columns are why.** On **both** instances the cheapest constructed seed
already clears the hand board before a single move is made. The review of this
task put it in one sentence and it is the fairest summary of this whole section:
*"a match for the seed-plus-search PIPELINE rather than for the search, because
the constructive seed alone already clears both hand boards before a move is
made."* **Corrected: §14.7 below first framed this as holding on one instance of
the two.** The search's own contribution is real but smaller than the gate's
margin — `F` 3.75 → 3.25 on `feedback`'s `part-walk s3`, 6.75 → 6.00 from his own
layout, and **nothing at all on `buffered`.**

On cuts alone — the term the owner's ruling is about — the hand boards carry five
each and every search result carries **zero**.

### 14.7 What is NOT a success here, stated because it is the useful part

**THE SEARCH CONTRIBUTED NOTHING ON `buffered`.** Of 11,255 proposals from
`seed rcm s2`, **zero** were strictly cheaper than the incumbent — not zero
*accepted*, zero *cheaper*, so the soundness check never ran on one. The gate
passes on that instance entirely on the constructive seed's own work. Under the
plan's own correction this is *"a signal to investigate the search, not a correct
result to accept."*

**IT IS THE SEED AND NOT THE BOARD, which was checked rather than assumed.**
3,000 random permutations of `buffered`'s thirteen nets at stride 2 were
constructed: 557 produce a seed at all, 1,675 refuse on lead reach and 768 on
field seating. Six of the feasible ones were then climbed with
`steepest-descent`:

```
  random-1   F 4.75 -> 4.50   1 move accepted
  random-2   F 4.25 -> 4.25   0
  random-7   F 5.25 -> 5.00   1 move accepted
  random-10  F 4.75 -> 4.75   0
  random-19  F 4.75 -> 4.75   0
  random-23  F 4.50 -> 4.50   0
```

So two of six have a gradient and four do not, and **none of the six reaches
4.25 by searching that `rcm s2` does not reach by construction.** The same shape
as the `degree-ascending` orderings on `feedback`, which have 0 sound cheaper
proposals out of ~8,800. **The single-part rigid translation is a sparse move
family on these circuits**: the gradient is there on seven of nine `feedback`
orderings and on two of six sampled `buffered` orderings, and where it is absent
the loop correctly reports `Q3` rather than inventing progress. The families
`lib/stripboard/moves.ts` names as absent — rotation, a change of lead span, a
two-part move — are the obvious next lever, and **adding one is a plan decision
rather than something to reach for in order to move this number.**

**`Q4` ENDED BOTH SEEDED `feedback` RUNS BEFORE THE THIRD SEED WAS CLIMBED.**
`seed rcm s3` starts at `F` 3.50, cheaper than either of the other two seeds'
3.75, and it was never climbed: the rule fired at its climb boundary because the
second climb won nothing. That is `Q4` behaving as specified — *"a restart that
won nothing projects an unbounded cost to close a gap that remains"* — and it is
also exactly the bluntness its own note calls a labelled hypothesis. It did not
change the result here, because climb 1 had already reached 3.25.

### 14.8 The budget this run used, and why it is not the committed one

Every run above was given a run-level evaluation cap of **2,000,000**, and the
largest actually spent **36,250**. `Q5` therefore never fired, which is what a
backstop is for.

**`stripboard/rules.json` carries 20,000, and on these instances that figure
fires `Q5` mid-round** — `feedback`'s `steepest-descent` run spends 26,854
evaluations in its first climb alone. The committed figure is not wrong so much
as void: its own note derives it from the fork pipeline's 46.84 ms per
evaluation, four subprocess launches, and an evaluation here is a scored
candidate in memory at roughly 0.07 ms. The plan says so outright — *"The
stopping taxonomy is retained unchanged; only the budget rises, because the
reason it was small is gone."*

#### 14.8.1 THE COUNTERFACTUAL, RUN RATHER THAN REASONED ABOUT: the cap did not buy the pass, it moved the reported stop — **into a state the rules file calls a FAILURE**

The first version of this section left the committed cap as a caveat and did not
run it. The review of this task ran it; it was then re-run independently here,
and both agree. Every setting identical, `evaluationCap` read straight from
`stripboard/rules.json`:

| instance | run | strategy | `C` | `W` | `B` | `F` | nets whole | stop at 2,000,000 | stop at 20,000 | gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `feedback` | seeds | `steepest-descent` | 0 | 9 | 4 | 3.25 | yes | `Q4` | **`Q5`** | clears |
| `feedback` | seeds | `first-improvement` | 0 | 9 | 4 | 3.25 | yes | `Q4` | **`Q5`** | clears |
| `feedback` | hand board | `steepest-descent` | 4 | 5 | 3 | 6.00 | yes | `Q3` | `Q3` | clears |
| `feedback` | hand board | `first-improvement` | 4 | 5 | 3 | 6.00 | yes | `Q3` | `Q3` | clears |
| `buffered` | seeds | `steepest-descent` | 0 | 12 | 5 | 4.25 | yes | `Q3` | `Q3` | clears |
| `buffered` | seeds | `first-improvement` | 0 | 12 | 5 | 4.25 | yes | `Q3` | `Q3` | clears |

**`F` is identical on all six runs, and the gate clears on all six.** So the
2,000,000 cap **did not buy the gate's pass** — that had to be checked rather
than assumed, and the honest reading is that the declared budget bought nothing
except the ability to observe the other rules. The four runs that finish under
20,000 are unaffected; the two `feedback` seeded runs stop at exactly 20,000
evaluations instead of running to `Q4`.

**AND THAT IS THE PART TASK 11 MUST NOT MISS.** `stripboard/rules.json`'s own
note on `evaluationCap` says, verbatim: *"A RUN THAT STOPS ON Q5 IS REPORTED AS A
FAILURE RATHER THAN AS A RESULT — reaching it means either the search or Q4 is
broken, and both are worth knowing."* CRITERIA `Q5` says the same. So at the
committed cap, **the two `feedback` seeded runs produce a board that clears the
hand result and are simultaneously runs the rules file declares failures.** A
result and a failure at once is not a contradiction in the taxonomy — a stop is
not a pass, and that separation is the point — but it is a live, measured
inconsistency between the committed cap and this architecture, and it is the
single most important thing this section hands forward. The cap is not a
nice-to-have calibration: at its current value a healthy run of the new search
reports as a malfunction.

**NO NEW VALUE IS PROPOSED HERE.** The 2,000,000 above is a declared
experiment parameter whose only job was to keep `Q5` out of the way so the other
five rules could be observed, it is reported with every figure it produced, and
it is **not** a recommendation. Setting the cap is Task 11's measurement and a
`PAR3` decision for the owner, under `K3`'s ratchet. The one datum this run
contributes to it: a three-climb seeded run of an eleven-net board costs 36,250
evaluations and about 2.7 seconds, and a climb from a sixteen-by-eighteen hand
board costs 3,069 and about 0.1 seconds.

### 14.9 Nothing was tuned to make a number improve

Stated because the plan asks for it and this repository's record documents the
failure five times. Across Task 10: **no weight was changed** (`stripboard/rules.json`
is untouched), **no term was added to `OBJ1`** — no area term, no tidiness term,
`OBJ2` forbidding the second outright — **no seed rule was altered**
(`lib/stripboard/seed.ts` and `derivedOrderings` are untouched; the `rcm`
ordering is read from `tools/stripboard/targets.ts`, which predates this task),
and **no move was added to or removed from `movesFrom`**. The only figures this
task chose are the evaluation cap of §14.8 and the test's own wall-clock timeout,
both declared as experiment parameters and neither readable by the gate.
