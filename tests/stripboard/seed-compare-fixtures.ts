/**
 * The scripted runners and the literal rate tables
 * `tests/stripboard/seed-compare.test.ts` reads.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper, following `./grade-fixtures.ts`
 * and `./rank-fixtures.ts`. The boards and the injected spawn are in
 * `./seed-fixtures.ts`, shared with the arms' own tests.
 *
 * **EVERY RATE IN THAT TEST FILE IS A PROPERTY OF THE HARNESS AND NOT OF A
 * SEARCH.** `scriptedRunner` answers from a literal table, so what is under
 * test is the counting, the rule and the refusals - not whether a climb
 * descends. **A table missing a row throws**, because a runner that answered a
 * missing row with a default would decide the rates.
 *
 * **THE RUNNER IS GIVEN NO ARM, AND THAT IS THE REAL CONTRACT.** `ArmRunner` is
 * `(start, seed, spawn)`, so a scripted table has to recover the arm from the
 * candidate path - which is only possible because `seedCandidate` puts the arm's
 * name in it. None of the three names is a substring of another, so the
 * recovery is unambiguous, and `armOf` refuses rather than picking when it is not.
 */
import path from "node:path"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { SEED_ARMS, type SeedArm } from "../../tools/stripboard/seed.ts"
import {
  FROZEN_MARK,
  type ArmRun,
  type ArmRunner,
  type ComparisonInput,
} from "../../tools/stripboard/seed-compare.ts"
import { CROWDED_BOARD, IMPORTED_BOARD, RUN_DIR, targetsFor } from "./seed-fixtures.ts"

/**
 * A complete `ArmRun` from a partial one, **throwing for a field it cannot
 * derive**, so a test cannot silently assert over an invented history.
 *
 * TWO DERIVATIONS AND THREE FILLS, each stated because an undeclared fill is
 * how a test comes to assert over a number nobody chose:
 *
 * - Given `cuts` and `wires`, `objective` is `cuts + rhoWire * wires` - `F`'s
 *   own weights from the rules file, no new number - and `history` defaults to
 *   the single entry `[objective]`: a one-evaluation run whose only recorded
 *   objective is its final one.
 * - Given `history` and no counts, `objective` is its last entry, `cuts` is
 *   that entry and `wires` is zero - the one decomposition of an objective that
 *   involves no wire bridge. Nothing in the tests that take this branch reads
 *   either figure; they read the history.
 * - `netsComplete`, `startAdmissible` and `admissibleA1` fill with `false`,
 *   which is chosen for one reason: `false` is the value that cannot make
 *   `meetsMark` pass, so a test that forgot to state completeness cannot
 *   accidentally assert a met mark.
 *
 * `evaluations` is passed through UNCHECKED against `history.length`. That
 * disagreement is exactly what `evaluationsToCross` refuses, and a helper that
 * reconciled it here would make that refusal unreachable from a test.
 */
export function armRun(partial: Partial<ArmRun>): ArmRun {
  const rhoWire = loadRules().rhoWire
  const { cuts, wires, history: given } = partial
  const derived =
    cuts !== undefined && wires !== undefined
      ? { objective: cuts + rhoWire * wires, cuts, wires }
      : given !== undefined && given.length > 0
        ? lastOf(given)
        : refuseEmptyPartial()
  if (partial.objective !== undefined && partial.objective !== derived.objective) {
    throw new Error(
      `armRun: the partial names objective ${partial.objective}, but its own counts and history ` +
        `derive ${derived.objective}. It is not overridden: a run whose F disagrees with its ` +
        "own cuts and wires is two claims about one candidate.",
    )
  }
  const history = partial.history ?? [derived.objective]
  return {
    startAdmissible: partial.startAdmissible ?? false,
    objective: derived.objective,
    cuts: derived.cuts,
    wires: derived.wires,
    netsComplete: partial.netsComplete ?? false,
    admissibleA1: partial.admissibleA1 ?? false,
    history,
    evaluations: partial.evaluations ?? history.length,
  }
}

function refuseEmptyPartial(): never {
  throw new Error(
    "armRun: this partial run names neither cuts and wires nor a non-empty history, so there " +
      "is no objective to derive and no history to derive one from. It is not filled with " +
      "zeroes: a run at F = 0 with an empty history is a run that met every mark without " +
      "being evaluated, which is the one fixture this suite must not be able to write.",
  )
}

function lastOf(history: readonly number[]): {
  readonly objective: number
  readonly cuts: number
  readonly wires: number
} {
  const last = history[history.length - 1]
  if (last === undefined) {
    throw new Error("armRun: the history is empty, so it has no final objective.")
  }
  return { objective: last, cuts: last, wires: 0 }
}

/** One arm's row: the seeds on which its run met the mark, and no other field. */
export type ArmScript = Readonly<Record<SeedArm, readonly number[]>>

/**
 * A table that may be missing rows, which is what `scriptedRunner` ACCEPTS.
 *
 * The named tables below are all `ArmScript`, so a row left out of one of them
 * is a compile error. The runner's parameter is wider on purpose: the
 * missing-row refusal has to be reachable from a test, and the only alternative
 * would have been a cast - which this repository does not write.
 */
export type PartialArmScript = Readonly<Partial<Record<SeedArm, readonly number[]>>>

/** A run that meets `FROZEN_MARK` on every clause, and one that misses on `F`. */
function meeting(): Partial<ArmRun> {
  return { cuts: FROZEN_MARK.cuts - 1, wires: 0, netsComplete: true, admissibleA1: true, history: [9, 4] }
}

function missing(): Partial<ArmRun> {
  return { cuts: 9, wires: 0, netsComplete: true, history: [12, 9] }
}

/**
 * Which arm produced this candidate, read off the candidate's BASENAME,
 * refusing an ambiguous one.
 *
 * The basename and not the whole path: the run directory sits under the
 * platform's temp directory, whose own name this fixture does not control, and
 * a directory component that happened to carry an arm's name would make every
 * recovery below ambiguous.
 */
export function armOf(start: string): SeedArm {
  const name = path.basename(start)
  const named = SEED_ARMS.filter((arm) => name.includes(arm))
  const only = named[0]
  if (named.length !== 1 || only === undefined) {
    throw new Error(
      `armOf: ${name} names ${named.length} of the three arms (${named.join(", ") || "none"}), ` +
        "so which arm produced it cannot be read off the path. ArmRunner is given no arm, so " +
        "this is the only route; it refuses rather than picking the first match.",
    )
  }
  return only
}

/** A runner answering from a literal table, throwing on a row the table does not cover. */
export function scriptedRunner(script: PartialArmScript): ArmRunner {
  return (start, seed) => {
    const arm = armOf(start)
    const met = script[arm]
    if (met === undefined) {
      throw new Error(
        `scriptedRunner: the table has no row for the "${arm}" arm. A runner that answered a ` +
          "missing row with a default would decide the rates this comparison is measuring.",
      )
    }
    const seeds = loadRules().seeds
    if (!seeds.includes(seed)) {
      throw new Error(
        `scriptedRunner: the table covers the reviewed seed set ${seeds.join(", ")} and was ` +
          `asked for seed ${seed}, which is not in it. It is not answered: a seed outside the ` +
          "reviewed list is a restart nothing reproduces.",
      )
    }
    return armRun(met.includes(seed) ? meeting() : missing())
  }
}

/** The same runner, recording the arm, the seed and the start it was handed. */
export function recordingRunner(
  calls: { arm: SeedArm; seed: number; start: string }[],
  script: ArmScript,
): ArmRunner {
  const inner = scriptedRunner(script)
  return (start, seed, spawn) => {
    calls.push({ arm: armOf(start), seed, start })
    return inner(start, seed, spawn)
  }
}

/**
 * The tables, each named for what it encodes. The reviewed seed set is five
 * seeds, so a rate is `n/5` and every figure below is read straight off the row.
 *
 * These tables used to have every constructed row confined to `[3]`, because
 * while the constructed arm emitted a fixed gesture order it produced a start on
 * only that one of the five reviewed seeds. That was a defect, not a ceiling, and
 * the rows are back to the rates that exercise the arithmetic with room to spare.
 */

/** Rates 2/5, 1/5, 1/5: a generic table for the tests that do not read a rate. */
export const SCRIPT: ArmScript = { constructed: [0, 1], import: [2], random: [3] }

/** Rates 1/5, 0/5, 4/5 - the control wins outright, so the other two are retireable. */
export const RANDOM_WINS: ArmScript = { constructed: [0], import: [], random: [0, 1, 2, 3] }

/** Rates 3/5, 1/5, 3/5 - constructed TIES the control, which retires it. */
export const CONSTRUCTED_TIES_RANDOM: ArmScript = {
  constructed: [0, 1, 2],
  import: [0],
  random: [0, 1, 2],
}

/** Rates 4/5, 3/5, 2/5 - both beat the control, so nothing is retireable. */
export const CONSTRUCTED_WINS: ArmScript = {
  constructed: [0, 1, 2, 3],
  import: [0, 1, 2],
  random: [0, 1],
}

/** Rates 0/5 all round: the run measured the budget, not the arms. */
export const NOBODY_REACHES: ArmScript = { constructed: [], import: [], random: [] }

/** Only one seed of one arm meets, so `reached` is exactly 1 there and 0 elsewhere. */
export const ONE_CONSTRUCTED_SEED_MEETS: ArmScript = {
  constructed: [0],
  import: [],
  random: [],
}

/**
 * Rates 1/5 all round, and every start that happened inadmissible - which is
 * what all three arms produce: `--check` reports 19, 13, 7 and 6 incomplete nets
 * on the four import-placed layouts, and neither the construction nor the draw
 * routes a net. The inadmissible start is `armRun`'s own fill (`false` for every
 * admissibility field it is not given), so this table does not have to say it;
 * the table is distinct from `NOBODY_REACHES` on purpose, so the test that reads
 * `startAdmissible` is not also reading a run where nothing happened.
 */
export const EVERY_START_INVALID: ArmScript = { constructed: [0], import: [1], random: [2] }

/**
 * A comparison over the CROWDED board, on which two of the three arms refuse
 * every seed and the import arm refuses none - the input the refusal-record test
 * needs.
 *
 * Both refusals are real and they are different in kind, which is the point: the
 * constructed arm cannot JOIN this two-part board's node pin sets to low-boost's
 * fourteen nets, and the random arm has no admissible position for `R1`. The
 * import arm neither reads a net name nor enumerates a position, so it starts.
 * Nothing is stubbed to refuse.
 */
export function refusingComparisonInput(): ComparisonInput {
  return {
    importedBoard: CROWDED_BOARD,
    targets: targetsFor("low-boost"),
    runDir: RUN_DIR,
    rules: loadRules(),
    mark: FROZEN_MARK,
  }
}

/** The comparison's input: the low-boost board, the reviewed rules, the frozen mark. */
export function comparisonInput(): ComparisonInput {
  return {
    importedBoard: IMPORTED_BOARD,
    targets: targetsFor("low-boost"),
    runDir: RUN_DIR,
    rules: loadRules(),
    mark: FROZEN_MARK,
  }
}
