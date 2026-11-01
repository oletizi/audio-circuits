Task 1 review: the lockfile and the version check
===================================================

Reviewed at commit `46c30c4` (parent `0684fdb`), branch `feature/schematics-tooling`.

## Verdict: spec compliance

**PASSES.** `draughting/tools.lock.json` is the brief's JSON unmodified.
`tools/draught/toolchain.ts` exports `readLock(): Toolchain` and
`checkToolchain(lock): ToolchainProblem[]` with the exact `ToolchainProblem`
shape the brief and Tasks 2/3/5 require (`tool`, `wanted`, `found: string |
null`, `how`). The brief's two tests are present verbatim and pass; `"any"`
means presence-only (verified by code reading); a probe that cannot run
yields `found: null` and never throws (verified by code reading and by
driving the absent-tool test). Finding 3's resolver-bridge ruling is
discharged: `tools/cli/resolved-default.ts` is extended rather than
reinvented, each new tool gets a `defaultX()` beside the existing install
modules, and `qpdf` is a true alias of `defaultPdfMerge` (same binary,
confirmed by running both `qpdf --version` and `magick --version` directly -
both already resolve via Homebrew paths this repo's existing candidate
lists already name). Finding 7 is addressed with a real regression test that
I drove to red and back to green (below) - not just read. Nothing touches
`drafted/`, `docs/schematic/verdicts.md` or
`schematic/readability-baselines.json` (empty diff, confirmed). The two
controller rulings not available to the implementer are respected: install
locations (`draughting/venv-akcli`, `draughting/copperhead`) are named in
exactly the two new modules the controller later blessed, and `.gitignore`
is untouched (confirmed `git check-ignore` still returns nothing for either
directory, and `tools.lock.json` is the only tracked file under
`draughting/`).

Compliance is not perfect - see Important findings 1 and 2 below, both
inside the `how` strings, which is the one part of the interface Tasks 2/3/5
will print to a human and therefore the part most worth getting right.

## Verdict: task quality

**HIGH, with two Important blemishes.** The code reads `lib/kicad/install.ts`
and genuinely follows its shape rather than copying its words: per-platform
candidate lists where a candidate list makes sense (`magick`), a documented
single-candidate exception where it does not (`copperhead`, with reasoning
rather than a shrug), `found: null` never thrown, an unrecognised platform
throws by name. The module comments are honest about what is unverified
(Linux/Windows candidates for `magick`, `akcli`/`copperhead` entirely, since
neither is installed on this machine) and honest about what is a stated
assumption (the two install directories) rather than a confirmed one. Every
gate specified for this review passes, and I drove rather than read all three
mandated controls (details below). No AI attribution in the commit. No
`any`, no `@ts-ignore`, no new type-unsafe cast beyond one `as string` that
reproduces an idiom already present in the very file the implementer was
told to pattern-match (`lib/kicad/install.ts`'s own `firstExisting`) - noted
as Minor, not charged against this task.

## Findings, ranked

**Important 1 - `howToFix`'s copperhead branch hardcodes `draughting/copperhead`
three times instead of calling the already-imported `defaultCopperheadDir()`,
directly contradicting that module's own comment.**
`tools/draught/copperhead-install.ts` says of itself: *"this is the one
function to change; nothing else in `./toolchain.ts` hardcodes the path a
second time."* That claim is false as written. `toolchain.ts`'s `howToFix`
(the function that builds the `how` string Tasks 2/3/5 print to a person) has:

```
if (tool === "copperhead" && spec.commit !== undefined && spec.upstream !== undefined) {
  return (
    `git clone ${spec.upstream} draughting/copperhead && ` +
    `git -C draughting/copperhead checkout ${spec.commit} && ` +
    "cd draughting/copperhead && npm install"
  )
}
```

`defaultCopperheadDir` is already imported in this file for
`resolveProbeArgv`'s own copperhead branch, which correctly calls it. If
Task 3 (or anyone) ever changes where copperhead is installed, the probe
will keep working (it still calls the function) but the printed fix command
will clone into the *old* location - a `how` that no longer fixes what it
claims to, which this project's own stated standard (*"a wrong `how` is a
refusal that does not teach"*) treats as incomplete. Cheap to fix: build the
string from `defaultCopperheadDir()` instead of the literal.

**Important 2 - the `how` string for a pypi-backed tool (currently only
`akcli`) does not target the venv the probe actually resolves against.**
`howToFix`'s pypi branch returns `pip install 'akcli-kicad==X.Y.Z'`. The
probe for `akcli` resolves through `defaultAkcli()` to
`draughting/venv-akcli/bin/akcli` specifically (not whatever `pip`/`akcli` is
on `PATH`) - `TOOLING.md`'s own reproduction steps install with
`./venv-akcli/bin/pip install 'akcli-kicad==0.22.0' ...`, for exactly the
reason the implementer's own comment names: *"the two committed `run.sh`
scripts already disagree about where that venv is."* A person who pastes the
literal `how` string into a plain shell will very plausibly install into
their system or active Python rather than `draughting/venv-akcli`, run the
check again, and see the same `found: null` - a fix command that does not
fix what the probe checks. This is the one case in this diff where the
"paste-able, actually-fixes-it" bar `how` is held to is not met. (Every
*other* branch of `howToFix` - the generic fallback for `magick`, `qpdf`,
`kicad-cli` - is honest rather than wrong: it names no path it cannot stand
behind.)

**Minor 1 - `copperhead-install.ts`'s `defaultCopperheadDir()` takes no
`platform` parameter and has exactly one candidate, unlike its two new
siblings (`akcli-install.ts`, `magick-install.ts`), which both branch on
three platforms.** This is reasoned and documented (a git checkout directory
is not a per-OS install path), and I agree with the reasoning, but it is the
one resolver among the four new ones that does not demonstrably cover
"three platforms," which review item 1 asked me to check explicitly. Worth
a controller nod rather than a change, since nothing about it is wrong.

**Minor 2 - `candidates[0] as string` in the new `magick-install.ts`
reproduces the one type assertion already present in `lib/kicad/install.ts`'s
`firstExisting` (the file the implementer was explicitly told to pattern-match)
and in `pdf-merge-install.ts`.** `CLAUDE.md`'s "never bypass typing" is a
blanket rule and this is technically within its letter, but it is an
inherited idiom rather than a new one, present in the mandated pattern file
itself. Noted for completeness; not charged against this task.

## Meta-finding: my injected `CLAUDE.md` is stale relative to `HEAD`, and I
caught myself about to reproduce exactly the failure standing instruction 4
warns about.

`git show HEAD:CLAUDE.md` differs from the copy injected into this session.
The injected copy still reads (in the schematic-generator section):

> "NO COUNT OF WHAT DRAWS BELONGS IN THIS FILE. RUN THE TOOL."
> ```
> bun tools/schgen/board-sheets.ts     which boards draw, and what refuses
> bun run tools/schgen/board-geometry.ts     crossings, corners, fallbacks
> ```

`HEAD`'s actual text (`CLAUDE.md:155-159`) says the opposite:

> "NO COUNT OF WHAT DRAWS BELONGS IN THIS FILE. READ THE ARTIFACTS AND RUN THE
> CHECK." The two commands that stood here - `bun tools/schgen/board-sheets.ts`
> ... and `bun run tools/schgen/board-geometry.ts` ... - **are deleted, and
> nothing replaced either of them.**

I confirmed `tools/schgen/` does not exist on disk (`ls`: No such file or
directory) and no `board-sheets.ts`/`board-geometry.ts` exists anywhere in the
tree. This is immaterial to Task 1 itself (it never touches `schgen`), but it
is the exact measured failure mode the rulings file's standing instruction 4
names, reproduced live during this review, and I am recording it rather than
quietly acting on the stale copy. The rest of the file I spot-checked
(opening sections, the final "Transcription is evidence" section, the
G150/G245/G282 history) matched `HEAD` verbatim.

## What I drove versus what I reasoned through

**Driven (reran the actual commands, with before/after state checked):**
- `bun run typecheck` - clean.
- `bun test tests/draught/toolchain.test.ts` - 3 pass, 0 fail, 6 expect() calls.
- `git diff 0684fdb..HEAD -- drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json` - empty.
- Full `bun test`, run alone - **2727 pass, 0 fail, 38552 expect() calls,
  130.04s** - matches the report's claim exactly (it reported 128.12s; the
  ~2s difference is machine load from an unrelated concurrent `bun test`
  process also running on this box at the time).
- **The brief's own positive control**: edited `checkToolchain` to
  `return []` unconditionally before building the problems list, reran the
  test file - both the version-mismatch and absent-tool tests failed exactly
  as expected (`toBeDefined()`/`toBeNull()` received `undefined`). Reverted
  by hand; `git status`/`git diff` on the file came back empty.
- **The Finding-7 regression test's own control**: removed the
  `"kicad-cli": defaultKicadCli` line from `RESOLVED_BINARY`, reran the test
  file - the new kicad-cli test failed exactly as predicted
  (`expect(found).not.toBeNull()` received `null`), the other two still
  passed. Reverted by hand; `git status`/`git diff` on the file came back
  empty, then reran the test file once more to confirm 3/3 pass again.
- A control-byte scan with a canary, in Python (not `grep`, for the reason
  this plan's own standing instructions name): wrote a script that reads all
  8 touched files plus a synthetic file carrying a real NUL byte as a
  canary. **The canary fired** (`control-byte offsets=[16]`); all 8 real
  files came back clean (0 hits).
- Ran `magick --version`, `qpdf --version`, and
  `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli --version` directly,
  and separately with stdout/stderr split to confirm all three print their
  version to **stdout** (so `probeTool`'s `execFileSync` capture actually
  sees it) - `7.1.1-47 Q16-HDRI aarch64 ...`, `qpdf version 12.3.2`, `10.0.5`
  respectively, each correctly extracted or (for qpdf, pinned "any") merely
  required to be present.
- Manually traced `extractVersion`'s regex against each of those three real
  outputs: it stops at the first whitespace, so ImageMagick's
  `7.1.1-47 Q16-HDRI` correctly yields `7.1.1-47` (matching the lock) rather
  than swallowing `Q16-HDRI`; `kicad-cli`'s bare `10.0.5` matches exactly;
  `qpdf`'s `12.3.2` is extracted but irrelevant since its lock entry is
  `"any"`.
- Confirmed the test-count arithmetic directly rather than trusting the
  total: the diff adds exactly one test file with exactly 3 `test(...)`
  calls and touches no other test file, so 2724 -> 2727 is accounted for
  without needing to trust the report's "all three new" characterisation.
- `git check-ignore -v draughting/venv-akcli draughting/copperhead` (both
  return nothing, confirming the controller's "not gitignored today" ruling
  still holds and Task 1 did not change it) and `git ls-files draughting/`
  (only `tools.lock.json` is tracked).
- `git log -1 --format=%B 46c30c4` - no AI attribution.
- `git show HEAD:CLAUDE.md` versus the injected copy (see meta-finding
  above).

**Reasoned through, not independently driven (akcli and copperhead are not
installed on this machine, so their actual `--version` output cannot be
measured here; this matches what the implementer's own report says and what
Finding 7 predicts):**
- That `probeTool("akcli", ...)` and `probeTool("copperhead", ...)` correctly
  return `null` on this machine rather than throwing uncaught - verified
  indirectly: the full suite's 3 passing tests include `checkToolchain(lock)`
  calls that iterate the *entire* lock (including `akcli` and `copperhead`)
  every time, and none of the three tests failed or hung, which is
  consistent with both resolving to `null` cleanly. I did not add a fourth,
  more targeted test myself (out of scope for a review) to isolate this
  further.
- The win32 candidate paths in `magick-install.ts` and the win32 branch of
  `akcli-install.ts` - unverified on this machine, and both modules say so
  themselves.
