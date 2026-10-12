/**
 * The two boards, the injected spawn, the hand-built `Evaluation` and the
 * inputs that `tests/stripboard/moves.test.ts` and
 * `tests/stripboard/climb.test.ts` both read.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper two test files import, following
 * `./score-fixtures.ts`, `./rank-fixtures.ts`, `./grade-fixtures.ts` and
 * `./seed-fixtures.ts`. Five tasks have converged on that seam, and the seam
 * cut here is the same one: the assertions are in the test files and the
 * material they are checked against is here.
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
import os from "node:os"
import path from "node:path"
import { boardGeometry } from "../../tools/stripboard/copper.ts"
import { CONSTRAINT_IDS, holds } from "../../tools/stripboard/constraints-model.ts"
import { referenceNetsFromExport } from "../../tools/stripboard/equivalence.ts"
import { stockFor } from "../../tools/stripboard/grade.ts"
import { loadRules, type StripboardRules } from "../../tools/stripboard/rules.ts"
import type { BoardTargets } from "../../tools/stripboard/targets.ts"
import type { ClimbInput, Evaluation } from "../../tools/stripboard/climb.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import { score } from "./rank-fixtures.ts"

/**
 * The start: two resistors on four strips, each net's two holes on two
 * different strips and a wire bridging each pair.
 *
 * `R1` spans columns 1-6 at row 2 and `R2` columns 2-7 at row 7, so net `left`
 * sits on strips 1 and 2 and net `right` on strips 6 and 7, and `W1` and `W2`
 * join each pair. `F = 0 + 0.25*2 + 0 = 0.5` at the committed weights, with
 * `C = 0` because no strip carries two nets.
 *
 * The parts are at rows 2 and 7 rather than at the top edge because
 * `Board::RotateComps` turns about the rect's centre: a `1 x 6` part's centring
 * shift is `trunc((1 - 6) / 2) = -2` rows, so a part at row 0 or 1 would turn
 * to a negative row and the verb would refuse - and no `rotate` move would be
 * enumerated at all. The tempting summary *"every part is in row 0"* is false
 * in detail on the real boards too, so there is no row-0 case anywhere.
 */
export const BASE_DUMP = [
  "GRID 12 40",
  "BOUNDS 2,1 7,7",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 2,1 SPAN 6 DIRECTION W",
  "PART R2 RESISTOR 22K AT 7,2 SPAN 6 DIRECTION W",
  "PIN R1 1 AT 2,1",
  "PIN R1 2 AT 2,6",
  "PIN R2 1 AT 7,2",
  "PIN R2 2 AT 7,7",
  "NODE 1 NAME left R1.1 R2.1",
  "NODE 2 NAME right R1.2 R2.2",
  "WIRE W1 AT 3,1 ENDS 3,1,0,0 3,2,0,0",
  "WIRE W2 AT 3,6 ENDS 3,6,0,0 3,7,0,0",
  "",
].join("\n")

/**
 * The same circuit with `R2` aligned under `R1`, so each net sits on ONE strip
 * and neither wire is needed: `F = 0`.
 *
 * It is the improved candidate the scripted climb reaches, and it is a
 * different board rather than the same board with a line deleted - both nets'
 * holes move - so a test comparing the two is comparing two layouts.
 */
export const BETTER_DUMP = [
  "GRID 12 40",
  "BOUNDS 2,1 7,6",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 2,1 SPAN 6 DIRECTION W",
  "PART R2 RESISTOR 22K AT 7,1 SPAN 6 DIRECTION W",
  "PIN R1 1 AT 2,1",
  "PIN R1 2 AT 2,6",
  "PIN R2 1 AT 7,1",
  "PIN R2 2 AT 7,6",
  "NODE 1 NAME left R1.1 R2.1",
  "NODE 2 NAME right R1.2 R2.2",
  "",
].join("\n")

/**
 * One part at the TOP EDGE, which is the board on which no turn is takeable.
 *
 * `turnedRect` on a `1 x 6` rect at row 0 lands it at row -2, which pans the
 * board, so `--rotate` refuses - the same arithmetic that forces the two boards
 * above to put their parts at interior rows. It exists so the enumeration's
 * `turnsTakeable` guard has a board where it must say NO: on `BASE_DUMP` and
 * `BETTER_DUMP` every part turns, so a guard deleted outright would leave both
 * their rotate counts unchanged and no test would notice. A mutation run proved
 * that gap rather than it being foreseen.
 *
 * It is not graded and nothing scores it; `moves.test.ts` reads its enumeration
 * only.
 */
export const TOP_EDGE_DUMP = [
  "GRID 12 40",
  "BOUNDS 0,1 0,6",
  "VERO_TRACKS 1",
  "VERTICAL_STRIPS 1",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 0,1 SPAN 6 DIRECTION W",
  "PIN R1 1 AT 0,1",
  "PIN R1 2 AT 0,6",
  "NODE 1 NAME left R1.1",
  "NODE 2 NAME right R1.2",
  "",
].join("\n")

/** The reference export both boards are checked against - two parts, two nets. */
export const NETLIST = [
  "( { EESchema Netlist Version 1.1 created  2026-10-11T00:00:00 }",
  " ( /R1 RESISTOR4  R1 10K",
  "  (    1 left )",
  "  (    2 right )",
  " )",
  " ( /R2 RESISTOR4  R2 22K",
  "  (    1 left )",
  "  (    2 right )",
  " )",
  ")",
  "*",
  "",
].join("\n")

/** `--check`'s output for a matching, complete board: no `Schematic delta` heading at all. */
export const REPORT = ["Layout state", "left complete", "right complete", "Cuts: 0", ""].join("\n")

const RESISTOR = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"

/** Both parts are fitted with the resistor footprint `grade-fixtures.ts` also names. */
export const FOOTPRINTS: ReadonlyMap<string, string> = new Map([
  ["R1", RESISTOR],
  ["R2", RESISTOR],
])

export const DUMP = boardGeometry(BASE_DUMP)
export const BETTER = boardGeometry(BETTER_DUMP)
export const TOP_EDGE = boardGeometry(TOP_EDGE_DUMP)
export const REFERENCE = referenceNetsFromExport(NETLIST)

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
 * The name claims the bound is unset, so the fixture CHECKS it: if the
 * committed file ever configures one, every acceptance test below would be
 * running against `accepts`' refusal while reading as if it had tested the
 * rule.
 */
export function rulesWithoutWorseAcceptance(): StripboardRules {
  const rules = loadRules()
  if (rules.worseAcceptance !== null) {
    throw new Error(
      "rulesWithoutWorseAcceptance: the committed rules file configures worseAcceptance = " +
        `${rules.worseAcceptance}, so this fixture's name is false and every test using it ` +
        "would be exercising accepts()' refusal rather than the acceptance rule. Either E3 has " +
        "landed (Task 18) and these tests need rewriting, or the rules file changed by accident.",
    )
  }
  return rules
}

/** The same rules with a bound configured, for the refusal `E3` is deferred behind. */
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

const WRITE_VERBS: readonly string[] = ["--move", "--rotate", "--stretch", "--author", "--move-batch"]

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

/**
 * `--check`'s output for a board one of whose nets is not finished, and the
 * exit code that goes with it.
 *
 * `--check` EXITS 1 ON SUCH A BOARD, and that code is `HC1`'s own input rather
 * than a spawn failure. The dump text is unchanged, so `HC8`'s copper partition
 * still matches the netlist and `HC1` is the only constraint that fails - which
 * is what makes `best.admissibleA1 === false` attributable to one named cause.
 */
const INCOMPLETE_REPORT = ["Layout state", "left incomplete", "right complete", "Cuts: 0", ""].join(
  "\n",
)

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

/** A fresh run directory, so no two climbs in one suite share a scratch file. */
export function freshRunDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "stripboard-climb-"))
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
  }
}
