/**
 * APPLYING one move to a board file: the fork's argument lists, the two
 * transports, and the refusal for a kind that cannot be applied.
 *
 * **SPLIT FROM `./moves.ts` FOR THE LINE CEILING, AT THE SEAM THAT FILE ALREADY
 * HAD**: `./moves.ts` answers *what can a candidate differ by* and this one
 * answers *how is one difference applied*. The same division as
 * `./constraints-model.ts` / `./constraints.ts` and `./seed-geometry.ts` /
 * `./seed-placement.ts`. `./moves.ts` stays the module the plan names and
 * re-exports this file, exactly as `./seed.ts` re-exports its own siblings, so
 * no consumer imports this directly and the plan's declared interface is
 * unchanged.
 *
 * Nothing here decides WHICH move to propose; `enumerateMoves` does that.
 */
import fs from "node:fs"
import { DEFERRED_KINDS, describeMove, type Move } from "./moves.ts"
import type { SpawnVeroroute } from "./seed.ts"

/**
 * How a candidate's gestures reach the fork.
 *
 * `one-gesture-per-launch` is the shipped interface and the default: one verb,
 * one process, one output file. `batched` routes the gesture through
 * `--move-batch`, whose own header states what it buys and what it does not:
 * *"It bounds the LAUNCH saving only ... And it widens how much of the search
 * space a run can cover, NOT whether the answers are right."* So the transport
 * is an optimisation and never a correctness question, which is exactly what
 * `tests/stripboard/climb.test.ts` asserts by running one climb each way.
 */
export type GestureTransport = "one-gesture-per-launch" | "batched"

/** The ops-file grammar's own vocabulary: the only two gestures `--move-batch` accepts. */
const BATCHABLE_KINDS: readonly Move["kind"][] = ["move", "rotate"]

function refuseDeferred(kind: Move["kind"]): never {
  const reason = DEFERRED_KINDS.get(kind)
  if (reason === undefined) {
    throw new Error(
      `applyMove: "${kind}" is not an applicable move kind and DEFERRED_KINDS carries no reason ` +
        "for it, so this cannot say what is missing. Add the kind to DEFERRED_KINDS with what " +
        "blocks it and where it gets fixed, or give applyMove an arm for it.",
    )
  }
  throw new Error(
    `applyMove: a "${kind}" move cannot be applied, and it is NOT SKIPPED - ${reason}.\nA move ` +
      "the climb could not apply and passed over silently would be a move set smaller than the " +
      "one the run records, which is the shape of defect this pipeline exists against. " +
      "tools/stripboard/moves.ts's applicableMoves() is how a caller leaves it out by " +
      "declaration instead.",
  )
}

/** The one-gesture argument list for a move the fork can apply in one invocation. */
function gestureFor(move: Move, board: string, out: string): readonly string[] {
  switch (move.kind) {
    case "move":
      return ["--move", board, "--ref", move.ref, "--to", `${move.to[0]},${move.to[1]}`, "-o", out]
    case "rotate":
      return ["--rotate", board, "--ref", move.ref, "--direction", move.direction, "-o", out]
    case "stretch":
      return ["--stretch", board, "--ref", move.ref, "--direction", move.direction, "-o", out]
    case "add-wire":
      // STILL IMPLEMENTED, THOUGH `DEFERRED_KINDS` KEEPS IT OUT OF THE CLIMB'S
      // SWEEP: the gesture itself is correct and placeable at a FREE hole, and
      // what the measurement in DEFERRED_KINDS rules out is this ENUMERATION's
      // anchor (a pin hole) and the default wire's reach (1x3 along the row).
      // Deleting the arm would make the kind unreachable even for a caller
      // holding a placeable one.
      //
      // `--author --op add-wire --at R,C` places a wire with its FIRST end at
      // (R,C) and takes no option for the second: the wire is created at the
      // WIRE type's own footprint and its far end follows from that footprint,
      // not from the request. So `ends[1]` is the pair of holes this move is
      // FOR and is not a command - the landed wire's real ends are read back
      // off the next `--dump-board`, which is where `F`'s `W` comes from. The
      // first end IS commandable, so a move whose `at` and `ends[0]` disagree
      // is refused below rather than applied as a gesture it does not describe.
      return ["--author", board, "--op", "add-wire", "--at", `${move.at[0]},${move.at[1]}`, "-o", out]
    case "delete-wire":
    case "cluster":
      return refuseDeferred(move.kind)
  }
}

/** The ops-file line for a batchable gesture, in `--move-batch`'s own grammar. */
function opsLineFor(move: Move): string {
  if (move.kind === "move") return `move ${move.ref} --to ${move.to[0]},${move.to[1]}`
  if (move.kind === "rotate") return `rotate ${move.ref} --direction ${move.direction}`
  throw new Error(
    `applyMove: a "${move.kind}" move has no --move-batch ops line. The ops grammar is "move ` +
      '<name> --to <row>,<col>", "move <name> --delta <row>,<col>" and "rotate <name> ' +
      '--direction cw|ccw", and the fork\'s own header says "Nothing else is accepted" - so ' +
      "this kind is applied through its one-gesture verb instead, which is what " +
      "BATCHABLE_KINDS decides. Reaching here means that list and this function disagree.",
  )
}

/**
 * Apply one move to `board`, writing the result to `out`.
 *
 * **`-o` ALWAYS, AND NEVER IN PLACE**: the fork's own rule, which every verb
 * meets, and the reason a climb can leave its start board untouched.
 *
 * **A NON-ZERO EXIT STOPS THE RUN AND NAMES THE GESTURE.** It is not retried,
 * no weaker gesture is substituted and the candidate is not skipped: the
 * enumeration is narrowed in advance by the model
 * (`tools/stripboard/seed-placement.ts`), so a refusal here means the model and
 * the binary disagree about what is placeable - which is a finding worth
 * stopping for, not a candidate to drop. The wording follows
 * `tools/stripboard/seed-arms.ts`'s, for the same reason.
 */
export function applyMove(
  board: string,
  move: Move,
  out: string,
  spawn: SpawnVeroroute,
  transport: GestureTransport = "one-gesture-per-launch",
): void {
  if (move.kind === "add-wire" && (move.at[0] !== move.ends[0][0] || move.at[1] !== move.ends[0][1])) {
    throw new Error(
      `applyMove: this add-wire move asks for a wire at ${move.at[0]},${move.at[1]} whose first ` +
        `end is ${move.ends[0][0]},${move.ends[0][1]}. --author --op add-wire places the wire's ` +
        "FIRST end at --at and accepts no other end option, so the two cannot both be honoured " +
        "and the gesture would not be the one this move describes. It is not reconciled by " +
        "preferring either field: which one the caller meant is not in the data. Build the move " +
        "through enumerateMoves, which sets both from the same hole.",
    )
  }
  const batched = transport === "batched" && BATCHABLE_KINDS.includes(move.kind)
  let args: readonly string[]
  if (batched) {
    const opsFile = `${out}.ops`
    fs.writeFileSync(opsFile, `${opsLineFor(move)}\n`)
    args = ["--move-batch", board, "--ops", opsFile, "-o", out]
  } else {
    args = gestureFor(move, board, out)
  }
  const result = spawn(args)
  if (result.status !== 0) {
    throw new Error(
      `applyMove: ${describeMove(move)} exited ${result.status}, so this candidate was not ` +
        `produced. The gesture was: ${args.join(" ")}\n${result.stdout}${result.stderr}\nIt is ` +
        "NOT retried, NO weaker gesture is substituted and the candidate is NOT skipped: " +
        "enumerateMoves proposes only gestures tools/stripboard/seed-placement.ts's transcribed " +
        "arithmetic says will land, so a refusal here means that model and the binary disagree " +
        "about what is placeable - which is the finding, not a candidate to drop. Check the " +
        "part's rect against VEROROUTE_FOOTPRINT_ROWS and the fork's own message above.",
    )
  }
}
