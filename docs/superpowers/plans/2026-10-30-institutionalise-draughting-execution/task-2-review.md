Task 2 review: `make draught-doctor`
=====================================

Reviewer drove the gates directly on `/Users/orion/work/audio-circuits-work/pultec-modularize`
at commit `efeb9a5` (branch `feature/schematics-tooling`), working tree clean
before and after every experiment.

VERDICT 1 - SPEC COMPLIANCE: COMPLIANT, WITH ONE IMPORTANT FINDING FOR THE FIX ROUND
-------------------------------------------------------------------------------------
Every step of the brief (Steps 1-6) was executed and is independently
verified below: the two named tests exist verbatim and pass, the CLI refuses
non-zero naming every disagreement, the control was genuinely driven (by me,
not just relayed), the Makefile change is machine-wide with no selecting
variable, and the three forbidden paths are untouched. The one Important
finding (akcli doctor's independent signal, below) is exactly the risk the
dispatch asked the reviewer to test rather than re-litigate, and the
implementer disclosed the design choice transparently in the report. It does
not make the task non-compliant with the brief as written, but it is real and
should go into the fix round or get an explicit owner ruling.

VERDICT 2 - TASK QUALITY: SOLID
---------------------------------
The module is well-documented, under the line-count ceiling (105 lines), uses
no `any`/`as`/`@ts-ignore`, follows the repository's relative-import and
`isMain`/`process.exit` conventions exactly as the existing `tools/cli/perfboard.ts`
does, resolves `akcli` through the same `defaultAkcli()` Task 1 already
exports (no second hardcoded path), and the implementer's report is candid
about every judgment call it made, including the one this review elevates to
Important. The gaps are a missing scoping check on `runAkcliDoctor` (below)
and the absence of any test for `runDraughtDoctor` itself (only the pure
`renderToolchainReport` has unit coverage).

Findings, ranked
----------------

**Important - `akcli doctor`'s report can show a live failure while the verb exits 0,
even when akcli is not a checked tool at all.** I drove this, not reasoned
it: I trimmed `draughting/tools.lock.json` to only `kicad-cli`, `magick`,
`qpdf` (all installed and matching on this machine) and ran `make
draught-doctor`. Output:

```
akcli doctor:
akcli doctor could not run at .../draughting/venv-akcli/bin/akcli: ENOENT: no such file or directory, posix_spawn '.../venv-akcli/bin/akcli'

draught-doctor: every tool pinned in draughting/tools.lock.json matches - checked draughting/tools.lock.json against what is actually installed.

EXIT:0
```

`runAkcliDoctor()` runs unconditionally, independent of whether `akcli` is
even in the lock being checked, and its failure text sits directly above a
line saying "every tool... matches" with exit code 0. The implementer's
documented reasoning - "`checkToolchain`'s akcli entry already carries that
fact... a second signal... would invite them to disagree" - does not hold
here: in this run there was no akcli entry for `checkToolchain` to carry the
fact in. More generally, `TOOLING.md`:111-114 describes `akcli doctor` as
checking "python, kicad-cli, ngspice, symbols, config and network" with its
own `--require` flag for CI gating - a strictly broader surface than the
lock's single pinned version string, which is also what this module's own
comment says ("more than the lock's single pinned version number covers").
Having said that in its own doc comment, the module then treats the two
signals as redundant. They are not: a version-matched akcli with a broken
venv, bad network, or missing symbols library is a real, reachable state
where `akcli doctor` fails and the verb still exits 0. This is exactly what
the dispatch asked to be tested rather than re-litigated, and the test
confirms the risk is live, not hypothetical. Recommend either (a) scoping
`runAkcliDoctor` to run only when `akcli` is a key in the lock being checked,
or (b) an owner ruling on whether `akcli doctor`'s own exit status should
contribute a second, clearly-labelled non-gating warning versus staying
silent in the exit code as now.

**Important (already established, not counted against the implementer) -
`draught-doctor` is absent from `make help`.** Confirmed independently: `make
help` (run from repo root and from `boards/pt2399-core`) does not list it.
`perfboard-help` is defined at `make/board.mk:184` and `make/aggregate.mk:83`
(via `help: perfboard-help`), neither of which Task 2's Files list
authorized, so declining to touch them was correct restraint, not an
omission on the implementer's part. Confirmed by grep: no test in `tests/`
references `make help` or `perfboard-help` output, so a fix-round test
adding that coverage is new, not restored.

**Minor - the uniform "- fix: <command>" framing invites blind pasting of a
command known to fail today.** `renderToolchainReport`'s line format is
identical for every tool: `  <tool>: wanted X, found Y - fix: <command>`.
Copperhead's fix command is self-contained and will actually work from a
clean state; akcli's (`<venv>/bin/pip install ...`) fails today with "No such
file or directory" because the venv it targets does not exist yet (Task 1's
`how` string, correctly left untouched per the brief - confirmed by the diff
touching only 3 files, none of which are `toolchain.ts`, `akcli-install.ts`
or `copperhead-install.ts`). Nothing in the rendered line distinguishes
"self-contained bootstrap" from "assumes a precondition Task 3 hasn't built
yet," so a reader skimming both lines has no signal that one will fail
differently from the other. Not a spec violation - the brief did not ask for
differentiation, and the implementer flagged the underlying asymmetry
explicitly in the report - but worth carrying into Task 3's `install.sh`
design.

**Minor - `runDraughtDoctor` (the exit-code-bearing integration point) has no
unit test.** Only `renderToolchainReport`, a pure function, is covered by
`tests/draught/doctor.test.ts`. The brief's two tests (taken verbatim,
confirmed) do not reach `runDraughtDoctor`'s `problems.length === 0 ? 0 : 1`
line or the akcli-doctor folding. I exercised that line directly for real (see
"Ran" below) because it cannot be reached through the unit suite; the
implementer's report says plainly this branch "has never executed outside a
unit test" and that statement is itself slightly imprecise - it has never
executed inside a unit test either, only inside my manual drive and theirs.
Worth a narrow follow-up test that stubs or redirects the lock to force a
zero-problem run, rather than leaving the only coverage of the exit-0 path to
manual drives.

What I drove myself (not relayed from the report)
--------------------------------------------------
- `bun run typecheck`: clean (`tsc --noEmit`, no output).
- `git diff 04d1000..HEAD -- drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json .gitignore`: empty.
- `bun test tests/draught/`: 7 pass / 0 fail. Confirmed via `grep -c "^test("` against `git show 04d1000:tests/draught/toolchain.test.ts` (5) and the new `doctor.test.ts` (2) that exactly two tests were added and none weakened.
- `make draught-doctor` from the repo root AND from `boards/pt2399-core`: identical output both times (absolute `$(REPO_ROOT)` path, not CWD-relative) - 2 disagreements (copperhead, akcli), exit 2, text matching the report verbatim.
- The control (brief Step 5): edited `draughting/tools.lock.json`'s `kicad-cli` entry to `99.99.99-control`, ran `make draught-doctor`, got a third disagreement naming `kicad-cli` with `wanted 99.99.99-control, found 10.0.5`, exit 2. Reverted via `cp` from my own backup, confirmed `git diff`/`git status` empty on the file, re-ran - output matched the pre-control run exactly.
- The harder question (would the control survive a gutted `renderToolchainReport`?): gutted the function to `return "CONTROL: gutted fixed string..."` unconditionally - `bun test tests/draught/doctor.test.ts` caught it (test 1 failed, content mismatch). Separately gutted only the empty-branch to `return ""` - test 2 caught that independently. Restored the file from my own backup; `git status`/`git diff` on it came back clean both times.
- The never-before-executed zero-problem path: temporarily trimmed the lock to the three tools already installed and matching (`kicad-cli`, `magick`, `qpdf`), ran `make draught-doctor` for real - exit 0, message named the lock file rather than a generic "fine" - and in the same run found the Important finding above (akcli doctor's unconditional, independent failure text printed alongside the exit-0 success line). Restored the lock from backup; diff/status empty, re-ran to confirm the original 2-disagreement output returned byte-for-byte.
- A canary'd NUL-byte scan (own Python script, not `sed`/macOS `grep -P`) over the four touched files: canary planted and fired (1 byte) before scanning; all four files (`tools/cli/draught.ts`, `tests/draught/doctor.test.ts`, `make/perfboard.mk`, `draughting/tools.lock.json`) came back 0.
- `git show HEAD:CLAUDE.md` diffed mechanically against the working-tree `CLAUDE.md`: empty diff, no drift, for this run.
- `make` with no target from `boards/pt2399-core`: still prints the board's `perfboard-help`, confirming `draught-doctor`'s placement in `make/perfboard.mk` did not change `.DEFAULT_GOAL`.
- `bun test` (full suite), run alone, not beside `make`: 2731 pass / 0 fail across 260 files (129.24s) - matches the report's figure.
- `git log -1 efeb9a5 --format=%B`: no AI attribution.
- Confirmed by `grep` that no test in `tests/` references `make help` or `perfboard-help` output.

What I reasoned from reading rather than re-driving
-----------------------------------------------------
- That `make/perfboard.mk`'s placement of the target before `BOARD_DECL`/`.DEFAULT_GOAL` is logically inert for Make's default-goal resolution (confirmed behaviourally above, but the "why" - explicit `.DEFAULT_GOAL :=` assignment always wins regardless of definition order - was reasoned, not independently proven against GNU Make's source).
- The `TOOLING.md`:111-114 description of what `akcli doctor` checks (python, kicad-cli, ngspice, symbols, config, network) was read, not independently verified against akcli's actual behaviour (akcli is not installed on this machine, so its `doctor` subcommand's real scope is documentation-sourced).
- That the fix-round `howToFix` strings for akcli and copperhead are exactly as Task 1 left them was confirmed by diff (Task 2 touches no file that defines `howToFix`) rather than by re-deriving the strings from scratch.

Full suite note
----------------
Ran `bun test` alone per instruction; it exceeded the 120s foreground timeout
and was moved to a background task automatically, completing at 129.24s with
2731 pass / 0 fail across 260 files - identical to the report's figure.
