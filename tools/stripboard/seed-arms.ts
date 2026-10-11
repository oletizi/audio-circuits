/**
 * The three arms' gesture lists, and the driver that spawns them.
 *
 * `./seed.ts` owns the vocabulary - `SeedArm`, `SEED_ARMS`, `parseSeedArm`,
 * `SpawnVeroroute`, `SeedInput` - and `seedCandidate`, which dispatches into
 * the three builders below. The split is at that seam and no other: one file
 * carrying both was 540 lines, past this repository's 300-500 ceiling.
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
import { TOOL_MAX_SPAN_HOLES, TOOL_MIN_SPAN_HOLES } from "../../lib/kicad/lead-span-model.ts"
import { parseBoardDump, type BoardDump, type Part } from "../guide/dump.ts"
import {
  assignStrips,
  drawFrom,
  junctionNets,
  referenceNetsFor,
  seededPrng,
  type StripAssignment,
} from "./seed-arrangement.ts"
import { netsByPart } from "./seed-nets.ts"
import {
  admissibleOrigins,
  appliedGestures,
  occupancyOf,
  rectOf,
  turnsTakeable,
  withPartMoved,
  withPartTurned,
} from "./seed-geometry.ts"
import type { SeedInput, SpawnVeroroute } from "./seed.ts"

/** One gesture: the verb, its own arguments, and what it is for, for a refusal. */
export interface Gesture {
  readonly verb: string
  readonly tail: readonly string[]
  readonly what: string
}

function move(ref: string, row: number, col: number): Gesture {
  return { verb: "--move", tail: ["--ref", ref, "--to", `${row},${col}`], what: `moving ${ref}` }
}

function rotate(ref: string): Gesture {
  return {
    verb: "--rotate",
    tail: ["--ref", ref, "--direction", "cw"],
    what: `turning ${ref} a quarter turn clockwise`,
  }
}

function stretch(ref: string, direction: "grow" | "shrink"): Gesture {
  return {
    verb: "--stretch",
    tail: ["--ref", ref, "--direction", direction],
    what: `stretching ${ref} (${direction})`,
  }
}

/**
 * `AutoFillVero` runs on `--update` and on `--author --op autofill` and NOT on
 * `--import --strips` or `--set-strips`, and `HC2` refuses an unresolved cut
 * state rather than mis-scoring it. So the paint comes after the last gesture
 * that moves anything, on all three arms including the one that moves nothing.
 */
function autofill(): Gesture {
  return { verb: "--author", tail: ["--op", "autofill"], what: "painting the strips" }
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
function readBoard(
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
  if (gestures.length === 0) {
    throw new Error(
      "seedCandidate: an arm produced no gestures at all, so there is no candidate file and " +
        "nothing was painted - and an unpainted board reports CUT_STATE UNRESOLVED, which HC2 " +
        "refuses rather than mis-scoring. Every arm ends with --author --op autofill, including " +
        "the one that moves nothing.",
    )
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
 * The strip coordinates one part's leads occupy.
 *
 * A hole's strip is its ROW under horizontal strips and its COLUMN under
 * vertical ones - the axis `VERTICAL_STRIPS` names, the same definition
 * `occupiedStrips` uses, and a definition rather than data: nothing in the dump
 * states it.
 */
function leadStrips(dump: BoardDump, part: Part): readonly number[] {
  const pins = dump.pins[part.ref] ?? []
  return pins.map((pin) => (dump.verticalStrips ? pin.col : pin.row))
}

/**
 * Whether this part's leads all sit on ONE strip, which is what `--import`'s
 * first-fit sweep leaves and what the constructed arm turns them off.
 *
 * Measured from the leads rather than from `DIRECTION`, because `DIRECTION` is
 * optional in the dump grammar - two frozen captures predate the field - and a
 * part whose direction is absent is still a part whose leads are readable.
 */
function alongOneStrip(dump: BoardDump, part: Part): boolean {
  const strips = leadStrips(dump, part)
  return strips.length > 1 && new Set(strips).size === 1
}

/** A part's lead span in holes, which no rotation changes: the Chebyshev reach plus one. */
function leadSpanHoles(dump: BoardDump, ref: string): number {
  const pins = dump.pins[ref] ?? []
  if (pins.length < 2) return 1
  const rows = pins.map((pin) => pin.row)
  const cols = pins.map((pin) => pin.col)
  return (
    Math.max(
      Math.max(...rows) - Math.min(...rows),
      Math.max(...cols) - Math.min(...cols),
    ) + 1
  )
}

/** The strip this net is assigned, refusing a net the arrangement does not carry. */
function stripFor(assignment: StripAssignment, net: string, board: string): number {
  const strip = assignment.get(net)
  if (strip === undefined) {
    throw new Error(
      `seedCandidate: net "${net}" is on this board's dump but has no strip in ${board}'s ` +
        "arrangement, so the dump and the target set were derived from different networks. It " +
        "is not placed on an arbitrary strip: a net with no strip is a net the construction " +
        "silently stopped arranging.",
    )
  }
  return strip
}

/**
 * The span a two-net part's construction asks for: `|strip a - strip b| + 1`,
 * refused when it is outside the TOOL's own range.
 *
 * **IT IS A PRE-FLIGHT AND IT RUNS OVER EVERY PART BEFORE ANY GESTURE.** A
 * construction that KNOWS it is asking for an unreachable span says so where the
 * remedy is rather than emitting a candidate for `HC5` to reject anonymously,
 * and refusing before the first gesture means a refused run has written nothing.
 *
 * **WHAT IT CAN KNOW IS THE TOOL'S RANGE AND NOT THE PART'S.** `SeedInput`
 * carries no footprint map, so the tighter per-footprint `maxSpanHoles` in
 * `lib/kicad/lead-span.ts` is unreachable from here and `HC5` is what applies
 * it. A span outside 2-16 holes is one no footprint's `maxSpanHoles` can
 * accommodate, so that is the subset this arm refuses on.
 *
 * **IT IS EXPORTED BECAUSE IT IS UNREACHABLE THROUGH `seedCandidate` ON EVERY
 * COMMITTED BOARD, AND A GUARD NO TEST CAN DRIVE IS A GUARD THAT HAS ALREADY
 * STOPPED WORKING.** The gathered arrangement's bandwidth is at most 11 (on
 * low-cut), so the widest span any of the five boards asks for is 12 - inside
 * the tool's 16 with margin. The refusal is for an arrangement nobody has
 * produced yet, which is exactly why it is tested directly.
 */
export function constructionSpan(ref: string, stripA: number, stripB: number, board: string): number {
  const needed = Math.abs(stripA - stripB) + 1
  if (needed > TOOL_MAX_SPAN_HOLES || needed < TOOL_MIN_SPAN_HOLES) {
    throw new Error(
      `seedCandidate: the construction puts ${ref}'s two nets on strips ${stripA} and ` +
        `${stripB} of ${board}, which asks for a span of ${needed} holes - outside the ` +
        `tool's own ${TOOL_MIN_SPAN_HOLES}-${TOOL_MAX_SPAN_HOLES}, so no footprint's ` +
        "maxSpanHoles in lib/kicad/lead-span.ts can accommodate it and no part can be bent " +
        "to it. It is refused here rather than emitted for HC5 to reject anonymously, " +
        "because the remedy is in the span data and in the arrangement, not in the layout.",
    )
  }
  return needed
}

/**
 * The **constructed** arm: one net per strip, each part turned across the strips
 * of its two nets and stretched to reach, the junction's `SIP5` placed first as
 * a fixed sub-arrangement.
 *
 * *"Should land at or near `J = 0`"* is the conjecture this arm IS. The
 * arithmetic behind it - one net per strip costs zero cuts - is proved in COST
 * and stays there; that it is a good place to start searching from is this arm's
 * claim and the comparison's question.
 *
 * **THE SPAN REFUSAL IS A PRE-FLIGHT OVER EVERY PART, BEFORE ANY GESTURE.** A
 * construction that KNOWS it is asking for an unreachable span says so where the
 * remedy is rather than emitting a candidate for `HC5` to reject anonymously -
 * and refusing before the first gesture means a refused run has written nothing.
 * What it can know is the TOOL's range: `SeedInput` carries no footprint map, so
 * the tighter per-footprint `maxSpanHoles` in `lib/kicad/lead-span.ts` is not
 * reachable from here and `HC5` is what applies it. A span outside 2-16 holes is
 * one no footprint's `maxSpanHoles` can accommodate, so that is the subset this
 * arm refuses on. **`leadSpanFor` is therefore NOT consumed by this task** -
 * the plan's interface list names it, and nothing here can call it.
 *
 * **WHAT THIS ARM DOES NOT CLAIM.** It emits the gestures its arrangement
 * implies, in the order the rotation measurement forces - move, then turn, then
 * stretch. Whether the fork's rotation about the rect's centre leaves each lead
 * exactly on the strip the arrangement named is NOT asserted here and is not
 * asserted anywhere: the start proposes and `grade.ts` measures. What IS checked
 * before each gesture is emitted is that the fork will accept it, through the
 * same `appliedGestures` model the random arm draws through.
 */
export function constructedGestures(input: SeedInput, spawn: SpawnVeroroute): readonly Gesture[] {
  const { text, dump } = readBoard(spawn, input.importedBoard)
  const assignment = assignStrips(input.targets, input.seed)
  const junction = junctionNets(input.targets)
  const board = input.targets.board
  const nets = netsByPart(text, referenceNetsFor(input.targets), board)

  const junctionSet = new Set(junction)
  const junctionPart = dump.parts.find((part) => {
    const own = nets.get(part.ref) ?? []
    return own.length === junctionSet.size && own.every((net) => junctionSet.has(net))
  })
  if (junctionPart === undefined) {
    throw new Error(
      `seedCandidate: ${board}'s model carries a junction on nets ${junction.join(", ")}, but no ` +
        "part on this dump names exactly those nets, so the SIP5 sub-arrangement has nothing to " +
        "place. It is NOT skipped: the junction at 1-hole pitch is the only component on these " +
        "boards forcing more than two nets together, and a construction that quietly left it to " +
        "the general rule would put five nets on one strip and cost four cuts.",
    )
  }

  // PRE-FLIGHT: every part's required span, before anything is spawned.
  const plan: { part: Part; strips: readonly number[]; needed: number }[] = []
  for (const part of dump.parts) {
    if (part.ref === junctionPart.ref) continue
    const own = (nets.get(part.ref) ?? []).map((net) => stripFor(assignment, net, board))
    if (own.length === 0) {
      throw new Error(
        `seedCandidate: part ${part.ref} on ${board} names no net at all in the dump's NODE ` +
          "lines, so the construction has no strip to put it on. It is not left where it is: a " +
          "part the arrangement does not account for makes the one-net-per-strip claim false " +
          "about the board it produced.",
      )
    }
    if (own.length > 2) {
      throw new Error(
        `seedCandidate: part ${part.ref} on ${board} names ${own.length} nets, and the ` +
          "construction's rule turns a part across the strips of its TWO nets. The junction's " +
          "SIP5 is the only part with a sub-arrangement for more, and this is not it. It is " +
          "NOT laid along one strip instead: that would put every one of its nets on that " +
          "strip and cost a cut per net, silently, under a rule that claims zero.",
      )
    }
    const needed =
      own.length === 1
        ? leadSpanHoles(dump, part.ref)
        : constructionSpan(part.ref, own[0]!, own[1]!, board)
    plan.push({ part, strips: own, needed })
  }

  const gestures: Gesture[] = []
  const grid = dump.grid
  let working = occupancyOf(dump)

  /**
   * Place one part on the strip the arrangement gave it, at the FIRST column it
   * fits at and can take its own turn and stretches from.
   *
   * **THE STRIP IS DECIDED BY THE ARRANGEMENT AND THE COLUMN IS THE ONLY
   * FREEDOM**, so the column is searched rather than drawn: left to right, the
   * first one that admits the whole gesture sequence. That is deterministic
   * (this arm's only randomness is the seeded arrangement itself) and it is
   * narrowing rather than retrying - `appliedGestures` answers before anything
   * is emitted, so no refusal is discovered by attempting one.
   *
   * It replaced a cursor that advanced two columns per part and consulted
   * nothing. That cursor is deleted rather than kept beside this: it put parts
   * on top of each other and on top of the board's pads, and against the real
   * binary it stopped the arm on `junction_signals`' first gestures on four
   * seeds out of five.
   */
  const place = (ref: string, strip: number, turns: number, stretchBy: number): void => {
    // THE MOVE'S ROW IS NOT THE STRIP, AND ASSUMING IT WAS IS WHAT BROKE THIS
    // ARM AGAINST THE REAL BINARY. `--move --to` names the footprint's TOP-LEFT
    // corner, and a quarter turn then shifts that corner by
    // `trunc((DY - DX) / 2)` rows - upwards for every part lying along a strip -
    // so a part sent to row 2 and turned lands at row 0 or above it and the fork
    // refuses the pan. The row that gets the part onto its strip is therefore
    // SEARCHED, with the model answering where each candidate ends up, rather
    // than computed by a shift written out here: the shift depends on the rect's
    // dimensions at each step, and a second copy of that arithmetic is the thing
    // `./seed-geometry.ts` exists to prevent.
    //
    // THE TARGET IS THE TURNED RECT'S TOP ROW. The occupancy model tracks rects
    // and not leads, and for every type `VEROROUTE_FOOTPRINT_ROWS` covers the
    // first lead sits on the rect's edge along the axis the leads run on - so
    // after the turn the rect's top row IS the strip the first lead lands on.
    // That is a property of those four footprints and not of footprints in
    // general, which is one more reason the whitelist refuses an unrecorded type.
    for (let row = 0; row < grid.rows; row += 1) {
      for (let col = 0; col < grid.cols; col += 1) {
        const after = appliedGestures(working, grid, ref, [row, col], turns, stretchBy)
        if (after === undefined) continue
        if (rectOf(after, ref).row !== strip) continue
        gestures.push(move(ref, row, col))
        for (let turn = 0; turn < turns; turn += 1) gestures.push(rotate(ref))
        const direction = stretchBy > 0 ? "grow" : "shrink"
        for (let step = 0; step < Math.abs(stretchBy); step += 1) {
          gestures.push(stretch(ref, direction))
        }
        working = after
        return
      }
    }
    throw new Error(
      `seedCandidate: the construction puts ${ref} on strip ${strip} of ${board}, and no hole on ` +
        `this ${grid.rows}x${grid.cols} grid leaves it there after its ${turns} quarter turn(s) ` +
        `and ${Math.abs(stretchBy)} stretch step(s), beside the parts already placed ` +
        `(${[...working.keys()].filter((other) => other !== ref).join(", ")}). It is NOT moved to ` +
        "another strip: the strip IS the arrangement, and a part on a strip the arrangement did " +
        "not give it makes the one-net-per-strip claim false about the board produced. This is " +
        "the construction being too fragile for this board - the failure mode the comparison " +
        "exists to be able to find - and it is reported per seed rather than aborting the run.",
    )
  }

  // The junction first: its five 1-hole-pitch pins onto five consecutive strips,
  // the first of them on the strip its first pin's net was assigned. It never
  // stretches - a SIP5's pitch is fixed.
  place(
    junctionPart.ref,
    stripFor(assignment, junction[0]!, board),
    alongOneStrip(dump, junctionPart) ? 1 : 0,
    0,
  )

  for (const { part, strips, needed } of plan) {
    const turns = strips.length === 2 && alongOneStrip(dump, part) ? 1 : 0
    const stretchBy = strips.length === 2 ? needed - leadSpanHoles(dump, part.ref) : 0
    place(part.ref, strips[0]!, turns, stretchBy)
  }
  gestures.push(autofill())
  return gestures
}

/**
 * The **import** arm: `--import`'s own placement, the ribbon, copied into the
 * run directory and painted.
 *
 * It costs nothing to include because it is what exists, and it is the only arm
 * with no code behind its placement at all. **It has exactly one start**: the
 * seed changes nothing about it, so its candidate path carries no seed either
 * and its restarts repeat the same start. That asymmetry is recorded rather than
 * corrected - randomising it would make it a second random arm wearing the
 * ribbon's name.
 */
export function importGestures(): readonly Gesture[] {
  return [autofill()]
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

export function randomGestures(input: SeedInput, spawn: SpawnVeroroute): readonly Gesture[] {
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
  gestures.push(autofill())
  return gestures
}

