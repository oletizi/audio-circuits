/**
 * The comparison between the three starting arms: the mark, the decision
 * variable, the two statistics beside it, and the retirement rule.
 *
 * **THE PLAN PICKS NO WINNER, AND THE STRUCTURE IS WHAT MAKES THAT TRUE RATHER
 * THAN A PROMISE.** There is no default arm: `SeedInput.arm` is required,
 * `parseSeedArm("")` refuses, and `ArmComparison` has no field naming a chosen
 * arm. `retireable` is a report computed by the declared rule and **nothing in
 * the pipeline reads it** - the deletion is a reviewed edit by the owner or by a
 * later reviewed change, carrying the run that justified it. An agent choosing
 * the arm that flatters its own construction is this plan's governing invariant
 * failing in the one place nobody would look.
 *
 * **THE MARK IS `B1-frozen`'S OWN CLAUSE AND HAS NO DEFAULT.** On the frozen
 * fixture it is `C <= 5`, `W = 0`, every net complete - the owner's achieved
 * result, externally authored, already in CRITERIA. For any other board the mark
 * is a required parameter and this harness refuses without it, because a quality
 * bar this agent chose would be an acceptance criterion authored by the
 * producing agent, which is the governing invariant's failure.
 *
 * **THE DECISION VARIABLE IS THE SUCCESS RATE** - how many of the seed set's
 * seeds met the mark, over the size of the seed set - and the other two figures
 * are evidence behind it rather than rivals to it. Each restart is a fresh start
 * (PIPELINE E2), so the start only buys the first climb, and the only aggregate
 * that answers *"did starting here make the run more likely to deliver"* is how
 * often the run delivered. **Final `F` per seed** is the raw number the rate is
 * computed from and the tiebreak when no arm reaches the mark at all.
 * **`evaluationsToCross` is a cost figure and cannot be the decision variable**:
 * it is undefined for a seed that never crossed, so an arm that crossed once,
 * early, would outrank an arm that crossed on every seed.
 *
 * **THE RATE DECIDES WHICH ARM THE PROJECT KEEPS; IT DECIDES NOTHING ABOUT A
 * LAYOUT.** It changes no `outcome`, no `bound`, no exit code and no verdict,
 * exactly as Task 23's seed-set rate does not. `admissibleA1` is reported beside
 * the mark and is not one of its clauses, because the mark is the external
 * criterion's wording verbatim; an arm whose mark-meeting runs are inadmissible
 * is a finding to report, not a rate to adjust.
 *
 * **`ArmRunner` IS A PARAMETER AND NOT AN IMPORT**, because `climb` is Task 17's
 * and restarts are Task 18's, and the owner's first question is precisely that
 * restarts are what decides whether the start matters - so a comparison run
 * before `E2` exists would answer a question nobody asked. **The measured run is
 * a step of Task 18** and its result is recorded in
 * `docs/stripboard/pipeline-verification.md`.
 */
import { SEED_ARMS, seedCandidate, type SeedArm, type SpawnVeroroute } from "./seed.ts"
import type { StripboardRules } from "./rules.ts"
import type { BoardTargets } from "./targets.ts"

/**
 * A quality bar, every clause of it, and the document it came from. **No
 * default**: `source` names the document the figure comes from, so a mark with
 * no provenance cannot be written at all.
 *
 * `netsComplete` is the literal `true` rather than a boolean, because a mark
 * that did not require every net complete would not be a quality bar - it would
 * be a bar on an unfinished board, and `--check` exits 1 on one of those.
 */
export interface QualityMark {
  readonly cuts: number
  readonly wires: number
  readonly netsComplete: true
  readonly source: string
}

/**
 * The frozen fixture's mark, and the only one this plan carries: `B1-frozen`'s
 * own clause. Every other board's mark is the caller's parameter.
 */
export const FROZEN_MARK: QualityMark = {
  cuts: 5,
  wires: 0,
  netsComplete: true,
  source:
    "B1-frozen, docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md: the " +
    "owner's achieved result on tests/fixtures/stripboard/pultec-low-boost-frozen.vrt - at " +
    "most five cuts, no wire bridges, every net complete, starting from the import-placed " +
    "board. Externally authored, which is the whole reason it is the mark.",
}

/**
 * `mark.cuts + rhoWire * mark.wires`: the mark's own objective, derived through
 * `F`'s weights and introducing no new number.
 *
 * It is the CROSSING figure and not the mark. An `F` at or below it is necessary
 * for the mark and not sufficient, because the wire and completeness clauses are
 * read off the candidate and not off `F`: `C = 4` with four bridges scores 5 at
 * `rhoWire = 0.25` and fails `B1-frozen`'s `W = 0`.
 */
export function markObjective(mark: QualityMark, rules: StripboardRules): number {
  return mark.cuts + rules.rhoWire * mark.wires
}

/**
 * What one run of one arm at one seed produced. `history` is one entry per
 * evaluation (Task 17's `ClimbResult.history`), so an index into it IS an
 * evaluation count - which is why `evaluationsToCross` refuses a run whose
 * `history.length` disagrees with its `evaluations`.
 */
export interface ArmRun {
  readonly startAdmissible: boolean
  readonly objective: number
  readonly cuts: number
  readonly wires: number
  readonly netsComplete: boolean
  readonly admissibleA1: boolean
  readonly history: readonly number[]
  readonly evaluations: number
}

/**
 * The search, injected: one runner serves every arm, so **the same budget is
 * structural rather than asserted** - there is no second place for a budget to
 * differ.
 */
export type ArmRunner = (start: string, seed: number, spawn: SpawnVeroroute) => ArmRun

/**
 * Whether a run met the mark - **on all of its clauses, never on `F` alone**.
 * `markObjective` is the crossing figure and takes no part in this.
 */
export function meetsMark(run: ArmRun, mark: QualityMark): boolean {
  return run.cuts <= mark.cuts && run.wires <= mark.wires && run.netsComplete === mark.netsComplete
}

/**
 * The evaluation at which this run's `F` first crossed `objective`, or
 * `undefined` when it never did.
 *
 * NAMED AS A CROSSING rather than as "evaluations to reach the mark": an `F` at
 * or below the mark's objective is necessary for the mark and not sufficient.
 *
 * REFUSES A MISALIGNED HISTORY rather than reporting an index into it. One entry
 * per evaluation is what makes the index an evaluation count; a history shorter
 * or longer than the run's own evaluation count means the two came from
 * different bookkeeping, and the returned number would be a cost figure in no
 * unit at all.
 */
export function evaluationsToCross(run: ArmRun, objective: number): number | undefined {
  if (run.history.length !== run.evaluations) {
    throw new Error(
      `evaluationsToCross: this run's history has ${run.history.length} entries and it reports ` +
        `${run.evaluations} evaluations. ClimbResult.history is one entry per evaluation, which ` +
        "is the only thing that makes an index into it an evaluation count, so the two " +
        "disagreeing means they came from different bookkeeping. It is not reconciled by taking " +
        "the shorter of the two: the crossing index would then be a cost figure in no unit.",
    )
  }
  const at = run.history.findIndex((value) => value <= objective)
  return at === -1 ? undefined : at
}

/**
 * One arm at one seed: the run, whether it met the mark, and the crossing - or,
 * when the arm could not produce a start at all, the refusal that says why.
 *
 * **`run` IS `ArmRun | null` AND `refusal` IS `string | null`, EXACTLY ONE OF
 * THEM SET.** A refused seed is not a run that scored badly, and it is not a
 * reason to abandon the comparison either: the brief's question is whether span
 * refusals CONCENTRATE IN ONE ARM, and an aborted comparison cannot answer it -
 * a constructed arm that refuses on four seeds in five would look identical to a
 * harness that crashed. So the refusal is recorded, the arm keeps its row, and
 * the rate counts it as not having met the mark, which it did not.
 */
export interface SeedRun {
  readonly seed: number
  readonly run: ArmRun | null
  readonly metMark: boolean
  readonly evaluationsToCross: number | undefined
  readonly refusal: string | null
}

/**
 * One arm over the whole seed set. `reached` is the numerator of its rate and
 * `refused` is how many of its seeds produced no start at all - the figure that
 * distinguishes an arm that lost from an arm that never ran.
 */
export interface ArmResult {
  readonly arm: SeedArm
  readonly perSeed: readonly SeedRun[]
  readonly reached: number
  readonly refused: number
}

/** The comparison, with no field naming a chosen arm. */
export interface ArmComparison {
  readonly mark: QualityMark
  readonly decisionVariable: "success-rate"
  readonly arms: readonly ArmResult[]
  readonly separated: boolean
  readonly retireable: readonly SeedArm[]
}

/**
 * What the comparison needs. `mark` is `QualityMark | null` rather than optional
 * **because `null` is a value and an absent property is an omission**: the
 * harness refuses a `null` mark by name, and a caller writing `null` has said
 * what it is doing, exactly as `worseAcceptance: null` does in `PAR3`'s rules
 * file.
 */
export interface ComparisonInput {
  readonly importedBoard: string
  readonly targets: BoardTargets
  readonly runDir: string
  readonly rules: StripboardRules
  readonly mark: QualityMark | null
}

/**
 * The decision variable, the rule, and the reason for each arm's treatment -
 * declared before the run, beside the harness, so the rule cannot be adjusted
 * after the numbers are in. Task 15's `RANKING` is the shape; its limit comes
 * with it: that each arm is named and followed by prose is assertable, and that
 * the prose is a REASON is the owner's judgement at review.
 */
export const RETIREMENT =
  "The decision variable is the success rate: how many of the seed set's seeds met the mark, " +
  "over the size of the seed set, on one seed set, one budget and one board. It is declared " +
  "here, before the run, so the rule cannot be adjusted once the numbers are in. " +
  "constructed is retired if its rate does not exceed the uniform draw's, and a TIE RETIRES " +
  "IT: a start that ties a uniform draw is carrying a belief that buys nothing and costs a " +
  "module, an ordering, a sub-arrangement rule and their tests. Retiring it means DELETING " +
  "assignStrips, the SIP5 sub-arrangement, that branch of seedCandidate and their tests in " +
  "the same change - supersede means delete - and recording in " +
  "docs/stripboard/pipeline-verification.md that the construction was a story. One net per " +
  "strip costing zero cuts stays where it is proved, in COST, and stops being a claim about " +
  "where to start. " +
  "import is retired on the same test, its rate not exceeding the uniform draw's. It is free " +
  "to carry, so its only cost is a row in the table, and retiring it as an ARM does not touch " +
  "B1-frozen's own clause about starting from the board the fork's first-fit sweep placed: all " +
  "three arms begin from that board and differ only in what they do to it before the first " +
  "climb. " +
  "random cannot be retired by this experiment. It is the control and the null hypothesis, and " +
  "it is kept whatever the result, because every later comparison needs a null to be measured " +
  "against. If no arm meets the mark on any seed, nothing is retired and the comparison says " +
  "so: a run in which every arm scored zero measured the budget, not the arms."

/** One arm's result, by name, refusing an absent one rather than reading a rate off nothing. */
function resultFor(arms: readonly ArmResult[], arm: SeedArm): ArmResult {
  const found = arms.find((candidate) => candidate.arm === arm)
  if (found === undefined) {
    throw new Error(
      `compareSeedArms: no result for the "${arm}" arm, so the retirement rule has no rate to ` +
        `compare. Every member of SEED_ARMS (${SEED_ARMS.join(", ")}) is run; a missing one is ` +
        "not treated as a rate of zero, which is indistinguishable from an arm that ran and lost.",
    )
  }
  return found
}

/**
 * Run every arm against every seed in `input.rules.seeds` - the reviewed list,
 * so no second seed list exists - and report the rate, the two statistics beside
 * it and `RETIREMENT`'s verdict.
 */
export function compareSeedArms(
  input: ComparisonInput,
  runner: ArmRunner,
  spawn: SpawnVeroroute,
): ArmComparison {
  const mark = input.mark
  if (mark === null) {
    throw new Error(
      "compareSeedArms: the mark is null, and it is NOT DEFAULTED. An agent may never author " +
        "the acceptance criteria for the artifact it is producing, and a quality bar chosen " +
        "here would be exactly that. The frozen fixture's mark is B1-frozen's own clause and is " +
        "exported as FROZEN_MARK; any other board's mark is a parameter the caller supplies " +
        "from a document, with QualityMark.source naming it. Writing null is how a caller says " +
        "it knows it has not supplied one - which is why this refuses instead of choosing.",
    )
  }
  const objective = markObjective(mark, input.rules)
  const arms: ArmResult[] = SEED_ARMS.map((arm) => {
    const perSeed: SeedRun[] = input.rules.seeds.map((seed) => {
      // ONLY THE START'S REFUSAL IS CAUGHT HERE, AND THE RUNNER'S IS NOT. A
      // seedCandidate that refuses is a fact about that arm on that seed, which
      // is the thing being measured; a runner that throws is the harness losing
      // its footing, and a scored zero for it would be indistinguishable from an
      // arm that ran and lost.
      let start: string
      try {
        start = seedCandidate(
          {
            importedBoard: input.importedBoard,
            targets: input.targets,
            runDir: input.runDir,
            rules: input.rules,
            arm,
            seed,
          },
          spawn,
        )
      } catch (error) {
        return {
          seed,
          run: null,
          metMark: false,
          evaluationsToCross: undefined,
          refusal: error instanceof Error ? error.message : String(error),
        }
      }
      const run = runner(start, seed, spawn)
      return {
        seed,
        run,
        metMark: meetsMark(run, mark),
        evaluationsToCross: evaluationsToCross(run, objective),
        refusal: null,
      }
    })
    return {
      arm,
      perSeed,
      reached: perSeed.filter((entry) => entry.metMark).length,
      refused: perSeed.filter((entry) => entry.refusal !== null).length,
    }
  })

  const total = input.rules.seeds.length
  const rate = (arm: SeedArm): number => resultFor(arms, arm).reached / total
  const anyReached = arms.some((result) => result.reached > 0)
  const control = rate("random")

  // A STRICT `>` IS THE RULE AND A TIE RETIRES: a construction that ties a
  // uniform draw is carrying a belief that buys nothing. `>=` here is the
  // mutation under which such a construction would survive its own experiment.
  const retireable: SeedArm[] = []
  if (anyReached) {
    if (!(rate("constructed") > control)) retireable.push("constructed")
    if (!(rate("import") > control)) retireable.push("import")
  }

  // "separated" says the run DISTINGUISHED the arms. A run in which every arm
  // scored zero measured the budget rather than the arms, so it is not separated
  // however many arms it ran.
  const separated = anyReached && new Set(arms.map((result) => result.reached)).size > 1

  return { mark, decisionVariable: "success-rate", arms, separated, retireable }
}
