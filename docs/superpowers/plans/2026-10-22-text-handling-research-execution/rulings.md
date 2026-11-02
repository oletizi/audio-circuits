# SDD ledger — plan: docs/superpowers/plans/2026-10-22-text-handling-research.md

Branch `feature/schematics-tooling`, worktree
`/Users/orion/work/audio-circuits-work/pultec-modularize`, BASE `1635fd4`.

**No spec.** The plan says so deliberately: this research PRECEDES a spec.
Standing in for one: `docs/schematic/text-placement-prior-art.md`,
`docs/known-gaps.md` G232/G239/G257/G258/G260/G261/G262/G263/G264, and
`CLAUDE.md`'s mandate section. **Rulings made here are therefore provisional**
in the skill's sense, and the register is the authority they answer to.

The previous plan's ledger lives at
`.superpowers/sdd/2026-10-19-schematic-authoring-m1/progress.md` — 7,068 lines,
another plan's progress, left alone.

---

## PRE-FLIGHT SCAN

Every task pair that shares a file or an interface, plus every task against
itself. Written as checked.

### Shared files — every task writes the same document

| tasks | shared | what one produces / the other consumes | finding |
| --- | --- | --- | --- |
| 1 → 2,3,4,5,6,7 | `docs/schematic/text-handling-research.md` | Task 1 CREATES it; 2-6 each append one section; 7 adds a head table | **SERIALISATION CONSTRAINT, not a conflict.** Sequential execution satisfies it. Noted because the skill allows batching same-shape work and **batching is forbidden here** - two subagents appending sections to one file would collide. |
| 1 → 2 | same document | Task 2 "Consumes: Task 1's document header" | Task 2 cannot run before Task 1 creates the file. Order already enforces it. |
| 1 → 7, 2 → 7, …​ | same document | Task 7 synthesises all six | Must run last. Order enforces it. |
| 1 → 5 | `docs/known-gaps.md` G239, G260 (Task 1); G262 (Task 5) | disjoint entries | No conflict. |
| 4 → 1 | `docs/known-gaps.md` G260 | **BOTH amend G260** - Task 1 on its fallback arithmetic, Task 4 on what other tools do on failure | **CONFLICT, ruled below (R1).** |
| 7 → 1,4 | `docs/known-gaps.md` G232, G259 | Task 7 amends the scoreboard entries | No other task touches G232/G259. No conflict. |
| 1 → all | `docs/schematic/README.md` | Task 1 modifies once | No conflict. |

### Interfaces — producer against consumer

| producer | artifact | consumer | finding |
| --- | --- | --- | --- |
| 1 | `TEXT GEOMETRY`, `ERROR TABLE` | 3 (KiCad places with real advances), 5 (the blocked overlaps are computed from `outlineExtent`), 7 | Names match in both directions. OK. |
| 2 | `ELK LABEL INVENTORY` | 7 | OK. |
| 3 | `KICAD ALGORITHM` | 4 (baseline to compare), 5, 6 | OK. |
| 4 | `TOOL BEHAVIOUR TABLE` | 6, 7 | OK. |
| 5 | `LABEL-ON-ANCHOR SURVEY` | 7 | OK. |
| 6 | `OPTIMISATION FRAMING` | 7 | OK. |
| 7 | `SOLUTION SPACE` | nothing | Terminal. OK. |

### Each task against itself

| task | its own text agrees? | finding |
| --- | --- | --- |
| 1 | Step 0 names three quantities; Steps 3, 4, 5 each carry a per-quantity column or count | Consistent after the review revision. OK. |
| 2 | Step 5's experiment is a scratch program; the plan's Global Constraints forbid touching `lib/`/`tools/` | Consistent - a scratch program is neither. OK. |
| 3 | Reads a source file at the version matching the installed CLI, and reports the version | Self-consistent. OK. |
| 4 | Steps 3-4 classify per tool and refuse to generalise; the task title says "every other EDA tool" | **Title overclaims what the steps permit. Ruled below (R2).** |
| 5 | Step 2 needs a generated sheet to rotate a label in | **CONFLICT WITH REALITY, ruled below (R3).** |
| 6 | Step 3 forbids inventing a cost function; the task is about cost models | Consistent - surveying costs is not authoring one. OK. |
| 7 | Step 3 ranks evidence; Step 5 names what the owner must decide | Consistent. OK. |

### Plan mandates that a review rubric might call a defect

| mandate | risk | finding |
| --- | --- | --- |
| Every task writes prose, no tests | A reviewer expecting tests finds none | **Not a defect: this is a research plan and the Global Constraints say no task changes code.** Carried into every reviewer dispatch so it is not raised seven times. |
| Task 2 and Task 5 run scratch programs that are deleted | "Unreproducible figure" - a class this branch has recorded twice | **Ruled below (R4).** |

---

## RULINGS BEFORE EXECUTION

**R1 — Task 4 amends G260 only on failure behaviour; Task 1 owns its arithmetic
clauses.** Both touch G260. Task 1 runs first and amends the fallback arithmetic
under real geometry; Task 4 appends the other-tools failure taxonomy and touches
no figure Task 1 wrote. Each dispatch names its half.
  Cost if wrong: one entry gets two amendments that read oddly together, and the
  final review reconciles them.

**R2 — Task 4's title is "every other EDA tool" and its steps forbid
generalising. The STEPS bind.** The title is a heading, not a claim; its own
Steps 3-4 (added by the review revision) require per-tool scope and three
evidence grades. The dispatch will carry the steps' scope and tell the
implementer the title is not a target. **I am not renaming the task** -
renumbering or retitling a committed plan mid-execution is how a plan and its
ledger drift apart.
  Cost if wrong: a reader of the plan's table of contents over-reads the title.

**R3 — Task 5's experiments run on the `mini` fixture and on hand-built
two-segment fixtures, NOT on a generated board sheet, because no board
generates.** Step 2 says "rotate a global label in a generated sheet". **0 of 11
boards produce a sheet** (`docs/known-gaps.md` G259), so as written the step
cannot run. The `mini` design fixture DOES generate - three sheets with global
labels and intersheet refs, exported to PDF yesterday. And the negative control
the review specified (two electrically separate segments joined only by a shared
label name) has to be hand-built in any case, because no circuit here contains
one.
  **This is legitimate and the reason is on the record**: Task 5 Step 2 tests
  KICAD'S OWN netlist semantics, not this generator's output, so a hand-built
  `.kicad_sch` is the right subject - the same reasoning the register accepts at
  G196 and R61 for a hand-built fixture inside a function's own declared domain.
  **What the dispatch must forbid**: reporting a `mini`-based result as a
  statement about the eleven boards.
  Cost if wrong: the freedoms are established on KiCad's semantics and on a
  fixture rather than on a board, and Task 5 Step 3's per-board freedom
  measurement - which uses the real blocked boards - is where that gap closes.

**R4 — A scratch program whose figure is published must be committed.** Tasks 2
and 5 run probes. This branch has twice published a `[RAN]` figure whose script
was a throwaway, and the correction cost a round each time; the second correction
established that **committing the script is not sufficient - the INPUT must be
pinned**, because a script run against a moving tree is as unreproducible as a
shell line. So: any probe whose numbers reach the document or the register is
committed under `tools/schgen/` or `tests/`, and pins the commit it measured.
A probe whose numbers do NOT reach either may stay in the scratchpad.
  Cost if wrong: two or three small committed probes that nothing else calls -
  which is the built-but-unwired pattern (G226), and R4 accepts that cost
  knowingly over an unreproducible figure.

**R5 — "Research only" is the binding constraint and it outranks any finding
that asks for a fix.** Every task's reviewer will be told this. A reviewer
finding that says "and this should be fixed" is out of scope by construction and
goes to the ledger as a deferred minor, not into the fix loop.
  Cost if wrong: a real defect found during research waits for a later plan,
  which is what the register is for.

---

## TASK 1 — reported DONE_WITH_CONCERNS

Commits `757c4dd`, `56eb6ba`, `53c31bb`, `fcc104e` on BASE `1635fd4`, pushed,
attribution-free. **3758 pass / 0 fail across 350 files** with `SCHGEN_SOURCE`
set — HEAD's figure unchanged, as a no-code-change task should be. It did NOT
start there and said so: first run 3756/2, from the port-fidelity guard refusing
an undeclared `.ts` under `tools/schgen/` (fixed by declaring the probe) and one
PDF test timing out at 5076 ms against a 5000 ms limit under load.

**ALL THREE ROUTES WORKED**, which the brief treated as unknowable in advance,
and they agree: **0.0 µm** route-1-vs-route-2 across all 264 strings, **0.3 µm**
route-1-vs-route-3, **1.5 µm** formula-vs-PDF. Route 1 read 8 KiCad source files
at tag 10.0.5; route 2 used the installed `pcbnew` bindings (**KiCad ships no
eeschema bindings**, so the `EDA_TEXT` measured is a `PCB_TEXT`); route 3 drove
`kicad-cli`.

**THE HEADLINE INVERTS MY PREDICTION, AND THE RULER IS WRONG IN THE OTHER
DIRECTION.**

| | current model | Q1 advance | Q2 ink | Q3 `GetTextBox` |
| --- | --- | --- | --- | --- |
| G260 fallbacks, total | **15** | 13 | 20 | **24** |
| of the fifteen, still a fallback | — | 13 | 14 | **15** |
| new under this quantity | — | 0 | 6 | **9** |

**Thirteen of fifteen survive all three quantities and NONE is an artefact of the
ruler under all three. Under KiCad's own box all fifteen survive and nine MORE
appear.** I said in this session that I expected some of these impossibilities to
dissolve under real metrics. They do not. **The model over-reserves in WIDTH —
median 18%, max 87% — and UNDER-reserves in HEIGHT**: a line is 1270 µm by the
current model, 1422.4 µm of ink, and 2043.1 µm by KiCad's own box. It is **too
small for 70 of 264 strings** against KiCad's box, by up to 524.6 µm.
  **So the axis I fixated on all session was the wrong one.** The quantities
  differ by ≤0.63 grid steps in width and **44% in height**, and height is what
  moves the counts — which is also what makes the Step 0 election consequential
  rather than academic.

G239's five-of-eleven is **ruler-independent**: 0 of 5 inside slots under all
four rulers for the three small passives, **5 of 5 under all four for the PT2399
positive control** — so the control discriminates, and the headroom shortfall is
*larger* than the entry said. Drawn-text overlaps: 8 under the current ruler,
which **reproduces the three blocked blocks' published refusals exactly**; 4
survive, 4 vanish, 5 new under ink and under KiCad's box, and **each blocked
block's own blocking pair survives all three.**

**The review's claim, driven.** The three-quantity distinction is real and
consequential — accepted. *"Strokes may extend outside their nominal advance"* is
**structurally possible and FALSE for this glyph set**: over all printable ASCII
exactly one glyph overhangs, the backslash, which this repository never emits. My
push-back was right to demand it be measured; the answer is that it does not
apply here.

**Two tooling findings worth more than their size.** `kicad-cli sch export svg`
at 10.0.5 draws a global label's text and **NOT its outline**, where PDF draws
both — found by a probe refusal, and it means **any SVG-based measurement
under-reports a label by 3333.75 µm along its side.** And KiCad sizes a text box
with a pen (158.75 µm) it does not plot with (152.4 µm).

**It elected nothing.** G265 clause 4 records the election as the owner's, with
the 13/15/20/24 figures he needs to make it.

**Ruling R6 — the `port-manifest.json` change is ACCEPTED, and my R4 caused it.**
It declared nine probe modules `handWritten` because R4 required the probe
committed under `tools/schgen/` and the port-fidelity guard refuses an undeclared
`.ts` there. It offered to move the probe. **No**: a provenance declaration is
not a behaviour change, and moving a committed probe out of the directory whose
fidelity guard exists to know what is in it would be dodging the guard rather
than satisfying it. `handWritten` is the category for exactly this and already
holds 117 entries. Disclosed in G265 clause 5.
  Cost if wrong: nine entries in a manifest, and the ported root is nine modules
  less pure than it was.

**Ruling R7 — Step 4's overlap recomputation covering the overlap SUBSET of the
text-scene pass is a STATED LIMIT, not a defect.** It does not re-grade "lies
under" or "crosses the border of". It **reproduces the three blocked blocks'
published refusals exactly under the current ruler**, which is the validation
that matters, and the limit is stated in both §1.10 and the report. **Deferred
minor** for the final review; a full text-scene recomputation is a larger probe
and Task 7 can carry the pointer.
  Cost if wrong: a quantity that flips a non-overlap relation would not show in
  §1's counts.

`Task 1: minor (deferred): the overlap recomputation is the overlap subset of
render/text-scene.ts, not the whole pass — a quantity flipping a "lies under" or
"crosses the border of" relation would not appear in §1's counts (R7).`

## TASK 1 REVIEW — SPEC COMPLIANCE: PASS. TASK QUALITY: PASS, one Important.

Reviewer's own words: the strongest evidentiary work on this branch. Suite 3758/0
across 350 files reproduced exactly; typecheck exit 0; both repos clean.

ALL FIVE NAMED ATTACKS HOLD. The one I most wanted broken - three routes
agreeing to a third of a micrometre, which is also what two secretly-identical
computations look like - held against an INDEPENDENT REIMPLEMENTATION: the
reviewer wrote its own Python font parser and its own box/ink transcription and
got 0.000000 um on box width against the compiled binary over 15 strings, with
negative controls that DID move (a wrong INTER_CHAR gives 63.5 um, length*GRID
gives 6430.1 um). So the agreement discriminates rather than being an artefact.
Honest architectural note it surfaced: all 264x3 figures come from route 1's
glyph table and routes 2 and 3 are VALIDATORS - but because box width is a
function of the advance sum, the exact agreement with pcbnew pins the advance sum
too, so Q1 is validated without any route exposing a raw advance.

The 70-of-264 under-count re-derived exactly, and characterised better than the
report did: EVERY ONE of the 70 is 1-5 characters long, so short strings of wide
glyphs is the data rather than rhetoric. The 13-of-15 claim needed SET ALGEBRA
rather than addition and it did it: advance-minus-ink and advance-minus-box are
both empty, so the three-way intersection is exactly 13 literally and not an
addition that lands there. Every row of the four-column table closes.

It also drove a claim section 1 asserts that no pasted line established - the
ordering ink < advance < box - and found zero violations over 264 strings.

And it was honest about its own limit: it did NOT open KiCad's source itself, so
the eight READ marks are RELAYED from the implementer. Its argument for why that
is acceptable is sound - the arithmetic those files are claimed to contain is
corroborated to zero nanometres by the installed binary and by its own
transcription, a check that could have failed and did fail under a wrong
constant.

FIX ROUND 1 DISPATCHED: I-1 plus four minors folded in, M-5 deferred.

I-1 IMPORTANT: a dead function in the committed probe asserts a cross-check that
does not run. svg-probe.ts:170 svgTextLengths is documented as a FOURTH
independent reading that probe.ts reports against the font source's advance sum;
probe.ts does not import it and the symbol appears at exactly one site, its own
definition. The comparison has never been performed. And the sharp part: Q1
currently has NO CHECK OF ITS OWN, so the fourth confirmation is the one that
would have been free. Eleven-routes-to-a-false-green class exactly.

Ruling R8 - FOLD M-2, M-3, M-4 and M-6 into the same round rather than deferring
them, because three of the four are about figures the OWNER will read when he
makes the election G265 reserves to him. M-2 especially: the pen discrepancy
contributes 22.3 um of the 773.1 um box excess (2.9 percent, driven by the
reviewer) and nothing says so, so he could discount the box height as a KiCad
bookkeeping artefact on a suspicion the measurement already refutes. A minor that
can mislead the person the measurement was taken for is not a deferrable minor.
  Cost if wrong: four small edits in a round that was happening anyway.

Ruling R9 - I-1's mechanism is WIRE IT IN rather than delete, because the
reviewer establishes Q1 has no independent check and this would be a free one -
but the criterion binds and deletion is acceptable if wiring it turns out not to
be the free fourth reading the comment claims. AND: if the comparison DISAGREES,
that is a finding to report rather than reconcile, because a disagreement would
mean the advance table is wrong.
  Cost if wrong: four lines of probe wiring, or a deleted function and comment.

Task 1: minor (deferred): three unused exports in the committed probe - inkExtent
takes drawnPen as a bare argument with no tie to the measured constant, so a
later caller could get an ink extent from a pen nobody measured (M-5).

Task 1: fix round 1/5 (5 addressed, 0 open; commits fcc104e..698e03c, 8 commits)

I-1: THE FOURTH READING AGREES. 23 strings, 1 to 17 characters: textLength minus
advance sum is a CONSTANT 203.2 um, worst departure 0.4 um. It answered what it
would have taken to disagree - non-constant under any advance-table error, a
single wrong glyph shifts only strings containing it, and the systematic case
(length*GRID) departs by 5986.8 um, 14819 times wider. Blind to a constant error
applied equally to every string, WHICH IS WHY IT IS A FOURTH READING AND NOT THE
ONLY ONE. Q1 is no longer the quantity with no check of its own. The 203.2 um is
4/3 of the plotted pen and is UNEXPLAINED - recorded undiagnosed, because an
agent reading textLength as an advance is 203.2 um over on every string.

M-2 reproduced my figures and produced the sentence that protects the election:
at the plotted pen the box is STILL 2020.8 um, 59 percent taller than the model.

M-3 FOUND A ROUNDING DEFECT: labelOutlineExtent rounded at micrometres where
KiCad rounds at nanometres, so NEITHER 3333.75 NOR 3333.003 had been driven -
both were wrong. Now 3333.8 by source, 3334.3-3334.5 by PDF, and formula-vs-PDF
improves 1.5 to 0.8 um.

M-4 FOUND THAT THE ORIGINAL CLAIM COMPARED A WIDTH TO A HEIGHT. Seven times
wider than its body is 7.22x the body HEIGHT and 3.25x its WIDTH. That is MY
claim - I relayed seven-times-wider to the owner twice. Survives, number 10-13
percent high, framing wrong.

M-6: box width exactly equal on all 264; the stroked outline is not - 40 of 264
land 1.5 NANOMETRES apart.

RULING R10 - WHAT M-6 TURNED OUT TO BE AN INSTANCE OF IS THE MOST IMPORTANT
FINDING OF THE ROUND AND A NEW FAILURE CLASS FOR THIS BRANCH. Looking for the
shape mechanically rather than by eye, it found SEVEN FENCED BLOCKS EDITED AFTER
PASTING: a truncated line, a control that lost its parenthetical, two tables
re-padded so columns lined up, a rewrapped claim, and a block left stale. NONE
CHANGED A FIGURE; ALL ARE EDITS TO EVIDENCE. Its own framing is the lesson: the
honest version of round 1s every-number-driven is that the numbers were, and
seven blocks around them were not pasted as they came.
  A re-padded table is indistinguishable from a real paste BY EYE, which is why
  no reviewer on this branch has caught it and why the mechanical checker
  (verify-pastes.py, committed, driven RED twice against perturbed copies) is the
  right remedy rather than more care. Every report this session pasted output.
  Cost if wrong: a checker that holds documents to logs, which is cheap.

And a deferred minor turned out to contain a real defect: boxPenWidth had been
returning 159 um where KiCad uses 158.75. Deferring it would have left a wrong
constant - worth remembering next time I defer an unused export.

Task 1: fix round 1 re-review - ALL FIVE FINDINGS ADDRESSED, each re-derived
from the reviewer's own fresh run rather than read. Suite 3758/0/350 and
typecheck exit 0 driven. Three of the four named attacks HOLD: the fourth
reading's residual re-derived over a DISJOINT 8-string sample (median 203.1,
worst departure 0.1 um) and its sensitivity driven by corrupting one glyph by
+381 um, which moved the worst departure from 0.1 to 381.0 and ISOLATED IT TO
THE ONE STRING CONTAINING THAT GLYPH - exactly the discrimination claimed;
M-3's new number re-derived by hand from source constants AND from the
reviewer's own PDF export, with both ends of the 1.5-to-0.8 improvement checked;
and the survivor table reproduced cell for cell despite two commits having
changed probe arithmetic.

RULING R11 - THE PASTE-FIDELITY CHECKER DOES NOT HOLD, AND THIS GOES INTO FIX
ROUND 2 AS NEW BREAKAGE IN THE FIX DIFF. The reviewer drove it green, reproduced
both of the implementer's red drives, and then DEFEATED IT TWO WAYS against
documents it had made unambiguously wrong:
  (a) it swapped a genuine line from elsewhere in the SAME LOG into the wrong
  row and the checker passed, because its membership test is FLAT OVER THE WHOLE
  LOG rather than per-block and positional.
  (b) it fabricated 4 of 6 lines in a block, leaving 2 genuine anchors - the
  block fell below the 50 percent output gate and was SILENTLY EXCLUDED FROM
  CHECKING ALTOGETHER, with its own diagnostic showing the block count drop from
  14 to 13.
  (b) is the worse one and it is this repository's cardinal sin INSIDE THE TOOL
  BUILT TO PREVENT IT: a block edited enough stops being checked, and the
  checker reports success. A remedy with a hole is worse than no remedy because
  it licenses confidence.
  Crucially the five findings stay ADDRESSED: the reviewer verified every figure
  independently against a fresh run and FOUND NOTHING ACTUALLY WRONG in the
  document. This is a tool defect, not a document defect.
  Cost if wrong: one more round on a tool nothing else depends on yet.

RULING R12 - WIRE THE CHECKER INTO THE SUITE SO IT CAN FAIL. The reviewer
disclosed it is not wired into make check and did not call that a finding. I am
ruling it in, narrowly: an evidence-checker that nothing runs is the
built-but-unwired pattern applied to the very artifact class it polices, and
this branch has recorded that pattern four times. Into bun test, which is green
and runs, rather than make check, which exits 2 for pre-existing reasons.
  Cost if wrong: one test that reads a document and a log.

Second time today a SMALLER model found what a larger review would plausibly
have passed, and both times the difference was a NAMED SUSPICION rather than
capability. The sample is two; I am not generalising it past that.

Task 1: fix round 2/5 (3 addressed, 0 open; commits 698e03c..3e52044, 5 commits).
Suite 3769/0 across 352 - baseline moved DELIBERATELY and by R12: +11 tests,
+2 files, the two research checks this round added, nothing pre-existing changed.

ITEM 1 - BOTH HOLES CAME FROM THE CHECKER INFERRING WHAT A BLOCK WAS, AND IT NO
LONGER INFERS. A block declares itself: a run fence must equal a CONTIGUOUS
slice of the log in order; any other fence must share NO line with the log and is
listed BY NAME as not checked. No gate, so nothing to fall below. Every block is
VERIFIED, NOT-OUTPUT or FAILED, and the suite asserts that the three sum to the
block count - which is exactly the property hole (b) violated. Replacing
inference with declaration plus a totality assertion is a better fix than
patching the gate.

AND IT FOUND A THIRD ATTACK ITS OWN FIX OPENED. Removing the gate makes
is-this-output the whole question, so DECLARING a block not-output becomes the
new escape. Closed by requiring a non-output block to share no line with the log.
Driven red. The reviewer could not have found this - it attacked the version that
existed.

RULING R13 - ADOPT ITS SUGGESTION AS STANDING PRACTICE FOR THE REST OF THIS
PLAN: every brief that asks for a remedy also asks the implementer to HUNT THE
ATTACK SURFACE THE REMEDY ITSELF OPENS. A reviewer attacks what exists; only the
author of a fix is positioned to see the new way out it creates. Attack (c) is
the evidence and it cost one line of brief.
  Cost if wrong: a paragraph per dispatch.

MY QUESTION ANSWERED YES, AND THE REASONING IS AIRTIGHT. Contiguity broke two
legitimate blocks, both EXCERPTS - 8 of 23 declared advances, 6 of 27 measured
rows. And the insight that settles it: AN EXCERPT CANNOT BE DISTINGUISHED FROM A
TIDY BY ANY RULE THAT DOES NOT READ MINDS, because attack (a) is literally
all-lines-genuine-not-contiguous, the same shape. So it PAID THE COST rather
than loosening the checker: both sections now paste in full and are longer than a
reader needs. That is the right trade and I would have taken the other one.

ITEM 2 states what it CANNOT guard - that the log is current, since re-driving
needs kicad-cli, the Python bindings and a font blob outside the repo - and
COUPLES THE TWO instead: the document names the commit its figures were measured
at, the log records the commit it was taken at, and a case requires them to
agree. A log refreshed without re-pinning fails and so does the reverse. Driven
red by changing one survivor count in the log, which takes 4 of 7 red.

Re-pin: three commits had touched the probe's tree so the named run predated its
own source. Re-driven at c71e5c9, EVERY FIGURE BYTE-IDENTICAL, with diff
reporting exactly one differing line - the scratch directory, pasted nowhere. And
the Python predecessor was DELETED rather than left beside its replacement.

Task 1: fix round 2 re-review - three items ADDRESSED, ONE NEW IMPORTANT.
Suite 3769/0/352 and typecheck driven. Four of five named attacks hold.

Attack 5 verified BY NAME as asked rather than by arithmetic: the diff touches
exactly two new test files, 7+4=11 cases, and NO OTHER TEST FILE APPEARS IN THE
DIFF AT ALL - so the +11 is not +13 new with 2 pre-existing silently gone.
Attack 4: re-drove the probe at HEAD, exactly two lines differ from the committed
log (the commit hash, expected five commits past the pin, and the scratch path),
AND confirmed zero .ts or .py changed between the pin and HEAD - so byte-identical
is established by provenance rather than by comparison alone. Attack 3: 23 of 23
and 27 of 27, diff hunks pure insertion, no figure moved. Attack 2: joint
staleness confirmed uncatchable AND confirmed the test's own docstring and G265
both say so - the gap is disclosed, which is what I asked for.

RULING R14 - A NEW IMPORTANT GOES INTO FIX ROUND 3, AND IT IS HOLE (a) SURVIVING
ITS OWN FIX. CONTIGUITY IS VACUOUS AT LENGTH 1: a one-line run block collapses
contiguous-slice to flat membership, which is exactly the hole the contiguity
rule was written to close. The document has one live instance - section 1.9's
CONTROL PASSED line - and the reviewer swapped it for an unrelated genuine log
line twice and the checker still exited 0. Not caught by any of the round's seven
new test cases, not in the report, not in the register.
  The shape worth keeping: the fix GENERALISED the rule, and the generalisation
  has a degenerate case at n=1. A rule that is strictly stronger for n>=2 can be
  strictly equal at n=1, and nobody checks the boundary of a rule they just
  strengthened.
  Cost if wrong: a third round on a checker nothing else depends on yet.

RULING R15 - FOLD THE DORMANT MULTI-RUN GAP INTO THE SAME ROUND. The reviewer
graded it Minor and PLAUSIBLE because today's log holds exactly one run, so a
wrong-run contiguous slice is not constructible. But it has the SAME ROOT as the
n=1 hole - the log's structure is under-constrained - and fixing one while
leaving the other means the next person to append a second run reopens a hole
that was known and recorded. Dormant is not the same as absent.
  Cost if wrong: one constraint on a file that has one run today.

Task 1: fix round 3/5 (2 addressed, 0 open; commits 3e52044..14ed8f0).
Suite 3778/0 across 352 - +9 with NO NEW FILES, verified by name: one test file
in the diff, 7 to 16 cases, file count unchanged. No re-pin needed and it proved
it rather than asserting: a name-only diff over the probe dir, lib, circuits and
boards lists exactly one path (the checker itself) and a stat over all ten probe
modules is EMPTY.

IT COSTED MY THREE MECHANISMS AND ITS DIAGNOSIS BEAT MINE. Mechanism (1), n>=2,
ANSWERS THE SYMPTOM ONLY: the n=1 attack generalises to substituting a whole
genuine contiguous slice, which passes at EVERY length. So n=1 was never the
bug - it was the cheapest instance of it. Mechanism (2) by LINE NUMBER is
brittle and the number is itself editable; by the log's own section headers it is
stable, fails loudly on a rename, and hands R15 its handle free. Mechanism (3)
rejected as the trap.
The rule is now four clauses: names its section and lies inside it; carries >=2
NON-BLANK lines; matches that section at EXACTLY ONE offset; and may not overlap
another block.

AND IT MEASURED AND REJECTED A FIFTH RULE. Document-order-within-section would
have been free to add and is WRONG HERE: section 1.4 quotes a step's height line
after section 1.7 quotes the same step's distribution, so the document is
thematic rather than run-ordered. Its words: could have gone either way, didn't.

FIVE ATTACK SURFACES NEITHER I NOR THE REVIEWER NAMED, all driven:
  blank-line padding - the n=1 hole wearing whitespace, live if the minimum had
  counted all lines rather than non-blank;
  a renamed header - the anchor must fail LOUDLY rather than match nothing
  quietly;
  A DUPLICATED HEADER WITHOUT A DUPLICATED RUN - which CORRECTS MY R15: I framed
  the escape as a second run, and the narrower one is a single run with a
  repeated header, which a run-count check does not see;
  a log with NO run marker - it drove 0-run as well as 2-run, so the marker is
  load-bearing in both directions;
  overlapping blocks - NOT HYPOTHETICAL: growing one block in round 2 made it
  overlap another by one line and duplicated a CONTROL line. Caught by eye then,
  by the checker now.

EIGHT RED DRIVES, ALL AGAINST COPIES, document and log SHAs identical before and
after - AND ALL EIGHT PROMOTED TO SUITE CASES, so the drives are permanent
rather than one-off.

THE RESIDUAL IT COULD NOT CLOSE, STATED RATHER THAN DISCOVERED LATER: a block
replaced by a DIFFERENT genuine, contiguous, unique slice of the SAME declared
section passes. Closing it needs the checker to read the prose above the block.
The section anchor narrows the target from the whole run to one step; it does not
eliminate it. In section 1.11 and G265.

Register: three defeated checkers recorded as three DISTINCT general shapes -
flat-membership-with-a-gate, the n=1 boundary, and the relabel dodge the first
fix OPENED - with the transferable lesson: GENERALISING A RULE DOES NOT
GENERALISE ITS BOUNDARY. And my closing note is in, in a better form than I
wrote it.

Task 1: fix round 3 re-review - BOTH ITEMS ADDRESSED, all five named attacks
hold, two Minors and one negligible. Suite 3778/0/352 and typecheck driven. It
verified the +9 BY NAME: nine new test blocks, six realising the eight named
attacks and three additional, matching exactly. And it perturbed the real checker
FOUR times - the line minimum, the overlap check, the run-count guard and the
section scoping - each time flipping exactly the tied cases red, restoring from a
pristine copy and verifying by SHA-256 before the next. That is the control
structure this branch has been trying to reach all session.

Its sharpest finding: THE RESIDUAL IS REAL AND CORRECTLY DISCLOSED, AND ITS SIZE
IS UNDERSTATED FOR ONE SECTION. The narrows-to-one-step characterisation does not
hold for STEP 4b, the log's last and open-ended section - 141 lines bundling
several measurements rather than one step. It substituted a real currently-
verified four-line block with four unrelated genuine lines from deep in that
section's unquoted tail and verify() returned IDENTICAL TO CONTROL. So the hole
is admitted; the sentence admitting it overstates the narrowing.

Second: parseSections's unconditional header detection can silently re-partition
a section if probe output ever begins a line with the header marker. Driven: 14
verified becomes 12 with 2 new FAILED. FAILS LOUD AND FALSE rather than quiet
and wrong, which is this project's preferred direction - a maintenance trap
rather than a hole.

RULING R16 - CLOSE TASK 1 NOW; BOTH MINORS DEFERRED TO THE FINAL REVIEW. The
skill says Minors never enter the fix loop and both of these are safe-direction.
Three fix rounds on evidence-verification machinery is already disproportionate
for a research task, and THE TASK'S ACTUAL DELIVERABLE HAS HELD EVERY ROUND: the
measurement was re-driven byte-identical every time it was attacked. What kept
failing was the machinery proving the evidence was pasted as it came, and it is
now defeated only by a documented residual.
  I considered folding the understated-residual sentence in under R8's reasoning
  - a minor that misleads the person it was written for - and declined, because
  the correction is one characterisation in a contract section and Task 7
  synthesises and amends the register anyway. CARRIED FORWARD: Task 7's dispatch
  must state the residual's real size, and the final whole-branch review triages
  both Minors with the exploit evidence already recorded here so nobody
  re-derives it.
  Cost if wrong: a reader of section 1.11 trusts the narrowing more than it
  deserves for one open-ended section, for as long as it takes Task 7 to land.

Task 1: minor (deferred): the narrows-to-one-step claim in section 1.11 and in
the checker comment overstates the narrowing for STEP 4b, 141 lines and several
measurements; a four-line substitution from its unquoted tail verifies clean.
Task 1: minor (deferred): parseSections re-partitions on any probe line beginning
with the header marker; safe direction, driven at 14 verified becoming 12.

Task 1: complete (commits 1635fd4..14ed8f0, 2 minors deferred)

## TASK 2 — reported DONE_WITH_CONCERNS

Commits 04b6a1d, 36e02e8, cb35fe0, 338f31d on BASE 14ed8f0. Suite 3778/0 across
352 files, typecheck clean, sibling clean, no attribution.

THE ANSWER IS AS DECISIVE AS IT COULD BE: THE GRAPH CONTAINS NOT ONE LABEL AND
THE SERIALIZER THROWS ON ONE. Over all 48 blocks of all eleven boards - 398
nodes, 620 ports, 494 edges - ZERO elements with a non-empty labels array, with
the control being that the same walk finds layoutOptions on 398 of 398. And
serialize.ts THROWS on any element carrying a label, driven. Boundary nodes - the
global labels - are sent as ZERO SIZE. It sets 0 of the 22 label options ELK
exposes.
  So ELK has never been told this repository draws text, and EVERY DOWNSTREAM
  TEXT COLLISION IS BETWEEN ITEMS ELK NEVER KNEW EXISTED.

THE SENTINEL IS THE BEST PIECE OF EXPERIMENTAL DESIGN THIS SESSION. Arm e (should
succeed) succeeded - ELK reserves room for an outside label without resizing the
node. Arm f used layered's DOCUMENTED DEFAULT and failed SILENTLY: all 398 labels
came back still carrying the impossible sentinel coordinate they were sent with.
Arm g, the same without the sentinel, returns every label at (0,0) - 254
overlapping their own body, 136 on-grid BY ACCIDENT - and the graph still grew,
so ELK reserved space for a label it never placed.
  Its sentence: WITHOUT THE SENTINEL I WOULD HAVE PUBLISHED (0,0) AS A
  PLACEMENT. A sentinel is how you tell placed-at-origin from never-touched, and
  nothing on this branch had used one.

DIRECT ANSWER: no part that would unblock a board, AND THE OBSTACLE IS THE OUTPUT
FORMAT RATHER THAN A MISSING ELK FEATURE. It could own reserving room for outside
text, pin text, net-name text, coarse edge-label side selection. It cannot own
the global-label class - [READ] emit-items.ts:227-241, a global_label's text has
NO COORDINATE OF ITS OWN and its one position is the anchor, so ELK's offset has
nowhere to go. THAT SHARPENS G262 from moving-it-changes-the-circuit to THE
FORMAT PROVIDES NO WAY TO MOVE THE TEXT WITHOUT MOVING THE ANCHOR. Nor
label-label separation across elements (the only option is scoped to one
element's own labels), nor keeping text off wires, nor an inside label without
growing the node, nor anything by default.

Honestly left open: modelling a net name as an ELK EDGE label - layered declares
EDGE_LABELS and placed all 494 - with the measured obstacle that edgesForNet
makes a net of degree n into n-1 edges, so an edge label is per segment not per
net. And it did NOT establish that KiCad connects a global label placed mid-wire.

RULING R17 - CONCERN (1) IS MY R15's DOING AND I AM FIXING IT BY A SECOND
INVOCATION, NOT BY MULTI-LOG SEMANTICS. Section 2's eight blocks are listed NOT
CHECKED because verify-pastes.ts is single-log BY CONSTRUCTION under R15, and the
implementer correctly refused to edit a check. R15's constraint was ONE RUN PER
LOG, not one log per repository - so the suite gains a second case checking
section 2 against section 2's own log. That is an added call, not changed
semantics. It mitigated well in the meantime: the whole run pasted, 12396 of
12412 bytes, verified programmatically as exact contiguous slices.
  Cost if wrong: one more suite case and a second committed log.

Accepted as recorded, not fixed: (2) a LIVE TRIPWIRE WITH NO WIRE - read-graph.ts
and adapt.ts mention width and height ZERO times, so nothing compares the node
size ELK returns against the size sent, and the day anyone reserves label space
every grown node mis-places its symbol. Research-only forbids the fix; recording
it is right.

(3) TWO SELF-INFLICTED FALSE FINDINGS, BOTH RECORDED, AND ONE IS A NEW FALSE-
GREEN ROUTE: a SCRATCHPAD copy of the probe resolved elkjs via auto-install to
0.12.0 and reported 235/11/153 against the pinned tree's 224/12/140 - it nearly
published that the repository's own comment was stale. VERSION DRIFT BETWEEN A
PROBE AND THE TREE IT MEASURES. And it hand-typed two wrong figures into a first
draft, after which it assembled the document by SPLICING EXACT LOG RANGES.

(4) R13 PAID OFF WITHIN ONE TASK: its probe's first log section was named
identically to section 1's and turned section 1's checker RED. Fixed AT THE PROBE
by renaming, NEVER by trimming the paste - which is the choice the whole contract
exists to force.

## TASK 2 REVIEW — SPEC COMPLIANCE: PASS with one required correction.
## TASK QUALITY: HIGH. Three Importants, four Minors, no Critical.

Suite 3778/0/352 and typecheck re-driven. It re-derived every headline figure on
ITS OWN graph walk and ITS OWN option scan, matching to the digit, and the
committed log reproduces byte-for-byte except its own commit line.

Five of six named attacks hold, two of them harder than claimed.
  The label count: it counted at FOUR levels including edge SECTIONS which the
  probe does not count, and strengthened the control to layoutOptions on 398 of
  398 nodes AND 620 of 620 ports. Throw driven at three sites, and REACHABLE FROM
  PRODUCTION - serializeElkInput is called inside elkInputOf, which every block
  goes through on every run, so it is not a test-only refusal.
  THE SENTINEL SURVIVED A HARDER ATTACK THAN IT WAS BUILT FOR: five seeds
  including POSITIVE coordinates no legal placement reaches, plus an asymmetric
  pair - all 398 returned exactly the input every time, so the return TRACKS AN
  ARBITRARY INPUT, which coincidence cannot produce. Control closes the other
  side: with the placement hint, 0 of 398 stay. And it found corroboration in the
  implementer's own log - arm f's graph comes back 116828961 um wide, so ELK READ
  the sentinel into the bounding box while never writing a coordinate.
  AND IT SUPPLIED A CONTROL THE PROBE LACKED: the arms differ from baseline in
  the OPTION as well as the label, so it drove no-labels-plus-option alone and
  got 48 of 48 blocks identical - which is what makes the growth attributable to
  the label.

RULING R18 - IMPORTANT 1 IS A DOCUMENT DEFECT AND IT CORRECTS MY OWN PRAISE.
Section 2.7 says honouring an ELK offset would mean moving the anchor, which
moves the wire end, WHICH CHANGES THE CIRCUIT. The plan at line 207, marked
ACCEPTED and called the third-party review's most consequential finding, says the
label's NAME and CONNECTION are netlist facts and ITS COORDINATES ARE NOT
NECESSARILY FIXED - and that this generator draws the wires. So section 2 is new
prose written AFTER that correction which relays the corrected claim, without
even G262's own not-measured hedge.
  I told the owner section 2 SHARPENS G262. The amendment does; one clause of
  section 2.7 regresses to the pre-correction claim, and I passed the praise on
  without checking the prose around it.
  The failure scenario is exact: TASK 5, WHOSE JOB IS THE CORRECTION, reads
  section 2.7, concludes the coordinates are fixed after all, and never pursues
  the freedom the review bought. The measured half stands - the text has no
  coordinate of its own; the changes-the-circuit clause does not.
  Cost if wrong: two sentences, no figure moves.

RULING R19 - IMPORTANT 2 IS A FALSE GUARANTEE, WHICH IS WORSE THAN NO GUARANTEE,
AND IT UNDERCUTS A REGISTER CLAUSE. The SHA-256 pin hashes a path derived from
the PROBE MODULE's own location, so it passes on the 0.9.3 bundle while a
scratchpad caller loads 0.12.0 - driven. So the pin would NOT have caught the
version drift G266(3) credits it with; the COMMIT LOCATION closes that, the hash
does not, and section 2.1 conflates them. The near-miss can recur with a register
entry saying it cannot. Figures unaffected - the reviewer re-derived 224/12/140
against an absolute-path-pinned bundle.
  Cost if wrong: the pin keeps a guarantee it has not earned.

RULING R20 - IMPORTANT 3: THE COMPLETENESS CLAIM FAILS, NOT THE CONCLUSION. It
enumerated all 45 arm-by-quantity cells: 39 invariant, SIX VARY, THE DOCUMENT
NAMES FIVE. The unnamed one is arm e's on-grid count at 46/43/12 - and section
2.7 publishes only-12-of-398 three paragraphs above None-of-this-depends-on-
which-text-box-governs. At the current model's height it is 46 and 352. Section
2.7 also says all four are named while listing five. The qualitative conclusion
is robust; what fails is the licence to quote the figure without a height.
  Cost if wrong: Task 7 cites 386-of-398 as height-independent when today's
  ruler gives 352.

FOLD IN ALL FOUR MINORS under R8's reasoning - three are published claims that do
not reproduce, in a document the owner and four later tasks read: paste coverage
is 12404 not 12396 (eight single-newline gaps, each printed); driven-twice rests
on an artifact NOT IN THE TREE since only one log is committed, and the reviewer
has the stronger re-drivable equivalent; section 2.4's no-label-by-accident is
wider than its construction-time guard; and the arms are not minimal pairs, which
is recorded so nobody rediscovers it.

Plus R17, already ruled: the suite gains a second checker invocation for section
2's own log. The reviewer confirms all eight section 2 blocks are exact,
non-overlapping contiguous slices sharing ZERO non-empty lines with section 1's
log, so the second invocation is additive and safe.

Task 2: fix round 1 dispatched to implementer acbbb448df7917e57 (rounds 1-3 resume
the original implementer). Brief at task-2-fix-1.md: three Importants, four
Minors folded in under R8, plus R17's second checker invocation. BASE for the
re-review diff: 338f31d09357821316a829605016e55ebff0162f

## TASK 2 FIX ROUND 1 — DONE. c2860e5, 053dfb2, b6876c7. Suite 3785/0/352,
+7 cases over HEAD's 3778. Typecheck clean. No attribution in any of the six.
All seven items addressed. Three things put back to me.

RULING R21 — THE THIRD NETLIST-FACT SITE GETS FIXED NOW, AND THE IMPLEMENTER'S
REASON FOR LEAVING IT NO LONGER HOLDS. It declined to touch line 1414 because
two agents editing one amendment is a collision - true while Task 2's round was
live, moot now that it is not. I checked all six sites myself: 1708 and 1718 are
G262's own body and ITS AMENDMENT ALREADY CLOSES THEM, ending "Anyone citing
this entry's netlist-fact framing is citing the corrected claim" - that is the
register's form working as intended, body states what was measured, amendment
corrects it. 1765 and 2183 are the correction itself. SO THE SURVIVOR IS ONE
SITE, IN G259, AND IT IS THE WORST PLACE FOR IT: G259 is the mandate scoreboard,
the entry an agent opens to find out where the pipeline stands, it carries the
claim with NO hedge where G262 at least marks its own as a code reading, and it
then publishes an untried mechanism built on the premise - four candidates over
SIDES, "the anchor point is fixed". That is Task 5's subject being pre-closed in
the entry Task 5's implementer is most likely to read first.
  Cost if wrong: one pointer in one amendment.

RULING R22 — ARM k's FAILURE IS ACCEPTED AS FOUND, AND IT CORRECTS SOMETHING I
TOLD THE OWNER. nodeSize.constraints=[NODE_LABELS] with NO LABEL resizes 254
nodes, worst 33020 um, 48 of 48 blocks moved, pt-core's C1:1 collapsing to 0x0.
So arms b and c measure the option and the label TOGETHER and section 2 separates
nothing there; arm j passes, so d-g are clean and that is where both decisive
arms live. I relayed the reviewer's control to the owner as establishing the
growth is attributable to the label - TRUE FOR d-g, NOT FOR b/c, and I stated it
without the qualifier. The implementer's own line is the lesson and it is R13
working: "Had I taken the reviewer's passing control as covering the table, the
failing one would never have been written." Recorded in G266 clause 9 with the
criterion met for one family and explicitly NOT met for the other.

RULING R23 — R17's MECHANISM WAS INSUFFICIENT AND THE DEVIATION IS CORRECT.
verify() counts runs by section 1's probe header, which section 2's log
deliberately lacks - that disjointness is what round 0 bought - so a bare second
call found 0 runs. One optional run-marker parameter defaulting to the existing
constant: every existing call unchanged, no call multi-log. The alternative it
rejected - appending section 1's marker to section 2's log in memory - would have
been fabricating the log's shape inside the test, so rejecting it was right.
CRITERION WAS SECTION 2's BLOCKS ARE CHECKED AGAINST SECTION 2's LOG; my
mechanism was advice from someone who had not tried it. Seven new cases
including RED on a single changed digit.

Task 2 fix round 2: DONE, 593f29e. Suite 3785/0/352 unchanged, as a
register-only change should leave it. R21 met, and met in the stronger form:
a pointer AT the paragraph plus the amendment at the end, because G259 is long
and a scoreboard reader may never reach the end. It named NO replacement
mechanism on purpose - "guessing at a wider search would repeat the error in a
new size" - which is the right restraint; the wider candidate set is Task 5's.
Netlist-fact grep now returns nine sites, every one corrected or part of a
correction. Scoped re-review dispatched over rounds 1+2, BASE 338f31d09357821316a829605016e55ebff0162f.

## TASK 2 SCOPED RE-REVIEW — ALL NINE ADDRESSED, every one driven not relayed.
It re-drove the drift scenario both ways (old pin passes on 0.9.3 while loading
0.12.0; new pin refuses, and it ran the probe's own pinned() to see it throw),
confirmed the cell enumeration is COMPUTED at probe.ts:334-373 and throws on a
short cell, and drove SIX perturbations through the real checker including RED on
a digit in three different steps and section 2's blocks against section 1's log.
R21 is provably non-destructive: 593f29e is 67 insertions and ZERO deletions in
known-gaps.md, so the scoreboard rows could not have moved. Suite 3785/0/352,
typecheck clean, no attribution, both repos clean.

RULING R24 — N-1 GOES TO A THIRD ROUND: THIS IS I-3 RECURRING IN A DIMENSION THE
FIX DID NOT COVER, AND THAT IS WHY IT IS NOT MINOR ENOUGH TO PARK. The computed
completeness sweeps 5 of STEP 5's 9 columns. The reviewer swept the other four
and arm b's WORST RESIZE MOVES - 31740.0 / 31587.6 / 30966.9 um - while G266
clause 2 publishes 30966.9 with no height, section 2.7 ends "Nothing else moves"
and G266 clause 8 says every structural finding holds at all three heights.
  THE SHAPE IS THE POINT: a completeness claim that licenses quoting a figure
  without its ruler, which is exactly I-3, now in the metrics dimension rather
  than the arms dimension. Fixing I-3 by computing over five columns and keeping
  the unqualified wording is the non-fix the criterion-versus-mechanism rule
  warns about. Same named victim: Task 5 or 7 citing 30966.9 as
  height-independent.
  Cost if wrong: one scoped claim and one swept column set.

RULING R25 — OBSERVATION 2 IS AN OVERCLAIM IN THE REGISTER AND I REPEATED IT TO
THE OWNER. R17's guard covers FENCED blocks only: the reviewer edited a section 2
PROSE figure from 46 to 99 and nothing went red. G266 clause 5 says a figure
edited in section 2 breaks the suite, which is wider than the guard - and I told
the owner the same thing in the same words. Section 2.10 is honest about the
limit; the register entry is not, and the register is what outlives this session.
  This is the I-2 class exactly: crediting a guard with reach it does not have.
  Narrowing the claim settles it; extending the guard to prose figures is a
  larger change and NOT what I am asking for.
  Cost if wrong: one sentence in one clause.

RULING R26 — THE REVIEWER'S ARM-c CONTROL IS A MEASUREMENT AND GETS RECORDED.
It ran the control arm c lacked: 144 resized, worst 20.0 um, 46 of 48 blocks
moved. So c fails its control the way b does and the published conclusion holds,
now driven for both. A measurement that found nothing wrong is still recorded
here, and this one came from the reviewer rather than the producer, which is the
channel the invariant wants.

## TASK 2 FIX ROUND 3 — DONE. 9bbd78c, 31419be, 76d6a2b. Suite 3785/0/352
unchanged, typecheck clean, no attribution. It took the STRONGER option on item 1
without being pushed: one shared METRICS list feeding both the table and the
sweep, so completeness is true BY CONSTRUCTION rather than by keeping two lists
in step. 5 quantities to 13, 55 cells to 156, 149 invariant, 7 varying. My
figure reproduces to the digit.

RULING R27 — ACCEPTED, AND TWO THINGS IN IT ARE WORTH MORE THAN THE FIX.
  (1) ITS OWN FIX BROKE PUBLISHED FIGURES AND IT FOUND THAT BY READING THE
  OUTPUT, NOT BY A TEST. The shared metric list silently collapsed 17790.0 to
  17790 and 20.0 to 20 - a formatting regression inside a correctness fix, caught
  at the first run's table and fixed in 31419be. That is this project's
  look-at-the-output practice doing the thing tests cannot.
  (2) ARM l PRODUCED AN UNASKED-FOR CROSS-CHECK OF A NUMBER NOBODY HAD MEASURED.
  144 resized is exactly the boundary-node count, and 254 + 144 = 398
  independently confirms the 254 unit nodes section 2.6 rests on - a figure
  derived by REASONING in round 0 and never driven until now. It also splits arm
  c's 362 resizes into 144 boundary nodes at 20 um (the option's) and 218 unit
  nodes widened by their labels (the label's), with section 2 stating plainly
  that the probe does not attribute them individually.
  G266 clause 8 now carries the lesson in one line: GENERALISING A CLAIM DOES NOT
  GENERALISE ITS SCOPE, AND NOBODY CHECKS THE SCOPE OF A CLAIM THEY HAVE JUST
  COMPUTED.

RULING R28 — ITEM 2's REFUSAL TO EXTEND THE GUARD IS RIGHT AND ITS REASON IS
BETTER THAN MINE. I said narrow the claim and do not extend the guard, on cost
grounds. Its reason is that the rule cannot be written as stated: requiring every
decimal-bearing prose number to appear in the log would reject "25.0 grid
steps", a correct derivation that is absent from the log by construction, so the
rule would have to tell a quotation from an arithmetic result. The gap therefore
carries its MECHANISM marked untried AND PROBABLY THE WRONG SHAPE, which is the
honest form.

RULING R29 — THE TWO DISPUTES-FOR-RECORD MUST BE IN known-gaps.md, NOT ONLY THE
REPORT. Arm b's magnitude is still not separated from its option's, and section
2's prose is unguarded behind a by-hand cross-check. The report file is
gitignored, so a finding that lives only there is not recorded. The re-review
checks both.

Scoped re-review 2 dispatched, BASE 593f29e. THE SPECIFIC RISK THIS ROUND OPENED:
31419be changed number FORMATTING in the log, so every pasted block had to be
re-spliced and every prose figure quoting a um value could have been left in the
old format - and prose is the surface the guard does not read.

## RE-REVIEW 2: ALL ADDRESSED, NO NEW FINDINGS. Task 2: complete.
Confirmed BY CONSTRUCTION that the table and the sweep consume the single METRICS
array with no second list, and re-ran the probe to 156/149/7 with b/worst-um at
31740.0/31587.6/30966.9. Drove item 2 itself - edited a section 2 PROSE figure 46
to 99, suite stayed green, then restored and verified the tree clean - so the gap
is established by a check that could have failed. Ran arm l to the digit and
checked 254+144=398 against the probe's own columns rather than by hand.
Independently cross-checked ALL 59 distinct decimal figures in section 2's prose
against the committed log: every one present verbatim or a named derivation.
Confirmed the RED case reads its victim line live from the log rather than from a
frozen literal and still fails for the right reason. BOTH stated residuals are in
known-gaps.md G266, not only the gitignored report (R29 met).
Suite 3785/0/43482 across 352 files; without SCHGEN_SOURCE it FAILS 8 rather than
skipping, as intended. Typecheck clean. Tree clean. No attribution in any of the
three. Both changed .ts under tools/schgen/ declared in port-manifest.json.

Task 2: complete. Three fix rounds, two scoped re-reviews, nine findings plus
three of mine, all closed. Rounds 1-3 all resumed the original implementer.

Task 3: dispatched. KiCad's own field autoplacer, read in full. Brief
task-3-brief.md plus task-3-context.md. BASE 76d6a2b17d8abba432a49ae15df2ae07620d9bf3. Settled before dispatch so it
does not re-derive: installed kicad-cli is 10.0.5, matching the tag Task 1 read
source at, and kicad-cli is NOT on PATH here - the repo resolves it at
lib/kicad/netlist.ts:39. Writes section 3 only; sections 1 and 2 are closed.

## TASK 3 — reported DONE_WITH_CONCERNS. 187b468. Suite 3785/0/43488 across 352
files; typecheck clean. 728 insertions 0 deletions in the research document, so
sections 1 and 2 are byte-untouched. known-gaps.md G267, ten clauses.
autoplace_fields.cpp read in full, 799 lines, tag 10.0.5 matching the install,
with SHA-256 for it and eight other blobs.

THE HEADLINE IS A CLAIMED DEFECT IN KICAD ITSELF. chooseSideForFields seeds its
selection from the COLLIDING sides and carries that seed into the loop that ranks
the SURVIVING ones, so a colliding side with strictly fewest pins cannot be
displaced by a clear side - KiCad placing fields on a side it just graded as
colliding while a clear side was available. Six traces published.

RULING R30 — THE 728-LINE SECTION STAYS AND THE 300-500 LINE CAP DOES NOT REACH
IT. The cap is a CODE-file rule and its reason is modularity and holding a file
in context while editing it; a research document is reference material read by
section, its sections are bound together by cross-references and by section
1.11's checker contract, and splitting it would scatter both. The implementer
offered to cut section 3.6 and the issue table - DECLINED: the issue table is the
Step 4 evidence and cutting evidence to hit a line count aimed at something else
is the wrong trade. What I am NOT ruling is that the document grows without
limit: Task 7's synthesis gets its OWN document, because a synthesis that lives
inside the material it synthesises cannot be read first.
  Cost if wrong: one long document instead of five shorter ones.

RULING R31 — THE UNCOMMITTED TRANSCRIPTION SCRIPT IS THE ONE THING I AM SENDING
THE REVIEWER AT FIRST. The six traces are the evidence for a claimed upstream
defect, and the implementer says the script it checked them with is DELIBERATELY
not committed. That is Task 2's MINOR-5 shape exactly - a claim whose artifact is
not in the tree - and it may still be right here, because a transcription of
GPL C++ control flow into TS is a second implementation that could drift from
the source it claims to read. THE QUESTION IS NOT WHETHER THE SCRIPT IS
COMMITTED, IT IS WHETHER THE TRACES ARE RE-DERIVABLE WITHOUT IT. If a reader can
hand-trace all six from the published algorithm and the pinned source, the
artifact is unnecessary and its absence is correct. If they cannot, the evidence
rests on something nobody else can run.

Task review dispatched, BASE 76d6a2b, HEAD 187b468.

## TASK 3 REVIEW — SPEC COMPLIANCE PASS, TASK QUALITY HIGH.
No Critical. Nothing fabricated: every issue exists and says what is claimed, and
all NINE SHA-256 hashes in section 3.0 verify to the full 64 digits at tag
10.0.5. One Important, ten Minors. All eleven recorded false-green shapes checked
and none found.

THE CENTRAL CLAIM IS CONFIRMED, re-derived from a blob the reviewer fetched and
hashed itself rather than from the implementer's quotation. The reason is exact:
chooseSideFiltered's "if (it->pins <= sel.pins) { sel = *it; }" fires on the
sides it ERASES, so after the two filter calls the selection holds the colliding
side with fewest pins, and the tail loop admits a survivor only on
"each_side.pins <= side.pins". NO earlier guard, NO early return but the zero-pin
loop which iterates survivors only, exactly ONE caller with no precondition, and
no later overwrite - fitFieldsBetweenWires moves the box's y and never the side.
It hand-traced ALL SIX published traces where I asked for two, and six hold.

RULING R31 RESOLVED — THE UNCOMMITTED SCRIPT'S ABSENCE IS CORRECT. The reviewer
reproduced all six traces from section 3.3's pseudocode plus the pinned blob "in
minutes". So the criterion I set is met: the traces are re-derivable without the
artifact, the evidence rests on nothing nobody else can run, and committing a TS
transcription of GPL C++ control flow would have added a second implementation
that can drift from the source it claims to read. No action.

RULING R32 — THE REVIEWER FOUND THE STRONGEST EVIDENCE FOR THE FINDING AND THE
DOCUMENT DOES NOT CITE IT. autoplace_fields.cpp's OWN HEADER COMMENT at lines
38-44 says the colliding sides are "sift[ed] out" and that step 4 picks fewest
pins among the REMAINDER. So the code contradicts its own documented
specification twelve lines from the top of the file - which is the difference
between "this behaviour looks wrong to us" and "this behaviour is not what the
file says it does". THAT IS THE ARGUMENT AN UPSTREAM MAINTAINER WOULD ACT ON,
and section 3 never mentions it. It goes in.

RULING R33 — I-1 IS A MUST-FIX AND SECTION 3 ALREADY CONTAINS ITS OWN REFUTATION.
Section 3.3 pairs the defect with upstream #14127; the reviewer retrieved #14127
in full and its repro is adding a symbol, its complaints are about 50mil spacing
and grid alignment, and symbol placement passes AUTOPLACE_AUTO
(sch_drawing_tools.cpp:487,499 at 10.0.5) so THE DEFECT CANNOT FIRE ON THAT
REPRO PATH - which section 3's own row 6 establishes. An upstream report citing
#14127 gets discredited in one line. #16538 remains sound. Hedged as a candidate
in three places, which is why it is Important and not Critical.

## TASK 3 FIX ROUND 1 — DONE. a45a2c3. Twelve items, twelve addressed, none
disputed. Suite 3785/0/43489 across 352 files, typecheck clean. Earliest changed
line 1477 against section 3 starting at 1461, so sections 1 and 2 keep the
untouched property.

It went past the brief in three places, each worth recording.
  (1) A SECOND AND STRONGER REASON #14127 CANNOT FIRE, which I did not name:
  sch_drawing_tools.cpp:487 passes AUTOPLACE_AUTO WITH A NULLPTR SCREEN under
  the source's own comment, so there are no colliders at all - not merely no
  collision check. #14127 stays in the issue table as a real complaint with a
  clause on its row saying the defect cannot fire on it.
  (2) M-2's RESTORED CLAIM HOLDS AND IT PUBLISHED THE COUNTERWEIGHT ANYWAY: 11
  obstacle categories in front of a candidate against the 2 KiCad distinguishes,
  AND that KiCad's collector has no type filter. Restoring a trimmed word and
  then reporting the fact that cuts against you is the behaviour the trim
  threatened.
  (3) ONE DECLARED DEVIATION. The paste checker went RED on the header-comment
  transcription because a C comment line starts with a space-star and an
  unchecked block's first non-blank line must start with non-whitespace. It
  dedented by exactly one space WITH A PARENTHETICAL SAYING SO - an undeclared
  dedent of a transcription is the tidy section 1.11 exists to stop.

RULING R34 — THE THREE NEW HASHES ARE THE ONE THING THIS ROUND ADDED THAT NOBODY
HAS VERIFIED, AND THE IMPLEMENTER IS THE ONE WHO SAID SO. Section 3.0's table
went from nine rows to twelve to establish which AUTOPLACE_ALGO each caller
passes, and the three new hashes are the implementer's own from this round. The
reviewer verified nine to the full 64 digits; three are unchecked. THAT IS NOT A
COMPLAINT - it is the disclosure working, and it is exactly what the scoped
re-review is for. The nullptr-screen claim rests on one of those three files, so
the hash and the claim get checked together.

## TASK 3 FIX RE-REVIEW — ALL ADDRESSED, all twelve, plus the three unchecked
additions. R34 is answered: the three new hashes verify to all 64 digits at tag
10.0.5, fetched and hashed by the reviewer.
  THE NULLPTR-SCREEN CLAIM IS CONFIRMED MECHANISTICALLY, not as an idle truth:
  it traced AUTOPLACER's constructor guard "if (aScreen) getPossibleCollisions(
  m_colliders);" and getDrawableArea's "if (!m_screen) return BOX2I();" and
  established that the document's TWO reasons hold INDEPENDENTLY - AUTO mode
  skips getCollidingSides entirely, and separately a null screen leaves
  m_colliders empty, so even a hypothetical MANUAL call with a null screen finds
  nothing collides.
  THE TRANSCRIPTION IS EXACT. Byte-diffed against the pinned blob's lines 38-44:
  after stripping exactly the one declared leading space per line, diff is EMPTY
  across all seven lines and nothing else differs. That is the strongest evidence
  in the section and it is now established rather than remembered - which is what
  "transcription is evidence, not memory" asks for.
  M-2's 11-vs-2 was independently corroborated from obstacle-pairs source rather
  than taken from the implementer, and the counterweight sentence located in the
  document rather than only in the report.

RULING R35 — THE NEW FINDING GETS A ONE-ITEM ROUND AND NO RE-REVIEW. Section
3.12 says EIGHT supporting files where section 3.0's own table makes it TEN - the
fix round moved seven to eight when the three files it added should have taken it
to ten. Nothing in section 3's findings depends on it, so by the letter it is
cosmetic; it is also a self-contradiction between two subsections of one
document, INTRODUCED BY THE FIX ROUND and missed by implementer, reviewer and me
until the re-review caught it. Its failure scenario is real and specific: a
reader undercounts which files carry partial-read risk by two, and the two it
drops are the ones whose partial reading is least obvious because they arrived
last. I also asked for the second instance rather than just the first, since the
same arithmetic may appear twice.
  NO RE-REVIEW: a prose count against a table in the same document is something I
  verify myself in one grep, and spending a reviewer seat on it would cost more
  than the finding.

## TASK 3 FIX ROUND 2 — DONE, 4fe4b41. Suite 3785/0/43489 unchanged, typecheck
clean. No second instance, with a verdict recorded per candidate rather than a
bare none-found: section 3.0's "other ten" was already the correct sentence
section 3.12 contradicted; section 3.1's three call sites is a different count
across two files and does not track the table; section 3.0's "last three added"
is a delta; the two 38-file figures are the withdrawn code-search total; G267
carries no file count at all.

IT DID NOT CORRECT THE NUMERAL, IT REMOVED IT - and that is the better fix.
Section 3.12 now LISTS the ten partially-read files by name, in bold for the two
the stale count hid, states the arithmetic so a reader can re-derive it from the
table, and records that the bullet said seven in round 0 and eight after round 1
so the history of the miscount is visible rather than quietly corrected. A list
cannot drift out of step with the table the way a numeral did. I did not ask for
that shape; it is the right one.

I VERIFIED THIS ONE MYSELF, as R35 said I would, and it holds: a single hunk at
line 2319 against section 3 starting at 1461, so sections 1 and 2 keep the
untouched property; section 3.0's hash table has 12 rows; the bullet names both
symbol_editor_control.cpp and symbol_preview_widget.cpp; and the stale claim has
zero surviving instances in the document.

Task 3: complete. Two fix rounds, one full review, one scoped re-review, one
controller verification. Fourteen findings closed, no Critical at any point,
nothing fabricated, and the central claim - A CONFIRMED DEFECT IN KICAD'S OWN
FIELD AUTOPLACER - independently re-derived by a reviewer that fetched and hashed
the source itself, with all six traces hand-traced and the file's own header
comment established as the specification the code departs from.

Task 4: dispatched. How every other EDA tool handles schematic text, and whether
ANY of them refuses to draw because text will not fit. Brief task-4-brief.md plus
task-4-context.md. BASE 4fe4b41d2b1508bf47ec8aefbd1d21f28145d9be.
RULING R36 — I ADDED ONE CONSTRAINT THE BRIEF DOES NOT CARRY: NO NEW DEPENDENCY
IN THIS REPOSITORY, for anything. Running a tool is the strongest evidence grade
this task can produce and the brief asks for observed behaviour where available,
but a package.json or lockfile change is a behaviour change dressed as research
and the port-fidelity guard would be entitled to refuse it. Scratchpad installs
only, with the version and install method reported so an observation is
attributable. RUNNING NOTHING IS AN ACCEPTABLE OUTCOME - the brief grades
observed, documented and inferred separately precisely so a source read can stand
as a source read.

## TASK 4 — reported DONE_WITH_CONCERNS. bc477fc, fe0e7b8. Suite 3785/0/43495
across 352 files, +6 for section 4's six declared not-output blocks, and section
4.12 STATES that figure so it can fail. Typecheck clean. 764 insertions 0
deletions on the first commit.
CONCLUSION N=6 M=0: none of the six refuses to draw because text will not fit,
and with Task 3's KiCad that is zero of seven. RAN 2 (netlistsvg at clone commit
d3518f1, schemdraw 0.23), READ 2 (lepton-eda fd160f0, xschem 36e0eab), DOCS 2
(Altium, OrCAD). It discarded the npm 1.0.2 tarball because it PREDATES the
commit while declaring the same version - a version string that lies, caught.

RULING R37 — THE UNRETRIEVED ALLEGRO LEAD GETS ITS OWN REGISTER ENTRY AND THE
IMPLEMENTER'S PRECEDENT ARGUMENT DOES NOT SURVIVE IT. It created no new
known-gaps entry, following sections 1-3's precedent of amending only. That
precedent held because those tasks had an entry to amend. THIS ONE HAS A FINDING
WITH NO HOME: the Allegro/OrCAD PCB silkscreen auto-placer reportedly PLACES WHAT
IT CAN AND LOGS WHAT IT COULD NOT, which is A SIXTH SHAPE none of the six
exhibits, and it could not be retrieved from any quotable source - 403, login
wall, dead DNS.
  WHY IT MATTERS MORE THAN ITS EVIDENCE GRADE: it is the one gap whose closing
  could change a row of section 4.8, and the shape itself is the direct
  alternative to what this repository does. A generator that places what it can
  and logs the rest does not refuse and does not silently overlap. That is
  bait, and the register's own rule is that bait belongs beside the trap.
  It was RIGHT not to count it, right not to widen the taxonomy for it, and
  right to mark the search summary as not evidence. Recording it is a separate
  obligation from counting it.
  CRITERION: a quotable primary source for the behaviour, or a run. The entry
  says what was sought, that it could not be retrieved, and what would settle it.

RULING R38 — THE CANVAS JUDGEMENT IS CORRECT AND I AM AFFIRMING IT ON THE RECORD
SO IT IS NOT RE-LITIGATED. It treated GROWING THE CANVAS as NOT an instance of
"adjust the surrounding geometry" and declared the call rather than filing it
quietly. That is the right reading: adjusting the surrounding geometry means
moving the things around the text so the text fits in the drawing; growing the
canvas changes the frame and leaves the arrangement alone. Masking an overlap
with an opaque rect is likewise not "suppress or clip the text" in any sense that
helps - the text is still there and now something else is hidden. RECORDING A
BEHAVIOUR AS NOT FITTING A ROW IS THE CORRECT MOVE WHEN THE TAXONOMY IS NOT
YOURS, and it took it twice.

Task review dispatched. BASE 4fe4b41, HEAD fe0e7b8. THE HIGHEST-RISK SURFACE IS
THE COMMERCIAL DOCUMENTATION: two tools graded from vendor docs is where a
paraphrase from memory would be hardest to catch, and this branch already has one
false finding from a grep for a paraphrase.

## TASK 4 FIX ROUND 1 — DONE, a27d3ed. Both Importants, all eight Minors, the
optional URL note. Nothing disputed. Suite 3789 pass / 0 fail / 43513 across 352
files, typecheck clean. Insertion-only in all four files against the branch base.

RULING R39 — THE FLAGGED DECISION IS AFFIRMED, AND I READ THE CONSTRAINT RATHER
THAN ITS PARAPHRASE BEFORE RULING. It asked whether M-8's guarded assertion was
allowed, since Global Constraints say "No task edits lib/, tools/, circuits/ or
any check." THE IMPLEMENTER'S READING IS CORRECT and the clause itself says why:
it opens "Research only. No design, no proposal, no implementation" and closes "A
task that finds itself wanting to FIX something records it and stops." The
subject is the system under study. ADDING AN ASSERTION THAT CAN FAIL IS THE
OPPOSITE OF DEFEATING A CHECK, and this plan's paste machinery is the plan's own
instrument - Task 1 created that file, Task 2 extended it with a second describe
under my R17, and both committed probe modules under tools/schgen/ under R4 and
R6. So this is the third consistent application of that reading, not a new
exception. My own brief's arithmetic presupposed it.
  NOTED FOR THE FINAL REVIEW, NOT FIXED MID-FLIGHT: the same constraint block
  ends "These tasks change no code, so the suite is expected unchanged", which
  HAS BEEN FALSE SINCE TASK 1 - every task has moved expect() and accounted for
  the delta. Amending a Global Constraint mid-plan would change what finished
  tasks were held to, so the erratum is the final review's call.

RULING R40 — IMPORTANT 2 FOUND A REAL DEFECT, WHICH IS THE ARGUMENT FOR THE
REQUIREMENT RATHER THAN A SIDE EFFECT OF IT. Committing the fixture forced a
byte-comparison, and the baseline arm WAS NOT the committed upstream file: a
JSON.stringify round-trip stood where a file copy belonged. That is a latent
defect in round 0's fixture handling, invisible while the fixture lived in a
scratch directory, and it is now asserted on every run. Consolidating three
ad-hoc scripts into one committed fixtures.js moved no figure - the log diff is
the two added header lines.

RULING R41 — THE SELF-CAUGHT ARITHMETIC ERROR IS THE PRACTICE WORKING AND GETS
RECORDED AS SUCH. Writing the predicted expect() figure down caught its own first
version: it said +8 and asserted the four new cases contributed nothing - WRONG BY
SIXTEEN, IN THE FLATTERING DIRECTION. The table now decomposes both terms and
records that it was wrong and how. A prediction written down before the run is a
check that can fail; the same figure asserted afterwards would have been
unfalsifiable.

Scoped re-review 1 dispatched for round 1, BASE fe0e7b8.

## TASK 4 RE-REVIEW — ALL ADDRESSED. It re-drove the hard items rather than
relaying: cloned the pinned netlistsvg commit, confirmed the upstream fixture
hash, confirmed baseline.json byte-identical to upstream, ran the committed build
over all four arms and reproduced the SVG byte counts, every transform and the
96-unit move exactly; installed schemdraw 0.23 and reproduced the bboxes, byte
counts, text boxes and overlap counts from the pasted fixture. SO IMPORTANT 2 IS
GENUINELY MET - both runs are re-drivable from the committed tree by someone with
only this repository and the pinned upstream versions. It also drove the pinned
block count 8 to 7 and got exactly the three reds reported, and verified the
expect() decomposition term by term. Suite 3789/0/43513/352, typecheck clean,
tree clean in both repos, no dependency added, no attribution.

RULING R42 — THE NUANCE GOES BACK EVEN THOUGH THE REVIEWER GRADED IT NOT A
DEFECT. The relabel RED case fires, but through "not a contiguous slice of
section STEP 4b" rather than the "0 of the log's headers" path it is written to
exercise, because probe-run.log already contains a real STEP 4b section the
relabelled prefix lands on. The guard cannot be smuggled past either way, which
is why the reviewer called it a nuance and was right to.
  I AM SENDING IT BACK ON THE CARDINAL RULE: a skipped check must never look
  like a passing one, and A CHECK THAT FIRES FOR A DIFFERENT REASON THAN IT
  DOCUMENTS IS THE NEAR NEIGHBOUR OF THAT. A later agent reading the case will
  believe it exercises a path it does not, and the fix is a prefix that collides
  with nothing. Either the case fails through its documented path, or the
  documentation names the real path - both settle it; disagreeing is what does
  not.
  Cost if wrong: one string in one test.
  NO RE-REVIEW: I verify this one by driving the case myself.

## TASK 4 FIX ROUND 2 — DONE, 3cda4c7. R42 met, and met three ways rather than
one: a non-colliding prefix as a NAMED CONSTANT whose doc comment says it must
match no section of section 1's log; THE ASSERTION MOVED ONTO THE MESSAGE rather
than the failure count; and A THROW PRECONDITION if that prefix ever stops
matching zero sections, because a future collision would send the case quietly
back to testing contiguity. That third part is R13 working - hunting the attack
surface its own remedy opens.
  Every suite figure UNCHANGED at 3789/0/43513/352, and keeping it unchanged
  shaped the fix: the message assertion folded into one expect rather than two,
  and the collision control written as a throw rather than an assertion.

IT WENT PAST THE ITEM TWICE AND BOTH ARE WORTH MORE THAN THE FIX.
  (1) IT AUDITED EVERY OTHER RED CASE IN THE FILE for the same hole, by parsing
  the file and testing each body for a message assertion: ALL THIRTEEN assert on
  message content, so section 4's was the only one. That is the difference
  between fixing an instance and establishing it was the only instance.
  (2) IT RECORDED THE GENERAL LESSON, which is the part a later reader cannot
  re-derive from the diff: verify has FIVE refusal paths and every one produces
  exactly one failure, so expect(failures.length).toBe(1) asserts only that
  SOMETHING broke. It also corrected the fence-word case's inline comment, since
  a vague comment is what let the case and its stated path drift apart.

RULING R43 — NO REGISTER ENTRY FOR THIS, AND ITS REASONING IS RIGHT. It recorded
the judgement rather than acting on it: no known-gaps entry, because the defect
is fixed in the change that found it and the register DELETES resolved entries
rather than marking them closed. The register holds what is open; the durable
part here is the five-refusal-paths paragraph, and that is committed in section
4.12 where the next person editing these cases will meet it.

I VERIFIED THIS ONE MYSELF, as R42 said I would: NO_SUCH_SECTION is a named
constant at line 390, the prefix matches ZERO headers in the log, the assertion
at 464 is expect(v.failures).toEqual([stringContaining("names section ... which
matches 0 of the log's")]) so it pins the DOCUMENTED path's own words, the throw
at 454 carries a comment saying what it protects, and the file runs 27 pass / 0
fail / 128 expect().

Task 4: complete. Two fix rounds, one full review, one scoped re-review, one
controller verification. Twenty findings closed, no Critical at any point, and
NOTHING FABRICATED - the vendor manual reproduced at the exact byte count and the
exact SHA-256 on an independent retrieval. ANSWER: of six tools examined none
refuses to draw because text will not fit; zero of seven with KiCad.

Task 5: dispatched. The task the plan was written around, and the one whose
premise the third-party review overturned. Brief task-5-brief.md plus
task-5-context.md. BASE 3cda4c776b81761618c1db2eefb816b304e25a57.
RULING R44 — I RESOLVED TWO AMBIGUITIES RATHER THAN LET IT GUESS.
  (1) BUILD THE ARMS AS NEW FIXTURE SCHEMATICS, DO NOT EDIT THIS REPOSITORY'S.
  Step 2 needs labels rotated, slid, moved and rerouted, which means editing
  .kicad_sch files - and the ones under circuits/ are AUTHORED SOURCES the
  Global Constraints forbid touching. A two-segment fixture isolating one
  freedom is also better evidence than a mutation of a real board, because a
  reader can see what it tests.
  (2) COMMIT THE PROBE AND THE FIXTURES. Task 4 was sent back for precisely
  this and the criterion that settled it is Task 5's too: someone with only this
  repository and the pinned tool versions reproduces the figures.

## TASK 5 — reported DONE_WITH_CONCERNS. 456d828, 3275bde, 3c36884. Suite 3801
pass / 0 fail / 43614 expect() across 353 files, accounted term by term.
Typecheck clean. 703 insertions 0 deletions in the document, and the first 3389
lines hash identically to the whole file at the prior commit.

ALL FOUR FREEDOMS EXIST. Driven against kicad-cli 10.0.5 on nine authored,
committed fixtures, each its base plus ONE edit with the one-difference property
asserted by a test, identity and naming read out of each export SEPARATELY, and
all nine arms matched a prediction THE PROBE PRINTED BEFORE EXPORTING ANYTHING.
  1 orientation EXISTS. 2 anchor slid along the same connection EXISTS (wire END
  to INTERIOR, 6.35 mm). 3 wire rerouted under it EXISTS (one segment to a
  three-segment dogleg, anchor stationary). 4 another segment of the same net
  EXISTS (63.5 mm across, 5.08 mm down).
  SO G262's "moving one off an overlap changes the circuit" IS FALSE ON ALL FOUR
  AXES. The claim the third-party review overturned is now measured, not argued.

NEGATIVE CONTROL PASSES AND DISCRIMINATES, and the discrimination is a PAIR:
renaming a label on a wire-held net changes naming and leaves identity alone,
while renaming one of two labels that are the ONLY join between two wire runs
removes {R1.1,R2.1} from the partition and adds {R1.1} and {R2.1} - the
connection disappears. That is electrical semantics, not a changed string, and it
could have answered either way. The control the first version of this task
carried could not have.

THE FIXED-ANCHOR FRAMING IS NOT SUPPORTED, and the number that kills it is not
the one I expected. Population is 12 of 48 laid-out blocks. FREEDOM 1 ALONE,
EXHAUSTIVE OVER 4^n, CLEARS 5 OF 12 - so "no side assignment clears it" is FALSE
for five blocks. Any freedom: 7. And of the 5 that nothing clears, THREE HAVE
EVERY LABEL PROBLEM CLEARED and refuse on a defect with no label in it, so only
TWO keep a label problem under every freedom.
  CANDIDATE-SET WIDTH OVER ALL 95 LABEL ANCHORS: min 20, median 80, max 1000 -
  95 OF 95 LARGER THAN FOUR. That discharges the hedge I had Task 2 write into
  G259, which said the set MAY be wider than four. It is, everywhere.

RULING R45 — THE TWO PRE-EXISTING-ASSERTION EDITS ARE THE SHARPEST THING IN THIS
REPORT AND THEY GO TO THE REVIEWER FIRST, NOT TO ME. It loosened one character of
an existing assertion (a \S that held only while every block's first line began
in column one) and bounded section 4's document slice, which ran to end-of-file
and would have swallowed section 5. R39 permitted ADDING assertions to this
plan's own instrument; LOOSENING AN EXISTING ONE IS A DIFFERENT ACT and I am not
ruling it from a summary. Note there is precedent for the other answer: TASK 3
FACED THE SAME WHITESPACE CONSTRAINT AND DEDENTED ITS BLOCK BY ONE SPACE WITH A
DECLARED PARENTHETICAL RATHER THAN TOUCHING THE GUARD. The EOF bound looks like a
correctness fix that section 5 could not exist without, which is a different
character again. Both are documented in the file; the question is whether either
weakens what the guard refuses.

RULING R46 — CONCERN 1 IS THE REAL GAP AND IT IS THE IMPLEMENTER THAT SAID SO.
Step 3 ran under the production ruler ONLY, and section 1's survivor counts say a
per-freedom verdict is EXPECTED to move under the three quantities. So "freedom 1
clears 5 of 12" is a figure at one text box, and the election among the three is
the OWNER'S under G265 clause 4. That does not make the qualitative finding soft
- the freedoms exist regardless of ruler - but the CLEARING COUNTS are
ruler-dependent and must read that way everywhere they appear.

Task review dispatched. BASE 3cda4c7, HEAD 3c36884.

## TASK 5 FIX ROUND 1 — DONE. 75a9bb8, af19ae5. All three Importants, all eight
Minors. Suite 3802 pass / 0 fail / 43551 expect() across 353 files, PREDICTED
TERM BY TERM BEFORE THE RUN AND MATCHED EXACTLY. Typecheck clean. First 3389
lines hash identically at both commits, so sections 1-4 keep the property.

THE EXPECT() COUNT WENT DOWN BY 63 AND THE TESTS GOT STRONGER, which is the
opposite of the direction this plan has moved all along and is correct here:
three tautological assertions deleted, three RED cases reduced to one refusal
STRING each, and a 40-ITERATION REGEX LOOP replaced by one toEqual against an
independent re-derivation. Fewer assertions, more that can fail.

RULING R47 — IMPORTANT 1's CASE EARNED ITSELF ON ITS FIRST RUN AND THAT IS THE
BEST EVIDENCE IN THIS PLAN FOR THE MESSAGE-NOT-COUNT RULE. It had written "line
61" into the expected literal; the real refusal says "line 56". ITS OWN WORDS:
"A count-only assertion would have passed on the wrong number." I have been
pressing assert-on-the-message since Task 4 round 2 on principle; this is the
first time it caught a live mistake inside the round that wrote it.

RULING R48 — IMPORTANT 2's ROUTE IS BETTER THAN EITHER OPTION I OFFERED AND IS
ACCEPTED. I offered restore-and-reindent or keep-and-tell-the-truth. It took the
pattern OUT OF THE ASSERTION ENTIRELY: the NOT-CHECKED case now compares verify's
report against an independent re-derivation that WALKS THE RAW DOCUMENT'S FENCES
instead of reusing parseBlocks, so it can fail where the pattern could not, and
the false comment is gone. That removes the tautology by removing the dependence
rather than by rewording it.
  IT DECLINED THE PROBE-REINDENT ROUTE WITH A REASON I ACCEPT: the original \S
  would then still refuse a legitimate shape - an indented first content line -
  for no safety gain, and the probe's per-label indentation is what makes a
  516-line log readable. NOT RESTORING IT IS MY RULING NOW, so nobody reopens
  it: the brief left it open, the route taken is strictly stronger, and
  reinstating a guard that refuses legitimate input to regain an assertion that
  could not fail would be trading real coverage for the look of it.

RULING R49 — M-1 MOVED THE METRIC AND PUBLISHED THE WRONG ANSWERS, WHICH IS MORE
THAN I ASKED FOR AND THE RIGHT MORE. Lowest-total gives 2 (on tp-follower that
candidate is the UNPERTURBED layout); lowest-label-count gives 8 (ties at zero
label problems, first encountered wins, so a relocation that strands a wire end
beats an in-place side change); the tie-free metric - fewest total among
candidates that clear EVERY label problem - gives 3. ALL THREE ARE PRINTED IN THE
RUN, so the two wrong ones stay driven and cannot recur silently. I asked for a
number; it fixed the thing that produced the wrong number and left the wrong ones
visible.

RULING R50 — IMPORTANT 3 RE-DERIVED RATHER THAN RELAYED, AND ADDED THE CLAUSE I
DID NOT THINK TO ASK FOR. 9 of 11 boards, agreeing with the reviewer, driven
through boardRefs/declarationFor so the mapping is each board's own
perfboard.json matched ON THE BUILDER (G247) rather than by name. And section
5.5a says NEITHER UNAFFECTED BOARD IS THEREBY FINE - feedback's tp-stage is
refused BEFORE checkLayout ever runs. A reader of "9 of 11" would otherwise take
the other two as working.

Scoped re-review dispatched. BASE 3c36884, HEAD af19ae5. THE RISK THIS ROUND
OPENED IS REMOVED COVERAGE: 63 fewer expect() calls means the re-review's first
job is whether anything real stopped being checked.

## TASK 5 RE-REVIEW — ALL ADDRESSED, and the coverage question answered NO BY
DRIVING RATHER THAN BY READING. The 63 lost expect() calls are fully accounted:
three were true by construction inside the old RED case, the rest are per-item
loops consolidated into equivalent-or-stronger aggregates - 18 per-arm
byte-identity expects to 2, a 40-entry UNFAILABLE regex loop to 1 real
comparison. It re-ran the whole suite and each directory alone and matched every
figure exactly.
  IT PROVED THE NEW CHECK IS STRONGER BY BREAKING THE CODE IT GUARDS: it
  INJECTED AN OFF-BY-ONE BUG into verify-pastes.ts's line-number computation and
  the new case failed red with a full list mismatch, WHERE THE OLD PATTERN WOULD
  HAVE STAYED GREEN. That is the cleanest possible answer to "fewer assertions,
  stronger tests" - not an argument, a demonstration.
  It also corrupted the REAL on-disk fixture rather than the test's injected
  reader and got the real refusal at the same line 56, re-ran the full probe from
  a clean tree to byte-identical output except the commit line, and re-drove the
  grep term count itself at 0/0/0/0 against a control of 5.

RULING R51 — THE NEW FINDING IS A PRACTICE DEFECT OF MINE, NOT A TASK 5 DEFECT,
AND IT GETS A REGISTER ENTRY BECAUSE IT BINDS TASKS 6 AND 7. The claim "the
figure was predicted term by term before the run" CANNOT BE VERIFIED FROM THE
COMMITTED TREE: the report that carries the prediction lives under .superpowers/,
which is gitignored and untracked.
  THAT IS TWO RECORDED FALSE-GREEN SHAPES AT ONCE - a prediction asserted after
  the run, and a claim whose only evidence is in a gitignored directory - and I
  WALKED THE IMPLEMENTERS INTO IT. I have been instructing since Task 4 to write
  the predicted figure down before the run, and the only place the instruction
  gave them to write it was the report. So the practice I introduced to make a
  figure falsifiable is itself unfalsifiable by construction.
  IT CHANGES NO VERDICT HERE, because the reviewer re-derived every figure the
  claim concerns independently of when it was predicted. Task 4 got this right
  by accident: its arithmetic table is in section 4.12, which is COMMITTED.
  CRITERION: a prediction is in the committed artifact - the probe's own output,
  or the document - not only in a gitignored report. MECHANISM, untried: have
  the probe print its prediction and its result in the same run, so the log that
  gets pasted carries both and the paste checker holds them together.
  I CARRY THIS INTO TASKS 6 AND 7's DISPATCH, so the instruction stops producing
  the defect.

## TASK 5 FIX ROUND 2 — DONE, d91c998. G271 created. Register-only: 95
insertions, 0 deletions, verified insertion-only by hashing the first 24235 lines
before and after. Suite 3802/0/43551/353 unchanged. Typecheck clean.

I READ G271 MYSELF as I said I would. All five clauses present. Heading names the
defect as the controller's. Evidence is a check that COULD HAVE FAILED - git
ls-files --error-unmatch on the report returns "Did you forget to git add" -
rather than an assertion that the directory is ignored. Verified splits CONFIRMED
for every clause of the mechanism against RELAYED for the reviewer's inability to
verify ordering. CRITERION and MECHANISM distinct, mechanism marked untried AND
explicitly not implemented. I also confirmed .gitignore line 33 is .superpowers/,
the PREDICTION lines sit at log lines 43-45 under STEP 2 ahead of any export, and
the commit touches one file.

RULING R52 — IT NARROWED MY OWN FINDING AND THE NARROWING IS CORRECT. I framed
G271 as "the prediction is unverifiable". It established the gap is narrower:
THE DECOMPOSITION IS COMMITTED - both rounds' commit messages carry the
term-by-term arithmetic - so nobody need take the figures on trust. WHAT NO
COMMITTED ARTIFACT CARRIES IS THE ORDERING, because a commit message is written
after the run too. The unverifiable claim is WHEN, not WHAT. Saying so stops a
later reader over-correcting a gap that is real but smaller than my wording.

RULING R53 — AND IT FOUND A WORKING COUNTER-EXAMPLE ALREADY IN THE TREE, WHICH IS
WHAT MAKES MY MECHANISM CREDIBLE WITHOUT ANYONE TRYING IT. Section 5's
MEASUREMENT predictions sit on the arms in fixtures.ts, the probe prints all ten
BEFORE it exports a netlist, the committed log carries them, section 5 pastes
them, and the paste checker holds the two together on every bun test. THE
ORDERING THERE IS A PROPERTY OF THE PROGRAM, NOT OF A WRITER'S GOOD FAITH - which
is the whole point and it already exists.
  IT ALSO RECORDED THE ONE OBSTACLE VISIBLE FROM HERE: a probe CANNOT print the
  suite's expect() total, because the suite is what runs the probe's own tests.
  So my mechanism is sound for a measurement prediction and the suite figure
  needs a different home. That is a limit I did not see when I wrote the
  mechanism, and it is recorded rather than worked around.

Task 5: complete. Two fix rounds, one full review, one scoped re-review, two
controller verifications. Fourteen findings closed, no Critical at any point, no
fabrication, and THE PLAN'S CENTRAL QUESTION ANSWERED: all four freedoms exist,
the fixed-anchor framing is dead, and the label problem is mostly tractable -
what is left behind it is other defect classes.

Task 6: dispatched. Typesetting as optimisation, and whether the MODEL transfers.
Brief task-6-brief.md plus task-6-context.md. BASE d91c9984fa576617d3953cd43d19be3e2c2df959.
RULING R54 — I GAVE TASK 6 TWO THINGS THE BRIEF DOES NOT CARRY.
  (1) ONE PHRASE IN THE PLAN DOES NOT SURVIVE A GREP. The plan frames this
  repository as using "a per-part first-fit placement search"; git grep -i
  first.fit over lib/schgen/render/ returns NOTHING, and Task 3 found
  field-placement.ts chooses among ELEVEN candidate slots with an area-weighted
  cost - best-of-N by cost, not first-fit. So the first-fit-versus-total-fit
  framing may already be wrong about this repository. ESTABLISH IT, DO NOT
  INHERIT IT.
  (2) G71 GOVERNS STEP 3 AND EXPLAINS WHY THE NO-COST-FUNCTION RULE IS NOT MERE
  PROCESS: no published source states an acceptable number of crossings, bends
  or wire length, so a threshold would be this project's invention wearing a
  citation - and nobody tried to score schematic readability and failed, it was
  never attempted.
  Plus R51's corrected prediction practice, so the instruction stops producing
  the defect G271 records.

## TASK 6 — reported DONE_WITH_CONCERNS. 3657509, 3f99e54, 40e1cb2. Suite 3809
pass / 0 fail / 43592 expect() across 353 files, +7 tests and +41 assertions, all
the new section 6 describe. Typecheck clean. make check RED on exactly G251's
four boards and two cause classes, untouched. Append was 683 insertions 0
deletions and the first 4209 lines byte-identical to a copy taken first.

RULING R55 — IT CORRECTED BOTH CHARACTERISATIONS OF THE PLACER, INCLUDING MINE.
I told it the plan's "per-part first-fit" did not survive a grep and that Task 3
found best-of-N by weighted cost. BOTH ARE HALF-RIGHT AND THE FILE IS BOTH THINGS
ON TWO PATHS: cands.find(c => covered(c).length === 0) is FIRST-FIT over a fixed
candidate order by a BOOLEAN predicate with the cost never consulted; the
clear ?? chooseLeastCovered(cands, area) tail is BEST-OF-N by weighted overlap
area, reached only when nothing is clear. Greedy sequential across units, no
backtracking at either level. Candidate set is 11 for a two-pin passive and 13
for a four-side IC, not a constant.
  AND IT MEASURED THE SPLIT RATHER THAN DESCRIBING IT: of 75 unit placements
  over the ten blocks with a grid-legal layout, 60 ARE SETTLED BY THE FIRST
  CLEAR CANDIDATE AND 15 REACH THE COST. In the paper's own vocabulary:
  first-fit on the feasible path, best-fit on the infeasible path, nowhere
  optimum-fit. The grep control is real - eleven hits elsewhere in the tree, so
  it could have matched.

RULING R56 — THE PAPER NEVER SAYS "TOTAL-FIT" AND I USED THE PHRASE REPEATEDLY.
total[ -]fit is ZERO hits in Knuth and Plass; optimum[ -]fit is 27. Its three
names are FIRST-FIT, BEST-FIT, OPTIMUM-FIT. The plan says total-fit, my brief
said total-fit, and I said it to the owner. A coined term passed off as a
citation's is exactly what G71 warns about, in miniature, and it was mine.

RULING R57 — THE TRANSFER BOUNDARY IS THE PAPER'S OWN, WHICH IS THE RIGHT WAY TO
DRAW IT. p.1121 names BIN PACKING as what the problem would be and CONTIGUITY as
the only thing that rescues it; label placement has no contiguity, so the
shortest-path/DP search does not transfer and neither do the demerit magnitudes.
What does: badness as a continuous quantity; TWO GRADES OF BADNESS, INFINITE AND
FINITE, which this repository has both of implicitly and globally and declares
neither; a feasibility threshold kept separate from the ranking, already here
convergently; a penalty attached to a choice, which nothing here has; the
first-fit-versus-optimum-fit INSIGHT; and non-refusal on failure. IT DECLINED TO
DECLARE THE BADNESS SPLIT because declaring it is an acceptance criterion - names
it and stops, which is the invariant held correctly.

RULING R58 — THE G71 FINDING IS THE MOST USEFUL THING IN THIS TASK AND IT KILLS A
MOVE I HAVE BEEN HALF-ASSUMING WAS AVAILABLE. KNUTH AND PLASS DECLARE BOTH THEIR
FORMULAE "QUITE ARBITRARY" and report that nobody can experiment with a large
fraction of the parameters. SO "ADOPT THE LITERATURE'S COST FUNCTION" IS NOT A
MOVE THAT EXISTS - the literature supplies a SHAPE plus an explicit disclaimer of
the NUMBERS. G71 said a threshold would be this project's invention wearing a
citation; this establishes the citation would not even be borrowable.

RULING R59 — CONCERN 7 IS A LIVE HAZARD FOR THE VERY NEXT TASK AND I AM CARRYING
IT INTO TASK 7's DISPATCH. Appending section 6 put blocks INSIDE SECTION 5's
slice-to-EOF - the same trap section 4 hit and that Task 5 fixed by bounding.
Section 5 survives only because it counts label-run fences specifically. That
dependence is now written beside SECTION_5_HEADING, so a section 7 append is a
decision rather than an accident. TASK 7 APPENDS SECTION 7.

Task review dispatched. BASE d91c998, HEAD 40e1cb2. HIGHEST-RISK SURFACE: SIX
QUOTATIONS TRANSCRIBED BY HAND FROM RENDERED PAGE IMAGES, because the scan's OCR
mangles exactly the marks a citation turns on - it reports NP complete.3 coming
out as NP ~ o m p l e t e . ~. That is the right method and it is also the one
method a reviewer cannot check with a grep.

## TASK 6 FIX ROUND 1 — DONE, 5ca6f2d. Suite 3809 pass / 0 fail / 43594 across
353 files: NO test added or removed, +2 assertions, both replacing stale literals
or a tautology inside existing cases. Typecheck clean.

RULING R60 — THE RE-RUN FALSIFIED TWO ROUND-0 CONCLUSIONS, SO R59's CALL WAS NOT
BOOKKEEPING. The reviewer offered re-word or re-run and re-word was cheaper. Had
I taken it, TASK 7 WOULD HAVE SYNTHESISED A FALSIFIED CLAIM.
  Population went from 4 parity circuits / 10 blocks / 75 placements with NO
  PULTEC BOARD to 13 declared cases / 48 grid-legal blocks / 255 placements,
  through the same laidOutBlocks that section 5 already used. First-fit/cost
  split 202/53, was 60/15. Fallbacks production 53, order-wise best 51, worst
  54, was 15/13/15. Slot movers 21, was 7. Status movers 3, the same three.
  FALSIFIED (1): "no arm is worse by count" IS FALSE - worst 54 against
  production 53, with tp-stage running 3 to 5 around 4. That was the sentence
  that made "re-walk and keep the best" look free, and it is not.
  FALSIFIED (2): "the corpus's only text-over-text overlap is an artefact of the
  walk" was A QUARTER RIGHT - FOUR fallbacks cover text, only TP1#1 is a status
  mover, so ONE is reachable by reordering and THREE ARE NOT, and two of those
  three sit on boards the old corpus did not contain. Both superseded in place
  rather than annotated, which is the supersede-means-delete rule.

RULING R61 — IT FOUND THE LIMITATION THAT INVERTS ITS OWN HEADLINE AND PUBLISHED
IT IN THREE PLACES. "36 of 48 blocks driven over every order" sounds like broad
exhaustion. ALL 36 EXHAUSTED BLOCKS HAVE ZERO FALLBACKS - they are the blocks of
at most 7 units. ALL 53 FALLBACKS LIVE ON THE 12 BLOCKS OF 8 OR MORE UNITS,
exactly the ones too large to exhaust. So the order-wise best is EXACT WHERE
THERE IS NOTHING TO MEASURE AND AN UPPER BOUND EVERYWHERE IT MATTERS. Stated in
sections 6.5, 6.10 and G272. That is the self-limitation a reviewer would
otherwise have had to find.

RULING R62 — THE MECHANISM OF THE CRITICAL IS WORTH MORE THAN THE FIX AND IT SAID
SO ITSELF: "I inherited a corpus from masked-problems.ts, THE TOOL I WAS
CROSS-CHECKING AGAINST, instead of choosing one for the question I was asking."
Taking your population from the artifact under test is a false-green route nobody
on this branch had named. AND THE REMEDY IS DERIVED FROM THE FAILURE: P6 requires
the grid-legal count to EQUAL SECTION 5's COMMITTED 48, so the next agent cannot
inherit a narrower corpus quietly. That is the control that would have caught it.

RULING R63 — THE p.1150 CORRECTION PAID A DIVIDEND THAT TOUCHES TASK 4. Taking
the sentence AFTER the mis-cited one gives TeX's actual behaviour when nothing
fits: "an overset line and an error message that encourages the user to take
corrective action". THAT IS PLACE-WHAT-YOU-CAN-AND-LOG-WHAT-YOU-COULD-NOT, which
is the SIXTH SHAPE Task 4 recorded in G268 as an unretrievable lead from a
commercial silkscreen placer. The shape now has a 1981 primary source, quoted
verbatim off a rendered page. TASK 7 SHOULD CONNECT THEM - G268's criterion asked
for a quotable primary source for the behaviour, and while this is not Allegro,
it is the behaviour, published and citable.

Scoped re-review dispatched. BASE 40e1cb2, HEAD 5ca6f2d.

## TASK 6 RE-REVIEW — ALL ADDRESSED, no new findings, no disputes. It re-derived
rather than relayed: fresh probe run reproduces the committed log byte-for-byte,
section 5's 48 confirmed independently, and 202/53, 53/51/54, 255 placements and
36 of 48 all re-derived. Both falsifications confirmed, and the old unqualified
wording is GONE - it greped for it - surviving only as an explicitly quoted
"round 0 wrote" artifact, which is supersede-means-delete done right.
  THE INVERTING LIMITATION CONFIRMED INDEPENDENTLY by a script summing fallbacks
  by EXHAUSTIVE/BOUNDED label straight off the committed log: 36 exhaustive
  blocks 0 fallbacks, 12 bounded blocks 53 fallbacks. Exact match. All three
  required statements located.
  EVERY CONTROL DRIVEN RED AND RESTORED. P6 refused when the population was
  sliced to 10 - 10 against an expected 48, which is exactly the Critical
  recurring and being caught. P7 refused when a bounded block's exhaustive flag
  was flipped - 12 violations. mulberry32's first draws for seeds 1-30 are 30
  DISTINCT values against the old LCG's clustered 0.24. The UNCLASSIFIED bucket
  printed 3 items when a whitelist pattern was removed, so it could have failed.
  And the replaced tautology was driven red ALL THREE WAYS.
  Quotations verified against 300dpi RENDERED PAGE IMAGES from the pinned PDF
  with the hash matched, not the OCR layer - p.1150 and p.1162 both verbatim.

Task 6: complete. One fix round, one full review, one scoped re-review. Thirteen
findings closed including ONE CRITICAL. The Critical is the most valuable single
finding of the plan: a corpus inherited from the artifact under test, which
falsified two headline conclusions when widened, and whose remedy is a control
derived from the failure.

RULING R64 — I AM WITHDRAWING MY OWN R30 MECHANISM, BY MY OWN CRITERION-VERSUS-
MECHANISM RULE. During Task 3 I ruled that Task 7's synthesis would get its OWN
document, because a synthesis living inside the material it synthesises cannot be
read first. I made that ruling WITHOUT THE TASK 7 BRIEF IN FRONT OF ME. The brief
answers the concern directly: it specifies A SUMMARY TABLE AT THE HEAD OF THE
DOCUMENT, which is exactly the thing a reader meets first.
  THE CRITERION STANDS - the synthesis must be readable before the material.
  THE MECHANISM IS WITHDRAWN - a separate document was my guess at how to meet
  it, made before I had read the brief, and the plan's deliberate one-document
  structure meets it another way. That is precisely the shape this repository's
  rule describes: the criterion is the settlement, the mechanism is advice from
  someone who had not yet tried it. It applies to my rulings too.
  Task 7 writes section 7 plus the head table in the existing document, and
  RECORDS THE DEVIATION where a later reader would look for it.

RULING R65 — THE HEAD TABLE BREAKS THE CONFINEMENT CHECK BY CONSTRUCTION AND THAT
IS EXPECTED, NOT A VIOLATION. Every round since Task 3 proved confinement by
hashing the document's first N lines. An insertion ABOVE section 1 defeats that
by design. Task 7 verifies confinement by heading anchors instead - sections 1-6
byte-identical with the inserted block excluded - and says which method it used
and why the old one no longer applies. It still edits not one word of sections
1-6.

RULING R66 — THE SECTION 5 SLICE HAZARD IS TASK 7's DECISION TO MAKE EXPLICITLY.
Task 4's slice ran to EOF and would have swallowed section 5; Task 5 bounded it.
Task 6 then found that appending section 6 put blocks INSIDE section 5's own
slice-to-EOF, and section 5 survives only because its cases count label-run
fences specifically - a dependence Task 6 wrote down beside SECTION_5_HEADING
expressly so that the next append would be a decision rather than an accident.
TASK 7 IS THAT APPEND. It bounds section 5's slice, or gives section 7 a
non-colliding fence word, or pastes no measured blocks at all - and says which
and why. Three tasks have now met this trap; the third one is the one that gets
to stop being surprised by it.

Task 7: dispatched. The synthesis, and the last task. Brief task-7-brief.md plus
task-7-context.md. BASE 5ca6f2dad34dd6b2704ea41b532fe2dc6a095b14.
I ALSO CARRIED R63's CONNECTION IN, marked as mine and to be verified not
relayed: section 6's p.1150 sentence gives the place-what-you-can-and-log-the-
rest behaviour a 1981 primary source, which is G268's sixth shape. It does not
CLOSE G268 - that entry's criterion asks for a source for the Allegro behaviour
specifically - but the behaviour is now citable, and Task 7 amends G268 to say
what this settles and what it does not while keeping the criterion intact.

## TASK 7 — reported COMPLETE. 7951a9d, 57e1202, d855a5d. Suite 3812 pass / 0
fail / 43602 expect() across 353 files, +3 tests and +8 assertions accounted case
by case. Typecheck clean. Three files only, nothing in lib/ circuits/ boards/ or
the Makefile, no manifest change, no dependency.

TABLE IS 18 ROWS: 6 ESTABLISHED ELSEWHERE, 8 DEMONSTRATED HERE, 4 INTEGRATION
HYPOTHESIS, tallied by an awk pass over the committed slice. THE PLAN EXPECTED
MOSTLY HYPOTHESES AND IT IS NOT - and section 7.0 says why, with the line that
redeems the count: SIX OF THE EIGHT DEMONSTRATED-HERE ROWS DEMONSTRATE A LIMIT,
NOT A SOLUTION. A table where everything looked established would have been a
failed table; a table where eight rows are demonstrated LIMITS is a real one.

R65 MET AND MET WELL. Confinement by heading anchor: against parent 5ca6f2d,
parent [section 1..EOF] and child [section 1..section 7] BOTH HASH to b9fd12dd
over 352125 bytes, the 1695 bytes above section 1 are byte-identical, and the
inserted table is 4643 bytes between them. Not a word of sections 1-6 edited.

R66 DECIDED AND THE REASONING IS BETTER THAN MY THREE OPTIONS. Section 7 PASTES
NO FENCED BLOCK AT ALL. Not because it had nothing to paste - because SECTION 6's
slice is the stricter trap: its pinned fence tally covers EVERY block in its
slice-to-EOF, so any section 7 block breaks it with a message about section 6.
Bounding or widening a CLOSED section's guard for a block section 7 does not need
was costed and declined. Three new cases make the emptiness checkable - emptiness
itself, a RED drive inserting a block and asserting the tally disagrees while
NAMING THE WORD, with the clean tally as control, and an eight-anchor
presence-then-order check. All three driven red.

RULING R67 — G275's DEVIATION IS AFFIRMED: THE DEFINITION GOVERNS, THE TASK LIST
WAS DESCRIPTIVE. Step 3's level 2 carries a DEFINITION - run against this
repository's own inputs and the result observed - and also a sentence naming
Tasks 1, 2 and 5. Task 6 drove placeFields over all 48 blocks and 255 placements,
which meets the definition verbatim and was re-driven byte-for-byte by a
reviewer.
  THE ENUMERATION WAS A PREDICTION MADE WHEN THE PLAN WAS WRITTEN about which
  tasks would produce run-against-our-inputs evidence. Task 6 produced some.
  The definition is constitutive; the list was descriptive. Following the
  definition is not widening the levels - it is applying them.
  I told Task 7 the levels were not its to change and it did not change them: it
  followed the definition, marked the cell with a dagger, recorded the deviation
  and offered the reversal. That is the discipline working, not a breach of it.
  CONDITION ON THE AFFIRMATION: the dagger and the record must say that the
  enumeration named three tasks and this is a fourth, so no reader concludes the
  level list was quietly widened.
  Cost if wrong: one cell, 6/7/5 instead of 6/8/4.

RULING R68 — THE CENSUS FINDING FALSIFIES SECTION 5 IN TWO PLACES AND A REGISTER
POINTER IS NOT ENOUGH. It drove board-sheets.ts: 0 of 11 draw, 11 refused, 0
undeclared, and SIX BOARDS REFUSE AT validateCircuit BEFORE ANY TEXT IS PLACED
with counts 18, 20, 14, 14, 14, 28 - only the 18 previously published. From the
same run: THE CENSUS NAMES THE FIRST REFUSING BLOCK, NOT THE ONLY ONE, which
falsifies section 5.8's heading and section 5.10's mechanism 2 - "the only thing
refusing transistor-preamp-lab" - against section 5.5a OF THE SAME SECTION.
  It recorded this in G274 clause 1 and did not edit section 5, which was the
  right instinct under my do-not-edit instruction. BUT A FALSIFIED CLAIM LEFT IN
  THE DOCUMENT A READER MEETS, WITH THE CORRECTION ONLY IN THE REGISTER, IS THE
  TELLING-IS-NOT-RECORDING TRAP RUN BACKWARDS. Section 5.10's mechanism 2 is
  exactly the kind of line an implementer acts on.
  I AM AUTHORISING A NARROW EDIT TO A CLOSED SECTION: a correction notice at
  both sites, in the same form Task 2 used for G259 - the original wording left
  standing, a pointer immediately beneath it, and the correction carried in
  full elsewhere. Findings are not rewritten; the reader is stopped.

Task review dispatched. BASE 5ca6f2d, HEAD d855a5d.

## TASK 7 FIX ROUND 1 — COMPLETE, 96a534c. All eleven items. Three files, 299
insertions 33 deletions, every deletion a replaced sentence or comment. Suite
3812/0/43602/353 UNCHANGED - the round added no assertion. Typecheck clean.

RULING R69 — ONE DEFECT, ONE CAUSE: BOTH WRONG NUMBERS WERE UTF-16 CHARACTER
COUNTS LABELLED AS BYTES. 511 non-ASCII characters in the slice, 413 of them the
section sign, giving a gap of exactly 523 - which accounts for the whole
discrepancy. My 352648 is confirmed to the byte.
  AND IT CORRECTED MY CORRECTION BY ONE BYTE EACH WAY: insertion 4662 at d855a5d
  and 4645 at 7951a9d against my 4661 and 4644, and "only the 1695 is right" is
  right as a CHARACTER count where the bytes are 1696. A one-byte boundary
  convention neither of us had stated. MY +17 DELTA IS CONFIRMED IDENTICALLY, so
  the finding stands in full and only my arithmetic needed the same medicine I
  prescribed. Section 7.7 now states the convention so the figure is
  re-derivable.

RULING R70 — THE PATTERN FIRED A FOURTH TIME, IN THE ROUND THAT NAMED IT, AND
NOBODY MADE A MISTAKE. This is the finding of the round and it is better than the
three instances I asked it to name.
  Round 0 wrote that the hash was "invariant under every later edit outside
  sections 1-6". I THEN AUTHORISED AN EDIT INSIDE SECTION 5. So the slice moved
  and that sentence became FALSE BY POLICY, NOT BY ERROR. A HASH IS INVARIANT
  ONLY OVER MATERIAL NOBODY IS LATER PERMITTED TO TOUCH - and the thing that
  invalidated it was my own ruling, arriving after the sentence was written.
  THE DURABLE FORM IT ADOPTED: parent hash plus ENUMERATED EXCEPTIONS plus a
  check that removing exactly those exceptions reproduces the parent hash. It
  does, to the byte. AND REMOVING ONLY ONE OF THE TWO POINTERS FAILS IN EITHER
  DIRECTION, which is the per-exception control - so the check cannot pass by
  removing the wrong thing. G276 carries all four demonstrations and a
  two-branch criterion.

RULING R71 — ITS OWN GUARD CAUGHT IT WALKING INTO THE HAZARD IT WAS DOCUMENTING.
A first draft of section 7.7 pasted an sh fence to show the re-drive command,
which would have broken BOTH section 6's pinned tally and section 7's own
zero-fence assertion - "the exact hazard section 7.6 documents, walked into by
the subsection documenting it". Removed before any test ran. That is R13 at its
limit: the remedy's own attack surface, found inside the paragraph describing the
attack surface.

RULING R72 — THE SECTION 5 PRECEDENT IS NARROW AND I AM BOUNDING IT HERE SO IT IS
NOT READ WIDER. Its concern is fair: these pointers are this plan's first
closed-section edit. THE AUTHORISATION WAS FOR A POINTER BESIDE A CLAIM THIS
PLAN'S OWN LATER WORK FALSIFIED, in the form Task 2 used for G259 - original
wording standing, no figure touched, nothing rewritten, correction carried where
it already lives. IT IS NOT authority to revisit a closed section's findings, to
re-grade it, or to edit one because a later reader would phrase it differently.
A falsified claim earns a pointer; a claim someone merely disagrees with does
not.

PARKED FOR THE FINAL WHOLE-BRANCH REVIEW: G276 states that nothing else on this
branch has been audited against its criterion, and Task 7 did not audit. Every
self-measurement figure published on this branch is now suspect in the same way -
that is the final review's job, not Task 7's.

Scoped re-review dispatched. BASE d855a5d, HEAD 96a534c.

## TASK 7 RE-REVIEW — ALL ADDRESSED, no Critical, no Important. Task 7: complete.
ALL SEVEN TASKS COMPLETE.
  IT ATTACKED THE CONFINEMENT CHECK THE RIGHT WAY, which is the verification I
  most wanted: it INJECTED AN UNAUTHORISED EDIT INSIDE SECTION 1 - outside both
  enumerated exceptions - reran the removal check, and it correctly FAILED to
  reproduce the parent hash. So the check catches an edit OUTSIDE the enumerated
  set, not merely confirming the two named blocks are the only difference. It
  also drove single-pointer removal in both directions and both fail. Written
  with its OWN script, not the implementer's.
  Every figure re-derived independently in both conventions, including the
  report's one-byte refinement over my own numbers, with the 523 gap counted
  rather than copied. It drove the zero-fence assertion red by appending a real
  block and BOTH guards fired - section 7's zero-fence and section 6's pinned
  tally, the latter naming the extra fence word - reproducing the documented
  hazard exactly. Suite 3812/0/43602/353 run in foreground, typecheck clean,
  tree clean with all three files SHA-256 matched to baseline after restore.

PARKED FOR THE FINAL REVIEW'S FIX DISPATCH, NOT SPUN AS ITS OWN ROUND: the
reviewer's own independent removal script HIT THE IDENTICAL ONE-BYTE OFF-BY-ONE
the implementer hit, both from undercounting a blank line before section 5.10's
blockquote - it is preceded by TWO newlines, not one. TWO INDEPENDENT
IMPLEMENTATIONS MAKING THE SAME MISTAKE FROM THE SAME CAUSE is worth a clause on
G276, which is already the entry about self-measurement figures. The reviewer
declined to add it on scope grounds, correctly - reviewers do not commit. I am
batching it into the final review's single fix dispatch rather than spending a
round-trip on one clause.

## ALL SEVEN TASKS COMPLETE. Dispatching the final whole-branch review.

## FINAL FIX — 526b590. All five items closed, 3 files, 527 insertions 36
deletions. Suite 3812/0/43602/353 IDENTICAL, no move to account for. Typecheck
clean. No attribution.

RULING R73 — THE SWEEP I ORDERED FOUND FIVE BAD QUOTATIONS, NOT ONE, AND ONE OF
THEM I RELAYED TO THE OWNER AS FACT. It checked 46 quotations - every
double-quoted span of 8+ characters in the head table and section 7, normalised
for soft wraps and emphasis, searched across seven files. 41 reproduced, FIVE DID
NOT.
  THE ONE THAT MATTERS TO ME: section 7.7 AND G276 attributed to round 0 a
  sentence IT NEVER WROTE - "invariant under every later edit outside sections
  1-6" - with [RAN] zero matches at both 7951a9d and d855a5d. ROUND 0's ACTUAL
  WORDS WERE "Not one word of sections 1-6 is edited".
  SO R70's ATTRIBUTION OF FAULT WAS WRONG AND I MUST CORRECT IT. I wrote that
  round 0 claimed invariance under every later edit, and told the owner the
  same. It did not. It made a NARROWER claim that was TRUE WHEN WRITTEN, and MY
  SECTION 5 AUTHORISATION FALSIFIED IT AFTERWARDS.
  WHAT SURVIVES: the fourth demonstration is still real - a claim invalidated by
  POLICY rather than error - and the remedy (parent hash plus enumerated
  exceptions plus a removal check) is still the right one. WHAT DIES: the
  suggestion that round 0 over-claimed. It did not. The fault was entirely
  downstream of my ruling, and the fabricated quotation made round 0 look
  careless for a sentence it did not write.
  Also fixed: row 18 had a word altered inside a G232 quotation, row 11 had an
  unmarked elision of a log line, and the head table quoted section 1's own row
  non-contiguously. Two quotations whose sources are not in the tree were read by
  hand and left, recorded as the sweep's limit.

RULING R74 — DISPUTE 1 UPHELD: THE FINAL REVIEW's "median row 781 characters"
DOES NOT REPRODUCE, and I passed it into the fix brief and to the owner without
re-driving it. It measures 761.5 characters / 765 bytes at 96a534c and d855a5d,
and 738.5 at 7951a9d. The max 1465, the ten cells over 300 and the 740-character
cell ALL reproduce exactly, so the finding stands and only that one figure was
wrong. The document now publishes the re-derived figure WITH ITS UNIT rather than
the one it could not re-derive, which is the right call.

RULING R75 — DISPUTE 2 UPHELD: EXTENDING THE SWEEP WAS CORRECT. I asked for
quotations OF THE REGISTER OR THE OWNER; it checked every quotation, which is the
only reason the fabricated round-0 sentence was found - that is a quotation of a
COMMIT, outside my remit as written. Its reasoning is right: leaving a fabricated
quotation standing while fixing another would have been the wrong call. A remit
that would have preserved a fabrication is a remit worth exceeding, and it said
so rather than doing it quietly.

RULING R76 — THE RENDER VINDICATED MINOR 1 FAR BEYOND ITS GRADE. Before: the
table laid out 6300 px tall and spanned to x=1195 IN AN 1100 px PAGE with
scrollWidth stuck at 1100, so the last three columns - depends on, evidence and
LEVEL - were CLIPPED AND NOT SCROLLABLE. THE GRADE COLUMN THE WHOLE SECTION IS
ORGANISED AROUND COULD NOT BE READ AT ALL. After: 822 px tall, right edge 838,
nothing clipped, the eighteen-row map in about one screen, and 108 of 108 cell
strings preserved - CHECKED, NOT ASSERTED. That is why this repository's rule is
to render it rather than to reason about it.

Scoped re-review of the final fix dispatched. BASE 96a534c, HEAD 526b590.
