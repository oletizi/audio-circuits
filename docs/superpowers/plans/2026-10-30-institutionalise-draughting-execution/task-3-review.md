Task 3 review: the install script
==================================

Scope: spec compliance AND task quality, for Task 3 of 7 of the
institutionalise-draughting plan. Repo at HEAD = `333a539` (3 commits since
`9e226cc`: `cf043eb`, `36dd687`, `333a539`). The report's "STILL NOT
COMMITTED" status is stale relative to the repo as found - all three commits
exist, `git status --short` is clean, no AI attribution in any commit
message.

VERDICT 1: SPEC COMPLIANCE - PASS
----------------------------------

All six steps of `task-3-brief.md` are present (failing test written first
per the report's "controls driven" section, `install.sh` written with the
Write tool, a real install run, `TOOLING.md`'s accepted-risk paragraph,
commits). All six controller rulings verified directly, not relayed:

- **R1** (fixed locations, no override): confirmed by reading
  `tools/draught/copperhead-install.ts:59-61` and
  `tools/draught/akcli-install.ts:45-60` - both resolve
  `draughting/copperhead` / `draughting/venv-akcli` via `moduleRepoRoot()`.
  `install.sh` computes `REPO_ROOT` from its own script directory's parent
  and targets the identical two paths, with no environment-variable
  override anywhere in the script. One fact, one place.
- **R2** (gitignore lands in the same commit as the script, with a test):
  confirmed - `cf043eb` touches `.gitignore` and `draughting/install.sh`
  together, and `tests/draught/install-script.test.ts`'s second test checks
  `git check-ignore -v` on each path individually (not combined, correctly -
  the test's own comment gives the reason: `check-ignore`'s exit code is
  "one or more ignored," so a combined call could pass on one match).
- **R3** (the install runs for real, not into a scratch location): confirmed
  - `draughting/copperhead` and `draughting/venv-akcli` exist on disk,
  `git -C draughting/copperhead rev-parse HEAD` returns the pinned commit,
  and the venv's `akcli --version` runs for real.
- **R4** (draught-doctor's success path executes for the first time): ran it
  myself, exit 0, verbatim output below under "what I drove."
- **R5** (TOOLING.md gets only the accepted-risk paragraph): confirmed by
  diff - one new paragraph plus one later-appended npm-audit sentence inside
  it; the stale "NEITHER TOOL IS PINNED" section immediately below is
  untouched, byte-identical to before. Correctly scoped per the ruling - see
  Important-1 under task quality for the cost of leaving it untouched.
- **R6** (bootstrap vs. upgrade are different commands): confirmed by
  reading `tools/draught/toolchain.ts`'s `howToFix` and by driving all four
  new tests in `tests/draught/toolchain.test.ts` - see below.

VERDICT 2: TASK QUALITY - PASS, with one Important finding worth Task 7's attention
-------------------------------------------------------------------------------------

The implementation is careful, the fix-round response to the coordinator's
findings (the `lib/not-source.ts` generalisation, the permanently-red
`doctor.test.ts` test) is substantively correct and each claim in the report
reproduced exactly when driven. One Important finding (TOOLING.md's
self-contradiction) is a direct, foreseeable consequence of R5 being
followed correctly, not a violation of it - flagged so Task 7 doesn't miss
it, not as a defect in this task.

Ranked findings
----------------

**Critical: none found.**

**Important:**

1. **TOOLING.md now contradicts itself across one blank line.** The new
   paragraph (`TOOLING.md:116-133`) says a lock, an install script, and a
   doctor check all exist and are run. The untouched heading immediately
   below it, `### NEITHER TOOL IS PINNED IN THIS REPOSITORY, AND THAT IS A
   STANDING RISK` (`TOOLING.md:135`), says "there is no lockfile... and no
   check that the installed versions match these" - which is now false on
   both counts. This is R5 followed correctly (Task 3 may touch only the
   accepted-risk paragraph; Task 7 owns the section's structure), so it is
   not a Task 3 compliance defect, but a reader hitting this file between
   Task 3 and Task 7 lands on a direct contradiction one scroll apart. Worth
   naming for Task 7 rather than letting it sit as a surprise.

2. **`install.sh` uses `npm install`, not `npm ci`, for copperhead's own
   dependency tree.** The script's own header is emphatic that there is "NO
   FALLBACK TO A DIFFERENT VERSION" - true for the two values the lockfile
   actually pins (copperhead's commit, akcli's pypi spec) - but copperhead's
   `package-lock.json` (confirmed present on disk) governs its *transitive*
   dependencies, and `npm install` is not guaranteed to reproduce a lockfile
   exactly the way `npm ci` is (it can update the lock if `package.json` and
   the lock disagree, where `npm ci` refuses instead). Given the stated
   principle that a fallback to a different version defeats the lockfile,
   `npm ci` is the more literal match for that principle applied one level
   down. Not Critical: the commit is pinned exactly, the lockfile is
   present, and `npm install` only diverges from it under specific
   conditions that do not arise from a normal pinned-commit checkout.

**Minor:**

3. `install.sh` does a full `git clone` (no `--depth`), producing a 72 MB
   `.git` and a 669 MB `node_modules` on this machine. Correct and safe (a
   shallow clone followed by a checkout of an arbitrary historical commit
   can fail if the commit isn't within the fetched depth), just worth
   knowing as the cost of "safe to re-run" - this is not the "shallow,
   no tags" checkout `TOOLING.md`'s hand-reproduction section describes a
   few lines above the new paragraph; the two procedures now produce
   checkouts with different `.git` shapes for the same pinned commit. No
   functional problem; flagging only because the doc and the script now
   describe two different clone shapes for the same target.

4. `howToFix`'s bootstrap branch for a pypi-backed tool is gated on
   `tool === "akcli"` explicitly rather than purely on `found === null` plus
   "has a resolver." Harmless today (akcli is the only pypi-backed tool in
   the lock), but a second pypi tool added later would silently fall
   through to the upgrade-only (bare `pip install`) branch even when
   nothing is there yet, reproducing exactly the bug R6 fixed. Worth a
   one-line comment or a lock-driven generalisation whenever a second such
   tool is added - not a defect against today's lock.

What I drove (not just read)
------------------------------

- `bun run typecheck`: clean, reproduced (`$ tsc --noEmit`, no output).
- `bun test tests/draught/`: reproduced, **20 pass / 0 fail**.
- Full `bun test`, alone (not beside `make`): reproduced, **2749 pass / 0
  fail across 262 files, 38620 expect() calls, 131.49s** - matches the
  report's claimed number exactly; I ran it myself rather than trusting the
  log.
- `make draught-doctor`: reproduced, exit 0, output byte-for-byte matching
  the report's quoted transcript (python 3.14.6, akcli 0.22.0, kicad-cli,
  ngspice, symbols all `ok`; config `MISSING` and advisory; `draught-doctor:
  every tool pinned in draughting/tools.lock.json matches`).
- `git check-ignore -v draughting/copperhead draughting/venv-akcli`: both
  resolve to the new `.gitignore` lines, exit 0 each.
- `git status --short`: clean, including `draughting/` (the installed
  directories do not appear at all).
- `git diff 9e226cc..HEAD -- drafted/ docs/schematic/verdicts.md
  schematic/readability-baselines.json`: empty, reproduced.
- `git show HEAD:CLAUDE.md` vs. the working copy: byte-identical, diffed
  mechanically (not by eye) - no drift.
- Canary'd control-byte scan: wrote a scanner that reads raw bytes (macOS
  `grep` has no `-P`), planted a NUL in a scratch file, confirmed the
  scanner caught it (`CANARY OK`), then scanned all 16 touched files - all
  clean.
- **Sabotaged `tsconfig.json`**: removed the `draughting/copperhead`
  exclude entry. `tests/not-source.test.ts` failed exactly as it should,
  naming the missing path in its diff output. Restored; reran clean (4
  pass). `git diff --stat tsconfig.json` empty after restore.
- **Sabotaged `bunfig.toml`** twice: set `root = "."` (a no-op that still
  covers the whole repo) - the bridge test's explicit `expect(root).not.toBe(".")`
  guard caught it. Restored to `root = "tests"`, reran clean (4 pass,
  diff empty after restore).
- **Drove `doctor.test.ts`'s finally-survives-a-throw directly**: confirmed
  a real `akcli` binary exists and works on this machine
  (`draughting/venv-akcli/bin/akcli --version` → `0.22.0`), then inserted a
  forced `throw` inside the test's `try` block, after the real binary had
  been renamed aside but before the stub ran. The test failed on the
  injected error as expected (8 pass / 1 fail), and the real binary was
  confirmed restored and working (`akcli --version` still returns `0.22.0`)
  immediately after. Reverted the injected throw; reran clean (9 pass).
  This is the single most dangerous test on the branch and its `finally`
  does survive a thrown assertion.
- **The fifth-walker search**: grepped every `.ts` file outside
  `node_modules`, `draughting/copperhead`, and `.tools` for
  `readdirSync`/`fs.readdir(`/`glob(`, then read every hit's calling
  context rather than trusting the filename. None walk the repository root
  or any ancestor of `draughting/` besides the four already-fixed walkers
  (`tests/kicad/footprint-sweep.ts`, `tests/kicad/symbol-names.test.ts`,
  `tools/perfboard/declaration.ts`, its test). Everything else is scoped to
  a narrow, non-colliding root: `os.tmpdir()`
  (`tests/support/temp-scratch.ts`, `tools/stripboard/prune-temp.ts`'s
  second walker), a single run directory passed in by the caller
  (`tools/stripboard/adopt.ts`'s `.vrt` search), `tests/` and `tools/` only
  for a scratch-prefix registry scan (`prune-temp.ts`'s first walker), a
  single flat `parts/`-style catalog directory with no recursion
  (`tools/bom/catalog.ts`, `tools/suppliers/refresh.ts`), an installed
  KiCad system-library directory, not this repository
  (`tests/kicad/footprint-library.ts`), or a fixed, named-file text scan,
  not a directory walk (`tests/stripboard/escapes-search.test.ts`'s
  determinism sweep, which lists files by path rather than discovering
  them). No fifth walker found.
- `tools/perfboard/declaration.ts` keeping `dist` local while importing
  `VENDORED_CHECKOUT_NAMES` for the rest: read and confirmed correct -
  `dist` is this walker's own build-output name (unrelated to any other
  walker), not a vendored-checkout concern, and the code comment
  (`tools/perfboard/declaration.ts:1104-1109`) states that distinction
  explicitly.
- Confirmed `npm audit` inside the real `draughting/copperhead` checkout
  reports exactly **22 vulnerabilities (3 low, 6 moderate, 10 high, 3
  critical)** - the figure `TOOLING.md` and the report both cite - ran it
  myself rather than accepting the quoted number.
- Checked for stray processes and leftover artifacts from my own driving:
  none (`ps aux` clean of akcli/copperhead/install.sh; no
  `*.task3-fix-round-1*` backup files left under `draughting/`; `git status
  --short` clean at the end).

What I reasoned about rather than drove further
--------------------------------------------------

- The "safe to re-run" claims for the mismatch-refusal and the
  already-at-pinned-commit paths were read and checked for logical
  soundness (full `rev-parse HEAD` comparison against a 40-hex-char pinned
  SHA, unambiguous) but not re-run against a live mismatched checkout - that
  would require deliberately corrupting the real installed toolchain this
  machine's later tasks depend on, which the task's own "do not delete it"
  instruction rules out doing carelessly. The refusal messages and the
  logic reviewed cleanly; I did not fabricate having executed this path.
- `python3 -m venv`'s claimed idempotency against an existing venv
  (repairs in place rather than wiping) is standard, documented Python
  `venv` module behaviour and was not independently driven against this
  machine's real venv for the same reason - re-running it against the real,
  working `draughting/venv-akcli` was judged not worth the risk relative to
  what it would prove beyond the standard library's documented contract.
- `probeTool`'s copperhead probe (`npx tsx src/cli.ts --version`) is Task
  1's resolver, out of this task's Files list, and was not re-audited line
  by line.

Ran vs. reasoned, summary
---------------------------

Ran for real: typecheck, `tests/draught/` suite, full `bun test`,
`make draught-doctor`, `git check-ignore`, `git status`, the scoped `git
diff`, the `CLAUDE.md` drift diff, a canary'd byte scan, two independent
config-file sabotage drives against `tests/not-source.test.ts`, a forced-throw
drive against `doctor.test.ts`'s `finally`, a live `npm audit` inside the
real copperhead checkout, and a repo-wide grep-and-read for a fifth walker.

Reasoned from code reading without a live fault injection: the
mismatched-checkout refusal path (would require corrupting the real
toolchain other tasks depend on) and `python3 -m venv`'s re-run behaviour
(standard library contract, not this task's code).
