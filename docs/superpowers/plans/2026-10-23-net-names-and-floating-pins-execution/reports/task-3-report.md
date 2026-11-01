# Task 3 report: remove the casing demand

**Status: DONE.** Commit `257817e` on `feature/schematics-tooling`, pushed.
Nothing blocked. One deviation from the brief's stated mechanism, driven against
the tree and recorded in `docs/known-gaps.md` **G281**.

## The replacement predicate, as it now reads, and the reason given

`lib/schgen/ir/types.ts`:

```ts
export const NET_NAME = /^[^\u0000-\u001f]+$/;
```

**Non-empty** (the `+`) **and free of control characters**, exactly the class
`str()` refuses at `lib/schgen/render/sexpr-write.ts:31`.

**The reason attached to it is the silent rename, NOT rejection**, because
"KiCad rejects a control character" would be false for four of Task 1's six
arms. The comment on the constant carries the measured table - tab accepted
**verbatim** at exit 0, newline refused at exit 3, **carriage return and NUL
both at exit 0 with a drawn label and a net name that came back as `RAWCR` and a
truncated `RAW`** - and then says why that is the reason: *"the hazard is the
opposite of rejection - two of them SUCCEED and RENAME the net ... A check
asking only whether `kicad-cli` succeeded would pass both."*

**Non-empty has its own stated reason:** `lib/model/types.ts:44-45`'s `net()`
throws `"net name must not be empty"`, so a rule here accepting `""` would be
weaker than the contract it guards.

**Punctuation is refused by nothing**, and the comment says that is measured:
`Net-(C10-Pad1)` and `unconnected-(U1-CLK_O-Pad5)` parse, round-trip
byte-identical and render, and `quoteString` escapes nothing for them.

**DEL and C1 are in neither class and were never measured** - said on the
constant, asserted in the test, recorded in **G280**.

## The board census, before and after

Same command both times: `SCHGEN_SOURCE=... bun tools/schgen/board-sheets.ts`.

| | before | after |
| --- | --- | --- |
| **boards producing a schematic** | **0 of 11** | **0 of 11** |
| `pt2399-core` | **18** problems: 17 net names + 1 single-pin net | **1**: `net unconnected-(U1-CLK_O-Pad5) has only one pin (U1.5)` |
| `pultec-hi-boost` | **20**: 19 net names + 1 pin | **1**: `part SW_HI_BOOST: pin MP () is neither on a net nor declared not connected` |
| `pultec-hi-cut` | **14**: 13 net names + 1 pin | **1**: `part SW_HI_CUT: pin MP ()` |
| `pultec-low-boost` | **14**: 13 net names + 1 pin | **1**: `part SW_LO_BOOST: pin MP ()` |
| `pultec-low-cut` | **14**: 13 net names + 1 pin | **1**: `part SW_LO_CUT: pin MP ()` |
| `pultec-mid` | **28**: 27 net names + 1 pin | **1**: `part SW_MID: pin 12 (12)` |
| the five `transistor-preamp` boards | ELK geometry, unchanged | ELK geometry, **unchanged, byte for byte** |

**This is the task's measurable outcome and it is "six boards now refuse on ONE
problem each", not "six boards fixed."** **G274**'s warning still binds: the
census names the first refusing problem per board.

On the parity set (`tests/schgen/authoring-complete.test.ts`, re-pinned from
measurement): `optical-compressor` **14 -> 0** drawing refusals, `pt2399-core`
**18 -> 1**, `opamp-buffer` and `transistor-preamp` unchanged.

## Suite, accounted term by term

`SCHGEN_SOURCE=... bun test`

| | before | after |
| --- | --- | --- |
| pass | 3822 | **3830** |
| fail | 0 | **0** |
| `expect()` | 43622 | **43668** |
| files | 354 | **355** |

**Tests +8:** -2 the deleted `describe("NET_NAME")` in
`tests/schgen/ir/author.test.ts`; -1 the `it.each` row in
`tests/schgen/gates/pin-table.test.ts`; -1 V1 in
`tests/schgen/ir/validate.test.ts`; **+12** the new
`tests/schgen/ir/net-name.test.ts`. Files **+1**, that same new file.

**`expect()` +46, and the fourth term is the one nobody would predict.**
-11 / -1 / -1 / +60 for the four files above is **+47**. The missing one is
`tests/schgen/verify.test.ts:156` - `for (const p of gate1?.problems ?? [])
expect(p).not.toContain(...)` is **one expect per gate-1 problem**, and the
ported `mini` design carried exactly one net-name refusal, so that file went
**53 -> 52**. **The suite's `expect()` total is therefore not a static property
of the tree.** Measured, not inferred: the per-file counts came from a temporary
`git worktree` at `HEAD` with `node_modules` symlinked, since running a `HEAD`
copy of a test against the changed library under-reports (a failing expect
aborts the rest of its test). The worktree is removed. Recorded in **G281**.

`bun run typecheck` - **clean**, `tsc --noEmit`, exit 0.

`make check` not run: **RED on four boards at HEAD** for the causes in **G251**,
pre-existing and not this task's.

## TDD evidence: the new tests driven red first

`lib/schgen/ir/types.ts`'s predicate was temporarily restored to
`/^[A-Z0-9][A-Z0-9_]*$/` and the `netNames` rule reinstated in place (by `Edit`,
reversed by `Edit` - never `git checkout HEAD --`). Against that pre-change
behaviour `tests/schgen/ir/net-name.test.ts` reported **6 pass / 6 fail / 52
expect()**, the six red being:

- accepts a lower-case authored name
- accepts a KiCad synthetic name
- refuses every control character in `str()`'s class, and refuses exactly that class *(red on the DEL/space boundary half)*
- the gate accepts a lower-case mechanical net
- `validateCircuit` validates a circuit whose nets are all lower case
- `validateCircuit` reports no net-name problem for a synthetic name

**The six that passed under BOTH predicates are the refusal cases** - empty
string, non-string, control characters, the UPPER_SNAKE positives - which is the
point: they are there so a future loosening cannot pass unnoticed, and a test
that only went red would not have shown they did not regress. After restoring
the change: **12 pass / 0 fail / 60 expect()**.

Every refusal is asserted **by message**: `MECHANICAL_REFUSAL` is the full
`pin table X: mechanicalPads.9 must be {"net": "<NAME>"} or {"nc": true}` and
the `validateCircuit` cases assert `toEqual([])` - an **empty problem list**,
not merely the absence of a net-name problem, which is what makes them a control
on the rule being gone rather than quiet.

## THE DEVIATION, and it is the finding worth reading

**The brief's Step 3 mechanism would have broken port fidelity.** It said to
edit `lib/schgen/gates/pin-table.ts:60` in place:

```ts
if (typeof net !== "string" || net.length === 0) throw fail();
```

**That file is a byte-checked PORT.** Its `files[]` entry in
`tools/schgen/port-manifest.json` carries no `cuts`, and
`tests/schgen/port-fidelity.test.ts`'s first test asserts it equals
`rewrite(<pedals source>, entry, manifest)` on every run. The same is true of
`tests/schgen/gates/pin-table.test.ts`. The brief, the spec's part 2 and the
plan's file table all name that line and **none of them mentions the manifest**;
the sibling repo is read-only, so the only route to the brief's shape was **two
new `diverged[]` entries**, each costing its file's byte-check against upstream
permanently (**G139**).

**What was done instead meets the brief's criterion exactly, at zero fidelity
cost.** `NET_NAME`'s **definition** moved - in `lib/schgen/ir/types.ts`, already
a declared divergence - so the gate's line is **untouched** and still reads
`typeof net !== "string" || !NET_NAME.test(net)`. Therefore:

- the **type check survives verbatim**, which is what the brief's point 1 and
  the spec's review finding 4 both single out;
- the **empty string is still refused**, so the gate does not become weaker than
  `net()`;
- a **control character is now refused**, which the brief's own edit would **not**
  have done - `net.length === 0` admits `"RAW\u000dCR"`;
- **no file left the byte-check.** The only changes to the two ported test files
  are declared `cuts`, which are pure deletions of the two assertions that
  asserted the case demand, and `bun tools/schgen/port.ts` regenerates both
  (it did; the porter's own header edit for a cuts-bearing entry is in the diff).

**The residual cost, stated rather than hidden:** the gate's `fail()` message is
unchanged and still lumps five failure modes together, so **the gate itself does
not name the control-character reason** - that reason lives on `NET_NAME`'s
definition, which the gate's one call site reads. Naming it in the thrown string
is available only by diverging the file, and that trade is **G281**'s open
residual rather than this task's to take.

## Everything changed, and why

| file | what |
| --- | --- |
| `lib/schgen/ir/types.ts` | `NET_NAME` redefined, with the measured reason, the `str()` alignment, the punctuation finding and the DEL/C1 boundary on it |
| `lib/schgen/ir/validate.ts` | `netNames` **deleted** and out of `DRAWING_RULES` (ten rules); a comment where it stood carries the owner's words, what still carries the control-character clause, the **emit-time relocation**, and that `partShapes`' part-label demand is out of scope |
| `lib/schgen/authoring.ts` | `netsNotUpperSnake` **deleted** (supersede means delete, not a stub) and the `NET_NAME` import with it |
| `tools/schgen/authoring-census.ts` | the field, the call and the census line that printed it, removed |
| `tools/schgen/gate-census.ts` | the `netNames` label **kept, empty**, on the precedent that file already states for `bomFields`, with a comment saying why |
| `tools/schgen/label-syntax/probe.ts` | **the pre-Task-3 casing regex frozen as a local constant.** Importing `NET_NAME` would have made Task 1's committed `probe-run.log` figure of **20** report **0** on the next run - a measurement irreproducible from its own tool. The printed labels now name the pre-Task-3 rule |
| `tools/schgen/label-syntax/fixtures.ts` | one arm's `why` string no longer claims `NET_NAME` refuses the others |
| `tools/schgen/port-manifest.json` | two `cuts` entries; Task 3 added to three `diverged` reasons; the new test declared `handWritten` |
| `tests/schgen/ir/author.test.ts`, `tests/schgen/gates/pin-table.test.ts` | **regenerated by the porter** from the declared cuts, not hand-edited |
| `tests/schgen/ir/validate.test.ts` | V1 deleted, with its source and the owner's words in a comment in its place |
| `tests/schgen/authoring-complete.test.ts` | the `netNames` class removed (not pinned at zero - `validateCircuit` cannot produce it), tuples re-measured, the comment's now-dead tripwire example corrected |
| `tests/schgen/ir/net-name.test.ts` | **new**, hand-written |
| `docs/known-gaps.md` | **G150** amended; **G279**, **G280**, **G281** added; **G259**'s stale table row marked |

**Nothing else was loosened.** The non-comment diff of every touched test file
was read back for exactly that: the only assertion changes are the three
deletions that go with the deleted rule, and the re-measured count tuples.

## Three things the next agent should know

1. **`tests/schgen/ir/net-name.test.ts` first used an invented lib id `"L:S"`
   and `tests/kicad/symbol-names.test.ts` caught it** - that sweep resolves every
   `<Library>:<Name>` in the source against an installed KiCad and has an
   exemption list with teeth. The fixture now names `Device:R`, a real symbol, so
   no exemption was added. **The guard worked exactly as its comment claims**, and
   the fix was to stop inventing a name rather than to widen the list.
2. **Control-character escapes typed into a tool parameter became real control
   BYTES on disk**, three times, in `types.ts`, `validate.ts` and the new test -
   including a NUL that made a regex un-parseable and two that silently split a
   doc comment across lines. They were found **by counting bytes, not by reading**;
   the scan now covers every touched file plus `docs/known-gaps.md` and reports
   **zero**. Anything written about this subject matter must be byte-scanned, and
   Python's text mode also **translates `\r` on READ**, which made the first repair
   attempt fail to match its own target.
3. **Task 4 and Task 5 inherit exactly one problem per board**, and the census
   above names it verbatim for each. `validateCircuit` now refuses those six on
   nothing else.

---

# Round 1

**Status: DONE.** Commit `35011ed` on `feature/schematics-tooling`, pushed, on top of the
coordinator's plan correction `18eb600`. Working tree clean, in sync with origin. Nothing blocked;
**no file was taken off the byte-check** and neither item required it.

### The new validation-time refusal, as it reads

`lib/schgen/ir/validate.ts`'s `netNames` rule is back, **first in `DRAWING_RULES`** (eleven rules).
Printed from a real `validateCircuit` run:

> `net "RAW\rCR" is not a usable net name: it carries a control character (U+000D). Two of these
> are ACCEPTED by kicad-cli 10.0.5 at exit 0 and DRAW the label, and then come back from the
> netlist as a DIFFERENT net name - U+000D as "RAWCR", U+0000 truncated to "RAW" - so the net is
> silently renamed rather than refused, and no exit code reports it. That is why this is refused
> here rather than defaulted away: the failure mode is a success. A tab is accepted verbatim by
> KiCad and is refused anyway, so the whole class draws one line. Remove it from the net name in
> the circuit model. Measured: tools/schgen/label-syntax/probe-run.log`

and for the empty case:

> `net "" is not a usable net name: it is empty. lib/model/types.ts's net() refuses one ("net name
> must not be empty"), so nothing upstream should have produced it, and nothing downstream can
> draw a label for a net with no name. Name the net in the circuit model.`

**Every offending character is named**, in order: a net carrying both reports
`control character (U+000D, U+0000)`. **The message is one line deliberately** -
`tests/schgen/verify.test.ts:156` asserts, once per gate-1 problem, that the problem has no
newline in it, so a multi-line refusal would have broken that file rather than this one. There is
a test for exactly that.

**It was driven red first**, five ways: CR, NUL, tab, empty, and the multi-character case. **5 of
20 red** before the rule existed, green after. The code builds its control characters with
`String.fromCharCode` and contains **no control escape at all** - deliberate, given what happened
twice on this plan.

### Item one: G279 is CLOSED, which means DELETED

Both halves are resolved, so the entry is gone rather than marked closed, and **every reference to
it was rewritten in the same change** - `CLAUDE.md`'s *"check what the deletion takes with it"*:
G150's clause 2 and its settlement clause, G280's reason clause, `net-name.test.ts`'s header,
`lib/schgen/ir/types.ts`'s caller paragraph, and **two divergence reasons in
`tools/schgen/port-manifest.json` that still asserted the rule was deleted and `DRAWING_RULES` was
ten rules.** `grep -rn G279 lib tests tools docs` returns **0**.

**G281's residual is subsumed, and the reason is worth more than the fix.** That entry said the
gate's lumped `fail()` could not name the control-character reason without leaving the byte-check.
The real problem was different: round 0 had made the **gate** the only production application of
`NET_NAME`, and a gate over a pin table's `mechanicalPads` net is **not where a net name becomes a
label**. With the rule restored the gate is a **backstop on a different input** - the
validation-time refusal fires first, at gate 1, names the net, and explains itself. **The
byte-check was never worth trading for a message on that input.** What is still true of the gate -
five failure modes under one message, no reason for any of them, true before Task 3 and untouched
by it - is left standing in G281's criterion so the entry does not overclaim.

Two more corrections of my own round-0 text, both now false rather than merely incomplete:
`tools/schgen/gate-census.ts`'s comment claimed *"nothing can produce this row again"*, and its
matcher still looked for the deleted `is not UPPER_SNAKE` message; and
`authoring-complete.test.ts`'s comment said the class was dropped because `validateCircuit`
*"cannot produce it at all any more"*. The class is back there with a 4-tuple, **0 on all four
circuits, and that zero is a measurement rather than a tautology** - it is in the list so a
net-name refusal cannot arrive as *"a reason none of the register entries covers"*.

### Item two: the replacement tripwire, and it refuted my own round-0 claim

`tests/schgen/ir/net-name.test.ts` now asserts **the IR's net set is the model's net set, exactly,
over all 13 declared cases** (4 parity circuits + 9 boards, **198 nets**), with a floor assertion
so the sweep cannot silently range over nothing.

**Driven red by perturbing the generator in place** - `connection.net.toUpperCase()` at both
pin-assembly sites in `lib/schgen/from-network.ts`, restored afterwards (`git diff` on that file is
empty). It failed naming the circuit and the net.

**AND THAT PERTURBATION REFUTED WHAT I WROTE IN ROUND 0.** I claimed *"nothing now notices a
normaliser"*. Measured, not reasoned:

| under a case-folding generator | |
| --- | --- |
| `authoring-complete.test.ts`'s refusal COUNTS - the mechanism its own comment named | **passed** |
| `authoring-complete.test.ts`'s *"the one single-pin net is pt2399-core's CLK_O placeholder"* | **failed** |
| `tests/schgen/ir/validate.test.ts` | **passed, 17 of 17** |
| the new sweep | **failed, naming the circuit and the net** |

So one assertion does catch *this* normaliser - **incidentally**, because it spells
`net unconnected-(U1-CLK_O-Pad5) has only one pin (U1.5)` out in full. That is a literal name on
one net of one circuit; a rename that left that net alone, a truncator, or a rename on any of the
other 197 nets would not reach it. **The mechanism the old comment actually named - the refusal
count - did not fire.** The corrected measurement is in the test's own header and in both comment
blocks that used to carry the wrong claim.

**Why the replacement is stronger than the original**, which is the coordinator's point and it
holds: the old count noticed a normaliser only because normalising would have made names *pass* a
rule they were failing. It was blind to a case-folder on an already-upper-case name, to a
truncator, and to any rename between two names the rule accepted. Set comparison catches all three,
over every declared case, and states **G150**'s *"stated once and is reversible"* directly. **What
it does not cover is named in the test:** the `Circuit` to emitted sheet to exported netlist arm is
gate 3's (*"netlist equals IR"*), and nothing here duplicates it.

### Measurements

**Board census, re-driven** (`SCHGEN_SOURCE=... bun tools/schgen/board-sheets.ts`): **unchanged
from round 0 - still 0 of 11 boards, and the six still refuse on ONE problem each.** `pt2399-core`
on `net unconnected-(U1-CLK_O-Pad5) has only one pin (U1.5)`; each Pultec board on its
`part SW_*: pin MP ()` / `pin 12 (12)`. **Restoring the rule added no refusal to any board**, which
is what a character rule rather than a convention should do.

**Suite: 3830 to 3838 pass / 0 fail / 43668 to 43688 `expect()` / 355 files unchanged.**
Accounted term by term: **+8 tests and +20 expects, all of them in
`tests/schgen/ir/net-name.test.ts`** (12 tests / 60 expects to 20 / 80). Confirmed per file:
`verify.test.ts` **52** (unchanged), `authoring-complete.test.ts` **740** (unchanged, 37 tests),
`validate.test.ts` **27** (unchanged, 17 tests).

**`verify.test.ts` staying at 52 is a result, not a non-event.** It has one expect per gate-1
problem, so if the restored rule had refused anything in the ported `mini` design that file would
have gone to 53 - and the predicate would have been wrong, refusing something the casing rule used
to refuse. It did not. Recorded in **G281**, which now carries the dynamic-count lesson confirmed
from both directions.

`bun run typecheck` **clean**. `tests/schgen/port-fidelity.test.ts` **12 pass / 0 fail / 117
expect()** - nothing left the byte-check. `make check` still not run (G251, pre-existing red).

**Byte-scanned, not read:** every file touched plus `docs/known-gaps.md`, **0 stray control
bytes**; `file` reports UTF-8 text and `grep` matches. No control escape was typed into any tool
parameter this round.

### Concerns

1. **`validate.ts` is now comment-heavy and the `netNames` block is the largest single comment in
   it.** It earns its length - it is the record of a deletion that cost a round - but
   `CLAUDE.md`'s 300-500 line ceiling is in sight for that file. Worth a look before the next rule
   lands there; not this task's.
2. **The new sweep pins 13 cases by a hard-coded `13`.** A fourteenth declared case fails that
   assertion rather than silently widening the sweep, which is the behaviour I want, but whoever
   adds a board will see it fail and should update the number rather than delete the check.
3. **G281 is now a RECORD with no blocking residual** and says so, including when to delete it
   (next time anyone touches `lib/schgen/gates/pin-table.ts`). If the project would rather it went
   now, deleting it loses the reason three documents carried a refuted mechanism past review -
   that is the part I would keep.
