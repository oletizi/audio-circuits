/**
 * THE SEARCH LOOP: climb from each start with the compound move set, accept only
 * what is strictly cheaper and sound, and stop on `Q1`-`Q6`.
 *
 * **THREE THINGS ARE FIXED AND ONE IS SWAPPABLE**, which is the plan's own
 * instruction: *"Implement the loop so that the acceptance rule, the compound
 * move set and the stopping rules are the fixed parts, and the strategy is
 * swappable."*
 *
 *   - **FIXED: the acceptance rule.** A proposal is accepted when it is
 *     STRICTLY cheaper than the incumbent under the owner's weights AND
 *     `violationsOf` finds nothing wrong with it. No plateau move, no worse
 *     move: `worseAcceptance` is `null` in `stripboard/rules.json` and PIPELINE
 *     `E3` therefore **does not run**, which is recorded in that file as a
 *     value rather than an omission. The rule is implemented once, in
 *     `acceptanceFor` below, and a strategy sees it only through the
 *     `Acceptance` window `./search-strategy.ts` declares - so a strategy has
 *     nowhere to price a board differently.
 *   - **FIXED: the move set.** `movesFrom` in `./moves.ts`, which proposes every
 *     physically possible rigid translation of every part with that part's nets
 *     re-joined. A strategy chooses among those proposals; it does not generate
 *     any.
 *   - **FIXED: the stopping rules.** `./search-stop.ts`, which is CRITERIA
 *     section 5 retained unchanged.
 *   - **SWAPPABLE: the strategy**, which is *which proposals a round looks at,
 *     in what order, and when it commits*. It lives in
 *     `./search-strategy.ts` - split off at the line ceiling - and two are
 *     supplied there, both measured in
 *     `docs/stripboard/pipeline-verification.md` section 14. **Neither is
 *     called the default**: naming a winner before measuring is the failure
 *     this project's record documents five times.
 *
 * **THE CORE MAY NOT IMPORT FROM `tools/`**, so three things arrive as
 * parameters that a reader might expect this module to fetch: the owner's
 * weights (`./score.ts` states the reason), the stopping thresholds and the cut
 * floor (`./search-stop.ts` states theirs), and the admissibility predicate
 * `Q1` and `Q2` require. Each is a decision somebody reviewed, and a figure
 * reached for here would be *"an agent authoring the acceptance criteria for the
 * artifact it is producing."*
 *
 * **WHAT A ROUND COSTS, MEASURED RATHER THAN ESTIMATED.** On a real seed of
 * `transistor-preamp-feedback` `movesFrom` returns 8,500-9,100 proposals and
 * takes 560-630 ms. Scoring one needs `derivedCuts`; proving one sound needs
 * `violationsOf`, which is the expensive one. So `Acceptance.consider` scores
 * EVERY proposal and runs `violationsOf` only on the ones already known to be
 * strictly cheaper - 73 of 8,900 on the seed the owner approved - which brings a
 * descent to about 2 seconds per board. **That ordering is an implementation of
 * the acceptance rule and not a relaxation of it**: a proposal that is not
 * cheaper is rejected whatever its soundness, so its soundness is never asked.
 *
 * **AN UNSOUND START IS REFUSED RATHER THAN CLIMBED FROM**, which is
 * `./seed.ts`'s rule arriving at the other end: *"a search handed an unsound
 * seed reports the fault as a defect in whichever move it was holding at the
 * time."* Task 8's importer turns a hand layout into a `Candidate`, so the
 * owner's own boards are a legitimate start - his words, *"even a human starting
 * point"* - and they are held to the same condition as a constructed seed.
 *
 * **NOTHING HERE RANKS A START.** The list is climbed in the order given and the
 * best candidate across every climb is returned with the name of the start it
 * came from, so a run's report can separate the search's contribution from the
 * seed's. Which starts to hand in is the caller's decision, exactly as
 * `seedsFrom`'s orderings are.
 */
import type { Candidate, PinPatterns } from "./board.ts"
import { derivedCuts, type ReferenceNets } from "./cuts.ts"
import { describeViolations, violationsOf } from "./invariants.ts"
import { movesFrom } from "./moves.ts"
import { objectiveOf, type ObjectiveWeights } from "./score.ts"
import {
  UNTESTED_IN_CORE,
  evaluateStop,
  type Admissible,
  type RunCounters,
  type Scored,
  type StoppingParameters,
  type StoppingRule,
  type UntestedRule,
} from "./search-stop.ts"
import type { LeadSpan } from "../kicad/lead-span-model.ts"

import type { Acceptance, Strategy } from "./search-strategy.ts"

export type { Scored, StoppingParameters, StoppingRule, UntestedRule } from "./search-stop.ts"
export {
  FIRST_IMPROVEMENT,
  STEEPEST_DESCENT,
  type Acceptance,
  type Admission,
  type Strategy,
} from "./search-strategy.ts"

type SearchRefusal =
  | "no-starts"
  | "unsound-start"
  | "cap-unusable"
  | "no-proposals"
  | "stopped-for-no-reason"

function body(refusal: SearchRefusal): string {
  switch (refusal) {
    case "no-starts":
      return (
        "A start is a board to climb from - a constructed seed from seedsFrom, or a hand layout " +
        "through tools/stripboard/vero-import.ts. Nothing is substituted: a default start here " +
        "would be this module deciding which board the search begins on, and an empty result " +
        "reads exactly like a circuit nothing could be built for."
      )
    case "unsound-start":
      return (
        "A start must already realise the netlist. Nothing is repaired: a search handed an " +
        "unsound board reports the fault as a defect in whichever move it was holding at the " +
        "time, and every figure the run then prints is against a board that is not the circuit. " +
        "seedsFrom in lib/stripboard/seed.ts refuses an unsound seed for the same reason; if " +
        "this board came from an import, the reference netlist and the layout disagree and that " +
        "is the finding."
      )
    case "cap-unusable":
      return (
        "Q5's evaluation cap is the run-level backstop against a bug looping forever, and a run " +
        "that may evaluate nothing is not a run - it would stop on Q5 before scoring one " +
        "proposal and report a board the search never looked at. It is not raised to a workable " +
        "figure here: the cap is a PAR3 parameter from stripboard/rules.json, and the budget " +
        "this architecture wants is a declared unknown that Task 11 of the model-and-search " +
        "plan measures. Hand in a positive, finite integer."
      )
    case "no-proposals":
      return (
        "movesFrom returned no proposal for this board, so the round examined nothing. It is " +
        "refused rather than counted as a round that accepted nothing, because the two are " +
        "different facts and only the second is evidence: an empty proposal list reads exactly " +
        "like a local optimum to a Q3 stop, which would report a search exhausted that never " +
        "ran. The usual cause is a board with no room to move a part into - too few columns for " +
        "a join, or every hole claimed."
      )
    case "stopped-for-no-reason":
      return (
        "The loop left its start list with no stopping rule having fired, so the run has no " +
        "stated reason for being over. Q3 should fire when a round accepts nothing and no start " +
        "remains; reaching here means that rule or this loop's counters are wrong. It is " +
        "refused rather than reported as a result, because a stop IS the weakest claim a run " +
        "makes and a run with none is making a claim nobody can read."
      )
  }
}

function refuse(refusal: SearchRefusal, offending: string): never {
  throw new Error(`stripboard-search-${refusal}: ${offending}.\n${body(refusal)}`)
}

/** One board to climb from, with the name a report calls it by. */
export interface Start {
  /** How a report names this start - an ordering's name, or the imported board's. */
  readonly name: string
  readonly candidate: Candidate
}

/** Everything the loop needs that it may not reach for itself. */
export interface SearchSetup {
  /** The circuit's own account of what is connected to what. */
  readonly reference: ReferenceNets
  /** The recorded lead reach, keyed by footprint, as `LEAD_SPANS` has it. */
  readonly spans: ReadonlyMap<string, LeadSpan>
  /** The recorded pin patterns, read for how far a part's body reaches. */
  readonly patterns: PinPatterns
  /** The owner's `rho_w` and `rho_s`, from `stripboard/rules.json`. */
  readonly weights: ObjectiveWeights
  /** `Q1`-`Q5`'s thresholds and this board's cut floor. */
  readonly stopping: StoppingParameters
  /** `A1`-`A4` for the candidate `Q1` or `Q2` is about. See `./search-stop.ts`. */
  readonly admissible: Admissible
  /** Which proposals a round looks at and when it commits. */
  readonly strategy: Strategy
}

/** One climb, from one start, as a report reads it. */
export interface ClimbRecord {
  readonly start: string
  /** The start's own `F`, before any move - the figure the search's gain is measured from. */
  readonly initialObjective: number
  readonly bestObjective: number
  /** How many moves this climb accepted. */
  readonly accepted: number
  readonly rounds: number
  readonly evaluations: number
  /** Proposals `movesFrom` returned, summed over the climb's rounds. */
  readonly proposals: number
  /** Proposals strictly cheaper than the incumbent that `violationsOf` rejected. */
  readonly cheaperButUnsound: number
  /** `F` after each accepted move, starting with the start's own. */
  readonly trace: readonly number[]
}

export interface SearchResult {
  readonly strategy: string
  /** The cheapest sound board any climb reached, with its cuts derived once. */
  readonly best: Scored
  /** Which start it came from, so the search's gain is separable from the seed's. */
  readonly bestStart: string
  readonly stoppedOn: StoppingRule
  /** The stopping rules this run did not test, each with its reason. Never hidden. */
  readonly untested: readonly UntestedRule[]
  readonly climbs: readonly ClimbRecord[]
  readonly evaluations: number
  /**
   * The counters `stoppedOn` was DECIDED on, not a summary assembled afterwards.
   *
   * So a reader can check the rule against its own condition - `Q3` against
   * `acceptedThisRound === 0 && startsRemaining === 0`, `Q5` against
   * `runEvaluations`. A set rebuilt at the end would carry zeros for the first
   * two whichever rule fired, and a check against them could not fail.
   */
  readonly counters: RunCounters
}

/** One candidate priced, with its cuts derived once for both the score and the checks. */
function scoredOf(candidate: Candidate, setup: SearchSetup): Scored {
  const cuts = derivedCuts(candidate, setup.reference)
  return { candidate, cuts, objective: objectiveOf(candidate, cuts, setup.weights) }
}

/** The mutable half of one round: the counter and the two diagnostics. */
interface RoundTally {
  evaluations: number
  cheaperButUnsound: number
  /** Set when the cap stopped `consider` mid-round, so the sweep was partial. */
  truncated: boolean
}

function acceptanceFor(
  incumbent: number,
  setup: SearchSetup,
  tally: RoundTally,
  spentBefore: number,
): Acceptance {
  return {
    incumbent,
    consider(proposal) {
      if (spentBefore + tally.evaluations >= setup.stopping.evaluationCap) {
        tally.truncated = true
        return { kind: "budget-spent" }
      }
      tally.evaluations += 1
      const cuts = derivedCuts(proposal, setup.reference)
      const objective = objectiveOf(proposal, cuts, setup.weights)
      // STRICTLY cheaper, tested BEFORE soundness - the measured ordering this
      // module's comment explains, and not a relaxation: a proposal that is not
      // cheaper is rejected whatever its soundness.
      if (objective >= incumbent) return { kind: "not-cheaper", objective }
      if (violationsOf(proposal, cuts, setup.reference).length > 0) {
        tally.cheaperButUnsound += 1
        return { kind: "unsound", objective }
      }
      return { kind: "accept", objective }
    },
  }
}

/** The counters as they stand, built in one place so the two arrays cannot drift. */
interface RunState {
  readonly climbHistory: number[]
  readonly climbEvaluations: number[]
  runEvaluations: number
}

function countersOf(
  state: RunState,
  startsRemaining: number,
  acceptedThisRound: number | undefined,
): RunCounters {
  return {
    climbHistory: [...state.climbHistory],
    climbEvaluations: [...state.climbEvaluations],
    runEvaluations: state.runEvaluations,
    startsRemaining,
    acceptedThisRound,
  }
}

/** One start proven sound before anything is climbed from it. */
function admittedStart(start: Start, setup: SearchSetup): Scored {
  const scored = scoredOf(start.candidate, setup)
  const violations = violationsOf(start.candidate, scored.cuts, setup.reference)
  if (violations.length === 0) return scored
  refuse(
    "unsound-start",
    `the start "${start.name}" does not realise the netlist:\n` +
      describeViolations(violations)
        .map((line) => `  ${line}`)
        .join("\n"),
  )
}

/**
 * One climb from one start, round by round, until a rule fires or a round
 * accepts nothing.
 *
 * The stop is evaluated against the RUN's best rather than this climb's, because
 * `Q1`, `Q2` and `Q4` are claims about the run's result, and after each round
 * rather than after each climb, because `Q5` is a backstop that has to be able
 * to fire mid-climb.
 */
function climb(
  start: Start,
  index: number,
  total: number,
  setup: SearchSetup,
  state: RunState,
  best: { value: Scored; start: string },
): {
  readonly record: ClimbRecord
  readonly stoppedOn: StoppingRule | null
  readonly decidedOn: RunCounters
} {
  const initial = admittedStart(start, setup)
  let incumbent = initial
  if (initial.objective < best.value.objective) {
    best.value = initial
    best.start = start.name
  }
  const trace: number[] = [initial.objective]
  let climbEvaluations = 0
  let proposalCount = 0
  let cheaperButUnsound = 0
  let accepted = 0
  let rounds = 0
  const startsRemaining = total - index - 1
  // THE COUNTERS THE STOP WAS DECIDED ON ARE KEPT, not rebuilt afterwards. A
  // result carrying counters assembled at the end would report zeros for
  // `acceptedThisRound` and `startsRemaining` whichever rule fired - and a
  // reader checking "did Q3's condition really hold" would be reading two
  // fields that are zero by construction. That is a predicate that cannot fail,
  // which is the defect this plan has caught three times.
  let decidedOn: RunCounters = countersOf(state, startsRemaining, undefined)
  const stopNow = (acceptedThisRound: number | undefined): StoppingRule | null => {
    decidedOn = countersOf(state, startsRemaining, acceptedThisRound)
    return evaluateStop(
      decidedOn,
      best.value,
      setup.reference,
      setup.stopping,
      setup.admissible,
    )
  }

  // THE STOP IS EVALUATED BEFORE THE FIRST ROUND, with `acceptedThisRound`
  // UNDEFINED. `Q1` is terminal - nothing below the floor exists - so a start
  // that is already at the floor must not spend a round's evaluations proving
  // it, and a run from the owner's own board must be able to stop on the board
  // itself. `undefined` is what keeps `Q3` out of this check: there has been no
  // sweep of the move set, so there is nothing for it to be exhausted by.
  let stoppedOn: StoppingRule | null = stopNow(undefined)

  while (stoppedOn === null) {
    const proposals = movesFrom(incumbent.candidate, setup.reference, setup.spans, setup.patterns)
    if (proposals.length === 0) {
      refuse("no-proposals", `the start "${start.name}" reached a board with no move available`)
    }
    rounds += 1
    proposalCount += proposals.length
    const tally: RoundTally = { evaluations: 0, cheaperButUnsound: 0, truncated: false }
    const chosen = setup.strategy.chooseFrom(
      proposals,
      acceptanceFor(incumbent.objective, setup, tally, state.runEvaluations),
    )
    climbEvaluations += tally.evaluations
    state.runEvaluations += tally.evaluations
    cheaperButUnsound += tally.cheaperButUnsound
    if (chosen !== undefined) {
      incumbent = scoredOf(chosen, setup)
      accepted += 1
      trace.push(incumbent.objective)
      if (incumbent.objective < best.value.objective) {
        best.value = incumbent
        best.start = start.name
      }
    }
    // A round the cap cut short is NOT a full sweep of the move set, so it
    // reports `undefined` rather than nothing-accepted: see `acceptedThisRound`
    // in `./search-stop.ts`, and `Q5` is the rule that then fires.
    const swept = chosen !== undefined ? 1 : tally.truncated ? undefined : 0
    stoppedOn = stopNow(swept)
    if (stoppedOn !== null) break
    if (chosen === undefined) break
  }

  const record: ClimbRecord = {
    start: start.name,
    initialObjective: initial.objective,
    bestObjective: incumbent.objective,
    accepted,
    rounds,
    evaluations: climbEvaluations,
    proposals: proposalCount,
    cheaperButUnsound,
    trace,
  }
  if (stoppedOn === null) {
    // The climb is over and the run is not: record it so Q4 has a step to read.
    state.climbHistory.push(incumbent.objective)
    state.climbEvaluations.push(climbEvaluations)
  }
  return { record, stoppedOn, decidedOn }
}

/**
 * The search: climb every start in the order given, keep the best sound board
 * across all of them, and report which rule stopped the run.
 *
 * `starts` is the boards to climb from - `seedsFrom`'s candidates, an imported
 * hand layout, or both. `setup` carries the circuit, the recorded geometry, the
 * owner's weights, the stopping thresholds, the admissibility predicate and the
 * strategy; every one of them is a parameter, and `./search-stop.ts` and
 * `./score.ts` state why.
 */
export function search(starts: readonly Start[], setup: SearchSetup): SearchResult {
  if (starts.length === 0) {
    // THE SENTENCE DELIBERATELY DOES NOT END ON THE PREPOSITION THAT STATIC
    // IMPORTS USE. `lib/import-closure.ts`'s scanner reads that word followed
    // by a quote, anywhere within 400 characters of a line opening with
    // `import` or `export`, as a module specifier - so a refusal string ending
    // on it inside an exported function reads to the walker as an import of
    // the next few lines of source, and `tests/stripboard/model/no-fork.test.ts`
    // fails by name. The offending spelling is not written out here, for the
    // reason `./board.ts` gives for not writing out its own.
    refuse("no-starts", "search was given no starts, so there is no board for it to climb")
  }
  const cap = setup.stopping.evaluationCap
  if (!Number.isInteger(cap) || cap < 1) {
    refuse("cap-unusable", `the run-level evaluation cap handed in is ${String(cap)}`)
  }
  const first = starts[0]
  if (first === undefined) {
    // Unreachable: the length was just shown to be non-zero. Stated rather than
    // asserted away, because a cast is what this repository forbids.
    refuse("no-starts", "search was given a start list whose first entry is absent")
  }
  const opening = admittedStart(first, setup)
  const state: RunState = {
    climbHistory: [opening.objective],
    climbEvaluations: [0],
    runEvaluations: 0,
  }
  const best = { value: opening, start: first.name }
  const climbs: ClimbRecord[] = []
  let stoppedOn: StoppingRule | null = null
  let decidedOn: RunCounters | undefined
  for (const [index, start] of starts.entries()) {
    const outcome = climb(start, index, starts.length, setup, state, best)
    climbs.push(outcome.record)
    if (outcome.stoppedOn !== null) {
      stoppedOn = outcome.stoppedOn
      decidedOn = outcome.decidedOn
      break
    }
  }
  if (stoppedOn === null || decidedOn === undefined) {
    refuse(
      "stopped-for-no-reason",
      `the run climbed all ${starts.length} start(s) and no rule of Q1-Q6 fired`,
    )
  }
  return {
    strategy: setup.strategy.name,
    best: best.value,
    bestStart: best.start,
    stoppedOn,
    untested: UNTESTED_IN_CORE,
    climbs,
    evaluations: state.runEvaluations,
    counters: decidedOn,
  }
}
