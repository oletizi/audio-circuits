Drawing verdicts
================

**This file is the record `EVALUATING-DRAWINGS.md` §5 requires and §7 depends
on.** Approval is state the reviewer writes; it is never derived from a check, a
clean lint, or an absence of findings. Every verdict below is **his words
verbatim**, bound to the sha256 of the exact sheet he was shown.

**THE STATUS VOCABULARY IS DELIBERATELY ABSENT.** The practice design states that
*"an agent may not author the vocabulary its own output is judged in"*, and the
owner has not named a state set. So this file records **what he said** and
nothing more - no agent-chosen word stands in for it. `cargo-vet`'s user-defined
state set with an *implies* lattice is the one surveyed precedent worth reading
before he fixes ours; the survey is in
`docs/research/2026-10-28-git-native-record-tooling.md`.

**This is an interim substrate, not the designed one.** §3 of
`docs/superpowers/specs/2026-10-28-schematic-draughtsmanship-practice-design.md`
specifies a committed `drafted/<circuit>/<board>/` directory, an SVG render that
diffs, and a GNU recutils register with an enforced state enum and a staleness
check comparing recorded to computed digests. **None of that is built.** This
file exists so that verdicts already given are not lost while it is - losing one
is the failure the rule was written to prevent.

**WHAT COUNTS AS APPROVAL HERE: a ruling, scoped, and NOT a rule.** The owner,
2026-10-29, asked whether *"serviceable"* and *"MUUUUCH better"* counted as
approval for the purpose of printing those pages in a build guide:

> *"If I have seen them and said they are acceptable, then that counts as
> approval (in THIS case - **do not generalize this into a dumb rule**)"*

**So all four of the pages below that carry a positive verdict are approved**, and
`pultec-low-boost` and `pultec-low-cut` are approved on those words.

**THE PARENTHESIS IS PART OF THE RULING AND BINDS AS HARD AS THE REST OF IT.**
Nothing here says that a reviewer's approval of a drawing can be inferred from
warm words in general, and **no clause stating that has been written into
`EVALUATING-DRAWINGS.md` §5, deliberately.** §5 still reads: approval is state
the reviewer writes, never derived. He resolved four specific drawings he had
looked at; he did not hand anyone a test to apply to the next one. **An agent
that finds itself reasoning about whether some new phrase amounts to approval
has the answer already - it does not, and the question goes to him.**

This is the fourth time a single verdict of his has invited promotion into a
decision procedure. The other three were struck.

**The hash is of the sheet, which is the binding.** The render is evidence and
not a binding, and the one measured render digest that would be a second binding
- `sha256(svg minus the generation-title line)` - is not recorded here because
its cross-machine and cross-version stability is **unmeasured**.

---

## pultec-low-boost, hybrid pass 1

- **Sheet** `docs/research/2026-10-29-hybrid-pass-1/hybrid-pass-1.kicad_sch`
- **sha256** `42cdca004bc86e2fafd92239c5a0c46c675e89a777df429527355e0e5c7d6dd7`
- **Produced by** copperhead draft, then akcli-kicad repairs
- **Shown** 2026-10-29
- **Verdict, verbatim:**

  > *"the repairs to the drawing make it MUUUUCH better."*

**Carried, not closed** - four items this page still holds, none of which he
named as a defect:

- `#PWR02`, J1's ground, the weakest defence of the four and flagged for
  overrule rather than defended
- the `RV1`/`47K` text graze
- eight single-instance local labels
- the Hi boost group rectangle larger than its contents

**The defect he named on an earlier version of this page, in his words**, because
§8 says the reviewer names the defect and the agent derives the correction - and
these are the corrections' origin:

> *"this ground symbol is folded back on its wire. Ideally, the ground terminal
> of the pot symbol would point down or horizontally so the ground wire doesn't
> hairpin"*

> *"we dont need five discrete ground symbols here. one will suffice if all the
> wires connect."*

> *"i don't see why SI8 isn't at the same level as SI2. SI8 seems oddly far away
> with an unnecessarily long and crooked wire"*

---

## pultec-low-cut, full run

- **Sheet** `docs/research/2026-10-29-low-cut-full-run/low-cut-hybrid.kicad_sch`
- **sha256** `54900d50aad1a1ccca11ee6e827b1325e6e9aae76d37311eb42c75960804494b`
- **Produced by** copperhead draft, then akcli-kicad repairs - the same loop as
  the page above, applied a second time
- **Shown** 2026-10-29
- **Verdict, verbatim:**

  > *"this looks good. Not perfect, but quite serviceable. I would count this
  > effort as a successful application of the process. Obviously, we will improve
  > the process over time, but this is a great start"*

**And on one specific choice in it, unprompted:**

> *"the long rail is the right choice. It's much more clear than a pair of labels
> would have been. On-page labels in place of wires should be used very
> sparingly. I've almost never seen it used"*

**The defect he named on this page**, which the collapse pass below addresses:

> *"There is a duplicate label that should be collapsed"*

---

## pultec-low-cut, after the collapse pass

- **Sheet** `docs/research/2026-10-29-low-cut-collapse-pass/low-cut-collapsed.kicad_sch`
- **sha256** `65914fd9f4cc99d54fdf767fc23a8063b2a3ef12fb59ed392763c18310f9de8d`
- **Produced by** the page above, with both duplicate on-page label pairs
  collapsed to wires; SI5 and SI6 redrawn as a series column to clear the
  corridor
- **Shown** 2026-10-29, as the full page plus before/after crops of the Hi cut
  group
- **Verdict, verbatim:**

  > *"the low-cut page is fine. It's serviceable."*

**Stated to him as not done, and not objected to:**

- the ~40 mm void in the middle of the Hi cut box is not closed; closing it is an
  arrangement change nobody has reviewed
- the `hi_boost_out` label above SI5 sits 1.27 mm below the group box's top edge,
  the smallest gap on the page, nothing overlapping
- `#FLG01` and the four ground symbols are unchanged, including the `#PWR01` put
  up for overruling on the low-boost page

---

## pultec-hi-boost, hybrid full run

- **Sheet** `docs/research/2026-10-29-hi-boost-full-run/hi-boost-hybrid.kicad_sch`
- **sha256** `3c2f302b12a8c4c1eb8d1523bc876740d4b509cc8ee47934208471389d3a682c`
- **Produced by** copperhead draft `v2-blocks-own-last`, then 174 akcli ops and 69
  literal text edits. **The Hi boost group's arrangement is agent-authored**, not
  copperhead's: nine capacitors in contact order at 15.24 mm pitch, four
  tapped-coil sections each above the x-span of the capacitors on its tap, four
  tap buses, one 113.03 mm `coil_top` rail. copperhead's Q chain was left exactly
  where it was.
- **Shown** 2026-10-29, as the full page plus before/after crops of eight regions
- **Verdict, verbatim:**

  > *"The hi boost drawing is pretty good. Certainly usable."*

**AND HE NAMED A DEFECT IN THE SAME BREATH, with a crop of it:**

> *"There's a goofy hairpin:"*

The crop is the **Lo boost stand-in group**, `SI7` and its ground. Measured from
the sheet after he pointed at it: `#PWR07` sits at (207.01, 46.99) rotation 0,
**above** `SI7`, and `copperhead_power:GND` draws its graphic 2.54 mm in the sheet's
+y direction - so **the triangle's apex lands exactly on SI7's top pin at
(207.01, 49.53) and covers the whole 2.54 mm wire that reaches it.** The wire
goes up and the symbol comes back down over it. That is the fold.

**It is the third instance of one class**, which is the part worth carrying: the
low-boost page had it on a pot's ground, `#PWR02` on the same page is still up for
overruling, and here it is again. The owner's statement of the cause, from the
first instance: *"Hairpins in general are an indicator of something amiss with
symbol organization, orientation, and/or placement."* **The structural cause here
is that the `lo_boost_in` rail runs along the BOTTOM of the group and both parts
hang upward off it, so every ground in the group is forced to the top.**

---

## pultec-hi-boost, after the Lo boost redraw

- **Sheet** `docs/research/2026-10-29-hi-boost-hairpin-fix/hi-boost-hairpin-fixed.kicad_sch`
- **sha256** `240c61df793611adebf0c4a76a103c31c8b8d8cc2b4b243dba043c5e58f0135a`
- **Produced by** the accepted hi-boost page with the Lo boost stand-in group
  redrawn to the `S1` convention: input entering from the left, `SI6` horizontal
  to `out` on the right pointing right, `SI7` shunting down to a ground below it.
  **No copperhead** - the first run of this loop with no drafting step at all.
- **Shown** 2026-10-29, as before/after crops of the group, a close crop of `SI7`
  and its ground, and the whole page
- **Verdict, verbatim:**

  > *"approved."*

**THIS IS THE FIRST DRAWING IN THIS RECORD HE HAS USED THAT WORD FOR**, and it is
recorded as his word rather than normalised into a status - the vocabulary is
still his to name and this file still has no status field.

**What the correction got right, which is the carried lesson.** He named the
hairpin, then named its cause - *"the input below the output, which is goofy ...
output pointing up which is exactly backwards of convention"*. The repair derived
from P1 alone, which this writer had already specified in coordinates, was to
move the grounded part below the rail so its ground stopped folding. **That was a
true repair that would have left the group reading backwards.** Redrawn to the
convention instead, the hairpin disappeared because two parts moved, not because
a wire was re-routed.

**Electrically a no-op, verified three ways** - net partition as `REF.PIN` sets,
net names, and the name-to-pin-set mapping all identical; ERC 0 errors both
sides, 5 pre-existing `lib_symbol_issues` warnings both sides.

**Confined to the group, verified three ways** - the five other group rectangles'
content margins byte-identical, the render differing in one band inside the Lo
boost rectangle, the netlist identical.

**Stated to him as not done, and not objected to:**

- **`Lo boost` was the only inverted group on the page.** The other five all have
  their input at or above their output, were checked, and were deliberately left
  alone - `S1` is followed, never enforced, and he scoped the repair to one group.
- the other three ground symbols' carried Reference offsets, and the four
  different `GND`-text offsets on the page
- the scoped/unscoped net-name mix
- `#PWR01`, J1's ground, still unchanged and still the symbol put up for
  overruling on the low-boost page

---

## pultec-hi-cut, hybrid full run

- **Sheet** `docs/research/2026-10-29-hi-cut-full-run/hi-cut-hybrid.kicad_sch`
- **sha256** `7ccf557c5474222f6850b78f8c3c53ac45b89389f782f4b8c317d483900a76f1`
- **Produced by** copperhead draft `v4-blocks-mid-late`, then akcli repairs and a
  field-restating pass. **The Hi cut group is agent-authored**: `lo_boost_in`'s
  fourteen pins drawn once as a 193.04 mm rail along the top, ten capacitors
  vertical beneath it in contact order at 15.24 mm, six straight selector runs,
  ten risers.
- **Shown** 2026-10-29, as the full page plus before/after crops of the Hi cut
  group and a crop of the capacitor bank
- **Verdict, verbatim:**

  > *"looks good. approved"*

**THE PITCH WAS MEASURED FOR THIS PART SET, NOT COPIED**, which is P3 working
rather than being quoted. 15.24 mm lands on the same number as the hi-boost page,
and the run established that as a coincidence of both boards carrying
six-character values: at 12.70 mm a value would sit 1.05 mm from the **next**
capacitor's plate, at 13.97 mm 2.32 mm. The hi-boost run had already found that
copying low-cut's 12.70 mm was measurably wrong for a different part set.

**AND CHARACTER COUNT IS NOT A PROXY FOR TEXT WIDTH**, measured off the render at
600 dpi: `2200pF` draws 6.858 mm and `.047uF` 6.223 mm at the same six
characters, because the leading `.` is narrow. Anything that reasons about label
clearance from string length is reasoning about the wrong quantity.

**Four repair classes recurred for the fourth consecutive board** - the five
stacked grounds on J2, `#FLG01` synthesised on `#PWR01`'s exact coordinates,
`move_component` carrying field angles (all twenty capacitor fields came out at
`angle 90` on symbols at rotation 0), and duplicate on-page labels. **The label
collapse reached a stand-in group nobody had mentioned**, and one label's
collapse moved a resistor, a ground symbol, a `GND` text and a rectangle.

**Stated to him as not done, and not objected to:**

- the Hi cut arrangement is agent-authored and unreviewed as an arrangement
- three unoccupied regions inside the Hi cut rectangle not closed
- `#PWR01` unchanged - **the same symbol all four accepted pages have now put up
  for overruling, still unruled**
- `#FLG01` moved rather than deleted; it earns nothing on the drawing
- the `out` label still against J1's pin-4 number, as on the other accepted pages
- `2200pF` left 0.63 mm from its own plate, because closing it would narrow the
  3.18 mm gap to the next capacitor by the same amount
- one net renamed by label scope; the five pre-existing ERC warnings not
  suppressed

---

## pultec-mid, hybrid full run

- **Sheet** `docs/research/2026-10-29-mid-full-run/mid-hybrid.kicad_sch`
- **sha256** `1f8de32150f322f8f040b2cef1d857df7b16e884bff409a0debd5ec3a7344ff8`
- **Produced by** copperhead draft `v1-blocks-own-last`, then akcli repairs and a
  restyle pass. **The Mid group is agent-authored** - 28 of the board's 39 parts:
  seventeen capacitors in contact order at 15.24 mm staircased to their own
  contacts, five tap buses at one y, five winding sections above them, one
  200.66 mm `coil_return` rail, eleven selector runs each a single straight
  horizontal with no corner.
- **Shown** 2026-10-29, as the page plus the Mid group before and after, the
  capacitor bank, the coil row, and the `no_connect` marker
- **Verdict, verbatim:**

  > *"looks good. approved"*

**THIS IS THE FIFTH AND LAST PULTEC SECTION BOARD**, and the one that produced no
drawing at all until the same day it was approved. Two fixes stood between those
states: `SW_MID` pin 12 declared not-connected through `ComponentOverride.ncPins`,
and the `missing-junction` defect in `splitAtBranches` where R33's split handled
a T and not an X.

**The no-connect marker measures the same on two tool paths**, which is what
makes it a property of the symbol rather than of either drawer: 1.355 mm of ink
and a 0.21 mm closest approach to the `12` glyph on both the `lib/schgen/` page
and this one, with no row where the two colours share a pixel column. The only
red it touches is pin 12's own pin line, where KiCad draws the marker by design.

**A new repair class appeared, the ninth overall and the fifth on akcli's side**:
a global label's tag is a shape KiCad draws the wire *through*, so three of them
sat over a pin number, a pin stub and their own wire. **Only the render found
it** - no count on the page saw anything.

**AND FOUR COMMITTED CHECKS WERE WRONG, which is the finding worth carrying past
this board.** A sheet holds library pins in two textual forms - copperhead writes
power-symbol pins on one line - and `junction_audit.py` and `verify.py` dropped
one of the forms, resolving **0 of 5 power pins** and reporting a **false orphan
junction** at the shared ground symbol. Both are fixed with a token-count
refusal, **and the earlier runs' orphan figures carried the same blind spot.**
`akcli check --layout` was wrong here in **both** directions - claiming an
overlap where the render measures 1.896 mm of clear space, and twice calling a
label-over-wire collision on the label's own net - where the written process knew
only that it reports too few findings.

**Stated to him as not done, and not objected to:**

- the 90.5 x 28.5 mm unoccupied region in the Mid box's upper-left is not closed;
  closing it means moving the return block west or re-laying the group
- `#PWR01` unchanged - **the symbol all five accepted pages have now put up for
  overruling, still unruled**
- `#FLG01` moved rather than deleted; it earns nothing
- the `out` label still against J1's pin-4 number
- the Lo cut stand-in's output sits below its input; `S1` is followed, never
  enforced
- contacts named `sel1`..`sel11` rather than by frequency; `3300pF` left 0.900 mm
  from its own plate; values centred rather than left-justified; seven nets gained
  a leading `/` from label scope; the five pre-existing ERC warnings not suppressed

---

## pultec-hi-cut on US Letter, centred

- **Sheet** the centred Letter page, sha256
  `e9843e6dbd3f765822e34bf51cd0d3d2659f0a6969c4c9a866e7691727bdf332`
- **Produced by** the approved A4 page with `(paper "USLetter")` and **one rigid
  translation of 21.59 mm west**. No part moved relative to any other; netlist
  components, net names and net membership all identical to the A4 page, with a
  control proving the comparator reports a difference when one pin is added.
  Frame measured from an empty rendered Letter sheet: page 279.4 x 215.9 mm,
  outer border 10.0, **inner border 12.0**, so content centred between x 12.0 and
  267.4 sits 17.21 mm clear each side.
- **Shown** 2026-10-30, as the Letter page untouched, the A4 page beside it, and
  then the centred page
- **Verdicts, verbatim, in the order he gave them:**

  On the uncentred Letter page:

  > *"It's goofy but serviceable. You need to center the content in the horizontal
  > (long) axis."*

  On the centred page:

  > *"yes. approved. So are the build guides you've shown me"*

**THE SECOND SENTENCE APPROVES THE BUILD GUIDE DOCUMENTS**, which is a separate
artifact from any page: the single-document packet with the schematic merged in
as page 2, as shown for `pultec-hi-cut`, `pultec-mid`, `pultec-hi-boost`,
`pultec-low-boost` and `pultec-low-cut`.

**WHAT THIS ENTRY DOES NOT CLAIM.** The Letter sheets for `pultec-mid`,
`pultec-hi-boost`, `pultec-low-boost` and `pultec-low-cut` were shown to him and
he has not separately ruled on them as pages. He approved the guides he was
shown and the centred hi-cut page. **Those four are not recorded here as
approved**, and the centring he directed has not been applied to them yet - so
their bytes are about to change again in any case. §5 binds: approval is state
the reviewer writes, never derived, and never widened by an agent reading a
sentence generously.

**The directive in the first verdict is general and is recorded as such:**
content is centred on the horizontal axis. He gave it looking at one page and
applied it to the rest in the same breath by answering *"yes"* to centring the
other four.

---

## A COMPARATIVE VERDICT: the hybrid pages against `lib/schgen/`'s

- **Shown** 2026-10-30, after the layout-withholding gate was deleted: all eleven
  `lib/schgen/` pages from `bun run tools/schgen/board-sheets.ts --pdf`, ten of
  which carry the fallback field placements that gate had been withholding
  build-guide pages for. He had already seen the five build guides.
- **Verdict, verbatim:**

  > *"the drawings in the build guides are MUCH better than the lib/schgen pages
  > you just showed me"*

**This is a comparison, which §4 reserves to the reviewer**: *"Comparing two
drawings is the reviewer's act. An agent may place drawings side by side and must
not order them."* He ordered them. No agent may restate this as a ranking of its
own, or extend it to a page he has not seen.

**What it compares.** The build guides print the five hand-drawn Pultec sheets in
`drafted/pultec/`, produced by the copperhead-then-akcli loop that `TOOLING.md`
describes. The eleven pages beside them are `lib/schgen/`'s own output, from the
model, by its templates and layout backend.

**What follows from it is NOT settled here**, and an agent must not settle it:
`lib/schgen/` is also the census, the netlist round-trip and the gates, and all
eleven boards now declare an `"sch"`, so its pages reach no build guide today.
**Whether it should go on producing drawings at all is his question to answer**,
and it is open.

---
## The four remaining Pultec pages on US Letter, centred

- **Sheets** the four centred Letter pages, each sha256 verified against the
  digest its own `RECORD.md` binds **before** the image was rendered from it:

  | Board | sha256 |
  | --- | --- |
  | `pultec-hi-boost` | `a1fa415966ad026c2448c25e65a7e267e51554853cb563399f62befc47bf668e` |
  | `pultec-low-boost` | `b9e42e6a90a7fee4a440760bc67df1968fd756325987327db84b434a565dbc59` |
  | `pultec-low-cut` | `5e1a4139918cf7ddb9a9f4588b2f3e04091539cd9d5830650bc95c359c8896db` |
  | `pultec-mid` | `d4b0b8cc6e3be35298cf1a240dcf8705bce655822224493670089df272138e2b` |

- **Produced by** the re-paper from `A4` to `USLetter` and the horizontal
  centring he directed on 2026-10-30, for `hi-boost`, `low-boost` and
  `low-cut`; `mid` was **re-drawn** from `A3` rather than re-papered.
- **Shown** 2026-10-31, as four PNGs rendered by `kicad-cli` 10.0.5 from the
  committed sheets at 2400 px wide, sent to his phone in the order
  `hi-boost`, `low-boost`, `low-cut`, `mid`, carrying one question and nothing
  else: *"Do you approve each of these four?"*
- **Verdict, verbatim:**

  > *"yes, approved"*

**THIS CLOSES THE GAP THE PRECEDING ENTRY LEFT OPEN BY NAME.** That entry said
of these same four boards: *"Those four are not recorded here as approved, and
the centring he directed has not been applied to them yet - so their bytes are
about to change again in any case."* The centring was applied, the bytes
changed, and these are the digests of the changed bytes.

**WHAT THIS ENTRY COVERS, AND IT IS EXACTLY FOUR SHEETS.** The four digests
above, as rendered and shown. §5 binds: approval is state the reviewer writes,
never derived and never widened by an agent reading a sentence generously. It
is not a verdict on a build guide, on a board layout, on `pt2399-core` or on
any `transistor-preamp` page, and it does not transfer to any later byte of
these four - a re-paper, a re-centre or a single moved label puts a page back
in front of him.

**WHY THE PREVIOUS VERDICTS ON THESE FOUR BOARDS DID NOT TRANSFER, recorded
because an agent got it wrong in the session that produced this entry.** Each
of these boards was approved earlier, at `A4` or `A3`. A verdict is bound to a
sha256, so the re-paper and the re-draw left four verdicts bound to bytes that
no longer existed, and the pages were awaiting re-approval from the moment
their bytes changed - which the four `RECORD.md` files said plainly and a
controller's dispatch brief contradicted, claiming five approved pages. **The
records were right and the summary was wrong.** The cheap check that settles it
at any time: of the digests in this file, count how many equal a sheet's
present bytes.

---

## transistor-preamp-staged, copperhead draft repaired with akcli

- **Sheet** `drafted/transistor-preamp/transistor-preamp-staged/transistor-preamp-staged.generated-do-not-edit.kicad_sch`,
  sha256 `e6165baac555523691a400441245d4c14babb0301881dcfcb350702ba63e7775`
- **Produced by** `make draw` from the intent `drawingIntent()` generates from
  the model, as one copperhead group, then one akcli op-list and literal text
  edits. Every part was moved in the repair pass: the coordinates and
  orientations are agent-placed, not copperhead's. The page's `RECORD.md` has
  the detail.
- **Shown** 2026-11-01, as two renders side by side: copperhead's draft as
  `make draw` wrote it, re-papered, and the repaired page, rendered by
  `kicad-cli` 10.0.5 from the sheet above
- **Verdict, verbatim:**

  > *"The repaired drawing looks great"*

**WHAT THIS ENTRY DOES NOT CLAIM.** He did not use the word "approved", and §5
does not let an agent supply it. Nor did he rule on whether this page replaces
`circuits/transistor-preamp/staged-board.kicad_sch`, the sheet the board's
`perfboard.json` names and the build guide prints. Both are his to state.

**THEN, THE SAME DAY, ON PROMOTION, verbatim:**

> *"This drawing is better than my hand-drawn one—it fits on the page, where
> mine doesn't. Let's promote this new drawing to the canonical schematic"*

Done in `288bd0a`: `circuits/transistor-preamp/staged-board.kicad_sch` is now
this page plus hidden Footprint fields set from the model and minus the title
block's "generated - do not edit" line, sha256
`402e0f383660892a8f794063c3629fa10e7001b20c305e405f4542dee0635493`. A 150 dpi
render of it differs from the page he reviewed in two title-block lines: the
file name (`staged-board.kicad_sch` versus
`transistor-preamp-staged.generated-do-not-edit.kicad_sch`) and the absence of
the "generated - do not edit" comment, which the reviewed page shows and the
promoted page does not. Those bytes are not the ones his verdict above binds
to, and this entry does not claim they are.

**ERC on the promoted sheet, from `circuits/transistor-preamp/` (its own
directory, empty `sym-lib-table`):** 0 errors, 7 warnings - the same 4
`lib_symbol_issues` (library `copperhead_power` not configured) and 3
`lib_symbol_mismatch` (the embedded 2N3904) the drafted copy's `RECORD.md`
records for its own directory. The old hand sheet did not have these; the
owner chose to keep copperhead's power symbols (see the Decisions table in
`docs/superpowers/specs/2026-11-01-staged-preamp-copperhead-drawing-design.md`).

**THE PROMOTION ALSO DROPPED A TEXT BLOCK, AND NO EARLIER ENTRY HERE SAID SO.**
The sheet `288bd0a` replaced carried one text block - **STARTING SETTINGS**
(each leg's total and trim value for RV1-RV4, the 2B variant, "pull C1"), the
Q2 emitter-follower measurement instructions, and **PANEL CONTROLS** (what
DRIVE, CHARACTER and TRANSFORMER DRIVE do) - which is
`circuits/transistor-preamp/staged-board.ts`'s `schematicNotes()`. The promoted
page carries no such block; its only `(text ...)` is the group caption.
`perfboard.json` names this sheet and `make guide` prints it as the build
packet's schematic page, so the build packet no longer prints the starting
trim positions or the panel-control explanations anywhere. `schematicNotes()`
is not restored here and the sheet is not changed to add it back - that would
change bytes the owner has not seen. **Open question for the owner:** should
the notes go back on the page (for example as an akcli text placement in the
free area this page's `RECORD.md` measures), or should the build guide print
`schematicNotes()`'s strings on its own schematic page instead? Tracked as a
row in the Decisions table of
`docs/superpowers/specs/2026-11-01-staged-preamp-copperhead-drawing-design.md`.
**Answered the same day:** *"into the build guide"* - the guide prints them as
**Build notes** from the circuit's `guideNotes()` export (`f566b0d`).

**THEN, 2026-11-02, THE PROMOTED SHEET CHANGED.**
Per `docs/superpowers/specs/2026-11-02-staged-preamp-fixed-stage-one-design.md`,
the staged board's stage 1 is fixed at the values tuned on the buffered board,
and `circuits/transistor-preamp/staged-board.kicad_sch` was repaired in place to
match: RV1-RV4 deleted, R1 820K, R2 270K, R3 2.7K, C1 straight to GND, nothing
outside stage 1 moved. sha256
`402e0f383660892a8f794063c3629fa10e7001b20c305e405f4542dee0635493` ->
`31a5e0c47ebf3a2ee1d94e6d3c0d62d534137e86690863abfbe9411fba04422e`. The repair and
its replay are in `drafted/transistor-preamp/transistor-preamp-staged/repair/`,
and that page's `RECORD.md` has the before/after measurements. ERC on the new
sheet from `circuits/transistor-preamp/`: 0 errors, 7 warnings, the same kinds
as above.

- **Shown** 2026-11-02, as three renders together: this sheet (sha256
  `31a5e0c4...` above, rendered by `kicad-cli` 10.0.5 from those bytes), and the
  re-placed stripboard `boards/transistor-preamp-staged/transistor-preamp-staged.perfboard.vrt`
  (sha256 `4e579f9872a0d844972f843562051f7afffadc7f21ed853d2c8bfe5ad6d2ebb9`) by
  designator and by value
- **Verdict, verbatim:**

  > *"looks good"*

**WHAT THIS ENTRY DOES NOT CLAIM.** He did not use the word "approved", and §5
does not let an agent supply it. The same message carried the fork fix spec;
the verdict is recorded against the three renders, which are what was asked
about, and not as a ruling on that spec's open questions.

---

## h7-carrier, copperhead draft repaired with akcli, with C4

- **Sheet** `drafted/h7-platform/h7-carrier/h7-carrier.generated-do-not-edit.kicad_sch`,
  sha256 `c9355a88d72d589edccc457b3648e0141baf9f5cceb231adb94c3af69061d8f8`
  (commit `6d498a0`)
- **Produced by** `make -C boards/h7-carrier draw` from the intent
  `drawingIntent()` generates from `circuits/h7-platform/carrier-board.ts`, as one
  copperhead group, then two akcli op-lists and literal text edits; every part
  position and wire is agent-authored. The page's `RECORD.md` and
  `repair/REPLAY.md` have the detail.
- **Shown** 2026-11-12, as the 150 dpi PNG and the committed SVG of this sheet,
  with the question *"What is your verdict on this carrier page?"* An earlier
  page (sha256 `dc9e93ea4ca6f42249df5faf7004965f83396db9f0c8e366474ca3e3ec5252af`)
  was shown first and withdrawn unjudged when issue 30 found the sense-node
  capacitor missing from the model.
- **Verdict, verbatim:**

  > *"ok, approved"*

**WHAT THIS ENTRY DOES NOT CLAIM.** The words came after an exchange about the
issue 30 follow-up review, in which the settling-time bound was corrected
(`022e172`, analysis only; the sheet's bytes are unchanged). The page verdict was
the one request open to the owner, and it is recorded against this sheet on that
reading; the owner may correct it. It is not a clearance of the circuit:
VBUS-HOTPLUG stays open and the carrier's USB sense path is not cleared for
physical bring-up ([decisions.md](../h7-platform/decisions.md) CR-CARRIER-VBUS-SENSE-CAP).
It covers none of the controller rulings the page rests on, each of which the
owner may still override.

---

## h7-module power page, copperhead draft repaired with akcli

- **Sheet** `drafted/h7-platform/h7-module/power.kicad_sch`,
  sha256 `906f454928df01a8c32826a277f041e2a3151fef8ac69a967f14f7abf8b7875f`
  (commit `7272b8d`)
- **Produced by** `make -C boards/h7-module draw`, from the intent built off the
  `power` block of `circuits/h7-platform/module-board.ts` (`module/power.ts`). The
  draft was repaired with akcli op-lists and literal text edits; every part
  position and wire is agent-authored. The page's `RECORD.md` and
  `repair/power/` have the detail.
- **Shown** 2026-11-12, as the 150 dpi PNG and the committed SVG of this sheet,
  with the question *"What is your verdict on this module power page?"*
- **Verdict, verbatim:**

  > *"approved"*

**WHAT THIS ENTRY DOES NOT CLAIM.** The word came after an exchange about the
issue 32 review. That review found one gap, in the verifier rather than the page:
it did not fail on ERC errors. The gap was fixed in `f3bb79b`, and the sheet's
bytes did not change. The page verdict was the one request open to the owner, and
it is recorded against this sheet on that reading; the owner may correct it.

It is not a clearance of the circuit. Three items stay open:
- MODULE-POWER-PARTS-TO-MODEL, the 26.3 V ratings;
- MODULE-BUCK-LOOP-STARTUP;
- MODULE-3V3-BUDGET.

It covers none of the controller rulings the page rests on, each of which the
owner may still override: CR-MODULE-PAGE-RAILS, CR-MODULE-INDUCTANCE-NOTATION,
CR-MODULE-SUBOHM-RKM, and [the PWR_FLAG admission](../h7-platform/decisions.md#cr-module-pwr-flags). It covers only this one page
of the module, not the root or the other eleven blocks.

---

## h7-module interface, clock, reset_boot, swd, usb_dfu and id_strap pages, copperhead drafts repaired with akcli

- **Sheets:**
  - `drafted/h7-platform/h7-module/interface.kicad_sch` sha256 `0cfb3dac4f7a8c8f63c965390c36897a0f21793d865e379070d6d610cd028296` (commit `b0d3c00`)
  - `drafted/h7-platform/h7-module/clock.kicad_sch` sha256 `83f751b213f71266095f3826df5283bc5ae53208d95f4757f5d53824a83b55b1` (commit `e7404b4`)
  - `drafted/h7-platform/h7-module/reset_boot.kicad_sch` sha256 `ca60cfca271a78d79085015c5d5ffa6b7a7812701842b81b00adaec6f4954397` (commit `2b7dde8`)
  - `drafted/h7-platform/h7-module/swd.kicad_sch` sha256 `486923651c80caf44123005ed47fcb5a756c128674a052a4f99727a96b8cfef8` (commit `056ea0d`)
  - `drafted/h7-platform/h7-module/usb_dfu.kicad_sch` sha256 `80947ededbb593f37bd87d6e838d232557dfc07c6f6d147ac6257cca5f5a299f` (commit `58267d6`)
  - `drafted/h7-platform/h7-module/id_strap.kicad_sch` sha256 `7649af4311431f60b159a7d6717c26d136ed3311182f3d5330f11a44eba6cf09` (commit `115b170`)
- **Produced by** `make -C boards/h7-module draw`, one intent per block of
  `circuits/h7-platform/module-board.ts`. Each draft was repaired with akcli
  op-lists and literal text edits, and every part position and wire is
  agent-authored. The module's `RECORD.md`, one section per page, and
  `repair/<block>/` have the detail.
- **Shown** 2026-11-12, as one 150 dpi PNG per sheet, the six together, with the
  question *"What is your verdict on each of these six module pages: interface,
  clock, reset and boot, debug header, USB update socket, and ID strap?"* The
  qspi page, drawn in the same group, was held back and not shown, because its
  per-block ERC check failed for want of a cross-page driver.
- **Verdict, verbatim:**

  > *"approved. proceed"*

**WHAT THIS ENTRY DOES NOT CLAIM.** One word answered a question about six pages,
and it is recorded against each of the six sheets on that reading; the owner may
correct it for any one of them. It is not a clearance of any circuit, and it
covers none of the controller rulings these pages rest on, each of which the
owner may still override: CR-MODULE-PAGE-RAILS, CR-MODULE-PWR-FLAGS,
CR-MODULE-HSE-LOAD, CR-MODULE-SUPERVISOR-SYMBOL, CR-MODULE-SWD-HEADER,
CR-MODULE-USB-ESD, CR-MODULE-USB-C-PINS, CR-MODULE-ID-STRAP-VALUES and
CR-MODULE-ID-STRAP-PIN. The last of these carries an unchecked condition, the
PC2_C analog switch, which stays open. The entry covers neither the qspi page nor
the module's root.

---

## h7-module qspi, vdda, sdram and decoupling pages, copperhead drafts repaired with akcli

- **Sheets:**
  - `drafted/h7-platform/h7-module/qspi.kicad_sch` sha256 `a9578cf6b8bc881ce1cd57d98c862a80241e772c9e7e687195b897e33ca23ea1` (commit `1a2078f`)
  - `drafted/h7-platform/h7-module/vdda.kicad_sch` sha256 `7f066a9ab786252b592d14ffaa8886e934876bcc678666b73c1922f06eee2444` (commit `2245ac7`)
  - `drafted/h7-platform/h7-module/sdram.kicad_sch` sha256 `0812ab0287bdb8e126f8bd3b2d4a09e54251ee6dc0e62e784d871b9947a48bcf` (commit `0f06844`)
  - `drafted/h7-platform/h7-module/decoupling.kicad_sch` sha256 `8d20ff5196f59330bb77424024d856124808d3d49c5affe89db56f7516c416cb` (commit `03caf6f`)
- **Produced by** `make -C boards/h7-module draw`, one intent per block of
  `circuits/h7-platform/module-board.ts`. Each draft was repaired with akcli
  op-lists and literal text edits; every part position and wire is
  agent-authored. The module's `RECORD.md`, with one section per page, and
  `repair/<block>/` have the detail.
- **Shown** 2026-11-12, as 150 dpi PNGs, with two questions:
  - qspi alone, once its per-block check passed: *"What is your verdict on this
    module QSPI flash page?"*;
  - then the other three together: *"What is your verdict on each of these
    three module pages: VDDA filter, SDRAM, and MCU decoupling?"*.
- **Verdict, verbatim:**

  > *"approved"*

**WHAT THIS ENTRY DOES NOT CLAIM.** The word came after a message about the mcu
page's VCAP rule-check error. That message described a controller ruling and
closed by listing these four pages' verdicts as the open requests to the owner.
The word is recorded against these four sheets on that reading, and the owner
may correct it for any one of them.

**It is not recorded as an owner decision on that ruling.** The ruling is
CR-MODULE-VCAP-ERC, and v1 left its exclusion awaiting an owner sign-off. It
stays a controller ruling the owner may override. This entry also does not cover
the mcu page, which has not been shown, or the module's root.

It is not a clearance of any circuit. VDDA-DAMPING-LEG, VDDA-WIDEBAND,
MODULE-BUCK-LOOP-STARTUP and the bring-up rows stay open.

It covers none of the controller rulings these pages rest on, each of which the
owner may still override:
- CR-MODULE-PAGE-RAILS
- CR-MODULE-PWR-FLAGS
- CR-MODULE-CROSS-PAGE-DRIVERS
- CR-MODULE-PORT-LABEL-CHECK
- CR-MODULE-VDDA-BANK
- the bead value rule
- CR-MODULE-SUBOHM-RKM

---

## h7-module mcu page, the changed reset_boot page, and the module's root sheet

- **Sheets:**
  - `drafted/h7-platform/h7-module/mcu.kicad_sch` sha256
    `c3d780a2ec08d385c4fe777c288f851f3c8803754cf995c6cb6f1da49539f981` (commit `674a91f`)
  - `drafted/h7-platform/h7-module/reset_boot.kicad_sch` sha256
    `00407478a4357332aa46164387305ba433dec173796b8d343d3bad86e09bdd24` (commit `3889312`).
    This supersedes the approved `ca60cfca…` above. Only U5's symbol changed:
    it is now the C4 project symbol `h7-platform:TLV803EA30DBZR`, whose pin 2 is
    open collector, under the amended CR-MODULE-SUPERVISOR-SYMBOL.
  - `drafted/h7-platform/h7-module/h7-module.kicad_sch`, the root, sha256
    `3590b959500bd1a3d359915094601450f5437ce071a644dad084aa20e98a99ed` (commit `75c4b6f`),
    with `h7-module.kicad_pro` sha256
    `62905f75e8abc6cf0890616b8021b8a31140395b01575e817e372bbd6f09a5a0`
- **Produced by:** the mcu page and reset_boot as the other block pages were.
  The root was built by `tools/draught/assemble-root.ts` with its packing
  arrangement (CR-MODULE-ROOT-FITS-LETTER). The module's `RECORD.md` has the
  detail.
- **Shown** 2026-11-12, as 150 dpi PNGs, with two questions:
  - for mcu alone: *"What is your verdict on this module MCU page?"*
  - for the other two together: *"What is your verdict on each of these two
    pages: the changed reset and boot page, and the module's top-level sheet?"*
- **Verdict, verbatim:**

  > *"approved"*

**WHAT THIS ENTRY DOES NOT CLAIM.** One word came after a message listing these
three verdicts as the ones open to the owner. It is recorded against each of the
three sheets on that reading, and the owner may correct it for any one of them.

It does not record an owner decision on any controller ruling. These remain the
controller's, and the owner may override them:
- CR-MODULE-VCAP-ERC (v1's exclusion awaited an owner sign-off);
- the amended CR-MODULE-SUPERVISOR-SYMBOL;
- CR-MODULE-CROSS-PAGE-DRIVERS;
- CR-MODULE-PWR-FLAGS;
- CR-MODULE-ROOT-PROJECT-FILE;
- CR-MODULE-ROOT-FITS-LETTER.

It is not a clearance of the module circuit. These rows stay open:
- MODULE-POWER-PARTS-TO-MODEL;
- MODULE-BUCK-LOOP-STARTUP;
- MODULE-3V3-BUDGET;
- VDDA-DAMPING-LEG;
- VDDA-WIDEBAND;
- the bring-up rows.

---

## h7-pedal interface, entry, pf, modsw, prail, ldo_vmid, usb, midi_i2c and fsw_led pages, copperhead drafts repaired with akcli

- **Sheets:**
  - `drafted/h7-platform/h7-pedal/interface.kicad_sch` sha256 `963777f3bf9df9c3b5d966ce48c71bf76071f902c716f88a65b07c621b88822a` (commit `25a2f97`)
  - `drafted/h7-platform/h7-pedal/entry.kicad_sch` sha256 `5352fd5b917c96520681efa8421b8b63d9a0f92345156c776044f48708af0736` (commit `22a0d1d`)
  - `drafted/h7-platform/h7-pedal/pf.kicad_sch` sha256 `7096a9befaf2e62b42218a2153a34fa317fc9cad0a1ad5e1ae9c0d198a4b2385` (commit `d742a3a`)
  - `drafted/h7-platform/h7-pedal/modsw.kicad_sch` sha256 `89ed82bcbc60b4e2f075257768f68a4a66370348dc5db4e7c4b9632ca3099dc2` (commit `0eff293`)
  - `drafted/h7-platform/h7-pedal/prail.kicad_sch` sha256 `f440c0c355718e6e280f955abe1ef8df8f2075cf89d5866f3ef854f90ae15780` (commit `19414c9`)
  - `drafted/h7-platform/h7-pedal/ldo_vmid.kicad_sch` sha256 `584cdc4ce97d96875c2c2b76a9504e99997eb1a21623668b7feb7202e6f96ecd` (commit `19414c9`)
  - `drafted/h7-platform/h7-pedal/usb.kicad_sch` sha256 `efe062770501a63ad44dfe33558fcb54f7bd6676b5bab682b25278317aecb653` (commit `37aaf63`)
  - `drafted/h7-platform/h7-pedal/midi_i2c.kicad_sch` sha256 `fb12cf76ea6924f8cc1a983c9eaed4f85a004e15e399836941852d0e818afc4f` (commit `0185444`)
  - `drafted/h7-platform/h7-pedal/fsw_led.kicad_sch` sha256 `de6b3e173b854daef218356aa2ade4c1b66cdd5277eed411b969780865fb2021` (commit `33b210c`)
- **Produced by** one copperhead intent per block of `circuits/h7-platform/pedal-board.ts`,
  each draft repaired with akcli op-lists and literal text edits; every part position and
  wire is agent-authored. The pedal's `RECORD.md`, one section per page, and
  `repair/<block>/` have the detail.
- **Shown** as 150 dpi PNGs in four messages, each carrying only a question:
  - *"What is your verdict on each of these two pedal pages: the module socket (interface) and the DC power entry (entry)?"*
  - *"What is your verdict on each of these two pedal pages: the power-fail circuit (pf) and the module power switch (modsw)?"*
  - *"What is your verdict on each of these two pedal pages: the rail supply (prail) and the mid-rail reference (ldo_vmid)?"*
  - *"What is your verdict on each of these three pedal pages: the USB port (usb), MIDI and I²C (midi_i2c), and the footswitches and LEDs (fsw_led)?"*
- **Verdict, verbatim** (2026-11-13):

  > *"schematics approved"*

**WHAT THIS ENTRY DOES NOT CLAIM.** One message answered four questions about nine pages,
and it is recorded against each of the nine sheets on that reading; the owner may correct
it for any one of them. It covers no page not yet shown: controls_a, controls_b, expr_ref,
the codec group, the analog group and the pedal's root. It is not a clearance of the pedal
circuit, and it records no owner decision on any controller ruling these pages rest on (the
CR-PEDAL-* entries each page's `RECORD.md` section cites, among them CR-PEDAL-POPULATION,
CR-PEDAL-MIDI and CR-PEDAL-CROSS-PAGE-POWER-DRIVERS); each stays the controller's, and the
owner may override it. The open rows those pages name, MIDI-OUT-CONNECTOR,
I2C-EXPANSION-CONNECTOR and MIDI-IN-RECEIVER-STOCK among them, stay open.

---

## Microsoft SchGen's attempts at the five approved Pultec boards

- **Date:** 2026-11-10.
- **What he was shown:** one image per board, the approved page then SchGen's
  attempts 1-3. No attempt produced a sheet, so each attempt was a card reading
  *"Attempt N: no schematic generated"*. **There is no SchGen sheet to bind to**;
  the verdict is bound to the images, in
  `docs/superpowers/plans/2026-11-09-schgen-drawing-trial-execution/presentation/`:
  - `pultec-hi-boost.png` `d2c6164c11addc5fd68644b865a39a711db333f6f9a0e2caae39bc4c6b423d93`
  - `pultec-hi-cut.png` `c7d691c7fe7ec1711c18d0a92213a2aa26b4edbb514773236f0431eb03eaa65f`
  - `pultec-low-boost.png` `1e24b11ac63f6ab57fb853fb16a7aeb94b5a788cd2bb7ddb6a2d5ff8a8725f62`
  - `pultec-low-cut.png` `a0bc701c3a2fa1e86e57745444b0127fa22bf464b3313df56eb970c873e0c28f`
  - `pultec-mid.png` `b5bbb963e75cdf364b1e3e33b8499a1ea785473e5b88f56f41dcc61b792c543e`
- **Verdict, verbatim:**

  > *"every image says “no schematic generated”"*

**WHAT THIS ENTRY DOES NOT CLAIM.** It is a reading of the images, not a verdict
on any drawing, since none exists. His decision on SchGen that followed is
`docs/known-gaps.md` **G310**, and the findings are
`docs/research/2026-11-09-schgen-drawing-trial.md`.

---

## What this record is for, beyond not losing a verdict

§7 extends the reviewer role by **demonstrated agreement with the recorded
verdicts**, judged by him. Without these verdicts there is no evidence from
which the role could ever be extended, and published results on an adjacent
structurally-precise domain report *"near-zero agreement with human raters"* for
model-as-judge - so the naive form is already known not to work.

**However many verdicts are above, it is not a basis for anything yet, and the
count is deliberately not written here** - it would be a transcription with a
date on it, and this repository has already had one figure read seven different
values in nine days. Count the `##` headings. Whatever the number, it is small,
every verdict is from one reviewer, and §7 needs **demonstrated agreement**
rather than a tally.
