Task 2 report: `make draught-doctor`
======================================

STATUS: DONE

Commit: `efeb9a5494db13dd4b6e6e7a614792a43acc3262` (branch `feature/schematics-tooling`,
on top of `04d1000`), not pushed.

Files: created `tools/cli/draught.ts`, created `tests/draught/doctor.test.ts`,
modified `make/perfboard.mk`.

Test summary
------------

`tests/draught/` went from 5 pass / 0 fail (Task 1's baseline, reconfirmed
before touching anything) to **7 pass / 0 fail** - the two Step 1 tests from
the brief, taken verbatim, both now pass against the real implementation.

Full suite: **2731 pass / 0 fail across 260 files** (142.64s), run alone, not
beside `make`, as instructed.

`bun run typecheck`: clean, no output.

TDD sequence actually followed
-------------------------------

1. Wrote `tests/draught/doctor.test.ts` with the brief's two tests verbatim,
   importing `renderToolchainReport` from `../../tools/cli/draught.ts`.
2. Ran it: failed as expected - `Cannot find module '../../tools/cli/draught.ts'`.
3. Implemented `tools/cli/draught.ts`: `renderToolchainReport`, a best-effort
   `akcli doctor` runner, `runDraughtDoctor` (the full report + exit code),
   and the `isMain` CLI guard matching `tools/cli/perfboard.ts`'s own
   convention.
4. Wired `draught-doctor:` into `make/perfboard.mk`, placed directly in that
   file (not `aggregate.mk`/`board.mk`) because it is machine-wide: it needs
   no board context at all, so it sits beside the `veroroute.mk` include and
   before the aggregate/board split, using only `$(REPO_ROOT)` (already
   defined there). No selecting variable was introduced - G308 binds.
5. Ran `make draught-doctor` for real.

Real output (machine state: copperhead and akcli are Task 3's to install and
are genuinely absent; kicad-cli, magick, qpdf are already installed and
matching):

```
akcli doctor:
akcli doctor could not run at <repo>/draughting/venv-akcli/bin/akcli: ENOENT: no such file or directory, posix_spawn '<repo>/draughting/venv-akcli/bin/akcli'

draught-doctor: 2 toolchain disagreements against draughting/tools.lock.json:
  copperhead: wanted 0.12.0, found nothing - fix: git clone https://github.com/copperheadhq/copperhead <repo>/draughting/copperhead && git -C <repo>/draughting/copperhead checkout 476cc15965f0d1eeda70afb9e806936f6bb15c5c && cd <repo>/draughting/copperhead && npm install
  akcli: wanted 0.22.0, found nothing - fix: <repo>/draughting/venv-akcli/bin/pip install 'akcli-kicad==0.22.0'

make: *** [draught-doctor] Error 1
```
Exit status (shell `$?` after `make`): 2 (GNU Make's own code for "a recipe
exited non-zero"; the recipe itself, `bun tools/cli/draught.ts`, exited 1).
Non-zero either way, and both absent tools are named, each with the
not-yet-fixed `how` string Task 1 produced (see "residual" below).

The control (brief Step 5)
---------------------------

Perturbed `draughting/tools.lock.json`'s `kicad-cli` entry from `"10.0.5"` to
`"99.99.99-control"` (a version that genuinely is not installed), ran `make
draught-doctor`, and it printed a THIRD disagreement:

```
  kicad-cli: wanted 99.99.99-control, found 10.0.5 - fix: install kicad-cli 99.99.99-control - see draughting/tools.lock.json and TOOLING.md
```

- confirmed non-zero exit (same as above, 2 from make / 1 from the script)
- confirmed `kicad-cli` named, with the wanted/found pair exactly matching
  what was perturbed

Reverted via `cp` from a pre-edit backup (not `git checkout`, to avoid any
risk before confirming); `git diff --stat` and `git status --short` on the
file were both empty afterward, and I quoted its restored content back -
byte-identical to the pre-control file. Re-ran `make draught-doctor`
afterward: output matched the pre-control run exactly (2 disagreements,
copperhead and akcli only).

Canary'd control-byte scan (standing instruction 3)
-----------------------------------------------------

Wrote a small Python scanner (not `sed`, not macOS `grep -P`) counting literal
`\x00` bytes. Planted one NUL in a scratch canary file, confirmed the scanner
reported `1 NUL byte(s)`, deleted the canary, then scanned the four files this
task touched (`tools/cli/draught.ts`, `tests/draught/doctor.test.ts`,
`make/perfboard.mk`, `draughting/tools.lock.json`): **0 NUL bytes in all
four**, canary proven live first.

CLAUDE.md drift check (standing instruction 4)
-------------------------------------------------

Ran `git show HEAD:CLAUDE.md > /tmp/claude_md_head.txt` and diffed it against
the working tree's `CLAUDE.md` mechanically (`diff`, not by eye): **empty
diff - no drift** on this run. Reporting the mechanical result either way, as
instructed.

Enumerate-and-account (standing instruction 1)
-------------------------------------------------

This task created new code rather than moving or adapting an existing module,
so there was no prior file's assertions to enumerate and account for. The one
thing I did carry forward deliberately rather than invent was the CLI's own
shape - the `isMain(import.meta.url)` / `process.exit(await ...)` guard - taken
from `tools/cli/perfboard.ts`'s existing convention rather than a new pattern.

The residual from Task 1 (not touched, as instructed)
---------------------------------------------------------

Confirmed directly: `akcli`'s `how` string is `<venv>/bin/pip install
'akcli-kicad==0.22.0'`, which (as the brief warned) fails today because the
venv itself does not exist yet - running it by hand would currently print "No
such file or directory" rather than installing anything, since `pip` lives
inside the venv it is trying to create into. `copperhead`'s `how` (a fresh
`git clone ... && checkout ... && npm install`) is the correct repair for
today's actual absent state. Both fail loudly if run (neither is silent), and
I printed both strings verbatim in the report above without rewriting them,
per instruction. This asymmetry is Task 3's to close when it writes
`draughting/install.sh`; `draught-doctor` does not try to run `how` itself,
only to display it, so the asymmetry is visible but not exercised by this
verb.

Concerns
--------

- `draught-doctor`'s exit code is driven solely by `checkToolchain`'s problem
  count; `akcli doctor`'s own output is included purely as context (per the
  module's doc comment) and never changes the exit code, since `akcli`'s
  absence or mismatch is already one of `checkToolchain`'s own problems - a
  second signal from the same fact risked disagreeing with the first rather
  than adding information. Flagging this choice in case the controller reads
  it differently.
- `make draught-doctor`'s own exit code as observed by a caller is `2` (GNU
  Make's own "recipe failed" code), not the script's own `1` - this is
  standard Make behaviour and consistent with every other refusing target in
  this Makefile; noted here since the brief's wording ("non-zero") is
  satisfied either way, but the two codes are not the same number.
- No `make help` / `perfboard-help` text was added for `draught-doctor` in
  `aggregate.mk` or `board.mk`, since the brief's Files list authorized only
  `make/perfboard.mk` for this task. The target works and is discoverable by
  name; it simply is not yet listed in the printed help text that `aggregate.mk`
  and `board.mk` each own. Flagging in case that omission should be a Task 5
  or later-task followup rather than left as is.

Fix round 1
===========

STATUS: DONE

Commit: `1ad3e0e2ac85a0b16545a72684d17f4e6df2bede` (branch
`feature/schematics-tooling`, on top of `efeb9a5`). Not pushed.

Reviewer's verdict going in: spec COMPLIANT, quality SOLID, with I-1, I-2 and
M-1 to fix.

Test summary: `tests/draught/` went from 7 pass / 0 fail (this task's own
first-round baseline) to **12 pass / 0 fail** - five new tests: the I-1
regression, the companion "akcli present" gate test, the M-1
`runDraughtDoctor` exit-code test, and two `make help` tests (root and a
board directory). Full `bun test`, run alone afterward: **2736 pass / 0 fail
across 260 files** (137.48s) - up from 2731 at the end of the first round,
consistent with the five additions. `bun run typecheck`: clean.

I-1 - akcli doctor ran unconditionally
---------------------------------------

Fixed by changing `runDraughtDoctor`'s signature to take an explicit
`lock: Toolchain = readLock()` and gating the `akcli doctor` section on
`"akcli" in lock`, rather than letting its exit code contribute a second
signal - I kept the first of the two options the coordinator offered, since
`checkToolchain` already carries the authoritative fact about `akcli`'s
presence/version for any lock that DOES name it, and the bug was never that
the signal was wrong where `akcli` was in scope - only that it ran where
`akcli` was out of scope entirely.

Wrote the regression test exactly as instructed - producing the reviewer's
state, not merely asserting the fix: a lock built from `readLock()` with
`akcli` AND `copperhead` filtered out (leaving only `kicad-cli`, `magick`,
`qpdf` - the three confirmed installed and matching on this machine per
`toolchain.ts`'s own module comment), asserting `exitCode === 0` and that the
text contains neither `"akcli doctor"`, `"ENOENT"` nor `"could not run"`.

**Drove the control on this test itself, not just trusted it.** Reintroduced
the exact bug (removed the `if ("akcli" in lock)` gate, ran `runAkcliDoctor()`
unconditionally) and ran `bun test tests/draught/doctor.test.ts`: the new
regression test failed, printing

```
Expected to not contain: "akcli doctor"
Received: "akcli doctor:\nakcli doctor could not run at .../draughting/venv-akcli/bin/akcli: ENOENT...\n\ndraught-doctor: every tool pinned in draughting/tools.lock.json matches - checked ...\n"
```

- exactly the reviewer's reported symptom, reproduced by this test rather
than merely described. Reverted from a pre-edit backup copy; `git diff --stat
tools/cli/draught.ts` against the restored file was empty and `bun test
tests/draught/` returned to 12 pass / 0 fail, confirming the revert was
byte-clean before I moved on.

I-2 - draught-doctor absent from make help
---------------------------------------------

Added the same four-line block (matching the surrounding "The toolchain"
section's style, placed directly after the existing `make veroroute` entry)
to both `make/aggregate.mk`'s and `make/board.mk`'s `perfboard-help` targets.
Ran `make help` for real from both scopes:

```
$ make help                              (repository root - aggregate.mk)
  make draught-doctor  report every disagreement between the pinned drawing
                       toolchain (draughting/tools.lock.json) and what is
                       actually installed, and exit non-zero naming each one.
                       Machine-wide - no variable to set, wherever it is run

$ make -C boards/pt2399-core help        (a declared board - board.mk)
  make draught-doctor  report every disagreement between the pinned drawing
                       toolchain (draughting/tools.lock.json) and what is
                       actually installed, and exit non-zero naming each one.
                       Machine-wide - no variable to set, wherever it is run
```

Added the two guard tests (`execFileSync("make", ["help"], ...)` from the
repository root and from `boards/pt2399-core`, the same probe board
`tests/kicad/install.test.ts` already uses), asserting the output contains
`"draught-doctor"` - precedent for shelling out to a real `make` from a test
is `tests/kicad/install.test.ts`'s `makePrint` helper, cited in its own
module comment for exactly the same reason (a check that only pattern-matches
the Makefile's text proves nothing about what Make itself does with it).

M-1 - no test drove runDraughtDoctor directly
------------------------------------------------

Added a synthetic, machine-state-independent test: perturbs `kicad-cli`'s
wanted version in a cloned lock to `"0.0.1-m1-test"` (a version nothing will
ever actually report) and calls `runDraughtDoctor(lock)` directly, asserting
`exitCode === 1` and that the text names both the tool and the perturbed
version. This is deliberately not the machine's real install state (which the
I-1 regression test already exercises for the exit-0 path) so it stays
correct regardless of what is or is not installed on whatever machine runs
the suite.

CLAUDE.md drift check, re-run mechanically
---------------------------------------------

Per the coordinator's note, re-ran `git show HEAD:CLAUDE.md` against the
working tree's `CLAUDE.md` with `diff` (not by eye) immediately before this
round's commit: empty diff, no drift. `HEAD` at that point was still
`efeb9a5` (this task's own first-round commit on top of `04d1000`, the branch
tip the coordinator described as having "gained a paragraph since your first
run" - that paragraph, the stale-instruction-rule strengthening, was already
part of `04d1000` and so was already included in both of my prior diffs; the
mechanical check continues to confirm it rather than merely repeating an
assumption).

Canary'd control-byte scan
-----------------------------

Reused the same Python NUL-byte counter from round 1. Planted a NUL in a
fresh scratch canary file, confirmed `1 NUL byte(s)` reported, deleted it,
then scanned every file this round touched (`tools/cli/draught.ts`,
`tests/draught/doctor.test.ts`, `make/aggregate.mk`, `make/board.mk`): **0
NUL bytes in all four**, canary proven live first.

Protected-path gate
----------------------

`git diff -- drafted/ docs/schematic/verdicts.md
schematic/readability-baselines.json .gitignore`: empty, both before and
after this round's commit.

Disagreements / things I'd flag back to the coordinator
-----------------------------------------------------------

- None on I-1, I-2 or M-1 themselves - all three fixes and their tests are as
  specified. One small implementation choice worth surfacing: I chose "scope
  `akcli doctor` to when `akcli` is in the lock" over "let it contribute to
  the exit code" (the coordinator's second offered option) because the first
  keeps `checkToolchain` as the single source of truth for `akcli`'s own
  pass/fail and only changes WHETHER the advisory section runs, rather than
  adding a second code path that could itself disagree with `checkToolchain`
  about the same tool. If the controller's intent was the second option
  instead, that is a different, larger change (akcli doctor's own exit status
  would need to be captured and folded into `problems`/`exitCode`) and I did
  not implement it - flagging explicitly since the ticket left the choice
  open.
- The `how`-string asymmetry (akcli's current fix command fails today because
  its venv does not exist, copperhead's works) remains untouched, as
  instructed - it is still Task 3's.

Fix round 2
===========

STATUS: DONE

Commit: `9e226cca25f0ca177ef5ebd5d51887c44cf3112f` (branch
`feature/schematics-tooling`, on top of `1ad3e0e`). Not pushed. One commit,
as instructed.

The finding going in: the reviewer built a fake `akcli` that version-matches
the lock (so `checkToolchain` reports no problem) but exits non-zero on
`doctor`. Round 1's `"akcli" in lock` gate only closed the case where `akcli`
could not run at all; a version-matching-but-doctor-failing `akcli`
reproduced the identical contradiction in a different shape - an unqualified
"every tool matches" and `exit 0` sitting directly beneath a visible
`akcli doctor` failure.

Test summary: `tests/draught/` went from 12 pass / 0 fail (end of round 1) to
**14 pass / 0 fail** - two new tests (a pure composition test and the full
end-to-end reproduction with a real stub binary). One existing test's
assertion (`toContain("akcli doctor:")`) was loosened to `toContain("akcli
doctor")` because the section header's wording changed (it now carries the
ADVISORY label); no other existing test's expectations changed. Full `bun
test`, run alone: **2738 pass / 0 fail across 260 files** (134.56s) - up from
2736, consistent with the two additions. `bun run typecheck`: clean.

The fix, matching the coordinator's ruling exactly
---------------------------------------------------

**The exit code stays scoped to `checkToolchain`/the lock alone** - unchanged
from round 1, and not touched this round, per the explicit instruction that a
machine being offline must never make a version-pinning check refuse.

What changed is the OUTPUT, in the three ways specified:

1. **The pass line stops being unqualified.** `composeDraughtDoctorReport`
   (new, exported, pure) now checks `problems.length === 0 && akcliDoctor !==
   null && !akcliDoctor.ok` and, only then, runs the base "every tool
   matches" text through `qualifyPassForAdvisoryFailure`, which appends (not
   replaces) a sentence stating both facts in one place.
2. **The advisory section is labelled in the output itself.** The header
   printed above `akcli doctor`'s own report is now
   `"akcli doctor (ADVISORY - does not gate this verb's exit code; checks
   python, kicad-cli, ngspice, symbols, config and network, beyond the
   single pinned version checkToolchain verifies below):"` - visible to
   whoever reads the terminal, not only in a module comment.
3. **What was and was not verified is stated.** The qualifying sentence
   reads: *"checkToolchain verified only the pinned version shown above;
   akcli doctor (above, ADVISORY) checks more and reported a problem of its
   own. That problem does not make draught-doctor refuse - akcli doctor does
   not gate this verb's exit code - but it is a real problem with your
   toolchain, not something to ignore."* - deliberately worded so "advisory"
   reads as "advisory to the exit code", never as "ignorable".

`runAkcliDoctor` moved from `execFileSync` to `spawnSync`, which is what
makes the `ok`/`not ok` distinction possible at all: `execFileSync` throws on
a non-zero exit and round 1's code only ever saw the thrown error's generic
message, with no way to tell "ran and failed" apart from "could not run".
`spawnSync` never throws, so a genuine doctor failure (`result.status !==
0`), an ENOENT (`result.error`), and a clean run (`result.status === 0`) are
now three distinguishable outcomes, each carried as an `AkcliDoctorReport {
ok, summary }`.

The test, and what I drove
-----------------------------

Wrote two tests reproducing the reviewer's state, as instructed:

- **Pure** (`composeDraughtDoctorReport([], { ok: false, summary: "FAKE
  DOCTOR FAILURE: ..." })`): no subprocess, no filesystem writes at all.
- **End to end**: built a real stub shell script in a system temp directory
  (`os.tmpdir()`, via `fs.mkdtempSync`) that prints the LOCK'S OWN pinned
  `akcli` version for `--version` and exits 1 with a distinctive message for
  `doctor`, then copied it to the exact path `defaultAkcli()` resolves (the
  only path this verb's real probe ever reads - there is no override hook)
  for the duration of one test, and ran the real `runDraughtDoctor()`
  end-to-end against a lock trimmed to exclude only `copperhead` (the one
  other tool genuinely absent on this machine, which would otherwise spoil
  the "every OTHER version matches" precondition the reviewer's state
  requires).

**Safety on the end-to-end test**: before touching anything, it checks
`fs.existsSync(resolvedAkcli)` and throws rather than silently skipping or
overwriting if a real binary is ever there - this test must never run against
a genuine install. `firstMissingAncestor` walks up from the resolved binary's
directory to the single topmost directory that does not yet exist, so cleanup
(`fs.rmSync` in a `finally`) removes exactly the subtree this test created and
nothing that was already under `draughting/` (which holds `tools.lock.json`
and nothing else on this branch).

**Confirmed `draughting/` left clean, both on a passing run and on a failing
one.** `git status --short draughting/` after a normal passing run showed
nothing; I then re-checked after deliberately driving the control below
(whose middle test run FAILED its assertions) and `git status --short
draughting/` was still empty and `ls draughting/` still showed only
`tools.lock.json` - the `finally` block runs regardless of whether the `try`
block's `expect`s threw.

**Drove the control, found my first assertions were too weak, and fixed
that too.** My first draft of both new tests asserted `toContain("ADVISORY")`
and `.not.toBe(renderToolchainReport([]))`. Reintroducing the bug (removing
the qualification call, per the standing instruction) left BOTH assertions
still passing - because the section HEADER itself already contains
"ADVISORY" regardless of whether the pass line is qualified, and the overall
text differs from the bare `renderToolchainReport([])` simply because the
header is present at all. Neither assertion was actually exercising the
qualification. I added a third, decisive assertion -
`toContain("does not make draught-doctor refuse")`, a phrase that exists
ONLY inside `qualifyPassForAdvisoryFailure`'s own sentence - and reran the
sabotage:

```
expect(received).toContain(expected)
Expected to contain: "does not make draught-doctor refuse"
Received: "akcli doctor (ADVISORY - does not gate this verb's exit code; checks python, kicad-cli, ngspice, symbols, config and network, beyond the single pinned version checkToolchain verifies below):\nFAKE DOCTOR FAILURE: symbols library check FAILED\n\ndraught-doctor: every tool pinned in draughting/tools.lock.json matches - checked draughting/tools.lock.json against what is actually installed.\n"
```

Both new tests failed with that output - the exact contradiction shape
(unqualified "every tool pinned ... matches" directly beside the visible
`FAKE DOCTOR FAILURE`) the coordinator described, reproduced rather than
described. Restored from a pre-edit backup; `diff` against the backup
reported byte-identical, and `bun test tests/draught/` returned to 14 pass /
0 fail before I moved on.

Gates, quoted
----------------

`bun run typecheck`: clean, no output.

`make draught-doctor`, run for real on this machine (akcli and copperhead
both genuinely absent - `checkToolchain` already names `akcli` as a
disagreement here, so this run does not exercise the new qualification path,
which only fires when the lock-level check passes but the advisory doctor
fails):

```
akcli doctor (ADVISORY - does not gate this verb's exit code; checks python, kicad-cli, ngspice, symbols, config and network, beyond the single pinned version checkToolchain verifies below):
akcli doctor could not run at <repo>/draughting/venv-akcli/bin/akcli: ENOENT: no such file or directory, posix_spawn '<repo>/draughting/venv-akcli/bin/akcli'

draught-doctor: 2 toolchain disagreements against draughting/tools.lock.json:
  copperhead: wanted 0.12.0, found nothing - fix: git clone https://github.com/copperheadhq/copperhead <repo>/draughting/copperhead && git -C <repo>/draughting/copperhead checkout 476cc15965f0d1eeda70afb9e806936f6bb15c5c && cd <repo>/draughting/copperhead && npm install
  akcli: wanted 0.22.0, found nothing - fix: <repo>/draughting/venv-akcli/bin/pip install 'akcli-kicad==0.22.0'

make: *** [draught-doctor] Error 1
```
Exit 2 (make's own code), consistent with every prior run.

Protected-path gate: `git diff -- drafted/ docs/schematic/verdicts.md
schematic/readability-baselines.json .gitignore` empty.

Canary'd control-byte scan: planted a NUL in a scratch file, confirmed the
scanner reported 1, deleted it, then scanned both files this round touched
(`tools/cli/draught.ts`, `tests/draught/doctor.test.ts`) - 0 NUL bytes in
both.

`git status` including `draughting/`: clean after the commit - only
`tools.lock.json` remains there, exactly as before this round started.

CLAUDE.md drift check, re-run mechanically once more, immediately before this
round's commit: `git show HEAD:CLAUDE.md` diffed against the working tree's
copy via `diff` - empty, no drift. `HEAD` was `1ad3e0e` (round 1's own
commit) at that point.

Disagreements / things I'd flag back to the coordinator
-----------------------------------------------------------

- None. The ruling was specific about the shape of the fix (exit code stays
  scoped to the lock; the output carries the three stated changes instead),
  and I implemented exactly that rather than a different design.
- One thing worth surfacing rather than disagreeing with: I scoped the
  qualification narrowly to `problems.length === 0` (the exact contradiction
  case - a clean pass sitting beside a visible failure). When
  `checkToolchain` already reports a problem (exit non-zero for an unrelated
  or the same reason), I did not also append the qualifying sentence, since
  there is no "unqualified pass" to qualify in that branch - the report is
  already visibly failing and non-zero. If the controller wants the
  qualifying sentence to appear whenever `akcli doctor` fails, REGARDLESS of
  whether `checkToolchain` already found something, that is a small,
  mechanical change (drop the `problems.length === 0` condition in
  `composeDraughtDoctorReport`) and I can make it on request - flagging the
  choice rather than assuming it either way.
