Task 3 report: the install script
==================================

STATUS: implementation complete and the tools/draught/ suite is verified;
NOT YET COMMITTED. A full-repository `bun test` rerun (needed to confirm a
bunfig.toml fix, discovered mid-task, didn't disturb anything outside
tests/draught/) was still running in the background when this report was
forced to close out. Nothing has been committed - there are no commit SHAs
to report. Recommend: read
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/full-bun-test.log`
for that run's final pass/fail counts, confirm they match the shape described
below, then commit everything listed under "Files touched" as one commit
(install.sh + .gitignore together, per R2) followed by a second "fix round"
commit for the R6 toolchain.ts change - or squash, at the owner-task's
discretion. **Do not push** (per the dispatch instructions).

What was built
---------------

- `draughting/install.sh` (new, executable): clones copperhead at the pinned
  commit, `npm install`s it, creates the akcli venv, `pip install`s the
  pinned `akcli-kicad` version, then runs `akcli doctor` as an advisory
  sanity check. Pins the commit hash and the pypi spec as literal strings
  (not re-read from the lock at install time), refuses by name (no fallback)
  on any install failure, and is safe to re-run: an existing copperhead
  checkout already at the pinned commit is left alone (clone would refuse
  outright on an existing directory); an existing venv is simply re-targeted
  by `pip install` (already idempotent). Written with the Write tool, never
  a heredoc.
- `tests/draught/install-script.test.ts` (new): the brief's literal-pin test
  (script text contains the lock's `copperhead.commit` and `akcli.pypi`),
  plus a test that both `draughting/copperhead` and `draughting/venv-akcli`
  are individually `git check-ignore`d (R2).
- `.gitignore`: added `draughting/copperhead` and `draughting/venv-akcli`,
  **without a trailing slash** - deliberately. A trailing-slash
  ("directory-only") pattern only matches once the directory exists on disk,
  so `git check-ignore` reported these as NOT ignored before `install.sh` had
  ever run - exactly the window R2 exists to close. Measured directly: with
  the slash, `git check-ignore -v draughting/copperhead` exits 1 until the
  directory is created; without it, it exits 0 unconditionally.
- `tools/draught/toolchain.ts` (R6): `howToFix` now takes the probe's
  `found` value (already computed by `checkToolchain`, not reprobed) and
  chooses between a BOOTSTRAP command (nothing answered the probe at all -
  venv/checkout missing) and an UPGRADE command (something answered, just
  the wrong version - venv/checkout exists). Exported so it can be unit
  tested directly with a synthetic `found`, independent of whatever is
  actually installed on the machine running the suite. Argued below under
  "R6 decision".
- `tests/draught/toolchain.test.ts`: added four tests ("R6 bootstrap"/"R6
  upgrade" x copperhead/akcli) driving the exported `howToFix` directly;
  loosened Important-1's assertion from the literal old (and, per R6,
  sometimes-wrong) `git clone ...` string to `toContain(dir)`, because on
  THIS machine, after the real install, `checkToolchain`'s real probe now
  finds copperhead for real, which correctly routes through the new
  UPGRADE branch rather than the old bootstrap-only one - the old assertion
  would otherwise fail precisely because the fix it checks now works.
- `tsconfig.json`: added `draughting/copperhead` to `exclude`. Without this,
  `bun run typecheck` fails on ~30 unrelated type errors from copperhead's
  OWN test suite (a third-party project with its own strictness and its own
  bugs, now present on disk because this task installs it there for real).
- `bunfig.toml` (new): `[test]` `root = "tests"`. **Not in the brief, found
  while running the gates.** A bare `bun test` recursively discovers every
  `*.test.ts` under the whole repository by default, with no leading-dot
  exemption the way `.tools/` (the VeroRoute fork) gets for free - and once
  `install.sh` actually clones copperhead, the full suite picked up
  copperhead's OWN test suite and ran it as though it were this
  repository's, producing 42 failures and 6 errors that have nothing to do
  with this repository (a CLI smoke test expecting its own dependency tree,
  a platform-specific path probe written for a different repository's
  layout, a `vi.unstubAllEnvs` call from a vitest version this repo doesn't
  have). Confirmed empirically: `bun test` with no filter reported "5346
  files searched"; after `root = "tests"`, "422 files searched", and an
  explicit substring match against a copperhead test file name found
  nothing. Confirmed every one of this repository's own test files already
  lives under `tests/` (`find . -name "*.test.ts"` outside `node_modules/`,
  `.tools/` and `draughting/` returns nothing), so this is a pure exclusion,
  not a narrowing of what the suite actually covers.
- `TOOLING.md`: one new paragraph (R5) stating the accepted risk -
  `install.sh` depends on `github.com/copperheadhq/copperhead` and PyPI
  staying reachable and the pinned commit/release staying available there,
  with no vendored fallback if either disappears; that is the trade taken
  over vendoring. Nothing else in the file was touched - the stale "NEITHER
  TOOL IS PINNED" section a few lines below is Task 7's, per R5.
- `README.md`: one new Prerequisites bullet naming copperhead/akcli-kicad,
  `draughting/install.sh`, and `make draught-doctor`, noting neither is
  required for `bun test` - only for drawing a schematic.

R6 decision, argued
--------------------

Bootstrap and upgrade needed two different commands because `git clone`
refuses outright onto an existing directory (the mismatch case: a checkout
present at the wrong commit) and `pip install` into a venv's `bin/pip` fails
`No such file or directory` when the venv itself was never created (the
bootstrap case, which was this machine's actual state before this task ran).
The natural discriminator is `checkToolchain`'s own `found` value: `null`
means the probe could not run AT ALL (nothing is there to fetch into or
install beside), and a bootstrap command is correct; any other value means
the probe ran and reported something (the checkout or venv genuinely
exists), and an upgrade-only command is correct. This is strictly cheaper
than re-probing the filesystem a second time inside `howToFix` (which would
also need an override-free resolver call, same as the probe itself), and it
makes the function directly unit-testable with a synthetic `found` rather
than depending on which of the two states happens to be true on whatever
machine runs the suite.

Gates
-----

- `bun run typecheck`: clean (`$ tsc --noEmit`, no output), both before and
  after the `draughting/copperhead` exclude was needed.
- `bun test tests/draught/`: **19 pass, 1 fail** (was 14 pass / 0 fail before
  this task). The 9 new tests (2 in install-script.test.ts, 4 R6 tests, and
  the loosened-not-dropped Important-1 still counts as 1) account for the
  rise from 14 to 20 total; the one failure is
  `tests/draught/doctor.test.ts`'s "fix round 2 regression (end to end)"
  test, which refuses by its OWN design - `if (fs.existsSync(resolvedAkcli))
  throw ...` - rather than touch a real akcli install. That refusal is
  *correct* per that test's own stated safety contract ("this test must
  never touch a genuine install"); it is firing now because this task's
  real install (R3/R4) is the first time a real `akcli` has ever existed at
  that path. **This is a structural tension this task did not create and
  isn't mine to fix** (Task 2 is closed; I did not touch
  `tools/cli/draught.ts`, and modifying another task's test file was out of
  scope) - flagged under Concerns below.
- `make draught-doctor`, run for real after the install (R4), **verbatim**:

```
akcli doctor (ADVISORY - does not gate this verb's exit code; checks python, kicad-cli, ngspice, symbols, config and network, beyond the single pinned version checkToolchain verifies below):
# akcli doctor
  ok       python     3.14.6 (/Users/orion/work/audio-circuits-work/pultec-modularize/draughting/venv-akcli/bin/python3.14)
  ok       akcli      0.22.0 (installed wheel)
  ok       schemas    ops capabilities load (22 ops)
  ok       kicad-cli  /Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli
  ok       ngspice    /Applications/KiCad/KiCad.app/Contents/PlugIns/sim/libngspice.0.dylib
  ok       symbols    Device:R via /Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols/Device.kicad_sym
  MISSING  config     no akcli.toml found (walking up from cwd)
                      hint: optional: only pinmap/rails/waivers/grid need one
  ok       workspace  clean workspace

draught-doctor: every tool pinned in draughting/tools.lock.json matches - checked draughting/tools.lock.json against what is actually installed.
```

  Exit code 0. This is the first time this verb's success path has executed
  for real on this machine (R4) - before this task's install, the same
  command reported 2 toolchain disagreements (copperhead and akcli both
  "found nothing") and exited 2.
- `git status --short`: clean of `draughting/copperhead` and
  `draughting/venv-akcli` (they do not appear at all, confirming the
  gitignore entries work) - at the time of this report it shows only the
  intended, uncommitted changes:
  `M .gitignore`, `M README.md`, `M TOOLING.md`, `M tests/draught/toolchain.test.ts`,
  `M tools/draught/toolchain.ts`, `M tsconfig.json`,
  `?? bunfig.toml`, `?? draughting/install.sh`,
  `?? tests/draught/install-script.test.ts`.
- `git check-ignore -v draughting/copperhead draughting/venv-akcli`: both
  resolve, both print the new `.gitignore` lines.
- Canary'd control-byte scan (planted a NUL in a scratch copy of
  `install.sh`, confirmed the scanner caught it, then scanned every touched
  file): all clean -
  `draughting/install.sh`, `tests/draught/install-script.test.ts`,
  `tools/draught/toolchain.ts`, `tests/draught/toolchain.test.ts`,
  `.gitignore`, `TOOLING.md`, `README.md`, `tsconfig.json`.
- `git diff -- drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json`:
  empty.
- `git show HEAD:CLAUDE.md` vs the working copy: **identical, byte for
  byte** - no drift, checked mechanically with `diff`, not by eye.
- Full `bun test` (run alone, not beside `make`): the first run (before the
  `bunfig.toml` fix) surfaced the copperhead-test-suite collision described
  above - 3883 pass, 21 skip, 42 fail, 6 errors, essentially all of the 42+6
  attributable to `draughting/copperhead/test/*` by file path. A corrected
  rerun with `bunfig.toml` in place was started and was **still running in
  the background when this report had to close out** - its log is at the
  path named at the top of this report. I did not fabricate its result; the
  caller or a follow-up should read that log before committing, though the
  `tests/draught/` and `tests/` discovery-count evidence above (422 files,
  all under `tests/`, matching what `find` independently confirms) is strong
  evidence the rerun will land at or near whatever the pre-task-3 full-suite
  baseline was, since nothing outside `tools/draught/toolchain.ts` (an
  internal, previously-unexported function) and the three config files
  changed in a way that could affect any other test.

Controls driven
----------------

- Install-script literal-pin test: mutated the pinned commit string in
  `install.sh` to all-zeros, watched the pin test fail with the exact
  expected/received diff, reverted, reran clean.
- Gitignore test: removed the two new `.gitignore` lines, watched
  `git check-ignore` throw (exit 1) in the test, reverted, reran clean.
- R6 bootstrap/upgrade: reverted `howToFix` to the old single-command-per-tool
  shape, watched both new "R6 upgrade" tests fail with the exact wrong
  string present (`git clone` where it must not be; a bare pip install where
  a venv-creation prefix was expected), restored the fix, reran all 9
  `toolchain.test.ts` tests clean.
- Canary: planted a NUL byte in a scratch copy of `install.sh`, confirmed
  the scan script reports it, then ran the real scan against every touched
  file with none found.

Concerns
--------

1. **Not committed.** See STATUS above - finish by confirming the
   full-suite log, then commit.
2. **`tests/draught/doctor.test.ts`'s end-to-end regression test can never
   pass again on a machine where `install.sh` has actually been run**, by
   that test's own designed refusal. This is now a structural fact of this
   plan (Task 3 installing for real is exactly what R3/R4 wanted), not a
   bug introduced here, but someone should decide whether that test needs a
   different safety strategy (e.g., a stub path override, or acceptance that
   it only ever runs green in a from-scratch CI checkout before `install.sh`
   has executed).
3. **`bunfig.toml` was not in the brief's Files list.** It was necessary to
   keep `bun test` scoped to this repository's own tests once `install.sh`'s
   real side effect (a vendored copperhead checkout with its own test suite)
   exists on disk. I judged this in-scope because leaving it out would mean
   "the script that makes the toolchain actually exist" also silently breaks
   the project's own full test suite the moment it is run - which is exactly
   the kind of real side effect this task was dispatched to surface, not
   paper over.
4. `npm audit` on the fresh copperhead install reports 22 vulnerabilities (3
   low, 6 moderate, 10 high, 3 critical) in its own dependency tree - not
   investigated further; copperhead is a third-party, non-vendored,
   fetched-on-demand tool and its dependency security posture is upstream's
   concern, but it's worth the owner knowing the number exists. **Addressed
   in fix round 1**: now also one sentence in `TOOLING.md`'s accepted-risk
   paragraph.

Fix round 1
===========

STATUS: still NOT committed at the point this update was written. The
coordinator read my background log directly and found a second failure I
had not named, plus generalised the `bunfig.toml` finding into a six-place
problem. Addressed below. A final full-suite confirmation run was still in
flight when this update had to close out - see the note at the bottom.

**1. The generalisation: one shared "not our source" notion, not six.**
Built `lib/not-source.ts`, exporting `VENDORED_CHECKOUTS` (`.tools` and
`copperhead`, each with a basename, a repo-relative path, and whether a
leading dot already exempts it from glob-based tools) and
`VENDORED_CHECKOUT_NAMES` (bare basenames for a raw `fs.readdirSync`-style
walker's skip-set - though see point 4 below for why that phrase itself had
to be reworded out of the file).

Threaded into all four walker-side consumers the coordinator named:
- `tests/kicad/footprint-sweep.ts`'s `NOT_SOURCE` now spreads
  `VENDORED_CHECKOUT_NAMES` instead of a hardcoded `.tools` literal.
- `tests/kicad/symbol-names.test.ts`'s byte-identical copy of the same set:
  same change.
- `tools/perfboard/declaration.ts`'s `SKIP_DIRECTORIES`: same change
  (keeping `dist`, which is that walker's own build-output name, local to
  it).
- `tests/perfboard/declaration.test.ts`: added a new fixture-driven test,
  "discovery skips every vendored checkout name, not only node_modules" -
  plants a `perfboard.json` inside a directory named for EVERY entry in
  `VENDORED_CHECKOUTS` and proves none is discovered. This is the
  "check the two declaration walkers too" instruction: `copperhead` holds no
  file literally named `perfboard.json` today, so the real tree alone could
  never have demonstrated this walker's skip one way or the other - "finds
  nothing today" was luck, now it's a planted, provable guarantee.

Added `tests/not-source.test.ts`, the bridge to the two config files that
cannot import `lib/not-source.ts` themselves: it reads `tsconfig.json` back
and asserts every non-dot-exempt checkout's `repoRelativePath` is in
`exclude`; reads `bunfig.toml` back (Bun imports `.toml` natively as a
parsed object - confirmed working under `tsc` too) and asserts the same
path falls outside `[test].root`; and asserts the dot-exemption claim
itself (a checkout marked `dotExempt` must actually have a dot-prefixed
basename, and vice versa) - checked rather than assumed, since that premise
is exactly what makes `.tools` not need to appear in either config file.

**2. Checked the two declaration walkers rather than assuming they were
fine** - covered above; the new fixture test is the result.

**3. The doctor.test.ts permanently-red test, fixed, not scoped away.** I
disagreed with my own earlier scoping and the coordinator's correction is
right: Task 3's real install IS what creates the condition, so it's mine.
Rewrote the end-to-end test in `tests/draught/doctor.test.ts` to handle
BOTH states instead of refusing on one of them: if a real `akcli` already
exists at the resolved path, it is renamed aside (`<path>.task3-fix-round-1-real-akcli-backup`)
for the duration of the one test and renamed back in `finally`; if nothing
is there, the old ancestor-directory-creation path runs unchanged. Never
deletes a real binary, never silently skips.

**Drove both states for real**, not just by code-reading:
- Real akcli present (this machine's actual state): `bun test
  tests/draught/doctor.test.ts` → 9 pass, real binary confirmed restored
  and working (`akcli --version` succeeds) afterward.
- Real akcli absent: moved `draughting/venv-akcli` aside entirely, reran →
  9 pass, confirmed the test created and cleaned up its own directory
  (nothing but my manual rename left under `draughting/`), moved the real
  venv back, confirmed it still works.
- Control: reverted to the old unconditional-refuse check, confirmed the
  test throws `... already exists - refusing` with the real akcli present,
  restored the fix, reran clean.

**4. A second control taught me something the brief didn't anticipate.**
While driving the `VENDORED_CHECKOUT_NAMES` fix, `tests/stripboard/escapes-search.test.ts`
and `tests/stripboard/complete.test.ts` BOTH failed - not because of
anything wrong with the sharing, but because `lib/not-source.ts` is now
transitively imported by the stripboard search/completion entry points
(through `tools/perfboard/declaration.ts`, which `tools/stripboard/adopt.ts`
and `place-inputs.ts` import), putting it inside those tests' determinism
sweep for the first time - and my own comment prose literally contained the
word the sweep forbids ("readdirSync"), the exact self-matching failure
`tests/kicad/footprint-sweep.ts`'s own header warns about. Reworded the
three mentions in `lib/not-source.ts` to describe the same thing ("a raw
recursive directory listing") without the literal identifier, rather than
touching either stripboard test's `EXEMPT` list - smaller, and consistent
with the existing convention. Reran both stripboard files clean (24 pass);
confirmed `git status --short` shows no edits to either stripboard test
file.

**5. npm audit note added to TOOLING.md**, one sentence in the existing
accepted-risk paragraph: 22 vulnerabilities (3 low, 6 moderate, 10 high, 3
critical) in copperhead's own dependency tree, framed as the same
upstream-trust trade already accepted.

**6. Checked for stray background processes of mine before finishing**:
none running (`ps aux` for `bun test`/`install.sh`/`akcli`/`copperhead`
returns nothing of mine; two long-unrelated processes from other sessions,
predating this one by days, were left alone as not mine to kill).

Gates re-run after fix round 1:
- `bun run typecheck`: clean.
- `bun test tests/draught/`: **20 pass, 0 fail** (the doctor.test.ts failure
  is gone - both states now pass).
- `make draught-doctor`: still exit 0, same verbatim output as before (akcli
  doctor advisory section unchanged, `draught-doctor: every tool pinned ...
  matches`).
- `git status --short`: still clean of `draughting/copperhead` and
  `draughting/venv-akcli`; the only changes are the ones listed under
  "Files touched" plus this round's: `lib/not-source.ts` (new),
  `tests/not-source.test.ts` (new), `tests/perfboard/declaration.test.ts`,
  `tools/perfboard/declaration.ts`, `tests/kicad/footprint-sweep.ts`,
  `tests/kicad/symbol-names.test.ts`, `tests/draught/doctor.test.ts`,
  `TOOLING.md` (one more sentence).
- `git check-ignore -v` on both install directories: unchanged, still
  ignored.
- Canary'd control-byte scan: replanted a NUL in a fresh scratch copy of
  `lib/not-source.ts`, confirmed the scanner catches it, then scanned every
  file touched in this round plus the two stripboard test files (read, not
  edited) - all clean.
- Full `bun test`, alone: the run BEFORE this round's `lib/not-source.ts`
  wording fix landed at **2747 pass, 2 fail** - both failures the stripboard
  determinism sweeps described in point 4, nothing else. A rerun WITH that
  fix in place was started and was **still running in the background when
  this update had to close out** (same constraint as the first handback);
  its log is at
  `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/full-bun-test-3.log`.
  Every targeted rerun of the previously-failing files
  (`tests/stripboard/escapes-search.test.ts`,
  `tests/stripboard/complete.test.ts`) already shows 24 pass / 0 fail with
  the fix in place, and every other touched-file test group
  (`tests/draught/`, `tests/not-source.test.ts`,
  `tests/perfboard/declaration.test.ts`, `tests/kicad/footprint-names.test.ts`,
  `tests/kicad/symbol-names.test.ts`) shows 54 pass / 0 fail together - so I
  expect the full run to land at 2749 pass / 0 fail, but I have not yet seen
  that exact line and am not reporting it as seen.

**STILL NOT COMMITTED.** Recommend: read
`full-bun-test-3.log`, confirm `0 fail`, then commit `draughting/install.sh`
+ `.gitignore` together (R2); the rest can go in the same commit or split by
concern (the toolchain R6 fix, the not-source generalisation, the
doctor.test.ts fix) at the owner-task's discretion. No AI attribution. Do
not push.

**Update: `full-bun-test-3.log` landed at 2749 pass / 0 fail**, confirming
the fix-round-1 work clean. The coordinator then committed that work as
three commits (`cf043eb`, `36dd687`, `333a539`) before fix round 2 was
dispatched - visible in `git log`, not something I did.

Fix round 2
===========

Review (`.superpowers/sdd/2026-10-30-institutionalise-draughting/task-3-review.md`)
came back PASS/PASS. Two findings assigned to me:

**I-2 - `npm ci`, not `npm install`, for copperhead's own dependency tree.**
`draughting/install.sh` now runs `npm ci` instead of `npm install` inside
the copperhead checkout. Verified rather than assumed: the pinned commit's
`package-lock.json` is in sync (`npm ci` succeeds cleanly there, same 22
vulnerabilities reported). **Drove the refusal for real**: edited the real
checkout's `package.json` to add a dependency absent from the lock, ran
`draughting/install.sh` for real, confirmed it refused by name (exit 1,
`npm ci in ... failed - its package-lock.json and package.json disagree ...
report it rather than patching around it here`) with NO fallback to `npm
install`, then restored `package.json` via `git checkout --` inside the
copperhead checkout (confirmed clean with `git -C draughting/copperhead
status --short`), reran `draughting/install.sh` for real, and confirmed
`make draught-doctor` exits 0 against the resulting toolchain - so a
working toolchain was left behind exactly as instructed, nothing was
deleted.

**M-2 - `howToFix`'s bootstrap branch no longer checks the tool's name.**
`tools/draught/toolchain.ts`: the inner gate changed from `found === null
&& tool === "akcli"` to `found === null` alone - already inside `spec.pypi
!== undefined` and `resolver !== undefined`, which is the derivation the
coordinator asked for (spec and probe result, not name). Added the
regression test in `tests/draught/toolchain.test.ts`: `qpdf` (real
resolver, no real `pypi` field) is given a synthetic `pypi` field standing
in for "a second pypi-backed, resolver-backed tool" and driven through
`howToFix` directly with `found: null`. **Drove the control**: reverted to
the literal `tool === "akcli"` check, confirmed the new test fails with the
exact wrong command (`pip install` with no venv creation) for `"qpdf"`,
restored, reran clean.

Gates re-run after fix round 2:
- `bun run typecheck`: clean.
- `bun test tests/draught/`: **21 pass, 0 fail** (one more than the 20
  reported after fix round 1 - the new M-2 regression test).
- `make draught-doctor`: exit 0, same shape of output as before (akcli
  doctor advisory section unchanged; `draught-doctor: every tool pinned ...
  matches`), run after both the control-drive refusal and the real re-install
  that followed it.
- `git status --short`: clean of `draughting/copperhead` and
  `draughting/venv-akcli`; only `draughting/install.sh`,
  `tests/draught/toolchain.test.ts` and `tools/draught/toolchain.ts` show as
  modified (fix round 1's files are already committed).
- `git check-ignore -v` on both install directories: unchanged, still
  ignored.
- `git show HEAD:CLAUDE.md` vs working copy: identical, no drift, checked
  mechanically.
- `git diff -- drafted/ docs/schematic/verdicts.md
  schematic/readability-baselines.json`: empty.
- Canary'd control-byte scan: planted a NUL in a scratch copy of
  `draughting/install.sh`, confirmed the scanner catches it, then scanned
  `draughting/install.sh`, `tests/draught/toolchain.test.ts` and
  `tools/draught/toolchain.ts` - all clean.
- Full `bun test`, alone: started and **was still running in the
  background when this update had to close out** (the same constraint as
  both earlier rounds). Log path:
  `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/full-bun-test-4.log`.
  Both changed files are small and isolated (one shell command swap behind
  a refusal path already proven to work; one boolean condition already
  covered by a new, passing, control-driven unit test) and every targeted
  rerun above is clean, so I expect this to land at 2750 pass / 0 fail (one
  more test than 2749), but have not yet observed that line and am not
  reporting it as seen.

**STILL NOT COMMITTED as of this update** - draft commit messages are
written to the scratchpad
(`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/commit1-msg.txt`
for I-2, `commit2-msg.txt` for M-2, two commits matching the review's two
labelled findings) but not yet applied, pending the full-suite confirmation
above. No AI attribution in either draft. Do not push.

**Update: `full-bun-test-4.log` landed at 2750 pass / 0 fail**, observed
before reporting (one more than 2749, the new M-2 regression test). Fix
round 2's two findings (I-2, M-2) are confirmed clean and ready to commit;
fix round 3 (below) arrived before I committed them, so all of fix rounds
2 and 3 land in one commit together instead.

Fix round 3
===========

Review came back PASS/PASS with no Critical; the reviewer independently
drove the bridge test, the doctor.test.ts finally/restore, and npm ci's
refusal, and re-confirmed the 22-vulnerability figure. One thing left: the
reviewer found `howToFix`'s git-clone branch gated on
`tool === "copperhead" && spec.commit !== undefined && spec.upstream !==
undefined` - structurally the same bug M-2 fixed, pre-existing (not a
regression of mine, confirmed via `git show 333a539:`), and the
coordinator's own argument for M-2 applies to it unchanged.

**I agree the condition should drop the name check, and I also found the
one line that would make a bare condition-drop actively wrong rather than
merely incomplete**: the branch's body calls `defaultCopperheadDir()`
directly - a single hardcoded resolver, not one keyed by tool name.
Dropping only the condition's name check while leaving that call
unconditional would make a hypothetical second commit-pinned tool silently
receive COPPERHEAD's own checkout directory in its clone command - a wrong
answer, worse than today's generic fallback message. So I added
`RESOLVED_CHECKOUT_DIR` (`tools/draught/toolchain.ts`), the git-checkout
counterpart of the existing `RESOLVED_BINARY` map, currently holding just
`{ copperhead: defaultCopperheadDir }`; the clone/fetch branch's condition
is now `spec.commit !== undefined && spec.upstream !== undefined` alone,
and the directory is looked up by tool name through that map - an unmapped
tool falls through to the generic `install ... from ...` message rather
than guessing.

**On `resolveProbeArgv`'s `tool === "copperhead"` at line 170 (now
further down after the new map): I confirm the reviewer's judgement.** It
substitutes a tool-specific INVOCATION SHAPE (the relative `src/cli.ts`
path inside an `npx tsx`-run checkout) rather than choosing between repair
COMMANDS derived from the spec. There is no field on `ToolSpec` analogous
to `commit`/`upstream` that would tell this function a second tool needs
the same treatment - a second commit-pinned tool could just as easily be a
compiled binary with no such script at all. Left as `tool === "copperhead"`
literally, with a comment in place explaining why it is not the same bug
as the two branches above it and naming `RESOLVED_CHECKOUT_DIR` as where to
generalise from if that ever stops being true.

Added the regression test pinning the decision in
`tests/draught/toolchain.test.ts`: a synthetic tool (`"widget"`) carrying
`commit`/`upstream` but absent from `RESOLVED_CHECKOUT_DIR` must get the
generic fallback message, not copperhead's directory or a `git clone` at
all - plus a direct check that copperhead itself still resolves its real
clone/fetch commands through the new map. **Drove the control**: patched
in exactly the dangerous naive fix (dropped the name check, kept
`defaultCopperheadDir()` unconditional, no resolver-map lookup), confirmed
the new test fails by returning a `git clone` into copperhead's own
directory for `"widget"` - the exact wrong-answer failure mode the map
exists to prevent - restored the real fix, reran clean.

Gates re-run after fix round 3:
- `bun run typecheck`: clean.
- `bun test tests/draught/`: **23 pass, 0 fail** (21 after fix round 1 + 2
  more: the two new fix-round-3 tests).
- `make draught-doctor`: exit 0, same output shape as every prior round.
- `git status --short`: clean of both install directories; only
  `tools/draught/toolchain.ts` and `tests/draught/toolchain.test.ts` show
  modified (fix round 2's two files were never committed before round 3
  landed, so they will go in with this commit too - see below).
- `git check-ignore -v`: unchanged, both still ignored.
- `git show HEAD:CLAUDE.md` vs working copy: identical, no drift.
- `git diff -- drafted/ docs/schematic/verdicts.md
  schematic/readability-baselines.json TOOLING.md`: empty (TOOLING.md
  included this round per the explicit instruction not to touch it).
- Canary'd scan: planted a NUL in a scratch copy of
  `tools/draught/toolchain.ts`, confirmed the scanner catches it, then
  scanned `tools/draught/toolchain.ts` and `tests/draught/toolchain.test.ts`
  - both clean.
- Full `bun test`, alone: started and **was still running in the
  background when this update had to close out** - the instruction this
  round was explicitly to OBSERVE this line rather than predict it, so I am
  not stating a number here. Log path:
  `/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/full-bun-test-5.log`.

**NOT YET COMMITTED.** A single commit message covering fix rounds 2 and
3 together is staged at
`/private/tmp/claude-501/-Users-orion-work-audio-circuits-work-pultec-modularize/7351c56b-0470-40ca-bb36-6cea2909f627/scratchpad/commit3-msg.txt`
(fix round 3's message; round 2's two draft messages at `commit1-msg.txt`
and `commit2-msg.txt` are superseded by it rather than both being applied,
since the round-2 files were never committed separately and the coordinator
asked for one commit this round) - not yet applied, pending the observed
full-suite result. No AI attribution. Do not push.
