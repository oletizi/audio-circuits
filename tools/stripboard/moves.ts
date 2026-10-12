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
 * **FIVE OF THE SIX KINDS ARE EXACTLY ONE GESTURE, AND THE SIXTH IS THE
 * COMPOUND ONE.** `tools/stripboard/seed-placement.ts`'s `GESTURE_ORDERS` exists
 * because a turn and a stretch need different clearance in each order - measured
 * on `SI_HI_CUT_R1`, 0 of 1225 origins with the turn first and 19 with the
 * shrinks first - so a COMPOUND gesture has to choose. A `move`, a `rotate` and
 * a `stretch` are one fork invocation each, and `appliedGestures` is called below
 * with one of its two counts at zero, where seed-placement states outright that
 * "both orders are the same sequence". **`cluster` is several gestures in one
 * candidate and it chooses the order of the PARTS** - furthest along the delta
 * first - which is `./moves-cluster.ts`'s, stated and tested there. It does NOT
 * re-answer the turn-versus-stretch question: every gesture in a cluster is a
 * pure translation, so both of `appliedGestures`' counts are zero.
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
 * DISCOVERED** - `add-wire` and `delete-wire`, since Task 18 implemented
 * `cluster`. `DEFERRED_KINDS` names them with the reason for each, in one
 * place, and both `applicableMoves` and `applyMove` read it - so the climb's
 * sweep leaves them out by a declaration a reviewer can see, and `applyMove`
 * refuses them by the same wording rather than a second one. They are still
 * ENUMERATED, because the enumeration is the spec's move set and a kind missing
 * from it would be invisible.
 */
import type { BoardDump } from "../guide/dump.ts"
import { parseHoleKey, pinHoles, type HoleKey } from "./copper.ts"
import { stripOf } from "./constraints-model.ts"
import type { ReferenceNets } from "./equivalence.ts"
import { clusterAfter, clusterMove } from "./moves-cluster.ts"
import { stretchBoundFor, type Occupancy } from "./seed-geometry.ts"
import { appliedGestures, rectOf } from "./seed-placement.ts"
import type { SpawnVeroroute } from "./seed.ts"

/**
 * One difference between a candidate layout and the current one.
 *
 * `cluster` is PIPELINE §7.4's net-cluster move - every on-board part with a pin
 * on one net moved by one delta.
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
  | {
      readonly kind: "cluster"
      readonly net: string
      readonly delta: readonly [number, number]
      /**
       * The parts this cluster moves, **in the order the gestures go out.**
       *
       * **THE MOVE CARRIES THEM RATHER THAN NAMING ONLY THE NET, AND THE REASON
       * IS THAT THE ORDER CANNOT BE RECOVERED AT APPLY TIME.** Which parts a net
       * holds comes from the reference NETLIST, because `--import` writes every
       * `NODE` line `NAME -`; and the order they must move in comes from the
       * CARRIED OCCUPANCY, which is the only description of a turned part's
       * footprint there is. `applyMove` is handed a board path and a spawn and
       * neither of those - so a cluster whose refs it had to derive would be a
       * second implementation of `./moves-cluster.ts`' rule in the one module
       * that cannot see what the rule needs. `net` stays beside them as what the
       * cluster IS, for `describeMove`, the run record and the enumeration order.
       */
      readonly refs: readonly string[]
    }

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
    "add-wire",
    "a one-gesture add-wire cannot join two strips, measured on the import-placed low-boost " +
      "board with the pinned binary. TWO facts, both from the fork: (1) the wire anchors only at " +
      "a FREE hole - `--author --op add-wire --at 1,0` is refused with \"the wire could not be " +
      'placed at that position (it is floating)" because a part\'s footprint occupies that hole, ' +
      "and this enumeration anchors at a PIN hole, which is the only kind of hole it can " +
      "identify as belonging to a net; and (2) a freshly created wire is 1x3 ALONG THE ROW - " +
      "`--at 10,10` on a free hole yields `WIRE Wire1 AT 10,10 ENDS 10,10 10,12` - so under " +
      "horizontal strips it joins one strip to itself and connects nothing. Making it useful " +
      "needs the wire turned across the strips and stretched to reach, which is three gestures " +
      "in one candidate; or a fork change letting --op add-wire name both ends. **THE COMPOUND " +
      "GESTURE IS NO LONGER WHAT BLOCKS IT, AND THAT IS WORTH SAYING NOW THAT THE CLUSTER MOVE " +
      "EXISTS**: a cluster is several gestures in one candidate and it works, so a reader could " +
      "reasonably ask why this one does not follow. The answer is the occupancy. " +
      "./moves-cluster.ts sequences PART translations and checks each one against the carried " +
      "occupancy, and a WIRE's holes are not in the occupancy at all - occupancyOf builds rects " +
      "from PART and PIN lines only - so there is no model that could say whether a turned, " +
      "stretched wire lands clear of anything. Giving it one is a change to seed-geometry.ts " +
      "with the fork's own wire arithmetic transcribed into it, not a reuse of the cluster's " +
      "sequencing. It is still ENUMERATED, so the move set in the record stays the spec's",
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
      // The refs are in the description because they are part of the gesture
      // and their ORDER is a decision: a record that said only "cluster mid by
      // 1,0" could not tell two sequences of the same parts apart, and the
      // sequence is what makes the difference between a cluster that lands and
      // one the fork refuses (./moves-cluster.ts's clusterSequence).
      return `cluster ${move.net} by ${move.delta[0]},${move.delta[1]} (${move.refs.join(" ")})`
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
 * **ONE HOLE, AND IT IS AN UNMEASURED CHOICE WITH A STATED REASON.** A round is
 * a full sweep of the move set (COST §6.4), so the sweep's cost has to stay
 * linear in the number of parts: enumerating every origin on the grid would
 * make one round 1225 evaluations per part on a 35x35 board. The one-hole
 * neighbourhood is the smallest that can still reach any origin by composition
 * across rounds, which is what a hill climb does with it. **NOTHING HAS
 * MEASURED WHETHER IT IS THE RIGHT SHAPE OR SIZE** - not this file, not the
 * specs, not any run - and the order of the four carries no preference either;
 * it is fixed so that the sweep is reproducible. Widening it is a deliberate
 * edit with a run behind it.
 */
const UNIT_DELTAS: readonly (readonly [number, number])[] = [[-1, 0], [0, 1], [1, 0], [0, -1]]

/**
 * The ONE gesture order named in this file, and naming it chooses nothing:
 * every call below passes zero for one of `appliedGestures`' two counts, where
 * `./seed-placement.ts` states outright that at zero "both orders are the same
 * sequence". Task 18's cluster move is the first compound gesture and the
 * choice is its.
 */
const SINGLE_GESTURE_ORDER = "turn-then-stretch" as const

/**
 * The occupancy after `move` is applied, or `undefined` when the model says the
 * fork would refuse the gesture.
 *
 * **THIS IS THE ONE PLACE A GESTURE'S EFFECT ON THE PART GEOMETRY IS COMPUTED,
 * AND IT IS TASK 16'S `appliedGestures` UNDERNEATH** - transcribed from
 * `Board::RotateComps` and held against the real binary across 43 gestures and
 * 11 placements with zero divergence. **There is no second occupancy advance in
 * this pipeline:** `enumerateMoves` proposes a move exactly when this returns
 * an occupancy, and `climb` advances its carried state with the same call, so
 * the set the search sweeps and the state it carries cannot disagree about what
 * a gesture does.
 *
 * **WHY THE CLIMB CARRIES AN OCCUPANCY AT ALL rather than re-reading one from
 * each dump.** A dump does not describe a TURNED part's footprint: for a part
 * facing `N` or `S`, `SPAN` is the footprint's ROW count and its stretched
 * length appears in no dump line (COST §7.3 item 2 - `GetCompRows`, which
 * `--dump-board` does not report). So `occupancyOf` REFUSES such a board, and a
 * climb that re-derived its geometry each round could take a turn and then be
 * unable to read the result. Measured, before this was carried: the climb
 * accepted gestures through round 0 and then refused with `part "C18": it faces
 * N`, which is why `rotate` was briefly in `DEFERRED_KINDS` and is not any
 * more. `./seed-placement.ts` reached the same wall and states the same answer:
 * *"THE OCCUPANCY IS TRACKED, NOT RE-READ."*
 *
 * The family bound is checked HERE and not only at the proposal, so the two
 * cannot drift: `Component::CanStretch` returns `false` outright for a family
 * not on its list, and a geometric fit is not a stretchable part.
 */
export function occupancyAfter(
  occupancy: Occupancy,
  dump: BoardDump,
  move: Move,
  type?: string,
): Occupancy | undefined {
  if (move.kind === "add-wire" || move.kind === "delete-wire") {
    throw new Error(
      `occupancyAfter: a "${move.kind}" move's effect on the part geometry is not modelled. ` +
        "Both change the WIRE list and not any part's rect - and a wire's own holes are not in " +
        "the occupancy at all, which is a limit of occupancyOf rather than a decision here. " +
        "Both are in DEFERRED_KINDS, so applicableMoves keeps them out of the sweep and this is " +
        "unreachable from climb; reaching it means a caller advanced past a gesture it had not " +
        "applied.",
    )
  }
  // THE COMPOUND KIND, THROUGH THE SAME `appliedGestures` THE SINGLE MOVE USES,
  // one part at a time in the order the move itself records - see
  // `Move`'s cluster arm for why the order travels on the move.
  if (move.kind === "cluster") {
    return clusterAfter(occupancy, dump.grid, move.refs, move.delta)
  }
  if (move.kind === "move") {
    return appliedGestures(occupancy, dump.grid, move.ref, move.to, 0, 0, SINGLE_GESTURE_ORDER)
  }
  const rect = rectOf(occupancy, move.ref)
  const origin: readonly [number, number] = [rect.row, rect.col]
  if (move.kind === "rotate") {
    if (move.direction === "ccw") {
      throw new Error(
        "occupancyAfter: an anticlockwise turn has no modelled landing rect. " +
          "tools/stripboard/seed-placement.ts's turnedRect is Board::RotateComps's CLOCKWISE " +
          "case, line by line, and nothing in this repository has transcribed the anticlockwise " +
          "one - so the occupancy cannot be advanced past this gesture and the search must not " +
          "propose it. It is NOT assumed to be the mirror of the clockwise case: that is a " +
          "claim about arithmetic nobody has read. Transcribe the other case with a row in " +
          "tests/stripboard/seed-geometry.test.ts beside it, or keep proposing cw only.",
      )
    }
    return appliedGestures(occupancy, dump.grid, move.ref, origin, 1, 0, SINGLE_GESTURE_ORDER)
  }
  if (type === undefined) {
    throw new Error(
      `occupancyAfter: a stretch of ${move.ref} needs the part's VeroRoute TYPE to find its ` +
        "family's length bound, and none was given. Component::CanStretch is a fixed family " +
        "list and a geometric fit is not a stretchable part - that is what refused a --stretch " +
        "on a SIP5 after 24 accepted gestures. Pass the dump's PART type.",
    )
  }
  const bound = stretchBoundFor(type)
  if (!bound.stretchable) return undefined
  // THE BOUND IS CHECKED AGAINST THE EXTENT THAT STRETCHES, WHICH IS THE AXIS
  // THE LEADS RUN ALONG - `rect.rows` once the part has been turned across the
  // strips, `rect.cols` while it lies along them. It is the SAME axis
  // `stretchedRect` moves, and reading `rect.cols` for every part regardless of
  // its facing is the defect this replaces: measured on the arm comparison's
  // own run, where a turned CAP_FILM_WIDE already at its minimum length was
  // proposed a shrink and the fork refused it, stopping the run after seven
  // rounds (`docs/stripboard/pipeline-verification.md` section 6.3). A square
  // footprint hides it - a 3x3 rect reads the same on both axes - which is why
  // it survived every fixture until a real board turned a 2x3 one.
  const along = rect.across ? rect.rows : rect.cols
  if (move.direction === "grow" && !(along < bound.maxLength)) return undefined
  if (move.direction === "shrink" && !(along > bound.minLength)) return undefined
  const by = move.direction === "grow" ? 1 : -1
  return appliedGestures(occupancy, dump.grid, move.ref, origin, 0, by, SINGLE_GESTURE_ORDER)
}

/**
 * Every `move`, `rotate` and `stretch` the model admits, in the DUMP'S PART
 * ORDER with each part's rect read from the CARRIED occupancy.
 *
 * The order is the dump's and the geometry is the occupancy's, and the split
 * matters: the order has to be reproducible (Task 13's hash) while the geometry
 * has to survive a turn, which the dump's own `PART` line does not.
 */
function partMoves(occupancy: Occupancy, dump: BoardDump): readonly Move[] {
  const moves: Move[] = []
  for (const part of dump.parts) {
    const rect = rectOf(occupancy, part.ref)
    const admits = (move: Move): boolean =>
      occupancyAfter(occupancy, dump, move, part.type) !== undefined
    for (const [dRow, dCol] of UNIT_DELTAS) {
      const to: readonly [number, number] = [rect.row + dRow, rect.col + dCol]
      const move: Move = { kind: "move", ref: part.ref, to }
      if (admits(move)) moves.push(move)
    }
    // CLOCKWISE ONLY, AND THE REASON IS WHAT HAS BEEN TRANSCRIBED. `turnedRect`
    // is `Board::RotateComps`'s CLOCKWISE case, line by line, and nothing in
    // this repository has transcribed the anticlockwise one - so an enumerated
    // `ccw` would be a gesture whose landing rect no model predicts, testable
    // only by attempting it. The `Move` union admits `ccw` because `--rotate`
    // does, and `applyMove` applies either faithfully; only the PROPOSAL is
    // narrowed, and widening it means transcribing the other case with a row in
    // tests/stripboard/seed-geometry.test.ts beside it.
    //
    // WHAT CLOCKWISE-ONLY DOES AND DOES NOT COST, MEASURED THROUGH `turnedRect`
    // rather than argued. Four quarter turns are a full turn, so all four
    // facings are reachable in one, two or three steps - across rounds, each
    // step being its own move. And the rect cycle is SHORTER than that: on a
    // part the dump can describe (1 row by its span, leads along the columns)
    // TWO clockwise turns land it back on its own origin exactly - `2,1 1x6` ->
    // `0,3 6x1` -> `2,1 1x6`, and the same at spans 3, 5 and 7 - so the cw-only
    // set reaches exactly two rect positions, not four.
    // **SO IT IS NOT A FREE RESTRICTION, AND THE LIMIT IS STATED RATHER THAN
    // WAVED PAST:** reaching the third facing takes three successive turns and
    // each of them has to fit on its own, so a single `ccw` could be takeable
    // on a crowded board where the chain is not. Whether that happens is
    // unmeasured. `tests/stripboard/moves.test.ts` holds the two-turn cycle so
    // this claim fails rather than rots.
    const turn: Move = { kind: "rotate", ref: part.ref, direction: "cw" }
    if (admits(turn)) moves.push(turn)
    for (const direction of ["grow", "shrink"] as const) {
      const stretch: Move = { kind: "stretch", ref: part.ref, direction }
      if (admits(stretch)) moves.push(stretch)
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

/**
 * Every `cluster` the model admits: each net in the NETLIST'S order, by each of
 * the four unit deltas, with the parts and their gesture order from
 * `./moves-cluster.ts`.
 *
 * **IT IS NARROWED LIKE EVERY OTHER KIND, AND THAT IS A CHANGE FROM TASK 17**,
 * which emitted all four deltas of every net unconditionally because nothing
 * could apply them yet. A cluster whose sequence cannot be completed is not
 * proposed, for `partMoves`' reason: a set whose members were discovered by
 * attempting them would spend four invocations per refusal, and this one would
 * spend one per part on top.
 *
 * **THE DELTAS ARE THE SAME FOUR `UNIT_DELTAS` A SINGLE `move` USES, AND THAT IS
 * A LIMIT WORTH NAMING.** A cluster therefore translates a net's parts ONE HOLE
 * at a time, so a gathering that needs two holes takes two rounds and each
 * intermediate step has to fit on its own. Whether a wider neighbourhood would
 * pay is unmeasured, exactly as `UNIT_DELTAS` says of itself for the single-part
 * case; widening it is a deliberate edit with a run behind it.
 */
function clusterMoves(
  occupancy: Occupancy,
  dump: BoardDump,
  reference: ReferenceNets,
): readonly Move[] {
  const moves: Move[] = []
  for (const [net] of reference) {
    for (const delta of UNIT_DELTAS) {
      const move = clusterMove(occupancy, dump, reference, net, delta)
      if (move !== undefined) moves.push(move)
    }
  }
  return moves
}

/**
 * The whole move set for one board, in `MOVE_KINDS`' order within a
 * deterministic order of parts, nets and wires.
 *
 * **IT READS NO OCCUPANCY AT ALL: the caller hands one in.** It used to derive
 * one with `occupancyOf`, and that is exactly what made a turn unenumerable -
 * a dump cannot describe a turned part's footprint. The refusals `occupancyOf`
 * raises for a board it cannot read now belong to whoever reads the FIRST
 * occupancy off a starting board, which is `seedCandidate` and nothing else in
 * the search.
 */
export function enumerateMoves(
  occupancy: Occupancy,
  dump: BoardDump,
  reference: ReferenceNets,
): readonly Move[] {
  return [
    ...partMoves(occupancy, dump),
    ...wireMoves(dump, reference),
    ...clusterMoves(occupancy, dump, reference),
  ]
}

/**
 * `applyMove` and its transport, re-exported from `./moves-apply.ts`.
 *
 * This is the module the plan names and every consumer imports, exactly as
 * `./seed.ts` re-exports `./seed-arms.ts` and `./seed-placement.ts`. The split
 * is at the enumerate/apply seam and was forced by the 500-line ceiling.
 */
export { applyMove, type GestureTransport } from "./moves-apply.ts"

/**
 * The net-cluster model, re-exported from `./moves-cluster.ts`: which parts a
 * net's cluster moves, in what order, and where that leaves the geometry.
 *
 * Same arrangement and same reason as the line above: this is the module the
 * plan names and every consumer imports, and the split is at the
 * what-is-a-cluster seam, forced by the 500-line ceiling.
 */
export { clusterAfter, clusterMove, clusterRefs, clusterSequence } from "./moves-cluster.ts"
