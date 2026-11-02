# SDD ledger — plan: docs/superpowers/plans/2026-10-30-institutionalise-draughting.md

Spec: docs/superpowers/specs/2026-10-30-institutionalise-draughting-design.md
Branch: feature/schematics-tooling. Plan BASE: 0684fdb.

PRE-FLIGHT CONFLICT SCAN: run before Task 1 and committed at
  docs/superpowers/plans/2026-10-30-remove-schgen-execution/next-plan-preflight-scan.md
  It is the full table - one row per task pair sharing a file or interface, one
  row per task for self-agreement - and it is not restated here. Six findings,
  each ruled below with what it costs if wrong.

Pre-flight conflict scan: 2026-10-30-institutionalise-draughting
================================================================

Run before Task 1 is dispatched, against the tree at the head of the removal
plan. One row per task pair that shares a file or an interface, one row per
task for whether its own text agrees with itself. A ruling beside every
finding.

Shared files and interfaces
---------------------------

| Tasks | What one produces / what the other consumes | Found |
| --- | --- | --- |
| 1 -> 2 | `tools/draught/toolchain.ts` produces the version check; Task 2's `draught-doctor` consumes it | Clean. Task 2 must not re-implement the comparison - the doctor is a reporter over Task 1's checker. |
| 1 -> 5 | the same checker; `make draw` must refuse on a mismatch before drafting | Clean, with a note: Task 5's refusal is Task 1's refusal, not a second one. |
| 2 -> 5 | both Modify `make/perfboard.mk`, adding a top-level verb | Clean as a text conflict - different targets, and 5 follows 2 so it copies 2's shape. See FINDING 1 and FINDING 2, which are about that file's contents rather than the pair. |
| 3 -> 6 | both Modify `README.md` | Clean. Task 3 edits the prerequisites section, Task 6 the governing-documents table. Different sections. |
| 1, 2, 5 -> `tools/cli/resolved-default.ts` | Global Constraints mandate that tools resolve the way `KICAD_CLI` and `HTML_TO_PDF` do - an overridable make variable behind that bridge script | FINDING 3: no task's Files list names it, or the `lib/**/install.ts` modules holding the `defaultX()` functions it dispatches to. |
| 2, 5 -> `tools/cli/entrypoint.ts` | both Create a `tools/cli/` verb | Clean. `entrypoint.ts` exports only `isMain(moduleUrl)`; there is no verb registry to update, so neither task touches it. |
| 4 -> 7 | promoted script paths that `TOOLING.md` then cites | Clean, and the ordering matters: 7 cites 4's paths, so 4 lands first. |
| plan 1 Task 10 -> 7 | both Modify `TOOLING.md` | Ruled already (Ruling C on the removal plan): Task 10 corrects falsehoods only, Task 7 owns the structure. |
| plan 1 Task 10 -> 3, 6 | plan 1 Task 10 rewrites four regions of `README.md`, including the `bun run schgen` front-door section | FINDING 4: Tasks 3 and 6 must read `README.md` as Task 10 leaves it, not as the plan's author saw it. |
| all -> `drafted/`, `verdicts.md` | Global Constraints forbid touching them | Clean, and the five sha256s are the check. |

Self-agreement, one row per task
--------------------------------

| Task | Its own text against itself | Found |
| --- | --- | --- |
| 1 | lockfile + checker + test | Clean. |
| 2 | `make draught-doctor` | Its Files line already asks the implementer to check which file `make help` lists verbs from. Resolved below (FINDING 1). |
| 3 | install script + README prerequisites + test | Clean. |
| 4 | promote the measurement scripts | FINDING 5: the test drives `draughting/measure/selftest.py`, and the task also says `orphan_junctions.py` is deleted and does not return. If `selftest.py` exercises a control over that script, the promoted selftest fails on arrival. |
| 5 | `make draw BOARD=<board>` | FINDING 2, and it is the sharp one. |
| 6 | the skill + README table | Clean. |
| 7 | `TOOLING.md` | Clean. |

Findings and rulings
--------------------

**FINDING 1 - which makefile. RESOLVED, no ruling needed.** `make help` is
defined twice, at `make/aggregate.mk:81` and `make/board.mk:182`, both
delegating to `perfboard-help`. `make/perfboard.mk` is the file every
directory includes and the one that includes the other two, so a verb that
must exist in every directory belongs there. The plan's "check first" is
answered: `make/perfboard.mk` is correct for both Task 2 and Task 5.

**FINDING 2 - `make draw BOARD=<board>` CONTRADICTS A STATED CONVENTION, and
the convention gives its reason.** `make/perfboard.mk:14-28`:

> *"THE DIRECTORY YOU ARE STANDING IN IS THE CONTEXT. There are no variables
> to remember in the common case ... TO ACT ON A BOARD FROM OUTSIDE ITS
> DIRECTORY, use make's own flag: `make -C boards/pt2399-core check`. That is
> the same mechanism driven from elsewhere, not a second one - there is
> deliberately no BOARD=<name> variable."*

and `make/board.mk:4` states it again with the reason: *"no BOARD=<name>
variable, because two ways to say which board"*. The plan's Task 5 title is
the one thing this file says it will not have.

**Ruling: the verb is `make draw`, context-directed, and `make -C <board dir>
draw` is how it is driven from elsewhere.** The plan's `BOARD=<board>` is
dropped. Reasons: the convention is stated twice with its rationale and is
load-bearing for every other verb in the file; a second way to name a board
is the defect it names; and nothing in the drawing flow needs a board named
from outside a board directory that `-C` does not already give. **This is a
plan correction, not an implementer's choice** - carry it in Task 5's
dispatch, and carry it to Task 7 too, because `TOOLING.md` will document the
verb.

**What it costs if wrong:** if the drawing flow turns out to need a board
named from a directory that is not a board - a cross-board sweep, say - then
`draw` needs an argument after all, and the right answer then is a verb in an
aggregate directory that walks down, which is the shape `check` already has.
Reversible in one commit either way.

**FINDING 3 - the resolver bridge is mandated and unassigned.** Four new tools
(`copperhead`, `akcli`, `magick`, `qpdf`) need resolution, and the Global
Constraints say how: an overridable make variable with a per-platform
candidate list behind `tools/cli/resolved-default.ts`, citing what a
hardcoded default cost (**G170**). But `resolved-default.ts` dispatches on
three literal names to three `defaultX()` functions in `lib/kicad/install.ts`,
`tools/guide/browser-install.ts` and `tools/guide/pdf-merge-install.ts`, and no
task's Files list names any of them.

**Ruling: Task 1 owns the bridge.** It is the task that establishes what a
pinned tool is, so it extends `resolved-default.ts` and adds the `defaultX()`
for each new tool beside the existing install modules rather than inventing a
fourth pattern. Tasks 2 and 5 consume it. **What it costs if wrong:** Task 1
grows by four small resolver cases; the alternative is three tasks each
discovering the same gap and one of them hardcoding a path, which is exactly
G170.

**FINDING 4 - Tasks 3 and 6 read `README.md` after Task 10, not before.**
Plan 1's Task 10 rewrites the prerequisites-adjacent prose and deletes the
`bun run schgen` front-door section entirely. **Ruling: both dispatches say
to read the file first and to quote nothing from the plan's description of
it.** Cost if wrong: an edit against text that is no longer there, which
fails loudly rather than quietly.

**FINDING 5 - the promoted selftest may carry a control over a deleted
script.** Task 4 deletes `orphan_junctions.py` and promotes `selftest.py`,
whose assertion is that *every control moved or fired*. **Ruling: the
implementer reads `selftest.py` before moving it and accounts for every
control in it, exactly as the removal plan's standing instruction requires;
a control whose subject is deleted is removed from the selftest WITH its
count corrected in the same edit, and named in the report.** Cost if wrong:
the suite's own count disagrees with its controls, which is the defect class
this plan is meant to prevent.

**FINDING 6 - THE PROMOTED SELFTEST'S FIXTURES ARE THE RUN DIRECTORIES TASK 4
IS TOLD NOT TO TOUCH, and its path arithmetic breaks on the move.** This is
the one the plan could not have predicted, and it is why Task 4's test fails
on arrival if written as the plan writes it. `docs/research/lib/selftest.py`
computes

    HERE = pathlib.Path(__file__).resolve().parent
    REPO = HERE.parents[2]
    RESEARCH = REPO / "docs/research"

and then names seven committed sheets under `docs/research/<run-dir>/` as its
fixtures. `HERE.parents[2]` is the repo root only from `docs/research/lib/`;
from `draughting/measure/` it is one level above the repo. So the move breaks
`REPO`, and even once `REPO` is fixed the fixtures **stay** in
`docs/research/` - which is correct, because Task 4 Step 5 says the run
directories are the execution record of approved runs and are left alone.

**Ruling: the promoted selftest keeps `docs/research/`'s run sheets as its
fixtures and resolves the repo root from git rather than by counting
parents.** A path computed by counting directory levels is a path that breaks
silently on exactly this kind of move; `tools/perfboard/repo-root.ts` is the
existing precedent for asking git instead. **Cost if wrong:** the
measurement suite's fixtures live in a documentation directory, which reads
oddly - but copying seven sheets into `draughting/` would duplicate committed
artifacts that `drafted/` and the run records already pin, and a duplicate of
an approved sheet is a far worse defect than an odd-looking path.

**One observation, not a finding.** `git ls-files docs/research/lib/` returns
only `kicad_sheet.py` and `selftest.py`, so the `__pycache__/` beside them is
untracked. Task 4 must not promote it. Separately,
`docs/research/lib/kicad_sheet.py:328` carries a comment naming
`orphan_junctions.py` as something *"returned on purpose"* - a reference to
the deleted script that travels with the file on the move, and one Task 4
should correct in passing rather than carry.

---

RULINGS ON THE SCAN, made before Task 1 was dispatched
======================================================

FINDING 1 - which makefile. RESOLVED by measurement, no ruling needed.
  make help is defined at make/aggregate.mk:81 and make/board.mk:182, both
  delegating to perfboard-help. make/perfboard.mk is the file every directory
  includes and the one that includes the other two, so a verb that must exist
  in every directory belongs there. Tasks 2 and 5 both target it correctly.

FINDING 2 - make draw BOARD=<board>. RULED BY THE OWNER, 2026-10-31, and it is
  no longer my provisional call. I ruled it context-directed; he was shown both
  forms and said "I hate using environment variables". docs/known-gaps.md G308
  carries the ruling, what precisely was rejected (a make variable on the
  command line AND the environment form - the distinction rescues neither), and
  the cost if it is wrong. The spec and the plan are amended at 0684fdb, old
  wording struck rather than edited away. Task 5's dispatch carries G308.

FINDING 3 - THE RESOLVER BRIDGE IS MANDATED AND UNASSIGNED. Four new tools
  (copperhead, akcli, magick, qpdf) need resolving, and the plan's own Global
  Constraints say how: an overridable make variable with a per-platform
  candidate list behind tools/cli/resolved-default.ts, citing G170 on what a
  hardcoded default cost. But that script dispatches on three literal names to
  three defaultX() functions in lib/kicad/install.ts, tools/guide/browser-install.ts
  and tools/guide/pdf-merge-install.ts, and NO task's Files list names any of
  them.
  Ruling: TASK 1 OWNS THE BRIDGE. It is the task that establishes what a pinned
  tool is, so it extends resolved-default.ts and adds a defaultX() for each new
  tool beside the existing install modules rather than inventing a fourth
  pattern. Tasks 2 and 5 consume it.
  Cost if wrong: Task 1 grows by four small resolver cases. The alternative is
  three tasks each discovering the same gap and one of them hardcoding a path,
  which is G170 exactly.

FINDING 4 - TASKS 3 AND 6 READ README.md AFTER THE REMOVAL PLAN, NOT BEFORE.
  Task 10 of the removal plan rewrote five regions of README.md and deleted the
  bun run schgen front-door section entirely.
  Ruling: both dispatches say to read the file at HEAD first and to quote
  nothing from the plan's description of it.
  Cost if wrong: an edit against text that is not there, which fails loudly.

FINDING 5 - THE PROMOTED SELFTEST MAY CARRY A CONTROL OVER A DELETED SCRIPT.
  Task 4 deletes orphan_junctions.py and promotes selftest.py, whose assertion
  is that EVERY CONTROL MOVED OR FIRED. docs/research/lib/kicad_sheet.py:328
  still names orphan_junctions.py as something "returned on purpose".
  Ruling: the implementer reads selftest.py before moving it and accounts for
  every control in it - moved, strengthened, or dropped with a reason - which is
  the standing instruction the removal plan earned over seven instances of a
  port coming out weaker than its original. A control whose subject is deleted
  is removed WITH its count corrected in the same edit, and named in the report.
  Cost if wrong: the suite's own count disagrees with its controls, which is the
  defect class this plan exists to prevent.

FINDING 6 - THE PROMOTED SELFTEST'S FIXTURES ARE THE RUN DIRECTORIES TASK 4 IS
  TOLD NOT TO TOUCH, AND ITS PATH ARITHMETIC BREAKS ON THE MOVE. selftest.py
  computes REPO = HERE.parents[2] and then names seven committed sheets under
  docs/research/<run-dir>/ as its fixtures. parents[2] is the repo root only
  from docs/research/lib/; from draughting/measure/ it is one level above the
  repo. Step 5 of the same task says the run directories are the execution
  record of approved runs and are left alone - so the fixtures must STAY there.
  Ruling: the promoted selftest keeps docs/research/'s run sheets as its
  fixtures and resolves the repo root FROM GIT rather than by counting parents.
  tools/perfboard/repo-root.ts is the existing precedent for asking git.
  Cost if wrong: the measurement suite's fixtures live in a documentation
  directory, which reads oddly - but copying seven sheets into draughting/ would
  duplicate committed artifacts that drafted/ and the run records already pin,
  and a duplicate of an approved sheet is a far worse defect than an odd path.

ONE OBSERVATION, NOT A FINDING. git ls-files docs/research/lib/ returns only
  kicad_sheet.py and selftest.py, so the __pycache__/ beside them is untracked
  and must not be promoted. Separately, kicad_sheet.py:328's comment naming the
  deleted orphan_junctions.py travels with the file on the move; correct it in
  passing rather than carry it.

STANDING INSTRUCTIONS CARRIED INTO EVERY DISPATCH ON THIS PLAN, each earned by
a measured failure on the plan that preceded it:
  1. ENUMERATE AND ACCOUNT. Open what you are replacing, list its assertions,
     and account for each as moved, strengthened or dropped-with-a-reason. An
     unaccounted assertion is the finding. Seven instances on the last plan.
  2. DRIVE EVERY CONTROL. A control is proven by introducing the fault its own
     comment names, showing it fails, and reverting - not by reading it. Three
     controls that could not fail reached production code on the last plan,
     including one written into the fix for that defect class.
  3. A SCAN CARRIES A CANARY. macOS grep has no -P; the last plan's first
     control-byte scan reported "0 hits over 0 files" and was caught only by a
     canary.
  4. YOUR COPY OF CLAUDE.md MAY BE OLDER THAN CLAUDE.md. Measured on 2026-10-31:
     a freshly dispatched agent reproduced a sentence struck from that file a
     day earlier, verbatim, with both of its deleted commands. Read HEAD; where
     your instructions and the file disagree, the file wins and you say so.
  5. NO AI ATTRIBUTION, no sed writes, no "#" in heredocs, no control-character
     escapes typed into tool parameters, no fallbacks outside test code, and you
     are not a qualified reviewer of a drawing.

FINDING 7 - FOUND AT DISPATCH TIME, AND IT WOULD HAVE SHIPPED A CHECK THAT LIES.
  Measured on this machine: akcli NOT on PATH, kicad-cli NOT on PATH, magick and
  qpdf present, copperhead only in a session scratchpad that will be destroyed.
  The brief's lockfile probes kicad-cli as the bare name ["kicad-cli","--version"],
  so draught-doctor would report kicad-cli ABSENT on a machine where make check
  invokes it successfully on every run - because it lives at
  /Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli and is found through
  lib/kicad/install.ts's per-platform candidate list. Verified:
  bun tools/cli/resolved-default.ts kicad-cli prints that path.
  Ruling: A PROBE RESOLVES ITS TOOL THE WAY THE REST OF THE REPOSITORY DOES.
  For a tool with an existing resolver the probe uses the resolved path, not the
  bare name; for the four new tools Task 1 adds resolvers under Finding 3 and the
  probes use those. The bare-name form stays only where a tool genuinely has no
  resolver and is expected on PATH.
  Cost if wrong: the probe array grows a resolution step. The alternative is a
  doctor that reports a working toolchain broken, which is worse than no doctor -
  and it is G170's lesson arriving in a new file one plan after it was recorded.

  NOT A DEFECT, STATED SO THE IMPLEMENTER DOES NOT TRY TO FIX IT: akcli and
  copperhead being absent is the CORRECT report from Task 1. Installing them is
  Task 3. Task 1's job is to say so accurately.

Task 1: dispatched (BASE 0684fdb), implementer a040110ff29b3da0f, model sonnet.
Task 1: DONE at 46c30c4. 8 files, +532/-12. typecheck clean; tests/draught/
  3 pass 0 fail; full suite run ALONE 2727 pass / 0 fail across 259 files,
  128.12s (+3 over the 2724 baseline, all three new); protected-artifact diff
  empty; control-byte scan in Python with a planted-NUL canary proven to fire,
  zero hits across 8 files.
Task 1: BOTH CONTROLS DRIVEN, not reported. (1) the brief's own positive
  control - broke checkToolchain to return [], both brief tests failed,
  reverted and byte-diffed clean. (2) its own Finding-7 regression control -
  removed kicad-cli from the resolver map, the new test failed exactly as
  predicted with found: null, reverted and byte-diffed clean.
Task 1: FINDING 7 CONFIRMED BY ITS OWN MEASUREMENT, not taken from my
  dispatch: kicad-cli absent from PATH but working at the bundle path,
  --version 10.0.5. The probe now resolves through the installed-location
  default, and the test it added is the one that would have caught the plan's
  literal lockfile.
Task 1: Finding 3 delivered wider than I ruled, and correctly - rather than
  one bridge it added three install modules in lib/kicad/install.ts's shape
  (magick, akcli, copperhead) and gave pdf-merge-install.ts a defaultQpdf
  ALIAS rather than a duplicate candidate list for the same binary.
Task 1: ITS ONE CONCERN IS A REAL CROSS-TASK COUPLING AND I AM RULING IT NOW.
  It had to choose install locations for akcli and copperhead to write their
  resolvers, and nothing in the plan, the spec or my rulings names where Task
  3's install.sh will put them. It chose draughting/venv-akcli and
  draughting/copperhead, documented the assumption in both modules and named
  the one function to change.
  Ruling: THOSE ARE THE LOCATIONS. Task 3 installs to them rather than
  choosing its own, and its dispatch carries this. Reason: the resolver is
  written and tested, the paths sit beside the lockfile they belong to, and a
  second opinion in Task 3 would make two places for one fact to be wrong -
  which is the reasoning the owner applied to BOARD= in G308 two commits ago.
  Cost if wrong: one function changes and its test with it.
Task 1: AND A CONSEQUENCE NOBODY HAS STATED, found by checking rather than
  assuming. git check-ignore shows draughting/venv-akcli and
  draughting/copperhead are NOT ignored, and git ls-files shows only
  tools.lock.json tracked under draughting/. So Task 3's install script will
  drop a python venv and a git checkout into the working tree where git can
  see them - noise in every status, and one careless git add from committing a
  vendored toolchain into a repository that chose an install script OVER
  vendoring and recorded that as the trade.
  Ruling: TASK 3 ADDS THE .gitignore ENTRIES IN THE SAME CHANGE AS THE SCRIPT
  THAT CREATES THE DIRECTORIES, with a test that the install locations are
  ignored. Not a later tidy-up: the window between creating them and ignoring
  them is exactly when the accident happens.
  Cost if wrong: two lines in .gitignore that nothing needed.
Task 1: review dispatched.
Task 1: review returns spec PASSES, quality HIGH, two Important, two Minor.
  Reviewer drove rather than relayed: re-ran both of the implementer's
  controls itself, ran magick/qpdf/kicad-cli --version with stdout and stderr
  SPLIT to confirm the probe's capture actually sees the version, traced the
  extraction regex against each real output, and verified the 2724-to-2727
  arithmetic against the diff - one new file, exactly three new test() calls,
  no other test file touched - rather than against the total.
Task 1: BOTH IMPORTANTS ARE ONE DEFECT IN TWO PLACES - a how string that does
  not fix what it claims to, printed to a person by Tasks 2, 3 and 5. This
  repository treats a refusal naming what is missing but not how to fix it as
  incomplete; a how that is actively WRONG is worse, because the person pastes
  it, it appears to work, and the check still fails.
  I-1 howToFix hardcodes the literal draughting/copperhead three times instead
    of calling defaultCopperheadDir(), which the file already imports - and
    copperhead-install.ts's own comment claims nothing else hardcodes the path
    a second time, so the comment is false as written. G170's exact shape,
    inside the file written to satisfy G170's constraint.
  I-2 the pypi how says pip install akcli-kicad==X.Y.Z while defaultAkcli()
    resolves draughting/venv-akcli/bin/akcli. Pasted into a plain shell it
    installs to whatever Python is on PATH and the check keeps failing.
Task 1: THE STALE-INJECTION HAZARD RECORDED YESTERDAY WAS OBSERVED AGAIN, BY A
  DIFFERENT AGENT, UNPROMPTED BEYOND THE STANDING INSTRUCTION. The reviewer's
  injected CLAUDE.md still says to run bun tools/schgen/board-sheets.ts;
  HEAD says those commands are deleted and nothing replaced them, and
  tools/schgen/ does not exist. Second measured instance. The implementer
  reported NO drift on the same check, so one of the two is wrong and the fix
  round is asked to settle which - a disagreement between two agents about
  what their own instructions say is worth more than either report.
Task 1: fix round 1 dispatched to the same implementer.
Task 1: re-review returns BOTH IMPORTANTS ADDRESSED, both Minors handled, no
  new breakage. It re-drove both sabotages itself rather than relaying: the
  I-1 test fails on the bare literal, the I-2 test fails with no venv path at
  all, each reverted byte-identical and retested 5/5. It also checked that
  venvPipFor's bin/pip vs Scripts\\pip.exe branches AGREE with defaultAkcli's
  own bin/akcli vs Scripts\\akcli.exe layout - proving the derivation is
  genuine rather than a second literal that happens to match today, which was
  the trap the finding pair set.
Task 1: complete. Commit range 0684fdb..0564883.

Task 1: RESIDUAL CARRIED TO TASK 3, and it is the best finding of the task -
  it came from asking the question the tests cannot. A how string is called
  for TWO different problem states and each branch currently repairs only one:
    copperhead: the command is a fresh git clone. Right when the checkout is
      ABSENT; refuses outright when it EXISTS at the wrong commit, which is
      the mismatch case that produced the problem.
    akcli: the command is <venv>/bin/pip install. Right when the venv EXISTS
      with the wrong version; fails No such file or directory when the venv is
      ABSENT - which is the literal state of this machine today, since
      install.sh does not exist yet.
  Neither is new breakage and neither is silent - both fail loudly rather than
  quietly succeeding into the wrong place, which is strictly better than the
  bare pip install they replaced.
  Ruling: TASK 3 OWNS THE SPLIT. A bootstrap how (nothing installed) and an
  upgrade how (installed, wrong version) are two different commands, and the
  install script is the task that knows which state it is in. Task 3's
  dispatch carries this, with a test per state.
  Cost if wrong: howToFix grows a branch it did not need.

Task 1: MY OWN PROCESS SLIP, recorded because an agent caught it and I did
  not. I committed an unrelated CLAUDE.md change WHILE this re-review was
  running its gates in the same working tree. It saw the dirty tree, correctly
  diagnosed it as a concurrent session rather than its own doing, and did not
  charge it against Task 1. No harm, but a reviewer's git status is part of
  its evidence and I made it lie for a few minutes. Controller edits to the
  tree wait until a review's gates are done.

Task 2: DONE at efeb9a5. 3 files, +136. TDD followed, tests watched failing
  on Cannot find module first. tests/draught/ 5 to 7 pass; full suite ALONE
  2731 pass / 0 fail across 260 files, 142.64s; typecheck clean; protected-path
  and .gitignore diffs empty; canary'd NUL scan over four files, canary proven
  on a planted byte first, zero hits.
Task 2: CONTROL DRIVEN AND IT PRINTED THE RIGHT THING. Perturbed the lock's
  kicad-cli entry to 99.99.99-control, ran the target, got a THIRD
  disagreement naming the tool with wanted and found both quoted, non-zero
  exit, reverted from a pre-edit backup, and re-ran to output matching the
  pre-control run exactly. The re-run match is the part that makes the revert
  evidence rather than assertion.
Task 2: concerns 1 and 2 ACCEPTED AS REASONED, no action.
  1 - the exit code comes only from checkToolchain's problem count; akcli
    doctor's own failure is printed as context and never contributes. Its
    reason is right: checkToolchain's akcli entry already carries that fact,
    and a second signal from one fact can disagree with the first.
  2 - make surfaces 2 where the script exits 1. Standard GNU make, consistent
    with every other refusing target here, and the brief said only non-zero.
Task 2: CONCERN 3 IS A REAL GAP AND THE MISS IS MINE, NOT THE IMPLEMENTER'S.
  make draught-doctor does not appear in make help - confirmed by running it.
  perfboard-help is defined in make/board.mk:184 and make/aggregate.mk:83,
  NEITHER of which the dispatch authorised, so its restraint was correct.
  THE BRIEF HAD ANTICIPATED THIS and I answered the wrong half of it: its
  Files line reads make/perfboard.mk "or whichever file make help lists
  top-level verbs from - check first". I resolved that as where the TARGET
  goes, which is perfboard.mk and is right, and never noticed the clause is
  about the HELP LISTING, which is somewhere else. A verb nobody can discover
  fails the plan's own purpose - this plan exists so the practice is invokable
  rather than remembered.
  Ruling: the fix round adds the entry to BOTH perfboard-help blocks, with a
  test, and the task that adds a verb is the task that lists it. Deferring to
  Task 7 would ship a TOOLING.md documenting a verb make help denies.
  AND NOTHING GUARDS make help's CONTENT TODAY - grep over tests/ finds no
  test naming perfboard-help or make help - so the test is new coverage, not a
  restored one.
  Cost if wrong: two help lines and a test in files the brief's own clause
  already reached.
Task 2: review dispatched.
Task 2: review returns spec COMPLIANT, quality SOLID, two Important, two
  Minor. The reviewer drove everything: re-ran the control end to end, GUTTED
  renderToolchainReport TWO DIFFERENT WAYS (fixed string, and empty-branch
  only) and confirmed each of the brief's tests catches its own gutting, and
  ran the target from the repo root AND a board directory to prove it is not
  CWD-relative. It also ran the full suite alone and matched 2731/0.
Task 2: I-1 IS THE FINDING OF THE TASK AND IT CAME FROM PRODUCING A STATE
  NOBODY HAD. I asked it to test the implementer's exit-code reasoning rather
  than re-litigate it. It trimmed the lock to only the installed tools and
  ran the target: EXIT 0, "every tool matches", and directly above it,
  unconditionally, akcli doctor could not run ENOENT - with no akcli entry in
  the lock at all. runAkcliDoctor() runs regardless of whether akcli is in
  the lock being checked, so the premise I accepted last turn - that
  checkToolchain's akcli entry already carries that fact - is false in a
  reachable state.
  THIS IS THE PROJECT'S CENTRAL RULE INVERTED. Not a silent failure, but a
  visible error beside a success exit, which leaves a reader unable to tell
  which to believe. And the module's own comment makes it worse: it notes
  akcli doctor covers MORE than the pinned version - python, kicad-cli,
  ngspice, symbols, config, network - and then treats the two signals as
  redundant.
  Ruling: the fix is the implementer's to argue - scope the doctor call to a
  lock that contains akcli, or let it contribute to the exit code and own the
  second signal. An unconditional error printed beside an unconditional pass
  is what is not acceptable. The test must produce the reviewer's state.
  Cost if wrong: a verb that is right about the toolchain and unreadable
  about it, which is the failure the plan was written to prevent.
Task 2: I ACCEPTED A FALSE PREMISE LAST TURN. I recorded concern 1 as
  ACCEPTED AS REASONED on the implementer's word, and the reasoning was wrong.
  What caught it was dispatching the reviewer to TEST the reasoning rather
  than re-argue it - the instruction that matters is test-it-do-not-debate-it.
Task 2: fix round 1 dispatched - I-1, the make help entry with a new test,
  and the uncovered runDraughtDoctor exit path, which is the same region I-1
  lives in. Minor on the fix-command framing carried to Task 3.

FINDING 8 - TASK 3'S FILES LIST AND ITS OWN STEP 5 DISAGREE, AND MY SCAN SAID
  THAT TASK WAS SELF-CONSISTENT. The Files list names install.sh, README.md
  and the test. Step 5 says to record the accepted upstream-availability risk
  in TOOLING.md, which is not in the list. It also creates a 3-and-7 pair on
  TOOLING.md that my pair table does not have a row for - I wrote a 4-to-7
  row for the promoted script paths and missed this one.
  Ruling: TOOLING.md IS IN SCOPE FOR TASK 3, for that one paragraph only.
  Task 7 still owns the file's structure, exactly as Ruling C on the removal
  plan set it. Cost if wrong: one paragraph written twice.
  THE SCAN ROW WAS WRONG RATHER THAN MISSING, which is the worse kind - a
  table asserting clean is read as checked.

FINDING 9 - TASK 3 STEP 4 CANNOT DO WHAT IT SAYS. It reads: run the script
  into a SCRATCH LOCATION and confirm make draught-doctor then passes. Those
  two halves contradict. Task 1's resolvers, which I adopted, compute
  moduleRepoRoot()/draughting/venv-akcli and .../draughting/copperhead with
  no environment override inside defaultAkcli() or defaultCopperheadDir() -
  verified by reading both. So an install into scratch leaves draught-doctor
  resolving the real paths, finding nothing, and still refusing. The step's
  own confirmation would be meaningless.
  Ruling: THE SCRIPT INSTALLS TO THE ADOPTED LOCATIONS, NOT TO SCRATCH, and
  Step 4 runs it for real. Reasons: it is the only way the step's
  confirmation means anything; it is what the adopted locations are for; the
  gitignore ruling already covers the side effect; and the approved design
  chose an install script OVER vendoring, so fetching upstream is the
  deliverable's intended behaviour rather than a liberty taken.
  AND IT FINALLY EXERCISES THE SUCCESS PATH. Task 2's review established that
  the zero-problem branch of draught-doctor has never executed outside a unit
  test, because no machine here has had the tools. A real install is the
  first time make draught-doctor can exit 0 for real, and Task 3 should
  QUOTE that output - it is the only evidence that the branch works.
  Cost if wrong: two gitignored directories to delete and a re-run.
Task 2: fix round 1 re-review - I-1, I-2 and M-1 all ADDRESSED and all
  re-driven independently. It reproduced the trimmed-lock state, re-drove the
  implementer's sabotage, DELETED a help entry to prove the two new tests are
  not vacuous (root test failed, board test unaffected - proving they are
  independently scoped), and reproduced the full suite at 2736/0 itself.
Task 2: BUT THE BOUNDARY IS REAL, AND ASKING FOR IT TO BE PRODUCED RATHER
  THAN ARGUED IS WHAT FOUND IT. The reviewer built a stub akcli reporting
  --version 0.22.0, matching the lock, and exiting non-zero on doctor. With
  akcli in the lock and every version matching: EXIT 0, a doctor failure
  naming a failed symbols-library check, and an unqualified "every tool
  matches" line beneath it. The gate on lock membership closed the state the
  first reviewer reproduced and no more.
  The implementer's own reasoning is what the stub refutes: a second signal
  "would invite them to disagree" holds only if the two probes CANNOT
  disagree. checkToolchain reads one version number; akcli doctor checks
  python, kicad-cli, ngspice, symbols, config and network.
Task 2: RULED BY ME RATHER THAN SENT UP, because the governing rule already
  decides it and SDD says a running plan does not wait on a human for a
  question its own authority answers.
  THE EXIT CODE STAYS SCOPED TO THE LOCK. Folding akcli doctor into it would
  make an OFFLINE MACHINE fail a verb about version pinning - trading this
  defect for a worse one, a gate that refuses for reasons unrelated to its
  subject.
  THE CONTRADICTION IS REMOVED IN THE OUTPUT INSTEAD. The defect is not
  silence, it is a loud failure above a line saying everything matches, and a
  reader cannot tell which governs. So: the success line stops being
  unqualified when an advisory check failed; the advisory section says in the
  OUTPUT, not only in a comment, that it does not gate; and the verb states
  what was and was not verified. That last sentence is the whole fix - it
  makes a true statement where there was an ambiguous one.
  AND THE WORDING HAS A TRAP: advisory must not read as ignorable. It is
  advisory TO THE EXIT CODE and still a real problem with the toolchain.
  Cost if wrong: a longer summary line, and a reader who sees an advisory
  failure and does not know draught-doctor is not the thing refusing.
Task 2: fix round 2 dispatched, with the stub-akcli test required to be built
  in the test's own temp directory and git status on draughting/ proven empty
  afterwards.
Task 2: round 2 re-review ADDRESSED, no new breakage. Everything re-driven
  independently rather than relayed - it wrote its OWN stub and repro script
  rather than running the committed test, and quoted the resulting output in
  full.
Task 2: THREE CHECKS IT DID THAT NOBODY ASKED FOR, each closing a gap:
  - CLEANUP SURVIVES A FAILING RUN, proven two ways: its own script with a
    deliberate throw inside the try, and the committed test run under
    sabotage with both new tests failing - draughting/ clean after both.
  - BINARY PRESENT BUT NOT EXECUTABLE, a case in no committed test: chmod 644
    at the resolved path gives EACCES, correctly routed to could-not-run
    rather than misread as ran-and-failed or as clean.
  - THE HEADER'S SCOPE STATEMENT IS UNCONDITIONAL across all four
    problems-count by doctor-ok combinations, which is the premise my
    acceptance of the implementer's scoping rested on. I asked it to verify
    that rather than take it from me, and it did.
Task 2: AND IT CONFIRMED THE SELF-CATCH RATHER THAN RELAYING IT. It isolated
  the two first-draft assertions against the sabotaged output and showed BOTH
  still evaluate true against the bug - so the implementer's report that its
  own assertions were inert is established, not claimed. It then swept the
  remaining four new assertions for the same shape and found none.
  FIFTH INSTANCE OF THE INERT-CONTROL CLASS ON THIS BRANCH, AND THE FIRST
  CAUGHT BY ITS OWN AUTHOR. The assertions looked right and were wrong; only
  driving the sabotage exposed them. That is the standing instruction paying
  for itself.
Task 2: complete. Commit range 04d1000..9e226cc. tools/cli/draught.ts is 204
  lines, inside the ceiling; the 179-line diff figure was churn from a
  doc-comment rewrite and the composition split, not growth - checked
  because a changed-line count is not a file length.

Task 3: SPOTTED MID-RUN, to raise at review rather than interrupt - the
  working tree shows tsconfig.json modified, and NO ruling and no step
  authorised it. Everything else in the tree matches the dispatch:
  .gitignore (R2), TOOLING.md (R5), toolchain.ts (R6's how strings),
  install.sh and the new test. The install itself genuinely ran -
  draughting/copperhead and draughting/venv-akcli exist and NEITHER appears
  as untracked, so R2's ignore entries are in place and working.
  Likely legitimate - a vendored copperhead checkout under draughting/ would
  otherwise be dragged into tsc --noEmit - but unannounced scope is what the
  review exists to catch, and the implementer should have to name it.

Task 3: A HAZARD NOBODY DESIGNED FOR, found by looking at what the install
  actually put on disk. draughting/copperhead ships 250 files matching
  *.test.ts, and this repository's test script is a bare `bun test` with no
  bunfig.toml and no root scoping. If bun's discovery reaches into that
  directory, this plan has just adopted a third-party project's entire test
  suite as its own: the count every task on this plan has measured against
  (2738) becomes meaningless, the suite's runtime and its pass/fail come to
  depend on upstream code, and a red build could be caused by a project this
  repository merely installs.
  tsconfig.json was already modified by the implementer to exclude
  draughting/copperhead from tsc - the SAME consequence, caught for the type
  checker and not necessarily for the test runner. One half of a problem
  solved is the shape worth being suspicious of.
  NOT RESOLVED HERE AND DELIBERATELY NOT MEASURED BY ME. The implementer is
  mid-run and will run the full suite itself; running a second bun test
  beside it is the exact concurrency that segfaulted this suite once already
  (Bun 1.3.8, address 0x204). ITS OWN REPORTED COUNT ANSWERS THE QUESTION:
  about 2738 means discovery does not reach, and a number in the thousands
  above means it does. Carried to the review either way, because a count
  that happens to look right is not the same as a scoping rule that exists.

Task 3: implementation done, NOT COMMITTED, and I am not committing it as
  handed over - the full suite is 2742 pass / 2 FAIL and the implementer
  named one of the two.
Task 3: MY MID-RUN HAZARD WAS REAL AND IT HAS TWO INSTANCES, NOT ONE.
  Instance 1, which the implementer hit and fixed: a bare bun test discovered
  copperhead's 250 vendored test files, 42 failures and 6 errors, 5346 files
  down to 422 after adding bunfig.toml with [test] root = tests.
  INSTANCE 2, WHICH IT MISSED: tests/kicad/footprint-names.test.ts SWEEPS
  THE REPOSITORY for footprint names and now reads copperhead's own test
  fixtures - it fails on Sensor_Humidity:SHT40 cited from
  draughting/copperhead/test/symlib.test.ts and draft-hardening.test.ts, a
  footprint no installed KiCad library holds.
  THE GENERALISATION IS THE FINDING. bunfig fixed test DISCOVERY; it does
  nothing for repository SWEEPS. tsconfig fixed the TYPECHECK surface; same.
  Every tool here that walks the tree now reads a third-party checkout, and
  the fact that copperhead is not ours would have to be stated in SIX
  independent places: tsconfig exclude, bunfig root, and - measured -
  tests/kicad/footprint-sweep.ts:42 and tests/kicad/symbol-names.test.ts:70,
  which carry BYTE-IDENTICAL copy-pasted NOT_SOURCE sets, plus the two
  declaration walkers in tests/perfboard/ and tools/perfboard/.
  Only footprint-names fails today. symbol-names walks the same tree with the
  same blind spot and happens to find nothing - which is luck, not a rule.
  Ruling: ONE NAMED NOTION OF "INSTALLED, NOT OURS", READ BY EVERY
  CONSUMER. The criterion binds; the mechanism is the implementer's. The
  obvious shape is an exported constant the walkers import, plus a test that
  reads tsconfig.json and bunfig.toml and asserts they exclude what the
  constant names - config files cannot import TypeScript, so a check that
  can fail is what holds them together, the same bridge reasoning as
  tools/cli/resolved-default.ts and G170.
  Cost if wrong: one constant and one agreement test, where the alternative
  is six places to forget and a failure that surfaces as a nonsense footprint
  name in an unrelated suite.
Task 3: SECOND FAILURE - doctor.test.ts's end-to-end regression test now
  fails because a REAL akcli exists at the resolved path for the first time,
  tripping that test's own safety refusal. The implementer calls it out of
  scope since Task 2 is closed. I DISAGREE: Task 3 created the condition, and
  a test that can never pass again on any machine where install.sh has run is
  a permanently red check that trains people to ignore red. Task 3 fixes it.
Task 3: cleared a STALE bun test process, pid 66169, running 7h46m - a
  leftover from the removal plan's era. Suite runs take 130s, so it was hung,
  and concurrent bun test runs are the suspected cause of the one segfault
  this branch has seen.

FINDING 5 IS CORRECTED, AND IT WAS MY OVERSTATEMENT. I ruled that Task 4's
  implementer must account for a control whose subject is the deleted
  orphan_junctions.py, and that removing one means correcting the count in
  the same edit. Measured instead of assumed, just now:
  - control_orphan_count IS in the CONTROLS list, but its subject is a LOCAL
    helper orphan_count(sheet) defined at selftest.py:227, not the deleted
    script. Nothing in selftest.py imports or shells out to
    orphan_junctions.py.
  - THE COUNT IS COMPUTED, NOT TRANSCRIBED: the last line prints
    f"{len(CONTROLS)} controls, every one moved or fired", so dropping a
    control corrects its own count. My "correct the count in the same edit"
    clause was advice for a problem that does not exist.
  - RUN HERE: 10 controls, every one moved or fired, exit clean.
  So Finding 5's risk is much smaller than I wrote. What survives of it is
  the ordinary enumerate-and-account discipline, not a specific trap.
  RECORDED AS A CORRECTION RATHER THAN EDITED AWAY, because this repository
  holds that a stale CAUSE is worse than a stale count - it sends the next
  agent after a rule that is not there - and an agent reading my original
  Finding 5 would have gone looking for a dependency that was never present.
  FINDING 6 IS UNCHANGED AND IS THE REAL ONE: REPO = HERE.parents[2] is the
  repo root only from docs/research/lib/, and the seven fixture sheets it
  names live under docs/research/<run-dir>/ which Step 5 forbids moving.

Task 3: review PASS on both verdicts, no Critical, two Important, two Minor.
  Everything driven: the bridge test sabotaged FOUR ways (tsconfig exclude
  removed; bunfig root set to "." and then removed) each failing for the
  right reason; a forced throw injected into doctor.test.ts AFTER the real
  akcli was renamed aside, proving the finally restores a WORKING binary -
  the most dangerous test on this branch, now driven rather than trusted;
  npm audit run in the real checkout returning the exact cited figure; and a
  repo-wide sweep of every recursive directory read looking for a FIFTH
  walker, finding none exposed.
Task 3: I-2 SENT BACK, and it is the task's own thesis half-done. install.sh
  uses npm install rather than npm ci, so copperhead's dependency tree may
  resolve differently from its package-lock.json. The script pins a commit
  exactly and then lets a 22-vulnerability-deep transitive tree float: pinned
  in the half that is easy to see. npm ci also wipes node_modules, which
  STRENGTHENS the safe-to-re-run property rather than weakening it.
  Guarded against the obvious wrong fix: if copperhead's lock and
  package.json disagree at the pinned commit, npm ci refuses - and falling
  back to npm install there is precisely the shape this project forbids. Told
  to refuse by name and report it as an upstream finding instead.
Task 3: M-2 SENT BACK - howToFix's akcli bootstrap branch is gated on a
  literal tool === "akcli" rather than derived from found === null plus a
  pypi spec. Harmless today, and a second pypi tool would silently get the
  wrong command - REPRODUCING THE BUG R6 EXISTED TO FIX, inside the code
  that fixed it. That is the seventh instance on this branch of a fix
  carrying the defect it repaired.
Task 3: TWO CARRIED TO TASK 7, and the first is sharp. TOOLING.md now
  CONTRADICTS ITSELF ACROSS ONE BLANK LINE: the new accepted-risk paragraph
  says a lock, an install script and a doctor check exist and run, while the
  untouched heading immediately below still reads "NEITHER TOOL IS PINNED
  ... no lockfile ... no check that the installed versions match these" -
  false on both counts. The implementer followed R5 exactly by not touching
  it, so this is my scoping producing a visibly false document for the
  duration, which is the cost of that ruling and is worth seeing stated.
  Also Task 7's: install.sh clones in full where TOOLING.md's hand
  reproduction describes a shallow checkout.

Task 3: fix round 2 landed at 6ff214c and a3ae0f9, committed by me after
  observing the suite line rather than accepting it: 2750 pass / 0 fail
  across 262 files, 0 named failures. Third time on this plan an agent has
  drawn the expected-versus-observed line itself.
Task 3: I-2 DRIVEN THE HARD WAY. It corrupted the REAL checkout's
  package.json with an unresolvable dependency, ran install.sh for real,
  confirmed refusal by name with no silent fallback, restored via git
  checkout inside the checkout, re-installed for real, and confirmed
  make draught-doctor exits 0 with a working toolchain left behind. A
  refusal proven by causing it, not by asserting the branch exists.
Task 3: M-2 fixed and its control driven - reverted to the literal name
  check, the new synthetic-second-pypi-tool test fails for the expected
  reason, restored.
Task 3: MY OWN SLIP, recorded. I chained a commit behind `grep -c` for an
  attribution check; grep exits 1 on zero matches, so the && chain aborted
  and nothing committed. Both drafts were clean. The check was right and the
  plumbing around it was wrong - a guard that blocks on SUCCESS is the
  mirror image of the inert-check class this branch keeps finding.

Task 3: fix round 3 landed at 06d6776. Suite OBSERVED at 2752 pass / 0 fail
  across 262 files before committing.
Task 3: MY INSTRUCTION WAS WRONG AND THE IMPLEMENTER CAUGHT IT. I told it to
  drop tool === "copperhead" because the right derivation was already beside
  the name. It found a bare condition-drop would be ACTIVELY WRONG rather
  than merely incomplete: the branch body calls defaultCopperheadDir()
  directly, so a second commit-pinned tool would have been cloned silently
  INTO COPPERHEAD'S OWN CHECKOUT. My one-token fix would have introduced a
  worse bug than the one it closed.
  It built RESOLVED_CHECKOUT_DIR, the git-checkout counterpart of the
  existing RESOLVED_BINARY map, derived the condition from spec.commit and
  spec.upstream alone, and made an unmapped tool fall through to the generic
  message rather than guess a directory. Then it drove the control by
  patching in MY naive version and confirming the new test catches it -
  handing "widget" copperhead's own clone command.
  THE INSTRUCTION TO ARGUE RATHER THAN COMPLY IS WHAT PRODUCED THIS. I wrote
  "if you think that is wrong, say so rather than doing it", and that clause
  is the only reason the naive fix did not ship.
Task 3: the third literal STAYS, judged explicitly as asked and I accept the
  reasoning - resolveProbeArgv substitutes an invocation SHAPE, a relative
  src/cli.ts path inside an npx-tsx-run checkout, not a repair command
  derived from the spec. No ToolSpec field generalises it, because a second
  commit-pinned tool could be a compiled binary with no such script, so
  deriving it would mean inventing a field rather than reading one. Left
  with a comment naming why it is not the same bug.
Task 3: AND IT WAS WRONG ABOUT REPO STATE, WHICH I CAUGHT BY CHECKING. It
  believed fix round 2 was never committed and staged a message covering
  rounds 2 and 3 together. Round 2 is committed AND pushed at 6ff214c and
  a3ae0f9; only round 3's two files were uncommitted. Its message would have
  described already-shipped work as new, so I wrote a round-3-only one.
  A resumed agent's belief about the tree is a claim like any other.
Task 3: complete. Commit range 9e226cc..06d6776.

Task 4: DONE at dfa964e and a88702c, 20 files, +1063/-15. typecheck clean;
  tests/draught/ 23 to 24; full suite OBSERVED at 2753 pass / 0 fail across
  263 files, delta exactly the one new test; selftest final line 10 controls,
  every one moved or fired; protected-path and TOOLING.md diffs empty.
Task 4: THE ENUMERATE-AND-ACCOUNT INSTRUCTION CAUGHT WHAT IT EXISTS FOR.
  crossings.py had SIX copies - five byte-identical carrying true-crossings
  and T-meeting semantics, and one WEAKER OUTLIER at
  low-boost-in-thompson-bell-idiom carrying the literal-space wire bug this
  whole toolkit was built to fix. Taking the newest copy would have promoted
  the broken one. It diffed all six and took the five-way identical version.
  crop.py was the opposite shape: six copies, NO TWO SHARING A CROP TABLE,
  each Adapted-from the last. It took the newest for mechanics and recorded
  that the REGIONS table is run-specific by design rather than pretending
  one table generalises.
Task 4: control driven properly - it reverted wire_hits() in kicad_sheet.py
  to the SUPERSEDED endpoint-only semantics and confirmed BOTH the selftest
  and the new bun test fail loudly, then restored and checked the diff held
  only intended edits. That is the promoted suite proven able to fail from
  its new home, not merely observed passing there.
Task 4: A CONSEQUENCE TO PUT TO THE REVIEW - docs/research/lib/ NO LONGER
  EXISTS; selftest.py and kicad_sheet.py were git-mv'd out of it. The
  non-promoted scripts still sitting in the run directories - boxgeom.py,
  pwr_survey.py, pingeom.py, verify.py, dump_sheet.py - imported from that
  lib and will now ImportError if anyone runs them. Step 5 said leave the
  run directories alone, and it did; but an EXECUTION RECORD THAT CAN NO
  LONGER EXECUTE is a quieter kind of loss than deleting it, and nobody
  ruled on it because nobody foresaw it.
Task 4: AND THE MOVE LEFT DANGLING PATHS IN PROTECTED FILES - measured:
  TOOLING.md and THREE drafted/pultec/*/RECORD.md files still name
  docs/research/lib/kicad_sheet.py, a directory that is now gone. TOOLING.md
  is Task 7's. The RECORD.md files are frozen by my own ruling, and this is
  the second dangling-command instance in them - which is exactly OPEN ITEM
  H to the owner, whether those records may be annotated. The cost of that
  ruling is now two broken pointers rather than one.
Task 4: review dispatched.

Task 4: fix round 1 at 64c1719. Suite observed 2753/0 across 263 files;
  selftest 10 controls, every one moved or fired; sabotage on wire_hits()
  re-driven and reverted clean.
Task 4: I-1 corrected AT THE RIGHT LAYER. It verified the outlier already
  imports the shared reader and that cedd922 predates this task's own
  starting commit, then replaced the false cause with the true ones - no
  X-crossing/T-meeting split, single-sheet argument only, mil-rounding in
  place of kicad_sheet.TOL. It also checked dfa964e's commit message itself
  and found the same overstatement in substance though not in the exact
  words I quoted, and said so rather than letting my phrasing stand.
Task 4: I WAS WRONG ABOUT WHY THE COMMIT COULD NOT BE FIXED, AND IT CAUGHT
  ME. I wrote that dfa964e "cannot be rewritten now that it is pushed".
  Verified: origin was at 06d6776 and dfa964e was UNPUSHED. The instruction
  I gave - acknowledge rather than rewrite - was still right, because this
  project does not rewrite commits and because a correction that preserves
  the error is worth more than one that erases it. But the REASON I gave was
  false, and the implementer flagged it instead of silently correcting it in
  its head, which is what the standing argue-rather-than-comply clause asks
  for. Second time this plan that clause has caught me.
Task 4: THE LINEAGE DOUBT WAS WELL FOUNDED AND ITS OWN ACCOUNT WAS WRONG
  TWICE. Re-derived from each file's Adapted-from line plus git log
  --diff-filter=A on exact paths - and it noted that --follow gave a
  FALSE-POSITIVE shared root on the first attempt, which is a measurement
  trap worth having in the record. Corrections: low-cut-full-run is the
  upstream ROOT that hi-boost-full-run adapted from, not a side branch off
  it - the direction was reversed; and hi-cut-full-run descends from
  hi-boost-hairpin-fix, not directly from hi-boost-full-run. The corrected
  chain is now in crop.py's docstring as citation-plus-date evidence rather
  than assertion.
Task 4: I-2 half resolved itself - center.py's ink_extent.py finding was
  ALREADY committed beside the code in dfa964e. crop.py's phantom --dpi flag
  is now in its docstring, with the additional measurement that NONE of the
  five ancestors mentions dpi in any form: the flag was never real anywhere
  in the lineage, written into a usage line and never wired to an argument.
Task 4: M-2 resolved with a found artifact - count_crossings.py exists at
  docs/research/2026-10-29-trial-microsoft-schgen/scripts/, a regex-only
  counter with no kicad_sheet import, in a directory lying-checks.md itself
  calls dead. Named in crossings.py's docstring with why it was never a
  candidate.

Task 4: re-review ALL ADDRESSED, no new breakage. It verified the three
  replacement reasons AGAINST THE OUTLIER FILE rather than against the
  docstring - single undivided interior-crossing count, one positional arg,
  own MM constant never referencing TOL - which is the check that would have
  caught a corrected cause that was also wrong.
Task 4: THE --follow TRAP DID NOT REPRODUCE. The implementer reported that
  git log --follow gave a false-positive shared root on a first attempt. The
  reviewer ran --follow, --follow -M and --follow -C on ALL SIX crop.py
  paths and every run matched the true Adapted-from chain exactly; the one
  real failure mode it found is that --follow with multiple pathspecs hard
  errors, which is a plausible source of the confusion but is an error, not
  a misleading result.
  NO ACTION: the claim lives only in the gitignored report and was NEVER
  written into the committed docstring, which says only that the lineage was
  checked against each file's Adapted-from line and first-commit date. So
  there is no false cause in any committed artifact. Recorded because a
  claimed measurement trap that does not reproduce is itself the shape this
  branch keeps finding, and the next reader of that report should know.
Task 4: AND THE REVIEWER DECLARED A GAP IN ITS OWN EVIDENCE RATHER THAN
  PAPERING OVER IT. Sandbox policy blocked it from running the selftest
  against a sabotaged wire_hits(), so it restored from backup, proved the
  restore byte-clean, and said plainly that it was relying on two prior
  independent runs for that one observation instead of claiming it re-ran.
  That is the ran-versus-reasoned split doing its job.
Task 4: independent lineage re-derivation matched the corrected chain
  exactly, dates and citations both.
Task 4: complete. Commit range 06d6776..64c1719.

Task 5: DONE at 7505225. make -C boards/pultec-hi-cut draw runs end to end,
  exit 0: copperhead draft, kicad-cli render, the three promoted measurement
  scripts, crops. tests/draught/ 24 to 30; full suite OBSERVED 2759/0 across
  264 files; five drafted digests unchanged; protected-path diff empty.
Task 5: the comparison was done PROPERLY and the answer is useful. The fresh
  draft does not match the committed page - 67478 vs 59404 bytes, A4 vs
  USLetter - and rather than hand-waving it, the implementer ran netcmp.py
  WITH ITS OWN POSITIVE CONTROL and established the net partition is
  ELECTRICALLY IDENTICAL, 15 nets, differing only in label scoping. The
  explanation holds: the committed page went through akcli repairs, field
  restating and a re-paper pass, and make draw never calls akcli.
Task 5: FINDING I MEASURED MYSELF, AND IT IS A REAL ONE. All five approved
  pages are (paper "USLetter"). make draw produces (paper "A4"). Nothing
  in draw.ts sets paper at all - copperhead chose it, and the draft's own
  line says "sheet fit: A4 ... compaction failed".
  THIS REINTRODUCES WHAT THE OWNER EXPLICITLY CORRECTED on 2026-10-30: "I
  don't have an A3-capable printer. I live in california and have a printer
  capable of printing US letter 8.5x11". Every page in drafted/ was
  re-papered or re-drawn to Letter because of that, and four of them needed
  re-approval as a consequence.
  Ruling: THE VERB DRAFTS TO US LETTER. CLAUDE.md is explicit that a first
  solution which technically works but leaves a person doing fiddly remedial
  work is a failure rather than a delivery, and a verb whose every output
  needs a manual re-paper is exactly that. If copperhead cannot be told the
  paper size, the verb sets it after drafting and says so; if it can, pass
  it. Either way the test pins USLetter.
  Cost if wrong: a paper argument nobody needed, which is cheap next to
  every future run starting on the wrong sheet.
Task 5: TWO LIMITS THE IMPLEMENTER DISCLOSED, both honest and both worth
  carrying rather than burying. Only pultec-hi-cut has a COMMITTED_INTENT
  entry - the other four refuse by name rather than guess which research-run
  intent is theirs, which is the right default. And the measurement run
  covers only the three promoted scripts usable on one unrepaired sheet;
  boxgeom, colour_check, pwr_survey and pixeldiff either compare two states
  or need a judgement-derived table the verb does not have.
Task 5: review dispatched.

Task 5: fix round 1 at 88c1f90. tests/draught/ 30 to 33; full suite
  OBSERVED 2762/0 across 264 files; paper line checked IN THE WRITTEN FILE -
  (paper "USLetter") at line 6; make -C boards/pultec-hi-cut check 7/0;
  five drafted digests unchanged.

COPPERHEAD CANNOT DRAFT TO US LETTER. THIS IS A DURABLE FACT ABOUT THE TOOL
THIS WHOLE PRACTICE DEPENDS ON, AND IT MUST REACH TASKS 6 AND 7.
  The reviewer handed the implementer a mechanism - set hints.paper =
  "USLetter" on the intent - and the implementer REPRODUCED IT FIRST and
  found copperhead answers: paper hint "USLetter" is not a standard size;
  deriving paper from content. It drafts A4 regardless.
  VERIFIED BY ME INDEPENDENTLY: engine.ts:219's PAPERS table, the one the
  draft engine's sizing actually checks a hint against, holds ONLY A5 A4 A3
  A2 A1 A0. USLetter appears ZERO times in engine.ts. The PAPER_SIZES table
  that knows USLetter is in legibility.ts and is read by the legibility
  checker, a different consumer entirely.
  CONSEQUENCE: every page this practice produces must be re-papered AFTER
  drafting, for as long as upstream stays this way. That is not a quirk of
  one board - it is why all five approved pages needed a re-paper pass, and
  it will be true of every future one.
Task 5: AND THIS IS CLAUDE.md's CRITERION-VERSUS-MECHANISM RULE WORKING
  EXACTLY AS WRITTEN. The rule says the criterion is the settlement and the
  mechanism is advice from someone who had not yet tried it, and that a
  deviation is RECORDED when the mechanism turns out wrong. The criterion -
  output must be USLetter - stood. The mechanism failed. The implementer
  measured before using it, deviated, and said so. I passed that mechanism
  on in my own dispatch as though it were settled, so the rule caught me
  relaying a reviewer's untested guess.
  What it used instead is the technique this project had ALREADY measured
  for the other four boards - docs/research/2026-10-30-letter-repaper.md -
  a post-draft rewrite of the paper token, refusing rather than guessing if
  that token is not exactly one match, with fit measured by a new promoted
  script paper_fit.py carrying BOTH a positive control (the committed page,
  matching its own RECORD.md extent exactly) and a negative one (a wire
  moved to x=999, reports fits:false). It never withholds on overflow - an
  overflow is a finding, not a section-3 ground.
Task 5: M-1 resolved by splitting 557 lines into draw.ts 288 orchestration,
  draw-draft.ts 274, draw-render.ts 204, with NO comment shortened to get
  under the ceiling - which is what I asked for, since the rationale is the
  valuable part.
Task 5: scoped re-review dispatched.

Task 5: fix round 2 at dbb7e4c. fits/overflow/unmeasured is now a
  three-valued FitStatus with a PERMANENT TEST FOR EACH, not just the two
  the review drove by hand. Sabotage driven: made the unmeasured branch
  return overflow with the old wording, watched the new test fail with
  Expected unmeasured / Received overflow, reverted, grepped the sabotage
  string away. Suite OBSERVED 2763/0 across 264 files.
Task 5: I VERIFIED THIS ROUND MYSELF RATHER THAN SPENDING A REVIEW CYCLE -
  proportionate to a small fix whose shape the previous reviewer had already
  specified exactly. Checked directly: all three fitStatus values carry
  tests, the unmeasured path says could-not-be-determined and explicitly
  not-a-finding-about-the-board, typecheck clean, tests/draught/ 34 pass 0
  fail. A fourth review agent on a three-line enum split would have been
  ceremony rather than scrutiny.
Task 5: complete. Commit range 64c1719..dbb7e4c.

FOR TASKS 6 AND 7, THE THREE THINGS THEY MUST CARRY:
  1. COPPERHEAD CANNOT DRAFT TO US LETTER. engine.ts:219's PAPERS table
     holds only A5-A0; USLetter appears zero times in that file; the table
     that knows it is legibility.ts's, a different consumer. Verified by me.
     Every page must be re-papered AFTER drafting, and make draw now does
     that itself. An agent who does not know this will write draft-to-Letter
     and silently get A4.
  2. TOOLING.md CONTRADICTS ITSELF across one blank line - the accepted-risk
     paragraph against the untouched NEITHER TOOL IS PINNED heading below
     it, false on both counts since Task 1.
  3. TOOLING.md AND THREE RECORD.md FILES name docs/research/lib/, which
     Task 4 moved away. The RECORD.md half is frozen by my ruling and is
     open item H to the owner; the TOOLING.md half is Task 7's to fix.

Task 6: DONE at 53b7a7e. SKILL.md plus one README row. Documentation only,
  no code touched. Forbidden-vocabulary grep over its own skill document:
  NO HITS - which is the gate that matters most on this task, since a skill
  telling an agent how to draw is exactly where a smuggled criterion lives.
Task 6: A FLAKY FULL-SUITE RUN, REPORTED HONESTLY RATHER THAN BURIED. Run 1
  gave 2762 pass / 1 FAIL; run 2 gave 2763 / 0 with no (fail) marker
  anywhere in the log. Its diff is documentation-only, so it declined to
  attribute the flake to its own change and named SPICE convergence
  warnings sitting nearby as PLAUSIBLE rather than established.
  THIS MATTERS BEYOND ONE TASK. Every task on this plan has been gated on an
  observed full-suite line, and I have been treating that number as
  dispositive. A suite that can report one failure and then not reproduce it
  means those observations are weaker than I have been reading them - not
  wrong, but not the proof I took them for. Carried to the review to try to
  reproduce; if it recurs, it is a defect in the suite and not in any task.
Task 6: THE TOOLING.md CONTRADICTION LIST FOR TASK 7 IS NOW FOUR, and two
  are ones I did not know:
  1. the pinning self-contradiction across one blank line - accepted-risk
     paragraph against the NEITHER TOOL IS PINNED heading at line 135.
  2. line 392 names docs/research/lib/kicad_sheet.py, a directory Task 4
     moved; the promoted path is draughting/measure/kicad_sheet.py.
  3. TOOLING.md NEVER MENTIONS make draw, and mentions make draught-doctor
     once as an aside inside the install discussion, never in The loop
     itself - so a reader following the reference procedure literally will
     hand-run the commands Task 5 spent a whole task wrapping.
  4. TOOLING.md NEVER MENTIONS THE US LETTER RE-PAPER AT ALL - grep for
     usletter or repaper is empty. The single most consequential limitation
     of the toolchain has no footprint in the reference procedure; it lives
     only in module comments and, as of this commit, the skill.
  Item 4 is the sharpest: the reference document is silent on the one fact
  that silently turns every future draft into the wrong paper size.

Task 6: review PASS on both verdicts. NO Critical, NO Important, two Minors
  that are both non-defects (deliberate redundancy traceable to a quoted
  owner line, and an omission the brief did not ask for).
Task 6: NO SMUGGLED CRITERION, and the reviewer earned that answer. It went
  past the crude forbidden-vocabulary grep - zero hits - and hunted hedge
  phrasing: aim for, ideally, should be, cleaner, simpler, noise, crowd,
  messy. Two incidental hits, both scrutinised and both legitimate:
  copperhead's PRETTY-printed block form, a serialisation term, and symbol
  and pin count SHOULD BE unchanged by a repair, an invariant on a
  measurement. The sentence it pushed hardest on turns out lifted
  near-verbatim from TOOLING.md:295, so it restates licensed procedure
  rather than authoring a criterion. That is the check I most wanted done
  properly on this task and it was done properly.
Task 6: all four TOOLING.md contradictions INDEPENDENTLY CONFIRMED ON DISK,
  so Task 7 inherits a verified worklist rather than a hunt. It also found
  a fifth thing in passing: three stale copies of junction_audit.py still
  sit under docs/research/<run>/scripts/.
Task 6: complete. Commit range dbb7e4c..53b7a7e.

THE FLAKE, STATED AS WHAT IT ACTUALLY IS: 1 FAILURE IN 3 RUNS, AND THE
FAILING TEST'S IDENTITY IS LOST.
  The reviewer managed one clean run of its own, not the two I asked for,
  and said so rather than padding it. Nobody has reproduced the failure and
  nobody captured which test it was - it was truncated away by a tail -40
  on the only run that saw it.
  THE DIAGNOSIS IS ABOUT CAPTURE, NOT ABOUT THE SUITE. The identity was
  lost to how the log was taken. Every full-suite gate on this plan has
  been read through a tail, which is fine when the line says 0 fail and
  useless the one time it does not.
  Ruling: Task 7 runs the full suite TWICE with the WHOLE LOG KEPT, no
  tail, and quotes both lines plus any (fail) line in full. That makes runs
  4 and 5 without a concurrent second suite - and concurrent bun test runs
  are the suspected cause of the one segfault this branch has seen, so
  serialising it through the last task is the cheap way to get the data.

Task 7: DONE at 51f4ad1. TOOLING.md plus a new docs/research/README.md.
  It handled all four inherited contradictions and found a FIFTH itself: a
  SECOND, separate copy of the same nothing-is-pinned claim under "What
  this procedure does not cover", which would have contradicted the fix
  had it been left. Both struck rather than deleted. make draught-doctor
  and make draw are now in The loop, the stale script paths are repointed,
  and a new step 2.5 Re-paper to US Letter sits between Draft and Render -
  so the reference procedure finally states the limitation that silently
  turns every draft into the wrong paper size.
  It also wrote docs/research/README.md for the ~47 frozen scripts that now
  ImportError, flagging the placement as a judgement call rather than
  making it silently.

THE FLAKE IS SETTLED, AND THE DIAGNOSIS WAS ABOUT CAPTURE.
  Runs 4 and 5 kept the whole log, and the failures were immediately
  legible: BOTH in tests/draught/draw.test.ts, BOTH timeouts at bun's
  default 5000ms, on the two tests that shell out to copperhead, kicad-cli
  and python3. The file runs in 24s alone; under full-suite parallel load
  those two cross 5s. Not an assertion failure - A TEST LYING ABOUT THE
  CODE.
  I fixed it myself rather than spending a ninth agent on a two-token
  change: 60_000, which is this repository's own figure for a real-tool
  test - ELEVEN existing uses, checked before picking it rather than
  chosen for this file.
  EVIDENCE BEFORE: failures in 2 of 5 runs. AFTER: three consecutive full
  runs, 2763 pass / 0 fail / 264 files, zero (fail) lines in any of the
  three logs. Committed at 3ddda30.
  THE REAL LESSON IS NOT THE TIMEOUT. Every full-suite gate on this plan
  was read through a tail -40, which is fine on a run that says 0 fail and
  useless on the one that does not - the first failure's identity was
  truncated away and never recovered. Five runs to see a defect that one
  untruncated log explained instantly.
Task 7: complete. Commit range 53b7a7e..3ddda30.

ALL SEVEN TASKS COMPLETE. Plan range 0684fdb..3ddda30: 21 commits, 53
  files, +4,464 / -52. Final whole-branch review next.
