Task 7 review — the synthesis
=============================

**Reviewer's working rule for this document:** every claim below says whether I
CONFIRMED it by driving or reading the thing myself, or whether I am RELAYING.
I re-drove the census, the confinement hashes, all three new test cases (each to
red and back), the suite, typecheck, and the p.1150 quotation against the
rendered page image. I did not re-drive §1's, §2's, §5's or §6's probes; where I
checked their figures I read the committed blocks those sections paste, which is
the same evidence the table relays from.

VERDICTS
--------

**SPEC COMPLIANCE: PASS.** All six steps of the brief are executed. Step 1
produces an eighteen-row `SOLUTION SPACE` with the four required columns plus the
evidence level. Step 2 maps all eighteen onto the eleven boards, board by board,
and §7.3 reports the approaches that fix nothing as fixing nothing, naming row 3
as the one the research made least promising. Step 3 grades every row at one of
the three accepted levels, in its own column, with no level re-graded, merged,
renamed or added. Step 4 is §7.4. Step 5 is §7.5, which states plainly that this
is not a design and names three owner decisions without answering any. Step 6
amends G232 and G259 (and G260 and G268), and commits. The context's four
rulings are followed: one document, head table as insertion, the §5 slice
decided rather than stumbled into, and no new measurement campaign.

**TASK QUALITY: PASS WITH FINDINGS.** The table's grades hold row by row, the
one measurement it drove is exactly reproducible, the three new test cases all
go red when they should and one of them is load-bearing in a way the report
understates. The findings are three accuracy defects in relayed or re-derived
*figures*, two of which sit in the head table and one of which was introduced by
the self-review commit itself. **None of them changes a grade, a count or a
measurement.** No fix was attempted and none is needed for the work to stand;
they are corrections.

---

A. THE TABLE'S GRADES, ROW BY ROW
---------------------------------

**Verdict: no row is graded above its evidence.** I checked all eighteen against
the evidence their own cells cite.

**ESTABLISHED ELSEWHERE (6): rows 3, 4, 11, 12, 15, 18.** Level 1's evidence
clause is *"source read, or paper read"*.

- **Rows 3 and 4** rest on §3's line-by-line read of `autoplace_fields.cpp` at
  tag `10.0.5`. Source read ✓. CONFIRMED that the row does not hide the
  weakness: row 3's own cells carry the confirmed side-selection defect and the
  fact that upstream's test file never calls the function, which is the honest
  way to grade a capability whose "demonstrably works" rests on a read and not a
  run.
- **Row 11** is the one I expected to be over-graded and it is not. Its cell says
  Wolff Ch. 3's *"approximation results were not read"*, which reads like a
  missing-evidence admission under level 1. CONFIRMED by reading §5.1: Chapter 3
  is point labelling, and what was not read there is the **yield comparison**
  (how many more labels a continuous model places). The capability itself —
  **line labelling with a sliding site** — is Wolff **Chapter 5**, `[READ]` in
  full, 16 pages, pinned by SHA-256. Paper read ✓, and the cell states the
  unknown in the right column rather than letting it leak into the grade.
- **Row 12** rests on Knuth and Plass read in full and pinned (§6.1). ✓
- **Row 15** rests on §6.8's p.1150 reading, which I verified myself (see the
  G268 section below). ✓
- **Row 18** rests on §4.3's xschem source read. ✓ (See Minor M3.)

**DEMONSTRATED HERE (8): rows 1, 2, 5, 6, 7, 8, 9, 13.** Level 2 is *"run
against this repository's own inputs and the result observed"*.

- **Rows 2, 6, 7, 8, 9** are Task 2's twelve-arm experiment over this
  repository's own 48 graphs and Task 5's four sweeps over its twelve blocked
  blocks. Runs ✓. I checked the specific figures against the committed
  `label-run STEP 3 SUMMARY` and the §2.5 arm table and they are relayed
  correctly: row 7's *"1, 2, 3, 6 and 10"*, row 8's *"6 of the 46 anchors"*,
  row 6's `4⁴ = 256` on four-anchor blocks with `4⁶ = 4096` the widest, row 9's
  7-of-12, row 2's 398 labels / 0 bodies / 266 wire crossings.
- **Row 5** is Task 1's probe over 264 of this repository's own strings. ✓
  Figures confirmed against §1.7 and §1.9: 18%/87%, 70 of 264, 1270/1422.4/
  2043.1, 15/13/20/24, 4 of 8 drawn-text overlaps artefactual.
- **Row 1** is the one row where the grade is a composite: ELK's answer being an
  *offset* is a run result (arm **e**, this repository's graphs), while the
  emitted `global_label` having one coordinate is a `[READ]` of this
  repository's own `emit-items.ts`. Both halves are about this repository's own
  inputs, and the row is marked "(negative)". The grade holds.
- **Row 13** is the ruled deviation. See below.

**INTEGRATION HYPOTHESIS (4): rows 10, 14, 16, 17.** None was run here ✓.

**THE G275 DEVIATION — your condition is met, and the underlying claim is
sound.** CONFIRMED: both the deviation record and §7.0 quote level 2's
enumeration verbatim (*"Only Task 1's geometry, Task 2's ELK experiment and Task
5's freedom measurements can reach this level"*) and state explicitly that Task 6
"is not in the second sentence's list" / "the three-task list is a prediction
made before Task 6 ran". No reader can conclude the level list was quietly
widened: the list is reproduced and the fourth task is named as outside it, in
two places, with the one-cell reversal spelled out (6 / 7 / 5). The dagger is on
the row and on the LEVEL cell. CONFIRMED that Task 6 genuinely ran: §6.5 pastes a
`field-order-run SUMMARY` block reporting `48 block(s) measured`, `unit
placements over the measured blocks: 255`, `production 53, order-wise best 51,
order-wise worst 54`, with seven named controls (P1–P7) including one that
refuses silent truncation; `tools/schgen/field-order/probe.ts` exists in the
tree; and the whole block is asserted against a committed log on every `bun
test`, which I ran green. This is a drive against this repository's own blocks,
not a reading of code.

**THE SIX-OF-EIGHT-ARE-LIMITS CLAIM: IT HOLDS, AND IT IS CONSERVATIVE RATHER
THAN GENEROUS.** §7.0 names the six as rows 1, 5, 6, 7, 8, 13. Checked:

| row | the limit it demonstrates | is it a limit? |
| --- | --- | --- |
| 1 | fixes nothing; the offset has nowhere to go in the emitted form | unambiguous |
| 5 | 13 of 15 fallbacks survive all three quantities; the metric is not the blocker | unambiguous |
| 7 | 0 of 12 blocks, and it creates a dangling end on three | unambiguous |
| 8 | 0 of 12 blocks; 6 of 46 anchors have an empty candidate set | unambiguous |
| 13 | best 51 against production 53 **and worst 54**; all 53 on the 12 unexhausted blocks | unambiguous |
| 6 | clears 5 of 12 blocks — the best block-level result in the table — **and no board** | marginal |

Row 6 is the only arguable member, and **§7.0 states its positive half in the
same sentence** (*"row 6 clears five blocks and no board"*), so a reader is not
misled. The sharper point is in the other direction: the split is assembled from
four different senses of "limit" rather than one rule, and **by the document's
own strongest criterion — a board — eight of the eight are limits**, since rows 2
and 9 produce no board either. The claim therefore under-states its own result.
I would call it the most important sentence in §7 and it is not generous to
itself.

**One structural observation about the column, recorded because it is the whole
point of the task** (Minor M4/M5 below): every level-1 row is *also* untested
here. The implementer's reading — level 1 grades where a capability was shown to
work, level 3 is reserved for rows with no demonstration anywhere — is the only
reading that keeps all three levels non-empty, and it is the plain reading of
level 1's own evidence clause. It is defensible and I do not ask for a re-grade.
What is missing is that §7.1's closing paragraph explains the plan's missed
"most rows will be hypotheses" expectation **entirely** by the seven-plus-one
measured rows, without noting that six more are level 1 because a source or
paper read satisfies that level's letter.

B. NO FALSIFIED CLAIM WAS RE-IMPORTED
-------------------------------------

**Verdict: CLEAN. CONFIRMED by scanning the head table and the whole of §7.**

- *"No arm is worse by count"*: the string and every paraphrase I could
  construct (`never worse`, `not worse`, `cannot be worse`, `no order is worse`)
  appear **nowhere** in §7 or the head table except in §7.8's explicit
  disclaimer, which names it as false and gives the superseding figure (worst 54
  against production 53).
- *"The corpus's only text-over-text overlap is an artefact of the walk"*:
  likewise absent except in §7.8's disclaimer, with the superseding reading
  (four cover text, one moves under reordering, three do not).
- **Nothing implies re-walking is free.** Row 13's *does not fix* cell opens
  **"IT IS NOT FREE, AND AN EARLIER DRAFT SAID IT WAS."** and carries worst 54,
  the upper-bound caveat, the zero-fallback 36, and the 4/3-of-4 text figures.
  §7.5's first bullet carries the same 4 and 3-of-4. The only other occurrence
  of the word "free" in §7 is row 4's *"free gap between parallel obstacles"*,
  which is unrelated.
- **No row tables metric-fixing as promising.** Head table §1 leads with
  *"Wrong in both directions, and fixing it dissolves nothing."* Row 5's *does
  not fix* cell leads with **"THE BLOCKERS"** and carries 13 of 15 / 15 + 9 = 24
  / 20. §7.3 names row 5 as *"the finding most likely to be re-derived by
  somebody who has not read §1.9"*. CONFIRMED against §1.9's own `TOTAL`
  line `15 13 20 24`.
- **The two fallback populations.** §7.4 carries a dedicated bullet
  (*"DIFFERENT POPULATIONS AND MUST NOT BE COMPARED"*, 15 over 10 blocks of four
  parity circuits versus 53 over 48 blocks of eleven boards, ratio not re-taken),
  G274 clause 5 carries it as a register entry, and G232's amendment carries it
  in its comparison table. That is a correct and durable recording. **The head
  table is where it is not recorded** — see Important I3.

C. THE FIGURES IN THE HEAD TABLE
--------------------------------

**Verdict: the arithmetic relays are accurate; two descriptive claims are not.**
I spot-checked every figure in the head table against the section it names.

| head-table figure | source checked | result |
| --- | --- | --- |
| 264 strings; median 18%, max 87% | §1.7's ratio block (`median 1.182 ... max 1.865`) and its prose | CONFIRMED |
| smaller than KiCad's box for 70 | §1.7 (`SMALLER than this quantity for 70 of 264`) | CONFIRMED |
| 1270 / 1422.4 / 2043.1 µm | §1.5, §1.7 | CONFIRMED |
| 13 of 15; all 15 + 9 more | §1.9 `TOTAL 15 13 20 24` | CONFIRMED |
| 0 of 22 label options set | §2.1 (`label-related options this repository sets: 0 of 22`) | CONFIRMED |
| all 398 off every body, arm **e** | §2.5 (`e: ... own-body 0 other-body 0`) at all three heights | CONFIRMED |
| 266 | §2.5 (`e: ... wire 266`) at all three heights | CONFIRMED as a **crossing** count — see Minor M1 |
| four sides, no inside slots, no refusal path, test file never calls it | §3.2, §3.3, §3.10 | CONFIRMED (relay) |
| zero of six / seven with KiCad / eight with TeX | §4.8, §4.9, §6.8 | CONFIRMED (relay) |
| median 80, narrowest 20, 95 of 95 wider than four | §5.6's `STEP 3 CANDIDATE SET` block | CONFIRMED |
| orientation 5 of 12, some freedom 7, of the 5 three cleared | §5.7's `STEP 3 SUMMARY` TOTALS and `OF THE 5` lines | CONFIRMED |
| first-fit on 202 of 255, cost on 53 | §6.5 | CONFIRMED |
| 18 rows, 6 / 8 / 4 | counted by hand against §7.1 | CONFIRMED |
| "Not one of the eighteen **has been shown to** draw a board" | §7.2, G274 | CONFIRMED — the self-review's correction landed here too |

**Relayed figures are marked relayed**, collectively and explicitly: the head
table's preamble says *"Every figure in this table is `[RELAYED]` from the
section named beside it"*, and the one re-driven thing sits **below** the table
in its own paragraph marked `[RAN, CONFIRMED]`. That is the right shape and the
boundary is correctly drawn.

**The two descriptive defects are Important I2 and I3 below**, and both are in
the head table, which is where a transcription error propagates furthest.

D. THE ONE THING IT DROVE
-------------------------

**Verdict: CONFIRMED exactly, by re-driving `bun tools/schgen/board-sheets.ts`
myself and reading all 135 lines of output.**

- `0 of 11 boards produce a schematic` / `11 refused; 0 have no authoring
  declaration` — CONFIRMED verbatim.
- **Six boards refuse at `validateCircuit` before any text is placed** —
  CONFIRMED. The per-board problem counts, which I tallied from my own run's
  output rather than from the document: `pt2399-core` **18**, `pultec-hi-boost`
  **20**, `pultec-hi-cut` **14**, `pultec-low-boost` **14**, `pultec-low-cut`
  **14**, `pultec-mid` **28**. All six match. The two cause classes match:
  non-UPPER_SNAKE nets everywhere, plus a single-pin net on `pt2399-core` and an
  undeclared `MP`/`12` pin on each Pultec.
- **Of the five that reach layout**, the census names: a GND/VCC glyph touch
  first on `-buffered` and `-staged`, a missing t-junction on `-feedback`, a
  label-over-label on `-lab` and on `-loop`. So *"three of the five are refused
  on a first problem with no label in it — one junction, two power-symbol glyph
  touches"* is CONFIRMED.
- **The first-versus-only falsification is REAL.** CONFIRMED by driving it: the
  census prints exactly one `block <name>:` line per refused board, and for
  `transistor-preamp-lab` it prints `tp-leg-emitter-bypass` alone. §5.5a's
  committed `STEP 3 BOARDS` block records that same board as `LABEL-BLOCKED via
  tp-leg-emitter-bypass, tp-stage`. §5.8's sub-heading calls
  `tp-leg-emitter-bypass` *"the binding constraint on `transistor-preamp-lab`"*
  and §5.10 mechanism 2 says *"that block is the only thing refusing
  `transistor-preamp-lab`"*. Both are falsified by §5.5a of the same section and
  by my own run. G274 clause 1 records it correctly, with the distinction that
  **G262's own wording** (*"and by nothing else in front of it"*) is true and
  precise and only the two compressions are wrong. **Your pending §5 correction
  notice is warranted.** Not graded.
- **Why this matters for sizing the subject, which the document states and I
  endorse:** six of eleven boards are blocked upstream of every one of the
  eighteen approaches. The text work this whole plan surveys is not what stands
  in front of more than half the corpus.

E. THE §5 SLICE DECISION AND THE THREE NEW CASES
------------------------------------------------

**Verdict: the decision is sound, stated, and the three cases are real. I drove
each to red myself and restored the document byte-for-byte after each.**

**The decision.** §7 pastes no fenced block; §7.6 states it, states the two
alternatives (bound §5's and §6's slices; or widen §6's pinned tally), and says
why both were declined — they edit a closed section's evidence contract for a
block §7 does not need. CONFIRMED that §7's slice is empty and that §7 measures
almost nothing, so there was nothing it needed to paste.

**Drive 1 — case 1, and the hazard itself.** I inserted a
` ```solution-space STEP 1 ` block at the end of §7. Result: case 1 went red,
naming the fence word —

```
- []
+ [ "solution-space STEP 1" ]
```

— and, decisively, **§6's own pinned-fence case went red at the same time**,
reported as `section 6's pasted output, against section 6's own log > section 6's
source transcriptions are declared, counted, and in no log's namespace`. **That
is the hazard §7.6 describes, reproduced: a §7 block fails §6's guard with a
message about §6.** The decision was not theoretical.

**Drive 2 — case 2.** I changed one `kp-src` fence word inside §6 to `kpsrcZ`.
Case 2 went red (`+ "kpsrcZ": 1`). So case 2 is coupled to the document's actual
§6 fences and is not tautological, and its `clean` tally is computed from the
unperturbed `doc` rather than from `perturbed` — it is a real control, not the
treatment's answer returned twice.

**Drive 3 — case 3, and this is stronger than the report claims.** I renamed the
head-table anchor to `WHAT THE SIX SECTIONS FOUND`. Case 3 went red. I then
computed what the **ordering** assertion alone would have done with that anchor
missing:

```
indices: [-1, 6336, 50339, 108441, 165635, 229903, 290356, 358462]
BARE ORDER assertion sorted(at) == at  ->  True
```

**The order assertion PASSES while the head table is gone.** Only the
presence-before-order assertion catches it. So case 3 does **not** repeat the
`indexOf` defect recorded earlier on this branch — it is precisely the fix for
it, and it is load-bearing for the first anchor, which is the head table this
task added. CONFIRMED.

**Restoration.** After each drive the file was restored with Edit and verified
by SHA-256 against a pre-drive hash
(`f8fa71a5490ef5640b984811ab3566d88026b7f2af8650f2ce64086c711d1767`). `git
status --porcelain` is empty. No `git checkout` was used.

**The `expect()` accounting.** CONFIRMED by reading the three cases: case 1 has 2
assertions, case 2 has 4, case 3 has 2 = **+8**, and +3 tests. CONFIRMED that
**no existing assertion was loosened**: `git diff --numstat 5ca6f2d..d855a5d`
reports `89 0` for the test file — **zero deletions**, so nothing existing was
touched at all.

ALSO VERIFIED
-------------

**Confinement — RE-DERIVED, and the conclusion holds while two published figures
do not.** Anchoring on the full `§1 Real text metrics, and how wrong the current
ruler is` and `§7 The solution space, and what it costs` heading lines (I had to
use the full §7 line; the bare `§7 ` string is not unique because the head table
cites it):

```
parent 5ca6f2d  [§1 .. EOF]   352648 bytes  b9fd12dd...64d13f9a
child  d855a5d  [§1 .. §7)    352648 bytes  b9fd12dd...64d13f9a
bytes above §1: parent 1695, child 6357; identical over the first 1695
```

**The hash matches the published value exactly**, so **not one word of §1–§6
changed** — CONFIRMED, and independently corroborated by the cumulative
`--numstat` showing **0 deletions** in the research document across all three
commits. The two byte figures are wrong (Important I1). The document's claim
that *"both slices hash to b9fd12dd…"* is true only with the child slice's
trailing newline normalised, which §7.7 does say (*"up to its trailing
newline"*).

**The suite.** `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`
→ **3812 pass / 0 fail / 43602 expect() calls across 353 files** in 150.46 s.
Exactly the reported figures, and the term-by-term accounting (+3 tests, +8
expects, 353 files unchanged) is CONFIRMED against the three cases I read.

**Typecheck.** `bun run typecheck` → `tsc --noEmit`, no output, exit 0.
CONFIRMED.

**`make check`.** Not run by the implementer and not run by me — running it
regenerates derived artifacts and my constraints forbid leaving a file modified.
**The characterisation is confirmed structurally rather than relayed blindly:**
G251 records four of eleven boards refusing in two cause classes, pre-existing on
this branch and measured identically before and after Task 19; and the whole
change touches `docs/known-gaps.md`, `docs/schematic/text-handling-research.md`
and one test file — **nothing under `lib/`, `circuits/`, `boards/`, `tools/` or
the `Makefile`** — so it cannot have moved `make check` either way. That
diffstat is a check that could have failed.

**Step 5 does not end in a recommendation, and all three owner decisions are
named and unanswered.** CONFIRMED by reading §7.5 and by scanning the whole of
§7 and the head table for recommendation and election language (`we should`,
`recommend`, `the right move`, `the answer is to`, `ought to`): every hit is a
statement that §7 *does not* recommend.

1. **How much overlap is acceptable — `G260`.** Named, with four supporting
   figures, and explicitly *"with no recommendation attached"*. Row 14 adds
   *"Nothing here answers that or may be read as implying an answer."*
   **Unanswered** ✓
2. **Which of the three text-geometry quantities governs a collision — `G265`
   clause 4.** Named, with a three-row comparison table. It reports that a
   third-party review held ink bounds govern and that **the plan declined to
   settle it**, attributing both to their sources. **Unanswered** ✓ — the
   section elects nothing and says §1 *"characterised all three and elected
   none"*.
3. **Whether the infinite/finite badness split should be declared.** Named as
   the third, carried from §6.3/§6.11, quoting §6.3's own *"What that split
   should be is an acceptance criterion and is the owner's."* **Unanswered** ✓

§7.8's first bullet closes it: *"It elects nothing, recommends nothing, authors
no acceptance criterion and schedules no work."*

**The G268 amendment — quotation verified against the rendered page, not the OCR
layer.** I fetched `https://gwern.net/doc/design/typography/tex/1981-knuth.pdf`,
confirmed SHA-256 `ecc2354ce16693d9152803d56e930fb1b553783eec837a55ab32803ef41d9895`
against §6.1's pin, rendered **PDF page 32 = journal page 1150** at 200 dpi with
`pdftoppm`, and read the page image. The last paragraph above Figure 14 reads:

> …so the active list is forcibly prevented from becoming empty by simply
> declaring a breakpoint to be feasible if it would otherwise leave the active
> list empty. This results in an overset line and an error message that
> encourages the user to take corrective action.

**Both quoted fragments are verbatim and both are on p.1150**, confirming §6.8's
correction of the round-0 mis-citation to p.1162. **I did not grep for a
paraphrase; I read the rendered page.** The amendment itself is correct on both
halves: it says the *behaviour* now has a 1981 primary source, it says
explicitly that **TeX is not Allegro** so the entry does not close, it keeps the
criterion *"word for word"*, adds no mechanism, and is marked **RELAYED**
because the writer did not open the PDF. All four conditions met.

**G274, G275 and the G232 / G259 / G260 amendments.** All dated **2026-10-23**.
Each states what was found, where, what evidence establishes it, a CONFIRMED /
RELAYED split (G274: CONFIRMED for the census, the board table and the
first-versus-only disagreement, RELAYED for every §5 and §6 figure; G275:
CONFIRMED for the reading and the grading decision, RELAYED for §6.5's figures;
G268: RELAYED outright), and a *what would settle it* with **CRITERION distinct
from MECHANISM and every mechanism marked UNTRIED**. G260's amendment is the
sharpest of them: it establishes that its own criterion has no artifact to judge
and says so without widening the criterion or proposing a substitute. G232's and
G259's amendments author no criterion and elect no quantity. None of the entries
is marked closed; G274's clause 1 is correctly left open because no agent
rewrites a closed section.

**The self-review commit.** I read all five corrections and verified the
corrected state of each: row 14's board figure is now UNMEASURED and the
downstream "not one draws a board" is now "has been shown to draw" in all three
places; row 12 says TWO of four parts are here, matching §6.3; row 11 cites Task
5's Chapter 3 limitation; row 16 says **five** readability numbers, matching
§6.6's verified `SchematicMeasures` fields; row 18 cites G232's Task 21
amendment. I also verified both corrected quotations: the plan's self-review is
split at a real em dash (`U+2014`, confirmed in the plan file's bytes), and §1's
opening is quoted as two fragments two sentences apart, which is accurate. I
spot-checked a further seven cells of the same kinds the self-review caught —
row 12's quoted `field-placement.ts` header (**exists verbatim at `:40`**), row
6's `4⁴`/`4⁶`, row 7's five best totals, row 8's 6-of-46, row 5's 4-of-8, row
14's 8-of-8 and 15-of-21 — and all are correct. **One thing of the same kind
survives, and the self-review commit is what introduced it:** the confinement
figures in §7.7 (Important I1).

**Nothing fixed.** CONFIRMED: three files, `docs/known-gaps.md` (+400),
`docs/schematic/text-handling-research.md` (+545),
`tests/schgen/text-metrics/document-pastes.test.ts` (+89), **zero deletions**.
No `lib/`, no `circuits/`, no `boards/`, no `Makefile`, no
`tools/schgen/port-manifest.json`, no `package.json`.

**No AI attribution.** CONFIRMED: `git log 5ca6f2d..d855a5d --format='%H%n%B'`
piped through a case-insensitive grep for `co-authored|claude|anthropic|generated
with|session` returns nothing.

FINDINGS
--------

**CRITICAL: none.**

**IMPORTANT**

**I1 — §7.7's and G274 clause 6's confinement figures are wrong, and one of them
is stale in the way this branch has a name for.** `[RAN, CONFIRMED]` The slice
length is **352 648 bytes**, not the published *"352 125"*; no plausible anchor
convention over the parent produces 352 125, and the matching hash proves the
content is the content I measured. The insertion is **4661 bytes** (4662 with its
trailing newline), not the published *"4643"*; at commit `7951a9d` it was 4644,
so **the self-review commit's own edit to the head table invalidated the figure
in the same commit that published it** — a stale control the task's own output
invalidated. Only *1695* is right. The same two figures appear in `d855a5d`'s
commit message. *Failure scenario:* a later reader follows §7.7's explicit
invitation to re-take the check, gets the right hash and two wrong byte counts,
and concludes either that the procedure is unreproducible or that §1–§6 have
moved since — the opposite of what the paragraph exists to establish.

**I2 — the head table misstates evidence level 3 as "untested anywhere".** The
plan defines level 3 as *"untested **here**"*, and §7.0 reproduces it correctly.
The head table's §7 row says *"four are untested anywhere"*, which is false on
this document's own evidence for at least two of the four: row 14's
place-and-log behaviour is attested in **eight** systems (six tools in §4, KiCad
in §3, TeX in §6.8), and row 17's `labelManager` is a real ELK option in §2.1's
inventory. *Failure scenario:* the first description a reader meets of the
grading column — the column the whole task exists to produce — tells them that
row 14 has no precedent anywhere, and they dismiss the one approach the document
identifies as able to move the board count.

**I3 — the head table places the two incompatible fallback populations within
eight lines of each other with no warning.** §1's row carries *"13 of 15
recorded field fallbacks"* (over 10 laid-out blocks of four parity circuits) and
§6's row carries *"consults its cost on 53"* (over 48 blocks of eleven boards).
The statement that these are different corpora and must not be compared lives in
§7.4, about 5 400 lines later, and in G274 clause 5. The implementer flagged this
as its own concern and recorded it well in the two durable places — but not in
the one place a reader meets first. *Failure scenario:* a reader applies §1's
13-of-15 survival ratio to §6's 53 and reports that roughly 46 of the 53 are
real geometry — a number nobody has measured and which §6.10 explicitly says has
not been re-taken.

**MINOR**

- **M1** — head table §2: *"routed 266 wires through the space it had
  reserved"*. The measured quantity is 266 **label-over-wire crossings** (§2.5's
  `wire` column); §7.1 row 2 states it correctly. *Scenario:* someone cites a
  wire count that was never taken.
- **M2** — §7.8: *"the four INTEGRATION HYPOTHESIS rows have no figure of any
  kind behind them"*. Rows 14 and 16 carry figures in their cells (zero-of-eight;
  §6.6's five). The error is toward under-claiming. *Scenario:* a reader skips
  row 14's eight-system evidence on the strength of this sentence.
- **M3** — row 18 grades as ESTABLISHED ELSEWHERE a cell whose lead sentence is
  a result from **this** repository (*"The only instance of this here was the
  owner's own and it worked"*, G257). Defensible via §4.3's xschem read, and it
  errs conservative. *Scenario:* a reader concludes text suppression was never
  tried here.
- **M4** — §7.1's closing paragraph explains the plan's missed
  "most-rows-are-hypotheses" expectation entirely by the eight measured rows,
  without noting that six further rows are level 1 because level 1's evidence
  clause admits a source or paper read while they remain untested here. Each
  row's own cells disclose it. *Scenario:* a reader takes "only four are
  hypotheses" as meaning fourteen have been shown to work here.
- **M5** — §7.0 says KiCad's autoplacer *"is exactly that: … still an
  INTEGRATION HYPOTHESIS in ours"*, while rows 3 and 4 grade it ESTABLISHED
  ELSEWHERE. Coherent under §7.0's own resolution two sentences earlier, but the
  sentence reads as a grade. *Scenario:* a reader thinks rows 3 and 4 are
  mis-graded and re-opens a settled column.
- **M6** — the second test case is named *"a fenced block inserted into §7"*; it
  is appended after the whole document. Functionally identical, since §7 is last.
  *Scenario:* a future agent moves §7 and trusts the name over the code.
- **M7** — head table: *"of those five, the blocker the census names involves
  text on two"*. For `-buffered` and `-staged` the census's blocker line does
  name labels, after the glyph touch; §7.2's *"the FIRST problem has no text in
  it"* is the precise form. *Scenario:* a reader counts two text-blocked boards
  where the census line mentions text on four.

WHAT I DID NOT CHECK
--------------------

I did not re-drive §1's, §2's, §5's or §6's probes — §1's needs `kicad-cli`,
KiCad's Python bindings and the external font blob, and the others were out of
scope for a synthesis review. Where I checked their figures I read the committed
blocks those sections paste, which are the same blocks the suite asserts against
a log on every run. I did not run `make check`, for the reason given above. I
opened one primary source (Knuth and Plass p.1150) and no other; §3's, §4's and
§5's source reads are relayed here as the document records them, and §7.8's own
last bullet states the same limitation about itself.
