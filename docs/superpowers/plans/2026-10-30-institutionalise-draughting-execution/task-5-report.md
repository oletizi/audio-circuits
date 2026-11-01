Task 5 report: `make draw`, context-directed
==============================================

**Status: done. Commit `7505225` on `feature/schematics-tooling`, not pushed.**

Files: `tools/cli/draw.ts` (new), `make/perfboard.mk` (modified, `draw` target
added beside `draught-doctor`), `tests/draught/draw.test.ts` (new).

Test summary
------------

`bun run typecheck`: clean.

`bun test tests/draught/`: 30 pass, 0 fail, 89 expect() calls (was 24 before
this task; +6 from `draw.test.ts`, the required refusal test plus five more
covering the undeclared-board refusal, the no-perfboard.json refusal, the
net-partition-disagreement refusal, the real end-to-end draw, and the
drafted/-untouched check).

Full `bun test`, run alone, observed rather than predicted: **2759 pass, 0
fail, 38654 expect() calls, across 264 files** (the task's own stated
baseline was 2753/0/263 - the delta is exactly this task's one new file and
six new tests).

`make -C boards/pultec-hi-cut draw`, verbatim
----------------------------------------------

```
draft (copperhead, intent /Users/orion/work/audio-circuits-work/pultec-modularize/docs/research/2026-10-29-hi-cut-full-run/intent-v4-blocks-mid-late.json):
drafted: 6 group(s), 77 wire segment(s), 26 label(s), 1 no-connect(s) on A4
  group "Junction": J1, J2
  group "Hi boost": SI1, SI2
  group "Lo cut": SI3
  group "Lo boost": SI4, SI5
  group "Mid": SI6
  group "Hi cut": C1, C2, C3, C4, C5, C6, C7, C8, C9, C10, R1, RV1, SW1
  net classes: cut_wiper=signal, GND=ground*, hi_boost_out=signal, hi_tap=signal, in=signal, lo_boost_in=signal, out=signal, sel_common=signal, sel1=signal, sel2=signal, sel3=signal, sel4=signal, sel5=signal, sel6=signal (*=IR override)
  PWR_FLAG synthesized on: GND
  sheet fit: A4, ink 23% of the usable frame, compaction failed
  note: sheet not compacted: the natural layout fits A4 at 23% utilization, but no smaller sheet holds the reflowed content (A5 186x106 mm vs 190x94 usable)
  note: groups wrapped onto 2 rows to fit the sheet
  note: placement search: SI5 turned 180 degrees, SI2 turned 90 degrees, cut_wiper labelled; label overlaps 0 to 0, wire crossings 9 to 8

render (kicad-cli + ImageMagick):
Plotted to '.../build/draw/pultec-hi-cut/pultec-hi-cut.pdf'.
Done.
Plotted to '.../build/draw/pultec-hi-cut/pultec-hi-cut.svg'.
Done.

measurement suite (draughting/measure/):
crossings.py:
  wires 77  (horizontal 52, vertical 25)
  TRUE CROSSINGS (X): 8   T-meetings: 2
junction_audit.py:
  wires 77   symbol pins 63   junctions 8
  ORPHAN JUNCTIONS: 0
  WIRE-TO-WIRE TEES: 2   without a dot: 2
  COLLINEAR OVERLAPPING PAIRS: 2 (the known tee-without-a-dot artefact, not a connectivity defect)
  PINS ON A WIRE INTERIOR: 0   without a dot: 0
label_survey.py:
  26 label(s) on 13 net(s); the full per-net gap table follows (unchanged content, omitted here for length - see the committed test output / terminal transcript)

EXIT=0
```

(Full label_survey.py output - every gap distance for `cut_wiper`, `hi_boost_out`,
`hi_tap`, `in`, `lo_boost_in`, `out` and the six `sel*` nets - was produced and
printed; it is reproduced in full by running the command again, per this
project's "a measurement goes in a tool that re-runs it" rule, rather than
pasted twice here.)

Comparison against the committed page
--------------------------------------

The five `drafted/` sha256 digests are **unchanged** (checked before and
after the real run); `pultec-hi-cut`'s is
`e9843e6dbd3f765822e34bf51cd0d3d2659f0a6969c4c9a866e7691727bdf332`, matching
`drafted/pultec/pultec-hi-cut/RECORD.md`'s own binding. `git diff -- drafted/
docs/schematic/verdicts.md schematic/readability-baselines.json TOOLING.md`
is empty. `git status --short` is clean after the commit.

The fresh draft (`build/draw/pultec-hi-cut/pultec-hi-cut.kicad_sch`, sha256
`2bb49cfce8b80dbde4afac44a16fe3c9d19f045d739385daf787b203b00ab876`, 67478
bytes) does **not** match the committed page
(`e9843e6d...`, 59404 bytes) byte-for-byte. Run through
`draughting/measure/netcmp.py` with its own positive control (moving `SI5.2`
in a copy and confirming the comparator then reports a difference):

- **NET PARTITION (pin sets, ignoring net names): IDENTICAL** - the two
  sheets are electrically the same circuit.
- **NET NAMES: DIFFER** - `cut_wiper` (fresh draft) vs `/cut_wiper`
  (committed page), a label-scope difference `TOOLING.md`'s own open
  questions already name ("Label scope changes the exported net name...
  Three nets were renamed on hi-boost for one consistent label style").
- Paper size differs: fresh draft is `A4`; committed page is `USLetter`,
  re-papered and centred.

**Why, and why this is expected rather than a defect.** The committed page's
own `RECORD.md` states its provenance: "Produced by copperhead draft
`v4-blocks-mid-late`, then akcli repairs and a field-restating pass; then
re-papered to `USLetter` and translated 21.59 mm west to centre it." `make
draw`'s Step 3 order (toolchain, intent, verify, draft, render, measure,
crop) stops before any of that: akcli repairs, field restating and
re-papering are the judgement-laden work `TOOLING.md` itself separates from
the mechanical steps ("Group assignment is a judgement with no stated
method"; repair classes 5-8 are all akcli, none mechanical). `make draw`
drafts the SAME intent raw and renders it as copperhead left it. The
`netcmp.py` result is the evidence that this is a repair/paper difference and
not a circuit difference.

What was driven (fault injection, per the standing instruction)
-----------------------------------------------------------------

1. Disabled the toolchain-refusal guard (`if (false && problems.length > 0)`)
   - the first test failed (timed out trying to draft with a bogus tool in
   the lock rather than refusing). Reverted; `git diff` on the file was empty
   afterward.
2. Removed the crop-writing block from `renderSheet` - the real end-to-end
   test's crop-file assertion failed as expected. Reverted; `git diff` empty
   afterward.
3. The net-partition-disagreement test (a corrupted intent with one pin
   dropped from a real net) and the real full-run test (the same, uncorrupted,
   committed intent) are themselves a paired positive/negative control on
   `verifyIntentAgainstModel`: one refuses, the other proceeds to a successful
   draft, against the same comparator.

Canary'd scan (control-character bytes) over the three touched files -
`tools/cli/draw.ts`, `make/perfboard.mk`, `tests/draught/draw.test.ts` -
planted a real NUL in a throwaway file first, confirmed the detector fired,
then scanned: all three clean.

`git show HEAD:CLAUDE.md` vs the working copy: **identical**, no drift.

Account of what was absorbed (enumerate-and-account)
-------------------------------------------------------

Against `docs/research/2026-10-29-hi-cut-full-run/draft.py` and `run.sh`:

- **carried**: `.copperhead/config.json` + `schematic.intent.json` + `git
  init -q` + `npx tsx .../src/cli.ts --repo <dir> draft schematic`; PDF+SVG
  export via `kicad-cli`.
- **strengthened**: no hardcoded tool paths anywhere (`defaultCopperheadDir`,
  `defaultKicadCli`, `defaultMagick` resolvers throughout, vs. `draft.py`'s
  and `crop.py`'s own hardcoded `KC = "/Applications/KiCad/..."` and
  `SCRATCHPAD`-env-var dependence); copperhead invoked without changing this
  process's working directory.
- **dropped, with reason**: trying multiple group-assignment variants
  (`draft.py`'s whole purpose) - a judgement call `make draw` does not make;
  it drafts the one already-chosen, committed intent. akcli repairs,
  field-restating and re-papering (`run.sh`'s `make_repairs.py`/`restyle.py`/
  centring) - explicitly judgement-laden work the brief's Step 3 order stops
  short of. `crop.py`'s hand-surveyed named `REGIONS` table - no such survey
  exists yet for an unrepaired fresh draft, so `make draw` writes one
  mechanical whole-page crop instead. `boxgeom.py`, `colour_check.py`,
  `pwr_survey.py`, `pixeldiff.py`/`pixelbands.py`, `akcli check --layout` -
  none of these were promoted to `draughting/measure/` by Task 4 (only
  `center.py`, `crop.py`, `crossings.py`, `framegeom.py`,
  `junction_audit.py`, `kicad_sheet.py`, `label_survey.py`, `netcmp.py`,
  `selftest.py` were), and the ones that remain unused here either compare
  two states (a before/after this verb has only one side of) or need a
  judgement-derived table.
- **run**: `crossings.py`, `junction_audit.py`, `label_survey.py` - the three
  promoted scripts that take only a sheet path and print findings, no
  comparison and no per-run table needed.

Design decisions a reviewer may want to check
------------------------------------------------

- **`COMMITTED_INTENT` is a small name-keyed map in `tools/cli/draw.ts`**,
  holding one entry (`pultec-hi-cut` ->
  `docs/research/2026-10-29-hi-cut-full-run/intent-v4-blocks-mid-late.json`),
  matching `tools/draught/toolchain.ts`'s own `RESOLVED_BINARY`/
  `RESOLVED_CHECKOUT_DIR` shape. The other four Pultec boards with a page
  under `drafted/pultec/` have no entry yet and `make -C boards/<one of
  them> draw` refuses, naming the board. Nothing derives an intent from a
  `Network` (the brief's own instruction; the design's open questions say
  the same).
- **"The model" for the net-partition check is the board's own committed
  netlist export** (`perfboard.json`'s `"netlist"` field, via
  `lib/kicad/netlist.ts`'s `importNetlist`), not a fresh derivation from the
  `Network`. That export is the same one `tests/circuits/<board>.test.ts`
  already binds to the TS model on every `bun test` run
  (`make/board.mk`'s `netlist-agrees`), so this reuses an existing,
  continuously-checked link rather than building a second one. Verified for
  real: the committed intent's partition agrees with it exactly (15 nets,
  identical as sets of `REF.PIN` sets).
- **A net-partition disagreement refuses outright, before drafting** -
  `EVALUATING-DRAWINGS.md` §3's one named ground for withholding a drawing.
  Every other check (the measurement suite) only ever annotates an
  already-written page.
- **`draw` is wired into `make/perfboard.mk`, not `make/board.mk`** -
  `draw.ts` resolves and validates its own board declaration from `$(CURDIR)`
  and refuses by name when there is none, the same way `draught-doctor`
  needs no `board.mk`/`aggregate.mk` split to do its job.

Concerns / things I did not do
----------------------------------

- Only `pultec-hi-cut` has a `COMMITTED_INTENT` entry. The other four
  Pultec boards' intents exist on disk under their own `docs/research/*-full-run/`
  directories but were not wired in, since the task's real-run gate names
  `pultec-hi-cut` specifically and I did not want to guess which variant
  file is "the" committed one for each without the same care taken here.
- The measurement suite run here is `crossings.py`, `junction_audit.py` and
  `label_survey.py` only - the three promoted scripts usable on a single,
  unrepaired sheet with no comparison state. If a future task promotes a
  single-sheet-capable version of `boxgeom.py` or similar, it is a small
  addition to `MEASUREMENT_SCRIPTS`.
- `make draw` never runs akcli. A reviewer expecting `make draw` to produce
  something closer to the final, reviewer-approved page should know that gap
  is deliberate, not an oversight - the brief's own Step 3 order stops before
  it.

---

Task 5 fix round 1
===================

**Status: done. Commit `88c1f90` on `feature/schematics-tooling`, not
pushed** (on top of `7505225` above).

Test summary: `bun run typecheck` clean. `bun test tests/draught/`: **33
pass, 0 fail, 101 expect() calls** (was 30; +3 new `repaperToUSLetter`
tests). Full `bun test`, run alone, observed rather than predicted: **2762
pass, 0 fail, 38666 expect() calls, across 264 files** (was 2759/0/264 -
the delta is exactly the 3 new tests added to the existing `draw.test.ts`
file, so the file count is unchanged).

`make -C boards/pultec-hi-cut draw`, the paper line
------------------------------------------------------

Verbatim, from a real run (long measurement-suite output trimmed the same
way as the first report):

```
make draw is a MECHANICAL draft: toolchain check, intent resolution and verification, copperhead draft, re-paper to USLetter, kicad-cli render, the measurement suite, one crop. It does NOT run akcli repairs, re-centre content, or otherwise perform the judgement-laden repair pass TOOLING.md treats as a separate step - the page it writes is raw material for that pass, not the reviewer-ready artifact under drafted/.

draft (copperhead, intent .../docs/research/2026-10-29-hi-cut-full-run/intent-v4-blocks-mid-late.json):
drafted: 6 group(s), 77 wire segment(s), 26 label(s), 1 no-connect(s) on A4
  sheet fit: A4, ink 23% of the usable frame, compaction failed

re-paper (US Letter):
re-papered (paper "A4") -> (paper "USLetter").
content extent x: 50.800 .. 246.380
content extent y: 31.750 .. 153.670
USLetter inner frame x: 11.980 .. 267.377
USLetter inner frame y: 11.980 .. 203.877
fits: yes

render (kicad-cli + ImageMagick):
Plotted to '.../build/draw/pultec-hi-cut/pultec-hi-cut.pdf'. Done.
Plotted to '.../build/draw/pultec-hi-cut/pultec-hi-cut.svg'. Done.

measurement suite (draughting/measure/): [unchanged from the first report - crossings.py, junction_audit.py, label_survey.py]

EXIT=0
```

**The `(paper ...)` line in the written sheet, checked directly, not taken
from the stdout claim:** `grep -n "paper" build/draw/pultec-hi-cut/pultec-hi-cut.kicad_sch` →
`6:	(paper "USLetter")`.

`make -C boards/pultec-hi-cut check`: **7 pass, 0 fail, 32 expect() calls**;
`wiring.md is current`; `scaffold membership ok ... 4 stand-in group(s), 6
part(s)`; `ok .../pultec-hi-cut.perfboard.vrt`. Exit 0.

The five `drafted/` sha256 digests are unchanged (checked before and after);
`git diff -- drafted/ docs/schematic/verdicts.md
schematic/readability-baselines.json TOOLING.md` is empty; `git status
--short` is clean after the commit.

I-1, worked in full: what the suggested mechanism does, and what works instead
---------------------------------------------------------------------------------

**The suggested mechanism (`hints.paper = "USLetter"` in the copperhead
intent) does not work, and I measured this before writing any fix rather
than trusting the citation.** Drafting `pultec-hi-cut`'s committed intent
with `hints.paper` set to `"USLetter"` produces, verbatim:

```
note: paper hint "USLetter" is not a standard size; deriving paper from content
```

...and drafts on A4 regardless - identical to not setting the hint at all.
Root cause, read directly out of
`draughting/copperhead/src/kicad/draft/engine.ts`: its `PAPERS` table (line
~219) holds only `A5, A4, A3, A2, A1, A0` - the ISO series - and the hint is
checked against exactly that table (`PAPERS.some(p => p.name === paperHint)`,
~line 3807); an unrecognised name is silently dropped to the "derive from
content" path, not refused. The `PAPER_SIZES` table that DOES carry
`USLetter` (`{ w: 279.4, h: 215.9 }`) lives in `src/kicad/legibility.ts` - a
different table, read by the legibility CHECKER, never consulted by the
draft engine's own sizing. This is this project's own `CLAUDE.md` rule in
its clearest form yet: *"the criterion is the settlement; the mechanism is
advice from someone who had not yet tried it... record the deviation when
the mechanism turns out to be wrong rather than silently doing something
else."* The CRITERION - `make draw`'s output should be USLetter, matching
every approved page - stands and is now met. The MECHANISM named for it does
not meet it, and I did not use it.

**The working mechanism is the one this project already measured and used
for the other four Pultec boards**, found by reading
`docs/research/2026-10-30-letter-repaper.md` rather than inventing a second
technique: a one-line post-draft rewrite of the `(paper "...")` token, and
nothing else - that document's own §5 control: *"`git diff` of each sheet: 1
insertion, 1 deletion - the `(paper ...)` line and nothing else."*
Reproduced directly here too: rewriting a fresh `pultec-hi-cut` draft's
`(paper "A4")` to `(paper "USLetter")` and re-exporting gives exactly a 792 x
612 pt PDF (279.4 x 215.9 mm). `tools/draught/draw-render.ts`'s
`repaperToUSLetter` does this, refusing (not guessing) when the `(paper
...)` token is not exactly one match.

**What the USLetter draft looks like dimensionally.** The raw,
unrepaired `pultec-hi-cut` draft's BODY content extent is **x 50.800 ..
246.380 mm, y 31.750 .. 153.670 mm** (measured by the new
`draughting/measure/paper_fit.py`, promoted the same way Task 4 promoted
the rest of `draughting/measure/`). US Letter landscape's inner frame on
this KiCad is **x 11.980 .. 267.377, y 11.980 .. 203.877** (cited from
`docs/research/2026-10-30-letter-repaper.md` §3's own render-measured
figures, re-derivable with `framegeom.py USLetter` if ever in doubt). The
raw draft sits inside that frame with **>20 mm of margin on the east edge**
and well over 50 mm south - it fits, measured rather than assumed.

**I note this appears to disagree with `letter-repaper.md`'s own §4.2**,
which found the (REPAIRED) Hi cut hybrid's group box reaching 4.530 mm PAST
the US Letter frame and left `pultec-hi-cut` on A4 for that reason. The two
measurements are not of the same artifact: `letter-repaper.md` measured the
sheet AFTER akcli repairs, a label-collapse pass and field-restating (the
`pultec-hi-cut.generated-do-not-edit.kicad_sch` → `RECORD.md` chain), which
is known to move group-box edges (the same record documents a label
collapse that grew a different group's rectangle by 5.08 mm). `make draw`
never runs that pass, so its raw output is a narrower, earlier-stage
artifact than the one that measurement concerns - not a contradiction of it.
I flag this rather than silently reconciling it, since it is exactly the
kind of thing a later reader would otherwise have to re-derive.

**Positive and negative controls, both committed as tests, not only driven
by hand:** `tests/draught/draw.test.ts` now asserts `repaperToUSLetter`
reports `fits: true` on the committed, approved `pultec-hi-cut` page (a
real sheet already known to fit) and `fits: false` after moving one real
wire endpoint to `x = 999.0` mm (a deliberate overshoot). Both pass.
`paper_fit.py` was driven the same way directly against the fixtures before
being wired in.

I-2, M-1, M-2
-------------

- **I-2.** `make -C boards/pultec-hi-cut check` is now run and quoted above
  (7/0). It was a reporting gap in the first report, not a defect - the
  reviewer had already driven it and found no regression, and re-running it
  here confirms the same result against the post-fix tree.
- **M-1.** `tools/cli/draw.ts` was 557 lines. Split along the seam the
  reviewer named: `tools/draught/draw-draft.ts` (274 lines - intent
  resolution/parsing, model verification, `draftWithCopperhead`) and
  `tools/draught/draw-render.ts` (204 lines - `repaperToUSLetter`,
  `renderSheet`, `runMeasurementSuite`). `tools/cli/draw.ts` is now 288
  lines of pure orchestration. All three are within the 300-500 ceiling; no
  comment was shortened to get there - the split added rationale (the I-1
  measurement and its citation) rather than removing any.
- **M-2.** A render or re-paper failure after a successful draft now
  appends `note: <path> exists on disk from this run - a later step
  failed, but that file was not deleted or hidden. It can still be opened
  directly in KiCad.` to the refusal. Driven by sabotage (temporarily made
  `renderSheet` always fail) and confirmed the note names the real,
  existing path; reverted, `grep` for the sabotage string afterward found
  nothing.
- **The scope-disclosure line** (the ruling beside I-1, not a numbered
  finding) is now the first line of every successful or partially-successful
  run's stdout, and is asserted in the real-draw test:
  `expect(result.stdout).toContain("MECHANICAL draft")` and
  `toContain("does NOT run akcli repairs")`.

Controls driven this round
---------------------------

1. Reproduced the broken suggested mechanism directly against a scratch
   copy of the committed intent (`hints.paper: "USLetter"`) before writing
   any code - the engine's own note is quoted above, not paraphrased.
2. `draughting/measure/paper_fit.py` driven against three sheets before
   being wired into TypeScript: the fresh raw draft (fits), the committed
   approved page (fits, matching `RECORD.md`'s own extent figures exactly -
   `x 29.210 .. 250.190`), and a hand-corrupted copy with one wire endpoint
   moved to `x = 999.0` (does not fit, with the overshoot printed).
3. Sabotaged `renderSheet` to always return `ok: false` and ran `runDraw`
   directly - confirmed the refusal names the surviving `.kicad_sch` path
   (M-2); reverted; `grep -n SABOTAGE` afterward found nothing.
4. The canary'd scan this round used Python directly on raw bytes (`b"\x00"
   in data`, `b"\r" in data`), never a shell regex, specifically because the
   reviewer's own first attempt at this scan (a bash `$'\x00\|\r'` pattern)
   collapsed into a literal match and produced false hits on all three
   files - noted as the reason, not repeated.
5. `git show HEAD:CLAUDE.md` vs the working copy: identical, no drift.

What I disagree with, or qualify
---------------------------------

- **The reviewer's I-1 mechanism (`hints.paper`) does not work; the fix uses
  a different, already-established mechanism instead.** Covered in full
  above. Nothing else in the fix-round message is in question - G308, the
  net-partition withholding ground, and the measurement-suite non-gating
  behavior were all re-confirmed as stated.
- Everything else in the fix-round request (I-2, M-1, M-2, the
  scope-disclosure ruling) was implemented as asked, without a deviation to
  record.

---

Task 5 fix round 2
===================

**Status: done. Commit `dbb7e4c` on `feature/schematics-tooling`, not
pushed** (on top of `88c1f90`/`7505225` above).

Test summary: `bun run typecheck` clean. `bun test tests/draught/`: **34
pass, 0 fail, 106 expect() calls** (was 33; +1 new `fitStatus: "unmeasured"`
test). Full `bun test`, run alone, observed rather than predicted: **2763
pass, 0 fail, 38671 expect() calls, across 264 files** (was 2762/0/264 -
the delta is exactly the one new test added to the existing
`draw.test.ts` file).

The defect, and the fix
-------------------------

`repaperToUSLetter` used a single boolean, `fits`, for two different
situations: the board's content genuinely overflowing US Letter's inner
frame, and `paper_fit.py` itself failing to measure the sheet at all (its
`fit.status !== 0` branch). Both returned `fits: false` with the same
downstream handling in `runDraw`, so a sheet `paper_fit.py` could not read -
reproduced exactly as the reviewer did, with a sheet carrying no body
coordinates at all - came back reporting *"this board's content does not
fit US Letter's inner frame"*, a false finding about a board nothing had
actually measured.

**Fixed by replacing the boolean with a three-value `FitStatus`**
(`tools/draught/draw-render.ts`): `"fits"`, `"overflow"`, `"unmeasured"`.
`runDraw` now branches on all three: `"overflow"` prints the same
board-finding line fix round 1 wrote; `"unmeasured"` prints a line that says
plainly the check did not run and why, and does **not** use the word "fit"
or "overflow" about the board at all. All three keep the page written -
`repaperToUSLetter` still returns `ok: true` when only the fit measurement
failed, never `ok: false`, so nothing is withheld.

Reproduced, verbatim, with the exact minimal sheet that triggers it:

```
$ python3 draughting/measure/paper_fit.py empty-body.kicad_sch
empty-body.kicad_sch: no body coordinates found at all - refusing to report an empty extent as a fit
(exit 1)
```

`repaperToUSLetter` on that same sheet now returns `{ ok: true, fitStatus:
"unmeasured" }` with stderr *"paper_fit.py could not measure the re-papered
sheet (exited 1) - the fit check did not run, which says nothing about
whether the content fits: ..."* - no claim about the board.

What the two states now print
------------------------------

- **Overflow** (unchanged from fix round 1): `re-paper: <board>'s content
  does not fit US Letter's inner frame after re-papering - see the
  paper_fit.py measurement above. This is a finding, not a withholding
  ground (EVALUATING-DRAWINGS.md §3): the page is still rendered below.`
- **Unmeasured** (new): `re-paper: whether <board>'s content fits US
  Letter's inner frame could not be determined - see the paper_fit.py
  output above for why. This is the fit CHECK not running, not a finding
  about the board; the page is still rendered below.`

Both are printed to stderr beside an already-written page; neither ever
sets `exitCode` to anything but what drafting and rendering themselves
determined.

`make -C boards/pultec-hi-cut draw`, the paper line
------------------------------------------------------

Unaffected by this round (`pultec-hi-cut` measures fine - `fitStatus:
"fits"`), re-run anyway to confirm: `(paper ...)` line in the written sheet,
`grep -n "paper" build/draw/pultec-hi-cut/pultec-hi-cut.kicad_sch` →
`6:	(paper "USLetter")`; stdout's re-paper section: `content extent x:
50.800 .. 246.380`, frame `x: 11.980 .. 267.377`, `fits: yes`. Exit 0.

The five `drafted/` sha256 digests are unchanged (checked before and after
this round's run); `git diff -- drafted/ docs/schematic/verdicts.md
schematic/readability-baselines.json TOOLING.md` is empty; `git status
--short` is clean after the commit.

Controls driven this round
---------------------------

1. Reproduced the reviewer's unmeasurable-sheet case directly against
   `paper_fit.py` before touching any TypeScript - the refusal message
   quoted above is the script's real output, not a paraphrase.
2. **Sabotaged the fix itself** to reproduce the original defect on
   purpose: temporarily made the `fit.status !== 0` branch return
   `fitStatus: "overflow"` with the old board-finding wording. Ran the new
   test (`'repaperToUSLetter reports fitStatus "unmeasured", not
   "overflow"...'`) and watched it fail exactly as the bug would have
   behaved (`Expected: "unmeasured" / Received: "overflow"`). Reverted;
   `grep -n SABOTAGE tools/draught/draw-render.ts` afterward found nothing.
3. Both the overflow and the newly-added unmeasured state are permanent
   tests now (`tests/draught/draw.test.ts`), alongside the pre-existing
   "fits" positive test - all three `FitStatus` values have a committed
   regression, not just the two the reviewer's review happened to drive by
   hand.
4. Canary'd scan, Python on raw bytes (`b"\x00" in data`, `b"\r" in data`),
   over every file this round touched: all clean.
5. `git show HEAD:CLAUDE.md` vs the working copy: identical, no drift.

What I disagree with, or qualify
---------------------------------

Nothing. The defect as described was real, reproduced exactly as the
reviewer reproduced it, and the fix is the minimal one the review itself
specified - three outcomes instead of two, the third never phrased as a
finding about the board. I-1, I-2, M-1, M-2 and the scope-disclosure line
were not touched, per the instruction not to revisit them.
