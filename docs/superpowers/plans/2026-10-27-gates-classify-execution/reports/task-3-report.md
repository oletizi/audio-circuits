## Task 3 report: the geometry survives

**Status: COMPLETE for the brief's six steps and the addendum's acceptance probe, with three
deviations and four concerns recorded below.** Nothing was weakened: every gate that ran before
still runs, on the same geometry, and reports the same text.

---

### 1. What was widened, and where

The chain the spec names (`RealiseResult` -> `elkBackendFrom` -> `realiseBlock`/`renderBlock` ->
`layoutSheet` -> `SheetDrawing` -> `Generation`) now carries geometry and findings end to end.

| file | change |
| --- | --- |
| `lib/schgen/findings.ts` | one new `FindingKind`, `geometry-disagrees-with-ir`, classed `defective` in `classOf`'s existing exhaustive switch |
| `lib/schgen/render/block-types.ts` | `RealiseResult`'s false arm gains optional `layout` and `findings`; `Selection`'s refused arm gains the same two; new `Drawn`/`NOTHING_DRAWN`, `refusedLayout`, `findingKindOfMismatch`, `mismatchFindings`, `realiseFindings`; `invalidGeometry` and `clearanceViolation` take an optional trailing `Drawn` |
| `lib/schgen/elk/adapt.ts` | `checkLayout`'s `Finding[]` is kept as `found` rather than flattened and dropped; the two clearance arms and the junction arm pass `{ layout, findings }` into the mismatch |
| `lib/schgen/render/blocks.ts` | new `BlockRealisation` + `realiseBlockReported`; `realiseBlock` is now the strict throwing wrapper over it; `elkLayout` becomes `elkRealisation`, returning geometry+findings where geometry exists and throwing `SchgenRefusal` where it does not; `selectRenderer` forwards layout+findings |
| `lib/schgen/render/bus.ts` | `BusResult` gains `findings`; `renderBlock`'s wired/auto arm calls `realiseBlockReported` |
| `lib/schgen/render/frames.ts` | `FrameContent` gains `findings`; `blockContent` carries them off `renderBlock` |
| `lib/schgen/render/sheet-check.ts` | new `SheetSafety` + `sheetSafety(scene)`; `assertSheetSafe` is the throwing wrapper, message and short-circuit order unchanged |
| `lib/schgen/render/text-scene.ts` | `assertTextClear` **deleted** - it was `textProblems` plus a throw and `sheets.ts` was its only caller |
| `lib/schgen/render/sheet-types.ts` | `SheetDrawing` gains `findings` |
| `lib/schgen/render/sheets.ts` | `layoutSheet` collects block findings + `sheetSafety` + `textProblems` onto the drawing instead of throwing |
| `lib/schgen/render/page-refs.ts` | `refsMatchProblems` extracted; `assertRefsMatchDrawings` is the one-line wrapper |
| `tools/schgen/generate.ts` | `Generation` gains `findings`; `validateCircuit`'s refusal becomes `SchgenRefusal(circuit-invalid)`; `assertRefsMatchDrawings`/`assertCrossSheet` replaced by their problem functions, tagged `reference-disagreement`/`cross-sheet-disagreement`; new `layoutSheets` attempts every sheet; one final typed refusal when findings exist |
| `tools/schgen/port-manifest.json` | `lib/schgen/render/page-refs.ts` moved from `files[]` to `diverged[]` with `sourceSha` `89c29ca2…` |
| `tests/schgen/findings.test.ts` | the new kind added to the defective list |

**No new `.ts` file was created**, so no `handWritten` entries were needed. Every other file I
edited was already in `diverged[]` or `handWritten[]`.

### 2. The `MismatchKind` -> `FindingKind` mapping, and its reasoning

`findingKindOfMismatch` in `block-types.ts`, an exhaustive switch with no `default`:

| `MismatchKind` | `FindingKind` | `classOf` | why it follows the owner's line |
| --- | --- | --- | --- |
| `not-applicable` | `no-template-applies` | `not-drawable` | nothing was drawn and nothing could be by this renderer, so there is no artifact to call right or wrong |
| `invalid-geometry` | `geometry-disagrees-with-ir` **(new kind)** | `defective` | its own docstring is *"a renderer applied and produced geometry disagreeing with the IR"* - a drawing that asserts a connection the circuit does not have is WRONG ABOUT THE CIRCUIT. A drawing exists; it is marked, not withheld |
| `clearance` | `body-clearance` | `usable` | *"a template applied and violated a clearance constraint"* is crowding: correct about the circuit, hard to read - the owner's *"ugly but usable"* |
| `backend-raised` | `backend-raised` | `generator-defect` | *"the backend did not return a result at all"* is this generator failing, not a fact about the circuit. The name already existed in `FindingKind` with that class; the mapping did not get to choose it |

**THE MAPPING IS THE FALLBACK, NOT THE PRIMARY PATH, AND THAT IS THE DESIGN.**
`mismatchFindings(where, m, carried)` returns the producer's own `Finding[]` when it has any and
synthesises exactly one from the table above when it does not. On the ELK path the producer always
has them - `adapt.ts` runs `checkLayout`, which has returned `Finding[]` since Task 2 - so the
three transistor-preamp boards report `text-clearance`, the exact kind, rather than the generic
`body-clearance` the table would have given. The table covers the template sites, which carry no
per-item findings. Collapsing eleven `checkLayout` overlaps into one synthesised
`body-clearance` would have thrown away the distinction between a glyph collision and a label
that misnames a net, which is the whole point of a per-kind vocabulary.

**The one new kind, `geometry-disagrees-with-ir`.** `FindingKind`'s eight `defective` members are
each a *specific* defect (`short`, `split-net`, `missing-junction`, …) and none of them is the
general "the drawing does not mean the circuit" that `adapt.ts`'s obligation-1/2/3 arms produce.
Its class follows the owner's line directly: the geometry would make KiCad read a connection the
IR does not have. It is **not** `generator-defect` - `adapt.ts` says at each of those sites that
the refusal is about the drawing, and the two places in that file that genuinely *are* generator
defects (`snapToGrid` producing an identity collapse, and the canonicalisation-count arithmetic
disagreeing with the returned wire list) still `throw` rather than refusing, so they are not
reachable through this mapping at all.

`adapt.ts`'s junction arm tags its findings `missing-junction` explicitly rather than taking the
generic kind, because that is exactly what each line of `junctionProblems` is about and
`CLAUDE.md` names that class by that name as the one that must keep refusing.

### 3. The acceptance probe, verbatim

Probe: calls `generate()` directly on each of the four boards that refuse, through the same
`parityDesign`/`caseResolver`/`GenerateEnv` path `tools/schgen/board-sheets.ts` uses, and reports
whether the thrown value is a `SchgenRefusal`, with `worstClass(findings)` and the distinct kinds.

**BEFORE (reproduced on this tree before any edit, matching the controller's run):**

```
pultec-mid: PLAIN Error
transistor-preamp-buffered: PLAIN Error
transistor-preamp-loop: PLAIN Error
transistor-preamp-staged: PLAIN Error
```

**AFTER:**

```
pultec-mid: SchgenRefusal class=not-drawable findings=1 kinds=circuit-invalid
transistor-preamp-buffered: SchgenRefusal class=usable findings=2 kinds=text-clearance
transistor-preamp-loop: SchgenRefusal class=usable findings=2 kinds=text-clearance
transistor-preamp-staged: SchgenRefusal class=usable findings=6 kinds=text-clearance
```

All four are typed, with the classes the addendum requires: `not-drawable` for `pultec-mid`,
`usable` for the three transistor-preamp boards.

**THE SHEET-LEVEL GATES EARNED THEIR PLACE IN THIS TASK, AND THE EVIDENCE IS IN THOSE COUNTS.**
`transistor-preamp-buffered` refused at block level on **one** overlap -
`value of power symbol VCC 1 at (34.29, 48.26) overlaps pin Q1.2 text`. It now reports **two**: the
second, `VCC 6 at (207.01, 90.17)`, is the same block drawn a second time on the sheet, and the
block-level refusal had hidden it. `transistor-preamp-staged` went from the two the block gate
named to six. Had I preserved the block geometry and left `assertSheetSafe`/`assertTextClear`
throwing, these boards would have refused a dozen lines later with strictly less information - the
failure the independent review predicted.

### 4. Census, before and after

```
BEFORE:  7 of 11 boards produce a schematic / 4 refused; 0 have no authoring declaration
AFTER:   7 of 11 boards produce a schematic / 4 refused; 0 have no authoring declaration
```

**THE NUMBER DID NOT MOVE, AND THAT IS WHAT THE ACCEPTANCE PROBE PINS RATHER THAN AN OVERSIGHT.**
The probe requires all four boards to *refuse*, typed. A board that refuses is a board the census
counts as refused. What changed is the *content* of three of those four refusals: each now names
every finding, classified by kind, with a `worstClass` of `usable` - i.e. the census can now say
*these three drawings exist and are merely ugly*, which it could not say before. Flipping them to
`generated` requires the marked artifact (watermark + title-block field) that Task 4 owns; emitting
an unratified schematic that looks identical to a ratified one would be worse than refusing, and
that is argued at the one remaining refusal site in `generate.ts`.

**Full before/after diff of every emitted artifact of the seven generating boards is empty except
`MANIFEST.json`'s `templateLibrarySha256`**, which must move because this task edits files under
`lib/schgen/render/` - that field exists to move on exactly such an edit. Fallback field
placements: 34 before, 34 after, across the same 6 boards.

The three refusals' findings, as the census prints them now:

```
transistor-preamp-buffered: refused
    the generation is UNRATIFIED (usable): 2 finding(s) over 1 sheet(s). The drawing exists and is not emitted yet - see the gates-classify spec:
      - [text-clearance] value of power symbol VCC 1 at (34.29, 48.26): value of power symbol VCC 1 at (34.29, 48.26) overlaps pin Q1.2 text
      - [text-clearance] value of power symbol VCC 6 at (207.01, 90.17): value of power symbol VCC 6 at (207.01, 90.17) overlaps pin Q1.2 text
transistor-preamp-loop: refused
    the generation is UNRATIFIED (usable): 2 finding(s) over 1 sheet(s). ...
      - [text-clearance] value of power symbol VCC 1 at (34.29, 55.88): ... overlaps pin Q1.2 text
      - [text-clearance] value of power symbol VCC 6 at (173.99, 151.13): ... overlaps pin Q1.2 text
transistor-preamp-staged: refused
    the generation is UNRATIFIED (usable): 6 finding(s) over 1 sheet(s). ...
      - [text-clearance] value of power symbol VCC 0 at (29.21, 8.89): ... overlaps label BUFFER_BASE at (29.21, 1.27)
      - [text-clearance] value of power symbol VCC 0 at (29.21, 8.89): ... overlaps wire 6 of tp-second-stage (DRIVE_WIPER)
      - [text-clearance] value of power symbol VCC 1 at (34.29, 48.26): ... overlaps pin Q1.2 text
      - [text-clearance] value of power symbol VCC 6 at (124.46, 27.94): ... overlaps label BUFFER_BASE at (124.46, 20.32)
      - [text-clearance] value of power symbol VCC 6 at (124.46, 27.94): ... overlaps wire 6 of tp-second-stage (DRIVE_WIPER)
      - [text-clearance] value of power symbol VCC 9 at (237.49, 156.21): ... overlaps pin Q1.2 text
```

**All nine findings are one gate complaining about ONE THING: a power symbol's value text.** That
is the question the owner gets to answer with the drawing in hand, and it is now answerable.

### 5. Typecheck and full suite

```
bun run typecheck   -> clean (tsc --noEmit, no output)
```

Full suite, `SCHGEN_SOURCE=/Users/orion/work/pedals-work/digital-pedal-platform/tools/schgen`:

```
BEFORE (measured on this tree, not taken from the plan):
  3896 pass / 0 fail / 44129 expect() calls
  Ran 3896 tests across 364 files. [160.56s]

AFTER:
  3896 pass / 0 fail / 44129 expect() calls
  Ran 3896 tests across 364 files. [160.87s]
```

`tests/schgen/decomposition-probe.test.ts` did not flake in either run; no test needed re-running
alone.

No test was added or removed, so the totals match by construction unless something broke.

### 6. Deviations

**D1. `adapt.ts`'s junction arm keeps `checked: null`.** The brief's Step 1 said to pass
`checked: layout` there. **That mechanism does not meet the criterion and would have broken two
tools.** `AdaptReport.checked`'s stated contract is *"the geometry `checkLayout` WAS RUN ON"*, and
on the junction arm `checkLayout` has not run - it runs below that arm. Two tools read the field
under that contract: `tools/schgen/text-metrics/step4.ts` skips a block whose `checked` is null as
*"refused before checkLayout"*, which is true there; and `tools/schgen/masked-problems.ts` runs a
further text pass over `checked` and **throws** `"a defect in render/text-scene.ts or in this
tool"` when that pass finds anything `report.problems` does not - and `problems` is empty on the
junction arm, so every text problem of such a block would have fired it. The criterion is that the
geometry survives the refusal; it survives on `result.layout`, which is the field the whole chain
reads. The reasoning is recorded in the code at the site.

**D2. `lib/schgen/render/frames.ts` was edited, and the brief did not name it.** `layoutSheet`
reads a packed `FrameContent[]` and never calls `renderBlock` itself, so `FrameContent` is the only
route a block-level finding has onto a sheet. The alternative was for `layoutSheet` to re-run
`checkLayout` on each block, which is a second reader of the same geometry - the thing obligation 3
exists to forbid. It was already in `diverged[]`, so no manifest change was needed.

**D3. `assertTextClear` was deleted rather than left beside a non-throwing path.** `sheets.ts` was
its one caller and now calls `textProblems`; nothing else in `lib/`, `tools/` or `tests/` referenced
it. `CLAUDE.md`: *supersede means delete*. A note stands where it was, saying what replaced it and
why. The cost, stated: the message `"<scope>: text clearance:"` no longer exists anywhere, and
nothing asserted it.

**D4 (scope, not a departure). Step 4 is delivered as far as a non-throwing `generate` would
allow, and no further.** `layoutSheets` now attempts every sheet, keeps every drawing that
succeeded, and accumulates the findings of any sheet that refused outright, so a two-sheet design
reports both sheets' problems instead of stopping at the first. **The sheets already drawn are
retained in the `Generation` that is built - but when a sheet draws nothing there is no complete
set of files to emit, and when any finding exists `generate` refuses, so the retained drawings do
not reach the caller.** Making them reach it means `generate` returning an unmarked unratified
generation, which is Task 4's artifact work. An untyped `Error` from `layoutSheet` is **rethrown
unchanged**, deliberately: the spec's totality rule is that an unclassified refusal is a
`generator-defect` that fails the run, and absorbing one here would turn a bug into an ordinary
undrawable sheet.

### 7. Concerns

**C1. `generate()` still withholds, at exactly one site, and that is the handover to Task 4.** The
last act of `generate` is `if (g.findings.length > 0) throw new SchgenRefusal(...)`. The
`Generation` is **fully built** before that line - every sheet, every placed symbol, every emitted
file - so Task 4's change is to that one site plus the marks. I did not attach the `Generation` to
the refusal: `SchgenRefusal` lives in `lib/schgen/findings.ts` and must not depend on render types,
and a subclass carrying one would be inheritance that `CLAUDE.md` steers away from. **If Task 4
wants the drawings without re-plumbing, the smallest move is for `generate` to return `Generation`
and for a new caller-side gate to decide** - the plumbing for that is all in place.

**C2. The refusal-site enumeration is not finished, and this task never claimed it.** The spec's
*"every refusal from `validateCircuit` to the written file"* includes `emit.ts`,
`generated-files.ts`, `frames.ts`, `elk/graph.ts`, `read-graph.ts`, `sheet-graph.ts` and
`layout-check.ts`'s own throws. I converted the sites on the path the four boards take and the
sheet-level gates the brief named. **Everything else still throws a plain `Error`**, and under the
spec's rule those will read as `generator-defect` and fail a run if they fire. Two in particular
are reachable and unconverted: `fittingPaper`'s *"do not fit on any paper size"* (which is
`paper-exhausted`, a kind that already exists and is `not-drawable`) and `shelfPacking` not
fitting (`packing-failed`, likewise). Neither fires on any board today.

**C3. `tools/schgen/generate.ts` is 484 lines.** Under the 500 ceiling but no longer comfortable. A
future task adding to it should extract `layoutSheets` and the manifest-digest machinery first.

**C4. `RealiseResult`'s new fields are OPTIONAL, which means an absence and a `null` read the
same.** Fourteen sites across eight ported template modules forward an inner helper's refusal as
`{ ok: false, mismatch: plan.mismatch }`; every one is a shape or reachability verdict taken before
any geometry exists, so an absent field states the truth there. Required fields would have diverged
eight more ported modules to write `layout: null, findings: []` fourteen times. The risk is that a
future template which *does* draw before refusing forwards through one of those sites and drops its
geometry silently. `refusedLayout` is the single place the absence-means-nothing-drawn reading is
stated, so that is where a future reviewer should look.

---

## Fix round 1

Three Importants and two Minors, all addressed. The controller confirmed deviation D1 was correct
(it traced the junction arm and independently verified `masked-problems.ts` would have fired under
the brief's prescribed `checked: layout`) and ruled `frames.ts` in scope.

### Item 1 (Important) - `connector-fanout.ts` dropped geometry it had in hand

`lib/schgen/render/templates/connector-fanout.ts`'s `realise` drew all four rotations, ran
`checkLayout` on each, and kept only the problem **text** - so its `clearanceViolation` carried no
`Drawn` and `blocks.ts` hid the picture. **It is the only template in the set that draws before it
refuses**, and my concern C4 missed it because I reasoned about the fourteen *forward* sites, which
are pre-geometry, and never asked whether any producing site had geometry.

FIXED: the loop now keeps the first failing rotation as a `Drawn` - `{ layout, findings }` - and
passes it to `clearanceViolation`. The two guard conditions (`first === undefined` and
`firstFail === null`) are tested together rather than asserted away, because the alternative is a
non-null assertion. The pre-existing throw's message is unchanged.

**It is covered by an executed test**, not by reading. `tests/schgen/render/templates/connector-fanout.test.ts`
already carries the `EAR` fixture whose outline overhangs its own pin so every rotation collides,
and the new test file asserts the refusal carries both the geometry and `checkLayout`'s own
findings, that `checkLayout` on the returned layout reproduces exactly those findings, and that the
sheet is now DRAWN with them on `SheetDrawing.findings` where it previously produced nothing.

### Item 2 (Important) - the wire-safety short circuit was lost at the call site

Round 1 built the sheet's findings in an array literal, which evaluates `sheetSafety(...)` and
`textProblems(textScene(...))` unconditionally. `sheet-check.ts` is careful to run the body pass
only when wire safety is clean, and the call site undid it.

FIXED: `sheets.ts` now holds `const safety = sheetSafety(scene)` and gates the text pass on
`safety.findings.length === 0`, exactly as `sheetSafety` gates its own body batch. The comment above
it is corrected - "Both still RUN, unweakened" is replaced with the ordering and the concrete loss
the reviewer named: `textScene` to `blockFields` to `field-placement.ts` throws a PLAIN `Error`,
`layoutSheets` rethrows it unchanged, and the next task's totality rule reads it as a
`generator-defect`. **A classified refusal must not be overtaken by an unclassified one.**

Covered by `sheetSafety reports wire safety alone when the sheet's connectivity is already wrong`,
which asserts **exactly two** findings (the two ends of the one wire the fixture adds) and that
their kinds are `["dangling-end"]` with no body or glyph finding beside them, against a control
asserting the same scene without that wire is clean.

### Item 3 (Important) - the plumbing is now guarded, and the two superseded asserts are deleted

New file `tests/schgen/gates/geometry-survives.test.ts`, 13 tests, registered in
`port-manifest.json`'s `handWritten`. **Every refusal it drives is real** - no stub `Backend`
anywhere - because `connector-fanout` provides both halves of the distinction this task turns on:
`EAR` refuses *after* drawing, and an anchorless block refuses *before*. What it covers:

- the `MismatchKind` to `FindingKind` to class table, written out rather than derived from the
  function, plus an assertion that the four rows are the whole union;
- `mismatchFindings`: carried findings win; exactly one synthesised when none are carried, for both
  `undefined` and `[]`;
- `refusedLayout` on all three shapes;
- **the clearance refusal reaches `realiseBlockReported` with the drawing intact**, and
  `checkLayout` on the returned layout reproduces exactly the findings the caller got - so the
  drawing and its classification cannot be about two different geometries;
- `realiseBlock` still throws a `SchgenRefusal` with those findings (the strict callers' gate);
- a refusal that drew NOTHING still throws, classified `not-drawable`;
- `renderBlock` carries them; `layoutSheet` draws the sheet of a refused block and puts them on
  `SheetDrawing.findings`; a clean sheet carries `[]`, so clean and unratified are distinguishable;
- the junction arm's OUTPUT contract: it carries its geometry and classifies `defective`, not
  `usable`;
- `sheetSafety` both ways, with the short circuit asserted;
- **end to end on `transistor-preamp-buffered`**: `generate()` throws a `SchgenRefusal` with
  `worstClass === "usable"`, kinds `["text-clearance"]`, and at least two findings - the acceptance
  probe, committed. `kicadVersion` is a literal, so it needs no toolchain, and it writes only into a
  fresh temp directory it removes.

**THE TWO SUPERSEDED ASSERTS ARE DELETED, which is what the inconsistency called for.**
`assertCrossSheet` had **zero** callers (every test in `cross-sheet.kicad.test.ts` already used
`crossSheetProblems`), and `assertRefsMatchDrawings` had exactly one, a test. Both are gone, with a
note where each stood. `tests/schgen/render/page-refs.test.ts` now asserts `refsMatchProblems`'s
**exact problem list** instead of matching a regex against a thrown message, which is strictly
stronger. The alternative - giving them a production caller - would have meant two ways to run the
same check, one of which hides the drawing.

**What is still NOT covered, stated rather than left to be found.** `adapt.ts`'s junction arm is not
TRIGGERED by any test. No block in the corpus takes it, and firing it needs an ELK graph built to
make `junctionPoints` and `branchJunctions` disagree - which **G293** reconciled deliberately. I
tried: `groundOfDegreeSix` does not take the arm, and under `selectRenderer` it is drawn by
`rail-row` rather than reaching ELK at all. Fabricating a graph to force the arm would have been a
fixture written to produce a verdict, which is the thing `CLAUDE.md` forbids most directly. The
arm's two lines are covered by reading; everything downstream of them is executed. **This is the one
place the review's most-wanted test is not delivered, and it is deliberate.**

### Item 4 (Minor) - `merged()` keyed on text alone

FIXED: keyed on `kind` and `what` together, with a printable `" :: "` separator and a comment saying
why it is not an escape. `CLAUDE.md` forbids typing a control-character escape into a tool
parameter, and the first attempt at this line did exactly that: a NUL escape typed into an Edit
parameter arrived as a real byte on the next match attempt and the edit failed to match. The rule
proved itself again, inside the commit that was obeying it. `where` is deliberately out of the key:
the same problem reached through a block and through its sheet is one problem.

### Item 5 (Minor) - the "single place" claim was false

FIXED by routing, not by correcting the claim: `drawnBlock` now reads the refused `Selection`
through `refusedLayout` rather than testing `chosen.layout === undefined` itself. Both readings
agreed, and two readings of one optional field is two chances for them to stop agreeing.

### Verification, verbatim

Acceptance probe, after the fix round:

```
pultec-mid: SchgenRefusal class=not-drawable findings=1 kinds=circuit-invalid
transistor-preamp-buffered: SchgenRefusal class=usable findings=2 kinds=text-clearance
transistor-preamp-loop: SchgenRefusal class=usable findings=2 kinds=text-clearance
transistor-preamp-staged: SchgenRefusal class=usable findings=6 kinds=text-clearance
```

`bun tools/schgen/board-sheets.ts`:

```
7 of 11 boards produce a schematic
4 refused; 0 have no authoring declaration
WARNING: 34 fallback field placement(s) across 6 board(s). Those sheets carry text the placer
could not keep clear; each generation's RENDER-REPORT.md names them per block and per unit.
```

Census and fallback total unchanged. A full recursive diff of every emitted artifact against the
pre-fix-round run is empty, including `MANIFEST.json` apart from `templateLibrarySha256`, which must
move because this round edits `lib/schgen/render/`.

`bun run typecheck`: clean (`tsc --noEmit`, no output).

### One correction to the review's own reasoning, recorded rather than quietly fixed

The review said an **`auto`** block that `connector-fanout` nearly fits was refused with its drawing
hidden. **It cannot be.** The template reads its anchor as `r.kind === "wired" ? r.anchor : null`
and returns `notApplicable("connector-fanout needs an anchor")` when that is null, so an `auto`
block always takes the shape arm and never reaches the clearance refusal at all.

**The hole is real and the path to it is one declaration away from where the review put it:** what
reaches that refusal is a block whose author DECLARED `rendering: { kind: "wired", template:
"connector-fanout" }`, which is exactly what the committed `EAR` fixture is, and `selectRenderer`
makes a non-`not-applicable` template mismatch final for a wired block just as it does for an auto
one. So the fix is unchanged and the reasoning in the code says the reachable path rather than the
reported one. Written down because a comment that repeats a false premise is the next reader's
problem.

### `assertSheetSafe` is KEPT, and here is the "which and why" for the third one

The review asked for the superseded asserts to be deleted or given a production caller.
**`assertSheetSafe` is now in the same position as the two that were deleted** - `sheets.ts` calls
`sheetSafety` and the only callers left are three test files - and it is nonetheless kept. The
distinction, stated so it can be over-ruled rather than discovered:

- **It is the strict form of a check, not a superseded one.** This repository already has that
  pattern twice, deliberately: `adaptElkLayout` beside `adaptElkLayoutReported`, and now
  `realiseBlock` beside `realiseBlockReported`. A caller that wants a clean sheet or nothing is a
  real caller, and the two ported test files are exactly that.
- **Its reporting path IS guarded, which is the thing the review was actually protecting.** The
  complaint about `assertRefsMatchDrawings` was that the suite asserted a throw production had
  abandoned *and would have stayed green if the `reference-disagreement` tagging were deleted*. Here
  the new test asserts `sheetSafety`'s findings and message directly, and then asserts
  `assertSheetSafe` throws exactly that - **so neither form can drift from the other**, and deleting
  the findings path turns the suite red.
- `assertCrossSheet` had **zero** callers, and `assertRefsMatchDrawings`'s single caller asserted a
  regex over a message rather than the findings. Neither had anything pinning the reporting path.
  That is the difference, and it is the whole of it.

Deleting `assertSheetSafe` as well would also mean diverging two more ported test files
(`glyph-clearance.test.ts`, `glyph-glyph-clearance.test.ts`) whose assertions are about what the
gate finds, not about who calls it. **If the reviewer reads the pattern argument as special
pleading, the fix is three one-line rewrites and two manifest moves, and I will make it.**

`SCHGEN_SOURCE=... bun test`, on the final tree:

```
 3909 pass
 0 fail
 44205 expect() calls
Ran 3909 tests across 365 files. [160.39s]
```

Baseline 3896, plus the 13 new tests, in a 365th file. `decomposition-probe.test.ts` did not flake.
