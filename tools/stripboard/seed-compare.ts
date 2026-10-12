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
import {
  SEED_ARMS,
  seedCandidate,
  type SeedArm,
  type SeedStart,
  type SpawnVeroroute,
} from "./seed.ts"
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
export type ArmRunner = (start: SeedStart, seed: number, spawn: SpawnVeroroute) => ArmRun

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
 *
 * **A START COUNT IS NOT A RATE, AND THIS RULE MAY NOT BE READ AGAINST ONE.**
 * The sentence is here, beside the rule, because this is what a Task 18
 * implementer reaching for the retirement rule actually reads. How many of the
 * seed set's seeds produced a candidate AT ALL is a fact about whether an arm can
 * start; the rate below is counted from runs an `ArmRunner` returned, each having
 * evaluated at least one candidate (`requireMeasured` refuses a run that
 * evaluated none). All three arms produce a start on all five reviewed
 * seeds of the import-placed low-boost board, and **measured runs have now
 * happened**: Task 17 climbed from each arm on seed 0 of that board and recorded
 * the results in `docs/stripboard/pipeline-verification.md` §5.9. **Those
 * figures are NOT a rate and this rule may not be applied to them**: they are
 * ONE seed on ONE board with `compareSeedArms` never run and the mark never
 * evaluated, and the paragraph above is the reason - a success rate is counted
 * over the seed set against the mark, and a final `F` per seed is this rule's
 * tiebreak only for a run where no arm reaches the mark.
 *
 * **A RATE NOW EXISTS, AND IT IS ZERO ON ALL THREE ARMS.** Task 18's final step
 * ran this harness over the reviewed seed set against `FROZEN_MARK` on the
 * import-placed low-boost board: 15 runs, 294k fork invocations, `reached` 0 of
 * 5 everywhere, `separated` false and `retireable` empty - which is this rule's
 * own last clause firing, *"a run in which every arm scored zero measured the
 * budget, not the arms"*. `docs/stripboard/pipeline-verification.md` §6.3 has
 * the per-seed table and what that rate is a rate over. The TIEBREAK this rule
 * names for that case - final `F` per seed - went to the control arm on four of
 * the five seeds, and it retired nothing.
 *
 * **AND THAT TIEBREAK INVERTED WHEN THE MOVE SET WAS COMPLETED.** §6.3's run was
 * measured before `E1`'s GATHER existed - the move §7.4's own justification
 * describes, which the one-delta cluster cannot perform - so it was a rate about
 * a search missing its main move. §6.7 is the same comparison re-run with the
 * gather in: **the rate is zero on every arm again**, and the tiebreak goes to
 * `constructed` on four seeds with a tie on the fifth, mean final `F` 10.8
 * against the control's 12.8. Both runs stand; neither retires anything, because
 * the decision variable is the RATE and it has never separated the arms. What
 * changed is which way the evidence points if it ever does - and a reader
 * reaching for this rule should know that the pre-gather reading was reversed by
 * implementing a move the plan always specified.
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

/**
 * A run that measured something, or a refusal.
 *
 * **A RUN WITH NO EVALUATIONS HAS NOT MEASURED THE START IT WAS HANDED, AND
 * MUST NOT BE SCORED.** This was a comment and a comment is not a guard: a
 * runner returning `evaluations: 0` with an empty `history` was accepted, scored
 * every arm 5 of 5, and produced `retireable: ["constructed", "import"]` - a
 * retirement recommendation out of a run that evaluated nothing. That is exactly
 * the failure the standing ruling exists to prevent, so it is a refusal now.
 *
 * WHAT IS MISSING: at least one evaluation. `F` is a property of a CANDIDATE, so
 * a run that scored no candidate has no final `F`, no history to cross and
 * nothing a success rate can be counted from - `meetsMark` would be reading
 * counts that came from no measurement, and `RETIREMENT`'s recommendation would
 * rest on them.
 *
 * WHERE TO FIX IT: in the `ArmRunner` this comparison was given. Task 17's
 * `climb` evaluates at least the start it is handed, and Task 18's restart loop
 * runs at least one climb, so a runner reporting zero has either not been wired
 * up or has failed silently - and a silent failure is what this refuses to turn
 * into a number.
 *
 * WHY IT IS NOT DEFAULTED: there is no figure to default to. Treating it as a
 * run that missed the mark counts a harness fault against the arm, which is
 * indistinguishable from an arm that ran and lost; treating it as a run that met
 * the mark is worse. It is the same reason a runner that THROWS is fatal here:
 * nothing was learned about the start, so nothing may be recorded about it.
 */
function requireMeasured(run: ArmRun, arm: SeedArm, seed: number): ArmRun {
  if (!Number.isInteger(run.evaluations) || run.evaluations < 1) {
    throw new Error(
      `compareSeedArms: the runner reported ${run.evaluations} evaluations for the "${arm}" arm ` +
        `at seed ${seed}, so that run did not score a single candidate and has not measured the ` +
        "start it was handed. It is NOT counted as a seed that missed the mark and NOT counted " +
        "as one that met it: F is a property of a candidate, a run that scored none has no F, " +
        "and a success rate counted from it would be a number that came from no measurement - " +
        "which is how a retirement recommendation comes out of a run that evaluated nothing. " +
        "Fix the ArmRunner: Task 17's climb evaluates at least the start it is handed and Task " +
        "18's restart loop runs at least one climb, so zero means the runner is not wired up or " +
        "failed silently. There is nothing to default to.",
    )
  }
  return run
}

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
      // ONLY THE START'S REFUSAL IS CAUGHT HERE, AND THE RUNNER'S IS NOT.
      // Deliberate, both halves, and the module comment above says why at
      // length: a refused START is a measured property of that arm on that seed
      // and the thing this comparison exists to see; a runner that throws is the
      // harness losing its footing, and scoring it would put a harness fault
      // into a rate where nothing could tell it from an arm that ran and lost.
      // Note the `try` wraps the start and NOT the `runner(...)` call below.
      let start: SeedStart
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
      const run = requireMeasured(runner(start, seed, spawn), arm, seed)
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
