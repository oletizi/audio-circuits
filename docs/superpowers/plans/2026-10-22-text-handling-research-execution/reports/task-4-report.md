Task 4 report: how comparable tools handle schematic text that will not fit
===========================================================================

**Status: DONE_WITH_CONCERNS.** The concerns are in the last section and none of
them is a defect in the deliverable; they are limits of the evidence and two
places where a reviewer may reasonably want more.

**Commits**, both on `feature/schematics-tooling`, both pushed, both with clean
messages (no `Co-Authored-By`, no `Claude-Session:`, no "Generated with" footer,
no session link):

| sha | what |
| --- | --- |
| `bc477fcdc73036a3fac105ef269a790b5adf6821` | §4 appended to `docs/schematic/text-handling-research.md`; **G260** amended in `docs/known-gaps.md`. 764 insertions, 0 deletions. |
| `fe0e7b8` | §4 round 2: the "nothing moved" claim driven and pasted rather than asserted; every file read now hashed; the block accounting corrected to six and made falsifiable. |

**Suite:** `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
→ **3785 pass / 0 fail / 43495 `expect()` across 352 files** (149.90s). HEAD was
3785 / 0 / **43489** / 352. **The +6 is exactly the six fenced blocks §4 adds**,
each declared not-output and named by `document-pastes.test.ts`'s `notOutput`
loop at one `expect()` apiece. §4.12 states that figure, so the claim can fail.

**Typecheck:** `bun run typecheck` → clean (`tsc --noEmit`, no output).

**Working trees:** `git status --porcelain` empty in this repository and in the
read-only sibling `/Users/orion/work/pedals-work/digital-pedal-platform`.

**Pure insertion property kept.** Against the branch base `4fe4b41`, the combined
diff of both files has **0 deletion lines** (`git diff -U0 4fe4b41 | grep -c
'^-[^-]'` → 0): 58 lines into `known-gaps.md`, 755 into the research document.
§1, §2 and §3 are untouched. Round 2 rewrote text inside §4 only.

**No dependency added.** No `package.json` change, no lockfile change, no vendored
copy. Everything installed or cloned lives in the session scratchpad.

Which tools were RUN as opposed to read
---------------------------------------

**RAN (2 of 6):**

- **netlistsvg** at clone commit `d3518f1b5c996a876b72a1a984bb39d3572c47dc`.
  Dependencies with `npm install --legacy-peer-deps` in the scratchpad clone; the
  run executes the clone's **committed `built/`** via `node bin/netlistsvg.js`,
  so the run is the compiled form of the `lib/` that was read. Not recompiled -
  the pinned TypeScript cannot parse the newer `@types` the install pulled in, and
  §4.0 says so. **The npm `1.0.2` tarball was tried first and discarded**: it
  predates this commit although it declares the same version, and lacks the
  bus-width edge labels entirely, so reading `master` and running the tarball
  would not have been the same program. Four arms over
  `test/analog/resistor_divider.json`.
- **schemdraw 0.23**, `pip install schemdraw==0.23` into a scratchpad venv
  (Python 3.14.6), `ziamath` NOT installed. `diff -rq` against the clone
  (`e3cb529`) finds three differing files, all post-release; **the two files the
  claims rest on are byte-identical between clone and wheel** by SHA-256. Two
  arms, control and treatment.

**READ only (2 of 6):** lepton-eda at `fd160f00b83480aee9f5c7d420468115d2065808`
(and the blob re-fetched by raw URL from GitHub and hashed to the same value, so
the figure is not a clone artefact) and xschem at
`36e0eab33b0c7e02e6f99c54b0a39d42231039fb`. Both are C/GUI programs; Guile is not
installed here either, so lepton's Scheme could not be evaluated. §4.0's second
table lists **fifteen files** with the SHA-256 of each blob opened.

**DOCUMENTATION only (2 of 6):** Altium Designer and OrCAD Capture. Every
quotation was taken from the **saved bytes** of the page or manual, by extracting
the plain text and printing the lines containing the term - never from a
search-result snippet. The task brief named this as the worst available failure
and the branch has a recorded instance of it.

The conclusion, and its N and M
-------------------------------

**N = 6, M = 0.** Of the six tools examined, **zero refuse to produce the drawing
because text would not fit.** Adding §3's KiCad makes it **zero of seven**, and
KiCad is the one that matters most because `make check` invokes it on this
repository's output on every run.

Per tool, with how it was established:

1. **lepton-eda** `[READ]` - `adjust-pos-to-avoid-collision`'s only exit returns a
   position; `set-default-position` then always calls
   `set-attribute-text-properties!`; **all nine `error` calls in the file are
   malformed-input refusals** (unknown bound name, unknown coordinate, two unknown
   pin directions, three unknown reference strings, odd attribute list, invalid
   alignment). A tree-wide grep for `cannot place|could not place|unplaceable|no
   room|does not fit|refus` returns four unrelated hits.
2. **xschem** `[READ]` - there is no text-collision test to fail. A grep for
   `autoplace|overlap|collid|collision` over `src/*.{c,h,tcl}` returns only
   `warning_overlapped_symbols` and two unrelated hash comments.
3. **netlistsvg** `[RAN]` - four arms, every one exit 0, stderr empty, SVG
   written, including the arm whose text leaves the declared canvas.
4. **schemdraw** `[RAN]` - the colliding arm raises nothing, emits a 1178-byte
   SVG, and both labels are present whole and overlap by schemdraw's own bounding
   boxes.
5. **Altium Designer** `[DOCS]` - overlap is documented as a normal state managed
   by z-order commands; no refusal documented and **no failure semantics specified
   at all**, which §4.6 states rather than inferring.
6. **OrCAD Capture 16.6** `[DOCS]` - the manual documents no designator
   auto-placement, so there is no documented refusal to find.

**The finding that matters, at the narrow scope:** this generator's refusal is
unusual among its closest neighbours. §4.9 says that and nothing wider; §4.10 is a
separate paragraph on what remains unknown, as the plan's Step 4 requires.

The substantive findings, beyond the refusal answer
---------------------------------------------------

**lepton-eda is the only one of the four with a collision model, and it is
narrower and looser than it looks.** One position per row of a 45-row table keyed
by attribute name, pin-side signature and object type; the obstacle set is
**pins and the empty corridor in front of pins only** - no other text, no wires,
no symbol bodies, no page border. On collision it translates once along the
permitted axis, snaps to a 50-unit grid, and **never re-checks**. The corridor
category is a genuinely good idea this repository's obstacle set does not have.

**And the autoplacer that is actually ON by default has no collision avoidance at
all.** All four `refdes`/`value` hooks in `scheme/conf/schematic/deprecated.scm`
are commented out; `place-netname-attribute-handler` is live; and
`get-object-pins` returns `'()` for anything that is not a component, so
`pins-bounds` is null for a net and the adjustment is a **no-op for the one text
class lepton-eda autoplaces out of the box**.

**netlistsvg is a second independent implementation of this repository's own
ruler.** `Cell.addLabels` estimates a label as `width: 6 * text.length`,
`height: 11` - a character count with a fixed per-glyph width, the same shape as
`text.length * GRID` (§1). It then **never reads back the coordinate ELK returns
for a cell label** (`Cell.render` writes only the text into the skin template's
own text node), which is §2.4's finding reached from the other direction: this
repository hands ELK no labels, netlistsvg hands ELK labels and discards the
positions.

**The taxonomy's third row - adjust the surrounding geometry - is not empty for
netlistsvg, and it is the row this repository is emptiest on.** OBSERVED: with
the two symbols in different layout columns, the lower resistor's node moves from
`translate(77,152)` to `translate(173,152)` when its label grows, **96 units, with
five other nodes unmoved.** With the two symbols in one column, all five
transforms are byte-identical between arms. So the label width buys spacing
*between columns* and buys nothing *inside a cell*. §3 records KiCad's one local
repair; this repository has no perturbation of any kind.

**Two behaviours do not fit a row and are recorded as not fitting rather than
widening the taxonomy.** (a) **Growing the canvas around the text** - schemdraw's
figure bbox goes from 1.2 units wide to `-1.494 .. 2.694`, netlistsvg's canvas
from 74 to 173 - which is accommodation, not avoidance: the overlap is unchanged.
A reader who filed it under *adjust the surrounding geometry* would be recording a
repair that did not happen. (b) **netlistsvg's bus-width edge labels mask the
overlap** with a `fill: white` rect behind the text; the taxonomy has no row for
occluding the obstacle instead of moving the text.

**netlistsvg draws text past the canvas it declares itself**, by 3 units in three
of the four arms, because the drawn position comes from the skin template while
the only thing ELK is told is the estimate. **The exact arithmetic was not
determined** and §4.10 says so.

**Two incidental lepton-eda source findings**, both `[READ]`, neither observed:

- **A stray literal `2` at column 1 of line 782** of `autoplace.scm`, inside the
  leftward-offset expression, which Scheme's variadic `-` evaluates as
  `pins-min-x - 2 - attrib-max-x - spacing`. Not cosmetic, because
  `snap-coord-to-grid` floors negatives onto the 50-unit grid: a transcription of
  that function into a throwaway script gives `snap(-100) = -100` against
  `snap(-102) = -150`, one whole grid step. **When it entered was not established**
  - the clone is shallow.
- **An empty movement direction still moves the text.** The table's own comment
  says `mov_dir` is empty when "no movement is allowed"; the zero-offset fallback
  then moves the attribute one grid step right (or up) anyway, and 10 of the 11
  `refdes` rows have an empty `mov_dir`.

**xschem's only text suppression is a zoom threshold, and the exporter's copy is
commented out.** Both `draw_string` implementations return early below ~3 device
pixels (cairo, `draw.c:407`) or below one (`draw.c:489`), and both cull text whose
box is outside the viewport - **keyed on magnification, never on what else is at
that coordinate.** `svgdraw.c:881` carries the same guard commented out, so an
exported file is not subject to it.

**xschem has the one refusal-shaped behaviour in the set and it is about
instances, not text.** `warning_overlapped_symbols` reports coincident instance
bounding boxes, colours them, forces the ERC window open and sets
`exit_code = err ? 10 : 0` - **after the netlist has been written and closed.**
Produce the output, flag the geometry. Offered as a contrast.

**Two corrections to `docs/schematic/text-placement-prior-art.md` §7**, recorded
in §4.6 because that document is read and never rewritten, and its claim was
`[THIRD-PARTY]` from a search extract:

1. Its quotation is *"[n]ine positional styles ... all classed as 'automatic
   positions'"*; the page says **"all of which are classed as"**. The elision is
   marked, so a shortening rather than a misquotation - but the exact sentence is
   now on record from the page's bytes.
2. It attaches the nine styles to **schematic** designator text. They are the
   **PCB** editor's `Position Component Text` command; on the schematic side
   `Autoposition` is a checkbox. Its conclusion survives both corrections, and
   "automatic" is now pinned to what the page says it means - the text follows the
   component, which is not a claim about clearance.

**Altium documents overlap as a NORMAL STATE**, which is stronger than "no
avoidance documented": *"The schematic editor automatically stacks objects, text
and graphics in layers ... therefore, it is possible to place objects so that they
overlap"*, and of the alignment commands *"It is possible to end up with partial
or total overlap of objects."* The words `overlap`, `collid` and `clutter` do not
appear at all on the schematic placed-components page - a grep that could have
matched.

**OrCAD Capture 16.6**: `auto.?position` 0 hits, `designator.*position` /
`position.*designator` 0 hits, `collision|collide|clutter|legib|too long` 0 each,
over **31,433 lines** of `pdftotext -layout` output from the vendor's own manual
(SHA-256 recorded). `overlap` appears 3 times, all about selecting among
overlapping objects. Stated as absence in this document, not as a claim about the
product.

**The one lead that could not be retrieved, and it is the most interesting one.**
OrCAD's and Allegro's **PCB** silkscreen auto-placer is reported to place what it
can and log the designators it could not place legally - *place and report*, a
sixth shape none of the six tools exhibits, and the closest published thing to
what **G260**'s residual asks for. `community.cadence.com` returns HTTP 403 to a
plain fetch, `support.cadence.com` needs a login, and the EMA training page search
pointed at does not resolve in DNS. **A search-engine summary described it; a
summary is not a page anyone opened, so it is recorded as an unverified lead, is
explicitly NOT evidence, and is NOT counted in the N of 6.** What would settle it
is the Allegro/OrCAD PCB Editor manual.

The G260 amendment, and what it deliberately does not touch
-----------------------------------------------------------

**G260 asks two questions and only one is the owner's.** His is *how much overlap
is acceptable.* The amendment fills the other half - what tools in this class do
on failure - with the per-tool table, the grade for each, the empty
*adjust-the-geometry* row, and the unretrieved Allegro lead. It states that the
trade Task 24 made (place the least-covered candidate rather than refuse) **is the
trade all six tools make**, and in the same breath that this is *"a fact about
what is conventional and not an argument that the trade is right here"*, because
that turns on what an acceptable sheet is. It closes nothing: the residual that
nothing automated reads the fallback report is untouched, and so is his question.

I have re-read the amendment specifically for sentences that could be read as
implying a threshold, and there are none - no count, no proportion, no "tools
tolerate up to X". The strongest statement is that refusing is *unusual*, which is
a fact about other tools.

How the §1.11 paste contract was satisfied
------------------------------------------

Six fenced blocks, none of them probe output, each declared and named - the whole
of the 43489 → 43495 move. The standalone checker
(`verify-pastes.ts tests/schgen/text-metrics/probe-run.log`) exits 0 and lists all
six by name under NOT CHECKED.

- **Both `lepton-src` blocks are line-number prefixed and that is declared in
  prose beside each.** The reason is the contract, not tidiness: an unchecked
  block's first non-blank line must not begin with whitespace, and indented Scheme
  does. §3 dedented a C comment by one space; this section numbers instead,
  **because the stray `2` is a claim about column 1 and a dedent would have
  destroyed the evidence for it.**
- **The two run logs share no line with either committed probe log** - 96 distinct
  non-blank lines against 712, zero in common - which matters because a non-`run`
  block sharing a line with a checked log is the relabel dodge the checker refuses
  by name.
- **All six blocks were verified to be contiguous, non-overlapping slices of their
  sources** by a scratchpad script. §4.12 records that this script is **not
  committed and is therefore not a check**, and records that it earned its keep:
  it caught the second transform block's header going stale after its log was
  re-driven, which is exactly the drift the contract exists to catch.

Controls that could have answered differently
---------------------------------------------

- **netlistsvg, one column:** baseline 0 boxes outside the canvas vs long 2;
  five node transforms identical vs five identical (the null result that makes the
  two-column result mean something).
- **netlistsvg, two columns:** short labels put the lower resistor at
  `translate(77,152)`, long labels at `translate(173,152)`, five other nodes
  unmoved in both.
- **schemdraw:** control 0 overlapping pairs vs treatment 1, same elements, same
  default `loc`, only the gap and the strings differ.
- **lepton-eda:** nine `error` calls enumerated and each classified; had any one
  been a "cannot place" refusal the conclusion would have changed.
- **xschem, schemdraw:** collision greps over whole trees that returned only
  unrelated hits.
- **Altium, OrCAD:** term greps over the retrieved pages and manual, reported with
  hit counts, every one of which could have matched.
- **The measurement itself was corrected by its own control.** The first version of
  the netlistsvg measurement compared template-local coordinates and reported two
  "overlaps" between texts in different `translate()` groups. Accumulating the
  group stack removed both. §4.4 records this, because the first version would have
  manufactured a finding.

Concerns
--------

1. **Two of the six were not run, and for those two the conclusion is weaker than
   it reads.** The review's caution binds: a program may reject geometry earlier
   than the function one is reading, clip in a layer one did not open, or fall back
   somewhere else. For lepton-eda only `autoplace.scm` and the hook configuration
   were read; `libleptongui` and `liblepton` were greped, not read. For xschem only
   the text functions in `draw.c`/`svgdraw.c` were read and the Tcl layer was
   greped. **Building either would be the way to close this**, and it was judged
   out of proportion for a research task - but a reviewer who disagrees would be
   disagreeing with a judgement, not with an oversight.
2. **The commercial half is thinner than the open-source half, and the thinnest
   part is the most interesting one.** The Allegro place-and-report behaviour is
   the only shape in the whole task that is neither "overlap" nor "refuse", and it
   is unretrieved. **That is the one gap whose closing could change a row of
   §4.8.** The OrCAD manual retrieved is also 2012; a later Capture may document
   something it does not.
3. **§4 is long** - 755 lines into a document that was already 2369. §1 carries a
   note that three of its subsections are longer than a reader needs, and §4 is
   open to the same complaint. The parts I would cut first if told to are §4.2's
   two incidental findings and §4.3's instance-overlap contrast, both of which are
   there because a later reader cannot re-derive them.
4. **I created no new `docs/known-gaps.md` entry.** The two incidental lepton-eda
   source findings, the netlistsvg canvas shortfall and the unretrieved Allegro
   lead all live in §4 and (for the Allegro lead and the empty geometry row) in the
   G260 amendment. My reading is that the research document is the committed,
   reviewable record for a research task and that §1-§3 set that precedent by
   amending existing entries only. **If a reviewer wants a standalone entry for the
   unretrieved Allegro lead, that is the one I would add**, because it is the only
   finding here that someone might want to act on and that is not already attached
   to an entry about this repository's own behaviour.
5. **One judgement a reviewer should check.** I treated "grow the canvas around the
   text" as **not** an instance of *adjust the surrounding geometry*, and said so
   explicitly rather than filing it. The argument is that the overlap is unchanged
   and nothing was repaired. If a reviewer reads the row more broadly, two more
   tools join it and the row stops distinguishing netlistsvg's node move from
   schemdraw's bbox growth - which is the distinction I thought the row was for.
   **The taxonomy was not altered either way.**

---

Fix round 1
===========

**Status: DONE.** Two Importants and all eight Minors addressed, plus the
reviewer's optional note on source URLs. **Nothing is disputed.** **N = 6, M = 0 is
unchanged** - this round moved no figure in the comparison, and the one figure it
did move was my own `expect()` prediction, which was wrong (see M-8 below).

**Commit:** `a27d3edde780c67312dd244c20b9affa8974cb7c`, pushed. Four files, 467
insertions / 48 deletions against the previous commit - **and 0 deletions against
the branch base `4fe4b41` in every one of the four**, so the whole task is still
an insertion-only change:

| file | lines added vs `4fe4b41` | deletions vs `4fe4b41` |
| --- | --- | --- |
| `docs/schematic/text-handling-research.md` | 990 | **0** |
| `docs/known-gaps.md` | 147 | **0** |
| `docs/schematic/text-placement-prior-art.md` | 20 | **0** |
| `tests/schgen/text-metrics/document-pastes.test.ts` | 75 | **0** |

**§1, §2 and §3 untouched, checked rather than asserted.** §4's heading is line
2373 at the previous commit; every one of the 25 diff hunks in the research
document starts at 2379 or later, and the script that checks it prints the hunk
starts so the claim can be read off the output.

**Suite:** 3789 pass / 0 fail / **43513** `expect()` across 352 files, with
`SCHGEN_SOURCE` set. **The move from 43495 decomposes into two terms and I
predicted only one of them:**

| term | calls | why |
| --- | --- | --- |
| §4's two new fenced blocks (6 → 8) | +2 | one `expect()` each in the by-name `notOutput` loop |
| the four new cases in `document-pastes.test.ts` | +16 | 1 pinned count; 1 + 8 fence words, the loop running once per block; 2 for the NOT-CHECKED-by-line case; 4 for the relabel RED |
| **total** | **+18** | 43495 + 18 = 43513, and the suite prints 43513 |

Against the branch base it is 43489 + 8 + 16 = 43513. Pass count 3785 → 3789, four
new tests; file count unchanged at 352.

**Typecheck:** clean (`tsc --noEmit`, no output).

**Trees:** `git status --porcelain` empty here and in the read-only sibling. No
dependency added anywhere; all installs and runs remain in the scratchpad.

Important 2 — both fixtures are now in the tree
-----------------------------------------------

**This was the right finding and it is the one I should have anticipated**, because
§4.12's own first paragraph already said the only coupling available was "§4.0's
commits, versions, install methods and hashes" - and that sentence was a complete
description of a hole I then failed to read as one.

- **netlistsvg.** The three ad-hoc mutation scripts are consolidated into one
  `fixtures.js`, which builds all four arms from **one committed upstream file**,
  and that script is pasted as a `nsvg-fixture` block. The run now also prints the
  upstream fixture's SHA-256 (`98d766f3...`) and a byte-comparison line asserting
  that the baseline arm **is** that file unchanged, which it had not been until I
  replaced a `JSON.stringify` round-trip with a real `copyFileSync`. **Consolidating
  changed no figure**: `diff` between the old and new logs is the two added header
  lines and nothing else, which §4.4 states.
- **schemdraw.** The geometry is lifted out of the arm function into one
  `fixture(gap, lbl1, lbl2)` and an `ARMS` table, pasted together as a `sd-fixture`
  block - and they are contiguous in the file, so the paste is one slice rather
  than a stitched-together excerpt. **The re-driven log is byte-identical** to the
  earlier one; `diff` reports nothing.
- **Both re-pastes were re-verified** as exact contiguous, non-overlapping slices
  of their four sources, and the first `nsvg-run` block was re-pasted because the
  log gained two lines at position 5.
- **The reviewer's schemdraw figures are now explicable.** They reproduced the two
  text-box widths `0.484` and `4.062` and not the coordinates; with the fixture
  pasted, the widths were never in doubt and the coordinates now are not either.
  §4.5 records their result as the reason the block is there.

Important 1 — G268
------------------

A standalone entry, `### G268 - UNRETRIEVED: a PCB tool is reported to PLACE WHAT
IT CAN AND LOG WHAT IT COULD NOT ...`. It carries what was sought; the three doors
each with its **specific** failure (403 with a 5,693-byte challenge page; a
539-byte login redirect; a host that does not resolve in DNS); that the described
behaviour comes from a search summary and is **explicitly not evidence**; that it
was **not counted in N or M** and why recording and counting are different
obligations; and a criterion only a quotable primary source or a run can meet,
with three untried mechanisms each marked as a guess from someone who has not got
past the doors. It ends by naming what confirmation would move - §4.9's N from six
to seven, eight counting KiCad - and **what it would not: M, which stays at zero,
because *place what you can and log the rest* is not a refusal.** G260's amendment
now cross-references it instead of being its only home, and §4.7 points at it.

**I accept the ruling and I think it is right.** My reasoning was that §1-§3 had
amended only, and the brief's correction - that those sections each had an entry to
amend and this finding has none - is the part I missed.

The eight Minors, each with what was verified before it was changed
------------------------------------------------------------------

- **M-1, taken.** `SegmentText.get_bbox` is **`segments.py:351`**. The cited
  `102-132` was a line range **relative to the class**, which begins at `:250`;
  `:102` is `Segment.get_bbox`, a different class. **The body I quoted was the
  right one** - the `SCALE = 2/72` / `svg.text_size` function is at 351 - so this
  was a bad citation and not a bad reading. Fixed, with the class's own line given
  so the arithmetic is visible.
- **M-2, taken.** Re-drove the xschem grep with the `warning_overlapped_symbols`
  family filtered out: it returns **exactly two lines, `src/actions.c:36-37`**, a
  comment about hash-function collision resistance. There is no arrow-coordinates
  comment in xschem. **The brief is right that my report had this correct and the
  document had drifted**, and §4.3 now says where the misplaced comment actually
  lives (schemdraw `twoterm.py:842`, §4.5's grep).
- **M-3, taken, and it does strengthen the point.** `add-pin-hook` is the one
  `*-pin-hook` registration left uncommented in `deprecated.scm`, so **two** text
  classes are autoplaced by default, `netname` and the pin attributes. Their eight
  table rows all carry an empty `mov_dir` and a spacing of `0`, and
  `get-object-pins` returns `'()` for a pin exactly as it does for a net, so the
  two-pass loop finds nothing to avoid in **both** cases. §4.2's heading went from
  "TWO THINGS" to "THREE THINGS" and the no-op sentence now covers both classes.
- **M-4, taken, and credited.** Confirmed `psprint.c:1185` carries
  `/* if(xscale*FONTWIDTH* xctx->mooz<1) continue; */` - byte-for-byte the
  `svgdraw.c:881` line - and hashed the blob. §4.3 now says both exporters and
  §4.10's third unknown is **retired as settled by a reviewer rather than by this
  section**. `psprint.c` is added to §4.0's hash table flagged as reviewer-opened,
  and to §4.10's unread-paths list where its absence is named as the cause of the
  original miss. **The finding is theirs, the confirmation is mine, and §4.0's
  grade table says a reviewer finding I re-drove is credited and not marked
  `[RELAYED]`.**
- **M-5, taken.** The canvas-growing paragraph is **out of the table**, which now
  renders as the review's five rows and nothing else. The brief's reasoning is
  better than my defence was: a disclaimer inside a sixth cell is read as a sixth
  row, whatever it says. The content is kept as prose beneath, with the same
  argument and the same `[RAN]` figures, and the masking behaviour is cross-linked
  to §4.4 rather than given a row either.
- **M-6, taken.** `[RELAYED]` now marks §3's KiCad figure in **all three** places
  it appears - the opening paragraph, §4.8's geometry row, and §4.9's zero-of-seven
  line - and §4.0's grade table defines the mark, says §4 uses it for exactly two
  things, and carries §3's own disclosure that the autoplacer was never executed
  there either. **The second use is new in this round**: §4.7's relay of the
  reviewer's independent OrCAD retrieval, which I did not re-drive.
- **M-7, taken.** `text-placement-prior-art.md` gets a **pointer** at the head of
  its *Other EDA tools* subsection, naming both corrections and §4.6/§4.7. **Its
  original paragraph is untouched**, which is what the plan's file table requires
  of that document, and the pointer says so.
- **M-8, taken, and it found a second error of mine.** The count is pinned as
  `SECTION_4_BLOCKS = 8` in `document-pastes.test.ts`, mirroring
  `SECTION_2_BLOCKS`, with three cases on it and one RED. **All four were driven
  red once**: setting the constant to 7 reds three of them, and the relabel case
  reds by construction. **And writing the prediction down is what caught the real
  mistake**: my first version of §4.12's arithmetic table said `+8` and asserted
  the four new cases contributed nothing of their own. That was **wrong by
  sixteen**, in the flattering direction, and the suite said so. The table now
  decomposes both terms and records that the first version was wrong and how.

**Reviewer's optional note, taken.** All three Altium URLs are in a table with the
saved byte counts, the OrCAD mirror URL and the FlowCAD cross-check URL are named
with bytes and hash, and §4.6 states the extraction method - strip `script`/`style`,
tags to newlines, unescape entities, print the lines containing the term - so a
later reader knows every quotation is a line of that output and not a
reconstruction.

What this round did NOT do
--------------------------

- **It did not build lepton-eda or xschem**, so concern 1 of round 0 stands
  unchanged and §4.10 still carries it.
- **It did not retrieve the Allegro source**, so G268 is open at its own criterion.
  The three doors were not re-attempted this round; the failures recorded are
  round 0's, dated 2026-10-22, and G268 says so.
- **It did not re-drive the reviewer's OrCAD retrieval**, which is why that one
  sentence is `[RELAYED]` rather than `[DOCS]`.
- **It added no committed log for either run**, so §4's blocks still cannot be
  checked by content and §4.12 now states that limitation in those words instead of
  leaving a reader to assume §1's coupling applies.

One decision a reviewer may want to overrule
--------------------------------------------

**M-8's guarded assertion required editing `tests/schgen/text-metrics/document-pastes.test.ts`,
and the plan's Global Constraints say no task edits "any check".** I read that as
protecting the repository's pre-existing checks rather than this plan's own paste
machinery, on two grounds: Task 1 created that file and Task 2 extended it with the
`SECTION_2_BLOCKS` pin and the whole second `describe` (ruling R17), so editing it
is this plan's established practice; and the brief's own arithmetic - *"Important 2
and M-8 will move `expect()`"* - only works if M-8 adds assertions. **If that
reading is wrong, the fix is to revert the new `describe` and return §4.12's count
to prose**, and the document would then need the sentence about what the guard
cannot see removed with it. I am flagging it rather than burying it because it is
the one place this round touched a file the constraint names.

---

Fix round 2
===========

**Status: DONE.** One item, taken in full. **Nothing disputed** - the finding is
correct and the reasoning for sending it back is the right call, not an
over-reading.

**Commit:** `3cda4c776b81761618c1db2eefb816b304e25a57`, pushed. Two files, 76
insertions / 9 deletions.

**Suite:** 3789 pass / 0 fail / **43513** `expect()` across 352 files, with
`SCHGEN_SOURCE` set. **Every figure unchanged**, which is what a prefix change
should do - and keeping it that way shaped the fix (see below). Typecheck clean.
§4 still pastes eight blocks, all eight re-verified as contiguous slices. Against
the branch base all four files still change by insertion only, and the single diff
hunk in the research document starts at 3303, well after §4's heading at 2373.

What was wrong
--------------

The relabel RED case drove a §4 block into §1's fence namespace with the prefix
`STEP 4b` - **and `STEP 4b` is a real section of §1's log**, the one **G260**'s
figures come from. So the block resolved to a section and then failed one step
later, on **contiguity**, instead of through the **section-resolution** path that
the case and the fence-word case above it both describe. **It was red either way,
so nothing complained.**

**Why `STEP 4b` was the prefix I reached for, which is the uninteresting part of
the cause but worth stating:** the existing case *"RED: a section renamed in the
log, and a section duplicated in it"* perturbs `== STEP 4b: G260` to drive the
rename path, so that string was already in front of me as "a section name this
file uses". It was the wrong thing to borrow for a case whose point is a name the
log does **not** have.

**The brief's reasoning is the part I want to agree with explicitly.** This is
graded a nuance and not a defect, and it is right that the guard cannot be
smuggled past either way. But `CLAUDE.md`'s *"a skipped check must never look like
a passing one"* has a near neighbour in *a check that fires for a different reason
than it documents*: it passes, so nobody looks, and a later reader believes a path
is exercised that is not. That is a worse state than a red, because a red gets
investigated.

Driven, both prefixes, side by side
-----------------------------------

A scratchpad script drove the perturbation against `verify()` directly with each
prefix and printed the actual failure text. **Both are now in §4.12 beside the
prefix that produces them**, so the next reader can see which path fires without
re-driving anything:

```
section 1's log declares 11 sections

== PREFIX "STEP 4b" - matches 1 of the log's 11 headers
failures: 1; notOutput: 26 (unperturbed: 27)
  the ```run block at line 2591 is not a contiguous slice of section "STEP 4b: G260 - the fallback field placements, and the blocked blocks' text overlaps". First line that is nowhere in the log: "777:                                 (if (string-index move-direction #\\<)"

== PREFIX "SECTION 4 HAS NO SECTION IN THIS LOG" - matches 0 of the log's 11 headers
failures: 1; notOutput: 26 (unperturbed: 27)
  the ```run block at line 2591 names section "SECTION 4 HAS NO SECTION IN THIS LOG", which matches 0 of the log's 11 headers. It must match exactly one: a renamed or duplicated step fails here rather than quietly anchoring the block to nothing.
```

**Note the second line of each arm is identical** - one failure, and the block
leaves the NOT CHECKED population, 27 down to 26. That is exactly why the old
assertion could not tell the two apart.

The fix, and the three parts of it
----------------------------------

1. **A prefix that collides with nothing**, `SECTION 4 HAS NO SECTION IN THIS LOG`,
   as a named constant whose doc comment states that it must match no section of
   §1's log and why.
2. **The assertion is on the MESSAGE**, not only on the failure count:
   `expect(v.failures).toEqual([expect.stringContaining('names section "SECTION 4
   HAS NO SECTION IN THIS LOG", which matches 0 of the log's')])`. **It is one
   `expect` rather than two deliberately** - folding the count and the message into
   a single asymmetric match is what keeps the suite's `expect()` total at 43513,
   which the brief asked for.
3. **A PRECONDITION THAT THROWS**, not an assertion, if that prefix ever stops
   matching zero sections of §1's log. A future collision would send the case
   quietly back to testing contiguity - the same defect again - and a throw names
   it instead. It is a `throw` rather than an `expect` for the same reason as (2):
   the file already uses that idiom for preconditions whose violation means a
   figure has moved, and it costs no `expect()`.

What I checked beyond the item
------------------------------

- **Every other RED case in the file was audited for the same hole, and none has
  it.** All thirteen `RED:` cases assert on message content - checked by parsing
  the file and testing each `RED` body for `toContain(` or `stringContaining(`,
  which prints OK for all thirteen. **§4's was the only one.**
- **The general lesson is now in §4.12** rather than only in this report, because
  it is the part a later reader cannot re-derive from the fix: `verify` has **five**
  refusal paths - no section named; a prefix matching zero or several headers;
  fewer than two non-blank lines; not a contiguous slice; two blocks claiming the
  same slice - **and every one produces exactly one failure**, so
  `expect(v.failures.length).toBe(1)` asserts only that something broke.
- **The fence-word case's inline comment was corrected too.** It was the thing that
  stated the path - *"a log that has no section for it ... a confusing message
  about a missing header"* - so it now names the section-resolution path explicitly
  and points at the case that drives it. Leaving it vague is what let the two drift
  apart.

Why no `docs/known-gaps.md` entry for this
------------------------------------------

I considered one and decided against it, and I am recording the reasoning so it
can be overruled cheaply. **The defect is fixed in the same change that found it**,
and the register's rule is that an entry is deleted when it is resolved - so an
entry created and resolved in one commit is noise. **What a later reader needs is
the general lesson, not the incident**, and that is in §4.12, which is committed,
reviewed and read by the tasks that follow. If a reviewer wants it in the register
instead, the sentence to lift is §4.12's five-refusal-paths paragraph.
