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
was established, and what would settle it. It does not promise a milestone. A
FIXED entry is DELETED rather than marked closed - supersede means delete. A
DECLINED entry is NOT the same thing and does not leave the same way: the owner
has ruled on it, but what it describes is still true of the artifact, so it
moves to the "Declined" section below, with his words, rather than being
deleted - `CLAUDE.md`: *"A question he declined is not a closed question, but
nobody asks him again unprompted."* A reader of only this paragraph must not
conclude that a declination is deleted too.

**`G<n>` IN THIS FILE MEANS AN ENTRY IN THIS FILE, AND NOTHING ELSE.** `CRITERIA`
numbers its own clauses with the same letter - `G2.5`, `G4` - and the two
namespaces collided here: a reference reading plain `G4` was a CRITERIA clause
while this register also had an entry G4, and deleting that entry turned the
reference into an apparent pointer at nothing. **Every CRITERIA reference is
written `CRITERIA G<n>` in full.** A bare `G<n>` is this file's.

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
- **One thing already tilted the cost, found by the Task 2 reviewer, and now
  RESOLVED (2026-10-17, this plan's Task 3).** The renderer's asymmetry this
  bullet described - a PART's label coming from the caller while a PAD's label
  was derived inside the renderer from `pad.identity` - is closed.
  `RenderOptions` now carries a `padLabels` map keyed by `PadTerminal.identity`
  (`tools/guide/render.ts`), built by the caller the same way `labels` is for
  parts; `tools/guide/render-parts.ts`'s `drawPadLabels` no longer derives
  anything from `pad.identity` and refuses a pad the map does not name. The
  identity-versus-functional-label question this gap's "What would settle it"
  asks about was decided in Task 2 (the owner: *"I like the more descriptive
  names"*), and `tools/guide/packet.ts` now fills `padLabels` with
  `padLabelOf`'s functional label for every pad on every one of the three
  packet images. **This does not close G1.** The broader question the gap
  opened - whether a panel pot should be represented as a header PART
  (`tools/guide/off-board.ts`) or as pads (`tools/guide/pads.ts`) at all, and
  reconciling edge labels, the checklist's junction rows and `valueLabel` with
  whichever is chosen - is unchanged and still open; Task 3 only moved where a
  pad's label comes from, not which representation a control uses.
- **BOTH REPRESENTATIONS ARE STILL ON THE PRINTED PAGES (2026-10-17, this
  plan's Task 6).** Read off the regenerated
  `boards/pultec-low-boost/guide/guide.html` beside the board's committed
  `boards/pultec-low-boost/wiring.md`. The packet's **Wire-to-board junctions**
  table gives a pad-path control one row per landing pad, keyed by hole and
  terminal name - `RV_LO_BOOST | landing pad | F7 LO BOOST wiper` - while
  `wiring.md`'s **Panel parts** section gives the same pot a pad-ordinal table
  keyed by net - `| 2 | wiper | - | lo_boost_in |`. A builder holding the two
  documents is holding two vocabularies for one control, and neither document
  points at the other. **ONE HALF OF THAT LAST CLAUSE EXPIRED 2026-10-18**: the
  packet's page one now names the board's `wiring.md` as a document it does not
  replace (the `G45` change), so the packet points at the sheet while the sheet
  still does not point back - and **the two vocabularies are unaffected**,
  which is what this entry is about. Task 5 made it an ERROR for one ref to
  carry both a
  header PART and PAD lines, so a layout can no longer carry the two
  representations at once; it does not say which one a panel control should BE,
  which is what this gap asks.

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
- **STILL TRUE WITH THE DESCRIPTIVE TEXT (2026-10-17, this plan's Task 3)**,
  read off `boards/pultec-low-boost/guide/layout-designators.svg` (`make -C
  boards/pultec-low-boost guide`) at `rsvg-convert -z 6` on a crop, now that
  `padLabelOf`'s functional labels print instead of identities (see G1's
  resolved bullet, above). All ten are individually legible. Two of the same
  shapes of crowding persist under the new text: the pot's common-terminal
  label (`LO BOOST common`) has another pad's ring crossing the tail of the
  word, and the switch's `LO BOOST 30Hz` label sits on the row-M dark
  every-fourth alignment strip. Usable, not comfortable - this gap is about
  the renderer's placement geometry, which Task 3 did not touch, so the owner
  call this gap asks for is unaffected by what the text now says.
- **RE-JUDGED AGAINST THE NEW PRINTED TEXT RATHER THAN THE OLD (2026-10-17,
  this plan's Task 6)**, by regenerating both packets (`make -C
  boards/pultec-low-boost guide`, `make -C boards/pultec-low-cut guide`) and
  reading the layout images at `rsvg-convert -z 3`, with crops at 2x on the
  label-dense rows. **The labels got longer and length is not what crowds.**
  Measured from the `<text>` runs of `layout-designators.svg` (font-size 8,
  start-anchored, white halo, hole pitch 20): the ten pad labels span 2.1 to
  3.5 hole pitches of their own row - `LO BOOST common` longest at ~3.5, `LO
  CUT cw` shortest at ~2.1. The 13-character identity form they replaced
  (`SW_LO_BOOST.1`) spans ~3.0, so the worst case grew by about half a hole.
  PART labels on the same pages already span up to 7.9 hole pitches
  (`SI_LOW_BOOST_RV_LO_BOOST.ccw-wiper`), so a pad label is not the longest
  text on the drawing and was not before.
- **What crowds is where a label is put, and that is unchanged.** On
  `pultec-low-boost` row F carries three landing pads - F3 `common`, F7
  `wiper`, F15 `cw` - and `LO BOOST common` starts at F4 and runs to F7, so it
  prints across the F7 pad's ring, while `LO BOOST wiper`, which belongs to F7,
  is drawn a row lower starting below F3. From the image alone the two labels
  can be read off the wrong rings. On `pultec-low-cut`, `LO CUT 60Hz` (pad D3)
  is drawn outside the left board outline two rows below its pad, and `LO CUT
  100Hz`, `150Hz` and `200Hz` are drawn to the LEFT of their pads while the
  other six are drawn to the right, so the reading convention reverses within
  one drawing. A landing pad's label has no leader line; the junction header's
  edge labels on the same page do (`class="edge-leader"`).
- **What the pages have to recommend them, recorded so this entry is not read
  as a verdict:** all ten labels are individually legible at full page size on
  both boards, the white halo keeps text readable where it crosses a dark
  every-fourth-row alignment strip, and the packet's **Wire-to-board
  junctions** table names the hole for every terminal, so every ambiguity the
  image leaves is resolvable on the facing page without opening a board file.
  Whether the placement is acceptable is the owner's call and this reading does
  not make it.

### G39 - `SW_HI_BOOST` carries a gang no check can see, so its agreement with its gang-mate is still unverified

**NARROWED 2026-10-18 - ONE HALF IS NOW A FIX, DONE; THE OTHER HALF IS AN OWNER
DECISION AND MOVES THIS ENTRY HERE.** The title used to be *"nothing checks
that two poles of one gang declare the same positions, although every reader
assumes they do."* That is no longer true for every gang `SELECTORS` can see
into - it is still true for the one gang it cannot.

**What is now checked.** `assertGangsDeclareSamePositions`
(`circuits/pultec/electrical/controls.ts`, called on `SELECTORS` at module
load, right after `SELECTORS` is declared) groups `SELECTORS` entries by
`gang` and refuses when two members of one gang declare different `positions`
lists - length or order, since position *N* on one pole and position *N* on
the other land on the same detent of the one physical shaft. The refusal names
the gang and both refs, each paired with its full list, e.g.:

```
Gang "test_gang" poles declare different positions: SW_FIXTURE_A=[20Hz, 30Hz, 60Hz] vs SW_FIXTURE_B=[20Hz, 99Hz, 60Hz]
```

`tests/pultec/gang-positions.test.ts` drives two fixture poles sharing a gang
with different `positions` and asserts the refusal names the gang, both refs
and both lists; a companion test asserts the check accepts the committed
`SELECTORS` as-is (`SW_LO_CUT` and `SW_LO_BOOST` genuinely agree). Perturbing
the comparison to a check that only compares list LENGTH - a mistake a
well-meaning author could make, since the fixture's two divergent lists are
both length 3 - turned the two refusal-driving tests red by name
(`two poles of one gang declaring different positions are refused`,
`the refusal names the gang, both refs and both lists`); restoring the
content comparison turned them green again. `lib/model/control-state.ts`'s
`checkGangs` and `validateControlState` are unchanged and still only compare
the SELECTED position in one `ControlState`, as the rest of this entry below
still describes.

**What is still open, and why it stays open.** `SW_HI_BOOST` carries
`gang: HI_FREQUENCY_GANG` (`buildHiBoostSelector`,
`circuits/pultec/electrical/from-netlist.ts:237`) but has no `SELECTORS`
entry - it is built separately, straight from `HI_BOOST_POSITIONS` - so
`assertGangsDeclareSamePositions` **cannot see it** and cannot compare it
against `SW_HI_CUT`, its declared gang-mate. The hi-frequency gang's two poles
could disagree today and nothing checks it: this is the exact gap the old
title described, just now narrowed to the one gang the new check cannot
reach. Making it reachable means deciding whether `SW_HI_BOOST` joins
`SELECTORS` - a change to what `SELECTORS` is for and how `buildHiBoostSelector`
derives its contacts, not a check an agent can add unilaterally. That decision
is the owner's, which is why this entry now lives in this section.

**WHAT A GENERATED SECTION SCHEMATIC ADDS, 2026-10-18.** The owner has required
a schematic per Pultec section board (G16 carries his words), and a gang is the
one thing in these circuits that **spans two boards**: `LO_FREQUENCY_GANG` joins
`SW_LO_CUT` on low-cut to `SW_LO_BOOST` on low-boost, `HI_FREQUENCY_GANG` joins
`SW_HI_CUT` to `SW_HI_BOOST`, and each pair is one shaft. A per-board drawing
therefore either says "one pole of two, shaft shared with the other board" or it
reproduces on a schematic the live build defect **G45** already records on the
printed packet (*"a builder fits a separate six-position switch per board where
one shaft is meant to turn two"*). A drift check of
`docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`, run before
T2 was planned, found that the spec's `selectorBank` template is specified as
*"a rotary switch fanning out to a capacitor bank"* with **no gang, no pole and
nothing cross-board**, and that none of its gates carries the relationship
either; the ganged pole has since been added to that spec's template table as a
gap to be designed. **That does not settle this entry** - it makes its open half
load-bearing in a third artifact, and whether `SW_HI_BOOST` joins `SELECTORS`
also decides whether the hi-frequency gang's two poles are ever checked against
each other at all. **Relayed from the drift check**, except the spec text, which
this writer read at `1dd5814`.

**The printed guide is still immune by construction**, for the same reason as
before: `tools/guide/pad-label.ts` labels a pad from the component's own
`contacts` through `positionsByPin`, so no derivation anywhere in the label
path reads one pole while printing the other.

- **Found** `2026-10-17-a-pads-wire-says-what-it-is`, Task 2 - the dispatch
  asked whether a gang's poles always agree, so it was checked rather than
  assumed. Narrowed `2026-10-18-the-hygiene-batch`, Task 4.
- **Evidence** `2026-10-17`: three `resolveNetwork` runs over a mutated
  `THREE_BAND_REFERENCE`, method and transcript kept below this point in the
  version history. `2026-10-18`: `bun test tests/pultec/gang-positions.test.ts`
  green (5 pass) with `assertGangsDeclareSamePositions` in place; the two
  refusal-driving tests red by name under the length-only perturbation
  described above; `bun run typecheck` clean; `bun test` 2450 pass / 0 fail
  across 226 files (was 2445/225); all five Pultec boards still pass
  `make -C boards/<board> check`; the five boards' `.vrt` and `wiring.md`
  files unchanged by `shasum` before and after.
- **Verified** yes - run, not inferred, both dates.
- **Why it is open** `SW_HI_BOOST` joining `SELECTORS` is a decision about what
  `SELECTORS` enumerates and how `buildHiBoostSelector` would then derive its
  contacts, and an agent producing the check may not also author the
  criterion that would make the check complete.
- **What would settle it** the owner decides whether `SW_HI_BOOST` joins
  `SELECTORS` (and if so, how `buildHiBoostSelector`'s derivation of its
  contacts from `HI_BOOST_POSITIONS` changes to match). Once it does, the gang
  it already declares becomes enumerable and `assertGangsDeclareSamePositions`
  covers it with no further change to the check itself.

Below is the measurement that found the gap in the first place, kept for the
method and the transcript rather than restated:

`SelectorTerminals.gang` (`circuits/pultec/electrical/controls.ts:42`) says
poles sharing a gang *"must always be at the same position. The resolver
enforces it."* Two checks in `lib/model/control-state.ts` stood behind that
sentence and **neither compared the position LISTS the poles declare**:

- `checkGangs` (`:244-256`) compares the SELECTED position of each pole in a
  `ControlState` and refuses *"Ganged switches disagree"*;
- `validateControlState` (`:207-241`) refuses *"Unknown switch position"*
  (the test at `:225`, the throw at `:226`) when a selected position is not in
  that one switch's own `positions`.

So `SW_LO_BOOST.positions` and `SW_LO_CUT.positions` were two independently
transcribed six-entry lists - the Cboost and the Ccut column of
`P3bandDoc.pdf` p4 - that happened to be identical, and an edit to one of them
was caught only if a simulation happened to select a position the edited pole
no longer declared. `assertGangsDeclareSamePositions` now closes this for
every gang `SELECTORS` can see.

**Measured, by a check that could have failed.** `SW_LO_CUT`'s positions were
rewritten in `THREE_BAND_REFERENCE` and the network resolved at a state the
committed model is validated at (`loFrequency: "60Hz"`), three times:

```
baseline, both poles as committed: RESOLVED, no refusal
A: SW_LO_CUT declares a DIFFERENT six-entry list that still contains the selected 60Hz: RESOLVED, no refusal
B: SW_LO_CUT no longer declares the selected 60Hz at all: REFUSED - Unknown switch position: SW_LO_CUT=60Hz
```

**A was the gap**: one pole of the low gang reading `1Hz, 2Hz, 60Hz, 4Hz, 5Hz,
6Hz` against the other's `20Hz ... 200Hz` resolved silently. B shows which
guard did fire and that it was `validateControlState`'s per-switch check, not
the gang one - and only for the one position being simulated. `A` is now
refused by `assertGangsDeclareSamePositions` before a simulation ever runs.

### G60 - which checklist section a 0 Ω part's row lands in was chosen by an agent as the smallest claim available, and the owner has never ruled on it

**WHAT SHIPPED.** Three of `pultec-low-boost`'s eight stand-in parts resolve to
0 Ω, and their rows are printed in the build checklist's **4. Wire links**
section rather than in a part section. Verbatim from the regenerated
`boards/pultec-low-boost/guide/guide.html`:

    | Wire | From | To | Fit |
    | SI_HI_BOOST_RV_HI_BOOST.ccw-wiper | C3 | D3 | only with the hi-boost group |
    | SI_HI_CUT_RV_HI_CUT.ccw-wiper | B11 | E11 | only with the hi-cut group |
    | SI_LOW_CUT_RV_LO_CUT.ccw-wiper | E19 | G19 | only with the low-cut group |

The other four adopted boards carry the same shape for their own zero-ohm
stand-ins. The section's own opening paragraph already explains why a
designator sits among the `W` numbers: *"Some of these are listed by designator
rather than as W1, W2 ...: they are parts of the circuit that carry no
resistance."*

**WHY IT IS PROVISIONAL.** The implementer that moved those rows was told to
put them in **Wire links** because it was **the smallest claim available** - a
0 Ω part is a wire to solder, and that section is where a wire to solder is
listed - and was told explicitly not to settle the question. Which section of a
printed checklist a part belongs in is a decision about the artifact, and the
agent producing the artifact may not make one (`CLAUDE.md`).

**THIS ENTRY WAS MOVED OUT OF G55 RATHER THAN DUPLICATING IT, 2026-10-18.** It
sat there as a clause inside an entry whose subject is the LAYOUT - that the
five adopted `.vrt` files still place a 0 Ω part as a resistor, which is
blocked by his *"Leave the approved boards alone for bow"*. This question is
about the printed page, it is answerable without touching a layout, and as a
sub-clause of a blocked entry it was invisible. G55 now points here instead.

- **Found** 2026-10-18, in the change that fixed G55's level 1 (the sheets),
  recorded there as a clause; promoted to its own entry by Task 7 of
  `docs/superpowers/plans/2026-10-18-the-packet-shows-the-clusters.md`.
- **Evidence** the three rows above and the section paragraph, read off the
  regenerated `guide.html`; `tools/guide/checklist.ts`'s routing branch and
  `isZeroOhmResistor` in `lib/model/zero-ohm.ts`, which is the single test that
  decides it.
- **Verified** yes - read off the regenerated packet by the writer of this
  entry, not relayed.
- **Why it is open** nobody has put it to him. G55's level 1 shipped on the
  reasoning that a wrong instruction (`0R` / `STAND ON END`) is worse than an
  unratified placement. That reasoning is sound and it is not a ruling.
- **What would settle it** he looks at section 4 of the printed packet and says
  whether a zero-ohm part belongs there, among the resistors with a note, or in
  a section of its own. **THE CRITERION IS HIS TO APPLY**, and the thing to
  apply it to is whether a builder reading the row fits a wire without looking
  for a part to buy. **MECHANISM, which is a guess from someone who has not
  tried it:** the routing is one branch in `tools/guide/checklist.ts` keyed by
  `isZeroOhmResistor`, so moving the rows is a one-site change - but the
  **Wire links** heading, its explanatory paragraph and the `Wire | From | To`
  column shape would all have to move with them, and G58's cross-reference
  sentence names the `Fit` cell rather than a section precisely because a
  group's parts are already spread across three.

### G61 - the checklist's `Fit` column is the one ruling of five the owner never answered, and it shipped as specced

**WHAT SHIPPED.** Every row of every part section in the printed checklist now
carries a **Fit** cell: `always` for a part in this board's own circuit, and
`only with the <section> group` for a stand-in. On `pultec-low-boost` eight
cells read the conditional form - four in **Resistors and trim-pots**, one in
**Capacitors**, three in **Wire links** - and the four group blocks in the
**Stand-in groups** section quote the same strings back, twelve occurrences in
the page altogether; `pultec-low-cut` carries thirteen.

**WHY IT IS PROVISIONAL.** Of five decisions put to him on 2026-10-18 about
this change he answered four - the dedicated image (*"dedicated image is
fine"*), the eighth page (*"eighth page is fine"*), folding in the 0 Ω fix
(*"folding in 0ohm fix: do it"*) and the hatching (deferred to a render, then
ratified; G59) - **and this is the one he never spoke to.** Its authority in
the spec's own Decisions table is *"this spec - he did not rule on this one"*,
with the reason it proceeded anyway: *"it proceeds as specced because it is the
change that makes the checklist unambiguous, and it is flagged here so he can
veto it when he sees the render rather than discovering it unannounced"*. This
entry is that flag, in the file that outlives the spec.

- **Found** 2026-10-18, Task 7 of
  `docs/superpowers/plans/2026-10-18-the-packet-shows-the-clusters.md`, reading
  the spec's Decisions table against the register.
- **Evidence** the `Fit` column present in sections 2, 3, 4 and 5 of the
  regenerated `boards/pultec-low-boost/guide/guide.html`, with the eight
  conditional cells above; `grep -o "only with the"` returns 12 on low-boost
  and 13 on low-cut; the Decisions table row in
  `docs/superpowers/specs/2026-10-18-the-packet-shows-the-clusters-design.md`.
- **Verified** yes - the column read off the regenerated packet and the
  unanswered ruling read off the spec, both by the writer.
- **Why it is open** it is a column on a document he builds from, and the one
  decision in this change that has no owner behind it. Nothing is wrong with it
  that this writer can see, which is exactly why it needs recording rather than
  assuming: an unopposed agent decision about a printed artifact is the shape
  `CLAUDE.md` forbids, and it does not stop being that shape by being a good
  idea.
- **What would settle it** he sees the render and leaves it or vetoes it.
  **CRITERION, from the spec's own reasoning:** a builder meeting an empty
  checkbox can tell from the row whether the box is empty because the part is
  not wanted in this build. **MECHANISM if he vetoes it:** the column is
  `fitLabel` in `tools/guide/checklist.ts`, but it does not come out alone -
  G58's group-block sentence (*"Every row in the build checklist whose Fit
  column reads ... is one of these"*) is the only thing that leads a reader from
  a group to its parts, since a group's parts are spread across three sections,
  so removing the column requires answering that too.

### G71 - no published source states an acceptable number of wire crossings, bends or wire length, so a threshold in a readability rubric would be this project's invention wearing a citation

Measured by the standards research pass (`docs/schematic/readability-research.md`
§2.2, §4.2, §7.3, committed `51f8362`; moved under `docs/schematic/` and indexed
by `docs/schematic/README.md` on 2026-10-19): **every source it could read says
*minimise* and none says how few is few enough.**

- ANSI/ASME Y14.15-1966 **15-7.2**: connecting lines *"should be drawn with as
  few bends and crossovers as possible"*; **15-6.3.5**: *"a minimum of line
  crossings"*. A **withdrawn** standard - G68.
- IEC 61082-1:2014 **Figure 36** is *titled* "Example for avoiding bends and
  cross-overs" and its clause text was not obtained (G70). A title is not a
  requirement (G69).
- **The research literature is weaker here than the standards, not stronger.**
  Hsu & Lin (MLCAD 2022) and the corresponding patent US 12,475,291 report only
  **relative** reduction - the patent *"contains no minimum/maximum numeric
  specifications for acceptable metric values"*. Weave states it *"does not yet
  report the crossing, bend, or visual-similarity metrics"*. EEschematic scores
  aesthetics **subjectively, 5/10 to 9/10, by a human**, and names that as a
  limitation of its own work.

**The consequence that binds.** Inventing a crossing or bend threshold would put
this project **ahead of every published source while appearing to cite one** -
which is G67 clause 7's rubric failure one level down, and the exact shape the
governing invariant exists to prevent.

**The threshold-free form that is available, recorded as a CANDIDATE MECHANISM
and not as a decision.** The field measures these quantities relatively: compute
them for a netlist, record them, and require them not to get worse for that
netlist. `CLAUDE.md` already endorses the economics (*"Minimising a measurable
cost is not a taste judgement"*). **Nobody has decided this is the form**, and
an agent adopting it because it is the only form available would be choosing its
own grading.

**The trap beside the bait.** If absolute thresholds are wanted anyway they are
an owner decision, informed by measuring this repository's existing hand-drawn
Pultec schematics - and `CLAUDE.md` names the trap in that sentence: measuring
them and then treating them as the ceiling makes the as-built artifact the
criterion. **That measurement has not been performed.** The measurement would
inform the decision; it is not the decision.

**EXTENSION, 2026-10-19: the one project that shipped agent-generated schematics
never attempted a readability number either, and it is worth knowing that before
anyone goes looking for one.** This is a measurement that found nothing wrong,
recorded for that reason. The pedals schematic generator was searched three ways,
each of which could have turned up an attempt: all 278 session transcripts
(743 MB, streamed) for `readability score`, `legibility score`, `aesthetic
score`, `crossing count`, `count crossings`, `wire crossings`,
`minimise/minimize crossings`, `readability metric`, `score the layout`, `grade
the readability` - **two substantive hits, neither a scoring attempt**; a
non-test grep of the generator, where every occurrence of "crossing" is strictly
about electrical correctness (a label at the crossing of two wire interiors joins
both nets, so it is refused) and **never about counting crossings for looks**;
and all three revisions of its spec plus both third-party design reviews, none of
which proposes a metric. **Nobody tried to score readability and failed. It was
never attempted** - the reviewer who blocked the labels design proposed templates
plus a no-fallback rule plus an independent reading gate *instead of* a metric,
and that is what was built.

Read with the rest of this entry, that makes the threshold-free form above the
**only** form anybody has shipped, which strengthens it as a candidate and does
not turn it into a decision. The reading the history research offers - INFERRED
there, and recorded here as its reading rather than as a finding - is that
readability in that generator is a **criterion/mechanism split** of exactly the
kind `CLAUDE.md` insists on: the criterion is *"an independent reader can follow
this block from the drawing alone"*, which is a judgement and never a number, and
the mechanisms are templates and clearance refusals, which are machine-checkable
**because** they are not the criterion. A port that goes looking for the number
that means "legible" would be building something that project deliberately did
not build.

- **Found** 2026-10-19, by the standards research pass committed at `51f8362`,
  read in full by this writer. **The extension** was added the same day from §4
  and §10 (candidate 2) of `docs/schematic/schgen-development-history.md`
  (`8a4d8f7`), which is a different document by a different author - its evidence
  and verification status are stated separately below.
- **Evidence** §2.2, §4.2 and §7.3 of that document, with the Y14.15 clause
  quotations, the patent's own statement about numeric specifications, Weave's
  own sentence declining the metrics, and EEschematic's 5-10 subjective scale.
  **For the extension:** the three searches named above - the transcript keyword
  scan, the non-test grep of `tools/schgen`, and the three spec revisions plus
  both design reviews. **Unlike the rest of this entry, those ARE checks that
  could have failed**, and one of them nearly did: the scan returned two
  substantive hits and both had to be read and dismissed.
- **Verified** **no - RELAYED, by two separate hands.** The standards document's
  text was read by this writer at `51f8362`; everything in it was gathered by web
  fetch through a summarising tool, with nothing cloned, executed or rendered, and
  the document says so about itself. **A fetched web page is not a check that
  could have failed.** The extension is relayed one step further: the history
  research marks its three searches CONFIRMED and names them, but **this writer
  re-ran none of them**, and they are over another repository's tree and
  transcripts.
- **Why it is open** a threshold is an acceptance criterion for an artifact this
  repository's agents produce, so no producing agent may author one; and the
  honest alternative - that there is no threshold - is itself a decision about
  what gate 14 can contain.
- **What would settle it** **CRITERION:** no criterion in a schematic readability
  rubric carries a numeric crossing, bend or wire-length threshold unless a named
  source states it with a clause, or the owner states it as his own decision and
  it is recorded as his. **MECHANISM, untried:** adopt the relative form above -
  measure per netlist and require no regression - which needs no threshold and is
  what the field does; or put the absolute question to him with the as-built-
  ceiling trap stated. Nobody has been asked.

### G72 - "power at the top" could not be sourced to any electronics standard, and the clause that states it is about transmission buses

The convention whose authority the standards research most expected to find and
least did (`docs/schematic/readability-research.md` §2.5, §7.2).

**What says it, and why it is not what it looks like.** Y14.15 **15-6.3.6
Voltage Arrangement**: *"The arrangement of the diagram should preferably show
the higher voltages at top or left of the drawing and successively lower voltages
towards the bottom or right."* That clause sits inside **15-6 "Single-Line
Diagrams (Power Switchgear and Industrial Control)"** - "higher voltage" means a
transmission bus. Carrying it into an audio schematic as "+15 V at the top" is an
analogy, not a citation; it reaches the same arrangement, which is why it is
tempting.

**What does not say it.** There is no power-at-top / ground-at-bottom rule in
IEEE 315, and none in Y14.15's **electronics** clause 15-8 - not in 15-8.1
Layout, and not in 15-8.3 Circuit Return and Connection Symbols, which rules only
on *which* return symbol to use.

**The only source that definitely states it for electronics is a private company
document**, John Martin, *Clear Schematics*, Rev 04, 2017-02-08 - and it states
it about **symbol design** (*"power supplies on top pointing up, the grounds on
the bottom pointing down"*, i.e. where a part's power pins sit on its symbol),
which is a different claim from where a rail net sits on the sheet, and in KiCad
is a property of the library symbol rather than of anything an emitter controls.

Note also the coordinate direction, because getting this backwards is easy: in
`.kicad_sch`, **lower Y is TOP** (G80).

- **Found** 2026-10-19, by the standards research pass committed at `51f8362`,
  read in full by this writer.
- **Evidence** §2.5 and §7.2 of that document: the 15-6.3.6 quotation with its
  enclosing clause title, the absence across 15-8.1 and 15-8.3, and the Martin
  quotation with its date and publisher. The negative claim rests on a document
  whose full text the researcher read, not on a search.
- **Verified** **no - RELAYED**, on the same caveat as G71: the document was read
  by this writer at `51f8362`, and nothing in it was established by running
  anything.
- **Why it is open** a generator will otherwise implement this as though it were
  cited - and an agent that decided for itself that power goes at the top and
  then checked its own output against that decision would be authoring the
  criterion for the artifact it produced.
- **What would settle it** **CRITERION:** a clause from an in-force or withdrawn
  standard, in a section whose scope is electronics or general schematic diagrams,
  stating a vertical arrangement rule for supply rails and returns - or the owner
  stating it as a project convention, recorded as his decision and labelled as
  not a standard. **MECHANISM, untried and the researcher's guess:** read
  IPC-2612 **§6.5 Power and Ground** with Figure 6-2, and IEC 61082-1 **§7.4.5**
  with Figures 76-77. Both are unread and paywalled (G70), so the mechanism is
  blocked and the criterion is not.

### G82 - nobody with domain expertise ever looked at the drawings this program is about to inherit its templates from, and "acceptable" meant an agent reading PNG renders

**This is the provenance of the artifact, not a complaint about it.** The
schematic generator this program proposes to port produced drawings that were
accepted. The question a later reader cannot re-derive is **by whom**, and the
answer is: by another agent.

| what decided it | what that was |
| --- | --- |
| The gate | A subagent, denied the circuit description, the code, the IR and the design notes, given only the PDF and one section of a render report, instructed to convert every page to PNG at 300 dpi (900 dpi for spot checks) and crop region by region. *"A block that cannot be followed is a defect even if every machine check passes."* |
| The verdict | 103 blocks checked, 101 followable. **20 numbered defects, exactly 1 blocking.** Two passes, three fix rounds, by the same reviewer. |
| What shipped | **16 of the 19 first-pass cosmetic defects were knowingly not fixed**, each listed under *"Known cosmetic items, left as they are by the controller's ruling"* with its cost stated. Half-empty sheets, two different VSSA glyphs on one page, abutting power symbols, sideways supply arrows. |
| Who else looked | **No human.** Confirmed absent from the owner's 123 messages in the session; the spec itself recommends *"a paid human review … before first fab"* and the research found no evidence one happened. |

So **"acceptable" meant one blocking defect fixed and nineteen cosmetic ones
adjudicated by the producing side** - not "clean", and not "a person with
domain expertise read it". The one blocking defect is the reason the gate was
worth having at all: KiCad's do-not-populate cross ran along a Zener's sloping
sides and through its cathode bar, so *"even at 900 dpi the zener's orientation
(anode/cathode) cannot be read"* - on a page whose own note told the builder to
fit that part. A correct netlist, a passing ERC and eight green gates, and the
drawing still could not be built from.

**Why this is his to rule on and not an agent's.** `CLAUDE.md` forbids the
producing agent from authoring the acceptance criteria for its artifact, and an
agent reading renders is a legitimate criteria channel only while somebody other
than the producing side has said it is sufficient. **Nobody has said that here.**
A port that adopts the templates adopts this provenance with them, and the
question of whether a human legibility review is required before this repository
accepts a generated schematic - and if so, at what point, and whose - has never
been put to him.

- **Found** 2026-10-19, by this task, reading §5, §9 and §10 (candidate 3) of
  `docs/schematic/schgen-development-history.md`.
- **Evidence** that document's §5, sourced to the pedals repository's committed
  `h7-platform/boards/v1/VERIFICATION.md` (1295 lines, readability review from
  line 945) and to the reviewer's dispatch prompt recovered from
  `subagents/agent-a5ece5e34462a1b75.jsonl` line 1; the absence of human review
  is its §9, established against the owner's 123 messages in that session.
- **Verified** **no - RELAYED.** The history research read those primary sources
  and marks these claims CONFIRMED; **this writer read the research document, not
  the transcripts or `VERIFICATION.md`.** Both are in another repository
  (`/Users/orion/work/pedals-work/digital-pedal-platform`) and the transcripts
  are 743 MB.
- **Why it is open** it is a criteria decision, and the only person who may make
  it has not been asked. **Nobody asks him unprompted** - this entry exists so
  the question survives until it is naturally in front of him, which is when the
  program's acceptance gates are specified.
- **What would settle it** **CRITERION:** an owner ruling on whether an agent
  reading rendered pages is a sufficient legibility gate for a schematic this
  repository generates, or whether a human must read one, and at what point.
  Until he rules, no document here may describe the ported templates as
  human-validated - because they are not. **MECHANISM, untried:** put it to him
  alongside the related unestablished fact (§9: whether the pedals third-party
  design reviewer was a human or a model - *"Only the owner can settle it"*), so
  one question covers both channels rather than two separate asks.

---

Declined: the owner has ruled, and nobody asks again unprompted
---------------------------------------------------------------

An entry here is neither an open gap nor a deleted one. The owner has ruled on
it, but what it describes is still true - ground still prints `0`, two pages are
still nearly empty, removing the junction ground row still opens net `0` on
every adopted board - so the record stays, with his words, rather than being
deleted: it exists so a later agent neither re-opens the question nor asks him
again unprompted.

**A ruling here is not a licence to stop believing the measurement underneath
it.** G47 is the worked example: he declined the re-derivation, and the
electrical fact that made it risky is unaffected by his declining it. Read each
entry for which half was ruled on.

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
- **STILL ON THE PAGE (2026-10-17).** Verbatim from the regenerated packets:
  low-boost's junction rows read *"junction_grounds | 5-pin header | O1 0, P1
  0, Q1 0, R1 0, S1 0"* and *"junction_signals | 5-pin header | D1 IN, E1
  HI_BOOST_OUT, F1 LO_BOOST_IN, G1 OUT, H1 0"*, and the layout images print `0`
  beside six of the board's left-hand edge pins. `pultec-low-cut` prints the
  same.
- **Declined** - 2026-10-18. The owner was put four recommendations about the
  printed build guide at once and accepted all four without commenting on
  ground specifically, replying verbatim: *"your recommendations. I don’t care
  about the sparse pdfs. leave that alone"*. The recommendation he was
  accepting, verbatim: *"**2. The junction row prints ground as `0`.** It reads
  `junction_grounds | 5-pin header | O1 0, P1 0, Q1 0, R1 0, S1 0`. `0` is the
  SPICE convention and genuinely what the circuit model calls it; your hand
  layout prints the same. If you don't care: I'd leave it. It's correct, it's
  consistent with everything else, and "GND" would be the guide inventing a
  vocabulary the model doesn't use."* The decision is by acceptance of that
  recommendation, not by any sentence of his naming ground.

### G48 - two of the printed guide's seven pages are nearly empty, because every image takes a page whether or not it fills one

`boards/pultec-low-boost/guide/guide.pdf` is seven US Letter pages. Page 1
carries the header and the no-schematic notice and is then blank for roughly
its lower half. Page 7 carries one checklist row (`Cut 4`) and the one-line
"this board declares no power-up checks" statement, and is otherwise blank.
`pultec-low-cut` prints the same seven-page shape. So an operator prints seven
sheets to get about five sheets of content.

The cause is in `tools/guide/guide.ts`'s print CSS, not in the conversion: each
layout figure is `page-break-inside: avoid` inside a `.page` that is
`page-break-before: always`, and the checklist simply flows. That is a
deliberate rule - an image split across a fold is unusable on a bench - and the
blank space is its cost, not a bug in it.

- **Found** the change that made `guide.pdf` part of the build system
  (2026-10-17).
- **Evidence** both PDFs generated by `make -C boards/<board> guide` and read
  page by page; seven `/Type /Page` objects each, all `MediaBox [0 0 612 792]`.
- **Verified** yes - read directly from the generated PDFs, not from the HTML.
- **Declined** - 2026-10-18, in his own words - a direct instruction about this
  item, verbatim: *"I don’t care about the sparse pdfs. leave that alone"*.
  The recommendation he was accepting, verbatim: *"**4. Two of seven pages are
  nearly empty**, because every layout figure takes a full page so no image is
  ever split across a break. If you don't care: I'd leave it. Paper is cheap
  and an image split across a page break at the bench is genuinely annoying."*

### G47 - removing the junction ground row OPENS GROUND on every adopted board, and the owner's instruction invites someone to remove it

The owner, 2026-10-17, on the junction's ground row - five pins all on net `0`,
interleaved beside the signal row so a ribbon cable's return path is guided:

> *"on the perfboard, we aren't using ribbon cables, so we don't need to place
> that row of ground conductors"*

**That is right about the ribbon and it must not be acted on as a layout edit,
because the committed boards depend on those pins for continuity.** Measured by
removing the row and re-checking: `--check <committed vrt> --netlist <no-ground-
row netlist>` **exits 1 on every adopted board and reports `0 incomplete`** -
net `0`, ground, goes OPEN on each. The committed layouts make ground whole
THROUGH those five pins and the bridges tying them together; the signal row's
own `0` pin is not the path that carries it.

So the row is redundant on the SCHEMATIC and load-bearing in the LAYOUT. An
agent reading his instruction and deleting the component would break five
committed, owner-approved boards electrically, and `make check` on each would
not be what catches it first.

**Two further measurements from the same probe, recorded because they are the
evidence any future decision rests on:**

- **It does not fix the sections that could not be built.** `low-cut` still
  refuses `stripboard-seed-no-column-to-join` on net `0`, across strips 5 and 16
  rather than 5 and 6 - a WIDER span - and `hi-cut`'s refusal names a selector
  net and is unchanged. The row was never what blocked them. (Both were later
  built by other orderings; see G33's settlement.)
- **It would make two boards strictly cheaper.** Without the row, `hi-boost`
  comes out at **0 cuts / 0 wires / 0 bridges**, kappa 0, extent 340 against
  425; `mid` at 1 cut / 1 wire / 0 bridges against 1/2/4. That is a real gain
  and a real reason someone will want to do this.
- **And one unexplained refusal.** Under the no-ground arm, `low-boost`'s seed 3
  refused inside `--materialize` where it passes today, with a fork
  copper-conflict refusal. Not diagnosed; recorded so a future attempt is not
  surprised by it.

- **Found** `2026-10-17`, by a probe the controller ran specifically to test the
  owner's instruction before acting on it.
- **Evidence** the probe's own arms, run against all five sections, with the
  working tree verified clean afterwards.
- **Verified** yes - run, not relayed. **The controller then failed to record
  any of it**, reporting the results in conversation only, until asked directly
  whether the findings were in this file. That is the failure this file exists
  to prevent, committed by the file's own author.
- **DECLINED 2026-10-18, and only one half of this entry is declined.** The
  owner was asked the narrow question this entry was holding open - whether a
  zero-cut `hi-boost` is worth re-approving two boards he has already signed
  off - and ruled, verbatim: *"Leave the approved boards alone for bow"*
  (*"bow"* is evidently *"now"*; the word is quoted as typed because this
  file's standard is his words and not a tidied reading of them). So the
  re-derivation is not to be attempted, and **nobody raises it with him again
  unprompted.**
- **WHAT IS DECLINED IS THE RE-DERIVATION. THE MEASUREMENT IS NOT A PREFERENCE
  AND DOES NOT EXPIRE WITH IT.** Removing the ground row opens net `0` on every
  adopted board; that is an electrical fact about those layouts, it was
  established by running `--check`, and it binds whoever revisits this whether
  or not the owner's ruling is still current. An agent that reads the
  declination as "this entry is settled, the row is optional" has inverted it.
  **The row stays on all five boards, and the reason it stays is continuity,
  not his instruction.**
- **Why this entry is kept rather than deleted** what it records is still true
  of the boards, and the register's own rule is that a declination moves here
  with his words rather than leaving - *"a question he declined is not a closed
  question, but nobody asks him again unprompted"* (`CLAUDE.md`). The two
  further measurements above - that the row never blocked the two hard
  sections, and the undiagnosed `low-boost` seed-3 refusal under the no-ground
  arm - are the evidence any future attempt starts from, and they would have
  gone with a deletion.
- **What remains open elsewhere, and it is not this** the ground row's
  appearance on a BENCH SHEET is G44's: the sheet should not explain a ribbon
  cable's return path to somebody soldering wires. **That is a wording and
  vocabulary question, now fully separated from the layout question this entry
  closes** - the row's presence is settled, what a sheet says about it is not.

### G59 - the stand-in-groups image's four hatch fills are RATIFIED, and the two diagonals were measured as separating on a deliberate look rather than at a glance

**RULED 2026-10-18.** He read page 5 of
`boards/pultec-low-boost/guide/guide.pdf` and said, verbatim:

> *"the hatching looks good."*

**He was told the weakness before he ruled, and that disclosure is why this
entry stays rather than being deleted.** What was put to him: that the two
diagonals **do not separate at a glance at printed size** - `/` is the first
group's fill and `\` the second's, hi-boost and hi-cut on both low boards, and
both read as striped grey from arm's length, so which way the lines lean is
legible on a deliberate look and not before; that **the worst case is a part
standing on end**, whose white body covers the middle of its patch and leaves
only a margin of hatch carrying two or three lines; and that the lattice and
the stipple had to be coarsened to their present spacings after a first attempt
at which both merged. **He accepted the fills with all of that known.** So the
four geometries are settled, nobody asks him again unprompted, and the
measurement below is still true of the artifact he approved.

**What is hatched, which was never the open half.** A group's members come from
the board's own `ScaffoldDoc`; the mark is per part, never a region drawn around
a cluster, because a group's parts are not guaranteed contiguous and an
own-circuit part can sit between two of them. The legend names each group and
states what an UNHATCHED part is. None of that depends on the fills.

**MEASURED AT PRINTED SCALE, 2026-10-18**, by rendering
`boards/pultec-low-boost/guide/guide.pdf` and `boards/pultec-low-cut/guide/guide.pdf`
page 5 at 150 dpi and reading the page at 1:1, plus a photocopy simulation
(greyscale, thresholded to bilevel, resampled to ~100 dpi). **This is what he
ruled on:**

- **The lattice and the stipple were the hard pair, not the two diagonals.** At
  the first spacings tried (crosshatch at 7 units, stipple at 6) both read as
  one uniform fine grey at print size, and on BOTH low boards those two groups
  sit adjacent - `low-cut` beside `mid` on low-boost, `low-boost` beside `mid`
  on low-cut - so the two clusters merged into a single textured area. They
  were coarsened (crosshatch 9 units / 1.2 wide, stipple 8 units / 1.8 radius)
  and separate clearly at 1:1 after that.
- **The two diagonals separate on a deliberate look, not at a glance.** `/` and
  `\` both read as "striped" from arm's length; which way they lean is legible
  when looked at, and more legible after the lines were coarsened to 6 units at
  1.3 wide. **The thin case is the worst case**: a standing resistor's body
  covers the middle of its patch, so only a margin of hatch shows, and that
  margin carries two or three lines.
- **All four survive the photocopy simulation** as geometry - diagonals as
  diagonals, lattice as a lattice, dots as dots - which is the constraint that
  ruled out four grey tints in the first place.
- **The legend's swatches are distinguishable from each other** at print size,
  including the empty one.
- **A hatch patch reads as a mid-grey area, and the layout already uses grey**
  for every fourth strip. On a dense board the two greys compete; nothing was
  changed for it.
- **No patch reached over a part it does not belong to, on any of the five
  Pultec boards**, at the patch size shipped (`HATCH_PAD`, half a hole pitch
  plus a twentieth). That is enforced rather than observed: `drawClusters`
  refuses a patch overlapping another part's body or a landing pad's ring, so
  all five `make guide` runs passing is the measurement.
- **TWO PATCHES OF DIFFERENT GROUPS MAY STILL OVERLAP EACH OTHER - NOTHING
  GUARDS THAT**, and on both low boards the lattice and stipple groups' patches
  abut. The guard above does not cover it because an overlap of two hatches
  misidentifies no part, which is what the guard exists for. **Nobody has ruled
  on whether two abutting group patches are acceptable on the page**; he was
  shown the page that contains them and ruled the hatching good, which is the
  nearest thing to an answer and is not the question.

- **Found** 2026-10-18, implementing Task 6 of
  `docs/superpowers/plans/2026-10-18-the-packet-shows-the-clusters.md`, by
  reading the printed PDF page rather than the SVG.
- **Evidence** the regenerated pages above, read at 1:1 and in the bilevel
  simulation by the agent that made the change; and, for the mapping the fills
  carry, `tests/guide/clusters-view.test.ts`, which is a check that could fail -
  it matches every patch against the board's `ScaffoldDoc` and against the
  checklist's `Fit` column in both directions on two real boards.
- **Verified** the measurements, yes, by the agent that made the change, read
  directly and not relayed. **The ruling** was relayed to the writer of this
  revision by the controller, in the words quoted above.
- **DECLINED - OR RATHER RATIFIED - 2026-10-18, and only one half of this entry
  is settled by it.** The CHOICE of fills is his and is now made.
  **The measurement is not a preference and does not expire with it.** The two
  diagonals still separate only on a deliberate look, and a later reader who
  notices that, assumes nobody checked at printed size, and either re-opens the
  question with him or quietly "fixes" it has overturned a decision made with
  the evidence in hand. `tools/guide/hatch.ts` carries the same disclosure in
  its module comment, which is where somebody would be standing when they
  reached for the change.
- **Why this entry is kept rather than deleted** the register's own rule is that
  a settled question leaves and a ruling whose subject is still true of the
  artifact stays here with his words (G47 is the worked example). What is still
  true of the artifact is the weak diagonal pair, the two greys competing, and
  the unguarded cross-group overlap - none of which a deletion would have taken
  anywhere, since nothing else in a committed file records the photocopy result
  or the grey competition.
- **What would re-open it** only him. A change to `HATCH_STYLES` - its entries,
  their order, or their spacings and widths - is a change to the artifact he
  approved and needs a fresh ruling, not an agent's judgement. Everything else
  about the image is independent of what an entry draws, which is what makes
  that a one-file change if he ever asks for one.

### G62 - the packet grew from seven printed pages to eleven, and the controller costed only one of the four when it asked him

**MEASURED 2026-10-18, by counting the pages of the regenerated PDFs**:
`pultec-low-boost`, `pultec-low-cut`, `pultec-hi-boost` and `pultec-hi-cut`
print **11 pages** each and `pultec-mid` prints **12**, against the **seven**
G48 above measures for the two low boards before this plan.

**Where the four pages went, read page by page off
`boards/pultec-low-boost/guide/guide.pdf`:**

| page | what is on it |
| --- | --- |
| 1 | title, provenance, the no-schematic notice |
| 2-5 | the four layout images - designators, values, copper side, **stand-in groups (new)** |
| 6-8 | the **Stand-in groups** section (new): its prose and group blocks on 6-7, the 16-row *What to populate, by build* table on 8 |
| 9-11 | the build checklist and the power-up-checks notice |

So **one page is the fourth image and three are the stand-in groups section**,
and the checklist still occupies three pages - the `Fit` column widened its
tables without costing a page. `pultec-mid`'s twelfth page is its own and is
not this change: its checklist runs to four pages because the board has 72
table rows against low-boost's 46.

**CORRECTED 2026-10-19: THE MEASUREMENT ABOVE COVERS FIVE OF THE ELEVEN
BOARDS, AND THE OTHER SIX ALSO PAID.** The six boards that declare no
`SCAFFOLD` - `pt2399-core` and the five transistor-preamp boards - each gained
the **Stand-in groups** heading and its one sentence (*"This board holds no
stand-in groups: ... Fit everything the checklist lists."*), and
`tools/guide/guide.ts` wrapped that sentence in the same `class="page"` the
groups arm uses, so it opened a sheet of its own. This entry said nothing about
those boards, so the register understated the change's paper cost by up to six
pages while reading as the whole measurement.

**THE WRAPPER IS NOW CONDITIONAL AND THE SENTENCE IS INLINE** - the spec asked
for one sentence on the `NO_FOOTPRINT` precedent, which is a line rather than a
sheet, and a sheet is a decision about the artifact that no rule file, spec or
reviewer took. **Nor has anyone ruled on the inline rendering**, which is the
spec's own shape rather than an owner decision - the same unratified standing as
G58's mark shape, G60's wire-links placement and G61's `Fit` column, and
recorded here for the same reason. Measured by regenerating the packets with
`make guide` and counting `pdfinfo` pages, before and after that one change:

| board | with the wrapper | inline (now) |
| --- | --- | --- |
| `transistor-preamp-buffered` | 6 | **5** |
| `transistor-preamp-feedback` | 7 | **6** |
| `transistor-preamp-loop` | 8 | **8** |
| `transistor-preamp-staged` | 7 | **6** |
| `pt2399-core` | no packet (G49) | no packet (G49) |
| `transistor-preamp-lab` | no packet | no packet |

**Three of the four got the sheet back; `transistor-preamp-loop` did not, and
the reason is worth having.** On that board the sentence does not fit under the
copper-side image, so its last word - *"lists."* - spills onto a page of its
own, and page 4 of its packet now carries that word and nothing else. The
sentence is inline in the markup and still costs a sheet there, so for loop
this change is page-neutral rather than a saving. That is G48's shape (*"every
image takes a page whether or not it fills one"*), not a new cause.

**WHAT THESE FOUR PRINTED BEFORE THIS BRANCH IS NOT MEASURED HERE.** The
`Fit` column also widened their checklist tables, so the pre-branch figure is
not recoverable by reasoning from the two columns above, and nobody regenerated
a pre-branch tree. The numbers above are this branch with and without the one
wrapper.

**WHY TWO BOARDS HAVE NO FIGURE.** `pt2399-core` cannot be rendered at all -
`no drawing for VeroRoute part type "DIP16"`, which is G49 and predates this
plan. `boards/transistor-preamp-lab` refuses earlier still: its committed
layout has 19 strips joining two different nets across unpainted holes, so
`make guide` stops at the buildability check rather than printing. Both are
pre-existing and neither is this change; they are named so a later reader
counting pages across the repository does not read two missing rows as an
omission in this measurement.

**WHAT HE WAS ASKED, AND IT UNDERSTATED THE CHANGE BY THREE PAGES.** He was
asked about the image's page only, and answered *"eighth page is fine"* - asked
explicitly because his G48 declination was about page COUNT rather than a
blanket yes to more pages. The spec names the image's page as the cost
(*"the packet goes from seven pages to eight"*) and says nothing about the cost
of the **Stand-in groups** section, **although the same spec specifies that
section, its group blocks and its 16 build rows.** **That is a controller
error, not a surprise in the implementation**: the pages were specified and not
costed, and he answered the question he was put rather than the one the change
raised.

- **Found** 2026-10-18, Task 7 of
  `docs/superpowers/plans/2026-10-18-the-packet-shows-the-clusters.md`, by
  counting the pages rather than taking the number from a report.
- **Evidence** `/Type /Page` objects and `MediaBox` entries in each regenerated
  `guide.pdf` - 11, 11, 11, 11, 12 - agreeing with each page tree's own
  `/Count`; the per-page `pdftotext` extraction the table above is read from;
  G48 for the seven-page measurement that precedes this plan; the spec's
  "Cost, stated because it interacts with a ruling he has already made"
  paragraph for what was asked.
- **Verified** yes - counted and extracted by the writer, in a clean tree, on
  regenerated artifacts. The seven-page figure is G48's measurement rather than
  this writer's.
- **The 2026-10-19 correction** found by the final whole-branch review, which
  read the shared `class="page"` wrapper in `tools/guide/guide.ts` and said
  plainly that the page consequence was an inference from that CSS and not a
  measurement. **The figures in the table above are the measurement that was
  missing**, run by the writer of the correction: `make guide` in each of the
  six boards' directories, `pdfinfo` for the page count and per-page
  `pdftotext` for where the sentence lands, with the wrapper and without it.
  Two of the six refuse to print and are recorded as such rather than left
  blank.
- **DECLINED - 2026-10-18, in his own words.** Told that the packet is eleven
  pages rather than the eight he approved, and that the controller had failed to
  cost the extra pages when asking him, he replied verbatim: *"I dont care about
  the number of pages in the pdf right now"* - quoted as typed: *"dont"* is his,
  and he typed no full stop. **Nobody raises the page count with him again
  unprompted.**
- **THE QUALIFIER *"right now"* IS LOAD-BEARING.** This is a provisional setting
  aside, the same shape as *"Leave the approved boards alone for bow"* on G47 -
  he has put the question down, not answered it. An agent that reads this as
  "page count is settled, the packet may grow freely" has inverted it: what he
  declined to care about is **eleven pages today**, and a packet that grows
  again is a new fact rather than this one.
- **The measurement does not expire with the declination** (this section's
  preamble). The packet is eleven pages, four more than before this plan, three
  of them never put to him - and, per the 2026-10-19 correction above, the six
  boards that are not Pultec sections were never costed to him at all. **He is
  not asked again**: the correction is to this entry's measurement, not a reason
  to re-open a question he has put down.
- **What would settle it, if he returns to it** nothing is required of anyone
  now. The trimmable page is the 16-row *What to populate, by build* table on
  page 8, which the spec argues for carrying whole - *"He may change what is on
  the bench while building, and a packet carrying one build's row would be wrong
  rather than incomplete the moment he does"* - so trimming it is a decision
  with a reason already standing against it. Moving the whole **Stand-in groups** section back
  to the board's `wiring.md`, which already carries the same table, is the other
  option and **would re-create G45** - which is why it is named here as an
  option rather than offered as a remedy.

---

Open: a fix would settle these
------------------------------

### G104 - gate 8's deferral was argued from the output it was supposed to grade, and THIS ENTRY MADE THAT ARGUMENT. The gate's empty-delta half is M1 work and always was

> **REWRITTEN 2026-10-19, THE DAY AFTER IT WAS WRITTEN, BECAUSE A SECOND
> INDEPENDENT REVIEW OVERTURNED IT.** The entry is rewritten rather than deleted:
> it is not resolved, and **what it recorded was wrong in a way a later reader
> needs to see**, because the wrong form is persuasive.
>
> **WHAT THIS ENTRY SAID, verbatim from its own "Why it is open":** *"the gate
> needs a reference and a declared-delta list. The reference exists ... **The
> delta list does not, and it cannot be written before the generator exists**:
> enumerating how a generated schematic is supposed to differ from a hand-drawn
> one, before seeing what the generator produces, is guessing. **The deferral is
> a sequencing fact, not a scope cut.**"* Its suggested mechanism went further:
> *"author the delta list from M1's parity census, **which is the first artifact
> that shows what the differences actually are**."*
>
> **WHY THAT WAS WRONG.** The review:
>
> > *"Waiting until generated schematics exist to enumerate their differences
> > creates precisely the provenance risk gate 8 is supposed to prevent: a
> > generator defect could be retrospectively classified as an intended
> > change."*
>
> **THE INVARIANT IT BREACHED is `CLAUDE.md`'s, and it is this register's own
> subject matter: an agent authoring the acceptance criteria for the artifact it
> produces.** A delta list written from the parity census is a list of
> differences chosen by the thing being graded. Every undeclared difference
> would have been declarable after the fact, and the gate whose whole value is
> that *"an undeclared difference fails by construction"* would have had nothing
> left to fail on. **The entry's mechanism named the breach out loud** - *"the
> first artifact that shows what the differences actually are"* - and the
> sequencing argument around it made that sound like diligence.
>
> **This is the second time a sequencing argument has hidden a criteria breach in
> this program**, which is why the wording is kept: `CLAUDE.md` warns that the
> failure arrives *"wearing a measurement's clothes"*, and this one wore a
> schedule's.

**THE CORRECTED POSITION: an electrical delta is derived from the
TRANSFORMATION, not discovered from the output.** For the Pultec the deltas are
already defined upstream of any drawing - `circuits/pultec/partition.ts` removes
the other sections, inserts stand-ins and introduces the junction connections -
and **those are logical transformations, expressible independently of how
anything is drawn.** The delta list is a statement about the partition.

**So the gate splits, and the M1 half needs no list at all:**

| | M1 | M2 |
| --- | --- | --- |
| what runs | the comparison, on circuits that require **no electrical change** | the same comparison on a generated Pultec section |
| the permitted delta | **EMPTY** - a circuit rendered from its own model should differ from its own reference in nothing | the manifest, **derived mechanically from the partition** |
| why it is available then | **an empty list needs no generator to write it** | the partition exists already |

`circuits/pt2399-core/pt2399-core.kicad_sch` and
`circuits/transistor-preamp/lab-board.kicad_sch` are hand-arranged, known good,
and **neither is partitioned, carries a stand-in, or gets a junction header** -
so the empty delta is correct for them rather than convenient.

**AND THE RULE THAT REPLACES THE WITHDRAWN ARGUMENT: a list of permitted
electrical changes is NEVER inferred from a generated schematic.** A delta is
admitted because a declared transformation produces it, named with that
transformation. **A difference found by looking at output is a defect report
until some declared transformation accounts for it** - never a new list entry.

**The parent spec says `gates/oscar/` ports**, and the first version of this
entry existed because an earlier revision of the child spec's derivation-chain
table omitted the gate and called the round trip *"the only new check"*,
**silently dropping a strictly stronger check.** That part stands.

**What the gate is**, from `tools/schgen/gates/oscar/compare.ts` in the pedals
tree, read directly:

> *"Gate 8: a carried-over subcircuit equals OSCAR's once the declared CORE-BRIEF
> deltas are applied to OSCAR's graph. **An undeclared difference fails by
> construction.**"*

Every intended difference between the generated circuit and a reference design is
written down in advance, with a reason, in a `CORE-BRIEF.md`. The comparison
applies those declared edits to the reference and **anything left over is a
defect.** `boundary.ts` carries the per-subcircuit map of which reference parts
each side covers.

**Why that is worth more than it looks.** You cannot accidentally change a
circuit and pass, **because passing requires having stated beforehand what you
meant to change.** It is the acceptance-criteria invariant applied to a netlist:
the criterion is authored before the artifact and by someone describing intent,
not by the thing being graded.

**What the round trip cannot catch and this can.** The round trip proves a
generated schematic matches **the netlist it was generated from** - self
consistency. Gate 8 proves it matches **a drawing a human made and trusts.** **A
generator that mangles a circuit the same way at both ends passes the round trip
happily.** Different failures; neither substitutes for the other.

- **Found** 2026-10-19, when the M1 plan deferred the gate and the controller
  checked why. The omission from the child spec's table predates that by hours.
  **The deferral's reasoning was overturned the next day by a second independent
  third-party review of the child spec**, recorded as that document's
  Revision 4, finding 17.
- **Evidence** `gates/oscar/compare.ts` and `boundary.ts` headers, read directly
  in the pedals tree; the child spec's own table, which listed four links and
  called the round trip the only new check. **For the overturn:** this entry's own
  previous text, quoted above, against `CLAUDE.md`'s invariant and the review's
  sentence - **a check that could have failed and did: the mechanism this entry
  proposed names the parity census as the source of the delta list, which is the
  producing pipeline's own output.**
- **Verified** CONFIRMED - the controller read both gate modules and both spec
  passages, and **confirmed the overturn by reading this entry's own withdrawn
  wording** rather than relaying the review's characterisation of it.
- **Why it is open** the gate is **not yet ported.** What was blocking it is now
  one thing rather than two: **`graphFromNetlist` is written against pedals'
  `connectivityFromXml`/`componentsFromXml` XML readers**, which the M1 plan's
  Task 11 replaces with `importNetlist` for gate 3 and Task 18 must replace again
  here. **That was never a reason to defer the gate - it is work.** The
  Pultec-specific manifest remains M2 for a reason that is not a sequencing
  argument: **M1 emits no Pultec section schematic at all**, so a manifest
  describing that artifact's deltas would be written against nothing.
- **What would settle it** **CRITERION: a generated schematic for at least one
  circuit with a hand-arranged reference is compared against that reference by
  graph isomorphism - by value and pin-level adjacency, independent of references
  and net names - with every permitted difference declared in advance and an
  undeclared difference failing.** **AND A SECOND CRITERION THE FIRST ONE DID NOT
  PROTECT: no permitted difference is admitted that was not derived from a
  declared transformation.** **MECHANISM, and the previous one is recorded as
  measured-wrong rather than replaced quietly:** the withdrawn mechanism was
  *"author the delta list from M1's parity census"*, which breaches the second
  criterion by construction. The M1 plan's Task 18 instead ports the comparison
  and runs it with an **empty** permitted delta on the two references above, and
  gives `DeclaredDelta` a mandatory `from` field naming the transformation, so
  the M2 shape cannot be populated without one.

### G94 - ELK throws on a unity-gain op-amp self-loop with horizontally drawn passives on its net - and the "lateral" half of the first narrowing is contradicted at block scale

`[RAN]` elkjs **0.7.1 and 0.9.3** both raise

```
java.lang.IllegalStateException: Invalid hitboxes for scanline constraint calculation.
```

on `circuits/opamp-buffer.ts` - **the simplest circuit this repository owns** -
when `output_coupling_cap` is drawn horizontally. 3 runs of 3.

**Narrowed twice.** An exhaustive sweep of all 32 orientation assignments of that
circuit's five passives: **9 of 32 fail**, smallest failing set **one component**,
which is a **one-character change** to the layout input. A hypothesis test then
isolated two conditions that are **both necessary**: the op-amp's **output and
inverting input on one net** (the unity-gain self-loop) **and** a
**horizontally-drawn lateral hanging off that same net**. Removing either lays
out cleanly.

**A unity-gain buffer is among the most common analog idioms there is.**

**AMENDED 2026-10-19 by the second spike, and the amendment contradicts half of
the paragraph above.** `[RAN]` `docs/schematic/elk-block-spike.md` §5 reproduced
the identical exception on `oc-audio`, a **12-part declared `include()` block**
of `circuits/optical-compressor/` whose `circuits/optical-compressor/parts/audio-path.ts`
declares this entry's exact recipe, and swept all **2^8 = 256** orientation
assignments of its eight passives: **45 fail**, smallest failing set **two
components**.

| arm, on `oc-audio` | result |
| --- | --- |
| break the op-amp self-loop, leave everything else | **0 of 256 fail** |
| remove the lateral off the self-loop net, keep the loop | **32 of 128 STILL FAIL** |
| remove the lateral AND break the rheostat strap on `gain_terminal` | **31 of 128 still fail** |

**So the self-loop is necessary and the lateral is NOT.** *"Removing either lays
out cleanly"* above holds for the self-loop half and fails for the lateral half:
delete `attenuator_series_resistor` and a different horizontal passive takes its
place.

**WHAT IS NOT SETTLED, AND THIS ENTRY DOES NOT RESOLVE IT.** The first
narrowing was done on `opamp-buffer`; this one on `oc-audio`. **Whether the
block-scale result CORRECTS this entry or is a SECOND SUFFICIENT CONDITION in a
different circuit cannot be decided from either measurement**, and the spike
says so in terms. What both agree on: **breaking the self-loop lays out
cleanly** - a single test on `opamp-buffer`, and **all 256 assignments on
`oc-audio`**, which is the stronger of the two arms.

**AND THE PARENTS ARE WORSE THAN THEIR BLOCKS.** `[RAN]`

| | h-rails | v-bare | v-rails | self-loop cells |
| --- | --- | --- | --- | --- |
| `WHOLE-optical-compressor`, 37 parts | **REFUSED** | ok | ok | 3 |
| its three declared blocks | 1 of 3 refused | 3 of 3 ok | 3 of 3 ok | |
| `WHOLE-pultec-three-band`, 76 parts | ok | **REFUSED** | **REFUSED** | 4 |
| its five declared sections | 5 of 5 ok | 5 of 5 ok | 5 of 5 ok | |

**`THREE_BAND_REFERENCE` refuses under BOTH vertical policies, including the
default, while every one of its five declared sections lays out.** Its four
self-loop cells are the strapped wipers of `RV_LO_CUT`, `RV_LO_BOOST`,
`RV_HI_Q` and `RV_MID`. **That strap is deliberate and declared, which is why
this shape is not rare here**: `[CODE]` `circuits/pultec/electrical/three-band.ts`
declares it at each pot - *"the wiper is tied to the cw end, so only the
ccw-wiper section carries current and the pot reads as a variable resistor"* -
and `circuits/transistor-preamp/parts.ts` states the same strap as a convention
across both preamp boards with its reason: *"every leg fails to its MAXIMUM
resistance - never open, never zero."* **A rule that refuses an op-amp or pot
self-loop refuses house style.** `pultec-mid` carries one of the four on its own
and lays out.

`[RAN]` **A single-flip sweep over all 18 blocks - 108 flips, one passive each -
produced ZERO failures**, which is the block-scale analogue of the 69-flip
result below. **The crash needs at least two horizontal passives.**

**It is ELK and not a wrapper artifact.** The pre-layout graph was extracted and
run through each build directly, with layout options read out of the skin rather
than retyped; both versions produce the identical exception, and both lay out the
working graph to identical geometry.

`[RAN]` **Scope: a single-flip sweep over the other four circuits - 69 flips -
produced zero failures.** Specific, not common, and reachable from an ordinary
idiom.

- **Found** `docs/schematic/elk-spike.md` §4, 2026-10-19. **Amended from**
  `docs/schematic/elk-block-spike.md` §5, the
  same day.
- **Evidence** the 32-subset sweep, the two-condition test, and the direct
  two-version run. A check that could have failed: 23 of 32 assignments succeed.
  For the amendment: the 256-subset sweep and the three-arm narrowing on
  `oc-audio`, the 2x3x3 parent runs, and the 108-flip sweep - each with a
  passing arm (0 of 256 after breaking the self-loop; 5 of 5 sections laying
  out) that could have come back the other way.
- **Verified** RELAYED, both halves - the writer read both spikes' measurements
  and re-executed neither. **One exception, CONFIRMED by the writer:** the two
  strap declarations quoted above were read in `circuits/pultec/electrical/three-band.ts`
  and `circuits/transistor-preamp/parts.ts` directly.
- **Why it is open** it is a defect in a dependency the design proposes to adopt,
  and **the design has no value for the outcome it produces.**
- **What would settle it** **CRITERION: a generator must have a defined outcome
  when its layout backend throws.** The spec's §1.3 selector is three-valued -
  `not-applicable`, `applicable`, `generation-failed` - and **a block that reaches
  ELK and makes ELK throw is a further outcome it does not name.** Spec §5.3
  sharpens where that lands: `RealiseResult` is **two-valued** in the source,
  with 30 `mismatch(...)` call sites funnelling into one `ok: false`, so a
  `realise` that RAISES is outside that type entirely. Separately, whether
  §1.5's orientation rule library can be required never to emit this shape.
- **MECHANISM, and the first one is now MEASURED WRONG.** This entry suggested
  *"constraining laterals on a self-loop net to vertical"*. **On `oc-audio` that
  leaves 32 of 128 assignments still failing**, so a rule library built to it
  would ship a non-fix. The criterion above is what binds. **Untested
  replacement:** constrain the self-loop itself, which is the only arm that
  cleared a whole sweep - and it is untested as a RULE, because a strapped pot
  wiper is a deliberate convention here and a rule that refuses it refuses house
  style.

### G95 - ELK's output is a function of input cell ORDER, so a drawing is not a stable property of a circuit

`[RAN]` Three random shuffles of the same netlist - same components, same nets,
same partition - produce **three distinct drawings out of three, on 4 of 4
circuits**, none matching declaration order:

| circuit | distinct outputs | inter-net crossings across four orders |
| --- | --- | --- |
| `opamp-buffer` | **3** | 32, 38, 23, 27 |
| `pultec-low-boost` | **3** | 73, 48, **139**, 61 |
| `pt2399-core` | **3** | 195, 290, 203, 276 |
| `transistor-preamp-lab` | **3** | 139, 56, 136, 140 |

**Reordering the `.capacitor(...)` calls in a circuit file would change every
generated schematic**, and move its measured quality by up to a factor of three
without changing the circuit. Aspect moves with it.

**Determinism for a FIXED input still holds** - 14 of 14 inputs gave one distinct
output over three runs, and an earlier session's probe regenerated byte-identical.
The two facts are compatible and must not be confused: **the serialization is
deterministic; the circuit is not.**

**REFINED 2026-10-19 at block scale, and the refinement is the actionable part.**
`[RAN]` `docs/schematic/elk-block-spike.md`
§2.1 re-ran the same shuffle on declared blocks:

| | cells | inter-net crossings over four orders | distinct drawings |
| --- | --- | --- | --- |
| `leg-upper` | 3 | 0, 0, 0, 0 | 3 |
| `standin-hi-cut` | 4 | 0, 0, 0, 0 | 3 |
| `oc-power` | 8 | 0, 0, 0, 0 | 4 |
| `pultec-low-boost` | 9 | 5, 5, 5, 5 | 4 |
| `oc-audio` | 13 | 28, 26, 22, 29 | 4 |
| `pultec-hi-boost` | 17 | 14, 29, 21, 14 | 4 |
| `pultec-mid` | 28 | 37, 20, 20, 25 | 4 |
| `WHOLE-optical-compressor` | 39 | 293, 204, 308, 337 | 4 |

**The DRAWING still changes with every reordering at every size** - the hash
criterion below is untouched by this and still binds. **What changes is whether
the MEASURE moves with it:** invariant at and below 9 cells, moving by up to
2.1x from 13 cells up. **Below about 9 parts a block's measured quality is a
property of the block; above it, it is partly a property of the order somebody
typed the components in.** G101 is the design consequence.

- **Found** `docs/schematic/elk-spike.md` §1.1. New - in no earlier pass.
  **Refined from** `docs/schematic/elk-block-spike.md` §2.1.
- **Evidence** md5 comparison plus re-measurement of each shuffle. At block
  scale, the same comparison over 18 blocks - a check that could have failed in
  either direction and reported invariance on 4 of 9 rows.
- **Verified** RELAYED, both halves.
- **Why it is open** it falsifies an assumption two settled design elements rest
  on, and neither has been adjusted.
- **What would settle it** **CRITERION: the generation manifest hashes the exact
  serialized input handed to the layout engine, not the section `Network`'s
  content** - a content hash would not detect the change that moved the drawing.
  And **a readability baseline must be scoped to that same serialization**, or it
  compares numbers that are not properties of the circuit. **Block scale adds a
  second, independent criterion rather than replacing that one: a baseline over
  blocks small enough that the measure does not move under reordering is a
  baseline about the circuit; over large blocks it is not.** **MECHANISM,
  untested:** a stated canonical ordering upstream of serialization.

### G96 - ELK on five real repository circuits is worse than the representative probe on every axis

`[RAN]` Measured on the axes `generation-prior-art-third-pass.md` §3.5 used, so
the numbers compare directly. Its 25-part Pultec-SHAPED probe scored 15 inter-net
crossings, 1.72 bends per edge, 2.55 aspect.

| | real circuits, 14 successful runs | the probe |
| --- | --- | --- |
| inter-net crossings | **16 - 195** | 15 |
| **bends per edge** | **2.19 - 3.27** | **1.72** |
| aspect | 1.37 - 5.19 | 2.55 |

**Not one of fourteen runs beats the probe on bends per edge**, the term the one
user study in evidence blames for unreadability. Crossings reach **195 on a
24-part circuit**. Aspect reaches **5.19:1** where the parent spec calls a 1.97
ribbon unusable.

**So the representative probe was the best case, not a typical one.** G91 records
the conflation that preceded this; this entry is the measurement that settles it.

**Degree is not the explanatory variable.** `pultec-low-boost` has the highest max
net degree (15) and middling crossings; `pt2399-core` at 13 has the worst.

**Rail symbols make it worse, consistently** - more crossings than the bare policy
on all five circuits. A `gnd` glyph is added and the ground net is still routed as
a long bus, so the symbol costs edges and saves none. §1.6's "power symbols"
candidate gets nothing from this front end for free.

**AMENDED 2026-10-19: "on every axis" is true of WHOLE circuits and false of
declared BLOCKS.** `[RAN]`
`docs/schematic/elk-block-spike.md` §3 ran 18
declared blocks of 1 to 28 parts through the same converter and skin:

| on the best policy (`v-bare`) | 14 whole-circuit runs | 18 declared blocks | the probe |
| --- | --- | --- | --- |
| bends per edge | 2.19 - 3.27, **0 of 14 beat the probe** | **0.67 - 2.89, 6 of 18 beat it**, 12 of 18 at or below 2.00 | 1.72 |
| inter-net crossings | 16 - 195 | **0 on every block of 8 parts or fewer**, then 4, 5, 14, 16, 20, 28, 37 | 15 |
| aspect | 1.37 - 5.19 | 0.87 - **6.63** | 2.55 |

**So the axis that sharpened is bends per edge, and the axis that got worse is
aspect**: `pultec-mid` scores a good 1.77 on a **2716 x 410, 6.63:1** sheet and
`pultec-hi-boost` 1.66 on 4.70:1, where the parent spec calls a 1:1.97 ribbon
unusable. **Bends per edge and aspect disagree about those two blocks, and only
one of them is what a reader meets.**

**Size is a WEAK predictor of bends per edge, and the apparent effect is a
property of the POLICY.** `[RAN]` Spearman rho over the 18 blocks is **+0.57**,
falling to **+0.15** once port edges are excluded; under `h-rails` it is
**+0.92** and **+0.87**. A 28-part block (1.77) beats a 3-part block (2.00).
**Crossings grow faster than linearly in parts; bends per edge does not grow at
all.**

**The policy result holds and sharpens:** `h-rails` is worse on bends per edge
for **17 of 17** blocks that laid out, and it is the policy that makes
`oc-audio` crash (G94).

- **Found** `docs/schematic/elk-spike.md` §2. **Amended from**
  `docs/schematic/elk-block-spike.md` §3.
- **Evidence** the full fifteen-row table there, with the spike's measurement code
  validated against §3.5's published numbers and its SVG regenerated
  byte-identical. At block scale, the same measurement code reached through a
  machine-extracted copy of the same converter, with **15 of 15 whole-circuit
  inputs regenerated byte-identical** as the control that the extraction changed
  no behaviour.
- **Verified** RELAYED, both halves.
- **Why it is open** it is a measurement, not a defect. **It is recorded so the
  next agent does not re-derive it**, and because it is the before-measurement for
  any template that claims to improve on it.
- **What would settle it** nothing. **A caution instead, and it is now true of
  TWO spikes: these are ELK with NO template at all**, which is what seam A asks
  of it, and they are not a prediction about seam A plus a template library.
  **Neither spike had a template in the loop and neither measured a block in
  CONTEXT** - seam A hands ELK the subgraph left over after templates have drawn
  its neighbours, and both spikes measured a block in isolation.

### G97 - a declared functional group does not draw disjointly, and a repeated sub-circuit does not draw congruently

The schematic-authoring spec's §3.4 names three criteria this repository can make
**objective** where they are judgement calls elsewhere. `[RAN]` Two were measured
and **both answer no.**

**Functional-grouping disjointness** - the Pultec stand-in group is a declared set:

| circuit | members | bounding box | of canvas | non-members inside it |
| --- | --- | --- | --- | --- |
| `pultec-low-boost` | 8 | 1016x621 | **67 %** | **11** |
| `pultec-hi-boost` | 8 | 1412x566 | **61 %** | **11** |

**Congruence of repeated sub-circuits** - `transistor-preamp-lab` declares four
structurally identical bias legs. Drawn `jumper -> trim` offsets: `(-141, +153)`,
`(**+564**, +173)`, `(**-912**, +153)`, `(-147, +143)`. **One leg runs the
opposite direction from the other three.**

**The claim in §3.4 is not wrong - it is a claim about the MODEL, and these are
measurements of a DRAWING.** The model does declare the group and the repetition.
What is established here is that **a general engine given no template honours
neither**, which is precisely what makes those two criteria worth having.

**AMENDED 2026-10-19: CONGRUENCE FLIPS AT BLOCK SCALE.** `[RAN]`
`docs/schematic/elk-block-spike.md` §6 laid the
same four declared bias legs out ALONE, `v-bare`:

| leg | canvas | jumper -> floor | floor -> trim | jumper top-left |
| --- | --- | --- | --- | --- |
| `leg-upper` | 354x190 | (+107, +28) | (+54, +65) | (81, 22) |
| `leg-feedback` | 390x190 | (+125, +28) | (+54, +65) | (81, 22) |
| `leg-lowerA` | 378x190 | (+119, +28) | (+54, +65) | (81, 22) |
| `leg-lowerB` | 378x190 | (+119, +28) | (+54, +65) | (81, 22) |

**Every vertical offset identical, the internal vector identical, the starting
corner identical.** The single x difference is **predicted exactly** by
`6 * len(component id) + 5` - 107 / 125 / 119 / 119 for ids of length
17 / 20 / 19 / 19, **4 of 4 to the pixel** - which is the 0.6 em at 10 px
monospace the skin uses. **The blocks draw congruently and the drawn width of
the component's NAME is what separates them.**

**So the flat measurement above is not the general answer: at block scale an
untemplated engine DOES honour the repetition, and §3.4's claim that this
repository can make congruence objective is supported there and was not at flat
scale.**

**Two qualifications, and the first one is the one a template designer needs.**
`[RAN]` Under `v-rails` the congruence BREAKS: `leg-upper` runs from `VCC` and
gets a `vcc` glyph, `leg-feedback` runs from `COLLECTOR` and gets none, and the
two land at (91, 42) on 364x210 against (81, 22) on 390x190, with the internal
vector splitting +54 / +44. **Adding a rail symbol to one of two otherwise
identical blocks stops them drawing alike.** Under `h-rails` the four stay
congruent in shape while the canvas widths diverge further, 480 to 536.

**And the DISJOINTNESS half does not get an answer this way - it gets dissolved.**
Inside a single block disjointness is trivially satisfied, so a block-scale
measurement cannot pass or fail it. It remains measured only at flat scale,
where it answers no.

- **Found** `docs/schematic/elk-spike.md` §6. **Amended from**
  `docs/schematic/elk-block-spike.md` §6.
- **Evidence** bounding boxes and offsets computed from the drawn geometry. At
  block scale, offsets between cell top-left corners on four separately
  generated drawings, plus the id-width prediction, which could have missed on
  any of the four and missed on none.
- **Verified** RELAYED, both halves.
- **Why it is open** these are the two criteria a template is load-bearing for,
  and the congruence half now has two opposite measurements at two scales.
- **What would settle it** **CRITERION: the same two measurements, taken again
  once a template is in the loop.** These numbers are the before. **Added by the
  amendment: congruence must be measured with the rail glyphs the two instances
  would actually get**, because that is what broke it here, not the topology.

### G98 - "wire through a symbol body" has two definitions and one manufactures 36 false defects

`[RAN]` Measured against netlistsvg's **declared** cell extents, ELK routes up to
**36** wires through symbol bodies on `transistor-preamp-lab`. Measured against
the **actually drawn** `<rect>`, **zero**, on every circuit and every policy.

**The declared extents are stale** because netlistsvg resizes a generic cell to
fit its ports without updating the group attribute. A control - netlistsvg's own
`common_emitter_full` example - reports 3 under both definitions, all three being
a transistor's own leads inside its circular glyph's bounding box.

**This is a worked instance of the G85 hazard the realization contract rests on**,
and it arrived **before any KiCad geometry exists.** G85 records that ~160
clearance refusals accreted pairwise because each step found the prior checks had
the same shape of blind spot - one obstacle category modelled against a second but
not a third. Here one obstacle category has two plausible definitions and the
wrong one is the one a reader would reach for first.

- **Found** `docs/schematic/elk-spike.md` §5.
- **Evidence** both measurements on the same drawings, plus the control.
- **Verified** RELAYED.
- **Why it is open** the obstacle-category matrix the spec's §1.4 requires has not
  been written, and this is an input to it.
- **What would settle it** **CRITERION: that matrix defines "symbol body" as DRAWN
  geometry, and states what it does with a glyph whose own pins sit inside its
  bounding box** - a transistor, in this repository, does.

### G99 - the IR carries no symbol, orientation, pin side or rail convention, and a layout backend needs all four

`[RAN]` Converting five real `Network`s to a layout engine's input required the
harness to **invent four things the model does not carry**, two of them
load-bearing:

| invented | consequence |
| --- | --- |
| a **symbol** per kind | low - a fixed per-kind map sufficed. Recorded already as an open question in the spec's §5.4 |
| a **drawn orientation** | **decides whether ELK crashes (G94)**, and moves crossings from 16 to 139 on one circuit |
| a **pin-side partition** for an IC | **no basis in the model at all** - `pt2399-core`'s 16-pin PT2399 was split "first half in, second half out" because nothing said otherwise |
| a **rail convention** | the IR has no power symbol; `GND`/`VCC`/`0` are ordinary nets. Measurable - adding rail glyphs made every circuit worse (G96) |

**A FIFTH, ADDED 2026-10-19 and visible only once blocks had declared ports.**
`[CODE]` `docs/schematic/elk-block-spike.md`
§0 H5 and §7: **the IR carries no port DIRECTION**, so every declared port was
emitted as `direction: "input"`. netlistsvg therefore draws entry and exit ports
alike as an inbound `inputExt` arrow and ELK is told every one of them is a
source. **On `leg-upper` the exit port `to` draws as an arrow pointing INTO the
trim-pot.** The first spike could not see this: it laid out whole circuits,
where a port is an interface terminal rather than a block boundary.

**The same section measures what ELK does with a port it is not told is a
boundary: it puts it in the interior.** As a fraction of canvas width,
`pultec-mid` puts `ground` at 0.91 and `input` at 0.72; `pultec-hi-boost` puts
`input` at 0.02 and `hi_boost_out` at 0.06 - **the two interface ports adjacent
in the left twentieth of a 1361-wide sheet.** A `Network`'s `.port(...)` set
says a net crosses the boundary and nothing downstream says which way or where.

**The spec's §1.5 answers who DECIDES an orientation - template, then
circuit-context rule, then the engine. It does not answer where a symbol, a pin
side or a rail convention is DECLARED**, and it does not answer port direction
either. Those are different questions and only the first is settled.

- **Found** `docs/schematic/elk-spike.md` §0, as the cost of the conversion.
  **Extended from** `docs/schematic/elk-block-spike.md` §0 H5 and §7.
- **Evidence** the conversion itself, with a partition check passing 15 of 15 that
  caught two of the harness's own bugs and a deliberate mutation - so the
  inventions are the residue after the checkable part was checked. **Read G102
  before leaning on that check: its mutation arm has a blind spot**, and the
  inventions it leaves as residue are therefore a lower bound rather than a
  complete list. The fifth invention was read out of the converter `[CODE]` and
  is visible in the drawings.
- **Verified** RELAYED, both halves.
- **Why it is open** four of the five have no home in the model and the design
  does not name one.
- **What would settle it** **CRITERION: every input a layout backend needs is
  either declared in the model or derived by a reviewed rule - none invented at
  the call site.** The IC pin-side partition is the sharpest case: it has no
  source, and a wrong one is invisible in a drawing that is electrically correct.
  **Port direction is the second: at block scale every boundary net gets an
  arrow, and half of them point the wrong way.**

### G100 - drawing a circuit as its declared blocks beats drawing it whole on every axis measured, and the mechanism is that the blocks have FEWER EDGES

`[RAN]` `docs/schematic/elk-block-spike.md` §4
is the paired control neither earlier pass could make: the same circuit, the same
converter, the same policy and the same skin, with the ONLY difference being
whether ELK saw it whole or one declared block at a time.

| `optical-compressor`, `v-bare` | parts | aspect | inter-net crossings | edges | bends/edge | wire length |
| --- | --- | --- | --- | --- | --- | --- |
| **whole** | 37 | 4.05 | **293** | 139 | **3.18** | **159 967** |
| `oc-power` | 8 | 3.11 | 0 | 20 | 2.70 | |
| `oc-audio` | 12 | 1.48 | 28 | 37 | 2.89 | |
| `oc-sidechain` | 17 | 1.81 | 20 | 39 | 2.51 | |
| **its three declared blocks** | 37 | worst **3.11** | **48 total** | 96 | **2.70** | **35 070** |

**6.1x fewer inter-net crossings, 4.6x less wire, and the worst block's aspect is
better than the whole's.** `v-rails` gives the same shape: 267 -> 47, 3.27 ->
2.68, 5.04 -> 3.14. **And the 76-part `THREE_BAND_REFERENCE` goes from REFUSED
under both vertical policies to five drawings that all complete** (G94).

**THE MECHANISM, which is why this is not a lucky result.** `[RAN]` **The three
blocks carry FEWER EDGES THAN THE WHOLE - 96 against 139.** The parent's maximum
net degree is 19 and no block's exceeds 7, so a ground fanning to nineteen pins
across one sheet becomes four smaller fans, **and the edges that disappear are
the ones that were crossing everything.** Decomposition does not route the same
graph better; it hands ELK a smaller graph.

**AND IT IS NOT UNIFORMLY A WIN PER BLOCK.** Under `h-rails`, where the 76-part
whole does lay out, the whole scores 373 crossings / 3.56 bends per edge /
8.37:1 and the five sections total 239 / 3.37 / worst 4.05 - a real but much
smaller gain, **and the 28-part `pultec-mid` at 3.73 is WORSE than its own
parent.** The win is in the totals and in whether the thing completes at all.

**What does NOT improve is everything the flat spike's readability complaint was
about:** a 12-part block still has 28 crossings, two 17-part blocks are 4.5:1 and
4.7:1 ribbons, the capacitor banks are still out of frequency order, and the
interface ports still land mid-sheet (G99). **Block scale removes the
catastrophe and leaves the complaint.**

- **Found** `docs/schematic/elk-block-spike.md` §4, 2026-10-19.
- **Evidence** both parents emitted through the same machine-extracted converter
  as the blocks, with **15 of 15** of the first spike's whole-circuit inputs
  regenerated **byte-identical** through that extraction as the control that it
  changed no behaviour, and a partition check passing 54 of 54 and failing 54 of
  54 under mutation. A check that could have failed: the parent could have scored
  better than its blocks, and under one policy one block does score worse than
  its parent.
- **Verified** RELAYED.
- **Why it is open** it is a measurement, not a defect. **It is the strongest
  evidence in the repository for the architecture's block seam**, and it is
  recorded so nobody re-derives it and so the next agent knows the gain has a
  stated mechanism rather than being a hope.
- **What would settle it** nothing. **A caution instead, twice over.** These are
  blocks in ISOLATION, each on its own canvas; **the totals add crossings across
  three sheets, and a mechanism that put them on one sheet would add its own**
  (spec seam B, untested). And no template was in the loop in either spike.

### G101 - block size has a CEILING near 9 parts and, under the tested frontend, an interface cost that dominates a very small block

> **CAVEAT ADDED 2026-10-19, AND THE REASON IT WAS MISSING IS ITSELF THE
> FINDING. BOTH FIGURES BELOW WERE MEASURED THROUGH A FRONT END THE GENERATOR
> WILL NOT USE.** Both spikes drove ELK through `netlistsvg` at `d3518f1` with
> its pinned elkjs 0.7.1; the M1 plan's backend replaces that code path
> entirely. So:
>
> - **the ceiling's SHAPE survives and the number nine does not.** The shape -
>   crossings are zero up to some size then grow, and below that size the count
>   stops moving when the source file is reordered - rests on comparisons taken
>   under identical conditions on both sides, so a skin that inflates crossings
>   inflates both. The number is read off crossing counts that depend on node
>   sizes and on the port constraints the skin declared;
> - **the floor is ENTIRELY the skin's and is UNMEASURED for the new backend,
>   not 4.** `[CODE]` A port became a drawn cell only because `netlistsvg`
>   emits a 30x20 `inputExt` glyph for it. A backend that emits no port glyph
>   has a different floor, or none. The earlier reading that *"a floor exists
>   however the boundary is drawn"* is an argument, not a measurement.
>
> **HOW THIS CAVEAT CAME TO BE MISSING, recorded because it is a register
> failure and not only a measurement caveat.** The contamination was found on
> 2026-10-19 and scoped in the child spec and the M1 plan **in a change that
> touched neither this file nor this entry** (`1dad94b`, *"The skin
> contamination is scoped rather than re-measured"*, two files). **So for a day
> the spec said the floor was unmeasured while this register still presented it
> as a measured 4** - and the child spec's revision 4 then asserted that this
> entry *"holds them with their caveats"*, which was checked and was not true.
> **A caveat recorded in a design document and not in the register is not
> recorded**, which is this file's own opening rule pointed at itself. What
> survives unchanged is the finding's portable half: **block granularity trades
> internal routing complexity against interface complexity**, which depends on
> neither number.

`[RAN]` `docs/schematic/elk-block-spike.md` §9
and §7, over 18 declared blocks of 1 to 28 parts.

**THE CEILING, from two independent measures that agree.**

- **Inter-net crossings are ZERO on every block of 8 parts or fewer**, then 4, 5,
  14, 16, 20, 28, 37 - and 293 on the 37-part parent.
- **Crossing count is invariant under declaration-order shuffling at 9 cells and
  moves 22-29 at 13** (G95).

**So below about nine parts a block's measured quality is a property of the
BLOCK, and above it the measure is partly a property of the order somebody typed
the components in.** It is **not** the size at which drawings become good:
`leg-upper` at three parts has zero crossings, a congruent layout and three
legibility defects a reader trips on.

**THE FLOOR, and it is the price of a fine cut.** A declared port is not free
annotation - `[CODE]` netlistsvg emits it as a 30x20 `inputExt` CELL and ELK
lays it out like any other node.

| block | parts | port glyphs as share of cells | bends/edge, port edges | bends/edge, internal |
| --- | --- | --- | --- | --- |
| `standin-mid` | 1 | **0.67** | 1.00 | - |
| `standin-low-boost` | 2 | **0.60** | 1.50 | - |
| `oc-power` | 8 | 0.33 | 2.71 | 2.67 |
| `pultec-low-cut` | 9 | 0.18 | **3.12** | 2.12 |
| `pultec-hi-cut` | 13 | 0.13 | **2.91** | 2.27 |
| `pultec-mid` | 28 | 0.10 | 2.00 | 1.75 |

**Port glyphs are 10-67 % of a block's cells, a 1-part block's drawing is
two-thirds boundary, and the boundary is the bendy part**: port edges carry more
bends per edge than internal edges on **every one of the 8 blocks of 8 parts or
more** and on the parent, by up to 1.5x. Of the seven smaller blocks with both
kinds of edge, five are equal and one is lower.

**THE TWO BOUNDS ARE CLOSE TOGETHER, and that is the finding.** The size at
which a block draws predictably is near the size at which the drawing is mostly
boundary. **Cutting finer trades crossings for boundary**, and a third cost
comes with it: `[RAN]` labels running past the right-hand canvas edge affect **26
of 53 block drawings against 5 of 14 whole-circuit drawings** (worst overflow
13 px), because the canvas shrinks with the block and the component ids do not.

**One check that could have failed and did not:** across the 18 blocks there are
20 single-pin nets and **every one is a declared port, zero undeclared**. A block
cut by `include()`, by `OWNERSHIP` or by a stand-in's `boundary` does not leave a
net hanging that its declaration does not name.

- **Found** `docs/schematic/elk-block-spike.md` §9, §7 and §2.1, 2026-10-19.
- **Evidence** the 18-block table, the shuffle comparison, and the port-edge
  split computed from each input's own `ports` declaration. Checks that could
  have failed: crossings were 0 on 11 blocks and nonzero on 7; the dangling-net
  scan could have found an undeclared one and found none.
- **Verified** RELAYED.
- **Why it is open** it is a measurement that constrains a decision nobody has
  made. **The spec has no section for block size and this entry is the input to
  one.**
- **What would settle it** **CRITERION: a block-size decision names both bounds
  and says which cost it is paying** - above the ceiling the measured quality is
  not a property of the circuit, below the floor most of the drawing is boundary.
  **Nothing here picks a number and this entry does not propose one.**
  **CAVEAT THAT MUST TRAVEL WITH THE FIGURE: the ~9 comes from 18 blocks out of
  TWO parents, both unusual** - a 76-part passive EQ and a 37-part compressor
  with two dual op-amps - and the repository declares no block above 28 parts, so
  nothing above that was tested at all. **AND THE SECOND CAVEAT, added with the
  block at the top of this entry: both figures were taken through `netlistsvg`,
  which the generator will not use - the ceiling's shape survives, the number
  nine does not, and the floor is unmeasured for the new backend rather than 4.**
  **MECHANISM, untested:** whether a template in the loop, or sheet composition,
  moves either bound. Neither was in either spike. **The M1 plan's Task 17 is
  where both contaminations are cleared, and its `BlockSizeDecision.floor`
  admits the literal `"unmeasured"` so that a withdrawn number cannot be carried
  into code.**

### G102 - three harness checks in the ELK spikes could not have failed on the fixtures they were built against, and one of them had never drawn the part it was wrong about

`[RAN]` `docs/schematic/elk-block-spike.md` §0
reports three defects in spike harnesses, and **the general form is what earns
an entry: a check or a converter that cannot be exercised by its own fixtures
looks exactly like a correct one.** All three were found by widening the
fixtures or by reading the code, never by a failing run.

**1. A converter bug that had never fired.** The first spike's converter maps a
diode's pins to the skin ids `A`/`B`. A scan of netlistsvg's own
`lib/analog.svg` skin - in that checkout, not in this repository - prints
`diode_v | alias: d_v | pids: +,-`; **`A`/`B` belong to the resistor, capacitor,
inductor and crystal templates.** **None of the first spike's five circuits
contains a diode**, so the bug was invisible and nothing that spike measured
could have caught it. Two blocks in the second spike do, and ELK refuses the
input outright: `JsonImportException: Referenced shape does not exist:
reverse_polarity_diode.A`. **Until the second spike, this repository's ELK
evidence had never drawn a diode.**

**2. A mutation arm too weak to prove the check it guards, in BOTH spikes.** The
partition check compares net CONTENTS ignoring net NAMES. Its mutation moved one
pin to a FRESH net - and on a small block that leaves the multiset of groups
unchanged, so **27 of 54 mutated rows still reported SAME**. Merging the pin onto
an EXISTING net instead gives **54 of 54 DIFFERENT**. **A pin moved to a
brand-new net is invisible to this check in both spikes**, and that check is the
evidence G99 rests on.

**3. A measurement column that reports 0 because it cannot report anything
else.** `[CODE]` `measure.py`'s `labels_past_right_edge` compares a `<text>`'s
LOCAL `x` against the absolute canvas width and reports **0 on all 56 drawings**.
`[RAN]` No recorded figure rests on it - the first spike's "5 of 15" came from
`labels.py`, which accumulates the transform, and a re-implementation reproduces
**5 of 14** on that spike's own outputs. **A dead column beside live ones reads
as a clean result**, which is the failure mode `CLAUDE.md` names: a skipped check
must never look like a passing one.

**Why this is not scratch-harness trivia.** Both harnesses are throwaway and
uncommitted and a bug in one is not evidence about ELK - but **the measurements
they produced are now in this register** (G94 through G101), and the three
defects say what those measurements' blind spots are. **The pattern is also the
G85 pattern arriving a layer earlier**: a check grown against one fixture set has
the shape of that set, so a new input class is the condition that exposes it.

- **Found** `docs/schematic/elk-block-spike.md` §0, H1, H2 and H4, 2026-10-19.
- **Evidence** the skin scan printing the diode's real pids, ELK's own refusal
  message on an unpatched diode block, the 27-of-54 against 54-of-54 mutation
  comparison, and the `overflow.py` re-implementation reproducing the first
  spike's recorded 5. **A check that could have failed: the patched converter
  regenerates all 15 of the first spike's inputs byte-identical**, which is what
  establishes the diode patch is inert on everything measured before it.
- **Verified** RELAYED.
- **Why it is open** the harnesses are uncommitted scratch, so there is nothing
  here to fix. **It is recorded because the next agent to build a converter or a
  measurement harness for this work will reach for the same fixtures**, and
  because G99's evidence has a stated blind spot now.
- **What would settle it** **CRITERION: a harness check is exercised by a
  fixture that makes it fail, and a fixture set that cannot exercise a code path
  is reported as not exercising it rather than as passing.** For a converter:
  **every component kind it can emit is drawn by at least one fixture** - the
  diode bug needed only that. **MECHANISM, untested:** a per-kind coverage count
  printed beside the partition check's result.

### G103 - ELK emitted one non-axis-aligned wire segment, where two earlier passes recorded zero on every drawing

`[RAN]` `docs/schematic/elk-block-spike.md` §2.
The first spike measured **0 non-axis-aligned segments on every one of 14
drawings**, and the second measured 0 on every one of **53 block drawings**. On
the parent `WHOLE-optical-compressor__v-bare` there is **one**: a segment from
(1770, 472) to (2290, 682) on `net_22`, carrying exactly
`sidechain_led_sense_resistor.B` and `sidechain_vactrol_led.-`.

**Why this matters at all: a schematic is orthogonal by convention**, so a
diagonal is not a cosmetic defect in a KiCad emitter - it is geometry the
realization contract has no rule for. **67 of 67 drawings were clean and one was
not, which is the difference between an invariant and a tendency.**

**THE ATTRIBUTION IS WEAKER THAN IT LOOKS, and the spike says so.** That net
ends on a **diode**, and the diode symbol mapping is exactly the converter patch
G102 records - so the segment may be an artifact of a one-line harness patch
rather than ELK behaviour. Against that: `oc-power` and `oc-sidechain` both draw
diodes with zero diagonals.

- **Found** `docs/schematic/elk-block-spike.md` §2, 2026-10-19.
- **Evidence** a segment-angle classifier run over 67 drawings, after the first
  spike's version of it was corrected for counting zero-length segments as
  diagonals; it returns 0 on 66 and names the coordinates and the net on the
  one.
- **Verified** RELAYED.
- **Why it is open** undiagnosed. **It is recorded undiagnosed rather than
  omitted**, because an invariant that holds 66 times and fails once is the kind
  of thing a later reader must not re-establish from scratch.
- **What would settle it** **CRITERION: whether ELK can emit a non-axis-aligned
  segment at all is answered, not assumed** - the realization contract (spec
  §1.4) needs a rule either way, and "it never happens" is currently a 66-of-67
  claim. **MECHANISM, untested:** re-run that one parent with the diode mapped to
  its correct pids and with the diode removed, which would separate ELK from the
  patch.

### G105 - the 6.1x block-decomposition gain is an UPPER BOUND, because 43 of the 139 edges became block-interface connections that nothing has drawn yet

**The number this program's schematic architecture rests on hardest is
`docs/schematic/elk-block-spike.md` §4's paired control, registered as G100:**
the same 37-part `optical-compressor` at `v-bare` gives **293 inter-net crossings
drawn whole and 48 drawn as its three declared blocks** - 6.1x - with wire length
159 967 against 35 070.

**THE MECHANISM G100 STATES IS WHERE THE PROBLEM IS, NOT A SEPARATE CLAIM.** The
gain is explained by the blocks carrying **fewer edges than the whole: 96 against
139.** A second independent review of the child spec asked the obvious question
nobody had: **where did the other 43 edges go?**

**They did not stop existing. They became connections BETWEEN blocks** - which is
what decomposition does, and is legitimate - **and nothing in the measurement or
in the spec represented them.** Each block was drawn on **its own canvas**, so the
43 edges were drawn nowhere at all and counted as removed.

**The spike said so itself, before the review asked**, `docs/schematic/elk-block-spike.md`
§11, verbatim:

> *"Seam B, and how block drawings would be composed onto one sheet. Each block
> was drawn on its own canvas. The totals in §4 add up crossings across three
> sheets; **a mechanism that put them on one sheet would add its own.**"*

**So 6.1x BOUNDS the improvement from above. Composition can only spend it
down**, and a reader quoting 6.1x without that sentence is quoting a bound as a
result. **A result below 1x after composition is possible** and would be a
finding about seam B rather than a failure of the measurement.

- **Found** 2026-10-19, in a second third-party review of
  `docs/superpowers/specs/2026-10-19-schematic-authoring-design.md`, recorded as
  that document's Revision 4, finding 15. **The supporting quotation was already
  in the spike** and had not been joined to the headline figure anywhere.
- **Evidence** G100's own edge counts (96 against 139) and the block spike's §11,
  both read directly. **A check that could have failed:** the 43-edge difference
  was computed from the two edge counts the spike reports rather than asserted -
  if the blocks had carried the same edge count as the whole, the review's
  question would have had no subject and the 6.1x would have been a routing
  result rather than a decomposition one.
- **Verified** CONFIRMED - the controller read §4's table and §11's limitation
  list in the spike, and quoted §11 rather than paraphrasing it.
- **Why it is open** nothing has drawn a composed sheet yet. Seam B does not
  exist, so the cost of the 43 edges is unmeasured in every direction: crossings
  added, wire length added, and whether the blocks still fit a page once their
  interfaces are connected.
- **What would settle it** **CRITERION: an integrated measurement draws one
  complete circuit with both template-drawn and ELK-drawn blocks, composes it
  onto sheets, and reports the four measures against the FLAT whole-circuit
  baseline - so what survives of the bound is a number rather than an
  assumption.** **MECHANISM, untested:** the M1 plan's Task 17 Step 4, on
  `optical-compressor` itself, because both ends of the comparison already exist.
  Spec §1.9's block-interface contract is what has to be in place first, since
  the 43 edges cannot be drawn until a block's interface is declared.

### G106 - the ELK drawings already contain 30-187 DUPLICATE wire segments each, so every crossing and length measure taken over them is inflated, and the adapter would inherit them

`[RAN]` `docs/schematic/elk-spike.md` §7, on 15 whole-circuit drawings:

> *"**Duplicate wire segments: 30-187 per drawing.** Any measure that does not
> collapse them double-counts crossings."*

`[RAN]` `docs/schematic/elk-block-spike.md` §10, on 53 block drawings and 14
parents: **0-80 duplicate segments per block drawing.** Zero-length segments too:
**1-8 per whole-circuit drawing, 0-5 per block** (10 on one parent).

**WHY THIS IS A CONSTRAINT ON THE DESIGN AND NOT A HARNESS CURIOSITY.** The M1
plan's ELK-to-KiCad adapter consumes ELK's edge sections and turns them into
`Wire[]`. **The duplicates are in that input.** An adapter that passes the
sections through emits duplicate wires and duplicate junction objects into the
`.kicad_sch`, and **every one of the four measures the spec requires - bends,
bends per edge, crossings, wire length - is then inflated by an unknown amount.**
It is not a defect the adapter might introduce; **it is already present in the
geometry the adapter adapts from.**

**And it is why spec §1.4's junction obligation needed refining.** *"Every branch
point of every net carries an emitted junction"* assumes a branch point can be
identified, which requires knowing a **wire crossing** from a **T-junction**,
whether a branch may sit on a **pin endpoint**, and how **coincident branches are
normalised before counting.** Over a segment list containing up to 187 duplicates
none of those is well defined.

- **Found** 2026-10-19, while checking a second review's finding 21 - which asked
  for the junction geometry to be canonicalised on general grounds and **did not
  have these figures.** The measurements predate the review by a day and had not
  been connected to it.
- **Evidence** the two spike sections quoted above, read directly. **A check that
  could have failed:** the block-scale range starts at **0**, so not every
  drawing has duplicates - the defect is real and not universal, which is why a
  canonicaliser must report how many it collapsed rather than assume a count.
- **Verified** CONFIRMED - the controller read both spike sections and quoted
  them.
- **Why it is open** no canonicaliser exists. Both spikes' published crossing
  figures - including G96's 195 on a 24-part circuit, G100's 293-against-48
  paired control and G101's zero-crossings-below-9-parts ceiling - **were taken
  over uncanonicalised geometry**, so each is an upper bound of unknown
  tightness. **The ratios are less affected than the absolutes**, since both
  sides of a paired comparison carry the same defect, but nothing establishes
  that the inflation is proportional.
- **What would settle it** **CRITERION: a canonical wire topology is established
  before serialization, and it deduplicates coincident segments, represents each
  net's branches explicitly, preserves pin-end identity, and REJECTS an ambiguous
  overlap rather than choosing one reading of it - with the collapsed count
  reported rather than silent.** **MECHANISM, untested:** the M1 plan's Task 13's
  `canonicalTopology`, with Task 16 taking every measure over its output and
  Task 13 Step 8 reporting how far each measure moves when it does not. **That
  difference is the size of this defect and nobody has measured it yet.**

### G91 - ELK ROUTES a Pultec-shaped network and does not DRAW it well, and a controller conflated those two results

**The two claims were merged in a report to the owner and they are different.**
`docs/schematic/generation-prior-art-third-pass.md` §3.4 measured a layered
orthogonal engine (ELK, via `netlistsvg`) completing **10 probes out of 10,
byte-identical across 30 runs, never slower than 0.19 s** - including 14
capacitors in parallel at **zero crossings**, the exact shape that defeats
`schematizer` 0/3. That is a real result about **routing success and
determinism.**

**§3.5 of the same document measures the representative case and it is not
good.** On the 25-part Pultec-shaped passive EQ the same engine produced, `[RAN]`
in that document's own marks:

| measure | value |
| --- | --- |
| crossings between different nets | **15** |
| crossings within one net | 2 |
| ELK edges / total bend points | 43 / 74 |
| **bends per edge** | **1.72** |

with selector throws crossing the **entire 1232-unit width** to reach their
capacitors, capacitors ordered by a crossing-minimising permutation rather than
numerically, and **signal flow in neither direction**. The document's own verdict:
***"not a good audio schematic"***.

**So the honest statement is narrower than the one that was made.** ELK solves
the routing-FAILURE problem - it completes deterministically where another router
refuses - and **it does not by itself produce a readable audio schematic.**
Completing and drawing well are separate claims.

**This cuts in two directions and both belong here.** It weakens any reading of
"ELK is the general engine, problem solved". It **strengthens the two-track
architecture**, because it is direct evidence that a general engine alone is
insufficient and the idiom templates are doing real work rather than covering a
gap that could be engineered away.

- **Found** 2026-10-19, by the independent reviewer of
  `docs/superpowers/specs/2026-10-19-schematic-authoring-design.md`, which
  observed the spec quoting the most regular probe; the controller then read
  §3.5 directly and confirmed it.
- **Evidence** the table above, read from §3.5 of the third pass; §3.4's ten
  probes for the contrasting result. A check that could have failed: the
  document could have reported the Pultec-shaped probe as good, and does not.
- **Verified** the §3.5 figures CONFIRMED by the controller reading them; the
  underlying runs RELAYED - nobody re-executed the probe.
- **Why it is open** it is **not a defect** - it is a measurement that corrects
  an overclaim and re-aims work. The spec's §1.1 has been withdrawn and replaced.
- **What would settle it** **CRITERION: a general engine's output on a real
  repository circuit, measured on the same axes, read by someone who is not the
  producing agent.** The third pass's probe was a hand-built Pultec SHAPE, not a
  circuit from `circuits/` through this repository's own IR. **MECHANISM,
  untried:** the spike recorded in that spec's §6, which the owner scheduled for
  after the revision.

### G92 - `stripboard/render-approvals.json` holds five approvals, not seventeen, and a `grep -c` was reported as an entry count

**A controller counted `grep -c "candidateSha256"` and reported the result as
"17 entries" in a dispatch brief.** Measured: the file's top level is
`{schema, approvals, notes}` and **it holds five approvals**, one per Pultec
section board, with **six** `ownerWords` utterances across them and twelve
declared fields each. The sibling `stripboard/exemptions.json` holds two. **No
count of 17 exists in any stripboard registry**; the string simply occurs 17
times.

**Every other property claimed of that channel holds** and was re-checked: it is
scoped to `board` plus `candidateSha256`, it carries the owner's words verbatim,
it is held outside any generation run, and its loader refuses a narrator-voice
quote. **The mechanism was right and the number was wrong**, so the channel is
adopted by that spec's §3.3 with the figure corrected rather than repeated.

- **Found** 2026-10-19, by the agent revising the schematic-authoring spec, which
  declined to repeat a figure it could not reproduce.
- **Evidence** the file's parsed shape and entry count, measured; the raw
  `grep -c` of 17 reproduced, which is what shows how the error was made.
- **Verified** CONFIRMED by the controller, who re-ran both and got
  `{schema,approvals,notes}` with five approvals against a raw grep of 17.
- **Why it is open** the wrong figure reached a dispatch brief and would have
  reached a spec. The general fault is not corrected by fixing this instance.
- **What would settle it** **CRITERION: a count of records in a structured file
  is obtained by parsing it, never by `grep -c` of a field name.** A field that
  appears in a schema block, in notes, or more than once per record inflates the
  count silently and in the direction that makes a claim look stronger.

### G93 - the parent spec states the ELK selection rule loosely, and the child spec that depends on it says the parent wins

`docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md` says ELK
*"becomes what that refusal falls through to"*. Its own **"Selection, not
degradation"** paragraph states the correct three-valued rule - the choice is
made before anything is drawn, not after something failed - so the document
contains both the right rule and a loose sentence that reads as a fallback.

**This matters because of a dependency.** The child spec
`2026-10-19-schematic-authoring-design.md` opens by stating that where the two
disagree **the parent wins**. So an implementer who reads the parent's loose
sentence and the child's precise §1.3 is entitled to prefer the parent's. The
child added a sub-section showing the parent's own paragraph already carries the
three-valued rule, which closes the gap for a careful reader and does not fix the
sentence.

**The failure this would cause is the one both documents exist to prevent:** ELK
rescuing a template that should have worked, so defects in the preferred
rendering path go dark - *"a fallback degrades the gate, not just the drawing"*.

- **Found** 2026-10-19, by the agent revising the child spec against an
  independent review, which found it could not make the child precise without the
  parent contradicting it.
- **Evidence** the parent's two sentences and its "Selection, not degradation"
  paragraph, both read.
- **Verified** CONFIRMED - the controller read both passages.
- **Why it is open** the child's scope was two files and the parent's wording was
  not among the changes briefed. Editing a parent spec to match a child is a
  change that wants its own review.
- **What would settle it** the parent's sentence is tightened to the three-valued
  rule it already argues for, in a change that does not also alter its meaning
  elsewhere.

### G63 - `boards/` has no `Makefile`, so the aggregate check walk is reachable only from the repository root, although `make/aggregate.mk` says every intermediate directory gets it

`make/aggregate.mk` opens with the claim: *"The repository root and every
intermediate directory land here, and they get the same two things: `check`,
which walks down and checks every declared board beneath $(CURDIR), and
`boards`, which lists them."* `boards/` is such a directory, it holds eleven
declared boards, and it has no `Makefile`, so it gets neither:

```
$ make -C boards check
make: *** No rule to make target `check'.  Stop.
```

**Nothing is going unchecked.** The repository root IS an aggregate and its
`make check` walks all eleven boards, plus `typecheck` and the two
repository-wide guards, so the root sweep is a superset of the one that is
missing. What is missing is the narrower sweep the comment promises - "check the
boards and not the rest" - and what an operator or an agent who reaches for it
gets is `No rule to make target` rather than a walk or a refusal that explains
itself.

- **Found** 2026-10-18, during Task 7 of
  `docs/superpowers/plans/2026-10-18-the-packet-shows-the-clusters.md`.
  **Relayed first by an implementer of an earlier task of the same plan**, then
  run by the writer.
- **Evidence** the command and its refusal above, run in a clean tree;
  `ls boards/Makefile` reports no such file; `find . -name Makefile` outside
  `.tools/` lists eleven board Makefiles and the repository root's and no
  `boards/` one; `make/aggregate.mk:1-8` for the claim.
- **Verified** yes - run by the writer, not relayed, although the observation
  reached the writer as a relay.
- **Why it is open** whether `boards/` SHOULD be a sweep point is a small design
  question nobody has decided, and the two honest fixes mean different things:
  add the one-line `Makefile` and the directory becomes one, or correct the
  comment and the root stays the only one. Choosing either silently settles the
  question by accident, which is the thing this register exists to stop.
- **What would settle it** either fix, done deliberately. **CRITERION:** no
  directory that `make/aggregate.mk`'s comment claims gets `check` fails to have
  it. **MECHANISM, untried:** give `boards/` the same one line every board
  directory carries - the `include` of `make/perfboard.mk` - which routes to
  `aggregate.mk` rather than `board.mk` because `boards/` declares no
  `perfboard.json` of its own. Unmeasured: whether the recursive walk behaves
  the same from one level down as from the root.

### G64 - three bare `G4` references in `docs/stripboard/pipeline-verification.md` are CRITERIA clauses, which is exactly the collision this file's preamble forbids

This file's own preamble: *"Every CRITERIA reference is written `CRITERIA G<n>`
in full. A bare `G<n>` is this file's."* In
`docs/stripboard/pipeline-verification.md` three references are bare - the
section heading at `:3448` (*"Task 25 - admitting `HC5`, `HC8`, `HC9` and `HC10`
to `make check` (`G4`)"*), and `:3452` and `:3531` - while a fourth at `:667` is
written correctly as `CRITERIA G4`, which is what establishes that the bare ones
mean the same clause rather than a register entry.

**This register has no G4**: it had one, and it was deleted when it was settled,
per this file's own rule. So a reader following a bare `G4` by the preamble's
instruction looks in this file and finds nothing - which is the precise failure
the preamble describes having already happened once.

- **Found** 2026-10-18, Task 7 of
  `docs/superpowers/plans/2026-10-18-the-packet-shows-the-clusters.md`, by the
  grep for dangling register references that task was asked to run.
- **Evidence** `git grep -n -E '\bG[0-9]+\b'` over the tree with this file
  excluded, every hit checked against the headings present here. A check that
  could have failed: the same grep reports `tools/guide/hatch.ts`, `render.ts`,
  `packet.ts` and `tests/guide/clusters-view.test.ts` citing `G2` and `G17`,
  both of which ARE present, so the scan distinguishes live references from
  dangling ones rather than flagging everything.
- **Verified** yes - grepped by the writer.
- **Why it is open** it is a correction inside a 3,500-line verification
  document that Task 7's file scope did not cover, and a correction there should
  be made by somebody reading that document rather than by a grep reaching into
  it. No other dangling reference was found outside the historical plan files,
  which record what was true when they were written and several of which say so
  explicitly.
- **What would settle it** writing `CRITERIA G4` in full at those three sites.
  **CRITERION:** every `G<n>` in a committed file either names a heading in this
  file or carries the word `CRITERIA`.

### G58 - a stand-in group's parts are spread across the checklist's sections, and nothing on the printed page says what mark records a group's state

Two findings from the same change - the one that put the **Stand-in groups**
section in the printed packet (`tools/guide/stand-in-section.ts`). The first is
a MEASUREMENT with nothing wrong in it; the second is a presentation question
the producing agent may not answer.

**Measured on the regenerated `pultec-low-boost` packet, 2026-10-18.** A group
is populated whole, and its parts are nevertheless listed in three different
sections of the one checklist, because the section a row lands in is decided by
what the part IS and not by which group it belongs to:

- **Wire links** - `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper`,
  `SI_HI_CUT_RV_HI_CUT.ccw-wiper`, `SI_LOW_CUT_RV_LO_CUT.ccw-wiper` (each
  resolves to 0 Ω, so `tools/guide/checklist.ts` routes it there);
- **Resistors and trim-pots** - `SI_HI_BOOST_RV_HI_BOOST.wiper-cw`,
  `SI_HI_CUT_R1`, `SI_HI_CUT_RV_HI_CUT.wiper-cw`, `SI_MID_R_MID_SHUNT`;
- **Capacitors** - `SI_HI_CUT_C26`.

So the two-part `hi-boost` group has one row among the wire links and one among
the resistors, and the one-part `low-cut` group's only row is a wire link. **A
group block therefore cannot send a reader to a section of the checklist**, and
the one printed on the page does not: it names the `Fit` cell instead - *"Every
row in the build checklist whose Fit column reads `only with the hi-boost
group` is one of these, in whichever section that part's row sits."* That cell
is the one thing every row of a group carries wherever it landed. **This is
recorded because the next agent to make a group block point at a section would
be making a change that is wrong on this board and looks right in the code.**

**What is NOT settled: what mark a builder makes, and where the section sits.**
Each group prints three named states (populated here / not needed, that section
is present / carried on \_\_\_\_) under the line `Mark the one that applies:`,
and the page draws no mark shape at all - no box, deliberately (a box on a
group is unreadable either way round, which is this section's whole premise and
is stated in the module comment). Whether a circle, a cross, a ruled cell per
state or something else is what the sheet should offer is a decision about the
printed artifact. So is the section's POSITION: it is currently its own page
between the copper-side image and the build checklist, on the reasoning that
the checklist's `Fit` cells are conditions a reader cannot resolve until the
build and the group states are recorded.

- **Found** 2026-10-18, implementing Task 5 of
  `docs/superpowers/plans/2026-10-18-the-packet-shows-the-clusters.md`, by
  reading the regenerated `boards/pultec-low-boost/guide/guide.html` rather
  than by a check.
- **Evidence** the section-by-section membership above, read off the
  regenerated packet, and now asserted as a check that could fail: *"the
  section and the checklist's Fit column tell one story about every stand-in"*
  in `tests/guide/stand-in-section.test.ts` matches every group block's parts
  against the real board's Fit-bearing rows in both directions, and its own
  premise fails if a board's stand-ins ever land in one section. Making
  `fitLabel` a constant `"always"` fails that test and one other, so it has
  teeth.
- **Verified** yes, both halves read directly by the agent that made the
  change; the mutation above was run.
- **Why it is open** the measurement needs no fix - the page is correct as it
  stands - and the marking and placement questions are presentation decisions
  about an artifact, which **the agent producing it may not settle**
  (`CLAUDE.md`). The code records no guess: there is no mark shape in the
  markup to be mistaken for a ruling.
- **What would settle it** an owner (or reviewer) ruling on the mark and on the
  section's position, then one change to `groupBlock` and the `standIn`
  placement in `tools/guide/guide.ts`. **The criteria are two**: a reader must
  not be able to read one group's recorded state two ways, and a reader holding
  only the packet must be able to find every part of a group from its block.
  The current page meets the second through the `Fit` cell; the first is met
  today only because nothing is printed to mark.

### G57 - the layout image's own summary and legend still count a wire-link part as a part, so the picture and the checklist disagree about how many wire links the board has

**Measured on the regenerated `pultec-low-boost` packet, 2026-10-18**, in the
change that made a 0 Ω part render as a wire link (G55, level 1). Both figures
below are printed on the SAME sheet:

- `boards/pultec-low-boost/guide/layout-values.svg`, the summary line under the
  title, verbatim: `17 parts, 10 off-board pads, 4 wire links, 4 cuts, 5 solder
  bridges`. The three zero-ohm parts are inside the 17 and outside the 4.
- `boards/pultec-low-boost/guide/guide.html`, section **4. Wire links**: seven
  rows - `W1`..`W4` and the three parts.

The legend on the same image reads `wire link (W1, W2 ...)`, which is now the
naming of four of the seven marks it describes: the other three are tagged with
their designator (designators image) or with `wire link` (values image).

**Nothing on the sheet is FALSE** - a zero-ohm part really is a `PART` line and
really is not one of VeroRoute's `WIRE` marks - which is why this is recorded
rather than fixed in passing: a reader counting wire links in the picture and in
the table gets two answers, and that is the kind of small inconsistency this
repository's own practice says makes a generated document stop being trusted.

- **Found** 2026-10-18, by looking at the regenerated packet after the G55
  level-1 fix, not by a check.
- **Evidence** the two passages above, read off the two regenerated artifacts
  for the same board; `drawHeader` and `legendItems` in `tools/guide/render.ts`
  are where both strings are built.
- **Verified** yes, read directly by the agent that made the change.
- **Why it is open** how a printed sheet should count and name its marks is a
  question about the artifact, and **the agent producing the artifact may not
  answer it** (`CLAUDE.md`). There are at least three answers - count them among
  the wire links, say `3 wire-link parts` separately, or leave the counts as
  layout facts and reword the legend - and choosing one is a presentation
  decision, not a derivation.
- **What would settle it** an owner (or reviewer) ruling on which of those the
  sheet should say, then one change to `drawHeader` and `legendItems` making the
  summary, the legend and the checklist agree. **The criterion is agreement**:
  a reader must not be able to count wire links twice and get two numbers.

### G56 - the new scaffold-membership guard checks groups-against-layout in one direction only; a PLACED stand-in part that no group claims is caught only transitively

`tools/perfboard/scaffold-membership.ts` (new, `make check` prerequisite
`scaffold-membership` in `make/board.mk`) asserts two things about a board's
`SCAFFOLD`: every group's every `partIds` entry resolves through `DESIGNATORS`
to a `PART` ref the layout holds, and no part id is claimed by two groups. It
does **not** assert the reverse - that every stand-in part PLACED on the layout
is claimed by some group.

**Why not, and it is a boundary rather than a deferral.** Telling a stand-in
part from the board's own part needs `component.provenance?.source ===
STAND_IN_SOURCE`, and `STAND_IN_SOURCE` is declared in
`circuits/pultec/physical/board.ts:79` - one design's constant. A generic
`tools/perfboard/` guard that imported it would make every board's `make check`
depend on the Pultec physicalization, which is the coupling
`lib/board/scaffold/doc.ts`'s own comment refuses for the same reason. A prefix
test on `SI_` would be a guess about a naming convention nothing enforces.

**What covers it today, measured rather than assumed.** The orphan case is
covered by composition, in two hops that already existed:
`groupsFor` in `circuits/pultec/physical/scaffold-doc.ts:195-220` refuses when
the parts the maximal network marks as scaffolding and the parts the groups list
differ in either direction, and veroroute's `--check` plus
`assertLayoutMatchesCircuit` refuse when the network and the layout differ. So
an orphan would have to survive both to reach a diagram. What is NOT covered is
a future board whose `SCAFFOLD` is authored by hand rather than derived by
`scaffoldDoc()`: `groupsFor`'s guard is inside the derivation, so a hand-written
doc would bypass it and this guard would not catch the orphan.

- **Found** `2026-10-18-the-packet-shows-the-clusters`, Task 2, while
  implementing the guard.
- **Evidence** `grep -rn "export const STAND_IN_SOURCE" lib tools circuits`
  returns exactly one line, `circuits/pultec/physical/board.ts:79` - the
  constant is DEFINED only under `circuits/`, so the direction cannot be checked
  where the guard lives without crossing that boundary. A check that could have
  failed: it would have listed a `lib/` or `tools/` definition had one existed.
  (A bare `grep -rn STAND_IN_SOURCE` now hits `tools/` too, because the new
  guard's own doc comment names the constant it declines to import; the
  definition-site grep is the one that establishes the claim.)
- **Verified** yes, by the writer, who implemented the guard. Not relayed.
- **Why it is open** the honest fix is a vocabulary question, not a code
  question: something has to say "this designator is scaffolding" in a place a
  generic tool may read. That is a design decision with a blast radius beyond
  this task.
- **What would settle it** CRITERION: a board whose layout holds a stand-in part
  that its `SCAFFOLD` claims in no group is refused by `make check`, by name,
  without the guard importing anything from `circuits/`. MECHANISM, which is a
  guess from someone who has not tried it: have the board module export the
  stand-in designator set beside `DESIGNATORS`, validated at the same boundary
  `assertDesignators` sits on. Record the deviation if that mechanism turns out
  not to meet the criterion.

---

### G55 - the five adopted layouts PLACE a 0 Ω part as a resistor, which is what the owner objected to; only the printed sheets have been fixed

**THIS ENTRY HAS BEEN REWRITTEN DOWN TO THE HALF THAT IS STILL TRUE.** It began
as *"the printed guide tells a builder to stand a ZERO-OHM resistor on end,
where the wiring sheet for the same board says to fit a wire"*, and that half -
"level 1", the sheets - was fixed on 2026-10-18: the packet's checklist lists
such a part among the **Wire links** with its two holes, the layout images draw
the line a builder solders rather than a resistor body, and `0R` appears nowhere
in either. `lib/model/zero-ohm.ts` is now the one place that decides what zero
ohms means, read by the electrical consumer
(`lib/board/scaffold/shorts.ts`'s `isIdealShort`), the wiring sheet and the
packet alike. **What remains is the LAYOUT, and it is blocked by his own
ruling** - see "What would settle it" below.

**What the layout still does.** On `pultec-low-boost`,
`SI_HI_BOOST_RV_HI_BOOST.ccw-wiper`, `SI_HI_CUT_RV_HI_CUT.ccw-wiper` and
`SI_LOW_CUT_RV_LO_CUT.ccw-wiper` are each placed as a `RESISTOR` part occupying
two holes with a span and a direction - verbatim from `--dump-board` of the
committed `.vrt`:

    PART SI_HI_BOOST_RV_HI_BOOST.ccw-wiper RESISTOR 0R AT 2,2 SPAN 1 DIRECTION S
    PART SI_HI_CUT_RV_HI_CUT.ccw-wiper RESISTOR 0R AT 1,10 SPAN 1 DIRECTION S
    PART SI_LOW_CUT_RV_LO_CUT.ccw-wiper RESISTOR 0R AT 4,18 SPAN 1 DIRECTION N

The four other adopted boards carry the same shape for their own stand-ins. The
printed packet no longer SAYS resistor, but the layout the packet is generated
from still places one, and the `.vrt` is what a later tool, a later guide, or a
person opening VeroRoute reads.

**AND A THIRD ARTIFACT IS COMING THAT WILL HAVE TO DECIDE THE SAME THING,
2026-10-18.** The owner has required a generated schematic per Pultec section
board (G16). Every one of those boards carries stand-in groups, and a stand-in
is a product of `resolveSectionFlat` containing ideal-short arms -
`lib/board/scaffold/index.ts:28-31`: *"hi-boost's stand-in ... is two
components, `RV_HI_BOOST`'s 0R arm from `in` in series with its full 47k to
`hi_boost_out`, because 'ideal shorts are components, never node merges'."* So a
section schematic will contain 0 Ω resistors, and **what a schematic should draw
for one is unanswered**: a resistor symbol valued `0R`, a wire, or something
else. This is not the same question as this entry's level 2 (the layout) or
G60's (which checklist section the row lands in), and it is not blocked by
*"Leave the approved boards alone for bow"* - a drawing is not a layout. It is
named here rather than in a new entry because `lib/model/zero-ohm.ts` is still
the one decision point all three artifacts would read. **Relayed from a drift
check of the T2 spec**; this writer confirmed only that the stand-ins are on all
five boards, not the `index.ts` quote.

**Why a 0R part exists at all, since it looks like a mistake and is not.** A
pot resolves into two resistor sections, `ccw-wiper` and `wiper-cw`
(`lib/model/control-state.ts:299-314`). A pot at the end of its travel puts the
whole track in one section and 0 Ω in the other - visible on the board as the
pairs `.ccw-wiper` 0R with `.wiper-cw` 47K, and 0R with 4.7K. The zero section
is emitted rather than dropped **on purpose**, and
`lib/model/control-state.ts:293-297` states the reason: *"A zero-ohm section is
legal and is still emitted, so component counts stay stable across a sweep."*
That is a SIMULATION rationale - a stable component count makes a SPICE
parameter sweep comparable - and it is a good one.

**The residual defect is that a simulation convenience reached a PHYSICAL
LAYOUT as a part with a body.** That is the same shape as G44: a fact correct
for one artifact carried into another where it is not. The sheets generated
from that layout now translate it (`tools/guide/wire-links.ts`); the layout
itself has not been touched, and it is the layout the owner was looking at when
he asked.

**This is NOT G45**, which is adjacent and was checked before this entry was
written. G45 is that the packet carries none of the wiring sheet's
CONDITIONALITY - which stand-in group to populate in which build - and it names
these same parts as undistinguished from the board's own.

**THE OWNER CORRECTED THIS ENTRY'S STATEMENT OF THE COST, 2026-10-18, and the
correction matters more than the entry it corrects.** This entry was first
written claiming *"A builder following the packet alone would try to source
three 0-ohm resistors."* **That is wrong, and his words are the authority:**

> *"I'm not likely to go looking for a 0 ohm resistor. But, I am likely to
> question the validity of a perfboard layout that specifies 0 ohm resistors.
> There are manufacturing reasons to use a 0 ohm resistor and they are
> electrically equivalent to wires, but in a perfboard context, they raise
> eyebrows."*

**So the cost is CREDIBILITY, not a wasted purchase**, and the wrong version is
kept because the wrong cost would have steered the fix. A purchase problem is
fixed by better purchase wording on the sheet. **A credibility problem is not**:
it is the layout specifying a part that nobody would put on a perfboard, and
better wording about that part does not remove the eyebrow.

**Two things follow, and the second is the one an agent would miss.**

1. **A 0 Ω resistor is legitimate and must not be banned from the model.** He
   states the reason - *"There are manufacturing reasons to use a 0 ohm resistor
   and they are electrically equivalent to wires"* - and `control-state.ts` has
   its own separate reason for emitting the zero section. Neither is to be
   undone. The 0 Ω part is right in the MODEL and right on a FABRICATED board;
   it is only the perfboard context that makes it odd.
2. **Fixing the printed sheets does not fix what he described**, and the
   2026-10-18 change did only that. It was written with this clause in front of
   it, so the layout images were fixed alongside the checklist - the eyebrow is
   raised by the picture as much as by the table - but **both are documents
   generated FROM the layout**, and what he was looking at when he asked was the
   layout. An agent that reports this entry settled on the strength of the
   printed packet will have deleted a live defect.

- **Found** 2026-10-18, by the owner asking *"why are there 0R resistors on the
  low boost layout?"* - so it was found by him, not by a check.
- **Evidence** the `PART` lines above, read off `--dump-board` of the committed
  `boards/pultec-low-boost/pultec-low-boost.perfboard.vrt`;
  `lib/model/control-state.ts:293-314`. The original evidence for the
  sheets - the **Resistors and trim-pots** table reading `0R` / `STAND ON END`
  against `wiring.md`'s "fit a wire or a solder bridge" - is superseded by the
  fix and is in this file's history at `d4ff6bd`.
- **Verified** yes, by the agent that fixed level 1 - the `.vrt`'s `PART` lines
  read directly, and the regenerated packet confirmed to carry no `0R` and no
  mounting for those three parts.
- **Why it is open** the remaining fix is forbidden: it changes the five
  adopted `.vrt` files, and the owner has ruled those closed (G47).
- **What would settle it.**

  **THE CRITERION, from his own words:** a perfboard layout does not specify a
  part that raises an eyebrow on a perfboard. **It is the LAYOUT the criterion
  names, not the sheets** - the sheets were the reachable half, and fixing them
  removed the contradiction between two generated documents (established
  independently of him) without meeting this.

  **LEVEL 1, the sheets, DONE 2026-10-18** and recorded here so that nobody
  re-does it: `tools/guide/wire-links.ts` holds the packet's words,
  `lib/model/zero-ohm.ts` the one test, `wireLinkBody` in
  `tools/guide/part-shapes.ts` the drawn line, and a zero-ohm part's row lands
  in the **Wire links** section. **That last placement is UNRATIFIED AND IS NOW
  `G60`**, which is this clause promoted to an entry of its own on 2026-10-18 -
  which checklist section a wire link belongs in is a question about the printed
  page, it is answerable without touching a layout, and as a sub-clause of an
  entry blocked by his *"Leave the approved boards alone for bow"* it was
  invisible. **Ask G60, not here.** Level 1 changed no `.vrt` and no `wiring.md`
  (confirmed byte-identical by `shasum`).

  **LEVEL 2, the layout, and it is BLOCKED BY HIS OWN RULING.** The thing he
  actually objects to is that the LAYOUT specifies these parts: a 0 Ω stand-in
  section is placed as a resistor occupying two holes with a span and a
  mounting, where a perfboard would carry a wire or a solder bridge - both of
  which this layout model already has as first-class objects. Realising a zero
  section as a wire instead of a part changes placement, therefore changes the
  five adopted `.vrt` files, and he has ruled: *"Leave the approved boards alone
  for bow"* (G47). **So level 2 is not to be done to the adopted boards.** It
  could apply to boards generated from now on, which would leave the five
  adopted boards as the only ones specifying 0 Ω parts - a divergence to put to
  him rather than to introduce quietly.

  **A MECHANISM for level 2, which is advice and not the settlement** - nothing
  has been tried: the zero-ohm test now exists in one place, as
  `isZeroOhmResistor` in `lib/model/zero-ohm.ts`, so the question is whether
  the physicaliser can be told to realise such a component as a bridge, and
  whether the seed constructor's objective (which counts bridges at 0.25) then
  prefers or resists it. **Unmeasured.** Both of those would have to be
  established before anyone claims this is cheap.

### G54 - one `Separates` cell is 108 characters wide, because a stand-in part's ref carries the whole path it stands in for

The 2026-10-18 change that made the Cuts table name what a cut separates
(deleting G36) left one cell on `pultec-low-boost` far denser than the rest.
Verbatim from the regenerated `boards/pultec-low-boost/guide/guide.html`:

| cut | Between | Separates |
| --- | --- | --- |
| 1 | C5 and C6 | `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper.2, SI_HI_BOOST_RV_HI_BOOST.wiper-cw.1 \| SI_HI_CUT_C26.2, SI_HI_CUT_R1.2` |
| 2 | K4 and K5 | `C18.2, LO BOOST 20Hz \| C19.2, LO BOOST 30Hz` |

**The content is right and the width is the defect.** Cut 1 separates two
STAND-IN parts - the resistors that stand in for the hi-boost and hi-cut
sections' loading on this board - and a stand-in's ref names the section, the
control and the half of the pot it represents, so naming two of them in one
cell costs 108 characters against cut 2's 43. It is a real improvement on what
that cell said before (`si_hi_boost_j20_p3 | si_hi_cut_j12_p3`, which named
nothing a builder could find on the board), so this is a residual of that fix
rather than a reason to undo it: a builder CAN locate
`SI_HI_BOOST_RV_HI_BOOST.ccw-wiper` in the designators image, which was not
true of the ladder name.

- **Found** `2026-10-18`, by the controller reading the regenerated guide after
  the cuts-table change, not by the agent that made it.
- **Evidence** the table above, extracted from the generated
  `boards/pultec-low-boost/guide/guide.html` by parsing the Cuts table out of
  the HTML rather than by reading the source that produced it.
- **Verified** yes - read off the generated artifact.
- **Why it is open** every shortening available to the producing agent is a
  judgement about how a printed sheet should read, which that agent may not
  author; and the obvious mechanical fixes are each worse than the width.
  **Three that were considered and rejected**, recorded so they are not
  re-proposed: abbreviating a stand-in's ref would break the join to the
  designators image, where the full ref is what is printed; dropping the pin
  suffix would merge `.ccw-wiper.2` and `.wiper-cw.1` into one illegible name;
  and truncating the cell would hide half of what the cut separates, which is
  the thing the column exists to say.
- **What would settle it** the owner looks at a Cuts table carrying this row
  and says whether it is acceptable as it stands. The CRITERION is only that:
  his reading of that row. **A plausible MECHANISM, which is advice and not a
  settlement** - stand-in parts could print the section they stand in for
  instead of their full path, which would need the guide to know a part is a
  stand-in, a notion it does not currently have and which overlaps G44's
  PCB-versus-bench distinction.

### G44 - a stripboard build sheet inherits a PCB purchase instruction, because nothing in the guide knows which of the two it is describing

`JUNCTION_FIELD` declares `mating: "stacking"`
(`circuits/pultec/physical/parts.ts:127`) and **that is CORRECT**: the junction
is a stacking 2x05 bus on the PCB this design is ultimately fabricated as.
`stackingWords` (`lib/board/part-text.ts:189`) generates the matching purchase
guidance - *"fit a single stacking header, not 2 plain ones"*, *"2 plain
vertical 1x05 headers ... are the one thing not to order"* - into every board's
`wiring.md` and printed packet.

**The defect is the audience, not the claim.** Those sheets describe a
STRIPBOARD built at the owner's bench, where the field takes soldered leads and
no header is fitted at all. So a true statement about the PCB is printed as an
instruction to a person holding veroboard.

**The owner, 2026-10-17, in two parts:**

> *"How did the 2x10 header sneak back into the conversation? We're not doing
> headers here on veroboard. This is a LONG SETTLED ISSUE"*

> *"The 2x5 header/ribbon connector WILL be required on the pcb we send to
> pcbway. Stripboard layouts built at my bench do not use them"*

**THIS IS THE SECOND INSTANCE OF ONE PATTERN, which is why it is worth a frame
and not just a fix.** The junction's ground row interleaves grounds between
signals - correct for a ribbon cable's return path on the PCB, and the owner
ruled on 2026-10-17 that it buys nothing on perfboard. Same shape: **the model
holds PCB-correct design, a stripboard layout is a bench prototype of it, and
some declared properties do not apply to the bench build.** Nothing in the
tooling distinguishes the two contexts, so every such property leaks onto the
bench sheet.

**TWO WRONG FIXES, both of which an agent would reach for.** This entry has
already proposed one of them. Neither is right:

1. **Changing or removing `mating: "stacking"`.** This entry previously
   recommended exactly that - *"either `mating` gains a word for a field that
   takes bare soldered leads, or the junction stops declaring a field at all"* -
   which would **delete a true fact about the PCB to suit a prototype's build
   sheet.** The spec's *"The junction is a stacking 2x05 bus"* is right and
   stays.
2. **Deciding the boards are mislaid out.** An earlier version of this entry
   measured the five adopted layouts against the stacking claim, found the
   junction's two rows far apart on all five, and concluded they needed
   re-laying out. Nothing is meant to span those rows on stripboard. **The
   boards are fine.** The mistake is kept here because an agent that takes
   generated prose as authority over a settled decision will make it again.

- **Found** `2026-10-17`, Task 6 of the pad-label plan, reading the printed
  pages; corrected twice the same day by the owner.
- **Evidence** `parts.ts:127`; `part-text.ts:189-200`; the generated text in
  `boards/pultec-low-boost/wiring.md`; four occurrences of `5-pin header` in
  that board's `guide.html`.
- **Verified** yes - the controller read the declaration, the generator and the
  output.
- **Why it is open** the fix needs a notion the tooling does not have: which
  artifact a sheet describes. That is a design decision about the model's
  vocabulary, not a wording change, and **no agent picks it** - the first
  attempt to pick it proposed destroying PCB design data.
- **What would settle it** a way for a generated sheet to say which of the two
  boards it is for, so PCB purchase guidance reaches the PCB packet and the
  bench sheet says what to solder into the field instead. **The ground-row
  question belongs with it**, since it is the same distinction wearing different
  clothes - but only the SHEET half of it now: see below.
- **NARROWED 2026-10-18 by the owner's ruling on the ground row.** He was asked
  whether a zero-cut `hi-boost` was worth re-approving two adopted boards and
  answered *"Leave the approved boards alone for bow"* (*"now"*), which is
  recorded in G47. **That removes the layout half of this entry from play
  entirely.** Nothing here is about re-laying out a board any more: the ground
  row stays on all five, for continuity reasons G47 establishes independently
  of his preference, and what is left is the original question - that a
  generated sheet cannot say which artifact it describes, so it explains a
  ribbon cable's return path to somebody soldering wires and tells them to fit
  a header nobody fits.
- **THREE CANDIDATE DESIGNS WERE PUT TO HIM AND HE HAS PICKED NONE**, so this
  stays open and **no agent picks one**. Recorded so the options are not
  re-derived from scratch, and recorded as OPTIONS rather than as a
  recommendation reaching the artifact through the producing agent:
  1. **The field declares both fittings.** `JUNCTION_FIELD` keeps
     `mating: "stacking"`, true of the PCB, and gains how the field is fitted
     at the bench (soldered leads, no part); each sheet prints the one for its
     audience. The dispatch table at `lib/board/part-text.ts:219` is already
     keyed by `mating`, so this is one new word and one new entry. **Note the
     tension with this entry's own WRONG FIX 1**: that rejected REPLACING the
     stacking word, which would delete a true PCB fact; adding a second,
     co-existing fitting does not, but the two are close enough that the
     distinction must be argued rather than assumed.
  2. **The sheet declares its audience.** A target on the board declaration,
     with generators filtering PCB-only guidance on it. More general, and it
     prepares for the PCB packet - but **today it would be a flag with one
     possible value**, since every board under `boards/` is a stripboard and
     the declaration file is named `perfboard.json`, so the other branch would
     never be exercised.
  3. **Fix the generator only.** Stop printing purchase guidance for a pin
     field at all. Cheapest, and it throws the guidance away for when the
     PCBWay board does arrive.
- **A correction to this entry's own framing, worth keeping.** It says the fix
  "needs a notion the tooling does not have: which artifact a sheet describes".
  Measured: `lib/model/types.ts:113-114` admits exactly ONE value,
  `readonly mating: "stacking"`, and every board that exists is a stripboard.
  So there is no ambiguity for a target flag to resolve - **the model can only
  say the PCB thing, and it says it onto a sheet that is always a bench
  sheet.** That is a wrong default rather than a missing distinction, and it is
  why option 2 is weaker than it looks.

### G45 - the packet gives a panel control the value `landing pad`, so the pages never state the pot's value and taper, nor that one switch is a single pole of a gang shared with another board

**NARROWED 2026-10-18 TO THE HALF THAT SURVIVED THE CHANGE SPECCED TO SETTLE
IT.** This entry read *"the printable packet carries none of the conditionality
the wiring sheet carries, and never mentions the wiring sheet"*, and it named
two acceptable fixes - print the conditionality into the packet, or have page
one name `wiring.md` as a page you must have in your hand.
`docs/superpowers/plans/2026-10-18-the-packet-shows-the-clusters.md` did
**both**. Every claim the old entry made was re-read against the regenerated
`boards/pultec-low-boost/guide/guide.html` and
`boards/pultec-low-cut/guide/guide.html`, one at a time, before this rewrite:

| the old claim | what the pages say now |
| --- | --- |
| the packet carries none of the sheet's conditionality | **FALSE.** Every part row carries a `Fit` cell (`always` / `only with the <section> group`); a **Stand-in groups** section prints a block per group with the sheet's own rules verbatim - *"Populate a group whole, or leave it empty"*, *"One group, one board"*; the 16-row *What to populate, by build* table is printed whole |
| the packet never mentions the wiring sheet | **FALSE.** Page one's provenance block reads *"Wiring guide \| boards/pultec-low-boost/wiring.md - this packet does not replace it, read it alongside this one"*, and the stand-in section points at it twice more |
| `SI_` parts are listed beside the board's own parts with nothing distinguishing them | **FALSE.** Eight rows on low-boost read `only with the <section> group` in the `Fit` column, across three sections |
| building from the checklist alone populates every stand-in group in every build | **FALSE**, for that reason, and the section's first line is a blank for the build being built, so no group decision below it can even be read until it is filled in |
| the junction table gives the control itself the value `landing pad`, so the pages never say the pot is 47k LOG or that the switch has six positions | **STILL TRUE - and it is now the whole of this entry** |
| a builder fits a separate six-position switch per board where one shaft is meant to turn two | **STILL TRUE** |

**THE RESIDUAL, measured on both regenerated packets.** `wiring.md` heads its
panel sections *"RV_LO_BOOST - 47k LOG potentiometer"* and *"SW_LO_BOOST -
6-position switch"*, and carries a paragraph the packet has no counterpart for:

> *"**Ganged (`lo_freq`).** This is one pole of a two-pole switch shared with
> another board - not a switch of its own. Both poles turn together on one
> shaft, and fitting two separate switches makes two controls out of what should
> be one."*

The packet gives both controls the Value cell `landing pad`, twenty rows of it
in the **Wire-to-board junctions** table on each low board. That cell is not
wrong about the BOARD - a landing pad is what the board has, and the Mounting
cell says *"n/a: a landing pad has no body to mount"* - but it is the board's
fact standing in the column where the control's own specification would go, and
`LOG`, `potentiometer`, `6-position`, `gang` and `stacking` appear nowhere in
either packet. The switch's six positions do reach the page as six named pads
(`LO BOOST 20Hz` ... `LO BOOST 200Hz`), so a reader can count them; nothing
says they are one switch's positions, and nothing says the switch is half of
another board's.

So a builder holding only the packet can wire every panel terminal into the
right hole and still not know which part to buy for the panel, or that one of
this board's two selectors is a pole of somebody else's switch.

**WHY NAMING THE SHEET DOES NOT CLOSE THIS, although the old entry's "what
would settle it" could be read as saying it does.** Page one now names
`wiring.md`, so the information is one document away rather than nowhere, and
that improvement is why the rest of this entry is gone. It does not cover the
gang: fitting two six-position switches is a wrong build that the packet gives a
reader no cue to question, and the apparatus this plan added exists precisely to
stop that class of error for the stand-in groups - it stops it by putting the
condition on the row, and this one is left to a cross-reference.

**NOT G1, which is adjacent and was checked before this rewrite.** G1 is that
two representations of a panel control exist - a header PART and a pad path -
and nothing chooses between them; its own last bullet records the two
vocabularies, `RV_LO_BOOST | landing pad | F7 LO BOOST wiper` against
`wiring.md`'s pad-ordinal table. This entry is about information in NEITHER
representation: the part's specification and the gang. Settling G1 would not
print `47k LOG`.

- **Found** 2026-10-17, the previous plan's Task 6, reading the printed packets;
  **narrowed to this residual 2026-10-18**, Task 7 of the packet plan, by
  re-reading both regenerated packets claim by claim rather than by assuming the
  change that cited this entry had settled it.
- **Evidence** the table above, read off both regenerated `guide.html` files;
  `grep -o` over each returns 20 for `landing pad` and 0 for each of `LOG`,
  `potentiometer`, `6-position`, `ganged`, `gang` and `stacking`, while
  `boards/pultec-low-boost/wiring.md:35`, `:45` and `:57` carry all of it. A
  check that could have failed: the same greps return 9 for `stand-in`, 5 for
  `populate`, 12 for `only with the` and 1 for `wiring.md`, which is how the
  four dead claims above were established as dead.
- **Verified** yes - both packets regenerated by the writer
  (`make -C boards/<board> guide`) and read. The regeneration reproduced
  `guide.html` and all four SVGs byte-for-byte against what was already on
  disk, so what was read is what the generator produces.
- **Why it is open** what a board document should say about a part that is not
  on the board is a question about the artifact AND about its scope - the packet
  is a board sheet and the panel is not the board - and whether the packet
  absorbs the panel specification or keeps pointing at the sheet is the owner's,
  who wrote the sheet this would duplicate. It is also G44's shape: a fact
  correct for one artifact (`landing pad`, true of the board) printed in a
  column where a different artifact's fact belongs.
- **What would settle it** either the packet prints the panel part's
  specification and the gang warning beside its terminals, or page one's naming
  of `wiring.md` is ruled sufficient for panel parts and that ruling is recorded
  here. **CRITERION: a builder working from the packet does not fit two
  six-position switches where one shaft is meant to turn two.** A pointer at
  another document CAN meet that criterion, since it is met by a reader who
  follows the pointer - which is why this wants a ruling rather than a fix an
  agent picks.

### G40 - what a coil's pads should say on a build sheet was decided by an agent, and the entry recording it as unconfirmed was deleted with the gap it sat in

A board's inductor pads now print `HI BOOST 100MH a` and `HI BOOST 100MH b` -
the coil's function, its value, and which end. **Eighteen printed pads across
two committed boards take their wording from that choice**: four coils on
`pultec-hi-boost`, five on `pultec-mid`.

**It was decided by an implementing agent, not by the owner.** The controller's
ruling named the `RV_` and `SW_` prefixes; `L_` was added on the implementer's
judgement, because the committed hi-boost and mid layouts carry those pads and
the alternative was no guide page for two of the five boards. **That reasoning
is sound and the call was flagged rather than hidden** - which is the sanctioned
channel working.

**What went wrong is bookkeeping with teeth.** The deleted G37 carried *"an
owner line on what an inductor-tap pad should read"* among the things that would
settle it. G37 was correctly deleted - its gap had dissolved - and that question
went with it, surviving only in a gitignored task report. **The wording of
eighteen pads on a printed build sheet is a criterion about the artifact, and
the invariant says the producing agent may not author one.** The decision stands
until the owner rules; what was missing is any durable record that it is still
his to rule on. This entry is that record.

- **Found** by the Task 2 re-reviewer, as a consequence of a correct deletion.
- **Evidence** the sweep's own counts: hi-boost 21 off-board pads including 8
  inductor pads, mid 28 including 10.
- **Verified** yes - the controller read the counts and the labels.
- **Why it is open** it is the owner's to confirm, and nothing else is blocked
  on it.
- **SETTLED 2026-10-17: the owner was asked and declined.** Shown
  `HI BOOST 100MH a` and told `MID 0R45H b` was the weakest of them - RKM
  notation for 0.45H reading as a BOM value rather than a panel word - he said:

  > *"i don't have a strong opinion about either"*

  **So the agent's wording stands, and it stands differently than before.** The
  invariant forbids an agent AUTHORING a criterion for its own artifact; it does
  not forbid one standing when the owner has seen it and declined to rule. The
  difference is the asking, and that is now on the record rather than in a
  gitignored report.

  **This entry is kept open rather than deleted**, because a declined question
  is not a closed one: he may rule the first time he builds from one of these
  pages and reads `MID 0R45H b` with an iron in his hand. **Nobody asks him
  again unprompted.** If he rules later, that ruling supersedes this note and
  the entry goes.

### G49 - a DIP has no shape in the guide renderer, so pt2399-core still cannot be drawn

`bodyFor` (`tools/guide/part-shapes.ts`) has **no `DIP` branch at all** -
`grep -n 'DIP' tools/guide/part-shapes.ts` returns nothing. `pt2399-core`'s U1
is a `DIP16`, so rendering that board refuses with `no drawing for VeroRoute
part type "DIP16"`.

**This is the same gap G3 was**, one part type over: the renderer's vocabulary
was written for the transistor-preamp boards and does not cover everything the
repository's own fixtures carry. G3 closed the ceramic case and this is what
was behind it.

- **Found** `2026-10-18`, Task 2 of the hygiene batch, while rendering
  `pt2399-core` to look at the ceramic capacitors it had just given a shape.
  **The task flagged it and correctly did not fix it** - it was out of scope -
  but recorded it only in its own gitignored report, which this file's preamble
  says does not count. The controller recorded it here rather than spending a
  round on it.

  **CORRECTED, and the correction is the point.** This entry first said the
  rule "was broken by the task immediately after that rule was made repo-wide".
  **That was wrong and the Task 2 reviewer checked it rather than accepting
  it:** the rule landed in `645f57f` at 19:20 the previous evening; the entry
  carrying the overstatement was written at 05:45 the next morning, about ten
  hours later. **`f3ffea4` sits between them and followed the rule correctly**,
  deleting G7, G8, G26 and G46 as it settled them. **The first count written
  here - "three intervening commits" - was itself imprecise**, as the Task 3
  reviewer noted: the first-parent distance is five or six depending on whether
  a merge and an unrelated commit count. One verified compliant commit is the
  claim that matters and is the one stated.
  The miss is real; the framing made it sound like the rule failed its first
  test, which it did not. **An entry in this file is held to the same standard
  as the evidence it cites, including when the author is the controller.**
- **Evidence** the empty grep above; `DIP16` in
  `tests/fixtures/stripboard/pt2399-core.dump`; the task rendered that fixture
  only by stripping U1's `PART`/`PIN` lines, which is how it saw the ceramics
  at all.
- **Verified** yes - the controller ran both checks rather than relaying the
  report.
- **Why it is open** out of the task's scope, and `pt2399-core` fails `make
  check` for unrelated recorded reasons anyway, so nothing is blocked on it
  today.
- **What would settle it** a `DIP\d*` branch with a test, following the shape
  the ceramic and film branches already use - a box around the pins with pin 1
  marked, and no claim about a body dimension nothing records. Then render
  `pt2399-core` whole, without stripping a part, and look at it.


### G50 - `padTable` in `lib/board/wiring.ts` still trusts `positionsByPin`'s collapsed value, so a second pole would print a frequency in the generated `wiring.md` even though the guide's own pad label now refuses it

G41 recorded that a multi-pole rotary's second pole, named anything other than
the literal `common`, would be printed with a frequency rather than refused.
Task 3 of the hygiene batch settled that for `tools/guide/pad-label.ts`: the
pole is still recognised only by the one spelling, but a terminal is now
labelled only when it closes at EXACTLY one position in `contacts`
(`positionsClosingOnto`), and anything else - zero positions, or a second
pole closing at a different position per detent - refuses by name.

**That fix is local to `padLabelOf`.** `padTable` (`lib/board/wiring.ts:174-195`)
builds the `Selects` column of every section's `wiring.md` from the same
`positionsByPin` map directly - `selects[pin] ?? "—"` at line 192 - with no
equivalent check. A second pole would not refuse there: it would print
whichever position `positionsByPin`'s last-write-wins fold landed on, in the
committed build sheet, with no error to catch it.

- **Found** while deleting G41, checking what the deletion took with it -
  G41's own "Evidence" named `padTable` as carrying the same assumption, and
  Task 3 did not touch `lib/board/wiring.ts`.
- **Evidence** `lib/board/wiring.ts:180` (`positionsByPin(component)`) and
  `:192` (`selects[pin] ?? "—"`), unchanged by this task.
- **Verified** yes - read directly; `wiring.ts` has no test driving a
  multi-pole rotary, so this is a reading of the code rather than an observed
  wrong table.
- **Why it is open** out of Task 3's scope (`tools/guide/pad-label.ts` and its
  test only), and no committed board has a multi-pole rotary landing as pads,
  so no generated `wiring.md` is wrong today.
- **What would settle it** the same question `padTable` already answers with
  a dash for a pot (which has no positions at all): what a `Selects` cell
  should say for a terminal `positionsByPin` cannot resolve to one position.
  A dash reads as "nothing to select," which is true for a pot but would be
  false and misleading for an unresolved rotary terminal - so this likely
  wants `padTable` to refuse the way `padLabelOf` does now, not a dash,
  with a test driving a second pole the way `tests/guide/pad-label-second-
  pole.test.ts` does.

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

### G43 - the typecheck gate used to be a function of files that are not in the repository

`tsconfig.json` had `include: ["**/*.ts"]` and excluded only `node_modules`,
`dist` and `.claude`. **`build/` is gitignored but was not excluded**, so
`bun run typecheck` - which `make check` depends on - compiled every leftover
scratch driver in `build/scratch/`.

The consequence, observed rather than imagined: widening `RenderOptions` with a
required field turned the ROOT `make check` red, on eighteen errors, in
twenty-five one-shot drivers that are **not in the repository and never were**.
A gate whose result depends on untracked files is not checking the repository,
and the cause is invisible to review because the files are ignored.

**FIXED in the same change that found it**: `build` is excluded. Typecheck is
green, and the five Pultec boards' own checks pass. Root `make check` remains
red on `pt2399-core` and the transistor-preamp boards for reasons predating all
of this.

- **Found** `2026-10-17`, Task 3 of the pad-label plan, which widened the
  interface the drivers were written against.
- **Evidence** `bun run typecheck` naming `build/scratch/*.ts` exclusively;
  `git check-ignore` confirming `build/` is ignored; the root gate red and the
  per-board gates green at the same moment.
- **Verified** yes - run before and after.
- **Entry kept rather than deleted** because the fix has a cost worth stating:
  **the scratch drivers are no longer typechecked, and they are currently how a
  board gets produced.** A broken driver now fails at run time instead of at
  typecheck. That is the right trade - relying on a gate over gitignored debris
  is relying on debris - but the real answer is G30: give the producer a
  committed verb, and the driver becomes source that is typechecked because it
  is part of the repository.
- **AND THE COST IS OPEN-ENDED, NOT THE TWENTY-FIVE FILES FOUND TODAY.** The
  Task 3 reviewer caught this entry reading as though the problem were a fixed
  set of drivers. It is not: **every future file placed under `build/` also
  loses the net**, silently, because it is excluded by rule rather than by name.
  Same shape as the fault that triggered this, smaller blast radius only because
  it is now deliberate. Anyone adding a durable script under `build/` is adding
  it outside the gate, and the answer is to put it in the repository instead.

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
`CRITERIA G2.5` decide the question it already can.

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

**3. `CRITERIA` §9's own wording is not reconciled with the channel.** `CRITERIA G2.5`
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

**What stands behind it is `CRITERIA G4`** (not this register's G4, which is deleted - see the note at the top of this file)**.** `adoptLayout` runs `make check` on the board
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

### G51 - a wire's out-of-range refusal would quote `2..2147483647`

**THIS ENTRY IS THE SURVIVING HALF OF G18**, which the hygiene batch's Task 5
settled and deleted. G18 carried it as *"a cosmetic relative, recorded here
rather than as its own entry"*; the fix to the two stretch bounds did not touch
it, so it is promoted to its own entry rather than deleted along with the entry
it was lodged in. Deleting an entry does not settle what the entry merely
happened to be carrying.

`Headless_materialize_span.cpp:217-219`'s out-of-range refusal is on the wire
path as well as the moulded-part path, and `CompTypes::GetMaxLength(COMP::WIRE)`
is `INT_MAX`, so a wire refusal would read *"outside the 2..2147483647 holes
this build allows a Wire to be"*.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 2's re-reviewer, beside the
  defect that was G18. Re-read by Task 5 of `2026-10-18-the-hygiene-batch`, which
  confirmed the stretch-bound fix leaves it exactly as it was.
- **Evidence** `.tools/veroroute-perfboard/Src/Headless_materialize_span.cpp:217-219`,
  `CompTypes::GetMaxLength`'s `case COMP::WIRE: return INT_MAX;`,
  `GetMinLength`'s `case COMP::WIRE: ... return 2;`, and
  `GetMakeInstructions`'s `case COMP::WIRE: rows = 1; cols = 3;`.
- **Verified** yes - all four read directly by Task 5, including the "a fresh
  `WIRE` is 3 cols against a minimum of 2" claim G18 asserted without citing
  where it came from.
- **Why it is open** it is unreachable: `ParseWire` refuses a degenerate wire and
  a fresh `WIRE` is 3 cols against a minimum of 2, so the refusal has no input
  that fires it. It is a message path that did not exist before the materialise
  loops were merged, and it is cosmetic - a number in a sentence nobody can make
  the program print.
- **What would settle it** either saying *"any length from 2 holes up"* when the
  maximum is `INT_MAX`, with a test that reads the sentence, or a decision that
  an unreachable sentence is not worth a branch.

### G52 - at `min + 1` the fork's two stretch bounds agree on the range and not on the gesture, and `--stretch` reports success for a stretch that did nothing

**THIS IS THE RESIDUAL OF THE G18 FIX, recorded by the agent that made it.**
Task 5 of `2026-10-18-the-hygiene-batch` gave `Grid::StretchComplex` a guard that
refuses a STEP that would leave `CompTypes::GetMinLength`..`GetMaxLength`. So a
2-increment type at `min + 1` is no longer allocated at `min - 1` - it is not
reallocated at all. `FootPrint::CanStretch`, which reads only
`GetCols() > GetMinLength(m_type)`, still says yes.

The two therefore agree about the RANGE and disagree about the GESTURE, and the
consequence is a verb that reports success for nothing:
`Headless_stretch.cpp`'s `RunStretch` asks `CanStretch`, runs the sequence, checks
that nothing floated, saves and returns **0** - it never compares the column count
before against the column count after. `--materialize` does not have this
hole: `StretchToLength` (`Headless_materialize_span.cpp`) has carried a
"`Component::Stretch` left it at N while reporting that it could change it"
refusal since the parity guard landed, and that refusal is what would fire.

**THE REFUSAL THAT FIRES NOW SAYS THE WRONG THING, and that is part of this
entry rather than a separate one.** `StretchToLength`'s third refusal ends *"which
is a defect in this build's stretch rather than anything about the document"*.
Before the fix that sentence was true: a no-op there could only mean the
allocator and the permission test had come apart by accident. After the fix, in
the one case it now fires - a component at `min + 1` asked for `min - 1` - the
no-op is a DELIBERATE refusal by the guard, so the message blames the build for
doing the right thing. It still refuses rather than proceeding, which is why this
is a wording defect and not a behavioural one.

- **Found** Task 5 of `2026-10-18-the-hygiene-batch`, by the agent that wrote the
  fix, while reasoning about what the fix leaves rather than after a failure.
- **Evidence** `--verify-stretch-bounds --type BLOCK_200 --cols 4 --direction
  shrink` against the rebuilt binary prints `CANSTRETCH YES` and `AFTER 4`
  with `MIN 3` - permission granted, nothing done. `RunStretch`
  (`.tools/veroroute-perfboard/Src/Headless_stretch.cpp`) has no before/after
  column comparison; `StretchToLength`'s third refusal does.
- **Verified** yes - run, not predicted.
- **Why it is open** **no HEADLESS door puts a footprint at `min + 1` for those
  three types**, and that is arithmetic rather than a property of the fixtures
  that exist: `Component`'s constructor builds
  `SWITCH_ST`/`SWITCH_DT`/`BLOCK_200` at `2 * poles - 1` or `1 + 2 * pins`,
  `Component::Stretch` moves them by 2, `StretchToLength` refuses a length the
  increment cannot reach, `--import`'s length option for these types is a pin
  count rather than a column count, and a retype rebuilds the footprint from the
  type's default. The alternative fix - making `CanStretch` increment-aware so it
  refuses at `min + 1` - changes what the GUI greys out and would make
  `StretchToLength` print *"outside the 3..511 holes this build allows"* about a
  length of 4, which is inside 3..511. That is a worse sentence for a reachable
  case in exchange for a better one for an unreachable case, and it is not the
  trade this task was asked to make.
- **THE QUALIFIER "HEADLESS" WAS ADDED AT FIX ROUND 1 AND IT MATTERS.** This entry
  and the fork's own comments first said *nothing on a board can be at `min + 1`*,
  without qualification. That is wrong, and the Task 5 reviewer found the door:
  `CompDefiner::Build`
  (`.tools/veroroute-perfboard/Src/CompDefiner.cpp:96-103`) sets a component to
  `COMP::CUSTOM`, overwrites that with the real `COMP` when the import string cuts
  to a reserved one AND `TemplateManager::CheckAllowOverWrite` finds a
  user-defined library part with the same (Type, Value, Import) strings, and then
  calls `comp.Allocate(1, m_grid.GetRows(), m_grid.GetCols())` with the component
  editor's own grid - **which carries no parity, minimum or maximum constraint at
  all**. `FootPrint::Load` (`FootPrint.h:317-325`) restores whatever dimensions a
  `.vrt` carries without checking them, so a board built through that door loads
  into every headless verb intact. Checked while recording this: the door is
  GUI-only in both halves - `CompDefiner::Build` is reached only from
  `Component`'s definer constructor, **whose only call site in the tree is
  `Src/mainwindow.cpp:2314`** - unambiguously GUI, which is what the argument
  needs; and `m_listUser`, which
  `CheckAllowOverWrite` searches, is filled only by
  `TemplateManager::Add(false, ...)` from the GUI library dialog, while every
  headless verb builds a `TemplateManager` with `SetPathStr` plus `AddDefaults()`,
  which populates `m_listGeneric` only. So `CheckAllowOverWrite` is
  unconditionally false in a headless process and the type stays `COMP::CUSTOM`.
  **The consequence for this entry is that the residual is reachable in principle,
  not only on paper** - which strengthens the case for the cheap fix below rather
  than weakening it.
- **What would settle it** either a `RunStretch` that refuses when the gesture
  changed no columns, in the shape `StretchToLength` already uses - cheap, and it
  closes the silent-success path whether or not anything can reach it - or an
  increment-aware `CanStretch`, with the message consequence above handled, with
  a test beside whichever is chosen. The `StretchToLength` wording above wants
  fixing alongside whichever is chosen; it is one clause.
- **A note on how G18 was settled, because the register's own wording was part of
  it.** G18 said the fix was *"most likely by giving `StretchComplex` the same
  `>`/`<` test `CanStretch` uses"*. That mechanism does not meet G18's own stated
  criterion: with `!bGrow && GetCols() > min` the step still runs at `min + 1`
  and still lands on `min - 1`, because the step is 2 and the test only knows
  about 1. The criterion - *"a test that puts a 2-increment type at `min + 1` and
  asserts it does not go below `min`"* - was taken as the settlement and the
  mechanism was not. The disagreement is recorded here rather than resolved
  silently.

### G53 - two unguarded `while (GetCols() != reqLength) Stretch(...)` loops in the fork hang if the allocator declines, and the G18 fix widened the window by one column

`Component`'s constructor (`Component.h:121-139`, three copies of the pair - one
per type group) and `TemplateManager::CheckPartOK` (`TemplateManager.h:405-408`)
both size a fresh footprint with the same shape:

```cpp
while ( comp.GetCols() < nLength ) comp.Stretch(true);   // grow
while ( comp.GetCols() > nLength ) comp.Stretch(false);  // shrink
```

Neither loop asks `CanStretch` and neither has a no-progress guard. **If
`Component::Stretch` declines while the loop still wants more columns, the length
never changes and the process spins forever.** There are two ways to get there and
they behave differently, which is why the entry separates them:

- **`CanStretch` says NO and `Stretch` is called anyway.** `FootPrint::Stretch`
  opens with `assert(CanStretch(bGrow))`, so this build aborts rather than hangs -
  the fork compiles with `-DQT_NO_DEBUG` and **no** `-DNDEBUG`, so plain `assert`
  is live. A build that defined `NDEBUG` would hang here instead. Pre-existing and
  untouched by Task 5.
- **`CanStretch` says YES and `Grid::StretchComplex` declines.** The assert passes,
  so this hangs in **any** build, asserts or not. This is the window Task 5's fix
  widened, and it is the only one worth measuring.

**Task 5's fix widened that second window by exactly one column**, and the entry
says so rather than leaving it for someone to find.

The old guard declined a grow only at `GetCols() == max`; the new one declines
whenever `GetCols() > max - increment`, so for the three increment-2 types the
hanging set is `{max - 1, max}` rather than `{max}`. Same at the bottom:
`{min, min + 1}` rather than `{min}`.

- **THE FORK'S OWN COMMENT CARRIES THE OLD MISCITATION, deliberately not
  fixed yet.** `Src/Headless_stretch_bounds.h` states the same wrong caller
  list. It is a comment, the conclusion it supports is unaffected, and
  correcting it costs a fork commit, a pin bump and a full rebuild cycle -
  which is not proportionate on its own. **Whoever next changes that file
  fixes it in passing.** Recorded here rather than left as a discrepancy
  between two documents that a reader would have to reconcile alone.
- **Found** Task 5's reviewer, `2026-10-18-the-hygiene-batch`, fix round 1, while
  checking what else reads the guard that changed.
- **Evidence** the two loops at the lines above, read; `Grid.h`'s new guard, read;
  `grep -o "DNDEBUG\|DQT_NO_DEBUG" .tools/veroroute-perfboard/build/Makefile`
  returns `DQT_NO_DEBUG` only - a check that could have returned both.
- **Verified** yes - the loops and the build flags were read directly rather than
  relayed, and the widening was worked out from the guard's own arithmetic.
- **Why it is open** **unreachable from a default-built footprint, which is the
  only kind either loop ever sees.** Both loops run on a footprint just built by
  `BuildDefault`, so it starts ON the type's lattice; `TemplateManager` has already
  bounded `nLength` to `GetMinLength..GetMaxLength` before the loop
  (`TemplateManager.h:391-396`); and for the three increment-2 types the import
  suffix is a PIN COUNT, so `nLength` is 0 and that loop never runs for them at
  all. The constructor's own `reqLength` is derived from a pin count already
  bounded by `GetMinNumPins..GetMaxNumPins`, which maps onto the lattice by
  construction. Reaching the hang needs a footprint already off-lattice, which is
  the `CompDefiner::Build` door recorded in G52 - and that door builds the grid
  directly instead of going through either loop.
- **What would settle it** give both loops the guard `StretchToLength`
  (`Headless_materialize_span.cpp`) already has and exists to provide: refuse
  before the loop when the increment cannot reach the target, and refuse inside it
  when a step changed nothing. That refusal was written for exactly this loop shape
  - its own comment says *"PlaceDeclaredWire had this same loop shape before it was
  folded into this function, and was immune only because WIRE's increment is 1"* -
  and these two are the remaining copies it was never folded into.

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

**THE OWNER HAS NOW ANSWERED THE QUESTION THIS ENTRY CALLED HIS, 2026-10-18,
AND ITS OWN SUGGESTED MECHANISM DOES NOT MEET ITS CRITERION.** Read this before
the rest of the entry, which was written when the drawing question was open.

His words, relayed by the controller on 2026-10-18 and **not heard directly by
this writer**:

> *"The per-board schematics need to be derived from the canonical schematic -
> that's a crucial part of modularizing. It's not a blocker, it's a
> REQUIREMENT"*

So each section does get a schematic, the canonical
`circuits/pultec/pultec-three-band-eq.kicad_sch` **stays** the authority for all
five, and the per-board schematic is a further derivation along the chain
`CLAUDE.md` already states for an imported design. The work is sub-project T2 of
`docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`, which now
carries the chain and the requirement verbatim under **Authority hierarchy**.
This entry stays open because the schematics do not exist yet; what is settled is
whether they should.

**WHAT DOES NOT FOLLOW, AND IT IS THIS ENTRY'S OWN MECHANISM.** "What would
settle it" below says *"draw it, declare the `sch`/`netlist` pair, and the packet
prints it with no further change"*. That is a MECHANISM, written by somebody who
had not tried it, and per `CLAUDE.md` the criterion is the settlement. Three
things measured 2026-10-18 say the mechanism as written does not reach it:

- **The comparison gate it leans on is aimed at the wrong point in the chain.**
  `netlist-agrees` would compare the declared `netlist` against the declared
  `sch`; this entry's own body measures that a whole-EQ netlist declared on a
  section board rejects. The spec's gate 4 names exactly that direct whole-EQ-to-
  section comparison and has been marked a defect in the spec for it. The
  authority is not in question - only where the comparison is made, and each step
  of the derivation needs to be checkable rather than one end-to-end comparison
  that skips the steps.
- **A section board carries parts the whole EQ does not have**: 6 to 9 stand-in
  components and two `physicalOnly` 1x05 junction headers per board (measured:
  low-boost 19 components total, low-cut 20, hi-boost 27, hi-cut 21, mid 39).
  These are products of modularization and are themselves derived - not foreign
  matter - but they enter below the netlist export, so nothing above that step
  predicts them.
- **If the declared pair becomes a GENERATED schematic plus its own generated
  netlist fixture, `netlist-agrees` compares a generated artifact against a
  generated artifact** and the freshness guard stops guarding anything a human
  did. That is a real possibility the mechanism does not consider, and it is not
  resolved here.

**AND A SECOND QUESTION THE MECHANISM HIDES: which configuration does a section
schematic depict?** `physicalBoard(s) = boardNetwork(s, {s})`
(`circuits/pultec/physical/board.ts:332`) is the standalone build - one of 31 -
and the other 30 omit some stand-in groups, with which board supplies which group
moving as boards are added (`lib/board/scaffold/supplier.ts`: *"the assignment is
stable only while boards are added LATER in `LADDER_ORDER`"*). The maximal network
with a per-part fit condition, one sheet per build, and the section's own parts
only are three different drawings. **Unanswered, and deliberately not answered
here.**

**A THIRD REPRESENTATION BECOMES A FOURTH.** Each board already has three
generated descriptions of itself - `wiring.md`, the printed packet, and the
`.vrt` layout - and **G1** and **G45** record that two of them already disagree
about a panel control, measured and surviving. A generated schematic is a fourth
vocabulary for the same board, and neither this spec nor any gate in it checks
cross-artifact agreement.

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
  2026-10-17 when the packet path was made to produce without a schematic;
  **extended 2026-10-18** by a drift check of
  `docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md` run before
  T2 was planned, plus the owner's answer above. The drift-check file itself is
  `.superpowers/sdd/schgen-drift-check.md`, which is gitignored, so this entry
  and the spec are the only durable records of it.
- **Evidence** the two declarations (`circuit`, `export`, `vrt` and nothing
  else); `ls circuits/pultec/*.kicad_sch`; the `NOTICE` printed by
  `make -C boards/pultec-low-boost guide`; the generated
  `boards/pultec-low-boost/guide/guide.html`, read as a printed PDF. **For the
  2026-10-18 extension:** the per-board component counts were produced by this
  writer, running `physicalBoard(section)` for all five sections and counting
  components and those carrying no `part.symbol` - a check that could have
  failed, and which disagreed with nothing (19/20/27/21/39 total, matching the
  drift check's own figures); the owner's quote as relayed; `gate 4` and the
  authority rows read in the spec at `1dd5814`.
- **Verified** yes - run, and the pages read. **For the 2026-10-18 extension:**
  the component counts are this writer's own measurement; the owner's words are
  a **relay** from the controller, not heard directly; the claim that
  `netlist-agrees` rejects a whole-EQ netlist on a section board is the original
  entry's measurement and is NOT re-run here.
- **Why it is open** a per-section schematic is a drawing somebody has to make,
  and **whether these sections should have one at all is the owner's call**: the
  partition in `circuits/pultec/physical/board.ts` is currently the only
  statement of what a section contains, and promoting it to a drawn schematic is
  a decision about where the authority for these boards lives, not a cleanup.
- **What would settle it** **SUPERSEDED IN PART BY THE OWNER'S ANSWER ABOVE, and
  kept because the mechanism it names is the one a later reader would otherwise
  follow.** It used to read: *"the owner says whether each section gets its own
  schematic (then: draw it, declare the `sch`/`netlist` pair, and the packet
  prints it with no further change), or rules that the circuit model plus the
  whole-EQ schematic is the authority these boards keep - in which case this
  entry is deleted and the printed notice is the permanent, correct statement."*
  He has taken the first branch and the second is dead - the printed notice is
  **not** the permanent correct statement.

  **CRITERION, unchanged in substance:** each of the five sections has a
  schematic of its own, derived from the canonical schematic, and the packet
  prints it instead of the no-schematic notice.

  **THE MECHANISM IN THE OLD TEXT IS WRONG and must not be followed as written**
  - declaring a `sch`/`netlist` pair on a section board is precisely what this
  entry measured as rejecting, and the three bullets at the top of this entry say
  why. What the derivation's steps are checked by is a T2-plan design question,
  not a mechanism this register may pick: an agent that chose it would be
  authoring the acceptance criteria for the artifact it is about to produce.
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
- **RE-MEASURED WITH THE DESCRIPTIVE PAD TEXT ON THE PAGE (2026-10-17, this
  plan's Task 6), AND THE NUMBER IS NOW A SHARE OF THE PAGE.** The new pad
  labels do not reach this gap: the longest spans ~3.5 hole pitches and none of
  them sets a viewBox bound on either low board, checked by computing every
  `<text>` run's extent against the board rect on all four layout images of the
  two boards. The bound is still a stand-in PART label. From the regenerated
  packets: `pultec-low-boost`'s designators image is `viewBox="-153.8 -83.5
  709.6 840.5"` against a board rect of `x=-10 width=540`, so 143.8 units - more
  than a quarter of the board's own width - are left margin holding
  `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper`, and the board occupies **76.1%** of the
  printed width. The same board's values image, whose longest left-hand text is
  the `HI_BOOST_OUT` edge label, is 668.6 wide and gives the board **80.8%**.
  `pultec-low-cut`'s designators image is 706.8 wide, **76.4%**. So the two
  component-side images of one board print it at two different scales, the
  designators page being the smaller, and one label is the whole difference. On
  the page `SI_HI_BOOST_RV_HI_BOOST.ccw-wiper` still overprints the row letter
  it passes (row C on low-boost, row I on low-cut), and on `pultec-low-cut`
  `SI_HI_CUT_C26` prints entirely outside the board outline.
- **IT IS NOW A DEFECT IN A PDF, NOT IN A FILE SOMEBODY MIGHT PRINT
  (2026-10-17, the guide-PDF change).** `make guide` now writes `guide.pdf`
  beside `guide.html`, so the thing carried to the bench is a printed artifact
  this register can be held to. Read back from
  `boards/pultec-low-boost/guide/guide.pdf` page 2 and
  `boards/pultec-low-cut/guide/guide.pdf` page 3: every overprint described
  above survives the print at US Letter, unchanged. Nothing about the
  conversion caused it and nothing about the conversion would fix it - the
  measurements above are still the ones that matter.

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

### G65 - the vendored symbol set is eight symbols and covers almost nothing a Pultec schematic needs; this was relayed to the owner as a blocker and he rejected the framing

**HIS RULING FIRST, because the whole point of this entry is that nobody
re-derives "blocker" from the same eight-symbol observation.** A drift check of
sub-project T2 of
`docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md` measured the
vendored symbol set, and the controller relayed it to him on 2026-10-18 as a
day-one blocker on generating Pultec section schematics. He rejected that,
verbatim, **relayed to this writer by the controller and not heard directly**:

> *"not having access to symbols is not a valid blocker. There are MANY symbols
> freely available in kicad."*

**He is right and it is measured, by this writer.** `/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`
holds **223** `.kicad_sym` libraries, and every symbol the Pultec was said to
lack is in one of them: `Device:C` 1, `Device:L` 1, `Switch:SW_Rotary_1x12` 1,
`Connector_Generic:Conn_01x05` 1, each counted by its own definition line in its
own library file. The same grep for `Device:NOT_A_REAL_SYMBOL_XYZ` returns 0, so
the check distinguishes a present symbol from an absent one rather than matching
anything. `CLAUDE.md` already says what this means - *"A KiCad footprint name is
checkable - the libraries are on disk. Do not write one from memory"* - and the
symbol axis has had its own disk-backed guard since a non-resolving symbol
shipped here (`tests/kicad/symbol-names.test.ts`).

**So what is left is a list and a mechanical copy, with a known source.**
`VENDORED_SYMBOLS` (`lib/kicad/symbol-library.ts:19-28`) holds exactly eight -
`Device:R`, `Device:C_Polarized`, `Device:R_Potentiometer`,
`Device:R_Potentiometer_Trim`, `Transistor_BJT:2N3904`,
`Connector_Generic:Conn_01x02`, `Connector:TestPoint`, `Jumper:Jumper_2_Open` -
and `vendoredSymbolText` throws for anything else, naming the constant and the
regeneration tool in the refusal. `tools/kicad/vendor-symbols.ts` is *"the only
thing that should write this directory"* and `lib/kicad/symbols/PROVENANCE.md`
records the KiCad version, the flattening of `extends`, and the licence position.
**Declared by circuits in this repository and NOT vendored** (relayed from the
drift check, not re-grepped here, except the four above): `Device:C`, `Device:L`,
`Switch:SW_SPDT`, `Switch:SW_Rotary_1x3_MP`..`1x9_MP`, `Switch:SW_Rotary_1x12`,
`Connector_Generic:Conn_01x05`, `Audio:PT2399`,
`Amplifier_Operational:TL072` - so both of `pt2399-core`'s declared symbols are
unvendored.

**THE LARGER NUMBER IS NOT THE LIBRARY, IT IS THE COMPONENTS THAT DECLARE NO
SYMBOL AT ALL**, and that part is this writer's own measurement -
`physicalBoard(section)` run for all five sections, counting components with no
`part.symbol`:

| board | components | with no `part.symbol` | first |
| --- | --- | --- | --- |
| low-boost | 19 | 15 | `C18` |
| low-cut | 20 | 16 | `C1` |
| hi-boost | 27 | 18 | `C14` |
| hi-cut | 21 | 17 | `C24` |
| mid | 39 | 29 | `C_MID_200Hz_A` |

`symbolFor` (`circuits/pultec/physical/parts.ts:274-299`) answers only for
`potentiometer`, `inductor` and `switch` - the off-board kinds - and its last
line throws *"no symbol is defined for off-board component"*. **There is no
symbol source for an on-board Pultec resistor or capacitor, nor for any stand-in
part.** The same is true one circuit over: `grep -c 'symbol:'` returns 0 in all
five modules of `circuits/optical-compressor/`, which the spec names as T2
verification material.

**THE ONE GENUINE DESIGN QUESTION UNDER ALL OF THIS, WHICH IS THE T2 PLAN'S TO
SETTLE AND EXPLICITLY NOT THIS WRITER'S.** A passive's symbol could be declared
**per part** (`part.symbol`, as today) or **derived from its kind**, the way
`UNIT_PINS` in `lib/model/kinds.ts` already derives a pin vocabulary by kind. Two
things bear on it and neither decides it: `CLAUDE.md` says a kind declares the
vocabulary while *"which KiCad pin number or footprint pad a pin maps to is a
property of a concrete symbol or package, and lives there"*, which cuts against
kind-derivation; and a capacitor's KIND cannot distinguish `Device:C` from
`Device:C_Polarized`, which is the one capacitor symbol already vendored, so
polarity is a part fact that a by-kind rule would have to override anyway. Both
recorded so a plan weighs them.

**AND THE SHORTCUT THAT WOULD CLOSE THIS WRONGLY**, named because it is one
function in one file and will look cheap: extending `symbolFor` in
`circuits/pultec/physical/parts.ts` with a kind-to-symbol map makes symbol
resolution a Pultec module's job, so no other circuit gets it and the next
circuit repeats it - a Pultec-specific shortcut of exactly the kind the owner's
two-part directive rules out (G66 carries that directive and where it lives
verbatim). The general place is beside `lib/kicad/symbol-library.ts`.

**One symbol question the library genuinely cannot answer, and it is already
answered by an owner part choice**: there is no 1x10 or 1x11 rotary symbol, so
the eleven-position `SW_MID` is realised as `Switch:SW_Rotary_1x12`
(`ELEVEN_THROW_SYMBOL`, `circuits/pultec/physical/parts.ts:201`), chosen by the
owner on 2026-10-13, while a ten-position selector refuses outright rather than
rounding up. A template meeting a twelve-throw symbol for an eleven-position
bank must not quietly drop the twelfth throw.

- **Found** 2026-10-18, by a drift check of the T2 spec run before T2 was
  planned (`.superpowers/sdd/schgen-drift-check.md`, U6/U7/U8/Q4 - **gitignored**,
  so this entry is the durable record), and by the owner's ruling on how it was
  relayed to him.
- **Evidence** the 223-library count and the four symbol lookups with their
  negative control, run by this writer against the installed KiCad; the five
  `physicalBoard(section)` runs and their no-symbol counts in the table above;
  `grep -c 'symbol:'` returning 0 for every optical-compressor module;
  `lib/kicad/symbol-library.ts:19-28` and `:203-208` read; `tools/kicad/vendor-symbols.ts`
  and `lib/kicad/symbols/PROVENANCE.md` read; `ls -R lib/kicad/symbols` showing
  eight `.sexpr` files.
- **Verified** yes for everything this writer ran - the library count, the four
  lookups, the five per-board counts, the optical-compressor grep, and the four
  files read. **Relayed, not confirmed:** the full unvendored list above and the
  claim that `writeSchematicStub` refuses at `C18` naming it (the 15-of-19 count
  that refusal rests on WAS confirmed independently).
- **Why it is open** the copying is mechanical but the question above it is not,
  and doing the copy first would answer it by accident: whichever place the new
  symbols are named from becomes the place symbols live. An agent producing the
  generator may not author that criterion.
- **What would settle it** **CRITERION:** every component of every circuit T2
  names resolves to a symbol that exists in the vendored set with its provenance
  recorded, and a component with no symbol refuses by name rather than being
  drawn as something plausible. **MECHANISM, untried:** add the names to
  `VENDORED_SYMBOLS` and run `bun tools/kicad/vendor-symbols.ts /Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols`,
  updating `PROVENANCE.md`'s version line. That covers the library side and does
  **not** answer where a passive's symbol is declared, which is the design
  question above and belongs in the T2 plan.

### G66 - six of the T2 template table's claims were written against one circuit, and three of them name the Pultec in the specification

**The directive that makes these defects rather than style notes**, and the
place it lives verbatim: `docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`,
section *"What the Pultec is to this work, and it is two things at once"*, added
2026-10-18 and committed at `1dd5814`. The owner, **relayed by the controller and
not heard directly by this writer**:

> *"I'm using the Pultec boards as a forcing function to drive building general
> purpose schematic authoring discipline and tooling. No shortcuts just to get
> to Pultec-specific schematics"*

> *"But, Pultec schematics ARE a requirement. If the tooling can't build them,
> it's not fit for purpose"*

Both halves bind: a generator that cannot do the Pultec is unfit, and one that
does the Pultec by special-casing is the shortcut he ruled out.

**A THIRD REQUIREMENT FROM THE SAME SITTING, recorded because it is a
requirement and not a task, and nothing should schedule it.** The owner,
2026-10-18, again **relayed and not heard directly**:

> *"We ALSO need to build support for ex nihilo schematics, but that's not our
> current situation."*

So both authority directions are required: schematic-first (the Pultec, where
the canonical schematic is the authority and per-board schematics derive from it
- G16) and **model-first / ex nihilo**, where an agent-designed circuit has no
reference drawing at all. `CLAUDE.md` already says both directions exist; what is
new is that the second is a stated requirement rather than an implication.
**It is explicitly NOT today's work and its absence is not a defect** - his
words settle that, so nobody sequences it unprompted. Two things are worth having
written down about it:

- **It needs no new material to be tested against.** Counted by this writer,
  2026-10-18: `circuits/optical-compressor/` holds **zero** `.kicad_sch` files
  and `circuits/opamp-buffer.ts` has neither a directory nor a schematic, while
  `circuits/pt2399-core/` has 1, `circuits/pultec/` 2 and
  `circuits/transistor-preamp/` 5. **Both schematic-less circuits are already in
  T2's verification set**, so T2 exercises both directions by construction.
- **The ex nihilo direction is the harder one, and the reason is the invariant
  this register exists under.** Schematic-first has a reference drawing to grade
  a generated schematic against; ex nihilo has none, so grading must come from
  the model plus a rule library reviewed before the artifact existed. **An agent
  with no reference is the agent most tempted to grade its own output.** How that
  grading works is an open question and is not answered here or in the spec.

**Measured
against that, six claims in the spec's template table are asserted rather than
earned**, and the three worst name the Pultec inside the specification of a
template that is supposed to be general:

1. **`tappedReturn` is specified as a count of its only two instances** - *"four
   or five discrete inductors from their taps to a common coil return"*. Four is
   hi-boost, five is mid, and "Needed by" names nothing else. Nothing in that
   sentence is a general tapped-inductor abstraction: not the tap-selection
   mechanism, not what makes a return common, not what a tap is.
2. **`modeSwitch` is one circuit's one switch** - *"the mid section's two-throw
   boost/cut switch"*, whose only consumer is `SW_MID_MODE`. A general
   two-throw-selects-a-branch template is `selectorBank` with a degenerate bank
   and resistive rather than capacitive throws. If it must be separate, the spec
   does not say why.
3. **`selectorBank`'s acceptance criterion is a Pultec idiom stated as a property
   of selectors.** The `passive-ladder-eq` library holds *"selector-bank
   ordering: a bank's capacitors sit in switch-position order"* and gate 14's
   degraded fixtures include *"a selector whose throws are unordered"* - so
   unordered throws are DEFINED as a defect. That is right for a frequency
   selector, which is all five Pultec banks, and wrong for a voicing or mode
   rotary whose positions have no natural order: such a selector would fail gate
   14 for being correct.
4. **`passiveChain`'s "Needed by: everywhere" is the broadest claim in the table
   and the least earned on this circuit.** Per-board own passive content is thin:
   low-cut has no resistor of its own, low-boost one (`R2`), hi-cut one (`R1`).
   On the Pultec `passiveChain` is exercised almost entirely by **stand-in**
   resistors - which is the missing stand-in-group template wearing
   `passiveChain`'s clothes, and is exactly where a special case would hide.
5. **The decoupling-bank row's two figures are TOTAL capacitor counts, not
   decoupling counts.** The row is headed "decoupling bank" and reads
   `opamp-buffer` (4 capacitors), `pt2399-core` (14). Measured by this writer:
   `grep -c '\.capacitor('` is 4 and 14, and of those the ones touching `GND`
   are **2** and **8**. The spec's numbers are right about what they count; a
   planner sizing a decoupling-bank template from them is wrong by a factor of
   two on `opamp-buffer`.
6. **`potNetwork`'s demand is undercounted: hi-boost needs two.** `RV_HI_Q`,
   10 kΩ LIN, from *"P3bandDoc.pdf p5, marked 10K LIN (Qmax)"*
   (`circuits/pultec/electrical/controls.ts:90-96`), sits on hi-boost beside
   `RV_HI_BOOST` 47k LIN - six pots in `THREE_BAND_REFERENCE`, and the spec never
   mentions `RV_HI_Q`.

**What is NOT in this entry, so it is not recorded twice.** The gate half of the
same problem - that gate 4's *"both authority directions"* claim covers the whole
EQ and says nothing about a section board - is in **G16** and is now stated as a
defect in the spec itself. The three Pultec constructs with no template at all
are also now rows in that table marked GAP; this entry is about the rows that
exist and overclaim.

- **Found** 2026-10-18, by the drift check of the T2 spec described in G65
  (§5c, P1-P5 and U14; §1.3's caveat), run before T2 was planned.
  `.superpowers/sdd/schgen-drift-check.md` is gitignored, so this entry is the
  durable record.
- **Evidence** the template table and the gate-14 text read in the spec at
  `1dd5814`; the four capacitor counts run by this writer
  (`grep -c '\.capacitor('` and the same piped through `grep -c GND` on
  `circuits/opamp-buffer.ts` and `circuits/pt2399-core/pt2399-core.ts`) - a check
  that could have failed and did disagree with the reading the row invites;
  `circuits/pultec/electrical/controls.ts:90-96` for `RV_HI_Q`. For the ex nihilo
  clause: `find circuits/<dir> -name '*.kicad_sch' | wc -l` per circuit
  directory, run by this writer, returning 0 / 1 / 2 / 5 - a check that could
  have failed, since three of the five directories return non-zero.
- **Verified** the spec text, the capacitor counts and the per-circuit schematic
  counts yes, by this writer; all three owner quotes are **relays** from the
  controller, not heard directly. The
  per-board own-passive content (clause 4), the `passive-ladder-eq` ordering
  quote (clause 3) and `RV_HI_Q`'s citation line are **relayed from the drift
  check** and not independently re-measured here.
- **Why it is open** rewriting a template's specification to be general is
  design work with a consequence for the port's shape, and it is the T2 plan's,
  not a register edit's. Four of the six clauses could be "fixed" by rewording
  the spec, which would be the wrong kind of fix: what is wanted is a
  specification somebody has thought about generally, not a sentence with the
  circuit's name removed.
- **What would settle it** **CRITERION:** no template's specification names the
  circuit that motivates it, and no template's acceptance criterion is a property
  of one circuit's idiom stated as a property of the construct. A second circuit
  exercising it is the proof; the spec has none for `tappedReturn` or
  `modeSwitch`. **MECHANISM, untried:** the T2 plan specifies each of the six
  against a construct rather than an instance, and states for each what a
  correct non-Pultec instance would look like - which is a claim that would have
  to survive review, not a wording change.

### G67 - the T2 spec's load-bearing facts have drifted from the tree in four places, and it assigns its schematic gates to a CI that does not exist

One entry for the drift a T2 planner would otherwise budget against. **Every
clause is a disagreement between a committed design document and the tree, and
none of them is fixed** - the change that recorded them fixed only the template
table and gate 4 (see G16 and the spec's own 2026-10-18 notes). Recorded with
their cost visible, per `CLAUDE.md`'s *"Where a directive and a board disagree,
record the disagreement so its cost is visible"*.

1. **"The stand-ins live on one separate scaffold board rather than distributed
   across the section boards"** (spec, S0) - **false, and the separate board was
   deliberately deleted.** `make/pultec.mk:36-38` says so: *"no separate scaffold
   board exists any more either (deleted: "Task 4, Delete the separate scaffold
   board" - the scaffolding is now build-time part population on each section
   board)"*, and the child spec
   `2026-10-09-pultec-section-scaffold-design.md:170-185` records the reversal.
   The sentence the spec draws from it - *"the physicalization problem mostly
   dissolves"* - is the premise T2 would inherit, and it is the opposite of true:
   every section schematic must draw 6 to 9 stand-ins plus two junction headers.
2. **"the transistor preamp" is five boards and six netlist-guarded schematics,
   not one.** T2's deliverable row names four circuits and gate 4's reference
   material names two schematics (`pt2399-core` and `lab-board`). There are six
   hand-arranged, `netlist`-declared, test-guarded schematics: `pt2399-core` and
   the preamp's `lab-board`, `feedback-board`, `buffered-board`, `loop-board`
   and `staged-board`. Four of the five preamp boards predate the spec, so this
   is an omission rather than drift - and it moves T2's size in both directions:
   more reference material for gate 4, four more deliverables than the row names.
3. **The spec assigns its schematic gates to a CI that does not exist.**
   Verification says *"CI acquires the engine's Python side and runs the schematic
   gates and `check-intent`"*. There is **no `.github/`** and no workflow YAML
   anywhere outside `node_modules` and the vendored `.tools/` fork; the root
   `Makefile:12-13` states it outright (*"there is no CI, bun test does not
   typecheck"*). So gates 1-6 have nowhere to run but `make check` and the
   per-board walk, and **G63** records that `boards/` has no `Makefile`, so even
   the aggregate walk is root-only. Gate 1 also requires *"the KiCad version and
   loaded symbol library versions match a committed lock"* and **there is no lock
   file** - the nearest thing is the hand-maintained "KiCad 10.0.5" line in
   `lib/kicad/symbols/PROVENANCE.md`.
4. **An authority-table path does not exist.** The table rows
   `circuits/pultec/physical/<target>/*.ts`; the directory is flat,
   `circuits/pultec/physical/*.ts`. The spec's own Directory-layout section
   explains why the `physical/perfboard/` move has not happened, so the intent is
   intact and only the path is wrong - noted so nobody writes the `<target>` path
   into a tool.
5. **`pt2399-core` is given two mutually exclusive roles and the spec never says
   which wins**: a T2 **deliverable** (generate its schematic) and gate 4
   **reference material** (grade a generated schematic against its schematic).
   For the six boards that declare `sch`, the committed `.kicad_sch` **is** the
   netlist authority and `netlist-agrees` plus `tests/circuits/<board>.test.ts`
   is the guard, while `tools/cli/schematic-stub.ts` refuses to overwrite at all
   (*"The stub is written once; after that the schematic is yours"*). Gate 1's
   "regenerates byte-identically" and that posture are not obviously compatible.
6. **Two of the four circuits the spec names as T2's verification material cannot
   even be stubbed today.** `tools/cli/schematic-stub.ts` requires the module to
   export `DESIGNATORS`, `PIN_NUMBERS` and `schematicNotes()`. Measured:
   `circuits/opamp-buffer.ts` exports none of the three,
   `circuits/optical-compressor/` none of the three and no symbol for any
   component, `pt2399-core` two of three, the five preamp boards all three, the
   five Pultec sections two of three. So the spec's *"those four circuits are
   therefore T2's verification material, not a future benefit"* is right and
   costs more than it sounds.
7. **Two things the spec could not have known, because it predates them by days,
   and a planner needs both.** `docs/known-gaps.md` became a **repo-wide
   requirement** on every agent on every task (commit `645f57f`, repeated in
   `AGENTS.md`); the spec lists 15 gates and no register obligation. And the
   repository has since built the channel the spec's agent gates want: criteria
   in a reviewed, circuit-independent file with provenance per parameter
   (`stripboard/rules.json`, `exemptions.json`, `render-approvals.json`, and
   `2026-10-10-stripboard-acceptance-criteria.md` **PAR4**: *"The criteria are
   circuit-independent, reviewed once, and there is no per-board criteria file
   ... because a per-board criteria file is a file a producing agent could
   draft"*). Gate 14's readability rubric has no such file. Routing it through
   that channel is the point; **writing the rubric from the Pultec schematics
   just produced would be this spec's own founding failure, one level up.**

**TWO RESEARCH PASSES HAVE SINCE LANDED ON CLAUSE 7'S RUBRIC QUESTION,
2026-10-19, AND THEY NARROW IT RATHER THAN ANSWERING IT.**
`docs/schematic/readability-research.md` (`51f8362`) and
`docs/schematic/generation-prior-art.md` (`ba6dba1`). What a planner holding
clause 7 now has: **there is no published threshold to put in gate 14's rubric**
for crossings, bends or wire length (**G71**); the in-force standards that would
supply layout requirements are unread (**G70**) and the readable ones are
withdrawn or inactive and must be cited as such (**G68**); of 57 candidate
criteria **35 are mechanically checkable with no number at all**, three of them
checkable here only because the model names the functional blocks (**G75**); and
**no tool either pass surveyed grades schematic semantics at all** (**G78**).
**Clause 7's warning stands unchanged** - writing the rubric from the Pultec
schematics just produced would still be this spec's founding failure - and
nothing in either pass is a decision. Both passes are prose somebody has to find;
the register entries are what an agent consults before acting.

- **Found** 2026-10-18, by the drift check of the T2 spec described in G65 (F1,
  F2, F3, F5, Q3, Q6, U1, U8, U11), run before T2 was planned and against
  `main` at `c6f4ed1`. `.superpowers/sdd/schgen-drift-check.md` is gitignored, so
  this entry is the durable record.
- **Evidence** clause 3 confirmed by this writer: `ls .github` reports no such
  file, and `find . -name '*.yml' -o -name '*.yaml'` filtered of `node_modules`
  and `.tools/` returns nothing - a check that could have failed, since the same
  find unfiltered returns many. Clause 6 confirmed by this writer for the
  optical compressor (`grep -c 'symbol:'` = 0 in all five modules) and for the
  stub's three requirements, read at `tools/cli/schematic-stub.ts:6-7, 72-79`.
  Clause 4 confirmed by `ls circuits/pultec/physical/`. The spec text of every
  clause read at `1dd5814`.
- **Verified** clauses 3, 4 and 6 yes, by this writer. Clauses 1, 2, 5 and 7 are
  **relayed from the drift check** - the quotes in them are the drift check's
  transcriptions, and the `perfboard.json` survey behind clause 2 was not re-run
  here.
- **Why it is open** these are corrections to a committed design document, and
  the change that found them was scoped to the two defects that would have
  mis-shaped the port (G16 and the template table). Correcting the rest inside
  that change would have mixed a planning fix with seven unrelated edits to a
  900-line spec.
- **What would settle it** the T2 plan's first task corrects them in the spec,
  with the tree re-read rather than the drift check trusted. **CRITERION:** no
  factual claim in the spec's T2-bearing sections is false against the tree at
  the commit the plan is written from, and no gate names a place to run that does
  not exist. **MECHANISM, untried:** clauses 1, 2, 4 and 5 are text edits;
  clause 3 is not - where gates 1-6 run is a real decision (a CI that does not
  exist, or `make check` plus a named per-board target), and clause 7's rubric
  channel is a design choice the plan must make deliberately.

### G68 - the North American standards chain for schematic arrangement is broken at both ends, and the richest written source for it is WITHDRAWN

The symbol standards govern symbols only, and say so in their own scope text:
IEEE 315-1975 **A1.1** - *"This standard provides a list of graphic symbols and
class designation letters for use on electrical and electronics diagrams"* - and
its clause **A3.3** hands arrangement to another document by name:

> *"For application of these symbols on electrical diagrams, see American
> National Standard Drafting Practices; Electrical and Electronics Diagrams,
> Y14.15-1966 (R1973)."*

**Both ends of that link are dead:**

| document | status |
| --- | --- |
| **ANSI/ASME Y14.15-1966 (R1973, R1988)**, *Electrical and Electronics Diagrams* - the layout standard | **withdrawn, no replacement** |
| **IEEE 315-1975 / 315A-1986** (= ANSI Y32.2-1975) - the symbol standard that points at it | **Inactive-Reserved**, inactivated 2019-11-07 |
| **IEEE 991-1986 (R1994)**, logic diagrams | **Inactive**, inactivated 2019-11-07 |

Y14.15 is nonetheless **the best available written source for US schematic
arrangement**: it is the only source the research found that states arrangement
rules as numbered clauses mixing `shall` and `should`, which is the shape a
criteria document needs, and its full text is publicly posted and was read in
substantial part. Its withdrawal is administrative, not a repudiation - no
successor contradicts it.

**THE CONSEQUENCE THAT BINDS ANYTHING WRITTEN HERE: Y14.15 must be cited as a
withdrawn standard every time it is cited, and IEEE 315 as inactive.** A criteria
document that cites either as in-force has overclaimed, which is the failure this
repository has been burned by - and the overclaim is attractive precisely because
Y14.15's clauses are the only readable ones (G70).

**And do not mistake what IEC 61082-1 being in force buys.** By its own scope
clause: *"The contents of this horizontal standard will not apply unless
specifically referred to or included in the relevant publications."* It applies
here only if a criteria document invokes it clause by clause - which is the
mechanism the standard expects, so this is good news rather than bad, but it is
not automatic authority.

- **Found** 2026-10-19, by the standards research pass committed at `51f8362`
  (§1.1-§1.5), read in full by this writer.
- **Evidence** the A3.3 and A1.1 quotations and the three status lines in §1.1 of
  that document, each with a link to the issuing body's own status page; the
  IEC 61082-1 scope quotation in §1.4.
- **Verified** **no - RELAYED.** The document was read by this writer at
  `51f8362`; every status and quotation in it came from a web fetch through a
  summarising tool, and nothing in it was established by running anything. A
  fetched page is not a check that could have failed.
- **Why it is open** nothing in this repository cites these standards yet, so
  there is nothing to correct - the entry exists so that the first document which
  does cite them cites them with their status, and so that a later reader does not
  re-derive "Y14.15 says so" as though it were in force.
- **What would settle it** **CRITERION:** every citation of Y14.15, IEEE 315 or
  IEEE 991 anywhere in this repository carries its status at the point of
  citation, and no criterion claims in-force authority from one of them.
  **MECHANISM, untried:** a status column in the criteria document's source table,
  plus a check that could fail - a grep over committed documents for those
  designations requiring a status word nearby. No such check exists and nobody has
  written one.

### G69 - a signal-flow rule was attributed to IPC-2612 by a web search and traces to a private company's practice document

**An unsourced-confidence failure caught in the act**, which is why it is here
rather than only in the research prose.

A search result attributed to **IPC-2612** the sentence *"The signal flow should
be from left to right and then circuit sections in order going down the page."*
The researcher traced it: it is from **John Martin, *Clear Schematics*, Martin
Company, Rev 04, 2017-02-08** - found by grepping that document's text, line 90 -
a private company practice document, **not a standard.** IPC-2612 **§6.6** *is*
titled "Signal Paths" and may well say something very like it; until somebody
reads §6.6, nobody may write that IPC says it.

Two things a later reader needs and cannot re-derive:

1. **That specific sentence is contaminated.** If it turns up in a criteria
   document attributed to IPC-2612, it came from a search result and not from the
   standard. An agent writing criteria from search results would have cited a
   standard that may not contain the rule.
2. **The general rule it forces: no requirement may be paraphrased from a clause
   or figure title.** About a dozen candidate criteria in the readability research
   are marked *title only* - an active standard has a clause on exactly that topic
   and the clause text was not obtained (G70). **A title establishes THAT a
   standard rules on a topic; it never establishes WHAT it requires.** The
   research deliberately paraphrased none of them, and that restraint has to
   survive into whatever is written next.

- **Found** 2026-10-19, by the standards research pass committed at `51f8362`
  (§1.6, and the *title only* firmness grade defined in §2).
- **Evidence** §1.6 of that document, which names the misattributing search
  result, the true source, its revision and date, and the line of the grep that
  found it - a trace that could have failed to land anywhere and did land on a
  named document.
- **Verified** **no - RELAYED**, on the same caveat as G68: the trace was
  performed by the research agent through a summarising fetch tool and was not
  re-run here; this writer read the document at `51f8362`.
- **Why it is open** there is nothing in the tree to fix. The hazard is in the
  next document somebody writes, and the only durable defence is this entry.
- **What would settle it** **CRITERION:** every criterion in a criteria document
  names a clause whose text its author read, and a criterion whose only source is
  a clause title is recorded as unsourced rather than paraphrased into a
  requirement. **MECHANISM, untried:** reading IPC-2612 §6.6 settles this
  particular sentence either way; it is paywalled and unread (G70).

### G73 - the only standard-stated numbers available are conditioned on a reproduction size nothing here declares, and the one number derivable from them makes adjacent 50-mil grid lines non-compliant

**Three numbers, all from documents the researcher read**, and they are the only
quantitative requirements either research pass found:

- Y14.15 **15-7.2.1**: spacing between parallel lines, *after reduction to
  ultimate use size*, **shall be a minimum of 0.06 inch** - a `shall`, from a
  withdrawn standard (G68).
- Y14.15 **15-3.6**: for diagrams intended for ultimate use reduced up to
  **2.5:1**, symbols should be drawn approximately **1.5x** the Y32.2 size.
- IEEE 315 **A4.4**: *"It is recommended that only two sizes be used on any one
  diagram."*

**THE DERIVED ONE, AND THE LABEL "DERIVED" MUST SURVIVE EVERY RESTATEMENT,
because a derivation is checkable and a guess is not.** 0.06 in > 0.05 in, so on
a 50 mil grid printed 1:1, **adjacent grid lines are non-compliant and the
minimum compliant parallel pitch is two grid units - 100 mil.** This is
arithmetic on the standard's number, not a chosen value. It **materially tightens
routing density on any sheet this repository generates**, and it is recorded
because somebody will otherwise build a router around 50 mil spacing and meet
this afterwards.

**THE BLOCKER UNDER ALL THREE.** Every one is conditioned on the intended
reproduction size: 0.06 in is specified at ultimate use size, the 1.5x is
conditional on a reduction of at most 2.5:1, and text legibility is the same
shape. **Nothing in this repository declares an intended print size or
reduction**, so the only standard-stated numbers available **cannot be evaluated
at all.** That lines up exactly with `CLAUDE.md`'s *"Look at the output, not only
the tests... Render it, print it, read it"*: the standards consistently constrain
the **printed** artifact, not the file.

- **Found** 2026-10-19, by the standards research pass committed at `51f8362`
  (§2.2, §2.14, §5 rows R8-R11 and R35, §6.1, §7.5).
- **Evidence** the three clause quotations in that document, each with its clause
  number; the derivation is one inequality over two numbers, both quoted - the
  0.06 in from Y14.15 and the 50 mil grid from KiCad's own Schematic Editor
  documentation - and it is checkable by inspection rather than by trust.
- **Verified** the **arithmetic** yes - 0.06 in exceeds 0.05 in, so adjacent 50
  mil lines cannot meet that clause at 1:1, and this writer checked that step.
  The **clause quotations** and the **absence of a declared reproduction size**
  are **RELAYED** on the caveat in G68; this writer did not grep the tree for a
  declared print size, so that absence is the research pass's claim.
- **Why it is open** declaring a reproduction size is an acceptance criterion for
  an artifact this repository's agents produce, and the 100 mil consequence bears
  on the emitter's design rather than on a register edit.
- **What would settle it** **CRITERION:** an intended output format and reduction
  are declared in a reviewed file outside the generator, and the three
  standard-stated numbers above are evaluated against the rendered artifact at
  that size rather than against the file. **MECHANISM, untried:** the T2 plan
  declares it alongside the rubric channel G67 clause 7 names. Note that two
  escapes exist and choosing between them is **not** this register's: enforce the
  100 mil pitch, or declare an enlargement under which 50 mil spacing meets
  0.06 in at use size.

### G74 - a naive left-to-right flow criterion fails on every op-amp in this repository, and no standard says how a feedback path is drawn

Y14.15 **15-8.1** gives left-to-right reading as a `should`, upper-left-to-
lower-right layering for complex diagrams as a `should`, and *"a circuit layout
which follows the signal or transmission path from input to output, or in the
order of functional sequence"* as a **`shall`** - the strong clause, and usefully
weaker than "left to right", because it permits any arrangement in which the
functional order is legible.

**No standard the research could read states how a feedback path should be
drawn.** Y14.15 grants one related exception and only to orthogonality (15-7.2
exempts *"multi-vibrators"* and *"bridges"*). A feedback path runs against the
signal flow by definition, so **a backward-edge count that does not exempt
feedback fails on every op-amp in this repository.**

**How a feedback edge is IDENTIFIED was left open deliberately**, and the three
candidates are recorded because the next agent will otherwise invent one: an edge
that closes a cycle in the model's directed graph; an edge declared as feedback in
the model; an edge between a declared output port and a declared input port of the
same block. The first is computable from the model with no agent judgement, which
is why the researcher named it most consistent with the governing invariant -
**and it was not tested against any circuit here**, so it is a mechanism, not the
criterion.

- **Found** 2026-10-19, by the standards research pass committed at `51f8362`
  (§2.1, §5 row R36, §7.4).
- **Evidence** the 15-8.1 and 15-7.2 quotations in that document, and its
  statement that it searched for and found no feedback-drawing rule in any
  standard it read.
- **Verified** **no - RELAYED** on the caveat in G68. The claim that a
  backward-edge count would fail on this repository's op-amps is an inference
  from topology, not a measurement anyone ran over `circuits/`.
- **Why it is open** an agent choosing the feedback classifier and then grading
  its own layout's backward-edge count against that choice is the invariant's
  exact failure mode, so the classifier cannot come from the producing agent.
- **What would settle it** **CRITERION:** a backward-edge measure whose feedback
  classification is stated in a reviewed file outside the generator, and which
  classifies this repository's op-amp and EQ circuits' feedback edges correctly -
  demonstrated on them, not asserted. **MECHANISM, untried:** cycle-closing edges
  in the model's directed graph, untested against `circuits/optical-compressor/`
  or the Pultec sections.

### G75 - this repository's model makes three normally-subjective readability criteria mechanically checkable, which is an ASSET, recorded because nobody re-derives it

**Not a defect.** `CLAUDE.md`'s register rule covers *"a measurement - including
one that found nothing wrong"*, and this is one.

Functional grouping, repeated-circuit congruence and rail presentation are
judgement calls in a general schematic tool, because a netlist does not say what
the functional blocks are, which subcircuits repeat, or which nets are rails.
**This model states all three**, so each becomes a boolean over data the agent was
*given* rather than data it chose:

| candidate criterion | why it is mechanical HERE | source for the rule itself |
| --- | --- | --- |
| each declared functional block occupies a region disjoint from every other block's | `include(prefix, network, portMap)` names every block and prefixes every net inside it | Y14.15 15-3.8.1 (withdrawn), which treats spatial separation and a drawn boundary as **interchangeable** ways to show a group; IEC 61082-1 7.1.5 + Figs. 21, 65 (*title only*) |
| repeated sub-networks are placed congruently, up to translation or reflection | a repeated block is literally the same function applied twice, so their symbols' relative coordinate sets are comparable | Y14.15 15-7.1 (withdrawn): *"Draw similar basic circuits in a similar form"* |
| rails and returns are reached by power/return symbols, not by wires drawn across the sheet | a rail must be a **declared port** - there are no implicit global nets | Y14.15 15-8.3 + 15-7.1 (withdrawn); IEC 61082-1 7.4.5 (*title only*) |

**The agent is not choosing the blocks - the model it was given states them.**
That is the difference between a criterion and the failure mode `CLAUDE.md`
describes, and it is why these three are mechanical here and judgement calls
elsewhere.

**The shape of the whole candidate set, so nobody sizes it from a guess.** The
research offers **57 candidate criteria: 35 mechanically checkable, 15 measurable
with the threshold unset, 7 human judgement only.** Cite those numbers and not
others - **the document's own hand tally of the same tables gave 29/18/10 and was
wrong**, and the 35/15/7 figures were produced by extracting the bucket column
programmatically. Four of the 35 rest on a number a standard states (G73); the
other 31 need no number at all, which is why they are the ones worth implementing
first.

**One tension flagged by the research and NOT resolved by it.** KiCad power
symbols and global labels are exactly an implicit-global-net mechanism, and
`CLAUDE.md` says *"There are no implicit or global nets."* These are not in
conflict - the model forbids *undeclared* globals, and a rail that is a declared
port may be emitted as a power symbol - but **the mapping from "declared port" to
"global power symbol" is a decision a criteria document should make explicitly
rather than leave to the emitter.**

- **Found** 2026-10-19, by the standards research pass committed at `51f8362`
  (§2.6, §2.10, §5 rows R41, R45, R46, §6.2, and §5's bucket totals).
- **Evidence** §6.2 of that document for the three-criteria argument, the
  corresponding R-rows for each check's statement, and §5's note that the bucket
  counts were extracted programmatically after a hand tally of the same tables
  disagreed with the extraction.
- **Verified** **no - RELAYED** on the caveat in G68. In particular, **none of
  these three checks has been run against any schematic here** - the claim is
  that they are computable from data the model already carries, not that anything
  passes them.
- **Why it is open** they are candidates in a research document, not criteria in
  a reviewed one, and adopting them is the rubric-channel decision G67 clause 7
  names. An entry recording an asset stays until the asset is taken up.
- **What would settle it** **CRITERION:** the three above are stated in a
  reviewed, circuit-independent criteria file with their sources and each source's
  status, and implemented as checks that fail rather than warn - then this entry
  is deleted. **MECHANISM, untried:** route them through the channel
  `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` **PAR4**
  established for stripboard criteria, which is the shape G67 clause 7 says gate
  14's rubric lacks.

### G76 - the open generator this repository would most plausibly port randomises its placement, so its output cannot be regenerated and compared by content

**`devbisme/schematizer`** - split out of SKiDL 3.0.0 on **2026-10-16**, MIT, a
JSON netlist to `.kicad_sch`/SVG drawer for KiCad 6-10, engine vendored, one
runtime dependency - says this in its own README:

> *"Placement starts parts at random positions and the router breaks ties
> randomly, so the same netlist produces a different - equally valid - drawing on
> every run."*

This repository's rule for derived artifacts is the opposite: **regenerated every
run and compared by content**, never by timestamp (`CLAUDE.md`). **A
nondeterministic routed emitter is structurally incompatible with that gate** -
the comparison would fail every run for no reason, or would have to be switched
off, which is the *"skipped check that must never look like a passing one"* the
same document forbids. Its **labels-only mode is deterministic; the routed mode
is not.**

**No source either research pass found treats reproducible output as a
requirement at all.** So determinism is a gap in the prior art rather than in
this repository.

**Three further properties of the same body of work bear on the same port
decision**, recorded so nobody re-derives them:

- **The author's own verdict on roughly 18 months of work** (SKiDL's
  force-directed placement plus global and switchbox orthogonal routing, August
  2021 to July 2023): the schematics are *"better than what we had (which was
  nothing), but the quality of the schematics still needs improvement"* -
  imperfect wiring aesthetics, occasional bad placements needing manual `symtx`
  hints. The companion line from one of the two prior-art reviews: **"you can't
  route your way out of a bad placement."** The SKiDL discussion
  (`devbisme/skidl` #125, 2021-2025) records a contributor abandoning wire
  routing for hierarchical and global **labels** because routed output was *"ok
  but not quite pretty enough to use"* - **the same destination tscircuit was
  rejected here for reaching silently**
  (`docs/decisions/2026-09-21-why-not-tscircuit.md`), except chosen openly and
  said out loud. Nothing in either pass revisits that decision and nothing found
  contradicts it.
- **An unresolved contradiction about elkjs, recorded undiagnosed.** One source
  asserts ELK has no orthogonal algorithm for schematics and that
  `elk.edgeRouting = ORTHOGONAL` has no visible effect in some integration,
  because the caller keeps only child positions and discards the returned edge
  routes; Weave reports using elkjs orthogonal routing successfully. That reads
  like one integration's bug rather than a property of ELK, and **neither reading
  was tested.** If ELK is considered, settle it directly.
- **Scale ceilings, and every published result is small**: EEschematic at 3-5
  transistors, Schemato degrading above 5 components, RL schematic placement not
  past roughly 40 components, netlistsvg reportedly poor at 80+ parts,
  `kicad-sch-api` slowing near 1,000. The five Pultec sections are **19, 20, 27,
  21 and 39 components** (measured in G16 and G65), which sits above most of the
  literature's demonstrated range and below the slow end.

- **Found** 2026-10-19, by the prior-art research pass committed at `ba6dba1`
  (§3 SKiDL/schematizer, §4 engines, §6), read in full by this writer.
- **Evidence** the README quotation, the author's own write-up quotation, the
  issue #125 summary and the ELK contradiction as recorded in that document with
  its per-item evidence marks; the component counts are this repository's own,
  carried from G16.
- **Verified** **no - RELAYED, and weakly for the maturity signals.** The
  prior-art pass states about itself that no repository was cloned, no generator
  executed and no schematic rendered, and that **star and commit counts are its
  least reliable facts** - it reports 3 stars and 13 commits for `schematizer`,
  so project maturity here is a weak signal rather than a measurement. The
  nondeterminism claim is a README quotation, not an observed run.
- **Why it is open** whether to port anything is the T2 plan's decision, and both
  research passes explicitly make no recommendation. Recording the property is not
  ruling on the port.
- **What would settle it** **CRITERION:** any adopted generator produces
  byte-identical output from an unchanged model across repeated runs, so that
  `make check`'s content comparison can only fail for a real reason.
  **MECHANISM, untried and each with a cost:** schematizer's deterministic
  labels-only mode, which buys determinism by emitting stubs instead of wires -
  the very trade tscircuit was rejected for; a deterministic placement of our own;
  or a seeded run, which makes the seed part of the artifact's identity. Picking
  one is not this register's.

### G77 - a correctness gate for a generated schematic exists, is published with pass rates, and is a CANDIDATE here rather than a decision

**Weave** (*Verified Netlist-to-Schematic Conversion via Layered Graph Layout*,
arXiv 2607.03835; deterministic, no model, no training) certifies **every**
schematic it emits: it re-parses the **emitted file** back into a netlist - by
unioning wire endpoints, flags and symbol pins that share coordinates into nets -
and compares it net for net against the input. The outcome is **binary, MATCH or
partial**, not a similarity score: *"A result is accepted only when the two
connectivity partitions are identical."*

Reported results: **100% compilation and 100% verified MATCH on 117 circuits**
(Circuits-LTSpice) and **88.4% verified MATCH on 3,460 Analog Devices LTspice
demo circuits** (mean 14.4 elements, max 138), with 8.2% partial and 3.3%
errors. A "safe-mode ladder" progressively disables placement patterns and keeps
the first result that verifies.

**Why it bears on this repository specifically.** It grades the artifact rather
than the generator's intention, it is a check that can fail, and **it would catch
the exact failure that disqualified tscircuit** - a drawing that looks connected
and is not. It is independent of readability, and Weave says so about itself: it
*"does not yet report the crossing, bend, or visual-similarity metrics"* (G78).
Named failure classes, from the paper: dense multi-pin power modules with many
repeated nets; deep cascades stretched into long chains by layered layout
(*"correct but not compact"*); symbols absent from its 5,093-symbol table.

**This is a candidate and not a decision.** SchGen's *Netlist Accuracy* (Jaccard,
precision and recall over symbol-pin nodes) is the graded version of the same
idea, and Weave argues the binary version is the right one; that disagreement is
unresolved and is not resolved here.

- **Found** 2026-10-19, by the prior-art research pass committed at `ba6dba1`
  (§2 Weave, §4 "Correctness of a generated schematic").
- **Evidence** that document's `[PAPER-FULL]` reading of Weave, with the
  verification method, the two pass rates and the named failure classes quoted
  from the paper.
- **Verified** **no - RELAYED.** Weave was not run, its repository was not
  cloned, and none of its output was looked at; the pass rates are the paper's
  own claims, read through a summarising fetch tool.
- **Why it is open** adopting a correctness gate is a design decision for the T2
  plan, and **where in the derivation chain the comparison sits is itself open** -
  G16 records that a whole-EQ netlist compared against a section board rejects, so
  "compare the emitted schematic against the model" is not one comparison but
  several.
- **What would settle it** **CRITERION:** a generated schematic is accepted only
  when a netlist re-derived **from the emitted file** is partition-identical to
  the model's netlist, and the gate fails rather than warns. **MECHANISM,
  untried:** Weave's geometric re-parse, or `kicad-cli`'s own netlist export of
  the generated file compared against the model - **these are not the same thing**
  (one trusts coordinates, the other trusts KiCad's connectivity engine), and
  neither has been tried here against a generated sheet.

### G78 - schematic SEMANTICS is ungraded by every tool two independent prior-art reviews surveyed, which is the thing this project needs most

Two reviews run independently in the two months before the pass converge on the
same structural conclusion: **the layout ENGINES exist** - Sugiyama layered,
Tamassia orthogonal bend minimisation, ELK/elkjs with port and hyperedge support,
grandalf as a pure-Python Sugiyama - and **"schematic semantics (GND down,
passive chains, symmetry) remains unsolved across all tools."** Ground down,
power up, flow left to right, aligned passive chains, mirrored differential
pairs, recognisable feedback, idioms preserved: nothing surveyed grades any of
it. The only two attempts found are Hsu & Lin's *"building block compliance
rate"* and Weave's named *"placement patterns (feedback, divider legs, shunts)"*,
and **neither publishes a usable definition.**

**The candidate measures, with what is unknown about each** - the part a later
reader cannot re-derive without repeating the pass:

| candidate | what it is | what is unknown about it |
| --- | --- | --- |
| **SchGen Spatial Violation** (Microsoft Research; MIT repository) | normalised overlaps among symbols, labels and wires - code-computable and published | **it measures overlap ONLY** - nothing about crossings, bends, flow or idiom. And **whether the implementation is in `github.com/microsoft/SchGen` is unestablished**; the README does not document evaluation code. Settled by cloning and looking |
| **AEM** (Yang et al., IEEE TCAD, *Circuit Schematic Generation in PCB Reverse Engineering...*) | an Aesthetic Evaluation Metric for PCB schematics, RL-trained to align with designers' subjective judgement; described as weighing *"component placement specifications, neatness, routing complexity, and line length"* | **PARTLY SETTLED 2026-10-19 - see the EXTENSION below.** As written this cell said *"PAYWALLED - the formula is UNREAD"* and called AEM the highest-value unresolved lead in either document. **The formula's SHAPE has since been read**, from an open-access restatement, and its benchmark and published scores obtained. **Four of its five sub-terms are still unread**, so it is still not implementable |
| **Purchase, "Metrics for Graph Drawing Aesthetics"** (JVLC 13(5), 2002) | formal metrics for **seven** aesthetic criteria - crossings, bends, edge length, drawing area among them - deliberately size-independent, explicitly intended as cost functions | **the seven formulas were not retrieved, and they are the point.** `rpgove/greadability` is a runnable JavaScript implementation of four normalised global metrics (crossings, two angular-resolution measures, crossing angle), reportedly the only implementation of three of them - and it **knows nothing about circuits** |
| **FITEE 2025 survey** (DOI 10.1631/FITEE.2400612) | a review of automatic schematic generation techniques, citation span 1966-2024 | **the evaluation-metrics section is paywalled.** Named as the likeliest single shortcut to the whole metric question |
| **Schemato's GED / MSSIM** | graph edit distance and mean structural similarity against a reference drawing | **unusable here by construction** - they need a known-good drawing of the same circuit, which an ex nihilo schematic (G66) does not have |

**AND THE FINDING THAT COMPLICATES BORROWING ANY OF THEM, RECORDED
UNDIAGNOSED.** An empirical study relayed in search results found participants
**slower and less accurate** finding cliques in an **orthogonal** layout than in
a force-directed one **despite the orthogonal layout having fewer crossings.**
The study **could not be identified**, so this is a flag and not a fact - but the
direction of the flag matters here more than in most places: **minimising
crossings is not the same as being readable, and a schematic is orthogonal by
convention** (Y14.15 15-7.2). The graph-drawing literature says something
compatible from another direction - Mooney et al. (GD 2024): layout quality is
inherently multi-objective and no single metric captures it across graphs and
tasks, with stress and crossings in conflict.

**One more thing nothing found solves: grading a schematic for which no reference
drawing exists.** The published metrics split into correctness (needs the input
netlist - available, G77) and resemblance (needs a known-good drawing - not
available for a novel circuit). **Nothing found grades a novel schematic's
readability by code**, which is exactly what the ex nihilo direction G66 records
as a stated requirement would need.

**EXTENSION, 2026-10-19: AEM'S FORMULA IS NOW READ, ITS BENCHMARK IS PUBLIC, AND
FOUR OF ITS FIVE TERMS ARE STILL MISSING.** This replaces the AEM row's
"formula is UNREAD" above; it does not replace the entry, because what the entry
claims - that schematic SEMANTICS is ungraded - is unchanged by it.

**How it was obtained, which is the part a later reader cannot re-derive:** the
IEEE TCAD paper is still paywalled and still unread. What was read is a
**follow-up by the same group** - Yang, Qiao, Chen, Shi, Chen, Yan (PLA
Information Engineering University, Zhengzhou), *"An Efficient and High-Quality
Circuit Schematic Generation Method based on Action Mask and Graph Neural
Network"*, *Discover Artificial Intelligence*, DOI `10.1007/s44163-025-00726-7`
- **via the author-accepted preprint on Research Square (`rs-7168754`, posted 13
August 2025), which is freely downloadable while Springer's own page and content
PDF both refused.** That route is the finding: **a paywalled formula had an
open-access restatement by the same authors, and two passes recorded it as
unobtainable without looking for one.**

**The shape, quoted from the extracted text:**

```
max AEM = ( sum_{i=1..m} RL_i * D_WB_i * D_NC_i ) / m        (1)
RL_i = R_b_i / alpha + ( (alpha - 1)(R_b_i - P_i) ) / alpha  (2)
```

with `m` the number of routings, `D_WB` and `D_NC` discount factors on the
**number of routing bends** and the **number of net crossings**, `R_b` a baseline
fraction **affected by component alignment**, `P` a **penalty constraining a
routing's length to a stated band**, and `alpha` a robustness factor **taken as 2
in the experiments** (so `RL` is the mean of the raw and penalised baselines).
**Reusable as a shape:** a per-net score, averaged over net count so circuits of
different size compare, built as multiplicative bend and crossing discounts on an
alignment-derived baseline, less an additive length penalty.

**What is still NOT available, and it is the implementable part: the definitions
of `D_WB`, `D_NC`, `R_b` and `P`.** They are given by role, not by formula, and
live in the paywalled TCAD paper (43(5), 1608-1612, DOI
`10.1109/TCAD.2023.3340869`). **A reimplementation from the preprint alone would
be inventing four of the five terms. Say so if anyone proposes it.**

**Its published numbers and its benchmark, both new here.** Table 4 gives maximum
AEM per circuit, baseline network versus the action-mask/GNN network, over twelve
circuits: baselines **44.14-77.94**, action-mask results **51.26-88.41**, mean
reward gain **11.67%**. So a published schematic-quality measure **lands roughly
in the 44-88 band on real boards and a state-of-the-art method moves it by about
10%** - the first published numeric answer to "how good is a generated
schematic" any pass has obtained. It is not an acceptable-crossing-count.

**And the benchmark transfers, which is why this matters here rather than merely
being interesting.** Table 1's twelve circuits are **real discrete-analog
boards** of 9-27 components and 6-18 nets, including an **AN7112 audio amplifier**
and a **TDA2030 power amplifier**. The dataset is **public and was cloned**:
`MrBade/PCBNetlistS`, **BSD-2-Clause**, twelve plain-text netlists with a
documented format. `amplifier3.txt` (the TDA2030A) has 27 parts and **`GND` at 11
pins, `+VCC` at 10, `-VCC` at 10** - the same high-degree-net shape G90 records
as what defeats a general router here. **The most mature published
schematic-quality metric in the field was developed and validated on exactly this
kind of circuit at exactly this scale**, so "it was built for digital, it will not
transfer" is not available as an objection.

- **Found (extension)** 2026-10-19, by the third prior-art pass,
  `docs/schematic/generation-prior-art-third-pass.md` §6.1, §6.2, §6.3.
- **Evidence (extension)** that document's `[READ]` marks on the preprint text it
  extracted and quotes verbatim, its verbatim Table 1 and Table 4, and `[RAN]`
  for the clone and reading of `MrBade/PCBNetlistS`.
- **Verified (extension)** **no - RELAYED.** This writer did not download the
  preprint, clone the dataset or re-read the tables. Nothing in the extension was
  re-established here.
- **DEVIATION FROM THIS ENTRY'S OWN MECHANISM, recorded because the mechanism was
  wrong and the criterion was not.** The MECHANISM below says *"obtain AEM"*, by
  which it meant the TCAD paper. That paper was not obtained and is still
  paywalled; what was obtained is a same-group open-access restatement. **The
  criterion - a measure published outside the producing agent, computable from a
  `.kicad_sch`, able to fail - is still unmet**, because four sub-terms are
  missing, so this is a step toward the criterion rather than a satisfaction of
  it. **What the deviation teaches, and it generalises past AEM:** before
  recording a paper as unobtainable, search for a preprint or a follow-up by the
  same authors. Two passes did not, and the second of them called it the
  highest-value unresolved lead in the document while an open-access restatement
  was a search away. The remaining paywall is the same procurement problem G70
  records on the standards side.

- **Found** 2026-10-19, by the prior-art research pass committed at `ba6dba1`
  (§2 "Two independent prior-art reviews", §4 "Layout quality" and "Graph-drawing
  literature", §6 "Genuinely unsolved"), with §4.2 of the standards pass
  (`51f8362`) reaching the same conclusion from the standards side.
- **Evidence** that document's evidence marks per item - `[PAPER-FULL]` for
  Weave, `[PAPER-ABS]` for Hsu & Lin and Purchase, `[PAYWALLED]` for AEM and
  FITEE, `[THIRD-PARTY]` for both reviews and for `greadability` - and its
  quotation of the two reviews' shared conclusion.
- **Verified** **no - RELAYED, and some items are weaker than others.** Nothing
  was cloned, run or rendered. AEM and the FITEE metrics section were not read at
  all; Purchase's formulas were not retrieved; the orthogonal-reads-worse study
  could not be identified and is recorded undiagnosed on purpose.
- **Why it is open** this is the gap itself rather than a defect - **nobody has
  what this project needs most.** An agent that filled it from its own judgement
  would be authoring the criteria for the artifact it produces.
- **What would settle it** **CRITERION:** a readability measure that is published
  or reviewed **outside the agent producing the schematic**, computable from a
  `.kicad_sch`, and able to fail. **MECHANISM, in descending value, and the first
  item is now PART-TRIED - see the EXTENSION above for what it returned and how
  it deviated:** obtain AEM and establish whether its components are computable
  from a `.kicad_sch` (**shape obtained, four sub-terms outstanding; the TCAD
  paper holding them is still paywalled**); read the FITEE survey's
  evaluation-metrics section; retrieve Purchase's seven formulas and evaluate
  `greadability` over a schematic's net graph; clone SchGen and find out whether
  Spatial Violation is implemented there. **A fifth, added by the extension and
  cheaper than any of them: score something against the public BSD-licensed
  `MrBade/PCBNetlistS` benchmark**, whose twelve boards carry published AEM
  values, so a candidate measure can be compared against a number somebody else
  produced. The paywalled items are the same procurement problem G70 records on
  the standards side.

### G80 - an externally-authored placement rule file for agent schematic placement already exists, and one of its facts is load-bearing for any emitter

`kicad-sch-api` **issue #135** collects placement rules derived from *"extensive
iterative testing with AI agents"* across six versions of one LED-indicator
circuit, with concrete numbers: **1.27 mm grid alignment**; **lower Y is TOP,
higher Y is BOTTOM**; `rotation=270` for a vertical LED so the cathode points
right; *"calculate center first, work backwards"*; text Y must be less than the
enclosing rectangle's bottom Y; power symbols carry voltage values rather than
references; **derive every wire coordinate from `list_component_pins()` rather
than by arithmetic**; 40-60 mm branch spacing; and a pre-render verification
checklist.

Two reasons this is in the register and not only in the research prose:

1. **It is a candidate criteria channel of exactly the shape this repository
   requires** - a rule file written by somebody who is not the agent producing
   our artifact (`CLAUDE.md`'s invariant; the shape it would take here is the one
   `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md` **PAR4**
   established).
2. **The Y-orientation fact is load-bearing.** In `.kicad_sch` coordinates
   **lower Y is top.** Anything implementing "power at the top" (G72) as a
   *larger* `y` has it backwards, and this is the cheapest available place to
   learn that.

**Its provenance is also its limit**, and both halves have to travel together: it
is one project's empirical findings on one small circuit, **not a standard**;
`kicad-sch-api` is a library this repository does not use; and its numbers -
40-60 mm branch spacing in particular - are that circuit's, with no stated
derivation. Adopting one without a derivation or a test over the range it claims
would be the silent widening `CLAUDE.md` forbids.

- **Found** 2026-10-19, by the prior-art research pass committed at `ba6dba1`
  (§3 `kicad-sch-api`, and item 7 of its own list of entries owed to this file).
- **Evidence** that document's `[REPO]`-marked reading of the library and its
  summary of issue #135 with the rules named above.
- **Verified** **no - RELAYED.** The issue was read through a summarising fetch
  tool, not raw, and no rule in it was tested against a `.kicad_sch` produced
  here. **The "lower Y is TOP" claim in particular should be confirmed against a
  file on disk before anything depends on it** - this repository has schematics
  committed, so that check is available locally and it was not run.
- **Why it is open** it is a candidate source, and whether this repository adopts
  a rule from it is a criteria decision the producing agent may not make.
- **What would settle it** **CRITERION:** wherever a placement rule here matches
  one of #135's, the rule cites it as a named external source **with its status**
  (one project's empirical findings, not a standard), and no number is adopted
  from it without a stated derivation or a test over the range it claims.
  **MECHANISM, untried:** read the issue directly rather than through a
  summariser, confirm the Y orientation against a committed `.kicad_sch`, and
  reconcile the rest against the standards-sourced candidates in G75 and the
  spacing arithmetic in G73 before adopting anything.

### G88 - `resolveNetwork` refuses `circuits/pt2399-core` outright, because the ground port's key is a repository-wide literal and that circuit spells it differently

**This is a defect sitting in this repository right now.** `resolveNetwork` is the
gate every downstream analysis passes through - control resolution, SPICE
emission, net-degree measurement - and **one of the five circuits here cannot get
through it at all.**

**What is wrong, precisely.** `GROUND_PORT_KEY` in `lib/model/net-preference.ts`
is the literal `"ground"`:

```ts
export const GROUND_PORT_KEY = "ground"
```

`lib/model/control-state.ts:268` passes it to `netPreference(network.ports,
GROUND_PORT_KEY)`. `circuits/pt2399-core/pt2399-core.ts:186` declares its
reference port as `.port("gnd", "GND")`. **The two spellings never meet**, so
`resolveNetwork(pt2399Core(), NO_CONTROLS)` throws `Missing ground port: ground`.

**It is a naming-contract defect, not a typo in one circuit, and that is why it
is here rather than fixed in passing.** Nothing states anywhere a circuit author
reads that the reference port must be keyed `ground` rather than `gnd`, `GND` or
`agnd`. **There is no test that would have caught it**: no test in `tests/`
calls `resolveNetwork` on `pt2399-core`, confirmed by grep over
`tests/circuits/pt2399-core.test.ts`, which mentions neither `resolveNetwork` nor
any SPICE emission. So the circuit has been un-resolvable for as long as it has
existed and nothing said so.

**Which end is wrong is a judgement this writer is not making.** Renaming the
circuit's port to `ground` is one line and fixes one circuit. Accepting a
declared set of reference-port spellings changes a repository-wide contract and
needs a test over the set it claims, which **refuse rather than guess** requires.
A third reading is that the circuit is right and the literal should be the
circuit's business, declared per-network. Choosing among those is a contract
decision.

- **Found** 2026-10-19, relayed by the circuit-families prior-art pass
  (`docs/schematic/generation-prior-art-circuit-families.md` §0(b)) and then
  re-run here.
- **Evidence** `resolveNetwork(pt2399Core(), { potPositions: {}, switchPositions:
  {} })` executed under `bun` at `e619029`, output `THREW: Missing ground port:
  ground`. **The check could have failed**: the same script prints `NO THROW -
  claim 1 does NOT reproduce` on the other branch, and a control in the same
  session added a `ground` key to the port map and got a successfully resolved
  24-component network, so the throw is attributable to the key and not to
  something else in the circuit.
- **Verified** **yes - CONFIRMED by this writer, re-run rather than relayed.**
- **Why it is open** which end of the mismatch is wrong is a contract decision,
  and the cheap fix (rename the circuit's port) would silently settle the
  repository-wide question by precedent.
- **What would settle it** **CRITERION:** `resolveNetwork` succeeds on every
  circuit in `circuits/`, and a test asserts it per circuit so a sixth circuit
  cannot be added un-resolvable. **MECHANISM, untried, and the choice between the
  two is the decision above:** either rename `pt2399-core`'s port to `ground`, or
  let a `Network` declare which of its ports is the reference and make
  `GROUND_PORT_KEY` the default rather than the law - with a test over whatever
  set of spellings is accepted, never a widening to fit one circuit.

### G89 - `circuits/pt2399-core` cannot emit a SPICE deck for two FURTHER independent reasons, and fixing any one of the three changes nothing

**Three independent refusals stand between `circuits/pt2399-core` and a SPICE
deck, and they are at two different layers.** G88 is the first. These are the
other two, and the reason they share an entry is the reason they are worth
recording at all: **each one alone is a one-line finding; together they mean the
circuit is not one fix away from being simulable, and an agent that fixes one and
reports progress will have reported something false.**

**(a) `kind: "ic"` has no emission rule.** `emitUnit` in `lib/sim/device-lines.ts`
dispatches on value kinds, model kinds and `connector`, then throws by design:

```
component "delay_ic" unit "MAIN": kind "ic" has no SPICE emission rule in this
emitter, so it cannot be emitted
```

That throw is deliberate and its comment says so - *"Required, not defensive.
Without it a kind added later stops being emitted with no signal at all, leaving
a complete, well-formed, entirely wrong netlist."* **The refusal is correct
behaviour; the gap is that no rule exists for the kind.**

**(b) `power_signal_header` does not declare `PartSpec.electricallyInert`.** It is
`kind: "connector"` with `part: {"symbol": "Connector_Generic:Conn_01x05",
"footprint": "Connector_PinHeader_2.54mm:PinHeader_1x05_P2.54mm_Vertical"}` and
**no `electricallyInert` field at all** - `undefined`, which `emitConnector`
refuses with its own message. A 5-pin header is inert, so this is a missing
declaration rather than a design question.

**This is NOT the optical compressor's case, and conflating them is the trap.**
`circuits/optical-compressor` also refuses to emit - the 1N5817 and the vactrol
LED carry no SPICE model - but **that refusal is pinned as intended** by
`tests/circuits/optical-compressor.test.ts`, which asserts both throws by name
(`/power_reverse_polarity_diode.*declares no SPICE model/s` and
`/vactrol_led.*declares no SPICE model/s`). **`pt2399-core`'s three refusals are
pinned by nothing.** One circuit's unemittability is a documented decision; the
other's is an unnoticed state.

- **Found** 2026-10-19, relayed by the circuit-families prior-art pass
  (`docs/schematic/generation-prior-art-circuit-families.md` §0(b)) and then
  re-run here.
- **Evidence** a script at `e619029` that added a `ground` port key to get past
  G88, resolved the network (24 components), then called `emitUnit` on every unit
  of every component and collected the throws. **It reported exactly 2 refusals**,
  quoted above, naming `delay_ic` and `power_signal_header` - **so it could have
  reported 0, 1 or 3**, and the count is the evidence that fixing G88 alone leaves
  the circuit unemittable. The component's `part` object was printed and carries
  no `electricallyInert` key. `grep` over `tests/circuits/pt2399-core.test.ts` for
  `resolveNetwork|toSpice|emit` returns nothing; the same grep over
  `optical-compressor.test.ts` returns the two pinned throws.
- **Verified** **yes - CONFIRMED by this writer, re-run rather than relayed**,
  including the "fixing either alone does not help" claim, which is what the
  refusal count establishes.
- **Why it is open** (b) is a one-line declaration and would be fixed in passing,
  but fixing it alone produces no deck and no test would notice either way.
  (a) is the real work: a SPICE rule for `kind: "ic"` needs a macromodel or
  subcircuit per part, and **this repository has no PT2399 model** - inventing one
  is exactly what `lib/sim/models/`' provenance requirement forbids.
- **What would settle it** **CRITERION:** either `pt2399-core` emits a deck that
  a simulator accepts, **or** its unemittability is pinned by a test that asserts
  each refusal by name, the way the optical compressor's is - **so that the state
  is a decision somebody made rather than a thing nobody noticed.** The second is
  the cheaper and probably the right one while no PT2399 model exists. **MECHANISM,
  untried:** declare `electricallyInert: true` on the header; then, for the IC,
  either register a sourced PT2399 model with its provenance stated per
  `lib/sim/models/`' own rule, or add the pinning test and record here that the
  circuit is deliberately deck-less. **Do not add a generic `ic` emission rule**:
  a kind whose pins are whatever the part has cannot have one argument order, and
  `spicePinOrder` already refuses subcircuit-backed kinds for that reason.

### G90 - what defeats a general schematic router is NET DEGREE, not circuit family, not part count and not the decade - and every circuit here exceeds the threshold

**This is a measurement, not a defect, and it is the load-bearing fact under the
schematic-generation program's architecture.** It is recorded because the wrong
version of it was in a spec for a week, and because its replacement is the kind of
thing a later agent would otherwise re-measure from scratch.

**What was measured, on `devbisme/schematizer` 0.2.0.**

- **`--mode normal` failed on all four non-Pultec circuits: 0 successes in 12
  attempts**, across a passive EQ, an op-amp circuit, a discrete transistor board
  and a delay IC.
- **`circuits/opamp-buffer.ts` fails.** Nine parts, one op-amp, four capacitors -
  the simplest circuit here and the shape the tool is built for - **failing in 2.9
  to 3.8 seconds.** This is the result that kills "passive EQ" and "old circuit"
  as the explanation.
- **The degree sweep, on an ACTIVE circuit** - one TL072 follower plus N rail
  capacitors, N the only variable: **max net degree <= 4 routes 12/12; max net
  degree >= 5 routes 17/44.**
- **The control separating degree from part count:** the same follower with
  capacitors in a **series chain**, every net at degree <= 3, routed **15/15 at 15
  parts**; 15 parts with one degree-15 net routed **1/5**.
- **`pt2399-core` failed 0/3, identically to the passive Pultec.**
- **Every circuit in `circuits/` exceeds degree 4 on at least one net**, and every
  one has a **ground net of degree 6 or more**: `opamp-buffer` 6, `preamp-lab` 12,
  `pt2399-core` 12, `optical-compressor` 17.

**AND THE HALF THAT MAKES THIS A CONSTRAINT RATHER THAN A WALL: a mature engine
does not fail at it.** ELK, through `netlistsvg`'s analog skin, drew **14
capacitors in parallel in 0.17 s, byte-identical across 30 runs, with zero
crossings between different nets** - the exact probe `schematizer` never once
drew, and ten such probes succeeded 10/10. **Read the degree threshold as a
property of one router, not of the problem.** An entry that recorded only the
failures would be bait: it would read as "high-degree nets are unsolved" and send
someone to build what already exists.

**What this corrected, which is the reason it is in the register.** The
agent-authored-boards spec's two-track section said the axis was *probably*
topological with a measurement in flight, and carried the owner's framing -
*"modern circuit topologies"* versus *"20th-century designs"* - as the axis. **The
chronological framing is dead**: a delay IC and a nine-part op-amp buffer fail
exactly as a 1950s passive EQ does. The spec was corrected at `e619029` and keeps
his framing visible as superseded, because **the architecture he proposed is right
and only the axis he named it by was wrong.**

**One thing this does NOT establish, recorded undiagnosed.** **Where** in
`schematizer.engine.route` the degree threshold bites was not traced, and the
sweep is **non-monotonic** - N=8 routed 5/8 while N=5 routed 2/5. So "degree 5"
is a characterised threshold, not an explained one, and nothing here licenses
treating 4 as a hard boundary in a rule file.

- **Found** 2026-10-19, by the circuit-families prior-art pass,
  `docs/schematic/generation-prior-art-circuit-families.md` §1, §2, §3; the ELK
  half from `docs/schematic/generation-prior-art-third-pass.md` §3.4, §3.5.
- **Evidence** both documents' `[RAN]` marks, with per-run success counts and
  seconds-to-fail given per circuit and per sweep point, and the series-chain
  control as the check that **could have failed and did not** - had part count
  been the variable, 15 parts in a chain would not have routed 15/15.
- **Verified** **no - RELAYED.** This writer ran neither `schematizer` nor
  `netlistsvg`, and re-derived none of the counts. **What this writer did
  confirm** is the two repository-side facts in G88 and G89, which are from the
  same document and did reproduce - that raises confidence in the document, and
  it is not the same as having checked these numbers.
- **Why it is open** it is the measurement, not a defect; it stays because the
  spec now rests on it and because the superseded framing must remain legible to
  anyone reading the owner's words in it.
- **What would settle it** nothing settles a measurement; **what would CHANGE it**
  is tracing where the threshold bites, or re-running the sweep against a router
  that is not `schematizer`. **The claim that would be falsified** by a later
  measurement: that a general layout engine's success is a function of max net
  degree rather than of part count or circuit family. Test it the way this pass
  did - vary one and hold the other.

### G81 - `lib/kicad/schematic.ts` emits the exact pathology another project was blocked from shipping, and the review that blocked it cites THIS repository as where the pathology was first seen

**This is a defect sitting in this repository right now, not a risk in the
port.** The emitter's own doc comment, read by this writer at `9eb6394`:

> A KiCad schematic STUB, written once from a canonical Network. … every pin is
> carried by a short wire to a net label, so **connectivity is carried entirely
> by labels.** That is a starting point, not a drawing

The pedals schematic generator's spec rev 1 made the same choice - *"**Labels,
not wires.** Every pin connects through a net label placed exactly on its pin
end. This is a standard KiCad style, ERC-valid, and diff-friendly"* - and a
third-party design review blocked it within an hour, before any code existed:

> **1. Blocking: don't adopt "labels, not wires" as the schematic
> representation**
>
> This optimizes for the generator rather than for the artifact the generator is
> supposed to produce.
>
> You already discovered essentially this pathology in **the audio-circuits
> schematic-generation work**: when almost every connection becomes a label, the
> schematic stops communicating circuit topology.

and on why it mattered: *"The PDF **is** wiring in its human-readable
representation. If the owner can't visually follow a signal path … then an
important independent verification channel has disappeared."* The requirement
that replaced it, one minute later in rev 2: *"Generated schematics SHALL show
local circuit topology using wires. Net labels SHALL primarily identify rails,
interfaces, and connections crossing functional-block or sheet boundaries."*

**Two things make this worth an entry rather than a line in a plan.** First, the
honest framing of the port is *stop emitting the labels stub* - it is importing
the fix to a failure already here, not a solution to a new problem. Second, the
same doc comment carries a **second, separate defect**: *"the operator arranges
it in KiCad and owns it from then on … positions, wires, labels and text are the
operator's"* is the division of labour `CLAUDE.md` reversed on 2026-10-10. The
file asserts a rule the project no longer holds, and a reader who trusts the
comment over `CLAUDE.md` will hand schematic work back.

- **Found** 2026-10-19, by this task, from §3 and §10 (candidate 1) of
  `docs/schematic/schgen-development-history.md`.
- **Evidence** `lib/kicad/schematic.ts` lines 2-9, read directly by this writer;
  the blocking review and both spec revisions quoted in that document's §3,
  sourced to `git show d9f5753` in the pedals repository and to the session
  transcript the owner pasted the review into.
- **Verified** **split, and the halves differ.** The defect in this repository is
  **CONFIRMED** - this writer read the comment. The pedals review that names it,
  and the rev 1 / rev 2 texts, are **RELAYED** from the history research; this
  writer read neither the transcript nor the other repository's spec.
- **Why it is open** it is the thing the schematic-generation program exists to
  replace, so fixing it piecemeal now would duplicate work the program will do.
  **What was missing is that nothing recorded it as a defect** - `CLAUDE.md`
  describes the emitter as a stub, which is honest about what it is and silent
  about it being a known failure mode with an outside review against it.
- **What would settle it** **CRITERION:** the emitter shows local circuit
  topology with wires and uses labels only for rails, interfaces and connections
  crossing block or sheet boundaries; **and** the labels stub is **deleted** when
  its replacement lands, rather than left beside it (`CLAUDE.md`: supersede means
  delete). The stale division-of-labour sentence in the doc comment is a separate
  one-line fix that need not wait for the port. **MECHANISM:** the port described
  in `docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`.

### G83 - the readability gate this program would copy handed its reviewer a LIST of defects to look for, and five of twenty findings map onto that list one-to-one

The gate is otherwise the strongest part of the record (G82): a reviewer denied
the circuit description, the code, the IR and the design notes, reading rendered
pages only. **Its one structural weakness is in the dispatch prompt**, which
pre-named the categories:

> text overlapping or too close; labels or notes naming parts by ids that are not
> on the drawing; … wasted space that forces a large paper size; a "do not
> populate" cross that hides pin numbers; unclear supply arrows; wide bus legends.

Set against the 20 defects reported, that list anticipates **defects 5, 6, 7, 8
and 11 almost one-to-one.** So the reviewer was independent of the **source** but
not of the **controller's expectations** - and the controller was the agent that
had just built the thing. That is a softer form of the failure `CLAUDE.md`
describes: the producing side choosing what the checks are.

**The hints did not fully determine the outcome**, and the entry would be
dishonest without this: the reviewer found the blocking Zener defect, challenged
a `labels`-rendered block's stated reason (`U_POGO` - the reason claimed the
label names the probed net; true of only 4 of 9 pads), and caught a double VSSA
glyph, none of which are on the list. The weakness is a contamination of the
channel, not a demonstration that the channel failed.

- **Found** 2026-10-19, by this task, from §5 (*"One honest weakness in the
  gate"*) and §10 (candidate 3) of
  `docs/schematic/schgen-development-history.md`.
- **Evidence** that document's comparison of the dispatch prompt in
  `subagents/agent-a5ece5e34462a1b75.jsonl` line 1 against the 20 defects in
  `h7-platform/boards/v1/VERIFICATION.md`.
- **Verified** **no - RELAYED.** The history research quotes the prompt and marks
  the comparison CONFIRMED; this writer read the document, not the transcript.
- **Why it is open** this repository has no reading gate yet, so there is nothing
  to fix - the entry exists so the gate is not specified by copying the prompt.
  **A prompt is the easiest part of a gate to clone and the easiest place to
  smuggle the producing side's expectations in.**
- **What would settle it** **CRITERION:** this repository's own reading gate
  hands its reviewer the **criterion** - can you follow this block from the
  drawing alone? - and **not a list of defect categories**, and the dispatch
  prompt is committed so the question can be checked after the fact.
  **MECHANISM, untried:** if coverage of known failure classes is wanted anyway,
  it belongs in the machine refusals (G85) where it is checkable, not in the
  human-judgement channel where it biases the only independent reader.

### G84 - a labels fallback for a block no template fits degrades the GATE, not merely the drawing, and the fix for it has to land before any template does

The pedals spec rev 2 had the obvious mitigation: *"A block whose topology fits
no template falls back to labels inside that block only, and is listed in the
render report so a template can be added."* A second design review killed it:

> Why generate a knowingly inferior schematic and rely on an agent later noticing
> it? … You already know the desired invariant. Make the tooling enforce it. …
> That's much safer than silently degrading.
>
> **This also makes the readability gate a genuine independent check rather than
> part of the normal rendering workflow.**

**That last sentence is the finding.** A fallback does not only degrade the
output - it degrades the reading gate, because the independent reviewer ends up
auditing damage the pipeline chose to do rather than reading a drawing the
pipeline stands behind. Rev 3 replaced it with hard failure, and the
consequences are ordering constraints a port inherits whether or not it notices
them:

- **An unrealisable block fails generation**, so the template set must cover
  every block on the board before the schematic can exist at all. A port
  therefore **cannot build the generator and then point it at a circuit; it must
  enumerate the circuit's blocks first and build to that list.**
- The usual resolution of *"no template fits"* was **decomposing the block across
  existing templates**, not writing a new one - seven templates drew all 103
  blocks of that board. Budget decomposition as the primary tool.

This is the same rule `CLAUDE.md` already states in two other voices - *"Refuse
rather than guess"*, and *"An empty whitelist that refuses loudly beats a general
rule that quietly accepts a guess"* - and the user-level rule against fallbacks
outside test code. **It is recorded here because the reasoning is new: the cost
is paid by the gate, which is the part nobody is watching.**

- **Found** 2026-10-19, by this task, from §8 (dead end 2) and §7 of
  `docs/schematic/schgen-development-history.md`.
- **Evidence** that document's verbatim quotation of the second design review and
  of spec rev 2's fallback clause, with the rev 3 replacement; the ordering
  constraints are its §7, sourced to the spec's own risk list.
- **Verified** **no - RELAYED.** CONFIRMED in the history research against the
  pedals spec revisions and transcript; this writer read the document only.
- **Why it is open** nothing here can fall back yet because nothing here renders
  blocks. The entry is a constraint on a design that has not been written, which
  is the only time it is cheap.
- **What would settle it** **CRITERION:** no path in a schematic emitter here
  produces a knowingly inferior drawing - a block no template realises **fails
  generation with a refusal naming the block and the missing template**, and the
  reading gate never sees deliberately degraded output. **MECHANISM, untried:**
  enumerate the blocks of the circuits in the program's verification set before
  the first template is written, so the template set is built to a known list
  rather than discovered to be short.

### G85 - the ~160 clearance refusals that make a generated schematic readable accreted ONE PAIR AT A TIME over eleven steps, and each new one exposed the previous ones' blind spot

**The shape of the ladder is the finding, because it is a property of how
clearance checking gets built rather than of that particular board.** Eleven
steps in one day, each named in a commit message with the drawing that caused it:
a labelled stub ending on a capacitor's pin (*"KiCad would not join these, but a
reader would"*); text promoted to geometry; a symbol's own pin text overlapping
itself; a capacitor body drawn over a neighbouring pin's GND glyph that
**two existing checks both passed** (*"body clearance saw only the anchor point,
and the text check saw glyphs only as obstacles for text, never against
bodies"*); two power glyphs meeting corner to corner; a stock symbol drawing GND
0.13 mm under three pin names, which a strict-overlap test missed and a
**0.254 mm minimum gap** caught; a reference landing on the X of a **hidden**
no-connect pin.

Every step had the same shape: **category A had been modelled as an obstacle for
category B but not for category C.** Body-vs-anchor but not body-vs-glyph.
Glyph-vs-text but not glyph-vs-body. Glyph-vs-body but not glyph-vs-glyph.
Text-vs-everything but not text-vs-no-connect-marker. A symbol against its
neighbours but not against itself. Current counts in that generator: **170
`throw new` in `render/`, 56 in `gates/`, 45 in `h7/`, 0 in `model/`.**

**The evidence standard those refusals were held to is worth copying
independently of the ladder:** each new check was run against the historical
commit that contained the real defect and the exact refusal message recorded -
*"refuses P_LDO with 'body of C_NR#1 overlaps the glyph of power symbol GND 2 at
(0, 15.24)'"* - with the commit noting *"No template geometry changed"*, proving
the check was a detector and not cover for a layout change. That is a check that
could have failed.

- **Found** 2026-10-19, by this task, from §6 and §10 (candidate 4) of
  `docs/schematic/schgen-development-history.md`.
- **Evidence** that document's eleven-row table, each row sourced to a named
  commit in `tools/schgen` (`8217d4f`, `dfa1b6a`, `60cf1ed`, `986a518`,
  `253664a`, `54d7d3f`, `ffc4cd5`, `c2aba75`, `77b6cf7`, `e501b84`, `997078a`,
  `9c5fb36`), plus the `throw new` counts.
- **Verified** **no - RELAYED.** The history research read that git history and
  marks the chain CONFIRMED; this writer read the document, not the commits.
  **The `throw new` counts in particular are one grep in another repository and
  were not re-run here.**
- **Why it is open** there is no clearance checking in this repository to fix.
  The entry is the shortcut, recorded before the work starts rather than after it
  has walked the same ladder.
- **What would settle it** **CRITERION:** the clearance system here is specified
  as a **matrix of obstacle-category pairs enumerated up front**, and a new
  refusal is a cell being filled rather than a category being discovered - with
  each cell's test run against output that every other check accepts. The
  categories the pedals history names, as a starting list to be extended and not
  as the list: bodies, pin lines, pin numbers, pin names, interior graphics,
  wires, junctions, power and `PWR_FLAG` glyphs, label outlines, field text,
  frame borders, no-connect markers **including at hidden pins**, and KiCad's DNP
  cross. **MECHANISM, GUESSED and labelled as such by its author** - *"INFERRED,
  and I would bet on it"* - that enumerating the matrix up front short-circuits
  the ladder. **It is untested: the pedals project did not do it, so nobody knows
  whether the categories can in fact be enumerated before the drawings exist.**
  The criterion is the settlement; if the matrix turns out not to be
  enumerable in advance, record the deviation here rather than quietly going back
  to the ladder.

### G86 - text was retrofitted as first-class geometry and invalidated 4 of the 7 templates an hour after they were written, which that project's own author calls the clearest avoidable cost in its history

Sequence, in one day: the first template at 01:36; **text promoted to
first-class geometry at 03:01** (per-unit body boxes, fields placed by KiCad's
own autoplace convention, text sized at one grid step per character - *"nothing
had modelled text before this"*); the block-level text check switched on at
03:15, which **broke most of the template set**, met by a `TEXT_CHECK_PENDING`
set that *"exempts exactly opamp-stage, regulator, crystal and
connector-fanout"* - **4 of 7**; the exemptions retired one by one and gone by
04:16, with `253664a`'s subject line stating the end state, *"no template exempt
from the text check."* An explicit ruling split one plan task into three
sub-tasks to absorb it: **three extra review cycles.**

**Two separable lessons, and the second one is the one with teeth here.**

1. The scaffold was handled correctly: when a new refusal broke existing output,
   the specific known cases were exempted **by name** with a visible marker and
   retired within the hour, rather than the rule being widened. `CLAUDE.md` says
   the same thing about empty whitelists.
2. **The cost was in the ordering, not the handling.** Template geometry designed
   without text extents is template geometry that will be redrawn. And the four
   that failed are not an unlucky sample for this repository: **`opampStage` is
   one of them**, and `opampStage`, `passiveChain` and `divider` are the three a
   Pultec-style circuit leans on hardest (G87).

- **Found** 2026-10-19, by this task, from §6, §7 (*"Text must be first-class
  geometry before templates are finalised, not after"*) and §8 (dead end 3) of
  `docs/schematic/schgen-development-history.md`.
- **Evidence** that document's commit-by-commit timeline with the
  `TEXT_CHECK_PENDING` commit and `253664a`, and its confirmation by grep that
  the marker is absent from the current tree.
- **Verified** **no - RELAYED.** CONFIRMED there against the pedals git history
  and plan rulings; this writer read the document only.
- **Why it is open** it is advice about an ordering decision this repository has
  not made yet, and it stops being useful the moment the first template is
  written.
- **What would settle it** **CRITERION:** the first template authored here is
  checked by a text-clearance check that already exists - i.e. text extents are
  part of template geometry from template one, and no template is written against
  a geometry model that does not include its own text. **MECHANISM, untried
  here:** model per-unit body boxes, field placement and glyph extents before
  authoring templates, and if a later refusal does break existing templates,
  exempt them **by name with a visible marker** and retire the marker rather than
  weakening the rule.

### G87 - the templates this program plans to port were sized by a dense digital mainboard, and there is NO evidence about how they behave on a discrete audio circuit

**The program spec said otherwise for eleven days.** Its Purpose sentence, from
2026-10-08 until the correction committed by this task, read: *"The
`oletizi/pedals` repository demonstrates, **on a real four-stage fuzz board**,
that an agent can place and route a PCB and generate a legible multi-sheet
schematic."* That conflates two proofs on two different boards. The
place-and-route proof is the fuzz board; **the schematic generator never drew
it.** Its target was an STM32H743 mainboard - **7 pages, 103 circuit blocks, a
176-pin MCU, SDRAM, a PCM3060 codec, buck + LDO, 6 pots, USB-C** - and the
generator is hardcoded to it throughout (`pdfSource.ts` sets
`PDF = "h7-platform.pdf"`; `designatorMap.ts` checks
`h7-platform/boards/v1/REFMAP.md`). The correction is recorded in place in
`docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`.

**The consequence is the part that matters, and it is a live question rather than
a settled one.** Seven templates drew all 103 blocks of a dense digital
mainboard. **Nothing is known about their pass rate on a circuit that is mostly
passive chains, dividers and op-amp stages** - the history research says so
plainly: *"Everything here is evidence about a digital mainboard. `opampStage`,
`passiveChain` and `divider` are the three that a Pultec-style circuit would
lean on hardest, and I have no evidence about how they behave on a board that is
mostly those."*

**This is the mirror image of G66's risk, and holding only one of the two is how
the program goes wrong.** G66 records the owner's forcing-function directive
against **Pultec-shaped** assumptions - no shortcuts that special-case a Pultec
idiom. This entry records the opposite contamination: **mainboard-shaped**
assumptions arriving through the ported templates, unexamined, because the board
they were sized by is not mentioned anywhere in the program's own statement of
what it is porting. A template set that fits 103 digital blocks is not thereby
general, and *"it worked on the H7"* is not evidence about the Pultec in either
direction.

**This entry does not resolve it.** Whether the templates transfer, need
different proportions, or need different templates entirely is unknown, and
choosing is not this writer's to do.

- **Found** 2026-10-19, by this task, from §0 (*"Correction: schgen did not draw
  a fuzz pedal"*) and §9 (last bullet) of
  `docs/schematic/schgen-development-history.md`, together with the controller's
  own reading of the pedals tree (`tools/schgen/h7/pdfSource.ts`,
  `tools/schgen/h7/designatorMap.ts`).
- **Evidence** the board's parameters and the hardcoded `h7` paths as stated
  there; that the only `schgen.lock.json` in the pedals repository is under
  `h7-platform/boards/v1/`; and the spec's uncorrected Purpose sentence, which
  this writer read at `9eb6394` before editing it.
- **Verified** **split.** That the spec said *"four-stage fuzz board"* is
  **CONFIRMED** - this writer read it. That the generator's target was the H7
  mainboard and that no evidence exists about discrete audio circuits is
  **RELAYED**, from the history research and from the controller's report of
  reading those two source files; this writer opened neither.
- **Why it is open** it is a measurement nobody has taken, and it cannot be taken
  until templates exist here. The entry exists because **the question disappears
  if it is not written down**: the spec sentence that hid it has been corrected,
  and a corrected sentence is not a tracked question.
- **What would settle it** **CRITERION:** the ported template set is measured
  against the circuits already in this repository - which blocks it realises,
  which it refuses, and what had to change - **before** any claim that the
  tooling is general, and the result is recorded whichever way it comes out.
  `circuits/pultec/`, `circuits/transistor-preamp/`, `circuits/pt2399-core/` and
  `circuits/optical-compressor/` are the set the program already names.
  **MECHANISM:** the program's own ported-template-parity milestone is where this
  lands; it is not a separate piece of work.

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

### G70 - three IN-FORCE standards hold the layout requirements this project needs, and none of their normative text was obtained

| document | what is in hand | what reading it would settle |
| --- | --- | --- |
| **IPC-2612-2010** §6 Layout, §7 Net Naming, Table 3-2 Font Size Examples | cover, full contents, scope, purpose, classification and applicable-documents clauses, verbatim | §6.1 Connecting Lines, §6.2 Junctions, §6.5 Power and Ground, §6.6 Signal Paths, §7.3 Reserved Characters - the **in-force, electronics-specific** rules for the conventions this project most needs. It blocks any net-naming criterion outright (the reserved-character set is in §7.3), would settle **G72**, and would settle the contaminated sentence in **G69** |
| **IEC 61082-1:2014** clauses 5, 7, 11, 12 | cover, foreword, introduction, full contents, scope, normative references, verbatim | 7.1.1 flow of energy and signal, 7.1.3 connecting lines, 7.4.2 Layout, 7.4.5 supply circuits, 5.2 text orientation, 11 structured documentation, 12 **CAx conformance requirements** - this is the in-force layout standard and **only its clause and figure titles are in hand** |
| **ASME Y14.2-2014 (R2020)** | the scope statement only | the minimum lettering height |

**ONE DISTINCTION IN THAT TABLE MUST NOT BLUR.** Y14.2's number - and
IPC-2612 Table 3-2's - is **UNREAD, not unset.** It exists, it is citable, and it
is behind a paywall. That is a different thing from **G71**, where no source
anywhere states a number. **An unread threshold must be read; an unset one is a
decision.** Conflating them is how a chosen number passes as a cited one.

**Two smaller sources also unread, named so nobody assumes they were consulted:**

- **`klc.kicad.org` returned HTTP 403**, so the KiCad Library Convention rule
  numbers and its exact values for pin length, field placement and text sizes are
  absent from the research. The 50 mil grid and the 50 mil field text size came
  from KiCad's Schematic Editor documentation instead.
- **IPC-2611**, which IPC-2612's own classification clause makes normative
  (*"Classification of Schematic and logic diagrams shall meet the requirements of
  IPC-2611"*), is **unexamined**. It governs grades and completeness modes and may
  carry further presentation requirements.

About a dozen candidate criteria in the readability research are marked *title
only* because of this entry, and **G69**'s rule binds every one of them: a title
establishes that a standard rules on a topic, never what it requires.

- **Found** 2026-10-19, by the standards research pass committed at `51f8362`
  (§1.4, §1.6, §7.1, §7.6), read in full by this writer.
- **Evidence** §7.1's table of what was and was not obtained, each row naming the
  free preview or front-matter PDF it came from; the HTTP 403 recorded in §7.6.
- **Verified** **no - RELAYED.** What is in hand and what is not is the research
  agent's own account of its fetches; this writer did not attempt any of them.
  The documents themselves are not in this repository.
- **Why it is open** procurement, not research. These are paid standards and KLC
  is a fetch that was refused; no amount of further searching substitutes for
  buying or borrowing them.
- **What would settle it** **CRITERION:** for every criterion sourced to
  IPC-2612, IEC 61082-1 or ASME Y14.2, the clause text was read by whoever wrote
  the criterion - and until then the criterion is recorded as *title only* rather
  than stated. **MECHANISM, untried:** obtain the three standards, IPC-2612 §6
  first because it is the in-force electronics-specific one and settles the most;
  and fetch KLC by a route that is not refused. Whether this repository spends on
  standards is an owner decision and **nobody has put it to him.**

### G79 - KiCad's official API cannot touch the schematic editor, so every tool that writes a schematic writes `.kicad_sch` s-expressions directly

The **IPC API** (public beta in KiCad 9, protobuf over NNG, official `kicad-python`
bindings on PyPI, Python 3.9-3.12) **does not support the schematic editor or the
library editors.** It also requires a *running* KiCad with a document open - every
accessor is an RPC to the live editor, with no offline file-reading path - and it
provides no plotting or export, for which KiCad directs callers to `kicad-cli`.
The older SWIG `pcbnew` API is board-only. And **KiCad has no
netlist-to-schematic path at all**: importing a netlist into pcbnew *"merely
stacks footprints at origin with nothing usable"*, and nothing goes the other way
into eeschema.

**Therefore every tool the prior-art pass surveyed that writes a schematic
programmatically writes the s-expressions directly** - `kicad-sch-api`,
`schematizer`, `circuit-synth`, `kiutils`, `kicad-skip` and
`rjwalters/kicad-tools`. There is no sanctioned alternative, which is why
byte-exact round-trip formatting is a capability worth naming at all.

**What it constrains here, concretely.** `lib/kicad/schematic.ts` emits the file
itself and will go on doing so, so the emitter's correctness is this repository's
problem and not KiCad's; and the only supported checks on the result are
`kicad-cli` ERC and export, which `make check` already runs on every board on
every run. That puts this repository ahead of most of the surveyed field on the
*"look at the output"* axis - and it is not a choice anybody made here, it is the
only road.

- **Found** 2026-10-19, by the prior-art research pass committed at `ba6dba1`
  (§5 "KiCad-specific automation"), read in full by this writer.
- **Evidence** that document's §5, marked `[THIRD-PARTY]` plus official
  mailing-list and documentation extracts, with the list of six tools that write
  s-expressions directly.
- **Verified** **no - RELAYED.** The API's limits were read on documentation and
  third-party pages through a summarising fetch tool; **nobody here called the
  IPC API to confirm the schematic editor is absent from it.**
- **Why it is open** it is upstream. Nothing in this repository fixes it, and the
  entry exists so that no design here budgets for a schematic API that does not
  exist.
- **What would settle it** **CRITERION:** a sanctioned KiCad API that reads and
  writes schematics offline - at which point this entry is deleted.
  **MECHANISM:** none available. Until then this is a constraint to design
  against rather than a defect to fix, and the cheap confirmation nobody has run
  is to look for schematic services in the installed `kicad-python` bindings.

### G107 - the `schgen` port keeps the pedals source's non-null assertions unchanged, by decision D7, not by oversight

`docs/superpowers/plans/2026-10-19-schematic-authoring-m1.md` decision **D7**
decides this for the whole port, before any of it landed: pedals compiles
under `noUncheckedIndexedAccess`, so its non-null assertions (`!`) are load-
bearing there; this repository's `tsconfig.json` does not set that flag, so
under this compiler the same assertions are redundant no-ops rather than
something unsafe. **Rewriting them is deliberately out of scope** -
unreviewable churn across the whole port that would bury the port diff -
and this repository's own `lib/` already carries 19 of its own. **New code
this plan writes by hand (never through `tools/schgen/port.ts`) carries
none**: `lib/schgen/strict.ts`, `tools/schgen/port.ts` and
`tests/schgen/*.test.ts` have zero.

- **Found** 2026-10-19, recording D7 into this file as Task 1 Step 9
  requires, against the 18 files Task 1 actually ported (of the ~93-file
  corpus the whole port will eventually cover).
- **Evidence** D7's own text names "194 non-null assertions across 13 non-
  test files" for the full port. A grep for the pattern
  `[A-Za-z0-9_)\]]![^=]` (identifier/`)`/`]` immediately followed by `!`,
  excluding `!=`/`!==`) over pedals' `tools/schgen/` (excluding `h7/`,
  `__fixtures__/`, `integration/` and `*.test.ts`) finds the assertion in
  **exactly 13 files** - matching D7's file count - but **70 occurrences**,
  not 194; a crude line-based grep plausibly undercounts (it does not
  special-case optional chaining, multi-assertion expressions on one line,
  or assertions inside multi-line expressions). **The 18 files Task 1 itself
  ported contain zero** - the assertion-bearing files (`render/emit.ts`,
  `ir/build.ts` and others) are not among them; see the scope note in
  `lib/schgen/README.md`.
- **Verified** **no - RELAYED for the 194/13 figure** (it is D7's own
  measurement, not re-derived here with a method precise enough to confirm
  the exact count). **CONFIRMED** for "zero assertions in the files Task 1
  ported" - this writer ran the grep above directly against
  `lib/schgen/**/*.ts` as it stands after Task 1 and it matched nothing.
- **Why it is open** it is a standing decision, not a defect: it stays open
  only in the sense that the exact occurrence count (194 vs. this entry's
  70) has never been reconciled with one authoritative method.
- **What would settle it** **CRITERION:** a single counting method (an AST
  walk for TypeScript's `NonNullExpression`, not a regex) run once over the
  complete ported corpus once every file in D7's 13 has landed, with its
  result recorded here in place of both figures. **MECHANISM, untried:** a
  small script using the TypeScript compiler API's `forEachChild`, run after
  the task that ports the last of those 13 files.

### G108 - `lib/kicad/sexpr.ts`'s `parseSexpr` is now a derivation of `parse`, not an independent reader, and the two have never disagreed because they share one tokeniser

Before Task 1, `parseSexpr` was the only reader in `lib/kicad/sexpr.ts`: a
hand-written tokeniser that decoded every `\x` escape to `x` unconditionally
and threw away whether each atom was quoted. Task 1 replaces it in place
with `parse` (ported from `digital-pedal-platform`'s `tools/kicad/sexpr.ts`),
which keeps that information (`SAtom.quoted`, `SAtom.lossyEscape`), and
`parseSexpr` is reimplemented as `toSNode(parse(text))` - a projection that
discards the new information to reproduce the old shape exactly. There is
now one tokeniser in this file, not two.

- **Found** 2026-10-19, during Task 1 (the port's home and the `sexpr.ts`
  replacement), recorded as Step 9 of the task requires.
- **Evidence** `lib/kicad/sexpr.ts` itself: `parseSexpr` has no tokenising
  logic of its own, only `toSNode`. `tests/kicad/sexpr.test.ts`'s pre-
  existing cases (quoted atoms with spaces/parens, backslash-escape
  unescaping, unbalanced/trailing-content refusals, a quoted form name) all
  pass unchanged against the new implementation, and four new cases added in
  this task exercise `parse` and `quoteString` directly (`quoted` surviving,
  `lossyEscape` being `"\\n"` for KiCad's multi-line escape and `null` for
  `\"`/`\\`, and a `quoteString`-through-`parse` round trip).
- **Verified** CONFIRMED - this writer ran `bun test tests/kicad/` and
  `tests/schgen/` directly; all pass, including the netlist/footprint-
  extent/symbol-library consumer tests, unchanged.
- **Why it is open** it is not a defect; it is recorded because a later
  reader of `lib/kicad/sexpr.ts` needs to know `parseSexpr` is a derived
  shim before "simplifying" it back into an independent parser, which would
  reintroduce two answers to one question - the exact failure mode Task 1's
  brief names as the reason the old reader was replaced rather than kept
  beside the new one.
- **What would settle it** **CRITERION:** none needed - this is the settled
  state Task 1 was asked to reach. This entry is deleted if `parseSexpr` is
  ever removed outright (its three consumers migrated to `parse` directly),
  since at that point there is nothing left to warn about.

### G109 - `lib/kicad/symbol-library.ts`'s raw-text workaround for `parseSexpr`'s lossy decode is now unnecessary, but it has not been removed

`lib/kicad/symbol-library.ts`'s module comment says `parseSexpr` "is used to
read names and pin geometry, but never to re-serialise: it drops whether an
atom was quoted, and KiCad distinguishes `yes` from `\"yes\"`" - which is why
that file treats vendored symbols as raw text rather than re-emitting them
through the parser. `parse` (Task 1) now carries exactly the information
`parseSexpr` dropped: `SAtom.quoted` and `SAtom.lossyEscape`. The workaround
is no longer the only way to avoid that loss - a re-serialiser could call
`parse` directly, check `lossyEscape` on every atom, and refuse rather than
emit if any atom carries one.

- **Found** 2026-10-19, during Task 1, as a direct consequence of replacing
  `lib/kicad/sexpr.ts`'s reader - recorded because Task 1's own brief names
  this file's workaround as the evidence for why the old reader had to be
  replaced rather than extended, and a later reader needs to know that
  evidence is now stale.
- **Evidence** `lib/kicad/symbol-library.ts`'s module comment (quoted above,
  read directly) against `lib/kicad/sexpr.ts`'s current `SAtom` interface,
  which now exposes `quoted` and `lossyEscape`.
- **Verified** CONFIRMED the information now exists in `parse`'s output -
  this writer read both files directly. **NOT verified**: whether
  `symbol-library.ts` can actually be switched to re-serialising through
  `parse` without a behavioural change for its callers; nobody has tried.
- **Why it is open** Task 1's scope is the reader, not this file: switching
  `symbol-library.ts` off its raw-text workaround is a separate, deliberate
  edit with its own test, not a side effect of a reader replacement, per
  this repository's own "never guess, never silently widen" convention.
- **What would settle it** **CRITERION: symbol geometry is read through one
  reader** - either `symbol-library.ts` keeps its raw-text handling for a
  stated reason beyond "the old reader couldn't do better," or it is
  migrated to read through `parse` and the module comment is corrected to
  stop citing a limitation that no longer exists. **MECHANISM, untried:**
  switch `symbol-library.ts`'s raw-text handling to `parse`, add a test that
  a vendored symbol containing a quoted empty string or a `lossyEscape`-
  bearing atom is rejected or handled explicitly rather than silently
  mis-serialised, and delete this entry when that test exists and passes.

### G110 - the test suite's greenness now depends on a private sibling checkout (`SCHGEN_SOURCE`), and it will for all 19 tasks of this plan

`tests/schgen/port-fidelity.test.ts` is the only proof that every file under
`lib/schgen/` is still a mechanical port of its `digital-pedal-platform`
source rather than a hand edit. It needs `SCHGEN_SOURCE` to point at that
other repository's `tools/schgen/` directory on disk, and it **fails**
(never skips) when that variable is unset, by design (Task 1's brief, Step
2). This is the right behaviour for the test itself - a fidelity check that
silently skips looks like a passing one - but it has a consequence beyond
this one test that is worth recording on its own: **every one of this
plan's 19 tasks ports more of the same tree, so every one of them adds to or
depends on this manifest, and every one of them needs the same private
checkout present to get a genuinely green `bun test`.** A contributor (or an
agent) without that checkout gets exactly one named failure today; the same
will be true, for a growing reason, through Task 19.

Unlike this repository's other environment-dependent tests - `kicad-cli`
(`tests/circuits/transistor-preamp-lab.test.ts`) and Chrome
(`tests/guide/print-pdf.test.ts`) - `SCHGEN_SOURCE` has **no default path**.
`kicad-cli` and Chrome are installed packages with one standard location
per OS, so the README names a default and an override variable. `SCHGEN_SOURCE`
names another private repository checkout, which has no standard location
to assume - there is nothing here to default to without guessing a path
that would be wrong on any machine other than the one the plan was written
on. The `README.md` Prerequisites section and `lib/schgen/README.md` both
say this plainly now; before this fix, `README.md`'s Prerequisites section
closed by saying *"none of this requires an environment variable,"* which
this test contradicted from the moment it landed.

- **Found** 2026-10-19/2026-10-20 (review round 1's Important finding 2,
  fixed in the same round): the review on Task 1 noted the README's false
  claim and asked for the structural consequence - not just the one line -
  to be recorded.
- **Evidence** `README.md`'s Prerequisites section (read directly, now
  corrected) against `tests/schgen/port-fidelity.test.ts`'s unconditional
  throw when `SCHGEN_SOURCE` is unset (read directly, confirmed by running
  `bun test tests/schgen/` both with and without the variable set - see the
  Task 1 fix report for the exact commands and output).
- **Verified** CONFIRMED - this writer read both files and ran both cases
  directly.
- **Why it is open** it is not a defect to fix; it is a standing property of
  how this plan ports a tree that lives in another repository, recorded so
  a later task (or a reviewer, or a fresh contributor) does not have to
  rediscover it from a single test's throw message. It stays open for the
  life of the plan, the same way the `kicad-cli` and Chrome prerequisites
  stay open for the life of this repository.
- **What would settle it** **CRITERION:** either `digital-pedal-platform`'s
  `tools/schgen/` is vendored into this repository (so no external checkout
  is needed - a larger decision than any single task should make
  unilaterally, since it changes the whole plan's "the pedals source is the
  port's upstream" premise) or the plan's governing docs accept this as a
  permanent prerequisite, the way `kicad-cli` and Chrome already are.
  **MECHANISM:** not attempted here - this entry records the consequence,
  not a fix for it, per the brief's instruction to record it rather than
  decide it.

### G111 - the `tsconfig.json` target bump to ES2022 repeals a recorded ES2020 constraint, and roughly twelve call sites are now an unnecessary workaround left in place deliberately

Two ported files need ES2021/2022 stdlib methods that must stay byte-
identical to their pedals source: `lib/schgen/lock/annotate.ts` uses
`Object.hasOwn`, `lib/schgen/lock/refmap.ts` uses
`String.prototype.replaceAll`. Neither compiles under this repository's
previous `tsconfig.json` (`"target": "ES2020"`, no explicit `"lib"`, so TS
used `lib.es2020.full`): `tsc` raised `TS2550` on both. The fix landed in
Task 1's first commit was `"target": "ES2022"` (not an explicit `"lib"`
override - see below for why that distinction matters).

**This silently repeals a constraint recorded elsewhere.**
`docs/superpowers/plans/2026-09-22-canonical-model-plan-b.md:77` states:
*"`tsconfig.json` targets ES2020. `Object.hasOwn` does not compile
(TS2550) — use `Object.prototype.hasOwnProperty.call`. `key in obj` is NOT
equivalent."* That constraint produced **exactly twelve live call sites**
across eight files, all using the `hasOwnProperty.call` workaround the
constraint names:
`lib/model/builder.ts:91`, `lib/model/kinds.ts:93,164`,
`lib/model/include.ts:45,53`, `lib/model/control-state.ts:82,212,221,228`,
`lib/model/pin-collision.ts:40`, `lib/model/topology.ts:109`,
`lib/model/validate.ts:22`, `lib/sim/device-lines.ts:198`. **All twelve are
now an unnecessary workaround** - `Object.hasOwn` compiles under
`"target": "ES2022"` - which is `CLAUDE.md`'s *"a result that makes someone
want to act."* **This task does not act on it**: rewriting twelve call
sites in eight files across `lib/model/` and `lib/sim/` is out of scope for
a schematic-port task and would bury this fix's diff; it is recorded here
instead, for a task that owns `lib/model/`'s and `lib/sim/`'s style to pick
up deliberately.

**The chosen mechanism, and why, resolving the review's Important finding
3(c).** The first attempt added an explicit `"lib": ["ES2022"]` while
leaving `"target": "ES2020"`. That compiled, but it **changed more than
described**: with no explicit `"lib"`, TypeScript had been defaulting to
`lib.es2020.full`, which is ES2020 **plus `DOM`, `DOM.Iterable` and
`ScriptHost`**; `"lib": ["ES2022"]` on its own **drops all three**, silently
narrowing what the whole repository can typecheck against (nothing broke at
the time, because `types: ["bun-types"]` already supplies `fetch`, used in
`tools/suppliers/http.ts:67` and `tools/cli/parts.ts:116`, but the removal
was real and undocumented). **The fix adopted instead bumps `"target"` to
`"ES2022"` and leaves `"lib"` unset**, so TypeScript's default becomes
`lib.es2022.full` - ES2022 plus the same `DOM`/`DOM.Iterable`/`ScriptHost`
the repository already had. This raises the stdlib floor the twelve call
sites' constraint was written against **without removing anything** - the
narrower, more easily-overlooked change.

- **Found** 2026-10-19/2026-10-20, review round 1's Important finding 3,
  fixed in the same round.
- **Evidence** `tsc --noEmit` raising `TS2550` on both files under the
  original `tsconfig.json`; the twelve call sites above, each read directly
  and confirmed to use `Object.prototype.hasOwnProperty.call` (a check that
  could have failed: the grep that found them matches exactly twelve lines,
  not an estimate); `docs/superpowers/plans/2026-09-22-canonical-model-plan-b.md`
  line 77, read directly, quoted verbatim above; TypeScript's documented
  default-`lib`-by-`target` behaviour (`lib2020.full` includes `DOM`;
  `lib.es2022.full` includes it too) checked by running `bun run typecheck`
  clean under the final `"target": "ES2022"`, no `"lib"` override, config.
- **Verified** CONFIRMED - every claim above was checked directly by this
  writer, not relayed.
- **Why it is open** it is not a defect in this task's own work; it is left
  open because the twelve-site workaround is now unnecessary code nobody
  has removed, and because the ES2020 constraint in the plan-b document is
  now stale text describing a `tsconfig.json` that no longer exists.
- **What would settle it** **CRITERION:** either `docs/superpowers/plans/2026-09-22-canonical-model-plan-b.md`'s
  line 77 is corrected to describe the current target (or marked historical,
  since that plan is closed work), and the twelve `hasOwnProperty.call` call
  sites are replaced with `Object.hasOwn` in a task that owns `lib/model/`
  and `lib/sim/`'s style - with a test run before and after to show the
  substitution changes nothing observable. **MECHANISM, untried:** a small
  follow-up pass over the twelve named sites; not attempted here because it
  is out of scope for a schematic-port task.

### G112 - the IR has no MCU pin map, deliberately, and the branch needs restoring from the port source rather than reinventing

Task 2 ports `ir/build.ts` and `ir/types.ts` with a cut, not a straight
mechanical port: `BuildContext.pinmap`, `PinmapInput`, `partPins`'s `isMcu`
flag, `checkMcuConfig`, `CircuitSpec.mcu` and `Circuit.mcu` are all removed,
and `PinOrigin` drops `"pinmap"` down to `"circuit" | "nc-unlisted"`. This is
the plan's own instruction (`docs/superpowers/plans/2026-10-19-schematic-authoring-m1.md`
Task 2: *"porting the branch would ship a dead parameter whose only caller is
`generate.ts`'s MCU block, which Task 6 is not porting either"*) and
`CLAUDE.md`'s *"supersede means delete"* - there is no MCU anywhere in this
repository, so a pin-map branch here would be dead code with nobody to call
it or test it honestly.

**The cut is mechanical and declared, not a hand edit.** `tools/schgen/port-manifest.json`
gained a `cuts` field per file entry - an ordered list of `{ text, occurrences }`
deletions `tools/schgen/port.ts`'s `rewrite()` applies before the import
rewrite, each verified to occur exactly its declared number of times in the
pedals source before anything is removed. `ir/types.ts` carries 3 cuts (the
`CircuitSpec.mcu` field, `Circuit.mcu` field, and the `"pinmap"` arm of
`PinOrigin`); `ir/build.ts` carries 9 (the `@/pinmap/types` import, the
`PinmapInput` interface, the `pinmap` field, `checkMcuConfig` whole, the
`isMcu` parameter, the pin-map-assignment loop, the `checkMcuConfig` call
site, the `isMcu` argument at its call site, and the `mcu: mcuLabel` field of
`buildCircuit`'s return). This keeps the repository's invariant that a
ported file is never hand-edited intact for a cut as much as for a plain
import rewrite: the cut is data, in the manifest, reviewed and
re-derivable, not a diff silently smuggled into the file on disk.

**The same mechanism carried the corresponding test cuts for
`ir/build.test.ts`, `ir/classify.test.ts` and `ir/validate.test.ts`
(9, 2 and 2 respectively, including the now-dead `big`/`PINMAP` fixtures and
the three tests that exercised pin-map behaviour specifically) in Task 2's
first round.** Controller ruling R4 then moved all three files, cuts
included, to Task 4, because they also needed a real `createResolver` to run
and porting them anyway would have put three module-load errors on `HEAD`.
**Task 4 re-added all three entries with those same cuts and landed them
passing** (commit "Land the four R4-deferred test files passing"), so every
cut this entry describes is live in `tools/schgen/port-manifest.json` today
and `applyCuts` re-verifies each occurrence count on every port run.

- **Found** 2026-10-19, Task 2, confirmed directly: `grep -n "pinmap\|mcu\b"`
  over every file `tools/schgen/ir/` ports (`types.ts`, `build.ts`,
  `validate.ts`, `validate-nets.ts`, `validate-parts.ts`, `validate-rule.ts`,
  `classify.ts`, `order.ts`, `author.ts`) against the pedals source, read
  directly - only `types.ts` and `build.ts` matched, which is why only those
  two carry a `cuts` entry.
- **Evidence** `bun run typecheck` clean after the cut (no leftover
  reference to `PinmapInput`, `checkMcuConfig`, `CircuitSpec.mcu` or
  `Circuit.mcu` anywhere); `tests/schgen/port-fidelity.test.ts`'s bidirectional
  check passing with the `cuts` entries in place - re-deriving each ported
  file from the pedals source plus the manifest's declared cuts reproduces
  it byte-for-byte.

  **Step 6's guard perturbation - a separate measurement, about a
  validation rule rather than this cut - is committed, not cited from
  somewhere gitignored.** Round 1 pointed at a "Task 2 report," which lives
  under `.superpowers/` - gitignored, destroyed by `git clean -fdx`, and not
  something a later reader can re-derive (review round 2, Important finding
  2). `tests/schgen/ir/single-pin-net-guard.test.ts` is the fix: a
  hand-written, committed, re-runnable test (listed in `handWritten`, not
  ported) asserting `validateCircuit` names a hand-built circuit's two
  single-pin nets. `bun test tests/schgen/ir/single-pin-net-guard.test.ts`
  passes against the real `singlePinNets`
  (`lib/schgen/ir/validate-nets.ts`); perturbing it to `return [];` and
  re-running fails that same named test with:
  ```
  Expected to contain: "net LONELY has only one pin (R_A.1); connect it or declare the pin not connected"
  Received: [
    "block B: net GND is in no bus group", "block B: net LONELY is in no bus group"
  ]
  ```
  restoring the file returns it to green (checked against
  `tests/schgen/port-fidelity.test.ts`, which re-verifies the restore is
  byte-identical to the mechanical port, not just visually similar).
- **Verified** CONFIRMED - this writer ran `grep`, `bun run typecheck` and
  the fidelity test directly.
- **Why it is open** it is not a defect; it is a standing, deliberate
  absence recorded so a later task does not read "no MCU support" as an
  oversight and try to reinvent a pin-map branch in `lib/schgen/ir/` from
  scratch, guessing at a shape the pedals source already has, correctly,
  sitting in `digital-pedal-platform`'s `tools/schgen/ir/build.ts` and
  `types.ts`.
- **What would settle it** **CRITERION:** a circuit with an MCU pin map
  needs the branch restored from the port source (re-run `tools/schgen/port.ts`
  against a manifest entry with the `cuts` removed, or a fresh one added
  back deliberately), not reinvented from memory of what a pin-map branch
  usually looks like. **MECHANISM:** none proposed here, because this
  repository has no MCU and no pin map to restore it for - the criterion is
  for whichever future task is the first to need one.

### G116 - measured: `um()`'s refusal is the only thing standing between a fractional micrometre and a silently-wrong schematic, and the ported test catches its removal

Task 3's brief Step 5 asks for `um()` to be perturbed from refusing a
non-integer-micrometre millimetre value to rounding it instead, to confirm
a test actually depends on the refusal rather than merely exercising the
happy path. This is a measurement, not a defect: it found the test does
exactly what it claims.

**What was done.** `lib/schgen/render/geometry.ts`'s `um()` was changed from

```ts
export function um(mm: number): Um {
  const v = Math.round(mm * 1000);
  if (Math.abs(v - mm * 1000) > 1e-6) {
    throw new Error(`${mm} mm is not a whole number of micrometres`);
  }
  return v;
}
```

to a version that only rounds (the `if` block removed), then
`SCHGEN_SOURCE=... bun test tests/schgen/render/` was run, then the file was
restored verbatim (confirmed by `shasum -a 256` matching before and after:
`f9cd69325e994ded75634db16a99beba18084e4936c824dec2bcb4ef30989782`), then
the suite was re-run to confirm green again.

**The ported test that catches it lives in `tests/schgen/render/sexpr-write.test.ts`**,
not `geometry.test.ts` - `um` is defined in `geometry.ts` but the pedals
source tests it from `sexprWrite.test.ts` (which imports `um` from
`@/schgen/render/geometry`), and `geometry.test.ts` itself never calls `um`
(and at the time of the measurement it was not in the tree at all - Task 3
deferred it to Task 4 under Controller ruling R4, which ported it - so it
could not have caught this regardless). A reader following the brief's "the geometry test goes
red" literally, expecting `tests/schgen/render/geometry.test.ts` to be the
one that fails, would be looking in the wrong file.

- **Found** 2026-10-19, Task 3, Step 5 as directed by the brief.
- **Evidence** the red run, read directly and in full:

  ```
  tests/schgen/render/sexpr-write.test.ts:
  20 |   it("refuses sub-micrometre values instead of rounding them", () => {
  21 |     expect(() => um(1.0005)).toThrow(/1.0005 mm is not a whole number of micrometres/);
                                    ^
  error: expect(received).toThrow(expected)

  Expected pattern: /1.0005 mm is not a whole number of micrometres/

  Received function did not throw
  Received value: 1001

        at <anonymous> (/Users/orion/work/audio-circuits-work/pultec-modularize/tests/schgen/render/sexpr-write.test.ts:21:30)
  (fail) micrometre formatting > refuses sub-micrometre values instead of rounding them [0.91ms]

   18 pass
   1 fail
   33 expect() calls
  Ran 19 tests across 3 files. [14.00ms]
  ```

  and the restore, confirmed by `shasum -a 256 lib/schgen/render/geometry.ts`
  giving `f9cd69325e994ded75634db16a99beba18084e4936c824dec2bcb4ef30989782`
  both before the perturbation and after the restore.
- **Verified** CONFIRMED - this writer ran the perturbation, the test, the
  restore, and the shasum comparison directly.
- **Why it is open** it is not a defect; it is a measurement that found the
  guard sound, recorded per `CLAUDE.md`'s rule that a measurement -
  including one that finds nothing wrong - belongs in this file, not only
  in a session report.
- **What would settle it** nothing further - this entry records the
  measurement itself and is not waiting on a fix.

### G117 - measured: the Task 4 brief's `extends` examples are wrong for KiCad 10.0.5, and the vendored set is eight symbols in a shape `createResolver` cannot consume - flattening is still required, for different symbols

The M1 plan's Task 4 brief argues that `extends` flattening is non-optional
because *"KiCad's `R_Small`, `C_Small`, `Conn_01x05` and most of `Device` are
`(extends …)` symbols whose pins live in the parent."* **Every example in
that sentence is wrong for the KiCad version this repository vendors
from, and so is the prevalence claim.** In
`/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols` (KiCad
10.0.5, the version `lib/kicad/symbols/PROVENANCE.md` names),
`Device.kicad_sym` holds **536** top-level symbols of which exactly **5**
carry `(extends …)`: `Filter_EMI_C`, `Filter_EMI_CommonMode`,
`Microphone_Ultrasound`, `Q_Photo_NPN_CE` and `Speaker_Ultrasound`.
`R_Small` and `C_Small` are present and are **not** among them;
`Conn_01x05` is present in `Connector_Generic.kicad_sym` and is not an
`extends` symbol either.

**The brief's conclusion survives its examples.** Flattening is still
required - an unflattened `extends` symbol does silently drop every pin,
and the repository's own vendoring tool already flattens the one vendored
symbol that needs it (`PROVENANCE.md`: *"`Transistor_BJT:2N3904` is defined
in its library as `(extends "Q_NPN_EBC")` … the vendored copy is FLATTENED
… The other seven are verbatim"*). What changes is **which symbol a test
can prove it on**: the brief's `Device:R_Small` assertions cannot pass,
because `R_Small` is neither vendored nor an `extends` symbol, so a literal
implementation would either fail or be quietly rewritten to assert
something else.

**Two further shape facts the brief does not reflect.** (1) The vendored set
is **eight** `.sexpr` files, not six - `PROVENANCE.md`'s own "the other
seven" plus `2N3904` agrees, so the brief's number was stale when written.
(2) Each vendored file is **one `(symbol …)` definition in raw library
text** under `lib/kicad/symbols/<nickname>/<Name>.sexpr`, whereas
`createResolver(libs: ReadonlyMap<string, string>)` takes
nickname-to-`.kicad_sym`-**library**-file, each holding many symbols. The
two sources therefore do not have one shape, and the brief's Step 4
instruction to *"build that map from the vendored directory first and the
stock directory second"* cannot be followed literally.

- **Found** 2026-10-19 by the SDD controller while composing Task 4's
  dispatch, checking the brief's symbol names against the libraries before
  an implementer could write one from memory - `CLAUDE.md`: *"A KiCad
  footprint name is checkable - the libraries are on disk. Do not write one
  from memory; this repository has twice shipped a footprint that does not
  exist."* The same rule applies to symbol names, and this is the first
  time it was applied to a plan's own text rather than to code.
- **Evidence** against the on-disk libraries, each a check that could have
  returned a different number: `grep -c '^\t(symbol "' Device.kicad_sym`
  gives 536; `grep -c extends Device.kicad_sym` gives 5, and
  `grep -n -B 8 extends` names all five; `grep -c '^\t(symbol "R_Small"'`
  and the same for `C_Small` each give 1, so both exist and neither is in
  the extends set; `grep -c '^\t(symbol "Conn_01x05"'
  Connector_Generic.kicad_sym` gives 1. `find lib/kicad/symbols -name
  "*.sexpr" | wc -l` gives 8; `head` of `lib/kicad/symbols/Device/R.sexpr`
  shows a bare `(symbol "R" …)` rather than a `(kicad_symbol_lib …)`
  wrapper.
- **Verified** CONFIRMED - this writer ran every command above and read the
  output directly.
- **Why it is open** **it is no longer open as a defect; it stays as a
  measurement.** Both halves are settled: the code half by Controller
  rulings R8 and R9 and Task 4's implementation of both (see below), the
  document half by commit `3dc2695`, which corrected all four wrong claims
  in the plan in place - the `extends` examples, the vendored count, the
  test subject and the perturbation's predicted red - each marked rather
  than silently rewritten. The Task 4 implementer declined to make that
  edit and was right to: editing the brief it was given would have made it
  the author of its own acceptance criteria, which is the invariant
  `CLAUDE.md` puts above everything else here. The correction is therefore
  the controller's, and it is.

  **Controller ruling R10: this entry is NOT deleted, although the register's
  rule is that a resolved entry is deleted rather than marked closed.** Two
  reasons, and the first is the one the rule itself asks for - *check what
  the deletion takes with it*. (1) **Four committed sites cite G117 as the
  home of this measurement**, two of them source comments:
  `tests/schgen/render/extends-flattening.test.ts`,
  `lib/schgen/render/stock-symbols.ts`, and **G119** and **G121** in this
  file. Deleting it would leave four dangling references to a measurement
  nothing else in the register records. (2) It is a **measurement**, not a
  defect report, which is what its own title says and what G116, G118 and
  G120 are too - and this register's settled shape for a measurement is an
  entry that records the number and is not waiting on anything, closing
  with *"nothing further"* rather than being deleted. A deletion rule meant
  for fixed defects should not quietly discard measurements.
- **What Task 4 did, which closes the code half.**
  `tests/schgen/render/extends-flattening.test.ts` proves R9's criterion on
  `Fix:OPAMP2X`: the flattened symbol carries its parent's eight pins (1-8,
  `unitCount` 3) and is asserted EQUAL to `Fix:OPAMP2`'s pin list, not merely
  the same length; the same symbol read unflattened yields `[]`. Both numbers
  were read off `tests/schgen/__fixtures__/symbols/Fix.kicad_sym`, which Task
  4 copied into this repository, so neither depends on an installed KiCad.
  `lib/schgen/render/stock-symbols.ts` records R8's shape reconciliation and
  the deviation from the brief's mechanism (see **G119**).
- **What would settle it** **nothing further.** The criterion this entry
  carried - *the plan document no longer asserts that `R_Small`, `C_Small`
  or `Conn_01x05` is an `(extends …)` symbol, nor that the vendored set has
  six members* - is met as of `3dc2695`, checkable by
  `grep -n "R_Small\|six symbols" docs/superpowers/plans/2026-10-19-schematic-authoring-m1.md`,
  which now returns only the marked corrections and the quoted original.
  What remains here is the measurement itself, kept for the four sites that
  cite it and for the next reader who needs to know how many of KiCad
  10.0.5's `Device` symbols actually extend.

### G118 - measured: all ten lib ids the four parity circuits declare resolve, but three of them resolve ONLY through the installed KiCad, and the plan's own starting-point counts do not match what the circuits build

Task 4's brief Step 5 asks how many of the four parity circuits' declared
symbols resolve and how many do not, by lib id, and warns that *"the vendored
set is smaller than those circuits need and the shortfall is a finding, not a
licence to guess a name."* **The shortfall is real but it is not a resolution
failure.** Measured by building each circuit and reading
`component.part?.symbol` off every component - the derived arm, not a grep, so
a symbol reaching a part through a shared constructor is counted:

| circuit | components declaring a symbol |
| --- | --- |
| `opamp-buffer` | 1 of 9 |
| `optical-compressor` | 0 of 37 |
| `pt2399-core` | 2 of 24 |
| `transistor-preamp` (lab board) | 32 of 32 |

**Ten distinct lib ids, and all ten resolve** through
`createResolver(symbolLibraries(nicknames))` - pin and unit counts as read:

| lib id | circuit | pins | units | vendored? |
| --- | --- | --- | --- | --- |
| `Amplifier_Operational:TL072` | opamp-buffer | 8 | 3 | **no** |
| `Audio:PT2399` | pt2399-core | 16 | 1 | **no** |
| `Connector:TestPoint` | transistor-preamp | 1 | 1 | yes |
| `Connector_Generic:Conn_01x02` | transistor-preamp | 2 | 1 | yes |
| `Connector_Generic:Conn_01x05` | pt2399-core | 5 | 1 | **no** |
| `Device:C_Polarized` | transistor-preamp | 2 | 1 | yes |
| `Device:R` | transistor-preamp | 2 | 1 | yes |
| `Device:R_Potentiometer_Trim` | transistor-preamp | 3 | 1 | yes |
| `Jumper:Jumper_2_Open` | transistor-preamp | 2 | 1 | yes |
| `Transistor_BJT:2N3904` | transistor-preamp | 3 | 1 | yes |

**Do not resolve: none. Resolve only through the machine's KiCad: three** -
`Amplifier_Operational:TL072`, `Audio:PT2399` and
`Connector_Generic:Conn_01x05`. That is the shortfall the brief predicted,
wearing a different shape: the stock symbol directory is a declared extension
(**G119**), so these resolve, but a drawing that uses them is a function of
whichever KiCad is installed rather than of anything in this repository. The
eight vendored symbols are pinned by the equality check in
`lib/schgen/render/stock-symbols.ts`; these three are not pinned by anything.
**`Device:R_Potentiometer` is vendored and declared by none of the four**, so
the vendored set is not a subset of what they need either.

**A SEPARATE AND SMALLER FINDING: the plan's own figures disagree with what
the circuits build.** `docs/superpowers/plans/2026-10-19-schematic-authoring-m1.md`
line 831 states the *"measured starting point"* as *"`optical-compressor`
declares a symbol on none of its 30 components; `pt2399-core` on 2 of 24;
`opamp-buffer` on 1 of 8; `transistor-preamp` on 8 of 43"*. Three of the four
pairs differ from the table above (37 not 30; 9 not 8; 32 of 32 not 8 of 43).
`pt2399-core` matches exactly. This writer did not diagnose the difference and
records it undiagnosed: the most likely reading is that the plan counted a
different entry point for `transistor-preamp` (it has five boards;
`transistorPreampLab()` is the one `circuits/transistor-preamp/index.ts`
re-exports) and an earlier revision of the other two, but that is a guess.
**Task 10's census is the task that will quote these numbers**, which is why
the disagreement is recorded rather than left for it to rediscover - and why
the thing that produced them is committed as `tools/schgen/symbol-census.ts`
rather than described. **Re-measuring is `bun tools/schgen/symbol-census.ts`**,
whose output names the entry point it read for each circuit, which is the one
piece of information needed to test the entry-point hypothesis.

- **Found** 2026-10-19, Task 4, Step 5 as directed by the brief.
- **Evidence** **`bun tools/schgen/symbol-census.ts`**, which is the thing
  that produced every figure above and is COMMITTED so a successor re-runs it
  rather than rebuilding it from this recipe (Task 4 review, round 1). It
  builds each of the four circuits, counts `components` and
  `component.part?.symbol` - the derived arm, so a symbol reaching a part
  through a shared constructor is counted - then resolves every distinct lib
  id through `createResolver(symbolLibraries(nicknames))` and prints per id
  either the pin and unit count or the refusal verbatim. It probes each
  nickname separately, because `symbolLibraries` refuses a whole batch
  containing one unresolvable nickname and the census's job is to report WHICH
  ids fail. The vendored/not-vendored split is `VENDORED_SYMBOLS`
  (`lib/kicad/symbol-library.ts`) differenced against the ten, both directions
  printed. **A check that could have failed and did not:** a lib id that
  refused would have printed its message.
  `tests/schgen/symbol-census.test.ts` exercises the tool so it cannot rot,
  and asserts this entry's criterion (every declared id resolves) **without
  pinning any of the counts**, which are a measurement rather than an
  invariant. Driven: with `KICAD_SYMBOL_DIR` pointed at a directory holding
  only `Device.kicad_sym`, that test fails listing seven lib ids and their
  refusals. The plan's figures were read directly from line 831.
- **Verified** CONFIRMED - this writer wrote and ran the script and read its
  full output, and read the plan line.
- **Why it is open** it is a measurement, not a defect in Task 4's work, and
  the part of it that would make someone want to act - three unpinned lib ids
  - is a decision about what to vendor, not a fix. `CLAUDE.md` requires a
  measurement here whether or not it found something wrong.
- **What would settle it** **CRITERION, as the brief set it:** every symbol a
  parity circuit names resolves through one reader. **That criterion is MET
  today** - one reader (`lib/schgen/render/library.ts`), ten of ten resolving.
  The residue is a second criterion this measurement produced: **no drawing of
  a parity circuit depends on which KiCad is installed**, which is NOT met for
  the three lib ids above. **MECHANISM** for the residue, and it is advice
  from someone who has not tried it: add those three to `VENDORED_SYMBOLS` and
  run `tools/kicad/vendor-symbols.ts`, after which the equality check in
  `stock-symbols.ts` pins them. Unverified risk: `Amplifier_Operational:TL072`
  is a multi-unit symbol and `lib/kicad/symbol-library.ts`'s `symbolPins`
  REFUSES a unit number above 1 (its own comment says the stub writer would
  silently merge units), so vendoring it may surface that refusal in a
  different consumer. Whether the three should be vendored at all is an owner
  decision about machine independence versus vendoring every symbol a design
  ever names.

### G119 - the vendored-versus-stock symbol decision is implemented at SYMBOL granularity, not at the nickname-SHA granularity the plan specifies, because the two sources have different shapes

The M1 plan's Task 4 decision reads: *"both, with the vendored set
authoritative and the stock directory a declared extension. `createResolver`
takes nickname→file as it already does; `lib/schgen/render/stock-symbols.ts`
builds that map from the vendored directory first and the stock directory
second, and refuses when a nickname resolves in both to files with different
SHA-256 rather than preferring one silently."*

**The mechanism in that sentence cannot be implemented, and the reason is
`docs/known-gaps.md` G117's second shape fact.** `createResolver(libs)` takes
nickname-to-`.kicad_sym`-LIBRARY-file. The vendored set is eight single-symbol
`.sexpr` files at `lib/kicad/symbols/<Nickname>/<Name>.sexpr`, so the vendored
side has no library file to put in the map at all. Worse for the refusal
clause: the five nicknames the vendored set touches (`Device`,
`Transistor_BJT`, `Connector_Generic`, `Connector`, `Jumper`) are **every one
of them** also present in the stock directory, and a five-symbol set can never
hash equal to a 223-library directory's 536-symbol `Device.kicad_sym`. A
literal implementation refuses on every run, for every circuit.

**WHAT WAS IMPLEMENTED INSTEAD** (Controller ruling R8 left the mechanism to
the implementer and required the deviation be recorded; this is that record).
`symbolLibraries(nicknames)` resolves each nickname to the installed library
file, and for a nickname the vendored set touches it first requires **every
vendored symbol under that nickname to be byte-identical to the installed
library's own flattened text for the same name**, or it refuses - naming both
files, both SHA-256 hashes, and that nothing is preferred because preferring
either would be wrong in a different way. Both sides are flattened by
`lib/kicad/symbol-library.ts`'s `flattenedSymbol`, which is the function
`tools/kicad/vendor-symbols.ts` used to write the vendored copies, so the
comparison is exact rather than approximate.

**HOW THAT MEETS THE RULING'S CRITERION, AND WHERE IT DIFFERS FROM THE
WORDS.** The criterion was *no drawing depends on the machine when a symbol is
vendored*. It is met by the equality, not by which file is opened: either the
installed bytes ARE the vendored bytes - in which case the drawing is
identical on every machine - or this refuses and there is no drawing. What
differs from the plan's words is the sense of "authoritative": the vendored
copy is the reference the installed library is measured against, not the bytes
that get read. **A consequence worth stating plainly: a machine with no KiCad
cannot draw at all**, even a circuit using only vendored symbols. That follows
from `CLAUDE.md`'s *"KiCad and VeroRoute are primary tools here, not optional
extras"*, but it is a narrowing of what `lib/kicad/symbol-library.ts`'s
`vendoredSymbolText` path can do today, and it is new.

**THE ALTERNATIVE THAT WAS CONSIDERED AND REJECTED**, recorded so it is not
re-proposed as if unexamined: have `tools/kicad/vendor-symbols.ts` also emit a
per-nickname `.kicad_sym` wrapper library and point the map at that. It reads
vendored bytes directly, which is the plan's words exactly - but a nickname
then resolves to a library holding ONLY the vendored symbols, so `Device:C`
and every other stock `Device` symbol stops resolving. Merging the vendored
symbols over the stock library's would restore them, at the cost of generating
a library file at resolve time from a module `lib/schgen/README.md` declares
pure.

**TWO FACTS ABOUT THAT ALTERNATIVE THAT THE FIRST VERSION OF THIS ENTRY LEFT
OUT, and without them the open question below is not decidable from the entry.**
Both were established in the Task 4 review, round 1.

**(a) "Read the vendored bytes for `Device:R` and the installed library for
`Device:C`" cannot be expressed at all.** `createResolver`'s map is keyed by
NICKNAME, not by lib id, so one nickname gets exactly one file and every symbol
under it comes from that file. There is no per-symbol assignment to choose
between. **Generating a merged library is therefore not a stylistic preference
for one mechanism over another - it is the only form the "vendored bytes are
what is read" answer can take.** That makes the purity objection the WHOLE
objection to it, and the purity objection is relocatable: a merged library
could be written by `tools/kicad/vendor-symbols.ts`, which already writes
`lib/kicad/symbols/` and is the only thing that should, leaving
`lib/schgen/render/stock-symbols.ts` reading committed files and still pure.
What that costs instead is that the merge is then fixed at vendoring time
against one KiCad, so the committed artifact carries that machine's other
symbols too.

**(b) Under the generated-library design the drift refusal LEAVES THE DRAW
PATH, and that is an advantage of the shipped mechanism, not an incidental
difference.** If the vendored bytes are what gets read, nothing compares them
to anything while drawing - there is no second reading to disagree with - so
the check can only live in a test. A drawing made on a machine with a
differently-versioned KiCad would then take its vendored symbols from the
committed copies and every OTHER symbol under the same nickname from that
machine's library, and **would not refuse when it was drawn**: a mixed-vintage
schematic, half pinned and half not, produced silently. The shipped mechanism
refuses in that situation, because the comparison is on the path that draws.
So the two answers differ in what they buy, not only in purity: bytes-are-read
buys drawing without KiCad and loses the refusal at draw time; check-on-read
buys the refusal at draw time and makes KiCad a hard dependency.

**WHAT NOTHING BINDS, AND IT IS THE ONE WAY THE CRITERION CAN BE SILENTLY
LOST.** The vendored-agreement refusal lives in `symbolLibraries`, **not in
`createResolver`**. Nothing requires a caller to use `symbolLibraries` at all:
a later task that builds its own nickname-to-path map - one
`path.join(stockSymbolDir(), \`${nick}.kicad_sym\`)` is enough, and the pedals
source does exactly that in several of its own `*.kicad.test.ts` files - gets a
working resolver with **no vendored check and no complaint**. R8's criterion
then holds for nothing that resolver draws, and nothing says so. Task 10 is the
first task likely to build such a map.

- **Found** 2026-10-19, Task 4, Step 4, while writing `stock-symbols.ts`
  against the brief.
- **Evidence** `createResolver`'s signature and its `fs.readFileSync(file)` of
  one library per nickname, read directly in
  `lib/schgen/render/library.ts`; `find lib/kicad/symbols -name "*.sexpr"`
  gives 8 files under 5 nickname directories, each a bare `(symbol …)`;
  `fs.readdirSync(stockSymbolDir()).filter(endsWith(".kicad_sym")).length`
  gives **223**, and all five vendored nicknames are among them (asserted in
  `tests/schgen/render/stock-symbols.test.ts`, which would fail if one were
  not). The equality holds today for all eight: a script comparing each
  vendored `.sexpr` against `flattenedSymbol(installed, name)` printed
  IDENTICAL eight times, and the first test in
  `tests/schgen/render/stock-symbols.test.ts` is that comparison, so it fails
  if either side drifts. The three refusals are driven by tests that inject a
  stock directory through `KICAD_SYMBOL_DIR`: a doctored `Device:R` (both
  hashes in the message), a `Jumper.kicad_sym` without `Jumper_2_Open`, and an
  empty directory.
- **Verified** CONFIRMED - this writer wrote the module and the tests, ran
  them, and read the refusal messages.
- **Why it is open** it is a recorded deviation from a plan's stated
  mechanism, not a defect, and the plan still says the other thing. It also
  carries an unresolved question (below) that is not this task's to settle.
- **What would settle it** **CRITERION:** nothing further for the deviation
  itself; this entry IS the record the ruling asked for. **Two things it
  leaves, and they settle differently.**

  **THE OPEN QUESTION**, for whoever owns the decision: should a vendored
  symbol's BYTES be what a drawing reads, so that a machine without KiCad can
  still draw a wholly-vendored circuit? **The trade is now stated in full
  above**, and it is not purity against convenience. Answering **yes** means a
  merged generated library - which is the only expressible form of it, by (a) -
  written by `tools/kicad/vendor-symbols.ts` so that nothing in `lib/schgen/`
  writes files; it buys drawing without KiCad, fixes the merge against one
  KiCad at vendoring time, and **moves the drift refusal off the draw path**,
  so a differently-versioned machine produces a mixed-vintage schematic
  silently (b). Answering **no** is what is implemented: KiCad becomes a hard
  dependency of drawing, and a disagreement refuses at the moment it would
  matter. **Nobody should ask the owner this unprompted** - it is recorded here
  so the next task that trips over it finds the reasoning rather than redoing
  it.

  **THE UNBOUND SEAM**, which is a measurable criterion rather than a decision:
  **every `SymbolResolver` that draws a circuit in this repository is built
  over a map `symbolLibraries` produced**, so the vendored-agreement refusal
  cannot be bypassed by a caller that assembles its own. **MECHANISM**,
  untried, and advice from someone who has not written it: a test asserting
  that `createResolver` is called in no file outside
  `lib/schgen/render/library.ts` and `tests/schgen/`, or a guard in
  `symbolLibraries` that stamps the map it returns and a `createResolver`
  wrapper that requires the stamp. The second changes a ported file's
  signature, so it is not free. **This round deliberately did not add either**:
  the controller scoped it to being recorded, so that Task 10 reads it before
  it builds a map.

### G120 - measured: removing the `extends` recursion does NOT fail on an empty pin list, as the brief predicts - a guard two modules away fires first, and the silence the test guards is real only for a different shape of symbol

Task 4's brief Step 6 says to remove the `extends` recursion and that *"the
flattening test goes red naming `R_Small` with an empty pin list."* It goes
red, and it names the symbol, but **not with an empty pin list**: it throws
`Fix:OPAMP2X: unit 1 has no geometry` from `boxesOf` in
`lib/schgen/render/lib-pins.ts`, reached through `unitBoxes` inside
`createResolver`'s `resolve`, before any assertion about pins runs.

**Why, and why it matters.** `Fix:OPAMP2X` declares three properties and no
sub-symbol of its own. Unflattened it therefore has neither pins NOR graphics,
and `boxesOf` refuses a unit with no geometry at all. So for THIS symbol the
pin loss is not silent - it is caught loudly, two modules away from the thing
being tested, by a guard that exists for another purpose.

**The brief's "silent" claim is still true, for a shape this fixture does not
have:** a child that declares its own graphics sub-symbol and inherits only
its parent's pins would have geometry, would pass `boxesOf`, and would resolve
to a symbol with no connectable pins and no complaint. **That is why the
second assertion of the pair is written against `extractPins` on the raw
unflattened node rather than against the resolver** - it demonstrates the pin
loss directly and does not depend on which guard happens to fire first. That
assertion PASSED throughout the perturbation, correctly: it reads the fixture
file, not the resolver.

- **Found** 2026-10-19, Task 4, Step 6 as directed by the brief.
- **Evidence** the red run, read directly and in full:

  ```
  tests/schgen/render/extends-flattening.test.ts:
  259 |   for (const u of units) {
  260 |     const pts: RawPoint[] = [];
  261 |     for (const s of subs) if (s.unit === u || s.unit === 0) pts.push(...graphicPoints(s.node, libId));
  262 |     for (const p of pins) if (p.unit === u || p.unit === 0) pts.push(...pinPoints(p));
  263 |     const first = pts[0];
  264 |     if (first === undefined) throw new Error(`${libId}: unit ${u} has no geometry`);
                                                                                          ^
  error: Fix:OPAMP2X: unit 1 has no geometry
        at boxesOf (/Users/orion/work/audio-circuits-work/pultec-modularize/lib/schgen/render/lib-pins.ts:264:83)
        at resolve (/Users/orion/work/audio-circuits-work/pultec-modularize/lib/schgen/render/library.ts:158:16)
        at <anonymous> (/Users/orion/work/audio-circuits-work/pultec-modularize/tests/schgen/render/extends-flattening.test.ts:59:26)
  (fail) an extends symbol resolves with its parent's pins [1.87ms]

   1 pass
   1 fail
   2 expect() calls
  Ran 2 tests across 1 file. [18.00ms]
  ```

  The perturbation replaced `flattenNamed`'s
  `if (parentName === null) return child;` with an unconditional
  `return child;`, and refused to apply unless that line appeared exactly
  once. **RESTORED** by re-running `tools/schgen/port.ts`:
  `shasum -a 256 lib/schgen/render/library.ts` gives
  `aef7a7d947a85c49bd7731fc063c14207d88a02340437927cf0e603004f5422f` both
  before the perturbation and after the restore, `git diff --stat` on that
  file is empty, and the test file is 2 pass / 0 fail again.
- **Verified** CONFIRMED - this writer ran the perturbation, the test, the
  restore and the shasum comparison directly.
- **Why it is open** it is a measurement that corrects a prediction in a plan
  document, and the prediction is still in the document. A later reader
  following Step 6 literally and expecting an empty-pin-list assertion
  failure would conclude the test was wrong.
- **What would settle it** nothing further for the measurement - this entry
  records it, and the test it describes is in the tree. The brief's sentence is
  the plan's to correct (see **G117**).

  **ONE THING NO TEST SHOWS, AND THIS ENTRY IS THE WHOLE OF THE RECORD.** The
  shape the silence is real for - a child that declares its OWN graphics
  sub-symbol and inherits only its parent's pins - exists in no fixture, so
  nothing in the tree demonstrates it. It is NOT available to demonstrate
  either: the fixture libraries are byte-pinned against the pedals source by
  `tests/schgen/port-fidelity.test.ts`'s copied-fixture check, so adding such a
  symbol to `Fix.kicad_sym` would fail that check, and a third hand-written
  fixture library would be a second source of truth for what a fixture symbol
  is. **So "recorded, not demonstrated" is the deliberate answer, not an
  omission** - which is why this clause says so rather than leaving the
  demonstration looking available to the next reader. The criterion, if anyone
  ever does want it: an `(extends …)` symbol with its own `(symbol
  "<child>_1_1" (rectangle …))` and no pins of its own resolves, unflattened,
  to a symbol with geometry and zero pins and no refusal. **MECHANISM**,
  untried: a `tempLib(...)`-style one-symbol library written inside a test,
  the way the ported `render/library.test.ts` already builds its own
  throwaway libraries, which needs no fixture-file edit at all.

### G121 - `@/kicad/netlist` now resolves in the port manifest, for `KICAD_CLI` only, which removes the port-time refusal that was protecting Task 11

`lib/schgen/render/library.ts`'s `stockSymbolDir()` derives
`dirname(KICAD_CLI)/../SharedSupport/symbols`, and imports `KICAD_CLI` from
`@/kicad/netlist`. Until Task 4 the manifest resolved no such specifier, and
`tools/schgen/port.ts`'s module doc said so in terms: *"no `@/kicad/netlist`
… this repository's `lib/kicad/netlist.ts` has a different shape from pedals'
— adapting it is Task 11's job, not this one's."*

**Task 4 resolved it**, because the alternative was a `cuts` entry deleting
the import and the macOS candidate, which would have left `stockSymbolDir()`
unable to find KiCad on the owner's own machine unless `KICAD_SYMBOL_DIR` were
set - a functional loss in an interface the brief states, taken to avoid a
one-line addition. `lib/kicad/netlist.ts` gained `KICAD_CLI` (a path, never a
spawn) and `externals` maps `@/kicad/netlist` to it, so the specifier points
at the module it names rather than at a stand-in.

**THE COST, which is the reason this is recorded.** `resolveSpecifier` checks
`externals` first, so a later ported file importing `connectivityFromXml` from
`@/kicad/netlist` no longer gets `port.ts`'s refusal naming the file and the
unresolved import. It gets a `bun run typecheck` error naming the missing
export instead. That is still loud and still fails `bun run check`, but it is
a different and later failure than the one the manifest's scope paragraph was
relying on, and **Task 11 is the task that will hit it.**

**A SECOND, SMALLER THING THIS CREATES.** The default kicad-cli path
`/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli` is now written in
**four** places: `make/board.mk` (the `?=` default, which Make cannot import
from TypeScript), `tests/circuits/kicad-round-trip.ts`,
`tools/pultec/schematic-sync.ts` and now `lib/kicad/netlist.ts`. Each of the
first two documents that it duplicates the Make line and must be changed by
hand with it. Four copies of one path is a smell, not a design.

- **Found** 2026-10-19, Task 4, Step 1, when the ported `library.ts` would not
  resolve its own imports.
- **Evidence** `import { KICAD_CLI } from "@/kicad/netlist";` is line 3 of
  `digital-pedal-platform`'s `tools/schgen/render/library.ts`, and
  `grep -n "KICAD_CLI" tools/kicad/netlist.ts` there gives its definition at
  line 7 and two `execFileSync` uses; `stockSymbolDir()` is its only consumer
  in the ported file. `grep -rn "KICAD_CLI" lib tools tests` here, read
  directly, gives the four sites above (and `make/board.mk` lines 44-45 for
  the fifth, the Make default that exports it). A check that could have
  failed: `grep -c "connectivityFromXml" lib/kicad/netlist.ts` returns 0, so
  the shape difference this entry describes is real and not assumed.
- **Verified** CONFIRMED - this writer read every file named and ran the greps.
- **Why it is open** the layering it creates is not a defect in Task 4's work
  and consolidating four copies of a binary path touches three unrelated
  production files; the brief's scope is the symbol loader.
- **What would settle it** **CRITERION, two separable clauses.** (a) A ported
  file that imports something `lib/kicad/netlist.ts` does not export fails
  with a message that names the file, the specifier and the missing export -
  not merely a `tsc` error at a line in a generated file. (b) The kicad-cli
  default path is written once in TypeScript. **MECHANISM** for (a), untried:
  have `tools/schgen/port.ts` check that each `externals` target actually
  exports every name the importing file destructures from that specifier,
  which would restore a port-time refusal. For (b): a single
  `lib/kicad/kicad-cli.ts` that the other two TypeScript sites import, leaving
  `make/board.mk`'s `?=` as the one unavoidable duplicate. **Neither is
  Task 11's job unless Task 11 chooses it** - (a) would be most useful BEFORE
  Task 11 ports gate 3.

### G122 - a ported test that makes temp directories cannot satisfy this repository's static temp-scratch guard, and the exemption that lets it through is per-file

`tests/stripboard/temp-scratch.test.ts`'s static arm requires every
`mkdtempSync` site under `tests/` to be either registered with
`freshTempScratch` or removed by a `rmSync(<the same identifier>)` the regex
can see. The ported `tests/schgen/render/library.test.ts` does neither
*textually*: it pushes `dir` onto its own `tempDirs` array and drains that
array in an `afterEach`. It removes every directory it makes - the guard's
regex just cannot see it.

**A ported file cannot be rewritten to pass**, because
`tests/schgen/port-fidelity.test.ts` asserts it is byte-identical to the
pedals source modulo imports and a header. So Task 4 added a declared
exemption, `REMOVES_VIA_OWN_LIST`, keyed by the file's path under `tests/`,
and gave it teeth: a second test asserts the site, the `push` and the
`splice(0)`-into-`rmSync` drain all still exist, and a declared path that is
not on disk fails. Driven: deleting the `push` from the ported file fails that
test and only that test.

**WHY A LATER READER NEEDS THIS.** The exemption is per-file and the pedals
test suite has more files of this shape waiting to be ported - every ported
test that writes a temp library will arrive the same way. The next one adds an
entry; it does not widen the regex, and it does not edit the ported file.
`grep -c "mkdtempSync" $SCHGEN_SOURCE/render/*.test.ts` and the equivalent over
the rest of that tree is how to find out how many are coming, which this
writer did not run.

- **Found** 2026-10-19, Task 4, Step 1, as a full-suite failure after porting
  `render/library.test.ts`.
- **Evidence** the failure, read directly:
  `[ "schgen/render/library.test.ts: \"dir\" is never removed" ]` against an
  expected `[]`, from
  `tests/stripboard/temp-scratch.test.ts`'s *"every mkdtemp site under tests/
  either removes its own directory or registers it"*. The ported file's
  `afterEach` draining `tempDirs` into `fs.rmSync` is at the bottom of
  `tests/schgen/render/library.test.ts`, read directly. The teeth were driven
  by deleting the `tempDirs.push(dir);` line, running the file (fails: *"dir"
  never reaches tempDirs*), and restoring by re-running
  `tools/schgen/port.ts` - `diff` against a pre-perturbation copy is empty.
- **Verified** CONFIRMED - this writer saw the original failure, wrote the
  exemption, drove it and restored the file.
- **Why it is open** it is not a defect; it is a structural consequence of
  porting test files into a repository with its own standing guards, and the
  per-file cost repeats for every such file to come.
- **What would settle it** **CRITERION:** a ported test that removes every
  temp directory it makes passes the static guard without a per-file entry,
  OR the per-file entries are cheap and self-checking enough that the cost is
  accepted deliberately. The second half is what holds today. **MECHANISM**,
  untried and offered as advice only: teach the site check to follow an
  identifier into an array that is drained into `rmSync` in the same file,
  which would cover this shape generically - at the price of a static
  analysis that is harder to read than the exemption it replaces.

### G123 - `render/symbolSelfText.test.ts` is import-clean and still cannot be PORTED: its fixture leaks a mkdtemp directory outright, and **G122**'s per-file exemption does not fit that shape. A hand-written equivalent now covers the module; what is open is the byte-check the port would have given

Task 5 ported `render/symbolSelfText.ts` and added its test to the manifest. The
test is import-clean - `node:fs`/`os`/`path`, `createResolver` from the ported
`render/library.ts`, and the module under test - and it builds its own symbol
library in a temp directory rather than needing a fixture circuit, so unlike
every other clearance test it does not wait on Task 7. It ran, and the FULL
suite then failed on `tests/stripboard/temp-scratch.test.ts`.

**It is a different and worse case than G122.** `render/library.test.ts` does
remove its directories, through a `tempDirs` array the static regex cannot
follow, which is why `REMOVES_VIA_OWN_LIST` could exempt it from ONE regex while
the `still removes` test kept the teeth. `symbolSelfText.test.ts` removes
nothing at all: `lib()` does `fs.mkdtempSync(path.join(os.tmpdir(),
"symtext-"))` and returns the file path, and it is called twice (once per
`describe`), so a run leaks two directories. There is no exemption shape that
fits without weakening the guard, and the guard exists because on 2026-10-13
`TMPDIR` held over 60,000 directories and the owner's disk filled.

**Adding cleanup is content a `cuts` entry cannot supply** - `cuts` are
deletion-only - so under Controller ruling R4 the entry was removed from the
manifest and the file deleted from the tree in the same change that added it,
rather than landing a known-red HEAD.

- **Found** 2026-10-19, Task 5, Step 1, as a full-suite failure after porting
  the test.
- **Evidence** `SCHGEN_SOURCE=... bun test` with the file in the tree: **2660
  pass / 1 fail across 261 files**, the failure being
  `tests/stripboard/temp-scratch.test.ts`'s *"every mkdtemp site under tests/
  either removes its own directory or registers it"* with
  `[ "schgen/render/symbol-self-text.test.ts: \"dir\" is never removed" ]`
  against an expected `[]`. Read directly, not relayed. After removing the
  manifest entry and the file: `bun test tests/schgen tests/stripboard/temp-scratch.test.ts`
  gives **155 pass / 0 fail across 20 files**.
  `grep -n "mkdtempSync" $SCHGEN_SOURCE/render/symbolSelfText.test.ts` shows the
  one site and `grep -c "rmSync" ` that file shows none.

  **For the round-2 discharge:**
  `bun test tests/schgen tests/stripboard/temp-scratch.test.ts` gives **172
  pass / 0 fail across 22 files** with the hand-written test in the tree, and
  the hand-written file alone gives **9 pass / 0 fail**. That `TMPDIR` is left
  as found was measured rather than assumed: counting `schgen-symtext-`
  entries under `TMPDIR` before the run gives 0, and after the run gives 0.
- **Verified** CONFIRMED - this writer ran every command above and read the
  full output, including the before-and-after `TMPDIR` count.
- **Why it is open** **the COST is discharged and the PORT is not.** What this
  entry was really about is that `symbolTextOverlaps` and
  `placedSymbolTextOverlaps` were ported and exercised by nothing, so three
  cells of the obstacle matrix
  (`pin-number`/`pin-number`, `pin-number`/`pin-name`,
  `pin-name`/`pin-name`, in `lib/schgen/render/obstacle-pairs-pin-text.ts`)
  named a function no test ran. **At round 2 a hand-written
  `tests/schgen/render/symbol-self-text.test.ts` closed that**, transcribing
  every fixture and expectation from the pedals test and taking its temp
  directory from `freshTempScratch` with `afterAll(cleanUpTempScratch)`: 9
  tests, `TMPDIR` left as found, the static guard green, no upstream edit, no
  guard change and no ported byte touched. What remains open is narrower and
  real: **that file is hand-written, so `tests/schgen/port-fidelity.test.ts`
  does not byte-check it**, and if the pedals source's expectations change
  nothing here notices. That is the residual, and it is the price of the
  mechanism taken.
- **ROUND 2 CORRECTION: THIS ENTRY'S CRITERION WROTE ITS OWN MECHANISM INTO
  ITSELF, AND THAT IS THE G52 SHAPE.** Round 1's criterion read *"exists in the
  tree, **is ported (not hand-written)**, runs to completion…"*. The "is
  ported" clause is not what anybody needs from this code; it made an upstream
  edit the only admissible route **by construction rather than by necessity**,
  and it is why round 1 concluded the fix had to leave this repository and
  therefore needed an owner decision. It did not. The criterion below is the
  split one.
- **What would settle it** **CRITERION:** `symbolTextOverlaps` and
  `placedSymbolTextOverlaps` are exercised by a test that runs to completion,
  and `TMPDIR` is left as it was found, with
  `tests/stripboard/temp-scratch.test.ts` green and no new exemption entry.
  **MET at round 2 by mechanism (b).** The remaining criterion, which keeps
  this entry open: the test that exercises them is byte-checked against the
  pedals source, so a drift in its expectations fails here rather than passing
  silently.

  **MECHANISM (a), untried, and it leaves this repository:** change
  `digital-pedal-platform`'s `tools/schgen/render/symbolSelfText.test.ts` to
  remove its directory (an `afterAll`, or the `tempDirs` shape
  `render/library.test.ts` already uses and G122 already exempts) and re-run
  `tools/schgen/port.ts`, then re-add
  `{ "from": "render/symbolSelfText.test.ts", "to": "tests/schgen/render/symbol-self-text.test.ts" }`
  with no `cuts` - **deleting the hand-written file in the same change**, since
  two files cannot hold that path. `lib/schgen/README.md` sanctions the route -
  *"the pedals source changes … and `port.ts` runs again"* - but it is an edit
  to another repository and **nobody has asked the owner whether that is
  wanted**, so it stays a decision. It is the only mechanism that meets the
  remaining half of the criterion.

  **MECHANISM (b), TAKEN at round 2: a hand-written equivalent test.**
  `tests/schgen/port-fidelity.test.ts` blesses the shape - a hand-written test
  under `tests/schgen/` is discovered by `bun test`'s glob and needs no
  `handWritten` declaration - and `tests/schgen/render/obstacle-matrix.test.ts`
  and `stock-symbols.test.ts` are both already that shape. Its file header
  names the pedals source as the authority for every assertion, because an
  agent writing a test may not decide what its subject should do.

  **THE MECHANISMS RULED OUT, recorded so nobody re-derives them.** A new
  exemption category in `tests/stripboard/temp-scratch.test.ts` for a genuine
  leak weakens the guard that followed a full disk. Hand-editing the ported
  file breaks `port-fidelity.test.ts`. A wrapper module, a sidecar `afterAll`
  in another file, and a `bunfig` preload all fail for one reason: **the guard
  is a static scan of each file's OWN bytes** for a `mkdtempSync` site whose
  identifier is not passed to `rmSync`, so nothing outside the offending file
  can satisfy it.

### G124 - measured: the Task 5 brief's four "pure" clearance tests are two, every other one waits on Task 7 through `render/blocks.ts` rather than through anything about clearance, and **twelve of the thirteen modules Task 5 newly ported are exercised by no test**

The brief's Step 1 says *"The pure ones - `wire-safety`, `connectivity`,
`glyph-clearance`, `text-clearance` - run now."* Two of the four do.
`glyphClearance.test.ts` and `textClearance.test.ts` do not, and neither does
any other clearance test in that tree, because they all import
`@/schgen/render/blocks` for `checkLayout`/`subgraphOf`/`realiseBlock` and
`@/schgen/__fixtures__/circuits` for a fixture circuit. `render/blocks.ts`
imports `@/schgen/render/templates/index` - the template set, Task 7 - and
`@/schgen/render/pageRefs`.

The full list of pedals clearance tests and what each waits on, read from their
import lines:

| test | runs now? | what it needs |
|---|---|---|
| `connectivity.test.ts` | **yes**, ported and green | `render/connectivity` only |
| `wireSafety.test.ts` | **yes**, ported and green | `render/connectivity`, `render/wireSafety` |
| `symbolSelfText.test.ts` | import-clean, blocked for another reason | see **G123** |
| `bodyClearance.test.ts` | no | `render/blocks`, `__fixtures__/circuits` |
| `glyphClearance.test.ts` | no | `render/blocks`, `render/sheetCheck`, `__fixtures__/circuits` |
| `glyphGlyphClearance.test.ts` | no | the same three |
| `textClearance.test.ts` | no | `render/blocks`, `__fixtures__/circuits` |
| `unitText.test.ts` | no | `render/blocks`, `__fixtures__/circuits` |
| `noConnectEnds.test.ts` | no | `render/blocks`, `__fixtures__/circuits` |
| `textIndependence.test.ts` | no | `render/blocks`, `render/bus`, `__fixtures__/circuits` |

**`__fixtures__/circuits.ts` is itself portable today** - its imports
(`__fixtures__/fixtureLib`, `ir/author`, `ir/build`, `ir/types`) all resolve -
so it is `render/blocks.ts` that is the gate, and `render/blocks.ts` is Task 7's.
The consequence for Task 5 is that **of the thirteen modules it newly ported,
twelve are exercised by no test in this repository**: `body-clearance.ts`,
`glyph-clearance.ts`, `text-scene.ts`, `power-text.ts`, `unit-pins.ts`,
`unit-text.ts`, `pin-marks.ts`, `field-placement.ts`, `drawn-extent.ts`,
`layout-check.ts`, `block-types.ts` and `sheet-types.ts` typecheck and nothing
runs them. The thirteenth, `symbol-self-text.ts`, IS exercised, by the
hand-written test **G123** records. The two PORTED tests Task 5 landed exercise
`connectivity.ts` and `wire-safety.ts`, which **Task 3** ported, not Task 5.

**Round 1 of this entry said "not one of the sixteen modules it ported", and
that was wrong twice over**, which matters because the headline is what a later
reader takes away. Task 5 newly ported **13 modules and 2 tests**; the 16 folded
in three that Tasks 3-4 had already ported, two of which - `connectivity.ts` and
`wire-safety.ts` - are exercised, by the very tests Task 5 landed. The honest
figure is thirteen newly ported modules, twelve of them unexercised.

- **Found** 2026-10-19, Task 5, Step 1, while executing the brief verbatim.
- **Evidence** the port refuses by name rather than guessing, which is a check
  that could have failed and did. With `glyphClearance.test.ts` and
  `textClearance.test.ts` provisionally in the manifest,
  `SCHGEN_SOURCE=... bun run tools/schgen/port.ts` printed
  `error: render/glyphClearance.test.ts: imports "@/schgen/__fixtures__/circuits", but tools/schgen/port-manifest.json has no entry for "__fixtures__/circuits.ts"`;
  with that fixture added,
  `error: render/glyphClearance.test.ts: imports "@/schgen/render/blocks", but ... no entry for "render/blocks.ts"`;
  with `render/blocks.ts` added,
  `error: render/blocks.ts: imports "@/schgen/render/pageRefs", but ... no entry for "render/pageRefs.ts"`.
  The table's rows are `grep -n 'from "' ` over each file in
  `$SCHGEN_SOURCE/render/`. The three provisional entries were removed and the
  two files they wrote were deleted; `git status` is clean of them.
- **Verified** CONFIRMED - this writer added the entries, read each refusal, and
  removed them.
- **Why it is open** it is not a defect; it is a sequencing fact the brief got
  wrong, and it changes what "the clearance checks are ported" means. A later
  reader who assumes Task 5 left the clearance system tested will be wrong by
  ten modules.
- **What would settle it** **CRITERION:** every ported clearance test in the
  table above exists in the tree and runs to completion against ported template
  output. **MECHANISM**, stated by the brief itself and untried here: Task 7
  ports `render/templates/*` and `render/blocks.ts`, after which each row's
  manifest entry is added with no `cuts` - plus `__fixtures__/circuits.ts` to
  `tests/schgen/__fixtures__/circuits.ts`, `render/pageRefs.ts`,
  `render/sheetCheck.ts` for the two glyph tests, and `render/bus.ts` and
  `render/layoutKit.ts` for `textIndependence.test.ts`.

### G125 - the obstacle-category matrix is enumerated and filled, and **95 of its 105 cells rest on reading the source rather than on a test that could have failed**

This is **G85**'s criterion met in form and only partly in substance, recorded
plainly because the gap between those two is the whole risk.
`lib/schgen/render/obstacle-matrix.ts` and its six supporting modules enumerate
14 obstacle categories and all 105 unordered pairs including self-pairs;
`tests/schgen/render/obstacle-matrix.test.ts` asserts there is no uncovered
cell, no duplicate cell, exactly 105 of them, a non-blank reason wherever there
is no check, that the partially-covered set is exactly 44 and that a recorded
gap never stands without a check beside it (Controller ruling R11), and - added
under this repository's "verify names against the thing itself" rule rather
than as a criterion for this work - that **all 89** identifiers and **all 20**
`.ts` names the cells cite either exist under `lib/schgen/render/` or carry an
explicit classification.

**ROUND 1 OF THIS ENTRY OVERSTATED THAT LAST CLAIM AND THE OVERSTATEMENT IS
THE INTERESTING PART.** It said *"every function name a `checkedBy` cites
exists"*. The guard's regex took an identifier only at the start of a clause,
after `AND ` or after `→ `, so it checked **8** of the 89 names the cells cite
and said nothing about roughly thirty others - `anchorChecks`, `onPinLine`,
`segmentThroughBox`, `wireOverPins`, `unitOverlaps`, `glyphsClash`,
`junctionPoints` among them. The sharpest miss: the
`pin-number`/`pin-number` cell opens *"symbolTextOverlaps and
placedSymbolTextOverlaps (…)"* and contributed **zero** names, because "and"
is lowercase. The data was clean - an independent sweep over all 119
identifiers the cells cite across all three fields found zero fabricated names
- so this was guard strength, not fabrication. But **a guard whose reach is a
fraction of its claimed reach is the look-like-it-passes-while-hiding-gaps
shape**, which is the one failure this file exists to prevent. Fixed at round 2
by making the extraction total over backticked identifiers rather than by
narrowing the claim.

**That totality is total over the present corpus and INCIDENTAL for one
citation shape, which is worth knowing before anyone relies on it.** The round-2
extraction takes a backticked identifier anywhere, plus a bare identifier at the
start of a clause, after `AND ` or after `→ `. One cell cites two functions in
neither form: `obstacle-pairs-pin-text.ts:27`, inside the shared
`SELF_TEXT_CHECK` constant, reads
`"symbolTextOverlaps and placedSymbolTextOverlaps (lib/schgen/render/symbol-self-text.ts), through "`
- no backticks, and a lowercase `and`, which is the exact shape the round-1
regex missed. **Both names are nonetheless verified**, because each also appears
backticked elsewhere in the matrix (`obstacle-pairs-body.ts` and
`obstacle-pairs-reasons.ts`), so the extraction reaches them by another route.
The consequence: **a future function cited ONLY in that bare-lowercase-`and`
form, and nowhere else backticked, would still pass unverified.** The guard is
total in practice today and not structurally total.

- **Found** 2026-10-19 by the Task 5 round-1 scoped re-reviewer, which
  reproduced the extraction in a standalone script rather than reading the
  regex, and confirmed by the controller directly:
  `grep -rn "symbolTextOverlaps and placedSymbolTextOverlaps"
  lib/schgen/render/` returns that one line, and
  ``grep -rln '`symbolTextOverlaps`\|`placedSymbolTextOverlaps`'
  lib/schgen/render/`` returns the two other files. A check that could have
  failed: had neither name been backticked anywhere, the identifier count would
  have come up short of 89 and the pinned count would have failed.
- **Verified** CONFIRMED for the two greps, which this writer ran; RELAYED for
  the script's reproduction of the count.
- **What would settle it** **CRITERION:** every function an
  `obstacle-pairs-*.ts` cell cites is verified to exist, whatever prose shape
  the citation takes, with no cell relying on the same name appearing in a
  friendlier form elsewhere. **MECHANISM**, untried: carry each cell's deciding
  function names as data beside its prose, which is the route round 2 declined
  in favour of total extraction - the two are alternatives, and this residual is
  the cost of the one chosen.

**The figures.** 105 cells: **58** name a function this tree contains, **47**
carry a reason and no check, **44** record in `asymmetric` what their check does
not reach, **0** are uncovered and **0** carry both a check and a reason.

**Per category, how many of its 14 cells carry a check** - the most useful
single table this work produced, because it says where the clearance system is
thin:

| category | cells with a check |
|---|---|
| `field-text` | 13 / 14 |
| `label-outline` | 12 / 14 |
| `body` | 10 / 14 |
| `pin-name` | 10 / 14 |
| `wire` | 10 / 14 |
| `pin-line` | 9 / 14 |
| `interior-graphic` | 9 / 14 |
| `power-glyph` | 9 / 14 |
| `pwr-flag-glyph` | 9 / 14 |
| `no-connect-marker` | 6 / 14 |
| `pin-number` | 4 / 14 |
| `frame-border` | 3 / 14 |
| `dnp-cross` | 1 / 14 |
| `junction` | 0 / 14 |

`field-text` and `label-outline` are well covered because they are members of
`TextScene.texts`, which `textProblems` iterates and crosses with five other
lists. Everything that is NOT in `texts` is covered only where some other check
happens to reach it. **That is the single structural fact behind both G126 and
G127**: `textProblems` makes `texts` the subject and everything else the
obstacle, and nothing crosses two non-`texts` lists with each other.

**The honest count, which is the point of this entry.** A `checkedBy` is a claim
traced to lines of code, not to a running test. Only two clearance tests run in
this repository (**G124**), and between them they exercise `checkWireSafety`,
`connectedComponents` and `junctionPoints`. So:

- **4 cells are tested as that pair.** `wire`/`wire`, by
  `tests/schgen/render/wire-safety.test.ts`'s collinear-overlap, foreign-T,
  same-net-T and crossing-interiors cases; and - **added at round 2** -
  `pin-number`/`pin-number`, `pin-number`/`pin-name` and
  `pin-name`/`pin-name`, by the hand-written
  `tests/schgen/render/symbol-self-text.test.ts` that **G123**'s mechanism (b)
  produced. Those three are genuinely tested as those pairs: the `NUMBERS`
  fixture puts two pin numbers at a corner, `CORNER` runs a bottom pin's name
  into a side pin's, and `W25` reproduces the stock `W25Q128JVS` drawing GND
  0.13 mm under HOLD/RESET/IO3 - each against a symbol every other check
  accepts, with the exact refusal string asserted, which **is** the pedals
  evidence standard.
- **4 cells have a running test over part of the pair**: `pin-line`/`wire` (pin
  END on wire, not the line), `wire`/`label-outline`, `wire`/`no-connect-marker`
  (the NC pin end, not the marker box), and `wire`/`junction` (whose reason is
  `junctionPoints`, which `connectivity.test.ts` drives three ways).
- **2 cells are tested only in a category-blind form**: `wire`/`power-glyph` and
  `wire`/`pwr-flag-glyph`. `checkWireSafety` sees an `anchor` `ConnItem` and
  never learns whether it becomes a power symbol, a `PWR_FLAG` or a label, so
  *"refuses a label anchor on a foreign wire"* is the only test behind both.
- **95 cells rest on reading alone.** No test in this repository places those two
  categories as geometry and could have failed on them. **Round 1 of this entry
  said 98, correctly for the tree as it then stood**; the three
  `symbol-self-text` cells moved out of that set at round 2.
- **3 cells are backed by a test that places the pair's two categories as real
  geometry and asserts the exact refusal** - the three named above, and they
  arrived at round 2. **Round 1 said zero, and that was true then.** The pedals
  evidence standard §6 records - a new check run against output every other
  check accepts, with the exact refusal message recorded - is met by those
  three and by nothing else. 102 of 105 cells still fall short of it.

- **Found** 2026-10-19, Task 5, Steps 5-6, by reading every ported check line by
  line to fill the cells.
- **Evidence** the figures are `PAIR_COVERAGE.filter(...)` counts over the
  committed module, reproducible in one line of `bun run`; the test file runs
  **6 pass / 0 fail / 56 expect() calls**. That the first test can fail was
  driven: adding a fifteenth category `"sheet-note-box"` to
  `OBSTACLE_CATEGORIES` and leaving it unaccounted turns it red listing exactly
  its fifteen pairs (`body|sheet-note-box` … `sheet-note-box|sheet-note-box`)
  and turns the count test red with `Expected: 120 / Received: 105`; restored,
  and `git diff` of that file is empty. That the name check can fail was driven
  too: renaming one cell's `checkedBy` function to `glyphLabelProblems` turns it
  red naming that identifier; restored.
- **Verified** CONFIRMED - this writer read every ported check, filled every
  cell, ran both perturbations and restored both.
- **Why it is open** **G85** is NOT resolved by this work and should not be
  deleted. Its criterion has two halves - *"the clearance system here is
  specified as a matrix of obstacle-category pairs enumerated up front"*, which
  is now done, and *"with each cell's test run against output that every other
  check accepts"*, which is done for three cells out of 105. The matrix is a ledger
  that makes the blind spots visible and arguable; it is not coverage, and
  describing it as coverage would be the exact failure
  `CLAUDE.md`'s **G52** worked example names.
- **What would settle it** **CRITERION:** each cell naming a `checkedBy` has a
  test that constructs the two categories as geometry which every OTHER check
  accepts, and asserts the exact refusal that cell's function produces - the
  pedals standard, applied cell by cell. **MECHANISM**, untried: Task 7's
  template output plus `__fixtures__/circuits.ts` make such a test possible for
  the 58 checked cells; the ported `glyphClearance.test.ts`,
  `glyphGlyphClearance.test.ts`, `textClearance.test.ts`, `bodyClearance.test.ts`,
  `unitText.test.ts` and `noConnectEnds.test.ts` already cover some of them, and
  the gap between "the ported tests" and "58 cells" is the measurement nobody
  has made. **Do not read the matrix passing as that measurement.**

### G126 - **a power or PWR_FLAG glyph's BOX is an obstacle only for TEXT, and is never a SUBJECT, while a label outline's box is both and is checked against five categories** - the same geometry, two rules

Found by filling the obstacle matrix, and it is the kind of thing **G85** says
the matrix exists to find: *category A had been modelled as an obstacle for
category B but not for category C.* A power symbol and a global label are the
same kind of thing - a box hung off an anchor point - and they are not held to
the same rules.

**What a LABEL's box is tested against**, because `textScene` pushes
`labelBox(l)` into `TextScene.texts`: other texts, `segments` (wires AND pin
lines), `bodies` (unit bodies and power glyphs), `pinTexts` (pin numbers, pin
names, interior text, no-connect markers), `strokes` (interior graphics), and
frame borders. Plus `bodyGlyphProblems`, because `glyphs()` mixes labels in.

**What a GLYPH's box is tested against:** unit graphics, by
`bodyGlyphProblems`; other power glyphs, by `glyphGlyphProblems`; and **every
drawn TEXT, by `textProblems`' `texts × bodies` loop**, because `textScene`
pushes the glyph into `bodies`. That is all three, and the third is the one
round 1 of this entry's HEADING wrongly denied - it said a glyph's box was *"an
obstacle for nothing"*, which this entry's own `power-glyph`/`label-outline`
and `power-glyph`/`field-text` cells refute by naming `textProblems`. **The
accurate statement is that a glyph's box is an obstacle only for text, and is
never a SUBJECT**: `textProblems` iterates `scene.texts` and crosses each text
with the other five lists, so nothing ever asks what a glyph overlaps. Wires
and pin lines live in `segments`, and `bodies` is never crossed with
`segments`.

**The consequences, each read off the source:**

- A foreign wire may run straight through a power glyph's box with no refusal.
  Only the glyph's ANCHOR POINT is tested, by `anchorChecks`
  (`lib/schgen/render/wire-safety.ts`), which refuses an anchor lying on a
  foreign-net wire.
- A power glyph's box may cover a neighbouring pin's LINE with no refusal. Only
  the anchor point is tested, by `onPinLine`
  (`lib/schgen/render/body-clearance.ts`). At KiCad's conventional 2.54 mm pin
  pitch a glyph at one pin's tip is a realistic distance from the next pin's
  line, which is what makes this worth acting on rather than noting.
- A power glyph's box may cover a pin number, a pin name, a no-connect marker or
  an interior graphic stroke with no refusal.
- **And `glyphGlyphProblems`' stricter rule does not reach labels at all.** It
  reads `scene.powers` only: two power glyphs of different nets are refused for
  merely TOUCHING (`touching`, which admits edges and corners - the VSS/VSSA
  corner-to-corner defect), while a glyph against a label is decided by
  `textProblems`' `boxesOverlap`, which permits touching. `glyphs()` in the same
  module mixes labels in, but it is used solely by `bodyGlyphProblems`.

- **Found** 2026-10-19, Task 5, Step 5, while filling the
  `power-glyph` and `pwr-flag-glyph` rows of the matrix.
- **Evidence** read directly in the committed ported source:
  `glyph-clearance.ts`'s `glyphGlyphProblems` takes
  `Pick<GlyphScene, "symbols" | "powers">` and calls `powerGlyphs(scene)`, never
  `glyphs(scene)`; `bodyGlyphProblems` compares `bodies(scene)` (built from
  `graphicsBox(graphics)`) against `glyphs(scene)` and nothing else;
  `text-scene.ts`'s `textProblems` has exactly six inner loops over `texts`,
  `segments`, `bodies`, `pinTexts`, `strokes` and `frames`, all of them iterated
  per `t` of `scene.texts`, so no two of those six lists are ever crossed with
  each other. The matrix cells that record it are `pin-line`/`power-glyph`,
  `wire`/`power-glyph`, `power-glyph`/`label-outline` and their `pwr-flag-glyph`
  counterparts in `lib/schgen/render/obstacle-pairs-body.ts`,
  `obstacle-pairs-graphic-wire.ts` and `obstacle-pairs-glyph.ts`.
- **Verified** CONFIRMED by reading - **and NOT by a drawing.** No test in this
  repository places a power glyph over a wire, so **nobody has seen this
  happen**; it is a hole in the checks, read off the code, not an observed bad
  schematic. Whether a template can actually produce one is unknown until Task 7.
- **Why it is open** closing it means a new check, which is a cell being filled
  rather than a category being discovered - exactly what the matrix is for - and
  Task 5's own rule is that it may not author the acceptance criteria for what it
  produces. It is recorded for the task that has them.
- **What would settle it** **CRITERION:** a glyph's placed box is decided
  against `segments` (wires and pin lines) and `pinTexts` by a named check, and
  a glyph against a label is decided by the same TOUCHING rule as a glyph
  against a glyph - each with a test that builds geometry every other check
  accepts and asserts the exact refusal, per the pedals standard. **The
  criterion says nothing about WHERE that check lives, deliberately**, and
  round 1's prose overstepped it by saying the fix "belongs in the pedals
  source": that is one mechanism, not the criterion.

  **MECHANISM (a), untried and the cheaper one: a HAND-WRITTEN module in this
  repository.** Every input such a check needs is already a public export -
  `TextScene` and `textScene()` (text-scene.ts), `GlyphScene`,
  `glyphGlyphProblems` and `glyphsClash` (glyph-clearance.ts), `powerText(...)
  .glyph` (power-text.ts), `labelBox` (text-boxes.ts), `boxesOverlap` and
  `segmentHitsBox` (geometry.ts). Only `powerGlyphs` (three lines) and
  `touching` (one line) are private, and both are trivially re-derivable.
  `lib/schgen/render/stock-symbols.ts` is the standing precedent for a
  hand-written module importing ported code, and it is legal under
  `tools/schgen/port-manifest.json` with a `handWritten` entry. **Wiring such a
  module into the pipeline's refusal path is a seam at Tasks 7-8**, which is
  why Task 5 recorded this rather than building it.

  **MECHANISM (b), untried: change the pedals source.** The smallest edit is in
  `textScene`, adding each power glyph to `texts` as well as to `bodies` so the
  existing six loops reach it; the risk is that a glyph then becomes an
  obstacle for itself through the `texts × bodies` loop unless it carries an
  `owner`, and that its own value text - which `powerValueSpot` deliberately
  places just beyond the glyph - starts failing. The
  `glyphs()`-versus-`powerGlyphs` half is a one-line change in
  `glyphGlyphProblems`' subject and is the easier half of either mechanism.

### G127 - **`textProblems` never crosses `pinTexts` with `segments`, `bodies` or `strokes`**, so a wire, a body or a glyph over a pin number or an offset-0 pin name is refused by nothing - and the reason is the model's own text resolution

The second blind spot the obstacle matrix found, and unlike **G126** it has a
reason that may well be the right answer rather than an oversight. It is
recorded because the reason is not obvious, and because the residual is real.

`unitText` (`lib/schgen/render/unit-text.ts`) boxes a pin number as
`along(tip, dx, dy, p.length, (3 * GRID) / 2)`. `GRID` is 1270 µm
(`geometry.ts`), so the box reaches **1.905 mm either side of the pin line**,
3.81 mm across, deliberately: its own comment says *"Numbers (and offset-0
names) sit beside the pin line, either side: 1.5 grid steps covers both."* On
KiCad's conventional 2.54 mm symbol pin pitch the half-gap between pins is
1.27 mm, so **one pin's number box always reaches its neighbour's pin line**,
and it always covers its own unit's body-side pin end.

**So a `pinTexts`-versus-`segments` test would refuse every multi-pin symbol
against itself**, and every adjacent-pin fanout the generator draws. That is why
`textProblems` makes `pinTexts` an obstacle for `texts` and for nothing else,
and it is the reason **4** cells of the matrix carry
`obstacle-pairs-reasons.ts`'s `NUMBER_BOX_RESOLUTION` verbatim
(`body`/`pin-number`, `pin-line`/`pin-number`, `pin-number`/`wire`,
`pin-number`/`power-glyph`) with **2** more writing the same argument out
longhand (`pin-number`/`interior-graphic`,
`pin-number`/`no-connect-marker`) - **6** in all, counted over the committed
module rather than estimated, which round 1 of this entry did not do.
`pin-number` ends up with **4 of its 14 cells** carrying a check, the
third-thinnest row in the matrix (see **G125**'s table).

**The residual, stated so it is not lost inside the reason:** a wire genuinely
drawn across a pin number, a foreign body within 1.905 mm of a pin line under
its numbers, a power glyph on a distant pin covering another pin's number, and a
symbol whose own interior stroke crosses its own pin number are all accepted.
The glyph case is the one the reason does NOT bound: the "it starts at the same
pin tip" argument covers a glyph on that pin and its neighbour and says nothing
about a glyph three pins away.

An offset-0 pin NAME shares all of this, because `unitText` models it as a
`decoration` beside the pin line rather than as a `nameBox`. An inside name
(`namesOffset > 0`) does not: it lies within the body, so the clearance box and
`graphicsBox` checks reach it indirectly.

- **Found** 2026-10-19, Task 5, Step 5, while filling the `pin-number` and
  `pin-name` rows.
- **Evidence** read directly: `text-scene.ts`'s `textProblems` iterates
  `scene.texts` and crosses each `t` with the other five lists, never crossing
  two non-`texts` lists; `unit-text.ts`'s `decorations` push uses
  `(3 * GRID) / 2` for `half` and `along()` applies `half` across the pin axis;
  `geometry.ts` line 31 is `export const GRID: Um = 1270;`. The arithmetic
  1905 > 1270 is the whole claim and is checkable. **The 2.54 mm pin pitch is
  KiCad's convention, not a constant in this tree** - nothing here asserts it,
  and that is a weakness of the reason.
- **Verified** CONFIRMED by reading the three sources. **The claim that a test
  would refuse every multi-pin symbol is a prediction, not a measurement** - no
  such test was written and run, because the fixtures that would place a
  multi-pin unit need Task 7 (**G124**).
- **Why it is open** the reason may be correct and the residual may still be
  worth a check at a finer text model; nobody has measured which. Task 5 may not
  author the criteria for its own work, so the question is recorded rather than
  answered.
- **What would settle it** **CRITERION:** either a measurement showing that a
  `pinTexts`-versus-`segments` test refuses output the generator legitimately
  produces - which settles it as a reason - or a check that decides those pairs
  at a text resolution that does not, with a test that builds geometry every
  other check accepts. **MECHANISM**, untried: the prediction is cheap to test
  the moment Task 7 lands, by adding the missing loops to a COPY of
  `textProblems` in a test and counting the refusals over the template set;
  if it refuses nothing legitimate the reason is wrong and the loops belong in
  `textProblems`. Note that `textProblems` is a ported file, so the change
  belongs in the pedals source (see **G123**'s mechanism for the same
  constraint).

### G128 - the obstacle matrix deviates from the brief's stated mechanism in five places, each deliberate

**G85**'s mechanism is *"an up-front obstacle-category matrix"* and the Task 5
brief gave it a shape: thirteen files to port, a `PairCoverage` with three
fields, and three tests. The criterion was met; the shape was not, in five
places. Recorded because **CLAUDE.md**'s **G52** worked example is exactly an
implementer following a mechanism past the point it meets its criterion, and
because a later reader comparing the brief with the tree needs to know which
differences are decisions.

1. **`asymmetric` is widened from direction-sensitivity to PARTIAL SUBJECTS.**
   The brief's field is *"the pair is decided in one direction only"*. Almost
   every geometry test in this tree is a symmetric box or segment overlap with
   no direction to be sensitive to. What they do have is partial subjects: a
   check that decides a pair for a POINT rather than for a box
   (`onPinLine`, `anchorChecks`), for a FOREIGN unit but not for the same unit
   (`overlapProblems`), or for one SUBSET of a category (`textProblems`'
   `mark === true` clause against the DNP crosses). That is G85's failure one
   level down, so 44 cells use the field for it rather than dropping the
   information for want of a fourth field. Documented on the field itself.
2. **`meaninglessBecause` carries "no check is expressible at this model's
   resolution" as well as "the geometry makes it impossible or harmless".** The
   brief asks the second; **6** cells can only honestly give the first (see
   **G127**) - `body`/`pin-number`, `pin-line`/`pin-number`,
   `pin-number`/`wire` and `pin-number`/`power-glyph` carrying
   `NUMBER_BOX_RESOLUTION` verbatim, plus `pin-number`/`interior-graphic` and
   `pin-number`/`no-connect-marker` making the same argument longhand.
   **Round 1 of this entry said 15 and the Task 5 report said 9, and both were
   estimates rather than counts** - corrected at round 2 by filtering the
   committed module, which is the measurement that should have been made the
   first time. The field name overstates those 6 cells, and the alternative -
   inventing a fourth `openBecause` field - would have made `uncoveredPairs()`
   return them and the brief's first test fail, which is not a change an
   implementer may make to its own acceptance criteria.
3. **Sixteen modules were ported, not thirteen.** The brief's list does not
   resolve: `render/blockTypes.ts`, `render/sheetTypes.ts` and
   `render/pinMarks.ts` are in the import closure of the thirteen and
   `tools/schgen/port.ts` refuses without them. `pin-marks.ts` in particular
   carries `dnpCross` and the pin-polarity marks, so two of the brief's four
   hard categories could not have been settled without it.
4. **The matrix is seven files, not one.** 105 cells with a defensible sentence
   each is roughly 1,200 lines, over `CLAUDE.md`'s 300-500 ceiling. It is
   `obstacle-matrix.ts` (types, categories, assembly, `uncoveredPairs`), five
   `obstacle-pairs-*.ts` row-family data modules, and
   `obstacle-pairs-reasons.ts` for the reasons several cells share - written
   once so that a reader who disagrees with one knows from one place which
   cells fall with it.
5. **Six tests, not three.** The brief's three are verbatim. Three more enforce
   standing repository rules rather than criteria for this work: a non-empty
   guard, because the brief's reason loop asserts nothing at all if every cell
   has a check (*"no guard that cannot fail"*); a path check and a
   function-name check, because *"verify names against the thing itself"* and
   this repository has twice shipped a name from memory; and a check that
   `frames.ts`, `sheet-check.ts`, `blocks.ts` and `templates/` are still absent
   from `lib/schgen/render/`, so that the **25** cells whose reasons rest on
   their absence fail loudly on the commit that ports them instead of standing
   stale (11 through `FRAME_DERIVED`, 12 through `NO_FLAG_PRODUCER`, plus
   `body`/`body` and `pin-line`/`pwr-flag-glyph`, counted over the committed
   module rather than estimated).

- **Found** 2026-10-19, Task 5, Steps 1-7, as each deviation was forced.
- **Evidence** (1) and (2) are the field doc comments in
  `lib/schgen/render/obstacle-matrix.ts`; (3) is `tools/schgen/port.ts`'s
  refusal, which names the missing entry and could have failed differently;
  (4) is `wc -l` over the seven files, none above 289; (5) is the test file,
  and both of its new checks were driven red and restored (see **G125**).
- **Verified** CONFIRMED - each deviation was made by this writer, for the
  stated reason.
- **Why it is open** it is not a defect. It is open because a reviewer comparing
  the brief against the tree will find five differences and should find them
  already explained, and because (1) and (2) are judgements someone may want to
  overturn.
- **What would settle it** **CRITERION:** a reviewer accepts the five
  deviations, or names which to undo. (2) is the one worth a second opinion: if
  a cell with no check and no defensible reason should be visible as such rather
  than absorbed into `meaninglessBecause`, the field set needs a fourth member
  and `uncoveredPairs()` needs to stay as the brief defined it, which are not
  obviously compatible. **MECHANISM**, untried: a fourth field `openBecause`,
  with the first test asserting `uncoveredPairs()` empty over
  `checkedBy || meaninglessBecause || openBecause` and a separate test printing
  the open count - which changes a test the brief fixed, so it needs the
  authority Task 5 does not have.

### G129 - five smaller residuals measured while reading the ported clearance checks, none of them a defect in Task 5's work

Recorded together because each is a sentence a later reader cannot re-derive
without reading the same files again, and because `CLAUDE.md` requires a
measurement that found nothing wrong as much as it requires a defect. Each is
cited by the obstacle matrix cell named beside it.

1. **`sceneClearanceProblems` exempts an attached wire from a unit's body test
   ENTIRELY.** `body-clearance.ts`:
   `if (attached(u, w.a, w.net) || attached(u, w.b, w.net)) continue` - so a
   wire that ends on one of a unit's pins, on that pin's net, may cross a
   DIFFERENT pin's line or body region of that same unit with no refusal. Cell:
   `body`/`wire`, and by reference the `interior-graphic`/`wire` and
   `pin-name`/`wire` cells that lean on the same function.
2. **Two pin lines of ONE unit are compared by nothing.** `overlapProblems`
   compares units pairwise and `symbolTextOverlaps` is scoped to pin TEXT - its
   doc comment is explicit. A library symbol whose two pins are drawn crossing,
   or whose interior stroke crosses its own pin line, passes every check in this
   tree. Cells: `pin-line`/`pin-line`, `pin-line`/`interior-graphic`,
   `pin-number`/`interior-graphic`.
3. **There are TWO models of the same pin text, and they disagree in shape.**
   `unit-text.ts`'s `along()` boxes a pin number 1.905 mm across the pin line
   over the pin's whole length; `symbol-self-text.ts`'s `run()` boxes it
   `textWidth(number)` long, centred along the pin, `ACROSS = GRID + 254` =
   1.524 mm to one side, and additionally strips `~{}`/`_{}`/`^{}` markup before
   measuring, which `unit-text.ts` does not. The sheet checks use the first and
   the symbol self-check uses the second. Nothing reconciles them, and nothing
   says which is right. Cells: the `SELF_TEXT_ONLY` reason in
   `obstacle-pairs-reasons.ts`, cited by three cells.
4. **Nothing in this tree produces a `flag: true` `PowerSymbol`.**
   `anchorsToSymbols` (`power-text.ts`) hard-codes `flag: false`, and the only
   producer is `render/frames.ts`, not ported. So all 14 `pwr-flag-glyph` cells
   are claims about a check's shape, exercised by nothing - including the
   `flagOnItsRail` exemption, whose `a.flag !== b.flag` test means it does NOT
   exempt two flags of one net from each other. Cell: every `pwr-flag-glyph`
   row member, via `NO_FLAG_PRODUCER`.
5. **A zero-length pin's no-connect marker straddles its body edge.**
   `unit-text.ts` skips the pin line and the number for `p.length === 0` but
   runs the no-connect loop unconditionally over `noConnectEnds`, so for such a
   pin the marker's `GRID / 2` box sits on the body-side end rather than beyond
   a pin, and could reach an inside pin name. **Reasoned from the code, not
   measured**, and no symbol in this repository's vendored set was checked for a
   zero-length pin. Cell: `pin-name`/`no-connect-marker`.

Measured and found fine, so nobody re-checks it: **a junction can never
coincide with a no-connect marker.** A junction needs three or more coincident
wire and pin ends; `componentProblems` (`layout-check.ts`) refuses an NC pin
that touches anything at all and `pinChecks` (`wire-safety.ts`) refuses any
coincidence involving an NC pin. The two cannot share a point, and that rests
on two refusals rather than on an argument.

- **Found** 2026-10-19, Task 5, Step 5.
- **Evidence** each item names the file and the construct, read directly in the
  committed ported source; items 1, 2 and 4 are single expressions anyone can
  grep for (`attached(u, w.a, w.net)`, `flag: false`, `a.flag !== b.flag`), and
  item 3 is a comparison of `along()` in `unit-text.ts` with `run()` and
  `ACROSS` in `symbol-self-text.ts`.
- **Verified** CONFIRMED by reading, and by nothing else: **item 5 is reasoning
  about an input shape nobody has looked for**, and items 1-4 have no test
  behind them (see **G125**).
- **Why it is open** each is a property of the ported source, carried here on
  purpose. Fixing one means diverging from the pedals source, which needs a task
  with a stated reason to diverge.
- **What would settle it** **CRITERION:** for 1 and 2, a named check decides the
  pair with a test that builds geometry every other check accepts; for 3, one
  text model, or a recorded statement of why two are correct; for 4, a flag
  reaches a `GlyphScene` in a test; for 5, a measurement over the vendored and
  stock symbol sets of whether a zero-length visible pin exists at all - which
  may settle it as impossible rather than as a defect. **MECHANISMS**, all
  untried: 1 wants the body test run per-pin rather than per-unit with a
  whole-unit exemption; 2 wants `symbolSelfText`'s self-check widened from text
  to geometry; 3 wants `symbolSelfText` to import `unitText`'s boxing, which it
  deliberately does not, so the reason it does not is the first thing to find
  out; 4 arrives with `render/frames.ts` in Task 8; 5 is one `grep` over the
  symbol libraries plus `tools/schgen/symbol-census.ts`.

### G130 - measured, and NOT a defect: `pin-marks.ts`'s `dnpCross` doc comment is correct, although two independent readers reported it wrong - the margins are mutating variables that start as the overhangs, and the asymmetry between them is real

Two agents, independently, reported that `lib/schgen/render/pin-marks.ts`'s
`dnpCross` doc comment misstates its own arithmetic: the comment says the
margin becomes `mx = max(0.6·mx, 0.3·my)` while the code computes
`Math.max(ox * 0.6, oy * 0.3)` from `ox`/`oy`, the pins' overhang beyond the
body. The obstacle matrix's `CROSS_BOUND` reason states it the second way, so
the matrix looked more accurate than the source it cites, and that was reported
to the controller twice as a defect worth carrying upstream.

**It is not a defect. The comment is right, read in full**, and this entry
exists because the misreading is the easy one and the next reader will make it
too. The comment's own first clause says the margins *"start as the pins'
overhang beyond the body"* - so at the moment `mx = max(0.6·mx, 0.3·my)` is
evaluated, `mx` and `my` ARE `ox` and `oy`. The comment describes two mutating
variables in sequence; the code spells the first step's inputs out as `ox`/`oy`
and reuses `mx` for the second. Both say the same thing.

**What the comment captures that a careless rewrite would destroy** is a real
asymmetry: `mx` is computed from the ORIGINAL `my`, while `my` is computed from
the ALREADY-UPDATED `mx` (`lib/schgen/render/pin-marks.ts:90-91` - `const my =
Math.round(Math.max(oy * 0.6, mx * 0.3))` uses the `mx` from the line above,
not `ox`). The comment's *"become … then …"* is what says so. Anyone
"correcting" the comment to the symmetric `max(0.6·ox, 0.3·oy)` /
`max(0.6·oy, 0.3·ox)` form would make it genuinely wrong in the second term.

- **Found** 2026-10-19. A Task 5 reviewer reported the comment as misstating
  the arithmetic; the Task 5 implementer agreed, declined to register it on the
  grounds that nothing in the register would act on an upstream-only defect,
  and raised it to the controller instead. **Controller ruling R13: registered,
  but as a measurement that found nothing wrong rather than as the defect it
  was reported to be** - and the implementer's stated reason for omitting it is
  the wrong test. This register is a register, not a work queue; *"a defect you
  are not fixing"* is one of the categories `CLAUDE.md` names explicitly, so
  "nothing would act on it" is not a ground for leaving something out. Had the
  finding been real it belonged here regardless of who could fix it.
- **Evidence** `grep -n "0.6\|0\.3\|overhang" lib/schgen/render/pin-marks.ts`
  read directly: line 78 is the comment, lines 88-91 are `ox`, `oy`, `mx`, `my`
  in that order, and line 91's second term is `mx * 0.3`, not `ox * 0.3`. A
  check that could have failed: had line 91 read `ox * 0.3`, the comment's
  *"then"* would have been wrong and the original report correct.
- **Verified** CONFIRMED - this writer (the controller) ran the grep and read
  the comment and all four lines directly, rather than relaying either agent's
  reading. **Both agents' reports are superseded by this entry**, and no
  upstream edit is owed for it.
- **Why it is open** it is not open as a defect. It is kept because two
  careful readers misread the same four lines the same way, which makes the
  comment's phrasing a hazard even though its content is correct, and because
  the asymmetry it documents is the kind a well-meaning cleanup would delete.
- **What would settle it** nothing further. If anyone does rewrite that comment
  for clarity, the thing to preserve is that `my` depends on the updated `mx`
  while `mx` depends on the original `my` - and `lib/schgen/render/pin-marks.ts`
  is a PORTED file, so the rewrite is an upstream edit in the pedals
  repository, not a local one.
