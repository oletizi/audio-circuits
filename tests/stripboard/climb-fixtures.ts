/**
 * The injected spawn, the hand-built `Evaluation` and the inputs that
 * `tests/stripboard/moves.test.ts` and `tests/stripboard/climb.test.ts` both
 * read - and the one import either of them needs, because this file RE-EXPORTS
 * `./climb-boards.ts`.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper two test files import, following
 * `./score-fixtures.ts`, `./rank-fixtures.ts`, `./grade-fixtures.ts` and
 * `./seed-fixtures.ts`. Five tasks have converged on that seam, and the seam
 * cut here is the same one: the assertions are in the test files and the
 * material they are checked against is here.
 *
 * **THE BOARD TEXTS LIVE IN `./climb-boards.ts`, SPLIT OFF FOR THE LINE
 * CEILING**, and every one of them is re-exported below: this file is the
 * HARNESS and that one is the MATERIAL. No test's import list changed with the
 * split, which is the whole reason for the re-export.
 *
 * **THE TWO BOARDS ARE REAL ENOUGH TO BE GRADED, AND THAT IS THE POINT.**
 * `BASE_DUMP` and `BETTER_DUMP` both pass all ten hard constraints against
 * `NETLIST` and `REPORT` - checked by `climb.test.ts` rather than asserted
 * here - so the climb's acceptance rule is exercised over admissible
 * candidates. A fixture that failed `HC1` would make every acceptance test pass
 * for the one reason that rejects everything, which would look exactly like a
 * working climb.
 *
 * **WHY VERTICAL STRIPS, which is forced rather than chosen.** Under horizontal
 * strips a two-lead part laid ALONG a row shorts its own two nets, and
 * `tools/stripboard/seed-geometry.ts`'s `occupancyOf` REFUSES a part facing `N`
 * or `S` (for such a part `SPAN` is its row count and its stretched length
 * appears in no dump line). So a board that is both gradeable and enumerable
 * has to have its parts along the rows and its strips down the columns. The
 * alternative was two fixtures that could never be the same board.
 *
 * **THE SPAWN IS ALWAYS INJECTED AND NO TEST HERE RUNS THE BINARY** - the rule
 * `./seed-fixtures.ts` states, for its reason: *"a spawn that quietly fails is
 * the shape that reads as a clean board."*
 *
 * **THE SPAWN DOES NOT SIMULATE A GESTURE, AND THAT BOUND IS STATED.** It
 * answers `--dump-board` from a SCRIPT keyed by how many dumps have been asked
 * for, so the dump a candidate reports is the script's and not the move's
 * effect. What the climb tests therefore assert is the BOOKKEEPING and the
 * ACCEPTANCE RULE - the counters, the history, the invocation order, the
 * scratch-file discipline - and not the fork's geometry, which
 * `tests/stripboard/seed-geometry.test.ts` holds against the real binary. No
 * test here reads a board's geometry out of a board some gesture wrote.
 *
 * **EVERY `-o` PATH IS REALLY WRITTEN**, with content naming this file, so that
 * `climb.test.ts`'s "leaves the start board untouched" assertion has something
 * to catch: a climb that passed its start path as an output would change that
 * file's bytes.
 */
import fs from "node:fs"
import path from "node:path"
import { freshTempScratch } from "../support/temp-scratch.ts"
import { CONSTRAINT_IDS, holds } from "../../tools/stripboard/constraints-model.ts"
import { stockFor } from "../../tools/stripboard/grade.ts"
import { loadRules, type StripboardRules } from "../../tools/stripboard/rules.ts"
import type { BoardTargets } from "../../tools/stripboard/targets.ts"
import type { ClimbInput, Evaluation } from "../../tools/stripboard/climb.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import { score } from "./rank-fixtures.ts"
import {
  BASE_DUMP,
  BETTER_DUMP,
  FOOTPRINTS,
  INCOMPLETE_REPORT,
  NETLIST,
  OCC,
  REFERENCE,
  REPORT,
} from "./climb-boards.ts"

/**
 * Every board text and parse, re-exported so a test imports one fixtures
 * module. Listed one name per line rather than with a star, because a star
 * would re-export whatever that file grows next without anybody deciding to.
 */
export {
  BASE_DUMP,
  BASE_PLUS_WIRE_DUMP,
  BETTER,
  BETTER_DUMP,
  BETTER_OCC,
  DUMP,
  FOOTPRINTS,
  INCOMPLETE_REPORT,
  NETLIST,
  OCC,
  REFERENCE,
  REPORT,
  TALL_DUMP,
  TALL_PLUS_WIRES_DUMP,
  TOP_EDGE,
  TOP_EDGE_DUMP,
  TOP_EDGE_OCC,
  UNRESOLVED_DUMP,
} from "./climb-boards.ts"

/**
 * What the two boards are scored against. The scorer reads only `board` and
 * `cutFloor` (see `tools/stripboard/score.ts`'s module comment), and
 * `cutFloor` is 0 because `max(0, N - R) = max(0, 2 - 34)` is 0 - so neither
 * board's `F` can fall below its floor and `K5` has nothing to refuse.
 */
export const TARGETS: BoardTargets = {
  board: "climb-fixture",
  netCount: 2,
  pinCount: 4,
  // NOT the owner's stock, and nothing here depends on it being that. Any R
  // above this fixture's N of 2 gives `max(0, 2 - R) = 0`, which is the only
  // property the floor comment below relies on. It is written as 34 because
  // that is today's strip count and a reader comparing the two should not have
  // to wonder whether the difference is meaningful - but the owner has said the
  // dimensions are ALWAYS provisional, so if the stock changes this fixture
  // does not have to follow it and the floor stays 0 either way.
  strips: 34,
  cutFloor: 0,
  netGraph: {
    nets: ["left", "right"],
    edges: [["left", "right"]],
    maxDegree: 1,
    bandwidthLowerBound: 1,
  },
  ordering: ["left", "right"],
  orderingBandwidth: 1,
}

const LOW_BOOST_DECLARATION = path.join(
  import.meta.dir,
  "..",
  "..",
  "boards",
  "pultec-low-boost",
  "perfboard.json",
)

/**
 * The committed rules, with `worseAcceptance` asserted null rather than
 * assumed.
 *
 * The name claims the bound is unset, so the fixture CHECKS it: if the committed
 * file ever configured one, every test using this would be exercising E3's
 * bounded worse-acceptance while reading as if it had tested the strict rule -
 * and a strict-rule test that passes under a bound is a test of nothing.
 */
export function rulesWithoutWorseAcceptance(): StripboardRules {
  const rules = loadRules()
  if (rules.worseAcceptance !== null) {
    throw new Error(
      "rulesWithoutWorseAcceptance: the committed rules file configures worseAcceptance = " +
        `${rules.worseAcceptance}, so this fixture's name is false and every test using it ` +
        "would be exercising E3's bounded worse-acceptance rather than the strict rule. E3 " +
        "landed in Task 18 and the committed file records the bound as deliberately unset " +
        "(null), with its reason in the notes - so this means the rules file changed.",
    )
  }
  return rules
}

/**
 * The same rules with a bound configured, which TURNS E3 ON.
 *
 * It existed for the refusal E3 was deferred behind until Task 18 implemented
 * the mechanism. `./escapes-search.test.ts` holds the bound's own arithmetic;
 * the one test here that uses it holds the half belonging to the acceptance
 * rule - that the bound does not reach past the no-regression clause.
 */
export function rulesWithWorseAcceptance(bound: number): StripboardRules {
  return { ...rulesWithoutWorseAcceptance(), worseAcceptance: bound }
}

/**
 * The same rules with a small evaluation cap, so `S5` can be reached in a test.
 *
 * The committed cap is 20,000 - `Q5`'s backstop, sized so a healthy run never
 * reaches it - which is exactly why a test cannot drive a real climb to it and
 * why the cap needs a fixture rather than being left as the one branch nothing
 * asserts on. `loadRules` enforces the cap's own bounds, so this spreads over a
 * loaded object rather than inventing a rules file.
 */
export function rulesWithCap(cap: number): StripboardRules {
  return { ...rulesWithoutWorseAcceptance(), evaluationCap: cap }
}

/**
 * A hand-built `Evaluation` that states nothing false and proves nothing
 * either: ten results that SAY they hold, a `Score` whose every field is zero
 * but `objective`, and a five-position tuple of ones.
 *
 * It never calls `evaluate`, so a test using it tests `accepts` against
 * hand-written numbers rather than `accepts` against the rest of its own
 * module. `./rank-fixtures.ts`'s `score()` is reused for the same reason it
 * exists there.
 */
export function evaluation(overrides: Partial<Evaluation> = {}): Evaluation {
  return {
    candidate: "climb-fixture.vrt",
    score: score({ objective: 4 }),
    results: CONSTRAINT_IDS.map((id) =>
      holds(id, "fixture: stated to hold; nothing was measured to produce this"),
    ),
    ranking: [1, 1, 1, 1, 1],
    admissibleA1: true,
    // ZERO, BECAUSE THE TEN RESULTS ABOVE SAY HC1 HOLDS: `requireSelfConsistent`
    // refuses a positive count beside an HC1 that holds, so any other default
    // would make every caller of this fixture refuse before it compared
    // anything. A test about the completeness key overrides BOTH fields.
    openNets: 0,
    ...overrides,
  }
}

/** A tuple that beats `evaluation()`'s on its LAST position only: the lowest-ranked term. */
export const BETTER_TUPLE: readonly number[] = [1, 1, 1, 1, 0]

/** Which dump text the spawn answers the `n`th `--dump-board` with. */
export type DumpScript = (dumpIndex: number) => string

/**
 * The script the climb tests run: the FIRST candidate reports `BETTER_DUMP` and
 * every other evaluation reports `BASE_DUMP`.
 *
 * Index 0 is the start. So round 0 accepts its first candidate and nothing
 * else, and round 1 - swept from `BETTER_DUMP` - accepts nothing, because every
 * candidate in it reports the worse board. There is no "and thereafter"
 * fallback: the function answers every index explicitly.
 */
export const IMPROVES_THEN_STALLS: DumpScript = (dumpIndex) =>
  dumpIndex === 1 ? BETTER_DUMP : BASE_DUMP

/** The content every written output carries, so a stray write is visible in the bytes. */
const WRITTEN = "written by tests/stripboard/climb-fixtures.ts's injected spawn, not by the fork"

/** The `-o` value, which every write verb carries and none derives itself. */
function outputOf(args: readonly string[]): string {
  const at = args.indexOf("-o")
  const out = at === -1 ? undefined : args[at + 1]
  if (out === undefined) {
    throw new Error(
      `the injected spawn was given a write verb with no -o: ${args.join(" ")}. The fork requires ` +
        "it on every write verb and has no in-place default.",
    )
  }
  return out
}

/** The ops file `--move-batch` was pointed at, read back so the batched path is really proven. */
function opsOf(args: readonly string[]): string {
  const at = args.indexOf("--ops")
  const file = at === -1 ? undefined : args[at + 1]
  if (file === undefined) {
    throw new Error(`--move-batch was invoked with no --ops: ${args.join(" ")}`)
  }
  return fs.readFileSync(file, "utf8")
}

/**
 * The verbs that write a board, which this spawn answers by writing a marker
 * file at `-o`.
 *
 * **`--update` IS ONE OF THEM because a candidate that adds a wire is assigned
 * to its net before it is measured** - `tools/stripboard/moves-model.ts`'s
 * `addsWire` and `tools/stripboard/complete-apply.ts`'s `assignNodes` carry the
 * reason, which is that a fresh wire's holes carry node id 0 and `--check`'s
 * completeness reads node ids. It is listed here and NOT answered by a
 * catch-all: the spawn still throws for a verb nobody described.
 */
const WRITE_VERBS: readonly string[] = [
  "--move",
  "--rotate",
  "--stretch",
  "--author",
  "--move-batch",
  "--update",
]

/**
 * One invocation's answer. A verb it does not know THROWS rather than returning
 * a clean status: a spawn that answers everything makes every test of the climb
 * a test of nothing.
 */
function answer(
  args: readonly string[],
  script: DumpScript,
  state: { dumps: number; readonly ops: string[] },
): { readonly status: number; readonly stdout: string; readonly stderr: string } {
  const verb = args[0]
  if (verb === "--dump-board") {
    const text = script(state.dumps)
    state.dumps += 1
    return { status: 0, stdout: text, stderr: "" }
  }
  // --check's EXIT CODE IS DATA: HC1 reads it, so a board with an incomplete
  // net exits 1 and that is not a spawn failure. This fixture's boards are
  // complete, so it answers 0 with the matching report.
  if (verb === "--check") return { status: 0, stdout: REPORT, stderr: "" }
  if (verb !== undefined && WRITE_VERBS.includes(verb)) {
    if (verb === "--move-batch") state.ops.push(opsOf(args))
    fs.writeFileSync(outputOf(args), `${WRITTEN}\n${args.join(" ")}\n`)
    return { status: 0, stdout: "", stderr: "" }
  }
  throw new Error(
    `the injected spawn has no answer for "${verb ?? ""}": ${args.join(" ")}. It throws rather ` +
      "than returning status 0 with empty output, because a spawn that answers everything makes " +
      "every assertion about the climb pass over invocations nobody described.",
  )
}

/** Answers `--dump-board` from `script`, writes every `-o`, records every ops file. */
export function scriptedSpawn(script: DumpScript): SpawnVeroroute {
  const state = { dumps: 0, ops: [] as string[] }
  return (args) => answer(args, script, state)
}

/** What `--check` answers for one evaluation: its exit code and its report. */
export type CheckScript = (evaluation: number) => { readonly status: number; readonly report: string }

/** `--check` reporting every net complete, exit 0. */
export const CHECK_COMPLETE: CheckScript = () => ({ status: 0, report: REPORT })

/** `--check` reporting `left` incomplete, exit 1 - which is HC1's own input. */
export const CHECK_INCOMPLETE: CheckScript = () => ({ status: 1, report: INCOMPLETE_REPORT })

/**
 * A spawn that scripts BOTH the dump and the `--check` report, per evaluation.
 *
 * The two counters stay in step because each evaluation spends exactly one
 * `--check` and one `--dump-board`, in that order (apply, autofill, check,
 * dump). That is what lets a test say "evaluation 1 repairs HC1" - a claim
 * about the report and the dump together.
 */
export function scriptedSpawnWithChecks(
  dumps: DumpScript,
  checks: CheckScript,
): SpawnVeroroute {
  const state = { dumps: 0, ops: [] as string[] }
  let checked = 0
  return (args) => {
    if (args[0] === "--check") {
      const answer = checks(checked)
      checked += 1
      return { status: answer.status, stdout: answer.report, stderr: "" }
    }
    return answer(args, dumps, state)
  }
}

/** The scripted spawn with `--check` reporting one net incomplete and exiting 1. */
export function incompleteNetSpawn(script: DumpScript): SpawnVeroroute {
  const inner = scriptedSpawn(script)
  return (args) =>
    args[0] === "--check"
      ? { status: 1, stdout: INCOMPLETE_REPORT, stderr: "" }
      : inner(args)
}

/** The same spawn, recording every argument list into `spawned` and every ops file into `ops`. */
export function recordingSpawn(
  spawned: string[][],
  script: DumpScript,
  ops: string[] = [],
): SpawnVeroroute {
  const state = { dumps: 0, ops }
  return (args) => {
    spawned.push([...args])
    return answer(args, script, state)
  }
}

/**
 * A fresh run directory, so no two climbs in one suite share a scratch file.
 *
 * Registered with `../support/temp-scratch.ts`: eight test files call this and
 * it left **55** directories in `TMPDIR` a run, so every one of them arms
 * `afterAll(cleanUpTempScratch)`.
 */
export function freshRunDir(): string {
  return freshTempScratch("stripboard-climb-")
}

/** The start board, written for real so a stray write to it is visible. */
export function seededStart(runDir: string): string {
  const file = path.join(runDir, "seeded.vrt")
  fs.writeFileSync(file, BASE_DUMP)
  return file
}

/** The netlist, written for real because `--check` is handed its path. */
export function netlistFile(runDir: string): string {
  const file = path.join(runDir, "reference.net")
  fs.writeFileSync(file, NETLIST)
  return file
}

/** One climb's input, over a fresh run directory. `batch` is the caller's to set. */
export function climbInput(runDir: string, batch: boolean): ClimbInput {
  const rules = rulesWithoutWorseAcceptance()
  return {
    runDir,
    netlist: netlistFile(runDir),
    targets: TARGETS,
    reference: REFERENCE,
    footprints: FOOTPRINTS,
    stock: stockFor(LOW_BOOST_DECLARATION, rules),
    rules,
    batch,
    // The fixture's start is BASE_DUMP, which turns nothing, so its geometry is
    // readable from its own dump. A real arm hands this over instead - see
    // `SeedStart` - which is why ClimbInput requires it rather than deriving it.
    occupancy: OCC,
  }
}
