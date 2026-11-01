Task 4 review: give the measurement scripts one home at draughting/measure/
=============================================================================

Reviewer: independent re-derivation against brief, rulings, report, and diff
(review-06d6776..a88702c.diff, commits dfa964e and a88702c). Driven, not
relayed, per the dispatch's instruction.

VERDICT 1: SPEC COMPLIANCE — PASS
----------------------------------

All six steps of the brief and all six rulings are satisfied:

- Step 1 (identify the corrected copy): done for all nine promoted files,
  with sha256 comparisons I re-ran myself (below).
- Step 2-3 (failing test first): `tests/draught/measure-suite.test.ts`
  matches the brief's given test verbatim, plus a header comment.
- Step 4 (move, fix imports, selftest passes): confirmed by direct execution
  (below) — 10/10 controls pass from the new location, and from a `cwd`
  outside the repo via an absolute path.
- Step 5 (run directories left alone, one line added to findings): confirmed
  by `git diff --stat` — the nine run-findings `.md` files show only
  insertions (52 insertions, 0 deletions across all nine), and I read each
  diff hunk; none touches anything but the new paragraph.
- Step 6 (commit): two commits, no AI attribution in either message
  (checked directly against the full `%B` text).
- Finding 3 (resolver bridge): not this task's concern — no resolver code
  touched.
- Finding 5 (selftest's control inventory accounts for the deleted script):
  confirmed — `orphan_junctions.py` is referenced nowhere in `selftest.py`,
  before or after the move (`git show 06d6776:docs/research/lib/selftest.py`
  has zero hits too), so there was never a control to remove. `CONTROLS` is
  10 items both before and after, computed from `len(CONTROLS)` not
  transcribed.
- Finding 6 (repo-root resolution): confirmed — `_repo_root()` calls `git
  rev-parse --show-toplevel` with `cwd=HERE` (the script's own directory),
  so it resolves correctly regardless of the caller's cwd. Ran it from `/tmp`
  with an absolute path to the script: still resolved and passed.
- Finding 8 (the `orphan_junctions.py` "returned on purpose" comment):
  corrected in passing, as required — now reads "deleted 2026-10-30 -
  supersede means delete, so it does not return."
- Protected paths (`drafted/`, `docs/schematic/verdicts.md`,
  `schematic/readability-baselines.json`, `TOOLING.md`): `git diff
  06d6776..HEAD` over all four is empty.
- `draughting/copperhead`, `draughting/venv-akcli`: present, untouched.
- `.gitignore`'s `__pycache__/` comment is updated to match the new
  location and still correctly ignores the untracked `__pycache__/` that
  running the scripts leaves in `draughting/measure/`.

VERDICT 2: TASK QUALITY — PASS WITH FINDINGS
----------------------------------------------

The mechanics are sound (gates below all re-ran green), but the per-script
provenance account — the heart of this task — contains one factually wrong
claim that is now baked into a permanently committed file, and the task's
own findings (including two the implementer surfaced correctly) have no
durable, committed home. Neither blocks the artifact from being correct;
both are worth fixing before the next task relies on this one's narrative.

FINDINGS, RANKED
----------------

**Important — the promoted `crossings.py`'s own docstring misstates the
excluded outlier's current defect, and the same wrong claim is repeated in
the commit message and the report.** The docstring (and `dfa964e`'s commit
message, and `task-4-report.md`) say the outlier at
`low-boost-in-thompson-bell-idiom` has "the LITERAL-SPACE pattern" and "no
shared-reader import." I read that file directly: it already imports
`kicad_sheet` and reads through the shared balanced-parenthesis parser - the
literal-space bug was real but was fixed in commit `cedd922` ("Three more
wire parsers of the same class, and the findings"), which landed *before*
`06d6776`, i.e. before Task 4 started. `git merge-base --is-ancestor
cedd922 06d6776` confirms the ordering. The outlier genuinely is weaker for
other, true reasons - no X-crossing/T-meeting split, single-sheet argument
only, whole-mil rounding instead of the shared `TOL` - and the decision to
take the five-way-identical majority over it is correct regardless. But the
*stated* reason is wrong, and it is now the only reason a future reader
sees, in a file this project treats as the authoritative provenance record.
This is exactly the failure class `CLAUDE.md` names hardest ("a stale cause
is worse than a stale count... a stale cause sends the next agent after a
rule that is not there"): the error looks like it was copied from
`docs/research/2026-10-30-lying-checks.md`'s *historical* description of the
bug (true as of when it was found) without re-checking the outlier file's
*current* content before writing the provenance claim down as present tense.

**Important — this task's own findings have no durable, committed home.**
`.superpowers/` is gitignored (confirmed: `git ls-files .superpowers/`
returns nothing, and `.gitignore` carries a bare `.superpowers/` line), and
the brief, rulings, and report for this task all live under
`.superpowers/sdd/2026-10-30-institutionalise-draughting/` - not the
committed `docs/superpowers/plans/<plan>-execution/` location `CLAUDE.md`
requires for a plan's decision record and audit trail. Two things the
implementer correctly discovered and flagged - `center.py`'s reference to a
never-committed `ink_extent.py`, and `crop.py`'s stale `--dpi N` usage
line - exist only in that gitignored report right now. If this plan's
workspace is ever cleaned, both findings vanish with no trace in git
history. This isn't something Task 4's implementer caused (the `sdd`
structure predates this dispatch), but it's a real gap against this
project's own governance rule, worth raising before the plan closes out.

**Minor — the new test's header comment cites a path that does not exist.**
`tests/draught/measure-suite.test.ts`'s comment says "Task 4 of
`docs/superpowers/sdd/2026-10-30-institutionalise-draughting`"; the real,
gitignored path is `.superpowers/sdd/...` (no `docs/`, leading dot).
`docs/superpowers/sdd/` does not exist anywhere in the repo. Harmless (it's
a comment, not code), but it's the same class of unchecked citation as the
finding above.

**Minor — `count_crossings.py` at
`docs/research/2026-10-29-trial-microsoft-schgen/scripts/` was not
considered as a candidate copy.** It's a from-scratch, differently-named
single-regex crossing counter tied to an abandoned tool trial, not a copy of
this lineage, and the brief's file list names specific scripts rather than
"anything that counts crossings" - so excluding it is reasonable. Flagging
only because the brief's phrase "the crossing and label surveys" is loose
enough that a stricter reviewer could ask why this one wasn't in scope; it
doesn't change the outcome.

**Observation, not a finding — the task correctly declined to repair the
non-promoted run-directory scripts that will now `ImportError`.** See
judgement below.

JUDGEMENT ON POINT 3: the broken imports in the frozen run-directory scripts
-----------------------------------------------------------------------------

Verified real, on two scripts neither named in the brief:

    $ python3 docs/research/2026-10-29-mid-full-run/scripts/boxgeom.py
    ModuleNotFoundError: No module named 'kicad_sheet'

    $ python3 docs/research/2026-10-29-mid-full-run/scripts/pwr_survey.py
    ModuleNotFoundError: No module named 'kicad_sheet'

Both import via `sys.path.insert(0, str(pathlib.Path(__file__).resolve()
.parents[2] / "lib"))`, which pointed at `docs/research/lib/` - now deleted.
A `grep` for `docs/research/lib` across the tree turns up roughly thirty
more run-directory scripts in the same state (`pingeom.py`, `verify.py`,
`dump_sheet.py`, `wire_uuid.py`, `colour_check.py`, `metrics.py`, `wires.py`,
`dump_region.py`, `measure.py`, `translate.py`, `make_repairs.py`, and
others), none of them in Task 4's Files list.

**This is acceptable as delivered, and should not have been fixed by Task
4.** Three reasons:

1. Step 5 explicitly scopes this task to leaving the run directories' copies
   alone and not rewriting their findings beyond the one line - repairing
   thirty scripts' import paths is rewriting, not leaving alone, and the
   brief's own Files list enumerates nine specific scripts, not "every
   script that imports `kicad_sheet.py`."
2. They are execution records of runs already approved, not living tools -
   nothing in this plan asks them to keep running, and `netcmp.py`'s,
   `crossings.py`'s etc. own promoted docstrings are explicit that the
   run-directory originals are frozen, unmodified records.
3. The failure mode this breaks is quiet discovery, not quiet wrongness: a
   future reader who tries to re-run one of these thirty scripts gets a
   loud, immediate, correctly-worded `ModuleNotFoundError` naming the exact
   missing module - not a script that runs and reports a wrong number. That
   is the failure mode this project optimizes against hardest, and it is not
   what happened here.

**It does need remedying, but not inside any frozen run record.** The
remedy is a short, generic note at a level *above* any individual run's
findings document - e.g. a one-paragraph addition to `docs/research/`'s own
index or README, if one exists, or a short-lived follow-up task - stating
plainly that `docs/research/lib/` no longer exists, that the nine canonical
scripts now live at `draughting/measure/`, and that any other script still
importing the old path via `sys.path.insert(...parents[2]/"lib")` will
`ImportError` if run directly from its own run directory. That note is not a
run's findings document (which Step 5 protects) and does not touch the
protected paths; it is new, generic documentation, which is squarely in
scope for *a* task even though it was correctly out of scope for *this* one.
Given finding 2 above, the fact that this gap is currently recorded only in
a gitignored report compounds the risk of it being silently lost rather than
picked up by whoever runs the next task in this plan.

POINT 4: dangling pointers to the vanished `docs/research/lib/`
------------------------------------------------------------------

Confirmed the count exactly as the dispatch states: **`TOOLING.md`** (one
reference, at line 392, inside an entry explicitly marked as Task 7's) and
**exactly three** `drafted/pultec/*/RECORD.md` files -
`pultec-hi-boost/RECORD.md`, `pultec-low-boost/RECORD.md`,
`pultec-low-cut/RECORD.md` (there are five `RECORD.md` files under
`drafted/pultec/` total; two don't mention the path). Both are correctly out
of scope: `TOOLING.md` is named Task 7's by this plan, and the `RECORD.md`
files are frozen by controller ruling with an open owner question about
whether they may even be annotated.

I searched the rest of the repository for the same string
(`docs/research/lib`) and found nothing else that is both (a) unprotected
and (b) a live claim about the current layout. Everything else that matches
is one of: the run-directory scripts themselves (frozen execution records,
Step 5's territory, not this task's to rewrite); the nine promoted scripts'
own docstrings, which correctly describe the *old* location as history
("PROMOTED FROM `docs/research/lib/`..."); `docs/research/*.md` narrative
documents describing events that happened while the path was valid; and
`docs/superpowers/plans/` / `docs/superpowers/specs/` planning documents
that describe the pre-task starting state, which is accurate as planning
history. None of those needed fixing in this task.

GATES I DROVE MYSELF
---------------------

- `bun run typecheck` - clean, no output.
- `bun test tests/draught/` - **24 pass / 0 fail**, matching the report.
- Full `bun test`, run alone in the foreground (not relied on from a stale
  log) - **2753 pass / 0 fail across 263 files**, matching the report
  exactly.
- `python3 draughting/measure/selftest.py` - ran it twice: once from the
  repo, once from `/tmp` with an absolute path to the script, to prove the
  `git rev-parse` fix is not cwd-dependent. Both: **10 controls, every one
  moved or fired**, exit 0.
- Broke the control myself (not relayed): reverted `wire_hits()` in
  `draughting/measure/kicad_sheet.py` to endpoint-only semantics
  (`ending = [w for w in wires if w.ends_at(x, y, tol)]`, `return
  Hits(ending, ending, [])`), re-ran `selftest.py`. Result: `1 CONTROL(S)
  FAILED` - `D2/D5 a pin on a wire INTERIOR is seen`, exit 1. (The
  implementer's report describes this same revert surfacing as an
  `IndexError`; my slightly different revert surfaced as an ordinary
  assertion failure instead - both are loud, non-zero-exit failures, so the
  point the control proves is confirmed either way.) Restored the file with
  a byte-for-byte copy taken before the edit; `git status`/`git diff`
  confirmed the restore was exact.
- `git status --short` - clean, including `draughting/`.
- `git diff 06d6776..HEAD -- drafted/ docs/schematic/verdicts.md
  schematic/readability-baselines.json TOOLING.md` - empty (0 lines).
- Control-byte scan with a canary, written as a script rather than a
  one-liner: planted `\x00` and `\r` in an in-memory buffer first, confirmed
  the detector finds them at the right offsets, then scanned all 20 files
  `git diff --name-only 06d6776..HEAD` names. Clean.
- `git show HEAD:CLAUDE.md` vs the working-tree copy, diffed byte for byte -
  identical, no drift.
- AI-attribution check over both commits' full message bodies
  (`git log 06d6776..HEAD --format="%B"`) - none found.
- sha256 comparisons, run myself, for every "N copies were byte-identical"
  claim in the report: `junction_audit.py` (3), `label_survey.py` (5),
  `netcmp.py` (3), and the five-way-identical `crossings.py` claim - all
  confirmed byte-identical as claimed.
- Diffed the promoted `crossings.py` against both the majority copy and the
  outlier directly (not just read the docstring) - see the Important
  finding above.
- Diffed all six `crop.py` copies for lost assertions/controls (grepped each
  for `raise`/`assert`/`SystemExit`/`check=True`) - none carries an
  assertion the promoted copy lacks; the promoted copy's `check=True` calls
  match the pattern already present in every prior copy.
- Confirmed `ink_extent.py` does not exist anywhere in the repository
  (`find . -iname ink_extent.py`, empty) and that `crop.py`'s `[--dpi N]`
  usage line has no corresponding argparse/flag handling in `main()` - both
  exactly as the report states.
- Confirmed `center.py` and `framegeom.py` each had exactly one copy before
  promotion (`git ls-tree -r 06d6776`).
- Confirmed `docs/research/lib/` no longer exists on disk and that its
  untracked `__pycache__/` is gone with it; confirmed the new
  `draughting/measure/__pycache__/` that running the scripts produces is
  correctly matched by `.gitignore`.

WHAT I REASONED ABOUT RATHER THAN RE-DROVE
--------------------------------------------

- The chronological "lineage" claim for `crop.py`'s six copies
  (`hi-boost-full-run` -> `hi-boost-hairpin-fix` -> `hi-cut-full-run`, with
  `low-cut-full-run` branching off `hi-boost-full-run`, and separately
  `mid-full-run` -> `mid-letter-redraw`) - I confirmed the "Adapted from"
  lines each file's own docstring states, which gives a *directed* chain
  (`low-cut-full-run` -> `hi-boost-full-run` -> `hi-boost-hairpin-fix` ->
  `hi-cut-full-run`), and confirmed no copy shares a `CROPS`/`REGIONS` table
  with another. I did not independently verify this against commit
  timestamps, and the report's prose description of the branch structure
  doesn't exactly match the direction the "Adapted from" lines state (it
  reads as though `hi-boost-full-run` precedes `hi-cut-full-run` directly
  and `low-cut-full-run` branches off it, where the files themselves say
  `low-cut-full-run` came first and `hi-boost-full-run` was adapted from
  it). Immaterial to the outcome - the promoted copy is still correctly the
  newest, most general point regardless of the exact branch shape - so I am
  not ranking it as a finding, but noting I did not re-derive it to the same
  rigor as the crossings.py claim.
- Whether every one of the ~30 other run-directory scripts that import
  `docs/research/lib` actually breaks (I drove two, as asked, and grepped
  for the rest rather than running all thirty).
- The exact wording/precedent of `tools/perfboard/repo-root.ts` as the
  pattern `_repo_root()` follows (Ruling 6 cites it as precedent) - read the
  ruling's claim, did not open that file to confirm the two implementations
  match in approach.

RAN VS. REASONED SUMMARY
--------------------------

Ran directly: typecheck, both test suites (scoped and full), selftest.py
(twice, from two locations), the fault-injection/revert on `wire_hits()`,
the protected-path diff, the control-byte canary scan, the CLAUDE.md drift
diff, the AI-attribution grep, every byte-identity claim via sha256, the
crossings.py three-way diff (majority / outlier / promoted), the crop.py
six-way assertion grep, the `ink_extent.py` and `--dpi` existence checks,
the `docs/research/lib` reference sweep, and the `git status`/clean-tree
checks.

Reasoned from evidence rather than independently re-driven: the crop.py
lineage's exact branch shape, and the universality of the ~30-script import
breakage beyond the two I ran.
