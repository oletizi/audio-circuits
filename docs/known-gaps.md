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

### G35 - a SELECTION is easier for an agent to forge than a voice, because both halves are already in its hands

**THIS ENTRY REPLACES THE ONE WRITTEN EARLIER ON 2026-10-17** - *"the approvals
loader cannot record an approval that is a CHOICE rather than a sentence"* - which
was settled the same day by the controller's ruling and is deleted rather than
marked closed. What follows is the residual that ruling CREATED, which is
narrower, real, and nobody else's to notice.

**WHAT HAPPENED.** The owner was shown four renders of the two remaining Pultec
sections, with their figures, and replied in full:

> *"low-cut: part-walk-s1*
> *hi-cut: rcm-s20"*

The loader refused it, because a selection carries no first- or second-person
word. The refusal, from the committed `readEntry` on a draft entry healthy in
every other respect, kept here because it is the provenance of the ruling:

```
approvals-words-not-spoken: the approval "probe" quotes "low-cut: part-walk-s1\nhi-cut: rcm-s20", in which nothing is in the first or second person - no i, i'm, i've, i'd, me, my and none of the rest of FIRST_OR_SECOND_PERSON. A quote of somebody telling you a board is fine reads like somebody talking; a line like "approved on the render" reads like a field being filled in. Nothing is accepted on the grounds that it is probably a quote. If he genuinely said only a word with none of these in it, that is a case this guard did not anticipate: put it to him rather than widening FIRST_OR_SECOND_PERSON in tools/stripboard/approvals-model.ts to fit one record, and if the list really is too narrow, widen it in a deliberate edit with a test beside it.
```

**THE RULING** (the controller, 2026-10-17; the producing agent stopped rather
than making this call itself): add a SECOND admissible shape, a SELECTION,
qualifying only when it names BOTH the subject and the chosen artifact; do not
weaken, widen or special-case the voice test; do not reword him. Its reasoning:
the voice test was never proof either, only a proxy for *a human said this*; a
selection among options only the person being shown them had is the same kind of
proxy; and what would be wrong is admitting a shape carrying LESS information
than the one it joins, where this carries more. Implemented in
`tools/stripboard/approvals-words.ts` with the near misses driven in
`tests/stripboard/approvals-refusals.test.ts`; the full reasoning is in
`stripboard/render-approvals.json`'s `notes.ownerWords`, where a reader meets it.

**THE RESIDUAL, WHICH IS NOT THE SAME CLAIM AS `G27` AND IS SHARPER.** G27 says
no reading proves he said it. This says something more specific about the new
shape: **an agent producing a board already holds both halves of a selection.**
It knows the board's name - it is in the entry - and it knows the ordering,
because it chose which orderings to run. So `low-cut: part-walk-s1` is precisely
the string a fabricating agent would write, and it is admitted, where a
fabricating agent imitating a VOICE has to invent a sentence in somebody else's
register. The new shape is therefore **cheaper to forge than the one it joins**,
even though it carries more information when genuine.

That is not an argument against the ruling - the voice shape is forgeable too,
the registry says so, and refusing his actual words had its own cost, which was
two finished boards he had chosen sitting unadopted. It is the thing a later
reader needs in order to overturn the ruling on the argument rather than on
taste.

**WHAT NARROWS IT, AND IT IS WORTH STATING BECAUSE IT CUTS THE OTHER WAY.** A
selection is admissible **only for the board it names**: `isSelectionFor` reads
per entry, and his two lines pasted against a third board's hash are REFUSED by
name. An in-voice sentence has no such property - *"the two boards you showed me
look good."* loads cleanly against any entry, which is `G31`. So on the one
dimension G31 is about, the selection shape is **stronger** than the voice shape,
not weaker.

- **Found** `2026-10-17`, in the change that adopted `pultec-low-cut` and
  `pultec-hi-cut`; the earlier form of this entry was written in the same session
  and is superseded.
- **Evidence** the refusal above, produced by the committed `readEntry`;
  `tools/stripboard/approvals-words.ts`'s `isSelectionFor` and
  `subjectNamesFor`; the six perturbations of the two readings reported in
  `.superpowers/sdd/final-two-adoption-report.md`, each going red by name.
- **Verified** yes - run, not relayed, on his actual words and on the four near
  misses.
- **Why it is open** it is a property of what the registry can check at all, not
  a defect in the code that implements the ruling, and the remedies are all
  outside this loader.
- **What would settle it** evidence of the utterance that is not a string an
  agent could have written - his message where it was sent, a signature, or a
  second channel - which is `G27`'s *what would settle it* and is the same
  answer for both. Short of that: a reviewing agent, never the one producing the
  board, deciding whether a selection may be the SOLE authority for an entry or
  must sit beside something in his voice.

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
- **STILL TRUE ON THE PRINTED PACKET (2026-10-17)**, read from the PDF of
  `make -C boards/pultec-low-boost guide` and of `pultec-low-cut`'s, and at
  `rsvg-convert -z 6` on a crop. Each pad identity is readable on its own.
  `SW_LO_BOOST.1` (row E) is printed across a dark alignment strip AND across
  the `junction_signals` part outline; on the values image `SW_LO_BOOST.3`
  (row M) and `SW_LO_BOOST.7` (row I) sit on dark strips. On `pultec-low-cut`
  `SW_LO_CUT.4` and `SW_LO_CUT.5` crowd the left board edge beside the
  `IN`/`HI_BOOST_OUT` edge labels. Usable at full page size, worse than on the
  bare render because the packet scales the whole board to one printed page.

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

### G36 - the Cuts table tells a builder which two ladder nets a cut separates, and those names mean nothing to anybody

`buildChecklist`'s Cuts section prints a `Separates` column built from
`dump.nodes`, so it prints the circuit's own net names. On the Pultec sections
those names are the junction ladder's generated ones. Verbatim from the printed
packets of 2026-10-17:

| board | cut | Between | Separates |
| --- | --- | --- | --- |
| `pultec-low-boost` | 1 | C5 and C6 | `si_hi_boost_j20_p3 \| si_hi_cut_j12_p3` |
| `pultec-low-boost` | 2 | K4 and K5 | `j10_p1 \| j10_p2` |
| `pultec-low-cut` | 1 | D6 and D7 | `j5_p3 \| j5_p4` |

A builder with a knife and a board has to cut between two named holes, which
the `Between` column gives correctly. The `Separates` column is there to tell
them what the cut is FOR, and `j10_p1 | j10_p2` tells them nothing - it is an
internal index into a ladder, not a circuit node anybody can point at. It is
not wrong; it is the right mechanism printing a vocabulary with no reader.

**This is G19's cause showing up in a second column**, and it is listed
separately because the remedy is not the same. G19 is one net (ground) with one
obvious builder's name (`GND`); this is a whole family of generated names with
no builder's name to map to.

- **Found** `2026-10-17`, producing the printable packets for the two low
  boards and reading them.
- **Evidence** the table above, read off
  `boards/pultec-low-boost/guide/guide.html` and
  `boards/pultec-low-cut/guide/guide.html` printed to PDF; `netName` in
  `tools/guide/checklist.ts`, which reads `dump.nodes` and refuses only when a
  name is absent, never judging whether a name says anything.
- **Verified** yes - read on the printed pages, both boards.
- **Why it is open** what a build sheet should say a cut is for is an
  acceptance criterion about the printed artifact, and the agent producing that
  artifact may not author it. There is also a real choice underneath: the
  column could name the nets (as now), name the PARTS the cut separates, or be
  dropped - and dropping a column is not something to do while looking at one
  board.
- **What would settle it** the owner reads a Cuts table and says which of the
  three the column should be. If it stays net names, the ladder nets need
  names a person can use, which is a change in
  `circuits/pultec/physical/board.ts` rather than in the guide.

---

Open: a fix would settle these
------------------------------

### G29 - the constructive seed cannot join a net whose run on a strip is boxed in, on every seed of the reviewed restart schedule

**NARROWED ON 2026-10-17, AND WHAT IT LOST IS ITS SECOND HALF.** The title used
to end *"and two of the five Pultec boards never produce a candidate at all"*.
That is no longer true and the correction is a measurement:
`.superpowers/sdd/ordering-sweep-report.md` swept every ordering the tooling
derives over both sections, and **both build**. `pultec-low-cut` constructs,
materialises and grades `admissible` on `part-walk s1` at 3 cuts / 8 wires / 5
bridges over 24 x 19 holes with `HC1`-`HC10` all holding and every net complete;
`pultec-hi-cut` does the same on `rcm s20` at 4 / 4 / 5 over 19 x 27. Both were
reproduced through the committed producer on 2026-10-17 once `materializeRun`
could be told which ordering to use.

**WHAT REMAINS OPEN IS THE DEFECT ITSELF AND IT IS UNCHANGED.** Every seed of the
reviewed restart schedule still refuses on both sections, for the reason below,
and the constructor still cannot back up when the join phase finds no room
(`G33`). What the sweep showed is that the defect is reachable-around on these
two circuits, not that it is absent: `low-cut` refuses on 22 of the committed 25
orderings and `hi-cut` on 23 of 25. **A section is one unlucky circuit away from
having no ordering that works**, and nothing in the pipeline would then have a
way forward.

`pultec-low-cut` and `pultec-hi-cut` stop in `lib/stripboard/seed-place.ts`'s
`joinNets` on **every seed of the reviewed restart schedule**, before any
candidate exists, so on those orderings there is no materialisation, no grade, no
run directory and nothing for the adoption gate to read. The refusal, from
`low-cut` at `rcm s0`:

```
stripboard-seed-no-column-to-join: net "0" has leads on strips 5 and 6 and there
is no column where both strips still have a free hole this join may use, so
neither a wire nor a bridge can be put between them.
The stock is 34 strips of 27 holes and ordering "rcm s0" filled it. A hole is
unusable to this join when it already holds a lead, a wire end or a bridge, and
ALSO when putting this net's end there would leave a net interleaved on that
strip - which is the case a strip carrying two nets adds (see this function's
comment).
This is not skipped and no hole is shared: a join is what makes a net whole
across two strips, so a strip left unjoined is an OPEN that no cut list can close
(lib/stripboard/invariants.ts), and a lead sharing a hole with a wire end is what
the owner asked not to build - "I would prefer leads not share holes - it makes
building easier".
```

`hi-cut` reaches the same refusal for net `j12_p2` between strips 8 and 12.

**"THE ORDERING FILLED IT" IS THE REFUSAL'S OWN WORDING AND IT IS NOT WHAT
HAPPENED**, which matters because a reader who believes the board is full will
go looking for a bigger board. On `low-cut` at `rcm s0` the failing strip holds
**nine contacts in twenty-seven holes**; on `hi-cut` at `rcm s0`, eleven. Every
remaining hole is closed by the INTERLEAVE filter in
`lib/stripboard/seed-contacts.ts`'s `joinSiteFor`, not by occupancy, and the two
boards fail in two different shapes of the same way:

- **`low-cut`: the net's run is flush against the board edge.** Net `0` holds
  columns 0 and 1 of strip 5 - `junction_signals.5` and
  `SI_LOW_BOOST_RV_LO_BOOST.ccw-wiper.1` - and `j5_p1` starts at column 2, so a
  net-`0` join end anywhere above column 1 would straddle another net's run.
  There is no column below 0.
- **`hi-cut`: the net's run is interior to the capacitor bank.** Strip 8 carries
  six nets - `j12_p1` at columns 2-3, `j12_p2` at 4-5, `j12_p3` at 6, `j12_p4` at
  7-8, `j12_p5` at 9-10, `j12_p6` at 12 and 16 - so `j12_p2` is boxed in on both
  sides and every one of its own holes already holds a lead.

In both cases the OTHER strip of the join has plenty: 19 usable columns for
`low-cut`, 26 for `hi-cut`. One strip with none refuses the board.

**THE CONSTRAINTS ADMIT AN ARRANGEMENT AND THE CONSTRUCTOR DOES NOT REACH IT,
WHICH IS THE WHOLE OF THIS ENTRY.** Driving `lib/stripboard/separable.ts`'s own
`interleavingOn` over the actual contact list of the failing strip, and then over
the same contacts with everything from the net's own run shifted ONE column along
- no part moved to another strip, no hole added, the highest column still 17 of
26 - the usable-join-column set goes from `[]` to `[4]` on `hi-cut` and from `[]`
to `[0]` on `low-cut`. So a board satisfying every stated constraint exists one
column away, and nothing in the pipeline can get to it: the constructor is
one-shot and greedy, it reserves no hole for a join it has not made yet, and
**there is no search to repair the result** (`G22`).

**WHAT ELSE THE BOARDS DO, probed beyond the reviewed schedule and reported as
the diagnostic it is.** Seeds 5-19 were run on both boards as a measurement and
are not a parameter anybody reviewed: all twenty orderings refuse on `low-cut`,
and eighteen of twenty on `hi-cut`, where seeds 17 and 18 instead reach a second
refusal, `stripboard-seed-pad-cannot-be-seated` - *"`SW_HI_CUT` terminal `3` is a
landing pad for net `j12_p2`, which ordering `rcm s17` hosts on strip 9, and not
one of the 27 columns of that strip will take it."* Same net, one placement step
earlier.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 7, which ran all four
  remaining sections through the path `pultec-low-boost` took.
- **Evidence** the refusals above, produced by the committed producer
  `materializeRun` on `boards/pultec-low-cut` and `boards/pultec-hi-cut`; the
  per-strip contact lists and usable-column sets read with `joinSiteFor` and
  `freeHole`; the one-column counterfactual run through `interleavingOn`.
- **Verified** yes - run, not relayed, on both boards and on every seed of the
  reviewed schedule.
- **Why it is open** Task 7 is a measurement and was told to fix nothing, and the
  fix is not an agent's to choose anyway: which arrangement is ACCEPTABLE is an
  acceptance criterion about the artifact, and the agent producing the artifact
  may not author it (`CLAUDE.md`).
- **What would settle it** a decision on where the repair belongs - a constructor
  that keeps a join hole in each net's run, a placement order that leaves the
  edge column free, or the search `G22` asks for, which would reach the same
  arrangement by moving a lead - then the change with a test that drives
  `low-cut` and `hi-cut` to a candidate.

**A CLEAN RESULT THAT BELONGS BESIDE THIS ONE, because the same run produced it
and the next reader will be looking for it.** `pultec-hi-boost` and `pultec-mid`
do NOT fail: both construct, materialise and grade on all five seeds, with
`HC1`-`HC10` all true, every net reported `complete` by the fork's own
`--check --netlist`, and they reach the adoption gate, where the only refusal is
the owner-approval channel (`G27`). **The predicted capacitor-reach failure did
not happen on `mid`.** `docs/stripboard/lead-span.md` §5.3 records that the
clustering the pipeline spec asked for *"is not reachable with untaped
B32529s"*, and that remains a true statement about that ordering - but the board
this pipeline actually produces never asks for it: of `mid`'s eighteen film
capacitors, seventeen are materialised at `SPAN 1` - 2 holes, the recorded
MINIMUM - and the one `CAP_FILM_WIDE` at `SPAN 3`, 4 holes, which is the recorded
MAXIMUM and not past it. So `HC5` and `HC9` pass on every part, and the board
leans on the bottom of the family's reach rather than on the top of it. Two
reasons, both read off the
repository rather than inferred: the owner's 2026-10-10 resolution recorded in
`docs/pultec/capacitor-selection.md` is to keep the B32529 and reach the distant
strip with a WIRE rather than with a splayed lead, and `stripboard/rules.json`
holds `kappaBench: null`, so `A2` does not fire and nothing is pressing the
arrangement toward a tighter cluster. **No gap is opened for it**; it is recorded
here so that a reader who goes looking for the six-hole span finds the
measurement instead of the prediction.

### G33 - placement cannot be revisited when the join phase finds no room, and the owner expects this to bite future boards

The seed constructor places every part once, left to right, first fit, and never
reconsiders. The JOIN phase runs afterwards and can discover that no legal
column remains for a net that spans two strips - not because holes are full but
because the leads placed earlier closed every one of them to the interleave
rule. At that point nothing can back up, and the board is refused.

**This entry exists because the owner asked for it to**, 2026-10-17:

> *"the structural problem of not being able to revisit placement when there
> isn't enough room is likely to be a problem for future boards. We don't have
> to address it now, if the remaining pultec boards can be built with our
> current tooling. But, if we don't need to build the revisit logic now, we'll
> still want to record it as a future enhancement"*

**The design is already written**, so this entry is a pointer rather than a
description: `docs/superpowers/specs/2026-10-17-a-join-site-survives-placement-design.md`
carries the measurements, the approach chosen, the approach ruled out and why,
and the invariant any implementation must hold - that every board which
constructs today constructs to identical bytes, with the three adopted boards as
the fixtures.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 7, as the cause behind
  G29's two refusing sections; generalised by the owner to future boards.
- **Evidence** `lib/stripboard/seed-place.ts:417`; the measured counterfactual
  in G29, where shifting the failing net's run ONE column turns the usable-join
  set from empty to non-empty on both sections, with no part changing strip and
  no hole added.
- **Verified** yes - run, not relayed.
- **Why it is open** the measurement that decided this has LANDED, and it came
  out the way that leaves the enhancement unbuilt.
  `.superpowers/sdd/ordering-sweep-report.md` tried all 25 committed orderings on
  both sections: `low-cut` builds on `part-walk s1`, `degree-descending s2` and
  `part-walk s2`, `hi-cut` on `degree-ascending s2` and `part-walk s2`, and both
  produced an `admissible` board through the committed producer on 2026-10-17.
  So **this stays recorded and unbuilt, which is the owner's stated preference**
  - exactly the branch this entry named in advance. What the result does NOT say
  is that the enhancement is unnecessary: it says these two circuits have an
  ordering that happens to work, after 22 and 23 of 25 refused, and the next
  section with none would be blocked on this with nothing else to try.
- **What would settle it** the spec above, executed - or, if a later board is
  refused for this cause, that board as the evidence that the enhancement has
  become a blocker.
- **What it is NOT.** Not the search (G22): that improves an existing board and
  here no board exists. Not the junction ground row: removing it was measured
  and does not relieve either refusal - low-cut's widens from strips 5/6 to
  5/16, and hi-cut's names a selector net, before and after.

### G30 - `materializeRun` has no CLI verb, so the only producer of an adoptable run directory is a scratch file

`tools/stripboard/materialize-run.ts` is the producer every Pultec board goes
through - the one that constructs a candidate in the model, materialises it and
writes the `run.json` the adoption gate reads. **Nothing in `tools/cli/` and no
target in `make/board.mk` calls it.** `make place` drives `./place.ts`, the
fork-gesture search, which `G22` says cannot run on any of these boards.

So every run directory any of the five Pultec boards has ever been adopted from
or reported on was produced by a file under the gitignored `build/scratch/`,
written fresh by the agent that needed it: `build/scratch/task-6-run.ts` for the
low-boost adoption, `build/scratch/task-7-run.ts` for the four sections after it.
The cost is specific rather than general: the run directory is an INPUT to a gate
that checks provenance, and the thing that produced it is not in the repository,
is not covered by `bun test`, and is destroyed by `git clean -fdx` - so the
chain the gate verifies starts at a file nobody can review.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 6, which recorded it in its
  report; Task 7 needed the same driver again and entered it in the register,
  because a finding that lives only in a plan report is one this file's own
  preamble says does not exist.
- **Evidence** `grep -rn materializeRun lib tools tests` finds the module, two
  test files and no CLI or make caller; `make/board.mk`'s `place` target runs
  `bun "$(CLI)" place`.
- **Verified** yes.
- **Why it is open** out of the scope of both tasks that hit it - Task 6 adopted
  one board and Task 7 measured four - and adding a verb is a surface the owner
  may want shaped, since it decides what an operator types to produce a board.
- **What would settle it** a `materialize` verb beside `place`, taking the board
  and the stamp the gate's `provenance-chain` check requires, with the scratch
  drivers deleted in the same change. **Narrowed on 2026-10-17 only in what the
  verb would have to take**: now that the producer takes an ordering plan, a verb
  has to name the ordering too, and `lib/stripboard/seed-orderings.ts`'s
  `strideOrderingNamed` is the lookup a `--ordering part-walk\ s1` flag would go
  through. Nothing about the gap itself changed - there is still no verb, and
  `pultec-low-cut` and `pultec-hi-cut` were adopted through a scratch driver like
  every board before them.

### G34 - one refusing ordering aborts the whole materialisation run, so four good orderings out of five yield no board

`materializeRun` constructs, materialises and grades one candidate per ordering
in the plan it was handed, inside one `for` loop with no `try` anywhere in it. So
the FIRST ordering that refuses - at the seeder (`stripboard-seed-*`), at the
fork's `--materialize`, or at the strip-axis guard - throws out of the whole run,
and the orderings after it are never constructed. There is no `run.json`, no
candidate and nothing for the gate to read, although the remaining orderings
might each have produced an admissible board.

**It is a real cost and it is measured, not predicted.**
`.superpowers/sdd/ordering-sweep-report.md` swept 65 orderings per section with a
driver that put each one in its own `try`: on `pultec-low-cut` three of the
committed 25 produce a full pass and 22 refuse, and on `pultec-hi-cut` two of 25
pass and 23 refuse. A plan handing all 25 to this producer would therefore abort
on the first of them and return none of the three. The sweep could only report
what it did because it was NOT this loop.

**Why it is not what blocked the two sections, which is why it is still open.**
A plan naming ONE ordering - which is how `pultec-low-cut` (`part-walk s1`) and
`pultec-hi-cut` (`rcm s20`) were built - has nothing to abort past, so the fix
was not needed to finish them and was deliberately not attempted. It becomes
load-bearing the moment somebody hands this producer a plan with several
orderings in it, which is the natural next use of the parameter.

**What makes it more than a `try`/`catch`.** Three decisions belong to somebody
other than the agent writing the loop: whether a run in which SOME orderings
refused may be adopted at all, what the record says about the ones that did (a
refusal is evidence and discarding it quietly is the failure this repository
keeps catching), and what happens when every ordering refuses - which must stay a
loud refusal naming each one rather than an empty run directory that reads as a
clean result. The last of those is why it is not adjacent: a `catch` that
continued would turn "no board exists" into "a run directory exists with nothing
in it", and a skipped check that looks like a passing one is the failure mode the
whole stripboard workflow exists to prevent.

- **Found** `2026-10-17` while wiring the ordering plan into `materializeRun` for
  the `low-cut`/`hi-cut` adoption; named in the ordering sweep report's §"One
  qualification" before that, and entered here because a finding that lives only
  in a gitignored report is one this file's preamble says does not exist.
- **Evidence** `tools/stripboard/materialize-run.ts`'s construction loop - one
  `for` over the plan's orderings, `constructedFor` → `materialize` → `measure`
  → `assertStripsAgree`, no `try` in the function; the sweep report's two
  per-ordering tables, which are 22 and 23 refusals deep.
- **Verified** yes - the refusal counts were produced by a driver that caught per
  ordering, which is the same measurement from the other side.
- **Why it is open** out of scope: the two sections build from a single-ordering
  plan, so fixing it was not needed, and what a partly-refusing run may be
  adopted on is an acceptance question the agent producing the board may not
  answer (`CLAUDE.md`).
- **What would settle it** a decision on what a run records about the orderings
  that refused and whether such a run is adoptable, then the change - per
  ordering refusal captured and recorded, every-ordering-refused still a loud
  throw naming each one - with a test that drives both.

### G28 - `--update` refuses the adopted low-boost on a wire it cannot put back, although the netlist has not moved

`boards/pultec-low-boost` is the first board in this repository to reach
`boards/` through the pipeline, and `--update` cannot be run on it:

```
the layout's wire Wire4 (0,5 to 2,5, carrying net ids 13 and 11) cannot be put
back after reconciliation: its two ends are no longer on one net. Move or delete
it in the GUI, then run this again.
```

**Nothing about the circuit changed, which is what makes this a defect rather
than the refusal working.** `--check BOARD --netlist NETLIST` on the same two
files prints **no `Schematic delta` section at all** - `FormatReport`
(`Reconcile_report.cpp:375-385`) emits that heading only when the plan carries
delta lines - and reports all 14 nets complete. So the reconciliation plan is
empty and the refusal comes out of the re-fill, not out of a change.

**On the board itself the wire is sound.** `--dump-board` of the committed
layout gives `WIRE Wire4 AT 0,5 ENDS 0,5,13,13 2,5,13,13` - both ends on node
13, `si_hi_cut_j12_p3` - beside `CUT 2,4,11 2,5,13`, the cut that splits row 2
between node 11's stretch and node 13's. The refusal reports those same two ends
as `13 and 11` AFTER reconciliation, so one end came back on the other side of
that boundary.

**The mechanism, read off the fork and stated as the inference it is.**
`ApplyNetReconciliation` (`Reconcile_apply_nets.cpp:185-315`) lifts every placed
wire FIRST, retires and repaints the nets, calls `board.AutoFillVero()` - gated
on `GetVeroTracks()`, which this strip-mode board has - and only then calls
`ReplaceLiftedWires`. The comment on that ordering says the holes must be
painted before `Board::PutDown` re-derives each wire's node id from them. What
the figures above say is that the fill does NOT reproduce the cut position the
materialisation chose: row 2 carries a pin on node 11 at `2,2` and a pin on node
13 at `2,8`, the cut between `2,4` and `2,5` is where the pipeline put the
boundary, and the fill puts it somewhere to the right of `2,5`. That last step -
fill policy rather than wire handling - is an inference from the two reported
node ids, not something read out of `AutoFillVero`.

**What it costs.** `make update` is the documented way to apply a circuit change
to an existing layout in place (`make/board.mk`), and on this board it is
unavailable: the verb exits 1 and leaves the layout alone. The repair route for
a pipeline board is to re-run the pipeline and adopt again, which is a different
workflow and is not what the help text says.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 6's adoption step, while
  looking for the span/bend bite that Task 2 predicted. **It is not that
  bite** - see the note below.
- **Evidence** the refusal above, from
  `veroroute --update <copy of the adopted .vrt> --netlist
  build/stripboard/pultec-low-boost/<run>/pultec-low-boost.net -o <scratch>`;
  the empty `--check --netlist` report on the same pair; the `WIRE`/`CUT` lines
  from `--dump-board`; and the three functions named above.
- **Verified** yes - run against the board as committed, not relayed, and
  reached **through the repository's own verb** as well as through the binary:
  `make -C boards/pultec-low-boost update` prints `FAIL …`, *"veroroute --update
  … exited 1; the layout is unchanged"* and then the same wire refusal. Nothing
  under `boards/` was written in either run - `git status` is clean afterwards,
  and the direct probe copied the layout to a scratch path first with `-o`
  sending its output elsewhere.
- **Why it is open** out of the adoption step's scope, which was a board under
  `boards/` that `make check` passes - and it does. The fix is either an
  ordering change or a fill policy inside the pinned fork, and **which cut
  positions a re-fill must preserve is an acceptance criterion about the
  artifact**, which the agent producing that artifact may not author.
- **What would settle it** either the fill preserving an existing net boundary
  where no net's membership changed - so an empty plan leaves the copper exactly
  as it found it - or a stated decision that a pipeline-adopted board is not
  `--update`-able in place, with the verb refusing by that name instead of
  failing on whichever wire happens to straddle the moved boundary.
- **THE SPAN/BEND QUESTION THIS STEP WENT LOOKING FOR CAME BACK CLEAN, and that
  is recorded here because the next reader will look for it in the same place.**
  `--materialize` leaves parts at spans the `--import` base never had and
  deliberately does not call `AdoptCurrentSpanAsDeclared`
  (`Headless_materialize_span.cpp:182-184`), so on the adopted board R2 is at 2
  holes against a declared 5, `C18` at 4 against 3, and most of the other
  fifteen parts likewise. **Neither `make check` nor `--check --netlist` says
  anything about it, and that is the fork working as its own comments describe**:
  `Reconcile.cpp`'s `BoardPartInfo` keeps the DECLARED span precisely so a bend
  does not read as a schematic change, and `make check`'s `HC5`/`HC9` grade the
  bent span against the part's datasheet reach, which is the question a bend
  actually raises. No entry is opened for it.

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
than a stopping rule it did not earn, and `tools/stripboard/adopt-verdict.ts`
adopts from such a record only on the owner's recorded call on a render of that
board (`stripboard/render-approvals.json`, and `G27`). That makes the gap legible
wherever it decides something - a board that reaches `boards/` through this
pipeline reaches it on his judgement rather than on a search result, and says so
in the run directory. **The gap itself - that no search in this repository can
run on one of these boards - is unchanged**, and closing it is what would let
`G2.5` decide the question it already can.

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

### G32 - a run directory's `owner-approval.txt` is a snapshot of the registry at production time, and nothing refreshes it

`tools/stripboard/materialize-approval.ts` writes `owner-approval.txt` beside
`run.json` as the run is produced, consulting
`stripboard/render-approvals.json` as it stands at that moment. The gate does
**not** read that file - `tools/stripboard/adopt-verdict.ts` consults the
registry itself - which is deliberate and is what makes a run directory claiming
approval harmless. **The direction nobody had looked at is the other one.**

**MEASURED, in the change that adopted `pultec-hi-boost` and `pultec-mid`.** A
run directory was produced BEFORE the owner's approval was recorded, so its
`owner-approval.txt` opens:

```
stripboard-unapproved: "pultec-hi-boost" recorded no-search for candidate a481fc4c…62af, and no recorded approval covers it: stripboard/render-approvals.json has no entry for this board.
```

The entry was then added. Driving every adopt check over that same directory
afterwards gives **9 of 9 pass**, with `failing-check` returning
`stripboard-owner-approved: … entry "owner-render-pultec-hi-boost-rcm-s4" admits
it`. **So the run directory says the board is unapproved and the gate admits
it, and both are reading the same registry at different moments.** The gate is
right; the file is stale.

**WHY IT MATTERS MORE THAN IT LOOKS.** `owner-approval.txt` is one of the three
places the approval channel is visible (the committed registry, the run
directory, the adoption's own output), and its stated job is that an admission on
his judgement rather than on a search result reads as exactly that. A stale
`unapproved` body inverts that: a reader auditing the run directory of an adopted
board finds a file saying nobody approved it. **It is a derived artifact that is
written once and compared by nothing**, which is the failure mode
`CLAUDE.md`'s *derived artifacts are regenerated every run and compared by
content* exists to prevent.

**WHAT WAS DONE ABOUT IT HERE instead of fixing it:** the run directories were
**re-produced** after the approval was committed, which is why the two adopted
runs (`build/stripboard/<board>/task-8-adopt`) carry an `owner-approved` body
that agrees with the registry. That is a procedure, not a guard, and it works
only because an agent remembered to do it.

- **Found** `2026-10-16-low-boost-to-adoption`, in the change that adopted
  `pultec-hi-boost` and `pultec-mid`. It could not have been found in Task 6:
  low-boost's approval was recorded before its run was produced, so the two
  agreed by accident of ordering.
- **Evidence** `build/stripboard/pultec-hi-boost/task-8-adoption/owner-approval.txt`
  (the stale `unapproved` body) beside the 9-of-9 check report driven over that
  same directory after the registry entry landed; and
  `tools/stripboard/materialize-approval.ts`'s `writeApprovalRecord`, which is
  called once from `materializeRun` and from nowhere else.
- **Verified** yes - both halves run in one session.
- **Why it is open** the fix is not obviously a refresh. Rewriting the file at
  adoption time would make the gate write into the run directory, which
  `tools/stripboard/adopt.ts`'s own comment says it must not do (*"a gate that
  also left artefacts behind would be a gate whose own output somebody has to
  check"*); and refusing to adopt when the file disagrees would make a derived
  artifact a gate input. Which of those is right is a decision about what the
  run directory IS, and the agent that produced the run may not make it.
- **What would settle it** either a verb that re-reads the registry and rewrites
  the record for an existing run directory (so staleness is repairable without
  re-materialising), or a stated rule that `owner-approval.txt` is a production-
  time snapshot and the registry is the only live answer - written into that
  module and into the file's own header, so a reader of a stale body knows what
  they are looking at. **Until one of those lands, a run produced before its
  approval must be re-produced after it**, which is what this change did.

### G31 - an approval's quote names no board, so one sentence authorises two entries and nothing in the loader notices

On 2026-10-17 the owner was shown two renders - `pultec-hi-boost` and
`pultec-mid`, both `layout-designators.png` under
`build/scratch/task-7-render/` - and said, in full:

> *"the two boards you showed me look good."*

That one sentence is the authority for **two** entries in
`stripboard/render-approvals.json`, `owner-render-pultec-hi-boost-rcm-s4` and
`owner-render-pultec-mid-rcm-s0`, which quote it identically.

**THE GAP IS THAT THE SENTENCE IDENTIFIES NEITHER BOARD.** *"the two boards you
showed me"* is a reference to an act outside the repository. Which two boards it
means is fixed by what was put in front of him, and that is recorded in each
entry's `renderedFrom` and `note` by the agent that recorded the approval - it is
not in his words and no reader can recover it from them. For these two boards the
PICTURE-to-BYTES half of that chain is now a measurement rather than an inference
(see `G27` item 2 below), so what is left is narrow and specific: **which two
pictures he was looking at.**

**AND THE LOADER CANNOT SEE THE REUSE.** `tools/stripboard/approvals.ts`'s
uniqueness rule is on `candidateSha256` and on `id`, deliberately - the same bytes
approved twice is one decision written down twice - and there is no rule on
`ownerWords`. So:

- two entries quoting one sentence load cleanly, which is correct here and is the
  reason the rule is where it is;
- **a THIRD entry pasting the same sentence against a third board's hash would
  also load cleanly**, and the three quote guards
  (`approvals-no-words`, `approvals-words-narrated`,
  `approvals-words-not-spoken`) would all pass on it, because the sentence is
  genuinely his and genuinely in the second person.

**WHAT WAS CONSIDERED AND NOT DONE, because each is an agent authoring a rule
about the owner's own words.** Refusing a quote that is already in the file
(which would have refused this correct pair); requiring the quote to contain the
board name (he does not talk that way, and the low-boost quote does not contain
*"low-boost"* either); a `coversBoards` list field (an agent's enumeration of
what he meant, with the loader checking the agent's own answer).

- **Found** `2026-10-16-low-boost-to-adoption`, in the change that adopted
  `pultec-hi-boost` and `pultec-mid` on this sentence.
- **Evidence** the sentence itself, quoted above and carried verbatim in both
  entries; `tools/stripboard/approvals.ts`'s `readEntries`, whose two
  duplicate refusals are `approvals-duplicate-id` and
  `approvals-duplicate-candidate` and which has no clause about `ownerWords`;
  and `tests/stripboard/approvals.test.ts`'s *one utterance is the authority for
  two entries, quoted identically in both*, which asserts the reuse rather than
  hiding it.
- **Verified** yes - the pair was loaded, consulted and adopted on it.
- **Why it is open** the fix is a rule about what the owner's words have to
  contain, or about which boards an agent may say he meant, and the producing
  agent may author neither. Recording the reuse loudly in three places - the
  registry's `notes.ownerWords`, both entries' `doesNotExcuse`, and a test that
  names it - is what an agent may do about it.
- **What would settle it** him naming the two boards in a sentence, or a
  reviewing agent deciding whether an approval may cover more than one artifact
  and, if so, what field records which. Until then: **an approval recorded from a
  multi-board sentence must name the renders it came from, and a reader who needs
  to know which boards he meant reads `renderedFrom`, not `ownerWords`.**

**NARROWED ON 2026-10-17: IT NO LONGER COVERS EVERY ENTRY, AND THE REASON IS A
SHAPE RATHER THAN A SENTENCE.** The fourth and fifth entries -
`owner-render-pultec-low-cut-part-walk-s1` and
`owner-render-pultec-hi-cut-rcm-s20` - are authorised by a SELECTION,
*"low-cut: part-walk-s1 / hi-cut: rcm-s20"*, which NAMES both boards. The
selection reading (`tools/stripboard/approvals-words.ts`'s `isSelectionFor`) is
per entry, so those same two lines pasted against a third board's hash are
**refused by name**, which is exactly the thing this entry says the loader cannot
do for a sentence. `tests/stripboard/approvals-refusals.test.ts` drives it on all
three Pultec sections those lines could be filed under.

**What is NOT narrowed:** the hi-boost / mid pair above, whose authority is still
an in-voice sentence naming no board, and which would still admit a third entry
pasting it. The uniqueness rule is still on `candidateSha256` and not on the
quote. So this entry now describes the VOICE shape's residual specifically, and
`G35` describes the selection shape's, which is a different one.

### G27 - the owner-approval channel records his call but cannot prove it, and the link from the picture he saw to the bytes it admits is an agent's claim

**IT REPLACES THE ENTRY G25 WAS**, which recorded that the low-boost run
directory was produced, graded `admissible`, and was refused by the adoption
gate because `CRITERIA G2.5` admits through `exitCodeFor(outcome, rule)` over
`Q1`-`Q6` and *no clause of CRITERIA says what a no-search run may be admitted
on*. **That entry is DELETED rather than marked closed, because the clause was
not missing and did not need authoring.**
`docs/superpowers/specs/2026-10-16-pultec-five-boards-design.md`, under
*Acceptance*, makes channel 4 *"the owner's call on a render, as it has been for
every board in this project. Not a figure, and not the producing agent's."* He
exercised it on this board - *"i prefer the loose layout. It's much easier to
build. I don't see the problem"* and *"if the layout is electrically correct,
let's keep it. It looks fine to me"* - and the gate had no way to hear him.
`stripboard/render-approvals.json` and `tools/stripboard/approvals.ts` are that
way. All nine drivable adopt checks pass on a freshly produced run.

**WHAT IS LEFT IS WHAT THE MECHANISM CANNOT DO, and it is three things.**

**1. No file can prove the owner said anything.** The loader refuses a record
that quotes nothing (`approvals-no-words`), one whose quote talks about him in
the third person (`approvals-words-narrated`) and one in which nobody is
speaking at all (`approvals-words-not-spoken`) - the three shapes a well-meaning
agent in a hurry actually writes, each driven. **A fabricated plausible sentence
passes all three.** What the design buys instead is that a forgery must name one
board and one 64-hex candidate hash, must live in a committed file with his name
on it, is written into the run directory as `owner-approval.txt` with his words
quoted in full, and is printed by `adopt` when it admits the board. Expensive
and visible, not impossible.

**2. The picture he approved and the bytes the entry admits are linked by an
agent's reasoning.** He was shown a PNG of the `rcm s0` construction, drawn by a
scratch adapter in a session scratchpad
(`.superpowers/sdd/2026-10-15-pultec-layout-capability/task-8-report.md`
records that render). The entry is scoped to the sha256 of the painted candidate
`.vrt` the materialisation path writes from the same construction. **That the
two are one arrangement is an inference from the figures agreeing** - 27 parts,
4 cuts, 4 wire links, 5 solder bridges, seed 0 - and not something he
confirmed. The entry's `renderedFrom` says so in those terms rather than
collapsing it into a path that would imply he inspected the bytes.

**NARROWED ON 2026-10-17, AND THE MEASUREMENT IS RECORDED HERE RATHER THAN IN A
NEW ENTRY, so a reader who comes looking for this question finds what was
measured instead of only the prediction.** For the two sections adopted that day
the picture-to-bytes link is **established by content and not inferred from the
figures agreeing**:

- `rsvg-convert -z 3` of each render's `layout-designators.svg` reproduces the
  PNG he was shown **byte-for-byte** - hi-boost
  `627a53945e6c2936b75816c31f9c66e2e6064061e8c8b7635b35a0e78a19000c`, mid
  `8f84656ce8dbfefe361916cdfe48a6d02ff8d628d78cc278a62c5b94ecd0e0ba`;
- re-rendering **each** of the run's five seed candidates through the same
  renderer reproduces that SVG from exactly ONE seed and from no other - seed 4
  for hi-boost (`1ef614f1…`), seed 0 for mid (`fca948a0…`) - so the match
  discriminates between the five candidates rather than being an insensitivity of
  the drawing;
- the candidate those SVGs come from is the one `candidateFor` identifies in the
  run directory the adoption was driven from, whose `run.json` records the same
  hash the approval is scoped to.

**WHAT THIS DOES NOT CLOSE.** He still looked at a picture rather than at the
bytes, which is the sentence above and is unchanged; the render was still drawn by
a scratch adapter rather than by a committed path, which is this entry's *what
would settle it*; and the low-boost entry's own link remains the inference it was
recorded as, because nobody re-measured it. What IS closed is the specific doubt
that an agent picked a plausible seed: for these two boards it did not, and the
method is reproducible from the run directories.

**3. `CRITERIA` §9's own wording is not reconciled with the channel.** `G2.5`
reads *"any failing check, including a non-admissible verdict"* and the
implementation admits through `exitCodeFor(outcome, rule)`; nothing in that
document mentions a run with no rule, and the clause that admits one lives in a
different spec. **No agent may edit §9 to say otherwise** - which is why this
change did not - so a reader of CRITERIA alone still finds no answer and has to
be sent to the five-boards spec by a comment.

**ONE COST THAT IS NOT A DEFECT AND IS RECORDED SO IT IS NOT READ AS ONE.** The
approval is scoped to bytes, so any pipeline change that moves the produced
candidate invalidates it: `tests/stripboard/materialize-run.test.ts` then goes
red on `failing-check` with a complaint saying the board changed. That is the
mechanism working - he approved a board, not a section - and the remedy is to
re-render, show him, and record what he says. **Editing the hash to match a new
board would be an agent approving its own output**, and the test file's own
comment says so where somebody debugging that failure will read it.

- **Found** `2026-10-16-low-boost-to-adoption`, in the change that added
  `tools/stripboard/approvals.ts`.
- **Evidence** the four gut perturbations recorded in
  `.superpowers/sdd/2026-10-16-low-boost-to-adoption/owner-approval-channel-report.md`
  (each guard removed in turn, the test that notices named, restored); the six
  input perturbations printed whole from the gate; and
  `tests/stripboard/approvals-refusals.test.ts`'s own control case, which drives
  his real words through the same loader so the two readings are tests rather
  than walls.
- **Verified** yes - measured, not argued.
- **Why it is open** none of the three is fixable by an agent. (1) is a property
  of recording a human decision in a file; (2) would need him to look at a
  render generated by a committed path from the exact artifact, which the
  renderer cannot do today (the two renderer gaps in that task-8 report are why
  a scratch adapter drew it at all); (3) is an edit to an acceptance document,
  which the producing agent may not make.
- **What would settle it** for (2), a committed render path driven from the
  adopted `.vrt` and a fresh look from him at its output - the strongest form
  this channel can take. For (3), the owner or a reviewing agent reconciling
  `CRITERIA` §9 with the five-boards spec's channel 4, in one sentence, in the
  acceptance document. For (1), nothing: it is the residual, and it is why the
  record is visible in three places rather than trusted in one.

### G26 - `docs/stripboard/pipeline-verification.md` still presents `kappa_bench = 0.05` as the live parameter

That document's parameter table (section near line 2982) reads *"`kappa_bench =
0.05` | The hard end of a ratchet"* and a later section concludes against
*"`kappa_bench` 0.05"*. The bound was withdrawn on 2026-10-16 (see G27 and
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

**THE OWNER-APPROVAL CHANNEL DOES NOT WIDEN THIS AND DOES NOT NARROW IT, which
is worth saying because the two are easy to run together.** A `no-search` run is
now admitted on his recorded call on a render (`G27`), and its outcome is graded
through the same unre-derived `metrics.outcome` this entry is about - so a
fabricated `admissible` beside a genuine approval clears `failing-check` exactly
as a fabricated `admissible` beside a coherent `Q`-rule does, and for the same
reason. **What the approval cannot do is substitute for the outcome**: the gate
grades the candidate BEFORE consulting the registry and refuses an `invalid` or
`valid-below-target` record with the approval on file and unread, which is
driven in `tests/stripboard/adopt-approval-gate.test.ts`. The hole is the
outcome field, in both paths, and it is this entry.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 6.
- **Updated** in the change that added `tools/stripboard/termination.ts`, which
  put the stopping rule in the same position as the outcome; and again in the
  change that added `tools/stripboard/approvals.ts`, which made the outcome the
  one field deciding a `no-search` adoption.
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

### G16 - no Pultec section has a schematic of its own, so no section's packet can be checked against one

**THE HALF THAT BLOCKED `make guide` IS FIXED, AND THIS ENTRY IS WHAT REMAINS.**
The title used to read *"`boards/pultec-low-boost` declares no schematic, so
`make guide` cannot run on it"*, and the refusal it named
(`tools/guide/packet.ts`, *"declares no \"sch\", so the packet has no schematic
to print"*) is deleted. A packet is now produced without a schematic, and
`guide.html` carries a bordered notice on page one - above the first layout
image - saying there is no schematic, naming the board, naming the
`perfboard.json` that declares none, naming the circuit model the pages WERE
checked against, and saying what would put a schematic page there. Both
`pultec-low-boost` and `pultec-low-cut` were packeted this way and the printed
pages read (2026-10-17).

What is left is the fact, not the refusal: **none of the five Pultec sections
has a schematic of its own.** The only schematics in this repository are
`circuits/pultec/pultec-three-band-eq.kicad_sch` and
`circuits/pultec/pultec-mid-band.kicad_sch`, which are the whole EQ. Declaring
one of those on a section would also declare its whole-EQ `netlist` against one
section's board, which `netlist-agrees` would then compare and reject - half a
section's parts are not in it. So for these boards nothing cross-checks the
physical model against a drawn schematic: `make check` says so on every run
(*"This run did NOT compare the circuit against any schematic"*) and now the
printed packet does too.

- **Found** `2026-10-16-pultec-five-boards`, Task 3; narrowed to this claim
  2026-10-17 when the packet path was made to produce without a schematic.
- **Evidence** the two declarations (`circuit`, `export`, `vrt` and nothing
  else); `ls circuits/pultec/*.kicad_sch`; the `NOTICE` printed by
  `make -C boards/pultec-low-boost guide`; the generated
  `boards/pultec-low-boost/guide/guide.html`, read as a printed PDF.
- **Verified** yes - run, and the pages read.
- **Why it is open** a per-section schematic is a drawing somebody has to make,
  and **whether these sections should have one at all is the owner's call**: the
  partition in `circuits/pultec/physical/board.ts` is currently the only
  statement of what a section contains, and promoting it to a drawn schematic is
  a decision about where the authority for these boards lives, not a cleanup.
- **What would settle it** the owner says whether each section gets its own
  schematic (then: draw it, declare the `sch`/`netlist` pair, and the packet
  prints it with no further change), or rules that the circuit model plus the
  whole-EQ schematic is the authority these boards keep - in which case this
  entry is deleted and the printed notice is the permanent, correct statement.
- **ONE THING THE PRINTED NOTICE DOES NOT SAY**, and it is deliberate: it does
  not name `pultec-three-band-eq.kicad_sch` as the upstream authority. The
  packet writer serves every board, and a Pultec path written into it would be a
  guess on every other board that declares no schematic. The notice names the
  circuit module instead, which is the head of that chain and is true of any
  board. If the owner wants the whole-EQ schematic named on the page, the
  channel for it is the circuit module declaring it - the shape
  `powerUpChecks()` already uses - not a constant in `tools/guide`.

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
- **MEASURED ON THE PRINTED PACKET (2026-10-17), AND THE COST IS NOT CLIPPING.**
  No label is cut off: the SVG viewBox widens to hold them (checked by
  comparing every `<text>` run's estimated extent against the viewBox on all
  four layout images of the two low boards - zero outside). What it costs is
  page width. `pultec-low-boost`'s designators viewBox starts at `x = -153.8`
  against `-112.8` for the same board's values image, so the long stand-in
  labels widen the drawing by about 41 units and the board itself is printed
  smaller to fit. On the page, `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper` (row C)
  overprints the row-C letter and the board outline, and on `pultec-low-cut`
  the row-I labels `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper` and
  `SI_LOW_BOOST_RV_LO_BOOST.ccw-wiper` overprint each other. Still the owner's
  call, with one number now attached to it.

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
- **NOW SEEN IN A PRINTED PACKET, ON BOTH LOW BOARDS (2026-10-17).** The
  measurement below was made on a checklist built in memory; it has now been
  made on `boards/<board>/guide/guide.html` as `make guide` writes it, printed
  to PDF and read page by page. `pultec-low-boost`: 10 `PAD` lines
  (`RV_LO_BOOST.1-.3`, `SW_LO_BOOST.1-.7`), **"Wire-to-board junctions" has 2
  rows** (`junction_grounds`, `junction_signals`). `pultec-low-cut`: 10 `PAD`
  lines (`RV_LO_CUT.1-.3`, `SW_LO_CUT.1-.7`), **2 rows**. On both boards NO pad
  identity appears anywhere in any of the seven checklist sections, while all
  ten rings are drawn on both layout images with a legend entry telling the
  builder they are where off-board wires solder. So a person building either
  board from paper gets ten solder joints to make and no line to tick, and the
  two artifacts in one packet contradict each other exactly as stated. **The
  entry is accurate as written.**
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
