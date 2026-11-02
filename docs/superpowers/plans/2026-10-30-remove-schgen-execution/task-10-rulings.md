Task 10: PRE-DISPATCH SWEEP AND RULINGS. The brief's Step 3 is one line for
  four files; the sweep says README.md alone has four separate regions of live
  instruction, and six files the plan never names carry dangling commands.
  Ruling: Task 10 corrects every file whose prose reads as a LIVE INSTRUCTION,
  and leaves every dated or verbatim record alone. The rulings, each with what
  it costs if wrong:
Task 10: Ruling A - NO REPLACEMENT TOOL EXISTS for board-sheets.ts, and
  CLAUDE.md must not invent one. "Which boards draw" is now answered by
  drafted/<circuit>/<board>/ plus each RECORD.md digest, held by
  tests/circuits/drafted-kicad-round-trip.test.ts, with TOOLING.md for how a
  page gets there. The governance of that paragraph - a figure in prose is a
  transcription with a date on it - survives verbatim; only the mechanism
  changes. Cost if wrong: the paragraph names a weaker check than exists.
Task 10: Ruling B - NO FORWARD REFERENCE to the institutionalisation plan's
  unbuilt make targets (make draw, make draught-doctor). A command that does
  not exist yet is the same defect being removed, one plan early. Cost if
  wrong: CLAUDE.md is correct today and must be amended again when they land -
  which is the right way round.
Task 10: Ruling C - TOOLING.md gets its falsehoods corrected and nothing more
  (the bun justification at :54, the board-sheets command at :68, the
  lib/schgen sentence at :38-40). Task 6 of
  docs/superpowers/plans/2026-10-30-institutionalise-draughting.md owns
  TOOLING.md's structure. Cost if wrong: one file edited twice.
Task 10: Ruling D - WHAT IS A RECORD AND MAY NOT BE EDITED, widening the
  brief's Step 4 grep: docs/schematic/verdicts.md (the owner's verbatim words
  bound to a sha256 - append-only), every docs/schematic file with a date in
  its name, docs/schematic/schgen-development-history.md, docs/known-gaps.md
  (frozen), docs/research/, docs/superpowers/, DEVELOPMENT-LOG.md, and the five
  drafted/ RECORD.md files. A citation in these that resolves to nothing is
  inert, which CLAUDE.md explicitly accepts. Cost if wrong: an owner verdict or
  a dated finding is quietly rewritten, which is the one unrecoverable edit on
  this task.
Task 10: Ruling E - template-parity.md and template-parity-anchors.md are
  DELETED, not annotated. Both are headed "GENERATED - do not hand-edit" and
  name a generator verb (bun run schgen-parity, bun run schgen-anchors) that no
  longer exists, so they are derived artifacts nothing can regenerate or check
  - "supersede means delete", and a stale derived artifact is exactly what
  makes stale look current. Their citation from the dated 2026-10-26 governance
  review goes inert by Ruling D. Cost if wrong: two generated tables about a
  deleted generator's templates, recoverable from git at the commit before.
Task 10: Ruling F - m1-remeasurement.md and reference-graph-checks.md keep
  their measurements and lose their instruction. Each command block is headed
  with the fact that every command in it was deleted, naming the commit, so the
  block stops reading as something to run. Carry the Task 9 re-review's finding
  into the heading: NOTHING IN THE REPOSITORY GUARDS A DOC-TO-TEST POINTER ANY
  MORE. Cost if wrong: two documents still read as runnable.
Task 10: Ruling G - THE HAZARD ON THIS TASK, and it is a real one.
  docs/schematic/text-handling-research.md is guarded by the 44 cases of
  tests/text-metrics/document-pastes.test.ts, restored in Task 9's fix round,
  which compare its pasted blocks byte for byte against the four logs beside
  it. Its two command lines at :106-107 are stale - the probe is deleted, and
  verify-pastes.ts MOVED to tools/text-metrics/. Any edit to that file must be
  made with the guard re-run, and an edit that lands inside a guarded paste
  block is a defect, not a conflict to resolve by changing the log. Cost if
  wrong: the guard restored one commit earlier is broken by the next one.
Task 10: Ruling H - schematic/README.md is written in the future tense about a
  Task 9 that has run, and its registry now has no loader at all. Past tense,
  and say that plainly; it is the readability-baselines owner question's home
  and must not lose the question. Cost if wrong: the one surviving open
  question on this plan reads as pending work on a deleted file.
Task 10: dispatch held until Task 9's scoped re-review returns - a fix round
  and an implementer must never run concurrently.
