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
