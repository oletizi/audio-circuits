# `schematic/`

Holds `readability-baselines.json`, spec section 3.3's readability-baseline
registry: a committed, owner-granted comparison between a drawing's four
measures (bends, crossings, wire length, occupied area) and a prior drawing
of the same block that the owner reviewed. Its design and refusal vocabulary
are in `lib/schgen/readability/baseline.ts` and `baseline-model.ts` — **until
Task 9 of `docs/superpowers/plans/2026-10-30-remove-schgen.md`, which deletes
`lib/schgen/` wholesale.**

## The open question Task 9 leaves behind

`lib/schgen/readability/baseline.ts` is this registry's only loader — the
only code anywhere in this repository that can parse the JSON and read an
entry out of it. Task 9 deletes it along with the rest of `lib/schgen/`.
**After Task 9 runs, nothing in this repository can read this file.** It is
not itself in Task 9's delete list — it lives here, under `schematic/`, not
under `lib/schgen/`, `tools/schgen/` or `tests/schgen/` — so it survives as a
file with no reader, not as a file that is removed.

Measured, as of this writing, in Task 7 of the same plan:

- **One commit in its entire history**: `b526c1d`, 2026-10-20, "Task 16: the
  generation manifest, the four measures, the baseline registry and the
  finding contract." No change since.
- **`"baselines": []` — zero granted entries, ever.** No owner judgement has
  ever been recorded in this file. Spec section 3.3 says a baseline is
  granted only once a block reaches a *second* generation to compare against,
  and that has not happened for any circuit here yet.

So concretely: nothing of substance is lost if this file disappears, because
there is nothing recorded in it to lose. What is at stake is the schema and
the channel for recording a future owner-granted comparison — whether that
channel is still wanted once its only reader is gone.

**This is the owner's decision, not an agent's.** `CLAUDE.md`: an agent may
never author the acceptance criteria for the artifact it is producing. A
registry of the owner's recorded judgements about a drawing's readability is
exactly such a criterion, so whether to keep it, let it sit unread, or retire
it is his call to make — raised here, not decided here. See
`.superpowers/sdd/2026-10-30-remove-schgen/task-7-report.md` for the full
measurement; Task 10's findings document
(`docs/research/2026-10-30-schgen-removed.md`) is where this question is
meant to surface to a reader of the finished plan.

## Why the warning lives here and not in `baseline.ts`

Task 7 first recorded this as a comment in `lib/schgen/readability/baseline.ts`
itself, addressed to "whoever runs Task 9." **That does not work**:
`baseline.ts` is deleted wholesale by Task 9, whose own steps are a
dependency grep followed by "delete, then let the typechecker find the
rest" — nothing in that process reads a doc comment before removing the file
it is attached to. A warning placed in a file about to be deleted does not
survive its own deletion; it is recoverable only by someone who thinks to dig
through git history for a file that no longer exists, which is not what
"reaches whoever runs Task 9" is supposed to mean. The lesson carries beyond
this one file: **a finding belongs beside the thing that outlives the
change, not beside the thing the change removes.** This file is that
surviving place for this registry; the comment in `baseline.ts` is left as
‑is for the few days it has left; Task 9 takes it along with everything else
in `lib/schgen/`.
