Task 1 review: Real text metrics, and how wrong the current ruler is
====================================================================

Reviewed at `fcc104e`, worktree `/Users/orion/work/audio-circuits-work/pultec-modularize`,
branch `feature/schematics-tooling`. Diff `1635fd4..fcc104e`, 4 commits, 14 files.
Both repositories were `git status --porcelain` empty before this review and are
empty after it. Nothing was committed and nothing in either tree was modified.

Two verdicts
------------

**SPEC COMPLIANCE: PASS.** Every step of the brief is done, driven, and pasted.
Step 0's three quantities are separately measured and none is elected. Step 1's
glyph set is driven. Step 2 reports which of the three routes worked - all three
- and what each could and could not yield. Step 3's error table is over the
repository's own 264 strings with the distribution and both extremes, not an
average. Step 4 re-takes G239, the jumper, G260's fifteen and the three blocked
blocks once per quantity. Step 5's §1 and the register amendments are committed,
old figures left visible. Step 6's commit split is as instructed. No code outside
the probe changed; the one production file is `tools/schgen/port-manifest.json`,
which is ruled and is not a finding. Nothing under `boards/` is touched. No AI
attribution anywhere - messages, authors, committers, trailers, or diff content.

**TASK QUALITY: PASS, with one Important finding.** This is the strongest
evidentiary work I have reviewed on this branch. Every headline figure reproduced
exactly when I re-drove the probe, and the one claim I attacked with an
independent reimplementation came back to the nanometre. The Important finding is
a dead function in the committed probe whose comment asserts a cross-check that
does not run - the one place in 1904 lines where something looks like a passing
check and is not.

The five named attacks
----------------------

### 1. "All three routes worked and they agree to 0.0 / 0.3 / 1.5 um" - attacked this way, it HOLDS

The suspicion was that two routes share a code path. They do not, and I proved it
by building a third.

**What the code actually does.** Route 1 parses the pinned `newstroke_font.cpp`
in TypeScript (`newstroke.ts`). Route 2 shells out to KiCad's own Python
interpreter and calls `pcbnew.PCB_TEXT.GetTextBox` and `GetEffectiveTextShape` -
the compiled C++ binary, with its own compiled-in font table
(`kicad-box.py`, driven by `probe.ts:runtimeBoxes`). Route 3 runs `kicad-cli sch
export svg` and `export pdf` over schematics built by
`lib/schgen/render/emit-items.ts` itself and reads the rendered geometry
(`svg-probe.ts`, `pdf-probe.ts`). No shared implementation exists between the
three.

**The decisive drive.** I wrote my own parser of `/tmp/newstroke_font.cpp` and my
own transcription of `GetTextBox` and the ink extents, in Python, without reading
the implementer's numbers into it, and compared mine against route 2's binary
over fifteen strings spanning the corpus:

```
REVIEWER'S INDEPENDENT route1 vs route2 worst box-width disagreement: 0.000000 um
REVIEWER'S INDEPENDENT route1 vs route2 worst ink-width disagreement: 0.001524 um
```

**And the agreement discriminates**, which is the part that matters:

```
NEGATIVE CONTROL: the same comparison with INTER_CHAR = 0.25 instead of 0.2
worst disagreement under the wrong constant: 63.5 um  (so the test DISCRIMINATES)
NEGATIVE CONTROL 2: route 2 against the CURRENT MODEL length*GRID
worst disagreement, length*GRID vs pcbnew: 6430.1 um
```

So a single wrong constant, or a single mis-decoded glyph, would have shown. The
0.0 um is not an identity; it is a 264-string agreement between a TypeScript
transcription and a compiled binary that could have disagreed at any string.

**One thing worth knowing that the report does not say.** The 0.0 um on the box
width is *exactly* zero nanometres for all 264 - the probe's `worstBox.text` is
still its sentinel `""`, and the corpus contains no empty string (driven: 0 of
264 rows is `""`). The ink figure is not exact: it is 0.0015 um rounded to one
decimal. Both are far below anything physical. See Minor 6.

**What rests on fewer routes than a reader might assume, honestly stated in the
document already.** The error table's and Step 4's three columns are all computed
from route 1's glyph table in TypeScript - Q2 adds route 3's two fitted placement
constants, Q3 adds the transcribed `GetTextBox` arithmetic. Routes 2 and 3 are
validators, not the source of the 264x3 figures. That is the right architecture
and §1.1 says so; and because `GetTextBox width = advance_sum - INTER_CHAR*size
+ 2*inflate`, the exact 264-string agreement with `pcbnew` pins the advance sum
itself, so Q1 is validated too even though no route exposes a raw advance.

**Route 3's constants are fitted, and still validated.** `fieldLeadX` and
`fieldBaselineY` are solved from one row (`R100 left rot0`), so that row agrees
with itself by construction. The 0.3 um worst-edge disagreement is reported on
`IIIIIIIIII left rot0` - a different row - and seven other rows also had to
agree. Not circular.

### 2. "Too small for 70 of 264 against KiCad's box, and height is what moves the counts" - attacked this way, it HOLDS

Re-derived from my own run of the probe and from my own parse of its 264-row
table:

```
estimate / EDA_TEXT::GetTextBox: ... the estimate is SMALLER than this quantity for 70 of 264 strings
estimate minus EDA_TEXT::GetTextBox: ... widest UNDER-estimate 524.6 um (0.41 grid steps) on "100mH"
line HEIGHT: current model 1270.0 um; rendered ink 1422.4 um for "R100"; EDA_TEXT::GetTextBox 2043.1 um
```

My independent parse: exactly 70, and **every one of the 70 is between 1 and 5
characters long** - so the document's "every one of those is a short string of
wide glyphs" is not rhetoric, it is the data. Worst six are the `NNNmH`
inductance values at -524.6 um; the heights reproduce; `pcbnew` independently
returns 2043.113 um for a 1.27 mm line.

**Height is what moves the counts, and the advance column is the decomposition
that drives it.** The advance quantity changes width and leaves height at `GRID`:
the count goes 15 -> 13. Ink and box change width *and* height: 20 and 24. Under
the box the width is *narrower* than the model at the median (ratio 1.051) and
the count still grows by nine, which can only be height. The three quantities are
within 0.63 grid steps of each other in width (driven) and 44% apart in height.
The inference is as driven as it can be made without a fourth ruler, and the
fourth ruler is the advance column.

**The pen discrepancy does NOT explain the 2043.1, and the report does not say
so either way.** I drove the counterfactual:

```
pen 158750 nm -> GetTextBox height 2043.1 um
pen 152400 nm -> GetTextBox height 2020.8 um
```

So the 158.75-vs-152.4 pen accounts for **22.3 um of the 773.1 um** by which
KiCad's box exceeds the model - 2.9%. The bulk is the `1.5 x thickness` inflation
on each side (476.25 um) and the 17% `fudgeFactor` (296.9 um). §1.4 gives the
formula so a reader *can* derive this, and says the difference "reaches no
conclusion here", but neither the document nor G265 nor the report states the
contribution. Minor 2.

### 3. "Thirteen of fifteen collisions survive all three quantities; none is an artefact of the ruler" - attacked this way, it HOLDS, and the arithmetic is internally consistent

Re-derived the whole table from my own run:

```
TOTAL                                      15         13         20         24
  glyph advance sum              survived 13 of 15; vanished 2; NEW under this quantity 0
  rendered ink                   survived 14 of 15; vanished 1; NEW under this quantity 6
  EDA_TEXT::GetTextBox           survived 15 of 15; vanished 0; NEW under this quantity 9
```

**Each row closes:** 13 = 13 + 0; 20 = 14 + 6; 24 = 15 + 9. And 15 = 13 + 2
vanished = 14 + 1 = 15 + 0. No two rows of that table are in conflict.

**"13 survive all three" needed set algebra, not addition, and I did it.** I
extracted the fallback keys per quantity and intersected them:

- current model's 15, advance's 13, ink's 20, box's 24 (counts match);
- `advance \ ink` is **empty**; `advance \ box` is **empty**;
- so advance's 13 are a subset of both larger sets and the three-way intersection
  is exactly 13. The claim is literally true, not an addition that happens to
  land on 13.

The two that vanish under the advance are `pt2399-core/pt-core C10#1` and
`C9#1`; ink loses only `C9#1`.

**The drawn-text half also closes.** Under the current ruler the probe finds
eight overlapping pairs; I checked them one by one against the three blocks'
own refusal strings, which the probe prints beside the table: `ob-buffer` 1,
`tp-leg-emitter-bypass` 1, `tp-stage` 6 distinct pairs (its refusal lists eight
items, two of which are the same pair named from both ends). Four survive and
four vanish under every quantity, and the four that vanish are the three
`label BASE` pairs plus `label BYPASS_CAP overlaps body of Q1#1` - exactly as
the report says. The blocking pair of each of the three blocks survives under
all three.

### 4. "G239's five-of-eleven is ruler-independent, with a positive control at 5 of 5" - attacked this way, it HOLDS, and the control discriminates

```
Jumper:Jumper_2_Open   ... inside slots that fit: 0 of 5  (all four rulers)
Device:C               ... inside slots that fit: 0 of 5  (all four rulers)
Device:C_Polarized     ... inside slots that fit: 0 of 5  (all four rulers)
Audio:PT2399           ... inside slots that fit: 5 of 5  (all four rulers)
```

**The control is a real discriminator, not a control that returned the
treatment's answer.** The PT2399 returns the opposite value (5, not 0) from the
same code path, the same four rulers and the same `insideSlotsThatFit` predicate
- so the 0-of-5 is a property of the three small bodies and not of the
measurement. And it *could* have moved: the grown pair grows from 2540.0 to
3313.1 um between the model and KiCad's box, a 30% increase, against a
30480 um body; a body a tenth that size would have flipped it. The failure the
brief named - a control that answers 0 of 5 like the treatment - did not happen
here.

The direction is also right: the finding gets *stronger*, because the quantity
G239 turns on is height and real geometry makes a line taller (1270 -> 1422.4
ink -> 2043.1 box), so the headroom it was short by is larger than it recorded.

### 5. "I elected nothing" - attacked this way, it HOLDS

I swept the 501-line document, the three register entries and all 1904 lines of
the probe for an implicit election. What I looked for and did not find:

- **No default parameter picks a quantity.** `advanceGeometry`, `inkGeometry` and
  `kicadBoxGeometry` all take their inputs explicitly; `inkGeometry` requires the
  measured constants with no default. The only defaults in the probe are
  `size: Um = TEXT_SIZE`, which is the text size, not a ruler.
- **No primary-output asymmetry.** `probe.ts` builds `geometries = [estimate,
  advance, ink, box]` and prints every table with one column per quantity. The
  one single-quantity line - `line HEIGHT` - prints the model, the ink and the
  box together.
- **No sentence calls one of them "the" measurement, the correct one, the
  authoritative one, or recommends one.** Grepped for all of those shapes;
  nothing. G265 clause 4 goes the other way: *"Until he does, no agent may pick
  one, and a mechanism that quietly adopts one by writing a new `textWidth` has
  made the election."*
- **The one thing that looked like an election is not one.** `inkGeometry`'s
  label box is built from `labelOutlineExtent`, which uses `GetTextBox`'s width.
  That is correct rather than an election: KiCad sizes the drawn outline polygon
  from `GetTextBox` whatever ruler you measure text with, so the ink of the
  outline *is* that polygon. Commit `fcc104e` had already tightened the comment
  to say "GetTextBox's width" rather than "text width" for exactly this reason.

**The one place a single quantity carries a headline number** is G239's jumper
bullet - *"7.2x becomes 6.3x"* - which is the ink alone where every other figure
in that amendment carries all three. It names the quantity, and all three agree
in direction and to within 4% (6.43x advance, 6.28x ink, 6.53x box), so it does
not elect anything consequential. Minor 4.

Also verified
-------------

**"Strokes may extend outside their nominal advance" is false for this glyph
set - CONFIRMED, including the membership half.** Driven, not just the overhang:
the probe printed all 64 corpus characters with advances, **zero** of them
flagged `NOT IN THE TABLE`, and the printed 64-character set contains no
backslash. Over the whole printable-ASCII range the overhang count is 1 and the
glyph is `"\\"`. So both halves hold: exactly one glyph overhangs, and it is not
in the set.

**`kicad-cli sch export svg` omits a global label's outline while PDF draws it -
CONFIRMED by my own drive**, on the identical 5-label schematic the probe wrote,
exported twice by me:

```
SVG: total paths 2094
SVG: paths with >=5 points: 3        <- the title block and the two border rectangles
SVG: SEVEN-point closed paths (a global-label outline shape): 0

PDF: total paths 92
PDF: SEVEN-point paths (label outlines): 5
    along  4645.3 um  across 2540.8 um
    along  7185.3 um  across 2540.8 um
    along  7185.3 um  across 2540.8 um
    along 15289.1 um  across 2540.8 um
    along 19280.4 um  across 2540.8 um
```

Five labels, five outlines in the PDF, none in the SVG, and the along/across
figures are the ones §1.6 publishes. **G265 clause 1's precision claim also
drives**: the only paths with five or more points on a probe sheet are three, and
they are the title block (x 1069-1177 mm) and the two border rectangles. A later
task building an SVG-based measurement would under-report every label; this
finding is worth what it says it is worth.

**The pen discrepancy - CONFIRMED.** `pcbnew` returns
`effective_pen_nm = 158750` for 1.27 mm text; the SVG's own `stroke-width` is
152.4 um. Both reproduce.

**The probe is committed, pins the font blob, and refuses any other - the
refusal DRIVEN three ways.**

- A one-byte-longer copy of the pinned blob: exit 1, and the message names both
  hashes, the tag, the URL, the ruling, and both remedies.
- A path with no file: exit 1, with the `curl` line to fetch it.
- The control for both: the pinned blob runs green to completion (exit 0, 571
  lines of output). So the refusal is not a probe that refuses everything.

**`docs/known-gaps.md` against the register standard - PASS.** G239 and G260 are
amended with the old figures left visible and a header saying what the amendment
does and does not do. G265 is new and carries all five clauses the report claims:
the SVG hole, the pen, two undiagnosed residuals recorded undiagnosed, the
election as the owner's, and the one production file as a disclosure. Each has
`Found` / `Evidence` / `Verified` / `Why it is open` / `What would settle it`;
`Verified` says **CONFIRMED** and says why (*"this writer wrote the probe, drove
it, read KiCad's source and looked at the rendered PDF"*); the criteria are
separated from the mechanisms and the one mechanism offered is marked
**UNTRIED** (*"whether upstream considers the SVG behaviour a defect was not
investigated, and no KiCad issue was searched for"*). The evidence is checks that
could have failed, and I failed two of them deliberately (the blob refusal) and
re-passed all the rest.

**Controller ruling R1 - COMPLIED WITH, and visibly.** The G260 amendment is
confined to the entry's arithmetic and closes with: *"It also does not re-take
this entry's other subject, which is that nothing automated reads the fallback
report; that is unchanged and still open below."* Nothing in the amendment says
anything about what other tools do on failure. That boundary is stated, not just
observed.

**The full suite - CONFIRMED GREEN, and the timeout is load.**

```
SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen
typecheck exit=0
 3758 pass
 0 fail
 43379 expect() calls
Ran 3758 tests across 350 files. [150.25s]
```

3758 / 0 / 350, which is the reported figure. The disclosed first-run timeout was
`tests/guide/print-pdf.test.ts` at 5076 ms against bun's 5000 ms default. It is
load and not a regression, on two grounds: it passed in my clean run, and the
test's import graph is `tools/guide/browser-install.ts` and
`tools/guide/print-pdf.ts`, neither of which this diff touches - the diff is two
docs, one new doc, nine new probe modules and nine lines of JSON. The failing
test spawns a real headless-browser HTML-to-PDF conversion, which is exactly the
kind of thing a busy machine pushes over a 5-second budget.

**Scope - CLEAN.** `boards/` 0 files. The only production file is
`tools/schgen/port-manifest.json`, +9 entries appended to `handWritten`, which is
ruled under R6 and is correct on its merits: the nine files are new and were
never ported, so `handWritten` is their true provenance. No other production
change exists in the diff.

**Attribution - CLEAN.** Four commits, author and committer `oletizi
<oletizi@mac.com>` on all four, zero git trailers, and a grep of all four
messages plus both identities for `co-authored|claude|anthropic|generated
with|session_|noreply@anthropic|robot emoji|opus|sonnet` returns no hits. The
diff *content* is also clean of attribution.

Findings
--------

### IMPORTANT

**I-1. A dead function in the committed probe asserts a cross-check that does not
run. CONFIRMED.**

`tools/schgen/text-metrics/svg-probe.ts:170`, `svgTextLengths`, carries this doc
comment:

> *"KiCad's own declared advance per drawn string: the `textLength` of the
> invisible `<text>` element `kicad-cli` writes beside every stroked string, in
> um. **A FOURTH independent reading of the same geometry, free with the export,
> and `probe.ts` reports it against the font source's advance sum.**"*

`probe.ts` does not report it. It does not import `svgTextLengths` - it imports
`measureRows`, `writeProbeSheet`, `PAPER_HEIGHT_MM`, `RowExtent` and `RowSpec` -
and a grep across `tools`, `lib`, `tests` and `docs` finds the symbol at exactly
one site, its own definition. The comparison the comment describes has never
been performed.

**Failure scenario.** Task 2 or a later design task reads that comment while
deciding how much to trust the advance table, concludes that a fourth
independent route - KiCad's own declared `textLength`, which is the most direct
statement of advance available anywhere - corroborates it, and treats the advance
sum as quadruply confirmed. It is triply confirmed, and that fourth confirmation
is the one that would have been free. This is the eleven-routes-to-a-false-green
class exactly: a check that looks like it passed because its description says it
runs. `CLAUDE.md`: *"A skipped check must never look like a passing one. If a
guard cannot run, say so loudly."* And *"Supersede means delete."*

**What settles it.** CRITERION: no prose in the probe describes a comparison that
`probe.ts` does not perform. MECHANISM, UNTRIED - either wire `svgTextLengths`
into `probe.ts` as the fourth reading the comment promises (it is about four
lines, and it would be a genuinely independent check of Q1, which currently has
none of its own), or delete the function and its comment. I did not try either.

### MINOR

**M-2. The pen discrepancy's contribution to the 2043.1 um height is nowhere
quantified, and a reader could discount the height finding because of it.
CONFIRMED.** Driven above: the plotted pen would give 2020.8 um, so the
discrepancy is 22.3 um of a 773.1 um excess - 2.9%. §1.4 records the discrepancy
and says it "reaches no conclusion here"; G265 clause 2 records it as a trap. But
the height finding is the one with the most consequences in the whole section,
and a sceptical reader who notices that KiCad sizes the box with a pen it does
not draw with has a natural objection - *"then 2043.1 is inflated"* - that one
sentence would close. **Failure scenario:** the owner, making the election G265
clause 4 reserves to him, discounts the box's height as a KiCad bookkeeping
artefact and elects the ink, on a suspicion the measurement already refutes.
CRITERION: §1.4 or G265 clause 2 states how much of the 2043.1 the pen choice
accounts for. MECHANISM, UNTRIED: the one-line counterfactual I ran.

**M-3. `3333.75 um` is a figure in the register that no run printed. CONFIRMED.**
G265 clause 1 and §1.6 give the label-outline constant as 3333.75 um. The probe's
own transcription, which applies `KiROUND` at micrometre resolution, computes
3333.003; the PDF measures 3334.5 for the `"A"` label (4645.3 - 1310.8). 3333.75
is the unrounded hand derivation (952.5 + 158.75 + 2222.5) and sits between the
two. The discrepancy is 1.5 um, immaterial physically - but the plan's standard is
*"Every number driven in the same action and its output pasted. A number that
cannot be driven is not written."* **Failure scenario:** a later task takes
3333.75 as a measured constant, finds the probe computes 3333.003, and spends time
reconciling a figure that was never driven. CRITERION: every micrometre figure in
the register is one a pasted run printed, or is marked as a derivation from a
transcribed formula. MECHANISM, UNTRIED: quote 3334.5 from the PDF, or say
"3333.75 by the source formula, 3334.5 as the PDF draws it".

**M-4. G239's jumper bullet restates a headline ratio from one quantity where the
rest of the amendment carries three. CONFIRMED.** *"7.2x becomes 6.3x"* is the
ink. The other three rulers give 6.43x (advance) and 6.53x (box) against the
model's 7.22x. It names the quantity and the conclusion is identical under all
three, so this is presentation rather than election - but it is precisely the
shape attack 5 was told to look for, and it is the only instance.
**Failure scenario:** a reader quotes "6.3x" as the corrected figure in a later
document, and the number silently carries an election the task was forbidden to
make. CRITERION: no restated figure in an amendment rests on one measured
quantity where all three are available. MECHANISM, UNTRIED: give all three, as
the very next bullet in the same amendment already does for `Device:C`.

**M-5. Three further unused exports in the committed probe. CONFIRMED by grep.**
`metrics.ts:117 inkExtent`, `metrics.ts:51 boxPenWidth`, and `geometry.ts:215`'s
re-export of `labelExtent` have no callers anywhere. None of them claims
anything false, so this is housekeeping rather than a false green - but
`CLAUDE.md`'s *"Supersede means delete"* covers a pattern nothing uses as much as
one that was replaced. **Failure scenario:** a later task calls `inkExtent`,
which takes `drawnPen` as a bare argument with no connection to the measured
constant, and gets an ink extent computed from a pen nobody measured. CRITERION:
the probe exports nothing it does not use. MECHANISM, UNTRIED: delete the three.

**M-6. Two quoted agreement figures are less precise than they read, in opposite
directions. CONFIRMED.** `worst disagreement 0.0 um on ""` is quoted verbatim in
§1.1 and in the report; the `""` is the comparison loop's sentinel initial value,
not a corpus string (driven: the 264 rows contain no empty string). The result is
actually *stronger* than the quote suggests - the disagreement is exactly zero
nanometres for all 264, which I reproduced independently at 0.000000 um. The
companion line, `worst disagreement 0.0 um on "TestPoint"`, *is* a real row and
its 0.0 is a `toFixed(1)` rounding of 0.0015 um. **Failure scenario:** a reader
takes `""` for a measured string and wonders what an empty string's text box
means, or takes the ink agreement for exact when it is 1.5 nm. Pasting output
verbatim is the right practice and I would not want it changed; one line of
gloss - "the `""` is the loop's sentinel; no string disagreed at all" - closes it.
CRITERION: a quoted figure's precision is not read as tighter than the format
prints. MECHANISM, UNTRIED: the gloss.

### Nothing Critical

I did not find a Critical finding, and I tried the five routes the brief named
plus an independent reimplementation of the one claim most likely to be an
artefact.

What I drove versus what I read
-------------------------------

**Drove (commands run, output observed):**

1. `bun run tools/schgen/text-metrics/probe.ts --font /tmp/newstroke_font.cpp` at
   `fcc104e` with a clean tree - exit 0, 571 lines. Every headline figure in the
   report and §1 reproduced: 11 boards / 1086 strings / 498 reaching the drawing;
   64 and 50 character glyph sets; 0.0 / 0.3 / 1.5 um; 70 of 264; 1270 / 1422.4 /
   2043.1; 15 / 13 / 20 / 24; 13 / 14 / 15 survivors; 0 / 6 / 9 new; G239 0-of-5
   and 5-of-5; the control line `CONTROL PASSED: over 10 laid-out blocks`.
2. An **independent Python reimplementation** of route 1 (my own font parse, my
   own `GetTextBox` and ink arithmetic) against route 2's `pcbnew` binary over 15
   corpus strings: 0.000000 um on box width, 0.001524 um on ink width. Plus two
   negative controls (wrong `INTER_CHAR` -> 63.5 um; `length*GRID` -> 6430.1 um).
3. **Set algebra** over the extracted fallback keys: counts 15/13/20/24 confirmed,
   `advance \ ink` and `advance \ box` both empty, so the three-way intersection
   is exactly 13.
4. **My own parse of the 264-row error table**: 70 under the box (all of length
   1-5), 0 under the ink, 11 under the advance; `ink < advance < box` with **zero
   violations** over all 264, which §1.8 asserts as "always" and no pasted probe
   line establishes.
5. **The pen counterfactual**: 2043.1 um at the box's pen, 2020.8 um at the
   plotted pen.
6. **SVG versus PDF** on the identical 5-label schematic, exported twice by me: 0
   seven-point paths in the SVG against 5 in the PDF, with the along/across
   figures matching §1.6 to 0.1 um; and exactly 3 paths of >= 5 points in the
   SVG, being the title block and the two border rectangles.
7. **The font-blob refusal**, three ways: tampered blob (exit 1, both hashes
   named), missing blob (exit 1, with the fetch line), pinned blob (exit 0 - the
   control).
8. **Glyph coverage**: 64 glyph rows printed, 0 `NOT IN THE TABLE` substitutions,
   no backslash in the corpus set, printable-ASCII overhang count 1.
9. **Dead-code greps** across `tools`, `lib`, `tests`, `docs` for
   `svgTextLengths`, `inkExtent`, `boxPenWidth`, `labelExtent`.
10. **`bun run typecheck`** (exit 0) and **`bun test`** with `SCHGEN_SOURCE` set:
    **3758 pass / 0 fail / 43379 expect() calls / 350 files / 150.25 s**.
11. **Commit metadata and diff scope**: 4 commits, `%(trailers)` empty on all
    four, author and committer `oletizi` on all four, attribution greps over
    messages and diff content clean; `boards/` 0 files; `port-manifest.json` the
    only production file.
12. **`git status --porcelain`** on both repositories, before and after - empty
    both times.

**Read (not independently driven):**

- The brief, the implementer's report, and all 501 lines of
  `docs/schematic/text-handling-research.md`.
- The G239 and G260 amendments and G265 in `docs/known-gaps.md`.
- All ten probe modules, in full, including the production modules they import
  from (`text-boxes.ts`, `field-placement.ts`, `occupancy.ts`, `power-text.ts`)
  to confirm that only the three text-box functions are replaced and everything
  else is the production code.
- **I did not open KiCad's source at tag `10.0.5` myself.** The `[READ]` marks on
  the eight files are RELAYED from the implementer. What makes that acceptable
  rather than an unchecked citation is that the arithmetic those files are claimed
  to contain is corroborated to zero nanometres by the installed binary over 264
  strings, and by my own independent transcription - a check that could have
  failed and did fail under a deliberately wrong constant.

Suite numbers observed
----------------------

| | observed here | reported |
| --- | --- | --- |
| `bun run typecheck` | exit 0 | (not reported) |
| `bun test`, `SCHGEN_SOURCE` set | **3758 pass / 0 fail**, 43379 expects, 350 files, 150.25 s | 3758 / 0, 350 files |
| probe end to end | exit 0, 571 lines, all figures reproduced | one run, figures as published |
| both repositories | `git status --porcelain` empty before and after | empty |
