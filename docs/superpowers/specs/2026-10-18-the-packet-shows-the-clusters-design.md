The packet shows the clusters
=============================

**Status** awaiting owner review. **Settles** most of `docs/known-gaps.md` G45.

The owner, 2026-10-18, preparing to build low-boost and low-cut:

> *"It would be very useful to see what parts of the circuit are the various
> scaffolding clusters so I can decide whether to populate them or not when I'm
> building them to be paired or not with other modules—e.g. build low boost in
> isolation or low boost to be connected to a low cut board"*

What this is NOT
----------------

**It is not a request to work out which parts belong to which cluster. That is
already done and already correct.** `boards/pultec-low-boost/wiring.md` carries
a table per group with every part, its fitted value and the two nets it sits
between, and a **What to populate, by build** table covering every build this
board can be part of - 16 of them, not 31; see change 4 below and the Decisions
table - with a **Carried elsewhere** column. His own example is two rows
of it, and **the two boards' sheets were cross-checked against each other for
that pair and agree in both directions** - low-boost says hi-boost, hi-cut and
mid are carried on low-cut; low-cut says it carries them; the three crossing
junction pins match.

**The defect is placement, not content: none of it is in the document he will
have at the bench.** `make guide` is what `make help` advertises under *"Build
it on the bench"*, and its packet does not say which parts are scaffolding,
which cluster each belongs to, what to populate for a given build, or that
`wiring.md` exists. That is G45.

The design
----------

Four changes, three of them to the packet and one to the data the packet is
given.

**1. The guide loads the board's `ScaffoldDoc`, following `powerUpChecks`
exactly.**

Each Pultec board module already exports `SCAFFOLD = scaffoldDoc("<section>")`
(`circuits/pultec/physical/low-boost.ts:63` and its four siblings), and
`lib/board/wiring.ts:78` already consumes it as `scaffold?: ScaffoldDoc`.
`BoardCircuit` (`tools/guide/circuit.ts:27-30`) gains it the same way it
carries `powerUpChecks`:

```ts
export interface BoardCircuit extends PerfboardBoardCircuit {
  readonly powerUpChecks: PowerUpChecks | undefined
  /** The module's stand-in groups and per-build population; `undefined` when it declares none. */
  readonly scaffold: ScaffoldDoc | undefined
}
```

`undefined` is a legitimate state, not a gap: `pt2399-core` and the
transistor-preamp boards are not sections of a larger circuit and export no
`SCAFFOLD`. **It is not defaulted to an empty doc** - an empty `ScaffoldDoc`
would read as a board with no groups to populate, which is a different claim,
and `asScaffoldDoc` refuses one anyway. A board with no scaffold gets the
explicit notice in change 4, exactly as a board with no power-up checks already
gets one.

**2. A fourth layout image: the clusters view.**

The packet draws three images today (designators, values, mirrored copper). A
fourth shows the same board with **every stand-in part filled with its group's
hatch, every own-circuit part left plain**, and a legend naming each group, the
absent section it stands in for, and its part count.

**THE HATCHING IS BUILT TO BE LOOKED AT, AND IS NOT ADOPTED BY BUILDING IT.**
The owner, 2026-10-18: *"hatching—I don’t know until i see it"*. That is the
correct answer and it governs the work: **the implementing agent may not settle
which hatches the packet ships with.** What it produces is a candidate for him
to rule on, rendered on `pultec-low-boost` and `pultec-low-cut` and read at
printed scale, and the ruling comes back from him. This is the invariant in
`CLAUDE.md` - an agent may never author the acceptance criteria for the artifact
it is producing - applied to the one decision in this spec that is purely
visual. If he rejects the hatches, the mapping, the legend, the column and the
checks all stand; only the fills change.

**Hatching rather than tint or colour, and a legend rather than per-part text.**
Two reasons, both load-bearing, and they constrain the candidate rather than
choosing it:

- **It must survive a black-and-white print and a photocopy.** Distinct
  diagonal, vertical, horizontal and cross hatches stay distinct where four
  grey tints do not.
- **No new per-part string goes on any image.** G2 records that pad labels
  already crowd the row they sit in and G17 that a long part label runs off the
  board outline. Adding a third string per part would feed both. The clusters
  view adds no text inside the board at all.

On `pultec-low-boost` the four groups are hi-boost (2 parts), hi-cut (4),
low-cut (1) and mid (1), and they sit in the top band of the board while the
board's own parts sit below - so the view will read as a band. **That is a
property of this board, not a guarantee**, and the design deliberately does not
rely on a group being spatially contiguous: the hatch is per part.

**Cost, stated because it interacts with a ruling he has already made.** A
fourth image is a fourth page, so the packet goes from seven pages to eight. He
declined fixing the two near-empty pages (G48, *"I don't care about the sparse
pdfs. leave that alone"*) - which is a declination about page COUNT, not a
blanket acceptance of more pages, so the cost is named here rather than assumed
to be covered by it.

**3. The checklist row states its own FIT CONDITION, not merely its cluster.**

**This is the review's finding 1, accepted, with its remedy rejected as too
weak.** The first version of this spec added a `Cluster` column whose values
were `own circuit` or a section name. That is a label the builder has to look
up somewhere else, and **every checklist row carries a printed checkbox**
(`tools/guide/guide.ts:7`; verified - 66 in the generated
`boards/pultec-low-boost/guide/guide.html`). So eight of low-boost's rows are
boxes that must be left unticked in most builds, and an unticked box reads as
unfinished work.

The review's remedy was that *"the document should state prominently that
stand-in rows are not instructions to install those parts unconditionally."*
**A prominent statement is prose, and prose is exactly the register's diagnosis
of why this packet fails.** G45 exists because conditionality the wiring sheet
spends several screens on reaches the builder not at all; a warning paragraph
leaves him cross-referencing a table to interpret a row. **The row must carry
its own condition.**

So the column is a FIT condition, derived from the `ScaffoldDoc`:

| value | meaning |
| --- | --- |
| `always` | the part is in this board's own circuit, fitted in every build |
| `only with the <section> group` | the part is a stand-in, fitted only when this board carries that absent section's group |

`always` and a named condition are different kinds of sentence, which a cluster
name and another cluster name are not. A builder reading `only with the hi-cut
group` beside an empty box has been told why it is empty.

**A column, not a re-ordering**, and the review agrees. The checklist's order
is the operator's order of operations - ICs and transistors, resistors,
capacitors, wire links, junctions, bridges, cuts - and that order is the file's
stated purpose (`tools/guide/checklist.ts:1-13`). He ticks parts off in build
order.

**4. A "Stand-in groups" section in the checklist, and page one names
`wiring.md`.**

After the part sections, the packet carries:

- **a line recording WHICH BUILD this board is being built for**, to be filled
  in by hand, above everything else in the section. **The review's finding 4 is
  accepted and this is the part it leaves out:** the packet carries every
  applicable build, so every group decision below is meaningless until the
  build is named. One blank line fixes it and nothing else can;
- **one block per group, as a CONFIGURATION record rather than a second
  component checklist.** The review is right that group-level checkboxes beside
  per-part checkboxes give two accounts of completion, and that a ticked box on
  an omitted group cannot be read: it means either "all fitted" or
  "deliberately skipped". So each group records WHICH of three states it is in
  - **populated here**, **not needed (that section is present in this build)**,
  or **carried on <board>** - and never a bare tick. That is the wiring sheet's
  own logic (`Populate here` / `Carried elsewhere`), carried over rather than
  reinvented. The rules travel with it in the sheet's own words: *"Populate a
  group whole, or leave it empty"* and *"One group, one board"*;
- **every build containing THIS board - 16 for a five-section Pultec, not 31.**
  **The review's finding 2 is accepted and the first version of this spec was
  wrong.** 31 is the number of non-empty combinations of five sections
  globally; a given section appears in 2^4 = 16 of them. Verified: both
  `boards/pultec-low-boost/wiring.md` and `boards/pultec-low-cut/wiring.md`
  carry 16 data rows, and the existing generator already does this correctly.
  **The count is DERIVED from `ScaffoldDoc.builds`, never written as a
  literal** - the review's "better still" and this repository's own rule that a
  derived artifact is not restated by hand. A test asserting `16` would be a
  second statement of the same fact, free to drift from the model; the test
  asserts the packet's row count equals `scaffold.builds.length`, and asserts
  separately that every row's board list contains this board;
- **the whole applicable table, not only the row for one build.** He may change
  what is on the bench while building, and a packet carrying one build's row
  would be wrong rather than incomplete the moment he does;
- for a board with no `ScaffoldDoc`, **one sentence saying this board holds no
  stand-in groups and is populated the same way in every build** - the
  `NO_FOOTPRINT` / `NO_SPAN` precedent (`tools/guide/checklist.ts:152-170`),
  where a gap says which gap it is rather than leaving a blank;
- page one's provenance block, which today names `perfboard.json` and the
  circuit module, **also names the board's `wiring.md`** as a document the
  packet does not replace.

Testing
-------

- `pultec-low-boost`'s checklist marks exactly 8 parts as stand-ins across 4
  groups and the rest as `own circuit`, asserted against `SCAFFOLD` rather than
  against a hardcoded list, on the real board.
- The premise is asserted before the counts that depend on it, per
  `tests/guide/junction-pad-rows.test.ts:50-53`: a board whose scaffold silently
  arrived `undefined` must not pass by having zero of everything.
- **The clusters view is asserted as a MAPPING, not as a presence.** The first
  version of this spec checked only that the image carried one hatch definition
  per group, and **the review is right that this is insufficient**: an SVG can
  define four hatches and apply one to the wrong part, apply none, or hatch an
  own-circuit part. The assertions, on component identities BEFORE rendering and
  then on the emitted SVG separately:
  - every part id in `ScaffoldDoc.groups` appears exactly once in the view;
  - each carries the hatch of its own declared group;
  - no own-circuit part carries any scaffold hatch;
  - every rendered stand-in has a checklist row, and every checklist row marked
    conditional belongs to exactly one group.

  The review's reason for insisting on this is the strongest argument in it and
  is adopted verbatim in the spec's reasoning: **the approved layouts are
  immutable, so if the diagram misidentifies a part the builder has no reason to
  suspect the diagram rather than the layout.**
- **The by-build section carries `scaffold.builds.length` rows - 16 on each
  Pultec section - and every row's board list contains this board.** Not 31; see
  change 4.
- **Hatch legibility is checked on the PDF at printed scale**, not by reading a
  full-resolution SVG - the review's point, and `CLAUDE.md`'s *"Look at the
  output, not only the tests. Render it, print it, read it."*
- The legend states explicitly that an unhatched part belongs to this board's
  own circuit and is fitted in every build, so the absence of a hatch has a
  stated meaning rather than an inferred one. The review's finding 5, accepted
  without reservation: a faint or obscured hatch on a poor photocopy is
  precisely when an unstated convention fails.
- A board with no `SCAFFOLD` (`pt2399-core`) produces a packet with the explicit
  no-groups sentence, and its checklist gains the column with every row reading
  `own circuit`.
- Both low boards' packets are regenerated and **read as PDFs**, not only
  asserted - `CLAUDE.md`: *"Look at the output, not only the tests."*
- The five committed `.vrt` files and five `wiring.md` files stay
  byte-unchanged.

Out of scope, with reasons
--------------------------

- **No per-section schematic.** That is G16 and the owner's separate decision;
  the legible generator is specced at
  `docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`
  (`tools/schgen/`) and is designed, not built. This spec does not touch it.
- **The 0 Ω rows - NO LONGER CONFIDENTLY OUT OF SCOPE. NEEDS HIS RULING.**
  The first version of this spec excluded G55 on the grounds that it needs the
  layout-level answer his *"Leave the approved boards alone"* ruling blocks.
  **Neither this spec nor the third-party review noticed the interaction, and it
  is a real one.** Counted: of low-boost's 8 stand-in parts, **3 are 0 Ω** -
  `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper`, `SI_HI_CUT_RV_HI_CUT.ccw-wiper`,
  `SI_LOW_CUT_RV_LO_CUT.ccw-wiper`. So **three of the eight rows this change
  exists to annotate are rows that already give a wrong instruction**: they will
  read *"only with the hi-cut group | 0R | STAND ON END"*, which is a correct new
  column bolted onto a part the sheet should be calling a wire link.

  Annotating a wrong row more carefully makes the packet more confidently wrong
  in those three places. **G55's level 1 - the sheet and the image, no `.vrt`
  touched - is available now and would cost little inside this change**, since
  it edits the same two functions (`valueLabel`, `mountingCell`) and the same
  renderer. G55's level 2, which is the layout no longer specifying 0 Ω parts,
  stays out: that is the blocked one.

  **Recommendation: fold G55 level 1 in.** But it is scope, and scope is his,
  so it is put here rather than taken.
- **No board is re-laid out.** `.vrt` files byte-unchanged.
- **G2 and G17 are not addressed.** Label crowding and labels leaving the
  outline are judged on a render; this change adds no in-board text, so it
  neither fixes nor worsens them.

Where this spec disagrees with the third-party review
----------------------------------------------------

Findings 2 and 5 are accepted outright, 1 and 4 are accepted with stronger
remedies than the ones offered, and 3 is accepted and then argued to be bigger
than the review treats it. Two disagreements are worth recording.

**1. Finding 3 is not a testing improvement. It is a missing CHECK, and it does
not belong only in a test.** The review frames *"every stand-in component in
`ScaffoldDoc` appears exactly once in the visualization"* as a way to test an
image. But that assertion compares the **scaffold doc against the layout**, and
**nothing in this repository does that today.** `assertLayoutMatchesCircuit`
compares the layout against the circuit; no check establishes that every part a
group claims is actually placed on the board, or that a placed `SI_` part is
claimed by exactly one group. A group that lost a part, or a part belonging to
two groups, is a defect in the MODEL that would reach a bench as a confidently
drawn diagram.

So the membership assertion is **promoted out of this spec's test list and into
a check `make check` runs**, which is where a model-level consistency claim
belongs. The image test then asserts only that the hatches are emitted as the
checked mapping says. **This is a scope increase the review's own closing advice
would resist**, and it is taken deliberately: the review's reason for the
assertion - that an immutable layout means a misidentified part gets blamed on
the layout - is an argument for a gate, not for a test.

**2. Finding 1's remedy is rejected while its finding is accepted.** *"The
document should state prominently"* is prose, and the packet's established
failure mode is that prose-level conditionality never reaches the builder at
all (G45). A statement that some rows are conditional still requires him to
cross-reference a table to interpret a checkbox. The row carries its own fit
condition instead - see change 3.

**What the review got right that is worth preserving as the reason, not just the
conclusion:** that showing which parts belong to a cluster is not the same as
telling the builder which parts to install. That sentence is the whole finding,
it is correct, and the first version of this spec conflated the two.

Decisions
---------

| What | Who | Why |
| --- | --- | --- |
| Surface the clusters in the packet rather than generate new data | owner, 2026-10-18 | *"It would be very useful to see what parts of the circuit are the various scaffolding clusters"* - the data exists and is correct |
| Do this before the schematic work | owner, 2026-10-18 | *"your recommendation"*, accepting: spec the packet now because it changes what he holds at the bench, plan `schgen` next rather than hand him a grid he would have to redraw |
| A dedicated clusters image, not markings on the existing ones | **owner, 2026-10-18** | *"dedicated image is fine"* - and it keeps all new information off the designators and values images, so G2 and G17 are not fed |
| The eighth page is accepted | **owner, 2026-10-18** | *"eighth page is fine"* - asked explicitly because his G48 declination was about page count, not a blanket yes to more pages |
| Fold G55 level 1 (the 0 Ω rows) into this change | **owner, 2026-10-18** | *"folding in 0ohm fix: do it"* - 3 of the 8 rows this change annotates already give a wrong instruction, and the fix edits the same two functions and the same renderer. Level 2 stays out: it changes `.vrt` files |
| **Hatch patterns: NOT YET DECIDED, and no agent decides it** | **owner, 2026-10-18 - deferred to a render** | *"hatching—I don’t know until i see it"*. So hatching is implemented in order to be LOOKED AT, and the choice is not settled by this spec or by the implementing agent. See below |
| A fit-condition column in the checklist, order unchanged | this spec - **he did not rule on this one** | of the five rulings put to him he answered four; this is the one he did not speak to. It proceeds as specced because it is the change that makes the checklist unambiguous, and it is flagged here so he can veto it when he sees the render rather than discovering it unannounced |
| 16 build rows, derived from `ScaffoldDoc.builds` | third-party review, 2026-10-18 | the first version of this spec said 31, which is the global combination count; a section appears in 2^4 of them, and both wiring sheets already carry 16 |
| The group section records a three-state configuration, not a tick | third-party review, 2026-10-18 | a ticked box on an omitted group cannot be read as either "all fitted" or "deliberately skipped" |
| The scaffold-to-layout membership check goes in `make check`, not only in a test | this spec, against the review's scope advice | it is a model-level consistency claim, and an immutable layout means a misidentified part gets blamed on the layout |
| The packet carries EVERY build row, not one - 16 of them, per the row above | this spec | a single-build row becomes wrong, not merely incomplete, the moment the bench changes. **This row said "all 31 build rows" until 2026-10-19**, which contradicted the row above it, the body (changes 4 and 5) and what shipped: 31 is the global count of non-empty combinations of five sections, and a given section appears in 16 of them. The decision this row records is all-builds-versus-one, which is unchanged; only the number was wrong |
| `scaffold` is optional and never defaulted to empty | `CLAUDE.md` | an empty doc asserts "no groups to populate", which is a different claim from "this board declares none" |
| The packet names `wiring.md` rather than absorbing it | this spec, for review | G45 names both options - print the conditionality, or have page one name the sheet you must hold. This does both, since the conditionality is small and the sheet carries much more |
