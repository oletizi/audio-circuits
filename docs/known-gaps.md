Known gaps
==========

> **THIS REGISTER IS FROZEN. DO NOT ADD TO IT.** The owner, 2026-10-27:
> *"I'm worried that the gaps ledger is silting up with obsolete and misleading
> information."* and *"cut hard, but don't add to it. It's a nucleation site for
> misinformation."*
>
> **What was cut and why.** It held **273 entries over 30,549 lines** - 112 lines
> per entry, the longest 594. **83 amendment banners across 46 entries**, because
> entries were patched in place instead of rewritten or removed: `G259` carried
> eight. Only **29 of 302 numbers had ever been deleted**, although this file's
> own rule was that a resolved entry is deleted rather than marked closed. What
> remains is **31 entries**: the owner's decisions, directives, rulings and
> declinations in his own words, plus the open questions he is owed an answer on.
>
> **Why those and nothing else.** A decision of his that is lost gets re-asked,
> and re-asking costs him attention and stalls the work behind it. Everything
> else in here was one of two things: a finding that the code, the tests or the
> tools state better and nearer to where it applies, or a **current-state claim**
> - a count, a census, a figure - which is the silt. `CLAUDE.md` already named
> that failure and its remedy: the board figure was `0`, `1`, `2`, `5`, `6` and
> `7` inside five days with three files disagreeing at once, and
> *"`bun tools/schgen/board-sheets.ts` is the only thing that answers this
> question; a figure in prose is a transcription with a date on it."*
>
> **A `G<n>` REFERENCE ELSEWHERE IN THE REPOSITORY MAY RESOLVE TO NOTHING, AND
> THAT IS EXPECTED.** At the cut there were **822 citations across 232 TypeScript
> files and 1,781 across 217 other markdown files**. They were deliberately NOT
> rewritten: a reference that resolves to nothing is inert, and a reference that
> resolves to a stale claim is the thing this cut is for. A reader who finds a
> dangling `G<n>` should read the code, run the tool, or look at the artifact.
>
> **Where a finding goes now.** Next to the thing it is about - a comment beside
> the code, an assertion in a test, a refusal message, a line in the spec for the
> work in hand. An owner decision goes in the spec it bears on. **The full file is
> in git** at `a4b66de` if something here is needed again:
> `git show a4b66de:docs/known-gaps.md`.

**`G<n>` IN THIS FILE MEANS AN ENTRY IN THIS FILE, AND NOTHING ELSE.** `CRITERIA`
numbers its own clauses with the same letter, so every CRITERIA reference is
written `CRITERIA G<n>` in full. A bare `G<n>` is this file's.


Open: an owner decision is what settles these
---------------------------------------------

### G71 - no published source states an acceptable number of wire crossings, bends or wire length, so a threshold in a readability rubric would be this project's invention wearing a citation

Measured by the standards research pass (`docs/schematic/readability-research.md`
§2.2, §4.2, §7.3, committed `51f8362`; moved under `docs/schematic/` and indexed
by `docs/schematic/README.md` on 2026-10-19): **every source it could read says
*minimise* and none says how few is few enough.**

- ANSI/ASME Y14.15-1966 **15-7.2**: connecting lines *"should be drawn with as
  few bends and crossovers as possible"*; **15-6.3.5**: *"a minimum of line
  crossings"*. A **withdrawn** standard - G68.
- IEC 61082-1:2014 **Figure 36** is *titled* "Example for avoiding bends and
  cross-overs" and its clause text was not obtained (G70). A title is not a
  requirement (G69).
- **The research literature is weaker here than the standards, not stronger.**
  Hsu & Lin (MLCAD 2022) and the corresponding patent US 12,475,291 report only
  **relative** reduction - the patent *"contains no minimum/maximum numeric
  specifications for acceptable metric values"*. Weave states it *"does not yet
  report the crossing, bend, or visual-similarity metrics"*. EEschematic scores
  aesthetics **subjectively, 5/10 to 9/10, by a human**, and names that as a
  limitation of its own work.

**The consequence that binds.** Inventing a crossing or bend threshold would put
this project **ahead of every published source while appearing to cite one** -
which is G67 clause 7's rubric failure one level down, and the exact shape the
governing invariant exists to prevent.

**The threshold-free form that is available, recorded as a CANDIDATE MECHANISM
and not as a decision.** The field measures these quantities relatively: compute
them for a netlist, record them, and require them not to get worse for that
netlist. `CLAUDE.md` already endorses the economics (*"Minimising a measurable
cost is not a taste judgement"*). **Nobody has decided this is the form**, and
an agent adopting it because it is the only form available would be choosing its
own grading.

**The trap beside the bait.** If absolute thresholds are wanted anyway they are
an owner decision, informed by measuring this repository's existing hand-drawn
Pultec schematics - and `CLAUDE.md` names the trap in that sentence: measuring
them and then treating them as the ceiling makes the as-built artifact the
criterion. **That measurement has not been performed.** The measurement would
inform the decision; it is not the decision.

**EXTENSION, 2026-10-19: the one project that shipped agent-generated schematics
never attempted a readability number either, and it is worth knowing that before
anyone goes looking for one.** This is a measurement that found nothing wrong,
recorded for that reason. The pedals schematic generator was searched three ways,
each of which could have turned up an attempt: all 278 session transcripts
(743 MB, streamed) for `readability score`, `legibility score`, `aesthetic
score`, `crossing count`, `count crossings`, `wire crossings`,
`minimise/minimize crossings`, `readability metric`, `score the layout`, `grade
the readability` - **two substantive hits, neither a scoring attempt**; a
non-test grep of the generator, where every occurrence of "crossing" is strictly
about electrical correctness (a label at the crossing of two wire interiors joins
both nets, so it is refused) and **never about counting crossings for looks**;
and all three revisions of its spec plus both third-party design reviews, none of
which proposes a metric. **Nobody tried to score readability and failed. It was
never attempted** - the reviewer who blocked the labels design proposed templates
plus a no-fallback rule plus an independent reading gate *instead of* a metric,
and that is what was built.

Read with the rest of this entry, that makes the threshold-free form above the
**only** form anybody has shipped, which strengthens it as a candidate and does
not turn it into a decision. The reading the history research offers - INFERRED
there, and recorded here as its reading rather than as a finding - is that
readability in that generator is a **criterion/mechanism split** of exactly the
kind `CLAUDE.md` insists on: the criterion is *"an independent reader can follow
this block from the drawing alone"*, which is a judgement and never a number, and
the mechanisms are templates and clearance refusals, which are machine-checkable
**because** they are not the criterion. A port that goes looking for the number
that means "legible" would be building something that project deliberately did
not build.

**EXTENSION, 2026-10-23, FROM A PRIMARY SOURCE THIS ENTRY HAD NOT READ: THE
MOST-CITED PENALTY MODEL IN COMPUTING DECLARES ITS OWN COST FUNCTION ARBITRARY,
WHICH MEANS "ADOPT THE LITERATURE'S COST" IS NOT A MOVE THAT EXISTS.** This
entry's standing worry is that a threshold invented here would be *"this
project's invention wearing a citation"*. Task 6 of the text-handling research
plan read Knuth and Plass, *Breaking Paragraphs into Lines* (1981), in full -
`docs/schematic/text-handling-research.md` §6.1 pins the file by SHA-256 and
verifies every quotation against the rendered page image rather than the scan's
OCR layer - and found the authors saying it of themselves, of **both** of their
formulae:

> *"The above formula for delta_j is quite arbitrary, like our formula for
> beta_j, but it works well in practice because it has the following desirable
> properties..."* (`[READ]` p.1129)

They also state the cost of tuning it: *"So many parameters are present, it is
impossible for anyone actually to experiment with a large fraction of the
possibilities"* (`[READ]` p.1162).

**What this changes about this entry is the shape of the available move, not its
verdict.** The literature supplies a SHAPE - a continuous cost rather than a
yes/no test, squared so one bad item cannot hide behind many mediocre ones, with
an **infinite** grade for the inadmissible beside a **finite** one for the merely
bad (*"values of r_j > 1 are only finitely bad, so they will be permitted if
there is no better alternative"*, `[READ]` p.1127). It does not supply numbers
anybody could import. **Importing the shape is importing a shape; importing the
coefficients would be this entry's failure mode with the citation's own
consent**, which is worse rather than better, because the borrowed authority is
explicitly disclaimed at the source.

- **Verified** CONFIRMED by the writer of §6 for the retrieval, the hash and the
  three quotations, each read on the page image. Nothing here was taken from a
  secondary account of the paper.
- **It authors no criterion and changes nothing.** The criterion/mechanism split
  below is unchanged, and §6.7 of the research document names what the
  literature's costs ARE and whether this repository could measure each - it
  chooses none, for this entry's reason.

- **Found** 2026-10-19, by the standards research pass committed at `51f8362`,
  read in full by this writer. **The extension** was added the same day from §4
  and §10 (candidate 2) of `docs/schematic/schgen-development-history.md`
  (`8a4d8f7`), which is a different document by a different author - its evidence
  and verification status are stated separately below.
- **Evidence** §2.2, §4.2 and §7.3 of that document, with the Y14.15 clause
  quotations, the patent's own statement about numeric specifications, Weave's
  own sentence declining the metrics, and EEschematic's 5-10 subjective scale.
  **For the extension:** the three searches named above - the transcript keyword
  scan, the non-test grep of `tools/schgen`, and the three spec revisions plus
  both design reviews. **Unlike the rest of this entry, those ARE checks that
  could have failed**, and one of them nearly did: the scan returned two
  substantive hits and both had to be read and dismissed.
- **Verified** **no - RELAYED, by two separate hands.** The standards document's
  text was read by this writer at `51f8362`; everything in it was gathered by web
  fetch through a summarising tool, with nothing cloned, executed or rendered, and
  the document says so about itself. **A fetched web page is not a check that
  could have failed.** The extension is relayed one step further: the history
  research marks its three searches CONFIRMED and names them, but **this writer
  re-ran none of them**, and they are over another repository's tree and
  transcripts.
- **Why it is open** a threshold is an acceptance criterion for an artifact this
  repository's agents produce, so no producing agent may author one; and the
  honest alternative - that there is no threshold - is itself a decision about
  what gate 14 can contain.
- **What would settle it** **CRITERION:** no criterion in a schematic readability
  rubric carries a numeric crossing, bend or wire-length threshold unless a named
  source states it with a clause, or the owner states it as his own decision and
  it is recorded as his. **MECHANISM, untried:** adopt the relative form above -
  measure per netlist and require no regression - which needs no threshold and is
  what the field does; or put the absolute question to him with the as-built-
  ceiling trap stated. Nobody has been asked.

### G82 - nobody with domain expertise ever looked at the drawings this program is about to inherit its templates from, and "acceptable" meant an agent reading PNG renders

**This is the provenance of the artifact, not a complaint about it.** The
schematic generator this program proposes to port produced drawings that were
accepted. The question a later reader cannot re-derive is **by whom**, and the
answer is: by another agent.

| what decided it | what that was |
| --- | --- |
| The gate | A subagent, denied the circuit description, the code, the IR and the design notes, given only the PDF and one section of a render report, instructed to convert every page to PNG at 300 dpi (900 dpi for spot checks) and crop region by region. *"A block that cannot be followed is a defect even if every machine check passes."* |
| The verdict | 103 blocks checked, 101 followable. **20 numbered defects, exactly 1 blocking.** Two passes, three fix rounds, by the same reviewer. |
| What shipped | **16 of the 19 first-pass cosmetic defects were knowingly not fixed**, each listed under *"Known cosmetic items, left as they are by the controller's ruling"* with its cost stated. Half-empty sheets, two different VSSA glyphs on one page, abutting power symbols, sideways supply arrows. |
| Who else looked | **No human.** Confirmed absent from the owner's 123 messages in the session; the spec itself recommends *"a paid human review … before first fab"* and the research found no evidence one happened. |

So **"acceptable" meant one blocking defect fixed and nineteen cosmetic ones
adjudicated by the producing side** - not "clean", and not "a person with
domain expertise read it". The one blocking defect is the reason the gate was
worth having at all: KiCad's do-not-populate cross ran along a Zener's sloping
sides and through its cathode bar, so *"even at 900 dpi the zener's orientation
(anode/cathode) cannot be read"* - on a page whose own note told the builder to
fit that part. A correct netlist, a passing ERC and eight green gates, and the
drawing still could not be built from.

**Why this is his to rule on and not an agent's.** `CLAUDE.md` forbids the
producing agent from authoring the acceptance criteria for its artifact, and an
agent reading renders is a legitimate criteria channel only while somebody other
than the producing side has said it is sufficient. **Nobody has said that here.**
A port that adopts the templates adopts this provenance with them, and the
question of whether a human legibility review is required before this repository
accepts a generated schematic - and if so, at what point, and whose - has never
been put to him.

- **Found** 2026-10-19, by this task, reading §5, §9 and §10 (candidate 3) of
  `docs/schematic/schgen-development-history.md`.
- **Evidence** that document's §5, sourced to the pedals repository's committed
  `h7-platform/boards/v1/VERIFICATION.md` (1295 lines, readability review from
  line 945) and to the reviewer's dispatch prompt recovered from
  `subagents/agent-a5ece5e34462a1b75.jsonl` line 1; the absence of human review
  is its §9, established against the owner's 123 messages in that session.
- **Verified** **no - RELAYED.** The history research read those primary sources
  and marks these claims CONFIRMED; **this writer read the research document, not
  the transcripts or `VERIFICATION.md`.** Both are in another repository
  (`/Users/orion/work/pedals-work/digital-pedal-platform`) and the transcripts
  are 743 MB.
- **Why it is open** it is a criteria decision, and the only person who may make
  it has not been asked. **Nobody asks him unprompted** - this entry exists so
  the question survives until it is naturally in front of him, which is when the
  program's acceptance gates are specified.
- **What would settle it** **CRITERION:** an owner ruling on whether an agent
  reading rendered pages is a sufficient legibility gate for a schematic this
  repository generates, or whether a human must read one, and at what point.
  Until he rules, no document here may describe the ported templates as
  human-validated - because they are not. **MECHANISM, untried:** put it to him
  alongside the related unestablished fact (§9: whether the pedals third-party
  design reviewer was a human or a model - *"Only the owner can settle it"*), so
  one question covers both channels rather than two separate asks.

### G154 - OWNER QUESTION: should `circuits/opamp-buffer` become a directory like the other four circuits? Task 9 added a SECOND top-level file under the existing exception

`CLAUDE.md` is explicit: *"Every circuit owns a directory under `circuits/`"*,
and *"**No KiCad file sits at the top level of `circuits/`.** It gets a
directory even when the circuit is one schematic and one module."*
`circuits/opamp-buffer.ts` is the standing exception and predates this task;
every other circuit - `pultec`, `pt2399-core`, `transistor-preamp`,
`optical-compressor` - has one.

**Task 9 added `circuits/opamp-buffer.schematic.ts` beside it, at the top level,
because its brief names that path** - and that is a second file under an
exception rather than an extension of the rule or a fix to it. Controller ruling
**R20** decided to follow the brief and record the tension rather than
restructure: moving `opamp-buffer.ts` into a directory changes the import depth
of every module that reads it, which `CLAUDE.md` warns *"shows up as a confusing
type error at an untouched line … not as 'module not found'"*, and it is not
Task 9's work.

- **Found** 2026-10-20, Task 9, Step 5, under controller ruling R20.
- **Evidence** `ls circuits/` lists `opamp-buffer.ts` and
  `opamp-buffer.schematic.ts` as the only two files at that level, beside four
  directories; `grep -rn "circuits/opamp-buffer.ts" --include='*.ts' .`
  outside `node_modules` returns **17 lines**, of which **three are actual
  `import … from` statements** whose relative depth a move would change -
  `tools/schgen/symbol-census.ts`, `tests/circuits/opamp-buffer.test.ts` and
  `tests/kicad/footprint-names.test.ts`. The other fourteen split as
  **twelve prose references in doc comments** and **two lines in
  `tests/cli/schematic-stub.test.ts`**, which passes the path as a STRING
  (`["circuits/opamp-buffer.ts", "opampBuffer", OUT]`) and would break
  differently - a string a typecheck cannot see. A check
  that could have failed: the file could have had no importers, in which case
  the move would have been cheap.
  **AMENDED 2026-10-21 BY TASK 19, WHICH DELETED `tests/cli/schematic-stub.test.ts`
  (**G248**) AND SO CHANGED THIS FIGURE.** `[RAN]` the same grep at this commit:
  **15 lines, of which 3 are imports, and 0 in `tests/cli/schematic-stub.test.ts`**
  - so the string-reference hazard this clause named is gone and **the only
  remaining cost of the move is the three import depths.** The owner question is
  unchanged and cheaper than it was.
- **Verified** CONFIRMED - this writer created the second file and read the
  CLAUDE.md sentences it sits against.
- **Why it is open** **it is the owner's to decide and nobody asks him again
  unprompted.** It is recorded, not raised.
- **What would settle it** **an owner decision**, one of three: give
  `opamp-buffer` a directory like the other four and fix the import depths;
  state that the exception is permanent and that files may be added under it; or
  state that the rule's intent is about KiCad files only, in which case two
  `.ts` files at the top level are not an exception at all and `CLAUDE.md`'s
  sentence about a directory *"even when the circuit is one schematic and one
  module"* needs the narrower wording.

### G252 - OWNER QUESTION, REOPENED BECAUSE ITS RECORD WAS DESTROYED: what the Cuts table's `Separates` column should say was a choice among three that the deleted G36 reserved for the owner; an agent's change picked one and the entry was deleted as "fixed" thirteen seconds later

**THIS IS `CLAUDE.md`'s NAMED INVARIANT FAILING THROUGH A DELETION RATHER THAN
THROUGH A CHECK.** The invariant is *"An agent may never author the acceptance
criteria for the artifact it is producing."* The failure here is one layer
worse than authoring a criterion: **an agent closed a question the record had
reserved for a person, and the deletion removed the evidence that a question
was ever open.** A wrong answer would at least have left something to
contradict. **This entry exists to put the question back, not to re-answer it.
Nothing below decides it, and the chosen option is left in the tree
untouched** - reverting it would be a third agent deciding.

**THE QUESTION, RECOVERED VERBATIM FROM `288a28c^`'s G36 RATHER THAN
PARAPHRASED**, because the options ARE the question and a paraphrase would be a
second agent deciding what he was asked. G36's *"Why it is open"*, in full:

> *"what a build sheet should say a cut is for is an acceptance criterion about
> the printed artifact, and the agent producing that artifact may not author it.
> There is also a real choice underneath: the column could name the nets (as
> now), name the PARTS the cut separates, or be dropped - and dropping a column
> is not something to do while looking at one board."*

Its *"What would settle it"*, in full:

> *"the owner reads a Cuts table and says which of the three the column should
> be. If it stays net names, the ladder nets need names a person can use, which
> is a change in `circuits/pultec/physical/board.ts` rather than in the guide."*

And its closing line, written when the entry was re-checked at the plan's Task
6 and the column was left alone:

> *"Left exactly as it is: the decision this entry asks for is the owner's and
> he has not made it."*

**WHAT HAPPENED, WITH THE TWO COMMITS AND THE INTERVAL BETWEEN THEM.**
`[RAN]` `git log -1 --format=%ct` on each: **`67108f4`** (*"The cuts table says
what it separates, not a ladder net's name"*, 2026-10-18 12:23:08) rewrote the
column to **option 2** - it names the parts and pad terminals on each side of a
cut - and **`288a28c`** (2026-10-18 12:23:21), **thirteen seconds later**,
deleted G36 with the reason *"G36 (the Cuts table names ladder nets) is fixed by
the previous commit, so it is deleted rather than marked closed - supersede
means delete."* `[RAN]` `grep -c '^### G36 '` returns **1** against
`288a28c^:docs/known-gaps.md` and **0** at HEAD.

**OPTION 2 IS WHAT THE ARTIFACT DOES TODAY, AND THAT IS NOT IN DISPUTE.**
`[RAN]` `bun test tests/guide/cut-separates.test.ts` at HEAD: **3 pass / 0 fail,
16 `expect()` calls** - it dumps the real `boards/pultec-low-boost` through the
pinned veroroute binary and asserts the column names members, never a ladder
name. **G54** quotes two of the resulting cells off the generated
`guide.html` (`C18.2, LO BOOST 20Hz | C19.2, LO BOOST 30Hz`), so the printed
form is on the record even though the guide itself is not committed.

**AND NOTHING AT HEAD RECORDED THAT THE CONTENT WAS EVER HIS TO CHOOSE.**
`[RAN]` `git grep -n "name the PARTS\|which of the three the column\|or be
dropped"` over the tracked tree outside `.superpowers/`: **no hits.** **CONTROL,
which could have answered differently and did**: the same grep shape for
`"names what a cut separates"` returns `tests/guide/cut-separates.test.ts` and
`tests/guide/guide.test.ts`, so the search reaches the files that talk about
this column - it is the QUESTION that is absent, not the subject. The only
surviving `Separates` entry is **G54**, which is about one cell being 108
characters wide and takes the column's content as settled.

**THE COMPLICATION, WHICH IS SHARPER THAN THE FINDING AND WHICH THIS WRITER
CANNOT RESOLVE - RECORDED UNDIAGNOSED RATHER THAN OMITTED.** The test written
in the very commit that chose the option says, in its module header
(`tests/guide/cut-separates.test.ts:5-8`):

> *"`docs/known-gaps.md`'s G36, deleted by this change, named the defect; **the
> owner's recommendation** (naming the parts a cut separates, never the net
> alongside them) is what this file asserts."*

**So the committed tree asserts an owner recommendation for option 2 while the
entry it names says he had not decided.** `[RAN]` `git log -S"the owner's
recommendation" -- tests/guide/cut-separates.test.ts` returns `67108f4` alone,
so that sentence and the choice arrived together; and `67108f4`'s own commit
message does not mention the owner at all. **There is exactly one candidate
channel and it is the same date**: **G19** and **G48** record that *"The owner
was put four recommendations about the printed build guide at once and accepted
all four"*, replying *"your recommendations. I don't care about the sparse pdfs.
leave that alone"* on **2026-10-18**. **Two of those four are recorded verbatim
and two are not** - G19 carries the ground-`0` one and G48 the sparse-pages one,
and `[RAN]` a search of every file on disk, gitignored reports included, for
`I.d leave it` and for `your recommendations` returns `docs/known-gaps.md` and
nothing else. **So whether the cuts table was recommendation 1 or 3 is not
decidable from this repository**, and the two recorded recommendations both end
*"If you don't care: I'd leave it"* - advice to change nothing - which is weak
evidence against a fourth that asked for a rewrite, and is not evidence enough
to conclude either way. **Both readings are bad in different ways**: if the
column WAS among the four, an owner acceptance that licenses a rewrite of a
printed artifact went unrecorded and the entry was deleted without citing it;
if it was NOT, the producing agent asserted an owner recommendation for its own
artifact's acceptance criterion. **Neither is settled here and the writer of
this entry may not settle either.**

- **Found** 2026-10-21, the whole-branch review's question 4 (a sweep of all 25
  true register deletions on this branch), which established that G36's
  deletion resolved an owner question by having an agent answer it. **The
  owner's-recommendation conflict above was NOT in that review** and was found
  by this writer while recovering G36's text, by reading the test the choosing
  commit added.
- **Evidence** G36's text as quoted, read from
  `git show 288a28c^:docs/known-gaps.md`; the two commit messages and their
  thirteen-second interval from `git log`; the HEAD-versus-`288a28c^` heading
  counts; the no-hit grep with its passing control; the `cut-separates` drive at
  3 pass; the on-disk search for the other two recommendations.
- **Verified** **CONFIRMED** - this writer recovered G36 from history, read both
  commits, drove every grep and count above, and ran the test. **RELAYED** for
  the whole-branch review's classification of the 25 deletions, which was not
  re-derived here.
- **Why it is open** **it is the owner's and he has not been asked again** -
  `CLAUDE.md`: *"a question he declined is not a closed question, but nobody
  asks him again unprompted"*, and this one was never even declined. The
  producing agent may not author it, the agent that answered it may not confirm
  its own answer, and the whole-branch fix round that wrote this entry was
  instructed not to ask him. **It is recorded, not raised.**
- **What would settle it** **an owner decision, and it now has two halves
  because of the conflict above.** (1) **CRITERION: he reads a Cuts table and
  says which of the three the column should be** - name the nets, name the
  parts, or drop it - which is G36's criterion unchanged. (2) **CRITERION: he
  says whether the cuts table's column was among the four recommendations he
  accepted on 2026-10-18**, which decides whether option 2 has ever had his
  licence. **Half (2) is the cheaper one and answers half (1) if the answer is
  yes.** **MECHANISM, and it is only bookkeeping**: if he confirms option 2,
  this entry is deleted and the test's header sentence becomes true with a
  citation; if he does not, the column changes and `G54`'s width defect may go
  with it. **No agent picks between the three.**

**ASKED AND DECLINED, 2026-10-21. BOTH HALVES, IN ONE UTTERANCE, VERBATIM:**

> *"I don't recall. I don't care"*

**What each half means, kept apart because they are different facts.**

**Half (2) is answered and the answer is NO LICENCE.** He does not recall
recommending it, so `tests/guide/cut-separates.test.ts`'s *"the owner's
recommendation"* is **unsourced and stays unsourced** - not disproven, but with
nothing behind it and the only person who could source it saying he does not
recall. The test's header annotation stands and must not be upgraded to a
citation.

**Half (1) is DECLINED, not answered.** He does not care which of the three the
column is. So the column **stays as net names by default, because he declined -
NOT because an agent chose correctly.** A declination is not a ratification.

**AND THE INVARIANT BREACH IS NOT CURED BY THIS.** The agent authored an
acceptance criterion for the artifact it was producing, and then the record of
the question being open was deleted thirteen seconds later. **That was wrong
when it happened and it stays wrong**; what his declination settles is the
OUTCOME, not the CONDUCT. Anyone reading this later should take the lesson from
the breach and not from the fact that it turned out he did not mind.

**This entry is NOT deleted**, because the mechanism above made deletion
conditional on him confirming option 2 and he has not. It moves to the declined
section's terms: **nobody asks him about the column again unprompted.** `G54`'s
width defect stays open on its own merits and no longer waits on this.

---

Declined: the owner has ruled, and nobody asks again unprompted
---------------------------------------------------------------

### G19 - the printed checklist calls ground `0`, which is the circuit's name and not a builder's

Now that a materialised board carries the circuit's net names, the names reach
a person. On `pultec-low-boost`'s checklist the ground net prints as **`0`**:
the junction row for `junction_grounds` reads *"O1 0, P1 0, Q1 0, R1 0, S1 0"*
and `junction_signals`' last terminal reads *"H1 0"*. `0` is the SPICE
convention for the ground node and it IS the name the circuit's own model
writes, so nothing invented it - but a build sheet that labels five wires `0`
is asking a builder to read a simulator's vocabulary.

`tools/guide/off-board.ts` already states the expectation it does not meet: its
module comment says a connector pin *"carries its net name as the circuit
writes it (`"GND"`, `"VCC"`)"*. On every Pultec section the circuit writes `0`.

- **Found** `2026-10-16-low-boost-to-adoption`, Task 4, reading the first
  checklist that could be built from this pipeline.
- **Evidence** the checklist's own junction rows, printed above; `NODE 13 NAME
  0` in `--dump-board` of the committed `boards/pultec-low-boost/
  pultec-low-boost.perfboard.vrt`; the module comment at
  `tools/guide/off-board.ts:1-19`.
- **Verified** yes - built the checklist and read it.
- **STILL ON THE PAGE (2026-10-17).** Verbatim from the regenerated packets:
  low-boost's junction rows read *"junction_grounds | 5-pin header | O1 0, P1
  0, Q1 0, R1 0, S1 0"* and *"junction_signals | 5-pin header | D1 IN, E1
  HI_BOOST_OUT, F1 LO_BOOST_IN, G1 OUT, H1 0"*, and the layout images print `0`
  beside six of the board's left-hand edge pins. `pultec-low-cut` prints the
  same.
- **Declined** - 2026-10-18. The owner was put four recommendations about the
  printed build guide at once and accepted all four without commenting on
  ground specifically, replying verbatim: *"your recommendations. I don’t care
  about the sparse pdfs. leave that alone"*. The recommendation he was
  accepting, verbatim: *"**2. The junction row prints ground as `0`.** It reads
  `junction_grounds | 5-pin header | O1 0, P1 0, Q1 0, R1 0, S1 0`. `0` is the
  SPICE convention and genuinely what the circuit model calls it; your hand
  layout prints the same. If you don't care: I'd leave it. It's correct, it's
  consistent with everything else, and "GND" would be the guide inventing a
  vocabulary the model doesn't use."* The decision is by acceptance of that
  recommendation, not by any sentence of his naming ground.

### G48 - two of the printed guide's seven pages are nearly empty, because every image takes a page whether or not it fills one

`boards/pultec-low-boost/guide/guide.pdf` is seven US Letter pages. Page 1
carries the header and the no-schematic notice and is then blank for roughly
its lower half. Page 7 carries one checklist row (`Cut 4`) and the one-line
"this board declares no power-up checks" statement, and is otherwise blank.
`pultec-low-cut` prints the same seven-page shape. So an operator prints seven
sheets to get about five sheets of content.

The cause is in `tools/guide/guide.ts`'s print CSS, not in the conversion: each
layout figure is `page-break-inside: avoid` inside a `.page` that is
`page-break-before: always`, and the checklist simply flows. That is a
deliberate rule - an image split across a fold is unusable on a bench - and the
blank space is its cost, not a bug in it.

- **Found** the change that made `guide.pdf` part of the build system
  (2026-10-17).
- **Evidence** both PDFs generated by `make -C boards/<board> guide` and read
  page by page; seven `/Type /Page` objects each, all `MediaBox [0 0 612 792]`.
- **Verified** yes - read directly from the generated PDFs, not from the HTML.
- **Declined** - 2026-10-18, in his own words - a direct instruction about this
  item, verbatim: *"I don’t care about the sparse pdfs. leave that alone"*.
  The recommendation he was accepting, verbatim: *"**4. Two of seven pages are
  nearly empty**, because every layout figure takes a full page so no image is
  ever split across a break. If you don't care: I'd leave it. Paper is cheap
  and an image split across a page break at the bench is genuinely annoying."*

### G47 - removing the junction ground row OPENS GROUND on every adopted board, and the owner's instruction invites someone to remove it

The owner, 2026-10-17, on the junction's ground row - five pins all on net `0`,
interleaved beside the signal row so a ribbon cable's return path is guided:

> *"on the perfboard, we aren't using ribbon cables, so we don't need to place
> that row of ground conductors"*

**That is right about the ribbon and it must not be acted on as a layout edit,
because the committed boards depend on those pins for continuity.** Measured by
removing the row and re-checking: `--check <committed vrt> --netlist <no-ground-
row netlist>` **exits 1 on every adopted board and reports `0 incomplete`** -
net `0`, ground, goes OPEN on each. The committed layouts make ground whole
THROUGH those five pins and the bridges tying them together; the signal row's
own `0` pin is not the path that carries it.

So the row is redundant on the SCHEMATIC and load-bearing in the LAYOUT. An
agent reading his instruction and deleting the component would break five
committed, owner-approved boards electrically, and `make check` on each would
not be what catches it first.

**Two further measurements from the same probe, recorded because they are the
evidence any future decision rests on:**

- **It does not fix the sections that could not be built.** `low-cut` still
  refuses `stripboard-seed-no-column-to-join` on net `0`, across strips 5 and 16
  rather than 5 and 6 - a WIDER span - and `hi-cut`'s refusal names a selector
  net and is unchanged. The row was never what blocked them. (Both were later
  built by other orderings; see G33's settlement.)
- **It would make two boards strictly cheaper.** Without the row, `hi-boost`
  comes out at **0 cuts / 0 wires / 0 bridges**, kappa 0, extent 340 against
  425; `mid` at 1 cut / 1 wire / 0 bridges against 1/2/4. That is a real gain
  and a real reason someone will want to do this.
- **And one unexplained refusal.** Under the no-ground arm, `low-boost`'s seed 3
  refused inside `--materialize` where it passes today, with a fork
  copper-conflict refusal. Not diagnosed; recorded so a future attempt is not
  surprised by it.

- **Found** `2026-10-17`, by a probe the controller ran specifically to test the
  owner's instruction before acting on it.
- **Evidence** the probe's own arms, run against all five sections, with the
  working tree verified clean afterwards.
- **Verified** yes - run, not relayed. **The controller then failed to record
  any of it**, reporting the results in conversation only, until asked directly
  whether the findings were in this file. That is the failure this file exists
  to prevent, committed by the file's own author.
- **DECLINED 2026-10-18, and only one half of this entry is declined.** The
  owner was asked the narrow question this entry was holding open - whether a
  zero-cut `hi-boost` is worth re-approving two boards he has already signed
  off - and ruled, verbatim: *"Leave the approved boards alone for bow"*
  (*"bow"* is evidently *"now"*; the word is quoted as typed because this
  file's standard is his words and not a tidied reading of them). So the
  re-derivation is not to be attempted, and **nobody raises it with him again
  unprompted.**
- **WHAT IS DECLINED IS THE RE-DERIVATION. THE MEASUREMENT IS NOT A PREFERENCE
  AND DOES NOT EXPIRE WITH IT.** Removing the ground row opens net `0` on every
  adopted board; that is an electrical fact about those layouts, it was
  established by running `--check`, and it binds whoever revisits this whether
  or not the owner's ruling is still current. An agent that reads the
  declination as "this entry is settled, the row is optional" has inverted it.
  **The row stays on all five boards, and the reason it stays is continuity,
  not his instruction.**
- **Why this entry is kept rather than deleted** what it records is still true
  of the boards, and the register's own rule is that a declination moves here
  with his words rather than leaving - *"a question he declined is not a closed
  question, but nobody asks him again unprompted"* (`CLAUDE.md`). The two
  further measurements above - that the row never blocked the two hard
  sections, and the undiagnosed `low-boost` seed-3 refusal under the no-ground
  arm - are the evidence any future attempt starts from, and they would have
  gone with a deletion.
- **What remains open elsewhere, and it is not this** the ground row's
  appearance on a BENCH SHEET is G44's: the sheet should not explain a ribbon
  cable's return path to somebody soldering wires. **That is a wording and
  vocabulary question, now fully separated from the layout question this entry
  closes** - the row's presence is settled, what a sheet says about it is not.

### G59 - the stand-in-groups image's four hatch fills are RATIFIED, and the two diagonals were measured as separating on a deliberate look rather than at a glance

**RULED 2026-10-18.** He read page 5 of
`boards/pultec-low-boost/guide/guide.pdf` and said, verbatim:

> *"the hatching looks good."*

**He was told the weakness before he ruled, and that disclosure is why this
entry stays rather than being deleted.** What was put to him: that the two
diagonals **do not separate at a glance at printed size** - `/` is the first
group's fill and `\` the second's, hi-boost and hi-cut on both low boards, and
both read as striped grey from arm's length, so which way the lines lean is
legible on a deliberate look and not before; that **the worst case is a part
standing on end**, whose white body covers the middle of its patch and leaves
only a margin of hatch carrying two or three lines; and that the lattice and
the stipple had to be coarsened to their present spacings after a first attempt
at which both merged. **He accepted the fills with all of that known.** So the
four geometries are settled, nobody asks him again unprompted, and the
measurement below is still true of the artifact he approved.

**What is hatched, which was never the open half.** A group's members come from
the board's own `ScaffoldDoc`; the mark is per part, never a region drawn around
a cluster, because a group's parts are not guaranteed contiguous and an
own-circuit part can sit between two of them. The legend names each group and
states what an UNHATCHED part is. None of that depends on the fills.

**MEASURED AT PRINTED SCALE, 2026-10-18**, by rendering
`boards/pultec-low-boost/guide/guide.pdf` and `boards/pultec-low-cut/guide/guide.pdf`
page 5 at 150 dpi and reading the page at 1:1, plus a photocopy simulation
(greyscale, thresholded to bilevel, resampled to ~100 dpi). **This is what he
ruled on:**

- **The lattice and the stipple were the hard pair, not the two diagonals.** At
  the first spacings tried (crosshatch at 7 units, stipple at 6) both read as
  one uniform fine grey at print size, and on BOTH low boards those two groups
  sit adjacent - `low-cut` beside `mid` on low-boost, `low-boost` beside `mid`
  on low-cut - so the two clusters merged into a single textured area. They
  were coarsened (crosshatch 9 units / 1.2 wide, stipple 8 units / 1.8 radius)
  and separate clearly at 1:1 after that.
- **The two diagonals separate on a deliberate look, not at a glance.** `/` and
  `\` both read as "striped" from arm's length; which way they lean is legible
  when looked at, and more legible after the lines were coarsened to 6 units at
  1.3 wide. **The thin case is the worst case**: a standing resistor's body
  covers the middle of its patch, so only a margin of hatch shows, and that
  margin carries two or three lines.
- **All four survive the photocopy simulation** as geometry - diagonals as
  diagonals, lattice as a lattice, dots as dots - which is the constraint that
  ruled out four grey tints in the first place.
- **The legend's swatches are distinguishable from each other** at print size,
  including the empty one.
- **A hatch patch reads as a mid-grey area, and the layout already uses grey**
  for every fourth strip. On a dense board the two greys compete; nothing was
  changed for it.
- **No patch reached over a part it does not belong to, on any of the five
  Pultec boards**, at the patch size shipped (`HATCH_PAD`, half a hole pitch
  plus a twentieth). That is enforced rather than observed: `drawClusters`
  refuses a patch overlapping another part's body or a landing pad's ring, so
  all five `make guide` runs passing is the measurement.
- **TWO PATCHES OF DIFFERENT GROUPS MAY STILL OVERLAP EACH OTHER - NOTHING
  GUARDS THAT**, and on both low boards the lattice and stipple groups' patches
  abut. The guard above does not cover it because an overlap of two hatches
  misidentifies no part, which is what the guard exists for. **Nobody has ruled
  on whether two abutting group patches are acceptable on the page**; he was
  shown the page that contains them and ruled the hatching good, which is the
  nearest thing to an answer and is not the question.

- **Found** 2026-10-18, implementing Task 6 of
  `docs/superpowers/plans/2026-10-18-the-packet-shows-the-clusters.md`, by
  reading the printed PDF page rather than the SVG.
- **Evidence** the regenerated pages above, read at 1:1 and in the bilevel
  simulation by the agent that made the change; and, for the mapping the fills
  carry, `tests/guide/clusters-view.test.ts`, which is a check that could fail -
  it matches every patch against the board's `ScaffoldDoc` and against the
  checklist's `Fit` column in both directions on two real boards.
- **Verified** the measurements, yes, by the agent that made the change, read
  directly and not relayed. **The ruling** was relayed to the writer of this
  revision by the controller, in the words quoted above.
- **DECLINED - OR RATHER RATIFIED - 2026-10-18, and only one half of this entry
  is settled by it.** The CHOICE of fills is his and is now made.
  **The measurement is not a preference and does not expire with it.** The two
  diagonals still separate only on a deliberate look, and a later reader who
  notices that, assumes nobody checked at printed size, and either re-opens the
  question with him or quietly "fixes" it has overturned a decision made with
  the evidence in hand. `tools/guide/hatch.ts` carries the same disclosure in
  its module comment, which is where somebody would be standing when they
  reached for the change.
- **Why this entry is kept rather than deleted** the register's own rule is that
  a settled question leaves and a ruling whose subject is still true of the
  artifact stays here with his words (G47 is the worked example). What is still
  true of the artifact is the weak diagonal pair, the two greys competing, and
  the unguarded cross-group overlap - none of which a deletion would have taken
  anywhere, since nothing else in a committed file records the photocopy result
  or the grey competition.
- **What would re-open it** only him. A change to `HATCH_STYLES` - its entries,
  their order, or their spacings and widths - is a change to the artifact he
  approved and needs a fresh ruling, not an agent's judgement. Everything else
  about the image is independent of what an entry draws, which is what makes
  that a one-file change if he ever asks for one.

### G62 - the packet grew from seven printed pages to eleven, and the controller costed only one of the four when it asked him

**MEASURED 2026-10-18, by counting the pages of the regenerated PDFs**:
`pultec-low-boost`, `pultec-low-cut`, `pultec-hi-boost` and `pultec-hi-cut`
print **11 pages** each and `pultec-mid` prints **12**, against the **seven**
G48 above measures for the two low boards before this plan.

**Where the four pages went, read page by page off
`boards/pultec-low-boost/guide/guide.pdf`:**

| page | what is on it |
| --- | --- |
| 1 | title, provenance, the no-schematic notice |
| 2-5 | the four layout images - designators, values, copper side, **stand-in groups (new)** |
| 6-8 | the **Stand-in groups** section (new): its prose and group blocks on 6-7, the 16-row *What to populate, by build* table on 8 |
| 9-11 | the build checklist and the power-up-checks notice |

So **one page is the fourth image and three are the stand-in groups section**,
and the checklist still occupies three pages - the `Fit` column widened its
tables without costing a page. `pultec-mid`'s twelfth page is its own and is
not this change: its checklist runs to four pages because the board has 72
table rows against low-boost's 46.

**CORRECTED 2026-10-19: THE MEASUREMENT ABOVE COVERS FIVE OF THE ELEVEN
BOARDS, AND THE OTHER SIX ALSO PAID.** The six boards that declare no
`SCAFFOLD` - `pt2399-core` and the five transistor-preamp boards - each gained
the **Stand-in groups** heading and its one sentence (*"This board holds no
stand-in groups: ... Fit everything the checklist lists."*), and
`tools/guide/guide.ts` wrapped that sentence in the same `class="page"` the
groups arm uses, so it opened a sheet of its own. This entry said nothing about
those boards, so the register understated the change's paper cost by up to six
pages while reading as the whole measurement.

**THE WRAPPER IS NOW CONDITIONAL AND THE SENTENCE IS INLINE** - the spec asked
for one sentence on the `NO_FOOTPRINT` precedent, which is a line rather than a
sheet, and a sheet is a decision about the artifact that no rule file, spec or
reviewer took. **Nor has anyone ruled on the inline rendering**, which is the
spec's own shape rather than an owner decision - the same unratified standing as
G58's mark shape, G60's wire-links placement and G61's `Fit` column, and
recorded here for the same reason. Measured by regenerating the packets with
`make guide` and counting `pdfinfo` pages, before and after that one change:

| board | with the wrapper | inline (now) |
| --- | --- | --- |
| `transistor-preamp-buffered` | 6 | **5** |
| `transistor-preamp-feedback` | 7 | **6** |
| `transistor-preamp-loop` | 8 | **8** |
| `transistor-preamp-staged` | 7 | **6** |
| `pt2399-core` | no packet (G49) | no packet (G49) |
| `transistor-preamp-lab` | no packet | no packet |

**Three of the four got the sheet back; `transistor-preamp-loop` did not, and
the reason is worth having.** On that board the sentence does not fit under the
copper-side image, so its last word - *"lists."* - spills onto a page of its
own, and page 4 of its packet now carries that word and nothing else. The
sentence is inline in the markup and still costs a sheet there, so for loop
this change is page-neutral rather than a saving. That is G48's shape (*"every
image takes a page whether or not it fills one"*), not a new cause.

**WHAT THESE FOUR PRINTED BEFORE THIS BRANCH IS NOT MEASURED HERE.** The
`Fit` column also widened their checklist tables, so the pre-branch figure is
not recoverable by reasoning from the two columns above, and nobody regenerated
a pre-branch tree. The numbers above are this branch with and without the one
wrapper.

**WHY TWO BOARDS HAVE NO FIGURE.** `pt2399-core` cannot be rendered at all -
`no drawing for VeroRoute part type "DIP16"`, which is G49 and predates this
plan. `boards/transistor-preamp-lab` refuses earlier still: its committed
layout has 19 strips joining two different nets across unpainted holes, so
`make guide` stops at the buildability check rather than printing. Both are
pre-existing and neither is this change; they are named so a later reader
counting pages across the repository does not read two missing rows as an
omission in this measurement.

**WHAT HE WAS ASKED, AND IT UNDERSTATED THE CHANGE BY THREE PAGES.** He was
asked about the image's page only, and answered *"eighth page is fine"* - asked
explicitly because his G48 declination was about page COUNT rather than a
blanket yes to more pages. The spec names the image's page as the cost
(*"the packet goes from seven pages to eight"*) and says nothing about the cost
of the **Stand-in groups** section, **although the same spec specifies that
section, its group blocks and its 16 build rows.** **That is a controller
error, not a surprise in the implementation**: the pages were specified and not
costed, and he answered the question he was put rather than the one the change
raised.

- **Found** 2026-10-18, Task 7 of
  `docs/superpowers/plans/2026-10-18-the-packet-shows-the-clusters.md`, by
  counting the pages rather than taking the number from a report.
- **Evidence** `/Type /Page` objects and `MediaBox` entries in each regenerated
  `guide.pdf` - 11, 11, 11, 11, 12 - agreeing with each page tree's own
  `/Count`; the per-page `pdftotext` extraction the table above is read from;
  G48 for the seven-page measurement that precedes this plan; the spec's
  "Cost, stated because it interacts with a ruling he has already made"
  paragraph for what was asked.
- **Verified** yes - counted and extracted by the writer, in a clean tree, on
  regenerated artifacts. The seven-page figure is G48's measurement rather than
  this writer's.
- **The 2026-10-19 correction** found by the final whole-branch review, which
  read the shared `class="page"` wrapper in `tools/guide/guide.ts` and said
  plainly that the page consequence was an inference from that CSS and not a
  measurement. **The figures in the table above are the measurement that was
  missing**, run by the writer of the correction: `make guide` in each of the
  six boards' directories, `pdfinfo` for the page count and per-page
  `pdftotext` for where the sentence lands, with the wrapper and without it.
  Two of the six refuse to print and are recorded as such rather than left
  blank.
- **DECLINED - 2026-10-18, in his own words.** Told that the packet is eleven
  pages rather than the eight he approved, and that the controller had failed to
  cost the extra pages when asking him, he replied verbatim: *"I dont care about
  the number of pages in the pdf right now"* - quoted as typed: *"dont"* is his,
  and he typed no full stop. **Nobody raises the page count with him again
  unprompted.**
- **THE QUALIFIER *"right now"* IS LOAD-BEARING.** This is a provisional setting
  aside, the same shape as *"Leave the approved boards alone for bow"* on G47 -
  he has put the question down, not answered it. An agent that reads this as
  "page count is settled, the packet may grow freely" has inverted it: what he
  declined to care about is **eleven pages today**, and a packet that grows
  again is a new fact rather than this one.
- **The measurement does not expire with the declination** (this section's
  preamble). The packet is eleven pages, four more than before this plan, three
  of them never put to him - and, per the 2026-10-19 correction above, the six
  boards that are not Pultec sections were never costed to him at all. **He is
  not asked again**: the correction is to this entry's measurement, not a reason
  to re-open a question he has put down.
- **What would settle it, if he returns to it** nothing is required of anyone
  now. The trimmable page is the 16-row *What to populate, by build* table on
  page 8, which the spec argues for carrying whole - *"He may change what is on
  the bench while building, and a packet carrying one build's row would be wrong
  rather than incomplete the moment he does"* - so trimming it is a decision
  with a reason already standing against it. Moving the whole **Stand-in groups** section back
  to the board's `wiring.md`, which already carries the same table, is the other
  option and **would re-create G45** - which is why it is named here as an
  option rather than offered as a remedy.

---

Open: a fix would settle these
------------------------------

### G260 - MEASURED: fifteen field pairs are now DRAWN OVER something, no check refuses a sheet for it by design, and the only artifact that says so is a report nothing reads automatically

> **AMENDED 2026-10-26 (G296): the drawn-over population is 20 field pairs across the parity corpus
> and 31 across the boards**, superseding fifteen. `pt-core` alone carries 15, all over a wire and
> five over the same wire. **Nothing refuses a sheet for it, which is this entry's whole subject**,
> and this is the largest bill that trade has presented.

> **AMENDED 2026-10-22 BY TASK 1 OF THE TEXT-HANDLING RESEARCH PLAN: THE FIFTEEN ARE REPRODUCED BY
> A SECOND CODE PATH, AND ALL OF THEM REST ON A RULER THAT IS WRONG BY UP TO 4.2 GRID STEPS PER
> STRING. THE FIGURE BELOW IS LEFT AS WRITTEN.**
>
> **THIS ENTRY'S ARITHMETIC IS DOWNSTREAM OF `lib/schgen/render/text-boxes.ts`'s
> `textWidth(text) = text.length * GRID`**, which gives every character the same width and a line
> the same height as a character. `docs/schematic/text-handling-research.md` §1 measures the error
> in that against KiCad's real geometry, by three routes that agree to 0.0 um, 0.3 um and 0.8 um.
> Over the 264 distinct strings the eleven boards emit:
>
> | | vs the glyph advance | vs the rendered ink | vs `EDA_TEXT::GetTextBox` |
> | --- | --- | --- | --- |
> | median estimate / measured | 1.091 | 1.182 | 1.051 |
> | widest OVER-estimate | 5019.5 um (3.95 grid steps) | 5350.9 um (4.21) | 4797.3 um (3.78) |
> | strings where the estimate is TOO SMALL | 11 of 264 | 0 of 264 | **70 of 264** |
> | line HEIGHT, against the model's 1270.0 um | not a height quantity | **1422.4 um** | **2043.1 um** |
>
> **WHAT THAT DOES TO THE FIFTEEN** `[RAN]`, the same search with the text boxes swapped and
> everything else - the obstacle set, the clear/covered predicate, the weighted area, the candidate
> list, the least-covered choice - imported from the production module:
>
> | | current model | advance | ink | `GetTextBox` |
> | --- | --- | --- | --- | --- |
> | `ob-buffer` | 2 | 2 | 2 | 3 |
> | `oc-power` | 1 | 1 | 1 | 2 |
> | `pt-core` | 8 | 6 | 11 | 13 |
> | `tp-stage` | 4 | 4 | 6 | 6 |
> | **total** | **15** | **13** | **20** | **24** |
> | of the fifteen, still a fallback | - | 13 | 14 | **15** |
> | new under this quantity | - | 0 | 6 | 9 |
>
> **SO THIS ENTRY'S POPULATION IS NOT AN ARTEFACT OF THE RULER.** Thirteen of the fifteen are
> fallbacks under every quantity measured, and under KiCad's own box every one of them is and nine
> more appear. **The direction is the opposite of what "conservative" predicts**: the quantity that
> shrinks the count is the one that changes WIDTH only, and both quantities that also change HEIGHT
> grow it, because `textBox` gives a line 1270 um where the ink is 1422.4 and KiCad's own box is
> 2043.1.
>
> **THE CONTROL, which could have failed and is the reason the rest is reported at all.** The
> re-run uses a parallel copy of `placeFields`, and under the CURRENT ruler it must reproduce
> `lib/schgen/render/field-placement.ts` exactly - block, unit, lib id, the rounded weighted cost
> and every `covers` string - over ten laid-out blocks. It does. It also reproduces this entry's
> own per-block distribution, `ob-buffer` 2 / `oc-power` 1 / `pt-core` 8 / `tp-stage` 4, from a
> second code path.
>
> **WHAT THIS AMENDMENT DOES NOT DO.** It does not elect a quantity - that is the owner's
> (**G265** clause 4) - and **it changes no code**: `textWidth` is untouched, by the research
> plan's own constraint. It also does not re-take this entry's other subject, which is that nothing
> automated reads the fallback report; that is unchanged and still open below.

> **AMENDED 2026-10-22 BY TASK 4 OF THE TEXT-HANDLING RESEARCH PLAN: WHAT OTHER TOOLS DO ON
> FAILURE - THE HALF OF THIS ENTRY'S QUESTION NOBODY HAD FILLED. IT DOES NOT TOUCH THE OWNER'S
> HALF.**
>
> This entry asks two things and only one of them is his. **His is how much overlap is acceptable,
> and nothing here answers it, bears on it, or may be read as implying it.** The other half is
> factual - what tools in this class do when a label has nowhere clear to go - and it was answered
> by `docs/schematic/text-handling-research.md` **§4**.
>
> **OF THE SIX TOOLS EXAMINED, ZERO REFUSE TO PRODUCE THE DRAWING BECAUSE TEXT WOULD NOT FIT.**
> Four open-source tools read at a pinned commit, two of those also run; two commercial tools as
> vendor documentation only. Adding §3's KiCad - the program `make check` invokes on this
> repository's output on every run - makes it **zero of seven**.
>
> | tool | on failure | how it was established |
> | --- | --- | --- |
> | lepton-eda `fd160f0` | draws it overlapping after one unverified translate | `[READ]`; its placement function's only exit returns a position and all nine `error` calls in the file are malformed-input refusals |
> | xschem `36e0eab` | draws it overlapping; nothing is tested | `[READ]`; no text-collision test exists, and the two early returns in `draw_string` are a zoom threshold and a viewport cull |
> | netlistsvg `d3518f1` | draws it overlapping, and the layout engine widens node spacing **across layout columns only** | `[RAN]` four arms, every one exit 0 with the SVG written |
> | schemdraw `0.23` | draws it overlapping and grows the figure's bounding box around it | `[RAN]` a colliding arm that raises nothing and emits both labels whole |
> | Altium Designer | documents overlap as a NORMAL STATE with z-order commands to manage it | `[DOCS]` 2026-10-22, quoted from the page's bytes; failure semantics are not specified at all |
> | OrCAD Capture 16.6 | nothing documented | `[DOCS]` 2026-10-22; `auto.?position` and `designator.*position` return 0 hits in 31,433 lines of the manual |
>
> **SO THIS REPOSITORY'S PRE-TASK-24 BEHAVIOUR - REFUSE THE DRAWING - IS UNUSUAL AMONG ITS CLOSEST
> NEIGHBOURS, AND THE TRADE TASK 24 MADE IS THE ONE ALL SIX OF THEM MAKE.** That is a fact about
> what is conventional and **not an argument that the trade is right here**; §4 explicitly declines
> to make that argument because it turns on what an acceptable sheet is, which is the question
> below.
>
> **ONE ROW OF THE COMPARISON IS EMPTY FOR THIS REPOSITORY AND IS NOT EMPTY FOR TWO OTHERS.**
> §4.8's *adjust the surrounding geometry* row: netlistsvg's layout engine moved one node 96 units
> when its label grew, with five others unmoved, and KiCad has one local repair
> (`fitFieldsBetweenWires`, §3.5). **This repository has no perturbation of any kind** - the placer
> chooses among fixed slots and the geometry around them never moves. **That is an observation, not
> a proposal**; whether it would reduce the fifteen is untried and unmeasured.
>
> **AND THE CLOSEST THING TO A SIXTH SHAPE COULD NOT BE RETRIEVED.** OrCAD's and Allegro's PCB
> silkscreen auto-placer is reported to place what it can and log the designators it could not
> place legally - *place and report*, which is a different trade from any of the six and the
> closest published thing to what this entry's residual asks for. **No quotable source was
> obtained**: `community.cadence.com` returns HTTP 403 to a plain fetch, `support.cadence.com`
> needs a login, and the training page search pointed at does not resolve. **A search-engine
> summary is not a page anyone opened, so this is an unverified lead and is NOT evidence.** What
> would settle it is the Allegro/OrCAD PCB Editor manual, which was not obtained.
>
> **THAT LEAD NOW HAS ITS OWN HEADING, G268** - with the three doors, the specific failure for
> each, and its criterion. This clause is a cross-reference and G268 is where a later agent should
> look, because **a lead that lives only inside another entry's amendment is invisible to anyone
> scanning register headings**, which is the failure a reviewer named: the next agent to want it
> finds nothing and re-hits the same 403, login wall and dead DNS.
>
> - **Verified** CONFIRMED by the writer of §4 for the four open-source tools and the two
>   documentation sets - the commits were cloned and hashed, the two runs were driven here, and
>   every vendor quotation was taken from the saved bytes of the page rather than from a search
>   extract. **RELAYED** for §3's KiCad figure and for §4's reuse of this entry's own fifteen.
> - **Evidence** §4.0's commit and SHA-256 table; §4.4 and §4.5's pasted run logs, each with a
>   control arm that answers differently from its treatment; §4.6 and §4.7's greps over the
>   retrieved pages and manual, every one of which could have matched and is reported with its hit
>   count.
> - **WHAT THIS AMENDMENT DOES NOT DO.** It does not answer how much overlap is acceptable, propose
>   a threshold, or rank the six behaviours. It changes no code. **It does not close this entry**:
>   the residual below - that nothing automated reads the fallback report - is untouched, and so is
>   the owner's question.

> **AMENDED 2026-10-23 BY TASK 6 OF THE SAME PLAN: TeX IS THE EIGHTH TOOL AND IT DOES NOT REFUSE
> EITHER - AND THE DIFFERENCE FROM THIS REPOSITORY IS NOT THE PLACEMENT, IT IS THE LOUDNESS, WHICH
> IS THIS ENTRY'S OWN RESIDUAL. It does not touch the owner's half.**
>
> Task 4's amendment above makes it zero of seven. Knuth and Plass 1981, read in full by Task 6
> (`docs/schematic/text-handling-research.md` §6.1, SHA-256 pinned, quotations verified against the
> rendered page images rather than the scan's OCR layer), describe what TeX does when **no feasible
> sequence of line breaks exists**: the active list is *"forcibly prevented from becoming empty by
> simply declaring a breakpoint to be feasible if it would otherwise leave the active list empty.
> This results in an overset line and an error message that encourages the user to take corrective
> action"* (`[READ]` **p.1150**), and at the level of the implementation *"[t]he net result is to
> produce an 'overfull box' that sticks out into the right margin... some kind of error indication
> is necessary"* (`[READ]` **p.1162**). **Zero of eight.** *(Round 1 correction: the first of those
> two quotations was cited to p.1162 when this amendment was first written. It is on p.1150, where
> the behaviour is introduced; the words were verbatim and the page was wrong, and in a claim whose
> evidence is its quotations a page that does not resolve is worth fixing loudly.)*
>
> **The shape is this entry's own, independently reached**: place it anyway, and make the
> degradation visible. `field-placement.ts` takes the least-covered candidate and returns a
> `FieldFallback`; `report.ts` prints them under *"Field placements the placer could not keep
> clear"*.
>
> **THE DIFFERENCE IS EXACTLY THE RESIDUAL BELOW, and that is why this is worth an amendment rather
> than a footnote.** TeX's overfull box is an error on the user's terminal **on the run that
> produced it**. This repository's fallback is a table in a generated report **that nothing
> automated reads**. The tool whose behaviour this most resembles pairs the placement with a
> diagnostic the user cannot miss, and that half was not carried across.
>
> **AND THE PLACER'S WALK ORDER MOVES SOME OF THEM**, including `tp-stage`'s `TP1#1` - the one
> fallback of **this entry's fifteen** that covers TEXT rather than a wire or a pin. **G272** is
> that measurement and the four reasons it is not yet an invitation to act.
>
> **THIS ENTRY'S FIGURES ARE ABOUT ITS OWN TWELVE DECLARED BLOCKS AND STAY THAT WAY; G272 NOW
> MEASURES THE SAME QUESTIONS OVER ALL 48.** The two populations must not be mixed, and one reading
> changes materially between them: *"exactly one covers another piece of text"* is true of the
> twelve and **false of the repository** - over the 48 declared ELK blocks with a grid-legal layout
> there are 53 fallbacks and **four** cover text, three of them on boards this entry's population
> does not contain. Nothing above is revised; the scope is stated so nobody reads a twelve-block
> figure as a repository-wide one.
>
> - **Verified** CONFIRMED by the writer of §6 for the TeX quotation, which was read on the page
>   image, and for the loudness comparison, which is a reading of this repository's own
>   `report.ts`. **The TeX claim is about the 1981 paper's description of TeX**, not about
>   `tex.web`, which was not retrieved (§6.10).
> - **WHAT THIS AMENDMENT DOES NOT DO.** It does not say how loud a fallback should be, propose a
>   gate, or answer how much overlap is acceptable. **It does not close this entry**: the residual
>   is untouched and so is the owner's question.

Task 24 replaced a refusal with a placement: `lib/schgen/render/field-placement.ts` takes the
least-covered candidate slot when none is clear. **That converts a loud failure into a quiet
degradation unless something counts it**, which is this entry's subject and was the whole risk of
the change.

**WHAT IS NOT REPORTED, STATED FIRST.** `render/text-scene.ts`'s `textProblems` skips a text
flagged `fallback` as both subject and object, so **no clearance check reports a fallback field's
overlaps**, and `checkLayout` passes blocks whose text is drawn over a wire. That is deliberate:
the placer already decided this text has nowhere clear to go, and re-reporting it would re-refuse
the drawing the fallback exists to produce. The one clause it is NOT exempt from is the frame
border - text leaving its own block can collide with a block the placer never saw - and
`tests/schgen/render/field-fallback.test.ts` drives both arms.

**WHAT IS REPORTED, AND WHERE.** The placer returns one `FieldFallback` per such unit, naming the
block, the unit, its lib id, the weighted overlap area and **every obstacle the placed boxes
cover**. `render/sheets.ts` carries them onto the `SheetDrawing`; `lib/schgen/report.ts` prints
them as a table in every generation's `RENDER-REPORT.md` under *"Field placements the placer could
not keep clear"*, with the sentence *"a sheet with a row here is not a clean sheet"*;
`tools/schgen/board-sheets.ts` prints a per-board count and a `WARNING` line;
`tools/schgen/masked-problems.ts` prints them per unit.

**THE POPULATION TODAY.** `[RAN]` `tools/schgen/masked-problems.ts` over the twelve declared
blocks: **fifteen fallbacks across four blocks** - `ob-buffer` 2, `oc-power` 1, `pt-core` 8,
`tp-stage` 4 - and **nine of the fifteen are on the two blocks that newly draw**. Every one of them
covers at least one wire, pin or label; `pt-core`'s `R3#1` covers three wires.

**WHAT THEY COVER, which is the part the weighting was supposed to decide and which was then
looked at.** **Fourteen of the fifteen cover only wires or a pin end; exactly one covers another
piece of text** - `tp-stage`'s `TP1#1` covers `label EMITTER`. That is the two-tier weighting doing
what its source says it is for: a mark weighs twice a graphic, so the search spends its overlap on
wires before it spends it on text. **AND IT WAS READ OFF A DRAWING, not only off the counts.**
`[RAN]` a scratch probe (NOT committed, NOT a tool) that renders `pt2399-core`'s sheet with gate 1
skipped and exports it to PDF, for the single purpose of looking at what a fallback does: on that
sheet's eight fallbacks every designator and value is still legible, each crossed by one green wire
rather than sitting under another string. **The probe skips a gate, so what it produces is NOT a
generated schematic and is evidence about legibility and nothing else.**

**THE RESIDUAL, AND IT IS THE REASON THIS IS AN ENTRY RATHER THAN A COMMENT: NOTHING AUTOMATED
READS THE REPORT.** `make check` does not look at `RENDER-REPORT.md`'s fallback section, no gate
refuses on a count, and no threshold exists for one. A generation that goes from 0 fallbacks to 50
is green. **The count is visible to a person who opens the file and to nobody else** -
`CLAUDE.md`'s *"a skipped check must never look like a passing one"* is satisfied only in the sense
that nothing claims these sheets are clean.

- **Found** 2026-10-21, Task 24, by the agent that made the change - this is the price of its own
  change, recorded in it.
- **Evidence** `[RAN]` the per-block counts above; `tests/schgen/render/field-fallback.test.ts`
  drives the exemption, the frame-border exception, the least-covered choice and the report
  section, and **all seven of its new assertions were driven RED once against the shipped code**
  (perturbations: refuse again; never record the fallback; take the first blocked candidate;
  report a fallback's overlaps; skip the frame clause for a fallback; `MARK_WEIGHT = 1`; delete the
  report section - 7 of 7 red, files restored and re-hashed).
- **Verified** CONFIRMED - this writer wrote the code, the tests and the perturbations and read
  every output.
- **Why it is open** because *"a sheet with overlapping text is not a clean sheet"* is a sentence
  in a report and not a check, and because **nobody has said how much overlap is acceptable.**
  That is not an agent's call: an agent may not author the acceptance criteria for the artifact it
  produces (**G240**).
- **What would settle it** **CRITERION: the owner looks at a sheet carrying fallback placements and
  says whether it is acceptable, and under what count or what kind of overlap it stops being
  acceptable.** Until then no threshold may be invented. **MECHANISM, UNTRIED and explicitly NOT a
  plan**: the two obvious shapes are a declared per-sheet budget that `generate` refuses above, and
  a committed baseline file compared by content so a regression shows in a diff - the second is the
  shape this repository already uses for readability baselines. **Both need the owner's number
  first.**

> **AMENDED 2026-10-23 BY TASK 7 OF THE TEXT-HANDLING RESEARCH PLAN: THE ARTIFACT THIS ENTRY'S
> CRITERION ASKS HIM TO LOOK AT DOES NOT EXIST, AND NOTHING HAS SAID SO. THE CRITERION IS NOT
> CHANGED.**
>
> The criterion is *"the owner looks at a sheet carrying fallback placements."* **There is no such
> sheet.** `[RAN, CONFIRMED]` `bun tools/schgen/board-sheets.ts` at this commit: **0 of 11 boards
> produce a schematic, 11 refused, 0 undeclared.** `[RELAYED]` the four parity circuits all refuse
> at `validateCircuit` before any block is laid out (**G238**; §1.9's own `SKIPPED` lines record
> `opamp-buffer` at 3 problems, `optical-compressor` at 14, `pt2399-core` at 18, and **G232**'s Task
> 20 amendment records `transistor-preamp` refusing at layout). **The only thing in this repository
> that generates a sheet is the `mini` design FIXTURE, and G259 records it generating with ZERO
> fallback placements** - so even that sheet is not the artifact.
>
> **SO THE 53 FALLBACK PLACEMENTS §6.5 COUNTS ARE COUNTED ON BLOCKS, NOT ON SHEETS**, and this
> entry's own fifteen were counted on blocks too. **A block that lays out is not a drawing anybody
> can look at.** That is not a defect in this entry and it is not an argument for relaxing anything;
> it is the gap between the criterion and its own evidence, stated so that the next agent does not
> report "we asked him and he has not answered" when nobody could have shown him anything.
>
> - **Evidence** `[RAN, CONFIRMED]` the board census, read in full; and
>   `bun tools/schgen/board-sheets.ts --pdf` is recorded in **G259**'s Task 25 amendment as
>   producing **no `.kicad_sch` and no `.pdf`**. `[RELAYED]` the parity circuits' gate-1 refusals and
>   the `mini` fixture's zero fallbacks.
> - **Verified** **CONFIRMED** for the census only; **RELAYED** for everything else above.
> - **Why it is open** unchanged, and now with one reason it could not have closed: **the question
>   is answerable only against an artifact that does not exist yet.**
> - **What would settle it** **UNCHANGED AND NOT WIDENED.** The criterion stands as written. What
>   this amendment adds is a precondition it never stated: **a sheet has to exist first**, which is
>   **G240**'s and **G259**'s criterion and not a new one. **No threshold, no budget and no mechanism
>   is proposed here**, and §7.5 of the research document states the same thing with no
>   recommendation attached.

> **THE OWNER ANSWERED THE OWNER'S HALF, 2026-10-23, AND DECLINED THE FORM THE
> CRITERION ASKED FOR. HIS WORDS, VERBATIM:**
>
> > *"I would rather give guidance to minimize overlap rather than give a hard
> > threshold."*
>
> **WHAT THIS SETTLES.** This entry asked *"how much overlap is acceptable, and
> under what count or what kind of overlap it stops being acceptable"*, and held
> that **until he answered, no threshold may be invented.** He has declined to
> set one — not deferred it, declined the shape of the question — and replaced
> it with a directive: **overlap is a quantity to be driven down, not a gate to
> be passed.** So the prohibition stands permanently rather than provisionally:
> **no agent may invent a threshold, now or later, because there is not going to
> be one.**
>
> **AND IT DISSOLVES THE PRECONDITION THE AMENDMENT ABOVE ADDED.** That clause
> recorded that the criterion was *"answerable only against an artifact that does
> not exist yet"* — a sheet he could look at. **A directive to minimise needs no
> sheet**, so the one blocker this entry had on its own question is gone, and it
> was gone the moment he said so rather than when the first sheet is drawn.
>
> **WHAT IT COSTS, AND THIS IS THE PART A LATER AGENT ACTS ON.** `checkLayout`
> currently **refuses a sheet** when text overlaps. *Minimise* and *refuse* are
> incompatible: **a quantity cannot be driven down inside an artifact the tool
> declines to produce**, and a refusal reports one bit where a cost reports an
> ordering. So his answer makes the refusal wrong, not merely strict. It is also
> the only reading consistent with **§4**'s measurement that **none of seven
> comparable tools refuses because text will not fit**, and with **§6**'s finding
> that what transfers from the typesetting literature is *badness as a continuous
> quantity, a penalty attached to a choice, and non-refusal on failure* — the
> framing he has now chosen, arrived at independently.
>
> **IT ALSO MAKES G71'S PROBLEM MOOT FOR THIS QUANTITY.** **G71** records that no
> published source states an acceptable number of crossings, bends or wire
> length, so a threshold here *"would be this project's invention wearing a
> citation"*. **A minimisation needs no published number.** It needs a measure
> and a direction, and he has given the direction.
>
> **WHAT IT DOES NOT SETTLE, and neither is re-asked here.** **(a)** The
> *measure* — whether overlap is counted as pairs, as area, or as something else
> — is undetermined, and choosing it is a design decision rather than a question
> for him. **(b)** Whether anything remains **hard-illegal** is the third reserved
> decision, §6.3/§6.11's infinite-versus-finite badness split, and his answer
> bears on it without closing it: he has set the *finite* grade's direction and
> said nothing about whether an infinite grade survives. That matters because
> §2 measured a label overlapping a **pin** — a relation that can misrepresent
> connectivity rather than merely look bad — so "minimise everything" and "some
> things are never drawn" are not the same policy. **(c)** **G265** clause 4, the
> text-geometry election, is untouched and still his — though it is **cheaper
> under his answer than under a threshold**, because an ordering between two
> arrangements survives a change of ruler far more often than a verdict against
> a fixed line does.
>
> - **Found** 2026-10-23, from the owner directly, in answer to the research
>   report's §5. Recorded here because `CLAUDE.md` requires an owner decision and
>   an owner declination to be carried **with his words verbatim**.
> - **Evidence** `[OWNER]` his sentence above, quoted in full and not
>   paraphrased. No measurement supports or could support it; it is a directive.
> - **Verified** **CONFIRMED** as his words. The consequences drawn above are
>   this writer's reasoning from them and are marked as such — **the directive is
>   his, the inference that the refusal must go is mine.**
> - **Why it is open** because the owner's half is answered and **this entry's
>   own residual is not**: the fifteen fallback placements are still reported in
>   a document rather than counted by a check, and nothing yet minimises
>   anything.
> - **What would settle it** **CRITERION, REPLACING THE THRESHOLD CLAUSE ABOVE
>   BY HIS INSTRUCTION: overlap is a measured cost that the generator drives
>   down and reports, and no sheet is refused for it.** The threshold criterion
>   is **deleted, not amended** — it asked for something he has declined to give.
>   **MECHANISM: none offered here.** The measure, the search and the reporting
>   are a design exercise he reviews, and this entry is not it.

> **THE MEASURE, DELEGATED AND CHOSEN, 2026-10-23.** Clause (a) above recorded
> the measure as undetermined. The owner delegated it: **"re: the measure—take
> the least dumb choice."** **The channel matters and is recorded for a later
> reviewer: an agent choosing its own measure would be the invariant
> `CLAUDE.md` names, and this one is the owner's to delegate and delegated in
> those words.**
>
> **THE CHOICE: the sum, over every text item, of that item's obscured area
> divided by its own area.** Dimensionless. Zero when nothing overlaps; one
> fully-buried item contributes **1.0**, so the unit is *one text item's worth of
> illegibility*.
>
> **Why, and what each alternative gets wrong.**
> - **Not a count of overlapping pairs: it has no gradient.** A 1 µm² nick and a
>   completely buried label score identically, so a minimiser has nothing to
>   descend and cannot tell *nearly clear* from *hopeless*. It is also close to
>   what the present refusal already does, so it would barely be a change.
> - **Not raw total area: it prefers burying one item to nicking three.**
>   Dividing by each item's own area makes it scale-free, which matches what
>   actually breaks — the same absolute overlap that is harmless on a long net
>   name destroys `C1`.
> - **Area rather than any new currency, because the currency already exists.**
>   `chooseLeastCovered(cands, area)` in `lib/schgen/render/field-placement.ts`
>   already minimises covered **area** locally (§6's measurement of the two
>   paths). A global objective in a different unit would be incommensurable with
>   the local one already shipped.
>
> **WHAT IT DELIBERATELY DOES NOT DO: it invents no weights.** **G71** records
> that no published source supplies them and §6 records Knuth and Plass calling
> **both their own formulae** *"quite arbitrary"*. So **every weight is 1**, and
> the per-obstacle-class breakdown is **reported beside the scalar rather than
> folded into it** — the eleven classes `render/` already distinguishes are
> exactly the data a weighting would need, so keeping the vector means a
> weighting can be chosen later **without re-measuring**. Equally the scalar is
> computed under whichever of §1's three text boxes is elected (**G265** clause
> 4, still his): absolute counts move under a change of ruler, but an **ordering
> between two arrangements** survives it far more often, which is what a
> minimiser consumes.
>
> **NOTHING IS BUILT.** This is a measure, not an implementation, and
> `CLAUDE.md` requires a written design reviewed before implementation. The
> search that drives the number down, where the number is reported, and whether
> an infinite grade survives beside it (§6.3/§6.11, still his) are not settled
> here.

> **THE INFINITE GRADE IS ANSWERED, 2026-10-23, AND IT IS THE THIRD AND LAST
> RESERVED DECISION. His words, verbatim:**
>
> > *"It depends. If it completely halts progress on creating schematics, then we
> > need to come up with a suitable workaround. Complete failure is worse than
> > sub-optimal schematic layout. One option is to add a note to the drawing to
> > explain the collision if there really is no way to solve the problem"*
>
> **THE FORMULATION HE CHOSE WAS NOT ONE OF THE THREE PUT TO HIM, AND IT IS
> SHARPER THAN ALL OF THEM.** He was offered *everything is a cost*, *some
> overlaps are vetoes*, or *show me a sheet and I will say*. His answer is none
> of these: **a veto is permitted only where it does not stop a schematic being
> produced, and where no placement avoids the defect the escape is to DRAW IT AND
> SAY SO ON THE DRAWING.** So the prohibition does not sit on the geometry. **It
> sits on the SILENCE.** Nothing is never-drawn; some things are never drawn
> *undisclosed*.
>
> **THE GOVERNING ORDER, IN HIS WORDS: "Complete failure is worse than
> sub-optimal schematic layout."** That is a general ranking rather than a rule
> about pins, and it settles the class of question this entry has been circling:
> **where legibility and production conflict, production wins and the cost is
> disclosed.**
>
> **AND IT UNBLOCKS THE ONE APPROACH THE SYNTHESIS SAID COULD MOVE THE BOARD
> COUNT.** §7.1's **row 14** - place what you can and report what you could not,
> for labels - was the only row of eighteen that could change how many boards
> draw, and §7.1 recorded its yield as **unmeasured on purpose** because *"its
> precondition is G260, the owner's."* **This is that precondition, met.** Its
> yield is still unmeasured and nothing here guesses at it.
>
> **HE ARRIVED INDEPENDENTLY AT THE BEHAVIOUR THE RESEARCH FOUND, FOR THE THIRD
> TIME.** **G268** records *place what you can and log what you could not* as a
> sixth behaviour shape that **none of the seven surveyed tools exhibits**, found
> only as an unretrievable commercial lead; §6.8 records TeX doing it - *"an
> overset line and an error message that encourages the user to take corrective
> action"*. **His version is stronger than TeX's in one respect worth recording:
> TeX puts the message in a LOG, and he puts the note ON THE DRAWING.** A log is
> separable from the artifact and gets lost; a sheet carries its own disclosure
> wherever it travels.
>
> **WHAT THIS DOES NOT LICENSE, and this is the controller's reading for him to
> correct rather than his words.** He said *"the collision"*, and
> **sub-optimal LAYOUT** is what he ranked above complete failure. **Two of this
> repository's refusal classes are not collisions and not layout quality**, and
> the escape is NOT extended to them here: a board whose **circuit fails
> validation** (six of eleven), and a drawing with **a branch point and no
> junction**, which **G262**'s obligation records as *"a connection KiCad does not
> make"*. The second is the sharp case - **a missing junction makes the drawing
> WRONG about the circuit rather than merely crowded**, and a note saying so
> would be a drawing that documents its own incorrectness. **Annotating a
> legibility defect and annotating a connectivity defect are different acts**, and
> only the first is covered.
>
> - **Found** 2026-10-23, from the owner, answering §6.3/§6.11 as put to him in
>   the research report's §5. Recorded verbatim per `CLAUDE.md`.
> - **Evidence** `[OWNER]` his words above, quoted in full. A directive; no
>   measurement supports or could support it.
> - **Verified** **CONFIRMED** as his words. **The row-14 and G268 consequences
>   are the controller's inference**, as is the scoping paragraph above.
> - **Why it is open** because all three reserved decisions are now answered and
>   **not one line of it is built**: nothing minimises, nothing annotates, and the
>   refusal he has overruled is still in `checkLayout`.
> - **What would settle it** **CRITERION: a sheet is produced for every board the
>   circuit model admits, carrying its own note wherever a collision could not be
>   placed away, and no board produces nothing because of a collision.**
>   **MECHANISM: none offered.** The note's form, its placement, whether the note
>   itself may collide - it is text, so it can - and whether an annotated defect
>   still counts toward the minimisation are a design exercise he reviews.

---

### G265 - MEASURED: KiCad's real text geometry, by three routes that agree exactly - and FOUR things a later measurement needs that are not in any figure, including an SVG export that silently omits a global label's outline

Task 1 of the text-handling research plan measured three text-geometry quantities against
`lib/schgen/render/text-boxes.ts`'s `textWidth(text) = text.length * GRID`. **The figures are in
`docs/schematic/text-handling-research.md` §1 and are NOT repeated here**; the amendments to
**G239** and **G260** carry what those entries' own arithmetic becomes. What is here is the
material a later measurement needs and cannot re-derive from a figure.

**(1) `kicad-cli sch export svg` 10.0.5 DOES NOT DRAW A GLOBAL LABEL'S OUTLINE. `export pdf` of the
same file draws both the outline and the text.** `[RAN]` A label's six-sided body is simply absent
from the SVG: over a whole probe sheet the only paths with five or more points are the sheet's two
border rectangles and its title block. **An SVG export therefore cannot answer "how much room does a global
label take"**, and a measurement that reads one will under-report a label's extent by the whole
outline - 3333.8 um along the label's side and 1270 um either side of it, which is more than two
grid steps in each direction. It was found by a probe refusal rather than by inspection: a row that
should have been 2.7 mm across measured 1.27, which is the text's cap height. **A reader must not
take the SVG's silence for a label that takes no room.**

**(2) KiCad SIZES A TEXT BOX WITH A PEN IT DOES NOT DRAW WITH.** `EDA_TEXT::GetTextBox` takes its
thickness from `GetEffectiveTextPenWidth()` called with **no** render settings, which for non-bold
1.27 mm text is `GetPenSizeForNormal(size) = size/8 = 158.75 um` (`common/gr_text.cpp`). The pen
eeschema actually plots schematic text with is **152.4 um** (6 mil), measured off the SVG export's
own `stroke-width`. The two differ by 6.35 um and both are correct in their own place. **Recorded
so the next person who finds the two numbers does not take one for a transcription error** and does
not "reconcile" them.

**AND IT IS NOT WHY `GetTextBox` IS TALL, which is the reading that would actually mislead.** `[RAN]`
the counterfactual: at the plotted 152.4 um pen the box would be **2020.8 um** instead of 2043.1, so
the pen disagreement is **22.3 um of the 773.1 um** by which the box exceeds this repository's
1270 um line - **2.9%**. The rest is `StringBoundaryLimits`'s `KiROUND(thickness * 1.5)` inflation on
every side (476.3 um, 61.6%) and `GetTextBox`'s own 17% fudge factor (296.9 um, 38.4%). **A reader
electing between the quantities (clause 4) must not discount Q3's height as bookkeeping around the
wrong pen**: at the right pen it is still 59% taller than the model's line.

**(3) THREE SMALL UNEXPLAINED QUANTITIES, UNDIAGNOSED AND NOT SMOOTHED.** The anchor-to-pen-origin offset of a
left-justified symbol field measures **111.1 um** where `common/font/font.cpp`'s
`offset.x += aAttrs.m_StrokeWidth / 1.52` predicts **100.3** at the plotted pen - a 10.8 um gap.
The PDF export's global-label outline is **0.8 um** longer along its side than
`eeschema/sch_label.cpp`'s `CreateGraphicShape` predicts. Both are under 1% of a grid step, neither
changes any conclusion, and **neither was diagnosed**. They are here because the next agent to
derive these constants from source will get the source's numbers and should know that the drawing
does not quite.

The third is larger and matters more: the `textLength` `kicad-cli` declares for a stroked string is
the glyph advance sum **plus a constant 203.2 um**, measured over 23 strings from one character to
seventeen with a worst departure of 0.4 um. That constant is `4/3` of the 152.4 um plotted pen,
which is the same `4/3` the SVG export applies to `font-size`, and **no source was read that says
why**. It does not need explaining for the check that uses it - a check on the advance table only
needs the residual to be constant, and it is - but an agent who reads `textLength` as an advance
will be 203.2 um over on every string.

> **THE ELECTION IS MADE, 2026-10-23. `EDA_TEXT::GetTextBox` GOVERNS. Clause (4)
> below is answered and its wording stands as written.** The owner, verbatim, in
> answer to the three quantities being put to him with their populations:
>
> > *"default to kicad as prior art"*
>
> **His reason is the one that commissioned the whole pass**, and it is recorded
> because it generalises past this clause: prefer the thing that already exists
> and is in use over a quantity this project would have to argue for. KiCad's
> box is also the only one of the three that **agrees with the tool that will
> render and edit the file**, so a person nudging text in eeschema is fighting
> the same rectangle the generator used.
>
> **WHAT IT COSTS, STATED PLAINLY BECAUSE HE CHOSE THE STRICTEST OF THE THREE.**
> The recorded population of fallback field placements goes from **15 to 24** -
> all fifteen survive and **nine more appear** - and the governing box is **2043.1
> µm** tall against the **1270 µm** the current model assumes, so the model
> **under-reserves height for 70 of the 264 strings** the eleven boards emit. In
> WIDTH it goes the other way: the current model **over-reserves** by a median
> 18% and a maximum 87%, so electing this box **narrows** text as well as
> heightening it, and some present collisions may clear while new ones appear.
> **Nothing here re-measures that** - the 24 is §1's figure under this box, not a
> re-grading of the boards under the pair of changes together.
>
> **AND HIS TWO DECISIONS COMPOSE WELL, WHICH IS WORTH SAYING BECAUSE EITHER
> ALONE WOULD HAVE BEEN AWKWARD.** Electing the strictest ruler under a refusal
> regime would have made **more** boards refuse. Under his **G260** directive to
> minimise rather than gate, a stricter ruler simply means the number starts
> higher and has further to fall. **A threshold would have made this election
> painful; a minimisation makes it cheap.**
>
> **TWO TRAPS THIS ELECTION INHERITS, both measured in this entry and now
> load-bearing rather than incidental.** Clause (2) records that `GetTextBox`
> sizes with a **158.75 µm pen it does not plot with**, and that at the plotted
> pen the box would be 2020.8 µm - so **the governing box is 22.3 µm taller than
> the ink it describes, by KiCad's own arithmetic**, and clause (2)'s warning not
> to discount that height as bookkeeping is now the warning about the elected
> quantity. Clause (1) records that `kicad-cli sch export svg` **omits a global
> label's outline**, under-reporting a label by 3333.75 µm. **Any future
> measurement of the elected box taken through SVG is therefore wrong**, and the
> PDF route or the font arithmetic is the one to use.
>
> **WHAT IT DOES NOT SETTLE.** The measure of overlap is **G260**'s, chosen and
> delegated there; this election fixes the rectangle both of its areas are
> computed from, so **G260**'s scalar is now fully specified. **One reserved
> decision remains and no agent may make it:** whether anything is hard-illegal
> rather than merely costly - the infinite-versus-finite badness split, §6.3 and
> §6.11 of the research document. **Nothing is built here**, and a mechanism that
> adopts this box by writing a new `textWidth` is an implementation requiring a
> written design he reviews.

**(4) THE ELECTION IS NOT MADE, AND IT IS CONSEQUENTIAL RATHER THAN ACADEMIC.** The plan's Step 0
forbids the producing agent from choosing which quantity governs a collision, because that is an
acceptance criterion for the artifact this generator produces (**G240**). It is open. **What the
measurement adds is that the choice MATTERS**: the same recorded population of fallback field
placements is 13 under the advance, 15 under the current model, 20 under the rendered ink and 24
under `EDA_TEXT::GetTextBox`. **The three measured quantities are within 0.63 grid steps of each
other in WIDTH and 44% apart in HEIGHT**, and it is the height that moves the counts.

**(5) THREE FILES OUTSIDE THE PROBE CHANGED, AND ALL THREE ARE DECLARATIONS RATHER THAN CODE.** The plan forbids
touching `lib/`, `tools/` or any check. Committing the probe under `tools/schgen/text-metrics/`
nevertheless turned `tests/schgen/port-fidelity.test.ts` red - *"every .ts file under `lib/schgen/`,
`tests/schgen/` and `tools/schgen/` is ported, diverged, or declared hand-written"* - so the probe's
modules, the paste checker and the two tests under `tests/schgen/text-metrics/` are appended to
`tools/schgen/port-manifest.json`'s `handWritten` list. **That is a declaration about provenance and
changes no behaviour**, and it is recorded rather than left for a reader to find in a diff, because
the plan's own constraint says no production file changes. The other two are
`tests/schgen/text-metrics/document-pastes.test.ts` and
`tests/schgen/text-metrics/pen-call-sites.test.ts`, which are research checks under `tests/` and run
on every `bun test`; neither touches `lib/` or any gate.

- **Found** 2026-10-22, Task 1 of `docs/superpowers/plans/2026-10-22-text-handling-research.md`.
- **Evidence** `[RAN]` `tools/schgen/text-metrics/probe.ts` at commit `757c4dd` with a clean tree,
  `kicad-cli` and `pcbnew` 10.0.5, `newstroke_font.cpp` pinned by SHA-256
  `dd686d654166869bad4866b107c81e538736c057721ddbf70036a50d8e844de9` - **the probe refuses any
  other blob**. `[READ]` `common/newstroke_font.cpp`, `common/font/stroke_font.cpp`,
  `common/font/font.cpp`, `common/eda_text.cpp`, `common/gr_text.cpp`, `eeschema/sch_text.cpp`,
  `eeschema/sch_label.cpp` and `eeschema/default_values.h` at tag `10.0.5`.
  **Every claim above has a check that could have failed**: the three routes are compared against
  one another and the probe prints the worst disagreement (font-vs-runtime EXACT on `GetTextBox`'s
  width over all 264 strings and 1.5 nanometres of floating-point residue on the stroked outline,
  0.3 um font-vs-renderer, 0.8 um formula-vs-PDF); **a FOURTH reading, KiCad's own declared
  `textLength`, is the only direct check the glyph advance has and it agrees** - a constant residual
  over 23 strings against which `length * GRID` departs 14819 times as far; clause (1) was produced
  BY a refusal, not by inspection; and the re-run of the field placer is held to
  `lib/schgen/render/field-placement.ts`'s own output - block, unit, lib id, rounded cost and every
  `covers` string - before any measured figure is printed.
  **AND THE DOCUMENT IS HELD TO THE RUN**: `tools/schgen/text-metrics/verify-pastes.ts` requires
  every fenced block of `docs/schematic/text-handling-research.md` tagged ` ```run ` to equal a
  CONTIGUOUS slice of a run's log, in order, and every block tagged otherwise to share no line with
  it. It was written because the first round of that section tidied SEVEN pasted blocks without
  meaning to - a truncated line, a control that lost its parenthetical, two tables re-padded so
  their columns lined up, a rewrapped claim, and one block left stale after the probe grew a column.
  None changed a figure; all were edits to evidence, and reading for them by eye did not find them.
  **THREE VERSIONS OF THAT CHECKER HAVE BEEN DEFEATED, AND THE SEQUENCE IS THE ENTRY** - recorded
  because each failure is a different general shape and a later reader will meet all three.
  **(i) Flat membership with a 50% gate.** A genuine line moved into the wrong block PASSED; and a
  block with fewer than half its lines in the log was SILENTLY EXCLUDED, so fabricating four of six
  lines and leaving two genuine anchors produced a green run. **A block edited enough stopped being
  checked** - this register's own cardinal failure, wearing a remedy's clothes.
  **(ii) Contiguity.** It closed both, and **CONTIGUITY IS VACUOUS AT LENGTH 1**: a one-line block
  collapses *"a contiguous slice of the log"* back to *"this line is in the log somewhere"*, which
  is hole (i). The document's one single-line block was swapped for an unrelated genuine log line
  and the checker exited 0. **A rule strictly stronger for n >= 2 was strictly EQUAL at n = 1.**
  **Generalising a rule does not generalise its boundary, and nobody checks the boundary of a rule
  they have just strengthened** - that is the transferable lesson, not the bug.
  **(iii) The relabel dodge**, which is the attack surface the fix for (i) OPENED rather than
  failed to close, and is a different thing worth a reader's time: once "is this block output?" is
  the whole question, declaring a block as *not* output is the way out. Closed by requiring a
  non-output block to share no line with the log.
  **The version in the tree** requires a `run` block to be a contiguous, UNIQUE slice of a NAMED
  section of the log, with at least two non-blank lines, not overlapping another block. Green on
  the document; RED on eight perturbed copies, the document and the log unchanged by hash.
  **AND THE SEQUENCE SAYS NOTHING ABOUT THE FIGURES, which is worth stating plainly because three
  rounds on one file invite the opposite conclusion.** The measurement has been re-driven at every
  round and is byte-identical every time, the only differing lines being the commit hash and the
  scratch path. **What kept failing is the machinery that proves the EVIDENCE was pasted as it
  came**, not the evidence.
  **IT NOW RUNS WHERE IT CAN FAIL** (controller ruling R12):
  `tests/schgen/text-metrics/document-pastes.test.ts` drives it on every `bun test` against a
  committed run log, and **couples the log to the document** - the document names the commit its
  figures were measured at, the log records the commit it was taken at, and a case requires them to
  agree. **What nothing here establishes is that the log is a CURRENT run**: re-driving the probe
  needs `kicad-cli`, the KiCad Python bindings and a 2.9 MB font blob fetched outside the
  repository, so a reader wanting that re-drives it.
  **CONTIGUITY COST THE DOCUMENT TWO EXCERPTS AND ONE SINGLE-LINE PASTE**, which are facts about
  the document rather than the checker: §1.3 pasted eight of twenty-three declared advances and §1.5
  six of twenty-seven measured rows, and an excerpt cannot be told from a tidy by any rule that does
  not read minds; §1.9 pasted one line, which no anchor can hold. All three now paste in full, which
  is why those sections are longer than a reader needs. **The log must also hold exactly one run**
  and a two-run log is refused by name (ruling R15) - dormant rather than absent, since the section
  rule already refused one, illegibly.
- **Verified** CONFIRMED - this writer wrote the probe, drove it, read KiCad's source and looked at
  the rendered PDF.
- **Why it is open** clauses (1), (2) and (3) are measurements and facts about tools, open because
  nothing acts on them yet. Clause (4) is an owner decision and **no agent may make it**. Clause (5)
  is a disclosure.
- **What would settle it** (1) **CRITERION: a global-label extent measured from an export that
  draws the outline.** The PDF does; **MECHANISM, UNTRIED beyond this probe** - whether upstream
  considers the SVG behaviour a defect was not investigated, and no KiCad issue was searched for.
  (2) and (3) nothing settles them; they are true. (4) **CRITERION: the owner says which box
  governs a collision** - ink, advance, or KiCad's own - having seen that the population is 13, 20
  or 24. Until he does, no agent may pick one, and **a mechanism that quietly adopts one by writing
  a new `textWidth` has made the election**. (5) nothing; it is recorded, not open.

> **CLAUSE (4) IS SETTLED, 2026-10-23: `EDA_TEXT::GetTextBox`, population 24.**
> The criterion above is met and is **deleted rather than amended** - it asked
> the owner to say which box governs, and he has (*"default to kicad as prior
> art"*, the amendment at the head of this entry). **The prohibition on an agent
> picking one is discharged for the choice and KEPT for the implementation:**
> writing a new `textWidth` is still the act that makes an election real, and it
> now has to match this one. Clauses (1), (2) and (3) are unaffected, and (2) and
> (1) are the two traps the elected box inherits.

---

### G92 - `stripboard/render-approvals.json` holds five approvals, not seventeen, and a `grep -c` was reported as an entry count

**A controller counted `grep -c "candidateSha256"` and reported the result as
"17 entries" in a dispatch brief.** Measured: the file's top level is
`{schema, approvals, notes}` and **it holds five approvals**, one per Pultec
section board, with **six** `ownerWords` utterances across them and twelve
declared fields each. The sibling `stripboard/exemptions.json` holds two. **No
count of 17 exists in any stripboard registry**; the string simply occurs 17
times.

**Every other property claimed of that channel holds** and was re-checked: it is
scoped to `board` plus `candidateSha256`, it carries the owner's words verbatim,
it is held outside any generation run, and its loader refuses a narrator-voice
quote. **The mechanism was right and the number was wrong**, so the channel is
adopted by that spec's §3.3 with the figure corrected rather than repeated.

- **Found** 2026-10-19, by the agent revising the schematic-authoring spec, which
  declined to repeat a figure it could not reproduce.
- **Evidence** the file's parsed shape and entry count, measured; the raw
  `grep -c` of 17 reproduced, which is what shows how the error was made.
- **Verified** CONFIRMED by the controller, who re-ran both and got
  `{schema,approvals,notes}` with five approvals against a raw grep of 17.
- **Why it is open** the wrong figure reached a dispatch brief and would have
  reached a spec. The general fault is not corrected by fixing this instance.
- **What would settle it** **CRITERION: a count of records in a structured file
  is obtained by parsing it, never by `grep -c` of a field name.** A field that
  appears in a schema block, in notes, or more than once per record inflates the
  count silently and in the direction that makes a claim look stronger.

### G40 - what a coil's pads should say on a build sheet was decided by an agent, and the entry recording it as unconfirmed was deleted with the gap it sat in

A board's inductor pads now print `HI BOOST 100MH a` and `HI BOOST 100MH b` -
the coil's function, its value, and which end. **Eighteen printed pads across
two committed boards take their wording from that choice**: four coils on
`pultec-hi-boost`, five on `pultec-mid`.

**It was decided by an implementing agent, not by the owner.** The controller's
ruling named the `RV_` and `SW_` prefixes; `L_` was added on the implementer's
judgement, because the committed hi-boost and mid layouts carry those pads and
the alternative was no guide page for two of the five boards. **That reasoning
is sound and the call was flagged rather than hidden** - which is the sanctioned
channel working.

**What went wrong is bookkeeping with teeth.** The deleted G37 carried *"an
owner line on what an inductor-tap pad should read"* among the things that would
settle it. G37 was correctly deleted - its gap had dissolved - and that question
went with it, surviving only in a gitignored task report. **The wording of
eighteen pads on a printed build sheet is a criterion about the artifact, and
the invariant says the producing agent may not author one.** The decision stands
until the owner rules; what was missing is any durable record that it is still
his to rule on. This entry is that record.

- **Found** by the Task 2 re-reviewer, as a consequence of a correct deletion.
- **Evidence** the sweep's own counts: hi-boost 21 off-board pads including 8
  inductor pads, mid 28 including 10.
- **Verified** yes - the controller read the counts and the labels.
- **Why it is open** it is the owner's to confirm, and nothing else is blocked
  on it.
- **SETTLED 2026-10-17: the owner was asked and declined.** Shown
  `HI BOOST 100MH a` and told `MID 0R45H b` was the weakest of them - RKM
  notation for 0.45H reading as a BOM value rather than a panel word - he said:

  > *"i don't have a strong opinion about either"*

  **So the agent's wording stands, and it stands differently than before.** The
  invariant forbids an agent AUTHORING a criterion for its own artifact; it does
  not forbid one standing when the owner has seen it and declined to rule. The
  difference is the asking, and that is now on the record rather than in a
  gitignored report.

  **WHAT HIS "EITHER" REFERS TO, ADDED 2026-10-21 BECAUSE HALF OF IT WAS LOST
  WITH A DELETED ENTRY AND THIS IS THE ONLY SURVIVING HOME OF HIS WORDS.** That
  one sentence answered **TWO questions put to him together**, and a reader of
  this entry alone would reasonably take *"either"* for the two pad labels
  quoted above. It is not. `f395101`'s commit message - *"Two questions put to
  the owner, declined, and recorded as declined"* - names both: *"He was asked
  what a coil's pad should read on a build sheet, with `MID 0R45H b` named as
  the weakest of them, **and whether a rotary's pads running out of physical
  order on the strip was worth a placement constraint**. His answer to both was
  that he has no strong opinion."* **The second half is this one, recovered
  verbatim from the deleted `G42` at `bb1b106^`:**

  > *"**SETTLED 2026-10-17: the owner was asked and declined** - "i don't have a
  > strong opinion about either" - having been offered a placement constraint
  > that would keep a rotary's pads monotonic along its strip. **No constraint
  > was added**, which is the cheaper answer: a monotonic-pads rule would bind
  > the placer on every board to prevent a confusion nobody has yet reported
  > making."*

  **So the declination covers a SECOND thing: no monotonic-pads placement
  constraint binds the placer, and that is his declination standing rather than
  an agent's choice.** G42 itself was **correctly** deleted at `bb1b106` - its
  measurement was taken on a frozen test fixture and the adopted
  `pultec-low-boost` ascends in both axes, so the entry *"described nothing
  anyone would build from"* - and that commit message says *"the owner's
  declining to constrain placement stands undisturbed because there was nothing
  to constrain."* **That reasoning was in a commit message and the declination's
  second half was in no committed file**, which `CLAUDE.md` does not allow:
  *"an owner decision, and an owner DECLINATION, with his words verbatim"* is
  register content, and *"a question he declined is not a closed question, but
  nobody asks him again unprompted"* only protects him if the record says he
  declined. **The deletion was right; what it carried was not checked.**

  **WHY THE WHOLE-BRANCH REVIEW REPORTED THE WORDS AS LOST ALTOGETHER, WHICH IS
  WORTH MORE THAN THE CORRECTION.** It reported *"`grep -rn "no strong opinion"`
  over every `.md`, `.json` and `.ts` in the tree outside `.superpowers/`
  returns nothing"* and concluded the verbatim words survive nowhere. `[RAN]`
  both greps at HEAD: **`"no strong opinion about either"` → 0 hits**, and
  **`"i don't have a strong opinion"` → 1 hit, this entry.** **The search was for
  a paraphrase of the quotation it was looking for**, and a paraphrase is
  exactly what a verbatim-words rule forbids producing - so the grep could not
  find what the rule exists to preserve. **G244**'s shape, one step over: that
  entry records a search for the conclusion's vocabulary rather than the
  objection's; this is a search for the searcher's own wording of a quotation.
  **What was genuinely missing was never his words - it was the second thing
  they answered.**

  **This entry is kept open rather than deleted**, because a declined question
  is not a closed one: he may rule the first time he builds from one of these
  pages and reads `MID 0R45H b` with an iron in his hand. **Nobody asks him
  again unprompted.** If he rules later, that ruling supersedes this note and
  the entry goes.

### G31 - an approval's quote names no board, so one sentence authorises two entries and nothing in the loader notices

On 2026-10-17 the owner was shown two renders - `pultec-hi-boost` and
`pultec-mid`, both `layout-designators.png` under
`build/scratch/task-7-render/` - and said, in full:

> *"the two boards you showed me look good."*

That one sentence is the authority for **two** entries in
`stripboard/render-approvals.json`, `owner-render-pultec-hi-boost-rcm-s4` and
`owner-render-pultec-mid-rcm-s0`, which quote it identically.

**THE GAP IS THAT THE SENTENCE IDENTIFIES NEITHER BOARD.** *"the two boards you
showed me"* is a reference to an act outside the repository. Which two boards it
means is fixed by what was put in front of him, and that is recorded in each
entry's `renderedFrom` and `note` by the agent that recorded the approval - it is
not in his words and no reader can recover it from them. For these two boards the
PICTURE-to-BYTES half of that chain is now a measurement rather than an inference
(see `G27` item 2 below), so what is left is narrow and specific: **which two
pictures he was looking at.**

**AND THE LOADER CANNOT SEE THE REUSE.** `tools/stripboard/approvals.ts`'s
uniqueness rule is on `candidateSha256` and on `id`, deliberately - the same bytes
approved twice is one decision written down twice - and there is no rule on
`ownerWords`. So:

- two entries quoting one sentence load cleanly, which is correct here and is the
  reason the rule is where it is;
- **a THIRD entry pasting the same sentence against a third board's hash would
  also load cleanly**, and the three quote guards
  (`approvals-no-words`, `approvals-words-narrated`,
  `approvals-words-not-spoken`) would all pass on it, because the sentence is
  genuinely his and genuinely in the second person.

**WHAT WAS CONSIDERED AND NOT DONE, because each is an agent authoring a rule
about the owner's own words.** Refusing a quote that is already in the file
(which would have refused this correct pair); requiring the quote to contain the
board name (he does not talk that way, and the low-boost quote does not contain
*"low-boost"* either); a `coversBoards` list field (an agent's enumeration of
what he meant, with the loader checking the agent's own answer).

- **Found** `2026-10-16-low-boost-to-adoption`, in the change that adopted
  `pultec-hi-boost` and `pultec-mid` on this sentence.
- **Evidence** the sentence itself, quoted above and carried verbatim in both
  entries; `tools/stripboard/approvals.ts`'s `readEntries`, whose two
  duplicate refusals are `approvals-duplicate-id` and
  `approvals-duplicate-candidate` and which has no clause about `ownerWords`;
  and `tests/stripboard/approvals.test.ts`'s *one utterance is the authority for
  two entries, quoted identically in both*, which asserts the reuse rather than
  hiding it.
- **Verified** yes - the pair was loaded, consulted and adopted on it.
- **Why it is open** the fix is a rule about what the owner's words have to
  contain, or about which boards an agent may say he meant, and the producing
  agent may author neither. Recording the reuse loudly in three places - the
  registry's `notes.ownerWords`, both entries' `doesNotExcuse`, and a test that
  names it - is what an agent may do about it.
- **What would settle it** him naming the two boards in a sentence, or a
  reviewing agent deciding whether an approval may cover more than one artifact
  and, if so, what field records which. Until then: **an approval recorded from a
  multi-board sentence must name the renders it came from, and a reader who needs
  to know which boards he meant reads `renderedFrom`, not `ownerWords`.**

**NARROWED ON 2026-10-17: IT NO LONGER COVERS EVERY ENTRY, AND THE REASON IS A
SHAPE RATHER THAN A SENTENCE.** The fourth and fifth entries -
`owner-render-pultec-low-cut-part-walk-s1` and
`owner-render-pultec-hi-cut-rcm-s20` - are authorised by a SELECTION,
*"low-cut: part-walk-s1 / hi-cut: rcm-s20"*, which NAMES both boards. The
selection reading (`tools/stripboard/approvals-words.ts`'s `isSelectionFor`) is
per entry, so those same two lines pasted against a third board's hash are
**refused by name**, which is exactly the thing this entry says the loader cannot
do for a sentence. `tests/stripboard/approvals-refusals.test.ts` drives it on all
three Pultec sections those lines could be filed under.

**What is NOT narrowed:** the hi-boost / mid pair above, whose authority is still
an in-voice sentence naming no board, and which would still admit a third entry
pasting it. The uniqueness rule is still on `candidateSha256` and not on the
quote. So this entry now describes the VOICE shape's residual specifically, and
`G35` describes the selection shape's, which is a different one.

### G13 - `--stretch` cannot change a part's span on a packed board

**Read the narrowing at the end of this entry before relying on it.** As first
written this entry claimed that bringing a base board's footprint spans to a
candidate's lead spans needs an ordering; that claim is true of `--stretch` and
false of `--materialize`, and the span step landed inside `--materialize`
(`.tools/veroroute-perfboard/Src/Headless_materialize_place.cpp`'s
`SolvePlacement`) without needing one. **The gap that entry recorded - nothing
reconciling a base board's spans with the candidate's, so `--materialize`
refused on low-boost's first capacitor - is CLOSED and its entry is deleted
rather than marked, per this file's own rule.**

`--stretch` takes the part off, changes it, and refuses when it cannot put it
back. Both boards a materialisation could start from are packed, so a span
gesture driven from OUTSIDE the fork cannot be run in place:

- on the owner's committed hand layout, **six of the seven placed parts refuse
  `--stretch` in both directions**;
- on a board built fresh by `--import`, every SHRINK succeeds and **every GROW
  refuses** - `--import` packs the parts shoulder to shoulder in rows 0-2.

Standing the step in by hand required `--move`ing all seventeen two-lead parts
onto rows of their own, in two column bands, before any span could be set.
`--move` has its own two refusals that bear on this: a destination that is not
free, and a destination outside the board's `GRID` (the `--import` board is
`GRID 35 35`, which will not take seventeen parts strung down one column).

- **Found** `2026-10-16-pultec-five-boards`, Task 3, while probing past the span
  disagreement that `--materialize` now settles itself.
- **Evidence** the fork's `--stretch` and `--move` refusals, both quoted in
  full in that task's report; the probe that got through by spreading first.
- **Verified** yes - run, not relayed.
- **Why it is open** it was recorded as the constraint on the span step rather
  than as a defect of its own, and naming it was the point. The span step no
  longer goes through these two verbs, so what is left is a limitation of
  `--stretch` and `--move` with no current caller.
- **What would settle it** either a `--stretch` that pans or spreads to make
  room, or an owner ruling that a packed board is simply not stretchable in
  place and the refusal is correct as it stands.
- **NARROWED, 2026-10-16, by reading the fork.** This entry is true of
  `--stretch` and **is not true of `--materialize`**, so it never constrained
  the span step the way the sentence above expected. `MaterializeLayout`'s PHASE 2
  calls `board.FloatAllComps()` at
  `.tools/veroroute-perfboard/Src/Headless_materialize_apply.cpp:369` -
  `Board::FloatAllComps` (`Board_components.cpp:781-784`) is `TakeOff` on every
  component in the manager - and `WipeCopper` on the line after it. By the time
  the turn search runs in PHASE 4, **every part is already off the board and the
  copper carries no nets**, and `PlaceTarget`
  (`Headless_materialize_place.cpp:154-190`) performs the single `Board::PutDown`
  of the run at the hole the document declares. There is no "put it back", which
  is the gesture this entry is about. A span set inside the turn search therefore
  needs no spread-first ordering, and the one that landed there has none.
  - **What survives of it:** `PlaceTarget`'s `PutDown` can still refuse a longer
    footprint that overlaps a hole an earlier target claimed. That is a NAMED
    refusal with nothing written and nothing left floating - not this entry's
    silent float - and the rectangle after a stretch is the one the document
    declares, which is the rectangle the model's own overlap checks were run
    over. It has not been seen: low-boost materialises with every part at its
    declared separation and nothing collides.
  - **The entry stays open** because `--stretch` and `--move` still behave
    exactly as recorded, and anything that reaches for them to change a span on
    a packed board will still hit this.

### G16 - no Pultec section has a schematic of its own, so no section's packet can be checked against one

**THE HALF THAT BLOCKED `make guide` IS FIXED, AND THIS ENTRY IS WHAT REMAINS.**
The title used to read *"`boards/pultec-low-boost` declares no schematic, so
`make guide` cannot run on it"*, and the refusal it named
(`tools/guide/packet.ts`, *"declares no \"sch\", so the packet has no schematic
to print"*) is deleted. A packet is now produced without a schematic, and
`guide.html` carries a bordered notice on page one - above the first layout
image - saying there is no schematic, naming the board, naming the
`perfboard.json` that declares none, naming the circuit model the pages WERE
checked against, and saying what would put a schematic page there. Both
`pultec-low-boost` and `pultec-low-cut` were packeted this way and the printed
pages read (2026-10-17).

**THE OWNER HAS NOW ANSWERED THE QUESTION THIS ENTRY CALLED HIS, 2026-10-18,
AND ITS OWN SUGGESTED MECHANISM DOES NOT MEET ITS CRITERION.** Read this before
the rest of the entry, which was written when the drawing question was open.

His words, relayed by the controller on 2026-10-18 and **not heard directly by
this writer**:

> *"The per-board schematics need to be derived from the canonical schematic -
> that's a crucial part of modularizing. It's not a blocker, it's a
> REQUIREMENT"*

So each section does get a schematic, the canonical
`circuits/pultec/pultec-three-band-eq.kicad_sch` **stays** the authority for all
five, and the per-board schematic is a further derivation along the chain
`CLAUDE.md` already states for an imported design. The work is sub-project T2 of
`docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md`, which now
carries the chain and the requirement verbatim under **Authority hierarchy**.
This entry stays open because the schematics do not exist yet; what is settled is
whether they should.

**WHAT DOES NOT FOLLOW, AND IT IS THIS ENTRY'S OWN MECHANISM.** "What would
settle it" below says *"draw it, declare the `sch`/`netlist` pair, and the packet
prints it with no further change"*. That is a MECHANISM, written by somebody who
had not tried it, and per `CLAUDE.md` the criterion is the settlement. Three
things measured 2026-10-18 say the mechanism as written does not reach it:

- **The comparison gate it leans on is aimed at the wrong point in the chain.**
  `netlist-agrees` would compare the declared `netlist` against the declared
  `sch`; this entry's own body measures that a whole-EQ netlist declared on a
  section board rejects. The spec's gate 4 names exactly that direct whole-EQ-to-
  section comparison and has been marked a defect in the spec for it. The
  authority is not in question - only where the comparison is made, and each step
  of the derivation needs to be checkable rather than one end-to-end comparison
  that skips the steps.
- **A section board carries parts the whole EQ does not have**: 6 to 9 stand-in
  components and two `physicalOnly` 1x05 junction headers per board (measured:
  low-boost 19 components total, low-cut 20, hi-boost 27, hi-cut 21, mid 39).
  These are products of modularization and are themselves derived - not foreign
  matter - but they enter below the netlist export, so nothing above that step
  predicts them.
- **If the declared pair becomes a GENERATED schematic plus its own generated
  netlist fixture, `netlist-agrees` compares a generated artifact against a
  generated artifact** and the freshness guard stops guarding anything a human
  did. That is a real possibility the mechanism does not consider, and it is not
  resolved here.

**AND A SECOND QUESTION THE MECHANISM HIDES: which configuration does a section
schematic depict?** `physicalBoard(s) = boardNetwork(s, {s})`
(`circuits/pultec/physical/board.ts:332`) is the standalone build - one of 31 -
and the other 30 omit some stand-in groups, with which board supplies which group
moving as boards are added (`lib/board/scaffold/supplier.ts`: *"the assignment is
stable only while boards are added LATER in `LADDER_ORDER`"*). The maximal network
with a per-part fit condition, one sheet per build, and the section's own parts
only are three different drawings. **Unanswered, and deliberately not answered
here.**

**A THIRD REPRESENTATION BECOMES A FOURTH.** Each board already has three
generated descriptions of itself - `wiring.md`, the printed packet, and the
`.vrt` layout - and **G1** and **G45** record that two of them already disagree
about a panel control, measured and surviving. A generated schematic is a fourth
vocabulary for the same board, and neither this spec nor any gate in it checks
cross-artifact agreement.

What is left is the fact, not the refusal: **none of the five Pultec sections
has a schematic of its own.** The only schematics in this repository are
`circuits/pultec/pultec-three-band-eq.kicad_sch` and
`circuits/pultec/pultec-mid-band.kicad_sch`, which are the whole EQ. Declaring
one of those on a section would also declare its whole-EQ `netlist` against one
section's board, which `netlist-agrees` would then compare and reject - half a
section's parts are not in it. So for these boards nothing cross-checks the
physical model against a drawn schematic: `make check` says so on every run
(*"This run did NOT compare the circuit against any schematic"*) and now the
printed packet does too.

- **Found** `2026-10-16-pultec-five-boards`, Task 3; narrowed to this claim
  2026-10-17 when the packet path was made to produce without a schematic;
  **extended 2026-10-18** by a drift check of
  `docs/superpowers/specs/2026-10-08-agent-authored-boards-design.md` run before
  T2 was planned, plus the owner's answer above. The drift-check file itself is
  `.superpowers/sdd/schgen-drift-check.md`, which is gitignored, so this entry
  and the spec are the only durable records of it.
- **Evidence** the two declarations (`circuit`, `export`, `vrt` and nothing
  else); `ls circuits/pultec/*.kicad_sch`; the `NOTICE` printed by
  `make -C boards/pultec-low-boost guide`; the generated
  `boards/pultec-low-boost/guide/guide.html`, read as a printed PDF. **For the
  2026-10-18 extension:** the per-board component counts were produced by this
  writer, running `physicalBoard(section)` for all five sections and counting
  components and those carrying no `part.symbol` - a check that could have
  failed, and which disagreed with nothing (19/20/27/21/39 total, matching the
  drift check's own figures); the owner's quote as relayed; `gate 4` and the
  authority rows read in the spec at `1dd5814`.
- **Verified** yes - run, and the pages read. **For the 2026-10-18 extension:**
  the component counts are this writer's own measurement; the owner's words are
  a **relay** from the controller, not heard directly; the claim that
  `netlist-agrees` rejects a whole-EQ netlist on a section board is the original
  entry's measurement and is NOT re-run here.
- **Why it is open** a per-section schematic is a drawing somebody has to make,
  and **whether these sections should have one at all is the owner's call**: the
  partition in `circuits/pultec/physical/board.ts` is currently the only
  statement of what a section contains, and promoting it to a drawn schematic is
  a decision about where the authority for these boards lives, not a cleanup.
- **What would settle it** **SUPERSEDED IN PART BY THE OWNER'S ANSWER ABOVE, and
  kept because the mechanism it names is the one a later reader would otherwise
  follow.** It used to read: *"the owner says whether each section gets its own
  schematic (then: draw it, declare the `sch`/`netlist` pair, and the packet
  prints it with no further change), or rules that the circuit model plus the
  whole-EQ schematic is the authority these boards keep - in which case this
  entry is deleted and the printed notice is the permanent, correct statement."*
  He has taken the first branch and the second is dead - the printed notice is
  **not** the permanent correct statement.

  **CRITERION, unchanged in substance:** each of the five sections has a
  schematic of its own, derived from the canonical schematic, and the packet
  prints it instead of the no-schematic notice.

  **THE MECHANISM IN THE OLD TEXT IS WRONG and must not be followed as written**
  - declaring a `sch`/`netlist` pair on a section board is precisely what this
  entry measured as rejecting, and the three bullets at the top of this entry say
  why. What the derivation's steps are checked by is a T2-plan design question,
  not a mechanism this register may pick: an agent that chose it would be
  authoring the acceptance criteria for the artifact it is about to produce.
- **ONE THING THE PRINTED NOTICE DOES NOT SAY**, and it is deliberate: it does
  not name `pultec-three-band-eq.kicad_sch` as the upstream authority. The
  packet writer serves every board, and a Pultec path written into it would be a
  guess on every other board that declares no schematic. The notice names the
  circuit module instead, which is the head of that chain and is true of any
  board. If the owner wants the whole-EQ schematic named on the page, the
  channel for it is the circuit module declaring it - the shape
  `powerUpChecks()` already uses - not a constant in `tools/guide`.

### G90 - what defeats a general schematic router is NET DEGREE, not circuit family, not part count and not the decade - and every circuit here exceeds the threshold

**This is a measurement, not a defect, and it is the load-bearing fact under the
schematic-generation program's architecture.** It is recorded because the wrong
version of it was in a spec for a week, and because its replacement is the kind of
thing a later agent would otherwise re-measure from scratch.

**What was measured, on `devbisme/schematizer` 0.2.0.**

- **`--mode normal` failed on all four non-Pultec circuits: 0 successes in 12
  attempts**, across a passive EQ, an op-amp circuit, a discrete transistor board
  and a delay IC.
- **`circuits/opamp-buffer.ts` fails.** Nine parts, one op-amp, four capacitors -
  the simplest circuit here and the shape the tool is built for - **failing in 2.9
  to 3.8 seconds.** This is the result that kills "passive EQ" and "old circuit"
  as the explanation.
- **The degree sweep, on an ACTIVE circuit** - one TL072 follower plus N rail
  capacitors, N the only variable: **max net degree <= 4 routes 12/12; max net
  degree >= 5 routes 17/44.**
- **The control separating degree from part count:** the same follower with
  capacitors in a **series chain**, every net at degree <= 3, routed **15/15 at 15
  parts**; 15 parts with one degree-15 net routed **1/5**.
- **`pt2399-core` failed 0/3, identically to the passive Pultec.**
- **Every circuit in `circuits/` exceeds degree 4 on at least one net**, and every
  one has a **ground net of degree 6 or more**: `opamp-buffer` 6, `preamp-lab` 12,
  `pt2399-core` 12, `optical-compressor` 17.

**AND THE HALF THAT MAKES THIS A CONSTRAINT RATHER THAN A WALL: a mature engine
does not fail at it.** ELK, through `netlistsvg`'s analog skin, drew **14
capacitors in parallel in 0.17 s, byte-identical across 30 runs, with zero
crossings between different nets** - the exact probe `schematizer` never once
drew, and ten such probes succeeded 10/10. **Read the degree threshold as a
property of one router, not of the problem.** An entry that recorded only the
failures would be bait: it would read as "high-degree nets are unsolved" and send
someone to build what already exists.

**What this corrected, which is the reason it is in the register.** The
agent-authored-boards spec's two-track section said the axis was *probably*
topological with a measurement in flight, and carried the owner's framing -
*"modern circuit topologies"* versus *"20th-century designs"* - as the axis. **The
chronological framing is dead**: a delay IC and a nine-part op-amp buffer fail
exactly as a 1950s passive EQ does. The spec was corrected at `e619029` and keeps
his framing visible as superseded, because **the architecture he proposed is right
and only the axis he named it by was wrong.**

**One thing this does NOT establish, recorded undiagnosed.** **Where** in
`schematizer.engine.route` the degree threshold bites was not traced, and the
sweep is **non-monotonic** - N=8 routed 5/8 while N=5 routed 2/5. So "degree 5"
is a characterised threshold, not an explained one, and nothing here licenses
treating 4 as a hard boundary in a rule file.

- **Found** 2026-10-19, by the circuit-families prior-art pass,
  `docs/schematic/generation-prior-art-circuit-families.md` §1, §2, §3; the ELK
  half from `docs/schematic/generation-prior-art-third-pass.md` §3.4, §3.5.
- **Evidence** both documents' `[RAN]` marks, with per-run success counts and
  seconds-to-fail given per circuit and per sweep point, and the series-chain
  control as the check that **could have failed and did not** - had part count
  been the variable, 15 parts in a chain would not have routed 15/15.
- **Verified** **no - RELAYED.** This writer ran neither `schematizer` nor
  `netlistsvg`, and re-derived none of the counts. **What this writer did
  confirm** is the two repository-side facts in G88 and G89, which are from the
  same document and did reproduce - that raises confidence in the document, and
  it is not the same as having checked these numbers.
- **Why it is open** it is the measurement, not a defect; it stays because the
  spec now rests on it and because the superseded framing must remain legible to
  anyone reading the owner's words in it.
- **What would settle it** nothing settles a measurement; **what would CHANGE it**
  is tracing where the threshold bites, or re-running the sweep against a router
  that is not `schematizer`. **The claim that would be falsified** by a later
  measurement: that a general layout engine's success is a function of max net
  degree rather than of part count or circuit family. Test it the way this pass
  did - vary one and hold the other.

Open: blocked on something else
-------------------------------

### G9 - nine `pt2399-core` BOM lines are unchosen, and the lead span is blocked

One line was chosen deliberately (the 0.1uF disc capacitor, commit `05e62e0`).
Nine remain. Separately, a recorded lead span cannot be completed because **the
catalog schema has no lead-diameter or lead-length field** - so the span cannot
be stated without inventing a geometry, which `lib/kicad/lead-span.ts` refuses
by design.

- **Found** `2026-10-16-pultec-five-boards` and its predecessor.
- **Verified** yes for the schema gap.
- **Why it is open** the schema gap is a real blocker, not a deferral: the
  honest options are to extend the schema with evidence per field, or to leave
  the span unrecorded and let the refusal stand.
- **What would settle it** an owner decision on extending the catalog schema,
  then `part-researcher` on the nine lines.

### G70 - three IN-FORCE standards hold the layout requirements this project needs, and none of their normative text was obtained

| document | what is in hand | what reading it would settle |
| --- | --- | --- |
| **IPC-2612-2010** §6 Layout, §7 Net Naming, Table 3-2 Font Size Examples | cover, full contents, scope, purpose, classification and applicable-documents clauses, verbatim | §6.1 Connecting Lines, §6.2 Junctions, §6.5 Power and Ground, §6.6 Signal Paths, §7.3 Reserved Characters - the **in-force, electronics-specific** rules for the conventions this project most needs. It blocks any net-naming criterion outright (the reserved-character set is in §7.3), would settle **G72**, and would settle the contaminated sentence in **G69** |
| **IEC 61082-1:2014** clauses 5, 7, 11, 12 | cover, foreword, introduction, full contents, scope, normative references, verbatim | 7.1.1 flow of energy and signal, 7.1.3 connecting lines, 7.4.2 Layout, 7.4.5 supply circuits, 5.2 text orientation, 11 structured documentation, 12 **CAx conformance requirements** - this is the in-force layout standard and **only its clause and figure titles are in hand** |
| **ASME Y14.2-2014 (R2020)** | the scope statement only | the minimum lettering height |

**ONE DISTINCTION IN THAT TABLE MUST NOT BLUR.** Y14.2's number - and
IPC-2612 Table 3-2's - is **UNREAD, not unset.** It exists, it is citable, and it
is behind a paywall. That is a different thing from **G71**, where no source
anywhere states a number. **An unread threshold must be read; an unset one is a
decision.** Conflating them is how a chosen number passes as a cited one.

**Two smaller sources also unread, named so nobody assumes they were consulted:**

- **`klc.kicad.org` returned HTTP 403**, so the KiCad Library Convention rule
  numbers and its exact values for pin length, field placement and text sizes are
  absent from the research. The 50 mil grid and the 50 mil field text size came
  from KiCad's Schematic Editor documentation instead.
- **IPC-2611**, which IPC-2612's own classification clause makes normative
  (*"Classification of Schematic and logic diagrams shall meet the requirements of
  IPC-2611"*), is **unexamined**. It governs grades and completeness modes and may
  carry further presentation requirements.

About a dozen candidate criteria in the readability research are marked *title
only* because of this entry, and **G69**'s rule binds every one of them: a title
establishes that a standard rules on a topic, never what it requires.

- **Found** 2026-10-19, by the standards research pass committed at `51f8362`
  (§1.4, §1.6, §7.1, §7.6), read in full by this writer.
- **Evidence** §7.1's table of what was and was not obtained, each row naming the
  free preview or front-matter PDF it came from; the HTTP 403 recorded in §7.6.
- **Verified** **no - RELAYED.** What is in hand and what is not is the research
  agent's own account of its fetches; this writer did not attempt any of them.
  The documents themselves are not in this repository.
- **Why it is open** procurement, not research. These are paid standards and KLC
  is a fetch that was refused; no amount of further searching substitutes for
  buying or borrowing them.
- **What would settle it** **CRITERION:** for every criterion sourced to
  IPC-2612, IEC 61082-1 or ASME Y14.2, the clause text was read by whoever wrote
  the criterion - and until then the criterion is recorded as *title only* rather
  than stated. **MECHANISM, untried:** obtain the three standards, IPC-2612 §6
  first because it is the in-force electronics-specific one and settles the most;
  and fetch KLC by a route that is not refused. Whether this repository spends on
  standards is an owner decision and **nobody has put it to him.**

### G123 - `render/symbolSelfText.test.ts` is import-clean and still cannot be PORTED: its fixture leaks a mkdtemp directory outright, and **G122**'s per-file exemption does not fit that shape. A hand-written equivalent now covers the module; what is open is the byte-check the port would have given

Task 5 ported `render/symbolSelfText.ts` and added its test to the manifest. The
test is import-clean - `node:fs`/`os`/`path`, `createResolver` from the ported
`render/library.ts`, and the module under test - and it builds its own symbol
library in a temp directory rather than needing a fixture circuit, so unlike
every other clearance test it does not wait on Task 7. It ran, and the FULL
suite then failed on `tests/stripboard/temp-scratch.test.ts`.

**It is a different and worse case than G122.** `render/library.test.ts` does
remove its directories, through a `tempDirs` array the static regex cannot
follow, which is why `REMOVES_VIA_OWN_LIST` could exempt it from ONE regex while
the `still removes` test kept the teeth. `symbolSelfText.test.ts` removes
nothing at all: `lib()` does `fs.mkdtempSync(path.join(os.tmpdir(),
"symtext-"))` and returns the file path, and it is called twice (once per
`describe`), so a run leaks two directories. There is no exemption shape that
fits without weakening the guard, and the guard exists because on 2026-10-13
`TMPDIR` held over 60,000 directories and the owner's disk filled.

**Adding cleanup is content a `cuts` entry cannot supply** - `cuts` are
deletion-only - so under Controller ruling R4 the entry was removed from the
manifest and the file deleted from the tree in the same change that added it,
rather than landing a known-red HEAD.

- **Found** 2026-10-19, Task 5, Step 1, as a full-suite failure after porting
  the test.
- **Evidence** `SCHGEN_SOURCE=... bun test` with the file in the tree: **2660
  pass / 1 fail across 261 files**, the failure being
  `tests/stripboard/temp-scratch.test.ts`'s *"every mkdtemp site under tests/
  either removes its own directory or registers it"* with
  `[ "schgen/render/symbol-self-text.test.ts: \"dir\" is never removed" ]`
  against an expected `[]`. Read directly, not relayed. After removing the
  manifest entry and the file: `bun test tests/schgen tests/stripboard/temp-scratch.test.ts`
  gives **155 pass / 0 fail across 20 files**.
  `grep -n "mkdtempSync" $SCHGEN_SOURCE/render/symbolSelfText.test.ts` shows the
  one site and `grep -c "rmSync" ` that file shows none.

  **For the round-2 discharge:**
  `bun test tests/schgen tests/stripboard/temp-scratch.test.ts` gives **172
  pass / 0 fail across 22 files** with the hand-written test in the tree, and
  the hand-written file alone gives **9 pass / 0 fail**. That `TMPDIR` is left
  as found was measured rather than assumed: counting `schgen-symtext-`
  entries under `TMPDIR` before the run gives 0, and after the run gives 0.
- **Verified** CONFIRMED - this writer ran every command above and read the
  full output, including the before-and-after `TMPDIR` count.
- **Why it is open** **the COST is discharged and the PORT is not.** What this
  entry was really about is that `symbolTextOverlaps` and
  `placedSymbolTextOverlaps` were ported and exercised by nothing, so three
  cells of the obstacle matrix
  (`pin-number`/`pin-number`, `pin-number`/`pin-name`,
  `pin-name`/`pin-name`, in `lib/schgen/render/obstacle-pairs-pin-text.ts`)
  named a function no test ran. **At round 2 a hand-written
  `tests/schgen/render/symbol-self-text.test.ts` closed that**, transcribing
  every fixture and expectation from the pedals test and taking its temp
  directory from `freshTempScratch` with `afterAll(cleanUpTempScratch)`: 9
  tests, `TMPDIR` left as found, the static guard green, no upstream edit, no
  guard change and no ported byte touched. What remains open is narrower and
  real: **that file is hand-written, so `tests/schgen/port-fidelity.test.ts`
  does not byte-check it**, and if the pedals source's expectations change
  nothing here notices. That is the residual, and it is the price of the
  mechanism taken.
- **ROUND 2 CORRECTION: THIS ENTRY'S CRITERION WROTE ITS OWN MECHANISM INTO
  ITSELF, AND THAT IS THE G52 SHAPE.** Round 1's criterion read *"exists in the
  tree, **is ported (not hand-written)**, runs to completion…"*. The "is
  ported" clause is not what anybody needs from this code; it made an upstream
  edit the only admissible route **by construction rather than by necessity**,
  and it is why round 1 concluded the fix had to leave this repository and
  therefore needed an owner decision. It did not. The criterion below is the
  split one.
- **What would settle it** **CRITERION:** `symbolTextOverlaps` and
  `placedSymbolTextOverlaps` are exercised by a test that runs to completion,
  and `TMPDIR` is left as it was found, with
  `tests/stripboard/temp-scratch.test.ts` green and no new exemption entry.
  **MET at round 2 by mechanism (b).** The remaining criterion, which keeps
  this entry open: the test that exercises them is byte-checked against the
  pedals source, so a drift in its expectations fails here rather than passing
  silently.

  **MECHANISM (a), untried, and it leaves this repository:** change
  `digital-pedal-platform`'s `tools/schgen/render/symbolSelfText.test.ts` to
  remove its directory (an `afterAll`, or the `tempDirs` shape
  `render/library.test.ts` already uses and G122 already exempts) and re-run
  `tools/schgen/port.ts`, then re-add
  `{ "from": "render/symbolSelfText.test.ts", "to": "tests/schgen/render/symbol-self-text.test.ts" }`
  with no `cuts` - **deleting the hand-written file in the same change**, since
  two files cannot hold that path. `lib/schgen/README.md` sanctions the route -
  *"the pedals source changes … and `port.ts` runs again"* - but it is an edit
  to another repository and **nobody has asked the owner whether that is
  wanted**, so it stays a decision. It is the only mechanism that meets the
  remaining half of the criterion.

  **MECHANISM (b), TAKEN at round 2: a hand-written equivalent test.**
  `tests/schgen/port-fidelity.test.ts` blesses the shape - a hand-written test
  under `tests/schgen/` is discovered by `bun test`'s glob and needs no
  `handWritten` declaration - and `tests/schgen/render/obstacle-matrix.test.ts`
  and `stock-symbols.test.ts` are both already that shape. Its file header
  names the pedals source as the authority for every assertion, because an
  agent writing a test may not decide what its subject should do.

  **THE MECHANISMS RULED OUT, recorded so nobody re-derives them.** A new
  exemption category in `tests/stripboard/temp-scratch.test.ts` for a genuine
  leak weakens the guard that followed a full disk. Hand-editing the ported
  file breaks `port-fidelity.test.ts`. A wrapper module, a sidecar `afterAll`
  in another file, and a `bunfig` preload all fail for one reason: **the guard
  is a static scan of each file's OWN bytes** for a `mkdtempSync` site whose
  identifier is not passed to `rmSync`, so nothing outside the offending file
  can satisfy it.

### G150 - measured: 31 nets across two of the four parity circuits are not UPPER_SNAKE, so nothing can turn them into KiCad labels without a rule nobody has written - a SIXTH invention beyond G99's five

`NET_NAME` in `lib/schgen/ir/types.ts` is `/^[A-Z0-9][A-Z0-9_]*$/` and
`ir/validate.ts`'s `netNames` rule refuses anything else. The circuit models do
not meet it:

| circuit | nets | not UPPER_SNAKE | examples |
| --- | --- | --- | --- |
| `opamp-buffer` | 7 | **0** | |
| `optical-compressor` | 22 | **14** | `+9V_RAW`, `+9V_PROTECTED` (leading `+`); `audio_BUF_OUT`, `sidechain_Q_COLLECTOR` (the `include()` prefix is lower case) |
| `pt2399-core` | 21 | **17** | `+5V`; `Net-(U1-LPF1-IN)` and ten more like it; `unconnected-(U1-CLK_O-Pad5)` |
| `transistor-preamp` | 18 | **0** | |

**NEITHER CAUSE IS AN ACCIDENT AND BOTH ARE LOAD-BEARING WHERE THEY ARE.**
`includeNetwork` writes `${prefix}_${net}` and the prefixes are the lower-case
block names `circuits/optical-compressor/index.ts` composes with; renaming them
would change what `include()` means. `pt2399-core`'s names are transcribed
verbatim from the netlist of a unit that was built and works, and that file says
so: *"Net names are copied verbatim from the netlist, including KiCad's
auto-generated 'Net-(...)' names"*, because the transcription is the authority
for the board.

**WHY IT IS AN INVENTION AND NOT ONLY A VALIDATION FAILURE.** A generated
schematic carries net names as global labels and power-symbol values. Something
between a `Network` and a `.kicad_sch` therefore has to decide what
`Net-(U1-LPF1-IN)` is called on the sheet - and a renaming is not cosmetic,
because the round-trip check spec §2 names (*"export a netlist from the
generated `.kicad_sch` with `kicad-cli` and compare it against the section
network"*) compares net names. **Task 9 invents nothing: `circuitSpecFrom`
passes every net name through verbatim**, which is why this is recorded rather
than fixed.

- **Found** 2026-10-20, Task 9, while measuring the four circuits.
- **Evidence** `netsNotUpperSnake` in `lib/schgen/authoring.ts`, which tested
  every net of a `Network` against the IR's own `NET_NAME` and was printed per
  circuit by `bun tools/schgen/authoring-census.ts` (the figures above are that
  output on 2026-10-20). A check that could have failed: two of the four
  circuits reported 0, so the function was not simply reporting everything.
  **THAT FUNCTION AND ITS CENSUS LINE ARE DELETED, by Task 3 on 2026-10-23, with
  the rule they measured** - *"supersede means delete"*, and the figures above
  are therefore a 2026-10-20 reading that nothing in the tree now reproduces.
  **What re-derives, and it is a different and smaller number:**
  `tools/schgen/label-syntax/probe.ts` carries the pre-Task-3 casing regex as a
  frozen constant and reports **20 labelled nets** failing it across the eleven
  BOARDS (`probe-run.log`); the 31 above is over the four PARITY CIRCUITS and
  counts every net, labelled or not. Do not read one as a correction of the
  other.
- **Verified** CONFIRMED - this writer wrote the measurement, ran it, and read
  the full list of 31 names.
- **Why it is open** it is a real gap in the chain and it is nobody's in the
  current plan: Task 9 declares what a backend needs and net naming is not in
  its brief; the task that writes a `.kicad_sch` is the one that cannot avoid
  it. **G102 is why this entry matters beyond its own content**: it warned that
  G99's list of five inventions was a lower bound because the check behind it
  had a blind spot, and this is the sixth.
- **What would settle it** **CRITERION: every net of a circuit that reaches a
  generated sheet carries a name the IR accepts, and the mapping from the
  model's name to that name is stated once and is reversible** - reversible
  because spec §2's round trip compares the exported netlist against the model.
  **MECHANISMS, untried, and they disagree:** normalise in the generator
  (cheap, and breaks the round trip unless the comparison normalises too);
  declare a per-circuit rename map in the authoring file (explicit, and 31 more
  lines to keep correct); or relax `NET_NAME` (which would admit a name KiCad
  itself quotes differently, and nobody has checked what KiCad does with
  `Net-(U1-REF)` as a global label). The criterion is what binds.

> **THE OWNER KILLED THE CASE DEMAND, 2026-10-23. His words, verbatim:**
>
> > *"i absolutely do not care about the letter case of net names. That's a silly
> > quibble."*
>
> **THIS IS THE THIRD TIME THIS REPOSITORY HAS ACCEPTED A TOOL'S DEMAND AND
> ARGUED ABOUT HOW TO SATISFY IT RATHER THAN ASKING WHETHER THE DEMAND WAS
> RIGHT**, and all three were caught by him rather than by any agent or review.
> The first two are the BOM gate (**G245**) and the over-long `Value` label.
> **This entry is the worked example in its purest form:** it measured the
> violation precisely, counted 31 nets, and offered three mechanisms for
> *complying* - normalise, rename, or relax - **without once asking what the rule
> was for.** `lib/schgen/ir/validate.ts:49` states no reason, and there is none
> to state: **letter case carries no information a schematic needs.**
>
> **WHAT IT SETTLES.** The case half of `NET_NAME` goes. `hi_boost_out`, `in` and
> `j15_p1` are valid net names and nothing may refuse a drawing for their case.
>
> **WHAT IT DOES NOT SETTLE, AND THE RULE HID THIS BEHIND THE QUIBBLE.** The same
> regex rejected two different things with one message. `hi_boost_out` fails on
> **case alone**, and case is the silly part. **`Net-(C10-Pad1)` fails on case AND
> on parentheses and hyphens**, which is not a case question at all - it is
> whether those characters are legal in a KiCad global label and how the
> s-expression writer must quote them. **This entry already flagged that nobody
> had checked**, in the relax mechanism above: *"nobody has checked what KiCad
> does with `Net-(U1-REF)` as a global label."* That question survives his
> decision untouched, and it is **a measurement rather than a decision** - drive
> `kicad-cli` against a label carrying those characters and read what comes back.
> **So the silly quibble was hiding a real question, which is the specific cost
> of conflating two demands in one rule.**
>
> **AND IT UNBLOCKS NO BOARD ON ITS OWN.** `[RAN]` **G274** clause (2) and
> re-driven 2026-10-23: each of the six boards refused at `validateCircuit`
> carries its net-name violations **plus exactly one other problem** -
> `pt2399-core` a single-pin net, and each of the five Pultec boards **a switch
> mounting pin neither on a net nor declared not-connected.** Removing the case
> demand leaves six boards still refusing, on one thing each.
>
> **THOSE TWO REMAINING DEMANDS ARE NOT OF THE SAME CHARACTER, which is why they
> are not assumed to fall with this one.** A case rule asks a circuit to conform
> to a convention that carries no information. *"Declare the pin not connected"*
> asks the author to **say that they meant to leave it floating**, which is
> information the drawing and the netlist both use. The second is defensible in a
> way the first is not, and the cheap honest path is probably to make the six
> declarations rather than to argue - but **that is not his decision and is not
> taken here.**
>
> - **Found** 2026-10-23, from the owner, on being shown that six of eleven
>   boards never reach geometry. Recorded verbatim per `CLAUDE.md`.
> - **Evidence** `[OWNER]` his words above. The six-boards-plus-one-problem
>   figure is `[RAN]` and re-driven; the rule's lack of a stated reason is
>   `[READ]` at `lib/schgen/ir/validate.ts:49`.
> - **Verified** **CONFIRMED** as his words and for the re-driven census. **The
>   third-instance claim and the conflation argument are this writer's.**
> - **Why it is open** because the rule is still in the code, the punctuation
>   question is unmeasured, and the six boards still refuse.
> - **What would settle it** **CRITERION, REPLACING THE ONE ABOVE: no circuit is
>   refused for the CASE of a net name, and what KiCad does with a label carrying
>   parentheses and hyphens is measured rather than guessed.** The old criterion
>   asked that every net reaching a label satisfy a rule somebody writes; he has
>   said the case part of that rule is not to exist. **MECHANISM: none offered.
>   A written design he reviews**, and note that `partShapes` in the same file
>   carries a separate UPPER_SNAKE demand on part labels which **his decision does
>   not mention and which this entry does not extend it to.**
>
> **DONE, 2026-10-23, TASK 3 - AND THE ENTRY STAYS OPEN, because what it is open
> ON has changed.** The case demand is out of the code. `lib/schgen/ir/validate.ts`'s
> `netNames` rule is **deleted** and `DRAWING_RULES` is ten rules **- WHICH WAS
> TRUE OF ROUND 0 ONLY AND IS NOT TRUE OF HEAD.** `ten` is replaced rather than
> annotated because a reader counting the list today gets a different number:
> fix round 1 RESTORED `netNames` with a narrowed predicate on the coordinator's
> reversal (*"The owner removed the CASING demand, not all net-name
> validation."*), so **`DRAWING_RULES` is ELEVEN rules at HEAD** - `[RAN,
> CONFIRMED]` 2026-10-24, counted off `lib/schgen/ir/validate.ts:236`:
> `netNames, partShapes, pinsDeclared, unitsPlaced, sheetsAndBlocks, renderings,
> singlePinNets, rails, pinSemantics, sheetFiles, mechanicalPads`, which is
> `tools/schgen/port-manifest.json:739`'s figure and the twelve ported rules less
> `bomFields`. The restore is recorded in a later bullet of this entry; the figure
> in THIS block was not corrected with it, and that is what is fixed here.
> `NET_NAME` in
> `lib/schgen/ir/types.ts` is `/^[^\u0000-\u001f]+$/` - non-empty, no control
> character - and no longer mentions case; the census helper this entry cited is
> deleted with the measurement it served; `tests/schgen/ir/validate.test.ts`'s V1
> and two assertions in ported test files go with the rule, the latter as declared
> `cuts` so both files stay byte-checked against the pedals source.
>
> **WHAT IT MEASURABLY BOUGHT, re-driven rather than asserted.** `[RAN]`
> `bun tools/schgen/board-sheets.ts`, before and after, same command, same
> machine, 2026-10-23:
>
> | | before | after |
> | --- | --- | --- |
> | boards producing a schematic | **0 of 11** | **0 of 11** |
> | `pt2399-core`'s refusals | **18** (17 net names + 1 single-pin net) | **1** (the single-pin net) |
> | each Pultec board's NET-NAME refusals | **13 to 27** | **0** |
> | each Pultec board's TOTAL refusals | **14 to 28**, per board **20, 14, 14, 14, 28** (**G259**, **G274** clause 2) | **1** (the undeclared switch pin) |
> | the five `transistor-preamp` boards | unchanged - ELK geometry, never net names | unchanged |
>
> **THE PULTEC ROW WAS ONE ROW READING `13 to 27` (net names + 1 undeclared pin)
> AND IS NOW TWO, because the parenthetical changed the UNIT without saying so**
> (false-greens mechanism 25). `13 to 27` counts net-name violations only; the
> per-board TOTALS are `20, 14, 14, 14, 28`, which is what **G259**'s scoreboard
> and **G274** clause 2 publish, and the two figures are reconcilable only by a
> reader who notices the shift. Both units are now stated, so neither has to be
> inferred.
>
> **SO THE OUTCOME IS "six boards now refuse on ONE problem each", NOT "six
> boards fixed"** - **and `six` is the 2026-10-23 reading, kept as a dated column:
> it is FIVE from 2026-10-24, because `pt2399-core` stopped refusing and
> generates (**G285**). The distinction is the one **G274** exists to protect: the
> census names the FIRST refusing problem per board, so a board with one problem
> left may still have another behind it. On the parity set the same deletion took
> `optical-compressor` from 14 drawing refusals to **0** and `pt2399-core` from 18
> to **1**, re-pinned in `tests/schgen/authoring-complete.test.ts`.
>
> **WHAT THE PUNCTUATION HALF OF THIS ENTRY TURNED OUT TO BE.** This entry's
> relax mechanism warned that *"nobody has checked what KiCad does with
> `Net-(U1-REF)` as a global label"*. Somebody has: **G277**. `kicad-cli` 10.0.5
> parses `Net-(C10-Pad1)` and `unconnected-(U1-CLK_O-Pad5)`, round-trips both
> byte-identical and renders both, and `quoteString` escapes nothing for them -
> **and the boundary census is zero**, so no board would draw such a label today
> anyway. **Punctuation needed no rule and none was written.**
>
> **WHAT REPLACED THE CASE HALF IS NOT NOTHING, and the reason is not the obvious
> one.** The same run drove six CONTROL arms: a tab is accepted **verbatim**, a
> newline fails at exit 3, and a **carriage return and a NUL both export at exit
> 0, draw a label, and come back as a DIFFERENT net name** (`RAWCR`, and `RAW`
> truncated). So *"a control character breaks a net name"* is false; the hazard is
> that two of them **silently rename the net**, and that is the reason `NET_NAME`
> still refuses the class.
>
> - **Found** 2026-10-23, Task 3, implementing the owner's decision above.
> - **Evidence** `[RAN]` the board census before and after, output in both
>   directions; `[RAN]` `SCHGEN_SOURCE=... bun test` green across the change;
>   `[READ]` `DRAWING_RULES` at HEAD. The control-arm and punctuation figures are
>   **RELAYED** from **G277**'s committed probe log and were not re-driven here.
> - **Verified** **CONFIRMED** for everything this writer changed and ran;
>   **RELAYED** for the `kicad-cli` measurements.
> - **Why it is STILL open** three things outlive the decision. **(1)** **FIVE**
>   boards still refuse, on one problem each - the five Pultec, which are Task 4's
>   and Task 5's ground. The figure here read `six` and is **replaced rather than
>   annotated**: `pt2399-core` was the sixth and generates as of 2026-10-24, which
>   Task 6's block at the end of this entry re-drives. **(2)** The
>   deletion of the WHOLE rule in round 0 relocated the control-character refusal for an
>   IR net name to emit time and took with it the refusal-count tripwire against a
>   generator renaming nets. **Both were closed in round 1 and the entry that held
>   them is deleted:** `netNames` is back in `lib/schgen/ir/validate.ts`, narrowed to
>   non-empty and control-character-free and refusing by name before any geometry; and
>   `tests/schgen/ir/net-name.test.ts` compares the model's net set against the IR's
>   over all 13 declared cases, which states this entry's surviving *"stated once and
>   is reversible"* concern directly rather than through a refusal count. That concern
>   was never about letter case, which is why it outlived his decision. **(3)** `partShapes` in the same file still demands
>   UPPER_SNAKE of part LABELS; his decision names net names and nothing here
>   extends it.
> - **What would settle it** **CRITERION, unchanged from the one his decision
>   installed and now half met: no circuit is refused for the CASE of a net name
>   (MET - re-drive the board census and read the refusals), and what KiCad does
>   with a label carrying parentheses and hyphens is measured rather than guessed
>   (MET - G277).** What remains is not this entry's: **G264** and the Pultec switch
>   pins for the **five** Pultec boards, which are Task 4's and Task 5's ground.
>   `six` stood here and is replaced rather than annotated, for the reason clause
>   (1) above gives.

> **THE CASE HALF OF THIS ENTRY'S CRITERION IS RE-DRIVEN AND MET BY READING, NOT BY COUNTING -
> 2026-10-24, TASK 6 OF THE NET-NAMES-AND-FLOATING-PINS PLAN.** The criterion above says *"no
> circuit is refused for the CASE of a net name (MET - re-drive the board census and read the
> refusals)"*, and it names the check rather than a number. `[RAN, CONFIRMED]`
> `SCHGEN_SOURCE=… bun tools/schgen/board-sheets.ts` at a clean tree and read all eleven refusal
> blocks in full: **not one of the eleven boards mentions a net name, a case, or `UPPER_SNAKE` in
> what refuses it.** The five Pultec boards name a switch pin; the five `transistor-preamp` boards
> name ELK geometry; `pt2399-core` names nothing, because it generates.
>
> **THE CONTROL, AND IT COULD HAVE ANSWERED DIFFERENTLY.** The five ELK refusals are not merely
> "still there" - they are the **same blocks at the same coordinates** as the readings taken before
> any of this plan's work, which is what rules out the net-name deletions having moved geometry
> somewhere nobody was looking. `transistor-preamp-lab` still refuses at
> `label BYPASS_JUMPED at (17.78, 3.81) overlaps label BYPASS_CAP at (12.7, 5.08)`, character for
> character what **G259**'s Task 24 amendment recorded on 2026-10-21; `-buffered` and `-staged`
> still touch `GND 0 at (31.75, 27.94)` against `VCC 1 at (31.75, 30.48)`; `-feedback` still
> branches `GND at (38.1, 44.45)` with no junction; `-loop` still overlaps `BUFFER_BASE at (29.21,
> 17.78)` with `BUFFER_EMITTER at (46.99, 19.05)`. **FIVE boards therefore act as a
> no-change control on a change that touched net naming repo-wide, across FOUR distinct refusal
> strings** - `-buffered` and `-staged` share one, which is what one expects of two boards whose
> `tp-stage` block is the same eight components.
>
> > **THE CITATION ABOVE WAS WRONG AND IS CORRECTED HERE, 2026-10-24, BY THE PLAN'S FINAL REVIEW.
> > The comparison holds - the reviewer re-drove all five strings and every one reproduces
> > character for character - but THREE OF THE FOUR BASELINES ARE NOT WHERE THIS BLOCK SAID THEY
> > ARE.** **G259**'s Task 24 amendment records coordinates for **`transistor-preamp-lab` only**;
> > the other four preamp boards appear in it as *"no declaration"*, because the nine declarations
> > landed later the same day. **Where each pre-plan baseline actually is, re-driven and confirmed
> > by the final reviewer and again by this writer:**
> >
> > | board | the pre-plan record |
> > | --- | --- |
> > | `-lab` | **G259**'s Task 24 amendment, as cited - correct |
> > | `-buffered`, `-staged` | **G263**, shape (1), `docs/known-gaps.md:2551` |
> > | `-feedback` | **G263**, shape (3), `docs/known-gaps.md:2585` |
> > | `-loop` | `tools/schgen/label-freedom/probe-run.log:399` - a COMMITTED probe log, and the ONLY pre-plan record of `BUFFER_BASE at (29.21, 17.78)` anywhere in this repository, in no register entry at all |
> >
> > **THIS IS FALSE-GREENS MECHANISM 27** - a check credited in the register with reach it does not
> > have - and the citation was written from where the writer expected the figures to be rather
> > than from where they are. **The result is sound and the paper trail was not.** A later agent
> > opening only the cited amendment would find four of the five boards marked *"no declaration"*,
> > no coordinates at all, and would be entitled to conclude the control was never driven - which
> > is how a sound result gets discarded. **Four** also stood where **FIVE** now stands above: four
> > is the count of distinct refusal STRINGS, five the count of BOARDS, and the unit was never said.
>
> **WHAT THIS DOES NOT DO, SAID BEFORE SOMEBODY INFERS IT.** It does not close this entry.
> `partShapes` in `lib/schgen/ir/validate.ts` still demands UPPER_SNAKE of part LABELS and the
> owner's decision names net names only, which is clause (3) above and is untouched.
>
> - **Found** 2026-10-24, Task 6, re-driving this entry's own named check.
> - **Evidence** `[RAN, CONFIRMED]` the committed census `tools/schgen/board-sheets.ts`, read in
>   full rather than summarised. `[READ]` the four pre-plan baselines named in the correction
>   block above: **G259**'s Task 24 amendment (`-lab` only), **G263** at `:2551` and `:2585`, and
>   `tools/schgen/label-freedom/probe-run.log:399`. **THIS BULLET ONCE CITED G259's Task 24
>   amendment ALONE for all four and that amendment cannot bear three of them**, which is the
>   correction above.
> - **Verified** **CONFIRMED** - this writer ran the census and read every refusal block, and
>   compared the four ELK coordinate strings against the committed earlier readings by eye,
>   character for character. **RELAYED, then CONFIRMED a second time:** the plan's final reviewer
>   re-drove all five strings independently and the 2026-10-24 fix dispatch located each baseline
>   in place before rewriting the citation.
> - **Why it is STILL open** clause (3) above, unchanged: the part-label casing demand.
> - **What would settle it** **unchanged, and Task 6 authored nothing.** The case half is MET by
>   this re-drive; the punctuation half is MET by **G277**; what is left is the part-label demand,
>   which needs the owner.

### G169 - OWNER DECISION, 2026-10-20: KiCad is a dependency, and no path may be unique to one machine

The owner, asked nothing and volunteering it:

> *"treat kicad as a dependency. But make sure there are no hardcoded paths
> unique to this machine. Paths should be configurable with sensible defaults"*

**This closes G119's open question**, which asked whether a vendored symbol's
bytes should be what a drawing reads so that a machine without KiCad could still
draw a wholly-vendored circuit. The answer is no: KiCad is a dependency, so the
consequence G119 recorded and flagged - *"a machine with no KiCad cannot draw at
all"* - is accepted rather than a cost to be engineered away. It is also what
`CLAUDE.md` already said (*"Treat KiCad the way you would a compiler: required,
and not something to engineer around"*), now confirmed by the owner directly
against a specific trade rather than inferred from a general sentence. **The
second half is new and is a requirement, not a confirmation.**

**What the second half binds, measured before the task that fixes it.** This
table is CORRECTED below (see "What Task 10b found that this table missed") -
it undercounted, and its row 7 misattributes a function to the wrong file:

| site | state |
| --- | --- |
| `make/board.mk:44` | `KICAD_CLI ?= /Applications/...`, exported - overridable, macOS-only default |
| `tools/pultec/schematic-sync.ts:92` | `DEFAULT_KICAD_CLI` behind `deps.kicadCli ?? …` - overridable, macOS-only default |
| `tests/circuits/kicad-round-trip.ts:31` | `process.env["KICAD_CLI"] ?? /Applications/...` |
| `tests/kicad/footprint-library.ts:28` | `process.env["KICAD_FOOTPRINTS"] ?? /Applications/...` |
| `tests/kicad/symbol-library-disk.ts:33` | `process.env["KICAD_SYMBOLS"] ?? /Applications/...` |
| `tests/guide/print-pdf.test.ts:30` | `process.env["HTML_TO_PDF"] ?? /Applications/Google Chrome...` |
| `lib/schgen/render/stock-symbols.ts` | **already correct**: `KICAD_SYMBOL_DIR`, then `dirname(KICAD_CLI)/../SharedSupport/symbols`, then `/usr/share/kicad/symbols` |

**So the defect is NOT that paths are unoverridable - every site but one takes
an override already.** It is three narrower things. (1) **The same macOS literal
is duplicated across five sites**, each with its own environment variable, so a
KiCad installed anywhere else needs several variables set and nothing tells a
reader which. (2) **Every default is macOS-only** except `stockSymbolDir()`,
which is the single place that already walks a candidate chain including a Linux
path - it is the pattern to generalise rather than a special case. (3) **The
symbol and footprint roots are written out by hand** instead of being derived
from one resolved install root, so they can disagree with the `kicad-cli` a run
actually uses.

- **Found** 2026-10-20. The owner's directive is verbatim above. The seven-site
  table is the controller's own measurement, by
  `grep -rn "/Applications/\|/Users/orion\|/opt/homebrew" --include="*.ts"
  --include="*.mk"` over the tree excluding `node_modules`, `.superpowers` and
  this file, then reading each hit's surrounding lines for an override.
- **Evidence** a check that could have failed: the grep returns **six** code
  sites plus prose, and reading each one shows five with an override and
  `tools/kicad/vendor-symbols.ts` carrying the path only in a doc comment
  (it takes the directory as an argument). Had any site hard-coded a path with
  no override, the table would say so.
- **Verified** CONFIRMED for the table and the counts, which this writer ran and
  read directly. The owner's words are quoted from the message that carried
  them.
- **Why it is open** the directive is recorded; the work it requires is not
  done. It is assigned to the task inserted after Task 10 and before Task 11,
  **deliberately before Task 11**, because Task 11 adds further `kicad-cli`
  call sites (`exportNetlist`, and gate 6's footprint resolution through
  `lib/kicad/libtable.ts`) and would otherwise widen the duplication this
  entry exists to remove. It also discharges **G121**'s point (b) - see below;
  **G121 itself is NOT deleted**, because this file's Task 4 record of
  `render/emit.kicad.test.ts` cites it by name for the `tsc`-error prediction
  it verified, and G117's own R10 ruling separately lists G121 among the
  entries that cite G117 - deleting it would leave both dangling. (a), its
  port-time-refusal clause, is still open and is Task 11's to pick up or not.

**WHAT TASK 10b (2026-10-20) FOUND THAT THIS TABLE MISSED, measured by
re-running the SAME grep this entry's "Evidence" line specifies.** It returns
**fourteen** hits outside `node_modules`, `.superpowers` and this file, not
"six code sites plus prose": the six in the table above, plus `make/board.mk:58`
(`HTML_TO_PDF ?= ...`, the same shape as `KICAD_CLI`'s line, four rows up in
the same file, simply not given its own row); plus FIVE lines of genuine prose
(`tools/guide/print-pdf.ts:57`'s advisory-message example,
`tools/kicad/vendor-symbols.ts:7`'s doc comment,
`circuits/pultec/physical/parts.ts:83,86`'s verification-command comment - two
lines - and `lib/kicad/lead-span-sources.ts:96`'s `DatasheetRef.documentId`, a
dated citation never compared to a resolved path by any test); plus TWO sites
this table does not mention AT ALL:

1. **`lib/kicad/netlist.ts:33`'s own `KICAD_CLI` definition** - the literal
   row 7 actually derives from. Row 7 names `lib/schgen/render/stock-symbols.ts`
   as "already correct," but `stockSymbolDir()` is defined in
   `lib/schgen/render/library.ts` (confirmed:
   `grep -n "stockSymbolDir" lib/schgen/render/*.ts` - four hits, one the
   `export function stockSymbolDir()` definition in `library.ts`, the other
   three a comment, an import and a call site, all in `stock-symbols.ts`,
   none a second definition), and it derives its
   first candidate from `KICAD_CLI`, imported from `lib/kicad/netlist.ts`. THAT
   file's own default - `process.env["KICAD_CLI"] ?? "/Applications/KiCad/..."`
   - is a bare macOS literal, not "already correct," and is the sixth of the
   "five sites" item (1) above counts for this one literal (`make/board.mk`,
   `schematic-sync.ts`, `kicad-round-trip.ts`, `netlist.ts`, plus
   `stockSymbolDir()`'s own derived-from-it candidate make five derivations of
   one fact, by this writer's recount - G121's "four TypeScript sites" already
   said as much and this entry's table simply left `netlist.ts` out of its row
   count).
2. **`lib/kicad/pin-pattern-sources.ts:23`'s `LIBRARY_ROOT`** - absent from
   this table entirely, and NOT prose: it is a live, hand-written macOS literal
   (`process.env["KICAD_FOOTPRINTS"] ?? "/Applications/..."`, independent of
   `tests/kicad/footprint-library.ts`'s own copy of the same expression) that
   feeds `PinPattern.source.file` for all thirteen recorded footprints, and
   `tests/kicad/pin-pattern.test.ts` asserts that field equal to
   `readFootprintPads()`'s own file path, built from the OTHER copy. The two
   copies happened to be textually identical, which is the only reason that
   assertion has ever passed - a resolver that fixed `footprint-library.ts`'s
   copy without this one would have made that test fail on any machine where
   the two literals stopped agreeing, which a platform-aware resolver is
   exactly the kind of change that would do.

**WHAT TASK 10b DID.** `lib/kicad/install.ts` is the one resolver clause (a)
asks for: `defaultKicadCli(platform)` is a per-platform candidate list (darwin:
the existing literal; linux: `/usr/bin/kicad-cli`, justified because
`stockSymbolDir()`'s own `/usr/share/kicad/symbols` fallback only makes sense if
`kicad-cli` is under `/usr` too; win32: `C:\Program Files\KiCad\10.0\bin\kicad-cli.exe`,
pinned to the major.minor `lib/kicad/symbols/PROVENANCE.md` vendors against,
**UNVERIFIED - no Windows machine exercised it**), and `defaultSymbolDir`/
`defaultFootprintDir` DERIVE the two library roots from a resolved cli path
rather than naming them separately. `tools/guide/browser-install.ts` is the same
pattern for `HTML_TO_PDF`'s Chrome literal, which `tests/guide/print-pdf.test.ts`
also carried outside any override. Six call sites now read through these
resolvers instead of carrying their own literal: `lib/kicad/netlist.ts`
(`KICAD_CLI` itself), `tests/circuits/kicad-round-trip.ts`,
`tools/pultec/schematic-sync.ts`, `tests/kicad/footprint-library.ts`,
`tests/kicad/symbol-library-disk.ts`, `lib/kicad/pin-pattern-sources.ts`, and
`tests/guide/print-pdf.test.ts`.

**`lib/schgen/render/library.ts`'s `stockSymbolDir()` is NOT edited** - it is a
ported file (`tools/schgen/port-manifest.json`'s `files`) and is not declared in
`diverged[]`, so R18 forbids touching it. It keeps its own two literal
candidates verbatim. This is clause (a)'s one remaining gap: on Linux,
`stockSymbolDir()` is now correct anyway, because its own second candidate,
`/usr/share/kicad/symbols`, equals `lib/kicad/install.ts`'s Linux default too -
but on Windows neither of its two candidates matches a Windows install, and it
cannot gain a third without declaring the ported file diverged, which is out of
this task's scope. `tests/kicad/install.test.ts`'s
`"library.ts's stockSymbolDir() agrees with lib/kicad/install.ts's resolver on
this machine"` is the test the brief asked for in clause (a)'s place - it
compares the two implementations' OUTPUT on whatever machine runs it (CONFIRMED
passing on this one; the perturbation below shows it failing loudly, not
silently, when `KICAD_CLI` is pointed somewhere the agreement cannot hold) -
and it is not, and cannot be, a Windows proof, because `stockSymbolDir()` would
simply throw there with no Windows candidate to disagree about.

**TWO PERTURBATIONS, both run, both restored.**

Clause (b): `KICAD_SYMBOL_DIR=/nonexistent-perturbation-dir bun -e '...stockSymbolDir()...'`
threw `KICAD_SYMBOL_DIR=/nonexistent-perturbation-dir does not exist` - names the
variable, as required.

Clause (a): with `KICAD_CLI=/tmp/fake-kicad-install/bin/kicad-cli`,
`defaultSymbolDir(KICAD_CLI)` returned `/tmp/fake-kicad-install/SharedSupport/symbols`
(a path that does not exist, returned WITHOUT complaint, by design - see this
file's module comment on why it never throws) while `stockSymbolDir()` for the
same `KICAD_CLI` threw `KiCad stock symbol directory not found; set
KICAD_SYMBOL_DIR. Tried: /tmp/fake-kicad-install/SharedSupport/symbols,
/usr/share/kicad/symbols` - the two implementations diverge in BEHAVIOUR (one
returns silently, one refuses) under a `KICAD_CLI` that cannot resolve either
candidate, and `tests/kicad/install.test.ts`'s cross-check test fails (loudly,
via `stockSymbolDir()`'s own throw) under exactly this perturbation, which is
what makes it a check that could fail rather than a tautology. Both environment
variables were process-local to each command; `git status --porcelain` was
clean before and after.

**THE CLAUSE-(c) GREP, RE-RUN AFTER THE FIX**, same pattern as "Found" above:
ten hits, not zero. Two are `lib/kicad/install.ts:94` and
`tools/guide/browser-install.ts:38` - the resolvers' OWN darwin candidates,
which is where clause (a) says a literal is now allowed to live: ONE place,
justified, not several unexplained ones. Two are `make/board.mk:44,58` - the
sanctioned Make-cannot-import-TypeScript carve-out this entry's own mechanism
named, now held to the resolver by `tests/kicad/install.test.ts`. One is
`tests/kicad/install.test.ts:57` - a test assertion pinning the darwin
candidate, which is verification, not duplication. The remaining five are the
prose this entry already expected (`print-pdf.ts`'s advisory text,
`vendor-symbols.ts`'s and `parts.ts`'s doc comments,
`lib/kicad/lead-span-sources.ts:96`'s `DatasheetRef.documentId` - a dated
citation of what was read FROM, like `PROVENANCE.md`, never compared to a
resolved path by any test: `grep -n documentId lib/kicad/lead-span.ts
tests/kicad/*.test.ts` shows it used only in error-message interpolation and a
`.not.toBe("")` length check). **So clause (c) does not come back LITERALLY
prose-only** - the resolvers and the Makefile are code, not documentation - but
every surviving code hit is now one of exactly three sanctioned, explained
kinds (the resolver's own single candidate, the Makefile's tested carve-out, or
a test pinning one of the two), down from fourteen unexplained-duplicate hits.
That is this entry's own three clauses refining what "prose-only" has to mean
once a resolver exists at all - a resolver cannot have zero literals in it - and
is recorded here as the deviation CLAUDE.md asks for rather than a silent
redefinition.

- **What would settle it** **CRITERION, three clauses - STATUS as of Task 10b.**
  (a) **MET for every site except `lib/schgen/render/library.ts`'s
  `stockSymbolDir()` on Windows**, which cannot be fixed without declaring that
  ported file diverged (out of scope here); checked by
  `tests/kicad/install.test.ts`, which fails loudly rather than silently when
  it does not hold (demonstrated above). (b) **MET**: `lib/kicad/install.ts`
  and `tools/guide/browser-install.ts` are candidate lists covering macOS,
  Linux and Windows (the linux candidates are justified from this repository's
  own prior fallback literal; the win32 candidates are UNVERIFIED - no Windows
  machine exercised them, recorded here rather than silently assumed), and a
  failure to resolve an unrecognised platform refuses naming the variable
  (`tests/kicad/install.test.ts`'s two "refuses an unrecognised platform" tests).
  (c) **MET IN SUBSTANCE, refined in wording** - see the grep breakdown above.
  **MECHANISM, as implemented**: `lib/kicad/install.ts` and
  `tools/guide/browser-install.ts`, per-platform candidate lists, non-throwing
  at import time (several production modules - `lib/stripboard/board.ts` among
  them - reach `lib/kicad/pin-pattern-sources.ts` unconditionally, so a resolver
  used at module scope must not throw merely because KiCad is absent; the
  existing point-of-use refusals, unchanged, are what still throw and name the
  variable). `make/board.mk` keeps its `?=`/`export` shape exactly as this
  entry's mechanism said, checked against the resolver by
  `tests/kicad/install.test.ts` rather than shared.

### G183 - `elkjs`'s documented node entry point cannot construct an `ELK` under Bun, in every version from 0.9.3 to 0.12.0, and the reason is that Bun defines a global `self`

**THE FIRST RUNTIME DEPENDENCY THIS REPOSITORY HAS ADDED SINCE `eecircuit-engine`**, so what it is
and what it costs are recorded rather than left in `package.json`.

**WHAT WAS PINNED, AND WHY NOT THE LATEST.** `elkjs@0.9.3`, exactly (`bun add elkjs@0.9.3
--exact`). It is one of the two versions **G94** reproduced its crash on (*"elkjs 0.7.1 and 0.9.3
both raise"*), so Task 14's reproduction and G94's measurement are about the same build.
**The cost of that choice: 0.10.0, 0.10.1, 0.10.2, 0.11.0, 0.11.1 and 0.12.0 exist and none of
them has been evaluated here.** **Transitive cost: zero packages** - `elkjs` declares no runtime
dependencies, in 0.9.3 and in 0.12.0 alike. **On-disk cost: 7.7 MB in 12 files**, almost all of it
the GWT-compiled `lib/elk-worker.js` and `lib/elk-worker.min.js`. Licence **EPL-2.0**.

**STEP 1's PREMISE CHECK, AND IT FOUND NOTHING WRONG, WHICH IS WHY IT IS HERE.**
`elkjs@0.9.3` **does** ship `lib/elk-api.d.ts`, plus `lib/main.d.ts`, `lib/elk.bundled.d.ts` and
`lib/elk-worker.d.ts`, and `package.json` declares `"types": "lib/main"`. So no
`lib/schgen/elk/elkjs.d.ts` was written and no declaration file for an untyped dependency exists.
**And there is NO synchronous layout entry point**: the `ELK` interface's five members are
`layout`, `knownLayoutAlgorithms`, `knownLayoutOptions`, `knownLayoutCategories` and
`terminateWorker`, and every one but the last returns a `Promise`. `lib/elk-worker.min.js` exports
only its `FakeWorker` class. **So plan decision D2's premise holds and there is no deviation to
record** - which is the half of a premise check that gets forgotten.

**THE DEFECT.** `require("elkjs")` -> `lib/main.js` asks `lib/elk-worker.min.js` for its
`FakeWorker`, and that file chooses what to be with:

```js
if(typeof document===Yxe&&typeof self!==Yxe){var i=new h(self);self.onmessage=i.saveDispatch}
else if(typeof module!==Yxe&&module.exports){...module.exports={'default':j,Worker:j}}
```

(`Yxe` is `'undefined'`.) **Under Bun `typeof self` is `"object"` and `typeof document` is
`"undefined"`**, so the first branch wins: the module installs itself as a web worker, never
exports its class, and `main.js` then throws

```
TypeError: undefined is not a constructor (evaluating 'new _Worker(url)')
```

Importing that file directly also hangs, because it registers `self.onmessage` and runs
`gwtOnLoad`. **The branch is byte-identical in 0.9.3, 0.10.0, 0.11.0 and 0.12.0**, so no upgrade
fixes it.

**WHAT IS DONE INSTEAD, and it is `elkjs`'s own documented path rather than a workaround on the
library's internals.** `tools/schgen/elk/layout.ts` imports `ELK` from `elkjs/lib/elk-api.js` and
passes `workerUrl` plus a `workerFactory` that builds Bun's native `Worker`. Inside a real worker
`self` IS a worker scope, so the first branch above is the CORRECT one and the library works as
designed. The URL comes from `import.meta.resolve("elkjs/lib/elk-worker.min.js")` - owner ruling
**G169**: no path may be unique to one machine.

**No global is patched.** Deleting `globalThis.self` around the import would also work and was not
taken: it mutates a global for the lifetime of a module load, and a second library testing `self`
during that window would see the wrong answer.

- **Found** 2026-10-20, Task 12, Step 1, on the first attempt to construct an `ELK`.
- **Evidence** the four version tarballs' `lib/elk-worker.min.js`, each grepped for the branch and
  each identical; the `TypeError` above, run; `typeof self === "object"` printed under
  `bun run`; and the `ELK` interface read in `lib/elk-api.d.ts`. A check that could have failed:
  `tests/schgen/elk/layout.elk.test.ts`'s first test reads the installed package's own
  `version` and compares it against `ELK_BACKEND`, so the pinned version and the string a refusal
  prints cannot drift; and 25 further tests in that directory lay out real graphs through the
  worker, which fail outright if the construction regresses.
- **Verified** CONFIRMED - this writer ran every measurement above.
- **Why it is open** it is a defect in a dependency and in Bun's globals, neither of which this
  repository fixes. It is recorded because the fix is non-obvious, because the obvious upgrade does
  not help, and because a future `bun` or `elkjs` release could change it in either direction.
- **What would settle it** **CRITERION: an `ELK` constructs and lays a graph out under the
  repository's own runtime, and the construction is checked by a test that fails when it stops
  working.** That is met today. What is NOT settled is whether the pinned version is the right one:
  **MECHANISM, untried:** run the four later versions against `tests/schgen/elk/` and against
  **G94**'s three arms, which is Task 14's or Task 17's measurement and not this task's - and
  **a version bump is a change to a measured baseline, not a maintenance chore.**

### G207 - BOTH PACKINGS MEASURED, SIDE BY SIDE, WITH NO PREFERENCE EXPRESSED - and the first thing the numbers say is that no packing changes how much ink is on the page

**G165**'s criterion (b) - *"a sheet whose frames use a small fraction of the declared paper is
either reported or packed better"* - **deliberately refuses to let an implementer decide what
"better packing" means**, because *"better" there is an acceptance criterion for an artifact an
agent produces*. That refusal binds Task 15. So: a second packer exists, both are measured, and
**the comparison stands undecided.**

`[RAN]` `packFramesWithElk` against `packFrames`, over the two sheets of the ported `mini` design
and over a probe of the five `transistor-preamp` blocks that draw:

| sheet | packer | extent (mm) | aspect | usable aspect | page use | extent fill | inter-frame span |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mini/power` A4, 4 frames | shelf | 185.42 x 38.10 | 4.87 | 1.85 | 17.8 % | 78.4 % | - (0 edges) |
| | elk | 109.22 x 71.12 | 1.54 | 1.85 | 19.5 % | 71.3 % | - (0 edges) |
| `mini/signal` A3, 7 frames | shelf | 358.14 x 55.88 | 6.41 | 1.69 | 21.7 % | 56.4 % | 820.42 mm / 8 edges |
| | elk | 245.11 x 127.00 | 1.93 | 1.69 | 33.8 % | 36.3 % | 656.59 mm / 8 edges |
| tp probe A3, 5 frames | shelf | 248.92 x 40.64 | 6.13 | 1.69 | 11.0 % | 91.4 % | 305.44 mm / 4 edges |
| | elk | 203.20 x 81.28 | 2.50 | 1.69 | 17.9 % | 56.0 % | 248.28 mm / 4 edges |

**THE INK IS IDENTICAL AND NO PACKING CAN CHANGE IT.** Frame area over usable area is 13.9 %,
12.3 % and 10.0 % on the three, **the same for both packers**, because `frameSize` is a property of
the blocks. **So G165's complaint that *"the page is mostly empty"* is only partly a packing
question**: the content occupies a tenth to a seventh of the usable area whatever is done with it,
and what a packer moves is the SHAPE of the region it occupies, the fraction of the page that
region spans, and the distance between connected frames.

**WHAT THE ELK PACKER IS PACKING TO.** The aspect ratio it is given is the paper's own usable area
(`elk.aspectRatio`), the spacings and the padding are `pack.ts`'s own `GAP`, `MARGIN` and
`TITLE_BLOCK`, and `elk.layered.wrapping.strategy = MULTI_EDGE` is what makes `layered` honour an
aspect ratio at all. **Why the unconstrained wrapping strategy is this writer's stated rule and not
a reviewed one**: a wrapped edge normally costs a long connector, and here an inter-frame edge is
**drawn as nothing** (**G208**), so a cut costs no ink and `SINGLE_EDGE`'s restriction would
constrain the wrap for a cost this drawing does not pay. A later reader may dispute it.

**THE TWO PAGES WERE LOOKED AT, and this paragraph is an OBSERVATION FOR THE RECORD and NOT AN
ACCEPTANCE** - §3.3 gives these measures no threshold and G165's criterion (b) is the owner's. Both
`mini` signal pages were exported with `kicad-cli` at 150 dpi and read. The shelf page is one row of
seven frames across the top fifth of an A3, read strictly left to right, input connector first and
output connector last, with four-fifths of the page blank. The ELK page is three bands cascading
down and right: the two frames with no inter-frame edge at all (the spare op-amp channel and the
op-amp supply) are pushed into the leftmost layer, **ahead of the input connector**, and the
crystal sits above the output connector rather than beside it. **This writer would rather read the
shelf page**, for a reason that is about reading order rather than area: a schematic sheet read as a
single left-to-right row needs no decision about where to look next, and the ELK page's first
column is two blocks that connect to nothing. **That is a preference, it is recorded as one, and it
is the owner's to accept or reject** - the brief for this task says in terms that a preference found
here *is the finding*.

- **Found** 2026-10-20, Task 15, Step 6.
- **Evidence** the table, computed by `packingMeasures` over both packings of each content list; two
  PDFs exported through `kicad-cli sch export pdf --theme schgen`, converted with
  `pdftoppm -r 150 -png` and read with the Read tool. A check that could have failed:
  `tests/schgen/elk/sheet-graph.test.ts`'s *"BOTH packings are measured and NEITHER is preferred
  here"* asserts the two extents DIFFER and the two ink figures AGREE, so a packer that silently
  returned the other's positions would fail it.
- **Verified** CONFIRMED - this writer ran both packers, exported, converted and read both pages.
**ROUND 2: THE ELK PACKING IS IN PRODUCTION WHILE THE QUESTION IS OPEN, AND THAT BELONGS IN THIS
ENTRY RATHER THAN ONLY IN A REPORT.** `generate` runs `sheetPackPrePass` -> `packSheet`, and the
selection rule - stated once, in `tools/schgen/elk/sheet-layout.ts`, and mandated by Task 15's
brief - sends any sheet with an inter-frame edge to ELK. **So `mini`'s signal sheet now emits as
the ELK page: the page this entry records a preference against.** That is not a rule violation -
the brief required the mechanical selection - but *"the shipped page changed shape to the one the
writer would rather not read, and nobody has ruled on (b)"* is exactly the state this entry
exists to carry, and round 1 left it in a report that `.superpowers/` gitignores.

- **Why it is open** G165's criterion (b) is unanswered and this entry does not answer it. It adds
  the numbers the decision needs and one reader's preference, both of which were missing. **And
  the decision now has a shipped artifact riding on it.**
- **What would settle it** **an OWNER DECISION**, which is what G165 says. The numbers above are
  what there is to decide on. **If the answer is "report it rather than pack it better", the
  change is one line in `packSheet` and the ELK packer stays as a measured alternative.**

### G217 - the readability-baseline registry ships EMPTY and no agent may fill it, and the twelve-field shape departs TWICE - one departure the spec predicted and one it did not

`schematic/readability-baselines.json` holds `"baselines": []` and seven design notes.
`grantedBy` is a whitelist of one - `owner` - and `lib/schgen/readability/baseline-read.ts` refuses
anything else by name, citing `CLAUDE.md`'s invariant: **an agent that could enter its own drawing's
numbers as the reference would be authoring the criterion outright**, which is the failure that file
describes as an agent building the intent from the artifact it had already produced and then
checking the artifact against it.

**THE EMPTY LIST IS THE CORRECT STATE AND NOT AN UNFINISHED ONE.** §3.3's acceptance table: a
circuit generated for the first time *"reports the measures with no pass or fail"*, and every
drawing this repository has produced is a first generation. **One refusal of
`tools/stripboard/approvals.ts` is therefore deliberately NOT carried across**: that loader refuses
an empty `approvals` list - *"a registry that approves nothing is a file that looks like governance
and governs nothing"* - which is right THERE, because an empty approvals file means the gate it
feeds can never open. The protection here is instead that **every consumer prints the count it
read**: `tools/schgen/verify.ts` puts `schematic/readability-baselines.json 0 baseline(s)` on every
`GateResult`, so a reader is told zero rather than left to assume there were some.

**DEPARTURE ONE, WHICH SPEC §3.3 PREDICTED:** *"an approval admits one termination, whereas a
baseline carries four measured numbers"*, so `admits` becomes `measures`. It carries **five**
numbers and not four, because §3.3's table reads *"bends: count, and per edge"* - one measure in two
units - and the loader refuses a sixth by name, since §3.3 refuses a composite score and an extra
figure recorded beside the four is how a composite arrives without anybody deciding to adopt one.

**DEPARTURE TWO, WHICH IT DID NOT PREDICT, AND IT COSTS SOMETHING.** An approval's `board` becomes
`circuit` AND `block`, because a baseline is per block and a block id is unique only within a
circuit. The twelfth field that makes room for the second of those is **`renderedFrom`, which is
deleted.** That field is load-bearing in the approvals registry: it is where *"WHAT HE LOOKED AT WAS
THE PICTURE AND NOT THESE BYTES"* is said in prose a reader can judge, with the picture-to-bytes
link recorded as an agent's claim rather than collapsed into a path that would imply he inspected
the bytes (**G27**(2)). **A baseline has nowhere to say it.** What he was shown has to go in `why`
or `note`, and no field obliges anyone to say it at all.

**THREE RESIDUALS, each stated here rather than discovered later.**

1. **`compareMeasures` has no production exercise, and that follows from the registry being empty.**
   Every lookup is `absent`, so nothing in the pipeline ever builds a comparison; the
   `comparable-hash-moved` arm and the four rows are driven by
   `tests/schgen/readability/baseline.test.ts` and by nothing else. That is a consequence of *no
   agent may populate it*, not a wiring defect, and it will stop being true the first time he grants
   one.
2. **`consultedBy` is unexercised for the same reason.** The approvals loader proves each cited
   consumer exists and `tests/stripboard/approvals.test.ts` proves it reaches the loader; here there
   is no entry to check, so the clause is code no record has driven.
3. **A change in the EDGE COUNT alone is invisible to `compareMeasures`.** Its four rows are §3.3's
   four measures, and `bendsPerEdge` is not a fifth row - the same bends spread over more or fewer
   polylines moves `renderMeasures`'s second number and no row of the comparison.

**AND THE LIMIT THE APPROVALS CHANNEL ALREADY RECORDS IS CARRIED, NOT PAPERED OVER: no file can
prove the owner said anything** (**G27**). The three readings refuse a record that quotes nothing, a
quote in the narrator's voice, and a quote in which nobody is speaking - **the same code**, now in
`lib/owner-words.ts` and called by both loaders - and **a fabricated plausible sentence passes all
three.** What the design buys instead is scope and visibility.

**ONE NARROWING RELATIVE TO THE APPROVALS LOADER, deliberate:** the SELECTION shape
(*"low-cut: part-walk-s1"*) is **not admitted here.** It was added to the approvals registry on
2026-10-17 by a controller ruling **after the voice reading refused a real reply of his**; no
equivalent case has arisen for a baseline, so admitting it would be widening an admission on no
evidence. The refusal nonetheless CALLS `isSelectionFor` and reports whether the quote would have
passed it, so the cost of the narrowing is measured rather than assumed.

- **Found** 2026-10-20, Task 16, Steps 3 and 5.
- **Evidence** `tests/schgen/readability/baseline.test.ts`, which drives a well-formed entry through
  the loader FIRST - a loader that threw on everything would satisfy every refusal - and then each
  refusal in turn. Three perturbations, applied and restored: dropping the `grantedBy` whitelist,
  the voice reading and the narration sweep each turn a named test red (P5, P6, P7). The two
  departures are read off `BASELINE_ENTRY_KEYS` against `APPROVAL_ENTRY_KEYS`, both in the tree.
- **Verified** CONFIRMED - this writer wrote both, ran the tests and drove the perturbations.
- **Why it is open** residual 2 in particular: a clause no record has driven is a clause whose first
  real use is its first test. And the `renderedFrom` loss is a real reduction in what a baseline can
  be held to.
- **What would settle it** **CRITERION for the `renderedFrom` loss: a reader of a granted baseline
  can tell what the owner actually looked at, and whether the link from that to the hashed bytes is
  a measurement or an agent's inference.** **MECHANISM, untried:** a thirteenth field, which would
  take this registry's shape off `render-approvals.json`'s twelve - so the alternative mechanism,
  also untried, is to require it in `why` and have the loader refuse a `why` that does not say what
  was shown. **The criterion is the settlement; neither mechanism has been tried.** For residuals 1
  and 2, **an owner decision is what settles them**, because both end the moment he grants a
  baseline - and nobody is to ask him for one unprompted.

### G225 - THE GENERATION PATH's REFUSAL SURFACE WIDENED INSIDE REPORT RENDERING: `generate` can now fail for a MEASUREMENT reason, attributed to the report rather than to a gate

`buildReport` calls `sheetMeasuresOf(d)` for every drawing (`lib/schgen/report.ts`), and
`sheetMeasuresOf` **throws** when `canonicalTopology` refuses the sheet's wires
(`lib/schgen/readability/measures.ts`): *"sheet `<id>`: the canonical topology of its wires was
refused (`<n>` ambiguous overlap(s)), so its four measures would be taken over a geometry with more
than one reading. It is refused rather than measured on one of them."* `buildReport` is called from
`generatedFiles`, which is called from `generate`. **So the path `generate` -> `generatedFiles` ->
`buildReport` -> `sheetMeasuresOf` can now refuse a generation for a reason that is a MEASUREMENT,
inside report rendering, and the message a user sees is attributed to the report rather than to any
gate.**

**THE REFUSAL ITSELF IS RIGHT AND IS NOT THE QUESTION.** Spec §1.4 revision 4 clause d is *refuse
rather than repair*: an ambiguous overlap has more than one reading and measuring one of them would
publish a number nobody can reproduce. **The question is whether its ATTRIBUTION is right** - a
geometry a generator will not certify arguably belongs to a geometric guard that says so as a gate,
not to the renderer of a diagnostics section - and that is an owner-visible design question rather
than a fix. **Nothing here moves or softens the throw.**

**REACHABILITY ON A REAL TEMPLATE-DRAWN SHEET IS NOT ESTABLISHED, which is why this is a recorded
observation rather than a defect.** `[RELAYED]` The Task 16 review DROVE the throw, with a
constructed cross-net collinear partial overlap, and got exactly the message above. It constructed
the case; nobody has produced one from a template. The two halves of why that is unresolved:

- An **ELK** block's wires are already canonicalised before they leave `adaptElkLayoutReported`
  (`lib/schgen/elk/adapt.ts`'s `pre` pass), and a block whose route is ambiguous is refused THERE,
  as an `invalidGeometry` mismatch naming the block - so an ELK sheet cannot carry an ambiguity into
  `sheetMeasuresOf`.
- A **template-drawn** block's wires are not canonicalised anywhere, and **G212** records that
  sheet-level geometry is not fully guarded: not one whole-sheet guard checks containment in a
  reference box, and the guards that do exist check pairwise straddling and clearance rather than
  collinear overlap across nets. **So nothing in the tree establishes that a template cannot draw
  the shape the review constructed.**

- **Found** 2026-10-20, by the Task 16 review; written up in fix round 1 under the review's
  instruction to record rather than change.
- **Evidence** the call chain read directly (`generatedFiles` line `add("RENDER-REPORT.md",
  renderReport(buildReport(...)))`, `buildReport`'s `drawings.map`, `sheetMeasuresOf`'s `if (!t.ok)
  throw`), and the review's own probe quoted above. **A check that could have failed:** the ELK half
  is a claim that could be false and was checked - `adapt.ts` returns `invalidGeometry` on
  `!pre.ok`, so the ambiguity is caught before a drawing exists, which is why the live corpus does
  not hit this throw.
- **Verified** CONFIRMED for the call chain and for the ELK pre-pass refusal - this writer read
  all four modules. **RELAYED for the probe**: the review constructed and ran it; this writer did
  not reproduce it.
- **Why it is open** because the attribution is a decision nobody has taken, and because a
  generation that fails inside RENDER-REPORT rendering reads, to whoever runs it, as a reporting
  bug rather than as a refusal about their drawing.
- **What would settle it** **CRITERION: a sheet whose wire topology has more than one reading is
  refused by something whose name says it is checking the geometry, and the message says which
  sheet and which overlap.** The second clause is already met; the first is not. **MECHANISMS, both
  untried:** canonicalise a template-drawn block's wires where an ELK block's are canonicalised, so
  the refusal lands on the block that drew it; or add the check to the whole-sheet guard
  neighbourhood (`assertSheetSafe`) and let `sheetMeasuresOf` assume a topology already proven
  unambiguous. **An owner decision about attribution is the other way this settles**, and it is not
  to be asked for unprompted.

### G245 - OWNER DECISION: the BOM requirement is a property of the CONSUMER of an artifact, so the drawing path stopped asking - and `transistor-preamp`'s blocker MOVED rather than cleared

**THE OWNER'S WORDS, VERBATIM, AND THEY ARE THE CRITERION.** He asked first:

> *"why does a schematic need bom-level specificity?"*

and then, when the answer came back that it does not:

> *"the gate you describe \*is\* important for pcb layout intended for outsourced
> manufacture-but a fully specified BOM isn't needed for schematics, stripboard
> layout, and, in many cases, tht pcbs."*

So: **the BOM requirement is a property of the CONSUMER of an artifact rather
than of the circuit.** It binds when a part has to be sourced and placed by
somebody else. **A schematic is never that artifact** - it is upstream of every
one of those decisions. **A stripboard layout built by hand is not either**, and
**a through-hole board the owner stuffs himself usually is not** - those are the
three cases he excluded, by name.

**WHAT WAS WRONG, AND WHERE.** `lib/schgen/ir/validate-parts.ts`'s `bomFields`
requires `Manufacturer`, `MPN`, `Supplier` and `SupplierPart` non-empty on every
part whose `refPrefix` is not `TP`, `H` or `FID`. `lib/schgen/ir/validate.ts`
had it in `validateCircuit`'s single `RULES` list, and
`tools/schgen/generate.ts` calls `validateCircuit` and throws on any problem
before it emits anything. **So four purchasing fields per part gated the
emission of a drawing**, and for one circuit that was the ONLY thing gating it:
`[RAN]` `bun tools/schgen/gate-census.ts` before the change reported
`transistor-preamp` at **101** gate-1 problems - 1 header and **100**
`bomFields` - with nothing else wrong with the circuit.

**THE FIX IS A COMPOSITION AND NOT A RULE CHANGE.** `validateCircuit` now runs
`DRAWING_RULES`, the eleven rules a drawing depends on; a new `validateSourcing`
runs `SOURCING_RULES`, which is `[bomFields]`. **`bomFields` itself is
untouched** - `validate-parts.ts` is still in the port's `files[]` and still
byte-checked, the four keys and `BOM_EXEMPT_PREFIXES` are unchanged, and no
flag, mode or widened exemption relaxes it in place. The split is a **declared
divergence** from the port (`tools/schgen/port-manifest.json`, `Task 20`, with
the upstream `sourceSha`), because a `cuts` entry is deletion-only and could not
carry the half of the ruling that has to survive: the consumer the rule still
binds for.

**WHY THE EARLIER DECISION DID NOT CATCH THIS, WHICH IS THE BETTER LESSON.**
`lib/schgen/authoring.ts`'s `BomSource` comment is an honest, well-reasoned
decision - **G149** - that weighed four options: declaring the fields per
component, blanking them with no declaration, widening `BOM_EXEMPT_PREFIXES`,
and writing plausible manufacturers and supplier part numbers. **All four accept
that a purchasing rule gates a drawing.** The option the owner's question raises
- that the gate is in the wrong PLACE - was not among them, and the plausible
reason is structural: `validate-parts.ts` is port-managed and its header says
*"Edit the pedals source and re-run the port rather than hand-editing this
file"*, so changing the rule was outside the frame the decision was made in.
**A port's edit rule can quietly bound what a decision is allowed to consider**,
and that is worth more than the fix.

**THE PORT'S EDIT RULE REINFORCED THE FRAME; IT DID NOT CAUSE IT. THE CAUSE IS
UPSTREAM OF IT, AND IT IS THE BRIEF** - controller ruling **R69**, which accepts
this diagnosis over its own and asks for the attribution recorded against the
brief rather than against the implementer who followed it. `[RAN]`
`docs/superpowers/plans/2026-10-19-schematic-authoring-m1.md`, Task 9 Step 4,
verbatim: *"**`BomFields` has no source in this model**: `BOM_EXEMPT_PREFIXES`
covers `TP`/`H`/`FID` and nothing else, so **either the authoring file declares
them or `bomFields` refuses** - do not default them to empty strings and do not
widen the exemption list silently. Decide, implement, and record which."*

Both branches of that *"either … or"* are about what the CIRCUIT supplies, and
the two things it forbids by name are the two ways of making the rule stop
asking. **So the move space was enumerated, the fifth option was not in it, and
an implementer obeying the brief exactly COULD NOT REACH *"the gate is in the
wrong place"* without stepping outside its instructions.** That brief is the
controller's, and R69 records the correction as landing there.

**THE GENERALISABLE FORM, in the ruling's own terms: a brief that offers a binary
and forbids the alternatives cannot be escaped by an obedient implementer.** The
more precisely a brief enumerates the options, the more completely it forecloses
the one nobody thought of - and an implementer following it faithfully will
produce the best of the LISTED answers and **never signal that the list was
wrong**. That is a cost of a well-specified brief rather than a defect in one,
and it is the inverse of the usual failure: here the instructions were good
enough to be followed exactly, and being followed exactly is what hid the
option.

**THE MECHANISM IS THE CONTROLLER'S AND IT IS UNTRIED, SO IT IS MARKED AS SUCH
AT ITS AUTHOR'S INSISTENCE: a brief that enumerates options should say what
QUESTION the options answer**, so an implementer can report that the question is
wrong rather than only choosing among answers. **There is no evidence that
works.** It asks an implementer to challenge its own brief, which is the
class of remedy this branch has watched fail: **a discipline stated, accepted,
and then broken by the author who had just stated it.** `[RAN]` three citations,
each from the entry itself rather than characterised: **G235** records that the
implementer put a pattern in a hand-back message and did not write it down *"one
message after writing G234, the entry about exactly that failure"*; **G236**
counts *"three instances in one task - four, counting the one inside the test
written to fix this third"*; **G237**'s own title is *"THE PATTERN THAT SURVIVED
FIVE ROUNDS OF FIXING"*. **Untried, and weak for a known reason** rather than
untried and promising.

**THE MEASUREMENT, PER CIRCUIT.** `[RAN]` a scratch script over
`circuitSpecFrom` + `buildCircuit`, calling both compositions:

| circuit | DRAWING problems (`validateCircuit`) | the classes | SOURCING problems (`validateSourcing`) |
| --- | --- | --- | --- |
| `opamp-buffer` | **3** | 3 `pinsDeclared` (**G151**) | **36** |
| `optical-compressor` | **14** | 14 `netNames` (**G150**) | **148** |
| `pt2399-core` | **18** | 17 `netNames`; 1 `singlePinNets` (**G159**) | **96** |
| `transistor-preamp` | **0** | - | **100** |

`[RAN]` `bun tools/schgen/gate-census.ts` after the change agrees, off by the
one `header` line each as **G178** explains: **4 / 15 / 19** for the first three.
The sourcing figures are **the same 36 / 148 / 96 / 100** the register and
`tests/schgen/authoring-complete.test.ts` carried as `bomFields` counts before
the split, which is the check that the rule still runs on all four circuits.

**AND THIS IS EXACTLY THE FIGURE G178's MECHANISM PREDICTED, BY A ROUTE IT DID
NOT CONSIDER.** That entry's untried mechanism was *"a `bom` entry in
`ComponentOverride` (or a per-circuit BOM beside the authoring declaration)
would drop the remaining refusals to **3 / 14 / 18 / 0**"*. Task 20 supplied no
BOM data at all and the drawing refusals are **3 / 14 / 18 / 0**. The entry also
said *"that would NOT by itself satisfy the criterion"*, and it was right -
see the next paragraph.

**WHAT THE TWO ROUTES AGREEING ACTUALLY ESTABLISHES, and it is evidence FOR the
owner's criterion that nobody set out to produce** (controller ruling, Task 20
review). **G178** predicted those four numbers for a route that SUPPLIES the
purchasing data; Task 20 reached them by a route that supplies none and asks for
none. Two independently-written predictions landing on one figure means **the BOM
demand was ORTHOGONAL to every other rule in the set** - not one of the 380
purchasing refusals was entangled with a net name, a no-connect or a single-pin
net, so satisfying the demand and withdrawing it are indistinguishable in the
arithmetic. **A purchasing requirement that shares nothing with any rule a
drawing depends on is a requirement a drawing does not depend on.** That is the
criterion restated as a measurement, and it is stronger than the argument that
preceded it because the figure was published before this task existed.

**GATE 8's FIRST RUN AGAINST A GENERATED DRAWING IS STILL NOT REACHABLE, AND
THE BLOCKER MOVED RATHER THAN CLEARING. THIS IS THE RESULT WORTH READING.**
`[RAN]` a scratch probe that builds each parity design exactly as
`tools/schgen/gate-census.ts`'s `parityDesign` does and calls `generate` with
`initLock: true` into a `mkdtemp` directory (the committed census forces
`initLock: false`, so it cannot get past the reference lock):

| circuit | where `generate` refuses now |
| --- | --- |
| `opamp-buffer` | validation: `part U1: pin 5 (+) is neither on a net nor declared not connected`, and two more |
| `optical-compressor` | validation: 14 net names, `"+9V_PROTECTED"` first |
| `pt2399-core` | validation: 17 net names and the one single-pin net, `"+5V"` first |
| `transistor-preamp` | **validates clean and refuses at LAYOUT**: `block tp-leg-emitter-bypass: ... JP5#1 (Jumper:Jumper_2_Open): no place for its Reference and Value` |

So for `transistor-preamp` the wall is now **one defect** - the field-placement
refusal **G232** records and **G238**'s block table already measured - instead
of four classes of authoring work. **Nothing here attempted it**: ruling R46
reserves **G232** as an owner-visible scope decision, and the brief for this
task says to report this rather than pursue it. **Gate 8 was NOT run**; the
reachability answer above is read off `generate`'s own refusal, which is the
thing that has to stop happening first.

**COLLATERAL DAMAGE FROM A CORRECT FIX: THE CENSUS BECAME LESS INFORMATIVE FOR
THE ONE CIRCUIT THIS CHANGE UNBLOCKED. PARKED UNDER RULING R68, AND IT IS
G235's PATTERN EXACTLY.** That entry names *a change whose PRIMARY effect is
correct and whose COLLATERAL effect is wrong, so a reviewer checking the changed
behaviour passes it* - and the changed behaviour here is right by every check
that was run.

**BEFORE this change**, `transistor-preamp`'s gate-1 census row reported **the
circuit's own validation refusal**: 1 header and 100 `bomFields`. **AFTER it**,
the row reports
`1 other: <tmpdir>/refs.lock.json not found; run pnpm schgen generate --init transistor-preamp.design.ts to create it`
- **a HARNESS artifact**, because `runGates` forces `initLock: false` so the
generation only reads and the reference lock the circuit needs is never created.
Two consequences, and the first is the dangerous one.

**THE ROW MUST NOT BE READ AS THE CIRCUIT'S STATE.** A reader comparing censuses
across this commit sees `transistor-preamp`'s gate-1 refusal **move from 101 to
1 rather than disappear**, and the obvious reading of a surviving refusal is that
the fix did not work. It did: the circuit has **0** `validateCircuit` problems,
which the probe table above drives directly and which
`tests/schgen/authoring-complete.test.ts` pins. **What the row now measures is
the census's own `initLock` choice**, and nothing in the row says so - which is
why it is said here and in `tools/schgen/gate-census.ts`'s header.

**AND THAT LINE IS NOW NON-DETERMINISTIC.** It carries an absolute `mkdtemp`
path, so it differs on every run where every other line of the census output is
stable. A census whose purpose is to be re-run and compared has one line that
never compares equal.

**NOTHING IS FIXED HERE AND NOTHING IS PRESCRIBED.** Changing `initLock` is a
change to `tools/schgen/verify.ts`'s contract rather than to the census, and it
would make a census run write a lock file; whether that is the right route is
not judged here. The criterion is below as (c).

**WHAT MUST SURVIVE TWO OPPOSITE FUTURE ERRORS.** `bomFields` is **not dead
code and must not be deleted**: it is correct and load-bearing for a consumer
that has to source and place parts, which is the case the owner named -
*"pcb layout intended for outsourced manufacture"*. **G241** on this branch is a
safeguard deleted precisely because no check could fail on it, and restored a
round later. Equally, **it must not be put back into `DRAWING_RULES` to make
validation uniform**: uniformity is what the ruling refuses, and the price is
measured above. `lib/schgen/ir/validate.ts`'s header states both, and
`tests/schgen/authoring-complete.test.ts` asserts that no BOM problem reaches
the drawing path.

**THE UPSTREAM OBSERVATION, FOR THE OWNER, NOT ACTED ON.** This decision is
about THIS repository. `digital-pedal-platform`'s generator may legitimately
require sourcing data before it emits, if what its output feeds is a board going
out for assembly - the divergence here is declared and does not ask upstream to
change. **Nothing in the sibling tree was touched** and it was left clean; this
writer has not read its board process and has no view on whether its gate is in
the right place for it.

- **Found** 2026-10-21, Task 20, from a question the owner asked about
  `transistor-preamp`'s refusal count.
- **How much of the register this change touched, pinned to a commit because the
  figure moves with every round** (review item 5, which corrected a report that
  said *"seven others"*). `[RAN]` attributing every added line of
  `docs/known-gaps.md` to the entry heading it landed under, with the per-entry
  sum checked against the diff's own total: **at `1340e93`, the reviewed commit,
  480 lines - ONE NEW ENTRY (this one, 311) and ELEVEN AMENDED**: **G232** 56,
  **G178** 27, **G238** 22, **G239** 15, **G149** 14, **G240** 14, **G235** 13,
  **G104** 4, **G171** 2, **G226** 1, **G244** 1. The review round then made it
  **twelve** amended, **G241** joining with the control-clause row above.
- **Evidence** every figure above was driven in the same session and its output
  pasted into the task report. **Checks that could have failed, and were each
  driven red once:** putting `bomFields` back into `DRAWING_RULES` fails
  `tests/schgen/authoring-complete.test.ts` naming itself (*"a purchasing field
  refused a DRAWING"*); an empty `SOURCING_RULES` fails that file's sourcing
  counts and both V10 cases in `tests/schgen/ir/validate.test.ts`; a
  `BOM_EXEMPT_PREFIXES` widened to cover `R` fails **both** V10 cases and the
  port's byte-check as well, and the widening was reverted and the revert
  verified by that byte-check rather than by eye.

  **THAT THIRD DRIVE WAS DESCRIBED AS FAILING THE NEW CONTROL "ALONE" AND IT DOES
  NOT; the substantive claim holds at LINE granularity and is restated there**
  (review item 3). `[RAN]` with `"R"` added to the exemption list: **16 pass / 2
  fail** - the DNP case fails too, correctly, because that fixture's `refPrefix`
  is `R` and the widening exempts it; and `tests/schgen/port-fidelity.test.ts`
  fails naming `lib/schgen/ir/validate-parts.ts`, correctly, because the rule
  file is byte-checked. **What is true, and is the claim that matters:** inside
  the exemption case, the **new control** (`part R_B: BOM field MPN is empty`)
  fails while the **old absence-only assertion** (`not.toContain("part R_A …")`)
  still passes - so an assertion that could not fail has genuinely been replaced
  by one that can, and the perturbation distinguishes them line by line. **The divergence declaration is
  load-bearing in both directions:** with the `diverged[]` entry removed,
  `tests/schgen/port-fidelity.test.ts` fails with *"on disk under lib/schgen/
  but in none of files[], diverged[] or handWritten"*; with it restored, 12 pass
  / 0 fail. **And the divergence was necessary rather than convenient:**
  `rewrite(source) === disk` is **false** for `ir/validate.ts` (so the
  byte-check would have caught the edit had the entry stayed in `files[]`) and
  **true** for `ir/validateParts.ts`, which is the control proving the rule file
  is untouched.

  **AND ONE PROBE OF THIS TASK's OWN HAD A FALSE NEGATIVE, recorded because it is
  a reusable way to be wrong - and the FIRST VERSION OF THIS PARAGRAPH THEN
  OVERSTATED IT, which is G244's class committed inside the entry recording it.**
  Both the mechanism and the overstatement are below, measured, because the
  second is the more interesting of the two.

  **THE MECHANISM, AND IT IS REAL.** Ruling **R70** required sweeping for the
  stale CLAIM rather than visiting the sites it named. The first sweep excluded
  the register with `grep -v known-gaps.md` applied to the GREP OUTPUT. `grep -rn`
  prints `file:line:text`, so that filter drops a line when the register is named
  anywhere in that string - **two different drops at once**: the register's own
  lines, because the PATH matches, which is what made the filter look like it
  worked; and, in every other file, **every line that CITES the register**.
  `[RAN]` `bun run tools/schgen/claim-sweep.ts`, which reconstructs the pinned
  commit `34c3412` - the tree the sweep actually ran on - and applies the claim
  over `docs`, `lib`, `tools`, `tests`, `circuits`:

  | form | what the exclusion is applied to | hits |
  | --- | --- | --- |
  | `broken` | the output LINE (`grep -v` after a pipe) | **6** |
  | `excludeFile` | the register FILE (`--exclude`), which is what was meant | **9** |
  | `none` | nothing - **the control, which must be the largest** | **12** |

  **THE THREE LINES THE BROKEN FORM HID ARE NAMED BY THE TOOL**, and all three
  cite `docs/known-gaps.md` **G238** inline:
  `plans/2026-10-19-schematic-authoring-m1.md:1706`, the same file's `:1967`, and
  `specs/2026-10-19-schematic-authoring-design.md:1904`.

  **THE OVERSTATEMENT, AND IT IS THE PART THAT WOULD HAVE MISLED THE NEXT AGENT.**
  This paragraph said *"the four unvisited sites … each cite `docs/known-gaps.md`
  G238 on the same line, so all four were invisible to it"*. **That is false for
  two of them, and the mechanism explains THREE lines rather than four sites.**
  `[RAN]`, same tool: `specs/…-design.md:1192` and `:1926` are hard-wrapped quote
  continuations carrying neither `known-gaps` nor `G238`, and the broken form
  **KEPT both** - they were in its output and were amended from it.

  **WHAT HID THOSE TWO IS DETERMINED, NOT UNDETERMINED, AND THE ANSWER IS
  NOTHING.** They were never hidden. The real error is one level up: **the entry
  described the sweep's coverage from the set of sites that ended up being
  amended, rather than from what the sweep printed** - so two sites the broken
  form found were written up as sites it missed. That is exactly **G244**'s class
  - *a true conclusion reached by a search described more thoroughly than it was
  performed* - and the conclusion was true: four sites did need amending, and all
  four were amended. **This is the second time on this branch that an entry has
  exhibited its own pattern inside itself** (**G235** is the first: its author put
  the pattern in a hand-back message and did not write it down, *"one message
  after writing G234, the entry about exactly that failure"*).

  **THE SHAPE TO REMEMBER IS THEREFORE TWO SHAPES.** (1) **A filter written to
  exclude a FILE, applied to a LINE, excludes every line that mentions the file**
  - and the lines that mention the register are exactly the evidentiary ones.
  (2) **A claim about what a sweep missed is a claim about the sweep's OUTPUT, so
  it is checked against that output and not against what was eventually fixed.**

  **AND THE LESSON ARRIVED AHEAD OF THE DEFECT FOR THE FIRST TIME, which is worth
  recording because three rounds of it arriving afterwards are.** `[RELAYED]` the
  review swept for the claim itself and **found no unamended site**, in its words
  *"the first time on this branch the named set has been complete."* On the three
  previous occasions the sites nobody had named outnumbered the ones that were
  named - including inside this very task, where the sweep found two the brief had
  not listed. **The sweep-for-the-claim habit is what changed, not the care**:
  R70 required sweeping rather than visiting, so the named set stopped being the
  working set.
- **Verified** CONFIRMED - this writer made every edit, ran every probe and read
  every output quoted here. **The `G232` field-placement defect is RELAYED**
  from that entry and from **G238**'s block table; what is confirmed here is
  that `generate` now reaches it for `transistor-preamp`, which is the refusal
  the probe printed.
- **HOW THE SPLIT ITSELF WAS ESTABLISHED, `[RELAYED]` from the review, recorded
  because it answers *"only the BOM rule moved"* better than the implementation
  did.** The implementer's evidence was the composition, the divergence and the
  tests; the review drove the question three independent ways with controls that
  fire: a whole-file diff against upstream with comments collapsed; set algebra
  over both rule literals parsed from source, reporting `MOVED OUT: bomFields`,
  `LOST FROM BOTH: none`, `INVENTED: none`; and reachability showing `generate`
  still calls `validateCircuit` and still throws before emission. **It closed a
  route neither the brief nor this entry had named - a rule KEEPING ITS PLACE
  WHILE ITS BODY IS GUTTED** - by checking that every other rule body is
  byte-identical to upstream.

  **AND IT DROVE THE OWNER'S CRITERION RATHER THAN ARGUING IT**, which is the
  strongest evidence in this entry and is none of it this writer's: `[RELAYED]`
  the `mini` fixture generated twice - control, with its non-empty test BOM,
  exporting **40839 bytes**; then with **every BOM field blanked**, where
  `validateSourcing` reports **68 problems** and **`kicad-cli` parses the
  schematic and exports 40240 bytes**. **A drawing with empty purchasing fields
  is a valid drawing, measured.** That is better support for the criterion than
  the owner's argument or the controller's, and neither of them produced it.

  **TWO OF THE REVIEW's OWN PROBES WERE CAUGHT MID-FLIGHT BY ITS AUTHOR AND ARE
  RECORDED HERE AS ITS OWN `[RELAYED]`, because they are this entry's family.**
  Its set-algebra probe first matched the `[` in `Rule[]` and reported every rule
  list EMPTY - caught only because all three runs printed identically, which is
  the fifth row of **G241**'s table in miniature: a result that cannot differ.
  And its own claim sweep truncated with `head -20` and hid one site until it was
  re-run untruncated, which is **this entry's own `grep -v` miss wearing a
  different filter**. **TWO authors hid true positives behind their own output
  filters in this one round** - a `grep -v` on a line and a `head -20` - and that
  count is this round's, not the branch's: nobody has swept the branch for the
  shape, and stating a larger number would be the overclaim item 1 of this
  review existed to correct.
- **Why it is open** three things, none of them resolved. (1) `validateSourcing`
  **has no production caller**: nothing in this repository emits an artifact
  somebody else sources, so the rule is exercised by tests alone - deliberate
  and recorded, not an oversight. (2) `transistor-preamp` validates and still
  does not generate, for a defect this task did not touch. (3) The census row
  above measures the harness.
- **What would settle it** three criteria, kept apart from their mechanisms.
  **(a) CRITERION: the first consumer in this repository that emits an artifact
  somebody else sources and places refuses on `validateSourcing` before it
  emits.** **MECHANISM, untried:** whatever produces a fabrication or assembly
  package calls it the way `generate` calls `validateCircuit`.

  **THIS IS AN INSTANCE OF G226's PATTERN AND IS DECLARED AS ONE RATHER THAN
  ARRIVING AS A FRESH CASE FOR SOMEBODY TO REDISCOVER** - controller ruling
  **R67**, which also rules that `validateSourcing` **STAYS and is not to be
  collapsed into its two test callers.** **G226**'s claim, adopted there under
  ruling R35, is that *"a mechanism exercised only by its own tests is a
  mechanism whose first real use is its first test; that is acceptable when the
  precondition for wiring it is NAMED and the price is RECORDED, and it is the
  G201 failure when it is not."* So, both halves, explicitly:

  - **THE PRECONDITION, in one sentence: something in this repository must emit
    an artifact that a third party sources and places** - a fabrication or
    assembly package, a board going out for outsourced assembly, an orderable
    BOM. Nothing does today. When one does, `validateSourcing` is what it calls,
    and that is the whole of what wires this.
  - **THE PRICE: `bomFields` runs in tests and in no pipeline.** Until that
    consumer exists, the rule's four keys are checked on the four parity
    circuits by `tests/schgen/authoring-complete.test.ts` and on two hand-built
    cases by `tests/schgen/ir/validate.test.ts`, and by nothing a person running
    `schgen` would ever reach. **A circuit whose purchasing data silently
    regressed would be caught by those tests and by no artifact**, which is
    acceptable precisely because no artifact here needs the data yet - and stops
    being acceptable the moment one does.

  **WHY THE NAMED COMPOSITION IS LOAD-BEARING AND COLLAPSING IT WOULD COST
  SOMETHING, which is R67's reasoning rather than this writer's:** folding the
  rule back into two test call sites would lose the NAME, and **the name is what
  tells a future fabrication path what to call.** The local half of the argument
  is **G152**'s own untried mechanism - *"a rule outside `validateCircuit`, run
  by the consumers that need footprints"* - which is the same shape for the same
  reason; the durable half is this pattern citation. **G201** is what it costs to
  leave a precondition unnamed: five rounds in which the real pipeline could not
  emit a single ELK block, with a test pinning the gap in place.

  **(b) CRITERION:
  `bun tools/schgen/gate-census.ts` reports zero gate-1 problems for a reference
  AND `bun tools/schgen/remeasure-coverage.ts` reports every block of that
  reference as DRAWS** - **G238**'s criterion, unchanged, with the first half now
  met for `transistor-preamp` and the second half not. **MECHANISM, untried and
  it is not this task's:** **G232**'s defect, which ruling R46 reserves.
  **(c) CRITERION: the gate census reports the CIRCUIT's own state for every
  circuit it lists, and no row of it reports an artifact of the harness** - so
  the one circuit that validates is legible in the committed census, and so no
  line of a tool built to be re-run and compared differs on every run.
  **MECHANISM, untried, and deliberately not prescribed under ruling R68:** one
  route is a census that can create a reference lock in its own scratch
  directory, which today means changing what `runGates` forces about `initLock`
  and letting a census run write a file; **whether that is the right route is
  unjudged here**, and the criterion is met by any route that satisfies it.
  Parked, not deferred: **R68** parks it loudly rather than ruling it
  acceptable.

### G251 - MEASURED: the repository root's `make check` does NOT pass, and has not for at least this branch - FOUR of the eleven declared boards refuse, in TWO different cause classes, identically before and after Task 19

**WHY THIS IS WORTH AN ENTRY RATHER THAN A SHRUG.** `README.md` calls `make
check`, *"run from a board's directory ... or from the repository root to check
every declared board"*, **the perfboard workflow's *"front door"***, and
`CLAUDE.md` says it *"invokes `kicad-cli` on every board on every run"* and to
treat KiCad *"the way you would a compiler"*. **An agent that runs it at the
root as a final check gets exit 2 and has to decide, with nothing to consult,
whether it broke something.** Task 19 had to make that decision and measured it
rather than reasoning about it, and the next agent should not have to repeat the
measurement.

`[RAN]` `make -C boards/<board> check` per board, at `8813c6c` (before this task,
in a `git worktree` with `node_modules` and `.tools` linked) and at this commit:

**ALL ELEVEN DECLARED BOARDS, none omitted** - an earlier version of this entry
listed ten and left out the one whose cause is DIFFERENT, which defeated the
entry's whole purpose: a reader found three of four refusals explained and would
reasonably have concluded the fourth was theirs:

| board | before | after | cause class |
| --- | --- | --- | --- |
| the five `pultec-*` boards | exit 0 | exit 0 | - |
| `transistor-preamp-buffered` | **exit 0** | **exit 0** | - |
| `transistor-preamp-feedback` | **exit 0** | **exit 0** | - |
| **`pt2399-core`** | **exit 2, 1 `FAIL`** | **exit 2, 1 `FAIL`** | **a MISSING EXPORT** |
| `transistor-preamp-lab` | exit 2, 1 `FAIL` | exit 2, 1 `FAIL` | an unfinished layout |
| `transistor-preamp-loop` | exit 2, 1 `FAIL` | exit 2, 1 `FAIL` | an unfinished layout |
| `transistor-preamp-staged` | exit 2, 1 `FAIL` | exit 2, 1 `FAIL` | an unfinished layout |

**The passing boards are the control and they could have answered differently**:
a change that broke the board checks generally would have taken `pultec-mid`,
`buffered` and `feedback` down too, and it did not - driven in the same worktree,
in the same run, as the `pt2399-core` figures.

**`pt2399-core` IS A SECOND CAUSE CLASS AND NOT A FOURTH MID-LAYOUT BOARD.**
`[RAN]` its refusal, in full, identically at `8813c6c` and at this commit:

> `circuits/pt2399-core/pt2399-core.ts: no "bomConditions" export. Export `bomConditions(): BomConditions` (tools/bom/conditions.ts).`

Its layout is not the problem; the circuit module does not export what the BOM
conditions check requires. **A reader who knows only about the mid-layout class
will not recognise this one**, which is the reason it is named here rather than
folded into a count.

**WHAT THE THREE MID-LAYOUT BOARDS REFUSE ON.** Not a toolchain problem and not
the lead-span whitelist the message's tail talks about: **the committed layouts
are unfinished.** `transistor-preamp-lab`'s
reports `BASE incomplete`, `BYPASS_CAP incomplete`, `COLLECTOR incomplete`,
`GND blocked (J2 unplaced)`, `OUT blocked (J2 unplaced)` and
`Cuts: not resolved (strip connectivity incomplete - run --update)` among its
nets. **That is a board in progress, which is what this repository is for** -
`CLAUDE.md`: *"This is hardware in progress, not software that ships ... Nothing
here reaches a state called 'done'."* **G62** already records that
`boards/transistor-preamp-lab`'s layout *"has 19 strips joining two different
nets across unpainted holes"* and calls it pre-existing; **nothing recorded that
`loop` and `staged` are in the same state, or that the root `make check`
therefore cannot pass.**

**AND THE REFUSAL ITSELF IS CORRECT, WHICH IS WHY THIS IS NOT A DEFECT ENTRY.**
Its own words: *"This is a REFUSAL TO GRADE and not a verdict that the board is
buildable: the four constraints have no answer about this layout, which is why
the board is reported as failing rather than as passing. A constraint whose check
silently passes is worse than no constraint."* That is `CLAUDE.md`'s rule working.

- **Found** 2026-10-21, Task 19 Step 7, by running the root `make check` after
  the five `pultec-*` boards the brief asked for had all passed.
- **Evidence** the BEFORE column is `make -C <worktree>/boards/<board> check` run
  per board in a detached `git worktree` at `8813c6c`, with `node_modules` and
  `.tools` symlinked so the VeroRoute binary resolves (**G250** is what happens
  without it). **It is per-board rather than the root walk for a reason worth
  having**: `[RAN]` the root `make check` in that worktree refuses before
  reaching any board - *"node_modules: is a symlink to a directory.
  discoverDeclarations does not follow symlinked board directories, because a
  perfboard.json reachable only through one would otherwise be silently
  skipped"* - so **the root walk cannot be taken in a symlinked worktree at all**,
  and a later agent trying to reproduce the BEFORE column this way will meet that
  refusal rather than a result. The AFTER column is the root `make check` walk,
  which covers all eleven declared boards in one run, plus per-board runs of
  `pt2399-core`, `pultec-mid` and `transistor-preamp-buffered` taken beside the
  BEFORE ones so the two columns are compared through the same command.
  **CORRECTION, and it is why this entry needed a second pass: an earlier version
  of this line claimed the walk's output was "read in full", and it was not** -
  the walk's `FAIL` lines were read and `pt2399-core`'s was missed, so the table
  listed ten boards of eleven. The refusal texts quoted above are now read from
  the runs' own output, and the board list is `[RAN]`
  `grep -E '^FAIL' <walk log>`, which returns **four** lines.
- **Verified** CONFIRMED - this writer ran every one of them. **G62**'s 19-strip
  measurement is **RELAYED** from that entry.
- **Why it is open** **nothing here is a defect to fix by this task.** Three
  boards are mid-layout, which is the normal state of a board in this
  repository; `pt2399-core`'s missing export may well be one, and this entry does
  not judge it. It is open
  because the root `make check` is documented as the front door in two places and
  neither says it does not currently exit 0, so the next agent to run it meets an
  unexplained failure at exactly the moment it is most likely to be misread as
  its own.
- **What would settle it** **CRITERION: either the root `make check` exits 0, or
  the two documents that call it the front door say which of the eleven boards
  are expected to refuse and in which cause class.** Both are checkable, and the
  second half says *cause class* because a bare list of four board names is what
  let this entry lose one of them. **MECHANISMS, all UNTRIED and none preferred
  here**: finish the three layouts, which is bench work and nobody's to schedule
  from a register entry; add `pt2399-core`'s `bomConditions` export, which is a
  different and probably much smaller job and is still not this task's; or have
  the per-board walk distinguish *this board is mid-layout* from *this board is
  wrong*, which is a change to `make/board.mk`'s contract and **an owner decision
  rather than a tidy-up** - the current behaviour is deliberate, and an "expected
  to refuse" list is one edit away from a list that excuses a real failure.

### G292 - OWNER DIRECTIVE on how a generated schematic should read, with his words verbatim - and MEASURED: the ROTATION half is available and cuts text collisions by a third, while the ARRANGEMENT half is a DIFFERENT defect, because `edgesForNet` directs every edge by DECLARATION ORDER and ELK lays out by edge direction

> **AMENDED 2026-10-27 (G302): THE ARRANGEMENT HALF OF THIS DIRECTIVE IS MOOT BY THE OWNER'S
> RULING, AND THIS ENTRY IS WHY A PASSING REMARK ACQUIRED THE STANDING OF A RULE.** *"arranged to
> the right of the switch symbol"* is struck, and with it clause (3) below, this entry's arrangement
> criterion, and G293's amendment counting which columns sit left of `SW1`. His ruling: *"when I
> asserted the capacitor bank should be to the right of the switch its because the layout was so
> goofy i couldn't tell signal flow direction. So, that directive is moot."*
>
> **IT WAS A SYMPTOM REPORT, QUOTED ACCURATELY AND READ AS A SPECIFICATION.** This entry's own
> framing - *"IT IS A DIRECTIVE AND NOT A PREFERENCE TO WEIGH"* - is what gave it that standing, and
> the sentence it quotes contains its own purpose for anyone who read it for one. **A verbatim
> quotation is evidence of what he said and is not a finding about what he meant.** Nothing here
> distinguished the two, and two days of measurement were spent on the half that was moot.
>
> **THE ROTATION HALF SURVIVES AND IS PROMOTED**: orientation serves clarity and signal flow, which
> G302 carries in full - including that this entry's own `[READ]` of `orientation.ts` is the
> evidence for his *"the ancien regime never looked at or altered part orientation."*

> **AMENDED 2026-10-26 (G296): THE LIST OF ENTRIES THIS RULE MOVED IS NOW ALSO THE LIST A SECOND
> CHANGE MOVED AGAIN, and the attribution problem this entry corrected has recurred in a new
> form.** G292 established that the orientation rule moved all 24 red tests and the edge-order change
> moved none. The star plus the two 180-degree rules then left 22 red, and **this time the two
> changes INTERACT**: the block census is 10 with neither, 8 with the 180 rules alone, 7 with the
> star alone and 8 with both, so `pt-core` is lost by either alone and drawn by both together.
> **"Which change moved this figure" has no answer for most of them**, which is a stronger statement
> than G292's and is measured the same way, over four trees with a control.

**THE DIRECTIVE, 2026-10-25, reviewing the first `pultec-hi-boost` sheet this
repository ever generated.** His words, verbatim and complete:

> *"just reviewed the high boost. It's definitely serviceable. It would, however,
> be easier to read if the capacitors in the capacitor bank were rotated 90
> degrees and not fanned out to the top and bottom of the switch symbol, but
> arranged to the right of the switch symbol. signal flows left to right."*

**IT IS A DIRECTIVE AND NOT A PREFERENCE TO WEIGH.** `CLAUDE.md` reserves the
criteria a generated artifact is judged by to someone other than the agent
producing it, and readability is exactly that class - **G71** holds that a
readability threshold invented here would be this project's invention wearing a
citation. This is the owner supplying one. *"Signal flows left to right"* is the
general principle; the capacitor bank is the instance he happened to be looking
at.

**IT HAS TWO HALVES AND THEY ARE DIFFERENT PROBLEMS**, which is the finding.

**(1) WHY THE CAPACITORS ARE DRAWN VERTICALLY: no rule answers for them.**
`preferredOrientation` (`lib/schgen/rules/orientation.ts:81`) returns a rotation
only for a part with a RAIL end - its `constraints` come from
`context.rails`, and `if (constraints.length === 0) return null`. The hi-boost
bank sits between signal nodes and touches no rail, so every one of its
capacitors falls through to `null`, which spec §1.5 resolves to **0: the
orientation the symbol library itself draws the part in**. `Device:C` at
rotation 0 has its pins top and bottom, so the plates are horizontal and the
part's axis is vertical. Nothing chose that; it is the default of a rule that
declines to answer.

**(2) ROTATION IS AVAILABLE AND IT MEASURABLY IMPROVES THE DRAWINGS.** `[RAN]` a
throwaway probe making a part with no rail constraint prefer 90 instead of
falling through, then re-rendering every board:

| | production | probe |
| --- | --- | --- |
| boards producing a schematic | 5 of 11 | 5 of 11, **a different five** |
| **fallback field placements** | **26 across 5 boards** | **17 across 5 boards** |
| `pt2399-core` fallbacks | 8 | **4** |
| `transistor-preamp-lab` fallbacks | 5 | **2** |
| `pultec-low-boost` | refused, **missing junction** | **GENERATED** |
| `pultec-hi-boost` | generated | refused: *"blocks do not fit on A3 … needed at least 431.8 x 297 mm"* |
| `pultec-hi-cut` | refused, needs 427.99 mm | refused, needs **457.2 mm** |

**A third fewer text collisions**, and a board whose missing-junction refusal
cleared. **The two it costs are PAPER-SIZE refusals, not collisions**: a
left-to-right layout is wider and shorter, so A3's 420 mm runs out. That is the
directive working as intended and running into a sheet-size decision, not a
defect in it. **The probe is NOT the design** - it rotates every non-rail
two-terminal part in the repository with no account of what the part does - and
no rule should be written from it without its own criteria.

**(3) THE ARRANGEMENT HALF IS NOT DELIVERED BY ROTATION, and the cause is
elsewhere.** `[RAN]` the probe and read the generated `pultec-low-cut` sheet:
the capacitors are rotated as asked **and are placed to the LEFT of `SW1`**,
which is the opposite of the directive. **Rotation and placement are
independent here.**

**THE CAUSE, and it is general rather than about capacitors.**
`edgesForNet` (`lib/schgen/elk/graph.ts:286`) turns a net of degree n into n-1
edges by chaining the terminal list in LIST ORDER:

```ts
const from = terminals[i - 1]
const to = terminals[i]
out.push({ id: `${net}:${i - 1}`, sources: [from], targets: [to] })
```

The list is built as parts are walked, so **the direction of every edge in the
layout graph is an artefact of declaration order.** ELK is run with
`elk.direction = RIGHT` (plan decision **D4**) and `layered` assigns layers from
edge direction - so **what ends up left and what ends up right is decided by the
order somebody wrote the components in**, not by where the signal goes. The
switch landing downstream of its own capacitor bank is one visible instance of
that.

**This is why the directive's second half cannot be met by an orientation rule.**
Nothing in the IR currently carries signal direction for an INTERIOR net.
`portDirections` carries it for boundary nets only (`negotiablePort`), and that
is the input **G186** called *"the only input genuinely missing from the IR"*
before ruling **R29** added it - for boundary nets.

- **Verified** **CONFIRMED by this writer.** The directive is quoted from the
  owner's message of 2026-10-25 and is complete, not excerpted. The probe was run
  in this repository against installed KiCad 10.0.5, restored its one patched
  file in a `finally` block, and `git status lib/` was checked clean afterwards;
  the figures are read off `bun tools/schgen/board-sheets.ts`' own output. The
  left-of-switch placement was read off the rendered PDF rather than inferred.
  `edgesForNet` was read, not remembered. **Nothing here is relayed from another
  agent.**
- **Why it is open** nothing is built. Production still falls through to rotation
  0 for every non-rail part, and still directs every edge by declaration order.
- **What would settle it, and the two halves settle separately.**
  **FOR ROTATION, CRITERION:** a two-terminal signal-path part is drawn with its
  axis along the signal direction, and the board census does not lose a board
  except to a paper-size refusal that names the size needed. **MECHANISM,
  PARTLY TRIED:** extend `preferredOrientation` past its rail-end scope - but the
  probe's blanket 90 is not it, because `RAIL_END_KINDS` exists to name the
  kinds the rule speaks for and widening it to "everything else" would be the
  taste judgement that file forbids. **AND IT FORCES A PAPER DECISION:** two
  boards need more than A3's 420 mm, so either the `SheetSpec` paper is raised or
  the layout is made narrower, and which of those is right is **an owner question
  that has not been put to him.**
  **FOR ARRANGEMENT, CRITERION:** a part's position along the sheet's x axis
  follows the signal path rather than the declaration order, measurable as: for
  a net with a declared input port, no terminal is laid out upstream of the port
  it is fed from. **MECHANISM, UNTRIED:** direct each net's edges by a
  topological walk seeded from the block's declared input ports instead of by
  list order in `edgesForNet`, leaving the chaining itself alone. **It is not
  small** - it changes the layout graph of every block, and `edgesForNet`'s
  chaining is what **G188**'s `nodeSelfLoop` finding is about, so the two
  interact.

**BOTH HALVES ARE BUILT AS OF 2026-10-25, AND THE MEASUREMENT RE-DRIVE REFUTES
THE ATTRIBUTION BOTH COMMITS CLAIM. THAT COMES FIRST, because every figure in
this register that moved that day was moved by ONE of the two changes and the
commits say otherwise.**

**WHAT LANDED, in three commits.**

1. `f754a37` **paper as a FLOOR** - a sheet's declared paper is the smallest size
   it may be drawn on, not the largest; contents that overflow are drawn on the
   smallest larger standard size they fit, and only *nothing fits* still refuses.
   This is what the *"AND IT FORCES A PAPER DECISION"* clause below called an
   owner question, and he declined to answer it (see the DECLINATION below).
2. `22ca29b` **the orientation half** - `preferredOrientation` answers for a
   two-terminal part with NO rail end by laying its axis along the signal, pins
   left and right. The rail entry still runs first and wins. The kind list is
   `RAIL_END_KINDS` shared rather than widened, so a diode is untouched; the
   blanket-90 probe below is NOT what shipped. The tie-break between the two
   horizontal rotations is the lower-numbered pin to the left, stated as
   arbitrary.
3. `df272a7` **the arrangement half** - `edgesForNet`'s terminal list is stably
   sorted by a breadth-first `downstreamDepth` from the block's inbound boundary
   nets, seeded from the `FIRST_SEPARATE` layer constraint that already means
   *"this net enters here"*. A net the search does not reach keeps its list order.

**THE ATTRIBUTION, MEASURED - AND `df272a7` MOVED NOTHING IN THE SUITE.** `[RAN]`
the seven test files that carry the moved measurements, three times: at HEAD;
with `lib/schgen/elk/graph.ts` alone rolled back to `22ca29b`; and with
`lib/schgen/rules/orientation.ts` also rolled back to `f754a37`:

| tree | result over the seven files |
| --- | --- |
| HEAD, both halves | **97 pass / 0 fail** |
| edge order rolled back, orientation kept | **97 pass / 0 fail** |
| both rolled back | **73 pass / 24 fail** |

**So the ORIENTATION rule moved all 24 and the EDGE-ORDER change moved none.**
`[RAN]` the full suite with the old expectations and `graph.ts` rolled back -
i.e. the tree exactly as `22ca29b` left it: **3849 pass / 24 fail / Ran 3873**,
and the 24 failing test NAMES are identical to the 24 at `df272a7`.

**TWO CLAIMS IN THOSE COMMIT MESSAGES ARE THEREFORE FALSE:**

- `22ca29b` says *"WIP, SUITE IS RED at 25"* and *"Suite … 25"*. **It was red at
  24.** No run produces 25.
- `df272a7` says *"RED: 24 tests in the same measurement families the two
  previous geometry changes moved"*, which reads as this commit having moved
  them. **It moved none of them**; the same 24, by name, were already red.

**AND THE CAUSE IS STRUCTURAL RATHER THAN A FLUKE, which makes it a scope
finding about the arrangement half.** `downstreamDepth` seeds only from a
boundary net that `layerConstraintFor` gives `FIRST_SEPARATE`. `[RAN]` over
`ALL_DECLARED_CASES`: **7 of the repository's 52 ELK-selecting blocks have one**,
and all seven are Pultec board blocks - `pultec-hi-boost-own`,
`pultec-hi-boost-junction`, `pultec-hi-cut-junction`,
`pultec-low-boost-junction`, `pultec-low-cut-junction`, `pultec-mid-own`,
`pultec-mid-junction`, each on net `in`. **Not one of the twelve parity blocks
has one**, and the parity blocks are what every pinned measurement in this
register is taken over. **So the arrangement half reaches 7 blocks of 52, and
45 of 52 lay out byte-identically to before it** - which is what that commit's
own *"A NET THE SEARCH DOES NOT REACH KEEPS ITS LIST ORDER"* paragraph says,
without noticing that this is almost every block.

**THE ARRANGEMENT CRITERION THIS ENTRY SET IS MET, AND ITS SUBJECT IS THOSE SEVEN
BLOCKS.** The criterion: *"for a net with a declared input port, no terminal is
laid out upstream of the port it is fed from."* `[RAN]` over every ELK-selecting
block of every declared case, on the laid-out ELK graph: **7 blocks with a
declared inbound boundary net, 7 inbound nets, 0 terminals laid out left of their
port.** The criterion is met with **zero** violations and over **7 of 52 blocks**,
and both halves of that sentence bind.

**THE ROTATION CRITERION IS MET TOO, and its paper clause was discharged rather
than waived.** The criterion: *"a two-terminal signal-path part is drawn with its
axis along the signal direction, and the board census does not lose a board
except to a paper-size refusal that names the size needed."* `[RAN]`
`bun tools/schgen/board-sheets.ts`: **7 of 11 boards produce a schematic, 4
refused, no board lost.** `pultec-hi-cut`'s *"needed at least 427.99 x 297 mm"*
was answered by raising the paper rather than by leaving the refusal standing,
and the four that refuse do so for reasons this entry's mechanism does not touch.
`[RAN]` the port-side census: of the 82 two-port nodes, **42 are now EAST/WEST
where 16 were not NORTH/SOUTH before** - the rule reaches 26 parts across the
parity corpus.

**THE OWNER DECLINED THE PAPER QUESTION, AND HIS WORDS ARE NOT RECORDED
VERBATIM ANYWHERE, WHICH IS A GAP IN THIS ENTRY AND IS STATED AS ONE.** The
clause below raised *"an owner question that has not been put to him"*. It was
put to him, and `f754a37`'s message reports his answer as *"Asked which way he
wanted two boards resolved that needed more than A3, he said: why are you
asking? The refusal already named the size needed … so the answer was derivable
from the message that withheld it."* **That is a PARAPHRASE in a commit message,
not his words.** `CLAUDE.md` requires an owner decision or declination to be
recorded with his words verbatim, and this one is not - so **what would settle
it: his message, quoted.** The substance of the declination is nonetheless
recorded here, because a question he declined is not a closed question and
nobody asks him again unprompted.

**WHAT THE ORIENTATION RULE MOVED, since it is the change that moved everything.**
Each figure is recorded in the entry that carries it and the list is here so a
reader has one place to start: `G96` (crossings by size, aspect range), `G105`
(the integrated experiment - its flat side now REFUSES at the snap and its
stage-matched comparison reversed sign), `G185` (the twelve canvas sizes, the
port-side census, the four legs' node positions), `G188` (self-loops re-driven,
UNMOVED), `G193` (the 4/18/16 anchor split re-driven, UNMOVED), `G200` (wire
total and, for the first time, segment count), `G209`, `G211` (the `lab` sheet's
wire count), `G216` (the five legs' rows and the bends-per-edge contrast),
`G218` (the whole inflation table and the duplicate population, 82 to 64),
`G219` (0-of-64 under ordered keys), `G229` (the junction coordinate, and the
seven-block probe's obligation), `G239` and `G258` (the field-fallback
populations), `G259` (the board scoreboard, 1 to 7 of 11), `G285`
(`pt2399-core`'s eight fallbacks to four), `G291` (six rows of its own table).

**AND TWO THINGS GOT WORSE, reported beside the rest rather than under it.**
`ob-buffer`'s one fallback field now covers FOUR things where it covered one, and
one of the four is a part's BODY rather than a wire. **All NINE of `tp-stage`'s
declared interface ports now disagree with where its layout brings them out**,
where eight did - its `BYPASS_CAP` was the satisfied one
`tests/schgen/render/compose.test.ts` cited as proof the refusal was not a
blanket.

- **Verified** **CONFIRMED by this writer** for everything in this amendment: the
  three-tree attribution runs, the full-suite run at the `22ca29b` tree, the
  52-block and 7-block seed censuses, the arrangement-criterion probe, the
  port-side census, the board census, and the five `make -C boards/pultec-* check`
  runs plus the eleven `perfboard.vrt` checksums that establish the board path is
  untouched. **RELAYED:** the per-step board figures `6 of 11` and `7 of 11`
  attributed to `f754a37` and `22ca29b` individually, which are read off those
  commits' own messages; this writer measured only the endpoints.
- **Why it is open** the directive is implemented and **nobody has read the
  result**. Seven boards generate; `G285` records that the one sheet anyone has
  read cannot be read as a drawing, and the other six have had no such reading.
  The owner asked for a capacitor bank *"arranged to the right of the switch
  symbol"* on `pultec-hi-boost`, and `df272a7` reports that it now is - **that is
  the producing agent's own reading of its own output**, which is the one class of
  judgement `CLAUDE.md` reserves from it.
- **What would settle it** **CRITERION, and it is the owner's to apply:** he looks
  at the `pultec-hi-boost` sheet again and says whether it reads as he asked.
  **MECHANISM:** `bun tools/schgen/board-sheets.ts --out <dir> --pdf` renders all
  seven. **AND A SECOND, NARROWER CRITERION THIS WRITER CAN STATE WITHOUT
  AUTHORING A READABILITY BAR:** the arrangement half currently reaches 7 of 52
  blocks because `FIRST_SEPARATE` is the only seed it has. Whether a block with no
  declared inbound net should have a seed at all is a DECLARATION question, not a
  layout one, and `G99`'s open fifth input is where it belongs. **No mechanism is
  offered for it here**, because inventing a direction for such a block is the
  taste judgement spec 1.5 forbids - which is the same reason `df272a7` gave for
  leaving it alone, and it is the right one.

### G300 - OWNER DECISIONS, 2026-10-26, with his words verbatim: what the generated sheets are FOR, that a wonky sheet must not ship (which RULES on G260), and that the stand-in groups are BUILD OPTIONS rather than clutter

Three decisions in one session, recorded together because each changes what the
drawing work is judged against. None was inferred; all three are quoted.

**1. THE SHEETS ARE BENCH REFERENCE DOCUMENTS INSIDE THE GENERATED BUILD GUIDE.**

> *"They are references documents for the bench when I build the circuits IRL.
> That's why they need to be human-readable. There's a whole build guide that
> gets generated - I want readable schematics to be part of that guide so I can
> refer to the schematic while building to stave off my own in-the-moment
> confusion."*

**This settles a question that had been answered three different ways in front of
him** - whether component values belong on the drawing. They do: a sheet read at
the bench while building carries its values. **Thompson-Bell's own drawing does
not** (see **G301**), so his arrangement cannot be copied here, and that is a
constraint on the construct rather than a preference about it.

**2. A WONKY SHEET IS WORSE THAN NO SHEET, WHICH IS A RULING ON G260.**

> *"If the schematics are wonky, it's worse than having nothing at all."*

**G260** records 31 field pairs drawn over something across the boards and that
*"no check refuses a sheet for it by design"* - it is explicitly a
minimise-and-disclose policy with the refusal question left open. **He has now
closed it in the strict direction**, and the mechanism it implies is a gate on
the deliverable: a sheet that fails its clearance checks degrades to the
no-schematic notice the packet already prints, rather than reaching the bench
drawn-over. **G260 is NOT deleted** - what it measures is still true of the
artifact - but its open policy question has an answer.

**3. THE STAND-IN GROUPS ARE OPTIONAL BUILD CONTENT.**

> *"the stand-in networks are optional at build time - depending if I want to
> build a standalone module (in which case I need them) or some combination of
> connected modules (in which case I need some or none of them)."*

**THIS REVERSES A PROPOSAL THIS WRITER HAD ALREADY PUT TO HIM**, which was to
shrink or suppress the stand-in boxes because they occupy about as much page as
the circuit while holding one or two resistors each. They occupy that page
because **they are the options a builder chooses between at the bench**, which is
what a bench reference is for.

**The observation was right and the inference from it was wrong**, and the
distinction matters for the next agent: *"these boxes are large and nearly
empty"* is a measurement, *"therefore remove them"* was a judgement about what the
artifact is for, made by the agent producing it. `CLAUDE.md` reserves exactly
that judgement to someone else.

**What it makes into a real question is presentation rather than presence:** a
conditional network ought to read as conditional, and which build configuration
calls for which group is information the generated page does not currently
carry. That is open, and it is his to accept.

- **Found** the schematic-in-the-build-guide design, same session.
- **Evidence** his three messages of 2026-10-26, quoted complete rather than
  excerpted.
- **Verified** **CONFIRMED by this writer** - the quotations are from this
  session's transcript and the G260 cross-reference was read in this file, not
  remembered. **Nothing is relayed from another agent.**
- **Why it is open** decisions 1 and 2 are inputs to work not yet done; decision
  3 leaves the presentation question unanswered.
- **What would settle it** decisions 1 and 2 are settled and bind. **For 3, an
  OWNER DECISION on presentation**, which is not asked unprompted: a rendered
  page that distinguishes the conditional groups from the section, offered for
  his judgement, is what would put the question properly.

### G302 - OWNER RULING, 2026-10-27: G292's "bank to the right of the switch" is MOOT and was a symptom report misread as a layout instruction - and the principle underneath it is that PART ORIENTATION serves signal flow, which this generator does not decide at all for any part off a rail

**HIS WORDS, verbatim and complete**, asked which side of the switch the bank
belongs on:

> *"when I asserted the capacitor bank should be to the right of the switch its
> because the layout was so goofy i couldn't tell signal flow direction. So, that
> directive is moot. That entire discussion led us into a boggy quicksand -
> except for the part about rotating parts to better comport with signal flow.
> The orientation of a component should be in the service of clarity and signal
> flow. If a part causes less turbulence when rotated, it should be rotated. If a
> part is facing opposite to the direction of signal flow, rotate or reflect the
> part. My larger point in that discussion is that part orientation is a critical
> factor in reducing turbulence and visual noise - and the ancien regime **never**
> looked at or altered part orientation."*

**WHAT IS STRUCK.** G292's arrangement half - *"arranged to the right of the
switch symbol"* - and with it G293's amendment recording it as still unmet, and
the whole left-versus-right question. **No side of the switch is prescribed.**

**WHY THIS IS NOT MERELY A DIRECTIVE BEING WITHDRAWN, and it is the most
transferable thing in this entry.** The sentence was a **symptom report** -
*"I couldn't tell signal flow direction"* - and it was recorded, quoted and
re-measured for two days as a **specification of a layout**. G292 built an
orientation probe and an arrangement criterion from it; G293's amendment counted
which columns sat left of `SW1`; the pre-registration and this design both
carried it as binding. **The register's own practice of quoting the owner
verbatim is what preserved it accurately enough to be re-read correctly, and is
also what gave a passing remark the standing of a rule.** A quotation is evidence
of what he said; it is not a finding about what he meant, and nothing in the
entries distinguished the two.

**CLAUDE.md already holds the general form of this and this is its fifth
instance**: *"ask what a demand is for before working out how to satisfy it"*, and
*"the tell is a rule that refuses with a restatement of itself."* The four it
lists were demands made by this repository's tools. **This one came from the
owner**, which is why nothing flagged it - an owner directive is the one class of
demand this project treats as not needing interrogation. It still needed its
*purpose* read, and the purpose was legible in the sentence itself.

**WHAT REPLACES IT, in his terms:** orientation is in the service of clarity and
signal flow; a part that causes less turbulence rotated should be rotated; a part
facing opposite to signal flow should be rotated or reflected.

**"TURBULENCE" IS HIS JUDGEMENT WORD AND MUST NOT BE MADE INTO A NUMBER.**
**G71** and the constitution's first principle forbid inventing a score for
whether a drawing reads, and three such proxies in two days each pointed the
opposite way to his judgement on a specific occasion. **A turbulence metric would
be the fourth.** What may be measured is the closed-form part: whether a
two-terminal part's axis lies along its net's signal direction, and whether a
part's pin order runs against it. Whether the result reads is his, by looking.

**HIS LAST CLAUSE IS CONFIRMED BY A CODE READING ALREADY IN THIS REGISTER, not
only by his impression of the sheets.** G292 records, from `[READ]`
`lib/schgen/rules/orientation.ts:81`, that `preferredOrientation` returns a
rotation **only** for a part with a RAIL end - *"its `constraints` come from
`context.rails`, and `if (constraints.length === 0) return null`"* - and that
every other part falls through to `null`, resolved by spec 1.5 to rotation **0**,
*"the orientation the symbol library itself draws the part in. Nothing chose
that; it is the default of a rule that declines to answer."*

**So "the ancien regime never looked at or altered part orientation" is literally
true of the production code for every part not touching a rail**, which is every
capacitor in every Pultec selector bank. He named a defect from the drawings that
the code states plainly about itself.

- **Found** the schematic-in-the-build-guide design,
  `docs/superpowers/specs/2026-10-26-schematic-in-the-build-guide-design.md`,
  whose open question this answers by withdrawing it.
- **Evidence** his message of 2026-10-27, quoted complete rather than excerpted;
  G292's own `[READ]` of `orientation.ts`, re-read in this file rather than
  remembered.
- **Verified** **CONFIRMED by this writer** for the quotation and the
  cross-references. **RELAYED, not re-run:** the `orientation.ts` line number and
  the rail-constraint behaviour are G292's reading, not this writer's; they are
  quoted from that entry and have not been re-established against the current
  tree.
- **Why it is open** nothing is built. `preferredOrientation` still declines to
  answer for every non-rail part.
- **What would settle it.** **CRITERION, and it is his:** a two-terminal part on
  the signal path is drawn with its axis along the signal direction and is not
  facing against it, and the owner, looking at the rendered sheet, finds the flow
  followable. **MECHANISM, PARTLY TRIED AND EXPLICITLY NOT ENDORSED:** G292's
  probe gave every non-rail two-terminal part a blanket 90 degrees and cut
  fallback field placements from 26 to 17 across five boards - **but that entry
  says in terms that the probe is not the design**, because `RAIL_END_KINDS`
  exists to name the kinds the rule speaks for and widening it to "everything
  else" is the taste judgement `orientation.ts` forbids. **A real mechanism needs
  a signal direction for interior nets, which G292 records the IR as not
  carrying.**

### G303 - OWNER DIRECTIVE, 2026-10-27: a gate may refuse to RATIFY an output; it may not HIDE one. The output is still produced and classified as unratified

**HIS WORDS, verbatim:**

> *"this is a persistent pathology: a gate halts rendering and we never look at the picture so we
> can't tell if the gate is insane or not"*

and, when asked to proceed:

> *"We need to systematically reform how gates work before moving any further. Gates can still
> refuse to ratify an output, but they shouldn't **hide** the output. The output should still be
> available, but clearly classified as unratified"*

**HOW HE CAME TO IT, because the demonstration is the evidence.** Asked to try a layout change on
`pultec-low-boost`, this writer patched `elk.direction` to `DOWN` and ran the census. It refused.
Bypassing the junction gate surfaced a clearance gate; bypassing that surfaced an invalid-layout
throw in `blocks.ts`; bypassing that surfaced a fifth. **Four gates bypassed and no picture ever
appeared.** He named the pathology while that was happening.

**THE MEASUREMENT.** `[RAN]` `grep -rc "throw new Error"` over `lib/schgen`: **351 throw sites** -
168 in `render/`, 43 in `gates/`, 36 in `elk/`, 10 in `ir/`. Not all are of this class; a refusal
about bad INPUT has no drawing to preserve. The class this directive is about is the refusal that
fires AFTER a drawable geometry exists and discards it.

**WHAT IT COSTS TODAY, and it is not hypothetical.** Four of eleven boards refuse, and **nobody has
ever seen what any of them would have drawn.** Every census figure this project has quoted -
`0 of 11`, `1 of 11`, `2 of 11`, `5`, `6`, `7 of 11` - counts boards that PRODUCED a sheet, and the
remainder are invisible rather than bad. A refusal's text gets read in place of a drawing, which is
how this repository came to argue about an `UPPER_SNAKE` net-name rule and a BOM gate: `CLAUDE.md`
records four demands satisfied without anyone asking what they were for, every one caught by him.
**A gate whose output nobody can see is a demand that cannot be interrogated.**

**THE FIX SHAPE ALREADY EXISTS HERE, ON A DIFFERENT SUBJECT, AND IS THE PRECEDENT TO COPY.**
`docs/schematic/false-greens.md` mechanism 16 records a classifier whose unclassifiable bucket was
silently exempt, and the remedy that replaced it:

> *"inference was replaced by declaration plus a totality assertion. A block declares itself; every
> block is `VERIFIED`, `NOT-OUTPUT` or `FAILED`; and the suite asserts the three sum to the block
> count - which is exactly the property the hole violated."*

and the reason it prints the unclassifiable ones by name every run:

> *"precisely so that not checked can never be indistinguishable from checked and clean."*

**This directive is that sentence applied to drawings: UNRATIFIED must never be indistinguishable
from NOT PRODUCED.**

**WHAT IT DOES NOT SAY, so nobody reads it as a relaxation.** It does not weaken a gate. A sheet
that fails its checks still must not reach a build guide - that behaviour shipped at `f42c129` and
is correct, and becomes an INSTANCE of this rule rather than an exception to it. The gate governs
**ratification**, which is what may be shipped and built from. It does not govern **visibility**,
which is what may be looked at. Conflating the two is the defect.

**HOW AN UNRATIFIED SHEET ANNOUNCES ITSELF, decided by him the same day, with his reasoning
because the reasoning is the more transferable half.** Asked whether the mark should be a discreet
title-block field, a watermark across the drawing, or both - the objection to a watermark being
that it degrades the very drawing someone is trying to read:

> *"Both. A watermark over the drawing that declares the drawing defective is a critical safety
> signal to NOT USE the drawing at the bench. As such, an unusable schematic doesn't need to be
> easy to read—it just needs to be possible to read"*

**This resolves the tension by reframing it rather than trading it off.** Readability is what a
RATIFIED sheet is for. An unratified one has a different job - to be inspectable without being
mistaken for buildable - and for that job the degradation IS the signal. The objection assumed
legibility was the constant; he made safety the constant and legibility the thing that gives way.

**It also sets the bar for the watermark precisely: POSSIBLE to read, not easy.** So a mark heavy
enough that nobody could mistake the sheet for a build document, and light enough that the geometry
underneath can still be examined - which is the whole point of not hiding it.

**THE LINE BETWEEN DEFECTIVE AND MERELY UGLY, decided 2026-10-27, and it REFINES G300's "wonky"
ruling rather than reversing it.** Asked whether a value label printed over a wire makes a drawing
defective - the consequence being that 6 of the 7 drawings this repository produces would be
watermarked, leaving one clean:

> *"it's ugly but usable. I want to preserve the warning watermark for schematics that are
> incorrect or otherwise should not be trusted or used"*

**So the watermark is for CORRECTNESS, not legibility.** A drawing that is wrong about the circuit
must not be built from. A drawing that is correct and hard to read is a drawing, and it ships.

**G300 recorded him as saying *"if the schematics are wonky, it's worse than having nothing at
all"*, and the gate built on it (`f42c129`) withholds a sheet carrying ANY fallback field
placement. That gate is now too strict and is amended by this.** *Wonky* meant **do not trust
it**, not **hard to read**. Recorded as a refinement because the earlier ruling is not withdrawn -
a drawing that cannot be trusted still must not reach the bench - and because this repository's
practice is to show a narrowing rather than edit it away.

**THE REPOSITORY HAD ALREADY HALF-DRAWN THIS LINE AND NEVER FINISHED IT.** `CLAUDE.md` says of the
missing-junction class that it is *"the one class that must keep refusing, because it makes a
drawing WRONG ABOUT THE CIRCUIT"*, and **G291** records the spec reserving the touching-glyph case
to the owner as *"possibly a CORRECTNESS class rather than a crowding one"*. The distinction
existed in two places as an aside. This makes it the organising principle.

**MEASURED, AND IT IS THE LARGER HALF OF THIS DECISION.** `[RAN]` `bun tools/schgen/board-sheets.ts`:
the four boards that refuse today split across exactly this line.

| board | refuses on | class |
| --- | --- | --- |
| `pultec-mid` | `circuit is invalid` - `SW_MID` pin 12 | **not drawable** - no geometry exists |
| `transistor-preamp-buffered` | clearance: power-symbol value overlaps pin text | **ugly, usable** |
| `transistor-preamp-loop` | clearance: power-symbol value overlaps pin text | **ugly, usable** |
| `transistor-preamp-staged` | clearance: value overlaps a label | **ugly, usable** |

**THREE OF THE FOUR REFUSE ON LEGIBILITY AND SHOULD DRAW.** The census goes from `7 of 11` to
`10 of 11`, one not-drawable, and - today - **zero defective**: no board currently fails a
correctness check, so the watermark has no subjects. That is the right state for a safety mark and
not evidence it is unnecessary; the junction check fired on this writer's `DOWN` probe within the
hour.

**AND IT REACHES THE TWO BOARDS HE IS BUILDING NOW.** `pultec-low-cut` (1 fallback) and
`pultec-low-boost` (5) become usable, so their build guides carry a schematic page **before** any
arrangement work, rather than after it. The drawings remain hard to read and that work still
matters; what changes is that he has something at the bench in the meantime.

**THE THREE STATUSES, as this decision leaves them:**

- **not drawable** - no geometry exists, and the reason is printed. There is no picture to show.
- **defective** - the drawing is wrong about the circuit. Watermarked, and it does not ship.
- **usable** - the drawing is correct. It may be ugly. It ships, and its findings travel with it.

- **Found** the drawing loop, 2026-10-27, on the first layout change attempted.
- **Evidence** his three messages above, quoted complete; the four-gate bypass sequence, each
  refusal text read from the tool's own output; the 351-site count, `[RAN]` in this tree.
- **Verified** **CONFIRMED by this writer.** The bypasses were run here against the installed
  KiCad, each restoring its patched files in a trap and `git status lib/` checked clean after every
  one. **Nothing is relayed.**
- **Why it is open** nothing is built. A spec is the next piece of work.
- **What would settle it.** **CRITERION, and it is his:** every board under `boards/` produces a
  drawing a person can look at, and each is classified ratified or unratified with its findings
  named - so that no board is invisible merely because it failed a check. **MECHANISM, UNTRIED**
  and deliberately not specified here: whether refusals become a status carried on the artifact
  (as `SheetDrawing.fieldFallbacks` already is, which is this pattern working in one place), or a
  separate emit path, is a design question the spec answers.

### G304 - OWNER DECISION, 2026-10-29: Microsoft SchGen is PARKED, not rejected, and the blocker he named is hardware

> *"re schgen, let's park it. I **am** interested in pursuing it later, but it
> may have to wait until I can build a more capable machine to run it on"*

**This is a declination with a stated intent to return, so it is not a closed
question - and nobody re-opens it unprompted.** What would change his answer is
a machine, not an argument.

**What was established before he parked it**, so that a later attempt starts
from the measurement rather than from scratch - the detail is in
`docs/research/2026-10-29-schgen-model-running.md` and every artifact named
there is on `tower.local`:

- The base model **runs** on a 15 GB CPU-only host at ~14 tok/s generation and
  ~12.0 GB peak RSS, leaning on swap. It is not comfortable and it did not fail.
- **The adapter is NOT attention-only**, which is what a partial verification had
  led this writer to brief. `adapter_config.json` carries `target_parameters`
  naming `mlp.experts.gate_up_proj` and `down_proj` on layers 7, 15 and 23:
  **73.5% of the trained parameters are on the MoE experts**, and their `lora_B`
  norms are 9.8-14.3 against 0.45-1.59 for attention, so they are trained rather
  than left at PEFT's zero init.
- The **stock `convert_lora_to_gguf.py` cannot convert it**, and the cause is the
  converter's name table rather than the architecture: llama.cpp's runtime
  already applies per-expert LoRA through `build_lora_mm_id`.
- A custom converter produced all **210 tensors**, and three negative controls
  establish that llama.cpp really binds them: a renamed expert tensor is
  rejected by name, a stack declaring 16 experts instead of 32 **core dumps**,
  the real one loads and generates.
- **Whether the fine-tune helps is NOT established.** On a 4-part RC filter it
  emitted SchGen's own idioms and fixed two base errors; on a 7-part circuit
  **the base model produced a correct program and the adapter produced prose
  with the wrong netlist**, and that held after the token-cap confound was
  removed by rerunning at `-n 6000`.
- **No emitted program was ever rendered**, so nothing here says whether any of
  them draws.

**THE CAUTIONARY ARTIFACT IS KEPT DELIBERATELY.** PEFT packs `lora_A`
expert-major and `lora_B` rank-major; a converter that slices both the same way
**converts, loads, runs and produces fluent output while being wrong**. That
file is on the tower as `schgen-lora-full-MISPACKED.gguf`, and it is the
standing evidence that a wrong adapter sounds fine - which is why the
reconstruction is argued from PEFT's source and shape compatibility and is
**not** checked end-to-end against the authors' merged weights. A bf16 20B merge
needs far more memory than that machine has, so that check is part of what the
more capable machine would buy.

**An incidental llama.cpp defect found on the way**, recorded because it is not
ours to fix and will bite anyone doing this again: load-time LoRA validation
compares only `ne[0]` and `ne[1]`, never `ne[2]`, so a wrong expert count passes
validation and segfaults during graph execution instead of refusing.

- **Found** 2026-10-29, running the model on `tower.local` at his instruction.
- **Evidence** his message above, quoted complete; the safetensors header read
  directly; the converter traceback at `conversion/base.py:625`; the three
  negative controls, each of which could have passed and did not.
- **Verified** **RELAYED.** The measurements are a subagent's, reported in the
  document named above; this writer confirmed the commits and the document exist
  and did not re-run the model.
- **Why it is open** it is his declination, held open by his own words.
- **What would settle it.** **CRITERION, and it is his:** a machine capable of
  running it. **MECHANISM, UNTRIED:** whichever of a larger-memory host or a
  supported GPU he builds - and the first thing to measure on it is the one
  check this machine could not do, the custom converter's output against the
  authors' merged weights.
