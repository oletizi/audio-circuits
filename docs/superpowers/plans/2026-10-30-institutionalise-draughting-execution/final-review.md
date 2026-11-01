# Final whole-branch review - institutionalise-draughting

**Range reviewed:** `0684fdb..3ddda30` on `feature/schematics-tooling`, 21
commits, 53 added/modified/renamed paths. Reviewed 2026-11-01 by an agent that
did not write any of it.

**Verdict: FINISHABLE WITH NAMED FIXES.** One Critical, seven Important, eight
Minor. Nothing found contradicts the spec's design; what is broken is the
"works from a clean checkout" claim, and three facts that now disagree with
each other across the seven pieces.

**I looked at no drawing and this review makes no statement about any page.**
`make draw`'s output under `build/draw/pultec-hi-cut/` was produced and its
existence checked; the PNG was not opened and is not assessed here.

---

## Gates - what they actually say

Every line below was RUN. See the ran-versus-reasoned split at the end for what
was not.

| gate | result |
| --- | --- |
| `bun test` (alone, whole log kept, no `tail`) | **2763 pass / 0 fail / 264 files, 144.72s**, 38671 expect() calls. Log is 60 lines total; zero `(fail)` markers. Matches the expected figure exactly. |
| `bun run typecheck` | **exit 0** (`tsc --noEmit`, no output). |
| `make draught-doctor` | **exit 0.** Prints the akcli-doctor ADVISORY section (python 3.14.6, akcli 0.22.0, schemas, kicad-cli, ngspice, symbols, workspace all `ok`; `config` `MISSING` with its own "optional" hint) then `every tool pinned in draughting/tools.lock.json matches`. |
| `make -C boards/pultec-hi-cut draw` | **exit 0.** Drafted 6 groups / 77 wire segments / 26 labels on A4, re-papered `(paper "A4")` → `(paper "USLetter")`, `fits: yes` (content x 50.800..246.380 inside frame 11.980..267.377), PDF + SVG + whole-page PNG written under `build/draw/pultec-hi-cut/`, and all three measurement scripts ran (8 true crossings, 2 T-meetings, 0 orphan junctions, 26 labels on 13 nets). |
| `make check` | **exit 2. FOUR boards fail, not two** - see I-6. |
| `git diff 0684fdb..HEAD -- drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json` | **empty.** |
| five `drafted/**/RECORD.md` sha256 digests | **all five MATCH** the sheets on disk (hi-boost, hi-cut, low-boost, low-cut, mid), recomputed with sha256 over the raw bytes. |
| control-byte scan (Python, raw bytes, canary) | canary fired (3 hits: NUL, CR, DEL, built with `chr()`); **53 added/modified text files scanned, 0 stray control bytes.** |
| forbidden-vocabulary scan over added lines (canary) | canary fired (4 hits); **11 matches across the branch, every one about a check, a path or a command** (`a clean pass`, `worse than no check`, `best-effort path`, `a literal default good on only one platform`). **None about a drawing.** |
| `git status` after every run above | clean; `build/` is gitignored. |

---

## 1. Does the whole thing work end to end, from nothing?

**On this machine, yes, as a sequence** - `make draught-doctor` then
`make -C boards/pultec-hi-cut draw` both run clean, in that order, and produce
a drafted, re-papered, rendered, measured page. **From a genuinely clean
checkout on a clean machine, no**, for four separate reasons, two of which are
new defects and two of which are undisclosed prerequisites.

`draughting/install.sh` reads well as a first-time runner: it is executable
(mode 100755 in git), refuses by name at every step, explains why `npm ci`
rather than `npm install`, and is safe to re-run. **Nothing in the repository
ever executes it** - `tests/draught/install-script.test.ts` only text-matches
its source against the lock - so the first link of the chain is the one link no
check covers. Plan Task 3 Step 4 ("run the script into a scratch location")
cannot be discharged as written, because R1 deliberately removed any location
override; the task-3 report says so.

What the chain depends on that only exists because earlier work ran here:

- **`build/` must already exist** (C-1).
- **copperhead must already be installed** (I-4) - `runDraw` refuses on any
  lock disagreement, and two tests drive a real draw expecting exit 0.
- **`npx`'s cache or the network** must supply `tsx` (I-5), and the `tsx` it
  supplies is not the pinned one.
- **numpy and Pillow** must already be present for one promoted measurement
  script (I-3); on this machine they are present in neither the akcli venv nor
  system python3, so that script is unrunnable right now.

---

## 2. Do the seven pieces agree with each other?

Three disagreements found, all between a committed artifact and another
committed artifact (not between a document and the ledger): the `npm ci` /
`npm install` split (I-1), `make help` versus `TOOLING.md`/the skill (I-2), and
`install.sh` versus `TOOLING.md`'s reproduction block on numpy/Pillow (I-3).
The lockfile and the install script themselves agree (the commit and the pypi
spec are byte-identical, and a test pins that). `tools.lock.json`'s five
versions agree with `TOOLING.md`'s table for copperhead, akcli, kicad-cli and
ImageMagick; the table's **tsx** row is the one that is now false (I-5).
`SKILL.md` and `TOOLING.md` agree on the loop order, the three measurement
scripts, the `COMMITTED_INTENT` refusal and the US-Letter mechanism - checked
line by line against `tools/cli/draw.ts` and `tools/draught/draw-render.ts`
rather than against each other.

---

## 3. The defect classes - the sweep for an eleventh

- **A check that cannot fail:** none found. The added tests are genuinely
  falsifiable. `toolchain.test.ts` compares every `how` string against the live
  resolver's own return value rather than a literal; `doctor.test.ts`'s
  fix-round-2 pair asserts the exact sentence `qualifyPassForAdvisoryFailure`
  adds and explicitly reasons about which assertion would survive an unfixed
  implementation; `draw.test.ts`'s overflow control corrupts an `(xy ...)` point
  **after** the first `(wire` token precisely because a `lib_symbols` point
  would not move the measured number; `not-source.test.ts` asserts its own list
  is non-empty before asserting anything over it. `measure-suite.test.ts` is
  thin but delegates to `selftest.py`, which ran and reported 10 controls, every
  one moved or fired.
- **A control whose perturbation does not land:** none found.
- **A fix carrying the defect it repaired one branch over: FOUND TWICE.** I-1
  (`npm ci` won in `install.sh` and `npm install` survived in the repair command
  `draught-doctor` prints, with a test pinning it) and I-2 (`make help`
  registration was Task 2's own fix-round finding, and the sibling verb added in
  Task 5 never got it).
- **A false stated cause:** I-4 (`README.md`: "Neither is required for
  `bun test`") and I-5 (`TOOLING.md`: tsx `4.23.1` "is what actually runs
  copperhead's CLI"). Both are statements about this branch's own machinery that
  measurement contradicts.

---

## 4. Was anything authored that should have been pointed at?

**No smuggled criterion found in `SKILL.md`.** Its closing section states that
it does not say what makes a drawing worth reading and must never be edited to;
`EVALUATING-DRAWINGS.md` is named five times and never paraphrased on the
judgement question; the §2 vocabulary is pointed at rather than reproduced
("the forbidden-vocabulary list in §2 is not repeated here - go and read it");
§4's ordering rule and §3's single withholding ground are quoted, not restated
as the skill's own. The two threshold-shaped rows in its verification table
(`zero after a collapse pass`, `a net drawn in two colours reads as two nets`)
were traced to `TOOLING.md` lines 676-677, which predate this branch - the
branch changed only the script paths in those rows. `TOOLING.md`'s new §2.5 and
toolchain sections are procedure throughout; their one evaluative claim ("a
page left on A4 ... is the wrong artifact for him to receive") rests on the
owner's own recorded words about having no A3 or A4 printer.

Two phrasings are worth naming anyway, as M-4: the skill's opening claim that it
"restates none of" the three documents it names is contradicted by its own body,
which reproduces `TOOLING.md`'s trap index, false-greens list and verification
table (the spec required it to carry them, so the duplication is sanctioned and
the sentence is what is wrong); and step 2 tells an agent to draft again "when
the first is unusable", which is a quality word about a page this project
produced, hedged in the same clause by "there is no stated criterion for
'unusable'".

---

## Findings

### Critical

**C-1. `bun test` cannot pass on a clean checkout: four tests in
`tests/draught/draw.test.ts` `mkdtempSync` into a repo-root `build/` that is
not committed and that nothing creates.**
`git ls-files build` is empty, no `mkdirSync` anywhere in `tests/`, `tools/` or
`lib/` creates it, and this is the **only** test file in the repository that
mkdtemps into `build/` rather than `os.tmpdir()` (every other one uses
`os.tmpdir()`). Measured mechanism: `fs.mkdtempSync` into a missing parent
throws `ENOENT`. So on a fresh clone the suite that is this project's primary
gate fails four tests for a reason that has nothing to do with the code under
test - the exact "a timeout failure here was a lie about the code" shape the
branch's own last commit message argues against. Fix: `fs.mkdirSync(dir, {
recursive: true })` before the four `mkdtempSync` calls, or move them to
`os.tmpdir()` like the rest of the suite.

### Important

**I-1. `howToFix` prints `npm install` as copperhead's repair while
`install.sh` refuses to use anything but `npm ci` - and a test pins the wrong
one.** `draughting/install.sh`'s own header carries the Task-3 fix-round-2 I-2
argument at length ("Pinning the commit exactly and then letting copperhead's
transitive dependency tree float on whatever `npm install` happens to resolve
pins the half of this toolchain that is easy to see"; the refusal text says
falling back to `npm install` is "not something to silently work around").
`tools/draught/toolchain.ts`'s `howToFix` emits
`... && cd <dir> && npm install` in **both** its bootstrap and upgrade
branches, `make draught-doctor` is what prints that string to a person, and
`tests/draught/toolchain.test.ts` asserts `cd ${dir} && npm install` in four
places. `TOOLING.md`'s "Reproducing it" block also still says `npm install`
directly above the new sentence claiming `install.sh` "runs the reproduction
above for you". Three statements, two answers, and the authoritative one is the
one nobody follows by hand.

**I-2. `make draw` is absent from `make help`, in both files, and the two new
help tests guard only `draught-doctor`.** RAN: `make help` from the repository
root and from `boards/pultec-hi-cut` lists `draught-doctor` and never `draw`.
This is Task 2's own fix-round I-2 finding ("the verb existed and worked but
was undiscoverable"), fixed for one verb in `make/aggregate.mk` and
`make/board.mk` and not for the verb added three tasks later - while
`TOOLING.md`, `SKILL.md` and `README.md` all instruct a reader to run it. The
task-7 report records the observation and did not fix it; that record lives only
in gitignored `.superpowers/` (see I-7).

**I-3. `install.sh` does not install numpy or Pillow, although `TOOLING.md`'s
reproduction - which the branch now says `install.sh` runs for you - installs
both into that same venv and says in bold why.** `TOOLING.md`:
`./venv-akcli/bin/pip install 'akcli-kicad==0.22.0' numpy pillow`, with
"**`numpy` and `pillow` go into the SAME venv** ... Only a docstring said so,
and the fourth board had to install them." `install.sh` installs
`akcli-kicad==0.22.0` alone. Measured: neither `draughting/venv-akcli/bin/python3`
nor system `python3` has numpy, and `python3 draughting/measure/framegeom.py
USLetter` raises `ModuleNotFoundError: No module named 'numpy'` **right now, at
HEAD**. `framegeom.py` is a promoted member of the measurement suite, is what
`paper_fit.py`'s own docstring tells you to re-run if the frame geometry is ever
in question, and is covered by no test and by no `make draw` step - so a
promoted script that cannot run on the machine that promoted it reads as
available.

**I-4. `README.md` states that copperhead and akcli are "not required for
`bun test`". For copperhead that is false.** `runDraw` checks the toolchain
first and refuses on any disagreement; `tests/draught/draw.test.ts`'s real-draw
test and its "nothing here touches drafted/" test both call `runDraw` with the
real lock and expect exit 0 / a completed draft. Without
`draughting/copperhead` at the pinned commit, `probeTool` returns `null`,
`checkToolchain` reports a problem, and those tests fail. The house convention
is the opposite of what the README says here: Chrome and qpdf are each
documented as required by `bun test` and as failing "rather than skipping".
Fix the sentence (and decide deliberately whether copperhead joins
kicad-cli/Chrome/qpdf as a stated test prerequisite - the code already says it
has).

**I-5. The pinned `tsx` is not the `tsx` that runs copperhead, the lock cannot
see it, and `TOOLING.md` asserts otherwise.** Measured, from
`boards/pultec-hi-cut`: `npx tsx --version` → **4.23.15** (npm's `_npx` cache);
`draughting/copperhead/node_modules/.bin/tsx --version` → **4.23.1**, the
version `install.sh`'s `npm ci` just pinned; `/opt/homebrew/bin/tsx` → 4.19.3.
With an empty npm cache, `npx --offline tsx --version` fails `ENOTCACHED`, so on
a clean machine the first `make draught-doctor` or `make draw` fetches an
unpinned `tsx` from the registry (or prompts). `draw-draft.ts` and
`toolchain.ts` both deliberately pass copperhead's **absolute** `src/cli.ts`
path and never set `cwd`, which is exactly what stops `npx` from finding the
checkout's own pinned `tsx` - prior runs invoked it from inside the checkout and
therefore did get 4.23.1. `tools.lock.json` has no `tsx` entry, so
`draught-doctor` cannot report this; `TOOLING.md`'s table says tsx `4.23.1` is
"what actually runs copperhead's CLI". Fix is one line: invoke
`<copperheadDir>/node_modules/.bin/tsx` (or set `cwd` to the checkout), and
either pin `tsx` in the lock or strike the claim.

**I-6. `make check` fails on FOUR boards, not the two the brief names.** RAN,
exit 2:
- `pt2399-core` - `component "delay_ic" (kind "ic") has no parts-list rule in tools/bom/needs.ts`
- `transistor-preamp-lab` - HC8 NOT HELD, `CUT_STATE UNRESOLVED` (no verdict computed)
- `transistor-preamp-loop` - HC8 NOT HELD, 15 opens
- `transistor-preamp-staged` - HC5 NOT HELD, `C8 spans 14 holes against maxSpanHoles 11`

The last two are the pre-existing pair the brief names. The first two are not
mentioned anywhere in the plan workspace. Evidence that all four predate this
branch: `git log 0684fdb..HEAD --` over each of the four board directories and
over `tools/bom/needs.ts` returns **zero commits**. The point is not that the
branch broke them - it did not - but that a finishing decision taken against
"two known failures" would be taken against a figure that is wrong by two.

**I-7. The plan's execution record is not committed, and it already holds an
unfixed finding that exists nowhere else.** `CLAUDE.md` requires a plan's
record at `docs/superpowers/plans/<plan-name>-execution/`; five sibling plans
have one (`2026-10-22-text-handling-research-execution`,
`2026-10-23-net-names-and-floating-pins-execution`,
`2026-10-27-gates-classify-execution`,
`2026-10-27-schematic-in-the-build-guide-execution`,
`2026-10-30-remove-schgen-execution`). This plan's 7 reports, 7 reviews,
rulings file and 1057-line ledger live only in gitignored `.superpowers/`. The
`make help` gap (I-2) is recorded there and nowhere in the repository; so is the
reasoning behind the `npm ci` decision that I-1 shows did not propagate. `git
clean -fdx` destroys all of it.

### Minor

**M-1.** Spec §2 says "the suite's own selftest runs first";
`runMeasurementSuite` runs `crossings.py`, `junction_audit.py` and
`label_survey.py` and never `selftest.py`. The selftest does run under
`bun test`, so the control is not lost - but the deviation from the spec
sentence is not recorded anywhere as a deviation.

**M-2.** Four of the ten promoted scripts (`framegeom.py`, `netcmp.py`,
`crop.py`, `center.py`) are exercised by no test and by no `make draw` step.
`netcmp.py` and `crop.py` raise a bare `IndexError: list index out of range`
when run with no arguments instead of naming what is missing, and `center.py`
exits 1 silently - against this project's "every `throw` names what is missing"
rule.

**M-3.** `repaperToUSLetter` decides `"fits"` versus `"overflow"` by
`fitReport.includes("fits: yes")`. Bounded today (`paper_fit.py` exits 0 only
after printing one of the two tokens, and refuses with exit 1 otherwise), but a
reworded final line in that script silently becomes a false **finding about a
board** - the same shape fix round 2 was opened to correct. Compare against
`"fits: no"` explicitly and treat neither-token as `"unmeasured"`.

**M-4.** `SKILL.md`'s opening "this skill restates none of them" is
contradicted by its own (spec-mandated) copies of `TOOLING.md`'s trap index,
false greens and verification table. Two copies of one table is the drift risk
this branch elsewhere treats as a defect; the sentence should scope itself to
`EVALUATING-DRAWINGS.md`'s criteria, which it genuinely does honour. Same
finding carries the "when the first is unusable" phrasing noted in §4.

**M-5.** `draw.test.ts`'s real-draw test asserts `result.stdout` contains
`"fits: yes"`. A future overflow is a legitimate finding and never a
withholding ground, but it would read here as a test failure.

**M-6.** `VENDORED_CHECKOUT_NAMES` is matched by bare basename, so any
directory anywhere in the tree named `copperhead` is silently skipped by the
footprint sweep, the symbol-name sweep and perfboard discovery.
`lib/not-source.ts` documents the basename choice but not this consequence.

**M-7.** The "nothing here touches drafted/" test `readFileSync`s every entry
of `drafted/pultec/pultec-hi-cut` from a non-recursive `readdirSync`; a
subdirectory added there later makes it throw `EISDIR` rather than fail
meaningfully.

**M-8.** `README.md`'s prerequisites name neither Node nor npm/npx, although
`install.sh` runs `npm ci` and both the copperhead probe and the draft step run
`npx`. `TOOLING.md`'s table carries it; the prerequisites list a reader follows
first does not.

---

## 5. What the branch leaves open - assembled, in the order a person hits it

| # | item | status |
| --- | --- | --- |
| 1 | `bun test` fails on a clean checkout - `build/` does not exist (C-1) | **new, undisclosed** |
| 2 | `draughting/install.sh` must run before `bun test`, not only before drawing (I-4) | **new, undisclosed - README says the opposite** |
| 3 | First `make draught-doctor` / `make draw` on a clean machine fetches an unpinned `tsx` over the network; the pinned 4.23.1 is never used (I-5) | **new, undisclosed** |
| 4 | numpy/Pillow are not installed, so `draughting/measure/framegeom.py` cannot run (I-3) | **new, undisclosed** |
| 5 | `make draw` is not in `make help` (I-2) | observed in the task-7 report, unfixed, recorded only in gitignored workspace |
| 6 | Only `pultec-hi-cut` has a `COMMITTED_INTENT` entry; the other four Pultec boards refuse by name | disclosed in `draw-draft.ts`, `SKILL.md` and the spec |
| 7 | `make draw` stops before the akcli repair step | disclosed by design, in three places |
| 8 | copperhead cannot draft US Letter, so every page is re-papered post-draft | disclosed, with the measurement, in `draw-draft.ts`, `TOOLING.md` §2.5 and `SKILL.md` |
| 9 | 47 frozen scripts under `docs/research/*/scripts/` raise `ImportError` | disclosed in `docs/research/README.md`; re-verified (47, and `ModuleNotFoundError` reproduced) |
| 10 | copperhead's dependency tree reports 22 vulnerabilities (3 critical) | disclosed in `TOOLING.md` - see §6 |
| 11 | `make check` fails on four boards, two of them unnamed anywhere (I-6) | **two of four undisclosed** |
| 12 | The plan's execution record is not committed (I-7) | **undisclosed** |
| 13 | Intent derivation from a `Network`, and arrangement choice having no stated method | disclosed as the spec's two open questions, repeated in the skill |
| 14 | Upstream availability of the copperhead commit and the PyPI release | disclosed and accepted, in the spec and in `TOOLING.md` |
| 15 | `install.sh` itself is executed by no check | implied by Task 3 Step 4 being undischargeable; not stated as an open item |

Items 1 and 2 are what a person hits first, and in that order: a clean clone,
`bun test`, four ENOENT failures before anything about drawing is reached.

---

## 6. Owner-facing residue

**Nothing in this branch needs his decision before it is useful.** Every item
above is work or a correction, and the two spec-level open questions (intent
derivation, arrangement method) are already recorded as his to be asked about
later, not now.

One item is worth putting in front of him as **evidence**, not as a question
invented for him: `TOOLING.md` now states that choosing the install script over
vendoring "accepted" copperhead's own dependency posture - 22 vulnerabilities,
3 of them critical, in packages this repository did not choose - and his
recorded word is `"install script"`, answering a question about how to pin
copperhead and akcli, not about their transitive tree. An agent wrote the
acceptance of the second risk on his behalf. He may well accept it; he has not
been shown it. If it is put to him, it should go with the measurement (`npm ci`
in the pinned checkout installs 61 direct and 117 funding-listed packages,
including an agent SDK) and with the alternative the spec already names
(vendoring), and his answer belongs in `docs/known-gaps.md` as an owner
decision - the one addition that file still takes.

---

## Ran versus reasoned

**RAN (measured on this machine, at HEAD):**
`bun test` alone with the whole log kept (2763/0/264, 144.72s); `bun run
typecheck` (exit 0); `make draught-doctor` (exit 0, full output read); `make -C
boards/pultec-hi-cut draw` (exit 0, full 132-line output read); `make check`
(exit 2, all four failures and their causes read); `git diff 0684fdb..HEAD --
drafted/ docs/schematic/verdicts.md schematic/readability-baselines.json`
(empty); sha256 of all five drafted sheets against their RECORD.md bindings
(five MATCH); the control-byte scan in Python over raw bytes of all 53
added/modified text files with a `chr()`-built canary (canary 3 hits, files 0
hits); the forbidden-vocabulary scan over the branch's added lines with a canary
(canary 4, 11 non-drawing hits); `make help` from the repository root and from a
board directory; `npx tsx --version` from a board directory, from the copperhead
checkout's own `node_modules/.bin`, and from `/opt/homebrew/bin`; `npx --offline
tsx --version` against an empty npm cache (ENOTCACHED); `import numpy, PIL` in
the akcli venv and in system python3 (both absent); `framegeom.py` (numpy
ModuleNotFoundError); `netcmp.py`, `crop.py`, `center.py` with no arguments;
`selftest.py` (10 controls, every one moved or fired); `python3
docs/research/2026-10-29-hi-cut-full-run/scripts/junction_audit.py`
(ModuleNotFoundError, as `docs/research/README.md` claims); `grep -rl
"docs/research/lib" docs/research --include="*.py" | wc -l` (47); `npm ci
--dry-run` inside the copperhead checkout (clean, lock and package.json agree);
`git ls-files build` (empty); `fs.mkdtempSync` into a missing parent (ENOENT);
`git log 0684fdb..HEAD` over each failing board directory and
`tools/bom/needs.ts` (zero commits each); `git ls-files -s
draughting/install.sh` (mode 100755); `git status` (clean). Read in full:
`CLAUDE.md`, `EVALUATING-DRAWINGS.md`, the spec, the plan, `SKILL.md`,
`TOOLING.md`'s changed sections, `tools.lock.json`, `install.sh`,
`toolchain.ts`, `draught.ts`, `draw.ts`, `draw-draft.ts`, `draw-render.ts`, the
three install resolvers, `lib/not-source.ts`, all five new test files,
`paper_fit.py`, `docs/research/README.md`, and the branch's diff of
`make/`, `.gitignore`, `bunfig.toml`, `tsconfig.json`, `CLAUDE.md`,
`README.md` and the four modified walkers.

**REASONED (not executed - stated as reasoning, not as measurement):**

- That `bun test` additionally fails on a clean checkout **because copperhead is
  absent** (I-4). I did not remove or rename `draughting/copperhead`. The chain
  is `runDraw` step 1 → `checkToolchain` → the branch's own passing
  "draw refuses with the toolchain report when a pinned tool is missing" test →
  the real-draw test's `expect(exitCode).toBe(0)`. Code-certain, not measured.
- That the four `make check` failures predate the branch. Evidence is the
  zero-commit `git log` over each path, not a `make check` run at `0684fdb`.
- That `draughting/install.sh` completes on a clean machine. Never executed; only
  read, plus `npm ci --dry-run` in the existing checkout.
- That a machine without Node/npm fails at `npm ci` and `npx` (M-8).
- The Linux and Windows candidates in `magick-install.ts` and
  `akcli-install.ts` - unexercised here, and disclosed as UNVERIFIED in those
  files themselves.
- `python3 -m venv`'s in-place repair of an existing venv (install.sh's re-run
  safety claim) - standard documented behaviour, not driven here, same position
  the task-3 review took.

**Not done, deliberately:** nothing under `drafted/` was written;
`draughting/copperhead` and `draughting/venv-akcli` were not deleted, renamed or
modified; no fix was applied to anything; no subagent was dispatched; no drawing
was evaluated.
