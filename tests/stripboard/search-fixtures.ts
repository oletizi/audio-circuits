
/**
 * The search's inputs, the two injected spawns they run against, and the
 * splitter that reads one restart's start sequence out of a spawn record: what
 * `tests/stripboard/escapes-search.test.ts` reads.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper a test file imports, following
 * `./climb-fixtures.ts` and five others. **`./escapes-fixtures.ts` IS THE OTHER
 * HALF**, holding the boards `E1`'s own tests are asserted on. The two were one
 * file until it passed the 500-line ceiling, and the seam is the task's own.
 *
 * **NO SPAWN HERE SIMULATES A GESTURE, AND THAT BOUND IS THE POINT.** Both
 * answer `--dump-board` from a script - one keyed by how many dumps have been
 * asked for, the other by which board was asked about - so the board a candidate
 * reports is the script's and not the move's effect. What the tests built on
 * them assert is the RESTART BOOKKEEPING and the SPAWN RECORD; the fork's
 * geometry is `./seed-geometry.test.ts`'s, against the real binary.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { referenceNetsFromExport } from "../../tools/stripboard/equivalence.ts"
import { stockFor } from "../../tools/stripboard/grade.ts"
import { loadRules, type StripboardRules } from "../../tools/stripboard/rules.ts"
import type { SearchInput } from "../../tools/stripboard/search.ts"
import type { SpawnVeroroute } from "../../tools/stripboard/seed.ts"
import { BASE_DUMP, BETTER_DUMP, REPORT } from "./climb-fixtures.ts"
import { DUMPS, IMPORTED_BOARD, targetsFor } from "./seed-fixtures.ts"

/** A fresh run directory, so no two searches in one suite share a scratch file. */
export function freshSearchDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "stripboard-search-"))
}

/**
 * The committed rules, with the bound this task implements asserted UNSET.
 *
 * `./climb-fixtures.ts`'s `rulesWithoutWorseAcceptance` makes the same check for
 * the same reason, and it is repeated rather than imported with a different
 * name: the tests here read the flag `RunResult.worseAcceptanceRan` reports, and
 * if the committed file ever configured a bound those tests would be asserting
 * `false` about a run that had one.
 */
export function committedRules(): StripboardRules {
  const rules = loadRules()
  if (rules.worseAcceptance !== null) {
    throw new Error(
      `committedRules: stripboard/rules.json configures worseAcceptance = ${rules.worseAcceptance}, ` +
        "so every test here that expects E3 not to have run would be reading the flag of a run " +
        "that did run it. The committed file records the bound as deliberately unset (null), " +
        "with its reason in the notes; this refuses rather than spreading over it.",
    )
  }
  return rules
}

/** The same rules with a bound configured, which is what turns `E3` on. */
export function rulesWithBound(bound: number): StripboardRules {
  return { ...committedRules(), worseAcceptance: bound }
}

/** The same rules with one seed, for the tests that drive a single climb. */
export function rulesWithSeeds(seeds: readonly number[]): StripboardRules {
  return { ...committedRules(), seeds }
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
 * The board the `import` arm's searches start from: `./climb-fixtures.ts`'s
 * `BASE_DUMP`, written as a real file because `drive` COPIES it.
 *
 * The import arm emits no gesture now that the paint has moved to the consumer,
 * so its start is `fs.copyFileSync`'s output and the source has to exist. The
 * content is dump text rather than a real `.vrt`, which nothing here parses: the
 * spawn is injected and answers `--dump-board` from a script.
 */
function baseBoardFile(runDir: string): string {
  const file = path.join(runDir, "imported.vrt")
  fs.writeFileSync(file, BASE_DUMP)
  return file
}

function netlistFile(runDir: string, text: string): string {
  const file = path.join(runDir, "reference.net")
  fs.writeFileSync(file, text)
  return file
}

/** `./climb-fixtures.ts`'s two-part netlist, reused so the boards and the nets agree. */
const BASE_NETLIST = [
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

const RESISTOR_FOOTPRINT = "Resistor_THT:R_Axial_DIN0207_L6.3mm_D2.5mm_P10.16mm_Horizontal"

/**
 * One search over the `BASE_DUMP` world, on the `import` arm.
 *
 * **THE IMPORT ARM HAS EXACTLY ONE START AND THE SEED CHANGES NOTHING ABOUT
 * IT**, which is what makes it the arm these restart-bookkeeping tests use: five
 * climbs from one board, so a difference between two climbs can only have come
 * from the SCRIPT and not from the start. The arm's own per-seed behaviour is
 * `startSequences`' test, on the two arms that have one.
 */
export function searchInput(runDir: string): SearchInput {
  const rules = committedRules()
  return {
    importedBoard: baseBoardFile(runDir),
    runDir,
    netlist: netlistFile(runDir, BASE_NETLIST),
    targets: targetsFor("low-boost"),
    reference: referenceNetsFromExport(BASE_NETLIST),
    footprints: new Map([
      ["R1", RESISTOR_FOOTPRINT],
      ["R2", RESISTOR_FOOTPRINT],
    ]),
    stock: stockFor(LOW_BOOST_DECLARATION, rules),
    rules,
    batch: false,
    arm: "import",
  }
}

/**
 * The dump script every `--dump-board` of a search is answered from, keyed by
 * HOW MANY DUMPS HAVE BEEN ASKED FOR - `./climb-fixtures.ts`'s `DumpScript`,
 * and the indices below are counted off the same arithmetic.
 *
 * **ONE CLIMB OF THE `import` ARM ON `BASE_DUMP` SPENDS 94 DUMPS**, hand-derived
 * and written out here because three scripts and four expectations are stated in
 * terms of it:
 *
 * - 1 for the arm, which reads the imported board to take its occupancy off it;
 * - 1 for the start evaluation;
 * - 92 for round 0's candidates - the applicable move set of `BASE_DUMP`:
 *   8 one-hole moves, 2 clockwise turns, 4 stretches, 8 net clusters
 *   (2 nets x 4 unit deltas) and 70 gathers (each of the two nets onto every
 *   column of the 40-wide grid the whole net fits on, 35 each), the add-wires
 *   and delete-wires being deferred. `./moves.test.ts` derives all of those.
 *
 * With every dump the same board, nothing is accepted, `S3` ends the climb after
 * round 0 and the next climb's arm read is dump 94.
 */
export const DUMPS_PER_STALLED_CLIMB = 94

/** Every evaluation reports `BASE_DUMP`: every climb stalls in round 0. */
export const STALLS_IMMEDIATELY_EVERY_SEED = (): string => BASE_DUMP

/**
 * The FIRST candidate of the SECOND climb reports the better board, and nothing
 * else does.
 *
 * Climb 0 spends dumps 0-93 and stalls. Climb 1's arm read is dump 94, its start
 * is dump 95 and its first candidate is dump 96 - so that one index is
 * `BETTER_DUMP` and every other is `BASE_DUMP`. There is no "and thereafter"
 * branch: the function answers every index explicitly.
 */
export const SECOND_SEED_WINS = (dumpIndex: number): string =>
  dumpIndex === DUMPS_PER_STALLED_CLIMB + 2 ? BETTER_DUMP : BASE_DUMP

const WRITTEN = "written by tests/stripboard/escapes-fixtures.ts's injected spawn, not by the fork"

const WRITE_VERBS: readonly string[] = [
  "--move",
  "--rotate",
  "--stretch",
  "--author",
  "--move-batch",
]

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

function answer(
  args: readonly string[],
  dumpFor: (index: number) => string,
  state: { dumps: number },
): { readonly status: number; readonly stdout: string; readonly stderr: string } {
  const verb = args[0]
  if (verb === "--dump-board") {
    const text = dumpFor(state.dumps)
    state.dumps += 1
    return { status: 0, stdout: text, stderr: "" }
  }
  // --check's EXIT CODE IS DATA, not a spawn failure: HC1 reads it. These
  // boards' nets are complete, so it is 0 with the matching report.
  if (verb === "--check") return { status: 0, stdout: REPORT, stderr: "" }
  if (verb !== undefined && WRITE_VERBS.includes(verb)) {
    fs.writeFileSync(outputOf(args), `${WRITTEN}\n${args.join(" ")}\n`)
    return { status: 0, stdout: "", stderr: "" }
  }
  throw new Error(
    `the injected spawn has no answer for "${verb ?? ""}": ${args.join(" ")}. It throws rather ` +
      "than returning status 0 with empty output, because a spawn that answers everything makes " +
      "every assertion about the search pass over invocations nobody described.",
  )
}

/** Answers `--dump-board` from `script`, `--check` complete, and writes every `-o`. */
export function searchSpawn(script: (index: number) => string): SpawnVeroroute {
  const state = { dumps: 0 }
  return (args) => answer(args, script, state)
}

/** The same spawn, recording every argument list. */
export function recordingSearchSpawn(
  spawned: string[][],
  script: (index: number) => string,
): SpawnVeroroute {
  const state = { dumps: 0 }
  return (args) => {
    spawned.push([...args])
    return answer(args, script, state)
  }
}

/* ------------------------------------------------------------------------- *
 * The low-boost world, for the one test that needs an arm with five starts.
 * ------------------------------------------------------------------------- */

/**
 * Two REAL refs of the import-placed low-boost board, on a board shaped like
 * `BASE_DUMP`.
 *
 * **WHY THE TWO PHASES OF THIS FIXTURE DESCRIBE DIFFERENT BOARDS, STATED
 * OUTRIGHT.** The `random` and `constructed` arms only work against the real
 * capture: the construction recovers net identity by JOINING each `NODE` line's
 * pin set against the model's own fourteen nets (`--import` writes every `NODE`
 * line `NAME -`), so a reduced board cannot be joined at all. The CLIMB that
 * follows, on the other hand, sweeps the move set of whatever board its dumps
 * describe - and the real one has seventeen parts, which is a hundred-odd
 * candidates per round per climb and five climbs per arm. So the arm reads the
 * real capture and the climb's own dumps are these two parts, whose refs are
 * taken FROM that capture so that the carried occupancy covers them.
 *
 * What the test built on this reads is the SPAWN RECORD of the start sequences -
 * which arm produced each start, and how many - and nothing about the climb at
 * all. `./climb-fixtures.ts` states the same bound on itself: these spawns
 * assert the bookkeeping, never the fork's geometry.
 */
const LOW_BOOST_PAIR = ["R2", "SI_HI_CUT_R1"] as const

/**
 * `BASE_DUMP` with `R1` renamed to the capture's `SI_HI_CUT_R1`, and its two
 * nets kept.
 *
 * `R2` needs no rename: the capture carries a `PART R2 RESISTOR 56K` of its own,
 * so both refs of this reduced board are refs the arms' occupancy covers. The
 * rename is a plain substring replace and is safe on this text because `R1`
 * occurs in it only as that ref - in its `PART`, its two `PIN` lines and its two
 * `NODE` pin names.
 */
/**
 * **THE GRID IS THE CAPTURE'S 35x35 AND NOT `BASE_DUMP`'S 12x40**, which is
 * forced rather than cosmetic: `enumerateMoves` takes each part's rect from the
 * CARRIED occupancy - the arm's own, on the real board - and its bounds from the
 * DUMP's grid, so a dump describing a smaller board puts every part out of
 * bounds and the move set comes back empty. The climb refuses an empty move set
 * by name, which is how this was found rather than guessed.
 */
const REDUCED_DUMP = BASE_DUMP.replace(/R1/g, LOW_BOOST_PAIR[1]).replace(
  "GRID 12 40",
  "GRID 35 35",
)

const REDUCED_NETLIST = BASE_NETLIST.replace(/R1/g, LOW_BOOST_PAIR[1])

/**
 * The dump every evaluation of a low-boost search is answered with, and the
 * imported capture for the arm's own read.
 *
 * The arm reads `IMPORTED_BOARD` exactly once per restart - its first act - and
 * emits gestures afterwards without reading again, so the two answers cannot be
 * confused for one another.
 */
function lowBoostAnswer(
  args: readonly string[],
): { readonly status: number; readonly stdout: string; readonly stderr: string } {
  const verb = args[0]
  const board = args[1]
  if (verb === "--dump-board") {
    const imported = DUMPS["imported"]
    if (imported === undefined) {
      throw new Error("the seed fixtures no longer carry the imported low-boost capture")
    }
    return { status: 0, stdout: board === IMPORTED_BOARD ? imported : REDUCED_DUMP, stderr: "" }
  }
  if (verb === "--check") return { status: 0, stdout: REPORT, stderr: "" }
  if (verb !== undefined && WRITE_VERBS.includes(verb)) {
    fs.writeFileSync(outputOf(args), `${WRITTEN}\n${args.join(" ")}\n`)
    return { status: 0, stdout: "", stderr: "" }
  }
  throw new Error(
    `the injected spawn has no answer for "${verb ?? ""}": ${args.join(" ")}.`,
  )
}

/** The low-boost spawn, recording every argument list. */
export function recordingLowBoostSpawn(spawned: string[][]): SpawnVeroroute {
  return (args) => {
    spawned.push([...args])
    return lowBoostAnswer(args)
  }
}

/** One search over the low-boost capture, on the arm the caller names. */
export function lowBoostSearchInput(
  runDir: string,
  arm: SearchInput["arm"],
): SearchInput {
  const rules = committedRules()
  return {
    importedBoard: IMPORTED_BOARD,
    runDir,
    netlist: netlistFile(runDir, REDUCED_NETLIST),
    targets: targetsFor("low-boost"),
    reference: referenceNetsFromExport(REDUCED_NETLIST),
    footprints: new Map([
      [LOW_BOOST_PAIR[0], RESISTOR_FOOTPRINT],
      [LOW_BOOST_PAIR[1], RESISTOR_FOOTPRINT],
    ]),
    stock: stockFor(LOW_BOOST_DECLARATION, rules),
    rules,
    batch: false,
    arm,
  }
}

/**
 * The per-restart START SEQUENCES of a recorded search: each one the arm's own
 * read and gestures, up to and including the `--author --op autofill` that
 * paints the start its climb then evaluates.
 *
 * **IT BEGINS AT THE ARM'S READ OF THE BOARD EVERY ARM STARTS FROM**, which is
 * every arm's first act and happens once per restart, and it ends at the paint -
 * so a climb's own candidate gestures, which come after that paint, are in no
 * sequence. Splitting on the paint ALONE would have put the previous climb's
 * candidates in the next sequence, and the climb emits `--stretch` candidates,
 * which is exactly the token the test reads.
 *
 * **IT THROWS ON A RECORD WITH NO PAINT IN IT**, because a splitter that
 * returned an empty list would make every assertion over its result pass over
 * nothing.
 */
export function startSequences(
  spawned: readonly (readonly string[])[],
  importedBoard: string,
): readonly (readonly (readonly string[])[])[] {
  const isPaint = (args: readonly string[]): boolean =>
    args[0] === "--author" && args.includes("--op") && args.includes("autofill")
  if (!spawned.some(isPaint)) {
    throw new Error(
      "startSequences: the recorded invocations contain no `--author --op autofill` at all, so " +
        "no start sequence can be closed and this would return an empty list. Every evaluation " +
        "paints, so a record without one is a record of a search that never evaluated anything " +
        "- which is the fault to report, not a list to return empty.",
    )
  }
  const sequences: (readonly string[])[][] = []
  let current: (readonly string[])[] | undefined
  for (const args of spawned) {
    const reads = args[0] === "--dump-board" && args[1] === importedBoard
    if (reads) current = []
    if (current === undefined) continue
    current.push(args)
    if (isPaint(args)) {
      sequences.push(current)
      current = undefined
    }
  }
  return sequences
}
