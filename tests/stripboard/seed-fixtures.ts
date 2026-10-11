/**
 * The boards, the injected spawns and the inputs `tests/stripboard/seed.test.ts`
 * and `tests/stripboard/seed-compare.test.ts` both read.
 *
 * IT IS NOT A `.test.ts` FILE: it is a helper two test files import, following
 * `./score-fixtures.ts` and `./grade-fixtures.ts`.
 *
 * **THE SPAWN IS ALWAYS INJECTED AND NO TEST HERE RUNS THE BINARY.**
 * `tools/perfboard/check.ts` throws when `VEROROUTE` is unset rather than
 * guessing a path, because *"a hardcoded `$HOME/src/...` is right on exactly
 * one machine and wrong everywhere else"* and *"a spawn that quietly fails is
 * the shape that reads as a clean board."* Every spawn below is a function.
 *
 * **A `--dump-board` THE SPAWN HAS NO TEXT FOR THROWS.** A scripted spawn that
 * answers everything makes every test of the arms a test of nothing: the arm
 * would read an empty board, enumerate nothing and emit nothing, and the
 * assertions would pass over a board that was never described.
 *
 * **THE SPAWN SIMULATES `--move` AND NOTHING ELSE, AND THAT BOUND IS THE
 * POINT.** `dumpOf` exists so the grid-does-not-grow test reads a real second
 * figure rather than comparing one fixture with itself, so the simulation
 * reproduces exactly the two measured facts that test is about: a `--move`
 * translates the named part's leads, and the board GROWS to cover a hole past
 * its edge - `--move --to 40,5` on a 35x35 board exits 0 and reports
 * `GRID 41 35`. `--rotate`, `--stretch` and `--author` leave the text
 * untouched. That is a real limit and not an oversight: the random arm emits
 * `--rotate` gestures, and a turn transposes a part's rect, so the simulated
 * board diverges from a real one as soon as a turn is emitted. **No test may
 * read anything off `dumpOf` but `GRID`.** What the random arm's bounds rest on
 * instead is the enumerated set's own maxima, asserted directly, and
 * `tests/stripboard/seed-geometry.test.ts` holds the turn model against the
 * real binary.
 */
import os from "node:os"
import path from "node:path"
import { physicalBoard } from "../../circuits/pultec/physical/board.ts"
import { loadRules } from "../../tools/stripboard/rules.ts"
import { deriveTargets, type BoardTargets } from "../../tools/stripboard/targets.ts"
import type { SeedArm, SeedInput, SpawnVeroroute } from "../../tools/stripboard/seed.ts"

/** Nothing below ever writes a file, so these paths are names and not locations. */
const FIXTURE_DIR = path.join(os.tmpdir(), "stripboard-seed-fixtures")
export const RUN_DIR = path.join(FIXTURE_DIR, "run")
export const IMPORTED_BOARD = path.join(FIXTURE_DIR, "imported.vrt")
export const REACHING_BOARD = path.join(FIXTURE_DIR, "reaching.vrt")
const CROWDED_BOARD = path.join(FIXTURE_DIR, "crowded.vrt")

/**
 * The import-placed low-boost board, reduced to eight parts that between them
 * name **all fourteen** of low-boost's nets.
 *
 * EVERY PART'S `SPAN` AGREES WITH ITS OWN LEAD HOLES, which is not decoration:
 * `tools/stripboard/seed-geometry.ts` reads `SPAN` as the footprint's column
 * count and refuses a part whose leads fall outside the rectangle its `AT` and
 * `SPAN` describe. A two-lead part one hole apart is `SPAN 2`.
 *
 * WHY ALL FOURTEEN rather than a convenient handful: the constructed arm's
 * gesture list is a function of the strip assignment, and `assignStrips`
 * perturbs the arrangement by transposing two adjacent blocks. A dump that left
 * some nets unreferenced could have its two transposed nets be exactly the
 * unreferenced ones, and then two different seeds would produce an identical
 * gesture list and the one-start test would pass for the wrong arm.
 *
 * EVERY PART IS IN ROW 0 HERE because that is what `--import`'s first-fit sweep
 * leaves, and it is also why the rotation measurement came out at zero. It is
 * NOT a general fact about these boards - `board_terminals` sits at row 1 on
 * three of them and `pultec-mid` spans rows 0-3 - and nothing in `seed.ts` has
 * a row-0 case.
 *
 * The five junction nets sit on `J1`, a `SIP5` at 1-hole pitch, in
 * `junctionSignalComponent`'s own pin order: `in`, `hi_boost_out`,
 * `lo_boost_in`, `out`, `0`.
 */
const IMPORTED_DUMP = [
  "GRID 35 35",
  "BOUNDS 0,0 0,25",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART J1 SIP5 Conn_01x05 AT 0,0 SPAN 5 DIRECTION W",
  "PART R1 RESISTOR 56K AT 0,6 SPAN 2 DIRECTION W",
  "PART R2 RESISTOR 47K AT 0,9 SPAN 2 DIRECTION W",
  "PART C19 CAP_FILM .22uF AT 0,12 SPAN 2 DIRECTION W",
  "PART C20 CAP_FILM .12uF AT 0,15 SPAN 2 DIRECTION W",
  "PART C21 CAP_FILM .068uF AT 0,18 SPAN 2 DIRECTION W",
  "PART R3 RESISTOR 10K AT 0,21 SPAN 2 DIRECTION W",
  "PART R4 RESISTOR 22K AT 0,24 SPAN 2 DIRECTION W",
  "PIN J1 1 AT 0,0",
  "PIN J1 2 AT 0,1",
  "PIN J1 3 AT 0,2",
  "PIN J1 4 AT 0,3",
  "PIN J1 5 AT 0,4",
  "PIN R1 1 AT 0,6",
  "PIN R1 2 AT 0,7",
  "PIN R2 1 AT 0,9",
  "PIN R2 2 AT 0,10",
  "PIN C19 1 AT 0,12",
  "PIN C19 2 AT 0,13",
  "PIN C20 1 AT 0,15",
  "PIN C20 2 AT 0,16",
  "PIN C21 1 AT 0,18",
  "PIN C21 2 AT 0,19",
  "PIN R3 1 AT 0,21",
  "PIN R3 2 AT 0,22",
  "PIN R4 1 AT 0,24",
  "PIN R4 2 AT 0,25",
  "NODE 1 NAME in J1.1 R1.1",
  "NODE 2 NAME hi_boost_out J1.2",
  "NODE 3 NAME lo_boost_in J1.3 R2.1",
  "NODE 4 NAME out J1.4 R2.2",
  "NODE 5 NAME 0 J1.5 C19.1",
  "NODE 6 NAME j10_p1 R1.2 R4.2",
  "NODE 7 NAME j10_p2 C19.2",
  "NODE 8 NAME j10_p3 C20.1",
  "NODE 9 NAME j10_p4 C20.2",
  "NODE 10 NAME j10_p5 C21.1",
  "NODE 11 NAME j10_p6 C21.2",
  "NODE 12 NAME si_hi_cut_j12_p3 R3.1",
  "NODE 13 NAME si_hi_cut_j4_p2 R3.2",
  "NODE 14 NAME si_hi_boost_j20_p3 R4.1",
  "",
].join("\n")

/**
 * A `pultec-mid` board on which the construction asks for a span no part can
 * make.
 *
 * `L1` IS A `RESISTOR` AND NOT AN `INDUCTOR` for one reason:
 * `VEROROUTE_FOOTPRINT_ROWS` records the four component types the five Pultec
 * boards actually place, and an inductor is not one of them - mid's and
 * hi-boost's inductors are panel-mount, carry a symbol rather than a footprint
 * and never reach a board. A fixture naming a type the whitelist refuses would
 * be testing the whitelist's refusal, which has its own test.
 *
 * `L1`'s two nets are `mid_tap_0r1h` and `mid_coil_return`, which the gathered
 * arrangement puts on strips 0 and 27 of mid's twenty-eight - a span of 28
 * holes, against the tool's own ceiling of 16. The two nets were chosen by
 * reading the arrangement, not invented: they are its first and last entries at
 * seed 0.
 */
const REACHING_DUMP = [
  "GRID 35 35",
  "BOUNDS 0,0 0,7",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART J1 SIP5 Conn_01x05 AT 0,0 SPAN 5 DIRECTION W",
  "PART L1 RESISTOR 1K AT 0,6 SPAN 2 DIRECTION W",
  "PIN J1 1 AT 0,0",
  "PIN J1 2 AT 0,1",
  "PIN J1 3 AT 0,2",
  "PIN J1 4 AT 0,3",
  "PIN J1 5 AT 0,4",
  "PIN L1 1 AT 0,6",
  "PIN L1 2 AT 0,7",
  "NODE 1 NAME in J1.1",
  "NODE 2 NAME hi_boost_out J1.2",
  "NODE 3 NAME lo_boost_in J1.3",
  "NODE 4 NAME out J1.4",
  "NODE 5 NAME 0 J1.5",
  "NODE 6 NAME mid_tap_0r1h L1.1",
  "NODE 7 NAME mid_coil_return L1.2",
  "",
].join("\n")

/**
 * A board on which `R1` has nowhere to go: a 1x3 grid where `X1`'s two leads
 * take the only holes `R1`'s two-hole pattern could occupy.
 *
 * **THIS BOARD IS NOT ONE THE FORK WOULD PRODUCE, AND SAYING SO IS THE HONEST
 * PART.** `R1`'s lead at `0,1` is also `X1`'s, which the fork's own `--move`
 * would refuse. It has to overlap, and that is a property of the question
 * rather than a shortcut: a part's CURRENT origin is always free of the other
 * parts, so on any board the fork could produce, a placed part always has at
 * least one admissible position - its own. The empty enumeration is reachable
 * only from a board where some other part has taken its holes, which is what
 * this fixture is. Nothing is asserted about this board except that
 * `admissiblePositions` comes back empty and the arm then refuses by name.
 *
 * `R1` IS FIRST IN THE PART ORDER so the refusal fires on the arm's first draw,
 * before any gesture is spawned.
 */
const CROWDED_DUMP = [
  "GRID 1 3",
  "BOUNDS 0,0 0,2",
  "VERTICAL_STRIPS 0",
  "CUT_STATE COMPUTED",
  "PART R1 RESISTOR 10K AT 0,0 SPAN 2 DIRECTION W",
  "PART X1 RESISTOR 10K AT 0,1 SPAN 2 DIRECTION W",
  "PIN R1 1 AT 0,0",
  "PIN R1 2 AT 0,1",
  "PIN X1 1 AT 0,1",
  "PIN X1 2 AT 0,2",
  "NODE 1 NAME a R1.1",
  "NODE 2 NAME b R1.2 X1.1",
  "NODE 3 NAME c X1.2",
  "",
].join("\n")

/**
 * Hand-written dump text, keyed by the gesture that produced it: `imported` is
 * what `--import`'s first-fit sweep leaves, and the other two are the boards the
 * two refusals need.
 */
export const DUMPS: Readonly<Record<string, string>> = {
  imported: IMPORTED_DUMP,
  reaching: REACHING_DUMP,
  crowded: CROWDED_DUMP,
}

/** Which named dump each board path holds. A path not here has no text and throws. */
const BOARD_KEYS: ReadonlyMap<string, string> = new Map([
  [IMPORTED_BOARD, "imported"],
  [REACHING_BOARD, "reaching"],
  [CROWDED_BOARD, "crowded"],
])

/**
 * The boards the simulated gestures produced, by their `-o` path. Keys carry
 * the arm and the seed, so two tests cannot collide on one.
 */
const SIMULATED = new Map<string, string>()

/** The dump text of a board a gesture wrote, or a refusal naming the path. */
export function dumpOf(board: string): string {
  const text = SIMULATED.get(board)
  if (text === undefined) {
    throw new Error(
      `dumpOf: no gesture in this test wrote ${board}, so there is no board text for it. It is ` +
        "not defaulted to the imported board: that would make the grid-does-not-grow assertion " +
        "compare one fixture with itself.",
    )
  }
  return text
}

function boardText(board: string, dumps: Readonly<Record<string, string>>): string {
  const simulated = SIMULATED.get(board)
  if (simulated !== undefined) return simulated
  const key = BOARD_KEYS.get(board)
  const text = key === undefined ? undefined : dumps[key]
  if (text === undefined) {
    throw new Error(
      `the injected spawn has no dump text for ${board}. It throws rather than returning an ` +
        "empty board: an arm handed an empty board enumerates nothing, emits nothing, and " +
        "every assertion about it passes over a board nobody described.",
    )
  }
  return text
}

/** The `-o` value, which every placing gesture carries and none derives itself. */
function outputOf(args: readonly string[]): string {
  const at = args.indexOf("-o")
  const out = at === -1 ? undefined : args[at + 1]
  if (out === undefined) {
    throw new Error(
      `the injected spawn was given a gesture with no -o: ${args.join(" ")}. The fork requires ` +
        "it on every write verb and has no in-place default.",
    )
  }
  return out
}

/**
 * `--move`'s effect on the dump text: the named part's `AT` and its `PIN` rows
 * and columns translate, and `GRID` grows to cover any hole past the edge.
 *
 * The growth is the measured fact, not a guess: `--move --to 40,5` on a 35x35
 * board exits 0 and reports `GRID 41 35`.
 */
function applyMove(text: string, ref: string, row: number, col: number): string {
  const partLine = new RegExp(`^PART ${ref} (\\S+) (\\S+) AT (\\d+),(\\d+)\\b`)
  let delta: readonly [number, number] | undefined
  const moved = text.split("\n").map((line) => {
    const part = partLine.exec(line)
    if (part !== null) {
      delta = [row - Number(part[3]), col - Number(part[4])]
      return line.replace(`AT ${part[3]},${part[4]}`, `AT ${row},${col}`)
    }
    return line
  })
  if (delta === undefined) {
    throw new Error(`the injected spawn was asked to move ${ref}, which is not a PART in this board`)
  }
  const [dRow, dCol] = delta
  const pinLine = new RegExp(`^PIN ${ref} (\\S+) AT (\\d+),(\\d+)$`)
  const translated = moved.map((line) => {
    const pin = pinLine.exec(line)
    if (pin === null) return line
    return `PIN ${ref} ${pin[1]} AT ${Number(pin[2]) + dRow},${Number(pin[3]) + dCol}`
  })
  let rows = 0
  let cols = 0
  for (const line of translated) {
    const pin = /^PIN \S+ \S+ AT (\d+),(\d+)$/.exec(line)
    if (pin === null) continue
    rows = Math.max(rows, Number(pin[1]) + 1)
    cols = Math.max(cols, Number(pin[2]) + 1)
  }
  return translated
    .map((line) => {
      const grid = /^GRID (\d+) (\d+)$/.exec(line)
      if (grid === null) return line
      return `GRID ${Math.max(Number(grid[1]), rows)} ${Math.max(Number(grid[2]), cols)}`
    })
    .join("\n")
}

function answer(
  args: readonly string[],
  dumps: Readonly<Record<string, string>>,
): { readonly status: number; readonly stdout: string; readonly stderr: string } {
  const verb = args[0]
  const board = args[1]
  if (verb === undefined || board === undefined) {
    throw new Error(`the injected spawn was given ${args.length} arguments: ${args.join(" ")}`)
  }
  if (verb === "--dump-board") {
    return { status: 0, stdout: boardText(board, dumps), stderr: "" }
  }
  const before = boardText(board, dumps)
  const to = args.indexOf("--to")
  const ref = args[args.indexOf("--ref") + 1]
  const after =
    verb === "--move" && to !== -1 && ref !== undefined
      ? applyMove(before, ref, Number(args[to + 1]?.split(",")[0]), Number(args[to + 1]?.split(",")[1]))
      : before
  SIMULATED.set(outputOf(args), after)
  return { status: 0, stdout: "", stderr: "" }
}

/** Records every argument list, answers `--dump-board` from `dumps`, simulates `--move`. */
export function recordingSpawn(
  spawned: string[][],
  dumps: Readonly<Record<string, string>>,
): SpawnVeroroute {
  return (args) => {
    spawned.push([...args])
    return answer(args, dumps)
  }
}

/** The same spawn without the recording, for tests that read no argument list. */
export function fakeSpawn(): SpawnVeroroute {
  return (args) => answer(args, DUMPS)
}

const TARGETS = new Map<string, BoardTargets>()

/**
 * One section's targets, computed once.
 *
 * `stockRows` comes from `loadRules()` and is not inlined: HC6 owns the stock
 * figure and the rules file is how it reaches the pipeline, so a literal here
 * would let the two drift.
 */
export function targetsFor(section: string): BoardTargets {
  const held = TARGETS.get(section)
  if (held !== undefined) return held
  const built = deriveTargets(physicalBoard(section), loadRules().stockRows, `pultec-${section}`)
  TARGETS.set(section, built)
  return built
}

/** The input every arm is run on: the import-placed low-boost board. */
export function input(): SeedInput {
  return {
    importedBoard: IMPORTED_BOARD,
    targets: targetsFor("low-boost"),
    runDir: RUN_DIR,
    rules: loadRules(),
    arm: "import",
    seed: 0,
  }
}

/** An input whose construction asks for a span no part can reach. */
export function reachingInput(arm: SeedArm): SeedInput {
  return {
    importedBoard: REACHING_BOARD,
    targets: targetsFor("mid"),
    runDir: RUN_DIR,
    rules: loadRules(),
    arm,
    seed: 0,
  }
}

/** An input whose dump leaves `R1` no position that fits. */
export function crowdedInput(): SeedInput {
  return {
    importedBoard: CROWDED_BOARD,
    targets: targetsFor("low-boost"),
    runDir: RUN_DIR,
    rules: loadRules(),
    arm: "random",
    seed: 0,
  }
}
