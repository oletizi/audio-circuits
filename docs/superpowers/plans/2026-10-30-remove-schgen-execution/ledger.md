# SDD ledger — plan: docs/superpowers/plans/2026-10-30-remove-schgen.md

Spec: `docs/superpowers/specs/2026-10-30-remove-schgen-design.md` (read).
Second plan to follow: `docs/superpowers/plans/2026-10-30-institutionalise-draughting.md`.

Branch `feature/schematics-tooling`, worktree at
`/Users/orion/work/audio-circuits-work/pultec-modularize`, PR #20 open.

**Project rule overriding the skill default:** `CLAUDE.md` requires a plan's
execution record to be COMMITTED beside the plan at
`docs/superpowers/plans/<plan-name>-execution/`, because `.superpowers/` is
gitignored and *"an entry there is invisible to review, absent from the history,
and destroyed by `git clean -fdx`."* So this ledger is copied there at the end
rather than deleted with the workspace.

---

## Pre-flight conflict scan

### Shared files and interfaces, pair by pair

| Tasks | Shared file / interface | Finding |
| --- | --- | --- |
| 1 → 4 | `compareSheetToModel` produced / consumed | agrees: five field names match `RoundTripProblems` |
| 3 → 4 | `pultecDesignator` produced / consumed | agrees |
| 2 → 9 | `tests/schgen/nc-pins.test.ts` modified, then deleted with its directory | **flagged — R2** |
| 2, 3 → 9 | `circuits/pultec/schematic/section-board.ts` | agrees: 2 and 3 move pieces out, 9 deletes the remainder. Order correct. |
| 4 → 5 | `tests/circuits/drafted-sheet.ts` | agrees: 4 switches the comparison, 5 exports helpers |
| 4 → 9 | `tests/circuits/guard-equivalence.test.ts` created, then deleted | agrees: the plan states it is temporary |
| 7 → 9 | `lib/schgen/render/occupancy.ts` moved before the directory is deleted | agrees. Order correct. |
| 8 → 9 | guide's schgen imports removed before deletion | agrees. Order correct. |
| 5 → 6 | round-trip proof moved before the stub writer is deleted | agrees. Order correct. |
| 9 → 10 | code deleted before prose corrected | agrees |

### Each task against itself

| Task | Self-agreement | Finding |
| --- | --- | --- |
| 1 | tests specified match the code specified | clean |
| 2 | test imports `readSymbol` from `lib/kicad/symbol-library.ts` | **broken — R3** |
| 3 | clean | clean |
| 4 | Step 3 writes `tests/circuits/sheet-model.ts`; the Files block does not list it | **broken — R1** |
| 5 | clean | clean |
| 6 | clean | clean |
| 7 | clean | clean |
| 8 | clean | clean |
| 9 | file list vs Step 1's "re-run the sweep, do not trust this list" | consistent by design |
| 10 | clean | clean |

### Global Constraints checked against tasks

- "bun test adds no failures" vs Task 9 expecting **0** failures — consistent: the
  8 `port-fidelity` failures are deleted with the code that needs them.
- "make check fails on exactly four boards" — asserted in Tasks 4, 6, 8, 9.
- "not one byte of drafted/ changes" — asserted in Tasks 2, 3, 4, 8, 9.

---

## Rulings

**R1 — `tests/circuits/sheet-model.ts` is a Create of Task 4.** The plan's Step 3
writes it and the Files block omits it. Ruling: it belongs to Task 4, is created
there, and is deleted by Task 9 only if nothing else imports it — the equivalence
test goes, the production guard keeps using it. *Cost if wrong:* a file lands in a
task whose Files block did not predict it; the review package shows it either way.

**R2 — Task 2 may modify `tests/schgen/nc-pins.test.ts` although Task 9 deletes
it.** Intended, not a conflict: Task 2 moves the library-verification arms OUT to a
permanent home under `tests/circuits/`, and Task 9 deletes what remains along with
the `pinsDeclared` gate those arms test. Ruling: proceed as written. *Cost if
wrong:* an arm worth keeping is deleted in Task 9; Task 2's review is where that
is caught, so the reviewer is told to check the split.

**R3 — the Task 2 test's `readSymbol` from `lib/kicad/symbol-library.ts` does not
exist.** Measured: that module exists and survives the deletion (it is under
`lib/kicad/`, not `lib/schgen/`), and exports `symbolPins(block)`,
`librarySymbols(libraryText)`, `flattenedSymbol`, `splitLibId` — but no
`readSymbol`. `tests/schgen/nc-pins.test.ts` reads the library through
`symbolLibraries` from `lib/schgen/render/stock-symbols.ts`, which **is** deleted.
Ruling: Task 2 uses `lib/kicad/symbol-library.ts`'s `librarySymbols` +
`symbolPins`, resolving the installed library's path itself; the implementer must
not write a new symbol parser. *Cost if wrong:* the test reads vendored rather than
installed symbols, which would weaken it — so the brief requires the test to fail
when the installed file is absent rather than falling back.

---

## Progress

Task 1: dispatched (BASE fdbc51a), implementer a13dec14c0a0f9454, model opus.
Task 1: DONE_WITH_CONCERNS at 2d96574 - 18 tests pass, typecheck clean, implementer
  measured equivalence against roundTrip on all five pages itself (element for
  element, sorted) before committing.
Task 1: six concerns raised. Two are coverage gaps and went back before review:
  - the symbol-name half of pinIdentity was not reproduced, and is empty on all
    five pages so the equivalence test cannot catch its absence
  - footprintsUndeclared dropped as a list although it is non-empty on every
    page (7, 2, 2, 2, 8 components)
Task 1: Ruling: both restored before review rather than deferred - after the
  deletion nothing else checks that a page was drawn with the symbol the model
  names, and a dropped channel that no test asserted on is still a dropped
  channel. Cost if wrong: one extra fix round on a task whose equivalence test
  in Task 4 would not have caught either gap.
Task 1: Ruling: concerns 1, 4, 5 and 6 accepted as recorded, not fixed.
  (1) pinNumbers carries declared-not-connected pins and must NOT carry MP -
      an interface contract Task 4 must match, carried into its dispatch.
  (4) a missing designator throws where roundTrip pushed to componentIdentity -
      same output on these boards, different failure mode, acceptable.
  (5) values re-derives via valueFor and throws rather than guessing.
  (6) pinNumbers keyed by canonical pin name cannot address a multi-unit part;
      throws on collision. Does not arise on Pultec. opamp-buffer and
      optical-compressor would hit it, and their authoring files are deleted in
      Task 9, so they end with no guard either way.
  Cost if wrong: (6) is the one with a future cost - a later multi-unit board
  needs the map re-keyed by unit.
Task 1: process deviation noted - module written before the watch-it-fail step,
  so steps 3 and 5 were not a sequence. Positive controls carry that weight
  instead, and a control was required on each restored comparison.
Task 1: fix round 1/5 (2 addressed, 0 open; commits 2d96574..02b921c). Both gaps
  closed. Equivalence re-measured on SIX lists across all five pages, element for
  element sorted: 0/0/1/1/20/7, 0/0/1/1/19/2, 0/0/1/8/17/2, 0/0/1/1/18/2,
  0/0/0/2/31/8.
Task 1: Ruling: the implementer's deviation on the symbol check is ACCEPTED.
  My prescribed mechanism - read component.part?.symbol, throw where absent -
  would have refused all five pages: that field is absent on 18 of 27, 17 of 21,
  15 of 19, 16 of 20 and 29 of 39 components, every ordinary resistor and
  capacitor among them. It measured that before writing, rather than either
  weakening the rule or stopping, and found the third option: roundTrip never
  needed a declaration because it fell through to symbolForKind, a four-entry
  reviewed whitelist inside the module being deleted. The new chain is model
  declaration -> that whitelist -> throw. Strictly the same total function.
  Cost if wrong: the whitelist was transcribed rather than re-derived, so an
  entry wrong about Device:R or Device:C would misreport - but it would have
  fired on 15-29 components per page and reported zero, which is the check.
Task 1: SheetAgreement now carries SIX fields, not five. Task 4's dispatch must
  compare six; footprintsUndeclared is the one whose vocabulary changed (model
  id where the old list used the IR label) and is the most worth asserting.
Task 1: review dispatched (package review-fdbc51a..02b921c.diff, reviewer
  a935095f7c47c448f, model opus), told to re-derive the whitelist's fidelity and
  to test each control for inertness rather than take the implementer's word.
Task 1: review clean on spec (OK) and quality APPROVED, with 3 Important and 5
  Minor. Reviewer verified both controller rulings were done as ruled, compared
  all nine message templates mechanically (identical sets), confirmed the
  carried whitelist is character-identical to lib/schgen/rules/symbols.ts and
  MECHANICAL_PINS identical to lib/schgen/ir/mechanical-pins.ts, and tested each
  control for inertness rather than taking the implementer's word. No schgen
  reach direct or transitive.
Task 1: Ruling: Important 1 goes back to the implementer NOW rather than to
  Task 9. The two carried-over tables lost the tests that kept them from rotting
  - the originals assert every lib id resolves on disk and carry a staleness
  control - and three of the four SYMBOL_BY_KIND entries are currently exercised
  by no test at all. Fixing it in Task 9 relies on Task 9 remembering; fixing it
  here puts the test beside the table it guards. Cost if wrong: one extra round
  on Task 1 rather than a line in a later brief.
Task 1: Ruling: Important 2 (equivalence was measured with both sides sorted, so
  within-list order is unproven) is carried to Task 4, whose test must compare
  UNSORTED. Not a Task 1 defect - the reviewer read the irPart/schematicParts
  chain and found the order should agree; what is missing is the measurement.
  Cost if wrong: an ordering difference ships unnoticed until something depends
  on it.
Task 1: Ruling: Important 3 (the caller's pin-number map is now the authority
  for which pins exist, so a map containing a pin the symbol lacks invents a
  one-member net where roundTrip reported a pin-count disagreement) is a design
  consequence, documented, with a firing control. Carried to Task 4's dispatch.
  Cost if wrong: a guard moved from the symbol library onto the caller, and a
  caller bug reads as agreement.
Task 1: minor (deferred): SheetAgreement fields are mutable string[] where
  RoundTripProblems' are readonly.
Task 1: minor (deferred): field declaration order differs from roundTrip's
  (harmless for toEqual).
Task 1: minor (deferred): the unreachable internal assertion at :367 does not
  meet this repository's refusal-message bar.
Task 1: minor (deferred): the id-equals-label enumeration lives only in the
  gitignored report; the claim itself is committed and Task 4 re-runs it.
Task 1: minor (deferred): brief steps 3 and 5 (watch it fail) not performed;
  disclosed, and the reviewer verified every control by reading instead.
Task 1: reviewer could not verify the five-page equivalence tables from the diff
  - the harness was a scratch script, run and deleted. Task 4 is the artifact
  that settles it. Accepted.
Task 1: fix round 2/5 dispatched (Important 1 only; Minors explicitly excluded
  per the skill - they never enter the loop).
Task 1: fix round 2/5 (1 addressed, 0 open; commits 02b921c..2ae9f20). Re-review
  ADDRESSED on all five checks, verified by tracing the logic rather than
  trusting the report. No new breakage.
Task 1: minor (deferred): the ported MECHANICAL_PINS test DROPS the original's
  geometric check (endpointsAt - that no stroke endpoint reaches the listed pin,
  i.e. that it is truly unreached by a conductor). A future entry wrongly naming
  an electrically-connected pin would pass the new test and fail the old one.
  Ruling: deferred, not fixed now. The table has ONE entry, adding one is
  already gated by its own header rule ("a deliberate edit with a test beside
  it"), and the library-drift half of the original is covered by the new
  resolution arm. Cost if wrong: the next entry added to that table gets a
  weaker guard than the first one had. FLAGGED FOR THE FINAL REVIEW.
Task 1: minor (deferred): symbol-library-disk.ts now caches each library twice
  (LIBRARIES and PARSED, both keyed by file) - redundant, not incorrect.
Task 1: complete (commits fdbc51a..2ae9f20, review clean, 7 minors deferred)
Task 2: dispatched (BASE 2ae9f20), implementer ab0aa36130c508bfb, model sonnet.
Task 2: DONE at c685da0 - POLE_PIN/THROW_PINS moved to physical/parts.ts with
  doc comments verbatim; nc-pins.test.ts split; three positive controls; a live
  mutation of POLE_PIN confirmed the real check has teeth, then reverted
  byte-for-byte. 4090 pass / 8 fail (same 8), typecheck clean, make check on
  exactly four boards, five drafted digests byte-identical.
Task 2: Ruling: the implementer's own concern is accepted and sent back as fix
  round 1 rather than deferred to Task 9. It left two geometry arms behind in
  nc-pins.test.ts because installedSymbolPinNumbers exposes only pin NUMBERS -
  not type, name, position or angle - so checks about those cannot be ported.
  That is the SAME root cause as Task 1's deferred finding, where the original
  mechanical-pins arm verified geometrically (endpointsAt) that a listed pin has
  no stroke endpoint reaching it, and the port dropped it.
  ONE hole, TWO sets of lost coverage. The fix is to widen the helper to carry
  each pin's full shape and port all three arms.
  Cost if wrong: a wider helper than strictly needed, and one more round on
  Task 2 - against the alternative of a brief telling Task 9 to remember, which
  is what this plan's ordering exists to avoid.
Task 2: the implementer is told to STOP and say so if the stroke geometry is not
  reachable from symbolPins, rather than approximating - a weaker check that
  looks like the original is worse than a missing one.
Task 2: fix round 1/5 dispatched.
Task 2: fix round 1/5 (1 addressed, 0 open; commits c685da0..60a46dd). Helper
  widened in lib/kicad/symbol-library.ts (SymbolPin gained name/type/length;
  symbolStrokeSegments and strokeEndpointsAt added; supportedUnitSymbols
  factored so a pin walk and a graphics walk cannot disagree about unit scope).
  All three stranded arms ported. Three live mutations, each reverted and
  diffed clean. 4094 pass / 8 fail (same 8 by name), make check four boards,
  typecheck clean, five digests unchanged.
Task 2: TOOLCHAIN INCIDENT, recorded because it is a fact about this machine.
  A full bun test run segfaulted - panic(main thread): Segmentation fault at
  address 0x204, Bun 1.3.8, 160.4s in, last file printed
  tests/schgen/direction-seed.test.ts, RSS peak 1.58GB of 17.18GB so not OOM.
  Two things were running concurrently at the time, make check and a second
  full suite THIS CONTROLLER launched by mistake. A solo retry passed through
  the same file cleanly.
  Ruling: recorded as a suspicion, not a cause. One crash under concurrency and
  one clean pass without it is two observations and does not establish why.
  Cost if wrong: a real Bun bug gets attributed to load and nobody looks again -
  which is why the record names the file, the address and the RSS rather than
  only the conclusion.
Task 2: controller error, recorded. I launched a full bun test while the
  implementer was launching its solo retry, which is the exact contention I had
  just been told was the suspected trigger. Killed mine. Cost: one wasted suite
  run and a confounded observation.
Task 2: review SPEC FAILED, quality NOT APPROVED, 1 Critical.
  The original describe block had FOUR tests. Round 1 removed two and left a
  comment saying both moved. Only one did. The other asserted real geometry -
  pole at angle 0, every throw at 180 on the opposite side by sign of x - and
  was replaced by a bare pin-number membership check. Grepped repo-wide: the
  assertion exists nowhere.
  Why it matters: the surviving exact-pin-set test compares a UNION. Mislabel
  the pole as a throw and fold the real pole into THROW_PINS, and the union is
  unchanged - every surviving test passes. The deleted test was the only one
  that caught a pole/throw swap, which is a real wiring error in a real switch.
Task 2: Ruling: fix, do not park. Restore the angle/side assertions - Round 2's
  widened installedSymbolPins now exposes angle and position, which is exactly
  what the old disk helper could not give and why it was dropped - and correct
  the record in both the source comment and the new commit message, since
  c685da0 is pushed and cannot be rewritten. Cost if wrong: one more round on a
  task already at two.
Task 2: PATTERN, third instance in two tasks, and it is systemic rather than
  incidental. Task 1 dropped endpointsAt from the mechanical-pins port. Task 2
  round 1 stranded two arms because the helper was too narrow. Task 2 round 1
  also dropped this one. EVERY instance was a port that came out weaker than its
  original while being described as faithful, and EVERY instance was caught by
  someone diffing against the source rather than reading the summary.
  Ruling: for every remaining task in both plans that ports or relocates a test,
  the dispatch carries this instruction - open the original, enumerate its
  assertions, account for each one as moved, strengthened or dropped-with-reason,
  and treat an unaccounted assertion as the finding. The reviewer dispatch
  carries the matching instruction to diff against the original rather than
  trust the summary. Cost if wrong: longer briefs on tasks 3-10 and the second
  plan, against three silent downgrades in two tasks without it.
Task 2: fix round 2/5 dispatched.
Task 2: fix round 2/5 (1 addressed, 0 open; commits 60a46dd..a8646cb). Angle and
  side assertions restored, generalised over the whole POLE_PIN table with
  THROW_PINS[libId] as the throw set - because SW_Rotary_1x6_MP's MP lug sits on
  the pole's OWN side at angle 0, so "every other pin" would have wrongly
  demanded it sit opposite. Swap control fires. Comments corrected in both test
  files; commit message states plainly that c685da0 described a drop as a move.
Task 2: gates confirmed by the controller rather than the implementer this round,
  because the implementer was repeatedly cut off mid-wait: bun test 4096/8 with
  all eight named and matching the port-fidelity baseline, make check exit 2 on
  exactly the four baseline boards with all five Pultec boards ok.
Task 2: re-review ADDRESSED, no new breakage. Reviewer diffed the restored
  assertion against git show c685da0^ claim by claim (pole angle, throw angle,
  opposite-side sign - identical formulas), and VERIFIED THE MP CLAIM AGAINST
  THE INSTALLED LIBRARY rather than the report: SW_Rotary_1x6_MP pole pin 7 at
  (-7.62, 0, angle 0), MP at (-7.62, -5.08, angle 0) - same x, same angle, so
  MP is on the pole's own side and "every other pin" would indeed have been
  wrong. Swap control traced by hand against real coordinates; fails on both
  restored checks independently.
Task 2: minor (deferred): libId.endsWith("_MP") is a naming heuristic rather
  than a MECHANICAL_PINS table lookup. Covers both real entries correctly today.
Task 2: complete (commits 2ae9f20..a8646cb, review clean, 2 minors deferred)
Task 3: dispatched (BASE a8646cb), implementer a11d45bad03720609, model sonnet,
  carrying the standing porting instruction for the first time.
Task 3: DONE at f44e3f0. pultecDesignator, JUNCTION_DESIGNATORS and the
  DESIGNATOR regex moved to circuits/pultec/designators.ts, doc comments
  verbatim except two path references the move itself made stale (updated and
  disclosed, not silently). Repo-wide grep before and after found no other
  importer, so the five section files needed no change.
Task 3: THE PORTING INSTRUCTION WORKED ON ITS FIRST OUTING. The implementer
  enumerated the original's assertions and found one the brief's own given
  tests did not exercise - the throw on an id whose upper-cased form fails the
  ^[A-Z][A-Z0-9_]*$ check - and added it as the positive control. That is the
  class of omission that went uncaught three times in Tasks 1 and 2.
Task 3: 4099 pass / 8 fail (+3, same 8 by name), typecheck clean, make check on
  exactly four boards with all five Pultec ok, five digests unchanged.
Task 3: review dispatched.
Task 3: review spec OK, quality APPROVED, 1 Minor, no Critical or Important.
  Reviewer extracted the original block with git show and diffed byte-for-byte:
  found THREE differences where the report claimed two. The third is an export
  keyword JUNCTION_DESIGNATORS gained, required by the brief's own interface.
  Function body, DESIGNATOR regex (correctly kept private), map contents and the
  throw message are character-for-character identical. Reviewer independently
  re-grepped for other importers and confirmed none, and ran the new test itself.
Task 3: minor (deferred): the report and commit message say "verbatim except two
  path references" and omit the added export keyword. The change is correct and
  forced; only the completeness of the claim is imprecise. Recorded rather than
  escalated because the port is additive, not weakened - which is the thing the
  three prior failures had in common and this one does not.
Task 3: complete (commits a8646cb..f44e3f0, review clean, 1 minor deferred)
Task 4: dispatched (BASE f44e3f0), implementer a5923339a257ddaab, model opus.
Task 4: DONE_WITH_CONCERNS then fix round 1 (concern 1 closed; commits
  f44e3f0..b781ad5 = d432e7a, a02e8da, b4cc896, b781ad5).
Task 4: THE GATE THE PLAN TURNS ON IS PASSED. All five approved pages agree with
  roundTrip on all SIX lists, element for element, UNSORTED, with five pin-swap
  controls firing. Task 1's carried Important 2 (ordering believed, not measured)
  is now measured: no ordering difference on any list on any page.
Task 4: three findings the brief did not predict, all accepted.
  (1) pultecDesignator is NOT the designator map these pages carry - it answers
      SW_HI_CUT where the export says SW1. The pages were annotated from an
      EMPTY refs lock. The rule is reproduced in sheet-model.ts with its three
      generator facts named, and DELIBERATELY not read off the netlist under
      test, which would have made componentIdentity vacuous. MY SPEC WAS WRONG
      to say pultecDesignator was sufficient; Task 3's move was still correct,
      it supplies the label the rule consumes.
  (2) R2 on pultec-low-boost carries a declared pin swap no rule derives, from
      the override committed 2026-10-30 that I had told the owner should
      probably be reverted. It was not, so it binds. Carried into
      DECLARED_PIN_NUMBERS with his quote and the hairpins measurement.
  (3) SPDT_PINS had no surviving home; moved to parts.ts as a disclosed
      widening of Task 2's move rather than declared twice.
Task 4: Ruling: concern 1 fixed now rather than left for Task 9. footprintsUndeclared
  had no production reader - only the temporary equivalence test asserted it, and
  Task 9 deletes that. THIRD instance of this shape (Task 1 tables, Task 2 arms,
  this). Cost if wrong: five board-file edits against a line in Task 9's brief
  that would have to survive five intervening tasks.
Task 4: fix landed at b781ad5. footprintlessParts added per board, measured
  fresh not transcribed, every member confirmed to be an off-board part
  (inductor, pot or switch) with no on-board passive hiding in the lists.
  Asserted exactly and unsorted, never as a count - the failure that matters is
  a component moving between footprintsUndeclared and footprints, which leaves
  the count unchanged. Live mutation proved teeth. A stale header comment saying
  the shared body asserts nothing about that list was corrected.
Task 4: ALL SIX lists now have a production reader, so Task 9 can delete
  guard-equivalence.test.ts without losing a channel.
Task 4: 4109 pass / 8 fail (same eight), typecheck clean, make check exactly four
  boards with all five Pultec ok, five digests unchanged, tree clean.
Task 4: review dispatched.
Task 4: review spec OK, quality APPROVED. No Critical, no Important, 6 Minor.
  THE GATE IS PROVEN, and the reviewer measured rather than accepted:
  - sheet-model.ts reads exactly ONE file, boards/<board>/perfboard.json. No
    importNetlist, no .net path anywhere in it. The two sides CANNOT share the
    artifact under test - structurally, not by discipline.
  - the designator rule is load-bearing: its output differs from
    pultecDesignator's label for 27 of 27 components on hi-boost and 39 of 39 on
    mid, so the rule does all the work. A plausibly-wrong variant (counting
    globally instead of per prefix) yields 36 and 44 disagreements - the rule is
    not one of a family that all happen to pass.
  - the annotation rule was traced to annotate.ts/build.ts/from-network.ts and
    is EXACT, not coincidental: order is the network index, label is
    pultecDesignator, prefix is the same /^([A-Z]+)/ regex.
  - agreement is over populated data: footprints 17-31 entries per board (105
    strings total), footprintsUndeclared 2-8 (21 ids).
  - the pin map was perturbed pair by pair: every rotary selector catches ALL
    swaps (SW_MID 78 of 78), SPDT 3 of 3. Only electrically-tied pot pairs are
    invisible, which is a property of the circuit.
  - the swap control's degenerate case is handled by FAILING, not passing; the
    victim is never a degenerate component on any of the five boards.
  - footprintlessParts recomputed independently: identical on all five, every
    member off-board (inductor, pot, switch), every one footprint === undefined.
  - sheet-model.ts transitive import graph: 36 modules, ZERO schgen.
Task 4: minor (deferred): the report claims DECLARED_PIN_NUMBERS refuses a stale
  BOARD key; only the component half is enforced. A typo'd board key makes the
  R2 entry inert and the guard then fails with the wrong message. Three lines to
  close. FLAGGED FOR FINAL REVIEW.
Task 4: minor (deferred): sheet-model.ts:34-35 says the exports carry SI1..SI6;
  counted, it is SI1..SI8 / SI1..SI6 / SI1..SI8 / SI1..SI9 / SI1..SI9 - true of
  one board of five. Exactly the stale-figure-in-prose class CLAUDE.md names.
  FLAGGED FOR FINAL REVIEW.
Task 4: minor (deferred): the equivalence test floors non-vacuity on footprints
  and footprintsUndeclared only, so pinIdentity equivalence on mid is two empty
  lists agreeing. Mitigated by the production guards asserting both per board.
Task 4: minor (deferred): section-board.ts still compares a literal
  "Switch:SW_SPDT" where TOGGLE_SYMBOL exists; pre-existing, file dies later.
Task 4: minor (deferred): cosmetic reflow damage in section-board.ts:43-45;
  file dies later.
Task 4: minor (deferred): bracket-index lookups on string-keyed records where
  sheet-agreement.ts uses Object.hasOwn and says why. Theoretical here.
Task 4: complete (commits f44e3f0..b781ad5, review clean, 6 minors deferred)
Task 5: dispatched (BASE b781ad5), implementer a8800a2000c7732c3, model sonnet.
Task 5: DONE at 002175a - the five drafted pages now get a fresh kicad-cli
  export compared against the model at bun-test time, which is a different
  claim from the existing guards (those read the committed .net fixture).
Task 5: ITS STEP 4 MEASUREMENT FOUND THE ONE REAL COVERAGE LOSS IN THIS PLAN,
  and then it turned out not to be forced. The five transistor-preamp boards
  would have lost their only bun-test-time, live-kicad-cli, model-vs-schematic
  proof, because their version writes a stub and exports that, and the stub
  writer dies in Task 6.
  Ruling: close it rather than hand Task 6 a warning. Checked before ruling -
  all five have a committed hand-drawn .kicad_sch, all five export DESIGNATORS,
  and toImportedNetlist lives in lib/kicad/from-network.ts, which SURVIVES. So
  Task 6 removes the SUBJECT of the proof, not the proof. Cost if wrong: one
  more round on Task 5 against a permanent hole in ten boards' coverage.
Task 5: closed at dec1009. tests/circuits/committed-schematic.ts plus
  transistor-preamp-kicad-round-trip.test.ts export each board's already
  committed .kicad_sch with kicad-cli now and compare via expectSameCircuit /
  toImportedNetlist - the VeroRoute vocabulary those boards actually use, NOT
  compareSheetToModel, which drafted-sheet.ts's header explains is the wrong
  vocabulary for them. Controls verified by scratch run to fail on the real
  partition mismatch rather than on withOnePinMoved's own precondition.
Task 5: coverage is NOT reduced after Task 6. All ten boards now have the same
  bun-test-time live-kicad-cli model-vs-schematic proof. Task 6's planned
  comment that Task 5's round trip is the remaining proof is now literally true.
Task 5: 4129 pass / 8 fail (same eight), typecheck clean, make check exactly
  four boards, five digests unchanged.
Task 5: FOR TASK 6'S DISPATCH - committed-schematic.ts DUPLICATES rather than
  imports kicad-round-trip.ts's comparison logic, deliberately, because that
  file dies in Task 6. If kicad-round-trip.ts is edited before Task 6 runs the
  two could drift. Task 6 resolves the duplication by deleting the original.
Task 5: review dispatched.
Task 5: review spec OK, quality APPROVED. No Critical, no Important, 2 Minor.
  Reviewer verified the load-bearing claims empirically rather than by reading:
  - set KICAD_CLI to a nonexistent path and re-ran both new files: all 20 tests
    failed with the refuse-do-not-skip error from inside the export helpers. A
    fixture read would have been unaffected. The export is genuinely live.
  - proved the controls fire for the right reason on ALL TEN boards, not the two
    the report scratch-checked: withOnePinMoved is called outside the toThrow
    wrapper, so its own precondition firing would fail the test outright rather
    than read as a pass. 10/10 and 10/10 passing is therefore proof the
    precondition never fired on any board.
  - diffed committed-schematic.ts against kicad-round-trip.ts by hand: partition,
    valuesOf and expectSameCircuit byte-for-byte identical logic. The only
    difference is BoardUnderTest dropping a notes field that expectSameCircuit
    never reads and only writeSchematicStub needed. A legitimate omission.
  - confirmed the comparison-vocabulary split is correct for each set rather
    than convenient: the preamp boards use the same vocabulary their own dying
    test already used.
Task 5: minor (deferred): the duplicated comparison logic could drift from its
  original if kicad-round-trip.ts is edited before Task 6 deletes it. Carried
  into Task 6's dispatch.
Task 5: minor (deferred): the reviewer could not independently confirm the full
  suite counts, having been told not to re-run them. Its targeted runs are
  consistent with them.
Task 5: complete (commits b781ad5..dec1009, review clean, 2 minors deferred)
Task 6: dispatched (BASE dec1009), implementer a451f618753a047b3, model sonnet.
Task 6: DONE at 933583e (dd7ba1a + 933583e). FIRST DELETION IN THE PLAN.
  Deleted lib/kicad/schematic.ts, tests/circuits/kicad-round-trip.ts,
  tests/circuits/stub-writer-tripwire.test.ts, and a FOURTH file the brief did
  not list - tests/kicad/schematic.test.ts - found by the import sweep I told it
  to run instead of trusting the file list. That instruction existed because an
  earlier sweep in this plan missed a real import; it paid off here.
  4129 -> 4117 pass, and the drop of 12 is exactly the tests deleted. Same eight
  failures. make check on exactly four boards. Five digests unchanged.
Task 6: accounting done per file - each preamp board's stub test deleted with a
  comment naming Task 5's transistor-preamp-kicad-round-trip.test.ts as the
  surviving live-kicad-cli proof FOR THAT BOARD (superseded, not dropped), and
  each board's second test repointed onto committed-schematic.ts rather than
  deleted, since it never needed the writer.
Task 6: the Task 5 duplication is resolved - with kicad-round-trip.ts gone,
  committed-schematic.ts is the sole copy and the drift risk is closed.
Task 6: TO CHECK IN REVIEW - the six tests in tests/kicad/schematic.test.ts are
  recorded as DROPPED rather than superseded, on the grounds that they covered
  only the deleted writer's internal mechanics. Legitimate on its face, but it
  is the one place this task removed coverage without a successor, so the
  reviewer is told to read those six and confirm none tested something that
  outlives the writer.
Task 6: TO CHECK IN REVIEW - lib/kicad/symbol-library.ts and
  lib/kicad/symbols/PROVENANCE.md still mention lib/kicad/schematic.ts in prose.
  symbol-library.ts is LIVE code whose comment now describes a deleted consumer,
  which is a stale claim rather than an inert dangling reference.
Task 6: review dispatched.
Task 6: review spec OK, quality APPROVED, 1 Important, 1 Minor.
  Reviewer read all six dropped tests individually. Five have successors
  elsewhere; the sixth - the stub's \n multi-line escape - has NO successor BY
  DESIGN, because schgen deliberately refuses to re-emit that escape rather
  than reproduce it. An intentional non-successor, not a gap. The per-board
  supersession claim verified literally, five boards, paths resolved on disk.
Task 6: Ruling: the Important (two false present-tense consumer claims in live
  code) fixed in this task rather than deferred. The reviewer's point decided
  it - no later task in this plan touches those files, so deferring meant no
  scheduled home. Cost if wrong: one extra commit on a task already done.
Task 6: correction landed at f5694c9 and the sharper fact is stated rather than
  rounded: the surviving consumer does not import symbolPins at all, so
  symbolPins and supportedUnitSymbols have ZERO production callers and are
  test-only - with the note that Task 9 deletes that consumer and changes the
  answer again.
Task 6: Ruling: I verified the comment-only correction MYSELF by grep and diff
  rather than dispatching a scoped re-review. Deviation from the skill, taken
  because the change is two comment edits with no behavioural surface and the
  gates were re-confirmed unchanged. Cost if wrong: an unreviewed doc edit -
  the final whole-branch review still sees it.
Task 6: 4117 pass / 8 fail, make check exactly four boards, typecheck clean,
  five digests unchanged.
Task 6: complete (commits dec1009..f5694c9, review clean)
Task 7: dispatched (BASE f5694c9), implementer a8a63d83a086224cd, model sonnet.
Task 7: DONE at 32cbf63.
Task 7: THE SWEEP INSTRUCTION PAID OFF A SECOND TIME. My brief said occupancy.ts
  had ONE importer. It had FOUR: tools/guide/placement.ts (the one I named),
  lib/schgen/render/field-placement.ts (a same-directory ./occupancy.ts import
  INVISIBLE to a path-literal grep - that is the lesson), tools/schgen/
  text-metrics/placement.ts (dead but typechecked), and
  tests/schgen/render/field-fallback.test.ts. A fifth fix was needed to hold
  the gate: port-manifest.json still named the file at its old path, which
  broke port-fidelity's accounting with 2 failures beyond baseline.
Task 7: READABILITY-BASELINES REGISTRY - measured, raised, NOT answered, NOT
  deleted. The decisive fact for the owner's ruling: the file has exactly ONE
  commit in its history (2026-10-20) and HOLDS ZERO GRANTED BASELINES, ever.
  Its loader is read today only from inside lib/schgen, tools/schgen and
  tests/schgen - all deleted in Task 9 - after which it has no reader at all.
  A comment was placed in baseline.ts flagging it for Task 9 and forbidding
  deletion without an owner answer; the JSON's own schema validation forbids a
  comment field in the registry itself.
Task 7: 4117 pass / 8 fail (exact baseline), typecheck clean, make check on
  exactly four boards, five digests unchanged.
Task 7: carried forward - the registry finding must reach Task 10's findings
  doc, and docs/known-gaps.md once the owner rules.
Task 7: review dispatched.
