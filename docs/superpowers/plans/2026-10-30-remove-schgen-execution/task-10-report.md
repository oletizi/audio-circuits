# Task 10 report: correct the prose that tells agents what to do

**Status: DONE_WITH_CONCERNS.** Seven commits on `feature/schematics-tooling`,
base `22e184e`, **not pushed** — push is the controller's call. Every gate green.
The concerns are findings, not failures: three defects that pre-date this plan
and one file the standing gate forbade me to repair.

| SHA | what |
| --- | --- |
| `7fd5c5a` | `CLAUDE.md` — the generator sentence, the two deleted commands, the `validate.ts` claim, the worked example |
| `f64b421` | `README.md` — five regions of live instruction |
| `f8989fc` | `TOOLING.md` — four false sentences (ruling C named three) |
| `608b1fd` | the `docs/schematic/` + `schematic/` sweep — rulings D, E, F, G, H |
| `d11b51c` | the findings document, plus two forbidden-vocabulary repairs in lines this pass added |
| `604837a` | `text-handling-research.md` — three more re-drive instructions the first pass missed |
| `5f1e906` | the two deliberate non-edits, recorded in the findings document |

## Gates

- **`bun run typecheck`: clean.** Run after every commit.
- **`bun test tests/text-metrics/`: 44 pass / 0 fail**, 179 expect calls, 1 file.
  Run **five separate times** — before the first edit to the guarded document,
  after it, and after each of the four edits in `604837a`. This is ruling G's
  proof.
- **`git diff -- drafted/ schematic/readability-baselines.json`: empty.**
- **The brief's Step 4 grep, run per prose commit: no output** for `7fd5c5a`,
  `f64b421`, `f8989fc`, `608b1fd`. Over the whole range `22e184e..HEAD` the only
  path in the record set is `A docs/research/2026-10-30-schgen-removed.md` — an
  **add**, which Step 5 asks for. **No `M` and no `D` anywhere in the record
  set**, which is the form of the claim that matters: `docs/known-gaps.md`,
  `docs/research/`, `docs/superpowers/`, `DEVELOPMENT-LOG.md`,
  `docs/schematic/verdicts.md`, the two dated `docs/schematic/2026-10-26-*`
  reviews, `schgen-development-history.md` and the five `drafted/` `RECORD.md`
  files are untouched.
- **Working tree empty** after the last commit.
- I did **not** run a full `bun test`. Nothing I changed is executable, the
  guarded document's own 44 cases are the only suite coupling, and the brief
  warns the full run segfaulted once under load. Task 9's figures are quoted as
  read from its report, which the brief instructed.

## Rulings A–H: what I did, and where I deviated

**A — no replacement tool for `board-sheets.ts`, and `CLAUDE.md` must not invent
one. FOLLOWED, no deviation.** The paragraph now names three things and says of
each that it is not a census tool: the `drafted/` directories with their
`RECORD.md` digests for which boards have a page (with
`docs/schematic/verdicts.md` as the authority for a verdict and
`EVALUATING-DRAWINGS.md` §5 for why status is never derived);
`tests/circuits/drafted-kicad-round-trip.test.ts` and its `transistor-preamp`
sibling for whether a page still says what the model says; and `TOOLING.md`'s
verification set for geometry, stated as a set of scripts with **"there is no
single command here that reports them, and this file is not the place to invent
one."** The governance survives verbatim — I checked it clause by clause: *a
figure in prose is a transcription with a date on it*, the board count reading
`0 1 2 5 6 7 10` in nine days, *a stale cause is worse than a stale count*, *a
figure is not quotable without its second column*, and the
gate-nobody-can-see-past directive with the owner's words. **Only the two
commands and the generator sentence changed.**

**B — no forward reference to `make draw` or `make draught-doctor`. FOLLOWED.**
Neither string appears in anything I wrote. Verified by grep across the diff.

**C — `TOOLING.md` gets its falsehoods corrected and nothing more. FOLLOWED
WITH ONE ADDITION, declared.** The three the ruling named are done: the
`lib/schgen` sentence at the stance section, the bun justification in the
toolchain table, the `board-sheets` command in the tsx correction. **I corrected
a fourth**: the not-covered list said `tools/draught/gate.ts` *"is committed and
known inadequate"*, and it went in `38c147c` with the three CLI verbs. I read
that as inside *"its falsehoods"* rather than beyond it — it is the same
statement-type as the other three, a deleted file described as present — and I
wrote it as a **widened gap rather than a resolution**, because the hole the
entry named is still open and there is not even an inadequate check in it now.
**Nothing structural changed**; Task 6 of the institutionalisation plan still
owns the file's shape. **If the controller reads the addition as scope, revert
that one hunk** — it is a self-contained three-line replacement in `f8989fc`.

**D — what is a record and may not be edited. FOLLOWED, and verified
mechanically**, not by inspection: see the Step 4 grep above, which I widened to
`--name-status` over the whole range so a modify or delete in the set would show
as `M` or `D`. One judgement call inside the ruling: `docs/schematic/m1-remeasurement.md`
line 65 links to the now-deleted `template-parity-anchors.md`. **I left it**, as
ruling D's *"a citation that resolves to nothing is inert"* and `CLAUDE.md`'s
same clause allow, and ruling F scopes my edits to that file to the command
block's heading.

**E — `template-parity.md` and `template-parity-anchors.md` DELETED, not
annotated. FOLLOWED.** `git rm`, both of them, in `608b1fd`. Their one live
citation — the two rows in `docs/schematic/README.md` — is removed and the
notice at the head of that file says what went and why. Their citation from the
dated 2026-10-26 governance review is left inert per ruling D.

**F — `m1-remeasurement.md` and `reference-graph-checks.md` keep their
measurements and lose their instruction. FOLLOWED, with the Task 9 finding
carried into both headings.** Each command block is headed with the fact that
every command in it is deleted, naming `6085dc5`, and with **"NOTHING IN THIS
REPOSITORY GUARDS A DOC-TO-TEST POINTER ANY MORE"** plus why that makes
annotation the remedy: `tests/schgen/pointers.test.ts` was a 17-row whitelist
that pinned its own population and every row cited a file inside the deleted
tree, so a repaired citation would be held to nothing and the next to rot would
do it silently. `reference-graph-checks.md`'s section title changed from *"How
to re-run everything here"* to *"Where everything here came from - AND NONE OF
IT CAN BE RE-RUN"*, because a heading is the part that gets obeyed. Its headline
is also re-cast from pending to permanent: gate 8 never ran against a generated
drawing and there is no longer a generator for it to run against.

**G — THE HAZARD. FOLLOWED, and the guard is green at every step.** Both of
`text-handling-research.md`'s §1 command lines are corrected, and a second sweep
for command-shaped lines found **three more I had missed** — one per probe, each
followed by *"re-drives every figure in this section from a clean checkout"* and
each naming the checker at its old `tests/schgen/` path. Fixed in `604837a` with
a document-head notice plus a one-line marker after each block, because a reader
lands on a section without reading the head of a 435 KB document. **Every edit
is in a ```sh block or in prose, never in a guarded ```run block**, which is
structural rather than careful: the checker's own rule is that a `run` block
must be a contiguous unique slice of a named log section and any other block
must share no line with the log, and a `curl`/`bun`/path sentence is not a log
line. **I changed no log and no `run` block.** `bun test tests/text-metrics/` is
44 pass / 0 fail, run separately after each edit. The log paths inside the dated
provenance sentences are left as written — those sentences record where a figure
came from — with the current directory given in the notice and in each marker.

**H — `schematic/README.md`. FOLLOWED.** Rewritten in the past tense; it says
plainly that `readability-baselines.json` **now has no loader at all**, with the
Task 7 measurements kept (one commit `b526c1d`, `"baselines": []`, zero entries
ever). **The question is intact and still the owner's**, with `CLAUDE.md`'s
acceptance-criteria invariant as the reason it is his. One change beyond the
ruling: its pointer to the full measurement was
`.superpowers/sdd/.../task-7-report.md`, and **`.superpowers/` is gitignored**,
so by `CLAUDE.md`'s own rule that pointer was into something invisible to review
and destroyed by `git clean -fdx`. Repointed at
`docs/research/2026-10-30-schgen-removed.md`, which carries the measurement.

## What the sweep found that the brief and the rulings did not name

The rulings said README.md had four regions and six files carried dangling
commands. Beyond those:

1. **`README.md`'s fifth region** — the `kicad-cli` prerequisite bullet claimed
   those five tests prove KiCad reads *"a generated schematic stub"*. The five
   per-board tests that carried that claim are deleted with the writer and the
   claim moved to the two round-trip files.
2. **`SCHGEN_SOURCE` had three sites in `README.md`**, not one: the
   prerequisites bullet, a row in the what-its-absence-does table, and the
   `bun test` usage comment. Nothing reads the variable now.
3. **`docs/schematic/false-greens.md` was the worst file in the sweep** and the
   rulings did not name it. **Ten of its "what guards against it here" clauses
   named a guard inside the deleted tree** — which makes a catalogue of false
   greens claim protection it has lost, itself a false green, in the file
   `CLAUDE.md` and `TOOLING.md` both send readers to. They are now enumerated in
   a table at the head of the file, mechanism by mechanism, each marked LIVE,
   GONE or SPLIT. **This sentence said "eight" and the table had nine rows where
   the file has ten clauses** — corrected in fix round 1 under I-4 and M-1; the
   table now carries the recipe for re-deriving its own scope instead of a
   count. The live ones' paths are repaired in the clauses themselves (a live guard at a
   dead path is that file's own mechanism 10 recurring); the dead ones are left
   as written and answered in the table, because repairing one would mean
   inventing a replacement guard. **No quoted span was touched** — mechanism 8's
   `schgen` mention is inside a `G266` quotation and is left exactly as it is.
4. **`docs/schematic/text-placement-prior-art.md` §7 and §8** inventory, clause
   by clause, every module the deletion removed, with design advice attached
   (*"nothing requires replacing any of it"*, *"the repository has it in the
   wrong place"*). Headed with a notice; its one claim about a surviving module
   is confirmed live (`tools/guide/placement.ts`, `render-edges.ts` — both
   present, checked).
5. **`docs/schematic/text-handling-report.md`** cites
   `bun tools/schgen/board-sheets.ts` as its own `[RAN]` work. The mark stands,
   the command is annotated as deleted.
6. **`.gitignore` needed nothing.** Task 9 (`dfd629e`) had already replaced its
   two `build/` entries with a comment naming the plan. Verified, not edited.

## Concerns

**1. The `drafted/` pages are not all approved, and my brief said they were.**
The dispatch said *"Five Pultec boards have approved pages."* **Four of the five
`RECORD.md` files say AWAITING RE-APPROVAL** — hi-boost, low-boost, low-cut and
mid — each because the page was re-papered or re-drawn after its verdict and a
verdict is bound to bytes. Only `pultec-hi-cut` says APPROVED in its current
state. So **I wrote no prose asserting an approval status anywhere**: `CLAUDE.md`
now says the directories hold *"the sha256 the verdict is bound to - and whether
that verdict still holds for the bytes now on disk"*, with
`docs/schematic/verdicts.md` as the authority and `EVALUATING-DRAWINGS.md` §5
cited for why no check and no agent may advance a page's status. The findings
document says the same and says explicitly **not to quote "five approved pages"
from it.** Flagged because the phrase is in my brief and in several surviving
test-file comments, and it will keep propagating.

**2. `schematic/readability-baselines.json`'s own `notes` block describes its
deleted loader in the present tense, and I did not fix it.** Three separate
sentences say what *"the loader"* refuses. There is no loader. **The standing
gate is that `git diff -- drafted/ schematic/*.json` is empty**, so repairing it
would have broken the gate I was told to pass, and a registry whose only content
is a schema plus the owner's reserved channel is not a file I should edit on my
own reading. Recorded in the findings document §5 and in `schematic/README.md`
instead. **This is the one place in the repository where instructional text still
describes the generator as live, and it is deliberate.** Whoever answers the
open question settles it: kept, it needs a reader and the sentences become true;
retired, the file goes.

**3. `elkjs` 0.9.3 is declared in `package.json` and nothing imports it.** The
generator was its only consumer; the only mentions left in the tree are the
declaration, `bun.lock` and the research documents. I corrected `README.md` to
call it dead weight rather than a prerequisite and did **not** remove the
declaration — that is a `package.json` change and a dependency removal, not
prose. It wants a one-line commit by someone whose task that is.

**4. A pre-existing counting defect in `docs/schematic/README.md`, unrelated to
the generator.** It said *"SEVEN later documents"* over two tables holding
**eight** rows, and introduced the second as *"the remaining five"* over
**six** — both understated by one, and the file had already corrected that
number once without either figure matching what it indexed. Fourth instance of
the pattern its own inventory note records three of. **I deleted both counts
rather than correct them a second time**, leaving the tables as the list, which
is what `CLAUDE.md`'s *a figure in prose is a transcription with a date on it*
asks for. Counted off the file at `HEAD` before the edit.

**5. `README.md`'s TOOLING.md row said "the six known repair classes" where
that file says eight and says the set is not closed.** Count deleted rather than
updated, same reason.

**6. Untracked `build/schgen-boards/` and `build/schgen-defective-fixture/`**
may still sit on a working tree with a `STATUS.md` and `RENDER-REPORT.md` per
board — stale derived artifacts of a deleted generator. They are covered by
`.gitignore`'s `build/`, exactly as that file's comment anticipated, so they are
not repository content and no checkout gets them. I left them and recorded them;
`git clean -fdx` removes them.

## Method note

For every paragraph rewritten I enumerated its assertions and accounted for each
as kept, corrected, or deleted with a reason. Two worth stating because they are
deletions rather than corrections:

- **`CLAUDE.md`'s "read G81 before you reach for it for anything"** is deleted,
  because the stub it guarded is deleted; there is nothing to reach for.
- **"Say 'stub' when that is what you made"** is **kept verbatim**, because it
  was never about `lib/kicad/schematic.ts` — it is the rule against describing
  what you produced as more than it is.

And one assertion I could not account for, which is the finding form the brief
asked for: **`CLAUDE.md`'s worked-example bullet said `board-sheets.ts` was the
example "and this file already says it is *the only thing that answers this
question*"** — **that quoted phrase appears nowhere else in `CLAUDE.md`.** It was
a self-reference to a sentence that had already been edited away, so the bullet
was citing the file for something the file no longer said. Replaced with the
live worked example, and the rot named in place: *"it is deleted - which is the
rule arguing for itself, since a command in prose rots exactly as a figure
does."*

No subagent was dispatched. No control-character escape was typed into a tool
parameter; every edited file was byte-counted for NUL and CR after each edit
(all zero, every time). No `sed` write, no `#` inside a heredoc — every
multi-line commit message went through a file and `git commit -F`. No AI
attribution in any commit message.

---

# Fix round 1

**Status: DONE.** Two commits, `2642afb` and `5149f56`, on
`feature/schematics-tooling`, base `5f1e906`. Not pushed. All five Importants
taken; **all seven Minors taken.** Nothing disputed.

**Gates re-run:** `bun run typecheck` **clean**; `bun test tests/text-metrics/`
**44 pass / 0 fail**, 179 expect calls, driven after each of the four edits to
the guarded document separately; `git diff -- drafted/ schematic/readability-baselines.json`
**empty**; **control-character scan over all twelve touched files: zero in every
one** (per-byte count, anything below 32 except tab and newline);
**Ruling D intersection re-derived over `22e184e..HEAD` including both fix
commits: one line, `A docs/research/2026-10-30-schgen-removed.md`** — no `M`, no
`D`; forbidden-vocabulary grep over every line added since `5f1e906`: none.

## The Importants

**I-1 — `TOOLING.md:78`'s new dangling path. FIXED, and it was the worst of the
five because the task introduced it.** Repointed at
`docs/research/2026-10-29-low-cut-full-run/scripts/intent_vs_model.py`, the path
step 1 of the same file writes. **Driven**: that path resolves on disk and
`scripts/` does not exist at the repository root. I added a clause saying the
full form is deliberate, because the file's own verification set uses the bare
`scripts/…` convention that resolves only from inside a run directory — so
without that clause the next editor would "fix" my path back to the broken
shorthand to match its neighbours. The reviewer's mitigation (the edit followed
the file's existing convention) is true and is not a defence; a convention that
does not resolve is the defect, and I propagated it.

**I-2 — `CLAUDE.md` crediting the verification set with coverage it lacks.
FIXED.** The bullet now says what the table is: *"a list of measures and NOT a
toolkit"*, two rows naming a script (both per-run copies under `docs/research/`),
a few naming `kicad-cli` or a counter in the loop, **and the rest naming no
command at all, carrying a caution or a definition where a tool would go,
because nobody has written one** — so most of the geometry is taken by hand in
the loop. It also tells the reader to go by each row's second column and **not
to read a measure's presence in the table as a measure something runs**, which
is the generalisable form of the error. "Margins" is removed from the bullet's
list; they are in the repair-class section, as the review says.

**One deliberate departure from the reviewer's framing**, declared: I gave **no
tally** of the rows. I drafted the bullet with the review's own counts in it,
then struck them — a count of another file's row types is one more figure in
prose, and `CLAUDE.md` is the file that holds *"a figure in prose is a
transcription with a date on it"* six lines further down. (My draft also got one
of them wrong, which is the argument.) The qualitative statement is checkable
against the table and does not rot when a row gains a script.

**I-3 — `CLAUDE.md:268` pointing into code this plan deleted. FIXED, line
verified by reading it.** Now `circuits/pultec/physical/parts.ts:245`, and
that line is *"`SW_Rotary_1x6_MP` also carries a mounting pin `MP`, which is a
mechanical pad and is on no net"* — the comment the paragraph quotes, moved with
`POLE_PIN` by Task 2. The old citation is shown struck rather than edited away,
with the reason stated: a dead pointer **in that paragraph specifically**
defeats the paragraph, whose whole purpose is to stop an agent spending the
owner's attention on a question that was never his. **I accept the reviewer's
scope argument without reservation** — *"go read this file"* is a live
instruction, so this was inside my sweep and I missed it.

**I-4 — `false-greens.md`'s head table one row short. FIXED, and the fix is
mechanical rather than a count.** Mechanism **16** is added (*"a gate that stops
checking the input it cannot score"*), marked LIVE and moved, with its remedy
noted as untouched. **Instead of publishing a corrected count I wrote the
re-derivation recipe into the table's intro** — scan the file at `6085dc5^` for
every *"What guards against it here"* paragraph naming a `lib/schgen/`,
`tools/schgen/` or `tests/schgen/` path — and recorded the omission there rather
than quietly filling it, because an index wrong about its own scope is that
file's own subject. **Driven**: the recipe returns `4 8 10 12 14 16 19 23 28 29`
and the table's rows are exactly those ten, in that order. The review's
diagnosis was right in both halves — the classification work was sound and only
the table lost a row.

**I-5 — the last live-generator claim recorded in one place, asserted in two.
FIXED in `schematic/README.md`; the JSON is untouched.** That file now quotes
the three stale `notes` clauses, states that there is no loader and that nothing
in the JSON refuses anything, says the bytes are deliberately untouched and
gives all three reasons (the owner's reserved channel, the acceptance-criteria
invariant, the standing gate), and says plainly that **this is the last place in
the repository where text describes the generator as live.** It closes by tying
the `notes` block to the open question: kept, the registry needs a reader and
those sentences become true again; retired, the file goes and they go with it.
`git diff -- schematic/readability-baselines.json` is empty.

## The Minors — all seven taken

**M-1 (eight vs ten). TAKEN, corrected in place as well as here.** The concern-3
sentence now reads *"Ten"*, and I replaced its category tally with the mechanism
list and a note that the sentence said eight and the table had nine where the
file has ten. A tally in a report about a counting defect is the same trap, so
it is gone rather than corrected.

**M-2 (a gate expression that is red at HEAD). TAKEN.** §8's row now carries the
command **with Task 9's range** and the attribution, and a following paragraph
says explicitly not to widen it to `schematic/` and expect it empty, because
`schematic/README.md` is prose in that directory and this pass rewrote it. A
reader who ran it as written would have read a prose edit as a changed sheet.

**M-3 (the dangling link, justified under the wrong ruling). TAKEN, and the
review is right that my justification did not apply** — Ruling D licenses inert
citations in files that may not be edited, and `m1-remeasurement.md` is edited in
the same commit under Ruling F. The link is removed, its `2 of 12` figure kept,
and a clause beside it names the deletion and where the document is in git.

**M-4 (two unjustified survivors). TAKEN, justified here**, completing the sweep
evidence: `docs/schematic/elk-spike.md` has one mention — *"The seven ported
`schgen` templates. Not run; not ported."* — inside that document's dated *what
this does not cover* list, past tense already, a statement of a scope limit that
was true when written and is inert now. `lib/kicad/symbols/PROVENANCE.md` has
two, both already corrected to the past tense by Tasks 6 and 9 (*"That file is
deleted … and so is the schematic generator's `lib/schgen/render/stock-symbols.ts`"*),
and it names the live reader, `tests/kicad/symbol-names.test.ts`. Neither reads
as a live instruction and neither needed an edit.

**M-5 (annotation after the fence). TAKEN.** All three moved above their blocks.
The reviewer's point is sharper than it looks: the reasoning it cites against my
placement — *"a heading is the part that gets obeyed"* — is **my own sentence
from the same pass**, written into the other two files, and
`EVALUATING-DRAWINGS.md` records the owner striking a heading for exactly this.
Having written the rule and then not applied it in the third file is the kind of
inconsistency that makes the rule look optional.

**M-6 (`README.md:47` stronger than its body). TAKEN.** It no longer says the
proof *"did not depend on the stub"*. It says the proof did not have to die with
it **but did change subject**: the old tests wrote a fresh throwaway stub and
exported it, so they could not survive the writer; what survived is the
comparison, and **no test will again export a freshly written stub.** The
disclosure now leads instead of trailing.

**M-7 (unmarked figures in the document-head notice). TAKEN.** The 44 cases are
marked `[RAN]` with their failure count; the logs' byte-identity is marked
`[RELAYED]` and attributed to the task that moved them, which is the honest mark
— this pass did not re-take those hashes.

## Two things to carry forward, neither in this task's scope

1. **`tests/circuits/drafted-kicad-round-trip.test.ts:37`** still says *"The five
   boards with an approved page under `drafted/pultec/`"*. Four of the five are
   AWAITING RE-APPROVAL. The coordinator has accepted this as out of scope and
   corrected the brief to the owner; naming it here so the next task can see the
   surviving propagator.
2. **A stale self-reference inside the comment I-3 now cites.**
   `circuits/pultec/physical/parts.ts:247`, two lines below the mounting-pin
   sentence, reads *"which is why `../physical/parts.ts` keeps eleven throws out
   of its by-position table"* — but that comment now **lives in**
   `physical/parts.ts`, so the relative path points away from itself. It is an
   artefact of Task 2 moving the comment verbatim, which was Task 2's
   instruction, and it is a code comment rather than instructional prose, so I
   left it. One word (`this file`) fixes it for whoever owns that file next.

## One correction to accept into my own report

The review is right and I was wrong about **why** `CLAUDE.md`'s worked-example
bullet cited a phrase absent from `CLAUDE.md`. I read *"the only thing that
answers this question"* as a self-reference to a sentence edited away. It is
**the owner's wording**, recorded at `docs/known-gaps.md:24`. So the bullet cited
the wrong file for a real quotation rather than citing a sentence that had ceased
to exist. The remedy I took is unaffected — the command was deleted either way —
but the diagnosis in the body of this report above is wrong and is corrected
here rather than edited there, since the misreading is itself an instance of
inferring a cause from a single grep.
