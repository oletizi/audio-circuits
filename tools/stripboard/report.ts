/**
 * `REP1`-`REP5`: the report one run hands a person, as lines.
 *
 * THE AUTHORITY is
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`
 * (CRITERIA) section 7. Where this module and CRITERIA differ, CRITERIA wins
 * and this comment is the defect. `./report-model.ts` holds the vocabulary -
 * the three outcomes, the five bound statuses, the exit codes and the two
 * phrasing tables - and is re-exported from here, so this is the module the
 * plan names and the one Tasks 23 and 24 import.
 *
 * **A STOP IS NOT A PASS, AND THIS FILE IS WHERE THAT EITHER HOLDS OR FAILS.**
 * `./stop.ts` decides THAT a run is over and `./verdict.ts` decides whether the
 * board can be built; neither is a statement about quality. `REP1` is: it says
 * what the rule that fired LICENSES the report to say, and *"a run that
 * exhausted its search budget has not proved that a lower bound exists"*. So
 * every quality claim here is selected from `WORDING` or `OUTCOME_WORDING` by
 * the `bound` and the `outcome`, printed under `QUALITY_PREFIX` so a reader can
 * find all of them, and **this module writes no sentence of its own about
 * quality**. What it writes is numbers, which carry no adjective.
 *
 * **IT IS HANDED THE RUN AND THE RULE, AND GRADES THE CANDIDATE ITSELF.** A
 * `ReportInput` carrying a ready-made `AdmissibilityResult` and a ready-made
 * `bound` would be a report that could name a candidate the verdict was not
 * about, or a bound naming a rule `evaluateStop` never returned - two of the
 * three things the plan's CHECKPOINT 2 exists to catch, made unreachable here
 * by construction instead: the verdict is computed from `run.best`, and the
 * bound is derived from the fired rule through `boundFor`.
 *
 * **WHAT A REPORT MUST CARRY BEYOND THE VERDICT**, each because its absence
 * would read as the opposite of the truth:
 *
 * - `floorNote` from `./stop-model.ts`, whenever a floor is printed - which is
 *   every report. `C_floor = max(0, N - R)` takes `R` from today's stock, so a
 *   floor printed bare is a provisional figure printed as a fact, and the
 *   owner's standing rule over every dimension is quoted rather than
 *   paraphrased.
 * - `E3`'s worse-acceptance, run or not run. PIPELINE requires an unconfigured
 *   bound be *"stated in the report, never quietly approximated"*.
 * - The parameter a stop turned on, with its recorded provenance (`OB3`): *"a
 *   proposed default used knowingly is not the same failure as one used
 *   silently."*
 * - `A1`-`A4` one by one (`REP2`), *"never a single 'not admissible'"* - and
 *   `A3` by its own three-valued name, so a condition that was never graded
 *   cannot read as a target met.
 */
import { floorNote, type StoppingRule } from "./stop-model.ts"
import { describeCutCounts } from "./cut-necessity.ts"
import type { RunResult } from "./search.ts"
import type { StripboardRules } from "./rules.ts"
import type { BoardTargets } from "./targets.ts"
import { admissible, type AdmissibilityResult, type BindingConstraint } from "./verdict.ts"
import {
  OUTCOME_WORDING,
  QUALITY_PREFIX,
  RUN_FAILURE_NOTE,
  WORDING,
  boundFor,
  exitCodeFor,
  outcomeOf,
  runFailedOn,
  type BoundStatus,
  type Outcome,
} from "./report-model.ts"

export {
  BOUND_STATUSES,
  OUTCOMES,
  OUTCOME_WORDING,
  QUALITY_PREFIX,
  RUN_FAILURE_NOTE,
  WORDING,
  assertEnumerated,
  boundFor,
  exitCodeFor,
  outcomeOf,
  runFailedOn,
  type BoundStatus,
  type Outcome,
} from "./report-model.ts"

/** What one report is rendered from. Nothing here is a verdict or a bound. */
export interface ReportInput {
  /** The run, as `search()` returned it. `run.best` is the candidate reported. */
  readonly run: RunResult
  /** The rule `evaluateStop` returned. The `bound` is derived from it, never passed. */
  readonly rule: StoppingRule
  readonly targets: BoardTargets
  readonly rules: StripboardRules
  /** Which low-boost board was graded. `./verdict.ts` refuses `undefined` there. */
  readonly frozen: boolean | undefined
  /** What bounded the clustering, when the caller has it (`K2`, `REP2`, `REP4`). */
  readonly binding: BindingConstraint | undefined
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

function refuse(refusal: ReportRefusal, offending: string): never {
  throw new Error(
    `${refusal}: ${offending}. ${notDefaultedBecause(refusal)} ` +
      "(CRITERIA section 7's REP1-REP5 is the authority, and tools/stripboard/report.ts is the " +
      "only implementation of the report.)",
  )
}

/**
 * The rules-file parameter each stopping rule turned on, and what the file
 * records about that value's standing.
 *
 * **`OB3`, RESTATED AGAINST WHAT THE FILE ACTUALLY HOLDS.** `OB3` as the plan
 * writes it names *"`tau` and `Q4`'s `1/2000` being PIPELINE's proposed
 * defaults"*; Task 10 measured that against CRITERIA and the committed file,
 * and after 2026-10-10 the file holds **no** PIPELINE-proposed default - it
 * holds one deliberately unset parameter, two labelled hypotheses, one
 * inherited external value and one unsourced backstop. `OB3`'s MECHANISM is
 * what survives and is what this table serves: a value that is not settled and
 * that decided a stop says so beside the number.
 *
 * **EVERY `standing` BELOW IS THE NOTE'S OWN CLAIM**, not a characterisation
 * written here, and the recorded provenance printed beside it is read out of
 * `rules.notes` at render time rather than restated - so a note that changes
 * changes the report.
 *
 * `Q1` HAS NO ENTRY ON PURPOSE. It turns on `C_floor`, which is derived rather
 * than configured, and a board may declare its own strip count in
 * `boards/<board>/perfboard.json` instead of taking `stockRows` - so naming a
 * rules parameter there would name the wrong number on exactly the boards that
 * declare one. The floor's provisionality reaches the report through
 * `floorNote`, which every report prints and which quotes the owner verbatim.
 */
interface DecidingParameter {
  /** The rules-file key, which is also its key in `notes`. */
  readonly key: "tau" | "yieldFloor" | "evaluationCap" | "signatureRun" | "seeds"
  /** What the committed note says about the value's standing, in its own terms. */
  readonly standing: string
}

const DECIDED_BY: Readonly<Record<StoppingRule, DecidingParameter | null>> = {
  Q1: null,
  Q2: {
    key: "tau",
    standing:
      "tau is NOT the owner's settled value: CRITERIA K4 records it as deliberately unset, he " +
      "was asked to choose a tolerance and declined, and the one figure once carried for it " +
      "was PIPELINE's proposal and is withdrawn. A tolerance in force is a deliberate edit " +
      "under " +
      "K3's ratchet carrying the run that justifies it, so read this stop as met against that " +
      "edit and not against a number the owner set",
  },
  Q3: {
    key: "seeds",
    standing:
      "the seed list is [external] - the sibling repository's optimiser's own list, inherited " +
      "rather than derived here - and Q3 fires when it is spent, so this stop is a statement " +
      "about that list and not about the problem",
  },
  Q4: {
    key: "yieldFloor",
    standing:
      "k is carried as A LABELLED HYPOTHESIS, written to be revised rather than defended: its " +
      "gap term is optimistic because the derived floor ignores physical reach, its rate term " +
      "is bursty, and NEITHER HAS BEEN MEASURED ON A REAL RUN OF THIS PIPELINE",
  },
  Q5: {
    key: "evaluationCap",
    standing:
      "the cap is a labelled derivation from measured timings and NOT a figure anybody " +
      "settled, and CRITERIA Q5 requires that a run stopping on it be reported as a FAILURE " +
      "rather than as a result - reaching the backstop means either the search or Q4 is " +
      "broken, and both are worth knowing",
  },
  Q6: {
    key: "signatureRun",
    standing:
      "the run length is [external] and INHERITED, NOT DERIVED - the sibling repository's " +
      "number taken from a different problem, a plausible starting value and nothing stronger",
  },
}

/**
 * The note's FIRST SENTENCE: its provenance tag, its date and the criterion it
 * answers to.
 *
 * **IT IS TRUNCATED AND THE REPORT SAYS SO**, because the notes are paragraphs
 * - `evaluationCap`'s runs to about nine hundred characters - and a report
 * nobody reads to the end is a report that states nothing. Measured against all
 * five notes this table reaches rather than assumed: each one opens with its
 * bracketed tag and closes that opening sentence on the criterion, and the
 * sentence boundary is a period followed by whitespace so `COST 6.4` inside one
 * is not mistaken for the end of it.
 *
 * The `||` split comes first because three of the notes use that separator for
 * their owner-settled and agent-rationale blocks, and the tag is always in the
 * block before it.
 *
 * **A BLOCK WITH NO SENTENCE BOUNDARY REFUSES RATHER THAN BEING PRINTED
 * WHOLE.** Returning the block under a label that says *first sentence* is a
 * mislabelled quotation and a fallback in production code, and the point of
 * quoting the provenance instead of restating it is that the quotation is
 * exact.
 */
function provenanceOf(rules: StripboardRules, key: string): string {
  const note = rules.notes[key]
  if (note === undefined || note.trim() === "") {
    refuse("report-parameter-unrecorded", `stripboard/rules.json carries no note for "${key}"`)
  }
  const head = note.split("||")[0] ?? note
  const sentence = /^[\s\S]*?\.(?=\s|$)/.exec(head)
  if (sentence === null) {
    refuse(
      "report-note-unsentenced",
      `the note for "${key}" opens with no sentence boundary: ${head.trim()}`,
    )
  }
  return sentence[0].trim()
}

/**
 * A parameter's value as a person reads it.
 *
 * `seeds` IS THE ONE LIST, and `String` on an array renders `0,1,2,3,4` - a
 * machine's spelling in a line a person is meant to read. It is keyed on the
 * one array-valued key rather than on `Array.isArray`, so a second list
 * entering this table has to say how it prints.
 */
function valueText(rules: StripboardRules, key: DecidingParameter["key"]): string {
  if (key === "seeds") return rules.seeds.join(", ")
  return String(rules[key])
}

/** `OB3`'s line: which parameter decided this stop, its value, and its standing. */
function parameterLine(input: ReportInput): string {
  const deciding = DECIDED_BY[input.rule]
  if (deciding === null) {
    return (
      `parameter: no stripboard/rules.json parameter decided this stop - ${input.rule} is read ` +
      "off the candidate and the derived floor. The floor's own provisionality is on the floor " +
      "line above."
    )
  }
  return (
    `parameter: ${deciding.key} = ${valueText(input.rules, deciding.key)} decided this stop ` +
    `(${input.rule}). ${deciding.standing}. Its recorded provenance, which is the first ` +
    `sentence of that parameter's note in stripboard/rules.json - the file carries the whole ` +
    `note: ${provenanceOf(input.rules, deciding.key)}`
  )
}

/** `E3`, run or not run, said as which (PIPELINE `E3`). */
function worseAcceptanceLine(input: ReportInput): string {
  const configured = input.rules.worseAcceptance
  if (input.run.worseAcceptanceRan !== (configured !== null)) {
    refuse(
      "report-worse-acceptance-disagrees",
      `this run reports worseAcceptanceRan = ${input.run.worseAcceptanceRan} and these rules ` +
        `carry worseAcceptance = ${String(configured)}`,
    )
  }
  if (configured === null) {
    return (
      "E3: worse-acceptance DID NOT RUN - stripboard/rules.json leaves the bound unset, no " +
      "source supplies a schedule and none was invented, so the escape from a barrier the " +
      "net-cluster move does not span was not available to this run and nothing was " +
      "approximated in its place."
    )
  }
  return (
    `E3: worse-acceptance was IN EFFECT with a bound of ${configured}, so the clause was live ` +
    "on every acceptance decision this run made. That is the MECHANISM and not a firing: " +
    "whether a worse candidate was in fact taken is read off the climbs' own counters."
  )
}

/** `A1`-`A4`, one line each, by name and with the verdict's own detail. */
function conditionLines(verdict: AdmissibilityResult): readonly string[] {
  return [
    `A1 ${verdict.a1 ? "held" : "FAILED"}: ${verdict.detail.a1}`,
    `A2 ${verdict.a2 ? "held" : "FAILED"}: ${verdict.detail.a2}`,
    // A3 IS PRINTED BY ITS OWN THREE-VALUED NAME rather than as held or
    // failed: "not-evaluated" is the state a boolean erased, and a report that
    // spelled it "held" would report a target met that nobody graded.
    `A3 ${verdict.a3}: ${verdict.detail.a3}`,
    `A4 ${verdict.a4 ? "held" : "FAILED"}: ${verdict.detail.a4}`,
  ]
}

/** `F - F_floor`: the gap `REP2` requires every report carry. */
function gapOf(input: ReportInput): number {
  const gap = input.run.best.score.objective - input.targets.cutFloor
  if (gap < 0) {
    refuse(
      "report-negative-gap",
      `${input.targets.board} scores F = ${input.run.best.score.objective} against a declared ` +
        `floor of ${input.targets.cutFloor}`,
    )
  }
  return gap
}

/** `REP4`: the bound and the named binding constraint must agree in one report. */
function assertBoundAgrees(input: ReportInput, bound: BoundStatus): void {
  if (bound === "within-tolerance" && input.rules.tau === null) {
    refuse(
      "report-tolerance-without-tau",
      `this report carries ${input.rule} with tau unset`,
    )
  }
  const binding = input.binding
  if (binding !== undefined && binding.kind === "search-stopped" && binding.rule !== input.rule) {
    refuse(
      "report-binding-rule-disagrees",
      `this report carries the fired rule ${input.rule} and a search-stopped binding naming ` +
        `${binding.rule}`,
    )
  }
}

/**
 * One run's report, as lines a caller prints or writes.
 *
 * LINES RATHER THAN A STRING because the caller decides where they go - a
 * terminal, `run.json`'s neighbour, a test's `join("\n")` - and because a line
 * is the unit `REP3`'s check works in: every line carrying `QUALITY_PREFIX` is
 * a table entry verbatim, and a report that assembled its claims into prose
 * would be a report nothing could check that property on.
 */
export function renderReport(input: ReportInput): readonly string[] {
  const best = input.run.best
  const bound = boundFor(input.rule)
  assertBoundAgrees(input, bound)
  const verdict = admissible({
    results: best.results,
    score: best.score,
    targets: input.targets,
    rules: input.rules,
    // `F_0` is the first climb's best objective, which is what
    // `StopState.climbHistory[0]` carries. `undefined` on a run with no climb
    // is `./verdict.ts`'s refusal to make, not this module's to paper over.
    initialObjective: input.run.climbs[0]?.best.score.objective,
    frozen: input.frozen,
    binding: input.binding,
  })
  const outcome = outcomeOf(verdict)
  const score = best.score
  const evaluations = input.run.climbs.reduce((total, climb) => total + climb.evaluations, 0)
  return [
    `board: ${input.targets.board}, candidate ${best.candidate}`,
    `outcome: ${outcome}`,
    `${QUALITY_PREFIX}${OUTCOME_WORDING[outcome]}`,
    `bound: ${bound}, from the stopping rule ${input.rule} that fired`,
    `${QUALITY_PREFIX}${WORDING[bound]}`,
    // THE GAP HERE IS `F - F_floor` AND IS NOT `A3`'S. `REP2` requires the gap
    // remaining; `A3`'s is that gap divided by `F_0 - F_floor`, a fraction of
    // the run's own distance. Both are printed - this line and `A3`'s own - and
    // they are labelled differently because one cut above the floor is a gap of
    // one here and of one fortieth there on the same candidate.
    `cost: F = ${score.objective}, derived floor = ${input.targets.cutFloor}, gap above the ` +
      `floor = ${gapOf(input)} (C_necessary = ${score.necessaryCuts}, W = ${score.wires}, ` +
      `S = ${score.solder})`,
    // BOTH CUT COUNTS AND THE DISAGREEMENT BETWEEN THEM, IN WHAT A PERSON
    // READS, WHICH IS THE HALF OF THE OWNER'S "OPTION C" THAT LIVES OUTSIDE THE
    // SCORER. The wording is `./cut-necessity.ts`'s, because the module that
    // derives the two counts is where what they MEAN belongs - and because this
    // file is near its line ceiling, which is a bad reason to put prose
    // somewhere and a fine reason not to duplicate it. A divergence is stated
    // rather than left to be worked out by subtracting one figure from another:
    // his reason for keeping both was that he wants to spot a bad one. It
    // carries no adjective - "badly" is his judgement on the figure, not this
    // module's to pass - which keeps the rule that every quality claim comes
    // from `WORDING` or `OUTCOME_WORDING`.
    `cuts: ${describeCutCounts(score.cuts, score.necessaryCuts)}`,
    // THE QUANTITY THE ACCEPTANCE RULE ORDERS BY, IN WHAT A PERSON READS. It is
    // not a new criterion and not a cost term - `./climb-accepts.ts` carries why
    // the open-net count is a KEY above `F` rather than a term in it - but with
    // that key in force it is the figure that decided every acceptance in the
    // run, and it appeared in no line of this report. A reader could see `F`
    // fall and `A1` fail with nothing saying how far from conducting the board
    // was. It carries no adjective, which is what keeps this module's rule that
    // every quality claim comes from `WORDING` or `OUTCOME_WORDING`.
    `completeness: ${best.openNets} net(s) still open, the count --check reports as incomplete ` +
      "and the first key of the acceptance ordering",
    `floor: ${floorNote(input.targets)}`,
    ...conditionLines(verdict),
    parameterLine(input),
    worseAcceptanceLine(input),
    `run: ${input.run.climbs.length} climb(s), ${evaluations} evaluation(s) spent, restarts at ` +
      `evaluation [${input.run.restartBoundaries.join(", ")}]`,
    exitLine(outcome, input.rule),
  ]
}

/**
 * The exit code, and why it is not the outcome's where the rule overrode it.
 *
 * **THE ONE PLACE A RUN CAN EXIT NON-ZERO ON AN ADMISSIBLE CANDIDATE**, which
 * is `Q5`'s own requirement and not a severity this module invented: the
 * outcome is about the CANDIDATE and the exit code is about the RUN, and a
 * backstop stop reading as `exit: 0` is a stop reading as a pass. The reason
 * printed is `RUN_FAILURE_NOTE`, a fixed string carrying CRITERIA's words, and
 * it is not a `QUALITY_PREFIX` line because it is not a claim about the
 * layout's cost.
 */
function exitLine(outcome: Outcome, rule: StoppingRule): string {
  const code = exitCodeFor(outcome, rule)
  if (!runFailedOn(rule)) return `exit: ${code}`
  return `exit: ${code} - ${RUN_FAILURE_NOTE}`
}
