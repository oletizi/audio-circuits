/**
 * The three STARTING ARMS behind one selector, with random as the control.
 *
 * `SeedArm` and `SEED_ARMS` were carried here ahead of Task 16 itself, because
 * `tools/stripboard/run-dir.ts`'s `CanonicalInputs` names which arm produced a
 * candidate's seed and needed the type to import rather than redeclare
 * (CONTROLLER RULING 1, 2026-10-10 stripboard-pipeline Task 13). **The rest has
 * now arrived**: the selector and `seedCandidate` are below, the three arms and
 * the gesture driver are in `./seed-arms.ts`, and the derivations two of them
 * read - the strip assignment, the junction's nets, the enumerated position set
 * and the one seeded stream - are in `./seed-arrangement.ts`. Both are
 * re-exported from here, which is the module the plan names.
 *
 * **THIS IS AN EXPERIMENT, NOT A CONSTRUCTION, AND IT IS BUILT TO BE ABLE TO
 * COME OUT AGAINST THE CONSTRUCTED ARM.** A random start carries no theory that
 * can be wrong. A constructed start embeds a belief about what a good layout
 * looks like, and if the belief is off it is a worse-than-random start wearing a
 * principled costume - harder to detect than an obviously bad one, because
 * nobody re-examines a start that sounds right. `./seed-compare.ts` carries the
 * decision variable and the retirement rule, both declared before any run.
 *
 * **THERE IS NO DEFAULT ARM.** `SeedInput.arm` is required with no default, so
 * a caller that does not name an arm does not compile; `parseSeedArm("")`
 * refuses and lists the three. Nothing in this module or in the comparison
 * names a chosen arm.
 *
 * **ALL THREE ARMS START INVALID AND NONE IS PENALISED FOR IT.** `--check`
 * against the netlist exported from today's `physicalBoard(section)` reports 19,
 * 13, 7 and 6 incomplete nets on mid, hi-boost, hi-cut and low-cut, and
 * `--import`'s placement is `Board::AddComponent`'s `-1,-1` first-fit sweep that
 * never consults `parsed.m_nets` at all. The constructed arm moves and stretches
 * parts but routes no net; the random arm moves and rotates and routes no net
 * either. The repair burden is the search's work, common to all three.
 *
 * **ROTATION IS UNAVAILABLE ON EVERY COMMITTED PULTEC BOARD. MOVE BEFORE YOU
 * TURN.** Measured three times - rotatable 0, refused 60 across all five
 * sections - because `Board::RotateComps` turns about the rect's centre, so a
 * part near the top edge lands at a negative row and the board pans, and the
 * verb refuses rather than renumbering every hole. Forty-one refuse with the pan
 * and nineteen with the shared `FLOATING` refusal, and both are the fork's
 * answer, not a bug to route around. So every arm here that turns a part MOVES
 * IT FIRST: the measurement was taken on the import-placed board, where parts
 * sit at the top edge, and an interior origin is the one thing that might let a
 * turn through. The tempting summary *"every part is in row 0"* is false in
 * detail - `board_terminals` sits at row 1 on three boards and `pultec-mid`
 * spans rows 0-3 - so there is no row-0 special case anywhere below.
 *
 * **A TURN THE FORK REFUSES STOPS THE ARM AND NAMES THE PART.** The fork is the
 * authority on a direction it will not accept; nothing here guesses the set, and
 * no arm falls back to leaving the part as it was. The consequence, stated
 * because it is a real limit on this task's deliverable rather than a detail:
 * if an interior origin does not make rotation acceptable, the random arm stops
 * at the first part it draws a non-zero quarter-turn count for, and the measured
 * comparison - Task 18's final step - will report that rather than a rate.
 */
import path from "node:path"
import { drive, importGestures, randomGestures } from "./seed-arms.ts"
import { constructedGestures } from "./seed-constructed.ts"
import type { StripboardRules } from "./rules.ts"
import type { BoardTargets } from "./targets.ts"
import type { Occupancy } from "./seed-geometry.ts"

/**
 * The derivations the arms read. `./seed-arrangement.ts` declares the stream,
 * the draw and what the construction arranges; `./seed-geometry.ts` declares
 * what a gesture does to the board, transcribed from the fork's own
 * `Board::RotateComps`. This is the module the plan names and every consumer
 * imports, exactly as `tools/guide/dump.ts` re-exports `./dump-model.ts`.
 */
export {
  assignStrips,
  drawFrom,
  junctionNets,
  seededPrng,
  type StripAssignment,
} from "./seed-arrangement.ts"
export type { GestureSet } from "./seed-arms.ts"
export {
  occupancyOf,
  VEROROUTE_FOOTPRINT_ROWS,
  type Occupancy,
  type PartRect,
} from "./seed-geometry.ts"
export {
  admissibleOrigins,
  admissiblePositions,
  appliedGestures,
  GESTURE_ORDERS,
  rectOf,
  turnable,
  turnedRect,
  turnsTakeable,
  withPartMoved,
  withPartTurned,
  type GestureOrder,
} from "./seed-placement.ts"

export type SeedArm = "constructed" | "import" | "random"

/** Every member of `SeedArm`, in no particular order - only completeness is promised. */
export const SEED_ARMS: readonly SeedArm[] = ["constructed", "import", "random"]

/**
 * One invocation of the pinned fork, with stdout and stderr KEPT APART.
 *
 * **IT IS DELIBERATELY NOT `CheckRun` OR `CommandResult`, AND NEITHER OF THOSE
 * MOVES.** `tools/perfboard/check.ts`'s `CheckRun` and
 * `tools/perfboard/acquire.ts`'s `CommandResult` are both `{ status, output }`
 * and both CONCATENATE the two streams on purpose - `check.ts` states the
 * reason outright: *"the report body is on stdout, but an unreadable board
 * writes an empty report and puts the only diagnostic on stderr."* Three tasks
 * depend on that concatenation. This type needs them separate for a different
 * purpose: `--dump-board`'s board text is parsed from stdout and must not have
 * a warning spliced into it, while a refusal's wording is read off stderr. Two
 * different contracts for two different jobs, so there are two types and no
 * attempt to unify them.
 *
 * **IT IS INJECTED AND NEVER RESOLVED HERE.** `check.ts` throws when
 * `VEROROUTE` is unset rather than guessing a path, because *"a hardcoded
 * `$HOME/src/...` is right on exactly one machine and wrong everywhere else"*
 * and *"a spawn that quietly fails is the shape that reads as a clean board."*
 * Every test of this module injects.
 */
export type SpawnVeroroute = (args: readonly string[]) => {
  readonly status: number
  readonly stdout: string
  readonly stderr: string
}

/**
 * One arm, from text, refusing anything else by name.
 *
 * **THERE IS NO DEFAULT ARM**, so the empty string is refused like any other
 * unknown word rather than selecting one. The other half of that claim - that
 * `SeedInput.arm` is required - is the type checker's to prove, not a body's.
 */
export function parseSeedArm(text: string): SeedArm {
  const found = SEED_ARMS.find((arm) => arm === text)
  if (found === undefined) {
    throw new Error(
      `parseSeedArm: ${JSON.stringify(text)} is not a starting arm. The arms are ` +
        `${SEED_ARMS.join(", ")}. There is NO DEFAULT ARM and this does not choose one: the ` +
        "three are an experiment with random as its control, and an arm selected by a fallback " +
        "would be a comparison whose own treatment nobody named. Name one of the three.",
    )
  }
  return found
}

/** What one arm needs to produce one start. `arm` and `seed` are required. */
export interface SeedInput {
  /** The `--import`-placed board every arm begins from. */
  readonly importedBoard: string
  readonly targets: BoardTargets
  readonly runDir: string
  readonly rules: StripboardRules
  readonly arm: SeedArm
  readonly seed: number
}

/**
 * A started board and the part geometry that goes with it: **the handover
 * contract, and the two things about it that are easy to get wrong.**
 *
 * **1. THE BOARD IS UNPAINTED.** It carries `CUT_STATE UNRESOLVED` and nothing
 * may SCORE it as it stands - `HC2` refuses an unresolved cut list rather than
 * mis-scoring it, and that refusal is correct. The arms used to end with
 * `--author --op autofill` for exactly that reason, and the paint has moved to
 * the consumer because it was actively harmful here: `--move` REFUSES a
 * relocation that overlaps a part's own current footprint once `AutoFillVero`
 * has painted copper into the holes it would vacate, so a painted handover made
 * the first single-part move of any climb impossible
 * (`docs/stripboard/pipeline-verification.md` §5.3 has the three measurements).
 *
 * **WHO PAINTS, AND WHEN, so neither case reads as an oversight.**
 * `tools/stripboard/climb.ts` paints on EVERY evaluation - apply, autofill,
 * check, dump - into its own `-filled.vrt`, so it needs this board unpainted
 * and a painted one would break it. A consumer that wants to SCORE the start
 * itself - an `ArmRunner` reporting `ArmRun.startAdmissible`, say - paints a
 * COPY the same way and scores that, leaving this board alone. Nothing paints
 * in place and nothing paints here.
 *
 * **2. THE OCCUPANCY IS HANDED OVER AND MUST NOT BE RE-DERIVED.** `occupancyOf`
 * cannot read a board an arm has turned a part on, because a dump reports no
 * column extent for a part facing `N` or `S`. The arm holds the real geometry
 * at the moment it writes the board; `GestureSet` says why at more length.
 *
 * Three arms, one gesture driver: they differ in what they place and in nothing
 * else - one gesture at a time, every result checked, `-o` always. The import
 * arm emits no gesture, so its start is a COPY of the imported board, and its
 * name carries no seed because it has one start.
 */
export interface SeedStart {
  /** The started `.vrt` inside the run directory. **Unpainted** - see above. */
  readonly board: string
  /** The part geometry at that board, as the arm tracked it. */
  readonly occupancy: Occupancy
}

/** The started board and its occupancy, for the arm named in the input. */
export function seedCandidate(input: SeedInput, spawn: SpawnVeroroute): SeedStart {
  const built =
    input.arm === "constructed"
      ? constructedGestures(input, spawn)
      : input.arm === "random"
        ? randomGestures(input, spawn)
        : importGestures(input, spawn)
  const base = input.arm === "import" ? "import" : `${input.arm}-${input.seed}`
  const board = drive(
    spawn,
    input.importedBoard,
    built.gestures,
    (index) => path.join(input.runDir, `${base}-g${index}.vrt`),
    path.join(input.runDir, `${base}.vrt`),
  )
  return { board, occupancy: built.occupancy }
}

