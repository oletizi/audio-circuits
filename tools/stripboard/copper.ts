/**
 * HC8's copper reconstruction: the connected components of a stripboard's
 * copper, computed here rather than asked of VeroRoute.
 *
 * THE AUTHORITY for everything below is HC8 and the trust-boundary
 * paragraphs around it in
 * `docs/superpowers/specs/2026-10-10-stripboard-acceptance-criteria.md`.
 * Where this module and that document differ, the document wins and this
 * comment is the defect.
 *
 * THE CONTRACT VERSION. `GEOMETRY_CONTRACT_VERSION` is the version of the
 * dump-line contract this reconstruction reads: the lines in
 * `CONTRACTED_LINES`, with the fields CRITERIA's geometry-contract table
 * lists. A bump means the set of lines read, or the fields read from one of
 * them, CHANGED - so a consumer pinned to version 1 can no longer assume it
 * knows what was consumed. It is not a version of this file: a refactor that
 * reads the same fields does not bump it. Both are declared in, and
 * re-exported from, `geometry-contract.ts`, which also holds the nine
 * refusals' reasons.
 *
 * THE THREE JOIN MECHANISMS, AND THERE IS NO FOURTH. COST 1.5 enumerates
 * them and this module implements exactly them:
 *   1. an uncut within-strip neighbour,
 *   2. a derived solder bridge between adjacent strips at a shared
 *      along-strip coordinate (a `SOLDER` line),
 *   3. a wire (a `WIRE` line's two ends).
 * A COMPONENT LEAD IS NOT ONE. "A component lead can never supply a join":
 * a two-terminal part's leads sit on two different nets by construction, and
 * "a pipeline that treats a stretched resistor as a bridge will produce
 * boards that do not conduct and score them as if they did." So `PIN` lines
 * are read for WHERE leads sit (`pinHoles`) and never as edges.
 *
 * THE ONE CLAUSE THAT IS A DEFINITION RATHER THAN DATA, carried verbatim
 * from HC8's contract because nothing in the dump states it: "two holes are
 * electrically connected by an uncut strip when they lie on the same strip -
 * equal `row` if `VERTICAL_STRIPS 0`, equal `col` if `VERTICAL_STRIPS 1` -
 * and no `CUT` line separates them." A `CUT` names two strip-adjacent holes
 * and severs the copper BETWEEN them, so two holes on one strip are
 * connected exactly when no `CUT` pair lies strictly between their
 * along-strip coordinates.
 *
 * IT NEVER READS `NODE` LINES OR ANY `nodeId`, AND THAT IS THE
 * INDEPENDENCE, not a style choice. A `CUT` line's two `nodeId` fields are
 * `Element::GetNodeId()` - VeroRoute's own net assignment arriving by a
 * second route - and a reconstruction that let one of them into a component
 * key would be re-reading `GetBoardMembership` under a new name and
 * reporting an independence it does not have. The node ids are not read into
 * the graph and are not read into the refusal messages either, so there is
 * no path by which one reaches a verdict.
 *
 * THE NINE REFUSALS (`GeometryRefusal`), and why none can be guessed past.
 * `geometry-contract.ts`'s `notDefaultedBecause` carries one sentence per
 * member and is the single wording; the summary here is the map:
 *   - `missing-line`                 the extent and the strip axis are definitions, not defaults
 *   - `unsupported-strip-axis`       "the same strip" has no meaning until the axis is read
 *   - `cuts-not-computed`            an absent cut list is not an empty one
 *   - `out-of-bounds`                clamping a coordinate invents a hole
 *   - `cut-not-strip-adjacent`       which intervening gap to sever is not derivable
 *   - `cut-across-strips`            a cut severs a strip ALONG its run
 *   - `duplicate-pin`                de-duplicating hides a concatenated dump or a bad parse
 *   - `conflicting-pin`              one lead cannot be in two holes; picking either picks a board
 *   - `solder-not-strip-neighbours`  a non-neighbour join is a mechanism the edge set has not got
 * EVERY INPUT IS VALIDATED BEFORE ANY UNION IS PERFORMED. A graph
 * half-built from input later found malformed is a graph somebody debugs
 * instead of rejects.
 *
 * THE TRUST BOUNDARY, stated here because this is where the independence is
 * claimed, and because the honest scope is narrower than "independent".
 * This is INDEPENDENT CONNECTIVITY RECONSTRUCTION FROM VEROROUTE-REPORTED
 * PHYSICAL GEOMETRY. It is independent of VeroRoute's MEMBERSHIP
 * CALCULATION - `GetBoardMembership`, the subsystem the optimiser perturbs
 * and the one with the demonstrated hole - which is the independence that
 * matters, because that is where the measured failure was. It is NOT
 * independent of VeroRoute's GEOMETRY EXPORT: it consumes it.
 *
 *   If the dump omits a cut or misreports a pin, this module produces a
 *   consistent and wrong answer. Nothing here validates the reported
 *   geometry against the binary `.vrt`, and a defect in the export is a
 *   defect the optimiser and the verifier share.
 *
 * A FLOATING WIRE JOINS NOTHING, and there is no branch for one here
 * because none can arrive: `tools/guide/dump.ts`'s `parseWireEnd` already
 * refuses a `WIRE <name> FLOATING ENDS - -` line by name, so a dump carrying
 * one never becomes a `BoardDump`. A branch for an unreachable state would
 * be a claim this module cannot evidence; the refusal upstream is the
 * behaviour, and it is recorded in `docs/stripboard/pipeline-
 * verification.md` because it is a refusal belonging to a different module
 * than the one HC8's contract names.
 *
 * That limit is acceptable and is recorded as limit H-13 RATHER THAN AS A
 * PLAN: stronger independence means parsing a binary `QDataStream`
 * (PIPELINE N5). The nine refusals are what narrows the gap that IS
 * reachable - they reject a dump malformed on its own terms, which is the
 * part of a bad export this module can see. `docs/stripboard/pipeline-
 * verification.md` states the same limit beside V11.
 */
import { UnionFind } from "../../lib/model/union-find.ts"
import { dumpLineFields } from "../perfboard/dump-lines.ts"
import {
  parseBoardDump,
  type BoardDump,
  type Grid,
  type HolePosition,
} from "../guide/dump.ts"
import {
  CONTRACTED_LINES,
  GEOMETRY_CONTRACT_VERSION,
  LINES_REQUIRED_PRESENT,
  refuse,
} from "./geometry-contract.ts"

/**
 * The contract's own surface, re-exported here because this is the module
 * HC8's consumers were told to import. `geometry-contract.ts` holds the
 * declarations and the nine reasons; this file holds the reconstruction.
 */
export {
  CONTRACTED_LINES,
  GEOMETRY_CONTRACT_VERSION,
  notDefaultedBecause,
  type GeometryRefusal,
} from "./geometry-contract.ts"

/** A hole, as `${row},${col}` - the key the graph is built over. */
export type HoleKey = string

/** One connected region of copper per distinct number; see `copperGraph`. */
export interface CopperGraph {
  readonly components: ReadonlyMap<HoleKey, number>
  readonly componentCount: number
}

/** `${row},${col}`. The one spelling of a hole key; `parseHoleKey` is its inverse. */
export function holeKey(hole: HolePosition): HoleKey {
  if (!Number.isInteger(hole.row) || !Number.isInteger(hole.col)) {
    throw new Error(
      `holeKey: a hole is a pair of integers, got row ${hole.row} col ${hole.col}. ` +
        "No rounding is applied: a fractional hole coordinate means its producer " +
        "computed a position rather than reading one off a dump line.",
    )
  }
  return `${hole.row},${hole.col}`
}

/** The inverse of `holeKey`. Refuses anything that is not one, rather than returning a guess. */
export function parseHoleKey(key: HoleKey): HolePosition {
  const match = /^(\d+),(\d+)$/.exec(key)
  const row = match?.[1]
  const col = match?.[2]
  if (row === undefined || col === undefined) {
    throw new Error(
      `parseHoleKey: "${key}" is not a hole key. The one spelling is \`\${row},\${col}\` ` +
        "with non-negative integers, produced by holeKey(); nothing here repairs another " +
        "spelling, because a key that needs repairing came from a second spelling that " +
        "should be deleted instead.",
    )
  }
  return { row: Number(row), col: Number(col) }
}

/**
 * Parse dump text into a `BoardDump` after checking the two contracted
 * lines whose absence is malformed and the strip axis's value.
 *
 * This exists because `parseBoardDump` refuses a missing `GRID`, a missing
 * `VERTICAL_STRIPS` and an unreadable axis value with ITS OWN wording, which
 * names neither the `GeometryRefusal` member nor the contract version. Both
 * refusals are HC8's, so HC8 says them: this is the text seam where
 * `missing-line` and `unsupported-strip-axis` are reachable, since a
 * `BoardDump` has a `grid` and a `verticalStrips` by construction and cannot
 * express either fault.
 */
export function boardGeometry(dumpText: string): BoardDump {
  for (const line of LINES_REQUIRED_PRESENT) {
    if (dumpLineFields(dumpText, line).length === 0) {
      refuse("missing-line", `the dump has no ${line} line`)
    }
  }
  const axis = dumpLineFields(dumpText, "VERTICAL_STRIPS")[0]?.[1]
  if (axis !== "0" && axis !== "1") {
    refuse(
      "unsupported-strip-axis",
      `VERTICAL_STRIPS reads "${axis ?? ""}", which is neither 0 nor 1`,
    )
  }
  return parseBoardDump(dumpText)
}

/** Which strip a hole is on: its row under horizontal strips, its column under vertical ones. */
function stripOf(hole: HolePosition, verticalStrips: boolean): number {
  return verticalStrips ? hole.col : hole.row
}

/** How far along its strip a hole sits: its column under horizontal strips, its row under vertical ones. */
function alongOf(hole: HolePosition, verticalStrips: boolean): number {
  return verticalStrips ? hole.row : hole.col
}

/** One hole as a dump line names it, so a refusal can quote what it rejected. */
interface NamedHole {
  readonly hole: HolePosition
  readonly line: string
}

/**
 * Every hole every contracted line names, each with its line's text.
 *
 * `CUT` holes are rendered WITHOUT their `nodeId` fields: the node ids are
 * discarded by the contract and are not let into a message either, so there
 * is no route by which one reaches a reader as if it were evidence.
 */
function namedHoles(dump: BoardDump): NamedHole[] {
  const holes: NamedHole[] = []
  for (const [ref, pins] of Object.entries(dump.pins)) {
    for (const pin of pins) {
      holes.push({ hole: pin, line: `PIN ${ref} ${pin.pin} AT ${holeKey(pin)}` })
    }
  }
  for (const cut of dump.cuts) {
    const line = `CUT ${holeKey(cut.a)} ${holeKey(cut.b)}`
    holes.push({ hole: cut.a, line }, { hole: cut.b, line })
  }
  for (const bridge of dump.bridges) {
    const line = `SOLDER ${holeKey(bridge.a)} ${holeKey(bridge.b)}`
    holes.push({ hole: bridge.a, line }, { hole: bridge.b, line })
  }
  for (const wire of dump.wires) {
    const [a, b] = wire.ends
    const line = `WIRE ${wire.name} ENDS ${holeKey(a)} ${holeKey(b)}`
    holes.push({ hole: a, line }, { hole: b, line })
  }
  return holes
}

function assertInBounds(dump: BoardDump): void {
  const { rows, cols } = dump.grid
  for (const { hole, line } of namedHoles(dump)) {
    if (hole.row < 0 || hole.row >= rows || hole.col < 0 || hole.col >= cols) {
      refuse(
        "out-of-bounds",
        `"${line}" names hole ${holeKey(hole)}, which lies outside GRID ${rows} ${cols}`,
      )
    }
  }
}

/**
 * THE CLAUSE ORDER HERE IS LOAD-BEARING, and it was measured rather than
 * assumed: with the `cut-across-strips` clause removed, `CUT 0,1 1,1` under
 * horizontal strips refuses as `cut-not-strip-adjacent` instead - `strip` is
 * read off `cut.a`, so the along-strip gap of a cross-strip pair collapses to
 * 0 and reads as a non-adjacent pair on one strip. Both are refusals, so a
 * test asserting only that something threw would not see the swap; the
 * across-strips check therefore comes first, and the test asserts the name.
 */
function assertCutsSeverOneStrip(dump: BoardDump): void {
  for (const cut of dump.cuts) {
    const line = `CUT ${holeKey(cut.a)} ${holeKey(cut.b)}`
    const strip = stripOf(cut.a, dump.verticalStrips)
    if (strip !== stripOf(cut.b, dump.verticalStrips)) {
      refuse("cut-across-strips", `"${line}" names holes on two different strips`)
    }
    const gap = Math.abs(
      alongOf(cut.a, dump.verticalStrips) - alongOf(cut.b, dump.verticalStrips),
    )
    if (gap !== 1) {
      refuse(
        "cut-not-strip-adjacent",
        `"${line}" names two holes on strip ${strip} that are ${gap} steps apart, not 1`,
      )
    }
  }
}

function assertBridgesJoinNeighbourStrips(dump: BoardDump): void {
  for (const bridge of dump.bridges) {
    const line = `SOLDER ${holeKey(bridge.a)} ${holeKey(bridge.b)}`
    const stripGap = Math.abs(
      stripOf(bridge.a, dump.verticalStrips) - stripOf(bridge.b, dump.verticalStrips),
    )
    const sameAlong =
      alongOf(bridge.a, dump.verticalStrips) === alongOf(bridge.b, dump.verticalStrips)
    if (stripGap !== 1 || !sameAlong) {
      refuse(
        "solder-not-strip-neighbours",
        `"${line}" names holes ${stripGap} strips apart` +
          `${sameAlong ? "" : " and at two different along-strip coordinates"}`,
      )
    }
  }
}

/**
 * Where every lead sits, keyed `${ref}.${pin}`, read from `PIN` lines alone.
 *
 * A floating part prints no `PIN` lines and so has no entries - which is
 * HC3's refusal to make, not this function's. `PIN` holes are NEVER edges
 * here; see the module comment's third join mechanism and the absence of a
 * fourth.
 */
export function pinHoles(dump: BoardDump): ReadonlyMap<string, HoleKey> {
  const holes = new Map<string, HoleKey>()
  for (const [ref, pins] of Object.entries(dump.pins)) {
    for (const pin of pins) {
      const id = `${ref}.${pin.pin}`
      const key = holeKey(pin)
      const seen = holes.get(id)
      // The equal-hole clause must precede the different-hole one, and this
      // too was measured: with it removed, a repeated `PIN R1 1 AT 0,0`
      // refuses as "conflicting-pin: PIN R1.1 is reported at 0,0 and at 0,0",
      // i.e. a conflict with itself. Same refusal set, wrong member, and a
      // caller told "conflicting" would go looking for two holes.
      if (seen === key) {
        refuse("duplicate-pin", `PIN ${id} AT ${key} is reported twice`)
      }
      if (seen !== undefined) {
        refuse("conflicting-pin", `PIN ${id} is reported at ${seen} and at ${key}`)
      }
      holes.set(id, key)
    }
  }
  return holes
}

/**
 * Every hole on the board, row-major, from the `GRID` line alone.
 *
 * All of them are seeded, not only the ones some line names: a hole no line
 * mentions is still copper, and an isolated strip end is a component of one.
 */
function everyHole(grid: Grid): HoleKey[] {
  const keys: HoleKey[] = []
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      keys.push(holeKey({ row, col }))
    }
  }
  return keys
}

/** `${strip}|${along}` for each severed gap: the copper between `along` and `along + 1`. */
function severedGaps(dump: BoardDump): ReadonlySet<string> {
  const severed = new Set<string>()
  for (const cut of dump.cuts) {
    const strip = stripOf(cut.a, dump.verticalStrips)
    const lower = Math.min(
      alongOf(cut.a, dump.verticalStrips),
      alongOf(cut.b, dump.verticalStrips),
    )
    severed.add(`${strip}|${lower}`)
  }
  return severed
}

function unionUncutStripNeighbours(dump: BoardDump, sets: UnionFind): void {
  const severed = severedGaps(dump)
  const { rows, cols } = dump.grid
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const here = { row, col }
      const next = dump.verticalStrips ? { row: row + 1, col } : { row, col: col + 1 }
      if (next.row >= rows || next.col >= cols) {
        continue
      }
      const gap = `${stripOf(here, dump.verticalStrips)}|${alongOf(here, dump.verticalStrips)}`
      if (!severed.has(gap)) {
        sets.union(holeKey(here), holeKey(next))
      }
    }
  }
}

/**
 * The connected components of the board's copper, one number per region.
 *
 * `boardGeometry` IS THE ENTRY POINT THAT ENFORCES THE WHOLE CONTRACT, and a
 * caller should reach the graph through it: `copperGraph(parseBoardDump(text))`
 * still produces a graph, but it BYPASSES the two text-seam refusals,
 * `missing-line` and `unsupported-strip-axis`. Nothing silently passes that
 * way - `parseBoardDump` throws on both faults - but it throws with the
 * PARSER's wording, which names neither the `GeometryRefusal` member nor the
 * contract version, so CRITERIA's "refuses when any contracted line is absent,
 * naming the missing line and the contract version" is then discharged only by
 * an unrelated message. The narrower signature is not imposed here because
 * Task 4 is this module's declared consumer and a signature change belongs in
 * the plan; the obligation is recorded instead of being hidden.
 *
 * Validates FIRST - every refusal a `BoardDump` can express - and only then
 * unions, because a graph half-built from input later found malformed is a
 * graph somebody debugs instead of rejects.
 *
 * Component numbers are assigned in row-major order of first appearance, so
 * two runs over one dump agree and two dumps differing only in their `NODE`
 * block and `CUT` node ids produce equal maps.
 */
export function copperGraph(dump: BoardDump): CopperGraph {
  if (dump.cutState !== "COMPUTED") {
    refuse(
      "cuts-not-computed",
      `CUT_STATE ${dump.cutState} is not COMPUTED, so this dump's cut list is absent ` +
        "rather than empty",
    )
  }
  assertInBounds(dump)
  assertCutsSeverOneStrip(dump)
  assertBridgesJoinNeighbourStrips(dump)
  pinHoles(dump)

  const keys = everyHole(dump.grid)
  const sets = new UnionFind(keys, (a, b) => (a < b ? a : b))
  unionUncutStripNeighbours(dump, sets)
  for (const bridge of dump.bridges) {
    sets.union(holeKey(bridge.a), holeKey(bridge.b))
  }
  for (const wire of dump.wires) {
    sets.union(holeKey(wire.ends[0]), holeKey(wire.ends[1]))
  }

  const idByRoot = new Map<HoleKey, number>()
  const components = new Map<HoleKey, number>()
  for (const key of keys) {
    const root = sets.find(key)
    const existing = idByRoot.get(root)
    const id = existing ?? idByRoot.size
    idByRoot.set(root, id)
    components.set(key, id)
  }
  return { components, componentCount: idByRoot.size }
}
