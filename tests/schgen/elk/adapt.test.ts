/**
 * SPEC §1.5's FOUR-LINK MAPPING, VERIFIED END TO END ON REAL `elkjs` OUTPUT.
 *
 * Hand-written for Task 13 of the M1 schematic-authoring plan. The `.elk.test.ts` suffix is not used
 * here deliberately — this file drives the pinned `elkjs` worker exactly as
 * `layout.elk.test.ts` does, and the suffix convention would be worth adopting for it, but the
 * brief names the file `adapt.test.ts` and a renamed file is a file a reviewer cannot find. The
 * dependency is real and the tests fail rather than skip if it stops working.
 *
 * **THE MAPPING** (spec §1.5): `IR terminal -> symbol-library pin -> transformed geometric pin ->
 * KiCad electrical connection`. *"A sheet can hold every expected part on correctly named nets and
 * still have a wire reaching the wrong terminal."* Obligation 3 is what makes the third link
 * checkable, and the first two tests are the check.
 */

import { expect, test } from "bun:test"
import { adaptElkLayout, adaptElkLayoutReported, portCoordinateDisagreements } from "../../../lib/schgen/elk/adapt.ts"
import { readElkGraph } from "../../../lib/schgen/elk/read-graph.ts"
import { elkInputOf } from "../../../lib/schgen/elk/graph.ts"
import { layoutBlocks } from "../../../tools/schgen/elk/layout.ts"
import { placedPins } from "../../../lib/schgen/render/layout-check.ts"
import { onGrid } from "../../../lib/schgen/render/geometry.ts"
import { checkLayout } from "../../../lib/schgen/render/layout-check.ts"
import { snapCoordinate } from "../../../lib/schgen/elk/snap.ts"
import { ORIGIN, unitBoxOf, unitNodeId } from "../../../lib/schgen/elk/graph.ts"
import { placeBox } from "../../../lib/schgen/render/geometry.ts"
import { branchJunctions, canonicalTopology, junctionProblems } from "../../../lib/schgen/elk/junctions.ts"
import { junctionPoints } from "../../../lib/schgen/render/connectivity.ts"
import { layoutItems } from "../../../lib/schgen/render/layout-check.ts"
import { dividerSubgraph, groundOfDegreeSix, regulatorBlock } from "./fixtures.ts"
import type { BlockSubgraph } from "../../../lib/schgen/render/block-types.ts"
import type { PlacedPin } from "../../../lib/schgen/render/unit-pins.ts"
import type { ElkOutcome } from "../../../lib/schgen/elk/graph.ts"
import type { NetName } from "../../../lib/schgen/ir/types.ts"
import type { Point } from "../../../lib/schgen/render/geometry.ts"
import type { ElkEdge, ElkExtendedEdge, ElkNode } from "elkjs/lib/elk-api.js"

/**
 * `e` as the extended edge this graph only ever builds - **narrowed, not asserted.**
 *
 * `elkjs` types a graph's `edges` as `ElkEdge`, a union whose other arm is the primitive
 * `source`/`target` form. `elkInputOf` emits only `ElkExtendedEdge` (it sets `sources`/`targets`),
 * so the narrowing always succeeds - and `isExtended` is a user-defined type predicate backed by a
 * runtime test that says so, where `e as ElkExtendedEdge` was a claim with nothing behind it. The
 * fields are read with `Reflect.get`, as `tools/schgen/elk/layout.ts`'s `messageOf` already does,
 * so nothing is asserted anywhere along the path. A primitive edge reaching here is a
 * change in the graph builder, and it stops the test by name rather than reading `undefined`
 * sections off an object that never had any.
 */
function isExtended(e: ElkEdge): e is ElkExtendedEdge {
  const sources: unknown = Reflect.get(e, "sources")
  const targets: unknown = Reflect.get(e, "targets")
  return Array.isArray(sources) && Array.isArray(targets)
}

function extended(e: ElkEdge): ElkExtendedEdge {
  if (!isExtended(e)) {
    throw new Error(
      `edge ${e.id} is a primitive ElkEdge, not an ElkExtendedEdge. elkInputOf builds every edge ` +
        "with `sources` and `targets` (lib/schgen/elk/graph.ts, edgesForNet), so this fixture and " +
        "the graph builder disagree.",
    )
  }
  return e
}

/** One block through the real worker. A raise is returned as the outcome it is, never swallowed. */
async function laidOut(g: BlockSubgraph): Promise<ElkOutcome> {
  const input = elkInputOf(g)
  const outcome = (await layoutBlocks([input])).get(input.blockId)
  if (outcome === undefined) throw new Error(`layoutBlocks returned no outcome for block ${input.blockId}`)
  return outcome
}

/** Every pin of `part` as the adapter places it, independent of whether the gates then pass. */
async function pinsOf(g: BlockSubgraph, part: string): Promise<readonly PlacedPin[]> {
  const outcome = await laidOut(g)
  if (!outcome.ok) throw new Error(`elkjs refused to lay out block ${g.block.id}`)
  const read = readElkGraph(g, outcome.graph)
  return placedPins(g, read.placements).filter((p) => p.part === part)
}

const at = (pins: readonly PlacedPin[], pin: string): Point => {
  const found = pins.find((p) => p.pin === pin)
  if (found === undefined) throw new Error(`no pin ${pin} among ${pins.map((p) => p.pin).join(", ")}`)
  return found.at
}

const netOf = (pins: readonly PlacedPin[], pin: string): NetName | null => {
  const found = pins.find((p) => p.pin === pin)
  if (found === undefined) throw new Error(`no pin ${pin} among ${pins.map((p) => p.pin).join(", ")}`)
  return found.net
}

/**
 * **THE BRIEF's FIRST TEST, AND BOTH HALVES OF IT MATTER.** The net at a pin must be the same at
 * both rotations - *"mirroring moves geometry, never pin assignment"* - and the POINT must differ,
 * because a test whose second half passed trivially would say nothing: if the transform did not move
 * the pin, the first half would hold for the wrong reason.
 *
 * **IT READS `readElkGraph` AND NOT `adaptElkLayout`, DELIBERATELY, AND THE REASON IS A MEASURED
 * ONE.** Spec §1.5's third link is *"transformed geometric pin"* - a property of how ELK's output
 * becomes placements and pin ends - and that is `read-graph.ts`'s job. `adaptElkLayout` then puts
 * the result through the four gates, and **with the options this backend ships, every block refuses
 * at the snap gate** (`docs/known-gaps.md`: ELK's unset spacing defaults are 10-12 in whatever unit
 * the geometry is in, which here is micrometres). Written against `adaptElkLayout` this test read
 * zero pins and failed - not because pin identity was wrong, but because it was asking a module two
 * gates downstream of the thing it is about.
 */
test("a rotated symbol keeps its pin identity: the transform moves geometry, never assignment", async () => {
  const plainG = regulatorBlock(null)
  const turnedG = regulatorBlock(180)
  expect(plainG.units.find((u) => u.part.label === "U_REG")?.rot).toBe(0)
  expect(turnedG.units.find((u) => u.part.label === "U_REG")?.rot).toBe(180)

  const plain = await pinsOf(plainG, "U_REG")
  const turned = await pinsOf(turnedG, "U_REG")

  // Five pins on four sides. A zero-pin loop would say nothing, so the count is pinned first.
  expect(plain.length).toBe(5)
  expect(turned.length).toBe(5)
  for (const pin of ["1", "2", "3", "4", "5"]) {
    expect(netOf(turned, pin), `pin ${pin}`).toBe(netOf(plain, pin))
  }
  // And the geometry moved: pin 1 (IN, angle 0) is left of pin 5 (OUT, angle 180) at rotation 0 and
  // right of it at 180, so the transform turned the body without renaming a terminal.
  expect(Math.sign(at(plain, "1").x - at(plain, "5").x)).not.toBe(Math.sign(at(turned, "1").x - at(turned, "5").x))
  // Pin 4 (NR, angle 270) is above the body at 0 and below it at 180, which is the other axis.
  expect(Math.sign(at(plain, "4").y - at(plain, "3").y)).not.toBe(Math.sign(at(turned, "4").y - at(turned, "3").y))
}, 120_000)

test("no wire attaches to an ELK port coordinate that disagrees with the recomputed pin end", async () => {
  for (const g of [regulatorBlock(null), regulatorBlock(180), dividerSubgraph()]) {
    const outcome = await laidOut(g)
    // Anti-vacuity: the function must have had ports to compare, or [] means "nothing was checked".
    const ports = (outcome.ok ? outcome.graph.children ?? [] : []).flatMap((c) => c.ports ?? [])
    expect(ports.length, `block ${g.block.id} must carry ports`).toBeGreaterThan(0)
    expect(portCoordinateDisagreements(g, outcome)).toEqual([])
  }
}, 120_000)

test("a refused outcome is forwarded as its own mismatch and never re-classified", () => {
  const g = dividerSubgraph()
  const refused: ElkOutcome = {
    ok: false,
    blockId: g.block.id,
    serialized: "{}",
    mismatch: { kind: "backend-raised", reason: "elkjs raised", backend: "elkjs@0.9.3", inputKey: "{}" },
  }
  const r = adaptElkLayout(g, refused)
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.mismatch.kind).toBe("backend-raised")
})

/**
 * **THE CANONICALISATION COUNT, REPORTED RATHER THAN LOGGED** - spec §1.4 revision 4, **G106**.
 *
 * The spikes measured 30-187 duplicate segments per whole-circuit drawing and 0-80 per block
 * through `netlistsvg`. This asserts only that the count EXISTS and is consistent with the wire
 * lists it describes - the value itself is a measurement of this driver and is recorded in
 * `docs/known-gaps.md`, not pinned here, because pinning it would make a `elkjs` version bump a test
 * failure rather than a moved baseline.
 */
test("the canonicalisation count is reported, and it agrees with the wire lists it describes", async () => {
  const g = dividerSubgraph()
  const report = adaptElkLayoutReported(g, await laidOut(g))
  expect(report.counts).not.toBeNull()
  if (report.counts === null) return
  expect(report.counts.wiresBefore).toBeGreaterThan(0)
  expect(report.counts.wiresAfter).toBe(report.counts.wiresBefore - report.counts.collapsed - report.counts.zeroLength)
  expect(report.counts.collapsed).toBeGreaterThanOrEqual(0)
  expect(report.counts.zeroLength).toBeGreaterThanOrEqual(0)
}, 120_000)

/**
 * THE REAL ELK OUTPUT WITH EVERY COORDINATE PRE-SNAPPED ONTO THE GRID.
 *
 * **IT EXISTS BECAUSE THE SNAP GATE HIDES THE THREE GATES BEHIND IT, AND THAT WAS MEASURED RATHER
 * THAN SUSPECTED.** With the options this backend ships, `[RAN]` every fixture block and all twelve
 * declared blocks of the four parity circuits refuse at or before the snap gate - so
 * `adaptElkLayout`'s junction comparison (obligation 2), its clearance call (obligation 4) and the
 * no-touching-after-it rule (obligation 5) were reached by **nothing in the suite**. Three gates
 * whose perturbation nothing would notice is exactly `CLAUDE.md`'s *"a skipped check must never look
 * like a passing one"*.
 *
 * This is not a hand-written graph standing in for ELK's: it is ELK's own output for the same
 * subgraph, with each coordinate put on the grid, so snapping inside the adapter is a no-op and the
 * gates behind it run on real routing. `tests/schgen/elk/snap.test.ts` is what holds the snap gate
 * itself.
 */
async function gridAlignedOutcome(g: BlockSubgraph): Promise<Extract<ElkOutcome, { ok: true }>> {
  const outcome = await laidOut(g)
  if (!outcome.ok) throw new Error(`elkjs refused to lay out block ${g.block.id}`)
  const pt = (p: { x: number; y: number }): { x: number; y: number } => ({ x: snapCoordinate(Math.round(p.x)), y: snapCoordinate(Math.round(p.y)) })
  /**
   * **A NODE's OWN CORNER IS THE WRONG THING TO ALIGN, AND IT WAS MEASURED WRONG BEFORE IT WAS
   * MEASURED RIGHT.** ELK returns a node's `x`/`y` as its placed BOX's minimum corner, and
   * `read-graph.ts` recovers the placement origin as `node.x - placeBox(ORIGIN, rot, box).minX`.
   * `Fix:R`'s box starts at **-1.016 mm**, which is not a grid multiple - so snapping the corner put
   * every placement origin at 1.016 mm and every pin end off the grid, and the first attempt at this
   * fixture produced a geometry that refused at clause (d) for a reason that was the fixture's own
   * doing. What has to land on the grid is the PLACEMENT, so the box offset is taken off before
   * snapping and put back after.
   */
  const alignNode = (c: ElkNode): ElkNode => {
    const u = g.units.find((unit) => unitNodeId(unit) === c.id)
    if (u === undefined) return { ...c, x: pt({ x: c.x ?? 0, y: c.y ?? 0 }).x, y: pt({ x: c.x ?? 0, y: c.y ?? 0 }).y }
    const base = placeBox(ORIGIN, u.rot, unitBoxOf(u))
    return {
      ...c,
      x: snapCoordinate(Math.round(c.x ?? 0) - base.minX) + base.minX,
      y: snapCoordinate(Math.round(c.y ?? 0) - base.minY) + base.minY,
    }
  }
  const graph: ElkNode = {
    ...outcome.graph,
    children: (outcome.graph.children ?? []).map(alignNode),
    edges: (outcome.graph.edges ?? []).map((e) => {
      const ee = extended(e)
      return {
        ...ee,
        sections: (ee.sections ?? []).map((sec) => ({
          ...sec,
          startPoint: pt(sec.startPoint),
          endPoint: pt(sec.endPoint),
          ...(sec.bendPoints === undefined ? {} : { bendPoints: sec.bendPoints.map(pt) }),
        })),
      }
    }),
  }
  return { ok: true, blockId: outcome.blockId, serialized: outcome.serialized, graph }
}

/**
 * **OBLIGATION 2, REACHED: the junctions the sheet emitter would place are compared against the
 * branch points the canonical topology requires, and the comparison is not a tautology.**
 *
 * `emitted` comes from `junctionPoints(layoutItems(...))` - the ported rule, whose own comment calls
 * junction dots *"cosmetic"* - and `required` comes from `branchJunctions` over the canonical
 * topology. Two independent computations, so a difference is a finding. This asserts the adapter
 * does the comparison at all: handed the same geometry with NO junctions emitted, it must refuse,
 * and handed it with the required ones it must get past that gate.
 */
test("the adapter compares emitted junctions against the topology's branch points", async () => {
  // `groundOfDegreeSix` and NOT the divider: a divider's nets are all two-terminal, so it has no
  // branch point at all and the comparison below would be two empty sets - measured, 0 and 0.
  const g = groundOfDegreeSix()
  const outcome = await gridAlignedOutcome(g)
  const read = readElkGraph(g, outcome.graph)
  const pins = placedPins(g, read.placements)
  const t = canonicalTopology({ placements: read.placements, wires: read.wires, anchors: read.anchors }, pins)
  expect(t.ok, "the pre-snapped geometry must canonicalise, or this test is about nothing").toBe(true)
  if (!t.ok) return
  const required = branchJunctions(t, pins)
  const emitted = junctionPoints(layoutItems(g, { placements: read.placements, wires: t.wires, anchors: read.anchors }))
  // The two rules must have something to say, or the comparison below compares two empty sets.
  expect(required.length + emitted.length, "this block must have at least one junction-worthy point").toBeGreaterThan(0)
  // Nothing emitted: every branch point is a problem. This is the arm perturbation (2) drives.
  expect(junctionProblems(t, pins, []).length).toBe(required.length)
  // The required set: no problem from the junction rule.
  expect(junctionProblems(t, pins, required)).toEqual([])
})

/**
 * **OBLIGATIONS 3, 4, 5 AND THE CANONICALISATION, ALL REACHED, WITH AN EXACT ASSERTION - AND THE
 * EXACTNESS IS THE WHOLE POINT.**
 *
 * Step 8's perturbations were run against a tolerant version of this test first - one that accepted
 * either a layout or a classified refusal - and **five of the six perturbations went undetected.** A
 * test that accepts both outcomes cannot see a change that moves the result from one to the other,
 * which is `CLAUDE.md`'s *"a skipped check must never look like a passing one"* wearing an
 * `if (!ok) return` for a costume. So the outcome for this block is pinned:
 *
 * - **`ok` is `true`.** Perturbation 3 (read the attachment from the ELK port coordinate instead of
 *   recomputing it) leaves every wire ending a fraction of a grid step away from its pin, so the
 *   ends dangle and this refuses. Perturbation 6 (pass ELK's segment list through without
 *   canonicalising) hands four zero-length segments to the snap gate, which refuses them.
 * - **`checkLayout` over the RETURNED layout is empty.** That is obligation 5's criterion made into
 *   an assertion - *"no generated schematic is emitted whose geometry was altered after its last
 *   clearance check"* - and perturbation 5's one-grid-step nudge after the check breaks it. A nudge
 *   of exactly one grid step leaves every point ON the grid, so an on-grid assertion alone does not
 *   see it; re-running the grader does.
 */
test("pre-snapped ELK geometry realises, and the returned layout passes the check that graded it", async () => {
  const g = dividerSubgraph()
  const report = adaptElkLayoutReported(g, await gridAlignedOutcome(g))
  expect(report.counts).not.toBeNull()
  expect(report.result.ok, report.result.ok ? "" : report.result.mismatch.reason).toBe(true)
  if (!report.result.ok) return
  expect(report.problems).toEqual([])
  // Obligation 5: the geometry returned IS the geometry that was graded.
  expect(checkLayout(g, report.result.layout)).toEqual([])
  const points: Point[] = [
    ...report.result.layout.placements.map((p) => p.at),
    ...report.result.layout.wires.flatMap((w) => [w.a, w.b]),
    ...report.result.layout.anchors.map((a) => a.at),
    ...placedPins(g, report.result.layout.placements).map((p) => p.at),
  ]
  expect(points.length).toBeGreaterThan(0)
  for (const p of points) expect(onGrid(p), `${p.x},${p.y}`).toBe(true)
}, 120_000)

/**
 * **OBLIGATIONS 2 AND 4, REACHED THROUGH THE PIPELINE: a block that gets as far as the clearance
 * checks is graded BY them and not by a gate in front of them.**
 *
 * `groundOfDegreeSix` pre-snapped reaches `checkLayout` and is refused by it, which makes it the
 * fixture that can tell the gates apart. Perturbation 2 (emit no junctions) makes it refuse at the
 * junction gate instead, so `problems` empties and the reason changes; perturbation 4 (skip
 * `checkLayout`) makes it return `ok` with nothing graded at all.
 */
test("a block reaching the clearance checks is graded by them, not by the gates in front of them", async () => {
  const g = groundOfDegreeSix()
  const report = adaptElkLayoutReported(g, await gridAlignedOutcome(g))
  expect(report.result.ok).toBe(false)
  if (report.result.ok) return
  // `checkLayout` ran and had something to say: perturbation 4 empties this.
  expect(report.problems.length).toBeGreaterThan(0)
  // And the refusal is the CLEARANCE one, so the junction gate in front of it passed: perturbation
  // 2 turns this into the junction message.
  expect(report.result.mismatch.reason).toContain("clearance checks that grade template output")
  expect(report.result.mismatch.kind === "clearance" || report.result.mismatch.kind === "invalid-geometry").toBe(true)
}, 120_000)

/**
 * **OBLIGATION 3's SUBSTITUTION, MADE OBSERVABLE - and it is NOT observable any other way, which is
 * a finding in its own right.**
 *
 * The obligation says the adapter *"recomputes every pin end from `pinEnd(placement.at,
 * placement.rot, libPin)` and never reads an ELK port's returned coordinate as a wire attachment
 * point."* `[RAN]` Step 8's perturbation 3 - delete the substitution and use ELK's own section
 * endpoints - **changed no outcome in any test**, because `elk.portConstraints = FIXED_POS` IS
 * honoured on this geometry: ELK returns each port exactly where it was put, so the two values agree
 * and reading either gives the same wire. A substitution that is invisible while the two agree is
 * invisible precisely when nothing is wrong, which is no comfort at all - the obligation exists for
 * the case where they DISAGREE, and `oc-sidechain` is a real block where they do
 * (`docs/known-gaps.md`: ELK projects a FIXED_POS port onto its declared `elk.port.side` when the
 * node's box is wider than its pin span).
 *
 * So this test manufactures the disagreement in the FIXTURE - one section's start displaced by a
 * whole grid step - and asserts the wire still attaches where the library geometry says. Under
 * perturbation 3 the wire starts at the displaced point instead.
 */
test("a displaced ELK section endpoint is ignored: the wire attaches at the recomputed pin end", async () => {
  const g = dividerSubgraph()
  const outcome = await gridAlignedOutcome(g)
  const edges = (outcome.graph.edges ?? []).map(extended)
  const first = edges[0]
  expect(first, "the fixture must have an edge to displace").toBeDefined()
  if (first === undefined) return
  const section = (first.sections ?? [])[0]
  expect(section, "the edge must have one section").toBeDefined()
  if (section === undefined) return

  const honest = readElkGraph(g, outcome.graph)
  const before = honest.wires.find((w) => w.net === first.id.split(":")[0])
  expect(before, `no wire was built for edge ${first.id}`).toBeDefined()
  if (before === undefined) return

  const displaced: ElkNode = {
    ...outcome.graph,
    edges: edges.map((e) =>
      e.id !== first.id
        ? e
        : { ...e, sections: (e.sections ?? []).map((sec, i) => (i === 0 ? { ...sec, startPoint: { x: sec.startPoint.x + 1270, y: sec.startPoint.y } } : sec)) },
    ),
  }
  const read = readElkGraph(g, displaced)
  const after = read.wires.find((w) => w.net === first.id.split(":")[0])
  expect(after).toBeDefined()
  if (after === undefined) return
  // The displaced coordinate must NOT have reached the wire: the attachment is recomputed.
  expect(after.a).toEqual(before.a)
  expect(after.a.x).not.toBe(section.startPoint.x + 1270)
}, 120_000)
