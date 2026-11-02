/**
 * THE TWO BENCHMARK INSTANCES: the owner's own circuits, his own hand-built
 * boards' construction cost, and every starting point the search is given.
 *
 * **IT IS NOT A `.test.ts` FILE**, following `./seed-fixtures.ts` and
 * `./moves-fixtures.ts`: it builds and asserts nothing, so that the gate in
 * `./benchmark.test.ts` is all assertions and this file is all inputs.
 *
 * **THE HAND RESULT IS FIXED DATA AND IS NOT TRANSCRIBED.** `C`, `W` and `B` for
 * each board are COUNTED off its committed dump by `countLines` in
 * `tools/stripboard/score.ts` - the independent, text-level path `V1` exists to
 * be - and priced by that module's own `objectiveOf` from the committed rules
 * file. Nothing in this file writes a figure for either board. That matters more
 * than tidiness: **the gate's threshold may not be adjustable by whoever is
 * trying to pass it**, and a number typed here would be exactly that, however
 * carefully copied.
 *
 * **THE CUT FLOOR AND THE NET ORDERING COME FROM `tools/stripboard/targets.ts`
 * FOR THE SAME REASON.** `C_floor = max(0, N - R)` is `P0`'s derivation and that
 * module is its one owner; a second spelling in a test is a second place for a
 * board's floor to come out differently. The `rcm` ordering below is that
 * module's reverse-Cuthill-McKee arrangement of the net graph - **the
 * repository's own, not a rule invented here.**
 *
 * **WHY `rcm` IS IN THE START LIST AT ALL, stated plainly because it looks like
 * a choice made to suit a number and is not.** When `rcm s2` was added, EVERY
 * ordering `./seed-fixtures.ts`'s `derivedOrderings` yields refused on
 * `transistor-preamp-buffered`, so without a sixth ordering that board had no
 * constructed start at all and the instance could not be run. `rcm s2` was taken
 * because it is the ordering this repository already derives for exactly this
 * purpose, and it was taken for BOTH boards rather than for the one that needed
 * it. Every ordering that refuses is still listed below and its refusal is
 * reported, which is the only way the reader can tell a start that was
 * unavailable from one nobody tried.
 *
 * **THAT MEASUREMENT HAS MOVED, AND THE OLD READING IS KEPT HERE RATHER THAN
 * OVERWRITTEN**, because it is the whole justification for a sixth ordering. It
 * read: *"All fifteen of `./seed-fixtures.ts`'s `derivedOrderings` - five rules
 * at strides 1, 2 and 3 - REFUSE on `transistor-preamp-buffered`: at stride 3
 * the thirteenth net lands on strip 36 against 34 strips, at stride 2
 * `RV3`/`RV4`'s moulded field cannot be seated, and at stride 1 `J1`'s two leads
 * cannot reach."* The 2026-10-15 relaxation that let a strip carry two nets
 * (`lib/stripboard/seed-place.ts`) falsified two of those three clauses.
 *
 * **RE-MEASURED 2026-10-15 BY RUNNING `seedsFrom` OVER EVERY ONE OF THEM, at
 * both commits, and counted over DISTINCT net sequences**: the fifteen are
 * twelve, because `alphabetical sN` is the same sequence as `reference-order sN`
 * at each stride - a fact about these two exports' net order, which is already
 * sorted, and not about the rules. On `transistor-preamp-buffered`, 0 of those 12
 * built before the relaxation and **6 build after it** - all four stride-2
 * orderings (cut counts 1, 1, 2 and 1) and two of the four at stride 1 (4 and 3).
 * **Only the stride-3 clause survives**: those four still refuse under
 * `ordering-off-board`, which is the stock being too narrow for that stride and
 * is untouched by the relaxation. The two stride-1 orderings that still refuse do
 * so under `no-column-to-join` on `GND` rather than for `J1`'s reach.
 *
 * **`rcm s2` STAYS, AND NOT BECAUSE THE JUSTIFICATION STILL HOLDS AS WRITTEN.**
 * It stays because the gate's start list is fixed data and is not re-chosen by
 * whoever is trying to pass it: swapping the starts for whichever orderings a
 * later change made feasible would move the threshold's own inputs. It also
 * remains the only one of this file's three orderings that `buffered` can build
 * at all - `part-walk s3` and `rcm s3` both run off the stock - so removing it
 * would still leave that instance unrunnable.
 *
 * **THE IMPORTED HAND BOARD IS A STARTING POINT AND NOT ONLY A BENCHMARK** - the
 * owner's words, *"even a human starting point"*. `transistor-preamp-feedback`
 * imports; `transistor-preamp-buffered` does NOT, and the refusal is reported
 * rather than worked around. See `unavailableStarts`.
 */
import { LEAD_SPANS } from "../../../lib/kicad/lead-span.ts"
import { PIN_PATTERNS } from "../../../lib/kicad/pin-pattern.ts"
import type { Candidate } from "../../../lib/stripboard/board.ts"
import { derivedCuts, type ReferenceNets } from "../../../lib/stripboard/cuts.ts"
import { violationsOf } from "../../../lib/stripboard/invariants.ts"
import { partAreasOf } from "../../../lib/stripboard/moves.ts"
import { objectiveOf } from "../../../lib/stripboard/score.ts"
import { seedsFrom } from "../../../lib/stripboard/seed.ts"
import type { Ordering } from "../../../lib/stripboard/seed-homes.ts"
import type { SeedNetlist } from "../../../lib/stripboard/seed-model.ts"
import {
  search,
  type SearchResult,
  type SearchSetup,
  type Start,
  type Strategy,
} from "../../../lib/stripboard/search.ts"
import {
  EXEMPTABLE_RULES,
  loadExemptions,
  noticesOf,
  verdictFor,
  type ExemptionVerdict,
} from "../../../tools/stripboard/exemptions.ts"
import { loadRules, type StripboardRules } from "../../../tools/stripboard/rules.ts"
import {
  countLines,
  objectiveOf as objectiveFromLineCounts,
} from "../../../tools/stripboard/score.ts"
import { targetsFromReference } from "../../../tools/stripboard/targets-export.ts"
import type { BoardTargets } from "../../../tools/stripboard/targets.ts"
import { candidateFromDump } from "../../../tools/stripboard/vero-import.ts"
import {
  COMMITTED_BOARDS,
  dumpTextOf,
  footprintsOf,
  referenceOf,
  type CommittedBoard,
} from "../vero-import-fixtures.ts"
import { rigidOverlapPlaces, routedUnderRigidPlaces } from "./area-places.ts"
import { committedNetlist, derivedOrderings } from "./seed-fixtures.ts"

/** The owner's reviewed parameters, read from `stripboard/rules.json` as committed. */
export const RULES: StripboardRules = loadRules()

/**
 * The two boards the plan names, by the name
 * `tests/stripboard/vero-import-fixtures.ts` files them under.
 *
 * `feedback` and `buffered` in the plan's table are these two. No third board
 * is admitted: *"the gate's threshold is fixed data ... and is not adjustable by
 * whoever is trying to pass it"*, and choosing a friendlier instance is the same
 * adjustment made at the other end.
 */
export const BENCHMARK_BOARDS: readonly string[] = [
  "transistor-preamp-feedback",
  "transistor-preamp-buffered",
]

/** One hand-built board's construction cost, counted off its own committed dump. */
export interface HandResult {
  readonly cuts: number
  readonly wires: number
  readonly solder: number
  readonly objective: number
}

/** A start that could not be built, and the first line of the refusal that said so. */
export interface UnavailableStart {
  readonly name: string
  readonly refusal: string
}

export interface BenchmarkInstance {
  readonly name: string
  readonly nets: ReferenceNets
  readonly netlist: SeedNetlist
  /** `P0`'s targets: `N`, `P`, `C_floor` and the `rcm` ordering. */
  readonly targets: BoardTargets
  readonly hand: HandResult
  /**
   * The constructed seeds, in the order one run climbs them - the restart
   * schedule of the seeded run.
   */
  readonly seedStarts: readonly Start[]
  /**
   * The owner's own layout as a `Candidate`, or `undefined` when it will not
   * import.
   *
   * **IT IS A SEPARATE RUN AND NOT THE TAIL OF THE SEED LIST, and the reason is
   * measured rather than aesthetic.** With it appended to the seeds, `Q4` fired
   * at the third climb's boundary on `transistor-preamp-feedback` and the
   * imported board was never climbed at all - a start silently unspent, which
   * is precisely the shape of skipped check this project refuses. Run on its
   * own it also keeps the two starting points' contributions separable, which
   * the plan's Step 1 asks for.
   */
  readonly importedStart: Start | undefined
  /** Every start that was attempted and refused. Reported, never hidden. */
  readonly unavailableStarts: readonly UnavailableStart[]
  /**
   * What the two hard area rules find on the IMPORTED start, answered against
   * `stripboard/exemptions.json` - empty when there is no imported start.
   *
   * **A HAND BOARD ENTERS THE SEARCH CARRYING WHAT IT CARRIES, AND THE RUN SAYS
   * SO.** `transistor-preamp-feedback` imports with two rigid overlaps (`Q1/RV3`
   * and `R4/RV4`) and one lead under a rigid part (`R4 under RV4`): breaches of
   * two rules the move generator refuses to CREATE and which an imported start
   * was never held to. Nothing in `lib/stripboard/` re-checks the start against
   * them - `movesFrom` checks the part it moves, not the board it was handed -
   * so without this the run would climb from a board breaking two hard rules and
   * never mention it. **That is the shape of silence this repository punishes
   * hardest**, and an exemption is what makes it a stated fact rather than
   * either a failure or a secret.
   */
  readonly importedStartExemptions: readonly ExemptionVerdict[]
}

/**
 * The two hard area rules measured over an imported start, answered against the
 * recorded exemptions, **and reported on the spot**.
 *
 * The `console.log` is the point rather than debug output: the design the owner
 * approved is that an exempt breach is *reported, not invisible* - one line
 * naming the board, the rule and the count - and the run then proceeds. The
 * lines are carried on the instance as well, so a test can assert them; printing
 * without keeping them would make the claim unverifiable, and keeping them
 * without printing would make it silent.
 */
function importedExemptions(name: string, candidate: Candidate): readonly ExemptionVerdict[] {
  const registry = loadExemptions()
  const areas = partAreasOf(candidate, LEAD_SPANS, PIN_PATTERNS)
  const places: ReadonlyMap<string, readonly string[]> = new Map([
    ["rigidOverlap", rigidOverlapPlaces(areas)],
    ["routedUnderRigid", routedUnderRigidPlaces(areas)],
  ])
  const verdicts = EXEMPTABLE_RULES.map((rule) => {
    const found = places.get(rule)
    if (found === undefined) {
      throw new Error(
        `${name}: no measurement for "${rule}" on the imported start. Every rule in ` +
          "EXEMPTABLE_RULES must be measured before it is consulted about: an unmeasured rule " +
          "reported as clean is a skipped check that looks like a passing one. Add it to " +
          "tests/stripboard/model/area-places.ts and name it above; nothing is assumed clean.",
      )
    }
    return verdictFor(registry, { subject: name, rule, places: found })
  })
  for (const line of noticesOf(verdicts)) console.log(line)
  return verdicts
}

function boardNamed(name: string): CommittedBoard {
  const board = COMMITTED_BOARDS.find((entry) => entry.name === name)
  if (board === undefined) {
    throw new Error(
      `"${name}" is not in COMMITTED_BOARDS in tests/stripboard/vero-import-fixtures.ts. ` +
        "Nothing is substituted: a benchmark measured on a different board is a figure against " +
        "a different benchmark.",
    )
  }
  return board
}

/** The first line of whatever a call threw, or `""` when it did not throw. */
function refusalLine(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return message.split("\n")[0] ?? message
  }
  return ""
}

/**
 * The orderings the benchmark attempts, in the order it attempts them.
 *
 * **`part-walk s3` IS FIRST BECAUSE IT IS THE SEED THE OWNER WAS SHOWN AND
 * APPROVED** - rendered, with its figures, on 2026-10-14: *"The seed is fine. No
 * complaints."* On `transistor-preamp-feedback` it is also the start the
 * recorded baseline is stated from, so a run that cannot reproduce `F` 3.75 from
 * it has something wrong with it.
 *
 * `rcm s2` and `rcm s3` are `tools/stripboard/targets.ts`'s own arrangement at
 * the two strides the stock admits. Both are attempted on both boards and
 * whichever refuses is reported; see this module's comment for why a sixth
 * ordering is here at all.
 */
function orderingsFor(netlist: SeedNetlist, targets: BoardTargets): readonly Ordering[] {
  const partWalk = derivedOrderings(netlist, 3).find((entry) => entry.name === "part-walk s3")
  if (partWalk === undefined) {
    throw new Error(
      "derivedOrderings in tests/stripboard/model/seed-fixtures.ts no longer yields " +
        '"part-walk s3". That is the ordering the owner approved and the one the recorded ' +
        "baseline is stated from, so it is not silently replaced by whatever else that " +
        "function returns.",
    )
  }
  return [
    partWalk,
    { name: "rcm s2", nets: targets.ordering, stride: 2 },
    { name: "rcm s3", nets: targets.ordering, stride: 3 },
  ]
}

/** One instance: its circuit, its hand result, and every start it offers. */
function instanceFor(name: string): BenchmarkInstance {
  const board = boardNamed(name)
  const { netlist, nets } = committedNetlist(name)
  const footprints = footprintsOf(board)
  const targets = targetsFromReference(nets, footprints, RULES.stockRows, name)
  const dumpText = dumpTextOf(board)
  const counts = countLines(dumpText)
  const hand: HandResult = {
    cuts: counts.cuts,
    wires: counts.wires,
    solder: counts.solder,
    objective: objectiveFromLineCounts(counts, RULES),
  }

  const stock = { strips: RULES.stockRows, columns: RULES.stockCols }
  const seedStarts: Start[] = []
  const unavailableStarts: UnavailableStart[] = []
  for (const ordering of orderingsFor(netlist, targets)) {
    let seed: Candidate | undefined
    const refusal = refusalLine(() => {
      seed = seedsFrom(netlist, stock, LEAD_SPANS, [ordering])[0]
    })
    if (seed === undefined) {
      unavailableStarts.push({
        name: `seed ${ordering.name}`,
        refusal: refusal === "" ? "seedsFrom returned no candidate and did not refuse" : refusal,
      })
      continue
    }
    seedStarts.push({ name: `seed ${ordering.name}`, candidate: seed })
  }

  // THE HAND BOARD AS A START, not only as the threshold. Its grid is the one
  // its own dump declares - the piece the owner actually cut - so a search from
  // it is bounded by that board rather than by the stock.
  let imported: Candidate | undefined
  const importRefusal = refusalLine(() => {
    imported = candidateFromDump(dumpText, nets, footprints, PIN_PATTERNS)
  })
  if (imported === undefined) {
    unavailableStarts.push({
      name: "imported hand board",
      refusal:
        importRefusal === ""
          ? "candidateFromDump returned no candidate and did not refuse"
          : importRefusal,
    })
  }

  return {
    name,
    nets,
    netlist,
    targets,
    hand,
    seedStarts,
    importedStart:
      imported === undefined ? undefined : { name: "imported hand board", candidate: imported },
    unavailableStarts,
    importedStartExemptions: imported === undefined ? [] : importedExemptions(name, imported),
  }
}

/** Both instances, built once per process because each reads several fixtures. */
let cached: readonly BenchmarkInstance[] | undefined

export function benchmarkInstances(): readonly BenchmarkInstance[] {
  if (cached === undefined) cached = BENCHMARK_BOARDS.map(instanceFor)
  return cached
}

/**
 * The admissibility predicate `Q1` and `Q2` are handed, and **a plain statement
 * of what it does NOT establish.**
 *
 * It is `violationsOf` and nothing else: every reference net whole in one copper
 * component, and no component carrying two nets, over this candidate's derived
 * cuts. **It is NOT `A1`-`A4`.** The full verdict is `HC1`-`HC10` plus the
 * clustering bound, the floor tolerance and `A4`, it lives in
 * `tools/stripboard/verdict.ts`, and it needs a materialized dump - which is
 * Task 9's job and on the far side of the boundary `lib/stripboard/` may not
 * cross.
 *
 * **SO A `Q1` STOP FROM THIS BENCHMARK IS WEAKER THAN CRITERIA'S `Q1`**, and the
 * report says so rather than letting the rule id carry a claim it did not earn.
 * `./search-stop.ts` states the same thing from the other side: *"a caller that
 * supplies a weaker predicate gets a weaker `Q1`."*
 */
export function soundnessOnly(instance: BenchmarkInstance): SearchSetup["admissible"] {
  return (candidate, cuts) => violationsOf(candidate, cuts, instance.nets).length === 0
}

/** Everything `search` needs for one instance under one strategy. */
export function setupFor(instance: BenchmarkInstance, strategy: Strategy): SearchSetup {
  return {
    reference: instance.nets,
    spans: LEAD_SPANS,
    patterns: PIN_PATTERNS,
    weights: RULES,
    stopping: {
      cutFloor: instance.targets.cutFloor,
      tau: RULES.tau,
      yieldFloor: RULES.yieldFloor,
      // **THE COMMITTED CAP, now that there is one worth committing.** This read
      // a literal 2,000,000 while Task 11's ladder was the declared unknown that
      // would settle it. The ladder ran, the owner set the parameter to 200,000
      // on 2026-10-15, and the literal is DELETED rather than left beside the
      // value it was standing in for - a fixture that keeps its own budget would
      // mean the gate ran at a figure nobody chose, and would go on passing if
      // the committed one were set to something a healthy run could not finish
      // in.
      evaluationCap: RULES.evaluationCap,
      signatureRun: RULES.signatureRun,
    },
    admissible: soundnessOnly(instance),
    strategy,
  }
}

/**
 * The runs, memoized per instance and strategy.
 *
 * **MEMOIZED BECAUSE A RUN IS EXPENSIVE AND SEVERAL ASSERTIONS ARE ABOUT ONE
 * RUN.** A seeded run of `transistor-preamp-feedback` is three climbs, about
 * 36,000 evaluations and 2.7 seconds; three tests asking for it separately
 * would triple that, and `tests/stripboard/model/no-fork.test.ts` spawns this
 * whole suite a second time with the fork unavailable, which doubles it again.
 * The search is deterministic - `movesFrom` has a declared order and both
 * strategies break ties by it - so one run per key is the same run every
 * assertion would have got.
 */
const RUNS = new Map<string, SearchResult>()

function runFor(key: string, starts: readonly Start[], setup: SearchSetup): SearchResult {
  const already = RUNS.get(key)
  if (already !== undefined) return already
  const result = search(starts, setup)
  RUNS.set(key, result)
  return result
}

/** The run over the constructed seeds - the restart schedule, climbed in order. */
export function seededRun(instance: BenchmarkInstance, strategy: Strategy): SearchResult {
  return runFor(
    `seeded|${instance.name}|${strategy.name}`,
    instance.seedStarts,
    setupFor(instance, strategy),
  )
}

/**
 * The run from the owner's own layout, or `undefined` when it will not import.
 *
 * `undefined` is not a quiet skip: `instance.unavailableStarts` carries the
 * refusal, and `./benchmark.test.ts` asserts it is there.
 */
export function handRun(
  instance: BenchmarkInstance,
  strategy: Strategy,
): SearchResult | undefined {
  const start = instance.importedStart
  if (start === undefined) return undefined
  return runFor(`hand|${instance.name}|${strategy.name}`, [start], setupFor(instance, strategy))
}

/** `C`, `W`, `B` and `F` for one candidate, as a report prints them. */
export interface Figures {
  readonly cuts: number
  readonly wires: number
  readonly bridges: number
  readonly objective: number
  readonly strips: number
  readonly columns: number
  readonly netsWhole: boolean
}

export function figuresOf(candidate: Candidate, nets: ReferenceNets): Figures {
  const cuts = derivedCuts(candidate, nets)
  return {
    cuts: cuts.length,
    wires: candidate.wires.length,
    bridges: candidate.bridges.length,
    objective: objectiveOf(candidate, cuts, RULES),
    strips: candidate.grid.strips,
    columns: candidate.grid.columns,
    netsWhole: violationsOf(candidate, cuts, nets).length === 0,
  }
}
