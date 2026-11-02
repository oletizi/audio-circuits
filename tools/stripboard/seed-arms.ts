/**
 * The three arms' gesture lists, and the driver that spawns them.
 *
 * `./seed.ts` owns the vocabulary - `SeedArm`, `SEED_ARMS`, `parseSeedArm`,
 * `SpawnVeroroute`, `SeedInput` - and `seedCandidate`, which dispatches into the
 * builders. This file holds the gesture type, the four gesture constructors, the
 * spawn driver and the IMPORT and RANDOM arms; the constructed arm is most of the
 * work and lives in `./seed-constructed.ts`.
 *
 * **THE IMPORT IS ONE-DIRECTIONAL AT RUNTIME.** `./seed.ts` imports these
 * builders as values; this file imports `SeedInput` and `SpawnVeroroute` from
 * it as TYPES ONLY, which erase, so there is no runtime cycle - only a
 * type-level one, which the compiler resolves. Nothing here reads a value out
 * of `./seed.ts`.
 *
 * The constraint every arm here inherits, and the reason it is restated rather
 * than left to the sibling file: **rotation is unavailable on every committed
 * Pultec board - rotatable 0, refused 60 - so move before you turn, and a turn
 * the fork refuses stops the arm and names the part.** `./seed.ts`'s module
 * comment has the measurement and the two refusal shapes.
 */
import fs from "node:fs"
import { parseBoardDump, type BoardDump } from "../guide/dump.ts"
import { drawFrom, seededPrng } from "./seed-arrangement.ts"
import { occupancyOf, type Occupancy } from "./seed-geometry.ts"
import {
  admissibleOrigins,
  turnsTakeable,
  withPartMoved,
  withPartTurned,
} from "./seed-placement.ts"
import type { SeedInput, SpawnVeroroute } from "./seed.ts"

/**
 * What an arm produces: the gestures to drive, and the PART GEOMETRY it holds
 * at the moment it has finished deciding.
 *
 * **THE OCCUPANCY IS HANDED OVER BECAUSE IT IS THE ONE THING A DUMP CANNOT
 * EXPRESS.** For a part facing `N` or `S` the dump's `SPAN` is the footprint's
 * ROW count and its stretched length appears in no line at all (COST §7.3 item
 * 2 - `GetCompRows`), so `occupancyOf` REFUSES a board any arm has turned a
 * part on. Every arm here already TRACKS the occupancy as it emits gestures,
 * for exactly that reason; recovering it afterwards is impossible and handing
 * it over costs nothing.
 *
 * Measured, before this was handed over: the constructed and random arms
 * produced a start that Task 17's climb could not read at all, refusing with
 * `part "C18": it faces N` on the first enumeration
 * (`docs/stripboard/pipeline-verification.md` §5.7).
 */
export interface GestureSet {
  readonly gestures: readonly Gesture[]
  readonly occupancy: Occupancy
}

/** One gesture: the verb, its own arguments, and what it is for, for a refusal. */
export interface Gesture {
  readonly verb: string
  readonly tail: readonly string[]
  readonly what: string
}

export function move(ref: string, row: number, col: number, note = ""): Gesture {
  return {
    verb: "--move",
    tail: ["--ref", ref, "--to", `${row},${col}`],
    what: `moving ${ref}${note === "" ? "" : ` ${note}`}`,
  }
}

export function rotate(ref: string, note = ""): Gesture {
  return {
    verb: "--rotate",
    tail: ["--ref", ref, "--direction", "cw"],
    what: `turning ${ref} a quarter turn clockwise${note === "" ? "" : ` (${note})`}`,
  }
}

export function stretch(ref: string, direction: "grow" | "shrink", note = ""): Gesture {
  return {
    verb: "--stretch",
    tail: ["--ref", ref, "--direction", direction],
    what: `stretching ${ref} (${direction}${note === "" ? "" : `, ${note}`})`,
  }
}

/** One spawn, checked. Nothing here reads a verdict out of a report body. */
function run(spawn: SpawnVeroroute, args: readonly string[], what: string): string {
  const result = spawn(args)
  if (result.status !== 0) {
    throw new Error(
      `seedCandidate: ${what} exited ${result.status}, so this start was not produced. The ` +
        `gesture was: ${args.join(" ")}\n${result.stdout}${result.stderr}\nIt is not retried ` +
        "and no weaker gesture is substituted: the fork is the authority on a placement it " +
        "will not accept, and a start assembled from the gestures that happened to succeed is " +
        "a start nobody specified.",
    )
  }
  return result.stdout
}

/** The board, text and parsed from the SAME string so the two cannot differ. */
export function readBoard(
  spawn: SpawnVeroroute,
  board: string,
): { readonly text: string; readonly dump: BoardDump } {
  const text = run(spawn, ["--dump-board", board], `reading ${board}`)
  return { text, dump: parseBoardDump(text) }
}

/**
 * Drive the gestures one at a time, each reading the previous one's output and
 * writing a fresh file, `-o` always, the last one landing on `candidate`.
 *
 * `-o` ON EVERY GESTURE is the fork's own rule, which every verb meets: never
 * write to a path it derived itself, no in-place default. Every output is inside
 * the run directory, so a failed run leaves the imported board untouched.
 */
export function drive(
  spawn: SpawnVeroroute,
  from: string,
  gestures: readonly Gesture[],
  stage: (index: number) => string,
  candidate: string,
): string {
  // AN ARM WITH NO GESTURES HANDS OVER A COPY, which is the import arm: its
  // start IS `--import`'s own placement with nothing done to it, and now that
  // the paint has moved to the consumer there is no gesture left to express
  // that. The copy is not a gesture and does not go through the fork - it only
  // puts the start where the run directory wants it, so a failed run still
  // leaves the imported board untouched.
  //
  // THE REFUSAL THIS REPLACES said an arm with no gestures had painted nothing
  // and that "every arm ends with --author --op autofill". Both halves are now
  // false by design: see `SeedStart` for who paints and when.
  if (gestures.length === 0) {
    fs.copyFileSync(from, candidate)
    return candidate
  }
  let current = from
  gestures.forEach((gesture, index) => {
    const out = index === gestures.length - 1 ? candidate : stage(index)
    run(spawn, [gesture.verb, current, ...gesture.tail, "-o", out], gesture.what)
    current = out
  })
  return current
}

/**
 * The **import** arm: `--import`'s own placement, the ribbon, copied into the
 * run directory UNPAINTED and otherwise untouched.
 *
 * It emits no gesture at all - not even a paint. `SeedStart` carries why, and
 * who paints instead.
 *
 * It costs nothing to include because it is what exists, and it is the only arm
 * with no code behind its placement at all. **It has exactly one start**: the
 * seed changes nothing about it, so its candidate path carries no seed either
 * and its restarts repeat the same start. That asymmetry is recorded rather than
 * corrected - randomising it would make it a second random arm wearing the
 * ribbon's name.
 */
export function importGestures(input: SeedInput, spawn: SpawnVeroroute): GestureSet {
  // It emits no gesture at all: its start is what --import left, unchanged.
  // `drive` therefore hands over a copy, and the occupancy is read from the
  // imported board - which is readable precisely because this arm turns
  // nothing.
  return { gestures: [], occupancy: occupancyOf(readBoard(spawn, input.importedBoard).dump) }
}

/**
 * The **random** arm, which is the control and the null hypothesis: every part
 * moved to a position drawn uniformly from `admissiblePositions` and turned by a
 * quarter-turn count drawn uniformly from `{0, 1, 2, 3}`, in the dump's part
 * order.
 *
 * - **In bounds, and the grid must not grow.** The draw indexes an enumerated
 *   set that is in-bounds by construction, for the reason
 *   `admissiblePositions` states: a draw outside the grid pans or grows the
 *   board and renumbers every hole the next draw is about to use.
 * - **It changes no span.** It moves and turns whole parts and never stretches,
 *   so every part's span is exactly what `--import` gave it - one fewer
 *   difference between the arms, and `HC5`/`HC9` see the same spans on all three.
 * - **It is not a retry loop.** The set is enumerated and the draw is an index
 *   into it, so a part with nowhere to go refuses by name through `drawFrom`
 *   rather than spinning or falling back to where it was.
 * - **Four quarter-turns being a full turn is arithmetic, not a parameter**, so
 *   `{0, 1, 2, 3}` is written once, here.
 *
 * **THE TURN COUNT IS DRAWN FIRST, AND THE ORIGIN IS THEN DRAWN FROM THE
 * ORIGINS THAT COUNT CAN BE TAKEN FROM.** An origin a part cannot be turned from
 * is not an admissible origin for a part that is about to be turned, and
 * discovering that by attempting the turn would make this arm a retry loop -
 * which reshapes the distribution the control exists to be. `turnsTakeable`
 * narrows the set in advance, from the fork's own rotation arithmetic
 * (`./seed-geometry.ts`), and the narrowing is stated rather than hidden: the
 * arm draws uniformly over *the origins from which the drawn gesture can be
 * applied*, not over every origin the part fits at.
 *
 * **MOVE BEFORE YOU TURN, and the measurement that settles it.** On an
 * `--import --strips horizontal` low-boost board, 0 of 17 parts rotate where the
 * first-fit sweep left them and 17 of 17 rotate after a move to an interior
 * origin. The "rotatable 0, refused 60" sweep was taken on the COMMITTED boards,
 * which is not where any arm starts.
 */
const QUARTER_TURNS: readonly number[] = [0, 1, 2, 3]

export function randomGestures(input: SeedInput, spawn: SpawnVeroroute): GestureSet {
  const { dump } = readBoard(spawn, input.importedBoard)
  const grid = dump.grid
  const draw = seededPrng(input.seed)
  const gestures: Gesture[] = []
  let working = occupancyOf(dump)
  // The DUMP'S PART ORDER, never an iteration over a hash map: Task 17's rule
  // for a deterministic enumeration, and the same reason - a seed has to name
  // one sequence of draws.
  for (const part of dump.parts) {
    const turns = drawFrom(QUARTER_TURNS, draw)
    const positions = admissibleOrigins(working, grid, part.ref).filter((origin) =>
      turnsTakeable(working, grid, part.ref, origin, turns),
    )
    if (positions.length === 0) {
      throw new Error(
        `seedCandidate: the random arm has no admissible position for ${part.ref} that it can ` +
          `then take ${turns} clockwise quarter turn(s) from, on a ${grid.rows}x${grid.cols} ` +
          `grid beside the parts already placed (${[...working.keys()].filter((ref) => ref !== part.ref).join(", ")}). ` +
          "It is NOT retried, the turn count is NOT reduced, and the part is NOT left where it " +
          "was: a start that quietly keeps one part's imported position is not the draw it " +
          "claims to be, a retry would reshape the control arm's own distribution, and a " +
          "reduced turn count would be a different gesture than the one drawn.",
      )
    }
    const to = drawFrom(positions, draw)
    gestures.push(move(part.ref, to[0], to[1]))
    working = withPartMoved(working, part.ref, to)
    // MOVE BEFORE YOU TURN, and the occupancy follows EVERY gesture emitted -
    // not only the moves. A turn transposes the part's rect, so a model that
    // tracked moves alone let a later draw propose a hole an earlier turn had
    // taken; that is what stopped this arm on C23 at seed 4.
    for (let turn = 0; turn < turns; turn += 1) {
      gestures.push(rotate(part.ref))
      working = withPartTurned(working, grid, part.ref)
    }
  }
  return { gestures, occupancy: working }
}

