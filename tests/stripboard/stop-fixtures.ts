/**
 * What `tests/stripboard/stop.test.ts` is checked against: one board's targets,
 * a `StopState` factory, an `Evaluation` factory, and the two committed dumps
 * `signatureOf` is driven over.
 *
 * ITS OWN MODULE following `./rank-fixtures.ts` and `./score-fixtures.ts`: a
 * hand-built fixture several assertions share is one thing to keep correct
 * rather than several copies that could drift.
 *
 * `evaluation()` BUILDS AN `Evaluation` THAT STATES NOTHING FALSE AND PROVES
 * NOTHING EITHER - every count defaults to zero and a test overrides only the
 * ones it is about. **It never calls `objectiveOf`**, so a test using it is a
 * test of a stopping rule against a hand-built number rather than against the
 * scorer's own arithmetic: `objective` defaults to `cuts`, which is `F` exactly
 * when `W` and `B` are zero, and a fixture with either non-zero states its own.
 *
 * WHERE THE NUMBERS COME FROM, which is two places and not one. The worked
 * case's are CRITERIA section 5's - `P - N = 10` and `F_0 - F_floor = 40` - so
 * the arithmetic under test is the arithmetic in the document. `TARGETS`'s nine
 * nets and twenty-seven pins are the FROZEN low-boost fixture's own recorded
 * figures (CRITERIA section 3), carried so `LOW_BOOST` below is a coherent
 * board rather than an invented one, and thirty-four strips are the owner's
 * stock. **Nothing here is measured by running anything** - every figure is
 * quoted from a document, and no fixture is evidence about an artifact.
 */
import fs from "node:fs"
import path from "node:path"
import { parseBoardDump, type BoardDump } from "../../tools/guide/dump.ts"
import {
  CONSTRAINT_IDS,
  broken,
  holds,
  type ConstraintResult,
} from "../../tools/stripboard/constraints-model.ts"
import type { Evaluation } from "../../tools/stripboard/climb.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import type { Score } from "../../tools/stripboard/score.ts"
import type { StopState } from "../../tools/stripboard/stop.ts"
import type { BoardTargets } from "../../tools/stripboard/targets.ts"
import type { AdmissibilityInput } from "../../tools/stripboard/verdict.ts"

const NETS = ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9"]

/**
 * One board's targets. `cutFloor` is **0**, which is `max(0, N - R)` for nine
 * nets on the owner's thirty-four strips - written as the figure with the
 * derivation beside it rather than as a call to the same `max` the module under
 * test would make.
 *
 * `netGraph`, `ordering` and `orderingBandwidth` are the smallest well-formed
 * values: `tools/stripboard/stop.ts` reads `board`, `netCount`, `strips` and
 * `cutFloor` and nothing else, and these three are carried so the fixture is a
 * whole `BoardTargets` rather than a cast.
 */
export const TARGETS: BoardTargets = {
  board: "stop-fixture",
  netCount: 9,
  pinCount: 27,
  strips: 34,
  cutFloor: 0,
  netGraph: { nets: NETS, edges: [], maxDegree: 0, bandwidthLowerBound: 0 },
  ordering: NETS,
  orderingBandwidth: 0,
}

/** Ten results, all held: `a1` is true of this set and refuses anything shorter. */
export function heldResults(): readonly ConstraintResult[] {
  return CONSTRAINT_IDS.map((id) => holds(id, "fixture: held"))
}

/** Ten results with `HC4` broken, so `a1` is false and there is a failure to sign. */
export function failedResults(): readonly ConstraintResult[] {
  return CONSTRAINT_IDS.map((id) =>
    id === "HC4" ? broken(id, "fixture: a net is incomplete") : holds(id, "fixture: held"),
  )
}

/**
 * Ten results with `HC4` AND `HC6` broken.
 *
 * TWO, so a signature's sortedness is observable: reversing a list with one
 * failure in it changes nothing.
 */
export function twoFailures(): readonly ConstraintResult[] {
  return CONSTRAINT_IDS.map((id) =>
    id === "HC4" || id === "HC6"
      ? broken(id, "fixture: two independent faults")
      : holds(id, "fixture: held"),
  )
}

/**
 * One candidate, measured by hand. `objective` defaults to `cuts`; see above.
 *
 * **`necessaryCuts` DEFAULTS TO `cuts`, WHICH IS WHAT AN UNDISTURBED BOARD
 * MEASURES** - every cut on the owner's hand-laid low-boost and on the
 * import-placed start survives the drop test (`tools/stripboard/
 * cut-necessity.ts`). A fixture that wants the two counts to DISAGREE - which
 * is the case `./report-fixtures.ts` needs for the report's disagreement line -
 * passes both and says why. `objective` still defaults to `cuts` rather than to
 * the charged count, because every fixture here that leaves it unset leaves the
 * two counts equal, and defaulting it to `necessaryCuts` would quietly change
 * what a caller passing a smaller charged count gets.
 */
export function evaluation(
  counts: Partial<Score> = {},
  results: readonly ConstraintResult[] = heldResults(),
): Evaluation {
  const score: Score = {
    cuts: 0,
    necessaryCuts: counts.cuts ?? 0,
    wires: 0,
    solder: 0,
    objective: 0,
    netCount: 0,
    pinCount: 0,
    occupied: 0,
    joins: 0,
    clustering: 0,
    ...counts,
  }
  return {
    candidate: "stop-fixture.vrt",
    score: counts.objective === undefined ? { ...score, objective: score.cuts } : score,
    results,
    ranking: [],
    admissibleA1: results.every((result) => result.held),
    // The stopping rules read the ten results and the counters, never this
    // count, so every fixture here states the one value consistent with the
    // results it was handed: zero where HC1 holds, and one net open where the
    // caller broke it. `./climb-fixtures.ts` is where the acceptance rule's
    // first key is exercised.
    openNets: results.some((result) => result.id === "HC1" && !result.held) ? 1 : 0,
  }
}

/**
 * A healthy mid-run state: two seeds spent of the reviewed five, a round that
 * accepted something, no signature recorded and no climb finished.
 *
 * `acceptedThisRound` IS ONE AND NOT ZERO ON PURPOSE - `Q3` fires on a round
 * that accepted nothing, so a fixture resting at zero would make every test
 * built on it a `Q3` test by accident.
 */
export function freshState(): StopState {
  return {
    climbHistory: [],
    climbEvaluations: [],
    runEvaluations: 0,
    seedsRemaining: 3,
    signatures: [],
    acceptedThisRound: 1,
    // `TARGETS.board` is not low-boost, so `A4` is vacuous and this is not
    // read. The low-boost tests state it; see `LOW_BOOST`.
    frozen: undefined,
  }
}

/**
 * The board `A4`'s clause is about, as `tools/stripboard/verdict.ts` names it.
 *
 * Nine nets and twenty-seven pins are the FROZEN fixture's own figures
 * (CRITERIA section 3), and the floor is `max(0, 9 - 34) = 0` on the owner's
 * stock, as `TARGETS`.
 */
export const LOW_BOOST: BoardTargets = { ...TARGETS, board: "pultec-low-boost" }

/**
 * An `AdmissibilityInput` on which all four conditions hold, for the caller to
 * spoil one field at a time.
 *
 * SHARED BY `./stop.test.ts` AND `./verdict.test.ts` because the two modules
 * were written together - the plan's own resolution of `Q1`/`Q2` needing
 * `admissible` and `bound` needing the fired rule - so one fixture serves the
 * pair rather than two that could drift.
 */
export function admissibilityInput(
  overrides: Partial<AdmissibilityInput> = {},
): AdmissibilityInput {
  return {
    results: heldResults(),
    score: admissibleCandidate().score,
    targets: TARGETS,
    rules: loadRules(),
    initialObjective: 40,
    frozen: undefined,
    binding: undefined,
    ...overrides,
  }
}

/** At the floor: `C = C_floor = 0`, `W = 0`, `J = 0`, `S_occ = min(N, R) = 9`. */
export function atFloorEvaluation(): Evaluation {
  return evaluation({ cuts: 0, wires: 0, solder: 0, joins: 0, occupied: 9 })
}

/** Above the floor and admissible by `A1`: `F = 5`. */
export function candidate(): Evaluation {
  return evaluation({ cuts: 5, wires: 0, solder: 0, joins: 5, occupied: 9 })
}

/** Admissible by `A1` at `F = 1`, one cut above a floor of zero. */
export function admissibleCandidate(): Evaluation {
  return evaluation({ cuts: 1, wires: 0, solder: 0, joins: 0, occupied: 9 })
}

/**
 * A run that started at `F_0 = 40` and reached `F = 1` in its second climb.
 *
 * With `F_floor = 0` that is a gap of `1/40`, which is inside a tolerance of
 * one twentieth and outside a tenth of one - which is what makes this state the
 * carrier for both the `Q2` tests and the `tau`-movement test.
 */
export function withinToleranceState(): StopState {
  return { ...freshState(), climbHistory: [40, 1], climbEvaluations: [100, 100] }
}

/**
 * Three climbs that each won two units of `F` for a thousand evaluations.
 *
 * THE FIGURES ARE CHOSEN TO SIT BETWEEN THE TWO `k`S THE MOVEMENT TEST USES,
 * and the derivation is here so a reader can check it rather than trust it:
 * `r = 2/1000` per climb, `g = 5 - 0` for `candidate()`, so `g/r = 2500`, while
 * `k*e` is `1 x 3000 = 3000` at the committed `k` and `300` at a tenth of it.
 * So `Q4` does not fire at the committed `k` and does at a tenth, and - because
 * `e` is the run's spend and not the last climb's - a `Q4` that measured one
 * climb would see a budget of `1000` and fire at the committed `k`.
 */
export function slowState(): StopState {
  return { ...freshState(), climbHistory: [12, 10, 8], climbEvaluations: [1000, 1000, 1000] }
}

const FIXTURES = path.join(import.meta.dir, "..", "fixtures", "stripboard", "negative")

function dumpFixture(name: string): BoardDump {
  return parseBoardDump(fs.readFileSync(path.join(FIXTURES, name), "utf8"))
}

/** The committed capture carrying a `FLOATING` `C19` - a failure a signature must name. */
export function floatedDump(): BoardDump {
  return dumpFixture("floated-part.dump")
}

/** The same board with every part placed: nothing to sign. */
export function healthyDump(): BoardDump {
  return dumpFixture("healthy.dump")
}

/** A committed capture whose `CUT_STATE` is not `COMPUTED`. */
export function unresolvedDump(): BoardDump {
  return dumpFixture("cuts-unresolved.dump")
}
