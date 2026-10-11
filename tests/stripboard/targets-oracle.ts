/**
 * What P0's targets are checked AGAINST: the figures COST measured with a
 * different program, and the helpers that read residency from a second
 * vocabulary.
 *
 * ITS OWN MODULE for the reason `rules-fixtures.ts` is one: the test file is
 * long enough already, and what an expectation's SOURCE is deserves to be
 * readable on its own. Nothing here imports `tools/stripboard/targets.ts` -
 * that is the point, and `targets.test.ts`'s own comment says what each
 * figure's provenance is.
 *
 * EVERY NUMBER BELOW IS A TRANSCRIPTION FROM
 * `docs/superpowers/specs/2026-10-10-stripboard-placement-cost-design.md`
 * (COST), cited per field. None was computed here and none was copied from
 * this pipeline's own output: they were produced by `scratchpad/netgraph.ts`
 * and `scratchpad/verify-identity.ts` while COST was being written, which is
 * what makes reproducing them an agreement between two implementations.
 *
 * THE FOUR SOURCES AN EXPECTATION MAY COME FROM, and no fifth:
 *
 * 1. **COST's measured tables** - §1.6's per-board `C`, `N`, `S_occ` and `J`,
 *    §2.2's and §2.3's board facts, §5's κ fractions and §6.4's net-graph row
 *    per board. The table below, field by field.
 * 2. **The identity run backwards** against those terms: §1.6 reports `C`,
 *    `N` and `S_occ` AND the `J` it derived, so `segmentJoins` is handed
 *    three of them and checked against the fourth.
 * 3. **Hand-counted fixtures**: the small dumps in the test file, whose
 *    strips are counted in the comment beside them, and the hand-built
 *    network whose nets, edges and degrees are enumerated in full.
 * 4. **The frozen low-boost dump**, read for its own terms rather than
 *    restated: its `PAD` line count resolves `P` against COST §2.3's
 *    on-board pin count, which is a different column.
 *
 * WHAT IS *NOT* AN INDEPENDENT ORACLE, recorded so nobody mistakes it for
 * one: `netPairsOf` below is the same relation `deriveTargets` uses to force
 * an edge, by the brief's own design, so the test and the implementation
 * agree about what "forces an edge" MEANS. What makes the off-board test
 * discriminating is RESIDENCY, which comes from `offBoard` - the list by id -
 * while the module reads the `part.footprint`/`part.symbol` marker.
 */
import { OFF_BOARD_IDS as MID_OFF_BOARD } from "../../circuits/pultec/physical/mid.ts"
import { OFF_BOARD_IDS as HI_BOOST_OFF_BOARD } from "../../circuits/pultec/physical/hi-boost.ts"
import { OFF_BOARD_IDS as HI_CUT_OFF_BOARD } from "../../circuits/pultec/physical/hi-cut.ts"
import { OFF_BOARD_IDS as LOW_CUT_OFF_BOARD } from "../../circuits/pultec/physical/low-cut.ts"
import { OFF_BOARD_IDS as LOW_BOOST_OFF_BOARD } from "../../circuits/pultec/physical/low-boost.ts"
import type { Component, Network } from "../../lib/model/types.ts"

/** One board's measured figures. */
export interface MeasuredBoard {
  readonly section: string
  /**
   * The off-board components BY ID, from `circuits/pultec/off-board.ts`
   * through `sectionBoard`. A SECOND VOCABULARY for residency: the module
   * under test reads the `part.footprint`/`part.symbol` marker instead, and
   * `targets.test.ts` holds the two against each other.
   */
  readonly offBoard: ReadonlySet<string>
  /** COST §2.3's "nets (model)", and §6.4's first column. */
  readonly nets: number
  /** COST §6.4: net-graph edges, forced by on-board components. */
  readonly edges: number
  readonly maxDegree: number
  /** COST §6.4's `⌈maxdeg/2⌉`, transcribed rather than recomputed. */
  readonly lowerBound: number
  /** COST §6.4's "bandwidth of one RCM ordering (an upper bound)". */
  readonly rcm: number
  /** COST §1.6: the COMMITTED layout's cut count. */
  readonly cuts: number
  /** COST §1.6: `N` for that layout - stale against the model, deliberately. */
  readonly layoutNets: number
  /** COST §1.6: `S_occ` for that layout. */
  readonly occupied: number
  /** COST §1.6: the `J` it derived, which the identity is checked against. */
  readonly joins: number
  /** COST §2.2's "P (pins on board)" for that layout. */
  readonly layoutPins: number
  /** COST §5's `J / (P − N)` fraction for that layout. */
  readonly kappa: number
}

/** All five Pultec sections, in COST's own table order. */
export const BOARDS: readonly MeasuredBoard[] = [
  { section: "mid", offBoard: MID_OFF_BOARD,
    nets: 28, edges: 29, maxDegree: 6, lowerBound: 3, rcm: 5,
    cuts: 65, layoutNets: 23, occupied: 4, joins: 46, layoutPins: 71, kappa: 46 / 48 },
  { section: "hi-boost", offBoard: HI_BOOST_OFF_BOARD,
    nets: 20, edges: 21, maxDegree: 6, lowerBound: 3, rcm: 4,
    cuts: 40, layoutNets: 16, occupied: 3, joins: 27, layoutPins: 44, kappa: 27 / 28 },
  { section: "hi-cut", offBoard: HI_CUT_OFF_BOARD,
    nets: 14, edges: 19, maxDegree: 10, lowerBound: 5, rcm: 9,
    cuts: 32, layoutNets: 11, occupied: 3, joins: 24, layoutPins: 35, kappa: 24 / 24 },
  { section: "low-cut", offBoard: LOW_CUT_OFF_BOARD,
    nets: 14, edges: 22, maxDegree: 12, lowerBound: 6, rcm: 11,
    cuts: 23, layoutNets: 9, occupied: 2, joins: 16, layoutPins: 27, kappa: 16 / 18 },
  { section: "low-boost", offBoard: LOW_BOOST_OFF_BOARD,
    nets: 14, edges: 22, maxDegree: 10, lowerBound: 5, rcm: 9,
    cuts: 5, layoutNets: 9, occupied: 5, joins: 1, layoutPins: 27, kappa: 1 / 18 },
]

/** low-cut's residency list, for the off-board-forces-no-edge test. */
export { LOW_CUT_OFF_BOARD }

/** The message a call refused with, or "" when it did not refuse. */
export function refusalFrom(call: () => unknown): string {
  try {
    call()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ""
}

/**
 * A four-by-four dump carrying `lines`, on the given strip axis.
 *
 * The four header lines are what `boardGeometry` and `parseBoardDump`
 * require present - `GRID`, `VERTICAL_STRIPS` and `CUT_STATE` - so a fixture
 * below states only the holes it is about. `VERO_TRACKS 1` rides along
 * because a real stripboard dump carries it.
 */
export function dumpWithAxis(verticalStrips: 0 | 1, lines: readonly string[]): string {
  return [
    "GRID 4 4", "VERO_TRACKS 1", `VERTICAL_STRIPS ${verticalStrips}`, "CUT_STATE COMPUTED",
    ...lines,
  ].join("\n")
}

/**
 * Every unordered pair of distinct nets this component's pins touch.
 *
 * THE SAME RELATION `deriveTargets` USES to force an edge, by the brief's
 * design, so the test and the implementation agree about what "forces an
 * edge" means while deriving it separately. What discriminates is residency,
 * which comes from `offBoard` above.
 */
export function netPairsOf(component: Component): readonly (readonly [string, string])[] {
  const nets: string[] = []
  for (const group of [component.pins, ...component.units.map((unit) => unit.pins)]) {
    for (const connection of Object.values(group)) {
      if (connection.kind === "net" && !nets.includes(connection.net)) nets.push(connection.net)
    }
  }
  const pairs: (readonly [string, string])[] = []
  for (let i = 0; i < nets.length; i += 1) {
    for (let j = i + 1; j < nets.length; j += 1) pairs.push([nets[i], nets[j]])
  }
  return pairs
}

/** The network's components on, or off, the board by the residency list. */
export function componentsOf(
  network: Network,
  offBoard: ReadonlySet<string>,
  want: "on" | "off",
): readonly Component[] {
  return network.components.filter((component) =>
    (want === "off") === offBoard.has(component.id))
}

/** Whether some ON-BOARD component joins these two nets, and so forces the edge anyway. */
export function joinsOnBoard(
  network: Network,
  offBoard: ReadonlySet<string>,
  a: string,
  b: string,
): boolean {
  return componentsOf(network, offBoard, "on").some((component) =>
    netPairsOf(component).some(([x, y]) => (x === a && y === b) || (x === b && y === a)))
}
