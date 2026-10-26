/**
 * THE SHEET GRAPH, THE TWO PACKERS, AND THE MECHANICAL RULE THAT SELECTS ONE.
 *
 * Hand-written for Task 15 of the M1 schematic-authoring plan.
 *
 * **IT DRIVES THE REAL `elkjs`**, like `tests/schgen/elk/layout.elk.test.ts` and
 * `options.elk.test.ts`: a packing nothing laid out would not be a packing. It keeps the Task 15
 * brief's file name rather than the `.elk.test.ts` suffix, and nothing in this repository selects
 * tests by that suffix (checked: no Makefile target, script or test filters on it).
 *
 * **EVERY OPTION KEY THE SHEET GRAPH EMITS IS CHECKED AGAINST `knownLayoutOptions()`, FOR
 * `docs/known-gaps.md` **G187**'s REASON**: `elkjs` *"silently ignores an option it does not
 * recognise - key or value - with no raise and no warning"*, so a typo in a sheet option would move
 * every page and nothing would say so. `options.elk.test.ts` does this for the BLOCK graph's
 * fifteen keys and could not see these eight: the two graphs are built by different modules.
 */
import { afterAll, beforeAll, expect, test } from "bun:test"
import ELK from "elkjs/lib/elk-api.js"
import { cleanUpTempScratch } from "../../support/temp-scratch.ts"
import { miniSheet, drawnBlocks, type ComposedSubject, type DrawnBlocks } from "../__fixtures__/composed.ts"
import {
  frameBoxOverlaps, frameIndexOf, frameNodeId, framePlacements, interFrameEdgeCount,
  interFrameNets, packingMeasures, readSheetPacking, sheetGraphOf, sheetOptions, shelfPacking,
  usableArea,
} from "../../../lib/schgen/elk/sheet-graph.ts"
import { frameSize } from "../../../lib/schgen/render/frames.ts"
import { GRID } from "../../../lib/schgen/render/geometry.ts"
import { MARGIN, TITLE_BLOCK, packFrames } from "../../../lib/schgen/render/pack.ts"
import { packFramesWithElk, sheetPackerFor } from "../../../tools/schgen/elk/sheet-layout.ts"
import type { ElkLayoutOptionDescription, ElkNode } from "elkjs/lib/elk-api.js"

afterAll(cleanUpTempScratch)

/** `options.elk.test.ts`'s one translation: elkjs accepts `elk.<rest>` and reports the full id. */
const FULL_ID = (key: string): string => key.replace(/^elk\./, "org.eclipse.elk.")

let power: ComposedSubject
let signal: ComposedSubject
// `DrawnBlocks` rather than `ComposedSubject`: the fixture guard below asserts WHICH blocks
// refused by name, which is the half of "6 of 7 draw" that a dropped frame could otherwise hide.
let legs: DrawnBlocks
let known: readonly ElkLayoutOptionDescription[] = []

beforeAll(async () => {
  power = await miniSheet("power")
  signal = await miniSheet("signal")
  legs = await drawnBlocks("transistor-preamp")
  const url = import.meta.resolve("elkjs/lib/elk-worker.min.js")
  const elk = new ELK({ workerUrl: url, workerFactory: (u?: string) => new Worker(u ?? url) })
  try {
    known = await elk.knownLayoutOptions()
  } finally {
    elk.terminateWorker()
  }
}, 300_000)

test("the fixtures are what the measurements below assume, so an empty result is not a pass", () => {
  expect(power.contents.length).toBe(4)
  expect(signal.contents.length).toBe(7)
  // docs/known-gaps.md G296: 6 of transistor-preamp's 7 blocks draw since 2026-10-26 - G200
  // measured 5 of 7 and G291 took it to 7 of 7. The refusal is asserted BY NAME rather than
  // inferred from the count, because a probe that silently dropped a frame would also report 6.
  expect(legs.contents.length).toBe(6)
  expect(legs.refused.map((r) => r.id)).toEqual(["tp-leg-upper"])
  expect(known.length).toBeGreaterThan(100)
})

test("one node per frame, at the frame's own size, with no size invented", () => {
  const graph = sheetGraphOf(signal.contents, signal.paper)
  const children = graph.children ?? []
  expect(children.length).toBe(signal.contents.length)
  children.forEach((node, i) => {
    const size = frameSize(signal.contents[i] ?? power.contents[0]!)
    expect(node.id).toBe(frameNodeId(i))
    expect(node.width).toBe(size.w)
    expect(node.height).toBe(size.h)
  })
})

test("a shared labelled non-rail net is an inter-frame edge and a shared RAIL is not", () => {
  // The signal sheet's seven frames share four flash nets, two clock nets, AMP_OUT and SIG_IN,
  // and they all share GND and 3V3. Only the first eight are edges.
  const nets = [...interFrameNets(signal.contents)].map(([net]) => net)
  expect(nets).toEqual(["AMP_OUT", "FL_CLK", "FL_CS", "FL_DI", "FL_DO", "SIG_IN", "XI", "XO"])
  expect(nets).not.toContain("GND")
  expect(nets).not.toContain("3V3")
  // A CHECK THAT COULD HAVE FAILED THE OTHER WAY: GND really is on more than one of these frames,
  // so its absence above is the rail rule and not an accident of the fixture.
  const onGnd = signal.contents.filter((f) => f.block?.g.rails.has("GND") === true)
  expect(onGnd.length).toBeGreaterThan(1)
})

test("the power sheet has no inter-frame edge at all, which is why the shelf packer is selected", () => {
  const graph = sheetGraphOf(power.contents, power.paper)
  expect(interFrameEdgeCount(graph)).toBe(0)
  expect(sheetPackerFor(power.contents, power.paper).by).toBe("shelf")
  expect(sheetPackerFor(signal.contents, signal.paper).by).toBe("elk")
  expect(sheetPackerFor(signal.contents, signal.paper).interFrameEdges).toBe(8)
})

test("every sheet option key is one elkjs actually has, on an element kind it applies to", () => {
  const byId = new Map(known.flatMap((o) => (o.id === undefined ? [] : [[o.id, o] as const])))
  const keys = Object.keys(sheetOptions(signal.paper)).sort()
  expect(keys).toEqual([
    "elk.algorithm",
    "elk.aspectRatio",
    "elk.direction",
    "elk.edgeRouting",
    "elk.layered.spacing.nodeNodeBetweenLayers",
    "elk.layered.wrapping.strategy",
    "elk.padding",
    "elk.spacing.nodeNode",
  ])
  const unknown = keys.filter((k) => !byId.has(FULL_ID(k)))
  expect(
    unknown,
    "elkjs ignores an option id it does not recognise, with no raise and no warning, so a typo " +
      "here moves every page and nothing says so - docs/known-gaps.md G187",
  ).toEqual([])
  const notOnParents = keys.filter((k) => !(byId.get(FULL_ID(k))?.targets ?? []).includes("PARENTS"))
  expect(notOnParents, "these are set on the root graph and elkjs does not apply them there").toEqual([])
  // The one numeric option carries a number, which is the half of G187's value check that is
  // available: `knownLayoutOptions` exposes no enum choices.
  expect(byId.get("org.eclipse.elk.aspectRatio")?.type).toBe("DOUBLE")
  expect(Number.isFinite(Number(sheetOptions(signal.paper)["elk.aspectRatio"]))).toBe(true)
})

test("the aspect ratio is the paper's usable area and not a number anybody chose", () => {
  const usable = usableArea(signal.paper)
  expect(usable.w).toBe(signal.paper.w - 2 * MARGIN)
  expect(usable.h).toBe(signal.paper.h - 2 * MARGIN - TITLE_BLOCK)
  expect(sheetOptions(signal.paper)["elk.aspectRatio"]).toBe(String(usable.w / usable.h))
})

test("shelfPacking is packFrames, reported in the other shape", () => {
  const direct = packFrames(signal.contents.map(frameSize), signal.paper)
  const wrapped = shelfPacking(signal.contents, signal.paper)
  expect(wrapped.ok).toBe(true)
  expect(direct.ok).toBe(true)
  if (wrapped.ok && direct.ok) {
    expect(wrapped.at).toEqual(direct.at)
    expect(wrapped.by).toBe("shelf")
  }
})

test("an empty content list REFUSES rather than packing an empty page", () => {
  expect(() => sheetGraphOf([], signal.paper)).toThrow(/nothing to pack/)
})

test("ELK packs the signal sheet on the grid, inside the margins, with no frame overlapping", async () => {
  const packed = await packFramesWithElk(signal.contents, signal.paper)
  expect(packed.ok).toBe(true)
  if (!packed.ok) return
  expect(packed.by).toBe("elk")
  expect(packed.at.length).toBe(signal.contents.length)
  for (const p of packed.at) {
    expect(p.x % GRID).toBe(0)
    expect(p.y % GRID).toBe(0)
    expect(p.x).toBeGreaterThanOrEqual(MARGIN)
    expect(p.y).toBeGreaterThanOrEqual(MARGIN)
  }
  expect(frameBoxOverlaps(framePlacements(signal.contents, packed.at), signal.contents)).toEqual([])
})

test("frameBoxOverlaps sees an overlap and does NOT see two frames that merely touch", () => {
  const [a, b] = signal.contents
  if (a === undefined || b === undefined) throw new Error("the signal sheet has fewer than two frames")
  const size = frameSize(a)
  const touching = [{ at: { x: 0, y: 0 }, size }, { at: { x: size.w, y: 0 }, size }]
  expect(frameBoxOverlaps(touching, [a, b])).toEqual([])
  const overlapping = [{ at: { x: 0, y: 0 }, size }, { at: { x: size.w - GRID, y: 0 }, size }]
  expect(frameBoxOverlaps(overlapping, [a, b]).length).toBe(1)
  expect(frameBoxOverlaps(overlapping, [a, b])[0]).toContain(a.title)
})

test("reading back a laid-out graph REFUSES every way it can be wrong", () => {
  const base = sheetGraphOf(power.contents, power.paper)
  const placed = (overrides: readonly Partial<ElkNode>[]): ElkNode => ({
    ...base,
    children: (base.children ?? []).map((n, i) => ({ ...n, x: MARGIN, y: MARGIN + i * 50_000, ...overrides[i] })),
  })
  // A child this module did not name.
  expect(() => readSheetPacking({ ...placed([]), children: [{ id: "not-a-frame", x: 0, y: 0 }] }, power.contents, power.paper))
    .toThrow(/not a frame node/)
  // A frame with no position.
  expect(() => readSheetPacking(placed([{ x: undefined }]), power.contents, power.paper))
    .toThrow(/returned no position/)
  // Fewer positions than frames.
  expect(() => readSheetPacking({ ...base, children: (base.children ?? []).slice(0, 1).map((n) => ({ ...n, x: MARGIN, y: MARGIN })) }, power.contents, power.paper))
    .toThrow(/places 1 of 4 frames/)
  // Two nodes for one frame.
  const first = (base.children ?? [])[0]
  if (first === undefined) throw new Error("the power sheet graph has no children")
  expect(() => readSheetPacking({ ...base, children: [{ ...first, x: MARGIN, y: MARGIN }, { ...first, x: MARGIN, y: MARGIN }] }, power.contents, power.paper))
    .toThrow(/places frame 0 twice/)
  // Overlapping positions, which the snap is argued not to be able to create: the refusal is what
  // makes that an asserted invariant rather than an assumption.
  expect(() => readSheetPacking(placed([{}, { x: MARGIN, y: MARGIN }]), power.contents, power.paper))
    .toThrow(/overlap/)
  // Off the paper: a refusal with the size it would have needed, exactly as packFrames reports one.
  const far = readSheetPacking(placed([{ x: MARGIN }, { x: 10_000_000 }]), power.contents, power.paper)
  expect(far.ok).toBe(false)
  if (!far.ok) expect(far.needed.w).toBeGreaterThan(power.paper.w)
})

test("a sub-grid position from ELK is snapped UP and the result stays on the grid", () => {
  // Two frames, because four of the power sheet's frames do not stack inside the usable height:
  // at 38.10 mm each they need 152.40 mm plus three gaps against 159.20 mm of usable height and
  // the first frame starting at the margin. The snap is what is under test, not the capacity.
  const two = power.contents.slice(0, 2)
  const base = sheetGraphOf(two, power.paper)
  const graph: ElkNode = {
    ...base,
    children: (base.children ?? []).map((n, i) => ({ ...n, x: MARGIN + 7, y: MARGIN + i * 50_000 + 11 })),
  }
  const packed = readSheetPacking(graph, two, power.paper)
  expect(packed.ok).toBe(true)
  if (!packed.ok) return
  for (const p of packed.at) {
    expect(p.x % GRID).toBe(0)
    expect(p.y % GRID).toBe(0)
  }
  const first = packed.at[0]
  expect(first?.x).toBe(MARGIN + GRID)
})

test("frameNodeId and frameIndexOf are inverse, and a foreign id is null rather than 0", () => {
  for (const i of [0, 1, 12, 103]) expect(frameIndexOf(frameNodeId(i))).toBe(i)
  expect(frameIndexOf("port:GND")).toBeNull()
  expect(frameIndexOf("frame:")).toBeNull()
  expect(frameIndexOf("frame:1x")).toBeNull()
})

test("BOTH packings are measured and NEITHER is preferred here", async () => {
  // docs/known-gaps.md G165's criterion (b): which of "report it" and "pack it better" is right
  // is NOT an implementer's call, so this test asserts only the things that are facts about the
  // two packings and asserts nothing about which is better.
  const elkPack = await packFramesWithElk(signal.contents, signal.paper)
  const shelf = shelfPacking(signal.contents, signal.paper)
  expect(elkPack.ok && shelf.ok).toBe(true)
  if (!elkPack.ok || !shelf.ok) return
  const a = packingMeasures(signal.contents, shelf.at, signal.paper)
  const b = packingMeasures(signal.contents, elkPack.at, signal.paper)
  expect(a.frames).toBe(b.frames)
  // THE INK IS THE SAME AND THE SHAPE IS NOT. `occupancy` is frameArea over the usable area, and
  // frameArea is a property of the blocks, so no packing can change it; `extent`, `pageUse`,
  // `extentFill` and `interFrameSpan` are the quantities a packing moves.
  expect(b.occupancy).toBe(a.occupancy)
  expect(b.extent).not.toEqual(a.extent)
  expect(a.overlaps).toEqual([])
  expect(b.overlaps).toEqual([])
})

/**
 * **SIX FRAMES, FIVE SHARED NETS, EIGHT EDGES.** The series is five frames / two nets / four edges
 * until 2026-10-25, seven / five / nine at **G291**, and six / five / eight since `tp-leg-upper`
 * stopped drawing (**G296**).
 *
 * **THE ONE EDGE LOST IS `BASE`'s AND NOTHING ELSE MOVED, which is the content of this amendment
 * and is a stronger statement than the new total.** Re-indexing the frames by name rather than by
 * position, the net memberships are IDENTICAL to what they were except that `BASE` no longer
 * reaches `tp-leg-upper`: `COLLECTOR` is still feedback / collector / stage, and `BYPASS_CAP`,
 * `BYPASS_JUMPED` and `EMITTER` are still emitter-bypass / stage. So this table did not move
 * because the geometry changed; it moved because a frame left the sheet.
 *
 * **THE EDGE COUNT IS DERIVED FROM THE FRAME LISTS, NOT READ OFF THE GRAPH**: `edgesForNet` makes
 * a net's frames into a spanning tree, so `n` frames give `n - 1` edges, and `interFrameNets`
 * reports which frames each net is on. The frame indices are `drawnBlocks`' declaration order over
 * the blocks that DRAW - feedback 0, lower-a 1, lower-b 2, collector 3, emitter-bypass 4, stage 5:
 *
 * | net | frames | by name | edges |
 * | --- | --- | --- | --- |
 * | `BASE` | 0, 1, 2, 5 | feedback, lower-a, lower-b, stage | 3 |
 * | `BYPASS_CAP` | 4, 5 | emitter-bypass, stage | 1 |
 * | `BYPASS_JUMPED` | 4, 5 | emitter-bypass, stage | 1 |
 * | `COLLECTOR` | 0, 3, 5 | feedback, collector, stage | 2 |
 * | `EMITTER` | 4, 5 | emitter-bypass, stage | 1 |
 * | | | | **8** |
 */
test("the six ELK-drawn blocks have eight inter-frame edges over five nets, so ELK packs them", () => {
  const nets = [...interFrameNets(legs.contents)]
  expect(nets.map(([net]) => net)).toEqual(["BASE", "BYPASS_CAP", "BYPASS_JUMPED", "COLLECTOR", "EMITTER"])
  // The frame lists, so the edge count below is an arithmetic consequence rather than a second
  // reading of the same graph.
  expect(nets.map(([net, on]) => `${net} on ${on.join(",")}`)).toEqual([
    "BASE on 0,1,2,5",
    "BYPASS_CAP on 4,5",
    "BYPASS_JUMPED on 4,5",
    "COLLECTOR on 0,3,5",
    "EMITTER on 4,5",
  ])
  // THE SAME LISTS BY NAME, which is what makes "only BASE lost a member" checkable rather than a
  // claim about two sets of integers taken under different frame counts.
  const named = nets.map(([net, on]) => `${net} on ${on.map((i) => legs.contents[i]?.blockId ?? "?").join(",")}`)
  expect(named).toEqual([
    "BASE on tp-leg-feedback,tp-leg-lower-a,tp-leg-lower-b,tp-stage",
    "BYPASS_CAP on tp-leg-emitter-bypass,tp-stage",
    "BYPASS_JUMPED on tp-leg-emitter-bypass,tp-stage",
    "COLLECTOR on tp-leg-feedback,tp-leg-collector,tp-stage",
    "EMITTER on tp-leg-emitter-bypass,tp-stage",
  ])
  expect(nets.reduce((n, [, on]) => n + on.length - 1, 0)).toBe(8)
  expect(interFrameEdgeCount(sheetGraphOf(legs.contents, legs.paper))).toBe(8)
  expect(sheetPackerFor(legs.contents, legs.paper).by).toBe("elk")
})
