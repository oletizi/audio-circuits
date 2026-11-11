# Execution record: H7 bring-up carrier, first page

This directory is the execution record of
[`../2026-11-11-h7-carrier-first-page.md`](../2026-11-11-h7-carrier-first-page.md),
run with subagent-driven development, a fresh implementer and a fresh
reviewer per task, and a final whole-branch review.

**It is not findings.** It is the decision record and the audit trail, kept
under CLAUDE.md's rule that a plan's record is committed beside the plan.
What binds is the code, the tests, `docs/h7-platform/decisions.md` (the
controller rulings, labelled as such) and the drafted page's `RECORD.md`.

- `progress.md`: the ledger. It holds the pre-flight scan, every controller
  ruling with what it costs if wrong, every deferred minor and parked
  finding, and the completion line of each task.
- `task-N-brief.md`: the task text each implementer worked from.
- `task-N-report.md`: each implementer's report, with fix reports appended.
- `task-N-review.md`, `task-N-rereview.md`: the task reviews.
- `final-review.md`, `final-fix-report.md`, `final-rereview.md`: the
  whole-branch review, its fix wave and the re-review.
- `common-dispatch.md`, `global-constraints.md`: what every implementer was
  told.

The review diff packages are not committed. They regenerate from `git diff`
over the ranges the ledger names.

The drafted page went to the owner with a question and nothing else
(EVALUATING-DRAWINGS.md §4). No verdict is recorded here. The verdict is the
owner's, and `docs/schematic/verdicts.md` is its authority.
