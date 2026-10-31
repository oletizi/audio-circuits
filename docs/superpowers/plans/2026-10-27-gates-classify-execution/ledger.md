# SDD ledger — plan: docs/superpowers/plans/2026-10-27-gates-classify.md

Spec: docs/superpowers/specs/2026-10-27-gates-ratify-they-do-not-hide-design.md (revision 4, binding)
Authority: docs/known-gaps.md G303 - the owner's directive, verbatim.
Branch: feature/schematics-tooling. Base: da8c6e3
Suite baseline: Ran 3887, 0 fail, with SCHGEN_SOURCE set.

## Pre-flight scan

Three reviews preceded this plan - one Claude agent on spec revision 1, Codex on revisions 2 and 3
- so the usual preflight questions were answered against the CODE rather than against the plan, and
their answers are in the spec. What remains to check here is task-against-task.

| pair | produced -> consumed | finding |
| --- | --- | --- |
| T1 -> T2 | `Finding`, `FindingKind`, `classOf` | CLEAN. T2's producers return `readonly Finding[]`. |
| T1 -> T4 | `SchgenRefusal`, `worstClass` | CLEAN. The census classifies by `worstClass(findings)`. |
| T2 -> T3 | findings flow from checkers into the chain | CLEAN, and T2 is explicitly behaviour-preserving, proved by a census diff. |
| T3 -> T4 | `SheetDrawing.findings`, `Generation.findings` | CLEAN. |
| T3 -> T5 | class per sheet decides the mark | CLEAN. |
| T4 -> T5 | `BoardSheets.outcome` | CLEAN. |

| task | self-agreement |
| --- | --- |
| T1 | CLEAN. The test asserts every kind in the union; `classOf` exhaustive with no default arm is the stated mechanism. |
| T2 | CLEAN. "Empty census diff is the deliverable" is the one requirement that can fail. |
| T3 | CLEAN, and it is the task with the most room to go wrong - it expects boards to MOVE and says not to adjust to keep old numbers. |
| T4 | CLEAN. Expectations are committed and the run may disagree. |
| T5 | CLEAN. The fixture exists because zero real boards are expected defective. |

Ruling 1: no per-board usable/defective split is predicted anywhere in this plan. Spec revision 2
predicted one and Codex disproved it from a gate the table had missed. Predicting again before the
sites are enumerated would be guessing twice. Cost if wrong: Task 4 reports a split nobody
anticipated, which is the intended behaviour rather than a failure.

## Task 1

Task 1: implemented (commit 42e16f0). `lib/schgen/findings.ts` with `FindingKind`, `RefusalClass`,
`classOf` as an exhaustive switch with NO default arm, `worstClass`, `SchgenRefusal`. 6 tests pass,
typecheck clean, both new files declared in the port manifest.

Task 1: THE IMPLEMENTER CAUGHT A STALE FIGURE IN THE PLAN, by measuring rather than trusting. The
plan's Global Constraints said the suite baseline was `Ran 3887`; it reverted its own two files and
the manifest edit, re-ran against `da8c6e3` with `SCHGEN_SOURCE` set, measured **3889**, and
reported BOTH numbers rather than adjusting anything to make 3887 work. 3889 + 6 = 3895, which is
what it measured afterwards.

CONFIRMED by the controller: `23ef67a`, the previous plan's final fix wave, added two tests to
`tests/guide/generated-schematic.test.ts`. The controller last measured the suite before that
commit and carried 3887 forward. **The stale number was in the section that tells implementers to
account for `Ran` term by term** - a test count in prose is a transcription with a date on it, and
this is the third time in two plans that a figure written down by this controller went stale.
The plan is corrected to 3889 with the correction shown rather than edited away.

Task 1: minor (deferred, relayed): the `handWritten` array is appended to rather than sorted; the
implementer checked and no test enforces order, only membership and non-duplication. Same minor as
the previous plan's Task 2.
Task 1: review - SPEC ✅, QUALITY Approved. EXHAUSTIVENESS MECHANISM VERIFIED: the reviewer added a
stray kind to the union itself, obtained `TS2366: Function lacks ending return statement and return
type does not include 'undefined'` at `findings.ts(52,45)`, and reverted with the tree checked
clean. It also classified all 18 kinds from first principles and would not move any.

Ruling 2 (a Minor PROMOTED, against the default that minors never enter the fix loop): `worstClass`'s
four-way severity order is only partially pinned. The brief's tests exercise defective>usable,
generator-defect>defective and not-drawable>usable, but never defective-vs-not-drawable - so
reordering `SEVERITY` to `["generator-defect","not-drawable","defective","usable"]` would pass every
test. FIX IT. Why it is not a deferred minor: this is the one file whose entire value is that a
mechanism rather than a convention enforces its correctness, and a test that cannot catch a reorder
sits in the "check that cannot fail" family the project catalogues. It is inherited from this
controller's brief, not an implementer error. Cost if wrong: none - it is one assertion.

Ruling 3 (same round, adjacent and one line): `toBeInstanceOf(Error)` proves `r` is some Error, not
a `SchgenRefusal`. The reviewer confirmed the classic extends-Error prototype pitfall does not apply
here - tsconfig targets ES2022 and bun transpiles natively, so no `Object.setPrototypeOf` is needed
- but the test would not catch a future regression to that class's own prototype chain. Tighten it.

Task 1: minor (deferred): the implementer's report says "Deviations from the brief: None" while an
earlier section of the same report admits it appended to `handWritten` rather than globally sorting
it, as the brief literally said. Both facts are in the report, so this is an inconsistent
self-assessment rather than concealment. The array is not globally sorted on disk and no test
enforces order.
Task 1: fix round 1/5 (2 addressed, 0 open; commit a3e10f7). The implementer drove the reorder RED
itself and reported the exact failure. CONTROLLER RE-DROVE IT INDEPENDENTLY: swapping `defective`
and `not-drawable` in `SEVERITY` gives 6 pass / 1 fail, and the tree restored clean. The committed
order is `["generator-defect", "defective", "not-drawable", "usable"]`. An assertion nobody has
seen fail is an assertion nobody has tested; this one has been failed on purpose twice.
Task 1: complete (commits da8c6e3..a3e10f7, review clean). Suite `Ran 3896`, 0 fail.

New suite baseline for later tasks: 3896.

## Task 2

Task 2: implemented (commit 4604383). `checkLayout`, `textProblems` and `assertSheetSafe` return
findings tagged by kind at the point each check is produced; `assertTextClear`, `assertSheetSafe`
and the `blocks.ts`/`bus.ts` throw sites raise `SchgenRefusal`. Message text unchanged and
`SchgenRefusal` does not override `.name`, so every existing catcher sees what it saw before.
CONTROLLER VERIFIED: the census prints 7 of 11, low-cut 1, low-boost 5, 34 total and the same four
refusals; no duplicate entries in any port-manifest array.

Task 2: MY VERIFICATION INSTRUCTION WAS WRONG AGAIN, AND THE IMPLEMENTER CAUGHT IT. The brief said
to filter one non-deterministic line, `writing generations under <mktemp dir>`. The mktemp suffix
actually appears on roughly 110 lines - every `wrote <dir>/...` line, about ten per board across
eleven boards - so the stated filter could not have produced an empty diff for a no-op. It built a
proper normaliser AND checked it was not a null filter by diffing a run against itself first, which
is what the brief warned about in the abstract and then got wrong in the particular. **Second plan
running, second defective verification step written by this controller, second time an implementer
found it rather than reporting a false pass.**

Task 2: A GUARD GAP IT FOUND IN ITS OWN WORK. Its first manifest edit added a DUPLICATE `diverged`
entry for `pin-marks.test.ts`, and `tests/schgen/port-fidelity.test.ts` DID NOT CATCH IT. It found
the duplicate itself and merged the entries. So the port manifest has no duplicate-entry guard;
controller confirmed zero duplicates across all three arrays today, so nothing is broken - but
nothing would have said so. Flagged to the final review.

Task 2: deviation accepted - `checkWireSafety` (in `wire-safety.ts`, outside the task's three named
files) emits a batch mixing shorts, missing junctions, NC contact and dangling ends in one
`string[]`, and was tagged with ONE representative kind, `short`, for the whole batch rather than
split by parsing prose. Right call: parsing sentences to recover kinds is the thing this task
exists to end. It costs nothing today because all four classify `defective`, and the information
loss is recorded here because it would matter the moment anything needs to tell them apart.
Task 2: deviation accepted - `sheet-check.ts` and four ported test files moved from the manifest's
`files[]` to `diverged[]`, because hand-editing a ported file is exactly what that category is for.
The brief named only three files and did not anticipate it.
Task 2: review - SPEC ✅, QUALITY Approved. The reviewer checked all 14 kind assignments against
the owner's line by reading the message PRODUCERS rather than the report's table, verified all four
new `diverged` sourceShas against `$SCHGEN_SOURCE` with `shasum`, and confirmed `SchgenRefusal` for
`Error` is genuinely invisible: no `catch` anywhere in lib/tools/tests inspects an error's class or
name, and `board-sheets.ts:189` is `caught instanceof Error ? caught.message : String(caught)`,
true for the subclass. Short-circuit order preserved at both sensitive sites.

Task 2: CONTROLLER-FOUND, AND IT IS THE PRECONDITION TASK 4 RESTS ON. The reviewer flagged as
unverifiable whether the four refusing boards reach the census as `SchgenRefusal` with findings
intact; its static reading said yes. `[RAN]` a probe calling `generate()` directly for each:

    pultec-mid: PLAIN Error
    transistor-preamp-buffered: PLAIN Error
    transistor-preamp-loop: PLAIN Error
    transistor-preamp-staged: PLAIN Error

**ALL FOUR THROW A PLAIN `Error`.** Task 2's conversion does not reach the sites these boards
actually refuse on - the three tp boards refuse through the ELK backend path (`blocks.ts:304`-ish,
a different site from the invalid-layout throw at :265 that Task 2 converted) and `pultec-mid`
refuses at `validateCircuit`, outside Task 2 entirely.

**Why this would have broken Task 4 silently:** the spec's rule is that an untyped `Error` reaching
the census is a `generator-defect` and FAILS THE RUN. As the tree stands, all four boards would be
classified `generator-defect` - three clearance refusals and one invalid circuit reported as
generator bugs. The run would fail and the reform would look broken when it is merely incomplete.

Ruling 4: this is NOT a Task 2 fix - all four sites are outside its three named files. It is added
to Task 3's scope, which already owns the chain. Task 3's brief carries the probe and the four
board names, and Task 3 is not complete until that probe reports a typed refusal for each. Cost if
wrong: Task 4 fails its first run on four boards and the cause is this, named here.

Ruling 5 (Important, Task 2 fix round): the one-kind batch tag stands, but its JUSTIFICATION is
false for one branch. `wireOverWires` emits `collinear wire N and wire M overlap` for SAME-NET
pairs - correct about the circuit, merely redundant geometry - which is `usable`, not `defective`.
So "everything in `checkWireSafety` classifies defective either way" is wrong in the direction that
WITHHOLDS an ugly-but-correct drawing. Record the exception in the code, and retag the batch's
representative kind from `short` to `missing-junction`: the batch's actual messages (*"pin end …
lies mid-wire …; split the wire there"*) are textbook missing-junction, which is the class
`CLAUDE.md` names by name as the one that must keep refusing.

Task 2: minor (deferred): `finding()` is duplicated verbatim in `layout-check.ts` and
`sheet-check.ts`, plus `text()` in `text-scene.ts`; `findings.ts` is the obvious home and Task 3
will otherwise write a fourth copy.
Task 2: minor (deferred): `where` is contentless - every finding in a block carries
`where = "block <id>"` although the message already names the item, so ten findings on one block
are indistinguishable by `where`.
Task 2: minor (deferred): ten committed references to `docs/superpowers/sdd/2026-10-27-gates-classify`,
a path that does not exist; the workspace is the gitignored `.superpowers/sdd/`. Inherited from Task 1.
Task 2: THE BRIEF'S PREMISE WAS WRONG A THIRD TIME: it said `assertSheetSafe` "returns `string[]`
today". It returned `void` and still does. The implementer did the right thing silently; the
reviewer caught that it recorded my census-filter error and not this one.
Task 2: fix round 1/5 (1 Important + 3 Minors addressed, 0 open; commit 2283e57). Item 3 did NOT
need restructuring: `where` now names the item wherever the producer already had it in scope, and
was left at block level ONLY where the sole available value is an opaque string from a producer
outside this task's files - recorded rather than forced, as instructed. CONTROLLER VERIFIED:
census still 7 of 11 / 34 fallbacks, zero stale `docs/superpowers/sdd` references repo-wide, batch
retagged to `missing-junction` with the same-net collinear-overlap exception documented at the
site, and exactly one `finding()` constructor in `findings.ts` with both duplicates gone.
Task 2: complete (commits a3e10f7..2283e57, review clean). Suite `Ran 3896`, 0 fail.

## Task 3

Task 3: implemented (commit 15a414a). CONTROLLER RE-RAN THE ACCEPTANCE PROBE INDEPENDENTLY and all
four boards now throw a typed refusal with the right class:

    pultec-mid                 SchgenRefusal  class=not-drawable  findings=1  kinds=circuit-invalid
    transistor-preamp-buffered SchgenRefusal  class=usable        findings=2  kinds=text-clearance
    transistor-preamp-loop     SchgenRefusal  class=usable        findings=2  kinds=text-clearance
    transistor-preamp-staged   SchgenRefusal  class=usable        findings=6  kinds=text-clearance

THE SHEET-LEVEL GATES EARNED THEIR PLACE, MEASURABLY: `-buffered`'s block-level refusal named ONE
power-value overlap and the sheet pass finds TWO; `-staged` went 2 to 6. Converting only the block
gate - which is what the spec said before Codex caught it - would have left those boards refusing
later with nothing visible changed. That review paid for itself here.

Census still `7 of 11` and that is CORRECT: these boards still refuse, and what changed is that the
refusal carries a class and its findings. The artifacts do not exist yet; that is Task 4.

Task 3: deviation to check in review - the brief said `adapt.ts:331` become `checked: layout`; the
implementer kept `checked: null` because that fires `masked-problems.ts`'s own control assertion,
and routed geometry through `result.layout` instead. **The brief's MECHANISM was wrong and its
CRITERION is met** - which is the distinction `CLAUDE.md` draws explicitly. The review is asked to
confirm the criterion holds rather than take it on trust.
Task 3: deviations also declared - `frames.ts` edited though unnamed; `assertTextClear` deleted
(zero callers left); `RealiseResult`'s new fields optional, to avoid diverging 14 ported templates.
Task 3: concern carried forward - the refusal-site enumeration is UNFINISHED. `emit.ts`,
`generated-files.ts`, `fittingPaper`, `shelfPacking` and others still throw plain `Error` and would
read as `generator-defect` if they fired. None fires today. This is the known residual and the
mechanism handles it loudly rather than silently, which is the design.
Task 3: concern - `tools/schgen/generate.ts` is now 484 lines against the 300-500 ceiling.
Task 3: review - SPEC ✅ (one partial), QUALITY Not approved, 3 Importants. THE DEVIATION: criterion
MET, traced end to end, and the stated reason CONFIRMED - `masked-problems.ts:227`/`:260-268` really
would have fired under the brief's prescribed `checked: layout`. The brief's MECHANISM was wrong and
the implementer's judgement was right.
Task 3: fix round 1/5 (3 Importants + 2 Minors addressed; commit 2ddf512). Suite 3896 -> 3909, +13
new tests. CONTROLLER VERIFIED all three: `connector-fanout.ts:93` now passes the drawing to
`clearanceViolation`; `sheets.ts` gates the text pass on wire safety with the loss documented at the
site; both superseded asserts deleted.

Ruling 6: NO scoped re-review of this fix round. Why: the controller verified all three fixes
directly in the code, personally verified the three original findings before dispatching, and the
round added 13 tests. The final whole-branch review remains. The owner has twice asked for progress
and has not yet seen a single artifact this plan produced; another review cycle before Task 4 buys
less than it costs. Cost if wrong: a defect in a narrow, verified fix reaches the final review
instead of being caught now.

Task 3: TWO HONEST FLAGS FROM THE IMPLEMENTER, both worth more than the fixes.
(a) **MY item 1 rationale had a factual error.** I wrote that an `auto` block could reach
connector-fanout's clearance refusal. It cannot - the template reads its anchor as
`r.kind === "wired" ? r.anchor : null` and returns `not-applicable` otherwise. The HOLE was real
and is fixed; my reachability claim was wrong, repeated from the review without checking. The
reachable path is a `wired` block declaring the template.
(b) **The junction arm is still not TRIGGERED by any test** - the one thing the review most wanted.
No corpus block takes it, and forcing it needs a graph built so `junctionPoints` and
`branchJunctions` disagree, which G293 reconciled on purpose. Its output contract is asserted; the
arm itself is covered by reading. Carried to the final review as the known residual.

Ruling 7: `assertSheetSafe` is KEPT although it too is now production-callerless. The implementer
flagged it rather than deciding quietly and offered to delete it. Accepted, because its distinction
is real: its reporting path IS pinned - a test asserts `sheetSafety`'s findings and message AND
that `assertSheetSafe` throws exactly that, so neither can drift. That pin is exactly what the two
deleted asserts lacked, which is what made them dangerous. Cost if wrong: one more strict-form
wrapper with no production caller, visible to the final review.
Task 3: complete (commits 2283e57..2ddf512). Suite `Ran 3909`, 0 fail.

New suite baseline: 3909.

## Task 4 - THE DRAWINGS APPEARED

Task 4: implemented (commit 23b2cf2). Suite `Ran 3930`, 0 fail - 3909 + 21 new tests in
`tests/schgen/board-status.test.ts`. Artifacts at `build/schgen-boards/<board>/`, durable and
gitignored, with a `STATUS.md` per board and a `REFUSAL.kicad_sch` for `pultec-mid`.

    10 of 11 boards produce a drawing: 10 usable, 0 defective
    1 produce none: 1 not-drawable, 0 generator-defect

Every committed expectation held. The split, deliberately unpredicted, measured 10 usable and 0
defective. CONTROLLER RENDERED ALL THREE PREVIOUSLY-INVISIBLE BOARDS AND LOOKED AT THEM.

**THE FINDING, AND IT IS WHAT THE WHOLE REFORM WAS FOR.** `transistor-preamp-buffered` was hidden
for one reason: a `VCC` label brushing Q1's pin-2 number. Looked at, BOTH ARE PERFECTLY LEGIBLE.
Meanwhile `R4`'s value on the same sheet reads **`1●5K`** - a wire and a junction dot pass through
where the decimal point belongs, so **1.5K and 15K are indistinguishable** - and that one PASSES,
because a fallback field placement classes `usable` and refuses nothing. `R5 4.6K` and `C4 100uF`
on `-loop` are struck through the same way. 39 fallbacks across 9 boards, none gated.

**So the clearance gate refuses near-touches of legible items and lets through text a person cannot
read.** The owner predicted exactly this - *"a gate halts rendering and we never look at the picture
so we can't tell if the gate is insane or not"* - and it was caught on the first look after the
drawings became visible. Fixing a gate is OUT OF SCOPE by the spec, precisely so the question could
be asked with the drawing in hand. It now can be, and it is his to raise.

Task 4: the drawings are better than this writer expected - six and eight titled functional frames,
signal flow followable, bias legs and output stage separated and labelled. They have been behind a
refusal the whole time.
Task 4: minor (deferred): `CLAUDE.md`'s `7 of 11` paragraph is stale. The implementer correctly
declined to edit a governance file not its task's to amend.
Task 4: complete (commit 2ddf512..23b2cf2).

New suite baseline: 3930.

## Task 5 - the marks

Task 5: implemented (commit d994d03). Suite `Ran 3947`, 0 fail - 3930 + 17 in
`tests/schgen/watermark.test.ts`. Watermark: `DEFECTIVE - DO NOT BUILD`, four horizontal bands,
red 200/0/0 at alpha 0.35, at 0.14/0.34/0.54/0.74 of page height, clear of the title block. Second
mark: `comment 1` reserved unconditionally, leaving callers eight of KiCad's nine slots.
CONTROLLER GENERATED THE FIXTURE AND READ THE PAGE: unmissable at a glance, and the circuit is
still traceable underneath because the glyphs are OUTLINED rather than filled - `RV1 47K`, `10K`
and the whole capacitor column read through the bands. That is "possible, not easy".

Task 5: THE WEIGHT WAS CHOSEN BY LOOKING, FROM SEVEN PROBE RENDERS, not by argument - alpha alone
is a ghost because KiCad strokes glyphs rather than filling them, and alpha 0.5 swallowed
`RV1 47K`. Horizontal rather than diagonal because KiCad schematic text has only a four-way spin
style. This is the method the owner asked for applied to the mark itself.
Task 5: the obligation-5 exemption is MEASURED, not asserted: netlist export from the marked root
is byte-identical to the unmarked one for components, pins and nets.
Task 5: two things raised for the owner - (a) the strict `generate` still refuses rather than
writing a marked drawing into a circuit directory, and its stated reason ("the marks don't exist
yet") has now EXPIRED; comments corrected, behaviour unchanged, decision open. (b) `fittingPaper`'s
`grewFrom` is computed and never read while `emitSheet` writes the DECLARED paper, so a sheet that
ever grew would claim a page smaller than its contents - latent today, and the watermark is
deliberately placed against the declared paper because of it.
Task 5: complete (commit 23b2cf2..d994d03).

ALL FIVE TASKS COMPLETE. Final whole-branch review next.
