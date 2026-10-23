# Execution record — the 2026-10-22 text-handling research plan

**This is not findings. Do not cite it as evidence.** The findings of the plan
this records are in `docs/known-gaps.md` (**G265**–**G276**) and
[`../../../schematic/text-handling-research.md`](../../../schematic/text-handling-research.md);
the human-facing report is
[`../../../schematic/text-handling-report.md`](../../../schematic/text-handling-report.md).
What is here is **how those findings were arrived at and what it took to trust
them** — judgement and audit trail, not results.

## Why it is committed at all

`CLAUDE.md` says in terms that a plan ledger is **not** a record: *"`.superpowers/`
is gitignored, so an entry there is invisible to review, absent from the history,
and destroyed by `git clean -fdx`."* That rule is about **findings**, and it is
right — a finding that lives only in a ledger is lost. The remedy it prescribes,
writing findings to the register in the change that found them, was followed:
twelve entries and many amendments.

But two things the plan produced have **no home in the register**, because the
register holds findings and these are not findings:

1. **The decision record.** 77 numbered rulings, each with what was decided, why,
   and what it would cost if wrong. The register has no place for *"the
   controller ruled re-run rather than re-word, and the re-run falsified two
   headline claims."* That is judgement, and judgement is the thing a later
   agent most needs and can least re-derive.
2. **The audit trail.** The register says *"CONFIRMED by this writer"* on dozens
   of clauses. The nineteen reviews are what makes those claims checkable —
   where a reviewer fetched a source independently, re-derived a figure with its
   own script, or drove a guard red to prove it could fail. Without them,
   *"independently confirmed"* is an assertion.

This repository has already been burned by the gap: `CLAUDE.md` records that a
deletion *"removed an open owner question that only survived in a gitignored
report."* The execution skill's default is to delete the plan workspace once the
final review is clean, which is sound when the diff **is** the record — ordinary
feature work, where the code carries the result. **It is wrong for a research
plan, whose entire product is knowledge and whose reasoning is the asset.**

## What is here

| path | what it is | lines |
| --- | --- | --- |
| `rulings.md` | the controller's ledger — 77 rulings in execution order, with the task reports and review outcomes they responded to | 1,809 |
| `reviews/` | 19 documents: one full review per task, the scoped re-review after each fix round, the whole-plan final review and its re-review | 6,723 |
| `reports/` | 9 documents: what each task claims it did, which is what the reviews were checking against | 3,378 |

**Reports and reviews are an adversarial pair and one without the other is half
the record.** A report says what an implementer believes it established; the
review beside it says what survived someone trying to break it. Several of the
plan's most useful results are in the gap between them.

## What is deliberately not here

- **The review-package diffs (3.2 MB).** Regenerable exactly:
  `git diff <base>..<head>` for the ranges the ledger names. The one genuinely
  scratch class.
- **The dispatch briefs and context files (4,604 lines).** These are the
  controller's instructions to each implementer. Their substance is the plan's
  own task text (committed in
  [`../2026-10-22-text-handling-research.md`](../2026-10-22-text-handling-research.md)),
  plus the rulings (in `rulings.md`), plus constraints (in `CLAUDE.md`). Kept out
  as the one redundant class — **and the method they encoded is better extracted
  than preserved**, which is what
  [`../../../schematic/false-greens.md`](../../../schematic/false-greens.md) is.

## How to read `rulings.md`

Rulings are numbered `R1`–`R77` in execution order and most carry a *cost if
wrong* line, which is the fastest way to see which were load-bearing. The ones
worth reading on their own:

- **R60** — the ruling that paid for itself. A reviewer offered either re-wording
  a scope claim or re-running the measurement at full population; re-running
  falsified two of the section's own published conclusions. Re-wording would
  have shipped them into the synthesis.
- **R64** — the controller withdrawing its own earlier mechanism under this
  repository's criterion-versus-mechanism rule, which applies to rulings and not
  only to register entries.
- **R67** — a definition versus an enumeration: when a plan's own list of which
  tasks could produce a given grade of evidence turned out to be a prediction
  rather than a constraint.
- **R70** and **R73** — two cases where a claim became false *by policy rather
  than by error*, and one where the controller relayed a fabricated quotation to
  the owner as fact.

## A caution about this directory's contents

Everything in `reviews/` and `reports/` is **model output**, written by agents
under instruction. It was useful because it was adversarial and because figures
were re-driven rather than relayed — but it is not a primary source, and several
documents here contain claims that a later document in the same directory
corrects. **Where a report and a review disagree, the review drove it; where a
review and `rulings.md` disagree, the ledger adjudicated it; where any of them
and `docs/known-gaps.md` disagree, the register is what binds.**
