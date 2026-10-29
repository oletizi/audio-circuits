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
judgement. `DEVELOPMENT-LOG.md` records it; `lib/schgen/` remains the
model-to-sheet generator and is not what draws the pages he has accepted.

---

The toolchain
-------------

| tool | version used | licence | where it comes from | what it does here |
| --- | --- | --- | --- | --- |
| **copperhead** | `0.12.0`, commit `476cc15965f0d1eeda70afb9e806936f6bb15c5c` (2026-10-22) | Apache-2.0 | `github.com/copperheadhq/copperhead` | drafts the sheet from the intent |
| **akcli-kicad** | `0.22.0` (protocol 2) | MIT | PyPI `akcli-kicad`, upstream `github.com/tipoLi5890/akcli` | repairs the sheet; queries pin geometry |
| **kicad-cli** | `10.0.5` | GPL-3.0 | `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli` | renders, exports netlists, runs ERC |
| **tsx** | `4.23.1` on node `v22.19.0` | MIT | npm, via `npx` | **this is what actually runs copperhead's CLI** |
| **bun** | `1.3.8` | MIT | bun.sh | runs this repo's own `tools/schgen/*.ts` |
| **Python** | `3.14.6` | PSF | system / venv | akcli's venv, every check script, direct sheet edits |
| **ImageMagick** | `7.1.1-47 Q16-HDRI` | ImageMagick | `brew install imagemagick` | **every PDF to PNG conversion and every crop** |
| **git** | any | GPL-2.0 | system | copperhead **refuses to draft** outside a git repository |

**CONFIRMED by running each one**, not read off a lockfile: every version string
above came from `--version` or `git rev-parse` on the actual installed artifact.

**Two entries are corrections, and both were found by a third board being drawn
by an agent that had not drawn the first two:**

- **copperhead is invoked with `npx tsx src/cli.ts`, not `bun src/cli.ts`.** The
  committed `draft.py` uses tsx, so tsx is the measured path. This file said
  `bun` until the hi-boost run, and **nothing has ever measured that path.**
  `bun` is still required, for `bun tools/schgen/board-sheets.ts`, which produces
  the sheet the intent is verified against.
- **ImageMagick and git were missing from this table entirely**, and the loop
  cannot produce a picture anyone can look at without ImageMagick. A toolchain
  list assembled from what you remember using omits the tools that worked.

Reproducing it:

```
git clone https://github.com/copperheadhq/copperhead.git
git -C copperhead checkout 476cc15965f0d1eeda70afb9e806936f6bb15c5c
cd copperhead && npm install

python3 -m venv venv-akcli
./venv-akcli/bin/pip install 'akcli-kicad==0.22.0' numpy pillow
./venv-akcli/bin/akcli doctor
```

**`numpy` and `pillow` go into the SAME venv**, because `pixeldiff.py` and
every pixel measurement run under `venv-akcli/bin/python`. Only a docstring said
so, and the fourth board had to install them. **The two committed `run.sh`
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

### NEITHER TOOL IS PINNED IN THIS REPOSITORY, AND THAT IS A STANDING RISK

Both have so far lived in an agent session's scratchpad, which `git clean -fdx`
and session rotation destroy. **Three accepted pages depend on tools that no
committed file installs.** This table is the whole of the pinning: there is no
lockfile, no submodule, no vendored copy, and no check that the installed
versions match these.

**What would settle it** is a decision nobody has made: vendor, submodule, pin
in a manifest, or accept the drift. Until then, **re-record the versions you
actually used in your run's findings document**, because a procedure that names
versions it does not enforce is a transcription with a date on it.

---

The loop
--------

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
cd <copperhead-src> && npx tsx src/cli.ts --repo <board-dir> draft schematic --intent <path>
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
   `docs/research/2026-10-29-hi-boost-full-run/scripts/junction_audit.py`.

   **DO NOT USE `scripts/orphan_junctions.py` FROM THE LOW-CUT RUN. It is
   wrong.** It counts wire endpoints only, so it calls a rail passing through a
   symbol pin an orphan: it reported **6 orphans on a page that has none.**
   `junction_audit.py` resolves pin positions from the sheet's own `lib_symbols`,
   counts pins as well as wires, **and reports the converse that no committed
   script covered - a wire-to-wire tee carrying no dot**, which is a real
   connectivity defect rather than a cosmetic one.

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
- **`boxgeom.py` NAMES THE WRONG REFERENCE FOR A RECTANGLE'S EXTREME POINTS.**
  On `pultec-hi-cut` it reports `SW1` as the top-most and bottom-most item
  inside the **Lo boost** and **Mid** rectangles, where no `SW1` exists - it is
  50 mm away in another group - and gives Lo boost a bottom margin of **0.00 mm**
  where the render shows 2.5 mm of space. Its margins for the group that was
  checked by hand agree to the micrometre, so **the aggregate min/max is usable
  and the per-point naming is not.** Do not quote a `bottom-most 'REF'` line
  without checking that the part is in that rectangle.
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
| orphan junction dots, out of total | `docs/research/2026-10-29-low-cut-full-run/scripts/orphan_junctions.py` |
| duplicate on-page labels per group | `docs/research/2026-10-29-low-cut-full-run/scripts/label_survey.py`; **zero after the collapse pass** |
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

- **Building the intent file is not automated.** There is no committed tool that
  derives a copperhead intent from a `Network`. Each board's intent has been
  hand-built and then verified against the model. **This is the obvious
  candidate for glue**, and it is glue rather than an algorithm - it computes no
  coordinate.
- **Group assignment is a judgement with no stated method.** Which parts share a
  group, and in what order, is the main lever on the output and the records show
  it being chosen by trying several.
- **Neither tool is pinned**, as above.
- **The verdict record substrate is not built.** `docs/schematic/verdicts.md` is
  interim markdown; the designed form is a `drafted/<circuit>/<board>/` tree with
  a GNU recutils register and a staleness check. **The status vocabulary is
  unnamed** and is the owner's to name - an agent may not author the words its
  own output is judged in.
- **SVG stability across machines, KiCad versions and font sets is unmeasured.**
  `sha256(svg minus the generation-title line)` is byte-stable on one machine,
  measured; whether it survives a font substitution is not known, and an
  approval bound to it would read as a withdrawn signature if it drifted.
- **`tools/draught/gate.ts` is committed and known inadequate.** It matched a
  netlist exactly on the A5-overflowed page. It is structurally incapable of the
  class of defect that matters, and nothing has replaced it.
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
