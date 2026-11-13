Tooling: how a schematic gets drawn here
========================================

**This file is the procedure and the toolchain. It is NOT the criteria.**
`EVALUATING-DRAWINGS.md` is canonical on what a drawing has to be, who may judge
one, and what an agent may say about one; it binds before anything in this file,
and nothing here may be read as permission to depart from it. **An agent may
never author the acceptance criteria for the artifact it is producing**, so a
procedure document is the only kind of drawing document an agent can write.

Read in this order before drawing anything:

1. `EVALUATING-DRAWINGS.md` - the criteria, and the principles behind them
2. `docs/schematic/verdicts.md` - the owner's verdicts on the pages he has seen,
   verbatim, with the defects he named. **The defects are the useful part**: they
   are the only statements of what he objects to that carry authority.
3. this file - the tools and the loop
4. `docs/superpowers/specs/2026-10-28-schematic-draughtsmanship-practice-design.md`
   - the design this procedure implements, and what it leaves open

---

The stance: reuse, do not invent
--------------------------------

> *"i want to reuse and glue together agent-driven tooling. i do not want to
> write software algorithms."* - the owner, 2026-10-28
>
> *"Stop inventing. Start reusing. Your job is not to write software. its to
> design and develop a solution."*

**Both halves of the loop are third-party tools.** Nothing in this procedure
computes a coordinate in code written here. What this repository contributes is
the intent file, the repair op-lists, the checks, and the discipline of looking
at the render - not a placement algorithm.

**This reverses what the repository tried for two sessions before 2026-10-28**,
which was to develop readability algorithms in `lib/schgen/`. That work produced
three invented readability metrics each pointing the opposite way to the owner's
judgement. `DEVELOPMENT-LOG.md` records it. **`lib/schgen/` is now deleted** -
this sentence said it *"remains the model-to-sheet generator and is not what
draws the pages he has accepted"*, and the second half of that is why the first
half stopped being worth keeping: nothing in this repository generates a sheet
from a model any more
(`docs/superpowers/plans/2026-10-30-remove-schgen.md`,
`docs/research/2026-10-30-schgen-removed.md`).

---

The toolchain
-------------

| tool | version used | licence | where it comes from | what it does here |
| --- | --- | --- | --- | --- |
| **copperhead** | `0.12.0`, commit `476cc15965f0d1eeda70afb9e806936f6bb15c5c` (2026-10-22) | Apache-2.0 | `github.com/copperheadhq/copperhead` | drafts the sheet from the intent |
| **akcli-kicad** | `0.22.0` (protocol 2) | MIT | PyPI `akcli-kicad`, upstream `github.com/tipoLi5890/akcli` | repairs the sheet; queries pin geometry |
| **kicad-cli** | `10.0.5` | GPL-3.0 | `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli` | renders, exports netlists, runs ERC |
| **tsx** | `4.23.1` on node `v22.19.0` | MIT | copperhead's own `package-lock.json`, installed by its `npm ci` | **this is what actually runs copperhead's CLI** - and it is run from `draughting/copperhead/node_modules/.bin/tsx` by path, never through `npx` |
| **bun** | `1.3.8` | MIT | bun.sh | runs this repository's own TypeScript - `bun test`, and the tools under `tools/`. It ran `tools/schgen/*.ts` until those were deleted |
| **Python** | `3.14.6` | PSF | system / venv | akcli's venv, every check script, direct sheet edits |
| **ImageMagick** | `7.1.1-47 Q16-HDRI` | ImageMagick | `brew install imagemagick` | **every PDF to PNG conversion and every crop** |
| **git** | any | GPL-2.0 | system | copperhead **refuses to draft** outside a git repository |

**CONFIRMED by running each one**, not read off a lockfile: every version string
above came from `--version` or `git rev-parse` on the actual installed artifact.

**Two entries are corrections, and both were found by a third board being drawn
by an agent that had not drawn the first two:**

- **copperhead is invoked with `tsx src/cli.ts`, not `bun src/cli.ts`.** The
  committed `draft.py` uses tsx, so tsx is the measured path. This file said
  `bun` until the hi-boost run, and **nothing has ever measured that path.**
  `bun` is still required, for `bun test` and the tools under `tools/`.

  **AND IT IS NOT `npx tsx` ANY MORE, WHICH IS THE FINAL REVIEW'S I-5 AND A
  CORRECTION TO THE ROW ABOVE.** `npx` resolves `tsx` from the current working
  directory upwards, so running it from anywhere but the checkout picked a
  different `tsx` from the pinned one. Measured, with the script argument held
  identical and `cwd` the only variable: `4.23.15` from npm's `_npx` cache at
  the repository root, `4.23.1` - the pinned one - inside
  `draughting/copperhead`, and a third, `4.19.3`, on `PATH`. `npx --offline
  tsx --version` against an empty cache fails `ENOTCACHED`, so a clean machine
  **fetched an unpinned `tsx` over the network** on its first `make
  draught-doctor`. `tools/draught/copperhead-install.ts`'s
  `defaultCopperheadTsx` now resolves the checkout's own
  `node_modules/.bin/tsx` by path, and
  `tests/draught/toolchain.test.ts` checks the version it reports against
  copperhead's own `package-lock.json` rather than against the row above -
  because a version in a table is a transcription with a date on it, and this
  one was wrong for the whole of this branch.

  **It was required here for `bun tools/schgen/board-sheets.ts`, which produced
  the sheet the intent was verified against, and that command is deleted.** The
  intent is verified against the netlist exported from the model instead -
  `docs/research/2026-10-29-low-cut-full-run/scripts/intent_vs_model.py`, the
  path step 1 below writes - so the check survives and the sheet it used to be
  taken against does not. **That full path is deliberate**: there is no
  `scripts/` directory at the repository root, and the bare `scripts/…` form
  this file uses in the verification set resolves only from inside a run
  directory under `docs/research/`.
- **ImageMagick and git were missing from this table entirely**, and the loop
  cannot produce a picture anyone can look at without ImageMagick. A toolchain
  list assembled from what you remember using omits the tools that worked.

Reproducing it:

```
git clone https://github.com/copperheadhq/copperhead.git
git -C copperhead checkout 476cc15965f0d1eeda70afb9e806936f6bb15c5c
cd copperhead && npm ci

python3 -m venv venv-akcli
./venv-akcli/bin/pip install 'akcli-kicad==0.22.0' 'numpy==2.5.4' 'pillow==13.0.0'
./venv-akcli/bin/akcli doctor
```

**`npm ci`, NOT `npm install`, and that correction is the final review's
I-1.** This block said `npm install` while `draughting/install.sh` - which the
paragraph below claims runs this block for you - refuses to use anything but
`npm ci` and says why at length in its own header. The two are not
interchangeable here: copperhead's `package.json` asks for `tsx` `^4.19.3`
while its `package-lock.json` names `4.23.1`, so `npm install` floats the
transitive tree off the pin and `npm ci` installs exactly what the lock names,
refusing outright if the lock and `package.json` disagree.

**`numpy` and `pillow` go into the SAME venv**, because `pixeldiff.py` and
every pixel measurement run under `venv-akcli/bin/python`. Only a docstring said
so, and the fourth board had to install them.

**AND THEY ARE PINNED, AND `draughting/install.sh` INSTALLS THEM - the final
review's I-3.** This line said bare `numpy pillow` while the script installed
`akcli-kicad` alone, so on the machine that promoted
`draughting/measure/framegeom.py` that script raised `ModuleNotFoundError: No
module named 'numpy'`: a promoted member of the measurement suite, covered by
no test and no `make draw` step, reading as available. Both are now entries in
`draughting/tools.lock.json` with their own probes against this venv's own
python, so `make draught-doctor` reports a disagreement about either, and
`tests/draught/install-script.test.ts` checks the script's text against EVERY
`pypi` field in the lock rather than against two named ones.

**The two committed `run.sh`
scripts also disagree about where that venv is** - the hi-boost run expects
`$SCRATCHPAD/hybrid-pass-1/venv-akcli` and the hairpin-fix run
`$SCRATCHPAD/venv-akcli` - so read the script you are about to run rather than
assuming.

The checkout used here was **shallow** (`.git/shallow` present, no tags fetched),
so `git describe --tags` fails on it. The commit hash is the binding, not a tag.

`akcli doctor` prints an environment report over python, kicad-cli, ngspice,
symbols, config and network with remediation hints, and `--require` gates it for
CI. **Run it first.** It is the one command that tells you whether the rest of
this procedure can work on the machine you are on.

**`draughting/install.sh` runs the reproduction above for you**, into
`draughting/copperhead` and `draughting/venv-akcli`, pinned to the exact commit
and pypi versions `draughting/tools.lock.json` names - and `make draught-doctor`
checks the result against that same lock. **The accepted risk, taken over
vendoring:** this script fetches from `github.com/copperheadhq/copperhead` and
PyPI, so it depends on both staying reachable and on the pinned commit and
release staying available there indefinitely. There is no vendored fallback
copy if either disappears; the trade is a repository that does not carry a
third-party checkout and its `node_modules`, against a one-time install that
can fail if upstream is gone. Neither install directory is committed -
`.gitignore` excludes both - so this is a local build product of the script,
re-created by running it again, not repository content.

**This project does not audit copperhead's own dependency tree, and that is
the owner's decision rather than a consequence of this one.** `npm audit` in
the checkout currently reports 22 vulnerabilities (3 low, 6 moderate, 10 high,
3 critical) in packages this repository did not choose and does not pin
individually. He was shown that measurement with the vendoring alternative
beside it, 2026-11-01: *"The copperhead dependency tree is fine. We're not
running production software in a data center"* - **a ruling about the threat
model, not about the number.** `docs/known-gaps.md` **G309** carries it, and
says what would reopen it: copperhead becoming something this repository
ships, exposes to a network, or runs against untrusted input. Not a higher
count.

> **This paragraph said until 2026-11-01 that "accepting the install script
> over vendoring accepted it along with everything else upstream changes",
> and that was an agent writing his acceptance for him.** His word
> *"install script"* answered how to pin copperhead and akcli; the question
> on the table was vendoring versus installing, not whether an unaudited
> transitive tree was acceptable. Shown struck rather than edited away,
> because the substitution is the useful part: the tell is the word
> **accepted** attached to a thing no quoted sentence of his mentions.

### NEITHER TOOL IS PINNED IN THIS REPOSITORY, AND THAT IS A STANDING RISK - STRUCK 2026-11-01, NOT DELETED

> **This heading and the two paragraphs under it are shown struck rather than
> deleted, because what they produced is the argument for the change that
> replaced them.** They read:
>
> *"Both have so far lived in an agent session's scratchpad, which `git clean
> -fdx` and session rotation destroy. Three accepted pages depend on tools
> that no committed file installs. This table is the whole of the pinning:
> there is no lockfile, no submodule, no vendored copy, and no check that the
> installed versions match these."*
>
> *"What would settle it is a decision nobody has made: vendor, submodule,
> pin in a manifest, or accept the drift. Until then, re-record the versions
> you actually used in your run's findings document, because a procedure
> that names versions it does not enforce is a transcription with a date on
> it."*
>
> **Both claims are now false, and have been since Task 1 of
> `.superpowers/sdd/2026-10-30-institutionalise-draughting`.** There is a
> lockfile (`draughting/tools.lock.json`, in the table above), an install
> script that pins to it (`draughting/install.sh`), and a check that the
> installed versions match it (`make draught-doctor`, below in "The loop").
> This struck text is the decision those three things made, left in place as
> the record of why they exist rather than removed once they existed.

**Pinning is `draughting/tools.lock.json`, enforced by `make
draught-doctor`.** Run `make draught-doctor` before anything else in this
procedure - see "The loop" below - and do not proceed past a disagreement it
reports. `draughting/install.sh` installs copperhead and akcli pinned to
that same lock, into the two locations the table above already names; the
accepted risk in choosing that install path over vendoring is recorded
above it, not repeated here.

---

The loop
--------

**Run `make draught-doctor` first, from anywhere in the repository.** It is
machine-wide, not per-board: it checks every tool in `draughting/tools.lock.json`
against what is actually installed and names every disagreement, with the
command that fixes it, exiting non-zero on at least one. `draughting/install.sh`
is that fix for copperhead and akcli. Do not proceed past a disagreement it
reports.

**For a fresh draft, `make draw` mechanises steps 1 through 3 below.** Run it
from the board's own directory (`cd boards/<board> && make draw`, or `make -C
boards/<board> draw` from outside it - there is no `BOARD=` variable). It
resolves the board's intent - a committed file (`COMMITTED_INTENT`,
`tools/draught/draw-draft.ts`) or a circuit's `drawingIntent()` export
(`tools/draught/draw-intent.ts`, built by
`tools/draught/intent-from-network.ts`) - verifies the intent's net partition
against the model's committed netlist export, drafts with
copperhead, **re-papers the draft to US Letter** (step 2.5 below), renders
with `kicad-cli`, and runs the measurement suite - **`selftest.py` first**,
then `draughting/measure/crossings.py`, `junction_audit.py` and
`label_survey.py` - writing everything under `build/draw/<board>/` - never
under `drafted/`, never a board's own declared files. **It stops there.** It
never calls `akcli`: step 4 (repair) and everything after it is judgement work
this procedure still describes by hand below, and `build/draw/<board>/` is raw
material for that pass, not the reviewer-ready artifact `drafted/` holds.

**`selftest.py` RUNS FIRST, AND THE ORDER IS THE POINT** (controller Ruling 2
of the final review's fix round 2; this verb ran the three measurements and
not the selftest until then). Three numbers printed by a reader nobody has
just checked are three numbers taken on faith: the selftest perturbs committed
sheets and reports whether each count MOVED, so running it first means one
run's output carries its own evidence that the reader can still tell a
difference. It takes 0.27 s. **A failing selftest is loud and withholds
nothing** - it is a labelled section like every other measurement, and
`make draw`'s exit code does not move, because a broken reader makes the three
numbers untrustworthy without making the page unfit to look at.

**AND `make draw`'s PRE-DRAFT TOOLCHAIN GATE IS NARROWER THAN
`make draught-doctor`'s, deliberately** (Ruling 1, same round). It refuses
ahead of drafting only on the tools the drawing path actually spawns -
copperhead, `kicad-cli`, `magick` - and **reports every other lock
disagreement beside the page instead of blocking it.** `akcli`, `qpdf`,
`numpy` and `pillow` are in the lock and are not on that path, and *"numpy is
missing" is a dumb reason not to draw a schematic*: the owner's standing
directive behind `docs/known-gaps.md` **G303** is *"if I can't look at it, I
cant decide if the refusal is for dumb reasons"*. Machine-wide toolchain
health stays `make draught-doctor`'s job, and that verb still refuses on every
one of them.

`.claude/skills/drawing-a-schematic/SKILL.md` is the invocation of this whole
loop - it names which commands are `make draught-doctor` and `make draw`'s job
and which are judgement this procedure still has to be read for. Read it
alongside this file, not instead of it: the commands below are what `make
draw` itself runs internally, and are also what to run by hand when drafting
outside it, or when working a step it does not perform.

### 0. Establish which direction authority runs

For a circuit an agent designs, the model is authoritative and the drawing is
derived. For an imported design - the Pultec - **the schematic is authoritative
and the model was derived from a netlist export.** Work out which case you are
in before deciding what may edit what. `CLAUDE.md` states the rule; getting it
backwards means editing the wrong artifact.

### 1. Build the copperhead intent from the repo's own model

A `schematic.intent.json`, version 1, carrying `parts`, `nets`, `noConnect` and
`hints`. **Nothing in it computes a coordinate.** The author's controls are
deliberately few: one group per part, `hints.groupOrder`, `paper`, `date`, a
net's `kind`, `noConnect`, and `libId`. There is **no coordinate and no
orientation control** - copperhead places, and that is the trade this tool is
chosen for.

**For a model-authoritative board, the intent is generated, not written.** Its
circuit module exports `drawingIntent()`, built by
`tools/draught/intent-from-network.ts` from the `Network`, the circuit's
`DESIGNATORS` and `PIN_NUMBERS`, and a small drawing file holding the group and
the net kinds (`circuits/transistor-preamp/staged-board.drawing.ts` is the
first). `make draw` writes it to `build/draw/<board>.intent.json` on every run.
A schematic-authoritative board - the Pultec - keeps a committed, hand-written
intent named in `COMMITTED_INTENT`. `tools/draught/draw-intent.ts` refuses a
board that declares both.

`docs/research/2026-10-29-low-cut-full-run/base.intent.json` is the worked
example, and `docs/research/2026-10-29-low-cut-full-run/draft.py` beside it shows group assignments written out as
literals.

**VERIFY THE INTENT BEFORE DRAFTING FROM IT.** Run
`docs/research/2026-10-29-low-cut-full-run/scripts/intent_vs_model.py`: the
intent's net partition must be identical, **as sets of `REF.PIN` sets**, to the
netlist exported from the model. A mismatch here is a bug in the intent, and
finding it after a draft costs a whole pass.

**THE DRAFT STEP IS SKIPPED ENTIRELY WHEN THE STARTING POINT IS AN EXISTING
PAGE.** A repair to a sheet the reviewer has already seen runs steps 3 to 6 only
- the hairpin-fix run used no copperhead at all. The loop below describes
drawing a board from nothing; do not re-draft a page he has accepted in order to
follow it.

### 2. Draft, and draft more than one arrangement

```
cd <copperhead-src> && ./node_modules/.bin/tsx src/cli.ts --repo <board-dir> draft schematic --intent <path>
```

**The board directory must be a git repository** - `git init -q` is enough.
copperhead refuses to draft outside one, and no record said so until the third
board.

`draft` is deterministic: no LLM, no network. **Group assignment is the main
lever you have**, so try more than one - the low-cut run drafted blocks-by-flow,
a split cap bank, and a merged stand-in group before one was usable, and the
hi-boost run drafted nine.

**THERE IS NO STATED CRITERION FOR CHOOSING AMONG THE DRAFTS, and this is the
largest undocumented decision in the loop.** "Try more than one if the first is
unusable" does not define unusable. On hi-boost the four variants that split the
board's own section measured **2 true crossings** against **8** for the five
that keep it whole - and the 8-crossing variant was taken anyway, because the
splits turn four tap nets into cross-group label pairs and cut one functional
section into three headed boxes. **A number from the tool traded against a
structural property, with nothing written to adjudicate it.** Whoever runs this
next will make that trade again; record which way you went and why.

### 2.5. Re-paper to US Letter

**COPPERHEAD CANNOT DRAFT TO US LETTER.** Its draft engine checks a requested
paper size against its own table
(`draughting/copperhead/src/kicad/draft/engine.ts`, the `PAPERS` table near
line 219), which holds only the ISO series, A5 through A0 - `USLetter`
appears nowhere in that file. A different table, in the legibility checker
(`src/kicad/legibility.ts`), does know `USLetter`, but the draft engine never
reads it. Passing `hints.paper: "USLetter"` is silently ignored rather than
honoured: the engine logs *"paper hint 'USLetter' is not a standard size;
deriving paper from content"* and drafts on A4 regardless.

**Every page must be re-papered after drafting, before rendering.** All five
approved Pultec pages are `USLetter`, and the owner has no A3 or A4 printer -
a page left on A4, or on whatever size the engine derived from content, is
the wrong artifact for him to receive, whatever its circuit says.
`docs/research/2026-10-30-letter-repaper.md` confirms the fix: rewrite the
drafted sheet's own `(paper "...")` token to `(paper "USLetter")` and
re-export - `git diff` of that edit is exactly one insertion and one
deletion, the paper line and nothing else. Never pass `USLetter` to
copperhead as a hint; it has no effect but to be ignored.

`make draw` does this itself, via `repaperToUSLetter` in
`tools/draught/draw-render.ts`, immediately after copperhead drafts and
before anything renders. **Drafting outside `make draw` - by hand, or from a
script - must call the same rewrite before rendering**, or the rendered page
is on the wrong paper with nothing in the render itself to say so.

### 3. Render, and LOOK AT THE RENDER

```
kicad-cli sch export pdf -o <out.pdf> <sheet.kicad_sch>
kicad-cli sch export svg -o <dir> <sheet.kicad_sch>
```

Export **SVG as well as PDF**: git can diff an SVG, so a later change shows what
moved rather than only that something did. PDF cannot serve as a binding - it
embeds `/CreationDate`.

**RENDER BOTH SIDES OF A COMPARISON FROM ONE DIRECTORY.** The render depends on
the `.kicad_pro` beside the sheet, which no record mentioned until the third
board: a generated project file setting `intersheets_ref_show: true` drew `[1]`
beside all fourteen global labels, so **the first before/after pair differed by
the project file rather than by the sheet.** A copperhead board directory has no
`.kicad_pro` at all; whatever supplies one is part of what you are comparing.

**AND THE TITLE BLOCK PRINTS THE SHEET'S FILE NAME**, which defeats the remedy
above if you apply it literally. Rendering `before.kicad_sch` against
`pultec-hi-boost.kicad_sch` **in one directory** - what this file said to do -
put a spurious difference band 125 mm from anything that changed. **The fix is
the same FILE NAME in two sibling directories with identical project files**,
not one directory with two names.

**And a bounding box hid it:** the trim box over the real band and the
title-block band read as one 148 mm-tall region, which looked like a single
large change. **Report difference BANDS, not a bounding box** - a box over two
distant changes describes neither.

PDF to PNG, and every crop, goes through ImageMagick (`magick`). There is no
path from a sheet to a picture a person can look at that does not use it.

**This step is not optional and it is not satisfied by a passing check.** A page
that overflowed to A5 and was missing a third of its circuit **matched its
netlist exactly** and passed every gate. The only thing that found it was
looking.

### 4. Repair with akcli

**Query geometry before placing anything:**

```
akcli pins <lib_id> --at X Y --rotation R --json     pin coordinates - SEE BELOW
akcli bbox <lib_id> --at X Y --rotation R            bounding boxes, for spacing
```

**`akcli pins` MIXES UNITS AND ITS ABSOLUTE COORDINATES ARE WRONG.** Given
`--at 207.01 53.34` in **mm** it returns `y_mil` values of −96.66 and 203.34 -
the mm figure with a ±150 **mil** offset added to it. **The spacing between the
two pins is right; the absolute positions are not.** Use it for pitch and
extent, and **read absolute pin positions out of the sheet's own `lib_symbols`
block instead.** Found on the third run of this loop, after two runs had used
the tool without noticing.

**Dry-run every op-list and read the net diff:**

```
akcli plan  <sheet.kicad_sch> --ops <ops.json>            validates, never writes
akcli draw  <sheet.kicad_sch> --ops <ops.json> --apply    WRITES
akcli undo  <sheet.kicad_sch>                rotated backups under .akcli/
```

**`plan` needs `--ops` too** - it rejects the positional form this file gave
until the hairpin-fix run tried it.

**`--apply` IS NOT OPTIONAL AND ITS ABSENCE IS SILENT.** `akcli draw --ops`
without `--apply` is a dry run that **exits 0 having written nothing**, and
there is no `akcli apply` verb. The hi-boost run lost a step to this, and the
trap is worse than a lost step: **the netlist comparison afterwards reported
`IDENTICAL` because nothing had been written.** A procedure that checks a repair
by comparing netlists invites exactly this false green.

`connect_and_label` refuses a non-axis-aligned endpoint, which is a refusal
worth having. `akcli diff` gives a net-level diff of two schematics and `verify`
proves net equivalence - use them rather than trusting that a repair was
net-neutral.

**akcli was proven non-destructive before it was trusted**, and that check is
worth repeating on a new board: on low-cut its passes left the sheet **sha256
byte-identical**; on low-boost, 70 token families went to 70.

### 5. Re-render, look again, iterate

**Driving a measurable cost down is work to automate, not hand back.** Crossings,
corners, hairpins, total wire length and label count are numbers.
*"Your cycles are cheaper than mine"* is the governing economics: a first
solution that technically works but leaves a person doing fiddly remedial work
is a failure, not a delivery.

### 5.5. Commit the repair, not only the page

**The repair is work, and it is committed beside the page it produced.** A
page in git with no record of how it was made cannot be made again: when the
circuit changes, the draft from `make draw` is reproducible and everything
after it is lost. The owner, 2026-11-01, after the first staged-preamp page
was promoted with its op-list left in a deleted scratch directory: *"we should
keep the repair info committed. That's important work we shouldn't lose."*

Every repair run commits, under `drafted/<circuit>/<board>/repair/`:

- **every akcli op-list applied, in order**, named so the order is the sort
  order (`01-....json`, `02-....json`);
- **every script** that generated an op-list, measured geometry to build one,
  or edited the sheet directly, plus the direct text edits themselves where no
  op exists (wire stroke, field angles, the group rectangle);
- **the intent the draft was made from**, copied as it was at draft time - for a
  model-authoritative board `make draw` regenerates it every run, so the copy
  is what ties this repair to the circuit as it then was;
- **a `REPLAY.md`** giving the exact commands, in order, from a fresh
  `make draw` to the committed sheet, and the sha256 the replay is expected to
  reach.

**Replay before you commit.** Run `REPLAY.md` against a fresh draft and compare
the result's sha256 with the page's. A replay that does not reach the page's
bytes is not a record of how the page was made; fix the record until it does,
or say in `RECORD.md` exactly which step does not reproduce and why.

**A scratch directory is never the only copy.** `build/`, `.superpowers/` and
any other gitignored workspace can be deleted - by the end of a plan, by
`git clean`, by another session. Copy the repair into `drafted/` and commit it
before anything that might delete the workspace.

A repair of an existing page that skipped the draft step commits the same way,
and its `REPLAY.md` starts from the page's previous committed sha256 instead of
from `make draw`.

### 6. Hand the page to the reviewer

`EVALUATING-DRAWINGS.md` §4 governs this message and is written to be checkable
from outside: **a message carrying a drawing carries a question and nothing
else.** *If a message contains a drawing and an assessment of it, that rule
broke.* Send the page, the crops of every region you changed, and the question.
**Do not rank, do not recommend, and do not use the forbidden vocabulary.**

Then record the verdict in `docs/schematic/verdicts.md`, verbatim, bound to the
sha256 of the sheet he was shown. **Telling him is not recording it.**

---

The repair classes
------------------

**Eight are known. The set is not closed, and must not be written as if it
were** - the second board added three that nobody had predicted and the fourth
added two more to akcli's side. Four are copperhead's structural output; four
are akcli's.

**On the third and fourth boards no new COPPERHEAD class appeared**, and every
known one either recurred or was ruled absent by measurement. That is two
boards' worth of evidence that the copperhead side is settling, and it is not
evidence that it is closed. **The akcli side is NOT settling: two of its four
classes were first seen on the fourth board** (7 and 8 below), both found by
reading the sheet after the ops rather than by any check.

**copperhead:**

1. **It labels any net spanning groups or exceeding 4 endpoints.** This is the
   main source of duplicate on-page labels.
2. **It emits one ground symbol per pin.** The owner: *"we dont need five
   discrete ground symbols here. one will suffice if all the wires connect."*
   Stacked grounds are noise; grounds that **shorten long runs on a crowded
   page** are not.
3. **It has no orientation control**, which is where hairpins come from. The
   owner: *"this ground symbol is folded back on its wire. Ideally, the ground
   terminal of the pot symbol would point down or horizontally so the ground
   wire doesn't hairpin."*

   **AND IT HAS NO SIGNAL-FLOW CONTROL EITHER.** copperhead will place a group
   with its input below its output and its output pointing up - which the owner
   called *"exactly backwards of convention"*.

   **This is `S1`, a STYLE PREFERENCE, and it must not be made a rule, a gate or
   a score.** `EVALUATING-DRAWINGS.md` carries the S-series and the reason it
   exists; the owner, 2026-10-29: *"consistent style and a common style
   convention accumulate to increase readability and comprehension - that's much
   of what style preferences are for."* **Style preferences have cumulative
   value when applied consistently**, so much of the benefit lands on the next
   drawing rather than this one. **Follow it where it fits; never enforce it.
   Nothing here may refuse a page over one** - and his own limit on it:
   *"let's not obsess about them and turn them into sacred rules; don't make
   perfect the enemy of the good."*

   **Why it belongs in this list anyway:** a hairpin repair derived without
   looking at the flow can be a correct repair that leaves the group reading
   backwards - which is what happened on hi-boost. So **look at a group's flow
   before repairing anything else in it**, and report where the input enters,
   where the output leaves and which way each points, as an observation rather
   than a check that passes or fails.
4. **`PWR_FLAG` coordinate collisions.**

**akcli:**

5. **`move_component` carries per-part field offsets AND the field ANGLE.** A
   moved part's Reference and Value do not follow sanely; rewrite them as
   literals keeping symbol-relative offsets. **The angle is the half the first
   two boards did not record**, and it cost 26 fields restated by hand on
   hi-boost - 6 of 9 capacitors and 3 of 4 inductors.

   **THE RULE, measured, and it is NOT "set the angle to 0":**

   > a field renders horizontally when **`(symbol rotation + field angle) mod
   > 180 == 0`**

   This file stated the one-directional form until the hairpin-fix run - *a part
   turned 270 to 0 keeps `angle 90` and renders vertical* - which reads as "set
   angle 0" and **is wrong in the other direction**: `SI6` turned **0 to 270**
   and keeping `angle 0` renders **vertical**. There is a control render for it,
   `crops/control-si6-field-angle-0.png` in the hairpin-fix directory.

   **The same wrong assumption had silently corrupted a measuring script** by
   1.43 mm - in the direction that makes a page look tighter than it is.

   **This class is invisible to every automated check, so the moved part must be
   looked at in a rendered crop with its neighbours.**
6. **`delete_object` orphans junction dots** - 11 across four passes on one
   board, **invisible to every check that ran.** Count them with
   `draughting/measure/junction_audit.py` - promoted there on 2026-10-30 from
   the three run-directory copies, which had converged byte-identical by that
   point, so there was no choice between competing fixes to make. It imports
   `draughting/measure/kicad_sheet.py`, its sibling in the promoted home, not
   `docs/research/lib/kicad_sheet.py` - that directory no longer exists, and
   each run directory's own frozen copy of both files still names it, so
   running one of those copies directly now raises `ImportError`
   (`docs/research/README.md` records this). **Until the promotion this entry
   named the hi-boost copy, which was one of the two that still held the
   two-textual-forms bug** - see trap 11.

   **`scripts/orphan_junctions.py` IS DELETED, not deprecated.** It counted wire
   endpoints only, so it called a rail passing through a symbol pin an orphan and
   reported **6 orphans on a page that has none**; it remained on disk in two run
   directories for a day after `junction_audit.py` replaced it, still being copied
   forward, and this table still named it as the tool to measure orphans with.
   *Supersede means delete.* `junction_audit.py` resolves pin positions from the
   sheet's own `lib_symbols`, counts pins as well as wires, **and reports the
   converse that no committed script covered - a wire-to-wire tee carrying no
   dot**, which is a real connectivity defect rather than a cosmetic one.

   **EXCEPT WHEN TWO COLLINEAR WIRES OVERLAP, and the fourth board found the
   case.** copperhead sometimes writes a short segment wholly INSIDE a longer
   collinear one on the same net - on hi-cut,
   `(161.29,129.54)-(161.29,123.19)` inside `(161.29,139.7)-(161.29,123.19)`.
   A stub meeting the short one's endpoint is connected by a shared endpoint,
   with no dot needed, but `junction_audit.py` sees the long wire passing
   through and calls it a tee without a dot. **It reported 2 on that board's
   baseline and neither is a connectivity defect.** A tee-without-a-dot report
   needs a collinear-overlap test before it may be read as a finding - and the
   overlapping pair is itself a drawing artefact worth knowing copperhead
   produces.

7. **`add_net_label` emits a GLOBAL label as `(shape input)`, not
   `(shape passive)`.** copperhead writes every global label it synthesises as
   `passive`, which KiCad draws as a plain rectangular tag; `input` draws an
   arrow-pointed one, so a label akcli adds renders with a **different outline
   shape** from the ones already on the page. akcli also omits
   `(fields_autoplaced yes)` and the hidden `Intersheetrefs` property every
   copperhead global label carries. **No check here reports any of it**; the
   remedy is to rewrite each added global label whole, in copperhead's own form
   (`docs/research/2026-10-29-hi-cut-full-run/scripts/restyle.py`).

8. **There is no akcli op for a GROUP RECTANGLE.** Re-placing a group's contents
   almost always changes what its rectangle should enclose, and that is a
   literal text edit like the fields. The hi-boost run moved one edge and
   recorded it only inside its own script; the hi-cut run resized two, one of
   them in a group it had only gone into to collapse a label.

### The label rule has no test in it

> *"Rather than try to come up with an exquisite line of reasoning about when
> duplicate on-page labels is good or bad, you should just assume you need to
> collapse them. I will tell you when I want you to use on-page labels."*

**Collapse duplicate on-page labels into a wire. Always, without reasoning about
it.** There is no threshold and no defence to weigh. If you find yourself
building a case for keeping a pair, stop: that reasoning has been struck three
times, and each time it was an agent inducing a law from a single verdict.

A hairpin is different in kind - it **demands a defence** rather than being
forbidden. Do not write that hairpins are never acceptable; that ultimatum was
struck for unearned certainty.

---

Checks that can fail, and four that could not
---------------------------------------------

**A skipped check must never look like a passing one, and a check that cannot
fail is worse than no check.** Each of these actually happened in this work:

- **`kicad-cli sch export netlist` exits 0 on a structurally broken sheet.** A
  parenthesis-depth error left a sheet at depth −1 and the export wrote
  well-formed XML with `<components/>` and `<nets/>` **empty**, exit code 0, no
  error. **Put a parenthesis-depth counter in the loop and compare net SETS**,
  never the exit code.
- **`akcli check --layout` reported zero layout findings** on a page that drew
  six capacitor values across their own plates, put a pot's reference and value
  inside its body, and ran the 0V rail through the title block. All three were
  found by looking. **Run the lint; do not believe it.**
- **A netlist match does not mean the page is complete** - the A5 overflow above.
- **A pattern that collapses to "match everything".** A NUL check written here
  used `$(printf '\000')`, which the shell strips to an **empty pattern**, so
  `grep -c` counted every line and reported a number that could not have been
  anything else. **Every check needs a positive control** - a value that proves
  the instrument moves.

- **`akcli draw --ops` without `--apply` exits 0 having written nothing**, and
  the netlist comparison that follows then reports `IDENTICAL` **because nothing
  changed**. Named in full under step 4 above. The lesson generalises: a check
  that compares before to after cannot distinguish a clean edit from no edit.
- **A RECORDED NUMBER THAT DOES NOT REPRODUCE, which is worse than a check that
  cannot fail.** The low-cut record states `Found 0 violations` on both sides of
  its ERC run, under a recipe it describes. Run exactly that way, hi-boost
  reports **9 warnings before and 5 after**, all `lib_symbol_issues` on
  `copperhead_power` - a symbol copperhead embeds in the sheet and no
  `sym-lib-table` declares. **The control is what makes this a finding rather
  than a difference between boards: the same recipe run against the committed,
  ACCEPTED low-cut page produces the same five warnings.** ERC *errors* are 0
  everywhere, so nothing electrical is in question - but the recorded zero came
  from something that run did and did not write down, and **an unreproducible
  zero is indistinguishable from a check that was never run.** Report ERC as
  errors and warnings separately, with the exact invocation.

- **A WIRE REGEX THAT READS PAST THE STROKE SILENTLY DROPS EVERY WIRE CARRYING A
  COLOUR.** A sheet holds wires in TWO textual forms - copperhead's
  pretty-printed block form and akcli's one-liner - and a pattern of the shape
  `\(wire\s*\(pts …\) \(stroke \(width W\)…\)` matched **54 of the 77 wires** on
  `pultec-hi-cut`. The 23 it dropped are every grey ground wire, **including all
  six of J2's pin stubs**, which are exactly the wires a ground repair has to
  find. It printed 54 and said nothing. **Count `(wire` tokens, parse by block,
  and refuse when the two disagree** - `scripts/dump_sheet.py` and
  `scripts/make_repairs.py` in the hi-cut run do. The inherited `verify.py` is
  safe only because its pattern stops at the `pts`.
- **`boxgeom.py` WAS WRONG IN BOTH DIRECTIONS AND WAS FIXED ON 2026-10-30.** The
  entry above described the symptom; the diagnosis turned out to be two separate
  parse bugs, and the second one had gone unnoticed entirely.

  **The absorption bug.** It found a `lib_symbols` entry's end by searching for
  the next `^\t\t(symbol "` and ran to the END OF THE FILE when there was none.
  The last entry on `hi-cut-hybrid.kicad_sch` is `Switch:SW_Rotary_1x6_MP`, so
  its "library geometry" was every coordinate on the page - 45,191 characters
  where the entry is 7,352, and 26 points wrongly attributed to `SW1` inside the
  **Lo boost** rectangle alone. That is why it named `SW1` as the extreme item in
  three rectangles SW1 is not in, and why Lo boost's bottom margin read
  **0.00 mm** where the render shows 2.5 mm. Repaired, it reads **2.54 mm**.

  **The rectangle-form bug, which nobody had found.** Its one-line
  `(rectangle (start …) (end …)` pattern matched **6 of the 14 `(rectangle`
  tokens** on `pultec-hi-cut`: the 6 it matched are the sheet-level group boxes,
  and the 8 it dropped are every symbol BODY, written in block form inside
  `lib_symbols`. So no symbol body ever entered a margin. **This is the
  two-textual-forms bug for a fourth time in a fourth parser**, and it moved
  nine of twelve margin rows on `pultec-hi-cut`, ten of twelve on `pultec-mid`
  and eight of twelve on the hairpin page - mostly by 1.02 or 1.27 mm, in the
  direction that made a page look LOOSER than it draws.

  **`19.05 / 7.62 / 8.89 / 8.89` was published as exact and is not.** The
  mid run's §9.9 called the Mid group's graphics margins exact; three of the four
  change, to `19.05 / 6.60 / 7.62 / 7.62`. The hi-cut run's hand-checked Hi cut
  margins (`6.35 / 17.78 / 7.62 / 8.89`) and the hairpin run's load-bearing
  `5.08` and `3.43` are UNCHANGED, which is the evidence that the repair is a
  repair.

  **A TEXT MARGIN FROM A CHARACTER COUNT IS NOW OPT IN** (`--estimate-text`) and
  every number in it prints with a leading `~`. `0.75 * size * len(text)` gives
  5.715 mm for six characters at size 1.27 where `textwidth.py` MEASURED 6.223 to
  6.858 mm of ink, so such a margin reads up to 0.57 mm looser than it draws. The
  mid run's `1.90 mm` and `0.64 mm` were quoted as this page's two tightest
  numbers and are estimates; their values do not change, their status does. **To
  measure a text margin, render and use `scripts/textwidth.py`.**
- **`pixeldiff.py` REPORTS ROW BANDS AND COLUMN BANDS INDEPENDENTLY**, so when
  one changed group spans the page the column band is the whole page and the
  small row bands are left unlocalised - on hi-cut, four row bands against one
  column band of 50.55-271.91 mm. `scripts/pixelbands.py` reports the columns
  **within** each row band, which localised two 2 mm bands to a 0.38 mm column
  at one rectangle's dashed edge (the rectangle's height changed, so its dash
  phase moved). This is the "report bands, not a bounding box" lesson applied
  one level further in.
- **`akcli check --layout` REPORTED ZERO FINDINGS on a page whose label ran over
  a symbol's own PIN NUMBER.** On hi-cut the first placement put `sel_common`
  across the selector's `7`; the lint found nothing, a 300 dpi crop found it,
  and two parts moved 3.81 and 7.62 mm east. The same lint found 8 real-enough
  findings on the same board's baseline, so it is partial rather than useless -
  which is the harder thing to remember about it.

`docs/schematic/false-greens.md` catalogues these with the rest.

### NEVER TYPE A CONTROL-CHARACTER ESCAPE INTO A TOOL PARAMETER

A `\u0000` or `\r` written into an edit string, a search pattern or a document
arrives as the **real byte**, and the result is invisible in a rendered diff. A
raw NUL in `docs/known-gaps.md` made `grep` treat all 25,000 lines as binary and
**suppress every match**. Build such bytes in code with `chr()`, and check the
file by **counting bytes** rather than by reading it.

> **THIS FILE BROKE THIS RULE WHILE STATING IT - the fifth instance, and it is
> left recorded rather than quietly repaired.** The sentence above was first
> written with the escape typed directly into the `Write` call. It arrived as
> **one real NUL byte at offset 12022**, and the rendered text looked exactly
> right. Interestingly the `\r` in the same sentence survived as two characters
> while the other did not, so the two escapes are not treated alike and you
> cannot reason from one to the other. It was caught by a byte count, repaired by
> building the replacement as `chr(92) + 'u0000'` in code, and verified by
> counting again - `1` NUL before, `0` after, with the literal present exactly
> once.
>
> `CLAUDE.md` keeps its own version of this incident for the same reason:
> **there is no level of care at which typing the escape is safe.** A document
> that warns about it is not thereby protected from it, and neither is the agent
> writing that warning.

---

The verification set
--------------------

Report each **before and after**, as a number that could have been different:

| measure | how |
| --- | --- |
| netlist pin sets **and net names** identical to the model | `kicad-cli sch export netlist --format kicadxml`, compared as sets |
| ERC violations | `kicad-cli sch erc`, or `akcli check` |
| parenthesis depth | counter in the check loop; must be 0 |
| true wire crossings | distinguish from T-meetings |
| T-meetings, and whether each carries a junction dot | |
| orphan junction dots, out of total | `draughting/measure/junction_audit.py`, which counts PINS as well as wires. The `orphan_junctions.py` this row named until 2026-10-30 is deleted; it counted wire endpoints only |
| duplicate on-page labels per group | `draughting/measure/label_survey.py` (promoted 2026-10-30 from the run directories' byte-identical copies); **zero after the collapse pass** |
| per-net wire stroke consistency | a net drawn in two colours reads as two nets |
| symbol count, pin count | should be unchanged by a repair |
| wire count, total wire length | |
| sha256 of the sheet | the binding for a verdict |

**None of these is a judgement of the drawing**, and a page with no findings is
not thereby good. `EVALUATING-DRAWINGS.md` §6: *an automated check is peripheral
by definition. It may be run and reported. It may never approve, may never rank.*

---

What this procedure does not cover
----------------------------------

Stated rather than buried, because each is a place the next run will have to
decide something this file does not answer:

- **"Building the intent file is not automated" - STRUCK 2026-11-01, NOT
  DELETED, because what it said motivated the tool that replaced it.** It
  read: *"There is no committed tool that derives a copperhead intent from a
  `Network`. Each board's intent has been hand-built and then verified against
  the model. This is the obvious candidate for glue, and it is glue rather than
  an algorithm - it computes no coordinate."* That gap is closed for a
  model-authoritative board: `tools/draught/intent-from-network.ts` derives the
  intent from the `Network`, the circuit's `DESIGNATORS` and `PIN_NUMBERS`, and
  a small drawing file (`circuits/transistor-preamp/staged-board.drawing.ts` is
  the first), and the circuit module exports it as `drawingIntent()`. A
  schematic-authoritative board - the Pultec - still keeps a committed,
  hand-written intent named in `COMMITTED_INTENT`
  (`tools/draught/draw-draft.ts`); `tools/draught/draw-intent.ts` resolves
  between the two declared sources and refuses a board that names both or
  neither. See "1. Build the copperhead intent from the repo's own model"
  above for the correction in full.
- **Group assignment is a judgement with no stated method.** Which parts share a
  group, and in what order, is the main lever on the output and the records show
  it being chosen by trying several.
- **"Neither tool is pinned", as above - STRUCK 2026-11-01.** Both are now:
  `draughting/tools.lock.json`, `draughting/install.sh` and `make
  draught-doctor` are the pinning, the installer and the check, respectively.
  See the struck section under "The toolchain" for the correction in full.
- **The verdict record substrate is not built.** `docs/schematic/verdicts.md` is
  interim markdown; the designed form is a `drafted/<circuit>/<board>/` tree with
  a GNU recutils register and a staleness check. **The status vocabulary is
  unnamed** and is the owner's to name - an agent may not author the words its
  own output is judged in.
- **SVG stability across machines, KiCad versions and font sets is unmeasured.**
  `sha256(svg minus the generation-title line)` is byte-stable on one machine,
  measured; whether it survives a font substitution is not known, and an
  approval bound to it would read as a withdrawn signature if it drifted.
- **`tools/draught/gate.ts` IS DELETED, and nothing replaced it.** This entry
  said it was *"committed and known inadequate"* - it matched a netlist exactly
  on the A5-overflowed page, so it was structurally incapable of the class of
  defect that matters. It went with the generator's three CLI verbs. **Read that
  as a gap, not as a resolution**: the hole the entry named is still open and
  there is now not even an inadequate check sitting in it.
- **"DUPLICATE" IS UNDEFINED, AND THE WORKING READING IS NOT A RULE.** On a
  one-sheet page every label is on-page, and a net that crosses the junction
  ladder into four groups legitimately carries four labels. Both accepted pages
  collapsed pairs **inside one group** and kept the cross-group ones, so that is
  the reading in force and the hi-boost run made it a check that must read zero.
  **It is a reading of two verdicts, not a rule the owner stated**, and it is
  flagged as such rather than asserted. **An agent must not promote it**; only he
  can say whether it is what he meant.
- **Net naming has no rule, and the names change the layout.** 14 of 21 nets
  arrived from the export as `Net-(C1-Pad1)`. Meaningful names were read off
  `circuits/pultec/electrical/from-netlist.ts` and `controls.ts` - **nothing in
  any record sends you there** - and label length is already known to move
  copperhead's placement, so this is not cosmetic.
- **Label scope changes the exported net name.** Making a label local turns
  `tap_100mh` into `/tap_100mh`, which the verification set asks to match. Three
  nets were renamed on hi-boost for one consistent label style within a group.
  Nothing covers what to do when a collapse leaves a net with a single label
  whose natural scope is local.
- **Nothing says which repairs go through an akcli op and which through a direct
  text edit.** Both records use both and neither states a rule. hi-boost ran 174
  ops and then 69 literal text edits for the three things akcli 0.22.0 cannot do.
- **MOVING A LABEL has no akcli op at all**, so it must be a literal edit - and
  **when that edit runs relative to the ops decides which of akcli's own two
  self-checks means anything.** Run the label move first and the connectivity
  check is meaningful while the net diff reports artifacts of the intermediate
  state; run it last and the reverse. Neither ordering is wrong, and **neither
  of akcli's self-checks is the binding comparison** - that is a netlist compare
  of the committed before-sheet against the finished one.
- **An akcli op cannot carry a reason.** Any unrecognised key is rejected
  op-by-op with `OP_UNSUPPORTED`, so the *why* of a repair has to live in a
  sidecar keyed by op index (`repairs-pass1.notes.txt` is the worked example).
- **The loop as written has one revise step; no run has needed only one.** Both
  the low-cut and hi-boost runs went draft, akcli, text pass, render, look,
  re-place, re-render. Write the loop you actually ran.
- **THE DRAFT-CHOICE TRADE IS A PROPERTY OF A BOARD, NOT A STANDING TENSION.**
  The entry above records hi-boost trading 6 crossings for a structure the
  repair could work with. On `pultec-hi-cut` the same split measured **11**
  crossings against **8** for the whole section *and* cut a functional section
  into two headed boxes, so there was nothing to adjudicate. **Measure both on
  the board in hand before assuming the trade exists**, and record which way you
  went either way.
- **NOTHING SAYS HOW FAR A LABEL COLLAPSE MAY PROPAGATE, OR THAT IT REACHES
  GROUPS THE REVIEWER HAS NOT COMPLAINED ABOUT.** A duplicate pair inside a
  stand-in group is as much a duplicate as one in the own section, and the rule
  admits no test - so it gets collapsed. On hi-cut, collapsing one pair in the
  **Lo boost** stand-in moved a resistor 7.62 mm, moved its ground symbol,
  moved a `GND` text that had followed the symbol out of its own rectangle, and
  grew that rectangle by 5.08 mm. **A one-label rule produced a five-part change
  in a group that was not the subject of the run.** Record the corrections you
  did NOT take beside the one you did, so the choice can be disputed.
- **A GROUP WITH NO SERIES PATH HAS NO "WHERE THE OUTPUT LEAVES".** Repair class
  3 asks for a group's flow before anything in it is repaired. Four of
  `pultec-hi-cut`'s six groups have no through-path: a connector has none, and
  three of its stand-ins and its own section are SHUNTS. The working answer is
  to report the flow of the **chain** inside the group and say that is what is
  being reported; nothing better is written.
- **THE CAPACITOR PITCH NOW HAS A METHOD, AND CHARACTER COUNT IS NOT IT.** This
  file records hi-boost's 12.7 to 15.24 mm change and the gaps either side, but
  no way to arrive at a pitch on a new board.
  `docs/research/2026-10-29-hi-cut-full-run/scripts/textwidth.py` measures the
  rendered ink of the widest value with a positive control that the measuring
  window is otherwise empty. **The finding a formula would have missed:
  `2200pF` draws 6.858 mm while `.047uF` draws 6.223 mm at the same six
  characters**, because the leading `.` is a narrow glyph - so the widest value
  on a board can be a digit string, and its gap to its own plate 0.37 mm
  smaller than the character count predicts.
- **A CROP PAIR SIZED TO THE AFTER STATE IS NOT A COMPARISON.** The hi-cut run's
  first `hi-cut-whole` box stopped 16 mm above the bottom of the group **as
  copperhead had drawn it**, so the BEFORE crop was cut off while the AFTER crop
  was complete. The box has to contain both states of the region.
- **Only Pultec section boards have been through this loop.** Whether it carries
  to `pt2399-core` or the transistor-preamp boards is untested.

---

Board kinds: `perfboard` and `pcb` (design change C1)
-------------------------------------------------------

Every `boards/<board>/perfboard.json` declares a REQUIRED `"kind"`, with no
default: a declaration that omitted it would be guessed into one kind or the
other, and the two run different checks. `tools/perfboard/declaration.ts` refuses
a missing or unknown kind naming the field.

- **`"perfboard"`** is a hand-built stripboard with a VeroRoute layout. It
  requires `"vrt"`, and its `make check` is unchanged: `veroroute`,
  `netlist-agrees`, `wiring`, `scaffold-membership`, then
  `tools/cli/perfboard.ts check`.
- **`"pcb"`** is a board whose artifact is a KiCad design with no VeroRoute
  layout. It must NOT declare `"vrt"` (a layout field on a board with no layout is
  a contradiction, so it refuses). Its `make check` runs `netlist-agrees` (the
  usual notice when no schematic is declared) and then `bun test
  tests/circuits/<board>.test.ts`. **That test file is required for a `pcb` board
  whether or not `sch` is declared**, and `make check` fails naming it when it
  is absent. A `pcb` board never runs `veroroute`, `wiring`,
  `scaffold-membership` or `tools/cli/perfboard.ts check`; each of the verbs
  that act on a layout (`cuts`, `import`, `update`, `stripboard`, `edit`,
  `guide`, `place`, `adopt`, `scaffold-membership`, `check`) refuses on a
  `pcb` board, naming the verb and the kind.

`make/board.mk` reads the kind through the declaration loader
(`bun tools/cli/perfboard.ts board-info --field kind`), never by grepping JSON.
The routing is tested by `tests/perfboard/board-kind-make.test.ts`.

---

Drawing a board that has never had a schematic (design change C2)
------------------------------------------------------------------

`make draw` verifies the intent's net partition against the board's committed
netlist export before it drafts. A `pcb` board whose schematic is the thing being
drafted has no such export, so for a `pcb` board that declares no `"netlist"` the
verb SKIPS that step, continues to draft and render, and prints a block starting
`NO INDEPENDENT NETLIST:` saying the pre-draft partition check did not run, that
there is no schematic to export one from, and that the binding check is the
drafted page's own `kicad-cli` export compared with the model
(`tests/circuits/drafted-kicad-round-trip.test.ts`) once the page is committed.
It does NOT write a netlist derived from the model to stand in: a check that
compares the model with a copy of itself cannot fail. A perfboard board with no
`netlist` still refuses, and a `pcb` board that declares one still runs the check.
The step lives in `tools/draught/draw-partition.ts`; the tests are
`tests/draught/draw-board-kind.test.ts`.

**When the model has legitimately changed (a `pcb` board with a bound page).**
Once a `pcb` board declares `"sch"`/`"netlist"` as the previous drafted page and
that page's `kicad-cli` export, the netlist is no longer independent of the
page: it is an export of the previous page. The next `make draw` after a model
change then refuses, because the new intent no longer matches that export. The
refusal states both causes: the model moved on and the page is stale, or the model
is wrong. To tell them apart, compare the model change against its source (the
spec or datasheet). If the model change is the intended one, draft again with the
declaration's `netlist` pointed at nothing to compare (remove `sch`/`netlist` for
that draft, so the NO INDEPENDENT NETLIST block prints), repair and commit the
new page, then re-declare `sch`/`netlist` as an export of the new page. The
registered page tests (`tests/circuits/drafted-kicad-round-trip.test.ts`) are off
while the declaration is removed, so run them by hand before committing.

Two notices follow from the same rule, that a skipped check must never look like a
passing one. `make/board.mk`'s `netlist-agrees` passes `--kind` to
`schematic-notice`, and for a `pcb` board the notice says no layout check exists
and that the board's own `tests/circuits/<board>.test.ts` is what runs, instead of
the perfboard wording ("the check below still ran, against the layout"). And the
repo-root `perfboard.ts check` walk prints a `SKIP <board>: kind "pcb" has no
VeroRoute layout; its check is make -C boards/<board> check` line for each `pcb`
board; that line is not an `ok` and does not change the exit status.

---

Multi-page drawing (design change C3)
-------------------------------------

A board too large for one page is drawn **one page per functional block**, each block an
`include()`d sub-network of the model (`Network.blocks`), assembled into ONE hierarchical KiCad
project: a root sheet holding one sheet per block, each block's ports drawn as hierarchical
labels on its own page, joined on the root. **`kicad-cli`'s export of the assembled root is the
evidence of how the pages connect.** It was built and checked on a two-block test board,
`tests/fixtures/two-block-board/`, which is test data and never sent for review.

**Whether a board is multi-page is read from its circuit module, never guessed.** The module
exports `drawingPages()`, built by `tools/draught/drawing-pages.ts`'s `drawingPagesFromNetwork`
from the `Network`, the board-wide `DESIGNATORS` and `PIN_NUMBERS`, and one caption per block. A
module exporting it beside `drawingIntent()`, or a board also named in `COMMITTED_INTENT`,
refuses. The declaration (`tools/perfboard/declaration.ts`) says nothing new: a `pcb` board's
`sch` names the ROOT `.kicad_sch` and its `netlist` is the root's export, exactly as a one-page
board's name its one sheet and that sheet's export. There is no field saying "root".

**What a page's intent carries, and the two choices it makes:**

- **A private net is labelled by its UNPREFIXED model name.** `include()` names block `a`'s
  private `FB` net `a_FB` in the model; its page labels it `FB`. Two blocks therefore carry the
  same text for two different nets, which is safe **only because a private net's label is LOCAL
  to its sheet**. `tests/draught/drawing-pages.test.ts` tests the choice, and the fixture's
  negative control 3 is written against it.
- **A port net is labelled by its PORT name** - the name the block uses for it, which is also the
  root sheet pin's name. The root's label names the PARENT net the port is bound to; the two
  differ whenever an `include()` renames.
- **Every net on a page is `kind: "signal"`, so copperhead draws no power symbol on a block
  page.** copperhead infers ground and power from a net's NAME (its report says
  `GND=ground~ (~=inferred from the net name)`), and a KiCad power symbol joins every sheet of a
  hierarchy by name - a block's `GND` drawn as a symbol would reach the other pages without going
  through the root, so the root's wiring for it could be deleted and the round trip would not
  notice. `signal` is copperhead's documented override. The cost: ground and rails on a block page
  are labelled wires, not symbols.
- **A port reaching ONE pin of its block is left out of the intent**, because copperhead refuses a
  net with one endpoint; its hierarchical label goes on that pin. Each page's `ports` lists every
  port with its parent net, its pins and whether copperhead drafts it.

**`make draw` on such a board** drafts each page into `build/draw/<board>/<block>/<block>.kicad_sch`,
its intent beside that directory at `build/draw/<board>/<block>.intent.json`, and re-papers,
renders and measures each one (`tools/draught/draw-pages.ts`). The pre-draft partition check
runs **per block**, against the model's committed netlist restricted to that block's parts
(`verifyPageAgainstModel`, `tools/draught/draw-draft.ts`); with no netlist declared, the C2
`NO INDEPENDENT NETLIST:` block prints **once for the board**. It stops where `make draw` always
stops: each page is a copperhead draft with copperhead's labels.

**The repair adds two op-lists that a one-page board does not have**, committed and replayed like
any other (step 5.5):

- **per block, `tools/draught/hierarchical-labels.ts`**: on each port net, every copperhead label
  of the port's text is deleted and ONE hierarchical label added at the first one's place (or on
  the port's pin when copperhead drew none); further labels on that net become LOCAL labels of the
  same text, which join the hierarchical one on the sheet (measured with `kicad-cli`). Every
  GLOBAL label on a private net becomes local - copperhead marks a stubbed net global, and a global
  label joins every sheet by name. **Deletes go by the label's uuid**, never by position: akcli's
  `delete_object` on a point that misses is a "replay-safe note", not an error, so a missed match
  would leave the global label silently. `hierarchical-labels.ts check` is the post-condition (one
  hierarchical label per port, no global label), and the replay runs it.
- **the root, `tools/draught/assemble-root.ts`**: its starting text (`blank`; the uuid is seeded
  by the board's name because `akcli new` mints a random one, and the paper is US Letter from the
  start), then an op-list (`ops`) with one `add_sheet` per block, one sheet pin per port, each pin
  wired to a short stub ending in a LOCAL label that names the parent net. The arrangement is a
  fixed rule that puts every sheet symbol inside US Letter's inner frame, clear of the title block
  (`tools/draught/root-arrangement.ts`; ruling CR-MODULE-ROOT-FITS-LETTER). Each block is a cell
  sized from its port count and the lengths of its texts. Cells are packed tallest first (ties in
  `Network.blocks` order), each at the first free point, smallest y then x. Pins are 100 mil apart
  in name order, down the west edge, or down both edges when one edge cannot hold them within the
  frame (the h7 module's mcu, 90 ports). A board that cannot fit is refused, naming the block,
  rather than drawn off the paper. It is not a layout judged from the circuit. akcli 0.22.0 writes
  no justify on a sheet pin, and kicad-cli then centres a long pin name across the box edge
  (measured), so the h7 module's repair justifies every root sheet pin into its box
  (`draughting/repair/root_pin_justify.py`). The two-block fixture's root
  is not justified: it is test data and is never sent for review.
  `draughting/measure/paper_fit.py` does not measure a `(sheet ...)` box, so on a root,
  `draughting/measure/root_sheets_fit.py` is the check that every sheet
  symbol is on the paper.

**The committed form** is `drafted/<circuit>/<board>/`: `<board>.kicad_sch` (the root),
`<block>.kicad_sch` per block, one `RECORD.md` with a table row per sheet - the file name in backticks, its role
(`root`, or `block <name>`), and its sha256 in backticks - and `repair/` with one directory per block plus
`root/` and one `replay.sh` that reaches every sha256. The test fixture keeps the same form under
`tests/fixtures/two-block-board/drafted/`.

**The binding check** is `registerDraftedProjectTests` (`tests/circuits/drafted-project.ts`,
re-exported from `drafted-sheet.ts`): it exports the ROOT with `kicad-cli` and runs
`compareSheetToModel` on the whole board model, asserts every model component is drawn exactly
once across the sheets under its designator and on its own block's sheet, and checks every
sheet's sha256 against `RECORD.md`. `drafted-kicad-round-trip.test.ts`'s `PROJECTS` list asserts
the committed root export says what a fresh one says. **The three negative controls**
(`tests/circuits/two-block-project.test.ts`) edit a copy of the assembled fixture and each must
fail the round trip: deleting one sheet pin's wire at the root; swapping two sheet pins' wires;
and drawing both blocks' private `FB` as a GLOBAL label of the same text `FB`, which merges
`a_FB` and `b_FB`. The positive controls: the unedited copy passes, and the two LOCAL `FB` labels
stay two nets.

**What a block page shares with a one-page board** is everything after the intent: the same
draft, re-paper, render and measurement sequence (`tools/draught/draw-sheet.ts`, moved out of
`tools/cli/draw.ts` unchanged - the h7-carrier still drafts to its recorded sha256), the same
repair loop and repair classes, the same project symbol libraries (C4), US Letter, and the same
rule that no measurement withholds a page. **What is new** is the per-block intent, the
per-block partition check, the two op-lists above, the root sheet, and the project-level check.

**The page tools a multi-page board is repaired and checked with are in `draughting/pages/`**,
shared by every such board (moved there from `drafted/h7-platform/h7-module/repair/tools/` by the
H7 pedal plan's Task 4, so the next board does not carry a third copy). Each takes the board's
drafted directory, `drafted/<circuit>/<board>/`, as its first argument - never an environment
variable - and reaches the board's model through `boards/<board>/perfboard.json`
(`draughting/pages/board.ts`; the circuit module must export `DESIGNATORS`, `PIN_NUMBERS`,
`drawingPages` and `PROJECT_SYMBOL_LIBRARY`, as `circuits/h7-platform/module-board.ts` does):

- `sh draughting/pages/verify.sh <board-dir> <block> <sheet>`: one block page - its export against
  its block of the model, each port's label on its port's pins, the PWR_FLAG homes, ERC alone and
  under a one-block root, the `draughting/measure/` suite and the counts.
- `sh draughting/pages/verify-root.sh <board-dir> [project-dir]`: the assembled project - the
  root's export against the whole model, one PWR_FLAG per flagged net, each cross-page driver
  cleared by its real driver, the root's ERC against the `.kicad_pro`'s exclusions, and the paper.
- `sh draughting/pages/render.sh <sheet> <out-dir> [<page> | root]`, and
  `sh draughting/pages/render-control.sh <board-dir> <block>`, its controls.
- the repair steps a board's `replay.sh` runs: `ports.ts`, `net_strokes.py`, `place.py`, `pins.py`,
  `text_edits.py` and `page.py` (`Wiring`, which takes the title block's date from the board), and,
  for the root, `root-flags.ts`, `root_flag_refs.py` and `kicad-pro.ts`.

**What stays with the board** is its data, in `<board-dir>/repair/tools/`: three declared tables,
each under the ruling it names - `pwr-flag-homes.ts` (where each shared net's single PWR_FLAG
lives), `cross-page-drivers.ts` (each signal net whose driver is on another page) and
`erc-allowances.ts` (each ERC error a page's check excuses) - and `title_block.py` (the date its
pages' title blocks carry). The shared tools hold every table to the model on every run. **A
missing table is refused**, naming the file and why it is not defaulted: an empty table would be
a claim about the board that nobody made. Also with the board are its CONTROLS, which name its
own pages, nets and pins (the h7 module's `erc-control.sh`, `root-control.sh` and
`port-label-control.sh`), run through the shared tools.

**What C3 does not cover:**

- **One level only.** `include()` refuses a network that itself includes blocks, so there is no
  nested hierarchy to draw.
- **No `.kicad_pro` is written beside a project** by the C3 tooling. KiCad's defaults apply, the
  sheet instances name the project `noname`, and ERC on the fixture's root ran with KiCad's default
  severities (0 errors, 0 warnings). A board may commit one beside its root: the h7 module does,
  carrying only its declared ERC exclusion (`docs/h7-platform/decisions.md`,
  CR-MODULE-ROOT-PROJECT-FILE), and kicad-cli 10.0.5 honours a `.kicad_pro`'s `erc_exclusions`
  (measured; `draughting/pages/kicad-pro.ts`, which writes it from the board's `erc-allowances.ts`).
- **A sheet pin's type and a hierarchical label's shape are both `input`**, because that is the
  shape akcli 0.22.0 writes a hierarchical label in; KiCad's connectivity ignores both.
- **Ground and rails as labelled wires on a block page** is a consequence of refusing power
  symbols, not a reviewed drawing choice. Whether a block page may draw a power symbol for a net
  bound to a root net of the same name is open.

---

Project symbol libraries (design change C4)
-------------------------------------------

A part with no stock KiCad symbol is drawn from a project library: a committed
`.kicad_sym` beside the circuit (the H7 platform's is
`circuits/h7-platform/h7-platform.kicad_sym`). The circuit module exports its
absolute path as `PROJECT_SYMBOL_LIBRARY`; `make draw` reads it
(`tools/draught/draw-draft.ts` `projectSymbolLibrariesFor`). The nickname is the
file name without `.kicad_sym`.

- **The draft** gets a COPY of the library in its own directory (`build/draw/<board>/`)
  and a `sym-lib-table` row `${KIPRJMOD}/<file>`, so the draft resolves by itself.
- **The committed page** (`drafted/<circuit>/<board>/sym-lib-table`) references the
  library IN PLACE in the repository, by a relative `${KIPRJMOD}/../../../circuits/...`
  path, so there is one copy of each symbol. The repair's `replay.sh` makes that
  table and requires it byte-identical to the committed one.
- Every symbol is also embedded in the sheet. Proved end to end by
  `tests/circuits/h7-project-symbol.test.ts`.

---

Packages with more than one unit (design change C6)
---------------------------------------------------

A package with more than one unit - a dual op-amp, a gate pack - is lowered to KiCad pin numbers
from its OWN part, unit by unit: `part.symbolPins[<unit name>][<pin>]` for a unit's pin and
`part.symbolPins.package[<pin>]` for a pin the package shares (a supply). A per-kind
`PIN_NUMBERS[kind][pin]` cannot do it, because every section names its pins alike: both sections
of a dual landed on section A's pins (issue 28, finding 1, both inputs on `U1.3`). **A single-unit
part is unchanged** and keeps the per-kind path, even when it declares `symbolPins`.

- **The lookup** is `lib/kicad/unit-pins.ts`'s `symbolPinTable`. It refuses a multi-unit component
  with no `symbolPins`, naming the component and its units; a unit or package pin with no number; a
  number for a pin the model lacks; a key that is neither a unit nor `package`; and one number given
  to two pins.
- **Wherever a component's pins are listed by one string, a unit pin of a multi-unit part is keyed
  `<unit>/<pin>`** (`pinKey`): `everyPin`, `pinNumbersFromTable`, and the pin-number map
  `compareSheetToModel` takes. Package pins and single-unit pins keep their own names, so every
  existing map is unchanged.
- **copperhead needs nothing new.** The intent names `REF.<number>`, and copperhead places each unit
  of a multi-unit symbol as its own instance from the pin numbers.
- **Reading a symbol unit by unit** is `symbolUnitPins` (`lib/kicad/symbol-library.ts`),
  `{ unit, pins }[]` in unit order. The flat `symbolPins` and `symbolStrokeSegments` still refuse a
  multi-unit symbol: the first would merge the units' pins, and nothing on the drawing path needs
  the second.
- **The fixture** is `tests/fixtures/dual-opamp-board/`: one `Amplifier_Operational:TL072` with both
  sections as buffers and its supplies, drafted by `make draw`'s program and committed with its
  replay (no repair was needed). Test data, never sent for review. `tests/kicad/multi-unit.test.ts`
  exports it fresh with `kicad-cli` and compares it with the model; its controls swap A's and B's
  mappings, and duplicate A's onto B, and each fails.

**Where the spec's citations point, measured.** The spec cited
`tools/draught/intent-from-network.ts:100-102`, `lib/kicad/from-network.ts:69-72` and
`lib/kicad/sheet-agreement.ts:267`. At the commit this change started from (`04ce50e`) the code
was at:

| what | before (`04ce50e`) | after this change |
| --- | --- | --- |
| intent: the pin walk and its lookup | `tools/draught/intent-from-network.ts:109-111` | `:112-114`, through `pinKey` |
| `pinNumberFor`, the per-kind lookup | `lib/kicad/from-network.ts:69-70` | `:75`, the multi-unit branch at `:76` |
| `everyPin` | `lib/kicad/from-network.ts:85` | `:104` |
| `pinNumbersFromTable` | `lib/kicad/from-network.ts:97` | `:116` |
| `toImportedNetlist`'s pin walk | `lib/kicad/from-network.ts:205` | `:224-228` |
| `resolvePins`, the unit-pin lookup | `lib/kicad/sheet-agreement.ts:263`, `:299` | `:268`, `:304` |
| the multi-unit symbol refusal | `lib/kicad/symbol-library.ts:242`, `:257` (`supportedUnitSymbols`) | `unitSubSymbols` `:232`, `singleUnitSubSymbols` `:259`, `symbolUnitPins` `:339` |
| the Pultec pin builder's `symbolPins` refusal | `tests/circuits/sheet-pin-numbers.ts:149` | multi-unit routed to `symbolPinTable` at `:151` |

Those line numbers are a transcription of the day this was written; the code is the authority.

**What C6 does not cover:** a multi-unit part that is OFF-BOARD on a perfboard
(`tools/guide/off-board.ts` numbers its pins by canonical name and would refuse one), and a symbol
that repeats a pin number across units (refused by `symbolUnitPins` and by copperhead alike).

---

The failure mode this document exists inside
--------------------------------------------

**Writing tooling instead of drawings is the pathology that stopped this work
twice**, and `DEVELOPMENT-LOG.md` §0 records the owner's words on it. A third
recurrence began the session that produced this procedure: six tools were ranked
in committed documents with judgement asked on no drawing, and **he caught it -
no agent and no review did.**

So the rule that governs reading this file: **a drawing is the unit of
progress.** Tooling earns its place by producing one, and a class of repair earns
automation once it has been seen on two boards. One sighting is not a pattern.

> *"Fixating on a very literal detail is a symptom of autistic literalism that
> you have, stemming from the lamp post problem."*

**Whenever a task offers something concrete to copy or count, expect the concrete
thing to absorb the attention the hard thing needed.** The measurable defects are
the minor ones; the defects that make a drawing unreadable - rat's nests,
senseless placement, orientation goofiness - are the ones no check here detects.
