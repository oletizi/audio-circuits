/**
 * The MOVE SET: what a candidate layout can differ from the current one by, and
 * how one such difference is applied to a board file.
 *
 * THE AUTHORITY is `docs/superpowers/specs/
 * 2026-10-10-stripboard-placement-cost-design.md` §6.1, which names the five
 * single-part moves (`move`, `rotate`, `stretch`, `add-wire`, `delete-wire`),
 * and §7.4 of `docs/superpowers/specs/2026-10-10-stripboard-pipeline-design.md`,
 * which adds the net-cluster move. Where this module and those documents differ
 * the documents win and this comment is the defect.
 *
 * **THE ORDER IS DECLARED, NEVER INCIDENTAL.** `enumerateMoves` iterates the
 * dump's `parts` ARRAY, the dump's `wires` ARRAY, this file's own
 * `UNIT_DELTAS` and the reference netlist's `Map` - whose iteration order is
 * its INSERTION order, which `referenceNetsFromExport` fills in the netlist's
 * own order. Nothing here iterates a `Record` with `Object.keys`, and nothing
 * reads `dump.pins` directly: a run whose move order varies between runs cannot
 * be reproduced, and Task 13's `canonicalHash` exists to prove runs reproduce.
 * `tests/stripboard/moves.test.ts` holds the net order by reversing the
 * reference map and demanding the cluster moves reverse with it.
 *
 * **EVERY MOVE HERE IS EXACTLY ONE GESTURE, SO NO GESTURE ORDER IS BAKED IN.**
 * `tools/stripboard/seed-placement.ts`'s `GESTURE_ORDERS` exists because a turn
 * and a stretch need different clearance in each order - measured on
 * `SI_HI_CUT_R1`, 0 of 1225 origins with the turn first and 19 with the shrinks
 * first - so a COMPOUND gesture has to choose. This move set emits no compound
 * gesture: a `move`, a `rotate` and a `stretch` are one fork invocation each,
 * and `appliedGestures` is called below with one of its two counts at zero,
 * where seed-placement states outright that "both orders are the same sequence".
 * Task 18's cluster move is the first compound one and the choice is its.
 *
 * **THE ENUMERATION IS NARROWED BY THE TRANSCRIBED MODEL, AND THE FORK REMAINS
 * THE AUTHORITY.** A move is proposed only when `tools/stripboard/
 * seed-placement.ts`'s arithmetic - transcribed from `Board::RotateComps` and
 * held against the real binary by `tests/stripboard/seed-geometry.test.ts` -
 * says the gesture lands in bounds and clear of the other parts. The same
 * reason the seed arms narrow in advance applies here: a set whose members were
 * discovered by attempting them would spend four invocations per refusal. When
 * the fork refuses anyway, `applyMove` stops the run and names the gesture
 * rather than skipping it - a divergence between the model and the binary is a
 * finding, not a candidate to drop quietly.
 *
 * **TWO OF THE SIX KINDS CANNOT BE APPLIED TODAY AND THAT IS DECLARED, NOT
 * DISCOVERED.** `DEFERRED_KINDS` names them with the reason for each, in one
 * place, and both `applicableMoves` and `applyMove` read it - so the climb's
 * sweep leaves them out by a declaration a reviewer can see, and `applyMove`
 * refuses them by the same wording rather than a second one. They are still
 * ENUMERATED, because the enumeration is the spec's move set and a kind missing
 * from it would be invisible.
 */
import fs from "node:fs"
import type { BoardDump } from "../guide/dump.ts"
import { parseHoleKey, pinHoles, type HoleKey } from "./copper.ts"
import { stripOf } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { occupancyOf, type Occupancy } from "./seed-geometry.ts"
import { appliedGestures, rectOf, turnsTakeable } from "./seed-placement.ts"
import type { SpawnVeroroute } from "./seed.ts"

/**
 * One difference between a candidate layout and the current one.
 *
 * `cluster` is PIPELINE §7.4's net-cluster move - every on-board part with a
 * pin on one net moved by one delta - and is Task 18's to apply. It is in the
 * union here because the union is the spec's move set.
 */
export type Move =
  | { readonly kind: "move"; readonly ref: string; readonly to: readonly [number, number] }
  | { readonly kind: "rotate"; readonly ref: string; readonly direction: "cw" | "ccw" }
  | { readonly kind: "stretch"; readonly ref: string; readonly direction: "grow" | "shrink" }
  | {
      readonly kind: "add-wire"
      readonly at: readonly [number, number]
      readonly ends: readonly [readonly [number, number], readonly [number, number]]
    }
  | { readonly kind: "delete-wire"; readonly name: string }
  | { readonly kind: "cluster"; readonly net: string; readonly delta: readonly [number, number] }

/**
 * Every kind, once, in the order `enumerateMoves` emits them. The one listing:
 * `tests/stripboard/moves.test.ts` holds the enumeration against it, so a
 * seventh kind added to `Move` without an arm in `applyMove` is a compile
 * error and a kind that stops being enumerated is a test failure.
 */
export const MOVE_KINDS: readonly Move["kind"][] = [
  "move",
  "rotate",
  "stretch",
  "add-wire",
  "delete-wire",
  "cluster",
]

/**
 * The kinds `applyMove` cannot apply, each with what is missing and where it
 * gets fixed. **One wording, read by both `applicableMoves` and `applyMove`**,
 * so the climb's omission and the refusal's text cannot drift apart.
 *
 * `delete-wire` IS NOT DEFERRED TO A TASK - IT IS BLOCKED ON THE FORK. The
 * pinned fork's command table (`.tools/veroroute-perfboard/Src/Headless.cpp:
 * 92-106`) is `--adopt`, `--author`, `--check`, `--dump-board`,
 * `--dump-netlist`, `--import`, `--move`, `--move-batch`, `--rotate`,
 * `--update`, `--set-strips`, `--stretch` and three `--verify-*` test verbs,
 * and `--author`'s ops are `group`, `select`, `move-label`, `add-wire`, `merge`
 * and `autofill`. **None of them deletes a component.** COST §6.1 lists
 * `delete-wire` in the move set and §7 records that only some of the set
 * existed when it was written; this is the same gap, still open.
 */
export const DEFERRED_KINDS: ReadonlyMap<Move["kind"], string> = new Map([
  [
    "cluster",
    "the net-cluster move (PIPELINE E1/§7.4) is Task 18's to implement: it moves EVERY on-board " +
      "part with a pin on one net by one delta, which is several gestures in one candidate and " +
      "the first compound gesture in this pipeline - so it also has to choose a gesture order, " +
      "which no single-gesture move does. It is enumerated here, by Task 17's own brief, so " +
      "that the move set in the record is the spec's move set rather than the subset that " +
      "happened to be implementable first",
  ],
  [
    "delete-wire",
    "no verb in the pinned fork deletes a placed component. The shipped verbs are --adopt, " +
      "--check, --dump-board, --dump-netlist, --import, --move, --move-batch, --rotate, " +
      "--update, --set-strips and --stretch, and the test-only --author takes group, select, " +
      "move-label, add-wire, merge and autofill - none of the seventeen removes a wire. Fixing " +
      "it is a change to the fork (a --author --op delete op over Board's component removal, " +
      "with the same effect check --op add-wire makes), not a change to this module",
  ],
])

/** A one-line description of a move, stable across runs: the key a test compares by. */
export function describeMove(move: Move): string {
  switch (move.kind) {
    case "move":
      return `move ${move.ref} to ${move.to[0]},${move.to[1]}`
    case "rotate":
      return `rotate ${move.ref} ${move.direction}`
    case "stretch":
      return `stretch ${move.ref} ${move.direction}`
    case "add-wire":
      return (
        `add-wire at ${move.at[0]},${move.at[1]} joining ${move.ends[0][0]},${move.ends[0][1]} ` +
        `to ${move.ends[1][0]},${move.ends[1][1]}`
      )
    case "delete-wire":
      return `delete-wire ${move.name}`
    case "cluster":
      return `cluster ${move.net} by ${move.delta[0]},${move.delta[1]}`
  }
}

/**
 * The moves `applyMove` can actually apply, in the order given.
 *
 * **IT IS A DECLARED OMISSION AND NOT A SILENT SKIP.** The kinds it drops are
 * exactly `DEFERRED_KINDS`' keys, each of which carries its reason in the
 * record above; nothing is dropped because a gesture failed, and nothing is
 * discovered by catching a refusal.
 */
export function applicableMoves(moves: readonly Move[]): readonly Move[] {
  return moves.filter((move) => !DEFERRED_KINDS.has(move.kind))
}

/**
 * The four one-hole neighbours a `move` proposes, in the one order this file
 * declares: up, right, down, left.
 *
 * **ONE HOLE, AND THAT IS A CHOICE WITH A STATED REASON RATHER THAN A MEASURED
 * ONE.** A round is a full sweep of the move set (COST §6.4), so the sweep's
 * cost has to stay linear in the number of parts: enumerating every origin on
 * the grid would make one round 1225 evaluations per part on a 35x35 board. The
 * one-hole neighbourhood is the smallest that can still reach any origin by
 * composition across rounds, which is what a hill climb does with it. **No
 * claim is made that it is the best neighbourhood** - nothing here has measured
 * that - and the order of the four carries no preference either; it is fixed so
 * that the sweep is reproducible.
 */
const UNIT_DELTAS: readonly (readonly [number, number])[] = [[-1, 0], [0, 1], [1, 0], [0, -1]]

/** Whether a part can be moved to `origin` beside everything already placed. */
function movable(
  occupancy: Occupancy,
  dump: BoardDump,
  ref: string,
  origin: readonly [number, number],
): boolean {
  // `turns` and `stretch` are both zero, so this asks only whether the moved
  // rect fits - and at zero the two gesture orders are the same sequence, which
  // is why naming one here chooses nothing.
  return appliedGestures(occupancy, dump.grid, ref, origin, 0, 0, "turn-then-stretch") !== undefined
}

/** Whether one `--stretch` step in `direction` fits where the part stands. */
function stretchable(
  occupancy: Occupancy,
  dump: BoardDump,
  ref: string,
  direction: "grow" | "shrink",
): boolean {
  const rect = rectOf(occupancy, ref)
  return (
    appliedGestures(
      occupancy,
      dump.grid,
      ref,
      [rect.row, rect.col],
      0,
      direction === "grow" ? 1 : -1,
      "turn-then-stretch",
    ) !== undefined
  )
}

/** Every `move`, `rotate` and `stretch` the model admits, in the dump's part order. */
function partMoves(dump: BoardDump, occupancy: Occupancy): readonly Move[] {
  const moves: Move[] = []
  for (const part of dump.parts) {
    const rect = rectOf(occupancy, part.ref)
    for (const [dRow, dCol] of UNIT_DELTAS) {
      const to: readonly [number, number] = [rect.row + dRow, rect.col + dCol]
      if (movable(occupancy, dump, part.ref, to)) moves.push({ kind: "move", ref: part.ref, to })
    }
    // CLOCKWISE ONLY, AND THE REASON IS WHAT HAS BEEN TRANSCRIBED. `turnedRect`
    // is `Board::RotateComps`'s CLOCKWISE case, line by line, and nothing in
    // this repository has transcribed the anticlockwise one - so an enumerated
    // `ccw` would be a gesture whose landing rect no model predicts, testable
    // only by attempting it. The `Move` union admits `ccw` because `--rotate`
    // does, and `applyMove` applies either faithfully; only the PROPOSAL is
    // narrowed, and widening it means transcribing the other case with a row in
    // tests/stripboard/seed-geometry.test.ts beside it.
    if (turnsTakeable(occupancy, dump.grid, part.ref, [rect.row, rect.col], 1)) {
      moves.push({ kind: "rotate", ref: part.ref, direction: "cw" })
    }
    for (const direction of ["grow", "shrink"] as const) {
      if (stretchable(occupancy, dump, part.ref, direction)) {
        moves.push({ kind: "stretch", ref: part.ref, direction })
      }
    }
  }
  return moves
}

/**
 * Every `add-wire` the netlist's nets suggest: for each net in the NETLIST's
 * order, each consecutive pair of its on-board pin holes that sit on DIFFERENT
 * strips.
 *
 * **A PAIR ON ONE STRIP IS NOT PROPOSED**, because the strip already joins
 * those two holes and the wire would add a `W` to `F` and no connectivity. A
 * pair the copper ALREADY joins by some other route is still proposed: this
 * enumeration reads pin holes and the strip axis and nothing else, and whether
 * a wire buys anything is `F`'s judgement rather than the enumerator's - which
 * keeps the proposal cheap and keeps one decision in one place.
 *
 * A pin the dump prints no `PIN` line for contributes nothing: a floating
 * part prints none (`tools/guide/dump.ts`'s own rule), which is a legitimate
 * state and not a defect to refuse over here.
 */
function wireMoves(dump: BoardDump, reference: ReferenceNets): readonly Move[] {
  const holes = pinHoles(dump)
  const moves: Move[] = []
  for (const [, pins] of reference) {
    const positions = pins
      .map((pin) => holes.get(pin))
      .filter((hole): hole is HoleKey => hole !== undefined)
      .map((hole) => parseHoleKey(hole))
    for (let index = 1; index < positions.length; index += 1) {
      const from = positions[index - 1]
      const to = positions[index]
      if (from === undefined || to === undefined) continue
      if (stripOf(from, dump.verticalStrips) === stripOf(to, dump.verticalStrips)) continue
      moves.push({
        kind: "add-wire",
        at: [from.row, from.col],
        ends: [
          [from.row, from.col],
          [to.row, to.col],
        ],
      })
    }
  }
  for (const wire of dump.wires) moves.push({ kind: "delete-wire", name: wire.name })
  return moves
}

/** Every `cluster`: each net in the netlist's order, by each of the four unit deltas. */
function clusterMoves(reference: ReferenceNets): readonly Move[] {
  const moves: Move[] = []
  for (const [net] of reference) {
    for (const delta of UNIT_DELTAS) moves.push({ kind: "cluster", net, delta })
  }
  return moves
}

/**
 * The whole move set for one board, in `MOVE_KINDS`' order within a
 * deterministic order of parts, nets and wires.
 *
 * It reads the board's occupancy ONCE, through `occupancyOf`, which refuses a
 * board it cannot describe - a floating part, a part already turned across the
 * strips, a component type with no recorded footprint row count - rather than
 * enumerating moves for a rectangle nobody measured.
 */
export function enumerateMoves(dump: BoardDump, reference: ReferenceNets): readonly Move[] {
  const occupancy = occupancyOf(dump)
  return [...partMoves(dump, occupancy), ...wireMoves(dump, reference), ...clusterMoves(reference)]
}

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
