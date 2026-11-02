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
import { DEFERRED_KINDS, describeMove, type Move } from "./moves-model.ts"
import type { Translation } from "./moves-cluster.ts"
import type { WirePlan } from "./moves-wire.ts"
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

/**
 * The ops-file grammar's own vocabulary: the gestures `--move-batch` accepts.
 *
 * `cluster` and `gather` are here because each is SEVERAL `move` lines, in the
 * grammar's own relative spelling - and batching them buys more than a launch. The verb is
 * TRANSACTIONAL in the fork's own words: *"either the whole batch applies and
 * OUTPUT is written, or the whole batch is refused and OUTPUT IS NEVER
 * CREATED"*, which is what a compound gesture wants. The one-gesture transport
 * gets the same guarantee about `out` a different way, below.
 */
const BATCHABLE_KINDS: readonly Move["kind"][] = ["move", "rotate", "cluster", "gather"]

/**
 * The kinds that are SEVERAL gestures and therefore have no single argument
 * list: `compoundLaunches` builds a staged chain for each.
 *
 * **`spread` IS NOT BATCHABLE AND THAT IS THE OPS GRAMMAR'S DOING, NOT A
 * CHOICE.** A spread ends in an `--author --op add-wire`, and the grammar is
 * `move <name> --to`, `move <name> --delta` and `rotate <name> --direction`
 * with the fork's own *"Nothing else is accepted"* - so its relocations could be
 * batched and its wire could not, and a transport that batched half a compound
 * gesture would lose the transactional guarantee that is the only reason to
 * batch it.
 */
const COMPOUND_KINDS: readonly Move["kind"][] = ["add-wire", "cluster", "gather", "spread"]

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
    case "delete-wire":
      return refuseDeferred(move.kind)
    case "add-wire":
    case "cluster":
    case "gather":
    case "spread":
      throw new Error(
        `applyMove: a ${move.kind} is SEVERAL gestures and has no single argument list. It is ` +
          "applied by compoundLaunches below - one --move --delta per part, and for a wire the " +
          "create, turn and stretch its plan records - or by one --move-batch when the batched " +
          "transport is asked for and the kind is in BATCHABLE_KINDS. Reaching here means " +
          "COMPOUND_KINDS and applyMove's dispatch disagree.",
      )
  }
}

/**
 * The translations a compound move is, in the order it records them.
 *
 * **ONE READING FOR ALL THREE TRANSLATING KINDS**: a `cluster` is one delta
 * applied to every ref, a `gather` is one delta per ref, and a `spread` is one
 * delta applied to the refs whose aimed pin sat on the vacated strip - so below
 * this function they are the same list and the emitter has no second code path.
 * `./moves-cluster.ts`'s `translationsAfter` is the same unification on the
 * model side.
 *
 * **A SPREAD'S WIRE IS NOT IN THIS LIST**, because it is not a translation: the
 * wire's own gestures come from `wireSteps`, and `compoundLaunches` is where the
 * two sequences are concatenated.
 */
function translationsOf(move: Move): readonly Translation[] {
  if (move.kind === "cluster") return move.refs.map((ref) => ({ ref, delta: move.delta }))
  if (move.kind === "gather" || move.kind === "spread") return move.gestures
  throw new Error(
    `applyMove: a "${move.kind}" move is not a compound translation, so it has no list of them. ` +
      "Reaching here means BATCHABLE_KINDS or applyMove's dispatch names a kind this does not.",
  )
}

/**
 * One gesture of a compound move, as a function of the board it reads and the
 * board it writes.
 *
 * **THE STEP DOES NOT KNOW WHERE IT SITS IN THE SEQUENCE, AND THAT IS WHAT LETS
 * TWO SEQUENCES BE CONCATENATED.** A `spread` is the relocations of a cluster
 * followed by the shaping gestures of an add-wire, and before this shape the two
 * were two loops that each decided for themselves which file was last - so a
 * spread built from them would have had TWO gestures writing `out`. `staged`
 * below is the one place the chaining rule lives.
 */
type Step = (current: string, target: string) => readonly string[]

/**
 * One `--move --delta` for one part of a compound translation.
 *
 * **`--delta` AND NOT `--to`, WHICH IS WHAT KEEPS THIS MODULE FREE OF THE
 * BOARD.** An absolute destination would need each part's current `AT`, which
 * means reading the board here - a fifth invocation per candidate the recorded
 * cost model (four) does not account for, and a second reader of a geometry the
 * enumerator already holds. The fork's own header says why `--delta` exists:
 * *"the GUI gesture is relative and ... M1.3's zero-delta case has to be
 * reachable by the spelling an optimiser will produce."* A unit delta is never
 * zero, so the zero-delta refusal cannot fire on a cluster.
 */
function translationStep(one: Translation): Step {
  return (current, target) => [
    "--move",
    current,
    "--ref",
    one.ref,
    "--delta",
    `${one.delta[0]},${one.delta[1]}`,
    "-o",
    target,
  ]
}

/**
 * The gestures a planned wire is, in the order its plan records: create the
 * wire at a free hole, then turn it and stretch it in the planned order.
 *
 * `--rotate` and `--stretch` NAME THE WIRE, and the name is the plan's
 * prediction (`Wire<n+1>`); `./moves-wire.ts` carries the measurement behind it
 * and the reason a wrong prediction is loud rather than silent.
 *
 * **IT IS SHARED BY `add-wire` AND BY `spread`**, which is the whole reason it
 * takes a `WirePlan` rather than a move: a spread's rejoining wire is shaped by
 * the same three verbs in the same planned order, and a second emitter would let
 * the two kinds ask the fork for different sequences from one plan.
 */
function wireSteps(plan: WirePlan): readonly Step[] {
  const turn: Step = (current, target) => [
    "--rotate",
    current,
    "--ref",
    plan.name,
    "--direction",
    "cw",
    "-o",
    target,
  ]
  const by = plan.stretch > 0 ? "grow" : "shrink"
  const pull: Step = (current, target) => [
    "--stretch",
    current,
    "--ref",
    plan.name,
    "--direction",
    by,
    "-o",
    target,
  ]
  const turns = Array.from({ length: plan.turns }, () => turn)
  const pulls = Array.from({ length: Math.abs(plan.stretch) }, () => pull)
  const create: Step = (current, target) => [
    "--author",
    current,
    "--op",
    "add-wire",
    "--at",
    `${plan.at[0]},${plan.at[1]}`,
    "-o",
    target,
  ]
  return [create, ...(plan.order === "turn-then-stretch" ? [...turns, ...pulls] : [...pulls, ...turns])]
}

/**
 * The launches for a sequence of steps: each reads the previous one's output and
 * **only the LAST writes `out`.**
 *
 * That is what makes a refused compound move leave `out` absent - the staged
 * files are scratch beside it and the candidate is never created - and it is the
 * one-gesture transport's way of getting what `--move-batch` gets from being
 * transactional.
 *
 * THE STAGED FILES ARE NAMED FOR THEIR OWN KIND, which is not cosmetic: a run
 * directory is the only place a reader can tell afterwards which candidates were
 * compound and which kind each was, and the analysis in
 * `docs/stripboard/pipeline-verification.md` §6.4 counts exactly that. A gather
 * staged under the cluster's name made the two indistinguishable.
 */
function staged(
  board: string,
  kind: Move["kind"],
  out: string,
  steps: readonly Step[],
): readonly (readonly string[])[] {
  const launches: (readonly string[])[] = []
  let current = board
  steps.forEach((step, index) => {
    const target = index === steps.length - 1 ? out : `${out}.${kind}-${index}.vrt`
    launches.push(step(current, target))
    current = target
  })
  return launches
}

/** The staged launches for one compound move, by kind. */
function compoundLaunches(
  board: string,
  move: Move,
  out: string,
): readonly (readonly string[])[] {
  if (move.kind === "cluster" || move.kind === "gather") {
    return staged(board, move.kind, out, translationsOf(move).map(translationStep))
  }
  if (move.kind === "add-wire") {
    return staged(board, move.kind, out, wireSteps(move.plan))
  }
  // THE RELOCATIONS THEN THE WIRE, IN ONE CHAIN - which is the ORDER the model
  // checked: `./moves-spread.ts`'s `spreadAfter` advances the translations first
  // and plans the wire against what they left, because the holes the wire needs
  // may be the holes the relocated parts just vacated or just took.
  if (move.kind === "spread") {
    return staged(board, move.kind, out, [
      ...translationsOf(move).map(translationStep),
      // EVERY WIRE THE SPREAD CARRIES, IN ITS OWN ORDER - one for a straight
      // join and two for an L (`./moves-join.ts`). `wireSteps` is the one
      // emitter either way, so the two kinds ask the fork for the same sequence
      // from one plan.
      ...move.wires.flatMap((one) => wireSteps(one.plan)),
    ])
  }
  throw new Error(
    `applyMove: a "${move.kind}" move is not a compound gesture, so it has no staged chain. ` +
      "Reaching here means applyMove's dispatch names a kind this function does not.",
  )
}

/** The ops-file lines for a batchable gesture, in `--move-batch`'s own grammar. */
function opsLinesFor(move: Move): readonly string[] {
  if (move.kind === "move") return [`move ${move.ref} --to ${move.to[0]},${move.to[1]}`]
  if (move.kind === "rotate") return [`rotate ${move.ref} --direction ${move.direction}`]
  // ONE LINE PER PART, IN THE MOVE'S OWN ORDER, which the verb applies "in the
  // order the ops file lists them" - so the sequence the model checked is the
  // sequence the fork takes.
  if (move.kind === "cluster" || move.kind === "gather") {
    return translationsOf(move).map(
      (one) => `move ${one.ref} --delta ${one.delta[0]},${one.delta[1]}`,
    )
  }
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
  // THE GUARD THAT WAS HERE IS GONE, AND ITS REASON WENT WITH IT. It refused an
  // add-wire whose `at` and whose first `end` disagreed, which was right while
  // the kind was ONE gesture: `--op add-wire` places the wire's first end at
  // `--at`, so the two fields had to name one hole. A compound add-wire creates
  // the wire at an anchor and then TURNS and STRETCHES it, so `at` and `ends`
  // describe different things by construction and are expected to differ. The
  // consistency that matters now - that the plan's gestures really do land the
  // wire on those ends - is the enumerator's, which derives both from one
  // arithmetic (`./moves-wire.ts`'s `wireBridge`), and this module has no
  // geometry to re-check it with.
  // A SPREAD THAT RELOCATES NOTHING IS A BARE `add-wire` UNDER A NAME THAT
  // CLAIMS A RELOCATION, which is a different defect from the empty cluster
  // below and gets its own words. It would not be byte-identical to its parent -
  // it would carry the wire - so it would be scored, counted and recorded as a
  // spread, and the run's own analysis of which kinds did what would be wrong.
  if (move.kind === "spread" && translationsOf(move).length === 0) {
    throw new Error(
      `applyMove: this spread of "${move.net}" from strip ${move.from} to strip ${move.to} ` +
        "relocates no part, so it is a bare add-wire wearing the spread's name. It is NOT " +
        "applied as one: the kind exists because the relocation and the wire have to be ONE " +
        "candidate, and a record calling a lone wire a spread would make every count of what " +
        "this kind did wrong. tools/stripboard/moves-spread.ts's spreadMove declines to propose " +
        "one - its decline 2, no aimed pin on the source strip - so reaching here means a " +
        "caller built the move itself.",
    )
  }
  if (
    (move.kind === "cluster" || move.kind === "gather") &&
    translationsOf(move).length === 0
  ) {
    throw new Error(
      `applyMove: this ${move.kind} of "${move.net}" names no parts, so there is no gesture to apply ` +
        "and the candidate would be byte-identical to its own parent - which is the fork's own " +
        "reason for refusing an empty ops file and a zero delta. It is NOT written as a copy: a " +
        "candidate that cannot differ from its parent would be scored, counted and compared " +
        "against it. A net whose parts are all floating legitimately yields no cluster, and " +
        "tools/stripboard/moves-cluster.ts's clusterMove declines to propose one; reaching here " +
        "means a caller built the move itself.",
    )
  }
  const batched = transport === "batched" && BATCHABLE_KINDS.includes(move.kind)
  const launches: readonly (readonly string[])[] = batched
    ? [batchLaunch(move, board, out)]
    : COMPOUND_KINDS.includes(move.kind)
      ? compoundLaunches(board, move, out)
      : [gestureFor(move, board, out)]
  for (const args of launches) {
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
}

/** The one `--move-batch` invocation, with its ops file written beside the candidate. */
function batchLaunch(move: Move, board: string, out: string): readonly string[] {
  const opsFile = `${out}.ops`
  fs.writeFileSync(opsFile, `${opsLinesFor(move).join("\n")}\n`)
  return ["--move-batch", board, "--ops", opsFile, "-o", out]
}
