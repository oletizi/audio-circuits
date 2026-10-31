# `schematic/`

Holds `readability-baselines.json`, spec section 3.3's readability-baseline
registry: a committed, owner-granted comparison between a drawing's four
measures (bends, crossings, wire length, occupied area) and a prior drawing
of the same block that the owner reviewed.

**ITS DESIGN AND ITS REFUSAL VOCABULARY WERE IN `lib/schgen/readability/baseline.ts`
AND `baseline-model.ts`, AND BOTH ARE DELETED.** The schematic generator went
whole in `docs/superpowers/plans/2026-10-30-remove-schgen.md`; the findings are
in `docs/research/2026-10-30-schgen-removed.md`. This file was written in the
future tense about that deletion — *"until Task 9 … which deletes `lib/schgen/`
wholesale"*, *"after Task 9 runs, nothing in this repository can read this
file"* — and it has run.

## The open question the deletion left behind

**`readability-baselines.json` NOW HAS NO LOADER AT ALL.**
`lib/schgen/readability/baseline.ts` was the only code anywhere in this
repository that could parse the JSON and read an entry out of it, and it is
gone. The registry was not in the delete list — it lives here, under
`schematic/`, not under `lib/schgen/`, `tools/schgen/` or `tests/schgen/` — so
it survives as **a file with no reader**, not as a file that was removed.

Measured during the plan, and the measurement is cheap to retake:

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
channel is still wanted now that its only reader is gone.

**THE QUESTION IS STILL OPEN AND IT IS THE OWNER'S, NOT AN AGENT'S.**
`CLAUDE.md`: an agent may never author the acceptance criteria for the artifact
it is producing. A registry of the owner's recorded judgements about a drawing's
readability is exactly such a criterion, so whether to keep it, let it sit
unread, or retire it is his call to make — raised here, not decided here.
`docs/research/2026-10-30-schgen-removed.md` carries it to a reader of the
finished plan, which is where the plan intended it to surface.

## Why the warning lives here and not in `baseline.ts`

It was first recorded as a comment in `lib/schgen/readability/baseline.ts`
itself, addressed to "whoever runs Task 9." **That did not work**:
`baseline.ts` was deleted wholesale by a task whose own steps were a
dependency grep followed by "delete, then let the typechecker find the
rest" — nothing in that process reads a doc comment before removing the file
it is attached to. A warning placed in a file about to be deleted does not
survive its own deletion; it is recoverable only by someone who thinks to dig
through git history for a file that no longer exists, which is not what
"reaches whoever runs Task 9" is supposed to mean. **The comment went with the
file, exactly as predicted, and this page is the only reason the question
survived.** The lesson carries beyond this one file: **a finding belongs beside
the thing that outlives the change, not beside the thing the change removes.**
