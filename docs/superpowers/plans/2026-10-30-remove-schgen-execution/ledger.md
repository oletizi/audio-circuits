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
Task 7: review spec OK, quality APPROVED, 1 Important. Reviewer re-swept two
  ways (path literal AND by symbol name) and confirmed four importers, no
  fifth, including no runtime-only path. Moved test byte-for-byte on its three
  assertions. port-manifest fix confirmed a real fix: that test fails on
  accountedButMissing exactly when a listed file is not at its path.
Task 7: Ruling: the Important stands - the implementer put its registry warning
  in lib/schgen/readability/baseline.ts, which TASK 9 DELETES WHOLESALE, and
  called that location natural without answering the brief's actual question of
  whether it survives. It does not. Fixed by placing schematic/README.md beside
  the registry itself, which Task 9 does not touch. Cost if wrong: a sibling
  README where a code comment would have done - trivial against a finding that
  evaporates.
Task 7: fix landed at 78985ef. Carries the measurements (one commit b526c1d
  2026-10-20, "baselines": [] with zero entries ever, nothing can read it after
  Task 9), states the decision is the owner's and not an agent's, and records
  the transferable lesson that a warning in a doomed file is not a durable
  record.
Task 7: CONTROLLER PROCESS DEFECT, found by this reviewer and acted on.
  The whole execution record - ledger and seven task reports - was still in the
  gitignored .superpowers/ workspace seven tasks in. CLAUDE.md requires it
  committed beside the plan precisely because an entry there is destroyed by
  git clean -fdx. Committed at d696854 to
  docs/superpowers/plans/2026-10-30-remove-schgen-execution/ with a README
  carrying what the diff cannot show. Waiting for the final review would have
  been the same mistake the rule exists to prevent.
Task 7: complete (commits f5694c9..78985ef, review clean)
Task 8: dispatched (BASE 78985ef), implementer a4be589f1cd60c1d5, model sonnet.
Task 8: DONE at f6a4d40. resolveSchematic reduced to two outcomes, printed and
  none. The generate path, the temp-directory lifecycle, the worstClass gate,
  generatedNote and withheldSchematicNotice all gone.
Task 8: THE SYMBOL-NAME SWEEP PAID OFF A THIRD TIME. packet.ts imported
  boardRefs and boardSheets from tools/schgen/board-sheets.ts directly as its
  own deps defaults - NOT in the brief's file list, and separate from
  schematic-source.ts. Found by sweeping for the symbol names rather than the
  path, which is now three tasks running (6, 7, 8) where that instruction
  caught a consumer the brief had missed.
Task 8: two test files deleted wholesale with per-assertion accounting in the
  commit message: one assertion superseded by existing coverage in
  guide.test.ts, nine with no successor because the behaviour they tested no
  longer exists.
Task 8: no withholding reintroduced. The only surviving notice path is the
  pre-existing "this board declares no sch at all" case, which is not a ground
  for holding a drawing back - EVALUATING-DRAWINGS section 3 permits exactly
  one, an electrical fault.
Task 8: 4107 pass / 8 fail (drop of 10 is exactly the two deleted files, same
  eight by name), typecheck clean, make check exactly four boards, all five
  guides regenerated with page 2 the merged schematic, five digests unchanged.
Task 8: review dispatched.
Task 8: review spec OK, quality APPROVED. NO Critical, NO Important, no Minor
  worth recording - the first completely clean task in the plan.
  Reviewer confirmed the withheld and generated members are deleted from the
  TYPE, not merely unreached, and grepped tools/guide/ for worstClass,
  "withheld", "generated", boardRefs, boardSheets and schgen - every remaining
  hit is prose. No path under tools/guide/ can suppress or decline a declared
  sheet for any reason but "this board declares none".
  Read both deleted test files in full: four of five assertions in one and all
  five in the other drive types or signatures that no longer exist; the one
  superseded assertion was checked against guide.test.ts:193-226 and found to
  be a SUBSET of what already covers it.
  Spot-checked the guide by measurement: 12 pages, the Schematic row reads
  "page 2 of this document, printed from drafted/.../pultec-hi-cut...", and
  pdftotext on page 2 returns schematic content. Explicitly declined to
  characterise the drawing.
Task 8: complete (commits 78985ef..f6a4d40, review clean, 0 minors)
Task 9: dispatched (BASE f6a4d40), implementer a47f576711a676399, model opus.
Task 9: DONE in five staged commits 84e810b, 38c147c, 6085dc5, dfd629e,
  7a1b813. 342 files, ~42,500 lines deleted. bun test 2669 pass / ZERO fail -
  the eight port-fidelity failures went with their code. make check on exactly
  the four baseline boards. Five digests byte-identical, git diff on drafted/
  and schematic/ empty. All five guides rebuild with page 2 the schematic, and
  that message is gated on carriesSchematic so it is evidence rather than
  assertion.
Task 9: accounting - all 124 test files had their subject inside the deleted
  trees, MEASURED by resolving every import rather than assumed. Five outliving
  claims were already ported by Tasks 1/5/6, each verified against its new home.
  ONE WAS UNACCOUNTED AND IS THE FINDING: stock-symbols.test.ts arm 1 was the
  only check that the vendored symbols are byte-identical to the installed
  library, and BOTH SIDES OF THAT CLAIM SURVIVE. Ported to
  tests/kicad/symbol-names.test.ts with a perturbation control. Four guards
  genuinely dropped and named.
Task 9: THE SWEEP FOUND MORE THAN THE BRIEF AGAIN, fourth task running.
  Sixteen layout-intent files, not the ten I listed. Three ported files outside
  lib/schgen that became unreachable. And four repo-wide static guards whose
  BOTH-DIRECTION exemption pins broke when tests/schgen went. Handled well:
  each exemption list is DELETED rather than emptied, with a comment where it
  stood, so every swept id now has to resolve with nothing to skip past.
  A reachability sweep finds exactly one unreached module in 620.
Task 9: concerns carried - (1) valueIsSymbolPartName is now an orphan, labelled
  rather than deleted since the brief did not list it; (3) two docs carry re-run
  instructions for deleted test files and the guard that would have caught that
  is one of the four dropped - TASK 10 MUST SWEEP FOR THESE; (4) docs/research
  pasted probe output is no longer held to its committed log; (5) elkjs is still
  a package.json dependency with no importer, left out of a deletion commit to
  avoid a lockfile change; (6) pt2399-core still fails make check on a BOM rule
  before its drawing is ever looked at, which is the G303 shape.
Task 9: review dispatched.
Task 9: review spec OK, quality APPROVED with 3 Important, 3 Minor. Reviewer
  resolved imports for all 126 deleted test files (exactly 3 with no schgen
  import, each verified a correct drop), confirmed all four exemption guards
  are STRICTER not quieter (list deleted AND the skip-arm removed from the
  sweep), reconciled the 1,446-case drop exactly, and confirmed every protected
  and relocated item intact with git diff on drafted/ and schematic/ empty.
Task 9: IMPORTANT 1 - THE ONE DROP WHOSE SUBJECT SURVIVES. document-pastes
  (44 cases) was dropped as "docs/research/'s pasted output, out of scope".
  verify-pastes.ts:59 reads DOCUMENT = docs/schematic/text-handling-research.md
  - the 432 KB deliverable CLAUDE.md names, which SURVIVES. The checker imports
  only node:fs; it sat under tools/schgen/ by accident of history. Its log went
  too, so the guard could not be rebuilt from the tree at all.
  Ruling: restore rather than disclose. Cost if wrong: a relocated checker and
  four logs against a surviving deliverable silently unguarded.
Task 9: IMPORTANT 2 - the new control could not fail.
  expect(installed).not.toBe(vendored + " ") is a tautology; under the sabotage
  its own comment named, both lines pass. The inert-control defect this plan
  caught three times in other code, written into the fix for it.
Task 9: fix landed at 22e184e. Guard restored as a MOVE not a rebuild -
  tools/text-metrics/verify-pastes.ts, tests/text-metrics/document-pastes.test.ts
  (44 cases pass, commit-pin coupling included), and FOUR logs (not one) beside
  the document they pin, each verified byte-identical by sha256 against git.
  The four probes stay deleted as generator code, and the one claim that
  genuinely changed - section 6, whose probe needed nothing external - is
  recorded on that section's own comment.
  Control rebuilt: comparison factored into vendoredDrift() so a control cannot
  exercise a different comparison; one control perturbs the INSTALLED side,
  one hands the flattener a different symbol. PROVEN BY DRIVING THE SABOTAGE -
  old control's two lines both pass, new control fails.
Task 9: TOTALS CORRECTED. 367 files and 69,733 lines across the three deletion
  commits, net 361 after the six restored. My relay of 342/~42,500 to the owner
  was wrong - that was commit 6085dc5 alone - and I repeated it on the
  implementer's authority without checking. Corrected to him.
Task 9: FOR TASK 10, the part it cannot infer: NOTHING IN THE REPOSITORY GUARDS
  A DOC-TO-TEST POINTER ANY MORE. The guard that did was a whitelist, every row
  cited a deleted test file, and it pinned its own length - so a repaired
  citation in m1-remeasurement.md or reference-graph-checks.md will not be held
  to its test by anything, and a future one goes stale silently.
Task 9: scoped re-review dispatched.
Task 9: re-review returns ALL THREE ADDRESSED, every claim re-derived rather
  than taken: the checker diffed against git show 84e810b^ and found identical
  in logic (only path strings and added commentary differ), test(  count 45 in
  both, all four logs sha256-matched against their pre-deletion blobs
  (77459d6f, b045786a, aef8898f, 4fc805b5), no control bytes in any of the six
  touched files, diff footprint exactly ten paths with nothing else resurrected,
  and the totals re-derived independently from git show --name-status on all
  three deletion commits: 154+4+209 = 367 files, 26,820+448+42,465 = 69,733
  lines, net 361.
Task 9: MY OWN LEDGER CLAIM NARROWED by the re-review, and it is the honest
  correction. I wrote that the factoring means "a control cannot exercise a
  different comparison than the real arm" and that both controls call
  vendoredDrift. Control 2 does NOT - it calls flattenedSymbol directly and
  compares by hand, so it would not catch a vendoredDrift hardcoded to return
  undefined. Ruling: ACCEPT as is. The two controls sabotage two different
  layers on purpose - Control 1 shares vendoredDrift and drives it to fail,
  Control 2 proves flattenedSymbol honours its name argument - and the defect
  this round existed to fix, a self-comparison that cannot fail, is gone and
  was driven. What was wrong was my sentence, not the test. Cost if wrong: a
  sabotage of vendoredDrift itself is caught by Control 1 but not Control 2,
  which is one control rather than two on that layer.
Task 9: complete. Commit range 38c147c..22e184e.
Task 10: PRE-DISPATCH SWEEP AND RULINGS. The brief's Step 3 is one line for
  four files; the sweep says README.md alone has four separate regions of live
  instruction, and six files the plan never names carry dangling commands.
  Ruling: Task 10 corrects every file whose prose reads as a LIVE INSTRUCTION,
  and leaves every dated or verbatim record alone. The rulings, each with what
  it costs if wrong:
Task 10: Ruling A - NO REPLACEMENT TOOL EXISTS for board-sheets.ts, and
  CLAUDE.md must not invent one. "Which boards draw" is now answered by
  drafted/<circuit>/<board>/ plus each RECORD.md digest, held by
  tests/circuits/drafted-kicad-round-trip.test.ts, with TOOLING.md for how a
  page gets there. The governance of that paragraph - a figure in prose is a
  transcription with a date on it - survives verbatim; only the mechanism
  changes. Cost if wrong: the paragraph names a weaker check than exists.
Task 10: Ruling B - NO FORWARD REFERENCE to the institutionalisation plan's
  unbuilt make targets (make draw, make draught-doctor). A command that does
  not exist yet is the same defect being removed, one plan early. Cost if
  wrong: CLAUDE.md is correct today and must be amended again when they land -
  which is the right way round.
Task 10: Ruling C - TOOLING.md gets its falsehoods corrected and nothing more
  (the bun justification at :54, the board-sheets command at :68, the
  lib/schgen sentence at :38-40). Task 6 of
  docs/superpowers/plans/2026-10-30-institutionalise-draughting.md owns
  TOOLING.md's structure. Cost if wrong: one file edited twice.
Task 10: Ruling D - WHAT IS A RECORD AND MAY NOT BE EDITED, widening the
  brief's Step 4 grep: docs/schematic/verdicts.md (the owner's verbatim words
  bound to a sha256 - append-only), every docs/schematic file with a date in
  its name, docs/schematic/schgen-development-history.md, docs/known-gaps.md
  (frozen), docs/research/, docs/superpowers/, DEVELOPMENT-LOG.md, and the five
  drafted/ RECORD.md files. A citation in these that resolves to nothing is
  inert, which CLAUDE.md explicitly accepts. Cost if wrong: an owner verdict or
  a dated finding is quietly rewritten, which is the one unrecoverable edit on
  this task.
Task 10: Ruling E - template-parity.md and template-parity-anchors.md are
  DELETED, not annotated. Both are headed "GENERATED - do not hand-edit" and
  name a generator verb (bun run schgen-parity, bun run schgen-anchors) that no
  longer exists, so they are derived artifacts nothing can regenerate or check
  - "supersede means delete", and a stale derived artifact is exactly what
  makes stale look current. Their citation from the dated 2026-10-26 governance
  review goes inert by Ruling D. Cost if wrong: two generated tables about a
  deleted generator's templates, recoverable from git at the commit before.
Task 10: Ruling F - m1-remeasurement.md and reference-graph-checks.md keep
  their measurements and lose their instruction. Each command block is headed
  with the fact that every command in it was deleted, naming the commit, so the
  block stops reading as something to run. Carry the Task 9 re-review's finding
  into the heading: NOTHING IN THE REPOSITORY GUARDS A DOC-TO-TEST POINTER ANY
  MORE. Cost if wrong: two documents still read as runnable.
Task 10: Ruling G - THE HAZARD ON THIS TASK, and it is a real one.
  docs/schematic/text-handling-research.md is guarded by the 44 cases of
  tests/text-metrics/document-pastes.test.ts, restored in Task 9's fix round,
  which compare its pasted blocks byte for byte against the four logs beside
  it. Its two command lines at :106-107 are stale - the probe is deleted, and
  verify-pastes.ts MOVED to tools/text-metrics/. Any edit to that file must be
  made with the guard re-run, and an edit that lands inside a guarded paste
  block is a defect, not a conflict to resolve by changing the log. Cost if
  wrong: the guard restored one commit earlier is broken by the next one.
Task 10: Ruling H - schematic/README.md is written in the future tense about a
  Task 9 that has run, and its registry now has no loader at all. Past tense,
  and say that plainly; it is the readability-baselines owner question's home
  and must not lose the question. Cost if wrong: the one surviving open
  question on this plan reads as pending work on a deleted file.
Task 10: dispatch held until Task 9's scoped re-review returns - a fix round
  and an implementer must never run concurrently.
Task 10: dispatched.
Task 10: implementer DONE_WITH_CONCERNS. Seven commits, 22e184e..5f1e906,
  14 files, +807/-529. typecheck clean after every commit; the paste guard's
  44 cases run five times, green, before and after every edit to the guarded
  document; the Step 4 record-set grep empty on all four prose commits and
  over the whole range the only record-set path is A on the new findings
  document.
Task 10: MY BRIEF CARRIED A FALSE FACT AND THE IMPLEMENTER CAUGHT IT. I wrote
  "five Pultec boards have approved pages". VERIFIED MYSELF against the five
  RECORD.md files: FOUR SAY AWAITING RE-APPROVAL. hi-boost, low-boost and
  low-cut were re-papered A4 to US Letter and then centred; mid was re-drawn
  from A3. A verdict is bound to a sha256 and does not transfer when the bytes
  change, which is this project's own rule, so only pultec-hi-cut carries a
  verdict bound to the bytes that are there - and its own RECORD.md says so in
  as many words: "THIS IS THE ONE PULTEC PAGE WHOSE VERDICT IS BOUND TO THE
  BYTES THAT ARE... The other four pages in drafted/pultec/ are awaiting
  re-approval".
  This is the "stale cause" failure in its purest form and I committed it: I
  relayed a count that was true on 2026-10-30 before the re-paper, carried it
  into a dispatch as a premise, and the only reason it did not propagate is
  that the implementer read the records instead of the brief. The phrase
  survives in test-file comments and will keep propagating.
  Ruling: no prose anywhere asserts an approval status; verdicts.md is the
  authority and the records point at it. OWNER ITEM, not a plan item: four
  re-papered pages need showing to him for re-approval. It does not block this
  plan - nothing in it changes a page - and it must not be buried in it.
  Cost if wrong: four pages read as approved that he has not seen in their
  current form, which is the one thing EVALUATING-DRAWINGS exists to prevent.
Task 10: UNRULED EDIT TO JUDGE AT REVIEW - docs/schematic/false-greens.md.
  No ruling named it. The implementer found eight "what guards against it
  here" clauses naming guards inside the deleted tree - a catalogue of checks
  that lie, claiming protection it had lost - and restructured it into a head
  table: three LIVE and moved with paths repaired, five GONE, one SPLIT.
  Carried to the reviewer as the largest unruled edit in the diff, with the
  note that a false-greens catalogue wrongly claiming a guard is live is
  itself a false green.
Task 10: review dispatched.
Task 10: review returns spec MEETS brief and Rulings A-H, quality STRONG, no
  Critical, five Important, seven Minor. Ruling D re-derived clean over the
  whole range; the census governance in CLAUDE.md confirmed BYTE-IDENTICAL by
  segment comparison rather than clause grep; zero control characters in all
  twelve files on two scans; the paste guard re-run green AND GIVEN A TEETH
  TEST - one guarded run line tampered in memory produced one named failure,
  which is the first time on this plan a guard has been proven to have teeth
  rather than merely reported passing; diff-to-fence intersection zero of 61
  added and zero of 14 removed lines inside any guarded block.
Task 10: the reviewer's one-line diagnosis, and it is the right one - THE
  ACCOUNTING OF THE WORK OVERSTATES THE WORK, by one table row, one record
  location and one count. All five Importants are that shape, and I-1 and I-2
  are the task committing its own defect class:
  I-1 TOOLING.md:78 adds a NEW dangling path, scripts/intent_vs_model.py,
    with no scripts/ at the repo root and the real path in step 1 of the same
    file.
  I-2 CLAUDE.md:173-176 names a STRONGER check than exists - "names each
    measure and the script that takes it" over a table where 4 of 11 rows name
    no script, 2 name one, and "margins" is not a row at all. Ruling A's cost
    inverted: the ruling forbade inventing a tool, the sentence invented a
    property of a real one.
  I-3 CLAUDE.md:268 cites section-board.ts:162, deleted by this plan in
    6085dc5, inside the paragraph whose purpose is to stop an agent re-raising
    an answered owner question - so the pointer failing defeats the paragraph.
  I-4 false-greens.md's head table enumerates nine of ten repaired clauses,
    omitting mechanism 16, in a table that invites the reader to check it.
  I-5 the last present-tense live-generator claim is recorded in one place,
    not the two both the report and the findings document assert.
Task 10: accepted without revisiting, each with the reviewer's reason -
  elkjs (the README sentence IS the record; removing a declaration is not a
  prose pass), the two deleted miscounts (right call, right reason, named as
  the fourth instance rather than quietly fixed), and the fourth TOOLING.md
  falsehood (same statement class, written as a widened gap, nothing
  structural moved).
Task 10: THE SURVIVING PROPAGATOR OF MY FALSE PREMISE is
  tests/circuits/drafted-kicad-round-trip.test.ts:37, which still says five
  approved pages. Out of this task's scope and deliberately not edited;
  carried to the final whole-branch review instead, because a comment in a
  live test is exactly where a stale cause gets read next.
Task 10: fix round 1 dispatched to the same implementer.
Task 10: fix round 1 landed, 2642afb and 5149f56, eight files, +103/-33. All
  five Importants and all seven Minors taken, nothing disputed. typecheck
  clean; the paste guard's 44 cases driven separately after each of the four
  edits to the guarded document; control-character scan zero in all twelve
  files; Ruling D intersection re-derived over the whole range including both
  fix commits and still one line, A on the findings document.
Task 10: TWO DECLARED DEPARTURES, BOTH TOWARD LESS, AND I AM ACCEPTING BOTH
  ON THE GOVERNANCE RATHER THAN ON COMPLIANCE. The review asked for corrected
  counts in two places; the implementer published neither and said why.
  I-2: a tally of another file's row types is one more figure in prose, and it
    would sit six lines above CLAUDE.md's own "a figure in prose is a
    transcription with a date on it". Its own draft of the tally got one of
    the counts wrong, which is the argument rather than an excuse for it. The
    bullet now says what the table IS - a list of measures, not a toolkit -
    names the two rows that carry a script, and tells the reader not to read a
    measure's presence there as a measure something runs.
  I-4: rather than publish a corrected count it wrote the RE-DERIVATION RECIPE
    into the table's intro, and drove it: it returns 4 8 10 12 14 16 19 23 28
    29, which is exactly the table's ten rows in that order.
  Ruling: ACCEPT. Both are the rule this repository actually holds - a
  measurement goes in a tool or a test that re-runs it, never in prose - and a
  recipe a reader can run is strictly stronger than a number a reader must
  trust. The re-review is told to RUN the recipe rather than read it, because
  a recipe that does not reproduce its claim is the same defect wearing the
  fix's clothes. Cost if wrong: two descriptions where the review wanted two
  numbers, and the numbers are one command away.
Task 10: the review also corrected MY diagnosis, not just the implementer's.
  The CLAUDE.md phrase I called a self-reference to an edited-away sentence is
  the owner's own wording at docs/known-gaps.md:24. Recorded in the report
  over the original misreading rather than edited away, which is the right
  disposal.
Task 10: CARRIED FORWARD TO THE FINAL WHOLE-BRANCH REVIEW, both out of this
  task's scope and both named in the report:
  - tests/circuits/drafted-kicad-round-trip.test.ts:37 still says five boards
    have an approved page. My false premise, surviving in a live test comment.
  - circuits/pultec/physical/parts.ts:247 says "which is why
    ../physical/parts.ts keeps eleven throws" while living IN physical/parts.ts
    - an artefact of Task 2's verbatim move, one word to fix. This is the
    fourth instance on this plan of a verbatim move carrying a self-reference
    that stopped being true when the file changed address, and it is worth
    naming as a class in the final review rather than as a typo.
Task 10: scoped re-review of the fix round dispatched.
Task 10: complete (commits 22e184e..5149f56, re-review ALL FIVE ADDRESSED,
  no new breakage). Both declined counts verified rather than accepted: the
  reviewer read the eleven-row table and confirmed the qualitative wording
  matches it exactly (two rows name a script, three name kicad-cli or a
  counter, six name none, and margins is genuinely not a row), and it RAN the
  false-greens recipe from 6085dc5^ itself and got 4 8 10 12 14 16 19 23 28 29
  - the table rows exactly, in order. It also noted why the recipe correctly
  EXCLUDES mechanisms 1 and 5, which mention a schgen path in an Instances
  paragraph rather than in a What-guards-against-it-here paragraph; that is a
  distinction a count could not have carried, which is the case for the recipe.
Task 10: paste guard re-run by the reviewer, 44 pass / 0 fail / 179 expect
  calls, and the three insertion points mapped against the fence inventory -
  none inside any run, elk-run, label-run or field-order-run block. Record-set
  intersection, control-character scan on all eight files, typecheck and the
  attribution check all re-driven.
ALL TEN TASKS COMPLETE. Plan range fdbc51a..5149f56: 35 commits, 446 files,
  +6,546 / -69,375. 368 D, 22 A, 49 M, 7 R.
Final whole-branch review dispatched over the whole plan range.
FINAL WHOLE-BRANCH REVIEW: FINISHABLE WITH NAMED FIXES. No Critical, four
  Important, seven Minor, all text or test-only, none behavioural. Twenty-eight
  checks RAN, three labelled REASONED, and the three are named in the review
  rather than left to be discovered.
FINAL: THE NET-CAPABILITY TEST CAME OUT IN THE PLAN'S FAVOUR. The reviewer
  went looking for a deleted check with a surviving unprotected subject and
  could not find one. That is the question the whole plan turned on and it is
  the first time it has been asked against the deletions rather than against
  the plan's description of them.
FINAL: gates all driven solo. typecheck exit 0. bun test 2714 pass / 0 fail,
  258 files, 38,526 expect calls, 122.31 s, no segfault - matching the reported
  figures exactly. make check 4 FAIL / 7 ok on pt2399-core,
  transistor-preamp-lab, -loop and -staged; causes HC5/HC8/HC10 buildability
  only, NOT ONE FAILURE NAMES A SCHEMATIC, and zero schgen mentions in the log.
  drafted/ and verdicts.md diffs empty. Five RECORD.md digests 5/5 MATCH with a
  one-byte perturbation control proving the comparison could fail.
FINAL: AND THE REVIEWER VERIFIED THE PREMISE I GAVE IT RATHER THAN TAKING IT.
  Of the eight sha256 digests in verdicts.md, exactly one - e9843e6d,
  pultec-hi-cut - equals a sheet's present bytes. One approved as-is, four
  awaiting re-approval. Independent confirmation of the correction I made after
  my own brief got it wrong.
FINAL: THE CONTROL-BYTE SCAN FAILED FIRST AND WAS CAUGHT BY ITS OWN CANARY.
  macOS grep has no -P, so the first attempt reported "0 hits over 0 files" - a
  check that could not have failed, in the one scan this repository has been
  broken by four times. It fired only because the reviewer had put a canary in
  it. Second attempt over all 78 added, modified and renamed files: 0 hits,
  canary fires. THIS IS THE RULE EARNING ITSELF AGAIN and it goes in the fix
  dispatch so the next scan carries a canary too.
FINAL: the four Importants and what makes each one more than a typo -
  I1 designators.ts:28 and :52 - the latter INSIDE THE THROW - cite "the IR's
    partShapes rule" where the IR is deleted and grep finds only those three
    sites. A stale CAUSE in a live refusal, which CLAUDE.md ranks worse than a
    stale count. The same message's PATH was updated, so the clause was seen
    and left.
  I2 drafted-sheet.ts:262 - expect(sha256(bytes+"x")).not.toBe(sha256(bytes))
    is a property of SHA-256. Its comment claims it catches a
    recordedSheetDigest returning the computed value, WHICH WOULD PASS BOTH
    LINES. The third instance of this exact shape on this plan.
  I3 eighteen approval claims in live code, fifteen false, four inside refusal
    messages, twelve in files THIS PLAN ADDED - against a findings document of
    its own that says "do not quote five approved pages". Ruled: not a five-to-
    one edit. Not one of the eighteen behaves differently because a page is
    approved, so the fix is to say what the code depends on - the sheets
    committed under drafted/ - which cannot rot when he re-approves one.
  I4 the FIFTH verbatim-move self-reference, predicted in the dispatch and
    found: ten present-tense citations of the deleted
    tests/circuits/kicad-round-trip.ts across nine files, one of them in a file
    this plan ADDED. Ruled: repair all ten, including the five judged inert,
    because a pointer resolving to nothing is what a later reader trusts.
FINAL: M1 is the only real COMPOSITION of the ~25 deferred minors, and reading
  them as a set is what found it. Three minors in sheet-model.ts together mean
  the rebuilt guard's single hand-declared exception hangs off a board key read
  by bare bracket index with no validation - so a renamed board yields
  undefined and the exception silently stops applying. The reviewer's one
  pre-finish fix, and it is in.
FINAL: deferred, with reasons - M7 (SheetAgreement's six fields are mutable
  string[]; the consumer that made that harmless is deleted - a hardening, not
  a defect) and the review's own reasoned item (iii), that make check's four
  CAUSES are identical to the pre-plan baseline rather than merely the same
  four boards. The second needs a checkout of fdbc51a and a re-run, which is a
  measurement and not a fix; recorded so the claim is not quoted as measured.
FINAL: G303's unratified-drawing watermark directive NOW HAS NO IMPLEMENTATION
  ANYWHERE - its producer was the generator. Not a net loss of this plan, but a
  live directive about marking unratified drawings with nothing honouring it,
  while four of five printed pages await re-approval. Owner-facing, not the
  fixer's to design; recorded in the findings document.
FINAL: ONE OBSERVATION ABOUT THE SESSION ITSELF, worth more than any finding
  in it. The harness injected the PRE-PLAN CLAUDE.md into the reviewer's
  context - the honey pot itself, naming lib/schgen as the generator and
  printing the two deleted tools/schgen commands. It read HEAD instead and
  said so. The same stale text is in this controller's context. An agent that
  trusts its injected instructions over the file on disk will read the deleted
  generator as current, which is the exact failure the plan was for, arriving
  by a route the plan could not close.
FINAL: one fix dispatch sent - I1 to I4 and M1 to M6, with M3 folded in beside
  I2 as the same defect. I2 and M3 must be PROVEN BY DRIVING THE SABOTAGE, not
  reported.
INJECTED INSTRUCTIONS: MEASURED, NOT SUSPECTED. The final reviewer reported
  that its context carried the PRE-PLAN CLAUDE.md - the honey pot itself. I
  probed it rather than relaying it: a freshly dispatched agent, told to use no
  tool and to quote only what was in front of it, returned the old sentence
  word for word ("The schematic generator is `lib/schgen/`, and
  `lib/kicad/schematic.ts` is the superseded stub it replaced"), the fenced
  block with both deleted commands intact, and NO occurrence of the word
  copperhead anywhere in its instructions.
  So the injection is a SESSION-START SNAPSHOT, inherited by every dispatch,
  not re-read per agent. Every agent spawned from this session is told the
  deleted generator is how this project draws a schematic and handed two
  commands that do not exist.
WHAT WAS CHECKED ON DISK, so this is not confused with a repo defect:
  - CLAUDE.md at HEAD is correct - the old sentence shown struck, both halves
    named false, the two commands marked deleted with "nothing replaced either
    of them", and the copperhead loop named in their place.
  - AGENTS.md and .claude/agents/part-researcher.md contain no schgen
    reference at all. CONSTITUTION.md's only hits are the rule against
    inventing a readability score, which is live and correct.
  - ALL SIX WORKTREES on this machine were checked for the live honey-pot
    sentence and the runnable command block: zero and zero in every one,
    including main, which predates the generator work entirely.
  - The 28 non-markdown files still naming lib/schgen, tools/schgen or
    tests/schgen are ALL past-tense provenance - "used to sit at", "lived in",
    "is now gone", "the deleted", "carried over from". That is the
    transcription record CLAUDE.md requires a ported file to keep. Deleting
    them would destroy evidence, not stale instruction. NOT A FINDING.
THE ONLY STALE COPY IS IN CONTEXT, AND IT IS NOT REMOVABLE FROM INSIDE THE
  SESSION THAT HOLDS IT. A restart reads the amended file; that is the complete
  fix and it is the owner's to perform.
MY OWN FAILURE IN THIS, which is the part worth keeping. I had been supplying
  dispatches with correct facts ALONGSIDE the injected false ones, never
  contradicting them. That left every agent to notice the conflict and pick.
  The final reviewer did pick correctly and said so; a weaker one would have
  followed its instructions, which is what instructions are for. From here a
  dispatch CONTRADICTS the injected claim explicitly rather than out-arguing it
  by context.
RECORDED IN THE REPO once the fix round lands and the findings document is
  free: a context snapshot can outlive the file it came from, and the symptom -
  an agent confidently citing a deleted tool - looks like hallucination rather
  than a stale injection, which is why it needs writing down rather than
  remembering.
OWNER DECISION OUTSTANDING, not taken unilaterally: whether a refusing
  signpost at each deleted command's old path is wanted. It would turn a
  module-not-found into a refusal that teaches, which is this repository's
  preferred shape - but it resurrects tools/schgen/, and the owner's words were
  that he did not want it "acting as a honey pot for agents to start thinking
  it's how this project generates schematics". He drew that line; reinterpreting
  it is not the agent's call.
