# Final fix pass - institutionalise-draughting

**A DRAWING EXISTS FROM THIS PASS AND IT GOES FIRST (`EVALUATING-DRAWINGS.md`
§4).** `make -C boards/pultec-hi-cut draw` was run as a gate and wrote a render:

    build/draw/pultec-hi-cut/crops/pultec-hi-cut-whole-page.png
    build/draw/pultec-hi-cut/pultec-hi-cut.pdf
    build/draw/pultec-hi-cut/pultec-hi-cut.svg

**I make no statement about that page and I am not a qualified reviewer of it.**
It is a mechanical re-draft of `pultec-hi-cut`'s committed intent, the same
artifact the reviewer's own gate run produced. It is named here before anything
else in this document because that is the ordering the rule requires; this
report cannot attach an image, so the path is the whole of what I can hand over.
Nothing under `drafted/` was written or read-modified.

**Status: every named fix done except I-7, which was reserved to the
dispatcher.** 11 commits, `3ddda30..78c4048`, 24 files, +922/-107. Tree clean,
nothing pushed.

---

## Commits, in order

| sha | finding | what |
| --- | --- | --- |
| `d5362e9` | **C-1** | seven `mkdtemp` sites in `tests/draught/draw.test.ts` moved from a repo-root `build/` to `os.tmpdir()` |
| `e800470` | **I-1** | `howToFix` prints `npm ci`; three test assertions re-pinned; `TOOLING.md`'s reproduction block corrected |
| `8ca1283` | **I-2** | `make draw` added to both help texts; the guard rebuilt from a verb list with a parity test |
| `c8f1a19` | **I-5** | copperhead invoked through the checkout's own pinned `tsx`; lock probe, three checks, `TOOLING.md`'s tsx row |
| `b695fdd` | **I-3** | `numpy`/`pillow` pinned in the lock, installed by `install.sh`, three checks |
| `dcd5747` | **I-4**, **M-8** | the README's `bun test` prerequisite claim corrected from measurement; Node/npm listed |
| `267efa9` | **M-3**, **M-5**, **M-7** | fit verdict asks for both tokens; two tests stop asserting a particular finding / throwing `EISDIR` |
| `df32dd6` | **M-6** | a second directory with a vendored basename now fails a check |
| `47d351e` | **M-2**, **M-1** | four promoted scripts refuse by name and are driven; the selftest deviation recorded |
| `631a5a9` | **M-4** | `SKILL.md` stops claiming it restates nothing; `"unusable"` attributed to `TOOLING.md` |
| `78c4048` | **C-1 follow-up** | the new module comment named the scratch call in prose, which the full suite caught |

---

## Gates - observed, never predicted

| gate | observed |
| --- | --- |
| `bun test`, run alone, whole log kept, no `tail`, **started with `build/` absent** | **2776 pass / 0 fail / 264 files, 38714 expect() calls, 134.82s, exit 0.** Log is 61 lines; zero `(fail)` markers. The one `ENOENT` line in it is `verbs.test.ts`'s own deliberate nonexistent-binary fixture, present in the pre-fix baseline too |
| `bun run typecheck` | **exit 0**, no output |
| `bun test tests/draught/` | **46 pass / 0 fail / 5 files** (was 10 tests in `draw.test.ts` and 21 across the directory before) |
| `make draught-doctor` | **exit 0**, akcli-doctor advisory section then `every tool pinned in draughting/tools.lock.json matches` |
| `make -C boards/pultec-hi-cut draw` | **exit 0**, 132 lines; `fits: yes`, 8 true crossings, 0 orphan junctions, `(paper "USLetter")` |
| five `drafted/**/RECORD.md` sha256 bindings | **all five MATCH** the sheets on disk (hi-boost, hi-cut, low-boost, low-cut, mid), recomputed over raw bytes |
| protected-path diff `3ddda30..HEAD` over `drafted/`, `docs/schematic/verdicts.md`, `schematic/readability-baselines.json`, `docs/superpowers/plans/` | **0 bytes. EMPTY** |
| control-byte scan, Python, raw bytes, canary | canary fired (NUL, CR, DEL built with `chr()`); **24 changed files scanned, 0 stray control bytes** |
| forbidden-vocabulary scan over added lines, canary | canary fired (4 hits); **10 hits across 922 added lines, every one about a machine, a command, a refusal message or a resolution strategy. None about a drawing** |
| `CLAUDE.md` at HEAD vs working tree | identical, md5 `b5fbda4ae0c7554492f78c30ec56da88`, 40362 bytes both - no drift either way |
| `docs/known-gaps.md` | **not touched.** Nothing added to it |

**C-1's own gate:** `build/` was moved aside entirely and the FULL suite run
from an absent `build/` - that is the 2776/0 figure above, not a separate
smaller run. `build/` was then restored from the aside copy.

---

## I-5: my verdict on the review's diagnosis

**The diagnosis is half wrong, and the half that is wrong is the half a fixer
would act on.**

The review said the cause is *"this branch's own choice to pass an absolute
script path with no `cwd`"*, and offered the fix as *"invoke
`<copperheadDir>/node_modules/.bin/tsx` (or set `cwd` to the checkout)"*.

**The absolute script path is not causal.** `npx` resolves the COMMAND before
`tsx` ever sees its arguments. Measured, with the absolute `src/cli.ts`
argument held **identical** in both runs and `cwd` the only variable:

    cwd = repository root         npx tsx --version <abs cli path>  ->  4.23.15
    cwd = draughting/copperhead   npx tsx --version <abs cli path>  ->  4.23.1

and the same split with no script argument at all. So **the missing `cwd` is
the whole cause**; the absolute path is what makes running from outside the
checkout possible, not what breaks the pin. The two parts of the review's
"(or)" are not equivalent: removing the absolute path and leaving `cwd` unset
would have changed nothing.

Everything else in I-5 reproduced exactly: 4.23.15 from `npx`, 4.23.1 in the
checkout, 4.19.3 on `PATH`; copperhead's `package.json` asks `^4.19.3` while its
`package-lock.json` names `4.23.1`, which is also I-1's argument in miniature.

**I took the binary-resolution fix rather than `cwd`, and that is a preference
and not a coin-flip:** it is independent of where anything is run from, so
there is no per-call-site option to forget, and it preserves the deliberate
property that nothing in `draw-draft.ts` or `toolchain.ts` changes a working
directory.

**I did not pin `tsx` in `tools.lock.json`.** The review offered that or
striking the claim. A `tsx` version in our lock would be a second place for a
fact copperhead's own `package-lock.json` already holds - ruling R1 / G308, the
same argument `install.sh`'s header makes about install locations. Instead the
test reads the version out of copperhead's own lock and asserts the resolved
binary reports it, and `TOOLING.md`'s row now says where it comes from.

---

## What I drove, and what driving found

Every control was driven by introducing the fault its own comment names,
watching it fail, and reverting byte-clean (md5 compared before and after in
each case).

| control | perturbation | result |
| --- | --- | --- |
| C-1 | one site re-pointed at `build/`, with `build/` absent | `ENOENT`, 1 fail by name |
| I-1 | both `howToFix` branches back to `npm install` | 3 fails by name |
| I-2 | `make draw` renamed in both help texts | both help tests fail, naming `draw` |
| I-2 parity | a synthetic `.PHONY` verb added to `perfboard.mk` | parity test fails |
| I-5 probe | probe reverted to the lock's own runner token | argv test fails |
| I-5 call site | `draftWithCopperhead` reverted to `npx` | static test fails |
| I-3 lock | `numpy` pinned to `0.0.1` | `draught-doctor` reports it with a runnable repair |
| I-3 install | `numpy` uninstalled from the venv | `framegeom.py --help` test fails; doctor reports `found nothing` with the bootstrap command |
| I-3 drift guard | `numpy`'s version dropped from `install.sh` | guard fails, naming `numpy: numpy==2.5.4` |
| M-3 | `fitStatusFromReport` back to the two-way decision | 3-case unit test fails |
| M-6 | an intent-to-add file under `docs/copperhead/` | fails, naming `copperhead: also at docs/copperhead` |
| M-2 | `center.py` back to `__doc__...splitlines()[5]` | its case fails |
| M-7 | driven on the MECHANISM in a scratch tree, not by writing under `drafted/` | old shape throws `EISDIR`; new shape lists both files |

**Driving the controls found three things I would otherwise have shipped:**

1. **A check that could not fail (I-2).** My first version of the help guard
   asked `output.includes(verb)`. Renaming the `make draw` line to `make DRAWX`
   did **not** fail it - the `draught-doctor` entry two lines above says *"the
   pinned **draw**ing toolchain"*, so `"draw"` was in the text whether the verb
   was documented or not. The guard now matches a runnable line: whitespace,
   `make`, then the verb as a whole word.

2. **A check that failed against the FIXED tree (I-5).** My first `npx` static
   guard matched any quote form including backticks, and four of the modules in
   `tools/draught/` discuss `npx` in prose - which this repository writes in
   backticks. Narrowed to the two argv quote forms, with that limit disclosed in
   the test rather than papered over.

3. **A claim about `akcli` that measurement refuted before it was committed
   (I-4).** I drafted "akcli is the one piece no `bun test` strictly needs",
   reasoning from the stub test. Removing the `akcli` console script fails **5**
   tests. The README now carries a per-piece table instead of a claim about a
   set.

---

## Things I disagree with, or that the review got slightly wrong

- **I-1 says "four assertions in `toolchain.test.ts` pin the wrong command".
  There were three** (`git show 3ddda30:tests/draught/toolchain.test.ts | grep
  -n 'npm install'` → lines 64, 105, 115). Five sites in total across two files,
  counting the two production branches. Immaterial to the fix; recorded because
  a figure quoted from a review gets re-quoted.

- **C-1 says "four tests" `mkdtemp` into `build/`. There are seven call sites**
  across six tests in that file. All seven moved.

- **I-6: your brief said two pre-existing `make check` failures and the review
  said four. The review is right, and I re-ran it rather than trusting either.**
  Exit 2, four boards, same causes: `pt2399-core` (`"delay_ic"` kind `ic` has no
  parts-list rule in `tools/bom/needs.ts`), `transistor-preamp-lab` (HC8 NOT
  HELD, `CUT_STATE UNRESOLVED` - and HC10 NOT HELD from the same cause, which
  the review did not mention), `transistor-preamp-loop` (HC8 NOT HELD, 15
  opens), `transistor-preamp-staged` (HC5 NOT HELD, C8 spans 14 against 11).
  **Nothing needed correcting: no committed document on this branch states the
  wrong count.** Every one that states it says four, by name -
  `docs/research/2026-10-30-schgen-removed.md`,
  `2026-10-30-lying-checks.md`, `2026-10-30-no-layout-withholding.md`,
  `2026-10-30-known-defects.md`, `2026-10-30-centre-and-promote.md`,
  `2026-10-30-single-document-packet.md`, `2026-10-30-delete-schgen.md`,
  `2026-10-29-mid-guide.md`, `2026-10-29-guides-with-approved-schematics.md`.
  The wrong figure existed only in the brief.

- **M-4: `"unusable"` is NOT on `EVALUATING-DRAWINGS.md` §2's forbidden list**
  (better · best · worse · good · bad · clean · readable · legible · clear ·
  tidy · wins · ugly · *I would build from this* · *this reads well*), and
  `TOOLING.md` §2 uses the same word, in quotes, while saying it defines
  nothing. So I attributed rather than substituted: the skill now makes plain
  that the word is `TOOLING.md`'s own quoted, admittedly empty criterion, not
  the skill's judgement about a page. Substituting a synonym would have hidden
  a real gap - that §2 calls this *"the largest undocumented decision in the
  loop"* - behind tidier wording.

- **I-3 widened `make draw`'s refusal surface, and I think that is worth
  putting to the owner.** Putting `numpy` and `pillow` in the lock means
  `runDraw`'s step-1 gate - which refuses on ANY lock disagreement - now stops a
  page being drawn over a library the drawing path never calls (`framegeom.py`
  is not in `MEASUREMENT_SCRIPTS`). **`qpdf` was already in that position**, so
  this is not new in kind, but it is newly two tools wider, and
  `EVALUATING-DRAWINGS.md` §3 permits withholding a drawing for an electrical
  fault and nothing else. I recorded the question beside the gate in
  `tools/cli/draw.ts` and did **not** narrow it: deciding which tools each step
  needs is acceptance criteria for the artifact this verb produces, which the
  producing agent may not author. **This is the one item I would raise.**

- **M-1 (report, not implement): I think the CODE should change, not the spec.**
  `runMeasurementSuite` runs three scripts and never `selftest.py`, against spec
  §2's *"the suite's own selftest runs first"*. The control is not lost -
  `bun test` runs it, ten controls, every one moved or fired - what is lost is
  the ordering, so `make draw` prints three measurements without first showing,
  in that same run, that the shared reader those three depend on can still tell
  a difference. **The cost of closing it is 0.27s** (`/usr/bin/time -p`), against
  the seconds this verb already spends in copperhead and `kicad-cli`, so the
  obvious excuse does not survive measurement. I did not close it because
  changing what `make draw` prints changes the artifact this verb produces. The
  deviation and that figure are recorded beside `MEASUREMENT_SCRIPTS`.

- **One unfixed stale refusal, found in passing and left alone.**
  `tools/draught/akcli-install.ts`'s unknown-platform throw said *"Set AKCLI to
  your own akcli binary's path"* - there is no `AKCLI` override; ruling R1
  removed it. I corrected that one message in the I-3 commit because I was
  editing the function anyway. I did not go looking for siblings of it.

- **`crop.py`'s usage line advertised a `--dpi N` flag it has never parsed.**
  Disclosed at promotion as an inherited discrepancy and *"not fixed here"*. M-2
  made that script REFUSE on an argument count, and a refusal quoting a usage
  line that advertises an argument the script rejects is worse than the silent
  ignoring it replaced - so I struck the flag from the usage line and amended
  the note. That is slightly beyond M-2 as written.

- **`paper_fit.py` had M-2's exact defect and is not in M-2's list.** Bare
  `IndexError` on missing argv, and it is the one of the four that `make draw`
  runs on every call. Fixed with the other three.

---

## What I did not touch

`drafted/`, `docs/schematic/verdicts.md`, `schematic/readability-baselines.json`,
`docs/superpowers/plans/` (protected diff empty, measured),
`docs/known-gaps.md` (nothing added - the register is frozen and nothing here is
an owner decision), `CLAUDE.md`, `draughting/copperhead`,
`draughting/venv-akcli` (installed into, never deleted), **I-7**.

Nothing pushed. No AI attribution in any commit message. No `sed` write, no
control-character escape typed into a tool parameter, no `#` in a heredoc, no
hook bypassed (there are no hooks: `core.hooksPath` unset, `.git/hooks` holds
only samples).

---

# Fix round 2 - controller Rulings 1 and 2

**THE DRAWING FIRST AGAIN (`EVALUATING-DRAWINGS.md` §4).** `make -C
boards/pultec-hi-cut draw` was re-run as a gate and wrote:

    build/draw/pultec-hi-cut/crops/pultec-hi-cut-whole-page.png
    build/draw/pultec-hi-cut/pultec-hi-cut.pdf
    build/draw/pultec-hi-cut/pultec-hi-cut.svg

**I make no statement about that page and I am not a qualified reviewer of
it.** Nothing under `drafted/` was written; its five digests still match.

**One commit: `7a1135b`.** Both rulings land in the same four files and hunk
staging is not available non-interactively, so they are one coherent commit
with both rulings set out in the message.

## Ruling 1 - the pre-draft gate checks the drawing path and nothing else

`runDraw` refused on any disagreement in the whole lock. It now refuses only
on the tools the drawing path spawns and reports the rest beside the page.

**What counts as the drawing path is declared by the modules that spawn the
tools**, not by a list in `draw.ts`: `DRAFT_TOOLS` in
`tools/draught/draw-draft.ts` (`copperhead`) and `RENDER_TOOLS` in
`tools/draught/draw-render.ts` (`kicad-cli`, `magick`), each sitting beside
its own `spawnSync`, unioned into `DRAWING_PATH_TOOLS`. Establishing that set
was a measurement, not a reading of the brief: `git grep` over the three
drawing-path modules finds `defaultCopperheadTsx`, `defaultKicadCli` and
`defaultMagick` called, and `defaultAkcli`, `defaultQpdf` and
`defaultAkcliVenvPython` called nowhere. **`akcli` therefore came out of the
gate too** - this verb never calls it, by design and by its own scope
disclosure - which the ruling's wording requires and its examples did not
name. `qpdf`'s pre-existing case fell out of the same change, as instructed.

**The advisory is threaded through every later refusal, not only the success
path.** It is produced at step 1, before four other refusal grounds; dropping
it on those paths would make a check that ran and found something look like
one that found nothing. `refusal()` takes it as a second parameter and its
own comment says why.

## Ruling 2 - the selftest runs first

`runMeasurementSuite` now runs `selftest.py` before the three measurements,
with no sheet argument (it perturbs its own committed fixtures - measured: it
ignores argv entirely, so a path would have been meaningless rather than
harmful). A failure is a labelled section and `ok: false`, and `runDraw`'s
exit code does not move.

Observed in the gate run's own output: `selftest.py` at line 33 of 186,
`10 controls, every one moved or fired` at line 85, `crossings.py` at line 87.

## Gates - observed

| gate | observed |
| --- | --- |
| `bun test`, alone, whole log kept, no `tail` | **2778 pass / 0 fail / 264 files, 139.81s, exit 0.** Log 61 lines, zero `(fail)` markers (2776 before this round; +2 is the new advisory test and the declaration cross-check) |
| `bun run typecheck` | **exit 0** |
| `bun test tests/draught/` | **48 pass / 0 fail / 5 files** |
| `make draught-doctor` | **exit 0** - `every tool pinned in draughting/tools.lock.json matches` |
| `make -C boards/pultec-hi-cut draw` | **exit 0**, 186 lines (132 before - the selftest's own report is the difference). `fits: yes`, content x 50.800..246.380 inside frame 11.980..267.377; selftest 10 controls all moved or fired; 8 true crossings, 2 T-meetings; 0 orphan junctions; 26 labels on 13 nets; crop written |
| five `drafted/**/RECORD.md` digests | **all five MATCH** |
| protected-path diff `3ddda30..HEAD` (`drafted/`, `verdicts.md`, `readability-baselines.json`, `docs/superpowers/plans/`) | **0 bytes, EMPTY** |
| control-byte scan, Python, raw bytes, canary | canary fired (NUL, CR, DEL via `chr()`); **24 changed files, 0 stray control bytes** |
| forbidden-vocabulary scan, canary | canary fired (4 hits); **13 hits over 1244 added lines, every one about a machine, a command, a refusal or an error message. None about a drawing** |
| `CLAUDE.md` HEAD vs worktree | identical, md5 `b5fbda4ae0c7554492f78c30ec56da88` |
| `docs/known-gaps.md` | not touched (G303 is cited, nothing added) |

## What I drove - six controls, all reverted byte-clean

| control | perturbation | result |
| --- | --- | --- |
| Ruling 1, blocking | `kicad-cli` pinned to `0.0.1-ruling-1` | refuses before drafting, naming the tool and version |
| Ruling 1, advisory | the old wide gate restored (`problems` instead of `blocking`) | the advisory test fails - the non-drawing tool blocks again |
| Ruling 1, reporting | the advisory suppressed while the gate stays narrow | the same test fails on the REPORTING half while the draft still succeeds - the fix's own wrong shape, a finding dropped silently |
| Ruling 2, ordering | `selftest.py` moved last | ordering assertion fails: *"selftest.py must be reported before crossings.py"* |
| Ruling 2, presence | the selftest call removed | the same test fails |
| declaration, over-declared | `akcli` added to `RENDER_TOOLS` | *"akcli: declared as a drawing-path tool but defaultAkcli() is never called"* |
| declaration, under-declared | `magick` dropped from `RENDER_TOOLS` | *"magick: the draw path calls defaultMagick() but does not declare it"* |

`tools/cli/draw.ts`, `tools/draught/draw-render.ts` and
`tools/draught/draw-draft.ts` were md5-compared before and after every
perturbation and are byte-identical.

**The declaration cross-check strips comments before scanning**, because
those three modules name `akcli`, `numpy` and `pillow` at length in prose
precisely to say they are NOT used - which is the same trap that made the
first `make help` guard and the first `npx` guard unsound in round 1. Scanning
the raw text would have let the prose satisfy the check.

## Disagreements

**None with either ruling.** Two notes:

- **Ruling 1's wording reaches further than its examples**, and I followed the
  wording. It names `numpy`, `pillow` and `qpdf`; applying *"the tools the
  drawing path uses, and nothing else"* also removes **`akcli`** from the
  gate, because `make draw` never calls it. That is the larger behavioural
  change in this commit and it is the one not spelled out in the brief, so it
  is flagged here rather than buried: a machine with a broken or absent
  `akcli` can now draft a page, and `make draught-doctor` is where that still
  refuses.
- **The advisory is lost in one case I chose not to chase.** `make draw`
  prints it, and every refusal after step 1 carries it - but a refusal at step
  1 itself (a blocking tool disagrees) returns only the blocking report, so an
  advisory alongside it is not shown. Leaving it: the output a person reads in
  that case is "copperhead disagrees with the lock, here is the command", and
  `make draught-doctor` - which that message's repair path leads to - reports
  every tool anyway. Recorded because I noticed it rather than because I
  tested it.
