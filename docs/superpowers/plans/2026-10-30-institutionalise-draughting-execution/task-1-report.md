Task 1 report: the lockfile and the version check
===================================================

**Status: DONE**

**Commit:** `46c30c4` on `feature/schematics-tooling` (not pushed, per
instruction). Branch HEAD was `0684fdb` at dispatch; this commit is on top
of it with no other commits in between.

**HEAD check (standing instruction 4):** re-read `CLAUDE.md` and
`docs/superpowers/plans/2026-10-30-institutionalise-draughting.md` at HEAD
before writing anything; both matched what the dispatch quoted. No
disagreement found between the injected instructions and the files on disk.

## What was produced

- `draughting/tools.lock.json` - exactly the brief's JSON, unmodified.
- `tools/draught/toolchain.ts` - `readLock(): Toolchain` and
  `checkToolchain(lock): ToolchainProblem[]`, plus an exported `probeTool`
  used by the Finding-7 regression test and internally by `checkToolchain`.
- `tests/draught/toolchain.test.ts` - the brief's two tests verbatim, plus a
  third test for Finding 7 (below).
- **The resolver bridge (Finding 3), not named in the brief's file list:**
  - `tools/draught/magick-install.ts` - `defaultMagick(platform)`, same
    per-platform-candidate shape as `lib/kicad/install.ts`.
  - `tools/draught/akcli-install.ts` - `defaultAkcli(platform)`, resolving
    into `draughting/venv-akcli/bin/akcli` (posix) /
    `Scripts/akcli.exe` (win32). **This is a stated ASSUMPTION about where
    Task 3's `draughting/install.sh` will create the venv** - Task 3 does
    not exist yet, so this names the expected location rather than a
    confirmed one, and is the one function to change if Task 3 picks
    differently.
  - `tools/draught/copperhead-install.ts` - `defaultCopperheadDir()`,
    resolving into `draughting/copperhead`. Same stated-assumption caveat as
    akcli.
  - `tools/guide/pdf-merge-install.ts` - added `defaultQpdf` as an alias for
    the existing `defaultPdfMerge` (same binary, two names for two
    questions: "what joins PDFs" vs. "is the pinned qpdf installed") rather
    than a duplicate candidate list.
  - `tools/cli/resolved-default.ts` - extended its dispatch with `qpdf`,
    `akcli`, `magick`, `copperhead-dir`, each wired to the module above.

## Finding 7 - verified and addressed, not just read

Measured independently before writing code: `magick` and `qpdf` are on
`PATH` (both resolve to `/opt/homebrew/bin/...`, matching the existing
`defaultPdfMerge` candidate already in the repo); `kicad-cli` and `akcli`
are NOT on `PATH`; `kicad-cli` is fully installed and working at
`/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli` (confirmed by
running `kicad-cli --version` directly: `10.0.5`, matching the lock).

`checkToolchain`'s `resolveProbeArgv` substitutes the resolved path for
`kicad-cli`, `akcli`, `magick` and `qpdf` before running anything, and
resolves copperhead's relative `src/cli.ts` against `defaultCopperheadDir()`
rather than changing the probe's working directory. The bare-name form from
the lock is only ever actually executed for a tool with no resolver (the
`nosuchtool` test fixture).

Added test (beyond the brief's two): **"kicad-cli's probe resolves through
the installed-location default, not bare PATH"** - asserts `probeTool`
returns non-null for kicad-cli and that `checkToolchain` reports no problem
for it on this machine. This is the test Finding 7 asked for: it fails
against the brief's literal bare-name probe and passes only once the
resolver substitution exists.

## Controls driven (standing instruction 2)

1. **The brief's own positive control.** Changed `checkToolchain` to
   `return []` unconditionally, ran the suite: both the version-mismatch
   test and the absent-tool test failed as expected (`toBeDefined()` /
   `toBeNull()` both got `undefined`). Reverted; diffed the file byte-for-
   byte against a pre-change copy to confirm the revert was exact.
2. **The Finding-7 regression test's own control.** Temporarily removed the
   `"kicad-cli": defaultKicadCli` line from the `RESOLVED_BINARY` map (so
   the probe would fall through to the bare `kicad-cli` command), ran the
   suite: the new test failed exactly as the dispatch predicted
   (`expect(found).not.toBeNull()` received `null`). Reverted; confirmed
   byte-identical to the pre-change file.

## Gates

- `bun run typecheck`: clean, no output, no errors.
- `bun test tests/draught/toolchain.test.ts`: `3 pass, 0 fail, 6 expect() calls`.
- `bun test` (full suite, run alone): `2727 tests across 259 files, 0 fail,
  38552 expect() calls, 128.12s`.
- `git diff -- drafted/ docs/schematic/verdicts.md
  schematic/readability-baselines.json`: empty.
- Control-byte scan with a canary (written in Python, not `grep`, since
  macOS `grep` has no `-P` and this plan's own standing instructions name
  that as a measured failure mode): canary NUL byte detected correctly,
  zero control-byte hits across all 8 touched files.

## Concerns for the task owner / for Tasks 2, 3, 5

- **The akcli and copperhead install-location defaults are my own
  assumption, not a confirmed decision.** Nothing in the plan, spec or
  rulings names where `draughting/install.sh` (Task 3) will put the venv or
  the checkout. I chose `draughting/venv-akcli` and `draughting/copperhead`
  because they are the natural siblings of `draughting/tools.lock.json`
  and reuse `TOOLING.md`'s own directory names, but Task 3 should either
  confirm this or change the two functions - nothing else duplicates the
  path, by design.
- **`akcli` and `copperhead` are correctly reported absent** on this
  machine (not installed anywhere yet) - this is the expected state per
  Finding 7, not a defect; Task 3 installs them.
- Did not touch any Makefile, `TOOLING.md`, or `README.md` - those belong to
  Tasks 2, 3, 5, 7 per the plan.

## Fix round 1

**Status: DONE**

**Commit:** `0564883` on `feature/schematics-tooling` (not pushed), on top
of `46c30c4`.

**Verdict received:** spec compliance PASSES, task quality HIGH, with two
Important findings (I-1, I-2) and two Minors (M-1, M-2). Full review at
`.superpowers/sdd/2026-10-30-institutionalise-draughting/task-1-review.md`.

**I-1 fixed - `howToFix`'s copperhead branch no longer hardcodes
`draughting/copperhead`.** It now calls `defaultCopperheadDir()` (the same
function `resolveProbeArgv` already calls for the probe itself), so the
printed `git clone`/`checkout`/`npm install` command targets exactly where
the probe looked, under any future change to that function. Drove it: with
the literal restored, the new regression test ("Important 1: copperhead's
fix command clones into the directory the probe actually resolves...")
failed with the expected-vs-received mismatch
(`.../draughting/copperhead` as a bare literal where an absolute,
resolver-derived path was expected); with the fix restored, it passes.
Diffed the file byte-for-byte against the fixed version after reverting the
fault injection to confirm the revert was exact.

**I-2 fixed - the pypi `how` branch now installs with the `pip` that lives
beside the resolved binary, not a bare `pip install`.** New `venvPipFor`
takes the resolver's own return value (`defaultAkcli()`'s path to
`draughting/venv-akcli/bin/akcli`), takes its directory, and names the `pip`
(or `pip.exe`) sibling in that same directory - so the command installs into
the identical venv `probeTool` reads `akcli` from, not whatever `pip`
happens to be first on `PATH`. **Driven, not just changed:** the new
regression test ("Important 2: akcli's fix command installs with the pip
that lives beside the akcli binary...") asserts the `how` string contains
`path.dirname(defaultAkcli())` - the live resolver's own directory, not a
written-out literal - and that it is NOT the bare `pip install '...'` form.
With the bare form restored, the test failed showing the received string
was exactly `pip install 'akcli-kicad==0.0.1'` with no path in it at all;
with the fix restored, it passes. Reverted the fault injection and
confirmed byte-identical to the fixed file.

**Minor 1 taken: documented, not changed.** Added an explicit paragraph to
`copperhead-install.ts`'s module comment stating that its single candidate
is deliberate (it resolves a location inside this checkout, not an OS
install path that would vary by platform) rather than an incomplete version
of `akcli-install.ts`/`magick-install.ts`'s three-platform shape. No code
change, per the reviewer's "either justify or give it the shape" choice.

**Minor 2 not taken: left as-is, as instructed.** The `candidates[0] as
string` in `magick-install.ts` is the same idiom `lib/kicad/install.ts`'s
`firstExisting` already carries (the file this task was told to
pattern-match), not a new violation. Leaving it, per the reviewer's own
framing that removing it is not free (it would mean diverging from the
pattern file's own idiom) and the reviewer did not charge it against this
task.

**Meta-finding re-checked: my injected `CLAUDE.md` is also stale on the
exact paragraph the reviewer flagged, and my original report above (line
10-13, "No disagreement found") was wrong.** Re-ran `git show
HEAD:CLAUDE.md` for the schematic-generator section. HEAD reads (around the
"NO COUNT OF WHAT DRAWS BELONGS IN THIS FILE" line):

> "NO COUNT OF WHAT DRAWS BELONGS IN THIS FILE. READ THE ARTIFACTS AND RUN
> THE CHECK." The two commands that stood here - `bun
> tools/schgen/board-sheets.ts` ... and `bun run tools/schgen/board-geometry.ts`
> ... - **are deleted, and nothing replaced either of them.**

My own injected copy of `CLAUDE.md` for this task still reads:

> "NO COUNT OF WHAT DRAWS BELONGS IN THIS FILE. RUN THE TOOL."
> ```
> bun tools/schgen/board-sheets.ts     which boards draw, and what refuses
> bun run tools/schgen/board-geometry.ts     crossings, corners, fallbacks
> ```

These disagree, and `tools/schgen/` does not exist on disk (confirmed by
`ls`). **The reviewer is right and I am the second agent to reproduce the
exact failure standing instruction 4 names.** This is immaterial to Task 1
(nothing here touches `schgen`), and I am recording the correction here
rather than quietly treating my earlier "no drift found" claim as still
true. I did not edit `CLAUDE.md` - that is not in this task's scope and
nobody asked for it.

**Gates re-run after the fix:**
- `bun run typecheck`: clean, no output.
- `bun test tests/draught/`: `5 pass, 0 fail, 14 expect() calls`.
- `git diff -- drafted/ docs/schematic/verdicts.md
  schematic/readability-baselines.json`: empty.
- Control-byte scan with a canary (Python, not `grep`), over the three
  files this fix round touched (`tools/draught/toolchain.ts`,
  `tools/draught/copperhead-install.ts`,
  `tests/draught/toolchain.test.ts`): canary NUL detected correctly, zero
  hits in all three.

**Nothing in this fix round disagreed with the review.** Both Important
findings were real and are fixed; both Minors are handled as the reviewer
offered.
