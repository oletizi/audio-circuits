Final review: the seven-task text-handling research plan
========================================================

**Range** `1635fd4..96a534c`, 52 commits, 42 files, 16 459 insertions / 11 deletions.
**HEAD** `96a534c16788b343202b21f709ab06adad30705f`.
**Reviewer scope** the whole-plan view only. Per-task checks that closed were not re-run.
**Posture** every claim below says CONFIRMED (this reviewer drove it) or RELAYED. Nothing was
fixed, nothing committed, no tracked file modified; `git status --porcelain` is empty at
finish and the sibling repository is clean.

VERDICT
-------

**APPROVE WITH FIXES.** Three Important findings and two Minor. **None of them touches a
research conclusion** - the survey's substance, its evidence grades and its three reserved
decisions all hold. Two of the three Important findings are the same shape the plan spent ten
fix rounds policing (a superseded figure left live; a quotation that is a splice), and the
third is the parked erratum, which is worse than the controller judged because its only
record is gitignored.

The plan's own self-review called the outcome correctly: *"not one of eighteen approaches
draws a board."* The document says so in its head table and does not soften it anywhere.

----

A. CROSS-SECTION FIGURE CONSISTENCY
-----------------------------------

**One quantity is stated twice with different values. Everything else I drove is consistent.**

### FINDING A-1 (Important) - §6.7 carries a superseded population as a live figure, and cites a section that no longer contains it

`docs/schematic/text-handling-research.md:4931`, the fourth row of §6.7's cost table, answering
*"could this repository measure it today?"*:

> **Yes, today, with no new machinery.** `FieldFallback` gives the count directly: **15 of 75
> unit placements** on this corpus (§6.5). Nothing aggregates or publishes it as a measure.

**CONFIRMED, three ways, each a check that could have failed.**

1. **§6.5 does not contain that figure.** Grepped §6.5's own line range (4642-4868) for `15 of
   75` and for a bare `15`: zero hits of either. The citation points at a section whose text
   does not support it.
2. **§6.5 files that exact population as superseded.** Its corpus table at `:4656` reads
   `PARITY_CASES - 4 circuits, **10** blocks, 75 unit placements, **no Pultec board**` in the
   *round 0* column, against `**48** blocks, **255** unit placements` in the round 1 column, and
   `:4322` says *"published has been superseded rather than annotated."*
3. **The live figure is 53 of 255.** I summed `tools/schgen/field-order/probe-run.log`'s 48
   per-block lines independently of the log's own summary line, with a script that parses each
   block's `N unit(s) ... production K fallback(s), min A max B`: **blocks=48 units=255
   production=53 min=51 max=54**, which reproduces the log's summary exactly. Had the summary
   line been stale the two would have diverged.

**Why this is the Important one.** The document's head table warns about this precise hazard
eight lines from the top - *"THE TWO FALLBACK FIGURES IN THE TABLE ABOVE ARE FROM DIFFERENT
POPULATIONS AND A RATIO BETWEEN THEM MEANS NOTHING"* - and §6.7's cell is that ratio, written
as a current capability measurement, with no disclaimer, five thousand lines from the warning.
**Supersede means delete**, and this is the one site in either file where the replaced
population survives outside an explicit disclaimer.

**Failure scenario.** An agent costing *publish the fraction of labels placed without overplot
as a readability measure* reads §6.7, takes 15/75 = 20% as the figure the measure would report
today, and builds a baseline on it. The live population is 53 over 255; §1's 15 **has never
been re-taken over the 48** (G274 clause 5, §7.4), so the quantity §6.7 claims is available
today is in fact unmeasured.

**Where it belongs.** One cell. The two honest forms are the live figure with its population
(`53 of 255 unit placements over all 48 declared blocks (§6.5)`), or §1's figure with §1's
population named and the warning attached. The surrounding sentence - that the count exists,
is reported, and is not aggregated as a measure - is correct either way.

### The four named hazards: all four confined correctly (CONFIRMED)

| hazard | result |
| --- | --- |
| fallback population 10 blocks / 75 placements vs 48 / 255 | every surviving mention of 75 or "ten blocks" sits inside a disclaimer: `:4312` *"ROUND 0 ... MEASURED TEN BLOCKS AND CALLED THEM 'EVERY'"*, `:4656` the round-0/round-1 corpus table, `:4315`, `:4770`, and register `:24611`, `:24658`. **The one exception is A-1.** §1's own `over 10 laid-out blocks` at `:520`/`:527` is §1's legitimate G260 population and says so. |
| "three of eleven boards" | survives only at `:3891`/`:3896` and register `:2154`, both inside the correction that names it a block count mislabelled as boards. The corrected figures are present and consistent: `12 of 48` at `:3863`, *"twelve of forty-eight laid-out"* at `:3885`, nine-of-eleven at `:3893`/`:3898`. **No site still asserts three of eleven.** |
| *"no arm is worse by count"* (falsified) | five occurrences, every one a report of its own falsification: `:4819`, `:5089` (*"falsified by the widening"*), `:5118`, `:5785`, register `:24658`/`:24661`. |
| *"the corpus's only text-over-text overlap is an artefact of the walk"* (falsified) | three occurrences, all disclaimed: `:4837`, `:5786` (*"is a quarter right"*), register `:24666`. |
| census-names-the-first-refusing-block | §7.2 point (2) at `:5385` carries the correction in full, **and both falsified §5 sites carry pointers at the point of use**: §5.8's heading at `:4028` and §5.10's mechanism 2 at `:4178`, each naming §7.2 (2) and G274. |

### Quantities I cross-checked and found consistent (CONFIRMED)

- **ELK options 22 / 15 / 224.** 15 ids contain `label` + 7 that reach labels without saying so
  = 22; `0 of 22` set; 224 total, reconciled against the pre-existing test comment. Arithmetic
  and framing agree across the head table, §2.1 and §2.2.
- **§7.1's own composition.** 18 data rows numbered 1-18 with no gap; evidence-level column
  tallies 6 ESTABLISHED ELSEWHERE / 8 DEMONSTRATED HERE (6 plain + 1 "(negative)" + 1
  "(capability only)") / 4 INTEGRATION HYPOTHESIS = 18, matching the head table's *"Six ...
  eight ... four"* exactly. *"Ten of the eighteen are untested here, counting the six level-1
  rows"* = 6 + 4. G275's reversal arithmetic (*"the counts in §7.1 become 6 / 7 / 5"*) is right.
- **§1's survivor counts.** §1.9's TOTAL row 15 / 13 / 20 / 24 agrees with G265 clause 4's
  *"13 under the advance, 15 under the current model, 20 under the rendered ink and 24 under
  `EDA_TEXT::GetTextBox`"*, and with the head table's *"all 15 survive and 9 more appear"*
  (15 + 9 = 24). The 13-of-15 figure appears at `:3467`, `:4212`, `:5446`, `:5495` and names
  §1's population every time.
- **Fifteen fallbacks on four blocks** (G267) against **fifteen over the 10 laid-out blocks of
  the four parity circuits** (G260 amendment): both correct and not in conflict - §1.9's table
  has exactly four non-zero blocks (2 + 1 + 8 + 4 = 15) inside a 10-block population.
- **Tool counts.** §4.1's table has exactly 6 data rows; *"of six tools examined, ZERO refuse"*,
  *"zero of seven with KiCad"*, *"zero of eight with TeX"* are consistent across the head table,
  §4.9, §6.8, §7.0 and §7.5.
- **Freedom counts.** 12 label-blocked blocks; orientation alone 5, some freedom 7, 12 - 7 = 5
  that nothing clears, of which 3 clear every label problem. Consistent across the head table,
  §5.7, §7.0 and §7.1 rows 6 and 9.
- **The state.** 0 of 11 boards; 6 at `validateCircuit`, 5 at layout; of the 5, first problem has
  no text in it on 3. Consistent head table / §7.2 / §7.5.

----

B. THE G276 AUDIT
-----------------

**Result: no further instances. The self-measurement figures in the document and the register
are correct at HEAD.** This is a clean negative and every arm of it could have failed.

G276's criterion: *a figure a change publishes about its own artifact is either (a) pinned to a
named commit with its unit stated, or (b) a hash over named material with its permitted
exceptions enumerated and a check that removing exactly those reproduces the baseline.*

I enumerated the figures the document publishes **about itself** and re-derived each at HEAD with
a script that parses the document's section boundaries and counts fences, table rows and
evidence-level cells independently of anything the document asserts.

| self-measurement | published | re-derived at HEAD | verdict |
| --- | --- | --- | --- |
| §4 *"pastes EIGHT fenced blocks and none of them is probe output"* (`:3336`) | 8 | **8** (`lepton-src` 2, `nsvg-fixture` 1, `nsvg-run` 3, `sd-fixture` 1, `sd-run` 1) | CORRECT |
| §6's pinned fence tally `{ "field-order-run": 7, "kp-src": 7, sh: 1 }` (`:5632`) | 7 / 7 / 1 | **7 / 7 / 1**, 15 total | CORRECT |
| §7 *"PASTES NO FENCED BLOCK OF ANY KIND"* (`:5622`), *"§7's slice holds zero fenced blocks"* (`:5650`) | 0 | **0** | CORRECT |
| §7.1's 18 rows and 6/8/4 level split | 18, 6/8/4 | **18 rows numbered 1-18; 6/8/4** | CORRECT |
| §7.2's eleven-board census table | 11 | **11 boards, all distinct** | CORRECT |
| §4.1's tool table | 6 | **6** | CORRECT |
| G275's *"the counts in §7.1 become 6 / 7 / 5"* if the enumeration binds | 6/7/5 | **6 / 8-1 / 4+1 = 6/7/5** | CORRECT |

**And the register's self-references resolve.** Every `G<n> clause <k>` pointer in both files -
G265(4) x13, G266(3), G274(1), G274(2), G274(5) x2, G274(6), G67(7) x4 - lands on a clause that
exists. *(My first pass flagged all of these as dangling; the cause was my own regex, which
matched `1.` but not G265's `**(1)**` numbering. Re-driven with the parenthesised and
table-row forms added, the result is zero dangling. Recorded because a reviewer's false red is
the same defect as a writer's false green.)*

**No dangling reference was introduced by this plan.** The register references 15 G-ids with no
entry (G3, G4, G7, G8, G18, G25, G26, G36, G37, G41, G42, G46, G113, G194, G198) and one
`§2.14` that is not a heading of this document. **All pre-existing**: across the whole range,
added lines referencing any of those 15 ids = **0**, and `§2.14` appears in no added line. The
document itself has **zero** dangling G-ids and **zero** dangling `§N.M` references over 74
internal section citations.

### The batched item (still absent - include it in the fix dispatch)

**CONFIRMED absent.** Grepped the register and the document for `off-by-one`, `off by one`,
`blank line before`, `two newlines`, `one-byte`: the only hit is register `:23123`, a different
and pre-existing off-by-one. The two-implementations/one-byte/blockquote finding is nowhere, and
it belongs as a clause on **G276**, which is already the entry about self-measurement figures -
it is the mechanism by which a hand-rolled offset check gets the figure wrong, which is the
half G276 currently records only as "the writer may re-run the check and then make one more
edit."

----

C. DOES THE DOCUMENT WORK AS A DOCUMENT?
----------------------------------------

**Yes, and the no-split ruling holds. One Minor finding about the form of §7.1.**

**Read as a fresh reader**: the head table, §7.0-§7.5, then samples of §1.0-§1.9, §2.1-§2.8,
§3.0-§3.3, §4.0-§4.9, §5.0-§5.9, §6.0-§6.8.

**It is one document, not seven stapled sections.** The evidence that it is: §7.0 re-grades
nothing but explains why the levels are not its own; §6.7 reaches back into G71 and §6.1 and
changes what G71 means; §5's two falsified claims carry pointers written by §7; §3's reading
is cited by §6.4 and §7.1 row 3; §1's ruler is carried as a "ruler-dependent?" column in the
head table and re-appears as a caveat on every clearing count in §5 and §6. Sections
cross-reference each other 74 times and every reference resolves.

**A reader can find "what are the options and what is each worth."** The head table's seven
rows answer it at one line per section; §7.1 answers it per approach with *what it would fix /
would NOT fix / depends on / evidence / LEVEL*; §7.2 answers it per board; §7.3 names the four
that fix nothing and the one the research made least promising. That is the question answered
three times at three resolutions, which is what a 5 798-line document needs.

**The head table is honest about established versus hypothesised.** It is explicitly *"Every
figure in this table is `[RELAYED]` from the section named beside it"*, it ends the §7 row with
*"Not one of the eighteen has been shown to draw a board"*, and it carries the two-population
warning and the three reserved decisions above the fold. It does not read as a summary written
to flatter the work.

**The no-split ruling survives the test.** The head table makes the document navigable in the
specific sense that matters: a reader who reads only the first 116 lines leaves with the
correct conclusions, the correct caveats, and a pointer per finding. Splitting §7 into a second
document would have put the synthesis where the warning about the two populations could not sit
eight lines from the figures it governs - which §7.7 records as the deviation it replaced. The
length is defeated by the table, not by the reader.

### FINDING C-1 (Minor) - §7.1, the plan's named deliverable, is in a form that cannot be rendered as a table

**CONFIRMED by measurement.** §7.1's `SOLUTION SPACE` is a **7-column** markdown table with 18
data rows: **median row 781 characters, maximum 1 465, one cell 740 characters, 10 of 126 cells
over 300 characters**, 14 503 characters of table body. No markdown renderer lays that out
legibly at any practical page or terminal width; each row becomes a column of wrapped
fragments and the cross-row comparison the table exists for is lost.

This repository's standing practice is *"Look at the output, not only the tests ... Render it,
print it, read it ... a document can be generated and useless."* Nothing in the reports or the
ledger indicates §7.1 was rendered. It reads well in source, which is how it was written and
reviewed.

**Failure scenario.** The owner opens the document in a markdown viewer to answer the three
decisions reserved to him, and the one table built for him to read across is the one he cannot.
**Not graded higher** because the information is complete and correctly cross-referenced, and
because the fix (one row per approach as a short subsection, or a narrow table plus per-row
prose) is presentational and touches no figure.

----

D. THE INVARIANT, ACROSS ALL SEVEN TASKS
----------------------------------------

**Held. All three reserved decisions are named, carry their figures, and are unanswered -
including by implication.** CONFIRMED.

**The three, at §7.5:**

1. **How much overlap is acceptable** (G260). Carries 53 field placements drawn over something
   over 48 blocks, 4 covering other text, 3 of those 4 unreachable by reordering; zero of eight
   comparable systems refusing; and - the honest part - **that there is no sheet to look at**,
   so the criterion is answerable only against an artifact that does not exist. The criterion is
   quoted from G260, not widened, and no substitute is proposed.
2. **Which text-geometry quantity governs a collision** (G265 clause 4). Carries a four-row
   table of width error, height, and the fallback population each quantity implies (15 / 13 /
   20 / 24), and states that the plan declined to settle it and why.
3. **Whether the infinite/finite split should be declared** (§6.3, §6.11 item 2). Carried to
   §7.5 as the third decision with the Knuth-Plass fact behind it and §6's own statement that
   it is the owner's.

**Swept for breaches and found none.** Greps for recommendation and election language across the
document returned four hits, all of which *refuse* to decide: `:618` *"a reader who elects"*
(describing consequences, not electing), `:1409` and row 17's *"an owner decision in any case"*,
and `:2274` describing a wrong answer reached by accident. **No site states a threshold** for
acceptable overlap - greps for `acceptable (if|when|up to|below)`, `no more than N overlap`,
`tolerate N` returned zero.

**Mechanisms are marked.** All three mechanism subsections are titled with it (§3.13 *"every one
untried"*, §5.10 and §6.11 *"Every one UNTRIED, none a plan, none a criterion"*). Of the twelve
entries G265-G276, eleven that propose a mechanism mark it untried; the twelfth, **G275**, says
*"MECHANISM: none is offered - the writer of a deviation does not also ratify it"*, which is
the invariant applied to itself and the single best instance of it on this branch.

**The one place an agent could have authored a criterion and did not.** G275 is a deviation from
an *accepted* criterion's enumeration. It records the deviation, names the one cell that
reverses it, states the reversed counts, and refuses to ratify itself - *"only the controller or
a reviewer may ratify it."* That is the correct channel.

----

E. RESEARCH-ONLY WAS HELD
-------------------------

**CONFIRMED, structurally and per-commit.**

- **No change to `lib/`, `circuits/`, `boards/`, `Makefile`.** `git diff --stat` over the whole
  range lists 42 files and not one is under those paths. `git diff --numstat` for `Makefile`,
  `package.json`, `bun.lock`, `tsconfig.json`, `*.mk`: **0 lines**. **No dependency added.**
- **Only 11 deletions in the entire range**, and both sites are sanctioned: 10 in
  `docs/known-gaps.md`, the G262 correction the plan required (*"G262 is to be corrected, not
  extended"*); and 1 in `tools/schgen/port-manifest.json`, which is **a trailing-comma reflow,
  not a removal** - the hunk adds 22 `handWritten` declarations and re-commas the previous last
  entry. Verified by reading the hunk.
- **`text-placement-prior-art.md` got a pointer and nothing else**: 20 insertions, **0
  deletions**, a single blockquote above the Altium subsection, exactly the *"the old document
  gets a pointer, not an edit"* form the plan prescribes.
- **The probes are declared.** All 19 probe modules and 3 test files are in
  `port-manifest.json`'s `handWritten` list; G265 clause 5 records why that declaration was
  needed and that it changes no behaviour.
- **The loosened assertion did not survive, and what replaced it is strictly stronger.**
  I traced every deleted line in `tests/schgen/text-metrics/document-pastes.test.ts` across all
  52 commits. The loosening was `expect(n).toMatch(/^line \d+: .*\S/)` - a pattern relaxed by
  one character so §5's indented blocks would pass. At HEAD that assertion is **gone** and
  `:128` reads `expect(v.notOutput).toEqual(notCheckedByOwnScan(doc))`: an independent
  re-derivation of the not-checked list from the raw document, which fails if `verify`
  mis-numbers, mis-names or drops an entry. The file documents the route taken and the route
  declined. Every other deletion in that file is a rename or a figure superseded by the corpus
  widening; every other deletion in the range is in this plan's own probes and logs, except
  `verify-pastes.py` (-61 +0), deleted when `verify-pastes.ts` replaced it - supersede means
  delete, correctly applied.
- **Every mechanism named anywhere is marked untried and none is a plan.** See D.

### `make check` - RED and pre-existing (CONFIRMED structurally, not fixed)

G251's two causes are `pt2399-core`'s missing `bomConditions` export and three boards missing a
`LEAD_SPANS` entry. I enumerated every file in the tree defining either symbol - 9 files under
`circuits/`, `lib/` and `tools/` - and checked each against the range: **none is touched**.
With `Makefile` and `package.json` at zero changes too, this plan **structurally cannot** have
moved `make check`. Not investigated further and not fixed.

### No AI attribution (CONFIRMED, every commit, not a sample)

Scanned all 52 commit messages in full for `co-authored`, `claude`, `anthropic`, `generated
with`, `session_`, `noreply`. **One hit**: commit `3cda4c7` quotes *CLAUDE.md: "a skipped check
must never look like a passing one."* - a citation in the body, not attribution. No
`Co-Authored-By`, no `Claude-Session:`, no "Generated with" footer, no session link. All 52
authored and committed by `oletizi <oletizi@mac.com>`.

----

F. THE PLAN'S OWN ERRATUM
-------------------------

### FINDING F-1 (Important) - the correction needs recording, and the fact that it currently exists only in a gitignored ledger is G253's failure class recurring

**The constraint is false and still stands unqualified.** `docs/superpowers/plans/2026-10-22-text-handling-research.md:65`:

> Full suite, where a task runs it, with `SCHGEN_SOURCE=...` set ... **These tasks change no
> code, so the suite is expected unchanged.**

**CONFIRMED false.** The range adds `tests/schgen/text-metrics/document-pastes.test.ts` (979
lines), `tests/schgen/label-freedom/fixtures.test.ts` (189) and
`tests/schgen/text-metrics/pen-call-sites.test.ts` (102). The suite at HEAD is 3 812 pass /
43 602 `expect()` across 353 files; it was not that at `1635fd4`. The constraint has been false
since Task 1.

**The controller's reason for parking it is sound** - amending a constraint mid-plan
retroactively changes what finished tasks were held to. **My decision: it must be recorded, and
in two places, because one of them is the defect.**

**The erratum's only current record is gitignored.** It exists at
`.superpowers/sdd/2026-10-22-text-handling-research/progress.md:1110-1113` and nowhere else:
greps for `expected unchanged`, `assertion count`, `3812` and `43602` across
`docs/known-gaps.md` and `docs/schematic/text-handling-research.md` return **zero hits**. And
`CLAUDE.md` is explicit that this is not a record: *"Telling the owner in conversation is not
recording it, and neither is a plan ledger: `.superpowers/` is gitignored, so an entry there is
invisible to review, absent from the history, and destroyed by `git clean -fdx`."* **G253**
already records six findings lost exactly this way, and **G271** already records this plan
giving a prediction *"nowhere to live but a gitignored report."* This is the third instance of
the same thing on the same branch.

**Where it belongs.**

1. **The plan file**, as a dated erratum note beside the constraint - *added after completion,
   so it does not retroactively change what any task was held to* - stating that the constraint
   was wrong from Task 1, that the suite moved on every task, and that each task accounted for
   its delta term by term.
2. **The register**, as a clause on **G271** (the entry about this plan's practices leaving
   their record only in gitignored reports) or a short entry of its own. The durable fact a
   later reader needs is the one the constraint gets backwards: **"research only" does not
   imply "suite unchanged", because a research task that commits a probe must also commit the
   checks that hold its figures, and those are assertions.**

**Failure scenario.** The next plan copies this Global Constraints block - it is good and it
will be copied - a task reports an unchanged suite as evidence that it changed no code, and a
reviewer accepts an inference that was never valid. The register's own standard is that a
constraint which has been false for a whole plan is exactly what a later reader cannot
re-derive.

----

ALSO CHECKED
------------

### Register integrity

**Sound, with one structural variant worth naming and no defect.**

- **252 entries, no duplicate heading.** The file is not in ascending numeric order (27
  descending steps), which is pre-existing topical grouping, not a defect of this plan.
- **Every entry G265-G276 carries the full field set** - Evidence, Verified with
  CONFIRMED/RELAYED, why it is open, what would settle it with CRITERION distinct from
  MECHANISM. **No entry marks itself closed instead of being deleted**: swept the whole register
  for a `Status: CLOSED/RESOLVED` field or a `**CLOSED** -` lead and found none. G266's *"(5)'s
  fenced-block half is CLOSED by ruling"* closes a clause within an entry that remains open and
  says so - acceptable.
- **CRITERION / MECHANISM kept apart.** G275 is the exemplar (criterion = level 2's definition,
  mechanism = the plan's three-task enumeration, deviation recorded, ratification refused).
  G276's criterion is a measurable property of a published figure and its two mechanisms are
  both marked untried and disclaimed. No conflation found.
- **G267 uses "Nothing settles this" in place of "What would settle it"** on three of its
  clauses. **Not a defect**: the clauses are findings about upstream KiCad and the entry says so
  honestly - *"it is a fact about upstream, recorded so that 'KiCad's autoplacer is well tested'
  is never assumed here"* - rather than inventing an action. It also correctly marks §1's
  2043.1 µm and 1422.4 µm figures RELAYED rather than re-claiming them.
- **No entry rests on evidence that could not have failed**, in the twelve I read in full.
  The strongest instances of the opposite: G266 clause 3 **retracts** a hash that *"was green in
  precisely the scenario it was credited for"*; G275's evidence names what would have made the
  deviation not exist; G276's control (*"the §1-§6 hash is identical at three commits, so the
  insertion lengths moved while the measured content did not"*) isolates arithmetic from claim.
- **No entry contradicts another** among those this plan created or amended, on the quantities I
  cross-checked (see A). G265 clause 4, G260's amendment, G267 and G274 clause 5 all state the
  two fallback populations compatibly.

### Marker honesty

**Holds.** §7 declares its convention up front - *"ALMOST EVERY FIGURE HERE IS `[RELAYED]` ...
§7 re-measured nothing that an earlier section measured; it drove one thing of its own, the
board census in §7.2"* and *"A figure with no mark in this section is relayed from the
subsection cited beside it."* **CONFIRMED against the text**: §7's marks are 5 `[RELAYED]`,
5 `[RAN, CONFIRMED]`, 1 `[READ]`, 1 `[NOT RETRIEVED]`, and **all five `[RAN, CONFIRMED]` trace
to the board census §7 drove itself** (`:5345`, `:5392`, `:5768`) or to that run's
0-of-11 output (`:5558`, where the parity-circuit half of the same bullet is separately marked
`[RELAYED]`). No relayed figure is presented as established. §7.1 carries a per-row evidence
column citing the subsection, so the convention is enforced row by row rather than asserted.

### Quotation integrity, spot-checked

**I chose four in-repo, load-bearing quotations that no earlier review was assigned** - earlier
rounds covered vendor documentation, the 1981 paper's seven quotations against page images, and
two literature sources by hash, so the unchecked remainder is the quotations of this
repository's *own* files, which are cheap to verify and carry the plan's governance claims. I
matched each literally, never by paraphrase, after normalising only whitespace and blockquote
markers.

| # | quotation | source | result |
| --- | --- | --- | --- |
| Q1 | G275's quotation of the plan's Task 7 Step 3 level-2 definition | the plan | **exact, em dash included** - G275's claim that *"the em dash above is the plan's own, reproduced rather than normalised"* is true |
| Q2 | the document head's quotation of the owner's commissioning instruction | the plan | **exact** |
| Q3 | §7.5's quotation of `CLAUDE.md`'s invariant | `CLAUDE.md` | **exact** |
| Q4 | §7.1 row 14's quotation of G260 | `docs/known-gaps.md` | **FAILS - see below** |

### FINDING Q4 (Important) - §7.1 row 14 presents a spliced sentence as a verbatim quotation of G260

`docs/schematic/text-handling-research.md:5311`, row 14's *depends on* cell:

> **ENTIRELY on G260, which is the owner's**: *"how much overlap is acceptable, and under what
> count or what kind of overlap it stops being acceptable."*

**CONFIRMED: G260 contains no such sentence.** It contains two, in different clauses:

- `docs/known-gaps.md:1734` - *"His is **how much overlap is acceptable,** and nothing here
  answers it, bears on it, or may be read as implying it."*
- `docs/known-gaps.md:1897`ff, *What would settle it* - *"**CRITERION:** the owner looks at a
  sheet carrying fallback placements and says whether it is acceptable, **and under what count
  or what kind of overlap it stops being acceptable.**"*

Row 14 stitches the head of the first to the tail of the second, inside quotation marks and
italics, **with no ellipsis and no indication of a splice**. Driven as a literal substring
search over the flattened G260 entry (19 635 characters): the quoted sentence is **absent**;
the first 30 characters match at offset 3 602 and the source continues *"and nothing here
answers it..."*. The criterion sentence, searched the same way, **matches exactly** - which is
how I know the apparatus works and the failure is the quotation, not my check.

**§7.5 (1) quotes the same criterion correctly and in full.** So the document is right in the
section devoted to the decision and spliced in the table row that depends on it.

**Failure scenario.** The owner is shown a sentence attributed to him, in quotation marks, that
he never wrote - in the one row the document calls *"the only approach in this table that could
move the board count at all."* The substance is a faithful paraphrase, which is exactly why it
is dangerous: nothing in the row invites the reader to check it. And this branch has already
corrected this defect class once, in the pointer added to `text-placement-prior-art.md`, which
says in terms that *"the elision below is marked, so this is a shortening rather than a
misquotation."* Here the elision is unmarked and it crosses two sentences in two clauses.

**Fix.** Either quote the criterion as §7.5 does, or mark the shortening, or drop the quotation
marks and state it as a summary - *G260 reserves how much overlap is acceptable, and under what
count or what kind of overlap it stops being acceptable.*

### The suite, typecheck, and the tree

- **`SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen bun test`**:
  **3 812 pass / 0 fail / 43 602 `expect()` calls across 353 files**, 153.38 s. **Exactly the
  stated HEAD figure.** `SCHGEN_SOURCE` was set; the port-fidelity guard therefore ran rather
  than failing.
- **`bun run typecheck`**: clean - `tsc --noEmit` with no diagnostics.
- **`git status --porcelain`**: empty at start and at finish. Nothing was perturbed, so there is
  nothing to restore; no tracked file was opened for write. This review is written to
  `.superpowers/`, which `git check-ignore` confirms is ignored at `.gitignore:33`. The sibling
  repository `/Users/orion/work/pedals-work/digital-pedal-platform` is clean and was read only.

----

FINDINGS, GRADED
----------------

| # | grade | finding | one-line failure scenario |
| --- | --- | --- | --- |
| **A-1** | **Important** | §6.7's cost table (`:4931`) states **15 of 75 unit placements** as a live figure *"on this corpus (§6.5)"*; §6.5 at HEAD measures 48 blocks / 255 placements / 53 fallbacks and files 10/75 as its superseded round-0 corpus | an agent costing the overplot-fraction measure takes 20% as today's figure when the quantity is in fact unmeasured at the live population (G274 clause 5) |
| **Q4** | **Important** | §7.1 row 14 (`:5311`) quotes G260 with a sentence G260 does not contain - the head of one clause spliced to the tail of another, unmarked | the owner is shown words attributed to him that he never wrote, in the row the document calls the only one that could move the board count |
| **F-1** | **Important** | the plan's constraint *"the suite is expected unchanged"* is still unqualified and false since Task 1; its only record is the gitignored ledger, which `CLAUDE.md` says is not a record and G253/G271 already record as a recurring failure | the next plan copies the block, a task offers an unchanged suite as evidence it changed no code, and a reviewer accepts an invalid inference |
| **C-1** | **Minor** | §7.1, the plan's named deliverable, is a 7-column table with median row 781 and max 1 465 characters and a 740-character cell - unreadable in any renderer, against this repository's own *"render it, print it, read it"* | the owner opens the document to answer the three decisions reserved to him and cannot read across the one table built for him |
| **B-1** | **Minor** | the batched one-byte off-by-one item is confirmed absent from the register and should land as a clause on **G276** | the next hand-rolled offset check repeats it; G276 currently records the pattern without the mechanism that produces it |

**Not findings, recorded because they could have been.** §5's two falsified claims are left in
place *with* pointers at the point of use, and §7.2 states the reason (*"an agent does not
rewrite a closed section's measured text to match a later reading"*). I considered this against
*supersede means delete* and judge it correct: the brief's own standard is that a falsified
claim must not survive *"outside an explicit disclaimer"*, and both sites carry one immediately
above them. The same convention governs `text-placement-prior-art.md`, which is read and never
rewritten.

**What the plan got right that a whole-plan view is positioned to see.** Of the seven known
hazards I was sent to find, six were already closed - the two falsified Task 6 claims, the board/block
mislabel, the census correction's two downstream §5 claims, and the fallback-population split -
each confined to a disclaimer, each with its pointer. The G276 audit the entry itself said
nobody had done came back empty against seven independently re-derived self-measurements. That
is a better result than ten fix rounds usually leave behind, and the three Important findings
are all one-cell edits.
