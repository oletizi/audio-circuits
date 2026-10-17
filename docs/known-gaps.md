Known gaps
==========

**A gap that is not in this file does not exist as far as this project is
concerned.** An agent that finds a defect it is not fixing records it HERE, in
the same change that found it, and commits it. A note in a plan ledger does not
count: `.superpowers/` is gitignored, so a ledger entry is invisible to review,
absent from the repository's history, and destroyed by `git clean -fdx`. This
file exists because that happened - findings accumulated in scratch across two
plans and were reported to the owner in conversation and nowhere else.

**This is a register, not a plan.** An entry states what is wrong, where, how it
was established, and what would settle it. It does not promise a milestone. An
entry leaves when it is fixed or when the owner rules it is not a defect, and in
either case it is DELETED rather than marked closed - supersede means delete.

Each entry carries:

- **Found** - the plan or change that surfaced it;
- **Evidence** - what was actually read or run, so a reader can re-establish it
  rather than trust it;
- **Verified** - whether the person writing the entry confirmed it themselves,
  or is relaying another agent's report;
- **Why it is open** - the reason it was not fixed when found;
- **What would settle it** - a fix, a measurement, or an owner decision.

---

Open: an owner decision is what settles these
---------------------------------------------

### G1 - the guide has two representations of a panel control and reconciles neither

`tools/guide/off-board.ts` represents a panel pot as a header PART with PIN
lines: its module comment says *"every pin of every connector part... and of
every panel pot's HEADER"*, and `potFunction` derives edge labels like
`"DRIVE ccw"` / `"DRIVE wiper"` from the circuit model. A pad-based control has
no PART line and no PIN line, so it takes the pad path added for G-fixed-1 and
gets its `<ref>.<pin>` identity rather than a functional label.

Both representations now exist and nothing chooses between them.

- **Found** `2026-10-16-pultec-five-boards`, Task 2.
- **Evidence** `tools/guide/off-board.ts` module comment and `potFunction` at
  `:28`; the pad path in `tools/guide/pads.ts`.
- **Verified** yes - the controller read both.
- **Why it is open** reconciling them moves edge labels, the checklist's
  junction rows and `valueLabel` together, and **whether a pad should carry a
  circuit-derived functional label is an acceptance criterion** - which the
  agent producing the artifact may not author.
- **What would settle it** the owner says which label a pad's wire should carry
  in the guide: its terminal identity (`RV_LO_BOOST.1`), a functional label
  (`LO BOOST ccw`), or both.
- **One thing already tilts the cost**, found by the Task 2 reviewer and worth
  knowing before the decision is made: a PART's label comes from the caller
  (`renderLayout` takes a `labels` map, and its module comment says so), but a
  PAD's label is derived inside the renderer from `pad.identity`. So all three
  packet images necessarily print the same pad text, and choosing the functional
  label would mean editing the renderer rather than the caller - the opposite
  side of the interface from where this module puts every other label. It does
  not foreclose the choice: the pad path keeps `ref` and `pin` as separate
  fields, so a functional label stays computable.

### G2 - pad labels crowd the row they sit in

Ten pad identities on the frozen low-boost render are legible but tight beside
the cut crosses in the same row.

- **Found** `2026-10-16-pultec-five-boards`, Task 2.
- **Evidence** the implementer rendered the frozen low-boost and read the PNG.
- **Verified** yes, 2026-10-16, Task 3 - confirmed by eye on a MATERIALISED
  low-boost rather than on the frozen one, by a second agent. Each pad
  identity is individually readable beside its own target ring and is tight in
  its row; two of them (`SW_LO_BOOST.7` on row I, `SW_LO_BOOST.3` on row M) are
  printed over a dark every-fourth-row alignment strip, which reads as a
  strikethrough. Usable, not comfortable.
- **Why it is open** how a drawing should look is the owner's call on a render,
  by this repository's own acceptance rule.
- **What would settle it** the owner looks at a low-boost render and says
  whether it needs shortening. **See also G17**, which is the same question
  asked of PART labels and reaches the renderer from the other side.

### G19 - the printed checklist calls ground `0`, which is the circuit's name and not a builder's

Now that a materialised board carries the circuit's net names, the names reach
a person. On `pultec-low-boost`'s checklist the ground net prints as **`0`**:
the junction row for `junction_grounds` reads *"O1 0, P1 0, Q1 0, R1 0, S1 0"*
and `junction_signals`' last terminal reads *"H1 0"*. `0` is the SPICE
convention for the ground node and it IS the name the circuit's own model
writes, so nothing invented it - but a build sheet that labels five wires `0`
is asking a builder to read a simulator's vocabulary.

`tools/guide/off-board.ts` already states the expectation it does not meet: its
module comment says a connector pin *"carries its net name as the circuit
writes it (`"GND"`, `"VCC"`)"*. On every Pultec section the circuit writes `0`.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 4, reading the first
  checklist that could be built from this pipeline.
- **Evidence** the checklist's own junction rows, printed above; `NODE 13 NAME
  0` in `--dump-board` of the committed `boards/pultec-low-boost/
  pultec-low-boost.perfboard.vrt`; the module comment at
  `tools/guide/off-board.ts:1-19`.
- **Verified** yes - built the checklist and read it.
- **Why it is open** it is **not new with Task 4 and not caused by it**: the
  owner's hand-laid layout stores the same name, so its checklist has always
  printed `0`. And what a printed artifact should call a net is an acceptance
  criterion about that artifact, which the agent producing it may not author.
- **What would settle it** the owner says whether the guide maps the circuit's
  ground net to a builder's label (`GND`) or prints the circuit's name
  unchanged. If it maps, the mapping belongs in the guide's labelling and never
  in the board or the netlist - the fork is told the names by the netlist, and
  renaming a net to suit a printout would make the model and the board disagree.

---

Open: a fix would settle these
------------------------------

### G22 - the model search cannot run on a board that has off-board pads, so the materialisation pipeline has no search in it

`lib/stripboard/search.ts` is a complete climb with its own `Q1`-`Q6`, and it
refuses `pultec-low-boost` on its first round:

```
stripboard-moves-part-geometry-unreadable: movesFrom was handed a board carrying
"off-board terminal", and the two things a move has to know about that part -
whether its terminals can be formed, and how far its body reaches past its pads -
could not be read.
no lead span is recorded for footprint "off-board terminal" ...
```

A pads-only control is placed with `OFF_BOARD_TERMINAL` as its footprint
(`lib/stripboard/seed-model.ts`), which is deliberately not in `LEAD_SPANS` -
a pad is not a part with leads to bend - and `movesFrom` calls the span lookup
for every part unconditionally. So every Pultec section, all of which declare
`OFF_BOARD_IDS`, is a board the model search cannot climb.

**The other side of the same hole:** the fork-gesture search cannot start from a
materialised board either. `occupancyOf` (`tools/stripboard/seed-geometry.ts`)
refuses a part facing `N` or `S`, which is most of a materialised board, so the
`import` arm cannot read a start from one.

So the pipeline that reaches a buildable Pultec board - construct a seed in the
model, `--materialize`, grade - **contains no search at all**: it evaluates one
constructed candidate per seed of the reviewed list and keeps the cheapest.
That is a statement about what the recorded figures mean, not only about
coverage.

**THE RECORD NOW SAYS SO, WHICH IS NOT A FIX FOR THIS ENTRY.** A run produced
by that pipeline records `tools/stripboard/termination.ts`'s `NO_SEARCH` rather
than a stopping rule it did not earn, and `tools/stripboard/adopt-checks.ts`
refuses to adopt from such a record. That makes the gap legible wherever it
decides something; the gap itself - that no search in this repository can run
on one of these boards - is unchanged.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 6.
- **Evidence** the refusal above, from `search(starts, setup)` over
  `seedsFrom`'s low-boost candidate with `LEAD_SPANS` and `PIN_PATTERNS`; and
  `occupancyOf`'s own refusal text for the facing.
- **Verified** yes, by running the model search on low-boost. The
  `occupancyOf` half is read off that function and off
  `tools/stripboard/climb-model.ts`'s recorded measurement, not re-run.
- **Why it is open** out of Task 6's scope, which was a run directory the
  adoption gate accepts rather than a search. Inventing a span for
  `OFF_BOARD_TERMINAL` would be the wrong fix twice over - a guessed geometry,
  and one for a thing that has no leads.
- **What would settle it** either a move set that skips a pad placement by
  asking whether it is one rather than by looking up its span, or a documented
  decision that a pad is immovable and `movesFrom` should say so by name.

### G21 - `StopState` still has no spelling for *there was no round*, although nothing records a stop through it without one any more

`tools/stripboard/stop.ts`'s `q3` is `acceptedThisRound === 0 && seedsRemaining
=== 0`, and CRITERIA states the first clause as *a full sweep of the move set
that produced no accepted move*. `StopState.acceptedThisRound` is a plain
`number`, so a producer with no move-set round has no way to say so and would
write `0` - which reads as a sweep that found nothing.

**`lib/stripboard/search-stop.ts` already draws this distinction and the tools
side does not.** Its `RunCounters.acceptedThisRound` is `number | undefined`
with a comment calling the `undefined` *"LOAD BEARING AND NOT AN ABSENT
COUNT"*, for exactly this case: *"`Q3` would then report a search exhausted
that never ran"*.

**THE LIVE INSTANCE IS GONE, AND THE ASYMMETRY ABOVE IS WHAT IS LEFT.** The
instance was `tools/stripboard/materialize-run.ts`, which built a `StopState`
with `acceptedThisRound: 0` in it, handed that to `evaluateStop`, got `Q3` and
then had to refuse to write its run directory at all. It no longer calls
`evaluateStop`: `tools/stripboard/termination.ts`'s `NO_SEARCH` is a state
outside `Q1`-`Q6`, the producer records it, and the fabricated counters were
deleted with the claim. So the typing gap is now a trap for a FUTURE producer
rather than a falsehood in a record anything writes - which is a smaller gap
and a different one, and the entry is rewritten rather than closed because the
field is still a plain `number`.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 6.
- **Updated** in the change that added `tools/stripboard/termination.ts`, which
  removed the live instance.
- **Evidence** `q3` in `tools/stripboard/stop.ts`, `StopState` in
  `tools/stripboard/stop-model.ts`, and `RunCounters` in
  `lib/stripboard/search-stop.ts` beside each other.
- **Verified** yes, by reading all three; the removal of the instance is
  verified by `tools/stripboard/materialize-run.ts` containing no
  `evaluateStop` call and by the produced `run.json` recording
  `"stoppingRule": "no-search"`.
- **Why it is open** widening `StopState` changes a type
  `tools/stripboard/place.ts` and four test files build, and no producer needs
  the wider type today - `place.ts` always has a real round, and a producer
  with none records `NO_SEARCH` instead of a rule.
- **What would settle it** `acceptedThisRound: number | undefined` on the tools
  side with `q3` refusing the `undefined` case, which is the shape
  `lib/stripboard/search-stop.ts` already has.

### G25 - the low-boost run directory is produced and grades admissible, and the adoption gate has no clause that admits a run which performed no search

**IT REPLACES THE ENTRY G23 WAS**, which recorded that this board was refused
for clustering - `kappa = 0.25` against `kappa_bench = 0.05` - and named *the
owner's ruling on the bound* as one of the two things that would settle it. He
ruled: *"i prefer the loose layout. It's much easier to build. I don't see the
problem"* and *"if the layout is electrically correct, let's keep it. It looks
fine to me"*. `kappa_bench` is now `null`, `A2` does not fire, `failing-check`
no longer refuses this run for clustering, and that entry is DELETED rather than
marked closed. The whole account of the withdrawal - his words, the four
measured hand-laid figures `kappa` = 0.055 / 0.181 / 0.196 / 0.269 that all sat
ABOVE the withdrawn bound, and the superseded value's entire reason verbatim -
is in `stripboard/rules.json`'s `kappaBench` note, which is where the value
lives.

**WHAT THIS ENTRY SAID UNTIL THE `termination.ts` CHANGE, AND WHY IT NO LONGER
DOES.** It said the producer refuses to write the run directory at all:
`tools/stripboard/materialize-run.ts` recorded `Q3`, the board graded
`admissible`, `exitCodeFor("admissible", "Q3")` is 0, and
`assertRuleNotLoadBearing` fired. The repair was not to weaken that guard or to
pick a different rule - its own message forbids both - but to stop the record
carrying a claim no run earned: `tools/stripboard/termination.ts` gives a
producer that swept no move set a way to say so, the materialisation path says
it, and `evaluateStop` is not called on that path at all. **The run directory is
produced now**, under the committed rules, recording
`"stoppingRule": "no-search"` and `"bound": "no-bound"` beside
`"outcome": "admissible"`.

**WHAT BLOCKS ADOPTION IS NOW A STATED GAP IN THE CRITERIA RATHER THAN A
FALSEHOOD IN A RECORD.** Measured over a freshly produced run, eight of the nine
drivable adopt checks pass - `candidate-hash`, `rules-hash`, `span-hash`,
`pin-pattern-hash`, `frozen-fixture-hash`, `provenance-chain`,
`veroroute-commit`/`built-commit` and `uncommitted-layout`. `failing-check`
refuses:

> `failing-check: .../run.json records the stopping rule "no-search", and a run
> recording no-search swept no move set and bounded nothing ... CRITERIA G2.5
> admits a run through exitCodeFor(outcome, rule) over Q1-Q6, and NO CLAUSE OF
> CRITERIA SAYS WHAT A NO-SEARCH RUN MAY BE ADMITTED ON`

`G2.5` admits a run through `exitCodeFor(outcome, rule)` over the six rules, and
**every one of the six describes how a search terminated**. An agent may not
author the clause that would admit a run which performed none, so the gate
reports this materialisation and does not adopt it. The tenth check, the
post-copy `make -C boards/pultec-low-boost check` (`G4`), is not reachable
without the copy and was not driven.

**ONE COST THIS CHANGE REMOVED, RECORDED BECAUSE THE PREVIOUS VERSION OF THIS
ENTRY RECORDED IT.** `tests/stripboard/materialize-run-fixtures.ts` carried
`GRADED_RULES` - the committed rules plus the withdrawn `0.05` - purely so a run
directory existed for `materialize-run.test.ts` and
`materialize-run-perturbed.test.ts` to drive the gate over, which meant neither
file graded a run under the reviewed parameters. That fixture is deleted and
both files now run under `loadRules()`.

- **Found** `2026-10-16-low-boost-to-adoption`, in the change that unset
  `kappaBench`.
- **Updated** in the change that added `tools/stripboard/termination.ts`, which
  moved the blocker from the producer to the gate and made the record true.
- **Evidence** a produced run directory under the committed rules, every adopt
  check driven over it one at a time; and
  `tests/stripboard/materialize-run.test.ts`'s *"failing-check: the gate refuses
  a run that performed no search"*.
- **Verified** yes - measured, not argued.
- **Why it is open** whether a run that performed no search may be adopted is a
  criteria question, and an agent may not author the answer. Weakening the gate
  is the one repair its own message forbids.
- **What would settle it** the owner's decision on what a no-search
  materialisation may be adopted on - or G22's search, after which a `Q`-rule
  would be earned and `G2.5` would decide the question it already can.

### G26 - `docs/stripboard/pipeline-verification.md` still presents `kappa_bench = 0.05` as the live parameter

That document's parameter table (section near line 2982) reads *"`kappa_bench =
0.05` | The hard end of a ratchet"* and a later section concludes against
*"`kappa_bench` 0.05"*. The bound was withdrawn on 2026-10-16 (see G25 and
`stripboard/rules.json`'s `kappaBench` note), so the table states a current
parameter that no longer exists.

The MEASUREMENTS in that document are unaffected and are not wrong: they record
what was measured against the bound in force at the time, which is what a
verification log is for. It is the parameter table - written in the present
tense - that now misleads.

- **Found** `2026-10-16-low-boost-to-adoption`, in the change that unset
  `kappaBench`.
- **Verified** yes - `grep -n "kappa_bench" docs/stripboard/pipeline-verification.md`.
- **Why it is open** it was not this change's file to rewrite, and a verification
  log needs its figures read in the context of the run that produced them rather
  than retro-fitted to today's parameters.
- **What would settle it** one edit to the parameter table saying the bound is
  withdrawn and pointing at `stripboard/rules.json`'s note, leaving every
  measured figure as it stands.

### G24 - the adoption gate cannot re-derive `metrics.outcome` or `metrics.stoppingRule`, so a coherent edited pair clears `failing-check`

`assertVerdictAdmits` reads the outcome and the stopping rule off `run.json` and
has no candidate or run to re-derive either from, so a `run.json` whose
`stoppingRule` and `bound` are changed to a pairing `REP4` licenses - `Q3`
beside `search-exhausted` - **with the canonical hash recomputed** passes the
check, as does an `outcome` changed to `admissible`. Measured, not argued:
`tests/stripboard/materialize-run-perturbed.test.ts` asserts the pass.

**THE RULE FIELD JOINED THE OUTCOME HERE WHEN `no-search` ARRIVED**, and the
consequence is worth stating plainly: the only thing between a materialised
board and an adoption on an unearned rule is the PRODUCER refusing to write one
(`assertRuleNotLoadBearing`), because the gate reading a `Q`-rule cannot tell an
earned one from an edited one. The bound check catches an INCOHERENT pair and
not a coherent one.

`adopt-checks.ts` closed the same hole for `metrics.bound` and says why in its
own words - *"a tamperer recomputes the hash over the values it edited, and
`run.json` is the one artifact where the bound and the rule can disagree
undetected"* - by re-deriving the bound from the rule. The outcome has no second
source inside the gate: it is a function of the candidate's ten constraint
results, its score and the targets, none of which the gate re-measures.

**What stands behind it is `G4`.** `adoptLayout` runs `make check` on the board
as adopted and reverts the copy on a non-zero exit, so a fabricated outcome does
not by itself put a bad board in `boards/`. It does put a board the pipeline
reported as below target there.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 6.
- **Updated** in the change that added `tools/stripboard/termination.ts`, which
  put the stopping rule in the same position as the outcome.
- **Evidence** the passing assertion named above, and `assertVerdictAdmits` in
  `tools/stripboard/adopt-checks.ts`.
- **Verified** yes.
- **Why it is open** re-grading the candidate inside the gate means the gate
  re-running the scorer and the ten constraints on the `.vrt`, which is a
  different gate from the one this milestone was told not to change; and the
  rule has no second source at all - a run's counters are not in `run.json`.
- **What would settle it** either the gate re-deriving the outcome from the
  recorded constraint results and score the way `verdict.ts` does - the same
  shape as the `bound` fix, and reachable without a fork invocation - or a
  stated decision that the producer is trusted for this one field.

### G18 - the fork's two stretch bounds disagree, so a 2-increment type can shrink below its minimum

`FootPrint::CanStretch` (`Src/FootPrint.h:90-91`) permits a shrink whenever
`GetCols() > CompTypes::GetMinLength(m_type)`. `Grid::StretchComplex`
(`Src/Grid.h:241`) refuses one only when `GetCols() == GetMinLength(eType)` -
**exact equality** - and otherwise allocates `GetCols() - GetStretchIncrement`.

For a type whose increment is 2 - `SWITCH_ST`, `SWITCH_DT`, `BLOCK_200` - a
component sitting at `min + 1` therefore passes the permission test (`min + 1 >
min`), misses the equality guard (`min + 1 != min`), and is allocated at
**`min - 1`**, one hole below the minimum the type declares.

The same shape applies at the top end: `CanStretch` permits a grow at
`max - 1`, and `StretchComplex`'s equality guard does not catch it.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 2's re-reviewer, while
  checking that the new parity guard's arithmetic refused nothing legitimate.
- **Evidence** the two files and lines above, read side by side.
- **Verified** yes - the controller read both, rather than relaying the
  reviewer's claim.
- **Why it is open** it is **PRE-EXISTING in the fork's own stretch machinery**
  and predates every change this program made. The parity guard added in Task 2
  only refuses lengths that were already unreachable; it neither caused this nor
  widened it. Nothing in this program is known to reach it: a moulded part
  carrying nets cannot be stretched at all, which is what keeps the Pultec
  boards clear of it.
- **What would settle it** make the two agree - most likely by giving
  `StretchComplex` the same `>`/`<` test `CanStretch` uses - with a test that
  puts a 2-increment type at `min + 1` and asserts it does not go below `min`.
- **A cosmetic relative, recorded here rather than as its own entry.**
  `Headless_materialize_span.cpp:217-219`'s out-of-range refusal is now on the
  wire path too, and `GetMaxLength(COMP::WIRE)` is `INT_MAX`, so a wire refusal
  would read *"outside the 2..2147483647 holes this build allows a Wire to be"*.
  Unreachable today - `ParseWire` refuses a degenerate wire and a fresh `WIRE`
  is 3 cols against a minimum of 2 - but it is a message path that did not exist
  before the two loops were merged.

### G13 - `--stretch` cannot change a part's span on a packed board

**Read the narrowing at the end of this entry before relying on it.** As first
written this entry claimed that bringing a base board's footprint spans to a
candidate's lead spans needs an ordering; that claim is true of `--stretch` and
false of `--materialize`, and the span step landed inside `--materialize`
(`.tools/veroroute-perfboard/Src/Headless_materialize_place.cpp`'s
`SolvePlacement`) without needing one. **The gap that entry recorded - nothing
reconciling a base board's spans with the candidate's, so `--materialize`
refused on low-boost's first capacitor - is CLOSED and its entry is deleted
rather than marked, per this file's own rule.**

`--stretch` takes the part off, changes it, and refuses when it cannot put it
back. Both boards a materialisation could start from are packed, so a span
gesture driven from OUTSIDE the fork cannot be run in place:

- on the owner's committed hand layout, **six of the seven placed parts refuse
  `--stretch` in both directions**;
- on a board built fresh by `--import`, every SHRINK succeeds and **every GROW
  refuses** - `--import` packs the parts shoulder to shoulder in rows 0-2.

Standing the step in by hand required `--move`ing all seventeen two-lead parts
onto rows of their own, in two column bands, before any span could be set.
`--move` has its own two refusals that bear on this: a destination that is not
free, and a destination outside the board's `GRID` (the `--import` board is
`GRID 35 35`, which will not take seventeen parts strung down one column).

- **Found** `2026-10-16-pultec-five-boards`, Task 3, while probing past the span
  disagreement that `--materialize` now settles itself.
- **Evidence** the fork's `--stretch` and `--move` refusals, both quoted in
  full in that task's report; the probe that got through by spreading first.
- **Verified** yes - run, not relayed.
- **Why it is open** it was recorded as the constraint on the span step rather
  than as a defect of its own, and naming it was the point. The span step no
  longer goes through these two verbs, so what is left is a limitation of
  `--stretch` and `--move` with no current caller.
- **What would settle it** either a `--stretch` that pans or spreads to make
  room, or an owner ruling that a packed board is simply not stretchable in
  place and the refusal is correct as it stands.
- **NARROWED, 2026-10-16, by reading the fork.** This entry is true of
  `--stretch` and **is not true of `--materialize`**, so it never constrained
  the span step the way the sentence above expected. `MaterializeLayout`'s PHASE 2
  calls `board.FloatAllComps()` at
  `.tools/veroroute-perfboard/Src/Headless_materialize_apply.cpp:369` -
  `Board::FloatAllComps` (`Board_components.cpp:781-784`) is `TakeOff` on every
  component in the manager - and `WipeCopper` on the line after it. By the time
  the turn search runs in PHASE 4, **every part is already off the board and the
  copper carries no nets**, and `PlaceTarget`
  (`Headless_materialize_place.cpp:154-190`) performs the single `Board::PutDown`
  of the run at the hole the document declares. There is no "put it back", which
  is the gesture this entry is about. A span set inside the turn search therefore
  needs no spread-first ordering, and the one that landed there has none.
  - **What survives of it:** `PlaceTarget`'s `PutDown` can still refuse a longer
    footprint that overlaps a hole an earlier target claimed. That is a NAMED
    refusal with nothing written and nothing left floating - not this entry's
    silent float - and the rectangle after a stretch is the one the document
    declares, which is the rectangle the model's own overlap checks were run
    over. It has not been seen: low-boost materialises with every part at its
    declared separation and nothing collides.
  - **The entry stays open** because `--stretch` and `--move` still behave
    exactly as recorded, and anything that reaches for them to change a span on
    a packed board will still hit this.

### G16 - `boards/pultec-low-boost` declares no schematic, so `make guide` cannot run on it

`writeGuidePacket` refuses a declaration with no `sch`
(`tools/guide/packet.ts:117-123`): *"declares no \"sch\", so the packet has no
schematic to print."* `boards/pultec-low-boost/perfboard.json` declares
`circuit`, `export` and `vrt` and nothing else, so the packet step of the
workflow is unreachable on this board however good the layout is.

- **Found** `2026-10-16-pultec-five-boards`, Task 3.
- **Evidence** the declaration file and the throw in `packet.ts`.
- **Verified** yes by READING both, NOT by running `writeGuidePacket` - that
  function writes into `boards/<board>/guide/`, which Task 3 was forbidden to
  do. The renders Task 3 produced came from calling `renderLayout` directly.
- **Why it is open** out of a discovery run's scope, and all five Pultec
  sections are likely in the same state.
- **What would settle it** a schematic for the section and an `sch`/`netlist`
  pair in the declaration - or a ruling that these boards do not get packets.

### G17 - a part label longer than the board runs off the drawing

On the first materialised low-boost render, three stand-in part labels leave
the board outline: `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper` off the left edge,
`SI_MID_R_MID_SHUNT` and `SI_LOW_CUT_RV_LO_CUT.ccw-wiper` off the right. Others
cross each other, and two pad labels are printed on top of a dark
every-fourth-row alignment strip, which reads as a strikethrough.

**This is adjacent to G2 and is a different text.** G2 is about PAD identities
crowding their row; these are PART labels, which reach the renderer through
`renderLayout`'s `labels` map from the caller. A stand-in's id is long because
it names the section it stands in for, so the length is a property of the
model rather than of the drawing.

- **Found** `2026-10-16-pultec-five-boards`, Task 3.
- **Evidence** the implementer rendered the materialised low-boost at
  `rsvg-convert -z 3` and read the PNG.
- **Verified** yes.
- **Why it is open** how a drawing should look is the owner's call on a render,
  by this repository's own acceptance rule - the same reason G2 is open.
- **What would settle it** the owner looks at the render and says whether a
  label that leaves the board is acceptable, needs shortening, or needs the
  renderer to place it differently.

### G15 - the frozen low-boost fixture and the physical model hold different parts

`tests/fixtures/stripboard/pultec-low-boost-frozen.*` carries
`board_terminals`, a 3-way Phoenix terminal block, and `candidateFromDump`
refuses it:

> `vero-import-no-geometry: "board_terminals" (BLOCK_200MIL3) is fitted with`
> `"TerminalBlock_Phoenix:TerminalBlock_Phoenix_MKDS-1,5-3-5.08_1x03_P5.08mm_Horizontal",`
> `whose pad geometry the model cannot derive …`
> `stripboard-geometry-unrecorded-pattern: … is not in the pin-pattern map`
> `handed to geometryOf …`

The missing pin pattern is the visible half. The half that matters more is that
`sectionBoard("low-boost")` carries `junction_grounds` and `junction_signals` -
two 5-pin headers - and no `board_terminals` at all. **The fixture and the
model are two different boards**, and recording a pattern for the terminal
block would make the fixture importable without making the two agree.

- **Found** `2026-10-16-pultec-five-boards`, Task 3. The REFUSAL was relayed to
  that task from an earlier agent; the divergence behind it was not.
- **Evidence** the refusal above, run against the unedited fixture; the
  component lists of the fixture and of `sectionBoard("low-boost")`.
- **Verified** yes - run, not relayed.
- **Why it is open** a frozen fixture is a benchmark and **nobody updates one
  to today's model** (`stripboard/rules.json` says so outright, under
  `stockCols`), so this is a decision about what the benchmark now measures
  rather than a file to edit.
- **What would settle it** the owner, or the plan, says whether the frozen
  low-boost still benchmarks the circuit the model now describes. Until then
  nothing should read a `board_terminals` refusal as a missing pin pattern.

### G3 - a ceramic disc capacitor has no shape, and pt2399-core carries one

`bodyFor` in `tools/guide/part-shapes.ts` has no `CAP_CERAMIC` branch, so
rendering a board carrying one refuses with `no drawing for VeroRoute part type
"CAP_CERAMIC"`. The refusal is loud and names its own fix site, which is why
this is a gap and not a trap.

- **Found** `2026-10-16-pultec-five-boards`, while closing a review finding on
  Task 1 - neither the implementer nor the reviewer went looking for it.
- **Evidence** `bodyFor` enumerates `RESISTOR\d*`, `CAP_ELECTRO_(\d+)`,
  `SIP(\d+)`, `BLOCK_(?:100|200)MIL(\d+)`, `TO92`, `TRIM_FLAT` and the film
  types, and nothing else; `CAP_CERAMIC` appears bare in
  `tests/fixtures/pt2399-core-board.dump` and
  `tests/fixtures/stripboard/pt2399-core.dump`.
- **Verified** yes.
- **Why it is open** out of the Pultec program's scope - no Pultec dump carries
  a ceramic.
- **What would settle it** a `CAP_CERAMIC\d*` branch with a test, and a render
  of pt2399-core read by eye.

### G10 - the printed checklist has no row for a pad, so its junction table is empty

`buildChecklist` builds every part row from `dump.parts`, and a pad has no
`PART` line. On a pad-based control the packet therefore shows ten rings with
ten checkboxes in the LAYOUT IMAGE while the **"Wire-to-board junctions" table
is empty** - two artifacts in one packet disagreeing about whether ten
terminals exist.

This is adjacent to G1 but not the same gap: G1 asks WHICH LABEL a pad carries,
this is a MISSING ROW. Answering G1 either way leaves the table empty.

- **Found** `2026-10-16-pultec-five-boards`, raised by the Task 2 reviewer for
  the controller rather than as a defect in Task 2.
- **Evidence** `tools/guide/checklist.ts:200-209` iterates `dump.parts` and
  nothing else; `grep -n 'pad\|Pad' tools/guide/checklist.ts` finds only one
  unrelated comment line.
- **Verified** yes - the controller read the function rather than relaying the
  reviewer's claim.
- **Why it is open** Task 2's scope was a pad's shape and identity, and the
  checklist was explicitly placed out of its bounds so the fix would not ride
  along unreviewed.
- **What would settle it** junction rows built from the pads as well as the
  parts, with a test that counts rows against the board's pad count. **Note it
  is not independent of G1**: a junction row has to say what the wire carries,
  which is the label G1 decides.
- **NO LONGER BLOCKED, AND NOW VERIFIED ON A REAL BOARD.** It was blocked
  behind G14 - `buildChecklist` refused a materialised board outright, before
  any junction row was built - and G14 is closed (`--import` now stores the
  circuit's net names, so the register's entry for it is deleted rather than
  marked). Measured 2026-10-16, on the checklist of a materialised
  `pultec-low-boost`: the board carries **ten pads** (`RV_LO_BOOST_1..3` and
  `SW_LO_BOOST_1..7`, each one a `PAD` line in `--dump-board`) and the printed
  checklist has **not one row for any of them** - no part row and no junction
  row. Its "Wire-to-board junctions" table has exactly two rows, the two `SIP5`
  headers (`junction_grounds`, `junction_signals`), which have `PART` lines. So
  the gap is exactly as stated, the count to assert against is 10 on this
  board, and the observation no longer rests on reading the function.

### G4 - nothing refuses a board carrying both a header PART and pads for one control

With two valid representations of a panel control in play (see G1), a board that
carries both for the same control is a contradiction no guard detects.

- **Found** `2026-10-16-pultec-five-boards`, Task 2.
- **Evidence** the Task 2 implementer reports no such guard exists.
- **Verified** NO - relayed, not independently confirmed.
- **Why it is open** Task 2's scope was a pad's shape and identity.
- **What would settle it** a refusal naming the control and both
  representations, with a perturbation proving it fires. Note it is downstream
  of G1: if the owner rules one representation out, this guard enforces that
  ruling.

### G11 - a pad's hole is checked against the grid only when something draws it

The guide refuses a pad whose hole is outside the dump's `GRID`
(`guide-pad-off-board`, added in Task 2's fix round). Nothing else does. The
IMPORT path reads `dump.grid` only to build the candidate's grid
(`tools/stripboard/vero-import.ts:408`) and never tests a pad hole against it;
the export path writes the `GRID` line and bound-checks nothing.

**The nuance matters, and the first report of this was wider than the truth.**
The CONSTRUCTION path does keep pads on the board - `onBoard`
(`lib/stripboard/seed-place.ts:135`) is a workspace containment check applied
while a seed is built, and `seed-homes.ts:32` documents the board edge as a
constraint the placer respects. So a pad the search places cannot be off the
board. The gap is that the import path does not VERIFY what the construction
path guarantees, which matters for a dump that came from somewhere else: a
hand-edited file, an older build, or a board a person moved parts around in.

Consequence: such a pad surfaces when someone draws a guide, rather than when
the board is imported or exported.

- **Found** `2026-10-16-pultec-five-boards`, Task 2 fix round, raised by the
  implementer as being wider than its remit.
- **Evidence** `grep -n 'rows\|cols\|bounds\|GRID'` over
  `tools/stripboard/vero-import.ts` and `vero-export.ts` finds only the two
  construction/emission lines above; `onBoard` at
  `lib/stripboard/seed-place.ts:135` is the construction-side check.
- **Verified** yes - the controller read both paths, and NARROWED the claim from
  what was reported.
- **Why it is open** Task 2's remit was the guide. Where this check belongs is a
  design question: the importer, the exporter, the model's own rule set, or more
  than one.
- **What would settle it** a decision on which layer owns hole containment for
  an imported board, then the guard with a perturbation.
- **THE EVIDENCE THIS ASKED FOR, 2026-10-16, Task 3.** A real low-boost was
  materialised and re-imported. **All ten pads came back inside the grid**, so
  the gap is NOT reachable through the construction-to-materialisation path -
  which is what the narrowed claim above predicted, since `onBoard` keeps a
  placed pad on the board. It says nothing about a dump that came from
  somewhere else, which is the case the entry is actually about, and it does
  not close the entry.

### G6 - `tests/stripboard/model/seed-room.test.ts` is 760 lines

Against this repository's 300-500 line ceiling.

- **Found** `2026-10-14-stripboard-model-and-search`.
- **Evidence** `wc -l`.
- **Verified** yes.
- **Why it is open** splitting a test file of this size is its own change with
  its own review, and it was never the task in front of anyone.
- **What would settle it** a split by what each group of tests establishes, not
  by line count.

### G20 - the pinned fork's `Src/Board_import.cpp` is over the line ceiling

557 lines, against the 300-500 ceiling this plan has already applied to fork
`.cpp` files (Ruling R7 split `Headless_materialize_place.cpp` for it).

**IT WAS ALREADY OVER BEFORE THE CHANGE THAT NOTICED IT.** At the fork commit
this plan's Task 2 pinned (`0ab5539`) the file was **515**. Task 4 added 61
lines of comment to it, taking it to 576, then took 19 back out, leaving 557 -
so of the overshoot, 15 lines are Task 4's and 15 are the ceiling's margin;
everything above 500 was there first.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 4, after adding the
  net-name store to `Board::BuildFromParsedNetlist`.
- **Evidence** `wc -l Src/Board_import.cpp` → 557;
  `git show 0ab5539:Src/Board_import.cpp | wc -l` → 515.
- **Verified** yes - measured both.
- **Why it is open** the file holds two netlist readers and one board builder,
  and splitting it is a change with a real failure mode of its own (the two
  readers share `BuildFromParsedNetlist` precisely so they cannot drift in what
  they do to a board). Doing it inside a task about net names would bury it.
- **What would settle it** a split by reader - the OrcadPCB2 parse, the Tango
  parse, and the shared builder - with the fork's own suite and its mutation
  catalogue run over the result, since several catalogue entries name exact
  lines in this file.

---

Open: comment and documentation defects, behaviour-free
-------------------------------------------------------

Both of these were parked under a skill rule that allows one fix wave per plan.
Neither changes behaviour; both mislead a reader.

### G7 - `lib/stripboard/seed-fit.ts` mislabels its own denominator

The comment reads *"of 634 intermediate wire-span holes, FIVE are inside one"*.
634 is ALL wire-span holes with endpoints included; the intermediate count is
470 (634 - 2x82 wires). The two figures the paragraph presents as disjoint
overlap by 164.

**The FIVE is unaffected** - endpoints contribute zero, which the paragraph's own
274/0 line independently establishes - so the conclusion stands.

- **Found** `2026-10-15-pultec-layout-capability`.
- **Verified** yes.
- **What would settle it** correct the denominator to 470, or say "wire-span
  holes" and drop "intermediate".

### G8 - the pad test states its limit only partially

`tests/stripboard/model/seed-off-board.test.ts` says `routedUnderRigid` rejects
all three columns. True, and it does not claim the stronger thing - but it never
says `rigidOverlap` closes them identically and that nothing outside
`chooseColumn` can separate the two. That limit is written down in commit
`b9fe02f` and a fix report, but not in the file a reader meets the test in.

By this repository's own standard - two earlier fixes exist precisely to move a
measured limit to where a reader meets it - one line belongs in the test.

- **Found** `2026-10-15-pultec-layout-capability`.
- **Verified** yes.
- **What would settle it** one line in the test's comment.

---

Open: blocked on something else
-------------------------------

### G9 - nine `pt2399-core` BOM lines are unchosen, and the lead span is blocked

One line was chosen deliberately (the 0.1uF disc capacitor, commit `05e62e0`).
Nine remain. Separately, a recorded lead span cannot be completed because **the
catalog schema has no lead-diameter or lead-length field** - so the span cannot
be stated without inventing a geometry, which `lib/kicad/lead-span.ts` refuses
by design.

- **Found** `2026-10-16-pultec-five-boards` and its predecessor.
- **Verified** yes for the schema gap.
- **Why it is open** the schema gap is a real blocker, not a deferral: the
  honest options are to extend the schema with evidence per field, or to leave
  the span unrecorded and let the refusal stand.
- **What would settle it** an owner decision on extending the catalog schema,
  then `part-researcher` on the nine lines.
