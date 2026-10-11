# What the stripboard pipeline's verification does and does not cover

This page is the register of what the pipeline's checks prove, and — more
useful — what a pass of each one leaves uncovered. It is opened here by the
first task with a finding to put in it, and is extended as later tasks measure
more; it is not a document written at the end, because a document written last
is one whose early findings were held in somebody's head until then.

At this point it covers `HC8` alone: its trust boundary, its nine refusals, and
the one refusal that belongs to a different module than the one `HC8`'s
contract names. `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`
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

### 1.8 What an `HC8` pass does **not** cover

- A defect in VeroRoute's geometry export (§1.2, limit `H-13`).
- Whether the board can be built: spans, pin patterns, stock extent and
  legibility are `HC4`, `HC5`, `HC6`, `HC9` and `HC10`, and `HC8` is silent on
  all of them.
- Whether the **reference netlist** is right. `HC8` compares the copper against
  that netlist; both being wrong the same way is not something it can see.
