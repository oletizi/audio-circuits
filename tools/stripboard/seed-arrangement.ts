/**
 * The three DERIVATIONS the starting arms read, and nothing that drives the
 * binary.
 *
 * `./seed.ts` owns the arms, the selector and the gesture driver; this file
 * owns the data two of them consult - the constructed arm's strip assignment
 * and the junction's net list, and the random arm's enumerated position set.
 * The split is by that seam and no other, for the reason `lead-span.ts` /
 * `lead-span-model.ts` and `dump.ts` / `dump-model.ts` already split: one
 * file carrying both would be past this repository's 300-500 line ceiling.
 * Every name here is re-exported from `./seed.ts`, which is the module the
 * plan names and every consumer imports.
 *
 * THE DIRECTION OF THE IMPORT IS WHAT KEEPS IT ACYCLIC: nothing here imports
 * `./seed.ts`. `StripAssignment` is declared here rather than there for that
 * reason alone.
 *
 * WHAT IS A CONJECTURE HERE AND WHAT IS ARITHMETIC. *"One net per strip costs
 * zero cuts"* is arithmetic: `C = N + J - S_occ` with `S_occ = N` and `J = 0`
 * gives `C = 0`, and COST proves it. *"Therefore it is a good place to start
 * searching from"* is a conjecture, it is the constructed arm's whole content,
 * and Task 16's comparison exists to be able to come out against it. Nothing in
 * this file should be read as evidence for the second claim.
 */
import { physicalBoard, asModuleOwner } from "../../circuits/pultec/physical/board.ts"
import type { BoardDump } from "../guide/dump.ts"
import type { BoardTargets } from "./targets.ts"
import type { Component } from "../../lib/model/types.ts"

/**
 * Net to strip index, one net per strip: the **constructed** arm's own datum
 * and no other arm's. The import arm never computes one and the random arm
 * never consults one.
 */
export type StripAssignment = ReadonlyMap<string, number>

/**
 * **mulberry32**, named: a 32-bit state advanced by the golden-ratio-derived
 * odd constant `0x6d2b79f5`, two xorshift-multiply rounds, divided by `2^32` to
 * land in `[0, 1)`. The name is here, in the test that pins it, and in Task
 * 18's manifest record, so the stream a seed claims is identifiable.
 *
 * **DECLARED HERE, AND THERE IS EXACTLY ONE OF IT.** The plan moved it from
 * Task 18 to Task 16 because the random arm needs it first, for the one reason
 * worth moving a declaration over: two PRNGs would make two runs that claim one
 * seed. It sits in this file rather than in `./seed.ts` because `assignStrips`
 * below draws from it and nothing here may import `./seed.ts`; `./seed.ts`
 * re-exports it, which is the module every consumer names.
 *
 * It is NOT a uniformity claim. The test beside it establishes
 * reproducibility from the seed and the `[0, 1)` range, and `drawFrom`'s test
 * establishes the index map - nothing in this plan tests the stream's
 * distribution, and no result here rests on it being uniform.
 */
export function seededPrng(seed: number): () => number {
  if (!Number.isInteger(seed) || seed < 0) {
    throw new Error(
      `seededPrng: the seed is ${seed}, and a seed is a non-negative whole number - ` +
        "stripboard/rules.json's seed list is checked for exactly that (rules-seeds-entry), " +
        "and PIPELINE V6 records one per candidate. It is not coerced: a stream seeded from a " +
        "value that did not come from the reviewed list is a run nothing can reproduce.",
    )
  }
  // The offset keeps seed 0 off mulberry32's own zero state, which is a
  // legitimate state but makes "seed 0" look like "no seed" in a trace.
  let state = (seed + 0x9e3779b9) >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * One item from an enumerated list, indexed by one draw:
 * `items[floor(draw() * items.length)]`.
 *
 * The random arm's ONE point of choice, exported so the index map is testable
 * without a board. Refuses an empty list by name rather than returning
 * `undefined`, and refuses a draw outside `[0, 1)` rather than clamping it -
 * a clamped draw would quietly make the first or last item twice as likely,
 * which is a change to the control arm's distribution made by a guard.
 */
export function drawFrom<T>(items: readonly T[], draw: () => number): T {
  if (items.length === 0) {
    throw new Error(
      "drawFrom: the list is empty, so there is nothing to draw. It is not defaulted and there " +
        "is no retry: the caller enumerated this list, and an empty one is the caller's own " +
        "answer that no choice exists - which is a refusal to report by name, not a draw to " +
        "repeat.",
    )
  }
  const value = draw()
  const index = Math.floor(value * items.length)
  if (!Number.isInteger(index) || index < 0 || index >= items.length) {
    throw new Error(
      `drawFrom: the draw returned ${value}, which indexes ${index} into a list of ` +
        `${items.length}. A draw is in [0, 1) - seededPrng's own range - and this one is not. ` +
        "It is not clamped: clamping would make an end item twice as likely and silently " +
        "change the control arm's distribution.",
    )
  }
  const item = items[index]
  if (item === undefined) {
    throw new Error(`drawFrom: index ${index} of ${items.length} holds nothing.`)
  }
  return item
}

/** The model id the junction's signal row carries, in `circuits/pultec/physical/parts.ts`. */
const JUNCTION_ID = "junction_signals"

/** The board-name prefix every Pultec section board carries under `boards/`. */
const PULTEC_PREFIX = "pultec-"

/**
 * The section a `BoardTargets.board` names, or a refusal.
 *
 * `BoardTargets` carries the board's NAME and not its network, so the only
 * route from a target set back to the model is this one. It is a refusal and
 * not a guess: a name outside `pultec-<section>` is a board whose junction
 * this file knows nothing about, and the sub-arrangement below must not be
 * applied to it on the strength of a name that merely parsed.
 */
function sectionOf(board: string): string {
  if (!board.startsWith(PULTEC_PREFIX)) {
    throw new Error(
      `junctionNets: "${board}" is not a Pultec section board, so it has no ${JUNCTION_ID} ` +
        `component to read the junction's nets from. Board names reaching here are ` +
        `"${PULTEC_PREFIX}<section>" as boards/ spells them. It is NOT defaulted to an empty ` +
        "list: an empty junction would make the constructed arm's junction clause a no-op " +
        "nobody noticed, and the SIP5 at 1-hole pitch is the only component on these boards " +
        "forcing more than two nets together - the one thing the sub-arrangement exists for. " +
        "Fix the caller to pass the targets of a board that has a junction, or do not use the " +
        "constructed arm on this board.",
    )
  }
  return board.slice(PULTEC_PREFIX.length)
}

/** Every net one component's pins name, keyed by pin name. */
function pinNets(component: Component): ReadonlyMap<string, string> {
  const nets = new Map<string, string>()
  for (const group of [component.pins, ...component.units.map((unit) => unit.pins)]) {
    for (const [pin, connection] of Object.entries(group)) {
      if (connection.kind === "net") nets.set(pin, connection.net)
    }
  }
  return nets
}

/**
 * Pin names in the order the part's own numbering gives them: numerically when
 * every name is a number, which is what a `SIP5`'s `1`..`5` are, and by name
 * otherwise. `Object.keys` order is insertion order, which is a property of how
 * the component literal was written rather than of the part, so it is not
 * relied on.
 */
function orderedPinNames(nets: ReadonlyMap<string, string>): readonly string[] {
  const names = [...nets.keys()]
  if (names.every((name) => /^\d+$/.test(name))) {
    return [...names].sort((a, b) => Number(a) - Number(b))
  }
  return [...names].sort()
}

/**
 * The nets the junction's `SIP5` carries, in its own pin order.
 *
 * DERIVED FROM THE COMPONENT'S OWN PINS AND NEVER WRITTEN OUT HERE, so the
 * sub-arrangement cannot drift from the model: the five names live in
 * `circuits/pultec/physical/parts.ts`'s `junctionSignalComponent` and are read
 * from the board this target set was derived from.
 *
 * REFUSES rather than returning an empty list, on three separate conditions -
 * a board that is not a Pultec section, a section whose network carries no
 * `junction_signals`, and a junction whose nets are not all in the target
 * set's own net graph. The last one catches the case this file cannot
 * otherwise see: `BoardTargets` is derived once and passed around, so targets
 * built from a DIFFERENT network than `physicalBoard(section)` returns would
 * otherwise have the junction's nets silently assigned strips no part of this
 * board is on.
 */
export function junctionNets(targets: BoardTargets): readonly string[] {
  const section = asModuleOwner(sectionOf(targets.board))
  const network = physicalBoard(section)
  const junction = network.components.find((component) => component.id === JUNCTION_ID)
  if (junction === undefined) {
    throw new Error(
      `junctionNets: ${targets.board}'s network carries no component with id "${JUNCTION_ID}", ` +
        `so there are no junction nets to read off its pins. It is NOT defaulted to an empty ` +
        "list: an empty list would make the constructed arm's junction clause a no-op nobody " +
        "noticed. Either the junction left circuits/pultec/physical/parts.ts under a new id - " +
        "in which case JUNCTION_ID in tools/stripboard/seed-arrangement.ts is the one place to " +
        "change - or this board genuinely has no junction and the constructed arm has no " +
        "sub-arrangement to apply to it.",
    )
  }
  const nets = pinNets(junction)
  const ordered = orderedPinNames(nets).map((pin) => {
    const net = nets.get(pin)
    if (net === undefined) {
      throw new Error(`junctionNets: ${JUNCTION_ID} pin ${pin} names no net on ${targets.board}.`)
    }
    return net
  })
  const known = new Set(targets.netGraph.nets)
  const missing = ordered.filter((net) => !known.has(net))
  if (missing.length > 0) {
    throw new Error(
      `junctionNets: ${JUNCTION_ID} on ${targets.board} names ${missing.join(", ")}, which the ` +
        "target set's own net graph does not carry. The two were derived from different " +
        "networks. It is not reconciled by dropping the missing nets: a junction net with no " +
        "strip is a net the sub-arrangement silently stops arranging. Derive the targets from " +
        "physicalBoard(section) for this same section.",
    )
  }
  return ordered
}

/**
 * One net per strip, in the reverse-Cuthill-McKee arrangement's order with the
 * junction's five nets gathered into one contiguous block, perturbed by `seed`
 * adjacent-block transpositions.
 *
 * THE GATHERING IS WHY THIS IS NOT JUST `targets.ordering`, and it is a
 * correction to the brief's own test: the junction's five nets are consecutive
 * in the RCM ordering on hi-boost ALONE - measured positions 1,3,4,0,2 there,
 * against 3,4,12,5,6 on hi-cut, 2,12,1,3,4 on low-cut, 5,4,3,6,12 on low-boost
 * and 24,20,19,22,21 on mid. So an assignment that was the ordering verbatim
 * would put the `SIP5`'s five 1-hole-pitch pins on five NON-consecutive strips
 * on four of the five boards, which the part cannot do at all. "Builds the
 * ordering around it rather than against it" is what that leaves, and this is
 * it: the five come out of the ordering and go back in, in the junction's own
 * pin order, at the index where the first of them stood.
 *
 * MEASURED, because gathering could have cost more than it bought: the
 * resulting arrangement's bandwidth over `targets.netGraph.edges` is 4, 8, 11,
 * 6 and 6 on hi-boost, hi-cut, low-cut, low-boost and mid at seed 0, against
 * the RCM ordering's own 4, 9, 11, 9 and 5 - so it is not worse on four boards
 * and one wider on mid, and every figure is inside `TOOL_MAX_SPAN_HOLES - 1`.
 * `tests/stripboard/seed.test.ts` holds that bound on all five boards.
 *
 * THE PERTURBATION IS DELIBERATELY MILD AND THAT IS A LIMITATION, not a
 * subtlety: `seed` adjacent-block transpositions means seed 0 is the
 * unperturbed arrangement and the reviewed seed set `[0, 1, 2, 3, 4]` reaches
 * four swaps. A uniform shuffle would have been the random arm with extra
 * steps, so this arm's restarts explore very little - which is a thing the
 * comparison measures rather than a thing to fix here. The junction's block
 * moves as one, so its contiguity survives every seed.
 */
export function assignStrips(targets: BoardTargets, seed: number): StripAssignment {
  if (!Number.isInteger(seed) || seed < 0) {
    throw new Error(
      `assignStrips: the seed is ${seed}, and a seed is a non-negative whole number - ` +
        "stripboard/rules.json's own seed list is checked for exactly that (rules-seeds-entry). " +
        "It is not rounded or clamped: a seed that did not come from the reviewed list is a " +
        "restart nothing can reproduce.",
    )
  }
  if (targets.netCount > targets.strips) {
    throw new Error(
      `assignStrips: ${targets.board} has ${targets.netCount} nets and ${targets.strips} ` +
        "strips, so one net per strip is impossible. It is not truncated to the strips " +
        "available: the nets left over would be the ones the arrangement silently stopped " +
        "arranging, and C_floor = max(0, N - R) is already nonzero on such a board, which is " +
        "the figure that says so.",
    )
  }
  const junction = junctionNets(targets)
  const inJunction = new Set(junction)
  const rest = targets.ordering.filter((net) => !inJunction.has(net))
  const firstJunctionAt = targets.ordering.findIndex((net) => inJunction.has(net))
  // How many non-junction nets stood before the junction's first net: the index
  // the gathered block goes back in at.
  const before = targets.ordering
    .slice(0, firstJunctionAt)
    .filter((net) => !inJunction.has(net)).length

  const blocks: string[][] = [
    ...rest.slice(0, before).map((net) => [net]),
    [...junction],
    ...rest.slice(before).map((net) => [net]),
  ]
  transposeBlocks(blocks, seed)

  const assignment = new Map<string, number>()
  for (const net of blocks.flat()) assignment.set(net, assignment.size)
  if (assignment.size !== targets.netCount) {
    throw new Error(
      `assignStrips: ${targets.board} arranged ${assignment.size} nets out of ` +
        `${targets.netCount}, so a net was dropped or counted twice by the gathering. The ` +
        "arrangement is not returned in that state: one net per strip is the whole claim.",
    )
  }
  return assignment
}

/**
 * `count` adjacent-block transpositions, each at an index drawn from
 * `seededPrng(count)` - the one stream, not a second one.
 */
function transposeBlocks(blocks: string[][], count: number): void {
  if (blocks.length < 2) return
  const draw = seededPrng(count)
  for (let swap = 0; swap < count; swap += 1) {
    const at = Math.floor(draw() * (blocks.length - 1))
    const held = blocks[at]
    const next = blocks[at + 1]
    if (held === undefined || next === undefined) {
      throw new Error(
        `assignStrips: an adjacent-block transposition drew index ${at} over ` +
          `${blocks.length} blocks, which is outside the arrangement.`,
      )
    }
    blocks[at] = next
    blocks[at + 1] = held
  }
}

/** A hole, as `admissiblePositions` enumerates and compares them. */
function holeKey(row: number, col: number): string {
  return `${row},${col}`
}

/**
 * Where one part's leads sit relative to its own origin, read off its `PIN`
 * lines and its `AT` position.
 *
 * NOT FROM `SPAN`: a part's `SPAN` field is its footprint's own column count -
 * 1 for a two-pin part mounted vertically - and `tools/guide/dump.ts` states
 * outright that nothing derives a position from it. The lead holes are the
 * `PIN` lines and only the `PIN` lines.
 */
function leadOffsets(dump: BoardDump, ref: string): readonly (readonly [number, number])[] {
  const part = dump.parts.find((candidate) => candidate.ref === ref)
  if (part === undefined) {
    throw new Error(
      `admissiblePositions: this board has no part "${ref}". Its parts are ` +
        `${dump.parts.map((candidate) => candidate.ref).join(", ") || "(none)"}. It is not ` +
        "skipped: a part the enumeration cannot find is a part the arm would then never place, " +
        "and a start missing a part is not a start.",
    )
  }
  if (part.placement === "floating") {
    throw new Error(
      `admissiblePositions: part "${ref}" is FLOATING, so it prints no PIN lines and its lead ` +
        "pattern is unknown - there is no hole set to translate and therefore no admissible " +
        "position to enumerate. It is NOT treated as a bare single hole: a floating part is " +
        "also what --move itself refuses on (the shared FLOATING refusal), so the remedy is to " +
        "place it before seeding rather than to guess its footprint here.",
    )
  }
  const pins = dump.pins[ref]
  if (pins === undefined || pins.length === 0) {
    throw new Error(
      `admissiblePositions: part "${ref}" is placed at ${part.placement.row},` +
        `${part.placement.col} but the dump reports no PIN lines for it, so where its leads ` +
        "sit relative to its origin is unknown. It is not assumed to be a single hole at its " +
        "origin: that would enumerate positions for a part shape nobody measured.",
    )
  }
  const origin = part.placement
  return pins.map((pin) => [pin.row - origin.row, pin.col - origin.col] as const)
}

/** Every hole some OTHER placed part's lead occupies. */
function occupiedByOthers(dump: BoardDump, ref: string): ReadonlySet<string> {
  const taken = new Set<string>()
  for (const [other, pins] of Object.entries(dump.pins)) {
    if (other === ref) continue
    for (const pin of pins) taken.add(holeKey(pin.row, pin.col))
  }
  return taken
}

/**
 * Every in-bounds origin at which `ref` fits beside the parts already placed,
 * in row-major order.
 *
 * "FITS" IS TWO CONDITIONS AND NO THIRD: every lead hole, translated to the
 * candidate origin, lies inside `GRID`; and none of them coincides with a hole
 * another placed part's lead occupies. Cuts, solder bridges and wires are not
 * consulted - none of them stops a lead going into a hole.
 *
 * IN BOUNDS IS NOT FUSSINESS. `--move --to 40,5` on a 35x35 board exits 0 and
 * reports `GRID 41 35` - the board GREW - and `--move --to -5,5` lands the part
 * at `0,5` and moves three parts never named on the command line, because
 * `Pan()` runs before any wrap. Either renumbers every hole the next draw is
 * about to use, so a draw outside the grid is not a slightly worse placement;
 * it is a different board.
 *
 * THE SET IS ENUMERATED AND THE DRAW IS AN INDEX INTO IT, which is what makes
 * `drawFrom` able to refuse: a part with nowhere to go refuses by name rather
 * than spinning in a retry loop or falling back to where it already was.
 */
export function admissiblePositions(
  dump: BoardDump,
  ref: string,
): readonly (readonly [number, number])[] {
  const offsets = leadOffsets(dump, ref)
  const taken = occupiedByOthers(dump, ref)
  const positions: (readonly [number, number])[] = []
  for (let row = 0; row < dump.grid.rows; row += 1) {
    for (let col = 0; col < dump.grid.cols; col += 1) {
      let fits = true
      for (const [dRow, dCol] of offsets) {
        const r = row + dRow
        const c = col + dCol
        if (r < 0 || c < 0 || r >= dump.grid.rows || c >= dump.grid.cols) {
          fits = false
          break
        }
        if (taken.has(holeKey(r, c))) {
          fits = false
          break
        }
      }
      if (fits) positions.push([row, col])
    }
  }
  return positions
}

/**
 * The same dump with one part's leads moved to a new origin.
 *
 * The random arm sweeps the parts in the dump's order and each draw has to see
 * the parts already placed, so the occupancy has to advance between draws. It
 * advances HERE, in memory, rather than by re-dumping the board after every
 * gesture: one `--dump-board` per run is one reading of the board, and a
 * re-dump per part would make the arm's gesture list depend on the fork's
 * rotation geometry, which is the thing this task measured as unavailable.
 */
export function withPartMoved(
  dump: BoardDump,
  ref: string,
  to: readonly [number, number],
): BoardDump {
  const offsets = leadOffsets(dump, ref)
  const [row, col] = to
  return {
    ...dump,
    parts: dump.parts.map((part) =>
      part.ref === ref ? { ...part, placement: { row, col } } : part,
    ),
    pins: {
      ...dump.pins,
      [ref]: offsets.map(([dRow, dCol], index) => {
        const existing = dump.pins[ref]?.[index]
        if (existing === undefined) {
          throw new Error(`withPartMoved: ${ref} lost pin ${index} between two readings.`)
        }
        return { pin: existing.pin, row: row + dRow, col: col + dCol }
      }),
    },
  }
}
