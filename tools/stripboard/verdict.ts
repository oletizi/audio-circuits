/**
 * `A1`-`A4`: whether a layout is ADMISSIBLE - which is a different question
 * from whether the run stopped.
 *
 * THE AUTHORITY is
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`
 * (CRITERIA) section 6, with `K2` for `A2`, `K4` for `A3` and section 3's
 * `B1-frozen`/`B1-current` for `A4`. *"A layout is admissible only when all
 * four hold, and `A2` and `A3` are independent bounds on purpose - one on the
 * dominant lever, one on the total. Neither implies the other."* Where this
 * module and CRITERIA differ, CRITERIA wins and this comment is the defect.
 *
 * **THIS IS TASK 20'S FILE, WRITTEN IN TASK 19, AND THAT IS THE PLAN'S OWN
 * INSTRUCTION** rather than a misplaced file: *"Tasks 19 and 20 are mutually
 * referential - `Q1`/`Q2` need `admissible`, and `bound` needs the fired rule.
 * Write `verdict.ts`'s `admissible` first, inside Task 20's file but committed
 * in Task 19 ... The alternative - a local admissibility predicate here - is a
 * second copy of `A1`-`A4`, which is the thing the crux forbids."* So `A1`-`A4`
 * live here and `./stop.ts` consults them. **The rest of Task 20 is NOT here**:
 * no `Outcome`, no `outcomeOf`, no `BoundStatus`, no `boundFor`, no
 * `exitCodeFor`, no `renderReport`. Those decide what a run REPORTS, which
 * needs the fired rule, and they live in `./report.ts` with `./report-model.ts`
 * under it - one import path for the taxonomy, not two. `outcomeOf` reads an
 * `AdmissibilityResult` and `fullyAdmissible` below, so the stop's gate and the
 * reported outcome cannot disagree about one candidate.
 *
 * WHY `Q2` COULD NOT BE FINISHED WITHOUT THIS FILE, measured rather than
 * argued, because it is the case that produced it: `kappa = J/(P - N)` divides
 * by the splitting available and `A3`'s tolerance divides by `F_0 - F_floor`,
 * so the two scale independently. With `P - N = 10` a single unit of `J` is a
 * clustering of one tenth - TWICE a bound of one twentieth, so `A2` FAILS
 * against one - while with `F_0 - F_floor = 40` that same unit of `J` is a gap
 * of one fortieth, INSIDE a tolerance of one twentieth, so `A3` HOLDS. `A1`
 * holds on it too. A `Q2` guarded by `A1` alone stops the run there, which is
 * exactly what CRITERIA forbids.
 *
 * NOTHING HERE RE-DERIVES A CONSTRAINT OR A THRESHOLD:
 *
 * - `A1` is `a1` from `./grade.ts`, the one implementation of the ten hard
 *   constraints, and it refuses a result set that is not exactly the ten ids.
 * - `A2`'s bound is `rules.kappaBench`, **which is `null` by the owner's ruling
 *   (`K2`) and has no default**, and the measured `kappa` is `score.clustering`,
 *   through `./targets.ts`'s one implementation of it. While the bound is
 *   `null`, `A2` does not fire, exactly as `A3` does not while `tau` is: it
 *   reports the measured `kappa` rather than grading it, no number is
 *   substituted, and **the GRADING went, not the MEASUREMENT** (`conditionTwo`).
 * - `A3`'s tolerance is `rules.tau`, **which is `null` by the owner's decision
 *   (`K4`) and has no default.** While it is `null`, *"`Q2` and `A3` do not
 *   fire"*: `A3` reports the gap rather than grading it, and the verdict rests
 *   on `A1`, `A2` and `A4`. No number is substituted.
 * - `A4`'s frozen clause is `FROZEN_MARK` from `./seed-compare.ts` - `C <= 5`,
 *   `W = 0`, every net complete, the owner's achieved result - read through
 *   that module's own `meetsMark`, so `B1-frozen` has one implementation.
 *
 * `A4` IS NOT MERELY A FOURTH CONJUNCT. *"On low-boost, whichever board is
 * being run: the frozen fixture meets `B1-frozen`, the scaffolded board meets
 * `B1-current`. **A run states which board it ran and therefore which clause it
 * met.**"* So `admissible` must be TOLD which of the two it is grading, and a
 * run that does not say cannot satisfy `A4` at all: `frozen` is `boolean |
 * undefined` and `undefined` REFUSES rather than picking a clause. Picking one
 * is the specific error `A4` exists to prevent - reporting `B1-frozen`
 * satisfied on a run against the scaffolded board (`V3`).
 */
import fs from "node:fs"
import path from "node:path"
import { moduleRepoRoot } from "../perfboard/repo-root.ts"
import { a1, type ConstraintResult } from "./grade.ts"
import type { StripboardRules } from "./rules.ts"
import type { Score } from "./score.ts"
import { FROZEN_MARK, meetsMark } from "./seed-compare.ts"
import type { StoppingRule } from "./stop-model.ts"
import type { BoardTargets } from "./targets.ts"

/**
 * What bounded the clustering on an `A2` failure, *"named FROM THE CONSTRAINT
 * SIDE"* (`K2`).
 *
 * `search-stopped` IS IN THE UNION AND IS NOT A CONSTRAINT, deliberately: `K3`
 * says *"the search did not get there"* is **not** an admissible cause for
 * moving `kappa_bench`, and the way to keep it inadmissible is to have a
 * spelling for it that reads as what it is. A failure carrying it says the
 * search stopped and names no constraint.
 */
export type BindingConstraint =
  | {
      readonly kind: "span"
      readonly board: string
      readonly nets: readonly [string, string]
      readonly bound: "maxSpanHoles" | "minSpanHoles"
    }
  | { readonly kind: "packing"; readonly board: string; readonly detail: string }
  | { readonly kind: "search-stopped"; readonly rule: StoppingRule }

/** What `A1`-`A4` are read from. */
export interface AdmissibilityInput {
  /** The candidate's ten constraint results. `A1` refuses anything else. */
  readonly results: readonly ConstraintResult[]
  readonly score: Score
  readonly targets: BoardTargets
  readonly rules: StripboardRules
  /**
   * `F_0`: the objective the run started from, `A3`'s denominator.
   *
   * `undefined` means the run has recorded no climb yet. `A3` refuses it only
   * when `tau` is set and the tolerance therefore has to be computed - while
   * `tau` is `null` there is nothing to divide.
   */
  readonly initialObjective: number | undefined
  /**
   * Whether this run graded the FROZEN fixture (`true`) or the scaffolded board
   * (`false`). **`undefined` means the run did not say**, which on low-boost is
   * a refusal rather than a default - see this module's comment.
   */
  readonly frozen: boolean | undefined
  /**
   * What bounded the clustering, when the caller has it. `undefined` is
   * reported as *no binding constraint was stated* rather than refused: a
   * verdict that threw on an `A2` failure could not report the failure, and
   * reporting it individually is what `REP2` requires.
   */
  readonly binding: BindingConstraint | undefined
}

/**
 * The verdict of a condition whose THRESHOLD MAY BE UNSET, which makes it
 * three-valued. `A2` and `A3` are both such conditions.
 *
 * **A BOOLEAN ERASED THE DISTINCTION THAT MATTERS.** While `tau` is `null`,
 * `A3` *"does not fire"* (`K4`) - it neither holds nor fails, and it does not
 * block admissibility. Reported as `true` beside a genuinely held `A3`, the two
 * were separable only by reading a string, and `REP5`'s *"valid, below target"*
 * taxonomy is exactly the place that distinction has to survive: a run must not
 * report a target met that it never graded. So the fact is carried in the type.
 *
 * **`A2` BECAME THREE-VALUED FOR THE SAME REASON** when the owner's ruling
 * unset `kappa_bench`: left a `boolean`, it would have printed `A2 held` on
 * every run under an unset bound - a target reported as met that nothing graded.
 */
export type ConditionThree = "held" | "failed" | "not-evaluated"

/** Each condition's verdict, and what it was read from. */
export interface AdmissibilityResult {
  readonly a1: boolean
  readonly a2: ConditionThree
  readonly a3: ConditionThree
  readonly a4: boolean
  readonly detail: Readonly<Record<"a1" | "a2" | "a3" | "a4", string>>
}

/** The refusals this module raises. One arm each in `notDefaultedBecause`. */
export type VerdictRefusal =
  | "verdict-board-unstated"
  | "verdict-no-initial-objective"
  | "verdict-negative-gap"
  | "verdict-low-boost-board-missing"

function notDefaultedBecause(refusal: VerdictRefusal): string {
  switch (refusal) {
    case "verdict-low-boost-board-missing":
      return (
        "A4's clause is about ONE board, and its name is checked against boards/ rather than " +
        "trusted, because the way a name-only whitelist fails is silent and in the worst " +
        "direction: a renamed board stops matching, A4 becomes vacuously true everywhere, and " +
        "the owner's externally authored benchmark quietly stops applying - a gate that " +
        "disappears instead of firing. It is NOT defaulted to treating A4 as vacuous. If the " +
        "board was renamed, rename LOW_BOOST_BOARD in tools/stripboard/verdict.ts with it and " +
        "check CRITERIA section 3, which names the board in its B1-frozen and B1-current " +
        "clauses; if the board was removed, A4 and V3 need a decision rather than an edit."
      )
    case "verdict-board-unstated":
      return (
        "A4 reads differently on the two low-boost boards - the frozen fixture meets B1-frozen " +
        "(at most five cuts, no wires, every net complete: the owner's ACHIEVED result) and the " +
        "scaffolded board meets B1-current (A3's arithmetic against its own derived floor, " +
        "which carries NO absolute cut count because five here is a figure nobody derived and " +
        "nobody achieved). CRITERIA requires that a run STATE which board it ran and therefore " +
        "which clause it met, so neither clause is picked here: reporting B1-frozen satisfied " +
        "on a run against the scaffolded board is the specific error A4 and V3 exist to " +
        "prevent, and it would read as an externally authored benchmark having been met. Set " +
        "AdmissibilityInput.frozen - true for tests/fixtures/stripboard/" +
        "pultec-low-boost-frozen.vrt, false for boards/pultec-low-boost."
      )
    case "verdict-no-initial-objective":
      return (
        "A3 is (F - F_floor)/max(1, F_0 - F_floor) < tau (CRITERIA K4), so with a tau set it " +
        "needs F_0 - the objective the run started from. It is NOT defaulted to the candidate's " +
        "own F, which would make every gap zero and A3 pass on every board, and not to the " +
        "floor, which would make it pass whenever the candidate did. Pass the first entry of " +
        "the run's per-climb objective history. While tau is null this is never asked for."
      )
    case "verdict-negative-gap":
      return (
        "F_floor is a LOWER bound (CRITERIA K5), so a candidate beneath it is proof that the " +
        "floor derivation, the scorer or the dump is not the quantity it claims to be - and " +
        "K5 names THIS computation as the place it would do the most damage: the tolerance " +
        "goes negative and A3 passes with room to spare, so an impossible score reads as the " +
        "best result in the run. tools/stripboard/score.ts refuses it first and is the primary " +
        "reading; this is the same condition arriving on the verdict path, which R2 keeps " +
        "separate from the scorer's. It is not clamped to zero, which would turn the evidence " +
        "into a pass."
      )
  }
}

function refuse(refusal: VerdictRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(CRITERIA section 6, K2, K4 and section 3 are the authority, and " +
      "tools/stripboard/verdict.ts is the only implementation of A1-A4.)",
  )
}

/**
 * The board `A4`'s clause is about, BY NAME - one name, not a pattern, because
 * a rule matching *any* board whose name contains the words would quietly apply
 * the owner's hand-layout benchmark to a board he never laid out. `frozen` -
 * not the name - says which of low-boost's two boards was graded, because the
 * scaffolded board and the frozen fixture are the same circuit under the same
 * name.
 */
const LOW_BOOST_BOARD = "pultec-low-boost"

/**
 * That name, CHECKED AGAINST `boards/` ON EVERY VERDICT (memoised per root).
 *
 * **A BARE WHITELIST FAILS SILENTLY IN THE ONE DIRECTION THAT MATTERS.** If
 * `boards/pultec-low-boost` is renamed, a name-only test stops matching, `A4`
 * becomes vacuously `true` on every board, and the externally authored
 * benchmark quietly stops applying - a gate that disappears rather than fires.
 * So the name is tied to a directory that has to exist, and a rename makes
 * `A4` REFUSE instead. The check runs whenever `A4` is evaluated and not only
 * when the candidate's name matches, because a check that runs only on a match
 * is exactly the one a rename switches off.
 *
 * IT TAKES THE ROOT AS AN ARGUMENT so it can be shown to fail:
 * `tests/stripboard/verdict.test.ts` drives it at a root with no such board and
 * asserts the refusal, which a function reading its own repository root could
 * not be made to do.
 */
export function lowBoostBoardIn(root: string): string {
  const cached = LOW_BOOST_CHECKED.get(root)
  if (cached !== undefined) return cached
  const directory = path.join(root, "boards", LOW_BOOST_BOARD)
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    refuse("verdict-low-boost-board-missing", `${directory} is not a directory`)
  }
  LOW_BOOST_CHECKED.set(root, LOW_BOOST_BOARD)
  return LOW_BOOST_BOARD
}

/**
 * Roots already checked. **A SUCCESSFUL CHECK IS CACHED AND A FAILING ONE IS
 * NOT**, so a run that refuses refuses every time rather than once.
 */
const LOW_BOOST_CHECKED = new Map<string, string>()

/** `A1`: all ten hard constraints hold. `./grade.ts` is the implementation. */
function conditionOne(input: AdmissibilityInput): readonly [boolean, string] {
  const held = a1(input.results)
  if (held) {
    return [true, `all ten hard constraints hold on ${input.targets.board}`]
  }
  const failed = input.results.filter((result) => !result.held)
  return [
    false,
    `${failed.length} hard constraint(s) do not hold on ${input.targets.board}: ` +
      failed.map((result) => `${result.id} (${result.detail})`).join("; ") +
      ". Nothing in A1 is tradeable.",
  ]
}

/** How an `A2` failure names what bounded the clustering (`K2`, `REP2`). */
function bindingWording(binding: BindingConstraint | undefined): string {
  if (binding === undefined) {
    return (
      "No binding constraint was stated, so this failure names none, and K3's ratchet may not " +
      "move kappa_bench on it"
    )
  }
  switch (binding.kind) {
    case "span":
      return (
        `The binding constraint is ${binding.bound} on ${binding.board}, between nets ` +
        `${binding.nets[0]} and ${binding.nets[1]}`
      )
    case "packing":
      return `The binding constraint is a packing infeasibility on ${binding.board}: ${binding.detail}`
    case "search-stopped":
      // DELIBERATELY NOT the words "binding constraint": K3 refuses to move the
      // bound on a search that stopped, and a failure worded as though a
      // constraint had bound it is the evidence K3 would then be moved on.
      return (
        `The search stopped under ${binding.rule} and no constraint was found to have bounded ` +
        "the clustering, so K3's ratchet may not move kappa_bench on this run"
      )
  }
}

/**
 * `A2`: `kappa <= kappa_bench` (`K2`).
 *
 * **WHILE `kappa_bench` IS `null` THIS REPORTS AND DOES NOT GRADE**, which is
 * the owner's ruling and the same shape `A3` has had under an unset `tau`. He
 * was shown the materialised low-boost board, refused at `kappa = 0.25` against
 * a bound of `0.05`, and ruled: *"i prefer the loose layout. It's much easier
 * to build. I don't see the problem"* and *"if the layout is electrically
 * correct, let's keep it. It looks fine to me"*. The withdrawn bound was an
 * agent's number and sat below all four boards he has actually built. The whole
 * record is `kappaBench`'s note in `stripboard/rules.json`; no figure is
 * substituted here, and the verdict rests on `A1`, `A3` and `A4`.
 *
 * **`kappa` IS STILL MEASURED AND STILL IN THE DETAIL** on the unset path: the
 * bound was the grading, `kappa` is the measurement.
 *
 * With a bound set, IT CANNOT REFUSE A LAYOUT AT THE FLOOR, whatever
 * `kappa_bench` is, because `C = C_floor` requires `J = 0` and so `kappa = 0` -
 * and `./rules.ts` refuses a `kappaBench` of zero for that reason. A failure
 * must name the binding constraint rather than merely the gap (`REP2`).
 */
function conditionTwo(input: AdmissibilityInput): readonly [ConditionThree, string] {
  const kappa = input.score.clustering
  const bound = input.rules.kappaBench
  if (bound === null) {
    return [
      "not-evaluated",
      `kappa_bench is UNSET (the owner's ruling, K2 - his words and the date are in that ` +
        `parameter's note in stripboard/rules.json), so A2 DOES NOT FIRE and no clustering ` +
        `target was met or missed here: kappa = ${kappa}, measured and reported rather than ` +
        `graded. The verdict rests on A1, A3 and A4.`,
    ]
  }
  const measured = `kappa = ${kappa} against kappa_bench = ${bound} (the clustering bound, K2)`
  if (kappa <= bound) return ["held", `${measured}: inside the bound`]
  return ["failed", `${measured}: outside it. ${bindingWording(input.binding)}.`]
}

/** `(F - F_floor) / max(1, F_0 - F_floor)`: `K4`'s tolerance, and the one place it is computed. */
function floorGap(input: AdmissibilityInput): number {
  const achieved = input.score.objective - input.targets.cutFloor
  if (achieved < 0) {
    refuse(
      "verdict-negative-gap",
      `${input.targets.board} scores F = ${input.score.objective} against a declared floor of ` +
        `${input.targets.cutFloor}`,
    )
  }
  // AT THE FLOOR THE TOLERANCE IS ZERO WITHOUT NEEDING `F_0`, and this is exact
  // rather than lenient: the numerator is zero and `max(1, ...)` makes every
  // denominator at least one, so the quotient is zero for any `F_0` at all.
  // **IT IS ON THE HAPPY PATH AND IT USED TO THROW.** A candidate that reaches
  // the floor during the FIRST climb has no earlier climb to take `F_0` from,
  // so with a `tau` set the best outcome this pipeline has - `Q1`, the only
  // optimality claim it may make - raised `verdict-no-initial-objective`
  // instead of firing.
  if (achieved === 0) return 0
  if (input.initialObjective === undefined) {
    refuse(
      "verdict-no-initial-objective",
      `${input.targets.board} has a tau of ${String(input.rules.tau)} set and no F_0 recorded`,
    )
  }
  return achieved / Math.max(1, input.initialObjective - input.targets.cutFloor)
}

/**
 * `A3`: the whole objective against the derived floor (`K4`).
 *
 * WHILE `tau` IS `null` THIS REPORTS AND DOES NOT GRADE, which is `K4`'s own
 * requirement and not a lenient reading: *"an outcome of 'valid, below target'
 * cannot be reported against an unset target, so a run that is valid reports
 * valid with its achieved `F`, its derived floor and the gap, and the
 * admissibility verdict rests on `A1`, `A2` and `A4`."* So it does not block
 * admissibility, and the detail says WHY rather than claiming a target was met.
 */
function conditionThree(input: AdmissibilityInput): readonly [ConditionThree, string] {
  const floor = `F = ${input.score.objective} against a derived floor of ${input.targets.cutFloor}`
  if (input.rules.tau === null) {
    return [
      "not-evaluated",
      `tau is UNSET (the owner's decision, K4), so A3 DOES NOT FIRE and no target was met or ` +
        `missed here: ${floor}, reported rather than graded. The verdict rests on A1, A2 and A4.`,
    ]
  }
  const gap = floorGap(input)
  const measured = `${floor}, a gap of ${gap} against tau = ${input.rules.tau}`
  return gap < input.rules.tau
    ? ["held", `${measured}: inside it`]
    : ["failed", `${measured}: outside it`]
}

/**
 * `A4`: low-boost's own clause, and which of the two boards it was read
 * against.
 *
 * It is *"deliberately redundant with `A3` on the scaffolded board, and kept
 * anyway so a reader looking up what low-boost has to do finds both boards
 * named in one place rather than finding `C <= 5` and applying it to the wrong
 * one. The redundancy is the cheaper error."*
 */
function conditionFour(
  input: AdmissibilityInput,
  a1Held: boolean,
  a3: ConditionThree,
  a3Detail: string,
): readonly [boolean, string] {
  const lowBoost = lowBoostBoardIn(moduleRepoRoot())
  if (input.targets.board !== lowBoost) {
    return [
      true,
      `this run graded ${input.targets.board}, which neither of low-boost's two clauses is ` +
        "about, so A4 is vacuous here and is NOT a benchmark this board met",
    ]
  }
  if (input.frozen === undefined) {
    refuse("verdict-board-unstated", `this run graded ${input.targets.board} without saying which`)
  }
  const netsComplete = input.results.some((result) => result.id === "HC1" && result.held)
  if (input.frozen) {
    const candidate = {
      cuts: input.score.cuts,
      wires: input.score.wires,
      netsComplete,
    }
    const met = meetsMark(candidate, FROZEN_MARK)
    const measured =
      `the frozen fixture against B1-frozen (at most ${FROZEN_MARK.cuts} cut(s), ` +
      `${FROZEN_MARK.wires} wire(s), every net complete): C = ${candidate.cuts}, ` +
      `W = ${candidate.wires}, every net complete = ${candidate.netsComplete}`
    return [met, met ? `${measured}: met. ${FROZEN_MARK.source}` : `${measured}: NOT met`]
  }
  // The scaffolded board: B1-current, which is A3's arithmetic against this
  // board's own floor plus every net complete and HC1-HC10 holding. Its clauses
  // are read off A1 and A3 rather than recomputed, which is what makes the
  // redundancy a second reading of one number instead of a second number.
  const clauses = `every net complete = ${netsComplete}, HC1-HC10 = ${a1Held}, and ${a3Detail}`
  if (input.rules.tau === null) {
    return [
      true,
      `the scaffolded board against B1-current, which carries no absolute cut count: ` +
        `${clauses}. B1-current's tolerance clause does not fire while tau is unset, so A4 ` +
        "grades nothing here either.",
    ]
  }
  const met = netsComplete && a1Held && a3 === "held"
  return [met, `the scaffolded board against B1-current: ${clauses}: ${met ? "met" : "NOT met"}`]
}

/**
 * `A1`-`A4` for one candidate, each reported INDIVIDUALLY.
 *
 * *"A layout that fails `A1` and a layout that merely misses an optimisation
 * target are not the same object and must not share a verdict"* - so this
 * returns each condition with its own detail, and the three-outcome taxonomy
 * that reads them (`REP5`) is Task 20's. `A3` is three-valued; see
 * `ConditionThree`.
 *
 * `A1` IS COMPUTED FIRST, and not only for the ordering: `a1` refuses a result
 * set that is not exactly the ten ids, so every later condition that reads a
 * result by id - `A4`'s net-completeness clause - is reading a set already
 * proven complete.
 */
export function admissible(input: AdmissibilityInput): AdmissibilityResult {
  const [a1Held, a1Detail] = conditionOne(input)
  const [a2, a2Detail] = conditionTwo(input)
  const [a3, a3Detail] = conditionThree(input)
  const [a4Held, a4Detail] = conditionFour(input, a1Held, a3, a3Detail)
  return {
    a1: a1Held,
    a2,
    a3,
    a4: a4Held,
    detail: { a1: a1Detail, a2: a2Detail, a3: a3Detail, a4: a4Detail },
  }
}

/**
 * Nothing refuses this layout: `A1` and `A4` hold, and neither `A2` nor `A3`
 * has FAILED.
 *
 * **`A3` IS SATISFIED BY `not-evaluated` AND THAT IS `K4` RATHER THAN
 * LENIENCE**: while `tau` is unset *"the admissibility verdict rests on `A1`,
 * `A2` and `A4`"*, so an unevaluated `A3` may not block a layout - and, being
 * its own value rather than `true`, it also cannot be reported as a target met.
 * Nothing is blocked and nothing is ignorable.
 *
 * **`A2` IS SATISFIED BY `not-evaluated` ON THE SAME GROUND**, the owner having
 * unset `kappa_bench` (`K2`). With both thresholds unset today this is `A1 &&
 * A4` in practice - his ruling made literal, not a gate that quietly stopped
 * working. **Set either bound and its condition grades again**, with no other
 * edit; `tests/stripboard/verdict.test.ts` drives it both ways.
 *
 * **IT IS NOT `outcomeOf`.** Task 20's taxonomy has THREE outcomes - `invalid`,
 * `valid-below-target`, `admissible` - and the distinction between the last two
 * is the whole point of `REP5`. This is the plain conjunction `./stop.ts` needs
 * for `Q1` and `Q2`, which ask only *may a successful termination fire*.
 */
export function fullyAdmissible(result: AdmissibilityResult): boolean {
  return result.a1 && result.a2 !== "failed" && result.a3 !== "failed" && result.a4
}
