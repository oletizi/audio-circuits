/**
 * `REP1`, `REP3` and `REP5`'s VOCABULARY: the three outcomes, the five bound
 * statuses, the exit code each outcome carries, and the two phrasing tables
 * every quality claim in a report is drawn from.
 *
 * THE AUTHORITY is
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`
 * (CRITERIA) section 7 - `REP1`'s `bound` table, `REP3`'s *"the report's wording
 * is generated from the `bound` field, not written per run"*, and `REP5`'s
 * three-outcome taxonomy with its exit codes - read against section 6's
 * `A1`-`A4`. Where this module and CRITERIA differ, CRITERIA wins and this
 * comment is the defect.
 *
 * **SPLIT FROM `./report.ts` FOR THE LINE CEILING, AT THE SEAM THIS
 * REPOSITORY ALREADY USES TWICE**: this file answers *what is a verdict stated
 * in* and `./report.ts` answers *what does one run's report say*. The same
 * division as `./stop-model.ts` / `./stop.ts` and `./climb-evaluate.ts` /
 * `./climb.ts`. `./report.ts` stays the module the plan names and re-exports
 * everything here, so no consumer imports this file directly and Tasks 23 and
 * 24 take `Outcome`, `BoundStatus` and `exitCodeFor` from the declared module.
 *
 * **WHY THE WORDING IS A TABLE AND NOT A SENTENCE PER RUN** (`REP3`): *"a
 * phrasing table keyed by `bound` means an exhausted run cannot be described as
 * optimal by an author who was feeling good about the number."* So the two
 * tables below are the ONLY source of a quality claim, `./report.ts` selects
 * from them and interpolates numbers around them, and `QUALITY_PREFIX` is how a
 * reader - and a test - finds the claims in a report and checks every one.
 */
import type { AdmissibilityResult } from "./verdict.ts"
import { fullyAdmissible } from "./verdict.ts"
import type { StoppingRule } from "./stop-model.ts"

/**
 * `REP5`'s three outcomes.
 *
 * **THREE, NOT TWO, AND BOTH NON-ADMISSIBLE OUTCOMES EXIT NON-ZERO**, so *"the
 * exit code does not distinguish them and the report must"*. CRITERIA's reason
 * is quoted rather than paraphrased because it is the reason the type exists:
 * *"a layout can satisfy every electrical and physical constraint, be the
 * lowest-cost candidate the run found, be buildable - and still miss a
 * deliberately aggressive clustering target. Reported as a flat refusal, that
 * layout is indistinguishable from a board that does not conduct. The owner's
 * question is 'can I build this?', and 'is it as good as we wanted?' is a
 * different question."*
 */
export type Outcome = "invalid" | "valid-below-target" | "admissible"

/** The three, enumerated. `assertEnumerated` checks this against `OUTCOME_WORDING`. */
export const OUTCOMES: readonly Outcome[] = ["invalid", "valid-below-target", "admissible"]

/**
 * Which of `REP5`'s three outcomes a verdict reached.
 *
 * `A1` IS TESTED FIRST AND ALONE, because the taxonomy is keyed on it: *"fails
 * a hard electrical or physical constraint - any of `HC1`-`HC10`, i.e. `A1`"*
 * is `invalid` whatever `A2`, `A3` and `A4` say, and *"electrically and
 * physically acceptable and buildable - `A1` holds"* is the middle outcome's
 * first clause. A layout that fails `A1` and `A2` both is invalid, not
 * below-target: the owner's question is whether he can build it.
 *
 * **THE REMAINING CONJUNCTION IS `fullyAdmissible`'S AND NOT A SECOND COPY OF
 * IT.** `./stop.ts`'s `Q1` and `Q2` gate on that same function, so the stop and
 * the outcome cannot disagree about one candidate - which is exactly the wiring
 * defect the plan's CHECKPOINT 2 looks for (*"an `outcome` that disagrees with
 * the verdict its own grader produced"*). Two readings of the conjunction would
 * be two places for them to come apart.
 *
 * **WHAT A `not-evaluated` `A3` MAPS TO, AND THE WORDS THAT SETTLE IT.** While
 * `tau` is unset `A3` neither holds nor fails, so a run can reach here with
 * `A1`, `A2` and `A4` held and `A3` never graded - and today, `tau` being
 * unset, that is the LIVE PATH rather than a corner. It is `admissible`, and
 * CRITERIA `K4` settles it in two clauses rather than this module choosing:
 *
 * - *"An outcome of 'valid, below target' cannot be reported against an unset
 *   target"* - which rules the middle outcome out explicitly. `REP5` defines it
 *   as *"an optimisation target unmet"*, and an ungraded condition has no unmet
 *   target in it; reporting one would assert a target was missed that nobody
 *   set.
 * - *"The admissibility verdict rests on `A1`, `A2` and `A4`"* - which names
 *   the three conditions that decide while `tau` is unset. All three hold here,
 *   so the verdict they rest on is reached.
 *
 * So the vocabulary is NOT short a member: `REP5`'s `admissible` row reads *"meets
 * the targets"*, and `K4` says which conditions the targets are while `tau` is
 * unset. **What this function must not do is erase the third state on the way
 * out**, and it does not: `A3`'s own value and its detail are carried into the
 * report's per-condition breakdown by `./report.ts`, and
 * `OUTCOME_WORDING["admissible"]` says *"`A3` holds or did not fire"* rather
 * than claiming four targets met. A run that never graded `A3` says so in the
 * report, beside an outcome that does not pretend otherwise.
 */
export function outcomeOf(result: AdmissibilityResult): Outcome {
  if (!result.a1) return "invalid"
  return fullyAdmissible(result) ? "admissible" : "valid-below-target"
}

/**
 * `REP1`'s five values, *"because a run that exhausted its search budget has
 * not proved that a lower bound exists"*.
 */
export type BoundStatus =
  | "at-floor"
  | "within-tolerance"
  | "search-exhausted"
  | "budget-exhausted"
  | "systematic-cause"

/** The five, enumerated. `assertEnumerated` checks this against `WORDING`. */
export const BOUND_STATUSES: readonly BoundStatus[] = [
  "at-floor",
  "within-tolerance",
  "search-exhausted",
  "budget-exhausted",
  "systematic-cause",
]

/**
 * `REP1`'s *"fires under"* column, read the other way: rule to bound.
 *
 * **IT IS NOT ONE-TO-ONE AND THAT IS THE TABLE'S POINT.** `Q4` and `Q5` both
 * report `budget-exhausted` - a diminishing-returns stop and a spent backstop
 * license the same statement, *"where the search stopped"* - so the five
 * statuses cover six rules. A record keyed by `StoppingRule` means adding a
 * rule does not compile until it says what it licenses saying.
 */
const BOUNDS: Readonly<Record<StoppingRule, BoundStatus>> = {
  Q1: "at-floor",
  Q2: "within-tolerance",
  Q3: "search-exhausted",
  Q4: "budget-exhausted",
  Q5: "budget-exhausted",
  Q6: "systematic-cause",
}

/** What the rule that fired licenses the report to say. */
export function boundFor(rule: StoppingRule): BoundStatus {
  return BOUNDS[rule]
}

/**
 * `REP5`'s exit column.
 *
 * A TABLE RATHER THAN A COMPARISON WITH `"admissible"`, so a fourth outcome
 * cannot acquire an exit code by falling through to the else branch. **Both
 * non-admissible outcomes exit non-zero on purpose**: `G2.5` refuses anything
 * that is not admissible, so *valid, below target* is a layout the pipeline
 * reports and does not adopt - and the report, not the code, is what tells the
 * two apart.
 */
const EXIT_CODES: Readonly<Record<Outcome, 0 | 1>> = {
  invalid: 1,
  "valid-below-target": 1,
  admissible: 0,
}

/** The process exit code for an outcome. */
export function exitCodeFor(outcome: Outcome): 0 | 1 {
  return EXIT_CODES[outcome]
}

/**
 * `REP1`'s *"licenses saying"* column, verbatim where it is a sentence.
 *
 * **ONLY `at-floor` CLAIMS OPTIMALITY, AND ONLY AGAINST THE UNCONSTRAINED
 * FLOOR** (`REP3`): *"where `maxSpanHoles` or `minSpanHoles` binds, even
 * `at-floor` is relative to the unconstrained floor and must say so - the
 * constrained floor is undetermined (limit `H-2`) and a run may not invent one
 * by stopping at it."* So its entry names the unconstrained floor in the same
 * breath as the claim, and no other entry carries a word like *optimal*,
 * *minimal* or *cannot be improved*. `V10` is the test over a deliberately
 * under-budgeted run.
 *
 * NOTHING HERE INTERPOLATES A NUMBER. These are the quality claims; the
 * figures - `F`, the derived floor, the gap, `kappa` - are printed by
 * `./report.ts` on their own lines, so a claim cannot be assembled out of a
 * number and an adjective at render time.
 */
export const WORDING: Readonly<Record<BoundStatus, string>> = {
  "at-floor":
    "At the floor: the only optimality claim this pipeline may make, and it holds against the " +
    "unconstrained floor max(0, N - R) and against no other - a constrained floor is " +
    "undetermined (limit H-2) and stopping at one does not derive it.",
  "within-tolerance":
    "Within tau of a derived lower bound - a bound, not an optimum. The gap that remains is " +
    "reported and is not claimed to be irreducible.",
  "search-exhausted":
    "These moves from these seeds did not find better. Nothing about whether better exists.",
  "budget-exhausted":
    "The weakest statement available: where the search stopped, not where the problem bottoms " +
    "out. A run that exhausted its budget has not shown that a lower bound exists.",
  "systematic-cause":
    "Not a result about cost at all - a cause to fix. The same failure signature repeated, so " +
    "the run reports it rather than retrying.",
}

/**
 * `REP5`'s *"meaning"* column, with the consequence each outcome carries.
 *
 * **THE TWO NON-ADMISSIBLE ENTRIES ARE NOT INTERCHANGEABLE**, which is the
 * whole of `REP5`: one says the board does not conduct, the other says it does
 * and misses a target set on purpose. `V12` requires that a run failing only
 * `A2` *"must not read as a malfunction"*, so the middle entry states what the
 * layout IS before what it is not, and neither entry suggests moving a bound -
 * `K3` admits a search that stopped as evidence for nothing.
 */
export const OUTCOME_WORDING: Readonly<Record<Outcome, string>> = {
  invalid:
    "invalid: this layout fails a hard electrical or physical constraint - one of HC1-HC10, " +
    "which is A1 - so it is not buildable as it stands and nothing in A1 is tradeable.",
  "valid-below-target":
    "valid, below target: electrically and physically acceptable and BUILDABLE - A1 holds - " +
    "with an optimisation target unmet, A2, A3 or A4. The targets are set past the best " +
    "demonstrated hand result on purpose, so this is a reported result and not a fault; the " +
    "adoption gate G2.5 still refuses it.",
  admissible:
    "admissible: valid AND meeting the targets this run graded - A1, A2 and A4 hold, and A3 " +
    "holds or did not fire (K4, while tau is unset). Read the per-condition lines for which " +
    "of those it was.",
}

/**
 * The prefix every quality line carries, and nothing else in a report does.
 *
 * **A REPORT WHOSE CLAIMS CANNOT BE LOCATED IS A REPORT NOTHING CAN CHECK.**
 * `REP3`'s test renders every bound-and-outcome combination, picks the lines
 * with this prefix, and asserts each one stripped of it is an entry of the two
 * tables above and nothing else. The earlier form of that test asserted
 * `./report.ts` CONTAINS the strings `WORDING[` and `OUTCOME_WORDING[`, which a
 * file can do and still write a sentence of its own on the next line.
 */
export const QUALITY_PREFIX = "quality: "

/**
 * An enumerated union's array against the table keyed by the same union.
 *
 * WHY BOTH EXIST AT ALL: the tables prove completeness at compile time - a
 * `Readonly<Record<Outcome, string>>` missing a key is a `bun run typecheck`
 * failure - and the arrays are what a test can loop over. A member added to the
 * type reaches the table by the compiler and the array by this guard, so a
 * sixth bound status cannot escape `REP3`'s loop while the tables carry it.
 *
 * **IT TAKES BOTH LISTS AS ARGUMENTS RATHER THAN READING THEM**, the same
 * device as `./stop-model.ts`'s `assertOrderCoversTable`, so it can be shown to
 * fail: a guard that reads its own two constants is unreachable without an edit
 * and is therefore a guard no test covers.
 */
export function assertEnumerated(
  listed: readonly string[],
  tabled: readonly string[],
  what: string,
): void {
  const missing = tabled.filter((key) => !listed.includes(key))
  const extra = listed.filter((key) => !tabled.includes(key))
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `the ${what} array is [${listed.join(", ")}] and its phrasing table is ` +
        `[${tabled.join(", ")}]: ${missing.length} missing from the array, ${extra.length} in ` +
        "the array with no table entry." +
        "\nThis refuses rather than rendering what is left. REP3 generates every quality claim " +
        "from the table and its test loops over the array, so a member in the table and not in " +
        "the array is a status NOTHING EVER RENDERS IN A TEST - the wording for the one case " +
        "nobody looked at - and a member in the array with no entry renders undefined as a " +
        "claim. Fix OUTCOMES, BOUND_STATUSES, WORDING or OUTCOME_WORDING in " +
        "tools/stripboard/report-model.ts so the two agree.",
    )
  }
}

// CHECKED AT IMPORT, not on the first render: a report is the last thing a long
// run produces, and a table that disagreed with its array would refuse there
// rather than before the search spent its budget.
assertEnumerated(OUTCOMES, Object.keys(OUTCOME_WORDING), "outcome")
assertEnumerated(BOUND_STATUSES, Object.keys(WORDING), "bound status")
