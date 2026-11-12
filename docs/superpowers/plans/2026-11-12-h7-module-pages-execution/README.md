# Execution record: H7 module pages

This directory is the execution record of
[`../2026-11-12-h7-module-pages.md`](../2026-11-12-h7-module-pages.md). The plan
was run with subagent-driven development: a fresh implementer and a fresh
reviewer for each task, then a final whole-branch review.

**It is not findings.** It is the decision record and the audit trail, kept
under CLAUDE.md's rule that a plan's record is committed beside the plan. What
binds is:
- the code and the tests;
- `docs/h7-platform/decisions.md`, which holds the controller rulings, each
  labelled "Controller ruling (the owner may override)";
- `docs/h7-platform/open-items.md`;
- the module's `drafted/h7-platform/h7-module/RECORD.md`;
- `docs/schematic/verdicts.md`, for the owner's verdicts.

Contents:
- `progress.md`: the ledger. It holds every controller ruling with what it
  costs if wrong, every parked finding and deferred minor, the owner verdicts
  as they arrived, and each task's completion line.
- `constraints.md`, `reviewer-instructions.md` and
  `rereview-instructions.md`: what every implementer and reviewer was told.
- `task-N-brief.md`: the task text each implementer worked from. Task 7 was
  run in parts, 7a to 7e: power; interface and the small blocks; vdda, sdram
  and decoupling; mcu; the root.
- `task-N-report.md` and `task-7x-*-report.md`: the implementers' reports,
  including the fix rounds.
- `task-7x-review.md` and `task-7x-rereview*.md`: the task reviews. The reviews
  of Tasks 1 to 6 were returned in the dispatch replies and are summarised in
  `progress.md`; no separate files were written for them.
- `final-review.md`, `final-fix-report.md` and `final-rereview.md`: the
  whole-branch review, its single fix round and the scoped re-review.
- `deferred-minors.txt`: the ledger lines the final review dispositioned.

The review diff packages are not committed. They regenerate from `git diff`
over the ranges the ledger names.

Every page, and the root, went to the owner with a question and nothing else
(EVALUATING-DRAWINGS.md §4). No verdict is recorded here.
`docs/schematic/verdicts.md` is the authority for each verdict, bound to each
sheet's sha256.

Two GitHub reviews ran alongside the plan:
- issue 31, on the plan itself;
- issue 32, on the module power work and the pages that followed.

The findings and the replies are on those issues. The changes they caused are
in the commits the ledger names.
