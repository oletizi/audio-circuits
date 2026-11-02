---
name: drawing-a-schematic
description: Use when drawing a new KiCad schematic for a board in this repository, or when repairing/revising a page that already exists under drafted/ or build/draw/. Covers the draft-then-repair loop, the mechanical make targets that do the toolchain-check/draft/render/measure part of it, the measured traps and false greens in that loop, and the ordering rule for sending a render to the reviewer. Fires on "draw the schematic", "draft a sheet", "repair this page", "re-render", "fix the hairpin/label/crossing on <board>", or any task that will produce or change a .kicad_sch a person is meant to look at.
---

# Drawing a schematic

**This skill carries the judgement a `make` target cannot hold.** `make
draught-doctor` and `make draw` do the mechanics - checking the toolchain,
drafting, re-papering, rendering, measuring. Everything after that - choosing
among drafts, repairing with `akcli`, deciding what a hairpin or a label is
telling you, and sending the result out - is judgement, and this skill is
where it lives.

**Three documents outrank this one, in this order, and this skill restates
NONE OF `EVALUATING-DRAWINGS.md`'s CRITERIA:**

> **That sentence used to read "and this skill restates none of them", which
> this skill's own body contradicts - the final review's M-4.** It reproduces
> `TOOLING.md`'s trap index, its false-greens list and its verification
> table, because the spec requires this skill to carry them: a trap you have
> to go and read another file to learn about is a trap you walk into. The
> duplication is sanctioned and the sentence was what was wrong. **Two copies
> of one table is still a drift risk this branch treats as a defect
> elsewhere, so the rule is: `TOOLING.md` is the original, a disagreement
> between the two is a bug in one of them, and nothing is edited HERE only.**

1. `EVALUATING-DRAWINGS.md` - canonical on drawings. Who may judge one, what
   counts as a valid evaluation, what an agent may say about one. **This
   skill points at it and does not summarise, paraphrase or restate its
   criteria anywhere below.** Read it before drawing anything. This is the
   one of the three that is genuinely never restated here, and it is the one
   where restating would do the damage.
2. `TOOLING.md` - the reference procedure: the pinned toolchain, the full
   loop, the repair classes, what the procedure does not yet cover. This
   skill is the invocation of that procedure, not a replacement for it, and
   it does carry copies of three of its sections - see the note above. Any
   place this skill and `TOOLING.md` disagree is a bug in one of them -
   report it rather than picking a side.
3. `CLAUDE.md` - the conventions every circuit and every drawing session
   follows, including the control-character-escape rule and the commit
   discipline below.

## The loop

`TOOLING.md`'s loop, in the order it runs:

0. Work out which way authority runs for this board - model-authoritative
   (an agent-designed circuit) or schematic-authoritative (an imported
   design, like the Pultec). Get this backwards and you edit the wrong
   artifact.
1. Build or locate the copperhead intent and verify its net partition against
   the model's committed netlist export, as sets of `REF.PIN` sets.
2. Draft with copperhead, and draft more than one group arrangement. **The
   word for when to stop is `TOOLING.md`'s, it is in quotes there, and it is
   undefined** - its §2 says *"Try more than one if the first is unusable"
   does not define unusable*, and calls this *"the largest undocumented
   decision in the loop."* So it is not this skill's judgement about a page
   and must not be read as one (final review M-4): it is a quoted,
   attributed, admittedly empty criterion. What §2 asks of you instead is a
   record - which arrangement you took and why - and it gives the worked
   example where a measured number was traded against a structural property
   with nothing written to adjudicate it.
3. Render, and look at the render. A netlist match is not a substitute for
   this step.
4. Repair with `akcli` - query geometry first, dry-run every op-list, read
   the net diff.
5. Re-render, look again, iterate. Driving a measurable cost (crossings,
   corners, hairpins, wire length, label count) down is work to automate, not
   hand back.
6. Hand the page to the reviewer - see "The ordering rule" below.

**A REPAIR OF AN EXISTING PAGE SKIPS STEP 2 ENTIRELY.** `TOOLING.md` is
explicit: *"THE DRAFT STEP IS SKIPPED ENTIRELY WHEN THE STARTING POINT IS AN
EXISTING PAGE."* A page already under `drafted/` that the reviewer has seen
is not re-drafted in order to follow the loop from the top - steps 3 through
6 run directly against it. Re-drafting a page he has accepted throws away
work only he is positioned to have approved.

## Running the mechanics: `make draught-doctor`, then `make draw`

Run `make draught-doctor` first, from anywhere - it is machine-wide, not
per-board, and names every disagreement between `draughting/tools.lock.json`
and what is actually installed. Do not proceed past a disagreement it
reports.

**`make draw` WILL STILL DRAFT PAST SOME OF WHAT IT REPORTS, AND THAT IS
DELIBERATE, NOT A HOLE.** `make draw`'s own pre-draft gate refuses only on the
tools the drawing path spawns - copperhead, `kicad-cli`, `magick` - and prints
every other lock disagreement as an ADVISORY section beside the page.
`akcli`, `qpdf`, `numpy` and `pillow` are pinned and are not on that path, so
a disagreement in one of them is reported and drafted past. **Read the
advisory**: it is still a real finding about this machine, and `make
draught-doctor` is where it refuses. Controller Ruling 1 of the final review's
fix round 2, on the owner's directive behind `docs/known-gaps.md` G303 - *"if
I can't look at it, I cant decide if the refusal is for dumb reasons."*

Then, for a fresh draft, run `make draw` from the board's own directory, or
`make -C boards/<board> draw` from outside it. There is deliberately no
`BOARD=` variable or environment variable - the verb reads `process.cwd()`,
the same as `check`, `bom` and `cuts` (`docs/known-gaps.md` G308, the owner:
*"I hate using environment variables"*). Passing `BOARD=` anyway is silently
ignored, not an error.

**Three things `make draw` does that this skill exists to carry forward,
because an agent that does not know them will get a wrong result without
noticing:**

1. **COPPERHEAD CANNOT DRAFT TO US LETTER.** Its draft engine's own paper
   table (`draughting/copperhead/src/kicad/draft/engine.ts`, the `PAPERS`
   table near line 219) holds only the ISO series, A5 through A0 -
   `USLetter` appears nowhere in that file. The table that does know
   `USLetter` belongs to a different consumer, the legibility checker.
   Asking the draft engine for `USLetter` produces the note *"paper hint
   'USLetter' is not a standard size; deriving paper from content"* and an
   A4 sheet, silently. **Every page must be re-papered after drafting** -
   `make draw` does this itself, via `repaperToUSLetter` in
   `tools/draught/draw-render.ts`, immediately after copperhead drafts and
   before rendering. If you are ever drafting outside `make draw` - by
   hand, or from a script - you must call the same re-paper step yourself.
   All five approved Pultec pages are `USLetter`; the owner has no A3 or A4
   printer.
2. **`make draw` IS A MECHANICAL DRAFT AND STOPS BEFORE THE REPAIR STEP.**
   It runs the toolchain check, resolves and verifies the intent, drafts
   with copperhead, re-papers, renders with `kicad-cli`, runs the
   measurement suite - **`selftest.py` first**, then
   `draughting/measure/crossings.py`, `junction_audit.py` and
   `label_survey.py` - and writes one whole-page crop. The selftest runs
   first so that one run's output carries its own evidence that the shared
   reader those three depend on can still tell a difference; a failing
   selftest is loud and withholds nothing.
   **It never calls `akcli`.** Repair - step 4 of the loop above - is
   judgement work this skill is responsible for, not something any verb
   performs for you. A board's intent comes from one of two declared sources: a committed
   file in `COMMITTED_INTENT` (`tools/draught/draw-draft.ts`; only
   `pultec-hi-cut` is registered, though all five Pultec boards have intents under `docs/research/` - hi-cut,
   hi-boost, low-cut and mid in their `2026-10-29-<board>-full-run/`
   directories, low-boost in `2026-10-29-copperhead-against-the-idiom/inputs/`), or a `drawingIntent()` export on a
   model-authoritative circuit (`transistor-preamp-staged` is the first). A
   board with neither refuses by name, and so does one with both
   (`tools/draught/draw-intent.ts`).
3. **IT NEVER WITHHOLDS A PAGE FOR A LAYOUT REASON.** See "Never withhold a
   drawing" below - this is the same rule, stated here because `make draw`'s
   own behavior is where it is easiest to verify: the measurement suite's
   findings and a paper-fit overflow are printed beside the page, never used
   to refuse writing it.

## The trap index

Each of these cost a pass of this loop before it was written down. Read this
before you query geometry, write an op-list, or grep a sheet.

- **`akcli draw --ops ... --apply` - `--apply` IS NOT OPTIONAL AND ITS
  ABSENCE IS SILENT.** Without it, `akcli draw` is a dry run that exits 0
  having written nothing, and there is no `akcli apply` verb. A netlist
  comparison run afterwards then reports `IDENTICAL` - because nothing
  changed, not because the repair was net-neutral.
- **`akcli pins <lib_id> --at X Y ... --json` MIXES UNITS.** Given an `--at`
  in millimetres, its absolute `y_mil` figures come back as the mm value with
  a ±150 mil offset added to it. The spacing between two pins from this
  command is right; the absolute positions are not. Use it for pitch and
  extent only, and read absolute pin positions out of the sheet's own
  `lib_symbols` block.
- **A field renders horizontally when `(symbol rotation + field angle) mod
  180 == 0`.** This is NOT "set the angle to 0" - a part turned from 0 to 270
  and left at `angle 0` renders vertical. `move_component` carries per-part
  field offsets and the field angle together; rewrite both as literals when
  you move a part, and look at the moved part in a rendered crop with its
  neighbours - this class is invisible to every automated check here.
- **A global label's tag is a shape KiCad draws the wire *through*.** A
  label placed without checking what else occupies that span can sit over a
  pin number, a pin stub, or its own wire. Only the render finds this - no
  count on the page sees it.
- **A sheet holds wires, symbols and pins in TWO TEXTUAL FORMS** -
  copperhead's pretty-printed block form and akcli's one-liner. A pattern or
  script written against one form silently drops every instance in the
  other. `TOOLING.md` records this recurring in four separate parsers on this
  branch, each time dropping roughly a third of what it was supposed to
  count. Count tokens and parse by block; refuse when two counting methods
  disagree rather than trusting either alone.

## The false greens

A check exiting 0 is not evidence the thing it checked is sound. These are
measured, not hypothetical:

- **`kicad-cli sch export netlist` exits 0 on a parenthesis-broken sheet.** A
  depth error left a sheet at parenthesis-depth −1 and the export wrote
  well-formed, empty XML - no error. Put a parenthesis-depth counter in the
  loop and compare net sets, never the exit code (`TOOLING.md`).
- **Chrome exits 0 when it prints nothing.** `tools/guide/print-pdf.ts`
  records this for the build-packet path
  (`docs/research/2026-10-30-single-document-packet.md`) - an empty PDF is
  not distinguishable from a successful one by exit code alone.
- **`qpdf` exits 3 on success, with warnings.** The same packet work found
  this measured fact; a non-zero exit from `qpdf` is not on its own a
  failure (`docs/research/2026-10-30-single-document-packet.md`).
- **`akcli check --layout` has been wrong in both directions.** It has
  reported zero findings on a page that drew values across their own plates,
  a reference and value inside a pot's own body, and a rail through the
  title block (`TOOLING.md`); and, separately, it has claimed an overlap
  where a render measures 1.9 mm of open space and called a label-over-wire
  collision on the label's own net, twice, on the same page
  (`docs/schematic/verdicts.md`). Run it; do not trust either a pass or a
  finding without a render to check it against.

`docs/schematic/false-greens.md` catalogues the wider set of mechanisms this
branch has found for a check reading green while establishing nothing; it is
written for test and tooling code generally, not schematics specifically, but
the discipline it argues for - a control that could have answered
differently, a positive before a negative - applies here too.

## The verification set

Report each of these before and after a repair, as a number that could have
come out differently. None of them is a judgement of the drawing -
`EVALUATING-DRAWINGS.md` §6 is explicit that an automated check is
peripheral, may be run and reported, and may never approve or rank.

| measure | how |
| --- | --- |
| netlist pin sets and net names identical to the model | `kicad-cli sch export netlist --format kicadxml`, compared as sets |
| ERC violations | `kicad-cli sch erc`, or `akcli check` - report errors and warnings separately, with the exact invocation |
| parenthesis depth | a counter in the check loop; must be 0 |
| true wire crossings, distinguished from T-meetings | |
| T-meetings, and whether each carries a junction dot | |
| orphan junction dots, out of total | `draughting/measure/junction_audit.py`, which counts pins as well as wires |
| duplicate on-page labels per group | a label survey script; zero after a collapse pass |
| per-net wire stroke consistency | a net drawn in two colours reads as two nets |
| symbol count, pin count | should be unchanged by a repair |
| wire count, total wire length | |
| sha256 of the sheet | the binding a verdict is recorded against |

## Never withhold a drawing for a layout reason

`EVALUATING-DRAWINGS.md` §3 permits exactly one ground for withholding a
page: a drawing whose connectivity disagrees with the circuit model, or that
fails ERC - there is nothing to evaluate, because the drawing says a
different circuit. **A legibility check, a lint count, a measurement, or an
agent's own view that a page is not ready yet is never a ground to withhold
it.** The owner, 2026-10-30: *"we need to get rid of this stupid refusal to
generate on error. If I can't look at it, I cant decide if the refusal is for
dumb reasons."*

This is why `make draw` prints the measurement suite's findings and a
paper-fit overflow beside the page it writes, rather than refusing on either
- see "Running the mechanics" above. The one check that is allowed to stop a
draft before it starts is the intent-versus-model net-partition comparison in
step 1, because a disagreement there is exactly the §3 ground: the sheet
would say a different circuit before a single coordinate is drafted.

## The ordering rule: renders go out before any summary

`EVALUATING-DRAWINGS.md` §4: a message carrying a drawing carries a question
and nothing else. **The remedy that makes this checkable is an ordering, not
a gate: when a drawing exists, it goes out before the summary, not after
it.** A report built from measurements with no drawing attached can satisfy
"a drawing plus an assessment" by containing neither, while defeating what
the rule protects - choosing which measurements to report is itself the
judgement the rule exists to keep out of an agent's hands.

**An agent that cannot send files directly lists its render paths at the top
of its hand-back**, before any other content, so whatever receives the
report can open them before reading a word about them. Observations - what
is on the page, stated so another reader could check it - may follow after,
in the vocabulary `EVALUATING-DRAWINGS.md` §2 allows. A verdict never does;
that is the reviewer's alone, and the forbidden-vocabulary list in §2 is not
repeated here - go and read it.

## The criteria

**This skill does not say what makes a drawing worth reading, and must
never be edited to say so.** `EVALUATING-DRAWINGS.md` is canonical on that
question - its principles, its style preferences, and the nine numbered
rules on who may judge a drawing and how one is handled. Read it before you
draw, before you repair, and before you write anything to the reviewer about
either.
