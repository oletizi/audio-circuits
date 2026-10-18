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
  points at the other. Task 5 made it an ERROR for one ref to carry both a
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
- **STILL ON THE PAGE (2026-10-17, this plan's Task 6).** Verbatim from the
  regenerated packets: low-boost's junction rows read *"junction_grounds |
  5-pin header | O1 0, P1 0, Q1 0, R1 0, S1 0"* and *"junction_signals | 5-pin
  header | D1 IN, E1 HI_BOOST_OUT, F1 LO_BOOST_IN, G1 OUT, H1 0"*, and the
  layout images print `0` beside six of the board's left-hand edge pins.
  `pultec-low-cut` prints the same. Left exactly as it is: the decision this
  entry asks for is the owner's and he has not made it.

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
- **STILL ON THE PAGE (2026-10-17, this plan's Task 6).** Verbatim from the
  regenerated packets - low-boost's Cuts table is four rows and low-cut's is
  three, and every `Separates` cell is still a generated ladder name:
  `si_hi_boost_j20_p3 | si_hi_cut_j12_p3`, `j10_p1 | j10_p2`, `j10_p2 |
  j10_p3`, `j10_p3 | j10_p4` on `pultec-low-boost`; `j5_p3 | j5_p4`, `j5_p4 |
  j5_p5`, `j5_p5 | j5_p6` on `pultec-low-cut`. Left exactly as it is: the
  decision this entry asks for is the owner's and he has not made it.

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

---

Open: a fix would settle these
------------------------------

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
  clothes.
### G45 - the printable packet carries none of the conditionality the wiring sheet carries, and never mentions the wiring sheet

A Pultec section board is not populated the same way twice: most of its parts
belong to stand-in groups for the sections that are absent, and `wiring.md`
spends several screens on which group to populate in which build, on
populating a group whole or not at all, and on the switch that is one pole of a
gang shared with another board. `make guide` is the target `make help`
describes under *"Build it on the bench"*, and its packet says none of it.

Read off the regenerated `boards/pultec-low-boost/guide/guide.html`: the
checklist's **Resistors and trim-pots** and **Capacitors** sections list
`SI_HI_BOOST_RV_HI_BOOST.ccw-wiper`, `SI_HI_CUT_C26`,
`SI_LOW_CUT_RV_LO_CUT.ccw-wiper`, `SI_MID_R_MID_SHUNT` and the rest beside the
board's own parts with nothing distinguishing them. The **Wire-to-board
junctions** table gives each panel terminal a hole and a functional name but
gives the control itself the value `landing pad`, so the pages never say the
pot is 47k LOG or that the switch has six positions. Page one names
`perfboard.json` and the circuit module as what the packet was built from and
does not mention `wiring.md` at all.

Building from the printed checklist alone therefore populates every stand-in
group in every build - which `wiring.md` says puts two copies of a section in
parallel and halves a value, *"at the bench a plausible wrong measurement, not
an obvious fault"* - and fits a separate six-position switch per board where
one shaft is meant to turn two.

- **Found** 2026-10-17, this plan's Task 6, reading the printed packets.
- **Evidence** the checklist sections and the junction table above, read off
  both regenerated `guide.html` files; `grep -c` over each of them returns 0
  for `stand-in`, `Populate`, `ganged`, `potentiometer`, `LOG`, `6-position`
  and `stacking`; `boards/pultec-low-boost/wiring.md` **Panel parts** and
  **Stand-in groups**; `make/board.mk:203` for what `guide` is advertised as.
- **Verified** yes - read on both printed packets, against the committed
  `wiring.md` of the same board.
- **Why it is open** the packet and the wiring sheet were built by different
  plans for different questions, and nothing has yet said whether the packet is
  the whole bench document or one page of a set. That is the choice underneath:
  print the conditionality into the packet, or have page one name `wiring.md`
  as a page you must have in your hand.
- **What would settle it** either fix, done deliberately. What is not
  acceptable either way is the present state, where the one document headed
  "build guide" is silently incomplete in a direction that builds the wrong
  circuit.

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
- **Why it is open** it is **not a defect** - it is a measured constraint on a
  change the owner has indicated he wants. Doing it safely means re-deriving and
  re-adopting the affected boards, which needs his approval on fresh renders,
  and he has separately ruled that the adopted boards are not to be revisited:
  *"we don't need to revisit the three adopted boards. They're buildable as-is."*
- **What would settle it** the owner deciding whether the gain above is worth
  re-approving boards he has already approved. **It also belongs with G44**:
  the ground row is PCB-correct and bench-irrelevant, which is the same
  distinction that entry records.


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
  `Component`'s definer constructor, whose callers are `mainwindow_events.cpp`,
  `compdialog.cpp` and `pindialog.cpp`; and `m_listUser`, which
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
- **Why it is open** whether a packet should spend a sheet on a half-empty
  first page is a judgement about a printed document, and by this repository's
  own rule the agent that produced the document does not get to author the
  criterion it is judged by.
- **What would settle it** the owner looks at a printed packet and says whether
  the page count is worth the guarantee that no image is split - or names what
  he wants instead (the notice sharing page one with the first image, the
  checklist starting on the page the last image ends on, a smaller paper size).

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
