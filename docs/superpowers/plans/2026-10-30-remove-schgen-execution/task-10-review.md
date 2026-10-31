Task 10 review: the prose pass
==============================

Reviewer: review agent, 2026-10-31. Range `22e184e..5f1e906`, 7 commits, 14 files,
+807/-529. Inputs read: `task-10-brief.md`, `task-10-rulings.md`,
`task-10-report.md`, `review-22e184e..5f1e906.diff`.

**Marks used below:** `[RAN]` driven here by this reviewer; `[READ]` read here
from the tree or from git; `[RELAYED]` another agent's figure, not re-driven.

Two verdicts
------------

**SPEC COMPLIANCE: MEETS THE BRIEF AND RULINGS A-H, with three findings inside
the files those rulings govern.** All eight rulings were followed. Ruling D is
clean and I re-derived it rather than taking it: nothing in the record set is
`M` or `D` over the range. Ruling G's guard is green, I proved it still has
teeth, and no added or removed line falls inside any guarded block. Ruling A's
governance paragraph survives **byte-identical**, which I verified by segment
comparison rather than by clause grep. Ruling B is clean. The one declared
deviation (Ruling C's fourth falsehood) is in scope. What pulls this short of
unqualified is that the pass **introduced one new dangling command path** and
**one overstated pointer** in the two files Rulings A and C name, and left one
pointer into code this same plan deleted in the paragraph of `CLAUDE.md` that
exists to stop an agent re-asking an owner question.

**TASK QUALITY: STRONG.** The method the report claims — enumerate each
assertion of a rewritten paragraph and account for it as kept, corrected, or
deleted with a reason — is visible in the diff and holds everywhere I tested it.
Every factual claim I could resolve against the tree resolved, including the
five drafted-sheet sha256 prefixes, which match exactly. The three unruled
judgement calls (false-greens' head table, the deleted miscounts, the registry's
`notes` block) are each the defensible call. The defects are of one kind: the
**accounting of the work overstates the work by one row, one place and one
count** — a table short a row, a record claimed in two places and present in
one, and a clause count given as eight where the file had ten. In a task whose
whole subject is prose that claims more than the tree delivers, that pattern is
worth naming even though none of it is a false green.

Findings, ranked
----------------

### Critical

**None.** Specifically, and each checked rather than assumed:

- No owner verdict or dated record edited. `git diff --name-status 22e184e..5f1e906`
  intersected with Ruling D's set returns exactly `A docs/research/2026-10-30-schgen-removed.md`,
  which the brief's Step 5 requires. No `M`, no `D`. `[RAN]`
- No control character. All 12 surviving touched files scanned two ways — `grep -P
  '[\x00-\x08\x0B\x0C\x0E-\x1F]'` and a per-byte Python count — **zero in every
  file**, including `CLAUDE.md` (37,137 bytes) and `text-handling-research.md`
  (435,870 bytes). `[RAN]`
- The guarded deliverable is intact and its guard can still fail. `bun test
  tests/text-metrics/` is **44 pass / 0 fail, 179 expect calls**. `[RAN]` I then
  tampered with one line inside the first ` ```run ` block in memory and
  `verify` returned **1 failure naming the block at line 186**. `[RAN]` So the
  green is a green that could have been red.
- **No edit landed inside a guarded block.** I parsed the diff into new-file line
  numbers and intersected them with every fenced block in the new file: **0 of 61
  added lines and 0 of 14 removed lines fall inside any ` ```run `, `elk-run`,
  `label-run` or `field-order-run` block.** The only three in-fence additions are
  in a ` ```sh ` block. `[RAN]`
- `docs/schematic/false-greens.md` claims no guard that is not live. All three
  LIVE paths and both halves of the SPLIT row resolve; all five GONE guards are
  absent from the tree **and not relocated** (`git ls-files` finds no
  `pointers`, `claim-sweep`, `port-fidelity`, `port-manifest`, `field-order` or
  `label-freedom` source anywhere). `[RAN]`
- `git diff 22e184e..5f1e906 -- drafted/ schematic/readability-baselines.json` is
  empty, and the five sheets' sha256 prefixes are `a1fa4159 e9843e6d b9e42e6a
  5e1a4139 d4b0b8cc`, matching the findings document character for character.
  `[RAN]`
- `bun run typecheck` clean. `[RAN]`

### Important

**I-1. `TOOLING.md:78` introduces a new dangling command path — the task's own
defect class, added by the task.** The replacement sentence reads *"The intent is
verified against the netlist exported from the model instead -
`scripts/intent_vs_model.py`, named in step 1 below."* **There is no `scripts/`
directory at the repository root.** `[RAN]` The file exists only as a per-run
copy under `docs/research/2026-10-29-{hi-cut,hi-boost,low-cut,mid}-full-run/scripts/`,
and step 1 of the same file gives the full path correctly
(`TOOLING.md:152`). So the sentence that replaced a deleted command names a
path that does not resolve, two paragraphs above the one that does. Mitigating:
the pre-existing verification set already uses the same broken root-relative
convention (`scripts/junction_audit.py`, `scripts/textwidth.py`, both only
present under `docs/research/.../scripts/`), so the edit followed the file's
existing convention rather than inventing one. That is a reason it was easy to
miss, not a reason it is correct. **Settled by: writing the path step 1 writes,
or a relative form that resolves.**

**I-2. `CLAUDE.md:173-176` names a stronger check than exists — Ruling A's cost,
inverted.** The geometry bullet says *"`TOOLING.md`'s verification set names each
measure and the script that takes it."* `[READ]` The verification set is an
11-row table in which **four rows have an empty `how` column** (T-meetings and
their junction dots; per-net wire stroke consistency; wire count and total wire
length; and "true wire crossings", whose cell is prose rather than a script) and
only **two** name a script at all — one of which is I-1's non-resolving path.
Further, **"margins" is not a row in that table**; margins are discussed in the
repair-class section at `TOOLING.md:487-513`, a different part of the file.
Ruling A forbade inventing a replacement tool and the pass correctly invented
none; this sentence instead credits an existing table with coverage it does not
have, which is the same failure wearing the opposite sign. The bullet's own
closing clause — *"there is no single command here that reports them, and this
file is not the place to invent one"* — is exactly right and is what the rest of
the bullet should match. **Settled by: naming the measures the table actually
takes with a script, or saying plainly that most of the geometry measures are
taken by hand in the loop.**

**I-3. `CLAUDE.md:268` still points at code this plan deleted, in the paragraph
whose purpose is to stop an agent re-raising an owner question.** The *"BEFORE
YOU RAISE AN OWNER QUESTION"* passage says the fourth demand *"was answered in a
code comment written before the task began - `circuits/pultec/schematic/section-board.ts:162`"*.
That file was **deleted in `6085dc5`**, this plan's own generator-deletion
commit `[RAN]`, and the findings document's own relocation table (line 84)
records its switch-pin content moving to `circuits/pultec/physical/parts.ts`
*"doc comments verbatim"*. So the pointer that is supposed to let the next agent
find the answer now resolves to nothing, and the cost named in that paragraph —
an owner question that was never his, costing him attention and stalling the
boards — is the cost of this pointer failing. It is not a "generator is live"
sentence and not a command, so it sits outside the brief's literal Steps 1-2;
it is squarely inside the rulings' sweep statement, *"Task 10 corrects every
file whose prose reads as a LIVE INSTRUCTION"*, because "go read this file" is
one. A full dangling-path scan of `CLAUDE.md` finds this as the **only** live
pointer that fails: `lib/schgen/`, `tools/schgen/`, `tests/schgen/`,
`lib/kicad/schematic.ts` and `lib/schgen/ir/validate.ts` are all explicitly
declared deleted in the rewritten prose, `reference/` is the deliberately
absent directory, and the rest are bare basenames. `[RAN]` **Settled by:
repointing at `circuits/pultec/physical/parts.ts` and the line the comment
landed at.**

**I-4. `false-greens.md`'s new head table is one row short of the repairs it
claims to enumerate.** The table is introduced as *"Enumerated here rather than
rewritten clause by clause, so the list is checkable against the file."* I made
it checkable: scanning the file at `22e184e` for every *"What guards against it
here"* paragraph naming a `lib/schgen/`, `tools/schgen/` or `tests/schgen/`
path returns **ten** mechanisms — 4, 8, 10, 12, 14, **16**, 19, 23, 28, 29.
`[RAN]` The table has **nine rows and omits mechanism 16**, whose clause named
`tests/schgen/text-metrics/document-pastes.test.ts` and **was** repaired in
place (the third of the three in-place repairs, at line 591 of the new file).
So the enumeration a reader is invited to check against the file is short the
row that explains one of the three repairs they will find. The report's own
breakdown — *"three LIVE and moved, five GONE, one SPLIT"* — is consistent with
ten once row 12 (LOG LIVE, PROBE GONE) is counted, so the classification work
was right and only the table lost a row. This is a bookkeeping defect in an
index, not a false green: nothing claims a dead guard is live, and I confirmed
every LIVE claim resolves. But the file whose subject is *checks that lie* now
carries an enumeration that is wrong about its own scope, which is close enough
to its own mechanism 23 to be worth the row. **Settled by: adding the mechanism
16 row.**

**I-5. The last present-tense live-generator claim in the repository is recorded
in one place, not the two the report and the findings document both assert.**
`schematic/readability-baselines.json`'s `notes` block says, in the present
tense, that *"the loader refuses"* three separate things and that schema 1
*"names the twelve fields `lib/schgen/readability/baseline-model.ts` declares"*.
`[READ]` There is no loader. The findings document (§5) records this correctly
and in full, and says *"`schematic/README.md` is where the correction lives"*;
the report says the same. **`schematic/README.md` never mentions the `notes`
block** — I read the whole 3,575-byte file; it says the registry *"NOW HAS NO
LOADER AT ALL"*, which implies the notes are stale but never names them, and a
reader who opens the JSON and reads its notes has no local correction and no
pointer to one. `[RAN]` **The decision not to touch the JSON bytes is the right
call** and I would not have it otherwise: the standing gate requires that diff
empty, and `CLAUDE.md`'s acceptance-criteria invariant makes the owner's
reserved channel his to settle, not an agent's. What is wrong is only the claim
about where the record is. `schematic/README.md` is prose, outside the gate, and
one sentence there naming the `notes` block costs nothing. **Settled by: that
sentence.** On the brief's question — yes, this now needs the owner decision
that `schematic/README.md` already raises; it is the last such claim in the
tree, and the two answers it admits (keep it and give it a reader, or retire the
file) are both already written down.

### Minor

**M-1. The report says "eight" clauses where the file had ten**, and its own
category breakdown sums to ten. A miscount in the account of a counting defect,
in the same report that correctly identifies a fourth instance of that pattern
elsewhere (Concern 4).

**M-2. The findings document quotes a gate expression that is red at `HEAD`.**
§8's table says *"with `git diff -- drafted/ schematic/` empty"*. Over this
range `git diff --name-only 22e184e..5f1e906 -- schematic/` returns
`schematic/README.md`. `[RAN]` The figure is attributed `[task-9]` and was true
when Task 9 took it; the standing gate this task was actually held to is
`drafted/` plus `schematic/readability-baselines.json`, which I verified empty.
A reader who runs the expression as written gets a non-empty diff and may read
it as a changed sheet.

**M-3. `m1-remeasurement.md:84` keeps a live markdown link to the deleted
`template-parity-anchors.md`, and the justification cites the wrong ruling.**
The report leaves it under Ruling D's *"a citation in these that resolves to
nothing is inert"*. Ruling D governs files that **may not be edited**;
`m1-remeasurement.md` is edited in this same commit under Ruling F. So the
inert-citation licence does not cover it, even though the outcome is tolerable
(`docs/schematic/README.md`'s new notice explains the deletion, and `CLAUDE.md`
accepts inert references generally). One clause beside the link was available at
zero cost. Ruling E's requirement itself is met: the only non-record citations
of the two deleted files are that link and the explanatory notice. `[RAN]`

**M-4. Two prose survivors of the completeness grep are unjustified.** The
report justifies its survivors file by file but names neither
`docs/schematic/elk-spike.md` (one mention, inside a dated *what this does not
cover* list, past tense, inert) nor `lib/kicad/symbols/PROVENANCE.md` (two
mentions, already corrected to past tense by Tasks 6 and 9). `[RAN]` Both are
benign and neither reads as a live instruction, so this is a gap in the evidence
rather than in the work.

**M-5. `text-handling-research.md`'s three added annotations sit after the fence,
where Ruling F's standard for the other two files is a heading before it.** At
lines 822, 3528 and 4388 the ` ```sh ` block still contains `bun run
tools/schgen/.../probe.ts` verbatim, with **DELETED - see the notice at the head
of this document** on the prose line following. `m1-remeasurement.md` and
`reference-graph-checks.md` both put the deletion notice **above** their command
blocks, with the reasoning that *"a heading is the part that gets obeyed"* —
which is the right reasoning and argues against the placement chosen here.
Ruling G, not F, governs this file and required only the two §1 command lines,
so this is a consistency observation, not a ruling breach. The document-head
notice does cover it.

**M-6. `README.md:47` compresses a real coverage change into a sentence that
reads as "nothing changed."** *"The `kicad-cli` proof the stub was being kept for
did not depend on the stub"* — the deleted tests **did** import
`writeSchematicStub`; what survived the deletion is the comparison
(`expectSameCircuit`/`toImportedNetlist`), not the arm that wrote a fresh sheet
from the model and exported it. The paragraph discloses this two sentences
later (*"which run `kicad-cli` on the committed `.kicad_sch` instead of on a
freshly written stub"*) and the findings document states it precisely (*"No test
will again write a fresh throwaway stub and export it — that exact description
is gone"*). So the claim is not false and the loss is not hidden; the opening
clause is just stronger than the body supports.

**M-7. The new document-head notice in the guarded research document carries
unmarked figures.** *"44 cases on every `bun test`"* and *"each verified
byte-identical to the original by sha256"* appear without the `[RAN]`/`[READ]`/
`[RELAYED]` mark that document's own convention requires of a figure. Both are
true — the 44 I drove myself — but the mark is the thing that distinguishes a
driven figure from a remembered one, and this notice is the first thing a reader
sees.

Ruling-by-ruling
----------------

| ruling | verdict | evidence |
| --- | --- | --- |
| **A** no replacement tool invented; governance verbatim | **MET** | The census block from *"This paragraph used to carry the census"* to *"KiCad and VeroRoute are primary tools"* is **byte-identical** between `22e184e` and `5f1e906`. `[RAN]` So the board count `0 1 2 5 6 7 10`, the three-files-disagreeing incident, *a stale cause is worse than a stale count*, *a figure is not quotable without its second column*, the gate-nobody-can-see-past directive and the owner's 2026-10-27 quotation all survive, and I did not have to grep for them individually. No tool is invented; the bullet says so in terms. Qualified by **I-2**. |
| **B** no forward reference to unbuilt `make` targets | **MET** | `make draw` and `make draught-doctor` appear in no added line anywhere in the range. `[RAN]` |
| **C** `TOOLING.md` falsehoods and nothing more | **MET, with the declared addition in scope** | The three named are corrected. The fourth — `tools/draught/gate.ts` *"is committed"* — is the same statement class (a deleted file described as present), the file went in `38c147c` with the three CLI verbs `[RAN]`, and it is written as a widened gap (*"Read that as a gap, not as a resolution"*), not a resolution. Nothing structural moved. **Keep it.** Qualified by **I-1**. |
| **D** records untouched | **MET, re-derived** | `git diff --name-status 22e184e..5f1e906` over the record set: one line, `A docs/research/2026-10-30-schgen-removed.md`. `[RAN]` Both dated `docs/schematic/2026-10-26-*` reviews, `verdicts.md`, `schgen-development-history.md`, `docs/known-gaps.md`, `docs/superpowers/`, `DEVELOPMENT-LOG.md` and all five `RECORD.md` untouched. |
| **E** the two parity documents deleted | **MET** | Both `D` in `608b1fd`. Their rows are gone from `docs/schematic/README.md` and the deletion is explained at that file's head. Non-record citations: only M-3's link. |
| **F** measurements kept, instruction lost, the pointer fact carried | **MET** | Both files head their command block with the deletion, naming `6085dc5`, and both state the doc-to-test fact **explicitly**: *"AND NOTHING IN THIS REPOSITORY GUARDS A DOC-TO-TEST POINTER ANY MORE"*, with the 17-row self-pinning whitelist as the reason annotation is the remedy. Not implied — stated, in both. `reference-graph-checks.md`'s section title is changed from *"How to re-run everything here"* to *"Where everything here came from - AND NONE OF IT CAN BE RE-RUN"*. The counts in the new headings check out: m1's eight commands are five `tools/schgen/` scripts plus three `tests/schgen/` tests; reference-graph's are four `tests/schgen/gates/` tests plus `gate-census.ts`. `[RAN]` |
| **G** the hazard | **MET, and the strongest-evidenced ruling on the task** | 44/0 `[RAN]`; teeth proven by tampering `[RAN]`; zero edits inside any guarded block, computed from the diff rather than inspected `[RAN]`; and the **newly added** CLI instruction actually runs — `bun run tools/text-metrics/verify-pastes.ts docs/schematic/text-handling-research-logs/text-metrics-probe-run.log` exits **0** with *70 fenced blocks: 14 VERIFIED, 56 declared NOT probe output, 0 FAILED*. `[RAN]` A replacement instruction that itself does not run would have been the same defect one line later; this one does. |
| **H** `schematic/README.md` past tense, question intact | **MET** | Past tense throughout; *"NOW HAS NO LOADER AT ALL"*; the question is still a question (*"THE QUESTION IS STILL OPEN AND IT IS THE OWNER'S"*) with the acceptance-criteria invariant as the reason, raised and not decided. The repoint away from the gitignored `.superpowers/sdd/.../task-7-report.md` to `docs/research/2026-10-30-schgen-removed.md` is correct and is required by `CLAUDE.md`'s own rule about gitignored pointers. Qualified by **I-5**. |

The implementer's six concerns, judged
--------------------------------------

**1. "Five approved pages" — the implementer is right and handled it correctly.**
`[RAN]` Four of five `RECORD.md` files carry `AWAITING RE-APPROVAL` (hi-boost,
low-boost, low-cut, mid); only `pultec-hi-cut` is approved in its current state.
The prose asserts **no** approval status: `CLAUDE.md` says the directories carry
*"the sha256 the verdict is bound to - and whether that verdict still holds for
the bytes now on disk"*, names `docs/schematic/verdicts.md` as the authority and
cites `EVALUATING-DRAWINGS.md` §5, whose heading is *"Approval is state the
reviewer writes. It is never derived"* — the right section. `[READ]` **No
surviving "five approved" claim exists in any of the 14 touched files.** `[RAN]`
The propagating instance is `tests/circuits/drafted-kicad-round-trip.test.ts:37`
(*"The five boards with an approved page under `drafted/pultec/`"*), which this
diff does not touch and which is therefore out of Task 10's scope — correctly
flagged for whoever owns that file.

**2. The registry's `notes` block — right call, overclaimed record.** See
**I-5**. Leave the bytes; add the sentence; the owner decision is already raised.

**3. `elkjs` — coherent, and the README sentence is itself the record.** The
declaration is present and nothing imports it `[RAN]`; calling it dead weight is
the true statement about a declared-but-unimported dependency, and removing it
is a `package.json` plus `bun.lock` change, which a prose pass should not make.
`CLAUDE.md`'s *"a defect you are not fixing goes in a comment beside the code"*
is satisfied by naming it in the prerequisites list where a reader looking for
prerequisites will meet it. **No finding.**

**4. The two deleted miscounts — correct, and for the stated reason.** *"A figure
in prose is a transcription with a date on it"* is exactly the rule for a count
that had already been corrected once and was wrong again; the tables are the
list, and the new text names it as the fourth instance of the file's own
pattern rather than quietly fixing a number. **This is the right call**, and it
is the same call `CLAUDE.md` made when the owner struck its own census.

**5. The fourth `TOOLING.md` falsehood — in scope.** See Ruling C above.

**6. `build/schgen-*` left and recorded — correct.** Untracked, covered by
`.gitignore`'s `build/`, and the `.gitignore` comment Task 9 wrote anticipates
exactly this. I verified `.gitignore` needed nothing: `dfd629e` already
replaced the two entries with the comment naming the plan. `[RAN]`

And the report's one unaccounted assertion, verified independently
-----------------------------------------------------------------

The report says `CLAUDE.md`'s worked-example bullet cited the file for a phrase
— *"the only thing that answers this question"* — that **appears nowhere else in
`CLAUDE.md`**. `[RAN]` Confirmed: `git show 22e184e:CLAUDE.md | grep -c` returns
**1**, the self-citing line itself. One correction to the report's reading: the
phrase is not a self-reference to an edited-away sentence — it is the **owner's**
wording, recorded at `docs/known-gaps.md:24` (*"`bun tools/schgen/board-sheets.ts`
is the only thing that answers this question"*) and quoted again in a
2026-10-27 task report. `[READ]` So the bullet cited the wrong file for a real
quotation, rather than citing a sentence that had ceased to exist. The remedy
taken is unaffected and the replacement — naming the live worked example and
saying *"it is deleted - which is the rule arguing for itself"* — is right.

What I ran, and what I reasoned about
-------------------------------------

**Ran `[RAN]`:** the control-character scan, two ways, on all 12 surviving
touched files; the Ruling D `--name-status` intersection over the whole range;
`git diff -- drafted/ schematic/readability-baselines.json`; `bun run typecheck`;
`bun test tests/text-metrics/`; a teeth test that tampered with one line inside
a guarded `run` block in memory and confirmed a named failure; a diff-to-fence
intersection computing every added and removed line against every fenced block
in both versions of the guarded document; the newly added `verify-pastes.ts` CLI
instruction, to exit code; existence of all three LIVE and both SPLIT-live paths
in `false-greens.md`; absence **and** non-relocation of all five GONE guards;
a byte comparison of `CLAUDE.md`'s census governance block old against new;
`sha256` of all five drafted sheets against the findings document's prefixes; the
Ruling B grep; a forbidden-vocabulary grep over every added line (the six
`clean` hits are `git clean -fdx` and `typecheck` clean — none is about a
drawing); an AI-attribution grep over all seven commit messages (none); a
repo-wide `schgen` survivor sweep over `.md` with the record set excluded, plus
a command-shaped-line sweep; a resolution check on every relative link and every
backticked path in the added lines; the command counts in both Ruling F
headings; the existence of `scripts/`, `scripts/intent_vs_model.py`,
`scripts/junction_audit.py` and `scripts/textwidth.py`; `tools/draught/gate.ts`'s
deletion commit; `tools/guide/placement.ts` and `render-edges.ts`; the
`.gitignore` state and the commit that set it; the `RECORD.md` approval states;
and the `docs/schematic/` index-completeness check.

**Reasoned about, not re-driven `[RELAYED]`:** Task 9's `bun test` **2714 pass /
258 files** and `make check` **four FAIL / seven ok** figures, and the five
guides' page counts — all attributed `[task-9]` in the findings document, which
also states plainly that the prose pass drove only typecheck, the text-metrics
suite and the `drafted/` diff. **That attribution satisfies "a skipped check
must never look like a passing one"**: the document separates `[task-9]` from
`[RAN]` in two adjacent blocks and says the full suite was not re-run here or
run beside `make check`. I did not run the full suite or `make check` either,
and this review claims nothing about them. Also not re-driven: whether the owner
wants the readability-baselines channel kept, and whether the `elkjs`
declaration should go — both are his, and both are correctly raised rather than
decided.

Recommendation
--------------

**Accept, with I-1, I-2, I-3, I-4 and I-5 as required follow-ups.** All five are
one-to-three-line prose edits in files this task already owns; none needs a
measurement, a new tool or an owner decision, and none of them is in the
guarded document. The minors are optional, except that **M-1 and M-2 should be
corrected in the report and the findings document respectively** rather than
left, since both are figures about figures and this plan's record is where the
next reader will go.
