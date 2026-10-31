Execution record: removing the schgen honey pots
================================================

**This is NOT findings, and the plan and the code are what bind.** The plan is
`../2026-10-30-remove-schgen.md`; the design it argues from is
`../../specs/2026-10-30-remove-schgen-design.md`. What is here is the decision
record and the audit trail — what was ruled, why, and what it would cost if
wrong — which `CLAUDE.md` requires be committed beside the plan rather than left
in a workspace:

> *"`.superpowers/` is gitignored, so an entry there is invisible to review,
> absent from the history, and destroyed by `git clean -fdx`."*

**It is committed mid-execution rather than at the end, and that is the point.**
The Task 7 reviewer noticed the whole record was sitting in the gitignored
workspace seven tasks in, with the careful measurements in it one `git clean`
from gone. Waiting for a clean final review would have been the same mistake
this rule exists to prevent.

- `ledger.md` — the controller's ledger: the pre-flight conflict scan, every
  ruling with what it would cost if wrong, every deferred minor, and each task's
  completion line with its commit range.
- `task-N-report.md` — each implementer's own report, including its fix rounds.

**The review-package diffs are deliberately absent.** They regenerate from
`git diff` over the commit ranges the ledger names.

---

## What this execution found that the plan did not predict

Recorded here because it is the part a later reader cannot re-derive from the
diff, and because several of these are **corrections to the plan and to the
controller**, not to the implementers.

**THE PLAN'S OWN MEASUREMENTS WERE WRONG THREE TIMES, each caught by an
implementer running rather than reading:**

- `make check` **does** execute schgen, five times a run. The claim that it did
  not came from grepping a log for a string — *a log records what a tool prints,
  never what it imports*, so that check could not have failed. `docs/known-gaps.md`
  **G306** carries the correction.
- `occupancy.ts` had **four** importers where the plan said one. The one that
  mattered used a same-directory `./occupancy.ts` import, **invisible to a
  path-literal grep**.
- `pultecDesignator` is **not** the designator map the approved pages carry — it
  answers `SW_HI_CUT` where the export says `SW1`. The pages were annotated from
  an empty refs lock, and that rule had to be reproduced.

**A PORT THAT COMES OUT WEAKER THAN ITS ORIGINAL WHILE BEING DESCRIBED AS
FAITHFUL IS THE RECURRING DEFECT OF THIS KIND OF WORK.** Three instances in the
first two tasks:

1. a dropped geometric check (`endpointsAt`) in a carried-over table's tests;
2. two test arms stranded in a doomed file because the helper they needed was
   too narrow;
3. a real geometry assertion — pole at angle 0, throws at 180 on the opposite
   side — replaced by a bare pin-number membership check, **under a comment
   saying it had moved.**

The third is the sharpest: the surviving test compared a **union**, so swapping
the recorded pole with a recorded throw would have left every test passing. All
three were caught by someone diffing against the source rather than reading the
summary.

**The remedy became a standing instruction for the rest of the plan** — open the
original, enumerate its assertions, account for each as moved, strengthened or
dropped-with-reason, and treat an unaccounted assertion as the finding. It was
honoured from Task 3 onward and caught an omission on its first outing.

**TWO "COVERAGE LOSSES" TURNED OUT TO BE REDUCIBLE WHEN CHECKED.** Task 5
measured that the five `transistor-preamp` boards would lose their only live
`kicad-cli` proof — then checking showed the comparison machinery lives in
`lib/kicad/` and survives, so only the *subject* was dying. All ten boards kept
the proof. Likewise `footprintsUndeclared` would have lost its only assertion to
a deleted test, and gained a permanent per-board one instead.

**A TOOLCHAIN FACT WORTH KEEPING.** A full `bun test` segfaulted — Bun 1.3.8,
`panic(main thread): Segmentation fault at address 0x204`, 160.4 s in, last file
`tests/schgen/direction-seed.test.ts`, RSS 1.58 GB of 17.18 GB so not an OOM —
while `make check` and a second suite ran concurrently. A solo retry passed
through the same file. **One crash under load and one clean pass without it is
two observations and does not establish a cause**; it is recorded as a suspicion
so that a second occurrence has something to join.

---

## What the last three tasks and the final review added

Written after the fact, because the section above was committed mid-execution
at Task 7 and these are the findings that came later.

**THE NET-CAPABILITY QUESTION FINALLY GOT ASKED THE RIGHT WAY ROUND, and it is
the question the whole plan turned on.** Every per-task review checked that the
task's own replacement worked. None of them could ask whether something
deleted had a *surviving, now-unprotected* subject, because no task saw the
whole deletion. The final reviewer went looking for one against the 368 deleted
paths and could not find one. **That is the first time the plan's central claim
was tested against the deletions rather than against the plan's description of
them**, and it is the check that would have condemned the plan had it failed.

**THE SAME DEFECT KEPT ARRIVING: A PORT OR AN EDIT THAT COMES OUT WEAKER THAN
ITS ORIGINAL WHILE BEING DESCRIBED AS FAITHFUL.** The section above records
three instances in the first two tasks and the standing instruction that
followed. It reached **seven** by the end, and the last four are the
instructive ones because the standing instruction was in force for all of them:

4. Task 9 dropped a 44-case guard as *"out of scope"* on a misread of its
   subject - the document it guards **survives**, is 432 KB, and is named in
   `CLAUDE.md`. Its comparison log went with it, so the guard could not be
   rebuilt from the tree at all.
5. The fix for that defect **contained the defect**: the new vendored-symbol
   control was `expect(installedText).not.toBe(vendoredSymbolText(libId) + " ")`
   - a tautology, since a string never equals itself plus a space, so under the
   very sabotage its own comment named both lines passed.
6. `tests/circuits/drafted-sheet.ts` carried a third of the same shape:
   `expect(sha256(bytes + "x")).not.toBe(sha256(bytes))` is a property of
   SHA-256, while its comment claimed it caught a digest function that returns
   the computed value instead of the recorded one - **which would have passed
   both lines.**
7. `pultec-switch-geometry.test.ts` replaced a read of the declared
   `MECHANICAL_PINS` table with `libId.endsWith("_MP")`, a name heuristic, so a
   future `THROW_PINS` entry missing from the table would pass and silently
   omit its lug from the model partition.

**The remedy that actually worked on 6 and 7 was not review but SABOTAGE.**
Both were fixed and then **driven**: the fault each comment described was
introduced, the new control was shown to fail while the assertion it guards
stayed green, and the sabotage was reverted. The re-reviewer then drove all of
them again rather than accepting the report. An inert control is invisible to
reading and obvious to driving, and three of them reached production code on
one plan while every review called the surrounding work sound.

**A VERBATIM MOVE CARRIES A SELF-REFERENCE THAT STOPS BEING TRUE AT THE NEW
ADDRESS. FIVE INSTANCES.** The final review predicted the class and found ten
live citations of one deleted module across nine files - one of them in a file
*this plan had added*. The fixer found **fifteen**, and two of the ten needed a
**different** target than the obvious replacement: one was about a constant,
one cited a second deleted file for a *timeout convention*. A citation repaired
mechanically to the plausible file is the same defect with a fresh date on it.

**TWO FIXES WERE REFUSALS TO DO WHAT THE REVIEW ASKED, AND BOTH WERE RIGHT.**
The review twice asked for a corrected count. Neither was published. In one
place a tally of another file's row types would have sat six lines above this
repository's own *"a figure in prose is a transcription with a date on it"* -
and the implementer's draft of that tally **got one of the counts wrong**,
which is the argument rather than an excuse for it. In the other, the
**re-derivation recipe** went in instead of the number, and it carries a
distinction a count cannot: it correctly excludes two mechanisms that name a
deleted path in an *Instances* paragraph rather than in a
*what-guards-against-it-here* paragraph. **A recipe a reader can run beats a
number a reader must trust.**

**A FIGURE WITH ITS OWN DISPROOF PRINTED BESIDE IT.** `value-notation.ts` read
*"49 of them across 29 files"* with the grep that measured it printed
underneath. Re-run, the grep returned **1** - and the one hit was the comment
itself, because the field it searched for was a property of the deleted IR.
**A check that could only ever match its own text**, inside the evidence for a
figure. The command was replaced rather than the figure merely deleted.

**THE CONTROL-BYTE SCAN FAILED FIRST, AND ONLY ITS OWN CANARY CAUGHT IT.**
macOS `grep` has no `-P`, so the final review's first scan reported *"0 hits
over 0 files"* - a check that could not have failed, in the one scan this
repository has been broken by four times. It fired only because a canary had
been written into it. Every scan after that carried one, and every one reported
that it fired.

**AND THE INSTRUCTION THAT OUTLIVED ITS FILE.** The sentence this plan struck
from `CLAUDE.md` went on instructing agents for a day after the correction,
because a project's instructions are a snapshot taken at session start.
`docs/research/2026-10-30-schgen-removed.md` carries the measurement; the
practices section of `CLAUDE.md` now carries the rule. **The honey pot was real
enough that deleting it from disk left it operating inside a running session**,
which is the plan's own subject arriving by a route the plan could not close.

**ONE CORRECTION THE CONTROLLER OWES ITS OWN RECORD.** A dispatch brief stated
that five Pultec boards have approved pages. Four of the five say **awaiting
re-approval**: their verdicts are bound to A4 and A3 bytes that a re-paper and
a re-draw changed, and of the eight digests in `docs/schematic/verdicts.md`
exactly one equals a sheet's present bytes. The implementer caught it by
reading the records instead of believing the brief, and the final reviewer
verified it independently rather than relaying it. It then turned out to be
asserted **twenty-one times in live code**, twelve of those in files this plan
added, with not one site behaving differently because a page is approved. **A
stale cause, authored by the controller, propagated by the controller, and
caught twice by the people it was given to.**

**`next-plan-preflight-scan.md` is here rather than in the next plan's
directory** because it was produced by this plan's controller while this plan
ran, and it found one contradiction worth naming: the next plan's `make draw
BOARD=<board>` conflicts with a convention `make/perfboard.mk` states twice
with its reason - *"there is deliberately no BOARD=<name> variable"*.
