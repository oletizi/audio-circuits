/**
 * The ten hard constraints of CRITERIA's `A1`, one exported function each.
 *
 * THE AUTHORITY for every clause quoted below is
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`'s
 * `HC1`-`HC10` table. Where this file and that document differ, the document
 * wins and this comment is the defect. Nothing here is a constraint this file
 * invented: each check carries the clause that decides it and the name of the
 * negative fixture that proves it can fail.
 *
 * THE VERDICT IS THE PRODUCT, AND A CHECK THAT CANNOT FAIL IS WORSE THAN NO
 * CHECK. Every one of the ten has a fixture under
 * `tests/fixtures/stripboard/negative/` that it rejects by name, and
 * `tests/stripboard/grade.test.ts` asserts that THAT constraint failed and that
 * its detail names the offending thing - not merely that something failed.
 *
 * `HC10` IS ONE ENTRY CONJOINING TWO HALVES, and `ConstraintId` is unchanged at
 * ten. Task 2 proved a footprint COULD be placed compatibly; nothing proved the
 * produced layout DID, and a verdict asserting `HC10` on the footprint half
 * alone is this plan's own crux turned on itself. Both halves have their own
 * negative fixture, because a single fixture would let one half be vacuous
 * while the other carried the test.
 *
 * THE FILE SPLIT, AND WHICH GROUPS, because the brief asks for the groups to be
 * named if this file passed 500 lines - it reached 556, so it did. The ten
 * checks are split along CRITERIA's OWN line rather than one drawn for size:
 *
 *   - `./constraints-electrical.ts` - `HC1`, `HC2`, `HC3`, `HC7`, `HC8`: does
 *     the board CONDUCT what the circuit says? Four of them read VeroRoute's own
 *     conclusion, from the subsystem the optimiser perturbs, and `HC8` is the
 *     same question asked of the copper instead.
 *   - `./constraints-physical.ts` - `HC4`, `HC5`, `HC6`, `HC9`: can the thing be
 *     BUILT? The span bounds at both ends and the stock. Every one refuses
 *     rather than guessing when its data is unrecorded.
 *   - `./constraints-pattern.ts` - `HC10`: will the owner mount this part's pin
 *     pattern at all? It belongs with the physical four by subject and left them
 *     by line count, taking the only two `pin-pattern*` imports with it.
 *
 * And the rest of the surface: the VOCABULARY and the three shared readings of a
 * dump are in `./constraints-model.ts`; `--check`'s report parse is in
 * `./check-report.ts`; the extent arithmetic `HC6` consumes is in
 * `./extent.ts`; the table, the verdict and `stockFor` are in `./grade.ts`.
 * **This file is the surface all ten are reached through**, so a consumer
 * imports one module and the split stays an implementation detail.
 */
export { hc1, hc2, hc3, hc7, hc8 } from "./constraints-electrical.ts"
export { hc4, hc5, hc6, hc9 } from "./constraints-physical.ts"
export { hc10 } from "./constraints-pattern.ts"
export {
  CONSTRAINT_IDS,
  type CheckInput,
  type ConstraintId,
  type ConstraintResult,
  type Stock,
} from "./constraints-model.ts"
export { parseCheckReport, type CheckReport } from "./check-report.ts"
