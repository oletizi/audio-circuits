/**
 * The FABRICATION EXTENT: the region of stock a layout must be cut from, and
 * the verification that trimming to it preserves what the board conducts.
 *
 * THIS IS A MEASUREMENT MODULE, LIKE `./copper.ts`, AND NOT A SECOND PLACE A
 * CONSTRAINT IS DECIDED. It returns numbers and a comparison; `HC6` in
 * `./constraints.ts` is the only caller that turns them into a verdict. A
 * second owner of one rule is one more than this pipeline allows.
 *
 * WHY THE EXTENT IS COMPUTED RATHER THAN READ, which is the whole reason this
 * file exists. `HC6` asks whether a layout "fits the stock the owner bought" -
 * whether it can be CUT FROM that board - and CRITERIA is explicit that the
 * quantity is "the occupied extent, not the canvas", with `BOUNDS` "the exact
 * figure" that "tightens the check". The trouble is what `BOUNDS` turns out to
 * be. `Board::GetBounds` (`Src/Board.h`) returns the union of THREE sources and
 * reports failure only when all three are empty:
 *
 *   1. every grid element carrying a node id or a pin - painted copper, a
 *      wire's run, a solder-bridged hole, and every pin hole whether painted or
 *      blank;
 *   2. `m_compMgr.GetBounding()` - every component's `GetFootprintRect()`,
 *      filtered on NEITHER `GetIsPlaced()` NOR type, so an UNPLACED part still
 *      contributes the rect it last sat in;
 *   3. `m_textMgr.GetBounding()` - every TEXT LABEL's rect, which is an
 *      annotation and not a physical feature.
 *
 * So `BOUNDS` is a good reading of component bodies plus painted copper, and it
 * is the ONLY dump-readable source of a part's body extent across the strips -
 * a `PART` line carries a column span and no row span, so a multi-row
 * footprint's row extent appears nowhere else. But it is NOT a statement about
 * which features a cuttable board must RETAIN, and it can over-state: measured
 * on `transistor-preamp-staged`, `BOUNDS` reaches five columns further right
 * than any hole the dump enumerates
 * (`docs/stripboard/pipeline-verification.md` section 2.1).
 *
 * SO THE EXTENT IS THE UNION OF `BOUNDS` WITH THE ENUMERATED FEATURES, AND THE
 * UNION IS CONSERVATIVE IN THE ONE DIRECTION THAT MATTERS. A cuttable board
 * must include every physical feature that preserves connectivity - a wire
 * endpoint, a solder bridge, the copper run a cut depends on - not just the
 * component bounding box, and those features measurably reach past the pin
 * extent on committed boards. A union is never smaller than either input, so
 * `HC6` can be STRICTER than the truth and never looser. A stricter `HC6` can
 * refuse a board that would in fact fit - a label in a corner is the known
 * cause - and THAT REFUSAL IS REPORTED WITH ITS CAUSE RATHER THAN RELAXED,
 * which is `K3`'s posture applied by analogy. `featuresOutsideBounds` records
 * any feature `BOUNDS` did not already cover, which is the discriminating
 * observation and the only one the dump supports: the dump reports only the
 * union, so nothing here can attribute an excess to source 2 or source 3, and
 * `HC6`'s detail therefore names the two figures that disagreed rather than
 * explaining why. Section 2.3 records that a text label inflating `BOUNDS` is
 * UNVERIFIED and that no headless verb can demonstrate it.
 *
 * AN ABSENT `BOUNDS` REFUSES RATHER THAN FALLING BACK TO THE FEATURE EXTENT,
 * and that is Task 7's ruling, unchanged: the feature extent is a LOWER bound
 * on physical extent, because a body overhangs its leads, so substituting it
 * would silently LOOSEN the constraint. The refusal is `boundsOf`'s, in
 * `tools/guide/dump-model.ts`, so there is one wording for it.
 *
 * `A_occ` IS NOT THIS QUANTITY AND THE TWO ARE NOT INTERCHANGEABLE. `A_occ`
 * (Task 15) is `OBJ3`'s settled RANKING term, specified as a direct reading of
 * `BOUNDS`; the fabrication extent is `HC6`'s CONSTRAINT quantity and is a
 * union including features `BOUNDS` may not cover. Changing `A_occ` to the
 * union would change a settled ranking term, which is a decision and not an
 * implementation detail (`D19`), so it is deliberately not done here.
 *
 * THE VERIFICATION USES TASK 3'S `copperGraph`, which shares no code with the
 * scorer, so `trimPreservesConnectivity` inherits `HC8`'s independence: the
 * claim "a cuttable board includes every feature that preserves connectivity"
 * is made as a COMPUTATION rather than as an argument.
 */
import {
  boundsOf,
  type BoardDump,
  type Bounds,
  type Part,
} from "../guide/dump.ts"
import { copperGraph, holeKey, parseHoleKey, pinHoles, type HoleKey } from "./copper.ts"

/**
 * What kind of thing a required feature is.
 *
 * FOUR KINDS AND NO FIFTH, and `SPAN` is not one of them. A part's `SPAN` is
 * its footprint's own column count in its current direction - body width for an
 * electrolytic - and never a lead position, so nothing here derives a hole from
 * it. The dump's own rule (`tools/guide/dump.ts`): a lead's actual hole comes
 * ONLY from a `PIN` line.
 */
export type FeatureKind = "pin" | "cut" | "solder" | "wire"

/**
 * One hole a cuttable board must include, and what it belongs to.
 *
 * `names` exists so a refusal can say WHICH feature reached past the extent.
 * "the extent is too small" sends a reader to measure the board again; "wire W3
 * ends at 5,27, one column past it" sends them to the wire.
 */
export interface RequiredFeature {
  readonly kind: FeatureKind
  readonly hole: HoleKey
  readonly names: string
}

/**
 * Every hole a cuttable board must include: each `PIN` hole, BOTH holes of each
 * `CUT`, BOTH holes of each `SOLDER`, and BOTH ends of each placed `WIRE`.
 *
 * BOTH HOLES OF A CUT AND OF A BRIDGE, not one. A `CUT` names two
 * strip-adjacent holes and severs the copper BETWEEN them, so a board trimmed
 * to exclude either end has no gap to sever and the two nets the cut separates
 * stay joined. A `SOLDER` is the same fact with the sign reversed: both holes
 * are needed for there to be a join to make.
 *
 * A FLOATING WIRE CONTRIBUTES NOTHING AND THERE IS NO BRANCH FOR ONE, because
 * none can arrive: `tools/guide/dump.ts`'s `parseWireEnd` refuses a
 * `WIRE <name> FLOATING ENDS - -` line by name, so a dump carrying one never
 * becomes a `BoardDump`. A branch for an unreachable state would be a claim
 * this module cannot evidence.
 *
 * A FLOATING PART CONTRIBUTES NOTHING EITHER, and for a different reason: it
 * prints no `PIN` lines, so there are no holes to enumerate. That is `HC3`'s
 * refusal to make and not this function's.
 */
export function requiredFeatures(dump: BoardDump): readonly RequiredFeature[] {
  const features: RequiredFeature[] = []
  for (const [ref, pins] of Object.entries(dump.pins)) {
    for (const pin of pins) {
      features.push({ kind: "pin", hole: holeKey(pin), names: `pin ${ref}.${pin.pin}` })
    }
  }
  for (const cut of dump.cuts) {
    // The node ids a CUT line carries are VeroRoute's own net assignment and
    // are NOT read into this message - see ./copper.ts's independence
    // paragraph. There is no route by which one reaches a reader as evidence.
    const names = `the cut between ${holeKey(cut.a)} and ${holeKey(cut.b)}`
    features.push({ kind: "cut", hole: holeKey(cut.a), names }, { kind: "cut", hole: holeKey(cut.b), names })
  }
  for (const bridge of dump.bridges) {
    const names = `the solder bridge joining ${holeKey(bridge.a)} and ${holeKey(bridge.b)}`
    features.push(
      { kind: "solder", hole: holeKey(bridge.a), names },
      { kind: "solder", hole: holeKey(bridge.b), names },
    )
  }
  for (const wire of dump.wires) {
    const [a, b] = wire.ends
    const names = `wire ${wire.name}`
    features.push({ kind: "wire", hole: holeKey(a), names }, { kind: "wire", hole: holeKey(b), names })
  }
  return features
}

/** The region of stock a layout must be cut from. Both ends INCLUSIVE. */
export interface FabricationExtent {
  readonly minRow: number
  readonly minCol: number
  readonly maxRow: number
  readonly maxCol: number
  /** `maxRow - minRow + 1`: the strips the cut piece must have, under horizontal strips. */
  readonly rows: number
  /** `maxCol - minCol + 1`. */
  readonly cols: number
  /**
   * Whether the dump stated a `BOUNDS` rect.
   *
   * IT IS `true` ON EVERY VALUE THIS FUNCTION RETURNS, because
   * `fabricationExtent` REFUSES a dump with no `BOUNDS` rather than falling
   * back to the feature extent, and the field is recorded here rather than
   * silently dropped so that the brief's declared shape is the shape consumers
   * get. A field that cannot be `false` is noise, not evidence; it is named in
   * the task report as something to delete or to re-mean, and nothing in this
   * module branches on it.
   */
  readonly fromBounds: boolean
  /**
   * Every required feature `BOUNDS` did not already cover.
   *
   * THIS IS THE DISCRIMINATING OBSERVATION and the only one the dump supports.
   * A non-empty list means `BOUNDS` and the features disagree about how far the
   * board reaches; it does NOT say which of `GetBounds`' three sources produced
   * the difference, because the dump reports only their union.
   */
  readonly featuresOutsideBounds: readonly RequiredFeature[]
}

function outsideBounds(hole: HoleKey, bounds: Bounds): boolean {
  const { row, col } = parseHoleKey(hole)
  return row < bounds.minRow || row > bounds.maxRow || col < bounds.minCol || col > bounds.maxCol
}

/**
 * The bounding region over `BOUNDS` AND every enumerated required feature.
 *
 * Refuses, through `boundsOf`, when the dump states no `BOUNDS` rect. See the
 * module comment for why the feature extent is not substituted.
 */
export function fabricationExtent(dump: BoardDump): FabricationExtent {
  const bounds = boundsOf(dump, "HC6's fabrication extent")
  const features = requiredFeatures(dump)
  let minRow = bounds.minRow
  let minCol = bounds.minCol
  let maxRow = bounds.maxRow
  let maxCol = bounds.maxCol
  for (const feature of features) {
    const { row, col } = parseHoleKey(feature.hole)
    minRow = Math.min(minRow, row)
    minCol = Math.min(minCol, col)
    maxRow = Math.max(maxRow, row)
    maxCol = Math.max(maxCol, col)
  }
  return {
    minRow,
    minCol,
    maxRow,
    maxCol,
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
    fromBounds: true,
    featuresOutsideBounds: features.filter((feature) => outsideBounds(feature.hole, bounds)),
  }
}

/** Whether a hole lies inside the extent, both ends inclusive. */
export function withinExtent(hole: HoleKey, extent: FabricationExtent): boolean {
  const { row, col } = parseHoleKey(hole)
  return (
    row >= extent.minRow && row <= extent.maxRow && col >= extent.minCol && col <= extent.maxCol
  )
}

/** Whether trimming to an extent kept what the board conducts, and why not. */
export interface TrimVerdict {
  readonly preserved: boolean
  readonly detail: string
}

/** One hole shifted into the trimmed board's own coordinates. */
function shifted(
  hole: { readonly row: number; readonly col: number },
  extent: FabricationExtent,
): { readonly row: number; readonly col: number } {
  return { row: hole.row - extent.minRow, col: hole.col - extent.minCol }
}

function inExtent(
  hole: { readonly row: number; readonly col: number },
  extent: FabricationExtent,
): boolean {
  return withinExtent(holeKey(hole), extent)
}

/**
 * The same board as a `BoardDump` whose `GRID` is the extent, with every hole
 * shifted into it and every feature reaching outside it DROPPED.
 *
 * Dropping rather than clamping is the point: a clamped coordinate is an
 * invented hole, and the whole question is what the trimmed board loses.
 *
 * A part whose every pin was dropped is marked `floating` with no direction -
 * the one shape the dump's own grammar allows for a part that is not on the
 * board - rather than left reading as placed with no leads, which is a
 * contradiction `parseBoardDump` refuses and which would make this object
 * describe a board no dump could.
 */
function restrictedTo(dump: BoardDump, extent: FabricationExtent): BoardDump {
  const pins: Record<string, { readonly pin: string; readonly row: number; readonly col: number }[]> = {}
  for (const [ref, refPins] of Object.entries(dump.pins)) {
    const kept = refPins
      .filter((pin) => inExtent(pin, extent))
      .map((pin) => ({ pin: pin.pin, ...shifted(pin, extent) }))
    if (kept.length > 0) pins[ref] = kept
  }
  const parts: Part[] = dump.parts.map((part) => {
    if (part.placement === "floating" || pins[part.ref] !== undefined) {
      if (part.placement === "floating") return part
      return { ...part, placement: shifted(part.placement, extent) }
    }
    return { ...part, placement: "floating", direction: undefined }
  })
  return {
    grid: { rows: extent.rows, cols: extent.cols },
    // The trimmed piece's own rect, which is the whole of it by construction.
    bounds: { minRow: 0, minCol: 0, maxRow: extent.rows - 1, maxCol: extent.cols - 1 },
    verticalStrips: dump.verticalStrips,
    parts,
    pins,
    wires: dump.wires
      .filter((wire) => wire.ends.every((end) => inExtent(end, extent)))
      .map((wire) => ({
        name: wire.name,
        ends: [shifted(wire.ends[0], extent), shifted(wire.ends[1], extent)] as const,
      })),
    nodes: dump.nodes,
    cutState: dump.cutState,
    cuts: dump.cuts
      .filter((cut) => inExtent(cut.a, extent) && inExtent(cut.b, extent))
      .map((cut) => ({
        a: { ...shifted(cut.a, extent), nodeId: cut.a.nodeId },
        b: { ...shifted(cut.b, extent), nodeId: cut.b.nodeId },
      })),
    bridges: dump.bridges
      .filter((bridge) => inExtent(bridge.a, extent) && inExtent(bridge.b, extent))
      .map((bridge) => ({ a: shifted(bridge.a, extent), b: shifted(bridge.b, extent) })),
  }
}

/**
 * The PARTITION OF THE PIN HOLES a dump's copper produces: one group of
 * `ref.pin` ids per connected region, each group sorted, the groups sorted.
 *
 * KEYED BY PIN ID AND NOT BY COMPONENT ID, which is the part that makes the
 * comparison mean anything. `copperGraph` numbers its components in row-major
 * order of first appearance, so a trimmed board's numbering differs from the
 * untrimmed one's for an IDENTICAL partition - comparing the numbers would
 * report every trim as a change. A canonical form over the pin ids compares the
 * thing the question is about: which leads the copper joins.
 */
function pinPartition(dump: BoardDump): readonly string[] {
  const { components } = copperGraph(dump)
  const byComponent = new Map<number, string[]>()
  for (const [id, hole] of pinHoles(dump)) {
    const component = components.get(hole)
    if (component === undefined) {
      throw new Error(
        `unreachable: pin ${id} sits at hole ${hole}, which copperGraph's own out-of-bounds ` +
          "refusal should already have rejected if it were off the board. Reaching here means " +
          "copper.ts's seeding and its bounds check disagree, so neither may be trusted.",
      )
    }
    const group = byComponent.get(component) ?? []
    group.push(id)
    byComponent.set(component, group)
  }
  return [...byComponent.values()].map((group) => [...group].sort().join(" ")).sort()
}

/**
 * Whether the copper of a board trimmed to `extent` joins the same leads as the
 * untrimmed board's does.
 *
 * TWO FAILURE SHAPES, REPORTED IN THIS ORDER, because the first explains the
 * second and the remedies differ:
 *
 *   1. a required feature lies OUTSIDE the extent. The trimmed piece has no
 *      hole for it, so the wire cannot be fitted, the bridge cannot be made, or
 *      the gap the cut severs is not there. Reported first, naming the feature
 *      and its hole IN THE UNTRIMMED BOARD'S COORDINATES, because those are the
 *      ones a reader can go and look at.
 *   2. the partition of the pin holes DIFFERS. This is the case a bounding box
 *      hides: every named feature survived and the copper still joins a
 *      different set of leads, because a strip the trim shortened was carrying
 *      a connection between two of them.
 *
 * A PASS SAYS WHAT IT CHECKED. `detail` is non-empty either way, and on a pass
 * it carries the figures - the extent, the feature count and the group count -
 * so a pass is readable and a vacuous one is visible.
 */
export function trimPreservesConnectivity(
  dump: BoardDump,
  extent: FabricationExtent,
): TrimVerdict {
  const rect = `${extent.minRow},${extent.minCol} ${extent.maxRow},${extent.maxCol}`
  const features = requiredFeatures(dump)
  const dropped = features.filter((feature) => !withinExtent(feature.hole, extent))
  if (dropped.length > 0) {
    const named = dropped
      .slice(0, 4)
      .map((feature) => `${feature.kind} ${feature.names} at ${feature.hole}`)
      .join("; ")
    const more = dropped.length > 4 ? ` (and ${dropped.length - 4} more)` : ""
    return {
      preserved: false,
      detail:
        `trimming to ${rect} would drop ${dropped.length} of ${features.length} required ` +
        `features, so the cut piece has no hole for them: ${named}${more}. A board trimmed ` +
        "past a wire end, a bridge hole or either end of a cut does not conduct what the " +
        "untrimmed one does.",
    }
  }
  const before = pinPartition(dump)
  const after = pinPartition(restrictedTo(dump, extent))
  if (before.length !== after.length || before.some((group, index) => group !== after[index])) {
    const changed = before.find((group) => !after.includes(group))
    const witness = changed ?? before[0] ?? ""
    const hole = pinHoles(dump).get(witness.split(" ")[0] ?? "") ?? `${extent.minRow},${extent.minCol}`
    return {
      preserved: false,
      detail:
        `trimming to ${rect} keeps every required feature and still changes what the copper ` +
        `joins: ${before.length} groups of pins before, ${after.length} after, and the group ` +
        `{${witness}} (witnessed at hole ${hole}) is not one of the trimmed board's. A strip ` +
        "the trim shortened was carrying a connection between two of these leads.",
    }
  }
  return {
    preserved: true,
    detail:
      `trimming to ${rect} (${extent.rows} x ${extent.cols} holes) keeps all ${features.length} ` +
      `required features and reproduces the same ${before.length} groups of pin holes, so the ` +
      "cut piece conducts what the untrimmed board does.",
  }
}
