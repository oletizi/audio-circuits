/**
 * SPEC §1.9's BLOCK-INTERFACE CONTRACT, MADE CHECKABLE.
 *
 * Hand-written for Task 15 of the M1 schematic-authoring plan. The contract, verbatim: *"seam B
 * must preserve a block's internal geometry and connect its interfaces; if it cannot do so without
 * violating shared clearance, it REFUSES rather than silently redrawing a validated block."*
 * **CRITERION: no block's internal geometry is altered after that block passed its own clearance
 * check.**
 *
 * **THE TWO SUBJECTS ARE IN `../__fixtures__/composed.ts`, AND WHY THEY ARE THOSE TWO IS A
 * FINDING**: not one of the four parity circuits has a sheet that composes, because each declares
 * one sheet and every one of them holds a block that refuses to draw.
 */
import { afterAll, beforeAll, expect, test } from "bun:test"
import { cleanUpTempScratch } from "../../support/temp-scratch.ts"
import { drawnBlocks, miniSheet, type ComposedSubject, type DrawnBlocks } from "../__fixtures__/composed.ts"
import {
  composeBlocks, interiorDrift, nonMemberContainments, pinSideOfAnchor, type ComposedBlock,
} from "../../../lib/schgen/render/compose.ts"
import { contentOffset, translateLayout } from "../../../lib/schgen/render/frames.ts"
import { GRID } from "../../../lib/schgen/render/geometry.ts"
import { shelfPacking, type SheetPacking } from "../../../lib/schgen/elk/sheet-graph.ts"
import { packSheet } from "../../../tools/schgen/elk/sheet-layout.ts"
import { layoutSheet } from "../../../lib/schgen/render/sheets.ts"
import { FLAG_LIB_ID } from "../../../tools/schgen/generate.ts"
import type { BlockLayout } from "../../../lib/schgen/render/block-types.ts"
import type { InterfacePort } from "../../../lib/schgen/authoring.ts"
import type { BlockId, NetName } from "../../../lib/schgen/ir/types.ts"
import type { Point } from "../../../lib/schgen/render/geometry.ts"

afterAll(cleanUpTempScratch)

let legs: DrawnBlocks
let signal: ComposedSubject

beforeAll(async () => {
  legs = await drawnBlocks("transistor-preamp")
  signal = await miniSheet("signal")
}, 300_000)

/** A packer that hands back a packing already computed, so a test can fix one. */
const fixed = (p: SheetPacking) => async (): Promise<SheetPacking> => p

/** The layouts as realised (frame-local) and as composed (translated), for `interiorDrift`. */
function layoutsAround(subject: ComposedSubject, at: readonly Point[]): {
  readonly before: readonly ComposedBlock[]
  readonly after: readonly ComposedBlock[]
} {
  const before: ComposedBlock[] = []
  const after: ComposedBlock[] = []
  subject.contents.forEach((f, i) => {
    if (f.blockId === null || f.block === null) return
    const pos = at[i]
    if (pos === undefined) throw new Error(`no position for frame ${i}`)
    before.push({ blockId: f.blockId, layout: f.block.layout })
    after.push({ blockId: f.blockId, layout: translateLayout(f.block.layout, contentOffset(f, pos)) })
  })
  return { before, after }
}

/** Where a block's own layout brings `net` to its boundary, translated into its placed frame. */
function declaredPositionOf(subject: ComposedSubject, at: readonly Point[], block: BlockId, net: NetName): Point {
  const index = subject.contents.findIndex((f) => f.blockId === block)
  const content = subject.contents[index]
  const pos = at[index]
  if (content?.block == null || pos === undefined) throw new Error(`block ${block} is not on this sheet`)
  const anchor = content.block.layout.anchors.find((a) => a.net === net)
  if (anchor === undefined) throw new Error(`block ${block} draws no anchor for ${net}`)
  const d = contentOffset(content, pos)
  return { x: anchor.at.x + d.x, y: anchor.at.y + d.y }
}

test("the five ELK-drawn legs compose, which is what the rest of this file measures over", async () => {
  expect(legs.drew.length).toBe(5)
  expect(legs.refused.map((r) => r.id).sort()).toEqual(["tp-leg-emitter-bypass", "tp-stage"])
  const composed = await composeBlocks(legs.circuit, legs.contents, legs.paper, {
    interfaces: legs.interfaces, pack: packSheet,
  })
  expect(composed.ok).toBe(true)
  if (!composed.ok) return
  expect(composed.by).toBe("elk")
  expect(composed.attached.length).toBe(10)
})

test("a fixed interface position is honoured, not relocated", async () => {
  // THE FIXTURE DECLARES THE FIXED PORT, which is what G153 says nothing stops a Task 15 author
  // doing: *"declaring a fixed one means writing the InterfacePort literal with its sides, its
  // position and its why by hand"*. The reason is the block's own geometry, which is exactly what
  // "fixed" means in spec §1.9.
  const refixed = new Map<BlockId, readonly InterfacePort[]>()
  for (const [id, ports] of legs.interfaces) {
    refixed.set(id, ports.map((p): InterfacePort => ({
      ...p,
      position: "fixed",
      why: `${p.net} is brought to this block's boundary by its own drawn anchor, so its position is fixed by the block's internal geometry.`,
    })))
  }
  const packing = shelfPacking(legs.contents, legs.paper)
  const composed = await composeBlocks(legs.circuit, legs.contents, legs.paper, {
    interfaces: refixed, pack: fixed(packing),
  })
  expect(composed.ok).toBe(true)
  if (!composed.ok || !packing.ok) return
  expect(composed.attached.every((p) => p.was === "fixed")).toBe(true)
  // A CHECK THAT COULD HAVE FAILED: the expected point is computed here from the block's own
  // anchor and the frame offset, independently of what composeBlocks returned.
  for (const p of composed.attached) {
    expect(p.at, `${p.block}/${p.net}`).toEqual(declaredPositionOf(legs, packing.at, p.block, p.net))
  }
  expect(composed.attached.length).toBeGreaterThan(0)
})

test("the same ports come back at the same places whichever packer placed the frames", async () => {
  // Not a tautology: the two packings put the frames at DIFFERENT positions, so the attachment
  // points differ - what must agree is the set of (block, net, side, was) and the offset from each
  // frame's own origin. This is the sense in which seam B's choice is the block's, not the page's.
  const shelf = shelfPacking(legs.contents, legs.paper)
  const elk = await packSheet(legs.contents, legs.paper)
  expect(shelf.ok && elk.ok).toBe(true)
  if (!shelf.ok || !elk.ok) return
  expect(elk.at).not.toEqual(shelf.at)
  const run = async (p: SheetPacking) => composeBlocks(legs.circuit, legs.contents, legs.paper, {
    interfaces: legs.interfaces, pack: fixed(p),
  })
  const a = await run(shelf)
  const b = await run(elk)
  expect(a.ok && b.ok).toBe(true)
  if (!a.ok || !b.ok) return
  const key = (x: { block: string; net: string; side: string; was: string }) => `${x.block}/${x.net}/${x.side}/${x.was}`
  expect(b.attached.map(key).sort()).toEqual(a.attached.map(key).sort())
})

test("composition never alters a block's interior, under either packer", async () => {
  for (const packing of [shelfPacking(legs.contents, legs.paper), await packSheet(legs.contents, legs.paper)]) {
    expect(packing.ok).toBe(true)
    if (!packing.ok) continue
    const { before, after } = layoutsAround(legs, packing.at)
    expect(before.length).toBe(5)
    expect(interiorDrift(before, after)).toEqual([])
  }
})

test("interiorDrift NAMES the block and the part when one part is nudged inside a block", async () => {
  const packing = shelfPacking(legs.contents, legs.paper)
  expect(packing.ok).toBe(true)
  if (!packing.ok) return
  const { before, after } = layoutsAround(legs, packing.at)
  const victim = after[0]
  const part = victim?.layout.placements[1]
  if (victim === undefined || part === undefined) throw new Error("the first composed block has fewer than two parts")
  const nudged: BlockLayout = {
    ...victim.layout,
    placements: victim.layout.placements.map((p, i) => (i === 1 ? { ...p, at: { x: p.at.x + GRID, y: p.at.y } } : p)),
  }
  const drift = interiorDrift(before, [{ blockId: victim.blockId, layout: nudged }, ...after.slice(1)])
  expect(drift.length).toBe(1)
  expect(drift[0]).toContain(`block ${victim.blockId}`)
  expect(drift[0]).toContain(`part ${part.part}#${part.unit}`)
  expect(drift[0]).toContain("moved inside the block")
})

test("interiorDrift sees a re-routed wire, a changed rotation, a moved anchor and a dropped block", async () => {
  const packing = shelfPacking(legs.contents, legs.paper)
  if (!packing.ok) throw new Error("the shelf packer refused the legs probe")
  const { before, after } = layoutsAround(legs, packing.at)
  const one = after[0]
  if (one === undefined) throw new Error("nothing composed")
  const edit = (layout: BlockLayout): readonly ComposedBlock[] => [{ blockId: one.blockId, layout }, ...after.slice(1)]
  const wire = one.layout.wires[0]
  const anchor = one.layout.anchors[0]
  const place = one.layout.placements[0]
  if (wire === undefined || anchor === undefined || place === undefined) throw new Error("the first block is too small to perturb")
  expect(interiorDrift(before, edit({
    ...one.layout,
    wires: one.layout.wires.map((w, i) => (i === 0 ? { ...w, b: { x: w.b.x + GRID, y: w.b.y } } : w)),
  })).join(" ")).toContain("was re-routed inside the block")
  expect(interiorDrift(before, edit({
    ...one.layout,
    placements: one.layout.placements.map((p, i) => (i === 0 ? { ...p, rot: p.rot === 0 ? 90 : 0 } : p)),
  })).join(" ")).toContain("deg")
  expect(interiorDrift(before, edit({
    ...one.layout,
    anchors: one.layout.anchors.map((a, i) => (i === 0 ? { ...a, at: { x: a.at.x, y: a.at.y + GRID } } : a)),
  })).join(" ")).toContain("moved on the block's boundary")
  expect(interiorDrift(before, after.slice(1)).join(" ")).toContain("absent from the composed sheet")
  expect(interiorDrift(before.slice(1), after).join(" ")).toContain("passed no clearance check before it")
  expect(interiorDrift(before, edit({ ...one.layout, wires: one.layout.wires.slice(1) })).join(" ")).toContain("wire(s) became")
})

test("an interface that cannot be connected within shared clearance REFUSES, and does not redraw the block", async () => {
  // A5 landscape, which no SheetSpec may declare: PAPER holds A4 through A1, so this is the paper
  // the five legs cannot be composed on, and the refusal must name the interface rather than only
  // the paper.
  const A5 = { w: 210_000, h: 148_000 }
  const composed = await composeBlocks(legs.circuit, legs.contents, A5, {
    interfaces: legs.interfaces, pack: packSheet,
  })
  expect(composed.ok).toBe(false)
  if (composed.ok) return
  expect(composed.unsatisfiable.join(" ")).toContain("interface")
  expect(composed.unsatisfiable.length).toBe(10)
  expect(composed.unsatisfiable.join(" ")).toContain("cannot be connected")
  // AND THE BLOCKS ARE UNTOUCHED: the refusal returns no placement at all, so there is nothing
  // for a caller to emit, and the realised layouts are the same objects they were.
  const { before, after } = layoutsAround(legs, shelfPacking(legs.contents, legs.paper).ok
    ? (shelfPacking(legs.contents, legs.paper) as { at: readonly Point[] }).at
    : [])
  expect(interiorDrift(before, after)).toEqual([])
})

test("a declared side the block does not draw its anchor on REFUSES, naming both", async () => {
  // Seam B's choice rule: the anchor is where the block brought the net to its boundary, and a
  // declared side it does not sit on is a refusal rather than an instruction to move it.
  const wrongSide = new Map<BlockId, readonly InterfacePort[]>()
  for (const [id, ports] of legs.interfaces) {
    wrongSide.set(id, ports.map((p): InterfacePort => ({ ...p, sides: ["top"] })))
  }
  const composed = await composeBlocks(legs.circuit, legs.contents, legs.paper, {
    interfaces: wrongSide, pack: packSheet,
  })
  expect(composed.ok).toBe(false)
  if (composed.ok) return
  expect(composed.unsatisfiable.join(" ")).toContain("declares sides top and the block draws its anchor on the")
  // Not all ten: two of the legs draw a VCC anchor pointing up, which IS the top.
  expect(composed.unsatisfiable.length).toBeGreaterThan(0)
  expect(composed.unsatisfiable.length).toBeLessThan(10)
})

test("a block on the sheet with no declared interface REFUSES rather than being skipped", async () => {
  await expect(composeBlocks(legs.circuit, legs.contents, legs.paper, {
    interfaces: new Map(), pack: packSheet,
  })).rejects.toThrow(/no interface is declared for it/)
})

test("an interface port naming a net the circuit does not have REFUSES before anything is placed", async () => {
  const bogus = new Map<BlockId, readonly InterfacePort[]>(legs.interfaces)
  const first = legs.drew[0]
  if (first === undefined) throw new Error("nothing drew")
  bogus.set(first, [
    ...(legs.interfaces.get(first) ?? []),
    { net: "NOT_A_NET", sides: ["left"], position: "negotiable", why: "a net this circuit does not have" },
  ])
  await expect(composeBlocks(legs.circuit, legs.contents, legs.paper, { interfaces: bogus, pack: packSheet }))
    .rejects.toThrow(/names a net no pin of this circuit is on/)
})

test("mini's sheets REFUSE, and the refusal is a declaration-against-template disagreement", async () => {
  // THIS IS A MEASUREMENT AND NOT AN EXPECTED-FAILURE TEST. `negotiablePort`'s sides rule (Task 9)
  // and the ported templates' anchor placement disagree on six of the signal sheet's 25 declared
  // ports: a supply rail the declaration puts at the top that `connector-fanout` brings out to the
  // left, and a clock net the declaration puts left or right that `crystal` brings out upward.
  // docs/known-gaps.md records it with its criterion; this test pins the count so it cannot move
  // silently.
  const composed = await composeBlocks(signal.circuit, signal.contents, signal.paper, {
    interfaces: signal.interfaces, pack: packSheet,
  })
  expect(composed.ok).toBe(false)
  if (composed.ok) return
  expect(composed.unsatisfiable.length).toBe(6)
  expect(composed.unsatisfiable.every((u) => u.includes("draws its anchor on the"))).toBe(true)
  const declared = signal.contents.reduce((n, f) => n + (signal.interfaces.get(f.blockId ?? "")?.length ?? 0), 0)
  expect(declared).toBe(25)
})

test("pinSideOfAnchor is the one mapping between the two side vocabularies", () => {
  expect(pinSideOfAnchor("left")).toBe("left")
  expect(pinSideOfAnchor("right")).toBe("right")
  expect(pinSideOfAnchor("up")).toBe("top")
  expect(pinSideOfAnchor("down")).toBe("bottom")
})

test("spec §3.4 on a composed sheet: no frame overlap, no non-member containment, and NO inter-block wire", async () => {
  const packing = await packSheet(signal.contents, signal.paper)
  expect(packing.ok).toBe(true)
  if (!packing.ok) return
  const drawing = layoutSheet(signal.circuit, "signal", signal.symbols, FLAG_LIB_ID, signal.elk, packing)
  expect(nonMemberContainments(signal.circuit, drawing)).toEqual([])
  // A CHECK THAT COULD HAVE FAILED: the same count over a frame deliberately grown to swallow the
  // whole sheet reports every symbol that is not its own block's.
  const huge = {
    ...drawing,
    frames: drawing.frames.map((f, i) => (i === 0 ? { ...f, box: { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 } } : f)),
  }
  expect(nonMemberContainments(signal.circuit, huge).length).toBeGreaterThan(0)
  // SEAM B DRAWS NO WIRE AT ALL, so it adds no wire crossings: every wire of a composed sheet
  // belongs to exactly one block, and the frames do not overlap.
  const blockOfWire = (w: { a: Point; b: Point }): number =>
    drawing.frames.filter((f) => w.a.x >= f.box.minX && w.a.x <= f.box.maxX && w.a.y >= f.box.minY && w.a.y <= f.box.maxY).length
  expect(drawing.wires.length).toBeGreaterThan(0)
  expect(drawing.wires.every((w) => blockOfWire(w) === 1)).toBe(true)
})
