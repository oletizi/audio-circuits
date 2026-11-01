Task 6 report: the drawing-a-schematic skill
=============================================

**Status: done. Commit `53b7a7e374625a2a40679e08e45082d7e80c06b6` on
`feature/schematics-tooling`. Not pushed.**

Files: `.claude/skills/drawing-a-schematic/SKILL.md` (new), `README.md`
(modified - one row added to the governing-documents table, beneath
`TOOLING.md`).

Test summary
------------

`bun run typecheck`: clean, no output.

`bun test tests/draught/`: 34 pass, 0 fail, 106 expect() calls.

Full `bun test`, run alone, observed rather than predicted, run twice:

- Run 1: **2762 pass / 1 fail / 38671 expect() calls across 264 files**
  [147.60s]. The tail of that run's output showed no failing-test line (the
  process was piped through `tail -40`, which lost the earlier failure
  detail before it could be captured).
- Run 2, full output captured this time: **2763 pass / 0 fail / 38671
  expect() calls across 264 files** [142.60s] - this matches the task's
  stated baseline exactly, and no `(fail)` marker appears anywhere in the
  captured log.

Both runs are reported rather than only the clean one - see Concerns below.

`git status --short`: `M README.md`, `?? .claude/skills/` - nothing else.

`git diff -- drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json TOOLING.md`:
empty.

Canary'd control-byte scan (Python, raw bytes, with a planted NUL+CR as a
positive control appended to a copy of each file before scanning the real
file) over `.claude/skills/drawing-a-schematic/SKILL.md` and `README.md`:
both 0 NUL / 0 CR; canary confirmed the scan detects a planted byte in both
cases.

Forbidden-vocabulary grep (`better|best|worse|worst|good|bad|clean|readable|legible|clear|tidy|wins|ugly`,
case-insensitive, word-boundaried, plus the two full phrases) over the new
skill document: no hits.

What was verified against the code rather than against a document
--------------------------------------------------------------------

- **Copperhead's paper table.** Read `draughting/copperhead/src/kicad/draft/engine.ts`
  directly rather than trusting `TOOLING.md`'s own citation: the `PAPERS`
  table near line 219 holds only the ISO series (A5-A0); `USLetter` is a
  string that appears nowhere in that file. Confirmed the module comment in
  `tools/draught/draw-draft.ts` (`draftWithCopperhead`) states the same
  finding and reproduces it directly against that same file.
- **`make draw` never calls `akcli`.** Read `tools/cli/draw.ts` end to end:
  its six steps are toolchain check, board/declaration resolution, intent
  resolution, intent-vs-model verification, `draftWithCopperhead`,
  `repaperToUSLetter`, `renderSheet`, `runMeasurementSuite`. No `akcli`
  import, invocation, or reference anywhere in the file or in
  `tools/draught/draw-draft.ts` / `draw-render.ts`.
- **`COMMITTED_INTENT` has exactly one entry.** Read
  `tools/draught/draw-draft.ts`: the map holds only `"pultec-hi-cut"`. The
  module's own comment states the other four Pultec boards with a page
  under `drafted/pultec/` have no entry yet and `make -C boards/<one of
  them> draw` refuses, naming the board.
- **The re-paper step's placement in the pipeline.** Read `tools/cli/draw.ts`
  step 4.5 and `tools/draught/draw-render.ts`'s `repaperToUSLetter`: the
  rewrite runs immediately after `draftWithCopperhead` and before
  `renderSheet`, and a paper-fit overflow or an unmeasured fit check is
  pushed to `stderrSections` as a finding, never used to change `exitCode`
  or `drew`.
- **Never-withhold-for-layout.** Read `runDraw`'s full control flow: the one
  refusal before drafting is the net-partition disagreement
  (`verifyIntentAgainstModel`), which is exactly the `EVALUATING-DRAWINGS.md`
  §3 ground. Every other step failure after copperhead has written a sheet
  reports via `partialFailure`, which explicitly states the `.kicad_sch`
  "was not deleted or hidden" and can be opened directly.
- **The trap-index claims**, each against the file TOOLING.md cites or the
  file itself: `--apply` omission in `tools/draught/draw-draft.ts`'s own
  docstring style is corroborated by `TOOLING.md` step 4's prose (not a
  code file - this one is read-only reference, so verified against
  `TOOLING.md`'s own wording rather than re-run, since the trap is about
  `akcli`'s CLI, not this repository's code); `akcli pins` unit-mixing,
  the field-angle rule, the global-label-tag shape, and the two-textual-forms
  bug are all `TOOLING.md`'s own measured findings, cross-read against
  `docs/schematic/verdicts.md:293-313` for the pin/label instances (verdicts.md
  was read, not edited).
- **The false-green citations.** Grepped the live tree rather than trusting
  the task brief's phrasing: `grep -rn "Chrome exits 0"` and `grep -rn
  "qpdf"` both land in `docs/research/2026-10-30-single-document-packet.md`
  and `tools/guide/print-pdf.ts`'s own comment, not in `TOOLING.md` (those
  two false greens are from the separate guide/packet work, not the
  draw/draught loop - the skill cites them by source rather than implying
  they come from `TOOLING.md`). `akcli check --layout`'s "wrong in both
  directions" is `docs/schematic/verdicts.md:310-313` verbatim in substance.
- **`CLAUDE.md` staleness.** `git show HEAD:CLAUDE.md` compared byte-for-byte
  (`diff`) against the working-tree copy: identical. The forbidden-vocabulary
  list, the control-character rule, and the no-AI-attribution rule were all
  read from the HEAD copy, not from memory.
- **Make target invocation.** Read `make/perfboard.mk` directly:
  `draught-doctor` has no `BOARD=` dependency and runs via `$(REPO_ROOT)`;
  `draw` reads `$(CURDIR)` with no selecting variable, and `make -C
  boards/<board> draw` is the documented way to act on a board from outside
  - matches the skill's wording exactly.

`TOOLING.md` contradictions found for Task 7
---------------------------------------------

1. **The pinning-status self-contradiction the brief already named.** The
   accepted-risk paragraph (`TOOLING.md` lines ~116-133) states that
   `draughting/install.sh` and `draughting/tools.lock.json` exist and that
   `make draught-doctor` checks the install against the lock. The heading
   immediately below it (`### NEITHER TOOL IS PINNED IN THIS REPOSITORY...`,
   line 135) says the opposite: "there is no lockfile, no submodule, no
   vendored copy, and no check that the installed versions match these."
   Confirmed on disk: `draughting/install.sh` and
   `draughting/tools.lock.json` both exist, and `make/perfboard.mk` wires
   `draught-doctor` to `tools/cli/draught.ts`, which reads that lock and
   checks it. The heading is false on both counts it states.
2. **The stale `docs/research/lib/` reference.** `TOOLING.md` line 392 says
   orphan-junction-dot checking "was converged on `docs/research/lib/kicad_sheet.py`".
   That directory does not exist on this branch (`ls docs/research/lib`:
   no such file or directory). The current, promoted location is
   `draughting/measure/kicad_sheet.py` (confirmed by `find`), alongside
   `draughting/measure/junction_audit.py`, `crossings.py` and
   `label_survey.py` - the same three scripts `tools/draught/draw-render.ts`'s
   `MEASUREMENT_SCRIPTS` names. Three other copies of `junction_audit.py`
   still sit under `docs/research/<run>/scripts/`, unconverged, which
   `TOOLING.md`'s own sentence structure suggests but line 392's path
   contradicts.
3. **`TOOLING.md` never mentions `make draw` or the verb layer at all.**
   `grep -n "make draw\b" TOOLING.md` returns nothing; `make draught-doctor`
   is named exactly once (line 118), only as an aside inside the
   install/pinning discussion, never in "The loop" section. `TOOLING.md`'s
   steps 1-3 (build/verify intent, draft, render) describe doing each by
   hand with raw `npx tsx`/`kicad-cli` invocations - exactly what `make draw`
   (Task 5) now wraps mechanically, including a step `TOOLING.md` does not
   mention at all (next item). A reader following `TOOLING.md` literally
   today would hand-run commands `make draw` already automates, with no
   pointer either way.
4. **`TOOLING.md` never mentions the US-Letter re-paper step.** `grep -in
   "usletter\|repaper\|re-paper" TOOLING.md` returns nothing. `TOOLING.md`'s
   step 2 ("Draft, and draft more than one arrangement") and step 3
   ("Render, and LOOK AT THE RENDER") describe drafting and rendering with
   no mention that copperhead's draft engine cannot target `USLetter` and
   that every page needs a post-draft rewrite before it matches what the
   five approved pages use. This is one of the three facts this task's
   brief named as costly for an agent not to know, and it is not in the
   reference procedure at all - only in `tools/draught/draw-draft.ts` and
   `tools/draught/draw-render.ts`'s module comments, and now in this skill.

None of the four were touched - `TOOLING.md` is unedited (`git diff --
TOOLING.md` is empty, confirmed above) per this task's binding constraint.
Task 7 inherits this list rather than a hunt.

Concerns
--------

- **One of two full-suite runs reported 1 fail, the other 0, on an identical
  tree.** This task's own change is documentation-only (a new SKILL.md, one
  README table row) and touches no production or test code, so the
  difference is not attributable to this task's diff - `git diff` for the
  run-1-to-run-2 window is empty because no commit happened between them.
  The first run's failure detail did not survive capture (piped through
  `tail -40`), so which test failed and why is not established here; a
  `Warning: singular matrix` / `Warning: True gmin stepping failed` /
  `Warning: source stepping failed` sequence appears in both runs' SPICE
  output near `tests/sim/operating-point.test.ts`, which is a plausible
  source of flakiness but is not confirmed as the cause of the one failure
  - this is named as a plausible cause, not a confirmed one, per this
  project's rule against stating an unmeasured cause as fact. The task's
  stated baseline of 2763/0/264 is reproduced exactly on the second run, so
  the baseline itself is not shown stale - but a reader relying on a single
  run of this suite on this branch should know it has shown at least one
  flake. Not investigated further because isolating a SPICE convergence
  flake is outside this task's scope.
- `TOOLING.md`'s own loop section (steps 1-6) still describes the mechanical
  half of the procedure entirely by hand - no pointer to `make draught-doctor`
  or `make draw` anywhere in "The loop" itself. This skill does not fix
  that (editing `TOOLING.md` is out of scope for this task), but it means a
  reader who opens `TOOLING.md` first, rather than this skill, will not be
  told the mechanical steps now have a verb. Named above as a Task 7 item.
