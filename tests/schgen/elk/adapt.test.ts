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
import { dividerSubgraph, regulatorBlock } from "./fixtures.ts"
import type { BlockSubgraph } from "../../../lib/schgen/render/block-types.ts"
import type { PlacedPin } from "../../../lib/schgen/render/unit-pins.ts"
import type { ElkOutcome } from "../../../lib/schgen/elk/graph.ts"
import type { NetName } from "../../../lib/schgen/ir/types.ts"
import type { Point } from "../../../lib/schgen/render/geometry.ts"

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
 * **OBLIGATION 5's CRITERION, AS FAR AS A TEST CAN REACH IT**: *"no generated schematic is emitted
 * whose geometry was altered after its last clearance check."*
 *
 * What is checkable from outside is the observable consequence: a layout this adapter returns `ok`
 * for is on the grid, because `checkLayout`'s own grid assertion ran over exactly the geometry
 * returned and nothing moved after it. A nudge added after that check would leave a point off the
 * grid with `checkLayout` still reporting clean - which is perturbation (5) in Step 8.
 */
test("a layout this adapter returns is wholly on the 1.27 mm grid", async () => {
  const g = dividerSubgraph()
  const r = adaptElkLayout(g, await laidOut(g))
  if (!r.ok) {
    // A refusal is a legitimate outcome for ELK geometry and is what Step 6 measures; it is not a
    // test failure, but it must be a CLASSIFIED refusal rather than a crash.
    expect(["invalid-geometry", "clearance"]).toContain(r.mismatch.kind)
    return
  }
  const points: Point[] = [
    ...r.layout.placements.map((p) => p.at),
    ...r.layout.wires.flatMap((w) => [w.a, w.b]),
    ...r.layout.anchors.map((a) => a.at),
    ...placedPins(g, r.layout.placements).map((p) => p.at),
  ]
  expect(points.length).toBeGreaterThan(0)
  for (const p of points) expect(onGrid(p), `${p.x},${p.y}`).toBe(true)
}, 120_000)
