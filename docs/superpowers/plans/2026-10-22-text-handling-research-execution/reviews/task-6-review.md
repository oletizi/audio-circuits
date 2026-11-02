# Task 6 review - Collision-free text layout as an optimisation, from typesetting

Reviewer: task reviewer, 2026-10-23. Range `d91c998..40e1cb2` (3 commits).
Everything below is marked **CONFIRMED** (I drove it) or **RELAYED** (I did not
re-take it). Nothing was fixed, nothing was committed, and
`git status --porcelain` is empty at the end of this review.

## VERDICTS

**SPEC COMPLIANCE: PASS.** Every step of `task-6-brief.md` is done. The primary
source was retrieved in full and pinned; what transfers and what does not is
stated and is drawn by the paper rather than by the document; Step 3 is verified
against the tree rather than relayed; **no cost function is chosen** and the one
finding that would most tempt an agent to author one (the infinite/finite badness
split) is named and deliberately stopped at. The register carries four entries in
the change that found them.

**TASK QUALITY: CHANGES REQUESTED.** One **Critical** finding and three
**Important** ones, all of them about the evidence rather than about the
reasoning. The reasoning in §6.2, §6.3, §6.7 and §6.8 is the best-supported
material on this branch. The measurement in §6.5 is correct about what it
measured and is published under a scope claim that is false and that **§5 of the
same document contradicts**.

---

## A. THE SIX PAGES AND SEVEN QUOTATIONS - verified against RENDERED PAGE IMAGES

**CONFIRMED, by image, not by text layer.** I retrieved the PDF from the URL §6.1
names and got SHA-256
`ecc2354ce16693d9152803d56e930fb1b553783eec837a55ab32803ef41d9895` - **identical
to the pin**. `pdftotext -layout` reproduces
`5e15d58c923d0f6f72ff99dd876603a69f4e4dea24af661896d001eb0b32b7a9` exactly; plain
`pdftotext` does not, so the document's parenthetical naming the flag is load-
bearing and correct. Pages were rendered with `pdftoppm -r 170 -png` and read as
images.

| block | page | verdict |
| --- | --- | --- |
| `kp-src p.1119 SUMMARY` | image of p.1119 | **verbatim** |
| `kp-src p.1121 INTRODUCTION` | image of p.1121 | **verbatim**, footnote marks dropped exactly as the parenthetical declares |
| `kp-src p.1127 BADNESS` | image of p.1127 | **verbatim** |
| `kp-src p.1127 FIRST-FIT AND BEST-FIT` | image of p.1127 | **verbatim**, `...` marks a real omission |
| `kp-src p.1129 THE COST FUNCTION` | image of p.1129 | **verbatim** (`delta_j`/`beta_j` transliterate the page's δ/β) |
| `kp-src p.1149 THE SEARCH` | image of p.1149 | **verbatim**; the two passages are adjacent paragraphs, so no ellipsis is owed, though the paragraph break is not shown |
| `kp-src p.1162 WHEN NOTHING FITS` | image of p.1162 | **verbatim** |

**The two load-bearing ones both hold.**

- **p.1121** reads, on the page: *"In fact, the job of breaking a paragraph as
  nicely as possible into equal-size lines sounds suspiciously like the infamous
  bin-packing problem, which is well known to be NP complete.³ Fortunately,
  however, each line is to consist of contiguous information from the paragraph,
  so the line-breaking problem is amenable to the techniques of discrete dynamic
  programming⁴,⁵; this means there is a reasonably efficient way to attack it."*
  The transfer boundary §6.3 draws rests on exactly this sentence and the
  sentence is there. **CONFIRMED.**
- **p.1129** reads *"The above formula for δ_j is quite arbitrary, like our
  formula for β_j, but it works well in practice because it has the following
  desirable properties: (a) Minimizing the sum of squares of badnesses not only
  tends to minimize the maximum badness per line, it also provides secondary
  optimization; for example, when one particularly bad line is inevitable, the
  other line breaks will also be optimized."* **Both formulae, declared arbitrary
  by the authors. CONFIRMED.** The companion claim - *"So many parameters are
  present, it is impossible for anyone actually to experiment with a large
  fraction of the possibilities"* - is on **p.1162**, where §6.7 puts it.
  **CONFIRMED on the image.**

**The OCR hazard is real and the method claim is corroborated by it.** The text
layer renders p.1121 as `well known to be NP ~ o m p l e t e . ~` and **re-orders
the lines**: `Fortunately, however, each line is to consist of` appears *above*
the mangled clause it follows. A transcription taken from that layer could not
have come out in the document's order. That is positive evidence the images were
read.

**Also checked and correct:** the demerit tables `26304 / 10491 / 7063` and
`13218 / 10143 / 4030` (p.1129 image); the 300 experiments at line widths 350-649
(p.1127); the journal citation, receipt and revision dates (p.1119); the demerit
formula `(1 + β_j + π_j)² + α_j` that §6.2 and §6.7 paraphrase.

**Two defects found on this surface** - see Important (4) and Minor (5). Neither
is a fabrication; both are provenance slips.

## B. "TOTAL-FIT" - the correction holds

**CONFIRMED, both counts, on the `-layout` extraction whose hash the document
pins.**

| pattern | count |
| --- | --- |
| `total[ -]fit` | **0** |
| `optimum[ -]fit` | **27** |
| `adjustment ratio` | **26** |
| `first[ -]fit` | 25 |
| `best[ -]fit` | 29 |

This is a word-presence question where OCR noise cuts toward false negatives, so
I also read the pages: p.1129's table columns are headed **First fit / Best fit /
Optimum fit**, and p.1127 names *"the 'first-fit' algorithm"* and *"the 'best-fit'
algorithm"* in the body. **The paper's three names are the document's three
names, and "total-fit" is not one of them.** The brief, the plan and the
controller all used it; the correction is right and belongs in the record.

## C. THE PLACER - both characterisations half-right, and the 60/15 split

**CONFIRMED by reading `lib/schgen/render/field-placement.ts` (294 lines) and by
re-driving the split.**

- `const clear = cands.find((c) => covered(c).length === 0)` - `covered` is a
  boolean predicate over `boxesOverlap`/`segmentHitsBox`, `Array.prototype.find`
  returns the first satisfier, and `area` is not called on this path.
  **First-fit, confirmed.**
- `const cand = clear ?? chooseLeastCovered(cands, area).candidate` - reached only
  when `clear === undefined`. **Best-of-N by weighted overlap area, confirmed**,
  with weight 1 for bodies/graphics/lines and `MARK_WEIGHT` (2) for anything
  misreadable.
- `placed.push(...)` runs after every unit inside the `for (const p of prepared)`
  loop, so each unit's two text boxes are obstacles for every later unit, and
  nothing re-enters. **Greedy sequential, no backtracking at either level,
  confirmed.**
- Candidate arithmetic re-derived: `allCandidates` = free sides + `INSIDE_SLOTS`
  (5) + `besidePinFields` (2 per side that has tips, `[]` otherwise). A vertical
  two-pin passive: 2 + 5 + 4 = **11**. A four-side IC: 0 + 5 + 8 = **13**.
  **Confirmed.**
- **The split re-driven, not relayed.** `bun run tools/schgen/field-order/probe.ts`
  reproduces the committed log **byte-for-byte** (`diff` empty). Its per-block
  unit counts sum 11+8+24+3+3+3+3+2+2+16 = **75**; its fallbacks sum 2+1+8+4 =
  **15**; so **60 settled by the first clear candidate, 15 reach the cost**.
  **CONFIRMED.**

**The grep control is real but its published counts are stale at HEAD** - see
Important (3).

## D. THE ORDER SWEEP

**Mostly CONFIRMED, with one Important qualification about what "30 seeded
shuffles" buys.**

- **The probe re-drives byte-identically**, so every figure §6.5 pastes is
  reproducible from a clean checkout with no external dependency. **CONFIRMED.**
- **The predictions are in the committed artifact and printed before the result.**
  `PREDICTIONS` is a module-level constant; `main()` prints it at line 234 and
  calls `measure()` at line 237. The log carries the ordering, and a test asserts
  `predictionsAt < measurementAt` with **both indices asserted present first**.
  **G271's corrected practice is satisfied. CONFIRMED.**
- **The controls discriminate, and P4's loop is not empty.** The per-block
  `unconditional` counts are 2, 1, 7, 0, 0, 0, 0, 0, 0, 3 = **13 units**, each
  checked on all 33 arms. **CONFIRMED** - this is not a loop over an empty range.
- **P4 cross-checks against independent machinery** (`masked-problems.ts`'s
  `unitSlots`), which is the control that most earns its place. **CONFIRMED.**
- **P5 could have failed** and is a real invariant. **CONFIRMED.**
- **All five predictions held** as the log states. **CONFIRMED** by the re-run.
- **The 33 arms are not 33 distinct orders**, and for small blocks they are far
  from it - Important (2).

**Not a defect but worth stating:** `tp-stage`'s `TP1#1` is the one fallback that
covers text, and it does clear under some arms; `C2#1` moves the other way. Both
are in the committed log and in G272, with the bait stated beside the trap, which
is what the register's rule asks for.

---

## FINDINGS

### CRITICAL

**(1) §6's corpus is the FOUR parity circuits, published as "every declared ELK
block with a grid-legal layout" - and §5 of the same document says there are 48.**

`tools/schgen/field-order/probe.ts` iterates `PARITY_CASES` (line 154), which
`tools/schgen/authoring-census.ts` defines as the four parity circuits and
nothing else. `tools/schgen/board-declarations.ts` exports `BOARD_CASES` (the
nine board declarations) and `ALL_DECLARED_CASES` - one import away, unused.

**I measured what is missing.** A read-only scratch driver over `BOARD_CASES`,
using the probe's own filter chain (`buildCircuit` -> `elkPrePass` ->
`selectRenderer(...).kind === "elk"` -> `outcome.ok` ->
`adaptElkLayoutReported(...).checked !== null`):

```
pultec-hi-boost: ELK blocks 3, grid-legal 3
pultec-hi-cut: ELK blocks 2, grid-legal 2
pultec-low-boost: ELK blocks 3, grid-legal 2
pultec-low-cut: ELK blocks 3, grid-legal 3
pultec-mid: ELK blocks 3, grid-legal 3
transistor-preamp-buffered: ELK blocks 6, grid-legal 6
transistor-preamp-feedback: ELK blocks 5, grid-legal 4
transistor-preamp-loop: ELK blocks 7, grid-legal 7
transistor-preamp-staged: ELK blocks 8, grid-legal 8
TOTAL board-declaration ELK blocks 40, grid-legal 38
```

**Not one of the nine throws.** So the repository has **48** grid-legal declared
ELK blocks and §6 measured **10** of them.

**The document contradicts itself, in a block it pastes.** §5's own pasted probe
output, 400 lines earlier, reads
`declared cases offered: 13; blocks with grid-legal geometry: 48; skipped: 12`.
10 + 38 = 48 and 4 + 9 = 13, so §5's census and my measurement agree exactly and
§6's scope sentence is the odd one out.

What the overstatement reaches:

- **§6.0's evidence-grade table**: *"33 placement orders over every declared ELK
  block with a grid-legal layout"*.
- **The probe's own printed header** (line 230), so the log carries the claim too.
- **§6.4, §6.5, §6.6, §6.7** and **G272**: *"the ten declared ELK blocks with a
  grid-legal layout"*, *"15 of 75 unit placements"*, *"the entire corpus"*.
- **The strongest sentence in the section**: *"the corpus's only text-over-text
  overlap is an artefact of the walk, not a geometric necessity."* That is a
  claim about a population of 10 blocks presented as a claim about the
  repository.
- **§6.10**, whose entire job is to list what §6 did not establish, lists the
  permutation-space sample and **omits the corpus truncation**.

**Mitigation, recorded because it is real:** **G260** scopes the same figures
honestly - *"over the twelve declared blocks"* - and `maskedCensus` also defaults
to `PARITY_CASES`. So §6 inherited a scoped figure and **widened the words**
rather than inventing a number. The figures are right; the quantifier is not.

**Failure scenario:** a later agent reads *"the corpus's only text-over-text
overlap is an artefact of the walk"*, concludes the repository has exactly one
text-over-text overlap, and sizes or skips a text-readability measure on a
population that excludes 38 of 48 grid-legal blocks - including every pultec
board, which `CLAUDE.md` calls the proving ground.

**What would settle it:** either run the probe over `ALL_DECLARED_CASES` and
re-publish, or replace every universal quantifier in §6, in the probe's header
line and in G272 with the scoped form **and** add the truncation to §6.10. The
second is a documentation change and is the cheaper of the two; which one is
right is the controller's call, not mine.

### IMPORTANT

**(2) The 30 "seeded Fisher-Yates shuffles" are a much smaller sample than they
read as, because the LCG does not decorrelate nearby seeds.**

`lcg(seed)`'s **first** output for seeds 1..30 is, in order,
`0.236 0.237 0.237 0.238 ... 0.248` - a span of 0.012. Since the first swap is
`j = floor(rand() * n)`, **every one of the 30 shuffles makes the same first
swap** (for n = 24, always `j = 5`). Measured consequences, re-derived with the
probe's own `lcg`/`shuffled`:

| block size | distinct orders among the 33 arms | orders that exist |
| --- | --- | --- |
| 24, 16, 11, 8 | **32** (production and identity coincide by construction) | 24!, 16!, ... |
| **3** | **3** | **6** |
| **2** | **2** | 2 |

For a 3-unit block **all 30 shuffles produce one of only two orders**, so half
the permutations are never tried. For a 2-unit block **all 30 shuffles equal
`reverse`**.

Four of the ten measured blocks have 3 units and two have 2. So §6.5's *"seven of
the ten measured blocks move not one unit under any of the 33 orders"* is, for
six of those seven, a statement about 2-3 orders rather than 33.

**Failure scenario:** someone widens the sweep by adding seeds 31..60 to raise
confidence, gets the same first swap thirty more times, and reads the unchanged
result as corroboration.

**What would settle it:** CRITERION - for a block of n units, the arms actually
exercised are a stated count of distinct permutations, not a count of arms.
MECHANISM, **untried**: seed the LCG with a scattered value (e.g. `seed * 2654435761`)
or state the distinct-order count per block in the log.

**(3) §6.4's grep control is stale at HEAD, falsified by this task's own
apparatus.**

§6.4 states: *"`git grep -i "first.fit"` over `lib/` and over `tools/schgen/`
returns **nothing**. The same pattern over the whole repository returns **eleven
hits**, every one of them in `tools/stripboard/` or `tests/stripboard/`."*

Re-driven across revisions:

| rev | `lib/` | `tools/schgen/` | non-doc tree |
| --- | --- | --- | --- |
| `d91c998` (before this task) | 0 | **0** | **11**, all stripboard |
| `3657509` .. `40e1cb2` (HEAD) | 0 | **2** | **13** |

The two new hits are `tools/schgen/field-order/probe.ts:61` and its log, in
prediction **P2**'s own text. **G272 repeats the stale sentence.** The
substantive claim (`lib/` is clean; the placer never calls itself first-fit) is
intact, so this is a reporting defect rather than a reasoning one - but it is a
stated, re-drivable command whose published output does not reproduce, committed
in the same change that produced the discrepancy. This is the same class of
staleness the task recorded as **G273** about another document.

**Failure scenario:** a reader re-drives the stated command, gets 2 hits where
the document says 0, and discounts §6.4 - the section the whole transfer argument
leans on.

**(4) §6.8 and the G260 amendment attribute *"forcibly prevented from becoming
empty"* to p.1162; it is on p.1150, a page §6.1 does not list.**

§6.1 states that pages **1119, 1121, 1127, 1129, 1149 and 1162** were opened as
images and that every quotation comes from one of them. §6.8's first bullet
quotes *"forcibly prevented from becoming empty"* and closes the three bullets
with *"`[READ]` p.1162, verified against the page image."* **The phrase is not on
p.1162.** I rendered PDF page 32 and read it: p.1150 carries *"...so the active
list is forcibly prevented from becoming empty by simply declaring a breakpoint
to be feasible if it would otherwise leave the active list empty. This results in
an overset line and an error message that encourages the user to take corrective
action."*

**The words are verbatim - I confirmed them on the rendered image, not on the OCR
layer.** The other two bullets (*"sticks out into the right margin"*, *"some kind
of error indication is necessary"*) are correctly on p.1162. So this is a
mis-citation, not a fabrication, and it is Important rather than Critical only
because the quotation is genuine. In a section whose method claim is page-image
provenance, a page number that does not hold is the thing a reviewer must flag.

**Failure scenario:** a later reader turns to p.1162 to check the strongest claim
in §6.8, does not find the sentence, and reasonably concludes the section's
quotations cannot be trusted.

**What would settle it:** cite p.1150 for that clause in §6.8 and in the G260
amendment, and add 1150 to §6.1's list of pages read.

### MINOR

**(5) §6.2 silently drops the absolute-value bars from a quotation.** The page
reads *"nearly zero when |r_j| is small but grows rapidly when |r_j| takes values
exceeding 1"*; §6.2 quotes *"nearly zero when r_j is small but grows rapidly"*.
§6.7 writes `100\|r\|^3` with the bars, so the convention exists in the section.
Worth noting because **the OCR layer also drops them** (`nearly zero when rj is
small ... I I`), making this the one quotation whose rendering matches the text
layer rather than the image.

**(6) §6.9 alters an in-repo quotation.** It quotes
`text-placement-prior-art.md` §8 as *"a scored, preference-ordered placer with a
least-cost fallback"*; the source reads *"A scored, weighted, preference-ordered
text placer with a least-cost fallback"*. Two words dropped inside quotation
marks with no ellipsis. The meaning survives; the practice should not.

**(7) One of the 41 new assertions cannot fail.** In the last new case,
`sources` is built by `.filter((b) => b.info.split(/\s+/)[0] === "kp-src")` and
then each element is asserted `not.toContain`-ed from
`[OUTPUT_FENCE, "elk-run", "label-run", "field-order-run"]`. It is true by
construction, and it runs 7 times. In a file whose stated purpose is to refuse
un-failable assertions, that is worth removing or replacing with a check over
*all* blocks in §6's slice.

**(8) P1's stated refutation condition is stronger than P1 can test.** P1 says a
difference *"would mean this probe's plumbing is not the production path"*. But
`production.order = (p) => p` and `identity.order = (p) => [...p]` produce the
same order through the same `outcomes()` call, so P1 can only expose
non-determinism in `blockFields` - never a divergence between the probe and the
shipped pipeline. It is a real check (hidden state would trip it) with an
overstated claim. P4 is the control that genuinely reaches outside the probe, so
the section is not left without one.

**(9) The committed probe and log propagate "total-fit"** in P2's prediction text
(*"the first-fit/total-fit distinction"*) - the coined term §6.1 corrects three
sections later. Not a citation error (§6 calls it later TeX-community usage), but
an internal inconsistency in artifacts committed together.

---

## EVERYTHING ELSE THE BRIEF ASKED FOR

| check | verdict |
| --- | --- |
| **No cost function chosen** | **CONFIRMED.** §6.7 tabulates six costs with "could this repository measure it today" - **two yes** (weighted overlap area; count/fraction placed without overplot), **four no** (badness, demerits, Yoeli's three-term objective, human task performance) - and selects none. §6.11 item 2 names the infinite/finite badness split, calls it an acceptance criterion and the owner's, and stops. Nothing in §6 declares it. |
| **Step 3 verified, not relayed** | **CONFIRMED by reading.** `SchematicMeasures` has exactly five numeric fields; `measuresOf` and `sheetMeasuresOf` both `return measuresOfWires(...)`; `measuresOf`'s extent is wire ends + pin positions with no text; `sheetMeasuresOf`'s extent adds `d.labels.map((l) => l.at)` and `d.texts.map((x) => x.at)` - anchor points, never boxes. **Text reaches exactly one of the five, with no extent.** The eight-identifier control reproduces exactly: `textBox` 0/6, `labelBox` 0/10, `FieldFallback` 0/6, `placeFields` 0/7, `blockFields` 0/3, `textWidth` 0/6, `fieldsWidth` 0/4, `drawnText` 0/1. Every pattern matches somewhere; none matches under `readability/`. |
| **§1-§5 untouched** | **CONFIRMED.** `d91c998`'s copy of the document is **exactly 4209 lines**, and `head -4209` of HEAD's copy hashes identically (`13733adb…e5c5`). `git diff --numstat` over the range: `docs/schematic/text-handling-research.md` **697 insertions, 0 deletions**. |
| **`expect()` accounting** | **CONFIRMED.** Suite moved 43551 -> **43592** (+41) and 3802 -> **3809** (+7), file count unchanged at 353. I counted the new `describe`'s assertions by hand: 4 + 3 + 3 + 3 + 7 + 5 + 16 = **41**, across **7** `test()` calls. **No existing assertion was loosened**: the whole-range diff of `document-pastes.test.ts` is 168 insertions and **1 deletion**, and that deletion is a one-line doc comment replaced by a longer one. Every other line is an addition. |
| **The §5 slice hazard** | **CONFIRMED, driven on disk, not argued.** I edited `blocks with grid-legal geometry: 48` -> `49` in a §5 `label-run` block and ran the file: **three §5 cases went red** (`every block section 5 pastes…`, both §5 REDs) and **no §6 case moved**. I then edited `production 2 fallback(s)` -> `3` in a §6 block: **exactly the §6 contiguity case went red** and no §5 case moved. Both edits were reversed and the file hashes back to `957e4108…d2b7`. **The documented dependence is accurate**: §5's cases count ` ```label-run ` fences specifically (pinned at 13), §6 uses ` ```field-order-run ` and `kp-src`, and §6's blocks reach §5's `verify` as NOT CHECKED, which `verified + notOutput + failures = blocks` absorbs. |
| **The two self-caught defects** | **CONFIRMED fixed.** The ordering case now reads `expect(predictionsAt).toBeGreaterThan(-1); expect(measurementAt).toBeGreaterThan(-1); expect(predictionsAt).toBeLessThan(measurementAt)` - both indices asserted present before comparison, with the `-1 < -1` reasoning in the comment. The register's diff over the range is **235 insertions / 0 deletions**. |
| **G272 states its own bait** | **CONFIRMED.** The entry carries the sentence *"Thirteen instead of fifteen, for free, by re-walking"* and then all three obstacles: 33 of up to 24! is a sample so 13 is an upper bound; **G260** records that nobody has said what a fallback costs so there is nothing to be best by; and `C2#1` moving the other way means a count-only objective would silently choose which unit gets drawn over. |
| **Register entry shape** | **CONFIRMED** for all four. G272, G273, the G71 extension and the G260 amendment each carry what was found, where, the evidence, an explicit **CONFIRMED**/**RELAYED** line (G272 marks G260's fourteen-of-fifteen figure as RELAYED), and a **CRITERION** kept distinct from a **MECHANISM** with every mechanism marked **UNTRIED**. G273's evidence re-driven: `git merge-base --is-ancestor 46fe129 d02ad3d` exits **1**, and `8e601b4`'s copy of the placer still carries `tryPlaceFields`/`blockerOf`. The four §7 rows it calls stale are quoted accurately (modulo Minor 6). |
| **Nothing was fixed** | **CONFIRMED.** `git diff --name-only d91c998 40e1cb2 -- lib/ circuits/ boards/ Makefile` is empty. |
| **Disclosed non-retrievals** | **CONFIRMED in the document, not only in the report.** §6.10 bullet 1 states `tex.web`/TeX82 were not read and that §6.8 is the 1981 paper's description. §6.10 bullet 2 and §6.7's Yoeli row carry `[NOT RETRIEVED]` for Yoeli 1972, Imhof and Zoraster, with the Yoeli row saying plainly that the middle term and all three weights are unestablished. |
| **Suite** | `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test` -> **3809 pass / 0 fail / 43592 `expect()` across 353 files** (152.70s). **Matches the report exactly.** |
| **typecheck** | `bun run typecheck` -> `tsc --noEmit`, **clean, exit 0**. |
| **`make check`** | **RED, exit 1, exactly 4 `FAIL` lines** - `pt2399-core` (`no "bomConditions" export`) and `transistor-preamp-lab`/`-loop`/`-staged` (`no lead span is recorded for footprint "Capacitor_THT:CP_Radial_D10.0mm_P5.00mm"`). **Exactly G251's four boards and exactly its two cause classes.** Pre-existing; not this task's. |
| **No AI attribution** | **CONFIRMED.** A scan of all three commit messages plus author/committer for `co-authored`, `claude`, `anthropic`, `generated with`, `claude-session` and the robot emoji returns nothing. |
| **No dependency added** | **CONFIRMED.** No change to `package.json` or any lockfile over the range. |
| **Port manifest** | **CONFIRMED.** `tools/schgen/field-order/probe.ts` is declared under the **`handWritten`** key (parsed, not greped). `probe-run.log` is not a `.ts` and needs no entry. |
| **Tree clean** | **CONFIRMED.** `git status --porcelain` empty after all perturbations and after `make check`. |

## WHAT IS GOOD HERE, SO THE FINDINGS ARE NOT READ AS THE WHOLE PICTURE

- **The transfer boundary is drawn by the primary source and not by the
  document.** §6.3 does not argue that label placement is hard; it quotes Knuth
  and Plass naming bin packing and naming contiguity as the only rescue, and then
  observes that label placement has no contiguity. That is the difference between
  a position and a finding, and the sentence is on the page.
- **The G71 extension is the most valuable thing in the change.** G71 said no
  published source states a threshold. §6.7 establishes something stronger from a
  primary source: the canonical penalty model's authors call **both** their
  formulae arbitrary and say nobody can tune them. *"Adopt the literature's cost
  function"* genuinely is not a move that exists, and that is now written down
  with a page number.
- **The probe is honest machinery.** It prints its predictions before it
  measures, names the defect each control would expose, re-drives
  byte-identically with no external dependency, and its summary says in its own
  output that the arm-wise best is a measurement and not a target.
- **The refusal to choose is load-bearing and visible.** §6.3's "two grades of
  badness" row is the most actionable finding in the section and the document
  stops at naming it. That is the right call under `CLAUDE.md` and it cost the
  section its most quotable conclusion.

## RECOMMENDED DISPOSITION

**One fix round**, confined to wording and provenance - no re-measurement is
required for (3), (4), (5), (6), (7), (8) or (9), and (1) can be settled by
scoping the words rather than by re-running, if the controller prefers that. (2)
needs either a corrected seeding or a stated distinct-order count. Finding (1)
should also reach the register: it is a measurement whose population a later
reader cannot re-derive from the document, and §6.10 is where it belongs.
