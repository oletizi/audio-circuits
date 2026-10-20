/**
 * THE ELK → `BlockLayout` ADAPTER: SPEC §1.4's REALIZATION CONTRACT, AND NOTHING ELSE IS.
 *
 * Hand-written for Task 13 of the M1 schematic-authoring plan.
 *
 * **THE CLAIM AN IMPLEMENTER STARTS FROM** (spec §1.4): *"a geometrically valid ELK drawing is not
 * necessarily a valid KiCad schematic."* ELK knows nodes, ports and orthogonal edges. KiCad knows a
 * 1.27 mm electrical grid, pin ends as the only places a wire connects, junction objects that make a
 * crossing a connection, and symbol transforms that move pins. **Every one of those is a way a
 * correct ELK drawing becomes a wrong schematic.** And the electrical round trip cannot stand in for
 * the geometric checks, *"because a schematic can export a correct netlist while visually
 * suggesting wrong connections."*
 *
 * **Spec §5.3: this module IS the realization contract.** *"The grid snapping, junction emission and
 * route-invalidation questions all live in that adapter and nowhere else, which is a smaller and
 * better-bounded problem than 'port a geometry layer'."*
 *
 * **THE ORDER OF OPERATIONS IS LOAD-BEARING AND IS STATED ONCE, HERE:**
 *
 * 1. nodes to `Placement[]`, edge sections to `Wire[]`, boundary nodes to `Anchor[]`;
 * 2. **`canonicalTopology`** over that - spec §1.4 revision 4 says a canonical topology is
 *    established *"before serialization"*, and this is before anything else reads the geometry;
 * 3. **`snapToGrid`** over the canonical wires, which refuses an identity collapse (obligation 1);
 * 4. **`canonicalTopology` again, over the SNAPPED geometry.** Not a second copy of anything: it is
 *    one function asked about a different geometry, and it has to be asked, because snapping can
 *    bring two segments into a partial collinear overlap that did not exist before. The junctions
 *    must also match the geometry that will be drawn, not the geometry before snapping;
 * 5. **`junctionProblems`**, comparing what the sheet emitter WOULD emit (`junctionPoints`, the
 *    ported cosmetic rule) against what the topology REQUIRES (obligation 2);
 * 6. **`checkLayout`**, last, and **the geometry is never touched again** - obligation 5's
 *    criterion: *"no generated schematic is emitted whose geometry was altered after its last
 *    clearance check."*
 *
 * **OBLIGATION 3 IS WHY THERE IS NO SECOND TRANSFORM HERE.** Every pin end is recomputed as
 * `pinEnd(placement.at, placement.rot, libPin)` at the SAME `u.rot` `graph.ts` fixed the ELK port
 * at (ruling **R29**), and **an ELK port's returned coordinate is never used as a wire attachment
 * point.** `portCoordinateDisagreements` is that made measurable: it compares the two and a
 * difference is an `invalid-geometry` refusal, because a port ELK moved is a port a wire cannot be
 * attached to without the second transform the obligation forbids.
 */

import { ELK_RENDERER, clearanceViolation, invalidGeometry } from "../render/block-types.ts"
import { junctionPoints, fmtPoint } from "../render/connectivity.ts"
import { samePoint, type Point } from "../render/geometry.ts"
import { readElkGraph, type Adapted } from "./read-graph.ts"
import { canonicalTopology, junctionProblems, type CanonicalTopology } from "./junctions.ts"
import { snapToGrid } from "./snap.ts"
import { layoutItems, placedPins, checkLayout } from "../render/layout-check.ts"
import { obstaclesOf, type ProblemObstacles } from "../render/problem-obstacles.ts"
import type { ElkOutcome } from "./graph.ts"
import type { BlockLayout, BlockSubgraph, RealiseResult, Wire } from "../render/block-types.ts"


/**
 * Every terminal whose ELK-returned coordinate disagrees with the recomputed pin end - spec §1.4
 * obligation 3, and §1.5's third link made checkable.
 *
 * **An empty result is the assertion.** `graph.ts` fixes every port with
 * `elk.portConstraints = FIXED_POS` at exactly the library pin's transformed end, so ELK must
 * return it where it was put; a difference means either that the constraint was not honoured or that
 * `graph.ts` and this module transformed the same pin through two different rotations. Either is the
 * *"second copy to drift"* the obligation forbids, and `adaptElkLayout` refuses on it.
 */
export function portCoordinateDisagreements(g: BlockSubgraph, outcome: ElkOutcome): readonly string[] {
  if (!outcome.ok) return []
  return disagreementsIn(readElkGraph(g, outcome.graph))
}

/** The comparison itself, over an adaptation already in hand, so it is computed once per call. */
function disagreementsIn(built: Adapted): readonly string[] {
  const out: string[] = []
  for (const [id, elk] of built.elkPositions) {
    const terminal = built.terminals.get(id)
    if (terminal === undefined || terminal.kind !== "pin") continue
    if (samePoint(elk, terminal.at)) continue
    out.push(
      `${terminal.what}: elkjs returned its port at ${fmtPoint(elk)} and the pin end recomputed from ` +
        `the library geometry is ${fmtPoint(terminal.at)}`,
    )
  }
  return out
}

/** Every `checkLayout` problem that names an obstacle PAIR, with the pair. */
export function clearancePairs(problems: readonly string[]): readonly ProblemObstacles[] {
  return problems.flatMap((p) => {
    const pair = obstaclesOf(p)
    return pair === null ? [] : [pair]
  })
}

/** The point list a sheet emitter would put junctions at: the ported rule, unchanged. */
function emittedJunctions(g: BlockSubgraph, layout: BlockLayout): readonly Point[] {
  return junctionPoints(layoutItems(g, layout))
}

/**
 * How many duplicate and zero-length segments a block's canonicalisation removed.
 *
 * **Reported, never silent** - spec §1.4 revision 4. The spikes measured 30-187 duplicate segments
 * per whole-circuit drawing and 0-80 per block through `netlistsvg`; this is the same quantity on a
 * driver that is not `netlistsvg`'s, which is why it is returned rather than logged.
 */
export interface CanonicalisationCounts {
  readonly collapsed: number
  readonly zeroLength: number
  /** Same-net collinear containments collapsed onto their container - ruling **R31**. */
  readonly contained: number
  readonly wiresBefore: number
  readonly wiresAfter: number
}

/** `t`'s three removal counts against the wire list it was built from. One shape, three callers. */
function countsOf(before: readonly Wire[], t: CanonicalTopology): CanonicalisationCounts {
  return {
    collapsed: t.collapsed,
    zeroLength: t.zeroLength,
    contained: t.contained,
    wiresBefore: before.length,
    wiresAfter: before.length - t.collapsed - t.zeroLength - t.contained,
  }
}

export interface AdaptReport {
  readonly result: RealiseResult
  /** Absent when the topology was refused before it could be counted. */
  readonly counts: CanonicalisationCounts | null
  /** The clearance pairs `checkLayout` named on this geometry, empty when it was clean. */
  readonly pairs: readonly ProblemObstacles[]
  /** Every `checkLayout` problem, so a measurement can read the ones that name no pair. */
  readonly problems: readonly string[]
}

const connectionOf = (g: BlockSubgraph, what: string): string => `${g.block.id}: ${what}`

/**
 * `adaptElkLayout` plus the measurements Task 16 and the obstacle-matrix re-validation need.
 *
 * It exists because the numbers are not a by-product to be logged: the duplicate count is the first
 * measurement of **G106**'s defect on a driver that is not `netlistsvg`'s, and the clearance pairs
 * are the first evidence any `PAIR_COVERAGE` cell has from a second geometry source (**G125**:
 * *"95 of its 105 cells rest on reading the source rather than on a test that could have failed"*).
 * A caller that only wants the layout calls `adaptElkLayout`.
 */
export function adaptElkLayoutReported(g: BlockSubgraph, outcome: ElkOutcome): AdaptReport {
  if (!outcome.ok) return { result: { ok: false, mismatch: outcome.mismatch }, counts: null, pairs: [], problems: [] }

  const built = readElkGraph(g, outcome.graph)

  // Obligation 3, before anything is measured over the geometry: one transform, two readers.
  const disagreements = disagreementsIn(built)
  if (disagreements.length > 0) {
    return {
      result: invalidGeometry(
        ELK_RENDERER,
        connectionOf(g, disagreements.join("; ")),
        `block ${g.block.id}: elkjs returned ${disagreements.length} port coordinate(s) that ` +
          "disagree with the pin ends recomputed from the library geometry, so the drawing ELK laid " +
          "out and the drawing the emitter would produce are not the same geometry (spec 1.4 " +
          `obligation 3). ${disagreements.join("; ")}`,
      ),
      // **The counts ARE computable here and round 1 returned null, which omitted a whole block
      // from the G106 measurement** - `oc-sidechain`, the one block that takes this arm, and its
      // 15 collapsed duplicates. The geometry this refusal is about is a PORT position; the wire
      // topology is independent of it and canonicalising it measures the backend exactly as it
      // does on every other block. The argument that earned `zeroLength` its place - do not throw
      // away a measurement you have already made - applies unchanged.
      counts: countsOf(
        built.wires,
        canonicalTopology({ placements: built.placements, wires: built.wires, anchors: built.anchors }, placedPins(g, built.placements)),
      ),
      pairs: [],
      problems: [],
    }
  }

  const prePins = placedPins(g, built.placements)
  const pre = canonicalTopology({ placements: built.placements, wires: built.wires, anchors: built.anchors }, prePins)
  if (!pre.ok) {
    return {
      result: invalidGeometry(
        ELK_RENDERER,
        connectionOf(g, pre.ambiguous.join("; ")),
        `block ${g.block.id}: the ELK route holds ${pre.ambiguous.length} overlap(s) that are ` +
          "neither an exact duplicate nor a clean T, so the wire topology has more than one reading " +
          `and none of them is chosen (spec 1.4 revision 4, clause d). ${pre.ambiguous.join("; ")}`,
      ),
      // The counts are known even here - deduplication and the containment collapse both run
      // before the ambiguity check - and the brief's Step 5 requires them per block, so a refusal
      // reports what it measured.
      counts: countsOf(built.wires, pre),
      pairs: [],
      problems: [],
    }
  }
  const counts = countsOf(built.wires, pre)

  const snapped = snapToGrid({ placements: built.placements, wires: pre.wires, anchors: built.anchors })
  if (!snapped.ok) {
    return {
      result: invalidGeometry(
        ELK_RENDERER,
        connectionOf(g, snapped.collapsed.join("; ")),
        `block ${g.block.id}: snapping the ELK route onto KiCad's 1.27 mm grid collapsed geometry ` +
          "that was distinct before it, so the drawing would assert connections the route did not " +
          `(spec 1.4 obligation 1). It is refused and not repaired. ${snapped.collapsed.join("; ")}`,
      ),
      counts,
      pairs: [],
      problems: [],
    }
  }

  const pins = placedPins(g, snapped.placements)
  const post = canonicalTopology({ placements: snapped.placements, wires: snapped.wires, anchors: snapped.anchors }, pins)
  if (!post.ok) {
    return {
      result: invalidGeometry(
        ELK_RENDERER,
        connectionOf(g, post.ambiguous.join("; ")),
        `block ${g.block.id}: snapping onto the 1.27 mm grid CREATED ${post.ambiguous.length} ` +
          "ambiguous overlap(s) that the unsnapped route did not have. The pre-snap topology was " +
          "canonical, so this is snapping's own doing and it is refused rather than repaired (spec " +
          `1.4 obligations 1 and 5). ${post.ambiguous.join("; ")}`,
      ),
      counts,
      pairs: [],
      problems: [],
    }
  }
  if (post.collapsed > 0 || post.zeroLength > 0) {
    throw new Error(
      `block ${g.block.id}: canonicalising the SNAPPED geometry collapsed ${post.collapsed} ` +
        `duplicate(s) and dropped ${post.zeroLength} zero-length segment(s). snapToGrid's contract ` +
        "is that it refuses an identity collapse rather than producing one, so these two numbers " +
        "must be zero here: this is a defect in lib/schgen/elk/snap.ts, not a layout that cannot " +
        "be drawn.",
    )
  }
  // `post.contained` is NOT asserted zero: snapping can bring two same-net segments onto one line
  // where they were parallel before, and a containment appearing there has the same single reading
  // ruling R31 gives any other. It is reported in the counts rather than refused.

  const layout: BlockLayout = { placements: snapped.placements, wires: post.wires, anchors: snapped.anchors }

  // Obligation 2, over the canonical topology of the geometry that will actually be drawn. The
  // comparison is against `junctionPoints` - the ported rule the sheet emitter uses - so the two
  // are computed independently and a difference is a finding rather than a tautology.
  const junctionIssues = junctionProblems(post, pins, emittedJunctions(g, layout))
  if (junctionIssues.length > 0) {
    return {
      result: invalidGeometry(
        ELK_RENDERER,
        connectionOf(g, junctionIssues.join("; ")),
        `block ${g.block.id}: the junctions the sheet emitter would place disagree with the branch ` +
          `points of the canonical topology in ${junctionIssues.length} place(s). For template ` +
          "geometry junctionPoints is cosmetic; for ELK geometry it is not, because a branch point " +
          `with no junction is a connection KiCad does not make (spec 1.4 obligation 2). ${junctionIssues.join("; ")}`,
      ),
      counts,
      pairs: [],
      problems: [],
    }
  }

  // LAST, and the geometry is never touched after it: obligation 5's criterion.
  const problems = checkLayout(g, layout)
  const pairs = clearancePairs(problems)
  if (problems.length === 0) return { result: { ok: true, layout }, counts, pairs, problems }

  const reason =
    `block ${g.block.id}: the ELK route does not pass the clearance checks that grade template ` +
    `output (spec 1.4 obligation 4): ${problems.join("; ")}`
  const first = pairs[0]
  if (first === undefined) {
    // No problem names a pair, so there is no clearance mismatch to report and the defect is that
    // the geometry disagrees with the IR - a split net, an unplaced unit, a dangling end. It is
    // NOT reported as a clearance violation with an invented pair: `problem-obstacles.ts`'s whole
    // contract is that a pair nobody can check is worse than a refusal that says so.
    return {
      result: invalidGeometry(ELK_RENDERER, connectionOf(g, problems.join("; ")), reason),
      counts,
      pairs,
      problems,
    }
  }
  return { result: clearanceViolation(g.block.id, first.constraint, first.obstacles, reason), counts, pairs, problems }
}

/** Spec §5.3: *"an ELK backend implements the same `realise(g: BlockSubgraph): RealiseResult`."* */
export function adaptElkLayout(g: BlockSubgraph, outcome: ElkOutcome): RealiseResult {
  return adaptElkLayoutReported(g, outcome).result
}
