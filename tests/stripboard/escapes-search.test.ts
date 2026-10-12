/**
 * Task 18: `E2`'s seeded restarts, `E3`'s bounded worse-acceptance, `Q3`'s
 * restart trigger, and the scan that says nothing in the search consults a
 * clock.
 *
 * `E1`'s own tests are in `./escapes.test.ts`, split off for the line ceiling at
 * the seam the task has: that file needs no `search` and this one needs no board
 * arithmetic. `./search-fixtures.ts` holds this file's inputs and spawns, and
 * `./escapes-fixtures.ts` holds that one's boards.
 *
 * **WHAT THESE PROVE AND WHAT THEY DO NOT.** The spawn answers `--dump-board`
 * from a script keyed by the dump count, so it does not simulate a gesture: the
 * board a candidate reports is the script's and not the move's effect. So these
 * assert the RESTART BOOKKEEPING - how many climbs, where the boundaries fall,
 * which arm produced each start, what the run says about `E3` - and never the
 * fork's geometry. Every figure is hand-derived from the fixture with the
 * derivation written out beside it.
 */
import { expect, test } from "bun:test"
import { accepts, climb, type Evaluation } from "../../tools/stripboard/climb.ts"
import { search } from "../../tools/stripboard/search.ts"
import { seededPrng } from "../../tools/stripboard/seed.ts"
import {
  BETTER_TUPLE,
  climbInput,
  evaluation,
  freshRunDir,
  IMPROVES_THEN_STALLS,
  scriptedSpawn,
  seededStart,
} from "./climb-fixtures.ts"
import {
  committedRules,
  freshSearchDir,
  lowBoostSearchInput,
  recordingLowBoostSpawn,
  rulesWithBound,
  rulesWithSeeds,
  searchInput,
  searchSpawn,
  SECOND_SEED_WINS,
  startSequences,
  STALLS_IMMEDIATELY_EVERY_SEED,
} from "./search-fixtures.ts"
import { importClosure } from "./import-closure.ts"
import { IMPORTED_BOARD } from "./seed-fixtures.ts"

const base = evaluation()

function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

/** A candidate worse than `base` by `by`, breaking nothing. */
function worseBy(by: number): Evaluation {
  return { ...base, score: { ...base.score, objective: base.score.objective + by } }
}

test("E2 keeps the best candidate across every climb and records the boundaries", () => {
  const runDir = freshSearchDir()
  const result = search(searchInput(runDir), searchSpawn(SECOND_SEED_WINS))
  const seeds = committedRules().seeds
  expect(seeds.length).toBe(5)
  expect(result.climbs.length).toBe(seeds.length)
  expect(result.restartBoundaries.length).toBe(seeds.length - 1)
  // HAND-DERIVED, from the arithmetic ./search-fixtures.ts writes out:
  // a stalled climb spends 93 evaluations - the start plus BASE_DUMP's 92
  // applicable moves - and climb 1, whose first candidate reports the better
  // board, spends 180: the start, round 0's 92, and round 1's 87 swept from the
  // carried occupancy, where R1 has moved to 1,1 and its clockwise turn no
  // longer fits, over BETTER_DUMP's pins (./climb.test.ts derives that 87). So
  // the boundaries are the running totals 93, 273, 366 and 459.
  expect(result.climbs.map((entry) => entry.evaluations)).toEqual([93, 180, 93, 93, 93])
  expect(result.restartBoundaries).toEqual([93, 273, 366, 459])
  expect(result.best.score.objective).toBe(
    Math.min(...result.climbs.map((entry) => entry.best.score.objective)),
  )
  // And the figure itself, not only the minimum: BETTER_DUMP has no CUT, no
  // WIRE and no SOLDER line, so F = 0, while a stalled climb stays at
  // BASE_DUMP's 0 + 0.25*2 = 0.5.
  expect(result.best.score.objective).toBe(0)
  expect(result.climbs.map((entry) => entry.best.score.objective)).toEqual([0.5, 0, 0.5, 0.5, 0.5])
})

test("E2's restart schedule is a function of the seed list alone", () => {
  // Never of elapsed time or remaining wall clock, which V6 depends on.
  const first = search(searchInput(freshSearchDir()), searchSpawn(SECOND_SEED_WINS))
  const second = search(searchInput(freshSearchDir()), searchSpawn(SECOND_SEED_WINS))
  expect(second.restartBoundaries).toEqual(first.restartBoundaries)
  expect(second.climbs.map((entry) => entry.evaluations)).toEqual(
    first.climbs.map((entry) => entry.evaluations),
  )
  // And a shorter seed list is a shorter schedule, which is what makes the
  // claim "from the list" rather than "from a constant": three seeds, two
  // boundaries.
  const runDir = freshSearchDir()
  const short = search(
    { ...searchInput(runDir), rules: rulesWithSeeds([0, 1, 2]) },
    searchSpawn(STALLS_IMMEDIATELY_EVERY_SEED),
  )
  expect(short.climbs.length).toBe(3)
  expect(short.restartBoundaries).toEqual([93, 186])
})

test("every restart starts from the run's OWN arm, one start per seed", () => {
  // Otherwise every arm's restarts are the constructed arm's and Task 16's
  // comparison measures only the first climb of each run. It is read off the
  // SPAWN RECORD rather than through an injected seeder, so `search` keeps its
  // two parameters: a start sequence runs from the arm's read of the imported
  // board to the autofill that paints the start, and the constructed arm is the
  // only one of the three that stretches.
  const seeds = committedRules().seeds
  const random: string[][] = []
  search(
    lowBoostSearchInput(freshSearchDir(), "random"),
    recordingLowBoostSpawn(random),
  )
  const randomStarts = startSequences(random, IMPORTED_BOARD)
  expect(randomStarts.length).toBe(seeds.length)
  expect(randomStarts.flat().filter((args) => args[0] === "--stretch")).toEqual([])
  // The control arm draws a position and a quarter-turn count per part, so its
  // starts are not all the same board either: two different seeds produce two
  // different gesture lists.
  expect(randomStarts[0]).not.toEqual(randomStarts[1])
  const constructed: string[][] = []
  search(
    lowBoostSearchInput(freshSearchDir(), "constructed"),
    recordingLowBoostSpawn(constructed),
  )
  const constructedStarts = startSequences(constructed, IMPORTED_BOARD)
  expect(constructedStarts.length).toBe(seeds.length)
  expect(constructedStarts.flat().some((args) => args[0] === "--stretch")).toBe(true)
})

test("a record with no autofill in it is a refusal, not an empty list of starts", () => {
  // A splitter that returned an empty list would make both halves of the test
  // above pass over nothing.
  expect(refusalFrom(() => startSequences([["--dump-board", IMPORTED_BOARD]], IMPORTED_BOARD)))
    .toContain("no `--author --op autofill` at all")
})

test("E3 does not run when no bound is configured, and the run says so", () => {
  // PAR3: the bound has no default. Unconfigured means the mechanism does not
  // run, STATED IN THE REPORT, never quietly approximated.
  const runDir = freshSearchDir()
  const result = search(searchInput(runDir), searchSpawn(STALLS_IMMEDIATELY_EVERY_SEED))
  expect(committedRules().worseAcceptance).toBe(null)
  expect(result.worseAcceptanceRan).toBe(false)
  // And with a bound the same run says it DID, which is the half that makes the
  // flag a report rather than a constant.
  const bounded = search(
    { ...searchInput(freshSearchDir()), rules: rulesWithBound(2) },
    searchSpawn(STALLS_IMMEDIATELY_EVERY_SEED),
  )
  expect(bounded.worseAcceptanceRan).toBe(true)
})

test("E3 accepts a worse candidate only within the configured bound", () => {
  // THE BRIEF'S SIGNATURE FOR THIS TEST WAS `accepts(base, worseBy(1), rules,
  // seededPrng(0))`, AND IT IS CHANGED RATHER THAN DELETED, with the two
  // reasons visible. First, `accepts` takes an AcceptanceInput of three boards:
  // a regression is measured against the board the move was applied to and F
  // against the incumbent, which a two-board signature cannot express. Second,
  // THERE IS NO DRAW: PIPELINE E3 supplies a bound and no schedule, and this
  // repository will not invent one, so the bound alone decides and a draw
  // parameter nothing consumed would claim a randomness the rule does not have.
  const rules = rulesWithBound(2)
  const at = (candidate: Evaluation): boolean =>
    accepts({ predecessor: base, incumbent: base, candidate }, rules)
  expect(at(worseBy(1))).toBe(true)
  expect(at(worseBy(2))).toBe(true)
  expect(at(worseBy(3))).toBe(false)
  // The bound buys a worse F and nothing else: a candidate that BREAKS a
  // constraint its predecessor held is still rejected, however small the
  // regression in F.
  const breaksHC6 = {
    ...worseBy(1),
    admissibleA1: false,
    results: base.results.map((result) =>
      result.id === "HC6" ? { ...result, held: false } : result,
    ),
  }
  expect(at(breaksHC6)).toBe(false)
  // And with no bound configured the same candidate is rejected, so the three
  // acceptances above are the bound's doing.
  const strict = committedRules()
  expect(accepts({ predecessor: base, incumbent: base, candidate: worseBy(1) }, strict)).toBe(false)
})

test("E3 cannot make the run report a best board worse than one it saw", () => {
  // A BOUNDED WORSE-ACCEPTANCE MOVES THE WALK, NOT THE RESULT. The incumbent is
  // where the next round sweeps from, and under E3 it can get worse; the
  // reported best may not. Under the committed rules the two coincide, because
  // every acceptance improves on the incumbent - so this is the test that would
  // catch a climb reporting its walk position.
  //
  // THE SCRIPT: IMPROVES_THEN_STALLS hands BETTER_DUMP (F = 0) to the first
  // candidate and BASE_DUMP (F = 0.5) to every other evaluation. With a bound of
  // 1, every later candidate is within it and is accepted, so the walk ends on a
  // 0.5 board while the best board seen is the 0.
  const runDir = freshRunDir()
  const bounded = climb(
    seededStart(runDir),
    { ...climbInput(runDir, false), rules: rulesWithBound(1) },
    scriptedSpawn(IMPROVES_THEN_STALLS),
  )
  expect(bounded.best.score.objective).toBe(0)
  expect(Math.min(...bounded.history)).toBe(0)
  // The walk really did keep moving: round 0 accepted more than the one
  // improving candidate, which is what the bound bought.
  expect(bounded.acceptedPerRound[0]).toBeGreaterThan(1)
})

test("E3's bound is read from the rules and the seeded PRNG is Task 16's, not a second one", () => {
  // `seededPrng` is IMPORTED, never redeclared here: two declarations of one
  // algorithm are one claim in two places, and two runs claiming one seed is
  // the exact failure. It is determinate in the seed, which is what V6 needs of
  // every stream in the search.
  const sequence = (seed: number): readonly number[] =>
    Array.from({ length: 5 }, seededPrng(seed))
  expect(sequence(7)).toEqual(sequence(7))
  expect(sequence(7)).not.toEqual(sequence(8))
  // AND E3 TAKES NO DRAW FROM IT, asserted rather than left to the comment
  // above: `accepts` has two parameters, the boards and the rules. PIPELINE E3
  // names a seeded PRNG and supplies no schedule to consume one with, so the
  // bound alone decides. A third parameter appearing here means a schedule was
  // invented, which is the number this suite refuses to make up.
  expect(accepts.length).toBe(2)
})

test("Q3 does not stop the run on its first firing, or E2 would be unreachable", () => {
  // A round with no accepted move ends THAT climb; the rule fires only when the
  // seed list is spent. Without this the run halts at the first local optimum,
  // which is the condition E2 exists to leave.
  const runDir = freshSearchDir()
  const result = search(searchInput(runDir), searchSpawn(STALLS_IMMEDIATELY_EVERY_SEED))
  expect(result.climbs.length).toBe(committedRules().seeds.length)
  // Every climb stalled in its first round, which is what makes this a run of
  // five first-firings rather than one long climb.
  expect(result.climbs.map((entry) => entry.acceptedPerRound)).toEqual([[0], [0], [0], [0], [0]])
})

test("the evaluation cap is run-level: a restart cannot grant itself more", () => {
  // Q5's cap is shared across restarts, so the schedule's division of it is
  // "what is left". HAND-DERIVED: a stalled climb would spend 93, so a cap of
  // 96 leaves 3 for the second climb - the start plus two candidates - and
  // nothing for a third, which is not started at all.
  const runDir = freshSearchDir()
  const result = search(
    { ...searchInput(runDir), rules: { ...committedRules(), evaluationCap: 96 } },
    searchSpawn(STALLS_IMMEDIATELY_EVERY_SEED),
  )
  expect(result.climbs.map((entry) => entry.evaluations)).toEqual([93, 3])
  expect(result.climbs.length).toBeLessThan(committedRules().seeds.length)
  expect(result.restartBoundaries).toEqual([93])
})

test("a plateau candidate with a better ranking is still accepted under a bound", () => {
  // E3 is an ADDITIONAL clause and not a replacement: the plateau move is free
  // and stays free, so a configured bound must not change what happens at
  // delta = 0.
  const plateau = { ...base, ranking: BETTER_TUPLE }
  expect(accepts({ predecessor: base, incumbent: base, candidate: plateau }, rulesWithBound(2)))
    .toBe(true)
  const better = { ...base, score: { ...base.score, objective: base.score.objective - 1 } }
  expect(accepts({ predecessor: base, incumbent: base, candidate: better }, rulesWithBound(2)))
    .toBe(true)
})

test("no file in the search's TRANSITIVE closure names a clock, a pid, a listing or Math.random", async () => {
  // THE TEST THIS REPLACES scanned two files under the name "nothing in the
  // search consults a clock" - and the search reaches a hundred modules, any of
  // which could consult one. The closure is walked and every file in it is
  // scanned, which is as strong as this claim can be made statically.
  //
  // WHAT IT STILL DOES NOT PROVE, written down rather than left implied: a scan
  // cannot see an aliased access (`const now = Date["now"]`), a clock reached
  // through a node builtin the walker skips by name, or a nondeterminism that is
  // not one of these five identifiers. The GUARANTEE for determinism is Task
  // 21's comparison of two runs; this test is the cheap early warning that names
  // the file.
  //
  // `search.ts` IS AN ENTRY POINT HERE AND THE BRIEF NAMED ONLY TWO. It is the
  // module that now wraps the climb, so a clock reached only through the restart
  // loop would be outside a closure of climb and moves alone.
  const forbidden = ["Date.now", "performance.now", "process.pid", "readdirSync", "Math.random"]
  const closure = new Set<string>()
  for (const entry of [
    "tools/stripboard/search.ts",
    "tools/stripboard/climb.ts",
    "tools/stripboard/moves.ts",
  ]) {
    for (const file of await importClosure(entry)) closure.add(file)
  }
  expect(closure.size, "the closure must be more than the three entry points").toBeGreaterThan(3)
  for (const file of [...closure].sort()) {
    const text = await Bun.file(file).text()
    for (const identifier of forbidden) {
      if (EXEMPT.some((entry) => entry.file === file && entry.identifier === identifier)) continue
      expect(text, `${file}: ${identifier}`).not.toContain(identifier)
    }
  }
})

/**
 * The two files in the closure that DO name a forbidden identifier, each with
 * why it cannot reach a scored evaluation.
 *
 * **THEY ARE NAMED ENTRIES AND THE CLOSURE IS NOT NARROWED**, which is the
 * brief's own instruction: a quietly shrunk closure would make every assertion
 * above smaller than it looks. Both are recorded in
 * `docs/stripboard/pipeline-verification.md` section 6 with this reasoning.
 *
 * **THE EDGE THAT CARRIES THEM IN IS TYPE-ONLY.**
 * `tools/stripboard/check-report.ts` imports `type { CheckRun }` from
 * `tools/perfboard/check.ts`, which erases - so no runtime code of `check.ts` or
 * of anything it imports is loaded by an evaluation at all, and these two files
 * are two and three further hops beyond it. The next test holds that edge, so an
 * import changed from `import type` to `import` fails rather than silently
 * making these exemptions false.
 */
const EXEMPT: readonly { readonly file: string; readonly identifier: string }[] = [
  // `loadCatalog(dir)` reads the parts catalogue for the BOM comparison
  // `--check` makes. The search calls neither.
  { file: "tools/bom/catalog.ts", identifier: "readdirSync" },
  // `discoverDeclarations(root)` walks for every board's perfboard.json, for the
  // CLI verb that checks all of them. The search is handed one declaration path
  // by its caller and reads it through `stockFor`.
  { file: "tools/perfboard/declaration.ts", identifier: "readdirSync" },
]

test("the exemptions are still real, and the edge that admits them is still type-only", async () => {
  // AN EXEMPTION THAT ROTS IS WORSE THAN NO EXEMPTION: if one of these files
  // stopped naming the identifier, the entry above would be excusing a file
  // that no longer needs it and the next real hit could be added beside it
  // without anybody re-reading the reasoning. So each one is asserted PRESENT.
  for (const entry of EXEMPT) {
    expect(await Bun.file(entry.file).text()).toContain(entry.identifier)
  }
  // And the reason they cannot reach an evaluation: the only edge from the
  // search into that subtree is a TYPE-ONLY import, which ships no runtime code.
  const text = await Bun.file("tools/stripboard/check-report.ts").text()
  expect(text).toContain('import type { CheckRun } from "../perfboard/check.ts"')
  expect(text).not.toContain('import { CheckRun }')
})
