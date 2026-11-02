# Task 4 report: one home for the measurement scripts

## Status

Done. Two commits on `feature/schematics-tooling`, not pushed per instruction:

- `dfa964e` — Give the measurement scripts one home at `draughting/measure/`
- `a88702c` — Point each run's findings at the promoted measurement scripts

## Test summary

- `bun run typecheck` — clean, no output.
- `bun test tests/draught/` — **24 pass / 0 fail** (was 23; the new
  `measure-suite.test.ts` adds one).
- `python3 draughting/measure/selftest.py` final line: **`10 controls, every
  one moved or fired`** (full run observed directly, not predicted — every
  one of the ten PASSed).
- Full `bun test` (run alone, observed): **2753 pass / 0 fail across 263
  files** (was 2752/262 before this task; the delta is exactly the one new
  test added here).
- `git status --short`: clean, including `draughting/`.
- `git diff -- drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json TOOLING.md`: empty.
- Canary'd scan (Python, not `grep -P`): planted a NUL, confirmed the
  detector finds it, then scanned every file this task touched for NUL/CR —
  all clean.
- `git show HEAD:CLAUDE.md` vs. the working-tree copy: **byte-identical, no
  drift.**

## What moved, and where each promoted copy came from

`draughting/measure/` now holds nine files: `kicad_sheet.py`, `selftest.py`,
`junction_audit.py`, `framegeom.py`, `center.py`, `crossings.py`,
`label_survey.py`, `netcmp.py`, `crop.py`.

**`kicad_sheet.py` and `selftest.py`** — actually moved (`git mv`) out of
`docs/research/lib/`, which no longer exists (it held only these two tracked
files; the `__pycache__/` beside them was untracked and was not promoted,
per the observation in `rulings.md`). `docs/research/lib/` is the already-
single canonical home these two had, not a run directory's execution record,
so Step 5 ("leave the run directories' copies alone") does not apply to them.

**The other seven** — copied (not moved) from whichever run directory held
the corrected copy; the run-directory originals are untouched.

- **`junction_audit.py`** — three copies existed
  (`hi-boost-full-run`, `hi-cut-full-run`, `mid-full-run`), **byte-identical**
  at promotion time (`diff` confirmed, empty both ways). Took `mid-full-run`'s;
  nothing was discarded because there was nothing to discard between.
- **`crossings.py`** — six copies. Five
  (`hybrid-pass-1`, `low-cut-full-run`, `hi-boost-full-run`, `hi-cut-full-run`,
  `mid-full-run`) are **byte-identical**: the "true crossings vs. T-meetings"
  version, multi-sheet-argument, reads through `kicad_sheet.py`. The sixth,
  `low-boost-in-thompson-bell-idiom`, is an **older, weaker script**: a
  literal-space wire pattern (the exact defect class this whole toolkit was
  promoted to fix out of), single-sheet argument only, no X-crossing/T-meeting
  split, no shared-reader import. Took the five-way identical copy
  (`mid-full-run`'s); the outlier was correctly not chosen, and its own
  weaknesses are now named in the promoted file's docstring and in that run's
  findings doc.
- **`label_survey.py`** — five copies
  (`hybrid-pass-1`, `hi-cut-full-run`, `hi-boost-full-run`, `low-cut-full-run`,
  `mid-full-run`), **byte-identical**. Took `mid-full-run`'s.
- **`netcmp.py`** — three copies
  (`mid-full-run`, `hi-cut-full-run`, `hi-boost-hairpin-fix`),
  **byte-identical**. Took `mid-full-run`'s. It does not import
  `kicad_sheet.py` at all (compares `kicad-cli`'s own netlist XML export), so
  it was never a candidate for the two-textual-forms defect class.
- **`framegeom.py`** — one copy only (`mid-letter-redraw`). No diff needed.
  Does not import `kicad_sheet.py` (measures a render, not a sheet file).
- **`center.py`** — one copy only (`centre-and-promote`). No diff needed.
  Does not import `kicad_sheet.py` — it has its own narrower, independently
  verified regex pair. Its docstring names three sibling scripts to run by
  hand: `frame_svg.py` and `coord_heads.py` exist only at
  `docs/research/2026-10-30-centre-and-promote/scripts/` and were not
  promoted (not in the brief's list); `ink_extent.py` **does not exist
  anywhere in this repository under any name a search found** — the
  docstring refers to a script that was apparently never committed. Recorded
  here rather than silently discovered later, per this repo's own rule about
  a demand or claim needing to be checked rather than transcribed. Not fixed
  — out of this task's scope, and not something I'm positioned to invent.
- **`crop.py`** — six copies, and unlike the others, **no two share a crop
  table**: each is "Adapted from" the one before it in its own docstring (a
  lineage: `hi-boost-full-run` → `hi-cut-full-run` and `hi-boost-hairpin-fix`
  → `mid-full-run` → `mid-letter-redraw`, with `low-cut-full-run` a side
  branch). I took `mid-letter-redraw`'s: it is the newest and most general
  point in that lineage — per-region DPI, a `tempfile` working directory
  instead of leaving PDF/PNG siblings beside the output, and two distinct
  boxes per region (`--side before|after`) rather than assuming one box
  works on both sides of a repair. Its literal `REGIONS` table is specific to
  that one run, exactly as every prior copy's table was specific to its own
  run — the mechanics are what's promoted; a future caller is expected to
  replace the table, as every run before this one did. **One pre-existing
  discrepancy I did not fix**: its own usage line claims `[--dpi N]` as a CLI
  flag, but the script only takes three positional arguments — `dpi` comes
  from the per-region table, not a flag. Inherited from the copy I promoted,
  not introduced by the move; flagged rather than silently carried or
  silently fixed.

## Finding 5, re-confirmed rather than re-asserted

Read `selftest.py` in full before moving it. `control_orphan_count`'s subject
is the local helper `orphan_count()` defined in the same file — nothing in
`selftest.py` references the deleted `orphan_junctions.py` by name, and the
one place a comment did name it (`kicad_sheet.py:328`, Finding 8) is now
corrected to say it is deleted rather than that it "returns." Ran the suite
before and after the move: **10 controls both times**, count computed from
`len(CONTROLS)`, not transcribed.

## Finding 6, the path-arithmetic fix

`selftest.py`'s `REPO` used to be `HERE.parents[2]`, correct only from
`docs/research/lib/`. Replaced with a `_repo_root()` that asks
`git rev-parse --show-toplevel` from the script's own directory and refuses
loudly if git can't answer. `RESEARCH = REPO / "docs/research"` is otherwise
unchanged, so the seven committed-sheet fixtures (`MID`, `HICUT`, and the
five more in `SHEETS`) still resolve to `docs/research/2026-10-29-*/...`,
which stayed exactly where they were. Verified by running the suite from its
new location: all ten controls still measure the same baselines
(e.g. "2362 attributed points across 7 sheets, 0 stray").

## What I drove

1. **Every control, from the new location.** `python3
   draughting/measure/selftest.py` run directly: 10/10 PASS, matching the
   numbers in `docs/research/2026-10-30-lying-checks.md` (e.g. D4's 26→0,
   D3's 64→82, D1's 0→2).
2. **Proved the suite can fail.** Temporarily reverted `wire_hits` in
   `kicad_sheet.py` to the superseded endpoint-only semantics
   (`Hits(ending, ending, interior)` instead of `Hits(through, ending,
   interior)`) — reintroducing exactly the D2/D5 blind spot this toolkit
   exists to fix. `selftest.py` crashed with a loud, non-zero-exit failure
   (`IndexError` inside `control_interior_vs_endpoint`, because the control
   could no longer find a pin on a wire interior at all), and `bun test
   tests/draught/measure-suite.test.ts` failed the same way. Reverted; `git
   diff` on the file afterward showed only my intended edits, confirming the
   revert was exact.
3. **Functional smoke test of the three import-path-fixed scripts** from
   their new sibling-file location: `junction_audit.py`, `crossings.py`,
   `label_survey.py` all ran against `docs/research/2026-10-29-mid-full-run/mid-hybrid.kicad_sch`
   and printed sane output (e.g. junction_audit: "ORPHAN JUNCTIONS: 0").
4. **Canary'd byte scan** (Python, since macOS `grep` has no `-P`): planted a
   NUL in an in-memory copy, confirmed the scanner finds it, then scanned
   every file this task touched for NUL/CR bytes — clean.
5. **CLAUDE.md drift check**: `git show HEAD:CLAUDE.md` diffed byte-for-byte
   against the working copy — identical, no drift.

## Other consequences, recorded rather than fixed (out of scope)

- **The run-directory copies that still import from `docs/research/lib/`
  will no longer resolve if anyone runs them directly.** This isn't limited
  to the seven scripts named in the brief: `boxgeom.py`, `pwr_survey.py`,
  `pingeom.py`, `verify.py`, `dump_sheet.py`, `wire_uuid.py`,
  `colour_check.py` and others in the run directories also imported
  `kicad_sheet.py` the same way and are **not** promoted by this task (not in
  the brief's file list). They are frozen execution records per Step 5 and
  were never required to keep running, but a future reader who tries to
  re-run one of them from its run directory will hit an `ImportError`, not a
  stale-but-working script.
- **`TOOLING.md:392`** and three `drafted/pultec/*/RECORD.md` files reference
  `docs/research/lib/kicad_sheet.py`, which no longer exists at that path.
  Both are explicitly out of scope: `TOOLING.md` is Task 7's, and
  `drafted/` is protected by this task's own gate (confirmed empty diff
  above). Not touched.
- **`center.py`'s `ink_extent.py` reference** doesn't resolve to any file in
  the repository (see above) — a documented tool that appears to have never
  been committed.
- **`crop.py`'s `--dpi N` usage claim** doesn't match its actual argument
  parsing (see above) — inherited, not introduced.

## Protected paths and toolchain

`drafted/`, `docs/schematic/verdicts.md`, `schematic/readability-baselines.json`,
`TOOLING.md` — all untouched (empty diff, verified above).
`draughting/copperhead` and `draughting/venv-akcli` — present, untouched.
Nothing said about any drawing's quality; no such judgement was made.

---

## Fix round 1 (review verdicts: spec compliance PASS, quality PASS WITH FINDINGS)

**Status:** done. One commit on `feature/schematics-tooling`, not pushed:
commit SHA is recorded below once made.

**Gates, observed:** `bun run typecheck` clean. `bun test tests/draught/`:
**24 pass / 0 fail across 4 files**. `python3 draughting/measure/selftest.py`
final line: **`10 controls, every one moved or fired`**. Full `bun test`
(run alone, observed before this line was written): **2753 pass / 0 fail
across 263 files**. `git status --short`: clean after commit. Canary'd scan
(planted NUL confirmed detected, then scanned every file touched this
round) clean. `CLAUDE.md` vs. `git show HEAD:CLAUDE.md`: byte-identical, no
drift. Sabotage drive repeated on `wire_hits()` (same `Hits(ending, ending,
interior)` substitution as before): `selftest.py` crashed with the same
loud `IndexError`, the new test failed the same way, and after reverting
`git diff draughting/measure/kicad_sheet.py` was empty - the file carries
no net change from this fix round.

### I-1 — corrected, and the commit message's overstatement is acknowledged rather than rewritten

Verified directly: `docs/research/2026-10-29-low-boost-in-thompson-bell-idiom/scripts/crossings.py`
already contains `import kicad_sheet` and the sentence "It now reads through
`docs/research/lib/kicad_sheet.py`". `git merge-base --is-ancestor cedd922
06d6776` confirms commit `cedd922` ("Three more wire parsers of the same
class, and the findings") is an ancestor of this task's own starting commit
- the fix landed before Task 4 began, not during it.

`draughting/measure/crossings.py`'s docstring is corrected in place: the
false "no shared-reader import" claim is replaced with the three true
differences I verified by reading the file - no X-crossing/T-meeting split,
single-sheet argument only, and `round(v * MM)` mil-rounding in place of
`kicad_sheet.TOL`. The exclusion decision itself was already right; only the
stated cause was wrong, and the docstring says so explicitly rather than
quietly swapping the reason.

On `dfa964e`'s commit message: it does not use the exact words "no
shared-reader import", but it does say the outlier was excluded for "the
older literal-space wire pattern" without qualifying that the pattern was
historical, which reads as the same overstatement and is not accurate as of
promotion time. Per this project's own rule (new commits, not rewritten
ones) and the git-safety instruction against amending, `dfa964e` is left as
committed. `draughting/measure/crossings.py`'s docstring is the correction
of record for both the file and the commit message.

### I-2 — findings moved beside the code, not left only in the gitignored report

`center.py`'s `ink_extent.py` finding was **already** committed beside the
code in `dfa964e` (its own PROMOTED paragraph, lines ~57-66) - checked by
`git show dfa964e:draughting/measure/center.py`, confirmed present. No
further action needed there.

`crop.py`'s `--dpi N` finding was **not** beside the code - only in this
report. Fixed: `draughting/measure/crop.py`'s docstring now states the
discrepancy directly, and adds a measurement that sharpens it: none of the
five ancestor copies mention "dpi" in any form (`grep -l dpi` across all
five returns nothing), so the flag was never real anywhere in this lineage -
it was written into the usage line in this same file, alongside the
per-region `REGIONS` table, and never wired to an argument. Not fixed (the
underlying behavior is unchanged); only named.

### M-1 — fixed

`tests/draught/measure-suite.test.ts`'s header comment cited
`docs/superpowers/sdd/...`; corrected to `.superpowers/sdd/...`, the real
path.

### M-2 — fixed

Found `docs/research/2026-10-29-trial-microsoft-schgen/scripts/count_crossings.py`:
a standalone regex-only wire-crossing counter with no `kicad_sheet` import,
written for the abandoned Microsoft-schgen trial, in the one directory
`docs/research/2026-10-30-lying-checks.md` itself calls dead. Added a
paragraph to `draughting/measure/crossings.py`'s docstring naming it and
stating why it was never a candidate: same subject, different tool, dead
directory.

### `crop.py` lineage — checked, and my original account was wrong in two places

Re-derived from each file's own "Adapted from" line plus
`git log --diff-filter=A` on each exact path (not `--follow`, which produced
a false-positive shared root across unrelated paths on a first attempt).
**Verified chain, in creation order:** `low-cut-full-run` (2026-10-29 01:30,
the root - cites nothing) is cited by `hi-boost-full-run` (11:47) as what it
adapted from; `hi-boost-full-run` is cited by `hi-boost-hairpin-fix` (12:39);
`hi-boost-hairpin-fix` is cited by `hi-cut-full-run` (14:29). `mid-full-run`
(17:37) and `mid-letter-redraw` (next day, 12:42) carry **no** "Adapted
from" citation at all; `mid-full-run` is next in time and closest in
mechanics to `hi-boost-hairpin-fix`'s `os.path`/`magick` style, and
`mid-letter-redraw` is a rewrite that names "the hi-cut run's... finding" in
prose - a reference to that run's finding, not evidence its code was
adapted from that run's file.

My original report said "`hi-boost-full-run` -> `hi-cut-full-run` and
`hi-boost-hairpin-fix` -> `mid-full-run` -> `mid-letter-redraw`, with
`low-cut-full-run` a side branch off `hi-boost-full-run`." Two things were
wrong: the `low-cut-full-run`/`hi-boost-full-run` direction is reversed
(`low-cut-full-run` is the upstream root that `hi-boost-full-run` was
adapted FROM, not a branch off it), and `hi-cut-full-run` was collapsed to
descend directly from `hi-boost-full-run`, skipping `hi-boost-hairpin-fix`,
when its own citation names `hi-boost-hairpin-fix`. The reviewer's doubt was
right. `draughting/measure/crop.py`'s docstring now carries the corrected
chain, stated as citation-plus-date evidence rather than asserted.

### Standing instructions re-driven this round

Sabotage-and-revert on `wire_hits()`: confirmed failing, confirmed clean
revert (see Gates above). Canary'd scan: confirmed firing, then clean on
every file touched this round. `CLAUDE.md` vs. HEAD: byte-identical. No AI
attribution added; no `sed` writes; no `#` in heredocs; no control-character
escapes typed into any tool parameter; no fallbacks outside test code; no
typing bypassed (this is all Python/docstring/Markdown work, no TypeScript
`any`/`as`/`@ts-ignore` introduced). `drafted/`, `docs/schematic/verdicts.md`,
`schematic/readability-baselines.json` and `TOOLING.md` untouched this round
too. `draughting/copperhead` and `draughting/venv-akcli` untouched.

### Anything I disagree with

Nothing in the review. The one thing I'd flag back: the coordinator's
message states `dfa964e`'s commit message "cannot be rewritten now that it
is pushed" - checked, and `origin/feature/schematics-tooling` is still at
`06d6776`; `dfa964e` and `a88702c` are two commits ahead of origin,
unpushed. It doesn't change what to do (this project's rule against
amending commits applies regardless of push state, and the coordinator's
own instruction was to acknowledge rather than rewrite), so I left it as
committed either way - but the stated reason for leaving it alone was itself
not quite accurate, and it seemed worth saying rather than quietly
correcting in my own head.
