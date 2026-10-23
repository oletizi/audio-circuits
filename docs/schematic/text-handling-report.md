# Text handling in generated schematics — what the investigation found

**Read this first.** It is the human-facing report on a seven-task research pass
completed 2026-10-23. The evidence is in
[`text-handling-research.md`](text-handling-research.md) (seven sections, ~5,800
lines); the findings are in `docs/known-gaps.md` (**G265**–**G276**); the
decision record is in
[`../superpowers/plans/2026-10-22-text-handling-research-execution/`](../superpowers/plans/2026-10-22-text-handling-research-execution/).
**This document carries almost no evidence of its own.** Every figure is
`[RELAYED]` from one of those sources, and two things only are its own: a
re-drive of the board census in §2, which **confirms G274 clause (2) rather than
discovering it**, and one inference drawn from that entry's data and marked where
it appears. Both are labelled in place. A summary that quietly promotes relayed
figures to established ones is the specific failure its sources were reviewed
against, so the labelling is the point and not politeness.

## 1. What was asked

The schematic generator produces a sheet for **0 of the repository's 11 boards**.
The owner's instruction, 2026-10-22:

> *"I want you to use superpowers to develop a plan to research actual solutions
> to the text handling issues instead of reasoning about text from first
> principles"*

preceded by the diagnosis that prompted it: *"there has been 50 years of research
and development into text handling. You seem to be trying to solve text handling
issues from first principles instead of using those 50 years of accumulated
knowledge."*

That diagnosis was correct. The generator measured every piece of text as
`character count × text height` — every glyph as wide as it is tall — and
searched for a place to put it one part at a time.

## 2. THE HEADLINE, AND IT IS NOT THE ONE THE INVESTIGATION SET OUT TO FIND

**Text placement is the sole cited cause of refusal for two of the eleven
boards.** Not nine, and not three.

**This finding is `docs/known-gaps.md` G274 clause (2)'s, not this report's**, and
the attribution matters because the first draft of this section implied
otherwise. The seventh task of the plan drove the census, built the table below,
tallied the per-board problem counts and wrote the conclusion. This report
re-drove the same census independently on 2026-10-23 (`[RAN]`
`bun tools/schgen/board-sheets.ts`) and **agrees with it exactly**, which is the
only thing here that is this document's own work. Read G274(2) for the full
account; what follows is the shape of it:

| boards | where they stop | what actually stops them |
| --- | --- | --- |
| 6 | `validateCircuit`, before any geometry exists | net names, **plus one other problem each** |
| 2 | ELK layout | **a label overlapping another label** — text, and only text |
| 2 | ELK layout | a power symbol's glyph **touching another net's glyph** |
| 1 | ELK layout | **a junction disagreement with no text in it at all** |

The six that never reach geometry fail on a net-name rule
(`^[A-Z0-9][A-Z0-9_]*$`) with 13 to 27 violations each — **and every one of them
also carries exactly one non-naming problem**: `pt2399-core` a single-pin net,
and each of the five Pultec boards **a switch pin that is neither on a net nor
declared not-connected**. So **relaxing the naming rule unblocks none of the
six.** Each would still refuse, on the other thing.

That last sentence is **this report's inference** from G274(2)'s data rather than
a quotation of it — the entry records the two problem classes per board and the
counts; it does not draw the consequence. The consequence is the actionable part,
because the net-name rule is the obvious thing to reach for and on its own it
buys nothing.

Two of the five layout refusals cite a power-symbol glyph touching another net's
glyph as the binding clause. Label overlaps are present on those boards too, but
they are not what the refusal names.

**Why this matters more than any other finding here.** The investigation was
commissioned because text handling blocked the schematics. The research is sound
and its particulars hold — but **the framing was wrong at board level**, and it
was wrong in the direction that made the subject look bigger than it is. Three of
the five output classes in `CLAUDE.md`'s mandate are still not delivered, and
text placement is a smaller share of the reason than this pass assumed when it
began.

## 3. What the research established

**Nothing comparable refuses.** Of seven tools examined — KiCad, lepton-eda,
xschem, netlistsvg, schemdraw, Altium, OrCAD — **none refuses to produce a
drawing because text will not fit.** KiCad's own field autoplacer has no refusal
path at all: four candidate sides, a two-tier collision grading, a local repair
that fits fields into wire gaps, and when every side collides **it draws the
fields overlapping anyway.** This generator's refusal is the outlier among its
closest neighbours. One tool (netlistsvg) adjusts the surrounding geometry to
make room; this generator has no perturbation of any kind.

**The premise that a label cannot be moved was false on all four axes.** The
register had recorded that a global label's position is a netlist fact, so moving
one off an overlap changes the circuit. Driven against `kicad-cli` on nine
committed fixtures, with net *identity* and net *naming* read separately: a label
can be **rotated**, its **anchor slid** along the same connection, the **wire
under it rerouted**, and it can be **moved to another segment of the same net**
— all with the connectivity unchanged. Candidate positions per label run from
**20 to 1,000, median 80**; all 95 anchors examined are wider than the four the
earlier mechanism assumed.

**Fixing the measurement does not fix the problem.** Real glyph metrics were
obtained three independent ways, agreeing to 0.3 µm. The current model
**over-reserves width** (median 18%, max 87%) and **under-reserves height**:
1270 µm modelled against 1422.4 µm of rendered ink and 2043.1 µm by KiCad's own
text box. But **13 of the 15 recorded field *fallback placements* survive all
three measured quantities, and under KiCad's own box all 15 survive and nine more
appear** — a fallback being a place the search could not find a clear slot and
settled for a least-covered one, which is a degraded drawing rather than a
refused board. This was the hypothesis the pass expected to confirm, and it was
refuted.

**That distinction is worth one sentence because this report got it wrong on its
first draft and the research document had already caught the same slip in its own
head table** — quoting §1 as *"13 of 15 survive all three quantities"* and
replacing it with the unquoted, specific form. A summary that silently promotes
*fallback placements* to *refusals* overstates the blocker, which is exactly the
direction §2 above corrects.

**The layout engine cannot own it as it stands.** ELK will accept a label and
return a coordinate for it, but a `global_label` in a `.kicad_sch` carries
exactly one coordinate — the anchor — so an offset from it has nowhere to go in
the emitted form. That is a fact about the file format, not about where the
anchor may be placed. Of ELK's 22 label-related options, the only label-to-label
spacing is scoped to two labels of the *same* element. And ELK reserves room for
labels when placing nodes, then **routes wires through that space** — 266
label-over-wire crossings in one arm, recorded undiagnosed.

**Typesetting's model transfers in part; its numbers do not.** Knuth and Plass's
1981 paper names bin packing as what their problem would be and **contiguity** as
the only thing that rescues it into a tractable search. Label placement has no
contiguity, so the dynamic-programming search does not carry over. What does
carry over is the framing: badness as a continuous quantity, two grades of it, a
feasibility threshold kept separate from the ranking, a penalty attached to a
choice, and non-refusal on failure. **But the authors declare both their formulae
"quite arbitrary"** and report that nobody can experiment with most of the
parameters — so "adopt the literature's cost function" is not a move that exists.
`G71` already held that a readability threshold here would be this project's
invention wearing a citation; this establishes the citation would not even be
borrowable.

**This generator's own search, measured.** `field-placement.ts` is two things on
two paths: it takes the **first** candidate with no overlap, by a boolean test
with the cost never consulted, and falls through to **best-of-N by weighted
overlap area** only when nothing is clear. Greedy across units, no backtracking
at either level. Over 255 unit placements, **202 are settled by the first clear
candidate and 53 reach the cost.**

**And a confirmed defect in KiCad itself.** `chooseSideForFields` seeds its
selection from the **colliding** sides and carries that seed into the loop
ranking the surviving ones, so it can place fields on a side it has just graded
as colliding while a clear side remains. The file's own header comment says the
colliding sides are *"sifted out"* — so the code departs from its own documented
specification, twelve lines from the top. Not reported upstream; `G267` holds it.

## 4. What this means for the mandate

`CLAUDE.md` names five output classes. Measured at this commit:

| class | state |
| --- | --- |
| topologies | **works** — models for every circuit, validated |
| schematics | **0 of 11 boards**, for the four causes in §2 |
| bench-buildable perfboard | **works, 11 of 11**, built from |
| THT PCB fit to send out | **does not exist** |
| SMD PCB fit to send out and assembled | **does not exist** |

The schematic class is still the cheapest of the three undelivered ones and the
same pipeline shape as the two expensive ones — place, route, annotate, grade.
`G259` is the board-by-board scoreboard.

## 5. What is yours to decide

Three questions were reserved to the owner and the research deliberately stopped
short of each. **No agent answered any of them. He answered all three himself on
2026-10-23** — declining the form the first was asked in, electing on the second,
and answering the third in a formulation none of its three options offered — and
**delegated one design decision that followed.**

**Taken together his three answers are one policy:** draw the sheet, measure the
overlap, drive it down under KiCad's own geometry, and where it cannot be driven
to zero, say so on the drawing. **Production beats legibility and the cost is
disclosed.** None of it is built.

1. ~~**How much overlap is acceptable in a drawing?**~~ **ANSWERED 2026-10-23,
   `G260`.** His words: *"I would rather give guidance to minimize overlap
   rather than give a hard threshold."* **There is not going to be a threshold**,
   so the entry's prohibition on inventing one is now permanent rather than
   provisional — and the precondition `G260` had added, that a sheet must exist
   before he could judge one, is dissolved, because a directive to minimise needs
   no sheet. **The consequence is that the refusal is wrong, not merely strict:**
   a quantity cannot be driven down inside an artifact the tool declines to
   produce. That is also the only reading consistent with §3's measurement that
   none of seven tools refuses, and it is the framing §6 found transfers from the
   typesetting literature — badness as a continuous quantity, a penalty attached
   to a choice, non-refusal on failure. He arrived at it independently of both.
   **AND THE MEASURE THAT FOLLOWED IT WAS DELEGATED:** *"re: the measure—take
   the least dumb choice."* Chosen and recorded in `G260`: **the sum, over every
   text item, of its obscured area divided by its own area** — scale-free, zero
   when clean, one fully-buried item contributing 1.0. Not a pair count, which
   has no gradient; not raw area, which prefers burying one label to nicking
   three. **No weights are invented** (`G71` says none are published), so the
   per-obstacle-class breakdown is reported beside the scalar rather than folded
   into it.
2. ~~**Which of the three measured text-geometry quantities governs a
   collision?**~~ **ANSWERED 2026-10-23, `G265` clause 4.** His words: *"default
   to kicad as prior art"* — so **`EDA_TEXT::GetTextBox` governs**, the strictest
   of the three, taking the recorded population from **15 to 24**. It is the only
   one of the three that agrees with the tool that will render and edit the file.
   **His two answers compose well:** electing the strictest ruler would have made
   *more* boards refuse under a gate, and merely means the number starts higher
   under a minimisation. It also fixes the rectangle both of `G260`'s areas are
   computed from, so **the overlap measure is now fully specified.** Two traps
   come with it, both already measured: the elected box is sized with a pen KiCad
   does not plot with, and any future measurement of it taken through SVG export
   is wrong, because SVG omits a global label's outline.
3. ~~**Should the two grades of badness be declared explicitly?**~~ **ANSWERED
   2026-10-23, `G260`** — and in a form none of the three options put to him.
   His words: *"Complete failure is worse than sub-optimal schematic layout. One
   option is to add a note to the drawing to explain the collision if there
   really is no way to solve the problem."* So **the prohibition is not on the
   geometry, it is on the SILENCE**: nothing is never-drawn, but some things are
   never drawn *undisclosed*. A veto is permitted only where it does not stop a
   schematic being produced, and where no placement avoids a collision the escape
   is to draw it and say so on the sheet. **This unblocks the one approach of the
   eighteen that could move the board count** — §7.1 row 14, whose yield §7.1
   recorded as unmeasured on purpose *because its precondition was this
   decision*. The yield is still unmeasured. **Not covered** (the controller's
   reading, for correction): the six boards whose *circuit* fails validation, and
   the missing-junction class — a missing junction makes the drawing **wrong
   about the circuit** rather than crowded, and a note saying so would be a
   drawing documenting its own incorrectness.

**All three are now answered, and nothing is built.** The refusal he overruled is
still in `checkLayout`; nothing minimises; nothing annotates.

A fourth is not a research question but needs your call: **commit `fc71fcc`
carries a `Co-Authored-By: Claude` trailer and a session link**, against the
standing rule. It is pushed, with 205 commits on top of it.

## 6. What the investigation did not establish

- **Every clearing count is ruler-dependent.** "Orientation alone clears 5 of 12
  blocks" was measured under the production text model only, and §1's own
  survivor counts say such verdicts are *expected* to move under the other two
  quantities. The qualitative result — that the four freedoms exist — does not
  depend on the ruler.
- **Nothing here claims any candidate placement is legible.** The measurements
  are of overlap, not of readability.
- **The joint space over more than two labels was not exhausted**, and wire
  rerouting was swept in one bounded form.
- **The order sweep is bounded where it matters.** All 36 exhaustively swept
  blocks have zero fallback placements; all 53 fallbacks live on the 12 blocks
  too large to exhaust. So the order-wise optimum is exact where there is nothing
  to measure and an upper bound everywhere it counts.
- **Re-walking the placement order is not free**: the worst order gives 54
  fallbacks against production's 53.
- **One behaviour shape has no primary source.** A commercial silkscreen placer
  reportedly *places what it can and logs what it could not* — the one shape none
  of the seven tools exhibits, and the direct alternative to refusing. It could
  not be retrieved (403, login wall, dead DNS) and is recorded as explicitly not
  evidence in `G268`. TeX does the same thing, and that *is* citable — an overset
  line plus an error message encouraging corrective action.

## 7. One thing worth saying about the method

The pass produced sixteen distinct mechanisms by which a check looked green and
established nothing — a tautological assertion, a control returning the
treatment's answer, a population inherited from the artifact under test, a grep
for a paraphrase of the quotation it sought, and others. They are catalogued in
[`false-greens.md`](false-greens.md).

Two are worth knowing here because they are cheap and recur. **A figure published
without the convention it was measured under is not re-derivable** — this pass
published byte counts that were character counts, a median nobody could
reproduce, and pixel geometry that was a property of one renderer. And **a
document nobody rendered is a document nobody read**: the solution-space table,
the artifact the whole pass exists to produce, laid out with its grade column
clipped off the right-hand edge of the page. Six reviewers and a controller read
it as source and none of us noticed, which is why this repository's rule is to
render the output rather than reason about it.
