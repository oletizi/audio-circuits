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
 * **IT ALSO HOLDS THE SIX REFUSALS, WHICH MOVED HERE IN TASK 23 AND WERE NOT
 * REWORDED.** `./report.ts` raises four of them and reached its ceiling when
 * the seed-set sweep's own field arrived; the union, its exhaustive `switch`
 * and the one `refuse` wrapper came here rather than being split between the
 * two files, because the wrapper's tail names the authority and two tails would
 * be two authorities. `./stop-model.ts` holds `./stop.ts`'s refusals for the
 * same reason, and `./report-sweep.ts` - the third file of this group - raises
 * none.
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
 * One seed's run, as the seed-set sweep records it, and the whole sweep.
 *
 * **IT IS A DIAGNOSTIC AND THE TYPE IS WHERE THAT IS ENFORCED.** Task 23's
 * criterion is ONE run - *"`B1-frozen` says the pipeline must reach `C <= 5`
 * with `W = 0`; that is the criterion and it is met or not by a run"* - and the
 * sweep answers the different question *"on how many of the reviewed seeds"*.
 * So `reportedOutcome` is carried here beside the per-seed rows and **is the
 * first seed's own verdict rather than anything computed from `reached`**:
 * `tools/stripboard/place.ts` sets it from that run and nothing else, and a
 * change that derived it from the rate would fail the test that holds
 * `reportedOutcome` against `singleRunVerdict` instead of passing quietly. No
 * number is attached to `reached` anywhere - *"a success rate with a bar on it"*
 * is exactly the acceptance criterion the producing agent may not author.
 *
 * It lives in this module rather than beside `place.ts`'s `SeedSweep` so that
 * `./report.ts` can render it without importing the module that runs the
 * search: `SeedSweep` satisfies this shape and adds the first run itself.
 */
export interface SeedRunRecord {
  readonly seed: number
  readonly cuts: number
  readonly wires: number
  readonly bound: BoundStatus
  readonly outcome: Outcome
}

export interface SeedSweepRecord {
  /** One row per seed of `rules.seeds`, in that list's order. */
  readonly perSeed: readonly SeedRunRecord[]
  /** How many seeds met the `A4` clause of the board that was run. Nothing but the report reads it. */
  readonly reached: number
  /** What the report prints: the FIRST seed's verdict, never a function of `reached`. */
  readonly reportedOutcome: Outcome
}

/** The refusals this module raises. One arm each in `notDefaultedBecause`. */
export type ReportRefusal =
  | "report-tolerance-without-tau"
  | "report-binding-rule-disagrees"
  | "report-worse-acceptance-disagrees"
  | "report-parameter-unrecorded"
  | "report-note-unsentenced"
  | "report-negative-gap"

function notDefaultedBecause(refusal: ReportRefusal): string {
  switch (refusal) {
    case "report-tolerance-without-tau":
      return (
        "REP1 ties within-tolerance to Q2, and Q2 cannot fire while tau is null - " +
        "tools/stripboard/stop.ts returns false there, because A3 does not block " +
        "admissibility with no tolerance set and Q2 would otherwise fire on every admissible " +
        "candidate and report WITHIN TOLERANCE against a tolerance the owner declined to set " +
        "(CRITERIA K4). So this pair is a bound naming a rule the search could not have " +
        "returned, which is one of the three wiring defects the plan's CHECKPOINT 2 exists to " +
        "catch. It is NOT defaulted to the weaker bound the run might have earned instead: " +
        "guessing which rule really fired would put a stopping reason in the report that " +
        "nothing measured. Pass the rule evaluateStop returned, or set tau in " +
        "stripboard/rules.json as a deliberate edit carrying the run that justifies it."
      )
    case "report-binding-rule-disagrees":
      return (
        "REP4 requires that the bound field and the named binding constraint AGREE IN ONE " +
        "REPORT - *a run that stopped because a span bound binds is not a run that ran out of " +
        "budget* - and a search-stopped binding names the rule it stopped under. Two different " +
        "rules in one report means one of them came from somewhere other than this run. It is " +
        "NOT defaulted to either: the binding constraint is also the evidence K3 requires " +
        "before kappa_bench may move, and a ratchet moved on a mismatched pair would be moved " +
        "on a run nobody can reconstruct. Pass the same StoppingRule to both."
      )
    case "report-worse-acceptance-disagrees":
      return (
        "RunResult.worseAcceptanceRan is rules.worseAcceptance !== null in " +
        "tools/stripboard/search.ts, so the two disagreeing means the run and the rules being " +
        "reported are not the same pair. PIPELINE E3 requires that an unconfigured bound be " +
        "STATED IN THE REPORT rather than quietly approximated, and reporting a bound of null " +
        "as having been in effect - or an effective bound as unset - is the quiet " +
        "approximation it forbids. It is NOT defaulted to the rules file's answer, which would " +
        "describe the mechanism a run WOULD have had rather than the one it ran under."
      )
    case "report-parameter-unrecorded":
      return (
        "OB3 requires the report print a deciding parameter's provenance BESIDE THE NUMBER, " +
        "and tools/stripboard/rules.ts refuses to load a file whose notes block is missing a " +
        "parameter - so reaching this means a caller built a StripboardRules by hand without " +
        "the note. It is NOT defaulted to printing the number alone: a number used silently is " +
        "the failure OB3 exists to prevent, and a value whose standing nobody recorded is " +
        "exactly the one that must not decide an outcome unremarked. Load the rules through " +
        "loadRules, or add the note."
      )
    case "report-note-unsentenced":
      return (
        "The report prints the note's FIRST SENTENCE and labels it as that, because the notes " +
        "are paragraphs - evaluationCap's runs to about nine hundred characters - and a report " +
        "nobody reads to the end states nothing. A block with no sentence boundary in it has no " +
        "first sentence to print. It is NOT defaulted to printing the whole block under that " +
        "label, which is a mislabelled quotation: a reader who sees one sentence announced and a " +
        "paragraph delivered cannot tell which notes were truncated and which were not, and the " +
        "point of quoting the provenance rather than restating it is that the quotation is " +
        "exact. Give the note an opening sentence ending in a period, in stripboard/rules.json, " +
        "or change this label."
      )
    case "report-negative-gap":
      return (
        "F_floor is a LOWER bound (CRITERIA K5), so a candidate beneath it is proof that the " +
        "floor derivation, the scorer or the dump is not the quantity it claims to be. " +
        "tools/stripboard/score.ts refuses it first and is the primary reading; " +
        "tools/stripboard/verdict.ts and tools/stripboard/stop.ts each refuse it on their own " +
        "path. This is the one reading NEITHER of those covers: while tau is null A3 reports " +
        "the gap rather than computing it, so no verdict arithmetic touches it, and a report " +
        "would print a negative gap as a measured fact - an impossible score reading as the " +
        "best result in the run. It is not clamped to zero, which would turn the evidence into " +
        "a result."
      )
  }
}

/**
 * EXPORTED BECAUSE THE REFUSALS AND THE RENDERING ARE IN TWO FILES AND THE
 * WORDING IS IN ONE. `./report.ts` raises four of these six and this module
 * raises none of them itself; the union, its `switch` and this wrapper live
 * here for the reason `./stop-model.ts` holds `./stop.ts`'s - the line ceiling,
 * at the seam between a vocabulary and what is said in it. A second `refuse`
 * beside the rendering would be a second tail, and the tail names the authority.
 */
export function refuse(refusal: ReportRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(CRITERIA section 7's REP1-REP5 is the authority, and tools/stripboard/report.ts is the " +
      "only implementation of the report.)",
  )
}

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

/**
 * Which stopping rules make the RUN a failure whatever the candidate earned.
 *
 * **`Q5` ALONE, AND CRITERIA SAYS IT TWICE.** Section 5's `Q5` row: *"`Q5` is a
 * backstop against a bug looping forever, not a measure of anything, and a run
 * that stops on it is **reported as a failure**."* And the paragraph under it:
 * *"a run that stops on `Q5` is reported as a failure rather than as a result -
 * reaching it means either the search or this rule is broken, and both are
 * worth knowing."*
 *
 * **SO THE EXIT CODE IS ABOUT THE RUN AND THE OUTCOME IS ABOUT THE CANDIDATE,
 * AND THOSE ARE TWO FACTS.** A `Q5` stop on a healthy candidate is a layout
 * that earned `admissible` found by a run that hit its backstop; reported as
 * `exit: 0` it reads as a clean pipeline run, which is the one thing `Q5`'s
 * demotion exists to prevent. `Q5` *"is not a measure of anything"*, so it says
 * nothing about the candidate and everything about the run - which is exactly
 * why the two cannot share one field.
 *
 * **NOTHING ELSE IS IN HERE AND `Q6` WAS CONSIDERED.** A `Q6` stop reports a
 * systematic cause, and `REP1` says it is *"not a result about cost at all - a
 * cause to fix"* - but **no clause of CRITERIA says a `Q6` run is reported as a
 * failure**, and extending this table past the text would be this module
 * authoring a criterion. In practice `signatureOf` refuses to sign a candidate
 * with no failing check, so a `Q6` run has recorded failures and its verdict
 * will usually carry them; where it does not, the outcome decides as `REP5`
 * says. A record keyed by `StoppingRule` means a seventh rule does not compile
 * until it says which it is.
 */
const RUN_FAILURE: Readonly<Record<StoppingRule, boolean>> = {
  Q1: false,
  Q2: false,
  Q3: false,
  Q4: false,
  Q5: true,
  Q6: false,
}

/**
 * Why a run can exit non-zero with an admissible candidate, in CRITERIA's own
 * words.
 *
 * It is a FIXED STRING rather than a sentence assembled at render time, for the
 * same reason `WORDING` is a table - but it is deliberately NOT under
 * `QUALITY_PREFIX`, because it is not a claim about the layout's cost at all.
 * It is a statement about the run, keyed by the rule that ended it.
 */
export const RUN_FAILURE_NOTE =
  "the RUN is reported as a failure although the candidate is not: CRITERIA states twice that a " +
  "run stopping on Q5 is reported as a failure rather than as a result, because Q5 is a backstop " +
  "against a bug looping forever and not a measure of anything - reaching it means either the " +
  "search or Q5 itself is broken, and both are worth knowing. The outcome above is about the " +
  "CANDIDATE and this exit code is about the RUN."

/** Whether the run that stopped on this rule is itself reported as a failure. */
export function runFailedOn(rule: StoppingRule): boolean {
  return RUN_FAILURE[rule]
}

/**
 * The process exit code: `REP5`'s column for the candidate, forced non-zero
 * where the RULE makes the run a failure.
 *
 * **IT TAKES THE FIRED RULE AS WELL AS THE OUTCOME, WHICH IS A DEVIATION FROM
 * THE PLAN'S DECLARED SIGNATURE** (`exitCodeFor(outcome: Outcome): 0 | 1`) and
 * is recorded as one in the plan's *Deviations from the specs* section. The
 * one-argument form cannot express *the candidate is admissible and the run
 * failed*, so under it a `Q5` stop on a healthy candidate exited 0 - against
 * two clauses of CRITERIA. The criteria are the authority and the brief is
 * wrong here.
 */
export function exitCodeFor(outcome: Outcome, rule: StoppingRule): 0 | 1 {
  if (runFailedOn(rule)) return 1
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
