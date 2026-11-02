# Task 6 report - Collision-free text layout as an optimisation, from typesetting

**Status: DONE_WITH_CONCERNS.** Every step of the brief is done and §6 is
committed. The concerns are in the last section and none of them blocks the
section; the largest is that §6 ends up asserting that a measurement I took is
*not* yet actionable, and the register entry that carries it is the one most
likely to be read as an invitation anyway.

**Commits, all on `feature/schematics-tooling`, all pushed, no AI attribution
(scanned):**

| SHA | what |
| --- | --- |
| `3657509` | Task 6 apparatus - `tools/schgen/field-order/probe.ts`, its committed log, manifest entry |
| `3f99e54` | §6 of `docs/schematic/text-handling-research.md`, plus the fourth paste-checker call |
| `40e1cb2` | Register: G272, G273, a G71 extension and a G260 amendment, plus §6's pointers to them |

**Suite:** `SCHGEN_SOURCE=... bun test` -> **3809 pass / 0 fail / 43592
`expect()` across 353 files**, from HEAD's 3802 / 43551 / 353.
**Accounted term by term:** +7 tests and +41 assertions, all of them the new
`describe("section 6's pasted output, against section 6's own log")` block in
`tests/schgen/text-metrics/document-pastes.test.ts`; **no file added**, so the
353 is unchanged; no existing assertion loosened or removed.

**typecheck:** `bun run typecheck` -> `tsc --noEmit`, clean, twice (after the
probe and after §6).

**`make check`:** RED, exit 2, **4 `FAIL` lines** -
`pt2399-core` (missing `bomConditions` export) and `transistor-preamp-lab`,
`-loop`, `-staged` (unfinished layouts). **Exactly G251's four boards and
exactly its two cause classes.** Not touched, not fixed, not mine.

---

## 1. Knuth-Plass retrieval status: `[READ]`, full text, pinned, and the quotations verified against page IMAGES

**Retrieved in full.** Not an abstract, not a secondary account.

| | |
| --- | --- |
| source | `https://gwern.net/doc/design/typography/tex/1981-knuth.pdf`, 2026-10-22, HTTP 200, `application/pdf` |
| bytes | 4 828 786 |
| SHA-256 (PDF) | `ecc2354ce16693d9152803d56e930fb1b553783eec837a55ab32803ef41d9895` |
| SHA-256 (extracted text) | `5e15d58c923d0f6f72ff99dd876603a69f4e4dea24af661896d001eb0b32b7a9` |
| what it is | the real paper: *SOFTWARE-PRACTICE AND EXPERIENCE, VOL. 11, 1119-1184 (1981)*, 66 CCITT-fax page images with an OCR text layer |

`www.eprg.org`'s copy 403s and `defoe.sourceforge.net`'s 404s; both were tried
first and are recorded in §6 only insofar as the working mirror is named.

**The OCR is not trustworthy for quotation and I did not trust it.** Page 1121's
`NP complete.3` extracts as `NP ~ o m p l e t e . ~`; `dynamic programming4,5`
extracts as `dynamic p r ~ g r a m m i n g ~ . this~`. **Every quotation in §6
was transcribed from the rendered page image** - pages 1119, 1121, 1127, 1129,
1149 and 1162 were opened as images and read. Nothing was copied from the text
layer into the document.

**One brief/plan term does not survive the source.** Both say *"total-fit"*. The
paper never uses it: `total[ -]fit` returns **0** over the extracted text,
`optimum[ -]fit` returns **27**, `adjustment ratio` returns **26**. The paper's
three names are **first-fit**, **best-fit**, **optimum-fit**. That is not
pedantry here - §6.4's mapping of this repository's placer onto two of those
three names is only checkable if the names are the source's.

---

## 2. What I established the current placer actually does

**The plan's phrase and the correction I was handed are BOTH half-right, and the
file is both things on two different paths.** `[READ]`
`lib/schgen/render/field-placement.ts`, `occupancy.ts`, `text-boxes.ts` at
`3657509`.

- `cands.find((c) => covered(c).length === 0)` - **first-fit** over a fixed
  candidate order by a **boolean** predicate (`boxesOverlap`,
  `segmentHitsBox`). **The cost is not consulted on this path at all.** The
  file's own header says *"The first clear candidate is taken, exactly as
  before."*
- `clear ?? chooseLeastCovered(cands, area).candidate` - **best-of-N by weighted
  overlap area**, reached **only** when no candidate is clear. Weights: 1 for
  bodies, graphics and lines; 2 (`MARK_WEIGHT`) for anything misreadable.
- Across units: `placed.push(...)` after each one, so every unit's choice is an
  obstacle for every later unit. **Greedy sequential, no backtracking at either
  level.**
- Candidate set: free sides, then 5 inside slots, then 2 beyond the outermost
  pins of each pinned side - **11 for a vertical two-pin passive, 13 for a
  four-side IC**. Not a constant.

**The grep control.** `git grep -i "first.fit"` over `lib/` and
`tools/schgen/` returns **nothing**; over the whole repository it returns
**eleven** hits, all in `tools/stripboard/` and `tests/stripboard/` about the
VeroRoute fork's `AddComponent` sweep. **The pattern can match and does** - it
just never matches the schematic placer.

**And the measured split, which neither prior characterisation had:** over the
ten declared ELK blocks with a grid-legal layout there are **75 unit
placements**; **60 are settled by the first clear candidate and 15 reach the
cost**. So the plan's word names the path that decides four placements in five,
and the correction names the path that decides one in five.

In Knuth-Plass's own vocabulary it is **first-fit on the feasible path, best-fit
on the infeasible path, greedy sequential over units at both, and nowhere
optimum-fit.**

---

## 3. Which parts of the model transfer and which do not

**The boundary is drawn by the paper itself, which is the finding rather than my
reading of it.** p.1121: line breaking *"sounds suspiciously like the infamous
bin-packing problem, which is well known to be NP complete. Fortunately,
however, each line is to consist of contiguous information from the paragraph,
so the line-breaking problem is amenable to the techniques of discrete dynamic
programming"*. **Label placement has no contiguity.** By the authors' own
sentence, remove contiguity and you are back in the NP-complete family - which
is where `text-placement-prior-art.md` already puts point-feature labelling from
Christensen, Marks & Shieber. **The two literatures agree on where the line is,
in their own primary sources.**

**DOES NOT transfer**

- **The shortest-path / dynamic-programming search.** Requires an item's cost to
  depend only on an interval of a total order. Fields and labels on a sheet have
  no total order and the conflict relation is not interval-shaped.
- **The demerit magnitudes** (26304 / 10491 / 7063 and 13218 / 10143 / 4030).
  Units of a function its author calls arbitrary.

**DOES transfer**

- **Badness as a continuous quantity** replacing *"the yes/no tests"*. Already
  present here as overlap area (`occupancy.ts`).
- **TWO GRADES of badness - infinite and finite.** *"values of r_j > 1 are only
  finitely bad, so they will be permitted if there is no better alternative"*.
  **This is the part this repository most lacks as a DECLARED thing:** its two
  grades exist but are implicit and global - everything is infinite until no
  candidate is clear, at which instant everything becomes finite at once.
  Nothing says which obstacles may never be overlapped. **That split is an
  acceptance criterion and is the owner's**, which is why §6 names it and stops.
- **A feasibility threshold separate from the ranking cost.** Already here, and
  **convergently** - `field-placement.ts` says *"THE COST RANKS; IT NEVER DECIDES
  FEASIBILITY"* and cites the labelling literature, not Knuth.
- **A penalty attached to a CHOICE** rather than to a geometric outcome. In
  principle; nothing here has one, and the candidate order is an array literal
  that `text-placement-prior-art.md` §7 records as *"unjustified anywhere"*.
- **The total-fit-vs-first-fit INSIGHT, as an insight and not a method** - and
  §6.5 measures that it is live here rather than academic (section 4 below).
- **Non-refusal on failure** - already implemented, and §6.8 makes TeX the
  **eighth** tool that does not refuse.

---

## 4. The measurement I took, and why it is in the section

**I did run something**, which the context said might not happen.
`tools/schgen/field-order/probe.ts` permutes `layout.placements` over **33 arms**
(production, identity, reverse, 30 seeded Fisher-Yates shuffles), changing
nothing else - the same soundness argument `masked-problems.ts`'s `unitSlots`
makes for its one arm. **Five predictions are printed by the probe before it
measures anything**, per G271's corrected practice, and a test asserts that
ordering in the log. **All five held.**

- production **15** fallbacks over 10 blocks; **arm-wise best 13**; no arm worse
  by count;
- **3 units change fallback status**, **7 change slot**;
- **`tp-stage`'s `TP1#1` is the one fallback in the whole corpus that covers TEXT
  rather than a wire or a pin** (G260's own measurement), and it clears under
  some orders. **The corpus's only text-over-text overlap is an artefact of the
  walk.**
- **`tp-stage`'s `C2#1` moves the other way** - not a fallback under production,
  a fallback under some arm, with the block's count unchanged at 4. A count is
  not a sufficient description of what the order changes.

**Three controls, each able to fail:** identity reproduces production
slot-for-slot (0); every `fallsBackUnconditionally` unit falls back on all 33
arms (0), which re-drives G239's Task 22 first-position argument against 33
orders instead of 1; no arm moves any placed body box (0).

**Step 3's claim verified rather than relayed.** `SchematicMeasures` has five
numeric fields, all computed by `measuresOfWires`, and **text reaches exactly one
of them as a zero-area anchor point** (`d.labels.map(l => l.at)`,
`d.texts.map(x => x.at)` into `occupiedArea`; per-block `measuresOf` sees no text
at all). Control: eight text identifiers appear in 1-10 files under
`lib/schgen/render/` and in **0** files under `lib/schgen/readability/`.

**And G71 read before a word of §6 was written**, with the result that §6.7
strengthens it from a primary source: Knuth and Plass declare **both** their
formulae *"quite arbitrary"* and report that *"it is impossible for anyone
actually to experiment with a large fraction of the possibilities"*. **So
"adopt the literature's cost function" is not a move that exists.** §6.7
tabulates what the literature's costs ARE and whether this repository could
measure each - two could today, four could not - and **chooses none**.

---

## 5. Register

- **G272** (new) - what the placer is, both characterisations half-right, the
  60/75 split, and the walk-order measurement with the bait stated beside the
  trap.
- **G273** (new) - `text-placement-prior-art.md` §7 stale in four rows at HEAD,
  by chronology; evidenced by `git merge-base --is-ancestor 46fe129 d02ad3d`
  returning non-zero and by `git show 8e601b4:...` still carrying the refusing
  arm.
- **G71 extension** - the literature's cost function is declared arbitrary by
  its own authors.
- **G260 amendment** - TeX is the eighth tool and does not refuse; the
  difference from this repository is the loudness, which is that entry's own
  open residual.

§6 carries pointers to all four so a reader of either document reaches the
other.

---

## 6. Section isolation and the checker

**§1-§5 untouched.** The §6 append was 683 insertions / 0 deletions; the
subsequent pointer edits touch lines 4507+ only; **the first 4209 lines are
byte-identical to the file before the append**, verified by `diff` against a copy
taken first.

**§6's five probe blocks are held to §6's own log by a FOURTH call to the paste
checker**, fenced ` ```field-order-run `, with two RED cases (a digit edit, a
genuine slice of another section of the same log) that assert on the **failure
message** and not on a count. The seven `kp-src` transcriptions are declared NOT
CHECKED with their count and page provenance pinned. **No existing assertion was
loosened.**

**Two things worth flagging that this turned up:**

1. **Appending §6 put blocks inside §5's slice**, which runs to end of file -
   the exact trap §4 hit when §5 was appended. §5's cases still mean §5 because
   they count ` ```label-run ` fences specifically. **That dependence is now
   written beside `SECTION_5_HEADING`** so appending §7 is a decision rather than
   an accident.
2. **My own ordering assertion went red on `-1 < -1`.** Both header literals
   carried a trailing ` ==` the log does not. The lesson is the general one: an
   ordering case on bare `indexOf` **passes whenever the EARLIER header has
   vanished**, which is the un-failable assertion that file exists to refuse.
   Both indices are now asserted present before being compared, with the reason
   in the comment.

---

## 7. Concerns

1. **G272 is bait and I know it.** *"Thirteen instead of fifteen, for free"* is
   the sentence somebody will act on. I stated the three obstacles in the entry
   itself - 33 of up to 24! is a sample so 13 is an upper bound; there is no
   objective to be best by (G260); and `C2#1` moving the other way means a
   count-only objective silently chooses which unit gets drawn over. **I would
   rather you read that entry adversarially than the section.**
2. **The G71 extension was inserted mid-paragraph on the first attempt**, because
   my anchor was a substring of a longer line and the entry's closing reading got
   severed from its opening sentence. **Caught by reading the deleted-line list
   rather than the stat.** The register's diff is now 235 insertions / **0**
   deletions. I mention it because the near-miss is exactly the class of silent
   evidence edit §1.11 exists for, and it happened in the register rather than in
   the document.
3. **I did not read `tex.web`.** §6.8's TeX behaviour is the 1981 paper's
   description of a program the same authors wrote. That is a primary source
   about the algorithm and a second-hand source about the shipped program, and
   §6.10 says so. If the eighth-tool row matters, somebody should read
   `tex.web`'s `@<Call the packaging subroutine...@>`.
4. **I did not retrieve Yoeli 1972, Imhof or Zoraster.** They reach §6.7 through
   `text-placement-prior-art.md`'s reading of Christensen et al., marked as such.
   §6.7's row for Yoeli says plainly that the middle term and all three weights
   are unestablished.
5. **The probe's log is not coupled to a commit**, unlike §1's and §5's. I made
   that choice deliberately - §6's probe needs nothing external, so a doubting
   reader re-drives rather than trusting a pin - and §6.12 states it as a
   deliberate difference. **If you want the coupling, it is a one-line print in
   the probe and one more test case.**
6. **§6 is long.** 683 lines before the pointers. The transcriptions account for
   about 80 of them and §6.3's table for another 20. I did not find a way to cut
   it that did not cost a quotation or a hedge.
7. **One thing I deliberately did not do.** §6.3's "two grades of badness" row
   is the most actionable finding in the section, and the natural next move is to
   declare which obstacle classes are infinite and which are finite. **That is an
   acceptance criterion**, so §6 names the gap, puts it in §6.11 as mechanism 2
   marked untried, and stops. If that reads as under-delivering, it is on purpose.

---

# Round 1

**Status: DONE.** The Critical was re-run rather than re-worded, all three
Importants and all five Minors are addressed, and nothing is disputed.

**Commit:** `5ca6f2d`, pushed, no AI attribution (scanned).

**Suite:** 3809 pass / 0 fail / **43594** `expect()` across 353 files, from
3809 / 43592. **No test added or removed**; exactly two assertions, both inside
existing cases - one where a stale literal became two live ones, one where a
tautology became a tally plus a pages-read check.

**typecheck:** clean. **`make check`:** still G251's four boards; not touched.

## The population, and every figure that moved

Re-run over `ALL_DECLARED_CASES` through `text-metrics/step4.ts`'s
`laidOutBlocks` - the same population function section 5 uses, so the two
sections are comparable by construction. **P6 is a new control requiring this
run's grid-legal count to equal section 5's committed 48; it held.**

| | round 0 | round 1 |
| --- | --- | --- |
| corpus | 4 parity circuits, **10** blocks, no Pultec board | **13** declared cases, **48** blocks |
| unit placements | 75 | **255** |
| first-fit / cost split | 60 / 15 | **202 / 53** |
| fallbacks: production, best, worst | 15, 13, **15** | **53, 51, 54** |
| units changing fallback status | 3 | **3** (same three) |
| units changing slot | 7 | **21** |
| fallbacks covering TEXT | 1 | **4** |
| blocks driven over every order | 0 | **36 of 48** |

**Two round-0 conclusions did not survive, and both are superseded in place.**

1. ***"No arm is worse by count"* is FALSE.** Order-wise worst is 54 against a
   production 53; `transistor-preamp/tp-stage` runs 3 to 5 around 4. That
   sentence was what made "re-walk and keep the best" look free.
2. ***"The corpus's only text-over-text overlap is an artefact of the walk"* was
   a quarter right.** Four fallbacks cover text; only `TP1#1` is a status mover,
   so **one is reachable by reordering and three are not**, and two of the three
   are on boards round 0's corpus did not contain.

**And the limitation that inverts what "36 of 48 exhaustive" sounds like:** all
36 exhausted blocks have **zero** fallbacks. They are the blocks of seven units
or fewer. All 53 fallbacks live on the 12 blocks of eight or more - exactly the
ones too large to exhaust. The order-wise best is exact where there is nothing
to measure and an upper bound everywhere it matters.

## Important 1: the route I took

**Enumerate where it fits, bound where it does not.** `n! <= 5040` is driven
over every permutation by Heap's algorithm; larger blocks over 200
**deduplicated** orders with `n!` printed beside the count. The LCG is replaced
by `mulberry32`, which mixes its counter before use, so consecutive seeds no
longer share a first draw - the defect that made thirty arms one order on a
two-unit block. **P7 is a new control refusing the label and the count to drift
apart.**

## The rest

- **Important 2:** grep control re-taken at HEAD and naming its own
  contamination - 0 under `lib/`, **2** under `tools/schgen/` (this probe and
  its log, via P2's text), **13** over `lib`+`tools`+`tests` of which 11 are the
  VeroRoute sweep. Section 6.4 carries the general hazard; G272 carries the
  corrected figures.
- **Important 3:** p.1150, rendered and confirmed verbatim, and I took the next
  sentence with it - *"This results in an overset line and an error message that
  encourages the user to take corrective action"* - which is a better quotation
  for the point than the p.1162 one. Section 6.1's pages-read list gains 1150,
  and a **new assertion requires every page a `kp-src` block cites to appear in
  that list.**
- **M-1:** bars restored, and the method claim narrowed to what was actually
  done per quotation. Every in-prose fragment re-read on the image; that was the
  only casualty.
- **M-2:** *"[a] scored, weighted, preference-ordered text placer with a
  least-cost fallback"*, exact, with the elision marked.
- **M-3:** the tautology is replaced by a tally of **every** fence word in
  section 6 against a pinned map. **Driven red three ways** in a scratch probe
  (not committed): a block relabelled into the checked namespace, a block
  deleted, and a page removed from the pages-read list while a block still cites
  it.
- **M-4:** P1 restated as determinism and purity, not fidelity.
- **M-5:** "total-fit" gone from the probe and its log.

## Disputes

**None.** Every finding was correct, and the Critical in particular was the one
I should have caught: `laidOutBlocks` is the function section 5 of the same
document uses, it was one import away, and I reached for `PARITY_CASES` because
`masked-problems.ts` - the tool I was cross-checking against - uses it. **That
is the whole mechanism of the error: I inherited a corpus from the thing I was
validating against instead of choosing one for the question I was asking**, and
P6 now exists so the next agent cannot do it quietly.
