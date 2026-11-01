# Task 7 report: point TOOLING.md at the new machinery

## Status

Done. Committed as `51f4ad1` on `feature/schematics-tooling` (parent `53b7a7e`),
not pushed. Working tree is clean.

## What changed

- `TOOLING.md`:
  - The self-contradicting "NEITHER TOOL IS PINNED IN THIS REPOSITORY..."
    heading and its two paragraphs (old lines ~135-147) are shown struck
    (quoted verbatim in a blockquote, with the correction after), not
    deleted, per the brief's instruction - "what it produced is the argument
    for the change." Replaced with a short paragraph pointing at
    `draughting/tools.lock.json`, `draughting/install.sh` and
    `make draught-doctor`.
  - The later, separate occurrence of the same stale claim under "What this
    procedure does not cover" ("Neither tool is pinned, as above") was also
    struck and corrected - left unaddressed it would have contradicted the
    fix above.
  - The stale `docs/research/lib/kicad_sheet.py` reference (old line 392) is
    replaced with `draughting/measure/kicad_sheet.py`, the path Task 4
    actually promoted it to (verified: `docs/research/lib/` does not exist
    on disk; `draughting/measure/kicad_sheet.py` does). The surrounding
    repair-class-6 paragraph and the two verification-set table rows for
    `junction_audit.py` and `label_survey.py` were updated the same way, to
    the promoted `draughting/measure/` paths, since those are the scripts
    `make draw` actually runs (`tools/draught/draw-render.ts`'s
    `MEASUREMENT_SCRIPTS`).
  - Added `make draught-doctor` and `make draw` to "The loop" itself (they
    previously appeared only as an aside under the install-script
    discussion, never in the loop's own steps) - verified against
    `make/perfboard.mk` lines 47-76 and `tools/cli/draw.ts`/`draw-draft.ts`/
    `draw-render.ts`'s actual step order (toolchain check, intent resolve,
    intent-vs-model verify, draft, re-paper, render, measurement suite).
  - Added a new step **2.5, "Re-paper to US Letter"**, between "Draft" and
    "Render", stating the measured fact that copperhead's draft engine's
    `PAPERS` table (`engine.ts` near line 219) holds only A5-A0, that
    `USLetter` is silently ignored as a hint, and that every page must be
    re-papered after drafting and before rendering - `make draw` does this
    via `repaperToUSLetter`; drafting by hand must do the same rewrite.
    `grep -in "usletter|repaper" TOOLING.md` now returns non-empty (it was
    empty before this task).
- New file `docs/research/README.md`: records that ~47 scripts under
  `docs/research/<run>/scripts/` still import a `kicad_sheet.py` from
  `docs/research/lib/`, a path Task 4 removed when it promoted the
  converged helpers to `draughting/measure/`. States plainly that the run
  directories are frozen execution records, not rewritten, and that
  `ImportError` on one of those scripts run directly is expected, not a
  defect - points at `draughting/measure/` for the current versions. This
  was the "one more the reviewer found in passing" item; in scope per the
  brief ("if you judge it worth writing") and I judged it worth writing
  given the scale (47 scripts, not just the 3 `junction_audit.py` copies
  named in the worklist).

Nothing else was touched. `drafted/`, `docs/schematic/verdicts.md`, and
`schematic/readability-baselines.json` are untouched -
`git diff -- drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json`
is empty, and the five `drafted/` sheets' sha256 digests are unchanged
(confirmed by `git status --short` showing nothing under `drafted/` either
before or after).

## Verified against the thing itself, not against another document

- `docs/research/lib/` does not exist (`ls` fails); `draughting/measure/kicad_sheet.py`
  does exist, and `draughting/measure/junction_audit.py`'s own module
  docstring independently confirms the promotion and the frozen copies'
  resulting `ImportError`.
- `grep -rl "docs/research/lib" docs/research --include="*.py"` returns 47
  files - the figure in the new README.
- `grep -in "usletter|repaper" TOOLING.md` was empty before this task and is
  non-empty after.
- `make help` lists `make draught-doctor` but never `make draw` (confirmed
  by running it); `make/perfboard.mk` lines 73-76 confirm `draw` is a real
  `.PHONY` target with no help-text registration, matching the brief's claim
  that a reader following `TOOLING.md` literally would never find it.
- `tools/cli/draw.ts`, `tools/draught/draw-draft.ts`, and
  `tools/draught/draw-render.ts` were read in full to confirm the actual
  step order and the `repaperToUSLetter` mechanism before writing step 2.5 -
  not transcribed from the skill or the brief.
- `git show HEAD:CLAUDE.md` diffed byte-for-byte against the working
  `CLAUDE.md` on disk: no difference, so the project's `CLAUDE.md` in this
  worktree is current.

## Skill vs. TOOLING.md

No disagreement found between `.claude/skills/drawing-a-schematic/SKILL.md`
and `TOOLING.md` as written - both state the same six-step loop in the same
order, the same `COMMITTED_INTENT` refusal shape, the same US-Letter
mechanism, and the same "never withhold for a layout reason" rule. The gap
was that `TOOLING.md` had not yet caught up to what the skill already
described (`make draught-doctor`, `make draw`, US-Letter re-papering); this
task closed that gap by adding the missing material to `TOOLING.md` itself,
phrased as procedure (what runs, in what order) rather than restating the
skill's own judgement-carrying prose. I did not change the skill.

## Control-byte canary scan (Python, raw bytes, positive control first)

Before edit: `TOOLING.md` - 41889 bytes, positive control `copperhead` found
35 times, 0 NUL bytes, 0 bare CR bytes.

After edit: `TOOLING.md` - 47225 bytes, positive control `copperhead` found
42 times, 0 NUL bytes, 0 bare CR bytes.

No control-character escape was typed into any tool parameter; all edits
were plain prose via the Edit tool.

## Forbidden-vocabulary grep over the diff

Scanned every added line (`git diff -- TOOLING.md` filtered to `+` lines)
plus the full new `docs/research/README.md`, against
`EVALUATING-DRAWINGS.md` §2's list (better/best/worse/good/bad/clean/
readable/legible/clear/tidy/wins/ugly), case-insensitive, word-boundaried,
with a positive control (`copperhead`, 8 hits, confirming the scan moved).

One hit: **`clean`**, in the reproduced quote `` `git clean -fdx` ``. This is
the shell command's own name, inside a verbatim quotation of the
now-struck original text (not new prose I wrote), and it is not a statement
about a drawing. No other hits, and no verdict vocabulary was introduced
about any drawing.

## Gates run

- `bun run typecheck` - clean, no output beyond the `tsc --noEmit` invocation
  line.
- `bun test tests/draught/` - `34 pass`, `0 fail`, `106 expect() calls`,
  5 files, 23.25s.
- `make draught-doctor` - exit 0. `akcli doctor` (advisory) reports all
  `ok` except `config` (`MISSING - no akcli.toml found`), which the tool
  itself documents as optional; `checkToolchain` itself reports every
  pinned tool matches.
- `git diff -- drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json`
  - empty.
- `git status --short` - clean after commit.

### Full-suite `bun test`, twice, whole log kept (runs 4 and 5 of the flake investigation)

**Run 1:** `2763 pass`, `0 fail`. Line: `Ran 2763 tests across 264 files. [142.42s]`. Exit code 0.

**Run 2:** `2761 pass`, `2 fail`. Line: `Ran 2763 tests across 264 files. [147.02s]`. Exit code 1.

Both `(fail)` lines in full, from `tests/draught/draw.test.ts`:

```
(fail) a real draw of pultec-hi-cut drafts, re-papers to USLetter, renders and measures without withholding the page [5439.22ms]
  ^ this test timed out after 5000ms.
(fail) nothing here touches drafted/ - the real run writes only its own outDir [5395.77ms]
  ^ this test timed out after 5000ms.
```

Both failures are **timeouts at bun's default 5000ms test timeout**, not
assertion failures, on the same file, `tests/draught/draw.test.ts`, which
invokes the real `npx tsx` copperhead draft, `kicad-cli` render, and the
Python measurement suite as subprocesses. Run in isolation
(`bun test tests/draught/`, above) the full file passes in 23.25s total for
34 tests, well under 5s per test. Across the full suite's 264 files running
concurrently, these two subprocess-heavy tests crossed the 5s default. This
is consistent with a scheduling/contention flake tied to running real
external-tool subprocesses under full-suite parallel load, not a logic bug
in `tools/draught/draw.ts` or in this task's `TOOLING.md` edit - nothing in
this task touched that file or its tests. I did not attempt a fix; the gate
says these are runs 4 and 5 of an attribution effort already open, not mine
to resolve.

## Concerns

- The `bun test` full-suite flake is real and reproduced here (runs 4 and 5):
  1 fail in 3 prior runs, now 1 fail in 2 of mine, both times the same two
  tests in `tests/draught/draw.test.ts`, both timeouts. Whoever owns that
  gate should see this report's exact test names and timing - raising the
  timeout for that one file's real-subprocess tests, or giving it its own
  longer-timeout bucket, looks like the fix, but I did not make it: it is
  out of this task's scope per the brief.
- `docs/research/README.md` is new prose at a level `CLAUDE.md`'s own rules
  on `docs/research/` don't explicitly name (the project's "source vs.
  generated vs. documentation" test is usually applied per-circuit
  directory, not at `docs/research/` itself). I judged it the right home
  because the brief explicitly offered it as the sanctioned remedy and
  `docs/research/` has no other README; if the owner would rather this live
  elsewhere, it is one short file to move.
- I did not re-verify the `akcli doctor` `MISSING config` line as a
  pre-existing, unrelated condition beyond reading its own hint text
  ("optional: only pinmap/rails/waivers/grid need one") - it does not gate
  `make draught-doctor`'s exit code and nothing in this task touches akcli
  configuration.
