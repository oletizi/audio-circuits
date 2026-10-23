False greens: every distinct way a check on this branch passed while establishing nothing
==========================================================================================

`CLAUDE.md` carries the rule this document serves:

> **A skipped check must never look like a passing one. If a guard cannot run, say so loudly.
> Silence that resembles success is the failure mode the whole workflow exists to prevent.**

The rule is stated there and worked here. Over the seven-task text-handling research plan
(`docs/superpowers/plans/2026-10-22-text-handling-research-execution/`) and the schematic-authoring
branch before it, **twenty-nine distinct mechanisms were actually observed** by which a check
passed, a sweep came back clean or a figure was published while establishing nothing. They are
scattered across nineteen review documents, nine task reports, a 1,809-line ruling ledger and
twelve new register entries. **This file is where they are collected**, so that the next agent
writing a guard meets them all at once instead of rediscovering them one at a time.

**Scope and status.** This is documentation. It names no remedy as required and authors no
acceptance criteria for anything. Where a mechanism has no guard in this repository, the entry
says so. Marks are this repository's: `[RAN]` driven here, `[READ]` read here, `[RELAYED]`
another agent's report, not re-driven here.

**This document was swept against its own mechanism 20, and the sweep found defects.** `[RAN]` A
script extracted **every** `*"…"*` span below of eight characters or more and searched each,
whitespace-normalised for the hard wrap on both sides, across the register, the research document,
the ledger, the nineteen reviews, the nine reports, `CLAUDE.md`, the plan, `README.md`, the three
source files cited and one commit message. **The result published here is the invariant and not a
count: every quoted span reproduces in a named source**, re-derivable by re-running that over this
file, and **no total is published, because a total over this document's own text is exactly
mechanism 23** - it was already wrong once during the writing of this paragraph, when four more
quotations were added two sections away.

**What the sweep caught, which is the part worth having.** Its first run reported twelve failures.
**One was a sweep artefact** - the normaliser did not strip a `//` comment prefix, and the quotation
was exact. **Two were this writer's own glosses sitting in quotation marks**, which is itself the
defect, and are now unquoted. **And nine were real: a terminal full stop added inside the quotation
marks where the source carries a comma or runs on.** All nine are corrected. A catalogue of false
greens that fabricated a quotation would be the joke that writes itself, so the sweep is reported
rather than merely performed.

**How to use it.** Every mechanism is meant to be recognisable from its one-line name alone, so the
index below is the document and the entries are the footnotes. **Read the index; read an entry when
you are about to write the thing it names.** The closing section, **Which of these a suite can
catch**, is the practical payoff. The split is **18 / 1 / 10**: eighteen have a mechanical remedy
that exists here or would work if built, one is mechanical in one direction only, and **ten can be
caught only by a reader who is looking for them**, because what is wrong in those ten is a claim
about the work rather than the work.

**Citations.** `reviews/…` and `reports/…` are relative to the plan directory named above. `G<n>` is
an entry of `docs/known-gaps.md`; `R<n>` is a numbered ruling of that directory's `rulings.md`;
`§<n>` is a section of `docs/schematic/text-handling-research.md`.

### The index

| | the mechanism, in one line | suite? |
| --- | --- | --- |
| **1** | An assertion true by construction - a value compared with itself, or a pattern that matches every input it can be given | yes |
| **2** | A parameterised loop over an empty range | yes |
| **3** | An order check that compares a list with its own sorted copy | yes |
| **4** | An absent element that satisfies the comparison - `indexOf` returns −1, and −1 sorts first | yes |
| **5** | An assertion entailed by the one above it - a RED case that never calls the code whose failure it claims to drive | yes |
| **6** | A refusal counted rather than read - one failure asserted where five refusal paths each produce exactly one | yes |
| **7** | A guard whose subject is resolved separately from the thing it guards - a hash over a path the loader need not use | yes |
| **8** | A probe that resolves a different dependency version than the tree it measures | yes |
| **9** | A diagnostic that was never in scope - a single-file compiler run, and a suppression directive at the head of a comment | partly |
| **10** | A perturbation that reddened something else - a harness that names a file the assertion has left, and accepts any red | yes |
| **11** | A check that fires through a different path than the one it documents | yes |
| **12** | A control that returns the treatment's answer | yes |
| **13** | A one-sided perturbation of a symmetric check | yes |
| **14** | A population inherited from the artifact under test | yes |
| **15** | An input unreachable through the production path, treated as representative | reader |
| **16** | A gate that stops checking the input it cannot score | yes |
| **17** | A rule generalised without its boundary - strictly stronger for n ≥ 2, strictly equal at n = 1 | yes |
| **18** | A silent no-op that returns a well-formed answer | yes |
| **19** | A filter applied to the output line rather than to the file | reader |
| **20** | A grep for a paraphrase of the quotation it sought | reader |
| **21** | A search for the conclusion's vocabulary and not the objection's | reader |
| **22** | A negative produced by a capped, narrowed or mis-counted search | reader |
| **23** | A figure published about the artifact the change is still editing | yes |
| **24** | An invariant asserted over material somebody is later permitted to touch | yes |
| **25** | A figure published without the unit, convention or configuration it was taken under | reader |
| **26** | A completeness claim computed over a subset of what it licenses | reader |
| **27** | A guard credited, in the register, with reach it does not have | reader |
| **28** | A prediction verifiable only by trusting when it was written - and whose evidence sat in a gitignored directory | reader |
| **29** | A claim about one's own drive or search that was never performed | reader |

The **suite?** column is argued in the closing section, not asserted here. *yes* means a mechanical
check for the shape exists in this repository or would work if built; *reader* means what is wrong is
a claim about the work rather than the work, and the program is correct. `[RAN]` The tally over this
table is 18 *yes*, 1 *partly*, 10 *reader*, over 29 rows, counted by a script over the table's own
rows rather than by hand.

**That tally is a self-measurement and is therefore an instance of mechanism 23 waiting to happen.**
It is re-derivable - count the third column of the table above - and **nothing makes it go red if a
row is added and the tally is not updated.** It is stated this way rather than omitted because a
reader needs the shape of the split, and stated with its exposure because **G276**'s criterion asks
for the unit and the apparatus, and the honest apparatus here is *count it yourself*.

**One caveat about the sources, recorded because this document rests on them.** `[RAN]` When this
file was started, `docs/superpowers/plans/2026-10-22-text-handling-research-execution/` was
**untracked** - `git ls-files` over it returned nothing while the files sat on disk, unmatched by
`.gitignore`. Every citation below to a review, a report or the ledger would therefore have pointed
into nothing, which is mechanism **28** operating on this document. `[RAN]` It was committed at
`eef7763` while this was being written, by the change that added `CLAUDE.md`'s rule requiring a
research plan's execution record to be committed beside the plan, and `git ls-files` over the
directory now returns 30 files. **The citations below are good because of that commit and not
because of this one**, which is worth saying because the two are a day's work apart and this
document would read the same either way.

**AND `docs/schematic/README.md` DESCRIBES THIS FILE WITH A FIGURE THIS FILE DOES NOT CARRY, which
is worth the paragraph because it is this catalogue's own mechanism 23 arriving from outside.**
`[RAN]` `README.md`'s index row for `false-greens.md` says *"the sixteen distinct mechanisms by which
a check on this branch looked green and established nothing"*, and its standing-of-evidence cell says
*"Each instance verified against its source"*. **Sixteen was the brief's own estimate, written before
the sources were walked; the catalogue found twenty-nine.** The second claim happens to be true - the
sweep reported two paragraphs above is what makes it so - but **both were published about an artifact
that did not yet exist**, which is the same shape as a figure published about an artifact still being
edited, one step further out: there was not even a draft to measure. This file does not edit
`README.md`, because the task that wrote it was permitted to write this file and one pointer on
**G276**, and because an agent revising the index entry that grades its own document is the invariant
`CLAUDE.md` names. **What would settle it:** `README.md`'s row says twenty-nine, or drops the
numeral and says only `the distinct mechanisms`, which is the form that cannot rot.

---

Family 1 - the assertion could not have failed
----------------------------------------------

### 1. An assertion true by construction - a value compared with itself, or a pattern that matches every input it can be given

**From the inside.** You write the assertion in the same breath as the code, using the names in
front of you. `bothPasses.wiresAfter` and `layout.wires.length` are two different expressions and
one of them was passed in to produce the other two lines above. A regex loosened to admit a
legitimately indented line still *looks* like it constrains the shape of a report entry.

**Instances.** `[READ]` `lib/schgen/elk/adapt.ts:296-301` records its own: *"the first version of
this check could not fail. It compared `bothPasses.wiresAfter` with `layout.wires.length` - and
`wiresAfter` IS `layout.wires.length`, passed in two lines above, so it was `x !== x`."* `[READ]`
And in this plan, `reviews/task-5-review.md` A.1: a pre-existing assertion in
`tests/schgen/text-metrics/document-pastes.test.ts` was loosened from `/^line \d+: \S/` to
`/^line \d+: .*\S/`, and the new pattern *"cannot fail for any possible `notOutput` entry"* -
`parseBlocks` right-trims every line, so the reported first line either contains non-whitespace or
is the literal `(empty block)`. The reviewer drove all seven first-line shapes the two patterns
could separate.

**How it was caught.** The `x !== x` case by a perturbation: the whole block was deleted and
nothing went red. The regex case by a reviewer who **applied the pattern to every input the code
could produce** rather than reading it. Neither is visible by eye.

**General form.** An assertion whose two sides are the same quantity under two names; or a pattern
that every value its input can take already satisfies. Ask what input would make this line fail,
and produce one.

**What guards against it here.** Nothing mechanical - `bun test` has no mutation mode, and
**G236** records that as the gap. The repository's answer is the discipline plus a habit visible
in the tree: `[RAN]` `grep -rln "pass over nothing\|vacuous" tests/` names **57 test files** that
assert their premise before relying on it. The fix for the regex case, ruling **R48**, is the
better pattern: it removed the dependence rather than rewording the assertion, comparing
`verify`'s report against an independent walk of the raw document's fences.

### 2. A parameterised loop over an empty range

**From the inside.** The loop is correct, the body is a real check, and the collection it iterates
is computed. Nobody reads a `for` as a claim about cardinality.

**Instance.** `[READ]` **G236** names it as the second of that task's four checks that could not
fail: *"the window loop that would pass over nothing with adjacent bounds (fix round 1, item 2)"*.
The entry names the round rather than the file, so the site is not re-derivable from the register
alone - recorded as a limit of this citation.

**How it was caught.** By the writer, in the fix round, and disclosed in the implementer's own
words in **G236**: *"all four checks-that-cannot-fail on this task are mine"*.

**General form.** Any `for`/`forEach`/`map` whose collection is derived, in a test whose only
assertions are inside the body. Zero iterations is a pass.

**What guards against it here.** The 57-file habit above: assert the population is what you think
before you loop over it. Every reviewer on this plan checked for it by name and
`reviews/task-3-review.md`, `reviews/task-4-fix-1-rereview.md` and `reviews/task-6-review.md` each
report the iteration count rather than the assertion count.

### 3. An order check that compares a list with its own sorted copy

**From the inside.** `expect(x).toEqual([...x].sort())` reads as the claim *this function returns its
results in sorted order*, which is a real property and one you want pinned.

**Instance.** `[READ]` **G236**, which is the entry about it: an order pin added to catch a
reverted `localeCompare` comparator, described in the test, the commit body and the register as
making *"a comparator reintroduced into either function fail here"*. The review put the comparator
back into both name-returning functions and measured **3593 pass / 0 fail / 41,913 `expect()` -
identical** to the clean tree. The cause: *"can only fail when the function's own order differs
from default-sorted order"*, and **both published lists are fixed points of both comparators**, so
*"the assertion compares a list against itself"*.

**How it was caught.** By the review, **by reintroducing the comparator rather than by reading the
assertion**. The implementer's disclosure in the same entry is the sharpest line in the register:
*"I drove the revert and I never drove the pin."*

**General form.** A sort assertion is vacuous on any input that is already a fixed point of both
orders being distinguished. The question is not *is this list sorted* but *does any input in this
corpus order differently under the two rules*. **G236** records that over all 153 pairs of
`transistor-preamp`'s 18 declared nets, **0 diverge** - so no two real nets could drive the term,
and the replacement test asserts the divergence of its constructed pair before relying on it.

**What guards against it here.** Only the replacement case **G236** describes - a `blockCircuit`
fixture whose two crossing non-rail nets are a pair the two comparators order differently, which
`[READ]` the entry reports reddening at 14 pass / 1 fail under the reintroduced comparator.
Nothing general.

### 4. An absent element that satisfies the comparison - `indexOf` returns −1, and −1 sorts first

**From the inside.** You want the document's eight anchors to appear in order. `indexOf` gives you
eight offsets and `sorted(at) === at` is the order check. It is one line and it is obviously right.

**Instances, two, with the same cause and opposite symptoms.** `[READ]`
`reports/task-6-report.md`: *"My own ordering assertion went red on `-1 < -1`"* - both header
literals carried a trailing ` ==` the log does not, so both lookups missed and the comparison
succeeded. `[READ]` `reviews/task-7-review.md` drove the dangerous direction: it renamed the head
table's anchor and computed what the bare ordering assertion would have done, printing
`indices: [-1, 6336, 50339, 108441, 165635, 229903, 290356, 358462]` and
`BARE ORDER assertion sorted(at) == at  ->  True`. Its conclusion:
*"The order assertion PASSES while the head table is gone."*

**How it was caught.** The first by the writer, when a true red arrived for a false reason. The
second by a reviewer **driving the deletion** - the report had understated it, and
`reports/task-7-report.md` records the correction.

**General form.** Any sentinel return value that participates in the comparison you then make.
`-1` is a legal input to `<` and sorts before every real offset, so a missing anchor is
indistinguishable from an anchor at the front.

**What guards against it here.** `tests/schgen/text-metrics/document-pastes.test.ts` asserts all
eight anchors **present** before any index is compared, and the comment says the presence line is
the only teeth in that case and that deleting it silently removes them. §7.6 of
`docs/schematic/text-handling-research.md` states the rule in prose:
*"an ordering case written on bare `indexOf` passes when an earlier heading has vanished"*.

### 5. An assertion entailed by the one above it - a RED case that never calls the code whose failure it claims to drive

**From the inside.** The case is named RED, it perturbs a real fixture, and its assertions are
about the perturbation. It reads as proof that a hand-edited fixture is refused.

**Instance.** `[READ]` `reviews/task-5-review.md` I-2, on `tests/schgen/label-freedom/fixtures.test.ts`:
its two load-bearing assertions *"are tautological once the preceding `toContain` has passed"*. The
case *"never calls the byte comparison whose failure path its comment claims to drive"* and never
reads the file from disk. **G236** records the same shape one layer in: an entailed `not.toEqual`
*"inside the test written to fix"* the order pin.

**How it was caught.** By a reviewer reading the case against the code it names. The remedy taken
(ruling **R47**) earned itself on its first run: the rewritten case had `line 61` in its expected
literal and the real refusal says `line 56` - *"A count-only assertion would have passed on the
wrong number."*

**General form.** A negative case that asserts properties of its own perturbed input instead of
calling the production predicate and asserting the refusal. If the predicate were weakened, the
case would stay green.

**What guards against it here.** Practice rather than machinery: the §5 RED cases in
`document-pastes.test.ts` call `verify` on the perturbed input and assert the failure's text, and
`reviews/task-5-review.md` names them as the right pattern.

### 6. A refusal counted rather than read - one failure asserted where five refusal paths each produce exactly one

**From the inside.** `expect(failures.length).toBe(1)` is precise, it is stable, and it goes red
if the guard stops refusing.

**Instance.** `[READ]` Ruling **R42** and `reports/task-4-report.md`: a relabel RED case fired
through *"not a contiguous slice of section STEP 4b"* rather than the *"0 of the log's headers"*
path it documents, and a count-only assertion could not tell them apart. `[READ]` The fix round
then audited the rest of the file: **all thirteen** other RED cases already assert on message
content, so this was the only instance, and it recorded the general fact - `verify` has **five**
refusal paths and every one produces exactly one failure, so `failures.length === 1` asserts only
that something broke.

**How it was caught.** By the controller, who sent back a finding the reviewer had graded a nuance,
on the cardinal rule. The audit that established it was the only instance was the implementer's own
and went past the item.

**General form.** Any assertion on the *arity* of a refusal rather than its *identity*, in code
with more than one refusal path.

**What guards against it here.** The convention is now in the tree: §4.12 of the research document
carries the five-refusal-paths paragraph, and `document-pastes.test.ts`'s cases assert on
`stringContaining` of the documented path's own words. `[READ]` One case additionally **throws** if
its non-colliding prefix ever starts matching a section, so a future collision cannot send the case
quietly back to testing something else.

---

Family 2 - the check ran, against something else
------------------------------------------------

### 7. A guard whose subject is resolved separately from the thing it guards - a hash over a path the loader need not use

**From the inside.** You pin the dependency by SHA-256. A hash is the strongest guarantee you can
write, and the entry you file says so.

**Instance.** `[READ]` **G266** clause 3: the ELK probe's pin hashed
`moduleRepoRoot()/node_modules/elkjs/lib/elk-worker.min.js`, a path derived from the probe module's
own `import.meta.url`, while the worker was actually built from `import.meta.resolve`, which
resolves against the **importer**. `[RELAYED]` driven by a reviewer from a scratch location: *the
old pin passes on the committed 0.9.3 bundle while the caller loads 0.12.0* - green in exactly the
scenario the register credited it for. The probe now hashes the file behind the same URL it hands
`workerFactory`.

**How it was caught.** By a reviewer that drove the drift scenario rather than reading the pin, and
the register entry that had credited the pin was corrected (ruling **R19**).

**General form.** **G266**'s own words, which are the transferable sentence here: *"a guard whose
subject is derived separately from the thing it is meant to guard can be green about a file nothing
loads."* Two resolutions of what ought to be one path.

**What guards against it here.** For this probe, yes: the pin now hashes the resolved URL and
refuses a URL that is not a local file, driven in both directions. Nothing general.

### 8. A probe that resolves a different dependency version than the tree it measures

**From the inside.** You copy the probe to a scratch directory to iterate quickly. It runs, it
prints numbers, and the numbers look like news.

**Instance.** `[READ]` **G266** clause 3 and ruling **R17**(3): *"a SCRATCHPAD copy of the probe
resolved elkjs via auto-install to 0.12.0"* and reported 235 option ids / 11 algorithms / 153
`layered` options against the pinned 0.9.3 tree's **224 / 12 / 140**. *"A paragraph claiming
`tests/schgen/elk/options.elk.test.ts`'s comment was stale by eleven was written and nearly
published"* - the comment was right and the probe was wrong.

**How it was caught.** By ruling **R4**, which required any probe whose figures reach a document to
be committed. It was caught *on the first use of that rule*: a committed probe resolves inside the
repository, and this one prints the install it used.

**General form.** `bun run`, `node`, `python` on a file outside the repository silently substitutes
an auto-installed or globally-installed dependency for the pinned one. The figure is about a
different program.

**What guards against it here.** Ruling **R4** as practice, plus the mechanism that enforces it:
`tests/schgen/port-fidelity.test.ts` refuses an undeclared `.ts` under `tools/schgen/`, so a
committed probe must be declared in `tools/schgen/port-manifest.json` (**G265** clause 5). The
probes print their resolved install. **G266** states what actually closed the hole - *"What closes
the hole is still WHERE the probe is committed"* - with the hash as a second lock rather than a
stand-in for the first.

### 9. A diagnostic that was never in scope - a single-file compiler run, and a suppression directive at the head of a comment

**From the inside.** Both look like the tightest possible probe. Running the type-checker on one
file isolates the question. Writing `@ts-expect-error` above the line you expect to fail is the
idiom for *this must not compile*.

**Instances, both `[READ]` from **G241**'s table of defeated probes, both `[RELAYED]` in that entry
as to who drove them.** *"`bunx tsc --noEmit` on a single probe file"* - *"a single-file invocation
ignores the project `tsconfig`, so unrelated `lib/kicad/install.ts` errors came back for all three
cases including the control"*. And *"a probe with `// @ts-expect-error` written at the head of a
comment"* - *"the directive suppressed the diagnostic it was there to catch, so the case passed for
the wrong reason"*.

**How it was caught.** The first by the implementer, the second by the reviewer - and in both cases
**because the control also failed or also passed**. That is the detection route **G241** generalises
from.

**General form.** A tool invoked outside the configuration that defines what its output means; a
directive whose placement changes its scope. The symptom is identical answers across arms that
should differ.

**What guards against it here.** `bun run typecheck` is the project-config invocation and is the
one every round drove. Nothing refuses a single-file `tsc`. `@ts-expect-error` is in any case
forbidden by `CLAUDE.md`'s never-bypass-typing rule.

### 10. A perturbation that reddened something else - a harness that names a file the assertion has left, and accepts any red

**From the inside.** The harness edits a constant, runs the named test file, and reports whether
anything failed. That is the standard shape for proving a check has teeth.

**Instance.** `[READ]` **G233**, which is the entry about it. A fix round split two scale-constant
pins into a new test file; the harness still named the old one. Of four perturbations driven
against the stale file, **two came back 22 pass / 1 fail with the pinning test not named and two
came back green**. The entry's sentence is the one to carry: *"red for the wrong reason reads
exactly like a check with teeth."* The same staleness reached the register, where seven pointers
named the old file as the home of checks that had moved.

**How it was caught.** By the writer when two of four drives came back green, and **re-found in the
register by the review**. Three hardenings followed, each from a distinct failure: the needle must
be present; the named file must contain the assertion; and **the named assertion must be the thing
that went red**.

**General form.** **G233**'s framing: *"A perturbation harness that names the test file to run is
itself a pointer, and it rots exactly as a prose pointer does."* Any evidence that a check has
teeth is itself a claim that needs a check.

**What guards against it here.** `tests/schgen/pointers.test.ts` asserts, for each pointer it
covers, that the cited file exists and contains a fragment of the cited assertion's own title, and
it is driven red in both directions. **G233** states the limit plainly: the guard covers 17 rows,
**every other prose reference to a test file in this repository can still rot silently**, and the
harness itself was a scratchpad throwaway, so the three hardenings survive only as that entry.

### 11. A check that fires through a different path than the one it documents

**From the inside.** The case is red when it should be red and green when it should be green. Its
comment says which refusal it exercises, and you wrote that comment from the refusal you intended
to trigger.

**Instance.** `[READ]` Ruling **R42**, the same site as mechanism **6**. The relabel RED case
reached its refusal through section-contiguity because the log already contained a real `STEP 4b`
section that the relabelled prefix landed on. The reviewer graded it a nuance - correctly, since
the guard could not be smuggled past either way - and the controller sent it back anyway: *"A CHECK
THAT FIRES FOR A DIFFERENT REASON THAN IT DOCUMENTS IS THE NEAR NEIGHBOUR OF THAT."*

**How it was caught.** By a reviewer reading the refusal message rather than the exit code, and
escalated by the controller on the cardinal rule rather than on consequence.

**General form.** It is distinct from **10**: there, the harness accepted the wrong red; here, the
*case itself* passes through the wrong door, so a later agent reading it believes a path is covered
that is not. Different remedy, too - **10** wants the harness to check which assertion failed;
**11** wants the case to assert the message, or the comment to name the real path.

**What guards against it here.** For this file, the three-part fix under **R42**: a named constant
prefix whose doc comment states it must match no section, the assertion moved onto the message, and
a `throw` precondition if the prefix ever stops matching zero sections.

---

Family 3 - the comparison had no contrast
-----------------------------------------

### 12. A control that returns the treatment's answer

**From the inside.** You run a control. It behaves as expected. That is what a control is for, and
reporting it is the discipline this repository asks for.

**Instances.** `[READ]` **G241**'s table, row six: a jumper-geometry run whose *"three controls
were all NEGATIVE"* - a jumper and two capacitors, each answering `0 of 5` inside slots - so
*"Three negatives cannot distinguish a correct measurement from a probe that only ever answers
zero."* `[READ]` In this plan, the ELK arms: round 0's arms differed from the baseline in **two**
things, the label and the layout option, so growth was not attributable to the label; the reviewer
supplied one missing control and it passed; *"the re-review then pointed out that the second carried
arm b's option set and arm c still had none"* (**G266** clause 9). `[READ]` And a reviewer's own
set-algebra probe *"first matched the `[` in `Rule[]` and reported every rule list EMPTY - caught
only because all three runs printed identically"* (**G245**).

**How it was caught.** Three times by a *second* party, and once mid-flight by the probe's own
author noticing that every arm printed the same thing. Ruling **R22** records the implementer's
line: *"Had I taken the reviewer's passing control as covering the table, the failing one would
never have been written."*

**General form.** **G241**'s amended clause, which is this branch's strongest single rule: *"every
probe needs a control that passes AND that could have answered differently."* A control that cannot
differ from its treatment measures nothing, and a passing control is indistinguishable from a
broken predicate.

**What guards against it here.** No mechanism, and **G241** argues at length that a control is
nonetheless the best available remedy *because* it catches routes the author did not anticipate,
where every other remedy on the branch asks the author to look for something they have already
imagined. **G266** clause 9 now holds one control per option family with two of the three
**failing**, which is a result rather than a gap, and `[READ]` **G266** records
`tools/schgen/elk-labels/probe-run.log` as the twelve-arm run so anyone can re-drive them.

### 13. A one-sided perturbation of a symmetric check

**From the inside.** You disable the arm that computes the difference and run the suite. It stays
green. The honest conclusion looks like *this check has no teeth*, and the honest action looks like
deleting it.

**Instance.** `[READ]` **G241**, item three: the first attempt at the connection-multiset
perturbation disabled only `connOnlyA` and measured **27 pass / 0 fail**, *"because `connOnlyB`
catches the same differences from the other side"*. The same was true of the component multiset.
*"A green there says nothing about the check and everything about the perturbation"*, and reading it
as no-teeth **would have deleted a check that works**.

**How it was caught.** By the writer, who asked what else could have caught the defect the
perturbation introduced. **G241** separates this class from **G236**'s on exactly that point: in
G236 the assertion could not fail; here *"The assertion was fine. The check had teeth the whole
time. What could not fail was the probe - and the probe was the remedy G236 prescribes."*

**General form.** Any check that computes a difference from both directions, any guard with a
mirror. Deleting on a green drive is the dangerous move; the green is a fact about the
perturbation.

**What guards against it here.** Nothing mechanical. **G241**'s criterion is that a perturbation
reported as leaving a check green has been shown to be the only way that check could have caught
the defect, and its end state is the figure to quote: `[RELAYED]` **20 perturbations, 20 red, 0
green**, each restoring its file and asserting the restore byte for byte.

### 14. A population inherited from the artifact under test

**From the inside.** The corpus is right there, already assembled, already in the right shape, in
the module you are cross-checking against. Reusing it looks like reuse.

**Instance.** `[READ]` Ruling **R62** and **G272**, the plan's one Critical, in the implementer's
own words: *"I inherited a corpus from masked-problems.ts, THE TOOL I WAS CROSS-CHECKING AGAINST,
instead of choosing one for the question I was asking."* The population was 4 parity circuits / 10
blocks / 75 placements **with no Pultec board**; widened through the same `laidOutBlocks` §5 used,
it is 13 declared cases / 48 grid-legal blocks / 255 placements - and **the widening falsified two
headline conclusions**, including the one that made *"re-walk and keep the best"* look free.

**How it was caught.** By a reviewer, which is the only place it could come from: the figures all
reproduced, so nothing in the run disagreed with anything. The reviewer's words,
`reviews/task-6-review.md`: a *"population that excludes 38 of 48 grid-legal blocks - including
every pultec"* board.

**General form.** The subject of a measurement chosen by the thing being measured. It cannot
produce a disagreement, because the two sides share their premise. Distinct from **15**: here the
inputs are real, there is simply a subset of them.

**What guards against it here.** Yes, and it is derived from the failure: prediction **P6** in
`tools/schgen/field-order/probe.ts` requires the grid-legal block count to **equal §5's committed
48**, and `[RELAYED]` the re-review drove it red by slicing the population to 10. That is the one
place on this branch where a control that would have caught a Critical is committed beside it.

### 15. An input unreachable through the production path, treated as representative

**From the inside.** A hand-built fixture isolates the arm you want to exercise, and the register
itself licenses a hand-built fixture inside a function's own declared domain. The distinction
between *isolating an arm* and *characterising real input* is one word wide.

**Instance.** `[READ]` **G241**'s table, row five, `[RELAYED]` there: *"a hand-built
`ReferenceGraph` treated as representative of `graphFromNetlist`'s output"* - *"the shape was
unreachable through the production path, so its 14-node urgency figure described no input the gate
can see"*. Withdrawn by its author. **G244** then establishes that the register's own phrasing puts
it on the wrong side of the line: what licenses a constructed input in **G236** and **G100** is that
it goes *through the production constructor*, and the hub does not.

**How it was caught.** By its author, after a closing re-review located the contrary register text
(see **21**). What saves the test is a mitigation neither precedent required of itself: it asserts
the reachable shape beside the unreachable one and labels the hub as outside what
`graphFromNetlist` emits.

**General form.** Ask not whether the input is legal but whether the pipeline can produce it. If it
cannot, the figure is about the fixture.

**What guards against it here.** Nothing general; the practice is to record unreachability with its
reason, which **G196**, **G241** and ruling **R3** each do. Ruling **R3** is the clean application:
Task 5's fixtures are hand-built *because the question is KiCad's own netlist semantics*, and the
dispatch forbade reporting a fixture result as a statement about the eleven boards.

---

Family 4 - the subject was dropped, and the drop looked like a pass
-------------------------------------------------------------------

### 16. A gate that stops checking the input it cannot score

**From the inside.** A paste checker needs to tell *this block is probe output* from *this block is
a transcription*. A majority-of-lines-match heuristic is the obvious discriminator and it works on
every block you have.

**Instance.** `[RELAYED]` `reviews/task-1-re-review.md`, which drove it: *"a block with more than
half its lines fabricated drops below the 50% gate and is silently excluded from checking at all"*,
with the tool's own output line - the block count falling from 14 to 13 - as the only trace. Four
of six lines were fabricated with invented numbers and the checker exited 0. **G265**(i) carries it:
*"A block edited enough stopped being checked - this register's own cardinal failure, wearing a
remedy's clothes."*

**How it was caught.** By a reviewer that **made a document unambiguously wrong and drove the
checker against it**. The round's own report described the checker as *"driven RED twice against
perturbed copies"* without noticing either gap, and both red drives were real.

**General form.** Any classifier whose *unclassifiable* bucket is silently exempt. A remedy with a
hole is worse than no remedy, because it licenses confidence.

**What guards against it here.** Yes, and the fix is the shape worth copying: **inference was
replaced by declaration plus a totality assertion**. A block declares itself; every block is
`VERIFIED`, `NOT-OUTPUT` or `FAILED`; and the suite asserts the three sum to the block count -
which is exactly the property the hole violated. There is no gate left to fall below.
`tests/schgen/text-metrics/document-pastes.test.ts` runs it on every `bun test` (ruling **R12**),
and §1.11 of the research document records that the checker prints the three blocks it cannot check
**by name on every run**, precisely so that *not checked* can never be indistinguishable from
*checked and clean*.

### 17. A rule generalised without its boundary - strictly stronger for n ≥ 2, strictly equal at n = 1

**From the inside.** The fix is a genuine generalisation: *a contiguous slice of the log* strictly
implies *every line is in the log*. You have made the rule stronger everywhere and you reason about
it in the general case.

**Instance.** `[READ]` Ruling **R14** and **G265**(ii): *"CONTIGUITY IS VACUOUS AT LENGTH 1"*. A
one-line `run` block collapses the new rule back to the old one, and the document had exactly one
such block - §1.9's `CONTROL PASSED` line, which a reviewer swapped for an unrelated genuine log
line twice while the checker exited 0. **G265**'s transferable sentence: *"A rule strictly stronger
for n >= 2 was strictly EQUAL at n = 1. Generalising a rule does not generalise its boundary, and
nobody checks the boundary of a rule they have just strengthened"*.

**And the escape the fix itself opened, which is a separate thing and worth the line.** `[READ]`
**G265**(iii), the *relabel dodge*: once *is this block output?* is the whole question, **declaring
a block as not output becomes the way out**. Closed by requiring a non-output block to share no
line with the log. The implementer found it, not a reviewer - ruling **R13** generalises exactly
that: *"A reviewer attacks what exists; only the author of a fix is positioned to see the new way
out it creates."*

**How it was caught.** The n=1 hole by a reviewer, after the round's own seven new test cases
missed it. Then the implementer's diagnosis beat the controller's three proposed mechanisms: n≥2
answers the symptom only, since *substituting a whole genuine contiguous slice passes at every
length*.

**What guards against it here.** For this checker, yes, and strongly: the rule is now four clauses
(names its section and lies inside it; at least two non-blank lines; matches that section at
exactly one offset; does not overlap another block), **eight red drives were promoted to permanent
suite cases**, and §1.11 publishes the residual the fix could not close. Nothing general guards
against the shape.

### 18. A silent no-op that returns a well-formed answer

**From the inside.** You ask a library to place labels and read the coordinates back. You get
coordinates. There is no error, no warning, and the graph even grew, which is what reserving room
for a label looks like.

**Instance.** `[READ]` §2 of `docs/schematic/text-handling-research.md`: under `layered`'s own
documented default, ELK places no label at all. Arm g - the arm without the sentinel - returns
every label at `(0, 0)`, the node's own top-left corner, with 254 overlapping their own body and
**136 of 398 landing on a whole grid step by pure accident**, while the graph grew to
195580 × 133354 because *"ELK reserved space for a label it never placed."* The document's own
sentence: *"Without the sentinel arm this section would have reported arm g's `(0, 0)` as a
placement."*

**How it was caught.** By experimental design, not by review. The probe seeded every label with an
**impossible sentinel coordinate** before layout; arm f returned all 398 still carrying it. A
reviewer then attacked the sentinel with five seeds including positive coordinates no legal
placement reaches, plus an asymmetric pair, and all 398 returned the input every time - so the
return tracks an arbitrary input, which coincidence cannot produce.

**General form.** A third-party call whose did-nothing answer is well-formed and whose default is
the quiet behaviour. §2 is careful about the scope of the lesson: *"What is new is where the shape
lives: in a third-party library, on by default, with the quiet behaviour as the documented default
and the loud one needing an option."*

**What guards against it here.** Nothing in `lib/` - nothing reads an ELK label today, which is why
this is not counted as a twelfth route in the plan's own tally. **G266** clause 2 records the
related live tripwire: `read-graph.ts` and `adapt.ts` contain the words *width* and *height* **zero
times**, so nothing compares the node size ELK returns against the size it was sent, and the day
anyone reserves label space every grown node mis-places its symbol.

---

Family 5 - the search answered a different question
---------------------------------------------------

### 19. A filter applied to the output line rather than to the file

**From the inside.** `grep -rn … | grep -v known-gaps.md` excludes the register. It visibly works:
the register's own lines disappear from the output.

**Instance.** `[READ]` **G245**. `grep -rn` prints `file:line:text`, so the filter dropped a line
whenever the register was named **anywhere in that string** - two different drops at once, the
register's own lines because the path matches, *"which is what made the filter look like it
worked"*, and in every other file **every line that cites the register**. Driven three ways by a
committed tool that reconstructs the pinned commit: **6** hits with the exclusion on the line,
**9** with it on the file, **12** with no exclusion as the control. The three hidden lines each
cite `docs/known-gaps.md` **G238** inline, which is to say the evidentiary ones.

**And its sibling in the same round:** a reviewer's own claim sweep *"truncated with `head -20` and
hid one site until it was re-run untruncated"*. **G245**: *"TWO authors hid true positives behind
their own output filters in this one round"*.

**How it was caught.** By a reviewer sweeping for the claim rather than visiting the sites it named -
under a ruling of the **previous** plan, numbered R70 there, which is not this plan's R70. **G245**
also records the correction to its own first account, which is mechanism **29**'s shape: the entry
*"described the sweep's coverage from the set of sites that ended up being amended, rather than from
what the sweep printed"*.

**General form.** **G245** states it in two sentences. *"A filter written to exclude a FILE, applied
to a LINE, excludes every line that mentions the file"* - and the lines that mention the register
are exactly the evidentiary ones. *"A claim about what a sweep missed is a claim about the sweep's
OUTPUT, so it is checked against that output and not against what was eventually fixed."*

**What guards against it here.** `tools/schgen/claim-sweep.ts` exists and reconstructs the pinned
commit, so this one sweep is re-drivable; nothing refuses a piped `grep -v` or a `head`. Use
`--exclude` on the file and keep a no-exclusion control run.

### 20. A grep for a paraphrase of the quotation it sought

**From the inside.** You remember the sentence. You grep for the words you remember. Zero hits is a
finding and you report it.

**Instance.** `[READ]` **G40**'s amendment, and it produced a real false finding: a whole-branch
review reported that `grep -rn "no strong opinion"` over the tree returns nothing and concluded the
owner's verbatim words survived nowhere. The owner had said *"i don't have a strong opinion about
either"*. The register's verdict: *"The search was for a paraphrase of the quotation it was looking
for"* - and a paraphrase is exactly what a verbatim-words rule forbids producing, so the grep could
not find what the rule exists to preserve. `[RAN]` re-driven here at HEAD, and the result is
circular in a way worth stating: `"no strong opinion about either"` matches **exactly one line in
the tree, `docs/known-gaps.md:5805`, which is the register's own record of the failed search**,
while `"i don't have a strong opinion"` matches G40's verbatim quotation of the owner. The searched
string exists nowhere but in the account of its own failure.

**How it was caught.** By the next agent to read the entry, running the grep with the quotation's
actual words.

**General form.** Any negative result from a search for text you are reconstructing from memory.
`[RAN]` This repository's prose is hard-wrapped - median line length is **77** in
`docs/known-gaps.md`, **76** in the research document and **77** in the ledger - so a quoted phrase
spanning a line break will not match a naive grep either - **normalise whitespace before searching,
and treat a zero-hit result on a quotation as unresolved rather than as a negative.**

**What guards against it here.** Nothing mechanical, and this is the mechanism with the most
practice built around it. The final fix's sweep is the model: `[RELAYED]`
`reports/final-fix-report.md` records **46 quotations checked** - every double-quoted span of eight
characters or more in the head table and §7, normalised for soft wraps, blockquote markers and
emphasis, searched across seven files - **41 reproduced, 5 did not**, including one sentence
attributed to an earlier round that **exists nowhere** (ruling **R73**). Ruling **R75** upheld the
reviewer's decision to exceed its remit and check *every* quotation, because that is the only
reason the fabricated one was found.

### 21. A search for the conclusion's vocabulary and not the objection's

**From the inside.** You go looking for text that contradicts you. You phrase the search five ways.
You find nothing, and you report having looked.

**Instance.** `[READ]` **G244**, which exists for this: the claim was *"gone looking for text that
would contradict you and found the opposite"*; what was done was **one grep over five phrasings**
(`unreachable|cannot produce|no pipeline can produce|input no|a shape the production`). Contrary
text exists in two register entries and neither was found. The reason: *"it searched for the
CONCLUSION's vocabulary and not the OBJECTION's"* - both passages turn on *"hand-built object"*,
which was in none of the five phrasings. The sharp edge is that one of the two sits inside the entry
the search's own subject names as its class, about 650 lines above the text that needed it.

**How it was caught.** By a closing re-review that went looking for contrary text where the writer
had reported there was none. **G244**'s own framing is why it deserves an entry: *"a wrong
conclusion gets caught by the next person who tries the thing; a right conclusion with an
overstated search behind it gets adopted."*

**General form.** A grep for the words you expect to find cannot find the words somebody else used
to say the opposite.

**What guards against it here.** Nothing to run - **G244** says so. Its criterion is that a claim
about one's own search states what was searched **for**, not only what was found, so a reader can
judge the coverage; and its one habit with any mechanism behind it is to **search for the
objection's vocabulary as well as the conclusion's**, which is a checkable omission after the fact.

### 22. A negative produced by a capped, narrowed or mis-counted search

**From the inside.** The query returns nothing, or returns a number, and either reads as an answer
about the tree.

**Instances, three, all `[READ]` from **G267** clause 2 and §3.10 of the research document.** A
listing of upstream's `qa/tests/eeschema` tree was **paginated to 122 entries** *"because the API's
first page caps at 100 and a single-page listing would have been a truncated negative"*. An earlier,
narrower code-search query (`path:qa`) *"returned nothing at all, which would have been the right
answer by accident"*. And a total was withdrawn: *"57 hits"* was the count of printed match
**lines** from `gh search code … --limit 100 | wc -l`, not of files, and a reviewer re-running it
got **38 files** - *"A search total that moves is evidence about the search, not about the tree"*.

**How it was caught.** The pagination by the writer, who read the API's cap; the by-accident
negative by the writer comparing two queries; the total by a reviewer re-running the command.

**General form.** Three separate failures with one shape: the search's own apparatus - its result
cap, its scope, its unit of counting - entered the answer. A negative from a capped listing is not a
negative. A narrower query that agrees with a wider one agrees for an unestablished reason.

**What guards against it here.** Nothing mechanical. The practice adopted is to publish no total
that is not load-bearing, name the pagination, and keep the wider query as the control - §3.10 does
all three.

---

Family 6 - the figure was true when it was taken
------------------------------------------------

### 23. A figure published about the artifact the change is still editing

**From the inside.** You measure the thing you are writing, you get a number, you write the number
down. **G276**'s own line: *"It is not a care failure: the writer may re-run the check, get the
right answer, and then make one more edit."*

**Instances - four, and **G276** is the entry that carries them.** `[RELAYED]` (1) a stale count in
a register clause, invalidated by later clauses added to the same entry in the same change; (2)
§6.4's grep control, where *"the commit that published the control's hit count also changed the tree
the grep ran over"* - the stated command returns 2 where the document says 0, in
`tools/schgen/field-order/probe.ts`'s own prediction text; `[READ]` (3) §7.7's `4643`-byte
head-table insertion, where *"the same commit that published the number edited the head table"*,
moving it from 4645 bytes to 4662. `[READ]` **G233** records the same shape in the previous plan: a
literal `269 citations across 262 lines` that *"was already stale at the commit which published
it"*, because that commit's own insertion changed it.

**AND A FIFTH, FOUND WHILE ASSEMBLING THIS DOCUMENT AND NOT RECORDED ANYWHERE ELSE.** `[RAN,
CONFIRMED]` **G241**'s table of defeated probes carries **six** data rows, counted off the entry
with the table's own `> |` row prefix. The entry's prose says *"THE CLAUSE HAS FIVE INSTANCES ACROSS
TWO AUTHORS"*; its Task 20 amendment, which is what **added** the sixth row, says *"THE TABLE NOW
CARRIES FIVE"* and calls the new one *"The fifth row"*; and the *what would settle it* bullet
enumerates five and leaves the Task 20 row out. **The control that could have answered differently:
the five-item enumeration in that bullet is explicit, so the table and the enumeration can be
compared term by term - they agree on five rows and the table has a sixth.** The conclusion the
entry draws is untouched: the clause has at least five instances across two authors, and a sixth
strengthens rather than weakens it. **This is recorded here rather than on G241 because the task
that found it was permitted to write this file and one pointer on G276, and amending a register
entry it was not sent to amend would be the larger error.** What would settle it: an amendment to
**G241** reconciling the count with its own table, or a statement that the two one-sided
perturbations count as one instance - in which case the prose is right and the amendment's *"fifth
row"* is still the sixth.

**How it was caught.** (2) and (3) by reviewers re-deriving the figures at HEAD; `[READ]`
`reviews/task-7-review.md` names it *"a stale control the task's own output invalidated"*. (1)
`[RELAYED]` from a reviewer via the fix-round brief.

**General form.** Any number a change publishes about its own diff, document, register entry or
tree. Correct when taken, wrong when committed. **G276** isolates what actually established the
claim, which is the useful half: *"The hash was doing the work and the lengths were decoration, and
the lengths are what broke. A hash over material the change does not touch is invariant under the
change; a length over material the change edits is not."*

**What guards against it here.** Nothing - **G276** says in terms that *"A fourth instance would
not go red anywhere"*, and that nothing in this repository checks that a published
self-measurement is still true at the commit publishing it. What exists is a worked form in §7.7
and **G274** clause 6, and one general remedy taken in the previous plan: **G236**'s ruling that a
rotting literal became a computed one - `citationCount` in `tests/schgen/pointers.test.ts` computes
the population on every run and asserts on a fraction that does not move as the register grows.

### 24. An invariant asserted over material somebody is later permitted to touch

**From the inside.** You publish a hash of §1-§6 and say not one word of it is edited, so a later
reader can re-take the same check. The sentence is **true when written** and the hash is the right
instrument.

**Instance.** `[READ]` **G276** instance 4, and it is the sharpest form in the catalogue because
**nobody made a mistake**. Fix round 1 was *authorised* to edit inside §5 - two correction pointers
beside a claim the plan's own later work had falsified - so the hash moved from `b9fd12dd…` to
`f7fcde37…` and the sentence became false **by policy**. Ruling **R70**: *"A hash is invariant only
over material nobody is later PERMITTED to touch"* - and *nobody is permitted* is a policy that can
be narrowed by the person who set it.

**And the attribution in the first version of this instance was itself fabricated, which is why the
entry is quoted carefully here.** `[RELAYED]` Ruling **R73**: the row attributed to round 0 the
words *"invariant under every later edit outside §1-§6"*, a string the ruling records as having
**zero matches** at either commit where round 0's text lives - its own `[RAN]`, not re-driven here.
Round 0 wrote *"Not one word of §1-§6 is edited"*. The finding survives; the suggestion that round 0
over-claimed does not.

**How it was caught.** By the implementer of the round that caused it, which is why ruling **R70**
calls it the finding of the round. The false quotation was caught by the final fix's quotation
sweep (mechanism **20**).

**General form.** *Nothing else changed* is a claim about a policy, not about a file.

**What guards against it here.** For this document, a durable three-part form, and it has been
attacked: the parent's hash, **enumerated exceptions**, and a check that removing exactly those
exceptions reproduces the parent hash, with a per-exception control that fails when one is left in.
`[RELAYED]` A re-reviewer injected an unauthorised edit **inside §1** - outside both enumerated
exceptions - and the removal check correctly failed to reproduce the parent hash, so it catches an
edit outside the named set rather than merely confirming the named blocks differ.

**And the remedy has a sharp edge, recorded on **G276** because two independent implementations hit
it identically.** A span-removal check needs the exception's byte span, and both Task 7's
implementer and the whole-plan reviewer computed it **one byte short**, from the same cause: §5.10's
pointer blockquote is preceded by **two** newlines, not one. The symptom is a hash mismatch with a
delta of exactly 1, which reads like a real residue and is not one. The shape generalised: **take
the span from the document by locating both boundaries in it, never from arithmetic over line
lengths or an assumed single separator.**

### 25. A figure published without the unit, convention or configuration it was taken under

**From the inside.** The number is right. You measured it. Units and rendering configuration are
context, and the paragraph is already long.

**Instances, three, each with a different frame missing.** `[READ]` Ruling **R69** and **G276**:
*"BOTH WRONG NUMBERS WERE UTF-16 CHARACTER COUNTS LABELLED AS BYTES"* - the measured slice holds
**511 non-ASCII characters** (413 of them `§`) for a gap of exactly **523**, so the slice is
352 648 bytes / 352 125 characters. **G276**: *"A length published without its unit is not
re-derivable"*, and in a document this full of `§` the two units differ by enough to look like a
real change. `[READ]` Commit `c0498b2`: §7.1's pixel figures - a clipping geometry at x=1195 with
`scrollWidth` pinned at 1100 - *"were published as properties of the document and are properties of
a renderer as well"*; a re-review reproduced the 6300 px height exactly and **could not reproduce
the clipping under three other CSS configurations**. The paragraph now names pandoc 3.10.1, its
default HTML5 template and CSS, and headless Chromium at 1100 × 900 CSS px, and rests the finding
on what no stylesheet changes. `[READ]` Ruling **R74**: the final review's *"median row 781
characters"* does not reproduce - it measures 761.5 characters / 765 bytes - while the max, the ten
cells over 300 and the 740-character cell all reproduce exactly.

**How it was caught.** The unit by a reviewer re-deriving both conventions; the pixel figures by a
re-reviewer **re-rendering under other configurations**; the median by a dispute from the fix
implementer against a figure the controller had relayed to the owner without re-driving it.

**General form.** A number is a property of a quantity *and* of the apparatus that produced it:
unit, boundary convention, renderer, stylesheet, viewport, ruler. Where the apparatus is unstated,
a reader re-deriving it gets a different number and concludes the content moved.

**What guards against it here.** Nothing mechanical. The practice is visible: every clearing count
in §5 says which text box it is at (ruling **R46**), **G265** clause 4 reserves the choice of ruler
to the owner, and §7.1's paragraph now names its whole rendering stack. Commit `c0498b2`'s own
message says this was *"the third figure on this branch published about its own artifact without the
frame it was true in"*.

### 26. A completeness claim computed over a subset of what it licenses

**From the inside.** Round 0 claimed four cells vary and listed five. Round 1 replaced the hand
tally with a **computed** enumeration, which is the right fix - and computed it over five of the
nine columns the table published. *Nothing else moves* was still a claim over a subset, and now it
had a program behind it.

**Instance.** `[READ]` Rulings **R20**, **R24** and **R27**, and **G266** clause 8. The omitted cell
in round 0 was the one the paragraph three lines above had quoted. The column the re-review swept
and round 1 had not held arm b's worst resize - **31740.0 / 31587.6 / 30966.9 µm** across the three
line heights - while the register published `30966.9` bare and §2.7 ended *"Nothing else moves"*.
Ruling **R24**'s framing: *"a completeness claim that licenses quoting a figure without its ruler"*,
which is the first finding recurring in a dimension its own fix did not cover.

**How it was caught.** By a reviewer that **swept the four columns the computed enumeration did not
cover**. Ruling **R27** carries the lesson: *"GENERALISING A CLAIM DOES NOT GENERALISE ITS SCOPE,
AND NOBODY CHECKS THE SCOPE OF A CLAIM THEY HAVE JUST COMPUTED."*

**General form.** The danger is specific and is named in **G266**: *"A completeness claim is what
licenses a later task to quote a number without naming its ruler"*. A partial sweep with a general
wording is worse than a hand tally, because the computation reads as coverage.

**What guards against it here.** Yes, structurally, for this probe: the column list and the swept
cells are now **one** `METRICS` array used both to print the arm table and to sweep it, so
completeness is true by construction rather than by keeping two lists in step. `[RELAYED]` The
re-review confirmed there is no second list. 12 arms × 13 quantities = **156 cells, 149 invariant,
7 varying**, each printed with its three values.

### 27. A guard credited, in the register, with reach it does not have

**From the inside.** You built the guard, you know what it does, and you write the register clause
from memory of the intent rather than from the code. *A figure edited in §2 breaks the suite* is
what you built it for.

**Instance.** `[READ]` Ruling **R25** and **G266** clause 5. The guard reads fenced
` ```elk-run ` blocks. `[RELAYED]` A re-reviewer **edited a prose figure in §2 from 46 to 99 and
nothing went red**; every number in the surrounding prose is unguarded, both the ones quoted by
hand from a block and the ones derived (*"25.0, 24.9 and 24.4 grid steps"* appear nowhere in the
log). The document's §2.10 was honest about the limit; **the register entry was not, and the
controller had relayed the wide version to the owner**. Ruling **R25**: *"This is the I-2 class
exactly: crediting a guard with reach it does not have"*, and **G266** flags it as its own clause 3
recurring - *"the register is what outlives this session."*

**How it was caught.** By a re-reviewer that drove the gap with a check that could have failed:
edit a prose figure, run the suite, restore, verify the tree clean.

**General form.** The claim about a guard is not the guard. A register entry, a commit message or a
doc comment that states coverage is itself an unchecked assertion, and it is the one that outlives
the session.

**What guards against it here.** Nothing mechanical, and the gap was left open **by instruction**
with a criterion and an honestly-marked mechanism. Ruling **R28** records why extending the guard
is not simply cheaper-or-dearer: the rule cannot be written as stated, because requiring every
decimal-bearing prose number to appear in the log would reject *"25.0 grid steps"*, a correct
derivation absent from the log by construction - *"so the rule would have to tell a quotation from
an arithmetic result."* **G266**'s reader-level summary is the reliable one: *a pasted block cannot
drift from the log, and a prose figure beside it can.*

### 28. A prediction verifiable only by trusting when it was written - and whose evidence sat in a gitignored directory

**From the inside.** Writing the predicted figure down before the run is exactly right, and it
caught a real error: ruling **R41** records a prediction that *"said +8 and asserted the four new
cases contributed nothing - WRONG BY SIXTEEN, IN THE FLATTERING DIRECTION"*, found by its own author
because it had been written down. *"A prediction written down before the run is a check that can
fail; the same figure asserted afterwards would have been unfalsifiable."*

**Instance.** `[READ]` Ruling **R51** and **G271**, and the defect is the controller's own: the
only place the instruction gave implementers to write the prediction was the task report, and
`.superpowers/` is gitignored, so *"the practice I introduced to make a figure falsifiable is itself
unfalsifiable by construction."* Ruling **R52** narrows it correctly - the *decomposition* is
committed in both rounds' commit messages, so nobody need take the figures on trust; what no
committed artifact carries is the **ordering**, because a commit message is also written after the
run. The unverifiable claim is *when*, not *what*.

**How it was caught.** By a reviewer that tried to verify the ordering claim from the committed tree
and could not. **G271**'s evidence is a check that could have failed:
`git ls-files --error-unmatch` on the report returns *"Did you forget to `git add`"*.

**General form.** Two shapes at once, and the register names both. A claim about the sequence of
your own actions has no artifact. And `CLAUDE.md`'s rule bites: *"Telling the owner in conversation
is not recording it, and neither is a plan ledger: `.superpowers/` is gitignored"*. **G253** records
six findings on the previous branch that existed only in gitignored reports, and **G266** clause 9
applies the same rule to a control: *"A control that lives only in a review is a control nobody can
re-drive"*.

**What guards against it here.** A working counter-example already in the tree, which is why ruling
**R53** calls the mechanism credible without anyone having built new machinery: §5's measurement
predictions sit on the arms in `tools/schgen/label-freedom/fixtures.ts`, the probe prints all ten
**before** it exports a netlist, the committed log carries them, §5 pastes them, and the paste
checker holds the two together on every `bun test`. **The ordering there is a property of the
program, not of a writer's good faith.** The recorded limit: a probe cannot print the suite's own
`expect()` total, because the suite is what runs the probe's tests, so the suite figure needs a
different home.

### 29. A claim about one's own drive or search that was never performed

**From the inside.** You drove the revert. You drove the perturbation. You write the sentence that
summarises the round, and it describes the drive you *meant* to do, in the words you would have used
if you had.

**Instances.** `[READ]` **G236** carries the implementer's disclosure. Its first and last
sentences, quoted exactly: *"I claimed a drive I never performed."* … *"I drove the revert and I
never drove the pin."* … *"Had I driven it once, in the same action as the claim, I would have seen
14 pass / 0 fail and the sentence would never have been written."* The claim in between was that
the order pin made *"a comparator reintroduced into either function fail here"*.

`[READ]` **G237** is the entry for the pattern - three prose claims about the author's own drives
that did not reproduce - and **G244** is the same shape applied to a search.
`[READ]` **G246** records it arriving inside the round correcting it: *"that nickname is not
configured in this repository's resolver"* was false, the real limitation was scope, and *"The
limitation was real and the reason given for it was invented"*.

**How it was caught.** Always by a second party, and once - **G246** - by a closing verification
**told in so many words to check whether a stated reason was an excuse**, where a thorough general
audit had passed the same two claims. **G246** is careful that this is a sample of one and not a
claim about model tiers.

**General form.** A wrong sentence about a drive passes every test in the suite. That is **G237**'s
whole finding, and it is why this family exists: the suite checks the code, and nothing checks the
prose about the code.

**What guards against it here.** Nothing mechanical, and **G246** goes further - it records *"The
same discipline, harder"* as a **non-mechanism**, because this branch has watched it fail at least
three times (**G234**, **G236**, **G237**). The two things that demonstrably worked were (a) a
machine check that holds a document to a committed log, which is what
`tools/schgen/text-metrics/verify-pastes.ts` does for pasted output and explicitly does not do for
prose, and (b) a named suspicion handed to a second reader.

---

Two shapes named in the plan that this catalogue could not locate
-----------------------------------------------------------------

`docs/superpowers/plans/2026-10-22-text-handling-research.md:57` enumerates the branch's recorded
routes to a false green and names two that are not placed above:

> …a red drive against unshipped code… and a parse that mixed fresh output with stale files and
> produced the right answer.

**`[RELAYED]`, source that line, unlocated.** `[RAN]` A search for `unshipped`, `mixed fresh` and
`fresh output with stale` across `docs/` and `.superpowers/` returns **that sentence and nothing
else**, and no register entry read while assembling this file carries either shape in other words.
They are listed here rather than reconstructed, because inventing an instance for a named shape is
mechanism **29**. **What would settle it:** the entry or report the plan's author was summarising,
or a statement that the summary over-counted.

That the plan's own tally - *"eleven routes to a false green"*, quoted in §2.6 of
`docs/schematic/text-handling-research.md` as *"the plan's own count of entries in
`docs/known-gaps.md`, not a count this section re-drove"* - cannot be fully enumerated from the
register is itself worth the line. A count whose population cannot be walked is a figure without
its apparatus, which is mechanism **25**. §2.6's own hedge is the right form, and this catalogue's
**29** is a count of mechanisms rather than of entries, so the two are not comparable.

---

Which of these a suite can catch, and which only an adversarial reader can
--------------------------------------------------------------------------

**A suite can catch the ones where the subject of the check is in the program.** Most of families 1
to 4 are mechanical in principle, and on this branch most of them *were* caught mechanically or
closed mechanically:

| mechanism | the mechanical remedy that exists or would work |
| --- | --- |
| 1, 2, 3, 5 | a perturbation that makes the new assertion fail, before it is committed; failing that, assert the premise (57 test files here do) and compare against an **independent** re-derivation rather than against a restatement |
| 4 | assert presence before comparing offsets - committed, in `document-pastes.test.ts` |
| 6 | assert on the refusal's **message**, not its count - committed, and audited across all thirteen other RED cases in that file |
| 7, 8 | hash the artifact behind the URL the loader uses; commit the probe so resolution happens inside the repository - both committed, and `port-fidelity.test.ts` is what forces the second |
| 10 | a harness that refuses to report a valid drive unless the **named** assertion is what failed; `pointers.test.ts` guards 17 citations against the pointer half |
| 11 | assert the documented path's own words, plus a `throw` if the fixture stops exercising it - committed |
| 12, 13 | require every probe to carry a control that passes **and** could have answered differently; **G241**'s untried mechanism is a harness that refuses a perturbation set whose control is not green |
| 14 | assert the population equals an independently committed figure - committed, as prediction **P6**, and driven red |
| 16, 17 | replace inference with declaration plus a **totality** assertion, so every item is in exactly one named bucket and the buckets sum - committed, and the one case that would have caught the original hole |
| 18 | seed an impossible sentinel so *never touched* is distinguishable from *placed at the origin* - the single cheapest technique in this catalogue |
| 23, 24 | publish a hash over named material with its permitted exceptions **enumerated** and a check that removing exactly those reproduces the baseline, with a per-exception control - worked in §7.7, not generalised |

**Two sit between the two halves.** Mechanism **9** is mechanical in one direction only: running the
type-checker through the project config is a one-line habit and `bun run typecheck` is already that
invocation, but **nothing can tell a suppression directive placed wrongly from one placed
deliberately** - what caught both instances was that the control answered the same as the treatment,
which is mechanism **12**'s remedy doing the work. Mechanism **15** is reachable mechanically in
principle - a fixture could be required to come out of the production constructor - and was not
caught that way: **G244** had to locate contrary prose in a register entry, and what rescued the test
was asserting the reachable shape *beside* the unreachable one. Treat **15** as a reader's finding
until something refuses a fixture that no pipeline can emit.

**Only a reader can catch the ones where the subject of the check is a sentence.** Mechanisms
**19-22** and **25-29** share a property: what is wrong is a *claim about the work* - what a search
covered, what a guard reaches, what unit a number is in, when a prediction was written, whether a
drive happened. The program is correct. The suite is green and is right to be green.

Two reasons this is not just *try harder*:

- **The register says the discipline has already failed.** **G246** records *"The same discipline,
  harder"* as a **non-mechanism**, having watched it fail at **G234**, **G236** and **G237**. **G244**
  says outright that *"there is nothing to run"*, and **G276** says *"A fourth instance would not go
  red anywhere."*
- **Where a mechanism was costed, it was found to require reading prose.** Ruling **R28** is the
  worked case: a rule that every decimal-bearing prose figure appear in the log would have to tell a
  quotation from an arithmetic result, so it cannot be written as stated. §1.11 records the same
  boundary for the paste checker - *"A block could be replaced by a different genuine, contiguous,
  unique slice of the same declared section and this would pass. Closing that needs the checker to
  read prose."*

**What worked on the reader side, from the evidence of this plan.** Not thoroughness: **G246**'s one
case is a closing verification on a *smaller* model finding two claims a thorough review had passed,
where the only difference was that it had been **told to check whether a stated reason was an
excuse**. Ruling **R13** is the other: every brief asked the implementer to hunt the attack surface
its **own remedy** opened, because a reviewer attacks what exists and only the fix's author can see
the new way out. Ruling **R75** is the third: a remit that would have preserved a fabrication is a
remit worth exceeding.

**And the asymmetry runs both ways.** `reviews/final-review.md` flagged every register self-reference
as dangling, found the cause was its own regex, re-drove it and got zero - recording the general
point in one line: *"a reviewer's false red is the same defect as a writer's false green."*

**The practical reading for PCB place-and-route, which is the next place this discipline is needed.**
A router's output is a geometry, and every mechanism in families 1 to 4 transfers directly to
checking one: a clearance assertion that compares a span with itself, a loop over an empty net list,
a control net that is clear under every candidate, a population of nets inherited from the router
being graded, a legality gate that stops scoring the board it cannot route. Those are
suite-catchable and should be built that way. What will not be suite-catchable is the write-up: the
figure for how much copper was saved, the claim about which rule binds, the sentence about what the
sweep covered. On the evidence here, that half needs a second reader with a named suspicion, and it
needs the artifact committed so the reader has something to drive.
